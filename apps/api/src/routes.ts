import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { db } from './db';
import type {
  UserRow,
  PrescriptionRow,
  PrescriptionWithNamesRow,
  LabResultRow,
  LabResultWithNamesRow,
  AppointmentWithClinicianRow,
  MessageWithNamesRow,
  MessageRow,
  PatientPanelRow,
  JobApplicationRow,
  ChatHistoryRow,
  DoctorRow,
  ClinicianRow,
  ConversationRow,
  AdminStatsRow,
  PasswordResetTokenRow,
} from './db';
import { runAgent, llmConfigured } from './agent';
import { sendMail, WEB_BASE_URL } from './mailer';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'zero-health-lab-secret';

const ROLES = ['patient', 'doctor', 'pharmacist', 'labtech', 'admin'];

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
const IMAGE_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase();
      cb(null, crypto.randomBytes(16).toString('hex') + (IMAGE_TYPES[ext] ? ext : '.png'));
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (IMAGE_TYPES[ext]) cb(null, true);
    else cb(new Error('only png, jpg, gif and webp images are allowed'));
  },
});

interface AuthUser {
  id: number;
  role: string;
  email: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function hashPassword(pw: string): string {
  return crypto.createHash('sha256').update(pw).digest('hex');
}

function generateCollectionCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(6);
  let code = '';
  for (let i = 0; i < 6; i++) code += alphabet[bytes[i] % alphabet.length];
  return code;
}

function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization || '';
  const token = header.replace(/^Bearer\s+/i, '');
  if (!token) {
    res.status(401).json({ error: 'missing token' });
    return;
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET) as AuthUser;
    next();
  } catch {
    res.status(401).json({ error: 'invalid token' });
  }
}

function canAccessAppointment(appt: AppointmentWithClinicianRow, user: AuthUser): boolean {
  if (user.role === 'admin') return true;
  if (user.role === 'patient') return appt.patient_id === user.id;
  if (user.role === 'doctor' || user.role === 'labtech') return appt.clinician_id === user.id;
  return false;
}

// --- Auth ------------------------------------------------------------------

interface RegisterBody {
  email?: string;
  password?: string;
  full_name?: string;
  role?: string;
}

router.post('/auth/register', (req, res) => {
  const { email, password, full_name, role } = (req.body || {}) as RegisterBody;
  if (!email || !password || !full_name) {
    res.status(400).json({ error: 'email, password, full_name required' });
    return;
  }
  try {
    const info = db
      .prepare<[string, string, string, string]>(
        'INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)'
      )
      .run(email, hashPassword(password), full_name, role || 'patient');
    res.json({ id: Number(info.lastInsertRowid), email, full_name, role: role || 'patient' });
  } catch {
    res.status(409).json({ error: 'email already registered' });
  }
});

router.post('/auth/login', (req, res) => {
  const { email, password } = (req.body || {}) as { email?: string; password?: string };
  const user = db.prepare<[string], UserRow>('SELECT * FROM users WHERE email = ?').get(email || '');
  if (!user || user.password_hash !== hashPassword(password || '')) {
    res.status(401).json({ error: 'invalid credentials' });
    return;
  }
  const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, {
    expiresIn: '8h',
  });
  res.json({ token, user: { id: user.id, full_name: user.full_name, role: user.role } });
});

// --- Profile ---------------------------------------------------------------

const PROFILE_COLUMNS =
  'id, email, full_name, role, phone, date_of_birth, gender, address, specialization, license_number, created_at';

router.get('/me', authenticate, (req, res) => {
  const u = db
    .prepare<[number], Omit<UserRow, 'password_hash'>>(
      `SELECT ${PROFILE_COLUMNS} FROM users WHERE id = ?`
    )
    .get(req.user!.id);
  if (!u) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  res.json(u);
});

interface ProfileUpdateBody {
  full_name?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  specialization?: string;
  license_number?: string;
}

router.patch('/me', authenticate, (req, res) => {
  const b = (req.body || {}) as ProfileUpdateBody;
  const fields: Record<string, string | null> = {};
  if (typeof b.full_name === 'string' && b.full_name.trim()) fields.full_name = b.full_name.trim();
  const editable: Array<keyof ProfileUpdateBody> = ['phone', 'date_of_birth', 'gender', 'address'];
  if (req.user!.role === 'doctor') editable.push('specialization', 'license_number');
  for (const key of editable) {
    const value = b[key];
    if (typeof value === 'string') fields[key] = value.trim() || null;
  }
  const keys = Object.keys(fields);
  if (keys.length === 0) {
    res.status(400).json({ error: 'no valid fields to update' });
    return;
  }
  const sets = keys.map((k) => `${k} = ?`).join(', ');
  db.prepare(`UPDATE users SET ${sets} WHERE id = ?`).run(...keys.map((k) => fields[k]), req.user!.id);
  const u = db
    .prepare<[number], Omit<UserRow, 'password_hash'>>(
      `SELECT ${PROFILE_COLUMNS} FROM users WHERE id = ?`
    )
    .get(req.user!.id);
  res.json(u);
});

// --- Own data --------------------------------------------------------------

router.get('/me/prescriptions', authenticate, (req, res) => {
  const rows = db
    .prepare<[number], PrescriptionWithNamesRow>(
      `SELECT p.*, u.full_name AS prescriber_name
         FROM prescriptions p LEFT JOIN users u ON u.id = p.prescriber_id
        WHERE p.patient_id = ? ORDER BY p.id`
    )
    .all(req.user!.id);
  res.json(rows);
});

router.get('/me/lab-results', authenticate, (req, res) => {
  const rows = db
    .prepare<[number], LabResultWithNamesRow>(
      `SELECT l.*, u.full_name AS recorded_by_name
         FROM lab_results l LEFT JOIN users u ON u.id = l.recorded_by
        WHERE l.patient_id = ? ORDER BY l.id`
    )
    .all(req.user!.id);
  res.json(rows);
});

router.get('/me/appointments', authenticate, (req, res) => {
  const rows = db
    .prepare<[number], AppointmentWithClinicianRow>(
      `SELECT a.*, u.full_name AS clinician_name
         FROM appointments a LEFT JOIN users u ON u.id = a.clinician_id
        WHERE a.patient_id = ? ORDER BY a.scheduled_for`
    )
    .all(req.user!.id);
  res.json(rows);
});

router.get('/me/messages', authenticate, (req, res) => {
  const rows = db
    .prepare<[number, number], MessageWithNamesRow>(
      `SELECT m.*, f.full_name AS from_name, t.full_name AS to_name
         FROM messages m
         JOIN users f ON f.id = m.from_user_id
         JOIN users t ON t.id = m.to_user_id
        WHERE m.from_user_id = ? OR m.to_user_id = ?
        ORDER BY m.created_at`
    )
    .all(req.user!.id, req.user!.id);
  res.json(rows);
});

// --- Clinicians / patients -------------------------------------------------

router.get('/doctors', authenticate, (_req, res) => {
  const rows = db
    .prepare<[], DoctorRow>("SELECT id, full_name, email FROM users WHERE role = 'doctor' ORDER BY id")
    .all();
  res.json(rows);
});

router.get('/clinicians', authenticate, (_req, res) => {
  const rows = db
    .prepare<[], ClinicianRow>(
      "SELECT id, full_name, email, role, specialization FROM users WHERE role IN ('doctor', 'labtech') ORDER BY role, id"
    )
    .all();
  res.json(rows);
});

router.get('/patients', authenticate, (_req, res) => {
  const rows = db
    .prepare<[], PatientPanelRow>(
      `SELECT u.id, u.full_name, u.email, u.phone,
              (SELECT COUNT(*) FROM prescriptions p WHERE p.patient_id = u.id AND p.status IN ('pending', 'collected')) AS active_rx
         FROM users u WHERE u.role = 'patient' ORDER BY u.id`
    )
    .all();
  res.json(rows);
});

// --- Prescriptions ---------------------------------------------------------

router.get('/prescriptions', authenticate, (req, res) => {
  const role = req.user!.role;
  if (role === 'patient') {
    const rows = db
      .prepare<[number], PrescriptionWithNamesRow>(
        `SELECT p.*, u.full_name AS prescriber_name
           FROM prescriptions p LEFT JOIN users u ON u.id = p.prescriber_id
          WHERE p.patient_id = ? ORDER BY p.id`
      )
      .all(req.user!.id);
    res.json(rows);
    return;
  }
  if (role === 'doctor') {
    const rows = db
      .prepare<[number], PrescriptionWithNamesRow>(
        `SELECT p.*, pt.full_name AS patient_name
           FROM prescriptions p LEFT JOIN users pt ON pt.id = p.patient_id
          WHERE p.prescriber_id = ? ORDER BY p.id`
      )
      .all(req.user!.id);
    res.json(rows);
    return;
  }
  if (role === 'pharmacist' || role === 'admin') {
    const rows = db
      .prepare<[], PrescriptionWithNamesRow>(
        `SELECT p.*, pt.full_name AS patient_name, d.full_name AS prescriber_name
           FROM prescriptions p
           LEFT JOIN users pt ON pt.id = p.patient_id
           LEFT JOIN users d ON d.id = p.prescriber_id
          ORDER BY p.id`
      )
      .all();
    res.json(rows);
    return;
  }
  res.status(403).json({ error: 'access denied' });
});

interface CreateRxBody {
  patient_id?: number;
  medication?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
}

router.post('/prescriptions', authenticate, (req, res) => {
  if (!['doctor', 'admin'].includes(req.user!.role)) {
    res.status(403).json({ error: 'only a prescriber may create an order' });
    return;
  }
  const b = (req.body || {}) as CreateRxBody;
  if (!b.patient_id || !b.medication || !b.dosage) {
    res.status(400).json({ error: 'patient_id, medication, dosage required' });
    return;
  }
  const code = generateCollectionCode();
  const info = db
    .prepare<[number, number, string, string, string | null, string | null, string | null, string]>(
      `INSERT INTO prescriptions
         (patient_id, prescriber_id, medication, dosage, frequency, duration, instructions, status, collection_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
    )
    .run(
      b.patient_id,
      req.user!.id,
      b.medication,
      b.dosage,
      b.frequency?.trim() || null,
      b.duration?.trim() || null,
      b.instructions?.trim() || null,
      code
    );
  const created = db
    .prepare<[number], PrescriptionRow>('SELECT * FROM prescriptions WHERE id = ?')
    .get(Number(info.lastInsertRowid));
  const rxPatient = db
    .prepare<[number], UserRow>('SELECT * FROM users WHERE id = ?')
    .get(b.patient_id);
  if (rxPatient) {
    void sendMail(
      rxPatient.email,
      'Your prescription is ready',
      `Hi ${rxPatient.full_name},

${b.medication} (${b.dosage}) has been sent to the pharmacy. Show your collection code in the portal when you pick it up.

Zero Health`
    );
  }
  res.json(created);
});

interface CollectBody {
  code?: string;
}

router.post('/prescriptions/:id/collect', authenticate, (req, res) => {
  if (!['pharmacist', 'admin'].includes(req.user!.role)) {
    res.status(403).json({ error: 'only pharmacy staff may collect' });
    return;
  }
  const rx = db
    .prepare<[string], PrescriptionRow>('SELECT * FROM prescriptions WHERE id = ?')
    .get(req.params.id);
  if (!rx) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  if (rx.status === 'collected') {
    res.status(409).json({ error: 'already collected' });
    return;
  }
  if (rx.status !== 'pending') {
    res.status(409).json({ error: 'this prescription cannot be collected' });
    return;
  }
  const { code } = (req.body || {}) as CollectBody;
  if (!code || String(code).trim().toUpperCase() !== (rx.collection_code || '')) {
    res.status(403).json({ error: 'invalid collection code' });
    return;
  }
  db.prepare(
    "UPDATE prescriptions SET status = 'collected', collected_at = datetime('now') WHERE id = ?"
  ).run(rx.id);
  const updated = db
    .prepare<[string], PrescriptionWithNamesRow>(
      `SELECT p.*, pt.full_name AS patient_name, d.full_name AS prescriber_name
         FROM prescriptions p
         LEFT JOIN users pt ON pt.id = p.patient_id
         LEFT JOIN users d ON d.id = p.prescriber_id
        WHERE p.id = ?`
    )
    .get(req.params.id);
  res.json(updated);
});

router.get('/prescriptions/:id', authenticate, (req, res) => {
  const rx = db.prepare<[string], PrescriptionRow>('SELECT * FROM prescriptions WHERE id = ?').get(req.params.id);
  if (!rx) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  res.json(rx);
});

interface PatchRxBody {
  medication?: string;
  dosage?: string;
  status?: string;
}

router.patch('/prescriptions/:id', authenticate, (req, res) => {
  const rx = db.prepare<[string], PrescriptionRow>('SELECT * FROM prescriptions WHERE id = ?').get(req.params.id);
  if (!rx) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  const { medication, dosage, status } = (req.body || {}) as PatchRxBody;
  db.prepare<[string | null, string | null, string | null, string]>(
    'UPDATE prescriptions SET medication = COALESCE(?, medication), dosage = COALESCE(?, dosage), status = COALESCE(?, status) WHERE id = ?'
  ).run(medication ?? null, dosage ?? null, status ?? null, req.params.id);
  const updated = db.prepare<[string], PrescriptionRow>('SELECT * FROM prescriptions WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// --- Lab results -----------------------------------------------------------

router.get('/lab-results', authenticate, (req, res) => {
  if (req.user!.role === 'patient') {
    const rows = db
      .prepare<[number], LabResultRow>('SELECT * FROM lab_results WHERE patient_id = ? ORDER BY id')
      .all(req.user!.id);
    res.json(rows);
    return;
  }
  const rows = db
    .prepare<[], LabResultWithNamesRow>(
      `SELECT l.*, p.full_name AS patient_name, s.full_name AS recorded_by_name
         FROM lab_results l
         LEFT JOIN users p ON p.id = l.patient_id
         LEFT JOIN users s ON s.id = l.recorded_by
        ORDER BY l.id DESC`
    )
    .all();
  res.json(rows);
});

router.post('/lab-results', authenticate, upload.single('image'), (req, res) => {
  if (!['doctor', 'labtech', 'admin'].includes(req.user!.role)) {
    res.status(403).json({ error: 'doctor or lab technician access required' });
    return;
  }
  const b = (req.body || {}) as { patient_id?: string; panel?: string; value?: string; interpretation?: string };
  if (!b.patient_id || !b.panel || !b.value) {
    res.status(400).json({ error: 'patient_id, panel, value required' });
    return;
  }
  const info = db
    .prepare<[number, string, string, string | null, string | null, number]>(
      'INSERT INTO lab_results (patient_id, panel, value, interpretation, image_path, recorded_by) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(
      Number(b.patient_id),
      b.panel,
      b.value,
      (b.interpretation || '').trim() || null,
      req.file ? req.file.filename : null,
      req.user!.id
    );
  const created = db.prepare<[number], LabResultRow>('SELECT * FROM lab_results WHERE id = ?').get(
    Number(info.lastInsertRowid)
  );
  const labPatient = db
    .prepare<[number], UserRow>('SELECT * FROM users WHERE id = ?')
    .get(Number(b.patient_id));
  if (labPatient) {
    void sendMail(
      labPatient.email,
      'New lab result available',
      `Hi ${labPatient.full_name},

A new lab result (${b.panel}) is available in your portal.

Zero Health`
    );
  }
  res.json(created);
});

router.get('/lab-results/:id', authenticate, (req, res) => {
  const row = db
    .prepare<[string], LabResultWithNamesRow>(
      `SELECT l.*, p.full_name AS patient_name, s.full_name AS recorded_by_name
         FROM lab_results l
         LEFT JOIN users p ON p.id = l.patient_id
         LEFT JOIN users s ON s.id = l.recorded_by
        WHERE l.id = ?`
    )
    .get(req.params.id);
  if (!row) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  res.json(row);
});

// --- Uploaded images -------------------------------------------------------

router.get('/files/:filename', (req, res) => {
  const name = path.basename(req.params.filename || '');
  if (!name || name !== req.params.filename || name.includes('..')) {
    res.status(400).json({ error: 'invalid filename' });
    return;
  }
  const ext = path.extname(name).toLowerCase();
  const ctype = IMAGE_TYPES[ext];
  if (!ctype) {
    res.status(400).json({ error: 'unsupported file type' });
    return;
  }
  const full = path.join(UPLOADS_DIR, name);
  if (!fs.existsSync(full)) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  res.setHeader('Content-Type', ctype);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.sendFile(full);
});

// --- Appointments ----------------------------------------------------------

router.get('/appointments', authenticate, (req, res) => {
  const role = req.user!.role;
  if (role === 'patient') {
    const rows = db
      .prepare<[number], AppointmentWithClinicianRow>(
        `SELECT a.*, u.full_name AS clinician_name
           FROM appointments a LEFT JOIN users u ON u.id = a.clinician_id
          WHERE a.patient_id = ? ORDER BY a.scheduled_for`
      )
      .all(req.user!.id);
    res.json(rows);
    return;
  }
  if (role === 'doctor' || role === 'labtech') {
    const rows = db
      .prepare<[number], AppointmentWithClinicianRow>(
        `SELECT a.*, u.full_name AS patient_name
           FROM appointments a LEFT JOIN users u ON u.id = a.patient_id
          WHERE a.clinician_id = ? ORDER BY a.scheduled_for`
      )
      .all(req.user!.id);
    res.json(rows);
    return;
  }
  if (role === 'admin') {
    const rows = db
      .prepare<[], AppointmentWithClinicianRow>(
        `SELECT a.*, p.full_name AS patient_name, c.full_name AS clinician_name
           FROM appointments a
           LEFT JOIN users p ON p.id = a.patient_id
           LEFT JOIN users c ON c.id = a.clinician_id
          ORDER BY a.scheduled_for`
      )
      .all();
    res.json(rows);
    return;
  }
  res.status(403).json({ error: 'access denied' });
});

function getAppointmentFull(id: string): AppointmentWithClinicianRow | undefined {
  return db
    .prepare<[string], AppointmentWithClinicianRow>(
      `SELECT a.*, p.full_name AS patient_name, c.full_name AS clinician_name
         FROM appointments a
         LEFT JOIN users p ON p.id = a.patient_id
         LEFT JOIN users c ON c.id = a.clinician_id
        WHERE a.id = ?`
    )
    .get(id);
}

router.get('/appointments/:id', authenticate, (req, res) => {
  const appt = getAppointmentFull(req.params.id);
  if (!appt) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  if (!canAccessAppointment(appt, req.user!)) {
    res.status(403).json({ error: 'access denied' });
    return;
  }
  res.json(appt);
});

interface BookBody {
  clinician_id?: number;
  scheduled_for?: string;
  kind?: string;
  modality?: string;
  visit_type?: string;
  symptoms?: string;
  current_medications?: string;
}

router.post('/appointments', authenticate, (req, res) => {
  if (req.user!.role !== 'patient') {
    res.status(403).json({ error: 'only patients can book appointments' });
    return;
  }
  const b = (req.body || {}) as BookBody;
  if (!b.clinician_id || !b.scheduled_for || !b.kind) {
    res.status(400).json({ error: 'clinician_id, scheduled_for, kind required' });
    return;
  }
  const clinician = db
    .prepare<[number], UserRow>("SELECT * FROM users WHERE id = ? AND role IN ('doctor', 'labtech')")
    .get(b.clinician_id);
  if (!clinician) {
    res.status(400).json({ error: 'unknown clinician' });
    return;
  }
  const info = db
    .prepare<[number, number, string, string, string, string | null, string | null, string | null]>(
      `INSERT INTO appointments
         (patient_id, clinician_id, scheduled_for, kind, modality, status, visit_type, symptoms, current_medications)
       VALUES (?, ?, ?, ?, ?, 'scheduled', ?, ?, ?)`
    )
    .run(
      req.user!.id,
      b.clinician_id,
      b.scheduled_for,
      b.kind,
      b.modality || 'video',
      b.visit_type?.trim() || null,
      b.symptoms?.trim() || null,
      b.current_medications?.trim() || null
    );
  const created = getAppointmentFull(String(info.lastInsertRowid));
  const patientUser = db
    .prepare<[number], UserRow>('SELECT * FROM users WHERE id = ?')
    .get(req.user!.id);
  if (patientUser) {
    void sendMail(
      patientUser.email,
      'Appointment confirmed',
      `Hi ${patientUser.full_name},

Your appointment "${b.kind}" with ${clinician.full_name} on ${b.scheduled_for.replace('T', ' ')} (${b.modality || 'video'}) is confirmed.

Zero Health`
    );
  }
  res.json(created);
});

router.put('/appointments/:id/reschedule', authenticate, (req, res) => {
  const appt = getAppointmentFull(req.params.id);
  if (!appt) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  if (!canAccessAppointment(appt, req.user!)) {
    res.status(403).json({ error: 'access denied' });
    return;
  }
  if (appt.status !== 'scheduled') {
    res.status(409).json({ error: 'only scheduled appointments can be rescheduled' });
    return;
  }
  const { scheduled_for } = (req.body || {}) as { scheduled_for?: string };
  if (!scheduled_for) {
    res.status(400).json({ error: 'scheduled_for required' });
    return;
  }
  db.prepare<[string, number]>('UPDATE appointments SET scheduled_for = ? WHERE id = ?').run(
    scheduled_for,
    appt.id
  );
  res.json(getAppointmentFull(req.params.id));
});

router.put('/appointments/:id/cancel', authenticate, (req, res) => {
  const appt = getAppointmentFull(req.params.id);
  if (!appt) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  if (!canAccessAppointment(appt, req.user!)) {
    res.status(403).json({ error: 'access denied' });
    return;
  }
  if (appt.status !== 'scheduled') {
    res.status(409).json({ error: 'appointment is not scheduled' });
    return;
  }
  db.prepare<[number]>("UPDATE appointments SET status = 'cancelled' WHERE id = ?").run(appt.id);
  res.json(getAppointmentFull(req.params.id));
});

interface ApptNotesBody {
  notes?: string;
  outcome?: string;
  patient_feedback?: string;
}

router.put('/appointments/:id/notes', authenticate, (req, res) => {
  const appt = getAppointmentFull(req.params.id);
  if (!appt) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  const role = req.user!.role;
  const userId = req.user!.id;
  const b = (req.body || {}) as ApptNotesBody;

  if (role === 'patient') {
    if (appt.patient_id !== userId) {
      res.status(403).json({ error: 'access denied' });
      return;
    }
    if (b.patient_feedback === undefined) {
      res.status(400).json({ error: 'patient_feedback required' });
      return;
    }
    db.prepare<[string, number]>('UPDATE appointments SET patient_feedback = ? WHERE id = ?').run(
      b.patient_feedback,
      appt.id
    );
  } else if (role === 'doctor' || role === 'labtech') {
    if (appt.clinician_id !== userId) {
      res.status(403).json({ error: 'access denied' });
      return;
    }
    if (b.notes === undefined && b.outcome === undefined) {
      res.status(400).json({ error: 'notes or outcome required' });
      return;
    }
    if (b.notes !== undefined) {
      db.prepare<[string, number]>('UPDATE appointments SET notes = ? WHERE id = ?').run(b.notes, appt.id);
    }
    if (b.outcome !== undefined) {
      db.prepare<[string, number]>('UPDATE appointments SET outcome = ? WHERE id = ?').run(b.outcome, appt.id);
    }
  } else if (role === 'admin') {
    if (b.notes === undefined && b.outcome === undefined) {
      res.status(400).json({ error: 'notes or outcome required' });
      return;
    }
    if (b.notes !== undefined) {
      db.prepare<[string, number]>('UPDATE appointments SET notes = ? WHERE id = ?').run(b.notes, appt.id);
    }
    if (b.outcome !== undefined) {
      db.prepare<[string, number]>('UPDATE appointments SET outcome = ? WHERE id = ?').run(b.outcome, appt.id);
    }
  } else {
    res.status(403).json({ error: 'access denied' });
    return;
  }

  res.json(getAppointmentFull(req.params.id));
});

// --- Messages --------------------------------------------------------------

router.post('/messages', authenticate, upload.single('attachment'), (req, res) => {
  const b = (req.body || {}) as { recipient_id?: string; body?: string };
  const recipientId = Number(b.recipient_id);
  const body = (b.body || '').trim();
  if (!recipientId || !body) {
    res.status(400).json({ error: 'recipient_id, body required' });
    return;
  }
  const recipient = db
    .prepare<[number], UserRow>('SELECT * FROM users WHERE id = ?')
    .get(recipientId);
  if (!recipient) {
    res.status(400).json({ error: 'unknown recipient' });
    return;
  }
  const info = db
    .prepare<[number, number, string, string | null]>(
      'INSERT INTO messages (from_user_id, to_user_id, body, attachment_path) VALUES (?, ?, ?, ?)'
    )
    .run(req.user!.id, recipientId, body, req.file ? req.file.filename : null);
  const created = db
    .prepare<[number], MessageWithNamesRow>(
      `SELECT m.*, f.full_name AS from_name, t.full_name AS to_name
         FROM messages m
         JOIN users f ON f.id = m.from_user_id
         JOIN users t ON t.id = m.to_user_id
        WHERE m.id = ?`
    )
    .get(Number(info.lastInsertRowid));
  res.json(created);
});

router.get('/conversations', authenticate, (req, res) => {
  const rows = db
    .prepare<[number, number], MessageWithNamesRow>(
      `SELECT m.*, f.full_name AS from_name, f.role AS from_role, t.full_name AS to_name, t.role AS to_role
         FROM messages m
         JOIN users f ON f.id = m.from_user_id
         JOIN users t ON t.id = m.to_user_id
        WHERE m.from_user_id = ? OR m.to_user_id = ?
        ORDER BY m.id DESC`
    )
    .all(req.user!.id, req.user!.id);

  const byCounterpart = new Map<number, ConversationRow>();
  for (const m of rows) {
    const fromMe = m.from_user_id === req.user!.id;
    const counterpartId = fromMe ? m.to_user_id : m.from_user_id;
    const name = fromMe ? m.to_name : m.from_name;
    const role = (fromMe ? m.to_role : m.from_role) || 'unknown';
    const existing = byCounterpart.get(counterpartId);
    const unreadHere = !fromMe && !m.is_read ? 1 : 0;
    if (!existing) {
      byCounterpart.set(counterpartId, {
        user_id: counterpartId,
        name,
        role,
        last_body: m.body,
        last_at: m.created_at,
        unread: unreadHere,
      });
    } else {
      existing.unread += unreadHere;
    }
  }
  res.json(Array.from(byCounterpart.values()));
});

router.get('/messages/with/:userId', authenticate, (req, res) => {
  const counterpart = db
    .prepare<[string], Omit<UserRow, 'password_hash'>>(
      'SELECT id, email, full_name, role, created_at FROM users WHERE id = ?'
    )
    .get(req.params.userId);
  if (!counterpart) {
    res.status(404).json({ error: 'user not found' });
    return;
  }
  const rows = db
    .prepare<[number, number, number, number], MessageRow>(
      `SELECT m.* FROM messages m
        WHERE (m.from_user_id = ? AND m.to_user_id = ?) OR (m.from_user_id = ? AND m.to_user_id = ?)
        ORDER BY m.id ASC`
    )
    .all(req.user!.id, counterpart.id, counterpart.id, req.user!.id);
  db.prepare<[number, number]>('UPDATE messages SET is_read = 1 WHERE from_user_id = ? AND to_user_id = ?').run(
    counterpart.id,
    req.user!.id
  );
  res.json({ counterpart, messages: rows });
});

// --- Search ----------------------------------------------------------------

router.get('/search', authenticate, (req, res) => {
  const role = req.user!.role;
  if (role === 'patient') {
    res.status(403).json({ error: 'staff access required' });
    return;
  }
  const q = String(req.query.q || '').trim();
  const type = String(req.query.type || '');
  if (!q) {
    res.status(400).json({ error: 'q required' });
    return;
  }
  const like = `%${q}%`;

  if (type === 'patients') {
    if (role !== 'doctor' && role !== 'admin') {
      res.status(403).json({ error: 'not allowed to search patients' });
      return;
    }
    const rows = db
      .prepare<[string, string], PatientPanelRow & { active_rx: number }>(
        `SELECT u.id, u.full_name, u.email, u.phone,
                (SELECT COUNT(*) FROM prescriptions p WHERE p.patient_id = u.id AND p.status IN ('pending','collected')) AS active_rx
           FROM users u
          WHERE u.role = 'patient' AND (u.full_name LIKE ? OR u.email LIKE ?)
          ORDER BY u.id`
      )
      .all(like, like);
    res.json({ query: q, type, results: rows });
    return;
  }

  if (type === 'prescriptions') {
    if (role !== 'doctor' && role !== 'admin' && role !== 'pharmacist') {
      res.status(403).json({ error: 'not allowed to search prescriptions' });
      return;
    }
    const rows = db
      .prepare<[string, string], PrescriptionWithNamesRow>(
        `SELECT p.*, pt.full_name AS patient_name
           FROM prescriptions p LEFT JOIN users pt ON pt.id = p.patient_id
          WHERE p.medication LIKE ? OR pt.full_name LIKE ?
          ORDER BY p.id`
      )
      .all(like, like);
    res.json({ query: q, type, results: rows });
    return;
  }

  if (type === 'appointments') {
    if (role !== 'doctor' && role !== 'admin') {
      res.status(403).json({ error: 'not allowed to search appointments' });
      return;
    }
    const rows = db
      .prepare<[string, string], AppointmentWithClinicianRow>(
        `SELECT a.*, p.full_name AS patient_name
           FROM appointments a LEFT JOIN users p ON p.id = a.patient_id
          WHERE a.kind LIKE ? OR p.full_name LIKE ?
          ORDER BY a.scheduled_for`
      )
      .all(like, like);
    res.json({ query: q, type, results: rows });
    return;
  }

  if (type === 'lab-results') {
    if (role !== 'doctor' && role !== 'admin' && role !== 'labtech') {
      res.status(403).json({ error: 'not allowed to search lab results' });
      return;
    }
    const rows = db
      .prepare<[string, string, string], LabResultWithNamesRow>(
        `SELECT l.*, u.full_name AS patient_name
           FROM lab_results l LEFT JOIN users u ON u.id = l.patient_id
          WHERE l.panel LIKE ? OR l.value LIKE ? OR u.full_name LIKE ?
          ORDER BY l.id DESC`
      )
      .all(like, like, like);
    res.json({ query: q, type, results: rows });
    return;
  }

  res.status(400).json({ error: 'unknown search type' });
});

// --- Admin -----------------------------------------------------------------

router.get('/admin/users', authenticate, (_req, res) => {
  const rows = db.prepare<[], UserRow>('SELECT * FROM users').all();
  res.json(rows);
});

router.get('/admin/applications', authenticate, (req, res) => {
  if (req.user!.role !== 'admin') {
    res.status(403).json({ error: 'admin only' });
    return;
  }
  const rows = db.prepare<[], JobApplicationRow>('SELECT * FROM job_applications ORDER BY id DESC').all();
  res.json(rows);
});

interface AdminCreateUserBody {
  email?: string;
  password?: string;
  full_name?: string;
  role?: string;
}

router.post('/admin/users', authenticate, (req, res) => {
  if (req.user!.role !== 'admin') {
    res.status(403).json({ error: 'admin only' });
    return;
  }
  const b = (req.body || {}) as AdminCreateUserBody;
  if (!b.email || !b.password || !b.full_name || !b.role) {
    res.status(400).json({ error: 'email, password, full_name, role required' });
    return;
  }
  if (!ROLES.includes(b.role)) {
    res.status(400).json({ error: 'invalid role' });
    return;
  }
  try {
    const info = db
      .prepare<[string, string, string, string]>(
        'INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)'
      )
      .run(b.email, hashPassword(b.password), b.full_name, b.role);
    const created = db
      .prepare<[number], Omit<UserRow, 'password_hash'>>(
        'SELECT id, email, full_name, role, created_at FROM users WHERE id = ?'
      )
      .get(Number(info.lastInsertRowid));
    res.json(created);
  } catch {
    res.status(409).json({ error: 'email already registered' });
  }
});

router.patch('/admin/users/:id/role', authenticate, (req, res) => {
  if (req.user!.role !== 'admin') {
    res.status(403).json({ error: 'admin only' });
    return;
  }
  const { role } = (req.body || {}) as { role?: string };
  if (!role || !ROLES.includes(role)) {
    res.status(400).json({ error: 'invalid role' });
    return;
  }
  const user = db.prepare<[string], UserRow>('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'user not found' });
    return;
  }
  db.prepare<[string, number]>('UPDATE users SET role = ? WHERE id = ?').run(role, user.id);
  const updated = db
    .prepare<[number], Omit<UserRow, 'password_hash'>>(
      'SELECT id, email, full_name, role, created_at FROM users WHERE id = ?'
    )
    .get(user.id);
  res.json(updated);
});

router.delete('/admin/users/:id', authenticate, (req, res) => {
  if (req.user!.role !== 'admin') {
    res.status(403).json({ error: 'admin only' });
    return;
  }
  const user = db.prepare<[string], UserRow>('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'user not found' });
    return;
  }
  if (user.id === req.user!.id) {
    res.status(400).json({ error: 'you cannot delete your own account' });
    return;
  }
  db.prepare<[number]>('DELETE FROM users WHERE id = ?').run(user.id);
  res.json({ deleted: user.id });
});

router.get('/admin/stats', authenticate, (req, res) => {
  if (req.user!.role !== 'admin') {
    res.status(403).json({ error: 'admin only' });
    return;
  }
  const count = (sql: string): number => {
    const row = db.prepare<[], { n: number }>(sql).get();
    return row ? Number(row.n) : 0;
  };
  const stats: AdminStatsRow = {
    users_total: count('SELECT COUNT(*) AS n FROM users'),
    patients: count("SELECT COUNT(*) AS n FROM users WHERE role = 'patient'"),
    doctors: count("SELECT COUNT(*) AS n FROM users WHERE role = 'doctor'"),
    pharmacists: count("SELECT COUNT(*) AS n FROM users WHERE role = 'pharmacist'"),
    labtechs: count("SELECT COUNT(*) AS n FROM users WHERE role = 'labtech'"),
    admins: count("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'"),
    prescriptions_total: count('SELECT COUNT(*) AS n FROM prescriptions'),
    prescriptions_pending: count("SELECT COUNT(*) AS n FROM prescriptions WHERE status = 'pending'"),
    prescriptions_collected: count("SELECT COUNT(*) AS n FROM prescriptions WHERE status = 'collected'"),
    appointments_total: count('SELECT COUNT(*) AS n FROM appointments'),
    appointments_upcoming: count(
      "SELECT COUNT(*) AS n FROM appointments WHERE scheduled_for > datetime('now')"
    ),
    lab_results_total: count('SELECT COUNT(*) AS n FROM lab_results'),
    messages_total: count('SELECT COUNT(*) AS n FROM messages'),
    applications_total: count('SELECT COUNT(*) AS n FROM job_applications'),
  };
  res.json(stats);
});

// --- Reports ---------------------------------------------------------------

router.get('/reports/:patientId', authenticate, (req, res) => {
  if (!['doctor', 'admin'].includes(req.user!.role)) {
    res.status(403).json({ error: 'doctor or admin access required' });
    return;
  }
  const patient = db
    .prepare<[string], Omit<UserRow, 'password_hash'>>(
      'SELECT id, email, full_name, role, created_at FROM users WHERE id = ?'
    )
    .get(req.params.patientId);
  if (!patient) {
    res.status(404).json({ error: 'patient not found' });
    return;
  }
  const prescriptions = db
    .prepare<[number], PrescriptionWithNamesRow>(
      `SELECT p.*, d.full_name AS prescriber_name
         FROM prescriptions p LEFT JOIN users d ON d.id = p.prescriber_id
        WHERE p.patient_id = ? ORDER BY p.id`
    )
    .all(patient.id);
  const labResults = db
    .prepare<[number], LabResultRow>('SELECT * FROM lab_results WHERE patient_id = ? ORDER BY id')
    .all(patient.id);
  const appointments = db
    .prepare<[number], AppointmentWithClinicianRow>(
      `SELECT a.*, u.full_name AS clinician_name
         FROM appointments a LEFT JOIN users u ON u.id = a.clinician_id
        WHERE a.patient_id = ? ORDER BY a.scheduled_for`
    )
    .all(patient.id);
  res.json({ patient, prescriptions, lab_results: labResults, appointments });
});

// --- Zero Agent ------------------------------------------------------------

router.post('/agent/chat', authenticate, async (req, res) => {
  const { message } = (req.body || {}) as { message?: string };
  if (!message) {
    res.status(400).json({ error: 'message required' });
    return;
  }
  try {
    const result = await runAgent({ userInput: message, userId: req.user!.id });
    db.prepare<[number, string, string]>(
      'INSERT INTO chat_history (user_id, message, response) VALUES (?, ?, ?)'
    ).run(req.user!.id, message, result.output);
    res.json(result);
  } catch (e) {
    if (!llmConfigured()) {
      res.status(503).json({
        error: 'Zero Agent is not configured. Set AGENT_LLM_BASE_URL and AGENT_LLM_MODEL on the API.',
      });
    } else {
      res.status(502).json({ error: 'Zero Agent could not reach its model: ' + (e as Error).message });
    }
  }
});

router.get('/agent/history', authenticate, (req, res) => {
  const rows = db
    .prepare<[number], ChatHistoryRow>(
      'SELECT * FROM chat_history WHERE user_id = ? ORDER BY id ASC LIMIT 100'
    )
    .all(req.user!.id);
  res.json(rows);
});

router.get('/agent/summarize/:labId', authenticate, async (req, res) => {
  const row = db.prepare<[string], LabResultRow>('SELECT * FROM lab_results WHERE id = ?').get(req.params.labId);
  if (!row) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  try {
    const result = await runAgent({
      userInput: 'Summarize my latest result.',
      recordContext: row.interpretation,
      userId: req.user!.id,
    });
    db.prepare<[number, string, string]>(
      'INSERT INTO chat_history (user_id, message, response) VALUES (?, ?, ?)'
    ).run(req.user!.id, `Summarize my result "${row.panel}" (record ${row.id})`, result.output);
    res.json({ ...result, source_record: row.id });
  } catch (e) {
    if (!llmConfigured()) {
      res.status(503).json({
        error: 'Zero Agent is not configured. Set AGENT_LLM_BASE_URL and AGENT_LLM_MODEL on the API.',
      });
    } else {
      res.status(502).json({ error: 'Zero Agent could not reach its model: ' + (e as Error).message });
    }
  }
});

// --- Password reset --------------------------------------------------------
// The lab has no mail server, so reset links are printed to the API console.

router.post('/auth/forgot-password', (req, res) => {
  const { email } = (req.body || {}) as { email?: string };
  const user = email
    ? db.prepare<[string], UserRow>('SELECT * FROM users WHERE email = ?').get(email.trim())
    : undefined;
  if (user) {
    const token = crypto.randomBytes(24).toString('hex');
    db.prepare<[number, string]>(
      "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, datetime('now', '+15 minutes'))"
    ).run(user.id, hashPassword(token));
    void sendMail(
      user.email,
      'Reset your Zero Health password',
      `Hi ${user.full_name},

Use this link within 15 minutes to set a new password:

${WEB_BASE_URL}/reset-password?token=${token}

If you did not request this, you can ignore this email.

Zero Health`
    );
  }
  // Same response whether or not the account exists, so accounts cannot be enumerated.
  res.json({
    message: 'If an account exists for that email, a reset link has been sent and is valid for 15 minutes.',
  });
});

interface ResetBody {
  token?: string;
  password?: string;
}

router.post('/auth/reset-password', (req, res) => {
  const { token, password } = (req.body || {}) as ResetBody;
  if (!token || !password) {
    res.status(400).json({ error: 'token, password required' });
    return;
  }
  const row = db
    .prepare<[string], PasswordResetTokenRow>(
      'SELECT * FROM password_reset_tokens WHERE token_hash = ?'
    )
    .get(hashPassword(token));
  if (!row) {
    res.status(400).json({ error: 'invalid reset token' });
    return;
  }
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  if (row.expires_at <= now) {
    db.prepare<[number]>('DELETE FROM password_reset_tokens WHERE id = ?').run(row.id);
    res.status(400).json({ error: 'reset token has expired, request a new one' });
    return;
  }
  db.prepare<[string, number]>('UPDATE users SET password_hash = ? WHERE id = ?').run(
    hashPassword(password),
    row.user_id
  );
  db.prepare<[number]>('DELETE FROM password_reset_tokens WHERE user_id = ?').run(row.user_id);
  res.json({ message: 'Password updated. You can sign in with your new password.' });
});

// --- Job applications ------------------------------------------------------

interface JobApplicationBody {
  job_slug?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  links?: string;
  motivation?: string;
  source?: string;
}

router.post('/job-applications', (req, res) => {
  const b = (req.body || {}) as JobApplicationBody;
  const jobSlug = (b.job_slug || '').trim();
  const fullName = (b.full_name || '').trim();
  const email = (b.email || '').trim();
  const motivation = (b.motivation || '').trim();
  if (!jobSlug || !fullName || !email || !motivation) {
    res.status(400).json({ error: 'job_slug, full_name, email, motivation required' });
    return;
  }
  const info = db
    .prepare<[string, string, string, string | null, string | null, string, string | null]>(
      'INSERT INTO job_applications (job_slug, full_name, email, phone, links, motivation, source) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .run(
      jobSlug,
      fullName,
      email,
      (b.phone || '').trim() || null,
      (b.links || '').trim() || null,
      motivation.slice(0, 2000),
      (b.source || '').trim() || null
    );
  const id = Number(info.lastInsertRowid);
  res.json({ id, status: 'received', reference: 'ZH-' + String(id).padStart(4, '0') });
});

export default router;

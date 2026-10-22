import path from 'node:path';
import Database from 'better-sqlite3';

export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  full_name: string;
  role: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  specialization: string | null;
  license_number: string | null;
  created_at: string;
}

export interface PrescriptionRow {
  id: number;
  patient_id: number;
  prescriber_id: number | null;
  medication: string;
  dosage: string;
  frequency: string | null;
  duration: string | null;
  instructions: string | null;
  status: string;
  collection_code: string | null;
  collected_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface PrescriptionWithNamesRow extends PrescriptionRow {
  patient_name?: string | null;
  prescriber_name?: string | null;
}

export interface LabResultRow {
  id: number;
  patient_id: number;
  panel: string;
  value: string;
  interpretation: string | null;
  image_path: string | null;
  recorded_by: number | null;
  created_at: string;
}

export interface LabResultWithNamesRow extends LabResultRow {
  patient_name?: string | null;
  recorded_by_name?: string | null;
}

export interface MessageRow {
  id: number;
  from_user_id: number;
  to_user_id: number;
  body: string;
  attachment_path: string | null;
  is_read: number;
  created_at: string;
}

export interface MessageWithNamesRow extends MessageRow {
  from_name: string;
  to_name: string;
  from_role?: string;
  to_role?: string;
}

export interface AppointmentRow {
  id: number;
  patient_id: number;
  clinician_id: number | null;
  scheduled_for: string;
  kind: string;
  modality: string;
  status: string;
  visit_type: string | null;
  symptoms: string | null;
  current_medications: string | null;
  notes: string | null;
  outcome: string | null;
  patient_feedback: string | null;
  rating: number | null;
}

export interface AppointmentWithClinicianRow extends AppointmentRow {
  clinician_name?: string | null;
  patient_name?: string | null;
}

export interface PatientPanelRow {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  active_rx: number;
}

export interface WebhookRow {
  id: number;
  user_id: number;
  url: string;
  created_at: string;
}

export interface AnalyticsEventRow {
  id: number;
  user_id: number | null;
  path: string;
  created_at: string;
}

export interface PasswordResetTokenRow {
  id: number;
  user_id: number;
  token_hash: string;
  expires_at: string;
  created_at: string;
}

export interface JobApplicationRow {
  id: number;
  job_slug: string;
  full_name: string;
  email: string;
  phone: string | null;
  links: string | null;
  motivation: string;
  source: string | null;
  created_at: string;
}

export interface ChatHistoryRow {
  id: number;
  user_id: number;
  message: string;
  response: string;
  created_at: string;
}

export interface DoctorRow {
  id: number;
  full_name: string;
  email: string;
}

export interface ClinicianRow extends DoctorRow {
  role: string;
  specialization: string | null;
}

export interface ConversationRow {
  user_id: number;
  name: string;
  role: string;
  last_body: string;
  last_at: string;
  unread: number;
}

export interface AdminStatsRow {
  users_total: number;
  patients: number;
  doctors: number;
  pharmacists: number;
  labtechs: number;
  admins: number;
  prescriptions_total: number;
  prescriptions_pending: number;
  prescriptions_collected: number;
  appointments_total: number;
  appointments_upcoming: number;
  lab_results_total: number;
  messages_total: number;
  applications_total: number;
}

export const DB_PATH =
  process.env.DB_PATH || path.join(__dirname, '..', '..', '..', 'data', 'zero-health.sqlite');

// Uploads live next to the app by default; point UPLOADS_DIR at a persistent
// location on hosts where the app root is replaced on every deploy.
export const UPLOADS_DIR =
  process.env.UPLOADS_DIR || path.join(__dirname, '..', '..', 'uploads');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

function addColumnIfMissing(table: string, column: string, ddl: string): void {
  const cols = db.prepare<[], { name: string }>(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

export function init(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'patient',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS prescriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      prescriber_id INTEGER,
      medication TEXT NOT NULL,
      dosage TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS lab_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      panel TEXT NOT NULL,
      value TEXT NOT NULL,
      interpretation TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user_id INTEGER NOT NULL,
      to_user_id INTEGER NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      clinician_id INTEGER,
      scheduled_for TEXT NOT NULL,
      kind TEXT NOT NULL,
      modality TEXT NOT NULL DEFAULT 'video',
      status TEXT NOT NULL DEFAULT 'scheduled'
    );

    CREATE TABLE IF NOT EXISTS job_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_slug TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      links TEXT,
      motivation TEXT NOT NULL,
      source TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chat_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      response TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS webhooks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      url TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS analytics_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      path TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Migrations for databases created before these columns existed.
  addColumnIfMissing('prescriptions', 'frequency', 'frequency TEXT');
  addColumnIfMissing('prescriptions', 'duration', 'duration TEXT');
  addColumnIfMissing('prescriptions', 'instructions', 'instructions TEXT');
  addColumnIfMissing('prescriptions', 'collection_code', 'collection_code TEXT');
  addColumnIfMissing('prescriptions', 'collected_at', 'collected_at TEXT');
  addColumnIfMissing('appointments', 'notes', 'notes TEXT');
  addColumnIfMissing('appointments', 'outcome', 'outcome TEXT');
  addColumnIfMissing('appointments', 'visit_type', 'visit_type TEXT');
  addColumnIfMissing('appointments', 'symptoms', 'symptoms TEXT');
  addColumnIfMissing('appointments', 'current_medications', 'current_medications TEXT');
  addColumnIfMissing('appointments', 'rating', 'rating INTEGER');
  addColumnIfMissing('appointments', 'patient_feedback', 'patient_feedback TEXT');
  addColumnIfMissing('lab_results', 'image_path', 'image_path TEXT');
  addColumnIfMissing('lab_results', 'recorded_by', 'recorded_by INTEGER');
  addColumnIfMissing('messages', 'is_read', 'is_read INTEGER DEFAULT 0');
  addColumnIfMissing('messages', 'attachment_path', 'attachment_path TEXT');
  addColumnIfMissing('users', 'phone', 'phone TEXT');
  addColumnIfMissing('users', 'date_of_birth', 'date_of_birth TEXT');
  addColumnIfMissing('users', 'gender', 'gender TEXT');
  addColumnIfMissing('users', 'address', 'address TEXT');
  addColumnIfMissing('users', 'specialization', 'specialization TEXT');
  addColumnIfMissing('users', 'license_number', 'license_number TEXT');
}

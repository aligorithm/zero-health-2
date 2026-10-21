/*
 * Functional verification against a running API (default 127.0.0.1:4000).
 * Usage: start the API (`npm run dev` or `npm start` in apps/api), then `npm run verify`.
 * Exits non-zero if any check fails.
 */

import http from 'node:http';

const PORT = Number(process.env.PORT || 4000);

interface ApiResponse {
  status: number;
  body: any;
}

function req(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
  headersOverride?: Record<string, string>
): Promise<ApiResponse> {
  return new Promise((resolve, reject) => {
    const isBuffer = Buffer.isBuffer(body);
    const data = body === undefined ? null : isBuffer ? (body as Buffer) : JSON.stringify(body);
    const r = http.request(
      {
        host: '127.0.0.1',
        port: PORT,
        method,
        path,
        headers: {
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
          ...(data
            ? {
                'Content-Type': isBuffer ? 'application/octet-stream' : 'application/json',
                'Content-Length': data.length,
              }
            : {}),
          ...(headersOverride || {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          resolve({ status: res.statusCode || 0, body: text ? safeJson(text) : null });
        });
      }
    );
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

function safeJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function multipart(fields: Record<string, string>, file?: { field: string; filename: string; data: Buffer }): { body: Buffer; contentType: string } {
  const boundary = '----zhverify' + Date.now();
  const parts: Buffer[] = [];
  for (const [name, value] of Object.entries(fields)) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`
      )
    );
  }
  if (file) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${file.field}"; filename="${file.filename}"\r\nContent-Type: image/png\r\n\r\n`
      )
    );
    parts.push(file.data);
    parts.push(Buffer.from('\r\n'));
  }
  parts.push(Buffer.from(`--${boundary}--\r\n`));
  return {
    body: Buffer.concat(parts),
    contentType: 'multipart/form-data; boundary=' + boundary,
  };
}

let failures = 0;

function check(name: string, ok: boolean, detail = ''): void {
  if (ok) {
    console.log('  ok  %s %s', name, detail);
  } else {
    failures++;
    console.error('FAIL  %s %s', name, detail);
  }
}

const PASSWORD = 'Password1!';

async function login(email: string, password = PASSWORD): Promise<{ token: string; user: any }> {
  const res = await req('POST', '/api/auth/login', { email, password });
  if (res.status !== 200 || !res.body?.token) {
    throw new Error(`login failed for ${email} (HTTP ${res.status}), is the DB seeded? (npm run seed)`);
  }
  return res.body;
}

async function main(): Promise<void> {
  console.log(`Verifying Zero Health API on 127.0.0.1:${PORT}\n`);

  const patient = await login('patient.alpha@example.test');
  const doctor = await login('dr.one@example.test');
  const admin = await login('admin@example.test');
  const pharmLogin = await login('pharma.one@example.test');
  const pharm = pharmLogin.token;
  const labtech = (await login('lab.one@example.test')).token;

  const health = await req('GET', '/api/health');
  check('health endpoint', health.status === 200 && health.body?.status === 'ok');
  check('patient login', !!patient.token, `id ${patient.user.id}, role ${patient.user.role}`);

  const me = await req('GET', '/api/me', undefined, patient.token);
  check('current user profile', me.status === 200 && me.body?.email === 'patient.alpha@example.test');

  const myRx = await req('GET', '/api/me/prescriptions', undefined, patient.token);
  check(
    'own prescriptions (pending, with code)',
    myRx.status === 200 && Array.isArray(myRx.body) && myRx.body.length >= 1 && myRx.body[0].medication === 'Lisinopril' && myRx.body[0].status === 'pending' && myRx.body[0].collection_code === 'ZH4A2K',
    `${myRx.body?.length} rows`
  );

  const myLabs = await req('GET', '/api/me/lab-results', undefined, patient.token);
  check(
    'own lab results (with seeded image)',
    myLabs.status === 200 && Array.isArray(myLabs.body) && myLabs.body.some((l: any) => l.image_path === 'seeded-chart.png'),
    `${myLabs.body?.length} rows`
  );

  const myAppts = await req('GET', '/api/me/appointments', undefined, patient.token);
  check('own appointments', myAppts.status === 200 && Array.isArray(myAppts.body) && myAppts.body.length >= 2, `${myAppts.body?.length} rows`);

  const panel = await req('GET', '/api/patients', undefined, doctor.token);
  check(
    'doctor patient panel',
    panel.status === 200 && Array.isArray(panel.body) && panel.body.length >= 4 && panel.body[0].full_name === 'Amelia Hart',
    `${panel.body?.length} patients`
  );

  const rxAsPatient = await req(
    'POST',
    '/api/prescriptions',
    { patient_id: patient.user.id, medication: 'Nope', dosage: '1mg' },
    patient.token
  );
  check('patient cannot create prescriptions', rxAsPatient.status === 403, `HTTP ${rxAsPatient.status}`);

  // --- prescription lifecycle ----------------------------------------------

  const doctorRx = await req(
    'POST',
    '/api/prescriptions',
    {
      patient_id: 3,
      medication: 'Verifyamol',
      dosage: '5mg daily',
      frequency: 'once daily',
      duration: '7 days',
      instructions: 'Synthetic verification order.',
    },
    doctor.token
  );
  check(
    'doctor creates pending prescription with code',
    doctorRx.status === 200 && doctorRx.body?.status === 'pending' && typeof doctorRx.body?.collection_code === 'string' && doctorRx.body.collection_code.length === 6,
    `code ${doctorRx.body?.collection_code}`
  );

  const queue = await req('GET', '/api/prescriptions', undefined, pharm);
  check(
    'pharmacist sees dispensing queue',
    queue.status === 200 && Array.isArray(queue.body) && queue.body.length >= 3 && queue.body.every((r: any) => r.patient_name),
    `${queue.body?.length} rows`
  );

  const wrongCode = await req('POST', `/api/prescriptions/${doctorRx.body.id}/collect`, { code: 'WRONG1' }, pharm);
  check('wrong collection code rejected', wrongCode.status === 403, `HTTP ${wrongCode.status}`);

  const collectAsPatient = await req('POST', `/api/prescriptions/${doctorRx.body.id}/collect`, { code: doctorRx.body.collection_code }, patient.token);
  check('patient cannot collect', collectAsPatient.status === 403, `HTTP ${collectAsPatient.status}`);

  const collect = await req('POST', `/api/prescriptions/${doctorRx.body.id}/collect`, { code: doctorRx.body.collection_code }, pharm);
  check(
    'pharmacist collects with valid code',
    collect.status === 200 && collect.body?.status === 'collected' && !!collect.body?.collected_at,
    `id ${collect.body?.id}`
  );

  const collectAgain = await req('POST', `/api/prescriptions/${doctorRx.body.id}/collect`, { code: doctorRx.body.collection_code }, pharm);
  check('double collect rejected', collectAgain.status === 409, `HTTP ${collectAgain.status}`);

  // --- clinicians + appointments -------------------------------------------

  const clinicians = await req('GET', '/api/clinicians', undefined, patient.token);
  check(
    'clinicians list includes doctor and labtech',
    clinicians.status === 200 && Array.isArray(clinicians.body) && clinicians.body.some((c: any) => c.role === 'doctor') && clinicians.body.some((c: any) => c.role === 'labtech')
  );
  check(
    'clinician profiles carry specialization',
    clinicians.status === 200 && clinicians.body.some((c: any) => c.role === 'doctor' && c.specialization === 'Family Medicine')
  );

  const doctorId = clinicians.body.find((c: any) => c.role === 'doctor').id;
  const labtechId = clinicians.body.find((c: any) => c.role === 'labtech').id;

  const book = await req(
    'POST',
    '/api/appointments',
    {
      clinician_id: doctorId,
      scheduled_for: '2026-12-01 10:00',
      kind: 'Verification visit',
      modality: 'video',
      visit_type: 'existing-condition',
      symptoms: 'Recurring synthetic symptom',
      current_medications: 'Lisinopril 10mg',
    },
    patient.token
  );
  check(
    'patient books with doctor (intake captured)',
    book.status === 200 && book.body?.clinician_name === 'Dr. Sarah Chen' && book.body?.visit_type === 'existing-condition' && book.body?.symptoms === 'Recurring synthetic symptom' && book.body?.current_medications === 'Lisinopril 10mg',
    `id ${book.body?.id}`
  );

  const bookLab = await req(
    'POST',
    '/api/appointments',
    { clinician_id: labtechId, scheduled_for: '2026-12-02 09:00', kind: 'Blood panel', modality: 'in-person' },
    patient.token
  );
  check('patient books lab appointment with labtech', bookLab.status === 200 && bookLab.body?.clinician_name === 'Marcus Webb', `id ${bookLab.body?.id}`);

  const bookAsDoctor = await req(
    'POST',
    '/api/appointments',
    { clinician_id: doctorId, scheduled_for: '2026-12-01 10:00', kind: 'Self booking' },
    doctor.token
  );
  check('doctor cannot book as patient', bookAsDoctor.status === 403, `HTTP ${bookAsDoctor.status}`);

  const apptDetail = await req('GET', `/api/appointments/${book.body.id}`, undefined, patient.token);
  check('appointment detail for owner', apptDetail.status === 200 && apptDetail.body?.kind === 'Verification visit');

  const apptAsOutsider = await req('GET', `/api/appointments/${book.body.id}`, undefined, labtech);
  check('appointment detail blocked for non-participant', apptAsOutsider.status === 403, `HTTP ${apptAsOutsider.status}`);

  const reschedule = await req('PUT', `/api/appointments/${book.body.id}/reschedule`, { scheduled_for: '2026-12-05 15:00' }, patient.token);
  check('patient reschedules', reschedule.status === 200 && reschedule.body?.scheduled_for === '2026-12-05 15:00');

  const note = await req('PUT', `/api/appointments/${book.body.id}/notes`, { notes: 'Bring medication list.' }, doctor.token);
  check('doctor adds pre-visit note', note.status === 200 && note.body?.notes === 'Bring medication list.');

  const outcome = await req('PUT', `/api/appointments/${book.body.id}/notes`, { outcome: 'All synthetic. Follow up in 2 weeks.' }, doctor.token);
  check('doctor records outcome and follow-up', outcome.status === 200 && outcome.body?.outcome === 'All synthetic. Follow up in 2 weeks.');

  const feedback = await req('PUT', `/api/appointments/${book.body.id}/notes`, { patient_feedback: 'Great synthetic visit.' }, patient.token);
  check('patient adds feedback', feedback.status === 200 && feedback.body?.patient_feedback === 'Great synthetic visit.');

  const cancel = await req('PUT', `/api/appointments/${bookLab.body.id}/cancel`, undefined, patient.token);
  check('patient cancels lab appointment', cancel.status === 200 && cancel.body?.status === 'cancelled');

  const cancelAgain = await req('PUT', `/api/appointments/${bookLab.body.id}/cancel`, undefined, patient.token);
  check('double cancel rejected', cancelAgain.status === 409, `HTTP ${cancelAgain.status}`);

  const doctorAppts = await req('GET', '/api/appointments', undefined, doctor.token);
  check(
    'doctor schedule includes patient names',
    doctorAppts.status === 200 && Array.isArray(doctorAppts.body) && doctorAppts.body.every((a: any) => a.patient_name),
    `${doctorAppts.body?.length} rows`
  );

  // --- lab results with image upload ---------------------------------------

  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  ]);
  const upload = multipart(
    { patient_id: '4', panel: 'Verification Panel', value: 'Synthetically fine', interpretation: 'All synthetic.' },
    { field: 'image', filename: 'verify.png', data: pngHeader }
  );
  const newLab = await req('POST', '/api/lab-results', upload.body, labtech, {
    'Content-Type': upload.contentType,
  });
  check(
    'labtech uploads lab result with image',
    newLab.status === 200 && newLab.body?.panel === 'Verification Panel' && typeof newLab.body?.image_path === 'string',
    `id ${newLab.body?.id}, image ${newLab.body?.image_path}`
  );

  const badType = multipart({ patient_id: '4', panel: 'X', value: 'Y' }, { field: 'image', filename: 'evil.exe', data: Buffer.from('MZ') });
  const badUpload = await req('POST', '/api/lab-results', badType.body, labtech, { 'Content-Type': badType.contentType });
  check('non-image uploads rejected', badUpload.status === 500 || badUpload.status === 400, `HTTP ${badUpload.status}`);

  const fileServed = await req('GET', `/api/files/${newLab.body.image_path}`);
  check('uploaded image is served', fileServed.status === 200);

  const traversal = await req('GET', '/api/files/..%2F..%2Fpackage.json');
  check('path traversal blocked', traversal.status === 400 || traversal.status === 404, `HTTP ${traversal.status}`);

  const staffLabs = await req('GET', '/api/lab-results', undefined, doctor.token);
  check('staff see lab queue with patient names', staffLabs.status === 200 && Array.isArray(staffLabs.body) && staffLabs.body.every((l: any) => l.patient_name));

  // --- messaging: conversations + threads ----------------------------------

  const msgForm = multipart({ recipient_id: String(doctor.user.id), body: 'First message.' });
  await req('POST', '/api/messages', msgForm.body, patient.token, { 'Content-Type': msgForm.contentType });
  const replyForm = multipart({ recipient_id: String(patient.user.id), body: 'Doctor replies.' });
  await req('POST', '/api/messages', replyForm.body, doctor.token, { 'Content-Type': replyForm.contentType });

  const attachForm = multipart(
    { recipient_id: String(doctor.user.id), body: 'Result photo attached.' },
    { field: 'attachment', filename: 'verify.png', data: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) }
  );
  const attached = await req('POST', '/api/messages', attachForm.body, patient.token, { 'Content-Type': attachForm.contentType });
  check(
    'message attachments accepted',
    attached.status === 200 && typeof attached.body?.attachment_path === 'string' && attached.body.attachment_path.endsWith('.png')
  );
  const attachServed = await req('GET', `/api/files/${attached.body?.attachment_path}`);
  check('message attachment served', attachServed.status === 200);

  const convs = await req('GET', '/api/conversations', undefined, patient.token);
  check(
    'conversation list with unread count',
    convs.status === 200 && Array.isArray(convs.body) && convs.body.some((c: any) => c.name === 'Dr. Sarah Chen' && c.unread >= 1)
  );

  const thread = await req('GET', `/api/messages/with/${doctor.user.id}`, undefined, patient.token);
  check(
    'thread fetch returns ordered messages',
    thread.status === 200 && Array.isArray(thread.body?.messages) && thread.body.messages.length >= 3 && thread.body.counterpart?.full_name === 'Dr. Sarah Chen',
    `${thread.body?.messages?.length} messages`
  );

  const convsAfterRead = await req('GET', '/api/conversations', undefined, patient.token);
  check(
    'thread fetch marks messages as read',
    convsAfterRead.status === 200 && Array.isArray(convsAfterRead.body) && (convsAfterRead.body.find((c: any) => c.name === 'Dr. Sarah Chen')?.unread || 0) === 0
  );

  // --- search ---------------------------------------------------------------

  const searchPatients = await req('GET', '/api/search?q=Hart&type=patients', undefined, doctor.token);
  check(
    'doctor searches patients',
    searchPatients.status === 200 && Array.isArray(searchPatients.body?.results) && searchPatients.body.results.some((p: any) => p.full_name === 'Amelia Hart')
  );

  const searchRx = await req('GET', '/api/search?q=Lisinopril&type=prescriptions', undefined, pharm);
  check(
    'pharmacist searches prescriptions',
    searchRx.status === 200 && Array.isArray(searchRx.body?.results) && searchRx.body.results.some((r: any) => r.medication === 'Lisinopril')
  );

  const searchAsPatient = await req('GET', '/api/search?q=anything&type=patients', undefined, patient.token);
  check('patients cannot search', searchAsPatient.status === 403, `HTTP ${searchAsPatient.status}`);

  // --- admin management + stats ---------------------------------------------

  const suffix = Date.now();
  const createdUser = await req(
    'POST',
    '/api/admin/users',
    { email: `staff.${suffix}@example.test`, password: PASSWORD, full_name: 'Verify Staff', role: 'pharmacist' },
    admin.token
  );
  check('admin creates staff user', createdUser.status === 200 && createdUser.body?.role === 'pharmacist', `id ${createdUser.body?.id}`);

  const stats = await req('GET', '/api/admin/stats', undefined, admin.token);
  check(
    'admin stats',
    stats.status === 200 && stats.body?.users_total >= 8 && stats.body?.prescriptions_pending >= 1 && stats.body?.prescriptions_collected >= 1 && stats.body?.appointments_total >= 5,
    `${stats.body?.users_total} users, ${stats.body?.prescriptions_pending} pending`
  );

  const deleted = await req('DELETE', `/api/admin/users/${createdUser.body.id}`, undefined, admin.token);
  check('admin deletes user', deleted.status === 200 && deleted.body?.deleted === createdUser.body.id);

  // --- agent + reports + profile --------------------------------------------

  const agentRx = await req('POST', '/api/agent/chat', { message: 'What are my prescriptions?' }, patient.token);
  check(
    'agent responds (model attached) or reports missing configuration',
    (agentRx.status === 200 && typeof agentRx.body?.output === 'string' && agentRx.body.output.length > 0) ||
      (agentRx.status === 503 && typeof agentRx.body?.error === 'string' && agentRx.body.error.includes('not configured')),
    `HTTP ${agentRx.status}`
  );

  const history = await req('GET', '/api/agent/history', undefined, patient.token);
  check(
    'agent history persists',
    history.status === 200 && Array.isArray(history.body) && (history.body.length >= 1 || agentRx.status === 503),
    `${history.body?.length} entries`
  );

  const agentBook = await req(
    'POST',
    '/api/agent/chat',
    { message: 'Book an appointment with Dr. Sarah Chen on 2026-12-21 at 09:30 for a headache review' },
    patient.token
  );
  check(
    'agent books appointment via chat',
    agentBook.status === 200 && typeof agentBook.body?.output === 'string' && agentBook.body.output.includes('booked'),
    (agentBook.body?.output || '').slice(0, 80)
  );
  const apptsAfterAgent = await req('GET', '/api/appointments', undefined, patient.token);
  check(
    'agent booking appears in schedule',
    apptsAfterAgent.status === 200 && Array.isArray(apptsAfterAgent.body) && apptsAfterAgent.body.some((a: any) => a.scheduled_for === '2026-12-21T09:30' && a.kind === 'headache review')
  );

  const agentBookVague = await req('POST', '/api/agent/chat', { message: 'Can you book me an appointment?' }, patient.token);
  check(
    'agent asks for details when booking is vague',
    agentBookVague.status === 200 && typeof agentBookVague.body?.output === 'string' && agentBookVague.body.output.includes('Tell me the clinician')
  );

  const agentBookStaff = await req('POST', '/api/agent/chat', { message: 'Book an appointment with Dr. Sarah Chen on 2026-12-21 at 09:30' }, doctor.token);
  check(
    'agent refuses to book for staff',
    agentBookStaff.status === 200 && typeof agentBookStaff.body?.output === 'string' && agentBookStaff.body.output.includes('Only patients')
  );

  const report = await req('GET', '/api/reports/1', undefined, doctor.token);
  check(
    'doctor generates patient report',
    report.status === 200 && report.body?.patient?.full_name === 'Amelia Hart' && Array.isArray(report.body?.prescriptions)
  );

  const profile = await req('PATCH', '/api/me', { full_name: 'Amelia Hart Renamed' }, patient.token);
  check('profile name update', profile.status === 200 && profile.body?.full_name === 'Amelia Hart Renamed');
  const profileFields = await req(
    'PATCH',
    '/api/me',
    { full_name: 'Amelia Hart', phone: '+1-555-0142', date_of_birth: '1988-04-12', gender: 'female', address: '14 Meadow Lane, Springford' },
    patient.token
  );
  check(
    'profile fields update',
    profileFields.status === 200 && profileFields.body?.phone === '+1-555-0142' && profileFields.body?.date_of_birth === '1988-04-12' && profileFields.body?.address === '14 Meadow Lane, Springford'
  );
  const doctorProfile = await req('PATCH', '/api/me', { specialization: 'Family Medicine' }, doctor.token);
  check('doctor can edit specialization', doctorProfile.status === 200 && doctorProfile.body?.specialization === 'Family Medicine');
  const patientSpec = await req('PATCH', '/api/me', { specialization: 'Cardiology', phone: '+1-555-0142' }, patient.token);
  check('patient cannot edit specialization', patientSpec.status === 200 && patientSpec.body?.specialization === null);

  // --- password reset --------------------------------------------------------

  const forgot = await req('POST', '/api/auth/forgot-password', { email: 'patient.alpha@example.test' });
  const forgotUnknown = await req('POST', '/api/auth/forgot-password', { email: 'nobody@example.test' });
  check(
    'forgot password returns a generic response',
    forgot.status === 200 && forgotUnknown.status === 200 && JSON.stringify(forgot.body) === JSON.stringify(forgotUnknown.body)
  );
  const badReset = await req('POST', '/api/auth/reset-password', { token: 'deadbeef', password: 'x' });
  check('invalid reset token rejected', badReset.status === 400, `HTTP ${badReset.status}`);
  const missingReset = await req('POST', '/api/auth/reset-password', { password: 'x' });
  check('reset requires token', missingReset.status === 400, `HTTP ${missingReset.status}`);

  // --- auth edge cases ------------------------------------------------------

  const badLogin = await req('POST', '/api/auth/login', { email: 'patient.alpha@example.test', password: 'wrong' });
  check('wrong password rejected', badLogin.status === 401);
  const noToken = await req('GET', '/api/me');
  check('missing token rejected', noToken.status === 401);

  console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('verify error:', e.message);
  process.exit(1);
});

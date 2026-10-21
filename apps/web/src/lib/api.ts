export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  phone?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  address?: string | null;
  specialization?: string | null;
  license_number?: string | null;
  created_at?: string;
}

export interface Prescription {
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
  patient_name?: string | null;
  prescriber_name?: string | null;
}

export interface LabResult {
  id: number;
  patient_id: number;
  panel: string;
  value: string;
  interpretation: string | null;
  image_path: string | null;
  recorded_by?: number | null;
  recorded_by_name?: string | null;
  created_at: string;
  patient_name?: string | null;
}

export interface Appointment {
  id: number;
  patient_id: number;
  clinician_id: number | null;
  clinician_name?: string | null;
  patient_name?: string | null;
  scheduled_for: string;
  kind: string;
  modality: string;
  status: string;
  visit_type?: string | null;
  symptoms?: string | null;
  current_medications?: string | null;
  notes: string | null;
  outcome: string | null;
  patient_feedback: string | null;
  rating?: number | null;
}

export interface Message {
  id: number;
  from_user_id: number;
  to_user_id: number;
  from_name?: string;
  to_name?: string;
  body: string;
  attachment_path?: string | null;
  created_at: string;
}

export interface PatientPanelUser {
  id: number;
  full_name: string;
  email: string;
  phone?: string | null;
  active_rx: number;
}

export interface JobApplication {
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

export interface JobApplicationResult {
  id: number;
  status: string;
  reference: string;
}

export interface LoginResponse {
  token: string;
  user: { id: number; full_name: string; role: string };
}

export interface Doctor {
  id: number;
  full_name: string;
  email: string;
}

export interface Clinician extends Doctor {
  role: string;
  specialization?: string | null;
  avg_rating?: number | null;
  review_count?: number;
}

export interface Conversation {
  user_id: number;
  name: string;
  role: string;
  last_body: string;
  last_at: string;
  unread: number;
}

export interface ThreadResponse {
  counterpart: User;
  messages: Message[];
}

export interface AdminStats {
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

export interface ReportData {
  patient: User;
  prescriptions: Prescription[];
  lab_results: LabResult[];
  appointments: Appointment[];
}

export interface ChatHistoryEntry {
  id: number;
  user_id: number;
  message: string;
  response: string;
  created_at: string;
}

export interface ApiErrorBody {
  error?: string;
}

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T & ApiErrorBody;
}

const TOKEN_KEY = 'zh_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export async function api<T>(
  path: string,
  opts: { method?: string; body?: unknown } = {}
): Promise<ApiResult<T>> {
  const token = getToken();
  try {
    const res = await fetch('/api' + path, {
      method: opts.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
    const data = await res.json().catch(() => ({}) as T & ApiErrorBody);
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: 'network error, is the API running?' } as T & ApiErrorBody };
  }
}

// FormData variant for multipart requests (e.g. lab result image uploads).
// The Content-Type is set by the browser so the multipart boundary is correct.
export async function apiForm<T>(path: string, form: FormData): Promise<ApiResult<T>> {
  const token = getToken();
  try {
    const res = await fetch('/api' + path, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: form,
    });
    const data = await res.json().catch(() => ({}) as T & ApiErrorBody);
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: 'network error, is the API running?' } as T & ApiErrorBody };
  }
}

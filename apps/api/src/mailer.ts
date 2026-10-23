/*
 * Email support, via the Resend HTTP API (https://resend.com):
 *
 *   MAIL_API_KEY            Resend API key. With no key, email falls back to
 *                           printing to the API log so flows stay testable.
 *   MAIL_API_URL            optional endpoint override (defaults to the real API)
 *   MAIL_FROM               default "Zero Health <no-reply@zero-health.local>";
 *                           in Resend this must be a verified sender/domain
 *   WEB_BASE_URL            used for links in emails, default http://127.0.0.1:3000
 */


const MAIL_FROM = process.env.MAIL_FROM || 'Zero Health <no-reply@zero-health.local>';
const MAIL_API_KEY = process.env.MAIL_API_KEY || '';
const MAIL_API_URL = process.env.MAIL_API_URL || 'https://api.resend.com/emails';

export const WEB_BASE_URL = process.env.WEB_BASE_URL || 'http://127.0.0.1:3000';

export function mailerConfigured(): boolean {
  return Boolean(MAIL_API_KEY);
}

export async function sendMail(to: string, subject: string, text: string): Promise<void> {
  if (!MAIL_API_KEY) {
    const indented = text.split('\n').map((l) => (l ? `[mail] ${l}` : '[mail]')).join('\n');
    console.log(`\n[mail] to=${to} subject="${subject}"\n${indented}\n`);
    return;
  }

  try {
    const res = await fetch(MAIL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MAIL_API_KEY}`,
      },
      body: JSON.stringify({ from: MAIL_FROM, to, subject, text }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.warn(`[mail] resend returned HTTP ${res.status}: ${detail.slice(0, 200)}`);
    }
  } catch (e) {
    console.warn('[mail] delivery failed:', (e as Error).message);
  }
}

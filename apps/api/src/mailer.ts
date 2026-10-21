/*
 * Email support. With SMTP configured, mail is delivered for real; without
 * SMTP, every message is printed to the API console so the flows stay
 * demonstrable offline.
 *
 *   SMTP_HOST   e.g. localhost
 *   SMTP_PORT   25, 465 (implicit TLS), or 587 (STARTTLS), default 587
 *   SMTP_USER   optional
 *   SMTP_PASS   optional
 *   MAIL_FROM   default "Zero Health <no-reply@zero-health.local>"
 *   WEB_BASE_URL  used for links in emails, default http://127.0.0.1:3000
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const MAIL_FROM = process.env.MAIL_FROM || 'Zero Health <no-reply@zero-health.local>';

export const WEB_BASE_URL = process.env.WEB_BASE_URL || 'http://127.0.0.1:3000';

let transporter: Transporter | null = null;
if (SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    ...(SMTP_USER ? { auth: { user: SMTP_USER, pass: SMTP_PASS } } : {}),
  });
}

export function mailerConfigured(): boolean {
  return transporter !== null;
}

export async function sendMail(to: string, subject: string, text: string): Promise<void> {
  if (!transporter) {
    const indented = text.split('\n').map((l) => (l ? `[mail] ${l}` : '[mail]')).join('\n');
    console.log(`\n[mail] to=${to} subject="${subject}"\n${indented}\n`);
    return;
  }
  try {
    await transporter.sendMail({ from: MAIL_FROM, to, subject, text });
  } catch (e) {
    console.warn('[mail] delivery failed:', (e as Error).message);
  }
}

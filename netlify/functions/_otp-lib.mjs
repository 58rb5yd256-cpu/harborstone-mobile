// Shared helpers for the Westmark Mobile OTP endpoints (Netlify Functions v2, Node runtime).
// Ported from the Vercel api/auth/_lib.js — same crypto, same email providers (Resend + SMTP).
import crypto from 'node:crypto';

// JSON Response helper for Netlify v2 (Web Response) functions.
export function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

export function secret() {
  const s = process.env.HM_OTP_SECRET;
  if (!s || s.length < 24) throw new Error('HM_OTP_SECRET is missing or shorter than 24 characters');
  return s;
}
const key = () => crypto.createHash('sha256').update('hm-seal:' + secret()).digest();
const hmac = (v) => crypto.createHmac('sha256', secret()).update(v).digest('hex');

export function seal(payload) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(JSON.stringify(payload), 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64url')).join('.');
}
export function unseal(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('bad token');
  const [iv, tag, enc] = parts.map((p) => Buffer.from(p, 'base64url'));
  const d = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  d.setAuthTag(tag);
  return JSON.parse(Buffer.concat([d.update(enc), d.final()]).toString('utf8'));
}
export const codeHash = (code, nonce) => hmac('otp:' + nonce + ':' + code);
export function safeEqual(a, b) {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}
export const maskEmail = (email) => {
  const [l, d] = String(email).split('@');
  if (!l || !d) return 'your email';
  return l.slice(0, 2) + '•'.repeat(Math.max(2, l.length - 2)) + '@' + d;
};

// Development-only code reveal. Off whenever running as a production deploy.
export const devOtpAllowed = () => process.env.HM_DEV_OTP === 'true' && process.env.CONTEXT !== 'production' && process.env.NODE_ENV !== 'production';

export function emailTemplate(code) {
  const text = `Your Westmark Bank verification code is ${code}. It expires in 5 minutes. If you did not request it, ignore this email.`;
  const html = `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:480px;margin:auto;border:1px solid #F0E3DB;border-radius:16px;overflow:hidden"><div style="background:linear-gradient(135deg,#7C1606,#F4601B);color:#fff;padding:22px 24px"><div style="font-size:22px;font-weight:700;letter-spacing:.02em">Westmark Bank</div><div style="color:#FFE3D0;font-size:13px;margin-top:2px">Your finances. Your direction.</div></div><div style="padding:24px;color:#1A1210"><p style="margin:0 0 14px">Your verification code is:</p><div style="font-size:34px;font-weight:700;letter-spacing:10px;text-align:center;background:#FCF1EB;border-radius:12px;padding:16px;color:#C62A0E">${code}</div><p style="color:#8A7F7B;font-size:14px;margin:16px 0 0">This code expires in 5 minutes. If you didn’t request it, you can ignore this email.</p></div><div style="background:#FBF6F3;color:#8A7F7B;font-size:12px;padding:14px 24px">Westmark Bank · 100 Harbor Way, Seattle, WA</div></div>`;
  return { subject: 'Your Westmark Bank verification code', text, html };
}

// Provider order: Resend (HTTPS API) → SMTP (nodemailer). `smtp` carries the matched
// identity's own sender (user/pass/fromName/fromAddress); host/port/secure fall back to
// the shared SMTP_* env. Returns the provider used, or null if neither is configured.
export async function sendEmail(to, code, smtp = null) {
  const { subject, text, html } = emailTemplate(code);
  if (process.env.RESEND_API_KEY) {
    const from = process.env.HM_FROM_EMAIL;
    if (!from) throw new Error('HM_FROM_EMAIL is required with RESEND_API_KEY');
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, text, html })
    });
    if (!r.ok) throw new Error('Resend rejected the request: HTTP ' + r.status + ' ' + (await r.text()).slice(0, 300));
    return 'resend';
  }
  const user = (smtp && smtp.user) || process.env.SMTP_USER;
  const pass = (smtp && smtp.pass) || process.env.SMTP_PASSWORD;
  if (user && pass) {
    const nodemailer = (await import('nodemailer')).default;
    const port = Number(process.env.SMTP_PORT || 465);
    const secure = String(process.env.SMTP_SECURE ?? (port === 465)) === 'true';
    const t = nodemailer.createTransport({ host: process.env.SMTP_HOST || 'smtp.gmail.com', port, secure, auth: { user, pass } });
    const fromName = (smtp && smtp.fromName) || process.env.HM_FROM_NAME || 'Westmark Bank';
    const fromAddress = (smtp && smtp.fromAddress) || process.env.HM_FROM_ADDRESS || user;
    await t.sendMail({ from: { name: fromName, address: fromAddress }, to, subject, text, html });
    return 'smtp';
  }
  return null;
}

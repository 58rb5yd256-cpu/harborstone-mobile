// Shared helpers for the Harborstone Mobile OTP endpoints (Vercel serverless, Node runtime).
// Nothing here reads or reuses any Prosperity Mobile variable: every setting is HM_* / RESEND_* / SMTP_*.
import crypto from 'node:crypto';

export function reply(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch { return {}; }
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

// Development-only mode: never allowed when Vercel says this is a production deployment.
export const devOtpAllowed = () => process.env.HM_DEV_OTP === 'true' && process.env.VERCEL_ENV !== 'production' && process.env.NODE_ENV !== 'production';

export function emailTemplate(code) {
  const text = `Your Harborstone Bank verification code is ${code}. It expires in 5 minutes. If you did not request it, ignore this email.`;
  const html = `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:480px;margin:auto;border:1px solid #E6E2DA;border-radius:16px;overflow:hidden"><div style="background:#0A3340;color:#fff;padding:22px 24px"><div style="font-size:22px;font-weight:700;letter-spacing:.02em">Harborstone Bank</div><div style="color:#E4CE9D;font-size:13px;margin-top:2px">Your finances. Your direction.</div></div><div style="padding:24px;color:#14232A"><p style="margin:0 0 14px">Your verification code is:</p><div style="font-size:34px;font-weight:700;letter-spacing:10px;text-align:center;background:#F4F2EE;border-radius:12px;padding:16px">${code}</div><p style="color:#66747D;font-size:14px;margin:16px 0 0">This code expires in 5 minutes. If you didn’t request it, you can ignore this email.</p></div><div style="background:#F8F6F2;color:#66747D;font-size:12px;padding:14px 24px">Harborstone Bank · 100 Harbor Way, Seattle, WA</div></div>`;
  return { subject: 'Your Harborstone Bank verification code', text, html };
}

// Provider order: Resend (HTTPS API) → SMTP (nodemailer). Returns the provider used, or null if neither is configured.
export async function sendEmail(to, code) {
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
  if (process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    const nodemailer = (await import('nodemailer')).default;
    const port = Number(process.env.SMTP_PORT || 465);
    const t = nodemailer.createTransport({ host: process.env.SMTP_HOST || 'smtp.gmail.com', port, secure: String(process.env.SMTP_SECURE ?? (port === 465)) === 'true', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } });
    await t.sendMail({ from: { name: process.env.HM_FROM_NAME || 'Harborstone Bank', address: process.env.HM_FROM_ADDRESS || process.env.SMTP_USER }, to, subject, text, html });
    return 'smtp';
  }
  return null;
}

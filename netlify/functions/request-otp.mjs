import crypto from 'node:crypto';
import { json, seal, codeHash, safeEqual, maskEmail, sendEmail, devOtpAllowed, secret } from './_otp-lib.mjs';

// POST /api/auth/request-otp  { email, password }
// Checks the sign-in identities held in environment variables, then emails a 6-digit code.
export const config = { path: '/api/auth/request-otp' };

export default async (req) => {
  if (req.method !== 'POST') return json(405, { message: 'Method not allowed' });
  try {
    let body = {};
    try { body = await req.json(); } catch { body = {}; }
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!email || !password) return json(400, { message: 'Enter your email and password.' });

    // One or two sign-in identities. The second (HM_LOGIN_EMAIL_2 / HM_LOGIN_PASSWORD_2) lets the
    // owner sign in with a different email + password so the code is sent to a different inbox
    // (HM_OTP_TO_2, or the second login email if that is not set).
    const identities = [];
    const addIdentity = (e, p, to, smtp) => {
      const em = (e || '').trim().toLowerCase();
      const pw = p || '';
      if (em && pw) identities.push({ email: em, pass: pw, to: ((to || e) || '').trim(), smtp });
    };
    addIdentity(process.env.HM_LOGIN_EMAIL, process.env.HM_LOGIN_PASSWORD, process.env.HM_OTP_TO,
      { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD, fromName: process.env.HM_FROM_NAME, fromAddress: process.env.HM_FROM_ADDRESS });
    // Login 2 sends through the primary (verified) mailbox to its own inbox (HM_OTP_TO_2),
    // unless a dedicated, valid sender is explicitly configured for it.
    const _s2user = process.env.SMTP_USER_2 && process.env.SMTP_PASSWORD_2 ? process.env.SMTP_USER_2 : process.env.SMTP_USER;
    const _s2pass = process.env.SMTP_USER_2 && process.env.SMTP_PASSWORD_2 ? process.env.SMTP_PASSWORD_2 : process.env.SMTP_PASSWORD;
    const _s2from = process.env.SMTP_USER_2 && process.env.SMTP_PASSWORD_2 ? (process.env.HM_FROM_ADDRESS_2 || process.env.SMTP_USER_2) : process.env.HM_FROM_ADDRESS;
    addIdentity(process.env.HM_LOGIN_EMAIL_2, process.env.HM_LOGIN_PASSWORD_2, process.env.HM_OTP_TO_2,
      { user: _s2user, pass: _s2pass, fromName: process.env.HM_FROM_NAME_2 || process.env.HM_FROM_NAME, fromAddress: _s2from });

    if (!identities.length) return json(503, { message: 'Sign-in is not configured yet. Set HM_LOGIN_EMAIL and HM_LOGIN_PASSWORD.' });
    try { secret(); } catch { return json(503, { message: 'Sign-in is not configured yet. Set HM_OTP_SECRET (24+ characters).' }); }

    let matched = null;
    for (const id of identities) {
      if (safeEqual(email, id.email) && safeEqual(password, id.pass)) { matched = id; break; }
    }
    if (!matched) return json(401, { message: 'Incorrect email or password.' });

    const to = matched.to;
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const nonce = crypto.randomBytes(12).toString('hex');
    const requestId = seal({ e: email, h: codeHash(code, nonce), n: nonce, exp: Date.now() + 5 * 60 * 1000 });

    let provider = null;
    try { provider = await sendEmail(to, code, matched.smtp); }
    catch (err) {
      console.error('request-otp: email send failed:', err && err.message);
      if (!devOtpAllowed()) return json(502, { message: 'The verification email could not be sent. Please try again shortly.' });
    }
    if (provider) return json(200, { ok: true, requestId, email: maskEmail(to), expiresIn: 300, delivery: 'email' });

    if (devOtpAllowed()) return json(200, { ok: true, requestId, email: maskEmail(to), expiresIn: 300, delivery: 'dev', devCode: code });
    return json(503, { message: 'Email delivery is not configured. Add RESEND_API_KEY + HM_FROM_EMAIL (or SMTP settings).' });
  } catch (err) {
    console.error('request-otp error:', err && err.message);
    return json(500, { message: 'Could not start verification. Please try again.' });
  }
};

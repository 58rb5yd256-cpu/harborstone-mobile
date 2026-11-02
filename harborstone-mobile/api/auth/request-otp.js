import crypto from 'node:crypto';
import { reply, readBody, seal, codeHash, safeEqual, maskEmail, sendEmail, devOtpAllowed, secret } from './_lib.js';

// POST /api/auth/request-otp  { email, password }
// Checks the demo credentials held in Vercel environment variables, then emails a 6-digit code.
export default async function handler(req, res) {
  if (req.method !== 'POST') return reply(res, 405, { message: 'Method not allowed' });
  try {
    const body = readBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!email || !password) return reply(res, 400, { message: 'Enter your email and password.' });

    const wantEmail = (process.env.HM_LOGIN_EMAIL || '').trim().toLowerCase();
    const wantPass = process.env.HM_LOGIN_PASSWORD || '';
    if (!wantEmail || !wantPass) return reply(res, 503, { message: 'Sign-in is not configured yet. Set HM_LOGIN_EMAIL and HM_LOGIN_PASSWORD in Vercel.' });
    try { secret(); } catch { return reply(res, 503, { message: 'Sign-in is not configured yet. Set HM_OTP_SECRET (24+ characters) in Vercel.' }); }

    const okEmail = safeEqual(email, wantEmail);
    const okPass = safeEqual(password, wantPass);
    if (!(okEmail && okPass)) return reply(res, 401, { message: 'Incorrect email or password.' });

    const to = (process.env.HM_OTP_TO || wantEmail).trim();
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const nonce = crypto.randomBytes(12).toString('hex');
    const requestId = seal({ e: email, h: codeHash(code, nonce), n: nonce, exp: Date.now() + 5 * 60 * 1000 });

    let provider = null;
    try { provider = await sendEmail(to, code); }
    catch (err) {
      console.error('request-otp: email send failed:', err && err.message);
      if (!devOtpAllowed()) return reply(res, 502, { message: 'The verification email could not be sent. Please try again shortly.' });
    }
    if (provider) return reply(res, 200, { ok: true, requestId, email: maskEmail(to), expiresIn: 300, delivery: 'email' });

    // No email provider worked/configured.
    if (devOtpAllowed()) return reply(res, 200, { ok: true, requestId, email: maskEmail(to), expiresIn: 300, delivery: 'dev', devCode: code });
    return reply(res, 503, { message: 'Email delivery is not configured. Add RESEND_API_KEY + HM_FROM_EMAIL (or SMTP settings) in Vercel.' });
  } catch (err) {
    console.error('request-otp error:', err && err.message);
    return reply(res, 500, { message: 'Could not start verification. Please try again.' });
  }
}

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

    // One or more sign-in identities. The first is the original (submitted) login and is
    // unchanged. An optional second identity (HM_LOGIN_EMAIL_2 / HM_LOGIN_PASSWORD_2) lets the
    // owner sign in with a different email + password so the code is sent to a different inbox
    // (HM_OTP_TO_2, or the second login email if that is not set). If the second identity is not
    // configured, behaviour is exactly as before.
    const identities = [];
    const addIdentity = (e, p, to) => {
      const em = (e || '').trim().toLowerCase();
      const pw = p || '';
      if (em && pw) identities.push({ email: em, pass: pw, to: ((to || e) || '').trim() });
    };
    addIdentity(process.env.HM_LOGIN_EMAIL, process.env.HM_LOGIN_PASSWORD, process.env.HM_OTP_TO);
    addIdentity(process.env.HM_LOGIN_EMAIL_2, process.env.HM_LOGIN_PASSWORD_2, process.env.HM_OTP_TO_2);

    if (!identities.length) return reply(res, 503, { message: 'Sign-in is not configured yet. Set HM_LOGIN_EMAIL and HM_LOGIN_PASSWORD in Vercel.' });
    try { secret(); } catch { return reply(res, 503, { message: 'Sign-in is not configured yet. Set HM_OTP_SECRET (24+ characters) in Vercel.' }); }

    let matched = null;
    for (const id of identities) {
      if (safeEqual(email, id.email) && safeEqual(password, id.pass)) { matched = id; break; }
    }
    if (!matched) return reply(res, 401, { message: 'Incorrect email or password.' });

    const to = matched.to;
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

import { json, unseal, codeHash, safeEqual } from './_otp-lib.mjs';

// POST /api/auth/verify-otp  { email, code, requestId }
export const config = { path: '/api/auth/verify-otp' };

export default async (req) => {
  if (req.method !== 'POST') return json(405, { message: 'Method not allowed' });
  try {
    let body = {};
    try { body = await req.json(); } catch { body = {}; }
    const email = String(body.email || '').trim().toLowerCase();
    const code = String(body.code || '').trim();
    const requestId = String(body.requestId || '');
    if (!/^[0-9]{6}$/.test(code)) return json(400, { message: 'Enter the 6-digit verification code.' });
    if (!requestId) return json(400, { message: 'Your verification request is missing. Sign in again to get a new code.' });

    let p;
    try { p = unseal(requestId); } catch { return json(400, { message: 'This verification request is not valid. Sign in again to get a new code.' }); }
    if (!p || p.e !== email) return json(400, { message: 'This code belongs to a different sign-in. Please sign in again.' });
    if (!Number.isFinite(p.exp) || Date.now() > p.exp) return json(400, { message: 'This code has expired. Request a new code.' });
    if (!safeEqual(codeHash(code, p.n), p.h)) return json(401, { message: 'That verification code is incorrect. Check the newest message and try again.' });
    return json(200, { ok: true, verified: true, message: 'Email verified successfully.' });
  } catch (err) {
    console.error('verify-otp error:', err && err.message);
    return json(400, { message: 'Verification failed. Please sign in again and request a new code.' });
  }
};

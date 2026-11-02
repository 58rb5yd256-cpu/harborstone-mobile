/* Harborstone Mobile — login, email OTP, registration demo, forgot password, sign-out, idle session */
(function () {
  'use strict';
  const HM = window.HM, ui = HM.ui, esc = HM.esc, icon = HM.icon;
  const PKEY = 'hm_pending', RKEY = 'hm_remember';
  const isLocal = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  let creds = null;          // password kept in memory only (never stored) so "Resend code" works
  let timers = [];
  const clearTimers = () => { timers.forEach(clearInterval); timers = []; };
  const getPending = () => { try { return JSON.parse(sessionStorage.getItem(PKEY) || 'null'); } catch (e) { return null; } };
  const setPending = (o) => { try { sessionStorage.setItem(PKEY, JSON.stringify(o)); } catch (e) { HM._pend = o; } };
  const clearPending = () => { try { sessionStorage.removeItem(PKEY); } catch (e) { /* ignore */ } HM._pend = null; };
  const remembered = () => { try { return JSON.parse(localStorage.getItem(RKEY) || 'null'); } catch (e) { return null; } };
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const notice = () => { try { const n = sessionStorage.getItem('hm_notice'); sessionStorage.removeItem('hm_notice'); return n; } catch (e) { return null; } };

  const authShell = (inner, o) => `<div class="auth-wrap"><div class="auth-hero">${ui.logo(60)}<h1>Harborstone</h1><span class="auth-app">MOBILE BANKING</span><p>${HM.BANK.tagline}</p></div><div class="auth-card">${inner}</div><p class="footnote">${o && o.foot ? o.foot : 'Harborstone Bank is a <b>fictional bank</b> created for an educational project. No real money, accounts or customer data are used.'}</p></div>`;

  /* ---------- API with local-only development fallback ---------- */
  async function api(path, body) {
    let res;
    try { res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
    catch (e) { return { status: 0, data: null }; }
    let data = null; try { data = await res.json(); } catch (e) { /* not json (e.g. static host 404) */ }
    return { status: res.status, data };
  }
  async function requestOtp(email, password) {
    const r = await api('/api/auth/request-otp', { email, password });
    if (r.data && (r.data.ok || r.status > 0 && r.status !== 404)) return r;
    return { status: 0, data: { message: isLocal
      ? 'The secure sign-in service is not running. Start the project with Vercel Dev and configure its private environment variables.'
      : 'Could not reach the secure sign-in service. Check your connection and try again.' } };
  }
  async function verifyOtp(email, code, requestId) {
    const r = await api('/api/auth/verify-otp', { email, code, requestId });
    if (!r.data) return { status: 0, data: { message: 'Could not reach the verification service. Try again.' } };
    return r;
  }
  const maskEmail = (e) => { const [l, d] = String(e).split('@'); return (l || '').slice(0, 2) + '•'.repeat(Math.max(2, (l || '').length - 2)) + '@' + (d || ''); };

  /* ---------- login ---------- */
  HM.route('/login', 'auth', () => {
    clearTimers(); const rem = remembered(); const n = notice();
    return {
      title: 'Sign in',
      html: authShell(`
        <div class="login-security">${icon('shield', 17)} <span>Secure online banking</span><span class="security-dot"></span><span>Protected sign-in</span></div>
        <h2>Welcome back</h2><p class="mute sm login-intro">Sign in to access your Harborstone account.</p>
        ${n ? `<div class="note warn">${icon('info', 18)}<span>${esc(n)}</span></div>` : ''}
        <form data-form="login" novalidate>
          ${ui.field({ name: 'email', label: 'Email address', type: 'email', inputmode: 'email', autocomplete: 'username', value: rem ? rem.email : 'jessicabrownn088@gmail.com', placeholder: 'Email address' })}
          <div class="fld" data-fld="password"><label for="f_password">Password</label><div class="pw"><input id="f_password" name="password" type="password" autocomplete="current-password" placeholder="Enter your password" required><button type="button" class="pwt" data-act="togglePw" aria-label="Show password">${icon('eye', 20)}</button></div><p class="ferr" role="alert"></p></div>
          <div class="opts"><label class="chk"><input type="checkbox" name="remember" ${rem ? 'checked' : ''}><span></span>Remember this device</label><button type="button" class="lnk" data-go="/forgot">Forgot password?</button></div>
          <button class="btn btn-primary login-submit" type="submit" data-busy="Signing in…">Sign In <span aria-hidden="true">${icon('chevR', 18)}</span></button>
        </form>
        <div class="login-divider"><span>New to Harborstone?</span></div>
        <button class="btn btn-ghost login-enroll" data-go="/register">Open an account</button>
        <button class="login-help" data-go="/login-help">Need help signing in?</button>
        <div class="login-assurance">${icon('lock', 16)} <span>Your sign-in is protected with email verification.</span></div>`)

    };
  }, { pub: true });
  HM.acts.togglePw = (b) => { const i = b.parentElement.querySelector('input'); const show = i.type === 'password'; i.type = show ? 'text' : 'password'; b.innerHTML = icon(show ? 'eyeoff' : 'eye', 20); b.setAttribute('aria-label', show ? 'Hide password' : 'Show password'); };
  HM.forms.login = async (f, d, btn) => {
    const email = d.email.trim().toLowerCase();
    if (!email) return ui.fail(f, 'Enter your email address.', 'email');
    if (!EMAIL_RE.test(email)) return ui.fail(f, 'Enter a valid email address, like name@example.com.', 'email');
    if (!d.password) return ui.fail(f, 'Enter your password.', 'password');
    ui.busy(btn, true, 'Signing in…');
    const r = await requestOtp(email, d.password);
    ui.busy(btn, false);
    if (!r.data || !r.data.ok) return ui.fail(f, (r.data && r.data.message) || 'Sign-in failed. Try again.');
    creds = { email, password: d.password, remember: !!d.remember };
    setPending({ email, requestId: r.data.requestId, masked: r.data.email, expiresAt: Date.now() + (r.data.expiresIn || 300) * 1000, devCode: r.data.devCode || null, delivery: r.data.delivery || 'email', sentAt: Date.now(), attempts: 0, remember: !!d.remember });
    HM.go('/otp');
  };

  /* ---------- OTP ---------- */
  HM.route('/otp', 'auth', () => {
    clearTimers(); const p = getPending() || HM._pend; if (!p) { HM.go('/login', { replace: true }); return { html: '' }; }
    return {
      title: 'Verify',
      html: authShell(`
        <button class="back-lnk" data-act="otpBack">${icon('chevL', 18)} Back to sign in</button>
        <h2>Verify your email</h2>
        <p class="mute sm">${p.delivery === 'email' ? `We sent a 6-digit code to <b>${esc(p.masked)}</b>.` : 'Enter the 6-digit code below.'}</p>
        ${p.devCode ? `<div class="note warn dev">${icon('alert', 18)}<span><b>DEVELOPMENT-ONLY OTP MODE.</b> Email delivery is not configured${p.delivery === 'local-simulation' ? ' (local simulation)' : ''}. Your test code is <b class="devcode">${esc(p.devCode)}</b>. This is never shown in production.</span></div>` : ''}
        <form data-form="otp" novalidate>
          <div class="otp" id="otpBoxes" role="group" aria-label="6-digit verification code">${[0, 1, 2, 3, 4, 5].map((i) => `<input inputmode="numeric" pattern="[0-9]*" maxlength="1" autocomplete="${i === 0 ? 'one-time-code' : 'off'}" aria-label="Digit ${i + 1}" data-i="${i}">`).join('')}</div>
          <p class="ferr center otp-err" id="otpErr" role="alert"></p>
          <p class="center sm mute" id="otpTimer">Code expires in <b>5:00</b></p>
          <button class="btn btn-primary mt" type="submit">Verify and continue</button>
        </form>
        <button class="btn btn-ghost mt" id="resendBtn" data-act="resendOtp" disabled>Resend code</button>`),
      after() {
        const boxes = Array.from(document.querySelectorAll('#otpBoxes input')); boxes[0].focus();
        const val = () => boxes.map((b) => b.value).join('');
        boxes.forEach((b, i) => {
          b.addEventListener('input', () => { b.value = b.value.replace(/\D/g, '').slice(-1); if (b.value && boxes[i + 1]) boxes[i + 1].focus(); document.getElementById('otpErr').textContent = ''; boxes.forEach((x) => x.classList.remove('bad')); if (val().length === 6) document.querySelector('form[data-form=otp]').requestSubmit(); });
          b.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !b.value && boxes[i - 1]) { boxes[i - 1].focus(); boxes[i - 1].value = ''; } if (e.key === 'ArrowLeft' && boxes[i - 1]) boxes[i - 1].focus(); if (e.key === 'ArrowRight' && boxes[i + 1]) boxes[i + 1].focus(); });
          b.addEventListener('paste', (e) => { const t = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6); if (!t) return; e.preventDefault(); t.split('').forEach((c, k) => { if (boxes[k]) boxes[k].value = c; }); (boxes[Math.min(t.length, 5)]).focus(); if (t.length === 6) document.querySelector('form[data-form=otp]').requestSubmit(); });
        });
        const tick = () => {
          const el = document.getElementById('otpTimer'), rb = document.getElementById('resendBtn'); if (!el) return clearTimers();
          const pp = getPending() || HM._pend; if (!pp) return;
          const left = Math.max(0, Math.round((pp.expiresAt - Date.now()) / 1000)); el.innerHTML = left > 0 ? `Code expires in <b>${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</b>` : '<b style="color:var(--bad)">This code has expired.</b> Request a new one.';
          const cd = Math.max(0, 30 - Math.floor((Date.now() - pp.sentAt) / 1000));
          rb.disabled = cd > 0; rb.textContent = cd > 0 ? `Resend code in ${cd}s` : 'Resend code';
        };
        tick(); timers.push(setInterval(tick, 1000));
      }
    };
  }, { pub: true });
  HM.acts.otpBack = () => { clearPending(); creds = null; HM.go('/login'); };
  HM.acts.resendOtp = async (btn) => {
    const p = getPending() || HM._pend; if (!p) return HM.go('/login');
    if (!creds) { ui.toast('For security, go back and sign in again to request a new code.', 'err'); return; }
    ui.busy(btn, true); const r = await requestOtp(creds.email, creds.password); ui.busy(btn, false);
    if (!r.data || !r.data.ok) return ui.toast((r.data && r.data.message) || 'Could not resend the code.', 'err');
    setPending(Object.assign(p, { requestId: r.data.requestId, expiresAt: Date.now() + (r.data.expiresIn || 300) * 1000, sentAt: Date.now(), devCode: r.data.devCode || null, attempts: 0 }));
    HM.refresh(false); ui.toast('A new code was sent.');
  };
  HM.forms.otp = async (f, d, btn) => {
    const p = getPending() || HM._pend; if (!p) return HM.go('/login');
    const code = Array.from(f.querySelectorAll('#otpBoxes input')).map((b) => b.value).join(''); const err = document.getElementById('otpErr');
    const bad = (m) => { err.textContent = m; f.querySelectorAll('#otpBoxes input').forEach((b) => b.classList.add('bad')); f.querySelector('#otpBoxes').classList.remove('shake'); void f.offsetWidth; f.querySelector('#otpBoxes').classList.add('shake'); };
    if (code.length < 6) return bad('Enter all 6 digits of the verification code.');
    if (Date.now() > p.expiresAt) return bad('This code has expired. Tap “Resend code” to get a new one.');
    if (p.attempts >= 5) { clearPending(); sessionStorage.setItem('hm_notice', 'Too many incorrect codes. Please sign in again.'); return HM.go('/login'); }
    ui.busy(btn, true, 'Verifying…'); const r = await verifyOtp(p.email, code, p.requestId); ui.busy(btn, false);
    if (!r.data || !r.data.ok) { p.attempts++; setPending(p); return bad((r.data && r.data.message) || 'That code is incorrect.'); }
    // success
    if (p.remember) { try { localStorage.setItem(RKEY, JSON.stringify({ email: p.email })); } catch (e) { /* ignore */ } } else { try { localStorage.removeItem(RKEY); } catch (e) { /* ignore */ } }
    HM.session.set({ email: p.email, at: Date.now() }); clearPending(); creds = null; clearTimers();
    const S = HM.state(); if (!S.profile.email) S.profile.email = p.email;
    S.security.logins.unshift({ id: HM.uid('l'), date: new Date().toISOString(), device: 'This device', loc: 'Demo location', ok: true });
    S.security.logins.length = Math.min(S.security.logins.length, 25);
    const dv = S.security.devices.find((x) => x.current); if (dv) dv.last = new Date().toISOString();
    if (p.remember && S.security.alerts.newDevice) HM.notify('security', 'This device was remembered', 'This device was marked as trusted for sign-in.');
    HM.save(); HM.touch(); HM.go('/welcome', { replace: true });
  };
  HM.route('/welcome', 'home', () => ({
    title: 'Verified',
    html: authShell(`<div class="center ok-state"><div class="okring">${icon('check', 38)}</div><h2>Verified</h2><p class="mute">Your email was verified successfully. Taking you to your accounts…</p></div>`),
    after() { setTimeout(() => { if (location.hash === '#/welcome') HM.go('/home', { replace: true }); }, 1500); }
  }));

  /* ---------- login assistance ---------- */
  HM.route('/login-help', 'auth', () => ({
    title: 'Sign-in help',
    html: authShell(`<button class="back-lnk" data-go="/login">${icon('chevL', 18)} Back to sign in</button>
      <h2>Sign-in help</h2>
      <p class="mute sm">If you are having trouble accessing your account, try these steps.</p>
      <div class="help-list">
        <div><b>Check your email address</b><p>Use the email address registered for Harborstone online access.</p></div>
        <div><b>Check your password</b><p>Make sure Caps Lock is off. You can use the eye icon to review what you entered.</p></div>
        <div><b>Can't receive a verification code?</b><p>Check your inbox and spam folder. If the message does not arrive, contact the project administrator to check the email delivery configuration.</p></div>
      </div>
      <button class="btn btn-primary mt" data-go="/forgot">Reset password</button>
      <button class="btn btn-ghost mt" data-go="/login">Return to sign in</button>`)
  }), { pub: true });

  /* ---------- register / forgot (demonstration only) ---------- */
  HM.route('/register', 'auth', () => ({
    title: 'Open an account',
    html: authShell(`<button class="back-lnk" data-go="/login">${icon('chevL', 18)} Back to sign in</button><h2>Open an account</h2><p class="mute sm">Demonstration only — no account is created and nothing you type here is sent or stored.</p>
      <form data-form="register" novalidate>
        <div class="two">${ui.field({ name: 'first', label: 'First name', autocomplete: 'given-name' })}${ui.field({ name: 'last', label: 'Last name', autocomplete: 'family-name' })}</div>
        ${ui.field({ name: 'email', label: 'Email address', type: 'email', inputmode: 'email' })}
        ${ui.select({ name: 'type', label: 'Account to open', value: 'checking', options: [['checking', 'Harbor Everyday Checking'], ['savings', 'Harbor High-Yield Savings'], ['both', 'Checking + Savings']] })}
        <div class="fld" data-fld="agree"><label class="chk"><input type="checkbox" name="agree"><span></span>I understand this is an educational demo</label><p class="ferr" role="alert"></p></div>
        <button class="btn btn-primary" type="submit">Submit application</button></form>`)
  }), { pub: true });
  HM.forms.register = (f, d) => {
    if (!ui.need(f, d, [['first', 'Enter your first name.'], ['last', 'Enter your last name.']])) return;
    if (!EMAIL_RE.test(d.email.trim())) return ui.fail(f, 'Enter a valid email address.', 'email');
    if (!d.agree) return ui.fail(f, 'Please confirm you understand this is a demo.', 'agree');
    f.closest('.auth-card').innerHTML = `<div class="center ok-state"><div class="okring">${icon('check', 38)}</div><h2>Application received</h2><p class="mute">Thanks, ${esc(d.first)}. In a live bank we would now verify your identity. Since Harborstone is a demo, no account was created — sign in with the demo credentials instead.</p><button class="btn btn-primary mt2" data-go="/login">Back to sign in</button></div>`;
  };
  HM.route('/forgot', 'auth', () => ({
    title: 'Reset password',
    html: authShell(`<button class="back-lnk" data-go="/login">${icon('chevL', 18)} Back to sign in</button><h2>Forgot password?</h2><p class="mute sm">Enter your email and we’ll explain how reset works in this demo.</p>
      <form data-form="forgot" novalidate>${ui.field({ name: 'email', label: 'Email address', type: 'email', inputmode: 'email' })}<button class="btn btn-primary mt" type="submit">Continue</button></form>`)
  }), { pub: true });
  HM.forms.forgot = (f, d) => {
    if (!EMAIL_RE.test(d.email.trim())) return ui.fail(f, 'Enter a valid email address.', 'email');
    f.closest('.auth-card').innerHTML = `<div class="center ok-state"><div class="okring">${icon('mail', 34)}</div><h2>Check how reset works</h2><p class="mute">In this demo no reset email is sent. The sign-in password is set by the app owner in the Vercel environment variable <b>HM_LOGIN_PASSWORD</b>. Change it there and redeploy.</p><button class="btn btn-primary mt2" data-go="/login">Back to sign in</button></div>`;
  };

  /* ---------- sign out + idle session ---------- */
  HM.signOut = (msg) => { HM.session.clear(); clearPending(); creds = null; clearTimers(); HM.stack = []; if (msg) { try { sessionStorage.setItem('hm_notice', msg); } catch (e) { /* ignore */ } } ui.closeSheet(); HM.go('/login', { replace: true }); };
  HM.acts.signOut = async () => {
    const ok = await ui.confirm({ title: 'Sign out of Harborstone Mobile?', body: 'Your session will end and you will need to sign in and verify with a new email code next time.', ok: 'Sign out', cancel: 'Stay signed in' });
    if (ok) { HM.signOut(); ui.toast('You have been signed out.'); }
  };
  let last = Date.now(), warned = false;
  HM.touch = () => { last = Date.now(); warned = false; };
  setInterval(() => {
    if (!HM.session.active()) return; const S = HM.state(); const limit = (S.security.sessionTimeout || 10) * 60e3; const idle = Date.now() - last;
    if (idle >= limit) return HM.signOut('You were signed out after a period of inactivity to keep your account secure.');
    if (idle >= limit - 30e3 && !warned) { warned = true; ui.sheet(`<h3 class="sh-title">Still there?</h3><p class="sh-body">For your security you will be signed out in 30 seconds.</p><div class="sh-actions"><button class="btn btn-primary" data-act="stay">Stay signed in</button><button class="btn btn-ghost" data-act="signOut">Sign out now</button></div>`); }
  }, 5000);
  HM.acts.stay = () => { HM.touch(); ui.closeSheet(); };
  ['touchstart', 'keydown', 'scroll'].forEach((ev) => document.addEventListener(ev, () => { if (!warned) last = Date.now(); }, { passive: true, capture: true }));
  document.addEventListener('visibilitychange', () => { if (!document.hidden && HM.session.active()) { const S = HM.state(); if (Date.now() - last >= (S.security.sessionTimeout || 10) * 60e3) HM.signOut('You were signed out after a period of inactivity to keep your account secure.'); } });
})();

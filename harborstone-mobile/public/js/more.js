/* Harborstone Mobile — More: profile, security, notifications, support, services, preferences, about, sign out */
(function () {
  'use strict';
  const HM = window.HM, ui = HM.ui, esc = HM.esc, icon = HM.icon, money = HM.money;
  const S = () => HM.state();
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const np = '<span class="np">Not provided</span>';
  const val = (v) => (v ? esc(v) : np);
  const avatar = (cls) => { const p = S().profile; return p.photo ? `<img class="avatar-img ${cls || ''}" src="${p.photo}" alt="Profile photo">` : `<span class="avatar ${cls || ''}">${esc(((p.preferred || p.first || 'S')[0] || 'S').toUpperCase())}</span>`; };
  HM.avatar = avatar;

  /* ---------- landing ---------- */
  HM.route('/more', 'more', () => {
    const p = S().profile; const name = [p.first, p.last].filter(Boolean).join(' ') || 'Customer';
    const g = (title, rows) => ui.section(title, '', `<div class="group">${rows.map((r) => ui.row({ icon: r[0], title: r[1], sub: r[2], go: r[3], act: r[4], tone: r[5] })).join('')}</div>`);
    return {
      title: 'More',
      html: `${ui.header('More', { back: false, sub: 'Profile, security and services' })}
      <div class="pad"><button class="card prof-card" data-go="/more/profile">${avatar('lg')}<span class="row-m"><b>${esc(name)}</b><small>${p.email ? esc(p.email) : 'Add your contact details'}</small></span><span class="row-c">${icon('chevR', 18)}</span></button></div>
      ${g('Profile & security', [['user', 'Customer profile', 'Name, contact & address', '/more/profile'], ['shield', 'Security settings', 'Password, Face ID, devices', '/more/security'], ['bell', 'Notifications', 'Push & email preferences', '/more/notifications']])}
      ${g('Help & support', [['help', 'Customer support', 'Contact, help center, requests', '/more/support'], ['msg', 'Support request history', 'Track your requests', '/more/support/requests']])}
      ${g('Services', [['atm', 'Find an ATM', 'Demo locations', '/more/atm'], ['building', 'Find a branch', 'Demo locations', '/more/branches'], ['file', 'Account documents', 'Agreements & forms', '/accounts/documents'], ['book', 'Privacy policy', '', '/more/privacy'], ['file', 'Terms & conditions', '', '/more/terms'], ['sliders', 'App preferences', 'Display & demo data', '/more/prefs'], ['info', 'About Harborstone Bank', 'Version & disclosures', '/more/about']])}
      <div class="pad mt2"><button class="btn btn-ghost" data-act="signOut">${icon('logout', 20)} Sign out</button></div><p class="footnote">Harborstone Mobile 1.0 · Fictional bank for an educational project</p>`
    };
  });

  /* ---------- profile ---------- */
  HM.route('/more/profile', 'more', () => {
    const p = S().profile, a = p.address; const addr = [a.line1, a.line2, [a.city, a.state].filter(Boolean).join(', '), a.zip].filter(Boolean).join('<br>');
    return {
      title: 'Profile',
      html: `${ui.header('Customer profile', { back: '/more', right: `<button class="iconbtn" data-go="/more/profile/edit" aria-label="Edit profile">${icon('edit', 20)}</button>` })}<div class="pad"><div class="card center">${avatar('xl')}<h2 class="mt">${esc(p.preferred || p.first)}</h2><div class="sm mute">${esc(HM.holder())}</div></div>
      <div class="card mt"><div class="kv"><span>First name</span><b>${val(p.first)}</b></div><div class="kv"><span>Middle name</span><b>${val(p.middle)}</b></div><div class="kv"><span>Last name</span><b>${val(p.last)}</b></div><div class="kv"><span>Preferred name</span><b>${val(p.preferred)}</b></div><div class="kv"><span>Gender</span><b>${val(p.gender)}</b></div><div class="kv"><span>Date of birth</span><b>${p.dob ? HM.fmtDate(HM.parseDay(p.dob)) : np}</b></div></div>
      <div class="card mt"><div class="kv"><span>Email</span><b>${val(p.email)}</b></div><div class="kv"><span>Phone</span><b>${p.phone ? HM.fmtPhone(p.phone) : np}</b></div><div class="kv"><span>Street address</span><b>${addr || np}</b></div><div class="kv"><span>Mailing address</span><b>${val(p.mailing)}</b></div></div>
      <div class="note">${icon('info', 18)}<span>Your details are stored in this browser.</span></div>
      <div class="btns"><button class="btn btn-primary" data-go="/more/profile/edit">${icon('edit', 18)} Edit profile</button></div></div>`
    };
  });
  HM.route('/more/profile/edit', 'more', () => {
    const p = S().profile, a = p.address;
    return {
      title: 'Edit profile',
      html: `${ui.header('Edit profile', { back: '/more/profile' })}<div class="pad"><form data-form="profile" novalidate>
      <div class="card center">${avatar('xl')}<div class="sp mt" style="justify-content:center"><label class="btn btn-sm btn-ghost fileb">${icon('camera', 16)} Choose photo<input type="file" accept="image/*" id="photoIn" hidden></label>${p.photo ? '<button type="button" class="btn btn-sm btn-ghost" data-act="photoDel">Remove</button>' : ''}</div></div>
      ${ui.field({ name: 'first', label: 'First name', value: p.first, autocomplete: 'given-name', maxlength: 40 })}${ui.field({ name: 'middle', label: 'Middle name', value: p.middle, optional: true, maxlength: 40 })}${ui.field({ name: 'last', label: 'Last name', value: p.last, autocomplete: 'family-name', maxlength: 40, optional: true })}${ui.field({ name: 'preferred', label: 'Preferred name', value: p.preferred, maxlength: 30 })}
      ${ui.field({ name: 'gender', label: 'Gender', value: p.gender, optional: true, maxlength: 30 })}${ui.field({ name: 'dob', label: 'Date of birth', type: 'date', value: p.dob, optional: true, max: HM.dayKey(new Date()) })}${ui.field({ name: 'email', label: 'Email address', type: 'email', inputmode: 'email', value: p.email, optional: true })}${ui.field({ name: 'phone', label: 'Phone number', type: 'tel', inputmode: 'tel', value: p.phone, optional: true, placeholder: '(555) 010-0000' })}
      ${ui.field({ name: 'line1', label: 'Street address', value: a.line1, optional: true, autocomplete: 'address-line1' })}${ui.field({ name: 'line2', label: 'Apt, suite, unit', value: a.line2, optional: true })}${ui.field({ name: 'city', label: 'City', value: a.city, optional: true })}
      <div class="two">${ui.field({ name: 'state', label: 'State', value: a.state, maxlength: 2, optional: true, placeholder: 'CA' })}${ui.field({ name: 'zip', label: 'ZIP code', value: a.zip, digits: true, inputmode: 'numeric', maxlength: 5, optional: true })}</div>
      ${ui.field({ name: 'mailing', label: 'Mailing address', value: p.mailing, optional: true, maxlength: 80 })}<button class="btn btn-primary mt2" type="submit">Save profile</button></form></div>`,
      after() { const i = document.getElementById('photoIn'); if (i) i.addEventListener('change', () => { const f = i.files[0]; if (!f) return; if (!f.type.startsWith('image/')) return ui.toast('Choose an image file.', 'err'); if (f.size > 8e6) return ui.toast('That image is too large (8 MB max).', 'err'); const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'), s = 240, m = Math.min(im.width, im.height); c.width = c.height = s; c.getContext('2d').drawImage(im, (im.width - m) / 2, (im.height - m) / 2, m, m, 0, 0, s, s); S().profile.photo = c.toDataURL('image/jpeg', 0.8); HM.save(); ui.toast('Photo updated'); HM.refresh(true); }; im.onerror = () => ui.toast('Couldn’t read that image.', 'err'); im.src = r.result; }; r.readAsDataURL(f); }); }
    };
  });
  HM.acts.photoDel = () => { S().profile.photo = null; HM.save(); HM.refresh(true); };
  HM.forms.profile = (f, d) => {
    const t = (k) => (d[k] || '').trim();
    if (t('first').length < 2) return ui.fail(f, 'Enter your first name.', 'first'); if (t('preferred').length < 1) return ui.fail(f, 'Enter the name you’d like us to call you.', 'preferred');
    if (t('email') && !EMAIL_RE.test(t('email'))) return ui.fail(f, 'Enter a valid email address, like name@example.com.', 'email');
    if (t('phone') && t('phone').replace(/\D/g, '').length !== 10) return ui.fail(f, 'Enter a 10-digit U.S. phone number.', 'phone');
    if (t('state') && !/^[A-Za-z]{2}$/.test(t('state'))) return ui.fail(f, 'Use the 2-letter state code, like CA.', 'state'); if (t('zip') && t('zip').length !== 5) return ui.fail(f, 'ZIP codes have 5 digits.', 'zip');
    if (t('dob')) { const b = HM.parseDay(t('dob')), now = new Date(); if (b > now) return ui.fail(f, 'Date of birth can’t be in the future.', 'dob'); if (now.getFullYear() - b.getFullYear() > 120) return ui.fail(f, 'Check the date of birth.', 'dob'); }
    const p = S().profile; Object.assign(p, { first: t('first'), middle: t('middle'), last: t('last'), preferred: t('preferred'), gender: t('gender'), mailing: t('mailing'), dob: t('dob'), email: t('email'), phone: t('phone') }); p.address = { line1: t('line1'), line2: t('line2'), city: t('city'), state: t('state').toUpperCase(), zip: t('zip') };
    HM.save(); ui.toast('Profile saved'); HM.back('/more/profile');
  };

  /* ---------- security ---------- */
  HM.route('/more/security', 'more', () => {
    const sc = S().security; const pw = sc.pwChanged ? 'Changed ' + HM.fmtDate(sc.pwChanged) : 'Last changed: never in this demo';
    return {
      title: 'Security',
      html: `${ui.header('Security settings', { back: '/more' })}<div class="pad"><div class="card sec-score"><span class="row-i green">${icon('shield', 22)}</span><span class="row-m"><b>Your account is protected</b><small>Email verification code on every sign-in</small></span></div></div>
      ${ui.section('Sign-in', '', `<div class="group">${ui.row({ icon: 'key', title: 'Change password', sub: pw, go: '/more/security/password' })}${ui.toggle({ title: 'Biometric login', sub: 'Use Face ID to unlock (simulated)', on: sc.biometric, act: 'secToggle', arg: 'biometric' })}${ui.row({ icon: 'face', title: 'Face ID demonstration', sub: sc.faceId ? 'Enrolled (demo)' : 'Try the Face ID experience', go: '/more/security/faceid' })}</div>`)}
      ${ui.section('Devices & sessions', '', `<div class="group">${ui.row({ icon: 'device', title: 'Trusted devices', sub: sc.devices.length + ' devices', go: '/more/security/devices' })}${ui.row({ icon: 'clock', title: 'Login history', sub: 'Recent sign-ins', go: '/more/security/history' })}${ui.row({ icon: 'users', title: 'Session management', sub: 'Auto sign-out: ' + sc.sessionTimeout + ' min', go: '/more/security/sessions' })}</div>`)}
      ${ui.section('Alerts', '', `<div class="group">${ui.row({ icon: 'bell', title: 'Security alerts', sub: 'New devices, password changes, large payments', go: '/more/security/alerts' })}</div>`)}`
    };
  });
  HM.acts.secToggle = (b, k) => { const sc = S().security; sc[k] = !sc[k]; HM.save(); HM.refresh(true); };
  HM.route('/more/security/password', 'more', () => ({
    title: 'Change password',
    html: `${ui.header('Change password', { back: '/more/security' })}<div class="pad"><div class="note warn">${icon('info', 18)}<span><b>Demo note:</b> your sign-in password is set by the app owner in the <b>HM_LOGIN_PASSWORD</b> Vercel variable. This form shows the full experience and validates input, but it can’t change that variable.</span></div>
    <form data-form="pw" novalidate>${ui.field({ name: 'cur', label: 'Current password', type: 'password', autocomplete: 'current-password' })}${ui.field({ name: 'n1', label: 'New password', type: 'password', autocomplete: 'new-password', hint: 'At least 10 characters with upper & lower case, a number and a symbol.' })}${ui.field({ name: 'n2', label: 'Confirm new password', type: 'password', autocomplete: 'new-password' })}<button class="btn btn-primary mt2" type="submit">Update password</button></form></div>`
  }));
  HM.forms.pw = (f, d) => {
    if (!d.cur) return ui.fail(f, 'Enter your current password.', 'cur'); const n = d.n1 || '';
    if (n.length < 10) return ui.fail(f, 'Use at least 10 characters.', 'n1'); if (!/[a-z]/.test(n) || !/[A-Z]/.test(n)) return ui.fail(f, 'Include both upper and lower case letters.', 'n1'); if (!/\d/.test(n)) return ui.fail(f, 'Include at least one number.', 'n1'); if (!/[^A-Za-z0-9]/.test(n)) return ui.fail(f, 'Include at least one symbol, like ! or #.', 'n1');
    if (n === d.cur) return ui.fail(f, 'Your new password must be different.', 'n1'); if (n !== d.n2) return ui.fail(f, 'The passwords don’t match.', 'n2');
    S().security.pwChanged = new Date().toISOString(); HM.notify('security', 'Password change simulated', 'Your password was updated in this demo. Sign-in credentials are managed by the app owner.'); HM.save(); ui.toast('Password updated (demo)'); HM.back('/more/security');
  };
  HM.route('/more/security/faceid', 'more', () => ({
    title: 'Face ID demo',
    html: `${ui.header('Face ID demonstration', { back: '/more/security' })}<div class="pad center"><div class="faceid" id="fid"><div class="scan"></div>${icon('face', 90)}</div><h2 id="fidT">Face ID</h2><p class="mute" id="fidS">This is a <b>simulation</b>. No camera is used and no biometric data is read or stored.</p>
    <div class="btns"><button class="btn btn-primary" id="fidGo" data-act="faceRun">Run Face ID demo</button>${S().security.faceId ? '<button class="btn btn-ghost" data-act="faceOff">Remove Face ID (demo)</button>' : ''}</div></div>`
  }));
  HM.acts.faceRun = async (b) => { const f = document.getElementById('fid'); b.disabled = true; f.classList.add('scanning'); document.getElementById('fidT').textContent = 'Scanning…'; await new Promise((r) => setTimeout(r, 1800)); f.classList.remove('scanning'); f.classList.add('done'); document.getElementById('fidT').textContent = 'Face recognized (demo)'; document.getElementById('fidS').textContent = 'In a real app this would unlock Harborstone Mobile.'; S().security.faceId = true; S().security.biometric = true; HM.save(); setTimeout(() => { b.disabled = false; }, 600); };
  HM.acts.faceOff = () => { S().security.faceId = false; HM.save(); HM.refresh(false); ui.toast('Face ID removed'); };
  HM.route('/more/security/devices', 'more', () => ({
    title: 'Trusted devices',
    html: `${ui.header('Trusted devices', { back: '/more/security' })}<div class="pad"><div class="group">${S().security.devices.map((d) => ui.row({ icon: 'device', tone: d.current ? 'green' : '', title: d.name + (d.current ? ' (this device)' : ''), sub: d.model + ' · last used ' + HM.fmtDate(d.last), act: d.current ? '' : 'devRemove', arg: d.id, right: d.current ? '' : '<span class="lnk">Remove</span>', noChev: true })).join('')}</div><div class="note">${icon('info', 18)}<span>Removing a device means it will need email verification the next time it signs in.</span></div></div>`
  }));
  HM.acts.devRemove = async (b, id) => { const d = S().security.devices.find((x) => x.id === id); if (await ui.confirm({ title: 'Remove ' + d.name + '?', body: 'It will no longer be trusted.', ok: 'Remove', danger: true })) { S().security.devices = S().security.devices.filter((x) => x.id !== id); HM.save(); HM.refresh(true); ui.toast('Device removed'); } };
  HM.route('/more/security/history', 'more', () => ({
    title: 'Login history',
    html: `${ui.header('Login history', { back: '/more/security' })}<div class="pad"><div class="group">${S().security.logins.map((l) => ui.row({ icon: l.ok ? 'check' : 'x', tone: l.ok ? 'green' : 'red', title: l.ok ? 'Successful sign-in' : 'Failed sign-in', sub: HM.fmtDT(l.date) + ' · ' + l.device + ' · ' + l.loc, noChev: true })).join('')}</div><p class="footnote">Locations are not tracked in this demo.</p></div>`
  }));
  HM.route('/more/security/alerts', 'more', () => { const a = S().security.alerts; return { title: 'Security alerts', html: `${ui.header('Security alerts', { back: '/more/security' })}<div class="pad"><div class="group">${ui.toggle({ title: 'New device sign-in', on: a.newDevice, act: 'secAlert', arg: 'newDevice' })}${ui.toggle({ title: 'Password changes', on: a.passwordChange, act: 'secAlert', arg: 'passwordChange' })}${ui.toggle({ title: 'Large payments', sub: 'Payments of $500 or more', on: a.largeTx, act: 'secAlert', arg: 'largeTx' })}${ui.toggle({ title: 'Failed sign-in attempts', on: a.loginFail, act: 'secAlert', arg: 'loginFail' })}</div></div>` }; });
  HM.acts.secAlert = (b, k) => { const a = S().security.alerts; a[k] = !a[k]; HM.save(); HM.refresh(true); };
  HM.route('/more/security/sessions', 'more', () => {
    const sc = S().security, ses = HM.session.get() || { at: Date.now() };
    return { title: 'Sessions', html: `${ui.header('Session management', { back: '/more/security' })}<div class="pad"><div class="card"><div class="kv"><span>Current session</span><b>This device</b></div><div class="kv"><span>Signed in</span><b>${HM.fmtDT(ses.at)}</b></div><div class="kv"><span>Account</span><b>${esc(ses.email || S().profile.email || '')}</b></div></div>
      <form class="card mt" data-form="timeout" novalidate>${ui.select({ name: 'min', label: 'Sign out automatically after inactivity', value: String(sc.sessionTimeout), options: [['3', '3 minutes'], ['5', '5 minutes'], ['10', '10 minutes'], ['15', '15 minutes'], ['30', '30 minutes']] })}<button class="btn btn-primary mt" type="submit">Save</button></form>
      <div class="btns"><button class="btn btn-ghost" data-act="otherSessions">Sign out other sessions</button><button class="btn btn-ghost" data-act="signOut">${icon('logout', 18)} Sign out this session</button></div></div>` };
  });
  HM.forms.timeout = (f, d) => { S().security.sessionTimeout = Number(d.min); HM.save(); HM.touch(); ui.toast('Auto sign-out set to ' + d.min + ' minutes'); };
  HM.acts.otherSessions = async () => { if (await ui.confirm({ title: 'Sign out other sessions?', body: 'Other signed-in browsers and devices will be removed from your trusted devices (demo).', ok: 'Sign out others' })) { S().security.devices = S().security.devices.filter((d) => d.current); HM.save(); ui.toast('Other sessions signed out'); } };

  /* ---------- notifications preferences ---------- */
  HM.route('/more/notifications', 'more', () => {
    const n = S().prefs.notif; const rows = [['tx', 'Transaction notifications', 'Purchases, deposits and transfers'], ['pay', 'Payment notifications', 'ACH, wires, checks and bills'], ['dep', 'Deposit notifications', 'Check deposit status'], ['sec', 'Security alerts', 'Sign-ins and account changes']];
    return { title: 'Notification preferences', html: `${ui.header('Notifications', { back: '/more' })}<div class="pad"><div class="note">${icon('info', 18)}<span>Demo: preferences are saved, but no real push notifications or emails are sent (except the sign-in code).</span></div>${rows.map((r) => `<div class="lbl mt2">${r[1]}</div><div class="group mt">${ui.toggle({ title: 'Push notifications', sub: r[2], on: n[r[0]].push, act: 'notifPref', arg: r[0] + ':push' })}${ui.toggle({ title: 'Email notifications', on: n[r[0]].email, act: 'notifPref', arg: r[0] + ':email' })}</div>`).join('')}</div>` };
  });
  HM.acts.notifPref = (b, arg) => { const [k, ch] = arg.split(':'); const n = S().prefs.notif; if (k === 'sec' && ch === 'push' && n.sec.push) { return ui.confirm({ title: 'Turn off security push alerts?', body: 'We recommend keeping these on so you hear about sign-ins right away.', ok: 'Turn off', danger: true }).then((ok) => { if (ok) { n.sec.push = false; HM.save(); HM.refresh(true); } }); } n[k][ch] = !n[k][ch]; HM.save(); HM.refresh(true); };

  /* ---------- support ---------- */
  const FAQ = [
    ['How do I freeze my account?', 'Go to Accounts, choose the account and open Account controls, then tap Freeze account. Outgoing payments, wires, checks, bills, transfers and withdrawals are blocked until you unfreeze it. Deposits are still accepted.'],
    ['Why is my payment pending?', 'Standard ACH, check payments and mobile deposits are pending first. In this demo they post automatically about 90 seconds after submission. Pending debits reduce your available balance right away.'],
    ['What are my daily limits?', 'Limits apply per rail (Instant ACH, Standard ACH, wire, check, withdrawal, deposit) and to all payments combined. See Payments › Daily limits, where you can also change them for testing.'],
    ['How do I add a beneficiary?', 'Open Payments › Beneficiaries and tap +. You’ll need a valid 9-digit ABA routing number and an account number. This demo accepts fictional numbers only.'],
    ['How do I deposit a check?', 'Accounts › Deposit Check (or the Home shortcut). Enter the amount, date and payer, capture the front and back, review and submit. Funds are pending until reviewed.'],
    ['Is my information safe?', 'Harborstone is a fictional demo. Balances and transactions are simulated and kept in your browser. Never enter real bank or card details.'],
    ['I didn’t get my verification code', 'Wait for the 30-second timer, then tap Resend code. Check spam. If email isn’t configured, ask the app owner to follow the email setup in the README.']
  ];
  HM.route('/more/support', 'more', () => ({
    title: 'Customer support',
    html: `${ui.header('Customer support', { back: '/more', sub: 'We’re here to help' })}
    ${ui.section('Contact us', '', `<div class="group">${ui.row({ icon: 'phone', title: 'Call support', sub: '1-800-555-0100 · demo number', noChev: true, act: 'copyTxt', arg: '1-800-555-0100|Phone number' })}${ui.row({ icon: 'msg', title: 'Send a support request', sub: 'We reply within 1 business day (demo)', go: '/more/support/new' })}${ui.row({ icon: 'mail', title: 'Email', sub: 'support@harborstone.example (demo)', noChev: true, act: 'copyTxt', arg: 'support@harborstone.example|Email address' })}</div>`)}
    ${ui.section('Get help', '', `<div class="group">${ui.row({ icon: 'book', title: 'Help center', sub: 'Guides by topic', go: '/more/support/help' })}${ui.row({ icon: 'help', title: 'Frequently asked questions', go: '/more/support/faq' })}${ui.row({ icon: 'clock', title: 'Support request history', sub: S().support.length + ' request' + (S().support.length === 1 ? '' : 's'), go: '/more/support/requests' })}${ui.row({ icon: 'info', title: 'Customer service information', sub: 'Hours & addresses', go: '/more/support/info' })}</div>`)}
    <p class="footnote">All contact details are demonstration content.</p>`
  }));
  HM.route('/more/support/faq', 'more', () => ({ title: 'FAQ', html: `${ui.header('Frequently asked questions', { back: '/more/support' })}<div class="pad"><div class="group faq">${FAQ.map((q) => `<details><summary>${esc(q[0])}${icon('chevD', 18)}</summary><p>${esc(q[1])}</p></details>`).join('')}</div></div>` }));
  const HELP = [['Accounts', 'bank', ['Reading your balances: current vs available', 'Freezing and unfreezing an account', 'Changing an account nickname']], ['Payments', 'send', ['Sending an Instant ACH', 'Wire transfer requirements', 'Scheduling and cancelling payments']], ['Cards', 'card', ['Locking your card', 'Setting spending limits', 'Using your virtual card']], ['Security', 'shield', ['Email verification codes', 'Trusted devices', 'Spotting scams']]];
  HM.route('/more/support/help', 'more', () => ({ title: 'Help center', html: `${ui.header('Help center', { back: '/more/support' })}<div class="pad">${HELP.map((h) => `<div class="lbl mt2">${h[0]}</div><div class="group mt">${h[2].map((a) => ui.row({ icon: h[1], title: a, act: 'helpOpen', arg: a })).join('')}</div>`).join('')}</div>` }));
  HM.acts.helpOpen = (b, a) => ui.sheet(`<h3 class="sh-title">${esc(a)}</h3><p class="sh-body">This is a demo help article. In a live bank, step-by-step guidance for “${esc(a.toLowerCase())}” would appear here. For related answers, see the FAQ or send a support request.</p><div class="sh-actions"><button class="btn btn-primary" data-go="/more/support/faq">Open FAQ</button><button class="btn btn-ghost" data-act="closeSheet">Close</button></div>`);
  HM.route('/more/support/info', 'more', () => ({ title: 'Service info', html: `${ui.header('Customer service', { back: '/more/support' })}<div class="pad"><div class="card"><div class="kv"><span>Phone support</span><b>Mon–Fri 8am–8pm ET<br>Sat 9am–5pm ET</b></div><div class="kv"><span>Lost or stolen cards</span><b>24 / 7</b></div><div class="kv"><span>Mailing address</span><b>Harborstone Bank<br>100 Demo Harbor Way<br>Sample City, ST 00000</b></div><div class="kv"><span>Response time</span><b>1 business day</b></div></div><div class="note">${icon('alert', 18)}<span>Harborstone Bank is fictional. These details are for demonstration only.</span></div></div>` }));
  HM.route('/more/support/new', 'more', () => ({
    title: 'Support request',
    html: `${ui.header('Support request', { back: '/more/support' })}<div class="pad"><form data-form="support" novalidate>${ui.select({ name: 'cat', label: 'Topic', value: '', options: [['', 'Select a topic'], ['Accounts', 'Accounts'], ['Payments', 'Payments & transfers'], ['Cards', 'Cards'], ['Statements', 'Statements & documents'], ['Security', 'Security & sign-in'], ['Other', 'Something else']] })}${ui.field({ name: 'subject', label: 'Subject', maxlength: 80 })}${ui.field({ name: 'message', label: 'How can we help?', type: 'textarea', rows: 5, maxlength: 800, hint: 'Don’t include passwords, full card or account numbers.' })}<button class="btn btn-primary mt2" type="submit">Send request</button></form></div>`
  }));
  HM.forms.support = (f, d, btn) => {
    if (!d.cat) return ui.fail(f, 'Choose a topic.', 'cat'); if (d.subject.trim().length < 4) return ui.fail(f, 'Add a short subject (at least 4 characters).', 'subject'); if (d.message.trim().length < 15) return ui.fail(f, 'Please describe the issue in at least 15 characters.', 'message');
    if (btn && btn.disabled) return; const r = { id: HM.uid('sr'), date: new Date().toISOString(), subject: d.subject.trim(), category: d.cat, message: d.message.trim(), status: 'Open', ref: 'SR-' + String(Math.floor(Math.random() * 1e6)).padStart(6, '0') };
    ui.busy(btn, true, 'Sending…'); setTimeout(() => { S().support.unshift(r); HM.notify('account', 'Support request received', `${r.ref}: ${r.subject}`); HM.save(); ui.toast('Request ' + r.ref + ' sent'); HM.stack.pop(); HM.go('/more/support/requests/' + r.id, { replace: true }); }, 700);
  };
  HM.route('/more/support/requests', 'more', () => ({
    title: 'Support requests',
    html: `${ui.header('Support requests', { back: '/more/support', right: `<button class="iconbtn" data-go="/more/support/new" aria-label="New request">${icon('plus', 20)}</button>` })}<div class="pad">${S().support.length ? `<div class="group">${S().support.map((r) => ui.row({ icon: 'msg', title: r.subject, sub: r.ref + ' · ' + HM.fmtDate(r.date), right: ui.badge(r.status), go: '/more/support/requests/' + r.id })).join('')}</div>` : ui.card(ui.empty('msg', 'No requests yet', 'Send us a message and track it here.', '<button class="btn btn-primary" data-go="/more/support/new">New request</button>'))}</div>`
  }));
  HM.route('/more/support/requests/:id', 'more', ({ id }) => {
    const r = S().support.find((x) => x.id === id); if (!r) return { html: ui.header('Request', { back: '/more/support/requests' }) };
    return { title: r.ref, html: `${ui.header(r.ref, { back: '/more/support/requests', sub: r.category })}<div class="pad"><div class="card"><div class="between sp"><b>${esc(r.subject)}</b>${ui.badge(r.status)}</div><p class="mute sm mt">${HM.fmtDT(r.date)}</p><div class="hr"></div><p>${esc(r.message)}</p></div>${ui.section('Progress', '', `<div class="card">${`<ul class="tlist"><li><i>✓</i><div><b>Request received</b><small>${HM.fmtDT(r.date)}</small></div></li><li class="${r.status === 'Resolved' ? '' : 'now'}"><i>${r.status === 'Resolved' ? '✓' : '●'}</i><div><b>${r.status === 'Resolved' ? 'Resolved' : 'With a specialist'}</b><small>${r.status === 'Resolved' ? 'Closed' : 'Demo: replies are not sent'}</small></div></li></ul>`}</div>`)}</div>` };
  });

  /* ---------- ATM & branches (demonstration content) ---------- */
  const PLACES = [
    ['Harborstone Main Branch', 'branch', '100 Demo Harbor Way, Sample City', '0.4 mi', 'Mon–Fri 9–5 · Sat 9–1', false], ['Harborstone Market Square', 'branch', '22 Market Square, Sample City', '1.2 mi', 'Mon–Sat 9–6', false], ['Harborstone Riverside', 'branch', '480 River Rd, Riverside', '3.1 mi', 'Mon–Fri 9–5', false],
    ['Harborstone ATM · Main Branch', 'atm', '100 Demo Harbor Way', '0.4 mi', '24 hours', true], ['Harborstone ATM · Central Station', 'atm', '5 Station Plaza', '0.9 mi', '24 hours', true], ['Harborstone ATM · Fresh Market', 'atm', '31 Grove Ave', '1.5 mi', 'Daily 6am–11pm', false], ['Harborstone ATM · Campus Center', 'atm', '900 College Blvd', '2.4 mi', '24 hours', true]
  ];
  let pf = { q: '', f: 'all' };
  HM.acts.placeQ = (b, a) => { pf.q = a.slice(2); HM.refresh(true); }; HM.acts.placeF = (b, a) => { pf.f = a; HM.refresh(true); };
  const placesPage = (kind) => { const list = PLACES.filter((p) => p[1] === kind && (!pf.q || (p[0] + p[2]).toLowerCase().includes(pf.q.toLowerCase())) && (pf.f === 'all' || (pf.f === '24' && p[5]))); return { title: kind === 'atm' ? 'Find an ATM' : 'Find a branch', html: `${ui.header(kind === 'atm' ? 'Find an ATM' : 'Find a branch', { back: '/more' })}<div class="pad"><div class="note warn">${icon('alert', 18)}<span><b>Demonstration content.</b> These locations are fictional. No real ATM or branch data is connected.</span></div><div class="searchbar mt">${icon('search', 18)}<input type="search" placeholder="Search by name or street" value="${esc(pf.q)}" data-live="placeQ" data-key="q" aria-label="Search locations"></div><div class="chips"><button class="chip ${pf.f === 'all' ? 'on' : ''}" data-act="placeF" data-arg="all">All</button><button class="chip ${pf.f === '24' ? 'on' : ''}" data-act="placeF" data-arg="24">Open 24 hours</button></div>${list.length ? `<div class="group">${list.map((p) => ui.row({ icon: kind === 'atm' ? 'atm' : 'building', title: p[0], sub: p[2] + ' · ' + p[4], right: p[3], act: 'placeOpen', arg: p[0] })).join('')}</div>` : ui.card(ui.empty('pin', 'No locations found', 'Try a different search.'))}</div>` }; };
  HM.route('/more/atm', 'more', () => { pf = pf.k === 'atm' ? pf : { q: '', f: 'all', k: 'atm' }; return placesPage('atm'); });
  HM.route('/more/branches', 'more', () => { pf = pf.k === 'branch' ? pf : { q: '', f: 'all', k: 'branch' }; return placesPage('branch'); });
  HM.acts.placeOpen = (b, n) => { const p = PLACES.find((x) => x[0] === n); ui.sheet(`<h3 class="sh-title">${esc(p[0])}</h3><p class="sh-body">${esc(p[2])}<br>${esc(p[4])} · ${p[3]} away</p><div class="note warn">${icon('alert', 18)}<span>Demonstration location — not a real address.</span></div><div class="sh-actions"><button class="btn btn-ghost" data-act="closeSheet">Close</button></div>`); };

  /* ---------- legal ---------- */
  const LEGAL = {
    privacy: ['Privacy policy', [['Overview', 'Harborstone Mobile is a school project and Harborstone Bank is a fictional bank. This policy explains, in plain language, how the demo handles information.'], ['What stays on your device', 'Balances, transactions, beneficiaries, settings and your optional profile photo are stored only in your browser’s local storage. Clearing site data or using “Reset demo data” removes them.'], ['What is sent to a server', 'Only your sign-in email and password (to check the demo credentials) and the one-time code request/verification. The password is compared on the server and never stored by the app.'], ['What is never collected', 'No real card numbers, CVVs, PINs, bank credentials, camera images or biometric data are collected or stored.'], ['Contact', 'Questions? Use More › Customer support (demo).']]],
    terms: ['Terms & conditions', [['Educational use', 'Harborstone Mobile is provided for educational demonstration. It is not a bank, does not hold money and offers no financial products.'], ['Simulated activity', 'All balances, payments, deposits, receipts and statements are simulated. Receipts are marked as demonstration documents and are not proof of payment.'], ['Acceptable use', 'Do not enter real account, card or identity information. Do not present demo receipts or statements as real records.'], ['No warranty', 'The app is provided as is. Features may change or reset at any time.']]]
  };
  const legal = (k) => ({ title: LEGAL[k][0], html: `${ui.header(LEGAL[k][0], { back: '/more', sub: 'Effective ' + HM.fmtDate(new Date()) })}<div class="pad"><div class="card doc">${LEGAL[k][1].map((s) => `<h3>${esc(s[0])}</h3><p>${esc(s[1])}</p>`).join('')}</div></div>` });
  HM.route('/more/privacy', 'more', () => legal('privacy')); HM.route('/more/terms', 'more', () => legal('terms'));

  /* ---------- preferences & about ---------- */
  const installSteps = `<ol class="steps"><li>Open this site in <b>Safari</b> on your iPhone.</li><li>Tap the <b>Share</b> button (square with an up arrow).</li><li>Scroll and tap <b>Add to Home Screen</b>.</li><li>Tap <b>Add</b>. Open Harborstone from your Home Screen.</li></ol><p class="hint">On Android Chrome: menu (⋮) › Install app / Add to Home screen.</p>`;
  HM.route('/more/prefs', 'more', () => ({
    title: 'App preferences',
    html: `${ui.header('App preferences', { back: '/more' })}<div class="pad"><div class="group">${ui.toggle({ title: 'Hide balances', sub: 'Mask balances on Home and Accounts', on: S().prefs.hideBalance, act: 'toggleHide2' })}${ui.row({ icon: 'globe', title: 'Currency', right: 'USD ($)', noChev: true })}${ui.row({ icon: 'bell', title: 'Notification preferences', go: '/more/notifications' })}</div>
    ${ui.section('Add to Home Screen', '', `<div class="card">${installSteps}</div>`)}
    ${ui.section('Demo data', '', `<div class="card"><p class="sm mute">Everything in this app is sample data stored in your browser.${HM.isMemoryOnly() ? ' <b>Browser storage is unavailable, so changes will be lost on refresh.</b>' : ''}</p><div class="btns"><button class="btn btn-ghost" data-act="forgetDevice">Forget remembered device</button><button class="btn btn-ghost danger-t" data-act="resetDemo">${icon('refresh', 18)} Reset demo data</button></div></div>`)}</div>`
  }));
  HM.acts.toggleHide2 = () => { S().prefs.hideBalance = !S().prefs.hideBalance; HM.save(); HM.refresh(true); };
  HM.acts.forgetDevice = () => { try { localStorage.removeItem('hm_remember'); } catch (e) { /* ignore */ } ui.toast('This device will no longer pre-fill your email'); };
  HM.acts.resetDemo = async () => { if (await ui.confirm({ title: 'Reset all demo data?', body: 'Balances, transactions, beneficiaries, scheduled payments, goals, cards and settings return to their starting sample values. Your profile is also cleared.', ok: 'Reset demo data', danger: true })) { HM.reset(); HM.stack = []; ui.toast('Demo data reset'); HM.go('/home'); } };
  HM.route('/more/about', 'more', () => ({
    title: 'About',
    html: `${ui.header('About Harborstone Bank', { back: '/more' })}<div class="pad"><div class="card center">${ui.logo(72)}<h2 class="mt">Harborstone Mobile</h2><p class="mute">${HM.BANK.tagline}</p><span class="disc mt">Version 1.0.0</span></div>
    <div class="note warn">${icon('alert', 18)}<span><b>Harborstone Bank is fictional.</b> This app was created for an educational project. It is not a real bank, is not FDIC-insured, and handles no real money or customer data. All balances, payments, receipts and statements are simulated.</span></div>
    ${ui.section('Add to Home Screen', '', `<div class="card">${installSteps}</div>`)}
    <div class="group mt">${ui.row({ icon: 'book', title: 'Privacy policy', go: '/more/privacy' })}${ui.row({ icon: 'file', title: 'Terms & conditions', go: '/more/terms' })}${ui.row({ icon: 'help', title: 'Customer support', go: '/more/support' })}</div></div>`
  }));
})();

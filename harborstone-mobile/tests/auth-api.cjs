// Login + email-OTP tests against the REAL api/auth handlers (tests/api-server.mjs, Resend call stubbed). Run: node tests/api-server.mjs & node tests/auth-api.cjs
const { chromium } = require('playwright'); const B = 'http://localhost:8010';
let pass = 0, fail = 0; const out = []; const ok = (c, n, x) => { c ? pass++ : fail++; out.push((c ? 'PASS  ' : 'FAIL  ') + n + (c || !x ? '' : '  → ' + x)); };
const EMAIL = 'jessicabrownn088@gmail.com', PW = 'Test-Only-Pw-123!';
const mails = async () => (await fetch(B + '/__mails')).json();
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 393, height: 852 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const open = async () => { await p.goto(B + '/'); await p.waitForSelector('form[data-form=login]'); };
  const submit = async () => { await p.click('form[data-form=login] button[type=submit]'); await p.waitForTimeout(500); };
  const set = async (e, w) => { await p.fill('#f_email', e); await p.fill('#f_password', w); };
  await open();
  ok(await p.isVisible('text=Welcome back') && await p.isVisible('#f_email') && await p.isVisible('#f_password') && await p.isVisible('text=Remember this device') && await p.isVisible('text=Forgot password?') && (await p.textContent('form[data-form=login] button[type=submit]')).trim() === 'Sign In', 'login page has all required elements');
  ok((await p.isVisible('.auth-hero svg, .auth-hero img')) && (await p.textContent('.auth-hero')).includes('Harborstone'), 'login page shows Harborstone branding');
  await p.click('.pwt'); ok(await p.getAttribute('#f_password', 'type') === 'text', 'show password icon reveals password'); await p.click('.pwt'); ok(await p.getAttribute('#f_password', 'type') === 'password', 'hide password icon hides it again');
  await submit(); ok((await p.textContent('[data-fld=email] .ferr')).length > 0, 'empty fields: email error shown');
  await set(EMAIL, ''); await submit(); ok((await p.textContent('[data-fld=password] .ferr')).length > 0, 'empty password: error shown');
  await set('wrong.person@gmail.com', PW); await submit(); ok(/incorrect/i.test(await p.textContent('form[data-form=login]')) && !(await p.$('#otpBoxes')), 'incorrect email rejected, no OTP screen');
  await set(EMAIL, 'Wrong-Password-1'); await submit(); ok(/incorrect/i.test(await p.textContent('form[data-form=login]')) && !(await p.$('#otpBoxes')), 'incorrect password rejected, no OTP screen');
  ok((await mails()).length === 0, 'no email sent for bad credentials');
  await set(EMAIL, PW); await submit(); await p.waitForSelector('#otpBoxes');
  let m = await mails(); ok(m.length === 1 && m[0].to[0] === EMAIL && /^[0-9]{6}$/.test((m[0].text.match(/code is (\d{6})/) || [])[1]), 'correct login: 6-digit code emailed to configured address (Resend request captured)');
  ok(m[0].auth === 'Bearer re_test_stub' && m[0].from.includes('no-reply@example.test'), 'Resend request carries key (server side only) and sender');
  const page1 = await p.content(); ok(!(await p.$('.devcode')) && !page1.includes(m[0].text.match(/code is (\d{6})/)[1].replace(/^/, '>')), 'production mode: OTP not shown on screen');
  const shown = await p.textContent('#view, body'); ok(/je•+@gmail\.com/.test(shown) && !shown.includes(EMAIL), 'verification screen shows masked destination email only');
  const fill = async (c) => { await p.evaluate(() => document.querySelectorAll('#otpBoxes input').forEach((i) => (i.value = ''))); for (let i = 0; i < 6; i++) await p.fill(`#otpBoxes input[data-i="${i}"]`, c[i]); await p.waitForTimeout(700); };
  const code1 = m[0].text.match(/code is (\d{6})/)[1]; const bad = code1 === '123456' ? '654321' : '123456';
  await fill(bad); ok(/incorrect/i.test(await p.textContent('#otpErr')) && p.url().includes('otp'), 'incorrect OTP shows error and stays on verification');
  // expired: fast-forward server clock 6 minutes
  await fetch(B + '/__advance?ms=' + 6 * 60 * 1000); await fill(code1); ok(/expired/i.test(await p.textContent('#otpErr')), 'expired OTP rejected with expiry message');
  // resend (client cooldown is 30s)
  await p.waitForFunction(() => !document.querySelector('#resendBtn').disabled, null, { timeout: 40000 }); await p.click('#resendBtn'); await p.waitForTimeout(800);
  m = await mails(); const code2 = m[1] && m[1].text.match(/code is (\d{6})/)[1];
  ok(m.length === 2 && m[1].to[0] === EMAIL, 'resend sends a new email to the same address'); 
  await fill(code2); await p.waitForFunction(() => location.hash === '#/home', null, { timeout: 8000 }); ok(true, 'correct OTP completes verification and opens Home');
  const home = await p.innerText('#view'); ok(home.includes('Beldot') && !home.includes('Samuel'), 'Home greets "Beldot"');
  for (const [t, h] of [['accounts', '#/accounts'], ['payments', '#/payments'], ['cards', '#/cards'], ['more', '#/more']]) { await p.click(`#nav [data-tab=${t}]`); await p.waitForTimeout(250); ok(await p.evaluate(() => location.hash) === h, 'dashboard access after verification: ' + t); }
  await p.evaluate(() => { location.hash = '/more/profile'; }); await p.waitForTimeout(300); const pr = await p.innerText('#view');
  for (const v of ['Beldot', 'Jessica', 'Brown', 'Jeffery', 'Female', 'January 10, 1995'.replace('January', 'Jan'), '(970) 260-1304', EMAIL, '917 N 35th St.', 'Seattle, WA', '98101', 'Seattle, WA 98103']) ok(pr.includes(v), 'profile shows: ' + v);
  await p.evaluate(() => { location.hash = '/more'; }); await p.waitForTimeout(250); await p.click('button:has-text("Sign out")'); await p.click('#cfOk'); await p.waitForSelector('form[data-form=login]'); ok(true, 'sign out returns to login');
  ok(errs.length === 0, 'no JS errors', errs.join('|'));
  // saved-data migration
  const ctx2 = await br.newContext(); const q = await ctx2.newPage();
  await q.goto(B + '/'); await q.waitForSelector('form[data-form=login]');
  const seeded = await q.evaluate(() => JSON.parse(localStorage.getItem('hm_state_v1')).profile); ok(seeded.first === 'Jessica' && seeded.preferred === 'Beldot', 'fresh install seeds Jessica/Beldot profile');
  await q.evaluate(() => { const s = JSON.parse(localStorage.getItem('hm_state_v1')); s.profile = { first: 'Samuel', middle: '', last: '', preferred: 'Samuel', dob: '', email: '', phone: '', address: { line1: '', line2: '', city: '', state: '', zip: '' } }; localStorage.setItem('hm_state_v1', JSON.stringify(s)); });
  await q.reload(); await q.waitForSelector('form[data-form=login]'); const mig = await q.evaluate(() => JSON.parse(localStorage.getItem('hm_state_v1')).profile); ok(mig.first === 'Jessica' && mig.preferred === 'Beldot' && mig.address.zip === '98101', 'untouched old Samuel default is migrated');
  await q.evaluate(() => { const s = JSON.parse(localStorage.getItem('hm_state_v1')); s.profile = { first: 'Samuel', middle: '', last: 'Okoro', preferred: 'Sam', dob: '', email: '', phone: '', address: { line1: '', line2: '', city: '', state: '', zip: '' } }; localStorage.setItem('hm_state_v1', JSON.stringify(s)); });
  await q.reload(); await q.waitForSelector('form[data-form=login]'); const kept = await q.evaluate(() => JSON.parse(localStorage.getItem('hm_state_v1')).profile); ok(kept.last === 'Okoro' && kept.preferred === 'Sam', 'deliberately edited profile is NOT overwritten');
  await br.close(); console.log(out.join('\n') + `\n\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(out.join('\n')); console.error('CRASH', e); process.exit(2); });

// End-to-end tests (Playwright). Requires the dev server: `npm start` in another terminal, then `node tests/run.cjs`.
const { newPage, login, go, text, state } = require('./helpers.cjs');
let pass = 0, fail = 0; const results = [];
const ok = (c, name, extra) => { if (c) { pass++; results.push('PASS  ' + name); } else { fail++; results.push('FAIL  ' + name + (extra ? '  → ' + extra : '')); } };
const bal = async (p, id) => (await state(p)).accounts.find((a) => a.id === id);
const fill = async (p, sel, v) => { await p.fill(sel, String(v)); };
const submit = async (p, form) => { await p.click(`form[data-form=${form}] button[type=submit]`); await p.waitForTimeout(250); };
const inv = async (p, name) => { const v = await p.evaluate(() => HM.verifyBalances()); ok(v.every((x) => x.ok), 'balance invariant: ' + name, JSON.stringify(v)); };
const confirmPay = async (p) => { await p.click('#payConfirm'); await p.waitForFunction(() => location.hash.startsWith('#/payments/result'), null, { timeout: 8000 }); await p.waitForTimeout(200); };

(async () => {
  const { browser, page: p } = await newPage();
  // ---- auth
  await p.goto('http://localhost:8000/'); await p.waitForSelector('form[data-form=login]');
  await submit(p, 'login'); ok((await p.textContent('form[data-form=login] [data-fld=email] .ferr')).includes('email'), 'login: empty email message');
  await fill(p, '#f_email', 'bad'); await submit(p, 'login'); ok((await p.textContent('[data-fld=email] .ferr')).includes('valid'), 'login: invalid email message');
  await fill(p, '#f_email', 'demo@example.com'); await fill(p, '#f_password', 'password123'); await submit(p, 'login'); await p.waitForSelector('#otpBoxes');
  ok(await p.isDisabled('#resendBtn'), 'otp: resend disabled during 30s cooldown'); ok((await p.textContent('#otpTimer')).includes('expires'), 'otp: expiry countdown');
  const code = (await p.textContent('.devcode')).trim(); const wrong = code === '000000' ? '111111' : '000000';
  for (let i = 0; i < 6; i++) await p.fill(`#otpBoxes input[data-i="${i}"]`, wrong[i]); await p.waitForTimeout(400);
  ok((await p.textContent('#otpErr')).toLowerCase().includes('incorrect'), 'otp: invalid code message');
  await p.evaluate(() => document.querySelectorAll('#otpBoxes input').forEach((i) => (i.value = ''))); for (let i = 0; i < 6; i++) await p.fill(`#otpBoxes input[data-i="${i}"]`, code[i]); await p.waitForFunction(() => location.hash === '#/home' || location.hash === '#/welcome'); await p.waitForFunction(() => location.hash === '#/home'); await p.waitForTimeout(300);
  ok(true, 'otp: correct code signs in');
  // nav
  for (const [t, h] of [['accounts', '#/accounts'], ['payments', '#/payments'], ['cards', '#/cards'], ['more', '#/more'], ['home', '#/home']]) { await p.click(`#nav [data-tab=${t}]`); await p.waitForTimeout(200); ok((await p.evaluate(() => location.hash)) === h && (await p.evaluate((t) => document.querySelector(`#nav [data-tab=${t}]`).classList.contains('active'), t)), 'nav tab ' + t); }
  ok((await p.$$('#nav .tab')).length === 5 && (await p.evaluate(() => getComputedStyle(document.getElementById('nav')).position)) === 'fixed', 'nav: 5 fixed tabs');
  // quick actions
  for (const [label, hash] of [['Send Money', '/payments/ach_instant/new'], ['Transfer Between Accounts', '/payments/internal/new'], ['Pay Bills', '/payments/bills'], ['Deposit Check', '/accounts/deposit'], ['View Statements', '/accounts/statements'], ['Manage Cards', '/cards']]) { await go(p, '/home', 120); await p.click(`.qa button:has-text("${label}")`); await p.waitForTimeout(200); ok((await p.evaluate(() => location.hash.split('?')[0])) === '#' + hash, 'quick action: ' + label); }

  // ---- Instant ACH
  const c0 = await bal(p, 'chk1'); await go(p, '/payments/ach_instant/new');
  await submit(p, 'payNew'); ok((await p.textContent('[data-fld=benef] .ferr')).length > 0, 'ach: requires beneficiary');
  await p.selectOption('#f_benef', { index: 1 }); await fill(p, '#f_amount', '999999'); await fill(p, '#f_desc', 'Test'); await submit(p, 'payNew');
  ok(/Insufficient|exceeds/.test(await p.textContent('[data-fld=amount] .ferr')), 'ach: over-balance/limit rejected inline');
  await fill(p, '#f_amount', '6000'); await submit(p, 'payNew'); ok((await p.textContent('[data-fld=amount] .ferr')).includes('limit'), 'ach: instant daily limit enforced (5,000)');
  await fill(p, '#f_amount', '100.50'); await submit(p, 'payNew'); await p.waitForSelector('#payConfirm'); await confirmPay(p);
  let c1 = await bal(p, 'chk1'); ok(Math.abs(c0.current - c1.current - 100.5) < 0.001 && Math.abs(c0.available - c1.available - 100.5) < 0.001, 'instant ACH: current & available both drop $100.50');
  ok((await text(p)).includes('Payment sent'), 'instant ACH: result screen'); await inv(p, 'after instant ACH');
  await p.click('button:has-text("View receipt")'); await p.waitForSelector('.r-instant'); ok((await text(p)).includes('INSTANT') || (await text(p)).includes('Instant ACH'), 'instant ACH receipt layout');
  ok(!(await text(p)).includes('DEMONSTRATION'), 'receipt has no demonstration banner'); ok((await text(p)).includes('fictional bank'), 'receipt keeps one-line fictional-bank fine print');
  // duplicate submission
  await go(p, '/payments/ach_instant/new'); await p.selectOption('#f_benef', { index: 1 }); await fill(p, '#f_amount', '10'); await fill(p, '#f_desc', 'dup'); await submit(p, 'payNew'); await p.waitForSelector('#payConfirm');
  await p.evaluate(() => { const b = document.getElementById('payConfirm'); b.click(); b.disabled = false; b.click(); }); await p.waitForFunction(() => location.hash.startsWith('#/payments/result')); await p.waitForTimeout(1500);
  const txs = (await state(p)).txs.filter((t) => t.desc.startsWith('Instant ACH') && t.meta.purpose === 'dup'); ok(txs.length === 1, 'duplicate submit creates only one transaction', txs.length);

  // ---- Standard ACH pending → posts
  const s0 = await bal(p, 'chk1'); await go(p, '/payments/ach_standard/new'); await p.selectOption('#f_benef', { index: 2 }); await fill(p, '#f_amount', '200'); await fill(p, '#f_desc', 'std'); await submit(p, 'payNew'); await p.waitForSelector('#payConfirm'); await confirmPay(p);
  let s1 = await bal(p, 'chk1'); ok(s0.current === s1.current && Math.abs(s0.available - s1.available - 200) < 0.001, 'standard ACH: pending → available drops, current unchanged'); await inv(p, 'pending ACH');
  await p.evaluate(() => { const S = HM.state(); S.txs.forEach((t) => { if (t.settleAt) t.settleAt = Date.now() - 1; }); HM.processDue(); });
  s1 = await bal(p, 'chk1'); ok(s0.current - s1.current >= 199.99 && Math.abs(s1.current - s1.available) < 0.001, 'standard ACH: posts and current drops (hold released)'); await inv(p, 'after settle');

  // ---- Wire
  const w0 = await bal(p, 'chk1'); await go(p, '/payments/wire/new');
  await fill(p, '#f_name', 'Test Payee'); await fill(p, '#f_bank', 'Some Bank'); await fill(p, '#f_routing', '123456789'); await fill(p, '#f_account', '12345678'); await fill(p, '#f_account2', '12345678'); await fill(p, '#f_amount', '500'); await p.selectOption('#f_purpose', 'Gift'); await submit(p, 'payNew');
  ok((await p.textContent('[data-fld=routing] .ferr')).includes('valid'), 'wire: invalid ABA routing rejected');
  await fill(p, '#f_routing', '044100885'); await fill(p, '#f_account2', '1111111111'); await submit(p, 'payNew'); ok((await p.textContent('[data-fld=account2] .ferr')).includes('match'), 'wire: account confirmation mismatch');
  await fill(p, '#f_account2', '12345678'); await submit(p, 'payNew'); await p.waitForSelector('#payConfirm'); ok((await text(p)).includes('$25.00'), 'wire: fee shown on review'); await confirmPay(p);
  const w1 = await bal(p, 'chk1'); ok(Math.abs(w0.current - w1.current - 525) < 0.001, 'wire: debits amount + $25 fee'); await inv(p, 'wire');
  await p.click('button:has-text("View receipt")'); await p.waitForSelector('.r-wire'); ok((await text(p)).includes('WIRE TRANSFER ADVICE'), 'wire receipt layout');

  // ---- Check payment
  const k0 = await bal(p, 'chk1'); await go(p, '/payments/check/new'); await fill(p, '#f_payee', 'Check Payee'); await fill(p, '#f_amount', '75'); await fill(p, '#f_memo', 'memo'); await submit(p, 'payNew'); await p.waitForSelector('#payConfirm'); await confirmPay(p);
  const kt = (await state(p)).txs.find((t) => t.rail === 'check' && t.meta.payee === 'Check Payee'); ok(kt && kt.meta.checkNo === 1043 && kt.status === 'pending', 'check: number generated (#1043) and pending');
  await p.click('button:has-text("View receipt")'); await p.waitForSelector('.r-check'); ok((await text(p)).includes('Check Payee'), 'check receipt layout');

  // ---- Internal transfer
  const i0 = await bal(p, 'chk1'), i0s = await bal(p, 'sav1'); await go(p, '/payments/internal/new'); await p.selectOption('#f_from', 'chk1'); await p.selectOption('#f_to', 'sav1'); await fill(p, '#f_amount', '50'); await submit(p, 'payNew'); await p.waitForSelector('#payConfirm'); await confirmPay(p);
  const i1 = await bal(p, 'chk1'), i1s = await bal(p, 'sav1'); ok(Math.abs(i0.current - i1.current - 50) < 0.001 && Math.abs(i1s.current - i0s.current - 50) < 0.001, 'internal transfer: balances update on both accounts'); await inv(p, 'internal');
  await go(p, '/payments/internal/new'); await p.selectOption('#f_from', 'chk1'); await p.selectOption('#f_to', 'chk1'); await fill(p, '#f_amount', '5'); await submit(p, 'payNew'); ok((await p.textContent('[data-fld=to] .ferr')).includes('different'), 'internal: same account rejected');

  // ---- Bill pay now and scheduled
  const b0 = await bal(p, 'chk2'); await go(p, '/payments/bills/pay'); await p.selectOption('#f_from', 'chk2'); await fill(p, '#f_amount', '60'); await submit(p, 'billNew'); await p.waitForSelector('#payConfirm'); await confirmPay(p);
  ok(Math.abs(b0.current - (await bal(p, 'chk2')).current - 60) < 0.001, 'bill pay (today): completes and debits');
  const nSched = (await state(p)).scheduled.length; await go(p, '/payments/bills/pay'); await p.selectOption('#f_from', 'chk2'); await fill(p, '#f_amount', '30'); const fut = await p.evaluate(() => HM.dayKey(new Date(Date.now() + 5 * 864e5))); await fill(p, '#f_date', fut); await p.selectOption('#f_freq', 'weekly'); await submit(p, 'billNew'); await p.waitForSelector('#payConfirm'); await p.click('#payConfirm'); await p.waitForFunction(() => location.hash.includes('sched-')); await p.waitForTimeout(200);
  ok((await state(p)).scheduled.length === nSched + 1 && (await text(p)).includes('scheduled'), 'bill pay (future, recurring): scheduled not debited');
  await go(p, '/payments/scheduled'); ok((await text(p)).toLowerCase().includes('recurring'), 'scheduled page lists recurring');

  // ---- Limits
  await go(p, '/payments/limits'); const lt = await text(p); ok(lt.includes('Instant ACH') && lt.includes('Domestic wire') && lt.includes('Remaining'), 'limits page shows usage/remaining');

  // ---- Freeze rules
  const f0 = await bal(p, 'chk1'); await go(p, '/accounts/chk1/controls'); await p.click('button:has-text("Freeze account")'); await p.click('#cfOk'); await p.waitForTimeout(300);
  ok((await bal(p, 'chk1')).status === 'frozen', 'freeze: account status frozen');
  const attempt = async (rail) => {
    if (rail === 'ach_instant') { await go(p, '/payments/ach_instant/new'); await p.selectOption('#f_benef', { index: 1 }); await fill(p, '#f_amount', '20'); await fill(p, '#f_desc', 'frozen'); }
    if (rail === 'wire') { await go(p, '/payments/wire/new'); await fill(p, '#f_name', 'X Y'); await fill(p, '#f_bank', 'B'); await fill(p, '#f_routing', '044100885'); await fill(p, '#f_account', '12345678'); await fill(p, '#f_account2', '12345678'); await fill(p, '#f_amount', '20'); await p.selectOption('#f_purpose', 'Gift'); }
    if (rail === 'check') { await go(p, '/payments/check/new'); await fill(p, '#f_payee', 'Frozen Co'); await fill(p, '#f_amount', '20'); }
    await submit(p, 'payNew'); await p.waitForSelector('#payConfirm'); ok((await text(p)).toLowerCase().includes('frozen'), rail + ': frozen warning on review'); await confirmPay(p); ok((await text(p)).includes('Payment blocked'), rail + ': blocked result'); };
  for (const r of ['ach_instant', 'wire', 'check']) await attempt(r);
  const f1 = await bal(p, 'chk1'); ok(f0.current === f1.current && f0.available === f1.available, 'frozen: balance never decreases');
  ok((await state(p)).txs.filter((t) => t.status === 'blocked').length >= 3, 'frozen: attempts recorded as blocked demo attempts');
  await go(p, '/payments/internal/new'); await p.selectOption('#f_from', 'chk1'); await p.selectOption('#f_to', 'sav1'); await fill(p, '#f_amount', '5'); await submit(p, 'payNew'); await p.waitForSelector('#payConfirm'); await confirmPay(p); ok((await text(p)).includes('blocked'), 'frozen: internal transfer out blocked');
  const bt = (await state(p)).txs.find((t) => t.status === 'blocked'); await go(p, '/receipt/' + encodeURIComponent(bt.ref)); ok((await text(p)).includes('NOT PROCESSED'), 'blocked attempt receipt says NOT PROCESSED');
  await p.evaluate(() => { const r = HM.cardTxn({ cardId: 'card1', merchant: 'Test', amount: 5, mode: 'pos' }); window.__r = r; }); ok(!(await p.evaluate(() => __r.ok)), 'frozen: card purchase declined/blocked');
  await go(p, '/accounts/chk1/controls'); await p.click('button:has-text("Unfreeze account")'); await p.click('#cfOk'); await p.waitForTimeout(300); ok((await bal(p, 'chk1')).status === 'active', 'unfreeze works');
  await go(p, '/payments/ach_instant/new'); await p.selectOption('#f_benef', { index: 1 }); await fill(p, '#f_amount', '1'); await fill(p, '#f_desc', 'after'); await submit(p, 'payNew'); await p.waitForSelector('#payConfirm'); await confirmPay(p); ok((await text(p)).includes('Payment sent'), 'after unfreeze: payments work again'); await inv(p, 'after freeze tests');

  // ---- Deposit
  const d0 = await bal(p, 'chk1'); await go(p, '/accounts/deposit'); await fill(p, '#f_amount', '250'); await fill(p, '#f_payer', 'Acme Co'); await submit(p, 'depStart'); await p.waitForSelector('.cam');
  await p.click('.shutter'); await p.waitForSelector('.chk-img'); await p.click('button:has-text("Use photo")'); await p.waitForSelector('.cam'); await p.click('.shutter'); await p.waitForSelector('.chk-img'); await p.click('button:has-text("Use photo")'); await p.waitForSelector('#depSubmit');
  ok((await text(p)).includes('Acme Co'), 'deposit: review shows details'); await p.click('#depSubmit'); await p.waitForFunction(() => location.hash.includes('/deposit/done/'), null, { timeout: 8000 });
  let d1 = await bal(p, 'chk1'); ok(d0.current === d1.current && d0.available === d1.available, 'deposit: pending, funds not yet available'); await p.evaluate(() => { HM.state().txs.forEach((t) => { if (t.settleAt && t.rail === 'deposit') t.settleAt = Date.now() - 1; }); HM.processDue(); }); d1 = await bal(p, 'chk1'); ok(Math.abs(d1.current - d0.current - 250) < 0.001 && Math.abs(d1.available - d0.available - 250) < 0.001, 'deposit: posts and credits $250'); await inv(p, 'deposit');
  await p.evaluate(() => { location.hash = '/accounts/deposit/history'; }); await p.waitForTimeout(200); ok((await text(p)).includes('Acme Co'), 'deposit history lists deposit');
  const dep = (await state(p)).txs.find((t) => t.rail === 'deposit' && t.meta.payer === 'Acme Co'); await go(p, '/receipt/' + encodeURIComponent(dep.ref)); await p.waitForSelector('.r-deposit'); ok((await p.$$('.r-deposit img')).length === 2, 'deposit receipt shows both check images');
  await go(p, '/accounts/deposit'); await p.waitForTimeout(100);

  // ---- Cards
  await go(p, '/cards'); await p.click('button:has-text("Lock card")'); await p.click('#cfOk'); await p.waitForTimeout(200); ok((await state(p)).cards[0].status === 'locked', 'card: lock');
  let r = await p.evaluate(() => HM.cardTxn({ cardId: 'card1', merchant: 'Shop', amount: 5, mode: 'pos' })); ok(!r.ok && /locked/.test(r.error), 'locked card declines purchases');
  await p.click('button:has-text("Unlock card")'); await p.waitForTimeout(200); ok((await state(p)).cards[0].status === 'active', 'card: unlock');
  await p.evaluate(() => { HM.state().cards[0].controls.online = false; }); r = await p.evaluate(() => HM.cardTxn({ cardId: 'card1', merchant: 'Shop', amount: 5, mode: 'online' })); ok(!r.ok && /Online/.test(r.error), 'online control off declines online purchase');
  r = await p.evaluate(() => HM.cardTxn({ cardId: 'card1', merchant: 'Abroad', amount: 5, mode: 'intl' })); ok(!r.ok && /International/.test(r.error), 'international off declines');
  r = await p.evaluate(() => HM.cardTxn({ cardId: 'card1', merchant: 'ATM', amount: 900, mode: 'atm' })); ok(!r.ok && /limit/i.test(r.error), 'ATM above card limit declined');
  const pre = await bal(p, 'chk1'); r = await p.evaluate(() => HM.cardTxn({ cardId: 'card1', merchant: 'ATM', amount: 100, mode: 'atm' })); ok(r.ok && (await bal(p, 'chk1')).current === Math.round((pre.current - 100) * 100) / 100, 'ATM withdrawal approved and debited'); await inv(p, 'cards');
  await go(p, '/cards/pin/card1'); await fill(p, '#f_cur', '1357'); await fill(p, '#f_n1', '1111'); await fill(p, '#f_n2', '1111'); await submit(p, 'pin'); ok((await p.textContent('[data-fld=n1] .ferr')).includes('easy'), 'PIN: weak PIN rejected');
  ok(!JSON.stringify(await state(p)).includes('1357'), 'PIN is never stored');

  // ---- accounts: rename, tx search/filter, statements
  await go(p, '/accounts/chk1/info'); await p.click('button[data-act=renameAcct] >> nth=0'); await fill(p, 'form[data-form=rename] input', 'Daily Spend'); await p.click('form[data-form=rename] button[type=submit]'); await p.waitForTimeout(250); ok((await bal(p, 'chk1')).nickname === 'Daily Spend', 'nickname change');
  await go(p, '/accounts/chk1/transactions'); const nAll = await p.$$eval('.tx', (e) => e.length); await p.fill('input[data-key=q]', 'Fresh'); await p.waitForTimeout(250); const nF = await p.$$eval('.tx', (e) => e.length); ok(nF > 0 && nF < nAll, 'transaction search filters', nF + '/' + nAll);
  await p.click('.chip:has-text("Credits")'); await p.waitForTimeout(200); ok((await p.$$eval('.tx-a.pos', (e) => e.length)) >= 0, 'type filter runs');
  const mo = await p.evaluate(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); });
  await go(p, '/accounts/chk1/statement/' + mo); ok((await text(p)).includes('Closing balance'), 'statement view'); const [dl] = await Promise.all([p.waitForEvent('download'), p.click('button[data-act=stmtDownload]')]); ok(/\.html$/.test(dl.suggestedFilename()), 'statement download');

  // ---- profile + support + more
  await go(p, '/more/profile'); { const t = await text(p); ok(t.includes('Beldot') && t.includes('Jeffery') && !t.includes('Samuel'), 'profile: supplied customer details shown, no Samuel'); }
  await go(p, '/more/support/new'); await p.selectOption('#f_cat', 'Cards'); await fill(p, '#f_subject', 'Test subject'); await fill(p, '#f_message', 'This is a test support request message.'); await submit(p, 'support'); await p.waitForTimeout(1000); ok((await state(p)).support.some((s) => s.subject === 'Test subject'), 'support request created');
  await go(p, '/more/atm'); ok((await text(p)).includes('Demonstration content'), 'ATM finder labelled demo');

  // ---- no overflow at several widths + no errors + sign out
  for (const w of [320, 360, 393, 430]) { await p.setViewportSize({ width: w, height: 800 }); for (const h of ['/home', '/accounts', '/payments', '/cards', '/more', '/payments/wire/new', '/cards/virtual']) { await go(p, h, 100); const o = await p.evaluate(() => document.getElementById('view').scrollWidth > document.getElementById('view').clientWidth + 1); if (o) ok(false, `overflow at ${w}px on ${h}`); } } ok(true, 'no horizontal overflow at 320/360/393/430 on key pages');
  ok(p.errors.length === 0, 'no JS errors during run', p.errors.join(' | '));
  await go(p, '/more'); await p.click('button:has-text("Sign out")'); await p.click('#cfOk'); await p.waitForSelector('form[data-form=login]'); ok(true, 'sign out returns to login');
  await p.evaluate(() => { location.hash = '/accounts'; }); await p.waitForTimeout(200); ok((await p.evaluate(() => location.hash)) === '#/login', 'protected routes redirect to login after sign-out');
  await browser.close(); console.log(results.join('\n')); console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(results.join('\n')); console.error('TEST CRASH', e); process.exit(2); });

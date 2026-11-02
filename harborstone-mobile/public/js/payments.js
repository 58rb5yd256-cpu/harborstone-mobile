/* Harborstone Mobile — Payments: hub, six payment rails (one wizard), beneficiaries, billers, scheduled, history, limits */
(function () {
  'use strict';
  const HM = window.HM, ui = HM.ui, esc = HM.esc, icon = HM.icon, money = HM.money;
  const S = () => HM.state();
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const RAIL_INFO = {
    ach_instant: { title: 'Instant ACH', icon: 'zap', blurb: 'Arrives in seconds', info: 'Delivered within seconds, any time. No fee.', proc: 'Instant — completes immediately' },
    ach_standard: { title: 'Standard ACH', icon: 'repeat', blurb: '1–2 business days', info: 'Typically settles in 1–2 business days. No fee.', proc: `Pending — posts about ${Math.round(HM.PENDING_MS / 1000)} seconds after submission (demo rule)` },
    wire: { title: 'Domestic wire', icon: 'bank', blurb: 'Same-day · $25 fee', info: 'Same-day delivery to a U.S. bank. A $25.00 outgoing wire fee applies.', proc: 'Completes immediately in this demo' },
    check: { title: 'Check payment', icon: 'file', blurb: 'We issue a check', info: 'We issue a check to your payee. No fee.', proc: `Pending until the check clears — about ${Math.round(HM.PENDING_MS / 1000)} seconds in this demo` },
    internal: { title: 'Transfer between accounts', icon: 'swap', blurb: 'Your own accounts', info: 'Instant transfers between your Harborstone accounts.', proc: 'Instant — completes immediately' },
    bill: { title: 'Bill payment', icon: 'bill', blurb: 'Pay a saved biller', info: 'Pay now, schedule for later or repeat.', proc: 'Today’s payments complete immediately; future dates are scheduled' }
  };
  const PURPOSES = ['Family support', 'Gift', 'Purchase of goods or services', 'Rent or mortgage', 'Invoice payment', 'Loan payment', 'Real estate closing', 'Savings or investment', 'Other'];
  const PAY_RAILS = ['ach_instant', 'ach_standard', 'wire', 'check', 'bill', 'internal'];

  /* ---------- hub ---------- */
  HM.route('/payments', 'payments', () => {
    const s = S(), frozen = s.accounts.filter((a) => a.status === 'frozen'); const lp = HM.limitInfo('payments');
    return {
      title: 'Payments',
      html: `${ui.header('Payments', { back: false, sub: 'Send, transfer and pay', right: `<button class="iconbtn" data-go="/payments/history" aria-label="Payment history">${icon('clock', 20)}</button>` })}
      <div class="pad">${frozen.length ? `<div class="note warn">${icon('snow', 18)}<span><b>${esc(frozen.map((a) => a.nickname).join(', '))}</b> ${frozen.length > 1 ? 'are' : 'is'} frozen — outgoing payments from ${frozen.length > 1 ? 'them' : 'it'} will be blocked.</span></div>` : ''}
      <div class="card"><div class="lim-h"><b>Daily payment limit</b><span>${money(lp.left)} left</span></div>${ui.progress(lp.pct)}<div class="lim-f"><span>Used ${money(lp.used)}</span><span>Limit ${money(lp.limit).replace('.00', '')}</span></div><button class="lnk mt" data-go="/payments/limits">View all limits ›</button></div></div>
      ${ui.section('Send money', '', `<div class="group">${['ach_instant', 'ach_standard', 'wire', 'check'].map((r) => ui.row({ icon: RAIL_INFO[r].icon, tone: r === 'ach_instant' ? 'gold' : 'navy', title: RAIL_INFO[r].title, sub: RAIL_INFO[r].blurb, go: '/payments/' + r + '/new' })).join('')}</div>`)}
      ${ui.section('Move money & pay bills', '', `<div class="group">${ui.row({ icon: 'swap', title: 'Transfer between accounts', sub: 'Checking ⇄ savings', go: '/payments/internal/new' })}${ui.row({ icon: 'bill', title: 'Bill payments', sub: 'Pay, schedule & manage billers', go: '/payments/bills' })}</div>`)}
      ${ui.section('Manage', '', `<div class="tiles">${[['users', 'Beneficiaries', 'Saved & recent', '/payments/beneficiaries'], ['calendar', 'Scheduled', 'Upcoming & recurring', '/payments/scheduled'], ['receipt', 'Payment history', 'Receipts & filters', '/payments/history'], ['sliders', 'Daily limits', 'View & configure', '/payments/limits']].map((t) => `<button class="tile" data-go="${t[3]}"><span class="row-i navy">${icon(t[0], 20)}</span><b>${t[1]}</b><small>${t[2]}</small></button>`).join('')}</div>`)}
      ${(() => { const rec = s.beneficiaries.slice().sort((a, b) => new Date(b.lastUsed || 0) - new Date(a.lastUsed || 0)).slice(0, 4); return rec.length ? ui.section('Recent recipients', ui.link('All', '/payments/beneficiaries'), `<div class="hscroll slim">${rec.map((b) => `<button class="rcp" data-go="/payments/beneficiaries/${b.id}"><span class="avatar sm">${esc(b.name[0])}</span><b>${esc(b.nick || b.name.split(' ')[0])}</b></button>`).join('')}</div>`) : ''; })()}`
    };
  });

  /* ---------- draft + helpers ---------- */
  HM._pay = null;
  const draftFor = (rail) => { if (!HM._pay || HM._pay.rail !== rail) HM._pay = { rail, idem: 'pay:' + HM.uid('x'), from: 'chk1', amount: '', desc: '' }; return HM._pay; };
  const fromQ = () => new URLSearchParams(location.hash.split('?')[1] || '');
  const frozenWarn = (id) => { const a = HM.acct(id); return a && a.status === 'frozen' ? `<div class="note warn frz-w">${icon('snow', 18)}<span><b>${esc(a.nickname)} is frozen.</b> Submitting will be blocked and recorded as a demo attempt. No money will move.</span></div>` : ''; };
  const benOptions = (sel) => [['', 'Select a beneficiary']].concat(S().beneficiaries.map((b) => [b.id, `${b.name} · ${b.bank} ${HM.mask(b.account)}`]));
  const benInfo = (id) => { const b = S().beneficiaries.find((x) => x.id === id); return b ? `<div class="kv"><span>Receiving bank</span><b>${esc(b.bank)}</b></div><div class="kv"><span>Routing number</span><b>${b.routing}</b></div><div class="kv"><span>Account</span><b>${esc(b.type)} ${HM.mask(b.account)}</b></div>` : '<p class="hint">Pick a beneficiary to see their receiving bank details.</p>'; };
  const limitLine = (rail) => { const R = HM.RAILS[rail]; if (!R.limit) return ''; const L = HM.limitInfo(R.limit); return `<p class="hint">Daily ${HM.LIMIT_LABELS[R.limit]} limit ${money(L.limit).replace('.00', '')} · ${money(L.left)} remaining today</p>`; };
  const noBenef = (rail) => `<div class="card">${ui.empty('users', 'No beneficiaries yet', 'Add someone to send money to.', `<button class="btn btn-primary" data-go="/payments/beneficiaries/new?return=${rail}">Add beneficiary</button>`)}</div>`;

  function newPage(rail) {
    const info = RAIL_INFO[rail]; if (!info || rail === 'bill') { HM.go('/payments', { replace: true }); return { html: '' }; }
    const d = draftFor(rail); const q = fromQ(); if (q.get('from')) d.from = q.get('from'); if (q.get('benef')) d.benef = q.get('benef');
    const amount = ui.field({ name: 'amount', label: 'Amount', money: true, inputmode: 'decimal', value: d.amount, placeholder: '0.00' });
    const from = ui.select({ name: 'from', label: rail === 'internal' ? 'From account' : 'Pay from', value: d.from, options: ui.acctOptions() });
    let body = '';
    if (rail === 'ach_instant' || rail === 'ach_standard') {
      if (!S().beneficiaries.length) body = noBenef(rail);
      else body = `${from}${ui.select({ name: 'benef', label: 'Beneficiary', value: d.benef || '', options: benOptions() })}<button type="button" class="lnk mt" data-go="/payments/beneficiaries/new?return=${rail}">+ Add new beneficiary</button>${rail === 'ach_standard' ? `<div class="card info-c" id="bInfo">${benInfo(d.benef)}</div>` : ''}${amount}${limitLine(rail)}${ui.field({ name: 'desc', label: 'Payment description', value: d.desc, maxlength: 60, placeholder: 'e.g. Rent share' })}`;
    } else if (rail === 'wire') {
      body = `${from}${ui.select({ name: 'wireBenef', label: 'Use a saved beneficiary', value: d.wireBenef || '', options: [['', 'Enter details manually']].concat(S().beneficiaries.map((b) => [b.id, b.name])) })}
        ${ui.field({ name: 'name', label: 'Beneficiary name', value: d.name || '', maxlength: 60 })}${ui.field({ name: 'bank', label: 'Receiving bank', value: d.bank || '', maxlength: 60 })}${ui.field({ name: 'routing', label: 'ABA routing number', value: d.routing || '', digits: true, inputmode: 'numeric', maxlength: 9, placeholder: '9 digits' })}
        ${ui.field({ name: 'account', label: 'Destination account number', value: d.account || '', digits: true, inputmode: 'numeric', maxlength: 17, hint: 'Shown masked after you continue.' })}${ui.field({ name: 'account2', label: 'Confirm account number', value: d.account2 || '', digits: true, inputmode: 'numeric', maxlength: 17 })}
        ${amount}${limitLine('wire')}<div class="note">${icon('info', 18)}<span><b>Wire fee demonstration:</b> $25.00 is added to every outgoing domestic wire.</span></div>
        ${ui.select({ name: 'purpose', label: 'Payment purpose', value: d.purpose || '', options: [['', 'Select a purpose']].concat(PURPOSES.map((p) => [p, p])) })}`;
    } else if (rail === 'check') {
      body = `${from}${ui.field({ name: 'payee', label: 'Payee name', value: d.payee || '', maxlength: 60, placeholder: 'Who should the check be made out to?' })}${amount}${limitLine('check')}${ui.field({ name: 'issueDate', label: 'Issue date', type: 'date', value: d.issueDate || HM.dayKey(new Date()), max: HM.dayKey(new Date()) })}${ui.field({ name: 'memo', label: 'Check memo', value: d.memo || '', maxlength: 60, optional: true })}`;
    } else if (rail === 'internal') {
      const accts = S().accounts; const to = d.to && d.to !== d.from ? d.to : (accts.find((a) => a.id !== d.from) || {}).id;
      body = `${from}${ui.select({ name: 'to', label: 'To account', value: to, options: ui.acctOptions() })}${amount}${ui.field({ name: 'desc', label: 'Description', value: d.desc, maxlength: 60, optional: true, placeholder: 'e.g. Monthly savings' })}`;
    }
    const noCta = (rail === 'ach_instant' || rail === 'ach_standard') && !S().beneficiaries.length;
    return {
      title: info.title,
      html: `${ui.header(info.title, { back: '/payments', sub: info.blurb })}<div class="pad">
        <div class="note">${icon(info.icon, 18)}<span>${info.info}</span></div><div id="frzSlot">${frozenWarn(d.from)}</div>
        <form data-form="payNew" data-rail="${rail}" novalidate>${body}${noCta ? '' : '<button class="btn btn-primary mt2" type="submit">Review payment</button>'}</form></div>`
    };
  }
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.matches('form[data-form=payNew] select[name=benef]')) { const el = document.getElementById('bInfo'); if (el) el.innerHTML = benInfo(t.value); }
    if (t.matches('form[data-form=payNew] select[name=from]')) { const el = document.getElementById('frzSlot'); if (el) el.innerHTML = frozenWarn(t.value); }
    if (t.matches('select[name=wireBenef]')) { const b = S().beneficiaries.find((x) => x.id === t.value), f = t.closest('form'); if (b) { f.name.value = b.name; f.bank.value = b.bank; f.routing.value = b.routing; f.account.value = b.account; f.account2.value = b.account; } }
  });
  function checkFunds(form, a, amount, fee, rail) {
    if (a.status === 'frozen') return true; // engine will block & record
    const R = HM.RAILS[rail], total = HM.r2(amount + fee);
    if (total > a.available) { ui.fail(form, `Insufficient available balance. ${a.nickname} has ${money(a.available)} available${fee ? `; this needs ${money(total)} including the ${money(fee)} fee` : ''}.`, 'amount'); return false; }
    if (R.limit) { const L = HM.limitInfo(R.limit); if (HM.r2(L.used + amount) > L.limit) { ui.fail(form, `This exceeds your daily ${HM.LIMIT_LABELS[R.limit]} limit of ${money(L.limit)}. You have ${money(L.left)} left today.`, 'amount'); return false; } }
    if (R.agg) { const L = HM.limitInfo('payments'); if (HM.r2(L.used + amount) > L.limit) { ui.fail(form, `This exceeds your combined daily payment limit of ${money(L.limit)}. You have ${money(L.left)} left today.`, 'amount'); return false; } }
    return true;
  }
  HM.forms.payNew = (f, data) => {
    const rail = f.dataset.rail, d = draftFor(rail), a = HM.acct(data.from); const fee = HM.RAILS[rail].fee || 0;
    const amt = HM.parseAmt(data.amount); const amtMsg = 'Enter an amount, like 125.00.';
    const amountOK = () => { if (isNaN(amt) || amt <= 0) { ui.fail(f, amtMsg, 'amount'); return false; } if (amt > 1000000) { ui.fail(f, 'Amount is too large for this demo.', 'amount'); return false; } return true; };
    if (rail === 'ach_instant' || rail === 'ach_standard') {
      if (!data.benef) return ui.fail(f, 'Select who you are paying.', 'benef'); if (!amountOK()) return; if (!(data.desc || '').trim()) return ui.fail(f, 'Add a short payment description.', 'desc');
      Object.assign(d, { from: data.from, benef: data.benef, amount: amt, desc: data.desc.trim() });
    } else if (rail === 'wire') {
      if (!ui.need(f, data, [['name', 'Enter the beneficiary’s name.'], ['bank', 'Enter the receiving bank.']])) return;
      if (!HM.abaValid(data.routing)) return ui.fail(f, 'That routing number isn’t valid. It must be 9 digits and pass the ABA check.', 'routing');
      if (data.account.length < 6) return ui.fail(f, 'Account numbers have 6–17 digits.', 'account'); if (data.account !== data.account2) return ui.fail(f, 'The account numbers don’t match.', 'account2');
      if (!amountOK()) return; if (!data.purpose) return ui.fail(f, 'Select the purpose of this wire.', 'purpose');
      Object.assign(d, { from: data.from, wireBenef: data.wireBenef, name: data.name.trim(), bank: data.bank.trim(), routing: data.routing, account: data.account, account2: data.account2, amount: amt, purpose: data.purpose });
    } else if (rail === 'check') {
      if (data.payee.trim().length < 2) return ui.fail(f, 'Enter the payee’s name.', 'payee'); if (!amountOK()) return; if (!data.issueDate) return ui.fail(f, 'Choose an issue date.', 'issueDate');
      if (data.issueDate > HM.dayKey(new Date())) return ui.fail(f, 'Issue date can’t be in the future.', 'issueDate');
      Object.assign(d, { from: data.from, payee: data.payee.trim(), amount: amt, issueDate: data.issueDate, memo: (data.memo || '').trim() });
    } else if (rail === 'internal') {
      if (data.from === data.to) return ui.fail(f, 'Choose two different accounts.', 'to'); if (!amountOK()) return;
      Object.assign(d, { from: data.from, to: data.to, amount: amt, desc: (data.desc || '').trim() });
    }
    if (!checkFunds(f, a, amt, fee, rail)) return;
    HM.go('/payments/' + rail + '/review');
  };

  /* ---------- review ---------- */
  function reviewRows(d) {
    const kv = (k, v) => `<div class="kv"><span>${k}</span><b>${v}</b></div>`; const a = HM.acct(d.from); const from = kv('From', `${esc(a.nickname)} ${HM.mask(a.number)}`);
    const b = d.benef ? S().beneficiaries.find((x) => x.id === d.benef) : null;
    if (d.rail === 'ach_instant' || d.rail === 'ach_standard') return from + kv('To', esc(b.name)) + kv('Receiving bank', esc(b.bank)) + kv('Account', `${esc(b.type)} ${HM.mask(b.account)}`) + kv('Routing', b.routing) + kv('Description', esc(d.desc));
    if (d.rail === 'wire') return from + kv('Beneficiary', esc(d.name)) + kv('Receiving bank', esc(d.bank)) + kv('Routing number', d.routing) + kv('Account', HM.mask(d.account)) + kv('Purpose', esc(d.purpose));
    if (d.rail === 'check') return from + kv('Payee', esc(d.payee)) + kv('Issue date', HM.fmtDate(HM.parseDay(d.issueDate))) + kv('Check number', '#' + (S().seq.check + 1) + ' (assigned on issue)') + (d.memo ? kv('Memo', esc(d.memo)) : '');
    if (d.rail === 'internal') { const t = HM.acct(d.to); return from + kv('To', `${esc(t.nickname)} ${HM.mask(t.number)}`) + (d.desc ? kv('Description', esc(d.desc)) : ''); }
    if (d.rail === 'bill') { const bl = S().billers.find((x) => x.id === d.biller); return from + kv('Biller', esc(bl.name)) + kv('Account / reference', esc(bl.account || '—')) + kv('Payment date', HM.fmtDate(HM.parseDay(d.date))) + kv('Repeat', { once: 'One time', weekly: 'Weekly', biweekly: 'Every 2 weeks', monthly: 'Monthly' }[d.freq]) + (d.memo ? kv('Memo', esc(d.memo)) : ''); }
    return from;
  }
  function reviewPage(rail) {
    const d = HM._pay; if (!d || d.rail !== rail || !(d.amount > 0)) { HM.go('/payments/' + (rail === 'bill' ? 'bills/pay' : rail + '/new'), { replace: true }); return { html: '' }; }
    const info = RAIL_INFO[rail], a = HM.acct(d.from), fee = HM.RAILS[rail].fee || 0, total = HM.r2(d.amount + fee); const R = HM.RAILS[rail];
    const lim = R.limit ? HM.limitInfo(R.limit) : null, agg = R.agg ? HM.limitInfo('payments') : null;
    const future = rail === 'bill' && (d.date > HM.dayKey(new Date()) || d.freq !== 'once');
    return {
      title: 'Review',
      html: `${ui.header('Review ' + info.title.toLowerCase(), { back: rail === 'bill' ? '/payments/bills/pay' : '/payments/' + rail + '/new', sub: 'Check the details carefully' })}<div class="pad">
      <div class="card center"><div class="lbl">You’re sending</div><div class="big">${money(d.amount)}</div>${fee ? `<div class="sm mute">+ ${money(fee)} wire fee = <b>${money(total)}</b> total</div>` : ''}</div>
      ${frozenWarn(d.from)}
      <div class="card mt">${reviewRows(d)}<div class="kv"><span>Processing</span><b>${future ? 'Scheduled for ' + HM.fmtDate(HM.parseDay(d.date)) : esc(info.proc)}</b></div></div>
      ${a.status === 'frozen' ? '' : `<div class="card mt"><div class="lbl">Balance &amp; limits</div><div class="kv"><span>Available now</span><b>${money(a.available)}</b></div><div class="kv"><span>Available after</span><b>${money(HM.r2(a.available - total))}</b></div>${lim ? `<div class="lim"><div class="lim-h"><b>${HM.LIMIT_LABELS[R.limit]} daily limit</b><span>${money(HM.r2(lim.used + d.amount))} / ${money(lim.limit).replace('.00', '')}</span></div>${ui.progress(Math.round(((lim.used + d.amount) / lim.limit) * 100))}<div class="lim-f"><span>Used today ${money(lim.used)}</span><span>Left after ${money(Math.max(0, HM.r2(lim.left - d.amount)))}</span></div></div>` : ''}${agg ? `<div class="lim"><div class="lim-h"><b>All payments daily limit</b><span>${money(agg.left)} left</span></div>${ui.progress(Math.round(((agg.used + d.amount) / agg.limit) * 100))}</div>` : ''}</div>`}
      <div class="note warn">${icon('alert', 18)}<span>Make sure everything is correct. This is a simulated payment for a demo bank.</span></div>
      <div class="btns"><button class="btn btn-gold" id="payConfirm" data-act="payConfirm">${future ? 'Confirm & schedule' : 'Confirm & send'}</button><button class="btn btn-ghost" data-back="/payments">Edit details</button></div></div>`
    };
  }
  async function processing(labels) {
    const el = document.createElement('div'); el.className = 'proc'; el.innerHTML = `<div class="proc-in"><div class="proc-ring"></div><h3 id="procT">${labels[0]}</h3><p>Please don’t close or refresh this screen.</p></div>`; document.getElementById('app').appendChild(el);
    for (let i = 0; i < labels.length; i++) { el.querySelector('#procT').textContent = labels[i]; await new Promise((r) => setTimeout(r, 520)); }
    el.remove();
  }
  const buildReq = (d) => {
    const a = d.rail, b = d.benef ? S().beneficiaries.find((x) => x.id === d.benef) : null;
    if (a === 'ach_instant' || a === 'ach_standard') return { rail: a, from: d.from, amount: d.amount, desc: (a === 'ach_instant' ? 'Instant ACH to ' : 'ACH to ') + b.name, cat: 'Payments', meta: { benef: { name: b.name, bank: b.bank, routing: b.routing, account: b.account, type: b.type }, purpose: d.desc, sec: 'PPD' } };
    if (a === 'wire') return { rail: a, from: d.from, amount: d.amount, desc: 'Wire to ' + d.name, cat: 'Payments', meta: { benef: { name: d.name, bank: d.bank, routing: d.routing, account: d.account, type: 'checking' }, purpose: d.purpose, fedRef: 'FW' + HM.dayKey(new Date()).replace(/-/g, '') + String(Math.floor(Math.random() * 1e8)).padStart(8, '0') } };
    if (a === 'check') { const no = S().seq.check + 1; return { rail: a, from: d.from, amount: d.amount, desc: `Check #${no} · ${d.payee}`, cat: 'Payments', meta: { payee: d.payee, checkNo: no, memo: d.memo, issueDate: d.issueDate } }; }
    if (a === 'internal') return { rail: a, from: d.from, to: d.to, amount: d.amount, desc: 'Transfer', cat: 'Transfer', meta: { memo: d.desc } };
  };
  HM.acts.payConfirm = async (btn) => {
    if (btn.disabled) return; const d = HM._pay; if (!d) return HM.go('/payments');
    btn.disabled = true;
    if (d.rail === 'bill') return billConfirm(btn, d);
    const req = buildReq(d); req.idem = d.idem;
    await processing(['Verifying details…', 'Checking limits & balance…', 'Submitting payment…']);
    const res = HM.execute(req);
    if (res.duplicate) { HM._pay = null; return HM.go('/payments/result/' + res.tx.id, { replace: true }); }
    if (!res.ok && !res.blocked) { btn.disabled = false; ui.toast(res.error, 'err'); const p = document.querySelector('.pad'); if (p && !p.querySelector('.form-error')) { const e = document.createElement('div'); e.className = 'form-error'; e.innerHTML = icon('alert', 18) + '<span>' + esc(res.error) + '</span>'; p.prepend(e); } return; }
    if (res.ok) { if (d.rail === 'check') { S().seq.check += 1; HM.save(); } if (d.benef) { const b = S().beneficiaries.find((x) => x.id === d.benef); if (b) { b.lastUsed = new Date().toISOString(); HM.save(); } } }
    HM._pay = null; HM.go('/payments/result/' + res.tx.id, { replace: true });
  };

  /* ---------- result ---------- */
  HM.route('/payments/result/:key', 'payments', ({ key }) => {
    if (key.startsWith('sched-')) {
      const s = S().scheduled.find((x) => x.id === key.slice(6)); if (!s) return { html: '' };
      return { title: 'Scheduled', html: `<div class="pad done"><div class="okring info">${icon('calendar', 36)}</div><h2>Payment scheduled</h2><p class="mute">${money(s.amount)} to ${esc(s.payee)} will be paid on <b>${HM.fmtDate(HM.parseDay(s.next))}</b>${s.freq !== 'once' ? ', then repeat ' + s.freq : ''}.</p><div class="btns"><button class="btn btn-primary" data-go="/payments/scheduled">View scheduled payments</button><button class="btn btn-ghost" data-go="/payments">Done</button></div></div>` };
    }
    const t = S().txs.find((x) => x.id === key); if (!t) return { html: ui.header('Result', { back: '/payments' }) };
    const ok = ['completed', 'pending'].includes(t.status), a = HM.acct(t.acct), R = HM.RAILS[t.rail] || {};
    const bt = { completed: ['check', 'ok', 'Payment sent'], pending: ['clock', 'wait', 'Payment submitted'], blocked: ['snow', 'bad', 'Payment blocked'], failed: ['x', 'bad', 'Payment failed'], declined: ['x', 'bad', 'Declined'] }[t.status] || ['info', 'ok', 'Done'];
    return {
      title: bt[2],
      html: `<div class="pad done"><div class="okring ${ok ? (t.status === 'pending' ? 'wait' : '') : 'bad'}">${icon(bt[0], 38)}</div><h2>${bt[2]}</h2>
      <p class="mute">${t.status === 'completed' ? `${money(Math.abs(t.amount))} was sent${t.rail === 'internal' ? '' : ' from ' + esc(a.nickname)}.` : t.status === 'pending' ? `${money(Math.abs(t.amount))} is pending and will post automatically in about ${Math.round(HM.PENDING_MS / 1000)} seconds (demo rule).` : esc(t.reason || 'No money was moved.')}</p>
      ${t.status === 'blocked' ? `<div class="note bad left">${icon('snow', 18)}<span>${esc(a.nickname)} is frozen. This attempt was recorded as a <b>blocked demo attempt</b> and your balance did <b>not</b> change. Unfreeze the account in Accounts › Account controls to send again.</span></div>` : ''}
      <div class="card left mt"><div class="kv"><span>Type</span><b>${esc(R.label)}</b></div><div class="kv"><span>Amount</span><b>${money(Math.abs(t.amount))}</b></div>${t.fee ? `<div class="kv"><span>Fee</span><b>${money(t.fee)}</b></div>` : ''}<div class="kv"><span>Status</span><b>${ui.badge(t.status)}</b></div><div class="kv"><span>Reference</span><b>${esc(t.ref)}</b></div><div class="kv"><span>Date</span><b>${HM.fmtDT(t.date)}</b></div></div>
      <div class="btns"><button class="btn btn-primary" data-go="/receipt/${encodeURIComponent(t.ref)}">${icon('receipt', 20)} View receipt</button><button class="btn btn-ghost" data-go="/payments">Done</button>${t.status === 'blocked' ? `<button class="btn btn-ghost" data-go="/accounts/${a.id}/controls">${icon('snow', 18)} Account controls</button>` : ''}</div></div>`
    };
  });

  /* ---------- bill payments ---------- */
  const CATS_B = ['Housing', 'Utilities', 'Insurance', 'Phone & internet', 'Credit card', 'Loan', 'Education', 'Other'];
  HM.route('/payments/bills', 'payments', () => {
    const s = S(); const sch = s.scheduled.filter((x) => x.kind === 'bill' && x.status === 'active').sort((a, b) => a.next.localeCompare(b.next));
    const hist = HM.history().filter((t) => t.rail === 'bill').slice(0, 5);
    return {
      title: 'Bill payments',
      html: `${ui.header('Bill payments', { back: '/payments', sub: 'Pay, schedule and manage billers' })}<div class="pad"><button class="btn btn-primary" data-go="/payments/bills/pay">${icon('bill', 20)} Pay a bill</button></div>
      ${ui.section('Saved billers', ui.link('Manage', '/payments/bills/manage'), s.billers.length ? `<div class="group">${s.billers.map((b) => ui.row({ icon: 'bill', title: b.name, sub: b.category + (b.account ? ' · ' + b.account : ''), go: '/payments/bills/pay?biller=' + b.id })).join('')}</div>` : ui.card(ui.empty('bill', 'No billers yet', 'Add a biller to start paying bills.', '<button class="btn btn-primary" data-act="billerForm">Add biller</button>')))}
      ${ui.section('Scheduled & recurring', ui.link('All', '/payments/scheduled'), sch.length ? `<div class="group">${sch.map((x) => ui.row({ icon: 'calendar', tone: 'gold', title: x.payee, sub: HM.relDay(HM.parseDay(x.next)) + ' · ' + (x.freq === 'once' ? 'One time' : 'Repeats ' + x.freq), right: money(x.amount), go: '/payments/scheduled' })).join('')}</div>` : ui.card(ui.empty('calendar', 'Nothing scheduled', 'Schedule or repeat a bill payment.')))}
      ${ui.section('Payment history', ui.link('All bills', '/payments/history?rail=bill'), hist.length ? `<div class="group">${hist.map((t) => ui.txRow(t)).join('')}</div>` : ui.card(ui.empty('receipt', 'No bill payments yet', '')))}`
    };
  });
  HM.route('/payments/bills/manage', 'payments', () => ({
    title: 'Manage billers',
    html: `${ui.header('Saved billers', { back: '/payments/bills', right: `<button class="iconbtn" data-act="billerForm" aria-label="Add biller">${icon('plus', 20)}</button>` })}<div class="pad">${S().billers.length ? `<div class="group">${S().billers.map((b) => ui.row({ icon: 'bill', title: b.name, sub: b.category + (b.account ? ' · ' + b.account : ''), act: 'billerForm', arg: b.id })).join('')}</div>` : ui.card(ui.empty('bill', 'No billers saved', 'Add your first biller.', '<button class="btn btn-primary" data-act="billerForm">Add biller</button>'))}</div>`
  }));
  HM.acts.billerForm = (b, id) => {
    const x = id ? S().billers.find((y) => y.id === id) : null;
    ui.sheet(`<h3 class="sh-title">${x ? 'Edit biller' : 'Add biller'}</h3><form data-form="biller" data-id="${x ? x.id : ''}" novalidate>${ui.field({ name: 'name', label: 'Biller name', value: x ? x.name : '', maxlength: 50 })}${ui.select({ name: 'category', label: 'Category', value: x ? x.category : 'Utilities', options: CATS_B.map((c) => [c, c]) })}${ui.field({ name: 'account', label: 'Account or reference number', value: x ? x.account : '', maxlength: 30, optional: true })}<div class="sh-actions"><button class="btn btn-primary" type="submit">${x ? 'Save biller' : 'Add biller'}</button>${x ? '<button class="btn btn-ghost" type="button" data-act="billerDel" data-arg="' + x.id + '">Remove biller</button>' : ''}<button class="btn btn-ghost" type="button" data-act="closeSheet">Cancel</button></div></form>`);
  };
  HM.forms.biller = (f, d) => {
    const name = d.name.trim(); if (name.length < 2) return ui.fail(f, 'Enter the biller’s name.', 'name');
    const s = S(); if (s.billers.some((b) => b.id !== f.dataset.id && b.name.toLowerCase() === name.toLowerCase() && (b.account || '') === (d.account || '').trim())) return ui.fail(f, 'You already saved this biller.', 'name');
    if (f.dataset.id) Object.assign(s.billers.find((b) => b.id === f.dataset.id), { name, category: d.category, account: d.account.trim() }); else s.billers.push({ id: HM.uid('bl'), name, category: d.category, account: d.account.trim(), address: '' });
    HM.save(); ui.closeSheet(); HM.refresh(true); ui.toast('Biller saved');
  };
  HM.acts.billerDel = async (b, id) => { ui.closeSheet(); const x = S().billers.find((y) => y.id === id); const inUse = S().scheduled.some((s) => s.billerId === id && s.status === 'active'); if (await ui.confirm({ title: 'Remove ' + x.name + '?', body: inUse ? 'Active scheduled payments to this biller will also be cancelled.' : 'You can add it again at any time.', ok: 'Remove', danger: true })) { S().scheduled.forEach((s) => { if (s.billerId === id && s.status === 'active') s.status = 'cancelled'; }); S().billers = S().billers.filter((y) => y.id !== id); HM.save(); HM.refresh(true); ui.toast('Biller removed'); } };
  HM.route('/payments/bills/pay', 'payments', () => {
    const s = S(); if (!s.billers.length) return { html: ui.header('Pay a bill', { back: '/payments/bills' }) + '<div class="pad">' + ui.card(ui.empty('bill', 'Add a biller first', 'You need a saved biller to pay a bill.', '<button class="btn btn-primary" data-act="billerForm">Add biller</button>')) + '</div>' };
    const d = draftFor('bill'); const q = fromQ(); if (q.get('biller')) d.biller = q.get('biller'); if (!d.date) d.date = HM.dayKey(new Date()); if (!d.freq) d.freq = 'once'; if (!d.from || d.from === 'chk1') d.from = d.from || 'chk2';
    return {
      title: 'Pay a bill',
      html: `${ui.header('Pay a bill', { back: '/payments/bills' })}<div class="pad"><div id="frzSlot">${frozenWarn(d.from)}</div><form data-form="billNew" novalidate>
        ${ui.select({ name: 'biller', label: 'Biller', value: d.biller || s.billers[0].id, options: s.billers.map((b) => [b.id, b.name + (b.account ? ' · ' + b.account : '')]) })}<button type="button" class="lnk" data-act="billerForm">+ Add a new biller</button>
        ${ui.select({ name: 'from', label: 'Pay from', value: d.from, options: ui.acctOptions() })}${ui.field({ name: 'amount', label: 'Payment amount', money: true, inputmode: 'decimal', value: d.amount, placeholder: '0.00' })}
        ${ui.field({ name: 'date', label: 'Payment date', type: 'date', value: d.date, min: HM.dayKey(new Date()), hint: 'Choose today to pay now, or a later date to schedule it.' })}
        ${ui.select({ name: 'freq', label: 'Repeat', value: d.freq, options: [['once', 'One time'], ['weekly', 'Weekly'], ['biweekly', 'Every 2 weeks'], ['monthly', 'Monthly']] })}${ui.field({ name: 'memo', label: 'Memo', value: d.memo || '', maxlength: 50, optional: true })}
        <button class="btn btn-primary mt2" type="submit">Review payment</button></form></div>`
    };
  });
  HM.forms.billNew = (f, data) => {
    const d = draftFor('bill'), amt = HM.parseAmt(data.amount), today = HM.dayKey(new Date()), a = HM.acct(data.from);
    if (isNaN(amt) || amt <= 0) return ui.fail(f, 'Enter the amount to pay, like 85.00.', 'amount'); if (!data.date) return ui.fail(f, 'Choose a payment date.', 'date'); if (data.date < today) return ui.fail(f, 'Payment date can’t be in the past.', 'date');
    const max = HM.dayKey(new Date(Date.now() + 366 * 864e5)); if (data.date > max) return ui.fail(f, 'Payments can be scheduled up to one year ahead.', 'date');
    if (data.date === today && data.freq === 'once' && !checkFunds(f, a, amt, 0, 'bill')) return;
    Object.assign(d, { from: data.from, biller: data.biller, amount: amt, date: data.date, freq: data.freq, memo: (data.memo || '').trim() }); HM.go('/payments/bill/review');
  };
  HM.route('/payments/bill/review', 'payments', () => reviewPage('bill'));
  async function billConfirm(btn, d) {
    const bl = S().billers.find((x) => x.id === d.biller); const today = HM.dayKey(new Date());
    await processing(['Verifying details…', 'Checking limits & balance…', 'Submitting payment…']);
    if (d.date === today && d.freq === 'once') {
      const res = HM.execute({ rail: 'bill', from: d.from, amount: d.amount, desc: 'Bill payment · ' + bl.name, cat: bl.category === 'Housing' ? 'Housing' : 'Utilities', idem: d.idem, meta: { biller: bl.name, billerAcct: bl.account, memo: d.memo, paymentDate: d.date } });
      if (res.duplicate) { HM._pay = null; return HM.go('/payments/result/' + res.tx.id, { replace: true }); }
      if (!res.ok && !res.blocked) { btn.disabled = false; return ui.toast(res.error, 'err'); }
      HM._pay = null; return HM.go('/payments/result/' + res.tx.id, { replace: true });
    }
    const id = HM.uid('s'); S().scheduled.push({ id, kind: 'bill', from: d.from, payee: bl.name, billerId: bl.id, cat: bl.category === 'Housing' ? 'Housing' : 'Utilities', amount: d.amount, freq: d.freq, next: d.date, memo: d.memo, status: 'active', created: new Date().toISOString() });
    HM.save(); HM._pay = null;
    if (d.date === today) { HM.processDue(); const t = HM.history().find((x) => x.rail === 'bill' && x.desc === 'Bill payment · ' + bl.name); if (t) return HM.go('/payments/result/' + t.id, { replace: true }); }
    HM.go('/payments/result/sched-' + id, { replace: true });
  }

  /* ---------- beneficiaries ---------- */
  let bq = '';
  HM.acts.benQ = (b, a) => { bq = a.slice(2); HM.refresh(true); };
  HM.route('/payments/beneficiaries', 'payments', () => {
    const s = S(); const list = s.beneficiaries.filter((b) => !bq || (b.name + ' ' + (b.nick || '') + ' ' + b.bank).toLowerCase().includes(bq.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));
    const rec = s.beneficiaries.filter((b) => b.lastUsed).sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed)).slice(0, 4);
    return {
      title: 'Beneficiaries',
      html: `${ui.header('Beneficiaries', { back: '/payments', right: `<button class="iconbtn" data-go="/payments/beneficiaries/new" aria-label="Add beneficiary">${icon('plus', 20)}</button>` })}<div class="pad">
      ${rec.length ? `<div class="lbl">Recent recipients</div><div class="hscroll slim">${rec.map((b) => `<button class="rcp" data-go="/payments/beneficiaries/${b.id}"><span class="avatar sm">${esc(b.name[0])}</span><b>${esc(b.nick || b.name.split(' ')[0])}</b></button>`).join('')}</div>` : ''}
      <div class="searchbar">${icon('search', 18)}<input type="search" placeholder="Search beneficiaries" value="${esc(bq)}" data-live="benQ" data-key="q" aria-label="Search beneficiaries"></div>
      ${list.length ? `<div class="group">${list.map((b) => ui.row({ icon: 'user', title: b.name, sub: `${b.bank} · ${HM.mask(b.account)}`, go: '/payments/beneficiaries/' + b.id })).join('')}</div>` : ui.card(ui.empty('users', bq ? 'No matches' : 'No saved beneficiaries', bq ? 'Try another search.' : 'Add someone to pay them faster next time.', bq ? '' : '<button class="btn btn-primary" data-go="/payments/beneficiaries/new">Add beneficiary</button>'))}</div>`
    };
  });
  HM.route('/payments/beneficiaries/new', 'payments', () => benForm());
  HM.route('/payments/beneficiaries/:id', 'payments', ({ id }) => {
    const b = S().beneficiaries.find((x) => x.id === id); if (!b) return { html: ui.header('Beneficiary', { back: '/payments/beneficiaries' }) + '<div class="pad">' + ui.card(ui.empty('alert', 'Beneficiary not found', '')) + '</div>' };
    return {
      title: b.name,
      html: `${ui.header(b.name, { back: '/payments/beneficiaries', sub: b.nick || 'Beneficiary' })}<div class="pad"><div class="card center"><span class="avatar lg">${esc(b.name[0])}</span><h2 class="mt">${esc(b.name)}</h2>${b.sample ? '<span class="disc">Sample data</span>' : ''}</div>
      <div class="card mt"><div class="kv"><span>Bank</span><b>${esc(b.bank)}</b></div><div class="kv"><span>Routing number</span><b>${b.routing}</b></div><div class="kv"><span>Account</span><b>${esc(b.type)} ${HM.mask(b.account)}</b></div>${b.email ? `<div class="kv"><span>Email</span><b>${esc(b.email)}</b></div>` : ''}<div class="kv"><span>Added</span><b>${HM.fmtDate(b.created)}</b></div><div class="kv"><span>Last paid</span><b>${b.lastUsed ? HM.fmtDate(b.lastUsed) : 'Never'}</b></div></div>
      <div class="btns"><button class="btn btn-primary" data-go="/payments/ach_instant/new?benef=${b.id}">${icon('zap', 18)} Send Instant ACH</button><div class="btns two" style="margin:0"><button class="btn btn-ghost" data-go="/payments/ach_standard/new?benef=${b.id}">Standard ACH</button><button class="btn btn-ghost" data-go="/payments/beneficiaries/${b.id}/edit">${icon('edit', 18)} Edit</button></div><button class="btn btn-ghost danger-t" data-act="benDel" data-arg="${b.id}">${icon('trash', 18)} Remove beneficiary</button></div></div>`
    };
  });
  HM.route('/payments/beneficiaries/:id/edit', 'payments', ({ id }) => benForm(id));
  function benForm(id) {
    const b = id ? S().beneficiaries.find((x) => x.id === id) : null; const ret = fromQ().get('return') || '';
    return {
      title: b ? 'Edit beneficiary' : 'Add beneficiary',
      html: `${ui.header(b ? 'Edit beneficiary' : 'Add beneficiary', { back: b ? '/payments/beneficiaries/' + id : ret ? '/payments/' + ret + '/new' : '/payments/beneficiaries' })}<div class="pad"><form data-form="ben" data-id="${b ? b.id : ''}" data-return="${esc(ret)}" novalidate>
      ${ui.field({ name: 'name', label: 'Full name or business name', value: b ? b.name : '', maxlength: 60 })}${ui.field({ name: 'nick', label: 'Nickname', value: b ? b.nick : '', maxlength: 24, optional: true })}${ui.field({ name: 'bank', label: 'Bank name', value: b ? b.bank : '', maxlength: 60 })}
      ${ui.field({ name: 'routing', label: 'ABA routing number', value: b ? b.routing : '', digits: true, inputmode: 'numeric', maxlength: 9, placeholder: '9 digits' })}
      ${ui.field({ name: 'account', label: b ? 'Account number' : 'Account number', value: '', digits: true, inputmode: 'numeric', maxlength: 17, placeholder: b ? 'Leave blank to keep ' + HM.mask(b.account) : '', hint: 'Fictional/demo account numbers only. Never enter a real account number.' })}
      ${b ? '' : ui.field({ name: 'account2', label: 'Confirm account number', value: '', digits: true, inputmode: 'numeric', maxlength: 17 })}
      ${ui.select({ name: 'type', label: 'Account type', value: b ? b.type : 'checking', options: [['checking', 'Checking'], ['savings', 'Savings']] })}${ui.field({ name: 'email', label: 'Email for notifications', type: 'email', inputmode: 'email', value: b ? b.email : '', optional: true })}
      <button class="btn btn-primary mt2" type="submit">${b ? 'Save changes' : 'Save beneficiary'}</button></form></div>`
    };
  }
  HM.forms.ben = (f, d) => {
    const id = f.dataset.id, s = S(); const name = d.name.trim();
    if (name.length < 2) return ui.fail(f, 'Enter the beneficiary’s name.', 'name'); if (d.bank.trim().length < 2) return ui.fail(f, 'Enter the bank’s name.', 'bank');
    if (!HM.abaValid(d.routing)) return ui.fail(f, 'That routing number isn’t valid. It must be 9 digits and pass the ABA check.', 'routing');
    const acct = d.account || (id ? s.beneficiaries.find((x) => x.id === id).account : '');
    if (acct.length < 6 || acct.length > 17) return ui.fail(f, 'Account numbers have 6–17 digits.', 'account');
    if (!id && d.account !== d.account2) return ui.fail(f, 'The account numbers don’t match.', 'account2');
    if (d.email && !EMAIL_RE.test(d.email.trim())) return ui.fail(f, 'Enter a valid email address or leave it blank.', 'email');
    if (s.beneficiaries.some((b) => b.id !== id && b.routing === d.routing && b.account === acct)) return ui.fail(f, 'This beneficiary is already saved.', 'account');
    if (id) Object.assign(s.beneficiaries.find((x) => x.id === id), { name, nick: d.nick.trim(), bank: d.bank.trim(), routing: d.routing, account: acct, type: d.type, email: (d.email || '').trim() });
    else { const nb = { id: HM.uid('b'), name, nick: d.nick.trim(), bank: d.bank.trim(), routing: d.routing, account: acct, type: d.type, email: (d.email || '').trim(), created: new Date().toISOString(), lastUsed: '' }; s.beneficiaries.push(nb); if (f.dataset.return) { HM.save(); ui.toast('Beneficiary saved'); if (HM._pay) HM._pay.benef = nb.id; return HM.back('/payments/' + f.dataset.return + '/new'); } }
    HM.save(); ui.toast('Beneficiary saved'); HM.back('/payments/beneficiaries');
  };
  HM.acts.benDel = async (b, id) => { const x = S().beneficiaries.find((y) => y.id === id); if (await ui.confirm({ title: 'Remove ' + x.name + '?', body: 'They’ll be removed from your saved beneficiaries. Past payments and receipts are kept.', ok: 'Remove', danger: true })) { S().beneficiaries = S().beneficiaries.filter((y) => y.id !== id); HM.save(); ui.toast('Beneficiary removed'); HM.go('/payments/beneficiaries', { replace: true }); } };

  /* ---------- scheduled payments ---------- */
  const FREQ = { once: 'One time', weekly: 'Weekly', biweekly: 'Every 2 weeks', monthly: 'Monthly' };
  HM.route('/payments/scheduled', 'payments', () => {
    const all = S().scheduled.slice().sort((a, b) => a.next.localeCompare(b.next)); const act = all.filter((x) => x.status === 'active'), past = all.filter((x) => x.status !== 'active');
    const row = (x) => ui.row({ icon: x.kind === 'internal' ? 'swap' : x.kind === 'bill' ? 'bill' : 'repeat', tone: 'gold', title: x.payee, sub: `${HM.acct(x.from).nickname} · ${x.status === 'active' ? HM.relDay(HM.parseDay(x.next)) : esc(x.status)} · ${FREQ[x.freq]}`, right: money(x.amount), act: x.status === 'active' ? 'schedOpen' : '', arg: x.id, noChev: x.status !== 'active' });
    return {
      title: 'Scheduled payments',
      html: `${ui.header('Scheduled payments', { back: '/payments', right: `<button class="iconbtn" data-go="/payments/scheduled/new" aria-label="Create scheduled payment">${icon('plus', 20)}</button>` })}<div class="pad">
      ${act.length ? `<div class="lbl">Upcoming</div><div class="group mt">${act.map(row).join('')}</div>` : ui.card(ui.empty('calendar', 'No upcoming payments', 'Schedule a bill, transfer or ACH payment.', '<button class="btn btn-primary" data-go="/payments/scheduled/new">Create scheduled payment</button>'))}
      ${act.filter((x) => x.freq !== 'once').length ? `<div class="lbl mt2">Recurring</div><div class="note">${icon('repeat', 18)}<span>${act.filter((x) => x.freq !== 'once').map((x) => esc(x.payee) + ' (' + FREQ[x.freq].toLowerCase() + ')').join(' · ')}</span></div>` : ''}
      ${past.length ? `<div class="lbl mt2">Cancelled & completed</div><div class="group mt">${past.map(row).join('')}</div>` : ''}</div>`
    };
  });
  HM.acts.schedOpen = (b, id) => {
    const x = S().scheduled.find((s) => s.id === id);
    ui.sheet(`<h3 class="sh-title">${esc(x.payee)}</h3><p class="sh-body">${money(x.amount)} · ${FREQ[x.freq]} · next ${HM.fmtDate(HM.parseDay(x.next))}<br>From ${esc(HM.acct(x.from).nickname)}</p><div class="sh-actions"><button class="btn btn-primary" data-go="/payments/scheduled/${id}/edit">${icon('edit', 18)} Edit payment</button><button class="btn btn-ghost danger-t" data-act="schedCancel" data-arg="${id}">Cancel payment</button><button class="btn btn-ghost" data-act="closeSheet">Close</button></div>`);
  };
  HM.acts.schedCancel = async (b, id) => { ui.closeSheet(); const x = S().scheduled.find((s) => s.id === id); if (await ui.confirm({ title: 'Cancel this payment?', body: `${esc(x.payee)} (${money(x.amount)}) will no longer be paid${x.freq !== 'once' ? ' and will stop repeating' : ''}.`, ok: 'Cancel payment', cancel: 'Keep it', danger: true })) { x.status = 'cancelled'; HM.save(); HM.refresh(true); ui.toast('Scheduled payment cancelled'); } };
  let sk = 'bill';
  HM.acts.schedKind = (b, k) => { sk = k; HM.refresh(true); };
  HM.route('/payments/scheduled/new', 'payments', () => {
    const s = S(); const today = HM.dayKey(new Date()); const tom = HM.dayKey(new Date(Date.now() + 864e5));
    let target = '';
    if (sk === 'bill') target = s.billers.length ? ui.select({ name: 'target', label: 'Biller', value: '', options: s.billers.map((b) => [b.id, b.name]) }) : `<div class="note warn">${icon('alert', 18)}<span>Add a biller first in Bill payments.</span></div>`;
    else if (sk === 'ach') target = s.beneficiaries.length ? ui.select({ name: 'target', label: 'Beneficiary', value: '', options: s.beneficiaries.map((b) => [b.id, b.name + ' ' + HM.mask(b.account)]) }) : `<div class="note warn">${icon('alert', 18)}<span>Add a beneficiary first.</span></div>`;
    else target = ui.select({ name: 'target', label: 'To account', value: 'sav1', options: ui.acctOptions() });
    return {
      title: 'New scheduled payment',
      html: `${ui.header('New scheduled payment', { back: '/payments/scheduled' })}<div class="pad">${ui.seg([['bill', 'Bill'], ['ach', 'Standard ACH'], ['internal', 'Transfer']], sk, 'schedKind')}
      <form data-form="schedNew" novalidate>${ui.select({ name: 'from', label: 'Pay from', value: 'chk1', options: ui.acctOptions() })}${target}${ui.field({ name: 'amount', label: 'Amount', money: true, inputmode: 'decimal', placeholder: '0.00' })}${ui.field({ name: 'next', label: 'First payment date', type: 'date', value: tom, min: today })}${ui.select({ name: 'freq', label: 'Repeat', value: 'monthly', options: Object.entries(FREQ) })}${ui.field({ name: 'memo', label: 'Memo', maxlength: 50, optional: true })}<button class="btn btn-primary mt2" type="submit">Create scheduled payment</button></form></div>`
    };
  });
  HM.forms.schedNew = (f, d) => {
    const s = S(), amt = HM.parseAmt(d.amount), today = HM.dayKey(new Date());
    if (!d.target) return ui.fail(f, 'Choose who or where to pay.', 'target'); if (sk === 'internal' && d.target === d.from) return ui.fail(f, 'Choose two different accounts.', 'target');
    if (isNaN(amt) || amt <= 0) return ui.fail(f, 'Enter an amount greater than $0.00.', 'amount'); if (!d.next || d.next < today) return ui.fail(f, 'Choose today or a future date.', 'next');
    const x = { id: HM.uid('s'), kind: sk === 'ach' ? 'ach_standard' : sk, from: d.from, amount: amt, freq: d.freq, next: d.next, memo: (d.memo || '').trim(), status: 'active', created: new Date().toISOString() };
    if (sk === 'bill') { const b = s.billers.find((y) => y.id === d.target); x.payee = b.name; x.billerId = b.id; x.cat = b.category === 'Housing' ? 'Housing' : 'Utilities'; }
    else if (sk === 'ach') { const b = s.beneficiaries.find((y) => y.id === d.target); x.payee = b.name; x.benef = { name: b.name, bank: b.bank, routing: b.routing, account: b.account, type: b.type }; }
    else { x.to = d.target; x.payee = HM.acct(d.target).nickname; }
    s.scheduled.push(x); HM.save(); HM.processDue(); ui.toast('Scheduled payment created'); HM.back('/payments/scheduled');
  };
  HM.route('/payments/scheduled/:id/edit', 'payments', ({ id }) => {
    const x = S().scheduled.find((s) => s.id === id); if (!x) return { html: ui.header('Edit', { back: '/payments/scheduled' }) };
    return { title: 'Edit scheduled payment', html: `${ui.header('Edit scheduled payment', { back: '/payments/scheduled', sub: x.payee })}<div class="pad"><form data-form="schedEdit" data-id="${id}" novalidate>${ui.select({ name: 'from', label: 'Pay from', value: x.from, options: ui.acctOptions() })}${ui.field({ name: 'amount', label: 'Amount', money: true, inputmode: 'decimal', value: String(x.amount) })}${ui.field({ name: 'next', label: 'Next payment date', type: 'date', value: x.next, min: HM.dayKey(new Date()) })}${ui.select({ name: 'freq', label: 'Repeat', value: x.freq, options: Object.entries(FREQ) })}${ui.field({ name: 'memo', label: 'Memo', value: x.memo || '', maxlength: 50, optional: true })}<button class="btn btn-primary mt2" type="submit">Save changes</button></form><button class="btn btn-ghost danger-t mt" data-act="schedCancel" data-arg="${id}">Cancel this payment</button></div>` };
  });
  HM.forms.schedEdit = (f, d) => {
    const x = S().scheduled.find((s) => s.id === f.dataset.id), amt = HM.parseAmt(d.amount);
    if (isNaN(amt) || amt <= 0) return ui.fail(f, 'Enter an amount greater than $0.00.', 'amount'); if (!d.next || d.next < HM.dayKey(new Date())) return ui.fail(f, 'Choose today or a future date.', 'next');
    Object.assign(x, { from: d.from, amount: amt, next: d.next, freq: d.freq, memo: (d.memo || '').trim() }); HM.save(); ui.toast('Changes saved'); HM.back('/payments/scheduled');
  };

  /* ---------- payment history ---------- */
  const ph = { rail: 'all' }; let phF = { q: '', type: 'all', status: 'all', from: '', to: '', min: '', max: '' };
  HM.acts.phf = (b, arg) => { const i = arg.indexOf(':'); phF[arg.slice(0, i)] = arg.slice(i + 1); HM.refresh(true); };
  HM.acts.phRail = (b, r) => { ph.rail = r; HM.refresh(true); };
  HM.route('/payments/history', 'payments', () => {
    const q = fromQ(); if (q.get('rail')) { ph.rail = q.get('rail'); }
    const groups = { all: PAY_RAILS, ach: ['ach_instant', 'ach_standard'], ach_instant: ['ach_instant'], ach_standard: ['ach_standard'], wire: ['wire'], check: ['check'], bill: ['bill'], internal: ['internal'] };
    const base = HM.history().filter((t) => (groups[ph.rail] || PAY_RAILS).includes(t.rail) && (t.amount < 0 || t.status === 'blocked')); const list = ui.applyFilter(base, phF);
    return {
      title: 'Payment history',
      html: `${ui.header('Payment history', { back: '/payments', sub: 'Receipts & details' })}<div class="pad"><div class="chips">${[['all', 'All payments'], ['ach', 'ACH'], ['wire', 'Wires'], ['check', 'Checks'], ['bill', 'Bills'], ['internal', 'Transfers']].map((c) => `<button class="chip ${ph.rail === c[0] ? 'on' : ''}" data-act="phRail" data-arg="${c[0]}">${c[1]}</button>`).join('')}</div>
      <details class="filters"><summary>${icon('filter', 16)} Search &amp; filters</summary>${ui.txFilterUI(phF, 'phf')}</details>
      <div class="sm mute" style="margin:2px 0 8px">${list.length} payment${list.length === 1 ? '' : 's'}</div>${list.length ? `<div class="group">${ui.groupByDay(list.slice(0, 80), { acct: true })}</div>` : ui.card(ui.empty('receipt', 'No payments found', 'Try a different filter.'))}</div>`
    };
  });

  /* ---------- limits ---------- */
  HM.route('/payments/limits', 'payments', () => {
    const keys = ['ach_instant', 'ach_standard', 'wire', 'check', 'withdrawal', 'deposit', 'payments'];
    return {
      title: 'Daily limits',
      html: `${ui.header('Daily limits', { back: '/payments', sub: 'Resets every day at midnight', right: `<button class="iconbtn" data-act="limitsEdit" aria-label="Edit limits">${icon('edit', 20)}</button>` })}<div class="pad">
      ${keys.map((k) => { const L = HM.limitInfo(k); return `<div class="card"><div class="lim-h"><b>${HM.LIMIT_LABELS[k]}</b><span>${money(L.limit).replace('.00', '')}</span></div>${ui.progress(L.pct)}<div class="lim-f"><span>Used ${money(L.used)}</span><span>Remaining ${money(L.left)}</span></div>${L.pct >= 100 ? `<div class="note bad">${icon('alert', 18)}<span>Limit reached. New ${HM.LIMIT_LABELS[k].toLowerCase()} payments will be declined until tomorrow.</span></div>` : L.pct >= 80 ? `<div class="note warn">${icon('alert', 18)}<span>You’ve used ${L.pct}% of this limit.</span></div>` : ''}</div>`; }).join('')}
      <div class="note">${icon('info', 18)}<span>For this educational demo you can change the limits to test warnings and blocks.</span></div><div class="btns two"><button class="btn btn-primary" data-act="limitsEdit">Configure limits</button><button class="btn btn-ghost" data-act="limitsReset">Reset defaults</button></div></div>`
    };
  });
  HM.acts.limitsEdit = () => ui.sheet(`<h3 class="sh-title">Configure daily limits</h3><p class="sh-body">Demo settings. Amounts are per day.</p><form data-form="limits" novalidate>${Object.keys(HM.DEFAULT_LIMITS).map((k) => ui.field({ name: k, label: HM.LIMIT_LABELS[k], money: true, inputmode: 'decimal', value: String(S().limits[k]) })).join('')}<div class="sh-actions"><button class="btn btn-primary" type="submit">Save limits</button><button class="btn btn-ghost" type="button" data-act="closeSheet">Cancel</button></div></form>`);
  HM.forms.limits = (f, d) => {
    const out = {}; for (const k of Object.keys(HM.DEFAULT_LIMITS)) { const v = HM.parseAmt(d[k]); if (isNaN(v) || v < 1 || v > 250000) return ui.fail(f, 'Enter an amount between $1 and $250,000.', k); out[k] = v; }
    Object.assign(S().limits, out); HM.save(); ui.closeSheet(); HM.refresh(true); ui.toast('Limits updated');
  };
  HM.acts.limitsReset = async () => { if (await ui.confirm({ title: 'Reset limits?', body: 'Daily limits return to their default demo values.', ok: 'Reset' })) { S().limits = Object.assign({}, HM.DEFAULT_LIMITS); HM.save(); HM.refresh(true); ui.toast('Limits reset'); } };

  /* ---------- rail routes (registered last: generic patterns) ---------- */
  HM.route('/payments/:rail/new', 'payments', ({ rail }) => newPage(rail));
  HM.route('/payments/:rail/review', 'payments', ({ rail }) => reviewPage(rail));
})();

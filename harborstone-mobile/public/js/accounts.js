/* Harborstone Mobile — Accounts: overview, detail, info, controls, transactions, statements, documents, goals, spending, check deposit */
(function () {
  'use strict';
  const HM = window.HM, ui = HM.ui, esc = HM.esc, icon = HM.icon, money = HM.money;
  const RECEIPT_RAILS = ['ach_instant', 'ach_standard', 'wire', 'check', 'internal', 'bill', 'deposit'];
  const statusTone = (a) => (a.status === 'frozen' ? 'frz' : 'ok');
  const balAt = (acctId, ts) => { const a = HM.acct(acctId); return HM.r2(a.current - HM.state().txs.filter((t) => t.acct === acctId && t.status === 'completed' && new Date(t.date).getTime() >= ts).reduce((s, t) => s + HM.eff(t), 0)); };

  /* ---------- landing ---------- */
  HM.route('/accounts', 'accounts', () => {
    const S = HM.state(), T = HM.totals(), hidden = S.prefs.hideBalance; const frozen = S.accounts.filter((a) => a.status === 'frozen').length;
    const grp = (type, label) => { const l = S.accounts.filter((a) => a.type === type); return l.length ? `<div class="lbl sub-l">${label}</div>${l.map((a) => HM.acctCard(a, hidden).replace('class="acct', 'class="acct acct-wide')).join('')}` : ''; };
    return {
      title: 'Accounts',
      html: `${ui.header('Accounts', { back: false, sub: 'Manage your Harborstone accounts' })}
      <div class="pad"><div class="card total-card"><div class="lbl">Total combined balance</div><div class="big">${hidden ? '<span class="masked">••••••</span>' : money(T.current)}</div>
        <div class="kv3"><div><small>Checking (${S.accounts.filter((a) => a.type === 'checking').length})</small><b>${hidden ? '••••' : money(T.checking)}</b></div><div><small>Savings (${S.accounts.filter((a) => a.type === 'savings').length})</small><b>${hidden ? '••••' : money(T.savings)}</b></div></div>
        ${frozen ? `<div class="note warn">${icon('snow', 18)}<span>${frozen} account${frozen > 1 ? 's are' : ' is'} frozen. Outgoing payments are blocked until unfrozen.</span></div>` : ''}</div>
        ${grp('checking', 'Checking accounts')}${grp('savings', 'Savings accounts')}</div>
      ${ui.section('Manage', '', `<div class="tiles">${[['camera', 'Deposit Check', 'Mobile deposit', '/accounts/deposit'], ['receipt', 'Transactions', 'Search & filter', '/transactions'], ['file', 'Statements', 'Monthly & history', '/accounts/statements'], ['book', 'Documents', 'Agreements & forms', '/accounts/documents'], ['target', 'Savings goals', 'Track targets', '/accounts/goals'], ['chart', 'Spending insights', 'By category', '/accounts/spending'], ['snow', 'Freeze / unfreeze', 'Account controls', '/accounts/controls'], ['clock', 'Deposit history', 'Past deposits', '/accounts/deposit/history']].map((t) => `<button class="tile" data-go="${t[3]}"><span class="row-i navy">${icon(t[0], 20)}</span><b>${t[1]}</b><small>${t[2]}</small></button>`).join('')}</div>`)}`
    };
  });

  /* ---------- controls hub (choose account) ---------- */
  HM.route('/accounts/controls', 'accounts', () => ({
    title: 'Account controls',
    html: `${ui.header('Account controls', { back: '/accounts' })}<div class="pad"><p class="mute sm">Choose an account to freeze, unfreeze or manage.</p><div class="group mt">${HM.state().accounts.map((a) => ui.row({ icon: a.status === 'frozen' ? 'snow' : 'bank', tone: a.status === 'frozen' ? 'navy' : '', title: a.nickname, sub: a.type + ' ' + HM.mask(a.number), right: ui.badge(a.status), go: '/accounts/' + a.id + '/controls' })).join('')}</div></div>`
  }));

  /* ---------- transactions (shared list) ---------- */
  const filters = {}, shown = {};
  const F = (k) => (filters[k] = filters[k] || { q: '', type: 'all', status: 'all', from: '', to: '', min: '', max: '' });
  let scope = 'all';
  HM.acts.txf = (b, arg) => { const i = arg.indexOf(':'); const k = arg.slice(0, i), v = arg.slice(i + 1); F(scope)[k] = v; shown[scope] = 40; HM.refresh(true); };
  HM.acts.txMore = () => { shown[scope] = (shown[scope] || 40) + 40; HM.refresh(true); };
  HM.acts.txClear = () => { filters[scope] = null; HM.refresh(true); };
  function txListPage(key, acctId, back, title, sub) {
    scope = key; const f = F(key); const all = HM.history(acctId === 'all' ? null : acctId); const list = ui.applyFilter(all, f); const n = shown[key] || 40;
    const active = f.q || f.type !== 'all' || f.status !== 'all' || f.from || f.to || f.min || f.max;
    return {
      title,
      html: `${ui.header(title, { back, sub })}<div class="pad">${ui.txFilterUI(f, 'txf')}
      <div class="between sp sm mute" style="margin:4px 0 8px"><span>${list.length} transaction${list.length === 1 ? '' : 's'}</span>${active ? '<button class="lnk" data-act="txClear">Clear filters</button>' : ''}</div>
      ${list.length ? `<div class="group">${ui.groupByDay(list.slice(0, n), { acct: acctId === 'all' })}</div>${list.length > n ? `<button class="btn btn-ghost mt" data-act="txMore">Show more (${list.length - n} left)</button>` : ''}` : ui.card(ui.empty('search', 'No matching transactions', active ? 'Try changing or clearing your filters.' : 'Transactions will appear here.', active ? '<button class="btn btn-primary" data-act="txClear">Clear filters</button>' : ''))}</div>`
    };
  }
  HM.route('/transactions', 'accounts', () => txListPage('all', 'all', '/accounts', 'Transaction history', 'All accounts'));

  /* ---------- transaction detail ---------- */
  HM.route('/tx/:id', 'accounts', ({ id }) => {
    const t = HM.history().find((x) => x.id === id); if (!t) return { html: ui.header('Transaction', { back: '/transactions' }) + '<div class="pad">' + ui.card(ui.empty('alert', 'Transaction not found', 'It may have been reset.')) + '</div>' };
    const a = HM.acct(t.acct), credit = t.amount > 0, R = HM.RAILS[t.rail] || {}, m = t.meta || {};
    const bad = ['blocked', 'declined', 'failed'].includes(t.status);
    const kv = (k, v) => (v ? `<div class="kv"><span>${k}</span><b>${v}</b></div>` : '');
    const benef = m.benef ? `${esc(m.benef.name)}<br><small class="mute">${esc(m.benef.bank)} · ${HM.mask(m.benef.account)}</small>` : '';
    return {
      title: 'Transaction',
      html: `${ui.header('Transaction details', { back: '/transactions' })}<div class="pad">
      <div class="card center txd">${ui.catIcon(t.cat).replace('class="cat"', 'class="cat lg"')}<div class="lbl mt">${esc(t.desc)}</div><div class="big ${bad ? 'strike' : credit ? 'pos' : ''}">${credit ? '+' : '−'}${money(Math.abs(t.amount)).replace('−', '')}</div><div>${ui.badge(t.status)}</div><div class="sm mute mt">${HM.fmtDT(t.date)}</div></div>
      ${t.reason ? `<div class="note bad">${icon('alert', 18)}<span>${esc(t.reason)}${t.status === 'blocked' ? ' This is recorded as a <b>blocked demo attempt</b>; your balance was not reduced.' : ' No money was deducted.'}</span></div>` : ''}
      ${t.status === 'pending' ? `<div class="note warn">${icon('clock', 18)}<span>${credit ? 'Funds are not yet available.' : 'This amount is held against your available balance.'} Demo rule: pending items post about ${Math.round(HM.PENDING_MS / 1000)} seconds after submission.</span></div>` : ''}
      <div class="card mt">${kv('Type', esc(R.label || t.rail))}${kv('Category', esc(t.cat))}${kv('Account', esc(a.nickname) + ' ' + HM.mask(a.number))}${kv(credit ? 'From' : 'To', benef || esc(m.payee || m.biller || m.merchant || m.source || m.payer || ''))}${kv('Amount', money(Math.abs(t.amount)))}${t.fee ? kv('Fee', money(t.fee)) : ''}${kv('Purpose / memo', esc(m.purpose || m.memo || ''))}${m.checkNo ? kv('Check number', '#' + m.checkNo) : ''}${m.mode ? kv('Channel', esc(m.mode === 'pos' ? 'In store' : m.mode)) : ''}${kv('Reference', esc(t.ref || ''))}${t.status === 'completed' ? kv('Balance after', money(t.bal)) : ''}${t.settledAt ? kv('Posted', HM.fmtDT(t.settledAt)) : ''}${kv('Status', esc(t.status[0].toUpperCase() + t.status.slice(1)))}</div>
      <div class="btns">${RECEIPT_RAILS.includes(t.rail) && t.ref ? `<button class="btn btn-primary" data-go="/receipt/${encodeURIComponent(t.ref)}">${icon('receipt', 20)} View receipt</button>` : ''}<button class="btn btn-ghost" data-act="copyRef" data-arg="${esc(t.ref || '')}">${icon('copy', 18)} Copy reference</button></div></div>`
    };
  });
  HM.acts.copyRef = (b, ref) => ui.copy(ref, 'Reference copied');

  /* ---------- account detail ---------- */
  HM.route('/accounts/deposit', 'accounts', () => depositStart());
  HM.route('/accounts/deposit/front', 'accounts', () => depositCapture('front'));
  HM.route('/accounts/deposit/back', 'accounts', () => depositCapture('back'));
  HM.route('/accounts/deposit/review', 'accounts', () => depositReview());
  HM.route('/accounts/deposit/done/:id', 'accounts', ({ id }) => depositDone(id));
  HM.route('/accounts/deposit/history', 'accounts', () => depositHistory());
  HM.route('/accounts/statements', 'accounts', () => statementsHub());
  HM.route('/accounts/spending', 'accounts', () => spendingPage());
  HM.route('/accounts/goals', 'accounts', () => goalsPage());
  HM.route('/accounts/documents', 'accounts', () => docsPage());
  HM.route('/accounts/documents/:doc', 'accounts', ({ doc }) => docView(doc));

  HM.route('/accounts/:id', 'accounts', ({ id }) => {
    const a = HM.acct(id); if (!a) return { html: ui.header('Account', { back: '/accounts' }) + '<div class="pad">' + ui.card(ui.empty('alert', 'Account not found', '')) + '</div>' };
    const S = HM.state(), hidden = S.prefs.hideBalance, fr = a.status === 'frozen', sav = a.type === 'savings';
    const hist = HM.history(a.id); const recent = hist.slice(0, 6);
    const spark = [...hist.filter((t) => t.status === 'completed').slice(0, 40).map((t) => t.bal)].reverse();
    const yr = new Date().getFullYear(); const intYTD = HM.r2(S.txs.filter((t) => t.acct === a.id && t.rail === 'interest' && new Date(t.date).getFullYear() === yr).reduce((s, t) => s + t.amount, 0));
    const goalsSaved = HM.r2(S.goals.reduce((s, g) => s + g.saved, 0));
    return {
      title: a.nickname,
      html: `${ui.header(a.nickname, { back: '/accounts', sub: (sav ? 'Savings' : 'Checking') + ' · ' + HM.mask(a.number), right: `<button class="iconbtn" data-go="/accounts/${a.id}/info" aria-label="Account information">${icon('info', 20)}</button>` })}
      <div class="pad"><div class="card hero-card ${fr ? 'frozen' : ''}"><div class="between sp"><span class="lbl on-dark">${esc(a.name)}</span>${ui.badge(a.status)}</div>
        <div class="big on-dark">${hidden ? '<span class="masked">••••••</span>' : money(a.available)}</div><div class="sm on-dark-2">Available balance</div>
        <div class="kv3 dark"><div><small>Current balance</small><b>${hidden ? '••••' : money(a.current)}</b></div><div><small>${sav ? 'APY' : 'Pending holds'}</small><b>${sav ? a.apy.toFixed(2) + '%' : money(HM.r2(a.current - a.available))}</b></div></div>
        ${spark.length > 3 ? ui.spark(spark) : ''}</div>
        ${fr ? `<div class="note warn">${icon('snow', 18)}<span><b>Account frozen.</b> Outgoing ACH, wire, check, bill, transfer and withdrawal activity is blocked. <button class="lnk inl" data-go="/accounts/${a.id}/controls">Manage</button></span></div>` : ''}
        <div class="qa two mt">${[['swap', 'Transfer', '/payments/internal/new?from=' + a.id], ['send', 'Pay', '/payments'], ['camera', 'Deposit', '/accounts/deposit?to=' + a.id], ['file', 'Statements', '/accounts/' + a.id + '/statements']].map((q) => `<button data-go="${q[2]}"><span class="qi">${icon(q[0], 22)}</span>${q[1]}</button>`).join('')}</div></div>
      ${a.type === 'checking' ? ui.section('Account numbers', '', `<div class="card"><div class="kv"><span>Routing number</span><b>${a.routing} <button class="cp" data-act="copyTxt" data-arg="${a.routing}|Routing number" aria-label="Copy routing number">${icon('copy', 16)}</button></b></div><div class="kv"><span>Account number</span><b class="masked">${HM.mask(a.number)}</b></div><p class="hint">Demo numbers for a fictional bank. Open Account information to reveal and copy.</p></div>`) : `${ui.section('Interest', '', `<div class="card"><div class="kv"><span>Annual percentage yield</span><b>${a.apy.toFixed(2)}% APY</b></div><div class="kv"><span>Interest paid this year</span><b>${money(intYTD)}</b></div><div class="kv"><span>Estimated next payment</span><b>≈ ${money(HM.r2((a.current * a.apy) / 100 / 12))}</b></div><div class="kv"><span>Interest compounds / pays</span><b>Monthly</b></div><p class="hint">Simulated rate for demonstration. Rates are not real offers.</p></div>`)}
      ${ui.section('Savings goals', ui.link('Manage', '/accounts/goals'), S.goals.length ? `<div class="card">${S.goals.map((g) => `<div class="lim"><div class="lim-h"><b>${esc(g.name)}</b><span>${money(g.saved).replace('.00', '')} / ${money(g.target).replace('.00', '')}</span></div>${ui.progress(Math.round((g.saved / g.target) * 100), '')}</div>`).join('')}<p class="hint">${money(goalsSaved)} allocated of ${money(a.current)} in savings.</p></div>` : ui.card(ui.empty('target', 'No goals yet', 'Create a goal to track your progress.', '<button class="btn btn-primary" data-go="/accounts/goals">Create goal</button>')))}`}
      ${ui.section('Recent transactions', ui.link('Full history', '/accounts/' + a.id + '/transactions'), recent.length ? `<div class="group">${ui.groupByDay(recent)}</div>` : ui.card(ui.empty('receipt', 'No transactions yet', '')))}
      ${ui.section('Manage this account', '', `<div class="group">${[['info', 'Account information', 'Details, nickname, copy numbers', '/accounts/' + a.id + '/info'], ['receipt', 'Transaction history', 'Search & filter', '/accounts/' + a.id + '/transactions'], ['file', 'Statements & documents', 'Monthly statements', '/accounts/' + a.id + '/statements'], [fr ? 'unlock' : 'snow', fr ? 'Unfreeze account' : 'Freeze account', 'Account controls', '/accounts/' + a.id + '/controls'], ['sliders', 'Account preferences', 'Paperless & options', '/accounts/' + a.id + '/prefs'], ['bell', 'Account alerts', 'Balance & activity alerts', '/accounts/' + a.id + '/alerts']].map((r) => ui.row({ icon: r[0], title: r[1], sub: r[2], go: r[3] })).join('')}</div>`)}`
    };
  });
  HM.acts.copyTxt = (b, arg) => { const [v, l] = arg.split('|'); ui.copy(v, l || 'Copied'); };

  HM.route('/accounts/:id/transactions', 'accounts', ({ id }) => { const a = HM.acct(id); return txListPage('acct:' + id, id, '/accounts/' + id, 'Transaction history', a.nickname + ' ' + HM.mask(a.number)); });

  /* ---------- account info / rename ---------- */
  const revealed = {};
  HM.route('/accounts/:id/info', 'accounts', ({ id }) => {
    const a = HM.acct(id), sav = a.type === 'savings', rv = revealed[id];
    return {
      title: 'Account information',
      html: `${ui.header('Account information', { back: '/accounts/' + id, sub: a.nickname })}<div class="pad">
      <div class="card"><div class="kv"><span>Account name</span><b>${esc(a.name)}</b></div><div class="kv"><span>Nickname</span><b>${esc(a.nickname)} <button class="cp" data-act="renameAcct" data-arg="${id}" aria-label="Edit nickname">${icon('edit', 16)}</button></b></div><div class="kv"><span>Account type</span><b>${sav ? 'Savings' : 'Checking'} · Individual</b></div><div class="kv"><span>Status</span><b>${ui.badge(a.status)}</b></div>
      <div class="kv"><span>Account number</span><b>${rv ? a.number : HM.mask(a.number)} <button class="cp" data-act="revealAcct" data-arg="${id}" aria-label="${rv ? 'Hide' : 'Reveal'} account number">${icon(rv ? 'eyeoff' : 'eye', 16)}</button>${rv ? `<button class="cp" data-act="copyTxt" data-arg="${a.number}|Account number" aria-label="Copy account number">${icon('copy', 16)}</button>` : ''}</b></div>
      <div class="kv"><span>Routing number</span><b>${a.routing} <button class="cp" data-act="copyTxt" data-arg="${a.routing}|Routing number" aria-label="Copy routing number">${icon('copy', 16)}</button></b></div>
      <div class="kv"><span>Account holder</span><b>${esc(HM.holder())}</b></div>${sav ? `<div class="kv"><span>APY</span><b>${a.apy.toFixed(2)}%</b></div>` : ''}</div>
      ${ui.section('Account opening', '', `<div class="card"><div class="kv"><span>Opened</span><b>${HM.fmtDate(HM.parseDay(a.opened))}</b></div><div class="kv"><span>Opened through</span><b>Harborstone Mobile (demo)</b></div><div class="kv"><span>Branch</span><b>Digital branch (sample)</b></div><div class="kv"><span>Statements</span><b>${a.prefs.paperless ? 'Paperless' : 'Paper'}</b></div></div>`)}
      <div class="note">${icon('info', 18)}<span>Only the routing number and your own account number (after you reveal it) can be copied. All numbers are fictional demo values.</span></div>
      <div class="btns"><button class="btn btn-ghost" data-act="renameAcct" data-arg="${id}">${icon('edit', 18)} Change nickname</button></div></div>`
    };
  });
  HM.acts.revealAcct = (b, id) => { revealed[id] = !revealed[id]; HM.refresh(true); };
  HM.acts.renameAcct = (b, id) => {
    const a = HM.acct(id);
    ui.sheet(`<h3 class="sh-title">Change nickname</h3><form data-form="rename" data-id="${id}" novalidate>${ui.field({ name: 'nick', label: 'Account nickname', value: a.nickname, maxlength: 30 })}<div class="sh-actions"><button class="btn btn-primary" type="submit">Save nickname</button><button class="btn btn-ghost" type="button" data-act="closeSheet">Cancel</button></div></form>`);
  };
  HM.forms.rename = (f, d) => {
    const id = f.dataset.id, nick = d.nick.trim();
    if (nick.length < 2) return ui.fail(f, 'Nickname must be at least 2 characters.', 'nick');
    if (HM.state().accounts.some((a) => a.id !== id && a.nickname.toLowerCase() === nick.toLowerCase())) return ui.fail(f, 'You already have an account with that nickname.', 'nick');
    HM.acct(id).nickname = nick; HM.save(); ui.closeSheet(); HM.refresh(true); ui.toast('Nickname updated');
  };

  /* ---------- controls: freeze / unfreeze, preferences, alerts ---------- */
  HM.route('/accounts/:id/controls', 'accounts', ({ id }) => {
    const a = HM.acct(id), fr = a.status === 'frozen';
    return {
      title: 'Account controls',
      html: `${ui.header('Account controls', { back: '/accounts/' + id, sub: a.nickname })}<div class="pad">
      <div class="card center ctl ${fr ? 'is-frozen' : ''}"><div class="ctl-i">${icon(fr ? 'snow' : 'shield', 34)}</div><h2>${fr ? 'Account is frozen' : 'Account is active'}</h2><p class="mute sm">${fr ? 'Money cannot leave this account. Deposits and incoming payments are still accepted.' : 'Everything is working normally. Freeze the account instantly if you suspect a problem.'}</p>
        <button class="btn ${fr ? 'btn-gold' : 'btn-primary'} mt" data-act="toggleFreeze" data-arg="${id}">${icon(fr ? 'unlock' : 'snow', 20)} ${fr ? 'Unfreeze account' : 'Freeze account'}</button></div>
      ${ui.section('While an account is frozen', '', `<div class="card">${['Outgoing instant & standard ACH', 'Domestic wire transfers', 'Check payments', 'Bill payments & scheduled payments', 'Transfers out to your other accounts', 'ATM withdrawals & card purchases'].map((x) => `<div class="kv"><span>${x}</span><b>${ui.badge('blocked')}</b></div>`).join('')}<p class="hint">Blocked attempts are recorded as “blocked demo attempts” and your balance never decreases. Deposits and incoming credits are still allowed.</p></div>`)}
      ${ui.section('More', '', `<div class="group">${ui.row({ icon: 'sliders', title: 'Account preferences', go: '/accounts/' + id + '/prefs' })}${ui.row({ icon: 'bell', title: 'Account alerts', go: '/accounts/' + id + '/alerts' })}${ui.row({ icon: 'info', title: 'Account information', go: '/accounts/' + id + '/info' })}</div>`)}</div>`
    };
  });
  HM.acts.toggleFreeze = async (b, id) => {
    const a = HM.acct(id), fr = a.status === 'frozen';
    const ok = await ui.confirm(fr ? { title: 'Unfreeze ' + a.nickname + '?', body: 'Outgoing payments, transfers and withdrawals will work again immediately.', ok: 'Unfreeze account' } : { title: 'Freeze ' + a.nickname + '?', body: 'Outgoing ACH, wires, checks, bills, transfers and withdrawals will be <b>blocked</b> until you unfreeze. Deposits are still accepted.', ok: 'Freeze account', danger: true });
    if (!ok) return;
    a.status = fr ? 'active' : 'frozen'; HM.notify('account', fr ? 'Account unfrozen' : 'Account frozen', `${a.nickname} ${fr ? 'is active again.' : 'is frozen. Outgoing activity is blocked.'}`); HM.save(); HM.refresh(true); ui.toast(fr ? a.nickname + ' unfrozen' : a.nickname + ' frozen');
  };
  HM.route('/accounts/:id/prefs', 'accounts', ({ id }) => {
    const a = HM.acct(id);
    return { title: 'Account preferences', html: `${ui.header('Account preferences', { back: '/accounts/' + id, sub: a.nickname })}<div class="pad"><div class="group">${ui.toggle({ title: 'Paperless statements', sub: 'Get statements in the app instead of by mail', on: a.prefs.paperless, act: 'acctPref', arg: id + ':paperless' })}${ui.toggle({ title: 'Overdraft protection', sub: 'Demo: transactions are always declined if funds are short', on: a.prefs.overdraftProtect, act: 'acctPref', arg: id + ':overdraftProtect' })}</div><button class="btn btn-ghost mt" data-act="renameAcct" data-arg="${id}">${icon('edit', 18)} Change nickname</button></div>` };
  });
  HM.acts.acctPref = (b, arg) => { const [id, k] = arg.split(':'); const a = HM.acct(id); a.prefs[k] = !a.prefs[k]; HM.save(); HM.refresh(true); };
  HM.route('/accounts/:id/alerts', 'accounts', ({ id }) => {
    const a = HM.acct(id);
    return { title: 'Account alerts', html: `${ui.header('Account alerts', { back: '/accounts/' + id, sub: a.nickname })}<div class="pad"><div class="group">${ui.toggle({ title: 'Low balance alert', sub: 'Notify me when available balance falls below ' + money(a.alerts.threshold).replace('.00', ''), on: a.alerts.lowBalance, act: 'acctAlert', arg: id + ':lowBalance' })}${ui.toggle({ title: 'Large transactions', sub: 'Alert for payments of $500 or more', on: a.alerts.largeTx, act: 'acctAlert', arg: id + ':largeTx' })}${ui.toggle({ title: 'Deposit alerts', sub: 'Alert when deposits arrive or post', on: a.alerts.deposits, act: 'acctAlert', arg: id + ':deposits' })}</div>
      <form data-form="alertThr" data-id="${id}" class="card mt" novalidate><div class="lbl">Low-balance threshold</div>${ui.field({ name: 'thr', label: 'Alert me below', money: true, inputmode: 'decimal', value: String(a.alerts.threshold) })}<button class="btn btn-primary mt" type="submit">Save threshold</button></form></div>` };
  });
  HM.acts.acctAlert = (b, arg) => { const [id, k] = arg.split(':'); const a = HM.acct(id); a.alerts[k] = !a.alerts[k]; HM.save(); HM.refresh(true); };
  HM.forms.alertThr = (f, d) => { const v = HM.parseAmt(d.thr); if (isNaN(v) || v < 0 || v > 1000000) return ui.fail(f, 'Enter an amount between $0 and $1,000,000.', 'thr'); HM.acct(f.dataset.id).alerts.threshold = v; HM.save(); ui.toast('Threshold saved'); HM.refresh(true); };

  /* ---------- statements ---------- */
  let stmtAcct = 'chk1';
  HM.acts.stmtAcct = (b, id) => { stmtAcct = id; HM.refresh(true); };
  function monthsFor(a) { const out = [], now = new Date(), open = HM.parseDay(a.opened); for (let i = 0; i < 12; i++) { const s = new Date(now.getFullYear(), now.getMonth() - i, 1); if (s < new Date(open.getFullYear(), open.getMonth(), 1)) break; out.push(s); } return out; }
  const ym = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  function statementData(acctId, ymStr) {
    const [y, m] = ymStr.split('-').map(Number); const s = new Date(y, m - 1, 1), e = new Date(y, m, 1); const a = HM.acct(acctId);
    const txs = HM.history(acctId).filter((t) => { const d = new Date(t.date); return d >= s && d < e && t.status === 'completed'; });
    const credits = HM.r2(txs.filter((t) => t.amount > 0).reduce((q, t) => q + t.amount, 0)), debits = HM.r2(txs.filter((t) => t.amount < 0).reduce((q, t) => q + Math.abs(t.amount), 0)), fees = HM.r2(txs.reduce((q, t) => q + (t.fee || 0), 0));
    const closeTs = Math.min(e.getTime(), Date.now() + 1); const open = balAt(acctId, s.getTime()), close = balAt(acctId, e.getTime());
    return { a, s, e, txs: txs.slice().reverse(), credits, debits, fees, open, close, inProgress: e.getTime() > Date.now(), closeTs };
  }
  function statementsHub(fixedId) {
    const S = HM.state(); const id = fixedId || stmtAcct; const a = HM.acct(id); const months = monthsFor(a);
    return {
      title: 'Statements',
      html: `${ui.header('Statements', { back: fixedId ? '/accounts/' + fixedId : '/accounts', sub: 'Monthly statements & history' })}<div class="pad">
      ${fixedId ? '' : `<div class="chips">${S.accounts.map((x) => `<button class="chip ${x.id === id ? 'on' : ''}" data-act="stmtAcct" data-arg="${x.id}">${esc(x.nickname)}</button>`).join('')}</div>`}
      <div class="lbl">Select statement period</div><div class="group mt">${months.map((d, i) => { const ss = statementData(id, ym(d)); return ui.row({ icon: 'file', tone: 'gold', title: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), sub: ss.inProgress ? 'In progress · ' + ss.txs.length + ' transactions' : 'Closing balance ' + money(ss.close), go: '/accounts/' + id + '/statement/' + ym(d), right: ss.inProgress ? ui.badge('pending').replace('Pending', 'Current') : '' }); }).join('')}</div>
      <button class="btn btn-ghost mt" data-go="/accounts/documents">${icon('book', 18)} Account documents</button></div>`
    };
  }
  HM.route('/accounts/:id/statements', 'accounts', ({ id }) => statementsHub(id));
  HM.route('/accounts/:id/statement/:ym', 'accounts', ({ id, ym: p }) => {
    const d = statementData(id, p), a = d.a; const label = d.s.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return {
      title: 'Statement ' + label,
      html: `${ui.header(label, { back: '/accounts/' + id + '/statements', sub: a.nickname + ' ' + HM.mask(a.number) })}<div class="pad">
      <div class="card stmt"><div class="between sp"><div>${ui.logo(34)}</div><div class="xs mute right">Statement period<br><b>${HM.fmtShort(d.s)} – ${HM.fmtDate(new Date(d.e.getTime() - 864e5))}</b></div></div><div class="hr"></div>
      <div class="kv"><span>Opening balance</span><b>${money(d.open)}</b></div><div class="kv"><span>Deposits &amp; credits</span><b class="pos">+${money(d.credits)}</b></div><div class="kv"><span>Withdrawals &amp; debits</span><b>−${money(d.debits)}</b></div>${d.fees ? `<div class="kv"><span>Fees</span><b>${money(d.fees)}</b></div>` : ''}<div class="kv"><span>${d.inProgress ? 'Balance to date' : 'Closing balance'}</span><b>${money(d.close)}</b></div></div>
      <div class="btns two"><button class="btn btn-primary" data-act="stmtDownload" data-arg="${id}|${p}">${icon('download', 18)} Download</button><button class="btn btn-ghost" data-act="stmtPrint" data-arg="${id}|${p}">${icon('print', 18)} Print</button></div>
      ${ui.section('Activity (' + d.txs.length + ')', '', d.txs.length ? `<div class="group">${d.txs.slice().reverse().map((t) => ui.txRow(t)).join('')}</div>` : ui.card(ui.empty('receipt', 'No activity', 'No completed transactions this period.')))}
      <p class="footnote">Demo statement for a fictional bank. Not an official record.</p></div>`
    };
  });
  function statementHTML(id, p) {
    const d = statementData(id, p), a = d.a; const label = d.s.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const rows = d.txs.map((t) => `<tr><td>${HM.fmtShort(t.date)}</td><td>${esc(t.desc)}</td><td class="r">${t.amount < 0 ? '−' : '+'}${money(Math.abs(t.amount)).replace('−', '')}</td><td class="r">${money(t.bal)}</td></tr>`).join('');
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Harborstone statement ${label}</title><style>body{font:14px -apple-system,Segoe UI,Arial,sans-serif;color:#14232A;margin:0;padding:24px;background:#F4F2EE}.s{max-width:760px;margin:auto;background:#fff;border-radius:14px;padding:28px;position:relative;overflow:hidden}h1{font-family:Georgia,serif;margin:0;color:#0A3340}.top{display:flex;justify-content:space-between;border-bottom:3px solid #C9A96A;padding-bottom:14px}.k{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #eee}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{text-align:left;padding:8px 6px;border-bottom:1px solid #eee;font-size:13px}.r{text-align:right}.wm{position:absolute;inset:0;display:grid;place-items:center;font-size:54px;font-weight:800;color:rgba(10,51,64,.05);transform:rotate(-24deg);pointer-events:none;text-align:center}.n{font-size:11px;color:#66747D;margin-top:18px}@media print{body{background:#fff;padding:0}}</style></head><body><div class="s"><div class="wm">DEMO STATEMENT<br>NOT A REAL RECORD</div><div class="top"><div><h1>Harborstone Bank</h1><div>Your finances. Your direction.</div></div><div style="text-align:right"><b>Statement</b><br>${label}<br>${esc(a.name)} ${HM.mask(a.number)}</div></div><p><b>${esc(HM.holder())}</b></p><div class="k"><span>Opening balance</span><b>${money(d.open)}</b></div><div class="k"><span>Deposits &amp; credits</span><b>${money(d.credits)}</b></div><div class="k"><span>Withdrawals &amp; debits</span><b>${money(d.debits)}</b></div><div class="k"><span>${d.inProgress ? 'Balance to date' : 'Closing balance'}</span><b>${money(d.close)}</b></div><table><tr><th>Date</th><th>Description</th><th class="r">Amount</th><th class="r">Balance</th></tr>${rows || '<tr><td colspan="4">No activity this period.</td></tr>'}</table><p class="n">Harborstone Bank is a fictional bank created for an educational project. This statement contains simulated sample data and is not an official financial record.</p></div><script>if(location.hash==='#print')setTimeout(function(){print()},300)<\/script></body></html>`;
  }
  HM.acts.stmtDownload = (b, arg) => { const [id, p] = arg.split('|'); ui.download(`Harborstone-statement-${HM.acct(id).nickname.replace(/\W+/g, '-')}-${p}.html`, statementHTML(id, p)); ui.toast('Demo statement downloaded'); };
  HM.acts.stmtPrint = (b, arg) => { const [id, p] = arg.split('|'); const w = window.open('', '_blank'); if (!w) return ui.toast('Allow pop-ups to print, or use Download', 'err'); w.document.write(statementHTML(id, p).replace('</body>', '<script>setTimeout(function(){print()},400)<\/script></body>')); w.document.close(); };

  /* ---------- documents ---------- */
  const DOCS = {
    agreement: ['Deposit account agreement', 'Terms that apply to your Harborstone checking and savings accounts.', ['This is a demonstration agreement for a fictional bank.', 'Your accounts are simulated. No real funds are held and no real obligations are created.', 'Daily limits, fees and holds shown in the app follow the demo rules described in Account controls and Payments › Limits.']],
    fees: ['Fee schedule', 'Fees for wires, replacement cards and other services.', ['Domestic wire transfer (outgoing): $25.00', 'Instant ACH: $0.00', 'Standard ACH: $0.00', 'Check payment: $0.00', 'Replacement debit card: $0.00 (demo)', 'Fees are simulated for educational purposes.']],
    privacy: ['Privacy notice', 'How Harborstone Mobile handles information.', ['Harborstone Mobile stores its simulated data only in your browser.', 'The only information sent to a server is your sign-in email and password for verification and the one-time code request.', 'No payment card numbers or real bank credentials are collected.']],
    esign: ['Electronic delivery consent', 'Your consent to receive documents electronically.', ['You agreed to receive statements and notices in the app (paperless).', 'You can switch to paper statements per account under Account preferences. (Demo only: nothing is mailed.)']],
    tax: ['Year-end tax summary (sample)', 'Sample Form 1099-INT style interest summary.', ['Sample document: interest paid on your savings account this year is shown on the Savings account page.', 'This is not a tax document and must not be used for tax filing.']]
  };
  function docsPage() { return { title: 'Documents', html: `${ui.header('Account documents', { back: '/accounts' })}<div class="pad"><div class="group">${Object.entries(DOCS).map(([k, v]) => ui.row({ icon: 'file', tone: 'gold', title: v[0], sub: v[1], go: '/accounts/documents/' + k })).join('')}</div><div class="note">${icon('info', 18)}<span>All documents are sample content for the demo.</span></div></div>` }; }
  function docView(k) { const d = DOCS[k]; if (!d) return docsPage(); return { title: d[0], html: `${ui.header(d[0], { back: '/accounts/documents' })}<div class="pad"><div class="card doc">${d[2].map((p) => `<p>${esc(p)}</p>`).join('')}<p class="mute xs">Harborstone Bank — fictional bank, educational project. Effective ${HM.fmtDate(new Date())}.</p></div><div class="btns two"><button class="btn btn-primary" data-act="docDownload" data-arg="${k}">${icon('download', 18)} Download</button><button class="btn btn-ghost" data-act="docPrint" data-arg="${k}">${icon('print', 18)} Print</button></div></div>` }; }
  const docHtml = (k) => { const d = DOCS[k]; return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(d[0])}</title><style>body{font:15px Georgia,serif;max-width:680px;margin:30px auto;padding:0 20px;color:#14232A}h1{color:#0A3340;border-bottom:3px solid #C9A96A;padding-bottom:8px}.n{color:#66747D;font:12px Arial}</style></head><body><h1>Harborstone Bank — ${esc(d[0])}</h1>${d[2].map((p) => `<p>${esc(p)}</p>`).join('')}<p class="n">DEMO DOCUMENT. Harborstone Bank is a fictional bank created for an educational project.</p></body></html>`; };
  HM.acts.docDownload = (b, k) => { ui.download('Harborstone-' + k + '.html', docHtml(k)); ui.toast('Demo document downloaded'); };
  HM.acts.docPrint = (b, k) => { const w = window.open('', '_blank'); if (!w) return ui.toast('Allow pop-ups to print, or use Download', 'err'); w.document.write(docHtml(k).replace('</body>', '<script>setTimeout(function(){print()},300)<\/script></body>')); w.document.close(); };
  HM.docsPage = docsPage;

  /* ---------- spending insights ---------- */
  let spRange = 'month', spAcct = 'all';
  HM.acts.spRange = (b, a) => { spRange = a; HM.refresh(true); };
  HM.acts.spAcct = (b, a) => { spAcct = a; HM.refresh(true); };
  function spendingPage() {
    const now = new Date(); const from = spRange === 'month' ? new Date(now.getFullYear(), now.getMonth(), 1).getTime() : now.getTime() - { 30: 30, 90: 90, 180: 180 }[spRange] * 864e5;
    const ids = spAcct === 'all' ? null : [spAcct]; const data = ui.spendBy(from, now.getTime() + 1, ids), total = HM.r2(data.reduce((s, d) => s + d.value, 0));
    const merch = {}; HM.state().txs.forEach((t) => { if (t.amount < 0 && ['completed', 'pending'].includes(t.status) && new Date(t.date).getTime() >= from && t.cat !== 'Transfer' && (!ids || ids.includes(t.acct))) merch[t.desc] = (merch[t.desc] || 0) + Math.abs(t.amount); });
    const top = Object.entries(merch).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return {
      title: 'Spending insights',
      html: `${ui.header('Spending insights', { back: '/accounts' })}<div class="pad">
      ${ui.seg([['month', 'Month'], ['30', '30 d'], ['90', '90 d'], ['180', '6 mo']], spRange, 'spRange')}
      <div class="chips mt"><button class="chip ${spAcct === 'all' ? 'on' : ''}" data-act="spAcct" data-arg="all">All accounts</button>${HM.state().accounts.filter((a) => a.type === 'checking').map((a) => `<button class="chip ${spAcct === a.id ? 'on' : ''}" data-act="spAcct" data-arg="${a.id}">${esc(a.nickname)}</button>`).join('')}</div>
      <div class="card center">${data.length ? ui.donut(data.slice(0, 8), { center: money(total).replace('.00', '') }) : ui.empty('chart', 'No spending in this period', '')}</div>
      ${data.length ? `<div class="group mt">${data.map((d) => `<div class="row"><span class="cat" style="--c:${d.color}">${icon((HM.CATS[d.label] || HM.CATS.Other).i, 18)}</span><span class="row-m"><b>${esc(d.label)}</b>${ui.progress(Math.round((d.value / total) * 100))}</span><span class="row-r">${money(d.value)}<br><small class="mute">${Math.round((d.value / total) * 100)}%</small></span></div>`).join('')}</div>` : ''}
      ${top.length ? ui.section('Top merchants & payees', '', `<div class="group">${top.map((m) => ui.row({ icon: 'bag', title: m[0], right: money(m[1]), noChev: true })).join('')}</div>`) : ''}
      ${ui.section('Income vs expenses', '', ui.card(ui.bars(ui.monthly(6))))}</div>`
    };
  }

  /* ---------- savings goals ---------- */
  function goalsPage() {
    const S = HM.state(); const sav = S.accounts.find((a) => a.type === 'savings'); const alloc = HM.r2(S.goals.reduce((s, g) => s + g.saved, 0)); const free = HM.r2(sav.current - alloc);
    return {
      title: 'Savings goals',
      html: `${ui.header('Savings goals', { back: '/accounts', right: `<button class="iconbtn" data-act="goalForm" aria-label="New goal">${icon('plus', 20)}</button>` })}<div class="pad">
      <div class="card"><div class="kv"><span>Savings balance</span><b>${money(sav.current)}</b></div><div class="kv"><span>Allocated to goals</span><b>${money(alloc)}</b></div><div class="kv"><span>Unallocated</span><b>${money(free)}</b></div></div>
      ${S.goals.length ? S.goals.map((g) => { const pct = Math.min(100, Math.round((g.saved / g.target) * 100)); return `<div class="card mt"><div class="between sp"><b class="gname">${esc(g.name)}</b><span class="badge ${pct >= 100 ? 'ok' : 'info'}">${pct}%</span></div><div class="sm mute mt">${money(g.saved)} of ${money(g.target)}${g.due ? ' · by ' + HM.fmtDate(HM.parseDay(g.due), { month: 'short', year: 'numeric' }) : ''}</div><div class="mt">${ui.progress(pct)}</div><div class="sp mt"><button class="btn btn-sm btn-primary grow" data-act="goalAdd" data-arg="${g.id}">Add money</button><button class="btn btn-sm btn-ghost" data-act="goalForm" data-arg="${g.id}">Edit</button><button class="btn btn-sm btn-ghost" data-act="goalDel" data-arg="${g.id}" aria-label="Delete goal">${icon('trash', 16)}</button></div></div>`; }).join('') : ui.card(ui.empty('target', 'No savings goals yet', 'Set a target and track your progress.', '<button class="btn btn-primary" data-act="goalForm">Create a goal</button>'))}</div>`
    };
  }
  HM.acts.goalForm = (b, id) => { const g = id ? HM.state().goals.find((x) => x.id === id) : null; ui.sheet(`<h3 class="sh-title">${g ? 'Edit goal' : 'New savings goal'}</h3><form data-form="goal" data-id="${g ? g.id : ''}" novalidate>${ui.field({ name: 'name', label: 'Goal name', value: g ? g.name : '', maxlength: 40 })}${ui.field({ name: 'target', label: 'Target amount', money: true, inputmode: 'decimal', value: g ? g.target : '' })}${ui.field({ name: 'due', label: 'Target date', type: 'date', value: g ? g.due : '', optional: true })}<div class="sh-actions"><button class="btn btn-primary" type="submit">${g ? 'Save goal' : 'Create goal'}</button><button class="btn btn-ghost" type="button" data-act="closeSheet">Cancel</button></div></form>`); };
  HM.forms.goal = (f, d) => {
    const name = d.name.trim(), target = HM.parseAmt(d.target); if (name.length < 2) return ui.fail(f, 'Enter a goal name.', 'name'); if (isNaN(target) || target < 1 || target > 10000000) return ui.fail(f, 'Enter a target between $1 and $10,000,000.', 'target');
    const S = HM.state(); if (f.dataset.id) { const g = S.goals.find((x) => x.id === f.dataset.id); if (target < g.saved) return ui.fail(f, 'Target can’t be lower than the ' + money(g.saved) + ' already saved.', 'target'); Object.assign(g, { name, target, due: d.due || '' }); } else S.goals.push({ id: HM.uid('g'), name, target, saved: 0, due: d.due || '' });
    HM.save(); ui.closeSheet(); HM.refresh(true); ui.toast('Goal saved');
  };
  HM.acts.goalAdd = (b, id) => ui.sheet(`<h3 class="sh-title">Add to goal</h3><form data-form="goalAdd" data-id="${id}" novalidate>${ui.field({ name: 'amt', label: 'Amount to set aside', money: true, inputmode: 'decimal', hint: 'Set aside from your unallocated savings balance. Money stays in your Savings account.' })}<div class="sh-actions"><button class="btn btn-primary" type="submit">Add money</button><button class="btn btn-ghost" type="button" data-act="closeSheet">Cancel</button></div></form>`);
  HM.forms.goalAdd = (f, d) => {
    const v = HM.parseAmt(d.amt); const S = HM.state(), g = S.goals.find((x) => x.id === f.dataset.id), sav = S.accounts.find((a) => a.type === 'savings'); const free = HM.r2(sav.current - S.goals.reduce((s, x) => s + x.saved, 0));
    if (isNaN(v) || v <= 0) return ui.fail(f, 'Enter an amount greater than $0.00.', 'amt'); if (v > free) return ui.fail(f, 'You only have ' + money(free) + ' unallocated in savings.', 'amt'); if (g.saved + v > g.target) return ui.fail(f, 'That would exceed the goal target by ' + money(g.saved + v - g.target) + '.', 'amt');
    g.saved = HM.r2(g.saved + v); HM.save(); ui.closeSheet(); HM.refresh(true); ui.toast(money(v) + ' added to ' + g.name);
  };
  HM.acts.goalDel = async (b, id) => { if (await ui.confirm({ title: 'Delete this goal?', body: 'Money stays in your savings account; only the goal is removed.', ok: 'Delete', danger: true })) { const S = HM.state(); S.goals = S.goals.filter((g) => g.id !== id); HM.save(); HM.refresh(true); } };

  /* ---------- check deposit ---------- */
  HM._dep = null;
  const depStep = (n) => `<div class="stepper">${[1, 2, 3, 4].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</div>`;
  function depositStart(query) {
    const S = HM.state(); const q = new URLSearchParams((location.hash.split('?')[1]) || ''); const L = HM.limitInfo('deposit');
    if (!HM._dep) HM._dep = { idem: 'dep:' + HM.uid('x'), to: q.get('to') || 'chk1', amount: '', checkDate: HM.dayKey(new Date()), payer: '', memo: '' };
    else if (q.get('to')) HM._dep.to = q.get('to');
    const d = HM._dep;
    return {
      title: 'Deposit check',
      html: `${ui.header('Deposit a check', { back: '/accounts', sub: 'Step 1 of 4 · Details', right: `<button class="iconbtn" data-go="/accounts/deposit/history" aria-label="Deposit history">${icon('clock', 20)}</button>` })}${depStep(1)}
      <div class="pad"><form data-form="depStart" novalidate>
        ${ui.select({ name: 'to', label: 'Deposit to', value: d.to, options: ui.acctOptions() })}
        ${ui.field({ name: 'amount', label: 'Check amount', money: true, inputmode: 'decimal', value: d.amount, placeholder: '0.00', hint: `Daily deposit limit ${money(L.limit).replace('.00', '')} · ${money(L.left)} remaining today` })}
        ${ui.field({ name: 'checkDate', label: 'Date on check', type: 'date', value: d.checkDate, max: HM.dayKey(new Date()) })}
        ${ui.field({ name: 'payer', label: 'Payer (who wrote the check)', value: d.payer, maxlength: 60, placeholder: 'Name or company' })}
        ${ui.field({ name: 'memo', label: 'Memo / description', value: d.memo, maxlength: 60, optional: true })}
        <button class="btn btn-primary mt2" type="submit">Continue to check photos</button></form>
        <div class="note">${icon('shield', 18)}<span>Demo capture: the camera is not accessed and no real check images are collected or stored. Sample images are generated from the details you enter.</span></div></div>`
    };
  }
  HM.forms.depStart = (f, d) => {
    const amt = HM.parseAmt(d.amount); if (isNaN(amt) || amt <= 0) return ui.fail(f, 'Enter the check amount, like 125.00.', 'amount'); if (amt > 25000) return ui.fail(f, 'Mobile deposits are limited to $25,000 per check in this demo.', 'amount');
    if (!d.checkDate) return ui.fail(f, 'Enter the date on the check.', 'checkDate'); const cd = HM.parseDay(d.checkDate), now = new Date();
    if (d.checkDate > HM.dayKey(now)) return ui.fail(f, 'The check is post-dated. You can deposit it on or after the date written on it.', 'checkDate'); if (now - cd > 180 * 864e5) return ui.fail(f, 'This check is more than 180 days old (stale-dated) and can’t be deposited.', 'checkDate');
    if (d.payer.trim().length < 2) return ui.fail(f, 'Enter who wrote the check.', 'payer');
    const L = HM.limitInfo('deposit'); if (amt > L.left) return ui.fail(f, `This is more than your remaining daily deposit limit (${money(L.left)}).`, 'amount');
    Object.assign(HM._dep, { to: d.to, amount: amt, checkDate: d.checkDate, payer: d.payer.trim(), memo: (d.memo || '').trim(), front: null, back: null }); HM.go('/accounts/deposit/front');
  };

  function checkImage(side, d) {
    const c = document.createElement('canvas'); c.width = 720; c.height = 330; const x = c.getContext('2d');
    x.fillStyle = '#F4F1E4'; x.fillRect(0, 0, 720, 330); for (let i = 0; i < 330; i += 6) { x.fillStyle = i % 12 ? 'rgba(10,51,64,.035)' : 'rgba(201,169,106,.06)'; x.fillRect(0, i, 720, 3); }
    x.strokeStyle = '#2D5560'; x.lineWidth = 2; x.strokeRect(8, 8, 704, 314); x.fillStyle = '#14232A';
    if (side === 'front') {
      x.font = '700 22px Georgia'; x.fillText(d.payer.slice(0, 30), 28, 52); x.font = '13px Arial'; x.fillStyle = '#66747D'; x.fillText('SAMPLE CHECK — NOT NEGOTIABLE', 28, 74);
      x.fillStyle = '#14232A'; x.font = '15px Arial'; x.fillText('No. ' + (1000 + Math.floor(Math.random() * 900)), 610, 40); x.fillText('Date: ' + HM.fmtDate(HM.parseDay(d.checkDate), { month: '2-digit', day: '2-digit', year: 'numeric' }), 560, 74);
      x.fillText('PAY TO THE ORDER OF', 28, 128); x.font = '700 24px Georgia'; x.fillText(HM.holder().toUpperCase(), 210, 128); x.lineWidth = 1; x.beginPath(); x.moveTo(205, 136); x.lineTo(540, 136); x.stroke();
      x.font = '700 24px Georgia'; x.strokeRect(560, 100, 140, 40); x.fillText('$' + Number(d.amount).toFixed(2), 572, 129); x.font = '15px Arial'; x.fillText('Amount in words: ' + Number(d.amount).toFixed(2) + ' dollars', 28, 182); x.beginPath(); x.moveTo(28, 190); x.lineTo(540, 190); x.stroke();
      x.fillText('MEMO ' + (d.memo || '').slice(0, 30), 28, 270); x.beginPath(); x.moveTo(80, 276); x.lineTo(300, 276); x.stroke(); x.font = 'italic 26px Georgia'; x.fillText(d.payer.split(' ')[0].slice(0, 14), 470, 262); x.beginPath(); x.moveTo(440, 270); x.lineTo(690, 270); x.stroke();
      x.font = '700 18px monospace'; x.fillStyle = '#44525A'; x.fillText('⑆000000000⑆  ⑈0000000000⑈  0000', 28, 310);
    } else {
      x.font = '700 16px Arial'; x.fillText('ENDORSE HERE', 380, 40); x.strokeStyle = '#8AA0A7'; x.setLineDash([6, 4]); x.strokeRect(370, 52, 330, 150); x.setLineDash([]);
      x.font = 'italic 24px Georgia'; x.fillText(HM.holder(), 392, 112); x.font = '13px Arial'; x.fillStyle = '#44525A'; x.fillText('For mobile deposit only', 392, 148); x.fillText('Harborstone Bank', 392, 168); x.fillText('Do not write below this line', 392, 260);
      x.font = '13px Arial'; x.fillStyle = '#66747D'; x.fillText('DEMO IMAGE — BACK OF CHECK', 28, 310);
    }
    x.fillStyle = 'rgba(179,57,47,.18)'; x.save(); x.translate(360, 200); x.rotate(-0.28); x.font = '700 46px Arial'; x.textAlign = 'center'; x.fillText('SPECIMEN', 0, 0); x.restore();
    return c.toDataURL('image/jpeg', 0.7);
  }
  HM.checkImage = checkImage;
  function depositCapture(side) {
    const d = HM._dep; if (!d || !d.amount) { HM.go('/accounts/deposit', { replace: true }); return { html: '' }; }
    if (side === 'back' && !d.front) { HM.go('/accounts/deposit/front', { replace: true }); return { html: '' }; }
    const img = d[side];
    return {
      title: 'Capture ' + side,
      html: `${ui.header('Check ' + side, { back: side === 'front' ? '/accounts/deposit' : '/accounts/deposit/front', sub: 'Step ' + (side === 'front' ? 2 : 3) + ' of 4' })}${depStep(side === 'front' ? 2 : 3)}
      <div class="pad">${img ? `<div class="card center"><img class="chk-img" src="${img}" alt="Captured ${side} of check (demo image)"><p class="sm mute mt">Check the image is clear: all four corners visible, no glare.</p></div><div class="btns two"><button class="btn btn-ghost" data-act="retake" data-arg="${side}">Retake</button><button class="btn btn-primary" data-go="${side === 'front' ? '/accounts/deposit/back' : '/accounts/deposit/review'}">Use photo</button></div>`
        : `<div class="cam" id="cam"><div class="cam-top"><span>${side === 'front' ? 'Front of check' : 'Back of check'}</span><button class="flash" data-act="flash" aria-label="Toggle flash">${icon('zap', 18)}</button></div><div class="cam-frame"><i></i><i></i><i></i><i></i><p>${side === 'front' ? 'Place the front of the check inside the frame' : 'Turn the check over and endorse it: “For mobile deposit only”'}</p></div><div class="cam-flash" id="camFlash"></div><div class="cam-bot"><button class="cam-x" data-back="/accounts/deposit">Cancel</button><button class="shutter" data-act="shutter" data-arg="${side}" aria-label="Take photo"><i></i></button><span class="cam-sp"></span></div></div><p class="footnote">Demo capture · no camera access · a sample image is generated</p>`}</div>`
    };
  }
  HM.acts.flash = (b) => b.classList.toggle('on');
  HM.acts.retake = (b, side) => { HM._dep[side] = null; HM.refresh(false); };
  HM.acts.shutter = (b, side) => { const f = document.getElementById('camFlash'); f.classList.add('go'); b.disabled = true; setTimeout(() => { HM._dep[side] = checkImage(side, HM._dep); HM.refresh(false); }, 380); };

  function depositReview() {
    const d = HM._dep; if (!d || !d.front || !d.back) { HM.go('/accounts/deposit', { replace: true }); return { html: '' }; }
    const a = HM.acct(d.to);
    return {
      title: 'Review deposit',
      html: `${ui.header('Review deposit', { back: '/accounts/deposit/back', sub: 'Step 4 of 4' })}${depStep(4)}<div class="pad">
      <div class="card center"><div class="lbl">Deposit amount</div><div class="big">${money(d.amount)}</div></div>
      <div class="card mt"><div class="kv"><span>Deposit to</span><b>${esc(a.nickname)} ${HM.mask(a.number)}</b></div><div class="kv"><span>Payer</span><b>${esc(d.payer)}</b></div><div class="kv"><span>Check date</span><b>${HM.fmtDate(HM.parseDay(d.checkDate))}</b></div>${d.memo ? `<div class="kv"><span>Memo</span><b>${esc(d.memo)}</b></div>` : ''}<div class="kv"><span>Availability</span><b>After review (~${Math.round(HM.PENDING_MS / 1000)}s demo)</b></div></div>
      <div class="imgs mt"><div><small>Front</small><img src="${d.front}" alt="Front of check"></div><div><small>Back</small><img src="${d.back}" alt="Back of check"></div></div>
      <div class="note warn">${icon('clock', 18)}<span>Funds will show as <b>pending</b> and become available automatically after processing. Keep the original check until the deposit posts.</span></div>
      <div class="btns"><button class="btn btn-gold" id="depSubmit" data-act="depSubmit">Submit deposit</button><button class="btn btn-ghost" data-go="/accounts/deposit">Edit details</button></div></div>`
    };
  }
  HM.acts.depSubmit = async (btn) => {
    if (btn.disabled) return; const d = HM._dep; ui.busy(btn, true, 'Submitting…'); await new Promise((r) => setTimeout(r, 900));
    const res = HM.executeDeposit({ to: d.to, amount: d.amount, payer: d.payer, memo: d.memo, checkDate: d.checkDate, idem: d.idem });
    if (!res.ok) { ui.busy(btn, false); if (res.duplicate) { HM.go('/accounts/deposit/history'); return; } return ui.toast(res.error, 'err'); }
    HM._dep = null; HM.go('/accounts/deposit/done/' + res.tx.id, { replace: true });
  };
  function depositDone(id) {
    const t = HM.txOf(id); if (!t) return depositHistory(); const a = HM.acct(t.acct);
    return { title: 'Deposit submitted', html: `<div class="pad done"><div class="okring">${icon('check', 38)}</div><h2>Deposit submitted</h2><p class="mute">${money(t.amount)} to ${esc(a.nickname)} is <b>${esc(t.status)}</b>. We’ll notify you when it posts.</p>
      <div class="card mt left"><div class="kv"><span>Reference</span><b>${esc(t.ref)}</b></div><div class="kv"><span>Status</span><b>${ui.badge(t.status)}</b></div><div class="kv"><span>Submitted</span><b>${HM.fmtDT(t.date)}</b></div></div>
      <div class="btns"><button class="btn btn-primary" data-go="/receipt/${encodeURIComponent(t.ref)}">${icon('receipt', 20)} View deposit receipt</button><button class="btn btn-ghost" data-go="/accounts/deposit/history">Deposit history</button><button class="btn btn-ghost" data-go="/accounts/${a.id}">Back to ${esc(a.nickname)}</button></div></div>` };
  }
  function depositHistory() {
    const deps = HM.state().deposits; const txFor = (dp) => HM.state().txs.find((t) => (t.meta || {}).depositId === dp.id);
    return { title: 'Deposit history', html: `${ui.header('Deposit history', { back: '/accounts', right: `<button class="iconbtn" data-go="/accounts/deposit" aria-label="New deposit">${icon('plus', 20)}</button>` })}<div class="pad">${deps.length ? `<div class="group">${deps.map((dp) => { const t = txFor(dp); return ui.row({ icon: 'camera', tone: 'green', title: money(dp.amount) + ' · ' + dp.payer, sub: HM.fmtDT(dp.date) + ' · ' + HM.acct(dp.acct).nickname, right: ui.badge(dp.status), go: t ? '/tx/' + t.id : '' }); }).join('')}</div>` : ui.card(ui.empty('camera', 'No deposits yet', 'Deposit a check from your phone in minutes.', '<button class="btn btn-primary" data-go="/accounts/deposit">Deposit a check</button>'))}</div>` };
  }
})();

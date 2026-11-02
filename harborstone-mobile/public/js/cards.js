/* Harborstone Mobile — Cards: overview, controls, security, activity, virtual card, simulated purchases.
   All card operations are simulated. No real card numbers, CVVs or PINs are collected, stored or transmitted. */
(function () {
  'use strict';
  const HM = window.HM, ui = HM.ui, esc = HM.esc, icon = HM.icon, money = HM.money;
  const S = () => HM.state();
  let sel = 'card1';
  const card = (id) => S().cards.find((c) => c.id === id) || S().cards[0];
  const holderName = () => HM.holder().toUpperCase();
  const label = (c) => (c.kind === 'virtual' ? 'Virtual card' : 'Debit card');
  const stat = (c) => ({ active: 'Active', locked: 'Locked', pending: 'Pending activation', cancelled: 'Cancelled' }[c.status] || c.status);

  function cardVisual(c, o) {
    o = o || {}; const a = HM.acct(c.acct); const off = c.status !== 'active';
    return `<div class="dcard ${c.kind === 'virtual' ? 'virt' : ''} ${off ? 'off' : ''}" role="img" aria-label="${label(c)} ending ${c.last4}, ${stat(c)}">
      <div class="dc-top"><span class="dc-bank">${ui.logo(26)} HARBORSTONE</span><span class="dc-tag">${c.kind === 'virtual' ? 'VIRTUAL' : 'DEBIT'}</span></div>
      <div class="dc-chip">${c.kind === 'virtual' ? '' : '<i></i>'}</div>
      <div class="dc-num">•••• •••• •••• ${c.last4}</div>
      <div class="dc-bot"><div><small>CARDHOLDER</small><b>${esc(holderName())}</b></div><div><small>EXPIRES</small><b>${c.exp}</b></div>${c.controls.contactless && c.kind !== 'virtual' ? `<span class="dc-nfc">${icon('contactless', 22)}</span>` : ''}</div>
      ${off ? `<div class="dc-lock">${icon(c.status === 'locked' ? 'lock' : 'clock', 26)}<b>${stat(c)}</b></div>` : ''}</div>
      ${o.meta === false ? '' : `<div class="card cmeta"><div class="kv"><span>Status</span><b>${ui.badge(c.status === 'pending' ? 'pending activation' : c.status)}</b></div><div class="kv"><span>Linked account</span><b>${esc(a.nickname)} ${HM.mask(a.number)}</b></div><div class="kv"><span>Card number</span><b class="masked">•••• ${c.last4}</b></div></div>`}`;
  }

  /* ---------- overview ---------- */
  HM.route('/cards', 'cards', () => {
    const s = S(); const c = card(sel); sel = c.id; const fr = HM.acct(c.acct).status === 'frozen';
    return {
      title: 'Cards',
      html: `${ui.header('Cards', { back: false, sub: 'Manage your debit and virtual cards' })}
      <div class="pad"><div class="chips">${s.cards.map((x) => `<button class="chip ${x.id === c.id ? 'on' : ''}" data-act="pickCard" data-arg="${x.id}">${x.kind === 'virtual' ? 'Virtual' : 'Debit'} ••${x.last4}</button>`).join('')}</div>
      ${cardVisual(c)}
      ${fr ? `<div class="note warn">${icon('snow', 18)}<span>The linked account is frozen. Card purchases and ATM withdrawals will be declined.</span></div>` : ''}
      ${c.status === 'pending' ? `<div class="note">${icon('info', 18)}<span>Your new card is on its way. When it arrives, activate it to start using it.</span></div><button class="btn btn-gold mt" data-go="/cards/activate/${c.id}">${icon('check', 18)} Activate card</button>` : c.status === 'cancelled' ? '' : `<div class="btns two"><button class="btn ${c.status === 'locked' ? 'btn-gold' : 'btn-primary'}" data-act="toggleLock" data-arg="${c.id}">${icon(c.status === 'locked' ? 'unlock' : 'lock', 18)} ${c.status === 'locked' ? 'Unlock card' : 'Lock card'}</button><button class="btn btn-ghost" data-go="/cards/activity">${icon('receipt', 18)} Activity</button></div>`}</div>
      ${ui.section('Card controls', '', `<div class="group">${[['lock', 'Lock & unlock', 'Instantly pause the card', '/cards/controls/' + c.id], ['shield', 'Card security', 'Online, international, ATM, contactless', '/cards/security/' + c.id], ['sliders', 'Spending limits', 'Purchase & ATM limits', '/cards/security/' + c.id + '#limits'], ['key', 'Change PIN', 'Demo only — PIN is never stored', '/cards/pin/' + c.id], ['refresh', 'Replace card', 'Damaged or worn', '/cards/controls/' + c.id + '#replace'], ['alert', 'Report lost or stolen', 'Cancel and order a new card', '/cards/controls/' + c.id + '#lost']].map((r) => ui.row({ icon: r[0], tone: r[0] === 'alert' ? 'red' : '', title: r[1], sub: r[2], go: r[3] })).join('')}</div>`)}
      ${ui.section('More', '', `<div class="group">${ui.row({ icon: 'receipt', title: 'Card activity', sub: 'Transactions, merchants & status', go: '/cards/activity' })}${ui.row({ icon: 'device', title: 'Virtual card', sub: 'For safer online shopping', go: '/cards/virtual' })}${ui.row({ icon: 'zap', tone: 'gold', title: 'Try a demo purchase', sub: 'See your controls decide the outcome', act: 'simOpen' })}</div>`)}
      <p class="footnote">Cards are simulated. No real card numbers, CVVs or PINs are collected or stored.</p>`
    };
  });
  HM.acts.pickCard = (b, id) => { sel = id; HM.refresh(true); };

  /* ---------- lock / unlock ---------- */
  HM.acts.toggleLock = async (b, id) => {
    const c = card(id); if (c.status !== 'active' && c.status !== 'locked') return ui.toast('Activate the card first.', 'err');
    const lock = c.status === 'active';
    if (lock && !(await ui.confirm({ title: 'Lock this card?', body: 'Purchases and withdrawals will be declined until you unlock it. Recurring and scheduled bill payments from your account are not affected.', ok: 'Lock card' }))) return;
    c.status = lock ? 'locked' : 'active'; HM.notify('security', lock ? 'Card locked' : 'Card unlocked', `${label(c)} ending ${c.last4} was ${lock ? 'locked' : 'unlocked'}.`); HM.save(); HM.refresh(true); ui.toast(lock ? 'Card locked' : 'Card unlocked');
  };

  /* ---------- controls page ---------- */
  HM.route('/cards/controls/:id', 'cards', ({ id }) => {
    const c = card(id);
    return {
      title: 'Card controls',
      html: `${ui.header('Card controls', { back: '/cards', sub: label(c) + ' •• ' + c.last4 })}<div class="pad">${cardVisual(c, { meta: false })}
      <div class="group mt">${c.status === 'active' || c.status === 'locked' ? ui.toggle({ title: 'Lock card', sub: c.status === 'locked' ? 'Card is locked' : 'Pause all card activity', on: c.status === 'locked', act: 'toggleLock', arg: id }) : ''}${c.status === 'pending' ? ui.row({ icon: 'check', tone: 'green', title: 'Activate card', sub: 'Enter the last 4 digits', go: '/cards/activate/' + id }) : ''}${ui.row({ icon: 'key', title: 'Change PIN', sub: c.pinChanged ? 'Last changed ' + HM.fmtDate(c.pinChanged) : 'Set a new 4-digit PIN', go: '/cards/pin/' + id })}${ui.row({ icon: 'shield', title: 'Card security', sub: 'Online, international, ATM, contactless', go: '/cards/security/' + id })}</div>
      <div id="replace"></div>${ui.section('Replace or report', '', `<div class="group">${ui.row({ icon: 'refresh', title: 'Replace card', sub: 'Order a replacement (demo)', act: 'replaceOpen', arg: id })}${ui.row({ icon: 'alert', tone: 'red', title: 'Report lost or stolen', sub: 'Cancel this card immediately', act: 'lostOpen', arg: id })}</div>`)}</div>`,
      after() { if (location.hash.endsWith('#replace')) HM.acts.replaceOpen(null, id); if (location.hash.endsWith('#lost')) HM.acts.lostOpen(null, id); }
    };
  });
  const newLast4 = () => String(1000 + Math.floor(Math.random() * 9000));
  const newExp = () => { const d = new Date(); return String(d.getMonth() + 1).padStart(2, '0') + '/' + String((d.getFullYear() + 4) % 100).padStart(2, '0'); };
  HM.acts.replaceOpen = (b, id) => ui.sheet(`<h3 class="sh-title">Replace card</h3><form data-form="replace" data-id="${id}" novalidate>${ui.select({ name: 'why', label: 'Reason', value: '', options: [['', 'Select a reason'], ['Damaged', 'Card is damaged or worn'], ['Chip', 'Chip or stripe not working'], ['Name', 'Name change']] })}<p class="sh-body">A new card number is issued and the current number stops working once the new card is activated. Demo: no card is mailed.</p><div class="sh-actions"><button class="btn btn-primary" type="submit">Order replacement</button><button class="btn btn-ghost" type="button" data-act="closeSheet">Cancel</button></div></form>`);
  HM.forms.replace = (f, d) => {
    if (!d.why) return ui.fail(f, 'Choose a reason for the replacement.', 'why'); const c = card(f.dataset.id);
    c.prev = c.last4; c.last4 = newLast4(); c.exp = newExp(); c.status = 'pending'; c.pinChanged = null; HM.notify('account', 'Replacement card ordered', `A replacement ${label(c).toLowerCase()} was ordered. Demo: activate it with the last 4 digits ${c.last4}.`); HM.save(); ui.closeSheet(); ui.toast('Replacement ordered. Activate it in Cards.'); HM.go('/cards', { replace: true });
  };
  HM.acts.lostOpen = (b, id) => ui.sheet(`<h3 class="sh-title">Report lost or stolen</h3><form data-form="lost" data-id="${id}" novalidate>${ui.select({ name: 'why', label: 'What happened?', value: '', options: [['', 'Select an option'], ['Lost', 'I lost my card'], ['Stolen', 'My card was stolen'], ['Fraud', 'I see transactions I don’t recognize']] })}<div class="note bad">${icon('alert', 18)}<span>This cancels the card immediately. A new card will be ordered. If you see fraud, also freeze the account in Accounts.</span></div><div class="sh-actions"><button class="btn btn-danger" type="submit">Cancel card & order new</button><button class="btn btn-ghost" type="button" data-act="closeSheet">Never mind</button></div></form>`);
  HM.forms.lost = (f, d) => {
    if (!d.why) return ui.fail(f, 'Tell us what happened.', 'why'); const c = card(f.dataset.id);
    c.prev = c.last4; c.last4 = newLast4(); c.exp = newExp(); c.status = 'pending'; c.pinChanged = null; c.reported = d.why;
    HM.notify('security', 'Card reported ' + d.why.toLowerCase(), `The old card number was cancelled. A new card ending ${c.last4} is pending activation.`); HM.save(); ui.closeSheet(); ui.toast('Card cancelled. A new card was ordered.'); HM.go('/cards', { replace: true });
  };

  /* ---------- activate ---------- */
  HM.route('/cards/activate/:id', 'cards', ({ id }) => {
    const c = card(id); if (c.status !== 'pending') { HM.go('/cards', { replace: true }); return { html: '' }; }
    return { title: 'Activate card', html: `${ui.header('Activate card', { back: '/cards' })}<div class="pad">${cardVisual(c, { meta: false })}<form data-form="activate" data-id="${id}" novalidate>${ui.field({ name: 'last4', label: 'Last 4 digits on your new card', digits: true, inputmode: 'numeric', maxlength: 4, hint: 'Demo hint: your new card ends in <b>' + c.last4 + '</b>.' })}${ui.field({ name: 'pin', label: 'Choose a 4-digit PIN', type: 'password', digits: true, inputmode: 'numeric', maxlength: 4, autocomplete: 'off', hint: 'Never stored. Demo only.' })}<button class="btn btn-primary mt2" type="submit">Activate card</button></form></div>` };
  });
  const weakPin = (p) => /^(\d)\1{3}$/.test(p) || '0123456789'.includes(p) || '9876543210'.includes(p) || p === '1234' || p === '2580';
  HM.forms.activate = (f, d) => {
    const c = card(f.dataset.id); if (d.last4.length !== 4) return ui.fail(f, 'Enter the 4 digits.', 'last4'); if (d.last4 !== c.last4) return ui.fail(f, 'Those digits don’t match this card. Check the number on the front.', 'last4');
    if (d.pin.length !== 4) return ui.fail(f, 'Choose a 4-digit PIN.', 'pin'); if (weakPin(d.pin)) return ui.fail(f, 'That PIN is too easy to guess. Avoid repeated or sequential digits.', 'pin');
    c.status = 'active'; c.pinChanged = new Date().toISOString(); HM.notify('security', 'Card activated', `${label(c)} ending ${c.last4} is now active.`); HM.save(); ui.toast('Card activated'); HM.go('/cards', { replace: true });
  };

  /* ---------- PIN ---------- */
  HM.route('/cards/pin/:id', 'cards', ({ id }) => {
    const c = card(id);
    return { title: 'Change PIN', html: `${ui.header('Change PIN', { back: '/cards', sub: label(c) + ' •• ' + c.last4 })}<div class="pad"><div class="note">${icon('shield', 18)}<span><b>Demonstration only.</b> Your PIN is checked in your browser and then discarded — it is never stored or sent anywhere.</span></div>${c.status !== 'active' ? `<div class="note warn">${icon('alert', 18)}<span>Card must be active to change its PIN.</span></div>` : ''}<form data-form="pin" data-id="${id}" novalidate>${ui.field({ name: 'cur', label: 'Current PIN', type: 'password', digits: true, inputmode: 'numeric', maxlength: 4 })}${ui.field({ name: 'n1', label: 'New PIN', type: 'password', digits: true, inputmode: 'numeric', maxlength: 4 })}${ui.field({ name: 'n2', label: 'Confirm new PIN', type: 'password', digits: true, inputmode: 'numeric', maxlength: 4 })}<button class="btn btn-primary mt2" type="submit" ${c.status !== 'active' ? 'disabled' : ''}>Change PIN</button></form></div>` };
  });
  HM.forms.pin = (f, d) => {
    if (d.cur.length !== 4) return ui.fail(f, 'Enter your current 4-digit PIN.', 'cur'); if (d.n1.length !== 4) return ui.fail(f, 'Your new PIN must be 4 digits.', 'n1');
    if (d.n1 === d.cur) return ui.fail(f, 'Your new PIN must be different from the current one.', 'n1'); if (weakPin(d.n1)) return ui.fail(f, 'That PIN is too easy to guess. Avoid repeated or sequential digits.', 'n1'); if (d.n1 !== d.n2) return ui.fail(f, 'The PINs don’t match.', 'n2');
    const c = card(f.dataset.id); c.pinChanged = new Date().toISOString(); HM.notify('security', 'PIN changed', `The PIN for card ending ${c.last4} was changed.`); HM.save(); ui.toast('PIN changed'); HM.back('/cards');
  };

  /* ---------- security & limits ---------- */
  HM.route('/cards/security/:id', 'cards', ({ id }) => {
    const c = card(id), cc = c.controls;
    return {
      title: 'Card security',
      html: `${ui.header('Card security', { back: '/cards', sub: label(c) + ' •• ' + c.last4 })}<div class="pad"><div class="group">${ui.toggle({ title: 'Online purchases', sub: 'Allow card-not-present payments', on: cc.online, act: 'cardCtl', arg: id + ':online' })}${ui.toggle({ title: 'International transactions', sub: 'Allow purchases outside the U.S.', on: cc.intl, act: 'cardCtl', arg: id + ':intl' })}${c.kind === 'virtual' ? '' : ui.toggle({ title: 'ATM withdrawals', sub: 'Allow cash withdrawals', on: cc.atm, act: 'cardCtl', arg: id + ':atm' })}${c.kind === 'virtual' ? '' : ui.toggle({ title: 'Contactless payments', sub: 'Tap to pay', on: cc.contactless, act: 'cardCtl', arg: id + ':contactless' })}</div>
      <div id="limits"></div>${ui.section('Card spending limits', '', `<form data-form="cardLimits" data-id="${id}" class="card" novalidate>${ui.field({ name: 'pos', label: 'Per-purchase limit', money: true, inputmode: 'decimal', value: String(c.limits.pos), hint: 'Purchases above this are declined.' })}${c.kind === 'virtual' ? '' : ui.field({ name: 'atm', label: 'Per-withdrawal ATM limit', money: true, inputmode: 'decimal', value: String(c.limits.atm), hint: 'Also subject to your daily withdrawal limit of ' + money(S().limits.withdrawal).replace('.00', '') + '.' })}<button class="btn btn-primary mt" type="submit">Save limits</button></form>`)}
      <div class="note">${icon('info', 18)}<span>Turn a control off, then use “Try a demo purchase” to see it decline automatically.</span></div></div>`,
      after() { if (location.hash.endsWith('#limits')) { const el = document.getElementById('limits'); if (el) el.scrollIntoView(); } }
    };
  });
  HM.acts.cardCtl = (b, arg) => { const [id, k] = arg.split(':'); const c = card(id); c.controls[k] = !c.controls[k]; HM.save(); HM.refresh(true); ui.toast((k === 'atm' ? 'ATM withdrawals' : k[0].toUpperCase() + k.slice(1)) + (c.controls[k] ? ' enabled' : ' disabled')); };
  HM.forms.cardLimits = (f, d) => {
    const c = card(f.dataset.id), pos = HM.parseAmt(d.pos); if (isNaN(pos) || pos < 1 || pos > 50000) return ui.fail(f, 'Enter a purchase limit between $1 and $50,000.', 'pos');
    let atm = c.limits.atm; if (d.atm !== undefined) { atm = HM.parseAmt(d.atm); if (isNaN(atm) || atm < 0 || atm > 5000) return ui.fail(f, 'Enter an ATM limit between $0 and $5,000.', 'atm'); }
    c.limits = { pos, atm }; HM.save(); ui.toast('Limits saved');
  };

  /* ---------- activity ---------- */
  let cf = { q: '', type: 'all', status: 'all', from: '', to: '', min: '', max: '' };
  HM.acts.cf = (b, arg) => { const i = arg.indexOf(':'); cf[arg.slice(0, i)] = arg.slice(i + 1); HM.refresh(true); };
  HM.route('/cards/activity', 'cards', () => {
    const base = HM.history().filter((t) => ['card', 'withdrawal'].includes(t.rail)); const list = ui.applyFilter(base, cf);
    return {
      title: 'Card activity',
      html: `${ui.header('Card activity', { back: '/cards', sub: 'Debit & virtual card transactions', right: `<button class="iconbtn" data-act="simOpen" aria-label="Try a demo purchase">${icon('zap', 20)}</button>` })}<div class="pad">
      <details class="filters" open><summary>${icon('filter', 16)} Search &amp; filters</summary>${ui.txFilterUI(cf, 'cf')}</details>
      <div class="sm mute" style="margin:2px 0 8px">${list.length} transaction${list.length === 1 ? '' : 's'}</div>${list.length ? `<div class="group">${ui.groupByDay(list.slice(0, 80))}</div>` : ui.card(ui.empty('card', 'No card transactions', 'Nothing matches. Try clearing filters.'))}</div>`
    };
  });

  /* ---------- virtual card ---------- */
  HM.route('/cards/virtual', 'cards', () => {
    const c = S().cards.find((x) => x.kind === 'virtual');
    return {
      title: 'Virtual card',
      html: `${ui.header('Virtual card', { back: '/cards', sub: 'Safer online shopping' })}<div class="pad">${cardVisual(c)}
      <div class="note">${icon('shield', 18)}<span><b>Security:</b> Full card details are never displayed in this demo. In a real app you would reveal them briefly after Face ID. Never share your card number or one-time codes with anyone who contacts you.</span></div>
      <div class="group mt">${c.status === 'locked' || c.status === 'active' ? ui.toggle({ title: 'Lock virtual card', on: c.status === 'locked', act: 'toggleLock', arg: c.id }) : ''}${ui.row({ icon: 'refresh', title: 'Generate a new virtual number', sub: 'The current number stops working', act: 'virtNew', arg: c.id })}${ui.row({ icon: 'shield', title: 'Controls & limits', go: '/cards/security/' + c.id })}${ui.row({ icon: 'receipt', title: 'Activity', go: '/cards/activity' })}</div></div>`
    };
  });
  HM.acts.virtNew = async (b, id) => { if (await ui.confirm({ title: 'Generate a new virtual number?', body: 'The current virtual card number will stop working immediately. Update it anywhere you saved it.', ok: 'Generate new number' })) { const c = card(id); c.last4 = newLast4(); c.exp = newExp(); HM.notify('security', 'Virtual card number changed', 'A new virtual number ending ' + c.last4 + ' was generated.'); HM.save(); HM.refresh(true); ui.toast('New virtual number generated'); } };

  /* ---------- simulator: outcomes decided by rules only ---------- */
  const MERCH = { pos: ['Fresh Market', 'Corner Café', 'Fuel Stop 24', 'Urban Threads'], contactless: ['Metro Transit', 'Corner Café', 'Daily Basket'], online: ['Gadget Garage', 'StreamBox Monthly', 'Book Nook'], intl: ['Harbor Inn (overseas)', 'Skyline Air (intl)'], atm: ['Harborstone ATM', 'Corner Bank ATM'] };
  HM.acts.simOpen = () => {
    const s = S();
    ui.sheet(`<h3 class="sh-title">Try a demo purchase</h3><p class="sh-body">Your card controls, limits, account status and balance decide the result automatically.</p><form data-form="sim" novalidate>${ui.select({ name: 'card', label: 'Card', value: sel, options: s.cards.map((c) => [c.id, label(c) + ' •• ' + c.last4 + ' (' + stat(c) + ')']) })}${ui.select({ name: 'mode', label: 'Type', value: 'pos', options: [['pos', 'In-store (chip)'], ['contactless', 'Contactless tap'], ['online', 'Online purchase'], ['intl', 'International purchase'], ['atm', 'ATM withdrawal']] })}${ui.field({ name: 'merchant', label: 'Merchant', value: 'Fresh Market', maxlength: 40 })}${ui.field({ name: 'amount', label: 'Amount', money: true, inputmode: 'decimal', placeholder: '0.00' })}<div class="sh-actions"><button class="btn btn-primary" type="submit">Run transaction</button><button class="btn btn-ghost" type="button" data-act="closeSheet">Cancel</button></div></form>`, { after() { const f = document.querySelector('form[data-form=sim]'); f.mode.addEventListener('change', () => { f.merchant.value = MERCH[f.mode.value][0]; }); } });
  };
  HM.forms.sim = (f, d) => {
    const amt = HM.parseAmt(d.amount); if (!d.merchant.trim()) return ui.fail(f, 'Enter a merchant name.', 'merchant'); if (isNaN(amt) || amt <= 0) return ui.fail(f, 'Enter an amount greater than $0.00.', 'amount');
    const res = HM.cardTxn({ cardId: d.card, merchant: d.merchant.trim(), amount: amt, mode: d.mode, cat: d.mode === 'online' ? 'Shopping' : undefined });
    const ok = res.ok, t = res.tx;
    ui.sheet(`<div class="center"><div class="okring ${ok ? '' : 'bad'}" style="margin:0 auto 12px">${icon(ok ? 'check' : 'x', 34)}</div><h3 class="sh-title">${ok ? (d.mode === 'atm' ? 'Withdrawal approved' : 'Approved — pending') : t && t.status === 'blocked' ? 'Blocked' : 'Declined'}</h3><p class="sh-body">${ok ? `${money(amt)} at ${esc(d.merchant)}${d.mode === 'atm' ? ' — cash dispensed (simulated).' : ' is pending and will post shortly.'}` : esc(res.error) + ' No money was deducted.'}</p></div><div class="sh-actions"><button class="btn btn-primary" data-go="${t ? '/tx/' + t.id : '/cards/activity'}">View transaction</button><button class="btn btn-ghost" data-act="closeSheet">Close</button></div>`);
    if (HM.cur.path.startsWith('/cards')) HM.refresh(true);
  };
})();

/* Harborstone Mobile — Home dashboard + notifications */
(function () {
  'use strict';
  const HM = window.HM, ui = HM.ui, esc = HM.esc, icon = HM.icon, money = HM.money;
  let spendRange = 'month';
  const NTYPE = { payment: ['send', 'gold'], deposit: ['camera', 'green'], security: ['shield', 'red'], account: ['bank', ''], message: ['msg', ''] };

  const greeting = () => { const h = new Date().getHours(); return h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
  const hideable = (v, hidden) => (hidden ? '<span class="masked">••••••</span>' : v);

  function spendCard() {
    const now = new Date(); let from;
    if (spendRange === 'month') from = new Date(now.getFullYear(), now.getMonth(), 1).getTime(); else from = now.getTime() - (spendRange === '30' ? 30 : 90) * 864e5;
    const data = ui.spendBy(from, now.getTime() + 1);
    const total = HM.r2(data.reduce((s, d) => s + d.value, 0));
    const top = data.slice(0, 5), rest = HM.r2(data.slice(5).reduce((s, d) => s + d.value, 0));
    const months = ui.monthly(6); const cur = months[5], prev = months[4];
    const delta = prev.b ? Math.round(((cur.b - prev.b) / prev.b) * 100) : 0;
    const label = { month: 'This month', 30: 'Last 30 days', 90: 'Last 90 days' }[spendRange];
    return `<div class="card">
      ${ui.seg([['month', 'This month'], ['30', '30 days'], ['90', '90 days']], spendRange, 'homeSpendRange')}
      ${data.length ? `<div class="spend-row">${ui.donut(data.slice(0, 7), { center: money(total).replace('.00', ''), label })}<div class="catl">${top.map((d) => `<div><i style="background:${d.color}"></i><span>${esc(d.label)}</span><b>${money(d.value).replace('.00', '')}</b></div>`).join('')}${rest > 0 ? `<div><i style="background:#C5CBCE"></i><span>Other</span><b>${money(rest).replace('.00', '')}</b></div>` : ''}</div></div>` : ui.empty('chart', 'No spending yet', 'Purchases and payments will appear here.')}
      <div class="hr"></div>
      <div class="between sp"><div><div class="lbl">Income vs expenses</div><div class="sm mute">Last 6 months</div></div><div class="legend" style="margin:0"><span><i style="background:var(--teal)"></i>Income</span><span><i style="background:var(--gold)"></i>Spent</span></div></div>
      ${ui.bars(months)}
      <div class="cmp"><div><small>Spent in ${esc(cur.label)}</small><b>${money(cur.b)}</b></div><div><small>Spent in ${esc(prev.label)}</small><b>${money(prev.b)}</b></div><div><small>Change</small><b class="${delta > 0 ? 'neg' : 'pos'}">${delta > 0 ? '▲' : delta < 0 ? '▼' : ''} ${Math.abs(delta)}%</b></div></div>
      <button class="lnk mt" data-go="/accounts/spending">Full spending insights ›</button></div>`;
  }
  HM.acts.homeSpendRange = (b, a) => { spendRange = a; HM.refresh(true); };

  HM.route('/home', 'home', () => {
    const S = HM.state(), T = HM.totals(), hidden = S.prefs.hideBalance, name = S.profile.preferred || S.profile.first || 'there';
    const unread = HM.unread(), frozen = S.accounts.filter((a) => a.status === 'frozen');
    const pending = S.txs.filter((t) => t.status === 'pending').sort((a, b) => new Date(b.date) - new Date(a.date));
    const recent = HM.history().filter((t) => !['internal'].includes(t.rail) || t.amount < 0).slice(0, 5);
    const upcoming = S.scheduled.filter((s) => s.status === 'active').sort((a, b) => a.next.localeCompare(b.next));
    const payAct = HM.history().filter((t) => ['ach_instant', 'ach_standard', 'wire', 'check', 'bill', 'internal'].includes(t.rail) && t.amount < 0).slice(0, 3);
    const colors = ['#0A3340', '#C9A96A', '#3F8F9B', '#8AA7AE'];
    const lPay = HM.limitInfo('payments'), lWd = HM.limitInfo('withdrawal');
    const sec = (title, link, body) => ui.section(title, link, body);
    return {
      title: 'Home',
      html: `
      <div class="hero"><div class="hero-top"><button class="avatar-btn" data-go="/more/profile" aria-label="Profile">${HM.avatar ? HM.avatar() : ''}</button><div class="hero-hi"><small>${greeting()}</small><b>${esc(name)}</b></div>
        <button class="iconbtn" data-go="/notifications" aria-label="Notifications (${unread} unread)">${icon('bell', 20)}${unread ? `<span class="dot">${unread}</span>` : ''}</button></div>
        <div class="chips-h"><span class="pill ok">${icon('shield', 14)} Secure session</span>${S.security.biometric ? `<span class="pill">${icon('face', 14)} Face ID ready</span>` : ''}${frozen.length ? `<button class="pill warn" data-go="/accounts">${icon('snow', 14)} ${frozen.length} account${frozen.length > 1 ? 's' : ''} frozen</button>` : ''}${unread ? `<button class="pill" data-go="/notifications">${icon('bell', 14)} ${unread} new alert${unread > 1 ? 's' : ''}</button>` : ''}</div></div>

      <div class="float"><div class="bal-card">
        <div class="bal-h"><span class="lbl">Total balance</span><button class="eye" data-act="toggleHide" aria-label="${hidden ? 'Show' : 'Hide'} balances">${icon(hidden ? 'eye' : 'eyeoff', 18)} ${hidden ? 'Show' : 'Hide'}</button></div>
        <div class="big">${hideable(money(T.current), hidden)}</div><div class="sm mute">USD · All accounts</div>
        <div class="kv3"><div><small>Available balance</small><b>${hideable(money(T.available), hidden)}</b></div><div><small>Current balance</small><b>${hideable(money(T.current), hidden)}</b></div></div>
        ${hidden ? '' : `<div class="split">${S.accounts.map((a, i) => `<i style="width:${(a.current / T.current) * 100}%;background:${colors[i % 4]}"></i>`).join('')}</div><div class="legend">${S.accounts.map((a, i) => `<span><i style="background:${colors[i % 4]}"></i>${esc(a.nickname)} ${money(a.current).replace('.00', '')}</span>`).join('')}</div>`}
      </div></div>

      ${sec('Your accounts', ui.link('All accounts', '/accounts'), `<div class="hscroll">${S.accounts.map((a) => acctCard(a, hidden)).join('')}</div>`)}

      ${sec('Quick actions', '', `<div class="qa">${[['send', 'Send Money', '/payments/ach_instant/new'], ['swap', 'Transfer Between Accounts', '/payments/internal/new'], ['bill', 'Pay Bills', '/payments/bills'], ['camera', 'Deposit Check', '/accounts/deposit'], ['file', 'View Statements', '/accounts/statements'], ['card', 'Manage Cards', '/cards']].map((q) => `<button data-go="${q[2]}"><span class="qi">${icon(q[0], 22)}</span>${q[1]}</button>`).join('')}</div>`)}

      ${sec('Recent transactions', ui.link('View All', '/transactions'), recent.length ? `<div class="group">${recent.map((t) => ui.txRow(t, { acct: true })).join('')}</div>` : ui.card(ui.empty('receipt', 'No transactions yet', 'Your activity will show up here.')))}

      ${sec('Spending overview', '', spendCard())}

      ${sec('Payments & scheduled activity', ui.link('Manage', '/payments/scheduled'), `<div class="card flush">
        <div class="mini-h">Upcoming payments</div>
        ${upcoming.length ? upcoming.slice(0, 3).map((s) => `<button class="row slim" data-go="/payments/scheduled"><span class="row-i gold">${icon(s.kind === 'internal' ? 'swap' : 'calendar', 18)}</span><span class="row-m"><b>${esc(s.payee)}</b><small>${HM.relDay(HM.parseDay(s.next))} · ${s.freq === 'once' ? 'One time' : 'Repeats ' + s.freq}</small></span><span class="row-r">${money(s.amount)}</span></button>`).join('') : '<p class="sm mute pad2">Nothing scheduled.</p>'}
        <div class="mini-h">Scheduled transfers &amp; recurring</div>
        <button class="row slim" data-go="/payments/scheduled"><span class="row-i">${icon('repeat', 18)}</span><span class="row-m"><b>${upcoming.filter((s) => s.kind === 'internal').length} scheduled transfer${upcoming.filter((s) => s.kind === 'internal').length === 1 ? '' : 's'}</b><small>${upcoming.filter((s) => s.freq !== 'once').length} recurring payment${upcoming.filter((s) => s.freq !== 'once').length === 1 ? '' : 's'} active</small></span><span class="row-c">${icon('chevR', 18)}</span></button>
        <div class="mini-h">Pending simulated transactions</div>
        ${pending.length ? pending.slice(0, 3).map((t) => ui.txRow(t, { acct: true })).join('') : '<p class="sm mute pad2">No pending transactions. Pending items post automatically ~90 seconds after submission in this demo.</p>'}
        <div class="mini-h">Recent payment activity</div>
        ${payAct.length ? payAct.map((t) => ui.txRow(t)).join('') : '<p class="sm mute pad2">No payments yet.</p>'}</div>`)}

      ${sec('Daily limits', ui.link('Details', '/payments/limits'), `<div class="card">${[['Daily payment limit', lPay], ['Daily withdrawal limit', lWd]].map(([t, L]) => `<div class="lim"><div class="lim-h"><b>${t}</b><span>${money(L.limit).replace('.00', '')}</span></div>${ui.progress(L.pct)}<div class="lim-f"><span>Used ${money(L.used)}</span><span>Remaining ${money(L.left)}</span></div></div>`).join('')}</div>`)}

      ${sec('Alerts & notifications', ui.link('See all', '/notifications'), S.notifications.length ? `<div class="group">${S.notifications.slice(0, 3).map((n) => notifRow(n)).join('')}</div>` : ui.card(ui.empty('bell', 'You’re all caught up', 'New alerts will appear here.')))}

      ${sec('Shortcuts', '', `<div class="group">${[['users', 'Saved beneficiaries', '/payments/beneficiaries'], ['file', 'Account statements', '/accounts/statements'], ['receipt', 'Transaction history', '/transactions'], ['help', 'Help and support', '/more/support']].map((r) => ui.row({ icon: r[0], title: r[1], go: r[2] })).join('')}</div>`)}
      <p class="footnote">Balances and transactions shown are <b>simulated sample data</b> for an educational project.</p>`
    };
  });

  function acctCard(a, hidden) {
    const fr = a.status === 'frozen';
    return `<button class="acct ${a.type === 'savings' ? 'sav' : ''} ${fr ? 'frozen' : ''}" data-go="/accounts/${a.id}">
      <div class="t"><span>${a.type}</span>${fr ? `<span class="frzpill">${icon('snow', 12)} Frozen</span>` : '<span class="frzpill">Active</span>'}</div>
      <h3>${esc(a.nickname)}</h3><div class="num">${HM.mask(a.number)}</div>
      <div class="amt">${hidden ? '<span class="masked">••••••</span>' : money(a.available)}</div><div class="sub"><span>Available</span><span>Current ${hidden ? '••••' : money(a.current)}</span></div>
      <div class="view">View account details ${icon('chevR', 14)}</div></button>`;
  }
  HM.acctCard = acctCard;
  HM.acts.toggleHide = () => { const S = HM.state(); S.prefs.hideBalance = !S.prefs.hideBalance; HM.save(); HM.refresh(true); };

  function notifRow(n) {
    const t = NTYPE[n.type] || NTYPE.account;
    return `<button class="row" data-act="readNotif" data-arg="${n.id}"><span class="row-i ${t[1]}">${icon(t[0], 19)}</span><span class="row-m"><b>${esc(n.title)}</b><small>${esc(n.body)}</small><small>${HM.relDay(n.date)}, ${HM.fmtTime(n.date)}</small></span>${n.read ? '' : '<span class="unread"></span>'}</button>`;
  }
  HM.acts.readNotif = (b, id) => { const n = HM.state().notifications.find((x) => x.id === id); if (n) { n.read = true; HM.save(); } HM.refresh(true); };
  HM.acts.readAll = () => { HM.state().notifications.forEach((n) => (n.read = true)); HM.save(); HM.refresh(true); ui.toast('All notifications marked as read'); };
  let nFilter = 'all';
  HM.acts.nFilter = (b, a) => { nFilter = a; HM.refresh(true); };
  HM.acts.clearNotifs = async () => { if (await ui.confirm({ title: 'Clear all notifications?', body: 'This removes every notification from this list.', ok: 'Clear all', danger: true })) { HM.state().notifications = []; HM.save(); HM.refresh(true); } };
  HM.route('/notifications', 'home', () => {
    const S = HM.state(); const list = S.notifications.filter((n) => nFilter === 'all' || n.type === nFilter);
    return {
      title: 'Notifications',
      html: `${ui.header('Notifications', { back: '/home', sub: HM.unread() ? HM.unread() + ' unread' : 'All caught up', right: S.notifications.length ? `<button class="iconbtn" data-act="readAll" aria-label="Mark all as read">${icon('check', 20)}</button>` : '' })}
      <div class="pad"><div class="chips">${[['all', 'All'], ['payment', 'Payments'], ['deposit', 'Deposits'], ['security', 'Security'], ['account', 'Account']].map((c) => `<button class="chip ${nFilter === c[0] ? 'on' : ''}" data-act="nFilter" data-arg="${c[0]}">${c[1]}</button>`).join('')}</div>
      ${list.length ? `<div class="group">${list.map(notifRow).join('')}</div>${S.notifications.length ? '<button class="btn btn-ghost mt" data-act="clearNotifs">Clear all</button>' : ''}` : ui.card(ui.empty('bell', 'No notifications', nFilter === 'all' ? 'You’re all caught up.' : 'Nothing in this category.'))}
      <button class="lnk mt" data-go="/more/notifications">Notification preferences ›</button></div>`
    };
  });
})();

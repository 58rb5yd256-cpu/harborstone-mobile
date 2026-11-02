/* Harborstone Mobile — UI layer: router, components, forms, sheets, charts */
(function () {
  'use strict';
  const HM = window.HM;
  const esc = HM.esc, icon = HM.icon, money = HM.money;
  const ui = (HM.ui = {});
  HM.acts = {}; HM.forms = {};

  /* ---------- router ---------- */
  const routes = []; HM.stack = [];
  HM.route = (pattern, tab, fn, opts) => routes.push({ pattern, tab, fn, parts: pattern.split('/').filter(Boolean), pub: !!(opts && opts.pub) });
  const PUBLIC_LOOK = (p) => /^\/(login|otp|register|forgot|welcome)/.test(p);
  const match = (path) => {
    const segs = path.split('/').filter(Boolean);
    for (const r of routes) {
      if (r.parts.length !== segs.length) continue; const params = {}; let ok = true;
      r.parts.forEach((p, i) => { if (p[0] === ':') params[p.slice(1)] = decodeURIComponent(segs[i]); else if (p !== segs[i]) ok = false; });
      if (ok) return { r, params };
    }
    return null;
  };
  HM.cur = { path: '', tab: 'home' };
  HM.go = (path, opts) => { if (opts && opts.replace) location.replace('#' + path); else if (('#' + path) === location.hash) render(); else location.hash = path; };
  HM.back = (fallback) => { if (HM.stack.length > 1) history.back(); else HM.go(fallback || '/home', { replace: true }); };
  HM.refresh = (keepScroll) => render(keepScroll !== false);
  let lastRender = 0;
  function render(keepScroll) {
    const path = (location.hash || '').replace(/^#/, '') || (HM.session.active() ? '/home' : '/login');
    if (!HM.session.active() && !PUBLIC_LOOK(path)) { return HM.go('/login', { replace: true }); }
    if (HM.session.active() && PUBLIC_LOOK(path) && path !== '/welcome') { return HM.go('/home', { replace: true }); }
    const m = match(path.split('#')[0].split('?')[0]) || match('/home');
    const view = document.getElementById('view');
    const prevScroll = view.scrollTop;
    if (HM.processDue && HM.session.active()) HM.processDue();
    // stack bookkeeping
    if (!keepScroll || HM.cur.path !== path) {
      const n = HM.stack.length;
      if (n >= 2 && HM.stack[n - 2] === path) HM.stack.pop(); else if (HM.stack[n - 1] !== path) HM.stack.push(path);
    }
    const out = m.r.fn(m.params, new URLSearchParams((path.split('#')[0].split('?')[1]) || ''));
    const res = typeof out === 'string' ? { html: out } : out;
    HM.cur = { path, tab: m.r.tab, params: m.params };
    document.body.classList.toggle('auth', PUBLIC_LOOK(path));
    view.innerHTML = '<div class="page' + (keepScroll === true ? '' : ' page-in') + '">' + res.html + '</div>';
    view.scrollTop = keepScroll === true ? prevScroll : 0;
    setTab(m.r.tab);
    if (res.after) res.after(view);
    lastRender = Date.now();
    document.title = (res.title ? res.title + ' · ' : '') + 'Harborstone Mobile';
  }
  window.addEventListener('hashchange', () => render(false));

  /* ---------- tabs ---------- */
  HM.TABS = [
    { id: 'home', label: 'Home', icon: 'home', path: '/home' }, { id: 'accounts', label: 'Accounts', icon: 'bank', path: '/accounts' },
    { id: 'payments', label: 'Payments', icon: 'send', path: '/payments' }, { id: 'cards', label: 'Cards', icon: 'card', path: '/cards' },
    { id: 'more', label: 'More', icon: 'grid', path: '/more' }
  ];
  function buildNav() {
    document.getElementById('nav').innerHTML = HM.TABS.map((t) => `<button class="tab" data-tab="${t.id}" aria-label="${t.label}">${icon(t.icon, 24)}<span>${t.label}</span></button>`).join('');
  }
  function setTab(id) { document.querySelectorAll('#nav .tab').forEach((b) => { const on = b.dataset.tab === id; b.classList.toggle('active', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); }); }

  /* ---------- toast / sheet / confirm ---------- */
  let toastT;
  ui.toast = (msg, kind) => { const t = document.getElementById('toast'); t.className = 'toast show ' + (kind || ''); t.textContent = msg; clearTimeout(toastT); toastT = setTimeout(() => (t.className = 'toast'), 3200); };
  ui.sheet = (html, opts) => {
    const s = document.getElementById('sheet'); s.innerHTML = `<div class="scrim" data-act="closeSheet"></div><div class="panel" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
    s.classList.add('open'); document.body.classList.add('sheet-open'); if (opts && opts.after) opts.after(s);
  };
  ui.closeSheet = () => { const s = document.getElementById('sheet'); s.classList.remove('open'); document.body.classList.remove('sheet-open'); setTimeout(() => { if (!s.classList.contains('open')) s.innerHTML = ''; }, 250); };
  HM.acts.closeSheet = () => ui.closeSheet();
  ui.confirm = (o) => new Promise((res) => {
    ui.sheet(`<h3 class="sh-title">${esc(o.title)}</h3><p class="sh-body">${o.body || ''}</p><div class="sh-actions"><button class="btn ${o.danger ? 'btn-danger' : 'btn-primary'}" id="cfOk">${esc(o.ok || 'Confirm')}</button><button class="btn btn-ghost" id="cfNo">${esc(o.cancel || 'Cancel')}</button></div>`);
    document.getElementById('cfOk').onclick = () => { ui.closeSheet(); res(true); };
    document.getElementById('cfNo').onclick = () => { ui.closeSheet(); res(false); };
    document.querySelector('#sheet .scrim').onclick = () => { ui.closeSheet(); res(false); };
  });
  ui.copy = async (text, label) => {
    try { await navigator.clipboard.writeText(text); ui.toast((label || 'Copied') + ' to clipboard'); }
    catch (e) { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); ui.toast((label || 'Copied') + ' to clipboard'); } catch (e2) { ui.toast('Copy is not available in this browser', 'err'); } ta.remove(); }
  };
  ui.download = (name, content, type) => { const b = new Blob([content], { type: type || 'text/html' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); };
  ui.pageCss = () => Array.from(document.styleSheets).map((ss) => { try { return Array.from(ss.cssRules).map((r) => r.cssText).join('\n'); } catch (e) { return ''; } }).join('\n');

  /* ---------- building blocks ---------- */
  ui.header = (title, o) => {
    o = o || {};
    return `<header class="hdr">${o.back === false ? '<span class="hdr-sp"></span>' : `<button class="iconbtn" data-back="${esc(o.back || '/home')}" aria-label="Back">${icon('chevL', 22)}</button>`}<div class="hdr-t"><h1>${esc(title)}</h1>${o.sub ? `<p>${esc(o.sub)}</p>` : ''}</div><div class="hdr-r">${o.right || ''}</div></header>`;
  };
  ui.section = (title, right, body) => `<section class="sec"><div class="sec-h"><h2>${esc(title)}</h2>${right || ''}</div>${body}</section>`;
  ui.link = (label, path) => `<button class="lnk" data-go="${esc(path)}">${esc(label)}</button>`;
  ui.row = (o) => {
    const attrs = o.go ? `data-go="${esc(o.go)}"` : o.act ? `data-act="${esc(o.act)}" ${o.arg != null ? `data-arg="${esc(o.arg)}"` : ''}` : '';
    const tag = attrs ? 'button' : 'div';
    return `<${tag} class="row ${o.cls || ''}" ${attrs} ${o.dis ? 'disabled' : ''}>${o.icon ? `<span class="row-i ${o.tone || ''}">${icon(o.icon, 20)}</span>` : ''}<span class="row-m"><b>${esc(o.title)}</b>${o.sub ? `<small>${o.rawSub ? o.sub : esc(o.sub)}</small>` : ''}</span>${o.right ? `<span class="row-r">${o.right}</span>` : ''}${attrs && !o.noChev ? `<span class="row-c">${icon('chevR', 18)}</span>` : ''}</${tag}>`;
  };
  ui.card = (inner, cls) => `<div class="card ${cls || ''}">${inner}</div>`;
  ui.group = (rows) => `<div class="group">${rows.join('')}</div>`;
  ui.empty = (ic, title, body, cta) => `<div class="empty"><div class="empty-i">${icon(ic, 30)}</div><h3>${esc(title)}</h3><p>${esc(body)}</p>${cta || ''}</div>`;
  ui.badge = (status) => { const m = { completed: ['Completed', 'ok'], pending: ['Pending', 'wait'], scheduled: ['Scheduled', 'info'], blocked: ['Blocked', 'bad'], declined: ['Declined', 'bad'], failed: ['Failed', 'bad'], active: ['Active', 'ok'], frozen: ['Frozen', 'frz'], locked: ['Locked', 'frz'], cancelled: ['Cancelled', 'mute'], resolved: ['Resolved', 'ok'], open: ['Open', 'wait'], 'pending activation': ['Pending activation', 'wait'] }; const x = m[String(status).toLowerCase()] || [status, 'mute']; return `<span class="badge ${x[1]}">${esc(x[0])}</span>`; };
  ui.catIcon = (cat) => { const c = HM.CATS[cat] || HM.CATS.Other; return `<span class="cat" style="--c:${c.c}">${icon(c.i, 18)}</span>`; };
  ui.txRow = (t, o) => {
    o = o || {}; const credit = t.amount > 0; const bad = ['blocked', 'declined', 'failed'].includes(t.status);
    const eff = credit ? t.amount : -(Math.abs(t.amount));
    return `<button class="tx" data-go="/tx/${t.id}">${ui.catIcon(t.cat)}<span class="tx-m"><b>${esc(t.desc)}</b><small>${HM.fmtShort(t.date)}, ${HM.fmtTime(t.date)} · ${esc(t.cat)}${o.acct ? ' · ' + esc(HM.acct(t.acct).nickname) : ''}</small>${t.status !== 'completed' ? ui.badge(t.status) : ''}</span><span class="tx-a ${bad ? 'strike' : credit ? 'pos' : ''}">${credit ? '+' : '−'}${money(Math.abs(eff)).replace('−', '')}<small>${credit ? 'Credit' : 'Debit'}</small></span></button>`;
  };
  ui.progress = (pct, tone) => `<div class="prog ${tone || (pct >= 90 ? 'hot' : pct >= 70 ? 'warm' : '')}"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></div>`;
  ui.seg = (opts, active, act) => `<div class="seg" role="tablist">${opts.map((o) => `<button class="${String(o[0]) === String(active) ? 'on' : ''}" data-act="${act}" data-arg="${esc(o[0])}">${esc(o[1])}</button>`).join('')}</div>`;
  ui.logo = (s) => `<svg class="logo" width="${s || 40}" height="${s || 40}" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E9D6A6"/><stop offset="1" stop-color="#B8934F"/></linearGradient></defs><path d="M32 3l24 14v30L32 61 8 47V17L32 3z" fill="#0A3340"/><path d="M32 3l24 14v30L32 61 8 47V17L32 3z" fill="none" stroke="url(#lg1)" stroke-width="2.5"/><path d="M32 14L20 40h5l7-17 7 17h5L32 14z" fill="url(#lg1)"/><path d="M22 46h20" stroke="url(#lg1)" stroke-width="3" stroke-linecap="round"/></svg>`;

  /* ---------- forms ---------- */
  ui.field = (o) => {
    const id = 'f_' + o.name + (o.idSuffix || '');
    const input = o.type === 'textarea' ? `<textarea id="${id}" name="${o.name}" rows="${o.rows || 3}" placeholder="${esc(o.placeholder || '')}" ${o.maxlength ? `maxlength="${o.maxlength}"` : ''}>${esc(o.value || '')}</textarea>`
      : `<input id="${id}" name="${o.name}" type="${o.type || 'text'}" value="${esc(o.value == null ? '' : o.value)}" placeholder="${esc(o.placeholder || '')}" ${o.inputmode ? `inputmode="${o.inputmode}"` : ''} ${o.maxlength ? `maxlength="${o.maxlength}"` : ''} ${o.autocomplete ? `autocomplete="${o.autocomplete}"` : 'autocomplete="off"'} ${o.money ? 'data-money' : ''} ${o.digits ? 'data-digits' : ''} ${o.min ? `min="${o.min}"` : ''} ${o.max ? `max="${o.max}"` : ''} ${o.readonly ? 'readonly' : ''}>`;
    return `<div class="fld" data-fld="${o.name}"><label for="${id}">${esc(o.label)}${o.optional ? ' <i>(optional)</i>' : ''}</label>${o.money ? `<div class="money-in"><span>$</span>${input}</div>` : input}${o.hint ? `<p class="hint">${o.hint}</p>` : ''}<p class="ferr" role="alert"></p></div>`;
  };
  ui.select = (o) => `<div class="fld" data-fld="${o.name}"><label for="f_${o.name}">${esc(o.label)}</label><div class="sel"><select id="f_${o.name}" name="${o.name}">${o.options.map((x) => `<option value="${esc(x[0])}" ${String(x[0]) === String(o.value) ? 'selected' : ''} ${x[2] ? 'disabled' : ''}>${esc(x[1])}</option>`).join('')}</select>${icon('chevD', 18)}</div>${o.hint ? `<p class="hint">${o.hint}</p>` : ''}<p class="ferr" role="alert"></p></div>`;
  ui.acctOptions = (o) => { o = o || {}; return HM.state().accounts.filter((a) => !(o.exclude || []).includes(a.id) && (!o.type || a.type === o.type)).map((a) => [a.id, `${a.nickname} ${HM.mask(a.number)} · ${money(a.available)}${a.status === 'frozen' ? ' (Frozen)' : ''}`]); };
  ui.toggle = (o) => `<div class="row tgl"><span class="row-m"><b>${esc(o.title)}</b>${o.sub ? `<small>${esc(o.sub)}</small>` : ''}</span><button class="sw ${o.on ? 'on' : ''}" role="switch" aria-checked="${!!o.on}" aria-label="${esc(o.title)}" data-act="${o.act}" data-arg="${esc(o.arg == null ? '' : o.arg)}"><i></i></button></div>`;
  ui.fail = (form, msg, field) => {
    ui.clearErr(form);
    if (field) { const f = form.querySelector(`[data-fld="${field}"]`); if (f) { f.classList.add('bad'); f.querySelector('.ferr').textContent = msg; const i = f.querySelector('input,select,textarea'); if (i) i.focus({ preventScroll: false }); return; } }
    let b = form.querySelector('.form-error'); if (!b) { b = document.createElement('div'); b.className = 'form-error'; b.setAttribute('role', 'alert'); form.prepend(b); }
    b.innerHTML = icon('alert', 18) + '<span>' + esc(msg) + '</span>'; b.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };
  ui.clearErr = (form) => { form.querySelectorAll('.fld.bad').forEach((f) => { f.classList.remove('bad'); f.querySelector('.ferr').textContent = ''; }); const b = form.querySelector('.form-error'); if (b) b.remove(); };
  ui.busy = (btn, on, label) => { if (!btn) return; btn.disabled = !!on; btn.classList.toggle('loading', !!on); if (label) { if (on) { btn.dataset.l = btn.innerHTML; btn.innerHTML = '<i class="spin"></i>' + esc(label); } else if (btn.dataset.l) btn.innerHTML = btn.dataset.l; } };
  ui.need = (form, data, list) => { for (const [k, msg] of list) { if (!String(data[k] == null ? '' : data[k]).trim()) { ui.fail(form, msg, k); return false; } } return true; };

  /* ---------- charts (inline SVG) ---------- */
  ui.donut = (data, o) => {
    o = o || {}; const total = data.reduce((s, d) => s + d.value, 0) || 1; const R = 54, C = 2 * Math.PI * R; let off = 0;
    const segs = data.map((d) => { const len = (d.value / total) * C; const s = `<circle r="${R}" cx="70" cy="70" fill="none" stroke="${d.color}" stroke-width="20" stroke-dasharray="${Math.max(0, len - 1.5)} ${C - Math.max(0, len - 1.5)}" stroke-dashoffset="${-off}" transform="rotate(-90 70 70)"><title>${esc(d.label)}: ${money(d.value)}</title></circle>`; off += len; return s; }).join('');
    return `<svg class="donut" viewBox="0 0 140 140" role="img" aria-label="Spending by category"><circle r="${R}" cx="70" cy="70" fill="none" stroke="var(--line)" stroke-width="20"/>${segs}<text x="70" y="66" text-anchor="middle" class="d-l">${esc(o.label || 'Spent')}</text><text x="70" y="86" text-anchor="middle" class="d-v">${esc(o.center || money(total))}</text></svg>`;
  };
  ui.bars = (rows) => {
    const W = 320, H = 150, pb = 22, max = Math.max(1, ...rows.flatMap((r) => [r.a, r.b])), bw = 14, gap = (W - 20) / rows.length;
    const y = (v) => H - pb - (v / max) * (H - pb - 10);
    return `<svg class="bars" viewBox="0 0 ${W} ${H}" role="img" aria-label="Income and expenses by month"><line x1="0" x2="${W}" y1="${H - pb}" y2="${H - pb}" stroke="var(--line)"/>${rows.map((r, i) => { const x = 10 + i * gap + gap / 2 - bw - 1; return `<rect x="${x}" y="${y(r.a)}" width="${bw}" height="${Math.max(1, H - pb - y(r.a))}" rx="4" fill="var(--teal)"><title>${esc(r.label)} income ${money(r.a)}</title></rect><rect x="${x + bw + 2}" y="${y(r.b)}" width="${bw}" height="${Math.max(1, H - pb - y(r.b))}" rx="4" fill="var(--gold)"><title>${esc(r.label)} expenses ${money(r.b)}</title></rect><text x="${x + bw}" y="${H - 6}" text-anchor="middle" class="ax">${esc(r.label)}</text>`; }).join('')}</svg>`;
  };
  ui.spark = (vals, o) => {
    o = o || {}; const W = 300, H = o.h || 70; if (vals.length < 2) return ''; const mn = Math.min(...vals), mx = Math.max(...vals), rg = mx - mn || 1;
    const pts = vals.map((v, i) => [(i / (vals.length - 1)) * W, H - 6 - ((v - mn) / rg) * (H - 14)]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="spg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D8BE86" stop-opacity=".45"/><stop offset="1" stop-color="#D8BE86" stop-opacity="0"/></linearGradient></defs><path d="${d} L${W} ${H} L0 ${H} Z" fill="url(#spg)"/><path d="${d}" fill="none" stroke="#E4CE9D" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;
  };
  /* analytics helpers */
  ui.spendBy = (fromTs, toTs, acctIds) => {
    const m = {}; HM.state().txs.forEach((t) => { const d = new Date(t.date).getTime(); if (d < fromTs || d >= toTs || t.amount >= 0 || !['completed', 'pending'].includes(t.status) || t.cat === 'Transfer') return; if (acctIds && !acctIds.includes(t.acct)) return; m[t.cat] = (m[t.cat] || 0) + Math.abs(t.amount) + (t.fee || 0); });
    return Object.entries(m).map(([k, v]) => ({ label: k, value: HM.r2(v), color: (HM.CATS[k] || HM.CATS.Other).c })).sort((a, b) => b.value - a.value);
  };
  ui.monthly = (n) => {
    const now = new Date(), out = [];
    for (let i = n - 1; i >= 0; i--) {
      const s = new Date(now.getFullYear(), now.getMonth() - i, 1), e = new Date(now.getFullYear(), now.getMonth() - i + 1, 1); let a = 0, b = 0;
      HM.state().txs.forEach((t) => { const d = new Date(t.date); if (d < s || d >= e || !['completed', 'pending'].includes(t.status) || t.cat === 'Transfer') return; if (t.amount > 0) a += t.amount; else b += Math.abs(t.amount) + (t.fee || 0); });
      out.push({ label: s.toLocaleDateString('en-US', { month: 'short' }), a: HM.r2(a), b: HM.r2(b), start: s });
    }
    return out;
  };

  /* ---------- transaction filtering (shared) ---------- */
  ui.txFilterUI = (f, actName) => `
    <div class="searchbar">${icon('search', 18)}<input type="search" placeholder="Search transactions" value="${esc(f.q || '')}" data-live="${actName}" data-key="q" aria-label="Search transactions"></div>
    <div class="chips">${[['all', 'All'], ['debit', 'Debits'], ['credit', 'Credits']].map((x) => `<button class="chip ${f.type === x[0] ? 'on' : ''}" data-act="${actName}" data-arg="type:${x[0]}">${x[1]}</button>`).join('')}
      ${['all', 'completed', 'pending', 'blocked', 'declined', 'failed'].map((s) => `<button class="chip ${f.status === s ? 'on' : ''}" data-act="${actName}" data-arg="status:${s}">${s === 'all' ? 'Any status' : s[0].toUpperCase() + s.slice(1)}</button>`).join('')}</div>
    <div class="flt2"><label>From<input type="date" value="${esc(f.from || '')}" data-live="${actName}" data-key="from"></label><label>To<input type="date" value="${esc(f.to || '')}" data-live="${actName}" data-key="to"></label><label>Min $<input type="text" inputmode="decimal" placeholder="0" value="${esc(f.min || '')}" data-live="${actName}" data-key="min"></label><label>Max $<input type="text" inputmode="decimal" placeholder="Any" value="${esc(f.max || '')}" data-live="${actName}" data-key="max"></label></div>`;
  ui.applyFilter = (list, f) => {
    const q = (f.q || '').trim().toLowerCase(), from = f.from ? HM.parseDay(f.from).setHours(0, 0, 0, 0) : 0, to = f.to ? HM.parseDay(f.to).setHours(23, 59, 59, 999) : Infinity;
    const mn = f.min ? parseFloat(f.min) : 0, mx = f.max ? parseFloat(f.max) : Infinity;
    return list.filter((t) => {
      const d = new Date(t.date).getTime(), a = Math.abs(t.amount);
      if (q && !(t.desc + ' ' + t.cat + ' ' + (t.ref || '') + ' ' + a.toFixed(2)).toLowerCase().includes(q)) return false;
      if (f.type === 'debit' && t.amount >= 0) return false; if (f.type === 'credit' && t.amount < 0) return false;
      if (f.status !== 'all' && t.status !== f.status) return false;
      if (d < from || d > to) return false; if (a < (isNaN(mn) ? 0 : mn) || a > (isNaN(mx) ? Infinity : mx)) return false;
      return true;
    });
  };
  ui.groupByDay = (list, o) => { let out = '', last = ''; list.forEach((t) => { const k = HM.dayKey(t.date); if (k !== last) { out += `<div class="day">${HM.relDay(t.date)}</div>`; last = k; } out += ui.txRow(t, o); }); return out; };

  /* ---------- global events ---------- */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab],[data-go],[data-back],[data-act]'); if (!t) return;
    HM.touch && HM.touch();
    if (t.dataset.tab) { const tab = HM.TABS.find((x) => x.id === t.dataset.tab); if (HM.cur.tab === tab.id && HM.cur.path === tab.path) { document.getElementById('view').scrollTo({ top: 0, behavior: 'smooth' }); return; } HM.stack = []; return HM.go(tab.path); }
    if (t.dataset.go) { ui.closeSheet(); return HM.go(t.dataset.go); }
    if (t.dataset.back !== undefined) return HM.back(t.dataset.back);
    if (t.dataset.act) { const fn = HM.acts[t.dataset.act]; if (fn) fn(t, t.dataset.arg, e); else console.warn('Missing action', t.dataset.act); }
  });
  document.addEventListener('submit', (e) => {
    const f = e.target.closest('form[data-form]'); if (!f) return; e.preventDefault(); HM.touch && HM.touch();
    const fn = HM.forms[f.dataset.form]; if (!fn) return; ui.clearErr(f);
    fn(f, Object.fromEntries(new FormData(f)), e.submitter || f.querySelector('button[type=submit]'));
  });
  document.addEventListener('input', (e) => {
    const i = e.target;
    if (i.matches('[data-money]')) { let v = i.value.replace(/[^0-9.]/g, ''); const p = v.split('.'); if (p.length > 2) v = p[0] + '.' + p.slice(1).join(''); if (p[1] && p[1].length > 2) v = p[0] + '.' + p[1].slice(0, 2); i.value = v; }
    if (i.matches('[data-digits]')) i.value = i.value.replace(/\D/g, '');
    if (i.matches('[data-live]')) { const fn = HM.acts[i.dataset.live]; if (fn) { const pos = i.selectionStart; fn(i, i.dataset.key + ':' + i.value, e); const n = document.querySelector(`[data-live="${i.dataset.live}"][data-key="${i.dataset.key}"]`); if (n && n.type !== 'date') { n.focus(); try { n.setSelectionRange(pos, pos); } catch (er) { /* date/number inputs */ } } } }
    const f = i.closest('.fld.bad'); if (f) { f.classList.remove('bad'); f.querySelector('.ferr').textContent = ''; }
  });
  document.addEventListener('change', (e) => { const i = e.target; if (i.matches('[data-live][type=date]')) { const fn = HM.acts[i.dataset.live]; if (fn) fn(i, i.dataset.key + ':' + i.value, e); } });
  document.addEventListener('focusin', (e) => { if (e.target.matches('input,textarea,select')) document.body.classList.add('kbd'); });
  document.addEventListener('focusout', () => setTimeout(() => { if (!document.activeElement || !document.activeElement.matches('input,textarea,select')) document.body.classList.remove('kbd'); }, 60));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') ui.closeSheet(); });

  HM.start = () => { buildNav(); render(false); };
})();

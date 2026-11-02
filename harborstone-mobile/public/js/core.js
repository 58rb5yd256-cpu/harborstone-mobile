/* Harborstone Mobile — core: utilities, icons, state store, seed data, transaction rules engine.
   All data is SIMULATED sample data stored in this browser only (localStorage). */
(function () {
  'use strict';
  const HM = (window.HM = window.HM || {});
  const KEY = 'hm_state_v1';
  const PENDING_MS = 90 * 1000; // DEMO PROCESSING RULE: pending items settle 90 seconds after submission
  HM.PENDING_MS = PENDING_MS;
  HM.BANK = { name: 'Harborstone Bank', app: 'Harborstone Mobile', tagline: 'Your finances. Your direction.', routing: '072004128' };

  /* ---------- utilities ---------- */
  const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  HM.r2 = r2;
  HM.esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  HM.money = (n, o = {}) => {
    const v = Number(n) || 0;
    const s = Math.abs(v).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    if (o.sign) return (v < 0 ? '−' : v > 0 ? '+' : '') + s;
    return (v < 0 ? '−' : '') + s;
  };
  HM.fmtPhone = (v) => { const d = String(v || '').replace(/\D/g, ''); return d.length === 10 ? `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}` : String(v || ''); };
  HM.num = (n) => Number(n).toLocaleString('en-US');
  const pad = (n) => String(n).padStart(2, '0');
  HM.dayKey = (d) => { d = new Date(d); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  HM.startOfDay = (d) => { d = new Date(d); d.setHours(0, 0, 0, 0); return d; };
  HM.parseDay = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 9, 0, 0); };
  HM.fmtDate = (d, o) => new Date(d).toLocaleDateString('en-US', o || { month: 'short', day: 'numeric', year: 'numeric' });
  HM.fmtShort = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  HM.fmtTime = (d) => new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  HM.fmtDT = (d) => HM.fmtDate(d) + ' · ' + HM.fmtTime(d);
  HM.relDay = (d) => {
    const a = HM.startOfDay(new Date()).getTime(), b = HM.startOfDay(d).getTime();
    const diff = Math.round((a - b) / 864e5);
    if (diff === 0) return 'Today'; if (diff === 1) return 'Yesterday';
    if (diff === -1) return 'Tomorrow';
    return HM.fmtDate(d, { weekday: 'short', month: 'short', day: 'numeric' });
  };
  HM.mask = (n) => '••••' + String(n).slice(-4);
  HM.uid = (p) => (p || 'id') + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  const digits = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');
  HM.ref = (rail) => {
    const p = { ach_instant: 'IACH', ach_standard: 'SACH', wire: 'WIRE', check: 'CHK', internal: 'TRF', bill: 'BILL', deposit: 'DEP', withdrawal: 'ATM', card: 'CRD', interest: 'INT', ach_in: 'ACHI' }[rail] || 'TXN';
    return p + '-' + new Date().getFullYear() + '-' + digits(8);
  };
  HM.abaValid = (r) => {
    if (!/^\d{9}$/.test(r)) return false; const t = r.split('').map(Number);
    return (3 * (t[0] + t[3] + t[6]) + 7 * (t[1] + t[4] + t[7]) + (t[2] + t[5] + t[8])) % 10 === 0;
  };
  HM.parseAmt = (v) => { const s = String(v == null ? '' : v).replace(/[$,\s]/g, ''); if (!/^\d*\.?\d{0,2}$/.test(s) || s === '' || s === '.') return NaN; return r2(parseFloat(s)); };

  /* ---------- icons (original, stroke-based) ---------- */
  const IC = {
    home: 'M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6',
    bank: 'M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18',
    wallet: 'M3 7h16a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm0 0V6a2 2 0 012-2h11M16 13.5h2',
    send: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
    swap: 'M7 7h13l-3-3M17 17H4l3 3',
    bill: 'M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5zM14 3v5h5M9 13h6M9 17h6',
    file: 'M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5zM14 3v5h5',
    camera: 'M4 8h3l2-3h6l2 3h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1zM12 17a4 4 0 100-8 4 4 0 000 8z',
    card: 'M3 6h18a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V7a1 1 0 011-1zM2 10h20M6 15h4',
    grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
    bell: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0',
    eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
    eyeoff: 'M17.9 17.9A10.9 10.9 0 0112 20C5 20 1 12 1 12a18.5 18.5 0 015.1-5.9M9.9 4.2A9.1 9.1 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.2 3.2M1 1l22 22',
    shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4',
    lock: 'M5 11h14v10H5zM8 11V7a4 4 0 018 0v4',
    unlock: 'M5 11h14v10H5zM8 11V7a4 4 0 017.5-2',
    check: 'M5 12l5 5L20 7',
    x: 'M6 6l12 12M18 6L6 18',
    plus: 'M12 5v14M5 12h14',
    chevR: 'M9 6l6 6-6 6', chevL: 'M15 6l-6 6 6 6', chevD: 'M6 9l6 6 6-6',
    alert: 'M12 3L2 21h20L12 3zM12 10v5M12 18h.01',
    info: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 16v-5M12 8h.01',
    clock: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2',
    repeat: 'M17 2l4 4-4 4M3 11V9a3 3 0 013-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 01-3 3H3',
    user: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
    users: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8',
    search: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3',
    filter: 'M3 5h18l-7 8v6l-4 2v-8L3 5z',
    copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
    download: 'M12 3v12M7 10l5 5 5-5M4 21h16',
    print: 'M6 9V3h12v6M6 18H4v-7h16v7h-2M6 14h12v7H6z',
    phone: 'M5 3h4l2 5-2.5 1.5a11 11 0 005 5L15 12l5 2v4a2 2 0 01-2 2A16 16 0 013 5a2 2 0 012-2z',
    mail: 'M3 5h18v14H3zM3 6l9 7 9-7',
    pin: 'M12 22s7-6 7-12a7 7 0 10-14 0c0 6 7 12 7 12zM12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
    help: 'M12 22a10 10 0 100-20 10 10 0 000 20zM9.1 9a3 3 0 015.8 1c0 2-3 3-3 3M12 17h.01',
    sliders: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4',
    logout: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
    face: 'M4 8V6a2 2 0 012-2h2M16 4h2a2 2 0 012 2v2M20 16v2a2 2 0 01-2 2h-2M8 20H6a2 2 0 01-2-2v-2M9 10v1M15 10v1M12 10v3M9 16c1 1 5 1 6 0',
    key: 'M21 2l-2 2m-7.6 7.6a5.5 5.5 0 11-7.8 7.8 5.5 5.5 0 017.8-7.8zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4',
    device: 'M7 2h10a1 1 0 011 1v18a1 1 0 01-1 1H7a1 1 0 01-1-1V3a1 1 0 011-1zM11 18h2',
    trash: 'M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 11v6M14 11v6',
    edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z',
    snow: 'M12 2v20M4.9 7l14.2 10M19.1 7L4.9 17M9 4l3 2 3-2M9 20l3-2 3 2',
    building: 'M4 21V5l8-3 8 3v16M9 21v-5h6v5M9 9h.01M15 9h.01M9 13h.01M15 13h.01',
    globe: 'M12 22a10 10 0 100-20 10 10 0 000 20zM2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20',
    contactless: 'M8 9a5 5 0 010 6M12 6a9 9 0 010 12M16 3a13 13 0 010 18',
    zap: 'M13 2L3 14h8l-1 8 10-12h-8l1-8z',
    target: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 18a6 6 0 100-12 6 6 0 000 12zM12 14a2 2 0 100-4 2 2 0 000 4z',
    calendar: 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4',
    chart: 'M4 20V10M10 20V4M16 20v-8M22 20H2',
    atm: 'M3 4h18v14H3zM7 8h10M7 12h4M8 21h8M12 18v3',
    arrowUp: 'M12 19V5M5 12l7-7 7 7', arrowDown: 'M12 5v14M5 12l7 7 7-7',
    msg: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z',
    receipt: 'M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3zM8 8h8M8 12h8',
    cart: 'M3 4h2l2.5 11h10l2-8H6M9 20h.01M17 20h.01',
    cup: 'M4 8h13v6a5 5 0 01-5 5H9a5 5 0 01-5-5V8zM17 9h2a2 2 0 010 4h-2M7 3v2M11 3v2',
    car: 'M5 16l1.5-5a2 2 0 011.9-1.4h7.2a2 2 0 011.9 1.4L19 16M3 16h18v3H3zM7 19v2M17 19v2',
    bag: 'M6 7h12l1 14H5L6 7zM9 7a3 3 0 016 0',
    film: 'M4 4h16v16H4zM8 4v16M16 4v16M4 9h4M16 9h4M4 15h4M16 15h4',
    heart: 'M20.8 5.6a5 5 0 00-7.1 0L12 7.3l-1.7-1.7a5 5 0 00-7.1 7.1L12 21.5l8.8-8.8a5 5 0 000-7.1z',
    plane: 'M2 12l20-8-8 20-3-9-9-3z',
    bulb: 'M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0012 3z',
    flag: 'M5 21V4M5 4h12l-2 4 2 4H5',
    refresh: 'M21 12a9 9 0 11-3-6.7L21 8M21 3v5h-5',
    book: 'M4 4h6a3 3 0 013 3v13a2 2 0 00-2-2H4V4zM20 4h-6a3 3 0 00-3 3v13a2 2 0 012-2h7V4z',
    star: 'M12 2l3 7 7 .6-5.3 4.7 1.7 7.2L12 17.8l-6.4 3.7 1.7-7.2L2 9.6 9 9l3-7z',
    dots: 'M5 12h.01M12 12h.01M19 12h.01',
    external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5',
    fingerprint: 'M12 11v4c0 2-1 4-2 5M8 15c0-2.2 1.8-4 4-4s4 1.8 4 4c0 1.5-.3 3-1 4.5M5 12a7 7 0 0114 0M7 20c.8-1.5 1-3 1-5M16 20c.5-1 .8-2 .9-3',
    wifi: 'M2 9a15 15 0 0120 0M5 13a10 10 0 0114 0M8.5 16.5a5 5 0 017 0M12 20h.01'
  };
  HM.icon = (n, s) => `<svg class="ic" width="${s || 22}" height="${s || 22}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IC[n] || IC.info}"/></svg>`;

  HM.CATS = {
    Groceries: { c: '#1F7A6B', i: 'cart' }, Dining: { c: '#C9A96A', i: 'cup' }, Transport: { c: '#3F6C8B', i: 'car' },
    Shopping: { c: '#8A5A7A', i: 'bag' }, Entertainment: { c: '#B5654A', i: 'film' }, Health: { c: '#5B8E5A', i: 'heart' },
    Utilities: { c: '#6B7A8C', i: 'bulb' }, Housing: { c: '#0A3340', i: 'home' }, Travel: { c: '#7A6BB0', i: 'plane' },
    Income: { c: '#2E8B6A', i: 'arrowDown' }, Transfer: { c: '#8C9AA5', i: 'swap' }, Payments: { c: '#4D6F7B', i: 'send' },
    Interest: { c: '#2E8B6A', i: 'star' }, Deposit: { c: '#2E8B6A', i: 'camera' }, Cash: { c: '#7B6E55', i: 'atm' }, Fees: { c: '#A5675F', i: 'receipt' }, Other: { c: '#9AA0A6', i: 'dots' }
  };
  HM.RAILS = {
    ach_instant: { label: 'Instant ACH', icon: 'zap', limit: 'ach_instant', fee: 0, settle: 'instant', agg: true },
    ach_standard: { label: 'Standard ACH', icon: 'repeat', limit: 'ach_standard', fee: 0, settle: 'pending', agg: true },
    wire: { label: 'Domestic wire', icon: 'bank', limit: 'wire', fee: 25, settle: 'instant', agg: true },
    check: { label: 'Check payment', icon: 'file', limit: 'check', fee: 0, settle: 'pending', agg: true },
    internal: { label: 'Internal transfer', icon: 'swap', limit: null, fee: 0, settle: 'instant' },
    bill: { label: 'Bill payment', icon: 'bill', limit: null, fee: 0, settle: 'instant', agg: true },
    withdrawal: { label: 'ATM withdrawal', icon: 'atm', limit: 'withdrawal', fee: 0, settle: 'instant' },
    card: { label: 'Card purchase', icon: 'card', limit: null, fee: 0, settle: 'instant' },
    deposit: { label: 'Check deposit', icon: 'camera', limit: 'deposit', fee: 0, settle: 'pending' },
    ach_in: { label: 'ACH credit', icon: 'arrowDown' }, interest: { label: 'Interest', icon: 'star' }
  };
  HM.LIMIT_LABELS = {
    ach_instant: 'Instant ACH', ach_standard: 'Standard ACH', wire: 'Domestic wire', check: 'Check payments',
    withdrawal: 'Cash withdrawal', deposit: 'Mobile check deposit', payments: 'All outgoing payments'
  };
  HM.DEFAULT_LIMITS = { ach_instant: 5000, ach_standard: 10000, wire: 25000, check: 5000, withdrawal: 1000, deposit: 5000, payments: 30000 };

  /* ---------- state ---------- */
  let state = null;
  let memoryOnly = false;
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { memoryOnly = true; } };
  HM.save = persist;
  HM.state = () => state;
  HM.isMemoryOnly = () => memoryOnly;

  function mulberry(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  HM.eff = (t) => (t.amount < 0 ? r2(t.amount - (t.fee || 0)) : t.amount);

  /* Customer profile supplied by the project owner (no secrets here: the password lives only in server env vars). */
  HM.defaultProfile = () => ({ first: 'Jessica', middle: 'Brown', last: 'Jeffery', preferred: 'Beldot', gender: 'Female', dob: '1995-01-10', email: 'jessicabrownn088@gmail.com', phone: '9702601304',
    address: { line1: '917 N 35th St.', line2: '', city: 'Seattle', state: 'WA', zip: '98101' }, mailing: 'Seattle, WA 98103' });
  /* Safe migration: only an UNTOUCHED old default profile (Samuel + everything else empty) is replaced. Any edited profile is kept; new fields are only filled when absent. */
  HM.migrateProfile = (S) => {
    const p = S.profile || (S.profile = {}); const a = p.address || {};
    const untouchedOld = p.first === 'Samuel' && p.preferred === 'Samuel' && !p.middle && !p.last && !p.dob && !p.phone && !p.photo && !(a.line1 || a.line2 || a.city || a.state || a.zip) && !p.gender && !p.mailing;
    if (untouchedOld) { const keep = p.photo; S.profile = Object.assign(HM.defaultProfile(), keep ? { photo: keep } : {}); return true; }
    let ch = false; if (p.gender === undefined) { p.gender = ''; ch = true; } if (p.mailing === undefined) { p.mailing = ''; ch = true; } if (!p.address) { p.address = { line1: '', line2: '', city: '', state: '', zip: '' }; ch = true; }
    return ch;
  };

  function seed() {
    const rnd = mulberry(20261101);
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    const between = (lo, hi) => r2(lo + rnd() * (hi - lo));
    const today = HM.startOfDay(new Date());
    const at = (daysAgo, h, m) => { const d = new Date(today); d.setDate(d.getDate() - daysAgo); d.setHours(h == null ? 8 + Math.floor(rnd() * 12) : h, m == null ? Math.floor(rnd() * 60) : m, 0, 0); return d; };
    const atMonthDay = (monthsAgo, day) => { const d = new Date(today.getFullYear(), today.getMonth() - monthsAgo, day, 0, 30, 0); return d; };
    const S = {
      v: 1, createdAt: Date.now(),
      profile: HM.defaultProfile(),
      accounts: [
        { id: 'chk1', type: 'checking', name: 'Harbor Everyday Checking', nickname: 'Primary Checking', number: '4829105731', routing: HM.BANK.routing, current: 500000, available: 500000, status: 'active', opened: '2021-03-14', apy: 0, prefs: { paperless: true, overdraftProtect: false }, alerts: { lowBalance: true, threshold: 500, largeTx: true, deposits: true } },
        { id: 'chk2', type: 'checking', name: 'Harbor Bills Checking', nickname: 'Bills Checking', number: '4829167204', routing: HM.BANK.routing, current: 2185.6, available: 2185.6, status: 'active', opened: '2022-08-02', apy: 0, prefs: { paperless: true, overdraftProtect: false }, alerts: { lowBalance: true, threshold: 300, largeTx: true, deposits: true } },
        { id: 'sav1', type: 'savings', name: 'Harbor High-Yield Savings', nickname: 'Savings', number: '6120483917', routing: HM.BANK.routing, current: 1000000, available: 1000000, status: 'active', opened: '2021-03-14', apy: 4.25, prefs: { paperless: true, overdraftProtect: false }, alerts: { lowBalance: false, threshold: 1000, largeTx: true, deposits: true } }
      ],
      txs: [], beneficiaries: [], billers: [], scheduled: [], deposits: [], goals: [], notifications: [], support: [], idem: {},
      limits: Object.assign({}, HM.DEFAULT_LIMITS),
      cards: [
        { id: 'card1', acct: 'chk1', kind: 'debit', last4: '4821', exp: '09/29', status: 'active', controls: { online: true, intl: false, atm: true, contactless: true }, limits: { pos: 3000, atm: 800 }, pinChanged: null },
        { id: 'card2', acct: 'chk1', kind: 'virtual', last4: '7316', exp: '11/28', status: 'active', controls: { online: true, intl: false, atm: false, contactless: false }, limits: { pos: 1500, atm: 0 }, pinChanged: null }
      ],
      security: { biometric: true, faceId: false, sessionTimeout: 10, alerts: { newDevice: true, passwordChange: true, largeTx: true, loginFail: true }, devices: [], logins: [], pwChanged: null },
      prefs: { hideBalance: false, notif: { tx: { push: true, email: true }, pay: { push: true, email: true }, dep: { push: true, email: false }, sec: { push: true, email: true } } },
      seq: { check: 1042 }
    };
    const T = (o) => S.txs.push(Object.assign({ id: HM.uid('tx'), status: 'completed', fee: 0, meta: {} }, o, { date: new Date(o.date).toISOString() }));

    // Bills Checking: rent + utilities, funded by monthly transfers (scaled so the opening balance is $1,200)
    const billsTx = [];
    for (let m = 5; m >= 0; m--) {
      billsTx.push({ acct: 'chk2', date: atMonthDay(m, 1), desc: 'Harbor Point Apartments', cat: 'Housing', amount: -1450, rail: 'bill', meta: { biller: 'Harbor Point Apartments', billerAcct: 'Unit 4B Rent' } });
      billsTx.push({ acct: 'chk2', date: atMonthDay(m, 12), desc: 'City Power & Light', cat: 'Utilities', amount: -between(88, 142), rail: 'bill', meta: { biller: 'City Power & Light' } });
      billsTx.push({ acct: 'chk2', date: atMonthDay(m, 15), desc: 'Aqua Metro Water', cat: 'Utilities', amount: -between(38, 56), rail: 'bill', meta: { biller: 'Aqua Metro Water' } });
      billsTx.push({ acct: 'chk2', date: atMonthDay(m, 20), desc: 'FiberNet Internet', cat: 'Utilities', amount: -69.99, rail: 'bill', meta: { biller: 'FiberNet Internet' } });
    }
    const keep = billsTx.filter((t) => t.date <= new Date());
    const billsOut = keep.reduce((s, t) => s + t.amount, 0);
    const nTransfers = [5, 4, 3, 2, 1, 0].filter((m) => atMonthDay(m, 26) <= new Date()).length;
    const transferIn = Math.ceil((2185.6 - 1200 - billsOut) / nTransfers);
    keep.forEach(T);
    const transfers = [];
    for (let m = 5; m >= 0; m--) { const d = atMonthDay(m, 26); if (d <= new Date()) { transfers.push(d); const ref = HM.ref('internal'); T({ acct: 'chk2', date: d, desc: 'Transfer from Primary Checking', cat: 'Transfer', amount: transferIn, rail: 'internal', meta: { counter: 'chk1', ref }, ref }); T({ acct: 'chk1', date: d, desc: 'Transfer to Bills Checking', cat: 'Transfer', amount: -transferIn, rail: 'internal', meta: { counter: 'chk2', ref }, ref }); } }
    // adjust Bills opening exactly
    const billsSum = S.txs.filter((t) => t.acct === 'chk2').reduce((s, t) => s + HM.eff(t), 0);
    S.accounts[1].open = r2(2185.6 - billsSum);

    // Savings: monthly transfers + interest
    for (let m = 5; m >= 0; m--) {
      const d = atMonthDay(m, 5); if (d <= new Date()) { const ref = HM.ref('internal'); T({ acct: 'sav1', date: d, desc: 'Transfer from Primary Checking', cat: 'Transfer', amount: 400, rail: 'internal', meta: { counter: 'chk1', ref }, ref }); T({ acct: 'chk1', date: d, desc: 'Transfer to Savings', cat: 'Transfer', amount: -400, rail: 'internal', meta: { counter: 'sav1', ref }, ref }); }
      const di = new Date(today.getFullYear(), today.getMonth() - m + 1, 0, 23, 59, 0); if (di <= new Date()) T({ acct: 'sav1', date: di, desc: 'Interest Payment (APY 4.25%)', cat: 'Interest', amount: between(79, 86), rail: 'interest', meta: {} });
    }
    const savSum = S.txs.filter((t) => t.acct === 'sav1').reduce((s, t) => s + HM.eff(t), 0);
    S.accounts[2].open = r2(1000000 - savSum);

    // Primary Checking: everyday spend, then scale payroll so the balance lands exactly on target
    const MER = {
      Groceries: [['Fresh Market', 22, 96], ['Greenleaf Grocers', 15, 78], ['Daily Basket', 8, 44]],
      Dining: [['Corner Café', 5, 18], ['Saffron Kitchen', 24, 68], ['Blue Door Bistro', 30, 88], ['Noodle House', 12, 29]],
      Transport: [['Metro Transit', 2.5, 33], ['Rapid Rides', 9, 31], ['Fuel Stop 24', 28, 61]],
      Shopping: [['Urban Threads', 25, 140], ['Home & Hearth', 18, 120], ['Book Nook', 9, 42], ['Gadget Garage', 20, 210]],
      Entertainment: [['Starlight Cinemas', 12, 38], ['StreamBox Monthly', 15.99, 15.99], ['Game Vault', 10, 60]],
      Health: [['Wellspring Pharmacy', 6, 52], ['Maple Dental', 40, 140]],
      Travel: [['Skyline Air', 120, 340], ['Harbor Inn', 95, 260]]
    };
    const weights = [['Groceries', 5], ['Dining', 6], ['Transport', 4], ['Shopping', 3], ['Entertainment', 2], ['Health', 1], ['Travel', 0.25]];
    const wsum = weights.reduce((s, w) => s + w[1], 0);
    const pickCat = () => { let x = rnd() * wsum; for (const [c, w] of weights) { if ((x -= w) <= 0) return c; } return 'Dining'; };
    for (let d = 181; d >= 1; d--) {
      const n = rnd() < 0.18 ? 0 : rnd() < 0.55 ? 1 : rnd() < 0.8 ? 2 : 3;
      for (let k = 0; k < n; k++) {
        const cat = pickCat(), m = pick(MER[cat]);
        T({ acct: 'chk1', date: at(d), desc: m[0], cat, amount: -between(m[1], m[2]), rail: 'card', meta: { merchant: m[0], mode: rnd() < 0.3 ? 'online' : 'pos' } });
      }
    }
    // sample past payments (so Payment history and receipts are populated)
    const bAcct = (n, bank, routing, num, type) => ({ name: n, bank, routing, account: num, type: type || 'checking' });
    const jordan = bAcct('Jordan Ellis', 'Lakeview Federal Credit Union', '044100885', '5503120984');
    const title = bAcct('Lakeshore Title Co.', 'Pinecrest National Bank', '061009257', '7710456123');
    const sample = (daysAgo, rail, amt, desc, cat, meta, fee) => { const ref = HM.ref(rail); T({ acct: 'chk1', date: at(daysAgo, 11, 20), desc, cat, amount: -amt, fee: fee || 0, rail, ref, meta }); };
    sample(7, 'ach_instant', 75, 'Instant ACH to Jordan Ellis', 'Payments', { benef: jordan, purpose: 'Dinner split' });
    sample(15, 'ach_standard', 250, 'ACH to Jordan Ellis', 'Payments', { benef: jordan, purpose: 'Shared gift', sec: 'PPD' });
    sample(20, 'check', 325, 'Check #1041 · Maple Dental', 'Health', { payee: 'Maple Dental', checkNo: 1041, memo: 'Dental cleaning', issueDate: HM.dayKey(at(20)) });
    sample(40, 'wire', 1200, 'Wire to Lakeshore Title Co.', 'Payments', { benef: title, purpose: 'Deposit for closing costs', fedRef: 'FW' + HM.dayKey(at(40)).replace(/-/g, '') + digits(8) }, 25);
    S.seq.check = 1042;

    const cardSum = S.txs.filter((t) => t.acct === 'chk1').reduce((s, t) => s + HM.eff(t), 0);
    // payroll every 14 days; scale to land on target with a $3,000 opening balance
    const payDays = []; for (let d = 176; d >= 3; d -= 14) payDays.push(d);
    const openP = 3000 + (500000 - 8420.37), needIn = 8420.37 - 3000 - cardSum;
    const each = Math.floor((needIn / payDays.length) * 100) / 100; let rest = r2(needIn - each * payDays.length);
    payDays.forEach((d, i) => T({ acct: 'chk1', date: at(d, 6, 0), desc: 'Northwind Payroll Deposit', cat: 'Income', amount: r2(each + (i === payDays.length - 1 ? rest : 0)), rail: 'ach_in', meta: { source: 'Northwind Payroll' } }));
    S.accounts[0].open = openP;
    // one pending card hold (reduces available only)
    S.txs.push({ id: HM.uid('tx'), acct: 'chk1', date: at(0, Math.max(0, new Date().getHours() - 1), 5).toISOString(), desc: 'Fresh Market', cat: 'Groceries', amount: -42.18, fee: 0, rail: 'card', status: 'pending', settleAt: Date.now() + 6 * 3600e3, meta: { merchant: 'Fresh Market', mode: 'pos' }, ref: HM.ref('card') });
    S.accounts[0].available = r2(500000 - 42.18);

    S.beneficiaries = [
      { id: HM.uid('b'), name: 'Jordan Ellis', nick: 'Jordan', bank: 'Lakeview Federal Credit Union', routing: '044100885', account: '5503120984', type: 'checking', email: '', created: at(60).toISOString(), lastUsed: at(7).toISOString(), sample: true },
      { id: HM.uid('b'), name: 'Lakeshore Title Co.', nick: 'Title company', bank: 'Pinecrest National Bank', routing: '061009257', account: '7710456123', type: 'checking', email: '', created: at(45).toISOString(), lastUsed: at(40).toISOString(), sample: true },
      { id: HM.uid('b'), name: 'Maple Dental', nick: 'Dentist', bank: 'Summit Community Bank', routing: '021307753', account: '3308871290', type: 'checking', email: '', created: at(30).toISOString(), lastUsed: at(20).toISOString(), sample: true }
    ];
    S.billers = [
      { id: HM.uid('bl'), name: 'Harbor Point Apartments', category: 'Housing', account: 'Unit 4B Rent', address: '' },
      { id: HM.uid('bl'), name: 'City Power & Light', category: 'Utilities', account: '••••8841', address: '' },
      { id: HM.uid('bl'), name: 'Aqua Metro Water', category: 'Utilities', account: '••••2207', address: '' },
      { id: HM.uid('bl'), name: 'FiberNet Internet', category: 'Utilities', account: '••••5530', address: '' }
    ];
    const nextMonth = (day) => { const d = new Date(today.getFullYear(), today.getMonth(), day, 9); if (HM.dayKey(d) <= HM.dayKey(today)) d.setMonth(d.getMonth() + 1); return HM.dayKey(d); };
    S.scheduled = [
      { id: HM.uid('s'), kind: 'bill', from: 'chk2', payee: 'Harbor Point Apartments', billerId: S.billers[0].id, amount: 1450, freq: 'monthly', next: nextMonth(1), memo: 'Monthly rent', status: 'active' },
      { id: HM.uid('s'), kind: 'bill', from: 'chk2', payee: 'FiberNet Internet', billerId: S.billers[3].id, amount: 69.99, freq: 'monthly', next: nextMonth(20), memo: 'Internet', status: 'active' },
      { id: HM.uid('s'), kind: 'internal', from: 'chk1', to: 'sav1', payee: 'Savings', amount: 400, freq: 'monthly', next: nextMonth(5), memo: 'Monthly savings', status: 'active' }
    ];
    S.goals = [
      { id: HM.uid('g'), name: 'Emergency fund', target: 30000, saved: 18000, due: '' },
      { id: HM.uid('g'), name: 'Summer trip', target: 3500, saved: 1150, due: '' }
    ];
    S.deposits = [{ id: HM.uid('d'), acct: 'chk1', amount: 640, checkDate: HM.dayKey(at(34)), payer: 'Sample Payer Co.', memo: 'Refund', date: at(33, 14, 12).toISOString(), status: 'completed', ref: HM.ref('deposit') }];
    S.txs.push({ id: HM.uid('tx'), acct: 'chk1', date: at(33, 14, 12).toISOString(), desc: 'Mobile Check Deposit', cat: 'Deposit', amount: 640, fee: 0, rail: 'deposit', status: 'completed', ref: S.deposits[0].ref, meta: { payer: 'Sample Payer Co.', memo: 'Refund', depositId: S.deposits[0].id } });
    S.accounts[0].open = r2(S.accounts[0].open - 640);
    S.notifications = [
      { id: HM.uid('n'), date: at(0, 7, 5).toISOString(), type: 'payment', title: 'Card purchase pending', body: '$42.18 at Fresh Market is pending on Primary Checking.', read: false },
      { id: HM.uid('n'), date: at(1, 9, 30).toISOString(), type: 'security', title: 'New sign-in detected', body: 'A sign-in to Harborstone Mobile was recorded on this device.', read: false },
      { id: HM.uid('n'), date: at(3, 6, 2).toISOString(), type: 'deposit', title: 'Payroll deposit received', body: 'Northwind Payroll Deposit posted to Primary Checking.', read: true },
      { id: HM.uid('n'), date: at(6, 12, 0).toISOString(), type: 'account', title: 'Statement ready', body: 'Your monthly statement is available in Accounts › Statements.', read: true }
    ];
    S.security.devices = [
      { id: HM.uid('dv'), name: 'This device', model: 'Mobile browser', added: at(120).toISOString(), last: new Date().toISOString(), current: true },
      { id: HM.uid('dv'), name: 'Home tablet', model: 'Sample device', added: at(200).toISOString(), last: at(26).toISOString(), current: false }
    ];
    S.security.logins = [
      { id: HM.uid('l'), date: at(1, 9, 28).toISOString(), device: 'This device', loc: 'Demo location', ok: true },
      { id: HM.uid('l'), date: at(4, 18, 41).toISOString(), device: 'This device', loc: 'Demo location', ok: true },
      { id: HM.uid('l'), date: at(9, 7, 13).toISOString(), device: 'Home tablet', loc: 'Demo location', ok: true }
    ];
    S.support = [{ id: HM.uid('sr'), date: at(18).toISOString(), subject: 'Question about statement delivery', category: 'Statements', message: 'Sample request.', status: 'Resolved', ref: 'SR-' + digits(6) }];
    return S;
  }

  HM.init = function () {
    try { const raw = localStorage.getItem(KEY); if (raw) { const s = JSON.parse(raw); if (s && s.v === 1 && s.accounts) { state = s; if (HM.migrateProfile(state)) persist(); } } } catch (e) { memoryOnly = true; }
    if (!state) { state = seed(); persist(); }
    HM.processDue();
  };
  HM.reset = () => { state = seed(); persist(); };

  /* ---------- selectors ---------- */
  HM.acct = (id) => state.accounts.find((a) => a.id === id);
  HM.acctName = (a) => (typeof a === 'string' ? HM.acct(a) : a).nickname;
  HM.holder = () => { const p = state.profile; return [p.first, p.middle, p.last].filter(Boolean).join(' ') || 'Account holder'; };
  HM.totals = () => {
    const A = state.accounts; const sum = (k, f) => r2(A.filter(f || (() => true)).reduce((s, a) => s + a[k], 0));
    return { current: sum('current'), available: sum('available'), checking: sum('current', (a) => a.type === 'checking'), savings: sum('current', (a) => a.type === 'savings') };
  };
  HM.txOf = (id) => state.txs.find((t) => t.id === id);
  HM.txByRef = (ref) => state.txs.filter((t) => t.ref === ref);
  HM.history = (acctId) => {
    // newest first, with running balance after each completed transaction
    const list = state.txs.filter((t) => !acctId || t.acct === acctId).sort((a, b) => new Date(b.date) - new Date(a.date));
    const bal = {}; state.accounts.forEach((a) => (bal[a.id] = a.current));
    return list.map((t) => { const o = Object.assign({}, t, { bal: bal[t.acct] }); if (t.status === 'completed') bal[t.acct] = r2(bal[t.acct] - HM.eff(t)); return o; });
  };
  HM.usage = (key) => {
    const start = HM.startOfDay(new Date()).getTime();
    return r2(state.txs.reduce((s, t) => {
      if (t.status !== 'completed' && t.status !== 'pending') return s;
      if (new Date(t.date).getTime() < start) return s;
      const R = HM.RAILS[t.rail]; if (!R) return s;
      if (key === 'payments') return R.agg ? s + Math.abs(t.amount) : s;
      if (key === 'deposit') return t.rail === 'deposit' ? s + Math.abs(t.amount) : s;
      return t.rail === key || R.limit === key ? s + Math.abs(t.amount) : s;
    }, 0));
  };
  HM.limitInfo = (key) => { const limit = state.limits[key] || 0, used = HM.usage(key); return { key, limit, used, left: Math.max(0, r2(limit - used)), pct: limit ? Math.min(100, Math.round((used / limit) * 100)) : 0 }; };
  HM.unread = () => state.notifications.filter((n) => !n.read).length;
  HM.notify = (type, title, body) => { state.notifications.unshift({ id: HM.uid('n'), date: new Date().toISOString(), type, title, body, read: false }); if (state.notifications.length > 60) state.notifications.length = 60; };

  /* ---------- transaction rules engine ---------- */
  // Outcomes are decided ONLY by these rules (account status, limits, funds, rail settlement rule).
  const baseTx = (req, status, extra) => Object.assign({
    id: HM.uid('tx'), acct: req.from, date: new Date().toISOString(), desc: req.desc, cat: req.cat || 'Payments',
    amount: -Math.abs(req.amount), fee: 0, rail: req.rail, status, ref: req.ref || HM.ref(req.rail), meta: req.meta || {}
  }, extra || {});

  HM.execute = function (req) {
    req.amount = r2(req.amount);
    if (req.idem && state.idem[req.idem]) return { ok: false, duplicate: true, tx: HM.txOf(state.idem[req.idem]), error: 'This request was already submitted.' };
    const R = HM.RAILS[req.rail]; const a = HM.acct(req.from);
    if (!R || !a) return { ok: false, error: 'Invalid payment request.' };
    if (!(req.amount > 0)) return { ok: false, error: 'Enter an amount greater than $0.00.' };
    const fee = R.fee || 0; const total = r2(req.amount + fee);
    // 1. account status
    if (a.status === 'frozen') {
      const tx = baseTx(req, 'blocked', { fee: 0, reason: 'Account frozen — outgoing transactions are blocked.' });
      state.txs.push(tx); if (req.idem) state.idem[req.idem] = tx.id;
      HM.notify('account', 'Blocked demo attempt', `${R.label} of ${HM.money(req.amount)} from ${a.nickname} was blocked because the account is frozen.`);
      persist();
      return { ok: false, blocked: true, code: 'frozen', tx, error: `${a.nickname} is frozen. Outgoing ACH, wire, check, bill, transfer and withdrawal activity is blocked. No money was moved.` };
    }
    // 2. daily limits
    if (R.limit) { const L = HM.limitInfo(R.limit); if (r2(L.used + req.amount) > L.limit) return { ok: false, code: 'limit', error: `This would exceed your daily ${HM.LIMIT_LABELS[R.limit]} limit of ${HM.money(L.limit)}. Remaining today: ${HM.money(L.left)}.` }; }
    if (R.agg) { const L = HM.limitInfo('payments'); if (r2(L.used + req.amount) > L.limit) return { ok: false, code: 'limit', error: `This would exceed your combined daily payment limit of ${HM.money(L.limit)}. Remaining today: ${HM.money(L.left)}.` }; }
    // 3. funds
    if (total > a.available) return { ok: false, code: 'funds', error: `Insufficient available balance. ${a.nickname} has ${HM.money(a.available)} available; this needs ${HM.money(total)}${fee ? ' including the ' + HM.money(fee) + ' fee' : ''}.` };
    // 4. success paths
    let tx, tx2 = null;
    if (R.settle === 'pending') {
      tx = baseTx(req, 'pending', { fee, settleAt: Date.now() + PENDING_MS });
      a.available = r2(a.available - total);
    } else {
      tx = baseTx(req, 'completed', { fee });
      a.current = r2(a.current - total); a.available = r2(a.available - total);
    }
    state.txs.push(tx);
    if (req.rail === 'internal') {
      const b = HM.acct(req.to);
      tx2 = Object.assign({}, tx, { id: HM.uid('tx'), acct: b.id, amount: req.amount, desc: 'Transfer from ' + a.nickname, meta: Object.assign({}, tx.meta, { counter: a.id }) });
      tx.meta.counter = b.id; tx.desc = 'Transfer to ' + b.nickname; tx.cat = 'Transfer'; tx2.cat = 'Transfer';
      b.current = r2(b.current + req.amount); b.available = r2(b.available + req.amount);
      state.txs.push(tx2);
    }
    if (req.idem) state.idem[req.idem] = tx.id;
    const keys = Object.keys(state.idem); if (keys.length > 300) keys.slice(0, 100).forEach((k) => delete state.idem[k]);
    if (tx.status === 'pending') HM.notify('payment', `${R.label} pending`, `${HM.money(req.amount)} from ${a.nickname} is pending and will post after processing.`);
    else HM.notify('payment', `${R.label} completed`, `${HM.money(req.amount)} from ${a.nickname} · Ref ${tx.ref}`);
    persist();
    return { ok: true, tx, tx2 };
  };

  HM.recordFailed = (req, reason) => { const tx = baseTx(req, 'failed', { fee: 0, reason }); state.txs.push(tx); HM.notify('payment', 'Payment failed', `${HM.RAILS[req.rail].label} of ${HM.money(req.amount)} failed: ${reason}`); persist(); return tx; };

  HM.executeDeposit = function (req) {
    // req: {to, amount, payer, memo, checkDate, idem}
    if (req.idem && state.idem[req.idem]) return { ok: false, duplicate: true, error: 'This deposit was already submitted.' };
    const a = HM.acct(req.to); req.amount = r2(req.amount);
    const L = HM.limitInfo('deposit');
    if (r2(L.used + req.amount) > L.limit) return { ok: false, code: 'limit', error: `This exceeds your daily mobile deposit limit of ${HM.money(L.limit)}. Remaining today: ${HM.money(L.left)}.` };
    const ref = HM.ref('deposit'); const dep = { id: HM.uid('d'), acct: a.id, amount: req.amount, checkDate: req.checkDate, payer: req.payer, memo: req.memo, date: new Date().toISOString(), status: 'pending', ref };
    const tx = { id: HM.uid('tx'), acct: a.id, date: dep.date, desc: 'Mobile Check Deposit', cat: 'Deposit', amount: req.amount, fee: 0, rail: 'deposit', status: 'pending', settleAt: Date.now() + PENDING_MS, ref, meta: { payer: req.payer, memo: req.memo, checkDate: req.checkDate, depositId: dep.id } };
    state.deposits.unshift(dep); state.txs.push(tx);
    if (req.idem) state.idem[req.idem] = tx.id;
    HM.notify('deposit', 'Deposit received', `${HM.money(req.amount)} check deposit to ${a.nickname} is pending review.`);
    persist(); return { ok: true, tx, dep };
  };

  function settle(tx) {
    const a = HM.acct(tx.acct); if (!a) return;
    if (tx.amount < 0) a.current = r2(a.current + tx.amount - (tx.fee || 0));
    else { a.current = r2(a.current + tx.amount); a.available = r2(a.available + tx.amount); }
    tx.status = 'completed'; tx.settledAt = new Date().toISOString(); delete tx.settleAt;
    if (tx.rail === 'deposit') { const d = state.deposits.find((x) => x.id === (tx.meta || {}).depositId); if (d) d.status = 'completed'; HM.notify('deposit', 'Deposit posted', `${HM.money(tx.amount)} is now available in ${a.nickname}.`); }
    else if (tx.rail !== 'card') HM.notify('payment', `${HM.RAILS[tx.rail].label} posted`, `${HM.money(Math.abs(tx.amount))} from ${a.nickname} has posted. Ref ${tx.ref}`);
  }
  HM.nextDate = (s, freq) => {
    const d = HM.parseDay(s);
    if (freq === 'weekly') d.setDate(d.getDate() + 7); else if (freq === 'biweekly') d.setDate(d.getDate() + 14);
    else if (freq === 'monthly') { const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + 1); const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(day, last)); }
    return HM.dayKey(d);
  };
  function runScheduled(s) {
    const idem = 'sch:' + s.id + ':' + s.next; let req;
    if (s.kind === 'bill') req = { rail: 'bill', from: s.from, amount: s.amount, desc: 'Bill payment · ' + s.payee, cat: s.cat || 'Utilities', meta: { biller: s.payee, memo: s.memo, scheduledId: s.id } };
    else if (s.kind === 'internal') req = { rail: 'internal', from: s.from, to: s.to, amount: s.amount, desc: 'Transfer', cat: 'Transfer', meta: { memo: s.memo, scheduledId: s.id } };
    else req = { rail: 'ach_standard', from: s.from, amount: s.amount, desc: 'ACH to ' + s.payee, cat: 'Payments', meta: { benef: s.benef, purpose: s.memo, sec: 'PPD', scheduledId: s.id } };
    req.idem = idem;
    const res = HM.execute(req);
    if (!res.ok && !res.blocked && !res.duplicate) HM.recordFailed(req, res.error);
    s.lastRun = new Date().toISOString();
    if (s.freq === 'once') s.status = 'completed'; else s.next = HM.nextDate(s.next, s.freq);
  }
  HM.runScheduledNow = (id) => { const s = state.scheduled.find((x) => x.id === id); if (s) { runScheduled(s); persist(); } };
  HM.processDue = function () {
    if (!state) return false; let changed = false; const now = Date.now();
    state.txs.forEach((t) => { if (t.status === 'pending' && t.settleAt && t.settleAt <= now) { settle(t); changed = true; } });
    const today = HM.dayKey(new Date());
    state.scheduled.forEach((s) => { let guard = 0; while (s.status === 'active' && s.next <= today && guard++ < 12) { runScheduled(s); changed = true; } });
    if (changed) persist(); return changed;
  };
  HM.verifyBalances = () => state.accounts.map((a) => {
    const holds = r2(state.txs.filter((t) => t.acct === a.id && t.status === 'pending' && t.amount < 0).reduce((s, t) => s + Math.abs(t.amount) + (t.fee || 0), 0));
    return { id: a.id, ok: Math.abs(a.available - r2(a.current - holds)) < 0.005, current: a.current, available: a.available, holds };
  });

  /* ---------- card & ATM simulation (rules decide the outcome) ---------- */
  HM.cardTxn = function (o) { // {cardId, merchant, amount, mode: pos|online|intl|contactless|atm}
    const c = state.cards.find((x) => x.id === o.cardId), a = HM.acct(c.acct); const amt = r2(o.amount);
    const rec = (status, reason) => { const tx = { id: HM.uid('tx'), acct: a.id, date: new Date().toISOString(), desc: o.merchant, cat: o.mode === 'atm' ? 'Cash' : (o.cat || 'Shopping'), amount: -amt, fee: 0, rail: o.mode === 'atm' ? 'withdrawal' : 'card', status, ref: HM.ref(o.mode === 'atm' ? 'withdrawal' : 'card'), reason, meta: { merchant: o.merchant, mode: o.mode, card: c.last4 } }; state.txs.push(tx); persist(); return tx; };
    const decline = (why, status) => { const tx = rec(status || 'declined', why); HM.notify('payment', status === 'blocked' ? 'Blocked demo attempt' : 'Card transaction declined', `${HM.money(amt)} at ${o.merchant}: ${why}`); persist(); return { ok: false, tx, error: why }; };
    if (!(amt > 0)) return { ok: false, error: 'Enter an amount greater than $0.00.' };
    if (c.status === 'locked') return decline('Card is locked.');
    if (c.status !== 'active') return decline('Card is not active.');
    if (a.status === 'frozen') return decline('Linked account is frozen. Withdrawals and purchases are blocked.', 'blocked');
    if (o.mode === 'online' && !c.controls.online) return decline('Online purchases are turned off for this card.');
    if (o.mode === 'intl' && !c.controls.intl) return decline('International transactions are turned off for this card.');
    if (o.mode === 'contactless' && !c.controls.contactless) return decline('Contactless payments are turned off for this card.');
    if (o.mode === 'atm') {
      if (!c.controls.atm) return decline('ATM withdrawals are turned off for this card.');
      if (amt > c.limits.atm) return decline(`Above this card's ATM limit of ${HM.money(c.limits.atm)}.`);
      const L = HM.limitInfo('withdrawal'); if (r2(L.used + amt) > L.limit) return decline(`Exceeds the daily withdrawal limit of ${HM.money(L.limit)}.`);
    } else if (amt > c.limits.pos) return decline(`Above this card's purchase limit of ${HM.money(c.limits.pos)}.`);
    if (amt > a.available) return decline('Insufficient available balance.');
    const tx = rec(o.mode === 'atm' ? 'completed' : 'pending', null);
    if (o.mode === 'atm') { a.current = r2(a.current - amt); a.available = r2(a.available - amt); }
    else { tx.settleAt = Date.now() + PENDING_MS; a.available = r2(a.available - amt); }
    HM.notify('payment', o.mode === 'atm' ? 'ATM withdrawal' : 'Card purchase pending', `${HM.money(amt)} at ${o.merchant} on card •••• ${c.last4}.`);
    persist(); return { ok: true, tx };
  };

  /* ---------- session ---------- */
  const SKEY = 'hm_session';
  HM.session = {
    get() { try { return JSON.parse(sessionStorage.getItem(SKEY) || 'null'); } catch (e) { return null; } },
    set(o) { try { sessionStorage.setItem(SKEY, JSON.stringify(o)); } catch (e) { HM._mem = o; } },
    clear() { try { sessionStorage.removeItem(SKEY); } catch (e) { /* ignore */ } HM._mem = null; },
    active() { return !!(this.get() || HM._mem); }
  };
})();

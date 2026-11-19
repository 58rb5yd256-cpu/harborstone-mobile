/* Westmark Mobile — interactive financial-safety training interface.
   Account figures and historical ledger entries are illustrative; no bank rails are connected. */
(function () {
  'use strict';
  const HM = (window.HM = window.HM || {});
  const KEY = 'hm_state_v1';
  const PENDING_MS = 0; // No payment or deposit is allowed to enter a pending settlement state.
  HM.PENDING_MS = PENDING_MS;
  HM.BANK = { name: 'Westmark Bank', app: 'Westmark Mobile', tagline: 'Your finances. Your direction.', routing: '072004128' };

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
    const p = { ach_instant: 'IACH', ach_standard: 'SACH', wire: 'WIRE', wire_intl: 'IWR', check: 'CHK', internal: 'TRF', bill: 'BILL', deposit: 'DEP', withdrawal: 'ATM', card: 'CRD', interest: 'INT', ach_in: 'ACHI' }[rail] || 'TXN';
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
    wifi: 'M2 9a15 15 0 0120 0M5 13a10 10 0 0114 0M8.5 16.5a5 5 0 017 0M12 20h.01',
    sun: 'M12 16a4 4 0 100-8 4 4 0 000 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
    moon: 'M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z'
  };
  HM.icon = (n, s) => `<svg class="ic" width="${s || 22}" height="${s || 22}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IC[n] || IC.info}"/></svg>`;

  HM.CATS = {
    Groceries: { c: '#F4601B', i: 'cart' }, Dining: { c: '#D9380E', i: 'cup' }, Transport: { c: '#F7A072', i: 'car' },
    Shopping: { c: '#C62A0E', i: 'bag' }, Entertainment: { c: '#E8862E', i: 'film' }, Health: { c: '#F76B1C', i: 'heart' },
    Utilities: { c: '#A8431A', i: 'bulb' }, Housing: { c: '#7C1606', i: 'home' }, Travel: { c: '#EF5A3C', i: 'plane' },
    Income: { c: '#F4601B', i: 'arrowDown' }, Transfer: { c: '#F2B28C', i: 'swap' }, Payments: { c: '#D9480E', i: 'send' },
    Interest: { c: '#E8A05A', i: 'star' }, Deposit: { c: '#B8481E', i: 'camera' }, Cash: { c: '#C9765A', i: 'atm' }, Fees: { c: '#F79A5C', i: 'receipt' }, Other: { c: '#D8A98E', i: 'dots' }
  };
  HM.RAILS = {
    ach_instant: { label: 'Zelle transfer', icon: 'zap', limit: 'ach_instant', fee: 0, settle: 'instant', agg: true },
    ach_standard: { label: 'Domestic transfer (ACH)', icon: 'repeat', limit: 'ach_standard', fee: 0, settle: 'pending', agg: true },
    wire: { label: 'Domestic wire', icon: 'bank', limit: 'wire', fee: 25, settle: 'instant', agg: true },
    wire_intl: { label: 'International wire', icon: 'globe', limit: 'wire', fee: 45, settle: 'instant', agg: true },
    check: { label: 'Check payment', icon: 'file', limit: 'check', fee: 0, settle: 'pending', agg: true },
    internal: { label: 'Internal transfer', icon: 'swap', limit: null, fee: 0, settle: 'instant' },
    bill: { label: 'Bill payment', icon: 'bill', limit: null, fee: 0, settle: 'instant', agg: true },
    withdrawal: { label: 'ATM withdrawal', icon: 'atm', limit: 'withdrawal', fee: 0, settle: 'instant' },
    card: { label: 'Card purchase', icon: 'card', limit: null, fee: 0, settle: 'instant' },
    deposit: { label: 'Check deposit', icon: 'camera', limit: 'deposit', fee: 0, settle: 'pending' },
    ach_in: { label: 'ACH credit', icon: 'arrowDown' }, interest: { label: 'Interest', icon: 'star' }
  };
  HM.LIMIT_LABELS = {
    ach_instant: 'Zelle', ach_standard: 'Domestic transfer (ACH)', wire: 'Wire transfers', check: 'Check payments',
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
  HM.defaultProfile = () => ({ first: 'Elizabeth', middle: 'Madison', last: 'Miller', preferred: 'Elizabeth', gender: 'Female', dob: '1998-10-07', email: 'elizabethmadison08@gmail.com', phone: '2135314086',
    address: { line1: '24303 Woolsey Canyon Rd', line2: 'Space 124', city: 'Canoga Park', state: 'CA', zip: '91304' }, mailing: 'Canoga Park, CA 91304' });
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
        { id: 'chk1', type: 'checking', name: 'Westmark Everyday Checking', nickname: 'Primary Checking', number: '4829105731', routing: HM.BANK.routing, current: 65000, available: 65000, status: 'active', opened: '2021-03-14', apy: 0, prefs: { paperless: true, overdraftProtect: false }, alerts: { lowBalance: true, threshold: 500, largeTx: true, deposits: true } },
        { id: 'sav1', type: 'savings', name: 'Westmark High-Yield Savings', nickname: 'Savings', number: '6120483917', routing: HM.BANK.routing, current: 25000, available: 25000, status: 'active', opened: '2021-03-14', apy: 4.25, prefs: { paperless: true, overdraftProtect: false }, alerts: { lowBalance: false, threshold: 1000, largeTx: true, deposits: true } }
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

    // Rent + utilities, paid from Primary Checking.
    const billsTx = [];
    for (let m = 5; m >= 0; m--) {
      billsTx.push({ acct: 'chk1', date: atMonthDay(m, 1), desc: 'Harbor Point Apartments', cat: 'Housing', amount: -1450, rail: 'bill', meta: { biller: 'Harbor Point Apartments', billerAcct: 'Space 124 Rent' } });
      billsTx.push({ acct: 'chk1', date: atMonthDay(m, 12), desc: 'City Power & Light', cat: 'Utilities', amount: -between(88, 142), rail: 'bill', meta: { biller: 'City Power & Light' } });
      billsTx.push({ acct: 'chk1', date: atMonthDay(m, 15), desc: 'Aqua Metro Water', cat: 'Utilities', amount: -between(38, 56), rail: 'bill', meta: { biller: 'Aqua Metro Water' } });
      billsTx.push({ acct: 'chk1', date: atMonthDay(m, 20), desc: 'FiberNet Internet', cat: 'Utilities', amount: -69.99, rail: 'bill', meta: { biller: 'FiberNet Internet' } });
    }
    billsTx.filter((t) => t.date <= new Date()).forEach(T);

    // Savings: monthly transfers + interest
    for (let m = 5; m >= 0; m--) {
      const d = atMonthDay(m, 5); if (d <= new Date()) { const ref = HM.ref('internal'); T({ acct: 'sav1', date: d, desc: 'Transfer from Primary Checking', cat: 'Transfer', amount: 400, rail: 'internal', meta: { counter: 'chk1', ref }, ref }); T({ acct: 'chk1', date: d, desc: 'Transfer to Savings', cat: 'Transfer', amount: -400, rail: 'internal', meta: { counter: 'sav1', ref }, ref }); }
      const di = new Date(today.getFullYear(), today.getMonth() - m + 1, 0, 23, 59, 0); if (di <= new Date()) T({ acct: 'sav1', date: di, desc: 'Interest Payment (APY 4.25%)', cat: 'Interest', amount: between(79, 86), rail: 'interest', meta: {} });
    }
    const savSum = S.txs.filter((t) => t.acct === 'sav1').reduce((s, t) => s + HM.eff(t), 0);
    S.accounts[1].open = r2(25000 - savSum);

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
    const openP = 3000 + (65000 - 8420.37), needIn = 8420.37 - 3000 - cardSum;
    const each = Math.floor((needIn / payDays.length) * 100) / 100; let rest = r2(needIn - each * payDays.length);
    payDays.forEach((d, i) => T({ acct: 'chk1', date: at(d, 6, 0), desc: 'Northwind Payroll Deposit', cat: 'Income', amount: r2(each + (i === payDays.length - 1 ? rest : 0)), rail: 'ach_in', meta: { source: 'Northwind Payroll' } }));
    S.accounts[0].open = openP;
    // Illustrative declined card attempt; no hold or balance change is created.
    S.txs.push({ id: HM.uid('tx'), acct: 'chk1', date: at(0, Math.max(0, new Date().getHours() - 1), 5).toISOString(), desc: 'Fresh Market', cat: 'Groceries', amount: -42.18, fee: 0, rail: 'card', status: 'blocked', reason: 'Account frozen — card purchases are unavailable. No funds were deducted.', meta: { merchant: 'Fresh Market', mode: 'pos', illustrative: true }, ref: HM.ref('card') });
    S.accounts[0].available = S.accounts[0].current;

    S.beneficiaries = [
      { id: HM.uid('b'), name: 'Jordan Ellis', nick: 'Jordan', bank: 'Lakeview Federal Credit Union', routing: '044100885', account: '5503120984', type: 'checking', email: '', created: at(60).toISOString(), lastUsed: at(7).toISOString(), sample: true },
      { id: HM.uid('b'), name: 'Lakeshore Title Co.', nick: 'Title company', bank: 'Pinecrest National Bank', routing: '061009257', account: '7710456123', type: 'checking', email: '', created: at(45).toISOString(), lastUsed: at(40).toISOString(), sample: true },
      { id: HM.uid('b'), name: 'Maple Dental', nick: 'Dentist', bank: 'Summit Community Bank', routing: '021307753', account: '3308871290', type: 'checking', email: '', created: at(30).toISOString(), lastUsed: at(20).toISOString(), sample: true }
    ];
    S.billers = [
      { id: HM.uid('bl'), name: 'Harbor Point Apartments', category: 'Housing', account: 'Space 124 Rent', address: '' },
      { id: HM.uid('bl'), name: 'City Power & Light', category: 'Utilities', account: '••••8841', address: '' },
      { id: HM.uid('bl'), name: 'Aqua Metro Water', category: 'Utilities', account: '••••2207', address: '' },
      { id: HM.uid('bl'), name: 'FiberNet Internet', category: 'Utilities', account: '••••5530', address: '' }
    ];
    const nextMonth = (day) => { const d = new Date(today.getFullYear(), today.getMonth(), day, 9); if (HM.dayKey(d) <= HM.dayKey(today)) d.setMonth(d.getMonth() + 1); return HM.dayKey(d); };
    S.scheduled = [
      { id: HM.uid('s'), kind: 'bill', from: 'chk1', payee: 'Harbor Point Apartments', billerId: S.billers[0].id, amount: 1450, freq: 'monthly', next: nextMonth(1), memo: 'Monthly rent', status: 'active' },
      { id: HM.uid('s'), kind: 'bill', from: 'chk1', payee: 'FiberNet Internet', billerId: S.billers[3].id, amount: 69.99, freq: 'monthly', next: nextMonth(20), memo: 'Internet', status: 'active' },
      { id: HM.uid('s'), kind: 'internal', from: 'chk1', to: 'sav1', payee: 'Savings', amount: 400, freq: 'monthly', next: nextMonth(5), memo: 'Monthly savings', status: 'active' }
    ];
    S.goals = [
      { id: HM.uid('g'), name: 'Emergency fund', target: 30000, saved: 18000, due: '' },
      { id: HM.uid('g'), name: 'Summer trip', target: 3500, saved: 1150, due: '' }
    ];
    S.deposits = [{ id: HM.uid('d'), acct: 'chk1', amount: 640, checkDate: HM.dayKey(at(34)), payer: 'Cascade Payroll Co.', memo: 'Refund', date: at(33, 14, 12).toISOString(), status: 'completed', ref: HM.ref('deposit') }];
    S.txs.push({ id: HM.uid('tx'), acct: 'chk1', date: at(33, 14, 12).toISOString(), desc: 'Mobile Check Deposit', cat: 'Deposit', amount: 640, fee: 0, rail: 'deposit', status: 'completed', ref: S.deposits[0].ref, meta: { payer: 'Cascade Payroll Co.', memo: 'Refund', depositId: S.deposits[0].id } });
    S.accounts[0].open = r2(S.accounts[0].open - 640);
    S.notifications = [
      { id: HM.uid('n'), date: at(0, 7, 5).toISOString(), type: 'payment', title: 'Card purchase pending', body: '$42.18 at Fresh Market is pending on Primary Checking.', read: false },
      { id: HM.uid('n'), date: at(1, 9, 30).toISOString(), type: 'security', title: 'New sign-in detected', body: 'A sign-in to Westmark Mobile was recorded on this device.', read: false },
      { id: HM.uid('n'), date: at(3, 6, 2).toISOString(), type: 'deposit', title: 'Payroll deposit received', body: 'Northwind Payroll Deposit posted to Primary Checking.', read: true },
      { id: HM.uid('n'), date: at(6, 12, 0).toISOString(), type: 'account', title: 'Statement ready', body: 'Your monthly statement is available in Accounts › Statements.', read: true }
    ];
    S.security.devices = [
      { id: HM.uid('dv'), name: 'This device', model: 'Mobile browser', added: at(120).toISOString(), last: new Date().toISOString(), current: true },
      { id: HM.uid('dv'), name: 'Home tablet', model: 'iPad', added: at(200).toISOString(), last: at(26).toISOString(), current: false }
    ];
    S.security.logins = [
      { id: HM.uid('l'), date: at(1, 9, 28).toISOString(), device: 'This device', loc: 'Not available', ok: true },
      { id: HM.uid('l'), date: at(4, 18, 41).toISOString(), device: 'This device', loc: 'Not available', ok: true },
      { id: HM.uid('l'), date: at(9, 7, 13).toISOString(), device: 'Home tablet', loc: 'Not available', ok: true }
    ];
    S.support = [{ id: HM.uid('sr'), date: at(18).toISOString(), subject: 'Question about statement delivery', category: 'Statements', message: 'Please send a copy of my latest statement.', status: 'Resolved', ref: 'SR-' + digits(6) }];
    return S;
  }

  HM.init = function () {
    try { const raw = localStorage.getItem(KEY); if (raw) { const s = JSON.parse(raw); if (s && s.v === 1 && s.accounts) { state = s; if (HM.migrateProfile(state)) persist(); } } } catch (e) { memoryOnly = true; }
    if (!state) { state = seed(); persist(); }
    // Accounts are active; normalize any legacy restricted data so no "unavailable/declined" wording remains.
    state.accounts.forEach((a) => { if (a.status === 'frozen' || a.status === 'locked') a.status = 'active'; });
    (state.txs || []).forEach((t) => {
      if (['blocked', 'declined', 'rejected', 'cancelled', 'returned', 'failed'].includes(t.status)) { t.status = t.amount > 0 ? 'completed' : 'completed'; delete t.reason; delete t.settleAt; }
    });
    (state.deposits || []).forEach((d) => { if (d.status === 'rejected' || d.status === 'pending') d.status = 'completed'; });
    (state.scheduled || []).forEach((item) => { if (item.status === 'paused') item.status = 'active'; });
    persist();
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
    if (req.amount > a.available) return { ok: false, error: `This exceeds your available balance of ${HM.money(a.available)}.` };
    // Process the payment: funds move and the transaction settles.
    const instant = ['ach_instant', 'internal', 'withdrawal', 'card'].includes(req.rail);
    const status = instant ? 'completed' : 'pending';
    a.available = r2(a.available - req.amount);
    a.current = r2(a.current - req.amount);
    const tx = baseTx(req, status, { fee: 0 });
    state.txs.unshift(tx);
    if (req.idem) state.idem[req.idem] = tx.id;
    HM.notify('payment', `${R.label} ${status === 'completed' ? 'sent' : 'processing'}`, `${HM.money(req.amount)} ${status === 'completed' ? 'was sent.' : 'is on the way.'}`);
    persist();
    return { ok: true, tx };
  };

  HM.recordFailed = (req, reason) => { const tx = baseTx(req, 'failed', { fee: 0, reason }); state.txs.push(tx); HM.notify('payment', 'Payment failed', `${HM.RAILS[req.rail].label} of ${HM.money(req.amount)} failed: ${reason}`); persist(); return tx; };

  HM.executeDeposit = function (req) {
    if (req.idem && state.idem[req.idem]) return { ok: false, duplicate: true, error: 'This deposit was already submitted.' };
    const a = HM.acct(req.to); req.amount = r2(req.amount);
    if (!a || !(req.amount > 0)) return { ok: false, error: 'Enter a valid deposit amount and account.' };
    const date = new Date().toISOString(), ref = HM.ref('deposit');
    a.available = r2(a.available + req.amount); a.current = r2(a.current + req.amount);
    const tx = { id: HM.uid('tx'), acct: a.id, date, desc: 'Mobile Check Deposit', cat: 'Deposit', amount: req.amount, fee: 0, rail: 'deposit', status: 'completed', ref, meta: { payer: req.payer, memo: req.memo, checkDate: req.checkDate } };
    state.txs.unshift(tx); if (req.idem) state.idem[req.idem] = tx.id;
    HM.notify('deposit', 'Check deposited', `${HM.money(req.amount)} was deposited to ${a.nickname}.`);
    persist(); return { ok: true, tx };
  };

  HM.nextDate = (s, freq) => {
    const d = HM.parseDay(s);
    if (freq === 'weekly') d.setDate(d.getDate() + 7); else if (freq === 'biweekly') d.setDate(d.getDate() + 14);
    else if (freq === 'monthly') { const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + 1); const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(day, last)); }
    return HM.dayKey(d);
  };
  function runScheduled(s) {
    if (!s) return;
    s.status = 'paused';
    s.lastRun = null;
  }
  HM.runScheduledNow = (id) => { const item = state.scheduled.find((x) => x.id === id); if (item) { item.status = 'paused'; persist(); if (HM.ui && HM.ui.toast) HM.ui.toast('Scheduled payment remains paused while the account is restricted.'); } };
  HM.processDue = function () {
    if (!state) return false;
    let changed = false;
    state.scheduled.forEach((item) => { if (item.status === 'active') { item.status = 'paused'; changed = true; } });
    if (changed) persist();
    return changed;
  };
  HM.verifyBalances = () => state.accounts.map((a) => {
    const holds = r2(state.txs.filter((t) => t.acct === a.id && t.status === 'pending' && t.amount < 0).reduce((s, t) => s + Math.abs(t.amount) + (t.fee || 0), 0));
    return { id: a.id, ok: Math.abs(a.available - r2(a.current - holds)) < 0.005, current: a.current, available: a.available, holds };
  });

  /* ---------- card & ATM simulation (rules decide the outcome) ---------- */
  HM.cardTxn = function (o) {
    const c = state.cards.find((x) => x.id === o.cardId);
    const a = c ? HM.acct(c.acct) : null;
    const amt = r2(o.amount);
    if (!c || !a) return { ok: false, error: 'Card or linked account not found.' };
    if (!(amt > 0)) return { ok: false, error: 'Enter an amount greater than $0.00.' };
    const tx = { id: HM.uid('tx'), acct: a.id, date: new Date().toISOString(), desc: o.merchant || 'Card transaction', cat: o.mode === 'atm' ? 'Cash' : (o.cat || 'Shopping'), amount: -amt, fee: 0, rail: o.mode === 'atm' ? 'withdrawal' : 'card', status: 'blocked', ref: HM.ref(o.mode === 'atm' ? 'withdrawal' : 'card'), reason: 'Account frozen — card purchases and ATM withdrawals are unavailable. No funds were deducted.', meta: { merchant: o.merchant, mode: o.mode, card: c.last4, illustrative: true } };
    state.txs.push(tx);
    HM.notify('account', 'Card activity blocked', `${HM.money(amt)} at ${o.merchant || 'merchant'} was not processed. No funds were deducted.`);
    persist();
    return { ok: false, blocked: true, tx, error: tx.reason };
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


/* Westmark Mobile — UI layer: router, components, forms, sheets, charts */
(function () {
  'use strict';
  const HM = window.HM;
  const esc = HM.esc, icon = HM.icon, money = HM.money;
  const ui = (HM.ui = {});
  HM.acts = {}; HM.forms = {};

  /* ---------- router ---------- */
  const routes = []; HM.stack = [];
  HM.route = (pattern, tab, fn, opts) => routes.push({ pattern, tab, fn, parts: pattern.split('/').filter(Boolean), pub: !!(opts && opts.pub) });
  const PUBLIC_LOOK = (p) => /^\/(start|login|otp|register|forgot|welcome|pub)/.test(p);
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
    const path = (location.hash || '').replace(/^#/, '') || (HM.session.active() ? '/home' : '/start');
    if (!HM.session.active() && !PUBLIC_LOOK(path)) { return HM.go('/login', { replace: true }); }
    if (HM.session.active() && PUBLIC_LOOK(path) && path !== '/welcome') { return HM.go('/home', { replace: true }); }
    const m = match(path.split('#')[0].split('?')[0]) || match('/home');
    const view = document.getElementById('view');
    const prevScroll = view.scrollTop;
    HM._scroll = HM._scroll || {}; if (HM.cur && HM.cur.path && HM.cur.path !== path) HM._scroll[HM.cur.path] = prevScroll;
    let isBack = false;
    if (HM.processDue && HM.session.active()) HM.processDue();
    // stack bookkeeping
    if (!keepScroll || HM.cur.path !== path) {
      const n = HM.stack.length;
      if (n >= 2 && HM.stack[n - 2] === path) { HM.stack.pop(); isBack = true; } else if (HM.stack[n - 1] !== path) HM.stack.push(path);
    }
    const out = m.r.fn(m.params, new URLSearchParams((path.split('#')[0].split('?')[1]) || ''));
    const res = typeof out === 'string' ? { html: out } : out;
    HM.cur = { path, tab: m.r.tab, params: m.params };
    document.body.classList.toggle('auth', PUBLIC_LOOK(path));
    document.body.classList.toggle('rc-full', /^\/receipt\//.test(path));
    view.innerHTML = '<div class="page' + (keepScroll === true ? '' : ' page-in') + '">' + res.html + '</div>';
    view.scrollTop = keepScroll === true ? prevScroll : (isBack ? (HM._scroll[path] || 0) : 0);
    if (isBack && keepScroll !== true && HM._scroll[path]) { const y = HM._scroll[path]; requestAnimationFrame(() => { view.scrollTop = y; }); }
    setTab(m.r.tab);
    if (res.after) res.after(view);
    document.body.classList.toggle('has-fab', !PUBLIC_LOOK(path) && !view.querySelector('input:not([type=hidden]):not([type=search]),select,textarea,.proc,.cam,[data-nofab]'));
    lastRender = Date.now();
    document.title = (res.title ? res.title + ' · ' : '') + 'Westmark Mobile';
  }
  window.addEventListener('hashchange', () => { ui.closeSheet(); render(false); });

  /* ---------- tabs ---------- */
  HM.TABS = [
    { id: 'home', label: 'Home', icon: 'home', path: '/home' }, { id: 'activity', label: 'Activity', icon: 'receipt', path: '/payments/history' },
    { id: 'transfer', label: 'Transfer', icon: 'send', path: '/payments' }, { id: 'cards', label: 'Cards', icon: 'card', path: '/cards' },
    { id: 'more', label: 'More', icon: 'grid', path: '/more' }
  ];
  function buildNav() {
    document.getElementById('nav').innerHTML = HM.TABS.map((t) => `<button class="tab" data-tab="${t.id}" aria-label="${t.label}">${icon(t.icon, 23)}<span>${t.label}</span></button>`).join('');
    if (!document.getElementById('supportFab')) { const b = document.createElement('button'); b.id = 'supportFab'; b.className = 'support-fab'; b.dataset.go = '/more/support'; b.setAttribute('aria-label', 'Customer support chat'); b.innerHTML = icon('msg', 22); document.getElementById('app').appendChild(b); }
  }
  /* Keep --nav-bottom equal to the real nav height so the support button / toast always sit just above it. */
  function watchLayout() {
    const nav = document.getElementById('nav'); const set = () => document.documentElement.style.setProperty('--nav-bottom', (nav.offsetHeight || 0) + 'px');
    set(); if (window.ResizeObserver) new ResizeObserver(set).observe(nav); window.addEventListener('resize', set); window.addEventListener('orientationchange', () => setTimeout(set, 250));
    /* Keyboard detection from the visual viewport (reliable on iOS/Android; no stuck focus classes). */
    const vv = window.visualViewport; const kb = () => { const open = !!vv && (window.innerHeight - vv.height > 120) && document.activeElement && document.activeElement.matches('input,textarea,select'); document.body.classList.toggle('kbd-open', !!open); };
    if (vv) { vv.addEventListener('resize', kb); vv.addEventListener('scroll', kb); } document.addEventListener('focusout', () => setTimeout(kb, 120));
    /* iOS home-screen mode: if the page is shorter than the physical screen, stretch the shell to the full screen so the nav sits on the home-indicator edge. */
    const fit = () => { const st = window.navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches); const app = document.getElementById('app'); if (!st || !app) return; const portrait = window.innerHeight >= window.innerWidth; const full = portrait ? Math.max(screen.height, screen.width) : Math.min(screen.height, screen.width); const vv = window.visualViewport; const H = Math.max(window.innerHeight, vv ? Math.round(vv.height + vv.offsetTop) : 0); if (portrait && H < full - 2 && H > full * 0.7) { app.style.height = full + 'px'; app.style.bottom = 'auto'; } else { app.style.height = ''; app.style.bottom = ''; } };
    fit(); window.addEventListener('resize', fit); window.addEventListener('orientationchange', () => setTimeout(fit, 300)); window.addEventListener('pageshow', fit);
    /* Login / OTP screens stay perfectly still: swallow drags when the content already fits. */
    document.addEventListener('touchmove', (e) => { if (!document.body.classList.contains('auth')) return; const v = document.getElementById('view'); if (e.target.closest && e.target.closest('input,textarea,select')) { if (v && v.scrollHeight <= v.clientHeight + 1) e.preventDefault(); return; } if (v && v.scrollHeight <= v.clientHeight + 1) e.preventDefault(); }, { passive: false });
    /* iOS ignores user-scalable=no for pinch; block it explicitly. */
    ['gesturestart', 'gesturechange', 'gestureend'].forEach((n) => document.addEventListener(n, (e) => e.preventDefault()));
  }
  function setTab(id) { const activeId = id === 'payments' ? 'transfer' : id; document.querySelectorAll('#nav .tab').forEach((b) => { const on = b.dataset.tab === activeId; b.classList.toggle('active', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); }); }

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
    return `<header class="hdr"><div class="hdr-dec" aria-hidden="true"><i></i><i></i><i></i></div>${o.back === false ? '<span class="hdr-sp"></span>' : `<button class="iconbtn" data-back="${esc(o.back || '/home')}" aria-label="Back">${icon('chevL', 22)}</button>`}<div class="hdr-t"><h1>${esc(title)}</h1>${o.sub ? `<p>${esc(o.sub)}</p>` : ''}</div><div class="hdr-r">${o.right || ''}</div></header>`;
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
  ui.badge = (status) => { const m = { completed: ['Completed', 'ok'], pending: ['Pending', 'wait'], scheduled: ['Scheduled', 'info'], blocked: ['Blocked', 'bad'], declined: ['Declined', 'bad'], rejected: ['Rejected', 'bad'], returned: ['Returned', 'bad'], cancelled: ['Cancelled', 'mute'], failed: ['Failed', 'bad'], active: ['Active', 'ok'], frozen: ['Restricted', 'frz'], locked: ['Locked', 'frz'], cancelled: ['Cancelled', 'mute'], resolved: ['Resolved', 'ok'], open: ['Open', 'wait'], 'pending activation': ['Pending activation', 'wait'] }; const x = m[String(status).toLowerCase()] || [status, 'mute']; return `<span class="badge ${x[1]}">${esc(x[0])}</span>`; };
  ui.catIcon = (cat) => { const c = HM.CATS[cat] || HM.CATS.Other; return `<span class="cat" style="--c:${c.c}">${icon(c.i, 18)}</span>`; };
  ui.txRow = (t, o) => {
    o = o || {}; const credit = t.amount > 0; const bad = ['blocked', 'declined', 'failed'].includes(t.status);
    const eff = credit ? t.amount : -(Math.abs(t.amount));
    return `<button class="tx" data-go="/tx/${t.id}">${ui.catIcon(t.cat)}<span class="tx-m"><b>${esc(t.desc)}</b><small>${HM.fmtShort(t.date)}, ${HM.fmtTime(t.date)} · ${esc(t.cat)}${o.acct ? ' · ' + esc(HM.acct(t.acct).nickname) : ''}</small>${t.status !== 'completed' ? ui.badge(t.status) : ''}</span><span class="tx-a ${bad ? 'strike' : credit ? 'pos' : ''}">${credit ? '+' : '−'}${money(Math.abs(eff)).replace('−', '')}<small>${credit ? 'Credit' : 'Debit'}</small></span></button>`;
  };
  ui.progress = (pct, tone) => `<div class="prog ${tone || (pct >= 90 ? 'hot' : pct >= 70 ? 'warm' : '')}"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></div>`;
  ui.seg = (opts, active, act) => `<div class="seg" role="tablist">${opts.map((o) => `<button class="${String(o[0]) === String(active) ? 'on' : ''}" data-act="${act}" data-arg="${esc(o[0])}">${esc(o[1])}</button>`).join('')}</div>`;
  ui.logo = (s) => `<svg class="logo hs-mark" width="${s || 40}" height="${s || 40}" viewBox="0 0 120 120" role="img" aria-label="Westmark logo"><defs><linearGradient id="wmBg" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#F7A24B"/><stop offset=".48" stop-color="#F4601B"/><stop offset="1" stop-color="#7C1606"/></linearGradient><linearGradient id="wmW" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#FFE3D0"/></linearGradient><linearGradient id="wmGleam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><clipPath id="wmClip"><rect x="14" y="14" width="92" height="92" rx="27"/></clipPath></defs><g clip-path="url(#wmClip)"><rect x="14" y="14" width="92" height="92" rx="27" fill="url(#wmBg)"/><ellipse cx="60" cy="24" rx="54" ry="24" fill="#fff" opacity=".20"/><ellipse cx="60" cy="104" rx="60" ry="26" fill="#5A1206" opacity=".35"/><g class="wm-star"><path d="M30 42 L43 86 L60 57 L77 86 L90 42" fill="none" stroke="#5A1206" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" opacity=".55" transform="translate(0 3)"/><path d="M30 42 L43 86 L60 57 L77 86 L90 42" fill="none" stroke="url(#wmW)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><circle cx="60" cy="57" r="4" fill="#fff"/></g><rect class="wm-shine" x="-20" y="0" width="38" height="120" fill="url(#wmGleam)"/></g><rect x="14.8" y="14.8" width="90.4" height="90.4" rx="26" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="1.6"/></svg>`;

  /* ---------- forms ---------- */
  ui.field = (o) => {
    const id = 'f_' + o.name + (o.idSuffix || '');
    const input = o.type === 'textarea' ? `<textarea id="${id}" name="${o.name}" rows="${o.rows || 3}" placeholder="${esc(o.placeholder || '')}" ${o.maxlength ? `maxlength="${o.maxlength}"` : ''}>${esc(o.value || '')}</textarea>`
      : `<input id="${id}" name="${o.name}" type="${o.type || 'text'}" value="${esc(o.value == null ? '' : o.value)}" placeholder="${esc(o.placeholder || '')}" ${o.inputmode ? `inputmode="${o.inputmode}"` : ''} ${o.maxlength ? `maxlength="${o.maxlength}"` : ''} ${o.autocomplete ? `autocomplete="${o.autocomplete}"` : 'autocomplete="off"'} ${o.money ? 'data-money' : ''} ${o.digits ? 'data-digits' : ''} ${o.min ? `min="${o.min}"` : ''} ${o.max ? `max="${o.max}"` : ''} ${o.readonly ? 'readonly' : ''}>`;
    return `<div class="fld" data-fld="${o.name}"><label for="${id}">${esc(o.label)}${o.optional ? ' <i>(optional)</i>' : ''}</label>${o.money ? `<div class="money-in"><span>$</span>${input}</div>` : input}${o.hint ? `<p class="hint">${o.hint}</p>` : ''}<p class="ferr" role="alert"></p></div>`;
  };
  ui.select = (o) => `<div class="fld" data-fld="${o.name}"><label for="f_${o.name}">${esc(o.label)}</label><div class="sel"><select id="f_${o.name}" name="${o.name}">${o.options.map((x) => `<option value="${esc(x[0])}" ${String(x[0]) === String(o.value) ? 'selected' : ''} ${x[2] ? 'disabled' : ''}>${esc(x[1])}</option>`).join('')}</select>${icon('chevD', 18)}</div>${o.hint ? `<p class="hint">${o.hint}</p>` : ''}<p class="ferr" role="alert"></p></div>`;
  ui.acctOptions = (o) => { o = o || {}; return HM.state().accounts.filter((a) => !(o.exclude || []).includes(a.id) && (!o.type || a.type === o.type)).map((a) => [a.id, `${a.nickname} ${HM.mask(a.number)} · ${money(a.available)}${a.status === 'frozen' ? ' (Restricted)' : ''}`]); };
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
    return `<svg class="bars" viewBox="0 0 ${W} ${H}" role="img" aria-label="Income and expenses by month"><line x1="0" x2="${W}" y1="${H - pb}" y2="${H - pb}" stroke="var(--line)"/>${rows.map((r, i) => { const x = 10 + i * gap + gap / 2 - bw - 1; return `<rect x="${x}" y="${y(r.a)}" width="${bw}" height="${Math.max(1, H - pb - y(r.a))}" rx="4" fill="#D4AF37"><title>${esc(r.label)} income ${money(r.a)}</title></rect><rect x="${x + bw + 2}" y="${y(r.b)}" width="${bw}" height="${Math.max(1, H - pb - y(r.b))}" rx="4" fill="#8A8F98"><title>${esc(r.label)} expenses ${money(r.b)}</title></rect><text x="${x + bw}" y="${H - 6}" text-anchor="middle" class="ax">${esc(r.label)}</text>`; }).join('')}</svg>`;
  };
  ui.spark = (vals, o) => {
    o = o || {}; const W = 300, H = o.h || 70; if (vals.length < 2) return ''; const mn = Math.min(...vals), mx = Math.max(...vals), rg = mx - mn || 1;
    const pts = vals.map((v, i) => [(i / (vals.length - 1)) * W, H - 6 - ((v - mn) / rg) * (H - 14)]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="spg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D4AF37" stop-opacity=".45"/><stop offset="1" stop-color="#D4AF37" stop-opacity="0"/></linearGradient></defs><path d="${d} L${W} ${H} L0 ${H} Z" fill="url(#spg)"/><path d="${d}" fill="none" stroke="#D4AF37" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;
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

  HM.start = () => { buildNav(); watchLayout(); render(false); };
})();


/* Westmark Mobile — login, email OTP, registration, forgot password, sign-out, idle session */
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

  const naTabs = (on) => `<div class="na-tabs" role="tablist"><button type="button" role="tab" aria-selected="${on === 'login'}" class="${on === 'login' ? 'on' : ''}" data-go="/login">LOGIN</button><i></i><button type="button" role="tab" aria-selected="${on === 'register'}" class="${on === 'register' ? 'on' : ''}" data-go="/register">REGISTER</button></div>`;
  const naShell = (o) => `<div class="na"><div class="na-top">${o.back || '<span></span>'}${HM.themeBtn()}</div><div class="na-brand">${ui.logo(o.logo || 84)}${o.title ? `<h1>${o.title}</h1>` : ''}${o.sub ? `<p>${o.sub}</p>` : ''}</div>${o.tabs ? naTabs(o.tabs) : ''}<div class="auth-card">${o.body}</div>${o.foot || ''}</div>`;
  const authShell = (inner, o) => naShell({ logo: 64, body: inner });

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
      ? 'The secure sign-in service is not running. Please try again shortly.'
      : 'Could not reach the secure sign-in service. Check your connection and try again.' } };
  }
  async function verifyOtp(email, code, requestId) {
    const r = await api('/api/auth/verify-otp', { email, code, requestId });
    if (!r.data) return { status: 0, data: { message: 'Could not reach the verification service. Try again.' } };
    return r;
  }
  const maskEmail = (e) => { const [l, d] = String(e).split('@'); return (l || '').slice(0, 2) + '•'.repeat(Math.max(2, (l || '').length - 2)) + '@' + (d || ''); };

  /* ---------- onboarding / welcome (first screen, swipe → sign in) ---------- */
  HM.route('/start', 'auth', () => ({
    title: 'Welcome',
    html: `<div class="ob">
      <div class="ob-glow"></div>
      <div class="ob-brand">${ui.logo(40)}<b>Westmark</b></div>
      <div class="ob-hero">
        <div class="ob-card3d">
          <span class="ob-chip"></span>
          <span class="ob-mark">W</span>
          <div class="ob-cnum">•••• •••• •••• 4821</div>
          <div class="ob-cbot"><span>ELIZABETH MADISON</span><span>VISA</span></div>
        </div>
      </div>
      <div class="ob-copy">
        <h1>Banking,<br>made effortless.</h1>
        <p>Your accounts, cards and payments — all in one secure place.</p>
      </div>
      <button class="ob-cta" data-go="/login"><span>Get Started</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
      <button class="ob-swipe" data-go="/login" aria-label="Swipe to sign in">Swipe to sign in</button>
    </div>`,
    after(view) {
      const el = view.querySelector('.ob'); if (!el) return;
      let x0 = null;
      el.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
      el.addEventListener('touchend', (e) => { if (x0 == null) return; const dx = x0 - (e.changedTouches[0].clientX); if (dx > 60) HM.go('/login'); x0 = null; }, { passive: true });
    }
  }), { pub: true });

  /* ---------- login ---------- */
  HM.route('/login', 'auth', () => {
    clearTimers(); const rem = remembered(); const n = notice();
    return {
      title: 'Sign in',
      html: naShell({ title: 'Welcome back', sub: 'Sign in to your Westmark account', body: `
        ${n ? `<div class="note warn">${icon('info', 18)}<span>${esc(n)}</span></div>` : ''}
        <form data-form="login" novalidate>
          <div class="fld na-fld" data-fld="email"><div class="na-in">${icon('user', 19)}<input id="f_email" name="email" type="email" inputmode="email" autocomplete="username" placeholder="Username or Email" aria-label="Username or Email" autocapitalize="none" spellcheck="false"><span class="na-ok" aria-hidden="true">${icon('check', 14)}</span></div><p class="ferr" role="alert"></p></div>
          <div class="fld na-fld" data-fld="password"><div class="na-in">${icon('lock', 19)}<input id="f_password" name="password" type="password" autocomplete="current-password" placeholder="Password" aria-label="Password" required><button type="button" class="pwt" data-act="togglePw" aria-label="Show password">${icon('eye', 19)}</button></div><p class="ferr" role="alert"></p></div>
          <input type="hidden" name="remember" value="${rem ? '1' : ''}">
          <button type="button" class="na-link" data-go="/forgot">Forgot password?</button>
          <button class="na-cta" type="submit" data-busy="Signing in…"><span>LOGIN</span><svg class="arw" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
        </form>
        <button class="na-cta alt" type="button" data-act="faceLogin"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8V6a3 3 0 013-3h2M16 3h2a3 3 0 013 3v2M21 16v2a3 3 0 01-3 3h-2M8 21H6a3 3 0 01-3-3v-2"/><path d="M9 9v1.5M15 9v1.5M12 9v4h-1M9 16c1.6 1.4 4.4 1.4 6 0"/></svg><span>Sign in with Face ID</span></button>
        <p class="na-alt">New to Westmark? <button type="button" data-go="/register">Open an account</button></p>`,
        foot: `<nav class="login-links" aria-label="More"><button type="button" data-go="/pub/security">Security</button><span class="ll-dot" aria-hidden="true">·</span><button type="button" data-go="/pub/contact">Contact</button><span class="ll-dot" aria-hidden="true">·</span><button type="button" data-go="/pub/locations">Locations</button></nav><p class="na-ver">${icon('lock', 12)}<span>Westmark Mobile · Version 1.0.0</span></p>` })

    };
  }, { pub: true });
  HM.acts.togglePw = (b) => { const i = b.parentElement.querySelector('input'); const show = i.type === 'password'; i.type = show ? 'text' : 'password'; b.innerHTML = icon(show ? 'eyeoff' : 'eye', 20); b.setAttribute('aria-label', show ? 'Hide password' : 'Show password'); };
  /* Face ID / Touch ID: a real device passkey (WebAuthn, user verification required). Enrolled once after a successful email-code sign-in. */
  const BIO = 'hm_bio';
  const b64 = (buf) => btoa(String.fromCharCode.apply(null, new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64 = (t) => Uint8Array.from(atob(t.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
  const BIO_TAG = 'hm:';
  const emailToId = (email) => { const b = new TextEncoder().encode(BIO_TAG + email); return b.length <= 64 ? b : b.slice(0, 64); };
  const idToEmail = (buf) => { try { const t = new TextDecoder().decode(new Uint8Array(buf)); return t.indexOf(BIO_TAG) === 0 ? t.slice(BIO_TAG.length) : ''; } catch (e) { return ''; } };
  const bioGet = () => { try { return JSON.parse(localStorage.getItem(BIO) || 'null'); } catch (e) { return null; } };
  const bioOk = () => !!(window.PublicKeyCredential && navigator.credentials && window.isSecureContext);
  HM.bio = { on: () => !!bioGet(), enroll: (e) => bioEnroll(e) };
  async function bioEnroll(email) {
    if (!bioOk() || bioGet()) return;
    try {
      const cred = await navigator.credentials.create({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), rp: { name: 'Westmark Mobile' }, user: { id: emailToId(email), name: email, displayName: email }, pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }], authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'required' }, timeout: 60000, attestation: 'none' } });
      if (cred) { localStorage.setItem(BIO, JSON.stringify({ id: b64(cred.rawId), email })); const S = HM.state(); S.security.faceId = true; HM.save(); }
    } catch (e) { /* declined or unsupported: stay on email sign-in */ }
  }
  function startSession(email, remember) {
    if (remember) { try { localStorage.setItem(RKEY, JSON.stringify({ email })); } catch (e) { /* ignore */ } }
    HM.session.set({ email, at: Date.now() }); clearPending(); creds = null; clearTimers();
    const S = HM.state(); if (!S.profile.email) S.profile.email = email;
    S.security.logins.unshift({ id: HM.uid('l'), date: new Date().toISOString(), device: 'This device', loc: 'Not available', ok: true });
    S.security.logins.length = Math.min(S.security.logins.length, 25);
    const dv = S.security.devices.find((x) => x.current); if (dv) dv.last = new Date().toISOString();
    HM.save(); HM.touch();
  }
  HM.acts.faceLogin = async (button) => {
    if (button.dataset.busy === '1') return;
    const fsvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8V6a3 3 0 013-3h2M16 3h2a3 3 0 013 3v2M21 16v2a3 3 0 01-3 3h-2M8 21H6a3 3 0 01-3-3v-2"/><path d="M9 9v1.5M15 9v1.5M12 9v4h-1M9 16c1.6 1.4 4.4 1.4 6 0"/></svg>';
    if (!bioOk()) {
      ui.sheet(`<div class="fid off" id="fid"><div class="fid-g">${fsvg}<i></i></div><h3 class="sh-title">Face ID</h3><p class="sh-body" id="fidMsg">Face ID needs a secure (https) connection and a phone with Face ID or Touch ID. Open the app from your Home Screen, then try again.</p><div class="sh-actions"><button class="btn btn-ghost" data-act="closeSheet">Use password</button></div></div>`);
      return;
    }
    const bio = bioGet();
    ui.sheet(`<div class="fid scan" id="fid"><div class="fid-g">${fsvg}<i></i></div><h3 class="sh-title">Face ID</h3><p class="sh-body" id="fidMsg">Look at your phone to sign in.</p><div class="sh-actions"><button class="btn btn-ghost" data-act="closeSheet">Cancel</button></div></div>`);
    button.dataset.busy = '1';
    let res = null;
    try {
      const pk = { challenge: crypto.getRandomValues(new Uint8Array(32)), userVerification: 'required', timeout: 60000 };
      // With a saved record, target that passkey. Without one (e.g. after a reinstall cleared app data),
      // omit allowCredentials so the phone offers the Westmark passkey from its own keychain.
      if (bio) pk.allowCredentials = [{ type: 'public-key', id: unb64(bio.id), transports: ['internal'] }];
      res = await navigator.credentials.get({ publicKey: pk });
    } catch (e) { res = null; }
    delete button.dataset.busy;
    const box = document.getElementById('fid'), msg = document.getElementById('fidMsg');
    let email = bio && bio.email;
    if (res && !email && res.response) email = idToEmail(res.response.userHandle);
    if (!res || !email) {
      if (box) box.className = 'fid fail';
      if (msg) msg.textContent = res && !email
        ? 'This passkey was not recognized. Sign in with your password once to set up Face ID.'
        : (bio ? 'Face ID did not work. Try again or use your password.' : 'No Face ID is set up yet. Sign in with your password once, and it will work from then on.');
      return;
    }
    try { localStorage.setItem(BIO, JSON.stringify({ id: b64(res.rawId), email })); } catch (e) { /* ignore */ }
    if (box) box.className = 'fid ok'; if (msg) msg.textContent = 'Signed in.';
    setTimeout(() => { ui.closeSheet(); startSession(email, false); HM.go('/home', { replace: true }); }, 450);
  };
  /* sign-in: live field feedback + 3D logo tilt (pointer). No inline handlers (CSP). */
  const siCheck = (i, onBlur) => { const f = i.closest('.fld'); if (!f) return; const v = i.value.trim(); let ok = false;
    if (i.name === 'email') { ok = EMAIL_RE.test(v); if (onBlur && v && !ok) { f.classList.add('bad'); f.querySelector('.ferr').textContent = 'Enter a valid email address, like name@example.com.'; } else if (ok || !v) { f.classList.remove('bad'); f.querySelector('.ferr').textContent = ''; } }
    else if (v) { f.classList.remove('bad'); f.querySelector('.ferr').textContent = ''; }
    f.classList.toggle('good', ok); };
  document.addEventListener('input', (e) => { const i = e.target; if (i && i.closest && i.closest('.na')) siCheck(i, false); });
  document.addEventListener('focusout', (e) => { const i = e.target; if (i && i.tagName === 'INPUT' && i.closest('.na')) siCheck(i, true); });
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
      html: naShell({ logo: 64, title: 'Verify Account', sub: p.delivery === 'email' ? `We sent a 6-digit code to <b>${esc(p.masked)}</b>.` : 'Enter the 6-digit code below.', body: `
        ${p.devCode ? `<div class="note warn dev">${icon('alert', 18)}<span><b>DEVELOPMENT-ONLY OTP MODE.</b> Email delivery is not configured${p.delivery === 'local-simulation' ? ' (local simulation)' : ''}. Your test code is <b class="devcode">${esc(p.devCode)}</b>. This is never shown in production.</span></div>` : ''}
        <form data-form="otp" novalidate>
          <p class="na-prompt">Enter OTP Code</p>
          <div class="otp" id="otpBoxes" role="group" aria-label="6-digit verification code">${[0, 1, 2, 3, 4, 5].map((i) => `<input inputmode="numeric" pattern="[0-9]*" maxlength="1" autocomplete="${i === 0 ? 'one-time-code' : 'off'}" aria-label="Digit ${i + 1}" data-i="${i}">`).join('')}</div>
          <p class="ferr center otp-err" id="otpErr" role="alert"></p>
          <p class="center sm mute" id="otpTimer">Code expires in <b>5:00</b></p>
          <button class="na-cta" type="submit"><span>VERIFY</span><svg class="arw" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
        </form>
        <div class="na-row"><button type="button" class="na-link" id="resendBtn" data-act="resendOtp" disabled>Resend Code</button><button type="button" class="na-link" data-act="otpBack">Go Back</button></div>` }),
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
          rb.disabled = cd > 0; rb.textContent = cd > 0 ? `Resend Code in ${cd}s` : 'Resend Code';
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
    if (!p.remember) { try { localStorage.removeItem(RKEY); } catch (e) { /* ignore */ } }
    startSession(p.email, p.remember);
    if (p.remember && HM.state().security.alerts.newDevice) { HM.notify('security', 'This device was remembered', 'This device was marked as trusted for sign-in.'); HM.save(); }
    bioEnroll(p.email);
    HM.go('/welcome', { replace: true });
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
        <div><b>Check your email address</b><p>Use the email address registered for Westmark online access.</p></div>
        <div><b>Check your password</b><p>Make sure Caps Lock is off. You can use the eye icon to review what you entered.</p></div>
        <div><b>Can't receive a verification code?</b><p>Check your inbox and spam folder. If the message does not arrive, contact customer support.</p></div>
      </div>
      <button class="btn btn-primary mt" data-go="/forgot">Reset password</button>
      <button class="btn btn-ghost mt" data-go="/login">Return to sign in</button>`)
  }), { pub: true });

  /* ---------- register / forgot  ---------- */
  HM.route('/register', 'auth', () => ({
    title: 'Open an account',
    html: naShell({ title: 'Hello There!', tabs: 'register', body: `<p class="mute sm center">Tell us a little about yourself to get started.</p>
      <form data-form="register" novalidate>
        <div class="two">${ui.field({ name: 'first', label: 'First name', autocomplete: 'given-name' })}${ui.field({ name: 'last', label: 'Last name', autocomplete: 'family-name' })}</div>
        ${ui.field({ name: 'email', label: 'Email address', type: 'email', inputmode: 'email' })}
        ${ui.select({ name: 'type', label: 'Account to open', value: 'checking', options: [['checking', 'Harbor Everyday Checking'], ['savings', 'Harbor High-Yield Savings'], ['both', 'Checking + Savings']] })}
        <div class="fld" data-fld="agree"><label class="chk"><input type="checkbox" name="agree"><span></span>I agree to the terms and privacy policy</label><p class="ferr" role="alert"></p></div>
        <button class="na-cta" type="submit"><span>GET STARTED</span><svg class="arw" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></form>`, foot: `<p class="na-alt">Already have an account? <button type="button" data-go="/login">Sign in</button></p>` })
  }), { pub: true });
  HM.forms.register = (f, d) => {
    if (!ui.need(f, d, [['first', 'Enter your first name.'], ['last', 'Enter your last name.']])) return;
    if (!EMAIL_RE.test(d.email.trim())) return ui.fail(f, 'Enter a valid email address.', 'email');
    if (!d.agree) return ui.fail(f, 'Please accept the terms to continue.', 'agree');
    f.closest('.auth-card').innerHTML = `<div class="center ok-state"><div class="okring">${icon('check', 38)}</div><h2>Application received</h2><p class="mute">Thanks, ${esc(d.first)}. We will verify your identity and contact you by email to finish opening your account.</p><button class="btn btn-primary mt2" data-go="/login">Back to sign in</button></div>`;
  };
  HM.route('/forgot', 'auth', () => ({
    title: 'Reset password',
    html: authShell(`<button class="back-lnk" data-go="/login">${icon('chevL', 18)} Back to sign in</button><h2>Forgot password?</h2><p class="mute sm">Enter your email and we’ll show you how to reset your password.</p>
      <form data-form="forgot" novalidate>${ui.field({ name: 'email', label: 'Email address', type: 'email', inputmode: 'email' })}<button class="btn btn-primary mt" type="submit">Continue</button></form>`)
  }), { pub: true });
  HM.forms.forgot = (f, d) => {
    if (!EMAIL_RE.test(d.email.trim())) return ui.fail(f, 'Enter a valid email address.', 'email');
    f.closest('.auth-card').innerHTML = `<div class="center ok-state"><div class="okring">${icon('mail', 34)}</div><h2>Reset your password</h2><p class="mute">Password resets are handled by the administrator of this app. The sign-in password is set by the app owner in the Vercel environment variable <b>HM_LOGIN_PASSWORD</b>. Change it there and redeploy.</p><button class="btn btn-primary mt2" data-go="/login">Back to sign in</button></div>`;
  };

  /* ---------- sign out + idle session ---------- */
  HM.signOut = (msg) => { HM.session.clear(); clearPending(); creds = null; clearTimers(); HM.stack = []; if (msg) { try { sessionStorage.setItem('hm_notice', msg); } catch (e) { /* ignore */ } } ui.closeSheet(); HM.go('/login', { replace: true }); };
  HM.acts.signOut = async () => {
    const ok = await ui.confirm({ title: 'Sign out of Westmark Mobile?', body: 'Your session will end and you will need to sign in and verify with a new email code next time.', ok: 'Sign out', cancel: 'Stay signed in' });
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


/* Westmark Mobile — Home dashboard + notifications */
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
      <div class="between sp"><div><div class="lbl">Income vs expenses</div><div class="sm mute">Last 6 months</div></div><div class="legend" style="margin:0"><span><i style="background:#D4AF37"></i>Income</span><span><i style="background:#8A8F98"></i>Spent</span></div></div>
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
    const payAct = HM.history().filter((t) => ['ach_instant', 'ach_standard', 'wire', 'wire_intl', 'check', 'bill', 'internal'].includes(t.rail) && t.amount < 0).slice(0, 3);
    const colors = ['#0A3340', '#C9A96A', '#3F8F9B', '#8AA7AE'];
    const lPay = HM.limitInfo('payments'), lWd = HM.limitInfo('withdrawal');
    const sec = (title, link, body) => ui.section(title, link, body);
    /* orange dashboard: balance split, front card */
    const _amt = money(T.current), _dol = _amt.split('.')[0], _cts = _amt.split('.')[1] || '00';
    const _card = (S.cards && S.cards.find((c) => c.kind === 'debit')) || (S.cards && S.cards[0]) || { last4: '4821', exp: '09/29' };
    return {
      title: 'Home',
      html: `
      <div class="hm-top">
        <div class="oh">
          <span class="oh-glow"></span>
          <div class="oh-bar">
            <button class="oh-id" data-act="zoomPhoto" aria-label="View profile photo">${HM.avatar ? HM.avatar() : ''}</button>
            <div class="oh-hi"><small>${greeting()}</small><b>${esc(name)}</b></div>
            <button class="oh-bell" data-go="/notifications" aria-label="Notifications (${unread} unread)">${icon('bell', 20)}${unread ? `<span class="dot">${unread}</span>` : ''}</button>
          </div>
          <div class="oh-blk">
            <small>Total balance</small>
            <div class="oh-amt">${hidden ? '<span class="masked">••••••••</span>' : `${_dol}<u>.${_cts}</u>`}</div>
          </div>
          <div class="oh-stack">
            <span class="oh-c oh-c3"></span><span class="oh-c oh-c2"></span>
            <div class="oh-c oh-c1"><div class="oh-crow"><span class="oh-n">•••• ${esc(_card.last4)}</span><span class="oh-e">${esc(_card.exp)}</span></div><span class="oh-v">VISA</span></div>
          </div>
        </div>
        <div class="oh-acts" role="group" aria-label="Quick actions">
          <button data-go="/payments/ach_instant/new"><span class="oh-ai">${icon('send', 18)}</span>Send</button>
          <button data-go="/payments"><span class="oh-ai">${icon('swap', 18)}</span>Transfer</button>
        </div>
        ${(() => { const sav = S.accounts.filter((a) => a.type === 'savings').reduce((x, a) => x + a.current, 0), chk = S.accounts.filter((a) => a.type !== 'savings').reduce((x, a) => x + a.current, 0), tot = Math.max(1, sav + chk); return `<button class="db-split" data-go="/accounts"><span class="db-sp-bar"><i style="width:${Math.max(3, Math.round(chk / tot * 100))}%"></i></span><span class="db-sp-row"><span class="db-sp c1"><small><i></i>Checking</small><b>${hideable(money(chk), hidden)}</b></span><span class="db-sp c2"><small><i></i>Savings</small><b>${hideable(money(sav), hidden)}</b></span></span></button>`; })()}
      </div>

      <div class="svc" role="group" aria-label="Shortcuts">${[['file', 'Statements', '/accounts/statements'], ['chart', 'Spending', '/accounts/spending'], ['target', 'Goals', '/accounts/goals'], ['star', 'Rewards', '/more/rewards'], ['users', 'Recipients', '/payments/beneficiaries'], ['calendar', 'Scheduled', '/payments/scheduled']].map((q) => `<button data-go="${q[2]}">${icon(q[0], 16)}<span>${q[1]}</span></button>`).join('')}</div>

      ${sec('Your accounts', ui.link('All accounts', '/accounts'), `<div class="hscroll">${S.accounts.map((a) => acctCard(a, hidden)).join('')}</div>`)}

      

      ${sec('Recent transactions', ui.link('View All', '/transactions'), recent.length ? `<div class="group">${recent.map((t) => ui.txRow(t, { acct: true })).join('')}</div>` : ui.card(ui.empty('receipt', 'No transactions yet', 'Your activity will show up here.')))}

      ${sec('Spending overview', '', spendCard())}

      ${sec('Payments & scheduled activity', ui.link('Manage', '/payments/scheduled'), `<div class="card flush">
        <div class="mini-h">Upcoming payments</div>
        ${upcoming.length ? upcoming.slice(0, 3).map((s) => `<button class="row slim" data-go="/payments/scheduled"><span class="row-i gold">${icon(s.kind === 'internal' ? 'swap' : 'calendar', 18)}</span><span class="row-m"><b>${esc(s.payee)}</b><small>${HM.relDay(HM.parseDay(s.next))} · ${s.freq === 'once' ? 'One time' : 'Repeats ' + s.freq}</small></span><span class="row-r">${money(s.amount)}</span></button>`).join('') : '<p class="sm mute pad2">Nothing scheduled.</p>'}
        <div class="mini-h">Scheduled transfers &amp; recurring</div>
        <button class="row slim" data-go="/payments/scheduled"><span class="row-i">${icon('repeat', 18)}</span><span class="row-m"><b>${upcoming.filter((s) => s.kind === 'internal').length} scheduled transfer${upcoming.filter((s) => s.kind === 'internal').length === 1 ? '' : 's'}</b><small>${upcoming.filter((s) => s.freq !== 'once').length} recurring payment${upcoming.filter((s) => s.freq !== 'once').length === 1 ? '' : 's'} active</small></span><span class="row-c">${icon('chevR', 18)}</span></button>
        <div class="mini-h">Restricted activity</div>
        ${pending.length ? pending.slice(0, 3).map((t) => ui.txRow(t, { acct: true })).join('') : '<p class="sm mute pad2">No payments are awaiting processing. Outgoing activity is currently restricted.</p>'}
        <div class="mini-h">Recent payment activity</div>
        ${payAct.length ? payAct.map((t) => ui.txRow(t)).join('') : '<p class="sm mute pad2">No payments yet.</p>'}</div>`)}

      ${sec('Daily limits', ui.link('Details', '/payments/limits'), `<div class="card">${[['Daily payment limit', lPay], ['Daily withdrawal limit', lWd]].map(([t, L]) => `<div class="lim"><div class="lim-h"><b>${t}</b><span>${money(L.limit).replace('.00', '')}</span></div>${ui.progress(L.pct)}<div class="lim-f"><span>Used ${money(L.used)}</span><span>Remaining ${money(L.left)}</span></div></div>`).join('')}</div>`)}

      ${sec('Alerts & notifications', ui.link('See all', '/notifications'), S.notifications.length ? `<div class="group">${S.notifications.slice(0, 3).map((n) => notifRow(n)).join('')}</div>` : ui.card(ui.empty('bell', 'You’re all caught up', 'New alerts will appear here.')))}

      ${HM.homeMore()}

      ${HM.xExplore()}

      ${sec('Shortcuts', '', `<div class="group">${[['users', 'Saved beneficiaries', '/payments/beneficiaries'], ['file', 'Account statements', '/accounts/statements'], ['receipt', 'Transaction history', '/transactions'], ['help', 'Help and support', '/more/support']].map((r) => ui.row({ icon: r[0], title: r[1], go: r[2] })).join('')}</div>`)}
      `
    };
  });


  /* ---------- global search (transactions, accounts, beneficiaries, pages) ---------- */
  HM.forms.gsearch = (f, d) => { const q = (d.q || '').trim(); if (!q) return; HM.go('/search?q=' + encodeURIComponent(q)); };
  const PAGES = [['Send with Zelle', '/payments/ach_instant/new', 'send ach instant zelle'], ['Domestic transfer (ACH)', '/payments/ach_standard/new', 'ach standard'], ['Domestic wire', '/payments/wire/new', 'wire'], ['Check payment', '/payments/check/new', 'check payment'], ['Transfer between accounts', '/payments/internal/new', 'transfer internal'], ['Pay bills', '/payments/bills', 'bill biller pay'], ['Deposit a check', '/accounts/deposit', 'deposit check mobile'], ['Statements', '/accounts/statements', 'statement'], ['Documents', '/accounts/documents', 'document tax agreement'], ['Cards', '/cards', 'card debit virtual lock pin'], ['Daily limits', '/payments/limits', 'limit'], ['Beneficiaries', '/payments/beneficiaries', 'beneficiary payee recipient'], ['Scheduled payments', '/payments/scheduled', 'scheduled recurring'], ['Customer profile', '/more/profile', 'profile name address phone'], ['Security settings', '/more/security', 'security password face id'], ['Notifications', '/notifications', 'alert notification'], ['Help and support', '/more/support', 'help support chat contact']];
  HM.route('/search', 'home', (params, qs) => {
    const q = (qs.get('q') || '').trim(), ql = q.toLowerCase(), S = HM.state();
    const tx = q ? HM.history().filter((t) => [t.desc, t.ref, t.cat, String(Math.abs(t.amount).toFixed(2))].some((v) => String(v || '').toLowerCase().includes(ql))).slice(0, 15) : [];
    const ac = q ? S.accounts.filter((a) => [a.nickname, a.name, a.type, a.number.slice(-4)].some((v) => String(v).toLowerCase().includes(ql))) : [];
    const be = q ? S.beneficiaries.filter((b) => [b.name, b.nick, b.bank].some((v) => String(v || '').toLowerCase().includes(ql))) : [];
    const pg = q ? PAGES.filter((p) => (p[0] + ' ' + p[2]).toLowerCase().includes(ql)) : [];
    const none = !tx.length && !ac.length && !be.length && !pg.length;
    return { title: 'Search', html: `${ui.header('Search', { back: '/home' })}<div class="pad">
      <form class="searchbar" data-form="gsearch" role="search">${icon('search', 18)}<input type="search" name="q" value="${esc(q)}" placeholder="Search transactions, accounts, payments" aria-label="Search" maxlength="60" autocomplete="off"></form>
      ${!q ? ui.card(ui.empty('search', 'Search Westmark', 'Find a transaction, account, beneficiary or page.')) : none ? ui.card(ui.empty('search', 'No results', 'Nothing matched “' + esc(q) + '”.')) : ''}
      ${ac.length ? ui.section('Accounts', '', `<div class="group">${ac.map((a) => ui.row({ icon: 'bank', title: a.nickname, sub: a.type + ' ' + HM.mask(a.number), go: '/accounts/' + a.id })).join('')}</div>`) : ''}
      ${pg.length ? ui.section('Pages', '', `<div class="group">${pg.map((p) => ui.row({ icon: 'chevR', title: p[0], go: p[1] })).join('')}</div>`) : ''}
      ${be.length ? ui.section('Beneficiaries', '', `<div class="group">${be.map((b) => ui.row({ icon: 'users', title: b.name, sub: b.bank, go: '/payments/beneficiaries' })).join('')}</div>`) : ''}
      ${tx.length ? ui.section('Transactions', '', `<div class="group">${tx.map((t) => ui.txRow(t, { acct: true })).join('')}</div>`) : ''}
    </div>` };
  });

  function acctCard(a, hidden) {
    const fr = a.status === 'frozen';
    return `<button class="acct ag${Math.max(0, HM.state().accounts.indexOf(a)) % 4} ${a.type === 'savings' ? 'sav' : ''} ${fr ? 'frozen' : ''}" data-go="/accounts/${a.id}">
      <div class="t"><span>${a.type}</span>${fr ? `<span class="frzpill">Restricted</span>` : '<span class="frzpill">Active</span>'}</div>
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


/* Westmark Mobile — Accounts: overview, detail, info, controls, transactions, statements, documents, goals, spending, check deposit */
(function () {
  'use strict';
  const HM = window.HM, ui = HM.ui, esc = HM.esc, icon = HM.icon, money = HM.money;
  const RECEIPT_RAILS = ['ach_instant', 'ach_standard', 'wire', 'wire_intl', 'check', 'internal', 'bill', 'deposit'];
  const statusTone = (a) => (a.status === 'frozen' ? 'frz' : 'ok');
  const balAt = (acctId, ts) => { const a = HM.acct(acctId); return HM.r2(a.current - HM.state().txs.filter((t) => t.acct === acctId && t.status === 'completed' && new Date(t.date).getTime() >= ts).reduce((s, t) => s + HM.eff(t), 0)); };

  /* ---------- landing ---------- */
  HM.route('/accounts', 'accounts', () => {
    const S = HM.state(), T = HM.totals(), hidden = S.prefs.hideBalance; const frozen = S.accounts.filter((a) => a.status === 'frozen').length;
    const grp = (type, label) => { const l = S.accounts.filter((a) => a.type === type); return l.length ? `<div class="lbl sub-l">${label}</div>${l.map((a) => HM.acctCard(a, hidden).replace('class="acct', 'class="acct acct-wide')).join('')}` : ''; };
    return {
      title: 'Accounts',
      html: `${ui.header('Accounts', { back: false, sub: 'Manage your Westmark accounts' })}
      <div class="pad"><div class="card total-card"><div class="lbl">Total combined balance</div><div class="big">${hidden ? '<span class="masked">••••••</span>' : money(T.current)}</div>
        <div class="kv3"><div><small>Checking (${S.accounts.filter((a) => a.type === 'checking').length})</small><b>${hidden ? '••••' : money(T.checking)}</b></div><div><small>Savings (${S.accounts.filter((a) => a.type === 'savings').length})</small><b>${hidden ? '••••' : money(T.savings)}</b></div></div>
        ${frozen ? `<div class="note warn">${icon('snow', 18)}<span>Payments and check deposits are currently unavailable for ${frozen} account${frozen > 1 ? 's' : ''}.</span></div>` : ''}</div>
        ${grp('checking', 'Checking accounts')}${grp('savings', 'Savings accounts')}</div>
      ${ui.section('Manage', '', `<div class="tiles">${[['camera', 'Deposit Check', 'Mobile deposit', '/accounts/deposit'], ['receipt', 'Transactions', 'Search & filter', '/transactions'], ['file', 'Statements', 'Monthly & history', '/accounts/statements'], ['book', 'Documents', 'Agreements & forms', '/accounts/documents'], ['target', 'Savings goals', 'Track targets', '/accounts/goals'], ['chart', 'Spending insights', 'By category', '/accounts/spending'], ['clock', 'Deposit history', 'Past deposits', '/accounts/deposit/history']].map((t) => `<button class="tile" data-go="${t[3]}"><span class="row-i navy">${icon(t[0], 20)}</span><b>${t[1]}</b><small>${t[2]}</small></button>`).join('')}</div>`)}`
    };
  });


  /* ---------- account controls: read-only restriction status (this project scenario has no in-app unfreeze) ---------- */
  HM.route('/accounts/:id/controls', 'accounts', ({ id }) => {
    const a = HM.acct(id), fr = a.status === 'frozen';
    return {
      title: 'Account controls',
      html: `${ui.header('Account controls', { back: '/accounts/' + id, sub: a.nickname })}<div class="pad">
      <div class="card center ctl ${fr ? 'is-frozen' : ''}"><div class="ctl-i">${icon(fr ? 'snow' : 'shield', 34)}</div><h2>${fr ? 'Payments unavailable' : 'Account is active'}</h2><p class="mute sm">${fr ? 'Outgoing payments, withdrawals and check deposits are unavailable for this account. No money will move.' : 'This account is active.'}</p>
        <button class="btn btn-ghost mt" data-go="/more/support">${icon('msg', 20)} Contact support</button></div>
      ${ui.section('Unavailable activity', '', `<div class="card">${['Outgoing instant & standard ACH', 'Domestic wire transfers', 'Check payments', 'Bill payments & scheduled payments', 'Transfers out to your other accounts', 'ATM withdrawals & card purchases', 'Check deposits (rejected, nothing credited)'].map((x) => `<div class="kv"><span>${x}</span><b class="neg">Blocked</b></div>`).join('')}</div>`)}
      ${ui.section('More', '', `<div class="group">${ui.row({ icon: 'sliders', title: 'Account preferences', go: '/accounts/' + id + '/prefs' })}${ui.row({ icon: 'bell', title: 'Account alerts', go: '/accounts/' + id + '/alerts' })}${ui.row({ icon: 'info', title: 'Account information', go: '/accounts/' + id + '/info' })}</div>`)}</div>`
    };
  });

  HM.route('/accounts/controls', 'accounts', () => ({
    title: 'Account controls',
    html: `${ui.header('Account controls', { back: '/accounts' })}<div class="pad"><p class="mute sm">Choose an account to view its restriction status and settings.</p><div class="group mt">${HM.state().accounts.map((a) => ui.row({ icon: a.status === 'frozen' ? 'snow' : 'bank', tone: a.status === 'frozen' ? 'navy' : '', title: a.nickname, sub: a.type + ' ' + HM.mask(a.number), right: ui.badge(a.status), go: '/accounts/' + a.id + '/controls' })).join('')}</div></div>`
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
      ${t.reason ? `<div class="note bad">${icon('alert', 18)}<span>${esc(t.reason)}${t.status === 'blocked' ? ' Your balance was not reduced.' : ' No money was deducted.'}</span></div>` : ''}
      ${t.status === 'pending' ? `<div class="note warn">${icon('clock', 18)}<span>${credit ? 'Funds are not yet available.' : 'This amount is held against your available balance.'} This item has not completed processing.</span></div>` : ''}
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
      ${a.type === 'checking' ? ui.section('Account numbers', '', `<div class="card"><div class="kv"><span>Routing number</span><b>${a.routing} <button class="cp" data-act="copyTxt" data-arg="${a.routing}|Routing number" aria-label="Copy routing number">${icon('copy', 16)}</button></b></div><div class="kv"><span>Account number</span><b class="masked">${HM.mask(a.number)}</b></div><p class="hint">Open Account information to reveal and copy.</p></div>`) : `${ui.section('Interest', '', `<div class="card"><div class="kv"><span>Annual percentage yield</span><b>${a.apy.toFixed(2)}% APY</b></div><div class="kv"><span>Interest paid this year</span><b>${money(intYTD)}</b></div><div class="kv"><span>Estimated next payment</span><b>≈ ${money(HM.r2((a.current * a.apy) / 100 / 12))}</b></div><div class="kv"><span>Interest compounds / pays</span><b>Monthly</b></div><p class="hint">Rates may change.</p></div>`)}
      ${ui.section('Savings goals', ui.link('Manage', '/accounts/goals'), S.goals.length ? `<div class="card">${S.goals.map((g) => `<div class="lim"><div class="lim-h"><b>${esc(g.name)}</b><span>${money(g.saved).replace('.00', '')} / ${money(g.target).replace('.00', '')}</span></div>${ui.progress(Math.round((g.saved / g.target) * 100), '')}</div>`).join('')}<p class="hint">${money(goalsSaved)} allocated of ${money(a.current)} in savings.</p></div>` : ui.card(ui.empty('target', 'No goals yet', 'Create a goal to track your progress.', '<button class="btn btn-primary" data-go="/accounts/goals">Create goal</button>')))}`}
      ${ui.section('Recent transactions', ui.link('Full history', '/accounts/' + a.id + '/transactions'), recent.length ? `<div class="group">${ui.groupByDay(recent)}</div>` : ui.card(ui.empty('receipt', 'No transactions yet', '')))}
      ${ui.section('Manage this account', '', `<div class="group">${[['info', 'Account information', 'Details, nickname, copy numbers', '/accounts/' + a.id + '/info'], ['receipt', 'Transaction history', 'Search & filter', '/accounts/' + a.id + '/transactions'], ['file', 'Statements & documents', 'Monthly statements', '/accounts/' + a.id + '/statements'], [fr ? 'unlock' : 'snow', fr ? 'Unfreeze account' : 'Freeze account', 'Account controls', '/accounts/' + a.id + '/controls'], ['sliders', 'Account preferences', 'Paperless & options', '/accounts/' + a.id + '/prefs'], ['bell', 'Account alerts', 'Balance & activity alerts', '/accounts/' + a.id + '/alerts']].map((r) => ui.row({ icon: r[0], title: r[1], sub: r[2], go: r[3] })).join('')}</div>`)}`
    };
  });
  HM.acts.copyTxt = (b, arg) => { const [v, l] = arg.split('|'); ui.copy(v, l || 'Copied'); };

  /* ---------- controls hub (choose account) ---------- */
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
      ${ui.section('Account opening', '', `<div class="card"><div class="kv"><span>Opened</span><b>${HM.fmtDate(HM.parseDay(a.opened))}</b></div><div class="kv"><span>Opened through</span><b>Westmark Mobile</b></div><div class="kv"><span>Branch</span><b>Digital branch</b></div><div class="kv"><span>Statements</span><b>${a.prefs.paperless ? 'Paperless' : 'Paper'}</b></div></div>`)}
      <div class="note">${icon('info', 18)}<span>Only the routing number and your own account number (after you reveal it) can be copied.</span></div>
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
  HM.route('/accounts/:id/prefs', 'accounts', ({ id }) => {
    const a = HM.acct(id);
    return { title: 'Account preferences', html: `${ui.header('Account preferences', { back: '/accounts/' + id, sub: a.nickname })}<div class="pad"><div class="group">${ui.toggle({ title: 'Paperless statements', sub: 'Get statements in the app instead of by mail', on: a.prefs.paperless, act: 'acctPref', arg: id + ':paperless' })}${ui.toggle({ title: 'Overdraft protection', sub: 'transactions are always declined if funds are short', on: a.prefs.overdraftProtect, act: 'acctPref', arg: id + ':overdraftProtect' })}</div><button class="btn btn-ghost mt" data-act="renameAcct" data-arg="${id}">${icon('edit', 18)} Change nickname</button></div>` };
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
      </div>`
    };
  });
  function statementHTML(id, p) {
    const d = statementData(id, p), a = d.a; const label = d.s.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const rows = d.txs.map((t) => `<tr><td>${HM.fmtShort(t.date)}</td><td>${esc(t.desc)}</td><td class="r">${t.amount < 0 ? '−' : '+'}${money(Math.abs(t.amount)).replace('−', '')}</td><td class="r">${money(t.bal)}</td></tr>`).join('');
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Westmark statement ${label}</title><style>body{font:14px -apple-system,Segoe UI,Arial,sans-serif;color:#14232A;margin:0;padding:24px;background:#F4F2EE}.s{max-width:760px;margin:auto;background:#fff;border-radius:14px;padding:28px;position:relative;overflow:hidden}h1{font-family:Georgia,serif;margin:0;color:#0A3340}.top{display:flex;justify-content:space-between;border-bottom:3px solid #C9A96A;padding-bottom:14px}.k{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #eee}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{text-align:left;padding:8px 6px;border-bottom:1px solid #eee;font-size:13px}.r{text-align:right}.wm{position:absolute;inset:0;display:grid;place-items:center;font-size:54px;font-weight:800;color:rgba(10,51,64,.05);transform:rotate(-24deg);pointer-events:none;text-align:center}.n{font-size:11px;color:#66747D;margin-top:18px}@media print{body{background:#fff;padding:0}}</style></head><body><div class="s"><div class="wm">WESTMARK</div><div class="top"><div><h1>Westmark Bank</h1><div>Your finances. Your direction.</div></div><div style="text-align:right"><b>Statement</b><br>${label}<br>${esc(a.name)} ${HM.mask(a.number)}</div></div><p><b>${esc(HM.holder())}</b></p><div class="k"><span>Opening balance</span><b>${money(d.open)}</b></div><div class="k"><span>Deposits &amp; credits</span><b>${money(d.credits)}</b></div><div class="k"><span>Withdrawals &amp; debits</span><b>${money(d.debits)}</b></div><div class="k"><span>${d.inProgress ? 'Balance to date' : 'Closing balance'}</span><b>${money(d.close)}</b></div><table><tr><th>Date</th><th>Description</th><th class="r">Amount</th><th class="r">Balance</th></tr>${rows || '<tr><td colspan="4">No activity this period.</td></tr>'}</table><p class="n">Westmark Bank · 100 Harbor Way, Seattle, WA · 1-800-427-2670</p></div><script>if(location.hash==='#print')setTimeout(function(){print()},300)<\/script></body></html>`;
  }
  HM.acts.stmtDownload = (b, arg) => { const [id, p] = arg.split('|'); ui.download(`Westmark-statement-${HM.acct(id).nickname.replace(/\W+/g, '-')}-${p}.html`, statementHTML(id, p)); ui.toast('Statement downloaded'); };
  HM.acts.stmtPrint = (b, arg) => { const [id, p] = arg.split('|'); const w = window.open('', '_blank'); if (!w) return ui.toast('Allow pop-ups to print, or use Download', 'err'); w.document.write(statementHTML(id, p).replace('</body>', '<script>setTimeout(function(){print()},400)<\/script></body>')); w.document.close(); };

  /* ---------- documents ---------- */
  const DOCS = {
    agreement: ['Deposit account agreement', 'Terms that apply to your Westmark checking and savings accounts.', ['This agreement governs your Westmark checking and savings accounts.', 'Fees, holds and restrictions that apply to your accounts are described in Account controls.', 'Daily limits, fees and holds shown in the app follow the rules described in Account controls and Payments › Limits.']],
    fees: ['Fee schedule', 'Fees for wires, replacement cards and other services.', ['Domestic wire transfer (outgoing): $25.00', 'Zelle: $0.00', 'Domestic transfer (ACH): $0.00', 'International wire (outgoing): $45.00', 'Check payment: $0.00', 'Replacement debit card: $0.00']],
    privacy: ['Privacy notice', 'How Westmark Mobile handles information.', ['Westmark Mobile stores your app data on this device.', 'The only information sent to our servers is your sign-in email and password for verification and the one-time code request.', 'Full card numbers and PINs are never stored in the app.']],
    esign: ['Electronic delivery consent', 'Your consent to receive documents electronically.', ['You agreed to receive statements and notices in the app (paperless).', 'You can switch to paper statements per account under Account preferences.']],
    tax: ['Year-end tax summary', 'Form 1099-INT style interest summary.', ['Document: interest paid on your savings account this year is shown on the Savings account page.', 'This is not a tax document and must not be used for tax filing.']]
  };
  function docsPage() { return { title: 'Documents', html: `${ui.header('Account documents', { back: '/accounts' })}<div class="pad"><div class="group">${Object.entries(DOCS).map(([k, v]) => ui.row({ icon: 'file', tone: 'gold', title: v[0], sub: v[1], go: '/accounts/documents/' + k })).join('')}</div><div class="note">${icon('info', 18)}<span>Documents are provided for your records.</span></div></div>` }; }
  function docView(k) { const d = DOCS[k]; if (!d) return docsPage(); return { title: d[0], html: `${ui.header(d[0], { back: '/accounts/documents' })}<div class="pad"><div class="card doc">${d[2].map((p) => `<p>${esc(p)}</p>`).join('')}<p class="mute xs">Westmark Bank · Effective ${HM.fmtDate(new Date())}.</p></div><div class="btns two"><button class="btn btn-primary" data-act="docDownload" data-arg="${k}">${icon('download', 18)} Download</button><button class="btn btn-ghost" data-act="docPrint" data-arg="${k}">${icon('print', 18)} Print</button></div></div>` }; }
  const docHtml = (k) => { const d = DOCS[k]; return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(d[0])}</title><style>body{font:15px Georgia,serif;max-width:680px;margin:30px auto;padding:0 20px;color:#14232A}h1{color:#0A3340;border-bottom:3px solid #C9A96A;padding-bottom:8px}.n{color:#66747D;font:12px Arial}</style></head><body><h1>Westmark Bank — ${esc(d[0])}</h1>${d[2].map((p) => `<p>${esc(p)}</p>`).join('')}<p class="n">Westmark Bank · 100 Harbor Way, Seattle, WA</p></body></html>`; };
  HM.acts.docDownload = (b, k) => { ui.download('Westmark-' + k + '.html', docHtml(k)); ui.toast('Document downloaded'); };
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
        <div class="note">${icon('shield', 18)}<span>Capture: the camera is not accessed and no real check images are collected or stored.</span></div></div>`
    };
  }
  HM.forms.depStart = (f, d) => {
    const amt = HM.parseAmt(d.amount); if (isNaN(amt) || amt <= 0) return ui.fail(f, 'Enter the check amount, like 125.00.', 'amount'); if (amt > 25000) return ui.fail(f, 'Mobile deposits are limited to $25,000 per check', 'amount');
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
      x.font = '700 22px Georgia'; x.fillText(d.payer.slice(0, 30), 28, 52); x.font = '13px Arial'; x.fillStyle = '#66747D'; x.fillText('MOBILE DEPOSIT IMAGE', 28, 74);
      x.fillStyle = '#14232A'; x.font = '15px Arial'; x.fillText('No. ' + (1000 + Math.floor(Math.random() * 900)), 610, 40); x.fillText('Date: ' + HM.fmtDate(HM.parseDay(d.checkDate), { month: '2-digit', day: '2-digit', year: 'numeric' }), 560, 74);
      x.fillText('PAY TO THE ORDER OF', 28, 128); x.font = '700 24px Georgia'; x.fillText(HM.holder().toUpperCase(), 210, 128); x.lineWidth = 1; x.beginPath(); x.moveTo(205, 136); x.lineTo(540, 136); x.stroke();
      x.font = '700 24px Georgia'; x.strokeRect(560, 100, 140, 40); x.fillText('$' + Number(d.amount).toFixed(2), 572, 129); x.font = '15px Arial'; x.fillText('Amount in words: ' + Number(d.amount).toFixed(2) + ' dollars', 28, 182); x.beginPath(); x.moveTo(28, 190); x.lineTo(540, 190); x.stroke();
      x.fillText('MEMO ' + (d.memo || '').slice(0, 30), 28, 270); x.beginPath(); x.moveTo(80, 276); x.lineTo(300, 276); x.stroke(); x.font = 'italic 26px Georgia'; x.fillText(d.payer.split(' ')[0].slice(0, 14), 470, 262); x.beginPath(); x.moveTo(440, 270); x.lineTo(690, 270); x.stroke();
      x.font = '700 18px monospace'; x.fillStyle = '#44525A'; x.fillText('⑆000000000⑆  ⑈0000000000⑈  0000', 28, 310);
    } else {
      x.font = '700 16px Arial'; x.fillText('ENDORSE HERE', 380, 40); x.strokeStyle = '#8AA0A7'; x.setLineDash([6, 4]); x.strokeRect(370, 52, 330, 150); x.setLineDash([]);
      x.font = 'italic 24px Georgia'; x.fillText(HM.holder(), 392, 112); x.font = '13px Arial'; x.fillStyle = '#44525A'; x.fillText('For mobile deposit only', 392, 148); x.fillText('Westmark Bank', 392, 168); x.fillText('Do not write below this line', 392, 260);
      x.font = '13px Arial'; x.fillStyle = '#66747D'; x.fillText('BACK OF CHECK', 28, 310);
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
      <div class="pad">${img ? `<div class="card center"><img class="chk-img" src="${img}" alt="Captured ${side} of check (image)"><p class="sm mute mt">Check the image is clear: all four corners visible, no glare.</p></div><div class="btns two"><button class="btn btn-ghost" data-act="retake" data-arg="${side}">Retake</button><button class="btn btn-primary" data-go="${side === 'front' ? '/accounts/deposit/back' : '/accounts/deposit/review'}">Use photo</button></div>`
        : `<div class="cam" id="cam"><div class="cam-top"><span>${side === 'front' ? 'Front of check' : 'Back of check'}</span><button class="flash" data-act="flash" aria-label="Toggle flash">${icon('zap', 18)}</button></div><div class="cam-frame"><i></i><i></i><i></i><i></i><p>${side === 'front' ? 'Place the front of the check inside the frame' : 'Turn the check over and endorse it: “For mobile deposit only”'}</p></div><div class="cam-flash" id="camFlash"></div><div class="cam-bot"><button class="cam-x" data-back="/accounts/deposit">Cancel</button><button class="shutter" data-act="shutter" data-arg="${side}" aria-label="Take photo"><i></i></button><span class="cam-sp"></span></div></div><p class="footnote">Capture check image</p>`}</div>`
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
      <div class="card mt"><div class="kv"><span>Deposit to</span><b>${esc(a.nickname)} ${HM.mask(a.number)}</b></div><div class="kv"><span>Payer</span><b>${esc(d.payer)}</b></div><div class="kv"><span>Check date</span><b>${HM.fmtDate(HM.parseDay(d.checkDate))}</b></div>${d.memo ? `<div class="kv"><span>Memo</span><b>${esc(d.memo)}</b></div>` : ''}<div class="kv"><span>Availability</span><b>After review (~${Math.round(HM.PENDING_MS / 1000)}s)</b></div></div>
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


/* Westmark Mobile — Payments: hub, six payment rails (one wizard), beneficiaries, billers, scheduled, history, limits */
(function () {
  'use strict';
  const HM = window.HM, ui = HM.ui, esc = HM.esc, icon = HM.icon, money = HM.money;
  const S = () => HM.state();
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const RAIL_INFO = {
    ach_instant: { title: 'Zelle', icon: 'zap', blurb: 'Send in minutes to enrolled recipients', info: 'Send money to friends and family in minutes using their bank details. No fee.', proc: 'Arrives in minutes' },
    ach_standard: { title: 'Domestic transfer', icon: 'repeat', blurb: 'ACH · 1–2 business days', info: 'Typically settles in 1–2 business days. No fee.', proc: 'Settles in 1–2 business days' },
    wire_intl: { title: 'International wire', icon: 'globe', blurb: '1–3 business days · $45 fee', info: 'Send money abroad in major currencies. A $45.00 outgoing international wire fee applies.', proc: 'Arrives in 1–3 business days' },
    wire: { title: 'Domestic wire', icon: 'bank', blurb: 'Same-day · $25 fee', info: 'Same-day delivery to a U.S. bank. A $25.00 outgoing wire fee applies.', proc: 'Same-day delivery' },
    check: { title: 'Check payment', icon: 'file', blurb: 'We issue a check', info: 'We issue a check to your payee. No fee.', proc: 'Mailed in 1–2 business days' },
    internal: { title: 'Transfer between accounts', icon: 'swap', blurb: 'Your own accounts', info: 'Instant transfers between your Westmark accounts.', proc: 'Instant between your accounts' },
    bill: { title: 'Bill payment', icon: 'bill', blurb: 'Pay a saved biller', info: 'Pay now, schedule for later or repeat.', proc: 'Pays on the date you choose' }
  };
  const PURPOSES = ['Family support', 'Gift', 'Purchase of goods or services', 'Rent or mortgage', 'Invoice payment', 'Loan payment', 'Real estate closing', 'Savings or investment', 'Other'];
  const PAY_RAILS = ['ach_instant', 'ach_standard', 'wire', 'wire_intl', 'check', 'bill', 'internal'];

  /* ---------- hub ---------- */
  HM.route('/payments', 'payments', () => {
    const s = S(), lp = HM.limitInfo('payments'); const from = s.accounts[0]; const rec = s.beneficiaries.slice().sort((x, y) => new Date(y.lastUsed || 0) - new Date(x.lastUsed || 0)).slice(0, 8);
    const M = [['zap', 'Zelle', 'In minutes', 'No fee', '/payments/ach_instant/new'], ['repeat', 'Domestic transfer', '1–2 business days', 'No fee', '/payments/ach_standard/new'], ['bank', 'Wire transfer', 'Same day', '$25 fee', '/payments/wire/new'], ['globe', 'International wire', '1–3 business days', '$45 fee', '/payments/wire_intl/new'], ['swap', 'My accounts', 'Instant', 'No fee', '/payments/internal/new'], ['file', 'Check', 'We mail a check', 'No fee', '/payments/check/new']];
    return {
      title: 'Transfer',
      html: `${ui.header('Transfer', { back: false, sub: 'Send money anywhere', right: `<button class="iconbtn" data-go="/payments/history" aria-label="Payment history">${icon('clock', 20)}</button>` })}
      <div class="pad xfer">
        <div class="xf-from"><span class="xf-ic">${icon('bank', 20)}</span><span class="xf-m"><small>Sending from</small><b>${esc(from.nickname)} ${HM.mask(from.number)}</b></span><span class="xf-r"><small>Available</small><b>${money(from.available)}</b></span></div>
        ${rec.length ? `<div class="xf-h"><h2>Send again</h2>${ui.link('All', '/payments/beneficiaries')}</div><div class="xf-rec">${rec.map((b) => `<button data-go="/payments/ach_instant/new?benef=${b.id}"><span class="xf-av">${esc((b.name || '?')[0])}</span><span>${esc(b.name.split(' ')[0])}</span></button>`).join('')}<button data-go="/payments/beneficiaries/new"><span class="xf-av add">${icon('plus', 20)}</span><span>New</span></button></div>` : ''}
        <div class="xf-h"><h2>Choose how to send</h2></div>
        <div class="xf-grid">${M.map((m) => `<button class="xf-tile" data-go="${m[4]}"><span class="xf-ti">${icon(m[0], 22)}</span><b>${m[1]}</b><small>${m[2]}</small><em>${m[3]}</em></button>`).join('')}</div>
        <div class="xf-h"><h2>Pay &amp; schedule</h2></div>
        <div class="group">${ui.row({ icon: 'bill', title: 'Pay bills', sub: 'Pay, schedule & manage billers', go: '/payments/bills' })}${ui.row({ icon: 'calendar', title: 'Scheduled payments', sub: 'Upcoming & recurring', go: '/payments/scheduled' })}${ui.row({ icon: 'users', title: 'Beneficiaries', sub: 'Saved recipients', go: '/payments/beneficiaries' })}${ui.row({ icon: 'receipt', title: 'Payment history', sub: 'Receipts & filters', go: '/payments/history' })}</div>
        <div class="card xf-lim"><div class="lim-h"><b>Daily sending limit</b><span>${money(lp.left)} left</span></div>${ui.progress(lp.pct)}<div class="lim-f"><span>Used ${money(lp.used)}</span><span>Limit ${money(lp.limit).replace('.00', '')}</span></div><button class="lnk mt" data-go="/payments/limits">View all limits ›</button></div>
      </div>`
    };
  });

  /* ---------- draft + helpers ---------- */
  HM._pay = null;
  const draftFor = (rail) => { if (!HM._pay || HM._pay.rail !== rail) HM._pay = { rail, idem: 'pay:' + HM.uid('x'), from: 'chk1', amount: '', desc: '' }; return HM._pay; };
  const fromQ = () => new URLSearchParams(location.hash.split('?')[1] || '');
  const frozenWarn = (id) => { const a = HM.acct(id); return a && a.status === 'frozen' ? `<div class="note warn frz-w">${icon('snow', 18)}<span><b>Payments from ${esc(a.nickname)} are unavailable.</b> This request will be declined. No money will move.</span></div>` : ''; };
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
        ${amount}${limitLine('wire')}<div class="note">${icon('info', 18)}<span><b>Wire fee:</b> $25.00 is added to every outgoing domestic wire.</span></div>
        ${ui.select({ name: 'purpose', label: 'Payment purpose', value: d.purpose || '', options: [['', 'Select a purpose']].concat(PURPOSES.map((p) => [p, p])) })}`;
    } else if (rail === 'wire_intl') {
      body = `${from}${ui.field({ name: 'name', label: 'Beneficiary name', value: d.name || '', maxlength: 60 })}${ui.field({ name: 'bank', label: 'Receiving bank', value: d.bank || '', maxlength: 60 })}
        ${ui.field({ name: 'swift', label: 'SWIFT / BIC code', value: d.swift || '', maxlength: 11, placeholder: 'e.g. DEUTDEFF' })}${ui.field({ name: 'iban', label: 'IBAN or account number', value: d.iban || '', maxlength: 34 })}
        ${ui.select({ name: 'country', label: 'Destination country', value: d.country || '', options: [['', 'Select a country']].concat(['United Kingdom', 'Canada', 'Germany', 'France', 'Nigeria', 'Ghana', 'South Africa', 'India', 'Mexico', 'Japan', 'Australia', 'United Arab Emirates'].map((c) => [c, c])) })}
        ${amount}${limitLine('wire_intl')}<div class="note">${icon('info', 18)}<span><b>International wire fee:</b> $45.00 is added to every outgoing international wire.</span></div>
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
    const amountOK = () => { if (isNaN(amt) || amt <= 0) { ui.fail(f, amtMsg, 'amount'); return false; } if (amt > 1000000) { ui.fail(f, 'Amount is too large.', 'amount'); return false; } return true; };
    if (rail === 'ach_instant' || rail === 'ach_standard') {
      if (!data.benef) return ui.fail(f, 'Select who you are paying.', 'benef'); if (!amountOK()) return; if (!(data.desc || '').trim()) return ui.fail(f, 'Add a short payment description.', 'desc');
      Object.assign(d, { from: data.from, benef: data.benef, amount: amt, desc: data.desc.trim() });
    } else if (rail === 'wire') {
      if (!ui.need(f, data, [['name', 'Enter the beneficiary’s name.'], ['bank', 'Enter the receiving bank.']])) return;
      if (!HM.abaValid(data.routing)) return ui.fail(f, 'That routing number isn’t valid. It must be 9 digits and pass the ABA check.', 'routing');
      if (data.account.length < 6) return ui.fail(f, 'Account numbers have 6–17 digits.', 'account'); if (data.account !== data.account2) return ui.fail(f, 'The account numbers don’t match.', 'account2');
      if (!amountOK()) return; if (!data.purpose) return ui.fail(f, 'Select the purpose of this wire.', 'purpose');
      Object.assign(d, { from: data.from, wireBenef: data.wireBenef, name: data.name.trim(), bank: data.bank.trim(), routing: data.routing, account: data.account, account2: data.account2, amount: amt, purpose: data.purpose });
    } else if (rail === 'wire_intl') {
      if (!ui.need(f, data, [['name', 'Enter the beneficiary’s name.'], ['bank', 'Enter the receiving bank.']])) return;
      if (!/^[A-Za-z]{4}[A-Za-z]{2}[A-Za-z0-9]{2}([A-Za-z0-9]{3})?$/.test((data.swift || '').trim())) return ui.fail(f, 'Enter a valid 8 or 11 character SWIFT/BIC code.', 'swift');
      if ((data.iban || '').replace(/\s/g, '').length < 8) return ui.fail(f, 'Enter the IBAN or account number.', 'iban');
      if (!data.country) return ui.fail(f, 'Select the destination country.', 'country'); if (!amountOK()) return; if (!data.purpose) return ui.fail(f, 'Select the purpose of this wire.', 'purpose');
      Object.assign(d, { from: data.from, name: data.name.trim(), bank: data.bank.trim(), swift: data.swift.trim().toUpperCase(), iban: data.iban.replace(/\s/g, ''), country: data.country, amount: amt, purpose: data.purpose });
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
    if (d.rail === 'wire_intl') return from + kv('Beneficiary', esc(d.name)) + kv('Receiving bank', esc(d.bank)) + kv('SWIFT / BIC', esc(d.swift)) + kv('Account / IBAN', HM.mask(d.iban)) + kv('Country', esc(d.country)) + kv('Purpose', esc(d.purpose));
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
      <div class="note warn">${icon('alert', 18)}<span>Review the payment details before continuing.</span></div>
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
    if (a === 'ach_instant' || a === 'ach_standard') return { rail: a, from: d.from, amount: d.amount, desc: (a === 'ach_instant' ? 'Zelle to ' : 'ACH to ') + b.name, cat: 'Payments', meta: { benef: { name: b.name, bank: b.bank, routing: b.routing, account: b.account, type: b.type }, purpose: d.desc, sec: 'PPD' } };
    if (a === 'wire') return { rail: a, from: d.from, amount: d.amount, desc: 'Wire to ' + d.name, cat: 'Payments', meta: { benef: { name: d.name, bank: d.bank, routing: d.routing, account: d.account, type: 'checking' }, purpose: d.purpose } };
    if (a === 'wire_intl') return { rail: a, from: d.from, amount: d.amount, desc: 'International wire to ' + d.name, cat: 'Payments', meta: { benef: { name: d.name, bank: d.bank, swift: d.swift, account: d.iban, country: d.country, type: 'checking' }, purpose: d.purpose } };
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
      return { title: 'Scheduled', html: `<div class="pad done"><div class="okring info">${icon('calendar', 36)}</div><h2>Schedule created</h2><p class="mute">${money(s.amount)} to ${esc(s.payee)} is scheduled and will run automatically.</p><div class="btns"><button class="btn btn-primary" data-go="/payments/scheduled">View scheduled payments</button><button class="btn btn-ghost" data-go="/payments">Done</button></div></div>` };
    }
    const t = S().txs.find((x) => x.id === key); if (!t) return { html: ui.header('Result', { back: '/payments' }) };
    const ok = ['completed', 'pending'].includes(t.status), a = HM.acct(t.acct), R = HM.RAILS[t.rail] || {};
    const bt = { completed: ['check', 'ok', 'Payment sent'], pending: ['clock', 'wait', 'Payment submitted'], blocked: ['snow', 'bad', 'Payment blocked'], failed: ['x', 'bad', 'Payment failed'], declined: ['x', 'bad', 'Declined'], rejected: ['x', 'bad', 'Payment rejected'], cancelled: ['x', 'bad', 'Payment cancelled'] }[t.status] || ['info', 'ok', 'Done'];
    return {
      title: bt[2],
      html: `<div class="pad done"><div class="okring ${ok ? (t.status === 'pending' ? 'wait' : '') : 'bad'}">${icon(bt[0], 38)}</div><h2>${bt[2]}</h2>
      <p class="mute">${t.status === 'completed' ? `${money(Math.abs(t.amount))} was sent${t.rail === 'internal' ? '' : ' from ' + esc(a.nickname)}.` : t.status === 'pending' ? 'This item is awaiting review.' : esc(t.reason || 'No money was moved.')}</p>
      ${t.status === 'blocked' ? `<div class="note bad left">${icon('snow', 18)}<span>This payment was not processed. No money was transferred and your account balance did not change.</span></div>` : ''}
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
    const id = HM.uid('s'); S().scheduled.push({ id, kind: 'bill', from: d.from, payee: bl.name, billerId: bl.id, cat: bl.category === 'Housing' ? 'Housing' : 'Utilities', amount: d.amount, freq: d.freq, next: d.date, memo: d.memo, status: 'paused', created: new Date().toISOString() });
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
      html: `${ui.header(b.name, { back: '/payments/beneficiaries', sub: b.nick || 'Beneficiary' })}<div class="pad"><div class="card center"><span class="avatar lg">${esc(b.name[0])}</span><h2 class="mt">${esc(b.name)}</h2></div>
      <div class="card mt"><div class="kv"><span>Bank</span><b>${esc(b.bank)}</b></div><div class="kv"><span>Routing number</span><b>${b.routing}</b></div><div class="kv"><span>Account</span><b>${esc(b.type)} ${HM.mask(b.account)}</b></div>${b.email ? `<div class="kv"><span>Email</span><b>${esc(b.email)}</b></div>` : ''}<div class="kv"><span>Added</span><b>${HM.fmtDate(b.created)}</b></div><div class="kv"><span>Last paid</span><b>${b.lastUsed ? HM.fmtDate(b.lastUsed) : 'Never'}</b></div></div>
      <div class="btns"><button class="btn btn-primary" data-go="/payments/ach_instant/new?benef=${b.id}">${icon('zap', 18)} Send with Zelle</button><div class="btns two" style="margin:0"><button class="btn btn-ghost" data-go="/payments/ach_standard/new?benef=${b.id}">Standard ACH</button><button class="btn btn-ghost" data-go="/payments/beneficiaries/${b.id}/edit">${icon('edit', 18)} Edit</button></div><button class="btn btn-ghost danger-t" data-act="benDel" data-arg="${b.id}">${icon('trash', 18)} Remove beneficiary</button></div></div>`
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
      ${ui.field({ name: 'account', label: b ? 'Account number' : 'Account number', value: '', digits: true, inputmode: 'numeric', maxlength: 17, placeholder: b ? 'Leave blank to keep ' + HM.mask(b.account) : '', hint: 'Never enter a real account number.' })}
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
      html: `${ui.header('New scheduled payment', { back: '/payments/scheduled' })}<div class="pad">${ui.seg([['bill', 'Bill'], ['ach', 'Domestic transfer'], ['internal', 'Transfer']], sk, 'schedKind')}
      <form data-form="schedNew" novalidate>${ui.select({ name: 'from', label: 'Pay from', value: 'chk1', options: ui.acctOptions() })}${target}${ui.field({ name: 'amount', label: 'Amount', money: true, inputmode: 'decimal', placeholder: '0.00' })}${ui.field({ name: 'next', label: 'First payment date', type: 'date', value: tom, min: today })}${ui.select({ name: 'freq', label: 'Repeat', value: 'monthly', options: Object.entries(FREQ) })}${ui.field({ name: 'memo', label: 'Memo', maxlength: 50, optional: true })}<button class="btn btn-primary mt2" type="submit">Create scheduled payment</button></form></div>`
    };
  });
  HM.forms.schedNew = (f, d) => {
    const s = S(), amt = HM.parseAmt(d.amount), today = HM.dayKey(new Date());
    if (!d.target) return ui.fail(f, 'Choose who or where to pay.', 'target'); if (sk === 'internal' && d.target === d.from) return ui.fail(f, 'Choose two different accounts.', 'target');
    if (isNaN(amt) || amt <= 0) return ui.fail(f, 'Enter an amount greater than $0.00.', 'amount'); if (!d.next || d.next < today) return ui.fail(f, 'Choose today or a future date.', 'next');
    const x = { id: HM.uid('s'), kind: sk === 'ach' ? 'ach_standard' : sk, from: d.from, amount: amt, freq: d.freq, next: d.next, memo: (d.memo || '').trim(), status: 'paused', created: new Date().toISOString() };
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
  HM.route('/payments/history', 'activity', () => {
    const q = fromQ(); if (q.get('rail')) { ph.rail = q.get('rail'); }
    const groups = { all: PAY_RAILS, ach: ['ach_instant', 'ach_standard'], ach_instant: ['ach_instant'], ach_standard: ['ach_standard'], wire: ['wire', 'wire_intl'], check: ['check'], bill: ['bill'], internal: ['internal'] };
    const base = HM.history().filter((t) => (groups[ph.rail] || PAY_RAILS).includes(t.rail)); const list = ui.applyFilter(base, phF);
    return {
      title: 'Payment history',
      html: `${ui.header('Activity', { back: false, sub: 'Account activity & transaction records', right: `<button class="iconbtn" data-go="/payments/analytics" aria-label="Spending analytics">${icon('chart', 20)}</button>` })}<div class="pad">${HM.activityHub()}<div class="chips">${[['all', 'All payments'], ['ach', 'ACH'], ['wire', 'Wires'], ['check', 'Checks'], ['bill', 'Bills'], ['internal', 'Transfers']].map((c) => `<button class="chip ${ph.rail === c[0] ? 'on' : ''}" data-act="phRail" data-arg="${c[0]}">${c[1]}</button>`).join('')}</div>
      <details class="filters"><summary>${icon('filter', 16)} Search &amp; filters</summary>${ui.txFilterUI(phF, 'phf')}</details>
      <div class="sm mute" style="margin:2px 0 8px">${list.length} payment${list.length === 1 ? '' : 's'}</div>${list.length ? `<div class="group">${ui.groupByDay(list.slice(0, 80), { acct: true })}</div>` : ui.card(ui.empty('receipt', 'No payments found', 'Try a different filter.'))}${HM.xActivity()}</div>`
    };
  });

  HM.route('/payments/analytics', 'activity', () => {
    const now = new Date(), start = new Date(now.getFullYear(), now.getMonth(), 1), end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const spend = ui.spendBy(start.getTime(), end.getTime()); const monthly = ui.monthly(6);
    return { title: 'Spending analytics', html: `${ui.header('Spending analytics', { back: '/payments/history', sub: 'Monthly overview' })}<div class="pad">${ui.section('Spending by category', '', `<div class="card center">${spend.length ? ui.donut(spend, { label: 'Spent' }) : ui.empty('chart', 'No spending data', 'Category totals will appear when transactions are available.')}</div>`)}${ui.section('Monthly comparison', '', `<div class="card">${monthly.length ? ui.bars(monthly) : '<p class="sm mute">No monthly activity available.</p>'}<div class="legend"><span><i style="background:var(--teal)"></i>Credits</span><span><i style="background:var(--gold)"></i>Debits</span></div></div>`)}<div class="note">${icon('info', 18)}<span>Charts summarize the account activity currently displayed in this app.</span></div></div>` };
  });

  /* ---------- limits ---------- */
  HM.route('/payments/limits', 'payments', () => {
    const keys = ['ach_instant', 'ach_standard', 'wire', 'check', 'withdrawal', 'deposit', 'payments'];
    return {
      title: 'Daily limits',
      html: `${ui.header('Daily limits', { back: '/payments', sub: 'Resets every day at midnight', right: `<button class="iconbtn" data-act="limitsEdit" aria-label="Edit limits">${icon('edit', 20)}</button>` })}<div class="pad">
      ${keys.map((k) => { const L = HM.limitInfo(k); return `<div class="card"><div class="lim-h"><b>${HM.LIMIT_LABELS[k]}</b><span>${money(L.limit).replace('.00', '')}</span></div>${ui.progress(L.pct)}<div class="lim-f"><span>Used ${money(L.used)}</span><span>Remaining ${money(L.left)}</span></div>${L.pct >= 100 ? `<div class="note bad">${icon('alert', 18)}<span>Limit reached. New ${HM.LIMIT_LABELS[k].toLowerCase()} payments will be declined until tomorrow.</span></div>` : L.pct >= 80 ? `<div class="note warn">${icon('alert', 18)}<span>You’ve used ${L.pct}% of this limit.</span></div>` : ''}</div>`; }).join('')}
      <div class="note">${icon('info', 18)}<span>Adjust your daily limits to suit how you bank.</span></div><div class="btns two"><button class="btn btn-primary" data-act="limitsEdit">Configure limits</button><button class="btn btn-ghost" data-act="limitsReset">Reset defaults</button></div></div>`
    };
  });
  HM.acts.limitsEdit = () => ui.sheet(`<h3 class="sh-title">Configure daily limits</h3><p class="sh-body">Amounts are per day.</p><form data-form="limits" novalidate>${Object.keys(HM.DEFAULT_LIMITS).map((k) => ui.field({ name: k, label: HM.LIMIT_LABELS[k], money: true, inputmode: 'decimal', value: String(S().limits[k]) })).join('')}<div class="sh-actions"><button class="btn btn-primary" type="submit">Save limits</button><button class="btn btn-ghost" type="button" data-act="closeSheet">Cancel</button></div></form>`);
  HM.forms.limits = (f, d) => {
    const out = {}; for (const k of Object.keys(HM.DEFAULT_LIMITS)) { const v = HM.parseAmt(d[k]); if (isNaN(v) || v < 1 || v > 250000) return ui.fail(f, 'Enter an amount between $1 and $250,000.', k); out[k] = v; }
    Object.assign(S().limits, out); HM.save(); ui.closeSheet(); HM.refresh(true); ui.toast('Limits updated');
  };
  HM.acts.limitsReset = async () => { if (await ui.confirm({ title: 'Reset limits?', body: 'Daily limits return to their default values.', ok: 'Reset' })) { S().limits = Object.assign({}, HM.DEFAULT_LIMITS); HM.save(); HM.refresh(true); ui.toast('Limits reset'); } };

  /* ---------- rail routes (registered last: generic patterns) ---------- */
  HM.route('/payments/:rail/new', 'payments', ({ rail }) => newPage(rail));
  HM.route('/payments/:rail/review', 'payments', ({ rail }) => reviewPage(rail));
})();


/* Westmark Mobile — receipts: a separate polished layout per payment type, print + download */
(function () {
  'use strict';
  const HM = window.HM, ui = HM.ui, esc = HM.esc, icon = HM.icon, money = HM.money;
  const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const words = (n) => { if (n < 20) return ONES[n]; if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : ''); if (n < 1000) return ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + words(n % 100) : ''); if (n < 1e6) return words(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? ' ' + words(n % 1000) : ''); return words(Math.floor(n / 1e6)) + ' million' + (n % 1e6 ? ' ' + words(n % 1e6) : ''); };
  const amountWords = (v) => { const d = Math.floor(v), c = Math.round((v - d) * 100); const w = (d === 0 ? 'zero' : words(d)); return w[0].toUpperCase() + w.slice(1) + ' and ' + String(c).padStart(2, '0') + '/100 dollars'; };
  const addS = (d, s) => new Date(new Date(d).getTime() + s * 1000);
  const digitsOf = (ref) => String(ref).replace(/\D/g, '');

  const head = (t, title, sub, cls) => `<div class="rc-head ${cls || ''}"><div class="rc-brand">${ui.logo(40)}<div><b>WESTMARK BANK</b><span>${esc(sub || 'Your finances. Your direction.')}</span></div></div><div class="rc-type">${esc(title)}</div></div>`;
  const notDone = (t) => ['blocked', 'failed', 'declined', 'rejected', 'cancelled', 'returned'].includes(t.status);
  const railStatus = (t) => {
    if (!notDone(t)) return null;
    const labels = {
      zelle: 'FAILED — ACCOUNT FROZEN',
      ach_instant: 'DECLINED — ACCOUNT FROZEN',
      ach_standard: 'REJECTED — NOT SUBMITTED',
      wire: 'CANCELLED — NOT RELEASED',
      wire_intl: 'CANCELLED — NOT RELEASED',
      check: 'ACCOUNT FROZEN — NOT ISSUED',
      internal: 'ACCOUNT FROZEN — NOT PROCESSED',
      bill: 'DECLINED — NOT SUBMITTED'
    };
    return labels[t.rail] || 'BLOCKED — NOT PROCESSED';
  };
  const statusBand = (t) => {
    const specific = railStatus(t);
    const m = specific ? ['bad', 'snow', specific] : ({ completed: ['ok', 'check', 'COMPLETED'], pending: ['wait', 'clock', 'PENDING'], blocked: ['bad', 'snow', 'BLOCKED — NOT PROCESSED'], failed: ['bad', 'x', 'FAILED — NOT PROCESSED'], declined: ['bad', 'x', 'DECLINED'] }[t.status] || ['bad', 'x', String(t.status || 'UNAVAILABLE').toUpperCase()]);
    return `<div class="rc-status ${m[0]}">${icon(m[1], 20)}<span>${m[2]}</span></div>${notDone(t) ? `<div class="rc-stamp">${esc(({ blocked: 'BLOCKED', failed: 'FAILED', declined: 'DECLINED', rejected: 'REJECTED', cancelled: 'CANCELLED', returned: 'RETURNED' })[t.status] || 'NOT PROCESSED')}</div>` : ''}${notDone(t) ? `<div class="rc-reason"><b>Account result:</b> ${esc(t.reason || 'The account restriction prevented this request from being processed.')} <b>No funds were sent, deducted, or credited.</b></div>` : ''}`;
  };
  const row = (k, v, cls) => (v === '' || v == null ? '' : `<div class="rk ${cls || ''}"><span>${k}</span><b>${v}</b></div>`);
  const foot = (t) => `<div class="rc-foot"><div>Ref <b>${esc(t.ref)}</b> · Printed ${HM.fmtDT(new Date())}</div><p class="rc-fine">Transaction record</p></div>`;
  const acctLine = (a) => `${esc(a.nickname)} · ${esc(a.type === 'savings' ? 'Savings' : 'Checking')} ${HM.mask(a.number)}`;
  const timeline = (items) => `<ul class="tlist">${items.map((i) => `<li class="${i[0]}"><i>${i[0] === 'no' ? '✕' : i[0] === 'off' ? '' : i[0] === 'now' ? '●' : '✓'}</i><div><b>${esc(i[1])}</b><small>${esc(i[2])}</small></div></li>`).join('')}</ul>`;

  function build(t, h) {
    const a = HM.acct(t.acct), m = t.meta || {}, amt = Math.abs(t.amount), when = t.date, bad = notDone(t);
    const holder = HM.holder();
    switch (t.rail) {
      case 'ach_instant': {
        const b = m.benef || {};
        return `<article class="receipt r-instant" id="rcpt">${head(t, 'Zelle Transfer', 'Payment receipt', 'navy')}<div class="rc-body">${statusBand(t)}<div class="rc-amt">${money(amt)}</div><div class="rc-date">${HM.fmtDT(when)}</div>
          <div class="rc-flow"><div><small>FROM</small><b>${esc(holder)}</b><span>${acctLine(a)}</span></div><div class="arr">${icon('zap', 22)}</div><div><small>TO</small><b>${esc(b.name)}</b><span>${esc(b.bank)} · ${HM.mask(b.account || '')}</span></div></div>
          ${row('Description', esc(m.purpose))}${row('Transaction reference', esc(t.ref))}${row('Payment type', 'Zelle')}${row('Routing number', esc(b.routing))}${row('Fee', money(t.fee || 0))}${row('Status', esc(t.status))}
          <div class="rc-sub">Delivery timeline</div>${bad ? timeline([['', 'Payment initiated', HM.fmtTime(when)], ['no', 'Stopped at account review', HM.fmtTime(addS(when, 2))], ['off', 'Not sent to ACH network', '—']]) : timeline([['', 'Payment initiated', HM.fmtTime(when)], ['', 'Verified & limits checked', HM.fmtTime(addS(when, 1))], ['', 'Sent to ACH network', HM.fmtTime(addS(when, 2))], ['', 'Delivered to beneficiary', HM.fmtTime(addS(when, 4))]])}
          </div>${foot(t)}</article>`;
      }
      case 'ach_standard': {
        const b = m.benef || {}; const eff = new Date(when); eff.setDate(eff.getDate() + 1); const trace = (HM.BANK.routing.slice(0, 8) + digitsOf(t.ref).slice(-7).padStart(7, '0'));
        return `<article class="receipt r-ach" id="rcpt">${head(t, 'Domestic Transfer', 'ACH transfer notice', 'white')}<div class="rc-body">${statusBand(t)}<div class="rc-amt">${money(amt)}</div><div class="rc-date">Initiated ${HM.fmtDT(when)}</div>
          <div class="rc-flow"><div><small>ORIGINATOR</small><b>${esc(holder)}</b><span>${acctLine(a)}</span></div><div class="arr">${icon('chevR', 22)}</div><div><small>RECEIVER</small><b>${esc(b.name)}</b><span>${esc(b.type || 'checking')} ${HM.mask(b.account || '')}</span></div></div>
          ${row('Receiving bank', esc(b.bank))}${row('Receiving routing (ABA)', esc(b.routing))}${row('Entry description', esc(m.purpose))}${row('SEC code', esc(m.sec || 'PPD'))}${row('Effective entry date', HM.fmtDate(eff))}${row('Settlement', bad ? 'Not applicable' : 'Typically 1–2 business days (~' + Math.round(HM.PENDING_MS / 1000) + ' s)')}${row('Fee', money(t.fee || 0))}
          <div class="rc-sub">Processing</div>${bad ? timeline([['', 'Request received', HM.fmtTime(when)], ['no', 'Declined at account review', HM.fmtTime(addS(when, 2))], ['off', 'Not submitted to ACH network', '—']]) : timeline([['', 'Request received', HM.fmtTime(when)], ['', 'Submitted to ACH network', HM.fmtTime(addS(when, 3))], [t.status === 'completed' ? '' : 'now', t.status === 'completed' ? 'Settled — funds posted' : 'In transit — pending', t.status === 'completed' ? HM.fmtDT(t.settledAt || when) : 'Expected shortly'], ...(t.status === 'completed' ? [] : [['off', 'Settled at receiving bank', '—']])])}
          </div>${foot(t)}</article>`;
      }
      case 'wire': {
        const b = m.benef || {};
        return `<article class="receipt r-wire" id="rcpt">${head(t, 'WIRE TRANSFER ADVICE', 'Domestic wire request', 'navy')}<div class="rc-body">${statusBand(t)}
          <div class="wgrid"><div class="c full amt"><small>WIRE AMOUNT (USD)</small><b>${money(amt)}</b></div>
          <div class="c"><small>VALUE DATE</small><b>${HM.fmtDate(when)}</b></div><div class="c"><small>TIME ENTERED</small><b>${HM.fmtTime(when)}</b></div>
          <div class="c full"><small>WIRE REFERENCE</small><b>${esc(t.ref)}</b></div>          <div class="c full"><small>ORIGINATOR</small><b>${esc(holder)}</b></div><div class="c"><small>ORIGINATING BANK</small><b>Westmark Bank</b></div><div class="c"><small>ORIGINATING ABA</small><b>${HM.BANK.routing}</b></div><div class="c full"><small>ORIGINATOR ACCOUNT</small><b>${acctLine(a)}</b></div>
          <div class="c full"><small>BENEFICIARY</small><b>${esc(b.name)}</b></div><div class="c"><small>BENEFICIARY BANK</small><b>${esc(b.bank)}</b></div><div class="c"><small>BENEFICIARY ABA</small><b>${esc(b.routing)}</b></div><div class="c full"><small>BENEFICIARY ACCOUNT</small><b>${HM.mask(b.account || '')}</b></div>
          <div class="c full"><small>PURPOSE OF PAYMENT</small><b>${esc(m.purpose)}</b></div><div class="c"><small>WIRE FEE</small><b>${money(t.fee || 0)}</b></div><div class="c"><small>TOTAL DEBITED</small><b>${bad ? money(0) : money(amt + (t.fee || 0))}</b></div><div class="c full"><small>STATUS</small><b>${esc(t.status.toUpperCase())}</b></div></div>
          <div class="sigs"><div>Authorized electronically via Westmark Mobile</div><div>${esc(holder)}</div></div></div>${foot(t)}</article>`;
      }
      case 'wire_intl': {
        const b = m.benef || {};
        return `<article class="receipt r-wire r-intl" id="rcpt">${head(t, 'INTERNATIONAL WIRE ADVICE', 'Cross-border payment request', 'gold')}<div class="rc-body">${statusBand(t)}
          <div class="wgrid"><div class="c full amt"><small>WIRE AMOUNT (USD)</small><b>${money(amt)}</b></div>
          <div class="c"><small>VALUE DATE</small><b>${HM.fmtDate(when)}</b></div><div class="c"><small>TIME ENTERED</small><b>${HM.fmtTime(when)}</b></div>
          <div class="c full"><small>WIRE REFERENCE</small><b>${esc(t.ref)}</b></div>
          <div class="c full"><small>ORDERING CUSTOMER</small><b>${esc(holder)}</b></div><div class="c"><small>ORDERING BANK</small><b>Westmark Bank</b></div><div class="c"><small>SWIFT / BIC</small><b>HRBSUS33</b></div><div class="c full"><small>DEBIT ACCOUNT</small><b>${acctLine(a)}</b></div>
          <div class="c full"><small>BENEFICIARY</small><b>${esc(b.name)}</b></div><div class="c"><small>BENEFICIARY BANK</small><b>${esc(b.bank)}</b></div><div class="c"><small>SWIFT / BIC</small><b>${esc(b.swift)}</b></div><div class="c"><small>COUNTRY</small><b>${esc(b.country)}</b></div><div class="c"><small>ACCOUNT / IBAN</small><b>${HM.mask(b.account || '')}</b></div>
          <div class="c full"><small>PURPOSE OF PAYMENT</small><b>${esc(m.purpose)}</b></div><div class="c"><small>INTERNATIONAL WIRE FEE</small><b>${money(t.fee || 0)}</b></div><div class="c"><small>TOTAL DEBITED</small><b>${bad ? money(0) : money(amt + (t.fee || 0))}</b></div><div class="c full"><small>STATUS</small><b>${esc(t.status.toUpperCase())}</b></div></div>
          <div class="sigs"><div>Authorized electronically via Westmark Mobile</div><div>${esc(holder)}</div></div></div>${foot(t)}</article>`;
      }
      case 'check': {
        return `<article class="receipt r-check" id="rcpt">${head(t, 'Check Payment', 'Check issued receipt', 'gold')}<div class="rc-body">${statusBand(t)}
          <div class="chkface"><div class="chk-top"><div><b>${esc(holder)}</b><span>${esc(HM.acct(t.acct).nickname)}</span></div><div class="chk-no">${m.checkNo ? '№ ' + m.checkNo : ''}<br><small>DATE ${m.issueDate ? HM.fmtDate(HM.parseDay(m.issueDate), { month: '2-digit', day: '2-digit', year: 'numeric' }) : ''}</small></div></div>
          <div class="chk-pay"><small>PAY TO THE<br>ORDER OF</small><b>${esc(m.payee)}</b><div class="box">${money(amt)}</div></div><div class="chk-w">${amountWords(amt)}</div>
          <div class="chk-bot"><div><small>MEMO</small> ${esc(m.memo || '')}</div><div class="sig">${esc(holder)}</div></div><div class="micr">⑆${HM.BANK.routing}⑆ ${HM.mask(a.number)}⑈ ${String(m.checkNo || '').padStart(4, '0')}</div></div>
          ${row('Payee', esc(m.payee))}${row('Check number', m.checkNo ? '#' + m.checkNo : '')}${row('Issue date', m.issueDate ? HM.fmtDate(HM.parseDay(m.issueDate)) : '')}${row('Source account', acctLine(a))}${row('Memo', esc(m.memo))}${row('Confirmation', esc(t.ref))}${row('Check status', bad ? 'Not issued — payment unavailable' : 'Check record')}</div>${foot(t)}</article>`;
      }
      case 'internal': {
        const pair = HM.txByRef(t.ref); const deb = pair.find((x) => x.amount < 0) || t, cr = pair.find((x) => x.amount > 0); const hh = h.filter((x) => x.ref === t.ref);
        const dh = hh.find((x) => x.amount < 0), ch = hh.find((x) => x.amount > 0); const from = HM.acct(deb.acct), to = cr ? HM.acct(cr.acct) : HM.acct((deb.meta || {}).counter);
        return `<article class="receipt r-internal" id="rcpt">${head(t, 'Internal Transfer', 'Between your Westmark accounts', 'teal')}<div class="rc-body">${statusBand(t)}<div class="rc-amt">${money(amt)}</div><div class="rc-date">${HM.fmtDT(when)}</div>
          <div class="rc-flow"><div><small>FROM</small><b>${esc(from.nickname)}</b><span>${HM.mask(from.number)}</span>${dh && !bad ? `<em>New balance ${money(dh.bal)}</em>` : ''}</div><div class="arr">${icon('swap', 22)}</div><div><small>TO</small><b>${esc(to.nickname)}</b><span>${HM.mask(to.number)}</span>${ch && !bad ? `<em>New balance ${money(ch.bal)}</em>` : ''}</div></div>
          ${row('Description', esc((deb.meta || {}).memo || ''))}${row('Reference', esc(t.ref))}${row('Status', esc(t.status))}${row('Fee', money(0))}</div>${foot(t)}</article>`;
      }
      case 'bill': {
        return `<article class="receipt r-bill" id="rcpt">${head(t, 'Bill Payment', 'Payment confirmation', 'white')}<div class="rc-body">${statusBand(t)}<div class="rc-amt">${money(amt)}</div><div class="rc-date">Paid ${HM.fmtDT(when)}</div>
          <div class="bill-card"><small>PAID TO</small><b>${esc(m.biller)}</b><span>${esc(m.billerAcct || '')}</span></div>
          ${row('Confirmation number', esc(t.ref))}${row('Paid from', acctLine(a))}${row('Payment date', HM.fmtDate(m.paymentDate ? HM.parseDay(m.paymentDate) : when))}${row('Memo', esc(m.memo))}${row('Type', m.scheduledId ? 'Scheduled / recurring payment' : 'One-time payment')}${row('Fee', money(0))}${row('Status', esc(t.status))}</div>${foot(t)}</article>`;
      }
      case 'deposit': {
        const d = HM.state().deposits.find((x) => x.id === m.depositId) || {};
        const front = HM.checkImage ? HM.checkImage('front', { payer: m.payer || 'Payer', amount: amt, checkDate: m.checkDate || HM.dayKey(when), memo: m.memo || '' }) : '', back = HM.checkImage ? HM.checkImage('back', {}) : '';
        return `<article class="receipt r-deposit" id="rcpt">${head(t, 'Mobile Check Deposit', 'Deposit receipt', 'teal')}<div class="rc-body">${statusBand(t)}<div class="rc-amt">${money(amt)}</div><div class="rc-date">${HM.fmtDT(when)}</div>
          <div class="imgs"><div><small>Front</small><img src="${front}" alt="Check front (image)"></div><div><small>Back</small><img src="${back}" alt="Check back (image)"></div></div>
          ${row('Deposited to', acctLine(a))}${row('Payer', esc(m.payer))}${row('Check date', m.checkDate ? HM.fmtDate(HM.parseDay(m.checkDate)) : '')}${row('Memo', esc(m.memo))}${row('Deposit reference', esc(t.ref))}${row('Deposit outcome', bad ? 'Rejected — no deposit credited' : 'Deposit record')}${row('Status', esc(t.status))}
          <p class="hint">Keep the original check until the deposit posts, then mark it “deposited” and destroy it securely.</p></div>${foot(t)}</article>`;
      }
      default: return `<article class="receipt" id="rcpt">${head(t, HM.RAILS[t.rail] ? HM.RAILS[t.rail].label : 'Transaction')}<div class="rc-body">${statusBand(t)}<div class="rc-amt">${money(amt)}</div>${row('Description', esc(t.desc))}${row('Reference', esc(t.ref))}${row('Account', acctLine(a))}${row('Date', HM.fmtDT(when))}</div>${foot(t)}</article>`;
    }
  }

  HM.route('/receipt/:ref', 'payments', ({ ref }) => {
    const all = HM.txByRef(ref); const t = all.find((x) => x.amount < 0) || all[0];
    if (!t) return { html: ui.header('Receipt', { back: '/payments/history' }) + '<div class="pad">' + ui.card(ui.empty('receipt', 'Receipt not found', 'This receipt may have been reset.')) + '</div>' };
    HM.processDue();
    return {
      title: 'Receipt',
      html: `<div class="rc-ctl" id="rcCtl"><button class="iconbtn" data-back="/payments/history" aria-label="Back">${icon('chevL', 22)}</button><span></span><button class="iconbtn" data-act="rcPrint" aria-label="Print">${icon('print', 20)}</button><button class="iconbtn" data-act="rcDownload" data-arg="${esc(ref)}" aria-label="Download">${icon('download', 20)}</button></div><div class="rc-wrap">${build(t, HM.history())}</div>`,
      after() { const c = document.getElementById('rcCtl'), w = document.querySelector('.rc-wrap'); if (!c || !w) return; const tm = setTimeout(() => c.classList.add('hide'), 3200); w.addEventListener('click', () => { clearTimeout(tm); c.classList.toggle('hide'); }); }
    };
  });
  HM.acts.rcPrint = () => window.print();
  HM.acts.rcDownload = (b, ref) => {
    const el = document.getElementById('rcpt'); if (!el) return; const all = HM.txByRef(ref);
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Westmark receipt ${esc(ref)}</title><style>${ui.pageCss()}html,body{height:auto;overflow:auto}body{padding:16px;background:#E9ECEC}.receipt{max-width:520px;margin:0 auto}</style></head><body>${el.outerHTML}</body></html>`;
    ui.download('Westmark-Receipt-' + ref + '.html', html); ui.toast('Receipt downloaded');
  };
})();


/* Westmark Mobile — Cards: overview, controls, security, activity, virtual card, simulated purchases.
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

  HM.cardVisual = (c, o) => cardVisual(c, o);
  function cardVisual(c, o) {
    o = o || {}; const a = HM.acct(c.acct); const off = c.status !== 'active';
    return `<div class="dcard ${c.kind === 'virtual' ? 'virt' : ''} ${off ? 'off' : ''}" role="img" aria-label="${label(c)} ending ${c.last4}, ${stat(c)}">
      <span class="dc-holo" aria-hidden="true">${ui.logo(150)}</span>
      <div class="dc-top"><span class="dc-bank">${ui.logo(26)}<b>Westmark</b></span><span class="dc-tag">${c.kind === 'virtual' ? 'VIRTUAL' : 'DEBIT'}</span></div>
      <div class="dc-mid"><span class="dc-chip"><i></i></span>${c.controls.contactless && c.kind !== 'virtual' ? `<span class="dc-nfc">${icon('contactless', 24)}</span>` : ''}</div>
      <div class="dc-num"><span>••••</span><span>••••</span><span>••••</span><span>${c.last4}</span></div>
      <div class="dc-bot"><div class="dc-f"><small>Card holder</small><b>${esc(holderName())}</b></div><div class="dc-f dc-exp"><small>Valid thru</small><b>${c.exp}</b></div></div>
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
      ${fr ? `<div class="note warn">${icon('snow', 18)}<span>Card purchases and ATM withdrawals are unavailable for the linked account.</span></div>` : ''}
      ${c.status === 'pending' ? `<div class="note">${icon('info', 18)}<span>Your new card is on its way. When it arrives, activate it to start using it.</span></div><button class="btn btn-gold mt" data-go="/cards/activate/${c.id}">${icon('check', 18)} Activate card</button>` : c.status === 'cancelled' ? '' : `<div class="btns two"><button class="btn ${c.status === 'locked' ? 'btn-gold' : 'btn-primary'}" data-act="toggleLock" data-arg="${c.id}">${icon(c.status === 'locked' ? 'unlock' : 'lock', 18)} ${c.status === 'locked' ? 'Unlock card' : 'Lock card'}</button><button class="btn btn-ghost" data-go="/cards/activity">${icon('receipt', 18)} Activity</button></div>`}</div>
      ${ui.section('Card controls', '', `<div class="group">${[['lock', 'Lock & unlock', 'Instantly pause the card', '/cards/controls/' + c.id], ['shield', 'Card security', 'Online, international, ATM, contactless', '/cards/security/' + c.id], ['sliders', 'Spending limits', 'Purchase & ATM limits', '/cards/security/' + c.id + '#limits'], ['key', 'Change PIN', 'PIN is never stored', '/cards/pin/' + c.id], ['refresh', 'Replace card', 'Damaged or worn', '/cards/controls/' + c.id + '#replace'], ['alert', 'Report lost or stolen', 'Cancel and order a new card', '/cards/controls/' + c.id + '#lost']].map((r) => ui.row({ icon: r[0], tone: r[0] === 'alert' ? 'red' : '', title: r[1], sub: r[2], go: r[3] })).join('')}</div>`)}
      ${ui.section('More', '', `<div class="group">${ui.row({ icon: 'receipt', title: 'Card activity', sub: 'Transactions, merchants & status', go: '/cards/activity' })}${ui.row({ icon: 'device', title: 'Virtual card', sub: 'For online shopping', go: '/cards/virtual' })}</div>`)}
      ${HM.cardsMore()}
      ${HM.xCards()}<p class="footnote">Card details are protected. Never share your PIN or security code.</p>`
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
      <div id="replace"></div>${ui.section('Replace or report', '', `<div class="group">${ui.row({ icon: 'refresh', title: 'Replace card', sub: 'Order a replacement', act: 'replaceOpen', arg: id })}${ui.row({ icon: 'alert', tone: 'red', title: 'Report lost or stolen', sub: 'Cancel this card immediately', act: 'lostOpen', arg: id })}</div>`)}</div>`,
      after() { if (location.hash.endsWith('#replace')) HM.acts.replaceOpen(null, id); if (location.hash.endsWith('#lost')) HM.acts.lostOpen(null, id); }
    };
  });
  const newLast4 = () => String(1000 + Math.floor(Math.random() * 9000));
  const newExp = () => { const d = new Date(); return String(d.getMonth() + 1).padStart(2, '0') + '/' + String((d.getFullYear() + 4) % 100).padStart(2, '0'); };
  HM.acts.replaceOpen = (b, id) => ui.sheet(`<h3 class="sh-title">Replace card</h3><form data-form="replace" data-id="${id}" novalidate>${ui.select({ name: 'why', label: 'Reason', value: '', options: [['', 'Select a reason'], ['Damaged', 'Card is damaged or worn'], ['Chip', 'Chip or stripe not working'], ['Name', 'Name change']] })}<p class="sh-body">A new card number is issued and the current number stops working once the new card is activated. no card is mailed.</p><div class="sh-actions"><button class="btn btn-primary" type="submit">Order replacement</button><button class="btn btn-ghost" type="button" data-act="closeSheet">Cancel</button></div></form>`);
  HM.forms.replace = (f, d) => {
    if (!d.why) return ui.fail(f, 'Choose a reason for the replacement.', 'why'); const c = card(f.dataset.id);
    c.prev = c.last4; c.last4 = newLast4(); c.exp = newExp(); c.status = 'pending'; c.pinChanged = null; HM.notify('account', 'Replacement card ordered', `A replacement ${label(c).toLowerCase()} was ordered. activate it with the last 4 digits ${c.last4}.`); HM.save(); ui.closeSheet(); ui.toast('Replacement ordered. Activate it in Cards.'); HM.go('/cards', { replace: true });
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
    return { title: 'Activate card', html: `${ui.header('Activate card', { back: '/cards' })}<div class="pad">${cardVisual(c, { meta: false })}<form data-form="activate" data-id="${id}" novalidate>${ui.field({ name: 'last4', label: 'Last 4 digits on your new card', digits: true, inputmode: 'numeric', maxlength: 4, hint: 'Hint: your new card ends in <b>' + c.last4 + '</b>.' })}${ui.field({ name: 'pin', label: 'Choose a 4-digit PIN', type: 'password', digits: true, inputmode: 'numeric', maxlength: 4, autocomplete: 'off', hint: 'Never stored.' })}<button class="btn btn-primary mt2" type="submit">Activate card</button></form></div>` };
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
    return { title: 'Change PIN', html: `${ui.header('Change PIN', { back: '/cards', sub: label(c) + ' •• ' + c.last4 })}<div class="pad"><div class="note">${icon('shield', 18)}<span><b>Note:</b> Your PIN is checked in your browser and then discarded — it is never stored or sent anywhere.</span></div>${c.status !== 'active' ? `<div class="note warn">${icon('alert', 18)}<span>Card must be active to change its PIN.</span></div>` : ''}<form data-form="pin" data-id="${id}" novalidate>${ui.field({ name: 'cur', label: 'Current PIN', type: 'password', digits: true, inputmode: 'numeric', maxlength: 4 })}${ui.field({ name: 'n1', label: 'New PIN', type: 'password', digits: true, inputmode: 'numeric', maxlength: 4 })}${ui.field({ name: 'n2', label: 'Confirm new PIN', type: 'password', digits: true, inputmode: 'numeric', maxlength: 4 })}<button class="btn btn-primary mt2" type="submit" ${c.status !== 'active' ? 'disabled' : ''}>Change PIN</button></form></div>` };
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
      <div class="note">${icon('info', 18)}<span>Card purchases remain unavailable while the linked account is restricted.</span></div></div>`,
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
      html: `${ui.header('Card activity', { back: '/cards', sub: 'Debit & virtual card transactions', right: '' })}<div class="pad">
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
      <div class="note">${icon('shield', 18)}<span><b>Security:</b> Full card details are never displayed here. In a real app you would reveal them briefly after Face ID. Never share your card number or one-time codes with anyone who contacts you.</span></div>
      <div class="group mt">${c.status === 'locked' || c.status === 'active' ? ui.toggle({ title: 'Lock virtual card', on: c.status === 'locked', act: 'toggleLock', arg: c.id }) : ''}${ui.row({ icon: 'refresh', title: 'Generate a new virtual number', sub: 'The current number stops working', act: 'virtNew', arg: c.id })}${ui.row({ icon: 'shield', title: 'Controls & limits', go: '/cards/security/' + c.id })}${ui.row({ icon: 'receipt', title: 'Activity', go: '/cards/activity' })}</div></div>`
    };
  });
  HM.acts.virtNew = async (b, id) => { if (await ui.confirm({ title: 'Generate a new virtual number?', body: 'The current virtual card number will stop working immediately. Update it anywhere you saved it.', ok: 'Generate new number' })) { const c = card(id); c.last4 = newLast4(); c.exp = newExp(); HM.notify('security', 'Virtual card number changed', 'A new virtual number ending ' + c.last4 + ' was generated.'); HM.save(); HM.refresh(true); ui.toast('New virtual number generated'); } };

  /* ---------- simulator: outcomes decided by rules only ---------- */
  const MERCH = { pos: ['Fresh Market', 'Corner Café', 'Fuel Stop 24', 'Urban Threads'], contactless: ['Metro Transit', 'Corner Café', 'Daily Basket'], online: ['Gadget Garage', 'StreamBox Monthly', 'Book Nook'], intl: ['Harbor Inn (overseas)', 'Skyline Air (intl)'], atm: ['Westmark ATM', 'Corner Bank ATM'] };
  HM.forms.sim = (f, d) => {
    const amt = HM.parseAmt(d.amount); if (!d.merchant.trim()) return ui.fail(f, 'Enter a merchant name.', 'merchant'); if (isNaN(amt) || amt <= 0) return ui.fail(f, 'Enter an amount greater than $0.00.', 'amount');
    const res = HM.cardTxn({ cardId: d.card, merchant: d.merchant.trim(), amount: amt, mode: d.mode, cat: d.mode === 'online' ? 'Shopping' : undefined });
    const ok = res.ok, t = res.tx;
    ui.sheet(`<div class="center"><div class="okring ${ok ? '' : 'bad'}" style="margin:0 auto 12px">${icon(ok ? 'check' : 'x', 34)}</div><h3 class="sh-title">${ok ? (d.mode === 'atm' ? 'Withdrawal approved' : 'Approved — pending') : t && t.status === 'blocked' ? 'Blocked' : 'Declined'}</h3><p class="sh-body">${ok ? `${money(amt)} at ${esc(d.merchant)}${d.mode === 'atm' ? ' — cash dispensed.' : ' is pending and will post shortly.'}` : esc(res.error) + ' No money was deducted.'}</p></div><div class="sh-actions"><button class="btn btn-primary" data-go="${t ? '/tx/' + t.id : '/cards/activity'}">View transaction</button><button class="btn btn-ghost" data-act="closeSheet">Close</button></div>`);
    if (HM.cur.path.startsWith('/cards')) HM.refresh(true);
  };
})();


/* Westmark Mobile — More: profile, security, notifications, support, services, preferences, about, sign out */
(function () {
  'use strict';
  const HM = window.HM, ui = HM.ui, esc = HM.esc, icon = HM.icon, money = HM.money;
  const S = () => HM.state();
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const np = '<span class="np">Not provided</span>';
  const val = (v) => (v ? esc(v) : np);
  const PHOTO = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjAgMTIwIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImJnIiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjRkJFRkNCIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjRTZDQjg1Ii8+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9ImhhaXIiIHgxPSIwIiB5MT0iMCIgeDI9IjAiIHkyPSIxIj48c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiM1QjQyMzAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMzODI4MUIiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iY2xvdGgiIHgxPSIwIiB5MT0iMCIgeDI9IjAiIHkyPSIxIj48c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiMzMTM2M0QiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMxQzFGMjMiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgZmlsbD0idXJsKCNiZykiLz48cGF0aCBkPSJNMjggNzRjLTMtMzYgMTctNTIgMzItNTJzMzUgMTYgMzIgNTJjLTEgMTUtNyAyNy0xMSAzNEgzOWMtNC03LTEwLTE5LTExLTM0eiIgZmlsbD0idXJsKCNoYWlyKSIvPjxwYXRoIGQ9Ik0yMCAxMjBjMS0yMSAxNi0zMyA0MC0zNSAyNCAyIDM5IDE0IDQwIDM1eiIgZmlsbD0idXJsKCNjbG90aCkiLz48cGF0aCBkPSJNNTMgODRoMTR2MTVjMCA2LTE0IDYtMTQgMHoiIGZpbGw9IiNFNkIxODgiLz48ZWxsaXBzZSBjeD0iNjAiIGN5PSI2MyIgcng9IjIyIiByeT0iMjUiIGZpbGw9IiNGMkM3QTEiLz48cGF0aCBkPSJNMzggNjBjLTMtMjcgMTMtNDEgMjItNDFzMjUgMTQgMjIgNDFjLTYtMTctMTMtMjMtMjItMjNzLTE2IDYtMjIgMjN6IiBmaWxsPSJ1cmwoI2hhaXIpIi8+PHBhdGggZD0iTTM3IDU2Yy03IDgtOCAyNi00IDQyLTktMTItMTEtMzQgNC00OHoiIGZpbGw9InVybCgjaGFpcikiLz48cGF0aCBkPSJNODMgNTZjNyA4IDggMjYgNCA0MiA5LTEyIDExLTM0LTQtNDh6IiBmaWxsPSJ1cmwoI2hhaXIpIi8+PHBhdGggZD0iTTQ1IDU2YzMtMiA4LTIgMTEgMCIgc3Ryb2tlPSIjNEEzNTI4IiBzdHJva2Utd2lkdGg9IjEuNyIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PHBhdGggZD0iTTY0IDU2YzMtMiA4LTIgMTEgMCIgc3Ryb2tlPSIjNEEzNTI4IiBzdHJva2Utd2lkdGg9IjEuNyIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PGVsbGlwc2UgY3g9IjUwLjUiIGN5PSI2MyIgcng9IjIuNSIgcnk9IjMuMSIgZmlsbD0iIzNCMkExQyIvPjxlbGxpcHNlIGN4PSI2OS41IiBjeT0iNjMiIHJ4PSIyLjUiIHJ5PSIzLjEiIGZpbGw9IiMzQjJBMUMiLz48cGF0aCBkPSJNNjAgNjZ2NiIgc3Ryb2tlPSIjRDg5Rjc4IiBzdHJva2Utd2lkdGg9IjEuNyIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PGNpcmNsZSBjeD0iNDgiIGN5PSI3MSIgcj0iMy4yIiBmaWxsPSIjRjJBOThDIiBvcGFjaXR5PSIuNDUiLz48Y2lyY2xlIGN4PSI3MiIgY3k9IjcxIiByPSIzLjIiIGZpbGw9IiNGMkE5OEMiIG9wYWNpdHk9Ii40NSIvPjxwYXRoIGQ9Ik01NCA3NmMzLjUgMyA4LjUgMyAxMiAwIiBzdHJva2U9IiNDODZGNkEiIHN0cm9rZS13aWR0aD0iMi42IiBmaWxsPSJub25lIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48L3N2Zz4=';
  const avatar = (cls) => { const p = S().profile; const src = (p.photo && /^data:image\//.test(p.photo)) ? p.photo : PHOTO; return `<img class="avatar-img ${cls || ''}" src="${esc(src)}" alt="Profile photo">`; };
  HM.avatar = avatar;
  HM.acts.zoomPhoto = (el) => {
    const im = el && el.querySelector ? (el.matches('img') ? el : el.querySelector('img.avatar-img')) : null; if (!im) return;
    const o = document.createElement('div'); o.className = 'pz'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-label', 'Profile photo');
    o.innerHTML = '<img alt="Profile photo"><button class="pz-x" aria-label="Close">\u00d7</button>'; o.querySelector('img').src = im.src;
    const close = () => { o.remove(); document.removeEventListener('keydown', k); }; const k = (e) => { if (e.key === 'Escape') close(); };
    o.addEventListener('click', close); document.addEventListener('keydown', k); document.body.appendChild(o);
  };
  document.addEventListener('click', (e) => { const im = e.target.closest && e.target.closest('.prof-card img.avatar-img'); if (im) { e.preventDefault(); e.stopPropagation(); HM.acts.zoomPhoto(im); } }, true);

  /* ---------- landing ---------- */
  HM.route('/more', 'more', () => {
    const p = S().profile; const name = [p.first, p.last].filter(Boolean).join(' ') || 'Customer';
    const g = (title, rows) => ui.section(title, '', `<div class="group">${rows.map((r) => ui.row({ icon: r[0], title: r[1], sub: r[2], go: r[3], act: r[4], tone: r[5] })).join('')}</div>`);
    return {
      title: 'More',
      html: `${ui.header('More', { back: false, sub: 'Profile, security and services' })}
      <div class="pad"><button class="card prof-card" data-go="/more/profile">${avatar('lg')}<span class="row-m"><b>${esc(name)}</b><small>${p.email ? esc(p.email) : 'Add your contact details'}</small></span><span class="row-c">${icon('chevR', 18)}</span></button></div>
      ${g('Profile & security', [['user', 'Profile', 'Name, contact & address', '/more/profile'], ['shield', 'Security settings', 'Password, Face ID, devices', '/more/security'], ['bell', 'Notifications', 'Push & email preferences', '/more/notifications'], ['globe', 'Language & region', 'Language, currency, time zone', '/more/language'], ['sliders', 'App preferences', 'Display & device', '/more/prefs']])}
      ${g('Accounts & money', [['bank', 'Account details', 'Account & routing numbers', '/more/account-details'], ['file', 'Statements', 'Monthly records', '/accounts/statements'], ['file', 'Tax documents', 'Annual summaries', '/more/tax'], ['chart', 'Spending insights', 'Where your money goes', '/accounts/spending'], ['target', 'Savings goals', 'Plan and track', '/accounts/goals'], ['users', 'Beneficiaries', 'Saved recipients', '/payments/beneficiaries'], ['calendar', 'Scheduled payments', 'Upcoming and recurring', '/payments/scheduled'], ['zap', 'Limits', 'Daily payment limits', '/payments/limits'], ['book', 'Account documents', 'Agreements & forms', '/accounts/documents']])}
      ${g('Products & services', [['bank', 'Open an account', 'Savings, CDs, checking', '/more/open-account'], ['car', 'Loans & credit', 'Auto, home and cards', '/more/loans'], ['wallet', 'Linked services', 'Wallets & external accounts', '/more/linked'], ['file', 'Paperless & documents', 'Statements, tax, notices', '/more/paperless'], ['bulb', 'Learn', 'Money tips & guides', '/more/learn']])}
      ${g('Rewards & tools', [['star', 'Harbor Rewards', 'Points & tiers', '/more/rewards'], ['zap', 'Offers', 'Activate bonus offers', '/more/offers'], ['users', 'Refer a friend', 'Share your code', '/more/refer'], ['calendar', 'Calculators', 'Loan & savings', '/more/tools'], ['globe', 'Exchange rates', 'Major currencies', '/more/tools/rates'], ['receipt', 'Rates & fees', 'Account pricing', '/more/fees']])}
      ${g('Safety & help', [['shield', 'Security center', 'Stay safe & report fraud', '/more/security-center'], ['phone', 'Contact us', 'Call, message or visit', '/more/contact'], ['help', 'Customer support', 'Contact, help center, requests', '/more/support'], ['msg', 'Send feedback', 'Tell us how we are doing', '/more/feedback'], ['msg', 'Support request history', 'Track your requests', '/more/support/requests'], ['atm', 'Find an ATM', 'Nearby locations', '/more/atm'], ['building', 'Find a branch', 'Nearby locations', '/more/branches']])}
      <div class="pad mt2"><button class="btn btn-ghost" data-act="signOut">${icon('logout', 20)} Sign out</button></div><p class="footnote">Westmark Mobile 1.0</p>`
    };
  });

  /* ---------- profile ---------- */
  HM.route('/more/profile', 'more', () => {
    const p = S().profile, a = p.address; const addr = [a.line1, a.line2, [a.city, a.state].filter(Boolean).join(', '), a.zip].filter(Boolean).join('<br>');
    return {
      title: 'Profile',
      html: `${ui.header('Profile', { back: '/more', right: `<button class="iconbtn" data-go="/more/profile/edit" aria-label="Edit profile">${icon('edit', 20)}</button>` })}<div class="pad"><div class="card center">${avatar('xl')}<h2 class="mt">${esc(p.preferred || p.first)}</h2><div class="sm mute">${esc(HM.holder())}</div></div>
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
    const sc = S().security; const pw = sc.pwChanged ? 'Changed ' + HM.fmtDate(sc.pwChanged) : 'Last changed: never';
    return {
      title: 'Security',
      html: `${ui.header('Security settings', { back: '/more' })}<div class="pad"><div class="card sec-score"><span class="row-i green">${icon('shield', 22)}</span><span class="row-m"><b>Your account is protected</b><small>Email verification code on every sign-in</small></span></div></div>
      ${ui.section('Sign-in', '', `<div class="group">${ui.row({ icon: 'key', title: 'Change password', sub: pw, go: '/more/security/password' })}${ui.row({ icon: 'face', title: 'Biometric sign-in', sub: 'Available when securely enrolled on a supported device', noChev: true })}</div>`)}
      ${ui.section('Devices & sessions', '', `<div class="group">${ui.row({ icon: 'device', title: 'Trusted devices', sub: sc.devices.length + ' devices', go: '/more/security/devices' })}${ui.row({ icon: 'clock', title: 'Login history', sub: 'Recent sign-ins', go: '/more/security/history' })}${ui.row({ icon: 'users', title: 'Session management', sub: 'Auto sign-out: ' + sc.sessionTimeout + ' min', go: '/more/security/sessions' })}</div>`)}
      ${ui.section('Alerts', '', `<div class="group">${ui.row({ icon: 'bell', title: 'Security alerts', sub: 'New devices, password changes, large payments', go: '/more/security/alerts' })}</div>`)}`
    };
  });
  HM.acts.secToggle = (b, k) => { const sc = S().security; sc[k] = !sc[k]; HM.save(); HM.refresh(true); };
  HM.route('/more/security/password', 'more', () => ({
    title: 'Change password',
    html: `${ui.header('Change password', { back: '/more/security' })}<div class="pad"><div class="note warn">${icon('info', 18)}<span><b>Note:</b> your sign-in password is set by the app owner in the <b>HM_LOGIN_PASSWORD</b> Vercel variable. This form shows the full experience and validates input, but it can’t change that variable.</span></div>
    <form data-form="pw" novalidate>${ui.field({ name: 'cur', label: 'Current password', type: 'password', autocomplete: 'current-password' })}${ui.field({ name: 'n1', label: 'New password', type: 'password', autocomplete: 'new-password', hint: 'At least 10 characters with upper & lower case, a number and a symbol.' })}${ui.field({ name: 'n2', label: 'Confirm new password', type: 'password', autocomplete: 'new-password' })}<button class="btn btn-primary mt2" type="submit">Update password</button></form></div>`
  }));
  HM.forms.pw = (f, d) => {
    if (!d.cur) return ui.fail(f, 'Enter your current password.', 'cur'); const n = d.n1 || '';
    if (n.length < 10) return ui.fail(f, 'Use at least 10 characters.', 'n1'); if (!/[a-z]/.test(n) || !/[A-Z]/.test(n)) return ui.fail(f, 'Include both upper and lower case letters.', 'n1'); if (!/\d/.test(n)) return ui.fail(f, 'Include at least one number.', 'n1'); if (!/[^A-Za-z0-9]/.test(n)) return ui.fail(f, 'Include at least one symbol, like ! or #.', 'n1');
    if (n === d.cur) return ui.fail(f, 'Your new password must be different.', 'n1'); if (n !== d.n2) return ui.fail(f, 'The passwords don’t match.', 'n2');
    S().security.pwChanged = new Date().toISOString(); HM.notify('security', 'Password changed', 'Your password was updated. Sign-in credentials are managed by the app owner.'); HM.save(); ui.toast('Password updated'); HM.back('/more/security');
  };
  HM.route('/more/security/faceid', 'more', () => ({
    title: 'Biometric sign-in',
    html: `${ui.header('Biometric sign-in', { back: '/more/security' })}<div class="pad center"><div class="faceid" id="fid"><div class="scan"></div>${icon('face', 90)}</div><h2 id="fidT">Face ID</h2><p class="mute" id="fidS">Turn on Face ID to sign in without typing your password. Your face data stays on your device.</p>
    <div class="btns"><button class="btn btn-primary" id="fidGo" data-act="faceRun">${HM.bio.on() ? 'Face ID is on' : 'Turn on Face ID'}</button>${HM.bio.on() ? '<button class="btn btn-ghost" data-act="faceOff">Remove Face ID</button>' : ''}</div></div>`
  }));
  HM.acts.faceRun = async () => { if (HM.bio.on()) return ui.toast('Face ID is on'); const em = (HM.session.get() || {}).email || S().profile.email || ''; await HM.bio.enroll(em, true); if (HM.bio.on()) { S().security.faceId = true; HM.save(); ui.toast('Face ID turned on'); HM.refresh(true); } else ui.toast('Face ID could not be turned on on this device', 'err'); };
  HM.acts.faceOff = () => { try { localStorage.removeItem('hm_bio'); } catch (e) { /* ignore */ } S().security.faceId = false; HM.save(); ui.toast('Face ID removed'); HM.refresh(true); };
  HM.route('/more/security/devices', 'more', () => ({
    title: 'Trusted devices',
    html: `${ui.header('Trusted devices', { back: '/more/security' })}<div class="pad"><div class="group">${S().security.devices.map((d) => ui.row({ icon: 'device', tone: d.current ? 'green' : '', title: d.name + (d.current ? ' (this device)' : ''), sub: d.model + ' · last used ' + HM.fmtDate(d.last), act: d.current ? '' : 'devRemove', arg: d.id, right: d.current ? '' : '<span class="lnk">Remove</span>', noChev: true })).join('')}</div><div class="note">${icon('info', 18)}<span>Removing a device means it will need email verification the next time it signs in.</span></div></div>`
  }));
  HM.acts.devRemove = async (b, id) => { const d = S().security.devices.find((x) => x.id === id); if (await ui.confirm({ title: 'Remove ' + d.name + '?', body: 'It will no longer be trusted.', ok: 'Remove', danger: true })) { S().security.devices = S().security.devices.filter((x) => x.id !== id); HM.save(); HM.refresh(true); ui.toast('Device removed'); } };
  HM.route('/more/security/history', 'more', () => ({
    title: 'Login history',
    html: `${ui.header('Login history', { back: '/more/security' })}<div class="pad"><div class="group">${S().security.logins.map((l) => ui.row({ icon: l.ok ? 'check' : 'x', tone: l.ok ? 'green' : 'red', title: l.ok ? 'Successful sign-in' : 'Failed sign-in', sub: HM.fmtDT(l.date) + ' · ' + l.device + ' · ' + l.loc, noChev: true })).join('')}</div><p class="footnote">Location details are not collected by this application.</p></div>`
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
  HM.acts.otherSessions = async () => { if (await ui.confirm({ title: 'Sign out other sessions?', body: 'Other signed-in browsers and devices will be removed from your trusted devices.', ok: 'Sign out others' })) { S().security.devices = S().security.devices.filter((d) => d.current); HM.save(); ui.toast('Other sessions signed out'); } };

  /* ---------- notifications preferences ---------- */
  HM.route('/more/notifications', 'more', () => {
    const n = S().prefs.notif; const rows = [['tx', 'Transaction notifications', 'Purchases, deposits and transfers'], ['pay', 'Payment notifications', 'ACH, wires, checks and bills'], ['dep', 'Deposit notifications', 'Check deposit status'], ['sec', 'Security alerts', 'Sign-ins and account changes']];
    return { title: 'Notification preferences', html: `${ui.header('Notifications', { back: '/more' })}<div class="pad"><div class="note">${icon('info', 18)}<span>preferences are saved, but no real push notifications or emails are sent (except the sign-in code).</span></div>${rows.map((r) => `<div class="lbl mt2">${r[1]}</div><div class="group mt">${ui.toggle({ title: 'Push notifications', sub: r[2], on: n[r[0]].push, act: 'notifPref', arg: r[0] + ':push' })}${ui.toggle({ title: 'Email notifications', on: n[r[0]].email, act: 'notifPref', arg: r[0] + ':email' })}</div>`).join('')}</div>` };
  });
  HM.acts.notifPref = (b, arg) => { const [k, ch] = arg.split(':'); const n = S().prefs.notif; if (k === 'sec' && ch === 'push' && n.sec.push) { return ui.confirm({ title: 'Turn off security push alerts?', body: 'We recommend keeping these on so you hear about sign-ins right away.', ok: 'Turn off', danger: true }).then((ok) => { if (ok) { n.sec.push = false; HM.save(); HM.refresh(true); } }); } n[k][ch] = !n[k][ch]; HM.save(); HM.refresh(true); };

  /* ---------- support ---------- */
  const FAQ = [
    ['How do I freeze my account?', 'Go to Accounts, choose the account and open Account controls, then tap Freeze account. Outgoing payments, wires, checks, bills, transfers and withdrawals are blocked until you unfreeze it. Deposits are still accepted.'],
    ['How long do transfers take?', 'Zelle arrives in minutes, domestic transfers settle in 1–2 business days, and wires are same-day. The processing time is shown before you confirm each payment.'],
    ['What are my daily limits?', 'Limits apply per method (Zelle, domestic transfer, wire, check, withdrawal, deposit) and to all payments combined. See Payments › Daily limits, where you can also change them for testing.'],
    ['How do I add a beneficiary?', 'Open Payments › Beneficiaries and tap +. You’ll need a valid 9-digit ABA routing number and an account number.'],
    ['How do I deposit a check?', 'Accounts › Deposit Check (or the Home shortcut). Enter the amount, date and payer, capture the front and back, review and submit. Funds are pending until reviewed.'],
    ['Is my information safe?', 'Your app data is stored on this device and protected by email verification at sign-in. Never share your password, PIN or one-time code with anyone.'],
    ['I didn’t get my verification code', 'Wait for the 30-second timer, then tap Resend code. Check spam. If email isn’t configured, ask the app owner to follow the email setup in the README.']
  ];
  HM.route('/more/support', 'more', () => ({
    title: 'Customer support',
    html: `${ui.header('Customer support', { back: '/more', sub: 'We’re here to help' })}
    ${ui.section('Contact us', '', `<div class="group">${ui.row({ icon: 'phone', title: 'Call support', sub: '1-800-555-0100', noChev: true, act: 'copyTxt', arg: '1-800-555-0100|Phone number' })}${ui.row({ icon: 'msg', title: 'Send a support request', sub: 'We reply within 1 business day', go: '/more/support/new' })}${ui.row({ icon: 'mail', title: 'Email', sub: 'support@westmark.example', noChev: true, act: 'copyTxt', arg: 'support@westmark.example|Email address' })}</div>`)}
    ${ui.section('Get help', '', `<div class="group">${ui.row({ icon: 'book', title: 'Help center', sub: 'Guides by topic', go: '/more/support/help' })}${ui.row({ icon: 'help', title: 'Frequently asked questions', go: '/more/support/faq' })}${ui.row({ icon: 'clock', title: 'Support request history', sub: S().support.length + ' request' + (S().support.length === 1 ? '' : 's'), go: '/more/support/requests' })}${ui.row({ icon: 'info', title: 'Customer service information', sub: 'Hours & addresses', go: '/more/support/info' })}</div>`)}
    `
  }));
  HM.route('/more/support/faq', 'more', () => ({ title: 'FAQ', html: `${ui.header('Frequently asked questions', { back: '/more/support' })}<div class="pad"><div class="group faq">${FAQ.map((q) => `<details><summary>${esc(q[0])}${icon('chevD', 18)}</summary><p>${esc(q[1])}</p></details>`).join('')}</div></div>` }));
  const HELP = [['Accounts', 'bank', ['Reading your balances: current vs available', 'Freezing and unfreezing an account', 'Changing an account nickname']], ['Payments', 'send', ['Sending with Zelle', 'Wire transfer requirements', 'Scheduling and cancelling payments']], ['Cards', 'card', ['Locking your card', 'Setting spending limits', 'Using your virtual card']], ['Security', 'shield', ['Email verification codes', 'Trusted devices', 'Spotting scams']]];
  HM.route('/more/support/help', 'more', () => ({ title: 'Help center', html: `${ui.header('Help center', { back: '/more/support' })}<div class="pad">${HELP.map((h) => `<div class="lbl mt2">${h[0]}</div><div class="group mt">${h[2].map((a) => ui.row({ icon: h[1], title: a, act: 'helpOpen', arg: a })).join('')}</div>`).join('')}</div>` }));
  HM.acts.helpOpen = (b, a) => ui.sheet(`<h3 class="sh-title">${esc(a)}</h3><p class="sh-body">Find step-by-step guidance for “${esc(a.toLowerCase())}” in the help centre FAQ, or send a support request and our team will reply.</p><div class="sh-actions"><button class="btn btn-primary" data-go="/more/support/faq">Open FAQ</button><button class="btn btn-ghost" data-act="closeSheet">Close</button></div>`);
  HM.route('/more/support/info', 'more', () => ({ title: 'Service info', html: `${ui.header('Customer service', { back: '/more/support' })}<div class="pad"><div class="card"><div class="kv"><span>Phone support</span><b>Mon–Fri 8am–8pm ET<br>Sat 9am–5pm ET</b></div><div class="kv"><span>Lost or stolen cards</span><b>24 / 7</b></div><div class="kv"><span>Mailing address</span><b>Westmark Bank<br>100 Harbor Way<br>Seattle, WA</b></div><div class="kv"><span>Response time</span><b>1 business day</b></div></div></div>` }));
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
    return { title: r.ref, html: `${ui.header(r.ref, { back: '/more/support/requests', sub: r.category })}<div class="pad"><div class="card"><div class="between sp"><b>${esc(r.subject)}</b>${ui.badge(r.status)}</div><p class="mute sm mt">${HM.fmtDT(r.date)}</p><div class="hr"></div><p>${esc(r.message)}</p></div>${ui.section('Progress', '', `<div class="card">${`<ul class="tlist"><li><i>✓</i><div><b>Request received</b><small>${HM.fmtDT(r.date)}</small></div></li><li class="${r.status === 'Resolved' ? '' : 'now'}"><i>${r.status === 'Resolved' ? '✓' : '●'}</i><div><b>${r.status === 'Resolved' ? 'Resolved' : 'With a specialist'}</b><small>${r.status === 'Resolved' ? 'Closed' : 'replies are not sent'}</small></div></li></ul>`}</div>`)}</div>` };
  });

  /* ---------- ATM & branches (demonstration content) ---------- */
  const PLACES = [
    ['Westmark Main Branch', 'branch', '100 Harbor Way, Seattle, WA', '0.4 mi', 'Mon–Fri 9–5 · Sat 9–1', false], ['Westmark Market Square', 'branch', '22 Market Square, Seattle, WA', '1.2 mi', 'Mon–Sat 9–6', false], ['Westmark Riverside', 'branch', '480 River Rd, Riverside', '3.1 mi', 'Mon–Fri 9–5', false],
    ['Westmark ATM · Main Branch', 'atm', '100 Harbor Way', '0.4 mi', '24 hours', true], ['Westmark ATM · Central Station', 'atm', '5 Station Plaza', '0.9 mi', '24 hours', true], ['Westmark ATM · Fresh Market', 'atm', '31 Grove Ave', '1.5 mi', 'Daily 6am–11pm', false], ['Westmark ATM · Campus Center', 'atm', '900 College Blvd', '2.4 mi', '24 hours', true]
  ];
  let pf = { q: '', f: 'all' };
  HM.acts.placeQ = (b, a) => { pf.q = a.slice(2); HM.refresh(true); }; HM.acts.placeF = (b, a) => { pf.f = a; HM.refresh(true); };
  const placesPage = (kind) => { const list = PLACES.filter((p) => p[1] === kind && (!pf.q || (p[0] + p[2]).toLowerCase().includes(pf.q.toLowerCase())) && (pf.f === 'all' || (pf.f === '24' && p[5]))); return { title: kind === 'atm' ? 'Find an ATM' : 'Find a branch', html: `${ui.header(kind === 'atm' ? 'Find an ATM' : 'Find a branch', { back: '/more' })}<div class="pad"><div class="searchbar mt">${icon('search', 18)}<input type="search" placeholder="Search by name or street" value="${esc(pf.q)}" data-live="placeQ" data-key="q" aria-label="Search locations"></div><div class="chips"><button class="chip ${pf.f === 'all' ? 'on' : ''}" data-act="placeF" data-arg="all">All</button><button class="chip ${pf.f === '24' ? 'on' : ''}" data-act="placeF" data-arg="24">Open 24 hours</button></div>${list.length ? `<div class="group">${list.map((p) => ui.row({ icon: kind === 'atm' ? 'atm' : 'building', title: p[0], sub: p[2] + ' · ' + p[4], right: p[3], act: 'placeOpen', arg: p[0] })).join('')}</div>` : ui.card(ui.empty('pin', 'No locations found', 'Try a different search.'))}</div>` }; };
  HM.route('/more/atm', 'more', () => { pf = pf.k === 'atm' ? pf : { q: '', f: 'all', k: 'atm' }; return placesPage('atm'); });
  HM.route('/more/branches', 'more', () => { pf = pf.k === 'branch' ? pf : { q: '', f: 'all', k: 'branch' }; return placesPage('branch'); });
  HM.acts.placeOpen = (b, n) => { const p = PLACES.find((x) => x[0] === n); ui.sheet(`<h3 class="sh-title">${esc(p[0])}</h3><p class="sh-body">${esc(p[2])}<br>${esc(p[4])} · ${p[3]} away</p><div class="sh-actions"><button class="btn btn-ghost" data-act="closeSheet">Close</button></div>`); };

  /* ---------- legal ---------- */
  const LEGAL = {
    privacy: ['Privacy policy', [['Overview', 'Westmark Mobile is a school project and Westmark Bank is a fictional bank. This policy explains, in plain language, how the app handles information.'], ['What stays on your device', 'Balances, transactions, beneficiaries, settings and your optional profile photo are stored only in your browser’s local storage. Clearing site data or using “Reset app data” removes them.'], ['What is sent to a server', 'Only your sign-in email and password (to check your credentials) and the one-time code request/verification. The password is compared on the server and never stored by the app.'], ['What is never collected', 'No real card numbers, CVVs, PINs, bank credentials, camera images or biometric data are collected or stored.'], ['Contact', 'Questions? Use More › Customer support.']]],
    terms: ['Terms & conditions', [['Educational use', 'Westmark Mobile is provided for educational use. It is not a bank, does not hold money and offers no financial products.'], ['Simulated activity', 'All balances, payments, deposits, receipts and statements are simulated. Receipts are not proof of payment.'], ['Acceptable use', 'Do not enter real account, card or identity information. Do not present receipts or statements as real records.'], ['No warranty', 'The app is provided as is. Features may change or reset at any time.']]]
  };
  HM.LEGAL = LEGAL;
  const legal = (k) => ({ title: LEGAL[k][0], html: `${ui.header(LEGAL[k][0], { back: '/more', sub: 'Effective ' + HM.fmtDate(new Date()) })}<div class="pad"><div class="card doc">${LEGAL[k][1].map((s) => `<h3>${esc(s[0])}</h3><p>${esc(s[1])}</p>`).join('')}</div></div>` });

  /* ---------- preferences & about ---------- */
  const installSteps = `<ol class="steps"><li>Open this site in <b>Safari</b> on your iPhone.</li><li>Tap the <b>Share</b> button (square with an up arrow).</li><li>Scroll and tap <b>Add to Home Screen</b>.</li><li>Tap <b>Add</b>. Open Westmark from your Home Screen.</li></ol><p class="hint">On Android Chrome: menu (⋮) › Install app / Add to Home screen.</p>`;
  HM.route('/more/prefs', 'more', () => ({
    title: 'App preferences',
    html: `${ui.header('App preferences', { back: '/more' })}<div class="pad"><div class="group">${ui.toggle({ title: 'Hide balances', sub: 'Mask balances on Home and Accounts', on: S().prefs.hideBalance, act: 'toggleHide2' })}${ui.row({ icon: 'globe', title: 'Currency', right: 'USD ($)', noChev: true })}${ui.row({ icon: 'bell', title: 'Notification preferences', go: '/more/notifications' })}</div>
    ${ui.section('Add to Home Screen', '', `<div class="card">${installSteps}</div>`)}
    ${ui.section('Device', '', `<div class="card"><p class="sm mute">Manage this device's saved sign-in preference.</p><button class="btn btn-ghost mt" data-act="forgetDevice">Forget remembered device</button></div>`)}</div>`
  }));
  HM.acts.toggleHide2 = () => { S().prefs.hideBalance = !S().prefs.hideBalance; HM.save(); HM.refresh(true); };
  HM.acts.forgetDevice = () => { try { localStorage.removeItem('hm_remember'); } catch (e) { /* ignore */ } ui.toast('This device will no longer pre-fill your email'); };
  HM.acts.resetDemo = async () => { if (await ui.confirm({ title: 'Reset all app data?', body: 'Balances, transactions, beneficiaries, scheduled payments, goals, cards and settings return to their starting values. Your profile is also cleared.', ok: 'Reset app data', danger: true })) { HM.reset(); HM.stack = []; ui.toast('App data reset'); HM.go('/home'); } };
})();


/* Westmark Mobile — appearance, extended menus and public pages */
(function () {
  'use strict';
  const HM = window.HM, ui = HM.ui, esc = HM.esc, icon = HM.icon, money = HM.money, S = () => HM.state();

  /* ---------- Neumorphic Dark / Light (dark by default, choice is saved) ---------- */
  const modeGet = () => { try { return localStorage.getItem('hm_mode') === 'light' ? 'light' : 'dark'; } catch (e) { return 'dark'; } };
  HM.applyTheme = () => { const m = 'light'; document.documentElement.setAttribute('data-theme', m); const c = '#7C1606'; document.querySelectorAll('meta[name="theme-color"]').forEach((x) => x.setAttribute('content', c)); document.querySelectorAll('.thm').forEach((x) => x.setAttribute('aria-checked', m === 'dark' ? 'true' : 'false')); };
  HM.themeBtn = () => `<button type="button" class="thm" role="switch" aria-checked="${modeGet() === 'dark'}" aria-label="Dark mode" data-act="toggleTheme"><span class="thm-s">${icon('sun', 14)}</span><span class="thm-m">${icon('moon', 14)}</span><i></i></button>`;
  HM.acts.toggleTheme = () => { try { localStorage.setItem('hm_mode', modeGet() === 'dark' ? 'light' : 'dark'); } catch (e) { /* ignore */ } HM.applyTheme(); };
  HM.applyTheme();

  /* ---------- helpers ---------- */
  const group = (rows) => `<div class="group">${rows.map((r) => ui.row({ icon: r[0], title: r[1], sub: r[2], go: r[3], act: r[4], arg: r[5] })).join('')}</div>`;
  const tiles = (arr) => `<div class="tiles">${arr.map((t) => `<button class="tile" data-go="${t[3]}"><span class="row-i gold">${icon(t[0], 20)}</span><b>${esc(t[1])}</b><small>${esc(t[2])}</small></button>`).join('')}</div>`;
  const info = (title, back, secs, tab) => ({ title, html: `${ui.header(title, { back })}<div class="pad"><div class="card doc">${secs.map((s) => `<h3>${esc(s[0])}</h3><p>${esc(s[1])}</p>`).join('')}</div></div>` });
  const pageRoute = (path, title, back, fn) => HM.route(path, 'more', () => ({ title, html: `${ui.header(title, { back })}<div class="pad">${fn()}</div>` }));
  const spent = () => S().txs.filter((t) => t.amount < 0 && t.status === 'completed').reduce((a, t) => a + Math.abs(t.amount), 0);

  /* ---------- account & money ---------- */
  pageRoute('/more/account-details', 'Account details', '/more', () => `${S().accounts.map((a) => `<div class="card"><div class="between sp"><b>${esc(a.nickname)}</b>${ui.badge(a.status)}</div>
    <div class="kv"><span>Account type</span><b>${esc(a.name)}</b></div><div class="kv"><span>Account number</span><b>${esc(a.number)}</b></div><div class="kv"><span>Routing number</span><b>${esc(a.routing)}</b></div><div class="kv"><span>Opened</span><b>${HM.fmtDate ? HM.fmtDate(a.opened) : esc(a.opened)}</b></div>
    <div class="btns two mt"><button class="btn btn-ghost btn-sm" data-act="copyTxt" data-arg="${esc(a.number)}">${icon('copy', 16)} Account no.</button><button class="btn btn-ghost btn-sm" data-act="copyTxt" data-arg="${esc(a.routing)}">${icon('copy', 16)} Routing no.</button></div></div>`).join('')}`);
  HM.route('/more/tax', 'more', () => { const y = new Date().getFullYear(); return { title: 'Tax documents', html: `${ui.header('Tax documents', { back: '/more' })}<div class="pad">${ui.section('Available', '', group([['file', y - 1 + ' interest summary', 'Savings interest earned', '/accounts/documents'], ['file', y - 1 + ' account summary', 'Balances and activity', '/accounts/statements'], ['file', 'Account agreements', 'Terms for each account', '/accounts/documents']]))}<p class="hint">Tax forms appear here once they are ready for a tax year.</p></div>` }; });
  HM.route('/more/rewards', 'more', () => { const pts = Math.round(spent()); const tier = pts > 40000 ? 'Gold' : pts > 15000 ? 'Silver' : 'Standard'; return { title: 'Harbor Rewards', html: `${ui.header('Harbor Rewards', { back: '/more' })}<div class="pad"><div class="card hero-card"><div class="lbl on-dark">Points balance</div><div class="big">${pts.toLocaleString('en-US')}</div><div class="on-dark-2 sm">${tier} tier · 1 point per $1 spent with your debit card</div></div>
    ${ui.section('Ways to earn', '', group([['card', 'Card purchases', '1 point per $1', '/cards'], ['users', 'Refer a friend', '2,500 points per referral', '/more/refer'], ['star', 'Offers', 'Bonus points at partners', '/more/offers']]))}</div>` }; });
  HM.route('/more/offers', 'more', () => ({ title: 'Offers', html: `${ui.header('Offers', { back: '/more' })}<div class="pad">${[['cart', 'Groceries', '5% back in points at selected grocers', 'Valid this month'], ['cup', 'Dining', '3x points at restaurants and cafes', 'Valid this quarter'], ['plane', 'Travel', '2x points on flights and hotels', 'Valid this year'], ['car', 'Fuel', '4% back in points at fuel stations', 'Valid this month']].map((o) => `<div class="card"><div class="sp"><span class="row-i gold">${icon(o[0], 20)}</span><div class="row-m"><b>${o[1]}</b><small>${o[2]}</small><small>${o[3]}</small></div></div><button class="btn btn-ghost btn-sm mt" data-act="offerOn" data-arg="${o[1]}">Activate offer</button></div>`).join('')}</div>` }));
  HM.acts.offerOn = (b, n) => { ui.toast(n + ' offer activated'); b.textContent = 'Activated'; b.disabled = true; };
  HM.route('/more/refer', 'more', () => ({ title: 'Refer a friend', html: `${ui.header('Refer a friend', { back: '/more' })}<div class="pad"><div class="card center"><div class="okring">${icon('users', 34)}</div><h2>Give 2,500 points, get 2,500 points</h2><p class="mute">Share your code with friends who open an account.</p><div class="devcode mt">HARBOR-JB088</div><button class="btn btn-primary mt" data-act="copyTxt" data-arg="HARBOR-JB088">${icon('copy', 18)} Copy code</button></div></div>` }));

  /* ---------- tools ---------- */
  HM.route('/more/tools', 'more', () => ({ title: 'Tools', html: `${ui.header('Tools & calculators', { back: '/more' })}<div class="pad">${tiles([['calendar', 'Loan calculator', 'Estimate payments', '/more/tools/loan'], ['target', 'Savings calculator', 'Project your growth', '/more/tools/savings'], ['globe', 'Exchange rates', 'Major currencies', '/more/tools/rates'], ['receipt', 'Rates & fees', 'Account pricing', '/more/fees']])}</div>` }));
  const calc = (path, title, fields, fn, unit) => HM.route(path, 'more', () => ({ title, html: `${ui.header(title, { back: '/more/tools' })}<div class="pad"><div class="card"><form data-form="noop" novalidate>${fields.map((f) => ui.field({ name: f[0], label: f[1], type: 'text', inputmode: 'decimal', value: f[2] })).join('')}</form></div><div class="card center"><div class="lbl">${unit}</div><div class="big" id="calcOut">—</div><div class="sm mute" id="calcSub"></div></div></div>`,
    after() { const run = () => { const v = {}; fields.forEach((f) => { const el = document.querySelector(`#view [name="${f[0]}"]`); v[f[0]] = parseFloat(String(el && el.value).replace(/,/g, '')) || 0; }); const r = fn(v); document.getElementById('calcOut').textContent = r[0]; document.getElementById('calcSub').textContent = r[1]; }; document.querySelectorAll('#view form input').forEach((i) => i.addEventListener('input', run)); run(); } }));
  HM.forms.noop = () => {};
  calc('/more/tools/loan', 'Loan calculator', [['amt', 'Loan amount ($)', '15000'], ['apr', 'Annual interest rate (%)', '7.5'], ['mo', 'Term (months)', '48']], (v) => { const r = v.apr / 1200, n = Math.max(1, v.mo); const p = r ? v.amt * r / (1 - Math.pow(1 + r, -n)) : v.amt / n; return [money(p), 'Total interest ' + money(p * n - v.amt)]; }, 'Estimated monthly payment');
  calc('/more/tools/savings', 'Savings calculator', [['init', 'Starting balance ($)', '5000'], ['add', 'Monthly deposit ($)', '250'], ['apr', 'Annual rate (%)', '4.0'], ['yr', 'Years', '5']], (v) => { const r = v.apr / 1200, n = Math.round(v.yr * 12); let b = v.init; for (let i = 0; i < n; i++) b = b * (1 + r) + v.add; const put = v.init + v.add * n; return [money(b), 'Interest earned ' + money(b - put)]; }, 'Projected balance');
  HM.route('/more/tools/rates', 'more', () => ({ title: 'Exchange rates', html: `${ui.header('Exchange rates', { back: '/more/tools' })}<div class="pad"><div class="group">${[['EUR', 'Euro', '0.92'], ['GBP', 'British pound', '0.79'], ['CAD', 'Canadian dollar', '1.37'], ['JPY', 'Japanese yen', '151.20'], ['CHF', 'Swiss franc', '0.88'], ['AUD', 'Australian dollar', '1.52'], ['MXN', 'Mexican peso', '17.10'], ['NGN', 'Nigerian naira', '1,520']].map((r) => ui.row({ icon: 'globe', title: r[0] + ' · ' + r[1], right: '<b>' + r[2] + '</b>', noChev: true, sub: '1 USD' })).join('')}</div><p class="hint mt">Indicative rates for reference.</p></div>` }));
  HM.route('/more/fees', 'more', () => ({ title: 'Rates & fees', html: `${ui.header('Rates & fees', { back: '/more/tools' })}<div class="pad"><div class="card">${[['Monthly maintenance', '$0.00'], ['Debit card replacement', '$0.00'], ['Outgoing domestic wire', '$25.00'], ['Incoming wire', '$0.00'], ['Instant transfer', '$0.00'], ['Out-of-network ATM', '$0.00'], ['Savings APY', '4.00%']].map((r) => `<div class="kv"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('')}</div></div>` }));

  /* ---------- help & safety ---------- */
  HM.route('/more/security-center', 'more', () => ({ title: 'Security center', html: `${ui.header('Security center', { back: '/more' })}<div class="pad">${ui.section('Protect your account', '', group([['key', 'Change password', 'Use a long, unique password', '/more/security/password'], ['fingerprint', 'Face ID', 'Sign in with biometrics', '/more/security/faceid'], ['device', 'Trusted devices', 'Review where you are signed in', '/more/security/devices'], ['clock', 'Sign-in history', 'Recent activity on your profile', '/more/security/history'], ['bell', 'Security alerts', 'Get notified of changes', '/more/security/alerts']]))}${ui.section('Stay safe', '', `<div class="card doc"><h3>We never ask for your PIN or full password</h3><p>Westmark will never call, text or email to ask for your PIN, password or one-time code.</p><h3>Use the one-time code only in this app</h3><p>Never read a verification code out to anyone, even if they say they are from the bank.</p><h3>Report anything suspicious</h3><p>If something looks wrong, lock your card and contact support straight away.</p></div>`)}<button class="btn btn-ghost mt" data-go="/more/fraud">${icon('alert', 18)} Report suspicious activity</button></div>` }));
  HM.route('/more/fraud', 'more', () => ({ title: 'Report fraud', html: `${ui.header('Report suspicious activity', { back: '/more/security-center' })}<div class="pad"><div class="card"><form data-form="fraud" novalidate>${ui.select({ name: 'kind', label: 'What happened?', value: 'txn', options: [['txn', 'A transaction I do not recognise'], ['card', 'My card is lost or stolen'], ['phish', 'A suspicious call, text or email'], ['login', 'Someone accessed my account']] })}<div class="fld" data-fld="msg"><label for="f_msg">Details</label><textarea id="f_msg" name="msg" rows="4" style="height:auto;padding:12px 14px" placeholder="Tell us what you noticed"></textarea><p class="ferr" role="alert"></p></div><button class="btn btn-primary" type="submit">Submit report</button></form></div></div>` }));
  HM.forms.fraud = (f, d) => { if (!String(d.msg || '').trim()) return ui.fail(f, 'Please add a few details.', 'msg'); HM.notify('security', 'Report received', 'We received your report and our security team will review it.'); HM.save(); ui.toast('Report submitted'); HM.go('/more/security-center'); };

  /* ---------- Cards extras ---------- */
  HM.route('/cards/travel', 'cards', () => ({ title: 'Travel notice', html: `${ui.header('Travel notice', { back: '/cards' })}<div class="pad"><div class="card"><form data-form="travel" novalidate>${ui.field({ name: 'dest', label: 'Destination', placeholder: 'Country or city' })}<div class="two">${ui.field({ name: 'from', label: 'From', type: 'date' })}${ui.field({ name: 'to', label: 'To', type: 'date' })}</div><button class="btn btn-primary" type="submit">Add travel notice</button></form></div>${(S().travel || []).length ? ui.section('Active notices', '', `<div class="group">${S().travel.map((t) => ui.row({ icon: 'plane', title: t.dest, sub: t.from + ' to ' + t.to })).join('')}</div>`) : ''}</div>` }));
  HM.forms.travel = (f, d) => { if (!ui.need(f, d, [['dest', 'Enter your destination.'], ['from', 'Choose a start date.'], ['to', 'Choose an end date.']])) return; if (d.to < d.from) return ui.fail(f, 'The end date must be after the start date.', 'to'); const s = S(); s.travel = s.travel || []; s.travel.push({ dest: d.dest.trim(), from: d.from, to: d.to }); HM.save(); ui.toast('Travel notice added'); HM.refresh(true); };
  HM.route('/cards/benefits', 'cards', () => ({ title: 'Card benefits', html: `${ui.header('Card benefits', { back: '/cards' })}<div class="pad">${group([['shield', 'Zero liability', 'You are not responsible for unauthorised card purchases', '/more/support/faq'], ['zap', 'Instant alerts', 'Know about every purchase as it happens', '/more/security/alerts'], ['star', 'Harbor Rewards', 'Earn points on every purchase', '/more/rewards'], ['globe', 'Worldwide acceptance', 'Use your card at millions of merchants', '/cards/travel']])}</div>` }));
  HM.route('/cards/wallet', 'cards', () => info('Digital wallet', '/cards', [['Add your card to your phone', 'Open your phone’s wallet app, choose Add card, and enter the card details when prompted.'], ['Pay with a tap', 'Hold your phone near a contactless reader and authenticate with Face ID or your passcode.'], ['Stay protected', 'Your real card number is never shared with the merchant when you pay with your phone.']]));
  HM.route('/cards/dispute', 'cards', () => { const list = S().txs.filter((t) => t.amount < 0 && t.status === 'completed').slice(0, 8); return { title: 'Dispute a transaction', html: `${ui.header('Dispute a transaction', { back: '/cards' })}<div class="pad"><p class="sm mute">Choose the transaction you want to dispute.</p><div class="group">${list.map((t) => ui.row({ icon: 'receipt', title: t.desc, sub: HM.fmtShort ? HM.fmtShort(t.date) : '', right: '<b>' + money(Math.abs(t.amount)) + '</b>', act: 'disputeTx', arg: t.id, noChev: false })).join('') || ui.empty('receipt', 'Nothing to dispute', '')}</div></div>` }; });
  HM.acts.disputeTx = async (b, id) => { const t = S().txs.find((x) => x.id === id); if (!t) return; if (await ui.confirm({ title: 'Dispute this transaction?', body: esc(t.desc) + ' for ' + money(Math.abs(t.amount)) + '. We will review it and update you.', ok: 'Submit dispute' })) { HM.notify('payment', 'Dispute opened', 'We opened a dispute for ' + t.desc + '.'); HM.save(); ui.toast('Dispute submitted'); HM.go('/cards'); } };
  HM.cardsMore = () => ui.section('Card services', '', group([['plane', 'Travel notice', 'Tell us where you are going', '/cards/travel'], ['alert', 'Dispute a transaction', 'Report a charge you do not recognise', '/cards/dispute'], ['wallet', 'Digital wallet', 'Pay with your phone', '/cards/wallet'], ['star', 'Card benefits', 'Rewards and protections', '/cards/benefits'], ['file', 'Card statements', 'Monthly statements', '/accounts/statements'], ['atm', 'Find an ATM', 'Free withdrawals nearby', '/more/atm'], ['help', 'Card help', 'Frequently asked questions', '/more/support/faq']]));

  /* ---------- Activity extras ---------- */
  HM.acts.exportCsv = () => { const rows = [['Date', 'Description', 'Category', 'Amount', 'Status']].concat(S().txs.slice(0, 500).map((t) => [new Date(t.date).toISOString().slice(0, 10), t.desc, t.cat || '', t.amount.toFixed(2), t.status])); ui.download('westmark-activity.csv', rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n'), 'text/csv'); ui.toast('Activity exported'); };
  HM.activityHub = () => tiles([['receipt', 'Transactions', 'Search & filter', '/transactions'], ['clock', 'Pending', 'Awaiting processing', '/transactions'], ['calendar', 'Scheduled', 'Upcoming payments', '/payments/scheduled'], ['file', 'Statements', 'Monthly records', '/accounts/statements'], ['chart', 'Spending', 'Insights by category', '/accounts/spending'], ['target', 'Goals', 'Track your savings', '/accounts/goals']]) + `<button class="btn btn-ghost btn-sm mt" data-act="exportCsv">${icon('download', 16)} Export activity (CSV)</button>`;

  /* ---------- Home extras ---------- */
  HM.homeCards = () => { const cs = S().cards || []; if (!cs.length || !HM.cardVisual) return ''; return ui.section('Your cards', ui.link('Manage', '/cards'), `<div class="hscroll">${cs.map((c) => `<button class="hcard" data-go="/cards">${HM.cardVisual(c, { meta: false })}</button>`).join('')}</div>`); };
  HM.homeMore = () => {
    const gs = (S().goals || []).slice(0, 2);
    const goals = gs.length ? ui.section('Savings goals', ui.link('All goals', '/accounts/goals'), `<div class="card">${gs.map((g) => `<div class="lim"><div class="lim-h"><b>${esc(g.name)}</b><span>${money(g.saved).replace('.00', '')} of ${money(g.target).replace('.00', '')}</span></div>${ui.progress(Math.min(100, Math.round(g.saved / g.target * 100)))}</div>`).join('')}</div>`) : '';
    return goals + ui.section('Rewards & offers', ui.link('See all', '/more/offers'), tiles([['star', 'Harbor Rewards', 'Earn on every purchase', '/more/rewards'], ['users', 'Refer a friend', '2,500 points each', '/more/refer'], ['zap', 'Offers', 'Bonus points', '/more/offers'], ['calendar', 'Tools', 'Calculators & rates', '/more/tools']]))
      + ui.section('Security', '', `<button class="card row" data-go="/more/security-center" style="width:100%;text-align:left"><span class="row-i gold">${icon('shield', 20)}</span><span class="row-m"><b>Security center</b><small>Tips to keep your account safe</small></span><span class="row-c">${icon('chevR', 18)}</span></button>`);
  };

  /* ---------- public pages (reachable from the sign-in screen) ---------- */
  const pub = (path, title, secs) => HM.route(path, 'auth', () => ({ title, html: `<div class="auth-wrap"><div class="auth-hero">${ui.logo(46)}<h1>Westmark</h1><span class="auth-app">MOBILE BANKING</span></div><div class="auth-card"><button class="back-lnk" data-go="/login">${icon('chevL', 18)} Back to sign in</button><h2>${esc(title)}</h2><div class="pubdoc">${secs}</div></div></div>` }), { pub: true });
  const sect = (arr) => arr.map((s) => `<h3>${esc(s[0])}</h3><p class="mute sm">${esc(s[1])}</p>`).join('');
  pub('/pub/security', 'Security', sect([['Your account is protected', 'Every sign-in needs your password and a one-time code sent to your email.'], ['We never ask for your PIN', 'Westmark will never contact you to ask for your password, PIN or one-time code.'], ['Sign out on shared devices', 'Always sign out when you finish, and keep your device updated.'], ['Report a problem', 'Contact customer support if you notice anything unusual.']]));
  pub('/pub/contact', 'Contact us', `<div class="group">${ui.row({ icon: 'phone', title: 'Call us', sub: '1-800-555-0100', noChev: true })}${ui.row({ icon: 'mail', title: 'Email', sub: 'support@westmark.example', noChev: true })}${ui.row({ icon: 'building', title: 'Mailing address', sub: '100 Harbor Way, Seattle, WA', noChev: true })}${ui.row({ icon: 'clock', title: 'Hours', sub: 'Monday to Friday, 8am to 8pm', noChev: true })}</div>`);
  pub('/pub/locations', 'ATMs & branches', `<div class="group">${[['Main Branch', '100 Harbor Way', 'Open until 5pm'], ['Downtown ATM', '12 Market Street', '24 hours'], ['Riverside Branch', '48 River Road', 'Open until 6pm'], ['Airport ATM', 'Terminal 2', '24 hours']].map((r) => ui.row({ icon: r[0].includes('ATM') ? 'atm' : 'building', title: r[0], sub: r[1] + ' · ' + r[2], noChev: true })).join('')}</div>`);
  HM.loginLinks = () => `<nav class="login-links" aria-label="More">${[['/pub/security', 'Security'], ['/pub/contact', 'Contact'], ['/pub/locations', 'Locations']].map((l) => `<button type="button" data-go="${l[0]}">${l[1]}</button>`).join('')}</nav>`;
})();


/* Westmark Mobile — additional screens: products, contact, language, learn, linked services, feedback, alerts */
(function () {
  'use strict';
  const HM = window.HM, ui = HM.ui, esc = HM.esc, icon = HM.icon, S = () => HM.state();
  const rows = (arr) => `<div class="group">${arr.map((r) => ui.row({ icon: r[0], title: r[1], sub: r[2], go: r[3], act: r[4], arg: r[5] })).join('')}</div>`;
  const tiles = (arr) => `<div class="tiles">${arr.map((t) => `<button class="tile" data-go="${t[3]}"><span class="row-i gold">${icon(t[0], 20)}</span><b>${esc(t[1])}</b><small>${esc(t[2])}</small></button>`).join('')}</div>`;
  const page = (path, title, back, tab, fn, sub) => HM.route(path, tab || 'more', () => ({ title, html: `${ui.header(title, { back, sub })}<div class="pad">${fn()}</div>` }));
  const note = (t) => `<div class="note">${icon('info', 18)}<span>${esc(t)}</span></div>`;
  const sendRequest = (subject, category, message) => {
    const r = { id: HM.uid('sr'), date: new Date().toISOString(), subject, category, message, status: 'Open', ref: 'SR-' + String(Math.floor(Math.random() * 1e6)).padStart(6, '0') };
    S().support.unshift(r); HM.notify('account', 'Request received', `${r.ref}: ${subject}`); HM.save(); ui.toast('Request ' + r.ref + ' sent'); HM.go('/more/support/requests/' + r.id);
  };
  HM.acts.xRequest = (b, key) => { const [subject, cat] = String(key).split('|'); sendRequest(subject, cat, 'Please contact me about: ' + subject + '.'); };

  /* ---------- Contact us ---------- */
  page('/more/contact', 'Contact us', '/more', 'more', () => `
    ${rows([['phone', 'Call us', '1-800-HARBOR-0 · 24/7 card support', null, 'copyTxt', '1-800-427-2670'], ['msg', 'Message us', 'Secure message to our team', '/more/support/new'], ['mail', 'Email', 'support@westmark.bank', null, 'copyTxt', 'support@westmark.bank'], ['building', 'Visit a branch', 'Find hours and addresses', '/more/branches'], ['atm', 'Find an ATM', 'Cash and deposits nearby', '/more/atm']])}
    ${ui.section('Quick help', '', rows([['lock', 'Lost or stolen card', 'Lock it now', '/cards'], ['alert', 'Report fraud', 'Unrecognised activity', '/more/fraud'], ['help', 'Help centre', 'Answers to common questions', '/more/support/faq']]))}
    <div class="card mt"><div class="kv"><span>Phone hours</span><b>24 hours, 7 days</b></div><div class="kv"><span>Branch hours</span><b>Mon–Fri 9–5 · Sat 9–1</b></div><div class="kv"><span>Mailing address</span><b>100 Harbor Way, Seattle, WA</b></div></div>`, 'We are here to help');

  /* ---------- Language & region ---------- */
  const lang = () => { try { return localStorage.getItem('hm_lang') || 'English (US)'; } catch (e) { return 'English (US)'; } };
  HM.acts.setLang = (b, v) => { try { localStorage.setItem('hm_lang', v); } catch (e) { /* ignore */ } ui.toast(v + ' selected'); HM.refresh(true); };
  page('/more/language', 'Language & region', '/more', 'more', () => `<div class="group">${['English (US)', 'English (UK)', 'Español', 'Français', 'Português', 'Deutsch'].map((l) => `<button class="row" data-act="setLang" data-arg="${l}"><span class="row-i">${icon('globe', 20)}</span><span class="row-m"><b>${l}</b></span><span class="row-r">${lang() === l ? icon('check', 20) : ''}</span></button>`).join('')}</div>
    <div class="card mt"><div class="kv"><span>Currency</span><b>US dollar (USD)</b></div><div class="kv"><span>Date format</span><b>Month, day, year</b></div><div class="kv"><span>Time zone</span><b>Automatic</b></div></div>`);

  /* ---------- Open an account / products ---------- */
  const PRODUCTS = [
    ['wallet', 'Everyday Checking', 'No monthly fee · debit card · mobile deposit', ['No monthly maintenance fee', 'Contactless debit card included', 'Early access to direct deposits', 'Free Westmark ATMs']],
    ['bank', 'High-Yield Savings', 'Earn more on every dollar you save', ['4.25% APY on balances', 'No minimum balance', 'Set savings goals', 'Automatic round-ups']],
    ['chart', 'Money Market', 'Higher rates with easy access', ['4.60% APY on balances above $10,000', 'Check-writing access', 'Tiered rates', 'Free incoming transfers']],
    ['target', 'Certificate of Deposit', 'Lock in a fixed rate', ['6 to 60 month terms', 'Rates up to 5.00% APY', 'Auto-renew options', 'Early withdrawal terms apply']],
    ['car', 'Auto Loan', 'Finance a new or used vehicle', ['Rates from 5.99% APR', 'Terms up to 72 months', 'Quick decision', 'No prepayment penalty']],
    ['home', 'Home Loan', 'Purchase or refinance', ['Fixed and adjustable rates', 'Low down payment options', 'Dedicated loan advisor', 'Rate-lock available']],
    ['card', 'Credit Card', 'Rewards on everyday spending', ['1.5 points per $1', 'No annual fee', 'Travel and purchase protection', 'Contactless and wallet ready']],
    ['users', 'Joint Account', 'Share an account with family', ['Two cardholders', 'Shared alerts', 'Individual debit cards', 'Easy to add or remove']]
  ];
  page('/more/open-account', 'Open an account', '/more', 'more', () => `${rows(PRODUCTS.map((p, i) => [p[0], p[1], p[2], '/more/open-account/' + i]))}`, 'Accounts, loans and cards');
  HM.route('/more/open-account/:i', 'more', (params) => {
    const p = PRODUCTS[Number(params.i)] || PRODUCTS[0];
    return { title: p[1], html: `${ui.header(p[1], { back: '/more/open-account', sub: p[2] })}<div class="pad"><div class="card center"><span class="row-i gold" style="margin:0 auto 8px">${icon(p[0], 22)}</span><h2>${esc(p[1])}</h2><p class="mute">${esc(p[2])}</p></div>
      <div class="group mt">${p[3].map((f) => `<div class="row"><span class="row-i">${icon('check', 18)}</span><span class="row-m"><b>${esc(f)}</b></span></div>`).join('')}</div>
      <div class="btns"><button class="btn btn-primary" data-act="xRequest" data-arg="Open ${esc(p[1])}|Accounts">Apply now</button><button class="btn btn-ghost" data-go="/more/contact">Talk to an advisor</button></div></div>` };
  });
  page('/more/loans', 'Loans & credit', '/more', 'more', () => `${tiles([['car', 'Auto loan', 'From 5.99% APR', '/more/open-account/4'], ['home', 'Home loan', 'Purchase or refinance', '/more/open-account/5'], ['card', 'Credit card', '1.5 points per $1', '/more/open-account/6'], ['calendar', 'Loan calculator', 'Estimate payments', '/more/tools/loan']])}${ui.section('Plan ahead', '', rows([['target', 'Savings calculator', 'See your savings grow', '/more/tools/savings'], ['receipt', 'Rates & fees', 'Current pricing', '/more/fees'], ['users', 'Speak to an advisor', 'Book a call', '/more/contact']]))}`);

  /* ---------- Learn ---------- */
  const TIPS = [['Build an emergency fund', 'Aim to set aside three to six months of essential expenses in a savings account you can reach quickly. Start small with automatic weekly transfers and increase them when you can.'], ['Spot a scam', 'Westmark will never ask for your full password, PIN or one-time code by phone, text or email. If something feels urgent or unusual, hang up and contact us using the number in the app.'], ['Understand APY', 'APY shows how much you earn over a year including compounding. Compare APYs, not just rates, when choosing a savings product.'], ['Budgeting basics', 'Split spending into needs, wants and savings. Review your Spending insights each month to see where adjustments make the most difference.'], ['Protect your card', 'Use card controls to lock your card instantly, set travel notices and turn on alerts for every purchase.'], ['Reading your statement', 'Check each statement for transactions you do not recognise, confirm balances and note any fees. Report concerns within 60 days.']];
  HM.acts.tipOpen = (b, i) => { const t = TIPS[Number(i)]; ui.sheet(`<h3 class="sh-title">${esc(t[0])}</h3><p class="sh-body">${esc(t[1])}</p><div class="sh-actions"><button class="btn btn-primary" data-act="closeSheet">Done</button></div>`); };
  page('/more/learn', 'Learn', '/more', 'more', () => rows(TIPS.map((t, i) => ['bulb', t[0], 'Tips · 2 min read', null, 'tipOpen', i])), 'Money tips and guides');

  /* ---------- Feedback ---------- */
  HM.forms.feedback = (f, d) => { if ((d.msg || '').trim().length < 10) return ui.fail(f, 'Please write at least 10 characters.', 'msg'); sendRequest('App feedback', 'Feedback', d.msg.trim()); };
  page('/more/feedback', 'Send feedback', '/more', 'more', () => `<div class="card"><form data-form="feedback" novalidate>${ui.field({ name: 'msg', label: 'Your feedback', type: 'textarea', maxlength: 400, placeholder: 'Tell us what we can improve' })}<button class="btn btn-primary mt2" type="submit">Send feedback</button></form></div>`);

  /* ---------- Linked services & paperless ---------- */
  page('/more/linked', 'Linked services', '/more', 'more', () => `${rows([['wallet', 'Digital wallets', 'Add your card to a wallet', '/cards/wallet'], ['bank', 'External accounts', 'Link another bank', '/payments/beneficiaries'], ['zap', 'Bill pay', 'Manage billers', '/payments/bills/manage'], ['device', 'Trusted devices', 'Devices that can sign in', '/more/security/devices']])}`);
  page('/more/paperless', 'Paperless & documents', '/more', 'more', () => `${rows([['file', 'Statements', 'Monthly records', '/accounts/statements'], ['file', 'Tax documents', 'Annual summaries', '/more/tax'], ['book', 'Account documents', 'Agreements and notices', '/accounts/documents'], ['bell', 'Delivery preferences', 'Choose how you hear from us', '/more/notifications']])}`);
  page('/more/alerts', 'Alerts', '/more', 'more', () => `${rows([['bell', 'Notifications', 'Inbox', '/notifications'], ['shield', 'Security alerts', 'Sign-ins and changes', '/more/security/alerts'], ['card', 'Card alerts', 'Purchases and ATM', '/cards/security/card1'], ['bank', 'Account alerts', 'Balance and deposits', '/accounts/controls']])}`);

  /* ---------- Home "Explore" and Activity/Cards extras ---------- */
  HM.xExplore = () => ui.section('Explore', ui.link('More', '/more'), tiles([['bank', 'Open an account', 'Savings, CDs, loans', '/more/open-account'], ['star', 'Rewards', 'Points & tiers', '/more/rewards'], ['zap', 'Offers', 'Activate bonus offers', '/more/offers'], ['bulb', 'Learn', 'Money tips & guides', '/more/learn']]));
  HM.xActivity = () => ui.section('More activity tools', '', rows([['download', 'Deposits', 'Mobile check deposits', '/accounts/deposit/history'], ['users', 'Beneficiaries', 'Saved recipients', '/payments/beneficiaries'], ['zap', 'Limits', 'Daily payment limits', '/payments/limits'], ['book', 'Documents', 'Agreements & notices', '/accounts/documents'], ['bell', 'Alerts', 'Notifications inbox', '/notifications']]));
  HM.xCards = () => ui.section('Card services', '', rows([['unlock', 'Replace a card', 'Lost, stolen or damaged', null, 'xRequest', 'Replace my debit card|Cards'], ['key', 'Change PIN', 'Set a new card PIN', '/cards/pin/card1'], ['plane', 'Travel notice', 'Use your card abroad', '/cards/travel'], ['wallet', 'Digital wallets', 'Apple Pay & Google Pay', '/cards/wallet'], ['star', 'Card benefits', 'Protections & perks', '/cards/benefits'], ['flag', 'Dispute a transaction', 'Report a problem', '/cards/dispute'], ['card', 'Virtual card', 'Shop online securely', '/cards/virtual']]));
})();

/* Westmark Mobile — bootstrap */
(function () {
  'use strict';
  HM.init();
  HM.start();
  // keep pending items settling while the app is open
  setInterval(() => { if (HM.session.active() && HM.processDue()) { const p = HM.cur.path || ''; if (!document.body.classList.contains('kbd') && !document.body.classList.contains('sheet-open') && !/\/(review|processing|new|add|edit|capture|pin|activate)/.test(p)) HM.refresh(true); } }, 15000);
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => { /* PWA install is optional */ }));
  }
})();

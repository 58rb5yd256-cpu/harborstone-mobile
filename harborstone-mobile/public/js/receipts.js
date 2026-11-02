/* Harborstone Mobile — receipts: a separate polished layout per payment type, print + download */
(function () {
  'use strict';
  const HM = window.HM, ui = HM.ui, esc = HM.esc, icon = HM.icon, money = HM.money;
  const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const words = (n) => { if (n < 20) return ONES[n]; if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : ''); if (n < 1000) return ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + words(n % 100) : ''); if (n < 1e6) return words(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? ' ' + words(n % 1000) : ''); return words(Math.floor(n / 1e6)) + ' million' + (n % 1e6 ? ' ' + words(n % 1e6) : ''); };
  const amountWords = (v) => { const d = Math.floor(v), c = Math.round((v - d) * 100); const w = (d === 0 ? 'zero' : words(d)); return w[0].toUpperCase() + w.slice(1) + ' and ' + String(c).padStart(2, '0') + '/100 dollars'; };
  const addS = (d, s) => new Date(new Date(d).getTime() + s * 1000);
  const digitsOf = (ref) => String(ref).replace(/\D/g, '');

  const head = (t, title, sub, cls) => `<div class="rc-head ${cls || ''}"><div class="rc-brand">${ui.logo(40)}<div><b>HARBORSTONE BANK</b><span>${esc(sub || 'Your finances. Your direction.')}</span></div></div><div class="rc-type">${esc(title)}</div></div>`;
  const notDone = (t) => ['blocked', 'failed', 'declined'].includes(t.status);
  const statusBand = (t) => {
    const m = { completed: ['ok', 'check', 'COMPLETED'], pending: ['wait', 'clock', 'PENDING'], blocked: ['bad', 'snow', 'BLOCKED — NOT PROCESSED'], failed: ['bad', 'x', 'FAILED — NOT PROCESSED'], declined: ['bad', 'x', 'DECLINED'] }[t.status] || ['ok', 'check', t.status.toUpperCase()];
    return `<div class="rc-status ${m[0]}">${icon(m[1], 20)}<span>${m[2]}</span></div>${notDone(t) ? `<div class="rc-reason"><b>Why:</b> ${esc(t.reason || 'The transaction could not be processed.')} <b>No funds were transferred.</b> This is recorded as a ${t.status === 'blocked' ? 'blocked demo attempt' : 'failed attempt'}.</div>` : ''}`;
  };
  const row = (k, v, cls) => (v === '' || v == null ? '' : `<div class="rk ${cls || ''}"><span>${k}</span><b>${v}</b></div>`);
  const foot = (t) => `<div class="rc-foot"><div>Ref <b>${esc(t.ref)}</b> · Printed ${HM.fmtDT(new Date())}</div><p class="rc-fine">Harborstone Bank is a fictional bank (school project).</p></div>`;
  const acctLine = (a) => `${esc(a.nickname)} · ${esc(a.type === 'savings' ? 'Savings' : 'Checking')} ${HM.mask(a.number)}`;
  const timeline = (items) => `<ul class="tlist">${items.map((i) => `<li class="${i[0]}"><i>${i[0] === 'no' ? '✕' : i[0] === 'off' ? '' : i[0] === 'now' ? '●' : '✓'}</i><div><b>${esc(i[1])}</b><small>${esc(i[2])}</small></div></li>`).join('')}</ul>`;

  function build(t, h) {
    const a = HM.acct(t.acct), m = t.meta || {}, amt = Math.abs(t.amount), when = t.date, bad = notDone(t);
    const holder = HM.holder();
    switch (t.rail) {
      case 'ach_instant': {
        const b = m.benef || {};
        return `<article class="receipt r-instant" id="rcpt">${head(t, 'Instant ACH', 'Instant payment receipt', 'navy')}<div class="rc-body">${statusBand(t)}<div class="rc-amt">${money(amt)}</div><div class="rc-date">${HM.fmtDT(when)}</div>
          <div class="rc-flow"><div><small>FROM</small><b>${esc(holder)}</b><span>${acctLine(a)}</span></div><div class="arr">${icon('zap', 22)}</div><div><small>TO</small><b>${esc(b.name)}</b><span>${esc(b.bank)} · ${HM.mask(b.account || '')}</span></div></div>
          ${row('Description', esc(m.purpose))}${row('Transaction reference', esc(t.ref))}${row('Payment network', 'ACH — Same-day / instant')}${row('Routing number', esc(b.routing))}${row('Fee', money(t.fee || 0))}${row('Status', esc(t.status))}
          <div class="rc-sub">Delivery timeline</div>${bad ? timeline([['', 'Payment initiated', HM.fmtTime(when)], ['no', 'Stopped at account review', HM.fmtTime(addS(when, 2))], ['off', 'Not sent to ACH network', '—']]) : timeline([['', 'Payment initiated', HM.fmtTime(when)], ['', 'Verified & limits checked', HM.fmtTime(addS(when, 1))], ['', 'Sent to ACH network', HM.fmtTime(addS(when, 2))], ['', 'Delivered to beneficiary', HM.fmtTime(addS(when, 4))]])}
          </div>${foot(t)}</article>`;
      }
      case 'ach_standard': {
        const b = m.benef || {}; const eff = new Date(when); eff.setDate(eff.getDate() + 1); const trace = (HM.BANK.routing.slice(0, 8) + digitsOf(t.ref).slice(-7).padStart(7, '0'));
        return `<article class="receipt r-ach" id="rcpt">${head(t, 'ACH Credit Transfer', 'Standard ACH notice', 'white')}<div class="rc-body">${statusBand(t)}<div class="rc-amt">${money(amt)}</div><div class="rc-date">Initiated ${HM.fmtDT(when)}</div>
          <div class="rc-flow"><div><small>ORIGINATOR</small><b>${esc(holder)}</b><span>${acctLine(a)}</span></div><div class="arr">${icon('chevR', 22)}</div><div><small>RECEIVER</small><b>${esc(b.name)}</b><span>${esc(b.type || 'checking')} ${HM.mask(b.account || '')}</span></div></div>
          ${row('Receiving bank', esc(b.bank))}${row('Receiving routing (ABA)', esc(b.routing))}${row('Entry description', esc(m.purpose))}${row('SEC code', esc(m.sec || 'PPD'))}${row('Trace number', trace)}${row('Effective entry date', HM.fmtDate(eff))}${row('Settlement', bad ? 'Not applicable' : 'Typically 1–2 business days (demo: ~' + Math.round(HM.PENDING_MS / 1000) + ' s)')}${row('Fee', money(t.fee || 0))}
          <div class="rc-sub">Processing</div>${bad ? timeline([['', 'Request received', HM.fmtTime(when)], ['no', 'Declined at account review', HM.fmtTime(addS(when, 2))], ['off', 'Not submitted to ACH network', '—']]) : timeline([['', 'Request received', HM.fmtTime(when)], ['', 'Submitted to ACH network', HM.fmtTime(addS(when, 3))], [t.status === 'completed' ? '' : 'now', t.status === 'completed' ? 'Settled — funds posted' : 'In transit — pending', t.status === 'completed' ? HM.fmtDT(t.settledAt || when) : 'Expected shortly'], ...(t.status === 'completed' ? [] : [['off', 'Settled at receiving bank', '—']])])}
          </div>${foot(t)}</article>`;
      }
      case 'wire': {
        const b = m.benef || {};
        return `<article class="receipt r-wire" id="rcpt">${head(t, 'WIRE TRANSFER ADVICE', 'Domestic wire · Fedwire (simulated)', 'navy')}<div class="rc-body">${statusBand(t)}
          <div class="wgrid"><div class="c full amt"><small>WIRE AMOUNT (USD)</small><b>${money(amt)}</b></div>
          <div class="c"><small>VALUE DATE</small><b>${HM.fmtDate(when)}</b></div><div class="c"><small>TIME ENTERED</small><b>${HM.fmtTime(when)}</b></div>
          <div class="c full"><small>WIRE REFERENCE</small><b>${esc(t.ref)}</b></div><div class="c full"><small>FED REFERENCE (IMAD)</small><b>${esc(m.fedRef || '—')}</b></div>
          <div class="c full"><small>ORIGINATOR</small><b>${esc(holder)}</b></div><div class="c"><small>ORIGINATING BANK</small><b>Harborstone Bank</b></div><div class="c"><small>ORIGINATING ABA</small><b>${HM.BANK.routing}</b></div><div class="c full"><small>ORIGINATOR ACCOUNT</small><b>${acctLine(a)}</b></div>
          <div class="c full"><small>BENEFICIARY</small><b>${esc(b.name)}</b></div><div class="c"><small>BENEFICIARY BANK</small><b>${esc(b.bank)}</b></div><div class="c"><small>BENEFICIARY ABA</small><b>${esc(b.routing)}</b></div><div class="c full"><small>BENEFICIARY ACCOUNT</small><b>${HM.mask(b.account || '')}</b></div>
          <div class="c full"><small>PURPOSE OF PAYMENT</small><b>${esc(m.purpose)}</b></div><div class="c"><small>WIRE FEE</small><b>${money(t.fee || 0)}</b></div><div class="c"><small>TOTAL DEBITED</small><b>${bad ? money(0) : money(amt + (t.fee || 0))}</b></div><div class="c full"><small>STATUS</small><b>${esc(t.status.toUpperCase())}</b></div></div>
          <div class="sigs"><div>Authorized electronically via Harborstone Mobile</div><div>${esc(holder)}</div></div></div>${foot(t)}</article>`;
      }
      case 'check': {
        return `<article class="receipt r-check" id="rcpt">${head(t, 'Check Payment', 'Check issued receipt', 'gold')}<div class="rc-body">${statusBand(t)}
          <div class="chkface"><div class="chk-top"><div><b>${esc(holder)}</b><span>${esc(HM.acct(t.acct).nickname)}</span></div><div class="chk-no">${m.checkNo ? '№ ' + m.checkNo : ''}<br><small>DATE ${m.issueDate ? HM.fmtDate(HM.parseDay(m.issueDate), { month: '2-digit', day: '2-digit', year: 'numeric' }) : ''}</small></div></div>
          <div class="chk-pay"><small>PAY TO THE<br>ORDER OF</small><b>${esc(m.payee)}</b><div class="box">${money(amt)}</div></div><div class="chk-w">${amountWords(amt)}</div>
          <div class="chk-bot"><div><small>MEMO</small> ${esc(m.memo || '')}</div><div class="sig">${esc(holder)}</div></div><div class="micr">⑆${HM.BANK.routing}⑆ ${HM.mask(a.number)}⑈ ${String(m.checkNo || '').padStart(4, '0')}</div><div class="chk-spec">SPECIMEN</div></div>
          ${row('Payee', esc(m.payee))}${row('Check number', m.checkNo ? '#' + m.checkNo : '')}${row('Issue date', m.issueDate ? HM.fmtDate(HM.parseDay(m.issueDate)) : '')}${row('Source account', acctLine(a))}${row('Memo', esc(m.memo))}${row('Confirmation', esc(t.ref))}${row('Clearing', bad ? 'Not issued' : t.status === 'completed' ? 'Cleared ' + HM.fmtDT(t.settledAt || when) : 'Pending — clears in about ' + Math.round(HM.PENDING_MS / 1000) + ' seconds (demo)')}</div>${foot(t)}</article>`;
      }
      case 'internal': {
        const pair = HM.txByRef(t.ref); const deb = pair.find((x) => x.amount < 0) || t, cr = pair.find((x) => x.amount > 0); const hh = h.filter((x) => x.ref === t.ref);
        const dh = hh.find((x) => x.amount < 0), ch = hh.find((x) => x.amount > 0); const from = HM.acct(deb.acct), to = cr ? HM.acct(cr.acct) : HM.acct((deb.meta || {}).counter);
        return `<article class="receipt r-internal" id="rcpt">${head(t, 'Internal Transfer', 'Between your Harborstone accounts', 'teal')}<div class="rc-body">${statusBand(t)}<div class="rc-amt">${money(amt)}</div><div class="rc-date">${HM.fmtDT(when)}</div>
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
          <div class="imgs"><div><small>Front</small><img src="${front}" alt="Check front (demo image)"></div><div><small>Back</small><img src="${back}" alt="Check back (demo image)"></div></div>
          ${row('Deposited to', acctLine(a))}${row('Payer', esc(m.payer))}${row('Check date', m.checkDate ? HM.fmtDate(HM.parseDay(m.checkDate)) : '')}${row('Memo', esc(m.memo))}${row('Deposit reference', esc(t.ref))}${row('Availability', t.status === 'completed' ? 'Available — posted ' + HM.fmtDT(t.settledAt || when) : 'Pending review — funds available in about ' + Math.round(HM.PENDING_MS / 1000) + ' seconds (demo)')}${row('Status', esc(t.status))}
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
      html: `${ui.header('Receipt', { back: '/payments/history', sub: (HM.RAILS[t.rail] || {}).label })}<div class="pad rc-wrap">${build(t, HM.history())}<div class="btns two noprint"><button class="btn btn-primary" data-act="rcPrint">${icon('print', 18)} Print</button><button class="btn btn-ghost" data-act="rcDownload" data-arg="${esc(ref)}">${icon('download', 18)} Download</button></div><div class="btns noprint"><button class="btn btn-ghost" data-go="/payments">Done</button></div></div>`
    };
  });
  HM.acts.rcPrint = () => window.print();
  HM.acts.rcDownload = (b, ref) => {
    const el = document.getElementById('rcpt'); if (!el) return; const all = HM.txByRef(ref);
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Harborstone receipt ${esc(ref)}</title><style>${ui.pageCss()}html,body{height:auto;overflow:auto}body{padding:16px;background:#E9ECEC}.receipt{max-width:520px;margin:0 auto}</style></head><body>${el.outerHTML}</body></html>`;
    ui.download('Harborstone-Receipt-' + ref + '.html', html); ui.toast('Demo receipt downloaded');
  };
})();

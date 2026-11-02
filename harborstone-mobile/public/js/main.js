/* Harborstone Mobile — bootstrap */
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

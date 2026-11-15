/* Westmark Mobile — one-tap install guide (iPhone / iPad Safari and Android Chrome) */
(function () {
  'use strict';
  var ua = navigator.userAgent || '';
  var standalone = (window.navigator.standalone === true) || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  if (standalone) return;
  var KEY = 'hm_inst_hide';
  function hidden() { try { var t = +localStorage.getItem(KEY) || 0; return Date.now() < t; } catch (e) { return false; } }
  function hideFor(ms) { try { localStorage.setItem(KEY, String(Date.now() + ms)); } catch (e) { /* ignore */ } }
  var ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var inApp = /FBAN|FBAV|Instagram|Line\/|MicroMessenger|WhatsApp|Snapchat|TikTok|Twitter|LinkedIn/i.test(ua);
  var deferred = null, el = null;
  var SHARE = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M8 7l4-4 4 4M6 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1"/></svg>';
  var PLUS = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';
  var CHECK = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>';
  function close(days) { hideFor((days || 3) * 864e5); if (el) { el.classList.remove('on'); setTimeout(function () { if (el) { el.remove(); el = null; } }, 300); } }
  function build(inner) {
    if (el || hidden()) return;
    el = document.createElement('div'); el.className = 'hm-inst'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Install Westmark');
    el.innerHTML = '<div class="hm-inst-card"><div class="hm-inst-top"><b>Install Westmark</b><button type="button" class="hm-inst-x" aria-label="Close">&times;</button></div>' + inner + '</div>';
    document.body.appendChild(el);
    el.querySelector('.hm-inst-x').addEventListener('click', function () { close(3); });
    var n = el.querySelector('[data-inst=later]'); if (n) n.addEventListener('click', function () { close(3); });
    var g = el.querySelector('[data-inst=done]'); if (g) g.addEventListener('click', function () { close(30); });
    var c = el.querySelector('[data-inst=copy]'); if (c) c.addEventListener('click', function () { try { navigator.clipboard.writeText(location.href); c.textContent = 'Link copied'; } catch (e) { c.textContent = location.href; } });
    var i = el.querySelector('[data-inst=install]'); if (i) i.addEventListener('click', function () { if (!deferred) return; deferred.prompt(); deferred.userChoice.then(function () { deferred = null; close(30); }); });
    requestAnimationFrame(function () { requestAnimationFrame(function () { if (el) el.classList.add('on'); }); });
  }
  function showIOS() {
    if (inApp) {
      build('<ol class="hm-steps"><li><span>' + SHARE + '</span>Open this link in <b>Safari</b></li></ol><button type="button" class="hm-inst-btn" data-inst="copy">Copy link</button>');
      return;
    }
    build('<ol class="hm-steps"><li><span>' + SHARE + '</span>Tap <b>Share</b> <small>(or ••• then Share)</small></li><li><span>' + PLUS + '</span>Tap <b>Add to Home Screen</b></li><li><span>' + CHECK + '</span>Tap <b>Add</b></li></ol><div class="hm-inst-row"><button type="button" class="hm-inst-btn ghost" data-inst="later">Not now</button><button type="button" class="hm-inst-btn" data-inst="done">Got it</button></div><div class="hm-arrow" aria-hidden="true"></div>');
  }
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); deferred = e;
    setTimeout(function () { build('<p class="hm-inst-p">Add it to your home screen.</p><div class="hm-inst-row"><button type="button" class="hm-inst-btn ghost" data-inst="later">Not now</button><button type="button" class="hm-inst-btn" data-inst="install">Install</button></div>'); }, 1200);
  });
  window.addEventListener('appinstalled', function () { hideFor(3650 * 864e5); if (el) close(3650); });
  if (ios) setTimeout(showIOS, 1400);
})();

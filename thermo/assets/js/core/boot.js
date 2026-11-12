/* Startup: wire the header, restore the notes document, then start the router. Loaded last. */
(function (TDC) {
  'use strict';
  var $ = TDC.util.$, I = TDC.i18n;

  function updateLangButton() {
    $('#btn-lang').querySelectorAll('span').forEach(function (s) { s.classList.toggle('on', s.textContent.toLowerCase() === I.lang); });
  }
  function updateSaveStatus() {
    var st = TDC.store.status(), n = $('#save-status');
    var file = st.file === 'linked' ? ' · 📄 ' + TDC.t('status.file') : st.file === 'needs-permission' ? ' · ⚠ ' + TDC.t('status.reconnect') : '';
    var msg = TDC.t('status.unsaved');
    n.textContent = (st.saved && !st.unsaved ? '✓ ' + TDC.t('status.saved') : '') + file;   // "saved" next to "not saved" reads as a contradiction
    n.className = 'save-status' + (st.file === 'needs-permission' ? ' warn' : '') + (st.unsaved ? ' unsaved' : '');
    if (st.unsaved) {   // dot + text; on phones only the dot stays, so the text is also the tooltip
      n.textContent += (n.textContent ? ' · ' : '');
      n.appendChild(TDC.util.el('span', { class: 'dot', 'aria-hidden': 'true' }));
      n.appendChild(TDC.util.el('span', { class: 'unsaved-text' }, msg));
    }
    n.title = st.unsaved ? msg : '';
    n.onclick = st.file === 'needs-permission' ? function () { TDC.store.reconnect(); } : TDC.tools.openNotes;
    n.style.cursor = 'pointer';
  }
  function start() {
    I.applyStatic(document);
    updateLangButton();
    $('#btn-lang').addEventListener('click', function () { I.set(I.lang === 'en' ? 'fi' : 'en'); });
    $('#btn-theme').addEventListener('click', TDC.theme.toggle);
    $('#btn-tools').addEventListener('click', function () { TDC.tools.openTools(); });
    $('#btn-notes').addEventListener('click', TDC.tools.openNotes);
    TDC.on('langchange', function () { updateLangButton(); updateSaveStatus(); document.title = TDC.t('app.title'); });
    TDC.on('savestatus', updateSaveStatus);
    TDC.on('notes:loaded', updateSaveStatus);
    if (!window.TDC_KEYS) console.warn('[TDC] assets/data/keys.js missing: run `node tools/build-keys.mjs`');

    TDC.store.init().then(function () {
      updateSaveStatus();
      TDC.router.start();
      if (TDC.store.fileState === 'needs-permission') TDC.ui.toast(TDC.t('notes.reconnectHint'), 'warn', 6000);
    }).catch(function (e) { console.error('[TDC] start failed', e); TDC.router.start(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})(window.TDC);

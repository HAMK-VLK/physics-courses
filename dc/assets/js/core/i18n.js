/* i18n: UI strings by key (data-i18n) + bilingual content objects {en, fi} bound to elements. */
(function (TDC) {
  'use strict';
  // Text-only targets (<option>, titles) cannot render markup such as <f>…</f>: drop the tags.
  function plain(s) { return String(s).replace(/<[^>]*>/g, ''); }
  var LANGS = ['en', 'fi'];
  var dict = { en: {}, fi: {} };
  var bound = new Map();   // element -> {obj, html}; cleared per page render
  var I = TDC.i18n = {
    langs: LANGS,
    lang: 'en',
    add: function (lang, obj) { Object.assign(dict[lang] = dict[lang] || {}, obj); },
    /** UI string by key with {var} substitution. Falls back to English, then to the key. */
    t: function (key, vars) {
      var s = dict[I.lang][key];
      if (s == null) s = dict.en[key];
      if (s == null) { console.warn('[TDC] missing i18n key', key); s = '[' + key + ']'; }
      if (vars) s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
      return s;
    },
    /** Pick the current language from a content object {en, fi} (or pass strings through). */
    tx: function (obj) {
      if (obj == null) return '';
      if (typeof obj === 'string' || typeof obj === 'number') return String(obj);
      var s = obj[I.lang];
      return s != null && s !== '' ? s : (obj.en != null ? obj.en : '');
    },
    /** Set element content from a bilingual object and keep it updated on language change. */
    bind: function (el, obj, asText) {
      bound.set(el, { obj: obj, text: !!asText });
      if (asText) el.textContent = plain(shown(obj)); else el.innerHTML = shown(obj);
      return el;
    },
    resetBindings: function () { bound.clear(); },
    /** Apply data-i18n / data-i18n-title / data-i18n-aria / data-i18n-ph attributes under root. */
    applyStatic: function (root) {
      (root || document).querySelectorAll('[data-i18n],[data-i18n-title],[data-i18n-aria],[data-i18n-ph]').forEach(function (n) {
        if (n.dataset.i18n) n.textContent = I.t(n.dataset.i18n);
        if (n.dataset.i18nTitle) n.title = I.t(n.dataset.i18nTitle);
        if (n.dataset.i18nAria) n.setAttribute('aria-label', I.t(n.dataset.i18nAria));
        if (n.dataset.i18nPh) n.placeholder = I.t(n.dataset.i18nPh);
      });
    },
    set: function (lang) {
      if (LANGS.indexOf(lang) < 0) return;
      I.lang = lang;
      document.documentElement.lang = lang;
      TDC.prefs && TDC.prefs.set('lang', lang);
      I.applyStatic(document);
      bound.forEach(function (b, el) {
        if (!el.isConnected) { bound.delete(el); return; }
        if (b.text) el.textContent = plain(shown(b.obj)); else el.innerHTML = shown(b.obj);
      });
      TDC.emit('langchange', { lang: lang });
    }
  };
  TDC.t = I.t; TDC.tx = I.tx;
  // A language-neutral string ("4.7 kΩ", a table cell, an SVG label) still shows the reader's decimal separator:
  // in fi a number with one decimal point gets a comma, in the text only (never inside tags or <style>).
  function localNum(s) {
    return I.lang !== 'fi' || s.indexOf('.') < 0 ? s : s.replace(/(<style[\s\S]*?<\/style>|<[^>]*>)|\d+(?:\.\d+)+/g, function (m, tag) {
      return tag || (m.split('.').length === 2 ? m.replace('.', ',') : m);
    });
  }
  // a plain string, or a pair with the same text in both languages (numbers and unit symbols only), is language-neutral
  function shown(obj) { return typeof obj === 'string' || (obj && obj.en != null && obj.en === obj.fi) ? localNum(I.tx(obj)) : I.tx(obj); }
  I.localNum = localNum;

  // Small preference store (language/theme) kept apart from the notes document so a restored or
  // imported notes file never changes them.
  TDC.prefs = {
    _p: (function () { try { return JSON.parse(localStorage.getItem('tdc.prefs') || '{}'); } catch (e) { return {}; } })(),
    get: function (k, d) { return this._p[k] != null ? this._p[k] : d; },
    set: function (k, v) { this._p[k] = v; try { localStorage.setItem('tdc.prefs', JSON.stringify(this._p)); } catch (e) {} }
  };
  // First visit: the course landing page's choice (phys.prefs) is only a fallback, never written from here.
  I.lang = TDC.prefs.get('lang', (function () {
    try { var l = JSON.parse(localStorage.getItem('phys.prefs')).lang; if (l === 'fi' || l === 'en') return l; } catch (e) {}
    return (navigator.language || 'en').slice(0, 2) === 'fi' ? 'fi' : 'en';
  })());
})(window.TDC);

/* Light/dark theme. Colours live in CSS variables (tokens.css); JS drawing reads them via color(). */
(function (TDC) {
  'use strict';
  var cache = {};
  var T = TDC.theme = {
    get: function () { return document.documentElement.getAttribute('data-theme') || 'light'; },
    set: function (t) {
      document.documentElement.setAttribute('data-theme', t);
      TDC.prefs.set('theme', t);
      cache = {};
      TDC.emit('themechange', { theme: t });
    },
    toggle: function () { T.set(T.get() === 'dark' ? 'light' : 'dark'); },
    /** Resolved value of a CSS custom property, e.g. color('--c-wire'). */
    color: function (name) {
      if (!(name in cache)) cache[name] = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return cache[name];
    }
  };
  // Follow OS changes only while the user has not chosen explicitly.
  try {
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
      if (!TDC.prefs.get('theme')) { document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light'); cache = {}; TDC.emit('themechange', {}); }
    });
  } catch (e) {}
})(window.TDC);

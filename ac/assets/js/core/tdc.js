/* TDC core namespace: DOM helpers, number parsing/formatting, events, registries. */
(function (root) {
  'use strict';
  var TDC = root.TDC = root.TDC || {};
  TDC.version = '1.0.0';
  TDC.topics = {};        // id -> topic definition (registered by content/topicN.js)
  TDC.topicList = [];     // ordered metadata from content/topics.js

  // ---------- DOM ----------
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'style' && typeof v === 'object') for (var sk in v) {
        if (sk.slice(0, 2) === '--') n.style.setProperty(sk, v[sk]); else n.style[sk] = v[sk];   // custom props need setProperty
      }
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else if (k === 'dataset') Object.assign(n.dataset, v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    append(n, children);
    return n;
  }
  function append(n, children) {
    if (children == null) return;
    if (!Array.isArray(children)) children = [children];
    children.forEach(function (c) {
      if (c == null || c === false) return;
      n.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
  }
  var SVGNS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs, children) {
    var n = document.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'text') n.textContent = v;
      else if (k === 'class') n.setAttribute('class', v);
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    if (children) (Array.isArray(children) ? children : [children]).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  // ---------- events ----------
  function on(name, fn) {
    var h = function (e) { fn(e.detail, e); };
    document.addEventListener('tdc:' + name, h);
    return function () { document.removeEventListener('tdc:' + name, h); };
  }
  function emit(name, detail) {
    document.dispatchEvent(new CustomEvent('tdc:' + name, { detail: detail }));
  }

  // ---------- misc ----------
  function debounce(fn, ms) {
    var t;
    return function () {
      var a = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, a); }, ms);
    };
  }
  function uid(prefix) {
    return (prefix || 'id') + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  // Animation speed for a current in amperes: absolute (not relative to the circuit's largest current) so more
  // current always means faster flow; log-compressed so 1 mA … 20 A all stay watchable. 0 A -> 0, 1 A -> ~6.7.
  function flowRate(I) { return Math.log2(1 + Math.abs(I) / 0.01); }
  // Visual swing / rotation rate (per second) for an AC frequency in Hz: absolute and log-compressed (50 Hz -> ~0.5/s).
  function acRate(f) { return 0.15 * Math.log2(1 + Math.abs(f) / 5); }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function shuffle(arr, seed) {
    // Deterministic per seed so the order stays stable for one student between visits.
    var a = arr.slice(), s = 0, i;
    for (i = 0; i < (seed || '').length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
    for (i = a.length - 1; i > 0; i--) {
      s = (s * 1103515245 + 12345) >>> 0;
      var j = s % (i + 1), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // ---------- numbers ----------
  // Parsing lives in answer-norm.js because the key builder must parse identically.
  function parseNum(str) { return TDC.answerNorm.parseNum(str); }
  /** Format with locale decimal separator and SI prefix: fmtSI(0.0435,'A') -> "43.5 mA". */
  var SIPRE = { p: 1e-12, n: 1e-9, 'µ': 1e-6, 'μ': 1e-6, m: 1e-3, k: 1e3, M: 1e6, G: 1e9 };
  function fmtSI(v, unit, digits) {
    if (v == null || !isFinite(v)) return '—';
    digits = digits || 3;
    if (!unit) return fmtNum(v, digits);   // a bare prefix is unreadable: x/d = 0.25, not "250 m"
    // %, °C, 1/°C and units whose first symbol is squared (mm²) take no prefix: "2.6 k°C", "500 mmm²" are wrong
    if (!/^[A-Za-zΩµμ]/.test(unit) || /^[^\/]*[²³]/.test(unit)) return fmtNum(v, digits) + ' ' + unit;
    // an already prefixed unit is rescaled to its base: 1000 nΩ·m -> "1 µΩ·m", never "1 knΩ·m"
    var pu = /^([pnµμmkMG])(Ω·m|Ω|V|A|W|F|H|S|J|C|Wh|Hz|s|m)$/.exec(unit);
    if (pu) { v *= SIPRE[pu[1]]; unit = pu[2]; }
    var a = Math.abs(v);
    var pre = [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']];
    var p = ['', 1];
    if (a !== 0) for (var i = 0; i < pre.length; i++) if (a >= pre[i][0] * 0.9995) { p = [pre[i][1], pre[i][0]]; break; }
    if (a !== 0 && a < 1e-12) p = ['p', 1e-12];
    return fmtNum(v / p[1], digits) + ' ' + p[0] + (unit || '');
  }
  /** Date + time in the UI language, 24-hour clock: "30 Oct 2026, 17:18" / "30.10.2026 klo 17.18". */
  function fmtDate(t) { return new Date(t).toLocaleString(TDC.i18n && TDC.i18n.lang, { dateStyle: 'medium', timeStyle: 'short', hourCycle: 'h23' }); }
  function fmtNum(v, digits) {
    if (v == null || !isFinite(v)) return '—';
    var s = Number(v.toPrecision(digits || 3));
    var out = String(Math.abs(s) >= 1e6 || (Math.abs(s) < 1e-4 && s !== 0) ? s.toExponential(2) : s)
      .replace(/e([-+]?)(\d+)$/, function (m, sg, d) {          // 1.60e-19 -> 1.60·10⁻¹⁹ (maths notation, not code)
        return '·10' + (sg === '-' ? '⁻' : '') + d.replace(/\d/g, function (c) { return '⁰¹²³⁴⁵⁶⁷⁸⁹'[c]; });
      });
    return TDC.i18n && TDC.i18n.lang === 'fi' ? out.replace('.', ',') : out;
  }

  // ---------- registries ----------
  TDC.GLOSSARY = TDC.GLOSSARY || {};
  TDC.FORMULAS = TDC.FORMULAS || [];
  TDC.registerTopic = function (def) {
    TDC.topics[def.id] = def;
    (def.questions || []).forEach(function (q) { q.topic = def.id; });
    // Each topic contributes its own glossary terms and formula-sheet entries (no shared file to edit).
    if (def.glossary) Object.keys(def.glossary).forEach(function (k) { if (!TDC.GLOSSARY[k]) TDC.GLOSSARY[k] = def.glossary[k]; });
    if (def.formulas && def.formulas.length) TDC.FORMULAS.push({ topic: def.id, title: def.title, items: def.formulas });
  };
  TDC.questionById = function (qid) {
    for (var id in TDC.topics) {
      var qs = TDC.topics[id].questions || [];
      for (var i = 0; i < qs.length; i++) if (qs[i].id === qid) return qs[i];
    }
    return null;
  };

  var widgetFactories = {};
  TDC.widgets = {
    register: function (name, factory) { widgetFactories[name] = factory; },
    has: function (name) { return !!widgetFactories[name]; },
    create: function (name, host, config, ctx) {
      var f = widgetFactories[name];
      if (!f) { host.textContent = 'Unknown widget: ' + name; return null; }
      try { return f(host, config || {}, ctx); }
      catch (e) { console.error('[TDC] widget ' + name + ' failed', e); host.textContent = '⚠ ' + e.message; return null; }
    }
  };

  TDC.util = {
    el: el, svg: svg, append: append, on: on, emit: emit, debounce: debounce, uid: uid, clamp: clamp,
    // number as text in the UI language (fi decimal comma); digits = fixed decimals, omitted = as is
    locNum: function (n, digits) { var s = digits == null ? String(n) : n.toFixed(digits); return TDC.i18n && TDC.i18n.lang === 'fi' ? s.replace('.', ',') : s; },
    escapeHtml: escapeHtml, shuffle: shuffle, flowRate: flowRate, acRate: acRate, parseNum: parseNum, fmtSI: fmtSI, fmtNum: fmtNum, fmtDate: fmtDate,
    $: function (s, r) { return (r || document).querySelector(s); },
    $$: function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); },
    reducedMotion: function () { return matchMedia('(prefers-reduced-motion: reduce)').matches; }
  };
  TDC.on = on; TDC.emit = emit;
})(window);

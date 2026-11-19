/* Answer normalisation shared by the browser (TDC.answerNorm) and tools/build-keys.mjs (require()).
 * Both sides must turn an answer into the SAME canonical string before hashing, so keep this file
 * dependency-free and deterministic. Changing it requires rebuilding keys.js. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.TDC = root.TDC || {}; root.TDC.answerNorm = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PREFIX = { p: 1e-12, n: 1e-9, u: 1e-6, 'µ': 1e-6, 'μ': 1e-6, m: 1e-3, k: 1e3, K: 1e3, M: 1e6, G: 1e9 };

  /** "4,7 kΩ" | "4.7k" | "4k7" | "-1.2e-3" | "12 mA" -> number (NaN if invalid). */
  function parseNum(str) {
    if (typeof str === 'number') return str;
    var s = String(str == null ? '' : str).trim().replace(/\s+/g, '').replace(/[−–]/g, '-');
    if (!s) return NaN;
    s = s.replace(/(Ω|ohms?|Wh|V|A|W|J|C|S|F|H|s|%)$/i, '');
    var rk = /^(-?\d+)([pnuµμmkKMG])(\d+)$/.exec(s);           // resistor notation 4k7
    if (rk) return parseFloat(rk[1] + '.' + rk[3]) * PREFIX[rk[2]];
    s = s.replace(',', '.');
    var m = /^([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)([pnuµμmkKMG])?$/.exec(s);
    if (!m) return NaN;
    var v = parseFloat(m[1]);
    return m[2] ? v * PREFIX[m[2]] : v;
  }

  /** Significant figures of a typed number: "9,0" | "76.6·10⁻³" | "7.66e-2" -> {sign, d: '766', e: -2,
   *  mant: '76.6', pow: -3} (d = significant digits, e = power of ten of the first one); null if invalid.
   *  Trailing zeros count only with a decimal point (70 has 1 s.f., 70. and 70.0 have 2 and 3). */
  function sigParse(str) {
    var s = String(str == null ? '' : str).normalize('NFKC').replace(/\s+/g, '').replace(/[−–]/g, '-').replace(',', '.');
    var pow = 0, px = /^(.+?)(?:[eE]|[·×*xX]10\^?)([-+]?\d+)$/.exec(s);
    if (px) { s = px[1]; pow = parseInt(px[2], 10); }
    var m = /^([-+]?)(\d*)(?:\.(\d*))?$/.exec(s);
    if (!m || !(m[2] + (m[3] || ''))) return null;
    var all = m[2] + (m[3] || ''), i = all.search(/[1-9]/);
    if (i < 0) return { sign: '', d: '0', e: 0, mant: s, pow: pow };
    var d = all.slice(i);
    if (m[3] == null) d = d.replace(/0+$/, '');
    return { sign: m[1] === '-' ? '-' : '', d: d, e: m[2].length - 1 - i + pow, mant: s.replace(/^\+/, ''), pow: pow };
  }

  var KIND_BY_TYPE = { mc: 'choice', multi: 'set', order: 'seq', match: 'pairs', fill: 'text',
    numeric: 'num', slider: 'num', circuit: 'num', plot: 'num', fbd: 'pairs' };

  /** Field descriptors of a question: [{id, kind, tol, zeroTol}] */
  function fieldsOf(q) {
    var base = KIND_BY_TYPE[q.type] || 'text';
    var list = q.fields && q.fields.length ? q.fields : [{ id: 'v' }];
    return list.map(function (f) {
      return { id: f.id, kind: f.kind || base, tol: f.tol != null ? f.tol : (q.tol != null ? q.tol : 0.02),
        zeroTol: f.zeroTol != null ? f.zeroTol : 1e-9 };
    });
  }

  function text(s) {
    return String(s == null ? '' : s).normalize('NFKC').toLowerCase().trim()
      .replace(/\s+/g, ' ').replace(/[.!]+$/, '');
  }

  function bucketIndex(v, tol) { return Math.round(Math.log(Math.abs(v)) / Math.log(1 + tol)); }
  function numKey(sign, k) { return 'n:' + sign + k; }

  /** Canonical string of a CORRECT answer (build side). */
  function canonical(field, value) {
    switch (field.kind) {
      case 'num': {
        var v = parseNum(value);
        if (!isFinite(v)) throw new Error('Not a number: ' + value);
        if (Math.abs(v) <= field.zeroTol) return 'n:0';
        return numKey(v < 0 ? '-' : '+', bucketIndex(v, field.tol));
      }
      case 'sig': {           // value AND number of significant figures must match: 9.0 ≠ 9 ≠ 9.00
        var g = sigParse(value);
        if (!g) throw new Error('Not a number: ' + value);
        return 'g:' + g.sign + g.d + 'e' + g.e;
      }
      case 'choice': return 'c:' + text(value);
      case 'set': return 's:' + (value || []).map(text).sort().join(',');
      case 'seq': return 'q:' + (value || []).map(text).join(',');
      case 'pairs': return 'p:' + Object.keys(value || {}).map(function (k) { return text(k) + '=' + text(value[k]); }).sort().join(',');
      default: return 't:' + text(value);
    }
  }

  /** Candidate strings for a STUDENT answer; any candidate equal to a canonical answer counts as correct.
   *  Numeric answers also try the neighbouring buckets, so values within ±tol are always accepted
   *  (and at most ±2·tol). */
  function candidates(field, value) {
    if (field.kind !== 'num') {
      try { return [canonical(field, value)]; } catch (e) { return []; }
    }
    var v = parseNum(value);
    if (!isFinite(v)) return [];
    if (Math.abs(v) <= field.zeroTol) return ['n:0'];
    var k = bucketIndex(v, field.tol), s = v < 0 ? '-' : '+';
    return [numKey(s, k), numKey(s, k - 1), numKey(s, k + 1)];
  }

  /** Part ids graded one by one (partial credit) for match and fbd questions; null for other types.
   *  fbd: each force of the palette, then each compared pair 'A~B' (Mechanics course addition). */
  function partIds(q) {
    if (q.type === 'match') return q.left.map(function (l) { return l.id; });
    if (q.type !== 'fbd') return null;
    var c = q.widget.config;
    return c.forces.map(function (f) { return f.id; }).concat((c.compare || []).map(function (p) { return p[0] + '~' + p[1]; }));
  }

  return { partIds: partIds, parseNum: parseNum, sigParse: sigParse, fieldsOf: fieldsOf, canonical: canonical, candidates: candidates, text: text };
});

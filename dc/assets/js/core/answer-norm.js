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

  var KIND_BY_TYPE = { mc: 'choice', multi: 'set', order: 'seq', match: 'pairs', fill: 'text',
    numeric: 'num', slider: 'num', circuit: 'num', plot: 'num' };

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

  return { parseNum: parseNum, fieldsOf: fieldsOf, canonical: canonical, candidates: candidates, text: text };
});

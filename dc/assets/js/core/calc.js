/* Calculator engine (no eval): parse -> tree, evaluate, render the tree as MathML (the "interpreted as"
 * preview), and solve linear systems. Pure functions so tools/test-calc.mjs can run it in Node.
 * Syntax: + - * / ^ ( ), SI prefixes (4k7, 10m, 2.2µ), a||b (parallel resistors), sqrt sin cos tan
 * (degrees) ln log exp abs, pi e, ans, variables (R1 = 4k7). Each tree records which features it uses
 * (FEATURES / locked() can restrict them; the app currently allows all). */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.TDC = root.TDC || {}; root.TDC.calc = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PRE = { p: -12, n: -9, u: -6, 'µ': -6, m: -3, k: 3, M: 6, G: 9 };   // SI prefix -> power of ten
  function deg(f) { return function (x) { return f(x * Math.PI / 180); }; }
  var FN = { sqrt: Math.sqrt, sin: deg(Math.sin), cos: deg(Math.cos), tan: deg(Math.tan), ln: Math.log, log: Math.log10, abs: Math.abs, exp: Math.exp };
  var FEATURES = ['prefixes', 'powers', 'parallel', 'functions', 'memory', 'solver'];
  var GREEK = { alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', Delta: 'Δ', epsilon: 'ε', theta: 'θ', lambda: 'λ', mu: 'µ', rho: 'ρ', sigma: 'σ', tau: 'τ', phi: 'φ', omega: 'ω', Omega: 'Ω' };

  function CalcError(key, arg) { var e = new Error(key + (arg ? ' ' + arg : '')); e.key = key; e.arg = arg; return e; }

  /** Parse input. Returns {tree, used:{feature:true}}. Throws CalcError {key, arg}. */
  function parse(src) {
    var s = String(src).replace(/\s+/g, '').replace(/,/g, '.').replace(/[×⋅·]/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-').replace(/∥/g, '||');
    var i = 0, used = {};
    if (!s) throw CalcError('empty');
    function peek() { return s[i]; }
    function expr() { var a = term(); while (peek() === '+' || peek() === '-') { var o = s[i++]; a = { t: 'bin', op: o, a: a, b: term() }; } return a; }
    function term() {
      var a = unary();
      while (peek() === '*' || peek() === '/' || peek() === '|') {
        var o = s[i++];
        if (o === '|') { if (s[i] !== '|') throw CalcError('at', '|'); i++; o = '||'; used.parallel = true; }
        a = { t: 'bin', op: o, a: a, b: unary() };
      }
      return a;
    }
    // Unary minus binds looser than ^, so -2^2 = -(2^2) as in maths notation.
    function unary() { if (peek() === '-') { i++; return { t: 'neg', a: unary() }; } if (peek() === '+') { i++; return unary(); } return power(); }
    function power() { var b = atom(); if (peek() === '^') { i++; used.powers = true; return { t: 'bin', op: '^', a: b, b: unary() }; } return b; }
    function close() { if (i >= s.length) throw CalcError('paren'); if (s[i] !== ')') throw CalcError('at', s[i]); i++; }
    function atom() {
      if (i >= s.length) throw CalcError('end');
      if (peek() === '(') { i++; var g = expr(); close(); return { t: 'grp', a: g }; }
      var m = /^(\d+\.?\d*|\.\d+)(e[-+]?\d+)?/i.exec(s.slice(i));
      if (m) {
        i += m[0].length;
        var n = { t: 'num', txt: m[1], e: m[2] ? parseInt(m[2].slice(1), 10) : 0 };
        var p = s[i];
        if (p && p in PRE && !/[A-Za-zµπ(]/.test(s[i + 1] || '')) {
          i++; used.prefixes = true; n.pre = p;
          var frac = !m[2] && m[1].indexOf('.') < 0 && /^\d+/.exec(s.slice(i));       // resistor notation 4k7
          if (frac) { i += frac[0].length; n.txt = m[1] + '.' + frac[0]; }
          n.e += PRE[p];
        }
        n.v = parseFloat(n.txt) * Math.pow(10, n.e);
        return n;
      }
      var w = /^[A-Za-zΑ-Ωα-ωµπ][A-Za-z0-9_Α-Ωα-ω]*/.exec(s.slice(i));
      if (w) {
        i += w[0].length;
        var name = w[0], low = name.toLowerCase();
        if (s[i] === '(' && FN[low]) {
          used[low === 'sqrt' ? 'powers' : 'functions'] = true;
          i++; var arg = expr(); close(); return { t: 'fn', name: low, a: arg };
        }
        if (low === 'pi' || name === 'π' || name === 'e') { used.functions = true; return { t: 'const', name: name === 'e' ? 'e' : 'π' }; }
        used.memory = true;
        return { t: 'var', name: low === 'ans' ? 'ans' : name };
      }
      throw CalcError('at', s[i]);
    }
    var target = null, am = /^([A-Za-zΑ-Ωα-ω][A-Za-z0-9_Α-Ωα-ω]*)=/.exec(s);
    if (am) { target = am[1]; i = am[0].length; used.memory = true; }
    var tree = expr();
    if (i < s.length) throw CalcError(s[i] === ')' ? 'extraParen' : 'at', s[i]);
    return { tree: target ? { t: 'set', name: target, a: tree } : tree, used: used };
  }

  /** Features used by a parse result that are not allowed: [] when everything is allowed. */
  function locked(parsed, allowed) { return FEATURES.filter(function (f) { return parsed.used[f] && !(allowed && allowed[f]); }); }

  function evaluate(n, env) {
    switch (n.t) {
      case 'num': return n.v;
      case 'const': return n.name === 'e' ? Math.E : Math.PI;
      case 'var': if (!(n.name in env)) throw CalcError('var', n.name); return env[n.name];
      case 'grp': return evaluate(n.a, env);
      case 'neg': return -evaluate(n.a, env);
      case 'fn': return FN[n.name](evaluate(n.a, env));
      case 'set': return (env[n.name] = evaluate(n.a, env));
      case 'bin':
        var a = evaluate(n.a, env), b = evaluate(n.b, env);
        switch (n.op) {
          case '+': return a + b; case '-': return a - b; case '*': return a * b; case '/': return a / b;
          case '^': return Math.pow(a, b); default: return a * b / (a + b);   // a||b
        }
    }
    throw CalcError('at', '?');
  }

  // ---------- MathML ----------
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function row(x) { return '<mrow>' + x + '</mrow>'; }
  function mo(s) { return '<mo>' + s + '</mo>'; }
  function mn(txt, dec) { return '<mn>' + esc(dec === ',' ? String(txt).replace('.', ',') : txt) + '</mn>'; }
  function pow10(e) { return '<msup><mn>10</mn><mn>' + (e < 0 ? '−' + -e : e) + '</mn></msup>'; }
  /** x1 -> x with subscript 1, R_AB -> R with subscript AB, rho -> ρ. */
  function varMl(name) {
    var m = /^([^_]+)_(.+)$/.exec(name) || /^([A-Za-zΑ-Ωα-ω]+?)(\d+)$/.exec(name);
    function sym(x) { x = GREEK[x] || x; return x.length > 1 ? '<mi mathvariant="normal">' + esc(x) + '</mi>' : '<mi>' + esc(x) + '</mi>'; }
    if (name === 'ans') return '<mi mathvariant="normal">ans</mi>';
    return m ? '<msub>' + sym(m[1]) + (/^\d+$/.test(m[2]) ? '<mn>' + m[2] + '</mn>' : sym(m[2])) + '</msub>' : sym(name);
  }
  function bare(n) { return n.t === 'grp' ? n.a : n; }
  function fence(x) { return row(mo('(') + x + mo(')')); }
  function toMathML(n, dec) {
    function ml(n) {
      switch (n.t) {
        case 'num':
          var base = mn(n.txt, dec), e = n.e;
          return e ? row(base + mo('·') + pow10(e)) : base;
        case 'const': return '<mi>' + n.name + '</mi>';
        case 'var': return varMl(n.name);
        case 'grp': return fence(ml(n.a));
        case 'neg': return row(mo('−') + ml(n.a));
        case 'set': return row(varMl(n.name) + mo('=') + ml(n.a));
        case 'fn':
          var a = ml(bare(n.a));
          if (n.name === 'sqrt') return '<msqrt>' + a + '</msqrt>';
          if (n.name === 'abs') return row(mo('|') + a + mo('|'));
          if (n.name === 'exp') return '<msup><mi>e</mi>' + a + '</msup>';
          var fname = n.name === 'log' ? '<msub><mi>log</mi><mn>10</mn></msub>' : '<mi>' + n.name + '</mi>';
          var deg = /^(sin|cos|tan)$/.test(n.name) ? mo('°') : '';     // shows that angles are in degrees
          return row(fname + mo('&#x2061;') + fence(a + deg));
        case 'bin':
          if (n.op === '/') return '<mfrac>' + ml(bare(n.a)) + ml(bare(n.b)) + '</mfrac>';
          if (n.op === '^') return '<msup>' + ml(n.a) + ml(bare(n.b)) + '</msup>';
          return row(ml(n.a) + mo({ '+': '+', '-': '−', '*': '·', '||': '∥' }[n.op]) + ml(n.b));
      }
      return '';
    }
    return ml(n);
  }
  /** A plain number as MathML: 4700 -> 4700, 0.0047 -> 4.7·10⁻³ (engineering exponent). */
  function numberMl(v, dec) {
    var a = Math.abs(v);
    if (a === 0 || (a >= 1e-3 && a < 1e4)) return mn(String(+v.toPrecision(6)), dec);
    var e = Math.floor(Math.log10(a) / 3) * 3, m = +(v / Math.pow(10, e)).toPrecision(6);
    if (Math.abs(m) >= 1000) { e += 3; m = +(m / 1000).toPrecision(6); }
    return row(mn(String(m), dec) + mo('·') + pow10(e));
  }

  /** Solve A·x = b (Gauss-Jordan with partial pivoting). Returns null when singular. */
  function solve(A, b) {
    var n = b.length, M = A.map(function (r, i) { return r.slice().concat(b[i]); }), r, j;
    for (var c = 0; c < n; c++) {
      var p = c;
      for (r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      if (!(Math.abs(M[p][c]) > 1e-12)) return null;
      var t = M[c]; M[c] = M[p]; M[p] = t;
      for (r = 0; r < n; r++) if (r !== c) { var k = M[r][c] / M[c][c]; for (j = c; j <= n; j++) M[r][j] -= k * M[c][j]; }
    }
    return M.map(function (rw, i) { return rw[n] / rw[i]; });
  }

  return { FEATURES: FEATURES, parse: parse, locked: locked, evaluate: evaluate, toMathML: toMathML, numberMl: numberMl, varMl: varMl, solve: solve };
});

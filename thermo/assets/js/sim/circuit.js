/* DC circuit solver (Modified Nodal Analysis) for grid-based netlists.
 * Elements are two-terminal and sit between grid points a=[x,y] and b=[x,y]:
 *   R (resistor, value Ω), lamp (resistor that glows, value Ω, rated W in `rated`),
 *   V (ideal voltage source, value V, + terminal at b), I (ideal current source, value A, pushes a→b),
 *   W (wire), ammeter (ideal = wire), switch (closed = wire, open = gap), voltmeter (ideal = open).
 * Wires/ammeters are modelled as 1 µΩ so their currents are known (needed for the flow animation);
 * every node gets a 1e-12 S leak to ground so floating parts don't make the matrix singular. */
(function (TDC) {
  'use strict';
  var R_WIRE = 1e-6, GMIN = 1e-12, SHORT_A = 1000;

  function key(p) { return p[0] + ',' + p[1]; }
  function onSegment(p, a, b) {
    if (a[0] === b[0] && p[0] === a[0]) return p[1] > Math.min(a[1], b[1]) && p[1] < Math.max(a[1], b[1]);
    if (a[1] === b[1] && p[1] === a[1]) return p[0] > Math.min(a[0], b[0]) && p[0] < Math.max(a[0], b[0]);
    return false;
  }

  /** A grid point strictly inside a part's span lies on one of its leads (drawn as wire): return that lead's
   * terminal. The exact centre is the part body (no connection): false. Not on any part: null.
   * Bodies are at most 40 px long and grid points 60 px apart, so only the centre point can fall on a body. */
  function leadTap(p, parts) {
    for (var i = 0; i < parts.length; i++) {
      var q = parts[i];
      if (!onSegment(p, q.a, q.b)) continue;
      var da = Math.abs(p[0] - q.a[0]) + Math.abs(p[1] - q.a[1]), db = Math.abs(p[0] - q.b[0]) + Math.abs(p[1] - q.b[1]);
      return da === db ? false : da < db ? q.a : q.b;
    }
    return null;
  }

  /** Expand wires (polylines) into 2-point segments, split wherever another terminal touches them. */
  function segmentsOf(wires, terminals) {
    var segs = [];
    wires.forEach(function (w, wi) {
      var pts = w.points || w;
      for (var i = 0; i < pts.length - 1; i++) {
        var a = pts[i], b = pts[i + 1];
        var cuts = terminals.filter(function (t) { return onSegment(t, a, b); });
        cuts.sort(function (p, q) { return (Math.abs(p[0] - a[0]) + Math.abs(p[1] - a[1])) - (Math.abs(q[0] - a[0]) + Math.abs(q[1] - a[1])); });
        var chain = [a].concat(cuts, [b]);
        for (var j = 0; j < chain.length - 1; j++) segs.push({ wire: wi, seg: i, a: chain[j], b: chain[j + 1] });
      }
    });
    return segs;
  }

  /** Gaussian elimination with partial pivoting. Returns x or null if singular. */
  function solveLinear(A, z) {
    var n = z.length, i, j, k;
    for (k = 0; k < n; k++) {
      var piv = k, max = Math.abs(A[k][k]);
      for (i = k + 1; i < n; i++) if (Math.abs(A[i][k]) > max) { max = Math.abs(A[i][k]); piv = i; }
      if (max < 1e-18) return null;
      if (piv !== k) { var t = A[k]; A[k] = A[piv]; A[piv] = t; var tz = z[k]; z[k] = z[piv]; z[piv] = tz; }
      for (i = k + 1; i < n; i++) {
        var f = A[i][k] / A[k][k];
        if (!f) continue;
        for (j = k; j < n; j++) A[i][j] -= f * A[k][j];
        z[i] -= f * z[k];
      }
    }
    var x = new Array(n);
    for (i = n - 1; i >= 0; i--) {
      var s = z[i];
      for (j = i + 1; j < n; j++) s -= A[i][j] * x[j];
      x[i] = s / A[i][i];
    }
    return x;
  }

  /**
   * Solve a circuit. circuit = {parts:[{id,type,a,b,value,closed}], wires:[[p,p,...]|{points}], ground:[x,y]}
   * opts.zeroSources: replace V by shorts and I by opens (for equivalent resistance).
   * opts.inject: {a:[x,y], b:[x,y], I:1} extra current source (test current a→b externally: enters at a).
   * Returns {ok, error, V:{nodeKey: volts}, parts:{id:{U, I, P}}, wires:[{a,b,I}], short:boolean}
   */
  function solve(circuit, opts) {
    opts = opts || {};
    var parts = (circuit.parts || []).filter(function (p) { return !p.hidden; });
    var terminals = [];
    parts.forEach(function (p) { terminals.push(p.a, p.b); });
    (circuit.wires || []).forEach(function (w) { (w.points || w).forEach(function (p) { terminals.push(p); }); });
    var segs = segmentsOf(circuit.wires || [], terminals);

    // Elements list
    var els = [];
    parts.forEach(function (p) {
      var t = p.type;
      if (t === 'R' || t === 'lamp') els.push({ kind: 'R', R: Math.max(+p.value || 0, R_WIRE), a: p.a, b: p.b, part: p });
      else if (t === 'ammeter' || t === 'W' || (t === 'switch' && p.closed)) els.push({ kind: 'R', R: R_WIRE, a: p.a, b: p.b, part: p });
      else if (t === 'V') els.push(opts.zeroSources ? { kind: 'R', R: R_WIRE, a: p.a, b: p.b, part: p } : { kind: 'V', V: +p.value || 0, a: p.a, b: p.b, part: p });
      else if (t === 'I') { if (!opts.zeroSources) els.push({ kind: 'I', I: +p.value || 0, a: p.a, b: p.b, part: p }); }
      // voltmeter & open switch: no element
    });
    segs.forEach(function (s) { els.push({ kind: 'R', R: R_WIRE, a: s.a, b: s.b, seg: s }); });
    // A wire or part ending on another part's lead is joined to that lead's terminal (the lead is a conductor).
    var tapped = {};
    terminals.forEach(function (t) {
      var k = key(t), at = !tapped[k] && leadTap(t, parts);
      if (at) { tapped[k] = true; els.push({ kind: 'R', R: R_WIRE, a: t, b: at }); }
    });
    if (opts.inject) els.push({ kind: 'I', I: opts.inject.I || 1, a: opts.inject.b, b: opts.inject.a, test: true });

    // Nodes
    var index = {}, nodes = [];
    function nodeOf(p) { var k = key(p); if (!(k in index)) { index[k] = nodes.length; nodes.push(k); } return index[k]; }
    var gKey = circuit.ground ? key(circuit.ground) : null;
    if (!gKey) { var vs = parts.find(function (p) { return p.type === 'V'; }); gKey = vs ? key(vs.a) : (terminals[0] ? key(terminals[0]) : null); }
    if (gKey) { index[gKey] = 0; nodes.push(gKey); }
    terminals.forEach(nodeOf);
    els.forEach(function (e) { e.na = nodeOf(e.a); e.nb = nodeOf(e.b); });

    var n = nodes.length - 1;                     // unknown node voltages (ground = 0)
    var vsrc = els.filter(function (e) { return e.kind === 'V'; });
    var m = vsrc.length, size = n + m;
    if (size === 0) return { ok: true, V: {}, parts: {}, wires: [], short: false };
    var A = [], z = new Array(size).fill(0), i;
    for (i = 0; i < size; i++) A.push(new Array(size).fill(0));
    function stamp(r, c, v) { if (r > 0 && c > 0) A[r - 1][c - 1] += v; }
    for (i = 1; i <= n; i++) A[i - 1][i - 1] += GMIN;
    els.forEach(function (e) {
      if (e.kind === 'R') { var g = 1 / e.R; stamp(e.na, e.na, g); stamp(e.nb, e.nb, g); stamp(e.na, e.nb, -g); stamp(e.nb, e.na, -g); }
      else if (e.kind === 'I') { if (e.na > 0) z[e.na - 1] -= e.I; if (e.nb > 0) z[e.nb - 1] += e.I; }
    });
    vsrc.forEach(function (e, k) {
      var r = n + k;
      // V(b) - V(a) = V ; extra unknown = current flowing through the source from a to b (out of +)
      if (e.nb > 0) { A[r][e.nb - 1] += 1; A[e.nb - 1][r] -= 1; }
      if (e.na > 0) { A[r][e.na - 1] -= 1; A[e.na - 1][r] += 1; }
      z[r] = e.V;
    });
    var x = solveLinear(A, z);
    if (!x || x.some(function (v) { return !isFinite(v); })) return { ok: false, error: 'singular', V: {}, parts: {}, wires: [], short: false };

    var V = {}; nodes.forEach(function (k, idx) { V[k] = idx === 0 ? 0 : x[idx - 1]; });
    function v(idx) { return idx === 0 ? 0 : x[idx - 1]; }
    var out = { ok: true, V: V, parts: {}, wires: [], short: false, maxV: 0 };
    els.forEach(function (e) {
      var U = v(e.na) - v(e.nb), I;
      if (e.kind === 'R') I = U / e.R;
      else if (e.kind === 'I') I = e.I;
      else I = x[n + vsrc.indexOf(e)];
      if (Math.abs(I) > SHORT_A) out.short = true;
      if (e.part) {
        // Report sources by their own convention: U = V(b)-V(a) (terminal voltage), I = a→b inside
        var P = e.kind === 'V' || e.kind === 'I' ? -U * I : U * I;   // sources: power delivered (>0 when supplying)
        out.parts[e.part.id] = { U: e.kind === 'R' ? U : -U, I: I, P: e.kind === 'R' ? U * I : P };
        if (e.part.type === 'switch' || e.part.type === 'ammeter') { out.parts[e.part.id].U = 0; out.parts[e.part.id].P = 0; }
      } else if (e.seg) out.wires.push({ wire: e.seg.wire, seg: e.seg.seg, a: e.a, b: e.b, I: I });
    });
    // Non-element parts (voltmeters, open switches): measure the voltage across them.
    parts.forEach(function (p) {
      if (out.parts[p.id]) return;
      var Ua = V[key(p.a)] || 0, Ub = V[key(p.b)] || 0;
      out.parts[p.id] = { U: Ua - Ub, I: 0, P: 0 };
    });
    for (var k in V) out.maxV = Math.max(out.maxV, Math.abs(V[k]));
    if (out.maxV > 1e6) out.floating = true;     // e.g. a current source with nowhere to go
    return out;
  }

  /** Equivalent resistance seen between grid points a and b (independent sources zeroed). */
  function equivalentResistance(circuit, a, b) {
    var r = solve(Object.assign({}, circuit, { ground: b }), { zeroSources: true, inject: { a: a, b: b, I: 1 } });
    if (!r.ok) return NaN;
    var U = (r.V[key(a)] || 0) - (r.V[key(b)] || 0);
    return U > 1e9 ? Infinity : U;
  }

  TDC.sim = { solve: solve, equivalentResistance: equivalentResistance, key: key, leadTap: leadTap, segmentsOf: segmentsOf, solveLinear: solveLinear, R_WIRE: R_WIRE };
})(window.TDC);

/* DC and AC (phasor) circuit solver (complex Modified Nodal Analysis) for grid-based netlists.
 * Elements are two-terminal and sit between grid points a=[x,y] and b=[x,y]:
 *   R (resistor, value Ω), lamp (resistor that glows, value Ω, rated W in `rated`),
 *   V (ideal voltage source, value V, + terminal at b), I (ideal current source, value A, pushes a→b),
 *   C (capacitor, value F), L (inductor, value H),
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

  /** Complex Gaussian elimination: matrix Ar + j·Ai, right side zr + j·zi. Returns [[re, im], ...] or null if singular. */
  function solveComplex(Ar, Ai, zr, zi) {
    var n = zr.length, i, j, k;
    for (k = 0; k < n; k++) {
      var piv = k, max = Math.hypot(Ar[k][k], Ai[k][k]);
      for (i = k + 1; i < n; i++) { var a = Math.hypot(Ar[i][k], Ai[i][k]); if (a > max) { max = a; piv = i; } }
      if (max < 1e-18) return null;
      if (piv !== k) {
        var t = Ar[k]; Ar[k] = Ar[piv]; Ar[piv] = t; t = Ai[k]; Ai[k] = Ai[piv]; Ai[piv] = t;
        t = zr[k]; zr[k] = zr[piv]; zr[piv] = t; t = zi[k]; zi[k] = zi[piv]; zi[piv] = t;
      }
      var d = Ar[k][k] * Ar[k][k] + Ai[k][k] * Ai[k][k];
      for (i = k + 1; i < n; i++) {
        if (!Ar[i][k] && !Ai[i][k]) continue;
        var fr = (Ar[i][k] * Ar[k][k] + Ai[i][k] * Ai[k][k]) / d, fi = (Ai[i][k] * Ar[k][k] - Ar[i][k] * Ai[k][k]) / d;   // f = A[i][k] / A[k][k]
        for (j = k; j < n; j++) { var r0 = Ar[k][j], i0 = Ai[k][j]; Ar[i][j] -= fr * r0 - fi * i0; Ai[i][j] -= fr * i0 + fi * r0; }
        var zr0 = zr[k], zi0 = zi[k]; zr[i] -= fr * zr0 - fi * zi0; zi[i] -= fr * zi0 + fi * zr0;
      }
    }
    var xr = new Array(n), xi = new Array(n);
    for (i = n - 1; i >= 0; i--) {
      var sr = zr[i], si = zi[i];
      for (j = i + 1; j < n; j++) { sr -= Ar[i][j] * xr[j] - Ai[i][j] * xi[j]; si -= Ar[i][j] * xi[j] + Ai[i][j] * xr[j]; }
      var dd = Ar[i][i] * Ar[i][i] + Ai[i][i] * Ai[i][i];
      xr[i] = (sr * Ar[i][i] + si * Ai[i][i]) / dd; xi[i] = (si * Ar[i][i] - sr * Ai[i][i]) / dd;
    }
    return xr.map(function (r, idx) { return [r, xi[idx]]; });
  }

  var DEG = 180 / Math.PI;
  function cmul(a, b) { return [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]]; }
  function cdiv(a, b) { var d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; }
  function cabs(a) { return Math.hypot(a[0], a[1]); }
  function carg(a) { return Math.abs(a[0]) < 1e-15 && Math.abs(a[1]) < 1e-15 ? 0 : Math.atan2(a[1], a[0]) * DEG; }
  function polar(mag, deg) { return [mag * Math.cos(deg / DEG), mag * Math.sin(deg / DEG)]; }
  function normDeg(d) { while (d > 180) d -= 360; while (d <= -180) d += 360; return d; }

  /**
   * Solve a circuit. circuit = {parts:[{id,type,a,b,value,closed,phase}], wires:[[p,p,...]|{points}], ground:[x,y], f}
   * f (Hz) > 0 = AC steady state: sources are sinusoidal, value = RMS, phase in degrees; C and L get the
   * impedances 1/(jωC) and jωL. Without f (DC): C is an open circuit, L a short (steady state, no transients).
   * opts.zeroSources: replace V by shorts and I by opens (for equivalent resistance/impedance).
   * opts.inject: {a:[x,y], b:[x,y], I:1} extra current source (test current a→b externally: enters at a).
   * Returns {ok, error, ac, f, V:{nodeKey: volts}, Vc:{nodeKey:[re,im]}, parts:{id:{U, I, P, ...}}, wires:[{a,b,I,ph}], short}
   * DC: U, I, P are signed reals (unchanged). AC: U, I = RMS magnitudes, phU/phI = phase angles (deg), phi = phU − phI,
   * P = active power (W), Q = reactive power (var), S = apparent power (VA), Uc/Ic = complex RMS phasors.
   */
  function solve(circuit, opts) {
    opts = opts || {};
    var f = +circuit.f || 0, ac = f > 0, w = 2 * Math.PI * f;
    var parts = (circuit.parts || []).filter(function (p) { return !p.hidden; });
    var terminals = [];
    parts.forEach(function (p) { terminals.push(p.a, p.b); });
    (circuit.wires || []).forEach(function (wi) { (wi.points || wi).forEach(function (p) { terminals.push(p); }); });
    var segs = segmentsOf(circuit.wires || [], terminals);

    // Elements: passive parts are admittances Y = [re, im]
    var els = [];
    function Yr(R) { return [1 / Math.max(R, R_WIRE), 0]; }
    parts.forEach(function (p) {
      var t = p.type, v = +p.value || 0;
      if (t === 'R' || t === 'lamp') els.push({ kind: 'Y', Y: Yr(v), a: p.a, b: p.b, part: p });
      else if (t === 'C') { if (ac) els.push({ kind: 'Y', Y: [0, w * v], a: p.a, b: p.b, part: p }); }
      else if (t === 'L') els.push({ kind: 'Y', Y: ac ? [0, -1 / Math.max(w * v, R_WIRE)] : Yr(R_WIRE), a: p.a, b: p.b, part: p });
      else if (t === 'ammeter' || t === 'W' || (t === 'switch' && p.closed)) els.push({ kind: 'Y', Y: Yr(R_WIRE), a: p.a, b: p.b, part: p });
      else if (t === 'V') els.push(opts.zeroSources ? { kind: 'Y', Y: Yr(R_WIRE), a: p.a, b: p.b, part: p } : { kind: 'V', V: ac ? polar(v, +p.phase || 0) : [v, 0], a: p.a, b: p.b, part: p });
      else if (t === 'I') { if (!opts.zeroSources) els.push({ kind: 'I', I: ac ? polar(v, +p.phase || 0) : [v, 0], a: p.a, b: p.b, part: p }); }
      // voltmeter, open switch (and C in DC): no element
    });
    segs.forEach(function (s) { els.push({ kind: 'Y', Y: Yr(R_WIRE), a: s.a, b: s.b, seg: s }); });
    // A wire or part ending on another part's lead is joined to that lead's terminal (the lead is a conductor).
    var tapped = {};
    terminals.forEach(function (t) {
      var k = key(t), at = !tapped[k] && leadTap(t, parts);
      if (at) { tapped[k] = true; els.push({ kind: 'Y', Y: Yr(R_WIRE), a: t, b: at }); }
    });
    if (opts.inject) els.push({ kind: 'I', I: [opts.inject.I || 1, 0], a: opts.inject.b, b: opts.inject.a, test: true });

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
    if (size === 0) return { ok: true, ac: ac, f: f, V: {}, Vc: {}, parts: {}, wires: [], short: false };
    var Ar = [], Ai = [], zr = new Array(size).fill(0), zi = new Array(size).fill(0), i;
    for (i = 0; i < size; i++) { Ar.push(new Array(size).fill(0)); Ai.push(new Array(size).fill(0)); }
    function stamp(r, c, y) { if (r > 0 && c > 0) { Ar[r - 1][c - 1] += y[0]; Ai[r - 1][c - 1] += y[1]; } }
    for (i = 1; i <= n; i++) Ar[i - 1][i - 1] += GMIN;
    els.forEach(function (e) {
      if (e.kind === 'Y') { var y = e.Y, ny = [-y[0], -y[1]]; stamp(e.na, e.na, y); stamp(e.nb, e.nb, y); stamp(e.na, e.nb, ny); stamp(e.nb, e.na, ny); }
      else if (e.kind === 'I') {
        if (e.na > 0) { zr[e.na - 1] -= e.I[0]; zi[e.na - 1] -= e.I[1]; }
        if (e.nb > 0) { zr[e.nb - 1] += e.I[0]; zi[e.nb - 1] += e.I[1]; }
      }
    });
    vsrc.forEach(function (e, k) {
      var r = n + k;
      // V(b) - V(a) = V ; extra unknown = current flowing through the source from a to b (out of +)
      if (e.nb > 0) { Ar[r][e.nb - 1] += 1; Ar[e.nb - 1][r] -= 1; }
      if (e.na > 0) { Ar[r][e.na - 1] -= 1; Ar[e.na - 1][r] += 1; }
      zr[r] = e.V[0]; zi[r] = e.V[1];
    });
    var x = solveComplex(Ar, Ai, zr, zi);
    if (!x || x.some(function (q) { return !isFinite(q[0]) || !isFinite(q[1]); })) return { ok: false, error: 'singular', ac: ac, f: f, V: {}, Vc: {}, parts: {}, wires: [], short: false };

    function v(idx) { return idx === 0 ? [0, 0] : x[idx - 1]; }
    var V = {}, Vc = {};
    nodes.forEach(function (k, idx) { Vc[k] = v(idx); V[k] = ac ? cabs(Vc[k]) : Vc[k][0]; });
    var out = { ok: true, ac: ac, f: f, V: V, Vc: Vc, parts: {}, wires: [], short: false, maxV: 0 };
    // Uc = voltage drop a→b, Ic = current a→b. Sources report their terminal voltage and the power they deliver.
    function report(Uc, Ic, isSource) {
      if (isSource) Uc = [-Uc[0], -Uc[1]];
      var S = cmul(Uc, [Ic[0], -Ic[1]]);           // complex power U·I* (sources: delivered, as terminal voltage × current out of +)
      if (!ac) return { U: Uc[0], I: Ic[0], P: S[0] };
      var live = cabs(Ic) > 1e-12 && cabs(Uc) > 1e-12;
      return { U: cabs(Uc), I: cabs(Ic), phU: carg(Uc), phI: carg(Ic), phi: live ? normDeg(carg(Uc) - carg(Ic)) : 0,
        P: S[0], Q: S[1], S: cabs(S), Uc: Uc, Ic: Ic };
    }
    els.forEach(function (e) {
      var Uc = [v(e.na)[0] - v(e.nb)[0], v(e.na)[1] - v(e.nb)[1]], Ic;
      if (e.kind === 'Y') Ic = cmul(Uc, e.Y);
      else if (e.kind === 'I') Ic = e.I;
      else Ic = x[n + vsrc.indexOf(e)];
      if (cabs(Ic) > SHORT_A) out.short = true;
      if (e.part) {
        var q = out.parts[e.part.id] = report(Uc, Ic, e.kind !== 'Y');
        if (e.part.type === 'switch' || e.part.type === 'ammeter') { q.U = 0; q.P = 0; if (ac) { q.Q = 0; q.S = 0; q.phi = 0; } }
      } else if (e.seg) out.wires.push({ wire: e.seg.wire, seg: e.seg.seg, a: e.a, b: e.b, I: ac ? cabs(Ic) : Ic[0], ph: ac ? carg(Ic) : 0 });
    });
    // Non-element parts (voltmeters, open switches, C in DC): measure the voltage across them.
    parts.forEach(function (p) {
      if (out.parts[p.id]) return;
      var a = Vc[key(p.a)] || [0, 0], b = Vc[key(p.b)] || [0, 0];
      out.parts[p.id] = report([a[0] - b[0], a[1] - b[1]], [0, 0], false);
    });
    for (var k in V) out.maxV = Math.max(out.maxV, Math.abs(V[k]));
    if (out.maxV > 1e6) out.floating = true;     // e.g. a current source with nowhere to go
    return out;
  }

  /** Complex equivalent impedance [R, X] between grid points a and b at circuit.f (DC when f is 0). Open → [Infinity, 0]. */
  function equivalentImpedance(circuit, a, b) {
    var r = solve(Object.assign({}, circuit, { ground: b }), { zeroSources: true, inject: { a: a, b: b, I: 1 } });
    if (!r.ok) return null;
    var va = r.Vc[key(a)] || [0, 0], vb = r.Vc[key(b)] || [0, 0], Z = [va[0] - vb[0], va[1] - vb[1]];
    return cabs(Z) > 1e9 ? [Infinity, 0] : Z;
  }
  /** Equivalent resistance seen between grid points a and b (independent sources zeroed). In AC: |Z|. */
  function equivalentResistance(circuit, a, b) {
    var z = equivalentImpedance(circuit, a, b);
    return !z ? NaN : circuit.f > 0 ? cabs(z) : z[0];
  }

  TDC.sim = { solve: solve, equivalentResistance: equivalentResistance, equivalentImpedance: equivalentImpedance, key: key, leadTap: leadTap, segmentsOf: segmentsOf,
    solveLinear: solveLinear, solveComplex: solveComplex, complex: { mul: cmul, div: cdiv, abs: cabs, arg: carg, polar: polar }, R_WIRE: R_WIRE };
})(window.TDC);

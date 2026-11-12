/* Topic 5: Phases, vapour pressure and humidity. Source: ph2-4 p09-p17 + tables/p01 (errata applied).
 * NO answers in this file: they live in src/answers/topic5.json. Block ids are stable; never rename. */
(function () {
  'use strict';
  // <helpers>
  var PH = TDC.thermo || { SAT: [] }, SAT = PH.SAT;   // the offline tools run content files without the physics model (the table is then empty)
  function lerpTab(tab, x, ix, iy) {   // linear interpolation in a sorted table, clamped
    var n = tab.length; if (x <= tab[0][ix]) return tab[0][iy]; if (x >= tab[n - 1][ix]) return tab[n - 1][iy];
    for (var i = 0; i < n - 1; i++) if (x < tab[i + 1][ix]) return tab[i][iy] + (tab[i + 1][iy] - tab[i][iy]) * (x - tab[i][ix]) / (tab[i + 1][ix] - tab[i][ix]);
  }
  // Water vapour pressure (t °C, p kPa): the course table up to 95 °C, slide table / steam tables above (extra points > 100 °C).
  var BP = SAT.filter(function (r) { return r[0] >= 0 && r[0] <= 95; }).map(function (r) { return [r[0], r[2]]; })
    .concat([[100, 101.3], [105, 120.8], [110, 143.3], [115, 169.1], [120, 199], [125, 232.1], [130, 270.1], [140, 361.3], [150, 476]]);
  function pOfT(t) { return lerpTab(BP, t, 0, 1); }
  function tOfP(p) { return lerpTab(BP.map(function (r) { return [r[1], r[0]]; }), p, 0, 1); }
  // Substances for the pT explorer. vap = (t °C, p kPa) anchors of the vaporisation curve (ends in the critical point);
  // sublimation: ln p linear in 1/T through the triple point and (t2, p2); melting: straight line with slope dtdp (K/MPa).
  var SUBS = {
    water: { name: { en: 'water', fi: 'vesi' }, t3: 0.01, p3: 0.6117, tc: 374, pc: 22090, sub2: [-20, 0.103], dtdp: -0.0993,
      vap: [[0.01, 0.6117], [20, 2.34], [60, 19.9], [100, 101.3], [150, 476], [200, 1554], [250, 3973], [300, 8581], [350, 16529], [374, 22090]],
      tmin: -60, tmax: 400, pmin: 0.1, pmax: 100000, t0: 25, p0: 101.325 },
    co2: { name: { en: 'carbon dioxide', fi: 'hiilidioksidi' }, t3: -56.4, p3: 517.8, tc: 31.1, pc: 7376, sub2: [-78.5, 101.325], dtdp: 0.15,
      vap: [[-56.4, 517.8], [-40, 1005], [-20, 1969], [0, 3485], [20, 5729], [31.1, 7376]],
      tmin: -100, tmax: 60, pmin: 10, pmax: 100000, t0: 20, p0: 101.325 }
  };
  function pvap(S, t) { return Math.exp(lerpTab(S.vap.map(function (r) { return [r[0], Math.log(r[1])]; }), t, 0, 1)); }
  function psub(S, t) {
    var T3 = S.t3 + 273.15, T2 = S.sub2[0] + 273.15, B = Math.log(S.sub2[1] / S.p3) / (1 / T3 - 1 / T2);
    return S.p3 * Math.exp(B * (1 / T3 - 1 / (t + 273.15)));
  }
  function tmelt(S, p) { return S.t3 + S.dtdp * (p - S.p3) / 1000; }
  function phaseOf(S, t, p) {
    if (t >= S.tc) return p >= S.pc ? 'super' : 'gas';
    if (t < S.t3) {
      if (p < psub(S, t)) return 'gas';
      return p >= S.p3 && t > tmelt(S, p) ? 'liquid' : 'solid';
    }
    if (p < pvap(S, t)) return 'gas';
    return t < tmelt(S, p) ? 'solid' : 'liquid';
  }
  // Reduced van der Waals fluid (V/V_c, p/p_c, T/T_c) for the pV isotherm widget.
  function vdwP(v, T) { return 8 * T / (3 * v - 1) - 3 / (v * v); }
  function vdwF(v, T) { return 8 * T / 3 * Math.log(3 * v - 1) + 3 / v; }
  function bisect(f, lo, hi) {   // f(lo) and f(hi) have opposite signs
    var flo = f(lo);
    for (var i = 0; i < 60; i++) { var m = (lo + hi) / 2, fm = f(m); if ((fm > 0) === (flo > 0)) { lo = m; flo = fm; } else hi = m; }
    return (lo + hi) / 2;
  }
  /** Maxwell construction: {p, v1, v3} of the liquid-vapour plateau at T < 1 (equal-area rule). */
  function plateau(T) {
    var h = function (v) { return (3 * v - 1) * (3 * v - 1) - 4 * T * v * v * v; }, roots = [], v = 0.34;
    for (; v < 40; v += 0.002) if ((h(v) > 0) !== (h(v + 0.002) > 0)) roots.push(bisect(h, v, v + 0.002));
    var vA = roots[0], vB = roots[1], pmin = Math.max(vdwP(vA, T), 1e-4), pmax = vdwP(vB, T);
    function ends(p) {
      var f = function (x) { return vdwP(x, T) - p; };
      return [bisect(f, 1 / 3 + 1e-6, vA), bisect(f, vB, 400)];
    }
    var p = bisect(function (q) { var e = ends(q); return vdwF(e[1], T) - vdwF(e[0], T) - q * (e[1] - e[0]); }, pmin, pmax);
    var e = ends(p); return { p: p, v1: e[0], v3: e[1] };
  }
  // </helpers>

  // ---------- custom widgets ----------
  function T(en, fi) { return { en: en, fi: fi }; }
  var PHNAME = { solid: T('solid', 'kiinteä'), liquid: T('liquid', 'neste'), gas: T('gas / vapour', 'kaasu / höyry'), super: T('supercritical fluid', 'ylikriittinen fluidi') };
  var PHCOL = { solid: '--c-4', liquid: '--c-electron', gas: '--c-2', super: '--c-5' };

  /** pT phase diagram on a log pressure axis. Drag the state point or use the sliders. opt: {sub, values, fixed}. */
  function phaseWidget(opt) {
    return function (host, ctx) {
      var TV = TDC.thermoViz, V = TDC.viz, S = SUBS[opt.sub], lo = Math.log10(S.pmin), hi = Math.log10(S.pmax), o = { x0: 50, y0: 16, x1: 300, y1: 200 };
      var defs = [{ id: 't', tex: 't', min: S.tmin, max: S.tmax, step: 0.5, value: S.t0, unit: '°C' },
                  { id: 'p', tex: 'p', min: S.pmin, max: S.pmax, value: S.p0, unit: 'kPa', log: true }];
      var F = TV.frame(host, { values: opt.values, fixed: opt.fixed, persist: false }, ctx, defs, function () { readouts(); cv.redraw(); });
      var cv = V.canvas(F.stage, { aspect: function (w) { return w < 560 ? 0.95 : 0.52; }, draw: draw, animate: false });
      function X(t) { return o.x0 + (t - S.tmin) / (S.tmax - S.tmin) * (o.x1 - o.x0); }
      function Y(p) { return o.y1 - (Math.log10(p) - lo) / (hi - lo) * (o.y1 - o.y0); }
      function draw(g, w, h) {
        o = { x0: 50, y0: 30, x1: w - 22, y1: h - 40 };   // room for the axis name above and the last tick on the right
        var p = F.p(), fg = ctx.color('--fg'), muted = ctx.color('--muted'), bg = ctx.color('--surface-2');
        g.clearRect(0, 0, w, h);
        var fills = {}; Object.keys(PHCOL).forEach(function (k) { fills[k] = TV.alpha(ctx.color(PHCOL[k]), 0.28); });
        for (var px = o.x0; px < o.x1; px += 5) for (var py = o.y0; py < o.y1; py += 5) {
          var t = S.tmin + (px + 2.5 - o.x0) / (o.x1 - o.x0) * (S.tmax - S.tmin), pp = Math.pow(10, lo + (o.y1 - py - 2.5) / (o.y1 - o.y0) * (hi - lo));
          g.fillStyle = fills[phaseOf(S, t, pp)]; g.fillRect(px, py, Math.min(5, o.x1 - px), Math.min(5, o.y1 - py));
        }
        TV.font(g, 11, 400);
        for (var k = Math.ceil(lo); k <= hi; k++) {
          var pk = Math.pow(10, k);
          g.strokeStyle = ctx.color('--line'); g.lineWidth = 1; g.beginPath(); g.moveTo(o.x0, Y(pk)); g.lineTo(o.x1, Y(pk)); g.stroke();
          TV.text(g, k >= 4 ? '10' + '⁰¹²³⁴⁵⁶⁷⁸⁹'[k] : String(pk), o.x0 - 5, Y(pk), muted, 'right');
        }
        V.niceTicks(S.tmin, S.tmax, 6).forEach(function (tt) { TV.text(g, String(tt), X(tt), o.y1 + 10, muted, 'center'); });
        g.strokeStyle = muted; g.lineWidth = 1.5; g.strokeRect(o.x0, o.y0, o.x1 - o.x0, o.y1 - o.y0);
        TV.font(g, 12, 600); TV.text(g, 't / °C', o.x1, o.y1 + 26, muted, 'right'); TV.text(g, 'p / kPa', o.x0 - 4, o.y0 - 16, muted, 'left');
        // phase boundaries
        g.strokeStyle = fg; g.lineWidth = 2.2; g.setLineDash([]);
        var curve = function (fn, a, b, n) { g.beginPath(); for (var i = 0; i <= n; i++) { var q = fn(a + (b - a) * i / n); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); } g.stroke(); };
        curve(function (t) { return [X(t), Y(pvap(S, t))]; }, S.t3, S.tc, 80);
        curve(function (t) { return [X(t), Y(Math.max(S.pmin, psub(S, t)))]; }, S.tmin, S.t3, 40);
        curve(function (lp) { return [X(tmelt(S, Math.pow(10, lp))), Y(Math.pow(10, lp))]; }, Math.log10(S.p3), hi, 40);
        // 1 atm line, triple and critical point
        g.strokeStyle = muted; g.lineWidth = 1.2; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(o.x0, Y(101.325)); g.lineTo(o.x1, Y(101.325)); g.stroke(); g.setLineDash([]);
        TV.font(g, 11, 600); TV.text(g, '1 atm', o.x1 - 4, Y(101.325) - 9, muted, 'right', bg);
        [[S.t3, S.p3, T('triple point', 'kolmoispiste'), 'left'], [S.tc, S.pc, T('critical point', 'kriittinen piste'), 'right']].forEach(function (q) {
          g.fillStyle = fg; g.beginPath(); g.arc(X(q[0]), Y(q[1]), 4.5, 0, 7); g.fill();
          TV.text(g, ctx.tx(q[2]), X(q[0]) + (q[3] === 'left' ? 9 : -9), Y(q[1]) + (q[3] === 'left' ? 12 : -4), fg, q[3], bg);
        });
        // region names (positions chosen per substance)
        TV.font(g, 12, 700);
        var names = opt.sub === 'co2' ? [['solid', -85, 30000], ['liquid', 8, 20000], ['gas', 20, 300], ['super', 45, 60000]]
                                      : [['solid', -30, 1000], ['liquid', 130, 20000], ['gas', 200, 5], ['super', 370, 60000]];
        names.forEach(function (r) { var sup = r[0] === 'super'; TV.text(g, ctx.tx(PHNAME[r[0]]), sup ? o.x1 - 6 : X(r[1]), Y(r[2]), fg, sup ? 'right' : 'center'); });   // the supercritical corner is narrow: right-align so the name stays inside
        g.fillStyle = ctx.color('--c-flow'); g.strokeStyle = ctx.color('--surface'); g.lineWidth = 2.5; g.beginPath(); g.arc(X(p.t), Y(p.p), 8, 0, 7); g.fill(); g.stroke();
      }
      TV.drag(cv.canvas, function (x, y) { return x >= o.x0 - 6 && x <= o.x1 + 6 && y >= o.y0 - 6 && y <= o.y1 + 6; }, function (x, y) {
        var v = {}, fx = Math.max(0, Math.min(1, (x - o.x0) / (o.x1 - o.x0))), fy = Math.max(0, Math.min(1, (o.y1 - y) / (o.y1 - o.y0)));
        if ((opt.fixed || []).indexOf('t') < 0) v.t = Math.round((S.tmin + fx * (S.tmax - S.tmin)) * 2) / 2;
        if ((opt.fixed || []).indexOf('p') < 0) v.p = Math.pow(10, lo + fy * (hi - lo));
        F.set(v);
      });
      function readouts() {
        var p = F.p(), ph = phaseOf(S, p.t, p.p);
        F.readouts([{ label: T('Phase of ' + S.name.en, 'Olomuoto: ' + S.name.fi), value: PHNAME[ph], warn: ph === 'super' },
          { tex: 't', value: p.t, unit: '°C' }, { tex: 'p', value: p.p, unit: 'kPa' }, { tex: 'p / p_0', value: p.p / 101.325, unit: '' }]);
      }
      F.answer = function () { return { v: F.p().p }; };
      ctx.onTheme(function () { cv.redraw(); }); ctx.onLang(function () { readouts(); cv.redraw(); });
      readouts();
      return Object.assign({ destroy: cv.destroy }, F.api);
    };
  }

  /** pV isotherms of a reduced van der Waals fluid: vapour below T_c, gas above, the plateau of condensation. */
  function isothermWidget(host, ctx) {
    var TV = TDC.thermoViz, V = TDC.viz, o = { x0: 46, y0: 16, x1: 300, y1: 200 }, dome = [], VMIN = 0.4, VMAX = 6, PMAX = 1.6;
    for (var T0 = 0.6; T0 < 0.9999; T0 += 0.01) { var q = plateau(T0); dome.push([T0, q.p, q.v1, q.v3]); }
    var defs = [{ id: 'Tr', tex: 'T/T_c', min: 0.8, max: 1.3, step: 0.01, value: 0.9, unit: '' },
                { id: 'v', tex: 'V/V_c', min: 0.4, max: 6, value: 3, unit: '', log: true }];
    var F = TV.frame(host, { persist: false }, ctx, defs, function () { readouts(); cv.redraw(); });
    var cv = V.canvas(F.stage, { aspect: function (w) { return w < 560 ? 0.9 : 0.5; }, draw: draw, animate: false });
    function X(v) { return o.x0 + (v - VMIN) / (VMAX - VMIN) * (o.x1 - o.x0); }
    function Y(p) { return o.y1 - p / PMAX * (o.y1 - o.y0); }   // curves are clipped to the plot, not flattened
    function state() {
      var p = F.p(), pl = p.Tr < 1 ? plateau(p.Tr) : null, s = { Tr: p.Tr, v: p.v };
      if (pl && p.v > pl.v1 && p.v < pl.v3) { s.p = pl.p; s.kind = 'mix'; s.x = (p.v - pl.v1) / (pl.v3 - pl.v1); }
      else { s.p = vdwP(p.v, p.Tr); s.kind = p.Tr >= 1 ? 'gas' : p.v <= pl.v1 ? 'liquid' : 'vapour'; }
      return s;
    }
    function isotherm(g, Tr, color, width, dash) {
      var pl = Tr < 1 ? plateau(Tr) : null; g.strokeStyle = color; g.lineWidth = width; g.setLineDash(dash || []); g.beginPath();
      for (var v = VMIN, first = true; v <= VMAX; v *= 1.01) {
        var p = pl && v > pl.v1 && v < pl.v3 ? pl.p : vdwP(v, Tr);
        if (first) { g.moveTo(X(v), Y(p)); first = false; } else g.lineTo(X(v), Y(p));
      }
      g.stroke(); g.setLineDash([]);
    }
    function draw(g, w, h) {
      o = { x0: 46, y0: 16, x1: w - 14, y1: h - 38 };
      var fg = ctx.color('--fg'), muted = ctx.color('--muted'), bg = ctx.color('--surface-2'), s = state();
      g.clearRect(0, 0, w, h);
      TV.axes(g, ctx, { x0: o.x0, y0: o.y0, x1: o.x1, y1: o.y1, xmin: VMIN, xmax: VMAX, ymin: 0, ymax: PMAX, xlab: 'V / V_c', ylab: 'p / p_c' });
      g.save(); g.beginPath(); g.rect(o.x0, o.y0, o.x1 - o.x0, o.y1 - o.y0); g.clip();
      // two-phase dome (it runs on below the plot to low pressures, so its outline stays open at the bottom)
      g.fillStyle = TV.alpha(ctx.color('--c-electron'), 0.2); g.strokeStyle = muted; g.lineWidth = 1.5; g.beginPath(); g.moveTo(X(dome[0][2]), Y(dome[0][1]));
      for (var i = 1; i < dome.length; i++) g.lineTo(X(dome[i][2]), Y(dome[i][1]));
      g.lineTo(X(1), Y(1));
      for (i = dome.length - 1; i >= 0; i--) g.lineTo(X(dome[i][3]), Y(dome[i][1]));
      g.stroke(); g.closePath(); g.fill();
      isotherm(g, 1, ctx.color('--c-5'), 2, [6, 4]);
      isotherm(g, s.Tr, ctx.color('--c-2'), 3);
      // ideal gas at the same temperature (dotted): pV = nRT
      g.strokeStyle = muted; g.lineWidth = 1.4; g.setLineDash([2, 4]); g.beginPath();
      for (var v = VMIN; v <= VMAX; v *= 1.02) { var pi = 8 * s.Tr / (3 * v); if (v === VMIN) g.moveTo(X(v), Y(pi)); else g.lineTo(X(v), Y(pi)); }
      g.stroke(); g.setLineDash([]); g.restore();
      TV.font(g, 11, 600);
      TV.text(g, ctx.tx(T('critical isotherm', 'kriittinen isotermi')), X(5.9), Y(0.3), ctx.color('--c-5'), 'right', bg);
      TV.text(g, ctx.tx(T('ideal gas', 'ideaalikaasu')), X(5.9), Y(8 * s.Tr / (3 * 5.9)) - 12, muted, 'right', bg);
      TV.text(g, ctx.tx(T('liquid + vapour', 'neste + höyry')), X(1.9), Y(0.2), fg, 'center');
      g.fillStyle = ctx.color('--c-flow'); g.strokeStyle = ctx.color('--surface'); g.lineWidth = 2.5; g.beginPath(); g.arc(X(s.v), Y(Math.min(s.p, PMAX)), 8, 0, 7); g.fill(); g.stroke();
    }
    var KIND = { mix: T('liquid + vapour (condensing)', 'neste + höyry (tiivistyy)'), liquid: T('liquid', 'neste'), vapour: T('vapour (T < T_c)', 'höyry (T < T_c)'), gas: T('gas (T > T_c)', 'kaasu (T > T_c)') };
    function readouts() {
      var s = state();
      F.readouts([{ label: T('State', 'Tila'), value: KIND[s.kind] }, { tex: 'p / p_c', value: s.p, unit: '', digits: 3 },
        s.kind === 'mix' ? { label: T('Vapour share of the volume', 'Höyryn osuus tilavuudesta'), value: s.x * 100, unit: '%' } : null,
        { label: T('t if the fluid is water', 't jos neste on vettä'), value: s.Tr * 647.15 - 273.15, unit: '°C' },
        { label: T('t if the fluid is CO₂', 't jos neste on CO₂'), value: s.Tr * 304.25 - 273.15, unit: '°C' }]);
    }
    ctx.onTheme(function () { cv.redraw(); }); ctx.onLang(function () { readouts(); cv.redraw(); });
    readouts();
    return Object.assign({ destroy: cv.destroy }, F.api);
  }

  /** Closed bottle: evaporation and condensation reach a dynamic equilibrium whose vapour density is the saturated one. */
  function evapWidget(host, ctx) {
    var TV = TDC.thermoViz, V = TDC.viz, U = TDC.util, K = 0.6, parts = [], acc = 0, lastRead = 0, init = false, stat = { n: 0, e: 0, c: 0 };
    var F = TV.frame(host, { persist: false }, ctx, [{ id: 't', tex: 't', min: 0, max: 100, step: 1, value: 20, unit: '°C' }], function () { readouts(); });
    var cv = V.canvas(F.stage, { aspect: function (w) { return w < 560 ? 0.8 : 0.45; }, draw: draw });
    function nEq(t) { return 2 + PH.satVapour(t).rho * 0.25; }   // schematic: molecules shown ~ saturated vapour density
    function box(w, h) { var y = 12; return { x: 16, y: y, w: Math.min(w - 32, 330), h: h - 24, s: y + 12 + (h - 24) * 0.55 }; }
    function draw(g, w, h, tm, dt) {
      var p = F.p(), b = box(w, h), ne = nEq(p.t);
      if (!init) { init = true; for (var i = 0; i < ne * 0.5; i++) parts.push({ x: b.x + 10 + Math.random() * (b.w - 20), y: b.y + 20 + Math.random() * (b.s - b.y - 30), vx: Math.random() * 2 - 1, vy: Math.random() * 2 - 1 }); }
      var sp = 35 + 1.1 * p.t;
      acc += K * ne * dt; while (acc >= 1 && parts.length < 260) { acc -= 1; parts.push({ x: b.x + 10 + Math.random() * (b.w - 20), y: b.s - 2, vx: Math.random() - 0.5, vy: -1 }); }
      if (acc > 5) acc = 0;
      var n = 0;
      parts = parts.filter(function (q) {
        if (!q.sink) { if (Math.random() < K * dt) { q.sink = true; q.vx *= 0.2; q.vy = 1; } else n++; }
        var m = Math.hypot(q.vx, q.vy) || 1;
        q.x += q.vx / m * sp * dt; q.y += q.vy / m * sp * dt;
        if (q.x < b.x + 4) { q.x = b.x + 4; q.vx = Math.abs(q.vx); }
        if (q.x > b.x + b.w - 4) { q.x = b.x + b.w - 4; q.vx = -Math.abs(q.vx); }
        if (q.y < b.y + 18) { q.y = b.y + 18; q.vy = Math.abs(q.vy); }
        if (q.y >= b.s) { if (q.sink) return false; q.y = b.s - 1; q.vy = -Math.abs(q.vy); }
        return true;
      });
      g.clearRect(0, 0, w, h);
      g.fillStyle = TV.alpha(ctx.color('--c-electron'), 0.35); g.fillRect(b.x, b.s, b.w, b.y + b.h - b.s);
      TV.waterLine(g, b.x, b.x + b.w, b.s, tm, ctx.color('--c-electron'));
      g.strokeStyle = ctx.color('--c-wire'); g.lineWidth = 3; g.strokeRect(b.x, b.y + 12, b.w, b.h - 12);
      g.fillStyle = ctx.color('--c-wire'); g.fillRect(b.x + b.w / 2 - 14, b.y, 28, 14);
      parts.forEach(function (q) { g.fillStyle = q.sink ? ctx.color('--c-electron') : ctx.color('--c-1'); g.beginPath(); g.arc(q.x, q.y, 3, 0, 7); g.fill(); });
      var e = K * ne, c = K * n, ax = b.x + b.w + 28;   // flux arrows: thickness ~ rate
      if (w - ax > 110) {
        TV.arrow(g, ax, b.s + 34, ax, b.s - 34, ctx.color('--c-2'), 2 + Math.min(10, e * 0.35));
        TV.arrow(g, ax + 46, b.s - 34, ax + 46, b.s + 34, ctx.color('--c-electron'), 2 + Math.min(10, c * 0.35));
        TV.font(g, 12, 600);
        TV.text(g, ctx.tx(T('evaporation', 'haihtuminen')), ax - 8, b.s + 50, ctx.color('--c-2'), 'left');
        TV.text(g, ctx.tx(T('condensation', 'tiivistyminen')), ax + 30, b.s - 50, ctx.color('--c-electron'), 'left');
      }
      stat = { n: n, ne: ne, e: e, c: c };
      if (tm - lastRead > 0.4 || dt === 0) { lastRead = tm; readouts(); }
    }
    function readouts() {
      var p = F.p(), s = PH.satVapour(p.t), f = function (x) { return U.fmtNum(x, 3) + ' /s'; };
      F.readouts([{ tex: 'ρ_{vs}', value: s.rho, unit: 'g/m³' }, { tex: 'p_{vs}', value: s.p, unit: 'kPa' },
        { label: T('Evaporation rate', 'Haihtumisnopeus'), value: f(stat.e) }, { label: T('Condensation rate', 'Tiivistymisnopeus'), value: f(stat.c) },
        { label: T('State', 'Tila'), value: Math.abs(stat.c - stat.e) < 0.12 * stat.e + 0.3 ? T('saturated (equilibrium)', 'kylläinen (tasapaino)') : T('not yet in equilibrium', 'ei vielä tasapainossa') }]);
    }
    ctx.onLang(readouts); readouts();
    return Object.assign({ destroy: cv.destroy }, F.api);
  }

  /** Boiling point vs external pressure: altitude (barometric formula) plus gauge pressure in a pressure cooker (or a vacuum pot). */
  function boilWidget(host, ctx) {
    var TV = TDC.thermoViz, V = TDC.viz;
    var defs = [{ id: 'h', tex: 'h', min: 0, max: 8848, step: 50, value: 0, unit: 'm' },
                { id: 'dp', tex: 'p_g', min: -90, max: 150, step: 1, value: 0, unit: 'kPa' }];
    var F = TV.frame(host, { persist: false }, ctx, defs, function () { readouts(); cv.redraw(); });
    var cv = V.canvas(F.stage, { aspect: function (w) { return w < 560 ? 0.9 : 0.5; }, draw: draw, animate: false });
    function st() { var p = F.p(), pa = PH.atmosphere(p.h) / 1000, pe = Math.max(1, pa + p.dp); return { pa: pa, pe: pe, tb: tOfP(pe) }; }
    function draw(g, w, h) {
      var s = st(), side = w >= 560, fg = ctx.color('--fg'), muted = ctx.color('--muted'), bg = ctx.color('--surface-2');
      g.clearRect(0, 0, w, h);
      if (side) TV.gauge(g, ctx, 70, h / 2 - 6, 52, Math.min(s.pe, 250), 250, 'p_ext / kPa', TDC.util.fmtNum(s.pe, 3));
      var o = { x0: side ? 170 : 46, y0: 16, x1: w - 16, y1: h - 38, xmin: 0, xmax: 140, ymin: 0, ymax: 250, xlab: 't / °C', ylab: 'p / kPa' };
      var A = TV.axes(g, ctx, o);
      g.strokeStyle = ctx.color('--c-1'); g.lineWidth = 2.5; g.beginPath();
      for (var t = 0; t <= 140; t += 1) { if (t) g.lineTo(A.X(t), A.Y(pOfT(t))); else g.moveTo(A.X(t), A.Y(pOfT(t))); }
      g.stroke();
      TV.font(g, 11, 600); TV.text(g, 'p_vs(t)', A.X(34), A.Y(pOfT(34)) - 16, ctx.color('--c-1'), 'left', bg);
      g.strokeStyle = muted; g.lineWidth = 1.2; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(o.x0, A.Y(101.325)); g.lineTo(o.x1, A.Y(101.325)); g.stroke(); g.setLineDash([]);
      TV.text(g, '1 atm', o.x1 - 4, A.Y(101.325) + 10, muted, 'right', bg);
      var X = A.X(Math.min(140, s.tb)), Yv = A.Y(Math.min(250, s.pe));
      g.strokeStyle = ctx.color('--c-2'); g.lineWidth = 2; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(o.x0, Yv); g.lineTo(X, Yv); g.lineTo(X, o.y1); g.stroke(); g.setLineDash([]);
      g.fillStyle = ctx.color('--c-flow'); g.strokeStyle = ctx.color('--surface'); g.lineWidth = 2.5; g.beginPath(); g.arc(X, Yv, 7, 0, 7); g.fill(); g.stroke();
      TV.font(g, 12, 700); TV.text(g, 't_b', X + (X > (o.x0 + o.x1) / 2 ? -6 : 6), o.y1 - 10, fg, X > (o.x0 + o.x1) / 2 ? 'right' : 'left', bg);
    }
    function readouts() {
      var s = st();
      F.readouts([{ tex: 'p_{atm}(h)', value: s.pa, unit: 'kPa' }, { tex: 'p_{ext} = p_{atm} + p_g', value: s.pe, unit: 'kPa' }, { tex: 't_b', value: s.tb, unit: '°C' }]);
    }
    ctx.onTheme(function () { cv.redraw(); }); ctx.onLang(function () { readouts(); cv.redraw(); });
    readouts();
    return Object.assign({ destroy: cv.destroy }, F.api);
  }

  // The course table "Saturated vapour density and pressure", split in two halves like the source page
  function fmtRho(r) { return r < 10 ? r.toFixed(2) : r < 100 ? r.toFixed(1) : r === 588.4 ? '588.4' : r.toFixed(0); }
  function fmtP(p) { return p < 1 ? p.toFixed(3) : p < 10 ? p.toFixed(2) : p.toFixed(1); }
  function dec(s) { return { en: s, fi: s.replace('.', ',') }; }
  function satRows() {
    var L = SAT.filter(function (r) { return r[0] <= 15; }), R = SAT.filter(function (r) { return r[0] > 15; });
    return L.map(function (a, i) {
      var b = R[i], row = [String(a[0]), dec(fmtRho(a[1])), dec(fmtP(a[2]))];
      return row.concat(b ? [String(b[0]), dec(fmtRho(b[1])), dec(fmtP(b[2]))] : ['', '', '']);
    });
  }

  var QUESTIONS = [
    // ---- phases
    { id: 't5-q1', mode: 'practice', type: 'mc', difficulty: 1,
      prompt: T('Which statement describes the triple point of water?', 'Mikä väite kuvaa veden kolmoispistettä?'),
      options: [
        { id: 'a', html: T('Water boils at 0.01 °C and 611.73 Pa.', 'Vesi kiehuu lämpötilassa 0,01 °C ja paineessa 611,73 Pa.') },
        { id: 'b', html: T('Solid, liquid and gas are in dynamic equilibrium at 0.01 °C and 611.73 Pa.', 'Kiinteä, neste ja kaasu ovat dynaamisessa tasapainossa lämpötilassa 0,01 °C ja paineessa 611,73 Pa.') },
        { id: 'c', html: T('Above this point water cannot be liquefied by pressure.', 'Tämän pisteen yläpuolella vettä ei voi nesteyttää paineella.') },
        { id: 'd', html: T('Ice melts at 1 atm exactly at this point.', 'Jää sulaa 1 atm:n paineessa täsmälleen tässä pisteessä.') }],
      hints: [T('Three phases, one point in the pT diagram.', 'Kolme olomuotoa, yksi piste pT-piirroksessa.')] },
    { id: 't5-q2', mode: 'practice', type: 'mc', difficulty: 2,
      prompt: T('Water at 20 °C is in a vessel at 0.3 kPa. In which phase is it?', 'Vesi on 20 °C:ssa astiassa, jonka paine on 0,3 kPa. Missä olomuodossa se on?'),
      options: [{ id: 's', html: T('solid', 'kiinteä') }, { id: 'l', html: T('liquid', 'neste') }, { id: 'g', html: T('gas (vapour)', 'kaasu (höyry)') }, { id: 'x', html: T('supercritical fluid', 'ylikriittinen fluidi') }],
      hints: [T('Compare the pressure with the saturated vapour pressure at 20 °C (table).', 'Vertaa painetta kylläisen höyryn paineeseen lämpötilassa 20 °C (taulukko).'), T('Below the vaporisation curve the substance is a gas.', 'Höyrystymiskäyrän alapuolella aine on kaasua.')] },
    { id: 't5-q3', mode: 'practice', type: 'numeric', difficulty: 1, tol: 0.02,
      prompt: T('The critical pressure of CO₂ is 72.8 atm (table). Express it in kPa (1 atm = 101.325 kPa).', 'CO₂:n kriittinen paine on 72,8 atm (taulukko). Ilmoita se kilopascaleina (1 atm = 101,325 kPa).'),
      fields: [{ id: 'p', tex: 'p_c', unit: 'kPa' }],
      hints: [T('Multiply by 101.325.', 'Kerro luvulla 101,325.')] },
    { id: 't5-q4', mode: 'practice', type: 'slider', difficulty: 2, tol: 0.05,
      prompt: T('CO₂ at 20 °C is compressed in a cylinder. Drag the pressure (the temperature is fixed) to the lowest pressure at which CO₂ is liquid, i.e. to the vaporisation curve.', 'CO₂ puristetaan paineastiassa lämpötilassa 20 °C. Vedä paine (lämpötila on kiinteä) pienimpään paineeseen, jossa CO₂ on nestettä eli höyrystymiskäyrälle.'),
      widget: { name: 'custom', config: { mount: phaseWidget({ sub: 'co2', values: { t: 20, p: 101.325 }, fixed: ['t'] }) } },
      hints: [T('Watch the phase readout: increase p until it changes from gas to liquid.', 'Seuraa olomuotolukemaa: kasvata painetta, kunnes kaasu muuttuu nesteeksi.'), T('The answer is a pressure in the MPa range.', 'Vastaus on MPa-luokan paine.')] },
    // ---- isotherms
    { id: 't5-q5', mode: 'practice', type: 'mc', difficulty: 2,
      prompt: T('CO₂ (T_c = 31.1 °C) at 40 °C is compressed harder and harder. What happens?', 'CO₂ (T_c = 31,1 °C) on 40 °C:ssa ja sitä puristetaan yhä voimakkaammin. Mitä tapahtuu?'),
      options: [{ id: 'a', html: T('It liquefies at about 7.4 MPa.', 'Se nesteytyy noin 7,4 MPa:n paineessa.') }, { id: 'b', html: T('It becomes solid immediately.', 'Se muuttuu heti kiinteäksi.') }, { id: 'c', html: T('It never liquefies: it only gets denser.', 'Se ei koskaan nesteydy: se vain tiivistyy.') }],
      hints: [T('Compare 40 °C with the critical temperature.', 'Vertaa 40 °C:ta kriittiseen lämpötilaan.')] },
    { id: 't5-q6', mode: 'practice', type: 'mc', difficulty: 1,
      prompt: T('On the flat part of an isotherm below T_c (a → b in the slide) what happens when the volume is reduced?', 'Mitä tapahtuu isotermin vaakasuoralla osalla T_c:n alapuolella (a → b kalvossa), kun tilavuutta pienennetään?'),
      options: [{ id: 'a', html: T('The pressure rises according to pV = constant.', 'Paine nousee lain pV = vakio mukaisesti.') }, { id: 'b', html: T('The temperature rises.', 'Lämpötila nousee.') }, { id: 'c', html: T('The pressure stays constant while vapour condenses.', 'Paine pysyy vakiona, kun höyry tiivistyy.') }],
      hints: [T('Try it in the isotherm widget with T/T_c = 0.9.', 'Kokeile isotermi-komponentilla, kun T/T_c = 0,9.')] },
    // ---- evaporation
    { id: 't5-q7', mode: 'practice', type: 'mc', difficulty: 1,
      prompt: T('Water and its saturated vapour are in a sealed bottle at constant temperature. Which statement is true?', 'Vesi ja sen kylläinen höyry ovat suljetussa pullossa vakiolämpötilassa. Mikä väite on tosi?'),
      options: [{ id: 'a', html: T('Evaporation has stopped.', 'Haihtuminen on loppunut.') }, { id: 'b', html: T('Per second as many molecules condense as evaporate.', 'Sekunnissa tiivistyy yhtä monta molekyyliä kuin haihtuu.') }, { id: 'c', html: T('Condensation has stopped.', 'Tiivistyminen on loppunut.') }, { id: 'd', html: T('All the liquid has turned into vapour.', 'Kaikki neste on muuttunut höyryksi.') }],
      hints: [T('Dynamic equilibrium: both processes continue.', 'Dynaaminen tasapaino: molemmat prosessit jatkuvat.')] },
    { id: 't5-q8', mode: 'practice', type: 'fill', difficulty: 1,
      prompt: T('Complete the sentence.', 'Täydennä virke.'),
      text: T('The saturated vapour pressure of a substance depends only on its [[a]].', 'Aineen kylläisen höyryn paine riippuu vain sen [[a]].'),
      fields: [{ id: 'a', kind: 'text' }],
      hints: [T('Raising it makes more molecules leave the liquid. Which quantity is it?', 'Sen nosto saa useampia molekyylejä poistumaan nesteestä. Mikä suure on kyseessä?')] },
    // ---- boiling
    { id: 't5-q9', mode: 'practice', type: 'numeric', difficulty: 1, tol: 0.02,
      prompt: T('On a mountain the air pressure is 47.3 kPa. At what temperature does water boil? Use the table.', 'Vuorella ilmanpaine on 47,3 kPa. Missä lämpötilassa vesi kiehuu? Käytä taulukkoa.'),
      fields: [{ id: 't', tex: 't_b', unit: '°C' }],
      hints: [T('Boiling: p_vs equals the external pressure.', 'Kiehuessa p_vs on yhtä suuri kuin ulkoinen paine.'), T('Look for 4.73·10⁴ Pa in the table.', 'Etsi taulukosta 4,73·10⁴ Pa.')] },
    { id: 't5-q10', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.03,
      prompt: T('A pressure cooker should make the water boil at 110 °C. What absolute pressure is needed? (Use the boiling-point widget or a steam table: 110 °C.)', 'Painekattilan pitää saada vesi kiehumaan 110 °C:ssa. Mikä absoluuttinen paine tarvitaan? (Käytä kiehumispistekomponenttia tai höyrytaulukkoa: 110 °C.)'),
      fields: [{ id: 'p', tex: 'p_{ext}', unit: 'kPa' }],
      hints: [T('The saturated vapour pressure at 110 °C is the required pressure.', 'Kylläisen höyryn paine lämpötilassa 110 °C on tarvittava paine.'), T('It lies between 101 kPa (100 °C) and 199 kPa (120 °C), closer to the lower end.', 'Se on 101 kPa:n (100 °C) ja 199 kPa:n (120 °C) välissä, lähempänä alempaa.')] },
    { id: 't5-q11', mode: 'practice', type: 'mc', difficulty: 1,
      prompt: T('Why do eggs take longer to cook on a high mountain?', 'Miksi munat kypsyvät hitaammin korkealla vuorella?'),
      options: [{ id: 'a', html: T('The air pressure is lower, so the water boils at a lower temperature.', 'Ilmanpaine on pienempi, joten vesi kiehuu alemmassa lämpötilassa.') }, { id: 'b', html: T('There is less oxygen.', 'Happea on vähemmän.') }, { id: 'c', html: T('The boiling point is higher, so the water takes longer to heat.', 'Kiehumispiste on korkeampi, joten veden lämmittäminen kestää kauemmin.') }],
      hints: [T('How does the boiling point depend on the external pressure?', 'Miten kiehumispiste riippuu ulkoisesta paineesta?')] },
    // ---- humidity
    { id: 't5-q12', mode: 'practice', type: 'numeric', difficulty: 1, tol: 0.02,
      prompt: T('Air at 22 °C has RH = 60 %. Find the partial pressure of water vapour (saturation table).', 'Ilman lämpötila on 22 °C ja RH = 60 %. Laske vesihöyryn osapaine (kyllästystaulukko).'),
      fields: [{ id: 'p', tex: 'p_v', unit: 'kPa' }],
      hints: [T('p_v = φ · p_vs.', 'p_v = φ · p_vs.'), T('Read p_vs at 22 °C from the table.', 'Lue p_vs taulukosta lämpötilassa 22 °C.')] },
    { id: 't5-q13', mode: 'practice', type: 'numeric', difficulty: 1, tol: 0.02,
      prompt: T('The air at 20 °C contains 12.1 g of water vapour per cubic metre. Find the relative humidity in per cent.', 'Ilman lämpötila on 20 °C ja se sisältää 12,1 g vesihöyryä kuutiometrissä. Laske suhteellinen kosteus prosentteina.'),
      fields: [{ id: 'phi', tex: 'φ', unit: '%' }],
      hints: [T('φ = ρ_v / ρ_vs.', 'φ = ρ_v / ρ_vs.'), T('Look up ρ_vs at 20 °C.', 'Etsi ρ_vs lämpötilassa 20 °C.')] },
    { id: 't5-q14', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.02,
      prompt: T('Air at 25 °C has RH = 50 %. Find its dew point (interpolate in the table).', 'Ilman lämpötila on 25 °C ja RH = 50 %. Laske sen kastepiste (interpoloi taulukosta).'),
      fields: [{ id: 'td', tex: 't_d', unit: '°C' }],
      hints: [T('First ρ_v = φ · ρ_vs(25 °C).', 'Laske ensin ρ_v = φ · ρ_vs(25 °C).'), T('Then find the temperature where this is the saturated density.', 'Etsi sitten lämpötila, jossa tämä on kylläinen tiheys.')] },
    { id: 't5-q15', mode: 'practice', type: 'mc', difficulty: 2,
      prompt: T('Air in a cabinet is 25 °C, RH = 50 %. A wall is at 15 °C. Does water condense on it?', 'Kotelon ilma on 25 °C ja RH = 50 %. Seinän lämpötila on 15 °C. Tiivistyykö seinälle vettä?'),
      options: [{ id: 'a', html: T('Yes, because 15 °C is below 25 °C.', 'Kyllä, koska 15 °C on pienempi kuin 25 °C.') }, { id: 'b', html: T('No, because the dew point is about 13 °C, below the wall temperature.', 'Ei, koska kastepiste on noin 13 °C eli seinän lämpötilaa pienempi.') }, { id: 'c', html: T('Yes, because RH is below 100 %.', 'Kyllä, koska RH on alle 100 %.') }],
      hints: [T('Compare the wall temperature with the dew point, not with the air temperature.', 'Vertaa seinän lämpötilaa kastepisteeseen, ei ilman lämpötilaan.')] },
    { id: 't5-q16', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.02,
      prompt: T('The saturated vapour pressure of water at 30 °C is 4.24 kPa. Use ρ = pM/(RT) with M = 18 g/mol to find the saturated vapour density.', 'Veden kylläisen höyryn paine lämpötilassa 30 °C on 4,24 kPa. Laske kylläisen höyryn tiheys kaavalla ρ = pM/(RT), kun M = 18 g/mol.'),
      fields: [{ id: 'rho', tex: 'ρ_{vs}', unit: 'g/m³' }],
      hints: [T('Use SI units in the formula: Pa, kg/mol, K.', 'Käytä kaavassa SI-yksiköitä: Pa, kg/mol, K.'), T('The result in kg/m³ is multiplied by 1000 to get g/m³.', 'Tulos kg/m³ kerrotaan tuhannella, jolloin saadaan g/m³.')] },
    { id: 't5-q17', mode: 'practice', type: 'mc', difficulty: 1,
      prompt: T('What is the reason for rain?', 'Mistä sade johtuu?'),
      options: [{ id: 'a', html: T('Rising moist air cools below its dew point, becomes supersaturated and the vapour condenses.', 'Nouseva kostea ilma jäähtyy kastepisteensä alle, ylikyllästyy ja höyry tiivistyy.') }, { id: 'b', html: T('The air pressure rises and pushes the vapour out of the air.', 'Ilmanpaine nousee ja puristaa höyryn ulos ilmasta.') }, { id: 'c', html: T('Water boils in the clouds.', 'Vesi kiehuu pilvissä.') }],
      hints: [T('What happens to ρ_vs when air cools?', 'Mitä ρ_vs:lle tapahtuu ilman jäähtyessä?')] },
    { id: 't5-q18', mode: 'practice', type: 'slider', difficulty: 2, tol: 0.05,
      prompt: T('Cabinet air: 20 °C, RH = 80 %. The wall is at 10 °C and droplets form. Raise the wall temperature t_s (slider) to the temperature at which the droplets just disappear.', 'Kotelon ilma: 20 °C, RH = 80 %. Seinä on 10 °C:ssa ja pisaroita muodostuu. Nosta seinän lämpötilaa t_s (liukusäädin) siihen lämpötilaan, jossa pisarat juuri häviävät.'),
      widget: { name: 'humidity', config: { values: { t: 20, phi: 80, ts: 10 }, fixed: ['t', 'phi'], heater: false, answer: function (p) { return { v: p.ts }; } } },
      hints: [T('Watch the line "Cold surface": it must say "stays dry".', 'Seuraa riviä "Kylmä pinta": sen pitää sanoa "pysyy kuivana".'), T('The limit is the dew point, shown as t_d in the readouts.', 'Raja on kastepiste, joka näkyy lukemissa merkinnällä t_d.')] },
    // ---- topic test
    { id: 't5-q19', mode: 'graded', type: 'mc', difficulty: 1,
      prompt: T('What is special about the critical point?', 'Mikä on kriittisessä pisteessä erityistä?'),
      options: [{ id: 'a', html: T('Solid, liquid and gas coexist there.', 'Siinä kiinteä, neste ja kaasu ovat yhtä aikaa.') }, { id: 'b', html: T('It is the end of the vaporisation curve: above T_c a gas cannot be liquefied by pressure alone.', 'Se on höyrystymiskäyrän päätepiste: lämpötilan T_c yläpuolella kaasua ei voi nesteyttää pelkällä paineella.') }, { id: 'c', html: T('Water boils there at 1 atm.', 'Vesi kiehuu siinä 1 atm:n paineessa.') }, { id: 'd', html: T('It is the lowest pressure at which ice exists.', 'Se on pienin paine, jossa jäätä on olemassa.') }],
      hints: [T('Think of the pV isotherms and of T_c.', 'Ajattele pV-isotermejä ja lämpötilaa T_c.')] },
    { id: 't5-q20', mode: 'graded', type: 'match', difficulty: 1, points: 2,
      prompt: T('Match each quantity with its description.', 'Yhdistä suure ja sen kuvaus.'),
      left: [{ id: 'a', html: T('absolute humidity', 'absoluuttinen kosteus') }, { id: 'b', html: T('relative humidity', 'suhteellinen kosteus') }, { id: 'c', html: T('dew point', 'kastepiste') }, { id: 'd', html: T('supersaturation', 'ylikyllästyminen') }],
      right: [{ id: 'r1', html: T('<f>φ > 100 %</f>', '<f>φ > 100 %</f>') }, { id: 'r2', html: T('temperature at which <f>p_v = p_{vs}</f>', 'lämpötila, jossa <f>p_v = p_{vs}</f>') }, { id: 'r3', html: T('mass of vapour per volume of air', 'vesihöyryn massa ilmatilavuutta kohti') }, { id: 'r4', html: T('<f>p_v / p_{vs}</f>', '<f>p_v / p_{vs}</f>') }],
      hints: [T('Absolute = per volume; relative = a ratio.', 'Absoluuttinen = tilavuutta kohti; suhteellinen = suhdeluku.')] },
    { id: 't5-q21', mode: 'graded', type: 'numeric', difficulty: 3, points: 2, tol: 0.03,
      prompt: T('An electrical cabinet of 0.8 m³ holds air at 30 °C with RH = 70 %. The temperature drops to 10 °C at night (the volume is constant). How many grams of water condense? Use the saturation table.', 'Sähkökotelon tilavuus on 0,8 m³ ja siinä on ilmaa 30 °C:ssa, RH = 70 %. Lämpötila laskee yöllä 10 °C:seen (tilavuus on vakio). Montako grammaa vettä tiivistyy? Käytä kyllästystaulukkoa.'),
      fields: [{ id: 'm', tex: 'm', unit: 'g' }],
      hints: [T('Vapour density before: ρ_v = φ · ρ_vs(30 °C).', 'Höyryn tiheys alussa: ρ_v = φ · ρ_vs(30 °C).'), T('After cooling the air can hold only ρ_vs(10 °C); the rest condenses.', 'Jäähtymisen jälkeen ilma voi sisältää vain ρ_vs(10 °C); loput tiivistyy.'), T('Multiply the density difference by the volume.', 'Kerro tiheysero tilavuudella.')] },
    { id: 't5-q22', mode: 'graded', type: 'numeric', difficulty: 3, points: 2, tol: 0.05,
      prompt: T('Cabinet air is 28 °C with RH = 55 %. A wall is at 14 °C. By how many kelvins must an anti-condensation heater raise the wall temperature so that it just reaches the dew point?', 'Kotelon ilma on 28 °C ja RH = 55 %. Seinä on 14 °C:ssa. Kuinka monta kelviniä kosteudenpoistolämmittimen on nostettava seinän lämpötilaa, jotta se juuri saavuttaa kastepisteen?'),
      fields: [{ id: 'dT', tex: 'Δt', unit: 'K' }],
      hints: [T('Find ρ_v, then the dew point by interpolation.', 'Laske ρ_v ja sitten kastepiste interpoloimalla.'), T('The answer is the dew point minus 14 °C.', 'Vastaus on kastepiste miinus 14 °C.')] },
    { id: 't5-q23', mode: 'graded', type: 'multi', difficulty: 2, points: 2,
      prompt: T('Select all true statements.', 'Valitse kaikki tosit väitteet.'),
      options: [{ id: 'a', html: T('The boiling point of water does not depend on the external pressure.', 'Veden kiehumispiste ei riipu ulkoisesta paineesta.') }, { id: 'b', html: T('The saturated vapour pressure of water rises with temperature.', 'Veden kylläisen höyryn paine nousee lämpötilan mukana.') }, { id: 'c', html: T('At the dew point the relative humidity is 100 %.', 'Kastepisteessä suhteellinen kosteus on 100 %.') }, { id: 'd', html: T('CO₂ at 40 °C can be liquefied by compression.', 'CO₂ voidaan nesteyttää 40 °C:ssa puristamalla.') }, { id: 'e', html: T('At the triple point solid, liquid and gas coexist.', 'Kolmoispisteessä kiinteä, neste ja kaasu ovat yhtä aikaa.') }],
      hints: [T('Check each against the pT diagram and the saturation table.', 'Tarkista jokainen pT-piirroksen ja kyllästystaulukon avulla.')] },
    { id: 't5-q24', mode: 'graded', type: 'numeric', difficulty: 2, tol: 0.02,
      prompt: T('At 22 °C and RH = 60 % the partial pressure of water vapour is 1.58 kPa. Use the ideal gas law with M = 18 g/mol to find the absolute humidity.', 'Lämpötilassa 22 °C ja RH = 60 % vesihöyryn osapaine on 1,58 kPa. Laske absoluuttinen kosteus ideaalikaasun tilanyhtälöllä, kun M = 18 g/mol.'),
      fields: [{ id: 'rho', tex: 'ρ_v', unit: 'g/m³' }],
      hints: [T('ρ = pM/(RT) with T in kelvins.', 'ρ = pM/(RT), kun T on kelvineinä.')] }
  ];

  TDC.registerTopic({
    id: 't5', num: 5,
    title: T('Phases, vapour pressure and humidity', 'Olomuodot, höyrynpaine ja kosteus'),
    subtitle: T('From the pT diagram to the pressure cooker and the dew point in an electrical cabinet.', 'pT-piirroksesta painekattilaan ja sähkökotelon kastepisteeseen.'),
    objectives: [
      T('read a pT diagram: solid, liquid, gas, triple point, critical point', 'lukea pT-piirros: kiinteä, neste, kaasu, kolmoispiste, kriittinen piste'),
      T('tell vapour from gas using the critical temperature and the pV isotherms', 'erottaa höyry kaasusta kriittisen lämpötilan ja pV-isotermien avulla'),
      T('explain saturated vapour pressure as a dynamic equilibrium and use it for the boiling point', 'selittää kylläisen höyryn paine dynaamisena tasapainona ja käyttää sitä kiehumispisteen määrittämiseen'),
      T('compute absolute and relative humidity and the dew point from the saturation table', 'laskea absoluuttinen ja suhteellinen kosteus sekä kastepiste kyllästystaulukosta'),
      T('predict condensation in an electrical cabinet and choose a heater', 'ennustaa kosteuden tiivistyminen sähkökotelossa ja valita lämmitin')
    ],
    glossary: {
      phase: { en: 'phase', fi: 'olomuoto', sym: '', def: T('A uniform state of matter: solid, liquid or gas (vapour).', 'Aineen yhtenäinen olomuoto: kiinteä, neste tai kaasu (höyry).') },
      'phase change': { en: 'phase change', fi: 'olomuodon muutos', sym: '', def: T('Transition between phases, e.g. melting, boiling, condensation, sublimation.', 'Siirtyminen olomuodosta toiseen, esim. sulaminen, kiehuminen, tiivistyminen, sublimoituminen.') },
      'phase diagram': { en: 'phase diagram (pT diagram)', fi: 'olomuotopiirros (pT-piirros)', sym: '', def: T('Graph of pressure against temperature showing where each phase is stable.', 'Paineen ja lämpötilan kuvaaja, josta nähdään missä kukin olomuoto on pysyvä.') },
      'pVT surface': { en: 'pVT surface', fi: 'pVT-pinta', sym: '', def: T('The surface of the allowed states (p, V, T) of a substance.', 'Aineen sallittujen tilojen (p, V, T) muodostama pinta.') },
      isotherm: { en: 'isotherm', fi: 'isotermi', sym: '', def: T('A curve of constant temperature in a pV diagram.', 'Vakiolämpötilaa kuvaava käyrä pV-piirroksessa.') },
      'critical point': { en: 'critical point', fi: 'kriittinen piste', sym: 'p_c, T_c', def: T('End point of the vaporisation curve. Above T_c a gas cannot be liquefied by pressure alone.', 'Höyrystymiskäyrän päätepiste. Lämpötilan T_c yläpuolella kaasua ei voi nesteyttää pelkällä paineella.') },
      'critical temperature': { en: 'critical temperature', fi: 'kriittinen lämpötila', sym: 'T_c', def: T('The highest temperature at which a vapour can be liquefied by raising the pressure.', 'Korkein lämpötila, jossa höyry voidaan nesteyttää painetta nostamalla.') },
      'triple point': { en: 'triple point', fi: 'kolmoispiste', sym: '', def: T('The only state where solid, liquid and gas are in equilibrium. Water: 0.01 °C, 611.7 Pa.', 'Ainoa tila, jossa kiinteä, neste ja kaasu ovat tasapainossa. Vesi: 0,01 °C, 611,7 Pa.') },
      vaporization: { en: 'vaporisation', fi: 'höyrystyminen', sym: '', def: T('Liquid turning into vapour (evaporation or boiling).', 'Nesteen muuttuminen höyryksi (haihtuminen tai kiehuminen).') },
      evaporation: { en: 'evaporation', fi: 'haihtuminen', sym: '', def: T('Molecules leave the liquid surface into the vapour phase.', 'Molekyylit siirtyvät nesteen pinnalta höyryfaasiin.') },
      condensation: { en: 'condensation', fi: 'tiivistyminen', sym: '', def: T('Vapour molecules hit the liquid surface and join the liquid.', 'Höyrymolekyylit osuvat nesteen pintaan ja liittyvät nesteeseen.') },
      boiling: { en: 'boiling', fi: 'kiehuminen', sym: '', def: T('Vaporisation inside the liquid when the saturated vapour pressure equals the external pressure.', 'Höyrystyminen nesteen sisällä, kun kylläisen höyryn paine on yhtä suuri kuin ulkoinen paine.') },
      'boiling point': { en: 'boiling point', fi: 'kiehumispiste', sym: 't_b', def: T('The temperature at which p_vs equals the external pressure.', 'Lämpötila, jossa kylläisen höyryn paine on yhtä suuri kuin ulkoinen paine.') },
      sublimation: { en: 'sublimation', fi: 'sublimoituminen', sym: '', def: T('Solid turning directly into gas.', 'Kiinteän aineen muuttuminen suoraan kaasuksi.') },
      'saturated vapour': { en: 'saturated vapour', fi: 'kylläinen höyry', sym: '', def: T('Vapour in dynamic equilibrium with its liquid.', 'Höyry, joka on dynaamisessa tasapainossa nesteensä kanssa.') },
      'saturated vapour pressure': { en: 'saturated vapour pressure', fi: 'kylläisen höyryn paine', sym: 'p_vs', def: T('The pressure of the vapour in equilibrium with its liquid. It depends only on temperature.', 'Nesteensä kanssa tasapainossa olevan höyryn paine. Se riippuu vain lämpötilasta.') },
      'saturated vapour density': { en: 'saturated vapour density', fi: 'kylläisen höyryn tiheys', sym: 'ρ_vs', def: T('The largest water vapour density the air can hold at a given temperature.', 'Suurin vesihöyryn tiheys, jonka ilma voi sisältää tietyssä lämpötilassa.') },
      'absolute humidity': { en: 'absolute humidity', fi: 'absoluuttinen kosteus', sym: 'ρ_v', def: T('Mass of water vapour per volume of air, ρ_v = m_v / V.', 'Vesihöyryn massa ilmatilavuutta kohti, ρ_v = m_v / V.') },
      'relative humidity': { en: 'relative humidity', fi: 'suhteellinen kosteus', sym: 'φ', def: T('Vapour density (or pressure) divided by its saturated value, φ = ρ_v / ρ_vs.', 'Höyryn tiheys (tai paine) jaettuna kylläisellä arvolla, φ = ρ_v / ρ_vs.') },
      'dew point': { en: 'dew point', fi: 'kastepiste', sym: 't_d', def: T('The temperature at which the air becomes saturated (φ = 100 %) when cooled.', 'Lämpötila, jossa ilma jäähtyessään kyllästyy (φ = 100 %).') },
      supersaturation: { en: 'supersaturation', fi: 'ylikyllästyminen', sym: '', def: T('A state with φ > 100 %: more vapour than the saturated amount.', 'Tila, jossa φ > 100 %: höyryä on enemmän kuin kylläinen määrä.') }
    },
    formulas: [
      { name: T('Absolute humidity', 'Absoluuttinen kosteus'), tex: 'ρ_v = {m_v}/{V}' },
      { name: T('Relative humidity', 'Suhteellinen kosteus'), tex: 'φ = {ρ_v}/{ρ_{vs}} = {m_v}/{m_{vs}} = {p_v}/{p_{vs}}' },
      { name: T('Dew point', 'Kastepiste'), tex: 'p_v = p_{vs}(t_d)' },
      { name: T('Vapour density from the ideal gas law', 'Höyryn tiheys ideaalikaasun tilanyhtälöstä'), tex: 'ρ_v = {p_v M}/{R T}' },
      { name: T('Boiling condition', 'Kiehumisehto'), tex: 'p_{vs}(t_b) = p_{ext}' }
    ],
    sections: [
      // ================= 1. pVT, pT =================
      { id: 't5-pvt', title: T('Phases: the pVT surface and the pT diagram', 'Olomuodot: pVT-pinta ja pT-piirros'),
        blocks: [
          { id: 't5-pvt-p1', type: 'text', html: T(
            '<p>The standard way to describe how a substance behaves is the <b>pVT surface</b> and its projections: the <b>pT diagram</b> and the <b>pV diagram</b>. A state is fixed by pressure, volume and temperature. The surface shows clearly separated regions for solid, liquid and gas, and mixed regions (liquid + vapour, solid + vapour) where two <dfn data-term="phase">phases</dfn> live together.</p><p>On the pVT surface the <dfn data-term="triple point">triple point</dfn> is a whole <em>line</em>, because the volume is not fixed there. In the pT projection it shrinks to one point: for water <f>T = 273.16 K</f> (<f>t = +0.01 °C</f>) and <f>p = 611.73 Pa</f>. Solid, liquid and gas are then in dynamic equilibrium.</p>',
            '<p>Aineen käyttäytymisen vakiokuvaus on <b>pVT-pinta</b> ja sen projektiot: <b>pT-piirros</b> ja <b>pV-piirros</b>. Tilan määräävät paine, tilavuus ja lämpötila. Pinnalla näkyvät selvästi kiinteän, nesteen ja kaasun alueet sekä sekaalueet (neste + höyry, kiinteä + höyry), joissa kaksi <dfn data-term="phase">olomuotoa</dfn> on yhtä aikaa.</p><p>pVT-pinnalla <dfn data-term="triple point">kolmoispiste</dfn> on kokonainen <em>viiva</em>, koska tilavuus ei ole siinä kiinteä. pT-projektiossa se kutistuu pisteeksi: vedellä <f>T = 273,16 K</f> (<f>t = +0,01 °C</f>) ja <f>p = 611,73 Pa</f>. Kiinteä, neste ja kaasu ovat silloin dynaamisessa tasapainossa.</p>') },
          { id: 't5-pvt-p2', type: 'text', html: T(
            '<p>In the <b>pT diagram</b> three curves meet at the triple point: the <b>melting curve</b> (solid–liquid), the <b>vaporisation curve</b> (liquid–gas) and the <b>sublimation curve</b> (solid–gas). The vaporisation curve ends at the <dfn data-term="critical point">critical point</dfn>. Beyond it there is no sharp difference between liquid and gas: a <b>supercritical fluid</b>.</p><p>Two details worth noticing: crossing the pT diagram at 1 atm gives the normal melting point and boiling point (water: 0 °C and 100 °C; CO₂ has no liquid at 1 atm, it <dfn data-term="sublimation">sublimes</dfn> at −78.5 °C). Water is special: its melting curve leans left, so ice melts under high pressure. For CO₂ it leans right.</p>',
            '<p><b>pT-piirroksessa</b> kolmoispisteessä kohtaavat kolme käyrää: <b>sulamiskäyrä</b> (kiinteä–neste), <b>höyrystymiskäyrä</b> (neste–kaasu) ja <b>sublimoitumiskäyrä</b> (kiinteä–kaasu). Höyrystymiskäyrä päättyy <dfn data-term="critical point">kriittiseen pisteeseen</dfn>. Sen yläpuolella nesteen ja kaasun ero häviää: kyseessä on <b>ylikriittinen fluidi</b>.</p><p>Huomaa kaksi asiaa: 1 atm:n paineessa piirroksen poikki kulkeva viiva antaa normaalin sulamis- ja kiehumispisteen (vesi: 0 °C ja 100 °C; CO₂:lla ei ole nestettä 1 atm:ssä, vaan se <dfn data-term="sublimation">sublimoituu</dfn> lämpötilassa −78,5 °C). Vesi on erikoistapaus: sen sulamiskäyrä kallistuu vasemmalle, joten jää sulaa suuressa paineessa. CO₂:lla käyrä kallistuu oikealle.</p>') },
          { id: 't5-pvt-p2b', type: 'text', html: T('<p>Triple point of CO₂ (slide): −56.4 °C and 5.11 atm; at 1 atm the sublimation point is −78.5 °C. Water (slide): triple point 0.01 °C and 0.006 atm, normal boiling point 100 °C.</p>', '<p>CO₂:n kolmoispiste (kalvo): −56,4 °C ja 5,11 atm; 1 atm:ssä sublimoitumispiste on −78,5 °C. Veden kolmoispiste (kalvo): 0,01 °C ja 0,006 atm, normaali kiehumispiste 100 °C.</p>') },
          { id: 't5-pvt-w1', type: 'interactive', widget: 'custom', title: T('Phase diagram of water: drag the state point', 'Veden olomuotopiirros: vedä tilapistettä'),
            caption: T('The pressure axis is logarithmic. Drag the dot (or use the sliders) and watch the phase. Follow the 1 atm line: its crossings with the curves give 0 °C and 100 °C. The vaporisation curve is drawn from the course table, above 100 °C from steam tables (extra).', 'Paineakseli on logaritminen. Vedä pistettä (tai käytä liukusäätimiä) ja seuraa olomuotoa. 1 atm:n viivan leikkaukset käyrien kanssa antavat 0 °C ja 100 °C. Höyrystymiskäyrä on piirretty kurssin taulukosta, yli 100 °C:n osalta höyrytaulukoista (lisä).'),
            config: { mount: phaseWidget({ sub: 'water' }) } },
          { id: 't5-pvt-w2', type: 'interactive', widget: 'custom', title: T('Phase diagram of carbon dioxide (fire extinguisher, dry ice)', 'Hiilidioksidin olomuotopiirros (sammutin, kuivajää)'),
            caption: T('At 1 atm CO₂ goes straight from solid to gas (dry ice, −78.5 °C). A CO₂ cylinder holds liquid at room temperature, because its pressure is above the vaporisation curve (5.7 MPa at 20 °C). Above 31.1 °C and 73 atm it is a supercritical fluid.', 'Ilmanpaineessa CO₂ muuttuu suoraan kiinteästä kaasuksi (kuivajää, −78,5 °C). CO₂-pullossa on huoneenlämmössä nestettä, koska paine on höyrystymiskäyrän yläpuolella (5,7 MPa lämpötilassa 20 °C). Yli 31,1 °C:ssa ja 73 atm:ssä se on ylikriittinen fluidi.'),
            config: { mount: phaseWidget({ sub: 'co2', values: { t: 20, p: 101.325 } }) } },
          { id: 't5-pvt-q1', type: 'question', q: 't5-q1' },
          { id: 't5-pvt-q2', type: 'question', q: 't5-q2' },
          { id: 't5-pvt-t1', type: 'table', caption: T('Critical temperatures and pressures (slide table; MPa column added)', 'Kriittiset lämpötilat ja paineet (kalvon taulukko; MPa-sarake lisätty)'),
            head: [T('Substance', 'Aine'), { tex: 't_c / °C' }, { tex: 'T_c / K' }, { tex: 'p_c / atm' }, { tex: 'p_c / MPa' }],
            rows: [[T('Water', 'Vesi'), '374', '647', dec('218'), dec('22.1')], [T('Carbon dioxide', 'Hiilidioksidi'), '31', '304', dec('72.8'), dec('7.38')],
              [T('Oxygen', 'Happi'), '−118', '155', dec('50'), dec('5.07')], [T('Nitrogen', 'Typpi'), '−147', '126', dec('33.5'), dec('3.39')],
              [T('Hydrogen', 'Vety'), dec('−239.9'), dec('33.3'), dec('12.8'), dec('1.30')], [T('Helium', 'Helium'), dec('−267.9'), dec('5.3'), dec('2.3'), dec('0.233')]] },
          { id: 't5-pvt-q3', type: 'question', q: 't5-q3' },
          { id: 't5-pvt-q4', type: 'question', q: 't5-q4' }
        ] },
      // ================= 2. pV isotherms =================
      { id: 't5-isotherm', title: T('pV isotherms: vapour or gas?', 'pV-isotermit: höyry vai kaasu?'),
        blocks: [
          { id: 't5-iso-p1', type: 'text', html: T(
            '<p>In a pV projection each curve is an <dfn data-term="isotherm">isotherm</dfn>: pressure against volume at constant temperature, with <f>T_A > T_B > T_C > T_D</f>. The dashed curves are an <b>ideal gas</b> (<f>pV = nRT</f>, a hyperbola). Real gases follow them at high temperature and low pressure, but at lower temperature they deviate.</p><p>Below a certain isotherm, the <b>critical isotherm</b> at <f>T_c</f>, an isotherm contains a flat part a–b. There the pressure stays constant while the volume decreases: vapour condenses into liquid (the liquid + vapour region). Only then the pressure is the saturated vapour pressure.</p>',
            '<p>pV-projektiossa jokainen käyrä on <dfn data-term="isotherm">isotermi</dfn>: paine tilavuuden funktiona vakiolämpötilassa, kun <f>T_A > T_B > T_C > T_D</f>. Katkoviivat kuvaavat <b>ideaalikaasua</b> (<f>pV = nRT</f>, hyperbeli). Todelliset kaasut seuraavat sitä korkeassa lämpötilassa ja pienessä paineessa, mutta matalammassa lämpötilassa ne poikkeavat siitä.</p><p>Tietyn isotermin, <b>kriittisen isotermin</b> lämpötilassa <f>T_c</f>, alapuolella isotermissa on vaakasuora osa a–b. Siinä paine pysyy vakiona tilavuuden pienentyessä: höyry tiivistyy nesteeksi (neste + höyry -alue). Vain silloin paine on kylläisen höyryn paine.</p>') },
          { id: 't5-iso-c1', type: 'callout', kind: 'key', title: T('Gas or vapour?', 'Kaasu vai höyry?'), html: T(
            '<p><b>Vapour:</b> <f>T < T_c</f>. It can be liquefied by raising the pressure.<br><b>Gas:</b> <f>T > T_c</f>. No pressure, however large, liquefies it.</p>',
            '<p><b>Höyry:</b> <f>T < T_c</f>. Sen voi nesteyttää painetta nostamalla.<br><b>Kaasu:</b> <f>T > T_c</f>. Mikään paine ei nesteytä sitä.</p>') },
          { id: 't5-iso-w1', type: 'interactive', widget: 'custom', title: T('Compress a vapour: isotherms of a real fluid', 'Puristetaan höyryä: todellisen fluidin isotermit'),
            caption: T('Axes in units of the critical values (reduced van der Waals fluid, extra). Set T/T_c below 1 and push V/V_c down: at the flat part the vapour condenses at constant pressure. Above T/T_c = 1 the isotherm has no flat part, and the gas never condenses. The dotted line is the ideal gas.', 'Akselit ovat kriittisten arvojen yksiköissä (redusoitu van der Waals -fluidi, lisä). Aseta T/T_c alle 1:n ja pienennä V/V_c: vaakasuoralla osalla höyry tiivistyy vakiopaineessa. Kun T/T_c yli 1, isotermissä ei ole vaakaosaa eikä kaasu koskaan tiivisty. Pisteviiva on ideaalikaasu.'),
            config: { mount: isothermWidget } },
          { id: 't5-iso-q1', type: 'question', q: 't5-q5' },
          { id: 't5-iso-q2', type: 'question', q: 't5-q6' }
        ] },
      // ================= 3. evaporation =================
      { id: 't5-evap', title: T('Evaporation, condensation and saturated vapour pressure', 'Haihtuminen, tiivistyminen ja kylläisen höyryn paine'),
        blocks: [
          { id: 't5-evap-p1', type: 'text', html: T(
            '<p><dfn data-term="evaporation">Evaporation</dfn>: molecules of the liquid move into the vapour phase if their kinetic energy is large enough. In a closed container the vapour is above the liquid. <dfn data-term="condensation">Condensation</dfn> is the inverse: vapour molecules strike the liquid surface and join the liquid.</p><p>When as many molecules condense as evaporate, the vapour is <dfn data-term="saturated vapour">saturated</dfn> and the equilibrium is <em>dynamic</em>: both processes go on, their rates are equal. The pressure of the saturated vapour is the <dfn data-term="saturated vapour pressure">saturated vapour pressure</dfn> <f>p_{vs}</f>. <b>It depends on the temperature only</b> (not on how much liquid there is or on the volume).</p>',
            '<p><dfn data-term="evaporation">Haihtuminen</dfn>: nesteen molekyylit siirtyvät höyryfaasiin, jos niiden liike-energia on riittävän suuri. Suljetussa astiassa höyry on nesteen yläpuolella. <dfn data-term="condensation">Tiivistyminen</dfn> on käänteinen prosessi: höyrymolekyylit osuvat nesteen pintaan ja liittyvät nesteeseen.</p><p>Kun tiivistyviä molekyylejä on yhtä paljon kuin haihtuvia, höyry on <dfn data-term="saturated vapour">kylläistä</dfn> ja tasapaino on <em>dynaaminen</em>: molemmat prosessit jatkuvat yhtä nopeina. Kylläisen höyryn paine on <dfn data-term="saturated vapour pressure">kylläisen höyryn paine</dfn> <f>p_{vs}</f>. <b>Se riippuu vain lämpötilasta</b> (ei nesteen määrästä eikä tilavuudesta).</p>') },
          { id: 't5-evap-w1', type: 'interactive', widget: 'custom', title: T('Sealed bottle: evaporation and condensation', 'Suljettu pullo: haihtuminen ja tiivistyminen'),
            caption: T('A schematic simulation (molecule numbers are scaled). Raise the temperature: evaporation wins first, the vapour gets denser, and condensation grows until the two rates are equal again. The equilibrium vapour density follows the saturation table.', 'Kaaviollinen simulaatio (molekyylimäärät on skaalattu). Nosta lämpötilaa: ensin haihtuminen voittaa, höyry tiivistyy tiheämmäksi ja tiivistyminen kasvaa, kunnes nopeudet ovat taas yhtä suuret. Tasapainon höyrytiheys noudattaa kyllästystaulukkoa.'),
            config: { mount: evapWidget } },
          { id: 't5-evap-q1', type: 'question', q: 't5-q7' },
          { id: 't5-evap-q2', type: 'question', q: 't5-q8' }
        ] },
      // ================= 4. boiling =================
      { id: 't5-boil', title: T('Vapour pressure curve and boiling point', 'Höyrynpainekäyrä ja kiehumispiste'),
        blocks: [
          { id: 't5-boil-p1', type: 'text', html: T(
            '<p>The saturated vapour pressure of water rises very steeply with temperature: from 0.61 kPa at 0 °C to 101.3 kPa at 100 °C and 199 kPa at 120 °C. <dfn data-term="boiling">Boiling</dfn> starts at the temperature where the saturated vapour pressure equals the <b>external pressure</b>, so bubbles of vapour can form inside the liquid:</p>',
            '<p>Veden kylläisen höyryn paine nousee lämpötilan mukana erittäin jyrkästi: 0,61 kPa lämpötilassa 0 °C, 101,3 kPa lämpötilassa 100 °C ja 199 kPa lämpötilassa 120 °C. <dfn data-term="boiling">Kiehuminen</dfn> alkaa lämpötilassa, jossa kylläisen höyryn paine on yhtä suuri kuin <b>ulkoinen paine</b>, jolloin nesteen sisään voi muodostua höyrykuplia:</p>') },
          { id: 't5-boil-f1', type: 'formula', key: true, tex: 'p_{vs}(t_b) = p_{ext}', label: T('Boiling point', 'Kiehumispiste'),
            legend: [['t_b', T('boiling point', 'kiehumispiste'), '°C'], ['p_{ext}', T('external pressure', 'ulkoinen paine'), 'kPa']] },
          { id: 't5-boil-p2', type: 'text', html: T('<p>Slide example: at an external pressure of 20 kPa water boils at 60 °C (the table gives 19.9 kPa at 60 °C). Lower pressure (mountains, vacuum pots) lowers the boiling point; higher pressure (pressure cooker) raises it.</p>', '<p>Kalvon esimerkki: 20 kPa:n ulkoisessa paineessa vesi kiehuu 60 °C:ssa (taulukossa 60 °C:ssa 19,9 kPa). Pienempi paine (vuoristo, tyhjiöastiat) alentaa kiehumispistettä, suurempi paine (painekattila) nostaa sitä.</p>') },
          { id: 't5-boil-w1', type: 'interactive', widget: 'custom', title: T('Pressure cooker and mountain: boiling point of water', 'Painekattila ja vuori: veden kiehumispiste'),
            caption: T('Altitude <f>h</f> lowers the atmospheric pressure (barometric formula). The gauge pressure <f>p_g</f> is the overpressure in a pressure cooker (positive) or the vacuum in a vacuum pot (negative). The dot rides on the vapour pressure curve: that is where the water boils. Try the summit of Mount Everest (8848 m), and a cooker with 100 kPa overpressure.', 'Korkeus <f>h</f> pienentää ilmanpainetta (barometrinen kaava). Ylipaine <f>p_g</f> on painekattilan ylipaine (positiivinen) tai alipaine tyhjiöastiassa (negatiivinen). Piste kulkee höyrynpainekäyrällä: siinä vesi kiehuu. Kokeile Mount Everestin huippua (8848 m) ja kattilaa, jonka ylipaine on 100 kPa.'),
            config: { mount: boilWidget } },
          { id: 't5-boil-ex1', type: 'example', title: T('Boiling at altitude and in a pressure cooker', 'Kiehuminen vuorella ja painekattilassa'),
            problem: T('Find the boiling point of water (a) on the summit of Mount Everest, where the table of the slide gives p = 3.12·10⁴ Pa, and (b) in a pressure cooker where the absolute pressure is 199 kPa.', 'Laske veden kiehumispiste (a) Mount Everestin huipulla, jossa kalvon taulukon mukaan p = 3,12·10⁴ Pa, ja (b) painekattilassa, jossa absoluuttinen paine on 199 kPa.'),
            given: ['p_a = 31.2 kPa', 'p_b = 199 kPa'],
            steps: [
              T('Boiling point: the temperature where the saturated vapour pressure equals the external pressure.', 'Kiehumispiste on lämpötila, jossa kylläisen höyryn paine on yhtä suuri kuin ulkoinen paine.'),
              { tex: 'p_{vs}(t_b) = p_{ext}' },
              T('(a) The table has 31.2 kPa at 70 °C, so water boils at about 70 °C. The barometric formula with 8848 m gives 33.6 kPa, i.e. about 72 °C.', '(a) Taulukossa 31,2 kPa vastaa 70 °C:ta, joten vesi kiehuu noin 70 °C:ssa. Barometrinen kaava antaa korkeudella 8848 m paineen 33,6 kPa eli noin 72 °C.'),
              T('(b) The table has 199 kPa at 120 °C, so water boils at 120 °C. The gauge pressure is 199 − 101.3 ≈ 98 kPa.', '(b) Taulukossa 199 kPa vastaa 120 °C:ta, joten vesi kiehuu 120 °C:ssa. Ylipaine on 199 − 101,3 ≈ 98 kPa.')
            ],
            result: T('(a) about 70 °C, (b) 120 °C', '(a) noin 70 °C, (b) 120 °C') },
          { id: 't5-boil-t1', type: 'table', caption: T('Saturated vapour pressure of water (slide table 18-2)', 'Veden kylläisen höyryn paine (kalvon taulukko 18-2)'),
            head: [{ tex: 't / °C' }, T('p_vs / torr (= mmHg)', 'p_vs / torr (= mmHg)'), T('p_vs / Pa', 'p_vs / Pa')],
            rows: [['−50', dec('0.030'), dec('4.0')], ['−10', dec('1.95'), { tex: '2.60 · 10^2' }], ['0', dec('4.58'), { tex: '6.11 · 10^2' }], ['5', dec('6.54'), { tex: '8.72 · 10^2' }],
              ['10', dec('9.21'), { tex: '1.23 · 10^3' }], ['15', dec('12.8'), { tex: '1.71 · 10^3' }], ['20', dec('17.5'), { tex: '2.33 · 10^3' }], ['25', dec('23.8'), { tex: '3.17 · 10^3' }],
              ['30', dec('31.8'), { tex: '4.24 · 10^3' }], ['40', dec('55.3'), { tex: '7.37 · 10^3' }], ['50', dec('92.5'), { tex: '1.23 · 10^4' }], ['60', '149', { tex: '1.99 · 10^4' }],
              [T('70 (Mt. Everest summit)', '70 (Mount Everestin huippu)'), '234', { tex: '3.12 · 10^4' }], ['80', '355', { tex: '4.73 · 10^4' }], ['90', '526', { tex: '7.01 · 10^4' }],
              [T('100 (boiling point at sea level)', '100 (kiehumispiste merenpinnan tasolla)'), '760', { tex: '1.01 · 10^5' }], ['120', '1489', { tex: '1.99 · 10^5' }], ['150', '3570', { tex: '4.76 · 10^5' }]] },
          { id: 't5-boil-c1', type: 'callout', kind: 'info', title: T('Why does it rain? (slide question)', 'Mistä sade johtuu? (kalvon kysymys)'), html: T(
            '<p>Warm moist air rises and cools. Its vapour pressure stays about the same while the saturated vapour pressure falls steeply with temperature, so the air reaches the dew point, becomes <dfn data-term="supersaturation">supersaturated</dfn> and the vapour condenses into droplets (on dust and salt particles). The droplets grow and fall as rain.</p>',
            '<p>Lämmin kostea ilma nousee ja jäähtyy. Sen höyrynpaine pysyy suunnilleen samana, mutta kylläisen höyryn paine laskee jyrkästi lämpötilan mukana. Ilma saavuttaa kastepisteen, <dfn data-term="supersaturation">ylikyllästyy</dfn> ja höyry tiivistyy pisaroiksi (pöly- ja suolahiukkasten pinnalle). Pisarat kasvavat ja putoavat sateena.</p>') },
          { id: 't5-boil-q1', type: 'question', q: 't5-q9' },
          { id: 't5-boil-q2', type: 'question', q: 't5-q10' },
          { id: 't5-boil-q3', type: 'question', q: 't5-q11' }
        ] },
      // ================= 5. humidity =================
      { id: 't5-humid', title: T('Humidity, dew point and the electrical cabinet', 'Kosteus, kastepiste ja sähkökotelo'),
        blocks: [
          { id: 't5-hum-p1', type: 'text', html: T(
            '<p>Humid air is a mixture of dry air and water vapour. The <dfn data-term="absolute humidity">absolute humidity</dfn> is the vapour density, the mass of water vapour in a volume of air:</p>',
            '<p>Kostea ilma on kuivan ilman ja vesihöyryn seos. <dfn data-term="absolute humidity">Absoluuttinen kosteus</dfn> on höyryn tiheys eli vesihöyryn massa ilmatilavuudessa:</p>') },
          { id: 't5-hum-f1', type: 'formula', tex: 'ρ_v = {m_v}/{V}', label: T('Absolute humidity', 'Absoluuttinen kosteus'), legend: [['m_v', T('mass of water vapour', 'vesihöyryn massa'), 'kg'], ['V', T('volume of air', 'ilman tilavuus'), 'm³']] },
          { id: 't5-hum-p2', type: 'text', html: T(
            '<p>The largest vapour mass that air can hold depends on temperature, so we normally use the <dfn data-term="relative humidity">relative humidity</dfn> (RH, symbol <f>φ</f>): the actual vapour amount divided by the saturated amount at the same temperature. It can be defined with densities, masses or partial pressures:</p>',
            '<p>Suurin vesihöyrymäärä, jonka ilma voi sisältää, riippuu lämpötilasta, joten yleensä käytetään <dfn data-term="relative humidity">suhteellista kosteutta</dfn> (RH, tunnus <f>φ</f>): todellinen höyrymäärä jaettuna kylläisellä määrällä samassa lämpötilassa. Se voidaan määrittää tiheyksillä, massoilla tai osapaineilla:</p>') },
          { id: 't5-hum-f2', type: 'formula', key: true, tex: 'φ = {ρ_v}/{ρ_{vs}} = {m_v}/{m_{vs}} = {p_v}/{p_{vs}}', label: T('Relative humidity (usually given in %)', 'Suhteellinen kosteus (ilmoitetaan yleensä %)'),
            legend: [['ρ_{vs}, m_{vs}, p_{vs}', T('saturated values at the same temperature', 'kylläiset arvot samassa lämpötilassa'), ''], ['ρ_v, m_v, p_v', T('actual partial values of the vapour', 'höyryn todelliset osa-arvot'), '']] },
          { id: 't5-hum-p3', type: 'text', html: T(
            '<p>Example from the slide, a measuring system shows RH = 75 %, t = 18 °C. The <dfn data-term="dew point">dew point</dfn> <f>t_d</f> is the temperature at which the partial vapour pressure equals the saturated vapour pressure: <f>p_v = p_{vs}</f>, RH = 100 %. If air is cooled below it, vapour condenses. If cooled fast, the air may even be <dfn data-term="supersaturation">supersaturated</dfn>: <f>p_v > p_{vs}</f>, RH > 100 %.</p>',
            '<p>Esimerkki kalvolta: mittausjärjestelmä näyttää RH = 75 %, t = 18 °C. <dfn data-term="dew point">Kastepiste</dfn> <f>t_d</f> on lämpötila, jossa höyryn osapaine on yhtä suuri kuin kylläisen höyryn paine: <f>p_v = p_{vs}</f>, RH = 100 %. Jos ilma jäähtyy tämän alle, höyry tiivistyy. Nopeassa jäähtymisessä ilma voi olla jopa <dfn data-term="supersaturation">ylikyllästynyttä</dfn>: <f>p_v > p_{vs}</f>, RH > 100 %.</p>') },
          { id: 't5-hum-ex1', type: 'example', title: T('Humidity of 75 % at 18 °C', 'Kosteus 75 % lämpötilassa 18 °C'),
            problem: T('Air at 18 °C has RH = 75 %. Find the absolute humidity, the partial vapour pressure and the dew point. Use the saturation table.', 'Ilman lämpötila on 18 °C ja RH = 75 %. Laske absoluuttinen kosteus, höyryn osapaine ja kastepiste. Käytä kyllästystaulukkoa.'),
            given: ['t = 18 °C', 'φ = 0.75'],
            steps: [
              T('From the table at 18 °C: saturated density and pressure.', 'Taulukosta lämpötilassa 18 °C: kylläinen tiheys ja paine.'),
              { tex: 'ρ_{vs} = 15.3 g/m³, p_{vs} = 2.06 kPa' },
              { tex: 'ρ_v = φ ρ_{vs} = 0.75 · 15.3 g/m³ = 11.5 g/m³' },
              { tex: 'p_v = φ p_{vs} = 0.75 · 2.06 kPa = 1.55 kPa' },
              T('Dew point: the temperature at which 11.5 g/m³ is the saturated density. The table has 11.4 g/m³ at 13 °C and 12.1 g/m³ at 14 °C; interpolating gives 13.1 °C.', 'Kastepiste: lämpötila, jossa 11,5 g/m³ on kylläinen tiheys. Taulukossa 11,4 g/m³ vastaa 13 °C:ta ja 12,1 g/m³ 14 °C:ta; interpoloimalla saadaan 13,1 °C.')
            ],
            result: T('ρ_v ≈ 11.5 g/m³, p_v ≈ 1.55 kPa, t_d ≈ 13.1 °C', 'ρ_v ≈ 11,5 g/m³, p_v ≈ 1,55 kPa, t_d ≈ 13,1 °C') },
          { id: 't5-hum-p4', type: 'text', html: T(
            '<p>At temperatures near room temperature the partial pressure of water vapour is small, so the vapour behaves like an <b>ideal gas</b> (<f>pV = nRT</f>) and the partial density follows from the partial pressure:</p>',
            '<p>Huoneenlämpötilan tienoilla vesihöyryn osapaine on pieni, joten höyry käyttäytyy kuin <b>ideaalikaasu</b> (<f>pV = nRT</f>) ja osatiheys saadaan osapaineesta:</p>') },
          { id: 't5-hum-f3', type: 'formula', key: true, tex: 'ρ_v = {p_v M}/{R T}', label: T('Vapour density from the ideal gas law', 'Höyryn tiheys ideaalikaasun tilanyhtälöstä'),
            legend: [['M', T('molar mass of water, 18 g/mol = 0.018 kg/mol', 'veden moolimassa, 18 g/mol = 0,018 kg/mol'), 'kg/mol'], ['R', T('gas constant 8.314', 'kaasuvakio 8,314'), 'J/(mol·K)'], ['T', T('absolute temperature', 'absoluuttinen lämpötila'), 'K']] },
          { id: 't5-hum-ex2', type: 'example', title: T('Is the table consistent? ρ_vs at 20 °C', 'Onko taulukko johdonmukainen? ρ_vs lämpötilassa 20 °C'),
            problem: T('The saturated vapour pressure at 20 °C is 2.33 kPa. Compute the saturated vapour density with the ideal gas law and compare with the table.', 'Kylläisen höyryn paine lämpötilassa 20 °C on 2,33 kPa. Laske kylläisen höyryn tiheys ideaalikaasun tilanyhtälöllä ja vertaa taulukkoon.'),
            given: ['p_{vs} = 2330 Pa', 'M = 0.018 kg/mol', 'T = 293.15 K'],
            steps: [{ tex: 'ρ_{vs} = {p_{vs} M}/{R T} = {2330 Pa · 0.018 kg/mol}/{8.314 J/(mol·K) · 293.15 K}' }, { tex: 'ρ_{vs} = 0.0172 kg/m³ = 17.2 g/m³' },
              T('The table says 17.3 g/m³: the ideal gas law is good to better than 1 %.', 'Taulukossa on 17,3 g/m³: ideaalikaasun tilanyhtälö on tarkka yli 1 %:n tarkkuudella.')],
            result: T('ρ_vs ≈ 17.2 g/m³ (table 17.3 g/m³)', 'ρ_vs ≈ 17,2 g/m³ (taulukko 17,3 g/m³)') },
          { id: 't5-hum-q1', type: 'question', q: 't5-q12' },
          { id: 't5-hum-q2', type: 'question', q: 't5-q13' },
          { id: 't5-hum-q3', type: 'question', q: 't5-q14' },
          { id: 't5-hum-q3b', type: 'question', q: 't5-q15' },
          { id: 't5-hum-h1', type: 'h', text: T('Device example: condensation in an electrical cabinet', 'Laiteesimerkki: kosteuden tiivistyminen sähkökotelossa') },
          { id: 't5-hum-p5', type: 'text', html: T(
            '<p>A cabinet that stands outdoors or in a cold hall has walls colder than the air inside. If the wall temperature <f>t_s</f> is at or below the dew point <f>t_d</f>, water condenses on the cold surface and drips on busbars and terminals: corrosion, leakage current, tripping. An <b>anti-condensation heater</b> (a few tens of watts) lifts the temperature of the surfaces above the dew point. Change the air temperature, the humidity and the wall temperature and see when droplets appear. Press the heater button.</p>',
            '<p>Ulkona tai kylmässä hallissa olevan kotelon seinät ovat sisäilmaa kylmemmät. Jos seinän lämpötila <f>t_s</f> on kastepisteessä <f>t_d</f> tai sen alapuolella, kylmälle pinnalle tiivistyy vettä, joka tippuu kiskoille ja riviliittimille: korroosio, vuotovirta, laukeamiset. <b>Kosteudenpoistolämmitin</b> (muutama kymmenen wattia) nostaa pintojen lämpötilan kastepisteen yläpuolelle. Muuta ilman lämpötilaa, kosteutta ja seinän lämpötilaa ja katso, milloin pisarat ilmestyvät. Paina lämmitinpainiketta.</p>') },
          { id: 't5-hum-w1', type: 'interactive', widget: 'humidity', title: T('Cabinet wall and dew point', 'Kotelon seinä ja kastepiste'),
            caption: T('The curve is the saturated vapour density from the course table. The dot is the air state; the dashed lines lead to the dew point <f>t_d</f>. When <f>t_s ≤ t_d</f> droplets form.', 'Käyrä on kurssin taulukon kylläisen höyryn tiheys. Piste on ilman tila; katkoviivat johtavat kastepisteeseen <f>t_d</f>. Kun <f>t_s ≤ t_d</f>, pisaroita muodostuu.'), config: {} },
          { id: 't5-hum-ex3', type: 'example', title: T('Will the cabinet get wet? What does the heater need to do?', 'Kastuuko kotelo? Mitä lämmittimen pitää tehdä?'),
            problem: T('Air in a cabinet is 25 °C with RH = 60 %. A cold wall is at 10 °C. (a) Find the dew point. (b) Does water condense on the wall? (c) By how much must the heater raise the wall temperature?', 'Kotelon ilma on 25 °C ja RH = 60 %. Kylmä seinä on 10 °C:ssa. (a) Laske kastepiste. (b) Tiivistyykö seinälle vettä? (c) Kuinka paljon lämmittimen on nostettava seinän lämpötilaa?'),
            given: ['t = 25 °C', 'φ = 0.60', 't_s = 10 °C'],
            steps: [
              { tex: 'ρ_{vs}(25 °C) = 23.0 g/m³, ρ_v = 0.60 · 23.0 g/m³ = 13.8 g/m³' },
              T('The table has 13.6 g/m³ at 16 °C and 14.5 g/m³ at 17 °C, so t_d = 16 + (13.8 − 13.6)/(14.5 − 13.6) = 16.2 °C.', 'Taulukossa 13,6 g/m³ vastaa 16 °C:ta ja 14,5 g/m³ 17 °C:ta, joten t_d = 16 + (13,8 − 13,6)/(14,5 − 13,6) = 16,2 °C.'),
              T('The wall (10 °C) is below the dew point (16.2 °C): water condenses.', 'Seinä (10 °C) on kastepistettä (16,2 °C) kylmempi: vettä tiivistyy.'),
              { tex: 'Δt ≥ t_d − t_s = 16.2 °C − 10 °C = 6.2 K' }
            ],
            result: T('t_d ≈ 16.2 °C; yes; at least +6.2 K (in practice with a safety margin)', 't_d ≈ 16,2 °C; kyllä; vähintään +6,2 K (käytännössä varmuusvaralla)') },
          { id: 't5-hum-q4', type: 'question', q: 't5-q16' },
          { id: 't5-hum-q5', type: 'question', q: 't5-q17' },
          { id: 't5-hum-q6', type: 'question', q: 't5-q18' },
          { id: 't5-hum-t1', type: 'table', caption: T('Saturated vapour density of air and saturated vapour pressure', 'Ilman kylläisen höyryn tiheys ja kylläisen höyryn paine'),
            head: [{ tex: 't / °C' }, { tex: 'ρ_{vs} / (g/m³)' }, { tex: 'p_{vs} / kPa' }, { tex: 't / °C' }, { tex: 'ρ_{vs} / (g/m³)' }, { tex: 'p_{vs} / kPa' }], rows: satRows() }
        ] }
    ],
    questions: QUESTIONS
  });
})();

/* Heat widgets: 'heating' (modes curve | mix | heater) and 'heatflow' (modes wall | sink | radiation).
 * Physics in thermo-model.js; frame and axes in thermo-common.js / thermo-gas.js; config in skill fht-widgets. */
(function (TDC) {
  'use strict';
  var U = TDC.util, V = TDC.viz, TV = TDC.thermoViz, PH = TDC.thermo;
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function rr(g, x, y, w, h, r) { w = Math.max(0, w); h = Math.max(0, h); g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))); else g.rect(x, y, w, h); }   // never a negative size or radius (zero-width canvas while mounting)
  function tcol(ctx, f, a) { return TV.heat(f, a); }

  // ================================================================ heating
  TDC.widgets.register('heating', function (host, cfg, ctx) {
    var mode = cfg.mode || 'curve', m = cfg.m || 1;
    var Qtot = m * (2100 * 40 + 333e3 + 4186 * 100 + 2260e3) + m * 2010 * 40;   // ice at −40 °C to steam at 140 °C
    var defs = {
      curve: [{ id: 'Q', tex: 'Q', min: 0, max: Math.round(Qtot / 1000), step: 1, value: 0, unit: 'kJ' },
              { id: 'P', tex: 'P', min: 200, max: 3000, step: 50, value: 2000, unit: 'W' }],
      mix: [{ id: 'm1', tex: 'm_a', min: 0.05, max: 1, step: 0.01, value: 0.15, unit: 'kg' },
            { id: 't1', tex: 't_a', min: 20, max: 600, step: 5, value: 540, unit: '°C' },
            { id: 'c1', tex: 'c_a', min: 100, max: 1000, step: 10, value: 497, unit: 'J/(kg·K)' },
            { id: 'mw', tex: 'm_w', min: 0.1, max: 2, step: 0.05, value: 0.4, unit: 'kg' },
            { id: 'tw', tex: 't_w', min: 0, max: 60, step: 0.5, value: 10, unit: '°C' }],
      heater: [{ id: 'V', tex: 'V', min: 30, max: 500, step: 10, value: 450, unit: 'L' },
               { id: 't1', tex: 't_1', min: 2, max: 30, step: 1, value: 4, unit: '°C' },
               { id: 't2', tex: 't_2', min: 40, max: 90, step: 1, value: 75, unit: '°C' },
               { id: 'P', tex: 'P', min: 1000, max: 12000, step: 500, value: 3000, unit: 'W' }]
    }[mode];
    var F = TV.frame(host, cfg, ctx, defs, function () { readouts(); cv.redraw(); });
    var play = mode === 'curve' ? TV.playButton(F, ctx, function (on) { if (on && F.p().Q >= Qtot / 1000 - 1) F.set({ Q: 0 }); }) : null;
    var cv = V.canvas(F.stage, { aspect: function (w) { return w < 560 ? 1.1 : 0.48; }, draw: draw, animate: mode === 'curve' });
    var acc = 0;
    function phaseOf(Q) {   // Q in J, for m kg
      var q1 = m * 2100 * 40, q2 = q1 + m * 333e3, q3 = q2 + m * 418.6e3, q4 = q3 + m * 2260e3;
      if (Q < q1) return ['ice', 0]; if (Q < q2) return ['melting', (Q - q1) / (q2 - q1)];
      if (Q < q3) return ['water', 1]; if (Q < q4) return ['boiling', (Q - q3) / (q4 - q3)]; return ['steam', 1];
    }
    function calc(p) {
      if (mode === 'curve') { var Q = p.Q * 1000; return { Q: Q, T: PH.heatingCurve(m, Q), ph: phaseOf(Q), time: Q / p.P }; }
      if (mode === 'mix') {
        var mc = cfg.cup || { m: 0.2, c: 900 };
        var Tf = PH.mix([{ m: p.m1, c: p.c1, T: p.t1 }, { m: p.mw, c: 4186, T: p.tw }, { m: mc.m, c: mc.c, T: p.tw }]);
        return { Tf: Tf, Qa: p.m1 * p.c1 * (p.t1 - Tf), Qw: p.mw * 4186 * (Tf - p.tw) };
      }
      var Qh = p.V * 4190 * (p.t2 - p.t1);   // 1 L of water ≈ 1 kg, c = 4190 J/(kg·K) as in the slide example
      return { Q: Qh, time: Qh / p.P, E: Qh / 3.6e6 };
    }
    function readouts() {
      var p = F.p(), s = calc(p), list;
      if (mode === 'curve') list = [{ tex: 'Q', value: s.Q, unit: 'J' }, { tex: 't', value: s.T, unit: '°C', digits: 3 },
        { label: TV.L('th.heat.phase'), value: ctx.t('th.heat.' + s.ph[0]) }, { tex: 'τ = Q/P', value: s.time / 60, unit: 'min' }];
      else if (mode === 'mix') list = [{ tex: 't_l', value: s.Tf, unit: '°C', digits: 3 }, { tex: 'Q_a = m_a c_a Δt_a', value: s.Qa, unit: 'J' }, { tex: 'Q_w = m_w c_w Δt_w', value: s.Qw, unit: 'J' }];
      else list = [{ tex: 'Q = cmΔT', value: s.Q, unit: 'J' }, { tex: 'Q', value: s.E, unit: 'kWh' }, { tex: 'τ = Q/P', value: s.time / 3600, unit: 'h' }];
      TV.reads(F, cfg, p, s, list);
      F.answer = function () { return cfg.answer ? cfg.answer(p, s) : { v: mode === 'curve' ? s.T : mode === 'mix' ? s.Tf : s.time }; };
    }
    function draw(g, w, h, t, dt) {
      var p = F.p();
      if (play && play.playing() && dt) {   // heat flows in at P, ×60 time
        acc += p.P * dt * 60 / 1000;
        if (acc >= 1) { var nq = Math.min(Qtot / 1000, p.Q + Math.floor(acc)); acc -= Math.floor(acc); F.set({ Q: nq }); if (nq >= Qtot / 1000) play.set(false); p = F.p(); }
      }
      var s = calc(p), fg = ctx.color('--fg'), muted = ctx.color('--muted'), wire = ctx.color('--c-wire'), bg = ctx.color('--surface-2');
      var stack = w < 560;
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      if (mode === 'curve') {
        // beaker: ice cubes melt, water warms, bubbles while boiling, steam above
        var bw = stack ? 150 : Math.min(170, w * 0.25), bx = stack ? (w - bw) / 2 : 20, by = 40, bh = stack ? h * 0.36 : h - 100;
        var ph = s.ph[0], f = s.ph[1], wl = { ice: 0, melting: f, water: 1, boiling: 1 - f, steam: 0 }[ph];   // liquid part of the water
        g.fillStyle = tcol(ctx, (s.T + 40) / 180, 0.35); g.fillRect(bx, by + bh * (1 - 0.7 * wl), bw, bh * 0.7 * wl);
        var ice = ph === 'ice' ? 1 : ph === 'melting' ? 1 - f : 0;
        g.fillStyle = TV.alpha(ctx.color('--c-electron'), 0.25); g.strokeStyle = TV.alpha(ctx.color('--c-electron'), 0.9); g.lineWidth = 1.5;
        // ice lies on the bottom while there is no water; in water it floats, about 90 % under the surface
        var nIce = Math.ceil(6 * ice), sz = Math.min(22, (bw - 24) / 6 - 2) * Math.sqrt(ice), surf = by + bh * (1 - 0.7 * wl);
        for (var i = 0; i < nIce; i++) {
          var ix = wl > 0.02 ? bx + 12 + i * (bw - 24) / 6 : bx + 14 + (i % 3) * (bw - 28) / 3, iy = wl > 0.02 ? surf - 0.12 * sz : by + bh - 2 - (Math.floor(i / 3) + 1) * (sz + 3);
          rr(g, ix, iy, sz, sz, 3); g.fill(); g.stroke();
        }
        if (ph === 'boiling' || ph === 'steam') {
          g.fillStyle = TV.alpha(ctx.color('--muted'), 0.25);
          for (var k = 0; k < 6; k++) { var yy = by - 10 - ((t * 30 + k * 23) % 40); g.beginPath(); g.arc(bx + bw * (0.2 + 0.13 * k), yy, 9, 0, 7); g.fill(); }
        }
        if (ph === 'boiling') { g.strokeStyle = TV.alpha(fg, 0.5); for (var b = 0; b < 8; b++) { var yb = by + bh - ((t * 50 + b * 31) % (bh * 0.7 * wl)); g.beginPath(); g.arc(bx + 12 + (b * 29) % (bw - 24), yb, 3, 0, 7); g.stroke(); } }
        g.strokeStyle = wire; g.lineWidth = 3; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx, by + bh); g.lineTo(bx + bw, by + bh); g.lineTo(bx + bw, by); g.stroke();
        g.strokeStyle = ctx.color('--c-2'); g.lineWidth = 3; g.beginPath();
        for (var x = bx + 10, n = 0; x <= bx + bw - 10; x += 10, n++) g.lineTo(x, by + bh + 10 + (n % 2 ? 7 : 0));
        g.stroke();
        TV.font(g, 13, 600); TV.text(g, ctx.t('th.heat.' + ph), bx + bw / 2, by + bh + 32, fg, 'center');
        // heating curve t(Q)
        var o = stack ? { x0: 50, y0: h * 0.5 + 20, x1: w - 14, y1: h - 34 } : { x0: bx + bw + 64, y0: 24, x1: w - 14, y1: h - 40 };
        var A = TV.axes(g, ctx, Object.assign(o, { xmin: 0, xmax: Qtot / 1000, ymin: -40, ymax: 140, xlab: 'Q / kJ', ylab: 't / °C', ny: 6 }));
        g.strokeStyle = ctx.color('--c-1'); g.lineWidth = 2.5; g.beginPath();
        for (var q = 0; q <= Qtot; q += Qtot / 400) { var yq = A.Y(PH.heatingCurve(m, q)); if (q) g.lineTo(A.X(q / 1000), yq); else g.moveTo(A.X(0), yq); }
        g.stroke();
        g.fillStyle = ctx.color('--c-2'); g.beginPath(); g.arc(A.X(p.Q), A.Y(s.T), 6, 0, 7); g.fill();
        TV.font(g, 11, 600);
        [[m * 84e3 + m * 166e3, 0, 'L_F'], [m * (84e3 + 333e3 + 418.6e3 + 1130e3), 100, 'L_V']].forEach(function (z) { TV.text(g, z[2], A.X(z[0] / 1000), A.Y(z[1]) - 12, fg, 'center', bg); });
      } else if (mode === 'mix') {
        // calorimeter: hot sample in water; both temperatures approach t_l (drawn over time)
        var cx = stack ? w / 2 : 120, cyy = stack ? h * 0.25 : h * 0.5, R1 = stack ? 70 : Math.min(90, h * 0.36);
        g.fillStyle = ctx.color('--c-body-fill'); g.strokeStyle = wire; g.lineWidth = 3; rr(g, cx - R1, cyy - R1, 2 * R1, 2 * R1, 10); g.fill(); g.stroke();
        g.fillStyle = tcol(ctx, (s.Tf - 0) / 100, 0.35); g.fillRect(cx - R1 * 0.8, cyy - R1 * 0.4, R1 * 1.6, R1 * 1.2);
        g.fillStyle = tcol(ctx, (p.t1) / 600, 0.9); rr(g, cx - 14, cyy + R1 * 0.25, 28, 28, 4); g.fill();
        g.strokeStyle = fg; g.lineWidth = 2; g.beginPath(); g.moveTo(cx + R1 * 0.5, cyy - R1 - 16); g.lineTo(cx + R1 * 0.5, cyy + R1 * 0.5); g.stroke();
        TV.font(g, 13, 700); TV.text(g, U.fmtNum(s.Tf, 3) + ' °C', cx + R1 * 0.5 + 8, cyy - R1 - 10, ctx.color('--c-value'), 'left', bg);
        var o2 = stack ? { x0: 50, y0: h * 0.55, x1: w - 14, y1: h - 34 } : { x0: 270, y0: 24, x1: w - 14, y1: h - 40 };
        var ymaxm = Math.ceil(Math.max(p.t1, 60) / 100) * 100, B = TV.axes(g, ctx, Object.assign(o2, { xmin: 0, xmax: 60, ymin: 0, ymax: ymaxm, xlab: 'τ / s', ylab: 't / °C' }));
        [[p.t1, ctx.color('--c-2'), 't_a'], [p.tw, ctx.color('--c-1'), 't_w']].forEach(function (c) {
          g.strokeStyle = c[1]; g.lineWidth = 2.5; g.beginPath();
          for (var tt = 0; tt <= 60; tt += 0.5) { var yv = s.Tf + (c[0] - s.Tf) * Math.exp(-tt / 8); if (tt) g.lineTo(B.X(tt), B.Y(yv)); else g.moveTo(B.X(0), B.Y(yv)); }
          g.stroke(); TV.font(g, 12, 600); TV.text(g, c[2], B.X(1.5), B.Y(c[0]) + (c[2] === 't_a' ? 12 : -12), c[1], 'left', bg);
        });
        g.strokeStyle = ctx.color('--muted'); g.setLineDash([5, 4]); g.lineWidth = 1; g.beginPath(); g.moveTo(B.X(0), B.Y(s.Tf)); g.lineTo(B.X(60), B.Y(s.Tf)); g.stroke(); g.setLineDash([]);
        TV.text(g, 't_l', B.X(58), B.Y(s.Tf) - 10, fg, 'right', bg);
      } else {
        // electric water heater: insulated tank, element at the bottom, cold in / hot out
        var tw = Math.min(150, w * 0.3), th = h - 50, tx = (w - tw) / 2, ty = 20, fr = clamp(p.V / 500, 0.3, 1);
        var grad = g.createLinearGradient(0, ty, 0, ty + th); grad.addColorStop(0, tcol(ctx, p.t2 / 90, 0.6)); grad.addColorStop(1, tcol(ctx, p.t1 / 90, 0.5));
        g.fillStyle = grad; rr(g, tx, ty + th * (1 - fr), tw, th * fr, 24); g.fill();
        g.strokeStyle = wire; g.lineWidth = 3; rr(g, tx, ty + th * (1 - fr), tw, th * fr, 24); g.stroke();
        g.strokeStyle = ctx.color('--c-2'); g.beginPath(); g.moveTo(tx + 20, ty + th - 30); for (var e = 0; e < 5; e++) g.lineTo(tx + 30 + e * (tw - 50) / 4, ty + th - (e % 2 ? 20 : 40)); g.stroke();
        TV.font(g, 13, 600);
        TV.text(g, 't_2', tx + tw + 12, ty + th * (1 - fr) + 20, fg, 'left'); TV.text(g, 't_1', tx + tw + 12, ty + th - 14, fg, 'left');
        TV.text(g, 'P', tx - 12, ty + th - 30, ctx.color('--c-2'), 'right');
      }
    }
    ctx.onTheme(function () { cv.redraw(); }); ctx.onLang(function () { readouts(); cv.redraw(); });
    readouts();
    return Object.assign({ destroy: cv.destroy }, F.api);
  });

  // ================================================================ heatflow
  TDC.widgets.register('heatflow', function (host, cfg, ctx) {
    var mode = cfg.mode || 'wall';
    var layers = (cfg.layers || [{ name: { en: 'glass', fi: 'lasi' }, d: 0.004, lambda: 0.84 }]).map(function (l) { return Object.assign({}, l); });
    var vary = cfg.vary != null ? cfg.vary : layers.reduce(function (b, l, i) { return l.d / l.lambda > layers[b].d / layers[b].lambda ? i : b; }, 0);
    var defs = {
      wall: [{ id: 'd', tex: 'd', min: cfg.dmin || 0.002, max: cfg.dmax || 0.3, step: 0.001, value: layers[vary].d, unit: 'm' },
             { id: 'tin', tex: 't_i', min: 10, max: 30, step: 0.5, value: 23, unit: '°C' },
             { id: 'tout', tex: 't_u', min: -35, max: 25, step: 0.5, value: -22, unit: '°C' }],
      sink: [{ id: 'P', tex: 'P', min: 1, max: 200, step: 1, value: 40, unit: 'W' },
             { id: 'Rsa', tex: 'R_{sa}', min: 0.2, max: 10, step: 0, value: 2, unit: 'K/W', log: true },
             { id: 'ta', tex: 't_a', min: 0, max: 60, step: 1, value: 40, unit: '°C' }],
      radiation: [{ id: 'T', tex: 'T', min: 300, max: 6000, step: 0, value: 1093, unit: 'K', log: true },
                  { id: 'eps', tex: 'ε', min: 0.05, max: 1, step: 0.01, value: 0.85, unit: '' },
                  { id: 'T2', tex: 'T_2', min: 250, max: 350, step: 1, value: 298, unit: 'K' }]
    }[mode];
    var F = TV.frame(host, cfg, ctx, defs, function () { readouts(); cv.redraw(); });
    var cv = V.canvas(F.stage, { aspect: function (w) { return w < 560 ? 0.9 : 0.45; }, draw: draw, animate: false });
    var A = cfg.A || 1, hIn = cfg.hIn || 10, hOut = cfg.hOut || 10, Rjc = cfg.Rjc != null ? cfg.Rjc : 0.5, Rcs = cfg.Rcs != null ? cfg.Rcs : 0.2, Tjmax = cfg.Tjmax || 150;
    function calc(p) {
      if (mode === 'wall') { layers[vary].d = p.d; var wl = PH.wall(layers, hIn, hOut, p.tin, p.tout); wl.Phi = wl.q * A; return wl; }
      if (mode === 'sink') { var ts = p.ta + p.P * p.Rsa, tc = ts + p.P * Rcs, tj = tc + p.P * Rjc; return { ts: ts, tc: tc, tj: tj, over: tj > Tjmax }; }
      return { lmax: PH.wien(p.T), M: p.eps * PH.SIGMA * Math.pow(p.T, 4), Phi: PH.radiation(p.eps, A, p.T, p.T2) };
    }
    function readouts() {
      var p = F.p(), s = calc(p), list;
      if (mode === 'wall') list = [{ tex: 'R = 1/h_i + Σd/λ + 1/h_u', value: s.R, unit: 'm²·K/W' }, { tex: 'U = 1/R', value: s.U, unit: 'W/(m²·K)' },
        { tex: 'q = U(t_i - t_u)', value: s.q, unit: 'W/m²' }, { tex: 'Φ = qA', value: s.Phi, unit: 'W' }];
      else if (mode === 'sink') list = [{ tex: 't_s', value: s.ts, unit: '°C', digits: 3 }, { tex: 't_c', value: s.tc, unit: '°C', digits: 3 },
        { tex: 't_j = t_a + P(R_{jc} + R_{cs} + R_{sa})', value: s.tj, unit: '°C', digits: 3, warn: s.over },
        s.over ? { label: TV.L('th.sink.state'), value: ctx.t('th.sink.over'), warn: true } : null];
      else list = [{ tex: 'λ_{max} = b/T', value: s.lmax, unit: 'm' }, { tex: 'M = εσT^4', value: s.M, unit: 'W/m²' }, { tex: 'Φ = εσA(T^4 - T_2^4)', value: s.Phi, unit: 'W' }];
      TV.reads(F, cfg, p, s, list);
      F.answer = function () { return cfg.answer ? cfg.answer(p, s) : { v: mode === 'wall' ? s.U : mode === 'sink' ? s.tj : s.lmax }; };
    }
    function draw(g, w, h) {
      var p = F.p(), s = calc(p), fg = ctx.color('--fg'), muted = ctx.color('--muted'), wire = ctx.color('--c-wire'), bg = ctx.color('--surface-2');
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      if (mode === 'wall') {
        // cross-section: inside air | layers (width ∝ thermal resistance, min 14 px) | outside air; temperature profile on top
        var x0 = 50, x1 = w - 50, y0 = 30, y1 = h - 40, airW = (x1 - x0) * 0.18, inner = x1 - x0 - 2 * airW;   // airW grows below to centre thin walls
        // layer widths follow the real thickness on one scale (cfg.dScale m across the drawing), at least 10 px; centred
        var dsum = layers.reduce(function (a, l) { return a + l.d; }, 0), kd = inner / Math.max(dsum, cfg.dScale || 0.4);
        var ws = layers.map(function (l) { return Math.max(10, l.d * kd); }), wsum = ws.reduce(function (a, b) { return a + b; }, 0);
        if (wsum > inner) ws = ws.map(function (x) { return x * inner / wsum; });
        airW += (inner - Math.min(inner, wsum)) / 2;
        var tmin = Math.min(p.tout, -35), tmax = 30, Y = function (t) { return y1 - (t - tmin) / (tmax - tmin) * (y1 - y0); };
        var xs = [x0, x0 + airW], xx = x0 + airW;
        layers.forEach(function (l, i) {
          g.fillStyle = TV.alpha(ctx.color('--c-' + (i % 6 + 3)), 0.25); g.fillRect(xx, y0, ws[i], y1 - y0);
          g.strokeStyle = muted; g.lineWidth = 1; g.strokeRect(xx, y0, ws[i], y1 - y0);
          TV.font(g, 11, 600); g.save(); g.translate(xx + ws[i] / 2, y1 - 8); g.rotate(-Math.PI / 2); TV.text(g, ctx.tx(l.name), 0, 0, fg, 'left'); g.restore();
          xx += ws[i]; xs.push(xx);
        });
        xs.push(x1);
        // the air is at t_i / t_u away from the wall; the surface resistances 1/h act in a thin air film at each face
        var nL = layers.length, film = Math.min(30, airW * 0.45), pts = [[x0, s.temps[0]], [xs[1] - film, s.temps[0]]];
        for (var j = 1; j <= nL + 1; j++) pts.push([xs[j], s.temps[j]]);
        pts.push([xs[nL + 1] + film, s.temps[nL + 2]], [x1, s.temps[nL + 2]]);
        g.fillStyle = TV.alpha(ctx.color('--muted'), 0.12); g.fillRect(xs[1] - film, y0, film, y1 - y0); g.fillRect(xs[nL + 1], y0, film, y1 - y0);
        g.strokeStyle = ctx.color('--c-2'); g.lineWidth = 3; g.beginPath();
        pts.forEach(function (q, i) { if (i) g.lineTo(q[0], Y(q[1])); else g.moveTo(q[0], Y(q[1])); });
        g.stroke();
        TV.font(g, 12, 600);
        // labels alternate above/below the line so air and surface values never collide, even on a phone
        var lab = function (tt, x, al, dy) { TV.text(g, U.fmtNum(Math.round(tt * 10) / 10, 3) + ' °C', x, Y(tt) + dy, fg, al, bg); };
        lab(s.temps[0], x0 + 4, 'left', -12); lab(s.temps[1], xs[1] - 4, 'right', 14);
        lab(s.temps[nL + 1], xs[nL + 1] + 4, 'left', -12); lab(s.temps[nL + 2], x1 - 4, 'right', 14);
        if (nL === 2) lab(s.temps[2], xs[2], 'center', -12);
        TV.text(g, ctx.t('th.wall.in'), x0 + 4, y1 + 16, muted, 'left'); TV.text(g, ctx.t('th.wall.out'), x1 - 4, y1 + 16, muted, 'right');
        TV.arrow(g, (x0 + x1) / 2 - 40, y0 - 12, (x0 + x1) / 2 + 40, y0 - 12, ctx.color('--c-2'), 2.5); TV.text(g, 'q', (x0 + x1) / 2 + 48, y0 - 12, fg, 'left');
      } else if (mode === 'sink') {
        // transistor on a finned heat sink + the thermal "circuit" t_j —R_jc— t_c —R_cs— t_s —R_sa— t_a
        var sx = 30, sw = Math.min(220, w * 0.38), sy = h * 0.25, sh = h * 0.5, fins = 7;
        g.fillStyle = tcol(ctx, (s.ts - 20) / 130, 0.7); g.fillRect(sx, sy + sh * 0.35, sw, sh * 0.2);
        for (var i = 0; i < fins; i++) g.fillRect(sx + i * sw / (fins - 0.5), sy + sh * 0.55, sw / fins * 0.45, sh * 0.45);
        g.fillStyle = tcol(ctx, (s.tj - 20) / 130, 0.95); rr(g, sx + sw * 0.3, sy, sw * 0.4, sh * 0.35, 4); g.fill();
        g.strokeStyle = fg; g.lineWidth = 2; [0.38, 0.5, 0.62].forEach(function (f) { g.beginPath(); g.moveTo(sx + sw * f, sy); g.lineTo(sx + sw * f, sy - 22); g.stroke(); });
        // thermal resistance chain (electrical analogy)
        var cx0 = sx + sw + 40, cx1 = w - 20, cy = h * 0.5, nodes = [['t_j', s.tj], ['t_c', s.tc], ['t_s', s.ts], ['t_a', p.ta]], step = (cx1 - cx0) / 3;
        if (cx1 - cx0 > 160) {
          g.strokeStyle = wire; g.lineWidth = 2.5; g.beginPath(); g.moveTo(cx0, cy); g.lineTo(cx1, cy); g.stroke();
          ['R_{jc}', 'R_{cs}', 'R_{sa}'].forEach(function (r, i) {
            var xm = cx0 + step * (i + 0.5); g.fillStyle = ctx.color('--c-body-fill'); rr(g, xm - 20, cy - 9, 40, 18, 2); g.fill(); g.stroke();
            TV.font(g, 12, 600); TV.text(g, r, xm, cy - 22, muted, 'center');
          });
          nodes.forEach(function (nd, i) {
            var xn = cx0 + step * i; g.fillStyle = fg; g.beginPath(); g.arc(xn, cy, 4, 0, 7); g.fill();
            TV.font(g, 12, 600); TV.text(g, nd[0], xn, cy + 22, fg, 'center'); TV.text(g, U.fmtNum(nd[1], 3) + ' °C', xn, cy + 40, nd[0] === 't_j' && s.over ? ctx.color('--c-2') : ctx.color('--c-value'), 'center');
          });
          TV.arrow(g, cx0, cy - 46, cx0 + 60, cy - 46, ctx.color('--c-2'), 2.5); TV.text(g, 'P', cx0 + 68, cy - 46, fg, 'left');
        }
      } else {
        // relative black-body spectrum (Planck) for T and for 300 K… scale; visible band shaded
        var o = { x0: 60, y0: 24, x1: w - 16, y1: h - 40 }, lmaxAx = cfg.lmax || 5;   // µm
        var Ax = TV.axes(g, ctx, Object.assign(o, { xmin: 0, xmax: lmaxAx, ymin: 0, ymax: 1.05, xlab: 'λ / µm', ylab: 'M_λ / M_{λ,max}' }));
        var vis = g.createLinearGradient(Ax.X(0.38), 0, Ax.X(0.75), 0);
        ['#7f3fbf', '#3f5fff', '#2fbf5f', '#f2e12f', '#f28a2f', '#e8352f'].forEach(function (c, i) { vis.addColorStop(i / 5, c); });
        g.globalAlpha = 0.25; g.fillStyle = vis; g.fillRect(Ax.X(0.38), o.y0, Ax.X(0.75) - Ax.X(0.38), o.y1 - o.y0); g.globalAlpha = 1;
        var planck = function (lum, T) { var l = lum * 1e-6; return 1 / (Math.pow(l, 5) * (Math.exp(0.014388 / (l * T)) - 1)); };
        var peak = planck(PH.wien(p.T) * 1e6, p.T);
        g.strokeStyle = ctx.color('--c-2'); g.lineWidth = 2.5; g.beginPath();
        for (var lu = 0.05; lu <= lmaxAx; lu += 0.01) { var yv = Ax.Y(Math.min(1.05, planck(lu, p.T) / peak)); if (lu === 0.05) g.moveTo(Ax.X(lu), yv); else g.lineTo(Ax.X(lu), yv); }
        g.stroke();
        var xl = Ax.X(Math.min(lmaxAx, s.lmax * 1e6));
        g.strokeStyle = muted; g.setLineDash([5, 4]); g.lineWidth = 1; g.beginPath(); g.moveTo(xl, o.y0); g.lineTo(xl, o.y1); g.stroke(); g.setLineDash([]);
        TV.font(g, 12, 600); TV.text(g, 'λ_{max}', xl + 5, o.y0 + 10, fg, 'left', bg);
        // glowing body: red at ~1000 K → white at 6000 K (dark below ~800 K)
        var glow = clamp((p.T - 750) / 2500, 0, 1), cr = Math.round(255 * clamp((p.T - 600) / 600, 0, 1)), cgc = Math.round(255 * glow), cb = Math.round(255 * clamp((p.T - 3000) / 3000, 0, 1));
        g.fillStyle = p.T < 750 ? ctx.color('--muted') : 'rgb(' + cr + ',' + cgc + ',' + cb + ')';
        g.beginPath(); g.arc(o.x1 - 34, o.y0 + 34, 22, 0, 7); g.fill(); g.strokeStyle = wire; g.lineWidth = 2; g.stroke();
      }
    }
    ctx.onTheme(function () { cv.redraw(); }); ctx.onLang(function () { readouts(); cv.redraw(); });
    readouts();
    return Object.assign({ destroy: cv.destroy }, F.api);
  });
})(window.TDC);

/* Topic 6: Rotation. Source: source/extracted/topic6-rotation.md (EN theory deck p03-p18, EN exercises 7.1, 7.2, 7.7, 7.16, 7.20,
 * 7.26 and the FI-deck-only material: gyro forces FI p18 and exercises 96, 104, 105, 118; errata in source/extracted/PDF-ERRATA.md applied).
 * g = 9.81 m/s². Positive direction of rotation: counterclockwise. Symbols as on the slides: φ angle, ω angular velocity, n rotational
 * frequency, T period, α angular acceleration, J moment of inertia, M torque, L angular momentum, K impulse of the moment, E_R rotational energy.
 * NO answers in this file: they live in src/answers/topic6.json. Block ids are stable; never rename. */
(function () {
  'use strict';
  function T(en, fi) { return { en: en, fi: fi }; }
  var PI = Math.PI, G = 9.81;

  // ---------------------------------------------------------------- shared helpers of the device widgets (as in topic5.js)
  function dev(def, vals) { return { mount: function (h, c) { return TDC.mechViz.device(def, vals).mount(h, c); } }; }
  function nf(v, d) { return TDC.util.fmtNum(v, d || 3); }
  function fsz(w) { return Math.max(11, Math.min(14, Math.round(w / 48))); }
  function line(g, x1, y1, x2, y2) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lab() { return TDC.mechViz.lab.apply(null, arguments); }   // canvas label in SI typography (viz/mech-common.js)
  function changed(S, p, keys) { var k = keys.map(function (id) { return p[id]; }).join('|'); if (S._k === k) return false; S._k = k; return true; }
  function prm(a) { a.forEach(function (p) { p.plain = true; }); return a; }   // slider values show without SI prefixes (r/min, kg·m² ...)
  function arrowTo(g, TV, x, y, ux, uy, L, col, wd, w, h) {   // an arrow that never leaves the canvas
    var m = 6;
    if (ux > 1e-9) L = Math.min(L, (w - m - x) / ux); else if (ux < -1e-9) L = Math.min(L, (m - x) / ux);
    if (uy > 1e-9) L = Math.min(L, (h - m - y) / uy); else if (uy < -1e-9) L = Math.min(L, (m - y) / uy);
    L = Math.max(0, L); TV.arrow(g, x, y, x + ux * L, y + uy * L, col, wd); return L;
  }
  /** Axes with grid, ticks and labels; box b = {x0, y0, x1, y1}; returns the pixel maps. c = {xmax, ymax, xs, ys, xlab, ylab, fs}. */
  function axes(g, ctx, b, c) {
    var fg = ctx.color('--fg'), wire = ctx.color('--c-wire'), mu = ctx.color('--muted');
    var X = function (v) { return b.x0 + v / c.xmax * (b.x1 - b.x0); }, Y = function (v) { return b.y1 - v / c.ymax * (b.y1 - b.y0); };
    g.strokeStyle = mu; g.lineWidth = 0.6; c.ys.forEach(function (v) { if (v) line(g, b.x0, Y(v), b.x1, Y(v)); });
    g.strokeStyle = wire; g.lineWidth = 1.5; line(g, b.x0, b.y1, b.x1, b.y1); line(g, b.x0, b.y1, b.x0, b.y0 - 4);
    c.xs.forEach(function (v) { lab(g, '', nf(v, 3), X(v), b.y1 + 11, mu, 'center', c.fs - 2); });
    c.ys.forEach(function (v) { lab(g, '', nf(v, 3), b.x0 - 5, Y(v), mu, 'right', c.fs - 2); });
    lab(g, c.xlab[0], c.xlab[1], b.x1, b.y1 + 24, fg, 'right', c.fs - 1); lab(g, c.ylab[0], c.ylab[1], b.x0 + 4, b.y0 - 12, fg, 'left', c.fs - 1);
    return { X: X, Y: Y };
  }

  // ---------------------------------------------------------------- SVG figures (symbols only)
  function sArrow(x1, y1, x2, y2, c, dash) {
    var a = Math.atan2(y2 - y1, x2 - x1), h = 9, s = 'stroke:var(' + c + ');fill:var(' + c + ')';
    var p1 = [x2 - h * Math.cos(a - 0.4), y2 - h * Math.sin(a - 0.4)], p2 = [x2 - h * Math.cos(a + 0.4), y2 - h * Math.sin(a + 0.4)];
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + (x2 - 6 * Math.cos(a)).toFixed(1) + '" y2="' + (y2 - 6 * Math.sin(a)).toFixed(1) + '" style="' + s + ';stroke-width:2.5' + (dash ? ';stroke-dasharray:5 3' : '') + '"/>' +
      '<polygon points="' + x2 + ',' + y2 + ' ' + p1[0].toFixed(1) + ',' + p1[1].toFixed(1) + ' ' + p2[0].toFixed(1) + ',' + p2[1].toFixed(1) + '" style="' + s + '"/>';
  }
  function sSym(x, y, s, sub, c) {
    return '<text x="' + x + '" y="' + y + '" style="fill:var(' + (c || '--fg') + ');font:italic 600 15px var(--font-math)">' + s +
      (sub ? '<tspan dy="4" style="font:600 11px var(--font-math);font-style:normal">' + sub + '</tspan>' : '') + '</text>';
  }
  function sTxt(x, y, s, c, anchor) { return '<text x="' + x + '" y="' + y + '" text-anchor="' + (anchor || 'start') + '" style="fill:var(' + (c || '--muted') + ');font:500 11px var(--font-math)">' + s + '</text>'; }
  // slide p03: angle Δφ = Δs/r on a circle, the tangent velocity v
  function figAngle(rev) { return '<svg viewBox="0 0 320 220" role="img" style="max-width:360px">' +
    '<circle cx="110" cy="110" r="80" style="fill:var(--c-1);opacity:.12;stroke:var(--c-wire);stroke-width:2"/>' +
    '<line x1="10" y1="110" x2="210" y2="110" style="stroke:var(--muted);stroke-width:1.2"/><line x1="110" y1="210" x2="110" y2="8" style="stroke:var(--muted);stroke-width:1.2"/>' +
    sArrow(110, 110, 166.6, 53.4, '--f-applied') + sSym(146, 92, 'r') +
    '<path d="M190 110 A80 80 0 0 0 166.6 53.4" style="fill:none;stroke:var(--c-3);stroke-width:5"/>' + sSym(196, 80, 'Δs', '', '--c-3') +
    '<path d="M138 110 A28 28 0 0 0 130 90" style="fill:none;stroke:var(--fg);stroke-width:1.8"/>' + sSym(144, 104, 'Δφ') +
    sArrow(166.6, 53.4, 140, 26, '--f-accel') + sSym(146, 22, 'v', '', '--f-accel') +
    sTxt(222, 160, 's = 2πr', '--fg') + sTxt(222, 176, 'Δφ = Δs/r', '--fg') + sTxt(222, 192, rev, '--fg') + '</svg>'; }
  // slide p08: measured n(t) of a motor, the tangent at t = 10 s and the straight line to t = 40 s (values read from the slide)
  function figNt(tn, sc) {
    var X = function (t) { return 44 + t / 60 * 330; }, Y = function (n) { return 190 - n / 3500 * 170; }, s = '<svg viewBox="0 0 400 240" role="img" style="max-width:480px">';
    for (var n = 0; n <= 3500; n += 500) s += '<line x1="44" y1="' + Y(n) + '" x2="374" y2="' + Y(n) + '" style="stroke:var(--muted);stroke-width:.4"/>' + (n % 1000 === 0 ? sTxt(40, Y(n) + 4, String(n), '--muted', 'end') : '');
    for (var t = 0; t <= 60; t += 10) s += '<line x1="' + X(t) + '" y1="20" x2="' + X(t) + '" y2="190" style="stroke:var(--muted);stroke-width:.4"/>' + sTxt(X(t), 204, String(t), '--muted', 'middle');
    var P = [[0, 0], [5, 1500], [10, 2450], [15, 3050], [20, 3200], [30, 2900], [40, 2650], [47, 2900], [55, 3230], [60, 3000]];
    s += '<polyline points="' + P.map(function (q) { return X(q[0]) + ',' + Y(q[1]); }).join(' ') + '" style="fill:none;stroke:var(--c-1);stroke-width:2.5"/>' +
      '<line x1="' + X(0) + '" y1="' + Y(900) + '" x2="' + X(17) + '" y2="' + Y(3500) + '" style="stroke:var(--c-3);stroke-width:1.8;stroke-dasharray:5 3"/>' +
      '<line x1="' + X(0) + '" y1="' + Y(0) + '" x2="' + X(40) + '" y2="' + Y(2600) + '" style="stroke:var(--c-4);stroke-width:1.8;stroke-dasharray:5 3"/>' +
      '<circle cx="' + X(10) + '" cy="' + Y(2450) + '" r="4" style="fill:var(--c-3)"/><circle cx="' + X(20) + '" cy="' + Y(3200) + '" r="4" style="fill:var(--c-1)"/>' +
      sTxt(44, 12, 'n / (r/min)', '--fg') + sTxt(374, 222, 't / s', '--fg', 'end') + sTxt(X(10) + 8, Y(2450) + 16, tn, '--c-3') + sTxt(X(20) + 8, Y(3200) - 8, 'n(20 s) = 3200', '--c-1') + sTxt(X(28), Y(1700), sc + ' 0…40 s', '--c-4') + '</svg>';
    return s;
  }

  // ================================================================ device: spinning disc, v = ω r (t6-disc-lab; p03-p05)
  var DISC = {
    animate: true,
    aspect: function (w) { return w < 520 ? 0.95 : 0.55; },
    params: prm([{ id: 'r', tex: 'r', min: 1, max: 15, step: 0.5, value: 12, unit: 'm' }, { id: 'n', tex: 'n', min: 5, max: 120, step: 1, value: 60, unit: 'r/min' }]),
    buttons: [{ label: T('Spin / stop', 'Pyöritä / pysäytä'), click: function (p, D) { D.S.run = !D.S.run; } },
              { label: T('Wind turbine (slide p05)', 'Tuulivoimala (kalvo s. 05)'), click: function (p, D) { D.set({ r: 12, n: 60 }); } },
              { label: T('Double n', 'Kaksinkertaista n'), click: function (p, D) { D.set({ n: Math.min(120, p.n * 2) }); } }],
    draw: function (g, w, h, p, ctx, TV, D) {
      var S = D.S; if (S.run == null) S.run = D.motion; if (S.a == null) S.a = 0.7;
      var n = p.n / 60, om = 2 * PI * n, f = Math.min(1, 1.5 / n), v = om * p.r;
      if (S.run) S.a += om * f * D.dt;
      var fs = fsz(w), fg = ctx.color('--fg'), wire = ctx.color('--c-wire'), mu = ctx.color('--muted'), bg = ctx.color('--surface'), c1 = ctx.color('--c-1');
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      var cx = w * 0.36, cy = h * 0.5, R = Math.min(h * 0.4, w * 0.27), a = S.a;
      g.fillStyle = TV.alpha(c1, 0.2); g.strokeStyle = wire; g.lineWidth = 2.5; g.beginPath(); g.arc(cx, cy, R, 0, 2 * PI); g.fill(); g.stroke();
      g.lineWidth = 1.2; for (var k = 0; k < 4; k++) line(g, cx, cy, cx + R * Math.cos(-a + k * PI / 2), cy + R * Math.sin(-a + k * PI / 2));   // spokes show the turning
      g.fillStyle = wire; g.beginPath(); g.arc(cx, cy, 4, 0, 2 * PI); g.fill();
      var ux = -Math.sin(a), uy = -Math.cos(a);   // counterclockwise tangent on the screen
      [[R, v, 'v', ctx.color('--f-accel')], [R / 3, v / 3, 'v_1', ctx.color('--f-applied')]].forEach(function (q, i) {
        var px = cx + q[0] * Math.cos(a), py = cy - q[0] * Math.sin(a), L = arrowTo(g, TV, px, py, ux, uy, Math.max(2, q[1] * 0.48), q[3], 3.5, w, h);
        g.fillStyle = q[3]; g.beginPath(); g.arc(px, py, 5, 0, 2 * PI); g.fill();
        var left = ux > -0.3 && px + ux * L < w - 100;   // the label sits beyond the arrow tip, never on it
        lab(g, q[2], ' = ' + nf(q[1], 3) + ' m/s', clamp(px + ux * L + (left ? 8 : -8), 6, w - 6), clamp(py + uy * L + (i ? 14 : 0), 12, h - 12), q[3], left ? 'left' : 'right', fs - 1, bg);
      });
      g.strokeStyle = mu; g.lineWidth = 1.2; g.setLineDash([4, 3]); line(g, cx, cy, cx + R * Math.cos(a), cy - R * Math.sin(a)); g.setLineDash([]);
      lab(g, 'r', ' = ' + p.r + ' m', 8, h - 26, fg, 'left', fs - 1);
      lab(g, 'ω', ' = 2π n = ' + nf(om, 3) + ' rad/s', w - 8, 14, fg, 'right', fs - 1); lab(g, 'T', ' = ' + nf(1 / n, 3) + ' s', w - 8, 14 + fs + 5, fg, 'right', fs - 1);
      if (f < 1) lab(g, '', ctx.tx(T('picture turns ' + nf(1 / f, 2) + '× slower', 'kuva pyörii ' + nf(1 / f, 2) + '× hitaammin')), 8, h - 10, mu, 'left', fs - 3);
    },
    outputs: function (p) {
      var om = 2 * PI * p.n / 60;
      return [{ tex: 'ω', value: om, unit: 'rad/s' }, { tex: 'T', value: 60 / p.n, unit: 's' }, { tex: 'v', value: om * p.r, unit: 'm/s' }, { tex: 'v_1', value: om * p.r / 3, unit: 'm/s' }];
    },
    answer: function (p) { return { v: 2 * PI * p.n / 60 * p.r }; }
  };

  // ================================================================ device: motor with uniform angular acceleration (t6-motor-lab; p06, p07)
  var MOTOR = {
    animate: true,
    aspect: function (w) { return w < 520 ? 1.3 : 0.62; },
    params: prm([{ id: 'n', tex: 'n', min: 500, max: 3500, step: 10, value: 3000, unit: 'r/min' }, { id: 't', tex: 't', min: 1, max: 20, step: 0.5, value: 8.5, unit: 's' }]),
    buttons: [{ label: T('Start the motor', 'Käynnistä moottori'), click: function (p, D) { changed(D.S, p, ['n', 't']); D.S.s = D.motion ? 0 : 1; D.S.run = D.motion; } },
              { label: T('3000 r/min in 8.5 s (slide p07)', '3000 r/min 8,5 s:ssa (kalvo s. 07)'), click: function (p, D) { D.set({ n: 3000, t: 8.5 }); } },
              { label: T('Belt pulley: 1440 r/min in 8.5 s', 'Remmipyörä: 1440 r/min 8,5 s:ssa'), click: function (p, D) { D.set({ n: 1440, t: 8.5 }); } }],
    draw: function (g, w, h, p, ctx, TV, D) {
      var S = D.S;
      if (changed(S, p, ['n', 't'])) { S.s = 0; S.run = false; }
      if (S.s == null) S.s = 0;
      if (S.run) { S.s = Math.min(1, S.s + D.dt / 4); if (S.s >= 1) S.run = false; }
      var Tt = p.t, s = S.s, tn = s * Tt, nn = p.n * s, Nn = p.n / 60 * Tt * s * s / 2, Nall = p.n / 60 * Tt / 2;
      var fs = fsz(w), fg = ctx.color('--fg'), wire = ctx.color('--c-wire'), mu = ctx.color('--muted'), bg = ctx.color('--surface'), c1 = ctx.color('--c-1'), c2 = ctx.color('--c-2'), c3 = ctx.color('--c-3');
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      var wide = w >= 520, rx = wide ? w * 0.12 : w * 0.2, ry = wide ? h * 0.42 : h * 0.15, Rr = wide ? Math.min(w * 0.09, h * 0.2) : h * 0.1, ang = 2 * PI * Nn / 30;   // the rotor is drawn 30 times slower
      g.fillStyle = TV.alpha(c1, 0.25); g.strokeStyle = wire; g.lineWidth = 2.5; g.beginPath(); g.arc(rx, ry, Rr, 0, 2 * PI); g.fill(); g.stroke();
      g.lineWidth = 2; for (var k = 0; k < 3; k++) line(g, rx, ry, rx + Rr * Math.cos(-ang + k * 2 * PI / 3), ry + Rr * Math.sin(-ang + k * 2 * PI / 3));
      g.fillStyle = wire; g.beginPath(); g.arc(rx, ry, 4, 0, 2 * PI); g.fill();
      var tx = wide ? rx : rx + Rr + 12, ty = wide ? ry + Rr + 16 : ry - 10, al = wide ? 'center' : 'left';
      lab(g, 'n', ' = ' + nf(Math.round(nn), 4) + ' r/min', tx, ty, c1, al, fs); lab(g, 'N', ' = ' + nf(Nn, 4) + ' ' + ctx.tx(T('revolutions', 'kierrosta')), tx, ty + fs + 6, c2, al, fs);
      lab(g, '', ctx.tx(T('rotor drawn 30× slower', 'roottori piirretty 30× hitaammin')), tx, ty + 2 * fs + 12, mu, al, fs - 3);
      var b1 = wide ? { x0: w * 0.33, y0: 34, x1: w * 0.62, y1: h - 36 } : { x0: 46, y0: h * 0.37, x1: w - 14, y1: h * 0.62 };
      var b2 = wide ? { x0: w * 0.72, y0: 34, x1: w - 14, y1: h - 36 } : { x0: 46, y0: h * 0.73, x1: w - 14, y1: h - 30 };
      var A1 = axes(g, ctx, b1, { xmax: 20, ymax: 3500, xs: [5, 10, 15, 20], ys: [1000, 2000, 3000], xlab: ['t', ' / s'], ylab: ['n', ' / (r/min)'], fs: fs });
      var A2 = axes(g, ctx, b2, { xmax: 20, ymax: 600, xs: [5, 10, 15, 20], ys: [200, 400, 600], xlab: ['t', ' / s'], ylab: ['N', ' ' + ctx.tx(T('(revolutions)', '(kierrokset)'))], fs: fs });
      g.setLineDash([5, 4]); g.strokeStyle = TV.alpha(c1, 0.6); g.lineWidth = 1.5; line(g, A1.X(0), A1.Y(0), A1.X(Tt), A1.Y(p.n)); g.beginPath();
      for (var i = 0; i <= 40; i++) { var q = Tt * i / 40, Nq = p.n / 60 * q * q / (2 * Tt); if (i) g.lineTo(A2.X(q), A2.Y(Nq)); else g.moveTo(A2.X(0), A2.Y(0)); }
      g.strokeStyle = TV.alpha(c2, 0.6); g.stroke(); g.setLineDash([]);
      if (s > 0) {
        g.fillStyle = TV.alpha(c1, 0.2); g.beginPath(); g.moveTo(A1.X(0), A1.Y(0)); g.lineTo(A1.X(tn), A1.Y(nn)); g.lineTo(A1.X(tn), A1.Y(0)); g.closePath(); g.fill();
        g.strokeStyle = c1; g.lineWidth = 3; line(g, A1.X(0), A1.Y(0), A1.X(tn), A1.Y(nn)); g.fillStyle = c1; g.beginPath(); g.arc(A1.X(tn), A1.Y(nn), 4.5, 0, 2 * PI); g.fill();
        g.strokeStyle = c2; g.lineWidth = 3; g.beginPath();
        for (i = 0; i <= 40; i++) { q = tn * i / 40; Nq = p.n / 60 * q * q / (2 * Tt); if (i) g.lineTo(A2.X(q), A2.Y(Nq)); else g.moveTo(A2.X(0), A2.Y(0)); } g.stroke();
        g.fillStyle = c2; g.beginPath(); g.arc(A2.X(tn), A2.Y(Nn), 4.5, 0, 2 * PI); g.fill();
        if (s > 0.35) lab(g, 'N', ' = ' + ctx.tx(T('area', 'ala')), A1.X(tn * 0.62), A1.Y(nn * 0.3), c1, 'center', fs - 1, bg);
      }
      lab(g, 'α', ' = ' + nf(2 * PI * p.n / 60 / Tt, 3) + ' rad/s²', b1.x1, b1.y0 - 12, c3, 'right', fs - 1);
    },
    outputs: function (p) {
      var om = 2 * PI * p.n / 60;
      return [{ tex: 'α = 2π(n − n_0)/t', value: om / p.t, unit: 'rad/s²' }, { tex: 'ω', value: om, unit: 'rad/s' }, { tex: 'N = (n_0 + n) t/2', value: p.n / 60 * p.t / 2, digits: 4 }, { tex: 'φ', value: nf(om * p.t / 2, 4) + ' rad' }];
    },
    answer: function (p) { return { v: 2 * PI * p.n / 60 / p.t }; }
  };

  // ================================================================ device: Steiner's rule, the axis moves (t6-steiner-lab; p11)
  var STEINER = {
    animate: true,
    aspect: function (w) { return w < 520 ? 1.35 : 0.62; },
    params: prm([{ id: 'm', tex: 'm', min: 5, max: 50, step: 1, value: 25, unit: 'kg' }, { id: 'r', tex: 'r', min: 0.1, max: 0.5, step: 0.01, value: 0.33, unit: 'm' },
                 { id: 'dr', tex: 'd/r', min: 0, max: 1, step: 0.05, value: 0.5 }, { id: 'M', tex: 'M', min: 2, max: 30, step: 1, value: 10, unit: 'N·m' }]),
    buttons: [{ label: T('Same torque, spin it', 'Sama momentti, pyöritä'), click: function (p, D) { changed(D.S, p, ['m', 'r', 'dr', 'M']); D.S.t = D.motion ? 0 : 2.5; D.S.run = D.motion; } },
              { label: T('Axis through the centre', 'Akseli keskipisteen kautta'), click: function (p, D) { D.set({ dr: 0 }); } },
              { label: T('Axis at the rim', 'Akseli reunalla'), click: function (p, D) { D.set({ dr: 1 }); } }],
    drag: {
      hit: function (x, y, p, D) { var G0 = D.S.geo; return G0 && Math.hypot(x - G0.px, y - G0.py) < Math.max(18, G0.R) && !D.S.run ? 'axis' : null; },
      move: function (k, x, y, p, D) { var G0 = D.S.geo; return { dr: clamp((G0.ax - x) / G0.R, 0, 1) }; }   // drag the disc: its centre P moves away from the axis A
    },
    draw: function (g, w, h, p, ctx, TV, D) {
      var S = D.S, wide = w >= 520;
      if (changed(S, p, ['m', 'r', 'dr', 'M'])) { S.t = 0; S.run = false; }
      if (S.t == null) S.t = 0;
      var Jp = 0.5 * p.m * p.r * p.r, d = p.dr * p.r, Ja = Jp + p.m * d * d, al = p.M / Ja, RUN = 2.5;
      if (S.run) { S.t = Math.min(RUN, S.t + D.dt); if (S.t >= RUN) S.run = false; }
      var wEnd = al * RUN, f = Math.min(1, 10 / wEnd), ph = 0.5 * al * S.t * S.t * f;   // fast turning is drawn slower
      var fs = fsz(w), fg = ctx.color('--fg'), wire = ctx.color('--c-wire'), mu = ctx.color('--muted'), bg = ctx.color('--surface'), c1 = ctx.color('--c-1'), c3 = ctx.color('--c-3'), cF = ctx.color('--f-applied');
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      var aw = wide ? w * 0.5 : w, ah = wide ? h : h * 0.52, ax = aw / 2, ay = ah * 0.5, sc = Math.min(aw * 0.3, ah * 0.4) / 0.5, R = p.r * sc;
      var pxx = ax - d * sc * Math.cos(ph), pyy = ay + d * sc * Math.sin(ph);   // centre P turns about A (counterclockwise)
      S.geo = { px: pxx, py: pyy, ax: ax, R: Math.max(R, 1) };
      g.fillStyle = TV.alpha(c1, 0.25); g.strokeStyle = wire; g.lineWidth = 2.5; g.beginPath(); g.arc(pxx, pyy, R, 0, 2 * PI); g.fill(); g.stroke();
      g.lineWidth = 2; line(g, pxx, pyy, pxx + R * Math.cos(-ph), pyy + R * Math.sin(-ph));   // a mark on the disc shows how it turns
      if (d > 1e-6) { g.strokeStyle = cF; g.lineWidth = 2; g.setLineDash([5, 3]); line(g, ax, ay, pxx, pyy); g.setLineDash([]); }
      g.fillStyle = wire; g.beginPath(); g.arc(pxx, pyy, 4, 0, 2 * PI); g.fill();
      g.strokeStyle = fg; g.lineWidth = 2.5; g.fillStyle = bg; g.beginPath(); g.arc(ax, ay, 7, 0, 2 * PI); g.fill(); g.stroke(); line(g, ax - 5, ay - 5, ax + 5, ay + 5); line(g, ax - 5, ay + 5, ax + 5, ay - 5);
      lab(g, 'A', '', ax + 12, ay - 16, fg, 'left', fs); lab(g, 'P', '', pxx - 12, pyy + 18, wire, 'right', fs);
      if (d > 0.02) lab(g, 'd', ' = ' + nf(d, 3) + ' m', pxx, pyy + R + 16, cF, 'center', fs - 1, bg);
      lab(g, '', ctx.tx(S.run || S.t > 0 ? T('Torque M acts about A', 'Momentti M vaikuttaa pisteen A ympäri') : T('Drag the disc: the axis A stays', 'Vedä kiekkoa: akseli A pysyy paikallaan')), 8, 12, mu, 'left', fs - 2);
      if (f < 1) lab(g, '', ctx.tx(T('picture turns ' + nf(1 / f, 2) + '× slower', 'kuva pyörii ' + nf(1 / f, 2) + '× hitaammin')), 8, ah - 8, mu, 'left', fs - 3);
      // ---- J_A(d), the parabola, and the two slide marks d = r/2 and d = r
      var b = wide ? { x0: w * 0.6, y0: 40, x1: w - 14, y1: h - 40 } : { x0: 52, y0: ah + 34, x1: w - 14, y1: h - 36 }, top = 1.6 * p.m * p.r * p.r;
      var tk = TDC.viz.niceTicks(0, top, 4).filter(function (v) { return v > 0 && v <= top; });
      var A = axes(g, ctx, b, { xmax: 1, ymax: top, xs: [0, 0.5, 1], ys: tk, xlab: ['d/r', ''], ylab: ['J_A', ' / (kg·m²)'], fs: fs });
      g.strokeStyle = c1; g.lineWidth = 2.5; g.beginPath(); for (var i = 0; i <= 40; i++) { var x = i / 40, J = p.m * p.r * p.r * (0.5 + x * x); if (i) g.lineTo(A.X(x), A.Y(J)); else g.moveTo(A.X(x), A.Y(J)); } g.stroke();
      [0.5, 1].forEach(function (x) { g.fillStyle = TV.alpha(c1, 0.8); g.beginPath(); g.arc(A.X(x), A.Y(p.m * p.r * p.r * (0.5 + x * x)), 3.5, 0, 2 * PI); g.fill(); });
      g.strokeStyle = fg; g.lineWidth = 1.2; g.setLineDash([4, 3]); line(g, A.X(p.dr), b.y1, A.X(p.dr), A.Y(Ja)); line(g, b.x0, A.Y(Ja), A.X(p.dr), A.Y(Ja)); g.setLineDash([]);
      g.fillStyle = cF; g.beginPath(); g.arc(A.X(p.dr), A.Y(Ja), 6, 0, 2 * PI); g.fill();
      lab(g, 'J_A', ' = ' + nf(Ja, 3) + ' kg·m²', b.x1, b.y0 - 12 + (wide ? 0 : 0), cF, 'right', fs - 1);
      lab(g, 'J_P', ' = ' + nf(Jp, 3), A.X(0) + 6, A.Y(Jp) - 12, mu, 'left', fs - 2);
    },
    outputs: function (p) {
      var Jp = 0.5 * p.m * p.r * p.r, d = p.dr * p.r, Ja = Jp + p.m * d * d;
      return [{ tex: 'J_P = ½ m r^2', value: Jp, unit: 'kg·m²', digits: 4 }, { tex: 'J_A = J_P + m d^2', value: Ja, unit: 'kg·m²', digits: 4 }, { tex: 'α = M/J_A', value: p.M / Ja, unit: 'rad/s²' }, { tex: 'ω (2.5 s)', value: p.M / Ja * 2.5, unit: 'rad/s' }];
    },
    answer: function (p) { return { v: 0.5 * p.m * p.r * p.r + p.m * Math.pow(p.dr * p.r, 2) }; }
  };

  // ================================================================ device: torque wrench, M = F r sin θ (t6-wrench-lab; p13)
  var WRENCH = {
    animate: true,
    aspect: function (w) { return w < 520 ? 0.8 : 0.38; },
    params: prm([{ id: 'F', tex: 'F', min: 0, max: 400, step: 5, value: 200, unit: 'N' }, { id: 'th', tex: 'θ', min: 0, max: 180, step: 1, value: 90, unit: '°' },
                 { id: 'r', tex: 'r', min: 0.1, max: 0.6, step: 0.01, value: 0.4, unit: 'm' }, { id: 'Mn', tex: 'M_n', min: 10, max: 120, step: 5, value: 60, unit: 'N·m' }]),
    buttons: [{ label: T('Pull', 'Vedä'), click: function (p, D) { D.S.run = !D.S.run; } },
              { label: T('Pull at 90°', 'Vedä 90° kulmassa'), click: function (p, D) { D.set({ th: 90 }); } },
              { label: T('Pull along the wrench', 'Vedä vartta pitkin'), click: function (p, D) { D.set({ th: 0 }); } }],
    draw: function (g, w, h, p, ctx, TV, D) {
      var S = D.S; if (S.a == null) { S.a = 0; S.run = false; }
      var th = p.th * PI / 180, M = p.F * p.r * Math.sin(th), turns = M > p.Mn;
      if (S.run && turns) S.a += clamp((M - p.Mn) / p.Mn * 2, 0.5, 4) * D.dt;
      var fs = fsz(w), fg = ctx.color('--fg'), wire = ctx.color('--c-wire'), mu = ctx.color('--muted'), bg = ctx.color('--surface'), cF = ctx.color('--f-applied'), c1 = ctx.color('--c-1'), c3 = ctx.color('--c-3');
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      var x0 = w * 0.17, y0 = h * 0.54, R = p.r / 0.6 * w * 0.5, shake = S.run && !turns ? Math.sin(D.t * 45) * 1.6 : 0, ty = y0 + shake;
      g.fillStyle = ctx.color('--m-body'); g.strokeStyle = wire; g.lineWidth = 2; TV.rr(g, x0 - 4, ty - 8, R + 8, 16, 7); g.fill(); g.stroke();
      g.fillStyle = TV.alpha(c1, 0.5); g.beginPath(); for (var k = 0; k < 6; k++) { var q = -S.a + k * PI / 3; g.lineTo(x0 + 22 * Math.cos(q), y0 + 22 * Math.sin(q)); } g.closePath(); g.fill(); g.stroke();
      g.fillStyle = wire; g.beginPath(); g.arc(x0, y0, 4, 0, 2 * PI); g.fill();
      var tx = x0 + R, ux = Math.cos(th), uy = -Math.sin(th), foot = [x0 + R * Math.sin(th) * Math.sin(th), y0 + R * Math.sin(th) * Math.cos(th)];   // foot of the perpendicular from the axis onto the line of F
      g.strokeStyle = mu; g.lineWidth = 1.3; g.setLineDash([5, 4]); line(g, tx - ux * 70, ty + uy * 70, tx + ux * 10, ty - uy * 10); if (Math.abs(Math.sin(th)) > 0.03) line(g, tx, ty, foot[0], foot[1]); g.setLineDash([]);
      if (Math.sin(th) > 0.05) { g.strokeStyle = c3; g.lineWidth = 3; line(g, x0, y0, foot[0], foot[1]); lab(g, 'l', ' = ' + nf(p.r * Math.sin(th), 3) + ' m', (x0 + foot[0]) / 2, (y0 + foot[1]) / 2 + 16, c3, 'center', fs - 1, bg); }
      var La = 26 + p.F / 400 * 60;
      if (p.F > 0) { var L2 = arrowTo(g, TV, tx, ty, ux, uy, La, cF, 4, w, h); lab(g, 'F', ' = ' + p.F + ' N', clamp(tx + ux * (L2 + 6) + 6, 40, w - 44), clamp(ty + uy * (L2 + 6) - 12 * (uy < 0 ? 1 : -1), 12, h - 12), cF, 'center', fs - 1, bg); }
      g.strokeStyle = fg; g.lineWidth = 1.5; g.beginPath(); g.arc(tx, ty, 24, -th, 0); g.stroke(); lab(g, 'θ', ' = ' + p.th + '°', tx + 30, ty - 12 * Math.sign(Math.sin(th) || 1) - 6, fg, 'left', fs - 1, bg);
      lab(g, 'r', ' = ' + nf(p.r, 3) + ' m', x0 + R / 2, y0 - 22, fg, 'center', fs - 1);
      lab(g, 'M', ' = F r sin θ = ' + nf(M, 3) + ' N·m', 8, 14, turns ? cF : fg, 'left', fs);
      lab(g, '', ctx.tx(turns ? T('M is larger than the resistance of the nut: it turns', 'M on suurempi kuin mutterin vastus: se pyörii') : T('M is smaller than the resistance of the nut: it holds', 'M on pienempi kuin mutterin vastus: se pitää')), 8, h - 12, turns ? cF : mu, 'left', fs - 2);
    },
    outputs: function (p) {
      var M = p.F * p.r * Math.sin(p.th * PI / 180);
      return [{ tex: 'M = F r sin θ', value: M, unit: 'N·m' }, { tex: 'l = r sin θ', value: p.r * Math.sin(p.th * PI / 180), unit: 'm', digits: 3 }, { label: T('Nut', 'Mutteri'), value: M > p.Mn ? T('turns', 'pyörii') : T('holds', 'pitää') }];
    },
    answer: function (p) { return { v: p.F * p.r * Math.sin(p.th * PI / 180) }; }
  };

  // ================================================================ device: belt drive of two wheels (t6-belt-lab; FI exercise 96)
  var BELT = {
    animate: true,
    aspect: function (w) { return w < 520 ? 0.8 : 0.5; },
    params: prm([{ id: 'r1', tex: 'r_1', min: 10, max: 40, step: 1, value: 25, unit: 'cm' }, { id: 'r2', tex: 'r_2', min: 10, max: 40, step: 1, value: 32, unit: 'cm' },
                 { id: 'n1', tex: 'n_1', min: 100, max: 3000, step: 50, value: 1500, unit: 'r/min' }]),
    buttons: [{ label: T('Run / stop', 'Käy / pysähdy'), click: function (p, D) { D.S.run = !D.S.run; } },
              { label: T('Exercise 96', 'Tehtävä 96'), click: function (p, D) { D.set({ r1: 25, r2: 32, n1: 1500 }); } },
              { label: T('Equal wheels', 'Yhtä suuret pyörät'), click: function (p, D) { D.set({ r2: p.r1 }); } }],
    draw: function (g, w, h, p, ctx, TV, D) {
      var S = D.S; if (S.run == null) S.run = D.motion; if (S.a1 == null) { S.a1 = 0; S.a2 = 0; S.s = 0; }
      var n1 = p.n1 / 60, n2 = n1 * p.r1 / p.r2, f = Math.min(1, 1.5 / Math.max(n1, n2));
      var fs = fsz(w), fg = ctx.color('--fg'), wire = ctx.color('--c-wire'), mu = ctx.color('--muted'), bg = ctx.color('--surface'), c1 = ctx.color('--c-1'), c3 = ctx.color('--c-3'), acc = ctx.color('--f-accel');
      var sc = Math.min((w - 24) / 170, h * 0.38 / 40), R1 = p.r1 * sc, R2 = p.r2 * sc, cy = h * 0.45, x1 = (w - 170 * sc) / 2 + 40 * sc, x2 = x1 + 90 * sc, Dd = 90 * sc;
      if (S.run) { S.a1 += 2 * PI * n1 * f * D.dt; S.a2 += 2 * PI * n2 * f * D.dt; S.s += 2 * PI * n1 * f * R1 * D.dt; }
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      [[x1, R1, c1, S.a1], [x2, R2, c3, S.a2]].forEach(function (q) {   // both wheels turn clockwise: the belt is open
        g.fillStyle = TV.alpha(q[2], 0.25); g.strokeStyle = wire; g.lineWidth = 2; g.beginPath(); g.arc(q[0], cy, q[1], 0, 2 * PI); g.fill(); g.stroke();
        for (var k = 0; k < 3; k++) line(g, q[0], cy, q[0] + q[1] * Math.cos(q[3] + k * 2 * PI / 3), cy + q[1] * Math.sin(q[3] + k * 2 * PI / 3));
        g.fillStyle = wire; g.beginPath(); g.arc(q[0], cy, 4, 0, 2 * PI); g.fill();
      });
      var ph = Math.asin((p.r1 - p.r2) / 90), sn = Math.sin(ph), cs = Math.cos(ph), at = Math.atan2(-cs, sn), ab = Math.atan2(cs, sn);
      g.beginPath(); g.moveTo(x1 + R1 * sn, cy - R1 * cs); g.lineTo(x2 + R2 * sn, cy - R2 * cs); g.arc(x2, cy, R2, at, ab, false); g.lineTo(x1 + R1 * sn, cy + R1 * cs); g.arc(x1, cy, R1, ab, at + 2 * PI, false); g.closePath();
      g.strokeStyle = wire; g.lineWidth = 5; g.stroke(); g.strokeStyle = acc; g.lineWidth = 2; g.setLineDash([8, 10]); g.lineDashOffset = -S.s; g.stroke(); g.setLineDash([]); g.lineDashOffset = 0;
      var yb = cy + 40 * sc + 16, v = 2 * PI * n1 * p.r1 / 100;
      lab(g, 'r_1', ' = ' + p.r1 + ' cm', x1, yb, c1, 'center', fs); lab(g, 'n_1', ' = ' + nf(p.n1, 4) + ' r/min', x1, yb + fs + 6, c1, 'center', fs - 1);
      lab(g, 'r_2', ' = ' + p.r2 + ' cm', x2, yb, c3, 'center', fs); lab(g, 'n_2', ' = ' + nf(n2 * 60, 4) + ' r/min', x2, yb + fs + 6, c3, 'center', fs - 1);
      lab(g, 'v', ' = ' + nf(v, 3) + ' m/s', (x1 + x2) / 2, cy - Math.max(R1, R2) - 6, acc, 'center', fs, bg);
      if (f < 1) lab(g, '', ctx.tx(T('picture turns ' + nf(1 / f, 2) + '× slower', 'kuva pyörii ' + nf(1 / f, 2) + '× hitaammin')), 8, h - 8, mu, 'left', fs - 3);
    },
    outputs: function (p) {
      var n2 = p.n1 * p.r1 / p.r2;
      return [{ tex: 'n_2 = n_1 r_1/r_2', value: nf(n2, 4) + ' r/min' }, { tex: 'ω_2', value: 2 * PI * n2 / 60, unit: 'rad/s' }, { tex: 'v = ω r', value: 2 * PI * p.n1 / 60 * p.r1 / 100, unit: 'm/s' },
              { label: T('Revolutions in 15 s', 'Kierrokset 15 s:ssa'), value: nf(p.n1 / 60 * 15, 4) + ' / ' + nf(n2 / 60 * 15, 4) }];
    },
    answer: function (p) { return { v: p.n1 * p.r1 / p.r2 }; }
  };

  // ================================================================ device: ice skater on a stool, L = J ω constant (t6-skater-lab; p16, p17)
  var SK_JB = 1.0, SK_R0 = 0.9, SK_RMIN = 0.2;   // the body about the axis (kg·m²), arms-out radius, arms-in radius (m)
  function skater(p, r) { var J = SK_JB + 2 * p.mw * r * r, L = (SK_JB + 2 * p.mw * SK_R0 * SK_R0) * 2 * PI * p.n0, w = L / J; return { J: J, L: L, w: w, E: 0.5 * L * w }; }
  var SKATER = {
    animate: true,
    aspect: function (w) { return w < 520 ? 1.25 : 0.6; },
    params: prm([{ id: 'r', tex: 'r', min: SK_RMIN, max: SK_R0, step: 0.01, value: 0.9, unit: 'm' }, { id: 'mw', tex: 'm', min: 1, max: 5, step: 0.5, value: 3, unit: 'kg' }, { id: 'n0', tex: 'n_0', min: 0.5, max: 2, step: 0.1, value: 1, unit: 'r/s' }]),
    buttons: [{ label: T('Pull the arms in', 'Vedä kädet sisään'), click: function (p, D) { D.set({ r: SK_RMIN }); } },
              { label: T('Arms out', 'Kädet ulos'), click: function (p, D) { D.set({ r: SK_R0 }); } }],
    draw: function (g, w, h, p, ctx, TV, D) {
      var S = D.S; if (S.rd == null) { S.rd = p.r; S.a = 0; }
      S.rd = D.motion ? S.rd + (p.r - S.rd) * Math.min(1, D.dt * 6) : p.r;
      var s = skater(p, S.rd), s0 = skater(p, SK_R0), sm = skater(p, SK_RMIN);
      S.a += s.w * D.dt * 0.5;
      var fs = fsz(w), fg = ctx.color('--fg'), wire = ctx.color('--c-wire'), mu = ctx.color('--muted'), bg = ctx.color('--surface'), c1 = ctx.color('--c-1'), c3 = ctx.color('--c-3');
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      var wide = w >= 520, cx = wide ? w * 0.24 : w * 0.5, cy = wide ? h * 0.5 : h * 0.2, sc = (wide ? Math.min(w * 0.2, h * 0.38) : Math.min(w * 0.3, h * 0.17)) / SK_R0, a = S.a;
      g.strokeStyle = mu; g.lineWidth = 1; g.setLineDash([4, 4]); g.beginPath(); g.arc(cx, cy, SK_R0 * sc, 0, 2 * PI); g.stroke(); g.setLineDash([]);
      var ex = Math.cos(-a), ey = Math.sin(-a), rw = 5 + 3 * Math.cbrt(p.mw);
      g.strokeStyle = wire; g.lineWidth = 4; line(g, cx - ex * S.rd * sc, cy - ey * S.rd * sc, cx + ex * S.rd * sc, cy + ey * S.rd * sc);
      g.fillStyle = TV.alpha(c3, 0.6); g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 0.16 * sc, 0, 2 * PI); g.fill(); g.stroke();
      [1, -1].forEach(function (q) { g.fillStyle = TV.alpha(c1, 0.7); g.beginPath(); g.arc(cx + q * ex * S.rd * sc, cy + q * ey * S.rd * sc, rw, 0, 2 * PI); g.fill(); g.stroke(); });
      lab(g, 'ω', ' = ' + nf(s.w, 3) + ' rad/s', cx, cy + SK_R0 * sc + 16, fg, 'center', fs);
      var bx0 = wide ? w * 0.5 : 14, bx1 = w - 16, by0 = wide ? h * 0.12 : h * 0.44, gap = wide ? h * 0.2 : h * 0.125;
      [['L', s.L, s.L, s0.L, ' kg·m²/s', ctx.color('--c-2')], ['J', s.J, s0.J, s0.J, ' kg·m²', c1], ['ω', s.w, sm.w, s0.w, ' rad/s', ctx.color('--f-accel')], ['E_R', s.E, sm.E, s0.E, ' J', ctx.color('--bad')]].forEach(function (q, i) {
        var y = by0 + i * gap + 14, bw = bx1 - bx0, fr = clamp(q[1] / q[2], 0, 1.02);
        lab(g, q[0], ' = ' + nf(q[1], 3) + q[4], bx0, y - 12, q[5], 'left', fs - 1);
        g.strokeStyle = mu; g.lineWidth = 1; g.strokeRect(bx0, y, bw, 12); g.fillStyle = TV.alpha(q[5], 0.7); g.fillRect(bx0, y, bw * fr, 12);
        g.strokeStyle = fg; g.lineWidth = 1.5; g.setLineDash([3, 2]); line(g, bx0 + bw * q[3] / q[2], y - 3, bx0 + bw * q[3] / q[2], y + 15); g.setLineDash([]);
      });
      lab(g, '', ctx.tx(T('dashed mark: arms out', 'katkoviiva: kädet ulkona')), bx1, by0 + 4 * gap + 6, mu, 'right', fs - 3);
    },
    outputs: function (p) {
      var s = skater(p, p.r), s0 = skater(p, SK_R0);
      return [{ tex: 'J = J_b + 2\\m r^2', value: s.J, unit: 'kg·m²' }, { tex: 'L = J ω', value: s.L, unit: 'kg·m²/s' }, { tex: 'ω', value: s.w, unit: 'rad/s' }, { tex: 'n', value: s.w / (2 * PI), unit: 'r/s' },
              { tex: 'E_R', value: s.E, unit: 'J' }, { tex: 'E_R/E_{R0}', value: s.E / s0.E, digits: 3 }];
    },
    answer: function (p) { return { v: skater(p, p.r).w }; }
  };

  // ================================================================ device: rod hit by a lump of clay, exercise 7.26 (t6-rod-lab; p17)
  // Rod mass 1 (units), lump mass q: angular momentum about the centre A is conserved in the hit, then the energy gives the swing.
  function rod(p) {
    var k = 1 / 12 + p.q / 4, w = p.q * p.v * p.L / 2 / (k * p.L * p.L), c1 = k * p.L * p.L * w * w / (p.q * G * p.L);   // c1 = 1 − cos θmax
    return { k: k, w: w, c1: c1, over: c1 >= 2, th: c1 >= 2 ? 180 : Math.acos(1 - c1) * 180 / PI, keep: k * p.L * p.L * w * w / (p.q * p.v * p.v) };
  }
  var ROD = {
    animate: true,
    aspect: function (w) { return w < 520 ? 1.0 : 0.6; },
    params: prm([{ id: 'L', tex: 'L', min: 0.4, max: 1.5, step: 0.05, value: 0.8, unit: 'm' }, { id: 'v', tex: 'v', min: 0.5, max: 4, step: 0.1, value: 2, unit: 'm/s' }, { id: 'q', tex: 'q', min: 0.25, max: 3, step: 0.25, value: 1 }]),
    buttons: [{ label: T('Throw the lump', 'Heitä möykky'), click: function (p, D) { changed(D.S, p, ['L', 'v', 'q']); D.S.t = 0; D.S.hit = false; D.S.th = 0; D.S.run = true; if (!D.motion) { D.S.t = 2; D.S.hit = true; D.S.th = Math.min(PI, rod(p).th * PI / 180); D.S.run = false; } } },
              { label: T('Reset', 'Nollaa'), click: function (p, D) { D.S.t = 0; D.S.hit = false; D.S.th = 0; D.S.run = false; } }],
    draw: function (g, w, h, p, ctx, TV, D) {
      var S = D.S, R = rod(p);
      if (changed(S, p, ['L', 'v', 'q'])) { S.t = 0; S.hit = false; S.th = 0; S.om = 0; S.run = false; }
      if (S.t == null) { S.t = 0; S.th = 0; S.om = 0; S.hit = false; }
      var accel = function (th) { return -p.q * G / (2 * R.k * p.L) * Math.sin(th); };   // the lump is the only part whose weight has a torque about A
      if (S.run) {
        S.t += D.dt;
        if (S.t >= 1) { if (!S.hit) { S.hit = true; S.th = 0; S.om = R.w; } var n = Math.max(1, Math.ceil(D.dt / 0.002)), dt = D.dt / n; for (var i = 0; i < n; i++) { S.om += accel(S.th) * dt; S.th += S.om * dt; } }
      }
      var fs = fsz(w), fg = ctx.color('--fg'), wire = ctx.color('--c-wire'), mu = ctx.color('--muted'), bg = ctx.color('--surface'), c1 = ctx.color('--c-1'), c3 = ctx.color('--c-3'), acc = ctx.color('--f-accel');
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      var ax = w * 0.5, ay = h * 0.45, half = p.L / 1.5 * h * 0.36, th = S.th, sn = Math.sin(th), cs = Math.cos(th);
      g.strokeStyle = mu; g.lineWidth = 1; g.setLineDash([4, 4]); line(g, ax, ay - half - 14, ax, ay + half + 14); g.setLineDash([]);
      if (R.th > 1) { var tm = Math.min(PI, R.th * PI / 180); g.strokeStyle = TV.alpha(c3, 0.5); g.lineWidth = 2; g.setLineDash([6, 4]); line(g, ax - half * Math.sin(tm), ay - half * Math.cos(tm), ax + half * Math.sin(tm), ay + half * Math.cos(tm)); g.setLineDash([]);
        lab(g, 'θ_max', ' = ' + (R.over ? '> 180°' : nf(R.th, 3) + '°'), clamp(ax + half * Math.sin(tm) + 8, 60, w - 60), ay + half * Math.cos(tm) + (Math.cos(tm) > 0 ? 14 : -14), c3, 'center', fs - 1, bg); }
      g.strokeStyle = wire; g.lineWidth = 11; g.lineCap = 'round'; line(g, ax - half * sn, ay - half * cs, ax + half * sn, ay + half * cs); g.lineCap = 'butt';
      g.strokeStyle = ctx.color('--m-body'); g.lineWidth = 7; g.lineCap = 'round'; line(g, ax - half * sn, ay - half * cs, ax + half * sn, ay + half * cs); g.lineCap = 'butt';
      var bx = ax + half * sn, by = ay + half * cs, rl = 6 + 4 * Math.cbrt(p.q);
      if (!S.hit) { var d0 = Math.min(w * 0.4, 50 + p.v * 25), tt = clamp(S.t, 0, 1); bx = ax - d0 * (1 - tt); by = ay + half;
        TV.arrow(g, bx, by - rl - 14, bx + clamp(p.v * 14, 18, 60), by - rl - 14, acc, 3.5); lab(g, 'v', ' = ' + nf(p.v, 3) + ' m/s', clamp(bx + 30, 50, w - 50), by - rl - 28, acc, 'center', fs - 1, bg); }
      g.fillStyle = TV.alpha(c3, 0.85); g.strokeStyle = wire; g.lineWidth = 2; g.beginPath(); g.arc(bx, by, rl, 0, 2 * PI); g.fill(); g.stroke();
      g.fillStyle = bg; g.strokeStyle = fg; g.lineWidth = 2.5; g.beginPath(); g.arc(ax, ay, 6, 0, 2 * PI); g.fill(); g.stroke(); lab(g, 'A', '', ax + 14, ay - 4, fg, 'left', fs);
      if (S.hit && th > 0.03) { g.strokeStyle = fg; g.lineWidth = 1.5; g.beginPath(); g.arc(ax, ay, half * 0.45, PI / 2 - th, PI / 2); g.stroke(); lab(g, 'θ', ' = ' + nf(th * 180 / PI, 3) + '°', ax + 8, ay + half * 0.45 + 18, fg, 'left', fs - 1, bg); }
      lab(g, 'ω', ' = ' + nf(R.w, 3) + ' rad/s ' + ctx.tx(T('right after the hit', 'heti iskun jälkeen')), 8, 14, fg, 'left', fs - 1);
      lab(g, '', ctx.tx(T('the rod turns about A without friction', 'sauva pyörii kitkatta pisteen A ympäri')), 8, h - 10, mu, 'left', fs - 3);
    },
    outputs: function (p) {
      var R = rod(p);
      return [{ tex: 'ω', value: R.w, unit: 'rad/s' }, { tex: 'θ_max', value: R.over ? T('over the top', 'yli yläkohdan') : R.th, unit: '°', digits: 3 },
              { tex: 'E_after/E_before', value: R.keep, digits: 3 }];
    },
    answer: function (p) { return { v: rod(p).w }; }
  };

  // ================================================================ device: gyro precession (t6-gyro-lab; FI p18)
  var GYRO = {
    animate: true,
    aspect: function (w) { return w < 520 ? 1.2 : 0.6; },
    params: prm([{ id: 'n', tex: 'n', min: 5, max: 80, step: 1, value: 30, unit: 'r/s' }, { id: 'm', tex: 'm', min: 0.2, max: 2, step: 0.1, value: 1, unit: 'kg' },
                 { id: 'r', tex: 'r', min: 0.05, max: 0.3, step: 0.01, value: 0.15, unit: 'm' }, { id: 'J', tex: 'J_A', min: 0.002, max: 0.02, step: 0.001, value: 0.004, unit: 'kg·m²' }]),
    buttons: [{ label: T('Release / stop', 'Päästä / pysäytä'), click: function (p, D) { D.S.run = !D.S.run; } },
              { label: T('Double the spin', 'Kaksinkertaista pyöriminen'), click: function (p, D) { D.set({ n: Math.min(80, p.n * 2) }); } },
              { label: T('Half the spin', 'Puolita pyöriminen'), click: function (p, D) { D.set({ n: Math.max(5, p.n / 2) }); } }],
    draw: function (g, w, h, p, ctx, TV, D) {
      var S = D.S; if (S.run == null) { S.run = D.motion; S.psi = 0.4; S.sp = 0; }
      var om = 2 * PI * p.n, wp = p.m * G * p.r / (p.J * om), wpd = Math.min(wp, 6);
      if (S.run) { S.psi += wpd * D.dt; S.sp += 10 * p.n / 80 * D.dt; }
      var fs = fsz(w), fg = ctx.color('--fg'), wire = ctx.color('--c-wire'), mu = ctx.color('--muted'), bg = ctx.color('--surface'), c1 = ctx.color('--c-1'), c3 = ctx.color('--c-3'), cF = ctx.color('--f-applied'), acc = ctx.color('--f-accel'), cw = ctx.color('--f-weight');
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      var wide = w >= 520, gw = wide ? w * 0.58 : w, gh = wide ? h : h * 0.58, ox = gw * 0.42, oy = gh * 0.42, La = Math.min(gw * 0.34, gh * 0.4), psi = S.psi, cp = Math.cos(psi), sp = Math.sin(psi);
      var P = function (s) { return [ox + s * cp, oy - 0.3 * s * sp]; };
      g.strokeStyle = wire; g.lineWidth = 4; line(g, ox, oy, ox, gh * 0.88); g.fillStyle = ctx.color('--m-ground'); g.beginPath(); g.moveTo(ox - 22, gh * 0.88); g.lineTo(ox + 22, gh * 0.88); g.lineTo(ox, gh * 0.88 - 20); g.closePath(); g.fill(); g.stroke();
      var tip = P(La), pd = P(La * 0.8), Rd = La * 0.3, e1 = [-sp, -0.3 * cp];
      g.strokeStyle = wire; g.lineWidth = 3; line(g, ox, oy, tip[0], tip[1]);
      g.fillStyle = TV.alpha(c1, 0.35); g.lineWidth = 2; g.beginPath();
      for (var i = 0; i <= 36; i++) { var q = i / 36 * 2 * PI, x = pd[0] + Rd * Math.cos(q) * e1[0], y = pd[1] + Rd * (Math.cos(q) * e1[1] - Math.sin(q)); if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.fill(); g.stroke();
      g.lineWidth = 1.5; for (i = 0; i < 4; i++) { q = S.sp + i * PI / 2; line(g, pd[0], pd[1], pd[0] + Rd * Math.cos(q) * e1[0], pd[1] + Rd * (Math.cos(q) * e1[1] - Math.sin(q))); }
      g.fillStyle = fg; g.beginPath(); g.arc(ox, oy, 5, 0, 2 * PI); g.fill(); lab(g, 'O', '', ox - 12, oy - 12, fg, 'right', fs);
      var Lw = clamp(p.m / 2 * 50, 18, 56); TV.arrow(g, pd[0], pd[1] + Rd * 0.4, pd[0], Math.min(gh - 14, pd[1] + Rd * 0.4 + Lw), cw, 3.5); lab(g, 'mg', '', pd[0] + 10, Math.min(gh - 14, pd[1] + Rd * 0.4 + Lw) - 4, cw, 'left', fs - 1, bg);
      lab(g, 'r', '', (ox + pd[0]) / 2, (oy + pd[1]) / 2 - 12, fg, 'center', fs - 1);
      TV.arrow(g, tip[0], tip[1], tip[0] + cp * 22, tip[1] - 0.3 * sp * 22, acc, 3); lab(g, 'L_1', '', clamp(tip[0] + cp * 38, 20, gw - 20), clamp(tip[1] - 0.3 * sp * 38 - 4, 10, gh - 10), acc, 'center', fs - 1, bg);
      // ---- the plan view: L turns, ΔL (the change of L) points along M
      var tcx = wide ? w * 0.8 : w * 0.5, tcy = wide ? h * 0.42 : h * 0.58 + (h - gh) * 0.5, Rt = wide ? Math.min(w * 0.14, h * 0.28) : Math.min(w * 0.2, (h - gh) * 0.32);
      g.strokeStyle = mu; g.lineWidth = 1; g.setLineDash([4, 4]); g.beginPath(); g.arc(tcx, tcy, Rt, 0, 2 * PI); g.stroke(); g.setLineDash([]);
      var lx = tcx + Rt * cp, ly = tcy - Rt * sp, mx = -sp, my = -cp;   // plan view from above; the tangent direction is ΔL ∥ M
      TV.arrow(g, tcx, tcy, lx, ly, acc, 3.5); lab(g, 'L_1', '', tcx + Rt * 0.5 * cp - 12 * sp, tcy - Rt * 0.5 * sp - 12 * cp, acc, 'center', fs - 1, bg);
      TV.arrow(g, lx, ly, lx + mx * 0.45 * Rt, ly + my * 0.45 * Rt, cF, 3.5); lab(g, 'ΔL', ' ∥ M', clamp(lx + mx * 0.45 * Rt + mx * 26, 28, w - 28), clamp(ly + my * 0.45 * Rt + my * 12, 10, h - 10), cF, 'center', fs - 1, bg);
      g.fillStyle = fg; g.beginPath(); g.arc(tcx, tcy, 3.5, 0, 2 * PI); g.fill(); lab(g, 'O', '', tcx + 10, tcy + 12, mu, 'left', fs - 2);
      lab(g, 'ω_P', ' = ' + nf(wp, 3) + ' rad/s', tcx, tcy + Rt + 20, c3, 'center', fs);
      lab(g, '', ctx.tx(T('seen from above', 'ylhäältä katsottuna')), tcx, tcy + Rt + 20 + fs + 6, mu, 'center', fs - 2);
      if (wp > 6) lab(g, '', ctx.tx(T('drawn slower', 'piirretty hitaammin')), tcx, tcy + Rt + 20 + 2 * fs + 10, mu, 'center', fs - 3);
    },
    outputs: function (p) {
      var om = 2 * PI * p.n, wp = p.m * G * p.r / (p.J * om);
      return [{ tex: 'ω = 2π n', value: om, unit: 'rad/s' }, { tex: 'L = J_A ω', value: p.J * om, unit: 'kg·m²/s' }, { tex: 'M = m g r', value: p.m * G * p.r, unit: 'N·m' },
              { tex: 'ω_P = {m g r}/{J_A ω}', value: wp, unit: 'rad/s' }, { tex: 'T_P = 2π/ω_P', value: 2 * PI / wp, unit: 's' }];
    },
    answer: function (p) { return { v: p.m * G * p.r / (p.J * 2 * PI * p.n) }; }
  };

  // ---------------------------------------------------------------- the topic
  function Q(id) { return { type: 'question', q: id, id: id + '-blk' }; }
  TDC.registerTopic({
    id: 't6', num: 6,
    title: T('Rotation', 'Pyörimisliike'),
    subtitle: T('Angle, angular velocity and acceleration, moment of inertia and Steiner\'s rule, rotational and rolling energy, torque, work, power and gears, angular momentum and its conservation, gyro forces.', 'Kulma, kulmanopeus ja kulmakiihtyvyys, hitausmomentti ja Steinerin sääntö, pyörimis- ja vierimisenergia, momentti, työ, teho ja vaihteet, liikemäärämomentti ja sen säilyminen sekä hyrrävoimat.'),
    objectives: [
      T('use the angle in radians, the angular velocity ω = 2π n, the period T = 1/n and the link v = ω r to the speed of a point', 'käyttää radiaaneina annettua kulmaa, kulmanopeutta ω = 2π n, jaksonaikaa T = 1/n ja yhteyttä v = ω r pisteen nopeuteen'),
      T('solve motion with a constant angular acceleration (ω = ω_0 + α t, φ = ω_0 t + ½ α t², a = α r) and read α from an n(t) graph', 'ratkaista tasaisesti muuttuvan pyörimisliikkeen (ω = ω_0 + α t, φ = ω_0 t + ½ α t², a = α r) ja lukea α:n n(t)-kuvaajasta'),
      T('calculate a moment of inertia J = Σ m r² for common shapes and move the axis with Steiner\'s rule J_A = J_P + m r²', 'laskea hitausmomentin J = Σ m r² yleisille kappaleille ja siirtää akselia Steinerin säännöllä J_A = J_P + m r²'),
      T('find rotational energy E_R = ½ J ω² and the energy of a rolling body', 'määrittää pyörimisenergian E_R = ½ J ω² ja vierivän kappaleen energian'),
      T('use torque M = F r sin θ, ΣM = J α, work W = M φ, power P = M ω, efficiency and gears', 'käyttää momenttia M = F r sin θ, yhtälöä ΣM = J α, työtä W = M φ, tehoa P = M ω, hyötysuhdetta ja vaihteita'),
      T('use angular momentum L = J ω and its conservation in a collision, a skater and a gyro', 'käyttää liikemäärämomenttia L = J ω ja sen säilymistä törmäyksessä, luistelijalla ja hyrrällä')
    ],
    glossary: {
      rotation: { en: 'rotation, rotational motion', fi: 'pyörimisliike', def: T('Motion of a body about an axis; every point moves on a circle around the axis.', 'Kappaleen liike akselin ympäri; jokainen piste liikkuu ympyrää akselin ympärillä.') },
      rigid: { en: 'rigid body', fi: 'jäykkä kappale', def: T('A body whose shape does not change under the forces acting on it.', 'Kappale, jonka muoto ei muutu siihen vaikuttavien voimien alaisena.') },
      axis: { en: 'fixed axis', fi: 'kiinteä akseli', def: T('An axis that does not move; the body turns about it.', 'Paikallaan pysyvä akseli, jonka ympäri kappale pyörii.') },
      uniformrot: { en: 'uniform rotational motion', fi: 'tasainen pyörimisliike', def: T('Rotation with a constant angular velocity.', 'Pyörimisliike vakiokulmanopeudella.') },
      accrot: { en: 'uniformly accelerated rotational motion', fi: 'tasaisesti muuttuva pyörimisliike', def: T('Rotation with a constant angular acceleration.', 'Pyörimisliike vakiokulmakiihtyvyydellä.') },
      angle: { en: 'angle', fi: 'kulma', sym: 'φ = s/r', def: T('Arc length divided by the radius; unit rad. The positive direction of rotation is counterclockwise.', 'Kaaren pituus jaettuna säteellä; yksikkö rad. Positiivinen kiertosuunta on vastapäivään.') },
      radian: { en: 'radian', fi: 'radiaani', sym: 'rad', def: T('The unit of angle: an arc as long as the radius; one revolution is 2π rad.', 'Kulman yksikkö: säteen pituinen kaari; yksi kierros on 2π rad.') },
      circumference: { en: 'circumferential speed', fi: 'kehänopeus, ratanopeus', sym: 'v = ω r', def: T('The linear speed of a point on a rotating body, tangent to its circle.', 'Pyörivän kappaleen pisteen lineaarinen nopeus, ympyrän tangentin suuntainen.') },
      angvel: { en: 'angular velocity', fi: 'kulmanopeus', sym: 'ω = Δφ/Δt', def: T('The rate of change of the angle; unit rad/s = 1/s.', 'Kulman muutosnopeus; yksikkö rad/s = 1/s.') },
      rotfreq: { en: 'rotational frequency', fi: 'pyörimisnopeus, kierrosluku', sym: 'n = ω/(2π)', def: T('Revolutions per unit time; unit 1/s = r/s. The rpm (r/min) is in common use but not an SI unit.', 'Kierrokset aikayksikössä; yksikkö 1/s = r/s. Yksikkö r/min on yleisessä käytössä, mutta ei ole SI-yksikkö.') },
      period: { en: 'period', fi: 'jaksonaika, pyörähdysaika', sym: 'T = 1/n', def: T('The time of one full revolution.', 'Yhden täyden kierroksen kestoaika.') },
      revolution: { en: 'revolution', fi: 'kierros, pyörähdys', def: T('One full turn, 2π rad.', 'Yksi täysi kierros, 2π rad.') },
      angacc: { en: 'angular acceleration', fi: 'kulmakiihtyvyys', sym: 'α = Δω/Δt', def: T('The rate of change of the angular velocity; unit rad/s².', 'Kulmanopeuden muutosnopeus; yksikkö rad/s².') },
      instacc: { en: 'instantaneous angular acceleration', fi: 'hetkellinen kulmakiihtyvyys', sym: 'α = dω/dt', def: T('The derivative of the angular velocity; the slope of the ω(t) graph.', 'Kulmanopeuden derivaatta; ω(t)-kuvaajan tangentin kulmakerroin.') },
      tangacc: { en: 'tangential acceleration', fi: 'tangentiaalikiihtyvyys, ratakiihtyvyys', sym: 'a = α r', def: T('The acceleration of a point along its circle.', 'Pisteen kiihtyvyys ympyrärataa pitkin.') },
      centacc: { en: 'centripetal acceleration', fi: 'keskeiskiihtyvyys', sym: 'a_n = ω² r', def: T('The acceleration of a point towards the axis; it changes the direction of the velocity.', 'Pisteen kiihtyvyys kohti akselia; se muuttaa nopeuden suuntaa.') },
      totacc: { en: 'total acceleration', fi: 'kokonaiskiihtyvyys', sym: 'a = √(a_t² + a_n²)', def: T('The vector sum of the tangential and the centripetal acceleration.', 'Tangentiaali- ja keskeiskiihtyvyyden vektorisumma.') },
      belt: { en: 'belt, belt pulley', fi: 'hihna, remmipyörä', def: T('A belt connects two wheels; without slipping the belt and both rims have the same speed.', 'Hihna yhdistää kaksi pyörää; luistamatta hihnalla ja molempien pyörien kehällä on sama nopeus.') },
      flywheel: { en: 'flywheel', fi: 'vauhtipyörä', def: T('A heavy wheel on an axle; a large J stores rotational energy.', 'Raskas akselilla oleva pyörä; suuri J varastoi pyörimisenergiaa.') },
      discwheel: { en: 'disc wheel', fi: 'levypyörä', def: T('A solid circular plate wheel, J = ½ m r².', 'Umpinainen pyöreä levy, J = ½ m r².') },
      grinding: { en: 'grinding wheel', fi: 'hiomalaikka', def: T('A fast-spinning wheel whose rim speed is the cutting speed.', 'Nopeasti pyörivä laikka, jonka kehänopeus on leikkausnopeus.') },
      inertia: { en: 'moment of inertia', fi: 'hitausmomentti', sym: 'J = Σ m r²', def: T('How hard it is to change the rotation of a body; mass times the square of the distance from the axis; unit kg·m².', 'Mitta sille, kuinka vaikea kappaleen pyörimistä on muuttaa; massa kertaa etäisyyden neliö akselista; yksikkö kg·m².') },
      pointbody: { en: 'point mass', fi: 'pistemäinen kappale', def: T('A body whose size is ignored; its forces have no rotational effect.', 'Kappale, jonka kokoa ei huomioida; sen voimilla ei ole pyörimisvaikutusta.') },
      cog: { en: 'centre of mass, centre of gravity', fi: 'massakeskipiste, painopiste', def: T('The point where the weight of a body can be taken to act.', 'Piste, jossa kappaleen painon voi ajatella vaikuttavan.') },
      cylinder: { en: 'solid cylinder, disc', fi: 'sylinteri, ympyrälevy', def: T('J = ½ m r² about its own axis.', 'J = ½ m r² oman akselinsa ympäri.') },
      hollowcyl: { en: 'hollow cylinder, ring', fi: 'rengas, ontto sylinteri', def: T('J = ½ m (r² + R²); a thin ring has J = m r².', 'J = ½ m (r² + R²); ohuella renkaalla J = m r².') },
      rod: { en: 'thin rod', fi: 'ohut sauva', def: T('J = (1/12) m l² about its centre, perpendicular to the rod.', 'J = (1/12) m l² keskipisteen kautta kulkevan, sauvaa vastaan kohtisuoran akselin ympäri.') },
      plate: { en: 'rectangular block, plate', fi: 'suorakulmainen levy', def: T('J = (1/12) m (a² + b²) about the axis perpendicular to the plate through the centre.', 'J = (1/12) m (a² + b²) levyä vastaan kohtisuoran keskiakselin ympäri.') },
      shell: { en: 'hollow sphere (thin shell)', fi: 'pallonkuori', def: T('J = (2/3) m r² about a diameter.', 'J = (2/3) m r² halkaisijan ympäri.') },
      ball: { en: 'solid sphere, ball', fi: 'umpinainen pallo', def: T('J = (2/5) m r² about a diameter.', 'J = (2/5) m r² halkaisijan ympäri.') },
      innerouter: { en: 'inner radius, outer radius', fi: 'sisäsäde, ulkosäde', def: T('The two radii of a hollow cylinder.', 'Ontan sylinterin kaksi sädettä.') },
      steiner: { en: 'Steiner\'s rule (parallel axis theorem)', fi: 'Steinerin sääntö', sym: 'J_A = J_P + m r²', def: T('J about an axis parallel to one through the centre of mass at the distance r.', 'J akselin ympäri, joka on painopisteen kautta kulkevan akselin suuntainen ja etäisyydellä r siitä.') },
      rotenergy: { en: 'rotational energy', fi: 'pyörimisenergia', sym: 'E_R = ½ J ω²', def: T('The kinetic energy of a rotating body.', 'Pyörivän kappaleen liike-energia.') },
      kinetic: { en: 'kinetic energy', fi: 'liike-energia', sym: 'E_k = ½ m v²', def: T('Energy of motion.', 'Liikkeen energia.') },
      rollenergy: { en: 'rolling energy', fi: 'vierimisenergia', sym: 'E_V = ½ m v² + ½ J ω²', def: T('The kinetic energy of a rolling body: its centre of mass moves and it rotates.', 'Vierivän kappaleen liike-energia: painopiste liikkuu ja kappale pyörii.') },
      torque: { en: 'torque, moment (of a force)', fi: 'momentti, vääntömomentti', sym: 'M = F r sin θ', def: T('The turning effect of a force; unit N·m. Vector form M = r × F.', 'Voiman kiertovaikutus; yksikkö N·m. Vektorimuoto M = r × F.') },
      frictiontorque: { en: 'friction torque', fi: 'kitkamomentti', def: T('The torque of a friction force, for example of a bearing (FI deck: laakerikitkan momentti).', 'Kitkavoiman momentti, esimerkiksi laakerin kitkamomentti.') },
      acctorque: { en: 'accelerating torque', fi: 'kiihdytysmomentti', sym: 'M = J α', def: T('The total torque that gives a body its angular acceleration.', 'Kokonaismomentti, joka antaa kappaleelle kulmakiihtyvyyden.') },
      work: { en: 'work', fi: 'työ', sym: 'W = M φ', def: T('In rotation the work of a constant torque; unit J.', 'Pyörimisessä vakiomomentin tekemä työ; yksikkö J.') },
      power: { en: 'power', fi: 'teho', sym: 'P = M ω', def: T('Work per unit time; in rotation the torque times the angular velocity; unit W.', 'Työ aikayksikössä; pyörimisessä momentti kertaa kulmanopeus; yksikkö W.') },
      efficiency: { en: 'efficiency', fi: 'hyötysuhde', sym: 'η', def: T('Output divided by input (power or work); several devices in series multiply.', 'Ulostulo jaettuna sisäänmenolla (teho tai työ); peräkkäisten laitteiden hyötysuhteet kerrotaan.') },
      gear: { en: 'gear, transmission', fi: 'vaihde', def: T('Matches the rotational speed and torque of a machine to the load.', 'Sovittaa koneen pyörimisnopeuden ja momentin kuormaan.') },
      gearratio: { en: 'gear ratio', fi: 'välityssuhde', sym: 'i = n_1/n_2', def: T('The ratio of the rotational speeds of the driving and the driven shaft; equal to r_2/r_1 and Z_2/Z_1.', 'Vetävän ja vedettävän akselin pyörimisnopeuksien suhde; yhtä suuri kuin r_2/r_1 ja Z_2/Z_1.') },
      teeth: { en: 'number of teeth', fi: 'hammasluku', sym: 'Z', def: T('The number of teeth of a gear wheel.', 'Hammaspyörän hampaiden lukumäärä.') },
      angmom: { en: 'angular momentum', fi: 'liikemäärämomentti, pyörimismäärä', sym: 'L = J ω', def: T('The rotational counterpart of the momentum; unit kg·m²/s = N·m·s.', 'Liikemäärän pyörimisvastine; yksikkö kg·m²/s = N·m·s.') },
      momentum: { en: 'momentum', fi: 'liikemäärä', sym: 'p = m v', def: T('Mass times velocity.', 'Massa kertaa nopeus.') },
      momimpulse: { en: 'impulse of the moment', fi: 'momentin impulssi', sym: 'K = ∫M dt = ΔL', def: T('The time integral of the torque; it equals the change of the angular momentum; unit N·m·s.', 'Momentin aikaintegraali; yhtä suuri kuin liikemäärämomentin muutos; yksikkö N·m·s.') },
      conservL: { en: 'conservation of angular momentum', fi: 'liikemäärämomentin säilyminen', def: T('If the total torque about the axis is zero, J ω stays constant.', 'Jos akselin suhteen vaikuttava kokonaismomentti on nolla, J ω pysyy vakiona.') },
      gyro: { en: 'gyro', fi: 'hyrrä', def: T('A fast-spinning body on an axle that can turn freely in space.', 'Nopeasti pyörivä akselillinen kappale, joka voi kääntyä vapaasti.') },
      gyroforces: { en: 'gyro forces', fi: 'hyrrävoimat', def: T('The effects of a changing angular momentum on a spinning axle.', 'Muuttuvan liikemäärämomentin vaikutukset pyörivän akselin liikkeeseen.') },
      precession: { en: 'precession', fi: 'prekessio', sym: 'ω_P = m g r/(J ω)', def: T('The slow turning of the axle of a gyro in the horizontal plane because of the torque of its weight.', 'Hyrrän akselin hidas kääntyminen vaakatasossa painon momentin vaikutuksesta.') },
      nutation: { en: 'nutation', fi: 'nutaatio', def: T('The small up-and-down oscillation of the free end of a gyro axle.', 'Hyrrän akselin vapaan pään pieni ylös-alas-värähtely.') },
      axle: { en: 'axle, shaft', fi: 'akseli', def: T('The rod about which a wheel or body turns.', 'Sauva, jonka ympäri pyörä tai kappale pyörii.') },
      crossproduct: { en: 'cross product', fi: 'vektoritulo, ristitulo', def: T('M = r × F: a vector perpendicular to r and F.', 'M = r × F: vektori, joka on kohtisuorassa sekä r:ää että F:ää vastaan.') },
      analogue: { en: 'analogous quantity', fi: 'vastinsuure', def: T('The rotational counterpart of a linear quantity: m ≙ J, v ≙ ω, F ≙ M, p ≙ L.', 'Suoraviivaisen liikkeen suuretta vastaava pyörimisliikkeen suure:m ≙ J, v ≙ ω, F ≙ M, p ≙ L.') },
      tangent: { en: 'tangent, slope', fi: 'tangentti, kulmakerroin', def: T('The slope of the tangent of the n(t) graph gives the instantaneous α.', 'n(t)-kuvaajan tangentin kulmakerroin antaa hetkellisen α:n.') },
      trapezoid: { en: 'trapezoidal method', fi: 'puolisuunnikasmenetelmä', def: T('Approximating the area under a graph by trapezoids; the area under n(t) is the number of revolutions.', 'Kuvaajan alle jäävän alan approksimointi puolisuunnikkailla; n(t)-kuvaajan ala on kierrosten lukumäärä.') },
      hands: { en: 'clock hands', fi: 'kellon osoittimet', def: T('The second, minute and hour hand turn with the periods 60 s, 3600 s and 43 200 s.', 'Sekunti-, minuutti- ja tuntiosoitin pyörivät jaksonajoilla 60 s, 3600 s ja 43 200 s.') },
      smooth: { en: 'smoothly (uniformly) accelerating', fi: 'tasaisesti kiihtyvä', def: T('With a constant angular acceleration.', 'Vakiokulmakiihtyvyydellä.') }
    },
    formulas: [
      { name: T('Angle', 'Kulma'), tex: 'Δφ = {Δs}/{r}' },
      { name: T('Angular velocity', 'Kulmanopeus'), tex: 'ω = {Δφ}/{Δt} = 2π n' },
      { name: T('Speed of a point', 'Pisteen nopeus'), tex: 'v = ω r' },
      { name: T('Period', 'Jaksonaika'), tex: 'T = {1}/{n} = {2π}/{ω}' },
      { name: T('Angular acceleration', 'Kulmakiihtyvyys'), tex: 'α = {Δω}/{Δt} = {2π (n − n_0)}/{t − t_0}' },
      { name: T('Tangential acceleration', 'Tangentiaalikiihtyvyys'), tex: 'a = α r' },
      { name: T('Constant α: ω and φ', 'Vakio-α: ω ja φ'), tex: 'ω = ω_0 + α t,  φ = ω_0 t + ½ α t^2' },
      { name: T('Constant α: averages', 'Vakio-α: keskiarvot'), tex: 'ω_k = {ω_0 + ω}/{2},  n_k = {n_0 + n}/{2}' },
      { name: T('Differential definitions', 'Differentiaalimääritelmät'), tex: 'ω = {dφ}/{dt},  α = {dω}/{dt}' },
      { name: T('Centripetal and total acceleration', 'Keskeis- ja kokonaiskiihtyvyys'), tex: 'a_n = ω^2 r,  a = sqrt{a_t^2 + a_n^2}' },
      { name: T('Moment of inertia', 'Hitausmomentti'), tex: 'J = Σ m_i r_i^2' },
      { name: T('Rotational energy', 'Pyörimisenergia'), tex: 'E_R = ½ J ω^2' },
      { name: T('Steiner\'s rule', 'Steinerin sääntö'), tex: 'J_A = J_P + m r^2' },
      { name: T('Rolling energy', 'Vierimisenergia'), tex: 'E_V = ½ m v^2 + ½ J ω^2 = ½ (1 + k) m v^2' },
      { name: T('Torque', 'Vääntömomentti'), tex: 'M = F r sin θ' },
      { name: T('Newton II for rotation', 'Newtonin II laki pyörimiselle'), tex: 'ΣM = J α' },
      { name: T('Work and power in rotation', 'Työ ja teho pyörimisessä'), tex: 'W = M φ,  P = M ω' },
      { name: T('Efficiency', 'Hyötysuhde'), tex: 'η = {P_O}/{P_I},  η = η_1 η_2 η_3' },
      { name: T('Gear ratio', 'Välityssuhde'), tex: 'i = {n_1}/{n_2} = {r_2}/{r_1} = {Z_2}/{Z_1}' },
      { name: T('Gear: torque and inertia', 'Vaihde: momentti ja hitausmomentti'), tex: 'M_1 = {M_2}/{η i},  J_1 = {J_2}/{i^2}' },
      { name: T('Angular momentum', 'Liikemäärämomentti'), tex: 'L = J ω' },
      { name: T('Impulse of the moment', 'Momentin impulssi'), tex: 'K = ∫M dt = ΔL = L − L_0' },
      { name: T('Conservation of angular momentum', 'Liikemäärämomentin säilyminen'), tex: 'J ω = J_0 ω_0' },
      { name: T('Precession of a gyro', 'Hyrrän prekessio'), tex: 'ω_P = {m g r}/{J_A ω}' }
    ],
    sections: [
      // ======================================================== 6.1-6.3 angle, angular velocity, frequency (p03-p05)
      { id: 't6-angle', title: T('Angle, angular velocity and rotational frequency', 'Kulma, kulmanopeus ja pyörimis­nopeus'),
        blocks: [
          { id: 't6-an-text', type: 'text', html: T(
            '<p>We start with the rotation of a <dfn data-term="rigid">rigid body</dfn> about a <dfn data-term="axis">fixed axis</dfn>: wheels, a hard disk, the rolls of a paper machine. Rotation follows the same ideas as linear motion: rest or a constant angular velocity, a constant angular acceleration, and a changing one. The variable is now the <dfn data-term="angle">angle</dfn> <f>φ</f>. The positive direction of rotation is <b>counterclockwise</b>.</p><p>The angle is defined by the arc and the radius, <f>Δφ = Δs/r</f>, so its unit is m/m = <dfn data-term="radian">rad</dfn>. A full <dfn data-term="revolution">revolution</dfn> has the arc <f>2π r</f>, so it is <f>2π</f> rad.</p>',
            '<p>Aloitetaan <dfn data-term="rigid">jäykän kappaleen</dfn> pyörimisestä <dfn data-term="axis">kiinteän akselin</dfn> ympäri: pyörät, kiintolevy, paperikoneen telat. Pyörimisliikkeessä noudatetaan samoja periaatteita kuin suoraviivaisessa liikkeessä: lepo tai vakiokulmanopeus, vakiokulmakiihtyvyys ja muuttuva kulmakiihtyvyys. Muuttujana on nyt <dfn data-term="angle">kulma</dfn> <f>φ</f>. Positiivinen kiertosuunta on <b>vastapäivään</b>.</p><p>Kulma määritellään kaaren ja säteen avulla, <f>Δφ = Δs/r</f>, joten sen yksikkö on m/m = <dfn data-term="radian">rad</dfn>. Täydellä <dfn data-term="revolution">kierroksella</dfn> kaari on <f>2π r</f>, joten se on <f>2π</f> rad.</p>') },
          { id: 't6-an-fig', type: 'figure', svg: { en: figAngle('1 r = 2π rad'), fi: figAngle('1 kierros = 2π rad') }, caption: T('The arc Δs on a circle of radius r subtends the angle Δφ = Δs/r. The velocity v of the point is tangent to the circle.', 'Säteen r ympyrän kaari Δs vastaa kulmaa Δφ = Δs/r. Pisteen nopeus v on ympyrän tangentin suuntainen.'), alt: T('A circle with radius r, arc Δs, angle Δφ and the tangent velocity v', 'Ympyrä, jossa säde r, kaari Δs, kulma Δφ ja tangentin suuntainen nopeus v') },
          { id: 't6-an-text2', type: 'text', html: T(
            '<p>The <dfn data-term="angvel">angular velocity</dfn> is the rate of change of the angle. The <dfn data-term="rotfreq">rotational frequency</dfn> <f>n</f> counts revolutions per unit time, and the <dfn data-term="period">period</dfn> <f>T</f> is the time of one revolution. A point at the distance <f>r</f> from the axis moves with the <dfn data-term="circumference">circumferential speed</dfn> <f>v = ω r</f>, tangent to its circle.</p>',
            '<p><dfn data-term="angvel">Kulmanopeus</dfn> on kulman muutosnopeus. <dfn data-term="rotfreq">Pyörimisnopeus</dfn> <f>n</f> kertoo kierrokset aikayksikössä ja <dfn data-term="period">jaksonaika</dfn> <f>T</f> on yhden kierroksen kesto. Pisteen, joka on etäisyydellä <f>r</f> akselista, <dfn data-term="circumference">kehänopeus</dfn> on <f>v = ω r</f> ja se on ympyrän tangentin suuntainen.</p>') },
          { id: 't6-an-f1', type: 'formula', key: true, tex: 'ω = {Δφ}/{Δt} = 2π n,  T = {1}/{n} = {2π}/{ω},  v = ω r', label: T('Angular velocity, period, speed of a point', 'Kulmanopeus, jaksonaika, pisteen nopeus'),
            legend: [['ω', T('angular velocity', 'kulmanopeus'), 'rad/s = 1/s'], ['n', T('rotational frequency', 'pyörimisnopeus'), '1/s = r/s'], ['T', T('period', 'jaksonaika'), 's'], ['v', T('circumferential speed', 'kehänopeus'), 'm/s']] },
          { id: 't6-an-warn', type: 'callout', kind: 'warn', title: T('r/min is not an SI unit', 'r/min ei ole SI-yksikkö'), html: T(
            'The rpm (r/min) is in common use, but the SI unit of the rotational frequency is 1/s (r/s). Always convert before you use <f>ω = 2π n</f>: <f>1 min^{-1} = 1/60 s^{-1} = π/30 rad/s ≈ 0.1047 rad/s</f>. Radians have no dimension: in <f>v = ω r</f> the unit rad/s times m is m/s.',
            'Yksikkö r/min on yleisessä käytössä, mutta pyörimisnopeuden SI-yksikkö on 1/s (r/s). Muunna aina ennen kaavan <f>ω = 2π n</f> käyttöä: <f>1 min^{-1} = 1/60 s^{-1} = π/30 rad/s ≈ 0,1047 rad/s</f>. Radiaanilla ei ole dimensiota: kaavassa <f>v = ω r</f> yksikkö rad/s kertaa m on m/s.') },
          { id: 't6-disc-lab', type: 'interactive', widget: 'custom', title: T('The speed of a point grows with its distance from the axis', 'Pisteen nopeus kasvaa sen etäisyyden mukana akselista'),
            caption: T('The preset is the wind turbine of slide p05 (blade 12 m, 60 r/min). The disc turns and the arrows show the speed of a point on the rim and of a point at one third of the radius. Change r or n: the arrows get longer or shorter in the same proportion, so the inner point always has a third of the speed of the rim. A fast disc is drawn slower than real.',
              'Esiasetus on kalvon s. 05 tuulivoimala (lapa 12 m, 60 r/min). Kiekko pyörii ja nuolet näyttävät reunan pisteen ja kolmasosasäteen pisteen nopeuden. Muuta r:ää tai n:ää: nuolet pitenevät tai lyhenevät samassa suhteessa, joten sisäpisteen nopeus on aina kolmasosa reunan nopeudesta. Nopea kiekko piirretään todellista hitaammaksi.'),
            config: dev(DISC) },
          { id: 't6-an-ex1', type: 'example', title: T('Wind turbine, motor and engine (slide p05)', 'Tuulivoimala ja moottorit (kalvo s. 05)'),
            problem: T('A turbine blade is 12 m long and turns at 60.0 r/min. Find the speed of the tip and of the point 4.0 m from the axis. Then: a motor runs at 3000 r/min, an engine at 1500 r/min. Find the angular velocity of the motor and the time of one revolution of the engine.',
              'Tuulivoimalan lapa on 12 m pitkä ja pyörii nopeudella 60,0 r/min. Laske kärjen ja akselista 4,0 m:n päässä olevan pisteen nopeus. Lisäksi: moottori pyörii 3000 r/min ja toinen moottori 1500 r/min. Laske ensimmäisen kulmanopeus ja jälkimmäisen yhden kierroksen kesto.'),
            given: ['r = 12 m', 'n = 60.0 r/min'],
            steps: [{ tex: 'n = 60 min^{-1} = 1.0 s^{-1}' }, { tex: 'v = 2π n r = 2π · 1.0 · 12 m ≈ 75 m/s' }, { tex: 'v_1 = 2π n r_1 = 2π · 1.0 · 4.0 m ≈ 25 m/s' },
              T('The speed is directly proportional to the distance from the axis.', 'Nopeus on suoraan verrannollinen etäisyyteen akselista.'),
              { tex: 'ω = 2π n = 2π · 50 s^{-1} ≈ 314 rad/s  (3000 min^{-1} = 50 s^{-1})' }, { tex: 'T = {1}/{n} = {1}/{25 s^{-1}} = 0.040 s = 40 ms  (1500 min^{-1} = 25 s^{-1})' }],
            result: T('75 m/s and 25 m/s; ω ≈ 314 rad/s (the slide rounds to 300 rad/s); T = 40 ms', '75 m/s ja 25 m/s; ω ≈ 314 rad/s (kalvolla pyöristettynä 300 rad/s); T = 40 ms') },
          { id: 't6-an-ex2', type: 'example', title: T('Hard disk (slide p05)', 'Kiintolevy (kalvo s. 05)'),
            problem: T('A hard disk of diameter 8.57 cm turns at 7200 r/min. Find the period, the angular velocity, the speed of the rim and the angle turned in 15 s.', 'Kiintolevyn halkaisija on 8,57 cm ja se pyörii nopeudella 7200 r/min. Laske jaksonaika, kulmanopeus, reunan nopeus ja 15 s:ssa pyöritty kulma.'),
            given: ['d = 8.57 cm = 0.0857 m', 'n = 7200 r/min = 120 r/s'],
            steps: [{ tex: 'T = {1}/{n} = {1}/{120 s^{-1}} ≈ 8.3 ms' }, { tex: 'ω = 2π n = 2π · 120 ≈ 754 rad/s' }, { tex: 'v = ω r = 2π n {d}/{2} = 2π · 120 · {0.0857 m}/{2} ≈ 32 m/s' }, { tex: 'φ(15 s) = φ_0 + ω t = 0 + 754 rad/s · 15 s ≈ 11 000 rad' },
              T('(The slide data box prints 0.0875 m by mistake; its calculation uses the correct 0.0857 m.)', '(Kalvon tietolaatikossa lukee virheellisesti 0,0875 m; laskussa käytetään oikeaa arvoa 0,0857 m.)')],
            result: T('T ≈ 8.3 ms, ω ≈ 754 rad/s, v ≈ 32 m/s, φ ≈ 11 000 rad', 'T ≈ 8,3 ms, ω ≈ 754 rad/s, v ≈ 32 m/s, φ ≈ 11 000 rad') },
          Q('t6-q1'), Q('t6-q2'), Q('t6-q3'), Q('t6-q5'), Q('t6-q6'), Q('t6-q7'),
          { id: 't6-an-h1', type: 'h', text: T('Exercises 7.1 and 7.2: the flywheel and the clock', 'Tehtävät 7.1 ja 7.2: vauhtipyörä ja kello') },
          { id: 't6-an-text3', type: 'text', html: T(
            '<p>A <dfn data-term="hands">clock hand</dfn> makes one revolution in a known time, so <f>n = 1/T</f> and <f>ω = 2π/T</f> follow at once. The answers are given with two significant figures: the deck prints them in engineering notation (for example 280·10⁻⁶ r/s for the exact 277.8·10⁻⁶ r/s).</p>',
            '<p><dfn data-term="hands">Kellon osoitin</dfn> tekee yhden kierroksen tunnetussa ajassa, joten <f>n = 1/T</f> ja <f>ω = 2π/T</f> saadaan suoraan. Vastaukset annetaan kahdella merkitsevällä numerolla: kalvolla ne on kirjoitettu tekniseen muotoon (esimerkiksi 280·10⁻⁶ r/s tarkalle arvolle 277,8·10⁻⁶ r/s).</p>') },
          Q('t6-q9'), Q('t6-q11'), Q('t6-q12'),
          { id: 't6-an-h2', type: 'h', text: T('Exercise 96: two wheels and a belt', 'Tehtävä 96: kaksi pyörää ja hihna') },
          { id: 't6-an-text4', type: 'text', html: T(
            '<p>When a belt joins two wheels without slipping, the belt and the rims of both wheels move with the <b>same speed</b>: <f>ω_1 r_1 = ω_2 r_2</f>. So the larger wheel turns slower, <f>n_2 = n_1 r_1/r_2</f>, and the number of revolutions in a given time is in the same ratio. This is the idea of the gear ratio later on.</p>',
            '<p>Kun hihna yhdistää kaksi pyörää luistamatta, hihnalla ja molempien pyörien kehällä on <b>sama nopeus</b>: <f>ω_1 r_1 = ω_2 r_2</f>. Suurempi pyörä pyörii siis hitaammin, <f>n_2 = n_1 r_1/r_2</f>, ja kierrosten lukumäärä annetussa ajassa on samassa suhteessa. Tämä on myöhemmin tulevan välityssuhteen ajatus.</p>') },
          { id: 't6-belt-lab', type: 'interactive', widget: 'custom', title: T('Two wheels joined by a belt', 'Kaksi pyörää hihnalla yhdistettynä'),
            caption: T('The preset is exercise 96 (radii 25.0 cm and 32.0 cm, 1500 r/min). The belt runs with the dashed marks. Change a radius or n_1: the speed of the belt stays the same for both rims, the larger wheel turns slower, and the readouts follow. With equal wheels both turn at the same rate.',
              'Esiasetus on tehtävä 96 (säteet 25,0 cm ja 32,0 cm, 1500 r/min). Hihna kulkee katkoviivamerkkien mukana. Muuta sädettä tai n_1:tä: hihnan nopeus on molemmilla kehillä sama, suurempi pyörä pyörii hitaammin ja lukemat seuraavat. Yhtä suurilla pyörillä molemmat pyörivät yhtä nopeasti.'),
            config: dev(BELT) }
        ] },

      // ======================================================== 6.4-6.5 angular acceleration (p06-p08, ex 7.7, FI 105)
      { id: 't6-alpha', title: T('Angular acceleration', 'Kulma­kiihtyvyys'),
        blocks: [
          { id: 't6-al-text', type: 'text', html: T(
            '<p>In a variable rotational motion the angular velocity changes. The average <dfn data-term="angacc">angular acceleration</dfn> is <f>α = Δω/Δt</f>. Because the rotational frequency is what is usually measured, write <f>α = 2π (n − n_0)/(t − t_0)</f>. A point at the distance <f>r</f> from the axis then has the <dfn data-term="tangacc">tangential acceleration</dfn> <f>a = α r</f>.</p><p>With a constant <f>α</f> the formulas are the same as in linear motion with new letters (<dfn data-term="accrot">uniformly accelerated rotational motion</dfn>):</p>',
            '<p>Muuttuvassa pyörimisliikkeessä kulmanopeus muuttuu. Keskimääräinen <dfn data-term="angacc">kulmakiihtyvyys</dfn> on <f>α = Δω/Δt</f>. Koska yleensä mitataan pyörimisnopeutta, kirjoitetaan <f>α = 2π (n − n_0)/(t − t_0)</f>. Akselista etäisyydellä <f>r</f> olevan pisteen <dfn data-term="tangacc">tangentiaalikiihtyvyys</dfn> on silloin <f>a = α r</f>.</p><p>Vakiokulmakiihtyvyydellä kaavat ovat samat kuin suoraviivaisessa liikkeessä uusilla kirjaimilla (<dfn data-term="accrot">tasaisesti muuttuva pyörimisliike</dfn>):</p>') },
          { id: 't6-al-f1', type: 'formula', key: true, tex: 'ω = ω_0 + α t,  φ = ω_0 t + ½ α t^2,  ω_k = {ω_0 + ω}/{2}', label: T('Constant angular acceleration', 'Vakiokulmakiihtyvyys'),
            legend: [['α', T('angular acceleration', 'kulmakiihtyvyys'), 'rad/s²'], ['ω_0', T('initial angular velocity', 'alkukulmanopeus'), 'rad/s'], ['ω_k', T('average angular velocity', 'keskimääräinen kulmanopeus'), 'rad/s']] },
          { id: 't6-al-text2', type: 'text', html: T(
            '<p>The number of revolutions follows from the average rotational frequency: <f>N = n_k t = (n_0 + n) t/2</f>. In a dynamic situation use the differential definitions <f>ω = dφ/dt</f> and <f>α = dω/dt = d^2 φ/dt^2</f> (the <dfn data-term="instacc">instantaneous angular acceleration</dfn>): the slope of the ω(t) graph is α and the area under it is the angle.</p>',
            '<p>Kierrosten lukumäärä saadaan keskimääräisestä pyörimisnopeudesta: <f>N = n_k t = (n_0 + n) t/2</f>. Dynaamisessa tilanteessa käytetään differentiaalimääritelmiä <f>ω = dφ/dt</f> ja <f>α = dω/dt = d^2 φ/dt^2</f> (<dfn data-term="instacc">hetkellinen kulmakiihtyvyys</dfn>): ω(t)-kuvaajan tangentin kulmakerroin on α ja kuvaajan ala on kulma.</p>') },
          { id: 't6-motor-lab', type: 'interactive', widget: 'custom', title: T('A motor starts up: φ, ω and the revolutions build live', 'Moottori käynnistyy: φ, ω ja kierrokset kasvavat suoraan'),
            caption: T('The preset is the motor of slide p07 (3000 r/min in 8.5 s, smooth start). Press Start the motor: the speed n(t) rises in a straight line, the area under it is the number of revolutions N, and the N(t) curve bends upwards. Set a different final speed or start-up time: the slope of n(t), the acceleration α and the final N change.',
              'Esiasetus on kalvon s. 07 moottori (3000 r/min 8,5 s:ssa, tasainen käynnistys). Paina Käynnistä moottori: pyörimisnopeus n(t) nousee suoraa viivaa, sen alle jäävä ala on kierrosten lukumäärä N ja käyrä N(t) kaartuu ylöspäin. Valitse toinen loppunopeus tai käynnistysaika: n(t):n kulmakerroin, kiihtyvyys α ja lopullinen N muuttuvat.'),
            config: dev(MOTOR) },
          { id: 't6-al-ex1', type: 'example', title: T('Belt pulley and motor start-up (slide p07)', 'Remmipyörä ja moottorin käynnistys (kalvo s. 07)'),
            problem: T('a) A belt pulley of diameter 64 cm speeds up from rest to 1440 r/min in 8.5 s. Find the acceleration of the belt. b) A motor speeds up smoothly from rest to 3000 r/min in 8.5 s. Find α, ω after 3 s and the number of revolutions.',
              'a) Hihnapyörän halkaisija on 64 cm ja se kiihtyy levosta nopeuteen 1440 r/min 8,5 s:ssa. Laske hihnan kiihtyvyys. b) Moottori kiihtyy tasaisesti levosta nopeuteen 3000 r/min 8,5 s:ssa. Laske α, ω kolmen sekunnin kohdalla ja kierrosten lukumäärä.'),
            given: ['d = 64 cm', 'n = 1440 r/min = 24 r/s', 't = 8.5 s'],
            steps: [{ tex: 'α = {2π (n − n_0)}/{t − t_0} = {2π · 24}/{8.5 s} ≈ 18 rad/s^2' }, { tex: 'a = α r = α {d}/{2} = 17.7 · 0.32 ≈ 5.7 m/s^2' },
              { tex: 'b)  n = 3000 min^{-1} = 50 s^{-1},  α = {2π · 50}/{8.5} ≈ 37 rad/s^2' }, { tex: 'ω(3 s) = ω_0 + α t = 37.0 · 3 ≈ 111 rad/s' }, { tex: 'N = {(n_0 + n) t}/{2} = {50 · 8.5}/{2} ≈ 212' },
              T('The slide rounds b) to one significant figure (40, 100, 200); the unrounded values are 37.0 rad/s², 111 rad/s and 212.5.', 'Kalvolla b) on pyöristetty yhteen merkitsevään numeroon (40, 100, 200); pyöristämättömät arvot ovat 37,0 rad/s², 111 rad/s ja 212,5.')],
            result: T('a ≈ 5.7 m/s²; α ≈ 37 rad/s², ω(3 s) ≈ 111 rad/s, N ≈ 212', 'a ≈ 5,7 m/s²; α ≈ 37 rad/s², ω(3 s) ≈ 111 rad/s, N ≈ 212') },
          Q('t6-q14'), Q('t6-q15'), Q('t6-q16'), Q('t6-q17'),
          { id: 't6-al-h1', type: 'h', text: T('Reading α and N from an n(t) graph (slide p08)', 'α:n ja N:n lukeminen n(t)-kuvaajasta (kalvo s. 08)') },
          { id: 't6-al-text3', type: 'text', html: T(
            '<p>The measured motor speed is not a straight line, so α changes. The <dfn data-term="tangent">tangent</dfn> at one moment gives the instantaneous <f>α = dω/dt</f>; the straight line between two moments gives the average α; the <dfn data-term="trapezoid">trapezoidal method</dfn> gives the number of revolutions as the area under <f>n(t)</f>. Always read <f>n</f> in r/s before using it.</p>',
            '<p>Mitattu moottorin pyörimisnopeus ei ole suora, joten α muuttuu. <dfn data-term="tangent">Tangentti</dfn> yhdellä hetkellä antaa hetkellisen <f>α = dω/dt</f>; kahden hetken kautta kulkeva suora antaa keskimääräisen α:n; <dfn data-term="trapezoid">puolisuunnikasmenetelmä</dfn> antaa kierrosten lukumäärän n(t)-kuvaajan alana. Muunna <f>n</f> aina yksikköön r/s ennen käyttöä.</p>') },
          { id: 't6-al-fig', type: 'figure', svg: { en: figNt('tangent', 'secant'), fi: figNt('tangentti', 'sekantti') }, caption: T('The n(t) curve of slide p08 (values read from the slide): the tangent at t = 10 s through (0, 900) and (17 s, 3500), and the straight line from (0, 0) to (40 s, 2600).', 'Kalvon s. 08 käyrä n(t) (arvot luettu kalvolta): tangentti hetkellä t = 10 s pisteiden (0, 900) ja (17 s, 3500) kautta sekä suora pisteestä (0, 0) pisteeseen (40 s, 2600).'), alt: T('Motor rotational frequency against time with a tangent and a secant', 'Moottorin pyörimisnopeus ajan funktiona tangentin ja sekantin kanssa') },
          { id: 't6-al-ex2', type: 'example', title: T('Slide p08: ω and α from the graph', 'Kalvo s. 08: ω ja α kuvaajasta'),
            problem: T('From the graph: n(20 s) = 3200 r/min. The tangent at 10 s passes through (0, 900 r/min) and (17 s, 3500 r/min). Find ω(20 s) and α(10 s).', 'Kuvaajasta: n(20 s) = 3200 r/min. Tangentti hetkellä 10 s kulkee pisteiden (0, 900 r/min) ja (17 s, 3500 r/min) kautta. Laske ω(20 s) ja α(10 s).'),
            given: ['n(20 s) = 3200 r/min'],
            steps: [{ tex: 'ω(20 s) = 2π n = 2π · {3200}/{60} ≈ 335 rad/s' }, { tex: 'α(10 s) = {dω}/{dt} ≈ {2π (3500 − 900)/60}/{17 s − 0} ≈ 16.0 rad/s^2' }, T('The slide rounds these to 300 rad/s and 20 rad/s².', 'Kalvolla ne on pyöristetty arvoihin 300 rad/s ja 20 rad/s².')],
            result: T('ω(20 s) ≈ 335 rad/s, α(10 s) ≈ 16 rad/s²', 'ω(20 s) ≈ 335 rad/s, α(10 s) ≈ 16 rad/s²') },
          Q('t6-q18'),
          { id: 't6-al-h2', type: 'h', text: T('Exercise 7.7: speeding up, cruising and braking', 'Tehtävä 7.7: kiihdytys, vakionopeus ja jarrutus') },
          { id: 't6-al-text4', type: 'text', html: T(
            '<p>The wheel of exercise 7.7 moves in three stages. In the two smooth stages the average rotational frequency is half of the final one, <f>N = ½ n t</f>; in the middle stage <f>N = n t</f>. The total number of revolutions is the sum, and it fixes the time of the middle stage.</p>',
            '<p>Tehtävän 7.7 pyörä liikkuu kolmessa vaiheessa. Kummassakin tasaisessa vaiheessa keskimääräinen pyörimisnopeus on puolet loppunopeudesta, <f>N = ½ n t</f>; keskivaiheessa <f>N = n t</f>. Kierrosten kokonaismäärä on summa, ja se määrää keskivaiheen keston.</p>') },
          Q('t6-q19'),
          { id: 't6-al-h3', type: 'h', text: T('Tangential and centripetal acceleration (FI exercise 105)', 'Tangentti- ja keskeiskiihtyvyys (FI-tehtävä 105)') },
          { id: 't6-al-text5', type: 'text', html: T(
            '<p>A point on a wheel that speeds up has two accelerations. The <b>tangential</b> one, <f>a_t = α r</f>, changes the speed. The <dfn data-term="centacc">centripetal</dfn> one, <f>a_n = ω^2 r</f>, points to the axis and changes the direction. They are perpendicular, so the <dfn data-term="totacc">total acceleration</dfn> is <f>a = sqrt{a_t^2 + a_n^2}</f>. (This part comes from the Finnish deck and is new compared with the English slides.)</p>',
            '<p>Kiihtyvän pyörän pisteellä on kaksi kiihtyvyyttä. <b>Tangentiaalinen</b> kiihtyvyys <f>a_t = α r</f> muuttaa nopeuden suuruutta. <dfn data-term="centacc">Keskeiskiihtyvyys</dfn> <f>a_n = ω^2 r</f> osoittaa kohti akselia ja muuttaa suuntaa. Ne ovat kohtisuorassa toisiaan vastaan, joten <dfn data-term="totacc">kokonaiskiihtyvyys</dfn> on <f>a = sqrt{a_t^2 + a_n^2}</f>. (Tämä osa on suomenkielisestä aineistosta ja uusi englanninkielisiin kalvoihin verrattuna.)</p>') },
          Q('t6-q21')
        ] },

      // ======================================================== 6.6-6.8 moment of inertia, Steiner (p09-p11)
      { id: 't6-inertia', title: T('Moment of inertia and Steiner\'s rule', 'Hitaus­momentti ja Steinerin sääntö'),
        blocks: [
          { id: 't6-in-text', type: 'text', html: T(
            '<p>A <dfn data-term="pointbody">point mass</dfn> only moves as a whole: its forces act at the <dfn data-term="cog">centre of mass</dfn>. A rigid body is different: its forces can have different points of application, so they can give both a linear and a rotational motion.</p><p>Think of a body as N small masses <f>m_i</f> at the distances <f>r_i</f> from the axis. All turn with the same <f>ω</f>, and each has the speed <f>v_i = ω r_i</f> and the kinetic energy <f>½ m_i v_i^2</f>. Adding them gives the <dfn data-term="rotenergy">rotational energy</dfn> and the <dfn data-term="inertia">moment of inertia</dfn> <f>J</f>:</p>',
            '<p><dfn data-term="pointbody">Pistemäinen kappale</dfn> liikkuu vain kokonaisena: sen voimat vaikuttavat <dfn data-term="cog">painopisteessä</dfn>. Jäykkä kappale on toisenlainen: sen voimilla voi olla eri vaikutuspisteet, joten ne voivat aiheuttaa sekä suoraviivaisen liikkeen että pyörimisliikkeen.</p><p>Ajatellaan kappale N pienenä massana <f>m_i</f> etäisyyksillä <f>r_i</f> akselista. Kaikki pyörivät samalla <f>ω</f>:lla ja kullakin on nopeus <f>v_i = ω r_i</f> ja liike-energia <f>½ m_i v_i^2</f>. Summaamalla saadaan <dfn data-term="rotenergy">pyörimisenergia</dfn> ja <dfn data-term="inertia">hitausmomentti</dfn> <f>J</f>:</p>') },
          { id: 't6-in-f1', type: 'formula', key: true, tex: 'E_R = Σ ½ m_i v_i^2 = ½ (Σ m_i r_i^2) ω^2 = ½ J ω^2,  J = Σ m_i r_i^2', label: T('Rotational energy and moment of inertia', 'Pyörimisenergia ja hitausmomentti'),
            legend: [['J', T('moment of inertia about the axis', 'hitausmomentti akselin suhteen'), 'kg·m²'], ['E_R', T('rotational energy', 'pyörimisenergia'), 'J'], ['r_i', T('distance of the mass m_i from the axis', 'massan m_i etäisyys akselista'), 'm']] },
          { id: 't6-in-text2', type: 'text', html: T(
            '<p><f>J</f> grows with the <b>square</b> of the distance: if the distance doubles, <f>J</f> becomes four times as large. It tells how hard it is to change the rotation: the larger <f>J</f>, the more torque is needed for the same angular acceleration. The counterparts are <f>m ≙ J</f> and <f>v ≙ ω</f>, so <f>E_k = ½ m v^2</f> becomes <f>E_R = ½ J ω^2</f>.</p>',
            '<p><f>J</f> kasvaa etäisyyden <b>neliön</b> mukana: jos etäisyys kaksinkertaistuu, <f>J</f> nelinkertaistuu. Se kertoo, kuinka vaikea pyörimistä on muuttaa: mitä suurempi <f>J</f>, sitä suurempi momentti tarvitaan samaan kulmakiihtyvyyteen. Vastinsuureet ovat <f>m ≙ J</f> ja <f>v ≙ ω</f>, joten <f>E_k = ½ m v^2</f> muuttuu muotoon <f>E_R = ½ J ω^2</f>.</p>') },
          { id: 't6-in-table', type: 'table', caption: T('Moments of inertia of common bodies (slide p10)', 'Yleisten kappaleiden hitausmomentteja (kalvo s. 10)'),
            head: [T('Body and axis', 'Kappale ja akseli'), T('Moment of inertia', 'Hitausmomentti')],
            rows: [
              [T('Point mass m at the distance r from the axis', 'Pistemassa m etäisyydellä r akselista'), { tex: 'J = m r^2' }],
              [T('Solid cylinder or disc, about its own axis', 'Umpinainen sylinteri tai levy, oman akselinsa ympäri'), { tex: 'J = ½ m r^2' }],
              [T('Hollow cylinder, inner radius r, outer radius R', 'Ontto sylinteri, sisäsäde r, ulkosäde R'), { tex: 'J = ½ m (r^2 + R^2)' }],
              [T('Thin rod of length l, axis through the centre, perpendicular to the rod', 'Ohut sauva (pituus l), akseli keskipisteen kautta, sauvaa vastaan kohtisuorassa'), { tex: 'J = {1}/{12} m l^2' }],
              [T('Rectangular plate a × b, axis through the centre, perpendicular to the plate', 'Suorakulmainen levy a × b, akseli keskipisteen kautta, levyä vastaan kohtisuorassa'), { tex: 'J = {1}/{12} m (a^2 + b^2)' }],
              [T('Hollow sphere (thin shell), axis through the centre', 'Pallonkuori, akseli keskipisteen kautta'), { tex: 'J = {2}/{3} m r^2' }],
              [T('Uniform solid sphere, axis through the centre', 'Umpinainen pallo, akseli keskipisteen kautta'), { tex: 'J = {2}/{5} m r^2' }]] },
          { id: 't6-in-tip', type: 'callout', kind: 'tip', title: T('Same shape of formula: J = k m r²', 'Sama kaavan muoto: J = k m r²'), html: T(
            'For round bodies about their axis <f>J = k m r^2</f> with <f>k = 1</f> for a thin ring, <f>½</f> for a solid cylinder, <f>2/5</f> for a solid sphere. The closer the mass is to the axis, the smaller <f>k</f>. This <f>k</f> decides the winner of a rolling race (section 4).',
            'Pyöreille kappaleille oman akselinsa ympäri <f>J = k m r^2</f>, missä <f>k = 1</f> ohuelle renkaalle, <f>½</f> umpinaiselle sylinterille ja <f>2/5</f> umpinaiselle pallolle. Mitä lähempänä akselia massa on, sitä pienempi <f>k</f> on. Tämä <f>k</f> ratkaisee vierimiskilpailun voittajan (luku 4).') },
          { id: 't6-spin-lab', type: 'interactive', widget: 'rotation', title: T('The same torque on different bodies', 'Sama momentti eri kappaleille'),
            caption: T('Choose a disc, a ring, a rod or a solid sphere (same m and r) and press Run: a torque acts for t_1 and a small friction torque slows the wheel all the time. A body with a larger J gets a smaller angular acceleration α_1 = (M − M_μ)/J, so it reaches a lower speed. The graph of ω against t builds live: its slope is α and the shaded area is the angle φ.',
              'Valitse levy, rengas, sauva tai umpinainen pallo (sama m ja r) ja paina Aja: momentti vaikuttaa ajan t_1 ja pieni kitkamomentti hidastaa pyörää koko ajan. Kappale, jolla J on suurempi, saa pienemmän kulmakiihtyvyyden α_1 = (M − M_μ)/J ja pääsee pienempään nopeuteen. Kuvaaja ω ajan funktiona piirtyy suoraan: sen kulmakerroin on α ja varjostettu ala on kulma φ.'),
            config: { body: 'disc', values: { m: 10, r: 0.3, M: 5, Mf: 0.5, t1: 5 } } },
          Q('t6-q23'), Q('t6-q24'), Q('t6-q25'),
          { id: 't6-in-h', type: 'h', text: T('Steiner\'s rule: moving the axis', 'Steinerin sääntö: akselin siirtäminen') },
          { id: 't6-in-text3', type: 'text', html: T(
            '<p>If the axis is moved parallel to itself from the centre of mass P to a point A at the distance r, the moment of inertia grows by <f>m r^2</f>. This is <dfn data-term="steiner">Steiner\'s rule</dfn> (parallel axis theorem). <b>Note:</b> it only holds if the direction of the axis stays the same.</p>',
            '<p>Jos akselia siirretään itsensä suuntaisesti painopisteestä P pisteeseen A etäisyydelle r, hitausmomentti kasvaa määrällä <f>m r^2</f>. Tämä on <dfn data-term="steiner">Steinerin sääntö</dfn>. <b>Huomaa:</b> se pätee vain, jos akselin suunta säilyy samana.</p>') },
          { id: 't6-in-f2', type: 'formula', key: true, tex: 'J_A = J_P + m r^2', label: T('Steiner\'s rule', 'Steinerin sääntö'), legend: [['J_P', T('about the axis through the centre of mass', 'painopisteen kautta kulkevan akselin suhteen'), 'kg·m²'], ['r', T('distance between the parallel axes', 'yhdensuuntaisten akselien etäisyys'), 'm']] },
          { id: 't6-steiner-lab', type: 'interactive', widget: 'custom', title: T('Drag the axis and watch J_A and the swing', 'Vedä akselia ja katso J_A:ta ja pyörimistä'),
            caption: T('The preset is the disc of slide p11 (25 kg, 33 cm) with the axis at half the radius. Drag the disc sideways (or use d/r) to move the axis A away from the centre P: J_A follows the parabola J_P + m d². Press Same torque, spin it: the same torque M turns the disc about A, and a larger J_A gives a smaller angular acceleration. The marks d = r/2 and d = r are the two cases of the slide.',
              'Esiasetus on kalvon s. 11 levypyörä (25 kg, 33 cm), akseli puolen säteen päässä. Vedä kiekkoa sivusuunnassa (tai säädä d/r) siirtääksesi akselin A pois keskipisteestä P: J_A seuraa paraabelia J_P + m d². Paina Sama momentti, pyöritä: sama momentti M pyörittää kiekkoa pisteen A ympäri, ja suurempi J_A antaa pienemmän kulmakiihtyvyyden. Merkit d = r/2 ja d = r ovat kalvon kaksi tapausta.'),
            config: dev(STEINER) },
          { id: 't6-in-ex1', type: 'example', title: T('A disc wheel with the axis moved (slide p11)', 'Levypyörä akselin siirron jälkeen (kalvo s. 11)'),
            problem: T('A disc wheel of mass 25 kg and radius 33 cm. Find J about an axis a) at r/2 from the centre, b) at the rim (distance r).', 'Levypyörän massa on 25 kg ja säde 33 cm. Laske J akselin ympäri, joka on a) etäisyydellä r/2 keskipisteestä, b) reunalla (etäisyys r).'),
            given: ['m = 25 kg', 'r = 0.33 m', 'J_P = ½ m r^2'],
            steps: [{ tex: 'a)  J_A = ½ m r^2 + m (r/2)^2 = {3}/{4} m r^2 = 0.75 · 25 · 0.33^2 ≈ 2.0 kg·m^2' }, { tex: 'b)  J_B = ½ m r^2 + m r^2 = {3}/{2} m r^2 = 1.5 · 25 · 0.33^2 ≈ 4.1 kg·m^2' }],
            result: T('J_A ≈ 2.0 kg·m², J_B ≈ 4.1 kg·m²', 'J_A ≈ 2,0 kg·m², J_B ≈ 4,1 kg·m²') },
          Q('t6-q27'), Q('t6-q28'), Q('t6-q29')
        ] },

      // ======================================================== 6.9 rotational and rolling energy (p12, FI 118)
      { id: 't6-energy', title: T('Rotational energy and rolling', 'Pyörimis­energia ja vieriminen'),
        blocks: [
          { id: 't6-en-ex1', type: 'example', title: T('A rotating disc (slide p12)', 'Pyörivä kiekko (kalvo s. 12)'),
            problem: T('A disc of mass 15 kg and radius 35 cm turns at 1500 r/min. Find its rotational energy.', 'Kiekon massa on 15 kg, säde 35 cm ja se pyörii nopeudella 1500 r/min. Laske sen pyörimisenergia.'),
            given: ['m = 15 kg', 'r = 0.35 m', 'n = 1500 r/min = 25 r/s'],
            steps: [{ tex: 'J = ½ m r^2,  ω = 2π n' }, { tex: 'E_R = ½ J ω^2 = ¼ m r^2 (2π n)^2 = m r^2 π^2 n^2' }, { tex: '= 15 · 0.35^2 · π^2 · 25^2 ≈ 11 kJ' },
              T('If J changes, the rotational energy changes too.', 'Jos J muuttuu, myös pyörimisenergia muuttuu.')],
            result: T('E_R ≈ 11 kJ (11.3 kJ)', 'E_R ≈ 11 kJ (11,3 kJ)') },
          { id: 't6-en-text', type: 'text', html: T(
            '<p>A <b>rolling</b> body moves its centre of mass and rotates at the same time, so its <dfn data-term="rollenergy">rolling energy</dfn> has two parts: <f>E_V = ½ m v^2 + ½ J ω^2</f> with <f>ω = v/r</f> when it does not slip. For <f>J = k m r^2</f> this is <f>E_V = ½ (1 + k) m v^2</f>. For a solid disc <f>k = ½</f>, so <f>E_V = ¾ m v^2</f>. The same follows from Steiner\'s rule: turn about the contact point A, <f>J_A = ½ m r^2 + m r^2 = (3/2) m r^2</f>, and <f>E_V = ½ J_A ω^2 = ¾ m v^2</f>.</p>',
            '<p><b>Vierivä</b> kappale liikuttaa painopistettään ja pyörii samanaikaisesti, joten sen <dfn data-term="rollenergy">vierimisenergia</dfn> koostuu kahdesta osasta: <f>E_V = ½ m v^2 + ½ J ω^2</f>, kun <f>ω = v/r</f> eikä kappale luista. Kun <f>J = k m r^2</f>, tämä on <f>E_V = ½ (1 + k) m v^2</f>. Umpinaiselle levylle <f>k = ½</f>, joten <f>E_V = ¾ m v^2</f>. Sama saadaan Steinerin säännöllä: pyöritään kosketuspisteen A ympäri, <f>J_A = ½ m r^2 + m r^2 = (3/2) m r^2</f>, ja <f>E_V = ½ J_A ω^2 = ¾ m v^2</f>.</p>') },
          { id: 't6-en-f', type: 'formula', key: true, tex: 'E_V = ½ m v^2 + ½ J ω^2 = ½ (1 + k) m v^2', label: T('Rolling energy (no slipping, J = k m r²)', 'Vierimisenergia (ei luistoa, J = k m r²)'),
            legend: [['k', T('J/(m r²): ring 1, disc ½, solid sphere 2/5', 'J/(m r²): rengas 1, levy ½, umpinainen pallo 2/5'), ''], ['v', T('speed of the centre of mass', 'painopisteen nopeus'), 'm/s']] },
          { id: 't6-roll-lab', type: 'interactive', widget: 'rotation', title: T('A race down the ramp: which body wins?', 'Kilpailu rinnettä alas: kumpi voittaa?'),
            caption: T('A sliding block (no friction), a solid sphere, a solid cylinder and a ring start together from the same height. Press Run. Energy conservation gives v = √(2 g h/(1 + k)): the block is fastest, then the sphere (k = 0.4), the cylinder (0.5) and the ring (1). The mass and the radius do not matter, the shape does. Change the height h or the slope α and compare.',
              'Liukuva kappale (ei kitkaa), umpinainen pallo, umpinainen sylinteri ja rengas lähtevät yhtä aikaa samalta korkeudelta. Paina Aja. Energian säilymisestä saadaan v = √(2 g h/(1 + k)): liukuva kappale on nopein, sitten pallo (k = 0,4), sylinteri (0,5) ja rengas (1). Massalla ja säteellä ei ole väliä, muodolla on. Muuta korkeutta h tai kaltevuutta α ja vertaa.'),
            config: { mode: 'roll', values: { h: 1, al: 20 } } },
          { id: 't6-en-ex2', type: 'example', title: T('A solid ball rolls down a hill (FI exercise 118)', 'Umpinainen pallo vierii mäkeä alas (FI-tehtävä 118)'),
            problem: T('A solid ball is released to roll from the top of a hill of height h. Find its speed at the bottom.', 'Umpinainen pallo päästetään vierimään mäen huipulta, jonka korkeus on h. Laske pallon nopeus mäen alla.'),
            given: ['J = ⅖ m r^2'],
            steps: [{ tex: 'm g h = ½ m v^2 + ½ J ω^2,  ω = {v}/{r}' }, { tex: 'm g h = ½ m v^2 + ½ · {2}/{5} m r^2 · {v^2}/{r^2} = 0.7\m v^2' }, { tex: 'v = sqrt{{g h}/{0.7}} = 1.195 sqrt{g h}' }, { tex: 'h = 1.0 m:  v = sqrt{9.81 · 1.0/0.7} ≈ 3.74 m/s' }],
            result: T('v = √(g h/0.7); for h = 1.0 m about 3.74 m/s', 'v = √(g h/0,7); kun h = 1,0 m, noin 3,74 m/s') },
          Q('t6-q31'), Q('t6-q33')
        ] },

      // ======================================================== 6.10-6.12 torque, work, power, efficiency, gears (p13-p15, ex 7.16, 7.20)
      { id: 't6-torque', title: T('Torque, work, power and gears', 'Momentti, työ, teho ja vaihteet'),
        blocks: [
          { id: 't6-to-text', type: 'text', html: T(
            '<p><dfn data-term="torque">Torque</dfn> (moment of a force) causes angular acceleration, as force causes linear acceleration. For a force <f>F</f> that acts at the distance <f>r</f> from the axis, at the angle <f>θ</f> to the line from the axis to its point of application, <f>M = F r sin θ</f>, and <f>r sin θ</f> is the perpendicular distance of the axis from the line of action of the force (the lever arm). In vector form <f>M = r × F</f> (<dfn data-term="crossproduct">cross product</dfn>): <f>M</f> is perpendicular to both. When a strap or a rope pulls at a wheel, simply <f>M = F r</f>.</p><p>Newton\'s second law has a rotational counterpart: the total torque about the axis gives the angular acceleration, <f>ΣM = J α</f>.</p>',
            '<p><dfn data-term="torque">Momentti</dfn> (voiman momentti) aiheuttaa kulmakiihtyvyyden samoin kuin voima aiheuttaa lineaarisen kiihtyvyyden. Kun voima <f>F</f> vaikuttaa etäisyydellä <f>r</f> akselista kulmassa <f>θ</f> akselilta vaikutuspisteeseen piirrettyyn suoraan nähden, <f>M = F r sin θ</f>, ja <f>r sin θ</f> on akselin kohtisuora etäisyys voiman vaikutussuorasta (vipuvarsi). Vektorimuodossa <f>M = r × F</f> (<dfn data-term="crossproduct">vektoritulo</dfn>): <f>M</f> on kohtisuorassa molempia vastaan. Kun hihna tai köysi vetää pyörää, riittää <f>M = F r</f>.</p><p>Newtonin II laille on pyörimisvastine: akselin suhteen vaikuttava kokonaismomentti antaa kulmakiihtyvyyden, <f>ΣM = J α</f>.</p>') },
          { id: 't6-to-f', type: 'columns', cols: [
            [{ id: 't6-to-fm', type: 'formula', key: true, tex: 'M = F r sin θ', label: T('Torque of a force', 'Voiman momentti') }],
            [{ id: 't6-to-fj', type: 'formula', key: true, tex: 'ΣM = J α', label: T('Newton II for rotation', 'Newtonin II laki pyörimiselle') }]] },
          { id: 't6-wrench-lab', type: 'interactive', widget: 'custom', title: T('The torque wrench: the lever arm decides', 'Momenttiavain: vipuvarsi ratkaisee'),
            caption: T('A force F pulls the end of a wrench of length r at the angle θ to the wrench. The dashed line is the line of action of F and the thick line is the lever arm l = r sin θ from the axis to it. Change θ: the lever arm and M change, with the largest M at 90° and no torque at 0° or 180°. Press Pull: the nut turns only if M is larger than what the nut resists, otherwise the wrench just trembles.',
              'Voima F vetää r:n pituisen avaimen päätä kulmassa θ avaimen suuntaan nähden. Katkoviiva on voiman F vaikutussuora ja paksu viiva on vipuvarsi l = r sin θ akselilta siihen. Muuta θ:aa: vipuvarsi ja M muuttuvat, suurin M on 90° kulmassa eikä momenttia ole kulmilla 0° tai 180°. Paina Vedä: mutteri pyörii vain, jos M on suurempi kuin mutterin vastus, muuten avain vain täristää.'),
            config: dev(WRENCH) },
          { id: 't6-to-ex1', type: 'example', title: T('A motor lifts a load (slide p13)', 'Moottori nostaa kuormaa (kalvo s. 13)'),
            problem: T('A motor lifts 150 kg at a constant speed. The drive wheel has the diameter 34 cm. Find the torque on the wheel.', 'Moottori nostaa 150 kg:n kuormaa vakionopeudella. Käyttöpyörän halkaisija on 34 cm. Laske pyörän momentti.'),
            given: ['m = 150 kg', 'r = 17 cm = 0.17 m'],
            steps: [T('Constant speed: no acceleration, so the rope force balances the weight.', 'Vakionopeus: ei kiihtyvyyttä, joten köyden voima tasapainottaa painon.'), { tex: 'F − m g = 0 ⇒ F = m g' }, { tex: 'M = F r = m g r = 150 · 9.81 · 0.17 ≈ 250 N·m' },
              T('The torque stays the same as long as the speed does not change.', 'Momentti pysyy samana, kunhan nopeus ei muutu.')],
            result: T('M ≈ 250 N·m (slide: 249.9 N·m with g = 9.8)', 'M ≈ 250 N·m (kalvolla 249,9 N·m, kun g = 9,8)') },
          { id: 't6-to-ex2', type: 'example', title: T('The accelerating torque (slide p13)', 'Kiihdytys­momentti (kalvo s. 13)'),
            problem: T('A motor with the moment of inertia J = 0.35 kg·m² speeds up from rest to 1500 r/min in 12 s. Find the accelerating torque.', 'Moottorin hitausmomentti on J = 0,35 kg·m² ja se kiihtyy levosta nopeuteen 1500 r/min 12 s:ssa. Laske kiihdytysmomentti.'),
            given: ['J = 0.35 kg·m²', 'n = 25 r/s', 't = 12 s'],
            steps: [{ tex: 'α = {2π (n − n_0)}/{t} = {2π · 25}/{12} = 13.1 rad/s^2' }, { tex: 'M = J α = 0.35 · 13.1 ≈ 4.6 N·m' }],
            result: T('M ≈ 4.6 N·m', 'M ≈ 4,6 N·m') },
          Q('t6-q34'), Q('t6-q35'),
          { id: 't6-to-h1', type: 'h', text: T('Exercise 7.16: the total torque on a wheel', 'Tehtävä 7.16: pyörään vaikuttava kokonaismomentti') },
          { id: 't6-accel-lab', type: 'interactive', widget: 'rotation', title: T('Torque, J and the speed after t seconds', 'Momentti, J ja nopeus t sekunnin jälkeen'),
            caption: T('A wheel with J = 0.12 kg·m² and no friction. A torque M acts for t_1 = 5 s: α = M/J, and ω = α t_1. The preset torque 2.3 N·m is the answer of exercise 7.16: check that it gives about 900 r/min. Change J or M and see how the slope of the ω,t graph reacts.',
              'Pyörän J = 0,12 kg·m² eikä kitkaa ole. Momentti M vaikuttaa ajan t_1 = 5 s: α = M/J ja ω = α t_1. Esiasetettu momentti 2,3 N·m on tehtävän 7.16 vastaus: tarkista, että se antaa noin 900 r/min. Muuta J:tä tai M:ää ja katso, miten ω,t-kuvaajan kulmakerroin reagoi.'),
            config: { body: 'J', values: { J: 0.12, M: 2.3, Mf: 0, t1: 5 } } },
          Q('t6-q37'),
          { id: 't6-to-h2', type: 'h', text: T('Exercise 7.20: a flywheel with bearing friction', 'Tehtävä 7.20: vauhtipyörä ja laakerikitka') },
          { id: 't6-to-text2', type: 'text', html: T(
            '<p>In exercise 7.20 a torque of 10 N·m acts for 5.0 s while the bearing friction acts all the time, and then the wheel coasts for 50 s. Both stages have a constant angular acceleration: <f>10 − M_μ = J ω/t_1</f> while the torque acts and <f>M_μ = J ω/t_2</f> while coasting. Adding the two equations eliminates <f>M_μ</f> and gives <f>J</f>.</p>',
            '<p>Tehtävässä 7.20 momentti 10 N·m vaikuttaa 5,0 s ja laakerikitka vaikuttaa koko ajan; sen jälkeen pyörä pyörii vapaasti 50 s. Kummassakin vaiheessa kulmakiihtyvyys on vakio: <f>10 − M_μ = J ω/t_1</f>, kun momentti vaikuttaa, ja <f>M_μ = J ω/t_2</f> vapaassa pyörimisessä. Yhtälöiden summa eliminoi <f>M_μ</f>:n ja antaa <f>J</f>:n.</p>') },
          { id: 't6-flywheel', type: 'interactive', widget: 'rotation', title: T('The flywheel of exercise 7.20', 'Tehtävän 7.20 vauhtipyörä'),
            caption: T('The preset is exercise 7.20: J = 4.5 kg·m², M = 10 N·m for 5 s, bearing friction 0.9 N·m. Press Run: the wheel speeds up (slope (M − M_μ)/J), then coasts to a stop (slope −M_μ/J); the area under the graph is the angle. Look at the revolutions and at ω at the end of the torque phase (96 r/min). Try a larger J or friction and see the graph change.',
              'Esiasetus on tehtävä 7.20: J = 4,5 kg·m², M = 10 N·m 5 s ajan, laakerikitka 0,9 N·m. Paina Aja: pyörä kiihtyy (kulmakerroin (M − M_μ)/J) ja pysähtyy sitten vapaasti pyörien (kulmakerroin −M_μ/J); kuvaajan ala on kulma. Katso kierrokset ja ω momenttivaiheen lopussa (96 r/min). Kokeile suurempaa J:tä tai kitkaa ja katso, miten kuvaaja muuttuu.'),
            config: { body: 'J', values: { J: 4.5, M: 10, Mf: 0.9, t1: 5 } } },
          Q('t6-q39'), Q('t6-q40'),
          { id: 't6-to-h3', type: 'h', text: T('Work, power, efficiency and gears', 'Työ, teho, hyötysuhde ja vaihteet') },
          { id: 't6-to-text3', type: 'text', html: T(
            '<p>A force that turns a wheel through the angle <f>dφ</f> does the work <f>dW = F ds = F r dφ = M dφ</f>. For a constant torque <f>W = M Δφ</f>, and the <dfn data-term="power">power</dfn> is <f>P = dW/dt = M ω</f>. The <dfn data-term="efficiency">efficiency</dfn> <f>η = P_O/P_I</f> (output over input) of several devices in series is the product <f>η = η_1 η_2 η_3 …</f>: one poor device makes the whole chain poor.</p><p>A <dfn data-term="gear">gear</dfn> matches the speed and the torque to the load. With the subscript 1 for the driving and 2 for the driven shaft, the <dfn data-term="gearratio">gear ratio</dfn> is <f>i = n_1/n_2 = r_2/r_1 = Z_2/Z_1</f> (<f>Z</f> = number of teeth). The power is <f>P_1 = P_2/η</f>, so <f>M_1 = M_2/(η i)</f>. The rotational energy depends on the square of the speed, so a moment of inertia is reduced to the motor shaft as <f>J_1 = J_2/i^2</f>. A gear has an efficiency of about 0.98 for one step and about 0.94 for two.</p>',
            '<p>Voima, joka kiertää pyörää kulman <f>dφ</f>, tekee työn <f>dW = F ds = F r dφ = M dφ</f>. Vakiomomentille <f>W = M Δφ</f> ja <dfn data-term="power">teho</dfn> on <f>P = dW/dt = M ω</f>. Peräkkäisten laitteiden <dfn data-term="efficiency">hyötysuhde</dfn> <f>η = P_O/P_I</f> (ulos per sisään) on tulo <f>η = η_1 η_2 η_3 …</f>: yksi huono laite tekee koko ketjusta huonon.</p><p><dfn data-term="gear">Vaihde</dfn> sovittaa pyörimisnopeuden ja momentin kuormaan. Kun alaindeksi 1 tarkoittaa vetävää ja 2 vedettävää akselia, <dfn data-term="gearratio">välityssuhde</dfn> on <f>i = n_1/n_2 = r_2/r_1 = Z_2/Z_1</f> (<f>Z</f> = hammasluku). Teho on <f>P_1 = P_2/η</f>, joten <f>M_1 = M_2/(η i)</f>. Pyörimisenergia riippuu nopeuden neliöstä, joten hitausmomentti redusoidaan moottorin akselille kaavalla <f>J_1 = J_2/i^2</f>. Vaihteen hyötysuhde on noin 0,98 yhdellä asteella ja noin 0,94 kahdella.</p>') },
          { id: 't6-to-f3', type: 'formula', key: true, tex: 'W = M φ,  P = M ω,  M_1 = {M_2}/{η i},  J_1 = {J_2}/{i^2}', label: T('Work, power and gears', 'Työ, teho ja vaihteet'),
            legend: [['W', T('work of a constant torque', 'vakiomomentin työ'), 'J'], ['P', T('power', 'teho'), 'W'], ['i', T('gear ratio n_1/n_2', 'välityssuhde n_1/n_2'), ''], ['η', T('efficiency', 'hyötysuhde'), '']] },
          { id: 't6-to-ex3', type: 'example', title: T('The hard disk: friction heat and input power (slide p14)', 'Kiintolevy: kitkalämpö ja ottoteho (kalvo s. 14)'),
            problem: T('A hard disk turns at 7200 r/min against a friction torque M_μ = 0.55 mN·m. a) How much work does the friction do in 15 min? b) What is the input power if the efficiency is 0.85?', 'Kiintolevy pyörii nopeudella 7200 r/min kitkamomenttia M_μ = 0,55 mN·m vastaan. a) Kuinka suuren työn kitka tekee 15 min:ssa? b) Mikä on ottoteho, kun hyötysuhde on 0,85?'),
            given: ['n = 120 r/s', 't = 900 s'],
            steps: [{ tex: 'W = M φ = M_μ · 2π n t = 0.55·10^{−3} · 2π · 120 · 900 ≈ 373 J ≈ 0.37 kJ' }, { tex: 'P_O = M ω = 0.55·10^{−3} · 2π · 120 ≈ 415 mW' }, { tex: 'P_I = {P_O}/{η} = {415 mW}/{0.85} ≈ 490 mW' }],
            result: T('W ≈ 0.37 kJ; P_I ≈ 490 mW', 'W ≈ 0,37 kJ; P_I ≈ 490 mW') },
          Q('t6-q42'), Q('t6-q44')
        ] },

      // ======================================================== 6.13-6.15 angular momentum, conservation, gyro (p16, p17, FI p18, ex 7.26)
      { id: 't6-momentum', title: T('Angular momentum and its conservation', 'Liikemäärä­momentti ja sen säilyminen'),
        blocks: [
          { id: 't6-am-text', type: 'text', html: T(
            '<p><dfn data-term="angmom">Angular momentum</dfn> <f>L</f> is the rotational counterpart of the <dfn data-term="momentum">momentum</dfn> <f>p</f>. For a mass <f>m</f> with the velocity <f>v</f> about an axis A, <f>L_A = r × m v</f>; for a rigid body turning about an axis <f>L = J ω</f>. The unit is kg·m²/s = N·m·s, and the vector <f>L</f> points along the axis, in the direction of <f>ω</f>.</p>',
            '<p><dfn data-term="angmom">Liikemäärämomentti</dfn> (pyörimismäärä) <f>L</f> on <dfn data-term="momentum">liikemäärän</dfn> <f>p</f> pyörimisvastine. Massalle <f>m</f>, jonka nopeus on <f>v</f>, akselin A suhteen <f>L_A = r × m v</f>; akselin ympäri pyörivälle jäykälle kappaleelle <f>L = J ω</f>. Yksikkö on kg·m²/s = N·m·s ja vektori <f>L</f> osoittaa akselin suuntaan, samaan suuntaan kuin <f>ω</f>.</p>') },
          { id: 't6-am-ex1', type: 'example', title: T('Angular momentum of a disc wheel (slide p16)', 'Levypyörän liikemäärämomentti (kalvo s. 16)'),
            problem: T('A disc wheel of mass 12 kg and radius 15 cm turns about its axis at 660 r/min. Find its angular momentum.', 'Levypyörän massa on 12 kg, säde 15 cm ja se pyörii akselinsa ympäri nopeudella 660 r/min. Laske sen liikemäärämomentti.'),
            given: ['m = 12 kg', 'r = 0.15 m', 'n = 11 r/s'],
            steps: [{ tex: 'J = ½ m r^2 = ½ · 12 · 0.15^2 = 0.135 kg·m^2' }, { tex: 'L = J ω = 0.135 · 2π · 11 ≈ 9.3 N·m·s' }],
            result: T('L ≈ 9.3 N·m·s', 'L ≈ 9,3 N·m·s') },
          { id: 't6-am-text2', type: 'text', html: T(
            '<p>From <f>ΣM = J α = d(J ω)/dt</f> follows <f>ΣM dt = dL</f>. The <dfn data-term="momimpulse">impulse of the moment</dfn> is <f>K = ∫M dt = ΔL = L − L_0</f> (unit N·m·s), as the impulse of a force is the change of the momentum. If the total torque about the axis is zero, <f>K = 0</f> and <b>the angular momentum is conserved</b> (<dfn data-term="conservL">conservation of angular momentum</dfn>):</p>',
            '<p>Yhtälöstä <f>ΣM = J α = d(J ω)/dt</f> seuraa <f>ΣM dt = dL</f>. <dfn data-term="momimpulse">Momentin impulssi</dfn> on <f>K = ∫M dt = ΔL = L − L_0</f> (yksikkö N·m·s), kuten voiman impulssi on liikemäärän muutos. Jos akselin suhteen vaikuttava kokonaismomentti on nolla, <f>K = 0</f> ja <b>liikemäärämomentti säilyy</b> (<dfn data-term="conservL">liikemäärämomentin säilyminen</dfn>):</p>') },
          { id: 't6-am-f', type: 'formula', key: true, tex: 'K = ∫M dt = ΔL,  J ω = J_0 ω_0', label: T('Impulse of the moment and conservation of angular momentum', 'Momentin impulssi ja liikemäärämomentin säilyminen'),
            legend: [['K', T('impulse of the moment', 'momentin impulssi'), 'N·m·s'], ['L = J ω', T('angular momentum', 'liikemäärämomentti'), 'kg·m²/s']] },
          { id: 't6-am-tip', type: 'callout', kind: 'info', title: T('A law of nature on every scale', 'Luonnonlaki kaikissa mittakaavoissa'), html: T(
            'The conservation of angular momentum holds from the rotation of atomic nuclei to the rotation of the Earth, the solar system and galaxies. It is used in gyro systems and control devices. Note that the angular momentum is conserved while the kinetic energy is not necessarily: a skater who pulls the arms in does work and her energy rises.',
            'Liikemäärämomentin säilyminen pätee atomiytimien pyörimisestä Maan, aurinkokunnan ja galaksien pyörimiseen. Sitä käytetään hyrräjärjestelmissä ja ohjauslaitteissa. Huomaa, että liikemäärämomentti säilyy, mutta liike-energia ei välttämättä: luistelija, joka vetää kätensä sisään, tekee työtä ja hänen energiansa kasvaa.') },
          { id: 't6-skater-lab', type: 'interactive', widget: 'custom', title: T('The skater: arms in, spin faster', 'Luistelija: kädet sisään, pyöriminen nopeutuu'),
            caption: T('A person on a frictionless stool holds a weight in each hand, seen from above. With the arms out the stool turns at n_0. Press Pull the arms in (or change r): J falls, so ω = L/J rises while L stays the same (the L bar does not move), and the rotational energy E_R grows because the person does work. The dashed marks are the arms-out values. Heavier weights make the effect larger.',
              'Kitkattomalla jakkaralla seisova henkilö pitää kummassakin kädessä painoa, katsotaan ylhäältä. Kädet ulkona jakkara pyörii nopeudella n_0. Paina Vedä kädet sisään (tai muuta r:ää): J pienenee, joten ω = L/J kasvaa, kun L pysyy samana (L-palkki ei liiku), ja pyörimisenergia E_R kasvaa, koska henkilö tekee työtä. Katkoviivat ovat käsien ulkona olevan tilanteen arvot. Painavammat painot kasvattavat vaikutusta.'),
            config: dev(SKATER) },
          Q('t6-q46'), Q('t6-q47'), Q('t6-q48'),
          { id: 't6-am-h', type: 'h', text: T('Exercise 7.26: a lump hits a rod', 'Tehtävä 7.26: möykky osuu sauvaan') },
          { id: 't6-am-text3', type: 'text', html: T(
            '<p>A rod is free to turn about its centre A and is hit at its lower end by a lump of equal mass that sticks to it. The hit is very short and the axle gives no torque about A, so the <b>angular momentum about A is conserved</b> in the collision: <f>m v L/2 = J ω</f> with <f>J = m L^2/12 + m (L/2)^2 = m L^2/3</f>. The kinetic energy is not conserved (the collision is inelastic). After the hit the <b>energy</b> is conserved: only the lump rises, because the centre of the rod stays on the axis, so <f>½ J ω^2 = m g (L/2)(1 − cos θ)</f>.</p>',
            '<p>Sauva voi pyöriä keskipisteensä A ympäri, ja sen alapäähän osuu yhtä painava möykky, joka tarttuu siihen. Isku on hyvin lyhyt eikä akseli anna momenttia pisteen A suhteen, joten <b>liikemäärämomentti pisteen A suhteen säilyy</b> törmäyksessä: <f>m v L/2 = J ω</f>, kun <f>J = m L^2/12 + m (L/2)^2 = m L^2/3</f>. Liike-energia ei säily (törmäys on kimmoton). Iskun jälkeen <b>energia</b> säilyy: vain möykky nousee, koska sauvan keskipiste pysyy akselilla, joten <f>½ J ω^2 = m g (L/2)(1 − cos θ)</f>.</p>') },
          { id: 't6-rod-lab', type: 'interactive', widget: 'custom', title: T('The rod and the lump (exercise 7.26)', 'Sauva ja möykky (tehtävä 7.26)'),
            caption: T('The preset is exercise 7.26 (rod 0.80 m, lump of the same mass at 2.0 m/s). Press Throw the lump: the lump hits and sticks, the rod starts to turn at ω and swings up to the turning angle θ_max (the dashed rod) and back. q is the ratio of the lump mass to the rod mass. A faster or heavier lump gives a larger ω and angle; a heavier rod a smaller one. Over a certain size the rod goes over the top.',
              'Esiasetus on tehtävä 7.26 (sauva 0,80 m, yhtä painava möykky nopeudella 2,0 m/s). Paina Heitä möykky: möykky osuu ja tarttuu, sauva alkaa pyöriä nopeudella ω ja heilahtaa käännekulmaan θ_max (katkoviivasauva) ja takaisin. q on möykyn ja sauvan massojen suhde. Nopeampi tai painavampi möykky antaa suuremman ω:n ja kulman; painavampi sauva pienemmän. Tietyn rajan yli sauva menee yläkohdan yli.'),
            config: dev(ROD) },
          Q('t6-q49'),
          { id: 't6-am-h2', type: 'h', text: T('Gyro forces (Finnish deck, p18)', 'Hyrrävoimat (suomenkielinen aineisto, s. 18)') },
          { id: 't6-am-text4', type: 'text', html: T(
            '<p>The axle of a spinning <dfn data-term="gyro">gyro</dfn> is supported freely at a point O. Its spin gives it the angular momentum <f>L_1 = J_A ω</f> along the axle. The weight <f>m g</f> acts at the distance <f>r</f> from O and gives the torque <f>M = m g r</f>, perpendicular to the axle. In the time <f>Δt</f> the torque changes the angular momentum by <f>ΔL = M Δt</f>, and this change is perpendicular to <f>L_1</f>: only the direction of <f>L</f> changes, not its size. The axle does not fall but turns in the horizontal plane through the angle <f>Δφ = ΔL/L_1</f>. The angular velocity of this turning is the <dfn data-term="precession">precession</dfn>:</p>',
            '<p>Pyörivän <dfn data-term="gyro">hyrrän</dfn> akseli on tuettu vapaasti pisteestä O. Pyöriminen antaa sille liikemäärämomentin <f>L_1 = J_A ω</f> akselin suunnassa. Paino <f>m g</f> vaikuttaa etäisyydellä <f>r</f> pisteestä O ja antaa momentin <f>M = m g r</f>, joka on kohtisuorassa akselia vastaan. Ajassa <f>Δt</f> momentti muuttaa liikemäärämomenttia määrällä <f>ΔL = M Δt</f>, ja muutos on kohtisuorassa vektoria <f>L_1</f> vastaan: vain <f>L</f>:n suunta muuttuu, ei sen suuruus. Akseli ei putoa vaan kääntyy vaakatasossa kulman <f>Δφ = ΔL/L_1</f>. Tämän kääntymisen kulmanopeus on <dfn data-term="precession">prekessio</dfn>:</p>') },
          { id: 't6-am-f2', type: 'formula', key: true, tex: 'ω_P = {Δφ}/{Δt} = {M}/{L_1} = {m g r}/{J_A ω}', label: T('Precession of a gyro', 'Hyrrän prekessio'),
            legend: [['ω_P', T('angular velocity of the axle in the horizontal plane', 'akselin kulmanopeus vaakatasossa'), 'rad/s'], ['J_A ω', T('spin angular momentum', 'pyörimisen liikemäärämomentti'), 'kg·m²/s'], ['m g r', T('torque of the weight', 'painon momentti'), 'N·m']] },
          { id: 't6-am-text5', type: 'text', html: T(
            '<p>The faster the spin, the slower the precession. In addition, the free end of the axle oscillates up and down a little (<dfn data-term="nutation">nutation</dfn>), which is not modelled here. (The Finnish slide writes the precession as φ_P; it is an angular velocity, so ω_P is used here.)</p>',
            '<p>Mitä nopeampi pyöriminen, sitä hitaampi prekessio. Lisäksi akselin vapaa pää värähtelee hieman ylös ja alas (<dfn data-term="nutation">nutaatio</dfn>), jota ei tässä mallinneta. (Suomenkielinen kalvo kirjoittaa prekession merkillä φ_P; se on kulmanopeus, joten tässä käytetään merkkiä ω_P.)</p>') },
          { id: 't6-gyro-lab', type: 'interactive', widget: 'custom', title: T('The gyro on its pivot: precession', 'Hyrrä tukipisteessään: prekessio'),
            caption: T('A gyro on a pivot O. Press Release: the axle turns slowly in the horizontal plane at ω_P = m g r/(J_A ω) (the plan view shows L_1 turning and the change ΔL along the torque M). Double the spin: the precession halves. A heavier gyro or a longer arm r makes it faster; a larger J_A slower. The disc turns faster when n is larger.',
              'Hyrrä tukipisteessä O. Paina Päästä: akseli kääntyy hitaasti vaakatasossa nopeudella ω_P = m g r/(J_A ω) (ylhäältä katsottuna L_1 kääntyy ja muutos ΔL on momentin M suuntainen). Kaksinkertaista pyöriminen: prekessio puolittuu. Painavampi hyrrä tai pidempi varsi r nopeuttaa sitä; suurempi J_A hidastaa. Kiekko pyörii nopeammin, kun n on suurempi.'),
            config: dev(GYRO) },
          Q('t6-q52')
        ] },

      // ======================================================== 6.16 linear vs rotational (p18)
      { id: 't6-summary', title: T('Linear and rotational motion side by side', 'Suoraviivainen liike ja pyörimisliike rinnakkain'),
        blocks: [
          { id: 't6-su-text', type: 'text', html: T(
            '<p>Linear motion and rotation are <dfn data-term="analogue">analogous</dfn>: the quantities have counterparts and the methods are the same. If you can solve a linear problem, replace the letters and solve the rotational one. The link between the two is <f>Δs = r Δφ</f>, <f>v = ω r</f> and <f>a = α r</f>.</p>',
            '<p>Suoraviivainen liike ja pyöriminen ovat <dfn data-term="analogue">analogisia</dfn>: suureilla on vastineensa ja menetelmät ovat samat. Jos osaat ratkaista suoraviivaisen tehtävän, vaihda kirjaimet ja ratkaise pyörimistehtävä. Yhteys on <f>Δs = r Δφ</f>, <f>v = ω r</f> ja <f>a = α r</f>.</p>') },
          { id: 't6-su-table', type: 'table', caption: T('Linear and rotational formulas (slide p18)', 'Suoraviivaisen liikkeen ja pyörimisen kaavat (kalvo s. 18)'),
            head: [T('Quantity', 'Suure'), T('Linear', 'Suoraviivainen'), T('Rotational', 'Pyörimisliike')],
            rows: [
              [T('position', 'paikka'), { tex: 's = v_0 t + ½ a t^2' }, { tex: 'φ = ω_0 t + ½ α t^2' }],
              [T('velocity', 'nopeus'), { tex: 'v = v_0 + a t' }, { tex: 'ω = ω_0 + α t' }],
              [T('average velocity', 'keskinopeus'), { tex: 'v_k = {v_0 + v}/{2}' }, { tex: 'ω_k = {ω_0 + ω}/{2}' }],
              [T('cause of the change', 'muutoksen aiheuttaja'), { tex: 'F = m a' }, { tex: 'M = J α' }],
              [T('momentum', 'liikemäärä'), { tex: 'p = m v' }, { tex: 'L = J ω' }],
              [T('impulse', 'impulssi'), { tex: 'I = ∫F dt' }, { tex: 'K = ∫M dt' }],
              [T('work', 'työ'), { tex: 'W = F s cos α' }, { tex: 'W = M φ' }],
              [T('power', 'teho'), { tex: 'P = F v cos α' }, { tex: 'P = M ω' }],
              [T('kinetic energy', 'liike-energia'), { tex: 'E_k = ½ m v^2' }, { tex: 'E_R = ½ J ω^2' }]] },
          Q('t6-q54'), Q('t6-q55'),
          { id: 't6-su-tip', type: 'callout', kind: 'tip', title: T('A ladder you have climbed', 'Portaikko, jonka olet kiivennyt'), html: T(
            'Radians and ω = 2π n, then v = ω r, the uniform α, moments of inertia and Steiner\'s rule, ΣM = J α, rolling energy, work and power, and finally the conservation of angular momentum. Every exercise of the deck (7.1, 7.2, 7.7, 7.16, 7.20, 7.26 and the Finnish 96, 104, 105, 118) is the top step of one of these ladders.',
            'Radiaanit ja ω = 2π n, sitten v = ω r, tasainen α, hitausmomentit ja Steinerin sääntö, ΣM = J α, vierimisenergia, työ ja teho ja lopuksi liikemäärämomentin säilyminen. Jokainen aineiston tehtävä (7.1, 7.2, 7.7, 7.16, 7.20, 7.26 sekä suomalaiset 96, 104, 105, 118) on yhden tällaisen portaikon ylin askel.') }
        ] }
    ],

    questions: [
      // ---- 6.1-6.3 angle, angular velocity, frequency
      { id: 't6-q1', mode: 'practice', type: 'mc', difficulty: 1,
        prompt: T('One full revolution corresponds to the angle', 'Yksi täysi kierros vastaa kulmaa'),
        options: [{ id: 'a', html: '1 rad' }, { id: 'b', html: 'π rad' }, { id: 'c', html: '2π rad' }, { id: 'd', html: '360 rad' }],
        hints: [T('The arc of a full circle is 2π r, and the angle is the arc divided by the radius.', 'Täyden ympyrän kaari on 2π r ja kulma on kaari jaettuna säteellä.')] },
      { id: 't6-q2', mode: 'practice', type: 'fill', difficulty: 1,
        prompt: T('Convert the unit of the rotational frequency. Give four significant digits.', 'Muunna pyörimisnopeuden yksikkö. Anna neljä merkitsevää numeroa.'),
        text: T('1 r/min = [[a]] rad/s', '1 r/min = [[a]] rad/s'),
        fields: [{ id: 'a', kind: 'num', tol: 0.002 }],
        hints: [T('1 r/min is 1/60 revolutions per second, and one revolution is 2π rad.', '1 r/min on 1/60 kierrosta sekunnissa ja yksi kierros on 2π rad.')] },
      { id: 't6-q3', mode: 'practice', type: 'numeric', difficulty: 1, tol: 0.05,
        prompt: T('A motor runs at 3000 r/min. What is its angular velocity?', 'Moottori pyörii nopeudella 3000 r/min. Kuinka suuri on sen kulmanopeus?'),
        fields: [{ id: 'w', tex: 'ω', unit: 'rad/s' }],
        hints: [T('First change r/min into r/s: divide by 60.', 'Muuta ensin r/min yksikköön r/s: jaa 60:llä.'), T('ω = 2π n.', 'ω = 2π n.')] },
      { id: 't6-q4', mode: 'graded', type: 'numeric', difficulty: 1,
        prompt: T('An engine runs at 1500 r/min. How long does one revolution take? Give the time in milliseconds.', 'Moottori pyörii nopeudella 1500 r/min. Kuinka kauan yksi kierros kestää? Anna aika millisekunteina.'),
        fields: [{ id: 'T', tex: 'T', unit: 'ms' }],
        hints: [T('The period is the inverse of the rotational frequency in r/s.', 'Jaksonaika on pyörimisnopeuden käänteisluku yksikössä r/s.')] },
      { id: 't6-q5', mode: 'practice', type: 'numeric', difficulty: 1,
        prompt: T('A wind turbine blade is 12 m long and turns at 60.0 r/min. What is the speed of the tip of the blade? (Slide p05)', 'Tuulivoimalan lapa on 12 m pitkä ja pyörii nopeudella 60,0 r/min. Kuinka suuri on lavan kärjen nopeus? (Kalvo s. 05)'),
        fields: [{ id: 'v', tex: 'v', unit: 'm/s' }],
        hints: [T('60 r/min is 1 revolution per second.', '60 r/min on yksi kierros sekunnissa.'), T('v = ω r with ω = 2π n.', 'v = ω r, missä ω = 2π n.')] },
      { id: 't6-q6', mode: 'practice', type: 'numeric', difficulty: 1,
        prompt: T('The same turbine: what is the speed of the point 4.0 m from the axis?', 'Sama tuulivoimala: kuinka suuri on akselista 4,0 m:n päässä olevan pisteen nopeus?'),
        fields: [{ id: 'v', tex: 'v_1', unit: 'm/s' }],
        hints: [T('The angular velocity is the same for every point of the blade; only r changes.', 'Kulmanopeus on lavan jokaisella pisteellä sama; vain r muuttuu.')] },
      { id: 't6-q7', mode: 'practice', type: 'mc', difficulty: 2,
        prompt: T('A point P is twice as far from the axis of a turning wheel as a point Q. Compared with Q, P has', 'Pyörivän pyörän piste P on kaksi kertaa niin kaukana akselista kuin piste Q. Q:hun verrattuna pisteellä P on'),
        options: [{ id: 'a', html: T('the same speed and twice the angular velocity', 'sama nopeus ja kaksinkertainen kulmanopeus') }, { id: 'b', html: T('twice the speed and twice the angular velocity', 'kaksinkertainen nopeus ja kaksinkertainen kulmanopeus') }, { id: 'c', html: T('twice the speed and the same angular velocity', 'kaksinkertainen nopeus ja sama kulmanopeus') }, { id: 'd', html: T('four times the speed and the same angular velocity', 'nelinkertainen nopeus ja sama kulmanopeus') }],
        hints: [T('Both points complete a revolution in the same time.', 'Molemmat pisteet tekevät kierroksen samassa ajassa.'), T('v = ω r.', 'v = ω r.')] },
      { id: 't6-q8', mode: 'graded', type: 'numeric', difficulty: 1, tol: 0.04,
        prompt: T('The flywheel has a diameter of 50.0 cm and a rotational speed of 2.0 r/s. Calculate the cycle time and the angular velocity. (Exercise 7.1)', 'Vauhtipyörän halkaisija on 50,0 cm ja pyörimisnopeus 2,0 r/s. Laske jaksonaika ja kulmanopeus. (Tehtävä 7.1)'),
        fields: [{ id: 'T', tex: 'T', unit: 's' }, { id: 'w', tex: 'ω', unit: 'rad/s' }],
        hints: [T('The diameter is not needed for these two quantities.', 'Halkaisijaa ei tarvita näihin kahteen suureeseen.'), T('T = 1/n and ω = 2π n.', 'T = 1/n ja ω = 2π n.')] },
      { id: 't6-q9', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('Calculate the angular velocity and the rotational frequency of the second hand of a clock. Give the answers with two significant figures. (Exercise 7.2)', 'Laske kellon sekuntiosoittimen kulmanopeus ja pyörimisnopeus. Anna vastaukset kahdella merkitsevällä numerolla. (Tehtävä 7.2)'),
        fields: [{ id: 'w', kind: 'sig', tex: 'ω', unit: 'rad/s' }, { id: 'n', kind: 'sig', tex: 'n', unit: 'r/s' }],
        hints: [T('The second hand makes one revolution in 60 s.', 'Sekuntiosoitin tekee yhden kierroksen 60 sekunnissa.'), T('Write small numbers in the form 1.7e-3 if you wish.', 'Pienet luvut voi kirjoittaa muodossa 1,7e-3.')] },
      { id: 't6-q10', mode: 'graded', type: 'numeric', difficulty: 2,
        prompt: T('Calculate the angular velocity and the rotational frequency of the minute hand and of the hour hand of a clock. Give the answers with two significant figures. (Exercise 7.2)', 'Laske kellon minuuttiosoittimen ja tuntiosoittimen kulmanopeus ja pyörimisnopeus. Anna vastaukset kahdella merkitsevällä numerolla. (Tehtävä 7.2)'),
        fields: [{ id: 'wm', kind: 'sig', tex: 'ω_{min}', unit: 'rad/s' }, { id: 'nm', kind: 'sig', tex: 'n_{min}', unit: 'r/s' }, { id: 'wh', kind: 'sig', tex: 'ω_{h}', unit: 'rad/s' }, { id: 'nh', kind: 'sig', tex: 'n_{h}', unit: 'r/s' }],
        hints: [T('Periods: the minute hand 3600 s, the hour hand 12 · 3600 s.', 'Jaksonajat: minuuttiosoitin 3600 s, tuntiosoitin 12 · 3600 s.'), T('n = 1/T and ω = 2π n.', 'n = 1/T ja ω = 2π n.')] },
      { id: 't6-q11', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.03,
        prompt: T('A hard disk of diameter 8.57 cm turns at 7200 r/min. Find the speed of the rim and the angle turned in 15 s. (Slide p05)', 'Kiintolevyn halkaisija on 8,57 cm ja se pyörii nopeudella 7200 r/min. Laske reunan nopeus ja 15 s:ssa pyöritty kulma. (Kalvo s. 05)'),
        fields: [{ id: 'v', tex: 'v', unit: 'm/s' }, { id: 'phi', tex: 'φ', unit: 'rad' }],
        hints: [T('n = 7200/60 = 120 r/s. The radius is half of the diameter, in metres.', 'n = 7200/60 = 120 r/s. Säde on puolet halkaisijasta metreinä.'), T('φ = ω t when ω is constant.', 'φ = ω t, kun ω on vakio.')] },
      { id: 't6-q12', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('How large is the circumferential speed of the rim of a grinding wheel when the rotational frequency of the wheel is 2950 r/min and the diameter 320 mm? (Exercise 104)', 'Kuinka suuri on hiomalaikan kehänopeus, kun laikan pyörimisnopeus on 2950 r/min ja halkaisija 320 mm? (Tehtävä 104)'),
        fields: [{ id: 'v', tex: 'v', unit: 'm/s' }],
        hints: [T('Change mm into m and r/min into r/s first.', 'Muunna ensin mm yksikköön m ja r/min yksikköön r/s.'), T('v = 2π n r with the radius, not the diameter.', 'v = 2π n r säteellä, ei halkaisijalla.')] },
      { id: 't6-q13', mode: 'graded', type: 'numeric', difficulty: 3, tol: 0.03,
        prompt: T('Two wheels with radii 25.0 cm and 32.0 cm are connected to each other with a belt. The rotational speed of the smaller wheel is 1500 r/min. Calculate for the larger wheel a) the rotational frequency and b) the angular velocity; c) the circumferential speed on the rim of the wheels; d) how many revolutions each wheel makes in 15.0 s. Assume the belt does not slip. (Exercise 96)',
          'Kaksi pyörää, joiden säteet ovat 25,0 cm ja 32,0 cm, on yhdistetty toisiinsa hihnalla. Pienemmän pyörän pyörimisnopeus on 1500 r/min. Laske suuremmalle pyörälle a) pyörimisnopeus ja b) kulmanopeus; c) pyörien kehänopeus; d) kuinka monta kierrosta kumpikin pyörä pyörähtää 15,0 s:ssa. Oleta, ettei hihna luista. (Tehtävä 96)'),
        fields: [{ id: 'n2', tex: 'n_2', unit: 'r/min' }, { id: 'w2', tex: 'ω_2', unit: 'rad/s' }, { id: 'v', tex: 'v', unit: 'm/s' }, { id: 'N1', tex: 'N_1', unit: '' }, { id: 'N2', tex: 'N_2', unit: '' }],
        hints: [T('The belt gives both rims the same speed: ω_1 r_1 = ω_2 r_2.', 'Hihna antaa molemmille kehille saman nopeuden: ω_1 r_1 = ω_2 r_2.'), T('The speed of the belt is v = 2π n_1 r_1 with the small wheel.', 'Hihnan nopeus on v = 2π n_1 r_1 pienelle pyörälle.'), T('Revolutions: N = n t with n in r/s.', 'Kierrokset: N = n t, kun n on yksikössä r/s.')] },

      // ---- 6.4-6.5 angular acceleration
      { id: 't6-q14', mode: 'practice', type: 'mc', difficulty: 1,
        prompt: T('A wheel turns with a constant angular acceleration α. Which formula gives the angle turned in the time t?', 'Pyörä pyörii vakiokulmakiihtyvyydellä α. Mikä kaava antaa ajassa t pyöritetyn kulman?'),
        options: [{ id: 'a', html: '<f>φ = ω_0 + α t</f>' }, { id: 'b', html: '<f>φ = ω_0 t + α t^2</f>' }, { id: 'c', html: '<f>φ = ω_0 t + ½ α t^2</f>' }, { id: 'd', html: '<f>φ = ½ ω t^2</f>' }],
        hints: [T('It has the same form as s = v_0 t + ½ a t².', 'Sillä on sama muoto kuin kaavalla s = v_0 t + ½ a t².')] },
      { id: 't6-q15', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.03,
        prompt: T('A belt pulley of diameter 64 cm speeds up from rest to 1440 r/min in 8.5 s. Find its angular acceleration and the acceleration of the belt. (Slide p07)', 'Hihnapyörän halkaisija on 64 cm ja se kiihtyy levosta nopeuteen 1440 r/min 8,5 s:ssa. Laske sen kulmakiihtyvyys ja hihnan kiihtyvyys. (Kalvo s. 07)'),
        fields: [{ id: 'al', tex: 'α', unit: 'rad/s²' }, { id: 'a', tex: 'a', unit: 'm/s²' }],
        hints: [T('α = 2π (n − n_0)/t with n in r/s.', 'α = 2π (n − n_0)/t, kun n on yksikössä r/s.'), T('The belt moves with the rim: a = α r with the radius.', 'Hihna liikkuu kehän mukana: a = α r säteellä.')] },
      { id: 't6-q16', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('A motor speeds up smoothly from rest to 3000 r/min in 8.5 s. Find the angular acceleration. (Slide p07; the slide rounds the answer to 40 rad/s²)', 'Moottori kiihtyy tasaisesti levosta nopeuteen 3000 r/min 8,5 s:ssa. Laske kulmakiihtyvyys. (Kalvo s. 07; kalvolla vastaus on pyöristetty arvoon 40 rad/s²)'),
        fields: [{ id: 'al', tex: 'α', unit: 'rad/s²' }],
        hints: [T('3000 r/min = 50 r/s.', '3000 r/min = 50 r/s.'), T('α = 2π n/t when it starts from rest. Try it in the motor lab.', 'α = 2π n/t, kun lähdetään levosta. Kokeile moottorilaboratoriossa.')] },
      { id: 't6-q17', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('How many revolutions does the motor of the previous question turn during the start-up?', 'Kuinka monta kierrosta edellisen kysymyksen moottori pyörähtää käynnistyksen aikana?'),
        fields: [{ id: 'N', tex: 'N', unit: '' }],
        hints: [T('The average rotational frequency is (n_0 + n)/2.', 'Keskimääräinen pyörimisnopeus on (n_0 + n)/2.'), T('N = n_k t.', 'N = n_k t.')] },
      { id: 't6-q18', mode: 'practice', type: 'numeric', difficulty: 3, tol: 0.03,
        prompt: T('From the n(t) graph of a motor: n(20 s) = 3200 r/min. The tangent at t = 10 s passes through the points (0, 900 r/min) and (17 s, 3500 r/min). Find ω at 20 s and the angular acceleration at 10 s. (Slide p08)', 'Moottorin n(t)-kuvaajasta: n(20 s) = 3200 r/min. Tangentti hetkellä t = 10 s kulkee pisteiden (0, 900 r/min) ja (17 s, 3500 r/min) kautta. Laske ω hetkellä 20 s ja kulmakiihtyvyys hetkellä 10 s. (Kalvo s. 08)'),
        fields: [{ id: 'w', tex: 'ω(20 s)', unit: 'rad/s' }, { id: 'a', tex: 'α(10 s)', unit: 'rad/s²' }],
        hints: [T('ω = 2π n with n in r/s.', 'ω = 2π n, kun n on yksikössä r/s.'), T('The instantaneous α is the slope of the tangent: Δω/Δt between the two given points.', 'Hetkellinen α on tangentin kulmakerroin: Δω/Δt annettujen pisteiden välillä.')] },
      { id: 't6-q19', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('A wheel starts from rest and reaches 200.0 r/min in 6.0 s, accelerating steadily. Later it is braked and stops smoothly in 5.0 minutes from the same speed. How many revolutions does it turn a) while speeding up, b) while braking? (Exercise 7.7, first steps)', 'Pyörä lähtee levosta ja saavuttaa nopeuden 200,0 r/min 6,0 s:ssa tasaisesti kiihtyen. Myöhemmin se jarrutetaan samasta nopeudesta pysähtymään tasaisesti 5,0 minuutissa. Kuinka monta kierrosta pyörä pyörähtää a) kiihtyessään, b) jarruttaessaan? (Tehtävä 7.7, ensimmäiset vaiheet)'),
        fields: [{ id: 'N1', tex: 'N_a', unit: '' }, { id: 'N3', tex: 'N_b', unit: '' }],
        hints: [T('n = 200/60 r/s. In a smooth start or stop the average frequency is n/2.', 'n = 200/60 r/s. Tasaisessa kiihdytyksessä tai jarrutuksessa keskimääräinen pyörimisnopeus on n/2.')] },
      { id: 't6-q20', mode: 'graded', type: 'numeric', difficulty: 3, tol: 0.02,
        prompt: T('The wheel, which rotates around its axis, starts spinning from rest and reaches a rotational speed of 200.0 r/min in 6.0 seconds, accelerating steadily. It spins for some time at this speed, after which the wheel is braked and it stops smoothly, decelerating in 5.0 minutes. How long did the rotational motion take when the wheel rotated 3100 revolutions during that time? Give the time in minutes. (Exercise 7.7)',
          'Akselinsa ympäri pyörivä pyörä lähtee levosta ja saavuttaa pyörimisnopeuden 200,0 r/min 6,0 sekunnissa tasaisesti kiihtyen. Se pyörii tämän nopeuden jonkin aikaa, minkä jälkeen pyörä jarrutetaan ja se pysähtyy tasaisesti hidastuen 5,0 minuutissa. Kuinka kauan pyörimisliike kesti, kun pyörä pyörähti tänä aikana 3100 kierrosta? Anna aika minuutteina. (Tehtävä 7.7)'),
        fields: [{ id: 't', tex: 't', unit: 'min' }],
        hints: [T('Revolutions in the two smooth stages: N = ½ n t each. The rest of the 3100 revolutions comes at the full speed.', 'Kierrokset kahdessa tasaisessa vaiheessa: N = ½ n t kummassakin. Loput 3100 kierroksesta tulee täydellä nopeudella.'), T('Time at full speed = N_2/n. Then add the three times.', 'Aika täydellä nopeudella = N_2/n. Laske sitten kolme aikaa yhteen.')] },
      { id: 't6-q21', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('A wheel of radius 20 cm starts to rotate from rest with the angular acceleration 60 1/s². After 0.15 s, find for a point on the rim a) the tangential acceleration and b) the centripetal acceleration. (Exercise 105, first steps)', 'Säteeltään 20 cm:n pyörä alkaa pyöriä levosta kulmakiihtyvyydellä 60 1/s². Laske vanteen pisteen a) tangentiaalikiihtyvyys ja b) keskeiskiihtyvyys 0,15 s:n kuluttua. (Tehtävä 105, ensimmäiset vaiheet)'),
        fields: [{ id: 'at', tex: 'a_t', unit: 'm/s²' }, { id: 'an', tex: 'a_n', unit: 'm/s²' }],
        hints: [T('a_t = α r. For the centripetal acceleration you need ω after 0.15 s: ω = α t.', 'a_t = α r. Keskeiskiihtyvyyteen tarvitaan ω ajan 0,15 s jälkeen: ω = α t.'), T('a_n = ω² r.', 'a_n = ω² r.')] },
      { id: 't6-q22', mode: 'graded', type: 'numeric', difficulty: 3,
        prompt: T('A wheel of radius 20 cm starts to rotate from rest with the angular acceleration 60 1/s². Calculate the absolute value of the total acceleration of a point on the rim after 0.15 s. (Exercise 105)', 'Säteeltään 20 cm:n pyörä alkaa pyöriä levosta kulmakiihtyvyydellä 60 1/s². Laske vanteen pisteen kokonaiskiihtyvyyden itseisarvo 0,15 s:n kuluttua. (Tehtävä 105)'),
        fields: [{ id: 'a', tex: 'a', unit: 'm/s²' }],
        hints: [T('There are two perpendicular accelerations: along the circle and towards the axis.', 'Kiihtyvyyksiä on kaksi, ja ne ovat kohtisuorassa: ympyrärataa pitkin ja kohti akselia.'), T('Combine them as the sides of a right triangle.', 'Yhdistä ne suorakulmaisen kolmion sivuina.')] },

      // ---- 6.6-6.8 moment of inertia, Steiner
      { id: 't6-q23', mode: 'practice', type: 'mc', difficulty: 1,
        prompt: T('The distance of a point mass from the axis doubles. Its moment of inertia becomes', 'Pistemäisen kappaleen etäisyys akselista kaksinkertaistuu. Sen hitausmomentti tulee'),
        options: [{ id: 'a', html: T('twice as large', 'kaksinkertaiseksi') }, { id: 'b', html: T('half as large', 'puoleen') }, { id: 'c', html: T('four times as large', 'nelinkertaiseksi') }, { id: 'd', html: T('unchanged', 'ennalleen') }],
        hints: [T('J = m r².', 'J = m r².')] },
      { id: 't6-q24', mode: 'practice', type: 'match', difficulty: 2,
        prompt: T('Match each body (with its axis) with its moment of inertia.', 'Yhdistä kukin kappale (ja akseli) hitausmomenttiinsa.'),
        left: [{ id: 'pt', html: T('point mass m at the distance r', 'pistemassa m etäisyydellä r') }, { id: 'cy', html: T('solid cylinder, about its own axis', 'umpinainen sylinteri, oman akselinsa ympäri') }, { id: 'ro', html: T('thin rod of length l, axis through the centre, perpendicular to the rod', 'ohut sauva (pituus l), akseli keskipisteen kautta, sauvaa vastaan kohtisuorassa') }, { id: 'sp', html: T('solid sphere, about a diameter', 'umpinainen pallo, halkaisijan ympäri') }, { id: 'sh', html: T('thin spherical shell, about a diameter', 'ohut pallonkuori, halkaisijan ympäri') }],
        right: [{ id: 'r1', html: '<f>{2}/{5} m r^2</f>' }, { id: 'r2', html: '<f>{1}/{12} m l^2</f>' }, { id: 'r3', html: '<f>m r^2</f>' }, { id: 'r4', html: '<f>{2}/{3} m r^2</f>' }, { id: 'r5', html: '<f>½ m r^2</f>' }],
        hints: [T('The more of the mass is far from the axis, the larger the factor.', 'Mitä enemmän massaa on kaukana akselista, sitä suurempi kerroin on.'), T('A solid sphere has less mass far out than a thin shell.', 'Umpinaisessa pallossa on vähemmän massaa kaukana kuin ohuessa kuoressa.')] },
      { id: 't6-q25', mode: 'practice', type: 'numeric', difficulty: 1, tol: 0.02,
        prompt: T('A uniform solid sphere has the mass 2.0 kg and the radius 0.10 m. What is its moment of inertia about a diameter?', 'Umpinaisen pallon massa on 2,0 kg ja säde 0,10 m. Kuinka suuri on sen hitausmomentti halkaisijan ympäri?'),
        fields: [{ id: 'J', tex: 'J', unit: 'kg·m²' }],
        hints: [T('J = (2/5) m r² for a solid sphere.', 'J = (2/5) m r² umpinaiselle pallolle.')] },
      { id: 't6-q26', mode: 'graded', type: 'numeric', difficulty: 2, tol: 0.03,
        prompt: T('A disc wheel has the mass 25 kg and the radius 33 cm. Find its moment of inertia about an axis parallel to the axle of the wheel a) at the distance r/2 from the centre (axis A) and b) at the distance r from the centre, on the rim (axis B). (Slide p11)', 'Levypyörän massa on 25 kg ja säde 33 cm. Laske sen hitausmomentti pyörän akselin suuntaisen akselin ympäri a) etäisyydellä r/2 keskipisteestä (akseli A) ja b) etäisyydellä r keskipisteestä eli reunalla (akseli B). (Kalvo s. 11)'),
        fields: [{ id: 'JA', tex: 'J_A', unit: 'kg·m²' }, { id: 'JB', tex: 'J_B', unit: 'kg·m²' }],
        hints: [T('First J about the centre: J_P = ½ m r².', 'Laske ensin J keskipisteen suhteen: J_P = ½ m r².'), T('Then add m d² for the distance d between the axes (Steiner).', 'Lisää sitten m d², kun akselien etäisyys on d (Steiner).')] },
      { id: 't6-q27', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.02,
        prompt: T('A thin rod has the mass 0.60 kg and the length 1.0 m. Find its moment of inertia about an axis through one end of the rod, perpendicular to the rod.', 'Ohuen sauvan massa on 0,60 kg ja pituus 1,0 m. Laske sen hitausmomentti sauvaa vastaan kohtisuoran, toisen pään kautta kulkevan akselin ympäri.'),
        fields: [{ id: 'J', tex: 'J', unit: 'kg·m²' }],
        hints: [T('J about the centre is (1/12) m l². The end is l/2 away from the centre.', 'J keskipisteen suhteen on (1/12) m l². Pää on etäisyydellä l/2 keskipisteestä.')] },
      { id: 't6-q28', mode: 'practice', type: 'multi', difficulty: 2,
        prompt: T('On which of these does the moment of inertia of a body depend? Select all.', 'Mistä näistä kappaleen hitausmomentti riippuu? Valitse kaikki.'),
        options: [{ id: 'a', html: T('the mass of the body', 'kappaleen massa') }, { id: 'b', html: T('how the mass is distributed (the shape)', 'massan jakautuminen (muoto)') }, { id: 'c', html: T('the position of the axis', 'akselin paikka') }, { id: 'd', html: T('the angular velocity ω', 'kulmanopeus ω') }, { id: 'e', html: T('the torque that acts on the body', 'kappaleeseen vaikuttava momentti') }],
        hints: [T('J = Σ m_i r_i²: what does the sum contain?', 'J = Σ m_i r_i²: mitä summa sisältää?')] },
      { id: 't6-q29', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.04,
        prompt: T('A disc of mass 15 kg and radius 35 cm turns at 1500 r/min. What is its rotational energy? (Slide p12)', 'Kiekon massa on 15 kg, säde 35 cm ja se pyörii nopeudella 1500 r/min. Kuinka suuri on sen pyörimisenergia? (Kalvo s. 12)'),
        fields: [{ id: 'E', tex: 'E_R', unit: 'kJ' }],
        hints: [T('J = ½ m r² for a disc, and ω = 2π n with n in r/s.', 'J = ½ m r² kiekolle ja ω = 2π n, kun n on yksikössä r/s.'), T('E_R = ½ J ω². Give the answer in kJ.', 'E_R = ½ J ω². Anna vastaus yksikössä kJ.')] },

      // ---- 6.9 rolling energy
      { id: 't6-q30', mode: 'graded', type: 'mc', difficulty: 2,
        prompt: T('A ring, a solid cylinder and a solid sphere of equal mass and radius roll without slipping down the same slope from rest. Which one reaches the bottom first?', 'Rengas, umpinainen sylinteri ja umpinainen pallo, joilla on sama massa ja säde, vierivät luistamatta samaa rinnettä alas levosta. Mikä niistä on ensimmäisenä alhaalla?'),
        options: [{ id: 'a', html: T('the ring', 'rengas') }, { id: 'b', html: T('the solid cylinder', 'umpinainen sylinteri') }, { id: 'c', html: T('the solid sphere', 'umpinainen pallo') }, { id: 'd', html: T('all arrive at the same time', 'kaikki saapuvat yhtä aikaa') }],
        hints: [T('All start with the same potential energy; the less of it goes into rotation, the faster the centre moves.', 'Kaikilla on sama potentiaalienergia alussa; mitä vähemmän siitä menee pyörimiseen, sitä nopeammin painopiste liikkuu.'), T('Compare k = J/(m r²) of the three bodies.', 'Vertaa kolmen kappaleen arvoja k = J/(m r²).')] },
      { id: 't6-q31', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('A solid disc of mass 2.0 kg rolls without slipping at the speed 3.0 m/s. What is its total kinetic energy (the rolling energy)?', 'Umpinainen levy, jonka massa on 2,0 kg, vierii luistamatta nopeudella 3,0 m/s. Kuinka suuri on sen kokonaisliike-energia (vierimisenergia)?'),
        fields: [{ id: 'E', tex: 'E_V', unit: 'J' }],
        hints: [T('The energy has a translational and a rotational part.', 'Energiassa on siirtoliikkeen ja pyörimisen osa.'), T('For a solid disc E_V = ¾ m v².', 'Umpinaiselle levylle E_V = ¾ m v².')] },
      { id: 't6-q32', mode: 'graded', type: 'numeric', difficulty: 2,
        prompt: T('A solid ball is released to roll from the top of a hill of height 1.0 m. Calculate the speed of the ball at the bottom of the hill. (Exercise 118; the slide gives v = √(g h/0.7))', 'Umpinainen pallo päästetään vierimään mäen huipulta, jonka korkeus on 1,0 m. Laske pallon nopeus mäen alla. (Tehtävä 118; kalvolla v = √(g h/0,7))'),
        fields: [{ id: 'v', tex: 'v', unit: 'm/s' }],
        hints: [T('Energy: m g h = ½ m v² + ½ J ω² with ω = v/r.', 'Energia: m g h = ½ m v² + ½ J ω², kun ω = v/r.'), T('J = (2/5) m r² for a solid sphere.', 'J = (2/5) m r² umpinaiselle pallolle.')] },
      { id: 't6-q33', mode: 'practice', type: 'slider', difficulty: 2, tol: 0.015,
        prompt: T('Set the height h of the ramp so that the solid sphere reaches the bottom at the speed 4.4 m/s. The widget reads the speed of the sphere after Run.', 'Säädä rinteen korkeus h niin, että umpinainen pallo saavuttaa rinteen alapään nopeudella 4,4 m/s. Sovelma lukee pallon nopeuden Aja-painikkeen jälkeen.'),
        hints: [T('The speed does not depend on the mass, the radius or the slope angle; only on h.', 'Nopeus ei riipu massasta, säteestä eikä kaltevuuskulmasta, vaan vain korkeudesta h.'), T('v = √(2 g h/(1 + k)) with k = 0.4 for a solid sphere. Solve h, then set the slider.', 'v = √(2 g h/(1 + k)), kun k = 0,4 umpinaiselle pallolle. Ratkaise h ja säädä sitten säädin.')],
        widget: { name: 'rotation', config: { mode: 'roll', values: { h: 1, al: 20 }, fixed: ['al'] } } },

      // ---- 6.10-6.12 torque, work, power, gears
      { id: 't6-q34', mode: 'practice', type: 'numeric', difficulty: 1,
        prompt: T('A force of 20 N acts at the end of a spanner 0.50 m long. Find the torque on the nut when the force is a) perpendicular to the spanner and b) at the angle 30° to the spanner.', 'Voima 20 N vaikuttaa 0,50 m pitkän jakoavaimen päähän. Laske mutterin momentti, kun voima on a) kohtisuorassa avainta vastaan ja b) 30° kulmassa avaimeen nähden.'),
        fields: [{ id: 'a', tex: 'M_{90°}', unit: 'N·m' }, { id: 'b', tex: 'M_{30°}', unit: 'N·m' }],
        hints: [T('M = F r sin θ.', 'M = F r sin θ.'), T('sin 90° = 1 and sin 30° = 0.5.', 'sin 90° = 1 ja sin 30° = 0,5.')] },
      { id: 't6-q35', mode: 'practice', type: 'fbd', difficulty: 2,
        prompt: T('A motor lifts a load at a constant speed with a rope. Draw the free-body diagram of the load: give each force a direction (or "not acting") and set the arrow lengths so that the compared pair is right.', 'Moottori nostaa kuormaa vakionopeudella köydellä. Piirrä kuorman vapaakappalekuvio: anna jokaiselle voimalle suunta (tai "ei vaikuta") ja säädä nuolten pituudet niin, että verrattava pari on oikein.'),
        hints: [T('Only gravity and things that touch the load can act on it.', 'Kuormaan voivat vaikuttaa vain painovoima ja kuormaa koskettavat kappaleet.'), T('Constant speed means zero acceleration: what does Newton II say about the sum of the forces?', 'Vakionopeus tarkoittaa nollakiihtyvyyttä: mitä Newtonin II laki sanoo voimien summasta?')],
        widget: { name: 'fbd', config: { scene: 'hanging',
          forces: [{ id: 'G', tex: 'mg' }, { id: 'T', tex: 'T' }, { id: 'N', tex: 'N' }, { id: 'Fm', label: T('force of motion', 'liikkeen voima') }],
          compare: [['T', 'G']] } } },
      { id: 't6-q36', mode: 'graded', type: 'numeric', difficulty: 2, tol: 0.02,
        prompt: T('A motor lifts a load of 150 kg at a constant speed. The drive wheel has the diameter 34 cm. What torque does the motor need? (Slide p13)', 'Moottori nostaa 150 kg:n kuormaa vakionopeudella. Käyttöpyörän halkaisija on 34 cm. Kuinka suuri momentti moottorin tarvitsee tuottaa? (Kalvo s. 13)'),
        fields: [{ id: 'M', tex: 'M', unit: 'N·m' }],
        hints: [T('The rope force equals the weight of the load.', 'Köyden voima on yhtä suuri kuin kuorman paino.'), T('M = F r with the radius, not the diameter.', 'M = F r säteellä, ei halkaisijalla.')] },
      { id: 't6-q37', mode: 'practice', type: 'numeric', difficulty: 1,
        prompt: T('From rest, a wheel starts to rotate smoothly and reaches a rotational speed of 900.0 r/min in 5.0 s. What is its angular acceleration? (Exercise 7.16, first step)', 'Pyörä lähtee levosta tasaisesti pyörimään ja saavuttaa pyörimisnopeuden 900,0 r/min 5,0 s:ssa. Kuinka suuri on sen kulmakiihtyvyys? (Tehtävä 7.16, ensimmäinen vaihe)'),
        fields: [{ id: 'al', tex: 'α', unit: 'rad/s²' }],
        hints: [T('900 r/min = 15 r/s.', '900 r/min = 15 r/s.'), T('α = 2π n/t from rest.', 'α = 2π n/t levosta lähdettäessä.')] },
      { id: 't6-q38', mode: 'graded', type: 'numeric', difficulty: 2, tol: 0.03,
        prompt: T('From rest, the wheel starts to rotate smoothly and accelerate around its fixed axis A, reaching a rotation speed of 900.0 r/min in 5.0 s. Calculate the total torque on the wheel with respect to axis A when the moment of inertia of the wheel with respect to A is 0.12 kg·m². (Exercise 7.16)', 'Pyörä lähtee levosta tasaisesti pyörimään ja kiihtymään kiinteän akselinsa A ympäri ja saavuttaa pyörimisnopeuden 900,0 r/min 5,0 s:ssa. Laske pyörään vaikuttava kokonaismomentti akselin A suhteen, kun pyörän hitausmomentti A:n suhteen on 0,12 kg·m². (Tehtävä 7.16)'),
        fields: [{ id: 'M', tex: 'M', unit: 'N·m' }],
        hints: [T('The total torque gives the angular acceleration: ΣM = J α.', 'Kokonaismomentti antaa kulmakiihtyvyyden: ΣM = J α.')] },
      { id: 't6-q39', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('In exercise 7.20 the angular velocity grows from zero to 96 r/min in 5.0 s, and then the wheel coasts to a stop in 50 s. Find ω, the angular acceleration during the 5.0 s and the size of the angular deceleration while coasting.', 'Tehtävässä 7.20 kulmanopeus kasvaa nollasta arvoon 96 r/min 5,0 s:ssa, ja sen jälkeen pyörä pysähtyy vapaasti pyörien 50 s:ssa. Laske ω, kulmakiihtyvyys 5,0 s:n aikana ja kulmahidastuvuuden suuruus vapaan pyörimisen aikana.'),
        fields: [{ id: 'w', tex: 'ω', unit: 'rad/s' }, { id: 'a1', tex: 'α_1', unit: 'rad/s²' }, { id: 'a2', tex: '|α_2|', unit: 'rad/s²' }],
        hints: [T('ω = 2π n with n = 96/60 r/s.', 'ω = 2π n, kun n = 96/60 r/s.'), T('Both stages are uniform: α = Δω/Δt.', 'Kumpikin vaihe on tasainen: α = Δω/Δt.')] },
      { id: 't6-q40', mode: 'practice', type: 'slider', difficulty: 3, tol: 0.015,
        prompt: T('The flywheel has J = 4.5 kg·m² and the bearing friction torque is 0.9 N·m. The torque acts for 5.0 s. Set the torque M so that the angular velocity at the end of the torque phase is 10 rad/s. The widget reads ω (press Run).', 'Vauhtipyörän J = 4,5 kg·m² ja laakerikitkamomentti on 0,9 N·m. Momentti vaikuttaa 5,0 s. Säädä momentti M niin, että kulmanopeus momenttivaiheen lopussa on 10 rad/s. Sovelma lukee ω:n (paina Aja).'),
        hints: [T('During the torque phase the net torque is M − M_μ.', 'Momenttivaiheessa kokonaismomentti on M − M_μ.'), T('α_1 = (M − M_μ)/J and ω = α_1 t_1. Solve M.', 'α_1 = (M − M_μ)/J ja ω = α_1 t_1. Ratkaise M.')],
        widget: { name: 'rotation', config: { body: 'J', values: { J: 4.5, M: 5, Mf: 0.9, t1: 5 }, fixed: ['J', 'Mf', 't1'] } } },
      { id: 't6-q41', mode: 'graded', type: 'numeric', difficulty: 3, tol: 0.03,
        prompt: T('A constant torque equal to 10 N·m acts on the flywheel for 5.0 s. During this time, the rotational speed increases from zero to 96 r/min. When the torque is removed, the wheel rotates another 50.0 s before stopping. a) Calculate the moment of inertia of the wheel with respect to the axis. b) Calculate the magnitude of the moment of bearing friction. c) How many rounds did the wheel spin? (Exercise 7.20)',
          'Vauhtipyörään vaikuttaa vakiomomentti 10 N·m 5,0 s ajan. Tänä aikana pyörimisnopeus kasvaa nollasta arvoon 96 r/min. Kun momentti poistetaan, pyörä pyörii vielä 50,0 s ennen pysähtymistä. a) Laske pyörän hitausmomentti akselin suhteen. b) Laske laakerikitkan momentin suuruus. c) Kuinka monta kierrosta pyörä pyöri? (Tehtävä 7.20)'),
        fields: [{ id: 'J', tex: 'J', unit: 'kg·m²' }, { id: 'Mf', tex: 'M_μ', unit: 'N·m' }, { id: 'N', tex: 'N', unit: '' }],
        hints: [T('The bearing friction acts all the time. Write ΣM = J α for the two stages.', 'Laakerikitka vaikuttaa koko ajan. Kirjoita ΣM = J α molemmille vaiheille.'), T('Coasting: M_μ = J ω/t_2. Torque phase: 10 − M_μ = J ω/t_1. Add the equations.', 'Vapaa pyöriminen: M_μ = J ω/t_2. Momenttivaihe: 10 − M_μ = J ω/t_1. Laske yhtälöt yhteen.'), T('Both stages are uniform: φ = ½ ω (t_1 + t_2).', 'Molemmat vaiheet ovat tasaisia: φ = ½ ω (t_1 + t_2).')] },
      { id: 't6-q42', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.02,
        prompt: T('A hard disk turns at 7200 r/min against the friction torque 0.55 mN·m. Find the power lost to friction and the input power when the efficiency is 0.85. (Slide p14)', 'Kiintolevy pyörii nopeudella 7200 r/min kitkamomenttia 0,55 mN·m vastaan. Laske kitkaan kuluva teho ja ottoteho, kun hyötysuhde on 0,85. (Kalvo s. 14)'),
        fields: [{ id: 'PO', tex: 'P_O', unit: 'mW' }, { id: 'PI', tex: 'P_I', unit: 'mW' }],
        hints: [T('P = M ω with ω = 2π n and n in r/s.', 'P = M ω, kun ω = 2π n ja n on yksikössä r/s.'), T('η = P_O/P_I.', 'η = P_O/P_I.')] },
      { id: 't6-q43', mode: 'graded', type: 'numeric', difficulty: 1, tol: 0.02,
        prompt: T('Three machines in series have the efficiencies 0.90, 0.80 and 0.95. What is the efficiency of the whole chain?', 'Kolmen peräkkäisen koneen hyötysuhteet ovat 0,90, 0,80 ja 0,95. Kuinka suuri on koko ketjun hyötysuhde?'),
        fields: [{ id: 'e', tex: 'η', unit: '' }],
        hints: [T('Each machine passes on only a fraction of the power it receives.', 'Jokainen kone välittää eteenpäin vain osan saamastaan tehosta.')] },
      { id: 't6-q44', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('The driving shaft of a gear turns at 1440 r/min and the load shaft at 360 r/min. The efficiency of the gear is 0.95 and the torque of the motor is 10 N·m. Find the gear ratio and the torque on the load shaft.', 'Vaihteen vetävä akseli pyörii nopeudella 1440 r/min ja kuormaakseli nopeudella 360 r/min. Vaihteen hyötysuhde on 0,95 ja moottorin momentti 10 N·m. Laske välityssuhde ja kuormaakselin momentti.'),
        fields: [{ id: 'i', tex: 'i', unit: '' }, { id: 'M2', tex: 'M_2', unit: 'N·m' }],
        hints: [T('i = n_1/n_2.', 'i = n_1/n_2.'), T('M_1 = M_2/(η i): solve M_2.', 'M_1 = M_2/(η i): ratkaise M_2.')] },

      // ---- 6.13-6.15 angular momentum
      { id: 't6-q45', mode: 'graded', type: 'numeric', difficulty: 2, tol: 0.02,
        prompt: T('A disc wheel of mass 12 kg and radius 15 cm turns at 660 r/min about its axis. What is its angular momentum? (Slide p16)', 'Levypyörän massa on 12 kg, säde 15 cm ja se pyörii akselinsa ympäri nopeudella 660 r/min. Kuinka suuri on sen liikemäärämomentti? (Kalvo s. 16)'),
        fields: [{ id: 'L', tex: 'L', unit: 'kg·m²/s' }],
        hints: [T('L = J ω. First J of a disc, then ω = 2π n.', 'L = J ω. Laske ensin levyn J ja sitten ω = 2π n.')] },
      { id: 't6-q46', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('A skater spins at 2.0 r/s with the moment of inertia 3.0 kg·m². She pulls her arms in and the moment of inertia becomes 1.2 kg·m². Find her new rotational frequency and the ratio of the rotational energies, E_after/E_before.', 'Luistelija pyörii nopeudella 2,0 r/s ja hänen hitausmomenttinsa on 3,0 kg·m². Hän vetää kätensä sisään ja hitausmomentti muuttuu arvoon 1,2 kg·m². Laske hänen uusi pyörimisnopeutensa ja pyörimisenergioiden suhde E_jälkeen/E_ennen.'),
        fields: [{ id: 'n', tex: 'n_2', unit: 'r/s' }, { id: 'R', tex: 'E_2/E_1', unit: '' }],
        hints: [T('No external torque: J ω stays constant, and so does J n.', 'Ulkoista momenttia ei ole: J ω pysyy vakiona, samoin J n.'), T('E_R = ½ J ω², or ½ L ω because L is the same.', 'E_R = ½ J ω², tai ½ L ω, koska L on sama.')] },
      { id: 't6-q47', mode: 'practice', type: 'multi', difficulty: 2,
        prompt: T('A skater pulls her arms in while spinning on ice (no external torque about the axis). Which statements are true? Select all.', 'Luistelija vetää kätensä sisään jäällä pyöriessään (ulkoista momenttia ei ole akselin suhteen). Mitkä väitteet pitävät paikkansa? Valitse kaikki.'),
        options: [{ id: 'a', html: T('The angular momentum stays constant.', 'Liikemäärämomentti pysyy vakiona.') }, { id: 'b', html: T('The moment of inertia decreases.', 'Hitausmomentti pienenee.') }, { id: 'c', html: T('The angular velocity increases.', 'Kulmanopeus kasvaa.') }, { id: 'd', html: T('The rotational energy stays constant.', 'Pyörimisenergia pysyy vakiona.') }, { id: 'e', html: T('The rotational energy increases.', 'Pyörimisenergia kasvaa.') }],
        hints: [T('L = J ω is conserved, but E_R = ½ J ω² is not.', 'L = J ω säilyy, mutta E_R = ½ J ω² ei.'), T('Where does the extra energy come from?', 'Mistä ylimääräinen energia tulee?')] },
      { id: 't6-q48', mode: 'practice', type: 'order', difficulty: 2,
        prompt: T('Put the steps of a conservation-of-angular-momentum problem in order.', 'Järjestä liikemäärämomentin säilymistehtävän vaiheet oikeaan järjestykseen.'),
        items: [{ id: 's4', html: T('Solve the unknown angular velocity', 'Ratkaise tuntematon kulmanopeus') }, { id: 's2', html: T('Check that no external torque acts about it', 'Tarkista, ettei akselin suhteen vaikuta ulkoista momenttia') }, { id: 's5', html: T('Check the energy separately: it is not conserved in an inelastic hit', 'Tarkista energia erikseen: se ei säily kimmottomassa iskussa') }, { id: 's1', html: T('Choose the axis', 'Valitse akseli') }, { id: 's3', html: T('Write L before = L after, with all the bodies in J', 'Kirjoita L ennen = L jälkeen ja ota kaikki kappaleet mukaan J:hin') }],
        hints: [T('You must know the axis before you can talk about the torque about it.', 'Akseli on tunnettava, ennen kuin sen suhteen voi puhua momentista.')] },
      { id: 't6-q49', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('A rod of mass 0.50 kg and length 0.80 m can turn about its centre A. A lump of mass 0.50 kg moving horizontally at 2.0 m/s hits its lower end and sticks. Find a) the angular momentum of the lump about A just before the hit and b) the moment of inertia about A of the rod with the lump stuck on. (Exercise 7.26, first steps)', 'Sauvan massa on 0,50 kg ja pituus 0,80 m, ja se voi pyöriä keskipisteensä A ympäri. 0,50 kg:n möykky, joka liikkuu vaakasuoraan nopeudella 2,0 m/s, osuu sen alapäähän ja tarttuu siihen. Laske a) möykyn liikemäärämomentti pisteen A suhteen juuri ennen iskua ja b) sauvan ja siihen tarttuneen möykyn hitausmomentti pisteen A suhteen. (Tehtävä 7.26, ensimmäiset vaiheet)'),
        fields: [{ id: 'L', tex: 'L_A', unit: 'kg·m²/s' }, { id: 'J', tex: 'J', unit: 'kg·m²' }],
        hints: [T('A point mass moving perpendicular to r: L = m v r with r = L/2.', 'Pistemassa, joka liikkuu kohtisuoraan r:ää vastaan: L = m v r, kun r = L/2.'), T('J = rod about its centre + lump at the distance L/2.', 'J = sauva keskipisteensä suhteen + möykky etäisyydellä L/2.')] },
      { id: 't6-q50', mode: 'graded', type: 'numeric', difficulty: 3, tol: 0.02,
        prompt: T('A rod in the vertical position (length 0.80 m) is allowed to rotate frictionlessly about a horizontal axis A passing through its centre. The rod is at rest when its lower end is struck by an object of mass equal to the mass of the rod at a completely inelastic horizontal velocity v = 2.0 m/s. Calculate the angular velocity at the start of the rotational movement. (Exercise 7.26 a)', 'Pystyasennossa oleva sauva (pituus 0,80 m) saa pyöriä kitkatta keskipisteensä kautta kulkevan vaakasuoran akselin A ympäri. Sauva on levossa, kun sen alapäähän osuu sauvan massan suuruinen kappale täysin kimmottomasti vaakasuoralla nopeudella v = 2,0 m/s. Laske kulmanopeus pyörimisliikkeen alussa. (Tehtävä 7.26 a)'),
        fields: [{ id: 'w', tex: 'ω', unit: 'rad/s' }],
        hints: [T('In the hit the angular momentum about A is conserved.', 'Iskussa liikemäärämomentti pisteen A suhteen säilyy.'), T('L = m v L/2 = J ω with J = m L²/12 + m (L/2)². The mass m cancels.', 'L = m v L/2 = J ω, kun J = m L²/12 + m (L/2)². Massa m supistuu.')] },
      { id: 't6-q51', mode: 'graded', type: 'numeric', difficulty: 3, tol: 0.02,
        prompt: T('The rod and the lump of the previous question: what is the angle of the rod with the vertical when the rotational motion changes direction? Give the angle in degrees. (Exercise 7.26 b)', 'Edellisen kysymyksen sauva ja möykky: mikä on sauvan kulma pystysuuntaan nähden, kun pyörimisliike vaihtaa suuntaa? Anna kulma asteina. (Tehtävä 7.26 b)'),
        fields: [{ id: 'th', tex: 'θ', unit: '°' }],
        hints: [T('After the hit the energy is conserved. Only the lump rises; the centre of the rod stays on the axis.', 'Iskun jälkeen energia säilyy. Vain möykky nousee; sauvan keskipiste pysyy akselilla.'), T('½ J ω² = m g (L/2)(1 − cos θ). Use the unrounded ω.', '½ J ω² = m g (L/2)(1 − cos θ). Käytä pyöristämätöntä ω:aa.')] },
      { id: 't6-q52', mode: 'practice', type: 'mc', difficulty: 2,
        prompt: T('A spinning gyro on a pivot precesses. If the spin rotational frequency is doubled and everything else stays the same, the precession angular velocity becomes', 'Pyörivä hyrrä tukipisteessään prekessoi. Jos pyörimisnopeus kaksinkertaistetaan ja kaikki muu pysyy samana, prekession kulmanopeus muuttuu'),
        options: [{ id: 'a', html: T('twice as large', 'kaksinkertaiseksi') }, { id: 'b', html: T('half as large', 'puoleen') }, { id: 'c', html: T('a quarter as large', 'neljäsosaan') }, { id: 'd', html: T('unchanged', 'ennalleen') }],
        hints: [T('ω_P = M/L: the torque of the weight stays the same.', 'ω_P = M/L: painon momentti pysyy samana.'), T('Try it in the gyro lab.', 'Kokeile hyrrälaboratoriossa.')] },
      { id: 't6-q53', mode: 'graded', type: 'numeric', difficulty: 3,
        prompt: T('A gyro of mass 1.0 kg has its centre of mass 0.15 m from the pivot and the moment of inertia 0.0040 kg·m² about its axle. It spins at 30 r/s. Find the angular velocity of the precession.', 'Hyrrän massa on 1,0 kg, sen painopiste on 0,15 m:n päässä tukipisteestä ja hitausmomentti akselin suhteen on 0,0040 kg·m². Se pyörii nopeudella 30 r/s. Laske prekession kulmanopeus.'),
        fields: [{ id: 'wp', tex: 'ω_P', unit: 'rad/s' }],
        hints: [T('The spin angular velocity is ω = 2π n.', 'Pyörimisen kulmanopeus on ω = 2π n.'), T('ω_P = m g r/(J_A ω) with g = 9.81 m/s².', 'ω_P = m g r/(J_A ω), kun g = 9,81 m/s².')] },

      // ---- 6.16 summary
      { id: 't6-q54', mode: 'practice', type: 'match', difficulty: 1,
        prompt: T('Match each linear quantity with its rotational counterpart.', 'Yhdistä kukin suoraviivaisen liikkeen suure sen pyörimisliikkeen vastineeseen.'),
        left: [{ id: 'F', html: '<f>F</f>' }, { id: 'm', html: '<f>m</f>' }, { id: 'v', html: '<f>v</f>' }, { id: 'a', html: '<f>a</f>' }, { id: 'p', html: '<f>p</f>' }],
        right: [{ id: 'r1', html: '<f>L</f>' }, { id: 'r2', html: '<f>α</f>' }, { id: 'r3', html: '<f>M</f>' }, { id: 'r4', html: '<f>ω</f>' }, { id: 'r5', html: '<f>J</f>' }],
        hints: [T('F = m a becomes M = J α, and p = m v becomes L = J ω.', 'F = m a muuttuu muotoon M = J α ja p = m v muotoon L = J ω.')] },
      { id: 't6-q55', mode: 'practice', type: 'fill', difficulty: 1,
        prompt: T('Complete the rotational counterparts (one letter each).', 'Täydennä pyörimisliikkeen vastineet (yksi kirjain kussakin).'),
        text: T('F = m a becomes M = [[a]] α, and p = m v becomes L = [[b]] ω.', 'F = m a muuttuu muotoon M = [[a]] α ja p = m v muotoon L = [[b]] ω.'),
        fields: [{ id: 'a', kind: 'text' }, { id: 'b', kind: 'text' }],
        hints: [T('The counterpart of the mass m is the moment of inertia.', 'Massan m vastine on hitausmomentti.')] }
    ]
  });
})();

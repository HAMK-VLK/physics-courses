/* Topic 4: Work, power and energy. Source: source/extracted/topic4-work-power-energy.md (EN theory deck p03-p14, EN exercise
 * deck 4.4-4.17 and the FI-deck exercises 68-70, 78-81; errata in source/extracted/PDF-ERRATA.md applied). g = 9.81 m/s²
 * everywhere (the slides use 9.8). Efficiency subscripts: in = input, out = output (the two decks disagree on `o`).
 * NO answers in this file: they live in src/answers/topic4.json. Block ids are stable; never rename. */
(function () {
  'use strict';
  function T(en, fi) { return { en: en, fi: fi }; }
  var G0 = 9.81, D2R = Math.PI / 180;

  // ---------------------------------------------------------------- shared helpers of the device widgets (as in topic3.js)
  function dev(def, vals) { return { mount: function (h, c) { return TDC.mechViz.device(def, vals).mount(h, c); } }; }
  function nf(v, d) { return TDC.util.fmtNum(v, d || 3); }
  function fsz(w) { return Math.max(11, Math.min(14, Math.round(w / 48))); }
  function line(g, x1, y1, x2, y2) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function font(g, px, it) {
    g.font = it ? 'italic 600 ' + px + 'px ' + TDC.theme.color('--font-math') : '600 ' + px + 'px ' + getComputedStyle(document.body).fontFamily;
  }
  function lab() { return TDC.mechViz.lab.apply(null, arguments); }   // canvas label in SI typography (viz/mech-common.js)
  function farrow(g, TV, x, y, ux, uy, L, col, sym, val, bg, px) {
    if (L < 2) return;
    TV.arrow(g, x, y, x + ux * L, y + uy * L, col, 3);
    // the label clears the arrowhead (sideways arrows: by half a value's width) and the two lines do not overlap
    var d = L + 15 + Math.abs(ux) * (val ? 22 : 4), lx = x + ux * d, ly = y + uy * d - (val ? 9 : 0);
    if (sym) lab(g, sym, '', lx, ly, col, 'center', px || 13, bg);
    if (val) lab(g, '', val, lx, ly + Math.round((px || 13) * 1.5), col, 'center', (px || 13) - 1, bg);
  }
  function changed(S, p, keys) { var k = keys.map(function (id) { return p[id]; }).join('|'); if (S._k === k) return false; S._k = k; return true; }
  function small0(v) { return Math.abs(v) < 1e-9 ? 0 : v; }

  // ---------------------------------------------------------------- SVG figure helpers
  function sArrow(x1, y1, x2, y2, c) {
    var a = Math.atan2(y2 - y1, x2 - x1), h = 9, s = 'stroke:var(' + c + ');fill:var(' + c + ')';
    var p1 = [x2 - h * Math.cos(a - 0.4), y2 - h * Math.sin(a - 0.4)], p2 = [x2 - h * Math.cos(a + 0.4), y2 - h * Math.sin(a + 0.4)];
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + (x2 - 6 * Math.cos(a)).toFixed(1) + '" y2="' + (y2 - 6 * Math.sin(a)).toFixed(1) + '" style="' + s + ';stroke-width:2.5"/>' +
      '<polygon points="' + x2 + ',' + y2 + ' ' + p1[0].toFixed(1) + ',' + p1[1].toFixed(1) + ' ' + p2[0].toFixed(1) + ',' + p2[1].toFixed(1) + '" style="' + s + '"/>';
  }
  function sText(x, y, t, c) { return '<text x="' + x + '" y="' + y + '" style="fill:var(' + (c || '--fg') + ');font:italic 600 15px var(--font-math)">' + t + '</text>'; }
  // spring force F_j = k s against the compression s; the triangle under the line is the stored energy
  var FIG_SPR = '<svg viewBox="0 0 300 190" role="img" style="max-width:340px">' +
    '<polygon points="40,160 220,160 220,50" style="fill:var(--c-3);opacity:.35"/>' +
    '<line x1="40" y1="170" x2="40" y2="20" style="stroke:var(--c-wire);stroke-width:2"/><line x1="30" y1="160" x2="270" y2="160" style="stroke:var(--c-wire);stroke-width:2"/>' +
    '<line x1="40" y1="160" x2="240" y2="40" style="stroke:var(--f-applied);stroke-width:3"/>' +
    '<line x1="220" y1="160" x2="220" y2="50" style="stroke:var(--muted);stroke-width:1.5;stroke-dasharray:4 4"/>' +
    sText(14, 28, 'F') + sText(262, 180, 's') + sText(214, 178, 's') + sText(226, 108, 'F_j') + sText(96, 138, 'W = E_j') + '</svg>';

  // ---------------------------------------------------------------- device: work and the angle (t4-work-lab)
  function angOf(dx, dy) { var a = Math.atan2(dy, dx) / D2R; return a < 0 ? (dx < 0 ? 180 : 0) : a; }
  // The block (m = 100 kg, frictionless floor) slides in at v0 = 5 m/s; only F cos α changes its speed: a = F cos α / m.
  // The run ends after the distance s, or earlier where a backward component has stopped it (all E_k used).
  var WM = 100, WV0 = 5;
  function workRun(p) {
    var a = p.F * small0(Math.cos(p.al * D2R)) / WM, T, d;
    if (a > 0) T = (-WV0 + Math.sqrt(WV0 * WV0 + 2 * a * p.s)) / a;
    else if (a === 0 || WV0 * WV0 / (-2 * a) >= p.s) T = a ? (WV0 - Math.sqrt(WV0 * WV0 + 2 * a * p.s)) / -a : p.s / WV0;
    else T = WV0 / -a;                                                   // stops before s
    d = WV0 * T + 0.5 * a * T * T;
    return { a: a, T: T, d: Math.min(d, p.s), stop: d < p.s - 1e-9, v: WV0 + a * T };
  }
  var WORK = {
    animate: true,
    aspect: function (w) { return w < 520 ? 0.95 : 0.55; },
    params: [{ id: 'F', tex: 'F', min: 100, max: 1000, step: 10, value: 500, unit: 'N' },
             { id: 'al', tex: 'α', min: 0, max: 180, step: 5, value: 0, unit: '°' },
             { id: 's', tex: 's', min: 2, max: 20, step: 1, value: 10, unit: 'm' }],
    buttons: [{ label: T('Pull the block', 'Vedä kappaletta'), click: function (p, D) { changed(D.S, p, ['F', 'al', 's']); D.S.t = D.motion ? 0 : workRun(p).T; D.S.run = D.motion; } }],
    drag: {
      hit: function (x, y, p, D) { var t = D.S.tip; return t && Math.hypot(x - t[0], y - t[1]) < 24 ? 'a' : null; },
      move: function (k, x, y, p, D) { var o = D.S.pivot; return { al: angOf(x - o[0], o[1] - y) }; }
    },
    draw: function (g, w, h, p, ctx, TV, D) {
      var S = D.S, al = p.al * D2R, c = small0(Math.cos(al));
      if (changed(S, p, ['F', 'al', 's'])) { S.run = false; S.t = 0; }
      var R = workRun(p), rate = R.T / clamp(R.T, 1.2, 4);                // a slow run is shown faster, never slower than real time
      if (S.run) { S.t = Math.min(R.T, (S.t || 0) + D.dt * rate); if (S.t >= R.T) S.run = false; }
      var t = S.t || 0, xm = WV0 * t + 0.5 * R.a * t * t, vm = WV0 + R.a * t, pr = xm / p.s, fs = fsz(w), fg = ctx.color('--fg'), wire = ctx.color('--c-wire'), mu = ctx.color('--muted'), bg = ctx.color('--surface');
      var col = c > 0 ? ctx.color('--ok') : c < 0 ? ctx.color('--bad') : mu, cF = ctx.color('--f-applied');
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      var Lm = Math.min(w * 0.2, h * 0.34), La = Math.max(14, Lm * p.F / 1000), mg = Lm + 14;
      var fy = h * 0.58, bw = Math.min(64, w * 0.13), bh = bw * 0.6, x0 = mg, x1 = w - mg, ppm = (x1 - x0) / 20, xs = x0 + p.s * ppm, bx = x0 + xm * ppm, cy = fy - bh / 2;   // the floor shows 20 m: s sets the finish line
      g.fillStyle = ctx.color('--m-ground'); g.fillRect(0, fy, w, 8); g.strokeStyle = wire; g.lineWidth = 2; line(g, 0, fy, w, fy);
      g.strokeStyle = mu; g.lineWidth = 1.2; g.setLineDash([4, 4]); line(g, x0, fy - bh - 6, x0, fy + 14); line(g, xs, fy - bh - 6, xs, fy + 14); g.setLineDash([]);
      TV.arrow(g, x0 + 4, fy + 24, xs - 4, fy + 24, mu, 1.5); lab(g, 's', ' = ' + p.s + ' m', (x0 + xs) / 2, fy + 38, mu, 'center', fs);
      g.fillStyle = ctx.color('--m-body'); g.strokeStyle = wire; g.lineWidth = 2; TV.rr(g, bx - bw / 2, fy - bh, bw, bh, 3); g.fill(); g.stroke();
      // the force arrow (drag its tip) and its component along the displacement
      var tx = bx + La * Math.cos(al), ty = cy - La * Math.sin(al); S.tip = [tx, ty]; S.pivot = [bx, cy];
      TV.arrow(g, bx, cy, tx, ty, cF, 3.5); g.fillStyle = cF; g.beginPath(); g.arc(tx, ty, 6, 0, 2 * Math.PI); g.fill();
      lab(g, 'F', '', tx + (c >= 0 ? 12 : -12), ty - 10, cF, 'center', fs, bg);
      if (Math.abs(c) > 0.02) { g.setLineDash([5, 4]); TV.arrow(g, bx, fy + 8, bx + La * c, fy + 8, col, 2.5); g.setLineDash([]); lab(g, 'F cos α', '', bx + La * c / 2, fy + 20, col, 'center', fs - 1); }
      g.strokeStyle = mu; g.lineWidth = 1.5; g.beginPath(); g.arc(bx, cy, Math.min(30, La * 0.5), -al, 0); g.stroke();
      lab(g, 'α', ' = ' + p.al + '°', bx - bw / 2 - 6, cy - bh / 2 - 14, fg, 'right', fs - 1, null);
      // the work bar: grows with the displacement, outline = the final value F s cos α (relative to F s)
      var cx = w / 2, half = w * 0.38, by = h - 20;
      g.strokeStyle = mu; g.lineWidth = 1; line(g, cx - half, by, cx + half, by); line(g, cx, by - 10, cx, by + 10);
      g.setLineDash([4, 3]); g.strokeStyle = col; g.strokeRect(cx, by - 7, half * p.F * p.s * c / 20000, 14);   // bar scale: the largest work F s = 1000 N · 20 m g.setLineDash([]);
      g.fillStyle = col; g.globalAlpha = 0.75; g.fillRect(cx, by - 7, half * p.F * c * xm / 20000, 14); g.globalAlpha = 1;
      // velocity arrow on the block and E_k = E_k0 + W
      var cV = ctx.color('--f-accel'), Lv = (x1 - x0) * 0.1 * vm / WV0;
      if (Math.abs(Lv) > 2) { TV.arrow(g, bx, fy - bh - 10, bx + Lv, fy - bh - 10, cV, 2.5); lab(g, 'v', ' = ' + nf(vm, 2) + ' m/s', bx + Lv / 2, fy - bh - 24, cV, 'center', fs - 1, bg); }
      lab(g, 'E_k', ' = ' + TV.fmt(0.5 * WM * vm * vm, 'J') + '  (m = ' + WM + ' kg, v_0 = ' + WV0 + ' m/s)', 8, 34, mu, 'left', fs - 2);
      if (R.stop && t >= R.T - 1e-9) lab(g, '', ctx.tx(T('stopped after ' + nf(R.d, 3) + ' m: the force took all the kinetic energy', 'pysähtyi ' + nf(R.d, 3) + ' m:n jälkeen: voima vei kaiken liike-energian')), 8, 54, ctx.color('--bad'), 'left', fs - 1, bg);
      lab(g, '', '−20 kJ', cx - half, by + 4 - 18, mu, 'left', fs - 2); lab(g, '', '+20 kJ', cx + half, by + 4 - 18, mu, 'right', fs - 2);
      lab(g, 'W', ' = ' + TV.fmt(small0(p.F * p.s * c * pr), 'J'), 8, 14, col, 'left', fs + 1);
    },
    outputs: function (p) {
      var c = small0(Math.cos(p.al * D2R));
      return [{ tex: 'F_s = F cos α', value: p.F * c, unit: 'N' }, { tex: 'W = F s cos α', value: p.F * p.s * c, unit: 'J' }];
    },
    answer: function (p) { return { v: p.F * p.s * Math.cos(p.al * D2R) }; }
  };

  // ---------------------------------------------------------------- device: trapezoid work from an F,s graph (t4-trap-lab)
  var TRAP = {
    animate: true,
    aspect: function (w) { return w < 520 ? 0.95 : 0.55; },
    params: [0, 1, 2, 3, 4, 5].map(function (i) { return { id: 'F' + i, tex: 'F_' + i, min: 0, max: 60, step: 1, value: [0, 46, 41, 29, 28, 27][i], unit: 'N' }; })
      .concat([{ id: 'al', tex: 'α', min: 0, max: 60, step: 5, value: 35, unit: '°' }]),
    buttons: [{ label: T('Fill the trapezoids', 'Täytä puolisuunnikkaat'), click: function (p, D) { changed(D.S, p, ['F0', 'F1', 'F2', 'F3', 'F4', 'F5', 'al']); D.S.k = D.motion ? 0 : 5; D.S.run = D.motion; } }],
    drag: {
      hit: function (x, y, p, D) { var G = D.S.geo; if (!G) return null; for (var i = 0; i <= 5; i++) if (Math.hypot(x - G.X(i), y - G.Y(p['F' + i])) < 16) return i; return null; },
      move: function (k, x, y, p, D) { var G = D.S.geo, o = {}; o['F' + k] = (G.y1 - y) / (G.y1 - G.y0) * 60; return o; }
    },
    draw: function (g, w, h, p, ctx, TV, D) {
      var S = D.S, ks = ['F0', 'F1', 'F2', 'F3', 'F4', 'F5', 'al'];
      if (changed(S, p, ks)) { S.run = false; S.k = 5; }
      if (S.run) { S.k = Math.min(5, S.k + D.dt / 0.9); if (S.k >= 5) S.run = false; }
      var fs = fsz(w), fg = ctx.color('--fg'), wire = ctx.color('--c-wire'), mu = ctx.color('--muted'), bg = ctx.color('--surface'), c1 = ctx.color('--c-1');
      var x0 = 46, x1 = w - 24, y0 = 24, y1 = h - 40, X = function (s) { return x0 + s / 5 * (x1 - x0); }, Y = function (f) { return y1 - f / 60 * (y1 - y0); };
      S.geo = { X: X, Y: Y, y0: y0, y1: y1 };
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      g.strokeStyle = mu; g.lineWidth = 0.8; for (var f = 20; f <= 60; f += 20) line(g, x0, Y(f), x1, Y(f));
      g.strokeStyle = wire; g.lineWidth = 1.5; line(g, x0, y1, x1, y1); line(g, x0, y1, x0, y0 - 6);
      lab(g, 'F', ' / N', x0 + 6, y0 - 12, fg, 'left', fs); lab(g, 's', ' / m', x1, y1 + 29, fg, 'right', fs);
      for (var i = 0; i <= 5; i++) lab(g, '', String(i), X(i), y1 + 13, mu, 'center', fs - 2);
      for (f = 0; f <= 60; f += 20) lab(g, '', String(f), x0 - 6, Y(f), mu, 'right', fs - 2);
      var sum = 0, part = 0;
      for (i = 0; i < 5; i++) {
        var a = p['F' + i], b = p['F' + (i + 1)], fr = clamp(S.k - i, 0, 1); sum += (a + b) / 2; part += fr * (a + b) / 2;
        if (fr <= 0) continue;
        g.save(); g.beginPath(); g.rect(X(i), 0, (X(i + 1) - X(i)) * fr, h); g.clip();
        g.fillStyle = TV.alpha(c1, 0.35); g.beginPath(); g.moveTo(X(i), y1); g.lineTo(X(i), Y(a)); g.lineTo(X(i + 1), Y(b)); g.lineTo(X(i + 1), y1); g.closePath(); g.fill();
        g.strokeStyle = c1; g.lineWidth = 1; g.stroke(); g.restore();
        if (fr >= 1) lab(g, '', nf((a + b) / 2, 3), (X(i) + X(i + 1)) / 2, Y((a + b) / 4), fg, 'center', fs - 2);
      }
      g.strokeStyle = ctx.color('--f-friction'); g.lineWidth = 2.5; g.beginPath();
      for (i = 0; i <= 5; i++) { if (i) g.lineTo(X(i), Y(p['F' + i])); else g.moveTo(X(0), Y(p.F0)); } g.stroke();
      for (i = 0; i <= 5; i++) { g.fillStyle = ctx.color('--f-friction'); g.beginPath(); g.arc(X(i), Y(p['F' + i]), 5.5, 0, 2 * Math.PI); g.fill(); lab(g, '', String(p['F' + i]), X(i), Y(p['F' + i]) - 13, fg, 'center', fs - 1, bg); }
      var ca = Math.cos(p.al * D2R); g.strokeStyle = ctx.color('--ok'); g.lineWidth = 2.5; g.setLineDash([6, 4]); g.beginPath();   // the component that does work
      for (i = 0; i <= 5; i++) { if (i) g.lineTo(X(i), Y(p['F' + i] * ca)); else g.moveTo(X(0), Y(p.F0 * ca)); } g.stroke(); g.setLineDash([]);
      lab(g, 'F cos α', '', X(5) - 4, Y(p.F5 * ca) + 14, ctx.color('--ok'), 'right', fs - 1, bg);
      lab(g, 'W', ' = Σ F Δs cos α = ' + nf(part * ca, 4) + ' J', x1, 12, fg, 'right', fs);
    },
    outputs: function (p) {
      var sum = (p.F0 + p.F5) / 2 + p.F1 + p.F2 + p.F3 + p.F4, c = Math.cos(p.al * D2R);
      return [{ tex: '(F_0 + F_5)/2 + F_1 + F_2 + F_3 + F_4', value: sum, unit: 'N' }, { tex: 'Σ F Δs  (Δs = 1 m)', value: sum, unit: 'J' },
              { tex: 'W = Σ F Δs cos α', value: sum * c, unit: 'J' }];
    },
    answer: function (p) { return { v: ((p.F0 + p.F5) / 2 + p.F1 + p.F2 + p.F3 + p.F4) * Math.cos(p.al * D2R) }; }
  };

  // ---------------------------------------------------------------- device: pull with friction, FBD and work balance (t4-pull-lab)
  function pullF(p) { var a = p.al * D2R; return p.mu * p.m * G0 / (Math.cos(a) + p.mu * Math.sin(a)); }
  var PULL = {
    animate: true,
    aspect: function (w) { return w < 520 ? 1.05 : 0.62; },
    params: [{ id: 'al', tex: 'α', min: 0, max: 60, step: 1, value: 37, unit: '°' },
             { id: 'mu', tex: 'μ', min: 0, max: 0.8, step: 0.01, value: 0.43 },
             { id: 'm', tex: 'm', min: 50, max: 300, step: 10, value: 150, unit: 'kg' },
             { id: 's', tex: 's', min: 1, max: 10, step: 0.5, value: 4.5, unit: 'm' }],
    buttons: [{ label: T('Pull at constant speed', 'Vedä vakionopeudella'), click: function (p, D) { changed(D.S, p, ['al', 'mu', 'm', 's']); D.S.pr = D.motion ? 0 : 1; D.S.run = D.motion; } },
              { label: T('Horizontal (0°)', 'Vaakasuoraan (0°)'), click: function (p, D) { D.set({ al: 0 }); } },
              { label: T('Best angle tan α = μ', 'Paras kulma tan α = μ'), click: function (p, D) { D.set({ al: Math.atan(p.mu) / D2R }); } }],
    draw: function (g, w, h, p, ctx, TV, D) {
      var S = D.S, a = p.al * D2R;
      if (changed(S, p, ['al', 'mu', 'm', 's'])) { S.run = false; S.pr = 0; }
      if (S.run) { S.pr = Math.min(1, (S.pr || 0) + D.dt / 3); if (S.pr >= 1) S.run = false; }
      var pr = S.pr || 0, F = pullF(p), N = p.m * G0 - F * Math.sin(a), Ff = p.mu * N, WF = F * p.s * Math.cos(a), Wf = -Ff * p.s;
      var fs = fsz(w), fg = ctx.color('--fg'), wire = ctx.color('--c-wire'), mu = ctx.color('--muted'), bg = ctx.color('--surface');
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      var fy = h * 0.46, bw = Math.min(80, w * 0.15), bh = bw * 0.6, bx = w * 0.45, cy = fy - bh / 2, sc = h * 0.2 / (300 * G0);   // fixed scale (largest m): a heavier block gets longer arrows
      g.fillStyle = ctx.color('--m-ground'); g.fillRect(0, fy, w, h * 0.04); g.strokeStyle = wire; g.lineWidth = 2; line(g, 0, fy, w, fy);
      g.lineWidth = 1.2; for (var k = -1; k < w / 30 + 1; k++) { var hx = k * 30 - (pr * p.s * 30) % 30; line(g, hx, fy + 2, hx - 8, fy + h * 0.035); }
      g.fillStyle = ctx.color('--m-body'); g.lineWidth = 2; TV.rr(g, bx - bw / 2, fy - bh, bw, bh, 3); g.fill(); g.stroke();
      farrow(g, TV, bx, fy - bh, 0, -1, N * sc, ctx.color('--f-normal'), 'N', TV.fmt(N, 'N'), bg, fs - 1);
      farrow(g, TV, bx, fy, 0, 1, p.m * G0 * sc, ctx.color('--f-weight'), 'mg', '', bg, fs - 1);
      var Lf = F * sc, cF = ctx.color('--f-applied');
      TV.arrow(g, bx + bw / 2, cy, bx + bw / 2 + Lf * Math.cos(a), cy - Lf * Math.sin(a), cF, 3.5);
      lab(g, 'F', ' = ' + TV.fmt(F, 'N'), Math.min(bx + bw / 2 + Lf * Math.cos(a) + 8, w - 60), cy - Lf * Math.sin(a) - 12, cF, 'left', fs - 1, bg);
      if (p.al > 2) {
        g.setLineDash([4, 3]); g.lineWidth = 1.5; g.strokeStyle = cF;
        line(g, bx + bw / 2, cy, bx + bw / 2 + Lf * Math.cos(a), cy); line(g, bx + bw / 2 + Lf * Math.cos(a), cy, bx + bw / 2 + Lf * Math.cos(a), cy - Lf * Math.sin(a)); g.setLineDash([]);
        lab(g, 'F cos α', '', bx + bw / 2 + Lf * Math.cos(a) / 2, cy + 12, cF, 'center', fs - 2);
      }
      if (Ff > 0.5) { TV.arrow(g, bx - bw / 2, fy - 5, bx - bw / 2 - Ff * sc, fy - 5, ctx.color('--f-friction'), 3); lab(g, 'F_μ', '', bx - bw / 2 - Ff * sc / 2, fy - 19, ctx.color('--f-friction'), 'center', fs - 1, bg); }
      lab(g, '', ctx.tx(T('constant speed: ΣF = 0', 'vakionopeus: ΣF = 0')), 8, 14, fg, 'left', fs - 1);
      // work bars (cumulative): the work of the pull (right) and of friction (left) cancel
      var cx = w / 2, half = w * 0.4, ref = 300 * G0 * 10, by1 = h * 0.74, by2 = h * 0.86;
      g.strokeStyle = mu; g.lineWidth = 1; line(g, cx, by1 - 12, cx, by2 + 12);
      var l1 = half * (WF / ref) / 0.8 * pr, l2 = half * (Wf / ref) / 0.8 * pr;
      g.fillStyle = ctx.color('--ok'); g.globalAlpha = 0.8; g.fillRect(cx, by1 - 8, l1, 16); g.fillStyle = ctx.color('--bad'); g.fillRect(cx, by2 - 8, l2, 16); g.globalAlpha = 1;
      lab(g, 'W_F', ' = ' + TV.fmt(WF * pr, 'J'), cx + 6 + Math.max(0, l1), by1 - 17, ctx.color('--ok'), l1 > w * 0.2 ? 'right' : 'left', fs - 1);
      lab(g, 'W_μ', ' = ' + TV.fmt(Wf * pr, 'J'), cx - 6 + Math.min(0, l2), by2 + 17, ctx.color('--bad'), 'right', fs - 1);
      lab(g, 'W_F + W_μ', ' = 0 = ΔE_k', cx, h - 8, fg, 'center', fs - 1);
    },
    outputs: function (p) {
      var a = p.al * D2R, F = pullF(p), N = p.m * G0 - F * Math.sin(a);
      return [{ tex: 'F = {μ m g}/{cos α + μ sin α}', value: F, unit: 'N' }, { tex: 'N = m g − F sin α', value: N, unit: 'N' }, { tex: 'F_μ = μ N', value: p.mu * N, unit: 'N' },
              { tex: 'W = F s cos α', value: F * p.s * Math.cos(a), unit: 'J' }, { tex: 'α_{best}', value: nf(Math.atan(p.mu) / D2R, 3) + '°' }];
    },
    answer: function (p) { return { v: pullF(p) * p.s * Math.cos(p.al * D2R) }; }
  };

  // ---------------------------------------------------------------- device: power = F v on a hill (t4-hill-lab, exercise 4.4)
  var HILL = {
    animate: true,
    aspect: function (w) { return w < 520 ? 1.0 : 0.58; },
    params: [{ id: 'rise', tex: 'h', min: 0.5, max: 3, step: 0.1, value: 1.0, unit: 'm' },
             { id: 'v', tex: 'v', min: 5, max: 30, step: 1, value: 18, unit: 'm/s' },
             { id: 'm', tex: 'm', min: 600, max: 2000, step: 50, value: 1200, unit: 'kg' },
             { id: 'R', tex: 'R', min: 0, max: 3000, step: 1, value: 589, unit: 'N' }],
    buttons: [{ label: T('Coast down in neutral', 'Vierii alas vapaalla'), click: function (p, D) {
                 var S = D.S; D.set({ R: p.m * G0 * p.rise / 20 }); S.mode = 'down'; S.run = D.motion; S.dist = 0; S.T = 0; } },
              { label: T('Drive up at the same speed', 'Aja ylös samalla nopeudella'), click: function (p, D) { var S = D.S; S.mode = 'up'; S.run = D.motion; S.dist = 0; S.T = 0; } }],
    draw: function (g, w, h, p, ctx, TV, D) {
      var S = D.S, sin = p.rise / 20, mgs = p.m * G0 * sin, up = S.mode !== 'down';
      if (S.mode == null) S.mode = 'up';
      if (changed(S, p, ['rise', 'v', 'm', 'R'])) { S.run = false; }
      var v = up ? p.v : p.v + (G0 * sin - p.R / p.m) * (S.T || 0);
      if (S.run) { S.T = (S.T || 0) + D.dt; S.dist = (S.dist || 0) + Math.max(0, v) * D.dt; if (S.T > 5) S.run = false; }
      var fs = fsz(w), fg = ctx.color('--fg'), wire = ctx.color('--c-wire'), mu = ctx.color('--muted'), bg = ctx.color('--surface');
      var F = up ? p.R + mgs : 0, vis = Math.min(0.32, Math.asin(sin) * 4);
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      var cx = w * 0.5, cy = h * 0.4, Ls = w * 0.7;
      // slope through the car (rising to the right); marks scroll as the car moves
      g.save(); g.translate(cx, cy); g.rotate(-vis);
      var bw = Math.min(110, w * 0.22), bh = bw * 0.38;
      g.fillStyle = ctx.color('--m-ground'); g.fillRect(-Ls / 2 - 20, bh / 2 + 6, Ls + 40, 14); g.strokeStyle = wire; g.lineWidth = 2; line(g, -Ls / 2 - 20, bh / 2 + 6, Ls / 2 + 20, bh / 2 + 6);
      g.lineWidth = 1.2; var off = -((up ? 1 : -1) * (S.dist || 0) * 14) % 40;   // the ground moves opposite to the car
      for (var k = -9; k < 9; k++) { var hx = k * 40 + off; if (Math.abs(hx) < Ls / 2 + 10) line(g, hx, bh / 2 + 7, hx - 7, bh / 2 + 19); }
      g.fillStyle = ctx.color('--m-body'); g.lineWidth = 2; TV.rr(g, -bw / 2, -bh / 2, bw, bh, 6); g.fill(); g.stroke();
      g.fillStyle = ctx.color('--surface'); TV.rr(g, -bw * 0.18, -bh * 0.4, bw * 0.4, bh * 0.4, 3); g.fill(); g.stroke();
      [-bw * 0.3, bw * 0.3].forEach(function (x) { g.fillStyle = ctx.color('--fg'); g.beginPath(); g.arc(x, bh / 2, bh * 0.2, 0, 2 * Math.PI); g.fill(); });
      var sc = (w * 0.2) / Math.max(1, p.R + mgs, mgs, F), dirv = up ? 1 : -1;
      if (up) { TV.arrow(g, 0, -bh / 2 - 12, F * sc, -bh / 2 - 12, ctx.color('--f-applied'), 3.5); lab(g, 'F', '', F * sc + 14, -bh / 2 - 12, ctx.color('--f-applied'), 'left', fs - 1); }
      TV.arrow(g, 0, -bh / 2 - 26, -dirv * p.R * sc, -bh / 2 - 26, ctx.color('--f-friction'), 3); lab(g, 'R', '', -dirv * p.R * sc - dirv * 14, -bh / 2 - 26, ctx.color('--f-friction'), 'center', fs - 1);
      TV.arrow(g, 0, -bh / 2 - 40, -mgs * sc, -bh / 2 - 40, ctx.color('--f-weight'), 3); lab(g, 'mg sin α', '', -mgs * sc - 6, -bh / 2 - 40, ctx.color('--f-weight'), 'right', fs - 1);
      g.restore();
      lab(g, '', ctx.tx(up ? T('driving up at constant speed: F = R + mg sin α', 'ajo ylös vakionopeudella: F = R + mg sin α') : T('neutral: only R and mg sin α act', 'vapaalla: vain R ja mg sin α vaikuttavat')), 8, 14, fg, 'left', fs - 1);
      lab(g, 'v', ' = ' + nf(Math.max(0, v), 3) + ' m/s', w - 8, 32, fg, 'right', fs - 1);
      // power bar: P = R v + m g sin α v
      var bx0 = 16, bx1 = w - 16, by = h * 0.86, Pmax = 60000, P = F * p.v, X = function (q) { return bx0 + (bx1 - bx0) * Math.min(1, q / Pmax); };
      g.strokeStyle = mu; g.lineWidth = 1; line(g, bx0, by + 12, bx1, by + 12); for (var kw = 0; kw <= 60; kw += 20) lab(g, '', kw + (kw === 60 ? ' kW' : ''), X(kw * 1000), by + 24, mu, kw === 0 ? 'left' : 'center', fs - 3);
      if (up) {
        g.fillStyle = ctx.color('--f-friction'); g.fillRect(X(0), by - 10, X(p.R * p.v) - X(0), 20); g.fillStyle = ctx.color('--f-weight'); g.fillRect(X(p.R * p.v), by - 10, X(P) - X(p.R * p.v), 20);
        lab(g, 'P = F v', ' = ' + TV.fmt(P, 'W'), Math.min(X(P) + 8, w - 120), by - 24, fg, 'left', fs);
      } else lab(g, 'P', ' = 0', bx0, by - 24, fg, 'left', fs);
    },
    outputs: function (p) {
      var sin = p.rise / 20, mgs = p.m * G0 * sin, F = p.R + mgs;
      return [{ tex: 'sin α = h / 20 m', value: sin, digits: 3 }, { tex: 'm g sin α', value: mgs, unit: 'N' }, { tex: 'F = R + m g sin α', value: F, unit: 'N' }, { tex: 'P = F v', value: F * p.v, unit: 'W' }];
    },
    answer: function (p) { return { v: (p.R + p.m * G0 * p.rise / 20) * p.v }; }
  };

  // ---------------------------------------------------------------- device: efficiency chain, Sankey bars (t4-chain-lab)
  var NAMES = [T('engine', 'moottori'), T('clutch', 'kytkin'), T('transmission', 'vaihteisto'), T('differential', 'tasauspyörästö'), T('final drive', 'pääpyörä')];
  var CHAIN = {
    animate: true,
    aspect: function (w) { return w < 520 ? 0.95 : 0.55; },
    params: [0.33, 0.95, 0.9, 0.9, 0.95].map(function (v, i) { return { id: 'e' + (i + 1), tex: 'η_' + (i + 1), min: 0.05, max: 1, step: 0.01, value: v }; })
      .concat([{ id: 'Pi', tex: 'P_{in}', min: 10, max: 2000, step: 10, value: 100, unit: 'kW' }]),
    buttons: [{ label: T('Send the power through', 'Lähetä teho läpi'), click: function (p, D) { changed(D.S, p, ['e1', 'e2', 'e3', 'e4', 'e5', 'Pi']); D.S.k = D.motion ? 0 : 5; D.S.run = D.motion; } },
              { label: T('Car (slide p14)', 'Auto (kalvo s. 14)'), click: function (p, D) { D.set({ e1: 0.33, e2: 0.95, e3: 0.9, e4: 0.9, e5: 0.95 }); } },
              { label: T('One stage only', 'Vain yksi vaihe'), click: function (p, D) { D.set({ e1: 0.33, e2: 1, e3: 1, e4: 1, e5: 1 }); } }],
    draw: function (g, w, h, p, ctx, TV, D) {
      var S = D.S, ks = ['e1', 'e2', 'e3', 'e4', 'e5', 'Pi'];
      if (changed(S, p, ks)) { S.run = false; S.k = 5; }
      if (S.run) { S.k = Math.min(5, S.k + D.dt / 0.8); if (S.k >= 5) S.run = false; }
      var fs = fsz(w), fg = ctx.color('--fg'), mu = ctx.color('--muted'), bg = ctx.color('--surface'), c1 = ctx.color('--c-1'), bad = ctx.color('--bad');
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      var x0 = 14, x1 = w - 14, dx = (x1 - x0) / 5, y0 = 34, Hm = h * 0.28, P = [p.Pi], i;
      for (i = 1; i <= 5; i++) P.push(P[i - 1] * p['e' + i]);
      var H = P.map(function (q) { return Hm * (0.25 + 0.75 * p.Pi / 2000) * q / p.Pi; });   // thicker band = more power
      for (i = 0; i < 5; i++) {
        var f = clamp(S.k - i, 0, 1); if (f <= 0) continue;
        var xa = x0 + i * dx, xb = xa + dx, xm = xa + dx * 0.45;
        // Sankey: the band keeps what passes on; the loss leaves as a ribbon of the same thickness (same scale)
        g.globalAlpha = f; g.fillStyle = TV.alpha(c1, 0.55); g.fillRect(xa, y0, dx, H[i + 1]);
        var ly = y0 + Hm + 14, lh = H[i] - H[i + 1];
        g.fillStyle = TV.alpha(bad, 0.6); g.beginPath(); g.moveTo(xa, y0 + H[i + 1]); g.lineTo(xm, ly); g.lineTo(xm, ly + lh); g.lineTo(xa, y0 + H[i]); g.closePath(); g.fill();
        g.globalAlpha = f;
        lab(g, 'η_' + (i + 1), ' = ' + nf(p['e' + (i + 1)], 3), (xa + xb) / 2, y0 - 12, fg, 'center', fs - 2);
        lab(g, '', '−' + nf(P[i] - P[i + 1], 3), xm, ly + lh + 12, bad, 'center', fs - 2);
        lab(g, '', nf(P[i + 1], 3), xb - 4, y0 + H[i + 1] + 11, fg, 'right', fs - 3);
        g.globalAlpha = 1;
      }
      lab(g, 'P_in', ' = ' + nf(P[0], 3) + ' kW', x0, h - 40, fg, 'left', fs);
      lab(g, 'P_out', ' = ' + nf(P[5], 3) + ' kW', x1, h - 40, ctx.color('--ok'), 'right', fs);
      lab(g, 'η', ' = η_1 η_2 η_3 η_4 η_5 = ' + nf(P[5] / P[0], 3), w / 2, h - 16, fg, 'center', fs);
    },
    outputs: function (p) {
      var e = p.e1 * p.e2 * p.e3 * p.e4 * p.e5;
      return [{ tex: 'η = η_1 η_2 η_3 η_4 η_5', value: e, digits: 4 }, { tex: 'P_{out} = η P_{in}', value: p.Pi * e, unit: 'kW' }, { tex: 'P_h = P_{in} − P_{out}', value: p.Pi * (1 - e), unit: 'kW' }];
    },
    answer: function (p) { return { v: p.e1 * p.e2 * p.e3 * p.e4 * p.e5 }; }
  };

  // ---------------------------------------------------------------- device: water pump (t4-pump-lab; p13, ex 4.10, ex 80)
  function pumpP(p) { var mdot = p.Q / 60, lift = mdot * G0 * p.hd, kin = 0.5 * mdot * p.v * p.v; return { md: mdot, lift: lift, kin: kin, out: lift + kin, inp: (lift + kin) / p.eta }; }
  var PUMP = {
    animate: true,
    aspect: function (w) { return w < 520 ? 1.1 : 0.58; },
    params: [{ id: 'Q', tex: 'Q', min: 50, max: 900, step: 10, value: 750, unit: 'L/min' },
             { id: 'hd', tex: 'h', min: 1, max: 15, step: 0.5, value: 6, unit: 'm' },
             { id: 'v', tex: 'v', min: 0, max: 15, step: 0.5, value: 10, unit: 'm/s' },
             { id: 'eta', tex: 'η', min: 0.1, max: 1, step: 0.01, value: 0.75 }],
    buttons: [{ label: T('Run the pump', 'Käynnistä pumppu'), click: function (p, D) { D.S.run = D.motion; D.S.T = 0; } }],
    draw: function (g, w, h, p, ctx, TV, D) {
      var S = D.S, P = pumpP(p);
      if (S.run) { S.T = (S.T || 0) + D.dt; S.ph = ((S.ph || 0) + D.dt * p.Q / 400) % 1; if (S.T > 8) S.run = false; }
      var ph = S.ph || 0, fs = fsz(w), fg = ctx.color('--fg'), wire = ctx.color('--c-wire'), mu = ctx.color('--muted'), bg = ctx.color('--surface'), c1 = ctx.color('--c-1');
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      var narrow = w < 520, gx = narrow ? w * 0.3 : w * 0.16, gy = h * 0.3, pp = (narrow ? h * 0.36 : h * 0.55) / 15, dep = p.hd * pp, wl = narrow ? w * 0.96 : w * 0.5;
      g.fillStyle = ctx.color('--m-ground'); g.fillRect(0, gy, wl, h * 0.03); g.strokeStyle = wire; g.lineWidth = 2; line(g, 0, gy, wl, gy);
      g.fillStyle = TV.alpha(c1, 0.35); g.fillRect(gx - 22, gy + h * 0.03, 44, dep + 4); g.strokeRect(gx - 22, gy + h * 0.03, 44, dep + 4);
      g.lineWidth = 6; g.strokeStyle = mu; line(g, gx, gy + dep, gx, gy - 22);
      g.fillStyle = ctx.color('--m-body'); g.strokeStyle = wire; g.lineWidth = 2; g.beginPath(); g.arc(gx, gy + dep - 6, 11, 0, 2 * Math.PI); g.fill(); g.stroke();
      var nd = 3 + Math.round(p.Q / 90);
      g.fillStyle = c1; for (var i = 0; i < nd; i++) { var u = (ph + i / nd) % 1; g.beginPath(); g.arc(gx, gy - 22 + (dep + 22) * (1 - u), 3.2, 0, 2 * Math.PI); g.fill(); }
      // jet: horizontal throw from the spout with speed v (path scaled so that 1 m of height = pp pixels)
      // the jet ends where it lands on the ground (the spout is 22 px above it)
      var jt = Math.min(1.2, Math.sqrt(44 / (G0 * pp)), (narrow ? w * 0.5 : wl * 0.55) / Math.max(1, p.v * pp));
      g.strokeStyle = TV.alpha(c1, 0.5); g.lineWidth = 2; g.setLineDash([4, 4]); g.beginPath();
      for (var j = 0; j <= 30; j++) { var t = jt * j / 30, X = gx + p.v * t * pp, Yp = gy - 22 + 0.5 * G0 * t * t * pp; if (j) g.lineTo(X, Yp); else g.moveTo(X, Yp); } g.stroke(); g.setLineDash([]);
      g.fillStyle = c1; for (j = 0; j < 7 && p.v > 0; j++) { var tt = (((ph * 2) + j / 7) % 1) * jt; g.beginPath(); g.arc(gx + p.v * tt * pp, gy - 22 + 0.5 * G0 * tt * tt * pp, 3, 0, 2 * Math.PI); g.fill(); }
      TV.arrow(g, gx + 26, gy - 40, gx + 26 + Math.min(70, p.v * 5), gy - 40, ctx.color('--f-accel'), 2.5); lab(g, 'v', ' = ' + p.v + ' m/s', gx + 30, gy - 54, ctx.color('--f-accel'), 'left', fs - 1);
      g.strokeStyle = mu; g.lineWidth = 1.2; TV.arrow(g, gx - 34, gy + 8, gx - 34, gy + dep + 4, mu, 1.5); lab(g, 'h', ' = ' + p.hd + ' m', gx - 40, gy + dep / 2 + 6, mu, 'right', fs - 1, bg);
      // power bars
      var bx0 = narrow ? 14 : w * 0.56, bx1 = w - 14, by = narrow ? h * 0.7 : h * 0.34, bwid = bx1 - bx0, ofs = narrow ? 0 : 0;
      var sc = bwid / P.inp, ok = ctx.color('--ok');
      g.fillStyle = c1; g.fillRect(bx0, by, P.lift * sc, 22); g.fillStyle = ctx.color('--c-2'); g.fillRect(bx0 + P.lift * sc, by, P.kin * sc, 22);
      lab(g, 'P_out', ' = ' + TV.fmt(P.out, 'W'), bx0, by - 11, fg, 'left', fs - 1);
      g.fillStyle = ok; g.globalAlpha = 0.8; g.fillRect(bx0, by + 62, P.out * sc, 22); g.fillStyle = ctx.color('--bad'); g.fillRect(bx0 + P.out * sc, by + 62, (P.inp - P.out) * sc, 22); g.globalAlpha = 1;
      lab(g, 'P_in = P_out / η', ' = ' + TV.fmt(P.inp, 'W'), bx0, by + 51, fg, 'left', fs - 1);
      lab(g, 'm g h', '', bx0 + P.lift * sc / 2, by + 11, ctx.color('--surface'), 'center', fs - 2);
      if (P.kin * sc > 36) lab(g, '½ m v^2', '', bx0 + P.lift * sc + P.kin * sc / 2, by + 11, ctx.color('--surface'), 'center', fs - 3);
      lab(g, 'η', ' = ' + nf(p.eta, 2), bx0, by + 100, fg, 'left', fs - 1);
    },
    outputs: function (p) {
      var P = pumpP(p);
      return [{ label: T('Mass flow', 'Massavirta'), value: nf(P.md, 3) + ' kg/s' }, { tex: 'P_lift = (m/t) g h', value: P.lift, unit: 'W' }, { tex: 'P_kin = ½ (m/t) v^2', value: P.kin, unit: 'W' },
              { tex: 'P_out', value: P.out, unit: 'W' }, { tex: 'P_in = P_out/η', value: P.inp, unit: 'W' }];
    },
    answer: function (p) { return { v: pumpP(p).inp }; }
  };

  // ---------------------------------------------------------------- the topic
  TDC.registerTopic({
    id: 't4', num: 4,
    title: T('Work, power and energy', 'Työ, teho ja energia'),
    subtitle: T('Work of a force, kinetic and potential energy, spring energy, conservation of energy, power and efficiency.', 'Voiman työ, liike- ja potentiaalienergia, jousienergia, energian säilyminen, teho ja hyötysuhde.'),
    objectives: [
      T('calculate the work of a constant force at any angle, and of a varying force from an F,s graph', 'laskea vakiovoiman työn mielivaltaisessa kulmassa ja muuttuvan voiman työn F,s-kuvaajasta'),
      T('use E_k = ½ m v², E_p = m g h and E_j = ½ k s² and the work-energy theorem', 'käyttää kaavoja E_k = ½ m v², E_p = m g h ja E_j = ½ k s² sekä työperiaatetta'),
      T('solve problems with conservation of energy, with and without friction work', 'ratkaista tehtäviä energian säilymisellä kitkatyö mukaan lukien ja ilman sitä'),
      T('calculate average and instantaneous power, P = W/t and P = F v', 'laskea keskiteho ja hetkellinen teho kaavoilla P = W/t ja P = F v'),
      T('calculate efficiency and total efficiency of machines and power plants', 'laskea koneiden ja voimalaitosten hyötysuhteen ja kokonaishyötysuhteen')
    ],
    glossary: {
      work: { en: 'work', fi: 'työ', sym: 'W = F·s', def: T('Energy transferred by a force along a displacement; unit joule, 1 J = 1 N·m.', 'Voiman siirtämä energia siirtymän matkalla; yksikkö joule, 1 J = 1 N·m.') },
      power: { en: 'power', fi: 'teho', sym: 'P = W/t', def: T('Work done per unit of time; unit watt, 1 W = 1 J/s.', 'Aikayksikössä tehty työ; yksikkö watti, 1 W = 1 J/s.') },
      energy: { en: 'energy', fi: 'energia', sym: 'E', def: T('The ability to do work; unit joule.', 'Kyky tehdä työtä; yksikkö joule.') },
      mechenergy: { en: 'mechanical energy', fi: 'mekaaninen energia', sym: 'E = E_k + E_p', def: T('Sum of kinetic and potential energy.', 'Liike- ja potentiaalienergian summa.') },
      conservation: { en: 'conservation of energy', fi: 'energian säilymislaki', def: T('In energy changes the total energy stays constant (it only changes form).', 'Energian muutoksissa kokonaisenergia säilyy vakiona (se vain muuttaa muotoaan).') },
      kinetic: { en: 'kinetic energy', fi: 'liike-energia', sym: 'E_k = ½ m v²', def: T('Energy of a body because of its speed.', 'Kappaleen energia sen nopeuden vuoksi.') },
      potential: { en: 'potential energy', fi: 'potentiaalienergia', sym: 'E_p = m g h', def: T('Energy of a body because of its height above a reference level.', 'Kappaleen energia sen korkeuden vuoksi vertailutasoon nähden.') },
      springenergy: { en: 'spring energy', fi: 'jousienergia', sym: 'E_j = ½ k s²', def: T('Energy stored in a spring compressed or stretched by s; the area under the F,s line.', 'Puristetun tai venytetyn jousen energia; F,s-suoran alle jäävä ala.') },
      springconst: { en: 'spring constant', fi: 'jousivakio', sym: 'k', def: T('Force per unit of compression, N/m.', 'Voima puristumayksikköä kohti, N/m.') },
      frictionwork: { en: 'friction work', fi: 'kitkatyö', sym: 'W_μ', def: T('Work done against friction; it turns mechanical energy into thermal energy.', 'Kitkaa vastaan tehty työ; se muuttaa mekaanista energiaa lämpöenergiaksi.') },
      workenergy: { en: 'work-energy theorem', fi: 'työperiaate', sym: 'ΣW = ΔE_k', def: T('The total work on a body equals the change of its kinetic energy.', 'Kappaleeseen tehty kokonaistyö on yhtä suuri kuin sen liike-energian muutos.') },
      avgpower: { en: 'average power', fi: 'keskiteho', sym: 'P_k = W/t', def: T('Work divided by the time it took.', 'Työ jaettuna siihen kuluneella ajalla.') },
      instpower: { en: 'instantaneous power', fi: 'hetkellinen teho', sym: 'P = F v cos α', def: T('Power at one moment: P = dW/dt = F·v.', 'Teho tietyllä hetkellä: P = dW/dt = F·v.') },
      efficiency: { en: 'efficiency', fi: 'hyötysuhde', sym: 'η = P_out/P_in', def: T('Output divided by input (work, energy or power); always 0 < η < 1.', 'Anto jaettuna otolla (työ, energia tai teho); aina 0 < η < 1.') },
      toteff: { en: 'total efficiency', fi: 'kokonaishyötysuhde', sym: 'η = η_1 η_2 …', def: T('Product of the efficiencies of all stages in a chain.', 'Ketjun kaikkien vaiheiden hyötysuhteiden tulo.') },
      brakingdist: { en: 'braking distance', fi: 'jarrutusmatka', sym: 's = v²/(2 μ g)', def: T('Distance in which friction stops a body: ½ m v² = μ m g s.', 'Matka, jolla kitka pysäyttää kappaleen: ½ m v² = μ m g s.') },
      lifting: { en: 'lifting work', fi: 'nostotyö', sym: 'W = m g h', def: T('Work done in lifting a load; independent of the path.', 'Kuorman nostamiseen tehty työ; ei riipu reitistä.') },
      trapezoid: { en: 'trapezoidal method', fi: 'puolisuunnikasmenetelmä', def: T('Approximating the area under a graph by trapezoids.', 'Kuvaajan alle jäävän alan approksimointi puolisuunnikkailla.') },
      lineintegral: { en: 'line integral', fi: 'viivaintegraali', sym: '∫F·ds', def: T('Work along a curve when the force changes.', 'Työ käyrää pitkin, kun voima muuttuu.') },
      perpetual: { en: 'perpetual motion machine', fi: 'ikiliikkuja', def: T('An impossible machine with η = 1 or more.', 'Mahdoton kone, jonka hyötysuhde on 1 tai suurempi.') },
      loss: { en: 'dissipation power (loss)', fi: 'häviöteho', sym: 'P_h = P_in − P_out', def: T('The part of the input power that is not output; it ends up as heat.', 'Ottotehon osa, joka ei päädy antotehoksi; se muuttuu lämmöksi.') }
    },
    formulas: [
      { name: T('Work of a constant force', 'Vakiovoiman työ'), tex: 'W = F s cos α' },
      { name: T('Work of a varying force (trapezoids)', 'Muuttuvan voiman työ (puolisuunnikkaat)'), tex: 'W ≈ [ {F_0 + F_n}/{2} + F_1 + … + F_{n−1} ] Δs cos α' },
      { name: T('Potential energy', 'Potentiaalienergia'), tex: 'E_p = m g h' },
      { name: T('Kinetic energy', 'Liike-energia'), tex: 'E_k = ½ m v^2' },
      { name: T('Work-energy theorem', 'Työperiaate'), tex: 'ΣW = ΔE_k' },
      { name: T('Spring energy', 'Jousienergia'), tex: 'E_j = ½ k s^2' },
      { name: T('Conservation of energy with friction', 'Energian säilyminen kitkan kanssa'), tex: 'E_{p0} + E_{k0} = E_p + E_k + W_μ' },
      { name: T('Braking distance', 'Jarrutusmatka'), tex: 's = {v^2}/{2 μ g}' },
      { name: T('Average power', 'Keskiteho'), tex: 'P_k = W/t' },
      { name: T('Power and force', 'Teho ja voima'), tex: 'P = F v cos α' },
      { name: T('Efficiency', 'Hyötysuhde'), tex: 'η = {P_{out}}/{P_{in}}' },
      { name: T('Total efficiency', 'Kokonaishyötysuhde'), tex: 'η = η_1 η_2 η_3 …' }
    ],
    sections: [
      // ======================================================== 4.1 overview (p03)
      { id: 't4-overview', title: T('Work, power and energy', 'Työ, teho ja energia'),
        blocks: [
          { id: 't4-ov-intro', type: 'text', html: T(
            '<p><dfn data-term="energy">Energy</dfn> is one of the most important quantities in science and engineering. It appears as <b>mechanical</b>, <b>thermal</b> and <b>electromagnetic</b> energy. The law of conservation says: in energy changes the <b>total</b> energy stays constant.</p>',
            '<p><dfn data-term="energy">Energia</dfn> on yksi luonnontieteen ja tekniikan tärkeimmistä suureista. Sitä esiintyy <b>mekaanisena</b>, <b>lämpö</b>- ja <b>sähkömagneettisena</b> energiana. Säilymislaki sanoo: energian muutoksissa <b>kokonaisenergia</b> pysyy vakiona.</p>') },
          { id: 't4-ov-three', type: 'columns', cols: [
            [{ id: 't4-ov-work', type: 'formula', key: true, tex: 'W = F · s', label: T('Work: force does the work in most energy changes', 'Työ: voima tekee työn useimmissa energian muutoksissa'),
              legend: [['W', T('work', 'työ'), 'J = N·m'], ['F', T('force', 'voima'), 'N'], ['s', T('displacement', 'siirtymä'), 'm']] }],
            [{ id: 't4-ov-power', type: 'formula', key: true, tex: 'P = W/t', label: T('Power: how quickly the work is done', 'Teho: kuinka nopeasti työ tehdään'),
              legend: [['P', T('power', 'teho'), 'W = J/s'], ['t', T('time', 'aika'), 's']] }]] },
          { id: 't4-ov-mech', type: 'formula', key: true, tex: 'E = E_k + E_p', label: T('Mechanical energy: kinetic plus potential energy', 'Mekaaninen energia: liike- ja potentiaalienergia'),
            legend: [['E_k', T('kinetic energy', 'liike-energia'), 'J'], ['E_p', T('potential energy', 'potentiaalienergia'), 'J']] },
          { id: 't4-ov-tip', type: 'callout', kind: 'tip', title: T('A ladder to the exercises', 'Portaat tehtäviin'), html: T(
            'This topic climbs in steps: work of a constant force, the angle, the area under F,s, kinetic energy, conservation of energy on a ramp, friction loss, spring energy, power and efficiency. Each exercise of the deck is the top step of one such ladder.',
            'Aihe etenee portaittain: vakiovoiman työ, kulma, F,s-kuvaajan ala, liike-energia, energian säilyminen rampilla, kitkahäviö, jousienergia, teho ja hyötysuhde. Kukin kalvosarjan tehtävä on yhden tällaisen portaikon ylin askel.') },
          { type: 'question', q: 't4-q1', id: 't4-q1-blk' },
          { type: 'question', q: 't4-q2', id: 't4-q2-blk' }
        ] },

      // ======================================================== 4.2 constant force (p04)
      { id: 't4-work', title: T('Work of a constant force', 'Vakiovoiman työ'),
        blocks: [
          { id: 't4-wk-text', type: 'text', html: T(
            '<p>A small displacement <f>ds</f> under the force <f>F</f> does the work <f>dW = F ds cos α</f>, where <f>α</f> is the angle between the force and the displacement. For a <b>constant</b> force over the displacement <f>s</f> the total <dfn data-term="work">work</dfn> is</p>',
            '<p>Pieni siirtymä <f>ds</f> voiman <f>F</f> vaikutuksesta tekee työn <f>dW = F ds cos α</f>, missä <f>α</f> on voiman ja siirtymän välinen kulma. <b>Vakiovoiman</b> <dfn data-term="work">työ</dfn> siirtymällä <f>s</f> on</p>') },
          { id: 't4-wk-f', type: 'formula', key: true, tex: 'W = F s cos α', label: T('Work of a constant force', 'Vakiovoiman työ'),
            legend: [['α', T('angle between F and the displacement', 'voiman ja siirtymän välinen kulma'), '°']] },
          { id: 't4-wk-cases', type: 'table', head: [T('Angle', 'Kulma'), T('Work for F = 500 N, s = 10 m', 'Työ, kun F = 500 N ja s = 10 m'), T('Meaning', 'Merkitys')],
            rows: [['0°', '500 N · 10 m · cos 0° = 5 kJ', T('force along the motion: energy added', 'voima liikkeen suuntaan: energiaa lisätään')],
                   ['90°', '500 N · 10 m · cos 90° = 0 J', T('force perpendicular to the motion: no work', 'voima kohtisuoraan liikettä vastaan: ei työtä')],
                   ['180°', '500 N · 10 m · cos 180° = −5 kJ', T('force against the motion (friction): energy removed', 'voima liikettä vastaan (kitka): energiaa poistuu')]],
            caption: T('The three cases of slide p04.', 'Kalvon s. 04 kolme tapausta.') },
          { id: 't4-wk-warn', type: 'callout', kind: 'warn', title: T('The sign tells what happens to the energy', 'Etumerkki kertoo, mitä energialle tapahtuu'), html: T(
            'Positive work increases the energy of the body, negative work (for example friction) reduces it, and a force perpendicular to the motion does no work at all. The normal force of a floor never does work on a sliding block.',
            'Positiivinen työ lisää kappaleen energiaa, negatiivinen työ (esimerkiksi kitka) vähentää sitä, eikä liikettä vastaan kohtisuora voima tee työtä lainkaan. Lattian tukivoima ei koskaan tee työtä liukuvalle kappaleelle.') },
          { id: 't4-work-lab', type: 'interactive', widget: 'custom', title: T('Work and the angle of the force', 'Työ ja voiman suuntakulma'),
            caption: T('The block (100 kg) slides onto a frictionless floor at 5 m/s. Drag the tip of the force arrow (or use the sliders) to set F and α, then press Pull the block. Only the component F cos α along the floor does work: below 90° it speeds the block up (green bar, positive work), at 90° the speed stays the same (no work), beyond 90° it slows the block down (red bar, negative work) and may stop it before the distance s.',
              'Kappale (100 kg) liukuu kitkattomalle lattialle nopeudella 5 m/s. Vedä voimanuolen kärkeä (tai käytä säätimiä) asettaaksesi F:n ja α:n ja paina Vedä kappaletta. Työtä tekee vain lattian suuntainen komponentti F cos α: alle 90°:n se kiihdyttää kappaletta (vihreä palkki, positiivinen työ), 90°:ssa nopeus ei muutu (ei työtä), yli 90°:n se hidastaa kappaletta (punainen palkki, negatiivinen työ) ja voi pysäyttää sen ennen matkaa s.'),
            config: dev(WORK) },
          { type: 'question', q: 't4-q3', id: 't4-q3-blk' },
          { type: 'question', q: 't4-q4', id: 't4-q4-blk' },
          { type: 'question', q: 't4-q5', id: 't4-q5-blk' },
          { type: 'question', q: 't4-q6', id: 't4-q6-blk' }
        ] },

      // ======================================================== 4.3 varying force + general definition (p05, p06)
      { id: 't4-varying', title: T('Work of a varying force', 'Muuttuvan voiman työ'),
        blocks: [
          { id: 't4-vr-text', type: 'text', html: T(
            '<p>When the force changes along the way, the work is the <b>area</b> between the F,s graph and the s axis. The <dfn data-term="trapezoid">trapezoidal method</dfn> cuts the area into strips of width <f>Δs</f>: the end values count half, the inner values count in full.</p>',
            '<p>Kun voima muuttuu matkan varrella, työ on F,s-kuvaajan ja s-akselin välinen <b>ala</b>. <dfn data-term="trapezoid">Puolisuunnikasmenetelmä</dfn> jakaa alan Δs:n levyisiin kaistoihin: päätearvot lasketaan puolella, väliarvot kokonaan.') },
          { id: 't4-vr-f', type: 'formula', key: true, tex: 'W ≈ [ {F_0 + F_n}/{2} + F_1 + F_2 + … + F_{n−1} ] Δs cos α', label: T('Trapezoidal method', 'Puolisuunnikasmenetelmä') },
          { id: 't4-trap-lab', type: 'interactive', widget: 'custom', title: T('Trapezoid work from an F,s graph', 'Puolisuunnikas\u00ADtyö F,s-kuvaajasta'),
            caption: T('The preset is the graph of slide p05 (0, 46, 41, 29, 28, 27 N at 1 m steps, α = 35°). Drag the points or use the sliders: the curve and the trapezoids reshape. Press Fill the trapezoids to watch the areas add up to the work.',
              'Esiasetus on kalvon s. 05 kuvaaja (0, 46, 41, 29, 28, 27 N metrin välein, α = 35°). Vedä pisteitä tai käytä säätimiä: käyrä ja puolisuunnikkaat muuttuvat. Paina Täytä puolisuunnikkaat ja katso, kuinka alat summautuvat työksi.'),
            config: dev(TRAP) },
          { id: 't4-vr-ex', type: 'example', title: T('Trapezoids with an angle (slide p05)', 'Puoli\u00ADsuunnikkaat ja kulma (kalvo s. 05)'),
            problem: T('The force values at 1 m steps are 0, 46, 41, 29, 28 and 27 N and the force acts at 35° to the displacement. Calculate the work.', 'Voiman arvot metrin välein ovat 0, 46, 41, 29, 28 ja 27 N, ja voima on 35° kulmassa siirtymään nähden. Laske työ.'),
            given: ['Δs = 1 m', 'α = 35°'],
            steps: [{ tex: 'W ≈ [ {0 + 27 N}/{2} + (46 + 41 + 29 + 28) N ] · 1 m · cos 35°' }, { tex: 'W ≈ (13.5 + 144) J · 0.819 ≈ 129 J' },
              T('The slide rounds this to "100 J" (one significant figure); with two significant figures the work is 130 J.', 'Kalvolla tulos pyöristetään "100 J":ksi (yksi merkitsevä numero); kahdella merkitsevällä numerolla työ on 130 J.')],
            result: T('W ≈ 129 J', 'W ≈ 129 J') },
          { type: 'question', q: 't4-q7', id: 't4-q7-blk' },
          { type: 'question', q: 't4-q8', id: 't4-q8-blk' },
          { id: 't4-vr-h', type: 'h', text: T('General definition: work as a line integral (slide p06)', 'Yleinen määritelmä: työ viivaintegraalina (kalvo s. 06)') },
          { id: 't4-vr-gen', type: 'text', html: T(
            '<p>When a body moves along a curve under a force that is not constant, the work is a <dfn data-term="lineintegral">line integral</dfn> along the curve. Force and displacement are vectors, so the integral splits by components:</p>',
            '<p>Kun kappale liikkuu käyrää pitkin voiman vaikutuksesta, joka ei ole vakio, työ on <dfn data-term="lineintegral">viivaintegraali</dfn> käyrää pitkin. Voima ja siirtymä ovat vektoreita, joten integraali jakautuu komponentteihin:</p>') },
          { id: 't4-vr-line', type: 'formula', key: true, tex: 'W = ∫ F·ds = ∫ F_x dx + ∫ F_y dy + ∫ F_z dz', label: T('Work along a path', 'Työ reittiä pitkin') },
          { id: 't4-vr-ex2', type: 'example', title: T('A path in two legs (slide p06)', 'Reitti kahdessa osassa (kalvo s. 06)'),
            problem: T('An object moves from (0, 0) to (1 m, 0) and from there to (1 m, 2 m) under the force F = a x² i + b y j with a = 3.0 N/m² and b = 1.5 N/m. Calculate the work.', 'Kappale liikkuu pisteestä (0, 0) pisteeseen (1 m, 0) ja sieltä pisteeseen (1 m, 2 m) voiman F = a x² i + b y j vaikutuksesta, a = 3,0 N/m² ja b = 1,5 N/m. Laske työ.'),
            given: ['a = 3.0 N/m²', 'b = 1.5 N/m'],
            steps: [T('On the x-leg y does not change (dy = 0), on the y-leg x does not change (dx = 0): one integral per leg.', 'x-osuudella y ei muutu (dy = 0), y-osuudella x ei muutu (dx = 0): yksi integraali kutakin osuutta kohti.'),
              { tex: 'W = ∫_0^1 a x^2 dx + ∫_0^2 b y dy = a (1 m)^3/3 + b (2 m)^2/2' }, { tex: 'W = 1.0 J + 3.0 J = 4.0 J' },
              T('The slide prints "30 N/m²" for a (a lost comma); the result 4 J needs 3.0.', 'Kalvolla a:n arvo on kirjoitettu "30 N/m²" (pilkku hävinnyt); tulos 4 J vaatii arvon 3,0.')],
            result: T('W = 4 J', 'W = 4 J') },
          { type: 'question', q: 't4-q9', id: 't4-q9-blk' }
        ] },

      // ======================================================== 4.4 pull with friction (p07)
      { id: 't4-pull', title: T('Pulling against friction', 'Vetäminen kitkaa vastaan'),
        blocks: [
          { id: 't4-pl-text', type: 'text', html: T(
            '<p>To find the work of a pull you first need the <b>force</b>, and for that you draw the free-body diagram and write the equations of motion. At constant speed <f>ΣF = 0</f> along both axes. Then <f>W = F s cos α</f>.</p>',
            '<p>Vedon työn laskemiseen tarvitaan ensin <b>voima</b>, ja sitä varten piirretään vapaakappalekuvio ja kirjoitetaan liikeyhtälöt. Vakionopeudella <f>ΣF = 0</f> kummankin akselin suunnassa. Sen jälkeen <f>W = F s cos α</f>.</p>') },
          { type: 'question', q: 't4-q10', id: 't4-q10-blk' },
          { id: 't4-pl-exA', type: 'example', title: T('Horizontal pull (slide p07, A)', 'Vaakasuora veto (kalvo s. 07, A)'),
            problem: T('A 150 kg object is pulled horizontally at the constant speed 4.5 m/s, μ = 0.43. Find the force F and the work W over the distance 4.5 m.', '150 kg:n kappaletta vedetään vaakasuoraan vakionopeudella 4,5 m/s, μ = 0,43. Laske voima F ja työ W 4,5 m:n matkalla.'),
            given: ['m = 150 kg', 'μ = 0.43', 's = 4.5 m'],
            steps: [{ tex: 'ΣF_x = F − F_μ = 0,  ΣF_y = N − m g = 0' }, { tex: 'F = F_μ = μ m g = 0.43 · 150 kg · 9.81 m/s^2 ≈ 633 N' },
              { tex: 'W = F s cos 0° = 633 N · 4.5 m ≈ 2.85 kJ' }, T('The slide uses g = 9.8: 630 N and 2.8 kJ.', 'Kalvolla g = 9,8: 630 N ja 2,8 kJ.')],
            result: T('F ≈ 633 N, W ≈ 2.8 kJ', 'F ≈ 633 N, W ≈ 2,8 kJ') },
          { id: 't4-pl-h', type: 'h', text: T('The same pull at an angle', 'Sama veto vinosti') },
          { type: 'question', q: 't4-q11', id: 't4-q11-blk' },
          { id: 't4-pl-exB', type: 'example', title: T('Pull at 37° (slide p07, B)', 'Veto 37° kulmassa (kalvo s. 07, B)'),
            problem: T('The same object and distance, but the force acts 37° above the horizontal. Find F and W.', 'Sama kappale ja matka, mutta voima vaikuttaa 37° vaakatason yläpuolella. Laske F ja W.'),
            given: ['m = 150 kg', 'μ = 0.43', 'α = 37°'],
            steps: [{ tex: 'ΣF_x = F cos α − F_μ = 0,  ΣF_y = N + F sin α − m g = 0' }, { tex: 'F_μ = μ N = μ (m g − F sin α)' },
              { tex: 'F = {μ m g}/{cos α + μ sin α} = {632.7 N}/{0.799 + 0.259} ≈ 598 N' }, { tex: 'W = F s cos α = 598 N · 4.5 m · 0.799 ≈ 2.15 kJ' },
              T('The slide: 597.7 N and 2.1 kJ (g = 9.8).', 'Kalvolla: 597,7 N ja 2,1 kJ (g = 9,8).')],
            result: T('F ≈ 598 N, W ≈ 2.15 kJ', 'F ≈ 598 N, W ≈ 2,15 kJ') },
          { id: 't4-pull-lab', type: 'interactive', widget: 'custom', title: T('Pull with friction: free-body diagram and work balance', 'Veto kitkaa vastaan: vapaa\u00ADkappale\u00ADkuva ja työtase'),
            caption: T('Set the angle, μ, m and the distance and press Pull. The arrows are the forces on the block (N shrinks as F sin α lifts it). The green bar is the work of the pull, the red bar the work of friction: they are equal and opposite, so the kinetic energy does not change. Try the best angle tan α = μ: the pull is smallest there.',
              'Säädä kulma, μ, m ja matka ja paina Vedä. Nuolet ovat kappaleeseen vaikuttavat voimat (N pienenee, kun F sin α nostaa kappaletta). Vihreä palkki on vedon työ ja punainen palkki kitkan työ: ne ovat yhtä suuret ja vastakkaiset, joten liike-energia ei muutu. Kokeile parasta kulmaa tan α = μ: veto on silloin pienimmillään.'),
            config: dev(PULL) },
          { type: 'question', q: 't4-q12', id: 't4-q12-blk' },
          { type: 'question', q: 't4-q13', id: 't4-q13-blk' }
        ] },

      // ======================================================== 4.5 kinetic and potential energy (p08)
      { id: 't4-energy', title: T('Potential and kinetic energy', 'Potentiaali- ja liike­energia'),
        blocks: [
          { id: 't4-en-pot', type: 'text', html: T(
            '<p>A body can do work because of its position or its speed. <dfn data-term="potential">Potential energy</dfn> is the lifting work: <f>E_p = m g h</f> above the reference level, and it does not depend on the path. <dfn data-term="kinetic">Kinetic energy</dfn> is <f>E_k = ½ m v^2</f>.</p>',
            '<p>Kappale voi tehdä työtä asemansa tai nopeutensa vuoksi. <dfn data-term="potential">Potentiaalienergia</dfn> on nostotyö: <f>E_p = m g h</f> vertailutason yläpuolella, eikä se riipu reitistä. <dfn data-term="kinetic">Liike-energia</dfn> on <f>E_k = ½ m v^2</f>.</p>') },
          { id: 't4-en-f', type: 'columns', cols: [
            [{ id: 't4-en-fp', type: 'formula', key: true, tex: 'E_p = m g h', label: T('Potential energy', 'Potentiaalienergia'), legend: [['h', T('height above the reference level', 'korkeus vertailutason yläpuolella'), 'm']] }],
            [{ id: 't4-en-fk', type: 'formula', key: true, tex: 'E_k = ½ m v^2', label: T('Kinetic energy', 'Liike-energia'), legend: [['v', T('speed', 'nopeus'), 'm/s']] }]] },
          { id: 't4-en-wet', type: 'text', html: T(
            '<p><b>Work-energy theorem.</b> A constant force F along the initial velocity gives the constant acceleration <f>a = F/m</f> and <f>v^2 = v_0^2 + 2 a s</f>. So <f>F s = m a s = ½ m v^2 − ½ m v_0^2</f>: the total work equals the change of the kinetic energy.</p>',
            '<p><b>Työperiaate.</b> Alkunopeuden suuntainen vakiovoima F antaa vakiokiihtyvyyden <f>a = F/m</f> ja <f>v^2 = v_0^2 + 2 a s</f>. Siis <f>F s = m a s = ½ m v^2 − ½ m v_0^2</f>: kokonaistyö on yhtä suuri kuin liike-energian muutos.</p>') },
          { id: 't4-en-wetf', type: 'formula', key: true, tex: 'ΣW = ΔE_k = ½ m v^2 − ½ m v_0^2', label: T('Work-energy theorem', 'Työperiaate') },
          { id: 't4-en-ex1', type: 'example', title: T('Crane (slide p08)', 'Nosturi (kalvo s. 08)'),
            problem: T('A crane lifts 250 kg to the height 45 m at constant speed. How much does the potential energy change?', 'Nosturi nostaa 250 kg:n kuorman 45 m:n korkeuteen vakionopeudella. Kuinka paljon potentiaalienergia muuttuu?'),
            given: ['m = 250 kg', 'h = 45 m'],
            steps: [T('Constant speed: the tension in the cable equals mg, and the lifting work is the change of E_p.', 'Vakionopeus: vaijerin voima on mg, ja nostotyö on E_p:n muutos.'), { tex: 'E_p = m g h = 250 kg · 9.81 m/s^2 · 45 m ≈ 110 kJ' }],
            result: T('ΔE_p ≈ 110 kJ', 'ΔE_p ≈ 110 kJ') },
          { id: 't4-en-ex2', type: 'example', title: T('Vehicle (slide p08)', 'Ajoneuvo (kalvo s. 08)'),
            problem: T('A vehicle of 1250 kg moves at 32 m/s. What is its kinetic energy?', '1250 kg:n ajoneuvo liikkuu nopeudella 32 m/s. Mikä on sen liike-energia?'),
            given: ['m = 1250 kg', 'v = 32 m/s'], steps: [{ tex: 'E_k = ½ m v^2 = ½ · 1250 kg · (32 m/s)^2 = 640 kJ' }], result: T('E_k = 640 kJ', 'E_k = 640 kJ') },
          { type: 'question', q: 't4-q14', id: 't4-q14-blk' },
          { type: 'question', q: 't4-q15', id: 't4-q15-blk' },
          { type: 'question', q: 't4-q16', id: 't4-q16-blk' },
          { type: 'question', q: 't4-q17', id: 't4-q17-blk' }
        ] },

      // ======================================================== 4.6 spring energy (p09)
      { id: 't4-spring', title: T('Spring energy', 'Jousienergia'),
        blocks: [
          { id: 't4-sp-text', type: 'text', html: T(
            '<p>The work done in compressing or stretching a spring is stored as <dfn data-term="springenergy">spring energy</dfn>. The spring force grows linearly, <f>F_j = −k s</f>, so on the F,s graph the work is the area of a <b>triangle</b>.</p>',
            '<p>Jousen puristamiseen tai venyttämiseen tehty työ varastoituu <dfn data-term="springenergy">jousienergiaksi</dfn>. Jousivoima kasvaa lineaarisesti, <f>F_j = −k s</f>, joten F,s-kuvaajassa työ on <b>kolmion</b> ala.</p>') },
          { id: 't4-sp-fig', type: 'figure', svg: FIG_SPR, caption: T('Spring force against compression: the triangle under the line is the stored energy.', 'Jousivoima puristuman funktiona: suoran alle jäävä kolmio on varastoitunut energia.'), alt: T('F,s graph of a spring with the triangle under the line shaded', 'Jousen F,s-kuvaaja, suoran alla oleva kolmio väritetty') },
          { id: 't4-sp-f', type: 'formula', key: true, tex: 'E_j = W = ½ k s^2', label: T('Spring energy', 'Jousienergia'), legend: [['k', T('spring constant', 'jousivakio'), 'N/m'], ['s', T('compression or stretch', 'puristuma tai venymä'), 'm']] },
          { id: 't4-sp-ex1', type: 'example', title: T('Vehicle spring (slide p09)', 'Ajoneuvon jousi (kalvo s. 09)'),
            problem: T('A spring with k = 5300 N/m is compressed 13 cm. How much energy is stored?', 'Jousi, jonka k = 5300 N/m, puristetaan 13 cm. Kuinka paljon energiaa varastoituu?'),
            given: ['k = 5300 N/m', 's = 0.13 m'], steps: [{ tex: 'E_j = ½ k s^2 = ½ · 5300 N/m · (0.13 m)^2 ≈ 45 J' }], result: T('E_j ≈ 45 J', 'E_j ≈ 45 J') },
          { id: 't4-sp-ex2', type: 'example', title: T('How far to compress? (slide p09)', 'Kuinka paljon puristettava? (kalvo s. 09)'),
            problem: T('A spring k = 200 N/m launches a 50 g weight. How much must it be compressed for the launch speed 13 m/s?', 'Jousi k = 200 N/m laukaisee 50 g:n painon. Kuinka paljon jousi on puristettava, jotta lähtönopeus on 13 m/s?'),
            given: ['k = 200 N/m', 'm = 0.050 kg', 'v = 13 m/s'],
            steps: [T('All the spring energy becomes kinetic energy.', 'Koko jousienergia muuttuu liike-energiaksi.'), { tex: '½ k s^2 = ½ m v^2' }, { tex: 's = v sqrt{m/k} = 13 m/s · sqrt{0.050 kg/(200 N/m)} ≈ 0.21 m' }],
            result: T('s ≈ 0.21 m', 's ≈ 0,21 m') },
          { id: 't4-spring-lab', type: 'interactive', widget: 'energy', title: T('Spring launcher: spring energy to kinetic and potential energy', 'Jousi\u00ADlaukaisin: jousienergia liike- ja potentiaali\u00ADenergiaksi'),
            caption: T('Set k and the compression s, then press Release. The bar E_j (spring) turns into E_k and, up the ramp, into E_p; the dashed line marks the highest level the energy can reach. Preset: exercise 4.17 (k = 360 N/m, m = 0.60 kg, s = 12 cm).',
              'Säädä k ja puristuma s ja paina Päästä. Palkki E_j (jousi) muuttuu E_k:ksi ja ylös rampille mentäessä E_p:ksi; katkoviiva osoittaa korkeimman tason, jolle energia riittää. Esiasetus: tehtävä 4.17 (k = 360 N/m, m = 0,60 kg, s = 12 cm).'),
            config: { track: [[0, 0], [2, 0], [5, 1.5], [8, 1.5]], editable: false, spring: true, springLen: 0.8, T: 8, values: { m: 0.6, mu: 0, v0: 0, k: 360, c: 0.12 }, fixed: ['v0'] } },
          { type: 'question', q: 't4-q18', id: 't4-q18-blk' },
          { type: 'question', q: 't4-q19', id: 't4-q19-blk' },
          { type: 'question', q: 't4-q20', id: 't4-q20-blk' },
          { type: 'question', q: 't4-q21', id: 't4-q21-blk' }
        ] },

      // ======================================================== 4.7 mechanical energy (p10)
      { id: 't4-mech', title: T('Conservation of mechanical energy', 'Mekaanisen energian säilyminen'),
        blocks: [
          { id: 't4-me-text', type: 'text', html: T(
            '<p>Without friction the total mechanical energy is constant: <f>E_{p0} + E_{k0} = E_p + E_k</f>. With friction part of the energy is spent on <dfn data-term="frictionwork">friction work</dfn> <f>W_μ</f> (it becomes thermal energy): <f>E_{p0} + E_{k0} = E_p + E_k + W_μ</f>. The energy as a whole is conserved, the <em>mechanical</em> energy is not.</p>',
            '<p>Ilman kitkaa mekaaninen kokonaisenergia on vakio: <f>E_{p0} + E_{k0} = E_p + E_k</f>. Kitkan kanssa osa energiasta kuluu <dfn data-term="frictionwork">kitkatyöhön</dfn> <f>W_μ</f> (se muuttuu lämpöenergiaksi): <f>E_{p0} + E_{k0} = E_p + E_k + W_μ</f>. Energia kokonaisuutena säilyy, <em>mekaaninen</em> energia ei.</p>') },
          { id: 't4-me-f', type: 'formula', key: true, tex: 'E_{p0} + E_{k0} = E_p + E_k + W_μ', label: T('Conservation of energy with friction (W_μ = 0 without friction)', 'Energian säilyminen kitkan kanssa (W_μ = 0 ilman kitkaa)'),
            legend: [['W_μ', T('friction work = F_μ times the path length', 'kitkatyö = F_μ kertaa matkan pituus'), 'J']] },
          { id: 't4-energy-lab', type: 'interactive', widget: 'energy', title: T('Energy lab: a block on a hill', 'Energia\u00ADlaboratorio: kappale mäellä'),
            caption: T('Drag the knots (or h₁…h₅) to reshape the hill, choose the start with the block or the start slider, and press Release. With μ = 0 the bars E_p and E_k trade places and the sum stays constant; add friction and the bar W_μ grows until the block stops. The dashed line shows the highest level the remaining energy can reach.',
              'Vedä solmuja (tai säätimiä h₁…h₅) muuttaaksesi mäen muotoa, valitse lähtöpaikka kappaleesta tai lähtösäätimestä ja paina Päästä. Kun μ = 0, palkit E_p ja E_k vaihtavat paikkaa ja summa pysyy vakiona; lisää kitka, niin palkki W_μ kasvaa, kunnes kappale pysähtyy. Katkoviiva osoittaa korkeimman tason, jolle jäljellä oleva energia riittää.'),
            config: { track: [[0, 4], [3, 0.6], [6, 2.6], [9, 0.4], [12, 3]], values: { m: 1, mu: 0, v0: 0 }, fixed: ['v0', 'm'], T: 12 } },   // m cancels out of the motion: no slider
          { id: 't4-me-ex1', type: 'example', title: T('How high from the kinetic energy? (slide p10)', 'Kuinka korkealle liike-energialla? (kalvo s. 10)'),
            problem: T('A vehicle moves at 90 km/h. How high could it be lifted with its kinetic energy?', 'Ajoneuvo liikkuu nopeudella 90 km/h. Kuinka korkealle se voitaisiin nostaa liike-energiallaan?'),
            given: ['v = 90 km/h = 25 m/s'],
            steps: [{ tex: '½ m v^2 = m g h' }, T('The mass cancels.', 'Massa supistuu.'), { tex: 'h = {v^2}/{2 g} = {(25 m/s)^2}/{2 · 9.81 m/s^2} ≈ 31.9 m' }, T('The slide rounds to 30 m (g = 9.8, one significant figure).', 'Kalvolla pyöristys on 30 m (g = 9,8, yksi merkitsevä numero).')],
            result: T('h ≈ 32 m', 'h ≈ 32 m') },
          { type: 'question', q: 't4-q22', id: 't4-q22-blk' },
          { id: 't4-me-h-ramp', type: 'h', text: T('A ramp: free-body diagram and energy', 'Ramppi: vapaakappalekuvio ja energia') },
          { id: 't4-me-ramp', type: 'text', html: T(
            '<p>On a ramp the free-body diagram tells you which forces <b>do work</b>: the normal force is perpendicular to the motion and does none, gravity does <f>m g h</f>. On a frictionless ramp energy conservation then gives the speed at once, without the angle: <f>v = sqrt{2 g h}</f>.</p>',
            '<p>Rampilla vapaakappalekuvio kertoo, mitkä voimat <b>tekevät työtä</b>: tukivoima on kohtisuorassa liikettä vastaan eikä tee työtä, painovoima tekee työn <f>m g h</f>. Kitkattomalla rampilla energian säilyminen antaa nopeuden heti ilman kulmaa: <f>v = sqrt{2 g h}</f>.</p>') },
          { type: 'question', q: 't4-q23', id: 't4-q23-blk' },
          { type: 'question', q: 't4-q24', id: 't4-q24-blk' },
          { id: 't4-me-h-fr', type: 'h', text: T('Friction loss and braking', 'Kitkahäviö ja jarrutus') },
          { id: 't4-me-ex2', type: 'example', title: T('Braking distance (slide p10)', 'Jarrutus\u00ADmatka (kalvo s. 10)'),
            problem: T('A vehicle at 90 km/h brakes on a flat road, μ = 0.65. Find the braking distance.', 'Ajoneuvo jarruttaa nopeudesta 90 km/h vaakasuoralla tiellä, μ = 0,65. Laske jarrutusmatka.'),
            given: ['v = 25 m/s', 'μ = 0.65'],
            steps: [T('All the kinetic energy is turned into friction work.', 'Koko liike-energia muuttuu kitkatyöksi.'), { tex: '½ m v^2 = μ m g s' }, { tex: 's = {v^2}/{2 μ g} = {(25 m/s)^2}/{2 · 0.65 · 9.81 m/s^2} ≈ 49 m' }, T('Double the speed and the distance becomes four times as long.', 'Kaksinkertainen nopeus nelinkertaistaa matkan.')],
            result: T('s ≈ 49 m', 's ≈ 49 m') },
          { id: 't4-friction-lab', type: 'interactive', widget: 'energy', title: T('Braking: friction work stops the car', 'Jarrutus: kitkatyö pysäyttää auton'),
            caption: T('A car on a flat road. The bar E_k turns completely into the bar W_μ. Change the speed v₀ and μ and watch the stopping distance: it grows with the square of the speed (preset: exercise 68, 50 km/h ≈ 14 m/s).',
              'Auto tasaisella tiellä. Palkki E_k muuttuu kokonaan palkiksi W_μ. Muuta nopeutta v₀ ja kerrointa μ ja seuraa pysähtymismatkaa: se kasvaa nopeuden neliön mukaan (esiasetus: tehtävä 68, 50 km/h ≈ 14 m/s).'),
            config: { track: [[0, 0], [100, 0]], editable: false, T: 12, eMax: 330000, values: { m: 1000, mu: 0.33, v0: 14 }, fixed: [], ranges: { m: { min: 100, max: 2000, step: 100 }, mu: { min: 0.2, max: 1, step: 0.01 }, v0: { max: 18 } } } },
          { type: 'question', q: 't4-q25', id: 't4-q25-blk' },
          { type: 'question', q: 't4-q26', id: 't4-q26-blk' },
          { type: 'question', q: 't4-q27', id: 't4-q27-blk' },
          { type: 'question', q: 't4-q28', id: 't4-q28-blk' },
          { type: 'question', q: 't4-q29', id: 't4-q29-blk' },
          { type: 'question', q: 't4-q30', id: 't4-q30-blk' },
          { type: 'question', q: 't4-q31', id: 't4-q31-blk' }
        ] },

      // ======================================================== 4.8 power (p11, p12)
      { id: 't4-power', title: T('Power', 'Teho'),
        blocks: [
          { id: 't4-pw-text', type: 'text', html: T(
            '<p><dfn data-term="power">Power</dfn> tells how quickly work is done. The <dfn data-term="instpower">instantaneous power</dfn> is <f>P = dW/dt</f>; when the time needed for the work is known, the <dfn data-term="avgpower">average power</dfn> is <f>P_k = W/t</f>. Unit: <f>1 W = 1 J/s</f>.</p>',
            '<p><dfn data-term="power">Teho</dfn> kertoo, kuinka nopeasti työ tehdään. <dfn data-term="instpower">Hetkellinen teho</dfn> on <f>P = dW/dt</f>; kun työhön kuluva aika tunnetaan, <dfn data-term="avgpower">keskiteho</dfn> on <f>P_k = W/t</f>. Yksikkö: <f>1 W = 1 J/s</f>.</p>') },
          { id: 't4-pw-ex1', type: 'example', title: T('Crane (slide p11)', 'Nosturi (kalvo s. 11)'),
            problem: T('A crane lifts 950 kg to 25 m in 2.5 minutes. What is the required lifting power?', 'Nosturi nostaa 950 kg:n 25 m:n korkeuteen 2,5 minuutissa. Mikä on tarvittava nostoteho?'),
            given: ['m = 950 kg', 'h = 25 m', 't = 2.5 min = 150 s'],
            steps: [{ tex: 'T = m g' }, { tex: 'W = m g h' }, { tex: 'P_k = {W}/{t} = {950 kg · 9.81 m/s^2 · 25 m}/{150 s} ≈ 1.55 kW' }], result: T('P_k ≈ 1.6 kW', 'P_k ≈ 1,6 kW') },
          { id: 't4-pw-fv', type: 'text', html: T(
            '<p>Since <f>dW = F ds cos α</f> and <f>ds/dt = v</f>, the power of a force is its force times the speed along it:</p>',
            '<p>Koska <f>dW = F ds cos α</f> ja <f>ds/dt = v</f>, voiman teho on voima kertaa nopeus sen suunnassa:</p>') },
          { id: 't4-pw-f', type: 'formula', key: true, tex: 'P = F v cos α = F · v', label: T('Power and force', 'Teho ja voima'), legend: [['α', T('angle between F and v', 'voiman ja nopeuden välinen kulma'), '°']] },
          { id: 't4-pw-ex2', type: 'example', title: T('Van on a flat road (slide p12)', 'Pakettiauto tasaisella tiellä (kalvo s. 12)'),
            problem: T('A van drives at the constant speed 108 km/h. The rolling resistance is 190 N and the air resistance 360 N. What power is needed at the driving wheels?', 'Pakettiauto ajaa vakionopeudella 108 km/h. Vierintävastus on 190 N ja ilmanvastus 360 N. Mikä teho tarvitaan vetäville pyörille?'),
            given: ['v = 108 km/h = 30 m/s', 'R_1 = 190 N', 'R_2 = 360 N'],
            steps: [{ tex: 'F − R_1 − R_2 = 0  →  F = 550 N' }, { tex: 'P = F v cos 0° = 550 N · 30 m/s = 16.5 kW' }], result: T('P = 16.5 kW ≈ 17 kW', 'P = 16,5 kW ≈ 17 kW') },
          { type: 'question', q: 't4-q32', id: 't4-q32-blk' },
          { type: 'question', q: 't4-q33', id: 't4-q33-blk' },
          { type: 'question', q: 't4-q34', id: 't4-q34-blk' },
          { type: 'question', q: 't4-q35', id: 't4-q35-blk' },
          { type: 'question', q: 't4-q36', id: 't4-q36-blk' },
          { id: 't4-pw-h', type: 'h', text: T('A car on a hill (exercise 4.4)', 'Auto mäessä (tehtävä 4.4)') },
          { id: 't4-pw-ex44', type: 'text', html: T(
            '<p>A car coasts <b>down</b> a hill in neutral at the constant speed 18 m/s. Then the resistance <f>R</f> exactly balances the downhill pull of gravity, <f>R = m g sin α</f>. To drive <b>up</b> the same hill at the same speed the engine must supply the force <f>F = R + m g sin α = 2 m g sin α</f>, and the power is <f>P = F v</f>.</p>',
            '<p>Auto vierii <b>alas</b> mäkeä vapaalla vakionopeudella 18 m/s. Silloin vastus <f>R</f> tasapainottaa täsmälleen painovoiman alamäkikomponentin, <f>R = m g sin α</f>. Jotta mäkeä päästäisiin <b>ylös</b> samalla nopeudella, moottorin on tuotettava voima <f>F = R + m g sin α = 2 m g sin α</f>, ja teho on <f>P = F v</f>.</p>') },
          { id: 't4-hill-lab', type: 'interactive', widget: 'custom', title: T('Power on a hill: coasting down, driving up', 'Teho mäessä: vierintä alas, ajo ylös'),
            caption: T('Press Coast down: the resistance R is set to balance m g sin α, and the car rolls at constant speed. Then press Drive up: the engine must overcome R and the slope, and the bar shows the power P = F v split into R v and m g sin α · v. (The slope is drawn steeper than it is.) Preset: exercise 4.4.',
              'Paina Vierii alas: vastus R säädetään tasapainottamaan m g sin α, ja auto vierii vakionopeudella. Paina sitten Aja ylös: moottorin on voitettava vastus R ja rinne, ja palkki näyttää tehon P = F v jaettuna osiin R v ja m g sin α · v. (Rinne on piirretty todellista jyrkemmäksi.) Esiasetus: tehtävä 4.4.'),
            config: dev(HILL) },
          { type: 'question', q: 't4-q37', id: 't4-q37-blk' },
          { type: 'question', q: 't4-q38', id: 't4-q38-blk' }
        ] },

      // ======================================================== 4.9 efficiency (p13, p14)
      { id: 't4-eff', title: T('Efficiency', 'Hyötysuhde'),
        blocks: [
          { id: 't4-ef-text', type: 'text', html: T(
            '<p>The <dfn data-term="efficiency">efficiency</dfn> is the work, energy or power a machine delivers divided by what is put into it. It is always between 0 and 1: if η = 1, the machine would be a <dfn data-term="perpetual">perpetual motion machine</dfn> without any losses.</p>',
            '<p><dfn data-term="efficiency">Hyötysuhde</dfn> on koneen antama työ, energia tai teho jaettuna siihen syötetyllä määrällä. Se on aina välillä 0…1: jos η = 1, kone olisi <dfn data-term="perpetual">ikiliikkuja</dfn> ilman häviöitä.</p>') },
          { id: 't4-ef-f', type: 'formula', key: true, tex: 'η = {W_{out}}/{W_{in}} = {E_{out}}/{E_{in}} = {P_{out}}/{P_{in}},  0 < η < 1', label: T('Efficiency (in = input, out = output)', 'Hyötysuhde (in = otto, out = anto)') },
          { id: 't4-ef-ex1', type: 'example', title: T('Water pump (slide p13)', 'Vesipumppu (kalvo s. 13)'),
            problem: T('In 13 s a pump lifts 12 kg of water to the height 9.5 m. The electrical (input) power is 170 W. Find the efficiency.', 'Pumppu nostaa 13 s:ssa 12 kg vettä 9,5 m:n korkeuteen. Sähköinen ottoteho on 170 W. Laske hyötysuhde.'),
            given: ['m = 12 kg', 'h = 9.5 m', 't = 13 s', 'P_in = 170 W'],
            steps: [{ tex: 'P_{out} = {m g h}/{t} = {12 kg · 9.81 m/s^2 · 9.5 m}/{13 s} ≈ 86 W' }, { tex: 'η = {P_{out}}/{P_{in}} = {86 W}/{170 W} ≈ 0.51 = 51 %' }], result: T('η ≈ 51 %', 'η ≈ 51 %') },
          { id: 't4-pump-lab', type: 'interactive', widget: 'custom', title: T('Water pump: lifting, speed and efficiency', 'Vesipumppu: nosto, nopeus ja hyötysuhde'),
            caption: T('Choose the flow, the depth of the well, the speed of the water leaving the pipe and the efficiency of the motor, then Run the pump. The output power is the lifting power m g h per second plus the kinetic power ½ m v² per second; the grid must supply the larger input power P_out/η. Preset: exercise 4.10.',
              'Valitse virtaama, kaivon syvyys, putkesta tulevan veden nopeus ja moottorin hyötysuhde ja käynnistä pumppu. Antoteho on nostoteho m g h sekunnissa plus liike-energiateho ½ m v² sekunnissa; verkon on annettava suurempi ottoteho P_out/η. Esiasetus: tehtävä 4.10.'),
            config: dev(PUMP) },
          { type: 'question', q: 't4-q39', id: 't4-q39-blk' },
          { type: 'question', q: 't4-q40', id: 't4-q40-blk' },
          { id: 't4-ef-h', type: 'h', text: T('Total efficiency (slide p14)', 'Kokonaishyötysuhde (kalvo s. 14)') },
          { id: 't4-ef-tot', type: 'text', html: T(
            '<p>When a drive is a chain of parts (motor, clutch, gearbox, driven machine) the <dfn data-term="toteff">total efficiency</dfn> is the <b>product</b> of the efficiencies of all the parts. The lost power <f>P_h = P_in − P_out</f> ends up as heat.</p>',
            '<p>Kun voimansiirto on osien ketju (moottori, kytkin, vaihde, käyttölaite), <dfn data-term="toteff">kokonaishyötysuhde</dfn> on kaikkien osien hyötysuhteiden <b>tulo</b>. Häviöteho <f>P_h = P_in − P_out</f> päätyy lämmöksi.</p>') },
          { id: 't4-ef-totf', type: 'formula', key: true, tex: 'η = η_1 η_2 η_3 η_4 …', label: T('Total efficiency', 'Kokonaishyötysuhde') },
          { id: 't4-chain-lab', type: 'interactive', widget: 'custom', title: T('Efficiency chain: where the power goes', 'Hyötysuhde\u00ADketju: minne teho menee'),
            caption: T('A passenger car (slide p14): engine, clutch, transmission, differential and final drive. Press Send the power through and watch the blue flow shrink at every stage while the red losses drop out. Move any η: the total is the product, and one poor stage ruins the chain.',
              'Henkilöauto (kalvo s. 14): moottori, kytkin, vaihteisto, tasauspyörästö ja pääpyörä. Paina Lähetä teho läpi ja katso, kuinka sininen virta kapenee joka vaiheessa ja punaiset häviöt putoavat pois. Muuta mitä tahansa η:aa: kokonaishyötysuhde on tulo, ja yksi huono vaihe pilaa ketjun.'),
            config: dev(CHAIN) },
          { id: 't4-ef-ex2', type: 'example', title: T('Nuclear power plant (slide p14)', 'Ydinvoima\u00ADlaitos (kalvo s. 14)'),
            problem: T('A nuclear power plant delivers the electrical output 1600 MW with the efficiency 0.33. Find the input power and the dissipated power.', 'Ydinvoimalaitoksen sähköinen antoteho on 1600 MW ja hyötysuhde 0,33. Laske ottoteho ja häviöteho.'),
            given: ['P_out = 1600 MW', 'η = 0.33'],
            steps: [{ tex: 'P_{in} = {P_{out}}/η = {1600 MW}/{0.33} ≈ 4.8 GW' }, { tex: 'P_h = P_{in} − P_{out} = 4848 MW − 1600 MW ≈ 3.2 GW' }], result: T('P_in ≈ 4.8 GW, P_h ≈ 3.2 GW', 'P_in ≈ 4,8 GW, P_h ≈ 3,2 GW') },
          { type: 'question', q: 't4-q41', id: 't4-q41-blk' },
          { type: 'question', q: 't4-q42', id: 't4-q42-blk' },
          { type: 'question', q: 't4-q43', id: 't4-q43-blk' },
          { type: 'question', q: 't4-q44', id: 't4-q44-blk' },
          { type: 'question', q: 't4-q45', id: 't4-q45-blk' },
          { type: 'question', q: 't4-q46', id: 't4-q46-blk' }
        ] }
    ],
    questions: [
      // ---- 4.1
      { id: 't4-q1', mode: 'practice', type: 'fill', difficulty: 1,
        prompt: T('Fill in the names of the units (one word each).', 'Täydennä yksiköiden nimet (yksi sana kumpaankin).'),
        text: T('Work is measured in [[a]] (1 N·m) and power in [[b]] (1 J/s).', 'Työn yksikkö on [[a]] (1 N·m) ja tehon yksikkö on [[b]] (1 J/s).'),
        fields: [{ id: 'a', kind: 'text' }, { id: 'b', kind: 'text' }],
        hints: [T('Both are named after British physicists, one for the unit of energy, one for the steam engine.', 'Molemmat on nimetty brittiläisten tutkijoiden mukaan: toinen on energian yksikkö, toinen liittyy höyrykoneeseen.')] },
      { id: 't4-q2', mode: 'practice', type: 'match', difficulty: 1,
        prompt: T('Match each quantity with its formula.', 'Yhdistä kukin suure kaavaansa.'),
        left: [{ id: 'k', html: T('kinetic energy', 'liike-energia') }, { id: 'p', html: T('potential energy (height)', 'potentiaalienergia (korkeus)') }, { id: 'j', html: T('spring energy', 'jousienergia') }, { id: 'w', html: T('power of a force', 'voiman teho') }, { id: 'e', html: T('efficiency', 'hyötysuhde') }],
        right: [{ id: 'r1', html: '<f>m g h</f>' }, { id: 'r2', html: '<f>½ m v^2</f>' }, { id: 'r3', html: '<f>F v cos α</f>' }, { id: 'r4', html: '<f>½ k s^2</f>' }, { id: 'r5', html: '<f>P_{out}/P_{in}</f>' }],
        hints: [T('Check the units: which formula gives J, which W, which a pure number?', 'Tarkista yksiköt: mikä kaava antaa J, mikä W ja mikä pelkän luvun?')] },
      // ---- 4.2
      { id: 't4-q3', mode: 'practice', type: 'numeric', difficulty: 1,
        prompt: T('A force of 500 N acts on a block that moves 10 m, but the force points exactly <b>against</b> the motion (α = 180°). Calculate the work of the force.', '500 N:n voima vaikuttaa kappaleeseen, joka liikkuu 10 m, mutta voima osoittaa täsmälleen liikettä <b>vastaan</b> (α = 180°). Laske voiman työ.'),
        fields: [{ id: 'W', tex: 'W', unit: 'J' }],
        hints: [T('W = F s cos α. What is cos 180°?', 'W = F s cos α. Mikä on cos 180°?')] },
      { id: 't4-q4', mode: 'practice', type: 'mc', difficulty: 1,
        prompt: T('A 500 N force acts on a block that moves 10 m. At which angle between the force and the displacement is the work zero?', '500 N:n voima vaikuttaa kappaleeseen, joka liikkuu 10 m. Millä voiman ja siirtymän välisellä kulmalla työ on nolla?'),
        options: [{ id: 'a', html: '0°' }, { id: 'b', html: '90°' }, { id: 'c', html: '45°' }, { id: 'd', html: '180°' }],
        hints: [T('Which angle has cos α = 0?', 'Millä kulmalla cos α = 0?')] },
      { id: 't4-q5', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('A crate is pulled 12 m along the floor with a force of 40 N that points 30° above the horizontal. Calculate the work of the pulling force.', 'Laatikkoa vedetään lattiaa pitkin 12 m 40 N:n voimalla, joka osoittaa 30° vaakatason yläpuolelle. Laske vetävän voiman työ.'),
        fields: [{ id: 'W', tex: 'W', unit: 'J' }],
        hints: [T('Only the component along the displacement counts: F cos α.', 'Vain siirtymän suuntainen komponentti lasketaan: F cos α.')] },
      { id: 't4-q6', mode: 'practice', type: 'multi', difficulty: 2,
        prompt: T('Which of these forces do <b>negative</b> work? Select all.', 'Mitkä seuraavista voimista tekevät <b>negatiivista</b> työtä? Valitse kaikki.'),
        options: [{ id: 'a', html: T('friction on a sliding box', 'liukuvaan laatikkoon vaikuttava kitka') }, { id: 'b', html: T('gravity on a ball that is rising', 'nousevaan palloon vaikuttava painovoima') },
                  { id: 'c', html: T('the normal force of the floor on a sliding box', 'liukuvaan laatikkoon vaikuttava lattian tukivoima') }, { id: 'd', html: T('the cable force on a load that is being lowered', 'laskettavaan kuormaan vaikuttava vaijerin voima') },
                  { id: 'e', html: T('the push of a hand on a cart it accelerates', 'käden työntö vaunuun, jota se kiihdyttää') }],
        hints: [T('Negative work: the force has a component against the displacement (α > 90°).', 'Negatiivinen työ: voimalla on siirtymää vastaan oleva komponentti (α > 90°).')] },
      // ---- 4.3
      { id: 't4-q7', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('A force acts along the displacement. At s = 0, 1, 2, 3 and 4 m it is 0, 12, 20, 16 and 8 N. Use the trapezoidal method to find the work.', 'Voima vaikuttaa siirtymän suuntaan. Kohdissa s = 0, 1, 2, 3 ja 4 m se on 0, 12, 20, 16 ja 8 N. Laske työ puolisuunnikasmenetelmällä.'),
        fields: [{ id: 'W', tex: 'W', unit: 'J' }],
        hints: [T('End values count half, inner values in full, times Δs = 1 m.', 'Päätearvot lasketaan puolella, väliarvot kokonaan, kerrottuna Δs = 1 m.')] },
      { id: 't4-q8', mode: 'graded', type: 'numeric', difficulty: 3,
        prompt: T('The force acts at 20° to the displacement. Its values every 0.5 m are 0, 30, 40, 36, 20 and 10 N. Calculate the work with the trapezoidal method.', 'Voima on 20° kulmassa siirtymään nähden. Sen arvot 0,5 m välein ovat 0, 30, 40, 36, 20 ja 10 N. Laske työ puolisuunnikasmenetelmällä.'),
        fields: [{ id: 'W', tex: 'W', unit: 'J' }], tol: 0.02,
        hints: [T('Here Δs = 0.5 m, not 1 m.', 'Tässä Δs = 0,5 m eikä 1 m.'), T('First the bracket (F_0 + F_5)/2 + F_1 + … + F_4, then × Δs, then × cos α.', 'Ensin sulku (F_0 + F_5)/2 + F_1 + … + F_4, sitten × Δs ja sitten × cos α.')] },
      { id: 't4-q9', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('An object moves from (0, 0) to (2.0 m, 0) and from there to (2.0 m, 3.0 m) under the force F = a x² i + b y j, a = 2.0 N/m², b = 1.0 N/m. Calculate the work.', 'Kappale liikkuu pisteestä (0, 0) pisteeseen (2,0 m, 0) ja sieltä pisteeseen (2,0 m, 3,0 m) voiman F = a x² i + b y j vaikutuksesta, a = 2,0 N/m², b = 1,0 N/m. Laske työ.'),
        fields: [{ id: 'W', tex: 'W', unit: 'J' }],
        hints: [T('One integral per leg: ∫ a x² dx along x, ∫ b y dy along y.', 'Yksi integraali kutakin osuutta kohti: ∫ a x² dx x-suunnassa, ∫ b y dy y-suunnassa.')] },
      // ---- 4.4 pull with friction
      { id: 't4-q10', mode: 'practice', type: 'fbd', difficulty: 2,
        prompt: T('The 150 kg object of slide p07 is pulled to the right with a horizontal force at constant speed. Draw its free-body diagram: give each force a direction (or "not acting") and set the arrow lengths so that the compared pairs are right.',
          'Kalvon s. 07 150 kg:n kappaletta vedetään oikealle vaakasuoralla voimalla vakionopeudella. Piirrä sen vapaakappalekuvio: anna jokaiselle voimalle suunta (tai "ei vaikuta") ja säädä nuolten pituudet niin, että verrattavat parit ovat oikein.'),
        hints: [T('Constant speed means ΣF = 0 along both axes.', 'Vakionopeus tarkoittaa, että ΣF = 0 kummankin akselin suunnassa.'), T('The object touches only the floor and the rope.', 'Kappale koskettaa vain lattiaa ja köyttä.')],
        widget: { name: 'fbd', config: { scene: 'floor',
          forces: [{ id: 'G', tex: 'mg' }, { id: 'N', tex: 'N' }, { id: 'F', tex: 'F' }, { id: 'Fm', tex: 'F_μ' }, { id: 'Fv', label: T('force of motion', 'liikkeen voima') }, { id: 'Np', label: T('object\'s push on the floor N′', 'kappaleen paine lattiaan N′') }],
          compare: [['F', 'Fm'], ['N', 'G']] } } },
      { id: 't4-q11', mode: 'practice', type: 'fbd', difficulty: 3,
        prompt: T('Now the same object is pulled to the right by a rope that rises at 37° above the horizontal, still at constant speed. Draw the free-body diagram and compare the arrow lengths.',
          'Nyt samaa kappaletta vetää oikealle köysi, joka nousee 37° vaakatason yläpuolelle, yhä vakionopeudella. Piirrä vapaakappalekuvio ja vertaa nuolten pituuksia.'),
        hints: [T('The vertical part of the pull holds up part of the weight.', 'Vedon pystykomponentti kannattelee osan painosta.'), T('So N is smaller than mg, and the friction μ N is smaller than before.', 'Siksi N on pienempi kuin mg ja kitka μ N on pienempi kuin ennen.')],
        widget: { name: 'fbd', config: { scene: 'floor', rope: 37,
          forces: [{ id: 'G', tex: 'mg' }, { id: 'N', tex: 'N' }, { id: 'F', tex: 'F' }, { id: 'Fm', tex: 'F_μ' }, { id: 'Fv', label: T('force of motion', 'liikkeen voima') }],
          compare: [['N', 'G'], ['F', 'Fm']] } } },
      { id: 't4-q12', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.03,
        prompt: T('A 150 kg object is pulled horizontally at constant speed over 4.5 m on a floor with μ = 0.43. Calculate a) the pulling force F and b) the work of F. (Slide p07, A)', '150 kg:n kappaletta vedetään vaakasuoraan vakionopeudella 4,5 m lattialla, jossa μ = 0,43. Laske a) vetävä voima F ja b) F:n työ. (Kalvo s. 07, A)'),
        fields: [{ id: 'F', tex: 'F', unit: 'N' }, { id: 'W', tex: 'W', unit: 'J' }],
        hints: [T('a) Constant speed: F = F_μ = μ m g.', 'a) Vakionopeus: F = F_μ = μ m g.'), T('b) F is along the displacement: W = F s.', 'b) F on siirtymän suuntainen: W = F s.')] },
      { id: 't4-q13', mode: 'graded', type: 'numeric', difficulty: 3, tol: 0.03,
        prompt: T('The same object, μ and distance, but the force acts 37° above the horizontal. Calculate a) the force F and b) its work. (Slide p07, B)', 'Sama kappale, μ ja matka, mutta voima vaikuttaa 37° vaakatason yläpuolella. Laske a) voima F ja b) sen työ. (Kalvo s. 07, B)'),
        fields: [{ id: 'F', tex: 'F', unit: 'N' }, { id: 'W', tex: 'W', unit: 'J' }],
        hints: [T('y: N = m g − F sin α, so F_μ = μ (m g − F sin α).', 'y: N = m g − F sin α, joten F_μ = μ (m g − F sin α).'), T('x: F cos α = F_μ. Solve F, then W = F s cos α.', 'x: F cos α = F_μ. Ratkaise F ja laske W = F s cos α.')] },
      // ---- 4.5
      { id: 't4-q14', mode: 'practice', type: 'numeric', difficulty: 1,
        prompt: T('A crane lifts a 250 kg load at constant speed to the height 45 m. By how much does the potential energy of the load change?', 'Nosturi nostaa 250 kg:n kuorman vakionopeudella 45 m:n korkeuteen. Kuinka paljon kuorman potentiaalienergia muuttuu?'),
        fields: [{ id: 'E', tex: 'ΔE_p', unit: 'J' }],
        hints: [T('E_p = m g h with g = 9.81 m/s².', 'E_p = m g h, g = 9,81 m/s².')] },
      { id: 't4-q15', mode: 'practice', type: 'numeric', difficulty: 1,
        prompt: T('A vehicle of 1250 kg moves at 32 m/s. Calculate its kinetic energy.', '1250 kg:n ajoneuvo liikkuu nopeudella 32 m/s. Laske sen liike-energia.'),
        fields: [{ id: 'E', tex: 'E_k', unit: 'J' }],
        hints: [T('E_k = ½ m v². Square the speed first.', 'E_k = ½ m v². Korota nopeus ensin toiseen potenssiin.')] },
      { id: 't4-q16', mode: 'graded', type: 'mc', difficulty: 1,
        prompt: T('A car doubles its speed. Its kinetic energy becomes', 'Auto kaksinkertaistaa nopeutensa. Sen liike-energiasta tulee'),
        options: [{ id: 'a', html: T('2 times as large', 'kaksinkertainen') }, { id: 'b', html: T('4 times as large', 'nelinkertainen') }, { id: 'c', html: T('8 times as large', 'kahdeksankertainen') }, { id: 'd', html: T('unchanged', 'ennallaan') }],
        hints: [T('E_k contains v squared.', 'E_k sisältää nopeuden neliön.')] },
      { id: 't4-q17', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('The 1250 kg vehicle moving at 32 m/s brakes with a constant force and stops in 80 m. How large is the braking force? Use the work-energy theorem.', 'Edellinen 1250 kg:n ajoneuvo, nopeus 32 m/s, jarruttaa vakiovoimalla ja pysähtyy 80 m:ssä. Kuinka suuri on jarruttava voima? Käytä työperiaatetta.'),
        fields: [{ id: 'F', tex: 'F', unit: 'N' }],
        hints: [T('The work of the braking force is negative and equals the change of E_k: −F s = 0 − E_k0.', 'Jarruttavan voiman työ on negatiivinen ja yhtä suuri kuin E_k:n muutos: −F s = 0 − E_k0.')] },
      // ---- 4.6
      { id: 't4-q18', mode: 'practice', type: 'numeric', difficulty: 1,
        prompt: T('A spring with k = 5300 N/m is compressed 13 cm. How much energy is stored in it?', 'Jousi, jonka k = 5300 N/m, puristetaan 13 cm. Kuinka paljon energiaa siihen varastoituu?'),
        fields: [{ id: 'E', tex: 'E_j', unit: 'J' }],
        hints: [T('E_j = ½ k s². Convert 13 cm to metres first.', 'E_j = ½ k s². Muunna 13 cm ensin metreiksi.')] },
      { id: 't4-q19', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.04,
        prompt: T('A spring with k = 200 N/m launches a weight of 50 g at 13 m/s. How much must it be compressed?', 'Jousi k = 200 N/m laukaisee 50 g:n painon nopeudella 13 m/s. Kuinka paljon se on puristettava?'),
        fields: [{ id: 's', tex: 's', unit: 'm' }],
        hints: [T('All the spring energy becomes kinetic energy: ½ k s² = ½ m v².', 'Koko jousienergia muuttuu liike-energiaksi: ½ k s² = ½ m v².'), T('Use the mass in kilograms.', 'Käytä massaa kilogrammoina.')] },
      { id: 't4-q20', mode: 'practice', type: 'slider', difficulty: 2, tol: 0.03,
        prompt: T('A 0.50 kg block is launched by a spring (k = 250 N/m) up a frictionless ramp. Set the compression s so that the block rises to the height 1.0 m above its start. The widget reads the highest point reached.',
          '0,50 kg:n kappale laukaistaan jousella (k = 250 N/m) ylös kitkatonta ramppia. Säädä puristuma s niin, että kappale nousee 1,0 m korkeudelle lähtötasonsa yläpuolelle. Sovelma lukee saavutetun korkeimman kohdan.'),
        hints: [T('At the highest point all the spring energy has become potential energy: ½ k s² = m g h.', 'Korkeimmassa kohdassa koko jousienergia on muuttunut potentiaalienergiaksi: ½ k s² = m g h.'), T('Compute s first, then set the slider and Release to check.', 'Laske s ensin, säädä sitten säädin ja tarkista Päästä-painikkeella.')],
        widget: { name: 'energy', config: { track: [[0, 0], [2, 0], [5, 1.5], [8, 1.5]], editable: false, spring: true, springLen: 0.8, T: 6,
          values: { m: 0.5, mu: 0, v0: 0, k: 250, c: 0.1 }, fixed: ['m', 'mu', 'v0', 'k'], ranges: { c: { step: 0.005 } },
          answer: function (p, st) { return { v: Math.max.apply(null, st.R.y) }; } } } },
      { id: 't4-q21', mode: 'graded', type: 'numeric', difficulty: 2,
        prompt: T('A piece and a spring have the joint mass 0.60 kg; the spring constant is 360 N/m. The spring is compressed 12 cm against a wall on a frictionless horizontal surface and released. What is the speed of the object when the spring has relaxed? (Exercise 4.17)',
          'Kappaleen ja jousen yhteinen massa on 0,60 kg ja jousivakio 360 N/m. Jousi on puristettu 12 cm seinää vasten kitkattomalla vaakasuoralla alustalla ja päästetään irti. Mikä on kappaleen nopeus, kun jousi on palautunut? (Tehtävä 4.17)'),
        fields: [{ id: 'v', tex: 'v', unit: 'm/s' }],
        hints: [T('No friction: E_j = E_k.', 'Ei kitkaa: E_j = E_k.'), T('v = s sqrt(k/m).', 'v = s sqrt(k/m).')] },
      // ---- 4.7
      { id: 't4-q22', mode: 'practice', type: 'numeric', difficulty: 1, tol: 0.07,
        prompt: T('A vehicle moves at 90 km/h. How high could its kinetic energy lift it? (Slide p10)', 'Ajoneuvo liikkuu nopeudella 90 km/h. Kuinka korkealle sen liike-energia voisi sen nostaa? (Kalvo s. 10)'),
        fields: [{ id: 'h', tex: 'h', unit: 'm' }],
        hints: [T('Convert to m/s first (÷ 3.6).', 'Muunna ensin m/s:ksi (÷ 3,6).'), T('½ m v² = m g h: the mass cancels.', '½ m v² = m g h: massa supistuu.')] },
      { id: 't4-q23', mode: 'practice', type: 'fbd', difficulty: 2,
        prompt: T('A block slides down a frictionless ramp of 40°. Draw its free-body diagram and compare N with mg.', 'Kappale liukuu alas kitkatonta 40°:n ramppia. Piirrä sen vapaakappalekuvio ja vertaa N:ää ja mg:tä.'),
        hints: [T('Which of the forces does work on the block, and which does not?', 'Mitkä voimista tekevät työtä kappaleeseen ja mitkä eivät?'), T('There is no friction and no "force down the slope": only two forces act.', 'Kitkaa ei ole eikä "alamäkivoimaa": vaikuttaa vain kaksi voimaa.')],
        widget: { name: 'fbd', config: { scene: 'incline', angle: 40,
          forces: [{ id: 'G', tex: 'mg' }, { id: 'N', tex: 'N' }, { id: 'Fm', tex: 'F_μ' }, { id: 'Fd', label: T('force down the slope', 'alamäkivoima') }],
          compare: [['N', 'G']] } } },
      { id: 't4-q24', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('A block starts from rest at the height 3.0 m of the frictionless ramp of the previous question. What is its speed at the bottom? Use energy conservation.', 'Kappale lähtee levosta edellisen kysymyksen kitkattoman rampin 3,0 m:n korkeudelta. Mikä on sen nopeus alhaalla? Käytä energian säilymistä.'),
        fields: [{ id: 'v', tex: 'v', unit: 'm/s' }],
        hints: [T('E_p at the top = E_k at the bottom.', 'E_p ylhäällä = E_k alhaalla.'), T('The angle of the ramp is not needed.', 'Rampin kulmaa ei tarvita.')] },
      { id: 't4-q25', mode: 'graded', type: 'numeric', difficulty: 2, tol: 0.03,
        prompt: T('A vehicle at 90 km/h brakes on a flat road with μ = 0.65. Calculate the braking distance. (Slide p10)', 'Ajoneuvo jarruttaa nopeudesta 90 km/h vaakasuoralla tiellä, μ = 0,65. Laske jarrutusmatka. (Kalvo s. 10)'),
        fields: [{ id: 's', tex: 's', unit: 'm' }],
        hints: [T('All the kinetic energy becomes friction work: ½ m v² = μ m g s.', 'Koko liike-energia muuttuu kitkatyöksi: ½ m v² = μ m g s.')] },
      { id: 't4-q26', mode: 'graded', type: 'numeric', difficulty: 3,
        prompt: T('A 0.20 kg object lies on a horizontal surface against a spring (k = 200 N/m) compressed by 5.0 cm. When released it slides 30 cm in all before it stops. Calculate the coefficient of friction (two decimals). (Exercise 4.16)',
          '0,20 kg:n kappale on vaakasuoralla alustalla vasten jousta (k = 200 N/m), joka on puristettu 5,0 cm. Vapautettuna se liukuu yhteensä 30 cm ennen kuin pysähtyy. Laske kitkakerroin (kaksi desimaalia). (Tehtävä 4.16)'),
        fields: [{ id: 'mu', tex: 'μ' }],
        hints: [T('The stored spring energy is all spent on friction work.', 'Jouseen varastoitunut energia kuluu kokonaan kitkatyöhön.'), T('½ k s² = μ m g d, with d = 0.30 m.', '½ k s² = μ m g d, d = 0,30 m.')] },
      { id: 't4-q27', mode: 'practice', type: 'slider', difficulty: 2, tol: 0.03,
        prompt: T('A car at about 50 km/h (14 m/s) brakes on a flat road. Set the coefficient of friction μ so that it stops in 30 m. The widget reads the stopping distance.',
          'Auto ajaa noin 50 km/h (14 m/s) tasaisella tiellä ja jarruttaa. Säädä kitkakerroin μ niin, että auto pysähtyy 30 m:ssä. Sovelma lukee pysähtymismatkan.'),
        hints: [T('½ m v² = μ m g s gives μ = v²/(2 g s).', '½ m v² = μ m g s antaa μ = v²/(2 g s).'), T('Compute μ first, then set the slider and Release.', 'Laske μ ensin, säädä sitten säädin ja paina Päästä.')],
        widget: { name: 'energy', config: { track: [[0, 0], [100, 0]], editable: false, T: 12, values: { m: 1000, mu: 0.2, v0: 14 }, fixed: ['m', 'v0'], ranges: { mu: { min: 0.2, max: 1, step: 0.01 } } } } },
      { id: 't4-q28', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.03,
        prompt: T('A car of 1000 kg stops on a horizontal road in a braking distance of 30 m from 50 km/h. What is the coefficient of friction (two significant figures)? (Exercise 68)', '1000 kg:n auto pysähtyy vaakasuoralla tiellä jarrutusmatkalla 30 m nopeudesta 50 km/h. Kuinka suuri on kitkakerroin (kaksi merkitsevää numeroa)? (Tehtävä 68)'),
        fields: [{ id: 'mu', tex: 'μ' }],
        hints: [T('50 km/h = 13.9 m/s.', '50 km/h = 13,9 m/s.'), T('μ = v²/(2 g s). The mass cancels.', 'μ = v²/(2 g s). Massa supistuu.')] },
      { id: 't4-q29', mode: 'graded', type: 'numeric', difficulty: 2, tol: 0.03,
        prompt: T('A skater glides on level ice at 10.0 km/h. Friction slows him to 5.0 km/h over 20.0 m. What is the coefficient of friction? (Exercise 69)', 'Luistelija liukuu tasaisella jäällä nopeudella 10,0 km/h. Kitka hidastaa nopeuden arvoon 5,0 km/h 20,0 m:n matkalla. Kuinka suuri on kitkakerroin? (Tehtävä 69)'),
        fields: [{ id: 'mu', tex: 'μ' }],
        hints: [T('Friction work = loss of kinetic energy: μ m g s = ½ m (v_1² − v_2²).', 'Kitkatyö = liike-energian menetys: μ m g s = ½ m (v_1² − v_2²).'), T('Convert km/h to m/s first.', 'Muunna km/h ensin m/s:ksi.')] },
      { id: 't4-q30', mode: 'graded', type: 'numeric', difficulty: 3,
        prompt: T('A horizontal force acts on a 5.0 kg body on a horizontal surface and changes its speed from 3.0 m/s to 7.5 m/s in 2.0 s. The coefficient of friction is 0.10. How large is the force? (Exercise 70)', 'Vaakasuora voima vaikuttaa 5,0 kg:n kappaleeseen vaakasuoralla alustalla ja muuttaa sen nopeuden 3,0 m/s:sta 7,5 m/s:iin 2,0 s:ssa. Kitkakerroin on 0,10. Kuinka suuri on voima? (Tehtävä 70)'),
        fields: [{ id: 'F', tex: 'F', unit: 'N' }],
        hints: [T('Newton II along the surface: F − μ m g = m a.', 'Newtonin II laki alustan suunnassa: F − μ m g = m a.'), T('a = Δv/Δt. (Check: F s = ΔE_k + μ m g s gives the same F.)', 'a = Δv/Δt. (Tarkistus: F s = ΔE_k + μ m g s antaa saman F:n.)')] },
      { id: 't4-q31', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('An ice hockey puck of 80 g stops from the speed 20 m/s over 45 m. Calculate the coefficient of friction (two significant figures). (Exercise 78)', '80 g:n jääkiekko pysähtyy nopeudesta 20 m/s 45 m:n matkalla. Laske kitkakerroin (kaksi merkitsevää numeroa). (Tehtävä 78)'),
        fields: [{ id: 'mu', tex: 'μ' }],
        hints: [T('μ = v²/(2 g s); the mass is not needed.', 'μ = v²/(2 g s); massaa ei tarvita.')] },
      // ---- 4.8 power
      { id: 't4-q32', mode: 'practice', type: 'numeric', difficulty: 1,
        prompt: T('A crane lifts 950 kg to 25 m in 2.5 minutes. Calculate the average lifting power. (Slide p11)', 'Nosturi nostaa 950 kg:n 25 m:n korkeuteen 2,5 minuutissa. Laske keskimääräinen nostoteho. (Kalvo s. 11)'),
        fields: [{ id: 'P', tex: 'P_k', unit: 'W' }], tol: 0.035,
        hints: [T('P_k = W/t with W = m g h. Time in seconds!', 'P_k = W/t, W = m g h. Aika sekunneissa!')] },
      { id: 't4-q33', mode: 'practice', type: 'numeric', difficulty: 1,
        prompt: T('A 900 kg car holds the speed 20 m/s on a horizontal road; the engine power needed is 40 kW. What is the resultant of the forces opposing the motion (two significant figures)? (Exercise 4.5)', '900 kg:n auto pitää nopeuden 20 m/s vaakasuoralla tiellä; tarvittava moottoriteho on 40 kW. Kuinka suuri on liikettä vastustavien voimien resultantti (kaksi merkitsevää numeroa)? (Tehtävä 4.5)'),
        fields: [{ id: 'F', tex: 'F', unit: 'N' }],
        hints: [T('Constant speed: the driving force equals the opposing force. P = F v.', 'Vakionopeus: vetävä voima on yhtä suuri kuin vastustava voima. P = F v.'), T('The mass is not needed.', 'Massaa ei tarvita.')] },
      { id: 't4-q34', mode: 'graded', type: 'numeric', difficulty: 3, tol: 0.02,
        prompt: T('A block of 2.0 kg is pulled with a constant force F = 12 N at 30° above the horizontal; μ_k = 0.40; it starts from rest at t = 0. Calculate a) the average power over 0…5.0 s and b) the power at 5.0 s. (Exercise 4.6)',
          '2,0 kg:n kappaletta vedetään vakiovoimalla F = 12 N, joka on 30° vaakatason yläpuolella; μ_k = 0,40; se lähtee levosta hetkellä t = 0. Laske a) keskiteho aikavälillä 0…5,0 s ja b) teho hetkellä 5,0 s. (Tehtävä 4.6)'),
        fields: [{ id: 'Pk', tex: 'P_k', unit: 'W' }, { id: 'P', tex: 'P', unit: 'W' }],
        hints: [T('N = m g − F sin α, then a = (F cos α − μ N)/m.', 'N = m g − F sin α, sitten a = (F cos α − μ N)/m.'), T('a) W = F cos α · ½ a t², P_k = W/t. b) P = F v cos α with v = a t.', 'a) W = F cos α · ½ a t², P_k = W/t. b) P = F v cos α, v = a t.'), T('Check: the instantaneous power is twice the average for uniform acceleration from rest.', 'Tarkistus: tasaisessa kiihtyvyydessä levosta hetkellinen teho on kaksi kertaa keskiteho.')] },
      { id: 't4-q35', mode: 'graded', type: 'numeric', difficulty: 1, tol: 0.03,
        prompt: T('An elevator of 400 kg moves upward at the constant speed 6.0 m/s. What power is needed to move it? (Exercise 81)', 'Hissi, jonka massa on 400 kg, kulkee ylöspäin vakionopeudella 6,0 m/s. Mikä teho tarvitaan sen liikuttamiseen? (Tehtävä 81)'),
        fields: [{ id: 'P', tex: 'P', unit: 'W' }],
        hints: [T('Constant speed: the force equals the weight. P = F v.', 'Vakionopeus: voima on yhtä suuri kuin paino. P = F v.')] },
      { id: 't4-q36', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.035,
        prompt: T('A van drives at the constant speed 108 km/h. The rolling resistance is 190 N and the air resistance 360 N. What power is needed at the driving wheels? (Slide p12)', 'Pakettiauto ajaa vakionopeudella 108 km/h. Vierintävastus on 190 N ja ilmanvastus 360 N. Mikä teho tarvitaan vetäville pyörille? (Kalvo s. 12)'),
        fields: [{ id: 'P', tex: 'P', unit: 'W' }],
        hints: [T('First the force: at constant speed it equals the sum of the resistances.', 'Ensin voima: vakionopeudella se on vastusten summa.'), T('Convert 108 km/h to m/s.', 'Muunna 108 km/h m/s:ksi.')] },
      { id: 't4-q37', mode: 'practice', type: 'mc', difficulty: 2,
        prompt: T('A car rolls down a hill in neutral at constant speed. What does that tell about the resistance R?', 'Auto vierii mäkeä alas vapaalla vakionopeudella. Mitä se kertoo vastuksesta R?'),
        options: [{ id: 'a', html: T('R is zero.', 'R on nolla.') }, { id: 'b', html: T('R equals m g sin α, the downhill component of the weight.', 'R on yhtä suuri kuin m g sin α, painon alamäkikomponentti.') },
                  { id: 'c', html: T('R equals m g cos α.', 'R on yhtä suuri kuin m g cos α.') }, { id: 'd', html: T('R equals m g.', 'R on yhtä suuri kuin m g.') }],
        hints: [T('Constant speed means the net force along the slope is zero.', 'Vakionopeus tarkoittaa, että kokonaisvoima rinteen suunnassa on nolla.')] },
      { id: 't4-q38', mode: 'graded', type: 'numeric', difficulty: 3, tol: 0.02,
        prompt: T('A car of 1200 kg rolls down a hill in neutral at the speed 18 m/s. The road rises 1.0 m over 20.0 m. How much power is needed for the same car to climb the hill at the same speed? (Exercise 4.4)',
          '1200 kg:n auto vierii mäkeä alas vapaalla nopeudella 18 m/s. Tie nousee 1,0 m 20,0 m:n matkalla. Kuinka suuri teho tarvitaan, jotta sama auto nousee mäkeä ylös samalla nopeudella? (Tehtävä 4.4)'),
        fields: [{ id: 'P', tex: 'P', unit: 'W' }],
        hints: [T('Going down at constant speed: R = m g sin α, with sin α = 1/20.', 'Alas vakionopeudella: R = m g sin α, sin α = 1/20.'), T('Going up the engine force is F = R + m g sin α.', 'Ylös mentäessä moottorin voima on F = R + m g sin α.'), T('Then P = F v.', 'Sitten P = F v.')] },
      // ---- 4.9 efficiency
      { id: 't4-q39', mode: 'practice', type: 'numeric', difficulty: 1, tol: 0.03,
        prompt: T('In 13 s a pump lifts 12 kg of water 9.5 m. Its electrical input power is 170 W. Calculate the efficiency (as a decimal number). (Slide p13)', 'Pumppu nostaa 13 s:ssa 12 kg vettä 9,5 m. Sen sähköinen ottoteho on 170 W. Laske hyötysuhde (desimaalilukuna). (Kalvo s. 13)'),
        fields: [{ id: 'eta', tex: 'η' }],
        hints: [T('First the output power P_out = m g h/t, then η = P_out/P_in.', 'Ensin antoteho P_out = m g h/t, sitten η = P_out/P_in.')] },
      { id: 't4-q40', mode: 'graded', type: 'mc', difficulty: 1,
        prompt: T('Which efficiency is impossible for a real machine?', 'Mikä hyötysuhde on mahdoton oikealle koneelle?'),
        options: [{ id: 'a', html: '0.35' }, { id: 'b', html: '0.80' }, { id: 'c', html: '1.2' }, { id: 'd', html: '0.99' }],
        hints: [T('What does the efficiency compare, and which is always the larger?', 'Mitä hyötysuhde vertaa, ja kumpi on aina suurempi?')] },
      { id: 't4-q41', mode: 'practice', type: 'numeric', difficulty: 1, tol: 0.03,
        prompt: T('The efficiencies of a car drivetrain are 0.33 (engine), 0.95 (clutch), 0.90 (transmission), 0.90 (differential) and 0.95 (final drive). Find the total efficiency. (Slide p14)', 'Auton voimansiirron hyötysuhteet ovat 0,33 (moottori), 0,95 (kytkin), 0,90 (vaihteisto), 0,90 (tasauspyörästö) ja 0,95 (pääpyörä). Laske kokonaishyötysuhde. (Kalvo s. 14)'),
        fields: [{ id: 'eta', tex: 'η' }],
        hints: [T('Efficiencies of stages in a chain multiply.', 'Ketjun vaiheiden hyötysuhteet kerrotaan keskenään.')] },
      { id: 't4-q42', mode: 'graded', type: 'numeric', difficulty: 2, tol: 0.03,
        prompt: T('A power plant with the efficiency 0.33 delivers 1600 MW of electricity. How much power is dissipated as heat? (Slide p14)', 'Voimalaitoksen hyötysuhde on 0,33 ja sähköinen antoteho 1600 MW. Kuinka suuri teho hukkautuu lämpönä? (Kalvo s. 14)'),
        fields: [{ id: 'P', tex: 'P_h', unit: 'GW' }],
        hints: [T('P_in = P_out/η first.', 'Ensin P_in = P_out/η.'), T('The loss is what is not output: P_h = P_in − P_out.', 'Häviö on se osa, joka ei ole antotehoa: P_h = P_in − P_out.')] },
      { id: 't4-q43', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.03,
        prompt: T('A hoist lifts a 500 kg load to the height 8.5 m in 34 s. Its efficiency is 60 %. What average power does it consume? (Exercise 79)', 'Nosturi nostaa 500 kg:n kuorman 8,5 m:n korkeuteen 34 s:ssa. Sen hyötysuhde on 60 %. Kuinka suuren keskimääräisen tehon se kuluttaa? (Tehtävä 79)'),
        fields: [{ id: 'P', tex: 'P_in', unit: 'W' }],
        hints: [T('Output power: m g h/t. Input = output/η.', 'Antoteho: m g h/t. Ottoteho = antoteho/η.')] },
      { id: 't4-q44', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.03,
        prompt: T('A pump lifts water 250 L/min from a 6.0 m deep well. Its efficiency is 80 %. What average power does it consume? (1 L of water has the mass 1 kg.) (Exercise 80)', 'Pumppu nostaa vettä 250 l/min 6,0 m syvästä kaivosta. Sen hyötysuhde on 80 %. Kuinka suuren keskimääräisen tehon se kuluttaa? (1 l vettä on massaltaan 1 kg.) (Tehtävä 80)'),
        fields: [{ id: 'P', tex: 'P_in', unit: 'W' }],
        hints: [T('Mass per second: 250 kg per 60 s.', 'Massa sekunnissa: 250 kg / 60 s.'), T('P_out = (m/t) g h, then divide by η.', 'P_out = (m/t) g h, jaa sitten η:lla.')] },
      { id: 't4-q45', mode: 'graded', type: 'numeric', difficulty: 3, tol: 0.03,
        prompt: T('A pump lifts 0.75 m³ of water per minute from a 6.0 m deep well and gives the water the speed 10.0 m/s. How much power does the motor take from the grid if the motor efficiency is 0.75? (Density of water 1000 kg/m³.) (Exercise 4.10)',
          'Pumppu nostaa vettä 0,75 m³ minuutissa 6,0 m syvästä kaivosta ja antaa vedelle nopeuden 10,0 m/s. Kuinka suuren tehon moottori ottaa verkosta, kun sen hyötysuhde on 0,75? (Veden tiheys 1000 kg/m³.) (Tehtävä 4.10)'),
        fields: [{ id: 'P', tex: 'P_in', unit: 'W' }],
        hints: [T('Mass flow: 1000 kg/m³ · 0.75 m³ / 60 s.', 'Massavirta: 1000 kg/m³ · 0,75 m³ / 60 s.'), T('Output power = lifting power + kinetic power: (m/t)(g h + ½ v²).', 'Antoteho = nostoteho + liike-energiateho: (m/t)(g h + ½ v²).'), T('Then divide by the efficiency.', 'Jaa sitten hyötysuhteella.')] },
      { id: 't4-q46', mode: 'graded', type: 'numeric', difficulty: 2, tol: 0.03,
        prompt: T('The height of a waterfall is 12 m and the flow 400 m³ per minute. What is the output of a power plant built there if its efficiency is 70 % (two significant figures)? (Exercise 4.14)', 'Putouksen korkeus on 12 m ja virtaama 400 m³ minuutissa. Kuinka suuri on tähän rakennettavan voimalaitoksen antoteho, kun sen hyötysuhde on 70 % (kaksi merkitsevää numeroa)? (Tehtävä 4.14)'),
        fields: [{ id: 'P', tex: 'P_out', unit: 'W' }],
        hints: [T('The power of the falling water is (m/t) g h with m/t = 1000 kg/m³ · 400 m³ / 60 s.', 'Putoavan veden teho on (m/t) g h, m/t = 1000 kg/m³ · 400 m³ / 60 s.'), T('Output = η times that.', 'Anto = η kertaa se.')] }
    ]
  });
})();

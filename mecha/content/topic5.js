/* Topic 5: Momentum and impulse. Source: source/extracted/topic5-momentum-impulse.md (EN theory deck p03-p09, EN exercise deck
 * 5.6, 5.11, 5.12 and the FI-deck exercises 88 and 91; errata in source/extracted/PDF-ERRATA.md applied). g = 9.81 m/s².
 * Sign convention of all 1-D formulas: velocities are signed along one axis, e = (u2 - u1)/(v1 - v2) (the slide's
 * e = (u1 - u2)/(v2 - v1) is the same number).
 * NO answers in this file: they live in src/answers/topic5.json. Block ids are stable; never rename. */
(function () {
  'use strict';
  function T(en, fi) { return { en: en, fi: fi }; }
  var PI = Math.PI;

  // ---------------------------------------------------------------- shared helpers of the device widgets (as in topic4.js)
  function dev(def, vals) { return { mount: function (h, c) { return TDC.mechViz.device(def, vals).mount(h, c); } }; }
  function nf(v, d) { return TDC.util.fmtNum(v, d || 3); }
  function fsz(w) { return Math.max(11, Math.min(14, Math.round(w / 48))); }
  function line(g, x1, y1, x2, y2) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lab() { return TDC.mechViz.lab.apply(null, arguments); }   // canvas label in SI typography (viz/mech-common.js)
  function changed(S, p, keys) { var k = keys.map(function (id) { return p[id]; }).join('|'); if (S._k === k) return false; S._k = k; return true; }
  function zero(v) { return Math.abs(v) < 1e-9 ? 0 : v; }

  // ---------------------------------------------------------------- SVG figure of the 2-D collision (slide p09), symbols only
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
  var FIG_2D = '<svg viewBox="0 0 380 230" role="img" style="max-width:420px">' +
    '<line x1="10" y1="118" x2="120" y2="118" style="stroke:var(--muted);stroke-width:1.5;stroke-dasharray:4 4"/>' +
    '<circle cx="120" cy="118" r="22" style="fill:var(--c-1);opacity:.35;stroke:var(--c-wire);stroke-width:2"/>' +
    '<circle cx="153" cy="136" r="15" style="fill:var(--c-3);opacity:.35;stroke:var(--c-wire);stroke-width:2"/>' +
    sSym(112, 123, 'm', '1') + sSym(147, 141, 'm', '2') +
    sArrow(14, 100, 64, 100, '--f-accel') + sSym(30, 92, 'v', '1', '--f-accel') +
    sArrow(120, 118, 224, 118, '--f-applied', true) + sSym(200, 110, 'u', '1x', '--f-applied') +
    sArrow(120, 118, 120, 70, '--f-normal', true) + sSym(94, 78, 'u', '1y', '--f-normal') +
    sArrow(120, 118, 224, 70, '--f-accel') + sSym(190, 84, 'u', '1', '--f-accel') +
    sArrow(153, 136, 232, 136, '--f-applied', true) + sSym(212, 154, 'u', '2x', '--f-applied') +
    sArrow(153, 136, 153, 196, '--f-normal', true) + sSym(160, 192, 'u', '2y', '--f-normal') +
    sArrow(153, 136, 232, 196, '--f-accel') + sSym(206, 190, 'u', '2', '--f-accel') +
    '<line x1="300" y1="40" x2="350" y2="40" style="stroke:var(--fg);stroke-width:1.5"/><polygon points="355,40 346,36 346,44" style="fill:var(--fg)"/>' +
    '<line x1="300" y1="40" x2="300" y2="-2" style="stroke:var(--fg);stroke-width:1.5"/><polygon points="300,-6 296,3 304,3" style="fill:var(--fg)"/>' +
    sSym(352, 58, 'x') + sSym(308, 8, 'y') + '</svg>';

  // ================================================================ device: F(t) impulse area (t5-impulse-lab; p03, p04)
  // The force is piecewise linear through F0 = 0, F1..F4, F5 = 0 at t = 0…5 s, so the trapezoid rule is exact.
  function Ift(F, t) { var I = 0; for (var i = 0; i < 5; i++) { var d = clamp(t - i, 0, 1), a = F[i], b = F[i + 1]; I += a * d + (b - a) * d * d / 2; } return I; }
  function Fat(F, t) { var i = clamp(Math.floor(t), 0, 4); return F[i] + (F[i + 1] - F[i]) * (t - i); }
  function xAt(F, m, t) { var n = Math.max(1, Math.ceil(t * 60)), h = t / n, s = 0, vp = 0; for (var k = 1; k <= n; k++) { var v = Ift(F, k * h) / m; s += (vp + v) / 2 * h; vp = v; } return s; }
  function impF(p) { return [0, p.F1, p.F2, p.F3, p.F4, 0]; }
  var IMP = {
    animate: true,
    aspect: function (w) { return w < 520 ? 1.25 : 0.78; },
    params: [45, 50, 20, 15].map(function (v, i) { return { id: 'F' + (i + 1), tex: 'F_' + (i + 1), min: -60, max: 60, step: 1, value: v, unit: 'N' }; })
      .concat([{ id: 'm', tex: 'm', min: 5, max: 60, step: 1, value: 11, unit: 'kg' }]),
    buttons: [
      { label: T('Apply the force', 'Anna voiman vaikuttaa'), click: function (p, D) { changed(D.S, p, ['F1', 'F2', 'F3', 'F4', 'm']); D.S.t = D.motion ? 0 : 5; D.S.run = D.motion; } },
      { label: T('Curve of slide p04', 'Kalvon s. 04 käyrä'), click: function (p, D) { D.set({ F1: 45, F2: 50, F3: 20, F4: 15, m: 11 }); } },
      { label: T('Push the other way', 'Työnnä vastakkaiseen suuntaan'), click: function (p, D) { D.set({ F1: -p.F1, F2: -p.F2, F3: -p.F3, F4: -p.F4 }); } }],
    drag: {
      hit: function (x, y, p, D) { var G = D.S.geo; if (!G) return null; for (var i = 1; i <= 4; i++) if (Math.hypot(x - G.X(i), y - G.Y(p['F' + i])) < 16) return i; return null; },
      move: function (k, x, y, p, D) { var G = D.S.geo, o = {}; o['F' + k] = (G.y1 - y) / (G.y1 - G.y0) * 120 - 60; return o; }
    },
    draw: function (g, w, h, p, ctx, TV, D) {
      var S = D.S, F = impF(p);
      if (changed(S, p, ['F1', 'F2', 'F3', 'F4', 'm'])) { S.run = false; S.t = 5; }
      if (S.t == null) S.t = 5;
      if (S.run) { S.t = Math.min(5, S.t + D.dt); if (S.t >= 5) S.run = false; }
      var t = S.t, I = Ift(F, t), v = I / p.m, x = xAt(F, p.m, t);
      var fs = fsz(w), fg = ctx.color('--fg'), wire = ctx.color('--c-wire'), mu = ctx.color('--muted'), bg = ctx.color('--surface'), c1 = ctx.color('--c-1'), bad = ctx.color('--bad'), cF = ctx.color('--f-applied');
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      // ---- the F,t graph
      var x0 = 46, x1 = w - 16, y0 = 26, y1 = Math.round(h * 0.47);
      var X = function (s) { return x0 + s / 5 * (x1 - x0); }, Y = function (f) { return y1 - (f + 60) / 120 * (y1 - y0); };
      S.geo = { X: X, Y: Y, y0: y0, y1: y1 };
      g.strokeStyle = mu; g.lineWidth = 0.8; for (var f = -60; f <= 60; f += 30) if (f) line(g, x0, Y(f), x1, Y(f));
      g.strokeStyle = wire; g.lineWidth = 1.5; line(g, x0, Y(0), x1, Y(0)); line(g, x0, y1, x0, y0 - 6);
      lab(g, 'F', ' / N', x0 + 6, y0 - 14, fg, 'left', fs); lab(g, 't', ' / s', x1, Y(0) + 26, fg, 'right', fs);
      for (var i = 0; i <= 5; i++) lab(g, '', String(i), X(i), Y(0) + 12, mu, 'center', fs - 2);
      for (f = -60; f <= 60; f += 30) if (f) lab(g, '', String(f), x0 - 6, Y(f), mu, 'right', fs - 2);
      [[true, c1], [false, bad]].forEach(function (q) {   // the area: positive impulse blue, negative impulse red
        g.save(); g.beginPath(); if (q[0]) g.rect(x0, y0 - 4, x1 - x0, Y(0) - y0 + 4); else g.rect(x0, Y(0), x1 - x0, y1 - Y(0)); g.clip();
        g.fillStyle = TV.alpha(q[1], 0.4);
        for (var j = 0; j < 5; j++) {
          var fr = clamp(t - j, 0, 1); if (fr <= 0) continue;
          g.beginPath(); g.moveTo(X(j), Y(0)); g.lineTo(X(j), Y(F[j])); g.lineTo(X(j + fr), Y(F[j] + (F[j + 1] - F[j]) * fr)); g.lineTo(X(j + fr), Y(0)); g.closePath(); g.fill();
        }
        g.restore();
      });
      g.strokeStyle = cF; g.lineWidth = 2.5; g.beginPath(); for (i = 0; i <= 5; i++) { if (i) g.lineTo(X(i), Y(F[i])); else g.moveTo(X(0), Y(0)); } g.stroke();
      for (i = 1; i <= 4; i++) { g.fillStyle = cF; g.beginPath(); g.arc(X(i), Y(F[i]), 6, 0, 2 * PI); g.fill(); lab(g, '', String(F[i]), X(i), Y(F[i]) + (F[i] >= 0 ? -14 : 14), fg, 'center', fs - 1, bg); }
      if (t < 5) { g.strokeStyle = fg; g.lineWidth = 1.2; g.setLineDash([4, 3]); line(g, X(t), y0, X(t), y1); g.setLineDash([]); }
      lab(g, 'I', ' = ∫F dt = ' + nf(zero(I), 3) + ' N·s', x1, 12, fg, 'right', fs);
      // ---- the body on a frictionless floor: the ground marks scroll past, so speed and direction are visible
      var fy = Math.round(h * 0.76), cx = w / 2, bw = 30 + 40 * Math.cbrt(p.m / 60), bh = bw * 0.6, k = 8;
      g.fillStyle = ctx.color('--m-ground'); g.fillRect(0, fy, w, 8); g.strokeStyle = wire; g.lineWidth = 2; line(g, 0, fy, w, fy);
      g.lineWidth = 1.2; var off = ((-x * k) % 40 + 40) % 40; for (var q = -1; q < w / 40 + 1; q++) line(g, q * 40 + off, fy + 2, q * 40 + off - 7, fy + 8);
      var fx = cx - x * k;
      if (fx > 8 && fx < w - 8) { g.strokeStyle = mu; g.lineWidth = 1.5; line(g, fx, fy, fx, fy - 30); g.fillStyle = mu; g.beginPath(); g.moveTo(fx, fy - 30); g.lineTo(fx + 12, fy - 25); g.lineTo(fx, fy - 20); g.fill(); lab(g, '', '0', fx, fy - 38, mu, 'center', fs - 2); }
      g.fillStyle = ctx.color('--m-body'); g.strokeStyle = wire; g.lineWidth = 2; TV.rr(g, cx - bw / 2, fy - bh, bw, bh, 3); g.fill(); g.stroke();
      lab(g, 'm', ' = ' + p.m + ' kg', cx, fy - bh / 2, fg, 'center', fs - 2);
      var Fn = Fat(F, t), LF = clamp(Math.abs(Fn) / 60 * 70, 0, 80);   // the push: from behind for F > 0, from the front for F < 0
      if (t < 5 && LF > 3) {
        if (Fn > 0) TV.arrow(g, cx - bw / 2 - LF, fy - bh / 2, cx - bw / 2, fy - bh / 2, cF, 3.5); else TV.arrow(g, cx + bw / 2 + LF, fy - bh / 2, cx + bw / 2, fy - bh / 2, cF, 3.5);
        lab(g, 'F', '', Fn > 0 ? cx - bw / 2 - LF / 2 : cx + bw / 2 + LF / 2, fy - bh / 2 - 14, cF, 'center', fs, bg);
      }
      var Lv = clamp(v * 4, -w * 0.42, w * 0.42), ay = fy - bh - 20;
      if (Math.abs(Lv) > 2) TV.arrow(g, cx, ay, cx + Lv, ay, ctx.color('--f-accel'), 3.5);
      lab(g, 'v', ' = ' + nf(zero(v), 3) + ' m/s', cx + Lv / 2, ay - 14, ctx.color('--f-accel'), 'center', fs, bg);
      // ---- momentum bar: p = I(t), left (negative) or right (positive)
      var by = h - 16, half = w * 0.4, Lp = clamp(I / 200, -1, 1) * half;
      g.strokeStyle = mu; g.lineWidth = 1; line(g, cx - half, by, cx + half, by); line(g, cx, by - 9, cx, by + 9);
      g.fillStyle = I >= 0 ? c1 : bad; g.globalAlpha = 0.75; g.fillRect(Math.min(cx, cx + Lp), by - 7, Math.abs(Lp), 14); g.globalAlpha = 1;
      lab(g, 'p', ' = m v = ' + nf(zero(I), 3) + ' kg·m/s', 8, by - 22, fg, 'left', fs - 1);
    },
    outputs: function (p) {
      var F = impF(p), I = Ift(F, 5);
      return [{ tex: T('I = ∫F dt  (trapezoids)', 'I = ∫F dt  (puolisuunnikkaat)'), value: I, unit: 'N·s' }, { tex: 'v = I/m', value: I / p.m, unit: 'm/s' }, { tex: 'p = m v', value: I, unit: 'kg·m/s' },
              { label: T('Displacement in 5 s', 'Siirtymä 5 s:ssa'), value: xAt(F, p.m, 5), unit: 'm' }];
    },
    answer: function (p) { return { v: Ift(impF(p), 5) / p.m }; }
  };

  // ================================================================ device: impulse and contact time (t5-contact-lab; p04, ex 5.6)
  // Half-sine force pulse of width Δt with the area I = m v: shorter contact, taller peak F_peak = (π/2) I/Δt.
  var CON_TA = 0.7, CON_TC = 1.4, CON_TF = 1.6, CON_YMAX = 40000;
  var CON = {
    animate: true,
    aspect: function (w) { return w < 520 ? 1.1 : 0.66; },
    params: [{ id: 'm', tex: 'm', min: 0.02, max: 0.1, step: 0.005, value: 0.05, unit: 'kg' },
             { id: 'v', tex: 'v', min: 20, max: 70, step: 1, value: 48, unit: 'm/s' },
             { id: 'dt', tex: 'Δt', min: 0.1, max: 2, step: 0.05, value: 0.45, unit: 'ms' }],
    buttons: [{ label: T('Hit the ball', 'Lyö palloa'), click: function (p, D) { changed(D.S, p, ['m', 'v', 'dt']); D.S.tm = D.motion ? 0 : CON_TA + CON_TC + CON_TF; D.S.run = D.motion; } },
              { label: T('Golf drive (slide p04)', 'Golflyönti (kalvo s. 04)'), click: function (p, D) { D.set({ m: 0.05, v: 48, dt: 0.45 }); } },
              { label: T('Contact 4 times longer', 'Kosketus 4 kertaa pidempi'), click: function (p, D) { D.set({ dt: p.dt * 4 }); } }],
    draw: function (g, w, h, p, ctx, TV, D) {
      var S = D.S;
      if (changed(S, p, ['m', 'v', 'dt'])) { S.run = false; S.tm = 0; }
      if (S.tm == null) S.tm = 0;
      if (S.run) { S.tm = Math.min(CON_TA + CON_TC + CON_TF, S.tm + D.dt); if (S.tm >= CON_TA + CON_TC + CON_TF) S.run = false; }
      var I = p.m * p.v, dts = p.dt / 1000, Fp = PI / 2 * I / dts, Fa = I / dts;
      var fs = fsz(w), fg = ctx.color('--fg'), wire = ctx.color('--c-wire'), mu = ctx.color('--muted'), bg = ctx.color('--surface'), c1 = ctx.color('--c-1'), cF = ctx.color('--f-applied');
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      var x0 = 52, x1 = w - 16, y0 = 24, y1 = Math.round(h * 0.45);
      var X = function (ms) { return x0 + ms / 2 * (x1 - x0); }, Y = function (f) { return y1 - f / CON_YMAX * (y1 - y0); };
      g.strokeStyle = mu; g.lineWidth = 0.8; for (var f = 10000; f <= CON_YMAX; f += 10000) line(g, x0, Y(f), x1, Y(f));
      g.strokeStyle = wire; g.lineWidth = 1.5; line(g, x0, y1, x1, y1); line(g, x0, y1, x0, y0 - 6);
      lab(g, 'F', ' / kN', x0 + 6, y0 - 14, fg, 'left', fs); lab(g, 't', ' / ms', x1, y1 + 26, fg, 'right', fs);
      for (f = 0; f <= CON_YMAX; f += 10000) lab(g, '', String(f / 1000), x0 - 6, Y(f), mu, 'right', fs - 2);
      for (var ms = 0; ms <= 2; ms += 0.5) lab(g, '', String(ms), X(ms), y1 + 12, mu, 'center', fs - 2);
      g.save(); g.beginPath(); g.rect(x0, y0 - 4, x1 - x0, y1 - y0 + 4); g.clip();   // a very tall peak runs off the top of the axis
      g.beginPath(); g.moveTo(X(0), y1);
      for (var j = 0; j <= 60; j++) { var tt = p.dt * j / 60; g.lineTo(X(tt), Y(Fp * Math.sin(PI * j / 60))); }
      g.lineTo(X(p.dt), y1); g.closePath(); g.fillStyle = TV.alpha(c1, 0.4); g.fill(); g.strokeStyle = cF; g.lineWidth = 2.5; g.stroke();
      g.strokeStyle = fg; g.lineWidth = 1.5; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(X(0), Y(Fa)); g.lineTo(X(p.dt), Y(Fa)); g.lineTo(X(p.dt), y1); g.stroke(); g.setLineDash([]);
      var tc = clamp((S.tm - CON_TA) / CON_TC, 0, 1);
      if (tc > 0 && tc < 1) { g.strokeStyle = fg; g.lineWidth = 1.2; line(g, X(tc * p.dt), y0, X(tc * p.dt), y1); }
      g.restore();
      lab(g, 'F_peak', ' = ' + nf(Fp / 1000, 3) + ' kN' + (Fp > CON_YMAX ? ' ↑' : ''), x1, 12, cF, 'right', fs);
      lab(g, 'F_avg', ' = I/Δt = ' + nf(Fa / 1000, 3) + ' kN', x1, 12 + fs + 6, fg, 'right', fs - 1);
      lab(g, 'I', ' = m v = ' + nf(I, 3) + ' N·s (' + ctx.tx(T('area', 'ala')) + ')', x0 + 8, y1 - 12, fg, 'left', fs - 1, bg);
      // ---- the shot: approach, contact (slow motion, the ball squashes by F(t)), flight
      var fy = Math.round(h * 0.85), r = 10 + 60 * p.m, bx = w * 0.36, hw = 24, hh = 46;
      g.fillStyle = ctx.color('--m-ground'); g.fillRect(0, fy, w, 8); g.strokeStyle = wire; g.lineWidth = 2; line(g, 0, fy, w, fy);
      var tm = S.tm, Fn = 0, xb = bx, xf;
      if (tm < CON_TA) { xf = bx - r - hw / 2 - Math.min(90, bx - r - hw - 6) * (1 - tm / CON_TA); }   // the run-up stays on a phone-width canvas
      else if (tm < CON_TA + CON_TC) { Fn = Fp * Math.sin(PI * tc); xf = null; }
      else { var tf = tm - CON_TA - CON_TC; xb = Math.min(w - r - 6, bx + 4 * p.v * tf); xf = Math.min(xb - r - hw / 2, bx - r + 1.6 * p.v * tf); }
      var q = clamp(Fn / CON_YMAX, 0, 0.45), rx = r * (1 - q), ry = r * (1 + 0.4 * q), cy = fy - 20 - ry;
      if (xf == null) xf = bx - rx - hw / 2;
      g.fillStyle = TV.alpha(ctx.color('--c-3'), 0.6); g.strokeStyle = wire; g.lineWidth = 2;
      g.beginPath(); g.moveTo(bx - 4, fy); g.lineTo(bx + 4, fy); g.lineTo(bx + 2, fy - 20); g.lineTo(bx - 2, fy - 20); g.closePath(); g.fill(); g.stroke();   // tee
      g.fillStyle = ctx.color('--bg-card') || bg; g.beginPath(); g.ellipse(xb, cy, rx, ry, 0, 0, 2 * PI); g.fill(); g.stroke();
      g.fillStyle = ctx.color('--m-body'); TV.rr(g, xf - hw / 2, cy - hh / 2, hw, hh, 3); g.fill(); g.stroke();
      if (Fn > 0) {
        var LF = clamp(Fn / CON_YMAX * 90, 8, 110);
        TV.arrow(g, xb + rx, cy - ry - 12, xb + rx + LF, cy - ry - 12, cF, 3.5); lab(g, 'F', '', xb + rx + LF + 12, cy - ry - 12, cF, 'left', fs, bg);
        TV.arrow(g, xf - hw / 2, cy + hh / 2 + 12, xf - hw / 2 - LF, cy + hh / 2 + 12, cF, 3.5); lab(g, 'F', '', xf - hw / 2 - LF - 12, cy + hh / 2 + 12, cF, 'right', fs, bg);
      }
      if (tm >= CON_TA + CON_TC) {
        var Lv = clamp(p.v * 1.6, 0, w * 0.35), ax = Math.min(xb, w - 8 - Lv);   // the ball at the wall keeps its arrow on the canvas
        TV.arrow(g, ax, cy - ry - 16, ax + Lv, cy - ry - 16, ctx.color('--f-accel'), 3.5);
        lab(g, 'v', ' = ' + p.v + ' m/s', clamp(ax + Lv / 2, 50, w - 50), cy - ry - 30, ctx.color('--f-accel'), 'center', fs, bg);
      }
    },
    outputs: function (p) {
      var I = p.m * p.v, Fa = I / (p.dt / 1000);
      return [{ tex: 'I = m v', value: I, unit: 'N·s' }, { tex: 'F_{avg} = I/Δt', value: Fa, unit: 'N' }, { tex: 'F_{peak} = {π}/{2} F_{avg}', value: PI / 2 * Fa, unit: 'N' }];
    },
    answer: function (p) { return { v: p.m * p.v / (p.dt / 1000) }; }
  };

  // ================================================================ device: recoil, two carts pushed apart (t5-recoil-lab; p05)
  function recoil(p) {
    var M = p.m1 + p.m2, u1 = -Math.sqrt(2 * p.E * p.m2 / (p.m1 * M)), u2 = Math.sqrt(2 * p.E * p.m1 / (p.m2 * M));
    return { u1: u1, u2: u2, p1: p.m1 * u1, p2: p.m2 * u2, K1: p.E * p.m2 / M, K2: p.E * p.m1 / M };
  }
  var REC = {
    animate: true,
    aspect: function (w) { return w < 520 ? 1.1 : 0.64; },
    params: [{ id: 'm1', tex: 'm_1', min: 0.5, max: 5, step: 0.1, value: 1, unit: 'kg' },
             { id: 'm2', tex: 'm_2', min: 0.5, max: 5, step: 0.1, value: 3, unit: 'kg' },
             { id: 'E', tex: 'E_j', min: 1, max: 40, step: 1, value: 24, unit: 'J' }],
    buttons: [{ label: T('Release the spring', 'Päästä jousi'), click: function (p, D) { changed(D.S, p, ['m1', 'm2', 'E']); D.S.t = D.motion ? 0 : 2.2; D.S.run = D.motion; D.S.rel = true; } },
              { label: T('Reset', 'Nollaa'), click: function (p, D) { D.S.t = 0; D.S.run = false; D.S.rel = false; } }],
    draw: function (g, w, h, p, ctx, TV, D) {
      var S = D.S, R = recoil(p), M = p.m1 + p.m2;
      if (changed(S, p, ['m1', 'm2', 'E'])) { S.run = false; S.t = 0; S.rel = false; }
      if (S.t == null) S.t = 0;
      if (S.run) { S.t = Math.min(2.2, S.t + D.dt); if (S.t >= 2.2) S.run = false; }
      var t = S.t, rel = S.rel, f = rel ? clamp(t / 0.4, 0, 1) : 0;
      var fs = fsz(w), fg = ctx.color('--fg'), wire = ctx.color('--c-wire'), mu = ctx.color('--muted'), bg = ctx.color('--surface'), c1 = ctx.color('--c-1'), c3 = ctx.color('--c-3'), acc = ctx.color('--f-accel');
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      var gy = Math.round(h * 0.4), cx = w / 2, k = 30;
      var cw1 = 34 + 10 * p.m1, cw2 = 34 + 10 * p.m2, gap = 30, d = (cw1 + cw2) / 2 + gap, ch = 34;
      var xa = clamp(cx - d * p.m2 / M + (rel ? R.u1 * k * t : 0), cw1 / 2 + 6, w - cw1 / 2 - 6), xb = clamp(cx + d * p.m1 / M + (rel ? R.u2 * k * t : 0), cw2 / 2 + 6, w - cw2 / 2 - 6);
      g.fillStyle = ctx.color('--m-ground'); g.fillRect(0, gy, w, 8); g.strokeStyle = wire; g.lineWidth = 2; line(g, 0, gy, w, gy);
      g.strokeStyle = mu; g.lineWidth = 1.2; g.setLineDash([4, 4]); line(g, cx, gy - 80, cx, gy + 14); g.setLineDash([]); lab(g, 'CM', '', cx, gy + 26, mu, 'center', fs - 2);
      if (!rel) {   // the compressed spring between the carts
        g.strokeStyle = ctx.color('--f-applied'); g.lineWidth = 2.5; g.beginPath(); var sx0 = xa + cw1 / 2, sx1 = xb - cw2 / 2, sy = gy - ch / 2 - 5; g.moveTo(sx0, sy);
        for (var z = 1; z <= 9; z++) g.lineTo(sx0 + (sx1 - sx0) * z / 10, sy + (z % 2 ? -9 : 9)); g.lineTo(sx1, sy); g.stroke();
      }
      [[xa, cw1, 'm_1', c1, p.m1, R.u1], [xb, cw2, 'm_2', c3, p.m2, R.u2]].forEach(function (q) {
        g.fillStyle = TV.alpha(q[3], 0.4); g.strokeStyle = wire; g.lineWidth = 2; TV.rr(g, q[0] - q[1] / 2, gy - 5 - ch, q[1], ch, 4); g.fill(); g.stroke();
        g.fillStyle = wire; [-0.28, 0.28].forEach(function (s) { g.beginPath(); g.arc(q[0] + s * q[1], gy - 3, 5, 0, 2 * PI); g.fill(); });
        g.font = (fs - 2) + 'px sans-serif'; var fits = g.measureText('m1 = ' + q[4] + ' kg').width < q[1] - 8;   // a small cart shows only its symbol
        lab(g, q[2], fits ? ' = ' + q[4] + ' kg' : '', q[0], gy - 5 - ch / 2, fg, 'center', fs - 2);
        if (rel) {
          var L = clamp(q[5] * 14, -w * 0.3, w * 0.3), ay = gy - ch - 24, ax = clamp(q[0], 10 + Math.max(0, -L), w - 10 - Math.max(0, L));   // a cart at the wall keeps its arrow and label on the canvas
          TV.arrow(g, ax, ay, ax + L, ay, acc, 3.5);
          lab(g, q[2] === 'm_1' ? 'u_1' : 'u_2', ' = ' + nf(zero(q[5]), 3) + ' m/s', clamp(ax + L / 2, 50, w - 50), ay - 14, acc, 'center', fs - 1, bg);
        }
      });
      // ---- momentum bars (equal and opposite) and kinetic energy bars (the lighter cart gets more)
      var half = w * 0.4, pref = 14, b1 = Math.round(h * 0.66), b2 = Math.round(h * 0.86), a = 0.35 + 0.65 * f;
      g.strokeStyle = mu; g.lineWidth = 1; line(g, cx - half, b1, cx + half, b1); line(g, cx, b1 - 12, cx, b1 + 12);
      [[R.p1, c1], [R.p2, c3]].forEach(function (q) {
        var L = clamp(q[0] / pref, -1, 1) * half;
        g.strokeStyle = q[1]; g.lineWidth = 1.5; g.setLineDash([4, 3]); g.strokeRect(Math.min(cx, cx + L), b1 - 8, Math.abs(L), 16); g.setLineDash([]);
        g.fillStyle = q[1]; g.globalAlpha = 0.75 * f; g.fillRect(Math.min(cx, cx + L * f), b1 - 8, Math.abs(L * f), 16); g.globalAlpha = 1;
      });
      lab(g, 'p_1', ' = ' + nf(R.p1, 3) + ' kg·m/s', cx - 8, b1 - 22, c1, 'right', fs - 1); lab(g, 'p_2', ' = ' + nf(R.p2, 3) + ' kg·m/s', cx + 8, b1 - 22, c3, 'left', fs - 1);
      lab(g, 'Σp', ' = ' + (rel ? '0' : '0 (' + ctx.tx(T('before', 'ennen')) + ')') + '  =  p_1 + p_2', cx, b1 + 26, fg, 'center', fs - 1);
      var wE = w * 0.84 / 40, e0 = w * 0.08;
      g.strokeStyle = c1; g.lineWidth = 1.5; g.setLineDash([4, 3]); g.strokeRect(e0, b2 - 8, R.K1 * wE, 16); g.strokeStyle = c3; g.strokeRect(e0 + R.K1 * wE, b2 - 8, R.K2 * wE, 16); g.setLineDash([]);
      g.fillStyle = c1; g.globalAlpha = 0.75 * f; g.fillRect(e0, b2 - 8, R.K1 * wE, 16); g.fillStyle = c3; g.fillRect(e0 + R.K1 * wE, b2 - 8, R.K2 * wE, 16); g.globalAlpha = 1;
      lab(g, 'E_k1', ' = ' + nf(R.K1, 3) + ' J', e0, b2 + 22, c1, 'left', fs - 2); lab(g, 'E_k2', ' = ' + nf(R.K2, 3) + ' J', e0 + w * 0.84, b2 + 22, c3, 'right', fs - 2);
      lab(g, 'E_j', ' = ' + p.E + ' J → E_k1 + E_k2', e0, b2 - 22, fg, 'left', fs - 1);
    },
    outputs: function (p) {
      var R = recoil(p);
      return [{ tex: 'u_1', value: R.u1, unit: 'm/s' }, { tex: 'u_2', value: R.u2, unit: 'm/s' }, { tex: 'm_1 u_1 + m_2 u_2', value: zero(R.p1 + R.p2), unit: 'kg·m/s' }, { tex: 'u_2/u_1', value: R.u2 / R.u1, digits: 3 }];
    },
    answer: function (p) { return { v: Math.abs(recoil(p).u2) }; }
  };

  // ================================================================ device: machine gun, impulses add up to an average force (t5-gun-lab; ex 5.11)
  var GUN_TP = 0.01;   // pulse width in s: the area of each pulse is m v
  var GUN = {
    animate: true,
    aspect: function (w) { return w < 520 ? 1.05 : 0.64; },
    params: [{ id: 'n', tex: 'n', min: 100, max: 1500, step: 10, value: 1050, unit: '1/min' },
             { id: 'mb', tex: 'm', min: 2, max: 20, step: 0.5, value: 8, unit: 'g' },
             { id: 'v', tex: 'v', min: 300, max: 1000, step: 10, value: 730, unit: 'm/s' }],
    buttons: [{ label: T('Fire for 2 s', 'Ammu 2 s'), click: function (p, D) { D.S.t = D.motion ? 0 : 0.5; D.S.run = D.motion; } }],
    draw: function (g, w, h, p, ctx, TV, D) {
      var S = D.S, mb = p.mb / 1000, ps = mb * p.v, rate = p.n / 60, Fa = rate * ps;
      if (S.t == null) S.t = null;
      if (S.run) { S.t += D.dt; if (S.t > 2.6) { S.run = false; S.t = null; } }
      var fs = fsz(w), fg = ctx.color('--fg'), wire = ctx.color('--c-wire'), mu = ctx.color('--muted'), bg = ctx.color('--surface'), c1 = ctx.color('--c-1'), cF = ctx.color('--f-applied'), acc = ctx.color('--f-accel');
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      // ---- scene: the gun fires to the right; each bullet kicks it back to the left
      var gy = Math.round(h * 0.3), t = S.t, kick = 0, gx = w * 0.3;
      if (t != null) for (var k = 0; k * 60 / p.n <= Math.min(t, 2); k++) { var a = t - k * 60 / p.n; if (a < 0.06) kick += 1 - a / 0.06; }
      var off = -Math.min(1, kick) * 9, bx = gx + off;
      g.fillStyle = ctx.color('--m-ground'); g.fillRect(0, gy + 26, w, 6); g.strokeStyle = wire; g.lineWidth = 2; line(g, 0, gy + 26, w, gy + 26);
      g.fillStyle = ctx.color('--m-body'); TV.rr(g, bx - 42, gy - 14, 84, 24, 3); g.fill(); g.stroke(); TV.rr(g, bx + 40, gy - 8, 56, 10, 2); g.fill(); g.stroke();
      g.fillRect(bx - 34, gy + 8, 16, 20); g.strokeRect(bx - 34, gy + 8, 16, 20);
      var mz = bx + 96;
      if (t != null) for (k = 0; k * 60 / p.n <= Math.min(t, 2); k++) {
        var xb = mz + 0.45 * p.v * (t - k * 60 / p.n); if (xb > w - 4) continue;
        g.fillStyle = ctx.color('--fg'); g.beginPath(); g.arc(xb, gy - 3, 3.2, 0, 2 * PI); g.fill();
      }
      TV.arrow(g, mz + 6, gy - 30, mz + 6 + clamp(p.v * 0.07, 20, 80), gy - 30, acc, 3); lab(g, 'v', ' = ' + p.v + ' m/s', mz + 14 + clamp(p.v * 0.035, 10, 40), gy - 44, acc, 'center', fs - 1, bg);
      var LF = clamp(Fa * 0.35, 6, w * 0.26);
      TV.arrow(g, bx - 42, gy - 2, bx - 42 - LF, gy - 2, cF, 4); lab(g, 'F_avg', ' = ' + nf(Fa, 3) + ' N', bx - 42 - LF / 2, gy - 22, cF, 'center', fs - 1, bg);
      lab(g, '', ctx.tx(T('recoil on the gun (to the left)', 'rekyyli aseeseen (vasemmalle)')), 8, 12, mu, 'left', fs - 2);
      // ---- F,t graph of the force on the gun over 1 s: one equal-area pulse m v per shot, the dashed line is the average
      var x0 = 52, x1 = w - 16, y0 = Math.round(h * 0.52), y1 = h - 28, YM = 2200, X = function (s) { return x0 + s * (x1 - x0); }, Y = function (f) { return y0 + f / YM * (y1 - y0); };
      g.strokeStyle = wire; g.lineWidth = 1.5; line(g, x0, y0, x1, y0); line(g, x0, y0 - 6, x0, y1 + 4);
      lab(g, 'F', ' / N (' + ctx.tx(T('on the gun, − = left', 'aseeseen, − = vasemmalle')) + ')', x0 + 6, y0 - 30, fg, 'left', fs - 1); lab(g, 't', ' / s', x1, y0 - 30, fg, 'right', fs);   // above the tick row
      for (var s = 0; s <= 1; s += 0.5) lab(g, '', String(s), X(s), y0 - 12, mu, 'center', fs - 2);
      for (var q = 1000; q <= 2000; q += 1000) { g.strokeStyle = mu; g.lineWidth = 0.6; line(g, x0, Y(q), x1, Y(q)); lab(g, '', '−' + q, x0 - 6, Y(q), mu, 'right', fs - 2); }
      g.fillStyle = TV.alpha(c1, 0.85); var Hp = ps / GUN_TP;
      for (k = 0; (k + 0.5) / rate < 1; k++) { var tk = (k + 0.5) / rate; g.fillRect(X(tk) - Math.max(1, (x1 - x0) * GUN_TP / 2), y0, Math.max(2, (x1 - x0) * GUN_TP), Y(Hp) - y0); }
      g.strokeStyle = cF; g.lineWidth = 2.5; g.setLineDash([6, 4]); line(g, x0, Y(Fa), x1, Y(Fa)); g.setLineDash([]);
      if (w >= 520) lab(g, 'm v', ' = ' + nf(ps, 3) + ' kg·m/s ' + ctx.tx(T('per shot', 'laukausta kohti')), x1, y1 + 14, fg, 'right', fs - 1);   // phones: p = m v is in the readouts
      lab(g, 'F_avg', ' = n m v = ' + nf(Fa, 3) + ' N', x0, y1 + 14, cF, 'left', fs - 1);
    },
    outputs: function (p) {
      var ps = p.mb / 1000 * p.v, rate = p.n / 60;
      return [{ tex: T('n = rounds/s', 'n = laukaukset/s'), value: rate, unit: '1/s' }, { tex: T('p = m v  (one bullet)', 'p = m v  (yksi luoti)'), value: ps, unit: 'kg·m/s' }, { tex: 'F_{avg} = n p', value: rate * ps, unit: 'N' }];
    },
    answer: function (p) { return { v: p.n / 60 * p.mb / 1000 * p.v }; }
  };

  // ---------------------------------------------------------------- the topic
  TDC.registerTopic({
    id: 't5', num: 5,
    title: T('Momentum and impulse', 'Liikemäärä ja impulssi'),
    subtitle: T('Momentum, impulse as the area under F(t), conservation of momentum, and elastic, partially elastic and perfectly inelastic collisions in one and two dimensions.', 'Liikemäärä, impulssi F(t)-kuvaajan alana, liikemäärän säilyminen sekä kimmoiset, osittain kimmoiset ja täysin kimmottomat törmäykset yhdessä ja kahdessa ulottuvuudessa.'),
    objectives: [
      T('calculate momentum p = m v and impulse I = ∫F dt, and use the law of impulses I = Δp', 'laskea liikemäärän p = m v ja impulssin I = ∫F dt sekä käyttää impulssilakia I = Δp'),
      T('find an impulse as the area under an F(t) graph (trapezoidal method) and an average force from I/Δt', 'määrittää impulssin F(t)-kuvaajan alana (puolisuunnikasmenetelmä) ja keskivoiman suhteesta I/Δt'),
      T('use conservation of momentum in recoils, explosions and collisions, with signs for the direction', 'käyttää liikemäärän säilymistä rekyyleissä, räjähdyksissä ja törmäyksissä suunnat etumerkeillä huomioiden'),
      T('solve one-dimensional collisions: perfectly inelastic (e = 0), elastic (e = 1) and partially elastic (0 < e < 1)', 'ratkaista yksiulotteiset törmäykset: täysin kimmoton (e = 0), kimmoinen (e = 1) ja osittain kimmoinen (0 < e < 1)'),
      T('treat a two-dimensional collision component by component', 'käsitellä kaksiulotteisen törmäyksen komponenteittain')
    ],
    glossary: {
      momentum: { en: 'momentum', fi: 'liikemäärä', sym: 'p = m v', def: T('Mass times velocity; a vector along the velocity; unit kg·m/s = N·s.', 'Massa kertaa nopeus; vektori nopeuden suuntaan; yksikkö kg·m/s = N·s.') },
      impulse: { en: 'impulse', fi: 'impulssi', sym: 'I = ∫F dt', def: T('The time integral of the force, the area under the F(t) graph; unit N·s.', 'Voiman aikaintegraali eli F(t)-kuvaajan ala; yksikkö N·s.') },
      impulselaw: { en: 'law of impulses', fi: 'impulssilaki', sym: 'I = Δp', def: T('The impulse of the net force equals the change in momentum.', 'Kokonaisvoiman impulssi on yhtä suuri kuin liikemäärän muutos.') },
      momchange: { en: 'change in momentum', fi: 'liikemäärän muutos', sym: 'Δp = m v − m v_0', def: T('Final minus initial momentum; a vector difference.', 'Loppu- ja alkuliikemäärän erotus; vektorierotus.') },
      conservation: { en: 'conservation of momentum', fi: 'liikemäärän säilyminen', def: T('With no external force the total momentum stays constant.', 'Kun ulkoista voimaa ei ole, kokonaisliikemäärä pysyy vakiona.') },
      extforce: { en: 'external force', fi: 'ulkoinen voima', def: T('A force from outside the system; internal forces between the bodies cancel in pairs.', 'Systeemin ulkopuolinen voima; kappaleiden väliset sisäiset voimat kumoavat toisensa pareittain.') },
      avgforce: { en: 'average force', fi: 'keskimääräinen voima', sym: 'F = I/Δt', def: T('The constant force that would give the same impulse in the same time.', 'Vakiovoima, joka antaisi saman impulssin samassa ajassa.') },
      contact: { en: 'contact time', fi: 'kosketusaika', sym: 'Δt', def: T('How long the bodies are in contact during an impact.', 'Aika, jonka kappaleet ovat kosketuksissa törmäyksessä.') },
      collision: { en: 'collision', fi: 'törmäys', def: T('A short, strong interaction of bodies; momentum is conserved.', 'Kappaleiden lyhyt voimakas vuorovaikutus; liikemäärä säilyy.') },
      directcentral: { en: 'direct and central collision', fi: 'suora ja keskeinen törmäys', def: T('The centres of gravity move along one straight line; the bodies are treated as points at their centres of gravity.', 'Painopisteet liikkuvat samaa suoraa pitkin; kappaleita käsitellään painopisteissään olevina pisteinä.') },
      cog: { en: 'centre of gravity', fi: 'painopiste', def: T('The point where a body can be treated as if all its mass were there.', 'Piste, jossa kappaleen voi ajatella olevan koko sen massan.') },
      inelastic: { en: 'inelastic collision (perfectly inelastic)', fi: 'kimmoton törmäys', sym: 'e = 0', def: T('The bodies cling together after the impact; momentum is conserved, kinetic energy is not.', 'Kappaleet takertuvat toisiinsa törmäyksessä; liikemäärä säilyy, liike-energia ei.') },
      elastic: { en: 'elastic collision', fi: 'kimmoinen törmäys', sym: 'e = 1', def: T('Momentum and kinetic energy are conserved; the bodies do not deform or cling.', 'Liikemäärä ja liike-energia säilyvät; kappaleet eivät muotoudu eivätkä takerru.') },
      partial: { en: 'partially elastic collision', fi: 'osittain kimmoinen törmäys', sym: '0 < e < 1', def: T('Momentum is conserved, part of the kinetic energy goes into deformation.', 'Liikemäärä säilyy, osa liike-energiasta kuluu muodonmuutoksiin.') },
      restitution: { en: 'coefficient of restitution', fi: 'sysäyskerroin', sym: 'e = (u_2 − u_1)/(v_1 − v_2)', def: T('Speed of separation divided by speed of approach; 0 for perfectly inelastic, 1 for elastic.', 'Loittonemisnopeus jaettuna lähestymisnopeudella; 0 täysin kimmottomalla ja 1 kimmoisalla törmäyksellä.') },
      kinetic: { en: 'kinetic energy', fi: 'liike-energia', sym: 'E_k = ½ m v²', def: T('Energy of motion; in a collision part of it can turn into heat and deformation.', 'Liikkeen energia; törmäyksessä osa siitä voi muuttua lämmöksi ja muodonmuutoksiksi.') },
      deformation: { en: 'deformation', fi: 'muodonmuutos', def: T('A permanent change of shape, for example a crumpled car body.', 'Pysyvä muodonmuutos, esimerkiksi rutistunut auton kori.') },
      recoil: { en: 'recoil', fi: 'rekyyli', def: T('The backward motion of a gun (or any body) when it throws something forward.', 'Aseen (tai muun kappaleen) takaisku, kun se sinkoaa jotakin eteenpäin.') },
      recoilforce: { en: 'recoil force', fi: 'rekyylivoima', sym: 'F = n m v', def: T('The average force on a gun from the bullets it fires.', 'Ammuttujen luotien aseeseen kohdistama keskimääräinen voima.') },
      explosion: { en: 'explosion', fi: 'räjähdys', def: T('Internal forces push the parts apart; the total momentum does not change.', 'Sisäiset voimat työntävät osat erilleen; kokonaisliikemäärä ei muutu.') },
      decay: { en: 'radioactive decay', fi: 'radioaktiivinen hajoaminen', def: T('A nucleus splits and the pieces share the momentum like an explosion.', 'Ydin hajoaa ja osaset jakavat liikemäärän kuten räjähdyksessä.') },
      trapezoid: { en: 'trapezoidal method', fi: 'puolisuunnikasmenetelmä', def: T('Approximating the area under a graph by trapezoids.', 'Kuvaajan alle jäävän alan approksimointi puolisuunnikkailla.') },
      component: { en: 'component form', fi: 'komponenttimuoto', def: T('Writing a vector equation separately for each axis.', 'Vektoriyhtälön kirjoittaminen erikseen kullekin akselille.') }
    },
    formulas: [
      { name: T('Momentum', 'Liikemäärä'), tex: 'p = m v' },
      { name: T('Impulse', 'Impulssi'), tex: 'I = ∫_{t_0}^{t} F dt' },
      { name: T('Constant force', 'Vakiovoima'), tex: 'I = F t' },
      { name: T('Law of impulses', 'Impulssilaki'), tex: 'I = m v − m v_0 = Δp' },
      { name: T('Conservation of momentum', 'Liikemäärän säilyminen'), tex: 'm_1 v_1 + m_2 v_2 = m_1 u_1 + m_2 u_2' },
      { name: T('Perfectly inelastic collision', 'Täysin kimmoton törmäys'), tex: 'u = {m_1 v_1 + m_2 v_2}/{m_1 + m_2}' },
      { name: T('Elastic collision: kinetic energy', 'Kimmoinen törmäys: liike-energia'), tex: '½ m_1 v_1^2 + ½ m_2 v_2^2 = ½ m_1 u_1^2 + ½ m_2 u_2^2' },
      { name: T('Coefficient of restitution', 'Sysäyskerroin'), tex: 'e = {u_2 − u_1}/{v_1 − v_2}' },
      { name: T('Elastic, target at rest: u_1', 'Kimmoinen, kohde levossa: u_1'), tex: 'u_1 = {m_1 − m_2}/{m_1 + m_2} v_1' },
      { name: T('Elastic, target at rest: u_2', 'Kimmoinen, kohde levossa: u_2'), tex: 'u_2 = {2\\m_1}/{m_1 + m_2} v_1' },
      { name: T('Partially elastic: u_1', 'Osittain kimmoinen: u_1'), tex: 'u_1 = {m_1 v_1 + m_2 v_2 − m_2 e (v_1 − v_2)}/{m_1 + m_2}' },
      { name: T('Partially elastic: u_2', 'Osittain kimmoinen: u_2'), tex: 'u_2 = {m_1 v_1 + m_2 v_2 + m_1 e (v_1 − v_2)}/{m_1 + m_2}' },
      { name: T('Kinetic energy lost', 'Menetetty liike-energia'), tex: 'ΔE = ½ μ (1 − e^2)(v_1 − v_2)^2,  μ = {m_1 m_2}/{m_1 + m_2}' },
      { name: T('2-D collision, x components', 'Kaksiulotteinen törmäys, x-komponentit'), tex: 'm_1 v_1 = m_1 u_{1x} + m_2 u_{2x}' },
      { name: T('2-D collision, y components', 'Kaksiulotteinen törmäys, y-komponentit'), tex: '0 = m_1 u_{1y} − m_2 u_{2y}' }
    ],
    sections: [
      // ======================================================== 5.1 momentum and impulse (p03)
      { id: 't5-intro', title: T('Momentum and impulse', 'Liike­määrä ja impulssi'),
        blocks: [
          { id: 't5-in-text', type: 'text', html: T(
            '<p>Newton\'s second law <f>F = m a</f> with <f>a = dv/dt</f> gives <f>F dt = m dv</f>. Integrating both sides turns the left side into the <dfn data-term="impulse">impulse</dfn> and the right side into the change of the <dfn data-term="momentum">momentum</dfn> <f>p = m v</f>.</p>',
            '<p>Newtonin II laista <f>F = m a</f>, kun <f>a = dv/dt</f>, saadaan <f>F dt = m dv</f>. Kun molemmat puolet integroidaan, vasemmasta puolesta tulee <dfn data-term="impulse">impulssi</dfn> ja oikeasta <dfn data-term="momentum">liikemäärän</dfn> <f>p = m v</f> muutos.</p>') },
          { id: 't5-in-f1', type: 'formula', key: true, tex: 'I = ∫_{t_0}^{t} F dt = m v − m v_0 = Δp', label: T('Law of impulses: impulse = change in momentum', 'Impulssilaki: impulssi = liikemäärän muutos'),
            legend: [['I', T('impulse', 'impulssi'), 'N·s'], ['p = m v', T('momentum', 'liikemäärä'), 'kg·m/s = N·s'], ['Δp', T('change in momentum', 'liikemäärän muutos'), 'kg·m/s']] },
          { id: 't5-in-text2', type: 'text', html: T(
            '<p>For a constant force the impulse is simply <f>I = F t</f>. In general the impulse is the <b>area under the F,t graph</b>: the combined effect of the force and the time it acts. Momentum and impulse are <b>vectors</b> with the same unit, and the momentum points along the velocity. In one dimension a minus sign means "to the left".</p>',
            '<p>Vakiovoiman impulssi on yksinkertaisesti <f>I = F t</f>. Yleisesti impulssi on <b>F,t-kuvaajan ala</b>: voiman ja vaikutusajan yhteisvaikutus. Liikemäärä ja impulssi ovat <b>vektoreita</b> ja niillä on sama yksikkö; liikemäärä osoittaa nopeuden suuntaan. Yksiulotteisessa tehtävässä miinusmerkki tarkoittaa "vasemmalle".</p>') },
          { id: 't5-impulse-lab', type: 'interactive', widget: 'custom', title: T('Impulse as the area under F(t)', 'Impulssi F(t)-kuvaajan alana'),
            caption: T('The preset is the force of slide p04 acting on an 11 kg body at rest on a frictionless floor. Drag the four points (or use the sliders) to reshape the force: the area (impulse, blue positive, red negative) and the final speed follow. Press Apply the force: the area fills in as time runs, the body speeds up and the momentum bar grows. A negative force pushes from the front and makes the body move to the left. The mass changes how fast the same impulse makes the body move.',
              'Esiasetus on kalvon s. 04 voima, joka vaikuttaa kitkattomalla alustalla levossa olevaan 11 kg:n kappaleeseen. Vedä neljää pistettä (tai käytä säätimiä) ja muokkaa voimaa: ala (impulssi, sininen positiivinen, punainen negatiivinen) ja loppunopeus muuttuvat. Paina Anna voiman vaikuttaa: ala täyttyy ajan kuluessa, kappale kiihtyy ja liikemääräpalkki kasvaa. Negatiivinen voima työntää edestä ja saa kappaleen liikkumaan vasemmalle. Massa muuttaa sen, kuinka nopeasti sama impulssi saa kappaleen liikkeelle.'),
            config: dev(IMP) },
          { id: 't5-in-ex1', type: 'example', title: T('The force on an 11 kg body (slide p04)', 'Voima 11 kg:n kappaleeseen (kalvo s. 04)'),
            problem: T('The force of the graph (45, 50, 20 and 15 N at t = 1, 2, 3 and 4 s, zero at 0 and 5 s) acts on an 11 kg body at rest on a frictionless floor. Find the final speed to two significant figures.',
              'Kuvaajan voima (45, 50, 20 ja 15 N hetkillä t = 1, 2, 3 ja 4 s, nolla hetkillä 0 ja 5 s) vaikuttaa kitkattomalla alustalla levossa olevaan 11 kg:n kappaleeseen. Laske loppunopeus kahden merkitsevän numeron tarkkuudella.'),
            given: ['m = 11 kg', 'v_0 = 0', 'Δt = 1 s'],
            steps: [{ tex: 'I ≈ {0 + 0}/{2} · 1 s + (45 + 50 + 20 + 15) N · 1 s = 130 N·s' }, { tex: 'I = m v ⇒ v = I/m = {130 N·s}/{11 kg} = 11.8 m/s ≈ 12 m/s' },
              T('The curve is estimated from five points, so the true area differs a little.', 'Käyrä arvioidaan viidestä pisteestä, joten todellinen ala poikkeaa hieman.')],
            result: T('v ≈ 12 m/s', 'v ≈ 12 m/s') },
          { type: 'question', q: 't5-q1', id: 't5-q1-blk' },
          { type: 'question', q: 't5-q2', id: 't5-q2-blk' },
          { type: 'question', q: 't5-q3', id: 't5-q3-blk' },
          { type: 'question', q: 't5-q4', id: 't5-q4-blk' },
          { type: 'question', q: 't5-q5', id: 't5-q5-blk' },
          { type: 'question', q: 't5-q6', id: 't5-q6-blk' },
          { type: 'question', q: 't5-q8', id: 't5-q8-blk' }
        ] },

      // ======================================================== 5.2 contact time, average force (p04, ex 5.6, 5.11)
      { id: 't5-contact', title: T('Impulse in action: contact time and average force', 'Impulssi käytännössä: kosketusaika ja keskimääräinen voima'),
        blocks: [
          { id: 't5-ct-text', type: 'text', html: T(
            '<p>In a hit you often know only the speeds <b>before</b> and <b>just after</b> the contact, nothing else. The law of impulses still solves the <dfn data-term="avgforce">average force</dfn>: <f>I = F Δt = m v − m v_0</f>, so <f>F = (m v − m v_0)/Δt</f>.</p>',
            '<p>Iskussa tunnetaan usein vain nopeudet <b>ennen</b> kosketusta ja <b>heti sen jälkeen</b>. Impulssilaki ratkaisee silti <dfn data-term="avgforce">keskimääräisen voiman</dfn>: <f>I = F Δt = m v − m v_0</f>, joten <f>F = (m v − m v_0)/Δt</f>.</p>') },
          { id: 't5-ct-ex', type: 'example', title: T('Golf ball (slide p04)', 'Golfpallo (kalvo s. 04)'),
            problem: T('A golf ball (m = 50.0 g) leaves the club at 48 m/s. The contact time is 0.45 ms. Find the impulse and the average force on the ball.', 'Golfpallon (m = 50,0 g) lähtönopeudeksi mitataan 48 m/s. Mailan kosketusaika palloon on 0,45 ms. Laske palloon kohdistuva impulssi ja keskimääräinen voima.'),
            given: ['m = 50.0 g', 'v_0 = 0', 'v = 48 m/s', 'Δt = 0.45 ms'],
            steps: [{ tex: 'I = m v − m v_0 = 0.0500 kg · 48 m/s = 2.4 N·s' }, { tex: 'F = {I}/{Δt} = {2.4 N·s}/{0.45·10^{−3} s} ≈ 5.3 kN' }],
            result: T('I = 2.4 N·s, F ≈ 5.3 kN', 'I = 2,4 N·s, F ≈ 5,3 kN') },
          { id: 't5-contact-lab', type: 'interactive', widget: 'custom', title: T('Same impulse, shorter contact: a taller force peak', 'Sama impulssi, lyhyempi kosketus: korkeampi voimahuippu'),
            caption: T('The area under the force pulse is the impulse I = m v. Make the contact time Δt shorter with the slider: the pulse gets narrower and taller (the dashed line is the average force with the same area). Then press Hit the ball: in slow motion the club squashes the ball more the larger the force is, the equal and opposite forces act on the ball and the club, and the ball leaves with the speed v. A larger m or v enlarges the area and the whole pulse.',
              'Voimapulssin ala on impulssi I = m v. Lyhennä kosketusaikaa Δt säätimellä: pulssi kapenee ja kasvaa korkeammaksi (katkoviiva on keskimääräinen voima, jolla on sama ala). Paina sitten Lyö palloa: hidastettuna maila litistää palloa sitä enemmän, mitä suurempi voima on, palloon ja mailaan vaikuttavat yhtä suuret vastakkaissuuntaiset voimat, ja pallo lähtee nopeudella v. Suurempi m tai v kasvattaa alaa ja koko pulssia.'),
            config: dev(CON) },
          // (extra) crumple zone / airbag idea
          { id: 't5-ct-tip', type: 'callout', kind: 'tip', title: T('Why airbags and crumple zones work (extra)', 'Miksi turva­tyyny ja rusentumis­vyöhyke toimivat (lisä)'), html: T(
            'A passenger must lose the same momentum <f>m v</f> in any crash. Stretching the stopping time <f>Δt</f> (airbag, crumple zone, bent knees when you land) makes the average force <f>F = m v/Δt</f> smaller in the same proportion.',
            'Matkustajan on menetettävä sama liikemäärä <f>m v</f> kolarissa kuin kolarissa. Pysähtymisajan <f>Δt</f> pidentäminen (turvatyyny, rusentumisvyöhyke, polvien taivutus alastulossa) pienentää keskivoimaa <f>F = m v/Δt</f> samassa suhteessa.') },
          { type: 'question', q: 't5-q9', id: 't5-q9-blk' },
          { type: 'question', q: 't5-q10', id: 't5-q10-blk' },
          { type: 'question', q: 't5-q11', id: 't5-q11-blk' },
          { id: 't5-ct-h1', type: 'h', text: T('Exercise 5.6: a ball and a club', 'Tehtävä 5.6: pallo ja maila') },
          { id: 't5-ct-text2', type: 'text', html: T(
            '<p>Momentum is a vector, so its change depends on the directions. If a ball turns back, the speeds before and after <b>add</b> in the change <f>Δp = m (v − v_0)</f>, because one of the velocities is negative.</p>',
            '<p>Liikemäärä on vektori, joten sen muutos riippuu suunnista. Jos pallo kääntyy takaisin, nopeuksien suuruudet <b>lasketaan yhteen</b> muutoksessa <f>Δp = m (v − v_0)</f>, koska toinen nopeuksista on negatiivinen.</p>') },
          { type: 'question', q: 't5-q12', id: 't5-q12-blk' },
          { type: 'question', q: 't5-q13', id: 't5-q13-blk' },
          { type: 'question', q: 't5-q14', id: 't5-q14-blk' },
          { type: 'question', q: 't5-q15', id: 't5-q15-blk' },
          { id: 't5-ct-h2', type: 'h', text: T('Exercise 5.11: the recoil of a machine gun', 'Tehtävä 5.11: konekiväärin rekyyli') },
          { id: 't5-ct-text3', type: 'text', html: T(
            '<p>When many equal impulses arrive one after another, they add up. A gun that fires <f>n</f> bullets per second, each with momentum <f>m v</f>, receives the momentum <f>n m v</f> every second, so the <dfn data-term="recoilforce">average recoil force</dfn> is <f>F = n m v</f>.</p>',
            '<p>Kun monta samanlaista impulssia tulee peräkkäin, ne summautuvat. Ase, joka ampuu <f>n</f> luotia sekunnissa, kukin liikemäärällä <f>m v</f>, saa joka sekunti liikemäärän <f>n m v</f>, joten <dfn data-term="recoilforce">keskimääräinen rekyylivoima</dfn> on <f>F = n m v</f>.</p>') },
          { id: 't5-gun-lab', type: 'interactive', widget: 'custom', title: T('Machine gun: many small impulses, one average force', 'Konekivääri: monta pientä impulssia, yksi keskivoima'),
            caption: T('The preset is exercise 5.11 (1050 rounds/min, 8.0 g, 730 m/s). The graph shows one second of the force on the gun: every shot is a pulse with the area m v. A higher rate packs more pulses into the second, a heavier or faster bullet makes each pulse taller, and the dashed average force (and the recoil arrow on the gun) follows. Fire shows the bullets leaving to the right and the gun kicking back to the left.',
              'Esiasetus on tehtävä 5.11 (1050 laukausta/min, 8,0 g, 730 m/s). Kuvaaja näyttää yhden sekunnin ajan aseeseen kohdistuvan voiman: jokainen laukaus on pulssi, jonka ala on m v. Suurempi tahti mahduttaa sekuntiin enemmän pulsseja, painavampi tai nopeampi luoti tekee jokaisesta pulssista korkeamman, ja katkoviivalla näkyvä keskivoima (sekä aseen rekyylinuoli) seuraa mukana. Ammu-painike näyttää luotien lähtevän oikealle ja aseen potkaisevan taaksepäin vasemmalle.'),
            config: dev(GUN) },
          { type: 'question', q: 't5-q16', id: 't5-q16-blk' },
          { type: 'question', q: 't5-q17', id: 't5-q17-blk' }
        ] },

      // ======================================================== 5.3 conservation of momentum (p05)
      { id: 't5-conserve', title: T('Conservation of momentum', 'Liikemäärän säilyminen'),
        blocks: [
          { id: 't5-cs-text', type: 'text', html: T(
            '<p>If the total <dfn data-term="extforce">external force</dfn> on a system is zero, there is no impulse and the momentum does not change: <f>F = dp/dt = 0</f> (the first basic law of mechanics). The momentum at the start equals the momentum at the end:</p>',
            '<p>Jos systeemiin kohdistuva <dfn data-term="extforce">ulkoinen kokonaisvoima</dfn> on nolla, impulssia ei ole eikä liikemäärä muutu: <f>F = dp/dt = 0</f> (mekaniikan 1. peruslaki). Liikemäärä alussa on yhtä suuri kuin liikemäärä lopussa:</p>') },
          { id: 't5-cs-f', type: 'formula', key: true, tex: 'p_{10} + p_{20} + p_{30} + … = p_1 + p_2 + p_3 + …', label: T('Conservation of momentum', 'Liikemäärän säilymislaki'),
            legend: [['p_{10}, p_{20}', T('momenta of bodies 1, 2 at the start', 'kappaleiden 1, 2 liikemäärät alussa'), 'kg·m/s'], ['p_1, p_2', T('momenta at the end', 'liikemäärät lopussa'), 'kg·m/s']] },
          { id: 't5-cs-text2', type: 'text', html: T(
            '<p>It holds in <b>collisions</b>, <dfn data-term="explosion">explosions</dfn>, <dfn data-term="decay">radioactive decay</dfn> and any other event where the bodies push on each other: the internal forces are equal and opposite (Newton III), so they never change the total.</p>',
            '<p>Laki pätee <b>törmäyksissä</b>, <dfn data-term="explosion">räjähdyksissä</dfn>, <dfn data-term="decay">radioaktiivisessa hajoamisessa</dfn> ja kaikissa tapahtumissa, joissa kappaleet työntävät toisiaan: sisäiset voimat ovat yhtä suuret ja vastakkaiset (Newton III), joten ne eivät koskaan muuta kokonaisuutta.</p>') },
          { id: 't5-recoil-lab', type: 'interactive', widget: 'custom', title: T('Explosion and recoil: two carts pushed apart', 'Räjähdys ja rekyyli: kaksi vaunua työnnetään erilleen'),
            caption: T('Two carts at rest with a compressed spring between them. The total momentum is zero, so after Release spring the momenta are equal and opposite and the centre of mass (CM) stays where it was. The spring energy E_j sets how fast they fly; the masses decide the split: the lighter cart gets the higher speed and the larger share of the kinetic energy. The dashed bars show the result before the release.',
              'Kaksi vaunua on levossa ja niiden välissä on puristettu jousi. Kokonaisliikemäärä on nolla, joten jousen vapauttamisen jälkeen liikemäärät ovat yhtä suuret ja vastakkaiset ja massakeskipiste (CM) pysyy paikallaan. Jousienergia E_j määrää vauhdin; massat ratkaisevat jaon: kevyempi vaunu saa suuremman nopeuden ja suuremman osan liike-energiasta. Katkoviivapalkit näyttävät tuloksen ennen vapauttamista.'),
            config: dev(REC) },
          { type: 'question', q: 't5-q18', id: 't5-q18-blk' },
          { type: 'question', q: 't5-q19', id: 't5-q19-blk' },
          { type: 'question', q: 't5-q20', id: 't5-q20-blk' },
          { type: 'question', q: 't5-q21', id: 't5-q21-blk' }
        ] },

      // ======================================================== 5.4 collisions, inelastic (p06, p07, ex 88, 91)
      { id: 't5-inelastic', title: T('Collisions and the perfectly inelastic collision', 'Törmäykset ja täysin kimmoton törmäys'),
        blocks: [
          { id: 't5-ie-text', type: 'text', html: T(
            '<p>In a <dfn data-term="directcentral">direct and central collision</dfn> the <dfn data-term="cog">centres of gravity</dfn> of the bodies move along one straight line, and the collision is treated as a collision of the centres of gravity. There are three kinds: <b>inelastic</b>, <b>elastic</b> and <b>partially elastic</b>. In the <dfn data-term="inelastic">inelastic collision</dfn> (perfectly inelastic) the bodies cling together and move on as one piece:</p>',
            '<p><dfn data-term="directcentral">Suorassa ja keskeisessä törmäyksessä</dfn> kappaleiden <dfn data-term="cog">painopisteet</dfn> liikkuvat samaa suoraa pitkin, ja törmäystä käsitellään painopisteiden törmäyksenä. Törmäyksiä on kolmenlaisia: <b>kimmoton</b>, <b>kimmoinen</b> ja <b>osittain kimmoinen</b>. <dfn data-term="inelastic">Kimmottomassa törmäyksessä</dfn> (täysin kimmoton) kappaleet takertuvat toisiinsa ja jatkavat yhtenä kappaleena:</p>') },
          { id: 't5-ie-f', type: 'formula', key: true, tex: 'm_1 v_1 + m_2 v_2 = (m_1 + m_2) u', label: T('Perfectly inelastic collision', 'Täysin kimmoton törmäys'),
            legend: [['v_1, v_2', T('velocities before (signed)', 'nopeudet ennen (etumerkillisinä)'), 'm/s'], ['u', T('common velocity after', 'yhteinen nopeus jälkeen'), 'm/s']] },
          { id: 't5-ie-warn', type: 'callout', kind: 'warn', title: T('Signs carry the direction', 'Etumerkit kantavat suunnan'), html: T(
            'Pick one positive direction. A body moving the other way has a <b>negative</b> velocity, so its momentum is subtracted. "Inelastic" here always means perfectly inelastic, e = 0: only the momentum is conserved, the kinetic energy is not.',
            'Valitse yksi positiivinen suunta. Toiseen suuntaan liikkuvan kappaleen nopeus on <b>negatiivinen</b>, joten sen liikemäärä vähennetään. "Kimmoton" tarkoittaa tässä aina täysin kimmotonta, e = 0: vain liikemäärä säilyy, liike-energia ei.') },
          { id: 't5-ie-ex', type: 'example', title: T('Car hits a car at the traffic lights (slide p07)', 'Auto ajaa auton perään liikenne­valoissa (kalvo s. 07)'),
            problem: T('A 1800 kg car stands at the lights. A 950 kg car drives into it from behind at 50.0 km/h. The cars cling together. Find their speed.', '1800 kg:n auto seisoo liikennevaloissa. 950 kg:n auto ajaa siihen takaa nopeudella 50,0 km/h. Autot takertuvat yhteen. Laske niiden nopeus.'),
            given: ['m_1 = 1800 kg', 'v_1 = 0', 'm_2 = 950 kg', 'v_2 = 50.0 km/h'],
            steps: [T('Perfectly inelastic: the momentum is conserved.', 'Täysin kimmoton: liikemäärä säilyy.'), { tex: 'u = {m_1 v_1 + m_2 v_2}/{m_1 + m_2} = {0 + 950 kg · 50.0 km/h}/{1800 kg + 950 kg} ≈ 17 km/h' },
              T('(extra) Kinetic energy before 91.6 kJ, after 31.7 kJ: about 60 kJ (65 %) goes into deformation and heat.', '(lisä) Liike-energia ennen 91,6 kJ, jälkeen 31,7 kJ: noin 60 kJ (65 %) kuluu muodonmuutokseen ja lämmöksi.')],
            result: T('u ≈ 17 km/h (4.8 m/s)', 'u ≈ 17 km/h (4,8 m/s)') },
          { id: 't5-car-lab', type: 'interactive', widget: 'collision', title: T('Car crash: the cars cling together (e = 0)', 'Auto-onnettomuus: autot takertuvat yhteen (e = 0)'),
            caption: T('The preset is slide p07 (950 kg car at 50 km/h = 13.9 m/s hits an 1800 kg car at rest). Run plays the approach and the crash. Change the masses and speeds: the common speed u and the energy lost follow, and the bars show that the momentum is conserved while most of the kinetic energy is lost. Give the standing car a negative speed to make it come towards you.',
              'Esiasetus on kalvo s. 07 (950 kg:n auto nopeudella 50 km/h = 13,9 m/s osuu levossa olevaan 1800 kg:n autoon). Aja näyttää lähestymisen ja kolarin. Muuta massoja ja nopeuksia: yhteinen nopeus u ja menetetty energia muuttuvat, ja palkit osoittavat, että liikemäärä säilyy mutta suurin osa liike-energiasta häviää. Anna seisovalle autolle negatiivinen nopeus, niin se tulee vastaan.'),
            config: { values: { m1: 950, m2: 1800, v1: 13.9, v2: 0, e: 0 }, ranges: { m1: { min: 500, max: 3000, step: 50 }, m2: { min: 500, max: 3000, step: 50 }, v1: { min: -30, max: 30, step: 0.1 }, v2: { min: -30, max: 30, step: 0.1 } } } },
          { type: 'question', q: 't5-q22', id: 't5-q22-blk' },
          { type: 'question', q: 't5-q23', id: 't5-q23-blk' },
          { type: 'question', q: 't5-q24', id: 't5-q24-blk' },
          { type: 'question', q: 't5-q25', id: 't5-q25-blk' },
          { id: 't5-ie-h', type: 'h', text: T('Exercises 88 and 91: bodies that stick together', 'Tehtävät 88 ja 91: yhteen takertuvat kappaleet') },
          { type: 'question', q: 't5-q26', id: 't5-q26-blk' },
          { type: 'question', q: 't5-q27', id: 't5-q27-blk' },
          { type: 'question', q: 't5-q28', id: 't5-q28-blk' },
          { type: 'question', q: 't5-q29', id: 't5-q29-blk' }
        ] },

      // ======================================================== 5.5 elastic and partially elastic (p08, ex 5.12)
      { id: 't5-elastic', title: T('Elastic and partially elastic collisions', 'Kimmoinen ja osittain kimmoinen törmäys'),
        blocks: [
          { id: 't5-el-text', type: 'text', html: T(
            '<p>In an <dfn data-term="elastic">elastic collision</dfn> both the momentum and the kinetic energy are conserved: the bodies do not deform and do not cling together (billiard balls). In a <dfn data-term="partial">partially elastic collision</dfn> the momentum is conserved, but part of the kinetic energy is spent on deformation (car collisions). Most real collisions are partially elastic.</p>',
            '<p><dfn data-term="elastic">Kimmoisessa törmäyksessä</dfn> sekä liikemäärä että liike-energia säilyvät: kappaleet eivät muotoudu eivätkä takerru toisiinsa (biljardipallot). <dfn data-term="partial">Osittain kimmoisessa törmäyksessä</dfn> liikemäärä säilyy, mutta osa liike-energiasta kuluu muodonmuutoksiin (autojen törmäykset). Useimmat todelliset törmäykset ovat osittain kimmoisia.</p>') },
          { id: 't5-el-f1', type: 'columns', cols: [
            [{ id: 't5-el-fp', type: 'formula', key: true, tex: 'm_1 v_1 + m_2 v_2 = m_1 u_1 + m_2 u_2', label: T('Momentum (every collision)', 'Liikemäärä (kaikki törmäykset)') }],
            [{ id: 't5-el-fk', type: 'formula', key: true, tex: '½ m_1 v_1^2 + ½ m_2 v_2^2 = ½ m_1 u_1^2 + ½ m_2 u_2^2', label: T('Kinetic energy (elastic only)', 'Liike-energia (vain kimmoisa)') }]] },
          { id: 't5-el-text2', type: 'text', html: T(
            '<p>The degree of elasticity is described by the <dfn data-term="restitution">coefficient of restitution</dfn> <f>e</f>, measured from the speeds before and after. With velocities signed along one axis, the bodies separate with the fraction <f>e</f> of the speed with which they approached:</p>',
            '<p>Kimmoisuuden astetta kuvataan <dfn data-term="restitution">sysäyskertoimella</dfn> <f>e</f>, joka määritetään nopeuksista ennen ja jälkeen. Kun nopeudet ovat etumerkillisiä samalla akselilla, kappaleet loittonevat osuudella <f>e</f> lähestymisnopeudestaan:</p>') },
          { id: 't5-el-fe', type: 'formula', key: true, tex: 'e = {u_2 − u_1}/{v_1 − v_2}', label: T('Coefficient of restitution', 'Sysäyskerroin'),
            legend: [['e = 1', T('elastic', 'kimmoinen'), ''], ['0 < e < 1', T('partially elastic', 'osittain kimmoinen'), ''], ['e = 0', T('perfectly inelastic', 'täysin kimmoton'), '']] },
          { id: 't5-el-note', type: 'callout', kind: 'note', title: T('Same number, two ways of writing it', 'Sama luku, kaksi kirjoitustapaa'), html: T(
            'The slide writes <f>e = (u_1 − u_2)/(v_2 − v_1)</f>. It is the same number as <f>(u_2 − u_1)/(v_1 − v_2)</f>, as long as all velocities are signed along one axis. With speeds only (no signs) use "speed of separation / speed of approach".',
            'Kalvolla kaava on <f>e = (u_1 − u_2)/(v_2 − v_1)</f>. Se on sama luku kuin <f>(u_2 − u_1)/(v_1 − v_2)</f>, kunhan kaikki nopeudet ovat etumerkillisiä samalla akselilla. Pelkillä nopeuden suuruuksilla käytä "loittonemisnopeus / lähestymisnopeus".') },
          // (extra) closed formulas
          { id: 't5-el-text3', type: 'text', html: T(
            '<p>(extra) Momentum conservation and the definition of <f>e</f> are two equations for the two unknowns <f>u_1</f> and <f>u_2</f>. Solving them gives, for a target at rest and an elastic collision, <f>u_1 = (m_1 − m_2)/(m_1 + m_2) v_1</f> and <f>u_2 = 2\\m_1/(m_1 + m_2) v_1</f>: equal masses swap velocities, a heavy body keeps going, a light body bounces back from a heavy one. The kinetic energy lost is <f>ΔE = ½ μ (1 − e^2)(v_1 − v_2)^2</f> with <f>μ = m_1 m_2/(m_1 + m_2)</f>.</p>',
            '<p>(lisä) Liikemäärän säilyminen ja kertoimen <f>e</f> määritelmä ovat kaksi yhtälöä kahdelle tuntemattomalle <f>u_1</f> ja <f>u_2</f>. Kimmoisassa törmäyksessä ja levossa olevalle kohteelle ratkaisuksi saadaan <f>u_1 = (m_1 − m_2)/(m_1 + m_2) v_1</f> ja <f>u_2 = 2\\m_1/(m_1 + m_2) v_1</f>: yhtä painavat kappaleet vaihtavat nopeudet, painava kappale jatkaa matkaansa ja kevyt kimpoaa painavasta takaisin. Menetetty liike-energia on <f>ΔE = ½ μ (1 − e^2)(v_1 − v_2)^2</f>, missä <f>μ = m_1 m_2/(m_1 + m_2)</f>.</p>') },
          { id: 't5-collide-lab', type: 'interactive', widget: 'collision', title: T('Collision lab: choose the elasticity e', 'Törmäys­laboratorio: valitse kimmoisuus e'),
            caption: T('The preset is exercise 5.12: a 0.90 kg sphere at 3.0 m/s hits a 0.10 kg sphere at rest. Change e from 0 (stick together) to 1 (elastic) and press Run: the speeds after the impact and the kinetic energy bars change, while the momentum bars always stay equal. The velocities are signed: give a cart a negative speed and it moves to the left. Carts moving apart do not collide.',
              'Esiasetus on tehtävä 5.12: 0,90 kg:n pallo nopeudella 3,0 m/s osuu levossa olevaan 0,10 kg:n palloon. Muuta e:tä arvosta 0 (takertuvat) arvoon 1 (kimmoinen) ja paina Aja: nopeudet törmäyksen jälkeen ja liike-energiapalkit muuttuvat, kun taas liikemääräpalkit pysyvät aina yhtä suurina. Nopeudet ovat etumerkillisiä: anna vaunulle negatiivinen nopeus, niin se liikkuu vasemmalle. Toisistaan loittonevat vaunut eivät törmää.'),
            config: { values: { m1: 0.9, m2: 0.1, v1: 3, v2: 0, e: 0.7 } } },
          // (extra) Newton's cradle / velocity swap
          { id: 't5-swap-lab', type: 'interactive', widget: 'collision', title: T('Equal masses swap velocities (extra)', 'Yhtä painavat kappaleet vaihtavat nopeudet (lisä)'),
            caption: T('Equal masses, e = 1: the moving cart stops and the other one carries on at the same speed, as in Newton\'s cradle. Now change m_2: a heavier target makes cart 1 bounce back, a lighter one lets it carry on slower. Give cart 2 a speed to see two moving carts exchange velocities.',
              'Yhtä painavat massat, e = 1: liikkuva vaunu pysähtyy ja toinen jatkaa samalla nopeudella kuten Newtonin kiikussa. Muuta nyt m_2:ta: painavampi kohde saa vaunun 1 kimpoamaan takaisin, kevyempi antaa sen jatkaa hitaammin. Anna vaunulle 2 nopeus, niin näet kahden liikkuvan vaunun vaihtavan nopeudet.'),
            config: { values: { m1: 1, m2: 1, v1: 2, v2: 0, e: 1 } } },
          { type: 'question', q: 't5-q30', id: 't5-q30-blk' },
          { type: 'question', q: 't5-q31', id: 't5-q31-blk' },
          { type: 'question', q: 't5-q32', id: 't5-q32-blk' },
          { id: 't5-el-h', type: 'h', text: T('Exercise 5.12: a sphere hits a sphere', 'Tehtävä 5.12: pallo törmää palloon') },
          { type: 'question', q: 't5-q33', id: 't5-q33-blk' },
          { type: 'question', q: 't5-q34', id: 't5-q34-blk' },
          { type: 'question', q: 't5-q35', id: 't5-q35-blk' },
          { type: 'question', q: 't5-q36', id: 't5-q36-blk' },
          { type: 'question', q: 't5-q37', id: 't5-q37-blk' },
          { id: 't5-el-h2', type: 'h', text: T('Using the lab to find e or a mass', 'Laboratorion käyttö e:n tai massan löytämiseen') },
          { type: 'question', q: 't5-q38', id: 't5-q38-blk' },
          { type: 'question', q: 't5-q39', id: 't5-q39-blk' },
          { type: 'question', q: 't5-q40', id: 't5-q40-blk' },
          { type: 'question', q: 't5-q41', id: 't5-q41-blk' },
          { type: 'question', q: 't5-q42', id: 't5-q42-blk' },
          { type: 'question', q: 't5-q43', id: 't5-q43-blk' }
        ] },

      // ======================================================== 5.6 two-dimensional collision (p09)
      { id: 't5-2d', title: T('Two-dimensional collisions', 'Kaksi­ulotteinen törmäys'),
        blocks: [
          { id: 't5-2d-text', type: 'text', html: T(
            '<p>When the collision is not head-on, the centres of gravity do not meet along one line: billiard balls and cars usually hit off-centre. The momentum is a vector and is still conserved, now in <dfn data-term="component">component form</dfn>: separately along x and along y.</p>',
            '<p>Kun törmäys ei ole suora, painopisteet eivät kohtaa samalla suoralla: biljardipallot ja autot törmäävät yleensä sivuttain. Liikemäärä on vektori ja säilyy edelleen, nyt <dfn data-term="component">komponenttimuodossa</dfn>: erikseen x- ja y-suunnassa.</p>') },
          { id: 't5-2d-fig', type: 'figure', svg: FIG_2D, caption: T('Body 1 arrives along x, body 2 is at rest. After the impact both leave at an angle; each velocity has an x and a y component.', 'Kappale 1 saapuu x-suunnassa, kappale 2 on levossa. Törmäyksen jälkeen kumpikin lähtee kulmassa; kummallakin nopeudella on x- ja y-komponentti.'), alt: T('Two balls after an off-centre collision with the velocity components drawn', 'Kaksi palloa sivuttaisen törmäyksen jälkeen, nopeuksien komponentit piirretty') },
          { id: 't5-2d-f', type: 'columns', cols: [
            [{ id: 't5-2d-fx', type: 'formula', key: true, tex: 'Σ p_x = m_1 v_1 = m_1 u_{1x} + m_2 u_{2x}', label: T('x components', 'x-komponentit') }],
            [{ id: 't5-2d-fy', type: 'formula', key: true, tex: 'Σ p_y = 0 = m_1 u_{1y} − m_2 u_{2y}', label: T('y components', 'y-komponentit') }]] },
          { id: 't5-2d-note', type: 'callout', kind: 'note', title: T('A sign convention in the y equation', 'Etumerkkisopimus y-yhtälössä'), html: T(
            'In the second equation <f>u_{2y}</f> is the <b>size</b> of the downward component of body 2, so the two y momenta cancel. If you write both y components with signs (up positive), it reads <f>0 = m_1 u_{1y} + m_2 u_{2y}</f>.',
            'Jälkimmäisessä yhtälössä <f>u_{2y}</f> on kappaleen 2 alaspäin suuntautuvan komponentin <b>suuruus</b>, joten y-suuntaiset liikemäärät kumoavat toisensa. Jos kirjoitat molemmat y-komponentit etumerkeillä (ylös positiivinen), yhtälö on <f>0 = m_1 u_{1y} + m_2 u_{2y}</f>.') },
          { id: 't5-2d-lab', type: 'interactive', widget: 'collision', title: T('Billiards: the aim decides the angles', 'Biljardi: tähtäys ratkaisee kulmat'),
            caption: T('Ball 1 (speed v_1 along x) hits ball 2 at rest. The aim offset b is the sideways distance of the centres as a fraction of the contact distance: 0 is head-on, larger b is a glancing hit and sends ball 2 off at a larger angle below the x axis and ball 1 up the other way. The arrows have x and y components; the bars show that p_y before and after is zero. For equal masses and e = 1 the two balls leave at a right angle. With unequal masses or e < 1 the angle between them changes.',
              'Pallo 1 (nopeus v_1 x-suunnassa) osuu levossa olevaan palloon 2. Tähtäyspoikkeama b on keskipisteiden sivuttaisetäisyys osana kosketusetäisyydestä: 0 on suora isku, suurempi b on sivuttaisisku, joka lähettää pallon 2 suuremmassa kulmassa x-akselin alapuolelle ja pallon 1 ylös toiselle puolelle. Nuolilla on x- ja y-komponentit; palkit näyttävät, että p_y ennen ja jälkeen on nolla. Yhtä painavilla palloilla ja e = 1 pallot lähtevät suorassa kulmassa. Eri massoilla tai e < 1 niiden välinen kulma muuttuu.'),
            config: { mode: '2d', values: { m1: 1, m2: 1, v1: 2, b: 0.5, e: 1 } } },
          { type: 'question', q: 't5-q44', id: 't5-q44-blk' },
          { type: 'question', q: 't5-q45', id: 't5-q45-blk' },
          { type: 'question', q: 't5-q46', id: 't5-q46-blk' },
          { type: 'question', q: 't5-q47', id: 't5-q47-blk' },
          { type: 'question', q: 't5-q48', id: 't5-q48-blk' },
          { type: 'question', q: 't5-q49', id: 't5-q49-blk' },
          { id: 't5-2d-tip', type: 'callout', kind: 'tip', title: T('A ladder you have climbed', 'Portaikko, jonka olet kiivennyt'), html: T(
            'Momentum p = m v and impulse I = ∫F dt, the law of impulses, conservation of momentum, perfectly inelastic collisions, elastic and partially elastic collisions with e, and finally the same ideas by components. Every exercise of the deck is the top step of one of these ladders.',
            'Liikemäärä p = m v ja impulssi I = ∫F dt, impulssilaki, liikemäärän säilyminen, täysin kimmottomat törmäykset, kimmoiset ja osittain kimmoiset törmäykset kertoimella e ja lopuksi samat ajatukset komponenteittain. Jokainen tehtävä on yhden tällaisen portaikon ylin askel.') }
        ] }
    ],

    questions: [
      // ---- 5.1 momentum and impulse
      { id: 't5-q1', mode: 'practice', type: 'mc', difficulty: 1,
        prompt: T('What is the unit of impulse?', 'Mikä on impulssin yksikkö?'),
        options: [{ id: 'a', html: 'N·m' }, { id: 'b', html: 'N·s' }, { id: 'c', html: 'kg·m' }, { id: 'd', html: 'J/s' }],
        hints: [T('Impulse is force times time.', 'Impulssi on voima kertaa aika.')] },
      { id: 't5-q2', mode: 'practice', type: 'mc', difficulty: 1,
        prompt: T('What does the area under an F(t) graph represent?', 'Mitä F(t)-kuvaajan alle jäävä ala esittää?'),
        options: [{ id: 'a', html: T('the work of the force', 'voiman tekemää työtä') }, { id: 'b', html: T('the power of the force', 'voiman tehoa') }, { id: 'c', html: T('the impulse of the force', 'voiman impulssia') }, { id: 'd', html: T('the average force', 'keskimääräistä voimaa') }],
        hints: [T('Multiply the height (force) by the width (time) and check the unit.', 'Kerro korkeus (voima) leveydellä (aika) ja tarkista yksikkö.')] },
      { id: 't5-q3', mode: 'practice', type: 'fill', difficulty: 1,
        prompt: T('Complete the law of impulses (one word).', 'Täydennä impulssilaki (yksi sana).'),
        text: T('The impulse of the net force on a body equals the change in its [[a]].', 'Kappaleeseen kohdistuvan kokonaisvoiman impulssi on yhtä suuri kuin sen [[a]] muutos.'),
        fields: [{ id: 'a', kind: 'text' }],
        hints: [T('It is the quantity m v.', 'Se on suure m v.')] },
      { id: 't5-q4', mode: 'practice', type: 'mc', difficulty: 1,
        prompt: T('Which statement about the momentum p = m v is correct?', 'Mikä väite liikemäärästä p = m v on oikea?'),
        options: [{ id: 'a', html: T('It is a scalar quantity.', 'Se on skalaarisuure.') }, { id: 'b', html: T('It is a vector along the velocity.', 'Se on nopeuden suuntainen vektori.') }, { id: 'c', html: T('It is a vector against the velocity.', 'Se on nopeutta vastaan suuntautuva vektori.') }, { id: 'd', html: T('It depends only on the mass.', 'Se riippuu vain massasta.') }],
        hints: [T('Multiplying a vector by a positive number does not turn it around.', 'Vektorin kertominen positiivisella luvulla ei käännä sitä.')] },
      { id: 't5-q5', mode: 'practice', type: 'numeric', difficulty: 1,
        prompt: T('A golf ball of 50.0 g leaves the club at 48 m/s. What impulse did the club give the ball?', 'Golfpallo (50,0 g) lähtee mailasta nopeudella 48 m/s. Kuinka suuren impulssin maila antoi pallolle?'),
        fields: [{ id: 'I', tex: 'I', unit: 'N·s' }],
        hints: [T('The ball started at rest: I = m v − 0.', 'Pallo oli aluksi levossa: I = m v − 0.'), T('Use the mass in kilograms.', 'Käytä massaa kilogrammoina.')] },
      { id: 't5-q6', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('A force acts on a body. At t = 0, 1, 2, 3, 4 and 5 s it is 0, 20, 40, 30, 10 and 0 N. Find the impulse with the trapezoidal method.', 'Kappaleeseen vaikuttaa voima. Hetkillä t = 0, 1, 2, 3, 4 ja 5 s se on 0, 20, 40, 30, 10 ja 0 N. Laske impulssi puolisuunnikasmenetelmällä.'),
        fields: [{ id: 'I', tex: 'I', unit: 'N·s' }],
        hints: [T('End values count half, inner values in full, times Δt = 1 s.', 'Päätearvot lasketaan puolella, väliarvot kokonaan, kerrottuna Δt = 1 s.'), T('Check with the lab: set the four inner values.', 'Tarkista laboratoriolla: aseta neljä sisäarvoa.')] },
      { id: 't5-q7', mode: 'graded', type: 'numeric', difficulty: 2,
        prompt: T('The force of the previous question (0, 20, 40, 30, 10, 0 N at 1 s steps) acts on a 4.0 kg body at rest on a frictionless floor. What is its speed after 5 s?', 'Edellisen kysymyksen voima (0, 20, 40, 30, 10, 0 N sekunnin välein) vaikuttaa kitkattomalla alustalla levossa olevaan 4,0 kg:n kappaleeseen. Mikä on sen nopeus 5 s:n jälkeen?'),
        fields: [{ id: 'v', tex: 'v', unit: 'm/s' }],
        hints: [T('The impulse equals the change in momentum: I = m v − 0.', 'Impulssi on yhtä suuri kuin liikemäärän muutos: I = m v − 0.'), T('The body starts at rest, so v_0 = 0.', 'Kappale lähtee levosta, joten v_0 = 0.')] },
      { id: 't5-q8', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('The force of slide p04 (45, 50, 20 and 15 N at t = 1…4 s, zero at 0 and 5 s; impulse 130 N·s) acts on a 17 kg body at rest. Give its final speed to two significant figures.', 'Kalvon s. 04 voima (45, 50, 20 ja 15 N hetkillä t = 1…4 s, nolla hetkillä 0 ja 5 s; impulssi 130 N·s) vaikuttaa levossa olevaan 17 kg:n kappaleeseen. Anna sen loppunopeus kahden merkitsevän numeron tarkkuudella.'),
        fields: [{ id: 'v', kind: 'sig', tex: 'v', unit: 'm/s' }],
        hints: [T('v = I/m, then round to two significant figures.', 'v = I/m, pyöristä sitten kahteen merkitsevään numeroon.')] },

      // ---- 5.2 contact time, average force
      { id: 't5-q9', mode: 'graded', type: 'numeric', difficulty: 2,
        prompt: T('The golf ball (50.0 g, 48 m/s) is in contact with the club for 0.45 ms. What is the average force on the ball? (Slide p04)', 'Golfpallo (50,0 g, 48 m/s) on kosketuksissa mailaan 0,45 ms. Kuinka suuri on palloon kohdistuva keskimääräinen voima? (Kalvo s. 04)'),
        fields: [{ id: 'F', tex: 'F', unit: 'N' }],
        hints: [T('F Δt = m v − m v_0: first the impulse, then divide by the time.', 'F Δt = m v − m v_0: laske ensin impulssi ja jaa sitten ajalla.'), T('0.45 ms = 0.45·10⁻³ s.', '0,45 ms = 0,45·10⁻³ s.')] },
      { id: 't5-q10', mode: 'practice', type: 'mc', difficulty: 1,
        prompt: T('The same ball gets the same speed change, but the contact time is halved. The average force becomes', 'Sama pallo saa saman nopeudenmuutoksen, mutta kosketusaika puolittuu. Keskimääräinen voima on'),
        options: [{ id: 'a', html: T('half as large', 'puolet') }, { id: 'b', html: T('the same', 'sama') }, { id: 'c', html: T('twice as large', 'kaksinkertainen') }, { id: 'd', html: T('four times as large', 'nelinkertainen') }],
        hints: [T('The impulse stays the same: F Δt = constant.', 'Impulssi pysyy samana: F Δt = vakio.'), T('Try it in the lab with the Δt slider.', 'Kokeile laboratoriossa Δt-säätimellä.')] },
      { id: 't5-q11', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('A 75 kg passenger travelling at 14 m/s (about 50 km/h) is stopped by the belt and the airbag in 0.10 s. What is the average force on the passenger?', '75 kg:n matkustaja kulkee nopeudella 14 m/s (noin 50 km/h) ja pysähtyy turvavyön ja turvatyynyn ansiosta 0,10 s:ssa. Kuinka suuri on matkustajaan kohdistuva keskimääräinen voima?'),
        fields: [{ id: 'F', tex: 'F', unit: 'N' }],
        hints: [T('The momentum goes from m v to 0 in the time Δt.', 'Liikemäärä muuttuu arvosta m v nollaan ajassa Δt.')] },
      { id: 't5-q12', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('A ball (m = 0.15 kg) hits a club at the horizontal speed 24 m/s and leaves in the opposite direction at 36 m/s. Take the incoming direction as positive. What is the change in momentum of the ball? (Exercise 5.6 a)', 'Pallo (m = 0,15 kg) osuu mailaan vaakasuoralla nopeudella 24 m/s ja lähtee vastakkaiseen suuntaan nopeudella 36 m/s. Valitse tulosuunta positiiviseksi. Kuinka suuri on pallon liikemäärän muutos? (Tehtävä 5.6 a)'),
        fields: [{ id: 'dp', tex: 'Δp', unit: 'kg·m/s' }],
        hints: [T('Δp = m (v − v_0), and the final velocity is negative.', 'Δp = m (v − v_0), ja loppunopeus on negatiivinen.'), T('The speeds add up because the direction turns around.', 'Nopeuksien suuruudet summautuvat, koska suunta kääntyy.')] },
      { id: 't5-q13', mode: 'graded', type: 'numeric', difficulty: 2,
        prompt: T('The contact time of the previous hit is 0.0020 s. With what average force does the ball act on the club? (Exercise 5.6 b)', 'Edellisen iskun kosketusaika on 0,0020 s. Kuinka suurella keskimääräisellä voimalla pallo vaikuttaa mailaan? (Tehtävä 5.6 b)'),
        fields: [{ id: 'F', tex: 'F', unit: 'N' }],
        hints: [T('Use the size of the change in momentum.', 'Käytä liikemäärän muutoksen suuruutta.'), T('The force of the ball on the club equals the force of the club on the ball in size (Newton III).', 'Pallon voima mailaan on suuruudeltaan sama kuin mailan voima palloon (Newton III).')] },
      { id: 't5-q14', mode: 'practice', type: 'fbd', difficulty: 2,
        prompt: T('A golf ball is in the air and the club hits it from the left at this very moment. Draw the free-body diagram of the ball during the contact: give each force a direction (or "not acting") and set the arrow lengths so that the compared pair is right.',
          'Golfpallo on ilmassa ja maila osuu siihen vasemmalta juuri nyt. Piirrä pallon vapaakappalekuvio kosketuksen aikana: anna jokaiselle voimalle suunta (tai "ei vaikuta") ja säädä nuolten pituudet niin, että verrattava pari on oikein.'),
        hints: [T('Only gravity and things touching the ball can exert forces on it.', 'Palloon voivat vaikuttaa vain painovoima ja palloa koskettavat kappaleet.'), T('Compare the club force (thousands of newtons) with the weight of a 50 g ball.', 'Vertaa mailan voimaa (tuhansia newtoneja) 50 g:n pallon painoon.')],
        widget: { name: 'fbd', config: { scene: 'floor',
          forces: [{ id: 'G', tex: 'mg' }, { id: 'F', label: T('club force on the ball', 'mailan voima palloon') }, { id: 'N', tex: 'N' }, { id: 'Fs', label: T('force of the swing', 'heilautuksen voima') }],
          compare: [['F', 'G']] } } },
      { id: 't5-q15', mode: 'graded', type: 'mc', difficulty: 2,
        prompt: T('A ball hits a wall at the speed v and bounces straight back at the speed v. What is the size of the change in its momentum?', 'Pallo osuu seinään nopeudella v ja kimpoaa suoraan takaisin nopeudella v. Kuinka suuri on sen liikemäärän muutos?'),
        options: [{ id: 'a', html: '0' }, { id: 'b', html: '<f>m v</f>' }, { id: 'c', html: '<f>m v/2</f>' }, { id: 'd', html: '<f>2\\m v</f>' }],
        hints: [T('The momentum changes from +m v to −m v.', 'Liikemäärä muuttuu arvosta +m v arvoon −m v.')] },
      { id: 't5-q16', mode: 'practice', type: 'numeric', difficulty: 1,
        prompt: T('A bullet of 8.0 g leaves a machine gun at 730 m/s. What is the momentum of the bullet?', '8,0 g:n luoti lähtee konekivääristä nopeudella 730 m/s. Kuinka suuri on luodin liikemäärä?'),
        fields: [{ id: 'p', tex: 'p', unit: 'kg·m/s' }],
        hints: [T('p = m v with the mass in kilograms.', 'p = m v, massa kilogrammoina.')] },
      { id: 't5-q17', mode: 'graded', type: 'numeric', difficulty: 3, tol: 0.03,
        prompt: T('What is the average recoil force of a machine gun that fires 1050 rounds per minute? The bullet has the mass 8.0 g and the speed 730 m/s. (Exercise 5.11)', 'Kuinka suuri on konekiväärin keskimääräinen rekyylivoima, kun se ampuu 1050 laukausta minuutissa? Luodin massa on 8,0 g ja nopeus 730 m/s. (Tehtävä 5.11)'),
        fields: [{ id: 'F', tex: 'F', unit: 'N' }],
        hints: [T('How many bullets per second? How much momentum does the gun give to them in one second?', 'Montako luotia sekunnissa? Kuinka paljon liikemäärää ase antaa niille yhdessä sekunnissa?'), T('The force on the gun is the momentum given away per second.', 'Aseeseen kohdistuva voima on sekunnissa luovutettu liikemäärä.')] },

      // ---- 5.3 conservation
      { id: 't5-q18', mode: 'practice', type: 'mc', difficulty: 1,
        prompt: T('When is the total momentum of a system constant?', 'Milloin systeemin kokonaisliikemäärä pysyy vakiona?'),
        options: [{ id: 'a', html: T('when no kinetic energy is lost', 'kun liike-energiaa ei häviä') }, { id: 'b', html: T('when the bodies never touch', 'kun kappaleet eivät koskaan kosketa toisiaan') }, { id: 'c', html: T('when all velocities are equal', 'kun kaikki nopeudet ovat yhtä suuret') }, { id: 'd', html: T('when the total external force is zero', 'kun ulkoinen kokonaisvoima on nolla') }],
        hints: [T('Internal forces come in equal and opposite pairs.', 'Sisäiset voimat esiintyvät yhtä suurina vastakkaisina pareina.')] },
      { id: 't5-q19', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('Two carts of 1.0 kg and 3.0 kg rest against a compressed spring. After the release the 1.0 kg cart flies to the left at 6.0 m/s. What is the speed of the 3.0 kg cart?', 'Kaksi vaunua, 1,0 kg ja 3,0 kg, on levossa puristetun jousen vastakkain. Vapautuksen jälkeen 1,0 kg:n vaunu lentää vasemmalle nopeudella 6,0 m/s. Kuinka suuri on 3,0 kg:n vaunun nopeus?'),
        fields: [{ id: 'v', tex: 'u_2', unit: 'm/s' }],
        hints: [T('The total momentum was zero before and stays zero.', 'Kokonaisliikemäärä oli nolla ennen ja pysyy nollana.'), T('0 = m_1 u_1 + m_2 u_2 with u_1 negative.', '0 = m_1 u_1 + m_2 u_2, missä u_1 on negatiivinen.')] },
      { id: 't5-q20', mode: 'practice', type: 'mc', difficulty: 2,
        prompt: T('Two carts at rest are pushed apart by a spring. Right after the release the total momentum is ... and the total kinetic energy is ...', 'Jousi työntää kaksi levossa olevaa vaunua erilleen. Heti vapautuksen jälkeen kokonaisliikemäärä on ... ja liike-energia yhteensä on ...'),
        options: [{ id: 'a', html: T('zero; zero', 'nolla; nolla') }, { id: 'b', html: T('positive; positive', 'positiivinen; positiivinen') }, { id: 'c', html: T('zero; positive', 'nolla; positiivinen') }, { id: 'd', html: T('positive; zero', 'positiivinen; nolla') }],
        hints: [T('The momenta point in opposite directions. Is kinetic energy a vector?', 'Liikemäärät osoittavat vastakkaisiin suuntiin. Onko liike-energia vektori?')] },
      { id: 't5-q21', mode: 'graded', type: 'numeric', difficulty: 2,
        prompt: T('A rifle of 4.0 kg fires a bullet of 20 g at 600 m/s. Find the recoil speed of the rifle (treat the 4.0 kg as the mass of the rifle alone, and the rifle as free).', '4,0 kg:n kivääri ampuu 20 g:n luodin nopeudella 600 m/s. Laske kiväärin rekyylinopeus (4,0 kg on pelkän kiväärin massa, ja kivääri on vapaa).'),
        fields: [{ id: 'v', tex: 'u', unit: 'm/s' }],
        hints: [T('Momentum before is zero, so the rifle and the bullet get equal and opposite momenta.', 'Liikemäärä ennen on nolla, joten kivääri ja luoti saavat yhtä suuret vastakkaiset liikemäärät.')] },

      // ---- 5.4 inelastic
      { id: 't5-q22', mode: 'graded', type: 'mc', difficulty: 1,
        prompt: T('In a perfectly inelastic collision which quantity is conserved?', 'Mikä suure säilyy täysin kimmottomassa törmäyksessä?'),
        options: [{ id: 'a', html: T('momentum and kinetic energy', 'liikemäärä ja liike-energia') }, { id: 'b', html: T('kinetic energy only', 'vain liike-energia') }, { id: 'c', html: T('neither of them', 'kumpikaan') }, { id: 'd', html: T('momentum only', 'vain liikemäärä') }],
        hints: [T('The bodies cling together and part of the energy turns into deformation and heat.', 'Kappaleet takertuvat toisiinsa ja osa energiasta muuttuu muodonmuutokseksi ja lämmöksi.')] },
      { id: 't5-q23', mode: 'practice', type: 'multi', difficulty: 1,
        prompt: T('Which of these collisions are (nearly) perfectly inelastic? Select all.', 'Mitkä seuraavista törmäyksistä ovat (lähes) täysin kimmottomia? Valitse kaikki.'),
        options: [{ id: 'a', html: T('a dart sticks in a board', 'tikka juuttuu tauluun') }, { id: 'b', html: T('two billiard balls bounce apart', 'kaksi biljardipalloa kimpoaa erilleen') }, { id: 'c', html: T('two railway wagons couple together', 'kaksi junavaunua kytkeytyy yhteen') }, { id: 'd', html: T('a steel ball bounces off a steel plate', 'teräspallo kimpoaa teräslevystä') }, { id: 'e', html: T('two lumps of clay stick together', 'kaksi savimöykkyä takertuu toisiinsa') }],
        hints: [T('Perfectly inelastic means that the bodies move on as one piece.', 'Täysin kimmoton tarkoittaa, että kappaleet jatkavat yhtenä kappaleena.')] },
      { id: 't5-q24', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.03,
        prompt: T('A 950 kg car drives at 50.0 km/h into the back of a standing 1800 kg car; they cling together. Give their speed in m/s. (Slide p07)', '950 kg:n auto ajaa nopeudella 50,0 km/h seisovan 1800 kg:n auton perään ja autot takertuvat yhteen. Anna niiden nopeus yksikössä m/s. (Kalvo s. 07)'),
        fields: [{ id: 'u', tex: 'u', unit: 'm/s' }],
        hints: [T('Convert 50.0 km/h to m/s first (÷ 3.6).', 'Muunna ensin 50,0 km/h yksikköön m/s (÷ 3,6).'), T('m_2 v_2 = (m_1 + m_2) u.', 'm_2 v_2 = (m_1 + m_2) u.')] },
      { id: 't5-q25', mode: 'practice', type: 'numeric', difficulty: 3, tol: 0.02,
        prompt: T('How much kinetic energy do the two cars of the previous question lose in the crash (deformation and heat)?', 'Kuinka paljon liike-energiaa edellisen kysymyksen autot menettävät kolarissa (muodonmuutos ja lämpö)?'),
        fields: [{ id: 'dE', tex: 'ΔE', unit: 'J' }],
        hints: [T('Energy before: only the moving car has some. Energy after: both cars, common speed.', 'Energia ennen: vain liikkuvalla autolla on energiaa. Energia jälkeen: molemmat autot, yhteinen nopeus.'), T('Use unrounded speeds.', 'Käytä pyöristämättömiä nopeuksia.')] },
      { id: 't5-q26', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('Two bodies of 12.0 kg and 8.5 kg move towards each other at 5.5 m/s and 5.0 m/s. Take the direction of the 12.0 kg body as positive. What is the total momentum?', '12,0 kg:n ja 8,5 kg:n kappaleet liikkuvat toisiaan kohti nopeuksilla 5,5 m/s ja 5,0 m/s. Valitse 12,0 kg:n kappaleen suunta positiiviseksi. Kuinka suuri on kokonaisliikemäärä?'),
        fields: [{ id: 'P', tex: 'Σp', unit: 'kg·m/s' }],
        hints: [T('The second body moves against the positive direction: its velocity is −5.0 m/s.', 'Toinen kappale liikkuu positiivista suuntaa vastaan: sen nopeus on −5,0 m/s.')] },
      { id: 't5-q27', mode: 'graded', type: 'numeric', difficulty: 3, tol: 0.05,
        prompt: T('The two bodies of the previous question collide completely inelastically. Calculate the speed of the bodies after the collision. (Exercise 88)', 'Edellisen kysymyksen kappaleet törmäävät täysin kimmottomasti. Laske kappaleiden nopeus törmäyksen jälkeen. (Tehtävä 88)'),
        fields: [{ id: 'u', tex: 'u', unit: 'm/s' }],
        hints: [T('Σp = (m_1 + m_2) u.', 'Σp = (m_1 + m_2) u.'), T('Which way do they move afterwards?', 'Mihin suuntaan ne liikkuvat jälkeenpäin?')] },
      { id: 't5-q28', mode: 'practice', type: 'numeric', difficulty: 1,
        prompt: T('A body of 3.0 kg moving at 4.0 m/s hits a stationary body of 3.0 kg and they stick together. What is their speed?', '3,0 kg:n kappale nopeudella 4,0 m/s osuu levossa olevaan 3,0 kg:n kappaleeseen ja ne takertuvat yhteen. Mikä on niiden nopeus?'),
        fields: [{ id: 'u', tex: 'u', unit: 'm/s' }],
        hints: [T('Momentum before = momentum after; the mass doubles.', 'Liikemäärä ennen = liikemäärä jälkeen; massa kaksinkertaistuu.')] },
      { id: 't5-q29', mode: 'graded', type: 'numeric', difficulty: 2,
        prompt: T('Find the energy converted to heat in the collision of the previous question. (Exercise 91)', 'Laske edellisen kysymyksen törmäyksessä lämmöksi muuttunut energia. (Tehtävä 91)'),
        fields: [{ id: 'E', tex: 'ΔE', unit: 'J' }],
        hints: [T('Kinetic energy before minus kinetic energy after.', 'Liike-energia ennen miinus liike-energia jälkeen.')] },

      // ---- 5.5 elastic and partially elastic
      { id: 't5-q30', mode: 'practice', type: 'match', difficulty: 1,
        prompt: T('Match each type of collision with its properties.', 'Yhdistä kukin törmäystyyppi ominaisuuksiinsa.'),
        left: [{ id: 'el', html: T('elastic', 'kimmoinen') }, { id: 'pa', html: T('partially elastic', 'osittain kimmoinen') }, { id: 'in', html: T('perfectly inelastic', 'täysin kimmoton') }],
        right: [{ id: 'r1', html: T('momentum conserved, some kinetic energy lost, <f>0 < e < 1</f>', 'liikemäärä säilyy, osa liike-energiasta häviää, <f>0 < e < 1</f>') }, { id: 'r2', html: T('bodies stick together, <f>e = 0</f>', 'kappaleet takertuvat, <f>e = 0</f>') }, { id: 'r3', html: T('momentum and kinetic energy conserved, <f>e = 1</f>', 'liikemäärä ja liike-energia säilyvät, <f>e = 1</f>') }],
        hints: [T('What happens to the speed with which the bodies separate?', 'Mitä tapahtuu nopeudelle, jolla kappaleet loittonevat?')] },
      { id: 't5-q31', mode: 'practice', type: 'mc', difficulty: 2,
        prompt: T('A collision has the coefficient of restitution e = 0.5. What does that tell?', 'Törmäyksen sysäyskerroin on e = 0,5. Mitä se kertoo?'),
        options: [{ id: 'a', html: T('Half of the momentum is lost.', 'Puolet liikemäärästä häviää.') }, { id: 'b', html: T('Exactly half of the kinetic energy is lost.', 'Täsmälleen puolet liike-energiasta häviää.') }, { id: 'c', html: T('The bodies separate at half the speed at which they approached.', 'Kappaleet loittonevat puolella siitä nopeudesta, jolla ne lähestyivät.') }, { id: 'd', html: T('The lighter body keeps half of its speed.', 'Kevyempi kappale säilyttää puolet nopeudestaan.') }],
        hints: [T('e = (u_2 − u_1)/(v_1 − v_2): speed of separation over speed of approach.', 'e = (u_2 − u_1)/(v_1 − v_2): loittonemisnopeus jaettuna lähestymisnopeudella.')] },
      { id: 't5-q32', mode: 'graded', type: 'mc', difficulty: 1,
        prompt: T('Which kind of collision describes most real collisions, such as car crashes?', 'Mikä törmäystyyppi kuvaa useimpia todellisia törmäyksiä, esimerkiksi auto-onnettomuuksia?'),
        options: [{ id: 'a', html: T('elastic, e = 1', 'kimmoinen, e = 1') }, { id: 'b', html: T('perfectly inelastic, e = 0', 'täysin kimmoton, e = 0') }, { id: 'c', html: T('partially elastic, 0 < e < 1', 'osittain kimmoinen, 0 < e < 1') }, { id: 'd', html: T('explosive, e > 1', 'räjähdysmäinen, e > 1') }],
        hints: [T('The bodies deform but usually do not stay stuck together.', 'Kappaleet muotoutuvat, mutta eivät yleensä jää kiinni toisiinsa.')] },
      { id: 't5-q33', mode: 'practice', type: 'numeric', difficulty: 1,
        prompt: T('A sphere hits a sphere at rest at 3.0 m/s and the coefficient of restitution is 0.70. With what speed do the two spheres move away from each other?', 'Pallo osuu levossa olevaan palloon nopeudella 3,0 m/s ja sysäyskerroin on 0,70. Millä nopeudella pallot loittonevat toisistaan?'),
        fields: [{ id: 'w', tex: 'u_2 − u_1', unit: 'm/s' }],
        hints: [T('Speed of separation = e × speed of approach.', 'Loittonemisnopeus = e × lähestymisnopeus.')] },
      { id: 't5-q34', mode: 'practice', type: 'numeric', difficulty: 1,
        prompt: T('A 0.90 kg sphere moving at 3.0 m/s hits a 0.10 kg sphere at rest. What is the total momentum before (and after) the collision?', '0,90 kg:n pallo nopeudella 3,0 m/s osuu levossa olevaan 0,10 kg:n palloon. Kuinka suuri on kokonaisliikemäärä ennen (ja jälkeen) törmäyksen?'),
        fields: [{ id: 'P', tex: 'Σp', unit: 'kg·m/s' }],
        hints: [T('Only the moving sphere has momentum before the collision.', 'Ennen törmäystä vain liikkuvalla pallolla on liikemäärää.')] },
      { id: 't5-q35', mode: 'graded', type: 'numeric', difficulty: 3,
        prompt: T('A sphere of 0.90 kg moving at 3.0 m/s collides with a 0.10 kg sphere at rest. The collision is direct, central and fully elastic. Find the speeds after the collision: a) the 0.90 kg sphere and b) the 0.10 kg sphere. (Exercise 5.12 a)', '0,90 kg:n pallo nopeudella 3,0 m/s törmää levossa olevaan 0,10 kg:n palloon. Törmäys on suora, keskeinen ja täysin kimmoinen. Laske nopeudet törmäyksen jälkeen: a) 0,90 kg:n pallo ja b) 0,10 kg:n pallo. (Tehtävä 5.12 a)'),
        fields: [{ id: 'u1', tex: 'u_1', unit: 'm/s' }, { id: 'u2', tex: 'u_2', unit: 'm/s' }],
        hints: [T('Two equations: momentum conservation and e = 1 (the speed of separation equals the speed of approach).', 'Kaksi yhtälöä: liikemäärän säilyminen ja e = 1 (loittonemisnopeus on yhtä suuri kuin lähestymisnopeus).'), T('Check the answer: the kinetic energy must be the same before and after.', 'Tarkista vastaus: liike-energian on oltava sama ennen ja jälkeen.')] },
      { id: 't5-q36', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('The same spheres collide, but the collision is completely irreversible: the spheres stick together. What is their common speed? (Exercise 5.12 b)', 'Samat pallot törmäävät, mutta törmäys on täysin palautumaton: pallot takertuvat yhteen. Mikä on niiden yhteinen nopeus? (Tehtävä 5.12 b)'),
        fields: [{ id: 'u', tex: 'u', unit: 'm/s' }],
        hints: [T('"Completely irreversible" means perfectly inelastic: e = 0.', '"Täysin palautumaton" tarkoittaa täysin kimmotonta: e = 0.')] },
      { id: 't5-q37', mode: 'graded', type: 'numeric', difficulty: 3,
        prompt: T('The same spheres (0.90 kg at 3.0 m/s and 0.10 kg at rest) collide with the coefficient of restitution e = 0.70. Find the speeds after the collision: a) the 0.90 kg sphere and b) the 0.10 kg sphere. (Exercise 5.12 c)', 'Samat pallot (0,90 kg nopeudella 3,0 m/s ja 0,10 kg levossa) törmäävät sysäyskertoimella e = 0,70. Laske nopeudet törmäyksen jälkeen: a) 0,90 kg:n pallo ja b) 0,10 kg:n pallo. (Tehtävä 5.12 c)'),
        fields: [{ id: 'u1', tex: 'u_1', unit: 'm/s' }, { id: 'u2', tex: 'u_2', unit: 'm/s' }],
        hints: [T('Momentum: 0.90 u_1 + 0.10 u_2 = 2.70. Restitution: u_2 − u_1 = e · 3.0.', 'Liikemäärä: 0,90 u_1 + 0,10 u_2 = 2,70. Sysäyskerroin: u_2 − u_1 = e · 3,0.'), T('Substitute u_2 = u_1 + 2.1 into the momentum equation.', 'Sijoita u_2 = u_1 + 2,1 liikemääräyhtälöön.')] },
      { id: 't5-q38', mode: 'practice', type: 'mc', difficulty: 2,
        prompt: T('A cart hits an equal cart at rest in a head-on elastic collision. Afterwards', 'Vaunu osuu yhtä painavaan levossa olevaan vaunuun suorassa kimmoisassa törmäyksessä. Jälkeenpäin'),
        options: [{ id: 'a', html: T('both move on at half the speed', 'molemmat jatkavat puolella nopeudella') }, { id: 'b', html: T('the first bounces back, the second moves off', 'ensimmäinen kimpoaa takaisin, toinen lähtee liikkeelle') }, { id: 'c', html: T('they stick together', 'ne takertuvat yhteen') }, { id: 'd', html: T('the first stops, the second moves off at the original speed', 'ensimmäinen pysähtyy, toinen lähtee liikkeelle alkuperäisellä nopeudella') }],
        hints: [T('Use u_1 = (m_1 − m_2)/(m_1 + m_2) v_1 with m_1 = m_2, or try it in the swap lab.', 'Käytä kaavaa u_1 = (m_1 − m_2)/(m_1 + m_2) v_1 kun m_1 = m_2, tai kokeile vaihtolaboratoriota.')] },
      { id: 't5-q39', mode: 'practice', type: 'slider', difficulty: 2, tol: 0.015,
        prompt: T('A 0.90 kg sphere at 3.0 m/s hits a 0.10 kg sphere at rest. Set the coefficient of restitution e so that the light sphere leaves at 4.6 m/s. The widget reads the speed of the light sphere after the impact (press Run to watch).',
          '0,90 kg:n pallo nopeudella 3,0 m/s osuu levossa olevaan 0,10 kg:n palloon. Säädä sysäyskerroin e niin, että kevyt pallo lähtee nopeudella 4,6 m/s. Sovelma lukee kevyen pallon nopeuden törmäyksen jälkeen (Aja-painikkeella näet liikkeen).'),
        hints: [T('Momentum and e give u_2 = (m_1 v_1 + m_1 e v_1)/(m_1 + m_2).', 'Liikemäärästä ja e:stä saadaan u_2 = (m_1 v_1 + m_1 e v_1)/(m_1 + m_2).'), T('Solve e from the formula, then set the slider.', 'Ratkaise e kaavasta ja säädä sitten säädin.')],
        widget: { name: 'collision', config: { values: { m1: 0.9, m2: 0.1, v1: 3, v2: 0, e: 1 }, fixed: ['m1', 'm2', 'v1', 'v2'], answer: function (p, st) { return { v: st.u2 }; } } } },
      { id: 't5-q40', mode: 'practice', type: 'slider', difficulty: 2, tol: 0.03,
        prompt: T('Cart 1 (1.0 kg) moves at 3.0 m/s and hits cart 2 at rest in an elastic collision. Set the mass m_2 so that cart 1 continues at 1.0 m/s in the same direction. The widget reads the speed of cart 1 after the impact.',
          'Vaunu 1 (1,0 kg) liikkuu nopeudella 3,0 m/s ja osuu levossa olevaan vaunuun 2 kimmoisassa törmäyksessä. Säädä massa m_2 niin, että vaunu 1 jatkaa nopeudella 1,0 m/s samaan suuntaan. Sovelma lukee vaunun 1 nopeuden törmäyksen jälkeen.'),
        hints: [T('u_1 = (m_1 − m_2)/(m_1 + m_2) v_1 for a target at rest.', 'Levossa olevalle kohteelle u_1 = (m_1 − m_2)/(m_1 + m_2) v_1.'), T('Solve m_2 from 1.0 = (1.0 − m_2)/(1.0 + m_2) · 3.0.', 'Ratkaise m_2 yhtälöstä 1,0 = (1,0 − m_2)/(1,0 + m_2) · 3,0.')],
        widget: { name: 'collision', config: { values: { m1: 1, m2: 1, v1: 3, v2: 0, e: 1 }, fixed: ['m1', 'v1', 'v2', 'e'], ranges: { m2: { min: 0.1, max: 5, step: 0.1 } }, answer: function (p, st) { return { v: st.u1 }; } } } },
      { id: 't5-q41', mode: 'practice', type: 'numeric', difficulty: 3, tol: 0.03,
        prompt: T('How much kinetic energy is lost in the collision of exercise 5.12 c (0.90 kg at 3.0 m/s onto 0.10 kg at rest, e = 0.70)?', 'Kuinka paljon liike-energiaa häviää tehtävän 5.12 c törmäyksessä (0,90 kg nopeudella 3,0 m/s levossa olevaan 0,10 kg:aan, e = 0,70)?'),
        fields: [{ id: 'dE', tex: 'ΔE', unit: 'J' }],
        hints: [T('Energy before: ½ · 0.90 · 3.0². Energy after: use the speeds u_1 and u_2 of part c.', 'Energia ennen: ½ · 0,90 · 3,0². Energia jälkeen: käytä kohdan c nopeuksia u_1 ja u_2.')] },
      { id: 't5-q42', mode: 'practice', type: 'order', difficulty: 2,
        prompt: T('Put the steps of solving a one-dimensional collision in order.', 'Järjestä yksiulotteisen törmäyksen ratkaisun vaiheet oikeaan järjestykseen.'),
        items: [{ id: 's3', html: T('Add the condition for e (or the energy)', 'Lisää ehto e:lle (tai energialle)') }, { id: 's1', html: T('Choose the axis and the positive direction', 'Valitse akseli ja positiivinen suunta') }, { id: 's5', html: T('Check the signs, the momentum and the energy', 'Tarkista etumerkit, liikemäärä ja energia') }, { id: 's2', html: T('Write the momentum before = after', 'Kirjoita liikemäärä ennen = jälkeen') }, { id: 's4', html: T('Solve the unknown velocities', 'Ratkaise tuntemattomat nopeudet') }],
        hints: [T('You cannot write signed momenta before the positive direction is chosen.', 'Etumerkillisiä liikemääriä ei voi kirjoittaa ennen kuin positiivinen suunta on valittu.')] },
      { id: 't5-q43', mode: 'graded', type: 'numeric', difficulty: 2,
        prompt: T('A 2.0 kg cart moving at 5.0 m/s hits a 3.0 kg cart at rest in an elastic collision. Give the velocities after the collision (positive = the original direction): u_1 and u_2.', '2,0 kg:n vaunu nopeudella 5,0 m/s osuu levossa olevaan 3,0 kg:n vaunuun kimmoisassa törmäyksessä. Anna nopeudet törmäyksen jälkeen (positiivinen = alkuperäinen suunta): u_1 ja u_2.'),
        fields: [{ id: 'u1', tex: 'u_1', unit: 'm/s' }, { id: 'u2', tex: 'u_2', unit: 'm/s' }],
        hints: [T('Elastic: e = 1, so u_2 − u_1 = v_1 − v_2.', 'Kimmoinen: e = 1, joten u_2 − u_1 = v_1 − v_2.'), T('The lighter cart bounces back: u_1 comes out negative.', 'Kevyempi vaunu kimpoaa takaisin: u_1 tulee negatiiviseksi.')] },

      // ---- 5.6 two dimensions
      { id: 't5-q44', mode: 'graded', type: 'mc', difficulty: 2,
        prompt: T('Ball 1 moves along x and hits ball 2 at rest. Afterwards ball 1 goes up and ball 2 goes down (u_1y and u_2y are the sizes of the y components). Which equation holds for the y components?', 'Pallo 1 liikkuu x-suunnassa ja osuu levossa olevaan palloon 2. Jälkeenpäin pallo 1 lähtee ylös ja pallo 2 alas (u_1y ja u_2y ovat y-komponenttien suuruudet). Mikä yhtälö pätee y-komponenteille?'),
        options: [{ id: 'a', html: '<f>m_1 u_{1y} + m_2 u_{2y} = m_1 v_1</f>' }, { id: 'b', html: '<f>u_{1y} = u_{2y}</f>' }, { id: 'c', html: '<f>m_1 u_{1y} = 0</f>' }, { id: 'd', html: '<f>m_1 u_{1y} = m_2 u_{2y}</f>' }],
        hints: [T('Before the collision nothing moves in the y direction.', 'Ennen törmäystä mikään ei liiku y-suunnassa.'), T('Momentum is conserved along each axis separately.', 'Liikemäärä säilyy kullakin akselilla erikseen.')] },
      { id: 't5-q45', mode: 'practice', type: 'match', difficulty: 1,
        prompt: T('Match each symbol of the 2-D collision figure with its meaning.', 'Yhdistä kaksiulotteisen törmäyskuvan kukin symboli sen merkitykseen.'),
        left: [{ id: 'a', html: '<f>v_1</f>' }, { id: 'b', html: '<f>u_{1x}</f>' }, { id: 'c', html: '<f>u_{1y}</f>' }, { id: 'd', html: '<f>u_2</f>' }],
        right: [{ id: 'r1', html: T('velocity of body 2 after the collision', 'kappaleen 2 nopeus törmäyksen jälkeen') }, { id: 'r2', html: T('y component of the velocity of body 1 after', 'kappaleen 1 nopeuden y-komponentti jälkeen') }, { id: 'r3', html: T('velocity of body 1 before the collision', 'kappaleen 1 nopeus ennen törmäystä') }, { id: 'r4', html: T('x component of the velocity of body 1 after', 'kappaleen 1 nopeuden x-komponentti jälkeen') }],
        hints: [T('v is before, u is after; the index names the body and the axis.', 'v on ennen, u on jälkeen; alaindeksi kertoo kappaleen ja akselin.')] },
      { id: 't5-q46', mode: 'graded', type: 'mc', difficulty: 2,
        prompt: T('A ball hits an equal ball at rest, off-centre, in an elastic collision. What is the angle between the two outgoing velocities?', 'Pallo osuu yhtä painavaan levossa olevaan palloon sivuttain kimmoisassa törmäyksessä. Mikä on lähtevien nopeuksien välinen kulma?'),
        options: [{ id: 'a', html: '0°' }, { id: 'b', html: '45°' }, { id: 'c', html: '90°' }, { id: 'd', html: '180°' }],
        hints: [T('Try several aim offsets b in the billiards lab with equal masses and e = 1.', 'Kokeile biljardilaboratoriossa eri tähtäyspoikkeamia b yhtä painavilla palloilla ja e = 1.')] },
      { id: 't5-q47', mode: 'practice', type: 'numeric', difficulty: 3, tol: 0.02,
        prompt: T('A ball of speed 2.0 m/s hits an equal ball at rest in an elastic collision and is deflected 30° from its original direction. Find the speeds after the collision: u_1 of the first ball and u_2 of the second.', 'Pallo nopeudella 2,0 m/s osuu yhtä painavaan levossa olevaan palloon kimmoisassa törmäyksessä ja poikkeaa 30° alkuperäisestä suunnastaan. Laske nopeudet törmäyksen jälkeen: ensimmäisen pallon u_1 ja toisen pallon u_2.'),
        fields: [{ id: 'u1', tex: 'u_1', unit: 'm/s' }, { id: 'u2', tex: 'u_2', unit: 'm/s' }],
        hints: [T('For equal masses and e = 1 the outgoing velocities are perpendicular.', 'Yhtä painavilla palloilla ja e = 1 lähtevät nopeudet ovat kohtisuorassa.'), T('The incoming velocity is the hypotenuse of the right triangle of u_1 and u_2.', 'Tulonopeus on u_1:n ja u_2:n muodostaman suorakulmaisen kolmion hypotenuusa.')] },
      { id: 't5-q48', mode: 'practice', type: 'slider', difficulty: 2, tol: 0.02,
        prompt: T('Two equal balls, e = 1: ball 1 hits the ball at rest. Set the aim offset b so that ball 2 leaves at 30° below the x axis. The widget reads the angle of ball 2 below the x axis, in degrees.',
          'Kaksi yhtä painavaa palloa, e = 1: pallo 1 osuu levossa olevaan palloon. Säädä tähtäyspoikkeama b niin, että pallo 2 lähtee 30° x-akselin alapuolelle. Sovelma lukee pallon 2 lähtökulman x-akselin alapuolella asteina.'),
        hints: [T('Ball 2 moves along the line of centres at the impact. How is that line tilted when the aim offset is b?', 'Pallo 2 liikkuu keskipisteitä yhdistävää suoraa pitkin. Miten suora on kallellaan, kun tähtäyspoikkeama on b?'), T('Try b = 0.2, 0.4 … in the lab and read the angle.', 'Kokeile laboratoriossa b = 0,2, 0,4 … ja lue kulma.')],
        widget: { name: 'collision', config: { mode: '2d', values: { m1: 1, m2: 1, v1: 2, b: 0.2, e: 1 }, fixed: ['m1', 'm2', 'v1', 'e'], answer: function (p, st) { return { v: -st.th2 }; } } } },
      { id: 't5-q49', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('Ball 1 (0.40 kg) hits ball 2 (0.60 kg) at rest. After the impact ball 1 moves up with the y component 1.5 m/s and ball 2 moves down. What is the size of the y component of ball 2?', 'Pallo 1 (0,40 kg) osuu levossa olevaan palloon 2 (0,60 kg). Törmäyksen jälkeen pallo 1 liikkuu ylös y-komponentilla 1,5 m/s ja pallo 2 alas. Kuinka suuri on pallon 2 y-komponentti?'),
        fields: [{ id: 'v', tex: 'u_{2y}', unit: 'm/s' }],
        hints: [T('Σp_y = 0 before, so m_1 u_1y = m_2 u_2y.', 'Σp_y = 0 ennen, joten m_1 u_1y = m_2 u_2y.')] }
    ]
  });
})();

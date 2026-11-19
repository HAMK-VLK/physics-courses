/* Topic 3: Force. Source: source/extracted/topic3-force.md (EN theory deck p03-p13, EN exercise deck 3.2-3.39 and the
 * FI-deck exercises 30, 31, 48, 51; errata in source/extracted/PDF-ERRATA.md applied). g = 9.81 m/s² everywhere.
 * NO answers in this file: they live in src/answers/topic3.json. Block ids are stable; never rename. */
(function () {
  'use strict';
  function T(en, fi) { return { en: en, fi: fi }; }
  var G0 = 9.81, D2R = Math.PI / 180, RHO = 1.29;

  // ---------------------------------------------------------------- shared helpers of the device widgets
  // device widget (mech-common.js TV.device), looked up at mount: the tools load content without the viz scripts
  function dev(def, vals) { return { mount: function (h, c) { return TDC.mechViz.device(def, vals).mount(h, c); } }; }
  function nf(v, d) { return TDC.util.fmtNum(v, d || 3); }
  function fsz(w) { return Math.max(11, Math.min(14, Math.round(w / 48))); }
  function line(g, x1, y1, x2, y2) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function font(g, px, it) {
    g.font = it ? 'italic 600 ' + px + 'px ' + TDC.theme.color('--font-math') : '600 ' + px + 'px ' + getComputedStyle(document.body).fontFamily;
  }
  /** Canvas label (SI typography): letter runs = quantity symbols (with _subscripts) italic; digits, operators, Σ and
   *  the tail (" = 12 N", words) upright. align 'left' | 'center' | 'right'; bg = backdrop colour. */
  function lab() { return TDC.mechViz.lab.apply(null, arguments); }   // canvas label in SI typography (viz/mech-common.js)
  /** Force arrow from (x, y) along (ux, uy), symbol at the tip and the value (upright) on a second line. */
  function farrow(g, TV, x, y, ux, uy, L, col, sym, val, bg, px) {
    if (L < 2) return;
    TV.arrow(g, x, y, x + ux * L, y + uy * L, col, 3);
    // the label clears the arrowhead (sideways arrows: by half a value's width) and the two lines do not overlap
    var d = L + 15 + Math.abs(ux) * (val ? 22 : 4), lx = x + ux * d, ly = y + uy * d - (val ? 9 : 0);
    if (sym) lab(g, sym, '', lx, ly, col, 'center', px || 13, bg);
    if (val) lab(g, '', val, lx, ly + Math.round((px || 13) * 1.5), col, 'center', (px || 13) - 1, bg);
  }
  /** True when one of the listed parameters changed since the last frame (a new setting cancels a running sequence). */
  function changed(S, p, keys) { var k = keys.map(function (id) { return p[id]; }).join('|'); if (S._k === k) return false; S._k = k; return true; }

  // ---------------------------------------------------------------- SVG figure helpers (colours from tokens)
  function sArrow(x1, y1, x2, y2, c, dash) {
    var a = Math.atan2(y2 - y1, x2 - x1), h = 9, s = 'stroke:var(' + c + ');fill:var(' + c + ')';
    var p1 = [x2 - h * Math.cos(a - 0.4), y2 - h * Math.sin(a - 0.4)], p2 = [x2 - h * Math.cos(a + 0.4), y2 - h * Math.sin(a + 0.4)];
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + (x2 - 6 * Math.cos(a)).toFixed(1) + '" y2="' + (y2 - 6 * Math.sin(a)).toFixed(1) + '" style="' + s + ';stroke-width:2.5' + (dash ? ';stroke-dasharray:5 4' : '') + '"/>' +
      '<polygon points="' + x2 + ',' + y2 + ' ' + p1[0].toFixed(1) + ',' + p1[1].toFixed(1) + ' ' + p2[0].toFixed(1) + ',' + p2[1].toFixed(1) + '" style="' + s + '"/>';
  }
  function sText(x, y, t, c, sub) {
    return '<text x="' + x + '" y="' + y + '" style="fill:var(' + (c || '--fg') + ');font:italic 600 15px var(--font-math)">' + t +
      (sub ? '<tspan dy="4" style="font-size:11px">' + sub + '</tspan>' : '') + '</text>';
  }
  // The book rests on the table, so G = N, and the pairs N/N' and G/G' are equal: all four arrows are 60 units long.
  var FIG_N3 = '<svg viewBox="0 0 340 210" role="img" style="max-width:420px">' +
    '<path d="M10 186 Q170 176 330 186" style="fill:none;stroke:var(--f-applied);stroke-width:2.5"/>' +
    '<rect x="95" y="104" width="150" height="10" rx="2" style="fill:var(--m-ground);stroke:var(--c-wire);stroke-width:2"/>' +
    '<line x1="108" y1="114" x2="108" y2="182" style="stroke:var(--c-wire);stroke-width:4"/><line x1="232" y1="114" x2="232" y2="182" style="stroke:var(--c-wire);stroke-width:4"/>' +
    '<rect x="140" y="62" width="60" height="42" rx="3" style="fill:var(--m-body);stroke:var(--c-wire);stroke-width:2"/>' +
    sArrow(158, 83, 158, 143, '--f-weight') + sText(140, 155, 'G') +
    sArrow(184, 104, 184, 44, '--f-normal') + sText(190, 50, 'N') +
    sArrow(214, 108, 214, 168, '--f-normal', true) + sText(190, 162, 'N′') +
    sArrow(40, 200, 40, 140, '--f-weight', true) + sText(48, 150, 'G′') + '</svg>';
  var FIG_ROLL = '<svg viewBox="0 0 260 200" role="img" style="max-width:300px">' +
    '<line x1="10" y1="182" x2="250" y2="182" style="stroke:var(--c-wire);stroke-width:2.5"/>' +
    '<circle cx="120" cy="100" r="80" style="fill:var(--c-wire);opacity:.85"/><circle cx="120" cy="100" r="42" style="fill:var(--surface-2);stroke:var(--c-wire);stroke-width:2"/>' +
    '<circle cx="120" cy="100" r="4" style="fill:var(--fg)"/>' + sArrow(120, 100, 63, 43, '--fg') + sText(72, 84, 'R') +
    '<line x1="120" y1="100" x2="120" y2="194" style="stroke:var(--bad);stroke-width:1.6;stroke-dasharray:4 4"/>' +
    sArrow(132, 192, 120, 192, '--bad') + sArrow(138, 192, 150, 192, '--bad') + sText(158, 198, 'f', '--bad') + '</svg>';
  function spring(x1, y1, x2, y2, n) {   // zigzag spring between two points
    var dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, d = 'M' + x1 + ' ' + y1;
    for (var i = 1; i < 2 * n; i++) { var s = i / (2 * n), o = (i % 2 ? 7 : -7); d += ' L' + (x1 + dx * s - uy * o).toFixed(1) + ' ' + (y1 + dy * s + ux * o).toFixed(1); }
    return '<path d="' + d + ' L' + x2 + ' ' + y2 + '" style="fill:none;stroke:var(--fg);stroke-width:1.8"/>';
  }
  var FIG_SPRINGS = '<svg viewBox="0 0 480 170" role="img">' +
    // 1: cart on a level floor, spring to the wall
    '<line x1="10" y1="140" x2="150" y2="140" style="stroke:var(--c-wire);stroke-width:2.5"/><line x1="14" y1="70" x2="14" y2="140" style="stroke:var(--c-wire);stroke-width:4"/>' +
    spring(14, 110, 80, 110, 6) + '<rect x="80" y="94" width="48" height="34" rx="3" style="fill:var(--m-body);stroke:var(--c-wire);stroke-width:2"/>' +
    '<circle cx="92" cy="134" r="6" style="fill:var(--surface);stroke:var(--c-wire);stroke-width:2"/><circle cx="116" cy="134" r="6" style="fill:var(--surface);stroke:var(--c-wire);stroke-width:2"/>' +
    sText(97, 116, 'm') + sText(38, 96, 'k') +
    // 2: hinged bar held by a vertical spring
    '<line x1="170" y1="150" x2="320" y2="150" style="stroke:var(--c-wire);stroke-width:2.5"/><polygon points="180,82 170,104 190,104" style="fill:var(--m-ground);stroke:var(--c-wire);stroke-width:2"/>' +
    '<rect x="178" y="74" width="132" height="10" rx="2" style="fill:var(--m-body);stroke:var(--c-wire);stroke-width:2"/>' + spring(304, 84, 304, 150, 6) +
    sText(240, 68, 'm') + sText(314, 124, 'k') + sArrow(220, 100, 220, 134, '--muted') + sText(228, 128, 'g', '--muted') +
    // 3: block hanging on a spring
    '<rect x="350" y="8" width="110" height="8" style="fill:var(--m-ground);stroke:var(--c-wire);stroke-width:2"/>' + spring(405, 16, 405, 86, 6) +
    '<rect x="383" y="86" width="44" height="36" rx="3" style="fill:var(--m-body);stroke:var(--c-wire);stroke-width:2"/>' +
    sText(398, 110, 'm') + sText(416, 54, 'k') + sArrow(450, 98, 450, 140, '--muted') + sText(456, 134, 'g', '--muted') + '</svg>';

  // ---------------------------------------------------------------- device: Newton II lab (t3-n2-lab)
  function n2run(D, mode, p) { changed(D.S, p, ['F', 'm']); D.S.mode = mode; D.S.t = 0; D.S.run = D.motion; D.S.jump = !D.motion; }
  var N2 = {
    animate: true,
    aspect: function (w) { return w < 520 ? 1 : 0.55; },
    params: [{ id: 'F', tex: 'F', min: 1, max: 20, step: 1, value: 6, unit: 'N' },
             { id: 'm', tex: 'm', min: 0.5, max: 5, step: 0.5, value: 2, unit: 'kg' }],
    buttons: [{ label: T('Run: F, 2F, 3F (same m)', 'Aja: F, 2F, 3F (sama m)'), play: true, click: function (p, D) { n2run(D, 'F', p); } },
              { label: T('Run: m, 2m, 3m (same F)', 'Aja: m, 2m, 3m (sama F)'), play: true, click: function (p, D) { n2run(D, 'm', p); } }],
    draw: function (g, w, h, p, ctx, TV, D) {
      var S = D.S, mode = S.mode || 'F', L = 4;
      if (changed(S, p, ['F', 'm'])) { S.run = false; S.t = 0; }
      var lanes = [1, 2, 3].map(function (k) { var F = mode === 'F' ? k * p.F : p.F, m = mode === 'm' ? k * p.m : p.m; return { k: k, F: F, m: m, a: F / m }; });
      var amax = Math.max(lanes[0].a, lanes[2].a), tEnd = Math.sqrt(2 * L / amax);
      if (S.jump) { S.t = tEnd; S.jump = false; }
      if (S.run) { S.t = Math.min(tEnd, (S.t || 0) + D.dt); if (S.t >= tEnd) S.run = false; }
      var t = S.t || 0, fg = ctx.color('--fg'), wire = ctx.color('--c-wire'), mu = ctx.color('--muted'), fs = fsz(w);
      var cF = ctx.color('--f-applied'), cA = ctx.color('--f-accel');
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      var x0 = w * 0.22, top = 30, laneH = (h - top - 6) / 3, sF = (x0 - 16) / 60, sa = Math.min(12, w * 0.18 / amax), bwMax = 0;
      lanes.forEach(function (ln) { ln.bh = Math.min(laneH * 0.42, 16 + 9 * Math.cbrt(ln.m)); ln.bw = ln.bh * 1.25; bwMax = Math.max(bwMax, ln.bw); });
      var ppm = (w * 0.97 - x0 - bwMax) / L;
      lanes.forEach(function (ln, i) {
        var yb = top + laneH * (i + 1) - 4, x = Math.min(L, 0.5 * ln.a * t * t), bx = x0 + x * ppm, yc = yb - ln.bh / 2;
        g.strokeStyle = wire; g.lineWidth = 2; line(g, 4, yb, w - 4, yb);
        g.strokeStyle = mu; g.lineWidth = 1.5; g.setLineDash([4, 4]); line(g, x0 + L * ppm + ln.bw, yb - ln.bh - 4, x0 + L * ppm + ln.bw, yb); g.setLineDash([]);
        g.fillStyle = ctx.color('--m-body'); g.strokeStyle = wire; g.lineWidth = 2; TV.rr(g, bx, yb - ln.bh, ln.bw, ln.bh, 3); g.fill(); g.stroke();
        lab(g, mode === 'm' && ln.k > 1 ? ln.k + 'm' : 'm', '', bx + ln.bw / 2, yc, fg, 'center', fs);
        var Lf = ln.F * sF; TV.arrow(g, bx - Lf - 2, yc, bx - 2, yc, cF, 3);
        lab(g, mode === 'F' && ln.k > 1 ? ln.k + 'F' : 'F', '', bx - Lf / 2 - 2, yc - 14, cF, 'center', fs);
        var La = ln.a * sa, ay = yb - ln.bh - 11, ax = Math.min(bx + ln.bw / 2, w - 34 - La);
        TV.arrow(g, ax, ay, ax + La, ay, cA, 2.5);
        lab(g, ln.k === 1 ? 'a' : mode === 'F' ? ln.k + 'a' : 'a/' + ln.k, '', ax + La + 6, ay, cA, 'left', fs);
      });
      lab(g, 't', ' = ' + nf(t, 3) + ' s', 8, 15, fg, 'left', fs);
    },
    outputs: function (p) {
      var a = p.F / p.m;
      return [{ tex: 'a = {F}/{m}', value: a, unit: 'm/s²' }, { tex: 'a_{2F}', value: 2 * a, unit: 'm/s²' }, { tex: 'a_{3F}', value: 3 * a, unit: 'm/s²' },
              { tex: 'a_{2m}', value: a / 2, unit: 'm/s²' }, { tex: 'a_{3m}', value: a / 3, unit: 'm/s²' }];
    },
    answer: function (p) { return { v: p.F / p.m }; }
  };

  // ---------------------------------------------------------------- device: elevator (t3-elevator)
  var MP = 70;   // passenger standing on a bathroom scale in the car
  var ELEV = {
    animate: true,
    aspect: function (w) { return w < 520 ? 1.05 : 0.6; },
    params: [{ id: 'm', tex: 'm', min: 200, max: 1500, step: 10, value: 750, unit: 'kg' },
             { id: 'a', tex: 'a', min: -4, max: 4, step: 0.5, value: 2, unit: 'm/s²' }],
    buttons: [{ label: T('Run', 'Aja'), click: function (p, D) {
      var S = D.S; changed(S, p, ['m', 'a']); S.y = p.a < 0 ? 1 : 0; S.v = p.a === 0 ? 1.5 : 0; S.run = D.motion;
      if (!D.motion) S.y = p.a < 0 ? 0 : 1;
    } }],
    draw: function (g, w, h, p, ctx, TV, D) {
      var S = D.S, HS = 12;
      if (changed(S, p, ['m', 'a'])) S.run = false;
      if (S.y == null) { S.y = 0.3; S.v = 0; }
      if (S.run) { S.v += p.a * D.dt; S.y += S.v * D.dt / HS; if (S.y <= 0 || S.y >= 1) { S.y = clamp(S.y, 0, 1); S.run = false; } }
      var fg = ctx.color('--fg'), wire = ctx.color('--c-wire'), mu = ctx.color('--muted'), bg = ctx.color('--surface'), fs = fsz(w);
      var Tn = p.m * (G0 + p.a), mg = p.m * G0;
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      // shaft, pulley, cable, car
      var sx0 = w * 0.05, sx1 = w * 0.42, top = h * 0.06, bot = h * 0.96, cw = (sx1 - sx0) * 0.72, ch = Math.min(h * 0.34, cw * 1.1), cx = (sx0 + sx1) / 2;
      var cy = bot - ch - S.y * (bot - top - ch - 30);
      g.strokeStyle = wire; g.lineWidth = 3; line(g, sx0, top, sx0, bot); line(g, sx1, top, sx1, bot); line(g, sx0, bot, sx1, bot);
      g.lineWidth = 2; g.beginPath(); g.arc(cx, top + 10, 10, 0, 2 * Math.PI); g.stroke(); line(g, cx, top + 10, cx, cy);
      g.fillStyle = ctx.color('--m-body'); g.lineWidth = 2.5; TV.rr(g, cx - cw / 2, cy, cw, ch, 4); g.fill(); g.stroke();
      // passenger on a scale: the display shows the apparent weight in kilograms
      var fl = cy + ch - 6, sw = cw * 0.36, ph = ch * 0.5, px = cx;
      g.fillStyle = ctx.color('--c-body-fill'); g.fillRect(px - sw / 2, fl - 7, sw, 7); g.strokeRect(px - sw / 2, fl - 7, sw, 7);
      g.strokeStyle = fg; g.lineWidth = 2.5;
      line(g, px - 6, fl - 7, px, fl - 7 - ph * 0.4); line(g, px + 6, fl - 7, px, fl - 7 - ph * 0.4); line(g, px, fl - 7 - ph * 0.4, px, fl - 7 - ph * 0.85);
      line(g, px - 9, fl - 7 - ph * 0.55, px, fl - 7 - ph * 0.78); line(g, px + 9, fl - 7 - ph * 0.55, px, fl - 7 - ph * 0.78);
      g.beginPath(); g.arc(px, fl - 7 - ph * 0.85 - 7, 7, 0, 2 * Math.PI); g.stroke();
      TV.lcd(g, ctx, cx, cy + 16, nf(MP * (G0 + p.a) / G0, 3) + ' kg', fs - 1);
      // free-body diagram of the car: T up, mg down, a beside, + axis up
      var bx = w * 0.72, by = h * 0.5, bs = Math.min(46, w * 0.08), sc = h * 0.34 / (1500 * (G0 + 4));   // fixed scale (largest m and a): a heavier cabin gets longer arrows
      g.fillStyle = ctx.color('--m-body'); g.strokeStyle = wire; g.lineWidth = 2; TV.rr(g, bx - bs / 2, by - bs / 2, bs, bs, 3); g.fill(); g.stroke();
      farrow(g, TV, bx, by - bs / 2, 0, -1, Tn * sc, ctx.color('--f-applied'), 'T', TV.fmt(Tn, 'N'), bg, fs);
      farrow(g, TV, bx, by + bs / 2, 0, 1, mg * sc, ctx.color('--f-weight'), 'mg', TV.fmt(mg, 'N'), bg, fs);
      var ax = bx + bs / 2 + 30;
      if (p.a !== 0) { TV.arrow(g, ax, by, ax, by - 12 * p.a, ctx.color('--f-accel'), 2.5); lab(g, 'a', '', ax + 12, by - 12 * p.a, ctx.color('--f-accel'), 'left', fs); }
      else lab(g, 'a', ' = 0', ax - 6, by, ctx.color('--f-accel'), 'left', fs);
      TV.arrow(g, bx - bs / 2 - 34, by + 22, bx - bs / 2 - 34, by - 22, mu, 1.5); lab(g, '', '+', bx - bs / 2 - 44, by - 18, mu, 'center', fs);
      lab(g, 'ΣF = T − mg = ma', '', bx, h - 14, fg, 'center', fs);
      lab(g, 'v', ' = ' + nf(Math.abs(S.v || 0), 2) + ' m/s ' + ((S.v || 0) > 0.01 ? '↑' : (S.v || 0) < -0.01 ? '↓' : ''), w * 0.97, 15, fg, 'right', fs);
    },
    outputs: function (p) {
      return [{ tex: 'T = m(g + a)', value: p.m * (G0 + p.a), unit: 'N' }, { tex: 'm g', value: p.m * G0, unit: 'N' },
              { tex: 'N_p = m_p (g + a)', value: MP * (G0 + p.a), unit: 'N' },
              { label: T('Scale reading of the 70 kg passenger', '70 kg:n matkustajan vaa’an lukema'), value: MP * (G0 + p.a) / G0, unit: 'kg' }];
    },
    answer: function (p) { return { v: p.m * (G0 + p.a) }; }
  };

  // ---------------------------------------------------------------- device: friction explorer (t3-friction-lab)
  var TB = 3, TT = 6;   // the pull grows for 3 s until the block breaks away, the run lasts 6 s
  function fricF(p, t) {
    var N = p.m * G0, muk = Math.min(p.muk, p.mus);
    return t < TB ? p.mus * N * t / TB : muk * N * (1 + 0.025 * Math.sin(19 * t) + 0.015 * Math.sin(47 * t));
  }
  var FRIC = {
    animate: true,
    aspect: function (w) { return w < 520 ? 1.15 : 0.62; },
    params: [{ id: 'm', tex: 'm', min: 1, max: 20, step: 0.5, value: 10, unit: 'kg' },
             { id: 'mus', tex: 'μ_s', min: 0.1, max: 1, step: 0.01, value: 0.6 },
             { id: 'muk', tex: 'μ_k', min: 0.05, max: 1, step: 0.01, value: 0.35 }],
    buttons: [{ label: T('Run: pull harder and harder', 'Aja: vedä yhä kovemmin'), click: function (p, D) { changed(D.S, p, ['m', 'mus', 'muk']); D.S.t = D.motion ? 0 : TT; D.S.run = D.motion; } }],
    draw: function (g, w, h, p, ctx, TV, D) {
      var S = D.S;
      if (changed(S, p, ['m', 'mus', 'muk'])) { S.run = false; S.t = 0; }
      if (S.run) { S.t = Math.min(TT, S.t + D.dt); if (S.t >= TT) S.run = false; }
      var t = S.t || 0, N = p.m * G0, muk = Math.min(p.muk, p.mus), F = t > 0 ? fricF(p, t) : 0, moving = t >= TB;
      // after break-away the pull stays at μ_s N for a moment while only μ_k N holds back: a = (μ_s − μ_k) g (0.2 m/s nudge when equal)
      var Fp = moving ? p.mus * N : F, ak = (p.mus - muk) * G0, tm = moving ? t - TB : 0, x = 0.2 * tm + 0.5 * ak * tm * tm, vk = moving ? 0.2 + ak * tm : 0;
      var fg = ctx.color('--fg'), wire = ctx.color('--c-wire'), mu = ctx.color('--muted'), bg = ctx.color('--surface'), fs = fsz(w);
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      // scene: floor marks scroll when the block slides (the view follows the block)
      var fy = h * 0.36, bw = Math.min(90, w * 0.16), bh = bw * 0.55, bx = w * 0.42, sc = h * 0.08 / (10 * G0);   // one fixed scale for N, mg, F and F_μ: a heavier block gets longer arrows
      g.fillStyle = ctx.color('--m-ground'); g.fillRect(0, fy, w, h * 0.06); g.strokeStyle = wire; g.lineWidth = 2; line(g, 0, fy, w, fy);
      g.lineWidth = 1.2; for (var k = -1; k < w / 30 + 1; k++) { var hx = k * 30 - (x * 40) % 30; line(g, hx, fy + 2, hx - 8, fy + h * 0.05); }
      g.fillStyle = ctx.color('--m-body'); g.lineWidth = 2; TV.rr(g, bx - bw / 2, fy - bh, bw, bh, 3); g.fill(); g.stroke();
      g.strokeStyle = mu; g.lineWidth = 2; line(g, bx + bw / 2, fy - bh / 2, w * 0.8, fy - bh / 2);
      TV.lcd(g, ctx, w * 0.88, fy - bh / 2, nf(Fp, 3) + ' N', fs - 1);   // the spring scale reads the pull
      var cy = fy - bh / 2;
      farrow(g, TV, bx, cy, 0, -1, N * sc, ctx.color('--f-normal'), 'N', '', bg, fs);
      farrow(g, TV, bx, cy, 0, 1, N * sc, ctx.color('--f-weight'), 'mg', '', bg, fs);
      if (F > 0) {
        TV.arrow(g, bx + bw / 2, cy - 8, bx + bw / 2 + Fp * sc, cy - 8, ctx.color('--f-applied'), 3);
        lab(g, 'F', '', bx + bw / 2 + Fp * sc + 10, cy - 20, ctx.color('--f-applied'), 'center', fs, bg);
        TV.arrow(g, bx - bw / 2, fy - 4, bx - bw / 2 - F * sc, fy - 4, ctx.color('--f-friction'), 3);
        lab(g, 'F_μ', '', bx - bw / 2 - F * sc - 12, fy - 18, ctx.color('--f-friction'), 'center', fs, bg);
      }
      if (moving) { var Lv = Math.min(w * 0.3, 12 + 8 * vk); TV.arrow(g, bx - Lv / 2, fy - bh - 14, bx + Lv / 2, fy - bh - 14, ctx.color('--f-accel'), 2.5); lab(g, 'v', ' = ' + nf(vk, 2) + ' m/s', bx + Lv / 2 + 8, fy - bh - 14, ctx.color('--f-accel'), 'left', fs, bg); }
      if (p.muk > p.mus) lab(g, '', ctx.tx(T('μ_k cannot exceed μ_s: μ_k = μ_s is used', 'μ_k ei voi olla suurempi kuin μ_s: käytetään μ_k = μ_s')), 8, 33, ctx.color('--bad'), 'left', fs - 1, bg);
      lab(g, '', ctx.tx(moving ? T('sliding: kinetic friction', 'liukuu: liikekitka') : t > 0 ? T('at rest: static friction', 'levossa: lepokitka') : T('press Run', 'paina Aja')), 8, 15, fg, 'left', fs);
      // graph F_μ(t): faint prediction for the current sliders, bold curve of the run so far
      var gx0 = 46, gx1 = w - 16, gy0 = h * 0.52, gy1 = h - 26, Fmax = 1.25 * 20 * G0;   // fixed: the largest μ_s N (μ_s = 1, m = 20 kg), so m and μ change the curve height
      var X = function (tt) { return gx0 + tt / TT * (gx1 - gx0); }, Y = function (f) { return gy1 - f / Fmax * (gy1 - gy0); };
      g.strokeStyle = wire; g.lineWidth = 1.5; line(g, gx0, gy1, gx1, gy1); line(g, gx0, gy1, gx0, gy0 - 6);
      lab(g, 'F_μ', ' / N', gx0 + 6, gy0 - 4, fg, 'left', fs); lab(g, 't', ' / s', gx1, gy1 - 12, fg, 'right', fs);
      for (var s = 0; s <= TT; s++) lab(g, '', String(s), X(s), gy1 + 13, mu, 'center', fs - 2);
      g.setLineDash([5, 4]); g.lineWidth = 1.3;
      g.strokeStyle = ctx.color('--f-friction'); line(g, gx0, Y(p.mus * N), gx1, Y(p.mus * N)); line(g, gx0, Y(muk * N), gx1, Y(muk * N)); g.setLineDash([]);
      lab(g, w < 520 ? 'F_μsm' : 'F_μsm = μ_s N', ' = ' + TV.fmt(p.mus * N, 'N'), gx1 - 4, Y(p.mus * N) - 10, ctx.color('--f-friction'), 'right', fs - 1, bg);
      lab(g, w < 520 ? 'F_μk' : 'F_μk = μ_k N', ' = ' + TV.fmt(muk * N, 'N'), gx1 - 4, Y(muk * N) + 12, ctx.color('--f-friction'), 'right', fs - 1, bg);
      [[TT, 0.5, 1.5], [t, 1, 3]].forEach(function (c) {
        if (c[0] <= 0) return;
        g.globalAlpha = c[1]; g.strokeStyle = ctx.color('--f-friction'); g.lineWidth = c[2]; g.beginPath();
        for (var tt = 0; tt <= c[0] + 1e-9; tt += 0.02) { var yy = Y(fricF(p, tt)); if (tt === 0) g.moveTo(X(tt), yy); else g.lineTo(X(tt), yy); }
        g.stroke(); g.globalAlpha = 1;
      });
    },
    outputs: function (p) {
      var N = p.m * G0;
      return [{ tex: 'N = m g', value: N, unit: 'N' }, { tex: 'F_μsm = μ_s N', value: p.mus * N, unit: 'N' },
              { tex: 'F_μk = μ_k N', value: Math.min(p.muk, p.mus) * N, unit: 'N' }];
    },
    answer: function (p) { return { v: p.mus * p.m * G0 }; }
  };

  // ---------------------------------------------------------------- device: rope (belt) friction on a drum (t3-capstan)
  function room(x, y, dx, dy, w, h, m) {   // how far a ray can go before it leaves the canvas (margin m)
    var t = 1e9;
    if (dx > 1e-6) t = Math.min(t, (w - m - x) / dx); if (dx < -1e-6) t = Math.min(t, (m - x) / dx);
    if (dy > 1e-6) t = Math.min(t, (h - m - y) / dy); if (dy < -1e-6) t = Math.min(t, (m - y) / dy);
    return Math.max(0, t);
  }
  var CAP = {
    animate: true,
    aspect: function (w) { return w < 520 ? 0.95 : 0.55; },
    params: [{ id: 'th', tex: 'θ', min: 0, max: 720, step: 15, value: 90, unit: '°' },
             { id: 'mu', tex: 'μ', min: 0, max: 1, step: 0.01, value: 0.95 },
             { id: 'F2', tex: 'F_2', min: 10, max: 500, step: 10, value: 210, unit: 'N' }],
    buttons: [{ label: T('Wind the rope on', 'Kierrä köysi'), click: function (p, D) { changed(D.S, p, ['th', 'mu', 'F2']); D.S.ph = 0; D.S.run = D.motion; } }],
    draw: function (g, w, h, p, ctx, TV, D) {
      var S = D.S, th = p.th * D2R;
      if (changed(S, p, ['th', 'mu', 'F2'])) S.run = false;
      if (S.run) { S.ph = Math.min(th, S.ph + D.dt * Math.max(th, 1.5) / 2.5); S.rot = (S.rot || 0) + D.dt * 1.4; if (S.ph >= th) S.run = false; }
      var ph = S.run ? S.ph : th, F1 = p.F2 * Math.exp(p.mu * ph), ratio = F1 / p.F2;
      var fg = ctx.color('--fg'), wire = ctx.color('--c-wire'), bg = ctx.color('--surface'), cR = ctx.color('--f-applied'), fs = fsz(w);
      g.clearRect(0, 0, w, h); g.lineJoin = 'round'; g.lineCap = 'round';
      var cx = w * 0.4, cy = h * 0.5, R = Math.min(h * 0.24, w * 0.16), rr = function (u) { return R + 5 + 6 * u / (2 * Math.PI); };
      // drum (rotates while the rope winds on)
      g.fillStyle = ctx.color('--m-body'); g.strokeStyle = wire; g.lineWidth = 2.5; g.beginPath(); g.arc(cx, cy, R, 0, 2 * Math.PI); g.fill(); g.stroke();
      g.lineWidth = 2; for (var k = 0; k < 3; k++) { var a = (S.rot || 0) + k * 2 * Math.PI / 3; line(g, cx + 0.25 * R * Math.cos(a), cy + 0.25 * R * Math.sin(a), cx + 0.9 * R * Math.cos(a), cy + 0.9 * R * Math.sin(a)); }
      g.beginPath(); g.arc(cx, cy, 0.25 * R, 0, 2 * Math.PI); g.stroke();
      // F2 side: rope leaves the bottom of the drum to the right
      var y2 = cy + rr(0), L2 = 20 + 40 * p.F2 / 500,   // F2 sets the arrow length; F1 = F2 e^{μθ} follows it
        x2 = Math.min(w * 0.72, w - L2 - 40);
      g.strokeStyle = cR; g.lineWidth = 2; line(g, cx, y2, x2, y2);
      farrow(g, TV, x2, y2, 1, 0, L2, cR, 'F_2', TV.fmt(p.F2, 'N'), bg, fs);
      // wrapped part: the line gets thicker as the tension F2 e^(μφ) grows along the contact
      var n = Math.max(2, Math.ceil(ph / 0.05)), lnR = Math.log(Math.max(ratio, 1.0001));
      for (var i = 0; i < n; i++) {
        var u0 = ph * i / n, u1 = ph * (i + 1) / n, a0 = Math.PI / 2 + u0, a1 = Math.PI / 2 + u1;
        g.lineWidth = 2 + 4 * (p.mu * u1) / Math.max(lnR, 1e-9) * (lnR > 1e-6 ? 1 : 0);
        line(g, cx + rr(u0) * Math.cos(a0), cy + rr(u0) * Math.sin(a0), cx + rr(u1) * Math.cos(a1), cy + rr(u1) * Math.sin(a1));
      }
      // F1 side: leaves tangentially where the contact ends
      var ae = Math.PI / 2 + ph, ex = cx + rr(ph) * Math.cos(ae), ey = cy + rr(ph) * Math.sin(ae), dx = -Math.sin(ae), dy = Math.cos(ae);
      var rm = room(ex, ey, dx, dy, w, h, 34), Ls = Math.min(Math.min(w, h) * 0.12, rm * 0.3), Lmax = Math.max(20, rm - Ls), L1 = Math.min(L2 * ratio, Lmax);
      g.lineWidth = 6; line(g, ex, ey, ex + dx * Ls, ey + dy * Ls);
      farrow(g, TV, ex + dx * Ls, ey + dy * Ls, dx, dy, L1, cR, 'F_1', TV.fmt(F1, 'N'), bg, fs);
      if (L2 * ratio > Lmax) {   // arrow not to scale: break mark
        var mx = ex + dx * (Ls + L1 * 0.5), my = ey + dy * (Ls + L1 * 0.5);
        g.strokeStyle = bg; g.lineWidth = 5; line(g, mx - dy * 9 - dx * 3, my + dx * 9 - dy * 3, mx + dy * 9 - dx * 3, my - dx * 9 - dy * 3);
        g.strokeStyle = cR; g.lineWidth = 1.5; line(g, mx - dy * 9 - dx * 6, my + dx * 9 - dy * 6, mx + dy * 9 - dx * 6, my - dx * 9 - dy * 6); line(g, mx - dy * 9, my + dx * 9, mx + dy * 9, my - dx * 9);
      }
      // wrap angle θ at the centre
      if (ph > 0.05) { g.strokeStyle = fg; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, R * 0.55, Math.PI / 2, Math.PI / 2 + Math.min(ph, 2 * Math.PI - 0.01)); g.stroke(); }
      var am = Math.PI / 2 + Math.min(ph, 2 * Math.PI) / 2;
      lab(g, 'θ', '', cx + R * 0.7 * Math.cos(am), cy + R * 0.7 * Math.sin(am), fg, 'center', fs + 1, bg);
      lab(g, 'F_1/F_2', ' = ' + nf(ratio, 3), w - 8, 15, fg, 'right', fs);
    },
    outputs: function (p) {
      var th = p.th * D2R, e = Math.exp(p.mu * th);
      return [{ tex: 'θ', value: nf(th, 3) + ' rad' }, { tex: 'e^{μθ}', value: e, digits: 4 }, { tex: 'F_1 = F_2 e^{μθ}', value: p.F2 * e, unit: 'N' }];
    },
    answer: function (p) { return { v: p.F2 * Math.exp(p.mu * p.th * D2R) }; }
  };

  // ---------------------------------------------------------------- device: air drag and terminal speed (t3-terminal)
  function dragVr(p) { var A = Math.PI * Math.pow(p.d / 200, 2); return Math.sqrt(2 * p.m * G0 / (p.C * RHO * A)); }
  var DRAG = {
    animate: true,
    aspect: function (w) { return w < 520 ? 1.0 : 0.55; },
    params: [{ id: 'C', tex: 'C', min: 0.05, max: 1.2, step: 0.01, value: 0.5 },
             { id: 'm', tex: 'm', min: 0.1, max: 5, step: 0.05, value: 0.75, unit: 'kg' },
             { id: 'd', tex: 'd', min: 5, max: 50, step: 1, value: 22, unit: 'cm' }],
    buttons: [{ label: T('Ball (C = 0.50)', 'Pallo (C = 0,50)'), click: function (p, D) { D.set({ C: 0.5 }); } },
              { label: T('Disc face-on (C = 1.0)', 'Kiekko lappeellaan (C = 1,0)'), click: function (p, D) { D.set({ C: 1.0 }); } },
              { label: T('Streamlined (C = 0.06)', 'Virtaviivainen (C = 0,06)'), click: function (p, D) { D.set({ C: 0.06 }); } },
              { label: T('Drop', 'Pudota'), click: function (p, D) { changed(D.S, p, ['C', 'm', 'd']); D.S.ts = D.motion ? 0 : 1e9; D.S.run = D.motion; } }],
    draw: function (g, w, h, p, ctx, TV, D) {
      // shared axes with the slide's ball (0.75 kg, 22 cm, C = 0.50) as a reference curve, so a new shape visibly changes the graph
      var S = D.S, vr = dragVr(p), vref = dragVr({ C: 0.5, m: 0.75, d: 22 }), vtop = Math.max(vr, vref), Ts = 3 * vtop / G0;
      if (changed(S, p, ['C', 'm', 'd'])) { S.run = false; S.ts = 0; }
      if (S.run) { S.ts = Math.min(Ts, S.ts + D.dt * Ts / 4); if (S.ts >= Ts) S.run = false; }
      var t = Math.min(S.ts || 0, Ts), v = vr * Math.tanh(G0 * t / vr), s = vr * vr / G0 * Math.log(Math.cosh(G0 * t / vr));
      var fg = ctx.color('--fg'), wire = ctx.color('--c-wire'), mu = ctx.color('--muted'), bg = ctx.color('--surface'), fs = fsz(w);
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      // falling body: the background marks move up while it falls (the view follows the body)
      var colW = w * 0.3, bx = colW / 2, by = h * 0.42, rp = 7 + 26 * p.d / 50;
      g.fillStyle = ctx.color('--surface-2'); g.fillRect(0, 0, colW, h); g.strokeStyle = mu; g.lineWidth = 1;
      for (var k = -1; k < h / 40 + 1; k++) { var yy = k * 40 - (s * 12) % 40; line(g, 4, yy, 14, yy); line(g, colW - 14, yy, colW - 4, yy); }
      g.fillStyle = ctx.color('--m-body'); g.strokeStyle = wire; g.lineWidth = 2; g.beginPath();
      if (p.C < 0.2) { g.moveTo(bx, by + rp * 1.6); g.bezierCurveTo(bx + rp, by + rp * 0.2, bx + rp, by - rp, bx, by - rp); g.bezierCurveTo(bx - rp, by - rp, bx - rp, by + rp * 0.2, bx, by + rp * 1.6); }
      else if (p.C > 0.75) TV.rr(g, bx - rp, by - rp * 0.22, 2 * rp, rp * 0.44, 3);
      else g.arc(bx, by, rp, 0, 2 * Math.PI);
      g.fill(); g.stroke();
      var Lg = h * 0.22;
      farrow(g, TV, bx, by + rp * 0.3, 0, 1, Lg, ctx.color('--f-weight'), 'mg', '', bg, fs);
      farrow(g, TV, bx, by - rp * 0.3, 0, -1, Lg * (v / vr) * (v / vr), ctx.color('--f-friction'), 'F_μ', '', bg, fs);
      TV.arrow(g, colW - 18, by - h * 0.1, colW - 18, by - h * 0.1 + h * 0.2 * v / vr + 1, ctx.color('--f-accel'), 2.5);
      lab(g, 'v', '', colW - 30, by - h * 0.1, ctx.color('--f-accel'), 'center', fs);
      // v(t) graph: free fall v = g t (dashed) and the drag curve approaching v_r
      var gx0 = colW + 44, gx1 = w - 14, gy0 = h * 0.1, gy1 = h - 28, vmax = 1.18 * vtop;
      var X = function (tt) { return gx0 + tt / Ts * (gx1 - gx0); }, Y = function (vv) { return gy1 - vv / vmax * (gy1 - gy0); };
      g.strokeStyle = wire; g.lineWidth = 1.5; line(g, gx0, gy1, gx1, gy1); line(g, gx0, gy1, gx0, gy0 - 8);
      lab(g, 'v', ' / (m/s)', gx0 + 6, gy0 - 6, fg, 'left', fs); lab(g, 't', ' / s', gx1, gy1 - 12, fg, 'right', fs);
      lab(g, '', '0', gx0, gy1 + 13, mu, 'center', fs - 2); lab(g, '', nf(Ts, 2), gx1 - 2, gy1 + 13, mu, 'right', fs - 2);
      g.setLineDash([5, 4]); g.strokeStyle = mu; g.lineWidth = 1.3; line(g, gx0, gy1, X(Math.min(Ts, vmax / G0)), Y(Math.min(vmax, G0 * Ts)));
      g.strokeStyle = ctx.color('--f-accel'); line(g, gx0, Y(vr), gx1, Y(vr)); g.setLineDash([]);
      lab(g, 'v_r', ' = ' + TV.fmt(vr, 'm/s'), gx1 - 4, Y(vr) - 13, ctx.color('--f-accel'), 'right', fs, bg);
      lab(g, 'v = gt', '', X(Math.min(Ts, vmax / G0) * 0.75) - 8, Y(Math.min(vmax, G0 * Ts) * 0.75), mu, 'right', fs - 1, bg);
      g.strokeStyle = mu; g.lineWidth = 1.5; g.beginPath();
      for (var j = 0; j <= 120; j++) { var tj = Ts * j / 120; if (j === 0) g.moveTo(X(tj), Y(0)); else g.lineTo(X(tj), Y(vref * Math.tanh(G0 * tj / vref))); }
      g.stroke(); lab(g, '', ctx.tx(T('0.75 kg ball', '0,75 kg pallo')), gx1 - 4, Y(vref * Math.tanh(3)) + 13, mu, 'right', fs - 2, bg);
      [[Ts, 0.25, 1.5], [t, 1, 3]].forEach(function (c) {
        if (c[0] <= 0) return;
        g.globalAlpha = c[1]; g.strokeStyle = ctx.color('--f-accel'); g.lineWidth = c[2]; g.beginPath();
        for (var i = 0; i <= 120; i++) { var tt = c[0] * i / 120, xx = X(tt), vv = Y(vr * Math.tanh(G0 * tt / vr)); if (i === 0) g.moveTo(xx, vv); else g.lineTo(xx, vv); }
        g.stroke(); g.globalAlpha = 1;
      });
      if (t > 0) { g.fillStyle = ctx.color('--f-accel'); g.beginPath(); g.arc(X(t), Y(v), 4, 0, 2 * Math.PI); g.fill(); }
    },
    outputs: function (p) {
      var A = Math.PI * Math.pow(p.d / 200, 2);
      return [{ tex: 'A = π (d/2)^2', value: A, unit: 'm²', digits: 3 }, { tex: 'm g', value: p.m * G0, unit: 'N' },
              { tex: 'v_r = sqrt{{2 m g}/{C ρ A}}', value: dragVr(p), unit: 'm/s' }];
    },
    answer: function (p) { return { v: dragVr(p) }; }
  };

  // ---------------------------------------------------------------- device: tipping refrigerator (t3-fridge)
  var FW = 0.7, FH = 1.8;
  function cgX(ang, hc) { return -(FW / 2) * Math.cos(ang) + hc * Math.sin(ang); }   // CG right of the pivot edge (> 0: it overturns)
  var FRIDGE = {
    animate: true,
    aspect: function (w) { return w < 520 ? 0.95 : 0.55; },
    params: [{ id: 'tilt', tex: 'φ', min: 0, max: 45, step: 1, value: 10, unit: '°' },
             { id: 'hc', tex: 'h_{CG}', min: 50, max: 140, step: 5, value: 90, unit: 'cm' }],
    buttons: [{ label: T('Let go', 'Päästä irti'), click: function (p, D) {
      var S = D.S; changed(S, p, ['tilt', 'hc']); S.ang = p.tilt * D2R; S.om = 0; S.run = D.motion;
      if (!D.motion) S.ang = cgX(S.ang, p.hc / 100) > 0 ? Math.PI / 2 : 0;
    } }],
    draw: function (g, w, h, p, ctx, TV, D) {
      var S = D.S, hc = p.hc / 100;
      if (changed(S, p, ['tilt', 'hc'])) { S.run = false; S.ang = null; }
      if (S.run) {
        var Jm = (FW * FW + FH * FH) / 12 + (FW / 2) * (FW / 2) + hc * hc;   // J/m about the pivot edge (box, parallel axes)
        S.om += G0 * cgX(S.ang, hc) / Jm * D.dt; S.ang += S.om * D.dt;
        if (S.ang <= 0) { S.ang = 0; S.run = false; } else if (S.ang >= Math.PI / 2) { S.ang = Math.PI / 2; S.run = false; }
      }
      var ang = S.ang == null ? p.tilt * D2R : S.ang, over = cgX(ang, hc) > 0;
      var fg = ctx.color('--fg'), wire = ctx.color('--c-wire'), bg = ctx.color('--surface'), fs = fsz(w);
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      var fy = h * 0.88, px = w * (w < 520 ? 0.38 : 0.56), ppm = Math.min(h * 0.66 / FH, (w - px - 12) / FH);   // room to the right for the overturned refrigerator
      g.fillStyle = ctx.color('--m-ground'); g.fillRect(0, fy, w, h - fy); g.strokeStyle = wire; g.lineWidth = 2; line(g, 0, fy, w, fy);
      // support surface of the standing refrigerator
      g.strokeStyle = ctx.color('--bad'); g.lineWidth = 5; line(g, px - FW * ppm, fy + 3, px, fy + 3);
      g.save(); g.translate(px, fy); g.rotate(ang);
      g.fillStyle = ctx.color('--m-body'); g.strokeStyle = wire; g.lineWidth = 2.5; TV.rr(g, -FW * ppm, -FH * ppm, FW * ppm, FH * ppm, 6); g.fill(); g.stroke();
      g.lineWidth = 1.5; line(g, -FW * ppm, -FH * 0.62 * ppm, 0, -FH * 0.62 * ppm);
      g.lineWidth = 3; line(g, -FW * 0.85 * ppm, -FH * 0.8 * ppm, -FW * 0.85 * ppm, -FH * 0.7 * ppm); line(g, -FW * 0.85 * ppm, -FH * 0.55 * ppm, -FW * 0.85 * ppm, -FH * 0.4 * ppm);
      g.restore();
      // centre of gravity and its vertical line (the line of action of the weight)
      var gx = px + cgX(ang, hc) * ppm, gy = fy - ((FW / 2) * Math.sin(ang) + hc * Math.cos(ang)) * ppm;
      g.strokeStyle = ctx.color('--f-normal'); g.lineWidth = 1.6; g.setLineDash([5, 4]); line(g, gx, gy, gx, fy); g.setLineDash([]);
      TV.arrow(g, gx, gy, gx, gy + Math.min(60, (fy - gy) * 0.6), ctx.color('--f-weight'), 3);
      lab(g, 'mg', '', gx + 16, gy + 30, ctx.color('--f-weight'), 'left', fs, bg);
      g.fillStyle = fg; g.beginPath(); g.arc(gx, gy, 5, 0, 2 * Math.PI); g.fill(); lab(g, '', 'CG', gx - 10, gy - 10, fg, 'right', fs, bg);
      g.fillStyle = fg; g.beginPath(); g.arc(px, fy, 4, 0, 2 * Math.PI); g.fill();
      lab(g, '', ctx.tx(over ? T('CG line misses the base: it overturns', 'Painopisteen pystysuora ohittaa tukipinnan: kaatuu')
        : T('CG line hits the base: it rights itself', 'Painopisteen pystysuora osuu tukipintaan: palautuu')), 8, 15, ctx.color(over ? '--bad' : '--ok'), 'left', fs);
    },
    outputs: function (p) {
      var c = Math.atan(FW / 2 / (p.hc / 100)) / D2R;
      return [{ tex: 'φ_c', value: c, unit: '°' },
              { label: T('After letting go', 'Irti päästettäessä'), value: p.tilt > c ? T('overturns', 'kaatuu') : T('falls back upright', 'palautuu pystyyn') }];
    }
  };

  // ---------------------------------------------------------------- device: loaded bar on two supports (t3-bar-lab)
  var BL = 4;   // bar length l = 4.0 m (slide p13)
  function barLay(w, h) { var xA = w * 0.1, xB = w * 0.9; return { xA: xA, xB: xB, y: h * 0.42, ppm: (xB - xA) / BL }; }
  function barF(p) { var FB = (p.M * G0 * p.x + p.m * G0 * BL / 2) / BL; return { FB: FB, FA: (p.M + p.m) * G0 - FB }; }
  var BAR = {
    animate: true,
    aspect: function (w) { return w < 520 ? 0.85 : 0.45; },
    params: [{ id: 'x', tex: 'x', min: 0, max: 4, step: 0.1, value: 1, unit: 'm' },
             { id: 'M', tex: 'M', min: 0, max: 400, step: 10, value: 220, unit: 'kg' },
             { id: 'm', tex: 'm', min: 0, max: 300, step: 10, value: 140, unit: 'kg' }],
    buttons: [{ label: T('Slide the load from A to B', 'Liu’uta kuorma A:sta B:hen'), click: function (p, D) {
      if (D.motion) { D.S.xr = 0; D.S.run = true; D.set({ x: 0 }); } else D.set({ x: BL });
    } }],
    drag: {
      hit: function (x, y, p, D) { var L = barLay(D.w, D.h), bx = L.xA + p.x * L.ppm; return Math.abs(x - bx) < 28 && y > L.y - 70 && y < L.y + 10 ? 'x' : null; },
      move: function (k, x, y, p, D) { var L = barLay(D.w, D.h); D.S.run = false; return { x: (x - L.xA) / L.ppm }; }
    },
    draw: function (g, w, h, p, ctx, TV, D) {
      var S = D.S;
      if (S.run) { S.xr = Math.min(BL, S.xr + D.dt * 0.8); D.set({ x: S.xr }); if (S.xr >= BL) S.run = false; }
      var x = S.run ? S.xr : p.x, q = barF({ x: x, M: p.M, m: p.m }), L = barLay(w, h);
      var fg = ctx.color('--fg'), wire = ctx.color('--c-wire'), mu = ctx.color('--muted'), bg = ctx.color('--surface'), fs = fsz(w);
      var sc = h * 0.36 / Math.max(3600, (p.M + p.m) * G0), th = 12, yb = L.y + th / 2;
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      // supports, bar, load
      g.fillStyle = ctx.color('--m-ground'); g.strokeStyle = wire; g.lineWidth = 2;
      [L.xA, L.xB].forEach(function (sx) { g.globalAlpha = 0.6; g.beginPath(); g.moveTo(sx, yb); g.lineTo(sx - 13, yb + 24); g.lineTo(sx + 13, yb + 24); g.closePath(); g.fill(); g.stroke(); g.globalAlpha = 1; });
      g.fillStyle = ctx.color('--c-body-fill'); TV.rr(g, L.xA - 6, L.y - th / 2, L.xB - L.xA + 12, th, 3); g.fill(); g.stroke();
      var bx = L.xA + x * L.ppm, bs = 18 + 22 * Math.cbrt(p.M / 400);
      if (p.M > 0) { g.fillStyle = ctx.color('--m-body'); TV.rr(g, bx - bs / 2, L.y - th / 2 - bs, bs, bs, 3); g.fill(); g.stroke(); lab(g, 'M', '', bx, L.y - th / 2 - bs / 2, fg, 'center', fs); }
      lab(g, '', 'A', L.xA, yb + 36, fg, 'center', fs); lab(g, '', 'B', L.xB, yb + 36, fg, 'center', fs);
      // forces: supports push up, the weights pull down
      farrow(g, TV, L.xA - 22, yb + q.FA * sc, 0, -1, q.FA * sc, ctx.color('--f-normal'), '', '', bg, fs);
      lab(g, 'F_A', ' = ' + TV.fmt(q.FA, 'N'), L.xA - 22, Math.min(h - 10, yb + q.FA * sc + 14), ctx.color('--f-normal'), 'left', fs, bg);
      farrow(g, TV, L.xB + 22, yb + q.FB * sc, 0, -1, q.FB * sc, ctx.color('--f-normal'), '', '', bg, fs);
      lab(g, 'F_B', ' = ' + TV.fmt(q.FB, 'N'), L.xB + 22, Math.min(h - 10, yb + q.FB * sc + 14), ctx.color('--f-normal'), 'right', fs, bg);
      if (p.M > 0) { TV.arrow(g, bx, L.y, bx, L.y + p.M * G0 * sc, ctx.color('--f-weight'), 3); lab(g, 'Mg', '', bx + 8, L.y + p.M * G0 * sc - 4, ctx.color('--f-weight'), 'left', fs, bg); }
      var xm = (L.xA + L.xB) / 2;
      if (p.m > 0) { TV.arrow(g, xm, L.y, xm, L.y + p.m * G0 * sc, ctx.color('--f-weight'), 3); var near = p.M > 0 && Math.abs(bx - xm) < 50;   // load over the bar's centre: label mg on the other side
        lab(g, 'mg', '', near ? xm - 8 : xm + 8, L.y + p.m * G0 * sc - 4, ctx.color('--f-weight'), near ? 'right' : 'left', fs, bg); }
      // distance of the load from A
      var dy = L.y - th / 2 - bs - 16;
      if (x > 0.05) { TV.arrow(g, L.xA + 1, dy, bx, dy, mu, 1.3); TV.arrow(g, bx - 1, dy, L.xA, dy, mu, 1.3); }
      lab(g, 'x', ' = ' + nf(x, 2) + ' m', Math.max(L.xA + 30, (L.xA + bx) / 2), dy - 12, mu, 'center', fs, bg);
      // the word in front keeps the italic l from reading as a capital I on small canvases
      font(g, fs); var pre = ctx.tx(T('bar length ', 'palkin pituus ')); g.fillStyle = mu; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(pre, L.xA, h * 0.08);
      lab(g, 'l', ctx.tx(T(' = 4.0 m', ' = 4,0 m')), L.xA + g.measureText(pre).width, h * 0.08, mu, 'left', fs);
    },
    outputs: function (p) {
      var q = barF(p);
      return [{ tex: 'F_A', value: q.FA, unit: 'N' }, { tex: 'F_B', value: q.FB, unit: 'N' }, { tex: 'F_A + F_B = (M + m) g', value: (p.M + p.m) * G0, unit: 'N' }];
    },
    answer: function (p) { return { v: barF(p).FB }; }
  };

  // ---------------------------------------------------------------- device: ladder against a smooth wall (t3-ladder)
  var LL = 5, LG = 100;   // ex 3.39: 5.0 m, 100.0 N
  function ladSlips(p) { return LG / (2 * Math.tan(p.th * D2R)) > p.mu * LG + 1e-9; }
  var LAD = {
    animate: true,
    aspect: function (w) { return w < 520 ? 1 : 0.6; },
    params: [{ id: 'th', tex: 'θ', min: 15, max: 85, step: 1, value: 60, unit: '°' },
             { id: 'mu', tex: 'μ', min: 0, max: 1, step: 0.01, value: 0.4 }],
    buttons: [{ label: T('Let go', 'Päästä irti'), click: function (p, D) {
      var S = D.S; changed(S, p, ['th', 'mu']); S.ang = p.th * D2R; S.om = 0; S.tried = true; S.run = D.motion && ladSlips(p);
      if (!D.motion && ladSlips(p)) S.ang = 0;
    } }],
    draw: function (g, w, h, p, ctx, TV, D) {
      var S = D.S;
      if (changed(S, p, ['th', 'mu'])) { S.run = false; S.ang = null; S.tried = false; }
      if (S.run) { S.om -= 1.5 * G0 / LL * Math.cos(S.ang) * 0.5 * D.dt; S.ang += S.om * D.dt; if (S.ang <= 0.02) { S.ang = 0.02; S.run = false; } }
      var ang = S.ang == null ? p.th * D2R : S.ang, slip = ladSlips(p), fall = S.tried && slip;
      var fg = ctx.color('--fg'), wire = ctx.color('--c-wire'), bg = ctx.color('--surface'), fs = fsz(w);
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      var fy = h * 0.84, wx = w * 0.14, ppm = Math.min(h * 0.74 / LL, w * 0.58 / LL);
      g.fillStyle = ctx.color('--m-ground'); g.fillRect(0, fy, w, h - fy); g.fillRect(0, 0, wx, fy);
      g.strokeStyle = wire; g.lineWidth = 2.5; line(g, wx, 0, wx, fy); line(g, wx, fy, w, fy);
      // ladder: two rails and rungs
      var fx = wx + LL * Math.cos(ang) * ppm, tx = wx + 4, ty = fy - LL * Math.sin(ang) * ppm, ux = (tx - fx) / (LL * ppm), uy = (ty - fy) / (LL * ppm), nx = -uy * 6, ny = ux * 6;
      g.strokeStyle = ctx.color('--f-friction'); g.lineWidth = 3;
      line(g, fx + nx, fy + ny, tx + nx, ty + ny); line(g, fx - nx, fy - ny, tx - nx, ty - ny);
      g.lineWidth = 2; for (var i = 1; i < 10; i++) { var rx = fx + (tx - fx) * i / 10, ry = fy + (ty - fy) * i / 10; line(g, rx + nx, ry + ny, rx - nx, ry - ny); }
      // angle at the foot
      g.strokeStyle = fg; g.lineWidth = 1.5; g.beginPath(); g.arc(fx, fy, 30, Math.PI, Math.PI + ang); g.stroke();
      lab(g, 'θ', '', fx - 40 * Math.cos(ang / 2), fy - 40 * Math.sin(ang / 2), fg, 'center', fs);
      if (!fall) {
        // forces in equilibrium: weight at the middle, N and friction at the foot, wall push N_w at the top
        var fneed = LG / (2 * Math.tan(ang)), fav = p.mu * LG, sc = Math.min(w, h) * 0.2 / LG;
        farrow(g, TV, (fx + tx) / 2, (fy + ty) / 2, 0, 1, LG * sc, ctx.color('--f-weight'), 'G', '', bg, fs);
        farrow(g, TV, fx + 14, fy, 0, -1, LG * sc, ctx.color('--f-normal'), 'N', '', bg, fs);
        var Lf = Math.min(fneed, fav) * sc;
        TV.arrow(g, fx, fy + 8, fx - Lf, fy + 8, ctx.color('--f-friction'), 3);
        if (fneed > fav) { g.setLineDash([4, 3]); TV.arrow(g, fx - Lf, fy + 8, fx - Math.min(fneed * sc, w), fy + 8, ctx.color('--bad'), 2); g.setLineDash([]); }
        lab(g, 'F_μ', '', fx - Lf / 2, fy + 22, ctx.color('--f-friction'), 'center', fs, bg);
        farrow(g, TV, tx + 6, ty, 1, 0, Math.min(fneed * sc, w * 0.5), ctx.color('--f-normal'), 'N_w', '', bg, fs);
      }
      var msg = fall ? T('it slips and falls', 'liukuu ja kaatuu') : slip ? T('the floor friction is too small: it will slip', 'lattian kitka ei riitä: liukuu') : T('friction is enough: it stands', 'kitka riittää: pysyy pystyssä');
      lab(g, '', ctx.tx(msg), w - 8, 15, ctx.color(slip ? '--bad' : '--ok'), 'right', fs);
      // needed vs available friction bars
      var bx0 = w * 0.55, bw = w * 0.4, fmax = Math.max(LG / (2 * Math.tan(p.th * D2R)), LG) * 1.05;
      [[LG / (2 * Math.tan(p.th * D2R)), 'F_μ', slip ? '--bad' : '--f-friction'], [p.mu * LG, 'μN', '--f-normal']].forEach(function (b, k) {
        var y = 34 + k * 22; g.fillStyle = ctx.color(b[2]); g.globalAlpha = 0.8; g.fillRect(bx0, y - 7, bw * b[0] / fmax, 14); g.globalAlpha = 1;
        lab(g, b[1], ' = ' + TV.fmt(b[0], 'N'), bx0 - 6, y, fg, 'right', fs - 1);
      });
    },
    outputs: function (p) {
      var c = p.mu > 0 ? Math.atan(1 / (2 * p.mu)) / D2R : 90;
      return [{ tex: 'F_μ = N_w = {G}/{2 tan θ}', value: LG / (2 * Math.tan(p.th * D2R)), unit: 'N' }, { tex: 'μ N = μ G', value: p.mu * LG, unit: 'N' },
              { tex: 'θ_min = arctan {1}/{2μ}', value: c, unit: '°' }];
    },
    answer: function (p) { return { v: p.mu > 0 ? Math.atan(1 / (2 * p.mu)) / D2R : 90 }; }
  };

  // ---------------------------------------------------------------- device: ball in stable / labile / indifferent equilibrium (t3-equil-ball)
  function ballLay(w, h) { return { cx: w / 2, half: w * 0.42, base: h * 0.36, amp: h * 0.5 }; }
  function ballY(k, u) { return 0.45 * k * u * u; }
  function ballEnd(S, p) { if (p.k > 0.025) S.u = 0; else if (p.k < -0.025) S.u = (S.u || 0) >= 0 ? 1 : -1; else S.u = clamp((S.u || 0) + 0.33, -1, 1); S.v = 0; S.run = false; }
  var BALL = {
    animate: true,
    aspect: function (w) { return w < 520 ? 0.95 : 0.55; },
    params: [{ id: 'k', label: T('Shape: hill ← flat → bowl', 'Muoto: kumpu ← tasainen → kuoppa'), min: -1, max: 1, step: 0.05, value: 1 }],
    buttons: [{ label: T('Nudge the ball', 'Tönäise palloa'), click: function (p, D) { var S = D.S; if (changed(S, p, ['k'])) S.u = 0; S.u = S.u || 0; S.v = 0.5; S.run = D.motion; if (!D.motion) ballEnd(S, p); } },
              { label: T('Back to the middle', 'Takaisin keskelle'), click: function (p, D) { D.S.u = 0; D.S.v = 0; D.S.run = false; } }],
    drag: {
      hit: function (x, y, p, D) { var L = ballLay(D.w, D.h), u = D.S.u || 0, bx = L.cx + u * L.half, by = L.base - ballY(p.k, u) * L.amp - 12; return Math.hypot(x - bx, y - by) < 22 ? 'ball' : null; },
      move: function (k, x, y, p, D) { var L = ballLay(D.w, D.h), S = D.S; S.u = clamp((x - L.cx) / L.half, -0.95, 0.95); S.v = 0; S.run = false; S.held = true; return {}; }
    },
    draw: function (g, w, h, p, ctx, TV, D) {
      var S = D.S, L = ballLay(w, h), kk = Math.abs(p.k) < 0.025 ? 0 : p.k;
      if (changed(S, p, ['k'])) { S.run = false; S.u = 0; S.v = 0; }
      if (S.held && !D.key) { S.held = false; S.v = 0; S.run = D.motion; if (!D.motion) ballEnd(S, p); }
      if (S.run) {
        var dt = D.dt; S.v += (-9 * 0.9 * kk * S.u - 1.5 * S.v) * dt; S.u += S.v * dt;
        if (Math.abs(S.u) >= 1) { S.u = Math.sign(S.u); S.v = 0; S.run = false; }
        if (Math.abs(S.v) < 0.004 && (kk === 0 || kk > 0 && Math.abs(S.u) < 0.01)) S.run = false;
      }
      var u = S.u || 0, fg = ctx.color('--fg'), wire = ctx.color('--c-wire'), mu = ctx.color('--muted'), bg = ctx.color('--surface'), fs = fsz(w);
      var X = function (uu) { return L.cx + uu * L.half; }, Yl = function (uu) { return L.base - ballY(p.k, uu) * L.amp; };
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      g.fillStyle = ctx.color('--m-ground'); g.strokeStyle = wire; g.lineWidth = 2.5; g.beginPath(); g.moveTo(X(-1.1), h * 0.62);
      for (var i = -110; i <= 110; i += 2) g.lineTo(X(i / 100), Yl(i / 100));
      g.lineTo(X(1.1), h * 0.62); g.closePath(); g.fill();
      g.beginPath(); for (i = -110; i <= 110; i += 2) { if (i === -110) g.moveTo(X(i / 100), Yl(i / 100)); else g.lineTo(X(i / 100), Yl(i / 100)); } g.stroke();
      g.fillStyle = ctx.color('--bad'); g.beginPath(); g.arc(X(u), Yl(u) - 12, 12, 0, 2 * Math.PI); g.fill();
      // potential energy E_p(x) of the ball (same shape as the landscape)
      var gy1 = h - 18, gy0 = h * 0.7, gm = (gy0 + gy1) / 2;
      g.strokeStyle = wire; g.lineWidth = 1.5; line(g, X(-1), gm, X(1), gm); line(g, X(-1), gy0 - 6, X(-1), gy1);
      lab(g, 'E_p', '', X(-1) - 8, gy0, fg, 'right', fs); lab(g, 'x', '', X(1) + 6, gm + 12, fg, 'left', fs);
      g.strokeStyle = ctx.color('--c-2'); g.lineWidth = 2; g.beginPath();
      for (i = -100; i <= 100; i += 2) { var yy = gm - ballY(p.k, i / 100) / 0.45 * (gy1 - gy0) / 2; if (i === -100) g.moveTo(X(i / 100), yy); else g.lineTo(X(i / 100), yy); }
      g.stroke(); g.fillStyle = ctx.color('--bad'); g.beginPath(); g.arc(X(u), gm - ballY(p.k, u) / 0.45 * (gy1 - gy0) / 2, 5, 0, 2 * Math.PI); g.fill();
      var st = kk > 0 ? T('stable: E_p grows when the ball is moved', 'stabiili: E_p kasvaa, kun palloa siirretään') : kk < 0 ? T('labile: E_p decreases when the ball is moved', 'labiili: E_p pienenee, kun palloa siirretään')
        : T('indifferent: E_p does not change', 'indifferentti (epämääräinen): E_p ei muutu');
      lab(g, '', ctx.tx(st), 8, 15, fg, 'left', fs, bg);
    },
    outputs: function (p) {
      var kk = Math.abs(p.k) < 0.025 ? 0 : p.k;
      return [{ label: T('Equilibrium', 'Tasapaino'), value: kk > 0 ? T('stable', 'stabiili') : kk < 0 ? T('labile (unstable)', 'labiili') : T('indifferent (neutral)', 'indifferentti (epämääräinen)') }];
    }
  };

  // ---------------------------------------------------------------- the topic
  TDC.registerTopic({
    id: 't3', num: 3,
    title: T('Force', 'Voima'),
    subtitle: T("Newton's laws, free-body diagrams, friction, drag and statics.", 'Newtonin lait, vapaakappalekuviot, kitka, väliaineen vastus ja statiikka.'),
    objectives: [
      T("state Newton's three laws and tell mass from weight", 'selittää Newtonin kolme lakia ja erottaa massan painosta'),
      T('draw a free-body diagram and solve a force problem in six steps', 'piirtää vapaakappalekuvion ja ratkaista voimatehtävän kuudessa vaiheessa'),
      T('resolve the weight on an incline into components and include static and kinetic friction', 'jakaa painon komponentteihin kaltevalla tasolla ja ottaa huomioon lepo- ja liikekitkan'),
      T('use rope friction, rolling resistance and air drag (terminal speed)', 'käyttää köysikitkaa, vierintävastusta ja ilmanvastusta (rajanopeus)'),
      T('apply the balancing conditions ΣF = 0 and ΣM = 0 to bars and ladders', 'soveltaa tasapainoehtoja ΣF = 0 ja ΣM = 0 palkkeihin ja tikapuihin')
    ],
    glossary: {
      force: { en: 'force', fi: 'voima', sym: 'F', def: T('A vector quantity that changes the motion of a body or deforms it; unit newton, 1 N = 1 kg·m/s².', 'Vektorisuure, joka muuttaa kappaleen liiketilaa tai muotoa; yksikkö newton, 1 N = 1 kg·m/s².') },
      mass: { en: 'mass', fi: 'massa', sym: 'm', def: T('Scalar measure of how strongly a body resists changes of its motion; unit kg.', 'Skalaarisuure, joka kuvaa, kuinka voimakkaasti kappale vastustaa liiketilansa muutosta; yksikkö kg.') },
      weight: { en: 'weight (gravity force)', fi: 'painovoima', sym: 'G = m g', def: T('The gravitational force on a body, G = m g; it depends on the local g, the mass does not.', 'Kappaleeseen vaikuttava painovoima G = m g; se riippuu paikallisesta g:stä, massa ei.') },
      g: { en: 'gravitational acceleration', fi: 'putoamiskiihtyvyys', sym: 'g', def: T('g = 9.81 m/s² on the Earth (used in this course).', 'g = 9,81 m/s² maan pinnalla (käytetään tällä kurssilla).') },
      resultant: { en: 'resultant force', fi: 'kokonaisvoima (resultantti)', sym: 'ΣF', def: T('The vector sum of all forces acting on a body.', 'Kappaleeseen vaikuttavien voimien vektorisumma.') },
      counterforce: { en: 'counterforce (reaction)', fi: 'vastavoima', def: T('Newton III: the equal and opposite force that the other body exerts; it acts on the other body.', 'Newtonin III laki: yhtä suuri ja vastakkainen voima, jolla toinen kappale vaikuttaa; se kohdistuu toiseen kappaleeseen.') },
      fbd: { en: 'free-body diagram', fi: 'vapaakappalekuvio', def: T('Drawing of one body on its own with every force acting on it as an arrow.', 'Kuva yksittäisestä kappaleesta ilman ympäristöä, ja siihen vaikuttavat voimat nuolina.') },
      sketch: { en: 'situation sketch', fi: 'tilannekuva', def: T('Step 1 of the method: the body drawn without its surroundings.', 'Ratkaisumenetelmän 1. vaihe: kappale piirrettynä ilman ympäristöä.') },
      forcediag: { en: 'force diagram', fi: 'voimakuva', def: T('The free-body diagram with the magnitudes of the forces written in.', 'Vapaakappalekuvio, johon on merkitty voimien suuruudet.') },
      normal: { en: 'normal force (support force)', fi: 'tukivoima (normaalivoima)', sym: 'N', def: T('Force of a surface on a body, perpendicular to the surface.', 'Pinnan kappaleeseen kohdistama voima, kohtisuorassa pintaa vastaan.') },
      tension: { en: 'tension (rope force)', fi: 'jännitysvoima (köysivoima)', sym: 'T', def: T('Pull of a rope or cable along its direction.', 'Köyden tai vaijerin veto köyden suuntaan.') },
      friction: { en: 'friction force', fi: 'kitkavoima', sym: 'F_μ', def: T('Force along the contact surface that opposes sliding (or the tendency to slide).', 'Kosketuspinnan suuntainen voima, joka vastustaa liukumista tai sen alkamista.') },
      staticfr: { en: 'static friction', fi: 'lepokitka', sym: 'F_μs ≤ μ_s N', def: T('Friction on a body at rest; it grows with the pull up to the maximum μ_s N.', 'Levossa olevaan kappaleeseen vaikuttava kitka; kasvaa vedon mukana enintään arvoon μ_s N.') },
      kineticfr: { en: 'kinetic friction', fi: 'liikekitka', sym: 'F_μk = μ_k N', def: T('Friction on a sliding body, μ_k N, opposite to the velocity.', 'Liukuvaan kappaleeseen vaikuttava kitka μ_k N, nopeutta vastaan.') },
      mus: { en: 'coefficient of static friction', fi: 'lepokitkakerroin', sym: 'μ_s', def: T('Ratio of the maximum static friction to the normal force.', 'Suurimman lepokitkan ja tukivoiman suhde.') },
      muk: { en: 'coefficient of kinetic friction', fi: 'liikekitkakerroin', sym: 'μ_k', def: T('Ratio of the kinetic friction to the normal force; μ_k < μ_s.', 'Liikekitkan ja tukivoiman suhde; μ_k < μ_s.') },
      ropefr: { en: 'rope (belt) friction', fi: 'köysikitka', sym: 'F_1/F_2 = e^{μθ}', def: T('Friction of a rope or belt over a drum; the force ratio grows exponentially with the wrap angle.', 'Köyden tai hihnan kitka rummun pinnalla; voimien suhde kasvaa eksponentiaalisesti kosketuskulman mukana.') },
      rolling: { en: 'rolling resistance', fi: 'vierintävastus', sym: 'F_R = μ_R N', def: T('Resistive force of a rolling wheel; μ_R = f/R.', 'Vierivän pyörän vastusvoima; μ_R = f/R.') },
      drag: { en: 'air drag', fi: 'ilmanvastus', sym: 'F_μ = ½ C ρ A v²', def: T('Resistance of the medium; grows with the square of the speed.', 'Väliaineen vastus; kasvaa nopeuden neliön mukaan.') },
      dragc: { en: 'drag coefficient', fi: 'muotokerroin', sym: 'C', def: T('Number that depends on the shape of the body (ball 0.5, streamlined 0.06).', 'Kappaleen muodosta riippuva luku (pallo 0,5, virtaviivainen 0,06).') },
      terminal: { en: 'terminal speed', fi: 'rajanopeus', sym: 'v_r', def: T('Speed at which the drag equals the weight, so the falling body no longer accelerates.', 'Nopeus, jolla ilmanvastus on yhtä suuri kuin paino, joten putoava kappale ei enää kiihdy.') },
      equilibrium: { en: 'static equilibrium', fi: 'staattinen tasapaino', def: T('A body at rest with zero resultant force and zero total moment.', 'Levossa oleva kappale, jonka kokonaisvoima ja kokonaismomentti ovat nolla.') },
      stable: { en: 'stable / labile / indifferent equilibrium', fi: 'stabiili / labiili / indifferentti (epämääräinen) tasapaino', def: T('Potential energy rises / falls / stays the same when the body is moved a little.', 'Potentiaalienergia kasvaa / pienenee / pysyy samana, kun kappaletta siirretään hieman.') },
      cg: { en: 'centre of gravity', fi: 'painopiste', sym: 'CG', def: T('Point where the weight of a body can be taken to act.', 'Piste, johon kappaleen painon voidaan ajatella vaikuttavan.') },
      moment: { en: 'moment of a force (torque)', fi: 'voiman momentti', sym: 'M = F r', def: T('Turning effect of a force: force times its lever arm about the chosen axis; unit N·m.', 'Voiman kiertovaikutus: voima kertaa sen varsi valitun akselin suhteen; yksikkö N·m.') }
    },
    formulas: [
      { name: T("Newton's second law", 'Newtonin II laki'), tex: 'ΣF = m a' },
      { name: T('Weight', 'Painovoima'), tex: 'G = m g' },
      { name: T('Static friction', 'Lepokitka'), tex: 'F_μs ≤ μ_s N' },
      { name: T('Kinetic friction', 'Liikekitka'), tex: 'F_μk = μ_k N' },
      { name: T('Weight on an incline', 'Paino kaltevalla tasolla'), tex: 'G_x = m g sin α,  G_y = m g cos α' },
      { name: T('Elevator cable', 'Hissin vaijeri'), tex: 'T = m(g + a)' },
      { name: T('Rope friction', 'Köysikitka'), tex: '{F_1}/{F_2} = e^{μθ}' },
      { name: T('Rolling resistance', 'Vierintävastus'), tex: 'F_R = μ_R N,  μ_R = {f}/{R}' },
      { name: T('Air drag', 'Ilmanvastus'), tex: 'F_μ = ½ C ρ A v^2' },
      { name: T('Terminal speed', 'Rajanopeus'), tex: 'v_r = sqrt{{2 m g}/{C ρ A}}' },
      { name: T('Balancing conditions', 'Tasapainoehdot'), tex: 'ΣF_x = 0,  ΣF_y = 0,  ΣM_A = 0' }
    ],
    sections: [
      // ======================================================== 3.1 basic laws (p03)
      { id: 't3-laws', title: T('Basic laws of mechanics', 'Mekaniikan perus­lait'),
        blocks: [
          { id: 't3-laws-intro', type: 'text', html: T(
            '<p><b>Dynamics</b> studies how the motion of bodies changes, that is, the effect of <dfn data-term="force">forces</dfn> on motion. It rests on Newton\'s three laws.</p>',
            '<p><b>Dynamiikka</b> tutkii kappaleiden liiketilan muutoksia eli <dfn data-term="force">voimien</dfn> vaikutusta liikkeeseen. Se perustuu Newtonin kolmeen lakiin.</p>') },
          { id: 't3-laws-list', type: 'list', items: [
            T('<b>Newton I:</b> the velocity of a body stays constant (or the body stays at rest) if the sum of the forces on it is zero.', '<b>Newtonin I laki:</b> kappaleen nopeus pysyy vakiona (tai kappale pysyy levossa), jos siihen vaikuttavien voimien summa on nolla.'),
            T('<b>Newton II:</b> the acceleration of a body is directly proportional to the resultant force on it: <f>ΣF = m a</f>.', '<b>Newtonin II laki:</b> kappaleen kiihtyvyys on suoraan verrannollinen siihen vaikuttavaan kokonaisvoimaan: <f>ΣF = m a</f>.'),
            T('<b>Newton III:</b> if body A acts on body B with force <f>F</f>, body B acts on body A with force <f>−F</f>.', '<b>Newtonin III laki:</b> jos kappale A vaikuttaa kappaleeseen B voimalla <f>F</f>, kappale B vaikuttaa kappaleeseen A voimalla <f>−F</f>.')] },
          { id: 't3-laws-cols', type: 'columns', cols: [
            [{ id: 't3-laws-mass', type: 'callout', kind: 'info', title: T('Mass m', 'Massa m'), html: T(
              'Mass measures how strongly a body resists changes of its motion: the greater the mass, the greater the force needed for a given acceleration. Mass is a scalar, SI unit kg, and it is the same everywhere.',
              'Massa kuvaa, kuinka voimakkaasti kappale vastustaa liiketilansa muutosta: mitä suurempi massa, sitä suurempi voima tarvitaan tiettyyn kiihtyvyyteen. Massa on skalaarisuure, SI-yksikkö kg, ja se on kaikkialla sama.') }],
            [{ id: 't3-laws-force', type: 'callout', kind: 'info', title: T('Force F', 'Voima F'), html: T(
              'A force accelerates a body and deforms it. Forces always occur in pairs (force and counterforce). Force is a vector, SI unit newton: <f>1 N = 1 kg·m/s^2</f>.',
              'Voima kiihdyttää kappaletta ja muuttaa sen muotoa. Voimat esiintyvät aina pareittain (voima ja vastavoima). Voima on vektorisuure, SI-yksikkö newton: <f>1 N = 1 kg·m/s^2</f>.') }]] },
          { id: 't3-laws-weight', type: 'formula', key: true, tex: 'G = m g', label: T('Weight (gravity force)', 'Painovoima'),
            legend: [['G', T('weight', 'painovoima'), 'N'], ['m', T('mass', 'massa'), 'kg'], ['g', T('gravitational acceleration, 9.81 on the Earth', 'putoamiskiihtyvyys, maan pinnalla 9,81'), 'm/s²']] },
          { id: 't3-laws-warn', type: 'callout', kind: 'warn', title: T('Mass is not weight', 'Massa ei ole paino'), html: T(
            'A 70 kg astronaut has the mass 70 kg on the Moon too, but the weight there is only <f>70 kg · 1.62 m/s^2 ≈ 113 N</f> instead of 687 N on the Earth. Weight depends on the local gravitational field; mass does not. This course uses <f>g = 9.81 m/s^2</f> (the slides sometimes use 9.8).',
            '70 kg:n astronautin massa on Kuussakin 70 kg, mutta paino siellä on vain <f>70 kg · 1,62 m/s^2 ≈ 113 N</f> eikä 687 N kuten maan pinnalla. Paino riippuu paikallisesta painovoimakentästä, massa ei. Tällä kurssilla käytetään arvoa <f>g = 9,81 m/s^2</f> (kalvoilla on joskus 9,8).') },
          { id: 't3-laws-fund', type: 'text', html: T(
            '<p>Nature has four <b>fundamental forces</b>: gravity, the electromagnetic force, the weak nuclear force and the strong nuclear force. All other forces (normal force, friction, rope tension, drag…) come from them; the forces of everyday mechanics are mostly electromagnetic forces between the atoms of the surfaces.</p>',
            '<p>Luonnossa on neljä <b>perusvoimaa</b>: gravitaatio, sähkömagneettinen voima, heikko ydinvoima ja vahva ydinvoima. Kaikki muut voimat (tukivoima, kitka, jännitysvoima, väliaineen vastus…) johtuvat niistä; arkimekaniikan voimat ovat enimmäkseen pintojen atomien välisiä sähkömagneettisia voimia.</p>') },
          { type: 'question', q: 't3-q1', id: 't3-q1-blk' },
          { type: 'question', q: 't3-q2', id: 't3-q2-blk' },
          { type: 'question', q: 't3-q3', id: 't3-q3-blk' }
        ] },

      // ======================================================== 3.2 Newton II (p04)
      { id: 't3-newton2', title: T("Newton's second law", 'Newtonin II laki'),
        blocks: [
          { id: 't3-n2-text', type: 'text', html: T(
            '<p>The total external force <f>ΣF</f> on a body gives it the acceleration <f>a</f>. <f>ΣF = F_1 + F_2 + F_3 + …</f> is the <dfn data-term="resultant">resultant force</dfn>, the <b>vector sum</b> of all forces on the body.</p>',
            '<p>Kappaleeseen vaikuttava ulkoinen kokonaisvoima <f>ΣF</f> antaa sille kiihtyvyyden <f>a</f>. <f>ΣF = F_1 + F_2 + F_3 + …</f> on <dfn data-term="resultant">kokonaisvoima</dfn> eli kaikkien kappaleeseen vaikuttavien voimien <b>vektorisumma</b>.</p>') },
          { id: 't3-n2-f', type: 'formula', key: true, tex: 'ΣF = m a', label: T("Newton's second law (vectors)", 'Newtonin II laki (vektoreina)'),
            legend: [['ΣF', T('resultant force', 'kokonaisvoima'), 'N'], ['m', T('mass', 'massa'), 'kg'], ['a', T('acceleration, same direction as ΣF', 'kiihtyvyys, samansuuntainen kuin ΣF'), 'm/s²']] },
          { id: 't3-n2-prop', type: 'list', items: [
            T('Constant mass: the acceleration is <b>directly proportional</b> to the force (<f>F, 2\\F, 3\\F</f> give <f>a, 2a, 3a</f>).', 'Vakiomassa: kiihtyvyys on <b>suoraan verrannollinen</b> voimaan (<f>F, 2\\F, 3\\F</f> antavat <f>a, 2a, 3a</f>).'),
            T('Constant force: the acceleration is <b>inversely proportional</b> to the mass (<f>m, 2\\m, 3\\m</f> give <f>a, a/2, a/3</f>).', 'Vakiovoima: kiihtyvyys on <b>kääntäen verrannollinen</b> massaan (<f>m, 2\\m, 3\\m</f> antavat <f>a, a/2, a/3</f>).')] },
          { id: 't3-n2-lab', type: 'interactive', widget: 'custom', title: T('Newton II lab: three lanes race', 'Newtonin II lain laboratorio: kolmen radan kisa'),
            caption: T('Set F and m, then race the slide\'s rows: F, 2F, 3F on equal masses, or m, 2m, 3m with equal forces. The blocks start together on a frictionless track; watch the acceleration arrows and who reaches the line first.',
              'Säädä F ja m ja aja kalvon rivit kilpaa: F, 2F, 3F samoilla massoilla tai m, 2m, 3m samalla voimalla. Kappaleet lähtevät yhtä aikaa kitkattomalla radalla; seuraa kiihtyvyysnuolia ja sitä, kuka ehtii maaliin ensin.'),
            config: dev(N2) },
          { type: 'question', q: 't3-q4', id: 't3-q4-blk' }
        ] },

      // ======================================================== 3.3 Newton III (p05)
      { id: 't3-newton3', title: T("Newton's third law: force and counterforce", 'Newtonin III laki: voima ja vasta­voima'),
        blocks: [
          { id: 't3-n3-text', type: 'text', html: T(
            '<p>If A acts on B with the force <f>F</f>, B acts on A with an equal but opposite force <f>−F</f>. The two forces of a pair act on <b>different bodies</b>. In a static situation the forces on each body are in balance; if they are not, the body accelerates.</p>',
            '<p>Jos A vaikuttaa B:hen voimalla <f>F</f>, B vaikuttaa A:han yhtä suurella mutta vastakkaisella voimalla <f>−F</f>. Voimaparin voimat vaikuttavat <b>eri kappaleisiin</b>. Staattisessa tilanteessa kunkin kappaleen voimat ovat tasapainossa; jos eivät ole, kappale kiihtyy.</p>') },
          { id: 't3-n3-fig', type: 'figure', svg: FIG_N3,
            caption: T('Block on a table: the weight G and the support force N act on the block. Their counterforces act on other bodies: N′ (the block presses on the table) and G′ (the block pulls the Earth).',
              'Kappale pöydällä: painovoima G ja tukivoima N vaikuttavat kappaleeseen. Niiden vastavoimat vaikuttavat muihin kappaleisiin: N′ (kappale painaa pöytää) ja G′ (kappale vetää maapalloa).'),
            alt: T('Block on a table with the forces G, N, N′ and G′', 'Kappale pöydällä ja voimat G, N, N′ ja G′') },
          { id: 't3-n3-key', type: 'callout', kind: 'key', title: T('A pair never cancels', 'Voimapari ei kumoa itseään'), html: T(
            'G and N on the block are equal here, but they are <b>not</b> a force-counterforce pair: both act on the same body and they are different kinds of force. The counterforce of N is N′ on the table. In a free-body diagram you draw only the forces <b>on</b> the body, so a force and its counterforce never appear in the same diagram.',
            'Kappaleen G ja N ovat tässä yhtä suuret, mutta ne <b>eivät</b> ole voima-vastavoimapari: molemmat vaikuttavat samaan kappaleeseen ja ovat eri voimalajeja. N:n vastavoima on pöytään vaikuttava N′. Vapaakappalekuvioon piirretään vain kappaleeseen <b>kohdistuvat</b> voimat, joten voima ja sen vastavoima eivät koskaan ole samassa kuvassa.') },
          { type: 'question', q: 't3-q5', id: 't3-q5-blk' },
          { id: 't3-n3-h-elev', type: 'h', text: T('Elevator: tension in the cable', 'Hissi: vaijerin jännitysvoima') },
          { id: 't3-elevator', type: 'interactive', widget: 'custom', title: T('Elevator: cable tension and apparent weight', 'Hissi: vaijerin voima ja näennäinen paino'),
            caption: T('Choose the acceleration (up +, down −) and press Run. The free-body diagram of the car resizes: T is larger than mg when the car accelerates upward and smaller when it accelerates downward. The bathroom scale shows what a 70 kg passenger "weighs".',
              'Valitse kiihtyvyys (ylös +, alas −) ja paina Aja. Hissikorin vapaakappalekuvio muuttuu: T on suurempi kuin mg, kun kori kiihtyy ylöspäin, ja pienempi, kun se kiihtyy alaspäin. Henkilövaaka näyttää, mitä 70 kg:n matkustaja "painaa".'),
            config: dev(ELEV) },
          { id: 't3-n3-ex', type: 'example', title: T('Elevator wire tension (slide p05)', 'Hissin vaijerin jännitys­voima (kalvo s. 05)'),
            problem: T('An elevator car of mass 750 kg accelerates upward at 2.0 m/s². How large is the tension in the cable?', 'Hissikori, jonka massa on 750 kg, kiihtyy ylöspäin 2,0 m/s²:n kiihtyvyydellä. Kuinka suuri on vaijerin jännitysvoima?'),
            given: ['m = 750 kg', 'a = 2.0 m/s²', 'g = 9.81 m/s²'],
            steps: [
              T('Free-body diagram of the car: tension T up, weight mg down. Positive direction up (the direction of a).', 'Korin vapaakappalekuvio: jännitysvoima T ylös, paino mg alas. Positiivinen suunta ylös (a:n suunta).'),
              { tex: 'ΣF = T − m g = m a' },
              { tex: 'T = m g + m a = m (g + a)' },
              { tex: 'T = 750 kg · (9.81 + 2.0) m/s^2 ≈ 8.86 kN ≈ 9 kN' },
              T('With g = 9.8 m/s² the result is 8.85 kN; both round to 9 kN.', 'Arvolla g = 9,8 m/s² tulos on 8,85 kN; molemmat pyöristyvät 9 kN:iin.')
            ],
            result: T('T ≈ 8.86 kN', 'T ≈ 8,86 kN') }
        ] },

      // ======================================================== 3.4 solving by drawing (p06)
      { id: 't3-method', title: T('Solving force problems by drawing', 'Voima­tehtävien ratkaiseminen piirtämällä'),
        blocks: [
          { id: 't3-method-intro', type: 'text', html: T(
            '<p>Almost every force problem is solved with the same six steps. The key step is the <dfn data-term="fbd">free-body diagram</dfn>: the body alone, with an arrow for every force that acts <b>on</b> it.</p>',
            '<p>Lähes jokainen voimatehtävä ratkeaa samoilla kuudella vaiheella. Tärkein vaihe on <dfn data-term="fbd">vapaakappalekuvio</dfn>: kappale yksinään ja jokaista siihen <b>kohdistuvaa</b> voimaa kohti nuoli.</p>') },
          { id: 't3-method-steps', type: 'list', ordered: true, items: [
            T('<b>Situation sketch:</b> draw the body you study on its own, without its surroundings.', '<b>Tilannekuva:</b> piirrä tarkasteltava kappale näkyviin ilman ympäristöä.'),
            T('<b>Free-body diagram:</b> draw the forces acting on the body, but not their counterforces.', '<b>Vapaakappalekuvio:</b> piirrä kappaleeseen vaikuttavat voimat, mutta ei niiden vastavoimia.'),
            T('<b>Force diagram:</b> write the magnitudes of the forces into the picture.', '<b>Voimakuva:</b> merkitse voimien suuruudet kuvaan.'),
            T('<b>Coordinate system:</b> choose the x and y axes and mark their positive directions.', '<b>Koordinaatiston valinta:</b> valitse x- ja y-akseli ja merkitse niiden positiiviset suunnat.'),
            T('<b>Equations:</b> write <f>ΣF = m a</f> along the x axis and along the y axis.', '<b>Yhtälöt:</b> kirjoita <f>ΣF = m a</f> x-akselin ja y-akselin suunnassa.'),
            T('<b>Solve:</b> solve the unknown quantities from the equations.', '<b>Ratkaisu:</b> ratkaise tuntemattomat suureet yhtälöistä.')] },
          { id: 't3-method-which', type: 'columns', cols: [
            [{ id: 't3-method-yes', type: 'callout', kind: 'tip', title: T('Forces that do act', 'Voimat, jotka vaikuttavat'), html: T(
              '<ul><li>the weight <f>m g</f> (always, straight down)</li><li>a force from everything that <b>touches</b> the body: support force <f>N</f> (perpendicular to the surface), friction <f>F_μ</f> (along the surface), rope tension <f>T</f> (along the rope), a push or pull <f>F</f></li></ul>',
              '<ul><li>paino <f>m g</f> (aina, suoraan alas)</li><li>voima jokaiselta, mikä <b>koskettaa</b> kappaletta: tukivoima <f>N</f> (kohtisuoraan pintaa vastaan), kitka <f>F_μ</f> (pinnan suuntaan), jännitysvoima <f>T</f> (köyden suuntaan), työntö tai veto <f>F</f></li></ul>') }],
            [{ id: 't3-method-no', type: 'callout', kind: 'warn', title: T('Not forces on the body', 'Eivät ole kappaleeseen vaikuttavia voimia'), html: T(
              '<ul><li>a "force of motion" (a moving body needs no force to keep moving: Newton I)</li><li>"inertia" or <f>m a</f> (that is the result, the right-hand side of <f>ΣF = m a</f>)</li><li>counterforces, which act on <b>other</b> bodies (the body\'s push on the floor)</li><li>a "centripetal force" on a straight path</li></ul>',
              '<ul><li>"liikkeen voima" (liikkuva kappale ei tarvitse voimaa pysyäkseen liikkeessä: Newtonin I laki)</li><li>"hitaus" tai <f>m a</f> (se on tulos, yhtälön <f>ΣF = m a</f> oikea puoli)</li><li>vastavoimat, jotka vaikuttavat <b>muihin</b> kappaleisiin (kappaleen paine lattiaa vasten)</li><li>"keskeisvoima" suoralla radalla</li></ul>') }]] },
          { id: 't3-method-axes', type: 'text', html: T(
            '<p><b>Choosing the axes:</b> put one axis along the acceleration (along the floor, along the slope, vertical for an elevator). Then <f>ΣF = m a</f> along that axis and <f>ΣF = 0</f> across it.</p>',
            '<p><b>Akselien valinta:</b> aseta toinen akseli kiihtyvyyden suuntaan (lattian suuntaan, rinteen suuntaan, hississä pystysuoraan). Silloin tämän akselin suunnassa <f>ΣF = m a</f> ja sitä vastaan kohtisuoraan <f>ΣF = 0</f>.</p>') },
          { type: 'question', q: 't3-q6', id: 't3-q6-blk' },
          { type: 'question', q: 't3-q7', id: 't3-q7-blk' },
          { type: 'question', q: 't3-q8', id: 't3-q8-blk' },
          { type: 'question', q: 't3-q9', id: 't3-q9-blk' },
          { id: 't3-method-h-ex', type: 'h', text: T('From the diagram to the numbers', 'Kuvasta lukuihin') },
          { id: 't3-method-ex1', type: 'text', html: T(
            '<p>With one force along a straight line the equations are short: <f>ΣF = m a</f> gives the acceleration, and the kinematics of topic 2 (<f>v = v_0 + a t</f>, <f>s = ½ (v_0 + v) t</f>) gives the time, speed or distance.</p>',
            '<p>Kun suoralla vaikuttaa yksi voima, yhtälöt ovat lyhyitä: <f>ΣF = m a</f> antaa kiihtyvyyden, ja aiheen 2 kinematiikka (<f>v = v_0 + a t</f>, <f>s = ½ (v_0 + v) t</f>) antaa ajan, nopeuden tai matkan.</p>') },
          { type: 'question', q: 't3-q10', id: 't3-q10-blk' },
          { type: 'question', q: 't3-q11', id: 't3-q11-blk' },
          { id: 't3-method-h-two', type: 'h', text: T('Two bodies in contact', 'Kaksi toisiaan koskettavaa kappaletta') },
          { id: 't3-method-two', type: 'text', html: T(
            '<p>When bodies move together, first treat them as <b>one system</b>: only the external forces count, so <f>a = F/(m_1 + m_2)</f>. Then draw the free-body diagram of <b>one</b> body to find the contact force between them. The contact forces <f>F_{12}</f> and <f>F_{21}</f> are a Newton III pair.</p>',
            '<p>Kun kappaleet liikkuvat yhdessä, käsittele ne ensin <b>yhtenä systeeminä</b>: vain ulkoiset voimat lasketaan, joten <f>a = F/(m_1 + m_2)</f>. Piirrä sitten <b>yhden</b> kappaleen vapaakappalekuvio ja ratkaise niiden välinen kosketusvoima. Kosketusvoimat <f>F_{12}</f> ja <f>F_{21}</f> ovat Newtonin III lain voimapari.</p>') },
          { type: 'question', q: 't3-q12', id: 't3-q12-blk' },
          { type: 'question', q: 't3-q13', id: 't3-q13-blk' },
          { id: 't3-method-h-angle', type: 'h', text: T('A force at an angle', 'Vino voima') },
          { id: 't3-method-angle', type: 'text', html: T(
            '<p>A force at the angle <f>α</f> to the horizontal splits into a horizontal component <f>F cos α</f> and a vertical component <f>F sin α</f>. A push pointing down into the floor increases the support force; a pull pointing up decreases it.</p>',
            '<p>Vaakatasoon nähden kulmassa <f>α</f> oleva voima jakautuu vaakakomponenttiin <f>F cos α</f> ja pystykomponenttiin <f>F sin α</f>. Alaspäin lattiaan suuntautuva työntö kasvattaa tukivoimaa, ylöspäin suuntautuva veto pienentää sitä.</p>') },
          { id: 't3-method-comp', type: 'formula', tex: 'F_x = F cos α,  F_y = F sin α', label: T('Components (α from the horizontal)', 'Komponentit (α vaakatasosta)') },
          { type: 'question', q: 't3-q14', id: 't3-q14-blk' }
        ] },

      // ======================================================== 3.5 friction (p07)
      { id: 't3-friction', title: T('Friction forces', 'Kitka­voimat'),
        blocks: [
          { id: 't3-fr-text', type: 'text', html: T(
            '<p><dfn data-term="friction">Friction forces</dfn> act when bodies move along a surface (sliding, rolling) or through a medium (gas, liquid). Friction opposes the motion: it points opposite to the velocity, <f>F_μ ↓↑ v</f>, and it is proportional to the support force, <f>F_μ ~ N</f>.</p>' +
            '<p>If a body at rest is pulled with a force smaller than the maximum <dfn data-term="staticfr">static friction</dfn>, the friction is exactly as large as needed to balance the pull, and the body stays put. Once it slides, the smaller <dfn data-term="kineticfr">kinetic friction</dfn> acts.</p>',
            '<p><dfn data-term="friction">Kitkavoimat</dfn> vaikuttavat, kun kappaleet liikkuvat pintaa pitkin (liukuminen, vieriminen) tai väliaineessa (kaasu, neste). Kitka vastustaa liikettä: se on nopeudelle vastakkainen, <f>F_μ ↓↑ v</f>, ja verrannollinen tukivoimaan, <f>F_μ ~ N</f>.</p>' +
            '<p>Jos levossa olevaa kappaletta vedetään voimalla, joka on pienempi kuin suurin <dfn data-term="staticfr">lepokitka</dfn>, kitka on juuri niin suuri, että se tasapainottaa vedon, ja kappale pysyy paikallaan. Kun kappale liukuu, vaikuttaa pienempi <dfn data-term="kineticfr">liikekitka</dfn>.</p>') },
          { id: 't3-fr-f', type: 'formula', key: true, tex: 'F_μs ≤ μ_s N,  F_μsm = μ_s N,  F_μk = μ_k N', label: T('Static friction (up to its maximum) and kinetic friction', 'Lepokitka (enintään maksimiarvonsa) ja liikekitka'),
            legend: [['μ_s', T('coefficient of static friction', 'lepokitkakerroin'), ''], ['μ_k', T('coefficient of kinetic friction', 'liikekitkakerroin'), ''], ['N', T('support (normal) force', 'tukivoima'), 'N']] },
          { id: 't3-fr-facts', type: 'list', items: [
            T('<f>μ_k</f> is smaller than <f>μ_s</f>: starting a slide takes more force than keeping it going.', '<f>μ_k</f> on pienempi kuin <f>μ_s</f>: liukumisen aloittaminen vaatii enemmän voimaa kuin sen ylläpitäminen.'),
            T('<f>μ_k</f> is nearly constant at low speeds (about 0.01-10 m/s).', '<f>μ_k</f> on lähes vakio pienillä nopeuksilla (noin 0,01-10 m/s).'),
            T('Both depend on the materials and condition of the contact surfaces.', 'Molemmat riippuvat kosketuspintojen materiaaleista ja laadusta.'),
            T('They do not depend on the (macroscopic) contact area.', 'Ne eivät riipu (makroskooppisesta) kosketuspinta-alasta.')] },
          { id: 't3-friction-lab', type: 'interactive', widget: 'custom', title: T('Friction explorer: break-away and sliding', 'Kitkakokeilu: irtoaminen ja liukuminen'),
            caption: T('Press Run: the pull grows steadily. While the block rests, static friction matches the pull exactly (the rising line). At μ_s N the block breaks away and the friction drops to the kinetic level μ_k N, as on slide p07. Change m, μ_s and μ_k and run again.',
              'Paina Aja: veto kasvaa tasaisesti. Kun kappale on levossa, lepokitka on täsmälleen vedon suuruinen (nouseva suora). Arvolla μ_s N kappale irtoaa ja kitka putoaa liikekitkan tasolle μ_k N, kuten kalvolla s. 07. Muuta m, μ_s ja μ_k ja aja uudestaan.'),
            config: dev(FRIC) },
          { type: 'question', q: 't3-q15', id: 't3-q15-blk' }
        ] },

      // ======================================================== 3.6 friction example 1 (p08) + inclines + exercises
      { id: 't3-friction-ex1', title: T('Friction on a level floor and on an incline', 'Kitka vaaka­suoralla alustalla ja kalte­valla tasolla'),
        blocks: [
          { id: 't3-fe1-left', type: 'example', title: T('Pulling at constant speed (slide p08, left)', 'Veto vakio­nopeudella (kalvo s. 08, vasen)'),
            problem: T('A 55 kg crate is pulled at constant speed along a level floor. The coefficient of friction is 0.43. How large is the pulling force?', '55 kg:n laatikkoa vedetään vakionopeudella vaakasuoraa lattiaa pitkin. Kitkakerroin on 0,43. Kuinka suuri on vetävä voima?'),
            given: ['m = 55 kg', 'μ = 0.43', 'a = 0'],
            steps: [
              T('Free-body diagram: F forward, <f>F_μ</f> backward, N up, mg down. Constant speed, so a = 0 on both axes.', 'Vapaakappalekuvio: F eteenpäin, <f>F_μ</f> taaksepäin, N ylös, mg alas. Nopeus on vakio, joten a = 0 kummallakin akselilla.'),
              { tex: 'ΣF_x = F − F_μ = 0,  ΣF_y = N − m g = 0' },
              { tex: 'F = F_μ = μ N = μ m g' },
              { tex: 'F = 0.43 · 55 kg · 9.81 m/s^2 ≈ 232 N ≈ 230 N' }
            ],
            result: T('F ≈ 230 N', 'F ≈ 230 N') },
          { id: 't3-fe1-h-incline', type: 'h', text: T('The weight on an incline', 'Paino kaltevalla tasolla') },
          { id: 't3-fe1-comp', type: 'text', html: T(
            '<p>On a slope of angle <f>α</f> choose the x axis <b>along the slope</b> and the y axis perpendicular to it. The weight <f>m g</f> then has two components. The angle between <f>m g</f> and the y axis is also <f>α</f> (both lines are turned by <f>α</f> from the vertical and the horizontal), so the side <b>across</b> the slope is the adjacent side (cos) and the side <b>along</b> the slope the opposite side (sin).</p>',
            '<p>Kun rinteen kaltevuuskulma on <f>α</f>, valitse x-akseli <b>rinteen suuntaan</b> ja y-akseli kohtisuoraan sitä vastaan. Painolla <f>m g</f> on silloin kaksi komponenttia. Painon <f>m g</f> ja y-akselin välinen kulma on myös <f>α</f> (kumpikin suora on kiertynyt kulman <f>α</f> pystysuorasta ja vaakasuorasta), joten rinnettä <b>vastaan</b> kohtisuora komponentti on viereinen kateetti (cos) ja rinteen <b>suuntainen</b> vastainen kateetti (sin).</p>') },
          { id: 't3-fe1-compf', type: 'formula', key: true, tex: 'G_x = m g sin α,  G_y = m g cos α,  N = m g cos α', label: T('Weight components on an incline (no other force across the slope)', 'Painon komponentit kaltevalla tasolla (ei muita rinnettä vastaan kohtisuoria voimia)') },
          { id: 't3-fe1-slip', type: 'callout', kind: 'tip', title: T('When does a block start to slide by itself?', 'Milloin kappale alkaa liukua itsestään?'), html: T(
            'Without a pull it slides when <f>m g sin α > μ_s m g cos α</f>, that is when <f>tan α > μ_s</f>. The mass cancels: a heavy and a light block of the same material start to slide at the same angle.',
            'Ilman vetoa kappale liukuu, kun <f>m g sin α > μ_s m g cos α</f> eli kun <f>tan α > μ_s</f>. Massa supistuu: saman materiaalin raskas ja kevyt kappale alkavat liukua samassa kulmassa.') },
          { id: 't3-incline-lab', type: 'interactive', widget: 'incline', title: T('Incline free-body lab', 'Kaltevan tason vapaakappale­laboratorio'),
            caption: T('Set to slide p08: 35°, 55 kg, μ = 0.43. Press Step to walk through the six solving steps on this block, or Release to see what it does. Add a pull F up the slope: friction turns around when the block would move up. Try the Moon: N and the friction shrink, the slip angle does not change.',
              'Asetettu kalvon s. 08 arvoihin: 35°, 55 kg, μ = 0,43. Paina Vaihe ja käy ratkaisun kuusi vaihetta läpi tällä kappaleella, tai Päästä ja katso, mitä kappale tekee. Lisää veto F ylös rinnettä: kitka kääntyy, kun kappale lähtisi ylöspäin. Kokeile Kuuta: N ja kitka pienenevät, liukumiskulma ei muutu.'),
            config: { values: { alpha: 35, m: 55, mus: 0.43, muk: 0.43, F: 0 }, ranges: { F: { max: 1000 } } } },
          { id: 't3-fe1-right', type: 'example', title: T('Pulling up an incline with acceleration (slide p08, right)', 'Veto ylös kaltevaa tasoa kiihtyvästi (kalvo s. 08, oikea)'),
            problem: T('The same 55 kg crate (μ = 0.43) is pulled up a 35° slope with a force parallel to the slope so that it accelerates at 2.0 m/s². Find the friction force and the pulling force.',
              'Samaa 55 kg:n laatikkoa (μ = 0,43) vedetään ylös 35°:n rinnettä rinteen suuntaisella voimalla niin, että sen kiihtyvyys on 2,0 m/s². Laske kitkavoima ja vetävä voima.'),
            given: ['m = 55 kg', 'μ = 0.43', 'α = 35°', 'a = 2.0 m/s²'],
            steps: [
              T('Axes: x up the slope, y out of the slope. The block moves up, so friction points down the slope.', 'Akselit: x ylös rinnettä, y ulos rinteestä. Kappale liikkuu ylös, joten kitka osoittaa alas rinnettä.'),
              { tex: 'ΣF_x = F − F_μ − m g sin α = m a,  ΣF_y = N − m g cos α = 0' },
              { tex: 'F_μ = μ N = μ m g cos α = 0.43 · 55 · 9.81 · cos 35° N ≈ 190 N' },
              { tex: 'F = F_μ + m (g sin α + a) = 190 N + 55 · (9.81 sin 35° + 2.0) N ≈ 610 N' },
              T('The slide uses g = 9.8 and gets 189.9 N and 609 N; the rounded results are the same.', 'Kalvolla käytetään arvoa g = 9,8 ja saadaan 189,9 N ja 609 N; pyöristetyt tulokset ovat samat.')
            ],
            result: T('<f>F_μ</f> ≈ 190 N, F ≈ 610 N', '<f>F_μ</f> ≈ 190 N, F ≈ 610 N') },
          { type: 'question', q: 't3-q16', id: 't3-q16-blk' },
          { type: 'question', q: 't3-q17', id: 't3-q17-blk' },
          { type: 'question', q: 't3-q18', id: 't3-q18-blk' },
          { type: 'question', q: 't3-q19', id: 't3-q19-blk' },
          { type: 'question', q: 't3-q20', id: 't3-q20-blk' },
          { id: 't3-fe1-h-rope', type: 'h', text: T('Pulling with a rope at an angle', 'Veto vinossa olevalla köydellä') },
          { id: 't3-fe1-rope', type: 'text', html: T(
            '<p>A rope pulling upward at the angle <f>α</f> lifts part of the weight: <f>N = m g − F sin α</f>. Less support force means less friction, <f>F_μ = μ_k N</f>. Draw the diagram first, then write the y equation before the x equation.</p>',
            '<p>Kulmassa <f>α</f> ylöspäin vetävä köysi keventää kappaletta: <f>N = m g − F sin α</f>. Pienempi tukivoima tarkoittaa pienempää kitkaa, <f>F_μ = μ_k N</f>. Piirrä ensin kuva ja kirjoita y-yhtälö ennen x-yhtälöä.</p>') },
          { type: 'question', q: 't3-q21', id: 't3-q21-blk' },
          { type: 'question', q: 't3-q22', id: 't3-q22-blk' },
          { id: 't3-fe1-h-more', type: 'h', text: T('Sliding to a stop, towing and driving', 'Pysähtyminen, hinaus ja ajo') },
          { id: 't3-fe1-more', type: 'text', html: T(
            '<p>When the pull stops, kinetic friction alone decelerates the body: <f>m a = −μ_k m g</f>, so <f>a = −μ_k g</f>. A <b>resistance</b> given as a percentage of the weight (rolling resistance, air) is simply a force <f>R = k m g</f> against the motion; on a hill add <f>m g sin α</f> going up and subtract it going down.</p>',
            '<p>Kun veto lakkaa, liikekitka yksin hidastaa kappaletta: <f>m a = −μ_k m g</f>, joten <f>a = −μ_k g</f>. Prosentteina painosta annettu <b>vastus</b> (vierintä, ilma) on yksinkertaisesti liikettä vastustava voima <f>R = k m g</f>; mäessä lisää <f>m g sin α</f> ylös mentäessä ja vähennä se alas mentäessä.</p>') },
          { type: 'question', q: 't3-q23', id: 't3-q23-blk' },
          { type: 'question', q: 't3-q24', id: 't3-q24-blk' },
          { type: 'question', q: 't3-q25', id: 't3-q25-blk' }
        ] },

      // ======================================================== 3.7 rope friction, rolling, drag (p09)
      { id: 't3-friction-other', title: T('Rope friction, rolling resistance and air drag', 'Köysi­kitka, vierintä­vastus ja ilman­vastus'),
        blocks: [
          { id: 't3-fo-h-rope', type: 'h', text: T('Rope (belt) friction', 'Köysikitka') },
          { id: 't3-fo-rope', type: 'text', html: T(
            '<p>A rope or belt over a drum or pulley is held by friction along the whole contact. The tension changes a little at every bit of the contact, so the ratio of the two end forces grows <b>exponentially</b> with the contact (wrap) angle <f>θ</f> (in radians). A sailor holds a large load with a small pull by winding the rope a few turns around a bollard.</p>',
            '<p>Rummun tai pyörän yli kulkevaa köyttä tai hihnaa pitää kitka koko kosketusmatkalla. Jännitysvoima muuttuu hieman jokaisessa kosketuksen kohdassa, joten köyden päiden voimien suhde kasvaa <b>eksponentiaalisesti</b> kosketuskulman <f>θ</f> (radiaaneina) mukana. Merimies pitää suurta kuormaa pienellä vedolla kiertämällä köyden muutaman kerran pollarin ympäri.</p>') },
          { id: 't3-fo-rope-f', type: 'formula', key: true, tex: '{F_1}/{F_2} = e^{μθ}', label: T('Rope friction (F_1 the larger force)', 'Köysikitka (F_1 suurempi voima)'),
            legend: [['θ', T('contact (wrap) angle', 'kosketuskulma'), 'rad'], ['μ', T('coefficient of friction between rope and drum', 'köyden ja rummun välinen kitkakerroin'), ''], ['F_1, F_2', T('rope forces at the two ends', 'jännitysvoimat köyden päissä'), 'N']] },
          { id: 't3-capstan', type: 'interactive', widget: 'custom', title: T('Rope on a drum', 'Köysi rummulla'),
            caption: T('Choose the wrap angle and μ, then wind the rope on. The rope gets thicker where its tension is larger, and the F_1 arrow grows exponentially with the angle: one extra turn with μ = 0.3 already multiplies the holding force by <f>e^{0.3 · 2π}</f> ≈ 6.6.',
              'Valitse kosketuskulma ja μ ja kierrä köysi rummulle. Köysi paksunee siellä, missä sen jännitysvoima on suurempi, ja F_1-nuoli kasvaa eksponentiaalisesti kulman mukana: yksi lisäkierros arvolla μ = 0,3 kertoo pitovoiman jo luvulla <f>e^{0,3 · 2π}</f> ≈ 6,6.'),
            config: dev(CAP) },
          { id: 't3-fo-h-roll', type: 'h', text: T('Rolling resistance', 'Vierintävastus') },
          { id: 't3-fo-roll-cols', type: 'columns', cols: [
            [{ id: 't3-fo-roll', type: 'text', html: T(
              '<p>A rolling wheel is slowed by <dfn data-term="rolling">rolling resistance</dfn>. The tyre and the ground deform, so the support force acts a small distance <f>f</f> in front of the vertical through the axle. The coefficient of rolling resistance is <f>μ_R = f/R</f>, where <f>R</f> is the radius of the wheel, and the resistive force is <f>F_R = μ_R N</f>.</p>',
              '<p>Vierivää pyörää jarruttaa <dfn data-term="rolling">vierintävastus</dfn>. Rengas ja alusta painuvat, joten tukivoima vaikuttaa pienen matkan <f>f</f> akselin kautta kulkevan pystysuoran etupuolella. Vierintävastuskerroin on <f>μ_R = f/R</f>, missä <f>R</f> on pyörän säde, ja vastusvoima on <f>F_R = μ_R N</f>.</p>') },
              { id: 't3-fo-roll-f', type: 'formula', tex: 'μ_R = {f}/{R},  F_R = μ_R N', label: T('Rolling resistance', 'Vierintävastus') }],
            [{ id: 't3-fo-roll-fig', type: 'figure', svg: FIG_ROLL, caption: T('Wheel of radius R; f is the distance of the contact force in front of the axle line.', 'Pyörä, jonka säde on R; f on kosketusvoiman etäisyys akselin pystysuoran etupuolella.'),
              alt: T('Wheel with radius R and the offset f', 'Pyörä, säde R ja etäisyys f') }]] },
          { id: 't3-fo-h-drag', type: 'h', text: T('Air drag', 'Ilmanvastus') },
          { id: 't3-fo-drag', type: 'text', html: T(
            '<p>A body moving through a medium such as air meets the opposing <dfn data-term="drag">drag force</dfn>. It grows with the square of the speed and with the cross-section area <f>A</f> perpendicular to the velocity. The <dfn data-term="dragc">drag coefficient</dfn> <f>C</f> depends on the shape.</p>',
            '<p>Väliaineessa, kuten ilmassa, liikkuvaan kappaleeseen vaikuttaa liikettä vastustava <dfn data-term="drag">väliaineen vastus</dfn>. Se kasvaa nopeuden neliön ja nopeutta vastaan kohtisuoran poikkipinta-alan <f>A</f> mukana. <dfn data-term="dragc">Muotokerroin</dfn> <f>C</f> riippuu kappaleen muodosta.</p>') },
          { id: 't3-fo-drag-f', type: 'formula', key: true, tex: 'F_μ = ½ C ρ A v^2', label: T('Air drag', 'Ilmanvastus'),
            legend: [['C', T('drag coefficient', 'muotokerroin'), ''], ['ρ', T('density of air, 1.29', 'ilman tiheys, 1,29'), 'kg/m³'], ['A', T('cross-section area perpendicular to v', 'nopeutta vastaan kohtisuora pinta-ala'), 'm²'], ['v', T('speed', 'nopeus'), 'm/s']] },
          { id: 't3-fo-drag-t', type: 'table', caption: T('Drag coefficients (slide p09)', 'Muotokertoimia (kalvo s. 09)'),
            head: [T('Shape', 'Muoto'), { tex: 'C' }],
            rows: [[T('car (side view)', 'auto (sivulta)'), '0.2-0.4'], [T('ball', 'pallo'), '0.5'], [T('disc / cylinder face-on', 'kiekko / sylinteri päätypinta edellä'), '1.0'], [T('streamlined (teardrop)', 'virtaviivainen (pisara)'), '0.06']] },
          { type: 'question', q: 't3-q26', id: 't3-q26-blk' }
        ] },

      // ======================================================== 3.8 friction example 2 (p10)
      { id: 't3-friction-ex2', title: T('Belt on a pulley and terminal speed', 'Hihna pyörällä ja raja­nopeus'),
        blocks: [
          { id: 't3-fe2-belt', type: 'example', title: T('Belt on a pulley (slide p10)', 'Hihna pyörällä (kalvo s. 10)'),
            problem: T('A belt touches a pulley over a quarter turn. μ = 0.95 and the slack side pulls with F_2 = 210 N. What is the largest F_1 if the belt does not slip?', 'Hihna koskettaa pyörää neljänneskierroksen matkalta. μ = 0,95 ja löysä puoli vetää voimalla F_2 = 210 N. Mikä on suurin F_1, jolla hihna ei luista?'),
            given: ['θ = π/2 rad', 'μ = 0.95', 'F_2 = 210 N'],
            steps: [{ tex: 'F_1 = F_2 e^{μθ}' }, { tex: 'F_1 = 210 N · e^{0.95 · π/2} = 210 N · 4.45 ≈ 934 N ≈ 930 N' }],
            result: T('F_1 ≈ 930 N', 'F_1 ≈ 930 N') },
          { id: 't3-fe2-term', type: 'example', title: T('Terminal speed of a ball (slide p10)', 'Pallon rajanopeus (kalvo s. 10)'),
            problem: T('A ball (m = 0.75 kg, d = 22 cm, C = 0.50) falls freely through air. Estimate its terminal speed.', 'Pallo (m = 0,75 kg, d = 22 cm, C = 0,50) putoaa vapaasti ilmassa. Arvioi sen rajanopeus.'),
            given: ['m = 0.75 kg', 'd = 22 cm', 'C = 0.50', 'ρ = 1.29 kg/m³'],
            steps: [
              T('At the terminal speed the ball no longer accelerates: the drag up equals the weight down (+ up).', 'Rajanopeudella pallo ei enää kiihdy: ylöspäin vaikuttava vastus on yhtä suuri kuin alaspäin vaikuttava paino (+ ylös).'),
              { tex: 'ΣF = F_μ − m g = 0  ⇒  ½ C ρ A v_r^2 = m g' },
              { tex: 'v_r = sqrt{{2 m g}/{C ρ A}},  A = π (0.11 m)^2 = 0.0380 m^2' },
              { tex: 'v_r = sqrt{{2 · 0.75 · 9.81}/{0.50 · 1.29 · 0.0380}} m/s ≈ 24 m/s' }
            ],
            result: T('v_r ≈ 24 m/s (24.5 m/s; the slide prints 24.48 m/s with g = 9.8)', 'v_r ≈ 24 m/s (24,5 m/s; kalvolla 24,48 m/s arvolla g = 9,8)') },
          { id: 't3-terminal', type: 'interactive', widget: 'custom', title: T('Drag and terminal speed', 'Ilmanvastus ja rajanopeus'),
            caption: T('Pick a shape (or set C), the mass and the diameter, then Drop. The drag arrow grows with v² until it equals mg; the v(t) curve bends away from free fall (dashed) and levels off at v_r. The grey curve is the 0.75 kg ball of the slide example: a streamlined body ends far above it, a disc face-on far below.',
              'Valitse muoto (tai säädä C), massa ja halkaisija ja paina Pudota. Vastusnuoli kasvaa v²:n mukana, kunnes se on yhtä suuri kuin mg; v(t)-käyrä kaartuu pois vapaan pudotuksen suorasta (katkoviiva) ja tasaantuu arvoon v_r. Harmaa käyrä on kalvon esimerkin 0,75 kg:n pallo: virtaviivainen kappale päätyy paljon sen yläpuolelle, lappeellaan oleva kiekko paljon alapuolelle.'),
            config: dev(DRAG) },
          { type: 'question', q: 't3-q27', id: 't3-q27-blk' }
        ] },

      // ======================================================== 3.9 statics: equilibrium (p11)
      { id: 't3-equilibrium', title: T('Statics: equilibrium and centre of gravity', 'Statiikka: tasapaino ja paino­piste'),
        blocks: [
          { id: 't3-eq-text', type: 'text', html: T(
            '<p>A body is in <dfn data-term="equilibrium">static equilibrium</dfn> when it stays at rest: its acceleration and angular acceleration are zero, so the resultant force and the total moment on it are zero. A body at rest can be in three kinds of equilibrium, told apart by what happens to its potential energy when it is moved gently:</p>',
            '<p>Kappale on <dfn data-term="equilibrium">staattisessa tasapainossa</dfn>, kun se pysyy levossa: sen kiihtyvyys ja kulmakiihtyvyys ovat nolla, joten siihen vaikuttava kokonaisvoima ja kokonaismomentti ovat nolla. Levossa oleva kappale voi olla kolmenlaisessa tasapainossa. Ne erotetaan sen mukaan, miten potentiaalienergia muuttuu, kun kappaletta siirretään varovasti:</p>') },
          { id: 't3-eq-types', type: 'list', items: [
            T('<b>Stable:</b> the potential energy increases (ball in a bowl); the body returns.', '<b>Stabiili:</b> potentiaalienergia kasvaa (pallo kuopassa); kappale palaa takaisin.'),
            T('<b>Labile (unstable):</b> the potential energy decreases (ball on top of a hill); the body moves away.', '<b>Labiili:</b> potentiaalienergia pienenee (pallo kummun päällä); kappale lähtee pois.'),
            T('<b>Indifferent (neutral):</b> the potential energy stays the same (ball on a flat floor); the body stays where it is put.', '<b>Indifferentti (epämääräinen):</b> potentiaalienergia pysyy samana (pallo tasaisella lattialla); kappale jää siihen, mihin se siirretään.')] },
          { id: 't3-equil-ball', type: 'interactive', widget: 'custom', title: T('Ball on a landscape', 'Pallo maastossa'),
            caption: T('Shape the landscape from a hill to a bowl, then nudge the ball or drag it aside and let go. The lower graph is its potential energy: in a bowl the ball rolls back to the bottom, on a hill it rolls away, on the flat it stops wherever it is.',
              'Muotoile maasto kummusta kuopaksi ja tönäise palloa tai vedä se sivuun ja päästä irti. Alempi kuvaaja on pallon potentiaalienergia: kuopassa pallo vierii takaisin pohjalle, kummulla se vierii pois ja tasaisella se pysähtyy mihin tahansa.'),
            config: dev(BALL) },
          { id: 't3-eq-cg', type: 'text', html: T(
            '<p>A body hanging below its support point (a ball on a wire) is in stable equilibrium: its <dfn data-term="cg">centre of gravity</dfn> (CG) is below the support and rises when the body swings. A body standing on a base stays upright as long as the <b>vertical line through its centre of gravity hits the support surface</b>. Tilted a little, the line still hits the base and the body rights itself; tilted so far that the line misses the base, it overturns.</p>',
            '<p>Tukipisteensä alapuolella riippuva kappale (pallo langassa) on stabiilissa tasapainossa: sen <dfn data-term="cg">painopiste</dfn> on tukipisteen alapuolella ja nousee, kun kappale heilahtaa. Alustallaan seisova kappale pysyy pystyssä niin kauan kuin <b>painopisteen kautta kulkeva pystysuora osuu tukipintaan</b>. Hieman kallistettuna suora osuu yhä tukipintaan ja kappale palautuu; niin paljon kallistettuna, että suora ohittaa tukipinnan, kappale kaatuu.</p>') },
          { id: 't3-fridge', type: 'interactive', widget: 'custom', title: T('Tipping refrigerator', 'Kaatuva jääkaappi'),
            caption: T('The refrigerator is 1.80 m high and 0.70 m deep. Tilt it and let go. Watch the dashed vertical through the centre of gravity: inside the red base it falls back, past the edge it overturns. Raise the centre of gravity (a full top shelf) and the critical angle φ_c gets smaller.',
              'Jääkaappi on 1,80 m korkea ja 0,70 m syvä. Kallista jääkaappia ja päästä irti. Seuraa painopisteen kautta kulkevaa katkoviivaa: punaisen tukipinnan kohdalla kaappi palautuu, reunan ohi mentyään se kaatuu. Nosta painopistettä (täysi ylähylly), niin kriittinen kulma φ_c pienenee.'),
            config: dev(FRIDGE) },
          { type: 'question', q: 't3-q28', id: 't3-q28-blk' }
        ] },

      // ======================================================== 3.10 balancing conditions (p12)
      { id: 't3-balance', title: T('Balancing conditions', 'Tasapaino­ehdot'),
        blocks: [
          { id: 't3-bal-text', type: 'text', html: T('<p>A body is in static equilibrium when both conditions hold:</p>', '<p>Kappale on staattisessa tasapainossa, kun molemmat ehdot ovat voimassa:</p>') },
          { id: 't3-bal-f1', type: 'formula', key: true, tex: 'ΣF_x = 0,  ΣF_y = 0,  ΣF_z = 0', label: T('1. The vector sum of the forces is zero (no acceleration along any axis)', '1. Voimien vektorisumma on nolla (ei kiihtyvyyttä minkään akselin suuntaan)') },
          { id: 't3-bal-f2', type: 'formula', key: true, tex: 'ΣM_A = 0', label: T('2. The total moment about any axis A is zero (no angular acceleration)', '2. Kokonaismomentti minkä tahansa akselin A suhteen on nolla (ei kulmakiihtyvyyttä)') },
          // (extra) the slides use moments without defining them; topic 6 treats torque in full
          { id: 't3-bal-moment', type: 'callout', kind: 'info', title: T('Moment of a force', 'Voiman momentti'), html: T(
            'The <dfn data-term="moment">moment</dfn> of a force about an axis is <f>M = F r</f>, the force times its <b>lever arm</b> <f>r</f> (the perpendicular distance from the axis to the line of the force). Give turning one way the + sign and the other way −. Choose the axis at an unknown force: its moment is zero there, so it drops out of the equation.',
            'Voiman <dfn data-term="moment">momentti</dfn> akselin suhteen on <f>M = F r</f>, voima kertaa sen <b>varsi</b> <f>r</f> (kohtisuora etäisyys akselista voiman vaikutussuoraan). Anna toiseen suuntaan kiertävälle merkki + ja toiseen −. Valitse akseli tuntemattoman voiman kohdalle: sen momentti on siellä nolla, joten se putoaa yhtälöstä pois.') },
          { id: 't3-bal-fig', type: 'figure', svg: FIG_SPRINGS,
            caption: T('Static equilibria of mechanical systems (slide p12): a cart held by a spring, a hinged bar held by a spring, a block hanging on a spring.', 'Mekaanisten systeemien staattisia tasapainoja (kalvo s. 12): jousen pitämä vaunu, jousen kannattama nivelöity palkki ja jousessa riippuva kappale.'),
            alt: T('Three spring-mass systems', 'Kolme jousi-massasysteemiä') },
          { id: 't3-bal-list', type: 'list', items: [
            T('In a system in static equilibrium, all internal and external forces and moments are in balance.', 'Staattisessa tasapainossa olevassa systeemissä kaikki sisäiset ja ulkoiset voimat ja momentit ovat tasapainossa.'),
            T('In spring-mass systems the springs can be at their rest length or stretched in equilibrium.', 'Jousi-massasysteemeissä jouset voivat tasapainossa olla lepopituudessaan tai venyneinä.'),
            T('Buildings, bridges and towers are designed to be in static balance; engineers must find the forces and stresses in every part.', 'Rakennukset, sillat ja tornit suunnitellaan staattiseen tasapainoon; insinöörien on selvitettävä voimat ja jännitykset jokaisessa osassa.')] }
        ] },

      // ======================================================== 3.11 statics examples (p13, ex 3.39)
      { id: 't3-statics-ex', title: T('Statics examples: loaded bar and ladder', 'Statiikan esimerkit: kuormitettu palkki ja tikapuut'),
        blocks: [
          { id: 't3-se-bar', type: 'example', title: T('Loaded bar on two supports (slide p13)', 'Kuormitettu palkki kahdella tuella (kalvo s. 13)'),
            problem: T('A bar of length l = 4.0 m and mass m = 140 kg rests on supports at its ends A and B. A load of mass M = 220 kg lies on it 1.0 m from A. Find the support forces F_A and F_B.',
              'Palkki, jonka pituus on l = 4,0 m ja massa m = 140 kg, lepää päissään olevien tukien A ja B varassa. Sen päällä on 1,0 m:n päässä A:sta kuorma, jonka massa on M = 220 kg. Laske tukivoimat F_A ja F_B.'),
            given: ['l = 4.0 m', 'm = 140 kg', 'M = 220 kg', 'l_{A-Mg} = 1.0 m', 'l_{A-mg} = 2.0 m'],
            steps: [
              T('Free-body diagram: F_A and F_B up, Mg down at 1.0 m, the bar\'s weight mg down at its middle (2.0 m). No forces along x.', 'Vapaakappalekuvio: F_A ja F_B ylös, Mg alas 1,0 m:n kohdalla, palkin paino mg alas sen keskellä (2,0 m). x-suuntaisia voimia ei ole.'),
              { tex: 'ΣF_y = F_A + F_B − M g − m g = 0' },
              T('Moments about A (F_A has no moment there; counter-clockwise +):', 'Momentit A:n suhteen (F_A:lla ei ole siellä momenttia; vastapäivään +):'),
              { tex: 'ΣM_A = −M g · 1.0 m − m g · 2.0 m + F_B · 4.0 m = 0' },
              { tex: 'F_B = {220 · 9.81 · 1.0 + 140 · 9.81 · 2.0}/{4.0} N ≈ 1230 N' },
              { tex: 'F_A = (M + m) g − F_B ≈ 3532 N − 1226 N ≈ 2310 N' },
              T('With g = 9.8 the slide gets 1225 N and 2303 N and prints 1200 N and 2300 N.', 'Arvolla g = 9,8 kalvolla saadaan 1225 N ja 2303 N, ja vastauksiksi on merkitty 1200 N ja 2300 N.')
            ],
            result: T('F_A ≈ 2.3 kN, F_B ≈ 1.2 kN', 'F_A ≈ 2,3 kN, F_B ≈ 1,2 kN') },
          { id: 't3-bar-lab', type: 'interactive', widget: 'custom', title: T('Loaded bar: drag the load', 'Kuormitettu palkki: vedä kuormaa'),
            caption: T('Drag the load M along the bar (or slide it from A to B). The support nearer to the load carries more; with the load exactly in the middle F_A = F_B. The sum F_A + F_B always equals the total weight.',
              'Vedä kuormaa M palkkia pitkin (tai liu’uta se A:sta B:hen). Kuormaa lähempänä oleva tuki kantaa enemmän; kun kuorma on täsmälleen keskellä, F_A = F_B. Summa F_A + F_B on aina sama kuin kokonaispaino.'),
            config: dev(BAR) },
          { type: 'question', q: 't3-q29', id: 't3-q29-blk' },
          { id: 't3-se-h-ladder', type: 'h', text: T('Ladder against a smooth wall (exercise 3.39)', 'Tikapuut sileää seinää vasten (tehtävä 3.39)') },
          { id: 't3-se-ladder', type: 'text', html: T(
            '<p>Four forces act on the ladder: its weight <f>G</f> at the middle, the floor\'s support force <f>N</f> and friction <f>F_μ</f> at the foot, and the push <f>N_w</f> of the smooth wall at the top (only perpendicular to the wall, no friction). Forces: <f>N = G</f> and <f>F_μ = N_w</f>. Moments about the foot give how large <f>N_w</f>, and so the friction, must be. The ladder stands only if this friction is at most <f>μ N</f>.</p>',
            '<p>Tikapuihin vaikuttaa neljä voimaa: paino <f>G</f> keskellä, lattian tukivoima <f>N</f> ja kitka <f>F_μ</f> alapäässä sekä sileän seinän työntö <f>N_w</f> yläpäässä (vain seinää vastaan kohtisuoraan, ei kitkaa). Voimat: <f>N = G</f> ja <f>F_μ = N_w</f>. Momentit alapään suhteen kertovat, kuinka suuri <f>N_w</f> ja siis kitka on oltava. Tikapuut pysyvät pystyssä vain, jos tämä kitka on enintään <f>μ N</f>.</p>') },
          { id: 't3-ladder', type: 'interactive', widget: 'custom', title: T('Ladder: will it slip?', 'Tikapuut: liukuvatko?'),
            caption: T('Lower the angle and watch the friction needed at the foot grow (top bars: the needed <f>F_μ</f> against the available μN). When it exceeds μN the ladder slips: press Let go. Change μ and find the smallest safe angle.',
              'Pienennä kulmaa ja seuraa, kuinka alapäässä tarvittava kitka kasvaa (ylhäällä palkit: tarvittava <f>F_μ</f> ja käytettävissä oleva μN). Kun se ylittää arvon μN, tikapuut liukuvat: paina Päästä irti. Muuta μ:tä ja etsi pienin turvallinen kulma.'),
            config: dev(LAD) },
          { type: 'question', q: 't3-q30', id: 't3-q30-blk' }
        ] }
    ],

    questions: [
      // ---- 3.1
      { id: 't3-q1', mode: 'practice', type: 'mc', difficulty: 1,
        prompt: T('A car drives along a straight road at a constant velocity of 80 km/h. What can you say about the resultant force on it?', 'Auto ajaa suoraa tietä vakionopeudella 80 km/h. Mitä voit sanoa siihen vaikuttavasta kokonaisvoimasta?'),
        options: [{ id: 'a', html: T('It points forward, in the direction of motion.', 'Se osoittaa eteenpäin, liikkeen suuntaan.') }, { id: 'b', html: T('It equals the weight of the car.', 'Se on yhtä suuri kuin auton paino.') },
                  { id: 'c', html: T('It is zero.', 'Se on nolla.') }, { id: 'd', html: T('It equals m v.', 'Se on m v.') }],
        hints: [T('Which of Newton\'s laws talks about constant velocity?', 'Mikä Newtonin laeista käsittelee vakionopeutta?')] },
      { id: 't3-q2', mode: 'practice', type: 'fill', difficulty: 1,
        prompt: T('Fill in the kind of quantity (one word each).', 'Täydennä suureen laji (yksi sana kumpaankin).'),
        text: T('Force has a size and a direction, so it is a [[a]] quantity. Mass has only a size, so it is a [[b]] quantity.', 'Voimalla on suuruus ja suunta, joten se on [[a]]suure. Massalla on vain suuruus, joten se on [[b]]suure.'),
        fields: [{ id: 'a', kind: 'text' }, { id: 'b', kind: 'text' }],
        hints: [T('One kind is drawn as an arrow, the other is just a number with a unit.', 'Toinen laji piirretään nuolena, toinen on pelkkä luku ja yksikkö.')] },
      { id: 't3-q3', mode: 'practice', type: 'numeric', difficulty: 1,
        prompt: T('The mass of a body is 15.0 kg. Calculate the weight (gravity force) acting on it. (Exercise 31)', 'Kappaleen massa on 15,0 kg. Laske siihen vaikuttava painovoima. (Tehtävä 31)'),
        fields: [{ id: 'G', tex: 'G', unit: 'N' }],
        hints: [T('Weight = mass × gravitational acceleration, g = 9.81 m/s².', 'Painovoima = massa × putoamiskiihtyvyys, g = 9,81 m/s².')] },
      // ---- 3.2
      { id: 't3-q4', mode: 'practice', type: 'numeric', difficulty: 1,
        prompt: T('A resultant force of 45 N acts on a body of mass 12.0 kg. Calculate the acceleration of the body. (Exercise 30)', 'Kappaleeseen, jonka massa on 12,0 kg, vaikuttaa 45 N:n kokonaisvoima. Laske kappaleen kiihtyvyys. (Tehtävä 30)'),
        fields: [{ id: 'a', tex: 'a', unit: 'm/s²' }],
        hints: [T('Solve ΣF = m a for a.', 'Ratkaise a yhtälöstä ΣF = m a.')] },
      // ---- 3.3
      { id: 't3-q5', mode: 'practice', type: 'mc', difficulty: 2,
        prompt: T('A book rests on a table. The table pushes the book up with the support force N. Which force is the counterforce of N (Newton III)?', 'Kirja on pöydällä. Pöytä työntää kirjaa ylöspäin tukivoimalla N. Mikä voima on N:n vastavoima (Newtonin III laki)?'),
        options: [{ id: 'a', html: T('The weight of the book', 'Kirjan paino') }, { id: 'b', html: T('The force with which the book presses down on the table', 'Voima, jolla kirja painaa pöytää alaspäin') },
                  { id: 'c', html: T('The weight of the table', 'Pöydän paino') }, { id: 'd', html: T('The floor\'s support force on the table legs', 'Lattian tukivoima pöydän jalkoihin') }],
        hints: [T('A force and its counterforce act between the same two bodies, but each on a different one of them.', 'Voima ja vastavoima vaikuttavat samojen kahden kappaleen välillä, mutta kumpikin eri kappaleeseen.')] },
      // ---- 3.4 FBD ladder
      { id: 't3-q6', mode: 'practice', type: 'multi', difficulty: 1,
        prompt: T('A crate is pulled at constant speed along a level floor with a horizontal rope. Which forces act ON the crate? Select all.', 'Laatikkoa vedetään vakionopeudella vaakasuoraa lattiaa pitkin vaakasuoralla köydellä. Mitkä voimat vaikuttavat laatikkoon? Valitse kaikki.'),
        options: [{ id: 'g', html: T('its weight mg', 'sen paino mg') }, { id: 'v', html: T('a force of motion forward', 'liikkeen voima eteenpäin') },
                  { id: 'n', html: T('the support force of the floor', 'lattian tukivoima') }, { id: 'p', html: T('the crate\'s push on the floor', 'laatikon paine lattiaa vasten') },
                  { id: 't', html: T('the pull of the rope', 'köyden veto') }, { id: 'i', html: T('inertia', 'hitaus') },
                  { id: 'f', html: T('friction from the floor', 'lattian kitka') }],
        hints: [T('Weight, plus one force from each thing that touches the crate. The floor touches it in two ways: across and along the surface.', 'Paino sekä yksi voima jokaiselta laatikkoa koskettavalta. Lattia koskettaa kahdella tavalla: pintaa vastaan ja pinnan suuntaan.')] },
      { id: 't3-q7', mode: 'practice', type: 'fbd', difficulty: 2,
        prompt: T('Draw the free-body diagram of the crate of the previous question (pulled to the right at constant speed). Give each force acting on it a direction, set the rest to "not acting", and set the arrow lengths so that the compared pairs are right.',
          'Piirrä edellisen tehtävän laatikon vapaakappalekuvio (vedetään oikealle vakionopeudella). Anna jokaiselle siihen vaikuttavalle voimalle suunta, merkitse muut "ei vaikuta" ja säädä nuolten pituudet niin, että verrattavat parit ovat oikein.'),
        hints: [T('Constant velocity means ΣF = 0 along each axis.', 'Vakionopeus tarkoittaa, että ΣF = 0 kummankin akselin suunnassa.'),
                T('The crate\'s push on the floor acts on the floor, not on the crate.', 'Laatikon paine lattiaa vasten vaikuttaa lattiaan, ei laatikkoon.')],
        widget: { name: 'fbd', config: { scene: 'floor',
          forces: [{ id: 'G', tex: 'mg' }, { id: 'N', tex: 'N' }, { id: 'F', tex: 'F' }, { id: 'Fm', tex: 'F_μ' },
                   { id: 'Fv', label: T('force of motion', 'liikkeen voima') }, { id: 'Np', label: T('crate\'s push on the floor N′', 'laatikon paine lattiaan N′') }],
          compare: [['F', 'Fm'], ['N', 'G']] } } },
      { id: 't3-q8', mode: 'practice', type: 'fbd', difficulty: 2,
        prompt: T('An elevator car hangs on its cable and starts upward with an acceleration of 4.0 m/s². Draw the free-body diagram of the car and compare the arrow lengths.',
          'Hissikori riippuu vaijerissaan ja lähtee ylöspäin 4,0 m/s²:n kiihtyvyydellä. Piirrä korin vapaakappalekuvio ja vertaa nuolten pituuksia.'),
        hints: [T('The car touches only its cable.', 'Kori koskettaa vain vaijeriaan.'),
                T('The acceleration is upward, so the resultant force must point upward too.', 'Kiihtyvyys on ylöspäin, joten kokonaisvoimankin on osoitettava ylöspäin.')],
        widget: { name: 'fbd', config: { scene: 'hanging',
          forces: [{ id: 'T', tex: 'T' }, { id: 'G', tex: 'mg' }, { id: 'Fa', label: T('force of acceleration ma', 'kiihtyvyyden voima ma') }, { id: 'N', tex: 'N' }],
          compare: [['T', 'G']] } } },
      { id: 't3-q9', mode: 'practice', type: 'order', difficulty: 1,
        prompt: T('Put the six steps of solving a force problem in order.', 'Järjestä voimatehtävän ratkaisun kuusi vaihetta oikeaan järjestykseen.'),
        items: [{ id: 's5', html: T('Equations along the axes', 'Yhtälöt akselien suunnassa') }, { id: 's2', html: T('Free-body diagram', 'Vapaakappalekuvio') },
                { id: 's6', html: T('Solve the unknowns', 'Tuntemattomien ratkaisu') }, { id: 's1', html: T('Situation sketch', 'Tilannekuva') },
                { id: 's4', html: T('Coordinate system', 'Koordinaatiston valinta') }, { id: 's3', html: T('Force diagram (magnitudes)', 'Voimakuva (suuruudet)') }],
        hints: [T('You cannot write equations before you know the forces and the axes.', 'Yhtälöitä ei voi kirjoittaa ennen kuin voimat ja akselit tunnetaan.')] },
      { id: 't3-q10', mode: 'practice', type: 'numeric', difficulty: 1,
        prompt: T('A force of 12.5 N acts on a body of mass 8.3 kg for 5.0 s (it is the only horizontal force; the body starts from rest). Calculate a) the acceleration and b) the speed of the body at the end of the push. (Exercise 1, slide p06)',
          'Kappaleeseen, jonka massa on 8,3 kg, vaikuttaa 12,5 N:n voima 5,0 s:n ajan (se on ainoa vaakasuora voima; kappale lähtee levosta). Laske a) kiihtyvyys ja b) kappaleen nopeus työnnön lopussa. (Tehtävä 1, kalvo s. 06)'),
        fields: [{ id: 'a', tex: 'a', unit: 'm/s²' }, { id: 'v', tex: 'v', unit: 'm/s' }],
        hints: [T('a) The time is not needed for the acceleration.', 'a) Kiihtyvyyteen ei tarvita aikaa.'), T('b) Uniform acceleration from rest: v = a t.', 'b) Tasaisesti kiihtyvä liike levosta: v = a t.')] },
      { id: 't3-q11', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('A bullet of mass 1.8 g flying at 360 m/s hits soft wood and stops after penetrating 10 cm. Assume a uniform deceleration. a) How long does the penetration take? b) How large is the braking force on the bullet? (Exercise 3.2)',
          '1,8 g:n luoti, jonka nopeus on 360 m/s, osuu pehmeään puuhun ja pysähtyy tunkeuduttuaan 10 cm. Oleta hidastuvuus tasaiseksi. a) Kuinka kauan tunkeutuminen kestää? b) Kuinka suuri on luotiin vaikuttava jarruttava voima? (Tehtävä 3.2)'),
        fields: [{ id: 't', tex: 't', unit: 's' }, { id: 'F', tex: 'F', unit: 'N' }], tol: 0.03,
        hints: [T('a) With uniform deceleration the average speed is (v_0 + 0)/2, and s = average speed × t.', 'a) Tasaisessa hidastuvuudessa keskinopeus on (v_0 + 0)/2, ja s = keskinopeus × t.'),
                T('b) a = Δv/Δt, then F = m a. Use the mass in kilograms.', 'b) a = Δv/Δt ja sitten F = m a. Käytä massaa kilogrammoina.')] },
      { id: 't3-q12', mode: 'practice', type: 'fbd', difficulty: 2,
        prompt: T('Two blocks stand side by side on a frictionless floor. A hand pushes the left block m_1 to the right, and m_1 pushes the right block m_2. Draw the free-body diagram of <b>m_2 only</b>.',
          'Kaksi kappaletta on vierekkäin kitkattomalla lattialla. Käsi työntää vasenta kappaletta m_1 oikealle, ja m_1 työntää oikeanpuoleista kappaletta m_2. Piirrä <b>vain m_2:n</b> vapaakappalekuvio.'),
        hints: [T('Which bodies touch m_2? The hand does not.', 'Mitkä kappaleet koskettavat m_2:ta? Käsi ei koske.'),
                T('F_{21} is the force on m_1; it belongs in the diagram of m_1.', 'F_{21} vaikuttaa m_1:een; se kuuluu m_1:n kuvaan.')],
        widget: { name: 'fbd', config: { scene: 'floor',
          forces: [{ id: 'G', tex: 'm_2 g', color: '--f-weight' }, { id: 'N', tex: 'N' }, { id: 'F12', tex: 'F_{12}', color: '--f-applied' }, { id: 'F', label: T('push of the hand F', 'käden työntö F') },
                   { id: 'Fm', tex: 'F_μ' }, { id: 'F21', tex: 'F_{21}', color: '--c-4' }],
          compare: [['N', 'G']] } } },
      { id: 't3-q13', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('Blocks m_1 = 3.7 kg and m_2 = 1.6 kg are pushed along a frictionless horizontal floor by a horizontal force F = 14 N acting on m_1 (m_1 pushes m_2 in front of it). Calculate a) the acceleration of the blocks and b) the force with which m_1 pushes m_2. (Exercise 3.4)',
          'Kappaleita m_1 = 3,7 kg ja m_2 = 1,6 kg työnnetään kitkattomalla vaakasuoralla alustalla vaakasuuntaisella voimalla F = 14 N, joka vaikuttaa m_1:een (m_1 työntää m_2:ta edellään). Laske a) kappaleiden kiihtyvyys ja b) voima, jolla m_1 työntää m_2:ta. (Tehtävä 3.4)'),
        fields: [{ id: 'a', tex: 'a', unit: 'm/s²' }, { id: 'F12', tex: 'F_{12}', unit: 'N' }],
        hints: [T('a) Both blocks have the same acceleration: treat them as one body.', 'a) Kappaleilla on sama kiihtyvyys: käsittele ne yhtenä kappaleena.'),
                T('b) In the diagram of m_2 only F_{12} acts horizontally.', 'b) m_2:n kuvassa vaakasuoraan vaikuttaa vain F_{12}.')] },
      { id: 't3-q14', mode: 'practice', type: 'numeric', difficulty: 3,
        prompt: T('A block (m = 6.0 kg) lies on a frictionless horizontal floor. A force F = 10.0 N pushes it to the right and down, at 60.0° below the horizontal, and a horizontal force F_1 = 8.0 N pulls it to the left. Calculate a) the magnitude of the acceleration and b) the force of the floor on the block. (Exercise 3.3)',
          'Kappale (m = 6,0 kg) on kitkattomalla vaakasuoralla alustalla. Voima F = 10,0 N työntää sitä oikealle ja alaspäin 60,0° vaakatason alapuolelta, ja vaakasuora voima F_1 = 8,0 N vetää sitä vasemmalle. Laske a) kiihtyvyyden suuruus ja b) alustan kappaleeseen kohdistama voima. (Tehtävä 3.3)'),
        fields: [{ id: 'a', tex: '|a|', unit: 'm/s²' }, { id: 'N', tex: 'N', unit: 'N' }],
        hints: [T('Split F into a horizontal part F cos 60° and a vertical part F sin 60°.', 'Jaa F vaakaosaan F cos 60° ja pystyosaan F sin 60°.'),
                T('x: compare F cos 60° with F_1. y: the floor must hold up the weight and the downward part of F.', 'x: vertaa F cos 60°:ta ja F_1:tä. y: alustan on kannettava paino ja F:n alaspäin suuntautuva osa.'),
                T('No friction, so the floor force is the support force N only.', 'Kitkaa ei ole, joten alustan voima on pelkkä tukivoima N.')] },
      // ---- 3.5
      { id: 't3-q15', mode: 'practice', type: 'multi', difficulty: 1,
        prompt: T('Which statements about dry friction are true? Select all.', 'Mitkä väitteet kuivasta kitkasta ovat totta? Valitse kaikki.'),
        options: [{ id: 'a', html: T('The maximum static friction is larger than the kinetic friction.', 'Suurin lepokitka on suurempi kuin liikekitka.') },
                  { id: 'b', html: T('Halving the contact area (same N) halves the kinetic friction.', 'Kosketuspinta-alan puolittaminen (sama N) puolittaa liikekitkan.') },
                  { id: 'c', html: T('Kinetic friction is proportional to the support force.', 'Liikekitka on verrannollinen tukivoimaan.') },
                  { id: 'd', html: T('A block at rest always feels the friction μ_s N.', 'Levossa olevaan kappaleeseen vaikuttaa aina kitka μ_s N.') },
                  { id: 'e', html: T('Friction on a sliding body points opposite to its velocity.', 'Liukuvaan kappaleeseen vaikuttava kitka on nopeudelle vastakkainen.') }],
        hints: [T('Look at the <f>F_μ</f>(t) graph of the friction explorer: the peak, the plateau, and the rising line before the peak.', 'Katso kitkakokeilun <f>F_μ</f>(t)-kuvaajaa: huippu, tasanne ja huippua edeltävä nouseva suora.')] },
      // ---- 3.6 incline ladder
      { id: 't3-q16', mode: 'practice', type: 'fbd', difficulty: 2,
        prompt: T('A box rests without moving on a 45° slope. Draw its free-body diagram and compare the lengths.', 'Laatikko on paikallaan 45°:n rinteellä. Piirrä sen vapaakappalekuvio ja vertaa pituuksia.'),
        hints: [T('What keeps the box from sliding down? That force points the other way.', 'Mikä estää laatikkoa liukumasta alas? Se voima osoittaa toiseen suuntaan.'),
                T('Across the slope N balances one component of mg, along the slope the friction balances the other.', 'Rinnettä vastaan N tasapainottaa painon toisen komponentin, rinteen suuntaan kitka toisen.')],
        widget: { name: 'fbd', config: { scene: 'incline', angle: 45,
          forces: [{ id: 'G', tex: 'mg' }, { id: 'N', tex: 'N' }, { id: 'Fm', tex: 'F_μ' }, { id: 'Fd', label: T('downhill force', 'alamäkivoima') }, { id: 'In', label: T('inertia', 'hitaus') }],
          compare: [['N', 'G'], ['Fm', 'N']] } } },
      { id: 't3-q17', mode: 'practice', type: 'numeric', difficulty: 1,
        prompt: T('A 40 kg box is on a 25° slope. Resolve its weight into the component along the slope and the component perpendicular to the slope.', '40 kg:n laatikko on 25°:n rinteellä. Jaa sen paino rinteen suuntaiseen ja rinnettä vastaan kohtisuoraan komponenttiin.'),
        fields: [{ id: 'par', tex: 'G_x', unit: 'N' }, { id: 'perp', tex: 'G_y', unit: 'N' }],
        hints: [T('First mg. Then: along the slope sin α, across the slope cos α.', 'Ensin mg. Sitten: rinteen suuntaan sin α, rinnettä vastaan cos α.')] },
      { id: 't3-q18', mode: 'practice', type: 'mc', difficulty: 2,
        prompt: T('The 40 kg box is pulled up the 25° slope by a force F parallel to the slope and accelerates up the slope. x axis up the slope. Which equation is right?', '40 kg:n laatikkoa vedetään ylös 25°:n rinnettä rinteen suuntaisella voimalla F, ja se kiihtyy ylöspäin. x-akseli ylös rinnettä. Mikä yhtälö on oikein?'),
        options: [{ id: 'a', tex: 'F − F_μ − m g cos α = m a' }, { id: 'b', tex: 'F + F_μ − m g sin α = m a' },
                  { id: 'c', tex: 'F − F_μ − m g sin α = m a' }, { id: 'd', tex: 'F − F_μ − m g sin α = 0' }],
        hints: [T('Which way does friction point when the box moves up?', 'Mihin suuntaan kitka osoittaa, kun laatikko liikkuu ylös?'), T('The box accelerates, so the right side is not zero.', 'Laatikko kiihtyy, joten oikea puoli ei ole nolla.')] },
      { id: 't3-q19', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('The 40 kg box is pulled up the 25° slope with a force parallel to the slope. μ = 0.30 and the acceleration is 1.5 m/s² up the slope. Calculate the pulling force.', '40 kg:n laatikkoa vedetään ylös 25°:n rinnettä rinteen suuntaisella voimalla. μ = 0,30 ja kiihtyvyys on 1,5 m/s² ylös rinnettä. Laske vetävä voima.'),
        fields: [{ id: 'F', tex: 'F', unit: 'N' }],
        hints: [T('y: N = mg cos α, so <f>F_μ</f> = μ mg cos α.', 'y: N = mg cos α, joten <f>F_μ</f> = μ mg cos α.'), T('x: F = <f>F_μ</f> + mg sin α + m a.', 'x: F = <f>F_μ</f> + mg sin α + m a.')] },
      { id: 't3-q20', mode: 'practice', type: 'slider', difficulty: 2, tol: 0.02,
        prompt: T('In the lab (35°, 55 kg, μ_s = μ_k = 0.43, on the Earth) set the pull F so that the block accelerates <b>up</b> the slope at 3.0 m/s². The widget reads the acceleration at release.',
          'Säädä laboratoriossa (35°, 55 kg, μ_s = μ_k = 0,43, Maassa) veto F niin, että kappale kiihtyy <b>ylös</b> rinnettä 3,0 m/s²:n kiihtyvyydellä. Sovelma lukee kiihtyvyyden päästöhetkellä.'),
        hints: [T('Moving up, friction points down the slope: F = <f>F_μ</f> + mg sin α + m a. Compute F first, then set the slider.', 'Ylös liikuttaessa kitka osoittaa alas rinnettä: F = <f>F_μ</f> + mg sin α + m a. Laske F ensin ja säädä sitten liukusäädin.')],
        widget: { name: 'incline', config: { values: { alpha: 35, m: 55, mus: 0.43, muk: 0.43, F: 0 }, fixed: ['alpha', 'm', 'mus', 'muk'], ranges: { F: { max: 1000 } } } } },
      { id: 't3-q21', mode: 'practice', type: 'fbd', difficulty: 2,
        prompt: T('A block slides to the <b>left</b> on a level floor, pulled by a rope that rises up and to the left at 30° above the horizontal (exercise 3.12). Draw its free-body diagram and compare N with mg.',
          'Kappale liukuu <b>vasemmalle</b> vaakasuoralla lattialla, ja sitä vetää köysi, joka nousee vasemmalle ylöspäin 30° vaakatason yläpuolelle (tehtävä 3.12). Piirrä sen vapaakappalekuvio ja vertaa N:ää ja mg:tä.'),
        hints: [T('Friction opposes the velocity.', 'Kitka on nopeudelle vastakkainen.'), T('The rope lifts part of the weight.', 'Köysi keventää osan painosta.')],
        widget: { name: 'fbd', config: { scene: 'floor', rope: 150,
          forces: [{ id: 'G', tex: 'mg' }, { id: 'N', tex: 'N' }, { id: 'F', tex: 'F' }, { id: 'Fm', tex: 'F_μ' },
                   { id: 'Fv', label: T('force of motion', 'liikkeen voima') }, { id: 'Np', label: T('block\'s push on the floor N′', 'kappaleen paine lattiaan N′') }],
          compare: [['N', 'G']] } } },
      { id: 't3-q22', mode: 'practice', type: 'numeric', difficulty: 3,
        prompt: T('The block of the previous question: m = 3.0 kg, μ_k = 0.30, F = 20.0 N, α = 30.0°. Calculate a) the friction force and b) the acceleration. (Exercise 3.12)', 'Edellisen tehtävän kappale: m = 3,0 kg, μ_k = 0,30, F = 20,0 N, α = 30,0°. Laske a) kitkavoima ja b) kiihtyvyys. (Tehtävä 3.12)'),
        fields: [{ id: 'Fm', tex: 'F_μ', unit: 'N' }, { id: 'a', tex: 'a', unit: 'm/s²' }],
        hints: [T('y first: N + F sin α − mg = 0.', 'Ensin y: N + F sin α − mg = 0.'), T('Then <f>F_μ</f> = μ_k N.', 'Sitten <f>F_μ</f> = μ_k N.'), T('x: F cos α − <f>F_μ</f> = m a.', 'x: F cos α − <f>F_μ</f> = m a.')] },
      { id: 't3-q23', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('A 10 kg body moves on a horizontal surface at a constant 5.0 m/s; the coefficient of friction is 0.20. a) What horizontal force keeps it moving? b) If the force is removed, how long does it take to stop? (Exercise 3.14)',
          '10 kg:n kappale liikkuu vaakasuoralla alustalla vakionopeudella 5,0 m/s; kitkakerroin on 0,20. a) Mikä vaakasuora voima pitää sen liikkeessä? b) Kuinka kauan kestää, ennen kuin se pysähtyy, jos voima poistetaan? (Tehtävä 3.14)'),
        fields: [{ id: 'F', tex: 'F', unit: 'N' }, { id: 't', tex: 't', unit: 's' }], tol: 0.03,
        hints: [T('a) Constant speed: the pull equals the friction.', 'a) Vakionopeus: veto on yhtä suuri kuin kitka.'), T('b) Only friction acts: a = −μ g. Then t = v/|a|.', 'b) Vain kitka vaikuttaa: a = −μ g. Sitten t = v/|a|.')] },
      { id: 't3-q24', mode: 'practice', type: 'numeric', difficulty: 3,
        prompt: T('A car tows another car of mass 900 kg up a hill with a slope of 8.0°. The rolling resistance of the towed car is 2.0 % of its weight. How large is the force in the tow rope if the motion is uniform? (Exercise 3.17)',
          'Auto hinaa 900 kg:n autoa ylös mäkeä, jonka kaltevuus on 8,0°. Hinattavan auton vierintävastus on 2,0 % sen painosta. Kuinka suuri voima hinausköydessä on, kun liike on tasaista? (Tehtävä 3.17)'),
        fields: [{ id: 'T', tex: 'T', unit: 'N' }],
        hints: [T('Uniform motion: ΣF = 0 along the slope.', 'Tasainen liike: ΣF = 0 rinteen suuntaan.'), T('Forces down the slope: mg sin α and the resistance 0.020 mg.', 'Alas rinnettä vaikuttavat mg sin α ja vastus 0,020 mg.')] },
      { id: 't3-q25', mode: 'practice', type: 'numeric', difficulty: 3,
        prompt: T('A 1000 kg car meets resistive forces of 10 % of its weight. What driving force does it need a) at constant speed on level ground, b) at constant speed up a 5° hill, c) with an acceleration of 2.0 m/s² on level ground, d) with an acceleration of 2.0 m/s² down a 5° hill? (Exercise 51)',
          '1000 kg:n autoon vaikuttavat liikevastukset ovat 10 % sen painosta. Mikä vetävä voima tarvitaan, kun auto liikkuu a) vakionopeudella tasaisella tiellä, b) vakionopeudella ylös 5°:n mäkeä, c) 2,0 m/s²:n kiihtyvyydellä tasaisella tiellä, d) 2,0 m/s²:n kiihtyvyydellä alas 5°:n mäkeä? (Tehtävä 51)'),
        fields: [{ id: 'a', tex: 'F_a', unit: 'N' }, { id: 'b', tex: 'F_b', unit: 'N' }, { id: 'c', tex: 'F_c', unit: 'N' }, { id: 'd', tex: 'F_d', unit: 'N' }], tol: 0.03,
        hints: [T('The resistance R = 0.10 mg always opposes the motion.', 'Vastus R = 0,10 mg vastustaa aina liikettä.'),
                T('Uphill add mg sin α, downhill the slope helps: subtract it.', 'Ylämäessä lisää mg sin α, alamäessä rinne auttaa: vähennä se.'),
                T('With acceleration the net force must be m a: F = R ± mg sin α + m a.', 'Kiihdyttäessä kokonaisvoiman on oltava m a: F = R ± mg sin α + m a.')] },
      // ---- 3.7
      { id: 't3-q26', mode: 'practice', type: 'mc', difficulty: 1,
        prompt: T('Bodies of the same cross-section area move through air at the same speed. Which has the smallest drag force?', 'Kappaleet, joilla on sama poikkipinta-ala, liikkuvat ilmassa samalla nopeudella. Millä kappaleella ilmanvastus on pienin?'),
        options: [{ id: 'a', html: T('a ball', 'pallo') }, { id: 'b', html: T('a disc moving face-on', 'lappeellaan liikkuva kiekko') },
                  { id: 'c', html: T('a car seen from the side', 'auto sivulta katsottuna') }, { id: 'd', html: T('a streamlined teardrop', 'virtaviivainen pisara') }],
        hints: [T('Same ρ, A and v: compare the drag coefficients C in the table.', 'Sama ρ, A ja v: vertaa taulukon muotokertoimia C.')] },
      // ---- 3.8
      { id: 't3-q27', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('A football (m = 0.45 kg, d = 22 cm, C = 0.50) falls through air (ρ = 1.29 kg/m³). Calculate its terminal speed.', 'Jalkapallo (m = 0,45 kg, d = 22 cm, C = 0,50) putoaa ilmassa (ρ = 1,29 kg/m³). Laske sen rajanopeus.'),
        fields: [{ id: 'v', tex: 'v_r', unit: 'm/s' }],
        hints: [T('At the terminal speed the drag equals the weight.', 'Rajanopeudella ilmanvastus on yhtä suuri kuin paino.'), T('A = π r² with r = d/2 in metres.', 'A = π r², missä r = d/2 metreinä.')] },
      // ---- 3.9
      { id: 't3-q28', mode: 'practice', type: 'match', difficulty: 1,
        prompt: T('Match each situation with its kind of equilibrium.', 'Yhdistä kukin tilanne ja sen tasapainolaji.'),
        left: [{ id: 'bowl', html: T('ball at the bottom of a bowl', 'pallo kulhon pohjalla') }, { id: 'hill', html: T('ball on top of a dome', 'pallo kupolin huipulla') },
               { id: 'flat', html: T('ball on a level floor', 'pallo vaakasuoralla lattialla') }, { id: 'hang', html: T('ball hanging on a wire', 'langassa riippuva pallo') }],
        right: [{ id: 's', html: T('stable', 'stabiili') }, { id: 'l', html: T('labile', 'labiili') }, { id: 'i', html: T('indifferent', 'indifferentti (epämääräinen)') }],
        hints: [T('Ask what happens to the potential energy when the ball is moved a little.', 'Mieti, mitä potentiaalienergialle tapahtuu, kun palloa siirretään hieman.')] },
      // ---- 3.11
      { id: 't3-q29', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('A 4.0 m bar of mass 120 kg rests on supports at its ends A and B. A load of 180 kg lies on it 3.0 m from A. Calculate the support force F_A.', '4,0 m:n palkki, jonka massa on 120 kg, lepää päissään olevien tukien A ja B varassa. Sen päällä on 3,0 m:n päässä A:sta 180 kg:n kuorma. Laske tukivoima F_A.'),
        fields: [{ id: 'FA', tex: 'F_A', unit: 'N' }],
        hints: [T('Take moments about B: then F_B drops out and F_A is the only unknown.', 'Ota momentit B:n suhteen: silloin F_B putoaa pois ja F_A on ainoa tuntematon.'),
                T('Lever arms from B: the load 1.0 m, the bar\'s weight 2.0 m, F_A 4.0 m.', 'Varret B:stä: kuorma 1,0 m, palkin paino 2,0 m, F_A 4,0 m.')] },
      { id: 't3-q30', mode: 'practice', type: 'numeric', difficulty: 3,
        prompt: T('A 5.0 m ladder weighing 100.0 N leans against a smooth vertical wall (no friction at the wall). The coefficient of friction between the floor and the ladder is 0.40. What is the smallest angle between the floor and the ladder at which it stands? (Exercise 3.39)',
          '5,0 m:n tikapuut, joiden paino on 100,0 N, nojaavat sileään pystysuoraan seinään (seinässä ei kitkaa). Lattian ja tikapuiden välinen kitkakerroin on 0,40. Mikä on pienin lattian ja tikapuiden välinen kulma, jossa tikapuut pysyvät pystyssä? (Tehtävä 3.39)'),
        fields: [{ id: 'th', tex: 'θ_min', unit: '°' }],
        hints: [T('Forces: N = G and <f>F_μ</f> = N_w. Moments about the foot: the weight acts at L/2, the wall push at height L sin θ.', 'Voimat: N = G ja <f>F_μ</f> = N_w. Momentit alapään suhteen: paino vaikuttaa kohdassa L/2, seinän työntö korkeudella L sin θ.'),
                T('G (L/2) cos θ = N_w L sin θ gives N_w = G/(2 tan θ).', 'G (L/2) cos θ = N_w L sin θ antaa N_w = G/(2 tan θ).'),
                T('At the smallest angle the friction is at its maximum μ G.', 'Pienimmässä kulmassa kitka on suurimmillaan μ G.')] },

      // ================= topic test
      { id: 't3-q31', mode: 'graded', type: 'mc', difficulty: 1,
        prompt: T('The mass of a cart is doubled while the resultant force on it stays the same. Its acceleration…', 'Vaunun massa kaksinkertaistetaan, mutta siihen vaikuttava kokonaisvoima pysyy samana. Sen kiihtyvyys…'),
        options: [{ id: 'a', html: T('doubles', 'kaksinkertaistuu') }, { id: 'b', html: T('stays the same', 'pysyy samana') }, { id: 'c', html: T('is halved', 'puolittuu') }, { id: 'd', html: T('becomes a quarter', 'neljännestyy') }],
        hints: [T('a = ΣF/m', 'a = ΣF/m')] },
      { id: 't3-q32', mode: 'graded', type: 'numeric', difficulty: 2,
        prompt: T('An elevator car of mass 750 kg starts <b>downward</b> with an acceleration of 2.0 m/s². How large is the force in its cable?', 'Hissikori, jonka massa on 750 kg, lähtee <b>alaspäin</b> 2,0 m/s²:n kiihtyvyydellä. Kuinka suuri voima sen vaijerissa on?'),
        fields: [{ id: 'T', tex: 'T', unit: 'N' }],
        hints: [T('Choose + in the direction of the acceleration (down) and write ΣF = m a.', 'Valitse + kiihtyvyyden suuntaan (alas) ja kirjoita ΣF = m a.')] },
      { id: 't3-q33', mode: 'graded', type: 'numeric', difficulty: 1,
        prompt: T('A 40 kg box is pushed at constant speed along a level floor with a horizontal force. The coefficient of kinetic friction is 0.35. How large is the force?', '40 kg:n laatikkoa työnnetään vakionopeudella vaakasuoraa lattiaa pitkin vaakasuoralla voimalla. Liikekitkakerroin on 0,35. Kuinka suuri voima on?'),
        fields: [{ id: 'F', tex: 'F', unit: 'N' }],
        hints: [T('Constant speed: the push balances the friction μ N.', 'Vakionopeus: työntö tasapainottaa kitkan μ N.')] },
      { id: 't3-q34', mode: 'graded', type: 'numeric', difficulty: 2,
        prompt: T('A 500 t train brakes uniformly; its speed falls from 40 km/h to 28 km/h in one minute. Calculate the braking force. (Exercise 48)', '500 t:n juna jarruttaa tasaisesti; sen nopeus pienenee 40 km/h:sta 28 km/h:iin minuutissa. Laske jarruttava voima. (Tehtävä 48)'),
        fields: [{ id: 'F', tex: 'F', unit: 'N' }], tol: 0.05,
        hints: [T('Convert: 1 t = 1000 kg, 1 km/h = 1/3.6 m/s, 1 min = 60 s.', 'Muunna: 1 t = 1000 kg, 1 km/h = 1/3,6 m/s, 1 min = 60 s.'), T('a = Δv/Δt, F = m a', 'a = Δv/Δt, F = m a')] },
      { id: 't3-q35', mode: 'graded', type: 'numeric', difficulty: 2,
        prompt: T('A rope is wrapped half a turn around a post (θ = π rad). μ = 0.30 and you hold the free end with 150 N. What is the largest load force F_1 at the other end before the rope slips?', 'Köysi on kierretty puoli kierrosta pylvään ympäri (θ = π rad). μ = 0,30, ja pidät vapaasta päästä kiinni 150 N:n voimalla. Mikä on suurin toisen pään kuormitusvoima F_1, ennen kuin köysi luistaa?'),
        fields: [{ id: 'F1', tex: 'F_1', unit: 'N' }],
        hints: [T('F_1 = F_2 e^{μθ} with θ in radians.', 'F_1 = F_2 e^{μθ}, θ radiaaneina.')] },
      { id: 't3-q36', mode: 'graded', type: 'mc', difficulty: 1,
        prompt: T('A tilted refrigerator is released. It falls back upright if the vertical line through its centre of gravity…', 'Kallistettu jääkaappi päästetään irti. Se palautuu pystyyn, jos sen painopisteen kautta kulkeva pystysuora…'),
        options: [{ id: 'a', html: T('passes outside the edge it is standing on', 'kulkee sen reunan ulkopuolelta, jonka varassa se seisoo') }, { id: 'b', html: T('still hits the support surface', 'osuu yhä tukipintaan') },
                  { id: 'c', html: T('is longer than the refrigerator is high', 'on pidempi kuin jääkaappi on korkea') }, { id: 'd', html: T('passes through the top corner', 'kulkee yläkulman kautta') }],
        hints: [T('Where does the weight act, and which way does it turn the body about the edge?', 'Missä paino vaikuttaa ja kumpaan suuntaan se kiertää kappaletta reunan ympäri?')] },
      { id: 't3-q37', mode: 'graded', type: 'numeric', difficulty: 2,
        prompt: T('A 4.0 m bar of mass 140 kg rests on supports at its ends A and B. A 260 kg load lies on it 1.5 m from A. Calculate the support force F_B.', '4,0 m:n palkki, jonka massa on 140 kg, lepää päissään olevien tukien A ja B varassa. Sen päällä on 1,5 m:n päässä A:sta 260 kg:n kuorma. Laske tukivoima F_B.'),
        fields: [{ id: 'FB', tex: 'F_B', unit: 'N' }],
        hints: [T('Moments about A.', 'Momentit A:n suhteen.')] },
      { id: 't3-q38', mode: 'graded', type: 'mc', difficulty: 2,
        prompt: T('In exercise 3.39 the smallest angle of the ladder did not depend on its length or its weight. Why?', 'Tehtävässä 3.39 tikapuiden pienin kulma ei riippunut niiden pituudesta eikä painosta. Miksi?'),
        options: [{ id: 'a', html: T('Because the wall is smooth, the weight acts on the wall only.', 'Koska seinä on sileä, paino vaikuttaa vain seinään.') },
                  { id: 'b', html: T('G and L appear on both sides of the balance equations and cancel out.', 'G ja L ovat tasapainoehtojen molemmilla puolilla ja supistuvat pois.') },
                  { id: 'c', html: T('Because the ladder is in labile equilibrium.', 'Koska tikapuut ovat labiilissa tasapainossa.') },
                  { id: 'd', html: T('It is only a rounding effect; a heavier ladder needs a larger angle.', 'Se on vain pyöristyksen vaikutus; raskaampi tikapuu tarvitsee suuremman kulman.') }],
        hints: [T('Write the moment equation and the friction limit with symbols only, then see what divides out.', 'Kirjoita momenttiyhtälö ja kitkan raja pelkillä symboleilla ja katso, mikä supistuu.')] }
    ]
  });
})();

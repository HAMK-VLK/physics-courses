/* Fluid widgets: 'submarine', 'tank' (modes level | manometer | press), 'pipeflow' (modes venturi | pitot |
 * torricelli | pump | reynolds). Physics in thermo-model.js (TDC.thermo); shared frame in thermo-common.js.
 * Config reference: .claude/skills/fht-widgets/SKILL.md. */
(function (TDC) {
  'use strict';
  var U = TDC.util, V = TDC.viz, TV = TDC.thermoViz, PH = TDC.thermo, G = PH.G, P0 = 101325;
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function rr(g, x, y, w, h, r) { w = Math.max(0, w); h = Math.max(0, h); g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))); else g.rect(x, y, w, h); }   // never a negative size or radius (zero-width canvas while mounting)
  var alpha = TV.alpha;
  function water(ctx, a) { return alpha(ctx.color('--c-electron'), a || 0.3); }

  // ================================================================ submarine
  // A submarine in the sea: drag it (or use h) to change its depth; fill or blow the ballast tanks (f) and it sinks,
  // hovers or rises. Readouts: pressure at its depth, buoyancy and weight.
  TDC.widgets.register('submarine', function (host, cfg, ctx) {
    var mode = cfg.mode || 'both', depthMax = cfg.depthMax || 300, rho = cfg.rho || 1000, hatchA = cfg.hatchA || 1;
    var sub = Object.assign({ hullV: 2000, hullMass: 1.9e6, ballastV: 200 }, cfg.sub || {});
    var hullH = 10;   // m, hull height used for the floating position
    var defs = [];
    if (mode !== 'ballast') defs.push({ id: 'h', tex: 'h', min: 0, max: depthMax, step: 1, value: 50, unit: 'm' });
    if (mode !== 'depth') defs.push({ id: 'f', label: TV.L('th.sub.fill'), min: 0, max: 100, step: 1, value: 50, unit: '%' });
    var F = TV.frame(host, cfg, ctx, defs, changed);
    var p0 = F.p(), d = p0.h != null ? p0.h : 50, v = 0, lastSync = 0;
    var cv = V.canvas(F.stage, { aspect: function (w) { return w < 520 ? 0.95 : 0.52; }, draw: draw, animate: mode !== 'depth' });
    var geo = {};

    function state(p) {
      var s = PH.subState({ hullV: sub.hullV, hullMass: sub.hullMass, ballastV: sub.ballastV, ballastFrac: mode === 'depth' ? 0.5 : p.f / 100, rhoWater: rho });
      s.dSurf = hullH * (s.floatFrac - 0.5); s.dMax = depthMax - hullH / 2;
      return s;
    }
    function settle(s) { if (s.verdict === 'rise') d = s.dSurf; else if (s.verdict === 'sink') d = s.dMax; }
    function changed(p, from) {
      if (p.h != null && from !== 'sim' && Math.abs(p.h - d) > 0.5) { d = clamp(p.h, state(p).dSurf, depthMax - hullH / 2); v = 0; }
      if (U.reducedMotion() && mode !== 'depth') settle(state(p));
      readouts(); cv.redraw();
    }
    function readouts() {
      var p = F.p(), s = state(p), depth = Math.max(0, d), pe = rho * G * depth;
      var verdict = d <= s.dSurf + 0.01 && s.verdict === 'rise' ? 'th.sub.floats' : 'th.sub.' + s.verdict;
      s.depth = depth; s.p = P0 + pe; s.pe = pe;
      TV.reads(F, cfg, p, s, [
        { tex: 'h', value: depth, unit: 'm', digits: 3 },
        { tex: 'p = p_0 + ρgh', value: P0 + pe, unit: 'Pa' },
        { tex: 'p_e = ρgh', value: pe / 1e5, unit: 'bar' },
        mode === 'depth' ? { tex: 'F = p_e A', value: pe * hatchA, unit: 'N' } : null,
        mode !== 'depth' ? { tex: 'F_b = ρgV', value: s.Fb, unit: 'N' } : null,
        mode !== 'depth' ? { tex: 'G = mg', value: s.W, unit: 'N' } : null,
        mode !== 'depth' ? { label: TV.L('th.sub.state'), value: ctx.t(verdict) } : null
      ]);
      F.answer = function () { return cfg.answer ? cfg.answer(p, s) : { v: mode === 'ballast' ? p.f : pe }; };
    }

    function draw(g, w, h, t, dt) {
      var p = F.p(), s = state(p);
      // motion: speed follows the net force, a little water drag, ×4 time so a dive takes seconds
      if (dt && mode !== 'depth' && !geo.dragging) {
        var vt = s.verdict === 'hover' ? 0 : clamp(-s.net / s.Fb * 400, -25, 25);
        v += (vt - v) * Math.min(1, dt * 2); d += v * dt * 4;
        if (d <= s.dSurf && v <= 0) { d = s.dSurf; v = 0; }
        if (d >= s.dMax && v >= 0) { d = s.dMax; v = 0; }
        if (Math.abs(v) > 0.01 && t - lastSync > 0.25) { lastSync = t; if (p.h != null) F.set({ h: Math.round(Math.max(0, d)) }); else readouts(); }
      }
      var fg = ctx.color('--fg'), muted = ctx.color('--muted'), line = ctx.color('--line'), bg = ctx.color('--surface-2');
      var L = 54, R = w - 70, ys = Math.round(h * 0.16), yb = h - 26, k = (yb - ys) / depthMax;
      g.clearRect(0, 0, w, h);
      g.fillStyle = water(ctx, 0.10); g.fillRect(L, ys, R - L, yb - ys);
      var grad = g.createLinearGradient(0, ys, 0, yb); grad.addColorStop(0, water(ctx, 0.18)); grad.addColorStop(1, water(ctx, 0.5));
      g.fillStyle = grad; g.fillRect(L, ys, R - L, yb - ys);
      g.fillStyle = alpha(ctx.color('--c-6'), 0.45); g.fillRect(L, yb, R - L, h - yb);
      TV.waterLine(g, L, R, ys, t, ctx.color('--c-electron'));
      TV.font(g, 12, 500);
      TV.text(g, ctx.t('th.sub.surface'), R - 6, ys - 10, muted, 'right');
      TV.text(g, ctx.t('th.sub.seabed'), R - 6, yb + 12, fg, 'right');
      // depth scale (m) on the left
      g.strokeStyle = muted; g.lineWidth = 1; g.beginPath(); g.moveTo(L - 6, ys); g.lineTo(L - 6, yb); g.stroke();
      V.niceTicks(0, depthMax, h < 300 ? 4 : 6).forEach(function (m) {
        var y = ys + m * k; g.beginPath(); g.moveTo(L - 10, y); g.lineTo(L - 6, y); g.stroke();
        TV.text(g, U.fmtNum(m, 4), L - 13, y, muted, 'right');
      });
      TV.text(g, 'h / m', 6, ys - 10, muted, 'left');
      // submarine: hull height drawn on the depth scale (at least 18 px), so its position matches h
      var len = Math.min(170, (R - L) * 0.42), ht = Math.max(18, hullH * k), cx = L + (R - L) * 0.47, cy = ys + d * k;
      cy = clamp(cy, ys - ht * 0.5, yb - ht * 0.5);
      geo = Object.assign(geo, { x0: cx - len / 2, x1: cx + len / 2, y0: cy - ht, y1: cy + ht / 2, ys: ys, k: k });
      var body = ctx.color('--c-wire'), fill = ctx.color('--c-body-fill');
      g.lineWidth = 2.5; g.strokeStyle = body; g.fillStyle = fill;
      rr(g, cx - len / 2, cy - ht / 2, len, ht, ht / 2); g.fill(); g.stroke();
      rr(g, cx - len * 0.12, cy - ht / 2 - ht * 0.55, len * 0.2, ht * 0.6, 4); g.fill(); g.stroke();   // sail
      g.beginPath(); g.moveTo(cx - len / 2 + 2, cy); g.lineTo(cx - len / 2 - 12, cy - ht * 0.32); g.lineTo(cx - len / 2 - 12, cy + ht * 0.32); g.closePath(); g.stroke();   // rudder
      // ballast tanks: lower band of the hull, water level = fill fraction
      var fr = mode === 'depth' ? 0.5 : p.f / 100, tx0 = cx - len * 0.38, tw = len * 0.76, ty = cy + ht * 0.02, th = ht * 0.38;
      g.save(); rr(g, tx0, ty, tw, th, 3); g.clip();
      g.fillStyle = alpha(ctx.color('--c-electron'), 0.75); g.fillRect(tx0, ty + th * (1 - fr), tw, th * fr);
      g.restore(); g.strokeStyle = muted; g.lineWidth = 1.5; rr(g, tx0, ty, tw, th, 3); g.stroke();
      // water pressure: arrows pressing on the hull, longer with depth
      var a = 5 + 26 * Math.max(0, d) / depthMax, pc = alpha(ctx.color('--c-electron'), 0.95);
      [-0.3, 0, 0.3].forEach(function (f) {
        var x = cx + f * len; TV.arrow(g, x, cy - ht / 2 - 6 - a - (f === 0 ? ht * 0.55 : 0), x, cy - ht / 2 - 4 - (f === 0 ? ht * 0.55 : 0), pc, 2);
        TV.arrow(g, x, cy + ht / 2 + 6 + a, x, cy + ht / 2 + 4, pc, 2);
      });
      TV.arrow(g, cx + len / 2 + 6 + a, cy, cx + len / 2 + 4, cy, pc, 2);
      // forces: buoyancy up, weight down (same scale)
      if (mode !== 'depth') {
        var fs = Math.min(70, h * 0.18), fb = fs, fw = fs * s.W / s.Fb, c3 = ctx.color('--c-3'), c2 = ctx.color('--c-2');
        TV.arrow(g, cx + len * 0.12, cy, cx + len * 0.12, cy - fb, c3, 3.5);
        TV.arrow(g, cx + len * 0.24, cy, cx + len * 0.24, cy + fw, c2, 3.5);
        TV.font(g, 14, 600);
        TV.text(g, 'F_b', cx + len * 0.12 + 7, cy - fb + 6, c3, 'left', bg);
        TV.text(g, 'G', cx + len * 0.24 + 7, cy + fw - 6, c2, 'left', bg);
      }
      // gauge: gauge pressure in bar at the submarine's depth
      var peBar = rho * G * Math.max(0, d) / 1e5, maxBar = Math.ceil(rho * G * depthMax / 1e5 / 5) * 5;
      TV.gauge(g, ctx, w - 36, ys + 34, 28, peBar, maxBar, 'p_e / bar', U.fmtNum(peBar, 3));
    }
    // drag the submarine to a depth
    TV.drag(cv.canvas, function (x, y) { return !F.locked && x >= geo.x0 - 12 && x <= geo.x1 + 12 && y >= geo.y0 - 12 && y <= geo.y1 + 12; },
      function (x, y) {
        geo.dragging = true; var s = state(F.p());
        d = clamp((y - geo.ys) / geo.k, s.dSurf, s.dMax); v = 0;
        if (F.p().h != null) F.set({ h: Math.round(Math.max(0, d)) }); else { readouts(); cv.redraw(); }
      }, function () { geo.dragging = false; });
    ctx.onTheme(function () { cv.redraw(); }); ctx.onLang(function () { readouts(); cv.redraw(); });
    if (U.reducedMotion() && mode !== 'depth') settle(state(F.p()));
    readouts();
    return Object.assign({ destroy: cv.destroy }, F.api);
  });

  // ================================================================ tank
  TDC.widgets.register('tank', function (host, cfg, ctx) {
    var mode = cfg.mode || 'level';
    var defs = {
      level: [{ id: 'h', tex: 'h', min: 0, max: cfg.hMax || 5, step: 0.05, value: 3, unit: 'm' },
              { id: 'z', tex: 'z', min: 0, max: cfg.hMax || 5, step: 0.05, value: 1.5, unit: 'm' },
              { id: 'rho', tex: 'ρ', min: 600, max: 1600, step: 10, value: 1000, unit: 'kg/m³' }],
      manometer: [{ id: 'pe', tex: 'p_e', min: -20000, max: 40000, step: 500, value: 10000, unit: 'Pa' },
                  { id: 'rhom', tex: 'ρ_n', min: 800, max: 13600, step: 100, value: 1000, unit: 'kg/m³', log: true }],
      press: [{ id: 'F1', tex: 'F_1', min: 10, max: 500, step: 5, value: 200, unit: 'N' },
              { id: 'd1', tex: 'd_1', min: 0.01, max: 0.05, step: 0.001, value: 0.02, unit: 'm' },
              { id: 'd2', tex: 'd_2', min: 0.05, max: 0.4, step: 0.005, value: 0.2, unit: 'm' },
              { id: 's1', tex: 's_1', min: 0, max: 0.3, step: 0.01, value: 0.1, unit: 'm' }]
    }[mode];
    var F = TV.frame(host, cfg, ctx, defs, function () { readouts(); cv.redraw(); });
    var cv = V.canvas(F.stage, { aspect: function (w) { return w < 520 ? 0.9 : 0.5; }, draw: draw, animate: false });
    var range = cfg.range || 50000;   // transmitter range 0…range Pa → 4…20 mA

    function calc(p) {
      if (mode === 'level') {
        var z = Math.min(p.z, p.h);
        return { z: z, pz: p.rho * G * z, pb: p.rho * G * p.h, I: 4 + 16 * clamp(p.rho * G * p.h / range, 0, 1) };
      }
      if (mode === 'manometer') return { dh: p.pe / (p.rhom * G), p: P0 + p.pe };
      var A1 = Math.PI * p.d1 * p.d1 / 4, A2 = Math.PI * p.d2 * p.d2 / 4, pr = p.F1 / A1;
      return { A1: A1, A2: A2, p: pr, F2: PH.press(p.F1, A1, A2), s2: p.s1 * A1 / A2, W: p.F1 * p.s1 };
    }
    function readouts() {
      var p = F.p(), s = calc(p), list;
      if (mode === 'level') list = [
        { tex: 'p_e = ρgz', value: s.pz, unit: 'Pa' }, { tex: 'p_{e,b} = ρgh', value: s.pb, unit: 'Pa' },
        { tex: 'I', value: s.I, unit: 'mA', digits: 4 }];
      else if (mode === 'manometer') list = [{ tex: 'Δh = p_e/(ρ_n g)', value: s.dh * 1000, unit: 'mm', digits: 3 }, { tex: 'p = p_0 + p_e', value: s.p, unit: 'Pa' }];
      else list = [{ tex: 'p = F_1/A_1', value: s.p, unit: 'Pa' }, { tex: 'F_2 = p A_2', value: s.F2, unit: 'N' },
        { tex: 'm_{max} = F_2/g', value: s.F2 / G, unit: 'kg' }, { tex: 's_2 = s_1 A_1/A_2', value: s.s2 * 1000, unit: 'mm' }, { tex: 'W = F_1 s_1 = F_2 s_2', value: s.W, unit: 'J' }];
      TV.reads(F, cfg, p, s, list);
      F.answer = function () { return cfg.answer ? cfg.answer(p, s) : { v: mode === 'level' ? s.I : mode === 'manometer' ? s.dh : s.F2 }; };
    }
    function draw(g, w, h) {
      var p = F.p(), s = calc(p), fg = ctx.color('--fg'), muted = ctx.color('--muted'), wire = ctx.color('--c-wire'), bg = ctx.color('--surface-2');
      g.clearRect(0, 0, w, h); TV.font(g, 13, 600); g.lineJoin = 'round';
      if (mode === 'level') {
        var hMax = cfg.hMax || 5, x0 = w * 0.18, x1 = Math.min(w * 0.62, x0 + 300), y0 = 26, y1 = h - 50, k = (y1 - y0) / hMax, yl = y1 - p.h * k;
        g.fillStyle = water(ctx, 0.25 + 0.25 * (p.rho - 600) / 1000); g.fillRect(x0, yl, x1 - x0, y1 - yl);
        TV.waterLine(g, x0, x1, yl, 0, ctx.color('--c-electron'));
        g.strokeStyle = wire; g.lineWidth = 3; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0, y1); g.lineTo(x1, y1); g.lineTo(x1, y0); g.stroke();
        // level scale
        g.lineWidth = 1; g.strokeStyle = muted;
        V.niceTicks(0, hMax, 5).forEach(function (m) { var y = y1 - m * k; g.beginPath(); g.moveTo(x0 - 6, y); g.lineTo(x0, y); g.stroke(); TV.font(g, 12, 400); TV.text(g, U.fmtNum(m, 3), x0 - 9, y, muted, 'right'); });
        TV.text(g, 'h / m', x0 - 9, y0 - 12, muted, 'right');
        // probe at depth z below the surface
        var yz = yl + s.z * k, xp = (x0 + x1) / 2;
        g.strokeStyle = muted; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(xp, yl); g.lineTo(xp, yz); g.stroke(); g.setLineDash([]);
        g.fillStyle = ctx.color('--c-2'); g.beginPath(); g.arc(xp, yz, 6, 0, 7); g.fill();
        TV.font(g, 13, 600); TV.text(g, 'z', xp + 8, (yl + yz) / 2, fg, 'left', bg);
        // transmitter at the bottom and its 4-20 mA loop display
        var bx = x1 + 18, by = y1 - 18;
        g.strokeStyle = wire; g.lineWidth = 3; g.beginPath(); g.moveTo(x1, by); g.lineTo(bx, by); g.stroke();
        g.fillStyle = ctx.color('--c-body-fill'); rr(g, bx, by - 22, 40, 44, 6); g.fill(); g.stroke();
        TV.font(g, 11, 600); TV.text(g, 'PT', bx + 20, by, fg, 'center');
        g.beginPath(); g.moveTo(bx + 40, by - 8); g.lineTo(w - 70, by - 8); g.moveTo(bx + 40, by + 8); g.lineTo(w - 70, by + 8); g.stroke();
        var dw = Math.min(64, w - (bx + 40) - 10), dx = w - 8 - dw;
        if (dx > bx + 46) {
          g.fillStyle = ctx.color('--c-body-fill'); rr(g, dx, by - 26, dw, 52, 6); g.fill(); g.stroke();
          TV.font(g, 14, 700); TV.text(g, U.fmtNum(s.I, 3), dx + dw / 2, by - 6, ctx.color('--c-value'), 'center');
          TV.font(g, 11, 500); TV.text(g, 'mA', dx + dw / 2, by + 12, muted, 'center');
        }
        TV.font(g, 12, 500); TV.text(g, ctx.t('th.tank.transmitter'), bx, by + 36, muted, 'left');
      } else if (mode === 'manometer') {
        // vessel on the left, U-tube on the right; gauge pressure pushes the liquid down on the vessel side
        var cxm = w * 0.62, half = 26, ybot = h - 44, ymid = h * 0.55, kpx = (h * 0.3) / Math.max(0.05, Math.abs(cfg.dhMax || 1.2));
        var dhpx = clamp(s.dh * kpx, -h * 0.4, h * 0.4), yl1 = ymid + dhpx / 2, yl2 = ymid - dhpx / 2;
        var vx0 = w * 0.08, vx1 = w * 0.36;
        g.fillStyle = alpha(ctx.color('--c-4'), 0.15); g.strokeStyle = wire; g.lineWidth = 3;
        rr(g, vx0, h * 0.2, vx1 - vx0, h * 0.5, 10); g.fill(); g.stroke();
        TV.font(g, 15, 600); TV.text(g, 'p_2', (vx0 + vx1) / 2, h * 0.45, fg, 'center');
        // closed pipe from the vessel into the top of the left leg (the vessel pressure acts on that liquid surface)
        g.fillStyle = alpha(ctx.color('--c-4'), 0.15); g.fillRect(vx1, h * 0.3 - 7, cxm - half - 8 - vx1, 14); g.fillRect(cxm - half - 8, h * 0.3 - 7, 16, Math.max(0, yl1 - h * 0.3 + 7));
        g.beginPath(); g.moveTo(vx1, h * 0.3 - 7); g.lineTo(cxm - half + 8, h * 0.3 - 7); g.moveTo(vx1, h * 0.3 + 7); g.lineTo(cxm - half - 8, h * 0.3 + 7); g.stroke();
        // U-tube liquid
        var mc = p.rhom > 5000 ? alpha(ctx.color('--muted'), 0.7) : water(ctx, 0.6);
        g.lineWidth = 14; g.lineCap = 'butt'; g.strokeStyle = mc;
        g.beginPath(); g.moveTo(cxm - half, yl1); g.lineTo(cxm - half, ybot); g.arc(cxm, ybot, half, Math.PI, 0, true); g.lineTo(cxm + half, yl2); g.stroke();
        g.lineWidth = 2; g.strokeStyle = wire;
        g.beginPath(); g.moveTo(cxm - half + 8, h * 0.3 - 7); g.lineTo(cxm - half + 8, ybot); g.arc(cxm, ybot, half - 8, Math.PI, 0, true); g.lineTo(cxm + half - 8, h * 0.12);
        g.moveTo(cxm - half - 8, h * 0.3 + 7); g.lineTo(cxm - half - 8, ybot); g.arc(cxm, ybot, half + 8, Math.PI, 0, true); g.lineTo(cxm + half + 8, h * 0.12); g.stroke();
        TV.font(g, 13, 600); TV.text(g, 'p_0', cxm + half, h * 0.12 - 10, muted, 'center');
        // height difference
        g.strokeStyle = muted; g.lineWidth = 1; g.setLineDash([4, 3]);
        g.beginPath(); g.moveTo(cxm - half - 10, yl1); g.lineTo(cxm + half + 40, yl1); g.moveTo(cxm + half - 10, yl2); g.lineTo(cxm + half + 40, yl2); g.stroke(); g.setLineDash([]);
        if (Math.abs(dhpx) > 6) TV.arrow(g, cxm + half + 32, yl1, cxm + half + 32, yl2, ctx.color('--c-2'), 2);
        TV.text(g, 'Δh', cxm + half + 42, ymid, fg, 'left', ctx.color('--surface-2'));
      } else {
        // hydraulic lift: small piston pushed down by F1, big piston lifts a car
        var base = h - 30, x1p = w * 0.18, x2p = w * 0.62, r1 = clamp(p.d1 * 600, 8, 26), r2 = clamp(p.d2 * 300, 24, 110);
        var k2 = 160, y1p = h * 0.35 + p.s1 * k2, y2p = h * 0.5 - s.s2 * k2;
        g.fillStyle = alpha(ctx.color('--c-2'), 0.35); g.beginPath();   // one fluid body: small cylinder, channel, big cylinder
        g.moveTo(x1p - r1, y1p); g.lineTo(x1p + r1, y1p); g.lineTo(x1p + r1, base - 22); g.lineTo(x2p - r2, base - 22); g.lineTo(x2p - r2, y2p);
        g.lineTo(x2p + r2, y2p); g.lineTo(x2p + r2, base); g.lineTo(x1p - r1, base); g.closePath(); g.fill();
        g.strokeStyle = wire; g.lineWidth = 3;
        g.beginPath(); g.moveTo(x1p - r1, h * 0.25); g.lineTo(x1p - r1, base); g.lineTo(x2p + r2, base); g.lineTo(x2p + r2, h * 0.32);
        g.moveTo(x1p + r1, h * 0.25); g.lineTo(x1p + r1, base - 22); g.lineTo(x2p - r2, base - 22); g.lineTo(x2p - r2, h * 0.32); g.stroke();
        g.fillStyle = ctx.color('--c-wire'); g.fillRect(x1p - r1, y1p - 8, 2 * r1, 8); g.fillRect(x2p - r2, y2p - 8, 2 * r2, 8);
        TV.arrow(g, x1p, y1p - 60, x1p, y1p - 10, ctx.color('--c-1'), 3.5);
        TV.font(g, 14, 600); TV.text(g, 'F_1', x1p + 10, y1p - 46, ctx.color('--c-1'), 'left', bg);
        // a car on the big piston
        var cw = Math.min(2 * r2 + 30, 170), cy = y2p - 8;
        g.fillStyle = alpha(ctx.color('--c-4'), 0.8); rr(g, x2p - cw / 2, cy - 30, cw, 20, 6); g.fill(); rr(g, x2p - cw / 4, cy - 46, cw / 2, 18, 6); g.fill();
        g.fillStyle = fg; [-0.3, 0.3].forEach(function (f) { g.beginPath(); g.arc(x2p + f * cw, cy - 8, 8, 0, 7); g.fill(); });
        TV.arrow(g, x2p + r2 + 18, y2p, x2p + r2 + 18, y2p - 50, ctx.color('--c-3'), 3.5);
        TV.text(g, 'F_2', x2p + r2 + 26, y2p - 34, ctx.color('--c-3'), 'left', bg);
        TV.font(g, 13, 600); TV.text(g, 'A_1', x1p, base + 14, muted, 'center'); TV.text(g, 'A_2', x2p, base + 14, muted, 'center');
      }
    }
    ctx.onTheme(function () { cv.redraw(); }); ctx.onLang(function () { readouts(); cv.redraw(); });
    readouts();
    return Object.assign({ destroy: cv.destroy }, F.api);
  });

  // ================================================================ pipeflow
  TDC.widgets.register('pipeflow', function (host, cfg, ctx) {
    var mode = cfg.mode || 'venturi', rho = cfg.rho || 1000;
    var defs = {
      venturi: [{ id: 'd1', tex: 'd_1', min: 0.04, max: 0.2, step: 0.005, value: 0.11, unit: 'm' },
                { id: 'd2', tex: 'd_2', min: 0.02, max: 0.2, step: 0.005, value: 0.055, unit: 'm' },
                { id: 'v1', tex: 'v_1', min: 0.2, max: 3, step: 0.05, value: 1.45, unit: 'm/s' }],
      pitot: [{ id: 'v', tex: 'v', min: 0, max: 40, step: 0.5, value: 15, unit: 'm/s' }],
      torricelli: [{ id: 'h', tex: 'h', min: 0.2, max: 5, step: 0.05, value: 3.5, unit: 'm' },
                   { id: 'd', tex: 'd', min: 0.01, max: 0.06, step: 0.001, value: 0.035, unit: 'm' }],
      pump: [{ id: 'q', tex: 'q_V', min: 0.002, max: 0.03, step: 0.001, value: 0.015, unit: 'm³/s' },
             { id: 'h', tex: 'h', min: 0, max: 20, step: 0.5, value: 8.5, unit: 'm' },
             { id: 'p2', tex: 'p_2', min: 100000, max: 500000, step: 5000, value: 200000, unit: 'Pa' },   // absolute; the low tank is open (p_1 = p_0)
             { id: 'eta', tex: 'η', min: 0.3, max: 0.95, step: 0.01, value: 0.75, unit: '' }],
      reynolds: [{ id: 'v', tex: 'v', min: 0.001, max: 2, step: 0, value: 0.015, unit: 'm/s', log: true },
                 { id: 'D', tex: 'D', min: 0.01, max: 0.2, step: 0.005, value: 0.11, unit: 'm' },
                 { id: 'eta', tex: 'η', min: 0.0005, max: 1.5, step: 0, value: 0.001, unit: 'Pa·s', log: true }]
    }[mode];
    var F = TV.frame(host, cfg, ctx, defs, function () { readouts(); cv.redraw(); });
    var parts = [], N = 70;
    for (var i = 0; i < N; i++) parts.push({ x: Math.random(), r: Math.random() * 2 - 1, ph: Math.random() * 6.3 });
    var cv = V.canvas(F.stage, { aspect: function (w) { return w < 520 ? 0.85 : 0.46; }, draw: draw });
    var pumpD1 = cfg.d1 || 0.05, pumpD2 = cfg.d2 || 0.04;

    function calc(p) {
      if (mode === 'venturi') {
        var d2 = Math.min(p.d2, p.d1), A1 = Math.PI * p.d1 * p.d1 / 4, A2 = Math.PI * d2 * d2 / 4, v2 = PH.continuity(A1, p.v1, A2);
        var dp = 0.5 * rho * (v2 * v2 - p.v1 * p.v1);
        return { d2: d2, A1: A1, A2: A2, v2: v2, q: A1 * p.v1, dp: dp, dh: dp / (rho * G) };
      }
      if (mode === 'pitot') { var rhoA = cfg.rhoAir || 1.2, pd = 0.5 * rhoA * p.v * p.v; return { pd: pd, dh: pd / ((cfg.rhoN || 1000) * G) }; }
      if (mode === 'torricelli') { var vv = PH.torricelli(p.h); return { v: vv, q: Math.PI * p.d * p.d / 4 * vv }; }
      if (mode === 'pump') {
        var a1 = Math.PI * pumpD1 * pumpD1 / 4, a2 = Math.PI * pumpD2 * pumpD2 / 4, w1 = p.q / a1, w2 = p.q / a2;
        var dpp = p.p2 - P0 + rho * G * p.h + 0.5 * rho * (w2 * w2 - w1 * w1), PA = dpp * p.q;
        return { v1: w1, v2: w2, dpp: dpp, PA: PA, Pin: PA / p.eta };
      }
      var Re = PH.reynolds(rho, p.v, p.D, p.eta);
      return { Re: Re, type: Re < 2000 ? 'laminar' : Re > 3000 ? 'turbulent' : 'transition' };
    }
    function readouts() {
      var p = F.p(), s = calc(p), list;
      if (mode === 'venturi') list = [{ tex: 'v_2 = v_1 A_1/A_2', value: s.v2, unit: 'm/s' }, { tex: 'q_V = A_1 v_1', value: s.q * 1000, unit: 'L/s' },
        { tex: 'Δp = p_1 - p_2', value: s.dp, unit: 'Pa' }, { tex: 'Δh = Δp/(ρg)', value: s.dh * 1000, unit: 'mm' }];
      else if (mode === 'pitot') list = [{ tex: 'p_D = ½ρv^2', value: s.pd, unit: 'Pa' }, { tex: 'h = p_D/(ρ_n g)', value: s.dh * 1000, unit: 'mm' }];
      else if (mode === 'torricelli') list = [{ tex: 'v = sqrt{2gh}', value: s.v, unit: 'm/s' }, { tex: 'q_V = Av', value: s.q * 1000, unit: 'L/s' }];
      else if (mode === 'pump') list = [{ tex: 'v_1', value: s.v1, unit: 'm/s' }, { tex: 'v_2', value: s.v2, unit: 'm/s' },
        { tex: 'Δp_P', value: s.dpp, unit: 'Pa' }, { tex: 'P_A = Δp_P q_V', value: s.PA, unit: 'W' }, { tex: 'P_0 = P_A/η', value: s.Pin, unit: 'W' }];
      else list = [{ tex: 'R_e = ρvD/η', value: s.Re, unit: '', digits: 3 }, { label: TV.L('th.flow.type'), value: ctx.t('th.flow.' + s.type) }];
      TV.reads(F, cfg, p, s, list);
      F.answer = function () {
        if (cfg.answer) return cfg.answer(p, s);
        return { v: { venturi: s.v2, pitot: s.dh, torricelli: s.q, pump: s.Pin, reynolds: s.Re }[mode] };
      };
    }
    // speed of the drawn particles: absolute (TDC.util.flowRate keeps it comparable between widgets)
    function pxSpeed(v) { return 12 + 70 * Math.log(1 + v) ; }

    function draw(g, w, h, t, dt) {
      var p = F.p(), s = calc(p), fg = ctx.color('--fg'), muted = ctx.color('--muted'), wire = ctx.color('--c-wire'), bg = ctx.color('--surface-2');
      var dot = ctx.color('--c-electron');
      g.clearRect(0, 0, w, h); g.lineJoin = 'round'; g.lineCap = 'round'; TV.font(g, 13, 600);
      if (mode === 'venturi' || mode === 'reynolds') {
        var cy = mode === 'venturi' ? h * 0.66 : h * 0.5, x0 = 10, x1 = w - 10, L = x1 - x0;
        var R1 = mode === 'venturi' ? clamp(p.d1 * 420, 18, h * 0.24) : clamp(p.D * 500, 20, h * 0.36);
        var R2 = mode === 'venturi' ? R1 * s.d2 / p.d1 : R1;
        // radius along the pipe: wide, cone in, throat, cone out, wide
        var rad = function (x) {
          if (mode !== 'venturi') return R1;
          var f = (x - x0) / L;
          if (f < 0.3) return R1; if (f < 0.42) return R1 + (R2 - R1) * (f - 0.3) / 0.12;
          if (f < 0.58) return R2; if (f < 0.75) return R2 + (R1 - R2) * (f - 0.58) / 0.17; return R1;
        };
        g.fillStyle = water(ctx, 0.18); g.beginPath(); g.moveTo(x0, cy - rad(x0));
        for (var x = x0; x <= x1; x += 4) g.lineTo(x, cy - rad(x));
        for (x = x1; x >= x0; x -= 4) g.lineTo(x, cy + rad(x));
        g.closePath(); g.fill();
        g.strokeStyle = wire; g.lineWidth = 3;
        [-1, 1].forEach(function (sg) { g.beginPath(); for (var x = x0; x <= x1; x += 4) { var y = cy + sg * rad(x); if (x === x0) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke(); });
        // particles
        var turb = mode === 'reynolds' ? clamp((s.Re - 2000) / 1000, 0, 1) : 0, vref = mode === 'venturi' ? p.v1 : p.v;
        g.fillStyle = dot;
        parts.forEach(function (q, i) {
          var xx = x0 + q.x * L, r = rad(xx), loc = mode === 'venturi' ? vref * R1 * R1 / (r * r) : vref;
          // laminar: parabolic profile; turbulent: almost flat profile plus eddies
          var prof = mode === 'reynolds' ? (1 - turb) * 2 * (1 - q.r * q.r) + turb * 1.15 * (1 - Math.pow(Math.abs(q.r), 7)) : 1;
          if (dt) { q.x += dt * pxSpeed(loc) * prof / L; if (q.x > 1) { q.x -= 1; q.r = Math.random() * 2 - 1; } }
          var wob = turb * 0.35 * Math.sin(t * 6 + q.ph + q.x * 30);
          var yy = cy + clamp(q.r + wob, -0.95, 0.95) * (r - 4);
          g.beginPath(); g.arc(xx, yy, 2.8, 0, 7); g.fill();
        });
        if (mode === 'venturi') {
          // piezometer tubes at the wide part and the throat: liquid height shows the static pressure
          var xa = x0 + L * 0.16, xb = x0 + L * 0.5, top = 12, base = cy - R1, p1h = cfg.h1 || 2, k = (base - top - 10) / Math.max(p1h, 0.05);
          var hb = p1h - s.dh, cols = [[xa, p1h, 'p_1'], [xb, hb, 'p_2']];
          cols.forEach(function (c) {
            var yb = c[0] === xb ? cy - R2 : base, hh = clamp(c[1], 0, p1h * 1.05) * k, ytop = base - hh;
            g.strokeStyle = wire; g.lineWidth = 2; g.beginPath(); g.moveTo(c[0] - 6, top); g.lineTo(c[0] - 6, yb); g.moveTo(c[0] + 6, top); g.lineTo(c[0] + 6, yb); g.stroke();
            g.fillStyle = water(ctx, 0.75); g.fillRect(c[0] - 5, Math.min(ytop, yb), 10, Math.max(0, yb - Math.min(ytop, yb)));
            TV.text(g, c[2], c[0] + 12, top + 10, fg, 'left');
          });
          var ya = base - p1h * k, yb2 = base - clamp(hb, 0, p1h * 1.05) * k;
          g.strokeStyle = muted; g.lineWidth = 1; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(xa + 6, ya); g.lineTo(xb + 40, ya); g.stroke(); g.setLineDash([]);
          if (ya - yb2 < -8) { TV.arrow(g, xb + 32, ya, xb + 32, yb2, ctx.color('--c-2'), 2); TV.text(g, 'Δh', xb + 40, (ya + yb2) / 2, fg, 'left', bg); }
          if (hb < 0) TV.text(g, ctx.t('th.flow.suction'), xb, top + 30, ctx.color('--c-2'), 'center', bg);
          TV.text(g, 'v_1', x0 + L * 0.06, cy, fg, 'left', bg); TV.text(g, 'v_2', xb, cy, fg, 'center', bg);
        } else {
          // velocity profile at the right end
          var xp = x1 - 70; g.strokeStyle = ctx.color('--c-2'); g.lineWidth = 2; g.beginPath();
          for (var k2 = -1; k2 <= 1.001; k2 += 0.05) { var pr = (1 - turb) * (1 - k2 * k2) + turb * 0.87 * (1 - Math.pow(Math.abs(k2), 7)); var px = xp - 10 + 55 * pr, py = cy + k2 * (R1 - 3); if (k2 === -1) g.moveTo(px, py); else g.lineTo(px, py); }
          g.stroke(); g.strokeStyle = muted; g.lineWidth = 1; g.beginPath(); g.moveTo(xp - 10, cy - R1); g.lineTo(xp - 10, cy + R1); g.stroke();
          TV.font(g, 14, 700); TV.text(g, ctx.t('th.flow.' + s.type), w / 2, Math.max(16, cy - R1 - 16), s.type === 'laminar' ? ctx.color('--c-3') : ctx.color('--c-2'), 'center', bg);
        }
      } else if (mode === 'pitot') {
        // air duct with an L-shaped Pitot tube facing the flow, connected to a water U-manometer
        var top2 = h * 0.12, bot = h * 0.48, x0p = 10, x1p = w - 10;
        g.fillStyle = alpha(ctx.color('--c-4'), 0.08); g.fillRect(x0p, top2, x1p - x0p, bot - top2);
        g.strokeStyle = wire; g.lineWidth = 3; g.beginPath(); g.moveTo(x0p, top2); g.lineTo(x1p, top2); g.moveTo(x0p, bot); g.lineTo(x1p, bot); g.stroke();
        g.fillStyle = alpha(ctx.color('--c-4'), 0.8);
        parts.forEach(function (q) { if (dt) { q.x += dt * pxSpeed(p.v / 4) / (x1p - x0p); if (q.x > 1) q.x -= 1; } var xx = x0p + q.x * (x1p - x0p), yy = (top2 + bot) / 2 + q.r * (bot - top2) * 0.42; g.fillRect(xx, yy, 6, 1.5); });
        var tipX = w * 0.35, ym = (top2 + bot) / 2, mx = w * 0.6;
        g.strokeStyle = fg; g.lineWidth = 4; g.beginPath(); g.moveTo(tipX, ym); g.lineTo(mx - 20, ym); g.lineTo(mx - 20, bot + 30); g.stroke();
        var hpx = clamp(s.dh * 1000 * 2, 0, h * 0.3), ub = h - 20, ul = mx - 20, ur = mx + 30, ymidm = h * 0.72;
        g.lineWidth = 12; g.strokeStyle = water(ctx, 0.65); g.lineCap = 'butt';
        g.beginPath(); g.moveTo(ul, ymidm + hpx / 2); g.lineTo(ul, ub); g.lineTo(ur, ub); g.lineTo(ur, ymidm - hpx / 2); g.stroke();
        g.lineWidth = 2; g.strokeStyle = wire; g.beginPath();   // U-tube walls; left leg joins the Pitot tube, right leg is the static tap in the duct wall
        g.moveTo(ul - 7, bot + 30); g.lineTo(ul - 7, ub + 7); g.lineTo(ur + 7, ub + 7); g.lineTo(ur + 7, bot);
        g.moveTo(ul + 7, bot + 30); g.lineTo(ul + 7, ub - 7); g.lineTo(ur - 7, ub - 7); g.lineTo(ur - 7, bot);
        g.moveTo(ul - 7, bot + 30); g.lineTo(ul + 7, bot + 30); g.stroke();   // left leg sealed around the Pitot tube
        TV.text(g, 'p_2', tipX - 26, ym, fg, 'center', bg); TV.text(g, 'p_1', ur + 14, bot + 14, fg, 'left', bg); TV.text(g, 'v', x0p + 20, top2 + 14, fg, 'left', bg);
        if (hpx > 8) { TV.arrow(g, ur + 26, ymidm + hpx / 2, ur + 26, ymidm - hpx / 2, ctx.color('--c-2'), 2); TV.text(g, 'h', ur + 34, ymidm, fg, 'left', bg); }
      } else if (mode === 'torricelli') {
        var hMax = 5, tx0 = w * 0.08, tx1 = w * 0.32, tyb = h * 0.62, tyt = 16, kk = (tyb - tyt) / hMax, yl = tyb - p.h * kk;
        g.fillStyle = water(ctx, 0.35); g.fillRect(tx0, yl, tx1 - tx0, tyb - yl); TV.waterLine(g, tx0, tx1, yl, t, dot);
        g.strokeStyle = wire; g.lineWidth = 3; g.beginPath(); g.moveTo(tx0, tyt); g.lineTo(tx0, tyb); g.lineTo(tx1, tyb); g.lineTo(tx1, tyt); g.stroke();
        var hole = tyb - 8, hr = clamp(p.d * 120, 2, 8);
        g.strokeStyle = ctx.color('--surface-2'); g.lineWidth = 4; g.beginPath(); g.moveTo(tx1, hole - hr); g.lineTo(tx1, hole + hr); g.stroke();
        // jet: x = v·t, y = ½·g·t² (drawn in metres of the same scale)
        var vj = s.v; g.strokeStyle = alpha(dot, 0.6); g.lineWidth = 2 * hr; g.beginPath(); g.moveTo(tx1, hole);
        for (var tt = 0; tt < 2; tt += 0.01) { var jx = tx1 + vj * tt * kk, jy = hole + 0.5 * G * tt * tt * kk; if (jy > h - 4 || jx > w - 8) break; g.lineTo(jx, jy); }
        g.stroke();
        g.strokeStyle = muted; g.lineWidth = 1; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(tx1 + 4, yl); g.lineTo(tx1 + 30, yl); g.moveTo(tx1 + 4, hole); g.lineTo(tx1 + 30, hole); g.stroke(); g.setLineDash([]);
        TV.arrow(g, tx1 + 22, hole, tx1 + 22, yl, ctx.color('--c-2'), 2); TV.text(g, 'h', tx1 + 30, (yl + hole) / 2, fg, 'left', bg);
      } else {
        // pump: open low tank, motor + pump, pipe up to a pressurised tank at height h
        var lx = w * 0.06, lw = w * 0.22, ly = h - 70, kh = (h - 120) / 20, uy = ly - p.h * kh + 40, ux = w * 0.7, uw = w * 0.2;
        g.fillStyle = water(ctx, 0.35); g.fillRect(lx, ly, lw, 50); g.fillRect(ux, uy - 40, uw, 40);
        g.strokeStyle = wire; g.lineWidth = 3;
        g.beginPath(); g.moveTo(lx, ly - 20); g.lineTo(lx, ly + 50); g.lineTo(lx + lw, ly + 50); g.lineTo(lx + lw, ly - 20); g.stroke();
        rr(g, ux, uy - 60, uw, 60, 4); g.stroke();
        var px = w * 0.44, py = ly + 34;
        g.lineWidth = 6; g.strokeStyle = alpha(dot, 0.7);
        g.beginPath(); g.moveTo(lx + lw - 20, py); g.lineTo(px - 18, py); g.moveTo(px, py - 18); g.lineTo(px, uy - 30); g.lineTo(ux, uy - 30); g.stroke();
        g.lineWidth = 2.5; g.strokeStyle = wire; g.fillStyle = ctx.color('--c-body-fill');
        g.beginPath(); g.arc(px, py, 18, 0, 7); g.fill(); g.stroke();
        var spin = (U.reducedMotion() ? 0 : t * (2 + p.q * 200));
        for (var b = 0; b < 4; b++) { var a = spin + b * Math.PI / 2; g.beginPath(); g.moveTo(px, py); g.lineTo(px + 14 * Math.cos(a), py + 14 * Math.sin(a)); g.stroke(); }
        rr(g, px + 22, py - 14, 44, 28, 5); g.fill(); g.stroke();
        TV.font(g, 12, 700); TV.text(g, 'M', px + 44, py, fg, 'center');
        TV.font(g, 12, 500); TV.text(g, ctx.t('th.flow.pump'), px, py + 32, muted, 'center');
        TV.font(g, 13, 600); TV.text(g, 'p_2', ux + uw / 2, uy - 46, fg, 'center');
        g.strokeStyle = muted; g.lineWidth = 1; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(lx + lw, ly); g.lineTo(w - 10, ly); g.stroke(); g.setLineDash([]);
        g.beginPath(); g.setLineDash([4, 3]); g.moveTo(ux + uw, uy - 40); g.lineTo(w - 10, uy - 40); g.stroke(); g.setLineDash([]);
        if (p.h > 0.3) { TV.arrow(g, w - 22, ly, w - 22, uy - 40, ctx.color('--c-2'), 2); TV.text(g, 'h', w - 30, (ly + uy - 40) / 2, fg, 'right', bg); }
        TV.gauge(g, ctx, w * 0.5, 34, 24, s.Pin / 1000, Math.max(5, Math.ceil(s.Pin / 1000 / 5) * 5), 'P_0 / kW', U.fmtNum(s.Pin / 1000, 3));
      }
    }
    ctx.onTheme(function () { cv.redraw(); }); ctx.onLang(function () { readouts(); cv.redraw(); });
    readouts();
    return Object.assign({ destroy: cv.destroy }, F.api);
  });
})(window.TDC);

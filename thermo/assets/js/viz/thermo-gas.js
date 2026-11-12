/* Gas and vapour widgets: 'gas' (piston + molecules + pV diagram or Maxwell distribution; processes free |
 * isothermal | isobaric | isochoric | adiabatic) and 'humidity' (dew point and condensation on a cold surface, e.g. inside an
 * electrical cabinet). Physics in thermo-model.js; frame in thermo-common.js; config in skill fht-widgets. */
(function (TDC) {
  'use strict';
  var U = TDC.util, V = TDC.viz, TV = TDC.thermoViz, PH = TDC.thermo, R = PH.R;
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function rr(g, x, y, w, h, r) { w = Math.max(0, w); h = Math.max(0, h); g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))); else g.rect(x, y, w, h); }   // never a negative size or radius (zero-width canvas while mounting)

  /** Axes box with nice ticks; returns mapping functions. o: {x0, y0, x1, y1, xmin, xmax, ymin, ymax, xlab, ylab}. */
  function axes(g, ctx, o) {
    var muted = ctx.color('--muted'), line = ctx.color('--line');
    var X = function (v) { return o.x0 + (v - o.xmin) / (o.xmax - o.xmin) * (o.x1 - o.x0); };
    var Y = function (v) { return o.y1 - (v - o.ymin) / (o.ymax - o.ymin) * (o.y1 - o.y0); };
    TV.font(g, 11, 400); g.lineWidth = 1;
    V.niceTicks(o.xmin, o.xmax, o.nx || 5).forEach(function (t) {
      g.strokeStyle = line; g.beginPath(); g.moveTo(X(t), o.y0); g.lineTo(X(t), o.y1); g.stroke();
      TV.text(g, U.fmtNum(t, 4), X(t), o.y1 + 10, muted, 'center');
    });
    V.niceTicks(o.ymin, o.ymax, o.ny || 4).forEach(function (t) {
      g.strokeStyle = line; g.beginPath(); g.moveTo(o.x0, Y(t)); g.lineTo(o.x1, Y(t)); g.stroke();
      TV.text(g, U.fmtNum(t, 4), o.x0 - 5, Y(t), muted, 'right');
    });
    g.strokeStyle = muted; g.beginPath(); g.moveTo(o.x0, o.y0); g.lineTo(o.x0, o.y1); g.lineTo(o.x1, o.y1); g.stroke();
    TV.font(g, 12, 600);
    TV.text(g, o.xlab, o.x1, o.y1 + 24, muted, 'right');
    TV.text(g, o.ylab, o.x0 - 4, o.y0 - 12, muted, 'left');
    return { X: X, Y: Y };
  }
  TV.axes = axes;

  // ================================================================ gas
  TDC.widgets.register('gas', function (host, cfg, ctx) {
    var proc = cfg.process || 'free', n = cfg.n || 0.1, M = cfg.M || 0.028, show = cfg.show || 'pv';
    var Vmin = 0.5, Vmax = 5, pFix = (cfg.values && cfg.values.p) || 100000, VFix = (cfg.values && cfg.values.V) || 2.5;
    var defs = [];
    var GAM = cfg.gamma || 1.4, T1 = cfg.T1 || 300;   // adiabatic: T = T1 (Vmax/V)^(γ−1), start fully expanded at T1
    if (proc === 'free' || proc === 'isothermal' || proc === 'adiabatic') defs.push({ id: 'V', tex: 'V', min: Vmin, max: Vmax, step: 0.05, value: 2.5, unit: 'L' });
    if (proc !== 'isothermal' && proc !== 'adiabatic') {
      var tmin = 100, tmax = 900;
      if (proc === 'isobaric') { tmin = Math.ceil(pFix * Vmin / 1000 / (n * R)); tmax = Math.floor(pFix * Vmax / 1000 / (n * R)); }
      defs.push({ id: 'T', tex: 'T', min: tmin, max: tmax, step: 5, value: clamp(300, tmin, tmax), unit: 'K' });
    }
    var F = TV.frame(host, cfg, ctx, defs, function () { trail.push(state(F.p())); if (trail.length > 300) trail.shift(); readouts(); cv.redraw(); });
    function state(p) {
      var T = proc === 'isothermal' ? ((cfg.values && cfg.values.T) || 300) : proc === 'adiabatic' ? T1 * Math.pow(Vmax / p.V, GAM - 1) : p.T, Vl, pr;
      if (proc === 'isobaric') { pr = pFix; Vl = PH.idealGas({ p: pr, n: n, T: T }, 'V') * 1000; }
      else { Vl = proc === 'isochoric' ? VFix : p.V; pr = PH.idealGas({ V: Vl / 1000, n: n, T: T }, 'p'); }
      return { T: T, V: Vl, p: pr, n: n, vrms: PH.vrms(T, M) };
    }
    var trail = [state(F.p())];
    // molecules: random positions (0…1 of the gas box) and directions; speed follows √T
    var mol = [], NM = cfg.molecules || 36;
    for (var i = 0; i < NM; i++) { var a = Math.random() * 6.283; mol.push({ x: Math.random(), y: Math.random(), dx: Math.cos(a), dy: Math.sin(a), s: 0.6 + Math.random() * 0.8 }); }
    var geo = {};
    var cv = V.canvas(F.stage, { aspect: function (w) { return w < 560 ? 1.25 : 0.5; }, draw: draw });

    function legend() {
      F.legend.innerHTML = '';
      if (show !== 'pv') return;
      [['--c-1', 'th.gas.iso', ''], ['--line', 'th.gas.isoRef', (cfg.isotherms || [200, 400, 600, 800]).join(', ') + ' K'], proc === 'adiabatic' ? ['--c-3', 'th.gas.adiabat', ''] : null, ['--c-2', 'th.gas.path', '']].filter(Boolean).forEach(function (q) {
        F.legend.appendChild(U.el('span', { class: 'lg' }, [U.el('i', { style: { background: ctx.color(q[0]) } }), ctx.t(q[1]) + (q[2] ? ' ' + q[2] : '')]));
      });
    }
    function readouts() {
      var p = F.p(), s = state(p);
      TV.reads(F, cfg, p, s, [
        { tex: 'p = nRT/V', value: s.p, unit: 'Pa' }, { tex: 'V', value: s.V, unit: 'L' }, { tex: 'T', value: s.T, unit: 'K', digits: 4 },
        { tex: 'n', value: n, unit: 'mol' }, show === 'maxwell' ? { tex: 'v_{rms} = sqrt{3RT/M}', value: s.vrms, unit: 'm/s' } : null]);
      F.answer = function () { return cfg.answer ? cfg.answer(p, s) : { v: s.p }; };
    }

    function draw(g, w, h, t, dt) {
      var p = F.p(), s = state(p), fg = ctx.color('--fg'), muted = ctx.color('--muted'), wire = ctx.color('--c-wire'), bg = ctx.color('--surface-2');
      var stack = w < 560, cw = stack ? Math.min(w - 110, 240) : Math.min(w * 0.36, 260);   // room for the gauge on the right
      var cx0 = stack ? 30 : 46, cx1 = cx0 + cw, cy1 = stack ? h * 0.5 - 30 : h - 46, ctop = 26;
      var gasH = (cy1 - ctop - 30) * (s.V - 0) / Vmax, py = cy1 - gasH;   // piston underside
      geo = { x0: cx0, x1: cx1, py: py, cy1: cy1, k: (cy1 - ctop - 30) / Vmax };
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      // heater under the cylinder glows with T
      var hot = clamp((s.T - 200) / 700, 0, 1);
      if (proc !== 'adiabatic') {   // adiabatic: insulated, no heater
        g.strokeStyle = TV.heat(hot, 0.35 + 0.65 * hot); g.lineWidth = 3; g.beginPath();
        for (var x = cx0 + 8, k = 0; x <= cx1 - 8; x += 10, k++) g.lineTo(x, cy1 + 12 + (k % 2 ? 8 : 0));
        g.stroke();
      } else { g.fillStyle = TV.alpha(ctx.color('--muted'), 0.25); g.fillRect(cx0 - 10, ctop, 8, cy1 - ctop + 10); g.fillRect(cx1 + 2, ctop, 8, cy1 - ctop + 10); g.fillRect(cx0 - 10, cy1 + 2, cx1 - cx0 + 20, 8); }
      // gas and molecules
      g.fillStyle = TV.heat(hot, 0.14); g.fillRect(cx0, py, cw, cy1 - py);
      var sp = 0.25 * Math.sqrt(s.T / 300);
      mol.forEach(function (m) {
        g.fillStyle = TV.heat(hot + 0.3 * (m.s - 1));   // colour by the gas temperature, faster molecules a little hotter
        if (dt) {
          m.x += m.dx * m.s * sp * dt * 300 / cw; m.y += m.dy * m.s * sp * dt * 300 / Math.max(30, cy1 - py);
          if (m.x < 0) { m.x = -m.x; m.dx = Math.abs(m.dx); } if (m.x > 1) { m.x = 2 - m.x; m.dx = -Math.abs(m.dx); }
          if (m.y < 0) { m.y = -m.y; m.dy = Math.abs(m.dy); } if (m.y > 1) { m.y = 2 - m.y; m.dy = -Math.abs(m.dy); }
        }
        m.x = clamp(m.x, 0, 1); m.y = clamp(m.y, 0, 1);
        g.beginPath(); g.arc(cx0 + 6 + m.x * (cw - 12), py + 6 + m.y * Math.max(0, cy1 - py - 12), 4, 0, 7); g.fill();
      });
      // cylinder walls, piston and rod
      g.strokeStyle = wire; g.lineWidth = 3;
      g.beginPath(); g.moveTo(cx0, ctop); g.lineTo(cx0, cy1); g.lineTo(cx1, cy1); g.lineTo(cx1, ctop); g.stroke();
      g.fillStyle = ctx.color('--c-body-fill'); rr(g, cx0 + 2, py - 16, cw - 4, 16, 3); g.fill(); g.stroke();
      g.lineWidth = 6; g.beginPath(); g.moveTo((cx0 + cx1) / 2, py - 16); g.lineTo((cx0 + cx1) / 2, Math.min(ctop - 10, py - 30)); g.stroke();
      if (proc === 'isochoric') { g.lineWidth = 3; g.strokeStyle = ctx.color('--muted'); [cx0 - 6, cx1 + 6].forEach(function (xx) { g.beginPath(); g.moveTo(xx, py - 22); g.lineTo(xx, py + 6); g.stroke(); }); }   // locked piston
      TV.gauge(g, ctx, cx1 + 34, ctop + 30, 24, s.p / 1000, Math.max(200, Math.ceil(s.p / 1000 / 100) * 100), 'p / kPa', U.fmtNum(s.p / 1000, 3));
      if (proc !== 'adiabatic') { TV.font(g, 14, 600); TV.text(g, 'T', cx0 - 14, cy1 + 16, fg, 'center'); }
      // right / lower panel: pV diagram or Maxwell distribution
      var o = stack ? { x0: 54, y0: h * 0.5 + 24, x1: w - 16, y1: h - 34 } : { x0: cx1 + 120, y0: 30, x1: w - 16, y1: h - 40 };
      if (o.x1 - o.x0 < 120) return;
      if (show === 'pv') {
        var pmax = cfg.pmax || 600;   // kPa
        var A = axes(g, ctx, Object.assign(o, { xmin: 0, xmax: Vmax, ymin: 0, ymax: pmax, xlab: 'V / L', ylab: 'p / kPa' }));
        g.save(); g.beginPath(); g.rect(o.x0, o.y0, o.x1 - o.x0, o.y1 - o.y0); g.clip();
        (cfg.isotherms || [200, 400, 600, 800]).forEach(function (Ti) { iso(Ti, ctx.color('--line'), 1.2); });
        iso(s.T, ctx.color('--c-1'), 2.5);
        if (proc === 'adiabatic') {   // the adiabat pV^γ = const through the start state
          g.strokeStyle = ctx.color('--c-3'); g.lineWidth = 2.5; g.setLineDash([7, 4]); g.beginPath();
          for (var va = 0.3; va <= Vmax + 0.001; va += 0.05) { var pa = n * R * T1 / (Vmax / 1000) * Math.pow(Vmax / va, GAM) / 1000; if (va === 0.3) g.moveTo(A.X(va), A.Y(pa)); else g.lineTo(A.X(va), A.Y(pa)); }
          g.stroke(); g.setLineDash([]);
        }
        g.strokeStyle = TV.alpha(ctx.color('--c-2'), 0.7); g.lineWidth = 2; g.beginPath();
        trail.forEach(function (q, i) { var xx = A.X(q.V), yy = A.Y(q.p / 1000); if (i) g.lineTo(xx, yy); else g.moveTo(xx, yy); });
        g.stroke(); g.restore();
        g.fillStyle = ctx.color('--c-2'); g.beginPath(); g.arc(A.X(s.V), A.Y(Math.min(s.p / 1000, pmax)), 6, 0, 7); g.fill();
      } else if (show === 'maxwell') {
        var vmax = cfg.vmax || 2000, fmax = 0.0035;
        var B = axes(g, ctx, Object.assign(o, { xmin: 0, xmax: vmax, ymin: 0, ymax: fmax * 1000, xlab: 'v / (m/s)', ylab: 'f(v) / (10⁻³ s/m)' }));
        g.strokeStyle = ctx.color('--line'); g.lineWidth = 1.2; mcurve(B, 300, true);
        g.strokeStyle = ctx.color('--c-1'); g.lineWidth = 2.5; mcurve(B, s.T);
        var vp = Math.sqrt(2 * R * s.T / M), va = Math.sqrt(8 * R * s.T / (Math.PI * M));
        [[vp, 'v_p'], [va, 'v̄'], [s.vrms, 'v_{rms}']].forEach(function (q, i) {
          var xx = B.X(q[0]); if (xx > o.x1) return;
          g.strokeStyle = muted; g.setLineDash([4, 3]); g.lineWidth = 1; g.beginPath(); g.moveTo(xx, o.y0 + 14 * i + 10); g.lineTo(xx, o.y1); g.stroke(); g.setLineDash([]);
          TV.font(g, 12, 600); TV.text(g, q[1], xx + 4, o.y0 + 14 * i + 10, fg, 'left', bg);
        });
      }
      function iso(Ti, c, wd, label) {
        g.strokeStyle = c; g.lineWidth = wd; g.beginPath();
        for (var v = 0.2; v <= Vmax; v += 0.05) { var pp = n * R * Ti / (v / 1000) / 1000, xx = A.X(v), yy = A.Y(pp); if (v === 0.2) g.moveTo(xx, yy); else g.lineTo(xx, yy); }
        g.stroke();
      }
      function mcurve(B, Ti) { g.beginPath(); for (var v = 0; v <= vmax; v += 10) { var yy = B.Y(PH.maxwell(v, Ti, M) * 1000); if (v) g.lineTo(B.X(v), yy); else g.moveTo(B.X(v), yy); } g.stroke(); }
    }
    // drag the piston (free and isothermal processes)
    if (proc === 'free' || proc === 'isothermal' || proc === 'adiabatic') TV.drag(cv.canvas, function (x, y) { return !F.locked && x > geo.x0 && x < geo.x1 && Math.abs(y - geo.py + 8) < 22; },
      function (x, y) { F.set({ V: Math.round(clamp((geo.cy1 - y) / geo.k, Vmin, Vmax) * 20) / 20 }); });
    ctx.onTheme(function () { legend(); cv.redraw(); }); ctx.onLang(function () { legend(); readouts(); cv.redraw(); });
    legend(); readouts();
    return Object.assign({ destroy: cv.destroy }, F.api);
  });

  // ================================================================ humidity
  TDC.widgets.register('humidity', function (host, cfg, ctx) {
    var tmin = cfg.tmin != null ? cfg.tmin : -10, tmax = cfg.tmax != null ? cfg.tmax : 40, heatDT = cfg.heaterDT || 6;
    var defs = [{ id: 't', tex: 't', min: tmin, max: tmax, step: 0.5, value: 22, unit: '°C' },
                { id: 'phi', tex: 'φ', min: 5, max: 100, step: 1, value: 60, unit: '%' },
                { id: 'ts', tex: 't_s', min: tmin, max: tmax, step: 0.5, value: 10, unit: '°C' }];
    var F = TV.frame(host, cfg, ctx, defs, function () { readouts(); cv.redraw(); });
    var heater = false;
    if (cfg.heater !== false) {
      var hb = TDC.util.el('button', { type: 'button', class: 'btn btn-small btn-ghost', 'aria-pressed': 'false' });
      var lab = function () { hb.textContent = ctx.t(heater ? 'th.hum.heaterOff' : 'th.hum.heaterOn'); hb.setAttribute('aria-pressed', String(heater)); };
      hb.addEventListener('click', function () { heater = !heater; lab(); readouts(); cv.redraw(); });
      lab(); F.controls.appendChild(hb); ctx.onLang(lab);
    }
    var cv = V.canvas(F.stage, { aspect: function (w) { return w < 560 ? 1.15 : 0.48; }, draw: draw, animate: false });
    function calc(p) {
      var sat = PH.satVapour(p.t), rhoV = p.phi / 100 * sat.rho, td = PH.dewPoint(rhoV), ts = p.ts + (heater ? heatDT : 0);
      return { rhoS: sat.rho, rhoV: rhoV, pS: sat.p, pV: p.phi / 100 * sat.p, td: td, ts: ts, wet: ts <= td };
    }
    function readouts() {
      var p = F.p(), s = calc(p);
      TV.reads(F, cfg, p, s, [
        { tex: 'ρ_s(t)', value: s.rhoS, unit: 'g/m³' }, { tex: 'ρ_v = φρ_s', value: s.rhoV, unit: 'g/m³' },
        { tex: 'p_v = φp_s', value: s.pV, unit: 'kPa' }, { tex: 't_d', value: s.td, unit: '°C' },
        heater ? { tex: 't_s', value: s.ts, unit: '°C' } : null,
        { label: TV.L('th.hum.surface'), value: ctx.t(s.wet ? 'th.hum.wet' : 'th.hum.dry'), warn: s.wet }]);
      F.answer = function () { return cfg.answer ? cfg.answer(p, s) : { v: s.td }; };
    }
    function draw(g, w, h) {
      var p = F.p(), s = calc(p), fg = ctx.color('--fg'), muted = ctx.color('--muted'), wire = ctx.color('--c-wire'), bg = ctx.color('--surface-2');
      var stack = w < 560, bw = stack ? Math.min(180, w * 0.5) : Math.min(170, w * 0.26), bx = stack ? (w - bw) / 2 : 16, by = 22, bh = stack ? h * 0.42 - 30 : h - 60;
      g.clearRect(0, 0, w, h);
      // electrical cabinet: door, DIN rail with breakers, heater at the bottom; droplets when the wall is below the dew point
      g.fillStyle = ctx.color('--c-body-fill'); g.strokeStyle = wire; g.lineWidth = 3; rr(g, bx, by, bw, bh, 6); g.fill(); g.stroke();
      g.lineWidth = 2; g.beginPath(); g.moveTo(bx + 12, by + bh * 0.3); g.lineTo(bx + bw - 12, by + bh * 0.3); g.stroke();
      for (var i = 0; i < 5; i++) { rr(g, bx + 16 + i * (bw - 32) / 5, by + bh * 0.3 - 16, (bw - 32) / 5 - 4, 32, 3); g.stroke(); }
      g.strokeStyle = heater ? ctx.color('--c-2') : muted; g.beginPath();
      for (var x = bx + 20, k = 0; x <= bx + bw - 20; x += 8, k++) g.lineTo(x, by + bh - 18 + (k % 2 ? 6 : 0));
      g.stroke();
      if (s.wet) {
        g.fillStyle = TV.alpha(ctx.color('--c-electron'), 0.8);
        // condensate forms on the cold walls and ceiling of the cabinet (the cold surface t_s), not in the air
        for (var j = 0; j < 16; j++) {
          var side = j % 4, k2 = Math.floor(j / 4), dx, dy;
          if (side === 3) { dx = bx + 18 + k2 * (bw - 36) / 3; dy = by + 12; }                   // hanging from the ceiling
          else { dx = side === 0 ? bx + 7 : side === 1 ? bx + bw - 7 : bx + (k2 % 2 ? 7 : bw - 7); dy = by + bh * (0.42 + 0.13 * k2 + (side === 2 ? 0.06 : 0)); }
          g.beginPath(); g.arc(dx, dy, 3, 0, 7); g.moveTo(dx - 3, dy); g.lineTo(dx, dy - 7); g.lineTo(dx + 3, dy); g.fill();
        }
      }
      TV.font(g, 12, 600); TV.text(g, ctx.t(s.wet ? 'th.hum.wet' : 'th.hum.dry'), bx + bw / 2, by + bh + 16, s.wet ? ctx.color('--c-2') : ctx.color('--c-3'), 'center');
      // saturation curve ρ_s(t) with the state point and the dew point
      var o = stack ? { x0: 46, y0: h * 0.5 + 10, x1: w - 14, y1: h - 34 } : { x0: bx + bw + 64, y0: 26, x1: w - 14, y1: h - 40 };
      var ymax = cfg.ymax || Math.ceil(PH.satVapour(tmax).rho / 10) * 10;
      var A = axes(g, ctx, Object.assign(o, { xmin: tmin, xmax: tmax, ymin: 0, ymax: ymax, xlab: 't / °C', ylab: 'ρ / (g/m³)' }));
      g.strokeStyle = ctx.color('--c-1'); g.lineWidth = 2.5; g.beginPath();
      for (var tt = tmin; tt <= tmax; tt += 0.25) { var yy = A.Y(PH.satVapour(tt).rho); if (tt === tmin) g.moveTo(A.X(tt), yy); else g.lineTo(A.X(tt), yy); }
      g.stroke();
      TV.font(g, 12, 600); TV.text(g, 'ρ_s', A.X(tmax) - 4, A.Y(PH.satVapour(tmax).rho) + 14, ctx.color('--c-1'), 'right', bg);
      var X = A.X(p.t), Y = A.Y(s.rhoV), Xd = A.X(clamp(s.td, tmin, tmax)), Xs = A.X(clamp(s.ts, tmin, tmax));
      g.strokeStyle = muted; g.lineWidth = 1.2; g.setLineDash([5, 4]);
      g.beginPath(); g.moveTo(X, Y); g.lineTo(Xd, Y); g.lineTo(Xd, o.y1); g.stroke(); g.setLineDash([]);
      g.strokeStyle = s.wet ? ctx.color('--c-2') : ctx.color('--c-3'); g.lineWidth = 2; g.beginPath(); g.moveTo(Xs, o.y0); g.lineTo(Xs, o.y1); g.stroke();
      TV.text(g, 't_s', Xs + 4, o.y0 + 8, g.strokeStyle, 'left', bg);
      TV.text(g, 't_d', Xd, o.y1 - 10, fg, Xd < X ? 'right' : 'left', bg);
      g.fillStyle = ctx.color('--c-2'); g.beginPath(); g.arc(X, Y, 6, 0, 7); g.fill();
    }
    ctx.onTheme(function () { cv.redraw(); }); ctx.onLang(function () { readouts(); cv.redraw(); });
    readouts();
    return Object.assign({ destroy: cv.destroy }, F.api);
  });
})(window.TDC);

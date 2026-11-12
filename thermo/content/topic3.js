/* Topic 3: Temperature and thermal expansion. Source: source/extracted/pages/ph2-3/p01-p15.png (errata applied, see PDF-ERRATA.md).
 * NO answers in this file: they live in src/answers/topic3.json. Block ids are stable; never rename. */
(function () {
  'use strict';

  function T(en, fi) { return { en: en, fi: fi }; }

  // ---------- small canvas helpers (pure) ----------
  function line(g, x1, y1, x2, y2) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
  function hexMix(a, b, f) {
    var re = /#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i, pa = re.exec(a), pb = re.exec(b);
    if (!pa || !pb) return b;
    f = Math.max(0, Math.min(1, f));
    var c = [1, 2, 3].map(function (i) { return Math.round(parseInt(pa[i], 16) * (1 - f) + parseInt(pb[i], 16) * f); });
    return 'rgb(' + c.join(',') + ')';
  }
  function fsz(w) { return Math.max(11, Math.min(14, Math.round(w / 48))); }
  function nf(v, d) { return TDC.util.fmtNum(v, d); }
  function withVals(params, vals) {
    return params.map(function (p) { var q = Object.assign({}, p); if (vals && vals[p.id] != null) q.value = vals[p.id]; return q; });
  }

  /** Device widget: sliders + canvas + readouts as one 'custom' config.
   *  def: {params, aspect, draw(g,w,h,p,ctx,TV), outputs(p) -> [{tex|label, value, unit, digits, warn}], answer(p) -> {v}}.
   *  Redraws on slider, theme and language change; takes part in widget quiz tasks (getAnswer). */
  function dev(def, vals) {
    return {
      mount: function (host, ctx) {
        var V = TDC.viz, TV = TDC.thermoViz, U = TDC.util, el = U.el;
        var save = U.debounce(function () { ctx.setState(Object.assign({}, panel.values)); }, 400);
        var panel = V.params(withVals(def.params, vals), function () { update(); save(); }, ctx);
        var stage = el('div', { class: 'thermo-stage' }), reads = el('div', { class: 'readout-list' });
        host.append(el('div', { class: 'plot-widget thermo-widget' }, [panel, stage, reads]));
        var cv = V.canvas(stage, { aspect: def.aspect || function (w) { return w < 520 ? 0.85 : 0.5; }, animate: false,
          draw: function (g, w, h) { def.draw(g, w, h, panel.values, ctx, TV); } });
        var saved = ctx.getState(); if (saved) panel.setValues(saved);
        function update() {
          cv.redraw();
          reads.innerHTML = '';
          def.outputs(panel.values).forEach(function (o) {
            var lab = o.tex ? TDC.formula.el(o.tex) : el('span', {}, ctx.tx(o.label));
            var val = typeof o.value === 'number' ? TV.fmt(o.value, o.unit, o.digits) : typeof o.value === 'object' ? ctx.tx(o.value) : o.value;
            reads.appendChild(el('div', { class: 'readout' + (o.warn ? ' readout-warn' : '') }, [lab, el('b', {}, ' = ' + val)]));
          });
        }
        ctx.onTheme(function () { cv.redraw(); });
        ctx.onLang(update);
        update();
        return {
          destroy: cv.destroy,
          getAnswer: function () { return def.answer ? def.answer(panel.values) : {}; },
          getAnswerState: function () { return Object.assign({}, panel.values); },
          setAnswerState: function (st) { if (st) { panel.setValues(st); update(); } },
          lock: function () { host.querySelectorAll('input, button, select').forEach(function (i) { i.disabled = true; }); }
        };
      }
    };
  }

  // ---------- device 1: overhead line sag ----------
  var AL = 25e-6; // aluminium, table value near 20 C
  function sagState(p) {
    var L = p.L, f0 = 0.025 * L, l0 = L + 8 * f0 * f0 / (3 * L);     // parabola: l = L + 8f^2/(3L); sag 2.5 % of the span at 20 C
    var dl = TDC.thermo.linExp(AL, l0, p.t - 20), l = l0 + dl;
    return { l0: l0, dl: dl, l: l, f: l > L ? Math.sqrt(3 * L * (l - L) / 8) : 0 };
  }
  var SAG = {
    aspect: function (w) { return w < 520 ? 0.8 : 0.45; },
    params: [
      { id: 'L', tex: 'L', min: 50, max: 400, step: 10, value: 200, unit: 'm' },
      { id: 't', tex: 't', min: -30, max: 40, step: 1, value: -20, unit: '°C' }
    ],
    draw: function (g, w, h, p, ctx, TV) {
      var s = sagState(p), fg = ctx.color('--fg'), mu = ctx.color('--muted'), wire = ctx.color('--c-wire'), fs = fsz(w);
      var x0 = w * 0.1, x1 = w * 0.9, yT = h * 0.16, gy = h * 0.9, ysc = h * 0.5 / 14, xm = (x0 + x1) / 2;
      g.clearRect(0, 0, w, h);
      g.fillStyle = TV.alpha(wire, 0.18); g.fillRect(0, gy, w, h - gy);
      g.strokeStyle = wire; g.lineWidth = 2; line(g, 0, gy, w, gy);
      [x0, x1].forEach(function (x) { g.lineWidth = 5; line(g, x, gy, x, yT - 4); g.lineWidth = 3; line(g, x - 16, yT, x + 16, yT); });
      function curve(f, c, dash, lw) {
        g.strokeStyle = c; g.lineWidth = lw; g.setLineDash(dash || []); g.beginPath();
        for (var i = 0; i <= 40; i++) { var u = i / 40, x = x0 + (x1 - x0) * u, y = yT + 4 * f * u * (1 - u) * ysc; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
        g.stroke(); g.setLineDash([]);
      }
      curve(0.025 * p.L, mu, [6, 5], 1.5);
      var hot = p.t > 20, col = hot ? ctx.color('--c-flow') : ctx.color('--c-electron');
      curve(s.f, col, null, 3);
      g.strokeStyle = mu; g.lineWidth = 1; g.setLineDash([3, 4]); line(g, x0, yT, x1, yT); g.setLineDash([]);
      TV.arrow(g, xm, yT, xm, yT + s.f * ysc, fg, 2);
      TV.font(g, fs, 600);
      TV.text(g, 'f = ' + nf(s.f, 3) + ' m', xm + 8, yT + s.f * ysc / 2 + 2, fg, 'left', ctx.color('--surface'));
      TV.text(g, 't = ' + nf(p.t, 3) + ' °C', 8, 14, col, 'left');
      TV.text(g, 'L = ' + nf(p.L, 3) + ' m', xm, gy - 12, fg, 'center');
      TV.font(g, fs - 1, 500);
      TV.text(g, ctx.tx(T('dashed: 20 °C (vertical scale exaggerated)', 'katkoviiva: 20 °C (pystymittakaava liioiteltu)')), w - 8, 14, mu, 'right');
    },
    outputs: function (p) {
      var s = sagState(p);
      return [
        { tex: 'l_0', value: s.l0, unit: 'm', digits: 6 },
        { tex: 'Δl', value: s.dl, unit: 'm', digits: 3 },
        { tex: 'l', value: s.l, unit: 'm', digits: 6 },
        { tex: 'f', value: s.f, unit: 'm', digits: 3 }
      ];
    },
    answer: function (p) { return { v: p.t + 273.15 }; }   // quiz: the temperature (K) at which the sag has a given value
  };

  // ---------- device 2: bimetal thermostat ----------
  var BI = { ab: 19e-6, as: 12e-6, L: 0.05, h: 0.001 };      // brass on steel, 50 mm x 1 mm strip, straight at 20 C
  BI.k = 3 * (BI.ab - BI.as) * BI.L * BI.L / (4 * BI.h);      // tip deflection per kelvin (m/K), equal-modulus strip: d = 3(a1-a2)dT L^2 / (4h)
  function biState(p) {
    var dT = p.t - 20, d = BI.k * dT;                          // free tip deflection (m), positive = towards the steel side
    return { dT: dT, d: d, trip: 20 + p.g * 1e-3 / BI.k, closed: d <= p.g * 1e-3 };
  }
  var BIMETAL = {
    params: [
      { id: 't', tex: 't', min: 0, max: 120, step: 1, value: 20, unit: '°C' },
      { id: 'g', tex: 'g', min: 0.2, max: 1, step: 0.01, value: 0.5, unit: 'mm' }
    ],
    draw: function (g, w, h, p, ctx, TV) {
      var s = biState(p), fg = ctx.color('--fg'), mu = ctx.color('--muted'), wire = ctx.color('--c-wire'), fs = fsz(w);
      var x0 = w * 0.12, Ls = w * 0.5, y0 = h * 0.42, sc = h * 0.26 / 1.4, xt = x0 + Ls;
      var dmm = s.d * 1e3, disp = Math.max(dmm, p.g) * sc, col = hexMix(ctx.color('--c-electron'), ctx.color('--c-flow'), p.t / 120);
      g.clearRect(0, 0, w, h);
      g.fillStyle = TV.alpha(col, 0.12); g.fillRect(0, 0, w, h);
      // clamp
      g.fillStyle = wire; g.fillRect(x0 - 16, y0 - 22, 16, 44);
      // strip: brass layer on the side that bends away, steel layer under it
      function layer(off, c) {
        g.strokeStyle = c; g.lineWidth = 7; g.beginPath();
        for (var i = 0; i <= 30; i++) { var u = i / 30, x = x0 + Ls * u, y = y0 + off + disp * u * u; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
        g.stroke();
      }
      layer(-3.5, ctx.color('--c-2')); layer(3.5, ctx.color('--c-1'));
      // fixed contact above the tip (set by the screw): closed while the strip is still pressed against it
      var yc = y0 + p.g * sc - 8;
      g.fillStyle = wire; g.fillRect(xt - 10, yc - 10, 20, 10);
      g.strokeStyle = wire; g.lineWidth = 3; line(g, xt, yc - 10, xt, h * 0.08);
      // where the free tip would be
      g.strokeStyle = mu; g.lineWidth = 1.5; g.setLineDash([3, 3]); g.beginPath(); g.arc(xt, y0 + dmm * sc, 5, 0, 7); g.stroke(); g.setLineDash([]);
      // heater lamp
      var lx = w * 0.86, ly = h * 0.42, lr = Math.min(h * 0.09, 26);
      g.strokeStyle = wire; g.lineWidth = 2; g.beginPath(); g.moveTo(xt, h * 0.08); g.lineTo(lx, h * 0.08); g.lineTo(lx, ly - lr); g.stroke();
      g.fillStyle = s.closed ? ctx.color('--c-flow') : ctx.color('--surface-2');
      g.beginPath(); g.arc(lx, ly, lr, 0, 7); g.fill(); g.stroke();
      line(g, lx - lr * 0.7, ly - lr * 0.7, lx + lr * 0.7, ly + lr * 0.7); line(g, lx - lr * 0.7, ly + lr * 0.7, lx + lr * 0.7, ly - lr * 0.7);
      TV.font(g, fs, 700);
      TV.text(g, ctx.tx(s.closed ? T('heater ON', 'lämmitin PÄÄLLÄ') : T('heater OFF', 'lämmitin POIS')), lx, ly + lr + 16, s.closed ? ctx.color('--c-flow') : mu, 'center');
      TV.text(g, 't = ' + nf(p.t, 3) + ' °C', 8, 14, fg, 'left');
      TV.font(g, fs - 1, 500);
      TV.text(g, ctx.tx(T('brass', 'messinki')), x0 + 6, y0 - 22, ctx.color('--c-2'), 'left');
      TV.text(g, ctx.tx(T('steel', 'teräs')), x0 + 6, y0 + 24, ctx.color('--c-1'), 'left');
      TV.text(g, ctx.tx(T('contact', 'koskettimet')), xt, yc - 20, fg, 'center');
      TV.text(g, ctx.tx(T('bend exaggerated', 'taipuma liioiteltu')), w - 8, h - 12, mu, 'right');
    },
    outputs: function (p) {
      var s = biState(p), lin = TDC.thermo.linExp;
      return [
        { tex: 'Δl_{brass}', value: lin(BI.ab, BI.L, s.dT), unit: 'm', digits: 3 },
        { tex: 'Δl_{steel}', value: lin(BI.as, BI.L, s.dT), unit: 'm', digits: 3 },
        { tex: 'δ', value: s.d, unit: 'm', digits: 3 },
        { label: T('Switch-off temperature', 'Katkaisulämpötila'), value: nf(s.trip, 3) + ' °C' },
        { label: T('Contact', 'Kosketin'), value: s.closed ? T('closed (heating)', 'kiinni (lämmittää)') : T('open (heating off)', 'auki (lämmitys pois)'), warn: !s.closed }
      ];
    },
    answer: function (p) { return { v: p.g }; }
  };

  // ---------- device 3: Pt100 ----------
  var PT = { R0: 100, a: 0.00385 };
  var PT100 = {
    params: [{ id: 't', tex: 't', min: -50, max: 250, step: 1, value: 20, unit: '°C' }],
    draw: function (g, w, h, p, ctx, TV) {
      var fg = ctx.color('--fg'), mu = ctx.color('--muted'), fs = fsz(w), R = PT.R0 * (1 + PT.a * p.t), col = hexMix(ctx.color('--c-electron'), ctx.color('--c-flow'), (p.t + 50) / 300);
      var bx = w * 0.06, bw = w * 0.88, by = h * 0.2, bh = 16;
      g.clearRect(0, 0, w, h);
      var gr = g.createLinearGradient(bx, 0, bx + bw, 0); gr.addColorStop(0, ctx.color('--c-electron')); gr.addColorStop(1, ctx.color('--c-flow'));
      g.fillStyle = gr; g.fillRect(bx, by, bw, bh);
      TV.font(g, fs - 1, 500);
      for (var k = -50; k <= 250; k += 50) {
        var x = bx + bw * (k + 50) / 300; g.strokeStyle = fg; g.lineWidth = 1; line(g, x, by + bh, x, by + bh + 5);
        TV.text(g, String(k), x, by + bh + 15, mu, 'center');
      }
      [0, 100].forEach(function (k) { var x = bx + bw * (k + 50) / 300; g.strokeStyle = fg; g.lineWidth = 2; line(g, x, by - 8, x, by + bh); TV.text(g, k === 0 ? ctx.tx(T('ice 0 °C', 'jää 0 °C')) : ctx.tx(T('steam 100 °C', 'höyry 100 °C')), x, by - 16, fg, 'center'); });
      var mx = bx + bw * (p.t + 50) / 300;
      g.fillStyle = fg; g.beginPath(); g.moveTo(mx, by + bh + 22); g.lineTo(mx - 7, by + bh + 34); g.lineTo(mx + 7, by + bh + 34); g.closePath(); g.fill();
      var r = Math.min(h * 0.17, w * 0.12), cy = h * 0.68;
      TV.gauge(g, ctx, w * 0.18, cy, r, R - 60, 160, 'Pt100', nf(R, 3) + ' Ω');
      TV.font(g, fs + 1, 700);
      TV.text(g, 'T = ' + nf(p.t + 273.15, 5) + ' K', w * 0.4, cy - r * 0.55, fg, 'left');
      TV.text(g, 't = ' + nf(p.t, 4) + ' °C', w * 0.4, cy - r * 0.05, fg, 'left');
      TV.text(g, 't = ' + nf(p.t * 9 / 5 + 32, 4) + ' °F', w * 0.4, cy + r * 0.45, fg, 'left');
      // probe in a pipe
      var px = w * 0.8, pw = w * 0.14;
      g.fillStyle = TV.alpha(col, 0.35); g.fillRect(px, cy - r * 0.9, pw, r * 1.8);
      g.strokeStyle = ctx.color('--c-wire'); g.lineWidth = 3; line(g, px, cy - r * 0.9, px + pw, cy - r * 0.9); line(g, px, cy + r * 0.9, px + pw, cy + r * 0.9);
      g.fillStyle = ctx.color('--c-wire'); g.fillRect(px + pw / 2 - 3, cy - r * 1.2, 6, r * 1.6);
      g.fillStyle = col; g.fillRect(px + pw / 2 - 5, cy + r * 0.1, 10, r * 0.3);
    },
    outputs: function (p) {
      var R = PT.R0 * (1 + PT.a * p.t);
      return [
        { tex: 'T', value: p.t + 273.15, unit: 'K', digits: 5 },
        { tex: 't_F', value: p.t * 9 / 5 + 32, unit: '°F', digits: 4 },
        { tex: 'R', value: R, unit: 'Ω', digits: 5 },
        { label: T('Voltage at 1 mA', 'Jännite 1 mA:n virralla'), value: R * 1e-3, unit: 'V', digits: 4 }
      ];
    },
    answer: function (p) { return { v: p.t }; }
  };

  // ---------- device 4: pipe expansion joint ----------
  var STEEL = 12e-6;
  var PIPE = {
    params: [
      { id: 'L', tex: 'l_0', min: 10, max: 200, step: 5, value: 100, unit: 'm' },
      { id: 't', tex: 't', min: 20, max: 200, step: 5, value: 130, unit: '°C' },
      { id: 'c', tex: 'c', min: 20, max: 200, step: 10, value: 100, unit: 'mm' }
    ],
    draw: function (g, w, h, p, ctx, TV) {
      var fg = ctx.color('--fg'), mu = ctx.color('--muted'), wire = ctx.color('--c-wire'), fs = fsz(w);
      var dl = TDC.thermo.linExp(STEEL, p.L, p.t - 10), dmm = dl * 1e3, over = dmm > p.c, fr = Math.min(1, dmm / p.c);
      var xa = w * 0.1, xb = w * 0.9, xm = w / 2, yc = h * 0.5, hp = h * 0.09, bw0 = w * 0.16, bw = bw0 * (1 - 0.7 * fr);
      var col = hexMix(ctx.color('--c-electron'), ctx.color('--c-flow'), (p.t - 10) / 190);
      g.clearRect(0, 0, w, h);
      // pipes between the anchors and the bellows
      g.fillStyle = col; g.fillRect(xa, yc - hp, xm - bw / 2 - xa, 2 * hp); g.fillRect(xm + bw / 2, yc - hp, xb - xm - bw / 2, 2 * hp);
      g.strokeStyle = wire; g.lineWidth = 2.5;
      line(g, xa, yc - hp, xm - bw / 2, yc - hp); line(g, xa, yc + hp, xm - bw / 2, yc + hp); line(g, xm + bw / 2, yc - hp, xb, yc - hp); line(g, xm + bw / 2, yc + hp, xb, yc + hp);
      // bellows (accordion)
      var n = 9; g.strokeStyle = over ? ctx.color('--c-2') : wire; g.lineWidth = 3; g.beginPath();
      for (var i = 0; i <= n; i++) { var x = xm - bw / 2 + bw * i / n, y = yc - hp - (i % 2 ? 0 : 9); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
      g.stroke(); g.beginPath();
      for (i = 0; i <= n; i++) { x = xm - bw / 2 + bw * i / n; y = yc + hp + (i % 2 ? 0 : 9); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
      g.stroke();
      // anchors
      g.fillStyle = wire; g.fillRect(xa - 14, yc - hp - 22, 14, 2 * hp + 44); g.fillRect(xb, yc - hp - 22, 14, 2 * hp + 44);
      // expansion arrows
      var al = 8 + 0.15 * w * fr;
      TV.arrow(g, xa + 10, yc - hp - 18, xa + 10 + al, yc - hp - 18, ctx.color('--c-flow'), 3);
      TV.arrow(g, xb - 10, yc - hp - 18, xb - 10 - al, yc - hp - 18, ctx.color('--c-flow'), 3);
      TV.font(g, fs, 700);
      TV.text(g, 'Δl = ' + nf(dmm, 3) + ' mm', xm, h * 0.17, over ? ctx.color('--c-2') : fg, 'center');
      TV.font(g, fs - 1, 500);
      TV.text(g, ctx.tx(T('anchor', 'kiintopiste')), xa - 6, yc + hp + 36, mu, 'left');
      TV.text(g, ctx.tx(T('anchor', 'kiintopiste')), xb + 6, yc + hp + 36, mu, 'right');
      TV.text(g, ctx.tx(T('expansion joint', 'laajennusjousto')), xm, yc + hp + 26, fg, 'center');
      TV.text(g, 't = ' + nf(p.t, 3) + ' °C   l₀ = ' + nf(p.L, 3) + ' m', 8, h - 12, mu, 'left');
    },
    outputs: function (p) {
      var dl = TDC.thermo.linExp(STEEL, p.L, p.t - 10), n = Math.max(1, Math.ceil(dl * 1e3 / p.c - 1e-9));
      return [
        { tex: 'Δt', value: p.t - 10, unit: '°C', digits: 3 },
        { tex: 'Δl', value: dl, unit: 'm', digits: 3 },
        { label: T('Joints needed', 'Tarvittavia jouston kappaleita'), value: String(n), warn: n > 1 }
      ];
    },
    answer: function (p) { return { v: TDC.thermo.linExp(STEEL, p.L, p.t - 10) }; }
  };

  // ---------- device 5: clamped rail (thermal stress) ----------
  var RAIL = { alpha: 12e-6, E: 200e9, Lrail: 25, yield: 235e6 };
  var STRESS = {
    params: [
      { id: 't', tex: 't', min: -30, max: 60, step: 1, value: 50, unit: '°C' },
      { id: 'A', tex: 'A', min: 20, max: 100, step: 1, value: 77, unit: 'cm²' }
    ],
    draw: function (g, w, h, p, ctx, TV) {
      var fg = ctx.color('--fg'), mu = ctx.color('--muted'), wire = ctx.color('--c-wire'), fs = fsz(w);
      var dT = p.t - 20, sig = RAIL.alpha * RAIL.E * dT, comp = dT >= 0, f = Math.min(1, Math.abs(sig) / RAIL.yield);
      var x0 = w * 0.18, x1 = w * 0.82, yc = h * 0.34, th = h * 0.08, c = comp ? ctx.color('--c-flow') : ctx.color('--c-electron');
      g.clearRect(0, 0, w, h);
      g.fillStyle = wire; g.fillRect(x0 - 18, yc - 34, 18, 68); g.fillRect(x1, yc - 34, 18, 68);
      // free length change (exaggerated) as a dashed ghost
      var ext = Math.min(w * 0.08, Math.abs(dT) / 60 * w * 0.08);
      g.fillStyle = ctx.color('--surface-2'); g.fillRect(x0, yc - th / 2, x1 - x0, th);
      g.strokeStyle = wire; g.lineWidth = 2; g.strokeRect(x0, yc - th / 2, x1 - x0, th); line(g, x0, yc - 2, x1, yc - 2);
      g.strokeStyle = c; g.lineWidth = 2; g.setLineDash([5, 4]);
      if (comp) g.strokeRect(x1, yc - th / 2, ext, th); else g.strokeRect(x1 - ext, yc - th / 2, ext, th);
      g.setLineDash([]);
      // stress arrows
      var al = 10 + 0.12 * w * f;
      if (comp) { TV.arrow(g, x0 + 4, yc + th, x0 + 4 + al, yc + th, c, 4); TV.arrow(g, x1 - 4, yc + th, x1 - 4 - al, yc + th, c, 4); }
      else { TV.arrow(g, x0 + al, yc + th, x0 + 4, yc + th, c, 4); TV.arrow(g, x1 - al, yc + th, x1 - 4, yc + th, c, 4); }
      TV.font(g, fs, 700);
      TV.text(g, ctx.tx(comp ? T('compressive stress', 'puristusjännitys') : T('tensile stress', 'vetojännitys')), w / 2, yc - th - 14, c, 'center');
      TV.font(g, fs - 1, 500);
      TV.text(g, ctx.tx(T('dashed: free expansion (exaggerated)', 'katkoviiva: vapaa laajeneminen (liioiteltu)')), w / 2, yc + th + 22, mu, 'center');
      var r = Math.min(h * 0.16, w * 0.11);   // dial + its label stay inside the canvas
      TV.gauge(g, ctx, w * 0.3, h * 0.72, r, Math.abs(sig), RAIL.yield, ctx.tx(T('stress / yield', 'jännitys / myötöraja')), nf(Math.abs(sig) / 1e6, 3) + ' MPa');
      TV.font(g, fs, 700);
      TV.text(g, 't = ' + nf(p.t, 3) + ' °C', w * 0.55, h * 0.72, fg, 'left');
      TV.text(g, 'F = ' + nf(Math.abs(sig) * p.A * 1e-4 / 1e3, 3) + ' kN', w * 0.55, h * 0.86, fg, 'left');
    },
    outputs: function (p) {
      var dT = p.t - 20, sig = RAIL.alpha * RAIL.E * dT;
      return [
        { tex: 'σ', value: Math.abs(sig), unit: 'Pa', digits: 3, warn: Math.abs(sig) > RAIL.yield },
        { tex: 'F', value: Math.abs(sig) * p.A * 1e-4, unit: 'N', digits: 3 },
        { label: T('Without clamps the 25 m rail would change by', 'Ilman kiinnitystä 25 m kisko muuttuisi'), value: TDC.util.fmtSI(TDC.thermo.linExp(RAIL.alpha, RAIL.Lrail, dT), 'm', 3) },
        { label: T('Yield strength of steel S235 exceeded?', 'Teräksen S235 myötöraja ylittyy?'), value: Math.abs(sig) > RAIL.yield ? T('yes', 'kyllä') : T('no', 'ei') }
      ];
    },
    answer: function (p) { return { v: Math.abs(RAIL.alpha * RAIL.E * (p.t - 20)) }; }
  };

  // water density near 4 degrees (Kell/Tanaka polynomial, 0 to 30 C)
  function rhoWater(t) {
    return (999.83952 + 16.945176 * t - 7.9870401e-3 * t * t - 46.170461e-6 * t * t * t + 105.56302e-9 * Math.pow(t, 4) - 280.54253e-12 * Math.pow(t, 5)) / (1 + 16.87985e-3 * t);
  }

  function row(en, fi, a, b) { return [T(en, fi), { tex: a }, b ? { tex: b } : '—']; }

  TDC.registerTopic({
    id: 't3', num: 3,
    title: T('Temperature and thermal expansion', 'Lämpötila ja lämpölaajeneminen'),
    subtitle: T('From the thermometer to the sagging power line: how temperature is measured and why everything grows when it warms.',
                'Lämpömittarista roikkuvaan voimajohtoon: miten lämpötila mitataan ja miksi kaikki laajenee lämmetessään.'),
    objectives: [
      T('describe a system, its state and its state variables', 'kuvata systeemin, sen tilan ja tilasuureet'),
      T('convert between kelvin, degrees Celsius and degrees Fahrenheit', 'muuntaa kelvinit, celsiusasteet ja fahrenheitasteet toisikseen'),
      T('explain thermal equilibrium and the zeroth law', 'selittää termodynaamisen tasapainon ja nollannen pääsäännön'),
      T('calculate linear, area and volume expansion of solids and liquids', 'laskea kiinteiden aineiden ja nesteiden pituuden, pinta-alan ja tilavuuden laajenemisen'),
      T('calculate the thermal stress of a clamped bar', 'laskea kiinnitetyn sauvan lämpöjännityksen'),
      T('apply all this to power lines, thermostats, Pt100 sensors and pipelines', 'soveltaa kaikkea voimajohtoihin, termostaatteihin, Pt100-antureihin ja putkistoihin')
    ],
    glossary: {
      system: { en: 'system', fi: 'systeemi', def: T('An object or set of objects separated from its surroundings (the environment) by a real or imaginary boundary.', 'Kappale tai kappaleiden joukko, joka on erotettu ympäristöstään todellisella tai kuvitellulla rajalla.') },
      statevariable: { en: 'state variable', fi: 'tilasuure', def: T('A macroscopic quantity that describes the state of a system, e.g. temperature, pressure, volume.', 'Makroskooppinen suure, joka kuvaa systeemin tilaa, esim. lämpötila, paine ja tilavuus.') },
      temperature: { en: 'temperature', fi: 'lämpötila', sym: 'T, t', def: T('State variable that tells which way thermal energy flows. Unit kelvin (K) or degree Celsius (°C).', 'Tilasuure, joka kertoo, mihin suuntaan lämpöenergia siirtyy. Yksikkö kelvin (K) tai celsiusaste (°C).') },
      temperaturescale: { en: 'temperature scale', fi: 'lämpötila-asteikko', def: T('A rule that assigns numbers to temperatures: kelvin, Celsius, Fahrenheit.', 'Sääntö, joka antaa lämpötiloille lukuarvot: kelvin, celsius, fahrenheit.') },
      kelvin: { en: 'kelvin', fi: 'kelvin', sym: 'K', def: T('SI unit of thermodynamic temperature; 0 K is absolute zero.', 'Termodynaamisen lämpötilan SI-yksikkö; 0 K on absoluuttinen nollapiste.') },
      celsius: { en: 'degree Celsius', fi: 'celsiusaste', sym: '°C', def: T('Same size as the kelvin; 0 °C = 273.15 K.', 'Kelvinin kokoinen yksikkö; 0 °C = 273,15 K.') },
      equilibrium: { en: 'thermodynamic equilibrium', fi: 'termodynaaminen tasapaino', def: T('Systems in contact have the same temperature and no net energy flows between them.', 'Kosketuksissa olevilla systeemeillä on sama lämpötila eikä niiden välillä siirry nettoenergiaa.') },
      zeroth: { en: 'zeroth law of thermodynamics', fi: 'termodynamiikan nollas pääsääntö', def: T('If A and B are each in thermal equilibrium with C, then A and B are in equilibrium with each other.', 'Jos A ja B ovat kumpikin lämpötasapainossa C:n kanssa, ne ovat tasapainossa keskenään.') },
      thermalexp: { en: 'thermal expansion', fi: 'lämpölaajeneminen', def: T('Growth of length, area or volume of a material when its temperature rises.', 'Materiaalin pituuden, pinta-alan tai tilavuuden kasvu lämpötilan noustessa.') },
      alpha: { en: 'coefficient of linear expansion', fi: 'pituuden lämpötilakerroin', sym: 'α', def: T('Relative change of length per kelvin: Δl = α l₀ ΔT. Unit 1/K.', 'Suhteellinen pituuden muutos kelviniä kohti: Δl = α l₀ ΔT. Yksikkö 1/K.') },
      beta: { en: 'coefficient of volume expansion', fi: 'tilavuuden lämpötilakerroin', sym: 'β', def: T('Relative change of volume per kelvin: ΔV = β V₀ ΔT. For isotropic solids β = 3α.', 'Suhteellinen tilavuuden muutos kelviniä kohti: ΔV = β V₀ ΔT. Isotrooppisille kiinteille aineille β = 3α.') },
      thermalstress: { en: 'thermal stress', fi: 'lämpöjännitys', sym: 'σ', def: T('Stress that arises when thermal expansion or contraction is prevented: σ = α E ΔT.', 'Jännitys, joka syntyy, kun lämpölaajenemista tai -kutistumista estetään: σ = α E ΔT.') },
      young: { en: 'modulus of elasticity (Young’s modulus)', fi: 'kimmokerroin', sym: 'E', def: T('Stiffness of a material: σ = E ε. Steel about 200 GPa.', 'Materiaalin jäykkyys: σ = E ε. Teräksellä noin 200 GPa.') },
      bimetal: { en: 'bimetal strip', fi: 'bimetalli', def: T('Two metals with different α bonded together; it bends when the temperature changes.', 'Kaksi eri α:n metallia liitettynä yhteen; taipuu lämpötilan muuttuessa.') },
      pt100: { en: 'Pt100 sensor', fi: 'Pt100-anturi', def: T('Platinum resistance thermometer with R = 100 Ω at 0 °C.', 'Platinavastusanturi, jonka resistanssi on 100 Ω 0 °C:ssa.') }
    },
    formulas: [
      { name: T('Kelvin from Celsius', 'Kelvin celsiusasteista'), tex: 'T = t + 273.15' },
      { name: T('Celsius from Fahrenheit', 'Celsius fahrenheitista'), tex: 't_C = {5}/{9}(t_F − 32)' },
      { name: T('Linear expansion', 'Pituuden lämpölaajeneminen'), tex: 'Δl = α · l_0 · ΔT' },
      { name: T('Area expansion', 'Pinta-alan lämpölaajeneminen'), tex: 'ΔA = 2α · A_0 · ΔT' },
      { name: T('Volume expansion', 'Tilavuuden lämpölaajeneminen'), tex: 'ΔV = β · V_0 · ΔT' },
      { name: T('Thermal stress', 'Lämpöjännitys'), tex: 'σ = α · E · ΔT' },
      { name: T('Pt100 resistance', 'Pt100-anturin resistanssi'), tex: 'R = R_0(1 + α t)' }
    ],
    sections: [
      // ================= 1. system and state =================
      {
        id: 't3-system', title: T('System and state', 'Systeemi ja tila'),
        blocks: [
          { id: 't3-sys-p1', type: 'text', html: T(
            '<p>A <dfn data-term="system">system</dfn> is an object or a set of objects separated from its surroundings by a visible or invisible barrier. The surroundings are the <b>environment</b>. A gas in a container, a single molecule, a car engine, a human body or the Earth can each be a system.</p>' +
            '<p>We can describe the <b>state</b> of a system microscopically or macroscopically. A <b>microscopic</b> description follows the motion of every atom or molecule. A <b>macroscopic</b> description uses quantities an instrument can measure: temperature, volume, pressure, mass. These are the <dfn data-term="statevariable">state variables</dfn>, and <b>thermodynamics</b> describes a system with them.</p>',
            '<p><dfn data-term="system">Systeemi</dfn> on kappale tai kappaleiden joukko, joka on erotettu ympäristöstään näkyvällä tai näkymättömällä rajalla. Ympäristö on systeemin <b>ulkopuolinen maailma</b>. Systeemi voi olla esimerkiksi astiassa oleva kaasu, yksittäinen molekyyli, auton moottori, ihmiskeho tai Maa.</p>' +
            '<p>Systeemin <b>tilaa</b> voi kuvata mikroskooppisesti tai makroskooppisesti. <b>Mikroskooppinen</b> kuvaus seuraa jokaisen atomin tai molekyylin liikettä. <b>Makroskooppinen</b> kuvaus käyttää mittarilla mitattavia suureita: lämpötila, tilavuus, paine, massa. Nämä ovat <dfn data-term="statevariable">tilasuureita</dfn>, ja <b>termodynamiikka</b> kuvaa systeemiä niiden avulla.</p>') },
          { id: 't3-sys-fig', type: 'figure',
            svg: { en: '<svg viewBox="0 0 320 150" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="312" height="142" rx="10" fill="none" stroke="currentColor" stroke-dasharray="5 4"/><ellipse cx="110" cy="75" rx="82" ry="52" fill="var(--c-electron)" fill-opacity=".25" stroke="currentColor" stroke-width="2"/><text x="110" y="70" text-anchor="middle" font-size="15" fill="currentColor">system</text><text x="110" y="90" text-anchor="middle" font-size="12" fill="currentColor">p, V, T, m</text><text x="240" y="40" text-anchor="middle" font-size="13" fill="currentColor">environment</text><path d="M196 80 h50" stroke="var(--c-flow)" stroke-width="3" marker-start="url(#t3sysb)" marker-end="url(#t3sysa)"/><defs><marker id="t3sysa" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8z" fill="var(--c-flow)"/></marker><marker id="t3sysb" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="8" refX="2" refY="4" orient="auto"><path d="M8 0 L0 4 L8 8z" fill="var(--c-flow)"/></marker></defs><text x="240" y="104" text-anchor="middle" font-size="11" fill="currentColor">energy in or out</text></svg>',
                   fi: '<svg viewBox="0 0 320 150" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="312" height="142" rx="10" fill="none" stroke="currentColor" stroke-dasharray="5 4"/><ellipse cx="110" cy="75" rx="82" ry="52" fill="var(--c-electron)" fill-opacity=".25" stroke="currentColor" stroke-width="2"/><text x="110" y="70" text-anchor="middle" font-size="15" fill="currentColor">systeemi</text><text x="110" y="90" text-anchor="middle" font-size="12" fill="currentColor">p, V, T, m</text><text x="240" y="40" text-anchor="middle" font-size="13" fill="currentColor">ympäristö</text><path d="M196 80 h50" stroke="var(--c-flow)" stroke-width="3" marker-start="url(#t3sysb)" marker-end="url(#t3sysa)"/><defs><marker id="t3sysa" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8z" fill="var(--c-flow)"/></marker><marker id="t3sysb" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="8" refX="2" refY="4" orient="auto"><path d="M8 0 L0 4 L8 8z" fill="var(--c-flow)"/></marker></defs><text x="240" y="104" text-anchor="middle" font-size="11" fill="currentColor">energiaa sisään tai ulos</text></svg>' },
            caption: T('A system, its boundary and its environment.', 'Systeemi, sen raja ja ympäristö.'), alt: T('An ellipse labelled system inside a dashed box labelled environment', 'Ellipsi nimeltä systeemi katkoviivalla rajatun ympäristön sisällä') },
          { id: 't3-q1-blk', type: 'question', q: 't3-q1' }
        ]
      },
      // ================= 2. temperature scales =================
      {
        id: 't3-scales', title: T('Temperature scales and thermometers', 'Lämpötila-asteikot ja lämpömittarit'),
        blocks: [
          { id: 't3-sc-p1', type: 'text', html: T(
            '<p>Instruments that measure temperature are <b>thermometers</b>. For historical reasons there are many kinds of thermometer and many <dfn data-term="temperaturescale">temperature scales</dfn>. The three most common are kelvin, Celsius and Fahrenheit. In Europe we use only Celsius and kelvin.</p>' +
            '<p><b><dfn data-term="kelvin">Kelvin</dfn></b> (<em>T</em>) is the thermodynamic temperature scale and the base temperature scale of the SI system. Its origin is <b>absolute zero, 0 K</b>. Historically the size of the degree was defined as 1/100 of the difference between the triple point of water and the boiling point of water at standard atmospheric pressure.</p>',
            '<p>Lämpötilan mittauslaitteita sanotaan <b>lämpömittareiksi</b>. Historiallisista syistä lämpömittareita ja <dfn data-term="temperaturescale">lämpötila-asteikkoja</dfn> on monenlaisia. Yleisimmät ovat kelvin, celsius ja fahrenheit. Euroopassa käytetään vain celsius- ja kelvin-asteikkoa.</p>' +
            '<p><b><dfn data-term="kelvin">Kelvin</dfn></b> (<em>T</em>) on termodynaaminen lämpötila-asteikko ja SI-järjestelmän perusasteikko. Sen nollakohta on <b>absoluuttinen nollapiste, 0 K</b>. Historiallisesti asteen koko määriteltiin 1/100:ksi veden kolmoispisteen ja veden kiehumispisteen normaali-ilmanpaineessa erotuksesta.</p>') },
          { id: 't3-sc-tab', type: 'table', caption: T('Standard points and calibration points', 'Kiintopisteet ja kalibrointipisteet'),
            head: [T('Substance', 'Aine'), T('Definition', 'Määritelmä'), { tex: 'T / K' }],
            rows: [
              [T('Hydrogen', 'Vety'), T('triple point', 'kolmoispiste'), '13.8033'],
              [T('Oxygen', 'Happi'), T('boiling point at standard pressure', 'kiehumispiste normaalipaineessa'), '54.3584'],
              [T('Water', 'Vesi'), T('triple point (273.16 K = 0.01 °C; the slide rounds to 273.15)', 'kolmoispiste (273,16 K = 0,01 °C; kalvossa pyöristetty 273,15:ksi)'), '273.16'],
              [T('Gallium', 'Gallium'), T('melting point at standard pressure', 'sulamispiste normaalipaineessa'), '302.9146'],
              [T('Aluminium', 'Alumiini'), T('melting point at standard pressure', 'sulamispiste normaalipaineessa'), '933.473'],
              [T('Gold', 'Kulta'), T('melting point at standard pressure', 'sulamispiste normaalipaineessa'), '1337.33']
            ] },
          { id: 't3-sc-p2', type: 'text', html: T(
            '<p><b>Celsius scale (°C):</b> the size of the degree equals the kelvin. Absolute zero is −273.15 °C, water freezes at 0 °C and boils at 100 °C. To convert to kelvin:</p>',
            '<p><b>Celsius-asteikko (°C):</b> asteen koko on sama kuin kelvinin. Absoluuttinen nollapiste on −273,15 °C, vesi jäätyy 0 °C:ssa ja kiehuu 100 °C:ssa. Muunnos kelvineiksi:</p>') },
          { id: 't3-sc-f1', type: 'formula', key: true, tex: 'T = t + 273.15', label: T('Celsius to kelvin', 'Celsius kelvineiksi'),
            legend: [['T', T('thermodynamic temperature', 'termodynaaminen lämpötila'), 'K'], ['t', T('Celsius temperature', 'celsiuslämpötila'), '°C']] },
          { id: 't3-sc-p3', type: 'text', html: T(
            '<p><b>Fahrenheit scale (°F):</b> absolute zero is −459.67 °F, water freezes at 32 °F and boils at <b>212 °F</b>. The freezing–boiling interval is 180 °F, so one Fahrenheit degree is 100/180 = 5/9 of a Celsius degree:</p>',
            '<p><b>Fahrenheit-asteikko (°F):</b> absoluuttinen nollapiste on −459,67 °F, vesi jäätyy 32 °F:ssa ja kiehuu <b>212 °F</b>:ssa. Jäätymis- ja kiehumispisteen väli on 180 °F, joten yksi fahrenheitaste on 100/180 = 5/9 celsiusastetta:</p>') },
          { id: 't3-sc-f2', type: 'formula', key: true, tex: 't_C = {5}/{9}(t_F − 32)', label: T('Fahrenheit to Celsius', 'Fahrenheit celsiusasteiksi') },
          { id: 't3-sc-conv', type: 'interactive', widget: 'readout', title: T('Temperature converter', 'Lämpötilamuunnin'),
            caption: T('Drag the temperature. Note that a change of 1 K equals a change of 1 °C but 1.8 °F.', 'Vedä lämpötilaa. Huomaa, että 1 K:n muutos on 1 °C:n muutos mutta 1,8 °F:n muutos.'),
            config: {
              params: [{ id: 't', tex: 't', min: -273.15, max: 500, step: 0.05, value: 20, unit: '°C' }],
              outputs: function (v) { return [{ tex: 'T', value: v.t + 273.15, unit: 'K', digits: 5 }, { tex: 't_F', value: v.t * 9 / 5 + 32, unit: '°F', digits: 5 }]; }
            } },
          { id: 't3-sc-ex', type: 'example', title: T('Body temperature in three scales', 'Ruumiinlämpötila kolmella asteikolla'),
            problem: T('Normal body temperature is 37 °C. Give it in kelvin and in degrees Fahrenheit.', 'Normaali ruumiinlämpötila on 37 °C. Ilmoita se kelvineinä ja fahrenheitasteina.'),
            given: ['t = 37 °C'],
            steps: [
              T('Kelvin: add 273.15.', 'Kelvin: lisää 273,15.'), { tex: 'T = 37 + 273.15 = 310.15 K' },
              T('Fahrenheit: invert the conversion, t_F = 9/5 · t_C + 32.', 'Fahrenheit: käännä muunnos, t_F = 9/5 · t_C + 32.'), { tex: 't_F = 1.8 · 37 + 32 = 98.6 °F' }
            ],
            result: T('310.15 K = 98.6 °F', '310,15 K = 98,6 °F') },
          { id: 't3-sc-h1', type: 'h', text: T('Device example: Pt100 temperature sensor', 'Laiteesimerkki: Pt100-lämpötila-anturi') },
          { id: 't3-sc-p4', type: 'text', html: T(
            '<p>Automation systems measure temperature electrically. A <dfn data-term="pt100">Pt100</dfn> is a platinum wire whose resistance rises almost linearly with temperature: <f>R = R_0(1 + α t)</f> with <f>R_0 = 100 Ω</f> at 0 °C and <f>α = 0.00385 1/K</f> (IEC 60751). The controller measures the resistance and shows the temperature on whichever scale you choose. (The real curve bends slightly; the straight line is accurate to a few kelvin over this range.)</p>',
            '<p>Automaatiojärjestelmät mittaavat lämpötilaa sähköisesti. <dfn data-term="pt100">Pt100</dfn> on platinalanka, jonka resistanssi kasvaa lähes lineaarisesti lämpötilan mukana: <f>R = R_0(1 + α t)</f>, kun <f>R_0 = 100 Ω</f> 0 °C:ssa ja <f>α = 0,00385 1/K</f> (IEC 60751). Säädin mittaa resistanssin ja näyttää lämpötilan valitulla asteikolla. (Todellinen käyrä on hieman kaareva; suora on tarkka muutaman kelvinin sisällä tällä alueella.)</p>') },
          { id: 't3-sc-pt', type: 'interactive', widget: 'custom', title: T('Pt100 probe: resistance vs temperature', 'Pt100-anturi: resistanssi ja lämpötila'),
            caption: T('Move the probe temperature. The resistance changes by 0.385 Ω per kelvin; the same temperature is shown in K, °C and °F.', 'Muuta anturin lämpötilaa. Resistanssi muuttuu 0,385 Ω kelviniä kohti; sama lämpötila näytetään K-, °C- ja °F-asteikolla.'),
            config: dev(PT100) },
          { id: 't3-q2-blk', type: 'question', q: 't3-q2' },
          { id: 't3-q3-blk', type: 'question', q: 't3-q3' },
          { id: 't3-q4-blk', type: 'question', q: 't3-q4' },
          { id: 't3-q5-blk', type: 'question', q: 't3-q5' }
        ]
      },
      // ================= 3. zeroth law =================
      {
        id: 't3-zeroth', title: T('Thermal equilibrium and the zeroth law', 'Lämpötasapaino ja nollas pääsääntö'),
        blocks: [
          { id: 't3-z-p1', type: 'text', html: T(
            '<p>Thermal energy moves spontaneously from the system of high temperature to the system of low temperature. The transfer lasts until both systems have the same temperature: they are then in <dfn data-term="equilibrium">thermal equilibrium</dfn>.</p>' +
            '<p>The <dfn data-term="zeroth">zeroth law of thermodynamics</dfn> states: <b>if two systems are each in thermal equilibrium with a third system, they are in thermal equilibrium with each other.</b> It was named after the first law had been established, because this apparently obvious postulate should be stated first. It is exactly what makes a thermometer meaningful: the thermometer is the third system.</p>',
            '<p>Lämpöenergia siirtyy itsestään korkeammassa lämpötilassa olevasta systeemistä matalammassa lämpötilassa olevaan. Siirtyminen jatkuu, kunnes systeemeillä on sama lämpötila: ne ovat silloin <dfn data-term="equilibrium">termodynaamisessa tasapainossa</dfn>.</p>' +
            '<p><dfn data-term="zeroth">Termodynamiikan nollas pääsääntö</dfn> sanoo: <b>jos kaksi systeemiä on kumpikin lämpötasapainossa kolmannen systeemin kanssa, ne ovat lämpötasapainossa keskenään.</b> Laki nimettiin vasta ensimmäisen pääsäännön jälkeen, koska tämä ilmeisen itsestään selvä oletus on esitettävä ensin. Juuri se tekee lämpömittarista mielekkään: lämpömittari on kolmas systeemi.</p>') },
          { id: 't3-z-fig', type: 'figure',
            svg: '<svg viewBox="0 0 340 130" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="25" width="90" height="70" fill="var(--c-flow)" fill-opacity=".45" stroke="currentColor"/><rect x="100" y="25" width="90" height="70" fill="var(--c-electron)" fill-opacity=".35" stroke="currentColor"/><path d="M55 60 h90" stroke="currentColor" stroke-width="3" marker-end="url(#mkb)"/><defs><marker id="mkb" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8z" fill="currentColor"/></marker></defs><text x="55" y="112" text-anchor="middle" font-size="13" fill="currentColor">T₁</text><text x="145" y="112" text-anchor="middle" font-size="13" fill="currentColor">T₂ &lt; T₁</text><rect x="230" y="25" width="45" height="70" fill="var(--c-1)" fill-opacity=".3" stroke="currentColor"/><rect x="275" y="25" width="45" height="70" fill="var(--c-1)" fill-opacity=".3" stroke="currentColor"/><text x="275" y="112" text-anchor="middle" font-size="13" fill="currentColor">T₁ = T₂</text></svg>',
            caption: T('Left: energy flows from hot to cold. Right: equilibrium, no net flow.', 'Vasemmalla: energia virtaa kuumasta kylmään. Oikealla: tasapaino, ei nettovirtaa.'), alt: T('Two blocks with an arrow, then two blocks at equal temperature', 'Kaksi kappaletta ja nuoli, sitten kaksi samanlämpöistä kappaletta') },
          { id: 't3-z-c1', type: 'callout', kind: 'tip', title: T('Why a sensor needs time', 'Miksi anturi tarvitsee aikaa'),
            html: T('A Pt100 in a pipe shows the temperature of <em>itself</em>. Only when it is in thermal equilibrium with the fluid does the reading equal the fluid temperature. That is why a probe that was just inserted has to settle first.', 'Putkessa oleva Pt100 näyttää <em>oman</em> lämpötilansa. Vasta kun se on lämpötasapainossa nesteen kanssa, lukema on nesteen lämpötila. Siksi juuri asennetun anturin on annettava asettua.') },
          { id: 't3-q6-blk', type: 'question', q: 't3-q6' }
        ]
      },
      // ================= 4. expansion of solids =================
      {
        id: 't3-solids', title: T('Thermal expansion of solids', 'Kiinteiden aineiden lämpölaajeneminen'),
        blocks: [
          { id: 't3-s-p1', type: 'text', html: T(
            '<p>In a <b>solid</b> the atoms are tightly bound and sit close to their neighbours. When the temperature rises, every atom vibrates with a larger amplitude and needs more room, so the volume of the object grows. In a <b>liquid</b> only weak cohesive forces act and the molecules have no fixed order; hotter molecules move faster and the volume grows. In a <b>gas</b> the molecules are independent apart from collisions: when it is heated the gas expands, or, in a closed container, its pressure rises.</p>' +
            '<p>Consider a cube of solid material. At <em>T</em><sub>0</sub> its edge is <em>l</em><sub>0</sub>, one face has the area <em>A</em><sub>0</sub> and the volume is <em>V</em><sub>0</sub>. When the temperature rises by Δ<em>T</em>, the edge grows to <em>l</em> = <em>l</em><sub>0</sub> + Δ<em>l</em>:</p>',
            '<p><b>Kiinteässä aineessa</b> atomit ovat tiukasti sidottuja ja lähellä naapureitaan. Lämpötilan noustessa jokainen atomi värähtelee suuremmalla amplitudilla ja tarvitsee enemmän tilaa, joten kappaleen tilavuus kasvaa. <b>Nesteessä</b> vaikuttavat vain heikot koheesiovoimat eikä molekyyleillä ole kiinteää järjestystä; kuumemmat molekyylit liikkuvat nopeammin ja tilavuus kasvaa. <b>Kaasussa</b> molekyylit ovat törmäyksiä lukuun ottamatta toisistaan riippumattomia: lämmitettäessä kaasu laajenee tai suljetussa astiassa sen paine kasvaa.</p>' +
            '<p>Tarkastellaan kiinteästä aineesta tehtyä kuutiota. Lämpötilassa <em>T</em><sub>0</sub> sen särmä on <em>l</em><sub>0</sub>, yhden sivun pinta-ala <em>A</em><sub>0</sub> ja tilavuus <em>V</em><sub>0</sub>. Kun lämpötila nousee ΔT:n verran, särmä kasvaa arvoon <em>l</em> = <em>l</em><sub>0</sub> + Δ<em>l</em>:</p>') },
          { id: 't3-s-f1', type: 'formula', key: true, tex: 'Δl = α · l_0 · ΔT,  l = l_0 + Δl', label: T('Linear expansion', 'Pituuden lämpölaajeneminen'),
            legend: [['α', T('coefficient of linear expansion', 'pituuden lämpötilakerroin'), '1/K'], ['l_0', T('original length', 'alkuperäinen pituus'), 'm'], ['ΔT', T('temperature change', 'lämpötilan muutos'), 'K']] },
          { id: 't3-s-p2', type: 'text', html: T(
            '<p>Area growth is linear growth in two directions: <f>A = l² = l_0²(1 + αΔT)² = A_0[1 + 2αΔT + (αΔT)²] ≈ A_0(1 + 2αΔT)</f>, because <f>(αΔT)²</f> is negligible (α is tiny). Likewise for volume, where the second and third order terms are neglected:</p>',
            '<p>Pinta-alan kasvu on pituuden kasvu kahdessa suunnassa: <f>A = l² = l_0²(1 + αΔT)² = A_0[1 + 2αΔT + (αΔT)²] ≈ A_0(1 + 2αΔT)</f>, koska <f>(αΔT)²</f> on mitätön (α on pieni). Samoin tilavuudelle, jossa toisen ja kolmannen asteen termit jätetään pois:</p>') },
          { id: 't3-s-f2', type: 'formula', key: true, tex: 'ΔA = α_A · A_0 · ΔT,  α_A = 2α', label: T('Area expansion', 'Pinta-alan lämpölaajeneminen') },
          { id: 't3-s-f3', type: 'formula', key: true, tex: 'ΔV = α_V · V_0 · ΔT,  α_V = 3α', label: T('Volume expansion', 'Tilavuuden lämpölaajeneminen') },
          { id: 't3-s-tab', type: 'table', caption: T('Coefficients of expansion near 20 °C, unit 1/K (the slide writes (C°)⁻¹, the same thing)', 'Lämpötilakertoimet 20 °C:n lähellä, yksikkö 1/K (kalvossa (C°)⁻¹, sama asia)'),
            head: [T('Material', 'Aine'), { tex: 'α' }, { tex: 'β' }],
            rows: [
              [T('Solids', 'Kiinteät aineet'), '', ''],
              row('Aluminium', 'Alumiini', '25·10^{-6}', '75·10^{-6}'),
              row('Brass', 'Messinki', '19·10^{-6}', '56·10^{-6}'),
              row('Copper', 'Kupari', '17·10^{-6}', '50·10^{-6}'),
              row('Gold', 'Kulta', '14·10^{-6}', '42·10^{-6}'),
              row('Iron or steel', 'Rauta tai teräs', '12·10^{-6}', '35·10^{-6}'),
              row('Lead', 'Lyijy', '29·10^{-6}', '87·10^{-6}'),
              row('Glass (Pyrex)', 'Lasi (Pyrex)', '3·10^{-6}', '9·10^{-6}'),
              row('Glass (ordinary)', 'Lasi (tavallinen)', '9·10^{-6}', '27·10^{-6}'),
              row('Quartz', 'Kvartsi', '0.4·10^{-6}', '1·10^{-6}'),
              row('Concrete and brick', 'Betoni ja tiili', '≈12·10^{-6}', '≈36·10^{-6}'),
              row('Marble', 'Marmori', '1.4–3.5·10^{-6}', '4–10·10^{-6}'),
              [T('Liquids', 'Nesteet'), '', ''],
              [T('Gasoline', 'Bensiini'), '—', { tex: '950·10^{-6}' }],
              [T('Mercury', 'Elohopea'), '—', { tex: '180·10^{-6}' }],
              [T('Ethyl alcohol', 'Etyylialkoholi'), '—', { tex: '1100·10^{-6}' }],
              [T('Glycerin', 'Glyseriini'), '—', { tex: '500·10^{-6}' }],
              [T('Water', 'Vesi'), '—', { tex: '210·10^{-6}' }],
              [T('Gases', 'Kaasut'), '', ''],
              [T('Air (and most other gases at atmospheric pressure)', 'Ilma (ja useimmat muut kaasut ilmanpaineessa)'), '—', { tex: '3400·10^{-6}' }]
            ] },
          { id: 't3-s-plot', type: 'interactive', widget: 'plot', title: T('Length change of a rod', 'Sauvan pituuden muutos'),
            caption: T('A longer rod grows more. Quartz hardly moves; aluminium grows twice as much as steel.', 'Pidempi sauva pitenee enemmän. Kvartsi tuskin liikahtaa; alumiini pitenee kaksi kertaa teräksen verran.'),
            config: {
              x: { min: 0, max: 100, label: T('Temperature change ΔT', 'Lämpötilan muutos ΔT'), unit: 'K' },
              y: { min: 0, max: 130, label: T('Elongation Δl', 'Pidentymä Δl'), unit: 'mm', auto: true },
              params: [{ id: 'L', tex: 'l_0', min: 1, max: 100, value: 50, unit: 'm' }],
              curves: [
                { fn: function (x, p) { return 25e-6 * p.L * x * 1000; }, label: T('aluminium', 'alumiini'), color: '--c-2' },
                { fn: function (x, p) { return 17e-6 * p.L * x * 1000; }, label: T('copper', 'kupari'), color: '--c-flow' },
                { fn: function (x, p) { return 12e-6 * p.L * x * 1000; }, label: T('steel', 'teräs'), color: '--c-1' },
                { fn: function (x, p) { return 0.4e-6 * p.L * x * 1000; }, label: T('quartz', 'kvartsi'), color: '--c-electron' }
              ]
            } },
          { id: 't3-q7-blk', type: 'question', q: 't3-q7' },
          { id: 't3-q8-blk', type: 'question', q: 't3-q8' },
          { id: 't3-q9-blk', type: 'question', q: 't3-q9' },
          { id: 't3-s-h1', type: 'h', text: T('Device example: overhead power line', 'Laiteesimerkki: ilmajohto') },
          { id: 't3-s-p3', type: 'text', html: T(
            '<p>An overhead conductor hangs between two poles in a curve. In summer the metal is longer and the line <b>sags more</b>; in winter it contracts and pulls tight. The designer must keep the line clear of the ground in summer and keep the tension within limits in winter. A parabola gives the length of a span <em>L</em> with sag <em>f</em>: <f>l ≈ L + {8f²}/{3L}</f>. This model assumes a 200 m aluminium span with a 5 m (2.5 %) sag at 20 °C and ignores the stretch of the conductor under load.</p>',
            '<p>Ilmajohdin roikkuu kahden pylvään välillä kaarella. Kesällä metalli on pidempää ja johto <b>roikkuu enemmän</b>; talvella se kutistuu ja kiristyy. Suunnittelijan on pidettävä johto irti maasta kesällä ja jännitys rajoissa talvella. Paraabeli antaa jänteen <em>L</em> pituuden roikkuman <em>f</em> avulla: <f>l ≈ L + {8f²}/{3L}</f>. Malli olettaa 200 m:n alumiinijänteen, jonka roikkuma on 20 °C:ssa 5 m (2,5 %), eikä huomioi johtimen venymää kuormituksessa.</p>') },
          { id: 't3-s-sag', type: 'interactive', widget: 'custom', title: T('Power line: winter and summer', 'Voimajohto: talvi ja kesä'),
            caption: T('Change the span and the temperature. A tiny change of length (millimetres per metre) changes the sag a lot, because the sag depends on the square root of the extra length.', 'Muuta jänneväliä ja lämpötilaa. Pieni pituuden muutos (millimetrejä metriä kohti) muuttaa roikkumaa paljon, koska roikkuma riippuu lisäpituuden neliöjuuresta.'),
            config: dev(SAG) },
          { id: 't3-q10-blk', type: 'question', q: 't3-q10' },
          { id: 't3-s-h2', type: 'h', text: T('Device example: bimetal thermostat', 'Laiteesimerkki: bimetallitermostaatti') },
          { id: 't3-s-p4', type: 'text', html: T(
            '<p>Two metals with different <em>α</em> are bonded into a strip. When it warms, the metal with the larger α (brass, 19·10<sup>-6</sup> 1/K) wants to be longer than the one with the smaller α (steel, 12·10<sup>-6</sup> 1/K), so the strip bends <b>towards the steel side</b>. The strip is a switch with no electronics: an adjustable screw sets the contact gap <em>g</em>, and the contact opens when the tip has moved <em>g</em>. For a strip of length <em>l</em> and thickness <em>h</em> the tip moves <f>δ = {3(α_1 − α_2) l² ΔT}/{4h}</f> (a simplification that assumes equal layer thickness and stiffness).</p>',
            '<p>Kaksi eri <em>α</em>:n metallia liitetään nauhaksi. Lämmetessään suuremman α:n metalli (messinki, 19·10<sup>-6</sup> 1/K) haluaa olla pidempi kuin pienemmän α:n metalli (teräs, 12·10<sup>-6</sup> 1/K), joten nauha taipuu <b>teräspuolelle päin</b>. Nauha on kytkin ilman elektroniikkaa: säädettävä ruuvi asettaa koskettimen välyksen <em>g</em>, ja kosketin aukeaa, kun kärki on liikkunut <em>g</em>:n verran. Pituudeltaan <em>l</em> ja paksuudeltaan <em>h</em> olevan nauhan kärki liikkuu <f>δ = {3(α_1 − α_2) l² ΔT}/{4h}</f> (yksinkertaistus, joka olettaa kerrosten paksuuden ja jäykkyyden yhtä suuriksi).</p>') },
          { id: 't3-s-bi', type: 'interactive', widget: 'custom', title: T('Bimetal thermostat of a heater', 'Lämmittimen bimetallitermostaatti'),
            caption: T('Raise the temperature: the strip bends, the contact opens and the heater switches off. Turn the screw (slider g) to change the switch-off temperature. Strip: 50 mm × 1 mm, straight at 20 °C.', 'Nosta lämpötilaa: nauha taipuu, kosketin aukeaa ja lämmitin kytkeytyy pois. Käännä ruuvia (liukusäädin g) katkaisulämpötilan muuttamiseksi. Nauha: 50 mm × 1 mm, suora 20 °C:ssa.'),
            config: dev(BIMETAL) },
          { id: 't3-q11-blk', type: 'question', q: 't3-q11' },
          { id: 't3-q12-blk', type: 'question', q: 't3-q12' }
        ]
      },
      // ================= 5. tank example =================
      {
        id: 't3-tank', title: T('Worked example: a large steel tank', 'Laskuesimerkki: suuri terässäiliö'),
        blocks: [
          { id: 't3-tk-ex', type: 'example', title: T('Expansion of a cylindrical tank', 'Lieriösäiliön laajeneminen'),
            problem: T('Calculate the expansion of the height, area and volume of a large cylindrical iron tank when it is −27 °C in winter and +35 °C in summer. Diameter d₀ = 4.50 m, height h₀ = 6.00 m, α = 12·10⁻⁶ 1/K.', 'Laske suuren lieriömäisen rautasäiliön korkeuden, pinta-alan ja tilavuuden laajeneminen, kun lämpötila on talvella −27 °C ja kesällä +35 °C. Halkaisija d₀ = 4,50 m, korkeus h₀ = 6,00 m, α = 12·10⁻⁶ 1/K.'),
            given: ['ΔT = 35 − (−27) = 62 K', 'd₀ = 4.50 m', 'h₀ = 6.00 m', 'α = 12·10⁻⁶ 1/K'],
            steps: [
              T('Height:', 'Korkeus:'), { tex: 'Δh = α · h_0 · ΔT = 12·10^{-6} · 6.00 · 62 = 4.464·10^{-3} m ≈ 4.5 mm' },
              T('Area, as on the slide: the shell plus the two end faces together (πd²/2):', 'Pinta-ala kalvon mukaan: vaippa ja molemmat päädyt yhteensä (πd²/2):'), { tex: 'A_0 = {πd²}/{2} + πdh = 31.81 + 84.82 ≈ 116.63 m²' },
              { tex: 'ΔA = α_A · A_0 · ΔT = 2 · 12·10^{-6} · 116.63 · 62 ≈ 0.1735 m²' },
              T('Volume:', 'Tilavuus:'), { tex: 'V_0 = {πd²h}/{4} = {π · 4.50² · 6.00}/{4} ≈ 95.43 m³' },
              { tex: 'ΔV = α_V · V_0 · ΔT = 3 · 12·10^{-6} · 95.43 · 62 ≈ 0.213 m³' }
            ],
            result: T('Δh ≈ 4.5 mm, ΔA ≈ 0.174 m², ΔV ≈ 0.213 m³ (about 0.2 %: 213 litres)', 'Δh ≈ 4,5 mm, ΔA ≈ 0,174 m², ΔV ≈ 0,213 m³ (noin 0,2 %: 213 litraa)') },
          { id: 't3-tk-calc', type: 'interactive', widget: 'readout', title: T('Tank calculator', 'Säiliölaskin'),
            caption: T('The defaults are the slide example. Change the size, the temperature swing and the material. The last line is the example of the liquids section: a completely full tank of liquid with coefficient β.', 'Oletusarvot ovat kalvon esimerkki. Muuta kokoa, lämpötilaeroa ja materiaalia. Viimeinen rivi on nestekappaleen esimerkki: aivan täynnä oleva nestesäiliö, jonka lämpötilakerroin on β.'),
            config: {
              params: [
                { id: 'd', tex: 'd_0', min: 1, max: 10, step: 0.1, value: 4.5, unit: 'm' },
                { id: 'h', tex: 'h_0', min: 1, max: 12, step: 0.1, value: 6, unit: 'm' },
                { id: 'dT', tex: 'ΔT', min: 1, max: 100, step: 1, value: 62, unit: 'K' },
                { id: 'a', tex: 'α', min: 1, max: 30, step: 1, value: 12, unit: '·10⁻⁶ /K' },
                { id: 'b', tex: 'β', min: 200, max: 1500, step: 10, value: 950, unit: '·10⁻⁶ /K' }
              ],
              outputs: function (v) {
                var a = v.a * 1e-6, b = v.b * 1e-6, A0 = Math.PI * v.d * v.d / 2 + Math.PI * v.d * v.h, V0 = Math.PI * v.d * v.d * v.h / 4;
                return [
                  { tex: 'Δh', value: TDC.thermo.linExp(a, v.h, v.dT), unit: 'm', digits: 4 },
                  { tex: 'ΔA', value: 2 * a * A0 * v.dT, unit: 'm²', digits: 4 },
                  { tex: 'ΔV', value: 3 * a * V0 * v.dT, unit: 'm³', digits: 4 },
                  { label: T('Liquid spilling over: (β − 3α)·V₀·ΔT', 'Yli vuotava neste: (β − 3α)·V₀·ΔT'), value: (b - 3 * a) * V0 * v.dT, unit: 'm³', digits: 4 }
                ];
              }
            } },
          { id: 't3-q13-blk', type: 'question', q: 't3-q13' }
        ]
      },
      // ================= 6. liquids =================
      {
        id: 't3-liquids', title: T('Thermal expansion of liquids', 'Nesteiden lämpölaajeneminen'),
        blocks: [
          { id: 't3-l-p1', type: 'text', html: T(
            '<p>The expansion of liquids is quite different from that of solids: it is <b>non-linear</b> and <b>larger</b> than that of solids. For a small temperature change we can approximate it as linear, with the <dfn data-term="beta">coefficient of volume expansion</dfn> β:</p>',
            '<p>Nesteiden laajeneminen eroaa selvästi kiinteiden aineiden laajenemisesta: se on <b>epälineaarista</b> ja <b>suurempaa</b> kuin kiinteillä aineilla. Pienillä lämpötilan muutoksilla sen voi approksimoida lineaariseksi <dfn data-term="beta">tilavuuden lämpötilakertoimen</dfn> β avulla:</p>') },
          { id: 't3-l-f1', type: 'formula', key: true, tex: 'ΔV = β · V_0 · ΔT', label: T('Volume expansion of a liquid', 'Nesteen tilavuuden laajeneminen'),
            legend: [['β', T('coefficient of volume expansion', 'tilavuuden lämpötilakerroin'), '1/K']] },
          { id: 't3-l-c1', type: 'callout', kind: 'info', title: T('The liquid thermometer', 'Nestelämpömittari'),
            html: T('Many thermometers use the fact that liquids expand more than solids. The bulb and tube are glass (β of glass is small), and when the temperature rises the larger expansion of the liquid pushes it up into the thin capillary tube.', 'Monet lämpömittarit hyödyntävät sitä, että nesteet laajenevat enemmän kuin kiinteät aineet. Säiliö ja putki ovat lasia (lasin β on pieni), ja lämpötilan noustessa nesteen suurempi laajeneminen työntää sen ohueen kapillaariputkeen.') },
          { id: 't3-q14-blk', type: 'question', q: 't3-q14' },
          { id: 't3-l-h1', type: 'h', text: T('The anomaly of water', 'Veden poikkeava käyttäytyminen') },
          { id: 't3-l-p2', type: 'text', html: T(
            '<p>Liquids expand in a more complex way than solids, nonlinearly over large temperature intervals. Water is special between 0 and 10 °C: its density is <b>greatest at about 4 °C</b>. Below 4 °C water expands when it cools, so cold water floats on top and ice forms at the surface of a lake, while the deep water stays at 4 °C. (Plot: the standard polynomial of the density of water, the same data as in the slide.)</p>',
            '<p>Nesteet laajenevat monimutkaisemmin kuin kiinteät aineet, suurilla lämpötilaväleillä epälineaarisesti. Vesi on erikoistapaus välillä 0–10 °C: sen tiheys on <b>suurimmillaan noin 4 °C:ssa</b>. Alle 4 °C:n vesi laajenee jäähtyessään, joten kylmä vesi nousee pinnalle ja jää muodostuu järven pintaan, kun syvä vesi pysyy 4-asteisena. (Kuvaaja: veden tiheyden standardipolynomi, samat tiedot kuin kalvossa.)</p>') },
          { id: 't3-l-plot', type: 'interactive', widget: 'plot', title: T('Density of water versus temperature', 'Veden tiheys lämpötilan funktiona'),
            caption: T('The maximum is near 4 °C. At 30 °C the density is about 995.65 kg/m³.', 'Maksimi on lähellä 4 °C:ta. 30 °C:ssa tiheys on noin 995,65 kg/m³.'),
            config: {
              x: { min: 0, max: 30, label: T('Temperature t', 'Lämpötila t'), unit: '°C' },
              y: { min: 995.5, max: 1000.2, label: T('Density ρ', 'Tiheys ρ'), unit: 'kg/m³' },
              params: [{ id: 't', tex: 't', min: 0, max: 30, step: 0.5, value: 4, unit: '°C' }],
              curves: [{ fn: function (x) { return rhoWater(x); }, label: T('ρ(t)', 'ρ(t)'), color: '--c-electron' }],
              points: function (p) { return [{ x: p.t, y: rhoWater(p.t), label: nf(rhoWater(p.t), 6) + ' kg/m³' }]; },
              vlines: function () { return [{ x: 4, label: T('4 °C', '4 °C') }]; },
              readouts: function (p) { return [{ tex: 'ρ', value: rhoWater(p.t), unit: 'kg/m³', digits: 6 }]; }
            } },
          { id: 't3-q15-blk', type: 'question', q: 't3-q15' },
          { id: 't3-l-h2', type: 'h', text: T('A full tank of gasoline', 'Aivan täysi bensiinisäiliö') },
          { id: 't3-l-ex', type: 'example', title: T('How much gasoline flows out?', 'Kuinka paljon bensiiniä valuu ulos?'),
            problem: T('The steel tank of the previous example (V₀ = 95.43 m³) is filled completely with gasoline in winter at −27 °C. How much gasoline flows out of the tank when the temperature rises to +35 °C? Include the expansion of the tank. β = 950·10⁻⁶ 1/K, α = 12·10⁻⁶ 1/K.', 'Edellisen esimerkin teräsäiliö (V₀ = 95,43 m³) täytetään talvella täyteen bensiiniä lämpötilassa −27 °C. Kuinka paljon bensiiniä valuu ulos, kun lämpötila nousee +35 °C:een? Ota huomioon myös säiliön laajeneminen. β = 950·10⁻⁶ 1/K, α = 12·10⁻⁶ 1/K.'),
            given: ['ΔT = 62 K', 'V₀ = 95.43 m³'],
            steps: [
              T('Gasoline expands:', 'Bensiini laajenee:'), { tex: 'ΔV_g = β · V_0 · ΔT' },
              T('The tank itself also gets bigger (volume expansion of steel, 3α):', 'Myös säiliö kasvaa (teräksen tilavuuden laajeneminen, 3α):'), { tex: 'ΔV_t = 3α · V_0 · ΔT' },
              T('What spills is the difference:', 'Yli vuotava määrä on erotus:'), { tex: 'V_{out} = (β − 3α) · V_0 · ΔT = (950 − 3·12)·10^{-6} · 95.43 · 62' },
              { tex: 'V_{out} ≈ 5.41 m³' }
            ],
            result: T('About 5.41 m³ = 5410 litres flows out.', 'Ulos valuu noin 5,41 m³ = 5410 litraa.') },
          { id: 't3-l-c2', type: 'callout', kind: 'warn', title: T('Fuel tanks', 'Polttoainesäiliöt'),
            html: T('This is why a fuel tank must never be filled to the brim, and why tanks have a vent and an expansion space.', 'Siksi polttoainesäiliötä ei saa täyttää reunaan asti, ja siksi säiliöissä on ilmaus ja laajenemistilaa.') },
          { id: 't3-q16-blk', type: 'question', q: 't3-q16' }
        ]
      },
      // ================= 7. thermal stress =================
      {
        id: 't3-stress', title: T('Thermal stress', 'Lämpöjännitys'),
        blocks: [
          { id: 't3-st-p1', type: 'text', html: T(
            '<p>A <dfn data-term="thermalstress">thermal stress</dfn> arises when a solid is warmed or cooled and the change of length, area or volume is <b>prevented</b>. If the object is warming, the thermal stress is like a compressive stress; if it is cooling, it is like a tensile stress.</p>' +
            '<p>Hooke’s law connects the strain ε = Δl/l and the stress σ through the <dfn data-term="young">modulus of elasticity</dfn> E. If the bar were free, it would change its length by Δl = α l<sub>0</sub> ΔT. Clamping forces it back by the same amount, so both expressions for Δl are equal:</p>',
            '<p><dfn data-term="thermalstress">Lämpöjännitys</dfn> syntyy, kun kiinteää ainetta lämmitetään tai jäähdytetään ja pituuden, pinta-alan tai tilavuuden muutos <b>estetään</b>. Jos kappale lämpenee, lämpöjännitys on kuin puristusjännitys; jos se jäähtyy, jännitys on kuin vetojännitys.</p>' +
            '<p>Hooken laki yhdistää venymän ε = Δl/l ja jännityksen σ <dfn data-term="young">kimmokertoimen</dfn> E kautta. Jos sauva olisi vapaa, sen pituus muuttuisi Δl = α l<sub>0</sub> ΔT. Kiinnitys pakottaa sen takaisin saman verran, joten molemmat Δl:n lausekkeet ovat yhtä suuret:</p>') },
          { id: 't3-st-f1', type: 'formula', tex: 'ε = {Δl}/{l} = {σ}/{E}', label: T('Hooke’s law', 'Hooken laki') },
          { id: 't3-st-f2', type: 'formula', key: true, tex: '{σ · l}/{E} = α · l_0 · ΔT  ⇒  σ = α · E · ΔT', label: T('Thermal stress of a clamped bar', 'Kiinnitetyn sauvan lämpöjännitys'),
            legend: [['σ', T('stress', 'jännitys'), 'Pa'], ['E', T('modulus of elasticity', 'kimmokerroin'), 'Pa'], ['α', T('coefficient of linear expansion', 'pituuden lämpötilakerroin'), '1/K']] },
          { id: 't3-st-c1', type: 'callout', kind: 'key', title: T('Notice', 'Huomaa'),
            html: T('The length does not appear in σ = αEΔT: a short bar and a long bar develop the same stress. A long bar, however, would have grown more if it were free, which is why it needs a joint.', 'Pituus ei esiinny kaavassa σ = αEΔT: lyhyeen ja pitkään sauvaan syntyy sama jännitys. Pitkä sauva kuitenkin pitenisi vapaana enemmän, minkä vuoksi se tarvitsee laajennusvaran.') },
          { id: 't3-st-h1', type: 'h', text: T('Device example: railway track', 'Laiteesimerkki: rautatiekisko') },
          { id: 't3-st-p2', type: 'text', html: T(
            '<p>A rail is laid with no stress at 20 °C. The stress is σ = αEΔT, with E = 200 GPa for steel (an extra value, not on the slides) and α = 12·10<sup>-6</sup> 1/K, so about <b>2.4 MPa per kelvin</b>. Fix the rail ends and let the sun heat it: the force on the fixing grows with the cross-section A.</p>',
            '<p>Kisko asennetaan jännityksettömänä 20 °C:ssa. Jännitys on σ = αEΔT, kun teräksen E = 200 GPa (lisäarvo, ei kalvoilla) ja α = 12·10<sup>-6</sup> 1/K, eli noin <b>2,4 MPa kelviniä kohti</b>. Kiinnitä kiskon päät ja anna auringon lämmittää: kiinnityksen voima kasvaa poikkipinta-alan A mukana.</p>') },
          { id: 't3-st-w', type: 'interactive', widget: 'custom', title: T('Clamped rail', 'Kiinnitetty kisko'),
            caption: T('Set the rail temperature. Above 20 °C it is squeezed, below 20 °C it is stretched. The gauge compares the stress with the yield strength of S235 steel (235 MPa).', 'Aseta kiskon lämpötila. Yli 20 °C:ssa se puristuu, alle 20 °C:ssa se venyy. Mittari vertaa jännitystä S235-teräksen myötörajaan (235 MPa).'),
            config: dev(STRESS) },
          { id: 't3-q17-blk', type: 'question', q: 't3-q17' },
          { id: 't3-st-h2', type: 'h', text: T('Device example: expansion joint in a heating pipeline', 'Laiteesimerkki: kaukolämpöputken laajennusjousto') },
          { id: 't3-st-p3', type: 'text', html: T(
            '<p>A steam or district-heating pipe is laid at about 10 °C and carries water at over 100 °C. A steel pipe of 100 m grows by 12·10<sup>-6</sup> · 100 · 120 = 0.144 m. If the pipe is anchored at both ends it would develop an enormous thermal stress (σ = αEΔT ≈ 290 MPa, more than steel can carry), so an <b>expansion joint</b> (a bellows) takes up the movement. Each bellows can absorb only a limited stroke <em>c</em>.</p>',
            '<p>Höyry- tai kaukolämpöputki asennetaan noin 10 °C:ssa ja sen läpi virtaa yli 100-asteista vettä. 100 m teräsputki pitenee 12·10<sup>-6</sup> · 100 · 120 = 0,144 m. Jos putki ankkuroitaisiin molemmista päistä, siihen syntyisi valtava lämpöjännitys (σ = αEΔT ≈ 290 MPa, enemmän kuin teräs kestää), joten <b>laajennusjousto</b> (palje) ottaa liikkeen vastaan. Yksi palje voi vastaanottaa vain rajallisen liikkeen <em>c</em>.</p>') },
          { id: 't3-st-pipe', type: 'interactive', widget: 'custom', title: T('Pipeline between two anchors', 'Putkilinja kahden kiintopisteen välissä'),
            caption: T('Lengthen the pipe or heat the medium. When the expansion exceeds the stroke of the bellows, more joints are needed. The pipe is laid at 10 °C.', 'Pidennä putkea tai lämmitä väliainetta. Kun laajeneminen ylittää paljeen liikkeen, tarvitaan lisää jousto-osia. Putki on asennettu 10 °C:ssa.'),
            config: dev(PIPE) },
          { id: 't3-q18-blk', type: 'question', q: 't3-q18' },
          { id: 't3-q19-blk', type: 'question', q: 't3-q19' }
        ]
      }
    ],
    questions: [
      { id: 't3-q1', mode: 'practice', type: 'mc', difficulty: 1,
        prompt: T('Which of these is a macroscopic description of a gas in a container?', 'Mikä seuraavista on astiassa olevan kaasun makroskooppinen kuvaus?'),
        options: [
          { id: 'a', html: T('The velocity of each molecule', 'Jokaisen molekyylin nopeus') },
          { id: 'b', html: T('Its pressure, volume and temperature', 'Sen paine, tilavuus ja lämpötila') },
          { id: 'c', html: T('The position of every atom', 'Jokaisen atomin paikka') },
          { id: 'd', html: T('The time of each collision with the wall', 'Jokaisen seinätörmäyksen ajankohta') }
        ],
        hints: [T('A macroscopic description uses quantities an instrument can measure.', 'Makroskooppinen kuvaus käyttää mittarilla mitattavia suureita.')] },
      { id: 't3-q2', mode: 'practice', type: 'numeric', difficulty: 1, tol: 0.001,
        prompt: T('Normal room temperature is 21 °C. What is it in kelvin?', 'Normaali huonelämpötila on 21 °C. Mikä se on kelvineinä?'),
        fields: [{ id: 'T', tex: 'T', unit: 'K' }],
        hints: [T('A kelvin and a degree Celsius are the same size.', 'Kelvin ja celsiusaste ovat saman kokoisia.'), T('Add 273.15.', 'Lisää 273,15.')] },
      { id: 't3-q3', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.01,
        prompt: T('A US oven is set to 350 °F. What is the temperature in degrees Celsius?', 'Yhdysvaltalainen uuni on säädetty 350 °F:iin. Mikä on lämpötila celsiusasteina?'),
        fields: [{ id: 't', tex: 't', unit: '°C' }],
        hints: [T('First subtract 32 °F.', 'Vähennä ensin 32 °F.'), T('Then multiply by 5/9.', 'Kerro sitten 5/9:llä.')] },
      { id: 't3-q4', mode: 'practice', type: 'match', difficulty: 1, points: 2,
        prompt: T('Match each temperature scale with the value of absolute zero in that scale.', 'Yhdistä lämpötila-asteikko ja absoluuttisen nollapisteen arvo kyseisellä asteikolla.'),
        left: [{ id: 'K', html: T('kelvin', 'kelvin') }, { id: 'C', html: T('Celsius', 'celsius') }, { id: 'F', html: T('Fahrenheit', 'fahrenheit') }],
        right: [{ id: 'r1', html: T('−459.67 °F', '−459,67 °F') }, { id: 'r2', html: T('0 K', '0 K') }, { id: 'r3', html: T('−273.15 °C', '−273,15 °C') }, { id: 'r4', html: T('−32 °F', '−32 °F') }],
        hints: [T('The kelvin scale starts at absolute zero by definition.', 'Kelvin-asteikko alkaa määritelmän mukaan absoluuttisesta nollapisteestä.')] },
      { id: 't3-q5', mode: 'practice', type: 'slider', difficulty: 2, tol: 0.02,
        prompt: T('The controller shows a Pt100 resistance of 119.25 Ω. Set the probe temperature in the widget until the resistance readout matches it.', 'Säädin näyttää Pt100-anturin resistanssiksi 119,25 Ω. Aseta anturin lämpötila widgetissä niin, että resistanssin lukema vastaa tätä.'),
        widget: { name: 'custom', config: dev(PT100, { t: 20 }) },
        hints: [T('R = R₀(1 + α t), with R₀ = 100 Ω and α = 0.00385 1/K.', 'R = R₀(1 + α t), missä R₀ = 100 Ω ja α = 0,00385 1/K.'), T('Each kelvin changes R by 0.385 Ω.', 'Jokainen kelvin muuttaa R:ää 0,385 Ω.')] },
      { id: 't3-q6', mode: 'practice', type: 'mc', difficulty: 1,
        prompt: T('Body A is in thermal equilibrium with a thermometer, and body B is in thermal equilibrium with the same thermometer. What follows?', 'Kappale A on lämpötasapainossa lämpömittarin kanssa ja kappale B on lämpötasapainossa saman lämpömittarin kanssa. Mitä tästä seuraa?'),
        options: [
          { id: 'a', html: T('A and B are in thermal equilibrium with each other (same temperature)', 'A ja B ovat lämpötasapainossa keskenään (sama lämpötila)') },
          { id: 'b', html: T('Heat flows from A to B', 'Lämpöä siirtyy A:sta B:hen') },
          { id: 'c', html: T('A and B must have different temperatures', 'A:lla ja B:llä on oltava eri lämpötila') },
          { id: 'd', html: T('Nothing can be concluded', 'Mitään ei voi päätellä') }
        ],
        hints: [T('This is the zeroth law of thermodynamics.', 'Tämä on termodynamiikan nollas pääsääntö.')] },
      { id: 't3-q7', mode: 'practice', type: 'numeric', difficulty: 1, tol: 0.02,
        prompt: T('A 200 m steel line (α = 12·10⁻⁶ 1/K) warms by 50 K. By how much does it lengthen?', '200 m:n teräsjohto (α = 12·10⁻⁶ 1/K) lämpenee 50 K. Kuinka paljon se pitenee?'),
        fields: [{ id: 'dl', tex: 'Δl', unit: 'm' }],
        hints: [T('Δl = α·l₀·ΔT.', 'Δl = α·l₀·ΔT.'), T('Give the answer in metres.', 'Anna vastaus metreinä.')] },
      { id: 't3-q8', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.02,
        prompt: T('A copper plate has an area of 1.00 m² at 0 °C (α = 17·10⁻⁶ 1/K). How much does its area grow when it is heated to 100 °C?', 'Kuparilevyn pinta-ala on 0 °C:ssa 1,00 m² (α = 17·10⁻⁶ 1/K). Kuinka paljon sen pinta-ala kasvaa, kun se lämmitetään 100 °C:een?'),
        fields: [{ id: 'dA', tex: 'ΔA', unit: 'm²' }],
        hints: [T('Area expansion uses the coefficient 2α.', 'Pinta-alan laajenemisessa käytetään kerrointa 2α.'), T('ΔT = 100 K.', 'ΔT = 100 K.')] },
      { id: 't3-q9', mode: 'practice', type: 'order', difficulty: 1,
        prompt: T('Order the materials from the smallest to the largest coefficient of linear expansion α.', 'Järjestä aineet pituuden lämpötilakertoimen α mukaan pienimmästä suurimpaan.'),
        items: [
          { id: 'c', html: T('copper', 'kupari') }, { id: 'q', html: T('quartz', 'kvartsi') }, { id: 'a', html: T('aluminium', 'alumiini') },
          { id: 's', html: T('steel', 'teräs') }, { id: 'g', html: T('ordinary glass', 'tavallinen lasi') }
        ],
        hints: [T('Look at the table of the section.', 'Katso tämän osion taulukkoa.')] },
      { id: 't3-q10', mode: 'practice', type: 'slider', difficulty: 3, tol: 0.01,
        prompt: T('A 200 m span has a sag of 5 m at 20 °C. Use the widget to find the temperature at which the sag is only 4 m. Set the span to 200 m, and set the temperature slider until the sag readout is 4 m.', '200 m:n jänteen roikkuma on 20 °C:ssa 5 m. Etsi widgetillä lämpötila, jossa roikkuma on vain 4 m. Aseta jänneväli 200 m:iin ja säädä lämpötilaa, kunnes roikkuman lukema on 4 m.'),
        widget: { name: 'custom', config: dev(SAG, { L: 200, t: 20 }) },
        hints: [T('The sag shrinks when the conductor contracts, so look for a colder temperature than 20 °C.', 'Roikkuma pienenee, kun johdin kutistuu, joten etsi 20 °C:ta kylmempää lämpötilaa.'), T('The answer is the temperature of the slider, here compared as kelvin.', 'Vastaus on liukusäätimen lämpötila, tässä verrattuna kelvineinä.')] },
      { id: 't3-q11', mode: 'practice', type: 'mc', difficulty: 2,
        prompt: T('A strip of brass and steel bonded together is heated. Which way does it bend?', 'Yhteen liitettyä messinki- ja teräsnauhaa lämmitetään. Mihin suuntaan se taipuu?'),
        options: [
          { id: 'a', html: T('Towards the steel side (the metal with the smaller α)', 'Teräspuolelle päin (pienemmän α:n metalli)') },
          { id: 'b', html: T('Towards the brass side', 'Messinkipuolelle päin') },
          { id: 'c', html: T('It does not bend, it only gets longer', 'Se ei taivu, vaan pitenee ainoastaan') },
          { id: 'd', html: T('Randomly', 'Satunnaisesti') }
        ],
        hints: [T('The metal with the larger α becomes longer and ends up on the outside of the curve.', 'Suuremman α:n metalli pitenee enemmän ja jää kaaren ulkoreunalle.')] },
      { id: 't3-q12', mode: 'practice', type: 'fill', difficulty: 1,
        prompt: T('Complete the relations for an isotropic solid.', 'Täydennä lausekkeet isotrooppiselle kiinteälle aineelle.'),
        text: T('The coefficient of area expansion is α_A = [[a]] · α and the coefficient of volume expansion is α_V = [[b]] · α.', 'Pinta-alan lämpötilakerroin on α_A = [[a]] · α ja tilavuuden lämpötilakerroin on α_V = [[b]] · α.'),
        fields: [{ id: 'a', kind: 'num' }, { id: 'b', kind: 'num' }],
        hints: [T('Area is length in two directions, volume in three.', 'Pinta-ala on pituutta kahdessa suunnassa, tilavuus kolmessa.')] },
      { id: 't3-q13', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.02,
        prompt: T('The iron tank of the example (α = 12·10⁻⁶ 1/K, h₀ = 6.00 m) has a winter-to-summer temperature swing of 80 K instead of 62 K. How much does its height change?', 'Esimerkin rautasäiliön (α = 12·10⁻⁶ 1/K, h₀ = 6,00 m) lämpötilavaihtelu talvesta kesään on 62 K:n sijaan 80 K. Kuinka paljon sen korkeus muuttuu?'),
        fields: [{ id: 'dh', tex: 'Δh', unit: 'm' }],
        hints: [T('Δh = α·h₀·ΔT.', 'Δh = α·h₀·ΔT.')] },
      { id: 't3-q14', mode: 'practice', type: 'mc', difficulty: 2,
        prompt: T('Why does the liquid in a glass thermometer rise when it warms?', 'Miksi nestelämpömittarin neste nousee lämmetessään?'),
        options: [
          { id: 'a', html: T('The glass contracts', 'Lasi kutistuu') },
          { id: 'b', html: T('The liquid evaporates', 'Neste haihtuu') },
          { id: 'c', html: T('The outside air pushes the liquid up', 'Ulkoilma työntää nestettä ylös') },
          { id: 'd', html: T('The liquid expands much more than the glass', 'Neste laajenee paljon enemmän kuin lasi') }
        ],
        hints: [T('Compare the β values of liquids and solids in the table.', 'Vertaa nesteiden ja kiinteiden aineiden β-arvoja taulukossa.')] },
      { id: 't3-q15', mode: 'practice', type: 'mc', difficulty: 1,
        prompt: T('At which temperature does water have its greatest density?', 'Missä lämpötilassa vedellä on suurin tiheys?'),
        options: [
          { id: 'a', html: T('0 °C', '0 °C') }, { id: 'b', html: T('about 4 °C', 'noin 4 °C') }, { id: 'c', html: T('10 °C', '10 °C') }, { id: 'd', html: T('100 °C', '100 °C') }
        ],
        hints: [T('Look at the maximum of the density curve.', 'Katso tiheyskäyrän maksimia.')] },
      { id: 't3-q16', mode: 'practice', type: 'numeric', difficulty: 3, tol: 0.02,
        prompt: T('A steel tank of 2.0 m³ is filled to the brim with gasoline (β = 950·10⁻⁶ 1/K) at 5 °C. The tank warms to 35 °C. How much gasoline overflows? (α of steel = 12·10⁻⁶ 1/K; include the expansion of the tank.)', '2,0 m³:n teräsäiliö täytetään reunaan asti bensiinillä (β = 950·10⁻⁶ 1/K) lämpötilassa 5 °C. Säiliö lämpenee 35 °C:een. Kuinka paljon bensiiniä vuotaa yli? (Teräksen α = 12·10⁻⁶ 1/K; ota huomioon säiliön laajeneminen.)'),
        fields: [{ id: 'V', tex: 'V_{out}', unit: 'm³' }],
        hints: [T('The tank expands too: its volume grows with 3α.', 'Myös säiliö laajenee: sen tilavuus kasvaa kertoimella 3α.'), T('V_out = (β − 3α)·V₀·ΔT.', 'V_out = (β − 3α)·V₀·ΔT.'), T('ΔT = 30 K.', 'ΔT = 30 K.')] },
      { id: 't3-q17', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.02,
        prompt: T('A steel rail (α = 12·10⁻⁶ 1/K, E = 200 GPa) is clamped rigidly and warms by 40 K. What thermal stress arises?', 'Teräskisko (α = 12·10⁻⁶ 1/K, E = 200 GPa) on kiinnitetty jäykästi ja lämpenee 40 K. Mikä lämpöjännitys syntyy?'),
        fields: [{ id: 's', tex: 'σ', unit: 'Pa' }],
        hints: [T('σ = α·E·ΔT. The rail length does not matter.', 'σ = α·E·ΔT. Kiskon pituudella ei ole väliä.'), T('Give the answer in pascals.', 'Anna vastaus pascaleina.')] },
      { id: 't3-q18', mode: 'practice', type: 'multi', difficulty: 2,
        prompt: T('A rail is clamped at both ends and heated. Which statements are true?', 'Kisko on kiinnitetty molemmista päistä ja sitä lämmitetään. Mitkä väitteet ovat tosia?'),
        options: [
          { id: 'a', html: T('A compressive stress arises.', 'Syntyy puristusjännitys.') },
          { id: 'b', html: T('The stress is proportional to the temperature change.', 'Jännitys on verrannollinen lämpötilan muutokseen.') },
          { id: 'c', html: T('The stress grows with the length of the rail.', 'Jännitys kasvaa kiskon pituuden mukana.') },
          { id: 'd', html: T('A stiffer material (larger E) gets a larger stress.', 'Jäykempään materiaaliin (suurempi E) syntyy suurempi jännitys.') }
        ],
        hints: [T('Use σ = α·E·ΔT: which quantities appear?', 'Käytä kaavaa σ = α·E·ΔT: mitkä suureet siinä esiintyvät?')] },
      { id: 't3-q19', mode: 'practice', type: 'numeric', difficulty: 3, tol: 0.02,
        prompt: T('A 100 m steel district-heating pipe is laid at 10 °C and runs at 130 °C. How many bellows with a stroke of 50 mm each are needed to take up the expansion (round up)?', '100 m:n teräksinen kaukolämpöputki asennetaan 10 °C:ssa ja sen käyntilämpötila on 130 °C. Montako 50 mm:n liikkeen paljetta tarvitaan ottamaan laajeneminen vastaan (pyöristä ylöspäin)?'),
        fields: [{ id: 'n', tex: 'n' }],
        hints: [T('First find Δl = α·l₀·ΔT.', 'Laske ensin Δl = α·l₀·ΔT.'), T('Divide by the stroke and round up.', 'Jaa liikkeellä ja pyöristä ylöspäin.')] },

      // ---- topic test ----
      { id: 't3-g1', mode: 'graded', type: 'numeric', difficulty: 1, tol: 0.001,
        prompt: T('Liquid nitrogen boils at −196 °C. What is this in kelvin?', 'Nestemäinen typpi kiehuu −196 °C:ssa. Mikä tämä on kelvineinä?'),
        fields: [{ id: 'T', tex: 'T', unit: 'K' }],
        hints: [T('T = t + 273.15.', 'T = t + 273,15.')] },
      { id: 't3-g2', mode: 'graded', type: 'numeric', difficulty: 2, tol: 0.01,
        prompt: T('A Pt100 sensor (R₀ = 100 Ω, α = 0.00385 1/K) is in a 150 °C process pipe. What is its resistance?', 'Pt100-anturi (R₀ = 100 Ω, α = 0,00385 1/K) on 150 °C:n prosessiputkessa. Mikä on sen resistanssi?'),
        fields: [{ id: 'R', tex: 'R', unit: 'Ω' }],
        hints: [T('R = R₀(1 + α t) with t in °C.', 'R = R₀(1 + α t), t celsiusasteina.')] },
      { id: 't3-g3', mode: 'graded', type: 'mc', difficulty: 2,
        prompt: T('A steel measuring tape is accurate at 20 °C. On a freezing day (−10 °C) it is used to measure a long distance. Compared with the true length, the tape reads…', 'Teräksinen mittanauha on tarkka 20 °C:ssa. Pakkaspäivänä (−10 °C) sillä mitataan pitkää matkaa. Todelliseen pituuteen verrattuna nauha näyttää…'),
        options: [
          { id: 'a', html: T('too small a value', 'liian pientä arvoa') },
          { id: 'b', html: T('the correct value', 'oikean arvon') },
          { id: 'c', html: T('too large a value (the tape has contracted, so more tape lengths fit)', 'liian suurta arvoa (nauha on kutistunut, joten sitä mahtuu matkalle enemmän)') },
          { id: 'd', html: T('a value that cannot be said', 'arvon, jota ei voi sanoa') }
        ],
        hints: [T('What happens to the length between two scale marks when steel cools?', 'Mitä asteikkomerkkien väliselle pituudelle tapahtuu, kun teräs jäähtyy?')] },
      { id: 't3-g4', mode: 'graded', type: 'numeric', difficulty: 2, tol: 0.02,
        prompt: T('An 80 m steel pipe (α = 12·10⁻⁶ 1/K) is laid at 10 °C and heated to 150 °C. How much does it lengthen?', '80 m:n teräsputki (α = 12·10⁻⁶ 1/K) asennetaan 10 °C:ssa ja lämmitetään 150 °C:een. Kuinka paljon se pitenee?'),
        fields: [{ id: 'dl', tex: 'Δl', unit: 'm' }],
        hints: [T('ΔT = 140 K.', 'ΔT = 140 K.')] },
      { id: 't3-g5', mode: 'graded', type: 'slider', difficulty: 2, tol: 0.03,
        prompt: T('The bimetal thermostat of a heater must switch off at 70 °C. Adjust the contact gap g with the screw slider. (The strip is straight at 20 °C and bends 0.013125 mm per kelvin.)', 'Lämmittimen bimetallitermostaatin on katkaistava 70 °C:ssa. Säädä koskettimen välystä g ruuvin liukusäätimellä. (Nauha on suora 20 °C:ssa ja taipuu 0,013125 mm kelviniä kohti.)'),
        widget: { name: 'custom', config: dev(BIMETAL, { t: 20, g: 0.3 }) },
        hints: [T('The contact opens when the free tip has moved g.', 'Kosketin aukeaa, kun vapaa kärki on liikkunut g:n verran.'), T('g = 0.013125 mm/K · (70 − 20) K.', 'g = 0,013125 mm/K · (70 − 20) K.')] },
      { id: 't3-g6', mode: 'graded', type: 'numeric', difficulty: 3, tol: 0.02, points: 2,
        prompt: T('An aluminium bar (α = 25·10⁻⁶ 1/K, E = 70 GPa) is clamped between two rigid walls at 20 °C and then cooled by 30 K. What is the magnitude of the thermal stress?', 'Alumiinisauva (α = 25·10⁻⁶ 1/K, E = 70 GPa) kiinnitetään kahden jäykän seinän väliin 20 °C:ssa ja jäähdytetään sitten 30 K. Kuinka suuri on lämpöjännityksen itseisarvo?'),
        fields: [{ id: 's', tex: 'σ', unit: 'Pa' }],
        hints: [T('σ = α·E·ΔT, with |ΔT| = 30 K.', 'σ = α·E·ΔT, missä |ΔT| = 30 K.'), T('Cooling gives a tensile stress.', 'Jäähtyminen aiheuttaa vetojännityksen.')] },
      { id: 't3-g7', mode: 'graded', type: 'multi', difficulty: 2,
        prompt: T('Which of these statements about thermal expansion are true?', 'Mitkä seuraavista väitteistä lämpölaajenemisesta ovat tosia?'),
        options: [
          { id: 'a', html: T('For a solid, β ≈ 3α.', 'Kiinteälle aineelle β ≈ 3α.') },
          { id: 'b', html: T('Water is densest at 0 °C.', 'Vesi on tiheintä 0 °C:ssa.') },
          { id: 'c', html: T('Liquids generally expand more than solids.', 'Nesteet laajenevat yleensä enemmän kuin kiinteät aineet.') },
          { id: 'd', html: T('A hotter power line sags more.', 'Kuumempi voimajohto roikkuu enemmän.') }
        ],
        hints: [T('Check each statement against the table and the density curve of water.', 'Tarkista jokainen väite taulukosta ja veden tiheyskäyrästä.')] }
    ]
  });
})();

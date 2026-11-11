/* AC widgets (house style: docs/COURSE-KIT.md §5; config reference: .claude/skills/ac-widgets/SKILL.md)
 *  'phasor'  rotating phasors beside their sine waves. A phasor tip's height equals its wave's value at the cursor.
 *  'cplane'  vectors in the complex plane: impedance, admittance and power triangles. */
(function (TDC) {
  'use strict';
  var U = TDC.util, el = U.el, V = TDC.viz, D = Math.PI / 180;

  function col(ctx, c, i) { return c && c.indexOf('--') !== 0 ? c : ctx.color(c || '--c-' + (i % 6 + 1)); }
  function font(g, px, w) { g.font = (w || 600) + ' ' + px + 'px ' + getComputedStyle(document.body).fontFamily; }
  function arrow(g, x0, y0, x1, y1, c, dash) {
    var a = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0), hd = Math.min(11, L * 0.45);
    g.strokeStyle = g.fillStyle = c; g.lineWidth = 2.5; g.setLineDash(dash ? [6, 4] : []);
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1 - hd * 0.7 * Math.cos(a), y1 - hd * 0.7 * Math.sin(a)); g.stroke(); g.setLineDash([]);
    if (L < 3) return;
    g.beginPath(); g.moveTo(x1, y1);
    g.lineTo(x1 - hd * Math.cos(a - 0.38), y1 - hd * Math.sin(a - 0.38)); g.lineTo(x1 - hd * Math.cos(a + 0.38), y1 - hd * Math.sin(a + 0.38));
    g.closePath(); g.fill();
  }
  /** Text placed beside (x, y) in the direction (dx, dy), so it never sits on the point itself.
   *  bg: background colour drawn behind the text so grid lines and tick labels don't run through it. */
  //  placed: array of boxes already drawn; on overlap the label moves further out, then to the other side.
  function tag(g, s, x, y, dx, dy, c, gap, bg, placed) {
    gap = gap || 12; g.textBaseline = 'middle';
    var wd = g.measureText(String(s).replace(/[_^{}]/g, '')).width + 6, fs = parseFloat(/(\d+)px/.exec(g.font)[1]), b;
    function boxAt(sx, k) {
      var ex = sx * dx, ey = sx * dy, al = ex > 0.35 ? 'left' : ex < -0.35 ? 'right' : 'center', tx = x + ex * k, ty = y + ey * k;
      return { al: al, tx: tx, ty: ty, x: al === 'left' ? tx - 3 : al === 'right' ? tx - wd + 3 : tx - wd / 2, y: ty - fs * 0.7, w: wd, h: fs * 1.5 };
    }
    var tries = placed ? [[1, gap], [1, gap + fs], [-1, gap], [-1, gap + fs], [1, gap + 2 * fs]] : [[1, gap]];
    for (var i = 0; i < tries.length; i++) {
      b = boxAt(tries[i][0], tries[i][1]);
      if (!placed || !placed.some(function (q) { return b.x < q.x + q.w && q.x < b.x + b.w && b.y < q.y + q.h && q.y < b.y + b.h; })) break;
    }
    if (placed) placed.push(b);
    if (bg) { g.fillStyle = bg; g.globalAlpha = 0.85; g.fillRect(b.x, b.y, b.w, b.h); g.globalAlpha = 1; }
    g.textAlign = b.al; g.fillStyle = c; g.fillText(s, b.tx, b.ty);
  }
  /** Angle arc between maths angles a0 and a1 (radians, counter-clockwise) at radius r, label at the middle. */
  function arc(g, x, y, r, a0, a1, label, c, bg, placed) {
    // wrap to ±180°, with slack so exactly ±180° keeps its sign: a1 - a0 of the rotating phasors carries
    // rounding noise, and a hard edge at -180° made the arc flip sides from frame to frame
    var d = a1 - a0, k = Math.PI + 1e-6; while (d > k) d -= 2 * Math.PI; while (d < -k) d += 2 * Math.PI;
    if (Math.abs(d) < 0.02) return;
    g.strokeStyle = c; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, r, -a0, -(a0 + d), d > 0); g.stroke();
    if (label) { var m = a0 + d / 2; tag(g, label, x + r * Math.cos(m), y - r * Math.sin(m), Math.cos(m), -Math.sin(m), c, 11, bg, placed); }
  }
  /** Sliders, readouts, saved state and the quiz-task API, shared by both widgets. */
  function frame(host, cfg, ctx, onChange) {
    var panel = cfg.params ? V.params(cfg.params, function () { onChange(); save(); }, ctx) : null;
    var legend = el('div', { class: 'plot-legend' }), reads = el('div', { class: 'readout-list' }), stage = el('div');
    host.append(el('div', { class: 'plot-widget' }, [panel, stage, legend, reads]));
    var save = U.debounce(function () { if (panel && cfg.persist !== false && !ctx.readOnly()) ctx.setState(Object.assign({}, panel.values)); }, 400);
    if (panel) { var s = ctx.getState(); if (s) panel.setValues(s); }
    return {
      stage: stage, legend: legend,
      p: function () { return panel ? panel.values : {}; },
      readouts: function () {
        reads.innerHTML = '';
        (cfg.readouts ? cfg.readouts(panel ? panel.values : {}) : []).forEach(function (o) {
          var lab = o.tex ? TDC.formula.el(o.tex) : el('span', {}, ctx.tx(o.label));
          reads.appendChild(el('div', { class: 'readout' }, [lab, el('b', {}, ' = ' + (typeof o.value === 'number' ? U.fmtSI(o.value, o.unit || '', o.digits || 3) : o.value))]));
        });
      },
      api: {
        getAnswer: function () { return cfg.answer ? cfg.answer(panel.values) : { v: panel.values[cfg.params[0].id] }; },
        getAnswerState: function () { return panel ? Object.assign({}, panel.values) : null; },
        setAnswerState: function (st) { if (panel && st) { panel.setValues(st); onChange(); } },
        lock: function () { if (panel) panel.querySelectorAll('input').forEach(function (i) { i.disabled = true; }); }
      }
    };
  }
  function legendItem(ctx, c, tex, extra) {
    return el('span', { class: 'lg' }, [el('i', { style: { background: c } }), TDC.formula.el(tex), extra ? ' ' + extra : null]);
  }

  // ---------------------------------------------------------------- phasor
  TDC.widgets.register('phasor', function (host, cfg, ctx) {
    var F = frame(host, cfg, ctx, changed), theta = 0;
    var canRotate = cfg.rotate !== false && !U.reducedMotion(), playing = canRotate;
    var btn = canRotate ? el('button', { type: 'button', class: 'btn btn-small btn-ghost viz-play' }) : null;
    // SVG icons, not ⏸/▶ characters: those fall back to emoji fonts with their own baseline and look off-centre.
    var ICON = { play: 'M4 2.5v11l9.5-5.5z', pause: 'M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z' };
    function setBtn() {
      btn.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="' + ICON[playing ? 'pause' : 'play'] + '"/></svg>';
      btn.appendChild(el('span', {}, ctx.t(playing ? 'viz.pause' : 'viz.play'))); btn.setAttribute('aria-pressed', String(playing));
    }
    if (btn) { btn.addEventListener('click', function () { playing = !playing; setBtn(); }); setBtn(); F.stage.appendChild(btn); }
    var periods = cfg.periods || 2, waves = cfg.waves !== false;
    var cv = V.canvas(F.stage, { animate: canRotate, draw: draw, aspect: function (w) {
      return !waves ? Math.min(w, 420) / w : w < 520 ? (Math.min(w, 320) + 190) / w : 0.42; } });

    function geometry(p) {
      var list = cfg.phasors(p), ends = {}, scale = Object.assign({}, cfg.scale || {}), auto = {};
      list.forEach(function (q, i) {
        var s = q.from && ends[q.from] ? ends[q.from] : [0, 0], a = (q.deg || 0) * D + theta, u = q.unit || '';
        q._i = i; q._a = a; q._s = s; q._e = [s[0] + q.mag * Math.cos(a), s[1] + q.mag * Math.sin(a)];
        ends[q.id || '#' + i] = q._e;
        auto[u] = Math.max(auto[u] || 1e-30, Math.hypot(q._e[0], q._e[1]), Math.hypot(s[0], s[1]), Math.abs(q.mag));
      });
      for (var u in auto) if (!(scale[u] > 0)) scale[u] = auto[u];
      return { list: list, scale: scale };
    }

    /** Smallest 1-2-5 step ≥ x (x > 0). */
    function niceUp(x) { var e = Math.pow(10, Math.floor(Math.log10(x))); return [1, 2, 5, 10].map(function (k) { return k * e; }).filter(function (v) { return v >= x * (1 - 1e-9); })[0]; }
    function draw(g, w, h, t, dt) {
      var p = F.p(), f = cfg.f ? cfg.f(p) : 50;
      // With a real frequency the wave axis is a round time window (1-2-5 ms steps): raising f first adds cycles
      // (periods … 2.5·periods), and only when they get crowded does the window step down to the next round value.
      var Tw = cfg.f && f > 0 ? niceUp(periods / f) : 0, cycles = Tw ? f * Tw : periods;
      if (playing && dt) theta = (theta + 2 * Math.PI * U.acRate(f) * dt) % (2 * Math.PI * cycles);
      var G = geometry(p), stack = w < 520, fg = ctx.color('--fg'), muted = ctx.color('--muted'), line = ctx.color('--line');
      var R, cx, cy, x0, x1, wcy, A;
      if (!waves) { R = h / 2 - 26; cx = w / 2; cy = h / 2; }
      else if (!stack) { R = h / 2 - 26; cx = R + 30; cy = h / 2; x0 = cx + R + 44; x1 = w - 12; wcy = cy; A = R; }
      else { R = Math.min(w, 320) / 2 - 30; cx = w / 2; cy = R + 30; x0 = 12; x1 = w - 12; A = (h - 2 * R - 60) / 2 - 18; wcy = 2 * R + 60 + A + 6; }
      g.clearRect(0, 0, w, h); font(g, 13, 500);
      // phasor plane: axes and the reference circle of the largest phasor
      g.strokeStyle = line; g.lineWidth = 1;
      g.beginPath(); g.moveTo(cx - R - 14, cy); g.lineTo(cx + R + 14, cy); g.moveTo(cx, cy - R - 14); g.lineTo(cx, cy + R + 14); g.stroke();
      g.setLineDash([3, 4]); g.beginPath(); g.arc(cx, cy, R, 0, 2 * Math.PI); g.stroke(); g.setLineDash([]);
      var placed = [];
      tag(g, 'Re', cx + R + 14, cy, 0, 1, muted, 10, null, placed); tag(g, 'Im', cx, cy - R - 14, 1, 0, muted, 6, null, placed);
      function px(q, z) { var k = R / G.scale[q.unit || '']; return [cx + z[0] * k, cy - z[1] * k]; }
      // waves: value at ωt = x is the projection of the rotating phasor, so the same scale (A px = phasor scale)
      var bg = ctx.color('--surface-2'), span = 2 * Math.PI * cycles, X =function (x) { return x0 + (x1 - x0) * x / span; }, xc = waves ? X(theta) : 0;
      if (waves) drawWaves();
      function drawWaves() {
      g.strokeStyle = muted; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x0, wcy); g.lineTo(x1, wcy); g.moveTo(x0, wcy - A - 8); g.lineTo(x0, wcy + A + 8); g.stroke();
      g.fillStyle = muted; g.textAlign = 'center'; g.textBaseline = 'top'; font(g, 12, 400);
      if (Tw) V.niceTicks(0, Tw * 1000, stack ? 4 : 8).forEach(function (ms) {   // round ms ticks; the last one is left to the axis name
        if (!ms) return;
        var xt = X(2 * Math.PI * f * ms / 1000);
        g.beginPath(); g.moveTo(xt, wcy - 3); g.lineTo(xt, wcy + 3); g.stroke();
        if (ms < Tw * 1000 * 0.999) g.fillText(U.fmtNum(ms, 3), xt, wcy + 6);
      });
      else for (var k = 1; k <= 4 * periods; k++) {
        var xt = k * Math.PI / 2;
        g.beginPath(); g.moveTo(X(xt), wcy - 3); g.lineTo(X(xt), wcy + 3); g.stroke();
        if (k % (stack ? 2 : 1) === 0 && k < 4 * periods) g.fillText(String(k * 90) + '°', X(xt), wcy + 6);
      }
      g.textAlign = 'right'; g.fillText(cfg.f ? ctx.t('viz.t') + ' [ms]' : ctx.t('viz.wt'), x1, Math.min(wcy + A + 4, h - 16));
      var peaks = [];
      G.list.forEach(function (q, i) {
        if (q.wave === false) return;
        var c = col(ctx, q.color, i), amp = A * q.mag / G.scale[q.unit || ''];
        g.strokeStyle = c; g.lineWidth = 2; g.setLineDash(q.dash ? [6, 4] : []); g.beginPath();
        for (var j = 0; j <= 240; j++) { var x = span * j / 240, y = wcy - amp * Math.sin(x + (q.deg || 0) * D); if (j) g.lineTo(X(x), y); else g.moveTo(X(x), y); }
        g.stroke(); g.setLineDash([]);
        peaks.push({ y: wcy - Math.abs(amp), c: c, s: U.fmtSI(Math.abs(q.mag) * (cfg.peak || q.peak ? 1 : Math.SQRT2), q.unit || '', 3) });
      });
      // peak values on the wave axis; peaks closer than one text line share a row (side by side) instead of overprinting
      font(g, 12, 600); g.textAlign = 'left'; g.textBaseline = 'bottom';
      peaks.sort(function (a, b) { return a.y - b.y; }).forEach(function (pk, i) {
        var prev = peaks[i - 1];
        if (prev && pk.y < prev.ly + 15) { pk.ly = prev.ly; pk.lx = prev.lx + g.measureText(prev.s).width + 10; } else { pk.ly = pk.y; pk.lx = x0 + 5; }
        g.strokeStyle = pk.c; g.globalAlpha = 0.5; g.setLineDash([2, 4]); g.beginPath(); g.moveTo(x0, pk.y); g.lineTo(x1, pk.y); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
        // halo in the background colour so the waves crossing the label don't break up the digits
        g.strokeStyle = bg; g.lineWidth = 3; g.lineJoin = 'round'; g.strokeText(pk.s, pk.lx, pk.ly - 1);
        g.fillStyle = pk.c; g.fillText(pk.s, pk.lx, pk.ly - 1); g.lineWidth = 1;
      });
      // cursor at ωt = θ
      g.strokeStyle = fg; g.globalAlpha = 0.35; g.lineWidth = 1; g.beginPath(); g.moveTo(xc, wcy - A - 8); g.lineTo(xc, wcy + A + 8); g.stroke(); g.globalAlpha = 1;
      }
      // arcs, phasors, projection lines, labels
      font(g, 14, 600);
      (cfg.arcs ? cfg.arcs(p) : []).forEach(function (a, i) {
        var find = function (id) { return G.list.filter(function (q) { return q.id === id; })[0]; };
        var q0 = a.from && find(a.from), q1 = find(a.to);
        if (q1) arc(g, cx, cy, R * (0.22 + 0.1 * i), q0 ? q0._a : theta, q1._a, a.label, fg, bg, placed);
      });
      G.list.forEach(function (q, i) {
        var c = col(ctx, q.color, i), s = px(q, q._s), e = px(q, q._e);
        // tip-to-tail phasor running back along its predecessor (U_C after U_L): draw it beside, not on top
        var pr = q.from && G.list.filter(function (o) { return o.id === q.from; })[0];
        if (pr && Math.cos(q._a - pr._a) < -0.95) { var off = 9; s = [s[0] - Math.sin(q._a) * off, s[1] - Math.cos(q._a) * off]; e = [e[0] - Math.sin(q._a) * off, e[1] - Math.cos(q._a) * off]; }
        if (!waves || q.wave === false) { /* no wave for this phasor */ }
        else if (!q.from && !stack) {
          var yw = wcy - A * q.mag / G.scale[q.unit || ''] * Math.sin(q._a);
          g.strokeStyle = c; g.globalAlpha = 0.45; g.lineWidth = 1; g.setLineDash([3, 3]);
          g.beginPath(); g.moveTo(e[0], e[1]); g.lineTo(xc, yw); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
          g.fillStyle = c; g.beginPath(); g.arc(xc, yw, 4, 0, 2 * Math.PI); g.fill();
        } else {
          g.fillStyle = c; g.beginPath(); g.arc(xc, wcy - A * q.mag / G.scale[q.unit || ''] * Math.sin(q._a), 4, 0, 2 * Math.PI); g.fill();
        }
        arrow(g, s[0], s[1], e[0], e[1], c, q.dash);
        var L = Math.hypot(e[0] - s[0], e[1] - s[1]) || 1, ux = (e[0] - s[0]) / L, uy = (e[1] - s[1]) / L;
        if (q.label === false) return;
        if (!q.from) { tag(g, q.label || q.id, e[0], e[1], ux, uy, c, 12, bg, placed); return; }
        // tip-to-tail phasor: its tip often meets another tip, so label the middle, on the side away from the origin
        var mx = (s[0] + e[0]) / 2, my = (s[1] + e[1]) / 2, nx = -uy, ny = ux;
        if ((mx - cx) * nx + (my - cy) * ny < 0) { nx = -nx; ny = -ny; }
        tag(g, q.label || q.id, mx, my, nx, ny, c, 10, bg, placed);
      });
    }
    function changed() {
      var G = geometry(F.p());
      F.legend.innerHTML = '';
      G.list.forEach(function (q, i) {
        F.legend.appendChild(legendItem(ctx, col(ctx, q.color, i), q.label || q.id, '= ' + U.fmtSI(q.mag, q.unit || '', 3) + ' ∠ ' + U.fmtNum(q.deg || 0, 3) + '°'));
      });
      F.readouts(); cv.redraw();
    }
    ctx.onTheme(changed); ctx.onLang(function () { if (btn) setBtn(); changed(); });
    changed();
    return Object.assign({ destroy: cv.destroy }, F.api);
  });

  // ---------------------------------------------------------------- cplane
  TDC.widgets.register('cplane', function (host, cfg, ctx) {
    var F = frame(host, cfg, ctx, changed);
    var cv = V.canvas(F.stage, { animate: false, aspect: function (w) { return w < 520 ? 0.9 : 0.55; }, draw: draw });
    function draw(g, w, h) {
      var p = F.p(), list = cfg.vectors(p), unit = cfg.unit || '', fg = ctx.color('--fg'), muted = ctx.color('--muted'), line = ctx.color('--line');
      var pts = [[0, 0]];
      list.forEach(function (v) { v._s = v.from || [0, 0]; v._e = [v._s[0] + v.re, v._s[1] + v.im]; pts.push(v._s, v._e); });
      var b = cfg.bounds ? cfg.bounds(p) : null;
      var r0 = b ? b.re[0] : Math.min.apply(null, pts.map(function (q) { return q[0]; })), r1 = b ? b.re[1] : Math.max.apply(null, pts.map(function (q) { return q[0]; }));
      var i0 = b ? b.im[0] : Math.min.apply(null, pts.map(function (q) { return q[1]; })), i1 = b ? b.im[1] : Math.max.apply(null, pts.map(function (q) { return q[1]; }));
      var pad = b ? 0 : 0.14 * Math.max(r1 - r0, i1 - i0, 1e-30);
      r0 -= pad; r1 += pad; i0 -= pad; i1 += pad;
      var m = { l: 50, r: 18, t: 22, b: 34 }, aw = w - m.l - m.r, ah = h - m.t - m.b;
      var k = Math.min(aw / (r1 - r0), ah / (i1 - i0));      // equal scale on both axes: angles are true
      var ox = m.l + (aw - k * (r1 - r0)) / 2, oy = m.t + (ah - k * (i1 - i0)) / 2;
      var X = function (re) { return ox + (re - r0) * k; }, Y = function (im) { return oy + (i1 - im) * k; };
      g.clearRect(0, 0, w, h); font(g, 12, 400);
      g.lineWidth = 1; g.fillStyle = muted; g.textBaseline = 'top'; g.textAlign = 'center';
      var tr = V.niceTicks(r0, r1, w < 520 ? 4 : 7), ti = V.niceTicks(i0, i1, 6);
      tr.forEach(function (t) { g.strokeStyle = line; g.beginPath(); g.moveTo(X(t), Y(i1)); g.lineTo(X(t), Y(i0)); g.stroke(); g.fillText(U.fmtNum(t, 4), X(t), Y(i0) + 5); });
      g.textAlign = 'right'; g.textBaseline = 'middle';
      ti.forEach(function (t) { g.strokeStyle = line; g.beginPath(); g.moveTo(X(r0), Y(t)); g.lineTo(X(r1), Y(t)); g.stroke(); g.fillText(U.fmtNum(t, 4), X(r0) - 5, Y(t)); });
      g.strokeStyle = muted; g.lineWidth = 1.5; g.beginPath();
      if (i0 <= 0 && i1 >= 0) { g.moveTo(X(r0), Y(0)); g.lineTo(X(r1), Y(0)); }
      if (r0 <= 0 && r1 >= 0) { g.moveTo(X(0), Y(i0)); g.lineTo(X(0), Y(i1)); }
      g.stroke();
      // centroid: vector labels go on the outside of the triangle
      var cxm = 0, cym = 0; pts.forEach(function (q) { cxm += X(q[0]); cym += Y(q[1]); }); cxm /= pts.length; cym /= pts.length;
      font(g, 14, 600);
      var placed = [];
      (cfg.arcs ? cfg.arcs(p) : []).forEach(function (a, i) {   // several arcs: each one further out, so labels don't overprint
        var at = a.at || [0, 0]; arc(g, X(at[0]), Y(at[1]), a.r || 34 + 22 * i, (a.from || 0) * D, a.to * D, a.label, fg, ctx.color('--surface-2'), placed);
      });
      list.forEach(function (v, i) {
        var c = col(ctx, v.color, i), s = [X(v._s[0]), Y(v._s[1])], e = [X(v._e[0]), Y(v._e[1])];
        arrow(g, s[0], s[1], e[0], e[1], c, v.dash);
        var mx = (s[0] + e[0]) / 2, my = (s[1] + e[1]) / 2, L = Math.hypot(e[0] - s[0], e[1] - s[1]) || 1;
        var nx = -(e[1] - s[1]) / L, ny = (e[0] - s[0]) / L;
        if ((mx - cxm) * nx + (my - cym) * ny < 0) { nx = -nx; ny = -ny; }
        if (v.side === -1) { nx = -nx; ny = -ny; }
        var txt = (v.label || '') + (v.value ? ' = ' + U.fmtSI(Math.hypot(v.re, v.im), v.unit || unit, 3) : '');
        if (txt) tag(g, txt, mx, my, nx, ny, c, 10, ctx.color('--surface-2'), placed);
      });
      // axis names last, on a background, so a vector running past the axis end never hides them
      var ax = cfg.re || {}, ay = cfg.im || {}, bg = ctx.color('--surface-2');
      font(g, 12, 600);
      var above = pts.filter(function (q) { return q[1] > 0; }).length >= pts.filter(function (q) { return q[1] < 0; }).length;   // emptier side
      tag(g, (ax.label ? ctx.tx(ax.label) : 'Re') + (unit ? ' [' + unit + ']' : ''), X(r1), i0 <= 0 && i1 >= 0 ? Y(0) : Y(i0), -1, above ? 1 : -1, muted, 8, bg);
      tag(g, (ay.label ? ctx.tx(ay.label) : 'Im') + (unit ? ' [' + unit + ']' : ''), r0 <= 0 && r1 >= 0 ? X(0) : X(r0), Math.max(10, Y(i1) - 10), 1, 0, muted, 6, bg);
    }
    function changed() {
      var list = cfg.vectors(F.p());
      F.legend.innerHTML = '';
      if (cfg.legend) list.forEach(function (v, i) { if (v.label) F.legend.appendChild(legendItem(ctx, col(ctx, v.color, i), v.label)); });
      F.readouts(); cv.redraw();
    }
    ctx.onTheme(changed); ctx.onLang(changed);
    changed();
    return Object.assign({ destroy: cv.destroy }, F.api);
  });
})(window.TDC);

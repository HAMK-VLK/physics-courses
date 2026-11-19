/* Mech widget: straight-line motion.
 *   'motion'  a cart on a track linked to its s,t / v,t / a,t graphs. Run plays the motion and the traces draw live;
 *             drag on the graphs (or arrow keys) to scrub the time. The motion is constant acceleration (sliders s0, v0,
 *             a), a piecewise-linear graph the student reshapes by dragging its knots (knots), or a given function
 *             (fn, for the exercise graphs). Tools: tangent, secant (with an animated "Shrink Δt"), area under v,t
 *             (rectangle + triangle for constant a), trapezoids, strobe marks on the track.
 * Physics in TDC.mechMotion (tested by tools/test-mech.mjs). Config reference: .claude/skills/mech-widgets/SKILL.md. */
(function (TDC) {
  'use strict';
  var U = TDC.util, el = U.el, TV = TDC.mechViz;
  var MM = TDC.mechMotion = {};
  var N = 600;   // samples over the run
  var KEY = { s: { sym: 's', unit: 'm', col: '--c-1' }, v: { sym: 'v', unit: 'm/s', col: '--c-2' }, a: { sym: 'a', unit: 'm/s²', col: '--f-accel' } };

  function cum(y, h, y0) { var o = [y0]; for (var i = 1; i < y.length; i++) o.push(o[i - 1] + (y[i - 1] + y[i]) * h / 2); return o; }
  function diff(y, h) {
    var n = y.length - 1;
    return y.map(function (_, i) { return i === 0 ? (y[1] - y[0]) / h : i === n ? (y[n] - y[n - 1]) / h : (y[i + 1] - y[i - 1]) / (2 * h); });
  }
  /** Piecewise-linear y(t) through the knots (xs ascending), constant outside them. */
  MM.lerp = function (xs, ys, t) {
    if (t <= xs[0]) return ys[0];
    for (var i = 1; i < xs.length; i++) if (t <= xs[i]) return ys[i - 1] + (ys[i] - ys[i - 1]) * (t - xs[i - 1]) / (xs[i] - xs[i - 1]);
    return ys[ys.length - 1];
  };
  /** Series of a motion on [0, T]: the given graph `of` ('s' | 'v' | 'a') sampled from f(t); the others integrated
   *  (trapezoid rule, exact for piecewise-linear v and a) from s0, v0, or differentiated (central differences). */
  MM.series = function (of, f, T, s0, v0) {
    var h = T / N, y = [], t = [], s, v, a;
    for (var i = 0; i <= N; i++) { t.push(i * h); y.push(f(i * h)); }
    if (of === 'a') { a = y; v = cum(a, h, v0); s = cum(v, h, s0); }
    else if (of === 'v') { v = y; s = cum(v, h, s0); a = diff(v, h); }
    else { s = y; v = diff(s, h); a = diff(v, h); }
    return { t: t, s: s, v: v, a: a, h: h, T: T };
  };
  /** The motion of a widget config with slider values p. */
  MM.model = function (cfg, p) {
    var T = cfg.T || 10, s0 = p.s0 || 0, v0 = p.v0 || 0, K = cfg.knots;
    if (K) { var ys = K.t.map(function (_, i) { return p['k' + i]; }); return MM.series(K.of || 'v', function (t) { return MM.lerp(K.t, ys, t); }, T, s0, v0); }
    if (cfg.fn) return MM.series(cfg.fn.of || 's', function (t) { return cfg.fn.f(t, p); }, T, s0, v0);
    return MM.series('a', function () { return p.a || 0; }, T, s0, v0);
  };
  /** Value of series key k at time t (linear between samples). */
  MM.at = function (M, k, t) {
    var x = Math.max(0, Math.min(N, t / M.h)), i = Math.min(N - 1, Math.floor(x));
    return M[k][i] + (M[k][i + 1] - M[k][i]) * (x - i);
  };
  /** Distance travelled (path length, ∫|v| dt) from 0 to t. */
  MM.dist = function (M, t) {
    t = Math.max(0, Math.min(M.T, t));
    var d = 0, n = Math.min(N, Math.floor(t / M.h + 1e-9));
    for (var i = 1; i <= n; i++) d += (Math.abs(M.v[i - 1]) + Math.abs(M.v[i])) * M.h / 2;
    return d + (Math.abs(M.v[n]) + Math.abs(MM.at(M, 'v', t))) * (t - n * M.h) / 2;   // the part-step to t
  };
  /** Trapezoid estimate of ∫ k dt from t1 to t2 with n strips (the method of the slides, t2 p06). */
  MM.trap = function (M, k, t1, t2, n) {
    var w = (t2 - t1) / n, sum = 0;
    for (var i = 0; i < n; i++) sum += (MM.at(M, k, t1 + i * w) + MM.at(M, k, t1 + (i + 1) * w)) * w / 2;
    return sum;
  };

  function symFont(g, px) { g.font = 'italic 600 ' + px + 'px ' + TDC.theme.color('--font-math'); }
  /** Axis name like "v / (m/s)": the symbol italic, the unit upright (SI). */
  function axisName(g, k, x, y, col, sym) {
    var K = Object.assign({}, KEY[k], sym ? { sym: sym } : {}), unit = ' / ' + (/\//.test(K.unit) ? '(' + K.unit + ')' : K.unit);
    symFont(g, 14); g.fillStyle = col; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(K.sym, x, y);
    var w = g.measureText(K.sym).width + 1; TV.font(g, 12, 600); g.fillText(unit, x + w, y);
  }
  /** Symbol with a numeric index, e.g. s₁: the symbol italic, the index upright and lowered (ISO 80000). */
  function symSub(g, sym, sub, x, y, col, bg) {
    symFont(g, 14); var w1 = g.measureText(sym).width + 1; TV.font(g, 10, 600); var w = w1 + g.measureText(sub).width;
    if (bg) { g.globalAlpha = 0.85; g.fillStyle = bg; g.fillRect(x - w / 2 - 4, y - 10, w + 8, 20); g.globalAlpha = 1; }
    g.fillStyle = col; g.textAlign = 'left'; g.textBaseline = 'middle';
    symFont(g, 14); g.fillText(sym, x - w / 2, y); TV.font(g, 10, 600); g.fillText(sub, x - w / 2 + w1, y + 4);
  }
  function range(vals, lo0, hi0) {
    var lo = Math.min(0, lo0 != null ? lo0 : Infinity), hi = Math.max(0, hi0 != null ? hi0 : -Infinity);
    vals.forEach(function (v) { if (v < lo) lo = v; if (v > hi) hi = v; });
    if (hi - lo < 1e-9) { hi += 1; lo -= lo < 0 ? 1 : 0; }
    var tk = TDC.viz.niceTicks(lo, hi, 4), st = tk.length > 1 ? tk[1] - tk[0] : (hi - lo);
    lo = Math.floor(lo / st + 1e-9) * st; hi = Math.ceil(hi / st - 1e-9) * st;   // an exact tick (0) is not widened by a step
    return { lo: lo, hi: hi, ticks: TDC.viz.niceTicks(lo, hi, 4) };
  }

  TDC.widgets.register('motion', function (host, cfg, ctx) {
    var K = cfg.knots, of = K ? K.of || 'v' : cfg.fn ? cfg.fn.of || 's' : 'a';
    var tools = cfg.tools || ['tangent', 'area', 'strobe'], has = function (x) { return tools.indexOf(x) >= 0; };
    var graphs = cfg.graphs || ['s', 'v', 'a'], T = cfg.T || 10;
    var defs = [];
    if (of !== 's') defs.push({ id: 's0', tex: 's_0', min: -50, max: 50, step: 1, value: 0, unit: 'm' });
    if (of === 'a') defs.push({ id: 'v0', tex: 'v_0', min: -20, max: 20, step: 0.5, value: 0, unit: 'm/s' });
    if (!K && !cfg.fn) defs.push({ id: 'a', tex: 'a', min: -5, max: 5, step: 0.1, value: 1, unit: 'm/s²' });
    if (K) K.t.forEach(function (tk, i) {
      defs.push({ id: 'k' + i, tex: KEY[of].sym + '(' + U.fmtNum(tk, 3) + ' s)', min: K.min, max: K.max, step: K.step || 0.5, value: K.value[i], unit: KEY[of].unit });
    });
    (cfg.params || []).forEach(function (d) { defs.push(d); });
    if (has('secant')) defs.push({ id: 'dt', tex: 'Δt', min: T / 100, max: T / 2, step: T / 100, value: T / 4, unit: 's' });
    if (has('trap')) defs.push({ id: 'n', label: TV.L('mv.strips'), min: 1, max: 20, step: 1, value: 4 });

    // Constant-a widgets: the axes span every motion the sliders allow (their corners), not the current run, so s0, v0
    // and a reshape and move the curves and the cart's distance on screen instead of only relabelling the ticks.
    var ENV = null;
    if (!K && !cfg.fn) {
      var corners = [{}], rg = cfg.ranges || {}, vals = cfg.values || {}, fx = cfg.fixed || [];
      defs.forEach(function (d) {
        if (['s0', 'v0', 'a'].indexOf(d.id) < 0) return;
        var r = Object.assign({}, d, rg[d.id] || {}), v = vals[d.id] != null ? vals[d.id] : d.value, opts = fx.indexOf(d.id) >= 0 ? [v] : [r.min, r.max];
        corners = [].concat.apply([], corners.map(function (c) { return opts.map(function (o) { var q = Object.assign({}, c); q[d.id] = o; return q; }); }));
      });
      ENV = { s: [], v: [], a: [] };
      corners.forEach(function (q) {
        var Mc = MM.model(cfg, Object.assign({}, vals, q));
        ['s', 'v', 'a'].forEach(function (k) { ENV[k].push(Math.min.apply(null, Mc[k]), Math.max.apply(null, Mc[k])); });
      });
    }
    var S = { t: cfg.t != null ? cfg.t : T, run: false, M: null };   // cfg.t: where the time cursor starts
    var F = TV.frame(host, cfg, ctx, defs, function () { S.M = null; if (!S.shrink) refresh(); });   // during Shrink Δt the draw loop refreshes (throttled)
    var motion = !U.reducedMotion();
    function model() { return S.M || (S.M = MM.model(cfg, F.p())); }

    function btn(key, fn) { var b = el('button', { type: 'button', class: 'btn btn-small' }); b.textContent = ctx.t(key); b.dataset.key = key; b.addEventListener('click', function () { if (!F.locked) fn(); }); F.controls.appendChild(b); return b; }
    var bRun = btn('mv.run', function () { S.t = motion ? 0 : T; S.run = motion; refresh(); });
    var bShrink = has('secant') ? btn('mv.shrink', function () {
      var lo = (cfg.ranges && cfg.ranges.dt && cfg.ranges.dt.min) || T / 100;
      if (motion) { S.shrink = { from: F.p().dt, to: lo, k: 0 }; } else F.set({ dt: lo });
    }) : null;

    var cv = TDC.viz.canvas(F.stage, { animate: true, draw: draw,
      aspect: function (w) { return (78 + graphs.length * (w < 520 ? 118 : 140) + 22) / w; } });
    var c = cv.canvas; c.tabIndex = 0; c.setAttribute('role', 'slider'); c.setAttribute('aria-valuemin', 0); c.setAttribute('aria-valuemax', T);   // the time cursor, for assistive tech
    function refresh() { reads(); cv.redraw(); }

    // layout (CSS px) of the current canvas size; panels share one time axis
    var L = {};
    function lay(w, h) {
      var ml = w < 520 ? 44 : 54, mr = 40, trackH = 78, ph = (h - trackH - 22) / graphs.length;
      L = { ml: ml, x0: ml, x1: w - mr, trackY: 46, ph: ph, top: trackH, w: w, h: h };
      L.tx = function (t) { return L.x0 + (L.x1 - L.x0) * t / T; };
      L.panel = function (i) { var y0 = trackH + i * ph; return { y0: y0, ya: y0 + 20, yb: y0 + ph - 8 }; };
    }
    function yOf(P, R, v) { return P.yb - (P.yb - P.ya) * (v - R.lo) / (R.hi - R.lo); }

    function draw(g, w, h, now, dt) {
      var M = model(), p = F.p();
      if (S.run && dt) {
        S.t = Math.min(T, S.t + dt * (cfg.speed || Math.max(1, T / 6))); S.rt = (S.rt || 0) + dt;
        if (S.t >= T) S.run = false;
        if (S.rt > 0.15 || !S.run) { S.rt = 0; reads(); }                     // readouts rebuild formulas: not every frame
      }
      if (S.shrink && dt) {
        var sh = S.shrink; sh.k = Math.min(1, sh.k + dt / 2);
        F.set({ dt: +(sh.from + (sh.to - sh.from) * (1 - Math.pow(1 - sh.k, 2))).toPrecision(4) });
        if (sh.k >= 1) S.shrink = null;
        S.rt = (S.rt || 0) + dt; if (S.rt > 0.15 || !S.shrink) { S.rt = 0; reads(); }
      }
      lay(w, h);
      var fg = ctx.color('--fg'), mu = ctx.color('--muted'), wire = ctx.color('--c-wire'), bg = ctx.color('--surface');
      var ax = cfg.axes || {}, Rg = {};
      graphs.concat(['s', 'v']).forEach(function (k) {
        if (Rg[k]) return;
        Rg[k] = ax[k] ? { lo: ax[k][0], hi: ax[k][1], ticks: TDC.viz.niceTicks(ax[k][0], ax[k][1], 4) }
          : ENV ? range(ENV[k]) : range(M[k], K && k === of ? K.min : null, K && k === of ? K.max : null);   // knots: the axis of the dragged graph stays put
      });
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      var t = S.t, i, x, y;

      // ---- track: s maps along it with the same range as the s,t axis
      var Rs = Rg.s, tX = function (s) { return L.x0 + (L.x1 - L.x0) * (s - Rs.lo) / (Rs.hi - Rs.lo); }, ty = L.trackY;
      g.strokeStyle = wire; g.lineWidth = 2; g.beginPath(); g.moveTo(L.x0 - 8, ty + 12); g.lineTo(L.x1 + 8, ty + 12); g.stroke();
      TV.font(g, 11, 500); g.fillStyle = mu; g.textAlign = 'center'; g.textBaseline = 'top';
      Rs.ticks.forEach(function (v) { x = tX(v); g.fillRect(x - 0.5, ty + 12, 1, 5); g.fillText(U.fmtNum(v, 4), x, ty + 19); });
      if (has('strobe')) {                                                   // where the cart was at equal time steps
        var stp = TDC.viz.niceTicks(0, T, 8); stp = stp[1] - stp[0];
        g.strokeStyle = TV.alpha(ctx.color('--c-1'), 0.45); g.lineWidth = 1.5;
        for (var ts = 0; ts <= t + 1e-9; ts += stp) { x = tX(MM.at(M, 's', ts)); g.beginPath(); g.moveTo(x, ty - 4); g.lineTo(x, ty + 10); g.stroke(); }
      }
      var sx = tX(MM.at(M, 's', t)), vt = MM.at(M, 'v', t), at = MM.at(M, 'a', t);
      g.fillStyle = ctx.color('--m-body'); g.strokeStyle = wire; g.lineWidth = 2;
      TV.rr(g, sx - 17, ty - 16, 34, 18, 4); g.fill(); g.stroke();
      g.fillStyle = wire; [-9, 9].forEach(function (d) { g.beginPath(); g.arc(sx + d, ty + 6, 4, 0, 2 * Math.PI); g.fill(); });
      var vmax = Math.max(Math.abs(Rg.v.lo), Math.abs(Rg.v.hi)) || 1, amax = Math.max.apply(null, (ENV ? ENV.a : M.a).map(Math.abs)) || 1;
      var ox = function (L) { return Math.max(18 + Math.max(0, -L), Math.min(w - 18 - Math.max(0, L), sx)); };   // arrows and their labels stay on the canvas
      if (Math.abs(vt) > vmax * 0.02) { var Lv = vt / vmax * 70, xv = ox(Lv); TV.arrow(g, xv, ty - 24, xv + Lv, ty - 24, ctx.color(KEY.v.col), 2.5); symFont(g, 14); TV.text(g, 'v', xv + Lv + (Lv > 0 ? 9 : -9), ty - 24, ctx.color(KEY.v.col), 'center'); }
      if (Math.abs(at) > amax * 0.02) { var La = at / amax * 40, xa = ox(La); TV.arrow(g, xa, ty - 38, xa + La, ty - 38, ctx.color(KEY.a.col), 2); symFont(g, 14); TV.text(g, 'a', xa + La + (La > 0 ? 9 : -9), ty - 38, ctx.color(KEY.a.col), 'center'); }

      // ---- graphs
      graphs.forEach(function (k, gi) {
        var P = L.panel(gi), R = Rg[k], col = ctx.color(KEY[k].col);
        g.strokeStyle = TV.alpha(mu, 0.25); g.lineWidth = 1;                   // grid
        TV.font(g, 11, 500); g.fillStyle = mu; g.textAlign = 'right'; g.textBaseline = 'middle';
        R.ticks.forEach(function (v) { y = yOf(P, R, v); g.beginPath(); g.moveTo(L.x0, y); g.lineTo(L.x1, y); g.stroke(); g.fillText(U.fmtNum(v, 4), L.x0 - 5, y); });
        var tt = TDC.viz.niceTicks(0, T, w < 520 ? 5 : 10);
        tt.forEach(function (v) { x = L.tx(v); g.beginPath(); g.moveTo(x, P.ya); g.lineTo(x, P.yb); g.stroke(); });
        if (gi === graphs.length - 1) { g.textAlign = 'center'; g.textBaseline = 'top'; tt.forEach(function (v) { g.fillText(U.fmtNum(v, 4), L.tx(v), P.yb + 4); }); symFont(g, 14); g.fillStyle = fg; g.textAlign = 'left'; g.fillText('t', L.x1 + 13, P.yb + 4); TV.font(g, 12, 600); g.fillText('/ s', L.x1 + 20, P.yb + 4); }
        g.strokeStyle = wire; g.lineWidth = 1.5; y = yOf(P, R, 0);                // t axis (v = 0) and the vertical axis
        g.beginPath(); g.moveTo(L.x0, y); g.lineTo(L.x1, y); g.moveTo(L.x0, P.ya - 4); g.lineTo(L.x0, P.yb); g.stroke();
        axisName(g, k, L.x0 + 6, P.y0 + 9, fg, cfg.sym && cfg.sym[k]);   // cfg.sym {s: 'x'}: the exercise's own symbol

        // area under v,t (or a,t): rectangle + triangle for constant a, else the region under the curve
        var area = has('area') && (k === 'v' || (k === 'a' && graphs.indexOf('v') < 0)) && t > 0;
        if (area) {
          var y0 = yOf(P, R, 0);
          if (!K && !cfg.fn) {
            var v0 = M[k][0], vv = MM.at(M, k, t);
            g.fillStyle = TV.alpha(ctx.color('--c-1'), 0.22); g.fillRect(L.tx(0), Math.min(y0, yOf(P, R, v0)), L.tx(t) - L.tx(0), Math.abs(yOf(P, R, v0) - y0));
            g.fillStyle = TV.alpha(ctx.color('--c-3'), 0.3); g.beginPath(); g.moveTo(L.tx(0), yOf(P, R, v0)); g.lineTo(L.tx(t), yOf(P, R, vv)); g.lineTo(L.tx(t), yOf(P, R, v0)); g.closePath(); g.fill();
            if (k === 'v' && L.tx(t) - L.tx(0) > 60) {                        // s₁ rectangle, s₂ triangle (t2 p05); formulas in the readouts
              if (Math.abs(yOf(P, R, v0) - y0) > 16) symSub(g, 's', '1', (L.tx(0) + L.tx(t)) / 2, (y0 + yOf(P, R, v0)) / 2, ctx.color('--c-1'), bg);
              if (Math.abs(yOf(P, R, vv) - yOf(P, R, v0)) > 30) symSub(g, 's', '2', L.tx(t * 0.72), yOf(P, R, v0 + (vv - v0) * 0.36), ctx.color('--c-3'), bg);
            }
          } else {
            g.fillStyle = TV.alpha(col, 0.22); g.beginPath(); g.moveTo(L.tx(0), y0);
            for (i = 0; i * M.h <= t; i++) g.lineTo(L.tx(i * M.h), yOf(P, R, M[k][i]));
            g.lineTo(L.tx(t), yOf(P, R, MM.at(M, k, t))); g.lineTo(L.tx(t), y0); g.closePath(); g.fill();
          }
        }
        if (has('trap') && (k === 'v' || (k === 'a' && graphs.indexOf('v') < 0)) && t > 0) {    // trapezoid strips, alternately shaded
          var n = Math.max(1, Math.round(p.n || 4)), sw = t / n, yz = yOf(P, R, 0);
          for (var j = 0; j < n; j++) {
            var ta = j * sw, tb = ta + sw;
            g.beginPath(); g.moveTo(L.tx(ta), yz); g.lineTo(L.tx(ta), yOf(P, R, MM.at(M, k, ta))); g.lineTo(L.tx(tb), yOf(P, R, MM.at(M, k, tb))); g.lineTo(L.tx(tb), yz); g.closePath();
            g.fillStyle = TV.alpha(ctx.color('--c-4'), j % 2 ? 0.14 : 0.26); g.fill(); g.strokeStyle = ctx.color('--c-4'); g.lineWidth = 1.2; g.stroke();
          }
        }
        // the curve: faint for the whole run, solid up to the time cursor
        [[M.t.length - 1, 0.28], [Math.round(t / M.h), 1]].forEach(function (pass) {
          g.strokeStyle = TV.alpha(col, pass[1]); g.lineWidth = 2.5; g.beginPath();
          for (i = 0; i <= pass[0]; i++) { x = L.tx(M.t[i]); y = yOf(P, R, M[k][i]); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
          g.stroke();
        });
        // tangent at t: slope of s,t is v, slope of v,t is a
        var yt = MM.at(M, k, t);
        if (has('tangent') && k !== 'a') {
          var sl = MM.at(M, k === 's' ? 'v' : 'a', t), half = T * 0.16;
          g.save(); g.beginPath(); g.rect(L.x0, P.ya - 6, L.x1 - L.x0, P.yb - P.ya + 6); g.clip();
          g.strokeStyle = fg; g.lineWidth = 1.5; g.beginPath(); g.moveTo(L.tx(t - half), yOf(P, R, yt - sl * half)); g.lineTo(L.tx(t + half), yOf(P, R, yt + sl * half)); g.stroke(); g.restore();
        }
        // secant of s,t over [t, t + Δt] with its Δt, Δs legs (t2 p06)
        if (has('secant') && k === 's') {
          var d = Math.min(p.dt || T / 4, T), t1 = Math.min(t, T - d), t2 = t1 + d, s1 = MM.at(M, 's', t1), s2 = MM.at(M, 's', t2), c4 = ctx.color('--c-4');
          var x1 = L.tx(t1), x2 = L.tx(t2), y1 = yOf(P, R, s1), y2 = yOf(P, R, s2), ex = (x2 - x1) * 0.6, ey = (y2 - y1) * 0.6;
          g.save(); g.beginPath(); g.rect(L.x0, P.ya - 6, L.x1 - L.x0, P.yb - P.ya + 6); g.clip();
          g.strokeStyle = c4; g.lineWidth = 1.8; g.beginPath(); g.moveTo(x1 - ex, y1 - ey); g.lineTo(x2 + ex, y2 + ey); g.stroke(); g.restore();
          g.setLineDash([4, 3]); g.lineWidth = 1.3; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y1); g.lineTo(x2, y2); g.stroke(); g.setLineDash([]);
          g.fillStyle = c4; [[x1, y1], [x2, y2]].forEach(function (q) { g.beginPath(); g.arc(q[0], q[1], 3.5, 0, 2 * Math.PI); g.fill(); });
          symFont(g, 13);
          if (x2 - x1 > 26) TV.text(g, 'Δt', (x1 + x2) / 2, y1 + (y2 < y1 ? 10 : -10), c4, 'center', bg);
          if (Math.abs(y2 - y1) > 18) TV.text(g, 'Δs', x2 + 6, (y1 + y2) / 2, c4, 'left', bg);
        }
        // the time cursor dot
        g.fillStyle = col; g.beginPath(); g.arc(L.tx(t), yOf(P, R, yt), 4.5, 0, 2 * Math.PI); g.fill();
        if (K && k === of) {                                                  // draggable knots
          K.t.forEach(function (tk, ki) { x = L.tx(tk); y = yOf(P, R, p['k' + ki]); g.fillStyle = bg; g.strokeStyle = col; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, 7, 0, 2 * Math.PI); g.fill(); g.stroke(); });
        }
      });
      // time cursor through every panel
      x = L.tx(t); g.strokeStyle = TV.alpha(fg, 0.5); g.lineWidth = 1; g.setLineDash([3, 3]);
      g.beginPath(); g.moveTo(x, L.top + 14); g.lineTo(x, h - 22); g.stroke(); g.setLineDash([]);
      L.R = Rg;
    }

    // ---- pointer: drag a knot of the reshaped graph, else scrub the time
    TV.drag(c, function (px, py) {
      if (F.locked || !L.panel) return false;
      S.drag = null;
      if (K) {
        var gi = graphs.indexOf(of), P = gi >= 0 && L.panel(gi), p = F.p();
        if (P) K.t.forEach(function (tk, ki) { if (Math.hypot(px - L.tx(tk), py - yOf(P, L.R[of], p['k' + ki])) < 14) S.drag = ki; });
      }
      return py > L.top - 6 || S.drag != null;
    }, function (px, py) {
      if (S.drag != null) {
        var P = L.panel(graphs.indexOf(of)), R = L.R[of], v = R.lo + (R.hi - R.lo) * (P.yb - py) / (P.yb - P.ya), st = K.step || 0.5, o = {};
        o['k' + S.drag] = Math.max(K.min, Math.min(K.max, Math.round(v / st) * st)); F.set(o);
      } else { S.run = false; S.t = Math.max(0, Math.min(T, (px - L.x0) / (L.x1 - L.x0) * T)); refresh(); }
    }, function () { S.drag = null; });
    c.addEventListener('keydown', function (e) {
      var stepK = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -10, PageUp: 10, Home: -1e9, End: 1e9 }[e.key];
      if (F.locked || !stepK) return;
      e.preventDefault(); S.run = false; S.t = Math.max(0, Math.min(T, S.t + stepK * T / 50)); refresh();
    });
    function aria() { c.setAttribute('aria-label', ctx.t('mv.motionAria')); }

    function reads() {
      c.setAttribute('aria-valuenow', +S.t.toFixed(2)); c.setAttribute('aria-valuetext', 't = ' + U.fmtNum(S.t, 3) + ' s');
      var M = model(), p = F.p(), t = S.t;
      var at = function (k) { var y = MM.at(M, k, t), big = Math.max.apply(null, M[k].map(Math.abs)); return Math.abs(y) < 1e-9 * big ? 0 : y; };   // sin(π) is 0, not 1.6·10⁻¹⁵ m
      var st = { t: t, s: at('s'), v: at('v'), a: at('a'), M: M };
      st.ds = st.s - M.s[0]; st.dist = MM.dist(M, t); st.dv = st.v - M.v[0];
      var list = [{ tex: 't', value: t, unit: 's' }, { tex: 's', value: st.s, unit: 'm' }, { tex: 'v', value: st.v, unit: 'm/s' }, { tex: 'a', value: st.a, unit: 'm/s²' },
        { label: TV.L('mv.displacement'), value: st.ds, unit: 'm' }, { label: TV.L('mv.distance'), value: st.dist, unit: 'm' }];
      if (has('secant')) {
        var d = Math.min(p.dt, T), t1 = Math.min(t, T - d);
        st.sec = (MM.at(M, 's', t1 + d) - MM.at(M, 's', t1)) / d;
        list.push({ tex: 'v_k = {Δs}/{Δt}', value: st.sec, unit: 'm/s' });
      }
      if (has('area') && !K && !cfg.fn) list.push({ tex: 's_1 = v_0 t', value: M.v[0] * t, unit: 'm' }, { tex: 's_2 = ½ a t²', value: 0.5 * st.a * t * t, unit: 'm' });
      if (has('trap')) { var ak = graphs.indexOf('v') >= 0 ? 'v' : 'a'; st.trap = t > 0 ? MM.trap(M, ak, 0, t, Math.round(p.n)) : 0; list.push({ label: TV.L('mv.trapSum'), value: st.trap, unit: ak === 'v' ? 'm' : 'm/s' }); }
      F.answer = function () { return cfg.answer ? cfg.answer(F.p(), st) : { v: M.s[N] - M.s[0] }; };
      TV.reads(F, cfg, p, st, list);
    }
    ctx.onTheme(function () { cv.redraw(); });
    ctx.onLang(function () { [bRun, bShrink].forEach(function (b) { if (b) b.textContent = ctx.t(b.dataset.key); }); aria(); refresh(); });
    aria(); refresh();
    return Object.assign({ destroy: cv.destroy }, F.api);
  });
})(window.TDC);

/* Mech widget: energy on a track.
 *   'energy'  a block slides along a track profile (a smooth curve through height knots the student can drag);
 *             gravity along the slope, kinetic friction μ m g cos θ, an optional spring launcher at the left end.
 *             Release plays the run; bars show E_p, E_k, E_j (spring) and the friction work W_μ against the constant
 *             total, and a dashed line marks the highest level the remaining energy could lift the block to.
 * Physics in TDC.mechEnergy (tested by tools/test-mech.mjs). Config reference: .claude/skills/mech-widgets/SKILL.md.
 * shortcut: the normal force is m g cos θ (no centripetal term on curves), fine for gentle tracks; loops would need it. */
(function (TDC) {
  'use strict';
  var U = TDC.util, el = U.el, TV = TDC.mechViz, G = 9.81;
  var ME = TDC.mechEnergy = {};
  var NS = 1500;               // arc-length samples of the track
  var DT = 2e-4, EVERY = 80;   // integration step (s); a stored sample every EVERY steps (62.5 per second)
  var DEF_TRACK = [[0, 4], [3, 0.6], [6, 2.6], [9, 0.4], [12, 3]];

  /** Monotone cubic (Fritsch–Carlson) through the knots [[x, y], ...]: never overshoots between knots. */
  ME.curve = function (K) {
    var n = K.length, d = [], m = [], i;
    for (i = 0; i < n - 1; i++) d.push((K[i + 1][1] - K[i][1]) / (K[i + 1][0] - K[i][0]));
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
      var a = m[i] / d[i], b = m[i + 1] / d[i], q = a * a + b * b;
      if (q > 9) { var t = 3 / Math.sqrt(q); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
    }
    return function (x) {
      if (x <= K[0][0]) return K[0][1];
      if (x >= K[n - 1][0]) return K[n - 1][1];
      var j = 0; while (x > K[j + 1][0]) j++;
      var h = K[j + 1][0] - K[j][0], u = (x - K[j][0]) / h, u2 = u * u, u3 = u2 * u;
      return (2 * u3 - 3 * u2 + 1) * K[j][1] + (u3 - 2 * u2 + u) * h * m[j] + (3 * u2 - 2 * u3) * K[j + 1][1] + (u3 - u2) * h * m[j + 1];
    };
  };
  /** The track resampled at equal arc-length steps ds: X, Y per sample, total length S. */
  ME.track = function (K) {
    var f = ME.curve(K), x0 = K[0][0], x1 = K[K.length - 1][0], M = 6000, xs = [], ys = [], L = [0], i;
    for (i = 0; i <= M; i++) { var x = x0 + (x1 - x0) * i / M; xs.push(x); ys.push(f(x)); if (i) L.push(L[i - 1] + Math.hypot(x - xs[i - 1], ys[i] - ys[i - 1])); }
    var S = L[M], ds = S / NS, X = [], Y = [], j = 0;
    for (i = 0; i <= NS; i++) {
      var s = i * ds; while (j < M - 1 && L[j + 1] < s) j++;
      var u = Math.min(1, (s - L[j]) / ((L[j + 1] - L[j]) || 1));
      X.push(xs[j] + u * (xs[j + 1] - xs[j])); Y.push(ys[j] + u * (ys[j + 1] - ys[j]));
    }
    return { X: X, Y: Y, S: S, ds: ds, x0: x0, x1: x1, K: K };
  };
  function seg(T, s) { return Math.max(0, Math.min(NS - 1, Math.floor(s / T.ds))); }
  ME.xy = function (T, s) { var i = seg(T, s), u = s / T.ds - i; return [T.X[i] + u * (T.X[i + 1] - T.X[i]), T.Y[i] + u * (T.Y[i + 1] - T.Y[i])]; };
  /** Arc length s of the point above x (the track is a function of x, so X grows with s). */
  ME.sOf = function (T, x) {
    var lo = 0, hi = NS; if (x <= T.X[0]) return 0; if (x >= T.X[NS]) return T.S;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (T.X[mid] < x) lo = mid; else hi = mid; }
    return (lo + (x - T.X[lo]) / ((T.X[hi] - T.X[lo]) || 1)) * T.ds;
  };
  ME.knots = function (cfg, p) {
    var K = cfg.track || DEF_TRACK;
    return cfg.editable === false ? K : K.map(function (k, i) { return [k[0], p['h' + i] != null ? p['h' + i] : k[1]]; });
  };
  ME.springLen = function (cfg, T) { return cfg.springLen || 0.2 * (T.x1 - T.x0); };

  /** The run for config cfg and values p: samples t, s, x, y, v, Ep, Ek, Es, Wm, dist (60 per second) until the block
   *  stays at rest (stopT) or cfg.T seconds. Semi-implicit Euler along the arc length: slope and friction are taken
   *  per track segment, so the gravity work matches m g Δh. The ends of the track are rigid walls (elastic). */
  ME.run = function (cfg, p) {
    var T = ME.track(ME.knots(cfg, p)), m = p.m || 1, mu = p.mu || 0, k = p.k || 0, spr = !!cfg.spring;
    var xr = spr ? T.x0 + ME.springLen(cfg, T) : -Infinity;           // free end of the spring when relaxed
    var s = spr ? ME.sOf(T, xr - (p.c || 0)) : ME.sOf(T, p.xs != null ? p.xs : (cfg.start != null ? cfg.start : T.x0));
    var v = p.v0 || 0, W = 0, dist = 0, t = 0, Tend = cfg.T || 20, stop = null, n = 0;
    var o = { t: [], s: [], x: [], y: [], v: [], Ep: [], Ek: [], Es: [], Wm: [], dist: [], T: T, xr: xr, m: m };
    function rec() {
      var q = ME.xy(T, s), c = Math.max(0, xr - q[0]);
      o.t.push(t); o.s.push(s); o.x.push(q[0]); o.y.push(q[1]); o.v.push(v);
      o.Ep.push(m * G * q[1]); o.Ek.push(0.5 * m * v * v); o.Es.push(spr ? 0.5 * k * c * c : 0); o.Wm.push(W); o.dist.push(dist);
    }
    for (;;) {
      if (n++ % EVERY === 0 || stop != null || t >= Tend) rec();
      if (stop != null || t >= Tend) break;
      var i = seg(T, s), sn = (T.Y[i + 1] - T.Y[i]) / T.ds, cs = (T.X[i + 1] - T.X[i]) / T.ds;
      var x = T.X[i] + (s / T.ds - i) * (T.X[i + 1] - T.X[i]);
      var drive = -G * sn + (x < xr ? k / m * (xr - x) * cs : 0), fr = mu * G * cs, a;
      if (v !== 0) a = drive - (v > 0 ? fr : -fr);
      else if (Math.abs(drive) <= fr + 1e-12) { stop = t; continue; }   // static: friction holds it (or flat and still)
      else a = drive - (drive > 0 ? fr : -fr);
      var v1 = v + a * DT;
      if (v !== 0 && (v1 > 0) !== (v > 0)) v1 = 0;                       // it stops this step; the next step decides
      var s1 = s + v1 * DT;
      if (s1 < 0) { s1 = 0; v1 = Math.abs(v1); } else if (s1 > T.S) { s1 = T.S; v1 = -Math.abs(v1); }
      W += m * fr * Math.abs(s1 - s); dist += Math.abs(s1 - s);
      s = s1; v = v1; t += DT;
    }
    o.stopT = stop; o.dur = t; o.E0 = o.Ep[0] + o.Ek[0] + o.Es[0];
    return o;
  };
  /** Sample index at time t. */
  ME.idx = function (R, t) { return Math.max(0, Math.min(R.t.length - 1, Math.round(t / (DT * EVERY)))); };

  TDC.widgets.register('energy', function (host, cfg, ctx) {
    var K0 = cfg.track || DEF_TRACK, spr = !!cfg.spring, edit = cfg.editable !== false;
    var ymax0 = Math.max.apply(null, K0.map(function (k) { return k[1]; }));
    var defs = [];
    if (edit) K0.forEach(function (k, i) { defs.push({ id: 'h' + i, tex: 'h_' + (i + 1), min: cfg.hmin || 0, max: cfg.hmax || Math.max(1, Math.ceil(ymax0 * 1.5)), step: cfg.hstep || 0.1, value: k[1], unit: 'm' }); });
    defs.push({ id: 'm', tex: 'm', min: 0.1, max: 10, step: 0.1, value: 1, unit: 'kg' },
      { id: 'mu', tex: 'μ', min: 0, max: 1, step: 0.01, value: 0 },
      { id: 'v0', tex: 'v_0', min: 0, max: 30, step: 0.5, value: 0, unit: 'm/s' });
    if (spr) defs.push({ id: 'k', tex: 'k', min: 10, max: 1000, step: 10, value: 200, unit: 'N/m' }, { id: 'c', tex: 's', min: 0, max: 0.3, step: 0.01, value: 0.1, unit: 'm' });
    else defs.push({ id: 'xs', label: TV.L('me.start'), min: K0[0][0], max: K0[K0.length - 1][0], step: 0.05, value: cfg.start != null ? cfg.start : K0[0][0], unit: 'm' });
    var F = TV.frame(host, Object.assign({}, cfg, { fixed: (cfg.fixed || []).concat(spr ? [] : ['xs']) }), ctx, defs, function () { S.R = null; S.t = 0; S.run = false; refresh(); });
    var S = { t: 0, run: false, R: null }, motion = !U.reducedMotion();
    function run() { return S.R || (S.R = ME.run(cfg, F.p())); }

    function btn(key, fn) { var b = el('button', { type: 'button', class: TV.btnClass(TV.keyKind(key)) }); b.textContent = ctx.t(key); b.dataset.key = key; b.addEventListener('click', function () { if (!F.locked) fn(); }); F.controls.appendChild(b); return b; }
    var bGo = btn('mv.release', function () { S.t = motion ? 0 : run().dur; S.run = motion; refresh(); });
    var bReset = btn('mv.reset', function () { S.t = 0; S.run = false; refresh(); });

    var cv = TDC.viz.canvas(F.stage, { animate: true, draw: draw, aspect: function (w) { return w < 620 ? 0.95 : 0.5; } });
    var c = cv.canvas; c.tabIndex = 0;
    function refresh() { reads(); cv.redraw(); }

    var L = {};
    function draw(g, w, h, now, dt) {
      var R = run(), p = F.p(), T = R.T;
      if (S.run && dt) {
        S.t = Math.min(R.dur, S.t + dt * (cfg.speed || 1)); S.rt = (S.rt || 0) + dt;
        if (S.t >= R.dur) S.run = false;
        if (S.rt > 0.15 || !S.run) { S.rt = 0; reads(); }
      }
      var i = ME.idx(R, S.t), narrow = w < 620;
      var fg = ctx.color('--fg'), mu = ctx.color('--muted'), wire = ctx.color('--c-wire'), bg = ctx.color('--surface');
      g.clearRect(0, 0, w, h); g.lineJoin = 'round'; g.lineCap = 'round';
      // ---- scene: equal scale in x and y, room above the track for the reachable-level line
      var sw = narrow ? w : w * 0.68, sh = narrow ? h * 0.6 : h, ml = 34, mr = 16, mt = 30, mb = 30;
      var reach = (R.Ep[i] + R.Ek[i] + R.Es[i]) / (R.m * G), Ymax = Math.max(0.5, Math.max.apply(null, T.Y), Math.min(reach, Math.max.apply(null, T.Y) * 1.6 + 0.5));
      var sc = Math.min((sw - ml - mr) / (T.x1 - T.x0), (sh - mt - mb) / Ymax);
      var ox = ml + ((sw - ml - mr) - (T.x1 - T.x0) * sc) / 2, gy = sh - mb;
      var X = function (x) { return ox + (x - T.x0) * sc; }, Y = function (y) { return gy - y * sc; };
      L = { X: X, Y: Y, sc: sc, T: T };
      g.fillStyle = ctx.color('--m-ground'); g.beginPath(); g.moveTo(X(T.x0), gy);
      for (var j = 0; j <= NS; j += 5) g.lineTo(X(T.X[j]), Y(T.Y[j]));
      g.lineTo(X(T.x1), gy); g.closePath(); g.fill();
      g.strokeStyle = wire; g.lineWidth = 3; g.beginPath();
      for (j = 0; j <= NS; j += 3) { if (j) g.lineTo(X(T.X[j]), Y(T.Y[j])); else g.moveTo(X(T.X[j]), Y(T.Y[j])); }
      g.lineTo(X(T.X[NS]), Y(T.Y[NS])); g.stroke();
      g.lineWidth = 1.5; g.beginPath(); g.moveTo(X(T.x0) - 6, gy); g.lineTo(X(T.x1) + 6, gy); g.stroke();
      TV.font(g, 11, 500); TV.text(g, 'h = 0', X(T.x0) - 4, gy + 12, mu, 'left');
      // highest level the remaining energy reaches (no friction: the start level for a release from rest)
      if (reach > 0.02 && Y(reach) > 8) {
        g.strokeStyle = TV.alpha(ctx.color('--c-2'), 0.8); g.lineWidth = 1.5; g.setLineDash([6, 4]);
        g.beginPath(); g.moveTo(X(T.x0), Y(reach)); g.lineTo(X(T.x1), Y(reach)); g.stroke(); g.setLineDash([]);
        TV.font(g, 11, 600); TV.text(g, ctx.t('me.reach'), X(T.x1), Y(reach) - 9, ctx.color('--c-2'), 'right', bg);
      }
      if (spr) {                                                            // wall + zigzag spring up to the block
        var wx = X(T.x0), wy = Y(T.Y[0]), bx = X(Math.min(R.x[i], R.xr)), coil = 9;
        g.fillStyle = wire; g.fillRect(wx - 6, wy - 34, 6, 36);
        g.strokeStyle = ctx.color('--c-3'); g.lineWidth = 2; g.beginPath(); g.moveTo(wx, wy - 9);
        for (j = 1; j < coil; j++) g.lineTo(wx + (bx - 13 - wx) * j / coil, wy - 9 + (j % 2 ? -6 : 6));
        g.lineTo(bx - 13, wy - 9); g.stroke();
      }
      if (edit) K0.forEach(function (k, ki) {                              // draggable knots
        g.fillStyle = bg; g.strokeStyle = wire; g.lineWidth = 2; g.beginPath(); g.arc(X(k[0]), Y(p['h' + ki]), 6, 0, 2 * Math.PI); g.fill(); g.stroke();
      });
      // block: oriented along the track, height marker and velocity arrow
      var bxp = X(R.x[i]), byp = Y(R.y[i]), ii = seg(T, R.s[i]), ang = Math.atan2(T.Y[ii + 1] - T.Y[ii], T.X[ii + 1] - T.X[ii]);
      g.strokeStyle = TV.alpha(mu, 0.8); g.lineWidth = 1; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(bxp, byp); g.lineTo(bxp, gy); g.stroke(); g.setLineDash([]);
      if (byp < gy - 18) { TV.font(g, 13, 500); g.font = 'italic ' + g.font; TV.text(g, 'h', bxp + 6, (byp + gy) / 2, mu, 'left', bg); }
      g.save(); g.translate(bxp, byp); g.rotate(-ang);
      g.fillStyle = ctx.color('--m-body'); g.strokeStyle = wire; g.lineWidth = 2; TV.rr(g, -13, -18, 26, 16, 3); g.fill(); g.stroke();
      var vv = R.v[i], vmax = Math.max.apply(null, R.v.map(Math.abs)) || 1;
      if (Math.abs(vv) > vmax * 0.03) { var Lv = vv / vmax * 46; TV.arrow(g, 0, -28, Lv, -28, ctx.color('--c-2'), 2.5); }
      g.restore();
      if (!spr && S.t === 0 && !S.run) { g.fillStyle = TV.alpha(fg, 0.55); g.beginPath(); g.moveTo(bxp, byp + 6); g.lineTo(bxp - 6, byp + 15); g.lineTo(bxp + 6, byp + 15); g.closePath(); g.fill(); }
      // ---- energy bars, scaled to the starting total
      var bars = [['E', 'p', R.Ep[i], '--c-1'], ['E', 'k', R.Ek[i], '--c-2']];
      if (spr) bars.push(['E', 'j', R.Es[i], '--c-3']);
      bars.push(['W', 'μ', R.Wm[i], '--f-friction']);
      var bx0 = narrow ? 24 : sw + 14, bx1 = w - 12, by0 = narrow ? sh + 26 : 34, by1 = h - 30, E0 = cfg.eMax || R.E0 || 1;   // cfg.eMax: a fixed bar scale (J), so m and v0 change the bar heights
      var bw = Math.min(46, (bx1 - bx0) / (bars.length + 1) * 0.7), gap = (bx1 - bx0 - bw * (bars.length + 1)) / (bars.length + 1);
      var BY = function (E) { return by1 - (by1 - by0) * E / E0; };
      g.strokeStyle = wire; g.lineWidth = 1.5; g.beginPath(); g.moveTo(bx0, by1); g.lineTo(bx1, by1); g.stroke();
      bars.concat([['Σ', '', R.Ep[i] + R.Ek[i] + R.Es[i] + R.Wm[i], null]]).forEach(function (b, k) {
        var x = bx0 + gap / 2 + k * (bw + gap), top = BY(Math.max(0, Math.min(b[2], E0 * 1.05)));
        if (b[3]) { g.fillStyle = ctx.color(b[3]); g.fillRect(x, top, bw, by1 - top); }
        else {                                                              // total: the parts stacked
          var y = by1; bars.forEach(function (q) { var hh = (by1 - by0) * Math.max(0, q[2]) / E0; g.fillStyle = TV.alpha(ctx.color(q[3]), 0.85); g.fillRect(x, y - hh, bw, hh); y -= hh; });
          g.strokeStyle = fg; g.lineWidth = 1; g.strokeRect(x, top, bw, by1 - top);
        }
        TV.font(g, 14, 500); g.font = 'italic ' + g.font; g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'top';
        var lw = g.measureText(b[0]).width; g.fillText(b[0], x + bw / 2 - (b[1] ? 4 : 0), by1 + 5);
        if (b[1]) { TV.font(g, 10, 500); g.textAlign = 'left'; g.fillText(b[1], x + bw / 2 - 4 + lw / 2, by1 + 12); }
        TV.font(g, narrow ? 10 : 11, 600); TV.text(g, TV.fmt(b[2], 'J', 2), x + bw / 2, top - 9, fg, 'center');
      });
      g.strokeStyle = TV.alpha(fg, 0.5); g.setLineDash([4, 3]); g.lineWidth = 1; g.beginPath(); g.moveTo(bx0, by0); g.lineTo(bx1, by0); g.stroke(); g.setLineDash([]);
    }

    // ---- pointer: drag a knot up/down, or (no spring) the block along the track to set the start
    TV.drag(c, function (px, py) {
      if (F.locked || !L.X) return false;
      var p = F.p(); S.drag = null;
      if (edit) K0.forEach(function (k, ki) { if (Math.hypot(px - L.X(k[0]), py - L.Y(p['h' + ki])) < 14) S.drag = 'h' + ki; });
      if (!S.drag && !spr) { var q = ME.xy(L.T, ME.sOf(L.T, p.xs)); if (Math.hypot(px - L.X(q[0]), py - L.Y(q[1]) + 9) < 20) S.drag = 'xs'; }
      return !!S.drag;
    }, function (px, py) {
      var o = {}, T = L.T;
      if (S.drag === 'xs') o.xs = Math.max(T.x0, Math.min(T.x1, Math.round((T.x0 + (px - L.X(T.x0)) / L.sc) * 20) / 20));
      else { var d = defs.filter(function (q) { return q.id === S.drag; })[0], st = d.step; o[S.drag] = Math.max(d.min, Math.min(d.max, Math.round((L.Y(0) - py) / L.sc / st) * st)); }
      F.set(o);
    }, function () { S.drag = null; });
    c.addEventListener('keydown', function (e) {                         // keyboard: arrows move the start point
      if (F.locked || spr || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
      e.preventDefault(); var T = run().T, st = (T.x1 - T.x0) / 100;
      F.set({ xs: Math.max(T.x0, Math.min(T.x1, F.p().xs + (e.key === 'ArrowRight' ? st : -st))) });
    });
    function aria() { c.setAttribute('aria-label', ctx.t(spr ? 'me.ariaSpring' : 'me.aria')); }

    function reads() {
      var R = run(), p = F.p(), i = ME.idx(R, S.t);
      if (!spr) {                                                       // arrows move the start point: a slider for assistive tech
        c.setAttribute('role', 'slider'); c.setAttribute('aria-valuemin', R.T.x0); c.setAttribute('aria-valuemax', R.T.x1);
        c.setAttribute('aria-valuenow', p.xs); c.setAttribute('aria-valuetext', 'x = ' + U.fmtNum(p.xs, 3) + ' m');
      }
      var st = { t: R.t[i], h: R.y[i], v: R.v[i], Ep: R.Ep[i], Ek: R.Ek[i], Es: R.Es[i], Wm: R.Wm[i], dist: R.dist[i], R: R,
        stopDist: R.dist[R.dist.length - 1], stopped: R.stopT != null };
      var list = [{ tex: 'h', value: st.h, unit: 'm' }, { tex: 'v', value: Math.abs(st.v), unit: 'm/s' },
        { tex: 'E_p = m g h', value: st.Ep, unit: 'J' }, { tex: 'E_k = ½ m v^2', value: st.Ek, unit: 'J' }];
      if (spr) list.push({ tex: 'E_j = ½ k s^2', value: st.Es, unit: 'J' });
      list.push({ tex: 'W_μ', value: st.Wm, unit: 'J' }, { label: TV.L('me.total'), value: st.Ep + st.Ek + st.Es + st.Wm, unit: 'J' },
        { label: TV.L('mv.distance'), value: st.dist, unit: 'm' });
      F.answer = function () { return cfg.answer ? cfg.answer(F.p(), st) : { v: st.stopDist }; };
      TV.reads(F, cfg, p, st, list);
    }
    ctx.onTheme(function () { cv.redraw(); });
    ctx.onLang(function () { [bGo, bReset].forEach(function (b) { b.textContent = ctx.t(b.dataset.key); }); aria(); refresh(); });
    aria(); refresh();
    return Object.assign({ destroy: cv.destroy }, F.api);
  });
})(window.TDC);

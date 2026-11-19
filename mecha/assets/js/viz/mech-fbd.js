/* Mech widgets: free-body diagrams.
 *   'incline'  canonical lab: block on an incline, sliders α, m, μ_s, μ_k, F (up the slope), planet selector, Release
 *              (animated slide with a = ΣF/m), Step through the six solving steps of the slides (t3 p06).
 *   'fbd'      draw-the-FBD task: forces from a palette, each set to a direction of the scene and a length; graded per
 *              force (direction id or 'none') and per compared pair (lt | eq | gt), like a match question.
 * Config reference: .claude/skills/mech-widgets/SKILL.md. Colours: --f-* tokens. */
(function (TDC) {
  'use strict';
  var U = TDC.util, el = U.el, TV = TDC.mechViz, R = function () { return TDC.render; };
  var D2R = Math.PI / 180;
  var PLANETS = [['earth', 9.81], ['moon', 1.62], ['mars', 3.71], ['jupiter', 24.79]];
  var M = TDC.mechFbd = {};

  function symFont(g, px) { g.font = 'italic 600 ' + px + 'px ' + TDC.theme.color('--font-math'); }
  function upright(g, px, w) { TV.font(g, px, w || 600); }
  /** Arrow of length L px from (x, y) along unit vector (ux, uy), labelled at the tip. */
  function force(g, x, y, ux, uy, L, col, sym, bg, val) {
    if (L < 2) return;
    TV.arrow(g, x, y, x + ux * L, y + uy * L, col, 3.5);
    var lx = x + ux * (L + 15), ly = y + uy * (L + 15) - (val ? 7 : 0);
    if (sym) { symFont(g, 15); TV.text(g, sym, lx, ly, col, 'center', bg); }
    if (val) { upright(g, 12, 600); TV.text(g, val, lx, ly + 15, col, 'center', bg); }   // numbers and units upright (SI)
  }
  function dashed(g, x0, y0, x1, y1, col) {
    g.save(); g.setLineDash([5, 4]); g.strokeStyle = col; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.restore();
  }
  function arc(g, x, y, r, a0, a1, col) { g.strokeStyle = col; g.lineWidth = 1.6; g.beginPath(); g.arc(x, y, r, a0, a1, a1 < a0); g.stroke(); }
  /** Block as a rectangle standing on point (px, py) of a surface with down-slope direction (dx, dy), normal (nx, ny). */
  function block(g, ctx, px, py, dx, dy, nx, ny, bw, bh) {
    g.beginPath();
    g.moveTo(px - dx * bw / 2, py - dy * bw / 2); g.lineTo(px + dx * bw / 2, py + dy * bw / 2);
    g.lineTo(px + dx * bw / 2 + nx * bh, py + dy * bw / 2 + ny * bh); g.lineTo(px - dx * bw / 2 + nx * bh, py - dy * bw / 2 + ny * bh);
    g.closePath(); g.fillStyle = ctx.color('--m-body'); g.fill(); g.strokeStyle = ctx.color('--c-wire'); g.lineWidth = 2.5; g.stroke();
  }

  /** Physics of a block on an incline with an applied force F up the slope (all along-slope values: + = up the slope).
   *  v: current velocity (0 = at rest). Returns forces, friction (signed), acceleration and the state. Exported for tests. */
  M.incline = function (p, v) {
    var a = p.alpha * D2R, G = p.m * p.g, Gpar = G * Math.sin(a), Gperp = G * Math.cos(a), N = Gperp;
    var muk = Math.min(p.muk, p.mus), D = p.F - Gpar, fric, acc, state;
    if (Math.abs(v || 0) > 1e-9) { fric = -Math.sign(v) * muk * N; acc = (D + fric) / p.m; state = v > 0 ? 'up' : 'down'; }
    else if (Math.abs(D) <= p.mus * N + 1e-9) { fric = -D; acc = 0; state = 'rest'; }
    else { fric = -Math.sign(D) * muk * N; acc = (D + fric) / p.m; state = D > 0 ? 'up' : 'down'; }
    return { G: G, Gpar: Gpar, Gperp: Gperp, N: N, fric: fric, fmax: p.mus * N, net: D + fric, a: acc, state: state };
  };

  // ---------------------------------------------------------------- incline lab
  TDC.widgets.register('incline', function (host, cfg, ctx) {
    var defs = [
      { id: 'alpha', tex: 'α', min: 0, max: 60, step: 1, value: 30, unit: '°' },
      { id: 'm', tex: 'm', min: 1, max: 100, step: 1, value: 10, unit: 'kg' },
      { id: 'mus', tex: 'μ_s', min: 0, max: 1, step: 0.01, value: 0.5 },
      { id: 'muk', tex: 'μ_k', min: 0, max: 1, step: 0.01, value: 0.3 },
      { id: 'F', tex: 'F', min: 0, max: 1000, step: 5, value: 0, unit: 'N' }
    ];
    var S = { planet: 0, s: null, v: 0, run: false, t: 0, step: 0 };
    var F = TV.frame(host, cfg, ctx, defs, function () { S.s = null; S.v = 0; S.run = false; S.t = 0; S.vEnd = null; redraw(); });   // a new setting starts from the release point
    var p = function () { return Object.assign({ g: PLANETS[S.planet][1] }, F.p()); };
    var motion = !U.reducedMotion();

    // controls: planet, Release, Reset, Step
    var sel = el('select', { class: 'input mech-planet', 'aria-label': ctx.t('mv.planet') });
    function planetOpts() { sel.innerHTML = ''; PLANETS.forEach(function (pl, i) { sel.appendChild(el('option', { value: i }, ctx.t('mv.planet.' + pl[0]) + ' · g = ' + U.fmtNum(pl[1], 4) + ' m/s²')); }); sel.value = S.planet; }
    sel.addEventListener("change", function () { S.planet = +sel.value; S.s = null; S.v = 0; S.run = false; S.vEnd = null; redraw(); });
    var bRel = btn('mv.release', function () { S.s = null; S.v = 0; S.t = 0; S.vEnd = null; S.run = true; if (!motion) jump(); redraw(); });
    var bReset = btn('mv.reset', function () { S.s = null; S.v = 0; S.t = 0; S.run = false; S.vEnd = null; redraw(); });
    var bStep = btn('mv.step', function () { S.step = (S.step + 1) % 7; redraw(); });
    F.controls.append(sel, bRel, bReset, bStep);
    var cap = el('div', { class: 'mech-caption', 'aria-live': 'polite' });
    F.stage.before(cap);
    function btn(key, fn) { var b = el('button', { type: 'button', class: TV.btnClass(TV.keyKind(key)) }); b.textContent = ctx.t(key); b.dataset.key = key; b.addEventListener('click', function () { if (!F.locked) fn(); }); return b; }

    var geo = {};
    var cv = TDC.viz.canvas(F.stage, { aspect: function (w) { return w < 520 ? 1 : 0.6; }, animate: true, draw: draw });
    function redraw() { caption(); reads(); cv.redraw(); }

    // Reduced motion: no animation, the block jumps to where it stops and the readouts show the run's result.
    function jump() {
      var k = M.incline(p(), 0); if (k.state === 'rest') { S.run = false; return; }
      var room = (k.a > 0 ? S.s0 - geo.lo : geo.hi - S.s0) / geo.ppm;   // metres to the end stop
      S.t = Math.sqrt(2 * room / Math.abs(k.a)); S.v = 0; S.s = S.s0 - Math.sign(k.a) * room * geo.ppm; S.run = false; S.vEnd = Math.abs(k.a) * S.t;
    }
    function step(dt) {
      if (!S.run || !dt) return;
      var k = M.incline(p(), S.v), v1 = S.v + k.a * dt;
      if (S.v !== 0 && Math.sign(v1) !== Math.sign(S.v)) v1 = 0;            // friction stops it; it never reverses by itself
      if (S.v === 0 && k.state === 'rest') { S.run = false; return; }
      S.s -= (S.v + v1) / 2 * dt * geo.ppm; S.v = v1; S.t += dt;
      var lo = geo.lo, hi = geo.hi;
      if (S.s <= lo || S.s >= hi) { S.s = Math.max(lo, Math.min(hi, S.s)); S.vEnd = Math.abs(S.v); S.v = 0; S.run = false; reads(); }
    }

    function draw(g, w, h, t, dt) {
      var P = p(), al = P.alpha * D2R, ca = Math.cos(al), sa = Math.sin(al);
      var gy = h * 0.9, x0 = w * 0.06, B = w * 0.8, H = B * Math.tan(al);
      if (H > h * 0.7) { H = h * 0.7; B = H / Math.tan(al); }
      var top = [x0, gy - H], L = Math.hypot(B, H), dx = ca, dy = sa, nx = sa, ny = -ca;
      var bw = Math.max(44, Math.min(70, w * 0.1)), bh = bw * 0.62;
      geo = { L: L, bw: bw, ppm: L / 5, lo: bw / 2, hi: L * 0.74 };         // the slope is 5 m long; an end stop at 74 % keeps the arrows on screen
      S.s0 = L * 0.32; if (S.s == null) S.s = S.s0;
      step(dt);
      var col = function (n) { return ctx.color(n); }, fg = col('--fg'), bg = col('--surface');
      g.clearRect(0, 0, w, h);
      // ground and incline
      g.fillStyle = col('--m-ground'); g.strokeStyle = col('--c-wire'); g.lineWidth = 3;
      g.beginPath(); g.moveTo(top[0], top[1]); g.lineTo(x0 + B, gy); g.lineTo(x0, gy); g.closePath(); g.fill(); g.stroke();
      g.lineWidth = 2; g.beginPath(); g.moveTo(0, gy); g.lineTo(w, gy); g.stroke();
      if (P.alpha > 0) { arc(g, x0 + B, gy, 46, Math.PI, Math.PI + al, fg); symFont(g, 15); TV.text(g, 'α', x0 + B - 60, gy - 10, fg, 'center'); }
      // end stop, then the block
      var ex = top[0] + dx * (geo.hi + bw / 2), ey = top[1] + dy * (geo.hi + bw / 2);
      g.fillStyle = col('--c-wire'); g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex + dx * 6, ey + dy * 6); g.lineTo(ex + dx * 6 + nx * bh * 0.5, ey + dy * 6 + ny * bh * 0.5); g.lineTo(ex + nx * bh * 0.5, ey + ny * bh * 0.5); g.closePath(); g.fill();
      var px = top[0] + dx * S.s, py = top[1] + dy * S.s, cx = px + nx * bh / 2, cy = py + ny * bh / 2;
      block(g, ctx, px, py, dx, dy, nx, ny, bw, bh);
      var st = S.step, k = M.incline(P, S.v);
      if (st === 1) return;
      // force scale: the largest force is 30 % of the canvas height
      var big = Math.max(k.G, P.F, Math.abs(k.fric), 1e-9), sc = h * 0.25 / big;
      var mag = st === 0 || st >= 3, val = function (v) { return mag ? TV.fmt(v, 'N') : ''; };
      if (st === 0 || st >= 4) {                                             // axes: x up the slope, y out of it
        var ax = cx - dx * bw * 1.7, ay = cy - dy * bw * 1.7;
        g.globalAlpha = 0.65; TV.arrow(g, cx, cy, ax, ay, col('--muted'), 1.5); TV.arrow(g, cx, cy, cx + nx * bw * 1.4, cy + ny * bw * 1.4, col('--muted'), 1.5); g.globalAlpha = 1;
        symFont(g, 14); TV.text(g, '+x', ax - dx * 14, ay - dy * 14 - 6, col('--muted'), 'center'); TV.text(g, '+y', cx + nx * bw * 1.3 + dx * 16, cy + ny * bw * 1.3 + dy * 16, col('--muted'), 'center');
      }
      if (st === 0 || st >= 5) {                                             // components of mg, right triangle, angle α at the body
        var Lg = k.G * sc, wpx = cx + dx * k.Gpar * sc, wpy = cy + dy * k.Gpar * sc;
        dashed(g, cx, cy, cx - nx * k.Gperp * sc, cy - ny * k.Gperp * sc, col('--f-weight'));
        dashed(g, cx - nx * k.Gperp * sc, cy - ny * k.Gperp * sc, cx, cy + Lg, col('--f-weight'));
        dashed(g, cx, cy, wpx, wpy, col('--f-weight'));
        if (P.alpha > 2) { arc(g, cx, cy, Math.min(34, Lg * 0.5), Math.PI / 2, Math.PI / 2 + al, col('--f-weight')); }
        symFont(g, 13);
        TV.text(g, 'mg sin α', wpx + dx * 8, wpy + dy * 8 + 12, col('--f-weight'), 'left', bg);
        TV.text(g, 'mg cos α', cx - nx * k.Gperp * sc - 6, cy - ny * k.Gperp * sc + 14, col('--f-weight'), 'right', bg);
      }
      force(g, cx, cy, 0, 1, k.G * sc, col('--f-weight'), 'mg', bg, val(k.G));
      force(g, cx, cy, nx, ny, k.N * sc, col('--f-normal'), 'N', bg, val(k.N));
      if (P.F > 0) force(g, cx, cy, -dx, -dy, P.F * sc, col('--f-applied'), 'F', bg, val(P.F));
      if (Math.abs(k.fric) > 1e-6) { var fs = Math.sign(k.fric); force(g, px - dx * fs * bw * 0.5, py - dy * fs * bw * 0.5, -dx * fs, -dy * fs, Math.abs(k.fric) * sc, col('--f-friction'), 'F_μ', bg, val(Math.abs(k.fric))); }
      var stopped = !S.run && S.vEnd != null;   // resting against an end stop after a run
      if (k.state !== 'rest' && !stopped && (st === 0 || st === 6)) {                   // acceleration arrow beside the block
        var as = Math.sign(k.a), ox = cx + nx * bh * 1.3, oy = cy + ny * bh * 1.3;
        TV.arrow(g, ox, oy, ox - dx * as * 46, oy - dy * as * 46, col('--f-accel'), 2.5); symFont(g, 15); TV.text(g, 'a', ox - dx * as * 56, oy - dy * as * 56, col('--f-accel'), 'center');
      }
    }

    function caption() {
      bStep.textContent = ctx.t('mv.step') + (S.step ? ' ' + S.step + '/6' : '');
      if (!S.step) { cap.hidden = true; return; }
      cap.hidden = false; cap.innerHTML = '';
      var P = p(), k = M.incline(P, 0), sgn = k.fric < 0 ? '−' : '+';
      cap.appendChild(el('b', {}, S.step + '. ' + ctx.t('mv.step' + S.step)));
      cap.appendChild(R().txs('span', ' ' + ctx.t('mv.step' + S.step + '.d')));   // <f>…</f> in the text: symbols set as formulas
      if (S.step >= 5) {
        cap.appendChild(TDC.formula.el('ΣF_x = F ' + sgn + ' F_μ − m g sin α = m a', true));
        cap.appendChild(TDC.formula.el('ΣF_y = N − m g cos α = 0', true));
      }
      if (S.step === 6) cap.appendChild(TDC.formula.el(k.state === 'rest'
        ? 'a = 0  ' + ctx.t('mv.atRest') : 'a = {F ' + sgn + ' F_μ − m g sin α}/{m} = ' + U.fmtNum(k.a, 3) + ' m/s²', true));
      if (S.step === 6 && k.state !== 'rest') cap.appendChild(el('div', { class: 'mech-caption-note' }, '(' + ctx.t('mv.state.' + k.state) + ')'));   // the sign of a against +x up the slope
    }
    function reads() {
      var P = p(), k = M.incline(P, S.v), st = { rest: 'mv.state.rest', up: 'mv.state.up', down: 'mv.state.down' }[M.incline(P, 0).state];
      F.answer = function () { return { v: Math.abs(M.incline(p(), 0).a) }; };
      TV.reads(F, cfg, P, k, [
        { tex: 'G = m g', value: k.G, unit: 'N' },
        { tex: 'm g sin α', value: k.Gpar, unit: 'N' },
        { tex: 'N = m g cos α', value: k.N, unit: 'N' },
        { tex: 'μ_s N', value: k.fmax, unit: 'N' },
        { tex: 'tan α', value: Math.tan(P.alpha * D2R), digits: 3 },
        { tex: 'a', value: Math.abs(M.incline(P, 0).a), unit: 'm/s²' },
        { label: { en: 'Result', fi: 'Tulos' }, value: ctx.t(st) },
        S.vEnd != null && !S.run ? { tex: 'v_end', value: S.vEnd, unit: 'm/s' } : null
      ]);
    }
    ctx.onTheme(function () { cv.redraw(); });
    function aria() { cv.canvas.setAttribute('aria-label', ctx.t('mv.inclineAria')); }
    ctx.onLang(function () { aria(); planetOpts(); [bRel, bReset].forEach(function (b) { b.textContent = ctx.t(b.dataset.key); }); redraw(); });
    aria(); planetOpts(); redraw();
    return Object.assign({ destroy: cv.destroy }, F.api);
  });

  // ---------------------------------------------------------------- draw-the-FBD task
  /** Directions of a scene, as math angles (degrees, counter-clockwise from +x). The slope rises to the left. */
  M.dirs = function (cfg) {
    var d = [['up', 90], ['down', 270], ['left', 180], ['right', 0]];
    if (cfg.scene === 'incline') {
      var a = cfg.angle || 30;
      d.push(['upslope', 180 - a], ['downslope', 360 - a], ['out', 90 - a], ['into', 270 - a]);
    }
    if (cfg.rope != null) d.push(['rope', cfg.rope]);
    return d;
  };
  /** Colour token of a force: f.color, else by its symbol (mg/G weight, N normal, F_μ friction), else a cycle. */
  M.color = function (f, i) {
    var t = f.tex || '';
    return f.color || (/^(m ?g|G)$/.test(t) ? '--f-weight' : t === 'N' ? '--f-normal' : /^F_μ/.test(t) ? '--f-friction' : ['--f-applied', '--f-accel', '--c-4', '--c-6'][i % 4]);
  };
  /** Relation of two arrow lengths: equal within ±15 %. */
  M.rel = function (a, b) { return a <= 0 || b <= 0 ? 'na' : a > b * 1.15 ? 'gt' : b > a * 1.15 ? 'lt' : 'eq'; };
  M.answer = function (cfg, st) {
    var o = {};
    cfg.forces.forEach(function (f) { o[f.id] = (st[f.id] && st[f.id].d) || 'none'; });
    (cfg.compare || []).forEach(function (c) {
      var a = st[c[0]], b = st[c[1]];
      o[c[0] + '~' + c[1]] = a && b && a.d !== 'none' && b.d !== 'none' ? M.rel(a.len, b.len) : 'na';
    });
    return o;
  };

  TDC.widgets.register('fbd', function (host, cfg, ctx) {
    var dirs = M.dirs(cfg), st = {}, locked = false, marks = null;
    cfg.forces.forEach(function (f, i) { st[f.id] = { d: 'none', len: [40, 70, 55, 85, 30, 60][i % 6] }; });   // unequal starts: no free 'equal' comparisons
    function ok(e) { return e && (e.d === 'none' || dirs.some(function (d) { return d[0] === e.d; })) && isFinite(e.len); }   // old or edited notes
    function restore(e) { return { d: e.d, len: Math.max(10, Math.min(100, +e.len)) }; }
    var saved = ctx.getState(); if (saved) Object.keys(saved).forEach(function (k) { if (st[k] && ok(saved[k])) st[k] = restore(saved[k]); });
    var save = U.debounce(function () { ctx.setState(st); }, 400);
    var stage = el('div', { class: 'mech-stage' }), rows = el('div', { class: 'fbd-rows' }), cmpBox = el('div', { class: 'fbd-cmp' });
    host.append(el('div', { class: 'plot-widget mech-widget fbd-widget' }, [stage, rows, cmpBox]));
    var ui = {};
    cfg.forces.forEach(function (f) {
      var s = el('select', { class: 'input' });
      var r = el('input', { type: 'range', min: 10, max: 100, step: 1, value: st[f.id].len });
      var lab = el('span', { class: 'fbd-name' }, [f.tex ? TDC.formula.el(f.tex) : el('span')]);
      if (!f.tex) TDC.i18n.bind(lab.firstChild, f.label, true);
      var mark = el('span', { class: 'fbd-mark', 'aria-live': 'polite' });
      s.addEventListener('change', function () { st[f.id].d = s.value; changed(); });
      r.addEventListener('input', function () { st[f.id].len = +r.value; changed(); });
      rows.appendChild(el('div', { class: 'fbd-row' }, [lab, s, el('label', { class: 'fbd-len' }, [el('span', { 'data-key': 'mv.length' }), r]), mark]));
      ui[f.id] = { sel: s, range: r, mark: mark, row: rows.lastChild };
    });
    function fill() {
      cfg.forces.forEach(function (f) {
        var s = ui[f.id].sel; s.innerHTML = '';
        s.appendChild(el('option', { value: 'none' }, ctx.t('mv.dir.none')));
        dirs.forEach(function (d) { s.appendChild(el('option', { value: d[0] }, ctx.t('mv.dir.' + d[0]))); });
        s.value = st[f.id].d; s.setAttribute('aria-label', ctx.tx(f.label || f.tex) + ': ' + ctx.t('mv.direction'));
        ui[f.id].range.setAttribute('aria-label', ctx.tx(f.label || f.tex) + ': ' + ctx.t('mv.length'));
      });
      rows.querySelectorAll('[data-key]').forEach(function (n) { n.textContent = ctx.t(n.dataset.key); });
      cv.canvas.setAttribute('aria-label', ctx.t('mv.fbdAria'));
      paintMarks();
    }
    function cmp() {          // rebuilding the selects here would close an open dropdown on every change
      cmpBox.innerHTML = '';
      (cfg.compare || []).forEach(function (c) {
        var id = c[0] + '~' + c[1], f0 = cfg.forces.filter(function (f) { return f.id === c[0]; })[0], f1 = cfg.forces.filter(function (f) { return f.id === c[1]; })[0];
        var ok = marks && marks[id];
        cmpBox.appendChild(el('div', { class: 'fbd-cmp-row' + (marks ? (ok ? ' ok' : ' bad') : '') }, [
          el('span', {}, ctx.t('mv.compare') + ' '), TDC.formula.el(f0.tex || ctx.tx(f0.label)), el('span', {}, ' ↔ '), TDC.formula.el(f1.tex || ctx.tx(f1.label)),
          markEl(el('span', { class: 'fbd-mark' }), marks ? ok : null)]));
      });
    }
    function changed() { marks = null; paintMarks(); cv.redraw(); save(); }
    function paintMarks() {
      cfg.forces.forEach(function (f) {
        var m = marks ? marks[f.id] : null;
        ui[f.id].row.classList.toggle('ok', m === true); ui[f.id].row.classList.toggle('bad', m === false);
        markEl(ui[f.id].mark, m == null ? null : m);
      });
      cmp();
    }
    function markEl(n, ok) {  // ✓/✗ with a spoken name
      n.textContent = ok == null ? '' : ok ? ' ✓' : ' ✗';
      if (ok == null) { n.removeAttribute('role'); n.removeAttribute('aria-label'); }
      else { n.setAttribute('role', 'img'); n.setAttribute('aria-label', ctx.t(ok ? 'mv.ok' : 'mv.bad')); }
      return n;
    }
    var geo = {};
    var cv = TDC.viz.canvas(stage, { aspect: function (w) { return w < 520 ? 0.85 : 0.5; }, animate: false, draw: draw });
    function draw(g, w, h) {
      var col = function (n) { return ctx.color(n); }, fg = col('--c-wire');
      g.clearRect(0, 0, w, h);
      var cx = w / 2, cy = h * 0.52, bw = Math.max(48, Math.min(76, w * 0.12)), bh = bw * 0.62, a = (cfg.angle || 30) * D2R;
      g.lineWidth = 3; g.strokeStyle = fg; g.fillStyle = col('--m-ground');
      if (cfg.scene === 'incline') {                                         // slope through the block's contact point
        var dx = Math.cos(a), dy = Math.sin(a), nx = Math.sin(a), ny = -Math.cos(a), px = cx - nx * bh / 2, py = cy - ny * bh / 2;
        var ex = w, ey = py + (w - px) * Math.tan(a), sx = 0, sy = py - px * Math.tan(a);
        g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.lineTo(ex, h); g.lineTo(sx, h); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke();
        block(g, ctx, px, py, dx, dy, nx, ny, bw, bh);
      } else if (cfg.scene === 'hanging') {                                  // body hanging on a cord from the ceiling
        g.fillRect(0, 0, w, h * 0.08); g.beginPath(); g.moveTo(0, h * 0.08); g.lineTo(w, h * 0.08); g.stroke();
        g.lineWidth = 2; g.beginPath(); g.moveTo(cx, h * 0.08); g.lineTo(cx, cy - bh / 2); g.stroke();
        block(g, ctx, cx, cy + bh / 2, 1, 0, 0, -1, bw, bh);
      } else {                                                               // floor (default)
        var fy = cy + bh / 2; g.fillRect(0, fy, w, h - fy); g.beginPath(); g.moveTo(0, fy); g.lineTo(w, fy); g.stroke();
        block(g, ctx, cx, fy, 1, 0, 0, -1, bw, bh);
      }
      if (cfg.rope != null) {                                                // rope pulling at its angle
        var ra = cfg.rope * D2R; g.lineWidth = 2; g.strokeStyle = col('--muted');
        g.beginPath(); g.moveTo(cx + Math.cos(ra) * bw * 0.45, cy - Math.sin(ra) * bh * 0.45); g.lineTo(cx + Math.cos(ra) * w, cy - Math.sin(ra) * w); g.stroke();
      }
      var unit = Math.min(w, h) * 0.0042;                                   // length 100 = 42 % of the short side
      geo = { cx: cx, cy: cy, unit: unit };
      var bg = col('--surface');
      cfg.forces.forEach(function (f, i) {
        var s = st[f.id]; if (s.d === 'none') return;
        var ang = dirs.filter(function (d) { return d[0] === s.d; })[0][1] * D2R, ux = Math.cos(ang), uy = -Math.sin(ang);
        var c = marks && marks[f.id] === false ? col('--bad') : col(M.color(f, i));
        force(g, cx, cy, ux, uy, s.len * unit, c, f.tex || ctx.tx(f.label), bg);
      });
      g.fillStyle = fg; g.beginPath(); g.arc(cx, cy, 3.5, 0, 2 * Math.PI); g.fill();
    }
    // drag an arrow tip: snaps to the nearest scene direction; the length follows the pointer
    var dragId = null;
    TV.drag(cv.canvas, function (x, y) {
      if (locked) return false;
      dragId = null; var best = 18;
      cfg.forces.forEach(function (f) {
        var s = st[f.id]; if (s.d === 'none') return;
        var ang = dirs.filter(function (d) { return d[0] === s.d; })[0][1] * D2R;
        var tx = geo.cx + Math.cos(ang) * s.len * geo.unit, ty = geo.cy - Math.sin(ang) * s.len * geo.unit, dd = Math.hypot(x - tx, y - ty);
        if (dd < best) { best = dd; dragId = f.id; }
      });
      return !!dragId;
    }, function (x, y) {
      var ang = Math.atan2(geo.cy - y, x - geo.cx) / D2R, best = 1e9, pick = null;
      dirs.forEach(function (d) { var diff = Math.abs(((ang - d[1]) % 360 + 540) % 360 - 180); if (diff < best) { best = diff; pick = d[0]; } });
      var s = st[dragId]; s.d = pick; s.len = Math.max(10, Math.min(100, Math.round(Math.hypot(x - geo.cx, y - geo.cy) / geo.unit)));
      ui[dragId].sel.value = s.d; ui[dragId].range.value = s.len; changed();
    }, function () { dragId = null; });
    ctx.onTheme(function () { cv.redraw(); });
    ctx.onLang(function () { fill(); cv.redraw(); });
    fill();
    return {
      destroy: cv.destroy,
      // untouched (every force 'not acting') counts as empty: Check would otherwise mark the distractors ✓ for free
      getAnswer: function () { return cfg.forces.some(function (f) { return st[f.id].d !== 'none'; }) ? { v: M.answer(cfg, st) } : {}; },
      getAnswerState: function () { return JSON.parse(JSON.stringify(st)); },
      setAnswerState: function (s) { if (s) { Object.keys(s).forEach(function (k) { if (st[k] && ok(s[k])) st[k] = restore(s[k]); ui[k] && (ui[k].sel.value = st[k].d, ui[k].range.value = st[k].len); }); cv.redraw(); } },
      mark: function (parts) { marks = parts || null; paintMarks(); cv.redraw(); },
      lock: function () { locked = true; host.querySelectorAll('input, select, button').forEach(function (i) { i.disabled = true; }); }
    };
  });
})(window.TDC);

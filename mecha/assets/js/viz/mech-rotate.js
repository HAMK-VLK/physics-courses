/* Mech widget: rotation.
 *   'rotation'  mode 'spin' (default): a body on a fixed axle. A torque M acts for the time t_1 (a rope pulls the rim);
 *               a bearing-friction torque M_μ acts all the time, so the wheel spins up (α_1 = (M − M_μ)/J), then coasts
 *               to a stop (α_2 = −M_μ/J). Run plays it (long runs time-compressed); the ω,t graph grows live: its slope
 *               is α, the shaded area the angle φ. Body: disc, ring, rod (about its centre), sphere, or a given J.
 *               mode 'roll': a race down equal ramps: a sliding block (no friction), a solid sphere, a cylinder and a ring.
 *               v = √(2 g h/(1 + k)) with J = k m r²: mass and radius do not matter, the shape does.
 * Physics in TDC.mechRotate (tested by tools/test-mech.mjs). Config reference: .claude/skills/mech-widgets/SKILL.md. */
(function (TDC) {
  'use strict';
  var U = TDC.util, el = U.el, TV = TDC.mechViz, G = 9.81, PLAY = 6;   // a rolling race is shown in about PLAY seconds
  var MR = TDC.mechRotate = {};
  MR.K = { disc: 0.5, ring: 1, rod: 1 / 3, sphere: 0.4, block: 0 };   // J = k m r² (rod: r = half the length, about the centre)

  /** Spin-up and coast: J, M (for t1), friction torque Mf (always). Returns the phases and the totals. */
  MR.spin = function (J, M, Mf, t1) {
    var a1 = M > Mf ? (M - Mf) / J : 0, w1 = a1 * t1, a2 = Mf > 0 ? -Mf / J : 0;
    var t2 = a2 ? w1 / -a2 : Infinity, phi1 = 0.5 * a1 * t1 * t1, phi2 = isFinite(t2) ? 0.5 * w1 * t2 : Infinity;
    return { a1: a1, w1: w1, a2: a2, t1: t1, t2: t2, T: t1 + t2, phi1: phi1, phi: phi1 + phi2, N: (phi1 + phi2) / (2 * Math.PI), E1: 0.5 * J * w1 * w1 };
  };
  /** ω and φ at time t of a spin run. */
  MR.at = function (R, t) {
    if (t <= R.t1) return { w: R.a1 * t, phi: 0.5 * R.a1 * t * t };
    var u = Math.min(t - R.t1, isFinite(R.t2) ? R.t2 : t - R.t1);
    return { w: R.w1 + R.a2 * u, phi: R.phi1 + R.w1 * u + 0.5 * R.a2 * u * u };
  };
  /** Rolling without slipping down a slope of height h and angle al (degrees). */
  MR.roll = function (k, h, al) {
    var s = h / Math.sin(al * Math.PI / 180), a = G * Math.sin(al * Math.PI / 180) / (1 + k);
    return { a: a, s: s, T: Math.sqrt(2 * s / a), v: Math.sqrt(2 * G * h / (1 + k)), rot: k / (1 + k) };   // rot: share of E_k in rotation
  };

  TDC.widgets.register('rotation', function (host, cfg, ctx) {
    var roll = cfg.mode === 'roll', body = cfg.body || 'disc', defs;
    if (roll) defs = [{ id: 'h', tex: 'h', min: 0.2, max: 5, step: 0.1, value: 1, unit: 'm' }, { id: 'al', tex: 'α', min: 5, max: 60, step: 1, value: 20, unit: '°' }];
    else {
      defs = body === 'J' ? [{ id: 'J', tex: 'J', min: 0.01, max: 10, step: 0.01, value: 4.5, unit: 'kg·m²' }]
        : [{ id: 'm', tex: 'm', min: 0.5, max: 50, step: 0.5, value: 10, unit: 'kg' }, { id: 'r', tex: 'r', min: 0.05, max: 1, step: 0.01, value: 0.3, unit: 'm' }];
      defs.push({ id: 'M', tex: 'M', min: 0, max: 20, step: 0.1, value: 10, unit: 'N·m' }, { id: 'Mf', tex: 'M_μ', min: 0, max: 5, step: 0.01, value: 0.9, unit: 'N·m' },
        { id: 't1', tex: 't_1', min: 0.5, max: 20, step: 0.5, value: 5, unit: 's' });
    }
    var F = TV.frame(host, cfg, ctx, defs, function () { S.t = 0; S.run = false; refresh(); });
    var S = { t: 0, run: false }, motion = !U.reducedMotion();
    function J(p) { return body === 'J' ? p.J : MR.K[body] * p.m * p.r * p.r; }
    function run() {
      var p = F.p();
      if (roll) { var o = {}; ['block', 'sphere', 'disc', 'ring'].forEach(function (b) { o[b] = MR.roll(MR.K[b], p.h, p.al); }); o.T = o.ring.T; return o; }
      return MR.spin(J(p), p.M, p.Mf, p.t1);
    }
    function Tend(R) { return roll ? R.T : isFinite(R.T) ? R.T : R.t1 * 3; }

    function btn(key, fn) { var b = el('button', { type: 'button', class: TV.btnClass(TV.keyKind(key)) }); b.textContent = ctx.t(key); b.dataset.key = key; b.addEventListener('click', function () { if (!F.locked) fn(); }); F.controls.appendChild(b); return b; }
    var bGo = btn('mv.run', function () { S.t = motion ? 0 : Tend(run()); S.run = motion; refresh(); });
    var bReset = btn('mv.reset', function () { S.t = 0; S.run = false; refresh(); });
    var sel = null;
    if (!roll && cfg.choose !== false && body !== 'J') {           // body shape: changes J = k m r²
      sel = el('select', { class: 'input mech-planet', 'aria-label': ctx.t('mr.body') });
      ['disc', 'ring', 'rod', 'sphere'].forEach(function (b) { sel.appendChild(el('option', { value: b }, ctx.t('mr.' + b))); });
      sel.value = body; sel.addEventListener('change', function () { body = sel.value; S.t = 0; S.run = false; refresh(); });
      F.controls.appendChild(sel);
    }

    var cv = TDC.viz.canvas(F.stage, { animate: true, draw: draw, aspect: function (w) { return roll ? (w < 620 ? 1.45 : 0.6) : (w < 620 ? 1.45 : 0.5); } });
    var c = cv.canvas;
    function refresh() { reads(); cv.redraw(); }

    function draw(g, w, h, now, dt) {
      var R = run(), T = Tend(R), sp = roll ? [Math.max(1, T / PLAY), 0] : [Math.max(1, R.t1 / 2.5), Math.max(1, (T - R.t1) / 3.5)];
      var speed = roll || S.t < R.t1 ? sp[0] : sp[1];   // spin-up plays in ~2.5 s and coasting in ~3.5 s, so a long coast does not hide the spin-up
      if (S.run && dt) { S.t = Math.min(T, S.t + dt * speed); S.rt = (S.rt || 0) + dt; if (S.t >= T) S.run = false; if (S.rt > 0.15 || !S.run) { S.rt = 0; reads(); } }
      g.clearRect(0, 0, w, h); g.lineJoin = 'round'; g.lineCap = 'round';
      if (roll) drawRoll(g, w, h, R); else drawSpin(g, w, h, R, T, Math.max(sp[0], sp[1]));
    }

    // ---- spin: body face-on at the left, ω,t graph at the right (below on phones)
    function drawSpin(g, w, h, R, T, speed) {
      var p = F.p(), fg = ctx.color('--fg'), wire = ctx.color('--c-wire'), mu = ctx.color('--muted'), bg = ctx.color('--surface');
      var narrow = w < 620, st = MR.at(R, S.t), started = S.run || S.t > 0, on = started && S.t < R.t1 && R.a1 > 0;
      var Rr = narrow ? Math.min(h * 0.15, w * 0.22) : Math.min(h * 0.34, w * 0.16), cx = narrow ? w / 2 : Math.max(w * 0.2, Rr + 64), cy = narrow ? Rr + 32 : h * 0.5;   // room for the M_μ label at the left
      // the picture turns at most about 2 turns per second of screen time; say so when it is slowed down
      var wmax = Math.max(R.w1, 1e-9), f = Math.min(1, 4 * Math.PI / (wmax * speed)), ang = st.phi * f;
      g.save(); g.translate(cx, cy); g.rotate(-ang);                        // counter-clockwise = positive
      var bodyCol = TV.alpha(ctx.color('--c-1'), 0.35);
      g.fillStyle = bodyCol; g.strokeStyle = wire; g.lineWidth = 2.5;
      if (body === 'rod') { TV.rr(g, -Rr, -7, 2 * Rr, 14, 5); g.fill(); g.stroke(); }
      else if (body === 'ring') { g.lineWidth = 9; g.strokeStyle = TV.alpha(ctx.color('--c-1'), 0.7); g.beginPath(); g.arc(0, 0, Rr - 5, 0, 2 * Math.PI); g.stroke(); g.lineWidth = 1.5; g.strokeStyle = wire; [0, 1, 2].forEach(function (k) { g.beginPath(); g.moveTo(0, 0); g.lineTo((Rr - 9) * Math.cos(k * 2.094), (Rr - 9) * Math.sin(k * 2.094)); g.stroke(); }); }
      else {
        g.beginPath(); g.arc(0, 0, Rr, 0, 2 * Math.PI); g.fill(); g.stroke();
        if (body === 'sphere') { g.fillStyle = TV.alpha('#ffffff', 0.25); g.beginPath(); g.arc(-Rr * 0.35, -Rr * 0.35, Rr * 0.35, 0, 2 * Math.PI); g.fill(); }
        g.lineWidth = 1.5; [0, 1, 2].forEach(function (k) { g.beginPath(); g.moveTo(0, 0); g.lineTo(Rr * Math.cos(k * 2.094), Rr * Math.sin(k * 2.094)); g.stroke(); });
      }
      g.fillStyle = ctx.color('--f-accel'); g.beginPath(); g.arc(body === 'ring' ? Rr - 5 : Rr * (body === 'rod' ? 0.9 : 0.8), 0, 5, 0, 2 * Math.PI); g.fill();   // a marked point
      g.restore();
      g.fillStyle = wire; g.beginPath(); g.arc(cx, cy, 5, 0, 2 * Math.PI); g.fill();
      // torque arrows: M (while it acts, counter-clockwise) and the friction torque M_μ (against the turning)
      function arcArrow(r0, a0, a1, col, sym, sub) {
        g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, r0, -a0, -a1, a1 > a0); g.stroke();
        var e = -a1, d = a1 > a0 ? -1 : 1, tx = cx + r0 * Math.cos(e), ty = cy + r0 * Math.sin(e);
        TV.arrow(g, tx + d * 24 * Math.sin(e), ty - d * 24 * Math.cos(e), tx, ty, col, 3);   // a 24 px tangent stub, long enough for a full head
        TV.lab(g, sym + (sub ? '_' + sub : ''), '', cx + (r0 + 16) * Math.cos(-(a0 + a1) / 2), cy + (r0 + 16) * Math.sin(-(a0 + a1) / 2), col, 'center', 14, bg);
      }
      var tq = 1.4 / Math.max(p.M, p.Mf, 1e-9);   // arc span in rad per N·m: one scale, so M is longer than M_μ exactly when the wheel speeds up
      if (on && p.M > 0) arcArrow(Rr + 14, 0.3, 0.3 + p.M * tq, ctx.color('--f-applied'), 'M', '');
      if (p.Mf > 0 && st.w > 1e-6) arcArrow(Rr + 14, 3.9, 3.9 - p.Mf * tq, ctx.color('--f-friction'), 'M', 'μ');
      TV.font(g, 12, 700); TV.text(g, ctx.t(!started ? 'mr.press' : R.a1 === 0 ? 'mr.noTurn' : st.w <= 1e-6 && S.t > 0 ? 'mr.stopped' : on ? 'mr.on' : 'mr.off'), 10, 14, mu, 'left');
      if (f < 0.999) { TV.font(g, 10, 600); TV.text(g, ctx.t('mr.slow').replace('{n}', U.fmtNum(1 / f, 2)), cx, cy + Rr + (narrow ? 22 : 34), mu, 'center'); }
      // ω,t graph: grows during the run; dashed: the whole run for the current sliders
      var gx0 = narrow ? 40 : w * 0.46, gx1 = w - 16, gy0 = narrow ? cy + Rr + 46 : 34, gy1 = h - 28, wtop = (R.w1 > 1e-6 ? wmax : 1) * 1.15;   // M ≤ M_μ: the wheel never turns, keep a readable axis
      var X = function (t) { return gx0 + t / T * (gx1 - 34 - gx0); }, Y = function (v) { return gy1 - v / wtop * (gy1 - gy0); };
      g.strokeStyle = wire; g.lineWidth = 1.5; g.beginPath(); g.moveTo(gx0, gy0 - 6); g.lineTo(gx0, gy1); g.lineTo(gx1, gy1); g.stroke();
      TV.lab(g, 'ω', ' / (rad/s)', gx0 + 6, gy0 - 2, fg, 'left', 13); TV.lab(g, 't', ' / s', gx1, gy1 - 12, fg, 'right', 13);
      TDC.viz.niceTicks(0, T, 5).forEach(function (t) { if (t <= T + 1e-9) TV.lab(g, '', U.fmtNum(t, 3), X(t), gy1 + 13, mu, 'center', 11); });
      TDC.viz.niceTicks(0, wtop, 4).forEach(function (v) { if (v > 0 && v <= wtop) TV.lab(g, '', U.fmtNum(v, 3), gx0 - 5, Y(v), mu, 'right', 11); });
      var pts = [0, R.t1, T].map(function (t) { return [t, MR.at(R, t).w]; });
      g.setLineDash([5, 4]); g.strokeStyle = TV.alpha(ctx.color('--c-2'), 0.6); g.lineWidth = 1.5; g.beginPath();
      pts.forEach(function (q, i) { if (i) g.lineTo(X(q[0]), Y(q[1])); else g.moveTo(X(q[0]), Y(q[1])); }); g.stroke(); g.setLineDash([]);
      var now = [[0, 0]]; if (S.t > R.t1) now.push([R.t1, R.w1]); now.push([S.t, st.w]);
      if (S.t > 0) {
        g.fillStyle = TV.alpha(ctx.color('--c-2'), 0.18); g.beginPath(); g.moveTo(X(0), Y(0)); now.forEach(function (q) { g.lineTo(X(q[0]), Y(q[1])); }); g.lineTo(X(S.t), Y(0)); g.closePath(); g.fill();
        g.strokeStyle = ctx.color('--c-2'); g.lineWidth = 3; g.beginPath(); now.forEach(function (q, i) { if (i) g.lineTo(X(q[0]), Y(q[1])); else g.moveTo(X(q[0]), Y(q[1])); }); g.stroke();
        g.fillStyle = ctx.color('--c-2'); g.beginPath(); g.arc(X(S.t), Y(st.w), 4.5, 0, 2 * Math.PI); g.fill();
        if (S.t > T * 0.25) TV.lab(g, 'φ', ' = ' + ctx.t('mr.area'), X(S.t * 0.55), Y(MR.at(R, S.t * 0.55).w * 0.4 + 0.0001), ctx.color('--c-2'), 'center', 12, bg);
      }
    }

    // ---- roll: one ramp at the true angle α; the four tracks are drawn side by side (offset downwards)
    function drawRoll(g, w, h, R) {
      var p = F.p(), fg = ctx.color('--fg'), wire = ctx.color('--c-wire'), mu = ctx.color('--muted'), bg = ctx.color('--surface');
      var lanes = ['block', 'sphere', 'disc', 'ring'], col = { block: wire, sphere: ctx.color('--c-3'), disc: ctx.color('--c-1'), ring: ctx.color('--c-4') };
      var al = p.al * Math.PI / 180, narrow = w < 620, gap = narrow ? 26 : 30, r = 9;
      // caption: on two lines when it does not fit; on phones the results sit in the readouts, not beside the tracks
      TV.font(g, 11, 600); var cap = ctx.t('mr.same'), two = g.measureText(cap).width > w - 16 && cap.indexOf('; ') > 0;
      if (two) { TV.text(g, cap.split('; ')[0] + ';', 8, 12, mu, 'left'); TV.text(g, cap.split('; ')[1], 8, 26, mu, 'left'); } else TV.text(g, cap, 8, 12, mu, 'left');
      var x0 = 44, x1 = w - (narrow ? 24 : 150), top = two ? 48 : 34, room = h - top - 3 * gap - 16 - (narrow ? 76 : 0);   // narrow: the legend sits below the tracks
      var drop = Math.min(room, (x1 - x0) * Math.tan(al)), run = drop / Math.tan(al), xa = x1 - run, xb = x1;
      var nx = Math.sin(al), ny = -Math.cos(al);                                                     // outward normal of the slope
      var order = lanes.slice().sort(function (a, b) { return R[a].T - R[b].T; });
      lanes.forEach(function (b, i) {
        var ya = top + i * gap, yb = ya + drop, Q = R[b];
        g.fillStyle = ctx.color('--m-ground'); g.beginPath(); g.moveTo(xa, ya); g.lineTo(xb, yb); g.lineTo(w - 8, yb); g.lineTo(w - 8, yb + 5); g.lineTo(xb, yb + 5); g.lineTo(xa, ya + 5); g.closePath(); g.fill();
        g.strokeStyle = wire; g.lineWidth = 2; g.beginPath(); g.moveTo(xa, ya); g.lineTo(xb, yb); g.lineTo(w - 8, yb); g.stroke();
        var t = Math.min(S.t, Q.T), u = 0.5 * Q.a * t * t / Q.s, done = S.t >= Q.T;                 // fraction of the slope covered
        var px = xa + u * (xb - xa), py = ya + u * (yb - ya);
        if (b === 'block') {
          g.save(); g.translate(px + nx * 8, py + ny * 8); g.rotate(al); g.fillStyle = ctx.color('--m-body'); g.strokeStyle = wire; g.lineWidth = 2; TV.rr(g, -10, -8, 20, 16, 3); g.fill(); g.stroke(); g.restore();
        } else {
          var bx = px + nx * r, by = py + ny * r, rotA = u * Math.hypot(xb - xa, yb - ya) / r;       // the mark turns as it rolls without slipping
          g.fillStyle = TV.alpha(col[b], b === 'ring' ? 0 : 0.45); g.strokeStyle = b === 'ring' ? col[b] : wire; g.lineWidth = b === 'ring' ? 4 : 2;
          g.beginPath(); g.arc(bx, by, b === 'ring' ? r - 1.5 : r, 0, 2 * Math.PI); g.fill(); g.stroke();
          g.strokeStyle = wire; g.lineWidth = 1.5; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + r * Math.cos(rotA), by + r * Math.sin(rotA)); g.stroke();
        }
        if (done && !narrow) TV.lab(g, 'v', ' = ' + TV.fmt(Q.v, 'm/s', 3) + ', ' + TV.fmt(Q.T, 's', 3), w - 8, yb - 12, col[b] === wire ? fg : col[b], 'right', narrow ? 11 : 12, bg);
        // legend at the bottom left: place in the race once finished, name, k = J/(m r²)
        var ly = h - 12 - (3 - i) * 17, rank = done ? (order.indexOf(b) + 1) + '. ' : '';
        g.fillStyle = TV.alpha(col[b], b === 'block' ? 0.25 : 0.6); g.beginPath(); g.arc(14, ly, 5, 0, 2 * Math.PI); g.fill();
        TV.font(g, 12, 700); TV.text(g, rank + ctx.t('mr.' + (b === 'disc' ? 'cyl' : b)), 24, ly, fg, 'left');
        TV.lab(g, 'k', ' = ' + U.fmtNum(MR.K[b], 2), 24 + g.measureText(rank + ctx.t('mr.' + (b === 'disc' ? 'cyl' : b))).width + 10, ly, mu, 'left', 12);
      });
      // h (height of each track) and the angle α at the foot of the lowest track
      var hx = xa - 14, yl = top + 3 * gap;
      g.strokeStyle = mu; g.lineWidth = 1.2; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(xa - 4, top); g.lineTo(hx - 4, top); g.stroke(); g.setLineDash([]);
      TV.arrow(g, hx, top + drop / 2, hx, top, mu, 1.5); TV.arrow(g, hx, top + drop / 2, hx, top + drop, mu, 1.5);
      TV.lab(g, 'h', '', hx - 10, top + drop / 2, fg, 'right', 13);
      g.setLineDash([4, 3]); g.strokeStyle = mu; g.lineWidth = 1.2; g.beginPath(); g.moveTo(xb, yl + drop); g.lineTo(xb - 90, yl + drop); g.stroke(); g.setLineDash([]);
      g.strokeStyle = fg; g.lineWidth = 1.5; g.beginPath(); g.arc(xb, yl + drop, 60, Math.PI, Math.PI + al); g.stroke();   // r = 60: clear of a body waiting at the foot
      TV.lab(g, 'α', '', xb - 72 * Math.cos(al / 2), yl + drop - 72 * Math.sin(al / 2) + 4, fg, 'center', 13);
    }

    function aria() { c.setAttribute('aria-label', ctx.t(roll ? 'mr.ariaRoll' : 'mr.aria')); }
    function reads() {
      var p = F.p(), R = run(), list, st;
      if (roll) {
        st = { R: R };
        list = ['sphere', 'disc', 'ring', 'block'].map(function (b) { return { label: TV.L('mr.' + (b === 'disc' ? 'cyl' : b)), value: TV.fmt(R[b].v, 'm/s', 3) + ', ' + TV.fmt(R[b].T, 's', 3) }; });
        F.answer = function () { return cfg.answer ? cfg.answer(F.p(), st) : { v: R.sphere.v }; };
      } else {
        var Jv = J(p), x = MR.at(R, S.t);
        st = { R: R, J: Jv, w: x.w, phi: x.phi };
        list = [{ tex: 'J', value: Jv, unit: 'kg·m²', digits: 3 }, { tex: 'α_1 = (M − M_μ)/J', value: R.a1, unit: 'rad/s²', digits: 3 },
          { tex: 'ω', value: x.w, unit: 'rad/s', digits: 3 }, { tex: 'n', value: x.w / (2 * Math.PI) * 60, unit: '1/min', digits: 3 },
          { tex: 'φ', value: x.phi, unit: 'rad', digits: 3 }, { label: TV.L('mr.turns'), value: U.fmtNum(x.phi / (2 * Math.PI), 3) },
          { tex: 'E_R = ½ J ω^2', value: 0.5 * Jv * x.w * x.w, unit: 'J', digits: 3 }];
        F.answer = function () { return cfg.answer ? cfg.answer(F.p(), st) : { v: R.w1 }; };
      }
      TV.reads(F, cfg, p, st, list);
    }
    ctx.onTheme(function () { cv.redraw(); });
    ctx.onLang(function () { [bGo, bReset].forEach(function (b) { b.textContent = ctx.t(b.dataset.key); }); if (sel) [].forEach.call(sel.options, function (o) { o.textContent = ctx.t('mr.' + o.value); }); aria(); refresh(); });
    aria(); refresh();
    return Object.assign({ destroy: cv.destroy }, F.api);
  });
})(window.TDC);

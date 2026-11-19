/* Mech widget: collisions.
 *   'collision'  mode '1d' (default): two carts on a track (m1, m2, signed v1, v2, coefficient of restitution e).
 *                Run plays approach, impact and separation (e = 0: they stick together); bars compare the momenta
 *                (before = after, always) and the kinetic energy (equal only for e = 1, the rest is lost).
 *                mode '2d': billiards seen from above. Ball 1 (v1 along x) hits ball 2 at rest with an aim offset b
 *                (0 = head-on); after the impact the velocities are drawn with their x and y components (slide p09).
 * Physics in TDC.mechCollide (tested by tools/test-mech.mjs). Config reference: .claude/skills/mech-widgets/SKILL.md.
 * shortcut: 2-D balls are smooth (e acts along the line of centres, no spin), so e = 0 there does not make them stick. */
(function (TDC) {
  'use strict';
  var U = TDC.util, el = U.el, TV = TDC.mechViz;
  var MC = TDC.mechCollide = {};
  var TC = 1.6, TA = 1.8;      // display seconds before and after the impact
  function clean(x, scale) { return Math.abs(x) < 1e-9 * (Math.abs(scale) || 1) ? 0 : x; }   // rounding noise -> 0

  /** Direct central collision, velocities signed along one axis, e = (u2 − u1)/(v1 − v2). */
  MC.oneD = function (m1, m2, v1, v2, e) {
    var P = m1 * v1 + m2 * v2, M = m1 + m2, hit = v1 > v2;
    var u1 = hit ? (P - m2 * e * (v1 - v2)) / M : v1, u2 = hit ? (P + m1 * e * (v1 - v2)) / M : v2;
    var K0 = 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2, K1 = 0.5 * m1 * u1 * u1 + 0.5 * m2 * u2 * u2;
    return { hit: hit, u1: u1, u2: u2, P: P, K0: K0, K1: K1, dE: clean(K0 - K1, K0) };
  };
  /** Ball 1 (v1 along +x) hits ball 2 at rest; b = aim offset as a fraction of the contact distance (ball 2 lies
   *  below the path). e acts along the line of centres n; the tangential parts are unchanged. */
  MC.twoD = function (m1, m2, v1, b, e) {
    b = Math.max(0, Math.min(0.99, b));
    var n = [Math.sqrt(1 - b * b), -b], vn = v1 * n[0], r = MC.oneD(m1, m2, vn, 0, e);
    var u1 = [v1 - vn * n[0] + r.u1 * n[0], -vn * n[1] + r.u1 * n[1]], u2 = [r.u2 * n[0], r.u2 * n[1]];
    var K0 = 0.5 * m1 * v1 * v1, K1 = 0.5 * m1 * (u1[0] * u1[0] + u1[1] * u1[1]) + 0.5 * m2 * (u2[0] * u2[0] + u2[1] * u2[1]);
    return { n: n, u1: u1, u2: u2, px: m1 * u1[0] + m2 * u2[0], py: clean(m1 * u1[1] + m2 * u2[1], m1 * v1), P: m1 * v1, K0: K0, K1: K1, dE: clean(K0 - K1, K0),
      th1: Math.atan2(u1[1], u1[0]) * 180 / Math.PI, th2: Math.atan2(u2[1], u2[0]) * 180 / Math.PI };
  };

  function symFont(g, px) { g.font = 'italic 600 ' + px + 'px ' + TDC.theme.color('--font-math'); }
  /** Symbol with an index (v₁, u₂ₓ): the symbol italic, a numeric index upright (ISO 80000), centred on x. */
  function lab(g, sym, sub, x, y, col, bg) {
    lab2(g, sym, sub, '', x, y, col, bg, 'center');
  }
  /** "v₁ = 3 m/s": symbol italic, numeric index and the value upright. align 'center' | 'left' | 'right'. */
  function lab2(g, sym, sub, val, x, y, col, bg, align) {
    symFont(g, 15); var w1 = g.measureText(sym).width + 1;
    var subs = sub.split(''), wsub = 0;
    subs.forEach(function (ch) { if (/\d/.test(ch)) TV.font(g, 11, 600); else symFont(g, 11); wsub += g.measureText(ch).width; });
    TV.font(g, 13, 600); var wv = val ? g.measureText(' = ' + val).width : 0;
    var w = w1 + wsub + wv, x0 = align === 'left' ? x : align === 'right' ? x - w : x - w / 2;
    if (bg) { g.globalAlpha = 0.85; g.fillStyle = bg; g.fillRect(x0 - 3, y - 11, w + 6, 22); g.globalAlpha = 1; }
    g.fillStyle = col; g.textAlign = 'left'; g.textBaseline = 'middle';
    symFont(g, 15); g.fillText(sym, x0, y); x0 += w1;
    subs.forEach(function (ch) { if (/\d/.test(ch)) TV.font(g, 11, 600); else symFont(g, 11); g.fillText(ch, x0, y + 5); x0 += g.measureText(ch).width; });
    if (val) { TV.font(g, 13, 600); g.fillText(' = ' + val, x0, y); }
  }

  TDC.widgets.register('collision', function (host, cfg, ctx) {
    var two = cfg.mode === '2d';
    var defs = [{ id: 'm1', tex: 'm_1', min: 0.1, max: 10, step: 0.1, value: 2, unit: 'kg' },
      { id: 'm2', tex: 'm_2', min: 0.1, max: 10, step: 0.1, value: 1, unit: 'kg' },
      { id: 'v1', tex: 'v_1', min: two ? 0.5 : -10, max: 10, step: 0.1, value: 3, unit: 'm/s' }];
    if (two) defs.push({ id: 'b', tex: 'b', min: 0, max: 0.9, step: 0.01, value: 0.5 });   // fraction of the contact distance
    else defs.push({ id: 'v2', tex: 'v_2', min: -10, max: 10, step: 0.1, value: 0, unit: 'm/s' });
    defs.push({ id: 'e', tex: 'e', min: 0, max: 1, step: 0.01, value: 1 });
    var F = TV.frame(host, cfg, ctx, defs, function () { S.t = 0; S.run = false; refresh(); });
    var S = { t: 0, run: false }, motion = !U.reducedMotion();
    function phys() { var p = F.p(); return two ? MC.twoD(p.m1, p.m2, p.v1, p.b, p.e) : MC.oneD(p.m1, p.m2, p.v1, p.v2, p.e); }

    function btn(key, fn) { var b = el('button', { type: 'button', class: TV.btnClass(TV.keyKind(key)) }); b.textContent = ctx.t(key); b.dataset.key = key; b.addEventListener('click', function () { if (!F.locked) fn(); }); F.controls.appendChild(b); return b; }
    var bGo = btn('mv.run', function () { S.t = motion ? 0 : TC + TA; S.run = motion; refresh(); });
    var bReset = btn('mv.reset', function () { S.t = 0; S.run = false; refresh(); });

    var cv = TDC.viz.canvas(F.stage, { animate: true, draw: draw, aspect: function (w) { return two ? (w < 620 ? 1.5 : 0.78) : (w < 620 ? 1.75 : 0.56); } });
    var c = cv.canvas;
    function refresh() { reads(); cv.redraw(); }
    var lastPhase = null;

    function draw(g, w, h, now, dt) {
      if (S.run && dt) { S.t = Math.min(TC + TA, S.t + dt); if (S.t >= TC + TA) S.run = false; }
      var after = S.t >= TC; if (after !== lastPhase) { lastPhase = after; reads(); }
      g.clearRect(0, 0, w, h); g.lineJoin = 'round'; g.lineCap = 'round';
      var narrow = w < 620, sh = Math.round(h * (two ? (narrow ? 0.52 : 0.6) : (narrow ? 0.42 : 0.47)));
      if (two) scene2(g, w, sh, after); else scene1(g, w, sh, after);
      bars(g, w, h, sh + 8, narrow);
    }

    // ---- 1-D: carts on a track; contact point in the middle at t = TC
    function scene1(g, w, sh, after) {
      var p = F.p(), r = phys(), fg = ctx.color('--fg'), wire = ctx.color('--c-wire'), bg = ctx.color('--surface'), mu = ctx.color('--muted');
      var cw = function (m) { return Math.min(w * 0.16, 52 + 56 * m / (p.m1 + p.m2)); }, w1 = cw(p.m1), w2 = cw(p.m2), gy = sh - 20, cx = w / 2;
      var reach = Math.max(Math.abs(p.v1), Math.abs(p.v2)) * TC, reachA = Math.max(Math.abs(r.u1), Math.abs(r.u2)) * TA;
      var k = (w / 2 - Math.max(w1, w2) - 14) / Math.max(0.01, reach, reachA);   // px per metre: the whole run fits
      var tt = S.t - TC, x1, x2;
      if (r.hit) { x1 = cx - w1 / 2 + k * (after ? r.u1 : p.v1) * tt; x2 = cx + w2 / 2 + k * (after ? r.u2 : p.v2) * tt; }
      else { x1 = cx - w / 4 + k * p.v1 * tt * 0.5; x2 = cx + w / 4 + k * p.v2 * tt * 0.5; }   // no impact: just move
      g.strokeStyle = wire; g.lineWidth = 2; g.beginPath(); g.moveTo(8, gy); g.lineTo(w - 8, gy); g.stroke();
      g.fillStyle = ctx.color('--m-ground'); g.fillRect(8, gy + 1, w - 16, 8);
      [[x1, w1, '1', after ? r.u1 : p.v1], [x2, w2, '2', after ? r.u2 : p.v2]].forEach(function (q, i) {
        var x = q[0], bw = q[1], bh = 30 + bw * 0.1, top = gy - 10 - bh;
        g.fillStyle = TV.alpha(ctx.color(i ? '--c-3' : '--c-1'), 0.35); g.strokeStyle = wire; g.lineWidth = 2;
        TV.rr(g, x - bw / 2, top, bw, bh, 4); g.fill(); g.stroke();
        g.fillStyle = wire; [-0.28, 0.28].forEach(function (f) { g.beginPath(); g.arc(x + f * bw, gy - 6, 6, 0, 2 * Math.PI); g.fill(); });
        lab(g, 'm', q[2], x, top + bh / 2, fg);
        var vmax = Math.max(Math.abs(p.v1), Math.abs(p.v2), Math.abs(r.u1), Math.abs(r.u2)) || 1, L = q[3] / vmax * 70, acc = ctx.color('--f-accel');
        var ay = top - 14 - (i ? 0 : 30);                                       // cart 1's label sits higher: no overlap when they touch
        if (Math.abs(L) > 2) TV.arrow(g, x, ay, x + L, ay, acc, 3);
        lab2(g, after ? 'u' : 'v', q[2], TV.fmt(q[3], 'm/s', 2), x, ay - 15, acc, bg, 'center');
      });
      phaseTag(g, after, r.hit);
    }
    function phaseTag(g, after, hit) {
      TV.font(g, 12, 700);
      TV.text(g, ctx.t(!hit ? 'mc.noHit' : after ? 'mc.after' : 'mc.before'), 12, 14, ctx.color(hit ? '--muted' : '--warn'), 'left');
    }

    // ---- 2-D: billiards from above; ball 2 below the path of ball 1, contact at t = TC
    function scene2(g, w, sh, after) {
      var p = F.p(), r = phys(), fg = ctx.color('--fg'), wire = ctx.color('--c-wire'), bg = ctx.color('--surface'), acc = ctx.color('--f-accel');
      var r1 = 15 * Math.cbrt(p.m1 / 2) + 8, r2 = 15 * Math.cbrt(p.m2 / 2) + 8, D = r1 + r2;
      var C2 = [w * 0.42, sh * 0.42 + p.b * D], C1 = [C2[0] - D * r.n[0], C2[1] + D * r.n[1]];   // canvas y down; path of ball 1 at C1[1]
      // px per metre, the same in x and y so the angles are true: the approach and both exits stay on the table
      var ks = [(C1[0] - r1 - 10) / (p.v1 * TC)];
      [[r.u1, C1, r1], [r.u2, C2, r2]].forEach(function (q) {
        var vx = q[0][0] * TA, vy = -q[0][1] * TA;
        if (vx > 1e-9) ks.push((w - 10 - q[2] - q[1][0]) / vx); else if (vx < -1e-9) ks.push((q[1][0] - q[2] - 10) / -vx);
        if (vy > 1e-9) ks.push((sh - 6 - q[2] - q[1][1]) / vy); else if (vy < -1e-9) ks.push((q[1][1] - q[2] - 24) / -vy);
      });
      var k = Math.max(1, Math.min.apply(null, ks)), tt = S.t - TC;
      var P1 = after ? [C1[0] + k * r.u1[0] * tt, C1[1] - k * r.u1[1] * tt] : [C1[0] + k * p.v1 * tt, C1[1]];
      var P2 = after ? [C2[0] + k * r.u2[0] * tt, C2[1] - k * r.u2[1] * tt] : C2;
      g.fillStyle = TV.alpha(ctx.color('--m-ground'), 0.5); g.fillRect(6, 24, w - 12, sh - 28);
      g.save(); g.setLineDash([4, 4]); g.strokeStyle = TV.alpha(ctx.color('--muted'), 0.7); g.lineWidth = 1;
      g.beginPath(); g.moveTo(10, C1[1]); g.lineTo(w - 10, C1[1]); g.stroke(); g.restore();
      var ax = w - 58, ay = 66; TV.arrow(g, ax, ay, ax + 40, ay, fg, 1.5); TV.arrow(g, ax, ay, ax, ay - 34, fg, 1.5);   // axes (slide p09)
      symFont(g, 13); TV.text(g, 'x', ax + 46, ay, fg, 'left'); TV.text(g, 'y', ax, ay - 42, fg, 'center');
      function ball(P, rr, i, col, alpha) {
        g.globalAlpha = alpha; g.fillStyle = TV.alpha(ctx.color(col), 0.45); g.strokeStyle = wire; g.lineWidth = 2;
        g.beginPath(); g.arc(P[0], P[1], rr, 0, 2 * Math.PI); g.fill(); g.stroke(); g.globalAlpha = 1;
        if (alpha === 1) lab(g, 'm', i, P[0], P[1], fg);
      }
      if (after) {
        // the impact moment as ghosts; the exit velocities and their components drawn from there (60 % of each path)
        ball(C1, r1, '1', '--c-1', 0.3); ball(C2, r2, '2', '--c-3', 0.3);
        [[C1, r.u1, '1', -1], [C2, r.u2, '2', 1]].forEach(function (q) {
          var x0 = q[0][0], y0 = q[0][1], vx = q[1][0] * k * TA * 0.6, vy = -q[1][1] * k * TA * 0.6;
          if (Math.hypot(vx, vy) < 4) return;
          g.save(); g.setLineDash([3, 3]); g.strokeStyle = TV.alpha(ctx.color('--muted'), 0.9); g.lineWidth = 1.2;
          g.strokeRect(Math.min(x0, x0 + vx), Math.min(y0, y0 + vy), Math.abs(vx), Math.abs(vy)); g.restore();
          if (Math.abs(vx) > 6) { TV.arrow(g, x0, y0, x0 + vx, y0, ctx.color('--c-1'), 2); lab(g, 'u', q[2] + 'x', x0 + vx / 2, y0 + (vy > 0 ? 13 : -13), ctx.color('--c-1'), bg); }   // label inside its rectangle }
          if (Math.abs(vy) > 6) { TV.arrow(g, x0, y0, x0, y0 + vy, ctx.color('--c-4'), 2); lab(g, 'u', q[2] + 'y', x0 + (vx >= 0 ? -20 : 20), y0 + vy / 2, ctx.color('--c-4'), bg); }
          TV.arrow(g, x0, y0, x0 + vx, y0 + vy, acc, 3);
          lab(g, 'u', q[2], x0 + vx + (vx >= 0 ? 14 : -14), y0 + vy + (vy >= 0 ? 8 : -8), acc, bg);
        });
      }
      ball(P1, r1, '1', '--c-1', 1); ball(P2, r2, '2', '--c-3', 1);
      if (!after) { var L = k * p.v1 * TA * 0.6; /* same px per m/s as the u arrows after the impact */ TV.arrow(g, P1[0] + r1, P1[1], P1[0] + r1 + L, P1[1], acc, 3); lab2(g, 'v', '1', TV.fmt(p.v1, 'm/s', 2), P1[0] + r1 + L / 2, P1[1] - 16, acc, bg, 'center'); }
      phaseTag(g, after, true);
    }

    // ---- bars: momentum (signed, before | after) and kinetic energy (before | after + lost)
    function bars(g, w, h, y0, narrow) {
      var p = F.p(), r = phys(), fg = ctx.color('--fg'), mu = ctx.color('--muted'), wire = ctx.color('--c-wire');
      var P = two ? [['p', '1x', p.m1 * p.v1, p.m1 * r.u1[0]], ['p', '2x', 0, p.m2 * r.u2[0]], ['p', 'x', p.m1 * p.v1, r.px],
                     ['p', '1y', 0, p.m1 * r.u1[1]], ['p', '2y', 0, p.m2 * r.u2[1]], ['p', 'y', 0, r.py]]
                  : [['p', '1', p.m1 * p.v1, p.m1 * r.u1], ['p', '2', p.m2 * p.v2, p.m2 * r.u2], ['p', '', r.P, r.P]];
      var gx0 = 12, gx1 = narrow ? w - 12 : w * 0.64, ex0 = narrow ? 12 : w * 0.68, top = y0 + (narrow ? 36 : 22), bot = h - 26;
      var pH = narrow ? (bot - top) * 0.42 : bot - top, pBot = top + pH, eTop = narrow ? pBot + 56 : top;   // phone: momentum above energy
      var pmax = Math.max.apply(null, P.map(function (q) { return Math.max(Math.abs(q[2]), Math.abs(q[3])); })) || 1, zero = top + pH / 2;
      TV.font(g, 12, 700); TV.text(g, ctx.t('mc.pBars'), gx0, y0 + 8, fg, 'left');
      g.strokeStyle = wire; g.lineWidth = 1; g.beginPath(); g.moveTo(gx0, zero); g.lineTo(gx1, zero); g.stroke();
      var slot = (gx1 - gx0) / P.length, bw = Math.min(22, slot / 2 - 6);
      P.forEach(function (q, i) {
        var xc = gx0 + slot * (i + 0.5), sum = !/\d/.test(q[1]);
        [[q[2], -1], [q[3], 1]].forEach(function (v) {
          var hh = v[0] / pmax * (pH / 2 - 14), x = xc + v[1] * (bw / 2 + 1) - bw / 2;
          g.fillStyle = TV.alpha(ctx.color(sum ? '--c-2' : '--c-1'), v[1] < 0 ? 0.45 : 0.95); g.fillRect(x, hh > 0 ? zero - hh : zero, bw, Math.abs(hh));
        });
        lab(g, sum ? 'Σp' : 'p', q[1], xc, pBot + 10, sum ? ctx.color('--c-2') : fg);
      });
      TV.font(g, 10, 600); TV.text(g, ctx.t('mc.legend'), narrow ? gx0 : gx1, narrow ? y0 + 24 : y0 + 8, mu, narrow ? 'left' : 'right');
      // kinetic energy: before, after, lost (stacked on the after bar, dashed)
      var eBot = bot, eH = eBot - eTop - 16, K = Math.max(r.K0, 1e-9), ew = Math.min(34, ((narrow ? w - 24 : w - 12 - ex0)) / 4);
      TV.font(g, 12, 700); TV.text(g, ctx.t('mc.kBars'), ex0, eTop - 14, fg, 'left');
      var xs = [ex0 + ew * 0.4, ex0 + ew * 1.9];
      g.strokeStyle = wire; g.beginPath(); g.moveTo(ex0, eBot); g.lineTo(xs[1] + ew * 1.4, eBot); g.stroke();
      [[r.K0, 0.45], [r.K1, 0.95]].forEach(function (v, i) {
        var hh = v[0] / K * eH; g.fillStyle = TV.alpha(ctx.color('--c-2'), v[1]); g.fillRect(xs[i], eBot - hh, ew, hh);
        TV.font(g, narrow ? 11 : 12, 600); TV.text(g, TV.fmt(v[0], 'J', 3), xs[i] + ew / 2, (i ? eBot - eH : eBot - hh) - 10, fg, 'center');
        TV.font(g, 10, 600); TV.text(g, ctx.t(i ? 'mc.afterShort' : 'mc.beforeShort'), xs[i] + ew / 2, eBot + 10, mu, 'center');
      });
      if (r.dE > K * 0.005) {
        var lt = eBot - eH, lb = eBot - r.K1 / K * eH;
        g.save(); g.setLineDash([4, 3]); g.strokeStyle = ctx.color('--f-friction'); g.lineWidth = 1.5; g.strokeRect(xs[1], lt, ew, lb - lt); g.restore();
        TV.font(g, 11, 600); TV.text(g, ctx.t('mc.lost'), xs[1] + ew + 4, (lt + lb) / 2, ctx.color('--f-friction'), 'left');
      }
    }

    function aria() { c.setAttribute('aria-label', ctx.t(two ? 'mc.aria2' : 'mc.aria1')); }
    function reads() {
      var p = F.p(), r = phys(), st, list;
      if (two) {
        st = { u1: Math.hypot(r.u1[0], r.u1[1]), u2: Math.hypot(r.u2[0], r.u2[1]), th1: r.th1, th2: r.th2, dE: r.dE, r: r };
        list = [{ tex: 'u_1', value: st.u1, unit: 'm/s', digits: 3 }, { tex: 'θ_1', value: r.th1, unit: '°', digits: 3 },
          { tex: 'u_2', value: st.u2, unit: 'm/s', digits: 3 }, { tex: 'θ_2', value: r.th2, unit: '°', digits: 3 },
          { tex: 'Σp_x', value: r.px, unit: 'kg·m/s', digits: 3 }, { tex: 'Σp_y', value: r.py, unit: 'kg·m/s', digits: 3 },
          { tex: 'ΔE_k', value: r.dE, unit: 'J', digits: 3 }];
      } else {
        st = { u1: r.u1, u2: r.u2, dE: r.dE, hit: r.hit, r: r };
        list = [{ tex: 'u_1', value: r.u1, unit: 'm/s', digits: 3 }, { tex: 'u_2', value: r.u2, unit: 'm/s', digits: 3 },
          { tex: 'Σp = m_1 v_1 + m_2 v_2', value: r.P, unit: 'kg·m/s', digits: 3 },
          { tex: 'E_k', value: r.K0, unit: 'J', digits: 3 }, { tex: 'ΔE_k', value: r.dE, unit: 'J', digits: 3 }];
      }
      F.answer = function () { return cfg.answer ? cfg.answer(F.p(), st) : { v: st.u1 }; };
      TV.reads(F, cfg, p, st, list);
    }
    ctx.onTheme(function () { cv.redraw(); });
    ctx.onLang(function () { [bGo, bReset].forEach(function (b) { b.textContent = ctx.t(b.dataset.key); }); aria(); refresh(); });
    aria(); refresh();
    return Object.assign({ destroy: cv.destroy }, F.api);
  });
})(window.TDC);

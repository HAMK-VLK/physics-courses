/* Topic 2: Kinematics. Source: source/extracted/topic2-kinematics.md (EN theory deck p03-p06, EN exercises A1-A4, 2.1-2.17 and the
 * FI-deck examples p05 (Bolt, two-speed trip, Tampere-Valkeakoski) and p07 (car 0-75 km/h, stone, crash)); errata in
 * source/extracted/PDF-ERRATA.md applied. g = 9.81 m/s² everywhere.
 * NO answers in this file: they live in src/answers/topic2.json. Block ids are stable; never rename. */
(function () {
  'use strict';
  function T(en, fi) { return { en: en, fi: fi }; }
  var G0 = 9.81;

  // ---------------------------------------------------------------- shared helpers of the device widgets (as in topic3.js)
  function dev(def, vals) { return { mount: function (h, c) { return TDC.mechViz.device(def, vals).mount(h, c); } }; }
  function nf(v, d) { return TDC.util.fmtNum(v, d || 3); }
  function fsz(w) { return Math.max(11, Math.min(14, Math.round(w / 48))); }
  function line(g, x1, y1, x2, y2) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function font(g, px, it) {
    g.font = it ? 'italic 600 ' + px + 'px ' + TDC.theme.color('--font-math') : '600 ' + px + 'px ' + getComputedStyle(document.body).fontFamily;
  }
  /** Canvas label (SI typography): letter runs = quantity symbols (with _subscripts) italic; digits, operators and the
   *  tail (" = 12 N", words) upright. align 'left' | 'center' | 'right'; bg = backdrop colour. */
  function lab() { return TDC.mechViz.lab.apply(null, arguments); }   // canvas label in SI typography (viz/mech-common.js)
  /** True when one of the listed parameters changed since the last frame (a new setting cancels a running sequence). */
  function changed(S, p, keys) { var k = keys.map(function (id) { return p[id]; }).join('|'); if (S._k === k) return false; S._k = k; return true; }
  function mod(x, m) { return ((x % m) + m) % m; }
  /** A small stick figure standing on (x, y) (feet), height hh. */
  function person(g, x, y, hh, col) {
    g.strokeStyle = col; g.lineWidth = 2; g.lineCap = 'round';
    line(g, x - hh * 0.16, y, x, y - hh * 0.42); line(g, x + hh * 0.16, y, x, y - hh * 0.42); line(g, x, y - hh * 0.42, x, y - hh * 0.78);
    line(g, x - hh * 0.2, y - hh * 0.6, x, y - hh * 0.72); line(g, x + hh * 0.2, y - hh * 0.6, x, y - hh * 0.72);
    g.beginPath(); g.arc(x, y - hh * 0.9, hh * 0.11, 0, 2 * Math.PI); g.stroke();
  }

  // ---------------------------------------------------------------- SVG figure: number line (p03)
  function sArrow(x1, y1, x2, y2, c) {
    var a = Math.atan2(y2 - y1, x2 - x1), h = 9, s = 'stroke:var(' + c + ');fill:var(' + c + ')';
    var p1 = [x2 - h * Math.cos(a - 0.4), y2 - h * Math.sin(a - 0.4)], p2 = [x2 - h * Math.cos(a + 0.4), y2 - h * Math.sin(a + 0.4)];
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + (x2 - 6 * Math.cos(a)).toFixed(1) + '" y2="' + (y2 - 6 * Math.sin(a)).toFixed(1) + '" style="' + s + ';stroke-width:2.5"/>' +
      '<polygon points="' + x2 + ',' + y2 + ' ' + p1[0].toFixed(1) + ',' + p1[1].toFixed(1) + ' ' + p2[0].toFixed(1) + ',' + p2[1].toFixed(1) + '" style="' + s + '"/>';
  }
  function sText(x, y, t, c, sub, up) {
    return '<text x="' + x + '" y="' + y + '" style="fill:var(' + (c || '--fg') + ');font:' + (up ? '600' : 'italic 600') + ' 15px var(--font-math)">' + t +
      (sub ? '<tspan dy="4" style="font-size:11px">' + sub + '</tspan>' : '') + '</text>';
  }
  var FIG_LINE = (function () {
    var X = function (m) { return 30 + m * 7.8; }, s = '<svg viewBox="0 0 380 120" role="img" style="max-width:460px">' +
      '<line x1="20" y1="70" x2="365" y2="70" style="stroke:var(--c-wire);stroke-width:2"/>';
    [0, 10, 20, 30, 40].forEach(function (m) {
      s += '<line x1="' + X(m) + '" y1="65" x2="' + X(m) + '" y2="75" style="stroke:var(--c-wire);stroke-width:2"/>' + sText(X(m) - 8 * String(m).length / 2 * 0.9, 92, m, '--muted', '', true);
    });
    s += sText(336, 56, 'x', '--fg') + sText(347, 56, '/ m', '--muted', '', true)   /* axis name above the axis end, clear of the 40 tick */ +
      '<circle cx="' + X(10) + '" cy="70" r="5" style="fill:var(--f-applied)"/><circle cx="' + X(30) + '" cy="70" r="5" style="fill:var(--f-weight)"/>' +
      sArrow(X(10), 46, X(30), 46, '--f-accel') + sText(X(10) - 6, 34, 'x', '--f-applied', '1') + sText(X(30) - 6, 34, 'x', '--f-weight', '2') +
      sText(X(20) - 28, 64, 'Δx', '--f-accel') + '</svg>';
    return s;
  })();

  // ---------------------------------------------------------------- device: frame of reference, train and walker (t2-frame-lab)
  var FRAME = {
    animate: true,
    aspect: function (w) { return w < 520 ? 0.95 : 0.52; },
    params: [{ id: 'vt', label: T('Speed of the train relative to the ground', 'Junan nopeus maan suhteen'), min: 20, max: 120, step: 5, value: 80, unit: 'km/h' },
             { id: 'vw', label: T('Walker relative to the train (− = toward the back)', 'Kävelijä junan suhteen (− = taaksepäin)'), min: -10, max: 10, step: 1, value: 5, unit: 'km/h' }],
    buttons: [{ label: T('Run / pause', 'Aja / tauko'), click: function (p, D) { D.S.run = D.motion && !D.S.run; if (!D.motion) D.S.t = (D.S.t || 0) + 0.6; } },
              { label: T('Observer on the ground', 'Havaitsija maassa'), click: function (p, D) { D.S.obs = 'g'; } },
              { label: T('Observer on the train', 'Havaitsija junassa'), click: function (p, D) { D.S.obs = 't'; } }],
    draw: function (g, w, h, p, ctx, TV, D) {
      var S = D.S; if (!S.obs) S.obs = 'g';
      if (S.run) S.t = (S.t || 0) + D.dt;
      var t = S.t || 0, gnd = S.obs === 'g', fg = ctx.color('--fg'), wire = ctx.color('--c-wire'), mu = ctx.color('--muted'), bg = ctx.color('--surface'), fs = fsz(w);
      var cA = ctx.color('--f-accel'), cW = ctx.color('--f-applied');
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      var ry = h * 0.7, tl = Math.min(w * 0.46, 300), th = h * 0.2, trainX = gnd ? mod(t * p.vt * 0.9 + (w + tl) / 2, w + tl) - tl : (w - tl) / 2;   // starts centred, wraps round
      // ground: rails and posts (the posts are what the ground observer sees standing still)
      g.fillStyle = ctx.color('--m-ground'); g.fillRect(0, ry, w, h - ry); g.strokeStyle = wire; g.lineWidth = 2.5; line(g, 0, ry, w, ry);
      var shift = gnd ? 0 : -t * p.vt * 0.9; g.lineWidth = 2;
      for (var k = -1; k < w / 70 + 1; k++) { var px = mod(k * 70 + shift, w + 70) - 35; line(g, px, ry, px, ry - 16); line(g, px - 9, ry - 16, px + 9, ry - 16); }
      // train
      g.fillStyle = ctx.color('--m-body'); g.lineWidth = 2.5; TV.rr(g, trainX, ry - th - 8, tl, th, 6); g.fill(); g.stroke();
      for (k = 0; k < 6; k++) { g.strokeStyle = wire; g.lineWidth = 1.5; g.strokeRect(trainX + tl * (0.06 + k * 0.155), ry - th - 8 + th * 0.18, tl * 0.1, th * 0.3); }
      g.fillStyle = wire; [0.12, 0.3, 0.7, 0.88].forEach(function (u) { g.beginPath(); g.arc(trainX + tl * u, ry - 4, 6, 0, 2 * Math.PI); g.fill(); });
      // walker: walks along the train and starts again at the other end (the screen motion is not to scale, the arrows are)
      var wx = trainX + tl * (0.1 + 0.8 * mod(0.5 + t * p.vw * 0.9 / (0.8 * tl), 1));   // same px per km/h as the train, so on the ground v_train + v_walker sets the direction
      person(g, wx, ry - 8, th * 0.95, fg);
      var vobs = gnd ? p.vt + p.vw : p.vw, sc = Math.min(1, (w * 0.4) / 130), L = vobs * sc;
      TV.arrow(g, wx, ry - th - 22, wx + L, ry - th - 22, cW, 3);
      lab(g, 'v', ' = ' + nf(vobs, 3) + ' km/h', wx + L / 2, ry - th - 40, cW, 'center', fs, bg);
      // train arrow and the ground as seen from the train
      var Lt = (gnd ? p.vt : 0) * sc;
      if (gnd) { TV.arrow(g, trainX + tl * 0.5, ry + 22, trainX + tl * 0.5 + Lt, ry + 22, cA, 3); lab(g, ctx.tx(T('v_{train}', 'v_{juna}')), ' = ' + nf(p.vt, 3) + ' km/h', trainX + tl * 0.5 + Lt / 2, ry + 42, cA, 'center', fs); }
      else { TV.arrow(g, w * 0.55, ry + 22, w * 0.55 - p.vt * sc, ry + 22, cA, 3); lab(g, ctx.tx(T('v_{ground}', 'v_{maa}')), ' = ' + nf(-p.vt, 3) + ' km/h', w * 0.55 - p.vt * sc / 2, ry + 42, cA, 'center', fs); }
      lab(g, '', ctx.tx(gnd ? T('Observer on the ground: the posts stand still, the train moves', 'Havaitsija maassa: pylväät ovat paikallaan, juna liikkuu')
        : T('Observer on the train: the train stands still, the ground moves backward', 'Havaitsija junassa: juna on paikallaan, maa liikkuu taaksepäin')), 8, 15, fg, 'left', fs);
      lab(g, '', ctx.tx(T('(motion on the screen is not to scale, the arrows are)', '(liike ruudulla ei ole mittakaavassa, nuolet ovat)')), 8, 33, mu, 'left', fs - 1);
    },
    outputs: function (p) {
      return [{ label: T('Walker, observer on the train', 'Kävelijä, havaitsija junassa'), value: p.vw, unit: 'km/h' },
              { label: T('Walker, observer on the ground', 'Kävelijä, havaitsija maassa'), value: p.vt + p.vw, unit: 'km/h' }];
    }
  };

  // ---------------------------------------------------------------- device: displacement vs distance (t2-walk-lab)
  var WALK = {
    animate: true,
    aspect: function (w) { return w < 520 ? 0.8 : 0.42; },
    params: [{ id: 'e', label: T('East leg', 'Matka itään'), min: 10, max: 100, step: 5, value: 70, unit: 'm' },
             { id: 'b', label: T('Back leg (west)', 'Paluumatka länteen'), min: 0, max: 100, step: 5, value: 30, unit: 'm' }],
    buttons: [{ label: T('Run the walk', 'Aja kävely'), click: function (p, D) { var S = D.S; changed(S, p, ['e', 'b']); S.t = D.motion ? 0 : 1e9; S.run = D.motion; } }],
    draw: function (g, w, h, p, ctx, TV, D) {
      var S = D.S, sp = 28, Te = p.e / sp, Tt = (p.e + p.b) / sp;
      if (changed(S, p, ['e', 'b'])) { S.run = false; S.t = 1e9; }
      if (S.t == null) S.t = 1e9;
      if (S.run) { S.t += D.dt; if (S.t >= Tt) S.run = false; }
      var t = Math.min(S.t, Tt), x = t < Te ? sp * t : p.e - sp * (t - Te), back = Math.max(0, x < p.e && t > Te ? p.e - x : 0);
      var fg = ctx.color('--fg'), wire = ctx.color('--c-wire'), mu = ctx.color('--muted'), bg = ctx.color('--surface'), fs = fsz(w);
      var cE = ctx.color('--f-applied'), cB = ctx.color('--f-weight'), cD = ctx.color('--f-accel');
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      var x0 = 26, X = function (m) { return x0 + (m + 100) / 230 * (w - 2 * x0); }, ay = h * 0.5;
      g.strokeStyle = wire; g.lineWidth = 2; line(g, X(-100), ay, X(130), ay);
      for (var m = -100; m <= 130; m += 10) { line(g, X(m), ay - (m % 50 === 0 ? 7 : 4), X(m), ay + (m % 50 === 0 ? 7 : 4)); if (m % 50 === 0) lab(g, '', String(m), X(m), ay + 20, mu, 'center', fs - 1); }
      lab(g, 'x', ' / m', X(130), ay + 38, fg, 'right', fs);
      lab(g, '', ctx.tx(T('West', 'Länsi')), X(-100), ay - 18, mu, 'left', fs - 1); lab(g, '', ctx.tx(T('East', 'Itä')), X(130), ay - 18, mu, 'right', fs - 1);
      // legs: the east leg solid, the way back dashed (drawn above and below the axis so they do not overlap)
      var xe = Math.min(x, p.e);
      if (xe > 0.5) { TV.arrow(g, X(0), ay - 26, X(xe), ay - 26, cE, 3); }
      lab(g, '', nf(p.e, 3) + ' m', X(p.e / 2), ay - 42, cE, 'center', fs);
      if (back > 0.5) { g.setLineDash([6, 4]); TV.arrow(g, X(p.e), ay - 14, X(p.e - back), ay - 14, cB, 3); g.setLineDash([]); lab(g, '', nf(Math.min(back, p.b), 3) + ' m', X(p.e - back / 2), ay - 5 - 36 + 22, cB, 'center', fs, bg); }
      person(g, X(x), ay, 34, fg);
      // displacement brace under the axis: from the start (0) to where the walker is
      var by = ay + 54;
      if (t > 0.01 && Math.abs(x) > 0.5) {
        TV.arrow(g, X(0), by, X(x), by, cD, 3.5);
        lab(g, 'Δx', ' = ' + nf(x, 3) + ' m', X(x / 2), by + 20, cD, 'center', fs, bg);
      }
      g.fillStyle = fg; g.beginPath(); g.arc(X(0), ay, 4, 0, 2 * Math.PI); g.fill();
      var dist = t < Te ? sp * t : p.e + sp * (t - Te);
      lab(g, 'd', ' = ' + nf(dist, 3) + ' m', 8, 15, fg, 'left', fs); lab(g, '', ctx.tx(T('(distance travelled so far)', '(kuljettu matka tähän mennessä)')), 8 + 70, 15, mu, 'left', fs - 1);
    },
    outputs: function (p) {
      return [{ tex: 'Δx = e − b', value: p.e - p.b, unit: 'm' }, { label: T('distance travelled', 'kuljettu matka'), value: p.e + p.b, unit: 'm' }];
    }
  };

  // ---------------------------------------------------------------- device: the average-speed trap (t2-trip-lab)
  function tripTimes(p) { var t1 = p.d1 / p.v1, t2 = p.d2 / p.v2; return { t1: t1, t2: t2, T: t1 + t2, vav: (p.d1 + p.d2) / (t1 + t2), vm: (p.v1 + p.v2) / 2 }; }
  var TRIP = {
    animate: true,
    aspect: function (w) { return w < 520 ? 0.8 : 0.42; },
    params: [{ id: 'd1', tex: 'd_1', min: 0.5, max: 10, step: 0.25, value: 2, unit: 'km' }, { id: 'v1', tex: 'v_1', min: 20, max: 120, step: 5, value: 60, unit: 'km/h' },
             { id: 'd2', tex: 'd_2', min: 0.5, max: 10, step: 0.25, value: 3.75, unit: 'km' }, { id: 'v2', tex: 'v_2', min: 20, max: 120, step: 5, value: 90, unit: 'km/h' }],
    buttons: [{ label: T('Race: real car vs "mean-speed" car', 'Kisa: oikea auto vs ”keskinopeusauto”'), click: function (p, D) { changed(D.S, p, ['d1', 'v1', 'd2', 'v2']); D.S.t = D.motion ? 0 : 1e9; D.S.run = D.motion; } }],
    draw: function (g, w, h, p, ctx, TV, D) {
      var S = D.S, q = tripTimes(p), D12 = p.d1 + p.d2, Tg = D12 / q.vm, Tmax = Math.max(q.T, Tg), RUN = 5;   // the slower car needs 5 s on the screen
      if (changed(S, p, ['d1', 'v1', 'd2', 'v2'])) { S.run = false; S.t = 1e9; }
      if (S.t == null) S.t = 1e9;
      if (S.run) { S.t += D.dt; if (S.t >= RUN) S.run = false; }
      var th = Math.min(S.t, RUN) / RUN * Tmax;   // hours of the trip
      var posR = th < q.t1 ? p.v1 * th : Math.min(D12, p.d1 + p.v2 * (th - q.t1)), posG = Math.min(D12, q.vm * th);
      var fg = ctx.color('--fg'), wire = ctx.color('--c-wire'), mu = ctx.color('--muted'), bg = ctx.color('--surface'), fs = fsz(w);
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      var x0 = 30, x1 = w - 36, X = function (km) { return x0 + (x1 - x0) * km / D12; }, y1 = h * 0.34, y2 = h * 0.66, cw = Math.min(40, w * 0.08), ch = cw * 0.45;
      [[y1, posR, ctx.color('--c-1'), 'real', q.T], [y2, posG, ctx.color('--muted'), 'ghost', Tg]].forEach(function (L) {
        g.strokeStyle = wire; g.lineWidth = 2; line(g, x0 - 10, L[0] + 10, x1 + 12, L[0] + 10);
        g.setLineDash([4, 4]); line(g, X(p.d1), L[0] - 12, X(p.d1), L[0] + 12); g.setLineDash([]);
        g.fillStyle = L[2]; g.globalAlpha = L[3] === 'ghost' ? 0.55 : 1; TV.rr(g, X(L[1]) - cw / 2, L[0] - ch, cw, ch, 4); g.fill();
        g.fillStyle = wire; g.beginPath(); g.arc(X(L[1]) - cw * 0.25, L[0] + 5, 4, 0, 2 * Math.PI); g.arc(X(L[1]) + cw * 0.25, L[0] + 5, 4, 0, 2 * Math.PI); g.fill(); g.globalAlpha = 1;
        g.strokeStyle = fg; g.lineWidth = 3; line(g, x1 + 12, L[0] - 14, x1 + 12, L[0] + 12);
        if (th >= L[4] - 1e-9) lab(g, 't', ' = ' + nf(L[4] * 60, 3) + ' min', x1 - 4, L[0] - 24, fg, 'right', fs, bg);
      });
      lab(g, '', ctx.tx(T('real car: ' + nf(p.v1, 3) + ' km/h, then ' + nf(p.v2, 3) + ' km/h', 'oikea auto: ' + nf(p.v1, 3) + ' km/h, sitten ' + nf(p.v2, 3) + ' km/h')), x0, y1 - 32, fg, 'left', fs);
      lab(g, '', ctx.tx(T('ghost car: constant ' + nf(q.vm, 3) + ' km/h (the mean of the two speeds)', 'haamuauto: vakio ' + nf(q.vm, 3) + ' km/h (nopeuksien keskiarvo)')), x0, y2 - 32, mu, 'left', fs);
      lab(g, 't', ' = ' + nf(th * 60, 3) + ' min', x0, h - 14, fg, 'left', fs);
    },
    outputs: function (p) {
      var q = tripTimes(p), win = q.T < (p.d1 + p.d2) / q.vm - 1e-9 ? T('the real car is faster', 'oikea auto on nopeampi') : q.T > (p.d1 + p.d2) / q.vm + 1e-9 ? T('the ghost car is faster', 'haamuauto on nopeampi') : T('a tie', 'tasapeli');
      return [{ tex: 't_1 = {d_1}/{v_1}', value: q.t1 * 60, unit: 'min' }, { tex: 't_2 = {d_2}/{v_2}', value: q.t2 * 60, unit: 'min' },
              { tex: 'v_k = {d_1 + d_2}/{t_1 + t_2}', value: q.vav, unit: 'km/h' }, { tex: '{v_1 + v_2}/2', value: q.vm, unit: 'km/h' }, { label: T('Result', 'Tulos'), value: win }];
    },
    answer: function (p) { return { v: tripTimes(p).vav }; }
  };

  // ---------------------------------------------------------------- device: dropped stone (t2-drop-lab)
  var DROPMAX = 100;
  var DROP = {
    animate: true,
    aspect: function (w) { return w < 520 ? 1.05 : 0.6; },
    params: [{ id: 'h', tex: 'h', min: 2, max: DROPMAX, step: 1, value: 24, unit: 'm' }],
    buttons: [{ label: T('Drop the stone', 'Pudota kivi'), click: function (p, D) { changed(D.S, p, ['h']); D.S.t = D.motion ? 0 : 1e9; D.S.run = D.motion; } }],
    draw: function (g, w, h, p, ctx, TV, D) {
      var S = D.S, tf = Math.sqrt(2 * p.h / G0), tmax = Math.sqrt(2 * DROPMAX / G0), vmax = G0 * tmax;
      if (changed(S, p, ['h'])) { S.run = false; S.t = 0; }
      if (S.run) { S.t += D.dt; if (S.t >= tf) S.run = false; }
      var t = Math.min(S.t || 0, tf), v = G0 * t, s = 0.5 * G0 * t * t;
      var fg = ctx.color('--fg'), wire = ctx.color('--c-wire'), mu = ctx.color('--muted'), bg = ctx.color('--surface'), fs = fsz(w);
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      // cliff and stone (the stone falls by the true distance, scaled to the 100 m maximum)
      var colW = w * 0.3, top = h * 0.08, gy = h * 0.92, ppm = (gy - top) / DROPMAX, y0 = gy - p.h * ppm;
      g.fillStyle = ctx.color('--m-ground'); g.fillRect(0, gy, colW, h - gy); g.fillRect(0, y0, colW * 0.35, gy - y0); g.strokeStyle = wire; g.lineWidth = 2; line(g, 0, gy, colW, gy);
      line(g, colW * 0.35, y0, colW * 0.35, gy); line(g, 0, y0, colW * 0.35, y0);
      var sx = colW * 0.6, sy = y0 + s * ppm - 8;
      g.strokeStyle = TV.alpha(mu, 0.8); g.lineWidth = 1.5;
      for (var k = 1; k * 0.5 <= t + 1e-9; k++) { var yy = y0 + 0.5 * G0 * Math.pow(k * 0.5, 2) * ppm - 8; line(g, sx - 12, yy, sx - 5, yy); }   // strobe: every 0.5 s
      g.fillStyle = ctx.color('--bad'); g.beginPath(); g.arc(sx, sy, 8, 0, 2 * Math.PI); g.fill();
      TV.arrow(g, sx + 18, sy, sx + 18, sy + Math.max(2, 50 * v / vmax * 1.5), ctx.color('--f-accel'), 3); lab(g, 'v', '', sx + 34, sy + 12, ctx.color('--f-accel'), 'left', fs, bg);
      lab(g, 'h', ' = ' + nf(p.h, 3) + ' m', colW * 0.18, (y0 + gy) / 2, fg, 'center', fs, bg);
      // v,t graph: v = g t (fixed slope), the area under it is the distance fallen
      var gx0 = colW + 46, gx1 = w - 14, gy0 = h * 0.12, gy1 = h - 30, X = function (tt) { return gx0 + tt / tmax * (gx1 - gx0); }, Y = function (vv) { return gy1 - vv / vmax * (gy1 - gy0); };
      g.strokeStyle = wire; g.lineWidth = 1.5; line(g, gx0, gy1, gx1, gy1); line(g, gx0, gy1, gx0, gy0 - 8);
      lab(g, 'v', ' / (m/s)', gx0 + 6, gy0 - 8, fg, 'left', fs); lab(g, 't', ' / s', gx1, gy1 - 12, fg, 'right', fs);
      for (var tt = 0; tt <= 4; tt++) lab(g, '', String(tt), X(tt), gy1 + 13, mu, 'center', fs - 2);
      [0, 20, 40].forEach(function (vv) { lab(g, '', String(vv), gx0 - 6, Y(vv), mu, 'right', fs - 2); });
      g.setLineDash([5, 4]); g.strokeStyle = mu; line(g, X(0), Y(0), X(tf), Y(G0 * tf)); g.setLineDash([]);
      if (t > 0) {
        g.fillStyle = TV.alpha(ctx.color('--c-1'), 0.28); g.beginPath(); g.moveTo(X(0), Y(0)); g.lineTo(X(t), Y(0)); g.lineTo(X(t), Y(v)); g.closePath(); g.fill();
        g.strokeStyle = ctx.color('--f-accel'); g.lineWidth = 3; line(g, X(0), Y(0), X(t), Y(v)); g.fillStyle = ctx.color('--f-accel'); g.beginPath(); g.arc(X(t), Y(v), 4.5, 0, 2 * Math.PI); g.fill();
        if (X(t) - X(0) > 70) lab(g, 's = ½ g t²', ' = ' + nf(s, 3) + ' m', X(t * 0.75), Y(0) - 14, ctx.color('--c-1'), 'center', fs - 1, bg);
      }
      lab(g, 't', ' = ' + nf(t, 3) + ' s', 8, 15, fg, 'left', fs);
    },
    outputs: function (p) {
      var tf = Math.sqrt(2 * p.h / G0);
      return [{ tex: 't = sqrt{{2 h}/{g}}', value: tf, unit: 's' }, { tex: 'v = g t', value: G0 * tf, unit: 'm/s' }, { label: T('Impact speed', 'Osumisnopeus'), value: G0 * tf * 3.6, unit: 'km/h' }];
    },
    answer: function (p) { return { v: Math.sqrt(2 * p.h / G0) }; }
  };

  // ---------------------------------------------------------------- device: crash into a wall with a crumple zone (t2-crash-lab)
  var CRASH = {
    animate: true,
    aspect: function (w) { return w < 520 ? 1.0 : 0.56; },
    params: [{ id: 'v', tex: 'v_0', min: 20, max: 100, step: 5, value: 45, unit: 'km/h' },
             { id: 'sc', label: T('Crumple zone of the car', 'Auton rusutusvyöhyke'), min: 10, max: 150, step: 5, value: 35, unit: 'cm' },
             { id: 'sb', label: T('Driver into the airbag', 'Kuljettaja ilmatyynyyn'), min: 0, max: 60, step: 5, value: 15, unit: 'cm' }],
    buttons: [{ label: T('Crash!', 'Törmäys!'), click: function (p, D) { changed(D.S, p, ['v', 'sc', 'sb']); D.S.t = D.motion ? 0 : 1e9; D.S.run = D.motion; } }],
    draw: function (g, w, h, p, ctx, TV, D) {
      var S = D.S, A = clamp(2.2 * 45 / p.v, 1, 4), B = 3.2;   // seconds: approach (a faster car arrives sooner), then the stop in slow motion
      if (changed(S, p, ['v', 'sc', 'sb'])) { S.run = false; S.t = 0; }
      if (S.run) { S.t += D.dt; if (S.t >= A + B) S.run = false; }
      var t = Math.min(S.t || 0, A + B), u = t <= A ? 0 : (t - A) / B;
      var v = p.v / 3.6, sm = (p.sc + p.sb) / 100, a = v * v / (2 * sm), frac = 1 - (1 - u) * (1 - u), xs = frac * sm;   // stopping distance covered so far
      var fg = ctx.color('--fg'), wire = ctx.color('--c-wire'), mu = ctx.color('--muted'), bg = ctx.color('--surface'), fs = fsz(w);
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      var gy = h * 0.6, wallX = w * 0.74, ppm = w * 0.16, cw = Math.min(w * 0.4, 230), ch = cw * 0.32;
      g.fillStyle = ctx.color('--m-ground'); g.fillRect(0, gy, w, h * 0.06); g.strokeStyle = wire; g.lineWidth = 2; line(g, 0, gy, w, gy);
      g.fillStyle = ctx.color('--m-ground'); g.fillRect(wallX, gy - h * 0.34, w - wallX, h * 0.34); g.lineWidth = 4; line(g, wallX, gy - h * 0.34, wallX, gy);
      // the car front reaches the wall; during the stop the nose crumples by min(xs, sc)
      var crumple = Math.min(xs, p.sc / 100), noseX = t <= A ? wallX - (A - t) / A * w * 0.5 : wallX, bodyX = noseX - cw + crumple * ppm;
      g.fillStyle = ctx.color('--m-body'); g.lineWidth = 2.5; g.strokeStyle = wire;
      TV.rr(g, bodyX, gy - ch - 8, noseX - bodyX, ch, 6); g.fill(); g.stroke();
      g.fillStyle = wire; [0.2, 0.75].forEach(function (f) { g.beginPath(); g.arc(bodyX + (noseX - bodyX) * f, gy - 4, 8, 0, 2 * Math.PI); g.fill(); });
      // driver: moves on by the whole stopping distance; the airbag is the last part of it
      var dx = bodyX + (noseX - bodyX) * 0.42 + (xs - crumple) * ppm; person(g, dx, gy - 8 - ch * 0.12, ch * 0.9, fg);
      if (xs > p.sc / 100) { g.fillStyle = TV.alpha(ctx.color('--f-applied'), 0.45); g.beginPath(); g.arc(dx + 16, gy - ch * 0.9, 13 + 5 * (xs - p.sc / 100) / (p.sb / 100 + 1e-9), 0, 2 * Math.PI); g.fill(); }
      // deceleration bar (during the stop the speed falls linearly to 0)
      var by = h * 0.8, bw = w * 0.5, bx = w * 0.06, ag = a / G0, amax = (100 / 3.6) * (100 / 3.6) / (2 * 0.1) / G0;
      g.strokeStyle = wire; g.lineWidth = 1.5; g.strokeRect(bx, by, bw, 16);
      g.fillStyle = ctx.color(ag > 20 ? '--bad' : '--f-accel'); g.globalAlpha = u > 0 ? 0.85 : 0.25; g.fillRect(bx, by, bw * Math.min(1, ag / amax), 16); g.globalAlpha = 1;
      lab(g, 'a', ' = ' + nf(a, 3) + ' m/s²  =  ' + nf(ag, 3) + ' g', bx, by + 32, fg, 'left', fs);
      lab(g, 'v', ' = ' + nf(t <= A ? v : v * (1 - u), 3) + ' m/s', 8, 15, fg, 'left', fs);
      lab(g, '', ctx.tx(T('(the stop is shown in slow motion; it really lasts ' + nf(2 * sm / v, 2) + ' s)', '(pysähtyminen näytetään hidastettuna; todellisuudessa se kestää ' + nf(2 * sm / v, 2).replace('.', ',') + ' s)')), 8, 33, mu, 'left', fs - 1);
    },
    outputs: function (p) {
      var v = p.v / 3.6, s = (p.sc + p.sb) / 100;
      return [{ tex: 'v_0', value: v, unit: 'm/s' }, { tex: 's = s_c + s_b', value: s, unit: 'm' }, { tex: 'a = {v^2 − v_0^2}/{2\\s}', value: -v * v / (2 * s), unit: 'm/s²' },
              { tex: '|a|/g', value: v * v / (2 * s) / G0 }];
    },
    answer: function (p) { var v = p.v / 3.6; return { v: v * v / (2 * (p.sc + p.sb) / 100) }; }
  };

  // ---------------------------------------------------------------- curves of the graph-reading exercises (units: m, s)
  var A2F = function (t) { return 13 * Math.sin(Math.PI * t / 6); };                 // ex A2: x(t)
  var A3C = [0.16459, 0.47967, -0.04444];                                               // ex A3: v(t) = c1 t + c2 t² + c3 t³
  var A3F = function (t) { return A3C[0] * t + A3C[1] * t * t + A3C[2] * t * t * t; };
  var A4F = function (t) { return Math.sqrt(t); };                                      // ex A4: a(t)
  var V215 = 122 / 3.6, TAU = 6.3;                                                      // ex 2.15: v(t) = V (1 − e^{−t/τ}) in m/s
  var F215 = function (t) { return V215 * (1 - Math.exp(-t / TAU)); };
  var SSHAPE = function (t) { var u = t / 10; return 50 * (3 * u * u - 2 * u * u * u); };   // secant explorer: S-shaped s(t)
  // readouts of the reading tasks: only the time and the read value of the graph's own quantity (never slopes or areas)
  function readOnly(key, sym, unit) {
    return function (p, st) { return [{ tex: 't', value: st.t, unit: 's' }, { tex: sym, value: st[key], unit: unit }]; };
  }

  // ---------------------------------------------------------------- the topic
  TDC.registerTopic({
    id: 't2', num: 2,
    title: T('Kinematics', 'Kinematiikka'),
    subtitle: T('Position, velocity and acceleration of straight-line motion, read from formulas and from graphs.', 'Suoraviivaisen liikkeen paikka, nopeus ja kiihtyvyys kaavoista ja kuvaajista luettuna.'),
    objectives: [
      T('choose a coordinate system and tell displacement from distance travelled', 'valita koordinaatiston ja erottaa siirtymän kuljetusta matkasta'),
      T('calculate average velocity and average speed, also for trips in several parts', 'laskea keskinopeuden ja keskivauhdin myös useassa osassa kuljetulle matkalle'),
      T('use the four formulas of constant acceleration and pick the one that fits the known quantities', 'käyttää tasaisesti kiihtyvän liikkeen neljää kaavaa ja valita tunnettuihin suureisiin sopivan'),
      T('read velocity as the slope and distance as the area of a graph (s,t, v,t and a,t)', 'lukea nopeuden kuvaajan kulmakertoimena ja matkan pinta-alana (s,t-, v,t- ja a,t-kuvaajat)'),
      T('solve free-fall and stopping-distance problems with g = 9.81 m/s²', 'ratkaista vapaan pudotuksen ja pysähtymismatkan tehtäviä arvolla g = 9,81 m/s²')
    ],
    glossary: {
      kinematics: { en: 'kinematics', fi: 'kinematiikka, liikeoppi', def: T('The description of motion (position, velocity, acceleration) without asking what causes it.', 'Liikkeen kuvaaminen (paikka, nopeus, kiihtyvyys) kysymättä sen syytä.') },
      refframe: { en: 'reference frame, coordinate system', fi: 'koordinaatisto', def: T('The origin and positive direction relative to which position and velocity are measured.', 'Origo ja positiivinen suunta, joiden suhteen paikka ja nopeus mitataan.') },
      rectilinear: { en: 'rectilinear motion', fi: 'suoraviivainen liike', def: T('Motion along a straight line; the position is one coordinate x (or s).', 'Liike suoraa pitkin; paikkaa kuvaa yksi koordinaatti x (tai s).') },
      pointbody: { en: 'point-like rigid object', fi: 'pistemäinen jäykkä kappale', def: T('The model of kinematics: the size and shape of the body are ignored.', 'Kinematiikan malli: kappaleen kokoa ja muotoa ei huomioida.') },
      position: { en: 'position', fi: 'paikka (asema)', sym: 'x, s', def: T('Where the body is on the axis, relative to the origin; it has a sign.', 'Kappaleen sijainti akselilla origon suhteen; sillä on etumerkki.') },
      displacement: { en: 'displacement', fi: 'siirtymä', sym: 'Δx = x₂ − x₁', def: T('The change of position, a vector: only the start and the end matter.', 'Paikan muutos, vektori: vain alku- ja loppupiste ratkaisevat.') },
      distance: { en: 'distance travelled', fi: 'kuljettu matka', sym: 'd', def: T('The length of the path actually travelled; never negative, never smaller than |Δx|.', 'Todellisuudessa kuljetun reitin pituus; ei koskaan negatiivinen eikä pienempi kuin |Δx|.') },
      path: { en: 'path, track', fi: 'rata', def: T('The line along which the body moves.', 'Viiva, jota pitkin kappale liikkuu.') },
      uniform: { en: 'uniform motion', fi: 'tasainen liike', def: T('Motion at constant velocity; a = 0.', 'Liike vakionopeudella; a = 0.') },
      rest: { en: 'static state, rest', fi: 'lepotila', def: T('The body does not move: v = 0.', 'Kappale ei liiku: v = 0.') },
      uniformacc: { en: 'uniformly accelerating motion', fi: 'tasaisesti kiihtyvä liike', def: T('Motion with constant acceleration; v changes by equal amounts in equal times.', 'Liike vakiokiihtyvyydellä; nopeus muuttuu yhtä paljon yhtä pitkissä ajoissa.') },
      variable: { en: 'variable motion', fi: 'muuttuva liike', def: T('Motion whose velocity changes: constant or variable acceleration.', 'Liike, jossa nopeus muuttuu: vakio- tai muuttuva kiihtyvyys.') },
      velocity: { en: 'velocity', fi: 'nopeus', sym: 'v', def: T('Rate of change of position; a vector in a straight line (sign = direction). Unit m/s.', 'Paikan muutosnopeus; suoralla vektori (etumerkki = suunta). Yksikkö m/s.') },
      avgvel: { en: 'average velocity', fi: 'keskinopeus', sym: 'v_k = Δs/Δt', def: T('Displacement divided by the time taken.', 'Siirtymä jaettuna siihen kuluneella ajalla.') },
      avgspeed: { en: 'average speed', fi: 'keskivauhti', sym: 'v_s', def: T('Distance travelled divided by the time taken; always the total distance over the total time.', 'Kuljettu matka jaettuna siihen kuluneella ajalla; aina kokonaismatka jaettuna kokonaisajalla.') },
      speed: { en: 'speed (magnitude of velocity)', fi: 'vauhti', def: T('The size of the velocity, without direction.', 'Nopeuden suuruus ilman suuntaa.') },
      instvel: { en: 'instantaneous velocity', fi: 'hetkellinen nopeus', sym: 'v = ds/dt', def: T('Velocity at one moment: the slope of the tangent of the s,t graph.', 'Nopeus yhdellä ajanhetkellä: s,t-kuvaajan tangentin kulmakerroin.') },
      accel: { en: 'acceleration', fi: 'kiihtyvyys', sym: 'a', def: T('Rate of change of velocity; unit m/s².', 'Nopeuden muutosnopeus; yksikkö m/s².') },
      avgacc: { en: 'average acceleration', fi: 'keskikiihtyvyys', sym: 'a_k = Δv/Δt', def: T('Change of velocity divided by the time taken.', 'Nopeuden muutos jaettuna siihen kuluneella ajalla.') },
      instacc: { en: 'instantaneous acceleration', fi: 'hetkellinen kiihtyvyys', sym: 'a = dv/dt', def: T('The slope of the tangent of the v,t graph.', 'v,t-kuvaajan tangentin kulmakerroin.') },
      decel: { en: 'deceleration', fi: 'hidastuva liike (negatiivinen kiihtyvyys)', def: T('Acceleration against the direction of motion, so the speed decreases.', 'Liikkeen suuntaa vastaan suuntautuva kiihtyvyys, jolloin vauhti pienenee.') },
      freefall: { en: 'free fall', fi: 'vapaa pudotus (putoaminen)', def: T('Fall with only gravity acting (no air resistance): constant acceleration g.', 'Putoaminen, jossa vaikuttaa vain painovoima (ei ilmanvastusta): vakiokiihtyvyys g.') },
      gaccel: { en: 'gravitational acceleration', fi: 'putoamiskiihtyvyys', sym: 'g', def: T('g = 9.81 m/s² (used in this course; the slides often use 9.8).', 'g = 9,81 m/s² (käytetään tällä kurssilla; kalvoilla usein 9,8).') },
      airres: { en: 'air resistance', fi: 'ilmanvastus', def: T('The drag of the air; neglected in free fall.', 'Ilman vastus; jätetään huomiotta vapaassa pudotuksessa.') },
      tangent: { en: 'tangent', fi: 'tangentti', def: T('The line that touches a curve at one point and has the same slope as the curve there.', 'Suora, joka sivuaa käyrää yhdessä pisteessä ja jolla on siinä sama kulmakerroin kuin käyrällä.') },
      slope: { en: 'slope', fi: 'kulmakerroin', def: T('Rise divided by run of a line: Δy/Δx.', 'Suoran pystysuuntainen muutos jaettuna vaakasuuntaisella muutoksella: Δy/Δx.') },
      derivative: { en: 'derivative', fi: 'derivaatta', sym: 'ds/dt', def: T('The limit of the slope of the secant as Δt → 0.', 'Sekantin kulmakertoimen raja-arvo, kun Δt → 0.') },
      integral: { en: 'integral', fi: 'integraali', sym: '∫ v dt', def: T('The area under a graph; ∫ v dt is the displacement.', 'Kuvaajan alle jäävä pinta-ala; ∫ v dt on siirtymä.') },
      area: { en: 'area under the graph', fi: 'kuvaajan alle jäävä pinta-ala', def: T('Area under v,t = displacement; area under a,t = change of velocity.', 'v,t-kuvaajan ala = siirtymä; a,t-kuvaajan ala = nopeuden muutos.') },
      trapezoid: { en: 'trapezoidal method', fi: 'puolisuunnikasmenetelmä', def: T('Estimate of an area by strips with a slanted top; each strip is ½ (y₁ + y₂) Δt.', 'Pinta-alan arvio vinoyläreunaisilla kaistoilla; kunkin kaistan ala on ½ (y₁ + y₂) Δt.') },
      graph: { en: 'graph', fi: 'kuvaaja', def: T('A plot of one quantity against another, e.g. the t,v graph (v against t).', 'Yhden suureen piirros toisen funktiona, esim. t,v-kuvaaja (v ajan funktiona).') },
      initvel: { en: 'initial velocity', fi: 'alkunopeus', sym: 'v₀', def: T('The velocity at the start, at t = 0.', 'Nopeus alussa, hetkellä t = 0.') },
      leadsign: { en: 'leading sign', fi: 'etumerkki', def: T('The + or − in front of a vector component; it gives the direction on the axis.', 'Vektorin komponentin edessä oleva + tai −; se ilmaisee suunnan akselilla.') }
    },
    formulas: [
      { name: T('Displacement', 'Siirtymä'), tex: 'Δx = x_2 − x_1' },
      { name: T('Average velocity', 'Keskinopeus'), tex: 'v_k = {Δs}/{Δt} = {s − s_0}/{t − t_0}' },
      { name: T('Uniform motion', 'Tasainen liike'), tex: 's = s_0 + v t' },
      { name: T('Average acceleration', 'Keskikiihtyvyys'), tex: 'a = {Δv}/{Δt} = {v − v_0}/{t − t_0}' },
      { name: T('Constant acceleration: velocity', 'Vakiokiihtyvyys: nopeus'), tex: 'v = v_0 + a t' },
      { name: T('Constant acceleration: position (mean velocity)', 'Vakiokiihtyvyys: paikka (keskinopeus)'), tex: 's = s_0 + ½ (v_0 + v) t' },
      { name: T('Constant acceleration: position', 'Vakiokiihtyvyys: paikka'), tex: 's = s_0 + v_0 t + ½ a t^2' },
      { name: T('Constant acceleration: no time', 'Vakiokiihtyvyys: ei aikaa'), tex: 'v^2 = v_0^2 + 2 a (s − s_0)' },
      { name: T('Free fall from rest', 'Vapaa pudotus levosta'), tex: 's = ½ g t^2,  v = g t' },
      { name: T('Velocity and acceleration as derivatives', 'Nopeus ja kiihtyvyys derivaattoina'), tex: 'v = {ds}/{dt},  a = {dv}/{dt}' },
      { name: T('Displacement as an integral', 'Siirtymä integraalina'), tex: 's(t) = ∫ v dt' },
      { name: T('Unit conversion', 'Yksikönmuunnos'), tex: '1 m/s = 3.6 km/h' }
    ],
    sections: [
      // ======================================================== 2.1 frame, position, displacement (p03)
      { id: 't2-frame', title: T('Frame of reference, position and displacement', 'Koordi\u00ADnaatisto, paikka ja siirtymä'),
        blocks: [
          { id: 't2-frame-intro', type: 'text', html: T(
            '<p><dfn data-term="kinematics">Kinematics</dfn> describes how bodies move: where they are, how fast and how the speed changes. It does not ask what causes the motion (that is topic 3). The model is a <dfn data-term="pointbody">point-like rigid object</dfn> in <dfn data-term="rectilinear">rectilinear (straight-line) motion</dfn>, so the position is a single coordinate and the direction of a vector is given by its <dfn data-term="leadsign">leading sign</dfn> (+ or −).</p>',
            '<p><dfn data-term="kinematics">Kinematiikka</dfn> kuvaa, miten kappaleet liikkuvat: missä ne ovat, kuinka nopeasti ja miten nopeus muuttuu. Se ei kysy liikkeen syytä (se kuuluu aiheeseen 3). Malli on <dfn data-term="pointbody">pistemäinen jäykkä kappale</dfn> <dfn data-term="rectilinear">suoraviivaisessa liikkeessä</dfn>, jolloin paikka on yksi koordinaatti ja vektorin suunta ilmaistaan <dfn data-term="leadsign">etumerkillä</dfn> (+ tai −).</p>') },
          { id: 't2-frame-states', type: 'list', items: [
            T('<b>Uniform motion</b> and <b>static state</b> (rest): the velocity is constant (zero at rest).', '<b>Tasainen liike</b> ja <b>lepotila</b>: nopeus on vakio (levossa nolla).'),
            T('<b>Variable motion</b> with <b>constant acceleration</b>: the velocity changes by equal amounts in equal times.', '<b>Muuttuva liike</b> <b>vakiokiihtyvyydellä</b>: nopeus muuttuu yhtä paljon yhtä pitkissä ajoissa.'),
            T('<b>Variable motion</b> with <b>variable acceleration</b>: needs instantaneous values (slopes and areas of curves).', '<b>Muuttuva liike</b> <b>muuttuvalla kiihtyvyydellä</b>: tarvitaan hetkellisiä arvoja (käyrien kulmakertoimia ja pinta-aloja).')] },
          { id: 't2-frame-text', type: 'text', html: T(
            '<p>Every position, velocity or displacement is measured <b>relative to a chosen coordinate system</b> (<dfn data-term="refframe">reference frame</dfn>). Define it first: where the origin is and which way is positive (usually the x axis to the right, the y axis up).</p>',
            '<p>Jokainen paikka, nopeus ja siirtymä mitataan <b>valitun koordinaatiston</b> (<dfn data-term="refframe">vertailukehyksen</dfn>) suhteen. Määrittele se ensin: missä origo on ja mihin suuntaan on positiivinen (yleensä x-akseli oikealle, y-akseli ylös).</p>') },
          { id: 't2-frame-lab', type: 'interactive', widget: 'custom', title: T('Frame of reference: a walker on a train', 'Koordi\u00ADnaatisto: kävelijä junassa'),
            caption: T('A train moves at 80 km/h and a passenger walks toward its front at 5 km/h. Change the speeds, press Run and switch the observer: the same walker has two different velocities, 85 km/h for the observer on the ground and 5 km/h for the observer on the train.',
              'Juna kulkee 80 km/h ja matkustaja kävelee junan etuosaa kohti 5 km/h. Muuta nopeuksia, paina Aja ja vaihda havaitsijaa: samalla kävelijällä on kaksi eri nopeutta, 85 km/h maassa olevalle ja 5 km/h junassa olevalle havaitsijalle.'),
            config: dev(FRAME) },
          { id: 't2-frame-ex', type: 'example', title: T('Train and walker (slide p03)', 'Juna ja kävelijä (kalvo s. 03)'),
            problem: T('A train moves at 80 km/h to the right. A passenger walks toward the front of the train at 5 km/h relative to the train. What is the passenger\'s velocity for an observer a) on the train, b) on the ground?', 'Juna kulkee 80 km/h oikealle. Matkustaja kävelee junan etuosaa kohti 5 km/h junan suhteen. Mikä on matkustajan nopeus havaitsijalle a) junassa, b) maassa?'),
            given: ['v_rel = 5 km/h', 'v_train = 80 km/h'],
            steps: [
              T('Choose the coordinate system. Case a): tied to the train, positive to the right: the passenger moves 5 km/h.', 'Valitse koordinaatisto. Tapaus a): kiinni junassa, positiivinen oikealle: matkustaja liikkuu 5 km/h.'),
              T('Case b): tied to the ground, positive to the right: the train moves 80 km/h and the passenger moves on top of that.', 'Tapaus b): kiinni maassa, positiivinen oikealle: juna liikkuu 80 km/h ja matkustaja sen lisäksi.'),
              { tex: 'v = 80 km/h + 5 km/h = 85 km/h' },
              T('Walking toward the back would give 80 − 5 = 75 km/h. So always say which coordinate system you use.', 'Taaksepäin kävellessä saataisiin 80 − 5 = 75 km/h. Kerro siis aina, mitä koordinaatistoa käytät.')
            ],
            result: T('a) 5 km/h, b) 85 km/h', 'a) 5 km/h, b) 85 km/h') },
          { id: 't2-frame-h', type: 'h', text: T('Position, displacement and distance travelled', 'Paikka, siirtymä ja kuljettu matka') },
          { id: 't2-disp-text', type: 'text', html: T(
            '<p>On a straight line the <dfn data-term="position">position</dfn> <f>x</f> is the signed distance from the origin. The <dfn data-term="displacement">displacement</dfn> is the <b>change</b> of position, a vector; the <dfn data-term="distance">distance travelled</dfn> is the length of the path actually walked. Distance cannot always be found from the displacement.</p>',
            '<p>Suoralla <dfn data-term="position">paikka</dfn> <f>x</f> on etumerkillinen etäisyys origosta. <dfn data-term="displacement">Siirtymä</dfn> on paikan <b>muutos</b>, vektori; <dfn data-term="distance">kuljettu matka</dfn> on todella kuljetun reitin pituus. Matkaa ei aina voi päätellä siirtymästä.</p>') },
          { id: 't2-disp-f', type: 'formula', key: true, tex: 'Δx = x_2 − x_1', label: T('Displacement', 'Siirtymä'),
            legend: [['Δx', T('displacement (signed)', 'siirtymä (etumerkillinen)'), 'm'], ['x_1', T('start position', 'alkupaikka'), 'm'], ['x_2', T('end position', 'loppupaikka'), 'm']] },
          { id: 't2-disp-fig', type: 'figure', svg: FIG_LINE,
            caption: T('From x₁ = 10 m to x₂ = 30 m: Δx = 30 − 10 = 20 m, to the right (positive).', 'Paikasta x₁ = 10 m paikkaan x₂ = 30 m: Δx = 30 − 10 = 20 m, oikealle (positiivinen).'),
            alt: T('Number line with the positions x1 = 10 m and x2 = 30 m and the displacement arrow between them', 'Lukusuora, jolla paikat x1 = 10 m ja x2 = 30 m ja niiden välinen siirtymänuoli') },
          { id: 't2-walk-lab', type: 'interactive', widget: 'custom', title: T('Walk to and fro: displacement and distance', 'Edestakainen kävely: siirtymä ja matka'),
            caption: T('Set the two legs and press Run. The arrow Δx under the axis is the displacement, the change of position from the start: it can shrink (and change sign) on the way back. The distance travelled only grows.',
              'Säädä kaksi osamatkaa ja paina Aja. Akselin alla oleva nuoli Δx on siirtymä eli paikan muutos lähtöpisteestä: se voi pienentyä (ja vaihtaa etumerkkiä) paluumatkalla. Kuljettu matka vain kasvaa.'),
            config: dev(WALK) },
          { id: 't2-walk-ex', type: 'example', title: T('Walk east and back (slide p03)', 'Kävely itään ja takaisin (kalvo s. 03)'),
            problem: T('A person walks 70 m east and then 30 m west. What are the displacement and the distance travelled?', 'Henkilö kävelee 70 m itään ja sitten 30 m länteen. Mitkä ovat siirtymä ja kuljettu matka?'),
            given: ['x_1 = 0', 'x_2 = 70 m − 30 m = 40 m'],
            steps: [
              T('East is positive. After the walk the person is at x = 70 − 30 = 40 m.', 'Itä on positiivinen. Kävelyn jälkeen henkilö on paikassa x = 70 − 30 = 40 m.'),
              { tex: T('Δx = x_2 − x_1 = 40 m − 0 = 40 m  (east)', 'Δx = x_2 − x_1 = 40 m − 0 = 40 m  (itään)') },
              T('The path was 70 m long and then 30 m long: the distance is the sum, not the difference.', 'Reitti oli ensin 70 m ja sitten 30 m: matka on summa, ei erotus.'),
              { tex: 'd = 70 m + 30 m = 100 m' }
            ],
            result: T('Δx = 40 m east, d = 100 m', 'Δx = 40 m itään, d = 100 m') },
          { id: 't2-frame-warn', type: 'callout', kind: 'warn', title: T('Displacement is not distance', 'Siirtymä ei ole matka'), html: T(
            'Displacement has a direction and can be zero after a round trip; distance travelled is never negative and is at least |Δx|. This is why velocity and speed differ in the next section.',
            'Siirtymällä on suunta, ja se voi olla edestakaisen matkan jälkeen nolla; kuljettu matka ei ole koskaan negatiivinen ja on vähintään |Δx|. Siksi nopeus ja vauhti eroavat seuraavassa osassa.') },
          { type: 'question', q: 't2-q1', id: 't2-q1-blk' },
          { type: 'question', q: 't2-q2', id: 't2-q2-blk' },
          { type: 'question', q: 't2-q3', id: 't2-q3-blk' }
        ] },

      // ======================================================== 2.2 uniform motion and rest (p04, FI p05)
      { id: 't2-uniform', title: T('Uniform motion and rest', 'Tasainen liike ja lepotila'),
        blocks: [
          { id: 't2-uni-text', type: 'text', html: T(
            '<p>In <dfn data-term="uniform">uniform motion</dfn> the speed is constant and the path is a straight line (a straight road, a railway, a straight flight). The unit of velocity is m/s; <f>1 m/s = 3.6 km/h</f>. The <dfn data-term="avgvel">average velocity</dfn> uses the <b>displacement</b>, the <dfn data-term="avgspeed">average speed</dfn> uses the <b>distance travelled</b>.</p>',
            '<p><dfn data-term="uniform">Tasaisessa liikkeessä</dfn> vauhti on vakio ja rata on suora (suora tie, rata, suora lentoreitti). Nopeuden yksikkö on m/s; <f>1 m/s = 3,6 km/h</f>. <dfn data-term="avgvel">Keskinopeus</dfn> lasketaan <b>siirtymästä</b>, <dfn data-term="avgspeed">keskivauhti</dfn> <b>kuljetusta matkasta</b>.</p>') },
          { id: 't2-uni-f1', type: 'formula', key: true, tex: 'v_k = {Δs}/{Δt} = {s − s_0}/{t − t_0}', label: T('Average velocity', 'Keskinopeus'),
            legend: [['v_k', T('average velocity (k = keski)', 'keskinopeus'), 'm/s'], ['Δs', T('displacement', 'siirtymä'), 'm'], ['Δt', T('time interval', 'aikaväli'), 's']] },
          { id: 't2-uni-f2', type: 'formula', tex: 's = s_0 + v_k t', label: T('Equation of the line (uniform motion)', 'Suoran yhtälö (tasainen liike)'),
            legend: [['s_0', T('position at t = 0', 'paikka hetkellä t = 0'), 'm'], ['v_k', T('constant velocity = slope of the s,t line', 'vakionopeus = s,t-suoran kulmakerroin'), 'm/s']] },
          { id: 't2-uni-lab', type: 'interactive', widget: 'motion', title: T('Uniform motion: the s,t line and the v,t rectangle', 'Tasainen liike: s,t-suora ja v,t-suorakulmio'),
            caption: T('Set s₀ and v₀ (a = 0) and press Run. The s,t graph is a straight line whose slope is v; the v,t graph is a horizontal line, and the shaded rectangle under it is the displacement s = v t. A negative v₀ turns the line downward. Drag on the graphs to move the time cursor.',
              'Säädä s₀ ja v₀ (a = 0) ja paina Aja. s,t-kuvaaja on suora, jonka kulmakerroin on v; v,t-kuvaaja on vaakasuora ja sen alle jäävä suorakulmio on siirtymä s = v t. Negatiivinen v₀ kääntää suoran alaspäin. Vedä kuvaajilla siirtääksesi aikakursoria.'),
            config: { T: 10, values: { s0: 0, v0: 4, a: 0 }, fixed: ['a'], graphs: ['s', 'v'], tools: ['tangent', 'area', 'strobe'], ranges: { v0: { min: -8, max: 8, step: 0.5 } } } },
          { type: 'question', q: 't2-q4', id: 't2-q4-blk' },
          { type: 'question', q: 't2-q5', id: 't2-q5-blk' },
          { id: 't2-uni-ex1', type: 'example', title: T('Average velocity and average speed (slide p04)', 'Keskinopeus ja keskivauhti (kalvo s. 04)'),
            problem: T('A car drives from the position 0 km to 20 km in a straight line and then returns 5 km. At t = 0.5 h it is at 15 km. a) What is its average velocity? b) What is its average speed?', 'Auto ajaa suoraan paikasta 0 km paikkaan 20 km ja palaa sitten 5 km. Hetkellä t = 0,5 h se on paikassa 15 km. a) Mikä on sen keskinopeus? b) Mikä on sen keskivauhti?'),
            given: ['s_0 = 0 km', 's = 15 km', 't = 0.5 h', 'd = 20 km + 5 km'],
            steps: [
              T('a) The average velocity uses the displacement: 15 km − 0 km.', 'a) Keskinopeus lasketaan siirtymästä: 15 km − 0 km.'),
              { tex: 'v_k = {15 km − 0 km}/{0.5 h} = 30 km/h' },
              T('b) The average speed uses the distance travelled, 20 km out and 5 km back.', 'b) Keskivauhti lasketaan kuljetusta matkasta, 20 km menoa ja 5 km paluuta.'),
              { tex: '{20 km + 5 km}/{0.5 h} = 50 km/h' },
              T('The slide writes the 50 km/h as |v_av|; strictly that is the average speed, while the average velocity is 30 km/h.', 'Kalvolla 50 km/h on merkitty |v_av|; tarkasti se on keskivauhti, kun keskinopeus on 30 km/h.')
            ],
            result: T('v_k = 30 km/h, average speed 50 km/h', 'v_k = 30 km/h, keskivauhti 50 km/h') },
          { type: 'question', q: 't2-q6', id: 't2-q6-blk' },
          { type: 'question', q: 't2-q7', id: 't2-q7-blk' },
          { id: 't2-uni-h', type: 'h', text: T('Speed from distance and time: exercises A1, 2.1, 2.2, 2.3, 2.5', 'Vauhti matkasta ja ajasta: tehtävät A1, 2.1, 2.2, 2.3, 2.5') },
          { id: 't2-uni-text2', type: 'text', html: T(
            '<p>The same formula <f>v = s/t</f> can be turned around: <f>s = v t</f> gives the distance and <f>t = s/v</f> the time. Convert units first (km/h to m/s with ÷ 3.6, minutes to seconds) and keep the unrounded result until the end. Radar and sonar measure the distance with the echo: the pulse travels <b>there and back</b>, so the distance is <f>c t/2</f>.</p>',
            '<p>Samaa kaavaa <f>v = s/t</f> voi kääntää: <f>s = v t</f> antaa matkan ja <f>t = s/v</f> ajan. Muunna yksiköt ensin (km/h → m/s jakamalla 3,6:lla, minuutit sekunneiksi) ja säilytä pyöristämätön tulos loppuun asti. Tutka ja luotain mittaavat etäisyyden kaiusta: pulssi kulkee <b>edestakaisin</b>, joten etäisyys on <f>c t/2</f>.</p>') },
          { type: 'question', q: 't2-q8', id: 't2-q8-blk' },
          { type: 'question', q: 't2-q9', id: 't2-q9-blk' },
          { type: 'question', q: 't2-q10', id: 't2-q10-blk' },
          { type: 'question', q: 't2-q11', id: 't2-q11-blk' },
          { type: 'question', q: 't2-q12', id: 't2-q12-blk' },
          { type: 'question', q: 't2-q13', id: 't2-q13-blk' },
          { id: 't2-uni-h2', type: 'h', text: T('The average-speed trap', 'Keskivauhdin ansa') },
          { id: 't2-uni-ex2', type: 'example', title: T('A world record (FI slide p05)', 'Maailman\u00ADennätys (suomenkielinen kalvo s. 05)'),
            problem: T('Usain Bolt ran the 100 m in the world record time 9.58 s. What was his average speed?', 'Usain Bolt juoksi 100 m:n maailmanennätysajan 9,58 s. Mikä oli hänen keskivauhtinsa?'),
            given: ['s = 100 m', 't = 9.58 s'],
            steps: [{ tex: 'v = {s}/{t} = {100 m}/{9.58 s} = 10.44 m/s' }, T('That is 37.6 km/h; the slide rounds to 10 m/s.', 'Se on 37,6 km/h; kalvolla pyöristetty 10 m/s:iin.')],
            result: T('v ≈ 10.4 m/s', 'v ≈ 10,4 m/s') },
          { id: 't2-uni-ex3', type: 'example', title: T('Two speeds (FI slide p05)', 'Kaksi nopeutta (suomenkielinen kalvo s. 05)'),
            problem: T('A car drives 2.0 km at 60 km/h and then 3.75 km at 90 km/h. What is its average speed for the whole drive?', 'Auto ajaa 2,0 km nopeudella 60 km/h ja sitten 3,75 km nopeudella 90 km/h. Mikä on sen keskivauhti koko matkalla?'),
            given: ['d_1 = 2.0 km, v_1 = 60 km/h', 'd_2 = 3.75 km, v_2 = 90 km/h'],
            steps: [
              T('The average speed is the total distance over the total time. Find the times of the two parts.', 'Keskivauhti on kokonaismatka jaettuna kokonaisajalla. Laske osien ajat.'),
              { tex: 't_1 = {2.0 km}/{60 km/h} = 0.0333 h,  t_2 = {3.75 km}/{90 km/h} = 0.0417 h' },
              { tex: 'v = {2.0 km + 3.75 km}/{0.0333 h + 0.0417 h} = {5.75 km}/{0.075 h} = 76.7 km/h' },
              T('It is not the mean of the two speeds, (60 + 90)/2 = 75 km/h: the car spends more time at the slower speed. Try the lab below.', 'Se ei ole nopeuksien keskiarvo (60 + 90)/2 = 75 km/h: auto viettää enemmän aikaa hitaammalla nopeudella. Kokeile alla olevaa laboratoriota.')
            ],
            result: T('v ≈ 77 km/h (the slide: ≈ 80 km/h)', 'v ≈ 77 km/h (kalvolla ≈ 80 km/h)') },
          { id: 't2-trip-lab', type: 'interactive', widget: 'custom', title: T('Trip in two parts: the real car and the "mean-speed" car', 'Matka kahdessa osassa: oikea auto ja ”keski\u00ADnopeus\u00ADauto”'),
            caption: T('Set the two distances and speeds and press Race. The ghost car drives the whole trip at the plain mean of the two speeds. It only ties with the real car when both parts take the same time; otherwise the true average speed (total distance over total time) differs from the mean of the speeds.',
              'Säädä kaksi matkaa ja nopeutta ja paina Kisa. Haamuauto ajaa koko matkan nopeuksien tavallisella keskiarvolla. Se on tasoissa oikean auton kanssa vain, jos molempiin osiin kuluu yhtä pitkä aika; muuten todellinen keskivauhti (kokonaismatka / kokonaisaika) poikkeaa nopeuksien keskiarvosta.'),
            config: dev(TRIP) },
          { type: 'question', q: 't2-q14', id: 't2-q14-blk' },
          { type: 'question', q: 't2-q15', id: 't2-q15-blk' },
          { id: 't2-uni-ex4', type: 'example', title: T('Tampere to Valkeakoski (FI slide p05)', 'Tampere–Valkeakoski (suomenkielinen kalvo s. 05)'),
            problem: T('The distance Tampere to Valkeakoski is 36 km. A car drives it at 75 km/h. a) How long does it take? b) What speed would save 5 minutes? c) What is the average speed of the round trip if the return is driven at 70 km/h?', 'Tampereelta Valkeakoskelle on 36 km. Auto ajaa matkan nopeudella 75 km/h. a) Kuinka kauan matka kestää? b) Millä nopeudella säästyisi 5 minuuttia? c) Mikä on edestakaisen matkan keskivauhti, kun paluu ajetaan nopeudella 70 km/h?'),
            given: ['s = 36 km', 'v = 75 km/h'],
            steps: [
              { tex: 't = {s}/{v} = {36 km}/{75 km/h} = 0.48 h = 28.8 min' },
              T('b) The new time is 0.48 h − 5/60 h = 0.3967 h.', 'b) Uusi aika on 0,48 h − 5/60 h = 0,3967 h.'),
              { tex: 'v = {36 km}/{0.3967 h} = 90.8 km/h' },
              T('c) Total distance 72 km, total time 36/75 + 36/70 h = 0.9943 h.', 'c) Kokonaismatka 72 km, kokonaisaika 36/75 + 36/70 h = 0,9943 h.'),
              { tex: 'v = {72 km}/{0.9943 h} = 72.4 km/h' }
            ],
            result: T('a) 28.8 min, b) ≈ 91 km/h, c) ≈ 72 km/h', 'a) 28,8 min, b) ≈ 91 km/h, c) ≈ 72 km/h') },
          { type: 'question', q: 't2-q16', id: 't2-q16-blk' }
        ] },

      // ======================================================== 2.3 constant acceleration (p05)
      { id: 't2-const', title: T('Motion at constant acceleration', 'Tasaisesti kiihtyvä liike'),
        blocks: [
          { id: 't2-const-text', type: 'text', html: T(
            '<p>In <dfn data-term="uniformacc">uniformly accelerated motion</dfn> the <dfn data-term="accel">acceleration</dfn> is constant: the speed changes by equal amounts in equal times. The unit is m/s². The acceleration is the slope of the v,t graph: <f>a = Δv/Δt = (v − v_0)/(t − t_0)</f>. A positive a with positive v speeds the body up; a negative a with positive v slows it down (<dfn data-term="decel">deceleration</dfn>).</p>',
            '<p><dfn data-term="uniformacc">Tasaisesti kiihtyvässä liikkeessä</dfn> <dfn data-term="accel">kiihtyvyys</dfn> on vakio: nopeus muuttuu yhtä paljon yhtä pitkissä ajoissa. Yksikkö on m/s². Kiihtyvyys on v,t-kuvaajan kulmakerroin: <f>a = Δv/Δt = (v − v_0)/(t − t_0)</f>. Positiivinen a ja positiivinen v kasvattavat vauhtia; negatiivinen a ja positiivinen v hidastavat (<dfn data-term="decel">hidastuva liike</dfn>).</p>') },
          { id: 't2-const-f1', type: 'formula', key: true, tex: 'v = v_0 + a t', label: T('1. Velocity', '1. Nopeus'),
            legend: [['v_0', T('initial velocity (t = 0)', 'alkunopeus (t = 0)'), 'm/s'], ['a', T('constant acceleration', 'vakiokiihtyvyys'), 'm/s²'], ['t', T('time', 'aika'), 's']] },
          { id: 't2-const-f2', type: 'formula', key: true, tex: 's = s_0 + ½ (v_0 + v) t', label: T('2. Position from the mean velocity', '2. Paikka keskinopeudesta') },
          { id: 't2-const-f3', type: 'formula', key: true, tex: 's = s_0 + v_0 t + ½ a t^2', label: T('3. Position', '3. Paikka') },
          { id: 't2-const-f4', type: 'formula', key: true, tex: 'v^2 = v_0^2 + 2 a (s − s_0)', label: T('4. Velocity without time', '4. Nopeus ilman aikaa') },
          { id: 't2-const-tab', type: 'table', caption: T('Each formula misses one of the five quantities s − s₀, v₀, v, a, t: that is how you choose.', 'Jokaisesta kaavasta puuttuu yksi viidestä suureesta s − s₀, v₀, v, a, t: näin kaava valitaan.'),
            head: ['#', T('formula', 'kaava'), T('missing quantity', 'puuttuva suure')],
            rows: [['1', { tex: 'v = v_0 + a t' }, { tex: 's' }], ['2', { tex: 's = s_0 + ½ (v_0 + v) t' }, { tex: 'a' }],
                   ['3', { tex: 's = s_0 + v_0 t + ½ a t^2' }, { tex: 'v' }], ['4', { tex: 'v^2 = v_0^2 + 2 a (s − s_0)' }, { tex: 't' }]] },
          { id: 't2-const-key', type: 'callout', kind: 'key', title: T('From rest and the mean velocity', 'Levosta ja keskinopeus'), html: T(
            'Starting from rest at the origin (<f>v_0 = 0</f>, <f>s_0 = 0</f>) formula 3 becomes <f>s = ½ a t^2</f>. For <b>constant</b> acceleration the average velocity is <f>v_k = Δs/Δt = (v_0 + v)/2</f>. The slide shows both on the t,v panel; the second one is <b>only</b> valid when a is constant.',
            'Levosta origosta lähdettäessä (<f>v_0 = 0</f>, <f>s_0 = 0</f>) kaavasta 3 tulee <f>s = ½ a t^2</f>. <b>Vakio</b>kiihtyvyydellä keskinopeus on <f>v_k = Δs/Δt = (v_0 + v)/2</f>. Kalvolla molemmat on esitetty t,v-kuvassa; jälkimmäinen pätee <b>vain</b> vakiokiihtyvyydellä.') },
          { id: 't2-motion-lab', type: 'interactive', widget: 'motion', title: T('Motion lab: cart, s,t, v,t and a,t', 'Liike\u00ADlaboratorio: vaunu, s,t, v,t ja a,t'),
            caption: T('Set the start position s₀, the start velocity v₀ and the acceleration a, then press Run: the cart drives along the track and the three graphs draw themselves. The a,t graph is a horizontal line, the v,t graph a sloped line (slope a) and the s,t graph a parabola (its slope is v: see the tangent). The marks on the track are the strobe positions at equal time steps; the shaded area under v,t is the displacement. Try v₀ and a with opposite signs.',
              'Säädä alkupaikka s₀, alkunopeus v₀ ja kiihtyvyys a ja paina Aja: vaunu ajaa radalla ja kolme kuvaajaa piirtyy. a,t-kuvaaja on vaakasuora, v,t-kuvaaja kalteva suora (kulmakerroin a) ja s,t-kuvaaja paraabeli (sen kulmakerroin on v: katso tangentti). Radan merkit ovat vaunun paikat yhtä pitkin aikavälein; v,t-kuvaajan alle jäävä ala on siirtymä. Kokeile vastakkaismerkkisiä v₀ ja a.'),
            config: { T: 10, values: { s0: 0, v0: -2, a: 1 }, fixed: ['s0'], tools: ['tangent', 'area', 'strobe'], ranges: { v0: { min: -6, max: 6, step: 0.5 }, a: { min: -2, max: 2, step: 0.1 } } } },
          { id: 't2-area-lab', type: 'interactive', widget: 'motion', title: T('Area under v,t: rectangle plus triangle', 'v,t-kuvaajan alle jäävä ala: suorakulmio ja kolmio'),
            caption: T('The distance is the area under the v,t line. For constant acceleration it splits into the rectangle s₁ = v₀ t (blue) and the triangle s₂ = ½ a t² (green, height a t). Change v₀ and a and move the time cursor: the two areas and their sum change with the shape of the line.',
              'Matka on v,t-suoran alle jäävä ala. Vakiokiihtyvyydellä se jakautuu suorakulmioon s₁ = v₀ t (sininen) ja kolmioon s₂ = ½ a t² (vihreä, korkeus a t). Muuta v₀:aa ja a:ta ja siirrä aikakursoria: molemmat alat ja niiden summa muuttuvat suoran muodon mukana.'),
            config: { T: 10, values: { s0: 0, v0: 2, a: 1.5 }, fixed: ['s0'], graphs: ['v'], tools: ['area'], ranges: { v0: { min: 0, max: 10, step: 0.5 } } } },
          { type: 'question', q: 't2-q17', id: 't2-q17-blk' },
          { type: 'question', q: 't2-q18', id: 't2-q18-blk' },
          { type: 'question', q: 't2-q19', id: 't2-q19-blk' },
          { type: 'question', q: 't2-q20', id: 't2-q20-blk' },
          { id: 't2-const-h', type: 'h', text: T('From the area under v,t to the distance', 'v,t-kuvaajan alasta matkaan') },
          { type: 'question', q: 't2-q21', id: 't2-q21-blk' },
          { type: 'question', q: 't2-q22', id: 't2-q22-blk' },
          { id: 't2-draw-lab', type: 'interactive', widget: 'motion', title: T('Draw your own motion: reshape v(t)', 'Piirrä oma liike: muokkaa v(t):tä'),
            caption: T('Drag the knots of the v,t graph (or use their sliders). The a,t graph is the slope of v,t and the s,t graph is the running area under it. Press Run to play your motion. The trapezoid tool cuts the area into strips: more strips, better estimate.',
              'Vedä v,t-kuvaajan solmukohtia (tai käytä niiden liukusäätimiä). a,t-kuvaaja on v,t:n kulmakerroin ja s,t-kuvaaja on sen alle kertyvä ala. Paina Aja toistaaksesi liikkeesi. Puolisuunnikastyökalu jakaa alan kaistoihin: mitä enemmän kaistoja, sitä parempi arvio.'),
            config: { T: 8, knots: { of: 'v', t: [0, 2, 4, 6, 8], value: [0, 4, 4, -2, 0], min: -6, max: 6, step: 0.5 }, values: { s0: 0 }, fixed: ['s0'], tools: ['trap', 'tangent'] } },
          { type: 'question', q: 't2-q23', id: 't2-q23-blk' },
          { id: 't2-const-ex1', type: 'example', title: T('Car from 0 to 75 km/h in 12 s (FI slide p07)', 'Auto 0:sta 75 km/h:iin 12 sekunnissa (suomenkielinen kalvo s. 07)'),
            problem: T('A car accelerates from rest to 75 km/h in 12 s. Calculate the acceleration (assumed constant) and the distance travelled in that time.', 'Auto kiihtyy levosta nopeuteen 75 km/h 12 sekunnissa. Laske kiihtyvyys (oletetaan vakioksi) ja tänä aikana kuljettu matka.'),
            given: ['v_0 = 0', 'v = 75 km/h = 20.83 m/s', 't = 12 s'],
            steps: [
              T('Convert first: 75 km/h = 75/3.6 m/s = 20.83 m/s.', 'Muunna ensin: 75 km/h = 75/3,6 m/s = 20,83 m/s.'),
              { tex: 'a = {v − v_0}/{t} = {20.83 m/s}/{12 s} = 1.736 m/s^2' },
              { tex: 's = ½ a t^2 = ½ · 1.736 m/s^2 · (12 s)^2 = 125 m' },
              T('Check with formula 2: ½ (0 + 20.83 m/s) · 12 s = 125 m.', 'Tarkistus kaavalla 2: ½ (0 + 20,83 m/s) · 12 s = 125 m.')
            ],
            result: T('a ≈ 1.7 m/s², s = 125 m', 'a ≈ 1,7 m/s², s = 125 m') },
          { type: 'question', q: 't2-q24', id: 't2-q24-blk' },
          { type: 'question', q: 't2-q25', id: 't2-q25-blk' }
        ] },

      // ======================================================== 2.4 free fall and the crash (p05 text, FI p07)
      { id: 't2-free', title: T('Free fall and stopping distance', 'Vapaa pudotus ja pysähtymis\u00ADmatka'),
        blocks: [
          { id: 't2-free-text', type: 'text', html: T(
            '<p><dfn data-term="freefall">Free fall</dfn> due to gravity is uniformly accelerated rectilinear motion if the <dfn data-term="airres">air resistance</dfn> is neglected, with <f>a = g = 9.81 m/s^2</f> downward (the slides round to 9.8). Starting from rest: <f>s = ½ g t^2</f> and <f>v = g t</f>. A negative acceleration is a <b>deceleration</b>: a car stopping in the distance s has <f>a = (0 − v_0^2)/(2\\s)</f>, which is formula 4.</p>',
            '<p><dfn data-term="freefall">Vapaa pudotus</dfn> painovoiman vaikutuksesta on tasaisesti kiihtyvää suoraviivaista liikettä, kun <dfn data-term="airres">ilmanvastus</dfn> jätetään huomiotta; <f>a = g = 9,81 m/s^2</f> alaspäin (kalvoilla pyöristetty 9,8:aan). Levosta lähdettäessä: <f>s = ½ g t^2</f> ja <f>v = g t</f>. Negatiivinen kiihtyvyys on <b>hidastuvuus</b>: matkalla s pysähtyvän auton kiihtyvyys on <f>a = (0 − v_0^2)/(2\\s)</f>, mikä on kaava 4.</p>') },
          { id: 't2-drop-lab', type: 'interactive', widget: 'custom', title: T('Dropped stone: v = g t and the area under it', 'Pudotettu kivi: v = g t ja sen alle jäävä ala'),
            caption: T('Set the height of the cliff and press Drop. The stone falls with the constant acceleration g, so the v,t graph is a straight line; the shaded area under it is the distance fallen, ½ g t². The strobe ticks are 0.5 s apart: the gaps grow because the speed grows.',
              'Säädä kallion korkeus ja paina Pudota. Kivi putoaa vakiokiihtyvyydellä g, joten v,t-kuvaaja on suora; sen alle jäävä ala on pudotusmatka ½ g t². Vilkkumerkit ovat 0,5 s:n välein: välit kasvavat, koska nopeus kasvaa.'),
            config: dev(DROP) },
          { id: 't2-free-ex1', type: 'example', title: T('Stone from a cliff (FI slide p07)', 'Kivi kalliolta (suomenkielinen kalvo s. 07)'),
            problem: T('A stone is dropped from the edge of a cliff and hits the ground after 2.2 s. How high is the cliff?', 'Kivi pudotetaan kallion reunalta, ja se osuu maahan 2,2 s:n kuluttua. Kuinka korkea kallio on?'),
            given: ['v_0 = 0', 't = 2.2 s', 'g = 9.81 m/s²'],
            steps: [{ tex: 's = ½ g t^2 = ½ · 9.81 m/s^2 · (2.2 s)^2 = 23.7 m' }, T('The slide uses g = 9.8 and gets 23.7 ≈ 24 m too (23.72 m).', 'Kalvolla g = 9,8 ja tulos on sama 23,7 ≈ 24 m (23,72 m).')],
            result: T('h ≈ 24 m', 'h ≈ 24 m') },
          { id: 't2-crash-lab', type: 'interactive', widget: 'custom', title: T('Crash into a wall: crumple zone and airbag', 'Törmäys seinään: rusutusvyöhyke ja ilmatyyny'),
            caption: T('Set the speed, the crumple zone of the car and the distance the driver travels into the airbag, then press Crash. The car stops in the total distance s = s_c + s_b with the constant deceleration <f>a = v_0^2/(2\\s)</f>. Double the stopping distance and the deceleration halves; double the speed and it quadruples.',
              'Säädä nopeus, auton rusutusvyöhyke ja matka, jonka kuljettaja kulkee ilmatyynyyn, ja paina Törmäys. Auto pysähtyy kokonaismatkalla s = s_c + s_b vakiohidastuvuudella <f>a = v_0^2/(2\\s)</f>. Kaksinkertainen pysähtymismatka puolittaa hidastuvuuden; kaksinkertainen nopeus nelinkertaistaa sen.'),
            config: dev(CRASH) },
          { id: 't2-free-ex2', type: 'example', title: T('Crash at 45 km/h (FI slide p07)', 'Törmäys nopeudella 45 km/h (suomenkielinen kalvo s. 07)'),
            problem: T('A car hits a wall at 45 km/h. The nose of the car crumples 0.35 m and the driver moves 0.15 m into the airbag. What is the acceleration of the driver?', 'Auto törmää seinään nopeudella 45 km/h. Auton keula rusuuntuu 0,35 m ja kuljettaja liikkuu 0,15 m ilmatyynyyn. Mikä on kuljettajan kiihtyvyys?'),
            given: ['v_0 = 45 km/h = 12.5 m/s', 'v = 0', 's = 0.35 m + 0.15 m = 0.50 m'],
            steps: [
              T('No time is given, so use formula 4.', 'Aikaa ei ole annettu, joten käytä kaavaa 4.'),
              { tex: 'a = {v^2 − v_0^2}/{2\\s} = {0 − (12.5 m/s)^2}/{2 · 0.50 m} = −156 m/s^2' },
              T('The minus sign means the acceleration points against the motion. The slide prints the size, 160 m/s²; that is about 16 g.', 'Miinusmerkki tarkoittaa, että kiihtyvyys on liikettä vastaan. Kalvolla on suuruus 160 m/s²; se on noin 16 g.')
            ],
            result: T('a ≈ −156 m/s² (size ≈ 160 m/s²)', 'a ≈ −156 m/s² (suuruus ≈ 160 m/s²)') },
          { type: 'question', q: 't2-q26', id: 't2-q26-blk' },
          { type: 'question', q: 't2-q27', id: 't2-q27-blk' },
          { type: 'question', q: 't2-q28', id: 't2-q28-blk' }
        ] },

      // ======================================================== 2.5 variable acceleration (p06)
      { id: 't2-var', title: T('Variable acceleration: slopes and areas', 'Muuttuva kiihtyvyys: kulma\u00ADkertoimet ja pinta-alat'),
        blocks: [
          { id: 't2-var-text', type: 'text', html: T(
            '<p>When the acceleration is not constant the four formulas no longer apply, and we need <b>instantaneous</b> values. The <dfn data-term="instvel">instantaneous velocity</dfn> at the time t is the slope of the <dfn data-term="tangent">tangent</dfn> of the s(t) curve. The average velocity over Δt is the slope of the <b>secant</b> through two points of the curve. As Δt → 0 the secant becomes the tangent.</p>',
            '<p>Kun kiihtyvyys ei ole vakio, neljä kaavaa eivät enää päde ja tarvitaan <b>hetkellisiä</b> arvoja. <dfn data-term="instvel">Hetkellinen nopeus</dfn> hetkellä t on s(t)-käyrän <dfn data-term="tangent">tangentin</dfn> kulmakerroin. Keskinopeus aikavälillä Δt on käyrän kahden pisteen kautta kulkevan <b>sekantin</b> kulmakerroin. Kun Δt → 0, sekantista tulee tangentti.</p>') },
          { id: 't2-secant-lab', type: 'interactive', widget: 'motion', title: T('Secant to tangent: shrink Δt', 'Sekantista tangentiksi: pienennä Δt:tä'),
            caption: T('The s,t curve is S-shaped (the body speeds up, then slows down). Move the time cursor, set Δt and look at the secant through the points t and t + Δt. Press "Shrink Δt": the secant turns into the tangent and its slope v_k = Δs/Δt approaches the instantaneous velocity (the slope of the tangent, drawn on the v,t graph below).',
              's,t-käyrä on S:n muotoinen (kappale kiihtyy ja sitten hidastaa). Siirrä aikakursoria, säädä Δt ja katso pisteiden t ja t + Δt kautta kulkevaa sekanttia. Paina "Pienennä Δt": sekantista tulee tangentti ja sen kulmakerroin v_k = Δs/Δt lähestyy hetkellistä nopeutta (tangentin kulmakerroin, piirretty alla olevaan v,t-kuvaajaan).'),
            config: { T: 10, t: 3, fn: { of: 's', f: SSHAPE }, graphs: ['s', 'v'], tools: ['secant', 'tangent'], ranges: { dt: { min: 0.1, max: 5, step: 0.1 } } } },
          { id: 't2-var-f1', type: 'formula', key: true, tex: 'v = {ds}/{dt},  a = {dv}/{dt} = {d^2 s}/{dt^2}', label: T('Instantaneous velocity and acceleration (derivatives)', 'Hetkellinen nopeus ja kiihtyvyys (derivaatat)'),
            legend: [['v', T('slope of the tangent of s(t)', 's(t):n tangentin kulmakerroin'), 'm/s'], ['a', T('slope of the tangent of v(t)', 'v(t):n tangentin kulmakerroin'), 'm/s²']] },
          { id: 't2-var-text2', type: 'text', html: T(
            '<p>The same works one level up: the instantaneous <dfn data-term="instacc">acceleration</dfn> is the slope of the tangent T drawn to the v(t) curve, <f>a = Δv/Δt = (v − v_0)/(t − t_0)</f> for a small step. In reverse, the distance is the <dfn data-term="area">area under v(t)</dfn>, which can be computed, for example, with the <dfn data-term="trapezoid">trapezoidal method</dfn>: cut the time into strips and add <f>½ (v_1 + v_2) Δt</f> for each of them. In the language of calculus this is the <dfn data-term="integral">integral</dfn>.</p>',
            '<p>Sama toimii yhtä tasoa ylempänä: hetkellinen <dfn data-term="instacc">kiihtyvyys</dfn> on v(t)-käyrälle piirretyn tangentin T kulmakerroin, pienellä askeleella <f>a = Δv/Δt = (v − v_0)/(t − t_0)</f>. Toisinpäin matka on <dfn data-term="area">v(t):n alle jäävä pinta-ala</dfn>, joka voidaan laskea esimerkiksi <dfn data-term="trapezoid">puolisuunnikasmenetelmällä</dfn>: jaa aika kaistoihin ja laske yhteen <f>½ (v_1 + v_2) Δt</f> jokaiselta. Differentiaali- ja integraalilaskennan kielellä tämä on <dfn data-term="integral">integraali</dfn>.</p>') },
          { id: 't2-var-f2', type: 'formula', key: true, tex: 's(t) = ∫ v dt ≈ Σ ½ (v_1 + v_2) Δt', label: T('Displacement as the area under v(t)', 'Siirtymä v(t):n alle jäävänä alana'),
            legend: [['∫ v dt', T('area under the v,t curve', 'v,t-käyrän alle jäävä ala'), 'm'], ['Δv', T('area under a,t = change of velocity', 'a,t-kuvaajan ala = nopeuden muutos'), 'm/s']] },
          { id: 't2-var-key', type: 'callout', kind: 'key', title: T('The graph dictionary', 'Kuvaajien sanakirja'), html: T(
            '<ul><li>slope of s,t = velocity v</li><li>slope of v,t = acceleration a</li><li>area under v,t = displacement</li><li>area under a,t = change of velocity</li></ul>',
            '<ul><li>s,t-kuvaajan kulmakerroin = nopeus v</li><li>v,t-kuvaajan kulmakerroin = kiihtyvyys a</li><li>v,t-kuvaajan alla oleva ala = siirtymä</li><li>a,t-kuvaajan alla oleva ala = nopeuden muutos</li></ul>') },
          { type: 'question', q: 't2-q29', id: 't2-q29-blk' },
          // ---- graph-reading practice: exercises A2, A3, A4, 2.15
          { id: 't2-read-h', type: 'h', text: T('Reading graphs: exercises A2, A3, A4 and 2.15', 'Kuvaajien lukeminen: tehtävät A2, A3, A4 ja 2.15') },
          { id: 't2-read-intro', type: 'text', html: T(
            '<p>The exercise graphs are drawn below as widgets with a time cursor (drag on the graph or use the arrow keys) and a tangent line. The widgets show only the time and the value of the graph itself, never a slope or an area: reading these is your job. Graph readings are estimates, so the answers are accepted within a few per cent.</p>',
            '<p>Tehtävien kuvaajat on piirretty alle komponentteina, joissa on aikakursori (vedä kuvaajalla tai käytä nuolinäppäimiä) ja tangenttisuora. Komponentit näyttävät vain ajan ja kuvaajan oman arvon, eivät koskaan kulmakerrointa tai alaa: niiden lukeminen on sinun tehtäväsi. Kuvaajasta luetut arvot ovat arvioita, joten vastaukset hyväksytään muutaman prosentin tarkkuudella.</p>') },
          { id: 't2-a2-w', type: 'interactive', widget: 'motion', title: T('Exercise A2: the t,x graph', 'Tehtävä A2: t,x-kuvaaja'),
            caption: T('Position x against time. Use the cursor to read x at the times you need and the tangent (it follows the cursor) to judge the slope.', 'Paikka ajan funktiona. Lue x tarvitsemillasi hetkillä kursorin avulla ja arvioi kulmakerrointa tangentin avulla (se seuraa kursoria).'),
            config: { T: 6, sym: { s: 'x' }, fn: { of: 's', f: A2F }, graphs: ['s'], tools: ['tangent'], axes: { s: [0, 14] }, readouts: readOnly('s', 'x', 'm') } },
          { type: 'question', q: 't2-q30', id: 't2-q30-blk' },
          { type: 'question', q: 't2-q31', id: 't2-q31-blk' },
          { type: 'question', q: 't2-q38', id: 't2-q38-blk' },
          { type: 'question', q: 't2-q32', id: 't2-q32-blk' },
          { id: 't2-a3-w', type: 'interactive', widget: 'motion', title: T('Exercise A3: the t,v graph', 'Tehtävä A3: t,v-kuvaaja'),
            caption: T('Velocity against time. The shaded area (area tool) fills from 0 to the cursor, but its value is not shown: estimate it from the grid squares or with trapezoids.', 'Nopeus ajan funktiona. Varjostettu ala (aluetyökalu) täyttyy nollasta kursoriin, mutta sen arvoa ei näytetä: arvioi se ruuduista tai puolisuunnikkailla.'),
            config: { T: 5, values: { s0: 0 }, fixed: ['s0'], fn: { of: 'v', f: A3F }, graphs: ['v'], tools: ['tangent', 'area'], axes: { v: [0, 8] }, readouts: readOnly('v', 'v', 'm/s') } },
          { type: 'question', q: 't2-q33', id: 't2-q33-blk' },
          { id: 't2-a4-w', type: 'interactive', widget: 'motion', title: T('Exercise A4: the t,a graph', 'Tehtävä A4: t,a-kuvaaja'),
            caption: T('Acceleration against time. The area under the a,t curve (area tool) is the change of velocity. The widget does not print it.', 'Kiihtyvyys ajan funktiona. a,t-käyrän alle jäävä ala (aluetyökalu) on nopeuden muutos. Komponentti ei tulosta sitä.'),
            config: { T: 5, values: { s0: 0, v0: 0 }, fixed: ['s0', 'v0'], fn: { of: 'a', f: A4F }, graphs: ['a'], tools: ['area'], axes: { a: [0, 2.5] }, readouts: readOnly('a', 'a', 'm/s²') } },
          { type: 'question', q: 't2-q34', id: 't2-q34-blk' },
          { type: 'question', q: 't2-q35', id: 't2-q35-blk' },
          { id: 't2-215-w', type: 'interactive', widget: 'motion', title: T('Exercise 2.15: the speed curve of a car', 'Tehtävä 2.15: auton nopeuskäyrä'),
            caption: T('Velocity of a car against time. The slide has the speed in km/h; the widget draws the same curve in m/s (the scale reaches about 34 m/s, which is 120 km/h; 1 km/h = 0.2778 m/s).', 'Auton nopeus ajan funktiona. Kalvolla nopeus on yksikössä km/h; komponentti piirtää saman käyrän yksikössä m/s (asteikko yltää noin 34 m/s:iin eli 120 km/h:iin; 1 km/h = 0,2778 m/s).'),
            config: { T: 16, values: { s0: 0 }, fixed: ['s0'], fn: { of: 'v', f: F215 }, graphs: ['v'], tools: ['tangent'], axes: { v: [0, 35] }, readouts: readOnly('v', 'v', 'm/s') } },
          { type: 'question', q: 't2-q36', id: 't2-q36-blk' },
          { type: 'question', q: 't2-q37', id: 't2-q37-blk' }
        ] }
    ],
    questions: [
      // ================= 2.1 frame, displacement
      { id: 't2-q1', mode: 'practice', type: 'mc', difficulty: 1,
        prompt: T('A person walks 60 m east and then 90 m west. Which pair gives the displacement and the distance travelled?', 'Henkilö kävelee 60 m itään ja sitten 90 m länteen. Mikä pari antaa siirtymän ja kuljetun matkan?'),
        options: [{ id: 'a', html: T('displacement 150 m east, distance 30 m', 'siirtymä 150 m itään, matka 30 m') }, { id: 'b', html: T('displacement 30 m west, distance 150 m', 'siirtymä 30 m länteen, matka 150 m') },
                  { id: 'c', html: T('displacement 30 m east, distance 150 m', 'siirtymä 30 m itään, matka 150 m') }, { id: 'd', html: T('displacement 150 m west, distance 150 m', 'siirtymä 150 m länteen, matka 150 m') }],
        hints: [T('The displacement only depends on where you start and where you end. The distance counts every metre walked.', 'Siirtymä riippuu vain lähtö- ja päätepisteestä. Matka laskee jokaisen kävellyn metrin.'),
                T('Put east = + and find the final position on the axis.', 'Aseta itä = + ja etsi loppupaikka akselilta.')] },
      { id: 't2-q2', mode: 'practice', type: 'numeric', difficulty: 1,
        prompt: T('A train moves at 72 km/h to the right. A passenger walks along the train at 6 km/h relative to the train. Give the passenger’s velocity for an observer on the ground (right is positive) a) when walking toward the front, b) when walking toward the back.',
          'Juna kulkee 72 km/h oikealle. Matkustaja kävelee junan suunnassa nopeudella 6 km/h junan suhteen. Anna matkustajan nopeus maassa olevalle havaitsijalle (oikea on positiivinen) a) kun hän kävelee junan etuosaa kohti, b) kun hän kävelee junan takaosaa kohti.'),
        fields: [{ id: 'a', tex: 'v_a', unit: 'km/h' }, { id: 'b', tex: 'v_b', unit: 'km/h' }],
        hints: [T('The ground observer sees the train’s velocity plus the walker’s velocity relative to the train.', 'Maassa oleva havaitsija näkee junan nopeuden lisättynä kävelijän nopeudella junan suhteen.'),
                T('Walking toward the back means a negative velocity relative to the train.', 'Taaksepäin kävely tarkoittaa negatiivista nopeutta junan suhteen.')] },
      { id: 't2-q3', mode: 'graded', type: 'numeric', difficulty: 2,
        prompt: T('A cyclist is at the position x₁ = +50 m on a straight road and rides straight to the position x₂ = −20 m. Calculate the displacement (with its sign) and the distance travelled.',
          'Pyöräilijä on suoralla tiellä paikassa x₁ = +50 m ja ajaa suoraan paikkaan x₂ = −20 m. Laske siirtymä (etumerkkeineen) ja kuljettu matka.'),
        fields: [{ id: 'dx', tex: 'Δx', unit: 'm' }, { id: 'd', tex: 'd', unit: 'm' }],
        hints: [T('Δx = x₂ − x₁: the sign tells the direction.', 'Δx = x₂ − x₁: etumerkki kertoo suunnan.'), T('The distance is the length of the path, always positive.', 'Matka on reitin pituus, aina positiivinen.')] },

      // ================= 2.2 uniform motion
      { id: 't2-q4', mode: 'practice', type: 'fill', difficulty: 1,
        prompt: T('Fill in the unit conversions.', 'Täydennä yksikönmuunnokset.'),
        text: T('1 m/s = [[a]] km/h, and so 36 km/h = [[b]] m/s.', '1 m/s = [[a]] km/h, ja siten 36 km/h = [[b]] m/s.'),
        fields: [{ id: 'a', kind: 'num' }, { id: 'b', kind: 'num' }],
        hints: [T('A body at 1 m/s travels 3600 m in one hour (3600 s): how many km is that?', 'Kappale nopeudella 1 m/s kulkee tunnissa (3600 s) 3600 m: montako kilometriä se on?'), T('To go from km/h to m/s divide by the same number.', 'Muunnos km/h:sta m/s:iin tehdään jakamalla samalla luvulla.')] },
      { id: 't2-q5', mode: 'practice', type: 'mc', difficulty: 1,
        prompt: T('In an s,t graph (position against time) the curve is a horizontal line. What does that tell you?', 's,t-kuvaajassa (paikka ajan funktiona) käyrä on vaakasuora. Mitä se kertoo?'),
        options: [{ id: 'a', html: T('The body moves at constant speed.', 'Kappale liikkuu vakionopeudella.') }, { id: 'b', html: T('The body moves with constant acceleration.', 'Kappale liikkuu vakiokiihtyvyydellä.') },
                  { id: 'c', html: T('The body is at rest.', 'Kappale on levossa.') }, { id: 'd', html: T('The body moves back and forth.', 'Kappale liikkuu edestakaisin.') }],
        hints: [T('The slope of the s,t graph is the velocity.', 's,t-kuvaajan kulmakerroin on nopeus.'), T('What is the slope of a horizontal line?', 'Mikä on vaakasuoran suoran kulmakerroin?')] },
      { id: 't2-q6', mode: 'graded', type: 'numeric', difficulty: 1,
        prompt: T('A car drives in a straight line from the position 0 km to the position 24 km in 0.75 h. Calculate its average velocity.', 'Auto ajaa suoraan paikasta 0 km paikkaan 24 km ajassa 0,75 h. Laske sen keskinopeus.'),
        fields: [{ id: 'v', tex: 'v_k', unit: 'km/h' }],
        hints: [T('Average velocity = displacement divided by the time taken.', 'Keskinopeus = siirtymä jaettuna kuluneella ajalla.')] },
      { id: 't2-q7', mode: 'practice', type: 'mc', difficulty: 2,
        prompt: T('A car drives 12 km out along a straight road and then 4 km back, in a total time of 0.40 h. Which statement is right?', 'Auto ajaa suoraa tietä 12 km menosuuntaan ja sitten 4 km takaisin, yhteensä ajassa 0,40 h. Mikä väite on oikein?'),
        options: [{ id: 'a', html: T('average velocity 40 km/h, average speed 20 km/h', 'keskinopeus 40 km/h, keskivauhti 20 km/h') }, { id: 'b', html: T('average velocity and average speed are both 40 km/h', 'keskinopeus ja keskivauhti ovat molemmat 40 km/h') },
                  { id: 'c', html: T('average velocity and average speed are both 20 km/h', 'keskinopeus ja keskivauhti ovat molemmat 20 km/h') }, { id: 'd', html: T('average velocity 20 km/h, average speed 40 km/h', 'keskinopeus 20 km/h, keskivauhti 40 km/h') }],
        hints: [T('Velocity uses the displacement, speed uses the distance travelled.', 'Nopeus käyttää siirtymää, vauhti kuljettua matkaa.'), T('Work out both numbers: how far from the start is the car, and how many km has it driven?', 'Laske molemmat: kuinka kaukana lähdöstä auto on ja montako km se on ajanut?')] },
      { id: 't2-q8', mode: 'graded', type: 'numeric', difficulty: 1,
        prompt: T('An aircraft receives the reflection of the radar pulse it emitted 0.10 ms after the transmission. How far is the object from the aircraft? Use c = 3.00·10⁸ m/s. (Exercise A1)', 'Lentokone vastaanottaa lähettämänsä tutkapulssin heijastuksen 0,10 ms lähetyksen jälkeen. Kuinka kaukana kohde on koneesta? Käytä c = 3,00·10⁸ m/s. (Tehtävä A1)'),
        fields: [{ id: 'd', tex: 'd', unit: 'km' }],
        hints: [T('Convert 0.10 ms to seconds first.', 'Muunna ensin 0,10 ms sekunneiksi.'), T('The pulse goes to the object and comes back: it travels twice the distance.', 'Pulssi kulkee kohteelle ja takaisin: se kulkee kaksinkertaisen matkan.')] },
      { id: 't2-q9', mode: 'graded', type: 'numeric', difficulty: 1,
        prompt: T('The velocity of an air rifle bullet was measured with two photocells. The bullet travelled a distance of 0.15 m in a time of 0.94 ms. What was its average velocity? (Exercise 2.1)', 'Ilmakiväärin luodin nopeutta mitattiin kahden valokennon avulla. Luoti kulki 0,15 m pituisen matkan ajassa 0,94 ms. Kuinka suuri oli luodin keskinopeus? (Tehtävä 2.1)'),
        fields: [{ id: 'v', tex: 'v_k', unit: 'm/s' }],
        hints: [T('0.94 ms = 0.94·10⁻³ s.', '0,94 ms = 0,94·10⁻³ s.'), T('v_k = Δs/Δt.', 'v_k = Δs/Δt.')] },
      { id: 't2-q10', mode: 'practice', type: 'numeric', difficulty: 1, tol: 0.03,
        prompt: T('The average speed of a car was 75 km/h. How far did it travel in a) 3 hours and b) 20 minutes? (Exercise 2.2)', 'Auton keskinopeus oli 75 km/h. Kuinka pitkän matkan se kulki a) 3 tunnissa ja b) 20 minuutissa? (Tehtävä 2.2)'),
        fields: [{ id: 'a', tex: 's_a', unit: 'km' }, { id: 'b', tex: 's_b', unit: 'km' }],
        hints: [T('s = v t. The time must be in hours when the speed is in km/h.', 's = v t. Ajan on oltava tunteina, kun nopeus on km/h.'), T('20 min is a third of an hour.', '20 min on kolmasosa tunnista.')] },
      { id: 't2-q11', mode: 'practice', type: 'numeric', difficulty: 1,
        prompt: T('The average speed of a moped was 12 m/s. How long did it take to travel 3.0 km? Give the time in minutes. (Exercise 2.3)', 'Mopon keskinopeus oli 12 m/s. Kuinka kauan kului 3,0 km:n matkaan? Anna aika minuutteina. (Tehtävä 2.3)'),
        fields: [{ id: 't', tex: 't', unit: 'min' }],
        hints: [T('t = s/v with s in metres and v in m/s gives seconds.', 't = s/v antaa sekunteja, kun s on metreinä ja v yksikössä m/s.'), T('Then divide by 60.', 'Jaa sitten 60:llä.')] },
      { id: 't2-q12', mode: 'graded', type: 'numeric', difficulty: 2,
        prompt: T('The average velocity of one motorist on the motorway was exactly 90 km/h and that of another exactly 100 km/h. How much time did the faster driver save compared to the slower one over a) 1 km and b) 15 km? Give the answers in seconds. (Exercise 2.5)',
          'Autoilijan keskinopeus moottoritiellä oli tasan 90 km/h. Toisen autoilijan keskinopeus oli tasan 100 km/h. Kuinka paljon nopeampi autoilija säästi aikaa hitaampaan verrattuna a) 1 km:n ja b) 15 km:n matkalla? Anna vastaukset sekunteina. (Tehtävä 2.5)'),
        fields: [{ id: 'a', tex: 'Δt_a', unit: 's' }, { id: 'b', tex: 'Δt_b', unit: 's' }],
        hints: [T('Find the time of each driver, t = s/v, and subtract.', 'Laske kummankin aika, t = s/v, ja vähennä.'), T('Keep the times in hours until the end, then multiply by 3600 s/h.', 'Pidä ajat tunteina loppuun asti ja kerro sitten 3600 s/h.')] },
      { id: 't2-q13', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('A cyclist rides 40.0 km in 55 minutes at an even pace. Calculate the average speed a) in km/h and b) in m/s.', 'Pyöräilijä ajaa 40,0 km ajassa 55 minuuttia tasaisesti. Laske keskivauhti a) yksikössä km/h ja b) yksikössä m/s.'),
        fields: [{ id: 'a', tex: 'v_a', unit: 'km/h' }, { id: 'b', tex: 'v_b', unit: 'm/s' }],
        hints: [T('Write 55 min as hours (÷ 60).', 'Kirjoita 55 min tunteina (÷ 60).'), T('For b) divide the km/h value by 3.6.', 'Kohdassa b) jaa km/h-arvo 3,6:lla.')] },
      { id: 't2-q14', mode: 'graded', type: 'numeric', difficulty: 3,
        prompt: T('A car drives 6.0 km at 40 km/h and then 4.0 km at 80 km/h. What is its average speed for the whole 10 km?', 'Auto ajaa 6,0 km nopeudella 40 km/h ja sitten 4,0 km nopeudella 80 km/h. Mikä on sen keskivauhti koko 10 km:n matkalla?'),
        fields: [{ id: 'v', tex: 'v', unit: 'km/h' }],
        hints: [T('Average speed = total distance / total time.', 'Keskivauhti = kokonaismatka / kokonaisaika.'), T('Find the time of each part with t = s/v and add them.', 'Laske kummankin osan aika kaavalla t = s/v ja laske ne yhteen.'), T('Do not average the two speeds.', 'Älä ota nopeuksien keskiarvoa.')] },
      { id: 't2-q15', mode: 'practice', type: 'mc', difficulty: 2,
        prompt: T('A car drives the first half of the <b>distance</b> at 60 km/h and the second half at 90 km/h. Its average speed for the whole trip is…', 'Auto ajaa <b>matkan</b> ensimmäisen puolikkaan nopeudella 60 km/h ja toisen puolikkaan nopeudella 90 km/h. Sen keskivauhti koko matkalla on…'),
        options: [{ id: 'a', html: T('exactly 75 km/h, the mean of the two speeds', 'täsmälleen 75 km/h, nopeuksien keskiarvo') }, { id: 'b', html: T('more than 75 km/h', 'yli 75 km/h') },
                  { id: 'c', html: T('less than 75 km/h', 'alle 75 km/h') }, { id: 'd', html: T('impossible to tell without the length of the trip', 'mahdoton sanoa ilman matkan pituutta') }],
        hints: [T('At which speed does the car spend more <i>time</i>?', 'Millä nopeudella auto viettää enemmän <i>aikaa</i>?'), T('Try a trip of 180 km, or the lab above.', 'Kokeile 180 km:n matkaa tai ylläolevaa laboratoriota.')] },
      { id: 't2-q16', mode: 'practice', type: 'numeric', difficulty: 3, tol: 0.02,
        prompt: T('A road of 48 km is driven at 80 km/h. a) How long does it take (minutes)? b) At what speed must you drive to arrive 6 minutes earlier? c) What is the average speed of the round trip if the return drive is made at 64 km/h?',
          '48 km:n tie ajetaan nopeudella 80 km/h. a) Kuinka kauan matka kestää (minuutteina)? b) Millä nopeudella on ajettava, jotta perille päästäisiin 6 minuuttia aikaisemmin? c) Mikä on edestakaisen matkan keskivauhti, kun paluu ajetaan nopeudella 64 km/h?'),
        fields: [{ id: 'a', tex: 't', unit: 'min' }, { id: 'b', tex: 'v_b', unit: 'km/h' }, { id: 'c', tex: 'v_c', unit: 'km/h' }],
        hints: [T('a) t = s/v, then convert hours to minutes.', 'a) t = s/v, muunna sitten tunnit minuuteiksi.'), T('b) The new time is the old time minus 6 min, then v = s/t.', 'b) Uusi aika on vanha aika miinus 6 min, sitten v = s/t.'), T('c) Total distance 96 km; add the times of both drives.', 'c) Kokonaismatka 96 km; laske molempien ajojen ajat yhteen.')] },

      // ================= 2.3 constant acceleration
      { id: 't2-q17', mode: 'graded', type: 'match', difficulty: 1,
        prompt: T('Match each reading of a graph with the quantity it gives.', 'Yhdistä kuvaajan luenta ja sen antama suure.'),
        left: [{ id: 'ss', html: T('slope of the s,t graph', 's,t-kuvaajan kulmakerroin') }, { id: 'sv', html: T('slope of the v,t graph', 'v,t-kuvaajan kulmakerroin') },
               { id: 'av', html: T('area under the v,t graph', 'v,t-kuvaajan alle jäävä ala') }, { id: 'aa', html: T('area under the a,t graph', 'a,t-kuvaajan alle jäävä ala') }],
        right: [{ id: 'v', html: T('velocity', 'nopeus') }, { id: 'a', html: T('acceleration', 'kiihtyvyys') }, { id: 's', html: T('displacement', 'siirtymä') }, { id: 'dv', html: T('change of velocity', 'nopeuden muutos') }],
        hints: [T('Check the units: m/s ÷ s, m ÷ s, m/s · s, m/s² · s.', 'Tarkista yksiköt: m/s ÷ s, m ÷ s, m/s · s, m/s² · s.')] },
      { id: 't2-q18', mode: 'practice', type: 'multi', difficulty: 1,
        prompt: T('A cart moves with constant acceleration a ≠ 0. Which statements are true? Select all.', 'Vaunu liikkuu vakiokiihtyvyydellä a ≠ 0. Mitkä väitteet ovat tosia? Valitse kaikki.'),
        options: [{ id: 'a', html: T('The a,t graph is a horizontal line.', 'a,t-kuvaaja on vaakasuora.') }, { id: 'b', html: T('The v,t graph is a straight line with the slope a.', 'v,t-kuvaaja on suora, jonka kulmakerroin on a.') },
                  { id: 'c', html: T('The s,t graph is a straight line.', 's,t-kuvaaja on suora.') }, { id: 'd', html: T('The area under the a,t graph is the displacement.', 'a,t-kuvaajan alle jäävä ala on siirtymä.') },
                  { id: 'e', html: T('The slope of the s,t graph changes steadily.', 's,t-kuvaajan kulmakerroin muuttuu tasaisesti.') }],
        hints: [T('Use the motion lab: how do the three graphs look for a = 1 m/s²?', 'Käytä liikelaboratoriota: miltä kolme kuvaajaa näyttävät, kun a = 1 m/s²?'), T('The slope of s,t is v, and v changes steadily.', 's,t-kuvaajan kulmakerroin on v, ja v muuttuu tasaisesti.')] },
      { id: 't2-q19', mode: 'practice', type: 'numeric', difficulty: 1,
        prompt: T('A cart starts from rest and accelerates at a constant 2.0 m/s² for 6.0 s. Calculate a) its speed at the end and b) the distance it has travelled.', 'Vaunu lähtee levosta ja kiihtyy vakiokiihtyvyydellä 2,0 m/s² ajan 6,0 s. Laske a) sen nopeus lopussa ja b) kuljettu matka.'),
        fields: [{ id: 'v', tex: 'v', unit: 'm/s' }, { id: 's', tex: 's', unit: 'm' }],
        hints: [T('Formula 1 gives v, formula 3 (with v₀ = 0) gives s.', 'Kaava 1 antaa v:n, kaava 3 (v₀ = 0) antaa s:n.')] },
      { id: 't2-q20', mode: 'practice', type: 'match', difficulty: 2,
        prompt: T('Which of the four formulas fits? Match each situation (what is known, what is wanted) with the formula that has exactly that one unknown.', 'Mikä neljästä kaavasta sopii? Yhdistä tilanne (mitä tiedetään, mitä halutaan) kaavaan, jossa on täsmälleen tämä yksi tuntematon.'),
        left: [{ id: 'l1', html: T('v₀, a and t known; find v', 'v₀, a ja t tunnetaan; etsi v') }, { id: 'l2', html: T('v₀, a and t known; find s', 'v₀, a ja t tunnetaan; etsi s') },
               { id: 'l3', html: T('v₀, v and t known; find s (a not needed)', 'v₀, v ja t tunnetaan; etsi s (a:ta ei tarvita)') }, { id: 'l4', html: T('v₀, v and s known; find a (no time given)', 'v₀, v ja s tunnetaan; etsi a (aikaa ei anneta)') }],
        right: [{ id: 'f1', html: '<f>v = v_0 + a t</f>' }, { id: 'f2', html: '<f>s = s_0 + ½ (v_0 + v) t</f>' }, { id: 'f3', html: '<f>s = s_0 + v_0 t + ½ a t^2</f>' }, { id: 'f4', html: '<f>v^2 = v_0^2 + 2 a (s − s_0)</f>' }],
        hints: [T('Look at the table of formulas: each formula lacks one quantity.', 'Katso kaavataulukkoa: jokaisesta kaavasta puuttuu yksi suure.'), T('Which quantity is neither given nor asked? Pick the formula without it.', 'Mikä suure ei ole annettu eikä kysytty? Valitse kaava, jossa sitä ei ole.')] },
      { id: 't2-q21', mode: 'graded', type: 'numeric', difficulty: 2, tol: 0.03,
        prompt: T('The acceleration of a body in uniformly varying rectilinear motion is 1.0 m/s², in the direction of motion. At t = 4.0 s the velocity of the body is 6.0 m/s. Calculate a) the velocity at 7.0 s and b) the distance travelled between 2.5 s and 5.0 s. (Exercise 2.17)',
          'Tasaisesti muuttuvassa suoraviivaisessa liikkeessä olevan kappaleen kiihtyvyys on 1,0 m/s² liikkeen suuntaan. Hetkellä t = 4,0 s kappaleen nopeus on 6,0 m/s. Laske a) nopeus hetkellä 7,0 s, b) kappaleen kulkema matka aikavälillä 2,5 s … 5,0 s. (Tehtävä 2.17)'),
        fields: [{ id: 'a', tex: 'v(7.0 s)', unit: 'm/s' }, { id: 'b', tex: 's', unit: 'm' }],
        hints: [T('a) The acceleration is constant: v = v₀ + a Δt from the known moment 4.0 s.', 'a) Kiihtyvyys on vakio: v = v₀ + a Δt tunnetusta hetkestä 4,0 s.'),
                T('b) Find the velocities at 2.5 s and 5.0 s (same formula).', 'b) Laske nopeudet hetkillä 2,5 s ja 5,0 s (sama kaava).'), T('Then the distance is the area of a trapezoid under v,t: ½ (v₁ + v₂) Δt.', 'Sitten matka on v,t-kuvaajan alla olevan puolisuunnikkaan ala: ½ (v₁ + v₂) Δt.')] },
      { id: 't2-q22', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('A v,t graph rises linearly from 0 to 8.0 m/s in 4.0 s, stays at 8.0 m/s for 6.0 s, and then falls linearly to 0 in 2.0 s. How far has the body travelled in the whole 12 s?', 'v,t-kuvaaja nousee lineaarisesti nollasta arvoon 8,0 m/s ajassa 4,0 s, pysyy arvossa 8,0 m/s ajan 6,0 s ja laskee sitten lineaarisesti nollaan ajassa 2,0 s. Kuinka pitkän matkan kappale on kulkenut koko 12 s:n aikana?'),
        fields: [{ id: 's', tex: 's', unit: 'm' }],
        hints: [T('The distance is the area under the v,t graph. Cut it into a triangle, a rectangle and a triangle.', 'Matka on v,t-kuvaajan alle jäävä ala. Jaa se kolmioksi, suorakulmioksi ja kolmioksi.'), T('Triangle: ½ · base · height.', 'Kolmio: ½ · kanta · korkeus.')] },
      { id: 't2-q23', mode: 'practice', type: 'slider', difficulty: 2, tol: 0.02,
        prompt: T('Reshape the v,t graph (drag the knots) so that the cart’s <b>displacement</b> over the whole 8 s run is 30 m. The widget reads the displacement of the run.', 'Muokkaa v,t-kuvaajaa (vedä solmukohtia) niin, että vaunun <b>siirtymä</b> koko 8 s:n ajolla on 30 m. Komponentti lukee ajon siirtymän.'),
        hints: [T('The displacement is the area under the v,t graph; areas below the axis count as negative.', 'Siirtymä on v,t-kuvaajan alle jäävä ala; akselin alapuoliset alat ovat negatiivisia.'), T('Use the trapezoid tool or add the strips between the knots: ½ (v₁ + v₂) · 2 s.', 'Käytä puolisuunnikastyökalua tai laske solmukohtien väliset kaistat: ½ (v₁ + v₂) · 2 s.')],
        widget: { name: 'motion', config: { T: 8, knots: { of: 'v', t: [0, 2, 4, 6, 8], value: [0, 4, 4, -2, 0], min: -6, max: 6, step: 0.5 }, values: { s0: 0 }, fixed: ['s0'], tools: ['trap'] } } },
      { id: 't2-q24', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.02,
        prompt: T('A car accelerates uniformly from rest to 80 km/h in 8.0 s. Calculate a) its acceleration and b) the distance travelled during these 8.0 s.', 'Auto kiihtyy tasaisesti levosta nopeuteen 80 km/h ajassa 8,0 s. Laske a) sen kiihtyvyys ja b) tänä aikana kuljettu matka.'),
        fields: [{ id: 'a', tex: 'a', unit: 'm/s²' }, { id: 's', tex: 's', unit: 'm' }],
        hints: [T('Convert 80 km/h to m/s first.', 'Muunna ensin 80 km/h yksikköön m/s.'), T('a = Δv/Δt. For s use formula 3 or ½ (v₀ + v) t.', 'a = Δv/Δt. Matkaan kaava 3 tai ½ (v₀ + v) t.')] },
      { id: 't2-q25', mode: 'practice', type: 'slider', difficulty: 2, tol: 0.02,
        prompt: T('A car starts from rest. Set the acceleration <i>a</i> so that it has travelled <b>150 m</b> after 12 s. The widget reads the displacement after the 12 s run.', 'Auto lähtee levosta. Säädä kiihtyvyys <i>a</i> niin, että se on kulkenut <b>150 m</b> 12 s:ssa. Komponentti lukee siirtymän 12 s:n ajon jälkeen.'),
        hints: [T('Starting from rest: s = ½ a t².', 'Levosta lähdettäessä: s = ½ a t².'), T('Solve a = 2 s / t² first, then set the slider.', 'Ratkaise ensin a = 2 s / t² ja säädä sitten liukusäädin.')],
        widget: { name: 'motion', config: { T: 12, values: { s0: 0, v0: 0, a: 1 }, fixed: ['s0', 'v0'], graphs: ['s', 'v'], tools: ['area'], ranges: { a: { min: 0, max: 5, step: 0.01 } } } } },

      // ================= 2.4 free fall
      { id: 't2-q26', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('A stone is dropped from a bridge and hits the water after 3.1 s. Neglect air resistance. How high is the bridge, and how fast is the stone going when it hits the water?', 'Kivi pudotetaan sillalta ja se osuu veteen 3,1 s:n kuluttua. Jätä ilmanvastus huomiotta. Kuinka korkealla silta on ja kuinka suurella nopeudella kivi osuu veteen?'),
        fields: [{ id: 'h', tex: 'h', unit: 'm' }, { id: 'v', tex: 'v', unit: 'm/s' }],
        hints: [T('Free fall from rest with a = g = 9.81 m/s².', 'Vapaa pudotus levosta, a = g = 9,81 m/s².'), T('s = ½ g t² and v = g t.', 's = ½ g t² ja v = g t.')] },
      { id: 't2-q27', mode: 'practice', type: 'numeric', difficulty: 3, tol: 0.02,
        prompt: T('A car hits a wall at 54 km/h. The nose crumples 0.45 m and the driver moves another 0.15 m into the airbag. Assume a constant deceleration. Calculate a) the size of the driver’s acceleration and b) the size of the acceleration as a multiple of g.', 'Auto törmää seinään nopeudella 54 km/h. Keula rusuuntuu 0,45 m ja kuljettaja liikkuu vielä 0,15 m ilmatyynyyn. Oleta hidastuvuus vakioksi. Laske a) kuljettajan kiihtyvyyden suuruus ja b) kiihtyvyyden suuruus g:n monikertana.'),
        fields: [{ id: 'a', tex: '|a|', unit: 'm/s²' }, { id: 'n', tex: '|a|/g' }],
        hints: [T('No time is given: use formula 4 with v = 0.', 'Aikaa ei ole annettu: käytä kaavaa 4, kun v = 0.'), T('The stopping distance is the crumple distance plus the airbag distance; the speed must be in m/s.', 'Pysähtymismatka on rusuuntuma plus ilmatyynymatka; nopeuden on oltava yksikössä m/s.')] },
      { id: 't2-q28', mode: 'graded', type: 'mc', difficulty: 2,
        prompt: T('You know the initial velocity, the final velocity and the stopping distance of a braking car, but not the time. Which formula do you use to find the acceleration?', 'Tiedät jarruttavan auton alkunopeuden, loppunopeuden ja pysähtymismatkan, mutta et aikaa. Mitä kaavaa käytät kiihtyvyyden laskemiseen?'),
        options: [{ id: 'a', tex: 'v = v_0 + a t' }, { id: 'b', tex: 's = s_0 + v_0 t + ½ a t^2' }, { id: 'c', tex: 's = s_0 + ½ (v_0 + v) t' }, { id: 'd', tex: 'v^2 = v_0^2 + 2 a (s − s_0)' }],
        hints: [T('Which of the four formulas does not contain t?', 'Missä neljästä kaavasta ei ole t:tä?')] },

      // ================= 2.5 variable acceleration and graph reading
      { id: 't2-q29', mode: 'practice', type: 'mc', difficulty: 1,
        prompt: T('You draw a secant through the points t and t + Δt of an s,t curve and make Δt smaller and smaller. The slope of the secant approaches…', 'Piirrät s,t-käyrän pisteiden t ja t + Δt kautta sekantin ja pienennät Δt:tä yhä pienemmäksi. Sekantin kulmakerroin lähestyy…'),
        options: [{ id: 'a', html: T('the average acceleration', 'keskikiihtyvyyttä') }, { id: 'b', html: T('the instantaneous velocity at t', 'hetkellistä nopeutta hetkellä t') },
                  { id: 'c', html: T('the distance travelled', 'kuljettua matkaa') }, { id: 'd', html: T('the average velocity of the whole run', 'koko ajon keskinopeutta') }],
        hints: [T('The slope of an s,t line is a velocity. Which velocity does the tangent give?', 's,t-suoran kulmakerroin on nopeus. Minkä nopeuden tangentti antaa?')] },
      { id: 't2-q30', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.07,
        prompt: T('Exercise A2 (graph above). Determine from the t,x graph the average velocity in the interval 1 … 4 s.', 'Tehtävä A2 (kuvaaja yllä). Määritä t,x-kuvaajasta keskinopeus aikavälillä 1 … 4 s.'),
        fields: [{ id: 'v', tex: 'v_k', unit: 'm/s' }],
        hints: [T('Read x at t = 1 s and t = 4 s with the cursor.', 'Lue x hetkillä t = 1 s ja t = 4 s kursorin avulla.'), T('v_k = Δx/Δt, the slope of the secant between the two points.', 'v_k = Δx/Δt, pisteiden välisen sekantin kulmakerroin.')] },
      { id: 't2-q31', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.07,
        prompt: T('Exercise A2 (graph above). Determine the instantaneous velocity at a) t = 1 s and b) t = 5 s (with sign).', 'Tehtävä A2 (kuvaaja yllä). Määritä hetkellinen nopeus a) hetkellä t = 1 s ja b) hetkellä t = 5 s (etumerkkeineen).'),
        fields: [{ id: 'a', tex: 'v(1 s)', unit: 'm/s' }, { id: 'b', tex: 'v(5 s)', unit: 'm/s' }],
        hints: [T('Place the cursor at the time and read the slope of the tangent: rise over run on the grid.', 'Aseta kursori hetkeen ja lue tangentin kulmakerroin ruudukosta: pystysuuntainen muutos jaettuna vaakasuuntaisella muutoksella.'), T('Is the curve rising or falling at 5 s?', 'Nouseeko vai laskeeko käyrä hetkellä 5 s?')] },
      { id: 't2-q38', mode: 'practice', type: 'mc', difficulty: 2,
        prompt: T('In exercise A2 the instantaneous velocity at t = 5 s comes out negative. What does the minus sign mean?', 'Tehtävässä A2 hetkellinen nopeus hetkellä t = 5 s on negatiivinen. Mitä miinusmerkki tarkoittaa?'),
        options: [{ id: 'a', html: T('The position x is negative.', 'Paikka x on negatiivinen.') }, { id: 'b', html: T('The body is slowing down.', 'Kappale hidastaa.') },
                  { id: 'c', html: T('The acceleration is negative.', 'Kiihtyvyys on negatiivinen.') }, { id: 'd', html: T('The body moves in the negative x direction, back toward the origin.', 'Kappale liikkuu negatiiviseen x-suuntaan, takaisin kohti origoa.') }],
        hints: [T('The sign of v is the direction of motion along the axis.', 'v:n etumerkki on liikkeen suunta akselilla.'), T('Look at what the x value does just after t = 5 s.', 'Katso, mitä x:n arvolle tapahtuu hetken 5 s jälkeen.')] },
      { id: 't2-q32', mode: 'graded', type: 'mc', difficulty: 1,
        prompt: T('Exercise A2. What is the instantaneous velocity at t = 3 s, where the x,t curve has its highest point?', 'Tehtävä A2. Mikä on hetkellinen nopeus hetkellä t = 3 s, jossa x,t-käyrällä on korkein kohta?'),
        options: [{ id: 'a', html: T('13 m/s', '13 m/s') }, { id: 'b', html: T('about 4.3 m/s, because 13 m / 3 s', 'noin 4,3 m/s, koska 13 m / 3 s') }, { id: 'c', html: T('zero', 'nolla') }, { id: 'd', html: T('about 5.9 m/s', 'noin 5,9 m/s') }],
        hints: [T('Draw the tangent at the top of the curve. What is its slope?', 'Piirrä tangentti käyrän huipussa. Mikä on sen kulmakerroin?')] },
      { id: 't2-q33', mode: 'practice', type: 'numeric', difficulty: 3, tol: 0.05,
        prompt: T('Exercise A3 (graph above). Determine from the t,v graph a) the average acceleration between 1 s and 5 s, b) the instantaneous acceleration at 2.0 s and c) the distance travelled in the first 5.0 s.', 'Tehtävä A3 (kuvaaja yllä). Määritä t,v-kuvaajasta a) keskikiihtyvyys aikavälillä 1 s … 5 s, b) hetkellinen kiihtyvyys hetkellä 2,0 s ja c) kuljettu matka ensimmäisen 5,0 s aikana.'),
        fields: [{ id: 'a', tex: 'a_k', unit: 'm/s²' }, { id: 'b', tex: 'a(2.0 s)', unit: 'm/s²' }, { id: 'c', tex: 's', unit: 'm' }],
        hints: [T('a) a_k = Δv/Δt from the readings v(1 s) and v(5 s).', 'a) a_k = Δv/Δt lukemista v(1 s) ja v(5 s).'), T('b) The slope of the tangent at 2 s: move the cursor there.', 'b) Tangentin kulmakerroin hetkellä 2 s: siirrä kursori sinne.'), T('c) The area under the curve: trapezoids with 1 s strips, ½ (v₁ + v₂) · 1 s.', 'c) Käyrän alle jäävä ala: puolisuunnikkaat 1 s:n kaistoilla, ½ (v₁ + v₂) · 1 s.')] },
      { id: 't2-q34', mode: 'practice', type: 'numeric', difficulty: 3, tol: 0.04,
        prompt: T('Exercise A4 (graph above). Determine from the t,a graph a) the velocity at 4.0 s (the body starts from rest) and b) the average velocity v_k over the time 0 … 4.0 s.', 'Tehtävä A4 (kuvaaja yllä). Määritä t,a-kuvaajasta a) nopeus hetkellä 4,0 s (kappale lähtee levosta) ja b) keskinopeus v_k aikavälillä 0 … 4,0 s.'),
        fields: [{ id: 'v', tex: 'v(4.0 s)', unit: 'm/s' }, { id: 'k', tex: 'v_k', unit: 'm/s' }],
        hints: [T('a) The area under the a,t curve from 0 to 4 s is the change of velocity: use trapezoids on the grid (the curve is steep near 0, so use thin strips there).', 'a) a,t-käyrän alle jäävä ala välillä 0 … 4 s on nopeuden muutos: käytä puolisuunnikkaita ruudukossa (käyrä on jyrkkä lähellä nollaa, joten käytä siellä kapeita kaistoja).'),
                T('b) The average velocity is displacement/time. Find the velocities at 1, 2, 3, 4 s the same way, then the area under v,t.', 'b) Keskinopeus on siirtymä/aika. Laske nopeudet hetkillä 1, 2, 3, 4 s samoin ja sitten v,t-kuvaajan ala.')] },
      { id: 't2-q35', mode: 'graded', type: 'mc', difficulty: 3,
        prompt: T('In exercise A4 a student takes the answer of a) and finds the average velocity as v_k = v(4.0 s)/2. Why does this not work here?', 'Tehtävässä A4 opiskelija ottaa kohdan a) vastauksen ja laskee keskinopeuden v_k = v(4,0 s)/2. Miksi tämä ei toimi tässä?'),
        options: [{ id: 'a', html: T('An average velocity cannot be read from an a,t graph.', 'Keskinopeutta ei voi lukea a,t-kuvaajasta.') },
                  { id: 'b', html: T('The formula v_k = (v₀ + v)/2 holds only for constant acceleration, and here the acceleration changes.', 'Kaava v_k = (v₀ + v)/2 pätee vain vakiokiihtyvyydellä, ja tässä kiihtyvyys muuttuu.') },
                  { id: 'c', html: T('Because the initial velocity v₀ is not zero.', 'Koska alkunopeus v₀ ei ole nolla.') },
                  { id: 'd', html: T('Because the unit of the a,t graph is m/s².', 'Koska a,t-kuvaajan yksikkö on m/s².') }],
        hints: [T('When is the average velocity exactly half of the final velocity? Look at the v,t graph then.', 'Milloin keskinopeus on täsmälleen puolet loppunopeudesta? Katso silloin v,t-kuvaajaa.'), T('Is the v,t graph here a straight line?', 'Onko v,t-kuvaaja tässä suora?')] },
      { id: 't2-q36', mode: 'practice', type: 'numeric', difficulty: 3, tol: 0.03,
        prompt: T('Exercise 2.15 (graph above; its scale is in m/s, 1 km/h = 0.2778 m/s). Estimate from the curve the acceleration a) in the interval 0 … 2 s and b) in the interval 9 … 14 s. Give the answers in m/s².', 'Tehtävä 2.15 (kuvaaja yllä; asteikko on yksikössä m/s, 1 km/h = 0,2778 m/s). Arvioi käyrästä kiihtyvyys a) aikavälillä 0 … 2 s ja b) aikavälillä 9 … 14 s. Anna vastaukset yksikössä m/s².'),
        fields: [{ id: 'a', tex: 'a_{0…2}', unit: 'm/s²' }, { id: 'b', tex: 'a_{9…14}', unit: 'm/s²' }],
        hints: [T('Average acceleration = Δv/Δt over the interval: read v at both ends with the cursor.', 'Keskikiihtyvyys = Δv/Δt välillä: lue v molemmista päistä kursorilla.'), T('The curve flattens out, so the second answer is much smaller than the first.', 'Käyrä loivenee, joten jälkimmäinen vastaus on paljon pienempi kuin ensimmäinen.')] },
      { id: 't2-q37', mode: 'graded', type: 'order', difficulty: 2,
        prompt: T('Put the steps in order for finding the velocity at a time t from an a,t graph when the starting velocity v₀ is known.', 'Järjestä vaiheet, joilla löydät nopeuden hetkellä t a,t-kuvaajasta, kun alkunopeus v₀ tunnetaan.'),
        items: [{ id: 'o3', html: T('Compute the area of each strip, ½ (a₁ + a₂) Δt', 'Laske kunkin kaistan ala, ½ (a₁ + a₂) Δt') }, { id: 'o5', html: T('State the result with its unit (m/s)', 'Ilmoita tulos yksikön (m/s) kanssa') },
                { id: 'o1', html: T('Divide the time from 0 to t into strips', 'Jaa aika välillä 0 … t kaistoihin') }, { id: 'o4', html: T('Add the strip areas to v₀', 'Laske kaistojen alat yhteen ja lisää v₀') },
                { id: 'o2', html: T('Read a at the edges of the strips', 'Lue a kaistojen reunoilla') }],
        hints: [T('You cannot add areas before you have computed them, nor compute them before reading the values.', 'Aloja ei voi laskea yhteen ennen kuin ne on laskettu, eikä laskea ennen kuin arvot on luettu.')] }
    ]
  });
})();

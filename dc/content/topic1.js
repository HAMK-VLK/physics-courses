/* Topic 1: Introduction to electrical engineering (charge, field, voltage, DC-circuit basics, measurements).
 * Source: EE1Introduction.pdf (errata applied: VA / var units, I_v for luminous intensity, p17 labels clarified).
 * NO answers in this file: they live in src/answers/topic1.json. Block ids are stable; never rename them.
 * Blocks marked "(extra)" are additions beyond the PDF. */
(function () {
  'use strict';
  var K = 9.0e9;            // Coulomb constant, N·m²/C² (value used in the course)
  var QE = 1.602e-19;       // elementary charge, C

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function pnum(s) { var v = parseFloat(String(s).replace(',', '.')); return isFinite(v) ? v : NaN; }

  /* ---------- Widget: SI prefix / unit converter (extra) ---------- */
  function mountPrefix(host, ctx) {
    var el = ctx.el;
    var PRE = [['T', 12], ['G', 9], ['M', 6], ['k', 3], ['', 0], ['m', -3], ['µ', -6], ['n', -9], ['p', -12]];
    var UNITS = ['V', 'A', 'Ω', 'W', 'C', 'F', 'J', 'Hz'];
    function opts(arr, f) { return arr.map(function (p) { return el('option', { value: f(p) }, p[0] || '—'); }); }
    var inp = el('input', { type: 'text', value: '4.7', inputmode: 'decimal', 'aria-label': 'value', class: 'input', style: { width: '7em' } });
    var s1 = el('select', { 'aria-label': 'from prefix', class: 'input', style: { width: 'auto' } }, opts(PRE, function (p) { return p[1]; }));
    var s2 = el('select', { 'aria-label': 'to prefix', class: 'input', style: { width: 'auto' } }, opts(PRE, function (p) { return p[1]; }));
    var su = el('select', { 'aria-label': 'unit', class: 'input', style: { width: 'auto' } }, UNITS.map(function (u) { return el('option', { value: u }, u); }));
    s1.value = '3'; s2.value = '0'; su.value = 'Ω';
    var out = el('div', { class: 'readout', style: { fontSize: '1.15em', marginTop: '.6em' } });
    var base = el('div', { class: 'muted', style: { marginTop: '.3em' } });
    var row = el('div', { style: { display: 'flex', gap: '.5em', flexWrap: 'wrap', alignItems: 'center' } },
      [inp, s1, el('span', {}, ' → '), s2, su]);
    host.append(row, out, base);
    function pre(v) { return (PRE.filter(function (p) { return p[1] === +v; })[0] || ['', 0])[0]; }
    function upd() {
      var v = pnum(inp.value), u = su.value;
      if (!isFinite(v)) { out.textContent = '—'; base.textContent = ''; return; }
      var r = v * Math.pow(10, +s1.value - +s2.value);
      out.innerHTML = '<b>' + ctx.fmtNum(v, 4) + ' ' + pre(s1.value) + u + ' = ' + ctx.fmtNum(r, 4) + ' ' + pre(s2.value) + u + '</b>';
      base.textContent = ctx.tx({ en: 'In base units: ', fi: 'Perusyksiköissä: ' }) + ctx.fmtNum(v * Math.pow(10, +s1.value), 4) + ' ' + u;
    }
    [inp, s1, s2, su].forEach(function (n) { n.addEventListener('input', upd); n.addEventListener('change', upd); });
    ctx.onLang(upd); upd();
    return {};
  }

  /* ---------- Widget: atom / ion builder ---------- */
  function mountAtom(host, ctx) {
    var el = ctx.el;
    var st = { np: 3, ne: 3, target: null };
    var NAMES = { 1: 'H', 3: 'Li', 17: 'Cl', 29: 'Cu' };
    var TARGETS = [{ np: 3, ne: 2, s: 'Li⁺' }, { np: 17, ne: 18, s: 'Cl⁻' }, { np: 29, ne: 27, s: 'Cu²⁺' }, { np: 1, ne: 0, s: 'H⁺' }];
    var ti = -1;
    var info = el('div', { class: 'readout', style: { marginTop: '.4em' } });
    var goal = el('div', { class: 'challenge', hidden: true, 'aria-live': 'polite' });
    var bar = el('div', { style: { display: 'flex', gap: '.4em', flexWrap: 'wrap', margin: '.5em 0' } });
    function btn(label, fn) { var b = el('button', { type: 'button', class: 'btn' }, label); b.addEventListener('click', function () { fn(); upd(); }); return b; }
    bar.append(
      btn('+ p', function () { st.np = Math.min(30, st.np + 1); }), btn('− p', function () { st.np = Math.max(1, st.np - 1); }),
      btn('+ e⁻', function () { st.ne = Math.min(32, st.ne + 1); }), btn('− e⁻', function () { st.ne = Math.max(0, st.ne - 1); }),
      btn('H', function () { st.np = st.ne = 1; }), btn('Li', function () { st.np = st.ne = 3; }),
      btn('Cl', function () { st.np = st.ne = 17; }), btn('Cu', function () { st.np = st.ne = 29; }),
      btn(ctx.tx({ en: 'Challenge', fi: 'Haaste' }), function () { ti = (ti + 1) % TARGETS.length; })
    );
    var cv = TDC.viz.canvas(host, { aspect: 0.5, draw: draw });
    host.append(bar, info, goal);
    function netN() { return st.np - st.ne; }
    function upd() {
      var n = netN(), name = NAMES[st.np] || ('Z=' + st.np);
      var kind = n > 0 ? ctx.tx({ en: 'positive ion (cation)', fi: 'positiivinen ioni (kationi)' }) : n < 0 ? ctx.tx({ en: 'negative ion (anion)', fi: 'negatiivinen ioni (anioni)' }) : ctx.tx({ en: 'neutral atom', fi: 'neutraali atomi' });
      info.innerHTML = '<b>' + name + '</b>: N<sub>p</sub> = ' + st.np + ', N<sub>e</sub> = ' + st.ne + ' → Q = (N<sub>p</sub> − N<sub>e</sub>)·e = ' + (n > 0 ? '+' : '') + n + ' e = ' + ctx.fmtNum(n * QE, 4) + ' C — ' + kind;
      goal.hidden = ti < 0;
      if (ti >= 0) {
        var t = TARGETS[ti], ok = st.np === t.np && st.ne === t.ne;
        goal.className = 'challenge' + (ok ? ' is-done' : '');
        goal.innerHTML = '<span class="ch-badge">🎯 ' + ctx.tx({ en: 'Challenge', fi: 'Haaste' }) + ' ' + (ti + 1) + '/' + TARGETS.length + '</span>' +
          '<div class="ch-body">' + ctx.tx({ en: 'Build the ion ', fi: 'Rakenna ioni ' }) + '<b>' + t.s + '</b></div>' +
          (ok ? '<span class="ch-state">✓ ' + ctx.tx({ en: 'Done! Press Challenge for the next one.', fi: 'Valmis! Paina Haaste saadaksesi seuraavan.' }) + '</span>' : '');
      }
      cv.redraw();
    }
    function draw(g, w, h, t) {
      g.clearRect(0, 0, w, h);
      var cx = w / 2, cy = h / 2, n = netN(), caps = [2, 8, 18, 32], left = st.ne, shells = [], i;
      for (i = 0; i < caps.length && left > 0; i++) { var k = Math.min(caps[i], left); shells.push(k); left -= k; }
      var R0 = Math.min(h * 0.18, 34), dR = Math.min((h / 2 - R0 - 10) / 4, 26);
      g.lineWidth = 1; g.strokeStyle = ctx.color('--line');
      shells.forEach(function (k, s) { g.beginPath(); g.arc(cx, cy, R0 + dR * (s + 1), 0, 7); g.stroke(); });
      g.fillStyle = n > 0 ? ctx.color('--c-2') : n < 0 ? ctx.color('--c-1') : ctx.color('--muted');
      g.globalAlpha = 0.25; g.beginPath(); g.arc(cx, cy, R0 + dR * (shells.length + 0.6), 0, 7); g.fill(); g.globalAlpha = 1;
      g.fillStyle = ctx.color('--c-2'); g.beginPath(); g.arc(cx, cy, R0, 0, 7); g.fill();
      g.fillStyle = ctx.color('--surface'); g.font = 'bold 14px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('+' + st.np, cx, cy);
      g.fillStyle = ctx.color('--c-electron');
      shells.forEach(function (k, s) {
        var r = R0 + dR * (s + 1), sp = (0.5 - 0.1 * s) * (s % 2 ? -1 : 1);
        for (var j = 0; j < k; j++) { var a = 2 * Math.PI * j / k + t * sp; g.beginPath(); g.arc(cx + r * Math.cos(a), cy + r * Math.sin(a), 3.2, 0, 7); g.fill(); }
      });
      g.fillStyle = ctx.color('--fg'); g.font = 'bold 18px sans-serif'; g.textAlign = 'left'; g.textBaseline = 'top';
      g.fillText((n > 0 ? '+' : '') + n + ' e', 10, 8);
    }
    ctx.onLang(upd); upd();
    return { destroy: cv.destroy };
  }

  /* ---------- Widget: current as charge flow, Q = I·t ---------- */
  function mountFlow(host, ctx) {
    var el = ctx.el, dots = [], i;
    for (i = 0; i < 28; i++) dots.push({ x: Math.random(), y: 0.25 + 0.5 * Math.random() });
    var res = el('div', { class: 'readout-list' });
    var cv = TDC.viz.canvas(host, { aspect: 0.28, draw: draw });
    var panel = TDC.viz.params([
      { id: 'I', tex: 'I', min: 0.1, max: 10, value: 2, unit: 'A', log: true },
      { id: 't', tex: 't', min: 1, max: 120, value: 30, unit: 's', step: 1 }
    ], upd, ctx);
    host.append(panel, res);
    function upd() {
      var I = panel.values.I, t = panel.values.t, Q = I * t, N = Q / QE;
      res.innerHTML = '';
      res.append(
        el('div', { class: 'readout' }, [TDC.formula.el('Q = I·t'), el('b', {}, ' = ' + ctx.fmtSI(Q, 'C', 3))]),
        el('div', { class: 'readout' }, [TDC.formula.el('N = Q/e'), el('b', {}, ' = ' + ctx.fmtNum(N, 3) + ' ' + ctx.tx({ en: 'elementary charges', fi: 'alkeisvarausta' }))])
      );
      cv.redraw();
    }
    function draw(g, w, h, t, dt) {
      var I = panel.values.I, mid = h / 2, sp = 0.04 + 0.05 * I;
      g.clearRect(0, 0, w, h);
      g.fillStyle = ctx.color('--surface-2'); g.fillRect(0, h * 0.18, w, h * 0.64);
      g.strokeStyle = ctx.color('--c-wire'); g.lineWidth = 2; g.strokeRect(0, h * 0.18, w, h * 0.64);
      g.setLineDash([6, 5]); g.strokeStyle = ctx.color('--c-4'); g.beginPath(); g.moveTo(w / 2, h * 0.1); g.lineTo(w / 2, h * 0.9); g.stroke(); g.setLineDash([]);
      g.fillStyle = ctx.color('--c-electron');
      dots.forEach(function (d) {
        d.x -= dt * sp; if (d.x < 0) d.x += 1;
        g.beginPath(); g.arc(d.x * w, h * 0.18 + d.y * h * 0.64, 4, 0, 7); g.fill();
      });
      g.strokeStyle = ctx.color('--c-flow'); g.fillStyle = ctx.color('--c-flow'); g.lineWidth = 3;
      g.beginPath(); g.moveTo(w * 0.35, mid); g.lineTo(w * 0.65, mid); g.stroke();
      g.beginPath(); g.moveTo(w * 0.65 + 10, mid); g.lineTo(w * 0.65 - 4, mid - 8); g.lineTo(w * 0.65 - 4, mid + 8); g.fill();
      g.fillStyle = ctx.color('--fg'); g.font = '13px sans-serif'; g.textBaseline = 'top'; g.textAlign = 'left';
      g.fillText(ctx.tx({ en: 'e⁻ drift (left)  ·  conventional current I (right)', fi: 'e⁻ ajautuu (vasemmalle)  ·  virran positiivinen suunta I (oikealle)' }), 8, 4);
    }
    upd();
    return { destroy: cv.destroy };
  }

  /* ---------- Widget: Coulomb force playground ---------- */
  function mountCoulomb(host, ctx) {
    var el = ctx.el;
    var MATS = [
      [1, { en: 'vacuum / air', fi: 'tyhjiö / ilma' }], [2, { en: 'teflon', fi: 'teflon' }], [2.2, { en: 'transformer oil', fi: 'muuntajaöljy' }],
      [5.5, { en: 'porcelain', fi: 'posliini' }], [6, { en: 'mica', fi: 'kiille' }], [10, { en: 'glass', fi: 'lasi' }], [81, { en: 'deionized water', fi: 'ioniton vesi' }]
    ];
    var sel = el('select', { 'aria-label': 'material' });
    function fillSel() { var v = sel.value; sel.innerHTML = ''; MATS.forEach(function (m, i) { sel.appendChild(el('option', { value: i }, ctx.tx(m[1]) + ' (εᵣ = ' + ctx.fmtNum(m[0]) + ')')); }); sel.value = v || '0'; }
    fillSel();
    var res = el('div', { class: 'readout-list' });
    var cv = TDC.viz.canvas(host, { aspect: 0.32, animate: false, draw: draw });
    var panel = TDC.viz.params([
      { id: 'q1', tex: 'Q_1', min: -5e-6, max: 5e-6, step: 1e-7, value: 2e-6, unit: 'C' },
      { id: 'q2', tex: 'Q_2', min: -5e-6, max: 5e-6, step: 1e-7, value: 3e-6, unit: 'C' },
      { id: 'r', tex: 'r', min: 0.05, max: 1, value: 0.1, unit: 'm', log: true }
    ], upd, ctx);
    host.append(panel, el('div', { style: { margin: '.4em 0' } }, [el('label', {}, [ctx.tx({ en: 'Medium: ', fi: 'Väliaine: ' }), sel])]), res);
    sel.addEventListener('change', upd);
    function force() { var v = panel.values; return K * Math.abs(v.q1 * v.q2) / (MATS[+sel.value][0] * v.r * v.r); }
    function upd() {
      var F = force(), v = panel.values;
      res.innerHTML = '';
      res.append(el('div', { class: 'readout' }, [TDC.formula.el('F = k·|Q_1 Q_2|/(ε_r r²)'), el('b', {}, ' = ' + ctx.fmtSI(F, 'N', 3))]),
        el('div', { class: 'muted' }, v.q1 * v.q2 === 0 ? ctx.tx({ en: 'A neutral body feels no Coulomb force.', fi: 'Varaukseton kappale ei koe Coulombin voimaa.' })
          : v.q1 * v.q2 > 0 ? ctx.tx({ en: 'Like charges: repulsion.', fi: 'Samanmerkkiset varaukset: hylkivät.' }) : ctx.tx({ en: 'Unlike charges: attraction.', fi: 'Erimerkkiset varaukset: vetävät puoleensa.' })));
      cv.redraw();
    }
    function draw(g, w, h) {
      var v = panel.values, F = force(), r = v.r;
      g.clearRect(0, 0, w, h);
      var span = w - 160, x1 = 70 + (span - span * (Math.log(r / 0.05) / Math.log(20))) / 2 + 0, x2;
      var sep = 40 + (span - 40) * Math.log(r / 0.05) / Math.log(20);
      x1 = w / 2 - sep / 2; x2 = w / 2 + sep / 2;
      var y = h * 0.55;
      g.strokeStyle = ctx.color('--line'); g.setLineDash([4, 4]); g.beginPath(); g.moveTo(x1, y + 38); g.lineTo(x2, y + 38); g.stroke(); g.setLineDash([]);
      g.fillStyle = ctx.color('--muted'); g.font = '12px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'top';
      g.fillText('r = ' + ctx.fmtSI(r, 'm', 3), w / 2, y + 42);
      [[x1, v.q1], [x2, v.q2]].forEach(function (c) {
        var rad = 8 + 4 * Math.sqrt(Math.abs(c[1]) / 1e-6);
        g.fillStyle = c[1] > 0 ? ctx.color('--c-2') : c[1] < 0 ? ctx.color('--c-1') : ctx.color('--muted');
        g.beginPath(); g.arc(c[0], y, rad, 0, 7); g.fill();
        g.fillStyle = ctx.color('--surface'); g.font = 'bold 15px sans-serif'; g.textBaseline = 'middle';
        g.fillText(c[1] > 0 ? '+' : c[1] < 0 ? '−' : '0', c[0], y);
      });
      if (!(F > 0)) return;
      var len = clamp(14 + 14 * (Math.log10(F) + 5), 14, 140), rep = v.q1 * v.q2 > 0;
      function arrow(x, dir) {
        g.strokeStyle = g.fillStyle = ctx.color('--c-flow'); g.lineWidth = 3;
        var tipx = x + dir * len;
        g.beginPath(); g.moveTo(x, y - 30); g.lineTo(tipx, y - 30); g.stroke();
        g.beginPath(); g.moveTo(tipx + dir * 9, y - 30); g.lineTo(tipx - dir * 3, y - 38); g.lineTo(tipx - dir * 3, y - 22); g.fill();
      }
      arrow(x1, rep ? -1 : 1); arrow(x2, rep ? 1 : -1);
      g.fillStyle = ctx.color('--fg'); g.font = '12px sans-serif'; g.textBaseline = 'top'; g.textAlign = 'left';
      g.fillText('F = ' + ctx.fmtSI(F, 'N', 3) + '   (' + ctx.tx({ en: 'arrow length: log scale', fi: 'nuolen pituus: logaritminen asteikko' }) + ')', 8, 6);
    }
    upd();
    return { destroy: cv.destroy };
  }

  /* ---------- Widget: field sketcher (field lines, equipotentials, probe) ---------- */
  function mountField(host, ctx) {
    var el = ctx.el, ASP = 0.55, ch = [{ x: 0.3, y: 0.275, q: 1 }, { x: 0.7, y: 0.275, q: -1 }];
    var showEq = true, drag = null, probe = null, W = 1;
    var info = el('div', { class: 'readout', style: { margin: '.4em 0' } });
    var bar = el('div', { style: { display: 'flex', gap: '.4em', flexWrap: 'wrap', margin: '.5em 0' } });
    function btn(label, fn) { var b = el('button', { type: 'button', class: 'btn' }, label); b.addEventListener('click', function () { fn(); upd(); }); return b; }
    var cv = TDC.viz.canvas(host, { aspect: ASP, animate: false, draw: draw });
    cv.canvas.style.touchAction = 'none'; cv.canvas.style.cursor = 'crosshair';
    var bEq;
    function mkButtons() {
      bar.innerHTML = '';
      bar.append(
        btn('+ 1 nC', function () { if (ch.length < 6) ch.push({ x: 0.2 + 0.6 * Math.random(), y: 0.1 + 0.35 * Math.random(), q: 1 }); }),
        btn('− 1 nC', function () { if (ch.length < 6) ch.push({ x: 0.2 + 0.6 * Math.random(), y: 0.1 + 0.35 * Math.random(), q: -1 }); }),
        bEq = btn(ctx.tx({ en: 'Equipotentials on/off', fi: 'Tasapotentiaalit päälle/pois' }), function () { showEq = !showEq; }),
        btn(ctx.tx({ en: 'Dipole', fi: 'Dipoli' }), function () { ch = [{ x: 0.3, y: 0.275, q: 1 }, { x: 0.7, y: 0.275, q: -1 }]; }),
        btn(ctx.tx({ en: 'Two like charges', fi: 'Kaksi samanmerkkistä' }), function () { ch = [{ x: 0.3, y: 0.275, q: 1 }, { x: 0.7, y: 0.275, q: 1 }]; }),
        btn(ctx.tx({ en: 'Clear', fi: 'Tyhjennä' }), function () { ch = []; probe = null; })
      );
    }
    host.append(bar, info);
    function field(px, py) {
      var ex = 0, ey = 0, v = 0;
      for (var i = 0; i < ch.length; i++) {
        var c = ch[i], dx = px - c.x, dy = py - c.y, r2 = dx * dx + dy * dy + 1e-6, r = Math.sqrt(r2), k = K * c.q * 1e-9;
        ex += k * dx / (r2 * r); ey += k * dy / (r2 * r); v += k / r;
      }
      return { x: ex, y: ey, v: v };
    }
    function pos(e) { var rc = cv.canvas.getBoundingClientRect(); return { x: (e.clientX - rc.left) / rc.width, y: (e.clientY - rc.top) / rc.width }; }
    function hit(p) { for (var i = ch.length - 1; i >= 0; i--) if (Math.hypot(ch[i].x - p.x, ch[i].y - p.y) * W < 16) return ch[i]; return null; }
    cv.canvas.addEventListener('pointerdown', function (e) { var p = pos(e); drag = hit(p); if (drag) cv.canvas.setPointerCapture(e.pointerId); probe = p; upd(); });
    cv.canvas.addEventListener('pointermove', function (e) {
      var p = pos(e);
      if (drag) { drag.x = clamp(p.x, 0.02, 0.98); drag.y = clamp(p.y, 0.02, ASP - 0.02); }
      probe = p; upd();
    });
    cv.canvas.addEventListener('pointerup', function () { drag = null; });
    cv.canvas.addEventListener('dblclick', function (e) { var c = hit(pos(e)); if (c) { ch.splice(ch.indexOf(c), 1); upd(); } });
    function upd() {
      if (probe && ch.length) {
        var f = field(probe.x, probe.y), m = Math.hypot(f.x, f.y);
        info.innerHTML = '<b>' + ctx.tx({ en: 'Probe', fi: 'Koetin' }) + '</b>: |E| = ' + ctx.fmtSI(m, 'V/m', 3) + ', V = ' + ctx.fmtSI(f.v, 'V', 3);
      } else info.textContent = ctx.tx({ en: 'Drag the charges; move the pointer over the field to probe E and V. Double-click a charge to remove it. Field width = 1 m.', fi: 'Vedä varauksia; liikuta osoitinta kentässä mitataksesi E:n ja V:n. Kaksoisnapsauta varausta poistaaksesi sen. Kentän leveys = 1 m.' });
      cv.redraw();
    }
    // Equipotentials every 10 V via marching squares; crossings are chained into polylines so the dash runs on.
    function drawEquipotentials(g, w, h) {
      var cell = 4, cols = Math.ceil(w / cell) + 1, rows = Math.ceil(h / cell) + 1, V = new Float64Array(cols * rows), nodes = {}, i, j, k;
      for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) V[j * cols + i] = field(i * cell / w, j * cell / w).v;
      function cross(L, a, b) {
        var key = L + ':' + a + ':' + b, nd = nodes[key];
        if (!nd) {
          var t = (L - V[a]) / (V[b] - V[a]);
          nd = nodes[key] = { x: ((a % cols) + t * ((b % cols) - (a % cols))) * cell, y: (Math.floor(a / cols) + t * (Math.floor(b / cols) - Math.floor(a / cols))) * cell, n: [], done: false };
        }
        return nd;
      }
      function link(p, q) { p.n.push(q); q.n.push(p); }
      for (j = 0; j < rows - 1; j++) for (i = 0; i < cols - 1; i++) {
        var c = [j * cols + i, j * cols + i + 1, (j + 1) * cols + i + 1, (j + 1) * cols + i], v = c.map(function (x) { return V[x]; });
        var vmin = Math.min.apply(null, v), vmax = Math.max.apply(null, v), lo = Math.ceil(vmin / 10) * 10, hi = vmax;
        if (vmax - vmin > 10) continue; // contours closer than one cell next to a charge: leave a clean gap, not a smudge
        for (var L = lo; L <= hi; L += 10) {
          var e = [];
          for (k = 0; k < 4; k++) { var a = c[k], b = c[(k + 1) % 4]; if ((V[a] >= L) !== (V[b] >= L)) e.push(a < b ? cross(L, a, b) : cross(L, b, a)); }
          if (e.length === 2) link(e[0], e[1]);
          else if (e.length === 4) { // saddle: decide by the centre value which corners the contours wrap
            if (((v[0] + v[1] + v[2] + v[3]) / 4 >= L) === (v[0] >= L)) { link(e[0], e[1]); link(e[2], e[3]); } else { link(e[3], e[0]); link(e[1], e[2]); }
          }
        }
      }
      var all = Object.keys(nodes).map(function (key) { return nodes[key]; });
      g.save(); g.strokeStyle = ctx.color('--c-4'); g.globalAlpha = 0.7; g.lineWidth = 1.2; g.setLineDash([6, 5]);
      g.beginPath();
      // open contours first (start at an end), then closed loops
      [function (nd) { return nd.n.length < 2; }, function () { return true; }].forEach(function (startOk) {
        all.forEach(function (nd) {
          if (nd.done || !startOk(nd)) return;
          var cur = nd; g.moveTo(cur.x, cur.y);
          while (cur && !cur.done) {
            cur.done = true; g.lineTo(cur.x, cur.y);
            var nx = cur.n.filter(function (m) { return !m.done; })[0];
            if (!nx && cur.n.length === 2 && cur.n.indexOf(nd) >= 0) g.lineTo(nd.x, nd.y); // close the loop
            cur = nx;
          }
        });
      });
      g.stroke(); g.restore();
    }
    function draw(g, w, h) {
      W = w; g.clearRect(0, 0, w, h);
      var posC = ch.filter(function (c) { return c.q > 0; }), i, j;
      g.lineJoin = 'round'; g.lineCap = 'round';
      if (showEq && ch.length) drawEquipotentials(g, w, h);
      var sources = posC.length ? posC : ch.filter(function (c) { return c.q < 0; }), sgn = posC.length ? 1 : -1, H = 0.004;
      function dir(x, y) { var f = field(x, y), m = Math.hypot(f.x, f.y); return m > 1e-9 ? [sgn * f.x / m, sgn * f.y / m] : null; }
      g.strokeStyle = ctx.color('--c-3'); g.fillStyle = ctx.color('--c-3'); g.lineWidth = 1.6;
      sources.forEach(function (s) {
        var n = 12;
        for (var a = 0; a < n; a++) {
          var ang = 2 * Math.PI * a / n + 0.2, px = s.x + 0.012 * Math.cos(ang), py = s.y + 0.012 * Math.sin(ang), step, drawn = [[px, py]];
          for (step = 0; step < 1125; step++) {
            // midpoint (RK2) step: follows the curvature near charges without the Euler zig-zag
            var d1 = dir(px, py); if (!d1) break;
            var d2 = dir(px + d1[0] * H / 2, py + d1[1] * H / 2); if (!d2) break;
            px += d2[0] * H; py += d2[1] * H;
            if (px < 0 || px > 1 || py < 0 || py > ASP) break;
            drawn.push([px, py]);
            var stop = false;
            for (var k = 0; k < ch.length; k++) if (ch[k] !== s && ch[k].q * s.q < 0 && Math.hypot(ch[k].x - px, ch[k].y - py) < 0.013) stop = true;
            if (stop) break;
          }
          if (drawn.length < 2) continue;
          g.beginPath(); g.moveTo(drawn[0][0] * w, drawn[0][1] * w);
          drawn.forEach(function (p) { g.lineTo(p[0] * w, p[1] * w); }); g.stroke();
          var mi = Math.min(drawn.length - 1, 50), p1 = drawn[mi - 1], p2 = drawn[mi], dx = (p2[0] - p1[0]) * sgn, dy = (p2[1] - p1[1]) * sgn, L = Math.hypot(dx, dy) || 1;
          dx /= L; dy /= L;
          g.beginPath(); g.moveTo(p2[0] * w + dx * 6, p2[1] * w + dy * 6); g.lineTo(p2[0] * w - dx * 3 - dy * 4, p2[1] * w - dy * 3 + dx * 4); g.lineTo(p2[0] * w - dx * 3 + dy * 4, p2[1] * w - dy * 3 - dx * 4); g.fill();
        }
      });
      ch.forEach(function (c) {
        g.fillStyle = c.q > 0 ? ctx.color('--c-2') : ctx.color('--c-1');
        g.beginPath(); g.arc(c.x * w, c.y * w, 11, 0, 7); g.fill();
        g.fillStyle = ctx.color('--surface'); g.font = 'bold 15px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(c.q > 0 ? '+' : '−', c.x * w, c.y * w);
      });
      if (probe && ch.length) {
        var f2 = field(probe.x, probe.y), m2 = Math.hypot(f2.x, f2.y) || 1, px2 = probe.x * w, py2 = probe.y * w;
        g.strokeStyle = g.fillStyle = ctx.color('--c-flow'); g.lineWidth = 2.5;
        g.beginPath(); g.arc(px2, py2, 4, 0, 7); g.fill();
        var ex = f2.x / m2 * 34, ey = f2.y / m2 * 34;
        g.beginPath(); g.moveTo(px2, py2); g.lineTo(px2 + ex, py2 + ey); g.stroke();
        g.beginPath(); g.arc(px2 + ex, py2 + ey, 3, 0, 7); g.fill();
      }
    }
    mkButtons(); upd();
    ctx.onLang(function () { mkButtons(); upd(); });
    return { destroy: cv.destroy };
  }

  /* ---------- Widget: parallel plates, E = U/d ---------- */
  function mountPlates(host, ctx) {
    var el = ctx.el, res = el('div', { class: 'readout-list' });
    var cv = TDC.viz.canvas(host, { aspect: 0.4, animate: false, draw: draw });
    var panel = TDC.viz.params([
      { id: 'U', tex: 'U', min: 1, max: 50, step: 1, value: 20, unit: 'V' },
      { id: 'd', tex: 'd', min: 0.01, max: 0.1, step: 0.005, value: 0.04, unit: 'm' },
      { id: 'x', tex: 'x/d', min: 0, max: 1, step: 0.05, value: 0.25, unit: '' }
    ], upd, ctx);
    host.append(panel, res);
    function upd() {
      var v = panel.values, E = v.U / v.d, Va = v.U * (1 - v.x), W = 1e-6 * Va;
      res.innerHTML = '';
      res.append(
        el('div', { class: 'readout' }, [TDC.formula.el('E = U/d'), el('b', {}, ' = ' + ctx.fmtSI(E, 'V/m', 3))]),
        el('div', { class: 'readout' }, [TDC.formula.el('V_a − V_b = E·(d − x)'), el('b', {}, ' = ' + ctx.fmtSI(Va, 'V', 3))]),
        el('div', { class: 'readout' }, [TDC.formula.el('W = q·E·(d − x)'), el('b', {}, ' = ' + ctx.fmtSI(W, 'J', 3) + '  (q = 1 µC)')])
      );
      cv.redraw();
    }
    function draw(g, w, h) {
      var v = panel.values, xL = w * 0.14, xR = w * 0.86, y0 = h * 0.18, y1 = h * 0.86, E = v.U / v.d, i;
      g.clearRect(0, 0, w, h);
      g.fillStyle = ctx.color('--c-2'); g.fillRect(xL - 8, y0, 8, y1 - y0);
      g.fillStyle = ctx.color('--c-1'); g.fillRect(xR, y0, 8, y1 - y0);
      g.font = 'bold 14px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'bottom'; g.fillStyle = ctx.color('--fg');
      g.fillText('+', xL - 4, y0 - 2); g.fillText('−', xR + 4, y0 - 2);
      g.font = '12px sans-serif'; g.setLineDash([5, 4]); g.lineWidth = 1;
      for (i = 0; i <= 4; i++) {
        var x = xL + (xR - xL) * i / 4;
        g.strokeStyle = ctx.color('--c-4'); g.beginPath(); g.moveTo(x, y0 - 10); g.lineTo(x, y1); g.stroke();
        g.fillStyle = ctx.color('--c-4'); g.textBaseline = 'bottom';
        if (i > 0 && i < 4) g.fillText(ctx.fmtNum(v.U * (1 - i / 4), 3) + ' V', x, y0 - 12);
      }
      g.setLineDash([]);
      g.strokeStyle = g.fillStyle = ctx.color('--c-3'); g.lineWidth = 0.8 + Math.log10(1 + E / 10);
      for (i = 0; i < 6; i++) {
        var y = y0 + (y1 - y0) * (i + 0.5) / 6;
        g.beginPath(); g.moveTo(xL + 4, y); g.lineTo(xR - 8, y); g.stroke();
        g.beginPath(); g.moveTo(xR - 2, y); g.lineTo(xR - 12, y - 5); g.lineTo(xR - 12, y + 5); g.fill();
      }
      var qx = xL + (xR - xL) * v.x, qy = (y0 + y1) / 2;
      g.fillStyle = ctx.color('--c-2'); g.beginPath(); g.arc(qx, qy, 9, 0, 7); g.fill();
      g.fillStyle = ctx.color('--surface'); g.font = 'bold 13px sans-serif'; g.textBaseline = 'middle'; g.fillText('+', qx, qy);
      g.fillStyle = ctx.color('--fg'); g.font = '12px sans-serif'; g.textBaseline = 'top';
      g.fillText('d = ' + ctx.fmtSI(v.d, 'm', 3), w / 2, y1 + 6);
      g.fillText('U = ' + ctx.fmtNum(v.U, 3) + ' V', w / 2, y1 + 22);
    }
    upd();
    return { destroy: cv.destroy };
  }

  /* ---------- Widget: voltage / current reference directions (sign convention) ---------- */
  function mountSign(host, ctx) {
    var el = ctx.el, st = { plus: 'A', iDir: 'AB' }, R = 100, VA = 5, VB = 0;
    var box = el('div'), out = el('div', { class: 'readout-list' });
    var bar = el('div', { style: { display: 'flex', gap: '.4em', flexWrap: 'wrap', margin: '.5em 0' } });
    function btn(label, fn) { var b = el('button', { type: 'button', class: 'btn' }, label); b.addEventListener('click', function () { fn(); upd(); }); return b; }
    function mk() {
      bar.innerHTML = '';
      bar.append(
        btn(ctx.tx({ en: 'Flip voltage reference (+ / −)', fi: 'Käännä jännitteen vertailusuunta (+ / −)' }), function () { st.plus = st.plus === 'A' ? 'B' : 'A'; }),
        btn(ctx.tx({ en: 'Flip current arrow', fi: 'Käännä virtanuoli' }), function () { st.iDir = st.iDir === 'AB' ? 'BA' : 'AB'; })
      );
    }
    host.append(box, bar, out);
    function upd() {
      var u = (st.plus === 'A' ? VA - VB : VB - VA), i = (st.iDir === 'AB' ? 1 : -1) * (VA - VB) / R;
      var entersPlus = (st.iDir === 'AB') === (st.plus === 'A');
      var col = 'style="stroke:var(--fg);fill:none;stroke-width:2"', cu = 'style="stroke:var(--c-flow);fill:var(--c-flow);stroke-width:2"';
      var ia = st.iDir === 'AB';
      box.innerHTML = '<svg viewBox="0 0 360 120" width="100%" style="max-width:420px;display:block">' +
        '<line x1="20" y1="70" x2="120" y2="70" ' + col + '/><rect x="120" y="55" width="120" height="30" ' + col + '/><line x1="240" y1="70" x2="340" y2="70" ' + col + '/>' +
        '<text x="180" y="75" text-anchor="middle" style="fill:var(--fg);font:14px sans-serif">R = 100 Ω</text>' +
        '<text x="20" y="100" style="fill:var(--fg);font:13px sans-serif">A (' + VA + ' V)</text><text x="340" y="100" text-anchor="end" style="fill:var(--fg);font:13px sans-serif">B (' + VB + ' V)</text>' +
        '<text x="' + (st.plus === 'A' ? 60 : 300) + '" y="50" text-anchor="middle" style="fill:var(--c-2);font:bold 18px sans-serif">+</text>' +
        '<text x="' + (st.plus === 'A' ? 300 : 60) + '" y="50" text-anchor="middle" style="fill:var(--c-1);font:bold 18px sans-serif">−</text>' +
        '<text x="180" y="20" text-anchor="middle" style="fill:var(--muted);font:12px sans-serif">u = V(+) − V(−)</text>' +
        '<line x1="' + (ia ? 140 : 220) + '" y1="45" x2="' + (ia ? 220 : 140) + '" y2="45" ' + cu + '/>' +
        '<polygon points="' + (ia ? '228,45 216,40 216,50' : '132,45 144,40 144,50') + '" ' + cu + '/>' +
        '<text x="180" y="36" text-anchor="middle" style="fill:var(--c-flow);font:bold 13px sans-serif">i</text></svg>';
      out.innerHTML = '';
      function line(t) { var d = el('div', { class: 'readout' }); d.innerHTML = t; out.appendChild(d); }
      line('u = ' + ctx.fmtNum(u, 3) + ' V, &nbsp; i = ' + ctx.fmtSI(i, 'A', 3));
      line('<b>' + (entersPlus ? 'u = +R·i' : 'u = −R·i') + '</b> &nbsp; (' + ctx.fmtNum(u, 3) + ' = ' + (entersPlus ? '+' : '−') + ' 100 · ' + ctx.fmtNum(i, 3) + ')');
      line('p = u·i = ' + ctx.fmtSI(u * i, 'W', 3) + (u * i > 0 ? ' — ' + ctx.tx({ en: 'positive: power absorbed by the resistor', fi: 'positiivinen: vastus ottaa tehoa' }) : ' — ' + ctx.tx({ en: 'negative: would mean delivering power (not for a resistor!)', fi: 'negatiivinen: tarkoittaisi tehon antamista (ei vastukselle!)' })));
    }
    mk(); upd();
    ctx.onLang(function () { mk(); upd(); });
    return {};
  }

  /* ---------- Widget: fuse and GFCI simulator ---------- */
  function mountFuse(host, ctx) {
    var el = ctx.el, IN = 10, A = 20, heat = 0, melted = false, tripped = false;
    var status = el('div', { class: 'readout-list' });
    var cv = TDC.viz.canvas(host, { aspect: 0.62, draw: draw });
    var panel = TDC.viz.params([
      { id: 'I', label: { en: 'Load current I (fuse rated 10 A)', fi: 'Kuormavirta I (sulake 10 A)' }, min: 1, max: 100, value: 6, unit: 'A', log: true },
      { id: 'L', label: { en: 'Leakage (hot − neutral) current', fi: 'Vuotovirta (vaihe − nolla)' }, min: 0, max: 0.1, step: 0.001, value: 0.005, unit: 'A' }
    ], function () { cv.redraw(); }, ctx);
    var rb = el('button', { type: 'button', class: 'btn' }, '');
    function lab() { rb.textContent = ctx.tx({ en: 'Replace fuse / reset GFCI', fi: 'Vaihda sulake / palauta vikavirtasuoja' }); }
    rb.addEventListener('click', function () { heat = 0; melted = false; tripped = false; cv.redraw(); });
    lab(); ctx.onLang(lab);
    host.append(panel, rb, status);
    function tmelt(I) { var x = (I / IN) * (I / IN) - 1; return x > 0.0001 ? A / x : Infinity; }
    function draw(g, w, h, t, dt) {
      var I = panel.values.I, L = panel.values.L;
      if (dt > 0) {
        if (!tripped && L >= 0.03) tripped = true;
        if (!melted && !tripped) {
          var x = (I / IN) * (I / IN) - 1;
          heat = x > 0 ? heat + dt * x / A : Math.max(0, heat - dt * 0.15);
          if (heat >= 1) melted = true;
        } else if (!melted) heat = Math.max(0, heat - dt * 0.3);
      }
      g.clearRect(0, 0, w, h);
      var fg = ctx.color('--fg'), mu = ctx.color('--muted');
      g.font = '12px sans-serif'; g.textBaseline = 'top'; g.textAlign = 'left'; g.fillStyle = fg;
      g.fillText(ctx.tx({ en: 'Fuse ribbon', fi: 'Sulakelanka' }), 10, 6);
      var fx = 20, fy = h * 0.2, fw = w * 0.4, hot = clamp(heat, 0, 1);
      g.strokeStyle = ctx.color('--c-wire'); g.lineWidth = 2; g.strokeRect(fx, fy, fw, 36);
      g.strokeStyle = melted ? mu : ctx.color('--c-2'); g.globalAlpha = melted ? 1 : 0.35 + 0.65 * hot; g.lineWidth = 3 - 1.5 * hot;
      g.beginPath();
      if (melted) { g.moveTo(fx + 6, fy + 18); g.lineTo(fx + fw * 0.4, fy + 18); g.moveTo(fx + fw * 0.6, fy + 18); g.lineTo(fx + fw - 6, fy + 18); }
      else { g.moveTo(fx + 6, fy + 18); g.lineTo(fx + fw - 6, fy + 18); }
      g.stroke(); g.globalAlpha = 1;
      g.fillStyle = fg; g.fillText(melted ? ctx.tx({ en: 'MELTED — circuit open', fi: 'SULANUT — piiri auki' }) : ctx.tx({ en: 'heat: ', fi: 'lämpö: ' }) + Math.round(hot * 100) + ' %', fx, fy + 42);
      // GFCI
      var gy = h * 0.52;
      g.fillStyle = fg; g.fillText('GFCI / ' + ctx.tx({ en: 'RCD', fi: 'vikavirtasuoja' }), 10, gy - 16);
      g.strokeStyle = ctx.color('--c-wire'); g.strokeRect(fx, gy, fw, 36);
      g.fillStyle = tripped ? ctx.color('--c-2') : ctx.color('--c-3'); g.beginPath(); g.arc(fx + 22, gy + 18, 8, 0, 7); g.fill();
      g.fillStyle = fg; g.fillText(tripped ? ctx.tx({ en: 'TRIPPED (≥ 30 mA)', fi: 'LAUKENNUT (≥ 30 mA)' }) : ctx.tx({ en: 'OK (< 30 mA)', fi: 'OK (< 30 mA)' }), fx + 38, gy + 12);
      // leakage bar
      var bx = fx, by = h * 0.8, bw = fw;
      g.strokeStyle = mu; g.strokeRect(bx, by, bw, 14);
      g.fillStyle = L >= 0.03 ? ctx.color('--c-2') : ctx.color('--c-1'); g.fillRect(bx, by, bw * L / 0.1, 14);
      g.strokeStyle = fg; g.beginPath(); g.moveTo(bx + bw * 0.3, by - 4); g.lineTo(bx + bw * 0.3, by + 18); g.stroke();
      g.fillStyle = fg; g.fillText('0', bx, by + 18); g.fillText('30 mA', bx + bw * 0.3 - 18, by + 18); g.fillText('100 mA', bx + bw - 40, by + 18);
      g.fillText(ctx.tx({ en: 'Leakage = current through a person', fi: 'Vuotovirta = ihmisen läpi kulkeva virta' }), bx, by - 18);
      // log-log chart: melting time vs current
      var px = w * 0.52, py = 14, pw = w * 0.44, ph = h - 50;
      g.strokeStyle = mu; g.lineWidth = 1; g.strokeRect(px, py, pw, ph);
      function X(I2) { return px + pw * Math.log(I2 / 1) / Math.log(100); }
      function Y(s) { return py + ph - ph * (Math.log10(clamp(s, 0.01, 1000)) + 2) / 5; }
      g.fillStyle = mu; g.font = '11px sans-serif';
      [1, 10, 100].forEach(function (I2) { g.fillText(I2 + ' A', X(I2) - 8, py + ph + 4); });
      [0.01, 0.1, 1, 10, 100, 1000].forEach(function (s) { g.fillText(s >= 1 ? s + ' s' : s + ' s', px + 3, Y(s) - 12); g.strokeStyle = ctx.color('--line'); g.beginPath(); g.moveTo(px, Y(s)); g.lineTo(px + pw, Y(s)); g.stroke(); });
      g.strokeStyle = ctx.color('--c-2'); g.lineWidth = 2; g.beginPath();
      var first = true;
      for (var I3 = 10.2; I3 <= 100; I3 *= 1.03) { var s = tmelt(I3); if (!isFinite(s)) continue; if (first) { g.moveTo(X(I3), Y(s)); first = false; } else g.lineTo(X(I3), Y(s)); }
      g.stroke();
      var tm = tmelt(I);
      if (isFinite(tm)) { g.fillStyle = ctx.color('--c-flow'); g.beginPath(); g.arc(X(I), Y(tm), 5, 0, 7); g.fill(); }
      g.strokeStyle = ctx.color('--c-flow'); g.setLineDash([3, 3]); g.beginPath(); g.moveTo(X(I), py); g.lineTo(X(I), py + ph); g.stroke(); g.setLineDash([]);
      g.fillStyle = fg; g.font = '12px sans-serif'; g.fillText(ctx.tx({ en: 'Melting time of the fuse (illustrative model)', fi: 'Sulakkeen sulamisaika (havainnollistava malli)' }), px + 4, py + ph + 20);
      var msg = [];
      msg.push(isFinite(tm) ? ctx.tx({ en: 'Overload: fuse melts in ≈ ', fi: 'Ylikuorma: sulake palaa noin ' }) + ctx.fmtNum(tm, 3) + ' s' : ctx.tx({ en: 'Load current is below the rating: the fuse does not melt.', fi: 'Kuormavirta alittaa nimellisvirran: sulake ei pala.' }));
      msg.push(L >= 0.03 ? ctx.tx({ en: 'The GFCI cuts the current almost instantly. The fuse would never react to this: a body current of 30–100 mA is far below 10 A!', fi: 'Vikavirtasuoja katkaisee virran lähes heti. Sulake ei reagoisi tähän lainkaan: 30–100 mA:n kehovirta on paljon alle 10 A!' }) : ctx.tx({ en: 'Leakage below 30 mA: the GFCI stays closed.', fi: 'Vuotovirta alle 30 mA: vikavirtasuoja pysyy kiinni.' }));
      status.innerHTML = ''; msg.forEach(function (m) { status.appendChild(el('div', { class: 'readout' }, m)); });
    }
    return { destroy: cv.destroy };
  }

  /* ---------- Widget: power and energy calculator (extra) ---------- */
  var energyCfg = {
    params: [
      { id: 'U', tex: 'U', min: 1, max: 400, value: 12, unit: 'V', log: true },
      { id: 'R', tex: 'R', min: 1, max: 1000, value: 6, unit: 'Ω', log: true },
      { id: 't', tex: 't', min: 1, max: 86400, value: 1800, unit: 's', log: true }
    ],
    outputs: function (v) {
      var I = v.U / v.R, P = v.U * I, E = P * v.t, kwh = E / 3.6e6;
      return [
        { tex: 'I = U/R', value: I, unit: 'A' }, { tex: 'P = U·I = U²/R', value: P, unit: 'W' },
        { tex: 'E = P·t', value: E, unit: 'J' }, { tex: 'E', value: Number(kwh.toPrecision(3)) + ' kWh' }
      ];
    }
  };

  /* ================================================================== */
  TDC.registerTopic({
    id: 't1', num: 1,
    title: { en: 'Introduction to electrical engineering', fi: 'Johdatus sähkö\u00ADtekniikkaan' },
    subtitle: { en: 'Units, charge, electric field, voltage, power, DC-circuit basics and measurements.', fi: 'Yksiköt, varaus, sähkökenttä, jännite, teho, tasasähköpiirin perusteet ja mittaukset.' },
    objectives: [
      { en: 'use SI units, prefixes and standard quantity symbols correctly', fi: 'käyttää SI-yksiköitä, etuliitteitä ja suuresymboleja oikein' },
      { en: 'describe atoms, ions, elementary charge and the electric properties of materials', fi: 'kuvata atomeja, ioneja, alkeisvarausta ja materiaalien sähköisiä ominaisuuksia' },
      { en: 'apply Coulomb\'s law and compute electric field, potential and voltage of point charges and plates', fi: 'soveltaa Coulombin lakia ja laskea pistevarausten ja levyjen sähkökenttä, potentiaali ja jännite' },
      { en: 'relate charge, current, voltage, power and energy: Q = I·t, P = U·I, E = P·t', fi: 'yhdistää varaus, virta, jännite, teho ja energia: Q = I·t, P = U·I, E = P·t' },
      { en: 'distinguish ideal sources, short and open circuits, linear and non-linear components', fi: 'erottaa ihannelähteet, oikosulku ja avoin piiri sekä lineaariset ja epälineaariset komponentit' },
      { en: 'explain fuses and GFCIs and connect a multimeter correctly for U, I, R and P', fi: 'selittää sulakkeet ja vikavirtasuojat sekä kytkeä yleismittari oikein U-, I-, R- ja P-mittauksiin' }
    ],

    glossary: {
      electric_charge: { en: 'electric charge', fi: 'sähkövaraus', sym: 'Q, q', def: { en: 'Property of matter that creates electric and magnetic phenomena. Unit coulomb (C = A·s).', fi: 'Aineen ominaisuus, joka aiheuttaa sähköiset ja magneettiset ilmiöt. Yksikkö coulombi (C = A·s).' } },
      elementary_charge: { en: 'elementary charge', fi: 'alkeisvaraus', sym: 'e = 1,602·10⁻¹⁹ C', def: { en: 'Smallest charge that exists freely in nature; the magnitude of the charge of a proton or an electron.', fi: 'Pienin vapaana esiintyvä varaus; protonin tai elektronin varauksen itseisarvo.' } },
      ion: { en: 'ion (cation, anion)', fi: 'ioni (kationi, anioni)', def: { en: 'Atom or molecule with unequal numbers of protons and electrons. Cation: positive; anion: negative.', fi: 'Atomi tai molekyyli, jossa on eri määrä protoneja ja elektroneja. Kationi on positiivinen, anioni negatiivinen.' } },
      valence_electron: { en: 'valence electron', fi: 'valenssielektroni', def: { en: 'Electron on the outermost shell; loosely bound in metals.', fi: 'Uloimman elektronikuoren elektroni; metalleissa löyhästi sidottu.' } },
      free_electron: { en: 'free electron', fi: 'vapaa elektroni', def: { en: 'Electron not bound to a single atom; carries current in metals.', fi: 'Elektroni, joka ei ole sidottu yhteen atomiin; kuljettaa virtaa metalleissa.' } },
      conductor: { en: 'conductor', fi: 'johde', def: { en: 'Material with free electrons (all metals); silver, copper and aluminium are the best.', fi: 'Aine, jossa on vapaita elektroneja (kaikki metallit); hopea, kupari ja alumiini ovat parhaita.' } },
      insulator: { en: 'insulator', fi: 'eriste', def: { en: 'Material without free electrons, e.g. glass, mica, polymers.', fi: 'Aine ilman vapaita elektroneja, esim. lasi, kiille, polymeerit.' } },
      semiconductor: { en: 'semiconductor', fi: 'puolijohde', def: { en: 'Material (Si, Ge) whose conductivity can be controlled by energy or doping.', fi: 'Aine (Si, Ge), jonka johtavuutta voidaan säätää energialla tai seostuksella.' } },
      electrolyte: { en: 'electrolyte', fi: 'elektrolyytti', def: { en: 'Water solution or melt of acids, bases or salts; ions carry the current.', fi: 'Happojen, emästen tai suolojen vesiliuos tai sula; ionit kuljettavat virtaa.' } },
      coulomb_law: { en: "Coulomb's law", fi: 'Coulombin laki', sym: 'F = k·Q₁Q₂/r²', def: { en: 'Force between two point charges, proportional to the product of charges and inversely to r².', fi: 'Pistevarausten välinen voima, verrannollinen varausten tuloon ja kääntäen r²:een.' } },
      permittivity: { en: 'permittivity', fi: 'permittiivisyys', sym: 'ε = ε₀·ε_r', def: { en: 'How well a medium permits an electric field; ε₀ ≈ 8.85·10⁻¹² F/m.', fi: 'Kuvaa, kuinka hyvin väliaine päästää sähkökentän läpi; ε₀ ≈ 8,85·10⁻¹² F/m.' } },
      electric_field: { en: 'electric field strength', fi: 'sähkökentän voimakkuus', sym: 'E = F/Q', def: { en: 'Force per unit positive test charge, unit V/m = N/C. A vector.', fi: 'Voima positiivista koevarausta kohti, yksikkö V/m = N/C. Vektorisuure.' } },
      field_line: { en: 'field line', fi: 'kenttäviiva', def: { en: 'Curve whose tangent is the direction of E; starts on + and ends on −.', fi: 'Käyrä, jonka tangentti on E:n suunta; alkaa +:sta ja päättyy −:een.' } },
      equipotential: { en: 'equipotential surface', fi: 'tasapotentiaalipinta', def: { en: 'Surface of constant potential, perpendicular to the field lines.', fi: 'Vakiopotentiaalin pinta, kohtisuorassa kenttäviivoja vastaan.' } },
      potential: { en: 'electric potential', fi: 'sähköinen potentiaali', sym: 'V = U_p/q', def: { en: 'Potential energy per unit charge (J/C = V). A scalar; the zero level is arbitrary.', fi: 'Potentiaalienergia varausyksikköä kohti (J/C = V). Skalaari; nollataso on vapaasti valittavissa.' } },
      voltage: { en: 'voltage (potential difference)', fi: 'jännite (potentiaaliero)', sym: 'U = V_a − V_b', def: { en: 'Difference of potential between two points, unit volt (V).', fi: 'Kahden pisteen välinen potentiaaliero, yksikkö voltti (V).' } },
      emf: { en: 'electromotive force (emf)', fi: 'lähdejännite', sym: 'E', def: { en: 'Voltage of an ideal source, independent of current.', fi: 'Ihannelähteen jännite, riippumaton virrasta.' } },
      ground: { en: 'ground (earth)', fi: 'maa (maadoitus)', def: { en: 'Common reference point, usually defined as 0 V.', fi: 'Yhteinen vertailupiste, yleensä määritelty 0 V:ksi.' } },
      faraday_cage: { en: 'Faraday cage', fi: 'Faradayn häkki', def: { en: 'Closed conducting shell; the field inside is zero in electrostatics.', fi: 'Suljettu johtava kuori; kenttä sen sisällä on nolla sähköstatiikassa.' } },
      current: { en: 'electric current', fi: 'sähkövirta', sym: 'I = Q/t', def: { en: 'Charge moved per unit time, unit ampere (A = C/s). Positive direction = movement of positive charge.', fi: 'Aikayksikössä siirtyvä varaus, yksikkö ampeeri (A = C/s). Positiivinen suunta = positiivisen varauksen liikesuunta.' } },
      resistance: { en: 'resistance', fi: 'resistanssi', sym: 'R = U/I', def: { en: 'Opposition to current, unit ohm (Ω = V/A).', fi: 'Virran kulkua vastustava ominaisuus, yksikkö ohmi (Ω = V/A).' } },
      resistor: { en: 'resistor', fi: 'vastus', def: { en: 'Passive bipolar component that converts electrical energy to heat.', fi: 'Passiivinen kaksinapainen komponentti, joka muuttaa sähköenergiaa lämmöksi.' } },
      short_circuit: { en: 'short circuit', fi: 'oikosulku', sym: 'R = 0', def: { en: 'Ideal conductor connection: voltage zero for any current.', fi: 'Ihanteellinen johdinyhteys: jännite nolla millä tahansa virralla.' } },
      open_circuit: { en: 'open circuit', fi: 'avoin piiri', sym: 'R = ∞', def: { en: 'No connection: current zero for any voltage.', fi: 'Ei yhteyttä: virta nolla millä tahansa jännitteellä.' } },
      power: { en: 'power', fi: 'teho', sym: 'P = U·I', def: { en: 'Energy converted per unit time, unit watt (W = J/s).', fi: 'Aikayksikössä muuntuva energia, yksikkö watti (W = J/s).' } },
      energy: { en: 'energy', fi: 'energia', sym: 'E = P·t', def: { en: 'Capacity to do work, unit joule (J = W·s). 1 kWh = 3.6 MJ.', fi: 'Kyky tehdä työtä, yksikkö joule (J = W·s). 1 kWh = 3,6 MJ.' } },
      voltage_source: { en: 'ideal voltage source', fi: 'ihanteellinen jännitelähde', def: { en: 'Keeps U = E for any current. Never short-circuit it.', fi: 'Pitää jännitteen U = E millä tahansa virralla. Ei saa oikosulkea.' } },
      current_source: { en: 'ideal current source', fi: 'ihanteellinen virtalähde', def: { en: 'Keeps I = I_s for any voltage. Never open-circuit it.', fi: 'Pitää virran I = I_s millä tahansa jännitteellä. Ei saa jättää avoimeksi.' } },
      linear_component: { en: 'linear component', fi: 'lineaarinen komponentti', def: { en: 'Characteristic is a straight line through the origin; superposition holds.', fi: 'Ominaiskäyrä on origon kautta kulkeva suora; superpositio pätee.' } },
      node: { en: 'node', fi: 'solmu', def: { en: 'Region of equal potential where components connect.', fi: 'Samanpotentiaalinen alue, jossa komponentit liittyvät toisiinsa.' } },
      branch: { en: 'branch', fi: 'haara', def: { en: 'Part of a circuit connecting two nodes.', fi: 'Piirin osa, joka yhdistää kaksi solmua.' } },
      loop: { en: 'closed loop', fi: 'silmukka', def: { en: 'Closed path that starts and ends at the same node.', fi: 'Suljettu reitti, joka alkaa ja päättyy samaan solmuun.' } },
      fuse: { en: 'fuse', fi: 'sulake', def: { en: 'Protective device that opens the circuit when the average current is too high.', fi: 'Suojalaite, joka katkaisee piirin, kun virran keskiarvo on liian suuri.' } },
      gfci: { en: 'ground fault circuit interrupter (GFCI/RCD)', fi: 'vikavirtasuoja', sym: 'I_Δn = 30 mA', def: { en: 'Trips when hot and neutral currents differ by 30 mA; protects people.', fi: 'Laukeaa, kun vaihe- ja nollajohtimen virtojen erotus on 30 mA; suojaa ihmisiä.' } },
      multimeter: { en: 'multimeter', fi: 'yleismittari', def: { en: 'Instrument for measuring voltage, current and resistance.', fi: 'Mittari jännitteen, virran ja resistanssin mittaamiseen.' } },
      voltmeter: { en: 'voltmeter', fi: 'volttimittari', def: { en: 'Connected in parallel; very high internal resistance (~MΩ).', fi: 'Kytketään rinnan; erittäin suuri sisäinen resistanssi (~MΩ).' } },
      ammeter: { en: 'ammeter', fi: 'ampeerimittari', def: { en: 'Connected in series; very low internal resistance (~mΩ).', fi: 'Kytketään sarjaan; erittäin pieni sisäinen resistanssi (~mΩ).' } }
    },

    formulas: [
      { name: { en: 'Net charge of a body', fi: 'Kappaleen nettovaraus' }, tex: 'Q = (N_p − N_e)·e' },
      { name: { en: 'Charge and current', fi: 'Varaus ja virta' }, tex: 'Q = I·t' },
      { name: { en: "Coulomb's law", fi: 'Coulombin laki' }, tex: 'F = {1}/{4π ε_0 ε_r}·{Q_1 Q_2}/{r²} = k·{Q_1 Q_2}/{ε_r r²}' },
      { name: { en: 'Electric field', fi: 'Sähkökenttä' }, tex: 'E = {F}/{Q} = {kQ}/{r²}' },
      { name: { en: 'Potential of a point charge', fi: 'Pistevarauksen potentiaali' }, tex: 'V = {kQ}/{r}' },
      { name: { en: 'Uniform field', fi: 'Homogeeninen kenttä' }, tex: 'E = {U}/{d}' },
      { name: { en: 'Work in a uniform field', fi: 'Työ homogeenisessa kentässä' }, tex: 'W = q·E·d = q·U' },
      { name: { en: 'Charged metal sphere (r ≥ R)', fi: 'Varattu metallipallo (r ≥ R)' }, tex: 'E = {Q}/{4π ε_0 r²},  V = {Q}/{4π ε_0 r}' },
      { name: { en: 'Resistance (Ohm)', fi: 'Resistanssi (Ohm)' }, tex: 'U = R·I' },
      { name: { en: 'DC power', fi: 'Tasasähkön teho' }, tex: 'P = U·I = R·I² = {U²}/{R}' },
      { name: { en: 'Energy', fi: 'Energia' }, tex: 'E = P·t' },
      { name: { en: 'Instantaneous power / energy', fi: 'Hetkellinen teho / energia' }, tex: 'p(t) = u(t)·i(t),  E = ∫_0^t p dt' }
    ],

    sections: [
      /* ---------------- 1.1 Standards and units ---------------- */
      {
        id: 't1-units', title: { en: 'Standards, quantities and units', fi: 'Standardit, suureet ja yksiköt' },
        blocks: [
          { id: 't1-units-p1', type: 'text', html: {
            en: '<p>Electrical engineering relies on agreed <b>quantities, symbols and units</b>. They are defined by standardization organisations, so that a "volt" means the same in Helsinki and in Houston.</p>',
            fi: '<p>Sähkö\u00ADtekniikka perustuu sovittuihin <b>suureisiin, tunnuksiin ja yksiköihin</b>. Niistä sopivat standardointijärjestöt, jotta voltti tarkoittaa samaa Helsingissä ja Houstonissa.</p>' } },
          { id: 't1-units-t1', type: 'table', caption: { en: 'Standardization organisations', fi: 'Standardointijärjestöt' },
            head: ['', { en: 'General', fi: 'Yleinen' }, { en: 'Electrotechnical', fi: 'Sähkö\u00ADtekniikka' }],
            rows: [
              [{ en: 'World wide', fi: 'Maailmanlaajuinen' }, 'ISO (International Organization for Standardization)', 'IEC (International Electrotechnical Commission)'],
              [{ en: 'European', fi: 'Eurooppalainen' }, 'CEN (European Committee for Standardization)', 'CENELEC (European Committee for Electrotechnical Standardization)'],
              [{ en: 'Finnish', fi: 'Suomalainen' }, 'SFS (Suomen Standardoimisliitto ry)', 'SESKO (Suomen sähkötekninen standardoimisyhdistys)'],
              ['USA', 'ANSI (American National Standards Institute)', { en: 'ANSI covers both', fi: 'ANSI kattaa molemmat' }]
            ] },
          { id: 't1-units-h1', type: 'h', text: { en: 'SI base quantities', fi: 'SI-perussuureet' } },
          { id: 't1-units-t2', type: 'table', caption: { en: 'Base quantities and SI units (SFS-ISO 1000)', fi: 'Perussuureet ja SI-yksiköt (SFS-ISO 1000)' },
            head: [{ en: 'Quantity', fi: 'Suure' }, { en: 'Symbol', fi: 'Tunnus' }, { en: 'SI unit', fi: 'SI-yksikkö' }, { en: 'Unit symbol', fi: 'Yksikön tunnus' }],
            rows: [
              [{ en: 'length', fi: 'pituus' }, { tex: 'l' }, { en: 'meter', fi: 'metri' }, 'm'],
              [{ en: 'mass', fi: 'massa' }, { tex: 'm' }, { en: 'kilogram', fi: 'kilogramma' }, 'kg'],
              [{ en: 'time', fi: 'aika' }, { tex: 't' }, { en: 'second', fi: 'sekunti' }, 's'],
              [{ en: 'electric current', fi: 'sähkövirta' }, { tex: 'I' }, { en: 'ampere', fi: 'ampeeri' }, 'A'],
              [{ en: 'thermodynamic temperature', fi: 'termodynaaminen lämpötila' }, { tex: 'T' }, { en: 'kelvin', fi: 'kelvin' }, 'K'],
              [{ en: 'amount of substance', fi: 'ainemäärä' }, { tex: 'n' }, { en: 'mole', fi: 'mooli' }, 'mol'],
              [{ en: 'luminous intensity', fi: 'valovoima' }, { tex: 'I_v' }, { en: 'candela', fi: 'kandela' }, 'cd']
            ] },
          { id: 't1-units-t3', type: 'table', caption: { en: 'Related quantities', fi: 'Johdetut suureet' },
            head: [{ en: 'Quantity', fi: 'Suure' }, { en: 'Symbol', fi: 'Tunnus' }, { en: 'Unit', fi: 'Yksikkö' }],
            rows: [
              [{ en: 'period', fi: 'jaksonaika' }, { tex: 'T' }, 's'],
              [{ en: 'time constant', fi: 'aikavakio' }, { tex: 'τ' }, 's'],
              [{ en: 'frequency', fi: 'taajuus' }, { tex: 'f' }, 'Hz'],
              [{ en: 'angular frequency', fi: 'kulmataajuus' }, { tex: 'ω' }, 'rad/s'],
              [{ en: 'rotational frequency', fi: 'pyörimistaajuus' }, { tex: 'n' }, '1/s'],
              [{ en: 'work', fi: 'työ' }, { tex: 'W' }, 'J'],
              [{ en: 'energy', fi: 'energia' }, { tex: 'E' }, 'J'],
              [{ en: 'potential / kinetic energy', fi: 'potentiaali- / liike-energia' }, { tex: 'E_p, E_k' }, 'J'],
              [{ en: 'power', fi: 'teho' }, { tex: 'P' }, 'W'],
              [{ en: 'efficiency', fi: 'hyötysuhde' }, { tex: 'η' }, '–']
            ] },
          { id: 't1-units-h2', type: 'h', text: { en: 'Electricity and magnetism', fi: 'Sähkö ja magnetismi' } },
          { id: 't1-units-t4', type: 'table', caption: { en: 'Quantities of electricity and magnetism', fi: 'Sähkön ja magnetismin suureet' },
            head: [{ en: 'Quantity', fi: 'Suure' }, { en: 'Symbol', fi: 'Tunnus' }, { en: 'Unit', fi: 'Yksikkö' }],
            rows: [
              [{ en: 'electric current', fi: 'sähkövirta' }, { tex: 'I' }, 'A'],
              [{ en: 'current density', fi: 'virrantiheys' }, { tex: 'J, S' }, 'A/m²'],
              [{ en: 'electric charge', fi: 'sähkövaraus' }, { tex: 'Q, q' }, 'C'],
              [{ en: 'electric potential', fi: 'sähköinen potentiaali' }, { tex: 'V, φ' }, 'V'],
              [{ en: 'potential difference (voltage)', fi: 'potentiaaliero (jännite)' }, { tex: 'U, V' }, 'V'],
              [{ en: 'electric field strength', fi: 'sähkökentän voimakkuus' }, { tex: 'E' }, 'V/m'],
              [{ en: 'electromotive force (emf)', fi: 'lähdejännite (sähkömotorinen voima)' }, { tex: 'E' }, 'V'],
              [{ en: 'electric flux density', fi: 'sähkövuon tiheys' }, { tex: 'D' }, 'C/m²'],
              [{ en: 'electric flux', fi: 'sähkövuo' }, { tex: 'Ψ' }, 'C'],
              [{ en: 'capacitance', fi: 'kapasitanssi' }, { tex: 'C' }, 'F'],
              [{ en: 'permittivity', fi: 'permittiivisyys' }, { tex: 'ε' }, 'F/m'],
              [{ en: 'permittivity of free space', fi: 'tyhjiön permittiivisyys' }, { tex: 'ε_0' }, 'F/m'],
              [{ en: 'relative permittivity', fi: 'suhteellinen permittiivisyys' }, { tex: 'ε_r' }, '–'],
              [{ en: 'inductance', fi: 'induktanssi' }, { tex: 'L' }, 'H'],
              [{ en: 'mutual inductance', fi: 'keskinäisinduktanssi' }, { tex: 'M, L_{12}' }, 'H'],
              [{ en: 'resistance', fi: 'resistanssi' }, { tex: 'R' }, 'Ω'],
              [{ en: 'resistivity', fi: 'resistiivisyys' }, { tex: 'ρ' }, 'Ω·m'],
              [{ en: 'conductivity', fi: 'konduktiivisuus (johtavuus)' }, { tex: 'γ, σ' }, 'S/m'],
              [{ en: 'phase difference', fi: 'vaihe-ero' }, { tex: 'φ' }, 'rad'],
              [{ en: 'electric dipole moment', fi: 'sähköinen dipolimomentti' }, { tex: 'p' }, 'C·m'],
              [{ en: 'magnetic field strength', fi: 'magneettikentän voimakkuus' }, { tex: 'H' }, 'A/m'],
              [{ en: 'magnetic potential difference', fi: 'magneettinen potentiaaliero' }, { tex: 'U_m' }, 'A'],
              [{ en: 'magnetomotive force', fi: 'magnetomotorinen voima' }, { tex: 'F_m' }, 'A'],
              [{ en: 'magnetic flux density', fi: 'magneettivuon tiheys' }, { tex: 'B' }, 'T'],
              [{ en: 'magnetic flux', fi: 'magneettivuo' }, { tex: 'Φ' }, 'Wb'],
              [{ en: 'permeability', fi: 'permeabiliteetti' }, { tex: 'μ' }, 'H/m'],
              [{ en: 'permeability of vacuum', fi: 'tyhjiön permeabiliteetti' }, { tex: 'μ_0' }, 'H/m'],
              [{ en: 'relative permeability', fi: 'suhteellinen permeabiliteetti' }, { tex: 'μ_r' }, '–'],
              [{ en: 'impedance', fi: 'impedanssi' }, { tex: 'Z' }, 'Ω'],
              [{ en: 'modulus of impedance', fi: 'impedanssin itseisarvo' }, { tex: '|Z|' }, 'Ω'],
              [{ en: 'reactance', fi: 'reaktanssi' }, { tex: 'X' }, 'Ω'],
              [{ en: 'admittance', fi: 'admittanssi' }, { tex: 'Y' }, 'S'],
              [{ en: 'susceptance', fi: 'suskeptanssi' }, { tex: 'B' }, 'S'],
              [{ en: 'conductance', fi: 'konduktanssi' }, { tex: 'G' }, 'S'],
              [{ en: 'reluctance', fi: 'reluktanssi' }, { tex: 'R_m' }, '1/H'],
              [{ en: 'magnetic moment', fi: 'magneettinen momentti' }, { tex: 'm' }, 'A·m²'],
              [{ en: 'magnetization', fi: 'magnetoituma' }, { tex: 'M' }, 'A/m'],
              [{ en: 'active power', fi: 'pätöteho' }, { tex: 'P' }, 'W'],
              [{ en: 'instantaneous power', fi: 'hetkellinen teho' }, { tex: 'p' }, 'W'],
              [{ en: 'apparent power', fi: 'näennäisteho' }, { tex: 'S' }, 'VA'],
              [{ en: 'reactive power', fi: 'loisteho' }, { tex: 'Q' }, 'var'],
              [{ en: 'number of turns in winding', fi: 'kierrosluku' }, { tex: 'N' }, '–'],
              [{ en: 'number of pairs of poles', fi: 'napapariluku' }, { tex: 'p' }, '–']
            ] },
          { id: 't1-units-c1', type: 'callout', kind: 'info', title: { en: 'Note on the slides', fi: 'Huomio kalvoista' }, html: {
            en: '<p>The slides list apparent power as "W, VA" and reactive power as "W, var". The correct units are <b>VA</b> and <b>var</b>; only active power is measured in W. Luminous intensity is normally written <f>I_v</f>.</p>',
            fi: '<p>Kalvoissa näennäisteho on merkitty "W, VA" ja loisteho "W, var". Oikeat yksiköt ovat <b>VA</b> ja <b>var</b>; vain pätöteho mitataan watteina. Valovoiman tunnus on yleensä <f>I_v</f>.</p>' } },
          { id: 't1-units-h3', type: 'h', text: { en: 'SI prefixes', fi: 'SI-etuliitteet' } },
          { id: 't1-units-t5', type: 'table', caption: { en: 'SI prefixes', fi: 'SI-etuliitteet' },
            head: [{ en: 'Prefix', fi: 'Etuliite' }, { en: 'Symbol', fi: 'Tunnus' }, { en: 'Factor', fi: 'Kerroin' }, { en: 'Prefix', fi: 'Etuliite' }, { en: 'Symbol', fi: 'Tunnus' }, { en: 'Factor', fi: 'Kerroin' }],
            rows: [
              ['yotta', 'Y', { tex: '10^{24}' }, 'deci', 'd', { tex: '10^{-1}' }],
              ['zetta', 'Z', { tex: '10^{21}' }, 'centi', 'c', { tex: '10^{-2}' }],
              ['exa', 'E', { tex: '10^{18}' }, 'milli', 'm', { tex: '10^{-3}' }],
              ['peta', 'P', { tex: '10^{15}' }, { en: 'micro', fi: 'mikro' }, 'µ', { tex: '10^{-6}' }],
              ['tera', 'T', { tex: '10^{12}' }, 'nano', 'n', { tex: '10^{-9}' }],
              ['giga', 'G', { tex: '10^{9}' }, 'pico', 'p', { tex: '10^{-12}' }],
              ['mega', 'M', { tex: '10^{6}' }, 'femto', 'f', { tex: '10^{-15}' }],
              ['kilo', 'k', { tex: '10^{3}' }, 'atto', 'a', { tex: '10^{-18}' }],
              ['hecto', 'h', { tex: '10^{2}' }, 'zepto', 'z', { tex: '10^{-21}' }],
              ['deka', 'da', { tex: '10^{1}' }, 'yocto', 'y', { tex: '10^{-24}' }]
            ] },
          { id: 't1-units-w1', type: 'interactive', widget: 'custom', title: { en: 'Prefix and unit converter (extra)', fi: 'Etuliite- ja yksikkömuunnin (extra)' }, // (extra)
            caption: { en: 'Type a value, choose the prefixes and the unit. Try 4.7 kΩ → Ω, 350 µA → mA, 0.5 mV → µV.', fi: 'Kirjoita arvo, valitse etuliitteet ja yksikkö. Kokeile 4,7 kΩ → Ω, 350 µA → mA, 0,5 mV → µV.' },
            config: { mount: mountPrefix } },
          { id: 't1-units-qb', type: 'question', q: 't1-q2' },
          { id: 't1-units-qc', type: 'question', q: 't1-q3' }
        ]
      },

      /* ---------------- 1.2-1.3 Atoms and ions ---------------- */
      {
        id: 't1-atoms', title: { en: 'Atoms, elementary charge and ions', fi: 'Atomit, alkeisvaraus ja ionit' },
        blocks: [
          { id: 't1-atoms-p1', type: 'text', html: {
            en: '<p>All matter consists of <b>atoms</b>: a <dfn data-term="electric_charge">charged</dfn> nucleus (protons + neutrons) surrounded by an electron cloud. The nucleus holds almost all the mass: one proton is about <b>1836 times heavier</b> than an electron.</p><p>Proton and electron carry charges of equal size but opposite sign. A neutral atom has as many electrons as protons; that number is the <b>atomic number</b>.</p>',
            fi: '<p>Kaikki aine koostuu <b>atomeista</b>: varautunut ydin (protonit + neutronit) ja sitä ympäröivä elektronipilvi. Ytimessä on lähes koko massa: yksi protoni on noin <b>1836 kertaa raskaampi</b> kuin elektroni.</p><p>Protonin ja elektronin varaukset ovat yhtä suuret mutta erimerkkiset. Neutraalissa atomissa on yhtä monta elektronia kuin protonia; tämä luku on <b>järjestysluku</b>.</p>' } },
          { id: 't1-atoms-f1', type: 'formula', key: true, tex: 'e = 1{,}602·10^{-19} C', label: { en: 'Elementary charge', fi: 'Alkeisvaraus' } },
          { id: 't1-atoms-t1', type: 'table', caption: { en: 'Particles of the atom', fi: 'Atomin hiukkaset' },
            head: [{ en: 'Particle', fi: 'Hiukkanen' }, { en: 'Location', fi: 'Sijainti' }, { en: 'Mass', fi: 'Massa' }, { en: 'Charge', fi: 'Varaus' }],
            rows: [
              [{ en: 'Proton', fi: 'Protoni' }, { en: 'Nucleus', fi: 'Ydin' }, '1.0073 amu', { en: 'Positive (+e)', fi: 'Positiivinen (+e)' }],
              [{ en: 'Neutron', fi: 'Neutroni' }, { en: 'Nucleus', fi: 'Ydin' }, '1.0087 amu', { en: 'Neutral', fi: 'Neutraali' }],
              [{ en: 'Electron', fi: 'Elektroni' }, { en: 'Electron cloud', fi: 'Elektronipilvi' }, '0.000549 amu', { en: 'Negative (−e)', fi: 'Negatiivinen (−e)' }]
            ] },
          { id: 't1-atoms-h1', type: 'h', text: { en: 'Ions', fi: 'Ionit' } },
          { id: 't1-atoms-p2', type: 'text', html: {
            en: '<p>If an atom loses an electron, it becomes a <b>positive ion (cation)</b>: a hydrogen atom without its electron has <f>Q = +e</f>. An electronegative atom such as chlorine can pull an extra electron and becomes a <b>negative ion (anion)</b>, <f>Q = −e</f>.</p>',
            fi: '<p>Jos atomi menettää elektronin, siitä tulee <b>positiivinen ioni (kationi)</b>: vetyatomilla ilman elektroniaan on <f>Q = +e</f>. Elektronegatiivinen atomi, kuten kloori, voi vetää ylimääräisen elektronin ja muuttuu <b>negatiiviseksi ioniksi (anioniksi)</b>, <f>Q = −e</f>.</p>' } },
          { id: 't1-atoms-w1', type: 'interactive', widget: 'custom', title: { en: 'Atom and ion builder', fi: 'Atomi- ja ionirakentaja' },
            caption: { en: 'Add or remove protons (p) and electrons (e⁻). Watch the net charge Q = (N_p − N_e)·e. Press "Challenge" to build Li⁺, Cl⁻, Cu²⁺ and H⁺.', fi: 'Lisää tai poista protoneja (p) ja elektroneja (e⁻). Seuraa nettovarausta Q = (N_p − N_e)·e. Paina "Haaste" rakentaaksesi Li⁺, Cl⁻, Cu²⁺ ja H⁺.' },
            config: { mount: mountAtom } },
          { id: 't1-atoms-ex1', type: 'example', title: { en: 'Lithium ion', fi: 'Litiumioni' },
            problem: { en: 'A lithium ion has 3 protons and 2 electrons. What is its charge?', fi: 'Litiumionissa on 3 protonia ja 2 elektronia. Mikä on sen varaus?' },
            given: ['N_p = 3', 'N_e = 2'],
            steps: [
              { en: 'Net charge is the number of surplus protons times e:', fi: 'Nettovaraus on ylimääräisten protonien lukumäärä kertaa e:' },
              { tex: 'Q = (N_p − N_e)·e = (3 − 2)·e = +e' },
              { tex: 'Q = 1.602·10^{-19} C' }
            ],
            result: { en: 'Q = +e = 1.602·10⁻¹⁹ C (a positive ion, Li⁺)', fi: 'Q = +e = 1,602·10⁻¹⁹ C (positiivinen ioni, Li⁺)' } },
          { id: 't1-atoms-q1', type: 'question', q: 't1-q1' },
          { id: 't1-atoms-h2', type: 'h', text: { en: 'Valence electrons and common ions', fi: 'Valenssielektronit ja yleisiä ioneja' } },
          { id: 't1-atoms-p3', type: 'text', html: {
            en: '<p>A copper atom (29 protons) has just <b>one electron on its outermost (valence) shell</b>. It is loosely bound and, with a little energy, escapes as a <dfn data-term="free_electron">free electron</dfn>. In metals the valence electrons are shared by all atoms, so there are always free electrons; the metal ions themselves are positive and stay in place. In liquids <em>both</em> positive and negative ions move and carry the current.</p>',
            fi: '<p>Kupariatomilla (29 protonia) on vain <b>yksi elektroni uloimmalla (valenssi)kuorella</b>. Se on löyhästi sidottu ja irtoaa vähällä energialla <dfn data-term="free_electron">vapaaksi elektroniksi</dfn>. Metalleissa valenssielektronit ovat kaikkien atomien yhteisiä, joten vapaita elektroneja on aina; metalli-ionit itse ovat positiivisia ja pysyvät paikallaan. Nesteissä virtaa kuljettavat <em>sekä</em> positiiviset että negatiiviset ionit.</p>' } },
          { id: 't1-atoms-t2', type: 'table', caption: { en: 'Common ions', fi: 'Yleisiä ioneja' },
            head: [{ en: 'Cations', fi: 'Kationit' }, { en: 'Name', fi: 'Nimi' }, { en: 'Anions', fi: 'Anionit' }, { en: 'Name', fi: 'Nimi' }],
            rows: [
              ['H⁺', { en: 'hydrogen', fi: 'vety' }, 'Cl⁻', { en: 'chloride', fi: 'kloridi' }],
              ['Na⁺', { en: 'sodium', fi: 'natrium' }, 'Br⁻', { en: 'bromide', fi: 'bromidi' }],
              ['Ag⁺', { en: 'silver', fi: 'hopea' }, 'F⁻', { en: 'fluoride', fi: 'fluoridi' }],
              ['K⁺', { en: 'potassium', fi: 'kalium' }, 'I⁻', { en: 'iodide', fi: 'jodidi' }],
              ['Li⁺', { en: 'lithium', fi: 'litium' }, 'OH⁻', { en: 'hydroxide', fi: 'hydroksidi' }],
              ['NH₄⁺', { en: 'ammonium', fi: 'ammonium' }, 'NO₃⁻', { en: 'nitrate', fi: 'nitraatti' }],
              ['Ba²⁺', { en: 'barium', fi: 'barium' }, 'O²⁻', { en: 'oxide', fi: 'oksidi' }],
              ['Ca²⁺', { en: 'calcium', fi: 'kalsium' }, 'S²⁻', { en: 'sulphide', fi: 'sulfidi' }],
              ['Cu²⁺', { en: 'copper(II)', fi: 'kupari(II)' }, 'SO₄²⁻', { en: 'sulphate', fi: 'sulfaatti' }],
              ['Mg²⁺', { en: 'magnesium', fi: 'magnesium' }, 'CO₃²⁻', { en: 'carbonate', fi: 'karbonaatti' }],
              ['Zn²⁺', { en: 'zinc', fi: 'sinkki' }, 'HCO₃⁻', { en: 'hydrogencarbonate', fi: 'vetykarbonaatti' }],
              ['Pb²⁺', { en: 'lead', fi: 'lyijy' }, '', ''],
              ['Fe²⁺', { en: 'iron(II)', fi: 'rauta(II)' }, '', ''],
              ['Fe³⁺', { en: 'iron(III)', fi: 'rauta(III)' }, '', ''],
              ['Al³⁺', { en: 'aluminium', fi: 'alumiini' }, '', '']
            ] },
          { id: 't1-atoms-q2', type: 'question', q: 't1-q9' }
        ]
      },

      /* ---------------- 1.4 Materials ---------------- */
      {
        id: 't1-materials', title: { en: 'Electric properties of materials', fi: 'Materiaalien sähköiset ominaisuudet' },
        blocks: [
          { id: 't1-mat-p1', type: 'text', html: {
            en: '<p>Materials are classified by whether they contain <b>free charge carriers</b>.</p>',
            fi: '<p>Materiaalit luokitellaan sen mukaan, onko niissä <b>vapaita varauksenkuljettajia</b>.</p>' } },
          { id: 't1-mat-t1', type: 'table',
            head: [{ en: 'Class', fi: 'Luokka' }, { en: 'Free carriers', fi: 'Vapaat varauksenkuljettajat' }, { en: 'Examples', fi: 'Esimerkkejä' }],
            rows: [
              [{ en: '1. Conductors', fi: '1. Johteet' }, { en: 'free electrons', fi: 'vapaat elektronit' }, { en: 'all metals: silver (best), copper, aluminium', fi: 'kaikki metallit: hopea (paras), kupari, alumiini' }],
              [{ en: '2. Semiconductors', fi: '2. Puolijohteet' }, { en: 'none when pure; released by light, heat or voltage', fi: 'ei puhtaina; vapautuvat valolla, lämmöllä tai jännitteellä' }, { en: 'silicon, germanium (diodes, transistors)', fi: 'pii, germanium (diodit, transistorit)' }],
              [{ en: '3. Insulators', fi: '3. Eristeet' }, { en: 'none', fi: 'ei ole' }, { en: 'glass, mica, polymers (wire insulation)', fi: 'lasi, kiille, polymeerit (johtimen eriste)' }],
              [{ en: '4. Electrolytes', fi: '4. Elektrolyytit' }, { en: 'positive and negative ions', fi: 'positiiviset ja negatiiviset ionit' }, { en: 'salt, acid and base solutions, molten salts', fi: 'suola-, happo- ja emäsliuokset, suolasulat' }]
            ] },
          { id: 't1-mat-cols', type: 'columns', cols: [   // one column: the two callouts stack, one per row
            [{ id: 't1-mat-c1', type: 'callout', kind: 'key', title: { en: 'Doping', fi: 'Seostus' }, html: {
              en: '<p>The conductivity of a semiconductor can be raised by <b>doping</b> it with atoms from group 3 or 5 (e.g. gallium, arsenic).</p>',
              fi: '<p>Puolijohteen johtavuutta voidaan lisätä <b>seostamalla</b> sitä kolmannen tai viidennen ryhmän atomeilla (esim. gallium, arseeni).</p>' } },
             { id: 't1-mat-c2', type: 'callout', kind: 'warn', title: { en: 'Misconception: "water conducts"', fi: 'Harhakäsitys: "vesi johtaa"' }, html: {
              en: '<p>Only water with dissolved ions conducts. NaCl(s) → Na⁺(aq) + Cl⁻(aq): the ions carry the current. <b>Deionized water is an insulator</b>; natural water conducts.</p>',
              fi: '<p>Vain liuenneita ioneja sisältävä vesi johtaa. NaCl(s) → Na⁺(aq) + Cl⁻(aq): ionit kuljettavat virran. <b>Ioniton vesi on eriste</b>; luonnonvesi johtaa.</p>' } }]
          ] },
          { id: 't1-mat-q1', type: 'question', q: 't1-q4' }
        ]
      },

      /* ---------------- 1.5 Charge and current ---------------- */
      {
        id: 't1-charge', title: { en: 'Electric charge, phenomena and current', fi: 'Sähkövaraus, ilmiöt ja virta' },
        blocks: [
          { id: 't1-ch-p1', type: 'text', html: {
            en: '<p>Electric charge <f>Q</f> (or <f>q</f>) has the unit <b>coulomb</b>, <f>[Q] = A·s = C</f>. It is <b>quantized</b>: any charge is a whole number of elementary charges.</p>',
            fi: '<p>Sähkövarauksen <f>Q</f> (tai <f>q</f>) yksikkö on <b>coulombi</b>, <f>[Q] = A·s = C</f>. Varaus on <b>kvantittunut</b>: mikä tahansa varaus on alkeisvarauksen kokonaislukukerrannainen.</p>' } },
          { id: 't1-ch-f1', type: 'formula', key: true, tex: 'Q = ±N·e,   Q = (N_p − N_e)·e', label: { en: 'Charge of a body', fi: 'Kappaleen varaus' } },
          { id: 't1-ch-h1', type: 'h', text: { en: 'What charges do', fi: 'Mitä varaukset saavat aikaan' } },
          { id: 't1-ch-l1', type: 'list', items: [
            { en: 'A charge <b>at rest</b> has an <b>electric field</b> around it.', fi: '<b>Lepäävää</b> varausta ympäröi <b>sähkökenttä</b>.' },
            { en: 'A charge <b>moving at constant velocity</b> also has a <b>magnetic field</b> around it.', fi: '<b>Tasaisella nopeudella liikkuvaa</b> varausta ympäröi myös <b>magneettikenttä</b>.' },
            { en: 'An <b>accelerating</b> charge emits <b>electromagnetic waves</b>.', fi: '<b>Kiihtyvä</b> varaus säteilee <b>sähkömagneettisia aaltoja</b>.' },
            { en: 'Separating positive and negative charges creates a potential difference (voltage).', fi: 'Positiivisten ja negatiivisten varausten erottaminen synnyttää potentiaalieron (jännitteen).' }
          ] },
          { id: 't1-ch-q1', type: 'question', q: 't1-q5' },
          { id: 't1-ch-h2', type: 'h', text: { en: 'Moving charge is current', fi: 'Liikkuva varaus on virta' } },
          { id: 't1-ch-f2', type: 'formula', key: true, tex: 'Q = N·e = I·t,   I = {Q}/{t}', label: { en: 'Charge and current', fi: 'Varaus ja virta' },
            legend: [['I', { en: 'current', fi: 'virta' }, 'A = C/s'], ['t', { en: 'time', fi: 'aika' }, 's'], ['N', { en: 'number of elementary charges', fi: 'alkeisvarausten lukumäärä' }, '–']] },
          { id: 't1-ch-w1', type: 'interactive', widget: 'custom', title: { en: 'Current as charge flow', fi: 'Virta varauksen virtauksena' },
            caption: { en: 'Electrons drift opposite to the conventional current direction. Increase I and watch the flow speed up; the numbers give the charge Q and the count of elementary charges that pass in time t.', fi: 'Elektronit ajautuvat virran sovitun suunnan vastaan. Kasvata I:tä ja seuraa virtauksen nopeutumista; luvut kertovat ajassa t kulkevan varauksen Q ja alkeisvarausten lukumäärän.' },
            config: { mount: mountFlow } },
          { id: 't1-ch-ex1', type: 'example', title: { en: 'How many electrons?', fi: 'Montako elektronia?' },
            problem: { en: 'A current of 2.0 A flows for 5.0 s. How much charge passes and how many elementary charges is that?', fi: 'Virta 2,0 A kulkee 5,0 s. Kuinka suuri varaus siirtyy ja montako alkeisvarausta se on?' },
            given: ['I = 2.0 A', 't = 5.0 s', 'e = 1.602·10^-19 C'],
            steps: [
              { tex: 'Q = I·t = 2.0 A · 5.0 s = 10 C' },
              { tex: 'N = Q/e = 10 / 1.602·10^{-19} ≈ 6.24·10^{19}' }
            ],
            result: { en: 'Q = 10 C, N ≈ 6.2·10¹⁹ elementary charges', fi: 'Q = 10 C, N ≈ 6,2·10¹⁹ alkeisvarausta' } },
          { id: 't1-ch-q2', type: 'question', q: 't1-q10' }
        ]
      },

      /* ---------------- 1.6 Coulomb ---------------- */
      {
        id: 't1-coulomb', title: { en: "Coulomb's law and permittivity", fi: 'Coulombin laki ja permittiivisyys' },
        blocks: [
          { id: 't1-co-p1', type: 'text', html: {
            en: '<p><b>Like charges repel, unlike charges attract.</b> The two forces are equal and opposite: <f>F_{21} = −F_{12}</f>, <f>|F_{21}| = |F_{12}|</f>. The size of the force follows an <b>inverse-square law</b>.</p>',
            fi: '<p><b>Samanmerkkiset varaukset hylkivät, erimerkkiset vetävät puoleensa.</b> Voimat ovat yhtä suuret ja vastakkaissuuntaiset: <f>F_{21} = −F_{12}</f>, <f>|F_{21}| = |F_{12}|</f>. Voiman suuruus noudattaa <b>käänteisen neliön lakia</b>.</p>' } },
          { id: 't1-co-f1', type: 'formula', key: true, tex: 'F = {1}/{4π ε_0 ε_r}·{Q_1 Q_2}/{r²} = k·{Q_1 Q_2}/{ε_r r²}', label: { en: "Coulomb's law", fi: 'Coulombin laki' },
            legend: [['k', { en: 'Coulomb constant, 1/(4πε₀) ≈ 9.0·10⁹', fi: 'Coulombin vakio, 1/(4πε₀) ≈ 9,0·10⁹' }, 'N·m²/C²'], ['ε_r', { en: 'relative permittivity of the medium', fi: 'väliaineen suhteellinen permittiivisyys' }, '–'], ['r', { en: 'distance between the charges', fi: 'varausten etäisyys' }, 'm']] },
          { id: 't1-co-p2', type: 'text', html: {
            en: '<p><dfn data-term="permittivity">Permittivity</dfn> is <f>ε = ε_0·ε_r</f>, where <f>ε_0 ≈ 8.85·10^{-12} F/m</f> is the permittivity of free space and <f>ε_r = ε/ε_0</f> the relative permittivity. The vacuum is the best insulator, <f>ε_r = 1</f>; in any other medium the force is divided by <f>ε_r</f>.</p>',
            fi: '<p><dfn data-term="permittivity">Permittiivisyys</dfn> on <f>ε = ε_0·ε_r</f>, missä <f>ε_0 ≈ 8,85·10^{-12} F/m</f> on tyhjiön permittiivisyys ja <f>ε_r = ε/ε_0</f> suhteellinen permittiivisyys. Tyhjiö on paras eriste, <f>ε_r = 1</f>; muussa väliaineessa voima jaetaan luvulla <f>ε_r</f>.</p>' } },
          { id: 't1-co-t1', type: 'table', caption: { en: 'Relative permittivities', fi: 'Suhteellisia permittiivisyyksiä' },
            head: [{ en: 'Material', fi: 'Aine' }, { tex: 'ε_r' }],
            rows: [
              [{ en: 'vacuum', fi: 'tyhjiö' }, '1'], [{ en: 'air', fi: 'ilma' }, '≈ 1'], ['teflon', '2'], [{ en: 'wood', fi: 'puu' }, '2 – 7'],
              [{ en: 'glass', fi: 'lasi' }, '5 – 15'], [{ en: 'porcelain', fi: 'posliini' }, '5 – 6'], [{ en: 'mica', fi: 'kiille' }, '6'],
              [{ en: 'deionized water', fi: 'ioniton vesi' }, '81'], [{ en: 'transformer oil', fi: 'muuntajaöljy' }, '2.2']
            ] },
          { id: 't1-co-w1', type: 'interactive', widget: 'custom', title: { en: 'Coulomb force playground', fi: 'Coulombin voiman leikkikenttä' },
            caption: { en: 'Change the charges, the distance and the medium. Double the distance and read the force again: it drops to a quarter. Change the sign of one charge and the arrows turn around.', fi: 'Muuta varauksia, etäisyyttä ja väliainetta. Kaksinkertaista etäisyys ja lue voima uudelleen: se putoaa neljännekseen. Vaihda toisen varauksen merkki ja nuolet kääntyvät.' },
            config: { mount: mountCoulomb } },
          { id: 't1-co-ex1', type: 'example', title: { en: 'Two charges of 1 C', fi: 'Kaksi 1 C:n varausta' },
            problem: { en: 'Two positive charges of 1.0 C are 1.0 m apart. Find the force (a) in air, (b) in deionized water (ε_r = 81).', fi: 'Kaksi positiivista 1,0 C:n varausta on 1,0 m:n etäisyydellä toisistaan. Laske voima (a) ilmassa, (b) ionittomassa vedessä (ε_r = 81).' },
            given: ['Q_1 = Q_2 = 1.0 C', 'r = 1.0 m', 'k = 9.0·10^9 N·m²/C²'],
            steps: [
              { en: 'a) In air ε_r ≈ 1:', fi: 'a) Ilmassa ε_r ≈ 1:' },
              { tex: 'F = k Q²/r² = 9.0·10^9 · 1.0² / 1.0² = 9.0·10^9 N' },
              { en: 'b) In water the force is divided by ε_r = 81:', fi: 'b) Vedessä voima jaetaan luvulla ε_r = 81:' },
              { tex: 'F = F_{air}/ε_r = 9.0·10^9 / 81 ≈ 1.1·10^8 N' }
            ],
            result: { en: 'a) 9.0·10⁹ N, b) ≈ 1.1·10⁸ N (≈ 110 MN)', fi: 'a) 9,0·10⁹ N, b) ≈ 1,1·10⁸ N (≈ 110 MN)' } },
          { id: 't1-co-c1', type: 'callout', kind: 'tip', title: { en: 'Why so huge?', fi: 'Miksi näin valtava?' }, html: {
            en: '<p>1 C is an enormous charge (about 6·10¹⁸ elementary charges). Real electrostatic charges are µC or nC, so forces are mN to N.</p>',
            fi: '<p>1 C on valtava varaus (noin 6·10¹⁸ alkeisvarausta). Todelliset sähköstaattiset varaukset ovat µC- tai nC-luokkaa, jolloin voimat ovat mN–N.</p>' } },
          { id: 't1-co-q1', type: 'question', q: 't1-q6' }
        ]
      },

      /* ---------------- 1.7 Electric field ---------------- */
      {
        id: 't1-field', title: { en: 'Electric field', fi: 'Sähkökenttä' },
        blocks: [
          { id: 't1-fi-p1', type: 'text', html: {
            en: '<p>A charge at rest is surrounded by an <dfn data-term="electric_field">electric field</dfn>. Its strength is the force on a small <b>positive test charge</b> <f>Q</f>; <f>E</f> is parallel to <f>F</f>. For a point charge the field is spherically symmetric and follows the inverse-square law.</p>',
            fi: '<p>Lepäävää varausta ympäröi <dfn data-term="electric_field">sähkökenttä</dfn>. Sen voimakkuus on pieneen <b>positiiviseen koevaraukseen</b> <f>Q</f> kohdistuva voima; <f>E</f> on yhdensuuntainen <f>F</f>:n kanssa. Pistevarauksen kenttä on pallosymmetrinen ja noudattaa käänteisen neliön lakia.</p>' } },
          { id: 't1-fi-f1', type: 'formula', key: true, tex: 'E = {F}/{Q},   E = {kQ}/{r²}', label: { en: 'Electric field strength', fi: 'Sähkökentän voimakkuus' },
            legend: [['E', { en: 'field strength', fi: 'kentän voimakkuus' }, 'N/C = V/m'], ['Q', { en: 'source charge', fi: 'lähdevaraus' }, 'C'], ['r', { en: 'distance from the charge', fi: 'etäisyys varauksesta' }, 'm']] },
          { id: 't1-fi-p2', type: 'text', html: {
            en: '<p><b>Field lines</b> start on positive charges and end on negative charges; the denser the lines, the stronger the field. In the sketcher below, drag the charges and probe the field.</p>',
            fi: '<p><b>Kenttäviivat</b> alkavat positiivisista varauksista ja päättyvät negatiivisiin; mitä tiheämmässä viivat ovat, sitä voimakkaampi kenttä on. Alla olevassa piirturissa voit vetää varauksia ja tutkia kenttää.</p>' } },
          { id: 't1-fi-w1', type: 'interactive', widget: 'custom', title: { en: 'Field line sketcher', fi: 'Kenttäviivapiirturi' },
            caption: { en: 'Add or drag charges. Dashed lines are equipotential contours (every 10 V). Move the pointer to probe E and V; notice that E points along the field lines and perpendicular to the equipotentials.', fi: 'Lisää tai vedä varauksia. Katkoviivat ovat tasapotentiaalikäyriä (10 V välein). Liikuta osoitinta mitataksesi E:n ja V:n; huomaa, että E osoittaa kenttäviivojen suuntaan ja kohtisuoraan tasapotentiaaleja vastaan.' },
            config: { mount: mountField } },
          { id: 't1-fi-q1', type: 'question', q: 't1-q8' }
        ]
      },

      /* ---------------- 1.8 Potential, voltage ---------------- */
      {
        id: 't1-potential', title: { en: 'Potential and voltage', fi: 'Potentiaali ja jännite' },
        blocks: [
          { id: 't1-po-p1', type: 'text', html: {
            en: '<p>The <dfn data-term="potential">potential</dfn> at a point is the potential energy per unit charge, <f>V = U_p/q</f>. It depends on the charges that create the field, <em>not</em> on the test charge. For a point charge:</p>',
            fi: '<p><dfn data-term="potential">Potentiaali</dfn> pisteessä on potentiaalienergia varausyksikköä kohti, <f>V = U_p/q</f>. Se riippuu kentän synnyttävistä varauksista, <em>ei</em> koevarauksesta. Pistevarauksella:</p>' } },
          { id: 't1-po-f1', type: 'formula', key: true, tex: 'V = {kQ}/{r},   U = V_a − V_b', label: { en: 'Potential of a point charge and voltage', fi: 'Pistevarauksen potentiaali ja jännite' },
            legend: [['V', { en: 'potential', fi: 'potentiaali' }, 'V = J/C'], ['U', { en: 'voltage (potential difference)', fi: 'jännite (potentiaaliero)' }, 'V']] },
          { id: 't1-po-p2', type: 'text', html: {
            en: '<p><b>Equipotential lines</b> (2D) or <b>surfaces</b> (3D) are always <b>perpendicular to the field</b>. The zero of potential is arbitrary; usually the ground (earth) is chosen as 0 V. The unit is <f>[V] = J/C = V</f> (volt). Europeans write <f>U</f> for measured voltage.</p>',
            fi: '<p><b>Tasapotentiaaliviivat</b> (2D) tai <b>-pinnat</b> (3D) ovat aina <b>kohtisuorassa kenttää vastaan</b>. Potentiaalin nollataso valitaan vapaasti; yleensä nollaksi valitaan maa. Yksikkö on <f>[V] = J/C = V</f> (voltti). Mitatusta jännitteestä käytetään Euroopassa tunnusta <f>U</f>.</p>' } },
          { id: 't1-po-ex1', type: 'example', title: { en: 'Field and potential of a point charge', fi: 'Pistevarauksen kenttä ja potentiaali' },
            problem: { en: 'A point charge Q = 2.5 µC. Find E and V at r_a = 3.0 m and r_b = 5.0 m, and the voltage U = V_a − V_b.', fi: 'Pistevaraus Q = 2,5 µC. Laske E ja V etäisyyksillä r_a = 3,0 m ja r_b = 5,0 m sekä jännite U = V_a − V_b.' },
            given: ['Q = 2.5 µC', 'r_a = 3.0 m', 'r_b = 5.0 m'],
            steps: [
              { tex: 'E_a = kQ/r_a² = 9.0·10^9 · 2.5·10^{-6} / 3² = 2500 V/m' },
              { tex: 'E_b = kQ/r_b² = 9.0·10^9 · 2.5·10^{-6} / 5² = 900 V/m' },
              { tex: 'V_a = kQ/r_a = 7.5 kV,   V_b = kQ/r_b = 4.5 kV' },
              { tex: 'U = V_a − V_b = 3.0 kV' }
            ],
            result: { en: 'E_a = 2500 V/m, E_b = 900 V/m, V_a = 7.5 kV, V_b = 4.5 kV, U = 3.0 kV', fi: 'E_a = 2500 V/m, E_b = 900 V/m, V_a = 7,5 kV, V_b = 4,5 kV, U = 3,0 kV' } },
          { id: 't1-po-q1', type: 'question', q: 't1-q11' },
          { id: 't1-po-h1', type: 'h', text: { en: 'Uniform field between parallel plates', fi: 'Homogeeninen kenttä levyjen välissä' } },
          { id: 't1-po-p3', type: 'text', html: {
            en: '<p>Moving a test charge <f>q</f> a distance <f>d</f> along a uniform field takes the work <f>W = F·d = q·E·d</f>. Dividing by <f>q</f> gives the voltage between the plates:</p>',
            fi: '<p>Koevarauksen <f>q</f> siirtäminen matka <f>d</f> homogeenisessa kentässä vaatii työn <f>W = F·d = q·E·d</f>. Jakamalla <f>q</f>:lla saadaan levyjen välinen jännite:</p>' } },
          { id: 't1-po-f2', type: 'formula', key: true, tex: 'U = V_a − V_b = {W}/{q} = E·d,   E = {U}/{d}', label: { en: 'Uniform field', fi: 'Homogeeninen kenttä' } },
          { id: 't1-po-c1', type: 'callout', kind: 'warn', title: { en: 'Only for uniform fields', fi: 'Vain homogeeniselle kentälle' }, html: {
            en: '<p><f>E = U/d</f> holds <b>only</b> for a uniform field. Near a point charge the field changes with r, so use <f>E = kQ/r²</f>.</p>',
            fi: '<p><f>E = U/d</f> pätee <b>vain</b> homogeeniselle kentälle. Pistevarauksen lähellä kenttä muuttuu etäisyyden r mukana, joten käytä kaavaa <f>E = kQ/r²</f>.</p>' } },
          { id: 't1-po-w1', type: 'interactive', widget: 'custom', title: { en: 'Parallel plates', fi: 'Rinnakkaiset levyt' },
            caption: { en: 'Change U and d: the arrows get thicker with a stronger field and the five equipotential lines (U, 3U/4, …, 0) stay evenly spaced. Move the test charge and read V and the work to bring it to the negative plate.', fi: 'Muuta U:ta ja d:tä: nuolet paksunevat kentän voimistuessa ja viisi tasapotentiaaliviivaa (U, 3U/4, …, 0) pysyvät tasavälein. Siirrä koevarausta ja lue V sekä työ, joka tarvitaan sen viemiseksi negatiiviselle levylle.' },
            config: { mount: mountPlates } },
          { id: 't1-po-q2', type: 'question', q: 't1-q12' },
          { id: 't1-po-h2', type: 'h', text: { en: 'Typical voltages', fi: 'Tyypillisiä jännitteitä' } },
          { id: 't1-po-t1', type: 'table', caption: { en: 'Typical voltages', fi: 'Tyypillisiä jännitteitä' },
            head: [{ en: 'Situation', fi: 'Tilanne' }, { en: 'Voltage', fi: 'Jännite' }],
            rows: [
              [{ en: 'thundercloud to ground', fi: 'ukkospilvi – maa' }, { tex: '10^8 V' }],
              [{ en: 'high-voltage line', fi: 'suurjännitelinja' }, { tex: '10^5 – 10^6 V' }],
              [{ en: 'TV tube supply', fi: 'kuvaputken syöttö' }, { tex: '10^4 V' }],
              [{ en: 'car ignition', fi: 'auton sytytys' }, { tex: '10^4 V' }],
              [{ en: 'household outlet', fi: 'pistorasia' }, { tex: '10^2 V' }],
              [{ en: 'car battery', fi: 'auton akku' }, '12 V'],
              [{ en: 'flashlight battery', fi: 'taskulampun paristo' }, '1.5 V'],
              [{ en: 'resting potential of a nerve membrane', fi: 'hermosolukalvon lepopotentiaali' }, { tex: '10^{-1} V' }],
              [{ en: 'EKG / EEG skin potential changes', fi: 'EKG / EEG ihopotentiaalin muutokset' }, { tex: '10^{-4} V' }]
            ] },
          { id: 't1-po-c2', type: 'callout', kind: 'info', title: { en: 'Ground symbols', fi: 'Maasymbolit' }, html: {
            en: '<p>Ground (earth) is a common reference with <b>0 V</b>. Three ground symbols are used: earth ground, chassis ground and signal ground; in this course all mean "the 0 V reference node".</p>',
            fi: '<p>Maa on yhteinen vertailupiste, jonka potentiaali on <b>0 V</b>. Käytössä on kolme maasymbolia: suojamaa, runkomaa ja signaalimaa; tällä kurssilla ne kaikki tarkoittavat "0 V:n vertailusolmua".</p>' } }
        ]
      },

      /* ---------------- 1.9 Sphere ---------------- */
      {
        id: 't1-sphere', title: { en: 'Charged metal sphere and conductors', fi: 'Varattu metallipallo ja johteet' },
        blocks: [
          { id: 't1-sp-p1', type: 'text', html: {
            en: '<p>A metal sphere of radius <f>R</f> carries charge <f>Q</f> on its surface. In electrostatics:</p><ul><li><b>inside</b> (<f>r &lt; R</f>): <f>E = 0</f>, potential constant;</li><li><b>outside</b> (<f>r ≥ R</f>): the field is that of a point charge.</li></ul>',
            fi: '<p>Metallipallon (säde <f>R</f>) varaus <f>Q</f> sijaitsee pinnalla. Sähköstatiikassa:</p><ul><li><b>sisällä</b> (<f>r &lt; R</f>): <f>E = 0</f>, potentiaali vakio;</li><li><b>ulkopuolella</b> (<f>r ≥ R</f>): kenttä on kuin pistevarauksen.</li></ul>' } },
          { id: 't1-sp-f1', type: 'formula', key: true, tex: 'E = {Q}/{4π ε_0 r²},   V = {Q}/{4π ε_0 r}   (r ≥ R);   E = 0,  V = {Q}/{4π ε_0 R}   (r < R)', label: { en: 'Charged metal sphere', fi: 'Varattu metallipallo' } },
          { id: 't1-sp-w1', type: 'interactive', widget: 'plot', title: { en: 'E(r) of a charged metal sphere', fi: 'Varatun metallipallon E(r)' },
            caption: { en: 'E is zero inside, jumps to its maximum at the surface and then falls as 1/r². Change Q and R.', fi: 'E on nolla sisällä, hyppää maksimiinsa pinnalla ja pienenee sitten kuten 1/r². Muuta Q:ta ja R:ää.' },
            config: {
              x: { min: 0, max: 1, label: { en: 'Distance r from the centre', fi: 'Etäisyys r keskipisteestä' }, unit: 'm' },
              y: { min: 0, max: 1000, auto: true, label: { en: 'Field strength E', fi: 'Kentän voimakkuus E' }, unit: 'V/m' },
              params: [{ id: 'Q', tex: 'Q', min: 1e-10, max: 1e-8, value: 1e-9, unit: 'C', log: true }, { id: 'R', tex: 'R', min: 0.05, max: 0.5, value: 0.2, unit: 'm' }],
              curves: [{ fn: function (x, p) { return x < p.R ? 0 : K * p.Q / (x * x); }, label: { en: 'E(r)', fi: 'E(r)' }, color: '--c-2' }],
              vlines: function (p) { return [{ x: p.R, label: { en: 'surface r = R', fi: 'pinta r = R' } }]; },
              readouts: function (p) { return [{ tex: 'E(R)', value: K * p.Q / (p.R * p.R), unit: 'V/m' }]; }
            } },
          { id: 't1-sp-w2', type: 'interactive', widget: 'plot', title: { en: 'V(r) of a charged metal sphere', fi: 'Varatun metallipallon V(r)' },
            caption: { en: 'The potential is constant inside (equal to the surface value) and falls as 1/r outside: the conductor is an equipotential body.', fi: 'Potentiaali on vakio sisällä (yhtä suuri kuin pinnalla) ja pienenee kuten 1/r ulkona: johde on tasapotentiaalinen kappale.' },
            config: {
              x: { min: 0, max: 1, label: { en: 'Distance r from the centre', fi: 'Etäisyys r keskipisteestä' }, unit: 'm' },
              y: { min: 0, max: 100, auto: true, label: { en: 'Potential V', fi: 'Potentiaali V' }, unit: 'V' },
              params: [{ id: 'Q', tex: 'Q', min: 1e-10, max: 1e-8, value: 1e-9, unit: 'C', log: true }, { id: 'R', tex: 'R', min: 0.05, max: 0.5, value: 0.2, unit: 'm' }],
              curves: [{ fn: function (x, p) { return K * p.Q / Math.max(x, p.R); }, label: { en: 'V(r)', fi: 'V(r)' }, color: '--c-1' }],
              vlines: function (p) { return [{ x: p.R, label: { en: 'surface r = R', fi: 'pinta r = R' } }]; },
              readouts: function (p) { return [{ tex: 'V_{surface}', value: K * p.Q / p.R, unit: 'V' }]; }
            } },
          { id: 't1-sp-c1', type: 'callout', kind: 'key', title: { en: 'Applications', fi: 'Sovelluksia' }, html: {
            en: '<ul><li><b>Grounding systems</b> with copper cables hold conductors at ground potential.</li><li><b>Faraday cage:</b> a closed metal box has no field inside. It shields equipment from EMP/EMC/EMI; cable shields and filters work the same way.</li></ul>',
            fi: '<ul><li><b>Maadoitusjärjestelmät</b> kuparikaapeleilla pitävät johteet maapotentiaalissa.</li><li><b>Faradayn häkki:</b> suljetun metallilaatikon sisällä ei ole kenttää. Se suojaa laitteita EMP-, EMC- ja EMI-häiriöiltä; kaapelien suojavaipat ja suodattimet toimivat samalla periaatteella.</li></ul>' } },
          { id: 't1-sp-q1', type: 'question', q: 't1-q19' }
        ]
      },

      /* ---------------- 1.10 Summary, power, energy ---------------- */
      {
        id: 't1-summary', title: { en: 'Electrical variables: current, voltage, power, energy', fi: 'Sähkösuureet: virta, jännite, teho, energia' },
        blocks: [
          { id: 't1-su-t1', type: 'table', caption: { en: 'Summary of electrical variables', fi: 'Yhteenveto sähkösuureista' },
            head: [{ en: 'Quantity', fi: 'Suure' }, { en: 'Definition', fi: 'Määritelmä' }, { en: 'Unit', fi: 'Yksikkö' }],
            rows: [
              [{ en: 'charge Q, q', fi: 'varaus Q, q' }, { tex: 'e = 1.602·10^{-19} C' }, 'C = A·s'],
              [{ en: 'electric field E (vector, force field)', fi: 'sähkökenttä E (vektori, voimakenttä)' }, { tex: 'E = F/q,  q > 0' }, 'N/C = V/m'],
              [{ en: 'current I, i', fi: 'virta I, i' }, { tex: 'i(t) = dQ/dt,  I = Q/t' }, 'A'],
              [{ en: 'potential V (scalar field)', fi: 'potentiaali V (skalaarikenttä)' }, { tex: 'V = U_p/q' }, 'J/C = V'],
              [{ en: 'voltage (potential difference)', fi: 'jännite (potentiaaliero)' }, { tex: 'V = V_2 − V_1' }, 'V'],
              [{ en: 'instantaneous power', fi: 'hetkellinen teho' }, { tex: 'p(t) = dE/dt = u(t)·i(t)' }, 'W = J/s'],
              [{ en: 'energy', fi: 'energia' }, { tex: 'E = ∫_0^t p(t) dt' }, 'J'],
              [{ en: 'active power', fi: 'pätöteho' }, { tex: 'P = E/t = {1}/{t}∫_0^t p dt' }, 'W']
            ] },
          { id: 't1-su-c1', type: 'callout', kind: 'key', title: { en: 'Directions', fi: 'Suunnat' }, html: {
            en: '<p>The positive direction of <b>current</b> is the direction in which positive charge moves (electrons actually move opposite). The <b>voltage arrow</b> between points 1 and 2 shows <f>V = V_2 − V_1</f>: it points from the lower potential to the higher one when <f>V &gt; 0</f>.</p>',
            fi: '<p><b>Virran</b> positiivinen suunta on positiivisen varauksen liikesuunta (elektronit liikkuvat todellisuudessa vastakkaiseen suuntaan). <b>Jännitenuoli</b> pisteiden 1 ja 2 välillä esittää suuretta <f>V = V_2 − V_1</f>: se osoittaa matalammasta potentiaalista korkeampaan, kun <f>V &gt; 0</f>.</p>' } },
          { id: 't1-su-f1', type: 'formula', key: true, tex: 'P = U·I,   E = U·I·t = P·t', label: { en: 'DC power and energy', fi: 'Tasasähkön teho ja energia' },
            legend: [['P', { en: 'power', fi: 'teho' }, 'W'], ['E', { en: 'energy', fi: 'energia' }, 'J = W·s'], ['t', { en: 'time', fi: 'aika' }, 's']] },
          { id: 't1-su-w1', type: 'interactive', widget: 'readout', title: { en: 'Power and energy calculator (extra)', fi: 'Teho- ja energialaskin (extra)' }, // (extra)
            caption: { en: 'Choose the voltage across a resistor, its resistance and the time. Notice that the energy in kWh is what the electricity meter shows (1 kWh = 3.6 MJ).', fi: 'Valitse vastuksen jännite, resistanssi ja aika. Huomaa, että kWh-energia on se, mitä sähkömittari näyttää (1 kWh = 3,6 MJ).' },
            config: energyCfg },
          { id: 't1-su-q1', type: 'question', q: 't1-q13' }
        ]
      },

      /* ---------------- 1.11 Resistance ---------------- */
      {
        id: 't1-resistance', title: { en: 'Resistance, short circuit and open circuit', fi: 'Resistanssi, oikosulku ja avoin piiri' },
        blocks: [
          { id: 't1-re-p1', type: 'text', html: {
            en: '<p><dfn data-term="resistance">Resistance</dfn> <f>R</f> has the unit <b>ohm</b>, <f>Ω = V/A</f>. It models both conductors and insulators. A <dfn data-term="resistor">resistor</dfn> is <b>passive</b>: it converts energy from the source into <b>heat</b>. It is bipolar and behaves the same in both directions; it is used to limit and control currents.</p>',
            fi: '<p><dfn data-term="resistance">Resistanssin</dfn> <f>R</f> yksikkö on <b>ohmi</b>, <f>Ω = V/A</f>. Sillä mallinnetaan sekä johteita että eristeitä. <dfn data-term="resistor">Vastus</dfn> on <b>passiivinen</b>: se muuttaa lähteen energiaa <b>lämmöksi</b>. Se on kaksinapainen ja toimii samoin molempiin suuntiin; sillä rajoitetaan ja säädetään virtoja.</p>' } },
          { id: 't1-re-f1', type: 'formula', key: true, tex: 'U = R·I,   P = U·I = R·I² = {U²}/{R}', label: { en: "Ohm's law and resistive power", fi: 'Ohmin laki ja resistiivinen teho' } },
          { id: 't1-re-cols', type: 'columns', cols: [
            [{ id: 't1-re-c1', type: 'callout', kind: 'key', title: { en: 'Short circuit: R = 0', fi: 'Oikosulku: R = 0' }, html: {
              en: '<p>An ideal conductor: <f>U = 0</f> whatever the current.</p>', fi: '<p>Ihanteellinen johdin: <f>U = 0</f> virrasta riippumatta.</p>' } }],
            [{ id: 't1-re-c2', type: 'callout', kind: 'key', title: { en: 'Open circuit: R = ∞', fi: 'Avoin piiri: R = ∞' }, html: {
              en: '<p>An ideal insulator: <f>I = 0</f> whatever the voltage.</p>', fi: '<p>Ihanteellinen eriste: <f>I = 0</f> jännitteestä riippumatta.</p>' } }]
          ] },
          { id: 't1-re-w1', type: 'interactive', widget: 'circuit', title: { en: 'Short a resistor, open the circuit', fi: 'Oikosulje vastus, avaa piiri' },
            caption: { en: 'Click the switch to open the circuit (I = 0). Choose the wire tool 〰 and connect both ends of R2: the current rises as R2 is bypassed. Edit R1, R2 and the source value by clicking them.', fi: 'Napsauta kytkintä avataksesi piirin (I = 0). Valitse johdintyökalu 〰 ja yhdistä R2:n molemmat päät: virta kasvaa, kun R2 ohitetaan. Muokkaa R1:tä, R2:ta ja lähdettä napsauttamalla niitä.' },
            config: {
              size: [8, 4],
              parts: [
                { id: 'U1', type: 'V', a: [0, 4], b: [0, 0], value: 12, editable: { min: 0, max: 24, step: 1 } },
                { id: 'S1', type: 'switch', a: [0, 0], b: [1, 0], closed: true },
                { id: 'R1', type: 'R', a: [1, 0], b: [4, 0], value: 100, editable: { min: 10, max: 1000, step: 10 }, label: 'R1' },
                { id: 'R2', type: 'R', a: [5, 0], b: [8, 0], value: 200, editable: { min: 10, max: 1000, step: 10 }, label: 'R2' },
                { id: 'A1', type: 'ammeter', a: [8, 1], b: [8, 4] }
              ],
              wires: [[[4, 0], [5, 0]], [[8, 0], [8, 1]], [[8, 4], [0, 4]]],
              tools: ['wire', 'cut'], show: { values: true, flow: true }, table: true
            } },
          { id: 't1-re-q1', type: 'question', q: 't1-q14' }
        ]
      },

      /* ---------------- 1.12 DC circuits ---------------- */
      {
        id: 't1-dc', title: { en: 'DC circuits: components and structure', fi: 'Tasasähköpiirit: komponentit ja rakenne' },
        blocks: [
          { id: 't1-dc-p1', type: 'text', html: {
            en: '<p>A DC circuit is built from wires, <b>sources</b>, <b>resistors</b> (lamps are resistors too), fuses and switches. <b>Passive</b> components (resistors) dissipate power; <b>active</b> components (voltage and current sources) deliver energy. All are <b>bipolar</b>: two terminals, one current and one voltage.</p>',
            fi: '<p>Tasasähköpiiri koostuu johtimista, <b>lähteistä</b>, <b>vastuksista</b> (myös lamput ovat vastuksia), sulakkeista ja kytkimistä. <b>Passiiviset</b> komponentit (vastukset) kuluttavat tehoa; <b>aktiiviset</b> komponentit (jännite- ja virtalähteet) tuottavat energiaa. Kaikki ovat <b>kaksinapaisia</b>: kaksi napaa, yksi virta ja yksi jännite.</p>' } },
          { id: 't1-dc-h1', type: 'h', text: { en: 'Sign convention', fi: 'Etumerkkisopimus' } },
          { id: 't1-dc-p2', type: 'text', html: {
            en: '<p>For a resistor, <f>U = R·I</f> when the voltage and current reference arrows are chosen "the same way" (current enters the + terminal) and <f>U = −R·I</f> when they are opposite. The physical situation never changes, only the signs.</p>',
            fi: '<p>Vastuksella <f>U = R·I</f>, kun jännitteen ja virran vertailusuunnat valitaan "samansuuntaisiksi" (virta tulee +-napaan), ja <f>U = −R·I</f>, kun ne ovat vastakkaiset. Fysikaalinen tilanne ei muutu, vain etumerkit.</p>' } },
          { id: 't1-dc-w1', type: 'interactive', widget: 'custom', title: { en: 'Voltage and current reference directions', fi: 'Jännitteen ja virran vertailusuunnat' },
            caption: { en: 'The resistor always has 5 V across it and 50 mA flows from A to B. Flip the reference directions and see how the signs and the formula U = ±R·I change, while the power p = u·i stays the same.', fi: 'Vastuksen yli on aina 5 V ja virta 50 mA kulkee A:sta B:hen. Käännä vertailusuuntia ja katso, miten etumerkit ja kaava U = ±R·I muuttuvat, vaikka teho p = u·i pysyy samana.' },
            config: { mount: mountSign } },
          { id: 't1-dc-h2', type: 'h', text: { en: 'Ideal sources', fi: 'Ihannelähteet' } },
          { id: 't1-dc-cols', type: 'columns', cols: [
            [{ id: 't1-dc-c1', type: 'callout', kind: 'key', title: { en: 'Ideal voltage source', fi: 'Ihanteellinen jännitelähde' }, html: {
              en: '<p>Terminal voltage <f>U = E</f> for any current. <b>Never short-circuit</b> it: the current would be infinite.</p>',
              fi: '<p>Napajännite <f>U = E</f> millä tahansa virralla. <b>Älä koskaan oikosulje</b>: virta olisi ääretön.</p>' } }],
            [{ id: 't1-dc-c2', type: 'callout', kind: 'key', title: { en: 'Ideal current source', fi: 'Ihanteellinen virtalähde' }, html: {
              en: '<p>Current <f>I = I_s</f> for any voltage; with a load <f>U = R·I_s</f>. <b>Never leave it open</b>: the voltage would be infinite.</p>',
              fi: '<p>Virta <f>I = I_s</f> millä tahansa jännitteellä; kuormalla <f>U = R·I_s</f>. <b>Älä koskaan jätä avoimeksi</b>: jännite olisi ääretön.</p>' } }]
          ] },
          { id: 't1-dc-p3', type: 'text', html: {
            en: '<p>The power of a source is counted <b>negative</b> (it delivers), the power of the load <b>positive</b> (it absorbs). Both sources are bipolar active components.</p>',
            fi: '<p>Lähteen teho lasketaan <b>negatiiviseksi</b> (se antaa tehoa) ja kuorman teho <b>positiiviseksi</b> (se ottaa tehoa). Molemmat lähteet ovat kaksinapaisia aktiivisia komponentteja.</p>' } },
          { id: 't1-dc-w2', type: 'interactive', widget: 'readout', title: { en: 'Voltage source with a load R', fi: 'Jännitelähde ja kuorma R' },
            caption: { en: 'Slide R from a short circuit to an open circuit: the voltage stays 12 V, the current follows.', fi: 'Liu\'uta R oikosulusta avoimeen piiriin: jännite pysyy 12 V:ssa, virta seuraa.' },
            config: {
              params: [{ id: 'R', tex: 'R', min: 0.01, max: 1e6, value: 100, unit: 'Ω', log: true }],
              outputs: function (v) {
                var I = 12 / v.R;
                return [
                  { tex: 'U', value: 12, unit: 'V' }, { tex: 'I = E/R', value: I, unit: 'A' }, { tex: 'P_{load}', value: 12 * I, unit: 'W' },
                  { label: { en: 'Status', fi: 'Tila' }, value: v.R < 1 ? { en: '⚠ almost a short circuit: the source is overloaded!', fi: '⚠ lähes oikosulku: lähde ylikuormittuu!' }[TDC.i18n ? TDC.i18n.lang : 'en'] : v.R > 1e5 ? { en: 'almost an open circuit: I ≈ 0', fi: 'lähes avoin piiri: I ≈ 0' }[TDC.i18n ? TDC.i18n.lang : 'en'] : 'OK' }
                ];
              }
            } },
          { id: 't1-dc-w3', type: 'interactive', widget: 'readout', title: { en: 'Current source with a load R', fi: 'Virtalähde ja kuorma R' },
            caption: { en: 'The source forces 10 mA through any R. Make R larger and the voltage U = R·I_s grows without limit: an open circuit is forbidden.', fi: 'Lähde pakottaa 10 mA:n mihin tahansa R:ään. Kasvata R:ää ja jännite U = R·I_s kasvaa rajatta: avoin piiri on kielletty.' },
            config: {
              params: [{ id: 'R', tex: 'R', min: 0.01, max: 1e6, value: 100, unit: 'Ω', log: true }],
              outputs: function (v) {
                var U = 0.01 * v.R;
                return [
                  { tex: 'I', value: 0.01, unit: 'A' }, { tex: 'U = R·I_s', value: U, unit: 'V' }, { tex: 'P_{load}', value: U * 0.01, unit: 'W' },
                  { label: { en: 'Status', fi: 'Tila' }, value: v.R > 1e4 ? { en: '⚠ voltage becomes huge: do not open a current source!', fi: '⚠ jännite kasvaa valtavaksi: virtalähdettä ei saa jättää avoimeksi!' }[TDC.i18n ? TDC.i18n.lang : 'en'] : 'OK' }
                ];
              }
            } },
          { id: 't1-dc-q1', type: 'question', q: 't1-q15' },
          { id: 't1-dc-h3', type: 'h', text: { en: 'Linear and non-linear components', fi: 'Lineaariset ja epälineaariset komponentit' } },
          { id: 't1-dc-p4', type: 'text', html: {
            en: '<p>A component is <dfn data-term="linear_component">linear</dfn> if <f>u = f(k_1 i_1 + k_2 i_2) = k_1 f(i_1) + k_2 f(i_2)</f>. Its characteristic <f>U(I)</f> is a straight line through the origin. A resistor <f>U = R·I</f> is linear; a diode is not. Passive components are linear if their properties do not depend on voltage or current.</p>',
            fi: '<p>Komponentti on <dfn data-term="linear_component">lineaarinen</dfn>, jos <f>u = f(k_1 i_1 + k_2 i_2) = k_1 f(i_1) + k_2 f(i_2)</f>. Sen ominaiskäyrä <f>U(I)</f> on origon kautta kulkeva suora. Vastus <f>U = R·I</f> on lineaarinen; diodi ei ole. Passiiviset komponentit ovat lineaarisia, jos niiden ominaisuudet eivät riipu jännitteestä tai virrasta.</p>' } },
          { id: 't1-dc-w4', type: 'interactive', widget: 'plot', title: { en: 'V–I characteristics and superposition test', fi: 'V–I-ominaiskäyrät ja superpositiotesti' }, // (extra: diode, lamp)
            caption: { en: 'Resistor (straight line), diode and lamp (curved). Move V1 and V2: for the resistor i(V1)+i(V2) = i(V1+V2); for the diode it does not.', fi: 'Vastus (suora), diodi ja lamppu (käyrät). Liikuta V1:tä ja V2:ta: vastukselle i(V1)+i(V2) = i(V1+V2), diodille ei.' },
            config: {
              x: { min: -1, max: 0.8, label: { en: 'Voltage', fi: 'Jännite' }, unit: 'V' },
              y: { min: -0.002, max: 0.01, label: { en: 'Current', fi: 'Virta' }, unit: 'A' },
              params: [{ id: 'V1', tex: 'V_1', min: -0.4, max: 0.4, step: 0.05, value: 0.3, unit: 'V' }, { id: 'V2', tex: 'V_2', min: -0.4, max: 0.4, step: 0.05, value: 0.4, unit: 'V' }],
              curves: [
                { fn: function (x) { return x / 1000; }, label: { en: 'resistor 1 kΩ', fi: 'vastus 1 kΩ' }, color: '--c-1' },
                { fn: function (x) { return 1e-14 * (Math.exp(x / 0.025) - 1); }, label: { en: 'diode', fi: 'diodi' }, color: '--c-2' },
                { fn: function (x) { return 1e-3 * (x < 0 ? -1 : 1) * Math.pow(Math.abs(x), 0.6); }, label: { en: 'lamp (R rises with heat)', fi: 'lamppu (R kasvaa lämmetessä)' }, color: '--c-3', dash: [5, 4] }
              ],
              readouts: function (p) {
                var R = function (v) { return v / 1000; }, D = function (v) { return 1e-14 * (Math.exp(v / 0.025) - 1); };
                return [
                  { tex: 'i_R(V_1)+i_R(V_2)', value: R(p.V1) + R(p.V2), unit: 'A' }, { tex: 'i_R(V_1+V_2)', value: R(p.V1 + p.V2), unit: 'A' },
                  { tex: 'i_D(V_1)+i_D(V_2)', value: D(p.V1) + D(p.V2), unit: 'A' }, { tex: 'i_D(V_1+V_2)', value: D(p.V1 + p.V2), unit: 'A' }
                ];
              }
            } },
          { id: 't1-dc-h4', type: 'h', text: { en: 'Circuit topology', fi: 'Piirin topologia' } },
          { id: 't1-dc-p5', type: 'text', html: {
            en: '<p>A <dfn data-term="node">node</dfn> is an area of equal potential where components connect (wires have zero resistance unless stated). A <dfn data-term="branch">branch</dfn> connects two nodes. A <dfn data-term="loop">closed loop</dfn> starts and ends at the same node.</p>',
            fi: '<p><dfn data-term="node">Solmu</dfn> on samanpotentiaalinen alue, jossa komponentit liittyvät toisiinsa (johtimien resistanssi on nolla ellei toisin mainita). <dfn data-term="branch">Haara</dfn> yhdistää kaksi solmua. <dfn data-term="loop">Silmukka</dfn> alkaa ja päättyy samaan solmuun.</p>' } },
          { id: 't1-dc-w5', type: 'interactive', widget: 'circuit', title: { en: 'Nodes, branches and loops', fi: 'Solmut, haarat ja silmukat' },
            caption: { en: 'Nodes N0–N3 are marked. Find the loops (e.g. E–R1; E–R2–R4) and a branch with a current source J in series with R3. Click the values to change them and watch the table.', fi: 'Solmut N0–N3 on merkitty. Etsi silmukat (esim. E–R1; E–R2–R4) ja haara, jossa virtalähde J on sarjassa R3:n kanssa. Muuta arvoja napsauttamalla ja seuraa taulukkoa.' },
            config: {
              size: [11, 6],
              parts: [
                { id: 'E', type: 'V', a: [0, 6], b: [0, 0], value: 12, editable: { min: 0, max: 24, step: 1 } },
                { id: 'R1', type: 'R', a: [3, 0], b: [3, 6], value: 100, editable: { min: 10, max: 1000, step: 10 }, label: 'R1' },
                { id: 'R2', type: 'R', a: [3, 0], b: [7, 0], value: 100, editable: { min: 10, max: 1000, step: 10 }, label: 'R2' },
                { id: 'R4', type: 'R', a: [7, 0], b: [7, 6], value: 200, editable: { min: 10, max: 1000, step: 10 }, label: 'R4' },
                { id: 'R3', type: 'R', a: [10, 0], b: [10, 3], value: 50, editable: { min: 10, max: 500, step: 10 }, label: 'R3' },
                { id: 'J', type: 'I', a: [10, 6], b: [10, 3], value: 0.02, editable: { min: 0, max: 0.05, step: 0.005 }, label: 'J' }
              ],
              wires: [[[0, 0], [3, 0]], [[7, 0], [10, 0]], [[0, 6], [10, 6]]],
              labels: [{ at: [0, 6], text: 'N0 (0 V)', dy: 14 }, { at: [3, 0], text: 'N1' }, { at: [7, 0], text: 'N2' }, { at: [10, 3], text: 'N3', dx: 14 }],
              ground: [0, 6], tools: [], table: true, show: { values: true, flow: true, potentials: true }
            } }
        ]
      },

      /* ---------------- 1.13 Fuses, GFCI ---------------- */
      {
        id: 't1-protect', title: { en: 'Fuses and ground fault circuit interrupters', fi: 'Sulakkeet ja vikavirtasuojat' },
        blocks: [
          { id: 't1-pr-p1', type: 'text', html: {
            en: '<p><b>Fuses</b> limit the current below a maximum average value and prevent overheating and fires. Types: cartridge fuses, plug fuses and <b>circuit breakers</b>.</p><ul><li><b>Fuse:</b> a thin ribbon burns through when the average current is too high and opens the circuit.</li><li><b>Circuit breaker:</b> a bimetallic strip bends when the current is too high; a compressed spring then opens the contacts. It is reset with an outside switch.</li></ul>',
            fi: '<p><b>Sulakkeet</b> rajoittavat virran keskiarvon enimmäisarvon alle ja estävät ylikuumenemisen ja tulipalot. Tyyppejä ovat patruunasulakkeet, tulppasulakkeet ja <b>johdonsuojakatkaisijat</b>.</p><ul><li><b>Sulake:</b> ohut lanka palaa poikki, kun virran keskiarvo on liian suuri, ja katkaisee piirin.</li><li><b>Johdonsuojakatkaisija:</b> bimetalliliuska taipuu liian suurella virralla; puristettu jousi avaa tällöin koskettimet. Katkaisija kuitataan ulkopuolisella kytkimellä.</li></ul>' } },
          { id: 't1-pr-c1', type: 'callout', kind: 'warn', title: { en: 'Fuses do not protect people', fi: 'Sulakkeet eivät suojaa ihmistä' }, html: {
            en: '<p>A fuse is <b>too slow and too coarse</b> to protect you from an electric shock: a body current of tens of mA is far below the fuse rating. Use a GFCI.</p>',
            fi: '<p>Sulake on <b>liian hidas ja karkea</b> suojaamaan sähköiskulta: kehon läpi kulkeva kymmenien mA:n virta on paljon alle sulakkeen nimellisvirran. Käytä vikavirtasuojaa.</p>' } },
          { id: 't1-pr-p2', type: 'text', html: {
            en: '<p>A <dfn data-term="gfci">GFCI</dfn> (RCD) protects humans and animals. An iron ring with a sensing coil measures the <b>difference</b> between the currents in the hot and the neutral line. Normally it is zero. If the difference reaches <b>30 mA</b> (some current flows through a person or the ground), the induced voltage trips a solenoid breaker which cuts the current very quickly. AC currents above about 50 mA can cause severe damage or death. Press the test button T now and then.</p>',
            fi: '<p><dfn data-term="gfci">Vikavirtasuoja</dfn> suojaa ihmisiä ja eläimiä. Rautarengas ja mittauskäämi mittaavat vaihe- ja nollajohtimen virtojen <b>erotusta</b>. Normaalisti se on nolla. Jos erotus saavuttaa <b>30 mA</b> (osa virrasta kulkee ihmisen tai maan kautta), indusoitunut jännite laukaisee solenoidikatkaisijan, joka katkaisee virran erittäin nopeasti. Yli noin 50 mA:n vaihtovirta voi aiheuttaa vakavia vammoja tai kuoleman. Paina testipainiketta T silloin tällöin.</p>' } },
          { id: 't1-pr-w1', type: 'interactive', widget: 'custom', title: { en: 'Fuse and GFCI simulator', fi: 'Sulake- ja vika\u00ADvirta\u00ADsuoja\u00ADsimulaattori' },
            caption: { en: 'Raise the load current above 10 A: the ribbon heats and melts after a time that shrinks with I². Then raise the leakage current: the GFCI trips at 30 mA, a current the fuse would never notice. (The melting-time curve is an illustrative model.)', fi: 'Nosta kuormavirta yli 10 A:n: lanka kuumenee ja palaa poikki ajassa, joka lyhenee I²:n mukana. Nosta sitten vuotovirtaa: vikavirtasuoja laukeaa 30 mA:ssa, jota sulake ei huomaisi lainkaan. (Sulamisaikakäyrä on havainnollistava malli.)' },
            config: { mount: mountFuse } },
          { id: 't1-pr-q1', type: 'question', q: 't1-q16' }
        ]
      },

      /* ---------------- 1.14 Measurements ---------------- */
      {
        id: 't1-measure', title: { en: 'Measurements with a multimeter', fi: 'Mittaukset yleismittarilla' },
        blocks: [
          { id: 't1-me-p1', type: 'text', html: {
            en: '<p>A digital <dfn data-term="multimeter">multimeter</dfn> (DMM) measures AC/DC voltage, AC/DC current and resistance. Analog meters also exist. The connection depends on the quantity:</p>',
            fi: '<p>Digitaalinen <dfn data-term="multimeter">yleismittari</dfn> mittaa vaihto- ja tasajännitettä, -virtaa sekä resistanssia. On myös analogisia mittareita. Kytkentä riippuu mitattavasta suureesta:</p>' } },
          { id: 't1-me-t1', type: 'table',
            head: [{ en: 'Measurement', fi: 'Mittaus' }, { en: 'Connection', fi: 'Kytkentä' }, { en: 'Meter resistance', fi: 'Mittarin resistanssi' }],
            rows: [
              [{ en: 'voltage', fi: 'jännite' }, { en: 'in parallel with the component', fi: 'rinnan komponentin kanssa' }, { en: 'very high (~MΩ)', fi: 'erittäin suuri (~MΩ)' }],
              [{ en: 'current', fi: 'virta' }, { en: 'in series (circuit off while connecting)', fi: 'sarjaan (piiri jännitteettömänä kytkettäessä)' }, { en: 'very low (~mΩ)', fi: 'erittäin pieni (~mΩ)' }],
              [{ en: 'resistance', fi: 'resistanssi' }, { en: 'resistor disconnected from the circuit', fi: 'vastus irrotettuna piiristä' }, '–'],
              [{ en: 'power', fi: 'teho' }, { en: 'ammeter in series + voltmeter in parallel', fi: 'ampeerimittari sarjaan + volttimittari rinnan' }, '–']
            ] },
          { id: 't1-me-h1', type: 'h', text: { en: 'Measuring voltage, current and power', fi: 'Jännitteen, virran ja tehon mittaus' } },
          { id: 't1-me-w1', type: 'interactive', widget: 'circuit', title: { en: 'Ammeter in series, voltmeter in parallel', fi: 'Ampeerimittari sarjassa, volttimittari rinnan' },
            caption: { en: 'A 9 V battery feeds a 2.2 kΩ resistor. The ammeter A1 reads I (≈ 4.1 mA), the voltmeter V1 across R1 reads 9.0 V. The table gives P = U·I for R1. Open the switch before changing the circuit.', fi: '9 V:n paristo syöttää 2,2 kΩ:n vastusta. Ampeerimittari A1 näyttää I:n (≈ 4,1 mA), vastuksen R1 yli kytketty volttimittari V1 näyttää 9,0 V. Taulukossa on R1:n P = U·I. Avaa kytkin ennen piirin muuttamista.' },
            config: {
              size: [8, 4],
              parts: [
                { id: 'U1', type: 'V', a: [0, 4], b: [0, 0], value: 9, editable: { min: 1.5, max: 24, step: 0.5 } },
                { id: 'S1', type: 'switch', a: [0, 0], b: [1, 0], closed: true },
                { id: 'A1', type: 'ammeter', a: [1, 0], b: [4, 0] },
                { id: 'R1', type: 'R', a: [8, 0], b: [8, 4], value: 2200, editable: { min: 100, max: 10000, step: 100 }, label: 'R1' },
                { id: 'V1', type: 'voltmeter', a: [6, 0], b: [6, 4] }
              ],
              wires: [[[4, 0], [8, 0]], [[0, 4], [8, 4]]],
              labels: [{ at: [6, 0], text: 'N1' }],
              tools: [], table: true, show: { values: true, flow: true }
            } },
          { id: 't1-me-c1', type: 'callout', kind: 'warn', title: { en: 'Never do this', fi: 'Älä koskaan tee näin' }, html: {
            en: '<ul><li>Never connect an <b>ammeter in parallel</b> (e.g. across a battery): its resistance is ~mΩ, so it makes a short circuit and blows the fuse.</li><li>Never measure current directly from <b>car batteries or household mains</b>.</li><li>Choose the highest current range first if unsure (A, mA, µA).</li></ul>',
            fi: '<ul><li>Älä koskaan kytke <b>ampeerimittaria rinnan</b> (esim. pariston yli): sen resistanssi on ~mΩ, joten se aiheuttaa oikosulun ja polttaa sulakkeen.</li><li>Älä koskaan mittaa virtaa suoraan <b>auton akusta tai verkkovirrasta</b>.</li><li>Valitse epävarmassa tilanteessa ensin suurin virta-alue (A, mA, µA).</li></ul>' } },
          { id: 't1-me-h2', type: 'h', text: { en: 'Procedures', fi: 'Mittausohjeet' } },
          { id: 't1-me-cols', type: 'columns', cols: [
            [{ id: 't1-me-l1', type: 'list', ordered: true, items: [
              { en: '<b>Voltage:</b> connect the voltmeter in parallel', fi: '<b>Jännite:</b> kytke volttimittari rinnan' },
              { en: 'select AC or DC', fi: 'valitse AC tai DC' },
              { en: 'select the range (auto-range is normal)', fi: 'valitse alue (automaattialue yleensä)' },
              { en: 'switch the meter on, then the circuit voltage, and read', fi: 'kytke mittari päälle, sitten piirin jännite, ja lue' },
              { en: 'check that the reading is reasonable', fi: 'tarkista, että lukema on järkevä' }
            ] }],
            [{ id: 't1-me-l2', type: 'list', ordered: true, items: [
              { en: '<b>Resistance:</b> disconnect the resistor from the circuit', fi: '<b>Resistanssi:</b> irrota vastus piiristä' },
              { en: 'select the ohmmeter function', fi: 'valitse ohmi\u00ADmittari\u00ADtoiminto' },
              { en: 'connect the leads (polarity is unimportant) and select the range', fi: 'kytke johtimet (napaisuudella ei ole väliä) ja valitse alue' },
              { en: 'read; change the range if needed', fi: 'lue; vaihda aluetta tarvittaessa' }
            ] }]
          ] },
          { id: 't1-me-p2', type: 'text', html: {
            en: '<p><b>Power</b> is measured by an ammeter in series and a voltmeter across the resistor, <f>P = U·I</f>. Alternatively measure <f>R</f> and <f>I</f> and use <f>P = R·I²</f>. (The slide heading on p. 38 says "Steps to measure current" but describes power measurement.)</p>',
            fi: '<p><b>Tehon</b> mittaus: ampeerimittari sarjaan ja volttimittari vastuksen yli, <f>P = U·I</f>. Vaihtoehtoisesti mitataan <f>R</f> ja <f>I</f> ja käytetään kaavaa <f>P = R·I²</f>. (Kalvon 38 otsikko on "Steps to measure current", vaikka kalvo kuvaa tehon mittausta.)</p>' } },
          { id: 't1-me-q1', type: 'question', q: 't1-q17' },
          { id: 't1-me-q2', type: 'question', q: 't1-q18' }
        ]
      }
    ],

    questions: [
      /* ---------- practice ---------- */
      { id: 't1-q1', mode: 'practice', type: 'mc', difficulty: 1,
        prompt: { en: 'Which of these particles has the smallest mass?', fi: 'Millä seuraavista hiukkasista on pienin massa?' },
        options: [{ id: 'a', html: { en: 'proton', fi: 'protoni' } }, { id: 'b', html: { en: 'neutron', fi: 'neutroni' } }, { id: 'c', html: { en: 'electron', fi: 'elektroni' } }, { id: 'd', html: { en: 'Cu²⁺ ion', fi: 'Cu²⁺-ioni' } }],
        hints: [{ en: 'Compare the masses in the particle table.', fi: 'Vertaa hiukkastaulukon massoja.' }] },
      { id: 't1-q2', mode: 'practice', type: 'match', difficulty: 1,
        prompt: { en: 'Match each quantity with its SI unit.', fi: 'Yhdistä suure ja sen SI-yksikkö.' },
        left: [{ id: 'q', html: { en: 'electric charge', fi: 'sähkövaraus' } }, { id: 'e', html: { en: 'electric field strength', fi: 'sähkökentän voimakkuus' } }, { id: 'r', html: { en: 'resistance', fi: 'resistanssi' } }, { id: 'p', html: { en: 'permittivity', fi: 'permittiivisyys' } }, { id: 'w', html: { en: 'power', fi: 'teho' } }, { id: 'i', html: { en: 'current', fi: 'virta' } }],
        right: [{ id: 'fm', html: 'F/m' }, { id: 'a', html: 'A' }, { id: 'ohm', html: 'Ω' }, { id: 'wt', html: 'W' }, { id: 'c', html: 'C' }, { id: 'vm', html: 'V/m' }] },
      { id: 't1-q3', mode: 'practice', type: 'numeric', difficulty: 1, tol: 0.02,
        prompt: { en: 'A sensor draws a current of 350 µA. Express it in amperes.', fi: 'Anturi ottaa 350 µA:n virran. Ilmoita se ampeereina.' },
        fields: [{ id: 'I', tex: 'I', unit: 'A' }],
        hints: [{ en: 'µ means 10⁻⁶.', fi: 'µ tarkoittaa 10⁻⁶.' }] },
      { id: 't1-q4', mode: 'practice', type: 'multi', difficulty: 2,
        prompt: { en: 'Which of the following carry electric current well (contain free charge carriers)? Select all that apply.', fi: 'Mitkä seuraavista johtavat sähkövirtaa hyvin (sisältävät vapaita varauksenkuljettajia)? Valitse kaikki sopivat.' },
        options: [{ id: 'cu', html: { en: 'copper', fi: 'kupari' } }, { id: 'ag', html: { en: 'silver', fi: 'hopea' } }, { id: 'dw', html: { en: 'deionized water', fi: 'ioniton vesi' } }, { id: 'nacl', html: { en: 'salt (NaCl) solution in water', fi: 'suolan (NaCl) vesiliuos' } }, { id: 'gl', html: { en: 'glass', fi: 'lasi' } }, { id: 'si', html: { en: 'pure silicon at low temperature', fi: 'puhdas pii matalassa lämpötilassa' } }] },
      { id: 't1-q5', mode: 'practice', type: 'fill', difficulty: 2,
        prompt: { en: 'Complete the sentence.', fi: 'Täydennä lause.' },
        text: { en: 'A charge moving at constant velocity creates a [[a]] field around it; an accelerating charge emits [[b]] waves.', fi: 'Tasaisella nopeudella liikkuvan varauksen ympärille syntyy [[a]] kenttä; kiihtyvä varaus säteilee [[b]] aaltoja.' },
        fields: [{ id: 'a', kind: 'text' }, { id: 'b', kind: 'text' }] },
      { id: 't1-q6', mode: 'practice', type: 'numeric', difficulty: 3, tol: 0.03,
        prompt: { en: 'Two point charges of 2.0 µC and 3.0 µC are 0.10 m apart, immersed in deionized water (<f>ε_r = 81</f>). Find the force between them. Use <f>k = 9.0·10^9 N·m²/C²</f>.', fi: 'Kaksi pistevarausta, 2,0 µC ja 3,0 µC, on 0,10 m:n etäisyydellä toisistaan ionittomassa vedessä (<f>ε_r = 81</f>). Laske niiden välinen voima. Käytä arvoa <f>k = 9,0·10^9 N·m²/C²</f>.' },
        fields: [{ id: 'F', tex: 'F', unit: 'N' }],
        hints: [
          { en: 'Use Coulomb’s law, but check the medium: the charges are not in air.', fi: 'Käytä Coulombin lakia, mutta huomioi väliaine: varaukset eivät ole ilmassa.' },
          { en: 'Write F = k·Q₁·Q₂/(ε_r·r²) and convert µC to C and the distance to metres before substituting.', fi: 'Kirjoita F = k·Q₁·Q₂/(ε_r·r²) ja muunna µC:t coulombeiksi sekä etäisyys metreiksi ennen sijoitusta.' },
          { en: 'Compute the force you would get in air first; then see how ε_r changes it.', fi: 'Laske ensin voima, jonka saisit ilmassa; mieti sitten, miten ε_r muuttaa sitä.' }
        ] },
      { id: 't1-q8', mode: 'practice', type: 'mc', difficulty: 2,
        prompt: { en: 'A small positive test charge is placed near a fixed negative point charge. In which direction does the electric field point at the test charge?', fi: 'Pieni positiivinen koevaraus asetetaan kiinteän negatiivisen pistevarauksen lähelle. Mihin suuntaan sähkökenttä osoittaa koevarauksen kohdalla?' },
        options: [{ id: 'a', html: { en: 'away from the negative charge', fi: 'poispäin negatiivisesta varauksesta' } }, { id: 'b', html: { en: 'towards the negative charge', fi: 'kohti negatiivista varausta' } }, { id: 'c', html: { en: 'perpendicular to the line between them', fi: 'kohtisuoraan varausten välistä suoraa vastaan' } }, { id: 'd', html: { en: 'the field is zero', fi: 'kenttä on nolla' } }] },
      { id: 't1-q9', mode: 'practice', type: 'mc', difficulty: 1,
        prompt: { en: 'A neutral chlorine atom captures one extra electron. What does it become?', fi: 'Neutraali klooriatomi sieppaa yhden ylimääräisen elektronin. Miksi se muuttuu?' },
        options: [{ id: 'a', html: { en: 'a cation with charge +e', fi: 'kationiksi, jonka varaus on +e' } }, { id: 'b', html: { en: 'an anion with charge −e', fi: 'anioniksi, jonka varaus on −e' } }, { id: 'c', html: { en: 'it stays neutral', fi: 'se pysyy neutraalina' } }, { id: 'd', html: { en: 'an anion with charge −2e', fi: 'anioniksi, jonka varaus on −2e' } }] },
      { id: 't1-q10', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.02,
        prompt: { en: 'A current of 150 mA flows through a wire for 2.0 minutes. How much charge passes a cross-section of the wire?', fi: 'Johtimessa kulkee 150 mA:n virta 2,0 minuutin ajan. Kuinka suuri varaus kulkee johtimen poikkileikkauksen läpi?' },
        fields: [{ id: 'Q', tex: 'Q', unit: 'C' }],
        hints: [{ en: 'Convert minutes to seconds first.', fi: 'Muunna minuutit ensin sekunneiksi.' }] },
      { id: 't1-q11', mode: 'practice', type: 'numeric', difficulty: 1, tol: 0.02,
        prompt: { en: 'Find the electric field strength 2.0 m from a point charge of 4.0 µC in air (<f>k = 9.0·10^9 N·m²/C²</f>).', fi: 'Laske sähkökentän voimakkuus 2,0 m:n etäisyydellä 4,0 µC:n pistevarauksesta ilmassa (<f>k = 9,0·10^9 N·m²/C²</f>).' },
        fields: [{ id: 'E', tex: 'E', unit: 'V/m' }] },
      { id: 't1-q12', mode: 'practice', type: 'slider', difficulty: 2, tol: 0.02,
        prompt: { en: 'Two parallel plates are <f>d = 5.0 cm</f> apart. Adjust the voltage <f>U</f> so that the uniform field between them is 600 V/m.', fi: 'Kahden yhdensuuntaisen levyn väli on <f>d = 5,0 cm</f>. Säädä jännite <f>U</f> niin, että levyjen välinen homogeeninen kenttä on 600 V/m.' },
        widget: { name: 'readout', config: {
          params: [{ id: 'U', tex: 'U', min: 1, max: 60, step: 1, value: 10, unit: 'V' }],
          outputs: function (v) { return [{ tex: 'E = U/d', value: v.U / 0.05, unit: 'V/m' }]; },
          answer: function (p) { return { v: p.U }; }
        } } },
      { id: 't1-q13', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.02,
        prompt: { en: 'A 12 V battery drives a 6.0 Ω resistor for 30 minutes. Find the current, the power and the energy converted to heat.', fi: '12 V:n paristo syöttää 6,0 Ω:n vastusta 30 minuutin ajan. Laske virta, teho ja lämmöksi muuttuva energia.' },
        fields: [{ id: 'I', tex: 'I', unit: 'A' }, { id: 'P', tex: 'P', unit: 'W' }, { id: 'W', tex: 'E', unit: 'J' }] },
      { id: 't1-q14', mode: 'practice', type: 'circuit', difficulty: 3, tol: 0.02,
        prompt: { en: 'Use the wire tool 〰 to add ONE wire so that the ammeter shows the largest possible current without short-circuiting the source.', fi: 'Lisää johdintyökalulla 〰 YKSI johdin niin, että ampeerimittari näyttää suurimman mahdollisen virran oikosulkematta lähdettä.' },
        widget: { name: 'circuit', config: {
          size: [8, 4],
          parts: [
            { id: 'U1', type: 'V', a: [0, 4], b: [0, 0], value: 12 },
            { id: 'A1', type: 'ammeter', a: [0, 0], b: [2, 0] },
            { id: 'R1', type: 'R', a: [2, 0], b: [5, 0], value: 100, label: 'R1' },
            { id: 'R2', type: 'R', a: [5, 0], b: [8, 0], value: 200, label: 'R2' }
          ],
          wires: [[[8, 0], [8, 4], [0, 4]]],
          tools: ['wire', 'cut'], answer: { kind: 'I', part: 'A1' }
        } },
        hints: [
          { en: 'The current is largest when the total resistance seen by the source is smallest.', fi: 'Virta on suurin, kun lähteen näkemä kokonaisresistanssi on pienin.' },
          { en: 'A wire connected across a resistor bypasses it. Decide which resistor to bypass, but never connect a wire straight across the source.', fi: 'Vastuksen yli kytketty johdin ohittaa sen. Päätä, minkä vastuksen ohitat, mutta älä koskaan kytke johdinta suoraan lähteen yli.' },
          { en: 'Compare the ammeter reading when each resistor is bypassed in turn; the ammeter must stay in the current path.', fi: 'Vertaa ampeerimittarin lukemaa, kun kumpikin vastus ohitetaan vuorollaan; ampeerimittarin on pysyttävä virtapiirissä.' }
        ] },
      { id: 't1-q15', mode: 'practice', type: 'multi', difficulty: 2,
        prompt: { en: 'Which actions are forbidden (dangerous or physically impossible) with ideal sources? Select all that apply.', fi: 'Mitkä toimenpiteet ovat kiellettyjä (vaarallisia tai fysikaalisesti mahdottomia) ihannelähteillä? Valitse kaikki sopivat.' },
        options: [{ id: 'sv', html: { en: 'short-circuiting an ideal voltage source', fi: 'ihanteellisen jännitelähteen oikosulkeminen' } }, { id: 'ov', html: { en: 'leaving an ideal voltage source open', fi: 'ihanteellisen jännitelähteen jättäminen avoimeksi' } }, { id: 'sc', html: { en: 'short-circuiting an ideal current source', fi: 'ihanteellisen virtalähteen oikosulkeminen' } }, { id: 'oc', html: { en: 'leaving an ideal current source open', fi: 'ihanteellisen virtalähteen jättäminen avoimeksi' } }] },
      { id: 't1-q16', mode: 'practice', type: 'mc', difficulty: 1,
        prompt: { en: 'A ground fault circuit interrupter (GFCI) trips when the difference between the hot and neutral currents reaches about:', fi: 'Vikavirtasuoja laukeaa, kun vaihe- ja nollajohtimen virtojen erotus saavuttaa noin:' },
        options: [{ id: 'a', html: '3 mA' }, { id: 'b', html: '30 mA' }, { id: 'c', html: '300 mA' }, { id: 'd', html: '3 A' }] },
      { id: 't1-q17', mode: 'practice', type: 'order', difficulty: 2,
        prompt: { en: 'Put the steps of measuring the resistance of a resistor in the correct order.', fi: 'Aseta vastuksen resistanssin mittauksen vaiheet oikeaan järjestykseen.' },
        items: [
          { id: 'e', html: { en: 'Read the value; change the range and repeat if necessary', fi: 'Lue arvo; vaihda tarvittaessa aluetta ja toista' } },
          { id: 'c', html: { en: 'Select the ohmmeter function', fi: 'Valitse ohmi\u00ADmittari\u00ADtoiminto' } },
          { id: 'a', html: { en: 'Disconnect the resistor from the circuit', fi: 'Irrota vastus piiristä' } },
          { id: 'd', html: { en: 'Connect the leads across the resistor and select the range', fi: 'Kytke mittajohtimet vastuksen yli ja valitse alue' } },
          { id: 'b', html: { en: 'Check that the reading is reasonable', fi: 'Tarkista, että lukema on järkevä' } }
        ] },
      { id: 't1-q18', mode: 'practice', type: 'match', difficulty: 1,
        prompt: { en: 'Match each measurement with the correct connection.', fi: 'Yhdistä kukin mittaus oikeaan kytkentään.' },
        left: [{ id: 'v', html: { en: 'measuring voltage', fi: 'jännitteen mittaus' } }, { id: 'i', html: { en: 'measuring current', fi: 'virran mittaus' } }, { id: 'r', html: { en: 'measuring resistance', fi: 'resistanssin mittaus' } }],
        right: [{ id: 'ser', html: { en: 'meter in series with the component', fi: 'mittari sarjaan komponentin kanssa' } }, { id: 'iso', html: { en: 'component disconnected from the circuit', fi: 'komponentti irrotettuna piiristä' } }, { id: 'par', html: { en: 'meter in parallel with the component', fi: 'mittari rinnan komponentin kanssa' } }] },
      { id: 't1-q19', mode: 'practice', type: 'mc', difficulty: 1,
        prompt: { en: 'A closed metal box (Faraday cage) is placed in an external electrostatic field. What is the field inside the box?', fi: 'Suljettu metallilaatikko (Faradayn häkki) asetetaan ulkoiseen sähköstaattiseen kenttään. Mikä on kenttä laatikon sisällä?' },
        options: [{ id: 'a', html: { en: 'zero', fi: 'nolla' } }, { id: 'b', html: { en: 'equal to the outside field', fi: 'yhtä suuri kuin ulkopuolinen kenttä' } }, { id: 'c', html: { en: 'opposite to the outside field and equal in size', fi: 'ulkopuolisen kentän suuruinen mutta vastakkaissuuntainen' } }, { id: 'd', html: { en: 'infinite at the walls', fi: 'ääretön seinämillä' } }] },

      /* ---------- graded ---------- */
      { id: 't1-g1', mode: 'graded', type: 'numeric', difficulty: 2, points: 2, tol: 0.01,
        prompt: { en: 'An ion has 29 protons and 27 electrons. Find its net charge in coulombs (e = 1.602·10⁻¹⁹ C).', fi: 'Ionissa on 29 protonia ja 27 elektronia. Laske sen nettovaraus coulombeina (e = 1,602·10⁻¹⁹ C).' },
        fields: [{ id: 'Q', tex: 'Q', unit: 'C' }] },
      { id: 't1-g2', mode: 'graded', type: 'numeric', difficulty: 1, points: 2, tol: 0.02,
        prompt: { en: 'Two point charges of 2.0 µC and 3.0 µC are 0.10 m apart in air. Find the force between them (<f>k = 9.0·10^9 N·m²/C²</f>).', fi: 'Kaksi pistevarausta, 2,0 µC ja 3,0 µC, on 0,10 m:n etäisyydellä toisistaan ilmassa. Laske niiden välinen voima (<f>k = 9,0·10^9 N·m²/C²</f>).' },
        fields: [{ id: 'F', tex: 'F', unit: 'N' }] },
      { id: 't1-g3', mode: 'graded', type: 'numeric', difficulty: 2, points: 2, tol: 0.01,
        prompt: { en: 'A point charge Q = 2.5 µC is in air. At a distance of 3.0 m from it find the electric field strength and the potential (<f>k = 9.0·10^9 N·m²/C²</f>).', fi: 'Pistevaraus Q = 2,5 µC on ilmassa. Laske sähkökentän voimakkuus ja potentiaali 3,0 m:n etäisyydellä siitä (<f>k = 9,0·10^9 N·m²/C²</f>).' },
        fields: [{ id: 'E', tex: 'E', unit: 'V/m' }, { id: 'V', tex: 'V', unit: 'V' }] },
      { id: 't1-g4', mode: 'graded', type: 'mc', difficulty: 2, points: 1,
        prompt: { en: 'A metal sphere carries charge in electrostatic equilibrium. Compared with its surface, the potential at the centre of the sphere is:', fi: 'Metallipallolla on varaus sähköstaattisessa tasapainossa. Pallon keskipisteen potentiaali pintaan verrattuna on:' },
        options: [{ id: 'a', html: { en: 'zero', fi: 'nolla' } }, { id: 'b', html: { en: 'equal to the surface potential', fi: 'yhtä suuri kuin pinnan potentiaali' } }, { id: 'c', html: { en: 'infinitely large', fi: 'äärettömän suuri' } }, { id: 'd', html: { en: 'smaller, and falling towards the centre as 1/r', fi: 'pienempi ja laskee keskustaa kohti kuten 1/r' } }] },
      { id: 't1-g5', mode: 'graded', type: 'numeric', difficulty: 2, points: 2, tol: 0.02,
        prompt: { en: 'A current of 2.0 A flows for 30 s. How many elementary charges pass through the cross-section (e = 1.602·10⁻¹⁹ C)?', fi: 'Virta 2,0 A kulkee 30 s. Kuinka monta alkeisvarausta kulkee poikkileikkauksen läpi (e = 1,602·10⁻¹⁹ C)?' },
        fields: [{ id: 'N', tex: 'N' }],
        hints: [
          { en: 'Charge is moving: relate current, time and charge.', fi: 'Varaus liikkuu: yhdistä virta, aika ja varaus.' },
          { en: 'First find the total charge Q = I·t in coulombs.', fi: 'Laske ensin kokonaisvaraus Q = I·t coulombeina.' },
          { en: 'The charge is a whole number N of elementary charges: Q = N·e, so solve N from this.', fi: 'Varaus on kokonaislukumäärä N alkeisvarauksia: Q = N·e, joten ratkaise N tästä.' }
        ] },
      { id: 't1-g6', mode: 'graded', type: 'circuit', difficulty: 2, points: 2, tol: 0.03,
        prompt: { en: 'Edit the resistor <f>R_2</f> (click it) so that the ammeter reads 40 mA.', fi: 'Muokkaa vastusta <f>R_2</f> (napsauta sitä) niin, että ampeerimittari näyttää 40 mA.' },
        widget: { name: 'circuit', config: {
          size: [7, 4],
          parts: [
            { id: 'U1', type: 'V', a: [0, 4], b: [0, 0], value: 12 },
            { id: 'A1', type: 'ammeter', a: [0, 0], b: [3, 0] },
            { id: 'R1', type: 'R', a: [3, 0], b: [6, 0], value: 100, label: 'R1' },
            { id: 'R2', type: 'R', a: [7, 0], b: [7, 4], value: 500, editable: { min: 50, max: 1000, step: 10 }, label: 'R2' }
          ],
          wires: [[[6, 0], [7, 0]], [[7, 4], [0, 4]]],
          tools: [], answer: { kind: 'I', part: 'A1' }
        } },
        hints: [
          { en: 'Use Ohm’s law (U = R·I) for the whole series circuit.', fi: 'Käytä Ohmin lakia (U = R·I) koko sarjapiirille.' },
          { en: 'Find the total resistance the source must see to give the wanted current: R_total = U/I (convert mA to A).', fi: 'Laske kokonaisresistanssi, jonka lähteen on nähtävä halutun virran saamiseksi: R_kok = U/I (muunna mA ampeereiksi).' },
          { en: 'The resistors are in series, so R_total is the sum of R₁ and R₂; subtract the known one.', fi: 'Vastukset ovat sarjassa, joten R_kok on R₁:n ja R₂:n summa; vähennä tunnettu vastus.' }
        ] }
    ]
  });
})();

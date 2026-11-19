/* Interactive circuit widget ('circuit'). Config reference: ../.claude/skills/circuit-widget/SKILL.md
 * Students can draw wires between grid points (a wire across a resistor shorts it), cut wires, place
 * parts, edit values, toggle switches; current flow is animated and meters/readouts update live. */
(function (TDC) {
  'use strict';
  var U = TDC.util, el = U.el, svg = U.svg, SIM = TDC.sim;
  var G = 60;                                    // px per grid unit (viewBox units)
  var DEFAULTS = { R: 100, V: 10, I: 0.01, lamp: 50, switch: null, ammeter: null, voltmeter: null };
  var UNIT = { R: 'Ω', lamp: 'Ω', V: 'V', I: 'A' };
  var PREFIX_ID = { R: 'R', V: 'U', I: 'I', lamp: 'L', switch: 'S', ammeter: 'A', voltmeter: 'V' };

  // Values below the 1 µΩ wire-model noise floor are shown as 0.
  function clean(v) { return Math.abs(v) < 1e-7 ? 0 : v; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function same(p, q) { return p[0] === q[0] && p[1] === q[1]; }
  function T(k, v) { return TDC.t(k, v); }

  TDC.widgets.register('circuit', function (host, cfg, ctx) {
    var base = { parts: clone(cfg.parts || []), wires: (cfg.wires || []).map(function (w) { return { points: clone(w.points || w) }; }) };
    var st = { userWires: [], userParts: [], values: {}, closed: {}, removed: [] };
    var saved = ctx.getState && ctx.getState();
    if (saved && cfg.persist !== false) st = Object.assign(st, clone(saved));
    var opt = Object.assign({ values: true, flow: true, electrons: false, potentials: false }, cfg.show || {});
    var tool = 'probe', locked = false, sol = null, raf = 0, flowEls = [], lastT = 0, pending = null;

    // ---------- model ----------
    function model() {
      var parts = base.parts.concat(st.userParts).map(function (p) {
        var q = Object.assign({}, p);
        if (st.values[p.id] != null) q.value = st.values[p.id];
        if (p.type === 'switch') q.closed = st.closed[p.id] != null ? st.closed[p.id] : !!p.closed;
        return q;
      });
      var wires = base.wires.map(function (w, i) { return { points: w.points, idx: i, user: false }; })
        .filter(function (w) { return st.removed.indexOf(w.idx) < 0; })
        .concat(st.userWires.map(function (w, i) { return { points: w, idx: i, user: true }; }));
      return { parts: parts, wires: wires, ground: cfg.ground };
    }
    var persist = U.debounce(function () { if (!ctx.readOnly() && cfg.persist !== false) ctx.setState(clone(st)); }, 300);
    function changed() { persist(); draw(); if (cfg.onChange) try { cfg.onChange(api); } catch (e) {} TDC.emit('circuit:change', { id: ctx.id }); }

    // ---------- DOM ----------
    var bounds = cfg.size || extent();
    var pad = 0.8 * G;
    var root = svg('svg', { class: 'circuit-svg', viewBox: [-pad, -pad, bounds[0] * G + 2 * pad, bounds[1] * G + 2 * pad].join(' '), role: 'img',
      'aria-label': ctx.tx(cfg.alt || { en: 'Interactive circuit diagram', fi: 'Interaktiivinen piirikaavio' }) });
    var gGrid = svg('g', { class: 'c-grid' }), gWire = svg('g', { class: 'c-wires' }), gFlow = svg('g', { class: 'c-flow' }),
      gParts = svg('g', { class: 'c-parts' }), gLbl = svg('g', { class: 'c-labels' }), gUI = svg('g', { class: 'c-ui' });
    root.append(gGrid, gWire, gParts, gFlow, gLbl, gUI);   // charges above the leads; part flow stops at the body (see draw)
    var bar = el('div', { class: 'c-toolbar', role: 'toolbar' });
    var status = el('div', { class: 'c-status', role: 'status', 'aria-live': 'polite' });
    var table = el('div', { class: 'c-table' });
    var wrap = el('div', { class: 'circuit-widget' + (cfg.compact ? ' compact' : '') }, [bar, el('div', { class: 'c-canvas' }, root), status, table]);
    host.appendChild(wrap);

    function extent() {
      var mx = 0, my = 0;
      (cfg.parts || []).forEach(function (p) { mx = Math.max(mx, p.a[0], p.b[0]); my = Math.max(my, p.a[1], p.b[1]); });
      (cfg.wires || []).forEach(function (w) { (w.points || w).forEach(function (p) { mx = Math.max(mx, p[0]); my = Math.max(my, p[1]); }); });
      return [Math.max(mx, 4), Math.max(my, 3)];
    }

    // ---------- toolbar ----------
    function buildToolbar() {
      bar.innerHTML = '';
      function tbtn(id, icon, label, onClick, pressed) {
        return el('button', { class: 'c-btn', dataset: { t: id }, title: label, 'aria-label': label, 'aria-pressed': pressed == null ? null : String(pressed), onclick: onClick }, icon);
      }
      var tools = cfg.tools || (cfg.allowWires === false ? [] : ['wire', 'cut']);
      if (tools.length && !locked && !ctx.readOnly()) {
        bar.appendChild(tbtn('probe', '👆', T('circ.probe'), function () { setTool('probe'); }, tool === 'probe'));
        tools.forEach(function (t) {
          var base = t.split(':')[0], fixedVal = t.indexOf(':') > 0 ? +t.split(':')[1] : null;   // 'R:200' = fixed 200 Ω resistor
          var icon = { wire: '〰', cut: '✂', R: '▭', V: '🔋', I: 'Ⓘ', lamp: '💡', switch: '⏻', ammeter: 'Ⓐ', voltmeter: 'Ⓥ' }[base] || t;
          if (fixedVal != null) icon = icon + ' ' + U.fmtSI(fixedVal, UNIT[base] || '', 3).replace(/\s/g, '');
          var label = t === 'wire' ? T('circ.wire') : t === 'cut' ? T('circ.cut') : T('circ.place', { part: T('circ.part.' + base) + (fixedVal != null ? ' ' + U.fmtSI(fixedVal, UNIT[base] || '') : '') });
          bar.appendChild(tbtn(t, icon, label, function () { setTool(tool === t ? 'probe' : t); }, tool === t));
        });
        bar.appendChild(el('span', { class: 'c-sep' }));
      }
      bar.appendChild(tbtn('values', '123', T('circ.values'), function () { opt.values = !opt.values; buildToolbar(); draw(); }, opt.values));
      bar.appendChild(tbtn('flow', '➜', T('circ.flow'), function () { opt.flow = !opt.flow; buildToolbar(); draw(); }, opt.flow));
      bar.appendChild(tbtn('electrons', 'e⁻', T('circ.electrons'), function () { opt.electrons = !opt.electrons; buildToolbar(); draw(); }, opt.electrons));
      bar.appendChild(tbtn('potentials', '🌈', T('circ.potentials'), function () { opt.potentials = !opt.potentials; buildToolbar(); draw(); }, opt.potentials));
      if (!locked && !ctx.readOnly()) bar.appendChild(tbtn('reset', '↺', T('circ.reset'), function () {
        st = { userWires: [], userParts: [], values: {}, closed: {}, removed: [] }; changed();
      }));
      if (tool !== 'probe') bar.appendChild(el('span', { class: 'c-hint' }, T(tool === 'wire' ? 'circ.hintWire' : tool === 'cut' ? 'circ.hintCut' : 'circ.hintPlace')));
    }
    function setTool(t) { tool = t; pending = null; gUI.innerHTML = ''; wrap.dataset.tool = t; buildToolbar(); }

    // A wire segment lying along a part (e.g. across a resistor) shorts it; it is drawn as an arc "jumper".
    function overlapsPart(a, b, parts) {
      return parts.some(function (p) {
        var h = a[1] === b[1] && p.a[1] === p.b[1] && p.a[1] === a[1], v = a[0] === b[0] && p.a[0] === p.b[0] && p.a[0] === a[0];
        if (!h && !v) return false;
        var i = h ? 0 : 1, lo = Math.min(a[i], b[i]), hi = Math.max(a[i], b[i]), plo = Math.min(p.a[i], p.b[i]), phi = Math.max(p.a[i], p.b[i]);
        return Math.min(hi, phi) - Math.max(lo, plo) > 0;
      });
    }

    // ---------- drawing ----------
    function P(p) { return [p[0] * G, p[1] * G]; }
    function partGroup(p) {
      var A = P(p.a), B = P(p.b), L = Math.hypot(B[0] - A[0], B[1] - A[1]), ang = Math.atan2(B[1] - A[1], B[0] - A[0]) * 180 / Math.PI;
      var cx = L / 2, g = svg('g', { class: 'c-part c-' + p.type + (p.user ? ' user' : '') + (p.editable ? ' editable' : ''), transform: 'translate(' + A[0] + ' ' + A[1] + ') rotate(' + ang + ')',
        tabindex: '0', role: 'button', 'data-id': p.id, 'aria-label': describe(p) });
      var body = 20, hb = 0;   // hb: half-length of the part body along its axis (gap between the two leads)
      function lead(x1, x2) { g.appendChild(svg('line', { x1: x1, y1: 0, x2: x2, y2: 0, class: 'c-lead' })); if (!x1) hb = Math.max(0, cx - x2); }
      g.appendChild(svg('line', { x1: 0, y1: 0, x2: L, y2: 0, class: 'c-hit' }));        // wide transparent hit area
      switch (p.type) {
        case 'R':
          lead(0, cx - body); lead(cx + body, L);
          g.appendChild(svg('rect', { x: cx - body, y: -8, width: 2 * body, height: 16, class: 'c-body' }));
          break;
        case 'lamp':
          lead(0, cx - 14); lead(cx + 14, L);
          g.appendChild(svg('circle', { cx: cx, cy: 0, r: 26, class: 'c-glow', opacity: 0 }));
          g.appendChild(svg('circle', { cx: cx, cy: 0, r: 14, class: 'c-body' }));
          g.appendChild(svg('path', { d: 'M' + (cx - 10) + ' -10 L' + (cx + 10) + ' 10 M' + (cx + 10) + ' -10 L' + (cx - 10) + ' 10', class: 'c-sym' }));
          break;
        case 'V':
          lead(0, cx - 5); lead(cx + 5, L);
          g.appendChild(svg('line', { x1: cx + 5, y1: -18, x2: cx + 5, y2: 18, class: 'c-plate' }));
          g.appendChild(svg('line', { x1: cx - 5, y1: -9, x2: cx - 5, y2: 9, class: 'c-plate thick' }));
          break;
        case 'I':
          lead(0, cx - 14); lead(cx + 14, L);
          g.appendChild(svg('circle', { cx: cx, cy: 0, r: 14, class: 'c-body' }));
          g.appendChild(svg('path', { d: 'M' + (cx - 8) + ' 0 L' + (cx + 8) + ' 0 M' + (cx + 3) + ' -5 L' + (cx + 8) + ' 0 L' + (cx + 3) + ' 5', class: 'c-sym' }));
          break;
        case 'switch':
          lead(0, cx - 16); lead(cx + 16, L); hb = 0;   // a closed lever conducts like a wire: charges cross it
          g.appendChild(svg('circle', { cx: cx - 16, cy: 0, r: 3, class: 'c-dot' }));
          g.appendChild(svg('circle', { cx: cx + 16, cy: 0, r: 3, class: 'c-dot' }));
          g.appendChild(svg('line', { x1: cx - 16, y1: 0, x2: p.closed ? cx + 16 : cx + 12, y2: p.closed ? 0 : -16, class: 'c-lever' }));
          break;
        case 'ammeter': case 'voltmeter':
          lead(0, cx - 14); lead(cx + 14, L);
          g.appendChild(svg('circle', { cx: cx, cy: 0, r: 14, class: 'c-body c-meter' }));
          break;
        default:
          lead(0, L);
      }
      return { g: g, A: A, B: B, cx: cx, L: L, hb: hb, vertical: Math.abs(B[0] - A[0]) < 1 };
    }
    function describe(p) {
      var name = p.label || p.id, r = sol && sol.parts[p.id];
      var s = name + (p.value != null && UNIT[p.type] ? ' = ' + U.fmtSI(p.value, UNIT[p.type]) : '');
      if (r) s += ', U = ' + U.fmtSI(Math.abs(r.U), 'V') + ', I = ' + U.fmtSI(Math.abs(r.I), 'A');
      return s;
    }
    function potentialColor(v) {
      var lo = sol.minV, hi = sol.maxVv, t = hi - lo > 1e-9 ? (v - lo) / (hi - lo) : 0;
      return 'hsl(' + Math.round(230 - 230 * t) + ' 80% 52%)';
    }

    function draw() {
      var m = model();
      sol = SIM.solve(m);
      if (sol.ok) {
        var vals = Object.keys(sol.V).map(function (k) { return sol.V[k]; });
        sol.minV = Math.min.apply(null, vals.concat([0])); sol.maxVv = Math.max.apply(null, vals.concat([0]));
      }
      [gGrid, gWire, gFlow, gParts, gLbl].forEach(function (g) { g.innerHTML = ''; });
      flowEls = [];
      // grid dots (only when editing)
      if (!locked && !ctx.readOnly() && (cfg.tools || cfg.allowWires !== false)) {
        for (var x = 0; x <= bounds[0]; x++) for (var y = 0; y <= bounds[1]; y++) gGrid.appendChild(svg('circle', { cx: x * G, cy: y * G, r: 2.2 }));
      }
      var Imax = 1e-12;
      if (sol.ok) {
        Object.keys(sol.parts).forEach(function (k) { Imax = Math.max(Imax, Math.abs(sol.parts[k].I)); });
        sol.wires.forEach(function (w) { Imax = Math.max(Imax, Math.abs(w.I)); });
      }
      // wires
      var counts = {};
      function bump(p) { var k = SIM.key(p); counts[k] = (counts[k] || 0) + 1; }
      function segD(a, b, first) {
        var A = P(a), B = P(b), start = first ? 'M' + A[0] + ' ' + A[1] : '';
        if (!overlapsPart(a, b, m.parts)) return start + ' L' + B[0] + ' ' + B[1];
        var mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, off = Math.min(44, Math.hypot(B[0] - A[0], B[1] - A[1]) * 0.4);
        var nx = a[1] === b[1] ? 0 : -1, ny = a[1] === b[1] ? 1 : 0, k = off / 2;   // horizontal: bulge down, vertical: bulge left
        return start + ' Q' + (mx + nx * k * 2).toFixed(1) + ' ' + (my + ny * k * 2).toFixed(1) + ' ' + B[0] + ' ' + B[1];
      }
      m.wires.forEach(function (w) {
        var d = w.points.slice(1).map(function (p, i) { return segD(w.points[i], p, i === 0); }).join(' ');
        var pl = svg('path', { d: d, class: 'c-wire' + (w.user ? ' user' : ''), 'data-w': (w.user ? 'u' : 'b') + w.idx });
        if (opt.potentials && sol.ok) pl.style.stroke = potentialColor(sol.V[SIM.key(w.points[0])] || 0);
        gWire.appendChild(pl);
        w.points.forEach(bump);
        // invisible fat hit line for the cut tool
        gWire.appendChild(svg('path', { d: d, class: 'c-wire-hit', 'data-w': (w.user ? 'u' : 'b') + w.idx }));
      });
      m.parts.forEach(function (p) { bump(p.a); bump(p.b); });
      Object.keys(counts).forEach(function (k) { if (SIM.leadTap(k.split(',').map(Number), m.parts)) counts[k] += 2; });   // the lead runs on both sides
      // junction dots where 3+ conductors meet
      Object.keys(counts).forEach(function (k) {
        if (counts[k] >= 3) { var xy = k.split(',').map(Number); gWire.appendChild(svg('circle', { cx: xy[0] * G, cy: xy[1] * G, r: 4.5, class: 'c-junction' })); }
      });
      // flow along wire segments
      if (sol.ok && opt.flow) {
        sol.wires.forEach(function (w) { addFlow(segD(w.a, w.b, true), w.I, Imax); });
      }
      // parts
      m.parts.forEach(function (p) {
        var d = partGroup(p), r = sol.ok ? sol.parts[p.id] : null;
        gParts.appendChild(d.g);
        if (p.type === 'switch') d.g.addEventListener('click', function () { if (tool === 'probe') toggleSwitch(p); });
        if (opt.potentials && sol.ok) {
          d.g.querySelectorAll('.c-lead')[0].style.stroke = potentialColor(sol.V[SIM.key(p.a)] || 0);
          var leads = d.g.querySelectorAll('.c-lead'); if (leads[1]) leads[1].style.stroke = potentialColor(sol.V[SIM.key(p.b)] || 0);
        }
        if (r && opt.flow && p.type !== 'voltmeter' && !(p.type === 'switch' && !p.closed)) {
          // flow drawn over the two leads only: the charges slip into the body and come out the other side
          var k = (d.cx - d.hb) / d.L, a1 = [d.A[0] + (d.B[0] - d.A[0]) * k, d.A[1] + (d.B[1] - d.A[1]) * k], b1 = [d.B[0] - (d.B[0] - d.A[0]) * k, d.B[1] - (d.B[1] - d.A[1]) * k];
          addFlow('M' + d.A.join(' ') + ' L' + a1.join(' ') + (d.hb ? ' M' : ' L') + b1.join(' ') + ' L' + d.B.join(' '), r.I, Imax, p.type === 'V' || p.type === 'I' ? 'src' : null);
        }
        if (p.type === 'lamp' && r) {
          var rated = p.rated || ((p.value || 50) ? 1 : 1);
          var glow = Math.min(1, Math.abs(r.P) / (p.rated || 1));
          d.g.querySelector('.c-glow').setAttribute('opacity', glow.toFixed(2));
          d.g.querySelector('.c-body').style.fill = 'rgba(255, 210, 60,' + (0.15 + 0.85 * glow).toFixed(2) + ')';
        }
        labels(p, d, r);
      });
      // labels for nodes
      (cfg.labels || []).forEach(function (lb) {
        var xy = P(lb.at);
        gParts.appendChild(svg('circle', { cx: xy[0], cy: xy[1], r: 5, class: 'c-terminal' }));   // below gFlow: charges pass over it
        var dx = lb.dx == null ? 10 : lb.dx;   // text grows away from the terminal circle on either side
        gLbl.appendChild(svg('text', { x: xy[0] + dx, y: xy[1] + (lb.dy || -10), 'text-anchor': dx < 0 ? 'end' : dx > 0 ? 'start' : 'middle', class: 'c-node-label', text: lb.text }));
      });
      // status
      status.className = 'c-status';
      if (!sol.ok) { status.textContent = '⚠ ' + T('circ.err.singular'); status.classList.add('bad'); }
      else if (sol.short) { status.textContent = '⚡ ' + T('circ.err.short'); status.classList.add('bad'); wrap.classList.add('shorted'); }
      else if (sol.floating) { status.textContent = '⚠ ' + T('circ.err.floating'); status.classList.add('warn'); }
      else { status.textContent = cfg.statusText ? ctx.tx(cfg.statusText(api)) : ''; wrap.classList.remove('shorted'); }
      if (cfg.table) drawTable(m); else table.innerHTML = '';
      fitView();
      startAnim();
    }
    var vb = null;
    function fitView() {
      // Grow-only viewBox that always contains labels/readouts (avoids clipping and jitter).
      try {
        var b = root.getBBox(), m = 12;
        var nb = [Math.min(b.x - m, -pad), Math.min(b.y - m, -pad), Math.max(b.x + b.width + m, bounds[0] * G + pad), Math.max(b.y + b.height + m, bounds[1] * G + pad)];
        if (vb) nb = [Math.min(nb[0], vb[0]), Math.min(nb[1], vb[1]), Math.max(nb[2], vb[2]), Math.max(nb[3], vb[3])];
        vb = nb;
        root.setAttribute('viewBox', [vb[0], vb[1], vb[2] - vb[0], vb[3] - vb[1]].map(function (v) { return v.toFixed(1); }).join(' '));
      } catch (e) {}
    }
    function labels(p, d, r) {
      var cxg = (d.A[0] + d.B[0]) / 2, cyg = (d.A[1] + d.B[1]) / 2;
      var off = d.vertical ? [30, 0] : [0, -26];
      var anchor = d.vertical ? 'start' : 'middle';
      if (p.labelSide === 'other') { off = [-off[0], -off[1] + (d.vertical ? 0 : 8)]; if (d.vertical) anchor = 'end'; }
      var name = p.label || p.id;
      var val = p.value != null && UNIT[p.type] && p.showValue !== false ? U.fmtSI(p.value, UNIT[p.type]) : '';
      var t = svg('text', { x: cxg + off[0], y: cyg + off[1] + (d.vertical ? -4 : 0), 'text-anchor': anchor, class: 'c-label' });
      t.appendChild(svg('tspan', { class: 'c-name', text: name }));
      if (val) t.appendChild(svg('tspan', { class: 'c-val', dx: 5, text: val }));
      gLbl.appendChild(t);
      if (p.type === 'V') {
        var pv = [d.A[0] + (d.B[0] - d.A[0]) * (0.5 + 18 / d.L), d.A[1] + (d.B[1] - d.A[1]) * (0.5 + 18 / d.L)];
        gLbl.appendChild(svg('text', { x: pv[0] + (d.vertical ? -16 : 0), y: pv[1] + (d.vertical ? 4 : -12), class: 'c-plus', 'text-anchor': 'middle', text: '+' }));
      }
      if (p.type === 'ammeter' || p.type === 'voltmeter') {
        gLbl.appendChild(svg('text', { x: cxg, y: cyg + 5, 'text-anchor': 'middle', class: 'c-meter-letter', text: p.type === 'ammeter' ? 'A' : 'V' }));
        if (r) {
          var rv = clean(p.type === 'ammeter' ? r.I : r.U); if (!p.signed) rv = Math.abs(rv);   // real meters can read negative; default to magnitude
          var reading = U.fmtSI(rv, p.type === 'ammeter' ? 'A' : 'V');
          var bx = cxg + (d.vertical ? 24 : -42), by = cyg + (d.vertical ? 14 : 22);
          gLbl.appendChild(svg('rect', { x: bx, y: by, width: 84, height: 22, rx: 4, class: 'c-display' }));
          gLbl.appendChild(svg('text', { x: bx + 42, y: by + 15.5, 'text-anchor': 'middle', class: 'c-display-text', text: reading }));
        }
      } else if (r && opt.values && (p.type === 'R' || p.type === 'lamp' || p.showReadout)) {
        var ty = cyg + (d.vertical ? 14 : p.labelSide === 'other' ? -37 : 30);   // horizontal: readouts on the side the label is not
        var tx = cxg + (d.vertical ? (p.labelSide === 'other' ? -30 : 30) : 0);
        gLbl.appendChild(svg('text', { x: tx, y: ty, 'text-anchor': anchor, class: 'c-readout', text: 'I ' + U.fmtSI(clean(Math.abs(r.I)), 'A') }));
        gLbl.appendChild(svg('text', { x: tx, y: ty + 15, 'text-anchor': anchor, class: 'c-readout', text: 'U ' + U.fmtSI(clean(Math.abs(r.U)), 'V') }));
      }
    }
    function addFlow(d, I, Imax, cls) {
      if (!isFinite(I) || Math.abs(I) < Imax * 1e-4 || Math.abs(I) < 1e-9) return;
      var line = svg('path', { d: d, class: 'c-flowline' + (cls ? ' ' + cls : '') + (opt.electrons ? ' electrons' : '') });
      gFlow.appendChild(line);
      var dir = (I > 0 ? 1 : -1) * (opt.electrons ? -1 : 1);
      flowEls.push({ n: line, speed: dir * (8 + 18 * U.flowRate(I)), off: 0 });
    }
    function startAnim() {
      cancelAnimationFrame(raf);
      if (!flowEls.length || U.reducedMotion()) return;
      lastT = performance.now();
      (function tick(t) {
        var dt = Math.min(0.05, (t - lastT) / 1000); lastT = t;
        flowEls.forEach(function (f) { f.off -= f.speed * dt; f.n.style.strokeDashoffset = f.off.toFixed(1); });
        raf = requestAnimationFrame(tick);
      })(lastT);
    }
    function drawTable(m) {
      if (!sol.ok) { table.innerHTML = ''; return; }
      var rows = m.parts.filter(function (p) { return p.type !== 'W'; }).map(function (p) {
        var r = sol.parts[p.id] || { U: 0, I: 0, P: 0 };
        return el('tr', {}, [el('td', {}, p.label || p.id), el('td', {}, U.fmtSI(clean(r.U), 'V')), el('td', {}, U.fmtSI(clean(r.I), 'A')), el('td', {}, U.fmtSI(clean(r.P), 'W'))]);
      });
      table.innerHTML = '';
      table.appendChild(el('table', { class: 'blk-table compact' }, [
        el('thead', {}, el('tr', {}, [el('th', {}, T('circ.col.part')), el('th', {}, 'U'), el('th', {}, 'I'), el('th', {}, 'P')])), el('tbody', {}, rows)
      ]));
    }

    // ---------- interaction ----------
    function toSvg(e) {
      var pt = root.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      var p = pt.matrixTransform(root.getScreenCTM().inverse());
      return [p.x, p.y];
    }
    function snap(xy) { return [U.clamp(Math.round(xy[0] / G), 0, bounds[0]), U.clamp(Math.round(xy[1] / G), 0, bounds[1])]; }
    // A wire end dropped on a part's lead goes to that lead's terminal (same node), so the preview shows the real connection.
    function toTerminal(p) { var t = SIM.leadTap(p, model().parts); return t ? t.slice() : p; }
    function lPath(p0, p1) {
      if (p0[0] === p1[0] || p0[1] === p1[1]) return [p0, p1];
      var c = [p1[0], p0[1]], parts = model().parts;
      // horizontal first, unless that leg would lie along a part and short it while the vertical-first route does not
      if (overlapsPart(p0, c, parts) || overlapsPart(c, p1, parts)) {
        var c2 = [p0[0], p1[1]];
        if (!overlapsPart(p0, c2, parts) && !overlapsPart(c2, p1, parts)) c = c2;
      }
      return [p0, c, p1];
    }
    root.addEventListener('pointerdown', function (e) {
      if (locked || ctx.readOnly()) return;
      var xy = toSvg(e), gp = snap(xy);
      if (tool === 'wire') {
        e.preventDefault(); root.setPointerCapture(e.pointerId);
        var prev = svg('polyline', { class: 'c-wire preview' }); gUI.appendChild(prev);
        gp = toTerminal(gp);
        var cur = gp;
        var mv = function (ev) { cur = toTerminal(snap(toSvg(ev))); prev.setAttribute('points', lPath(gp, cur).map(function (p) { return P(p).join(','); }).join(' ')); };
        var end = function () { root.removeEventListener('pointermove', mv); root.removeEventListener('pointerup', up); root.removeEventListener('pointercancel', end); prev.remove(); };
        var up = function () {
          end();
          if (same(gp, cur)) return;
          var parts = model().parts, onBody = SIM.leadTap(gp, parts) === false || SIM.leadTap(cur, parts) === false;
          st.userWires.push(lPath(gp, cur)); changed(); TDC.ui.toast(T(onBody ? 'circ.wireOnBody' : 'circ.wireAdded'));
        };
        root.addEventListener('pointermove', mv); root.addEventListener('pointerup', up); root.addEventListener('pointercancel', end);
      } else if (tool === 'cut') {
        var hit = e.target.closest && e.target.closest('[data-w], .c-part.user');
        if (!hit) return;
        if (hit.dataset && hit.dataset.w) {
          var kind = hit.dataset.w[0], idx = +hit.dataset.w.slice(1);
          if (kind === 'u') st.userWires.splice(idx, 1);
          else if (cfg.allowCutAll) st.removed.push(idx);
          else { TDC.ui.toast(T('circ.cantCut')); return; }
        } else { var pid = hit.getAttribute('data-id'); st.userParts = st.userParts.filter(function (p) { return p.id !== pid; }); }
        changed();
      } else if (DEFAULTS.hasOwnProperty(tool.split(':')[0])) {
        if (!pending) { pending = gp; gUI.innerHTML = ''; gUI.appendChild(svg('circle', { cx: gp[0] * G, cy: gp[1] * G, r: 8, class: 'c-pending' })); return; }
        if (same(pending, gp) || (pending[0] !== gp[0] && pending[1] !== gp[1])) { TDC.ui.toast(T('circ.alignHint')); pending = null; gUI.innerHTML = ''; return; }
        var type = tool.split(':')[0], fixed = tool.indexOf(':') > 0 ? +tool.split(':')[1] : null;
        var n = 1, pre = PREFIX_ID[type], ids = model().parts.map(function (p) { return p.id; });
        while (ids.indexOf(pre + n) >= 0) n++;
        var np = { id: pre + n, type: type, a: pending, b: gp, user: true, editable: UNIT[type] && fixed == null && cfg.placeEditable !== false };
        if (DEFAULTS[type] != null) np.value = fixed != null ? fixed : (cfg.defaults && cfg.defaults[type]) || DEFAULTS[type];
        if (type === 'switch') np.closed = true;
        if (type === 'lamp') np.rated = 2;
        st.userParts.push(np); pending = null; gUI.innerHTML = ''; changed();
      }
    });
    gParts.addEventListener('click', function (e) {
      var g = e.target.closest('.c-part'); if (!g || tool !== 'probe') return;
      openPart(g);
    });
    gParts.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var g = e.target.closest('.c-part'); if (!g) return;
      e.preventDefault();
      var p = model().parts.find(function (x) { return x.id === g.getAttribute('data-id'); });
      if (p && p.type === 'switch') toggleSwitch(p); else openPart(g);
    });
    function toggleSwitch(p) {
      if (locked || ctx.readOnly() || p.fixed) return;
      st.closed[p.id] = !p.closed; changed();
    }
    function openPart(g) {
      var p = model().parts.find(function (x) { return x.id === g.getAttribute('data-id'); });
      if (!p || p.type === 'switch') return;
      var r = sol && sol.ok ? sol.parts[p.id] : null;
      var info = el('div', { class: 'c-info' }, [
        el('strong', {}, (p.label || p.id) + ' · ' + T('circ.part.' + p.type)),
        r ? el('div', { class: 'c-info-vals' }, [
          el('span', {}, 'U = ' + U.fmtSI(r.U, 'V')), el('span', {}, 'I = ' + U.fmtSI(r.I, 'A')), el('span', {}, 'P = ' + U.fmtSI(r.P, 'W'))
        ]) : null
      ]);
      var ed = p.editable && !locked && !ctx.readOnly() && UNIT[p.type];
      if (ed) {
        var spec = typeof p.editable === 'object' ? p.editable : {};
        var v0 = p.value, min = spec.min != null ? spec.min : (p.type === 'V' ? 0 : p.type === 'I' ? 0 : 1);
        var max = spec.max != null ? spec.max : Math.max(10, Math.abs(v0) * 10);
        var log = spec.log != null ? spec.log : (p.type === 'R' || p.type === 'lamp') && max / Math.max(min, 1e-9) > 50;
        var toS = function (v) { return log ? Math.log(v / min) / Math.log(max / min) * 1000 : (v - min) / (max - min) * 1000; };
        var fromS = function (s) { var v = log ? min * Math.pow(max / min, s / 1000) : min + (max - min) * s / 1000; return spec.step ? Math.round(v / spec.step) * spec.step : +v.toPrecision(3); };
        var range = el('input', { type: 'range', min: 0, max: 1000, value: toS(v0), 'aria-label': p.id });
        var num = el('input', { type: 'text', class: 'input c-num', value: U.fmtSI(v0, '', 4).replace(/\s/g, ''), inputmode: 'decimal', 'aria-label': p.id });
        var unit = el('span', { class: 'q-unit' }, UNIT[p.type]);
        var set = function (v) { if (!isFinite(v)) return; st.values[p.id] = v; changed(); var rr = sol.parts[p.id]; if (rr) info.querySelector('.c-info-vals').innerHTML = '<span>U = ' + U.fmtSI(rr.U, 'V') + '</span><span>I = ' + U.fmtSI(rr.I, 'A') + '</span><span>P = ' + U.fmtSI(rr.P, 'W') + '</span>'; };
        range.addEventListener('input', function () { var v = fromS(+range.value); num.value = U.fmtSI(v, '', 4).replace(/\s/g, ''); set(v); });
        num.addEventListener('change', function () { var v = U.parseNum(num.value); if (isFinite(v)) { v = U.clamp(v, Math.min(min, 0), max * 100); range.value = toS(Math.max(v, min)); set(v); } });
        info.appendChild(el('div', { class: 'c-edit' }, [range, num, unit]));
      }
      TDC.ui.popover(g, info);
    }

    // ---------- answers (quiz tasks) ----------
    function measure(spec) {
      var m = model();
      if (spec.kind === 'Req') return SIM.equivalentResistance(m, spec.a, spec.b);
      if (spec.kind === 'value') { var p = m.parts.find(function (x) { return x.id === spec.part; }); return p ? p.value : NaN; }
      if (spec.kind === 'count') return st.userParts.filter(function (x) { return !spec.type || x.type === spec.type; }).length;
      var s = SIM.solve(m), r = s.ok && s.parts[spec.part];
      if (!r) return NaN;
      var v = r[spec.kind === 'I' ? 'I' : spec.kind === 'P' ? 'P' : 'U'];
      return spec.abs === false ? v : Math.abs(v);
    }
    var api = {
      solution: function () { return sol; },
      model: model,
      measure: measure,
      getAnswer: function () {
        var out = {};
        if (cfg.answer) out.v = measure(cfg.answer);
        if (cfg.answerFields) Object.keys(cfg.answerFields).forEach(function (k) { out[k] = measure(cfg.answerFields[k]); });
        for (var k in out) if (isFinite(out[k])) out[k] = +out[k].toPrecision(6);
        return out;
      },
      getAnswerState: function () { return clone(st); },
      setAnswerState: function (s) { if (s) { st = Object.assign({ userWires: [], userParts: [], values: {}, closed: {}, removed: [] }, clone(s)); draw(); } },
      lock: function () { locked = true; setTool('probe'); draw(); },
      set: function (id, v) { st.values[id] = v; changed(); },
      destroy: function () { cancelAnimationFrame(raf); TDC.ui.closePopover(); }
    };
    ctx.onTheme(draw);
    ctx.onLang(function () { buildToolbar(); draw(); });
    buildToolbar();
    draw();
    return api;
  });
})(window.TDC);

/* Topic 5: Loop method (mesh current method). Source: EE5LoopMethod.pdf (7 pages) + extras marked "(extra)".
 * NO answers in this file: they live in src/answers/topic5.json.
 * The PDF solution of Example 1 contains an error (I2 = +0.1616 A); this topic uses the corrected values (see PDF-ERRATA.md). */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------------------------
  // Mesh lab: custom widget (SVG circuit + loop currents + live matrix R·I = E + solver + animation)
  // ---------------------------------------------------------------------------------------------
  var NS = 'http://www.w3.org/2000/svg';
  function h(tag, attrs, kids) {
    var e = document.createElement(tag), k;
    if (attrs) for (k in attrs) { if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]); }
    (kids || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function S(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag), k;
    for (k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function nameHtml(s) { return String(s).replace(/_(\{[^}]+\}|\w+)/g, function (m, a) { return '<sub>' + a.replace(/[{}]/g, '') + '</sub>'; }); }
  var SIDE = { l: [-24, 4, 'end'], r: [24, 4, 'start'], u: [0, -20, 'middle'], d: [0, 28, 'middle'] };

  function injectStyle() {
    if (document.getElementById('t5-style')) return;
    var st = document.createElement('style'); st.id = 't5-style';
    st.textContent =
      '.t5ml{display:grid;gap:.7rem}' +
      '.t5ml-svg{width:100%;height:auto;max-height:430px;background:var(--surface);border:1px solid var(--line);border-radius:10px;touch-action:manipulation}' +
      '.t5ml-svg text{font-family:inherit;font-size:12px;fill:var(--fg)}' +
      '.t5ml-svg .hit{cursor:pointer}.t5ml-svg .hit:focus{outline:none}.t5ml-svg .hit:focus-visible circle.ring,.t5ml-svg .hit:hover circle.ring{stroke-width:3}' +
      '.t5ml-bar{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center}' +
      '.t5ml-hint{color:var(--muted);font-size:.88rem}' +
      '.t5ml-eq{display:grid;gap:.3rem;font-size:1rem;min-height:1.5rem}' +
      '.t5ml-eq div{padding:.25rem .5rem;border-left:4px solid var(--line);background:var(--surface-2);border-radius:4px;font-variant-numeric:tabular-nums}' +
      '.t5ml-eq .num{color:var(--muted);font-size:.92rem}' +
      '.t5ml-mat{border-collapse:separate;border-spacing:.25rem;font-variant-numeric:tabular-nums;margin:0 auto;display:block;width:fit-content;max-width:100%;overflow-x:auto}' +
      '.t5ml-mat td{padding:.3rem .55rem;border:1px solid var(--line);border-radius:6px;text-align:center;background:var(--surface-2);min-width:3.1rem}' +
      '.t5ml-mat td.cell{cursor:pointer}.t5ml-mat td.cell:hover,.t5ml-mat td.cell:focus-visible,.t5ml-mat td.cell.on{outline:2px solid var(--c-5);outline-offset:1px}' +
      '.t5ml-mat td.off{opacity:.35}.t5ml-mat td.sym{border:none;background:none;min-width:1rem;font-weight:700}' +
      '.t5ml-mat td.neg{color:var(--c-2);font-weight:700}' +
      '@media (max-width:420px){.t5ml-mat td{min-width:2rem;padding:.25rem .3rem}.t5ml-mat td.sym{min-width:.8rem}}' +
      '.t5ml-info{min-height:1.4rem;font-size:.92rem;color:var(--muted)}' +
      '.t5ml-res{display:grid;grid-template-columns:repeat(auto-fill,minmax(11rem,1fr));gap:.35rem;margin-top:.35rem}.t5ml-res>:only-child{grid-column:1/-1}' +   // fixed cells: chips keep their place as values change
      '.t5ml-res span{padding:.15rem .5rem;border:1px solid var(--line);border-radius:999px;background:var(--surface-2);font-variant-numeric:tabular-nums}' +
      '.t5ml-res .loop{border-color:var(--c-1);font-weight:700}' +
      '.t5ml-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:.9rem;align-items:start}';
    document.head.appendChild(st);
  }

  /* def: {vb:[w,h], alt, hint, reveal, flip, nodes, wires, branches, loops, params, post, extras} */
  function meshLab(host, ctx, def) {
    injectStyle();
    var T = ctx.tx, U = TDC.util, reduced = U.reducedMotion();
    var br = {}, order = [], loops = def.loops, n = loops.length;
    def.branches.forEach(function (b) { var c = {}; for (var k in b) c[k] = b[k]; br[b.id] = c; order.push(c); });
    var placed = loops.map(function () { return !def.reveal; });
    var dir = loops.map(function () { return 1; });
    var shown = loops.map(function () { return 99; });
    var timers = [], alive = true, raf = 0, visible = true, last = 0, spin = 0;
    var sticky = null, cur = {}, Rm = [], Em = [], Iv = null;

    function fmt(v, d) { return ctx.fmtNum(Math.abs(v) < 1e-9 ? 0 : v, d || 4); }
    function sg(i, b) { return (loops[i].m[b.id] || 0) * dir[i]; }
    function compute() {
      var i, j;
      Rm = []; Em = [];
      for (i = 0; i < n; i++) {
        Rm[i] = [];
        for (j = 0; j < n; j++) { var sum = 0; order.forEach(function (b) { sum += sg(i, b) * sg(j, b) * b.R; }); Rm[i][j] = sum; }
        var e = 0; order.forEach(function (b) { e += sg(i, b) * (b.ed || 0) * b.E; }); Em[i] = e;
      }
      Iv = placed.every(Boolean) ? TDC.sim.solveLinear(Rm.map(function (r) { return r.slice(); }), Em.slice()) : null;
      cur = {};
      order.forEach(function (b) { var c = 0; if (Iv) for (var k = 0; k < n; k++) c += sg(k, b) * Iv[k]; cur[b.id] = c; });
    }

    // ---------- geometry ----------
    order.forEach(function (b) {
      b._segs = []; b._len = 0;
      for (var i = 0; i < b.pts.length - 1; i++) {
        var a = b.pts[i], c = b.pts[i + 1], l = Math.hypot(c[0] - a[0], c[1] - a[1]);
        b._segs.push({ x0: a[0], y0: a[1], x1: c[0], y1: c[1], l: l, cum: b._len }); b._len += l;
      }
    });
    function pointAt(b, d) {
      d = ((d % b._len) + b._len) % b._len;
      for (var i = 0; i < b._segs.length; i++) { var s = b._segs[i]; if (d <= s.cum + s.l || i === b._segs.length - 1) { var t = (d - s.cum) / s.l; return [s.x0 + (s.x1 - s.x0) * t, s.y0 + (s.y1 - s.y0) * t]; } }
    }
    function onSeg(b, t) {
      var s = b._segs[b.seg || 0];
      return { x: s.x0 + (s.x1 - s.x0) * t, y: s.y0 + (s.y1 - s.y0) * t, ang: Math.atan2(s.y1 - s.y0, s.x1 - s.x0) * 180 / Math.PI };
    }

    // ---------- DOM ----------
    var vb = def.vb;
    var svg = S('svg', { viewBox: '0 0 ' + vb[0] + ' ' + vb[1], class: 't5ml-svg', role: 'group', 'aria-label': T(def.alt) });
    var gWire = S('g', {}, svg), gGlow = S('g', {}, svg), gFlow = S('g', {}, svg), gSym = S('g', {}, svg), gLab = S('g', {}, svg), gLoop = S('g', {}, svg);
    var WST = 'fill:none;stroke:var(--c-wire,currentColor);stroke-width:2.5;stroke-linejoin:round;stroke-linecap:round';
    (def.wires || []).forEach(function (w) { S('polyline', { points: w.map(function (p) { return p.join(','); }).join(' '), style: WST }, gWire); });
    function label(parent, x, y, anchor, name, valueStr, styleExtra) {
      var t = S('text', { x: x, y: y, 'text-anchor': anchor, style: styleExtra || '' }, parent), parts = String(name).split('_');
      t.appendChild(document.createTextNode(parts[0]));
      if (parts[1]) { var sb = S('tspan', { dy: 3, 'font-size': 9 }, t); sb.textContent = parts[1]; }
      var v = S('tspan', parts[1] ? { dy: -3 } : {}, t); v.textContent = valueStr || '';
      return v;
    }
    order.forEach(function (b) {
      b._poly = S('polyline', { points: b.pts.map(function (p) { return p.join(','); }).join(' '), style: WST }, gWire);
      b._glow = S('polyline', { points: b.pts.map(function (p) { return p.join(','); }).join(' '), style: 'fill:none;stroke:var(--c-5);stroke-width:11;stroke-linecap:round;stroke-linejoin:round;opacity:0;transition:opacity .15s' }, gGlow);
      // resistor
      var r = onSeg(b, b.tR), g = S('g', { transform: 'translate(' + r.x + ',' + r.y + ') rotate(' + r.ang + ')' }, gSym);
      b._rect = S('rect', { x: -18, y: -7, width: 36, height: 14, rx: 2, style: 'fill:var(--surface);stroke:var(--fg);stroke-width:2' }, g);
      var so = SIDE[b.rs || 'l'];
      b._rv = label(gLab, r.x + so[0], r.y + so[1], so[2], b.rn, '');
      // emf
      if (b.ed) {
        var e = onSeg(b, b.tE), ge = S('g', { transform: 'translate(' + e.x + ',' + e.y + ') rotate(' + e.ang + ')' }, gSym), sgn = b.ed > 0 ? 1 : -1;
        S('rect', { x: -9, y: -14, width: 18, height: 28, style: 'fill:var(--surface)' }, ge);
        S('line', { x1: sgn * 4, y1: -13, x2: sgn * 4, y2: 13, style: 'stroke:var(--fg);stroke-width:2.6' }, ge);
        S('line', { x1: -sgn * 4, y1: -7, x2: -sgn * 4, y2: 7, style: 'stroke:var(--fg);stroke-width:2.6' }, ge);
        var pg = S('g', { transform: 'translate(' + (sgn * 15) + ',0) rotate(' + (-e.ang) + ')' }, ge);
        S('text', { x: 0, y: 4, 'text-anchor': 'middle', style: 'font-weight:700;font-size:13px' }, pg).textContent = '+';
        var eo = SIDE[b.es || 'l'];
        b._ev = label(gLab, e.x + eo[0], e.y + eo[1], eo[2], b.en, '');
      }
      // reference arrow + current pill
      // keep the arrowhead clear of the resistor box (half length 18) and the cell (half length 9) on the same branch
      var tI = b.tI, sl = b._segs[b.seg || 0].l;   // tR/tE/tI are fractions of this segment
      [[b.tR, 18], [b.ed ? b.tE : null, 9]].forEach(function (o) { if (o[0] == null) return; var d = (tI - o[0]) * sl, min = o[1] + 12; if (Math.abs(d) < min) tI = o[0] + (d < 0 ? -1 : 1) * min / sl; });
      var q = onSeg(b, tI), ga = S('g', { transform: 'translate(' + q.x + ',' + q.y + ') rotate(' + q.ang + ')' }, gSym);
      S('path', { d: 'M-5,-5 L6,0 L-5,5 Z', style: 'fill:var(--muted)' }, ga);
      var io = SIDE[b.is || 'r'];
      b._iv = label(gLab, q.x + io[0], q.y + io[1], io[2], b.in || ('I_' + b.id), '', 'font-weight:700');
      // dots
      b._nd = Math.max(2, Math.round(b._len / 26)); b._dots = []; b._phase = 0;
      for (var k = 0; k < b._nd; k++) b._dots.push(S('circle', { r: 3.6, cx: -20, cy: -20, style: 'fill:var(--c-flow);opacity:0' }, gFlow));
    });
    (def.nodes || []).forEach(function (nd) {
      S('circle', { cx: nd.x, cy: nd.y, r: 4.5, style: 'fill:var(--fg)' }, gGlow);   // below gFlow: charges pass over the node dot
      if (nd.t) S('text', { x: nd.x + (nd.dx || -12), y: nd.y + (nd.dy || -8), 'text-anchor': 'middle', style: 'fill:var(--muted);font-size:11px' }, gLab).textContent = nd.t;
    });
    // loops
    var COL = ['--c-1', '--c-2', '--c-3', '--c-4'];
    var R0 = 21;
    function arcPts() {
      var a0 = 25 * Math.PI / 180, a1 = 325 * Math.PI / 180, ex = R0 * Math.cos(a1), ey = R0 * Math.sin(a1), tx = -Math.sin(a1), ty = Math.cos(a1), nx = Math.cos(a1), ny = Math.sin(a1);
      return {
        d: 'M' + (R0 * Math.cos(a0)) + ',' + (R0 * Math.sin(a0)) + ' A' + R0 + ',' + R0 + ' 0 1 1 ' + ex + ',' + ey,
        head: (ex + tx * 8) + ',' + (ey + ty * 8) + ' ' + (ex - tx * 2 + nx * 6) + ',' + (ey - ty * 2 + ny * 6) + ' ' + (ex - tx * 2 - nx * 6) + ',' + (ey - ty * 2 - ny * 6)
      };
    }
    var AP = arcPts();
    loops.forEach(function (l, i) {
      var col = 'var(' + COL[i % 4] + ')';
      var g = S('g', { class: 'hit', transform: 'translate(' + l.c[0] + ',' + l.c[1] + ')', role: 'button', tabindex: 0 }, gLoop);
      S('circle', { r: 36, style: 'fill:transparent' }, g);
      l._ring = S('circle', { class: 'ring', r: R0 + 8, style: 'fill:none;stroke:' + col + ';stroke-width:1.5;stroke-dasharray:4 4;opacity:.7' }, g);
      l._plus = S('text', { x: 0, y: 5, 'text-anchor': 'middle', style: 'font-size:18px;font-weight:700;fill:' + col }, g); l._plus.textContent = '+';
      l._flip = S('g', {}, g); l._rot = S('g', {}, l._flip);
      S('path', { d: AP.d, style: 'fill:none;stroke:' + col + ';stroke-width:3.2;stroke-linecap:round' }, l._rot);
      S('polygon', { points: AP.head, style: 'fill:' + col }, l._rot);
      l._txt = S('text', { x: 0, y: 4, 'text-anchor': 'middle', style: 'font-weight:700;fill:' + col }, g);
      l._txt.appendChild(document.createTextNode('I')); var sb2 = S('tspan', { dy: 3, 'font-size': 9 }, l._txt); sb2.textContent = l.name;
      l._g = g;
      g.addEventListener('click', function () { clickLoop(i); });
      g.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); clickLoop(i); } });
    });

    var bar = h('div', { class: 't5ml-bar' }), hint = h('div', { class: 't5ml-hint' }), eqBox = h('div', { class: 't5ml-eq', 'aria-live': 'polite' });
    var matBox = h('div'), info = h('div', { class: 't5ml-info' }), resBox = h('div', { class: 't5ml-res' }), brBox = h('div', { class: 't5ml-res' });
    var panel = def.params ? TDC.viz.params(def.params.map(function (p) { return { id: p.id, tex: p.tex, min: p.min, max: p.max, step: p.step, value: p.value, unit: p.unit }; }), function (vals) { applyParams(vals); update(); }, ctx) : null;
    function applyParams(vals) {
      def.params.forEach(function (p) { br[p.b][p.f] = vals[p.id]; });
      if (def.post) def.post(br, vals);
    }
    host.appendChild(h('div', { class: 't5ml' }, [svg, hint, bar, panel, h('div', { class: 't5ml-cols' }, [h('div', {}, [eqBox]), h('div', {}, [matBox, info])]), resBox, brBox]));
    if (panel) applyParams(panel.values);

    // ---------- interaction ----------
    function clearTimers() { timers.forEach(clearInterval); timers = []; }
    function setHL(spec) {
      order.forEach(function (b) { var on = spec && spec.ids && spec.ids.indexOf(b.id) >= 0; b._glow.style.opacity = on ? .5 : 0; });
      info.innerHTML = spec && spec.html ? spec.html : '';
    }
    function clickLoop(i) {
      if (!placed[i]) { placeLoop(i); } else if (def.flip) { dir[i] = -dir[i]; shown[i] = 99; update(); }
    }
    function placeLoop(i) {
      placed[i] = true; shown[i] = reduced ? 99 : 0; update();
      if (!reduced) {
        var tm = setInterval(function () {
          var tk = rowTokens(i), tot = tk.r.length + tk.e.length;
          shown[i]++;
          var cnt = shown[i];
          if (cnt <= tk.r.length && cnt > 0) setHL({ ids: [tk.r[cnt - 1].b] }); else if (cnt > tk.r.length && tk.e[cnt - tk.r.length - 1]) setHL({ ids: [tk.e[cnt - tk.r.length - 1].b] });
          if (cnt >= tot) { clearInterval(tm); timers = timers.filter(function (x) { return x !== tm; }); shown[i] = 99; setTimeout(function () { if (alive) setHL(sticky); }, 500); }
          renderEq();
        }, 420);
        timers.push(tm);
      }
    }
    function rowTokens(i) {
      var r = [], e = [];
      order.forEach(function (b) {
        if (!sg(i, b)) return;
        var sum = [];
        loops.forEach(function (l, k) { if (placed[k]) { var c = sg(i, b) * sg(k, b); if (c) sum.push({ k: k, c: c }); } });
        sum.sort(function (a, c) { return (c.k === i) - (a.k === i); });
        var inner = sum.map(function (t, idx) { return (idx ? (t.c > 0 ? ' + ' : ' − ') : (t.c > 0 ? '' : '−')) + 'I' + '<sub>' + loops[t.k].name + '</sub>'; }).join('');
        r.push({ b: b.id, html: nameHtml(b.rn) + '·' + (sum.length > 1 ? '(' + inner + ')' : inner) });
        if (b.ed && b.E !== 0) e.push({ b: b.id, sign: sg(i, b) * b.ed, html: nameHtml(b.en) });
      });
      return { r: r, e: e };
    }

    // ---------- rendering of the panels ----------
    function renderEq() {
      eqBox.innerHTML = '';
      loops.forEach(function (l, i) {
        if (!placed[i]) return;
        var t = rowTokens(i), k = Math.min(shown[i], t.r.length + t.e.length), html = '';
        html = t.r.slice(0, k).map(function (x) { return x.html; }).join(' + ');
        if (k >= t.r.length) {
          html += ' = ';
          if (!t.e.length) html += '0';
          else html += t.e.slice(0, k - t.r.length).map(function (x, idx) { return (idx ? (x.sign > 0 ? ' + ' : ' − ') : (x.sign > 0 ? '' : '−')) + x.html; }).join('');
        }
        var d = h('div', { style: 'border-left-color:var(' + COL[i % 4] + ')' });
        d.innerHTML = '<b>' + T({ en: 'Loop ', fi: 'Silmukka ' }) + l.name + ':</b> ' + html;
        eqBox.appendChild(d);
        if (shown[i] >= t.r.length + t.e.length) {
          var terms = [];
          for (var j = 0; j < n; j++) if (placed[j] && Math.abs(Rm[i][j]) > 1e-12) terms.push({ c: Rm[i][j], j: j });
          var num = terms.map(function (x, idx) { return (idx ? (x.c > 0 ? ' + ' : ' − ') : (x.c > 0 ? '' : '−')) + fmt(Math.abs(x.c), 4) + ' I<sub>' + loops[x.j].name + '</sub>'; }).join('') + ' = ' + fmt(Em[i], 4) + ' V';
          var d2 = h('div', { class: 'num', style: 'border-left-color:var(' + COL[i % 4] + ')' }); d2.innerHTML = '→ ' + num; eqBox.appendChild(d2);
        }
      });
      if (!eqBox.firstChild) eqBox.appendChild(h('div', { class: 't5ml-hint' }, [T({ en: 'No loop current placed yet: click a window in the diagram.', fi: 'Yhtään silmukkavirtaa ei ole vielä asetettu: napsauta kaavion ikkunaa.' })]));
    }
    function cellSpec(i, j) {
      var parts = [], ids = [];
      order.forEach(function (b) { var c = sg(i, b) * sg(j, b); if (c) { parts.push({ b: b, c: c }); ids.push(b.id); } });
      var nm = 'R<sub>' + loops[i].name + loops[j].name + '</sub>';
      var expr = parts.map(function (p, idx) { return (idx ? (p.c > 0 ? ' + ' : ' − ') : (p.c > 0 ? '' : '−')) + nameHtml(p.b.rn); }).join('') || '0';
      var why = i === j ? T({ en: 'all resistors of loop ', fi: 'silmukan kaikki vastukset, silmukka ' }) + loops[i].name
        : !parts.length ? T({ en: 'no shared resistor', fi: 'ei yhteistä vastusta' })
        : Rm[i][j] < 0 ? T({ en: 'shared, loop currents oppose: negative', fi: 'yhteinen, silmukkavirrat vastakkaiset: negatiivinen' }) : T({ en: 'shared, same direction: positive', fi: 'yhteinen, samansuuntaiset: positiivinen' });
      return { ids: ids, html: '<b>' + nm + '</b> = ' + expr + ' = ' + fmt(Rm[i][j], 4) + ' Ω <span>(' + why + ')</span>' };
    }
    function emfSpec(i) {
      var parts = [], ids = [];
      order.forEach(function (b) { var c = sg(i, b) * (b.ed || 0); if (c && b.E !== 0) { parts.push({ b: b, c: c }); ids.push(b.id); } });
      var expr = parts.map(function (p, idx) { return (idx ? (p.c > 0 ? ' + ' : ' − ') : (p.c > 0 ? '' : '−')) + nameHtml(p.b.en); }).join('') || '0';
      return { ids: ids, html: '<b>E<sub>' + loops[i].name + '</sub></b> = ' + expr + ' = ' + fmt(Em[i], 4) + ' V <span>(' + T({ en: '+ if the emf pushes current along the loop current', fi: '+ jos lähde ajaa virtaa silmukkavirran suuntaan' }) + ')</span>' };
    }
    function renderMat() {
      var tbl = h('table', { class: 't5ml-mat', role: 'grid', 'aria-label': 'R·I = E' }), i, j;
      for (i = 0; i < n; i++) {
        var tr = h('tr');
        for (j = 0; j < n; j++) {
          (function (i, j) {
            var ok = placed[i] && placed[j];
            var td = h('td', { class: 'cell' + (ok ? '' : ' off') + (ok && Rm[i][j] < 0 ? ' neg' : ''), tabindex: ok ? 0 : -1 });
            td.innerHTML = ok ? fmt(Rm[i][j], 4) : '·';
            if (ok) wire(td, function () { return cellSpec(i, j); });
            tr.appendChild(td);
          })(i, j);
        }
        tr.appendChild(h('td', { class: 'sym' }, ['·']));
        var ti = h('td', { class: placed[i] ? '' : 'off', style: 'color:var(' + COL[i % 4] + ');font-weight:700' }); ti.innerHTML = 'I<sub>' + loops[i].name + '</sub>';
        tr.appendChild(ti); tr.appendChild(h('td', { class: 'sym' }, ['=']));
        (function (i) {
          var te = h('td', { class: 'cell' + (placed[i] ? '' : ' off'), tabindex: placed[i] ? 0 : -1 });
          te.innerHTML = placed[i] ? fmt(Em[i], 4) : '·'; if (placed[i]) wire(te, function () { return emfSpec(i); });
          tr.appendChild(te);
        })(i);
        tbl.appendChild(tr);
      }
      matBox.innerHTML = ''; matBox.appendChild(tbl);
    }
    var stickyEl = null;
    function wire(td, specFn) {
      td.addEventListener('mouseenter', function () { setHL(specFn()); });
      td.addEventListener('focus', function () { setHL(specFn()); });
      td.addEventListener('mouseleave', function () { setHL(sticky); });
      td.addEventListener('blur', function () { setHL(sticky); });
      td.addEventListener('click', function () {
        if (stickyEl === td) { stickyEl = null; sticky = null; td.classList.remove('on'); setHL(null); return; }
        if (stickyEl) stickyEl.classList.remove('on');
        stickyEl = td; td.classList.add('on'); sticky = specFn(); setHL(sticky);
      });
    }
    function renderBar() {
      bar.innerHTML = '';
      if (def.reveal) {
        var b1 = h('button', { class: 'btn btn-small', type: 'button' }, [T({ en: 'Place all loops', fi: 'Aseta kaikki silmukat' })]);
        b1.addEventListener('click', function () { loops.forEach(function (l, i) { if (!placed[i]) { placed[i] = true; shown[i] = 99; } }); update(); });
        var b2 = h('button', { class: 'btn btn-small btn-ghost', type: 'button' }, [T({ en: 'Reset', fi: 'Tyhjennä' })]);
        b2.addEventListener('click', function () { clearTimers(); loops.forEach(function (l, i) { placed[i] = false; dir[i] = 1; shown[i] = 99; }); sticky = null; stickyEl = null; setHL(null); update(); });
        bar.appendChild(b1); bar.appendChild(b2);
      }
      if (def.flip) loops.forEach(function (l, i) {
        var cw = (l.cw ? 1 : -1) * dir[i] > 0;
        var b = h('button', { class: 'btn btn-small btn-ghost', type: 'button', style: 'color:var(' + COL[i % 4] + ')' }); b.disabled = !placed[i];
        b.innerHTML = 'I<sub>' + l.name + '</sub> ' + (cw ? '↻ ' + T({ en: 'clockwise', fi: 'myötäpäivään' }) : '↺ ' + T({ en: 'counter-clockwise', fi: 'vastapäivään' }));
        b.addEventListener('click', function () { dir[i] = -dir[i]; shown[i] = 99; update(); });
        bar.appendChild(b);
      });
    }
    function renderRes() {
      resBox.innerHTML = ''; brBox.innerHTML = '';
      if (!Iv) { resBox.appendChild(h('span', {}, [T({ en: 'Place all loop currents to solve the system.', fi: 'Aseta kaikki silmukkavirrat, niin yhtälöryhmä ratkeaa.' })])); return; }
      loops.forEach(function (l, i) { var s = h('span', { class: 'loop' }); s.innerHTML = 'I<sub>' + l.name + '</sub> = ' + fmt(Iv[i], 4) + ' A'; resBox.appendChild(s); });
      order.forEach(function (b) { var s = h('span'); s.innerHTML = nameHtml(b.in || ('I_' + b.id)) + ' = ' + fmt(cur[b.id], 4) + ' A'; brBox.appendChild(s); });
      if (def.extras) def.extras(cur, br, panel ? panel.values : {}).forEach(function (x) { var s = h('span', { style: 'border-color:var(--c-3)' }); s.innerHTML = x.html + ' = ' + fmt(x.v, 4) + ' ' + x.unit; brBox.appendChild(s); });
    }
    function drawDots() {
      order.forEach(function (b) {
        var c = cur[b.id] || 0, on = Iv && Math.abs(c) > 1e-4;
        b._dots.forEach(function (d, k) {
          if (!on) { d.style.opacity = 0; return; }
          var p = pointAt(b, b._phase + k * b._len / b._nd); d.setAttribute('cx', p[0]); d.setAttribute('cy', p[1]); d.style.opacity = 1;
        });
      });
    }
    function drawLoops() {
      loops.forEach(function (l, i) {
        var pl = placed[i], sx = (l.cw ? 1 : -1) * dir[i];
        l._ring.style.display = pl ? 'none' : ''; l._plus.style.display = pl ? 'none' : '';
        l._flip.style.display = pl ? '' : 'none'; l._txt.style.display = pl ? '' : 'none';
        l._flip.setAttribute('transform', 'scale(' + sx + ',1)');
        l._rot.setAttribute('transform', 'rotate(' + (spin * (i % 2 ? 1 : 1)) + ')');
        l._g.setAttribute('aria-label', T({ en: 'Loop current ', fi: 'Silmukkavirta ' }) + 'I' + l.name + (pl ? '' : T({ en: ' (not placed, press to place)', fi: ' (ei asetettu, paina asettaaksesi)' })));
      });
    }
    function update() {
      compute(); renderBar(); renderMat(); renderEq(); renderRes(); drawLoops();
      order.forEach(function (b) {
        b._rv.textContent = ' = ' + fmt(b.R, 4) + ' Ω';
        if (b._ev) b._ev.textContent = ' = ' + fmt(b.E, 4) + ' V';
        b._iv.textContent = Iv ? ' = ' + fmt(cur[b.id], 3) + ' A' : '';
      });
      hint.textContent = T(def.hint);
      drawDots();
      start();
    }
    // ---------- animation ----------
    function tick(now) {
      raf = 0; if (!alive || !visible) return;
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      spin = (spin + dt * 80) % 360;
      order.forEach(function (b) { var c = cur[b.id] || 0; if (Math.abs(c) > 1e-4) b._phase += (c > 0 ? 1 : -1) * (8 + 14 * TDC.util.flowRate(c)) * dt; });
      drawDots(); drawLoops();
      raf = requestAnimationFrame(tick);
    }
    function start() { if (!raf && alive && visible && !reduced) { last = performance.now(); raf = requestAnimationFrame(tick); } }
    var io = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); else { cancelAnimationFrame(raf); raf = 0; } });
      io.observe(svg);
    }
    ctx.onLang(function () { update(); });
    update();
    return {
      destroy: function () { alive = false; cancelAnimationFrame(raf); raf = 0; clearTimers(); if (io) io.disconnect(); }
    };
  }
  function mountLab(def) { return function (host, ctx) { return meshLab(host, ctx, def); }; }

  // ---------------------------------------------------------------------------------------------
  // Definitions of the example networks (path direction of each branch follows the PDF's current direction)
  // ed = direction of the emf along the branch path (+1 / -1); loop.m = +1/-1 if the loop runs along/against the path
  // ---------------------------------------------------------------------------------------------
  var HINT_CLICK = { en: 'Click a window to place its loop current. Click it again to reverse its direction. Hover or click a matrix entry to see which resistors it comes from.',
                     fi: 'Napsauta ikkunaa asettaaksesi sen silmukkavirran. Napsauta uudelleen kääntääksesi suunnan. Vie osoitin matriisin alkion päälle nähdäksesi, mistä vastuksista se muodostuu.' };
  var HINT_LIVE = { en: 'Drag the sliders. The matrix, the solution and the animated branch currents update live. Reverse a loop with the buttons: the loop current changes sign, the branch currents do not.',
                    fi: 'Vedä liukusäätimiä. Matriisi, ratkaisu ja animoidut haaravirrat päivittyvät heti. Käännä silmukka painikkeilla: silmukkavirta vaihtaa merkkiä, haaravirrat eivät.' };

  function ex1Def(reveal, hint) {
    return {
      vb: [720, 350], reveal: reveal, flip: true, hint: hint,
      alt: { en: 'Example 1 network with six branches A to F and three loop currents', fi: 'Esimerkin 1 verkko, jossa kuusi haaraa A–F ja kolme silmukkavirtaa' },
      nodes: [{ x: 110, y: 140, t: '1', dx: -13, dy: -9 }, { x: 360, y: 140, t: '2', dx: 0, dy: -11 }, { x: 610, y: 140, t: '3', dx: 13, dy: -9 }, { x: 110, y: 320, t: '4', dx: -13, dy: 4 }],
      wires: [[[110, 320], [610, 320]]],
      branches: [
        { id: 'A', rn: 'R_A', en: 'E_A', R: 4, E: 15, ed: -1, pts: [[110, 140], [110, 320]], seg: 0, tE: .3, tR: .72, tI: .5, rs: 'l', es: 'l', is: 'r' },
        { id: 'B', rn: 'R_B', R: 6, E: 0, ed: 0, pts: [[110, 140], [360, 140]], seg: 0, tR: .45, tI: .8, rs: 'u', is: 'd' },
        { id: 'C', rn: 'R_C', en: 'E_C', R: 2, E: 5, ed: -1, pts: [[360, 140], [360, 320]], seg: 0, tE: .3, tR: .72, tI: .5, rs: 'r', es: 'r', is: 'l' },
        { id: 'D', rn: 'R_D', en: 'E_D', R: 3, E: 10, ed: -1, pts: [[360, 140], [610, 140]], seg: 0, tE: .3, tR: .72, tI: .5, rs: 'u', es: 'u', is: 'd' },
        { id: 'E', rn: 'R_E', R: 10, E: 0, ed: 0, pts: [[610, 140], [610, 320]], seg: 0, tR: .72, tI: .35, rs: 'r', is: 'l' },
        { id: 'F', rn: 'R_F', R: 5, E: 0, ed: 0, pts: [[110, 140], [110, 40], [610, 40], [610, 140]], seg: 1, tR: .5, tI: .2, rs: 'u', is: 'd' }
      ],
      loops: [
        { name: '1', c: [235, 230], cw: true, m: { A: -1, B: 1, C: 1 } },
        { name: '2', c: [485, 230], cw: false, m: { C: 1, D: -1, E: -1 } },
        { name: '3', c: [360, 90], cw: true, m: { B: -1, D: -1, F: 1 } }
      ],
      params: [
        { id: 'EA', b: 'A', f: 'E', tex: 'E_A', min: 0, max: 30, step: 0.5, value: 15, unit: 'V' },
        { id: 'ED', b: 'D', f: 'E', tex: 'E_D', min: 0, max: 30, step: 0.5, value: 10, unit: 'V' },
        { id: 'RF', b: 'F', f: 'R', tex: 'R_F', min: 1, max: 30, step: 1, value: 5, unit: 'Ω' }
      ],
      extras: function (c, b) { return [{ html: 'U<sub>F</sub> = R<sub>F</sub>·I<sub>F</sub>', v: b.F.R * c.F, unit: 'V' }]; }
    };
  }
  // (extra) 2-loop warm-up
  function warmDef() {
    return {
      vb: [620, 300], reveal: true, flip: true, hint: HINT_CLICK,
      alt: { en: 'Two-window warm-up circuit', fi: 'Kahden ikkunan lämmittelypiiri' },
      nodes: [{ x: 310, y: 50, t: '', dx: 0, dy: 0 }, { x: 310, y: 250, t: '', dx: 0, dy: 0 }],
      wires: [[[90, 50], [530, 50]], [[90, 250], [530, 250]]],
      branches: [
        { id: 'L', rn: 'R_1', en: 'E_1', in: 'I_R1', R: 2, E: 12, ed: 1, pts: [[90, 250], [90, 50]], seg: 0, tE: .3, tR: .72, tI: .85, rs: 'l', es: 'l', is: 'r' },
        { id: 'M', rn: 'R_2', in: 'I_R2', R: 4, E: 0, ed: 0, pts: [[310, 50], [310, 250]], seg: 0, tR: .55, tI: .2, rs: 'r', is: 'l' },
        { id: 'R', rn: 'R_3', en: 'E_2', in: 'I_R3', R: 6, E: 6, ed: -1, pts: [[530, 50], [530, 250]], seg: 0, tR: .3, tE: .7, tI: .2, rs: 'r', es: 'r', is: 'l' }
      ],
      loops: [
        { name: 'a', c: [200, 150], cw: true, m: { L: 1, M: 1 } },
        { name: 'b', c: [420, 150], cw: true, m: { M: -1, R: 1 } }
      ],
      params: [
        { id: 'E1', b: 'L', f: 'E', tex: 'E_1', min: 0, max: 24, step: 0.5, value: 12, unit: 'V' },
        { id: 'E2', b: 'R', f: 'E', tex: 'E_2', min: 0, max: 12, step: 0.5, value: 6, unit: 'V' },
        { id: 'R2', b: 'M', f: 'R', tex: 'R_2', min: 1, max: 12, step: 1, value: 4, unit: 'Ω' }
      ],
      extras: function (c, b) { return [{ html: 'U<sub>R2</sub> = R<sub>2</sub>·I<sub>R2</sub>', v: b.M.R * c.M, unit: 'V' }]; }
    };
  }
  // Example 2 after source conversion
  function ex2Def() {
    return {
      vb: [620, 300], reveal: true, flip: false, hint: HINT_CLICK,
      alt: { en: 'Example 2 after converting the current source J into E_J in series with R3', fi: 'Esimerkki 2 virtalähteen J muunnoksen jälkeen: E_J sarjassa R3:n kanssa' },
      nodes: [], wires: [[[90, 50], [530, 50]], [[90, 250], [530, 250]]],
      branches: [
        { id: 'L', rn: 'R_1', en: 'E_1', in: 'I_R1', R: 2.5, E: 100, ed: 1, pts: [[90, 250], [90, 50]], seg: 0, tE: .3, tR: .72, tI: .85, rs: 'l', es: 'l', is: 'r' },
        { id: 'M', rn: 'R_3', en: 'E_J', in: 'I_m', R: 5, E: 50, ed: 1, pts: [[310, 250], [310, 50]], seg: 0, tE: .3, tR: .7, tI: .9, rs: 'r', es: 'r', is: 'l' },
        { id: 'R', rn: 'R_2', en: 'E_2', in: 'I_R2', R: 3.3, E: 50, ed: -1, pts: [[530, 50], [530, 250]], seg: 0, tR: .3, tE: .7, tI: .2, rs: 'r', es: 'r', is: 'l' }
      ],
      loops: [
        { name: 'a', c: [200, 150], cw: true, m: { L: 1, M: -1 } },
        { name: 'b', c: [420, 150], cw: true, m: { M: 1, R: 1 } }
      ],
      params: [
        { id: 'J', b: 'M', f: 'E', tex: 'J', min: 0, max: 20, step: 0.5, value: 10, unit: 'A' },
        { id: 'R3', b: 'M', f: 'R', tex: 'R_3', min: 1, max: 15, step: 0.5, value: 5, unit: 'Ω' }
      ],
      post: function (b, v) { b.M.E = v.J * v.R3; },
      extras: function (c, b, v) { var i3 = v.J - c.M, v3 = b.M.R * i3; return [{ html: 'I<sub>3</sub> = J − I<sub>m</sub>', v: i3, unit: 'A' }, { html: 'V<sub>3</sub> = R<sub>3</sub>·I<sub>3</sub>', v: v3, unit: 'V' }]; }
    };
  }

  // ---------------------------------------------------------------------------------------------
  // Helpers for the circuit widget configs
  // ---------------------------------------------------------------------------------------------
  function B(en, fi) { return { en: en, fi: fi }; }
  // two-window circuit for tasks: E1 + R1 left, R2 shared (middle), R3 + E2 right (both emfs have + at the top)
  function twoLoopCfg(kind) {
    var parts = [
      { id: 'U1', type: 'V', a: [0, 6], b: [0, 3], value: 12, editable: { min: 0, max: 24, step: 0.5 } },
      { id: 'R1', type: 'R', a: [0, 3], b: [0, 0], value: 2, label: 'R1' }
    ];
    if (kind === 'value') {
      parts.push({ id: 'R2', type: 'R', a: [5, 0], b: [5, 6], value: 4, label: 'R2' });
      parts.push({ id: 'R3', type: 'R', a: [10, 0], b: [10, 2], value: 6, label: 'R3' });
      parts.push({ id: 'A1', type: 'ammeter', a: [10, 2], b: [10, 4] });
      parts.push({ id: 'U2', type: 'V', a: [10, 6], b: [10, 4], value: 6 });
    } else {
      parts.push({ id: 'R2', type: 'R', a: [5, 0], b: [5, 3], value: 4, label: 'R2' });
      parts.push({ id: 'A2', type: 'ammeter', a: [5, 3], b: [5, 6] });
      parts.push({ id: 'R3', type: 'R', a: [10, 0], b: [10, 3], value: 6, label: 'R3' });
      parts.push({ id: 'U2', type: 'V', a: [10, 6], b: [10, 3], value: 6 });
    }
    var cfg = { size: [10, 6], parts: parts, wires: [[[0, 0], [10, 0]], [[0, 6], [10, 6]]], tools: [], show: { values: true, flow: true }, table: false };
    cfg.answer = kind === 'value' ? { kind: 'value', part: 'U1' } : { kind: 'I', part: 'A2' };
    return cfg;
  }
  // Example 1 as a live circuit-simulator (grid)
  function ex1CircuitCfg() {
    var ed = { min: 0, max: 30, step: 0.5 }, er = { min: 1, max: 30, step: 1 };
    return {
      size: [11, 8],
      parts: [
        { id: 'EA', type: 'V', a: [0, 6], b: [0, 4], value: 15, editable: ed, label: 'E_A' },
        { id: 'RA', type: 'R', a: [0, 6], b: [0, 8], value: 4, editable: er, label: 'R_A' },
        { id: 'RB', type: 'R', a: [1, 3], b: [4, 3], value: 6, editable: er, label: 'R_B' },
        { id: 'EC', type: 'V', a: [5, 6], b: [5, 4], value: 5, editable: ed, label: 'E_C' },
        { id: 'RC', type: 'R', a: [5, 6], b: [5, 8], value: 2, editable: er, label: 'R_C' },
        { id: 'ED', type: 'V', a: [8, 3], b: [6, 3], value: 10, editable: ed, label: 'E_D' },
        { id: 'RD', type: 'R', a: [9, 3], b: [11, 3], value: 3, editable: er, label: 'R_D' },
        { id: 'RE', type: 'R', a: [11, 3], b: [11, 8], value: 10, editable: er, label: 'R_E' },
        { id: 'RF', type: 'R', a: [4, 0], b: [7, 0], value: 5, editable: er, label: 'R_F' }
      ],
      wires: [
        [[0, 3], [0, 4]], [[0, 3], [0, 0], [4, 0]], [[0, 3], [1, 3]], [[4, 3], [5, 3]], [[5, 3], [5, 4]], [[5, 3], [6, 3]],
        [[7, 0], [11, 0], [11, 3]], [[8, 3], [9, 3]], [[0, 8], [11, 8]]
      ],
      labels: [{ at: [0, 3], text: '1', dx: -10, dy: -6 }, { at: [5, 3], text: '2', dx: 0, dy: -10 }, { at: [11, 3], text: '3', dx: 10, dy: -6 }, { at: [0, 8], text: '4', dx: -10, dy: 10 }],
      ground: [0, 8], tools: [], show: { values: true, flow: true }, table: true
    };
  }

  // quick solver used by plot widget / readouts
  function solveEx1(EA, ED, RF) {
    var Rm = [[12, 2, -6], [2, 15, 3], [-6, 3, 9 + RF]], E = [EA - 5, ED - 5, ED];
    return TDC.sim.solveLinear(Rm, E);
  }
  function solveWarm(E1, E2, R1, R2, R3) { return TDC.sim.solveLinear([[R1 + R2, -R2], [-R2, R2 + R3]], [E1, -E2]); }

  var SVG_GRAPH =
    '<svg viewBox="0 0 480 215" xmlns="http://www.w3.org/2000/svg" style="max-width:520px;width:100%;height:auto" font-family="inherit" font-size="13" fill="currentColor">' +
    '<g stroke="currentColor" stroke-width="2.2" fill="none">' +
    '<path d="M60,70 V28 H420 V70"/><path d="M60,70 H420"/><path d="M60,70 V180 H420 V70"/><path d="M240,70 V180"/></g>' +
    '<g fill="var(--surface)" stroke="currentColor" stroke-width="2"><rect x="228" y="108" width="24" height="34"/><rect x="52" y="108" width="16" height="34"/><rect x="412" y="108" width="16" height="34"/>' +
    '<rect x="132" y="62" width="34" height="16"/><rect x="312" y="62" width="34" height="16"/><rect x="222" y="20" width="36" height="16"/></g>' +
    '<g fill="currentColor"><circle cx="60" cy="70" r="5"/><circle cx="240" cy="70" r="5"/><circle cx="420" cy="70" r="5"/><circle cx="60" cy="180" r="5"/>' +
    '<text x="42" y="62">1</text><text x="236" y="58">2</text><text x="428" y="62">3</text><text x="42" y="198">4</text>' +
    '<text x="28" y="130" font-weight="700">A</text><text x="143" y="98" font-weight="700">B</text><text x="262" y="130" font-weight="700">C</text><text x="323" y="98" font-weight="700">D</text><text x="440" y="130" font-weight="700">E</text><text x="236" y="14" font-weight="700">F</text></g>' +
    '<g stroke="var(--c-1)" stroke-width="2" fill="var(--c-1)"><path d="M72,90 V120" /><path d="M222,90 V120"/></g>' +
    '</svg>';

  var SVG_SUPER =
    '<svg viewBox="0 0 470 210" xmlns="http://www.w3.org/2000/svg" style="max-width:555px;width:100%;height:auto" font-family="inherit" font-size="13" fill="currentColor">' +
    '<g stroke="currentColor" stroke-width="2.2" fill="none"><path d="M60,30 H380"/><path d="M60,180 H380"/><path d="M60,30 V70"/><path d="M60,140 V180"/><path d="M220,30 V68"/><path d="M220,142 V180"/><path d="M380,30 V70"/><path d="M380,130 V180"/></g>' +
    '<g fill="var(--surface)" stroke="currentColor" stroke-width="2"><rect x="52" y="108" width="16" height="32"/><rect x="372" y="70" width="16" height="60"/><circle cx="220" cy="105" r="37"/></g>' +
    '<g stroke="currentColor" stroke-width="2.4"><path d="M44,70 H76"/><path d="M50,82 H70"/></g>' +
    '<path d="M220,125 V85 M212,93 L220,83 L228,93" fill="none" stroke="currentColor" stroke-width="2.4"/>' +
    '<g stroke="var(--c-1)" stroke-width="2.2" fill="none"><path d="M118,100 a24,24 0 1 1 0,0.1"/><path d="M300,100 a24,24 0 1 1 0,0.1"/></g>' +
    '<g><text x="76" y="80">E = 20 V</text><text x="78" y="128">R₁ = 2 Ω</text><text x="236" y="150">J = 3 A</text><text x="398" y="106">R₂ = 4 Ω</text><text x="105" y="104" fill="var(--c-1)" font-weight="700">I_a</text><text x="289" y="104" fill="var(--c-1)" font-weight="700">I_b</text></g>' +
    '</svg>';

  var SVG_SPLIT =
    '<svg viewBox="0 0 560 164" xmlns="http://www.w3.org/2000/svg" style="max-width:640px;width:100%;height:auto" font-family="inherit" font-size="13" fill="currentColor">' +
    '<g stroke="currentColor" stroke-width="2.2" fill="none"><path d="M20,40 H540"/><path d="M20,130 H540"/><path d="M20,40 V130"/><path d="M180,40 V130"/><path d="M300,40 V130"/><path d="M540,40 V130"/></g>' +
    '<g fill="var(--surface)" stroke="currentColor" stroke-width="2"><rect x="62" y="32" width="46" height="16"/><rect x="212" y="32" width="46" height="16"/><rect x="12" y="75" width="16" height="30"/><rect x="172" y="75" width="16" height="30"/><rect x="292" y="75" width="16" height="30"/><rect x="532" y="75" width="16" height="30"/></g>' +
    '<g><text x="72" y="26">R₂</text><text x="222" y="26">R₃</text><text x="110" y="70" fill="var(--c-3)" font-weight="700">J R₂</text><text x="258" y="70" fill="var(--c-3)" font-weight="700">J R₃</text><text x="30" y="148" font-weight="700">R₁</text><text x="190" y="148" font-weight="700">R₄</text><text x="310" y="148" font-weight="700">R₅</text></g>' +
    '</svg>';

  // ---------------------------------------------------------------------------------------------
  TDC.registerTopic({
    id: 't5', num: 5,
    title: { en: 'Loop method (mesh current method)', fi: 'Silmukkavirtamenetelmä' },
    subtitle: { en: 'Solve a network with loop currents and the matrix equation R·I = E.', fi: 'Verkon ratkaisu silmukkavirroilla ja matriisiyhtälöllä R·I = E.' },
    objectives: [
      { en: 'explain why a network needs only b − n + 1 voltage equations', fi: 'selittää, miksi verkon ratkaisuun riittää b − n + 1 jänniteyhtälöä' },
      { en: 'choose loops and loop-current directions for a planar circuit', fi: 'valita tasoverkolle silmukat ja silmukkavirtojen suunnat' },
      { en: 'write R·I = E directly from the circuit with the sign rules', fi: 'kirjoittaa yhtälö R·I = E suoraan piiristä merkkisääntöjen avulla' },
      { en: 'solve the loop currents and recover the branch currents', fi: 'ratkaista silmukkavirrat ja johtaa niistä haaravirrat' },
      { en: 'handle current sources by source conversion (and a supermesh)', fi: 'käsitellä virtalähteet lähteen muunnoksella (ja supersilmukalla)' },
      { en: 'compare the loop method with the Kirchhoff branch-current method', fi: 'vertailla silmukkavirtamenetelmää Kirchhoffin haaravirtamenetelmään' }
    ],
    glossary: {
      loopMethod: { en: 'loop method (mesh current method)', fi: 'silmukkavirtamenetelmä', def: { en: 'Systematic analysis method whose unknowns are loop currents; the equations are KVL equations written in matrix form R·I = E.', fi: 'Systemaattinen analyysimenetelmä, jonka tuntemattomat ovat silmukkavirtoja; yhtälöt ovat jännitelain yhtälöitä matriisimuodossa R·I = E.' } },
      loop: { en: 'loop / mesh', fi: 'silmukka', def: { en: 'A closed path through the circuit. In a planar circuit the "windows" are independent loops.', fi: 'Suljettu reitti piirin läpi. Tasopiirissä "ikkunat" ovat riippumattomia silmukoita.' } },
      loopCurrent: { en: 'loop current', fi: 'silmukkavirta', sym: 'I_1, I_2', def: { en: 'Imaginary current circulating around one loop. A branch current is the signed sum of the loop currents through that branch.', fi: 'Kuvitteellinen virta, joka kiertää yhden silmukan. Haaravirta on haaran läpi kulkevien silmukkavirtojen etumerkillinen summa.' } },
      branchCurrent: { en: 'branch current', fi: 'haaravirta', sym: 'I_A', def: { en: 'The real current in one branch of the network.', fi: 'Verkon yhden haaran todellinen virta.' } },
      branch: { en: 'branch', fi: 'haara', sym: 'b', def: { en: 'A path between two nodes carrying one current.', fi: 'Kahden solmun välinen reitti, jossa kulkee yksi virta.' } },
      node: { en: 'node', fi: 'solmu', sym: 'n', def: { en: 'A point where three or more branches meet.', fi: 'Piste, jossa kolme tai useampi haara kohtaa.' } },
      window: { en: 'window (of a planar circuit)', fi: 'ikkuna (tasopiirin)', def: { en: 'An area enclosed by branches that contains no other branch. Number of windows = number of independent loops.', fi: 'Haarojen rajaama alue, jonka sisällä ei ole muita haaroja. Ikkunoiden määrä = riippumattomien silmukoiden määrä.' } },
      emf: { en: 'electromotive force (emf)', fi: 'lähdejännite (sähkömotorinen voima)', sym: 'E', def: { en: 'Voltage produced by a source; positive when it pushes current along the loop current.', fi: 'Lähteen tuottama jännite; positiivinen, kun se ajaa virtaa silmukkavirran suuntaan.' } },
      voltageSource: { en: 'voltage source', fi: 'jännitelähde', def: { en: 'A source that keeps its terminal voltage (emf) independent of the current.', fi: 'Lähde, jonka napajännite (lähdejännite) ei riipu virrasta.' } },
      currentSource: { en: 'current source', fi: 'virtalähde', sym: 'J', def: { en: 'A source that forces a given current through its branch.', fi: 'Lähde, joka pakottaa haaraansa tietyn virran.' } },
      internalResistance: { en: 'internal resistance', fi: 'sisäinen resistanssi', def: { en: 'The resistor in parallel with a current source (or in series with a voltage source).', fi: 'Virtalähteen rinnalla (tai jännitelähteen sarjassa) oleva vastus.' } },
      resistanceMatrix: { en: 'resistance matrix', fi: 'resistanssimatriisi', sym: 'R', def: { en: 'Square matrix of the loop equations: diagonal = own resistances, off-diagonal = shared resistances with a sign.', fi: 'Silmukkayhtälöiden neliömatriisi: lävistäjällä silmukan omat resistanssit, muualla yhteiset resistanssit etumerkin kanssa.' } },
      sharedResistance: { en: 'shared (common) resistance', fi: 'yhteinen resistanssi', def: { en: 'Resistance that belongs to two loops at once; it gives the off-diagonal element R_ij.', fi: 'Kahdelle silmukalle yhteinen resistanssi; se muodostaa ei-lävistäjäalkion R_ij.' } },
      diagonalElement: { en: 'diagonal element', fi: 'lävistäjäalkio', sym: 'R_ii', def: { en: 'Sum of all resistances in loop i.', fi: 'Silmukan i kaikkien vastusten summa.' } },
      symmetricMatrix: { en: 'symmetric matrix', fi: 'symmetrinen matriisi', sym: 'R_ij = R_ji', def: { en: 'Holds when the circuit has only independent sources and resistors.', fi: 'Pätee, kun piirissä on vain riippumattomia lähteitä ja vastuksia.' } },
      kvl: { en: "Kirchhoff's voltage law (KVL)", fi: 'Kirchhoffin jännitelaki (silmukkalaki)', sym: 'ΣU = 0', def: { en: 'The voltages around any closed loop sum to zero.', fi: 'Suljetun silmukan jännitteiden summa on nolla.' } },
      kcl: { en: "Kirchhoff's current law (KCL)", fi: 'Kirchhoffin virtalaki (solmulaki)', sym: 'ΣI = 0', def: { en: 'The currents into a node sum to zero.', fi: 'Solmuun tulevien virtojen summa on nolla.' } },
      linearIndependence: { en: 'linearly independent', fi: 'lineaarisesti riippumaton', def: { en: 'An equation that cannot be obtained from the others. Only n − 1 KCL equations are independent.', fi: 'Yhtälö, jota ei voi johtaa muista. Vain n − 1 solmuyhtälöä on riippumatonta.' } },
      sourceConversion: { en: 'source conversion', fi: 'lähteen muunnos', sym: 'E = R·J', def: { en: 'A current source J with parallel resistor R equals a voltage source E = R·J in series with R.', fi: 'Virtalähde J ja rinnakkaisvastus R vastaa jännitelähdettä E = R·J ja sarjavastusta R.' } },
      supermesh: { en: 'supermesh', fi: 'supersilmukka', def: { en: 'The outer loop around two meshes that share a current source; used when a current source cannot be converted.', fi: 'Kahden silmukan yhteisen virtalähteen ympäri kulkeva ulkosilmukka; käytetään, kun virtalähdettä ei voi muuntaa.' } }
    },
    formulas: [
      { name: { en: 'Number of loop equations', fi: 'Silmukkayhtälöiden lukumäärä' }, tex: 'b − n + 1' },
      { name: { en: 'Loop equations in matrix form', fi: 'Silmukkayhtälöt matriisimuodossa' }, tex: 'R · I = E' },
      { name: { en: 'Loop currents', fi: 'Silmukkavirrat' }, tex: 'I = R^{-1} · E' },
      { name: { en: 'Own resistance (diagonal)', fi: 'Oma resistanssi (lävistäjä)' }, tex: 'R_{ii} = ΣR (loop i)' },
      { name: { en: 'Shared resistance (off-diagonal)', fi: 'Yhteinen resistanssi (lävistäjän ulkopuoli)' }, tex: 'R_{ij} = R_{ji} = ±ΣR (loops i, j)' },
      { name: { en: 'Source conversion', fi: 'Lähteen muunnos' }, tex: 'E = R · J' }
    ],

    sections: [
      // ================================================================= 1. IDEA
      {
        id: 't5-idea', title: { en: 'The idea: loop currents and the number of equations', fi: 'Ajatus: silmukkavirrat ja yhtälöiden lukumäärä' },
        blocks: [
          { id: 't5-idea-p1', type: 'text', html: {
            en: '<p>The <dfn data-term="loopMethod">loop method</dfn> (also called the mesh current method) is a systematic way to analyse a network. Its basic unknowns are the <dfn data-term="loopCurrent">loop currents</dfn>: imaginary currents that circulate around the loops of the circuit. The equations are collected into one matrix equation <f>R · I = E</f>, where <f>R</f> is the <dfn data-term="resistanceMatrix">resistance matrix</dfn>, <f>I</f> is the vector of unknown loop currents and <f>E</f> is the vector of electromotive forces (<dfn data-term="emf">emfs</dfn>).</p>',
            fi: '<p><dfn data-term="loopMethod">Silmukkavirtamenetelmä</dfn> on systemaattinen tapa analysoida verkko. Sen perustuntemattomat ovat <dfn data-term="loopCurrent">silmukkavirrat</dfn>: kuvitteelliset virrat, jotka kiertävät piirin silmukoita. Yhtälöt kootaan yhdeksi matriisiyhtälöksi <f>R · I = E</f>, jossa <f>R</f> on <dfn data-term="resistanceMatrix">resistanssimatriisi</dfn>, <f>I</f> on tuntemattomien silmukkavirtojen vektori ja <f>E</f> on lähdejännitteiden (<dfn data-term="emf">emf</dfn>) vektori.</p>' } },
          { id: 't5-idea-h1', type: 'h', text: { en: 'How many unknowns does a network have?', fi: 'Kuinka monta tuntematonta verkossa on?' } },
          { id: 't5-idea-p2', type: 'text', html: {
            en: '<p>A network with <f>b</f> branches and <f>n</f> nodes has <f>2b</f> unknowns: one voltage and one current per branch. The figure shows a network with <f>b = 6</f> branches (A–F) and <f>n = 4</f> nodes, so there are 12 unknowns.</p>',
            fi: '<p>Verkossa, jossa on <f>b</f> haaraa ja <f>n</f> solmua, on <f>2b</f> tuntematonta: jokaisella haaralla yksi jännite ja yksi virta. Kuvan verkossa on <f>b = 6</f> haaraa (A–F) ja <f>n = 4</f> solmua, joten tuntemattomia on 12.</p>' } },
          { id: 't5-idea-fig1', type: 'figure', svg: SVG_GRAPH,
            caption: { en: 'Six branches A–F and four nodes 1–4. Node 4 is the common bottom wire; branch F runs over the top from node 1 to node 3.', fi: 'Kuusi haaraa A–F ja neljä solmua 1–4. Solmu 4 on alhaalla kulkeva yhteinen johdin; haara F kulkee yläkautta solmusta 1 solmuun 3.' },
            alt: { en: 'Graph with six branches and four nodes', fi: 'Kuusi haaraa ja neljä solmua sisältävä verkko' } },
          { id: 't5-idea-p3', type: 'text', html: {
            en: '<p>Write <dfn data-term="kcl">KCL</dfn> (taking currents into the node as positive) at the nodes:</p><ul><li>node 1: <f>I_A = −I_B − I_F</f></li><li>node 2: <f>I_B = I_C + I_D</f></li><li>node 3: <f>I_F = I_E − I_D</f></li><li>node 4: <f>I_A = −I_C − I_E</f></li></ul><p>The 4th equation follows from the first three, so it is <dfn data-term="linearIndependence">linearly dependent</dfn>. Only <f>n − 1 = 3</f> KCL equations are independent. The remaining independent equations are voltage (KVL) equations, and their number is</p>',
            fi: '<p>Kirjoita <dfn data-term="kcl">solmulaki</dfn> (solmuun tulevat virrat positiivisina) solmuille:</p><ul><li>solmu 1: <f>I_A = −I_B − I_F</f></li><li>solmu 2: <f>I_B = I_C + I_D</f></li><li>solmu 3: <f>I_F = I_E − I_D</f></li><li>solmu 4: <f>I_A = −I_C − I_E</f></li></ul><p>Neljäs yhtälö seuraa kolmesta ensimmäisestä, joten se on <dfn data-term="linearIndependence">lineaarisesti riippuvainen</dfn>. Vain <f>n − 1 = 3</f> solmuyhtälöä on riippumatonta. Loput riippumattomat yhtälöt ovat jänniteyhtälöitä (silmukkalaki), ja niiden lukumäärä on</p>' } },
          { id: 't5-idea-f1', type: 'formula', key: true, tex: 'b − n + 1 = 6 − 4 + 1 = 3',
            label: { en: 'Number of independent voltage (loop) equations', fi: 'Riippumattomien jänniteyhtälöiden (silmukkayhtälöiden) lukumäärä' },
            legend: [['b', B('number of branches', 'haarojen lukumäärä'), ''], ['n', B('number of nodes', 'solmujen lukumäärä'), '']] },
          { id: 't5-idea-c1', type: 'callout', kind: 'key', title: B('Why this is a good deal', 'Miksi tämä kannattaa'),
            html: B('Instead of solving <f>2b = 12</f> unknowns, the loop method solves only <f>b − n + 1 = 3</f> loop currents. Everything else (branch currents, voltages) follows from them by simple sums and Ohm’s law.',
                    'Ratkaisemalla <f>2b = 12</f> tuntemattoman sijaan silmukkavirtamenetelmässä ratkaistaan vain <f>b − n + 1 = 3</f> silmukkavirtaa. Kaikki muu (haaravirrat, jännitteet) seuraa niistä summilla ja Ohmin lailla.') },
          { id: 't5-idea-w1', type: 'interactive', widget: 'readout', title: B('Count the equations', 'Laske yhtälöt'),
            caption: B('Choose the number of branches and nodes of a connected network. Check that (n − 1) + (b − n + 1) = b.', 'Valitse yhtenäisen verkon haarojen ja solmujen lukumäärä. Tarkista, että (n − 1) + (b − n + 1) = b.'),
            config: {
              params: [{ id: 'b', tex: 'b', min: 3, max: 15, step: 1, value: 6 }, { id: 'n', tex: 'n', min: 2, max: 10, step: 1, value: 4 }],
              outputs: function (v) {
                var n = Math.min(v.n, v.b + 1), kcl = n - 1, loops = v.b - n + 1;
                return [{ tex: '2b', value: 2 * v.b }, { tex: 'n − 1', value: kcl }, { tex: 'b − n + 1', value: loops }, { tex: '(n − 1) + (b − n + 1)', value: kcl + loops }];
              }
            } },
          { id: 't5-idea-q1', type: 'question', q: 't5-q1' },
          { id: 't5-idea-q2', type: 'question', q: 't5-q2' }
        ]
      },

      // ================================================================= 2. CHOOSING LOOPS
      {
        id: 't5-choose', title: { en: 'Choosing loops and directions', fi: 'Silmukoiden ja suuntien valinta' },
        blocks: [
          { id: 't5-choose-p1', type: 'text', html: {
            en: '<p>Loops can be chosen in many ways, but two conditions must hold:</p><ul><li>there must be <b>exactly</b> <f>b − n + 1</f> loops, and</li><li><b>every branch</b> must belong to at least one loop (otherwise its current is missing from the equations).</li></ul><p><b>Rule of thumb:</b> if no wires cross each other, the number of "<dfn data-term="window">windows</dfn>" of the circuit equals the number of loops. Draw one loop current around each window and choose its direction freely (a common habit is clockwise). The choice of direction only decides the signs in the equations. The final physical result does not depend on it.</p>',
            fi: '<p>Silmukat voi valita monella tavalla, mutta kahden ehdon täytyy toteutua:</p><ul><li>silmukoita on oltava <b>täsmälleen</b> <f>b − n + 1</f>, ja</li><li><b>jokaisen haaran</b> on kuuluttava vähintään yhteen silmukkaan (muuten sen virta puuttuu yhtälöistä).</li></ul><p><b>Peukalosääntö:</b> jos johtimet eivät risteä, piirin "<dfn data-term="window">ikkunoiden</dfn>" lukumäärä on sama kuin silmukoiden lukumäärä. Piirrä yksi silmukkavirta kunkin ikkunan ympäri ja valitse sen kiertosuunta vapaasti (tavallisesti myötäpäivään). Kiertosuunta vaikuttaa vain yhtälöiden merkkeihin; fysikaalinen lopputulos ei riipu siitä.</p>' } },
          { id: 't5-choose-c1', type: 'callout', kind: 'warn', title: B('Common mistake', 'Yleinen virhe'),
            html: B('Do not draw loop currents around loops that overlap in a way that leaves a branch out, and never use more loops than <f>b − n + 1</f>: the extra equation is linearly dependent and the matrix becomes singular.',
                    'Älä valitse silmukoita niin, että jokin haara jää pois, äläkä käytä useampaa silmukkaa kuin <f>b − n + 1</f>: ylimääräinen yhtälö on lineaarisesti riippuvainen ja matriisi muuttuu singulaariseksi.') },
          // (extra) 2-loop warm-up
          { id: 't5-choose-h1', type: 'h', text: B('Warm-up: two windows', 'Lämmittely: kaksi ikkunaa') },
          { id: 't5-choose-p2', type: 'text', html: {
            en: '<p>Start with the simplest case. The circuit has <f>b = 3</f> branches and <f>n = 2</f> nodes (top and bottom wire), so <f>b − n + 1 = 2</f> loops: the left and the right window. The middle resistor <f>R_2</f> belongs to both loops: it is the <dfn data-term="sharedResistance">shared resistance</dfn>. Both loop currents run clockwise, so in <f>R_2</f> they run in <em>opposite</em> directions.</p><p>Click the two windows. Watch how each equation is built term by term and how the matrix entries light up the resistors they come from.</p>',
            fi: '<p>Aloita yksinkertaisimmasta tapauksesta. Piirissä on <f>b = 3</f> haaraa ja <f>n = 2</f> solmua (ylä- ja alajohdin), joten silmukoita on <f>b − n + 1 = 2</f>: vasen ja oikea ikkuna. Keskimmäinen vastus <f>R_2</f> kuuluu molempiin silmukoihin: se on <dfn data-term="sharedResistance">yhteinen resistanssi</dfn>. Molemmat silmukkavirrat kiertävät myötäpäivään, joten vastuksessa <f>R_2</f> ne kulkevat <em>vastakkaisiin</em> suuntiin.</p><p>Napsauta molempia ikkunoita. Katso, miten kukin yhtälö rakentuu termi kerrallaan ja miten matriisin alkiot korostavat vastukset, joista ne muodostuvat.</p>' } },
          { id: 't5-choose-w1', type: 'interactive', widget: 'custom', title: B('Mesh clicker: two-window warm-up', 'Silmukkaklikkeri: kahden ikkunan lämmittely'),
            caption: B('Click a window to place its loop current. Hover over a matrix entry to see the resistors it comes from.', 'Napsauta ikkunaa asettaaksesi silmukkavirran. Vie osoitin matriisin alkion päälle nähdäksesi, mistä vastuksista se muodostuu.'),
            config: { mount: mountLab(warmDef()) } },
          { id: 't5-choose-q1', type: 'question', q: 't5-q3' }
        ]
      },

      // ================================================================= 3. EQUATIONS
      {
        id: 't5-equations', title: { en: 'Writing the loop equations: R·I = E', fi: 'Silmukkayhtälöiden kirjoittaminen: R·I = E' },
        blocks: [
          { id: 't5-eq-p1', type: 'text', html: {
            en: '<p>Our main example (Example 1) is the six-branch network from the previous section with values. Branches A, C and D contain emfs: <f>E_A = 15 V</f>, <f>E_C = 5 V</f>, <f>E_D = 10 V</f>. The resistors are <f>R_A = 4</f>, <f>R_B = 6</f>, <f>R_C = 2</f>, <f>R_D = 3</f>, <f>R_E = 10</f>, <f>R_F = 5 Ω</f>. With <f>b = 6</f> and <f>n = 4</f> we need <f>6 − 4 + 1 = 3</f> loops, one for each window.</p><p>The PDF does not draw the loop directions; the equations are consistent with <f>I_1</f> clockwise in the left window, <f>I_2</f> <em>counter-clockwise</em> in the right window and <f>I_3</f> clockwise in the top window. We use these.</p>',
            fi: '<p>Pääesimerkkimme (esimerkki 1) on edellisen osion kuuden haaran verkko arvoineen. Haaroissa A, C ja D on lähdejännitteet: <f>E_A = 15 V</f>, <f>E_C = 5 V</f>, <f>E_D = 10 V</f>. Vastukset ovat <f>R_A = 4</f>, <f>R_B = 6</f>, <f>R_C = 2</f>, <f>R_D = 3</f>, <f>R_E = 10</f>, <f>R_F = 5 Ω</f>. Kun <f>b = 6</f> ja <f>n = 4</f>, tarvitaan <f>6 − 4 + 1 = 3</f> silmukkaa, yksi kullekin ikkunalle.</p><p>PDF ei piirrä silmukkavirtojen suuntia; yhtälöt vastaavat tilannetta, jossa <f>I_1</f> kiertää vasemman ikkunan myötäpäivään, <f>I_2</f> oikean ikkunan <em>vastapäivään</em> ja <f>I_3</f> ylemmän ikkunan myötäpäivään. Käytämme näitä.</p>' } },
          { id: 't5-eq-h1', type: 'h', text: B('Step 1: KVL in each loop', 'Vaihe 1: silmukkalaki jokaisessa silmukassa') },
          { id: 't5-eq-p2', type: 'text', html: {
            en: '<p>Go once around each loop in the direction of its loop current. A resistor in a shared branch sees <em>all</em> loop currents flowing through it, added with signs. Emfs go to the right-hand side.</p><ul><li>Loop 1: <f>R_A I_1 + R_B (I_1 − I_3) + R_C (I_1 + I_2) = E_A − E_C</f></li><li>Loop 2: <f>R_C (I_1 + I_2) + R_E I_2 + R_D (I_2 + I_3) = E_D − E_C</f></li><li>Loop 3: <f>−R_B (I_1 − I_3) + R_F I_3 + R_D (I_2 + I_3) = E_D</f></li></ul>',
            fi: '<p>Kierrä kukin silmukka kerran silmukkavirran suuntaan. Yhteisessä haarassa olevan vastuksen läpi kulkevat <em>kaikki</em> sen läpi kulkevat silmukkavirrat etumerkkeineen. Lähdejännitteet siirretään oikealle puolelle.</p><ul><li>Silmukka 1: <f>R_A I_1 + R_B (I_1 − I_3) + R_C (I_1 + I_2) = E_A − E_C</f></li><li>Silmukka 2: <f>R_C (I_1 + I_2) + R_E I_2 + R_D (I_2 + I_3) = E_D − E_C</f></li><li>Silmukka 3: <f>−R_B (I_1 − I_3) + R_F I_3 + R_D (I_2 + I_3) = E_D</f></li></ul>' } },
          { id: 't5-eq-c1', type: 'callout', kind: 'info', title: B('Typo in the PDF', 'Painovirhe PDF:ssä'),
            html: B('The slide prints <f>R_D (I_1 + I_3)</f> in loop 2. It should read <f>R_D (I_2 + I_3)</f>: the PDF’s own numbers already use <f>I_2 + I_3</f>.',
                    'Diassa on silmukan 2 yhtälössä <f>R_D (I_1 + I_3)</f>. Oikea muoto on <f>R_D (I_2 + I_3)</f>: PDF:n omat luvut käyttävät jo summaa <f>I_2 + I_3</f>.') },
          { id: 't5-eq-h2', type: 'h', text: B('Step 2: collect terms by current', 'Vaihe 2: kerää termit virroittain') },
          { id: 't5-eq-p3', type: 'text', html: {
            en: '<p>Reordering by <f>I_1, I_2, I_3</f> and inserting the numbers gives</p>',
            fi: '<p>Järjestämällä termit virtojen <f>I_1, I_2, I_3</f> mukaan ja sijoittamalla luvut saadaan</p>' } },
          { id: 't5-eq-f1', type: 'formula', tex: '(4+6+2) I_1 + 2 I_2 − 6 I_3 = 10', label: B('Loop 1', 'Silmukka 1') },
          { id: 't5-eq-f2', type: 'formula', tex: '2 I_1 + (2+3+10) I_2 + 3 I_3 = 5', label: B('Loop 2', 'Silmukka 2') },
          { id: 't5-eq-f3', type: 'formula', tex: '−6 I_1 + 3 I_2 + (6+5+3) I_3 = 10', label: B('Loop 3', 'Silmukka 3') },
          { id: 't5-eq-h3', type: 'h', text: B('Step 3: matrix form', 'Vaihe 3: matriisimuoto') },
          { id: 't5-eq-t1', type: 'table', caption: B('Resistance matrix R of Example 1 (Ω), with I = [I₁ I₂ I₃]ᵀ and E = [10, 5, 10]ᵀ V', 'Esimerkin 1 resistanssimatriisi R (Ω); I = [I₁ I₂ I₃]ᵀ ja E = [10, 5, 10]ᵀ V'),
            head: ['', 'I₁', 'I₂', 'I₃', 'E (V)'],
            rows: [['1', { tex: 'R_A+R_B+R_C = 12' }, { tex: 'R_C = 2' }, { tex: '−R_B = −6' }, { tex: 'E_A − E_C = 10' }],
                   ['2', { tex: 'R_C = 2' }, { tex: 'R_C+R_D+R_E = 15' }, { tex: 'R_D = 3' }, { tex: 'E_D − E_C = 5' }],
                   ['3', { tex: '−R_B = −6' }, { tex: 'R_D = 3' }, { tex: 'R_B+R_D+R_F = 14' }, { tex: 'E_D = 10' }]] },
          { id: 't5-eq-h4', type: 'h', text: B('The rules: write R·I = E directly', 'Säännöt: kirjoita R·I = E suoraan') },
          { id: 't5-eq-list1', type: 'list', ordered: true, items: [
            B('<b>Diagonal</b> <f>R_ii</f> = sum of all resistances in loop <f>i</f>.', '<b>Lävistäjä</b> <f>R_ii</f> = silmukan <f>i</f> kaikkien vastusten summa.'),
            B('<b>Off-diagonal</b> <f>R_ij</f> (<f>i ≠ j</f>) = sum of the resistances common to loops <f>i</f> and <f>j</f>; <b>negative</b> if the two loop currents flow in opposite directions through them.', '<b>Lävistäjän ulkopuoli</b> <f>R_ij</f> (<f>i ≠ j</f>) = silmukoille <f>i</f> ja <f>j</f> yhteisten vastusten summa; <b>negatiivinen</b>, jos silmukkavirrat kulkevat niissä vastakkaisiin suuntiin.'),
            B('<b>Right-hand side</b> <f>E_i</f> = sum of the emfs in loop <f>i</f>; <b>+</b> when the emf drives current (from − to +) in the direction of the loop current, <b>−</b> otherwise.', '<b>Oikea puoli</b> <f>E_i</f> = silmukan <f>i</f> lähdejännitteiden summa; <b>+</b>, kun lähde ajaa virtaa (− navasta + napaan) silmukkavirran suuntaan, muuten <b>−</b>.'),
            B('The number of loops normally equals the number of windows, <f>b − n + 1</f>.', 'Silmukoiden lukumäärä on yleensä sama kuin ikkunoiden lukumäärä, <f>b − n + 1</f>.')
          ] },
          { id: 't5-eq-c2', type: 'callout', kind: 'tip', title: B('Symmetry check', 'Symmetriatarkistus'),
            html: B('If the circuit has only independent sources and resistors, <f>R_ij = R_ji</f>: the matrix is <dfn data-term="symmetricMatrix">symmetric</dfn>. A quick way to catch a sign slip!', 'Jos piirissä on vain riippumattomia lähteitä ja vastuksia, <f>R_ij = R_ji</f>: matriisi on <dfn data-term="symmetricMatrix">symmetrinen</dfn>. Nopea tapa löytää merkkivirhe!') },
          { id: 't5-eq-h5', type: 'h', text: B('Try it: build the equations of Example 1', 'Kokeile: rakenna esimerkin 1 yhtälöt') },
          { id: 't5-eq-w1', type: 'interactive', widget: 'custom', title: B('Mesh clicker: Example 1', 'Silmukkaklikkeri: esimerkki 1'),
            caption: B('Place the three loop currents one by one and watch the three equations appear term by term. Click a loop again to reverse it: signs in R and E change, but the physical currents do not. Hover over R₁₃ to see that it is −R_B.', 'Aseta kolme silmukkavirtaa yksi kerrallaan ja seuraa, miten kolme yhtälöä rakentuu termi kerrallaan. Napsauta silmukkaa uudelleen kääntääksesi sen: R:n ja E:n merkit muuttuvat, mutta fysikaaliset virrat eivät. Vie osoitin alkion R₁₃ päälle nähdäksesi, että se on −R_B.'),
            config: { mount: mountLab(ex1Def(true, HINT_CLICK)) } },
          { id: 't5-eq-q1', type: 'question', q: 't5-q4' },
          { id: 't5-eq-q2', type: 'question', q: 't5-q5' },
          { id: 't5-eq-q3', type: 'question', q: 't5-q6' },
          { id: 't5-eq-q4', type: 'question', q: 't5-q7' }
        ]
      },

      // ================================================================= 4. SOLVING
      {
        id: 't5-solve', title: { en: 'Solving and recovering branch currents', fi: 'Ratkaisu ja haaravirtojen määritys' },
        blocks: [
          { id: 't5-solve-p1', type: 'text', html: {
            en: '<p>The matrix equation is solved with a calculator (or by Gaussian elimination): <f>I = R^{-1} · E</f>. Once the loop currents are known, each <dfn data-term="branchCurrent">branch current</dfn> is the signed sum of the loop currents through that branch. A loop current that runs <em>along</em> the chosen reference direction of the branch counts <b>+</b>, one that runs against it counts <b>−</b>. Voltages follow from Ohm’s law.</p>',
            fi: '<p>Matriisiyhtälö ratkaistaan laskimella (tai Gaussin eliminoinnilla): <f>I = R^{-1} · E</f>. Kun silmukkavirrat tunnetaan, kukin <dfn data-term="branchCurrent">haaravirta</dfn> on haaran läpi kulkevien silmukkavirtojen etumerkillinen summa. Silmukkavirta, joka kulkee haaran valittuun vertailusuuntaan, lasketaan <b>+</b>, vastakkaiseen suuntaan kulkeva <b>−</b>. Jännitteet saadaan Ohmin laista.</p>' } },
          { id: 't5-solve-ex1', type: 'example', title: B('Example 1: all currents and the voltage across branch F', 'Esimerkki 1: kaikki virrat ja haaran F jännite'),
            problem: B('Solve all branch currents and the voltage <f>U_F</f> across branch F of the network above (reference directions: A, C, E downwards, B, D, F to the right).', 'Ratkaise yllä olevan verkon kaikki haaravirrat ja haaran F jännite <f>U_F</f> (vertailusuunnat: A, C, E alaspäin, B, D, F oikealle).'),
            given: ['E_A = 15 V', 'E_C = 5 V', 'E_D = 10 V', 'R_A = 4 Ω, R_B = 6 Ω, R_C = 2 Ω', 'R_D = 3 Ω, R_E = 10 Ω, R_F = 5 Ω'],
            steps: [
              B('<b>Loops:</b> <f>b − n + 1 = 6 − 4 + 1 = 3</f>, one per window: <f>I_1</f> (left, clockwise), <f>I_2</f> (right, counter-clockwise), <f>I_3</f> (top, clockwise).', '<b>Silmukat:</b> <f>b − n + 1 = 6 − 4 + 1 = 3</f>, yksi per ikkuna: <f>I_1</f> (vasen, myötäpäivään), <f>I_2</f> (oikea, vastapäivään), <f>I_3</f> (ylä, myötäpäivään).'),
              B('<b>Matrix equation:</b>', '<b>Matriisiyhtälö:</b>'),
              { tex: '[[12, 2, −6], [2, 15, 3], [−6, 3, 14]] · [I_1, I_2, I_3] = [10, 5, 10]' },
              B('<b>Solve</b> <f>I = R^{-1} E</f>:', '<b>Ratkaise</b> <f>I = R^{-1} E</f>:'),
              { tex: 'I_1 = 1.571 A,   I_2 = −0.1606 A,   I_3 = 1.422 A' },
              B('<b>Branch currents</b> from the loop currents:', '<b>Haaravirrat</b> silmukkavirroista:'),
              { tex: 'I_A = −I_1 = −1.571 A,   I_B = I_1 − I_3 = 0.1491 A' },
              { tex: 'I_C = I_1 + I_2 = 1.411 A,   I_D = −I_2 − I_3 = −1.261 A' },
              { tex: 'I_E = −I_2 = 0.1606 A,   I_F = I_3 = 1.422 A' },
              B('<b>Voltage across F</b> (Ohm’s law):', '<b>Haaran F jännite</b> (Ohmin laki):'),
              { tex: 'U_F = R_F · I_F = 5 · 1.422 ≈ 7.1 V' },
              B('<b>Check</b> with KCL at node 1: <f>I_A = −I_B − I_F</f> → <f>−0.1491 − 1.422 = −1.571</f> ✓.', '<b>Tarkistus</b> solmulailla solmussa 1: <f>I_A = −I_B − I_F</f> → <f>−0.1491 − 1.422 = −1.571</f> ✓.')
            ],
            result: B('<f>I_A..I_F</f> = −1.571, 0.1491, 1.411, −1.261, 0.1606, 1.422 A; <f>U_F ≈ 7.1 V</f>', '<f>I_A..I_F</f> = −1,571; 0,1491; 1,411; −1,261; 0,1606; 1,422 A; <f>U_F ≈ 7,1 V</f>') },
          { id: 't5-solve-c1', type: 'callout', kind: 'warn', title: B('Error in the original slide', 'Virhe alkuperäisessä diassa'),
            html: B('The original slide gives <f>I_2 = +0.1616 A</f> and therefore <f>I_C = 1.733 A</f>, <f>I_D = −1.584 A</f>, <f>I_E = −0.1616 A</f>. These are <b>wrong</b>. Substituting back shows it: with <f>I_2 = +0.1616</f> the second equation gives <f>2·1.571 + 15·0.1616 + 3·1.422 = 9.83 ≠ 5</f>. The correct value is <f>I_2 = −0.1606 A</f> (negative: it actually flows clockwise). <f>I_1</f>, <f>I_3</f> and <f>U_F = 7.1 V</f> on the slide were right. <b>Lesson:</b> always check your solution by substituting it into the original equations or with KCL.',
                    'Alkuperäisessä diassa on <f>I_2 = +0,1616 A</f> ja siitä johdettuna <f>I_C = 1,733 A</f>, <f>I_D = −1,584 A</f>, <f>I_E = −0,1616 A</f>. Nämä ovat <b>väärin</b>. Sijoitus takaisin paljastaa virheen: kun <f>I_2 = +0,1616</f>, toinen yhtälö antaa <f>2·1,571 + 15·0,1616 + 3·1,422 = 9,83 ≠ 5</f>. Oikea arvo on <f>I_2 = −0,1606 A</f> (negatiivinen: virta kiertää todellisuudessa myötäpäivään). Dian <f>I_1</f>, <f>I_3</f> ja <f>U_F = 7,1 V</f> olivat oikein. <b>Opetus:</b> tarkista ratkaisu aina sijoittamalla se alkuperäisiin yhtälöihin tai solmulailla.') },
          { id: 't5-solve-q1', type: 'question', q: 't5-q8' },
          { id: 't5-solve-h1', type: 'h', text: B('Live solver: Example 1', 'Elävä ratkaisija: esimerkki 1') },
          { id: 't5-solve-w1', type: 'interactive', widget: 'custom', title: B('Example 1 with animated currents', 'Esimerkki 1 animoiduin virroin'),
            caption: B('Moving dots show the real direction of each branch current; in shared branches you can see the loop currents add or subtract. The small triangle is the reference direction of the branch. Change E_A, E_D or R_F and watch the solution.', 'Liikkuvat pisteet näyttävät haaravirtojen todellisen suunnan; yhteisissä haaroissa nähdään, miten silmukkavirrat summautuvat tai vähentävät toisiaan. Pieni kolmio on haaran vertailusuunta. Muuta arvoja E_A, E_D tai R_F ja seuraa ratkaisua.'),
            config: { mount: mountLab(ex1Def(false, HINT_LIVE)) } },
          { id: 't5-solve-h2', type: 'h', text: B('The same network in the circuit simulator', 'Sama verkko piirisimulaattorissa') },
          { id: 't5-solve-circ', type: 'interactive', widget: 'circuit', title: B('Check with the simulator', 'Tarkista simulaattorilla'),
            caption: B('This simulator solves the circuit with a different method (nodal analysis). Click a part to edit its value, and compare the currents in the table with your loop-method result.', 'Tämä simulaattori ratkaisee piirin eri menetelmällä (solmupistemenetelmä). Napsauta komponenttia muuttaaksesi sen arvoa ja vertaa taulukon virtoja silmukkamenetelmän tulokseen.'),
            config: ex1CircuitCfg() },
          { id: 't5-solve-h3', type: 'h', text: B('What does I₁ depend on?', 'Mistä I₁ riippuu?') },
          { id: 't5-solve-plot', type: 'interactive', widget: 'plot', title: B('Loop current I₁ as a function of E_A', 'Silmukkavirta I₁ lähdejännitteen E_A funktiona'),
            caption: B('The equations are linear, so I₁ is a straight line in E_A. The zero crossing is the E_A for which I₁ = 0.', 'Yhtälöt ovat lineaarisia, joten I₁ on suora E_A:n suhteen. Nollakohta on E_A, jolla I₁ = 0.'),
            config: {
              x: { min: 0, max: 30, label: B('Source voltage E_A', 'Lähdejännite E_A'), unit: 'V' },
              y: { min: -3, max: 6, label: B('Loop current I₁', 'Silmukkavirta I₁'), unit: 'A' },
              params: [{ id: 'ED', tex: 'E_D', min: 0, max: 30, step: 0.5, value: 10, unit: 'V' }, { id: 'RF', tex: 'R_F', min: 1, max: 30, step: 1, value: 5, unit: 'Ω' }],
              curves: [{ fn: function (x, p) { return solveEx1(x, p.ED, p.RF)[0]; }, label: B('I₁(E_A)', 'I₁(E_A)') }],
              points: function (p) { return [{ x: 15, y: solveEx1(15, p.ED, p.RF)[0], label: 'E_A = 15 V' }]; },
              vlines: function (p) { var a = solveEx1(0, p.ED, p.RF)[0], b = solveEx1(1, p.ED, p.RF)[0] - a; return [{ x: -a / b, label: B('I₁ = 0', 'I₁ = 0') }]; },
              readouts: function (p) { var I = solveEx1(15, p.ED, p.RF); return [{ tex: 'I_2', value: I[1], unit: 'A' }, { tex: 'I_3', value: I[2], unit: 'A' }]; }
            } },
          { id: 't5-solve-q2', type: 'question', q: 't5-q9' }
        ]
      },

      // ================================================================= 5. CURRENT SOURCES
      {
        id: 't5-sources', title: { en: 'Current sources: converting to voltage sources', fi: 'Virtalähteet: muunnos jännitelähteiksi' },
        blocks: [
          { id: 't5-src-p1', type: 'text', html: {
            en: '<p>The loop method is built on <em>voltage</em> equations, so <dfn data-term="currentSource">current sources</dfn> are first converted to voltage sources. A current source <f>J</f> with a parallel resistance <f>R</f> is equivalent to an emf <f>E = R · J</f> in series with the same <f>R</f> (<dfn data-term="sourceConversion">source conversion</dfn>).</p>',
            fi: '<p>Silmukkavirtamenetelmä perustuu <em>jänniteyhtälöihin</em>, joten <dfn data-term="currentSource">virtalähteet</dfn> muunnetaan ensin jännitelähteiksi. Virtalähde <f>J</f> ja sen rinnalla oleva resistanssi <f>R</f> vastaavat lähdejännitettä <f>E = R · J</f> ja samaa resistanssia <f>R</f> sarjassa (<dfn data-term="sourceConversion">lähteen muunnos</dfn>).</p>' } },
          { id: 't5-src-f1', type: 'formula', key: true, tex: 'E = R · J', label: B('Current source → voltage source', 'Virtalähteestä jännitelähteeksi'),
            legend: [['J', B('source current (arrow = emf direction)', 'lähdevirta (nuoli = lähdejännitteen suunta)'), 'A'], ['R', B('parallel (internal) resistance', 'rinnakkainen (sisäinen) resistanssi'), 'Ω'], ['E', B('equivalent emf', 'ekvivalentti lähdejännite'), 'V']] },
          { id: 't5-src-w1', type: 'interactive', widget: 'readout', title: B('Source conversion', 'Lähteen muunnos'),
            caption: B('Change J and R: the equivalent emf E = R·J follows, the series resistance stays R.', 'Muuta arvoja J ja R: ekvivalentti lähdejännite E = R·J muuttuu, sarjaresistanssi pysyy R:nä.'),
            config: { params: [{ id: 'J', tex: 'J', min: 0, max: 10, step: 0.5, value: 2, unit: 'A' }, { id: 'R', tex: 'R', min: 1, max: 50, step: 1, value: 10, unit: 'Ω' }],
              outputs: function (v) { return [{ tex: 'E = R·J', value: v.R * v.J, unit: 'V' }, { tex: 'R_{series}', value: v.R, unit: 'Ω' }]; } } },
          { id: 't5-src-q1', type: 'question', q: 't5-q10' },
          { id: 't5-src-h1', type: 'h', text: B('Ideal current source: split it first', 'Ideaalinen virtalähde: jaa se ensin') },
          { id: 't5-src-p2', type: 'text', html: {
            en: '<p>If the current source is <b>ideal</b> (no resistor in parallel with it), split the single source into several identical sources <f>J</f> so that each one has a resistor in parallel with it. The link between the added nodes carries <f>I = 0</f>, so nothing changes. Then convert each source. In the figure, <f>J</f> over <f>R_2</f> and <f>R_3</f> becomes two sources <f>J R_2</f> and <f>J R_3</f> in series with them.</p>',
            fi: '<p>Jos virtalähde on <b>ideaalinen</b> (sen rinnalla ei ole vastusta), jaa yksi lähde useiksi samanlaisiksi lähteiksi <f>J</f> niin, että kunkin rinnalla on vastus. Lisättyjen solmujen välinen yhteys kuljettaa virran <f>I = 0</f>, joten mikään ei muutu. Muunna sen jälkeen jokainen lähde. Kuvassa <f>R_2</f>:n ja <f>R_3</f>:n yli oleva <f>J</f> muuttuu kahdeksi sarjaan kytketyksi lähteeksi <f>J R_2</f> ja <f>J R_3</f>.</p>' } },
          { id: 't5-src-fig1', type: 'figure', svg: SVG_SPLIT,
            caption: B('Result of splitting and converting: the voltage sources J·R₂ and J·R₃ sit in series with R₂ and R₃ (– on the left, + on the right).', 'Jaon ja muunnoksen tulos: jännitelähteet J·R₂ ja J·R₃ ovat sarjassa vastusten R₂ ja R₃ kanssa (– vasemmalla, + oikealla).'),
            alt: { en: 'Network with two voltage sources J R2 and J R3 in the top branch', fi: 'Verkko, jonka yläharassa on kaksi jännitelähdettä J R2 ja J R3' } },
          { id: 't5-src-h2', type: 'h', text: B('Example 2: a circuit with a current source', 'Esimerkki 2: virtalähteen sisältävä piiri') },
          { id: 't5-src-ex2', type: 'example', title: B('Example 2: find V₃ and I₃', 'Esimerkki 2: määritä V₃ ja I₃'),
            problem: B('A network has the branches: <f>E_1 = 100 V</f> in series with <f>R_1 = 2.5 Ω</f>; a current source <f>J = 10 A</f> (pointing up) in parallel with <f>R_3 = 5 Ω</f>; and <f>E_2 = 50 V</f> in series with <f>R_2 = 3.3 Ω</f> (all emfs pointing up). Find the voltage <f>V_3</f> across <f>R_3</f> and the current <f>I_3</f> (downwards through <f>R_3</f>).',
                       'Verkon haarat: <f>E_1 = 100 V</f> ja <f>R_1 = 2,5 Ω</f> sarjassa; virtalähde <f>J = 10 A</f> (ylöspäin) vastuksen <f>R_3 = 5 Ω</f> rinnalla; sekä <f>E_2 = 50 V</f> ja <f>R_2 = 3,3 Ω</f> sarjassa (kaikki lähdejännitteet ylöspäin). Määritä vastuksen <f>R_3</f> jännite <f>V_3</f> ja virta <f>I_3</f> (alaspäin vastuksen <f>R_3</f> läpi).'),
            given: ['E_1 = 100 V, R_1 = 2.5 Ω', 'J = 10 A, R_3 = 5 Ω', 'E_2 = 50 V, R_2 = 3.3 Ω'],
            steps: [
              B('<b>Convert</b> the current source using <f>R_3</f> as its internal resistance:', '<b>Muunna</b> virtalähde käyttäen vastusta <f>R_3</f> sisäisenä resistanssina:'),
              { tex: 'E_J = R_3 · J = 5 · 10 = 50 V' },
              B('<b>Two loops</b> (<f>b = 3</f>, <f>n = 2</f>): <f>I_a</f> left, <f>I_b</f> right, both clockwise, so <f>R_3</f> carries them in opposite directions.', '<b>Kaksi silmukkaa</b> (<f>b = 3</f>, <f>n = 2</f>): <f>I_a</f> vasemmalla, <f>I_b</f> oikealla, molemmat myötäpäivään, joten <f>R_3</f>:ssa ne kulkevat vastakkain.'),
              { tex: '(R_1 + R_3) I_a − R_3 I_b = E_1 − E_J' },
              { tex: '−R_3 I_a + (R_3 + R_2) I_b = E_J − E_2' },
              B('<b>Numbers:</b>', '<b>Luvut:</b>'),
              { tex: '7.5 I_a − 5 I_b = 50' },
              { tex: '−5 I_a + 8.3 I_b = 0' },
              B('<b>Solve:</b>', '<b>Ratkaise:</b>'),
              { tex: 'I_a = 11.14 A,   I_b = 6.71 A' },
              B('<b>Voltage</b> across the right branch (equal to <f>V_3</f>):', '<b>Jännite</b> oikean haaran yli (sama kuin <f>V_3</f>):'),
              { tex: 'V_3 = R_2 I_b + E_2 = 3.3 · 6.71 + 50 ≈ 72.1 V' },
              { tex: 'I_3 = V_3 / R_3 = 72.1 / 5 ≈ 14.4 A' }
            ],
            result: B('<f>V_3 ≈ 72.1 V</f> (exact 72.15 V), <f>I_3 ≈ 14.4 A</f> (exact 14.43 A), downwards through <f>R_3</f>', '<f>V_3 ≈ 72,1 V</f> (tarkka 72,15 V), <f>I_3 ≈ 14,4 A</f> (tarkka 14,43 A), alaspäin vastuksen <f>R_3</f> läpi') },
          { id: 't5-src-p3', type: 'text', html: {
            en: '<p>Try it below. Change <f>J</f> or <f>R_3</f>: the emf <f>E_J = R_3 J</f> updates, the loop currents are re-solved, and <f>V_3</f> and <f>I_3</f> are found from the converted circuit. (The middle branch current points upwards through the converted source, so <f>I_3 = J − I_m</f>.)</p>',
            fi: '<p>Kokeile alla. Muuta arvoja <f>J</f> tai <f>R_3</f>: lähdejännite <f>E_J = R_3 J</f> päivittyy, silmukkavirrat ratkaistaan uudelleen ja <f>V_3</f> sekä <f>I_3</f> saadaan muunnetusta piiristä. (Keskihaaran virta suuntautuu muunnetun lähteen läpi ylöspäin, joten <f>I_3 = J − I_m</f>.)</p>' } },
          { id: 't5-src-w2', type: 'interactive', widget: 'custom', title: B('Example 2 (converted circuit)', 'Esimerkki 2 (muunnettu piiri)'),
            caption: B('Place I_a and I_b, then read V₃ and I₃ below. Compare with the example.', 'Aseta I_a ja I_b ja lue sitten V₃ ja I₃ alta. Vertaa esimerkkiin.'),
            config: { mount: mountLab(ex2Def()) } },
          { id: 't5-src-q2', type: 'question', q: 't5-q11' }
        ]
      },

      // ================================================================= 6. PROCEDURE
      {
        id: 't5-procedure', title: { en: 'Summary: the procedure', fi: 'Yhteenveto: menettely' },
        blocks: [
          { id: 't5-proc-p1', type: 'text', html: {
            en: '<p>The loop method is easy to apply to circuits with two or more loops. Combine parallel resistors into one branch first: this removes unnecessary branches and equations. The six steps:</p>',
            fi: '<p>Silmukkavirtamenetelmää on helppo soveltaa piireihin, joissa on kaksi tai useampi silmukka. Yhdistä ensin rinnakkaiset vastukset yhdeksi haaraksi: näin poistuu turhia haaroja ja yhtälöitä. Kuusi vaihetta:</p>' } },
          { id: 't5-proc-list', type: 'list', ordered: true, items: [
            B('Transform current sources to voltage sources.', 'Muunna virtalähteet jännitelähteiksi.'),
            B('Remove parallel connections of resistors (combine them).', 'Poista vastusten rinnankytkennät (yhdistä ne).'),
            B('Select suitable loops; their number is <f>b − n + 1</f>.', 'Valitse sopivat silmukat; niiden lukumäärä on <f>b − n + 1</f>.'),
            B('Write the matrix equation <f>R · I = E</f> using the loop currents.', 'Kirjoita matriisiyhtälö <f>R · I = E</f> silmukkavirroilla.'),
            B('Solve <f>I = R^{-1} · E</f> with a calculator.', 'Ratkaise <f>I = R^{-1} · E</f> laskimella.'),
            B('Determine the variables you need from the circuit (branch currents, voltages, powers).', 'Määritä tarvittavat suureet piiristä (haaravirrat, jännitteet, tehot).')
          ] },
          // (extra) checklist
          { id: 't5-proc-h1', type: 'h', text: B('(extra) Checklist before you trust the answer', '(lisä) Tarkistuslista ennen kuin luotat vastaukseen') },
          { id: 't5-proc-list2', type: 'list', items: [
            B('Did every branch land in at least one loop? Is the number of loops exactly <f>b − n + 1</f>?', 'Onko jokainen haara vähintään yhdessä silmukassa? Onko silmukoita täsmälleen <f>b − n + 1</f>?'),
            B('Diagonal entries all positive; off-diagonal entries negative where loop currents oppose.', 'Lävistäjäalkiot ovat positiivisia; muut alkiot negatiivisia siellä, missä silmukkavirrat ovat vastakkaiset.'),
            B('Is the matrix symmetric (only independent sources and resistors)?', 'Onko matriisi symmetrinen (vain riippumattomat lähteet ja vastukset)?'),
            B('Emf signs: + only if the source pushes in the direction of the loop current.', 'Lähdejännitteiden merkit: + vain, jos lähde ajaa silmukkavirran suuntaan.'),
            B('Substitute the solution back or check KCL at a node. A negative loop current just means the real current flows the other way.', 'Sijoita ratkaisu takaisin tai tarkista solmulaki jossakin solmussa. Negatiivinen silmukkavirta tarkoittaa vain, että todellinen virta kulkee toiseen suuntaan.')
          ] },
          { id: 't5-proc-q1', type: 'question', q: 't5-q12' },
          { id: 't5-proc-q2', type: 'question', q: 't5-q13' },
          // (extra) supermesh
          { id: 't5-proc-h2', type: 'h', text: B('(extra) An ideal current source between two loops: the supermesh', '(lisä) Ideaalinen virtalähde kahden silmukan välissä: supersilmukka') },
          { id: 't5-proc-p2', type: 'text', html: {
            en: '<p>Sometimes a current source cannot be converted, for example when it is the only element of the branch shared by two loops. Then write:</p><ol><li>a <b>constraint</b> from the source: the current difference of the two loops equals <f>J</f>;</li><li>one KVL equation around the <dfn data-term="supermesh">supermesh</dfn>, the outer loop that goes around both meshes and skips the source branch.</li></ol>',
            fi: '<p>Joskus virtalähdettä ei voi muuntaa, esimerkiksi kun se on kahden silmukan yhteisen haaran ainoa komponentti. Silloin kirjoitetaan:</p><ol><li>lähteen antama <b>rajoite</b>: kahden silmukkavirran erotus on <f>J</f>;</li><li>yksi jänniteyhtälö <dfn data-term="supermesh">supersilmukan</dfn> ympäri, eli molempien silmukoiden ympäri kulkevan ulkosilmukan, joka ohittaa lähdehaaran.</li></ol>' } },
          { id: 't5-proc-fig1', type: 'figure', svg: SVG_SUPER,
            caption: B('Left branch: E = 20 V with R₁ = 2 Ω. Middle branch: ideal current source J = 3 A pointing down. Right branch: R₂ = 4 Ω. Both loop currents clockwise.', 'Vasen haara: E = 20 V ja R₁ = 2 Ω. Keskihaara: ideaalinen virtalähde J = 3 A alaspäin. Oikea haara: R₂ = 4 Ω. Molemmat silmukkavirrat myötäpäivään.'),
            alt: { en: 'Supermesh example circuit', fi: 'Supersilmukkaesimerkin piiri' } },
          { id: 't5-proc-ex1', type: 'example', title: B('(extra) Supermesh example', '(lisä) Supersilmukkaesimerkki'),
            problem: B('Find both loop currents of the circuit in the figure.', 'Määritä kuvan piirin molemmat silmukkavirrat.'),
            given: ['E = 20 V', 'R_1 = 2 Ω, R_2 = 4 Ω', 'J = 3 A'],
            steps: [
              B('The source branch carries <f>I_a − I_b</f> downwards, and this must equal <f>J</f>:', 'Lähdehaara kuljettaa virran <f>I_a − I_b</f> alaspäin, ja sen täytyy olla <f>J</f>:'),
              { tex: 'I_a − I_b = 3' },
              B('KVL around the outer loop (the source branch is skipped, since its voltage is unknown):', 'Silmukkalaki ulkosilmukan ympäri (lähdehaara ohitetaan, koska sen jännite on tuntematon):'),
              { tex: 'R_1 I_a + R_2 I_b = E   →   2 I_a + 4 I_b = 20' },
              B('Substitute <f>I_a = I_b + 3</f>:', 'Sijoita <f>I_a = I_b + 3</f>:'),
              { tex: '2 (I_b + 3) + 4 I_b = 20   →   6 I_b = 14' },
              { tex: 'I_b = 2.333 A,   I_a = 5.333 A' }
            ],
            result: B('<f>I_a = 5.33 A</f>, <f>I_b = 2.33 A</f>', '<f>I_a = 5,33 A</f>, <f>I_b = 2,33 A</f>') },
          { id: 't5-proc-q3', type: 'question', q: 't5-q14' }
        ]
      },

      // ================================================================= 7. COMPARISON (extra)
      {
        id: 't5-compare', title: { en: '(extra) Loop method vs. branch-current method', fi: '(lisä) Silmukkavirtamenetelmä ja haaravirtamenetelmä' },
        blocks: [
          { id: 't5-cmp-p1', type: 'text', html: {
            en: '<p>The Kirchhoff <em>branch-current</em> method uses the <f>b</f> branch currents as unknowns: write <f>n − 1</f> KCL equations and <f>b − n + 1</f> KVL equations, then solve a <f>b × b</f> system. The loop method hides the KCL equations: choosing loop currents makes KCL true automatically, so only the <f>b − n + 1</f> KVL equations remain.</p>',
            fi: '<p>Kirchhoffin <em>haaravirtamenetelmässä</em> tuntemattomina ovat <f>b</f> haaravirtaa: kirjoitetaan <f>n − 1</f> solmuyhtälöä ja <f>b − n + 1</f> silmukkayhtälöä ja ratkaistaan <f>b × b</f> -yhtälöryhmä. Silmukkavirtamenetelmässä solmuyhtälöt piiloutuvat: silmukkavirtojen valinta toteuttaa solmulain automaattisesti, joten jäljelle jäävät vain <f>b − n + 1</f> jänniteyhtälöä.</p>' } },
          { id: 't5-cmp-t1', type: 'table', caption: B('Example 1 (b = 6, n = 4)', 'Esimerkki 1 (b = 6, n = 4)'),
            head: [B('', ''), B('Branch-current method', 'Haaravirtamenetelmä'), B('Loop method', 'Silmukkavirtamenetelmä')],
            rows: [
              [B('Unknowns', 'Tuntemattomat'), B('6 branch currents', '6 haaravirtaa'), B('3 loop currents', '3 silmukkavirtaa')],
              [B('KCL equations', 'Solmuyhtälöt'), { tex: 'n − 1 = 3' }, B('0 (automatic)', '0 (automaattisesti)')],
              [B('KVL equations', 'Jänniteyhtälöt'), { tex: 'b − n + 1 = 3' }, { tex: 'b − n + 1 = 3' }],
              [B('System size', 'Yhtälöryhmän koko'), '6 × 6', '3 × 3'],
              [B('Branch currents', 'Haaravirrat'), B('directly', 'suoraan'), B('sums of loop currents', 'silmukkavirtojen summina')]
            ] },
          { id: 't5-cmp-c1', type: 'callout', kind: 'tip', title: B('When to choose which', 'Kumpi kannattaa valita'),
            html: B('The loop method is best for planar circuits with many branches in parallel with few loops and mostly voltage sources. If a circuit has many nodes but few branches per node, a nodal (node-voltage) method may need fewer equations. Both give identical physical results.',
                    'Silmukkavirtamenetelmä sopii tasopiireille, joissa on vähän silmukoita ja pääasiassa jännitelähteitä. Jos piirissä on paljon solmuja mutta vähän haaroja, solmupistemenetelmä voi vaatia vähemmän yhtälöitä. Molemmat antavat saman fysikaalisen tuloksen.') },
          { id: 't5-cmp-q1', type: 'question', q: 't5-q15' },
          { id: 't5-cmp-h1', type: 'h', text: B('Adjust the circuit: when does a loop current vanish?', 'Säädä piiriä: milloin silmukkavirta häviää?') },
          { id: 't5-cmp-circ', type: 'interactive', widget: 'circuit', title: B('Right-hand branch current', 'Oikean haaran virta'),
            caption: B('The ammeter shows the current in the right branch, which is the loop current I_b. Drag E₁ (click the source) and find the value where it is zero. Think: then no current flows in R₃ and the middle resistor sees the voltage E₂ across it.', 'Virtamittari näyttää oikean haaran virran, joka on silmukkavirta I_b. Muuta E₁:tä (napsauta lähdettä) ja etsi arvo, jolla virta on nolla. Mieti: silloin R₃:ssa ei kulje virtaa ja keskimmäisen vastuksen yli on jännite E₂.'),
            config: (function () { var c = twoLoopCfg('value'); delete c.answer; return c; })() },
          { id: 't5-cmp-q2', type: 'question', q: 't5-q16' }
        ]
      }
    ],

    // =================================================================================== QUESTIONS (no answers here)
    questions: [
      // ---------- practice ----------
      { id: 't5-q1', mode: 'practice', type: 'mc', difficulty: 1,
        prompt: B('A circuit has <f>b = 8</f> branches and <f>n = 5</f> nodes. How many loop currents are needed?', 'Piirissä on <f>b = 8</f> haaraa ja <f>n = 5</f> solmua. Montako silmukkavirtaa tarvitaan?'),
        options: [{ id: 'a', html: B('3', '3') }, { id: 'b', html: B('4', '4') }, { id: 'c', html: B('5', '5') }, { id: 'd', html: B('8', '8') }],
        hints: [B('Use <f>b − n + 1</f>.', 'Käytä kaavaa <f>b − n + 1</f>.')] },
      { id: 't5-q2', mode: 'practice', type: 'mc', difficulty: 1,
        prompt: B('Why is the 4th KCL equation of a 4-node network not needed?', 'Miksi nelisolmuisen verkon neljättä solmuyhtälöä ei tarvita?'),
        options: [
          { id: 'a', html: B('It is wrong and must be discarded.', 'Se on väärin ja se hylätään.') },
          { id: 'b', html: B('It follows from the other three (linearly dependent): only <f>n − 1</f> are independent.', 'Se seuraa kolmesta muusta (lineaarisesti riippuvainen): vain <f>n − 1</f> on riippumatonta.') },
          { id: 'c', html: B('Only three nodes matter physically.', 'Vain kolmella solmulla on fysikaalista merkitystä.') }
        ] },
      { id: 't5-q3', mode: 'practice', type: 'fill', difficulty: 2,
        prompt: B('Warm-up circuit with <f>R_1 = 2 Ω</f> (left loop only), <f>R_2 = 4 Ω</f> (shared) and <f>R_3 = 6 Ω</f> (right loop only). Both loop currents are clockwise. Give the resistance matrix entries.', 'Lämmittelypiiri: <f>R_1 = 2 Ω</f> (vain vasen silmukka), <f>R_2 = 4 Ω</f> (yhteinen) ja <f>R_3 = 6 Ω</f> (vain oikea silmukka). Molemmat silmukkavirrat kiertävät myötäpäivään. Anna resistanssimatriisin alkiot.'),
        text: B('R11 = [[a]] Ω, R12 = [[b]] Ω, R22 = [[c]] Ω', 'R11 = [[a]] Ω, R12 = [[b]] Ω, R22 = [[c]] Ω'),
        fields: [{ id: 'a', kind: 'num' }, { id: 'b', kind: 'num' }, { id: 'c', kind: 'num' }] },
      { id: 't5-q4', mode: 'practice', type: 'mc', difficulty: 1,
        prompt: B('When is an off-diagonal element <f>R_ij</f> negative?', 'Milloin lävistäjän ulkopuolinen alkio <f>R_ij</f> on negatiivinen?'),
        options: [
          { id: 'a', html: B('Always, because it is a coupling term.', 'Aina, koska se on kytkentätermi.') },
          { id: 'b', html: B('When the loop currents <f>i</f> and <f>j</f> flow in opposite directions through the shared resistance.', 'Kun silmukkavirrat <f>i</f> ja <f>j</f> kulkevat yhteisen resistanssin läpi vastakkaisiin suuntiin.') },
          { id: 'c', html: B('When the shared resistance is larger than the own resistances.', 'Kun yhteinen resistanssi on suurempi kuin omat resistanssit.') },
          { id: 'd', html: B('When there is an emf in the shared branch.', 'Kun yhteisessä haarassa on lähdejännite.') }
        ] },
      { id: 't5-q5', mode: 'practice', type: 'fill', difficulty: 2,
        prompt: B('In Example 1 (loop currents as in the lesson) fill in the matrix entries.', 'Täydennä esimerkin 1 matriisin alkiot (silmukkavirrat kuten oppitunnilla).'),
        text: B('R13 = [[a]] Ω, R22 = [[b]] Ω, E2 = [[c]] V', 'R13 = [[a]] Ω, R22 = [[b]] Ω, E2 = [[c]] V'),
        fields: [{ id: 'a', kind: 'num' }, { id: 'b', kind: 'num' }, { id: 'c', kind: 'num' }] },
      { id: 't5-q6', mode: 'practice', type: 'match', difficulty: 1,
        prompt: B('Match each matrix quantity with its meaning.', 'Yhdistä matriisisuure ja sen merkitys.'),
        left: [{ id: 'd', html: B('<f>R_ii</f>', '<f>R_ii</f>') }, { id: 'o', html: B('<f>R_ij</f>, <f>i ≠ j</f>', '<f>R_ij</f>, <f>i ≠ j</f>') }, { id: 'e', html: B('<f>E_i</f>', '<f>E_i</f>') }, { id: 'x', html: B('<f>R_13</f> in Example 1', '<f>R_13</f> esimerkissä 1') }],
        right: [
          { id: 'r1', html: B('sum of the emfs in loop i, signed by direction', 'silmukan i lähdejännitteiden summa suunnan mukaisin etumerkein') },
          { id: 'r2', html: B('−R_B', '−R_B') },
          { id: 'r3', html: B('sum of the resistances in loop i', 'silmukan i vastusten summa') },
          { id: 'r4', html: B('shared resistance, negative if the loop currents oppose', 'yhteinen resistanssi, negatiivinen jos silmukkavirrat ovat vastakkaiset') }
        ] },
      { id: 't5-q7', mode: 'practice', type: 'numeric', difficulty: 3,
        prompt: B('In Example 1 reverse loop 2 so that <f>I_2</f> now runs <em>clockwise</em> (loops 1 and 3 unchanged). Give the new <f>R_12</f>, <f>R_23</f>, <f>E_2</f> and the new solved value of <f>I_2</f>.', 'Käännä esimerkissä 1 silmukka 2 niin, että <f>I_2</f> kiertää nyt <em>myötäpäivään</em> (silmukat 1 ja 3 ennallaan). Anna uudet <f>R_12</f>, <f>R_23</f>, <f>E_2</f> sekä uusi ratkaistu <f>I_2</f>.'),
        fields: [{ id: 'R12', tex: 'R_12', unit: 'Ω' }, { id: 'R23', tex: 'R_23', unit: 'Ω' }, { id: 'E2', tex: 'E_2', unit: 'V' }, { id: 'I2', tex: 'I_2', unit: 'A' }],
        hints: [B('Reversing the loop direction flips the sign of every term that couples loop 2 to its neighbours, and of the emfs inside loop 2.', 'Silmukan suunnan kääntö vaihtaa etumerkin kaikilta termeiltä, jotka kytkevät silmukan 2 naapureihin, sekä silmukan 2 lähdejännitteiltä.'),
          B('Now check in each shared resistor whether the two loop currents run the same way or opposite ways, and whether each emf in loop 2 helps or opposes I2.', 'Tarkista kussakin yhteisessä vastuksessa, kulkevatko silmukkavirrat samaan vai vastakkaiseen suuntaan, ja auttaako vai vastustaako kukin silmukan 2 lähdejännite virtaa I2.'),
          B('After rewriting R12, R23 and E2, solve R·I = E again (or use the live widget). Think about what the new I2 means physically compared with the old one.', 'Kirjoita R12, R23 ja E2 uudelleen ja ratkaise sitten R·I = E (tai käytä interaktiivista kaaviota). Mieti, mitä uusi I2 tarkoittaa fysikaalisesti vanhaan verrattuna.')] },
      { id: 't5-q8', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.02,
        prompt: B('Spot the error: the original slide has <f>I_2 = +0.1616 A</f>. With the correct loop currents <f>I_1 = 1.571 A</f>, <f>I_2 = −0.1606 A</f>, <f>I_3 = 1.422 A</f> find the branch currents (reference directions: C, E downwards; D to the right).', 'Etsi virhe: alkuperäisessä diassa on <f>I_2 = +0,1616 A</f>. Laske oikeilla silmukkavirroilla <f>I_1 = 1,571 A</f>, <f>I_2 = −0,1606 A</f>, <f>I_3 = 1,422 A</f> haaravirrat (vertailusuunnat: C ja E alaspäin, D oikealle).'),
        fields: [{ id: 'IC', tex: 'I_C', unit: 'A' }, { id: 'ID', tex: 'I_D', unit: 'A' }, { id: 'IE', tex: 'I_E', unit: 'A' }],
        hints: [B('<f>I_C = I_1 + I_2</f>, <f>I_D = −I_2 − I_3</f>, <f>I_E = −I_2</f>.', '<f>I_C = I_1 + I_2</f>, <f>I_D = −I_2 − I_3</f>, <f>I_E = −I_2</f>.')] },
      { id: 't5-q9', mode: 'practice', type: 'slider', difficulty: 3, tol: 0.05,
        prompt: B('In Example 1 adjust <f>E_A</f> until the loop current <f>I_1</f> becomes zero.', 'Säädä esimerkissä 1 lähdejännitettä <f>E_A</f>, kunnes silmukkavirta <f>I_1</f> on nolla.'),
        widget: { name: 'readout', config: {
          params: [{ id: 'EA', tex: 'E_A', min: 0, max: 30, step: 0.01, value: 15, unit: 'V' }],
          outputs: function (v) { var I = solveEx1(v.EA, 10, 5); return [{ tex: 'I_1', value: I[0], unit: 'A', digits: 3 }, { tex: 'I_2', value: I[1], unit: 'A', digits: 3 }, { tex: 'I_3', value: I[2], unit: 'A', digits: 3 }]; },
          answer: function (v) { return { v: v.EA }; }
        } },
        hints: [B('Set I1 = 0 in the three loop equations R·I = E: what is left is a smaller system.', 'Aseta I1 = 0 kolmeen silmukkayhtälöön R·I = E: jäljelle jää pienempi yhtälöryhmä.'),
          B('Rows 2 and 3 do not contain E_A, so they alone determine I2 and I3 when I1 = 0.', 'Rivit 2 ja 3 eivät sisällä lähdettä E_A, joten ne määrittävät yksin virrat I2 ja I3, kun I1 = 0.'),
          B('Put those I2 and I3 into row 1 and solve for E_A − E_C, then add E_C. You can verify with the slider.', 'Sijoita nämä I2 ja I3 riviin 1 ja ratkaise E_A − E_C; lisää sitten E_C. Voit tarkistaa liukusäätimellä.')] },
      { id: 't5-q10', mode: 'practice', type: 'numeric', difficulty: 1, tol: 0.02,
        prompt: B('A current source <f>J = 2 A</f> is in parallel with a resistor <f>R = 10 Ω</f>. Find the emf of the equivalent voltage source (in series with 10 Ω).', 'Virtalähde <f>J = 2 A</f> on rinnakkain vastuksen <f>R = 10 Ω</f> kanssa. Laske ekvivalentin jännitelähteen lähdejännite (sarjassa 10 Ω:n kanssa).'),
        fields: [{ id: 'E', tex: 'E', unit: 'V' }] },
      { id: 't5-q11', mode: 'practice', type: 'mc', difficulty: 1,
        prompt: B('An <b>ideal</b> current source <f>J</f> (no parallel resistor) is the only element of the branch shared by two meshes. What do you do?', '<b>Ideaalinen</b> virtalähde <f>J</f> (ei rinnakkaisvastusta) on kahden silmukan yhteisen haaran ainoa komponentti. Mitä teet?'),
        options: [
          { id: 'a', html: B('Open-circuit it and ignore it.', 'Avaat sen ja jätät sen huomiotta.') },
          { id: 'b', html: B('Write <f>I_a − I_b = ±J</f> and one KVL equation around the supermesh (outer loop).', 'Kirjoitat <f>I_a − I_b = ±J</f> ja yhden jänniteyhtälön supersilmukan (ulkosilmukan) ympäri.') },
          { id: 'c', html: B('Short-circuit it.', 'Oikosulet sen.') },
          { id: 'd', html: B('Give it a resistance of 1 Ω.', 'Annat sille resistanssin 1 Ω.') }
        ] },
      { id: 't5-q12', mode: 'practice', type: 'circuit', difficulty: 3, tol: 0.02,
        prompt: B('The circuit has <f>E_2 = 6 V</f> (opposing in the right loop), <f>R_1 = 2 Ω</f>, <f>R_2 = 4 Ω</f>, <f>R_3 = 6 Ω</f>. The ammeter is in the shared branch. Set the source <f>E_1</f> (click it) so that the ammeter reads 3 A. Give the measured current.', 'Piirissä on <f>E_2 = 6 V</f> (vastakkainen oikeassa silmukassa), <f>R_1 = 2 Ω</f>, <f>R_2 = 4 Ω</f>, <f>R_3 = 6 Ω</f>. Virtamittari on yhteisessä haarassa. Säädä lähdettä <f>E_1</f> (napsauta sitä) niin, että mittari näyttää 3 A. Anna mitattu virta.'),
        widget: { name: 'circuit', config: twoLoopCfg('measure') },
        hints: [B('The ammeter sits in the shared branch, so it shows the combination of both loop currents there.', 'Virtamittari on yhteisessä haarassa, joten se näyttää siellä molempien silmukkavirtojen yhdistelmän.'),
          B('Shared branch current = the difference of the two loop currents. Write the two loop equations with E_1 as an unknown.', 'Yhteisen haaran virta = kahden silmukkavirran erotus. Kirjoita kaksi silmukkayhtälöä niin, että E_1 on tuntematon.'),
          B('Solve Ia and Ib as functions of E_1, form Ia − Ib and require the ammeter value, then solve E_1.', 'Ratkaise Ia ja Ib E_1:n funktioina, muodosta Ia − Ib ja aseta se mittarin lukemaksi, ratkaise sitten E_1.')] },
      { id: 't5-q13', mode: 'practice', type: 'multi', difficulty: 2,
        prompt: B('Select ALL correct statements about the loop-method procedure.', 'Valitse KAIKKI oikeat väitteet silmukkamenetelmän menettelystä.'),
        options: [
          { id: 'a', html: B('Parallel resistors can be combined first to avoid extra equations.', 'Rinnakkaiset vastukset voi yhdistää ensin ylimääräisten yhtälöiden välttämiseksi.') },
          { id: 'b', html: B('A negative loop current means the calculation is wrong.', 'Negatiivinen silmukkavirta tarkoittaa, että laskussa on virhe.') },
          { id: 'c', html: B('Every branch must belong to at least one loop.', 'Jokaisen haaran täytyy kuulua vähintään yhteen silmukkaan.') },
          { id: 'd', html: B('With only independent sources and resistors, the resistance matrix is symmetric.', 'Kun piirissä on vain riippumattomia lähteitä ja vastuksia, resistanssimatriisi on symmetrinen.') },
          { id: 'e', html: B('You may use as many loops as you like, extra ones do no harm.', 'Silmukoita voi käyttää niin monta kuin haluaa, ylimääräiset eivät haittaa.') }
        ] },
      { id: 't5-q14', mode: 'practice', type: 'numeric', difficulty: 3, tol: 0.02,
        prompt: B('Supermesh: <f>E = 20 V</f> with <f>R_1 = 2 Ω</f> in loop a, an ideal current source <f>J = 3 A</f> in the shared branch (so <f>I_a − I_b = J</f>), and <f>R_2 = 4 Ω</f> in loop b. The supermesh equation is <f>R_1 I_a + R_2 I_b = E</f>. Change <f>E</f> to 30 V and find the loop currents.', 'Supersilmukka: <f>E = 20 V</f> ja <f>R_1 = 2 Ω</f> silmukassa a, ideaalinen virtalähde <f>J = 3 A</f> yhteisessä haarassa (siis <f>I_a − I_b = J</f>) ja <f>R_2 = 4 Ω</f> silmukassa b. Supersilmukan yhtälö on <f>R_1 I_a + R_2 I_b = E</f>. Muuta <f>E</f>:ksi 30 V ja laske silmukkavirrat.'),
        fields: [{ id: 'Ia', tex: 'I_a', unit: 'A' }, { id: 'Ib', tex: 'I_b', unit: 'A' }],
        hints: [B('Two unknowns need two equations: one from the current source, one from KVL around the supermesh.', 'Kaksi tuntematonta tarvitsee kaksi yhtälöä: yksi virtalähteestä ja yksi jännitelaista supersilmukan ympäri.'),
          B('The current source gives I_a − I_b = J, so write I_a in terms of I_b.', 'Virtalähde antaa I_a − I_b = J, joten kirjoita I_a muuttujan I_b avulla.'),
          B('Substitute that into R_1 I_a + R_2 I_b = E with the new E and solve I_b first, then I_a.', 'Sijoita se yhtälöön R_1 I_a + R_2 I_b = E uudella E:n arvolla ja ratkaise ensin I_b, sitten I_a.')] },
      { id: 't5-q15', mode: 'practice', type: 'mc', difficulty: 2,
        prompt: B('For Example 1 (<f>b = 6</f>, <f>n = 4</f>), how many equations must be solved simultaneously with (i) the branch-current method and (ii) the loop method?', 'Montako yhtälöä esimerkissä 1 (<f>b = 6</f>, <f>n = 4</f>) on ratkaistava yhtä aikaa (i) haaravirtamenetelmällä ja (ii) silmukkavirtamenetelmällä?'),
        options: [{ id: 'a', html: B('(i) 3 and (ii) 3', '(i) 3 ja (ii) 3') }, { id: 'b', html: B('(i) 6 and (ii) 3', '(i) 6 ja (ii) 3') }, { id: 'c', html: B('(i) 12 and (ii) 6', '(i) 12 ja (ii) 6') }, { id: 'd', html: B('(i) 4 and (ii) 3', '(i) 4 ja (ii) 3') }] },
      { id: 't5-q16', mode: 'practice', type: 'circuit', difficulty: 3, tol: 0.02,
        prompt: B('Adjust the source <f>E_1</f> (click it) so that the right-hand branch current (loop current <f>I_b</f>) becomes zero. Give the value of <f>E_1</f> that you set.', 'Säädä lähdettä <f>E_1</f> (napsauta sitä) niin, että oikean haaran virta (silmukkavirta <f>I_b</f>) on nolla. Anna asettamasi <f>E_1</f>:n arvo.'),
        widget: { name: 'circuit', config: twoLoopCfg('value') },
        hints: [B('If the right loop current is zero, no current flows in the right branch.', 'Jos oikean silmukan virta on nolla, oikeassa haarassa ei kulje virtaa.'),
          B('Then the voltage across the shared (middle) resistor is fixed by the right-hand source alone.', 'Silloin yhteisen (keskimmäisen) vastuksen jännite määräytyy pelkästään oikeanpuoleisesta lähteestä.'),
          B('In the left loop E_1 drives one current through R_1 and R_2 in series; match the voltage across R_2 to the value you found.', 'Vasemmassa silmukassa E_1 ajaa yhden virran sarjassa olevien R_1 ja R_2 läpi; sovita R_2:n jännite löytämääsi arvoon.')] },

      // ---------- graded ----------
      { id: 't5-g1', mode: 'graded', type: 'numeric', difficulty: 3, points: 3, tol: 0.02,
        prompt: B('Two-window circuit, both loop currents clockwise: <f>R_1 = 2 Ω</f> (loop a only), <f>R_2 = 4 Ω</f> (shared), <f>R_3 = 6 Ω</f> (loop b only). <f>E_1 = 12 V</f> drives <f>I_a</f>; <f>E_2 = 6 V</f> opposes <f>I_b</f>. Find the loop currents <f>I_a</f> and <f>I_b</f>.', 'Kahden ikkunan piiri, molemmat silmukkavirrat myötäpäivään: <f>R_1 = 2 Ω</f> (vain silmukka a), <f>R_2 = 4 Ω</f> (yhteinen), <f>R_3 = 6 Ω</f> (vain silmukka b). <f>E_1 = 12 V</f> ajaa virtaa <f>I_a</f>; <f>E_2 = 6 V</f> vastustaa virtaa <f>I_b</f>. Laske silmukkavirrat <f>I_a</f> ja <f>I_b</f>.'),
        fields: [{ id: 'Ia', tex: 'I_a', unit: 'A' }, { id: 'Ib', tex: 'I_b', unit: 'A' }],
        hints: [B('Use the loop method: one loop current per window, both clockwise, and write R·I = E.', 'Käytä silmukkavirtamenetelmää: yksi silmukkavirta per ikkuna, molemmat myötäpäivään, ja kirjoita R·I = E.'),
          B('Diagonal entries are the sums of the resistances in each loop. The shared resistor appears off-diagonal, with a sign set by whether the loop currents oppose there.', 'Lävistäjän alkiot ovat kunkin silmukan vastusten summia. Yhteinen vastus esiintyy lävistäjän ulkopuolella, ja sen etumerkki riippuu siitä, ovatko silmukkavirrat siinä vastakkaiset.'),
          B('E_i is the signed sum of the emfs in loop i: plus if the emf helps the loop current, minus if it opposes. Then solve the 2 × 2 system.', 'E_i on silmukan i lähdejännitteiden etumerkillinen summa: plus, jos lähde auttaa silmukkavirtaa, miinus, jos vastustaa. Ratkaise sitten 2 × 2 -yhtälöryhmä.')] },
      { id: 't5-g2', mode: 'graded', type: 'numeric', difficulty: 3, points: 4, tol: 0.02,
        prompt: B('Example 1 with <f>E_D = 20 V</f> (all other values unchanged, loop directions as in the lesson). Find the loop currents and the voltage <f>U_F</f> across branch F.', 'Esimerkki 1, kun <f>E_D = 20 V</f> (muut arvot ennallaan, silmukoiden suunnat kuten oppitunnilla). Laske silmukkavirrat ja haaran F jännite <f>U_F</f>.'),
        fields: [{ id: 'I1', tex: 'I_1', unit: 'A' }, { id: 'I2', tex: 'I_2', unit: 'A' }, { id: 'I3', tex: 'I_3', unit: 'A' }, { id: 'UF', tex: 'U_F', unit: 'V' }],
        hints: [B('Use the same R·I = E matrix as in Example 1; only the emf vector changes.', 'Käytä samaa R·I = E -matriisia kuin esimerkissä 1; vain lähdejännitevektori muuttuu.'),
          B('Recompute each E_i that contains E_D (with its sign in that loop) and solve the 3 × 3 system.', 'Laske uudelleen jokainen E_i, jossa on E_D (silmukan mukaisella etumerkillä), ja ratkaise 3 × 3 -yhtälöryhmä.'),
          B('U_F follows from Ohm’s law for branch F: find the branch current from the loop currents that pass through F first.', 'U_F saadaan haaran F Ohmin laista: määritä ensin haaran virta niistä silmukkavirroista, jotka kulkevat haaran F kautta.')] },
      { id: 't5-g3', mode: 'graded', type: 'order', difficulty: 2, points: 2,
        prompt: B('Put the six steps of the loop method in the correct order.', 'Laita silmukkavirtamenetelmän kuusi vaihetta oikeaan järjestykseen.'),
        items: [
          { id: 's5', html: B('Solve <f>I = R^{-1} E</f>', 'Ratkaise <f>I = R^{-1} E</f>') },
          { id: 's2', html: B('Remove parallel connections of resistors', 'Poista vastusten rinnankytkennät') },
          { id: 's6', html: B('Determine the needed variables from the circuit', 'Määritä tarvittavat suureet piiristä') },
          { id: 's1', html: B('Transform current sources to voltage sources', 'Muunna virtalähteet jännitelähteiksi') },
          { id: 's4', html: B('Write the matrix equation <f>R I = E</f>', 'Kirjoita matriisiyhtälö <f>R I = E</f>') },
          { id: 's3', html: B('Select <f>b − n + 1</f> loops', 'Valitse <f>b − n + 1</f> silmukkaa') }
        ] },
      { id: 't5-g4', mode: 'graded', type: 'circuit', difficulty: 3, points: 3, tol: 0.02,
        prompt: B('In the circuit (<f>E_2 = 6 V</f>, <f>R_1 = 2 Ω</f>, <f>R_2 = 4 Ω</f>, <f>R_3 = 6 Ω</f>) set the source <f>E_1</f> so that the loop current of the right loop, shown by the ammeter, is zero. Give the value of <f>E_1</f>.', 'Aseta piirissä (<f>E_2 = 6 V</f>, <f>R_1 = 2 Ω</f>, <f>R_2 = 4 Ω</f>, <f>R_3 = 6 Ω</f>) lähde <f>E_1</f> niin, että oikean silmukan virta, jonka virtamittari näyttää, on nolla. Anna <f>E_1</f>:n arvo.'),
        widget: { name: 'circuit', config: twoLoopCfg('value') },
        hints: [B('If the right loop current is zero, the right branch carries no current.', 'Jos oikean silmukan virta on nolla, oikea haara on virraton.'),
          B('Use the right-hand loop equation: with I_b = 0 only the shared-resistor term and E_2 remain, which gives the left loop current.', 'Käytä oikeanpuoleisen silmukan yhtälöä: kun I_b = 0, jäljelle jäävät vain yhteisen vastuksen termi ja E_2, joista saat vasemman silmukkavirran.'),
          B('Put that left loop current into the left loop equation and solve E_1.', 'Sijoita tämä vasemman silmukan virta vasemman silmukan yhtälöön ja ratkaise E_1.')] },
      { id: 't5-g5', mode: 'graded', type: 'numeric', difficulty: 3, points: 3, tol: 0.02,
        prompt: B('As Example 2, but with <f>E_1 = 80 V</f> and <f>J = 6 A</f> (<f>R_1 = 2.5 Ω</f>, <f>R_2 = 3.3 Ω</f>, <f>R_3 = 5 Ω</f>, <f>E_2 = 50 V</f> unchanged). Convert the current source and find <f>V_3</f> and <f>I_3</f>.', 'Kuten esimerkki 2, mutta <f>E_1 = 80 V</f> ja <f>J = 6 A</f> (<f>R_1 = 2,5 Ω</f>, <f>R_2 = 3,3 Ω</f>, <f>R_3 = 5 Ω</f>, <f>E_2 = 50 V</f> ennallaan). Muunna virtalähde ja laske <f>V_3</f> ja <f>I_3</f>.'),
        fields: [{ id: 'V3', tex: 'V_3', unit: 'V' }, { id: 'I3', tex: 'I_3', unit: 'A' }],
        hints: [B('The current source has a resistor in parallel, so first convert it to a voltage source in series with that resistor.', 'Virtalähteen kanssa on rinnakkain vastus, joten muunna se ensin jännitelähteeksi, jonka kanssa vastus on sarjassa.'),
          B('Then the circuit has two loops: write R·I = E, with the converted emf entering the loops that contain it with the correct sign.', 'Silloin piirissä on kaksi silmukkaa: kirjoita R·I = E niin, että muunnettu lähdejännite tulee mukaan niihin silmukoihin, joissa se on, oikealla etumerkillä.'),
          B('Solve the loop currents, then get V_3 from the branch of the shared resistor and I_3 from Ohm’s law over R_3.', 'Ratkaise silmukkavirrat, laske sitten V_3 yhteisen vastuksen haarasta ja I_3 Ohmin laista vastuksen R_3 yli.')] },
      { id: 't5-g6', mode: 'graded', type: 'mc', difficulty: 3, points: 2,
        prompt: B('A student analyses the two-window circuit (<f>R_1 = 2</f>, <f>R_2 = 4</f> shared, <f>R_3 = 6 Ω</f>; <f>E_1 = 12 V</f> helps <f>I_a</f>, <f>E_2 = 6 V</f> opposes <f>I_b</f>, both loops clockwise) and writes <br><f>6 I_a + 4 I_b = 12</f> and <f>4 I_a + 10 I_b = 6</f>. What is wrong?', 'Opiskelija analysoi kahden ikkunan piirin (<f>R_1 = 2</f>, <f>R_2 = 4</f> yhteinen, <f>R_3 = 6 Ω</f>; <f>E_1 = 12 V</f> auttaa virtaa <f>I_a</f>, <f>E_2 = 6 V</f> vastustaa virtaa <f>I_b</f>, molemmat silmukat myötäpäivään) ja kirjoittaa <br><f>6 I_a + 4 I_b = 12</f> ja <f>4 I_a + 10 I_b = 6</f>. Mikä on väärin?'),
        shuffle: true,
        options: [
          { id: 'a', html: B('The diagonal entries should be <f>R_1</f> and <f>R_3</f> only.', 'Lävistäjäalkioiden pitäisi olla vain <f>R_1</f> ja <f>R_3</f>.') },
          { id: 'b', html: B('The matrix should be 3 × 3.', 'Matriisin pitäisi olla 3 × 3.') },
          { id: 'c', html: B('The shared resistance must enter as <f>−4</f> (the loop currents oppose in <f>R_2</f>) and the right-hand side of loop b must be <f>−6</f> (<f>E_2</f> opposes <f>I_b</f>).', 'Yhteinen resistanssi tulee mukaan arvolla <f>−4</f> (silmukkavirrat ovat vastakkaiset vastuksessa <f>R_2</f>) ja silmukan b oikean puolen on oltava <f>−6</f> (<f>E_2</f> vastustaa virtaa <f>I_b</f>).') },
          { id: 'd', html: B('Nothing is wrong; emfs and off-diagonal entries are always positive.', 'Mikään ei ole väärin; lähdejännitteet ja lävistäjän ulkopuoliset alkiot ovat aina positiivisia.') }
        ],
        hints: [B('Check the two equations against the rules for writing R·I = E directly.', 'Tarkista molemmat yhtälöt sääntöjä vasten, joilla R·I = E kirjoitetaan suoraan.'),
          B('In the shared resistor, do two clockwise loop currents run the same way or opposite ways? That decides the sign of the off-diagonal entry.', 'Kulkevatko kaksi myötäpäiväistä silmukkavirtaa yhteisessä vastuksessa samaan vai vastakkaiseen suuntaan? Se ratkaisee lävistäjän ulkopuolisen alkion etumerkin.'),
          B('Also check for each emf whether it helps or opposes its loop current, and compare with the right-hand sides written.', 'Tarkista myös, auttaako vai vastustaako kukin lähdejännite silmukkavirtaansa, ja vertaa kirjoitettuihin oikeisiin puoliin.')] }
    ]
  });
})();

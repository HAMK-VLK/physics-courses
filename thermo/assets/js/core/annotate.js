/* Annotation layer for topic pages: pen, highlighter, eraser, arrow, box, sticky notes, text highlights,
 * undo/redo. Every mark is anchored to a content block (data-block id): coordinates are stored relative
 * to the block's top-left corner and divided by its width, so marks follow the text on reflow/resizes. */
(function (TDC) {
  'use strict';
  var U = TDC.util, el = U.el, svg = U.svg, S = function () { return TDC.store; };
  var COLORS = ['#e8590c', '#1c7ed6', '#2f9e44', '#c2255c', '#f2c200', '#e03131',
    '#7048e8', '#1098ad', '#74b816', '#8d5524', '#868e96', '#212529'];
  var CUSTOM_SLOTS = 5;   // user colours, most recent first, kept in TDC.prefs (per browser, not in the notes file)
  var state = { tool: 'none', color: COLORS[0], width: 3, visible: true, article: null, topic: null, undo: [], redo: [], defs: null };
  var A = TDC.annotate = { state: state };
  var DRAW_TOOLS = { pen: 1, hl: 1, eraser: 1, arrow: 1, box: 1, sticky: 1 };
  var catcher = null;   // transparent layer under the header (not over the TOC) that starts every drawing

  // ---------- geometry helpers ----------
  function anchorFor(sec, clientX, clientY) {
    var hl = sec.querySelector('.annot-html'); var prevH = hl.style.pointerEvents; hl.style.pointerEvents = 'none';
    catcher.style.pointerEvents = 'none';
    var hit = document.elementFromPoint(clientX, clientY);
    catcher.style.pointerEvents = ''; hl.style.pointerEvents = prevH;
    var blk = hit && hit.closest && hit.closest('.blk');
    if (!blk || !sec.contains(blk)) blk = null;
    return blk;
  }
  function anchorEl(sec, blockId) {
    if (blockId === '_sec') return sec;
    return sec.querySelector('.blk[data-block="' + CSS.escape(blockId) + '"]') || sec;
  }
  function frame(sec, blockId) {   // anchor frame in section-local px
    var a = anchorEl(sec, blockId), sr = sec.getBoundingClientRect(), ar = a.getBoundingClientRect();
    return { ox: ar.left - sr.left, oy: ar.top - sr.top, s: ar.width || 1 };
  }
  function toLocal(sec, blockId, cx, cy) {
    var a = anchorEl(sec, blockId), ar = a.getBoundingClientRect(), w = ar.width || 1;
    return [+((cx - ar.left) / w).toFixed(4), +((cy - ar.top) / w).toFixed(4)];
  }
  function toPx(f, p) { return [f.ox + p[0] * f.s, f.oy + p[1] * f.s]; }
  function smoothPath(pts) {
    if (pts.length < 2) return 'M' + pts[0][0] + ' ' + pts[0][1] + ' l0.1 0';
    var d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (var i = 1; i < pts.length - 1; i++) {
      var mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      d += ' Q' + pts[i][0].toFixed(1) + ' ' + pts[i][1].toFixed(1) + ' ' + mx.toFixed(1) + ' ' + my.toFixed(1);
    }
    var l = pts[pts.length - 1];
    return d + ' L' + l[0].toFixed(1) + ' ' + l[1].toFixed(1);
  }

  // ---------- rendering ----------
  function arrowHead(c) {   // one marker per colour, made on first use (any picked colour can draw arrows)
    var id = 'annot-arrow-' + String(c).replace(/[^0-9a-z]/gi, '');
    if (state.defs && !document.getElementById(id)) state.defs.appendChild(svg('marker', { id: id, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto-start-reverse' },
      svg('path', { d: 'M0 0 L10 5 L0 10 z', fill: c })));
    return 'url(#' + id + ')';
  }
  function renderSection(sec) {
    var id = sec.dataset.section, data = S().section(id, false);
    var layer = sec.querySelector('.annot-svg'), html = sec.querySelector('.annot-html');
    layer.setAttribute('width', sec.offsetWidth); layer.setAttribute('height', sec.offsetHeight);
    while (layer.lastChild && layer.lastChild.tagName !== 'defs') layer.removeChild(layer.lastChild);
    html.innerHTML = '';
    if (!state.visible) return;
    data.strokes.forEach(function (st) { layer.appendChild(strokeNode(sec, st)); });
    data.stickies.forEach(function (n) { html.appendChild(stickyNode(sec, n)); });
  }
  function strokeNode(sec, st) {
    var f = frame(sec, st.block), pts = st.pts.map(function (p) { return toPx(f, p); });
    var common = { stroke: st.color, 'stroke-width': st.w, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'data-id': st.id };
    if (st.tool === 'arrow') {
      return svg('line', Object.assign({ x1: pts[0][0], y1: pts[0][1], x2: pts[1][0], y2: pts[1][1], 'marker-end': arrowHead(st.color) }, common));
    }
    if (st.tool === 'box') {
      return svg('rect', Object.assign({ x: Math.min(pts[0][0], pts[1][0]), y: Math.min(pts[0][1], pts[1][1]),
        width: Math.abs(pts[1][0] - pts[0][0]), height: Math.abs(pts[1][1] - pts[0][1]), rx: 4 }, common));
    }
    var p = svg('path', Object.assign({ d: smoothPath(pts) }, common));
    if (st.tool === 'hl') p.setAttribute('class', 'annot-hl');
    return p;
  }
  function stickyNode(sec, n) {
    var f = frame(sec, n.block), pos = toPx(f, [n.x, n.y]);
    var ta = el('textarea', { 'aria-label': TDC.t('annot.sticky'), rows: 3, readonly: S().readOnly() ? true : null });
    ta.value = n.text || '';
    ta.addEventListener('input', U.debounce(function () {
      S().update(function () { n.text = ta.value; }, { source: 'annot' });
    }, 400));
    var node = el('div', { class: 'sticky' + (n.collapsed ? ' collapsed' : ''), style: { left: pos[0] + 'px', top: pos[1] + 'px', '--sticky': n.color }, dataset: { id: n.id } }, [
      el('div', { class: 'sticky-bar' }, [
        el('span', { class: 'sticky-grip', 'aria-hidden': 'true' }, '⠿'),
        el('button', { class: 'sticky-btn', 'aria-label': TDC.t('annot.collapse'), onclick: function () {
          S().update(function () { n.collapsed = !n.collapsed; }, { source: 'annot' }); node.classList.toggle('collapsed');
        } }, '—'),
        S().readOnly() ? null : el('button', { class: 'sticky-btn', 'aria-label': TDC.t('annot.delete'), onclick: function () { removeItem(sec, 'stickies', n); } }, '✕')
      ]), ta
    ]);
    // Drag by the bar
    var bar = node.firstChild;
    bar.addEventListener('pointerdown', function (e) {
      if (e.target.tagName === 'BUTTON' || S().readOnly()) return;
      e.preventDefault(); bar.setPointerCapture(e.pointerId);
      var sx = e.clientX, sy = e.clientY, ox = parseFloat(node.style.left), oy = parseFloat(node.style.top);
      function mv(ev) { node.style.left = (ox + ev.clientX - sx) + 'px'; node.style.top = (oy + ev.clientY - sy) + 'px'; }
      function up(ev) {
        bar.removeEventListener('pointermove', mv); bar.removeEventListener('pointerup', up);
        var r = node.getBoundingClientRect();
        var loc = toLocal(sec, n.block, r.left, r.top);
        S().update(function () { n.x = loc[0]; n.y = loc[1]; }, { source: 'annot' });
      }
      bar.addEventListener('pointermove', mv); bar.addEventListener('pointerup', up);
    });
    return node;
  }

  // ---------- text highlights ----------
  function textNodes(root) {
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: function (n) {
      return n.parentNode.closest('.widget-host, .annot-html, .formula, button, textarea, input') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    } });
    var out = [], n; while ((n = w.nextNode())) out.push(n); return out;
  }
  function offsetOf(root, node, off) {
    var total = 0, list = textNodes(root);
    for (var i = 0; i < list.length; i++) { if (list[i] === node) return total + off; total += list[i].length; }
    return -1;
  }
  function wrapRange(root, start, end, hl) {
    var pos = 0;
    textNodes(root).forEach(function (n) {
      var s = pos, e = pos + n.length; pos = e;
      if (e <= start || s >= end) return;
      var a = Math.max(start, s) - s, b = Math.min(end, e) - s;
      var target = n;
      if (a > 0) target = target.splitText(a);
      if (b - a < target.length) target.splitText(b - a);
      var m = el('mark', { class: 'annot-mark', style: { '--mark': hl.color }, dataset: { id: hl.id } });
      target.parentNode.insertBefore(m, target); m.appendChild(target);
    });
  }
  function unwrapMarks(root) {
    root.querySelectorAll('mark.annot-mark').forEach(function (m) {
      var p = m.parentNode; while (m.firstChild) p.insertBefore(m.firstChild, m); p.removeChild(m); p.normalize();
    });
  }
  function applyHighlights(sec) {
    unwrapMarks(sec);
    if (!state.visible) return;
    var data = S().section(sec.dataset.section, false);
    data.highlights.forEach(function (h) {
      if (h.lang !== TDC.i18n.lang) return;
      var b = anchorEl(sec, h.block); if (b !== sec) wrapRange(b, h.start, h.end, h);
    });
  }
  function captureSelection() {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return;
    var r = sel.getRangeAt(0);
    var blk = (r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentNode).closest('.blk');
    var sec = blk && blk.closest('.sec');
    if (!blk || !sec || !state.article.contains(sec)) return;
    if (!blk.contains(r.endContainer)) { TDC.ui.toast(TDC.t('annot.oneBlock')); return; }
    var st = offsetOf(blk, r.startContainer, r.startOffset), en = offsetOf(blk, r.endContainer, r.endOffset);
    if (st < 0 || en <= st) return;
    var hl = { id: U.uid('h'), block: blk.dataset.block, lang: TDC.i18n.lang, start: st, end: en, color: state.color, text: r.toString().slice(0, 200) };
    sel.removeAllRanges();
    addItem(sec, 'highlights', hl);
  }

  // ---------- data ops with undo ----------
  function addItem(sec, kind, item, noHistory) {
    var ok = S().update(function () { S().section(sec.dataset.section)[kind].push(item); }, { source: 'annot' });
    if (!ok) return;
    if (!noHistory) { state.undo.push({ op: 'add', sec: sec.dataset.section, kind: kind, item: item }); state.redo = []; }
    refresh(sec); updateUndoButtons();
  }
  function removeItem(sec, kind, item, noHistory) {
    var ok = S().update(function () {
      var arr = S().section(sec.dataset.section)[kind], i = arr.indexOf(item);
      if (i < 0) i = arr.findIndex(function (x) { return x.id === item.id; });
      if (i >= 0) arr.splice(i, 1);
    }, { source: 'annot' });
    if (!ok) return;
    if (!noHistory) { state.undo.push({ op: 'remove', sec: sec.dataset.section, kind: kind, item: item }); state.redo = []; }
    refresh(sec); updateUndoButtons();
  }
  function secById(id) { return state.article && state.article.querySelector('.sec[data-section="' + CSS.escape(id) + '"]'); }
  function undo() {
    var a = state.undo.pop(); if (!a) return;
    var sec = secById(a.sec); if (!sec) return;
    if (a.op === 'add') removeItem(sec, a.kind, a.item, true); else if (a.op === 'remove') addItem(sec, a.kind, a.item, true);
    else if (a.op === 'clear') { S().update(function (d) { d.annotations[a.sec] = a.item; }, { source: 'annot' }); refresh(sec); }
    state.redo.push(a); updateUndoButtons();
  }
  function redo() {
    var a = state.redo.pop(); if (!a) return;
    var sec = secById(a.sec); if (!sec) return;
    if (a.op === 'add') addItem(sec, a.kind, a.item, true); else if (a.op === 'remove') removeItem(sec, a.kind, a.item, true);
    else if (a.op === 'clear') { S().update(function (d) { d.annotations[a.sec] = { strokes: [], stickies: [], highlights: [] }; }, { source: 'annot' }); refresh(sec); }
    state.undo.push(a); updateUndoButtons();
  }
  function refresh(sec) { renderSection(sec); applyHighlights(sec); }
  A.refreshAll = function () { if (state.article) state.article.querySelectorAll('.sec').forEach(refresh); };

  // ---------- pointer handling ----------
  function onDown(e) {
    if (!DRAW_TOOLS[state.tool] || S().readOnly()) return;
    var sec = sectionAt(e.clientY);
    if (!sec || e.button > 0) return;
    e.preventDefault();
    if (state.tool === 'sticky') {
      var blk = anchorFor(sec, e.clientX, e.clientY), bid = blk ? blk.dataset.block : '_sec';
      var p = toLocal(sec, bid, e.clientX, e.clientY);
      addItem(sec, 'stickies', { id: U.uid('n'), block: bid, x: p[0], y: p[1], text: '', color: state.color });
      var last = sec.querySelector('.annot-html .sticky:last-child textarea'); if (last) last.focus();
      setTool('none');
      return;
    }
    var layer = sec.querySelector('.annot-svg'), cap = catcher;
    cap.setPointerCapture(e.pointerId);
    if (state.tool === 'eraser') { eraseAt(sec, e); var mvE = function (ev) { eraseAt(sec, ev); };
      cap.addEventListener('pointermove', mvE);
      cap.addEventListener('pointerup', function up() { cap.removeEventListener('pointermove', mvE); cap.removeEventListener('pointerup', up); });
      return; }
    var blk2 = anchorFor(sec, e.clientX, e.clientY), blockId = blk2 ? blk2.dataset.block : '_sec';
    var sr = sec.getBoundingClientRect();
    var raw = [[e.clientX, e.clientY]];
    var preview = svg(state.tool === 'box' ? 'rect' : state.tool === 'arrow' ? 'line' : 'path', {
      stroke: state.color, 'stroke-width': state.tool === 'hl' ? 16 : state.width, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
      class: state.tool === 'hl' ? 'annot-hl' : null, 'marker-end': state.tool === 'arrow' ? arrowHead(state.color) : null });
    layer.appendChild(preview);
    function draw() {
      var loc = raw.map(function (p) { return [p[0] - sr.left, p[1] - sr.top]; });
      if (state.tool === 'arrow') { var l = loc[loc.length - 1]; preview.setAttribute('x1', loc[0][0]); preview.setAttribute('y1', loc[0][1]); preview.setAttribute('x2', l[0]); preview.setAttribute('y2', l[1]); }
      else if (state.tool === 'box') { var q = loc[loc.length - 1];
        preview.setAttribute('x', Math.min(loc[0][0], q[0])); preview.setAttribute('y', Math.min(loc[0][1], q[1]));
        preview.setAttribute('width', Math.abs(q[0] - loc[0][0])); preview.setAttribute('height', Math.abs(q[1] - loc[0][1])); }
      else preview.setAttribute('d', smoothPath(loc));
    }
    function mv(ev) {
      var evs = ev.getCoalescedEvents ? ev.getCoalescedEvents() : [ev];
      evs.forEach(function (c) {
        var l = raw[raw.length - 1];
        if (Math.abs(c.clientX - l[0]) + Math.abs(c.clientY - l[1]) > 1.5) raw.push([c.clientX, c.clientY]);
      });
      draw();
    }
    function up() {
      cap.removeEventListener('pointermove', mv); cap.removeEventListener('pointerup', up); cap.removeEventListener('pointercancel', up);
      preview.remove();
      if ((state.tool === 'arrow' || state.tool === 'box') && raw.length < 2) return;
      var pts = state.tool === 'arrow' || state.tool === 'box' ? [raw[0], raw[raw.length - 1]] : raw;
      addItem(sec, 'strokes', { id: U.uid('s'), tool: state.tool, color: state.color, w: state.tool === 'hl' ? 16 : state.width, block: blockId,
        pts: pts.map(function (p) { return toLocal(sec, blockId, p[0], p[1]); }) });
    }
    cap.addEventListener('pointermove', mv); cap.addEventListener('pointerup', up); cap.addEventListener('pointercancel', up);
  }
  // Section whose vertical span holds y (else the nearest one): marks in the margins anchor to that section.
  function sectionAt(y) {
    var best = null, bd = Infinity;
    state.article.querySelectorAll('.sec').forEach(function (s) {
      var r = s.getBoundingClientRect(), d = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
      if (d < bd) { bd = d; best = s; }
    });
    return best;
  }
  function eraseAt(sec, e) {
    var sr = sec.getBoundingClientRect(), x = e.clientX - sr.left, y = e.clientY - sr.top;
    var data = S().section(sec.dataset.section, false);
    var hit = data.strokes.find(function (st) {
      var f = frame(sec, st.block), pts = st.pts.map(function (p) { return toPx(f, p); });
      if (st.tool === 'box' || st.tool === 'arrow') {
        var segs = st.tool === 'box'
          ? [[pts[0], [pts[1][0], pts[0][1]]], [[pts[1][0], pts[0][1]], pts[1]], [pts[1], [pts[0][0], pts[1][1]]], [[pts[0][0], pts[1][1]], pts[0]]]
          : [[pts[0], pts[1]]];
        return segs.some(function (s) { return distSeg(x, y, s[0], s[1]) < 10; });
      }
      for (var i = 0; i < pts.length; i++) if (Math.hypot(pts[i][0] - x, pts[i][1] - y) < 10 + st.w / 2) return true;
      return false;
    });
    if (hit) removeItem(sec, 'strokes', hit);
  }
  function distSeg(px, py, a, b) {
    var dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy, t = l ? U.clamp(((px - a[0]) * dx + (py - a[1]) * dy) / l, 0, 1) : 0;
    return Math.hypot(px - a[0] - t * dx, py - a[1] - t * dy);
  }

  // ---------- toolbar ----------
  var bar = null;
  function setTool(t) {
    state.tool = t;
    document.body.classList.toggle('annot-drawing', !!DRAW_TOOLS[t]);
    document.body.classList.toggle('annot-marking', t === 'mark');
    document.body.dataset.annotTool = t;
    if (bar) bar.querySelectorAll('[data-tool]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.tool === t)); });
  }
  A.setTool = setTool;
  function updateUndoButtons() {
    if (!bar) return;
    bar.querySelector('[data-act="undo"]').disabled = !state.undo.length;
    bar.querySelector('[data-act="redo"]').disabled = !state.redo.length;
  }
  // 12 default swatches, 5 slots for the user's own colours, and the picker button
  function colorGroup() {
    var group = el('div', { class: 'annot-group annot-colors' });
    function custom() { return TDC.prefs.get('annotColors', []).slice(0, CUSTOM_SLOTS); }
    function choose(c) {
      state.color = c;
      group.querySelectorAll('.swatch[data-color]').forEach(function (s) { s.setAttribute('aria-pressed', String(s.dataset.color === c)); });
    }
    function picked(c) {
      if (COLORS.indexOf(c) < 0) TDC.prefs.set('annotColors', [c].concat(custom().filter(function (x) { return x !== c; })).slice(0, CUSTOM_SLOTS));
      fill(); choose(c);
    }
    function openPicker() { TDC.colorPicker.open(state.color, picked); }
    function swatch(c, label) {
      return el('button', { class: 'swatch', style: { background: c }, dataset: { color: c }, title: label, 'aria-label': label, 'aria-pressed': String(c === state.color), onclick: function () { choose(c); } });
    }
    function fill() {
      var mine = custom(), slots = [];
      for (var i = 0; i < CUSTOM_SLOTS; i++) {
        var lab = TDC.t(mine[i] ? 'annot.custom' : 'annot.customEmpty', { n: i + 1 });
        slots.push(mine[i] ? swatch(mine[i], lab + ' ' + mine[i]) : el('button', { class: 'swatch swatch-empty', title: lab, 'aria-label': lab, onclick: openPicker }));
      }
      group.innerHTML = '';
      group.append.apply(group, COLORS.map(function (c, i) { return swatch(c, TDC.t('annot.color') + ' ' + (i + 1)); }).concat(slots,
        el('button', { class: 'swatch swatch-picker', title: TDC.t('annot.picker'), 'aria-label': TDC.t('annot.picker'), onclick: openPicker })));
    }
    fill();
    var off = TDC.on('langchange', function () { if (!group.isConnected) return off(); fill(); });   // slot labels carry numbers: rebuild
    return group;
  }
  // title + aria-label in the current language, re-applied by TDC.i18n.applyStatic on a language switch
  function lbl(key, attrs, ariaOnly) {
    attrs['aria-label'] = TDC.t(key); attrs['data-i18n-aria'] = key;
    if (!ariaOnly) { attrs.title = TDC.t(key); attrs['data-i18n-title'] = key; }
    return attrs;
  }
  function toolbar() {
    var tools = [['none', '🖱', 'annot.select'], ['pen', '✏️', 'annot.pen'], ['hl', '🖍', 'annot.highlighter'], ['mark', '🅰', 'annot.textmark'],
      ['arrow', '↗', 'annot.arrow'], ['box', '▭', 'annot.box'], ['sticky', '🗒', 'annot.sticky'], ['eraser', '🧽', 'annot.eraser']];
    var body = el('div', { class: 'annot-tools', id: 'annot-tools' }, [
      el('div', lbl('annot.tools', { class: 'annot-group', role: 'toolbar' }, true), tools.map(function (t) {
        return el('button', lbl(t[2], { class: 'annot-btn', dataset: { tool: t[0] }, 'aria-pressed': 'false', onclick: function () { setTool(state.tool === t[0] ? 'none' : t[0]); } }), t[1]);
      })),
      colorGroup(),
      el('div', { class: 'annot-group' }, [
        el('input', lbl('annot.width', { type: 'range', min: 1, max: 10, value: state.width, oninput: function (e) { state.width = +e.target.value; } })),
        el('button', lbl('annot.undo', { class: 'annot-btn', dataset: { act: 'undo' }, onclick: undo, disabled: true }), '↶'),
        el('button', lbl('annot.redo', { class: 'annot-btn', dataset: { act: 'redo' }, onclick: redo, disabled: true }), '↷'),
        el('button', lbl('annot.toggleVisible', { class: 'annot-btn', 'aria-pressed': 'true', onclick: function (e) {
          state.visible = !state.visible; e.currentTarget.setAttribute('aria-pressed', String(state.visible)); A.refreshAll();
        } }), '👁'),
        el('button', lbl('annot.clearSection', { class: 'annot-btn', onclick: clearCurrentSection }), '🗑')
      ])
    ]);
    var toggle = el('button', { class: 'annot-fab', 'aria-expanded': 'false', 'aria-controls': 'annot-tools', title: TDC.t('annot.tools'), onclick: function () {
      var open = bar.classList.toggle('open'); toggle.setAttribute('aria-expanded', String(open)); if (!open) setTool('none');
    } }, [el('span', { 'aria-hidden': 'true' }, '✍'), el('span', { class: 'annot-fab-label', 'data-i18n': 'annot.tools' })]);
    bar = el('div', { class: 'annot-bar' }, [body, toggle]);
    if (S().readOnly()) bar.classList.add('readonly');
    return bar;
  }
  function currentSection() {
    var secs = state.article.querySelectorAll('.sec'), mid = innerHeight * 0.4, best = null;
    secs.forEach(function (s) { var r = s.getBoundingClientRect(); if (r.top <= mid && r.bottom >= mid) best = s; });
    return best || secs[0];
  }
  function clearCurrentSection() {
    var sec = currentSection(); if (!sec || S().readOnly()) return;
    TDC.ui.confirm(TDC.t('annot.clearSection'), TDC.t('annot.clearConfirm', { name: sec.querySelector('h2').textContent }), TDC.t('annot.clear'), true).then(function (ok) {
      if (!ok) return;
      var before = JSON.parse(JSON.stringify(S().section(sec.dataset.section)));
      S().update(function (d) { d.annotations[sec.dataset.section] = { strokes: [], stickies: [], highlights: [] }; }, { source: 'annot' });
      state.undo.push({ op: 'clear', sec: sec.dataset.section, item: before }); state.redo = [];
      refresh(sec); updateUndoButtons();
    });
  }

  // ---------- attach to a topic page ----------
  A.attach = function (article, topicId) {
    state.article = article; state.topic = topicId; state.undo = []; state.redo = [];
    state.defs = svg('defs');
    article.querySelectorAll('.sec').forEach(function (sec, i) {
      sec.append(svg('svg', { class: 'annot-svg', 'aria-hidden': 'true' }, i === 0 ? state.defs : svg('defs')), el('div', { class: 'annot-html' }));
    });
    catcher = el('div', { class: 'annot-catch', 'aria-hidden': 'true', onpointerdown: onDown });
    document.body.appendChild(catcher);   // not inside the article: an animated ancestor would break position: fixed
    document.body.appendChild(toolbar());
    TDC.i18n.applyStatic(bar);
    setTool('none');
    var onUp = function () { if (state.tool === 'mark') setTimeout(captureSelection, 0); };
    var onKey = function (e) {
      if (e.target.closest && e.target.closest('input, textarea, [contenteditable]')) return;
      if (e.key === 'Escape') setTool('none');
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    };
    var onMarkClick = function (e) {
      var m = e.target.closest && e.target.closest('mark.annot-mark');
      if (!m || !(state.tool === 'mark' || state.tool === 'eraser')) return;
      var sec = m.closest('.sec'), h = S().section(sec.dataset.section).highlights.find(function (x) { return x.id === m.dataset.id; });
      if (h) removeItem(sec, 'highlights', h);
    };
    document.addEventListener('pointerup', onUp);
    document.addEventListener('keydown', onKey);
    article.addEventListener('click', onMarkClick);
    var ro = new ResizeObserver(U.debounce(A.refreshAll, 120));
    ro.observe(article);
    var offs = [
      TDC.on('langchange', function () { setTimeout(A.refreshAll, 0); }),
      TDC.on('notes:loaded', A.refreshAll)
    ];
    // Widgets render lazily and change block heights; refresh once things settle.
    setTimeout(A.refreshAll, 400);
    TDC.render.onCleanup(function () {
      ro.disconnect(); offs.forEach(function (f) { f(); });
      document.removeEventListener('pointerup', onUp); document.removeEventListener('keydown', onKey);
      if (bar) bar.remove(); bar = null; catcher.remove(); setTool('none'); state.article = null;
    });
  };
})(window.TDC);

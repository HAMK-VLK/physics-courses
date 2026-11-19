/* Shared helpers of the mech widget family (mech-*.js); copied from FHT thermo-common.js (same API, TDC.mechViz).
 * House style: ../TheoreticalDC/docs/COURSE-KIT.md §5. Config reference: .claude/skills/mech-widgets/SKILL.md.
 * Every widget takes the same frame options:
 *   values: {id: number}   start values of its parameters      fixed: ['id']   parameters shown as fixed (no slider)
 *   ranges: {id: {min, max, step, log}}   slider overrides       readouts: (p, s) => [...]   replaces the default readouts
 *   answer: (p, s) => ({v})   value checked by a widget quiz task (default: the widget's main result)
 * where p = parameter values and s = the widget's computed state. */
(function (TDC) {
  'use strict';
  var U = TDC.util, el = U.el, V = TDC.viz;
  var TV = TDC.mechViz = {};
  // Units that must not get an SI prefix in readouts ("1.5 kK", "2 kkg" are wrong; m and s: "0.744 s" reads better than "744 ms" in kinematics).
  var PLAIN = /^(kg|m|s|min|h|bar|kWh|L|km|m\/s|km\/h|mm|cm|m\/s²|rad\/s|rad\/s²|1\/s|r\/s|rpm|kg·m²|kg·m\/s|N·s|N·m|kN|kW|kJ|MJ|°)$/;

  /** UI string key as a bilingual object for labels that take {en, fi}: always the current language's text. */
  TV.L = function (key) {
    var o = {};
    TDC.i18n.langs.forEach(function (l) { Object.defineProperty(o, l, { enumerable: true, get: function () { return TDC.t(key); } }); });
    return o;
  };
  /** Canvas fill styles need rgba(): a token colour (#rrggbb) with alpha a. */
  TV.alpha = function (c, a) {
    var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(String(c).trim());
    if (m) return 'rgba(' + parseInt(m[1], 16) + ',' + parseInt(m[2], 16) + ',' + parseInt(m[3], 16) + ',' + a + ')';
    var r = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i.exec(String(c).trim());   // rgb()/rgba() from colour mixes
    return r ? 'rgba(' + r[1] + ',' + r[2] + ',' + r[3] + ',' + a + ')' : c;
  };
  TV.font = function (g, px, w) { g.font = (w || 600) + ' ' + px + 'px ' + getComputedStyle(document.body).fontFamily; };
  TV.fmt = function (v, unit, digits) {
    if (v == null || !isFinite(v)) return '—';
    return PLAIN.test(unit || '') ? U.fmtNum(v, digits || 3) + (unit === '°' ? '' : ' ') + unit : U.fmtSI(v, unit || '', digits || 3);
  };
  /** Arrow from (x0, y0) to (x1, y1). */
  TV.arrow = function (g, x0, y0, x1, y1, c, wd) {
    var a = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0), hd = Math.min(12, L * 0.45);
    g.strokeStyle = g.fillStyle = c; g.lineWidth = wd || 3; g.setLineDash([]);
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1 - hd * 0.7 * Math.cos(a), y1 - hd * 0.7 * Math.sin(a)); g.stroke();
    if (L < 3) return;
    g.beginPath(); g.moveTo(x1, y1);
    g.lineTo(x1 - hd * Math.cos(a - 0.4), y1 - hd * Math.sin(a - 0.4)); g.lineTo(x1 - hd * Math.cos(a + 0.4), y1 - hd * Math.sin(a + 0.4));
    g.closePath(); g.fill();
  };
  /** Canvas label in SI typography: letter runs are italic quantity symbols; digits, operators and the tail upright.
   *  A subscript is drawn at 75 % and lowered: upright when it is a number or a word (P_out, F_1: ISO 80000-1),
   *  italic when it is one letter (a symbol). Too wide for a phone-width canvas: a smaller font, down to 9 px
   *  (no fit check inside a translated frame, where x is not a canvas position). Returns the width. */
  TV.lab = function lab(g, s, tail, x, y, col, align, px, bg) {
    px = px || 13;
    var parts = [];
    (String(s || '').match(/[A-Za-zα-ωηΣ]+(?:_(?:\{[^}]*\}|[A-Za-z0-9α-ω]+))?|[^A-Za-zα-ωηΣ]+/g) || []).forEach(function (r) {
      var q = r.split('_'); parts.push({ s: q[0], it: /^[A-Za-zα-ωη]/.test(r) });
      if (q[1] != null) { var sub = q[1].replace(/[{}]/g, ''); parts.push({ s: sub, it: /^[A-Za-zα-ω]$/.test(sub), sub: true }); }
    });
    if (tail) parts.push({ s: TDC.i18n.localNum(String(tail)), it: false });
    function font(p) {
      var f = p.sub ? Math.round(px * 0.75) : px;
      g.font = p.it ? 'italic 600 ' + f + 'px ' + TDC.theme.color('--font-math') : '600 ' + f + 'px ' + getComputedStyle(document.body).fontFamily;
    }
    var w = 0;
    parts.forEach(function (p) { font(p); p.w = g.measureText(p.s).width + (p.it ? 1 : 0); w += p.w; });
    var x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    var cw = g.canvas.clientWidth || 1e9, T0 = g.getTransform();
    if (px > 9 && !T0.e && !T0.f && (x0 < 2 || x0 + w > cw - 2)) return lab(g, s, tail, x, y, col, align, px - 1, bg);
    if (bg) { g.globalAlpha = 0.85; g.fillStyle = bg; g.fillRect(x0 - 4, y - px * 0.8, w + 8, px * 1.6); g.globalAlpha = 1; }
    g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = col;
    parts.forEach(function (p) { font(p); g.fillText(p.s, x0, y + (p.sub ? px * 0.3 : 0)); x0 += p.w; });
    return w;
  };
  /** Text with an optional backdrop so lines never run through it. align: 'left'|'center'|'right'. */
  TV.text = function (g, s, x, y, c, align, bg) {
    s = TDC.i18n.localNum(String(s));
    g.textAlign = align || 'left'; g.textBaseline = 'middle';
    if (bg) {
      var w = g.measureText(String(s).replace(/[_^{}]/g, '')).width + 8, fs = parseFloat(/(\d+(?:\.\d+)?)px/.exec(g.font)[1]);
      var x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w + 4 : x - 4;
      g.fillStyle = bg; g.globalAlpha = 0.85; g.fillRect(x0, y - fs * 0.75, w, fs * 1.5); g.globalAlpha = 1;
    }
    g.fillStyle = c; g.fillText(s, x, y);
  };
  /** A small round dial gauge: value v on 0…max, label under it (formula notation allowed). */
  TV.gauge = function (g, ctx, x, y, r, v, max, label, valueText) {
    var fg = ctx.color('--fg'), line = ctx.color('--c-wire'), a0 = Math.PI * 0.75, span = Math.PI * 1.5;
    g.fillStyle = ctx.color('--c-body-fill'); g.strokeStyle = line; g.lineWidth = 2.5;
    g.beginPath(); g.arc(x, y, r, 0, 2 * Math.PI); g.fill(); g.stroke();
    g.lineWidth = 1.5;
    for (var k = 0; k <= 10; k++) {
      var a = a0 + span * k / 10, r1 = k % 5 ? r * 0.8 : r * 0.7;
      g.beginPath(); g.moveTo(x + r1 * Math.cos(a), y + r1 * Math.sin(a)); g.lineTo(x + r * 0.92 * Math.cos(a), y + r * 0.92 * Math.sin(a)); g.stroke();
    }
    var f = Math.max(0, Math.min(1.02, v / max)), an = a0 + span * f;
    g.strokeStyle = ctx.color('--c-2'); g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + r * 0.78 * Math.cos(an), y + r * 0.78 * Math.sin(an)); g.stroke();
    g.fillStyle = fg; g.beginPath(); g.arc(x, y, 3, 0, 2 * Math.PI); g.fill();
    if (valueText) { TV.font(g, Math.min(14, Math.max(10, r * 0.38)), 700); TV.text(g, valueText, x, y + r * 0.5, fg, 'center'); }
    if (label) { TV.font(g, 12, 500); TV.text(g, label, x, y + r + 12, ctx.color('--muted'), 'center'); }
  };

  /** Slider panel + stage + legend + readouts + saved state + quiz-task API for one widget.
   *  defs: [{id, tex|label, min, max, step, value, unit, log}], merged with cfg.values / cfg.ranges / cfg.fixed. */
  TV.frame = function (host, cfg, ctx, defs, onChange) {
    var values = cfg.values || {}, fixed = cfg.fixed || [], ranges = cfg.ranges || {}, base = {};
    var shown = [], lim = {};
    defs.forEach(function (d) {
      var p = lim[d.id] = Object.assign({}, d, ranges[d.id] || {});
      if (p.plain == null && PLAIN.test(p.unit || '')) p.plain = true;   // slider shows 0.6 m, not 600 mm
      if (values[d.id] != null) p.value = values[d.id];
      base[d.id] = p.value;
      if (fixed.indexOf(d.id) < 0) shown.push(p);
    });
    var panel = shown.length ? V.params(shown, function () { changed(); save(); }, ctx) : null;
    var stage = el('div', { class: 'mech-stage' }), legend = el('div', { class: 'plot-legend' }), reads = el('div', { class: 'readout-list' });
    var extra = el('div', { class: 'mech-controls' });
    host.append(el('div', { class: 'plot-widget mech-widget' }, [panel, extra, stage, legend, reads]));
    var save = U.debounce(function () { if (cfg.persist !== false) ctx.setState(F.p()); }, 400);
    var F = {
      stage: stage, legend: legend, controls: extra,
      p: function () { return Object.assign({}, base, panel ? panel.values : {}); },
      /** Set some values from the widget itself (dragging a part), moving their sliders too. */
      set: function (vals) {
        vals = Object.assign({}, vals);
        Object.keys(vals).forEach(function (k) {   // a dragged part stays inside its slider range, without float noise (0.30000000000000004)
          var r = lim[k]; if (r && typeof vals[k] === 'number') vals[k] = +Math.max(r.min, Math.min(r.max, vals[k])).toPrecision(12);
        });
        Object.assign(base, vals); if (panel) panel.setValues(vals); changed(); save(); },
      readouts: function (list) {
        reads.innerHTML = '';
        list.forEach(function (o) {
          if (!o) return;
          var lab = o.tex ? TDC.formula.el(o.tex) : el('span', {}, ctx.tx(o.label));
          var val = typeof o.value === 'number' ? TV.fmt(o.value, o.unit, o.digits) : typeof o.value === 'object' ? ctx.tx(o.value) : o.value;
          reads.appendChild(el('div', { class: 'readout' + (o.warn ? ' readout-warn' : '') }, [lab, el('b', {}, (o.tex || o.label ? ' = ' : '') + val)]));
        });
      },
      api: {
        // widgets set F.answer after each update; the quiz calls this later, so it must not capture an old closure
        getAnswer: function () { return F.answer ? F.answer() : {}; },
        getAnswerState: function () { return F.p(); },
        setAnswerState: function (st) { if (st) { Object.assign(base, st); if (panel) panel.setValues(st); changed(); } },
        lock: function () { host.querySelectorAll('input, button, select').forEach(function (i) { i.disabled = true; }); F.locked = true; }
      }
    };
    function changed() { onChange(F.p()); }
    var st = ctx.getState(); if (st) { Object.assign(base, st); if (panel) panel.setValues(st); }
    return F;
  };

  /** Readouts of a widget: cfg.readouts(p, s) when given, else the widget's defaults. */
  TV.reads = function (F, cfg, p, s, defaults) { F.readouts(cfg.readouts ? cfg.readouts(p, s) : defaults); };
  /** Play/pause toggle button (hidden when the user prefers reduced motion). */
  TV.playButton = function (F, ctx, onToggle, startPlaying) {
    if (U.reducedMotion()) return { playing: function () { return false; } };
    var playing = !!startPlaying, btn = el('button', { type: 'button', class: 'btn btn-small btn-ghost viz-play' });
    var ICON = { play: 'M4 2.5v11l9.5-5.5z', pause: 'M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z' };
    function draw() {
      btn.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="' + ICON[playing ? 'pause' : 'play'] + '"/></svg>';
      btn.appendChild(el('span', {}, ctx.t(playing ? 'mv.pause' : 'mv.play'))); btn.setAttribute('aria-pressed', String(playing));
    }
    btn.addEventListener('click', function () { playing = !playing; draw(); if (onToggle) onToggle(playing); });
    draw(); F.controls.appendChild(btn); ctx.onLang(draw);
    return { playing: function () { return playing; }, set: function (v) { playing = v; draw(); }, el: btn };
  };
  /** Rounded rectangle path (never a negative size or radius). */
  TV.rr = function (g, x, y, w, h, r) {
    w = Math.max(0, w); h = Math.max(0, h); g.beginPath();
    if (g.roundRect) g.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))); else g.rect(x, y, w, h);
  };
  /** Digital panel display (dark glass, green digits) centred at x, y. */
  TV.lcd = function (g, ctx, x, y, text, px) {
    px = px || 13; TV.font(g, px, 700);
    var w = g.measureText(text).width + 14, h = px + 10;
    g.fillStyle = ctx.color('--c-display-bg'); g.strokeStyle = ctx.color('--c-wire'); g.lineWidth = 1.5;
    TV.rr(g, x - w / 2, y - h / 2, w, h, 4); g.fill(); g.stroke();
    TV.text(g, text, x, y + 1, ctx.color('--c-display-fg'), 'center');
    return w;
  };

  /** Device widget: sliders + canvas drawing of a real device + readouts, as one 'custom' widget config.
   *  def: { params, aspect, animate, draw(g, w, h, p, ctx, TV, D), outputs(p) -> readout items, answer(p) -> {v},
   *         buttons: [{label: {en, fi}, click(p, D)}],                    hands-on actions under the sliders
   *         drag: {hit(x, y, p, D) -> key|null, move(key, x, y, p, D) -> {id: value}} }   drag a part of the device
   *  D = {S: per-mount scratch state, w, h, t, dt, motion (animations allowed), set(vals) (moves the sliders too)}.
   *  Values set by the device are clamped to the slider range. Redraws on slider, theme and language change; the
   *  slider state is saved; takes part in widget quiz tasks (getAnswer). vals: start values overriding def.params. */
  TV.device = function (def, vals) {
    return {
      mount: function (host, ctx) {
        var params = def.params.map(function (p) { var q = Object.assign({}, p); if (vals && vals[p.id] != null) q.value = vals[p.id]; if (q.plain == null && PLAIN.test(q.unit || '')) q.plain = true; return q; });
        var save = U.debounce(function () { ctx.setState(Object.assign({}, panel.values)); }, 400);
        var panel = V.params(params, function () { update(); save(); }, ctx);
        var btns = el('div', { class: 'mech-controls' }), stage = el('div', { class: 'mech-stage' }), reads = el('div', { class: 'readout-list' });
        host.append(el('div', { class: 'plot-widget mech-widget' }, [panel, btns, stage, reads]));
        var locked = false, D = { S: {}, w: 0, h: 0, t: 0, dt: 0, motion: !!def.animate && !U.reducedMotion(),
          set: function (v) {
            var o = {};
            params.forEach(function (p) {
              if (v[p.id] == null) return;
              var x = Math.max(p.min, Math.min(p.max, v[p.id]));
              o[p.id] = p.step ? +(Math.round(x / p.step) * p.step).toFixed(6) : x;
            });
            panel.setValues(o); update(); save();
          } };
        var cv = V.canvas(stage, { aspect: def.aspect || function (w) { return w < 520 ? 0.85 : 0.5; }, animate: !!def.animate,
          draw: function (g, w, h, t, dt) { D.w = w; D.h = h; D.t = t || 0; D.dt = dt || 0; def.draw(g, w, h, panel.values, ctx, TV, D); } });
        (def.buttons || []).forEach(function (b) {
          var btn = el('button', { type: 'button', class: 'btn btn-small' });
          TDC.i18n.bind(btn, b.label, true);
          btn.addEventListener('click', function () { if (!locked) { b.click(panel.values, D); cv.redraw(); } });
          btns.appendChild(btn);
        });
        if (def.drag) TV.drag(cv.canvas, function (x, y) { return !locked && (D.key = def.drag.hit(x, y, panel.values, D)); },
          function (x, y) { if (D.key) D.set(def.drag.move(D.key, x, y, panel.values, D)); }, function () { D.key = null; });
        var saved = ctx.getState();
        if (saved) { panel.setValues(saved); Object.keys(saved).forEach(function (k) { if (panel.values[k] == null) panel.values[k] = saved[k]; }); }   // also a device's own non-slider state (t1 rounding-trap mode)
        function update() {
          cv.redraw();
          reads.innerHTML = '';
          def.outputs(panel.values).forEach(function (o) {
            var lab = o.tex ? TDC.formula.el(o.tex) : el('span', {}, ctx.tx(o.label));
            var val = typeof o.value === 'number' ? TV.fmt(o.value, o.unit, o.digits) : typeof o.value === 'object' ? ctx.tx(o.value) : o.value;
            reads.appendChild(el('div', { class: 'readout' + (o.warn ? ' readout-warn' : '') }, [lab, el('b', {}, ' = ' + val)]));
          });
        }
        ctx.onTheme(function () { cv.redraw(); });
        function aria() { cv.canvas.setAttribute('aria-label', ctx.t('mv.deviceAria')); }
        ctx.onLang(function () { aria(); update(); });
        aria(); update();
        return {
          destroy: cv.destroy,
          getAnswer: function () { return def.answer ? def.answer(panel.values) : {}; },
          getAnswerState: function () { return Object.assign({}, panel.values); },
          setAnswerState: function (st) { if (st) { panel.setValues(st); update(); } },
          lock: function () { locked = true; host.querySelectorAll('input, button, select').forEach(function (i) { i.disabled = true; }); }
        };
      }
    };
  };

  /** Drag handler on a canvas: onDrag(x, y) in CSS pixels; hit(x, y) decides whether a press starts a drag. */
  TV.drag = function (canvas, hit, onDrag, onEnd) {
    var active = false;
    canvas.style.touchAction = 'none';   // otherwise the browser pans and cancels the drag on phones
    function pos(e) { var r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    canvas.addEventListener('pointerdown', function (e) {
      var q = pos(e); if (!hit(q[0], q[1])) return;
      active = true; canvas.setPointerCapture(e.pointerId); e.preventDefault(); onDrag(q[0], q[1]);
    });
    canvas.addEventListener('pointermove', function (e) {
      var q = pos(e);
      if (active) onDrag(q[0], q[1]); else canvas.style.cursor = hit(q[0], q[1]) ? 'grab' : '';
    });
    function end() { if (active) { active = false; if (onEnd) onEnd(); } }
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  };
})(window.TDC);

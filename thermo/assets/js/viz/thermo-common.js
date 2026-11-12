/* Shared helpers of the thermo widget families (thermo-fluids.js, thermo-gas.js, thermo-heat.js).
 * House style: docs/COURSE-KIT.md §5. Config reference: .claude/skills/fht-widgets/SKILL.md.
 * Every widget takes the same frame options:
 *   values: {id: number}   start values of its parameters      fixed: ['id']   parameters shown as fixed (no slider)
 *   ranges: {id: {min, max, step, log}}   slider overrides       readouts: (p, s) => [...]   replaces the default readouts
 *   answer: (p, s) => ({v})   value checked by a widget quiz task (default: the widget's main result)
 * where p = parameter values and s = the widget's computed state. */
(function (TDC) {
  'use strict';
  var U = TDC.util, el = U.el, V = TDC.viz;
  var TV = TDC.thermoViz = {};
  // Units that must not get an SI prefix in readouts ("1.5 kK", "2 kkg" are wrong).
  var PLAIN = /^(K|kg|min|h|kg\/s|bar|kWh|mmHg|L|L\/s|L\/min|g\/m³|kPa|MPa|kJ|MJ|kW|mA|m\/s|mm|cm|km|1\/K|J\/\(kg·K\)|W\/\(m²·K\)|W\/\(m·K\)|K\/W|m²·K\/W|Pa·s|mPa·s)$/;

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
  /** Temperature colour: f = 0 cold (--c-cold, blue) … 1 hot (--c-hot, red), optional alpha a. */
  TV.heat = function (f, a) {
    function rgb(c) { var m = /#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(String(c).trim()); return m ? [1, 2, 3].map(function (i) { return parseInt(m[i], 16); }) : [128, 128, 128]; }
    var A = rgb(TDC.theme.color('--c-cold')), B = rgb(TDC.theme.color('--c-hot')), k = Math.max(0, Math.min(1, f));
    return 'rgba(' + A.map(function (v, i) { return Math.round(v + (B[i] - v) * k); }).join(',') + ',' + (a == null ? 1 : a) + ')';
  };
  TV.font = function (g, px, w) { g.font = (w || 600) + ' ' + px + 'px ' + getComputedStyle(document.body).fontFamily; };
  TV.fmt = function (v, unit, digits) {
    if (v == null || !isFinite(v)) return '—';
    return PLAIN.test(unit || '') ? U.fmtNum(v, digits || 3) + ' ' + unit : U.fmtSI(v, unit || '', digits || 3);
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
  /** Text with an optional backdrop so lines never run through it. align: 'left'|'center'|'right'. */
  TV.text = function (g, s, x, y, c, align, bg) {
    g.textAlign = align || 'left'; g.textBaseline = 'middle';
    if (bg) {
      var w = g.measureText(String(s).replace(/[_^{}]/g, '')).width + 8, fs = parseFloat(/(\d+)px/.exec(g.font)[1]);
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
  /** Wavy water surface line from x0 to x1 at y (phase t animates it). */
  TV.waterLine = function (g, x0, x1, y, t, c) {
    g.strokeStyle = c; g.lineWidth = 2; g.beginPath();
    for (var x = x0; x <= x1; x += 4) { var yy = y + 1.6 * Math.sin(x / 9 + t * 2); if (x === x0) g.moveTo(x, yy); else g.lineTo(x, yy); }
    g.stroke();
  };

  /** Slider panel + stage + legend + readouts + saved state + quiz-task API for one widget.
   *  defs: [{id, tex|label, min, max, step, value, unit, log}], merged with cfg.values / cfg.ranges / cfg.fixed. */
  TV.frame = function (host, cfg, ctx, defs, onChange) {
    var values = cfg.values || {}, fixed = cfg.fixed || [], ranges = cfg.ranges || {}, base = {};
    var shown = [];
    defs.forEach(function (d) {
      var p = Object.assign({}, d, ranges[d.id] || {});
      if (values[d.id] != null) p.value = values[d.id];
      base[d.id] = p.value;
      if (fixed.indexOf(d.id) < 0) shown.push(p);
    });
    var panel = shown.length ? V.params(shown, function () { changed(); save(); }, ctx) : null;
    var stage = el('div', { class: 'thermo-stage' }), legend = el('div', { class: 'plot-legend' }), reads = el('div', { class: 'readout-list' });
    var extra = el('div', { class: 'thermo-controls' });
    host.append(el('div', { class: 'plot-widget thermo-widget' }, [panel, extra, stage, legend, reads]));
    var save = U.debounce(function () { if (cfg.persist !== false) ctx.setState(F.p()); }, 400);
    var F = {
      stage: stage, legend: legend, controls: extra,
      p: function () { return Object.assign({}, base, panel ? panel.values : {}); },
      /** Set some values from the widget itself (dragging a part), moving their sliders too. */
      set: function (vals) { Object.assign(base, vals); if (panel) panel.setValues(vals); changed(); save(); },
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
      btn.appendChild(el('span', {}, ctx.t(playing ? 'th.pause' : 'th.play'))); btn.setAttribute('aria-pressed', String(playing));
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
  /** Liquid-in-glass thermometer from yTop to yBot at x: t on tmin…tmax, value text beside it (side 'left'|'right'). */
  TV.thermometer = function (g, ctx, x, yTop, yBot, t, tmin, tmax, side) {
    var f = Math.max(0, Math.min(1, (t - tmin) / (tmax - tmin))), yb = yBot - 7, yl = yb - (yb - yTop - 4) * f, col = TV.heat(f);
    g.fillStyle = ctx.color('--c-body-fill'); g.strokeStyle = ctx.color('--c-wire'); g.lineWidth = 1.5;
    TV.rr(g, x - 4, yTop, 8, yb - yTop, 4); g.fill(); g.stroke();
    g.beginPath(); g.arc(x, yb, 7, 0, 2 * Math.PI); g.fill(); g.stroke();
    g.fillStyle = col; g.fillRect(x - 2, yl, 4, yb - yl); g.beginPath(); g.arc(x, yb, 5, 0, 2 * Math.PI); g.fill();
    TV.font(g, 12, 700);
    TV.text(g, U.fmtNum(t, 3) + ' °C', side === 'left' ? x - 12 : x + 12, Math.max(yTop + 6, yl), ctx.color('--fg'), side === 'left' ? 'right' : 'left', ctx.color('--surface'));
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
        var params = def.params.map(function (p) { var q = Object.assign({}, p); if (vals && vals[p.id] != null) q.value = vals[p.id]; return q; });
        var save = U.debounce(function () { ctx.setState(Object.assign({}, panel.values)); }, 400);
        var panel = V.params(params, function () { update(); save(); }, ctx);
        var btns = el('div', { class: 'thermo-controls' }), stage = el('div', { class: 'thermo-stage' }), reads = el('div', { class: 'readout-list' });
        host.append(el('div', { class: 'plot-widget thermo-widget' }, [panel, btns, stage, reads]));
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
        var saved = ctx.getState(); if (saved) panel.setValues(saved);
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
        ctx.onLang(update);
        update();
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

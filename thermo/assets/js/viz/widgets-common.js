/* Shared widget helpers + small generic widgets:
 *   TDC.viz.params(params, onChange, ctx) -> slider panel     TDC.viz.canvas(host, opts) -> animated HiDPI canvas
 *   widget 'custom': config.mount(host, ctx) -> api           widget 'readout': live formula calculator */
(function (TDC) {
  'use strict';
  var U = TDC.util, el = U.el;
  var V = TDC.viz = TDC.viz || {};

  /** Slider panel. params: [{id, label:{en,fi}|tex, tex, min, max, step, value, unit, log}] */
  V.params = function (params, onChange, ctx) {
    var values = {};
    var box = el('div', { class: 'param-panel' });
    params.forEach(function (p) {
      values[p.id] = p.value;
      var log = !!p.log;
      var toS = function (v) { return log ? Math.log(v / p.min) / Math.log(p.max / p.min) * 1000 : (v - p.min) / (p.max - p.min) * 1000; };
      var fromS = function (s) { var v = log ? p.min * Math.pow(p.max / p.min, s / 1000) : p.min + (p.max - p.min) * s / 1000; return p.step ? Math.round(v / p.step) * p.step : +v.toPrecision(3); };
      var range = el('input', { type: 'range', min: 0, max: 1000, step: 1, value: toS(p.value), 'aria-label': ctx.tx(p.tex || p.label) });
      var out = el('output', { class: 'param-val' }, U.fmtSI(p.value, p.unit || '', 3));
      range.addEventListener('input', function () {
        var v = fromS(+range.value); values[p.id] = v; out.textContent = U.fmtSI(v, p.unit || '', 3); onChange(values, p.id);
      });
      var lab = p.tex ? TDC.formula.el(p.tex) : el('span'); if (!p.tex) TDC.i18n.bind(lab, p.label, true);
      box.appendChild(el('label', { class: 'param' }, [el('span', { class: 'param-name' }, lab), range, out]));
      p._set = function (v) { values[p.id] = v; range.value = toS(v); out.textContent = U.fmtSI(v, p.unit || '', 3); };
    });
    box.values = values;
    box.setValues = function (vals) { params.forEach(function (p) { if (vals && vals[p.id] != null) p._set(vals[p.id]); }); };
    return box;
  };

  /** Canvas text with the same X_y / X^y notation as formulas: "V_N", "R_{eq}" draw a real lowered/raised script. */
  var SCRIPT = /([_^])(\{[^}]*\}|[A-Za-z0-9Ͱ-Ͽ]+)/g;   // Greek too: "M_λ"
  function richText(g) {
    var plain = g.fillText;
    g.fillText = function (s, x, y) {
      s = String(s);
      if (!SCRIPT.test(s)) return plain.apply(g, arguments);
      SCRIPT.lastIndex = 0;
      var font = g.font, size = parseFloat((/(\d+(?:\.\d+)?)px/.exec(font) || [0, 13])[1]), small = font.replace(/\d+(?:\.\d+)?px/, (size * 0.75).toFixed(1) + 'px');
      var runs = [], last = 0, m;
      while ((m = SCRIPT.exec(s))) {
        if (m.index > last) runs.push([s.slice(last, m.index), 0]);
        runs.push([m[2].replace(/^\{|\}$/g, ''), m[1] === '_' ? 0.3 : -0.4]);
        last = m.index + m[0].length;
      }
      if (last < s.length) runs.push([s.slice(last), 0]);
      var align = g.textAlign, total = 0;
      runs.forEach(function (r) { g.font = r[1] ? small : font; r.w = g.measureText(r[0]).width; total += r.w; });
      var cx = align === 'center' ? x - total / 2 : align === 'right' || align === 'end' ? x - total : x;
      g.textAlign = 'left';
      runs.forEach(function (r) { g.font = r[1] ? small : font; plain.call(g, r[0], cx, y + r[1] * size); cx += r.w; });
      g.font = font; g.textAlign = align;
    };
  }

  /** HiDPI canvas with an animation loop that pauses when off-screen or hidden.
   *  opts: {height | aspect (number or fn(width)), animate, draw(g, w, h, t, dt)} ; returns {canvas, redraw(), destroy()} */
  V.canvas = function (host, opts) {
    var c = el('canvas', { class: 'viz-canvas', role: 'img' });
    host.appendChild(c);
    var g = c.getContext('2d'), w = 0, h = 0, raf = 0, visible = true, t0 = performance.now(), last = t0;
    richText(g);
    function size() {
      var dpr = window.devicePixelRatio || 1;
      w = c.clientWidth; h = opts.height || Math.round(w * (typeof opts.aspect === 'function' ? opts.aspect(w) : opts.aspect || 0.5));
      c.style.height = h + 'px'; c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      opts.draw(g, w, h, (now - t0) / 1000, dt);
      if (opts.animate !== false && visible && !U.reducedMotion()) raf = requestAnimationFrame(frame);
    }
    var ro = new ResizeObserver(function () { size(); opts.draw(g, w, h, (performance.now() - t0) / 1000, 0); });
    ro.observe(c);
    var io = new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting; cancelAnimationFrame(raf);
      if (visible) { last = performance.now(); raf = requestAnimationFrame(frame); }
    });
    io.observe(c);
    size();
    return {
      canvas: c,
      redraw: function () { if (opts.animate === false || U.reducedMotion()) opts.draw(g, w, h, (performance.now() - t0) / 1000, 0); },
      destroy: function () { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); }
    };
  };

  TDC.widgets.register('custom', function (host, cfg, ctx) {
    return cfg.mount(host, ctx, cfg) || {};
  });

  /** 'readout': sliders + computed result lines. cfg: {params:[...], outputs:(vals)=>[{label|tex, value, unit}], answer:(vals)=>{v}} */
  TDC.widgets.register('readout', function (host, cfg, ctx) {
    var res = el('div', { class: 'readout-list' });
    var panel = V.params(cfg.params, update, ctx);
    host.append(panel, res);
    function update() {
      res.innerHTML = '';
      cfg.outputs(panel.values).forEach(function (o) {
        var lab = o.tex ? TDC.formula.el(o.tex) : el('span', {}, ctx.tx(o.label));
        var val = typeof o.value === 'number' ? U.fmtSI(o.value, o.unit || '', o.digits || 3) : typeof o.value === 'object' ? ctx.tx(o.value) : o.value;
        res.appendChild(el('div', { class: 'readout' }, [lab, el('b', {}, ' = ' + val)]));
      });
    }
    var saved = ctx.getState(); if (saved) panel.setValues(saved);
    ctx.onLang(update); update();
    return {
      getAnswer: function () { return cfg.answer ? cfg.answer(panel.values) : { v: panel.values[cfg.params[0].id] }; },
      getAnswerState: function () { return Object.assign({}, panel.values); },
      setAnswerState: function (s) { panel.setValues(s); update(); },
      lock: function () { panel.querySelectorAll('input').forEach(function (i) { i.disabled = true; }); }
    };
  });
})(window.TDC);

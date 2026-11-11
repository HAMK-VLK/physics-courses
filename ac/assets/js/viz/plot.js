/* 'plot' widget: responsive SVG function graph with parameter sliders, markers and readouts.
 * cfg: { x:{min,max,label,unit,log}, y:{min,max,label,unit,auto,log}, params:[...] (see TDC.viz.params),
 *        curves:[{fn:(x,p)=>y, label:{en,fi}, color:'--c-1'|'#hex', dash:true}],
 *        points:(p)=>[{x,y,label}], vlines:(p)=>[{x,label}], hlines:(p)=>[{y,label,color}], readouts:(p)=>[{label|tex,value,unit}],
 *        answer:(p)=>({v:...}), height }  */
(function (TDC) {
  'use strict';
  var U = TDC.util, el = U.el, svg = U.svg;

  function niceTicks(min, max, n) {
    var span = max - min, step = Math.pow(10, Math.floor(Math.log10(span / n))), err = span / n / step;
    if (err >= 7.5) step *= 10; else if (err >= 3.5) step *= 5; else if (err >= 1.5) step *= 2;
    var out = [], v = Math.ceil(min / step) * step;
    for (; v <= max + step * 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : +v.toPrecision(12));   // no -5.55e-17 at zero
    return out;
  }

  /** Log-axis ticks: every decade, plus 2 and 5 when the axis spans at most 3 decades. */
  function logTicks(min, max) {
    var out = [], few = Math.log10(max / min) <= 3;
    for (var e = Math.floor(Math.log10(min)); e <= Math.ceil(Math.log10(max)); e++)
      (few ? [1, 2, 5] : [1]).forEach(function (k) { var v = +(k * Math.pow(10, e)).toPrecision(12); if (v >= min * (1 - 1e-9) && v <= max * (1 + 1e-9)) out.push(v); });
    return out;
  }
  /** Tick text: decades on a log axis outside 0.001…1000 read 10⁻⁵, not 1,000·10⁻⁵. */
  function tickText(t, log) {
    var e = Math.round(Math.log10(t));
    if (log && Math.abs(t / Math.pow(10, e) - 1) < 1e-9 && (e > 3 || e < -3)) return '10' + String(e).replace(/-/, '⁻').replace(/\d/g, function (c) { return '⁰¹²³⁴⁵⁶⁷⁸⁹'[c]; });
    return U.fmtNum(t, 4);
  }
  (TDC.viz = TDC.viz || {}).niceTicks = niceTicks;   // plot.js loads before widgets-common

  TDC.widgets.register('plot', function (host, cfg, ctx) {
    var W = 640, H = cfg.height || 340, m = { l: 62, r: 18, t: 16, b: 46 };
    var root = svg('svg', { class: 'plot-svg', viewBox: '0 0 ' + W + ' ' + H, role: 'img' });
    var legend = el('div', { class: 'plot-legend' }), reads = el('div', { class: 'readout-list' });
    var panel = cfg.params ? TDC.viz.params(cfg.params, draw, ctx) : null;
    host.append(el('div', { class: 'plot-widget' }, [panel, root, legend, reads]));
    var tip = svg('g', { class: 'plot-tip', visibility: 'hidden' });

    function color(c, i) { var v = c && c.indexOf('--') === 0 ? TDC.theme.color(c) : c; return v || TDC.theme.color('--c-' + (i % 6 + 1)); }
    function draw() {
      var p = panel ? panel.values : {};
      var xs = cfg.x, ys = cfg.y;
      var ymin = ys.min, ymax = ys.max;
      var N = 240, data = cfg.curves.map(function (c) {
        var pts = [];
        for (var i = 0; i <= N; i++) {
          var x = xs.log ? xs.min * Math.pow(xs.max / xs.min, i / N) : xs.min + (xs.max - xs.min) * i / N, y = c.fn(x, p);
          if (isFinite(y) && !(ys.log && y <= 0)) pts.push([x, y]);
        }
        return pts;
      });
      if (ys.auto) {
        var all = [].concat.apply([], data).map(function (q) { return q[1]; });
        ymax = Math.max.apply(null, all.concat([ys.max != null ? ys.max : -Infinity])) * (ys.log ? 1.5 : 1.08); ymin = ys.min != null ? ys.min : Math.min.apply(null, all);
      }
      // f maps a value to 0…1 along an axis (linear or log)
      function frac(v, lo, hi, log) { return log ? Math.log(v / lo) / Math.log(hi / lo) : (v - lo) / (hi - lo); }
      var sx = function (x) { return m.l + frac(x, xs.min, xs.max, xs.log) * (W - m.l - m.r); };
      var sy = function (y) { return H - m.b - frac(y, ymin, ymax, ys.log) * (H - m.t - m.b); };
      root.innerHTML = '';
      var gAx = svg('g', { class: 'plot-axes' });
      var tx = xs.log ? logTicks(xs.min, xs.max) : niceTicks(xs.min, xs.max, 6), ty = ys.log ? logTicks(ymin, ymax) : niceTicks(ymin, ymax, 5);
      var kx = Math.ceil(tx.length / 9), ky = Math.ceil(ty.length / 7);   // many log decades: grid on all, text on every k-th
      tx.forEach(function (t, i) {
        gAx.append(svg('line', { x1: sx(t), x2: sx(t), y1: m.t, y2: H - m.b, class: 'grid' }), i % kx ? '' : svg('text', { x: sx(t), y: H - m.b + 18, 'text-anchor': 'middle', text: tickText(t, xs.log) }));
      });
      ty.forEach(function (t, i) {
        gAx.append(svg('line', { x1: m.l, x2: W - m.r, y1: sy(t), y2: sy(t), class: 'grid' }), i % ky ? '' : svg('text', { x: m.l - 8, y: sy(t) + 4, 'text-anchor': 'end', text: tickText(t, ys.log) }));
      });
      gAx.append(svg('line', { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, class: 'axis' }), svg('line', { x1: m.l, x2: m.l, y1: m.t, y2: H - m.b, class: 'axis' }),
        svg('text', { x: (W + m.l) / 2, y: H - 6, 'text-anchor': 'middle', class: 'axis-label', text: ctx.tx(xs.label) + (xs.unit ? ' [' + xs.unit + ']' : '') }),
        svg('text', { x: 17, y: (H - m.b + m.t) / 2, 'text-anchor': 'middle', class: 'axis-label', transform: 'rotate(-90 17 ' + (H - m.b + m.t) / 2 + ')', text: ctx.tx(ys.label) + (ys.unit ? ' [' + ys.unit + ']' : '') }));
      root.appendChild(gAx);
      var clip = svg('clipPath', { id: ctx.id + '-clip' }, svg('rect', { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b }));
      root.appendChild(svg('defs', {}, clip));
      var gC = svg('g', { 'clip-path': 'url(#' + ctx.id + '-clip)' });
      // Labels near the right/top edge go left of/below their line or point so the clip does not cut them off.
      function lab(x, y, dx, cls, text) {
        var left = x > W - m.r - 110;
        if (y < m.t + 12) y += 22;
        return svg('text', { x: left ? x - dx : x + dx, y: y, 'text-anchor': left ? 'end' : null, class: cls, text: text });
      }
      (cfg.vlines ? cfg.vlines(p) : []).forEach(function (v) {
        if (!(v.x >= xs.min && v.x <= xs.max)) return;
        gC.appendChild(svg('line', { x1: sx(v.x), x2: sx(v.x), y1: m.t, y2: H - m.b, class: 'vline' }));
        if (v.label) gC.appendChild(lab(sx(v.x), m.t + 14, 4, 'vline-label', ctx.tx(v.label)));
      });
      (cfg.hlines ? cfg.hlines(p) : []).forEach(function (v) {
        if (!(v.y >= ymin && v.y <= ymax)) return;
        gC.appendChild(svg('line', { x1: m.l, x2: W - m.r, y1: sy(v.y), y2: sy(v.y), class: 'vline', stroke: v.color ? color(v.color) : null }));
        if (v.label) gC.appendChild(svg('text', { x: W - m.r - 6, y: sy(v.y) - 6, 'text-anchor': 'end', class: 'vline-label', fill: v.color ? color(v.color) : null, text: ctx.tx(v.label) }));
      });
      data.forEach(function (pts, i) {
        var c = cfg.curves[i];
        gC.appendChild(svg('polyline', { points: pts.map(function (q) { return sx(q[0]).toFixed(1) + ',' + sy(q[1]).toFixed(1); }).join(' '),
          class: 'curve', stroke: color(c.color, i), 'stroke-dasharray': c.dash ? '6 5' : null }));
      });
      (cfg.points ? cfg.points(p) : []).forEach(function (pt) {
        if ((xs.log && pt.x <= 0) || (ys.log && pt.y <= 0)) return;
        gC.appendChild(svg('circle', { cx: sx(pt.x), cy: sy(pt.y), r: 6, class: 'pt' }));
        if (pt.label) gC.appendChild(lab(sx(pt.x), sy(pt.y) - 9, 9, 'pt-label', ctx.tx(pt.label)));
      });
      root.appendChild(gC); root.appendChild(tip);
      // Labels of nearby points/lines would overprint each other: push a label down until it is clear.
      var placed = [];
      gC.querySelectorAll('.pt-label, .vline-label').forEach(function (t) {
        try {
          var y0 = +t.getAttribute('y'), lh = t.getBBox().height + 1;
          for (var k = 0; k < 9; k++) {   // offsets 0, +1, −1, +2, −2 … lines, staying inside the plot area
            var y = y0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * lh;
            if (y < m.t + lh || y > H - m.b - 2) continue;
            t.setAttribute('y', y);
            var b = t.getBBox();
            if (!placed.some(function (q) { return b.x < q.x + q.width && q.x < b.x + b.width && b.y < q.y + q.height && q.y < b.y + b.height; })) break;
          }
          placed.push(t.getBBox());
        } catch (e) {}
      });
      legend.innerHTML = '';
      cfg.curves.forEach(function (c, i) { if (c.label) legend.appendChild(el('span', { class: 'lg' }, [el('i', { style: { background: color(c.color, i) } }), ctx.tx(c.label)])); });
      reads.innerHTML = '';
      (cfg.readouts ? cfg.readouts(p) : []).forEach(function (o) {
        var lab = o.tex ? TDC.formula.el(o.tex) : el('span', {}, ctx.tx(o.label));
        reads.appendChild(el('div', { class: 'readout' }, [lab, el('b', {}, ' = ' + (typeof o.value === 'number' ? U.fmtSI(o.value, o.unit || '', 3) : o.value))]));
      });
      root._sx = sx; root._sy = sy; root._ymin = ymin; root._ymax = ymax;
      if (panel && cfg.persist !== false && !ctx.readOnly()) save();
    }
    var save = U.debounce(function () { ctx.setState(Object.assign({}, panel.values)); }, 400);
    // Hover/touch crosshair readout on the first curve
    root.addEventListener('pointermove', function (e) {
      var r = root.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W;
      if (x < m.l || x > W - m.r) { tip.setAttribute('visibility', 'hidden'); return; }
      var q = (x - m.l) / (W - m.l - m.r), xv = cfg.x.log ? cfg.x.min * Math.pow(cfg.x.max / cfg.x.min, q) : cfg.x.min + q * (cfg.x.max - cfg.x.min);
      var yv = cfg.curves[0].fn(xv, panel ? panel.values : {});
      if (!isFinite(yv) || (cfg.y.log && yv <= 0)) return;
      tip.innerHTML = '';
      tip.append(svg('circle', { cx: x, cy: root._sy(yv), r: 4 }), svg('text', { x: x + 8, y: root._sy(yv) - 8, text: '(' + U.fmtNum(xv, 3) + ', ' + U.fmtNum(yv, 3) + ')' }));
      tip.setAttribute('visibility', 'visible');
    });
    root.addEventListener('pointerleave', function () { tip.setAttribute('visibility', 'hidden'); });
    if (panel) { var s = ctx.getState(); if (s) panel.setValues(s); }
    ctx.onTheme(draw); ctx.onLang(draw);
    draw();
    return {
      getAnswer: function () { return cfg.answer ? cfg.answer(panel.values) : { v: panel.values[cfg.params[0].id] }; },
      getAnswerState: function () { return panel ? Object.assign({}, panel.values) : null; },
      setAnswerState: function (s) { if (panel && s) { panel.setValues(s); draw(); } },
      lock: function () { if (panel) panel.querySelectorAll('input').forEach(function (i) { i.disabled = true; }); }
    };
  });
})(window.TDC);

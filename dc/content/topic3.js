/* topic3 = Voltage and current sources, DC circuits and Kirchhoff's rules.
 * Source: EE3KirchoffDCcircuits.pdf (corrected per PDF-ERRATA.md). NO answers in this file:
 * answers live in src/answers/topic3.json. Block ids are stable and must never be renamed. */
(function () {
  'use strict';

  /* ---------------------------------------------------------------- shared drawing helpers */
  function arrow(g, x0, y0, x1, y1, col, hs, lw) {
    g.strokeStyle = col; g.fillStyle = col; g.lineWidth = lw || 2;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    var a = Math.atan2(y1 - y0, x1 - x0); hs = hs || 8;
    g.beginPath(); g.moveTo(x1, y1);
    g.lineTo(x1 - hs * Math.cos(a - 0.4), y1 - hs * Math.sin(a - 0.4));
    g.lineTo(x1 - hs * Math.cos(a + 0.4), y1 - hs * Math.sin(a + 0.4));
    g.closePath(); g.fill();
  }
  function resBox(g, cx, cy, len, wid, ang, col, fill) {
    g.save(); g.translate(cx, cy); g.rotate(ang);
    g.fillStyle = fill; g.strokeStyle = col; g.lineWidth = 2;
    g.fillRect(-len / 2, -wid / 2, len, wid); g.strokeRect(-len / 2, -wid / 2, len, wid);
    g.restore();
  }
  function cellSym(g, cx, cy, ang, col, fill, s) {      // battery symbol, long plate = + side (towards +x before rotation)
    g.save(); g.translate(cx, cy); g.rotate(ang); g.strokeStyle = col; g.lineWidth = 2;
    g.beginPath(); g.moveTo(-s, 0); g.lineTo(-s / 4, 0); g.moveTo(s / 4 + 3, 0); g.lineTo(s, 0); g.stroke();
    g.lineWidth = 3; g.beginPath(); g.moveTo(-s / 4, -s * 0.38); g.lineTo(-s / 4, s * 0.38); g.stroke();
    g.lineWidth = 2; g.beginPath(); g.moveTo(s / 4 + 3, -s * 0.7); g.lineTo(s / 4 + 3, s * 0.7); g.stroke();
    g.restore();
  }
  function dotsAlong(g, x0, y0, x1, y1, phase, n, dir, col, r) {
    g.fillStyle = col;
    for (var k = 0; k < n; k++) {
      var f = ((phase + k / n) % 1 + 1) % 1; if (dir < 0) f = 1 - f;
      g.beginPath(); g.arc(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, r || 3, 0, 7); g.fill();
    }
  }
  function mkBtn(label, onClick, cls) {
    return TDC.util.el('button', { type: 'button', class: 'btn btn-small ' + (cls || ''), onclick: onClick, text: label });
  }
  function tabs(ctx, items, initial, onPick) {            // segmented button row, items [{id, label:{en,fi}}]
    var el = TDC.util.el, row = el('div', { class: 'btn-row', style: { margin: '.4rem 0' } }), btns = {};
    function paint(cur) { items.forEach(function (it) { btns[it.id].className = 'btn btn-small ' + (it.id === cur ? 'btn-primary' : ''); btns[it.id].setAttribute('aria-pressed', it.id === cur ? 'true' : 'false'); }); }
    items.forEach(function (it) {
      var b = el('button', { type: 'button', class: 'btn btn-small', text: ctx.tx(it.label), onclick: function () { paint(it.id); onPick(it.id); } });
      btns[it.id] = b; row.appendChild(b);
    });
    paint(initial);
    ctx.onLang(function () { items.forEach(function (it) { btns[it.id].textContent = ctx.tx(it.label); }); });
    return row;
  }
  function solve3(A, b) {                                   // Cramer's rule for 3 x 3
    function det(m) { return m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]); }
    var D = det(A), x = [];
    for (var c = 0; c < 3; c++) { var M = A.map(function (row, i) { var r = row.slice(); r[c] = b[i]; return r; }); x.push(det(M) / D); }
    return x;
  }
  function textLines(g, lines, x, y, lh, col) {
    g.fillStyle = col; lines.forEach(function (s, i) { g.fillText(s, x, y + i * lh); });
  }

  /* ---------------------------------------------------------------- widget: KCL node */
  function mountKcl(host, ctx) {
    var phase = [0, 0, 0], cv;
    var panel = TDC.viz.params([
      { id: 'E1', tex: 'E_1', min: 0, max: 24, step: 0.5, value: 12, unit: 'V' },
      { id: 'E2', tex: 'E_2', min: 0, max: 24, step: 0.5, value: 6, unit: 'V' },
      { id: 'R1', tex: 'R_1', min: 1, max: 50, step: 1, value: 10, unit: 'Ω' },
      { id: 'R2', tex: 'R_2', min: 1, max: 50, step: 1, value: 20, unit: 'Ω' },
      { id: 'R3', tex: 'R_3', min: 1, max: 50, step: 1, value: 10, unit: 'Ω' }
    ], function () { cv.redraw(); }, ctx);
    host.appendChild(panel);
    function draw(g, w, h, t, dt) {
      var p = panel.values, cFlow = ctx.color('--c-flow'), cIn = ctx.color('--c-3'), cOut = ctx.color('--c-2'), fg = ctx.color('--fg'),
        mu = ctx.color('--muted'), wire = ctx.color('--c-wire'), fill = ctx.color('--c-body-fill');
      var E = [p.E1, p.E2, 0], R = [p.R1, p.R2, p.R3];
      var gs = 0, gi = 0, k;
      for (k = 0; k < 3; k++) { gs += 1 / R[k]; gi += E[k] / R[k]; }
      var Vn = gi / gs, I = E.map(function (e, i) { return (e - Vn) / R[i]; });       // current INTO the node
      var N = [w * 0.52, h * 0.5], P = [[w * 0.12, h * 0.2], [w * 0.12, h * 0.8], [w * 0.9, h * 0.5]];
      g.clearRect(0, 0, w, h); g.font = '13px system-ui, sans-serif'; g.textBaseline = 'middle';
      g.fillStyle = fg; g.beginPath(); g.arc(N[0], N[1], 7, 0, 7); g.fill();   // node dot first: charges pass over it
      for (k = 0; k < 3; k++) {
        var x0 = P[k][0], y0 = P[k][1], x1 = N[0], y1 = N[1], ang = Math.atan2(y1 - y0, x1 - x0);
        g.strokeStyle = wire; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
        resBox(g, (x0 + x1) / 2, (y0 + y1) / 2, 44, 16, ang, wire, fill);
        if (Math.abs(I[k]) > 1e-9) phase[k] = (phase[k] + dt * (0.03 + 0.035 * TDC.util.flowRate(I[k]))) % 1;
        if (Math.abs(I[k]) > 1e-9) dotsAlong(g, x0, y0, x1, y1, phase[k], 7, I[k] > 0 ? 1 : -1, cFlow, 3);
        var ent = I[k] >= 0, ac = ent ? cIn : cOut, f = 0.8;
        var ax = x0 + (x1 - x0) * f, ay = y0 + (y1 - y0) * f;
        if (Math.abs(I[k]) > 1e-9) { if (ent) arrow(g, ax - (x1 - x0) * 0.1, ay - (y1 - y0) * 0.1, ax + (x1 - x0) * 0.03, ay + (y1 - y0) * 0.03, ac, 9, 3); else arrow(g, ax + (x1 - x0) * 0.03, ay + (y1 - y0) * 0.03, ax - (x1 - x0) * 0.1, ay - (y1 - y0) * 0.1, ac, 9, 3); }
        g.fillStyle = ac; g.textAlign = 'center';
        var lx = (x0 + x1) / 2, ly = (y0 + y1) / 2 + (k === 1 ? 26 : -44);   // both lines clear of the resistor box
        g.fillStyle = fg; g.fillText('R_' + (k + 1) + ' = ' + ctx.fmtSI(R[k], 'Ω', 3), lx, ly);
        g.fillStyle = ac; g.font = 'bold 13px system-ui, sans-serif';
        g.fillText('I_' + (k + 1) + ' = ' + ctx.fmtSI(I[k], 'A', 3), lx, ly + 16);
        g.font = '13px system-ui, sans-serif';
        g.fillStyle = fill; g.strokeStyle = wire; g.beginPath(); g.arc(x0, y0, 15, 0, 7); g.fill(); g.stroke();
        g.fillStyle = fg; g.fillText(k < 2 ? 'E_' + (k + 1) : '0 V', x0, y0);
        if (k < 2) { g.fillStyle = mu; g.fillText(ctx.fmtSI(E[k], 'V', 3), x0, y0 + (k === 0 ? -26 : 26)); }
      }
      g.textAlign = 'left';
      var inS = 0, outS = 0; I.forEach(function (v) { if (v > 0) inS += v; else outS -= v; });
      textLines(g, [
        ctx.tx({ en: 'entering the node: ', fi: 'solmuun tulevat: ' }) + ctx.fmtSI(inS, 'A', 4),
        ctx.tx({ en: 'leaving the node: ', fi: 'solmusta lähtevät: ' }) + ctx.fmtSI(outS, 'A', 4),
        'ΣI = ' + ctx.fmtSI(inS - outS, 'A', 3).replace(/^-0 /, '0 ') + '   (V_N = ' + ctx.fmtSI(Vn, 'V', 3) + ')'
      ], 10, h * 0.5 - 6, 18, fg);
      g.fillStyle = cIn; g.fillText('■ ' + ctx.tx({ en: 'entering', fi: 'tulee' }), w - 150, 14);
      g.fillStyle = cOut; g.fillText('■ ' + ctx.tx({ en: 'leaving', fi: 'lähtee' }), w - 80, 14);
    }
    cv = TDC.viz.canvas(host, { aspect: 0.62, draw: draw });
    ctx.onLang(function () { cv.redraw(); }); ctx.onTheme(function () { cv.redraw(); });
    return { destroy: cv.destroy };
  }

  /* ---------------------------------------------------------------- widget: KVL walker */
  function mountKvl(host, ctx) {
    var s = TDC.util.reducedMotion() ? 6 : 0, playing = !TDC.util.reducedMotion(), hold = 0, cv;
    var panel = TDC.viz.params([
      { id: 'E1', tex: 'E_1', min: 0, max: 24, step: 1, value: 12, unit: 'V' },
      { id: 'E2', tex: 'E_2', min: 0, max: 24, step: 1, value: 4, unit: 'V' },
      { id: 'R1', tex: 'R_1', min: 1, max: 20, step: 1, value: 5, unit: 'Ω' },
      { id: 'R2', tex: 'R_2', min: 1, max: 20, step: 1, value: 6, unit: 'Ω' },
      { id: 'R3', tex: 'R_3', min: 1, max: 20, step: 1, value: 8, unit: 'Ω' }
    ], function () { cv.redraw(); }, ctx);
    var bar = TDC.util.el('div', { class: 'btn-row', style: { margin: '.4rem 0' } });
    var playB = mkBtn('', function () { playing = !playing; if (playing && s >= 6) s = 0; label(); cv.redraw(); });
    var stepB = mkBtn('', function () { playing = false; s = (s >= 6) ? 1 : Math.floor(s) + 1; label(); cv.redraw(); });
    var rstB = mkBtn('', function () { s = 0; hold = 0; cv.redraw(); });
    bar.append(playB, stepB, rstB);
    function label() {
      playB.textContent = ctx.tx(playing ? { en: '⏸ Pause', fi: '⏸ Tauko' } : { en: '▶ Walk', fi: '▶ Kävele' });
      stepB.textContent = ctx.tx({ en: 'Next element ⏭', fi: 'Seuraava komponentti ⏭' });
      rstB.textContent = ctx.tx({ en: '↺ Restart', fi: '↺ Alusta' });
    }
    label(); ctx.onLang(label);
    host.append(panel, bar);
    var NAMES = ['E_2', 'R_2', 'R_3', 'R_1', 'E_1'];
    function draw(g, w, h, t, dt) {
      var p = panel.values, I = (p.E1 - p.E2) / (p.R1 + p.R2 + p.R3);
      var dV = [-p.E2, -I * p.R2, -I * p.R3, -I * p.R1, p.E1], cum = [0];
      dV.forEach(function (d, i) { cum.push(cum[i] + d); });
      if (playing) { if (s < 6) s = Math.min(6, s + dt * 0.7); else { hold += dt; if (hold > 2.2) { s = 0; hold = 0; } } }
      var fg = ctx.color('--fg'), mu = ctx.color('--muted'), wire = ctx.color('--c-wire'), fill = ctx.color('--c-body-fill'),
        up = ctx.color('--c-3'), dn = ctx.color('--c-2'), line = ctx.color('--line'), tok = ctx.color('--c-flow');
      g.clearRect(0, 0, w, h); g.font = '13px system-ui, sans-serif'; g.textBaseline = 'middle';
      var wide = w > 560, lw = wide ? w * 0.42 : w, lh = wide ? h : h * 0.5;
      var x0 = lw * 0.14, x1 = lw * 0.86, y0 = lh * 0.2, y1 = lh * 0.78, xm = (x0 + x1) / 2;
      // loop rectangle (counter-clockwise starting at bottom-left corner)
      g.strokeStyle = wire; g.lineWidth = 2; g.strokeRect(x0, y0, x1 - x0, y1 - y0);
      function box(cx, cy, vertical, name, isSrc) {
        if (isSrc) { cellSym(g, cx, cy, vertical ? -Math.PI / 2 : 0, wire, fill, 16); } else resBox(g, cx, cy, vertical ? 18 : 40, vertical ? 40 : 18, 0, wire, fill);
      }
      var bx = [(x0 + xm) / 2, (xm + x1) / 2, null, (xm + x1) / 2, (x0 + xm) / 2];
      // hide the loop wire only in the gap between each cell's plates (resistor boxes cover their own wire)
      g.fillStyle = fill; g.fillRect((x0 + xm) / 2 - 8, y1 - 12, 16, 24); g.fillRect((x0 + xm) / 2 - 8, y0 - 12, 16, 24);
      // E2 bottom-left (+ on the left), R2 bottom-right, R3 right, R1 top-right, E1 top-left (+ on the left)
      cellSym(g, (x0 + xm) / 2, y1, Math.PI, wire, fill, 16);   // rotated 180: long plate (+) on the left
      resBox(g, (xm + x1) / 2, y1, 44, 18, 0, wire, fill);
      resBox(g, x1, (y0 + y1) / 2, 18, 44, 0, wire, fill);
      resBox(g, (xm + x1) / 2, y0, 44, 18, 0, wire, fill);
      cellSym(g, (x0 + xm) / 2, y0, Math.PI, wire, fill, 16);
      g.textAlign = 'center'; g.fillStyle = fg;
      g.fillText('E_2', (x0 + xm) / 2, y1 + 22); g.fillText('R_2', (xm + x1) / 2, y1 + 22);
      g.fillText('R_3', x1 + 26, (y0 + y1) / 2); g.fillText('R_1', (xm + x1) / 2, y0 - 22); g.fillText('E_1', (x0 + xm) / 2, y0 - 22);
      g.fillStyle = mu; g.fillText('+', x0 + 10, y1 - 16); g.fillText('+', x0 + 10, y0 + 16);
      // token position
      function pos(sv) {
        var i = Math.min(5, Math.floor(sv)), f = sv - i; if (sv >= 6) { i = 5; f = 1; }
        if (i === 0) return [x0 + (xm - x0) * f, y1];
        if (i === 1) return [xm + (x1 - xm) * f, y1];
        if (i === 2) return [x1, y1 - (y1 - y0) * f];
        if (i === 3) return [x1 - (x1 - xm) * f, y0];
        if (i === 4) return [xm - (xm - x0) * f, y0];
        return [x0, y0 + (y1 - y0) * f];
      }
      var tp = pos(s);
      g.fillStyle = tok; g.strokeStyle = fg; g.lineWidth = 2; g.beginPath(); g.arc(tp[0], tp[1], 8, 0, 7); g.fill(); g.stroke();
      g.fillStyle = mu; g.textAlign = 'left';
      g.fillText(ctx.tx({ en: 'I = ' , fi: 'I = ' }) + ctx.fmtSI(I, 'A', 3) + ctx.tx({ en: '  (counter-clockwise)', fi: '  (vastapäivään)' }), 8, lh - 8);
      // potential profile (waterfall)
      var gx = wide ? lw + 10 : 10, gy = wide ? 24 : lh + 6, gw = w - gx - 10, gh = (wide ? h : h - lh) - (wide ? 70 : 40);
      var lo = Math.min.apply(null, cum.concat([0])), hi = Math.max.apply(null, cum.concat([0])); var pad = (hi - lo) * 0.15 + 0.5; lo -= pad; hi += pad;
      var sy = function (v) { return gy + gh - (v - lo) / (hi - lo) * gh; };
      g.strokeStyle = line; g.lineWidth = 1; g.beginPath(); g.moveTo(gx, sy(0)); g.lineTo(gx + gw, sy(0)); g.stroke();
      g.fillStyle = mu; g.textAlign = 'left'; g.fillText(ctx.tx({ en: 'potential change (V)', fi: 'potentiaalin muutos (V)' }), gx, gy - 12);
      var bw = gw / 5 * 0.62;
      var shownSum = 0;
      for (var i = 0; i < 5; i++) {
        var f = Math.max(0, Math.min(1, s - i)); if (f <= 0) break;
        var bxl = gx + gw / 5 * i + (gw / 5 - bw) / 2, a0 = cum[i], a1 = cum[i] + dV[i] * f;
        g.fillStyle = dV[i] >= 0 ? up : dn; g.globalAlpha = 0.85;
        g.fillRect(bxl, Math.min(sy(a0), sy(a1)), bw, Math.abs(sy(a1) - sy(a0)) || 1);
        g.globalAlpha = 1; shownSum = a1;
        if (i > 0) { g.strokeStyle = mu; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(bxl - (gw / 5 - bw), sy(a0)); g.lineTo(bxl, sy(a0)); g.stroke(); g.setLineDash([]); }
        if (f >= 1) { g.fillStyle = fg; g.textAlign = 'center'; g.fillText((dV[i] >= 0 ? '+' : '−') + ctx.fmtNum(Math.abs(dV[i]), 3), bxl + bw / 2, Math.min(sy(a0), sy(a1)) - 9); }
      }
      g.textAlign = 'center'; g.fillStyle = fg;
      for (i = 0; i < 5; i++) g.fillText(NAMES[i], gx + gw / 5 * (i + 0.5), gy + gh + 14);
      g.textAlign = 'left'; g.font = 'bold 14px system-ui, sans-serif';
      var done = s >= 6;
      g.fillStyle = done ? up : fg;
      g.fillText('ΣΔV = ' + ctx.fmtNum(Math.abs(shownSum) < 1e-9 ? 0 : shownSum, 3) + ' V' + (done ? '  ✓' : ''), gx, gy + gh + 36);
      g.font = '13px system-ui, sans-serif';
    }
    cv = TDC.viz.canvas(host, { aspect: 0.6, draw: draw, animate: true });
    ctx.onLang(function () { cv.redraw(); }); ctx.onTheme(function () { cv.redraw(); });
    return { destroy: cv.destroy };
  }

  /* ---------------------------------------------------------------- widget: matrix builder */
  function mountMatrix(host, ctx) {
    var el = TDC.util.el, C = ctx;
    var panel = TDC.viz.params([
      { id: 'e1', tex: 'ε_1', min: 0, max: 100, step: 1, value: 80, unit: 'V' },
      { id: 'e2', tex: 'ε_2', min: 0, max: 100, step: 1, value: 45, unit: 'V' },
      { id: 'r', tex: 'r', min: 0, max: 10, step: 0.5, value: 1, unit: 'Ω' }
    ], update, ctx);
    // schematic: three branches between node a (left) and node d (right); ids used for highlighting
    var svgHtml = '<svg viewBox="0 0 420 220" class="matrix-svg" role="img" aria-label="circuit" style="max-width:100%;height:auto;display:block">' +
      '<g fill="none" stroke="currentColor" stroke-width="2">' +
      '<path d="M30 30V190M390 30V190M30 30H150M270 30H390M30 110H80M200 110H230M30 190H70M250 190H280M350 190H390"/>' +
      '<path data-el="R30" d="M150 20h120v20H150z"/>' +
      '<path data-el="R40" d="M80 100h60v20H80z"/><path data-el="r2" d="M140 110h20"/><path data-el="r2" d="M160 100h40v20h-40z"/>' +
      '<path d="M230 110H300"/><path data-el="e2" d="M300 100v20M312 90v40"/><path d="M312 110H390"/>' +
      '<path data-el="e1" d="M70 190h10M80 180v20M92 170v40"/><path d="M92 190H110"/><path data-el="r1" d="M110 180h40v20h-40z"/><path d="M150 190H180"/><path data-el="R20" d="M180 180h60v20h-60z"/><path d="M240 190H390"/>' +
      '</g><g fill="currentColor" font-size="13" text-anchor="middle">' +
      '<text x="210" y="14">30 Ω</text><text x="110" y="94">40 Ω</text><text x="180" y="94">r</text><text x="306" y="84">ε₂</text>' +
      '<text x="85" y="170">ε₁</text><text x="130" y="174">r</text><text x="210" y="174">20 Ω</text>' +
      '<text x="20" y="108">a</text><text x="402" y="108">d</text>' +
      '<text x="210" y="62" opacity=".75">I₁ →</text><text x="352" y="104" opacity=".75">← I₃</text><text x="330" y="214" opacity=".75">I₂ →</text></g></svg>';
    var diagram = el('div', { class: 'matrix-diagram', html: svgHtml });
    var tbl = el('div', { class: 'matrix-box', style: { overflowX: 'auto' } });   // 6-column table: scroll on phones, not the page
    var note = el('p', { class: 'muted', style: { minHeight: '3em', margin: '.4rem 0' } });
    var res = el('div', { class: 'readout-list' });
    host.append(panel, el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '1rem', alignItems: 'start' } }, [diagram, el('div', {}, [tbl, note])]), res);
    var marks = diagram.querySelectorAll('[data-el]');
    var HEX = { R30: 1, R40: 1, r2: 1, e2: 1, e1: 1, r1: 1, R20: 1 };
    function hi(list) {
      marks.forEach(function (m) {
        var on = list && list.indexOf(m.getAttribute('data-el')) >= 0;
        m.style.stroke = on ? ctx.color('--c-2') : ''; m.style.strokeWidth = on ? '4' : '';
      });
    }
    var sel = null;
    // rows: label, cells [{txt, els, why}], rhs
    function rows() {
      var v = panel.values, r = v.r;
      return [
        { lab: { en: 'KCL at node a', fi: 'KCL solmussa a' }, els: [], c: [
          { n: 1, els: [], why: { en: 'I₁ leaves node a: coefficient +1.', fi: 'I₁ lähtee solmusta a: kerroin +1.' } },
          { n: 1, els: [], why: { en: 'I₂ leaves node a: coefficient +1.', fi: 'I₂ lähtee solmusta a: kerroin +1.' } },
          { n: -1, els: [], why: { en: 'I₃ enters node a: coefficient −1 (I₁ + I₂ − I₃ = 0).', fi: 'I₃ tulee solmuun a: kerroin −1 (I₁ + I₂ − I₃ = 0).' } }], b: 0, bw: { en: 'no source in a KCL equation', fi: 'KCL-yhtälössä ei ole lähdettä' }, bels: [] },
        { lab: { en: 'KVL loop d→a→h→d', fi: 'KVL silmukka d→a→h→d' }, els: ['R30', 'R40', 'r2', 'e2'], c: [
          { n: 30, els: ['R30'], why: { en: '30 Ω is in this loop and carries I₁.', fi: '30 Ω kuuluu silmukkaan ja siinä kulkee I₁.' } },
          { n: 0, els: [], why: { en: 'Branch 2 (ε₁ side) is not in this loop: coefficient 0.', fi: 'Haara 2 (ε₁:n puoli) ei kuulu silmukkaan: kerroin 0.' } },
          { n: 40 + r, els: ['R40', 'r2'], why: { en: 'I₃ passes 40 Ω and the internal resistance r of ε₂: 40 + r.', fi: 'I₃ kulkee 40 Ω:n vastuksen ja ε₂:n sisäisen resistanssin r kautta: 40 + r.' } }], b: v.e2, bw: { en: 'ε₂ drives the loop: right-hand side +ε₂.', fi: 'ε₂ ajaa silmukkaa: oikea puoli +ε₂.' }, bels: ['e2'] },
        { lab: { en: 'KVL loop d→f→a→h→d', fi: 'KVL silmukka d→f→a→h→d' }, els: ['R30', 'R20', 'r1', 'e1'], c: [
          { n: 30, els: ['R30'], why: { en: '30 Ω is in this loop and carries I₁.', fi: '30 Ω kuuluu silmukkaan ja siinä kulkee I₁.' } },
          { n: -(20 + r), els: ['R20', 'r1'], why: { en: 'I₂ passes 20 Ω and r, against the loop direction: −(20 + r).', fi: 'I₂ kulkee 20 Ω:n ja r:n kautta silmukan suuntaa vastaan: −(20 + r).' } },
          { n: 0, els: [], why: { en: 'Branch 3 is not in this loop: coefficient 0.', fi: 'Haara 3 ei kuulu silmukkaan: kerroin 0.' } }], b: -v.e1, bw: { en: 'ε₁ opposes the loop direction: right-hand side −ε₁.', fi: 'ε₁ vastustaa silmukan suuntaa: oikea puoli −ε₁.' }, bels: ['e1'] }
      ];
    }
    function update() {
      var R = rows(), A = R.map(function (rw) { return rw.c.map(function (c) { return c.n; }); }), b = R.map(function (rw) { return rw.b; });
      var x = solve3(A, b);
      tbl.innerHTML = '';
      var t = el('table', { class: 'matrix-table', style: { borderCollapse: 'collapse', margin: '0 auto' } });
      var head = el('tr', {}, ['', 'I₁', 'I₂', 'I₃', '|', 'b'].map(function (s) { return el('th', { style: { padding: '.2rem .5rem' }, text: s }); }));
      t.appendChild(head);
      R.forEach(function (rw, i) {
        var tr = el('tr');
        var lb = el('button', { type: 'button', class: 'btn btn-small btn-ghost', text: ctx.tx(rw.lab), onclick: function () { sel = { els: rw.els, why: rw.lab }; hi(rw.els); note.textContent = ctx.tx(rw.lab); }, onmouseenter: function () { hi(rw.els); }, onmouseleave: function () { hi(sel && sel.els); } });
        tr.appendChild(el('td', {}, lb));
        function cell(txt, els, why) {
          var bt = el('button', { type: 'button', class: 'btn btn-small', style: { minWidth: '3.2rem' }, text: ctx.fmtNum(txt, 4), onclick: function () { sel = { els: els }; hi(els); note.textContent = ctx.tx(why); }, onmouseenter: function () { hi(els); }, onmouseleave: function () { hi(sel && sel.els); }, onfocus: function () { hi(els); } });
          return el('td', { style: { padding: '.15rem', textAlign: 'center' } }, bt);
        }
        rw.c.forEach(function (c) { tr.appendChild(cell(c.n, c.els, c.why)); });
        tr.appendChild(el('td', { text: '|' }));
        tr.appendChild(cell(rw.b, rw.bels, rw.bw));
        t.appendChild(tr);
      });
      tbl.appendChild(t);
      if (!sel) note.textContent = ctx.tx({ en: 'Hover or click a coefficient to see which circuit element produced it.', fi: 'Vie hiiri tai napsauta kerrointa nähdäksesi, mikä piirin osa sen tuotti.' });
      res.innerHTML = '';
      ['I₁', 'I₂', 'I₃'].forEach(function (nm, k) {
        res.appendChild(el('div', { class: 'readout' }, [el('span', { text: nm }), el('b', { text: ' = ' + ctx.fmtSI(x[k], 'A', 4) + (x[k] < 0 ? '   ← ' + ctx.tx({ en: 'actual direction is opposite to the arrow', fi: 'todellinen suunta on nuolen vastainen' }) : '') })]));
      });
      res.appendChild(el('div', { class: 'readout' }, [el('span', { text: ctx.tx({ en: 'KCL check', fi: 'KCL-tarkistus' }) }), el('b', { text: ' : I₁ + I₂ − I₃ = ' + ctx.fmtNum(Math.abs(x[0] + x[1] - x[2]) < 1e-9 ? 0 : x[0] + x[1] - x[2], 3) + ' A' })]));
    }
    ctx.onLang(update); update();
    return { destroy: function () { } };
  }

  /* ---------------------------------------------------------------- widget: superposition */
  function mountSuper(host, ctx) {
    var mode = 'e1', a = 0, cv;
    var panel = TDC.viz.params([
      { id: 'E1', tex: 'E_1', min: 0, max: 12, step: 0.5, value: 4, unit: 'V' },
      { id: 'E2', tex: 'E_2', min: 0, max: 12, step: 0.5, value: 2, unit: 'V' },
      { id: 'R', tex: 'R', min: 1, max: 10, step: 0.5, value: 4, unit: 'Ω' }
    ], function () { a = 0; cv.redraw(); }, ctx);
    var r1 = 2, r2 = 1;
    var row = tabs(ctx, [{ id: 'e1', label: { en: 'Only E₁ (E₂ → r₂)', fi: 'Vain E₁ (E₂ → r₂)' } }, { id: 'e2', label: { en: 'Only E₂ (E₁ → r₁)', fi: 'Vain E₂ (E₁ → r₁)' } }, { id: 'sum', label: { en: 'Add them', fi: 'Summaa' } }], mode, function (m) { mode = m; a = 0; cv.redraw(); });
    host.append(panel, row);
    function calc(p) {
      var Rp = p.R * r2 / (p.R + r2), I1 = p.E1 / (r1 + Rp);
      var c1 = { i1: I1, iR: I1 * r2 / (p.R + r2), i2: -I1 * p.R / (p.R + r2), Req: r1 + Rp };
      var Rq = p.R * r1 / (p.R + r1), I2 = p.E2 / (r2 + Rq);
      var c2 = { i2: I2, iR: I2 * r1 / (p.R + r1), i1: -I2 * p.R / (p.R + r1), Req: r2 + Rq };
      return [c1, c2];
    }
    function draw(g, w, h, t, dt) {
      var p = panel.values, cs = calc(p), c1 = cs[0], c2 = cs[1];
      var fg = ctx.color('--fg'), mu = ctx.color('--muted'), line = ctx.color('--line'), k1 = ctx.color('--c-1'), k2 = ctx.color('--c-2'), k3 = ctx.color('--c-3');
      if (mode === 'sum' && a < 1) a = Math.min(1, a + dt * 0.8); if (TDC.util.reducedMotion()) a = 1;
      g.clearRect(0, 0, w, h); g.font = '13px system-ui, sans-serif'; g.textBaseline = 'middle';
      var keys = ['i1', 'iR', 'i2'], names = [ctx.tx({ en: 'E₁ branch', fi: 'E₁-haara' }), ctx.tx({ en: 'through R', fi: 'R:n läpi' }), ctx.tx({ en: 'E₂ branch', fi: 'E₂-haara' })];
      var tot = keys.map(function (k) { return c1[k] + c2[k]; });
      var mx = 0.3; keys.forEach(function (k, i) { mx = Math.max(mx, Math.abs(c1[k]), Math.abs(c2[k]), Math.abs(tot[i]), Math.abs(c1[k]) + Math.abs(c2[k])); });
      var top = 30, bot = h - 62, zero = (top + bot) / 2, sc = (bot - top) / 2 / (mx * 1.12), gw = w / 3;
      g.strokeStyle = line; g.beginPath(); g.moveTo(8, zero); g.lineTo(w - 8, zero); g.stroke();
      g.fillStyle = mu; g.textAlign = 'left'; g.fillText(ctx.tx({ en: 'branch current (A), reference arrows as in the figure', fi: 'haaravirta (A), vertailusuunnat kuvan mukaan' }), 8, 12);
      var bw = Math.min(30, gw / 5.5);
      keys.forEach(function (k, i) {
        var cx = gw * (i + 0.5), v1 = c1[k], v2 = c2[k], T = tot[i];
        function bar(x, y0, y1, col, lbl, outline) {
          var yy0 = zero - y0 * sc, yy1 = zero - y1 * sc;
          g.globalAlpha = outline ? 0.25 : 0.85; g.fillStyle = col; g.fillRect(x - bw / 2, Math.min(yy0, yy1), bw, Math.max(1, Math.abs(yy1 - yy0))); g.globalAlpha = 1;
          if (outline) { g.strokeStyle = col; g.lineWidth = 2; g.strokeRect(x - bw / 2, Math.min(yy0, yy1), bw, Math.max(1, Math.abs(yy1 - yy0))); g.lineWidth = 1; }
          g.fillStyle = fg; g.textAlign = 'center'; g.fillText(lbl, x, (y1 >= y0 ? Math.min(yy0, yy1) - 10 : Math.max(yy0, yy1) + 10));
        }
        if (mode === 'e1') bar(cx, 0, v1, k1, ctx.fmtNum(v1, 3));
        else if (mode === 'e2') bar(cx, 0, v2, k2, ctx.fmtNum(v2, 3));
        else {
          bar(cx - bw * 1.1, 0, v1, k1, ctx.fmtNum(v1, 3));
          bar(cx - bw * 1.1 + bw * 1.1 * a, v1 * (1 - a), v1 * (1 - a) + v2, k2, ctx.fmtNum(v2, 3));
          if (a >= 1) bar(cx + bw * 1.1, 0, T, k3, ctx.fmtNum(T, 3), true);
        }
        g.fillStyle = mu; g.textAlign = 'center'; g.fillText(names[i], cx, bot + 24);
        if (k === 'i2' && T < -1e-6 && (mode === 'sum' && a >= 1)) { g.fillStyle = k3; g.fillText(ctx.tx({ en: 'E₂ is being charged', fi: 'E₂ latautuu' }), cx, bot + 42); }
      });
      var info = mode === 'e1' ? ctx.tx({ en: 'E₂ replaced by r₂: R_eq = r₁ + r₂∥R = ', fi: 'E₂ korvattu r₂:lla: R_eq = r₁ + r₂∥R = ' }) + ctx.fmtSI(c1.Req, 'Ω', 3) + ',  I = ' + ctx.fmtSI(c1.i1, 'A', 3)
        : mode === 'e2' ? ctx.tx({ en: 'E₁ replaced by r₁: R_eq = r₂ + r₁∥R = ', fi: 'E₁ korvattu r₁:llä: R_eq = r₂ + r₁∥R = ' }) + ctx.fmtSI(c2.Req, 'Ω', 3) + ',  I = ' + ctx.fmtSI(c2.i2, 'A', 3)
        : ctx.tx({ en: 'blue + orange = total (green outline)', fi: 'sininen + oranssi = kokonaisvirta (vihreä reunus)' });
      g.fillStyle = fg; g.textAlign = 'left'; g.fillText(info, 8, h - 10);
    }
    cv = TDC.viz.canvas(host, { aspect: 0.62, draw: draw });
    ctx.onLang(function () { cv.redraw(); }); ctx.onTheme(function () { cv.redraw(); });
    return { destroy: cv.destroy };
  }

  /* ---------------------------------------------------------------- widget: electrochemical cell */
  var SERIES = [['Lithium', 'litium', -3.04], ['Potassium', 'kalium', -2.92], ['Sodium', 'natrium', -2.71], ['Magnesium', 'magnesium', -2.37], ['Aluminum', 'alumiini', -1.67],
    ['Zinc', 'sinkki', -0.76], ['Chromium', 'kromi', -0.74], ['Tungsten', 'volframi', -0.58], ['Iron', 'rauta', -0.44], ['Cobalt', 'koboltti', -0.28], ['Nickel', 'nikkeli', -0.24],
    ['Tin', 'tina', -0.14], ['Lead', 'lyijy', -0.13], ['Hydrogen', 'vety', 0.00], ['Antimony', 'antimoni', 0.10], ['Copper', 'kupari', 0.34], ['Silver', 'hopea', 0.80],
    ['Gold', 'kulta', 0.80], ['Mercury', 'elohopea', 0.80], ['Chlorine', 'kloori', 1.36], ['Fluorine', 'fluori', 2.87]];
  function mountCell(host, ctx) {
    var el = TDC.util.el, iA = 5, iB = 15, cv;
    function sel(init, onc) {
      var s = el('select', { class: 'input', 'aria-label': 'element', onchange: function () { onc(+s.value); } });
      function fillOpts() { var cur = s.value; s.innerHTML = ''; SERIES.forEach(function (e, i) { s.appendChild(el('option', { value: i, text: (ctx.tx({ en: e[0], fi: e[1] })) + '  (' + (e[2] > 0 ? '+' : '') + e[2].toFixed(2) + ' V)' })); }); s.value = cur || init; }
      fillOpts(); s.value = init; ctx.onLang(fillOpts); return s;
    }
    var sa = sel(iA, function (v) { iA = v; cv.redraw(); }), sb = sel(iB, function (v) { iB = v; cv.redraw(); });
    host.appendChild(el('div', { class: 'btn-row', style: { alignItems: 'center' } }, [el('span', { text: ctx.tx({ en: 'Left electrode:', fi: 'Vasen elektrodi:' }) }), sa, el('span', { text: ctx.tx({ en: 'Right electrode:', fi: 'Oikea elektrodi:' }) }), sb]));
    var ph = 0;
    function draw(g, w, h, t, dt) {
      var A = SERIES[iA], B = SERIES[iB], anodeLeft = A[2] <= B[2], V = Math.abs(A[2] - B[2]);
      var fg = ctx.color('--fg'), mu = ctx.color('--muted'), wire = ctx.color('--c-wire'), el1 = ctx.color('--c-electron'), c1 = ctx.color('--c-2'), c2 = ctx.color('--c-1'), fill = ctx.color('--c-body-fill');
      g.clearRect(0, 0, w, h); g.font = '13px system-ui, sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'center';
      var bw = w * 0.3, bh = h * 0.42, by = h * 0.5, xl = w * 0.08, xr = w * 0.62;
      [[xl, A, anodeLeft], [xr, B, !anodeLeft]].forEach(function (b, i) {
        var isAnode = b[2], x = b[0];
        g.fillStyle = isAnode ? 'rgba(208,87,26,.14)' : 'rgba(31,95,191,.14)'; g.fillRect(x, by, bw, bh);
        g.strokeStyle = wire; g.lineWidth = 2; g.strokeRect(x, by, bw, bh);
        g.fillStyle = isAnode ? c1 : c2; g.fillRect(x + bw / 2 - 9, by - h * 0.28, 18, h * 0.28 + bh * 0.7);
        g.fillStyle = fg; g.fillText(ctx.tx({ en: b[1][0], fi: b[1][1] }) + (V > 0 ? (isAnode ? ' (−, ' + ctx.tx({ en: 'anode', fi: 'anodi' }) + ')' : ' (+, ' + ctx.tx({ en: 'cathode', fi: 'katodi' }) + ')') : ''), x + bw / 2, by + bh + 16);
        g.fillStyle = mu; g.fillText((b[1][2] > 0 ? '+' : '') + b[1][2].toFixed(2) + ' V', x + bw / 2, by + bh + 34);
      });
      // salt bridge
      g.strokeStyle = mu; g.lineWidth = 6; g.beginPath(); g.moveTo(xl + bw * 0.8, by + bh * 0.2); g.lineTo(xl + bw * 0.8, by - 12); g.lineTo(xr + bw * 0.2, by - 12); g.lineTo(xr + bw * 0.2, by + bh * 0.2); g.stroke();
      // wire with electrons from anode to cathode
      var xa = anodeLeft ? xl + bw / 2 : xr + bw / 2, xc = anodeLeft ? xr + bw / 2 : xl + bw / 2, yw = by - h * 0.28 - 6;
      g.strokeStyle = wire; g.lineWidth = 2; g.beginPath(); g.moveTo(xa, yw + 6); g.lineTo(xa, yw); g.lineTo(xc, yw); g.lineTo(xc, yw + 6); g.stroke();
      if (V > 0) {
        ph = (ph + dt * (0.04 + 0.07 * V)) % 1;   // larger cell voltage, faster electrons
        dotsAlong(g, xa, yw, xc, yw, ph, 8, 1, el1, 3.5);
        g.fillStyle = fill; g.strokeStyle = wire; g.lineWidth = 2; var mx = (xa + xc) / 2; g.beginPath(); g.arc(mx, yw, 20, 0, 7); g.fill(); g.stroke();
        g.fillStyle = fg; g.font = 'bold 13px system-ui, sans-serif'; g.fillText(V.toFixed(2) + ' V', mx, yw); g.font = '13px system-ui, sans-serif';
        g.fillStyle = el1; g.fillText(anodeLeft ? 'e⁻ →' : '← e⁻', mx, yw - 34);   // electrons run anode → cathode
      }
      g.fillStyle = fg; g.textAlign = 'left';
      g.fillText(V > 0 ? 'V = V(' + ctx.tx({ en: 'cathode', fi: 'katodi' }) + ') − V(' + ctx.tx({ en: 'anode', fi: 'anodi' }) + ') = ' + (anodeLeft ? B[2] : A[2]).toFixed(2) + ' − (' + (anodeLeft ? A[2] : B[2]).toFixed(2) + ') = ' + V.toFixed(2) + ' V' : ctx.tx({ en: 'Same potential: no voltage, no reaction.', fi: 'Sama potentiaali: ei jännitettä eikä reaktiota.' }), 8, 14);
    }
    cv = TDC.viz.canvas(host, { aspect: 0.62, draw: draw });
    ctx.onLang(function () { cv.redraw(); }); ctx.onTheme(function () { cv.redraw(); });
    return { destroy: cv.destroy };
  }

  /* ---------------------------------------------------------------- widget: sources in series / parallel */
  function mountBattery(host, ctx) {
    var mode = 'series', cv, ph = [0, 0];
    var panel = TDC.viz.params([
      { id: 'n', tex: 'n', min: 1, max: 5, step: 1, value: 3, unit: '' },
      { id: 'E', tex: 'E_n', min: 0.5, max: 12, step: 0.1, value: 1.5, unit: 'V' },
      { id: 'rn', tex: 'r_n', min: 0.05, max: 2, step: 0.05, value: 0.6, unit: 'Ω' },
      { id: 'R', tex: 'R', min: 0.2, max: 20, step: 0.1, value: 1.8, unit: 'Ω' }
    ], function () { cv.redraw(); }, ctx);
    var row = tabs(ctx, [{ id: 'series', label: { en: 'In series', fi: 'Sarjaan' } }, { id: 'parallel', label: { en: 'In parallel', fi: 'Rinnan' } }], mode, function (m) { mode = m; cv.redraw(); });
    host.append(panel, row);
    function draw(g, w, h, t, dt) {
      var p = panel.values, n = p.n, ser = mode === 'series';
      var E = ser ? n * p.E : p.E, r = ser ? n * p.rn : p.rn / n, I = E / (r + p.R), Ic = ser ? I : I / n, V = I * p.R;
      var fg = ctx.color('--fg'), mu = ctx.color('--muted'), wire = ctx.color('--c-wire'), fl = ctx.color('--c-flow'), fill = ctx.color('--c-body-fill');
      g.clearRect(0, 0, w, h); g.font = '13px system-ui, sans-serif'; g.textBaseline = 'middle';
      var yt = h * 0.2, yb = h * 0.72, xR = w * 0.82, xL = ser ? w * 0.2 : w * 0.1, xs = ser ? [xL] : [], k;
      if (!ser) { var x1 = w * 0.1, x2 = w * 0.52; for (k = 0; k < n; k++) xs.push(n === 1 ? (x1 + x2) / 2 : x1 + (x2 - x1) * k / (n - 1)); }
      var xRight = ser ? xL : xs[xs.length - 1];
      g.strokeStyle = wire; g.lineWidth = 2;
      g.beginPath(); g.moveTo(xs[0], yt); g.lineTo(xR, yt); g.lineTo(xR, yt + (yb - yt) * 0.3); g.moveTo(xR, yt + (yb - yt) * 0.7); g.lineTo(xR, yb); g.lineTo(xs[0], yb); g.stroke();
      resBox(g, xR, (yt + yb) / 2, 18, 44, 0, wire, fill);
      g.fillStyle = fg; g.textAlign = 'left'; g.fillText('R = ' + ctx.fmtSI(p.R, 'Ω', 3), xR + 16, (yt + yb) / 2);
      var speed = 0.03 + 0.035 * TDC.util.flowRate(I), speedC = 0.03 + 0.035 * TDC.util.flowRate(Ic);
      ph[0] = (ph[0] + dt * speed) % 1; ph[1] = (ph[1] + dt * speedC) % 1;
      if (ser) {
        var ch = (yb - yt) / n;
        g.beginPath(); g.moveTo(xL, yt); g.lineTo(xL, yb); g.stroke();
        for (k = 0; k < n; k++) { var cy = yb - ch * (k + 0.5); g.fillStyle = fill; g.fillRect(xL - 14, cy - 12, 28, 24); cellSym(g, xL, cy, -Math.PI / 2, wire, fill, 14); g.fillStyle = mu; g.textAlign = 'right'; g.fillText(ctx.fmtSI(p.E, 'V', 2), xL - 18, cy - 4); g.fillText(ctx.fmtSI(p.rn, 'Ω', 2), xL - 18, cy + 11); }
        dotsAlong(g, xL, yb, xL, yt, ph[0], 6, 1, fl, 3);
      } else {
        g.strokeStyle = wire; g.beginPath(); g.moveTo(xs[0], yt); g.lineTo(xs[xs.length - 1], yt); g.moveTo(xs[0], yb); g.lineTo(xs[xs.length - 1], yb); g.stroke();   // bus wires first: charges stay on top
        for (k = 0; k < n; k++) {
          g.strokeStyle = wire; g.beginPath(); g.moveTo(xs[k], yt); g.lineTo(xs[k], yb); g.stroke();
          var cy2 = (yt + yb) / 2; g.fillStyle = fill; g.fillRect(xs[k] - 14, cy2 - 12, 28, 24); cellSym(g, xs[k], cy2, -Math.PI / 2, wire, fill, 14);
          dotsAlong(g, xs[k], yb, xs[k], yt, ph[1], 3, 1, fl, 3);
        }
      }
      dotsAlong(g, xRight, yt, xR, yt, ph[0], 4, 1, fl, 3);
      dotsAlong(g, xR, yt, xR, yb, ph[0], 4, 1, fl, 3);
      dotsAlong(g, xR, yb, xRight, yb, ph[0], 4, 1, fl, 3);
      g.fillStyle = fg; g.textAlign = 'left';
      var L = [
        ctx.tx({ en: 'Battery: E = ', fi: 'Paristo: E = ' }) + ctx.fmtSI(E, 'V', 3) + ',  r = ' + ctx.fmtSI(r, 'Ω', 3),
        ctx.tx({ en: 'Load current I = ', fi: 'Kuormavirta I = ' }) + ctx.fmtSI(I, 'A', 3) + ',  V = ' + ctx.fmtSI(V, 'V', 3),
        ctx.tx({ en: 'Current through ONE cell = ', fi: 'Yhden kennon virta = ' }) + ctx.fmtSI(Ic, 'A', 3)
      ];
      textLines(g, L, 8, h - 54, 18, fg);
    }
    cv = TDC.viz.canvas(host, { aspect: 0.62, draw: draw });
    ctx.onLang(function () { cv.redraw(); }); ctx.onTheme(function () { cv.redraw(); });
    return { destroy: cv.destroy };
  }

  function W(fn) { return { mount: fn }; }

  /* ---------------------------------------------------------------- small authoring helpers */
  function T(en, fi) { return { en: en, fi: fi }; }
  function fm(v, d) { return TDC.util.fmtNum(v, d || 3); }
  function svgFig(w, h, inner) {
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" style="max-width:' + w + 'px;width:100%;height:auto" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" font-family="inherit">' + inner + '</svg>';
  }
  function txt(x, y, s, anchor, size) { return '<text x="' + x + '" y="' + y + '" fill="currentColor" stroke="none" font-size="' + (size || 14) + '" text-anchor="' + (anchor || 'middle') + '">' + s + '</text>'; }
  var ARROWHEAD = function (x, y, dir) { var d = { u: 'M-5 7L0 0L5 7', d: 'M-5 -7L0 0L5 -7', r: 'M-7 -5L0 0L-7 5', l: 'M7 -5L0 0L7 5' }[dir]; return '<path transform="translate(' + x + ' ' + y + ')" d="' + d + '"/>'; };

  var FIG_VSRC = svgFig(300, 150,
    '<rect x="20" y="8" width="170" height="134" stroke-dasharray="5 4" opacity=".6"/>' +
    '<circle cx="70" cy="75" r="20"/><path d="M70 55V30H100M140 30H230M70 95V120H230"/><rect x="100" y="22" width="40" height="16"/>' +
    '<path d="M70 85V65M63 72L70 64L77 72"/>' +
    '<circle cx="230" cy="30" r="3" fill="currentColor"/><circle cx="230" cy="120" r="3" fill="currentColor"/>' +
    '<path d="M262 36V114"/>' + ARROWHEAD(262, 114, 'd') +
    txt(36, 79, 'ε', 'end', 16) + txt(120, 54, 'r') + txt(242, 24, '+', 'start') + txt(242, 134, '−', 'start') + txt(276, 79, 'V', 'start') + txt(160, 22, 'I →', 'start', 13));
  var FIG_CSRC = svgFig(300, 150,
    '<rect x="20" y="8" width="170" height="134" stroke-dasharray="5 4" opacity=".6"/>' +
    '<circle cx="60" cy="75" r="20"/><path d="M60 55V30H230M60 95V120H230"/><path d="M60 88V62M53 70L60 62L67 70"/>' +
    '<path d="M130 30V55M130 95V120"/><rect x="122" y="55" width="16" height="40"/>' +
    '<circle cx="230" cy="30" r="3" fill="currentColor"/><circle cx="230" cy="120" r="3" fill="currentColor"/><path d="M262 36V114"/>' + ARROWHEAD(262, 114, 'd') +
    txt(32, 79, 'I_s', 'end') + txt(148, 79, 'r', 'start') + txt(242, 24, '+', 'start') + txt(242, 134, '−', 'start') + txt(276, 79, 'V', 'start') + txt(196, 22, 'I →', 'start', 13));
  var FIG_SYMBOLS = function (battery) { return svgFig(560, 150,
    '<g transform="translate(20 0)"><path d="M0 70H34M60 70H90"/><path d="M34 50V90" stroke-width="3"/><path d="M48 38V102"/><path d="M48 70H60"/></g>' + txt(65, 125, battery, 'middle', 12) +
    '<g transform="translate(150 0)"><path d="M0 70H30M80 70H110"/><circle cx="55" cy="70" r="25"/><path d="M42 70H66M58 62L66 70L58 78"/></g>' + txt(205, 125, 'E, ε', 'middle', 12) +
    '<g transform="translate(300 0)"><path d="M0 70H30M80 70H110"/><circle cx="55" cy="70" r="25"/><path d="M42 70H50M46 66V74M60 70H68" stroke-width="1.5"/></g>' + txt(355, 125, 'E (+/−)', 'middle', 12) +
    '<g transform="translate(450 0)"><path d="M0 70H30M80 70H110"/><circle cx="55" cy="70" r="25"/><path d="M55 83V57M48 64L55 56L62 64"/></g>' + txt(505, 125, 'J, I_s', 'middle', 12)); };

  /* ---------------------------------------------------------------- circuit configs */
  var CIRC_BATT = {
    size: [8, 4],
    parts: [
      { id: 'U1', type: 'V', a: [0, 4], b: [0, 0], value: 6, label: 'ε', editable: { min: 0, max: 12, step: 0.5 } },
      { id: 'r1', type: 'R', a: [1, 0], b: [4, 0], value: 2, label: 'r', editable: { min: 0.5, max: 6, step: 0.5 } },
      { id: 'RL', type: 'R', a: [8, 0], b: [8, 4], value: 4, label: 'R', editable: { min: 0.5, max: 30, step: 0.5 } },
      { id: 'V1', type: 'voltmeter', a: [6, 0], b: [6, 4] },
      { id: 'A1', type: 'ammeter', a: [3, 4], b: [5, 4] }
    ],
    wires: [[[0, 0], [1, 0]], [[4, 0], [8, 0]], [[8, 4], [5, 4]], [[3, 4], [0, 4]]],
    labels: [{ at: [6, 0], text: 'a' }, { at: [6, 4], text: 'b' }],
    tools: [], show: { values: true, flow: true }, table: true
  };
  var CIRC_LOADS = {
    size: [10, 4],
    parts: [
      { id: 'U1', type: 'V', a: [0, 4], b: [0, 0], value: 6, label: 'ε' },
      { id: 'r1', type: 'R', a: [1, 0], b: [4, 0], value: 2, label: 'r' },
      { id: 'S1', type: 'switch', a: [4, 0], b: [6, 0], closed: false },
      { id: 'V1', type: 'voltmeter', a: [4, 0], b: [4, 4] },
      { id: 'RL', type: 'R', a: [8, 0], b: [8, 4], value: 4, label: 'R', editable: { min: 1, max: 30, step: 1 } },
      { id: 'S2', type: 'switch', a: [10, 0], b: [10, 4], closed: false }
    ],
    wires: [[[0, 0], [1, 0]], [[6, 0], [10, 0]], [[10, 4], [0, 4]]],
    tools: [], show: { values: true, flow: true }, table: true
  };
  var CIRC_SHORT = {
    size: [8, 4],
    parts: [
      { id: 'U1', type: 'V', a: [0, 4], b: [0, 0], value: 12, label: 'E', editable: { min: 0, max: 24, step: 1 } },
      { id: 'R1', type: 'R', a: [1, 0], b: [4, 0], value: 100, label: 'R1', editable: { min: 10, max: 1000 } },
      { id: 'R2', type: 'R', a: [5, 0], b: [8, 0], value: 200, label: 'R2', editable: { min: 10, max: 1000 } },
      { id: 'L1', type: 'lamp', a: [8, 1], b: [8, 4], value: 60, rated: 0.3 },
      { id: 'A1', type: 'ammeter', a: [3, 4], b: [5, 4] }
    ],
    wires: [[[0, 0], [1, 0]], [[4, 0], [5, 0]], [[8, 0], [8, 1]], [[8, 4], [5, 4]], [[3, 4], [0, 4]]],
    labels: [{ at: [5, 0], text: 'A' }, { at: [8, 0], text: 'B', dx: 8 }],
    tools: ['wire', 'cut'], table: true
  };
  var CIRC_KVL = function (editable, extra) {
    var c = {
      size: [6, 4],
      parts: [
        { id: 'E1', type: 'V', a: [3, 0], b: [0, 0], value: 12, label: 'E1', editable: editable ? { min: 0, max: 24, step: 1 } : false },
        { id: 'R1', type: 'R', a: [3, 0], b: [6, 0], value: 5, label: 'R1', editable: editable ? { min: 1, max: 20, step: 1 } : false },
        { id: 'R3', type: 'R', a: [6, 0], b: [6, 4], value: 8, label: 'R3', editable: editable ? { min: 1, max: 20, step: 1 } : false },
        { id: 'R2', type: 'R', a: [3, 4], b: [6, 4], value: 6, label: 'R2', editable: editable ? { min: 1, max: 20, step: 1 } : false },
        { id: 'E2', type: 'V', a: [3, 4], b: [0, 4], value: 4, label: 'E2', editable: editable ? { min: 0, max: 24, step: 1 } : false }
      ],
      wires: [[[0, 0], [0, 4]]],
      ground: [0, 4], tools: [], show: { values: true, flow: true, potentials: false }, table: true
    };
    return c;
  };
  var CIRC_MATRIX = {
    size: [10, 6],
    parts: [
      { id: 'R30', type: 'R', a: [3, 0], b: [6, 0], value: 30, label: '30 Ω' },
      { id: 'R40', type: 'R', a: [1, 3], b: [4, 3], value: 40, label: '40 Ω' },
      { id: 'r2', type: 'R', a: [4, 3], b: [6, 3], value: 1, label: 'r' },
      { id: 'e2', type: 'V', a: [9, 3], b: [6, 3], value: 45, label: 'ε2' },
      { id: 'e1', type: 'V', a: [1, 6], b: [4, 6], value: 80, label: 'ε1' },
      { id: 'r1', type: 'R', a: [4, 6], b: [6, 6], value: 1, label: 'r' },
      { id: 'R20', type: 'R', a: [6, 6], b: [9, 6], value: 20, label: '20 Ω' }
    ],
    wires: [[[0, 0], [3, 0]], [[6, 0], [10, 0]], [[0, 3], [1, 3]], [[9, 3], [10, 3]], [[0, 6], [1, 6]], [[9, 6], [10, 6]], [[0, 0], [0, 6]], [[10, 0], [10, 6]]],
    labels: [{ at: [0, 3], text: 'a', dx: -10 }, { at: [10, 3], text: 'd', dx: 10 }],
    ground: [10, 6], tools: [], show: { values: true, flow: true }, table: true
  };
  var CIRC_SUPER = function (task) {
    var c = {
      size: [10, 6],
      parts: [
        { id: 'r1', type: 'R', a: [0, 0], b: [0, 3], value: 2, label: 'r1' },
        { id: 'E1', type: 'V', a: [0, 6], b: [0, 3], value: 4, label: 'E1' },
        { id: 'R', type: 'R', a: [5, 0], b: [5, 6], value: 4, label: 'R', editable: task ? { min: 0.5, max: 10, step: 0.5 } : { min: 1, max: 10, step: 0.5 } }
      ],
      wires: [[[0, 0], [10, 0]], [[0, 6], [10, 6]]],
      labels: [{ at: [0, 0], text: 'T', dy: -10 }, { at: [0, 6], text: 'B', dy: 14 }],
      ground: [0, 6], show: { values: true, flow: true }, table: true
    };
    if (task) {
      c.parts.push({ id: 'r2', type: 'R', a: [10, 0], b: [10, 2], value: 1, label: 'r2' });
      c.parts.push({ id: 'A2', type: 'ammeter', a: [10, 2], b: [10, 4] });
      c.parts.push({ id: 'E2', type: 'V', a: [10, 6], b: [10, 4], value: 2, label: 'E2' });
      c.tools = [];
      c.parts[2].labelSide = 'other';
    } else {
      c.parts.push({ id: 'r2', type: 'R', a: [10, 0], b: [10, 3], value: 1, label: 'r2' });
      c.parts.push({ id: 'E2', type: 'V', a: [10, 6], b: [10, 3], value: 2, label: 'E2' });
      c.tools = ['wire', 'cut'];
    }
    return c;
  };

  /* ---------------------------------------------------------------- more figures */
  function figBranches(l1, lr, l2) {
    function cell(x, y, lab) { return '<circle cx="' + x + '" cy="' + y + '" r="14"/><path d="M' + x + ' ' + (y + 8) + 'V' + (y - 8) + 'M' + (x - 5) + ' ' + (y - 3) + 'L' + x + ' ' + (y - 9) + 'L' + (x + 5) + ' ' + (y - 3) + '"/>' + txt(x - 20, y + 4, lab, 'end', 13) + txt(x + 18, y - 12, '+', 'start', 12); }
    function res(x, y, lab, side) { return '<rect x="' + (x - 8) + '" y="' + (y - 20) + '" width="16" height="40"/>' + txt(x + side, y + 4, lab, side < 0 ? 'end' : 'start', 13); }
    return svgFig(360, 210,
      '<path d="M50 30H310M50 180H310"/>' +
      '<path d="M60 30V56M60 84V130M60 170V180"/>' + cell(60, 70, l1[0]) + res(60, 150, l1[1], -14) +
      '<path d="M185 30V80M185 120V180"/>' + res(185, 100, lr, 14) +
      '<path d="M310 30V56M310 84V130M310 170V180"/>' + cell(310, 70, l2[0]) + res(310, 150, l2[1], 14) +
      txt(30, 34, 'T', 'middle') + txt(30, 184, 'B', 'middle') +
      '<circle cx="60" cy="30" r="3" fill="currentColor"/><circle cx="185" cy="30" r="3" fill="currentColor"/><circle cx="310" cy="30" r="3" fill="currentColor"/>' +
      '<circle cx="60" cy="180" r="3" fill="currentColor"/><circle cx="185" cy="180" r="3" fill="currentColor"/><circle cx="310" cy="180" r="3" fill="currentColor"/>');
  }
  var FIG_JUNCTION = svgFig(300, 170,
    '<circle cx="150" cy="85" r="5" fill="currentColor"/><path d="M30 85H140M55 25L146 80M55 145L146 90M160 85H270"/>' +
    ARROWHEAD(100, 85, 'r') + '<path d="M100 85" />' + txt(60, 78, 'I₁', 'middle') + txt(70, 40, 'I₂', 'middle') + txt(70, 140, 'I₃', 'middle') + txt(235, 76, 'I₄', 'middle') + ARROWHEAD(225, 85, 'r') +
    '<path transform="translate(95 58) rotate(32)" d="M-7 -5L0 0L-7 5"/><path transform="translate(95 112) rotate(-32)" d="M-7 -5L0 0L-7 5"/>');
  var FIG_NODES = function (known) {      // p17 junction example: nodes a, b, c
    return svgFig(420, 200,
      '<path d="M60 120H100M140 120H240M280 120H330M270 160V130M120 120V50H300V120M300 120V50" opacity="0"/>' +
      '<path d="M30 120H100"/><circle cx="110" cy="120" r="5" fill="currentColor"/><path d="M115 120H200"/><circle cx="210" cy="120" r="5" fill="currentColor"/><path d="M215 120H300"/><circle cx="310" cy="120" r="5" fill="currentColor"/><path d="M315 120H390M320 112L385 60"/>' +
      '<path d="M110 115V60H305V115"/><path d="M210 185V125"/>' +
      ARROWHEAD(70, 120, 'r') + ARROWHEAD(160, 120, 'r') + ARROWHEAD(260, 120, 'r') + ARROWHEAD(210, 150, 'u') + ARROWHEAD(207, 60, 'r') + ARROWHEAD(360, 120, 'r') +
      '<path transform="translate(352 72) rotate(-45)" d="M-7 -5L0 0L-7 5"/>' +
      txt(110, 140, 'a') + txt(210, 140, 'b') + txt(310, 140, 'c') + txt(60, 108, known[0]) + txt(207, 50, known[1]) + txt(158, 108, 'I₁') + txt(262, 108, 'I₂') + txt(232, 160, known[2], 'start') + txt(362, 108, known[3]) + txt(385, 90, 'I₃', 'start'));
  };

  /* ---------------------------------------------------------------- plots */
  var P_SRC = {
    x: { min: 0, max: 6, label: T('Load current I', 'Kuormavirta I'), unit: 'A' },
    y: { min: 0, max: 12, label: T('Terminal voltage V', 'Napajännite V'), unit: 'V' },
    params: [
      { id: 'E', tex: 'ε', min: 1, max: 12, step: 0.5, value: 6, unit: 'V' },
      { id: 'r', tex: 'r', min: 0.1, max: 5, step: 0.1, value: 2, unit: 'Ω' },
      { id: 'R', tex: 'R', min: 0.2, max: 30, log: true, value: 4, unit: 'Ω' }
    ],
    curves: [
      { fn: function (x, p) { return x <= p.E / p.r ? p.E - p.r * x : NaN; }, label: T('V = ε − r·I  (linear source)', 'V = ε − r·I  (lineaarinen lähde)'), color: '--c-1' },
      { fn: function (x, p) { return p.E; }, label: T('ideal source (r = 0)', 'ideaalinen lähde (r = 0)'), color: '--c-4', dash: true },
      { fn: function (x, p) { return p.R * x; }, label: T('load line V = R·I', 'kuormasuora V = R·I'), color: '--c-3' }
    ],
    points: function (p) { var I = p.E / (p.r + p.R); return [{ x: I, y: p.R * I, label: T('operating point', 'työpiste') }]; },
    vlines: function (p) { return [{ x: p.E / p.r, label: T('I_sc = ε/r', 'I_sc = ε/r') }]; },
    readouts: function (p) { var I = p.E / (p.r + p.R); return [{ tex: 'I', value: I, unit: 'A' }, { tex: 'V', value: I * p.R, unit: 'V' }, { tex: 'I_{sc}', value: p.E / p.r, unit: 'A' }, { tex: 'P_R', value: I * I * p.R, unit: 'W' }, { tex: 'P_r', value: I * I * p.r, unit: 'W' }]; }
  };
  var FIT_DATA = [[1.0, 3.65], [1.2, 3.75], [1.4, 3.4], [1.6, 3.0], [1.8, 2.35], [2.0, 2.05], [2.2, 1.2], [2.4, 1.1], [2.6, 1.0]];
  var P_FIT = {
    x: { min: 0, max: 3.2, label: T('Current I', 'Virta I'), unit: 'A' },
    y: { min: 0, max: 7, label: T('Terminal voltage V', 'Napajännite V'), unit: 'V' },
    params: [
      { id: 'E', tex: 'ε', min: 3, max: 8, step: 0.1, value: 4, unit: 'V' },
      { id: 'r', tex: 'r', min: 0.1, max: 4, step: 0.1, value: 0.8, unit: 'Ω' }
    ],
    curves: [{ fn: function (x, p) { return x <= p.E / p.r ? p.E - p.r * x : NaN; }, label: T('your line', 'sinun suorasi'), color: '--c-2' }],
    points: function (p) { return FIT_DATA.map(function (d) { return { x: d[0], y: d[1] }; }); },
    readouts: function (p) {
      var s = 0; FIT_DATA.forEach(function (d) { var e = d[1] - (p.E - p.r * d[0]); s += e * e; });
      return [{ tex: 'ε', value: p.E, unit: 'V' }, { tex: 'r', value: p.r, unit: 'Ω' }, { tex: 'I_{sc} = ε/r', value: p.E / p.r, unit: 'A' }, { label: T('rms deviation from the points', 'poikkeama mittapisteistä (rms)'), value: Math.sqrt(s / FIT_DATA.length), unit: 'V' }];
    }
  };
  var P_CSRC = {
    x: { min: 0, max: 60, label: T('Terminal voltage V', 'Napajännite V'), unit: 'V' },
    y: { min: 0, max: 5, label: T('External current I', 'Ulkoinen virta I'), unit: 'A' },
    params: [
      { id: 'Is', tex: 'I_s', min: 0.5, max: 5, step: 0.1, value: 2, unit: 'A' },
      { id: 'r', tex: 'r', min: 5, max: 50, step: 1, value: 10, unit: 'Ω' },
      { id: 'R', tex: 'R', min: 1, max: 100, log: true, value: 20, unit: 'Ω' }
    ],
    curves: [
      { fn: function (x, p) { return x <= p.Is * p.r ? p.Is - x / p.r : NaN; }, label: T('I = I_s − V/r  (linear source)', 'I = I_s − V/r  (lineaarinen lähde)'), color: '--c-1' },
      { fn: function (x, p) { return p.Is; }, label: T('ideal current source', 'ideaalinen virtalähde'), color: '--c-4', dash: true },
      { fn: function (x, p) { return x / p.R; }, label: T('load line I = V/R', 'kuormasuora I = V/R'), color: '--c-3' }
    ],
    points: function (p) { var I = p.Is * p.r / (p.r + p.R); return [{ x: I * p.R, y: I, label: T('operating point', 'työpiste') }]; },
    readouts: function (p) { var I = p.Is * p.r / (p.r + p.R), V = I * p.R; return [{ tex: 'I', value: I, unit: 'A' }, { tex: 'V', value: V, unit: 'V' }, { label: T('current leaking through r (V/r)', 'r:n läpi vuotava virta (V/r)'), value: V / p.r, unit: 'A' }]; }
  };
  var P_CONST = {
    x: { min: 0, max: 200, label: T('Load resistance R_L', 'Kuormaresistanssi R_L'), unit: 'Ω' },
    y: { min: 0, max: 100, label: T('Load current I', 'Kuormavirta I'), unit: 'mA', auto: true },
    params: [
      { id: 'E', tex: 'E', min: 10, max: 1000, log: true, value: 100, unit: 'V' },
      { id: 'r', tex: 'r', min: 10, max: 10000, log: true, value: 500, unit: 'Ω' },
      { id: 'RL', tex: 'R_L', min: 1, max: 200, step: 1, value: 100, unit: 'Ω' }
    ],
    curves: [
      { fn: function (x, p) { return 1000 * p.E / (p.r + x); }, label: T('I = E/(R_L + r)', 'I = E/(R_L + r)'), color: '--c-1' },
      { fn: function (x, p) { return 1000 * p.E / p.r; }, label: T('E/r  (constant-current limit)', 'E/r  (vakiovirran raja-arvo)'), color: '--c-4', dash: true }
    ],
    points: function (p) { return [{ x: p.RL, y: 1000 * p.E / (p.r + p.RL), label: 'R_L' }]; },
    readouts: function (p) { var I = p.E / (p.r + p.RL), I0 = p.E / p.r; return [{ tex: 'I', value: I, unit: 'A' }, { tex: 'E/r', value: I0, unit: 'A' }, { label: T('deviation from a constant current', 'poikkeama vakiovirrasta'), value: fm(100 * (I0 - I) / I0, 3) + ' %' }]; }
  };

  /* ---------------------------------------------------------------- electrode table rows */
  function seriesRows() {
    var rows = [], half = 11;
    function s(v) { return (v > 0 ? '+' : (v < 0 ? '−' : '')) + Math.abs(v).toFixed(2); }
    for (var i = 0; i < half; i++) {
      var a = SERIES[i], b = SERIES[i + half];
      rows.push([T(a[0], a[1]), s(a[2]), b ? T(b[0], b[1]) : '', b ? s(b[2]) : '']);
    }
    return rows;
  }
  function symRows() {
    return [
      [T('conductor (wire)', 'johdin'), T('line; a dot marks a junction, no dot = wires cross without contact', 'viiva; piste merkitsee liitosta, ilman pistettä johtimet ylittävät toisensa'), ],
      [T('power supply (two open terminals)', 'teholähde (kaksi avointa napaa)'), T('two terminal dots', 'kaksi napapistettä')],
      [T('fixed resistor', 'kiinteä vastus'), T('IEC: rectangle box (recommended); US: zigzag', 'IEC: suorakulmio (suositeltu); US: siksak')],
      [T('variable resistor', 'säätövastus'), T('box with an arrow through it', 'laatikko, jonka läpi kulkee nuoli')],
      [T('cell / battery of cells', 'kenno / paristo'), T('long line = +, short line = −; several cells = battery', 'pitkä viiva = +, lyhyt viiva = −; useampi kenno = paristo')],
      [T('switch', 'kytkin'), T('open or closed contact', 'avoin tai suljettu kosketin')],
      [T('filament lamp / indicator lamp', 'hehkulamppu / merkkilamppu'), T('circle with a cross or an X', 'ympyrä, jossa risti tai X')],
      [T('fuse', 'sulake'), T('box with a line through it', 'laatikko, jonka läpi kulkee viiva')],
      [T('ammeter', 'ampeerimittari'), T('circle with A; connected in series', 'ympyrä ja A; kytketään sarjaan')],
      [T('voltmeter', 'volttimittari'), T('circle with V; connected in parallel', 'ympyrä ja V; kytketään rinnan')]
    ];
  }

  var DEF_S = { en: 'See the glossary.', fi: 'Katso sanasto.' };

  /* ================================================================ the topic */
  var SECTIONS = [
    /* ------------------------------------------------------------ 1 voltage sources */
    {
      id: 't3-vsource', title: T('Voltage sources: emf, terminal voltage, internal resistance', 'Jännitelähteet: lähdejännite, napajännite ja sisäinen resistanssi'),
      blocks: [
        { id: 't3-vs-p1', type: 'text', html: T(
          '<p>Voltage and current sources are the <b>energy sources</b> of a circuit. When people say “power supply” they normally mean a <dfn data-term="voltage_source">voltage source</dfn>. The two kinds of source differ in their internal structure.</p><p>A battery is the most common DC source. The voltage between its electrodes with <em>no load</em> is the <dfn data-term="emf">electromotive force</dfn> (emf, <f>ε</f> or <f>E</f>). When current flows in the outer circuit, the voltage you measure at the terminals is the <dfn data-term="terminal_voltage">terminal voltage</dfn>.</p>',
          '<p>Jännite- ja virtalähteet ovat virtapiirin <b>energialähteitä</b>. Kun puhutaan “teholähteestä”, tarkoitetaan yleensä <dfn data-term="voltage_source">jännitelähdettä</dfn>. Lähdetyypit eroavat toisistaan sisäiseltä rakenteeltaan.</p><p>Paristo on yleisin tasajännitelähde. Elektrodien välinen jännite <em>ilman kuormaa</em> on <dfn data-term="emf">lähdejännite</dfn> (sähkömotorinen voima, <f>ε</f> tai <f>E</f>). Kun ulkoisessa piirissä kulkee virta, napoista mitattu jännite on <dfn data-term="terminal_voltage">napajännite</dfn>.</p>') },
        { id: 't3-vs-fig1', type: 'figure', svg: FIG_VSRC, alt: T('Voltage source model: ideal emf in series with internal resistance r', 'Jännitelähteen malli: ideaalinen lähdejännite ja sen kanssa sarjassa sisäinen resistanssi r'),
          caption: T('A real voltage source = ideal emf ε in series with its <dfn data-term="internal_resistance">internal resistance</dfn> r (dashed box).', 'Todellinen jännitelähde = ideaalinen lähdejännite ε ja sen kanssa sarjassa oleva <dfn data-term="internal_resistance">sisäinen resistanssi</dfn> r (katkoviivalaatikko).') },
        { id: 't3-vs-p2', type: 'text', html: T(
          '<p>With a load, current <f>I</f> flows <em>through the source itself</em>, so there is a voltage drop <f>r·I</f> across the internal resistance. What is left at the terminals is the terminal voltage. This is the simple model; a real battery contains many such internal sources and resistors in series and in parallel.</p>',
          '<p>Kuormitettuna virta <f>I</f> kulkee <em>myös lähteen sisällä</em>, joten sisäisen resistanssin yli syntyy jännitehäviö <f>r·I</f>. Napoihin jäävä jännite on napajännite. Tämä on yksinkertainen malli; todellisessa paristossa on monta tällaista sisäistä lähdettä ja vastusta sarjassa ja rinnan.</p>') },
        { id: 't3-vs-f1', type: 'formula', key: true, tex: 'V_{ab} = ε − I·r', label: T('Terminal voltage of a linear voltage source', 'Lineaarisen jännitelähteen napajännite'),
          legend: [['V_{ab}', T('terminal voltage', 'napajännite'), 'V'], ['ε', T('emf (open-circuit voltage)', 'lähdejännite (tyhjä\u00ADkäynti\u00ADjännite)'), 'V'], ['I', T('current delivered to the outer circuit', 'ulkoiseen piiriin syötetty virta'), 'A'], ['r', T('internal resistance', 'sisäinen resistanssi'), 'Ω']] },
        { id: 't3-vs-c1', type: 'callout', kind: 'warn', title: T('Common misconception', 'Yleinen harhakäsitys'),
          html: T('<p>The emf and the terminal voltage are <b>not</b> the same thing. They are equal only when <f>I = 0</f>. The more current you draw, the lower the terminal voltage.</p>', '<p>Lähdejännite ja napajännite <b>eivät</b> ole sama asia. Ne ovat yhtä suuret vain, kun <f>I = 0</f>. Mitä enemmän virtaa otetaan, sitä pienempi napajännite on.</p>') },
        { id: 't3-vs-circ1', type: 'interactive', widget: 'circuit', title: T('Battery with internal resistance and a variable load', 'Paristo, sisäinen resistanssi ja muuttuva kuorma'),
          caption: T('Change R (click the resistor, then drag the slider) and watch the voltmeter. Raise R: the terminal voltage approaches ε. Lower R: current rises and the terminal voltage sinks. Try the 🌈 button to colour the wires by potential.', 'Muuta R:ää (napsauta vastusta ja vedä liukua) ja seuraa volttimittaria. Kun R kasvaa, napajännite lähestyy arvoa ε. Kun R pienenee, virta kasvaa ja napajännite laskee. Kokeile 🌈-painiketta: johtimet värjätään potentiaalin mukaan.'),
          config: CIRC_BATT },
        { id: 't3-vs-q1', type: 'question', q: 't3-q1' },
        { id: 't3-vs-q5', type: 'question', q: 't3-q5' }
      ]
    },
    /* ------------------------------------------------------------ 2 I,V line */
    {
      id: 't3-iv', title: T('The I,V line of a voltage source', 'Jännitelähteen virta-jännite-ominaiskäyrä'),
      blocks: [
        { id: 't3-iv-p1', type: 'text', html: T(
          '<p>To measure the <dfn data-term="iv_line">I,V line</dfn> connect a variable resistor to the terminals and record pairs <f>(I, V)</f> for different loads. For a linear source the points fall on a straight line:</p><ul><li>at <f>I = 0</f> (open circuit) the line meets the V axis at <f>V = ε</f>,</li><li>the slope of the line is <f>−r</f>,</li><li>at <f>V = 0</f> the line meets the I axis at the <dfn data-term="short_circuit_current">short-circuit current</dfn> <f>I_sc = ε/r</f>.</li></ul><p>Region (a) of the line has high voltage and low current; region (b) has low voltage and high current, near <f>I_sc</f>. A short circuit is normally a fault: only <f>r</f> limits the current.</p>',
          '<p>Mittaa <dfn data-term="iv_line">virta-jännite-ominaiskäyrä</dfn> kytkemällä napoihin säätövastus ja kirjaamalla pareja <f>(I, V)</f> eri kuormilla. Lineaarisella lähteellä pisteet asettuvat suoralle:</p><ul><li>kun <f>I = 0</f> (tyhjäkäynti), suora leikkaa V-akselin kohdassa <f>V = ε</f>,</li><li>suoran kulmakerroin on <f>−r</f>,</li><li>kun <f>V = 0</f>, suora leikkaa I-akselin <dfn data-term="short_circuit_current">oikosulkuvirran</dfn> <f>I_sc = ε/r</f> kohdalla.</li></ul><p>Suoran alue (a) on korkea jännite ja pieni virta, alue (b) matala jännite ja suuri virta lähellä arvoa <f>I_sc</f>. Oikosulku on yleensä vika: virtaa rajoittaa vain <f>r</f>.</p>') },
        { id: 't3-iv-f1', type: 'formula', key: true, tex: 'I_{sc} = {ε}/{r}', label: T('Short-circuit current', 'Oikosulkuvirta'),
          legend: [['I_{sc}', T('short-circuit current (V = 0)', 'oikosulkuvirta (V = 0)'), 'A']] },
        { id: 't3-iv-plot1', type: 'interactive', widget: 'plot', title: T('Terminal voltage versus load current', 'Napajännite kuormavirran funktiona'),
          caption: T('The blue line is the source, the green line is the load R. Their crossing is the operating point. Move R along the line: from open circuit (large R) to short circuit (R → 0). Compare with the ideal source (dashed).', 'Sininen suora on lähde, vihreä suora kuorma R. Leikkauspiste on työpiste. Liikuta R:ää: tyhjäkäynnistä (suuri R) oikosulkuun (R → 0). Vertaa ideaaliseen lähteeseen (katkoviiva).'),
          config: P_SRC },
        { id: 't3-iv-h1', type: 'h', text: T('Three kinds of I,V curve', 'Kolme ominaiskäyrätyyppiä') },
        { id: 't3-iv-tbl1', type: 'table', caption: T('Voltage-source characteristics', 'Jännitelähteen ominaiskäyrät'),
          head: [T('Type', 'Tyyppi'), T('Behaviour', 'Käyttäytyminen')],
          rows: [
            [T('a) ideal source', 'a) ideaalilähde'), T('r = 0; constant voltage for any current the circuit requires', 'r = 0; vakiojännite mille tahansa piirin vaatimalle virralle')],
            [T('b) standard source', 'b) tavallinen lähde'), T('linear at small and medium currents, non-linear (falls steeply) at high currents', 'lineaarinen pienillä ja keskisuurilla virroilla, epälineaarinen (jyrkkä lasku) suurilla virroilla')],
            [T('c) linear source', 'c) lineaarinen lähde'), T('internal resistance constant at all currents: the more current, the smaller the terminal voltage', 'sisäinen resistanssi vakio kaikilla virroilla: mitä suurempi virta, sitä pienempi napajännite')]
          ] },
        { id: 't3-iv-p2', type: 'text', html: T('<p>On this course every source is either <b>ideal</b> or <b>linear</b> (type c): an ideal source in series with <f>r</f>.</p>', '<p>Tällä kurssilla kaikki lähteet ovat joko <b>ideaalisia</b> tai <b>lineaarisia</b> (tyyppi c): ideaalinen lähde ja sen kanssa sarjassa <f>r</f>.</p>') },
        { id: 't3-iv-ex1', type: 'example', title: T('Reading ε and r from measurements', 'Lähdejännitteen ja sisäisen resistanssin luku mittauksista'),
          problem: T('Measured terminal voltages of a battery versus load current lie on the best-fit line V = 6.0 V − 2.0 Ω · I. Find ε, r, the short-circuit current, and the terminal voltage at I = 1.5 A.', 'Pariston mitatut napajännitteet kuormavirran funktiona asettuvat suoralle V = 6,0 V − 2,0 Ω · I. Määritä ε, r, oikosulkuvirta sekä napajännite virralla I = 1,5 A.'),
          given: ['V = 6.0 V − 2.0 Ω · I'],
          steps: [
            T('Compare with <f>V = ε − r·I</f>: the V-axis intercept is the emf.', 'Vertaa kaavaan <f>V = ε − r·I</f>: V-akselin leikkauspiste on lähdejännite.'),
            { tex: 'ε = 6.0 V' },
            T('The magnitude of the slope is the internal resistance.', 'Kulmakertoimen itseisarvo on sisäinen resistanssi.'),
            { tex: 'r = 2.0 Ω' },
            T('At the I axis the terminal voltage is zero:', 'I-akselilla napajännite on nolla:'),
            { tex: 'I_{sc} = {ε}/{r} = {6.0 V}/{2.0 Ω} = 3.0 A' },
            T('Terminal voltage at 1.5 A:', 'Napajännite virralla 1,5 A:'),
            { tex: 'V = 6.0 V − 2.0 Ω · 1.5 A = 3.0 V' }
          ],
          result: T('ε = 6.0 V, r = 2.0 Ω, I_sc = 3.0 A, V(1.5 A) = 3.0 V', 'ε = 6,0 V, r = 2,0 Ω, I_sc = 3,0 A, V(1,5 A) = 3,0 V') },
        { id: 't3-iv-plot2', type: 'interactive', widget: 'plot', title: T('Fit-the-line lab', 'Suoran\u00ADsovitus\u00ADlaboratorio'),
          caption: T('The dots are measured points (read from the lecture slide). Adjust ε and r until the orange line passes through the data as well as possible, then read ε, r and I_sc off the readouts.', 'Pisteet ovat mittapisteitä (luettu luentokalvolta). Säädä ε ja r niin, että oranssi suora kulkee mahdollisimman hyvin pisteiden kohdalta, ja lue sitten ε, r ja I_sc.'),
          config: P_FIT },
        { id: 't3-iv-q2', type: 'question', q: 't3-q2' },
        { id: 't3-iv-q3', type: 'question', q: 't3-q3' },
        { id: 't3-iv-q4', type: 'question', q: 't3-q4' }
      ]
    },
    /* ------------------------------------------------------------ 3 current sources */
    {
      id: 't3-csource', title: T('Current sources', 'Virtalähteet'),
      blocks: [
        { id: 't3-cs-p1', type: 'text', html: T(
          '<p>A <dfn data-term="current_source">current source</dfn> has a source current <f>I_s</f> with an internal resistor <f>r</f> connected in <b>parallel</b>. With no load, the external current is <f>I = I_s</f>. With a load, part of the source current leaks through <f>r</f>:</p>',
          '<p><dfn data-term="current_source">Virtalähteellä</dfn> on lähdevirta <f>I_s</f> ja sen kanssa <b>rinnan</b> kytketty sisäinen vastus <f>r</f>. Ilman kuormaa ulkoinen virta on <f>I = I_s</f>. Kuormitettuna osa lähdevirrasta vuotaa <f>r</f>:n kautta:</p>') },
        { id: 't3-cs-fig1', type: 'figure', svg: FIG_CSRC, alt: T('Current source model: source current in parallel with r', 'Virtalähteen malli: lähdevirta ja sen kanssa rinnan r'),
          caption: T('Current source model: I_s in parallel with r.', 'Virtalähteen malli: I_s ja sen kanssa rinnan r.') },
        { id: 't3-cs-f1', type: 'formula', key: true, tex: 'I = I_s − {V}/{r}', label: T('Current delivered by a linear current source', 'Lineaarisen virtalähteen antama virta'),
          legend: [['I_s', T('source current', 'lähdevirta'), 'A'], ['V/r', T('current through the internal resistor', 'sisäisen vastuksen läpi kulkeva virta'), 'A']] },
        { id: 't3-cs-p2', type: 'text', html: T(
          '<p>If <f>V</f> increases, the external current decreases, because more of <f>I_s</f> leaks through <f>r</f>. An <b>ideal current source</b> has infinite internal resistance: no current is lost in <f>r</f>, so it delivers a constant current at any voltage.</p>',
          '<p>Kun <f>V</f> kasvaa, ulkoinen virta pienenee, koska yhä suurempi osa virrasta <f>I_s</f> vuotaa <f>r</f>:n kautta. <b>Ideaalisella virtalähteellä</b> sisäinen resistanssi on ääretön: <f>r</f>:ssä ei häviä virtaa, joten se antaa vakiovirran millä tahansa jännitteellä.</p>') },
        { id: 't3-cs-plot1', type: 'interactive', widget: 'plot', title: T('I,V line of a current source', 'Virtalähteen ominaiskäyrä'),
          caption: T('Compare with the voltage-source graph: it is the same kind of straight line, now drawn as I versus V. Increase r and the line becomes flatter, closer to the ideal (dashed) current source.', 'Vertaa jännitelähteen kuvaajaan: kyseessä on samanlainen suora, nyt piirrettynä I jännitteen V funktiona. Kun r kasvaa, suora tasoittuu ja lähestyy ideaalista (katkoviiva) virtalähdettä.'),
          config: P_CSRC },
        { id: 't3-cs-p3', type: 'text', html: T(
          '<p>Most practical energy sources (mains, batteries) are closer to voltage sources. A practical <b>constant-current source</b> is an electronic circuit with a high emf <f>E</f> and a large series resistance <f>r ≫ R_L</f>:</p>',
          '<p>Useimmat käytännön energialähteet (verkkovirta, paristot) muistuttavat jännitelähteitä. Käytännön <b>vakiovirtalähde</b> on elektroniikkapiiri, jossa on suuri lähdejännite <f>E</f> ja suuri sarjaresistanssi <f>r ≫ R_L</f>:</p>') },
        { id: 't3-cs-f2', type: 'formula', tex: 'I = J = {E}/{R_L + r} ≈ {E}/{r}', label: T('Constant-current source (r ≫ R_L)', 'Vakiovirtalähde (r ≫ R_L)') },
        { id: 't3-cs-plot2', type: 'interactive', widget: 'plot', title: T('Making a voltage source behave like a current source', 'Jännitelähteestä vakiovirtalähde'),
          caption: T('Raise r (and E with it). The current barely changes when R_L changes: it stays close to E/r.', 'Kasvata r:ää (ja E:tä sen mukana). Virta ei juuri muutu, kun R_L muuttuu: se pysyy lähellä arvoa E/r.'),
          config: P_CONST },
        { id: 't3-cs-c1', type: 'callout', kind: 'info', title: T('Solar cells', 'Aurinkokennot'),
          html: T('<p>Light releases electrons in some semiconductors. A single PV panel used to be treated as an imperfect voltage source, but today it is regarded as an <b>imperfect current source</b>.</p>', '<p>Valo vapauttaa elektroneja joissakin puolijohteissa. Yksittäistä aurinkopaneelia pidettiin ennen epätäydellisenä jännitelähteenä, mutta nykyään sitä pidetään <b>epätäydellisenä virtalähteenä</b>.</p>') },
        { id: 't3-cs-q7', type: 'question', q: 't3-q7' }
      ]
    },
    /* ------------------------------------------------------------ 4 symbols */
    {
      id: 't3-symbols', title: T('Symbols of sources and circuit symbols', 'Lähteiden ja piirisymbolien merkintätavat'),
      blocks: [
        { id: 't3-sym-p1', type: 'text', html: T(
          '<p>Several symbol conventions exist. A DC voltage source can be drawn as a battery symbol (long line = +, short line = −), as a circle with an arrow (the Finnish style, <f>E</f>) or as a circle with +/− (US style). Add <f>r</f> in series for a linear source; leave it out for an ideal one. A current source is a circle with an arrow, with <f>r</f> in parallel (linear) or without it (ideal).</p>',
          '<p>Merkintätapoja on useita. Tasajännitelähde voidaan piirtää paristosymbolina (pitkä viiva = +, lyhyt viiva = −), nuolellisena ympyränä (suomalainen tapa, <f>E</f>) tai ympyränä, jossa on +/− (US-tapa). Lineaarisessa lähteessä lisätään sarjaan <f>r</f>, ideaalisessa se jätetään pois. Virtalähde on nuolellinen ympyrä, jonka kanssa rinnan on <f>r</f> (lineaarinen) tai ei mitään (ideaalinen).</p>') },
        { id: 't3-sym-fig1', type: 'figure', svg: { en: FIG_SYMBOLS('battery'), fi: FIG_SYMBOLS('paristo') }, alt: T('Common source symbols', 'Yleisiä lähdesymboleja'), caption: T('Battery, circle-with-arrow, circle with +/−, and current source symbols (without internal resistance).', 'Paristo, nuolellinen ympyrä, +/−-ympyrä ja virtalähdesymboli (ilman sisäistä resistanssia).') },
        { id: 't3-sym-c1', type: 'callout', kind: 'info', title: T('Not on this course', 'Ei tällä kurssilla'),
          html: T('<p>Controlled (dependent) sources, such as the VCVS of an ideal operational amplifier, are based on electronic circuits and are not discussed here.</p>', '<p>Ohjattuja lähteitä, esimerkiksi ideaalisen operaatiovahvistimen jänniteohjattua jännitelähdettä (VCVS), ei käsitellä tällä kurssilla; ne perustuvat elektroniikkapiireihin.</p>') },
        { id: 't3-sym-h1', type: 'h', text: T('Circuit symbols (DC circuits)', 'Piirisymbolit (tasavirtapiirit)') },
        { id: 't3-sym-p2', type: 'text', html: T('<p>DC circuits normally contain batteries (voltage and/or current sources), resistors and switches. On this course all sources are ideal or linear. The IEC resistor symbol is a rectangle with the arrows <f>U</f> and <f>I</f> and the label <f>R</f>.</p>', '<p>Tasavirtapiireissä on yleensä paristoja (jännite- ja/tai virtalähteitä), vastuksia ja kytkimiä. Tällä kurssilla kaikki lähteet ovat ideaalisia tai lineaarisia. IEC-vastussymboli on suorakulmio, jossa on nuolet <f>U</f> ja <f>I</f> sekä tunnus <f>R</f>.</p>') },
        { id: 't3-sym-tbl1', type: 'table', caption: T('Symbols used in the course', 'Kurssilla käytettävät symbolit'), head: [T('Component', 'Komponentti'), T('How it is drawn', 'Piirrostapa')], rows: symRows() },
        { id: 't3-sym-c2', type: 'callout', kind: 'tip', html: T('<p>An ammeter goes <b>in series</b> (it should have almost zero resistance); a voltmeter goes <b>in parallel</b> (almost infinite resistance). The circuit widgets on this page follow the same rule.</p>', '<p>Ampeerimittari kytketään <b>sarjaan</b> (sen resistanssin tulee olla lähes nolla) ja volttimittari <b>rinnan</b> (resistanssi lähes ääretön). Tämän sivun piirit noudattavat samaa sääntöä.</p>') }
      ]
    },
    /* ------------------------------------------------------------ 5 origin of voltage */
    {
      id: 't3-origin', title: T('Origin of voltage: electrochemical series and batteries', 'Jännitteen alkuperä: jännitesarja ja paristot'),
      blocks: [
        { id: 't3-or-p1', type: 'text', html: T(
          '<p>The potential difference of a battery comes from the <dfn data-term="electrochemical_series">electrochemical series</dfn>: every element has an electrode potential relative to hydrogen. The cell voltage is the difference of two electrode potentials:</p>',
          '<p>Pariston jite-ero perustuu <dfn data-term="electrochemical_series">jännitesarjaan</dfn>: jokaisella alkuaineella on elektrodipotentiaali vedyn suhteen. Kennon jännite on kahden elektrodipotentiaalin erotus:</p>') },
        { id: 't3-or-f1', type: 'formula', key: true, tex: 'V = V_{cathode} − V_{anode}', label: T('Cell voltage', 'Kennon jännite'),
          legend: [['V_{cathode}', T('electrode potential of the positive electrode', 'positiivisen elektrodin potentiaali'), 'V'], ['V_{anode}', T('electrode potential of the negative electrode (it is dissolved)', 'negatiivisen elektrodin potentiaali (se liukenee)'), 'V']] },
        { id: 't3-or-tbl1', type: 'table', caption: T('Electrode potentials from the lecture slide (V)', 'Elektrodipotentiaalit luentokalvolta (V)'),
          head: [T('Element', 'Alkuaine'), 'E / V', T('Element', 'Alkuaine'), 'E / V'], rows: seriesRows() },
        { id: 't3-or-c1', type: 'callout', kind: 'warn', title: T('Note on the table', 'Huomautus taulukosta'),
          html: T('<p>The slide lists silver, gold and mercury all as +0.80 V. Standard tables give different values (for example gold about +1.5 V). Use the slide values for the tasks of this course. (extra)</p>', '<p>Kalvolla hopean, kullan ja elohopean arvo on kaikilla +0,80 V. Standardiarvotaulukoissa arvot poikkeavat toisistaan (esim. kulta noin +1,5 V). Käytä tämän kurssin tehtävissä kalvon arvoja. (lisätieto)</p>') },
        { id: 't3-or-cell', type: 'interactive', widget: 'custom', title: T('Electrochemical cell builder', 'Sähkökemiallisen kennon rakentaja'),
          caption: T('Pick two elements. The one with the lower potential is the anode (it dissolves and releases electrons); electrons flow through the wire to the cathode. Try copper and zinc.', 'Valitse kaksi alkuainetta. Alemman potentiaalin alkuaine on anodi (se liukenee ja luovuttaa elektroneja); elektronit kulkevat johtimessa katodille. Kokeile kuparia ja sinkkiä.'),
          config: W(mountCell) },
        { id: 't3-or-ex1', type: 'example', title: T('Copper–zinc cell', 'Kupari–sinkkikenno'),
          problem: T('A copper electrode in CuSO₄ solution and a zinc electrode in ZnSO₄ solution are joined by a salt bridge and an external wire. Find the cell voltage.', 'Kuparielektrodi CuSO₄-liuoksessa ja sinkkielektrodi ZnSO₄-liuoksessa on yhdistetty suolasillalla ja ulkoisella johtimella. Laske kennon jännite.'),
          given: ['V(Cu) = +0.34 V', 'V(Zn) = −0.76 V'],
          steps: [
            T('Zinc has the lower potential, so it is the anode: Zn → Zn²⁺ + 2e⁻. Copper is the cathode: Cu²⁺ + 2e⁻ → Cu.', 'Sinkillä on alempi potentiaali, joten se on anodi: Zn → Zn²⁺ + 2e⁻. Kupari on katodi: Cu²⁺ + 2e⁻ → Cu.'),
            { tex: 'V = V(Cu) − V(Zn) = 0.34 V − (−0.76 V)' },
            { tex: 'V = 1.10 V' },
            T('The reaction only runs if there is an external path for the electrons. The zinc anode is slowly eaten away; copper forms on the cathode.', 'Reaktio etenee vain, jos elektroneille on ulkoinen reitti. Sinkkianodi syöpyy vähitellen ja kupari kertyy katodille.')
          ],
          result: T('V = 1.10 V', 'V = 1,10 V') },
        { id: 't3-or-list', type: 'list', items: [
          T('<b>Rechargeable:</b> lithium-ion, nickel-metal hydride, lead-acid.', '<b>Ladattavat:</b> litiumioni, nikkelimetallihybridi, lyijyakku.'),
          T('<b>Non-rechargeable:</b> lithium-MnO₂, alkaline-MnO₂ (the slide says “MgO₂”; MnO₂ is correct).', '<b>Ei-ladattavat:</b> litium-MnO₂, alkali-MnO₂ (kalvolla “MgO₂”; oikea on MnO₂).'),
          T('<b>Solar cell:</b> light frees electrons in a semiconductor junction; modelled as an imperfect current source.', '<b>Aurinkokenno:</b> valo vapauttaa elektroneja puolijohdeliitoksessa; mallinnetaan epätäydellisenä virtalähteenä.'),
          T('<b>Generators</b> convert mechanical energy to electrical energy through electromagnetic induction. Electronic power supplies convert mains AC to constant DC.', '<b>Generaattorit</b> muuttavat mekaanista energiaa sähköenergiaksi sähkömagneettisen induktion avulla. Elektroniset teholähteet muuttavat verkon vaihtojännitteen tasajännitteeksi.')
        ], ordered: false },
        { id: 't3-or-q8', type: 'question', q: 't3-q8' }
      ]
    },
    /* ------------------------------------------------------------ 6 loads */
    {
      id: 't3-loads', title: T('Different loads of a source', 'Lähteen erilaiset kuormitukset'),
      blocks: [
        { id: 't3-ld-p1', type: 'text', html: T(
          '<p>A source (ε, r) can be loaded in three characteristic ways. Press the switches in the circuit below to try each of them: S1 connects the load, S2 shorts it with a wire.</p>',
          '<p>Lähdettä (ε, r) voidaan kuormittaa kolmella tyypillisellä tavalla. Kokeile jokaista alla olevan piirin kytkimillä: S1 kytkee kuorman, S2 oikosulkee sen johtimella.</p>') },
        { id: 't3-ld-circ1', type: 'interactive', widget: 'circuit', title: T('Open circuit, nominal load, short circuit', 'Tyhjäkäynti, nimelliskuorma, oikosulku'),
          caption: T('Click S1 and S2. S1 open = open circuit; S1 closed, S2 open = nominal load; both closed = short circuit (the resistor R carries no current and only r limits the current).', 'Napsauta S1:tä ja S2:ta. S1 auki = tyhjäkäynti; S1 kiinni, S2 auki = nimelliskuorma; molemmat kiinni = oikosulku (vastus R ei johda virtaa ja virtaa rajoittaa vain r).'),
          config: CIRC_LOADS },
        { id: 't3-ld-tbl1', type: 'table', caption: T('Three loading cases', 'Kolme kuormitustapausta'),
          head: [T('Case', 'Tapaus'), T('Equations', 'Yhtälöt'), T('Power in R', 'Teho vastuksessa R')],
          rows: [
            [T('a) open circuit (no load)', 'a) tyhjäkäynti (ei kuormaa)'), { tex: 'I = 0,  V_o = ε' }, { tex: 'P_R = 0' }],
            [T('b) nominal load', 'b) nimelliskuorma'), { tex: 'ε = I·r + I·R,  V = I·R' }, { tex: 'P_R = R·I²' }],
            [T('c) short circuit (R = 0)', 'c) oikosulku (R = 0)'), { tex: 'ε = I_{sc}·r,  V_{sc} = 0' }, { tex: 'P_R = 0' }]
          ] },
        { id: 't3-ld-c1', type: 'callout', kind: 'warn', title: T('Short circuit is a fault', 'Oikosulku on vikatilanne'),
          html: T('<p>In a short circuit nothing but <f>r</f> limits the current: <f>I_sc = ε/r</f>. For a car battery with a tiny <f>r</f> this is hundreds of amperes. That is why circuits have fuses.</p>', '<p>Oikosulussa virtaa rajoittaa vain <f>r</f>: <f>I_sc = ε/r</f>. Auton akulla pieni <f>r</f> tarkoittaa satoja ampeereja. Siksi piireissä on sulakkeita.</p>') },
        { id: 't3-ld-q6', type: 'question', q: 't3-q6' }
      ]
    },
    /* ------------------------------------------------------------ 7 series and parallel */
    {
      id: 't3-combine', title: T('Sources in series and in parallel', 'Lähteet sarjassa ja rinnan'),
      blocks: [
        { id: 't3-sp-p1', type: 'text', html: T('<p>Here only <b>identical</b> sources (each with emf <f>E_n</f> and internal resistance <f>r_n</f>) are combined.</p><p><b>In series</b>, KVL for two cells gives <f>E + E = I·r + I·r + I·R</f>, so the emfs and the internal resistances add. <b>In parallel</b>, all cells have the same terminal voltage <f>V = E − I·r</f> and the load current is the sum of the cell currents.</p>', '<p>Tässä yhdistetään vain <b>samanlaisia</b> lähteitä (kunkin lähdejännite <f>E_n</f> ja sisäinen resistanssi <f>r_n</f>).</p><p><b>Sarjassa</b> kahden kennon KVL antaa <f>E + E = I·r + I·r + I·R</f>, joten lähdejännitteet ja sisäiset resistanssit summautuvat. <b>Rinnan</b> kaikilla kennoilla on sama napajännite <f>V = E − I·r</f> ja kuormavirta on kennovirtojen summa.</p>') },
        { id: 't3-sp-f1', type: 'formula', key: true, tex: 'E = n·E_n,   r = n·r_n', label: T('n identical sources in series', 'n samanlaista lähdettä sarjassa') },
        { id: 't3-sp-f2', type: 'formula', key: true, tex: 'E = E_n,   r = {r_n}/{n},   I = n·I_n', label: T('n identical sources in parallel', 'n samanlaista lähdettä rinnan'),
          legend: [['I_n', T('current of one cell', 'yhden kennon virta'), 'A'], ['I', T('total (load) current', 'kokonaisvirta (kuormavirta)'), 'A']] },
        { id: 't3-sp-bat', type: 'interactive', widget: 'custom', title: T('Battery builder: series or parallel', 'Pariston rakentaja: sarja vai rinnan'),
          caption: T('Series: the voltage grows but so does r, and every cell carries the full current. Parallel: the voltage stays the same, r shrinks, and the current is shared between the cells.', 'Sarjassa jännite kasvaa mutta niin kasvaa myös r, ja jokaisen kennon läpi kulkee koko virta. Rinnankytkennässä jännite pysyy samana, r pienenee ja virta jakautuu kennojen kesken.'),
          config: W(mountBattery) },
        { id: 't3-sp-c1', type: 'callout', kind: 'tip', html: T('<p>Series gives <b>more voltage</b>, parallel gives <b>more current capability</b> (and a lower r). Never connect sources with different emfs directly in parallel: a large current circulates between them.</p>', '<p>Sarjaankytkentä antaa <b>enemmän jännitettä</b>, rinnankytkentä <b>suuremman virrankestoisuuden</b> (ja pienemmän r:n). Älä kytke eri jännitteisiä lähteitä suoraan rinnan: niiden välillä kiertää suuri virta.</p>') },
        { id: 't3-sp-q9', type: 'question', q: 't3-q9' }
      ]
    },
    /* ------------------------------------------------------------ 8 circuits */
    {
      id: 't3-circuits', title: T('DC circuits: nodes, branches and loops', 'Tasavirtapiirit: solmut, haarat ja silmukat'),
      blocks: [
        { id: 't3-dc-p1', type: 'text', html: T(
          '<p>To analyse a network we need three words. A <dfn data-term="node">node</dfn> (junction) is a point where two or more branches meet. A <dfn data-term="branch">branch</dfn> is a path between two nodes that contains one or more components and carries a single current. A <dfn data-term="loop">loop</dfn> is any closed path through the network that visits each node at most once.</p><p>Now experiment: below is a small circuit with three resistors and a lamp. Choose the 〰 tool and draw a wire across a resistor to <b>short it</b>.</p>',
          '<p>Verkon analyysiin tarvitaan kolme käsitettä. <dfn data-term="node">Solmu</dfn> on piste, jossa kaksi tai useampi haara kohtaa. <dfn data-term="branch">Haara</dfn> on kahden solmun välinen reitti, jossa on yksi tai useampi komponentti ja jossa kulkee yksi virta. <dfn data-term="loop">Silmukka</dfn> on mikä tahansa suljettu reitti verkossa, joka käy kussakin solmussa enintään kerran.</p><p>Kokeile nyt: alla on pieni piiri, jossa on kaksi vastusta ja lamppu. Valitse 〰-työkalu ja piirrä johdin vastuksen yli <b>oikosulkeaksesi</b> sen.</p>') },
        { id: 't3-dc-circ1', type: 'interactive', widget: 'circuit', title: T('Short-circuit a resistor with a wire', 'Oikosulje vastus johtimella'),
          caption: T('Draw a wire from one end of R2 to the other. The current bypasses R2, the ammeter reading rises and the lamp glows more brightly. Cut the wire again with ✂.', 'Piirrä johdin R2:n päästä päähän. Virta ohittaa R2:n, virtamittarin lukema kasvaa ja lamppu palaa kirkkaammin. Poista johdin ✂-työkalulla.'),
          config: CIRC_SHORT },
        { id: 't3-dc-c1', type: 'callout', kind: 'key', title: T('Plan of attack', 'Ratkaisun suunnitelma'),
          html: T('<p>For a network with <f>b</f> branches you need <f>b</f> independent equations for the <f>b</f> unknown branch currents: KCL at nodes and KVL around loops. The next sections show the rules and how to organise the equations.</p>', '<p>Verkossa, jossa on <f>b</f> haaraa, tarvitaan <f>b</f> riippumatonta yhtälöä <f>b</f>:lle tuntemattomalle haaravirralle: KCL solmuissa ja KVL silmukoissa. Seuraavissa luvuissa esitellään säännöt ja yhtälöiden järjestäminen.</p>') }
      ]
    },
    /* ------------------------------------------------------------ 9 KCL */
    {
      id: 't3-kcl', title: T("Kirchhoff's current law (KCL)", 'Kirchhoffin virtalaki (KCL)'),
      blocks: [
        { id: 't3-kcl-p1', type: 'text', html: T(
          '<p><dfn data-term="kcl">Kirchhoff’s current law</dfn> expresses the <b>conservation of electric charge</b>: charge cannot pile up in a junction. At any junction the sum of the currents entering equals the sum of the currents leaving.</p>',
          '<p><dfn data-term="kcl">Kirchhoffin virtalaki</dfn> ilmaisee <b>sähkövarauksen säilymisen</b>: varaus ei voi kasautua liitospisteeseen. Jokaisessa solmussa solmuun tulevien virtojen summa on yhtä suuri kuin siitä lähtevien virtojen summa.</p>') },
        { id: 't3-kcl-f1', type: 'formula', key: true, tex: 'Σ I_i = 0', label: T('KCL (currents entering counted +, leaving −)', 'KCL (tulevat virrat +, lähtevät −)'),
          legend: [['I_i', T('currents at one node', 'yhden solmun virrat'), 'A']] },
        { id: 't3-kcl-fig1', type: 'figure', svg: FIG_JUNCTION, alt: T('A junction with three currents entering and one leaving', 'Solmu, johon tulee kolme virtaa ja josta lähtee yksi'), caption: T('I₁ + I₂ + I₃ − I₄ = 0: three currents enter, one leaves.', 'I₁ + I₂ + I₃ − I₄ = 0: kolme virtaa tulee, yksi lähtee.') },
        { id: 't3-kcl-node', type: 'interactive', widget: 'custom', title: T('KCL demo: a node with three branches', 'KCL-demo: solmu ja kolme haaraa'),
          caption: T('Change the resistors and the two sources. Green arrows enter the node, orange arrows leave it. However you adjust things, entering = leaving, so ΣI = 0. A branch current can even change direction.', 'Muuta vastuksia ja kahta lähdettä. Vihreät nuolet tulevat solmuun, oranssit lähtevät siitä. Miten tahansa säädät, tulevat = lähtevät, joten ΣI = 0. Haaravirta voi jopa vaihtaa suuntaa.'),
          config: W(mountKcl) },
        { id: 't3-kcl-c1', type: 'callout', kind: 'warn', title: T('Signs and reference directions', 'Etumerkit ja vertailusuunnat'),
          html: T('<p>You choose the reference arrows <b>before</b> calculating. If the result is negative, the real current flows opposite to the arrow – that is not an error. Current is never “used up” in a component: what goes in comes out.</p>', '<p>Vertailusuunnat valitaan <b>ennen</b> laskemista. Jos tulos on negatiivinen, todellinen virta kulkee nuolta vastaan – se ei ole virhe. Virta ei myöskään “kulu” komponentissa: mikä sisään menee, tulee ulos.</p>') },
        { id: 't3-kcl-ex1', type: 'example', title: T('Currents at three junctions', 'Virrat kolmessa solmussa'),
          problem: T('10 A enters node a. 13 A flows from a to c. I₁ flows from a to b. 20 A enters node b from below. I₂ flows from b to c. At node c, 7 A leaves to the right and I₃ leaves on the other branch. Find I₁, I₂ and I₃.', 'Solmuun a tulee 10 A. Solmusta a solmuun c kulkee 13 A. Virta I₁ kulkee a:sta b:hen. Solmuun b tulee alhaalta 20 A. Virta I₂ kulkee b:stä c:hen. Solmusta c lähtee oikealle 7 A ja toista haaraa pitkin virta I₃. Laske I₁, I₂ ja I₃.'),
          given: ['10 A in at a', '13 A: a → c', '20 A in at b', '7 A out at c'],
          steps: [
            T('Node a (enter = leave):', 'Solmu a (tulevat = lähtevät):'),
            { tex: '10 − 13 − I_1 = 0  →  I_1 = −3 A' },
            T('The minus sign means 3 A actually flows from b to a.', 'Miinusmerkki tarkoittaa, että 3 A kulkee todellisuudessa b:stä a:han.'),
            T('Node b:', 'Solmu b:'),
            { tex: '20 + I_1 = I_2  →  I_2 = 20 − 3 = 17 A' },
            T('Node c:', 'Solmu c:'),
            { tex: '13 + 17 = I_3 + 7  →  I_3 = 23 A' },
            T('Check: current in 10 + 20 = 30 A equals current out 7 + 23 = 30 A.', 'Tarkistus: sisään 10 + 20 = 30 A, ulos 7 + 23 = 30 A.')
          ],
          result: T('I₁ = −3 A (flows b → a), I₂ = 17 A, I₃ = 23 A', 'I₁ = −3 A (kulkee b → a), I₂ = 17 A, I₃ = 23 A') },
        { id: 't3-kcl-q10', type: 'question', q: 't3-q10' }
      ]
    },
    /* ------------------------------------------------------------ 10 KVL */
    {
      id: 't3-kvl', title: T("Kirchhoff's voltage law (KVL) and power balance", 'Kirchhoffin jännitelaki (KVL) ja tehotase'),
      blocks: [
        { id: 't3-kvl-p1', type: 'text', html: T(
          '<p><dfn data-term="kvl">Kirchhoff’s voltage law</dfn> expresses the <b>conservation of energy</b>: the sum of the potential changes around any closed loop is zero. If you walk once around a loop, you return to the potential where you started.</p>',
          '<p><dfn data-term="kvl">Kirchhoffin jännitelaki</dfn> ilmaisee <b>energian säilymisen</b>: potentiaalin muutosten summa mihin tahansa suljettuun silmukkaan on nolla. Kun kävelet silmukan kerran ympäri, palaat samaan potentiaaliin, josta lähdit.</p>') },
        { id: 't3-kvl-f1', type: 'formula', key: true, tex: 'Σ ΔV = 0', label: T('KVL around a closed loop', 'KVL suljetussa silmukassa'),
          legend: [['ΔV', T('potential change over each element along the walking direction (rise +, drop −)', 'kunkin komponentin potentiaalin muutos kuljettaessa (nousu +, lasku −)'), 'V']] },
        { id: 't3-kvl-c1', type: 'callout', kind: 'tip', title: T('Walking rules', 'Kävelysäännöt'),
          html: T('<ul><li>Through a resistor <b>along</b> the current arrow: drop, <f>−I·R</f>. Against it: rise, <f>+I·R</f>.</li><li>Through a source from <b>−</b> to <b>+</b>: rise, <f>+E</f>. From + to −: drop, <f>−E</f>.</li></ul>', '<ul><li>Vastuksen läpi virran nuolen <b>suuntaan</b>: lasku, <f>−I·R</f>. Nuolta vastaan: nousu, <f>+I·R</f>.</li><li>Lähteen läpi <b>−</b>-navasta <b>+</b>-napaan: nousu, <f>+E</f>. +:sta −:aan: lasku, <f>−E</f>.</li></ul>') },
        { id: 't3-kvl-walk', type: 'interactive', widget: 'custom', title: T('Walk around the loop', 'Kävele silmukan ympäri'),
          caption: T('The token walks counter-clockwise from the bottom-left corner. Sources lift the potential (green), resistors lower it (orange), and the running sum returns to exactly 0. Press “Next element” to step through it yourself. With the default values I = 8/19 A.', 'Merkki kävelee vastapäivään vasemmasta alakulmasta. Lähteet nostavat potentiaalia (vihreä), vastukset laskevat sitä (oranssi) ja kokonaissumma palaa täsmälleen nollaan. Paina “Seuraava komponentti” askeltaaksesi itse. Oletusarvoilla I = 8/19 A.'),
          config: W(mountKvl) },
        { id: 't3-kvl-ex1', type: 'example', title: T('Single loop with two sources', 'Yksi silmukka ja kaksi lähdettä'),
          problem: T('E₁ = 12 V, E₂ = 4 V, R₁ = 5 Ω, R₂ = 6 Ω, R₃ = 8 Ω. The two batteries have the same orientation, so they oppose each other around the loop. Find the loop current I.', 'E₁ = 12 V, E₂ = 4 V, R₁ = 5 Ω, R₂ = 6 Ω, R₃ = 8 Ω. Paristot on suunnattu samoin, joten ne vastustavat toisiaan silmukassa. Laske silmukkavirta I.'),
          given: ['E₁ = 12 V', 'E₂ = 4 V', 'R₁ = 5 Ω', 'R₂ = 6 Ω', 'R₃ = 8 Ω'],
          steps: [
            T('Walk counter-clockwise (the direction of the current): E₁ is a rise, E₂ a drop, and the three resistors are drops.', 'Kävele vastapäivään (virran suuntaan): E₁ on nousu, E₂ lasku ja kolme vastusta laskuja.'),
            { tex: 'E_1 − E_2 − I·R_2 − I·R_3 − I·R_1 = 0' },
            { tex: 'E_1 − E_2 = (R_1 + R_2 + R_3)·I' },
            { tex: 'I = {12 V − 4 V}/{5 Ω + 6 Ω + 8 Ω} = {8}/{19} A' },
            { tex: 'I ≈ 0.421 A' }
          ],
          result: T('I = 8/19 A ≈ 0.42 A', 'I = 8/19 A ≈ 0,42 A') },
        { id: 't3-kvl-circ1', type: 'interactive', widget: 'circuit', title: T('The same loop in the simulator', 'Sama silmukka simulaattorissa'),
          caption: T('Compare the ammeter-free table with 8/19 A. Click 🌈 to colour the wires by potential, and change a source or resistor to see KVL still hold.', 'Vertaa taulukon virtaa arvoon 8/19 A. Napsauta 🌈 värjätäksesi johtimet potentiaalin mukaan, ja muuta lähdettä tai vastusta nähdäksesi KVL:n pysyvän voimassa.'),
          config: CIRC_KVL(true) },
        { id: 't3-kvl-h1', type: 'h', text: T('Power and energy balance', 'Teho- ja energiatase') },
        { id: 't3-kvl-p2', type: 'text', html: T('<p>For the simple loop with one source <f>V</f> and one resistor, going around parallel to the current gives <f>V − I·R = 0</f>. Multiplying by <f>I</f>:</p>', '<p>Yksinkertaisessa silmukassa, jossa on yksi lähde <f>V</f> ja yksi vastus, kierros virran suuntaan antaa <f>V − I·R = 0</f>. Kerrotaan <f>I</f>:llä:</p>') },
        { id: 't3-kvl-f2', type: 'formula', key: true, tex: 'P_s = V·I = I²·R = P_R,   E_s = P_s·t = P_R·t = E_R', label: T('Power and energy balance', 'Teho- ja energiatase') },
        { id: 't3-kvl-p3', type: 'text', html: T('<p>The energy generated by the source equals the energy consumed in the resistor at the same time. In a real source part of it is converted into heat in <f>r</f> as well.</p>', '<p>Lähteen tuottama energia on yhtä suuri kuin vastuksessa samanaikaisesti kulutettu energia. Todellisessa lähteessä osa energiasta muuttuu lämmöksi myös resistanssissa <f>r</f>.</p>') },
        { id: 't3-kvl-q12', type: 'question', q: 't3-q12' }
      ]
    },
    /* ------------------------------------------------------------ 11 matrix */
    {
      id: 't3-matrix', title: T('Solving networks: simultaneous equations and matrices', 'Verkkojen ratkaisu: yhtälöryhmä ja matriisi'),
      blocks: [
        { id: 't3-mx-p1', type: 'text', html: T(
          '<p>With three unknown branch currents you need at least three <b>independent</b> equations: one KCL and two KVL. Write them in the form <f>A·x = b</f>, solve with a calculator, and check the result with a KCL equation that you did not use.</p>',
          '<p>Kolmelle tuntemattomalle haaravirralle tarvitaan vähintään kolme <b>riippumatonta</b> yhtälöä: yksi KCL- ja kaksi KVL-yhtälöä. Kirjoita ne muotoon <f>A·x = b</f>, ratkaise laskimella ja tarkista tulos KCL-yhtälöllä, jota et käyttänyt.</p>') },
        { id: 't3-mx-list', type: 'list', ordered: true, items: [
          T('Label the unknown branch currents and choose their reference directions.', 'Nimeä tuntemattomat haaravirrat ja valitse niiden vertailusuunnat.'),
          T('Write KCL at (number of nodes − 1) nodes.', 'Kirjoita KCL (solmujen lukumäärä − 1):lle solmulle.'),
          T('Write KVL for independent loops until you have one equation per unknown.', 'Kirjoita KVL riippumattomille silmukoille, kunnes yhtälöitä on yhtä monta kuin tuntemattomia.'),
          T('Collect the coefficients: <f>A·x = b</f>, and solve.', 'Kerää kertoimet: <f>A·x = b</f>, ja ratkaise.'),
          T('Check the result with another KCL equation.', 'Tarkista tulos toisella KCL-yhtälöllä.')
        ] },
        { id: 't3-mx-circ1', type: 'interactive', widget: 'circuit', title: T('The network of the example', 'Esimerkkiverkko'),
          caption: T('Three branches between nodes a and d. The polarities of ε₁ and ε₂ are inferred from the equations (the slide does not show them). The top branch (30 Ω) is I₁ (a → d), the bottom branch I₂ (a → d), the middle branch I₃ flows d → a. Compare the table with the solution below; the simulator shows I₃ with a minus sign because its part arrow points a → d.', 'Kolme haaraa solmujen a ja d välillä. ε₁:n ja ε₂:n navat on pääteltävissä yhtälöistä (kalvolla niitä ei ole piirretty). Ylähaara (30 Ω) on I₁ (a → d), alahaara I₂ (a → d) ja keskihaaran I₃ kulkee d → a. Vertaa taulukkoa alla olevaan ratkaisuun; simulaattori näyttää I₃:n miinusmerkkisenä, koska komponentin nuoli osoittaa a → d.'),
          config: CIRC_MATRIX },
        { id: 't3-mx-build', type: 'interactive', widget: 'custom', title: T('Matrix builder', 'Matriisin rakentaja'),
          caption: T('Hover over or click a coefficient: the circuit elements that produced it are highlighted and explained. Change ε₁, ε₂ or r and see the matrix and the solution update.', 'Vie hiiri kertoimen päälle tai napsauta sitä: sen tuottaneet piirin osat korostuvat ja selitetään. Muuta ε₁:tä, ε₂:ta tai r:ää ja seuraa matriisin ja ratkaisun päivittymistä.'),
          config: W(mountMatrix) },
        { id: 't3-mx-ex1', type: 'example', title: T('Three branch currents by the matrix method', 'Kolme haaravirtaa matriisimenetelmällä'),
          problem: T('Branches between nodes a and d: 30 Ω (I₁, a → d), ε₁ = 80 V with r = 1 Ω and 20 Ω (I₂, a → d), and ε₂ = 45 V with r = 1 Ω and 40 Ω (I₃, d → a). Find I₁, I₂, I₃.', 'Solmujen a ja d välillä on haarat: 30 Ω (I₁, a → d), ε₁ = 80 V ja r = 1 Ω sekä 20 Ω (I₂, a → d), sekä ε₂ = 45 V ja r = 1 Ω sekä 40 Ω (I₃, d → a). Laske I₁, I₂, I₃.'),
          given: ['ε₁ = 80 V', 'ε₂ = 45 V', 'r = 1 Ω', '30 Ω, 40 Ω, 20 Ω'],
          steps: [
            T('KCL at node a (I₁ and I₂ leave, I₃ enters):', 'KCL solmussa a (I₁ ja I₂ lähtevät, I₃ tulee):'),
            { tex: 'I_1 + I_2 − I_3 = 0' },
            T('KVL for the loop d → a → h → d (through the middle branch and the 30 Ω resistor):', 'KVL silmukalle d → a → h → d (keskihaaran ja 30 Ω:n vastuksen kautta):'),
            { tex: 'r·I_3 + 40·I_3 + 30·I_1 = ε_2   →   30·I_1 + 0·I_2 + 41·I_3 = 45' },
            T('KVL for the loop d → f → a → h → d (through the bottom branch and the 30 Ω resistor):', 'KVL silmukalle d → f → a → h → d (alahaaran ja 30 Ω:n vastuksen kautta):'),
            { tex: '−20·I_2 − r·I_2 + 30·I_1 = −ε_1   →   30·I_1 − 21·I_2 + 0·I_3 = −80' },
            T('In matrix form:', 'Matriisimuodossa:'),
            { tex: '[[1, 1, −1], [30, 0, 41], [30, −21, 0]] · [I_1, I_2, I_3] = [0, 45, −80]' },
            T('Solving (calculator or software):', 'Ratkaisu (laskin tai ohjelma):'),
            { tex: 'I_1 = −0.858 A,   I_2 = 2.584 A,   I_3 = 1.725 A' },
            T('Check with KCL: −0.858 + 2.584 − 1.725 = 0 ✓. (The slide printed I₂ = 2.583 A; the exact value 2.5836 A rounds to 2.584 A.)', 'Tarkistus KCL:llä: −0,858 + 2,584 − 1,725 = 0 ✓. (Kalvolla oli I₂ = 2,583 A; tarkka arvo 2,5836 A pyöristyy lukuun 2,584 A.)')
          ],
          result: T('I₁ = −0.858 A (flows d → a), I₂ = 2.584 A, I₃ = 1.725 A', 'I₁ = −0,858 A (kulkee d → a), I₂ = 2,584 A, I₃ = 1,725 A') },
        { id: 't3-mx-q13', type: 'question', q: 't3-q13' },
        { id: 't3-mx-q14', type: 'question', q: 't3-q14' }
      ]
    },
    /* ------------------------------------------------------------ 12 superposition */
    {
      id: 't3-super', title: T('Superposition theorem', 'Superpositioperiaate'),
      blocks: [
        { id: 't3-su-p1', type: 'text', html: T(
          '<p>In a network of <b>linear</b> resistances and several sources, the resulting current in any branch is the algebraic sum of the currents that each source would produce <em>alone</em>. This is the <dfn data-term="superposition">superposition theorem</dfn>. When you consider one source, all the others are replaced by their internal resistances:</p><ul><li>an ideal voltage source becomes a <b>short circuit</b> (a wire),</li><li>an ideal current source becomes an <b>open circuit</b>.</li></ul><p>It is especially handy when there are many sources and many branches.</p>',
          '<p>Verkossa, jossa on <b>lineaarisia</b> resistansseja ja useita lähteitä, kunkin haaran kokonaisvirta on niiden virtojen algebrallinen summa, jotka kukin lähde saisi aikaan <em>yksinään</em>. Tämä on <dfn data-term="superposition">superpositioperiaate</dfn>. Kun tarkastellaan yhtä lähdettä, kaikki muut korvataan sisäisillä resistansseillaan:</p><ul><li>ideaalinen jännitelähde muuttuu <b>oikosuluksi</b> (johtimeksi),</li><li>ideaalinen virtalähde muuttuu <b>avoimeksi piiriksi</b>.</li></ul><p>Menetelmä on erityisen kätevä, kun lähteitä ja haaroja on paljon.</p>') },
        { id: 't3-su-c1', type: 'callout', kind: 'warn', title: T('What superposition cannot do', 'Mihin superpositio ei kelpaa'),
          html: T('<p>Superposition works for <b>currents and voltages</b>, which are linear in the sources. It does <b>not</b> work for power: <f>P = I²·R</f> is quadratic. Calculate power from the final total current.</p>', '<p>Superpositio toimii <b>virroille ja jännitteille</b>, jotka ovat lineaarisia lähteiden suhteen. Se <b>ei</b> toimi teholle: <f>P = I²·R</f> on neliöllinen. Laske teho lopullisesta kokonaisvirrasta.</p>') },
        { id: 't3-su-circ1', type: 'interactive', widget: 'circuit', title: T('Switch a source off', 'Sammuta lähde'),
          caption: T('Draw a wire (〰) across E₂ to replace it with a short circuit: only E₁ drives the network. Read the currents. Then cut the wire and short E₁ instead. Add the two sets of readings and compare with the original (both sources on).', 'Piirrä johdin (〰) E₂:n yli korvataksesi sen oikosululla: vain E₁ ajaa verkkoa. Lue virrat. Poista sitten johdin ja oikosulje E₁. Laske molempien mittausten summa ja vertaa alkuperäiseen tilanteeseen (molemmat lähteet päällä).'),
          config: CIRC_SUPER(false) },
        { id: 't3-su-tog', type: 'interactive', widget: 'custom', title: T('Superposition step by step', 'Superpositio askel askeleelta'),
          caption: T('Show each source alone, then add them. The orange bar added to the blue one gives the green outline. Note that the E₂ branch current is negative: E₂ is being charged. Negative means “against the reference arrow (out of the + terminal into node T)”.', 'Näytä kukin lähde yksinään ja summaa ne sitten. Siniseen palkkiin lisätty oranssi palkki antaa vihreän reunuksen. Huomaa, että E₂-haaran virta on negatiivinen: E₂ latautuu. Negatiivinen tarkoittaa “vertailusuuntaa vastaan (+-navasta solmuun T)”.'),
          config: W(mountSuper) },
        { id: 't3-su-ex1', type: 'example', title: T('Two batteries and a resistor', 'Kaksi paristoa ja vastus'),
          problem: T('E₁ = 4 V with r₁ = 2 Ω, R = 4 Ω, and E₂ = 2 V with r₂ = 1 Ω are connected in parallel between nodes T and B (+ terminals at T). Find the current in each branch.', 'E₁ = 4 V ja r₁ = 2 Ω, R = 4 Ω sekä E₂ = 2 V ja r₂ = 1 Ω on kytketty rinnan solmujen T ja B väliin (+-navat T:ssä). Laske kunkin haaran virta.'),
          given: ['E₁ = 4 V, r₁ = 2 Ω', 'R = 4 Ω', 'E₂ = 2 V, r₂ = 1 Ω'],
          steps: [
            T('<b>Step 1: E₁ only</b> (E₂ replaced by r₂). r₂ is in parallel with R:', '<b>Vaihe 1: vain E₁</b> (E₂ korvattu r₂:lla). r₂ on rinnan R:n kanssa:'),
            { tex: 'R_1 = {4·1}/{4 + 1} = 0.8 Ω,   I_1 = {E_1}/{r_1 + R_1} = {4}/{2.8} = 1.429 A' },
            T('Current division:', 'Virranjako:'),
            { tex: 'I_2 = {1}/{4 + 1}·I_1 = 0.286 A (R),   I_3 = {4}/{4 + 1}·I_1 = 1.143 A (r_2)' },
            T('<b>Step 2: E₂ only</b> (E₁ replaced by r₁). r₁ is in parallel with R:', '<b>Vaihe 2: vain E₂</b> (E₁ korvattu r₁:llä). r₁ on rinnan R:n kanssa:'),
            { tex: 'R_2 = {4·2}/{4 + 2} = 1.333 Ω,   I_4 = {E_2}/{R_2 + r_2} = {2}/{2.333} = 0.857 A' },
            { tex: 'I_5 = {2}/{2 + 4}·I_4 = 0.286 A (R),   I_6 = {4}/{2 + 4}·I_4 = 0.571 A (r_1)' },
            T('<b>Step 3: add</b> (pay attention to directions):', '<b>Vaihe 3: summaa</b> (huomioi suunnat):'),
            { tex: 'E_1 branch: I_1 − I_6 = 1.429 − 0.571 = 0.857 A' },
            { tex: 'R: I_2 + I_5 = 0.286 + 0.286 = 0.571 A' },
            { tex: 'E_2 branch: I_4 − I_3 = 0.857 − 1.143 = −0.286 A' },
            T('The E₂ branch current is negative: E₂ is being <b>charged</b> by E₁. Check with KCL: 0.857 − 0.286 = 0.571 A ✓. (The slide printed 0.572 A and 0.858 A because it added rounded terms; the exact values are 4/7 = 0.5714 A and 6/7 = 0.857 A.)', 'E₂-haaran virta on negatiivinen: E₁ <b>lataa</b> E₂:ta. Tarkistus KCL:llä: 0,857 − 0,286 = 0,571 A ✓. (Kalvolla 0,572 A ja 0,858 A, koska yhteenlaskussa käytettiin pyöristettyjä termejä; tarkat arvot ovat 4/7 = 0,5714 A ja 6/7 = 0,857 A.)')
          ],
          result: T('E₁ branch 0.857 A, R 0.571 A, E₂ branch −0.286 A (E₂ is charged)', 'E₁-haara 0,857 A, R 0,571 A, E₂-haara −0,286 A (E₂ latautuu)') },
        { id: 't3-su-q15', type: 'question', q: 't3-q15' }
      ]
    }
  ];

  /* ================================================================ questions (NO answers here) */
  function opts(arr) { return arr.map(function (o) { return { id: o[0], html: T(o[1], o[2]) }; }); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  var CIRC_TASK_R = (function () {
    var c = clone(CIRC_BATT);
    c.parts[0].editable = false; c.parts[1].editable = false; c.parts[2].value = 4;
    c.answer = { kind: 'value', part: 'RL' };
    return c;
  })();
  var CIRC_TASK_ZERO = (function () { var c = CIRC_SUPER(true); c.answer = { kind: 'value', part: 'R' }; return c; })();

  var QUESTIONS = [
    { id: 't3-q1', mode: 'practice', type: 'mc', difficulty: 1,
      prompt: T('A real voltage source is modelled as an ideal emf <f>ε</f> plus an internal resistance <f>r</f>. How is <f>r</f> connected to the emf?', 'Todellinen jännitelähde mallinnetaan ideaalisena lähdejännitteenä <f>ε</f> ja sisäisenä resistanssina <f>r</f>. Miten <f>r</f> on kytketty lähdejännitteeseen?'),
      options: opts([['a', 'In parallel with the emf', 'Rinnan lähdejännitteen kanssa'], ['b', 'In series with the emf', 'Sarjaan lähdejännitteen kanssa'], ['c', 'Either way – it makes no difference', 'Kumpi tahansa – sillä ei ole väliä']]),
      hints: [T('If r were in parallel with an ideal emf, it would not change the terminal voltage at all.', 'Jos r olisi rinnan ideaalisen lähdejännitteen kanssa, se ei vaikuttaisi napajännitteeseen lainkaan.')] },
    { id: 't3-q2', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.02,
      prompt: T('Measurements on a linear voltage source give a terminal voltage of 9.0 V at a load current of 1.0 A and 6.0 V at 2.0 A. Find the emf, the internal resistance and the short-circuit current.', 'Lineaarisen jännitelähteen mittauksissa napajännite on 9,0 V kuormavirralla 1,0 A ja 6,0 V virralla 2,0 A. Laske lähdejännite, sisäinen resistanssi ja oikosulkuvirta.'),
      fields: [{ id: 'eps', tex: 'ε', unit: 'V' }, { id: 'r', tex: 'r', unit: 'Ω' }, { id: 'Isc', tex: 'I_{sc}', unit: 'A' }],
      hints: [T('The slope of V(I) is −r.', 'V(I)-suoran kulmakerroin on −r.')] },
    { id: 't3-q3', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.02,
      prompt: T('A battery with <f>ε = 9.0 V</f> and <f>r = 0.50 Ω</f> delivers a load current of 3.0 A. Find the terminal voltage and the load resistance.', 'Paristolla <f>ε = 9,0 V</f> ja <f>r = 0,50 Ω</f> kuormavirta on 3,0 A. Laske napajännite ja kuormaresistanssi.'),
      fields: [{ id: 'V', tex: 'V', unit: 'V' }, { id: 'R', tex: 'R', unit: 'Ω' }] },
    { id: 't3-q4', mode: 'practice', type: 'slider', difficulty: 2, tol: 0.05,
      prompt: T('For this source (<f>ε = 12 V</f>, <f>r = 3 Ω</f>) adjust the load current until the terminal voltage is half of the emf. Which current is that?', 'Säädä tämän lähteen (<f>ε = 12 V</f>, <f>r = 3 Ω</f>) kuormavirta niin, että napajännite on puolet lähdejännitteestä. Mikä virta se on?'),
      widget: { name: 'plot', config: {
        x: { min: 0, max: 4, label: T('Load current I', 'Kuormavirta I'), unit: 'A' }, y: { min: 0, max: 12, label: T('Terminal voltage V', 'Napajännite V'), unit: 'V' },
        params: [{ id: 'I', tex: 'I', min: 0, max: 4, step: 0.05, value: 0.5, unit: 'A' }],
        curves: [{ fn: function (x) { return 12 - 3 * x; }, label: T('V = ε − r·I', 'V = ε − r·I') }],
        points: function (p) { return [{ x: p.I, y: 12 - 3 * p.I, label: 'V' }]; },
        readouts: function (p) { return [{ tex: 'V', value: 12 - 3 * p.I, unit: 'V' }]; },
        answer: function (p) { return { v: p.I }; }
      } } },
    { id: 't3-q5', mode: 'practice', type: 'circuit', difficulty: 2, tol: 0.03,
      prompt: T('The battery has <f>ε = 6 V</f> and an internal resistance. Adjust the load <f>R</f> (click it) until the voltmeter reads 4.5 V.', 'Paristolla on lähdejännite <f>ε = 6 V</f> ja sisäinen resistanssi. Säädä kuormaa <f>R</f> (napsauta sitä), kunnes volttimittari näyttää 4,5 V.'),
      hints: [T('Read r from the diagram and use V = ε − r·I.', 'Lue r kuvasta ja käytä kaavaa V = ε − r·I.')],
      widget: { name: 'circuit', config: CIRC_TASK_R } },
    { id: 't3-q6', mode: 'practice', type: 'match', difficulty: 1,
      prompt: T('Match each loading case with its description.', 'Yhdistä kuormitustapaus ja sen kuvaus.'),
      left: [{ id: 'open', html: T('open circuit', 'tyhjäkäynti') }, { id: 'nom', html: T('nominal load', 'nimelliskuorma') }, { id: 'short', html: T('short circuit', 'oikosulku') }],
      right: [{ id: 's', html: T('<f>V = 0</f>, <f>I = ε/r</f>', '<f>V = 0</f>, <f>I = ε/r</f>') }, { id: 'o', html: T('<f>I = 0</f>, <f>V = ε</f>', '<f>I = 0</f>, <f>V = ε</f>') }, { id: 'n', html: T('<f>ε = I·r + I·R</f>', '<f>ε = I·r + I·R</f>') }, { id: 'x', html: T('load power = ε²/r for any R', 'kuorman teho = ε²/r millä tahansa R:llä') }] },
    { id: 't3-q7', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.02,
      prompt: T('A linear current source has <f>I_s = 2.0 A</f> and <f>r = 10 Ω</f> in parallel. The terminal voltage is 15 V. Find the external current and the current through r.', 'Lineaarisen virtalähteen <f>I_s = 2,0 A</f> ja rinnakkaisresistanssi <f>r = 10 Ω</f>. Napajännite on 15 V. Laske ulkoinen virta ja r:n läpi kulkeva virta.'),
      fields: [{ id: 'I', tex: 'I', unit: 'A' }, { id: 'Ir', tex: 'I_r', unit: 'A' }] },
    { id: 't3-q8', mode: 'practice', type: 'match', difficulty: 1,
      prompt: T('Use the electrode-potential table to match each cell with its voltage.', 'Yhdistä jännitesarjataulukon avulla kukin kenno sen jännitteeseen.'),
      left: [{ id: 'cuzn', html: T('Cu–Zn', 'Cu–Zn') }, { id: 'agzn', html: T('Ag–Zn', 'Ag–Zn') }, { id: 'cufe', html: T('Cu–Fe', 'Cu–Fe') }],
      right: [{ id: 'a', html: T('1.10 V', '1,10 V') }, { id: 'b', html: T('1.56 V', '1,56 V') }, { id: 'c', html: T('0.78 V', '0,78 V') }, { id: 'd', html: T('0.46 V', '0,46 V') }] },
    { id: 't3-q9', mode: 'practice', type: 'numeric', difficulty: 3, tol: 0.02,
      prompt: T('Three identical cells (<f>1.5 V</f>, <f>0.60 Ω</f> each) are connected in parallel and feed a resistor <f>R = 1.8 Ω</f>. Find the total current, the current through one cell and the terminal voltage.', 'Kolme samanlaista kennoa (kukin <f>1,5 V</f>, <f>0,60 Ω</f>) on kytketty rinnan ja ne syöttävät vastusta <f>R = 1,8 Ω</f>. Laske kokonaisvirta, yhden kennon virta ja napajännite.'),
      fields: [{ id: 'I', tex: 'I', unit: 'A' }, { id: 'In', tex: 'I_n', unit: 'A' }, { id: 'V', tex: 'V', unit: 'V' }],
      hints: [T('Cells in parallel share the same terminals: first replace the three cells by one equivalent source.', 'Rinnan kytketyt kennot ovat samoissa navoissa: korvaa ensin kolme kennoa yhdellä ekvivalenttilähteellä.'),
        T('The equivalent emf stays that of one cell, but the internal resistances combine like parallel resistors. Then use I = E/(r + R).', 'Ekvivalenttilähteen lähdejännite on yhden kennon lähdejännite, mutta sisäiset resistanssit yhdistyvät kuten rinnan kytketyt vastukset. Käytä sitten kaavaa I = E/(r + R).'),
        T('The identical cells share the total current equally. For the terminal voltage use V = R·I.', 'Samanlaiset kennot jakavat kokonaisvirran tasan. Napajännite saadaan kaavasta V = R·I.')] },
    { id: 't3-q10', mode: 'practice', type: 'multi', difficulty: 2,
      prompt: T('Which statements about Kirchhoff’s laws are correct? Select all that apply.', 'Mitkä väitteet Kirchhoffin laeista ovat oikein? Valitse kaikki oikeat.'),
      options: opts([
        ['a', 'At a node, the sum of entering currents equals the sum of leaving currents.', 'Solmussa tulevien virtojen summa on yhtä suuri kuin lähtevien virtojen summa.'],
        ['b', 'A resistor “uses up” current, so less current leaves it than enters it.', 'Vastus “kuluttaa” virtaa, joten siitä lähtee vähemmän virtaa kuin siihen tulee.'],
        ['c', 'The algebraic sum of the potential changes around any closed loop is zero.', 'Potentiaalin muutosten algebrallinen summa mihin tahansa suljettuun silmukkaan on nolla.'],
        ['d', 'KVL is valid only for loops that contain no sources.', 'KVL pätee vain silmukoille, joissa ei ole lähteitä.'],
        ['e', 'A negative result for a branch current means that it flows opposite to the chosen reference arrow.', 'Negatiivinen haaravirran tulos tarkoittaa, että virta kulkee valittua vertailunuolta vastaan.']]) },
    { id: 't3-q11', mode: 'graded', type: 'numeric', difficulty: 2, points: 3, tol: 0.02,
      prompt: T('9 A enters node a and 14 A enters node b. 11 A flows from a to c. The current I₁ flows from a to b, I₂ flows from b to c, and at node c 5 A leaves to the right while I₃ leaves on the other branch. Find I₁, I₂ and I₃ (a negative sign means the current flows opposite to its arrow).', 'Solmuun a tulee 9 A ja solmuun b 14 A. Solmusta a solmuun c kulkee 11 A. Virta I₁ kulkee a:sta b:hen, I₂ b:stä c:hen, ja solmusta c lähtee oikealle 5 A sekä toista haaraa pitkin I₃. Laske I₁, I₂ ja I₃ (negatiivinen merkki tarkoittaa, että virta kulkee nuolta vastaan).'),
      figure: { svg: FIG_NODES(['9 A', '11 A', '14 A', '5 A']), caption: T('Junctions a, b and c', 'Solmut a, b ja c') },
      fields: [{ id: 'I1', tex: 'I_1', unit: 'A' }, { id: 'I2', tex: 'I_2', unit: 'A' }, { id: 'I3', tex: 'I_3', unit: 'A' }] },
    { id: 't3-q12', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.02,
      prompt: T('In a single loop two batteries <f>E₁ = 20 V</f> and <f>E₂ = 5 V</f> have the same orientation (they oppose each other). The resistors in the loop are <f>R₁ = 4 Ω</f>, <f>R₂ = 3 Ω</f> and <f>R₃ = 8 Ω</f>. Find the loop current and the voltage across R₃.', 'Yhdessä silmukassa kaksi paristoa <f>E₁ = 20 V</f> ja <f>E₂ = 5 V</f> on suunnattu samoin (ne vastustavat toisiaan). Silmukan vastukset ovat <f>R₁ = 4 Ω</f>, <f>R₂ = 3 Ω</f> ja <f>R₃ = 8 Ω</f>. Laske silmukkavirta ja R₃:n jännite.'),
      fields: [{ id: 'I', tex: 'I', unit: 'A' }, { id: 'U3', tex: 'U_3', unit: 'V' }] },
    { id: 't3-q13', mode: 'practice', type: 'order', difficulty: 1,
      prompt: T('Put the steps of the matrix method for a network in a sensible order.', 'Järjestä verkon matriisimenetelmän vaiheet järkevään järjestykseen.'),
      items: [
        { id: 's3', html: T('Write KVL for independent loops', 'Kirjoita KVL riippumattomille silmukoille') },
        { id: 's5', html: T('Check the result with another KCL equation', 'Tarkista tulos toisella KCL-yhtälöllä') },
        { id: 's1', html: T('Label the unknown currents and choose their directions', 'Nimeä tuntemattomat virrat ja valitse suunnat') },
        { id: 's4', html: T('Form <f>A·x = b</f> and solve it', 'Muodosta <f>A·x = b</f> ja ratkaise se') },
        { id: 's2', html: T('Write KCL at a node', 'Kirjoita KCL solmulle') }] },
    { id: 't3-q14', mode: 'practice', type: 'fill', difficulty: 3,
      prompt: T('In the matrix example (ε₁ = 80 V, ε₂ = 45 V, r = 1 Ω; 30 Ω top branch, 40 Ω middle branch, 20 Ω bottom branch) the loop through the middle and top branches reads as below. Fill in the coefficients.', 'Matriisiesimerkissä (ε₁ = 80 V, ε₂ = 45 V, r = 1 Ω; ylähaarassa 30 Ω, keskihaarassa 40 Ω, alahaarassa 20 Ω) keski- ja ylähaaran kautta kulkevan silmukan yhtälö on alla. Täydennä kertoimet.'),
      text: T('30·I₁ + [[a]]·I₂ + [[b]]·I₃ = [[c]]', '30·I₁ + [[a]]·I₂ + [[b]]·I₃ = [[c]]'),
      fields: [{ id: 'a', kind: 'num' }, { id: 'b', kind: 'num', unit: 'Ω' }, { id: 'c', kind: 'num', unit: 'V' }],
      hints: [T('Write KVL for the loop first: go around it and add up the resistances that the loop passes together with the current in each of them.', 'Kirjoita ensin silmukalle KVL: kierrä silmukka ja merkitse muistiin sen läpi kulkemat resistanssit sekä kussakin kulkeva virta.'),
        T('Ask for each current whether the loop passes through its branch. A branch that the loop does not enter gets the coefficient zero.', 'Kysy jokaisen virran kohdalla, kulkeeko silmukka sen haaran kautta. Haara, jota silmukka ei käy läpi, saa kertoimen nolla.'),
        T('The middle branch contains both a resistor and an internal resistance in series: add them. The right-hand side is the emf (or the difference of emfs) in the loop.', 'Keskihaarassa on sarjassa sekä vastus että sisäinen resistanssi: laske ne yhteen. Oikea puoli on silmukan lähdejännite (tai lähdejännitteiden erotus).')] },
    { id: 't3-q15', mode: 'practice', type: 'numeric', difficulty: 3, tol: 0.02,
      prompt: T('Use the network of the example but with <f>E₁ = 6 V</f>, <f>r₁ = 1 Ω</f>, <f>R = 2 Ω</f> and <f>r₂ = 2 Ω</f>. With only E₁ active (E₂ replaced by r₂) find the current delivered by E₁ and the part of it that flows through R.', 'Käytä esimerkkiverkkoa arvoilla <f>E₁ = 6 V</f>, <f>r₁ = 1 Ω</f>, <f>R = 2 Ω</f> ja <f>r₂ = 2 Ω</f>. Kun vain E₁ on päällä (E₂ korvattu r₂:lla), laske E₁:n antama virta ja sen R:n läpi kulkeva osuus.'),
      figure: { svg: figBranches(['E₁', 'r₁'], 'R', ['E₂', 'r₂']), caption: T('Three branches between T and B', 'Kolme haaraa solmujen T ja B välillä') },
      fields: [{ id: 'I1', tex: 'I_1', unit: 'A' }, { id: 'IR', tex: 'I_R', unit: 'A' }],
      hints: [T('Only E₁ is active, so E₂ is replaced by its internal resistance r₂. Then r₂ and R are in parallel.', 'Vain E₁ on päällä, joten E₂ korvataan sisäisellä resistanssillaan r₂. Silloin r₂ ja R ovat rinnan.'),
        T('Combine r₂ and R into one parallel resistance and add it in series with r₁. Then I₁ = E₁/(total resistance).', 'Yhdistä r₂ ja R yhdeksi rinnakkaisresistanssiksi ja kytke se sarjaan r₁:n kanssa. Silloin I₁ = E₁/(kokonaisresistanssi).'),
        T('I₁ splits between r₂ and R as a current divider: the larger share goes through the smaller resistance. I_R = I₁·r₂/(R + r₂).', 'I₁ jakautuu r₂:n ja R:n kesken virranjakona: suurempi osuus kulkee pienemmän resistanssin kautta. I_R = I₁·r₂/(R + r₂).')] },
    /* ---- graded ---- */
    { id: 't3-q16', mode: 'graded', type: 'numeric', difficulty: 2, points: 3, tol: 0.02,
      prompt: T('A battery with <f>ε = 6.0 V</f> and <f>r = 2.0 Ω</f> drives a resistor <f>R = 4.0 Ω</f>. Find the current, the terminal voltage and the power dissipated in R.', 'Paristo, jonka <f>ε = 6,0 V</f> ja <f>r = 2,0 Ω</f>, syöttää vastusta <f>R = 4,0 Ω</f>. Laske virta, napajännite ja vastuksessa R kuluva teho.'),
      fields: [{ id: 'I', tex: 'I', unit: 'A' }, { id: 'V', tex: 'V', unit: 'V' }, { id: 'P', tex: 'P_R', unit: 'W' }] },
    { id: 't3-q17', mode: 'graded', type: 'numeric', difficulty: 1, points: 2, tol: 0.01,
      prompt: T('Four identical cells (<f>1.2 V</f>, <f>0.050 Ω</f> each) are connected in series. Give the emf and the internal resistance of the battery.', 'Neljä samanlaista kennoa (kukin <f>1,2 V</f>, <f>0,050 Ω</f>) on kytketty sarjaan. Anna pariston lähdejännite ja sisäinen resistanssi.'),
      fields: [{ id: 'E', tex: 'E', unit: 'V' }, { id: 'r', tex: 'r', unit: 'Ω' }] },
    { id: 't3-q18', mode: 'graded', type: 'numeric', difficulty: 3, points: 3, tol: 0.02,
      prompt: T('Three branches are connected between nodes T and B: <f>E₁ = 10 V</f> in series with <f>R₁ = 2 Ω</f>, <f>E₂ = 6 V</f> in series with <f>R₂ = 4 Ω</f>, and <f>R₃ = 6 Ω</f> alone. The + terminals of both sources are at T. Find the current through R₃ (from T to B) and the voltage across it.', 'Solmujen T ja B väliin on kytketty kolme haaraa: <f>E₁ = 10 V</f> ja sen kanssa sarjassa <f>R₁ = 2 Ω</f>, <f>E₂ = 6 V</f> ja sen kanssa sarjassa <f>R₂ = 4 Ω</f>, sekä pelkkä <f>R₃ = 6 Ω</f>. Molempien lähteiden +-navat ovat T:ssä. Laske R₃:n läpi kulkeva virta (T:stä B:hen) ja sen jännite.'),
      figure: { svg: figBranches(['E₁', 'R₁'], 'R₃', ['E₂', 'R₂']), caption: T('Three branches between T and B', 'Kolme haaraa solmujen T ja B välillä') },
      fields: [{ id: 'I3', tex: 'I_3', unit: 'A' }, { id: 'U', tex: 'V_{TB}', unit: 'V' }],
      hints: [T('Three branches share the nodes T and B, so one unknown, the node voltage V_TB, is enough (node-voltage method).', 'Kolmella haaralla on samat solmut T ja B, joten yksi tuntematon, solmujännite V_TB, riittää (solmupistemenetelmä).'),
        T('Write KCL at T: express each branch current using V_TB, for example (E − V_TB)/R for a branch with a source, and V_TB/R₃ for the lone resistor.', 'Kirjoita KCL solmussa T: ilmaise jokainen haaravirta V_TB:n avulla, esimerkiksi (E − V_TB)/R lähteellisessä haarassa ja V_TB/R₃ pelkän vastuksen haarassa.'),
        T('Solve V_TB from the KCL equation (the currents leaving T sum to zero). Then I₃ = V_TB/R₃. Alternatively use two loop equations.', 'Ratkaise V_TB KCL-yhtälöstä (solmusta T lähtevien virtojen summa on nolla). Sitten I₃ = V_TB/R₃. Voit käyttää myös kahta silmukkayhtälöä.')] },
    { id: 't3-q19', mode: 'graded', type: 'numeric', difficulty: 3, points: 3, tol: 0.02,
      prompt: T('Use superposition. <f>E₁ = 6 V</f> with <f>r₁ = 1 Ω</f>, <f>R = 3 Ω</f>, and <f>E₂ = 3 V</f> with <f>r₂ = 2 Ω</f> are connected in parallel between T and B (+ terminals at T). Find the current through R (from T to B) and the current of the E₂ branch, taken positive when it flows out of the + terminal of E₂ into node T (negative = E₂ is being charged).', 'Käytä superpositiota. <f>E₁ = 6 V</f> ja <f>r₁ = 1 Ω</f>, <f>R = 3 Ω</f> sekä <f>E₂ = 3 V</f> ja <f>r₂ = 2 Ω</f> on kytketty rinnan solmujen T ja B väliin (+-navat T:ssä). Laske R:n läpi kulkeva virta (T:stä B:hen) ja E₂-haaran virta, joka on positiivinen, kun se kulkee E₂:n +-navasta solmuun T (negatiivinen = E₂ latautuu).'),
      figure: { svg: figBranches(['E₁', 'r₁'], 'R', ['E₂', 'r₂']), caption: T('Three branches between T and B', 'Kolme haaraa solmujen T ja B välillä') },
      fields: [{ id: 'IR', tex: 'I_R', unit: 'A' }, { id: 'I2', tex: 'I_{E2}', unit: 'A' }],
      hints: [T('Superposition: let one source act at a time and replace the other by its internal resistance, then add the results with their signs.', 'Superpositio: anna yhden lähteen vaikuttaa kerrallaan ja korvaa toinen sisäisellä resistanssillaan, sitten summaa tulokset etumerkkeineen.'),
        T('With only E₁: total resistance is r₁ in series with R ∥ r₂. Find the source current, then split it with the current divider to get the part through R and the part through the E₂ branch.', 'Vain E₁: kokonaisresistanssi on r₁ sarjassa R ∥ r₂:n kanssa. Laske lähteen virta ja jaa se virranjaolla R:n ja E₂-haaran osuuksiin.'),
        T('Repeat with only E₂ (then r₁ ∥ R). Take care of directions: define one reference direction per branch and give each partial current a sign relative to it before adding.', 'Toista vain E₂ päällä (silloin r₁ ∥ R). Huomioi suunnat: valitse jokaiselle haaralle yksi vertailusuunta ja anna osavirroille etumerkki sen mukaan ennen yhteenlaskua.')] },
    { id: 't3-q20', mode: 'graded', type: 'circuit', difficulty: 3, points: 2, tol: 0.03,
      prompt: T('In the network E₁ = 4 V (r₁ = 2 Ω) and E₂ = 2 V (r₂ = 1 Ω) are connected in parallel with the resistor R. Adjust R (click it) until the ammeter in the E₂ branch reads zero, so that E₂ neither supplies nor absorbs current.', 'Verkossa E₁ = 4 V (r₁ = 2 Ω) ja E₂ = 2 V (r₂ = 1 Ω) on kytketty rinnan vastuksen R kanssa. Säädä R:ää (napsauta sitä), kunnes E₂-haaran virtamittari näyttää nollaa, jolloin E₂ ei anna eikä vastaanota virtaa.'),
      hints: [T('If the ammeter reads zero, no current flows through the E₂ branch, so its internal resistance has no voltage drop.', 'Jos virtamittari näyttää nollaa, E₂-haarassa ei kulje virtaa, joten sisäisellä resistanssilla ei ole jännitehäviötä.'),
        T('Then the node voltage V_T equals E₂. Use it to find the current in the E₁ branch: (E₁ − V_T)/r₁.', 'Silloin solmujännite V_T on yhtä suuri kuin E₂. Laske sen avulla E₁-haaran virta: (E₁ − V_T)/r₁.'),
        T('By KCL at node T all of the E₁ branch current goes through R. Use R = V_T/I.', 'KCL:n mukaan solmussa T koko E₁-haaran virta kulkee R:n läpi. Käytä kaavaa R = V_T/I.')],
      widget: { name: 'circuit', config: CIRC_TASK_ZERO } }
  ];

  /* ================================================================ glossary and formulas */
  function G(en, fi, sym, den, dfi) { return { en: en, fi: fi, sym: sym, def: T(den, dfi) }; }
  var GLOSSARY = {
    voltage_source: G('voltage source', 'jännitelähde', '', 'Source that tries to keep its terminal voltage constant; modelled as an emf in series with r.', 'Lähde, joka pyrkii pitämään napajännitteensä vakiona; mallinnetaan lähdejännitteenä ja sen kanssa sarjassa olevana r:nä.'),
    current_source: G('current source', 'virtalähde', 'I_s', 'Source that tries to keep its current constant; modelled as I_s in parallel with r.', 'Lähde, joka pyrkii pitämään virtansa vakiona; mallinnetaan lähdevirtana I_s ja sen kanssa rinnan olevana r:nä.'),
    emf: G('electromotive force (emf)', 'lähdejännite (sähkömotorinen voima)', 'ε, E', 'Voltage between the terminals of a source with no load.', 'Lähteen napojen välinen jännite ilman kuormaa.'),
    terminal_voltage: G('terminal voltage', 'napajännite', 'V = ε − I·r', 'Voltage between the terminals of a loaded source.', 'Kuormitetun lähteen napojen välinen jännite.'),
    open_circuit_voltage: G('open-circuit voltage', 'tyhjä\u00ADkäynti\u00ADjännite', 'V_o', 'Terminal voltage when no current flows; equals the emf.', 'Napajännite, kun virtaa ei kulje; yhtä suuri kuin lähdejännite.'),
    internal_resistance: G('internal resistance', 'sisäinen resistanssi', 'r', 'Resistance inside a source; causes the voltage drop r·I.', 'Lähteen sisällä oleva resistanssi; aiheuttaa jännitehäviön r·I.'),
    short_circuit: G('short circuit', 'oikosulku', 'R = 0', 'A connection of negligible resistance across a source or component; usually a fault.', 'Lähteen tai komponentin yli tehty mitättömän pienen resistanssin yhteys; yleensä vika.'),
    short_circuit_current: G('short-circuit current', 'oikosulkuvirta', 'I_sc = ε/r', 'Current of a source when its terminals are shorted (V = 0).', 'Lähteen virta, kun navat oikosuljetaan (V = 0).'),
    load: G('load', 'kuorma', 'R', 'The component or circuit that takes power from a source.', 'Komponentti tai piiri, joka ottaa tehoa lähteestä.'),
    nominal_load: G('nominal load', 'nimelliskuorma', '', 'Normal operating load that limits the current to its design value.', 'Normaali käyttökuorma, joka rajoittaa virran suunnitteluarvoonsa.'),
    ideal_source: G('ideal source', 'ideaalinen lähde', 'r = 0', 'Voltage source with r = 0 (or current source with infinite r).', 'Jännitelähde, jonka r = 0 (tai virtalähde, jonka r on ääretön).'),
    linear_source: G('linear source', 'lineaarinen lähde', '', 'Source with constant internal resistance: straight I,V line.', 'Lähde, jonka sisäinen resistanssi on vakio: suora virta-jännite-ominaiskäyrä.'),
    iv_line: G('I,V characteristic', 'virta-jännite-ominaiskäyrä', '', 'Graph of terminal voltage against load current of a source.', 'Lähteen napajännitteen kuvaaja kuormavirran funktiona.'),
    electrochemical_series: G('electrochemical series', 'jännitesarja', '', 'Elements ordered by electrode potential; cell voltage = V(cathode) − V(anode).', 'Alkuaineet elektrodipotentiaalin mukaan järjestettynä; kennojännite = V(katodi) − V(anodi).'),
    anode: G('anode', 'anodi', '', 'Negative electrode of a galvanic cell where the metal dissolves.', 'Galvaanisen kennon negatiivinen elektrodi, jossa metalli liukenee.'),
    cathode: G('cathode', 'katodi', '', 'Positive electrode of a galvanic cell where ions take electrons.', 'Galvaanisen kennon positiivinen elektrodi, jossa ionit ottavat vastaan elektroneja.'),
    node: G('node (junction)', 'solmu', '', 'Point where two or more branches meet.', 'Piste, jossa kaksi tai useampi haara kohtaa.'),
    branch: G('branch', 'haara', '', 'Path between two nodes carrying one current.', 'Kahden solmun välinen reitti, jossa kulkee yksi virta.'),
    loop: G('loop', 'silmukka', '', 'Closed path through a network.', 'Suljettu reitti verkossa.'),
    kcl: G("Kirchhoff's current law", 'Kirchhoffin virtalaki (solmupistelaki)', 'ΣI = 0', 'Sum of currents entering a node equals sum leaving it (conservation of charge).', 'Solmuun tulevien virtojen summa on yhtä suuri kuin siitä lähtevien (varauksen säilyminen).'),
    kvl: G("Kirchhoff's voltage law", 'Kirchhoffin jännitelaki (silmukkalaki)', 'ΣΔV = 0', 'Sum of potential changes around a closed loop is zero (conservation of energy).', 'Potentiaalin muutosten summa suljetussa silmukassa on nolla (energian säilyminen).'),
    voltage_drop: G('voltage drop', 'jännitehäviö', 'I·R', 'Potential decrease across a resistor along the current direction.', 'Potentiaalin lasku vastuksen yli virran suuntaan.'),
    superposition: G('superposition theorem', 'superpositioperiaate', '', 'In a linear network the total response is the sum of the responses to each source acting alone.', 'Lineaarisessa verkossa kokonaisvaste on kunkin lähteen yksinään aiheuttamien vasteiden summa.'),
    current_division: G('current division', 'virranjako', 'I_1 = I·R_2/(R_1+R_2)', 'How a current splits between parallel resistors.', 'Miten virta jakautuu rinnakkaisten vastusten kesken.'),
    controlled_source: G('controlled source', 'ohjattu lähde', '', 'Source whose value depends on another voltage or current; not covered on this course.', 'Lähde, jonka arvo riippuu toisesta jännitteestä tai virrasta; ei kuulu tämän kurssin sisältöön.'),
    matrix_method: G('matrix method', 'matriisimenetelmä', 'A·x = b', 'Writing the KCL/KVL equations as a matrix equation and solving for the currents.', 'KCL- ja KVL-yhtälöiden kirjoittaminen matriisiyhtälöksi ja virtojen ratkaiseminen.'),
    power_balance: G('power balance', 'tehotase', 'P_s = P_R', 'Power generated by sources equals power consumed in the circuit.', 'Lähteiden tuottama teho on yhtä suuri kuin piirissä kulutettu teho.'),
    solar_cell: G('solar cell', 'aurinkokenno', '', 'Semiconductor device that turns light into electric current; an imperfect current source.', 'Puolijohdekomponentti, joka muuttaa valon sähkövirraksi; epätäydellinen virtalähde.'),
    generator: G('generator', 'generaattori', '', 'Machine that turns mechanical energy into electrical energy by induction.', 'Kone, joka muuttaa mekaanista energiaa sähköenergiaksi induktion avulla.')
  };
  var FORMULAS = [
    { name: T('Terminal voltage of a voltage source', 'Jännitelähteen napajännite'), tex: 'V = ε − I·r' },
    { name: T('Short-circuit current', 'Oikosulkuvirta'), tex: 'I_{sc} = {ε}/{r}' },
    { name: T('Current source', 'Virtalähde'), tex: 'I = I_s − {V}/{r}' },
    { name: T('Cell voltage', 'Kennojännite'), tex: 'V = V_{cathode} − V_{anode}' },
    { name: T('Sources in series', 'Lähteet sarjassa'), tex: 'E = n·E_n,   r = n·r_n' },
    { name: T('Sources in parallel', 'Lähteet rinnan'), tex: 'E = E_n,   r = {r_n}/{n},   I = n·I_n' },
    { name: T('Kirchhoff’s current law', 'Kirchhoffin virtalaki'), tex: 'Σ I = 0' },
    { name: T('Kirchhoff’s voltage law', 'Kirchhoffin jännitelaki'), tex: 'Σ ΔV = 0' },
    { name: T('Power balance of a loop', 'Silmukan tehotase'), tex: 'V·I = I²·R' },
    { name: T('Matrix form', 'Matriisimuoto'), tex: 'A·x = b' },
    { name: T('Current division (two resistors)', 'Virranjako (kaksi vastusta)'), tex: 'I_1 = {R_2}/{R_1 + R_2}·I' }
  ];

  TDC.registerTopic({
    id: 't3', num: 3,
    title: T('Voltage and current sources, DC circuits and Kirchhoff’s rules', 'Jännite- ja virtalähteet, tasavirtapiirit ja Kirchhoffin lait'),
    subtitle: T('From a battery with internal resistance to solving whole networks.', 'Sisäisen resistanssin omaavasta paristosta kokonaisten verkkojen ratkaisemiseen.'),
    objectives: [
      T('describe a real voltage source with emf and internal resistance and read its I,V line', 'kuvata todellisen jännitelähteen lähdejännitteen ja sisäisen resistanssin avulla ja lukea sen ominaiskäyrää'),
      T('model current sources and compare them with voltage sources', 'mallintaa virtalähteitä ja verrata niitä jännitelähteisiin'),
      T('combine identical sources in series and in parallel', 'yhdistää samanlaisia lähteitä sarjaan ja rinnan'),
      T('apply Kirchhoff’s current and voltage laws to nodes and loops', 'soveltaa Kirchhoffin virta- ja jännitelakia solmuihin ja silmukoihin'),
      T('solve a network with simultaneous equations and a matrix', 'ratkaista verkko yhtälöryhmällä ja matriisilla'),
      T('use the superposition theorem', 'käyttää superpositioperiaatetta')
    ],
    glossary: GLOSSARY,
    formulas: FORMULAS,
    sections: SECTIONS,
    questions: QUESTIONS
  });
})();

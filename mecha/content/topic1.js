/* Topic 1: SI system and significant figures. Source: source/extracted/topic1-si-system-significant-figures.md (EN theory deck
 * p03-p09, exercise sets A1 (s.f.) and B1-B4 (dimension check, braking distance, piston 1.2, cube 1.5)); errata in
 * source/extracted/PDF-ERRATA.md applied (spelling, symbol I_v, magnetic flux density, absorbed dose).
 * NO answers in this file: they live in src/answers/topic1.json. Block ids are stable; never rename. */
(function () {
  'use strict';
  function T(en, fi) { return { en: en, fi: fi }; }

  // ---------------------------------------------------------------- shared helpers of the device widgets (as in topic2.js)
  function dev(def, vals) { return { mount: function (h, c) { return TDC.mechViz.device(def, vals).mount(h, c); } }; }
  function nf(v, d) { return TDC.util.fmtNum(v, d || 3); }
  function fsz(w) { return Math.max(11, Math.min(14, Math.round(w / 48))); }
  function line(g, x1, y1, x2, y2) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function font(g, px, it) {
    g.font = it ? 'italic 600 ' + px + 'px ' + TDC.theme.color('--font-math') : '600 ' + px + 'px ' + getComputedStyle(document.body).fontFamily;
  }
  function mono(g, px) { g.font = '700 ' + px + 'px ' + TDC.theme.color('--font-mono'); }
  /** Canvas label (SI typography): letter runs = quantity symbols (with _subscripts) italic; digits, operators and the
   *  tail (" = 12 N", words) upright. align 'left' | 'center' | 'right'; bg = backdrop colour. */
  function lab() { return TDC.mechViz.lab.apply(null, arguments); }   // canvas label in SI typography (viz/mech-common.js)
  /** Language-neutral numbers in a canvas/readout string: 1.5 stays 1.5 in EN and becomes 1,5 in FI. */
  function ln(s) { return TDC.i18n.localNum(String(s)); }
  function tx2(ctx, en, fi) { return ln(ctx.tx(T(en, fi))); }
  var SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  function sup(n) { return String(n).split('').map(function (c) { return SUP[c] || c; }).join(''); }

  // ---------------------------------------------------------------- exact decimal engine of the s.f. calculator (BigInt, no float rounding)
  var SF = (function () {
    var P10 = function (k) { return 10n ** BigInt(k); };
    /** "0.0577" | "70" | "6,080" -> {digits, rules, counts, n, dec, ...} or null (not a positive decimal number). */
    function parse(str) {
      var s = String(str == null ? '' : str).trim().replace(',', '.');
      if (s.length > 30) return null;   // BigInt powers of a pasted 100 000-digit number would hang the tab
      if (!/^(\d+\.?\d*|\.\d+)$/.test(s)) return null;
      var pt = s.indexOf('.') >= 0, ip = pt ? s.split('.')[0] : s, fp = pt ? s.split('.')[1] : '', d = ip + fp;
      var first = d.search(/[1-9]/); if (first < 0) return null;
      var last = d.length - 1 - d.split('').reverse().join('').search(/[1-9]/), rules = [], counts = [];
      for (var i = 0; i < d.length; i++) {
        var r = i < first ? 3 : d[i] !== '0' ? 1 : i > last ? 4 : 2;
        rules.push(r); counts.push(r === 1 || r === 2 || (r === 4 && pt));
      }
      return { s: s, ip: ip, fp: fp, pt: pt, d: d, rules: rules, counts: counts, n: counts.filter(Boolean).length,
        dec: fp.length, q: BigInt(d), p: -fp.length, e0: ip.length - 1 - first };
    }
    function dec(q, p) {              // BigInt q with the weight 10^p as a plain decimal string
      var s = q.toString(); if (p >= 0) return s + '0'.repeat(p);
      var f = -p; if (s.length <= f) s = '0'.repeat(f - s.length + 1) + s;
      return s.slice(0, s.length - f) + '.' + s.slice(s.length - f);
    }
    function rnd(q, p, pr) {          // round half up at the weight 10^pr
      if (pr <= p) return { q: q * P10(p - pr), p: pr, tie: false };
      var d = P10(pr - p), qq = q / d, r = q % d;
      return { q: r * 2n >= d ? qq + 1n : qq, p: pr, tie: r * 2n === d };
    }
    function calc(A, B, op) {
      var R = { op: op, sign: 1 };
      if (op === '×') { R.q = A.q * B.q; R.p = A.p + B.p; }
      else if (op === '÷') { var big = A.q * P10(25); R.q = big / B.q; R.p = A.p - B.p - 25; R.inexact = big % B.q !== 0n; }
      else {
        var F = Math.max(A.dec, B.dec), x = A.q * P10(F - A.dec), y = B.q * P10(F - B.dec), v = op === '+' ? x + y : x - y;
        R.sign = v < 0n ? -1 : 1; R.q = v < 0n ? -v : v; R.p = -F;
      }
      if (op === '×' || op === '÷') {
        R.n = Math.min(A.n, B.n); R.lim = A.n < B.n ? 'A' : B.n < A.n ? 'B' : 'AB';
        R.pr = R.q.toString().length - 1 + R.p - (R.n - 1);
      } else { R.pr = Math.max(-A.dec, -B.dec); R.lim = A.dec < B.dec ? 'A' : B.dec < A.dec ? 'B' : 'AB'; R.nd = -R.pr; }
      var r = rnd(R.q, R.p, R.pr); R.tie = r.tie;
      if ((op === '×' || op === '÷') && r.q.toString().length > R.n) { r.q = r.q / 10n; r.p += 1; R.pr += 1; }   // 9.96 -> 10, not 10.0
      R.rq = r.q; R.rp = r.p;
      // unrounded display: exact, or 10 significant digits of a non-terminating quotient
      var uq = R.q, up = R.p;
      if (R.inexact) { var cut = Math.max(0, uq.toString().length - 10); uq = uq / P10(cut); up += cut; }
      while (up < 0 && uq % 10n === 0n && (R.inexact || op === '÷')) { uq = uq / 10n; up += 1; }
      R.uq = uq; R.up = up;
      return R;
    }
    /** Sum of signed terms {q, p, sign} exactly -> {q, p, sign}. */
    function sum(terms) {
      var pm = Math.min.apply(null, terms.map(function (t) { return t.p; })), v = 0n;
      terms.forEach(function (t) { v += BigInt(t.sign) * t.q * P10(t.p - pm); });
      return { q: v < 0n ? -v : v, p: pm, sign: v < 0n ? -1 : 1 };
    }
    return { parse: parse, dec: dec, rnd: rnd, calc: calc, sum: sum };
  })();
  /** Result of the s.f. calculator as text: plain decimal, or a x 10^n form when trailing zeros would be ambiguous. */
  function sfText(R) {
    var s = R.rq.toString();
    if ((R.op === '×' || R.op === '÷') && R.rp >= 0 && (R.rp > 0 || /0$/.test(s))) {
      return (R.sign < 0 ? '−' : '') + (s.length > 1 ? s[0] + '.' + s.slice(1) : s) + '·10' + sup(s.length - 1 + R.rp);
    }
    return (R.sign < 0 && R.rq !== 0n ? '−' : '') + SF.dec(R.rq, R.rp);
  }

  // ---------------------------------------------------------------- widget: s.f. calculator (t1-sf-calc), a custom mount with typed inputs
  var SF_PRE = [['2.8', '×', '3.21'], ['2.000', '÷', '15'], ['4.5', '−', '3.2750'], ['4.530', '+', '3.27'], ['14.0550', '+', '6.05'],
                ['252.2', '−', '17.789'], ['0.0577', '÷', '0.753'], ['18.4', '×', '2.85']];
  var RULE = [null,
    T('nonzero digit: always counts', 'nollasta eroava numero: aina merkitsevä'),
    T('zero between nonzero digits: counts', 'nollien välissä oleva nolla: merkitsevä'),
    T('leading zero: does not count', 'etunolla: ei merkitsevä'),
    T('ending zero: counts only with a decimal point', 'loppunolla: merkitsevä vain desimaalipilkun kanssa')];
  function ruleList(ctx, A) {
    var seen = {}, out = [];
    A.rules.forEach(function (r) { if (!seen[r]) { seen[r] = 1; out.push(r + ' = ' + ctx.tx(RULE[r])); } });
    return out.join('; ');
  }
  function sfCalc() {
    return { mount: function (host, ctx) {
      var el = TDC.util.el, S = { a: '2.8', b: '3.21', op: '×', phase: 5, run: false, tm: 0 }, capKey = '';
      var inA = el('input', { class: 'q-input', type: 'text', inputmode: 'decimal', value: S.a, size: 8, style: 'width:7em;font-family:var(--font-mono)' });
      var inB = el('input', { class: 'q-input', type: 'text', inputmode: 'decimal', value: S.b, size: 8, style: 'width:7em;font-family:var(--font-mono)' });
      var sel = el('select', { class: 'q-input', style: 'width:auto' }), opBtns = {};
      sel.appendChild(el('option', { value: '' }, '—'));
      SF_PRE.forEach(function (p, i) { sel.appendChild(el('option', { value: String(i) }, ln(p[0] + ' ' + p[1] + ' ' + p[2]))); });
      var lblSel = el('span', {}), lblA = el('span', {}, 'A'), lblB = el('span', {}, 'B');
      TDC.i18n.bind(lblSel, T('Example', 'Esimerkki'), true);
      var row1 = el('div', { class: 'mech-controls' }, [lblSel, sel, lblA, inA, lblB, inB]);
      var row2 = el('div', { class: 'mech-controls' }), stage = el('div', { class: 'mech-stage' }), cap = el('p', { class: 'mech-caption', 'aria-live': 'polite' });
      ['×', '÷', '+', '−'].forEach(function (o) {
        var b = el('button', { type: 'button', class: 'btn btn-small', 'aria-pressed': 'false' }, o); opBtns[o] = b;
        b.addEventListener('click', function () { S.op = o; start(); }); row2.appendChild(b);
      });
      var bStep = el('button', { type: 'button', class: 'btn btn-small' }), bRun = el('button', { type: 'button', class: 'btn btn-small btn-primary' });
      TDC.i18n.bind(bStep, T('Step', 'Vaihe'), true); TDC.i18n.bind(bRun, T('Run', 'Aja'), true);
      row2.append(bStep, bRun);
      host.append(el('div', { class: 'plot-widget mech-widget' }, [row1, row2, stage, cap]));
      function start() { S.phase = 0; S.tm = 0; S.run = !TDC.util.reducedMotion(); if (!S.run) S.phase = 5; sync(); }
      function sync() { for (var o in opBtns) { opBtns[o].setAttribute('aria-pressed', String(o === S.op)); opBtns[o].classList.toggle('btn-primary', o === S.op); } }
      inA.addEventListener('input', function () { S.a = inA.value; sel.value = ''; start(); });
      inB.addEventListener('input', function () { S.b = inB.value; sel.value = ''; start(); });
      sel.addEventListener('change', function () {
        var p = SF_PRE[+sel.value]; if (!p) return;
        S.a = inA.value = ln(p[0]); S.op = p[1]; S.b = inB.value = ln(p[2]); start();   // fi: 4,530 (the parser takes both)
      });
      bStep.addEventListener('click', function () { S.run = false; S.phase = S.phase >= 5 ? 0 : S.phase + 1; });
      bRun.addEventListener('click', start);
      sync();
      function caption(A, B, R) {
        var sA = ln(A.s), sB = ln(B.s), mul = R.op === '×' || R.op === '÷';
        switch (S.phase) {
          case 0: return tx2(ctx, 'The numbers are kept exactly as typed: trailing zeros are information. Press Step or Run.', 'Luvut säilytetään täsmälleen kirjoitettuina: loppunollat ovat tietoa. Paina Vaihe tai Aja.');
          case 1: return tx2(ctx, 'A = ' + A.s + ' has ' + A.n + ' significant figures (' + A.dec + ' decimal places). Rules: ' + ruleList(ctx, A) + '.',
            'A = ' + A.s + ' sisältää ' + A.n + ' merkitsevää numeroa (' + A.dec + ' desimaalia). Säännöt: ' + ruleList(ctx, A) + '.');
          case 2: return tx2(ctx, 'B = ' + B.s + ' has ' + B.n + ' significant figures (' + B.dec + ' decimal places). Rules: ' + ruleList(ctx, B) + '.',
            'B = ' + B.s + ' sisältää ' + B.n + ' merkitsevää numeroa (' + B.dec + ' desimaalia). Säännöt: ' + ruleList(ctx, B) + '.');
          case 3: return mul
            ? tx2(ctx, 'Multiplication and division: the result has as many significant figures as the least accurate value: min(' + A.n + ', ' + B.n + ') = ' + R.n + '.',
                'Kerto- ja jakolasku: tuloksessa on yhtä monta merkitsevää numeroa kuin epätarkimmassa lähtöarvossa: min(' + A.n + ', ' + B.n + ') = ' + R.n + '.')
            : tx2(ctx, 'Addition and subtraction: the result has as many decimal places as the least precise value: min(' + A.dec + ', ' + B.dec + ') = ' + R.nd + '. The red line marks that column.',
                'Yhteen- ja vähennyslasku: tuloksessa on yhtä monta desimaalia kuin epätarkimmassa lähtöarvossa: min(' + A.dec + ', ' + B.dec + ') = ' + R.nd + '. Punainen viiva osoittaa sen sarakkeen.');
          case 4: return tx2(ctx, 'Unrounded result: ' + (R.sign < 0 ? '−' : '') + SF.dec(R.uq, R.up) + (R.inexact ? '…' : '') + '. Do not stop here.',
            'Pyöristämätön tulos: ' + (R.sign < 0 ? '−' : '') + SF.dec(R.uq, R.up) + (R.inexact ? '…' : '') + '. Älä jää tähän.');
          default: return tx2(ctx, 'Rounded to ' + (mul ? R.n + (R.n === 1 ? ' significant figure' : ' significant figures') : R.nd + (R.nd === 1 ? ' decimal place' : ' decimal places')) + ': ' + sfText(R) + (R.tie ? ' (the dropped part is exactly half: it rounds up)' : '') + '.',
            'Pyöristetty ' + (mul ? R.n + ' merkitsevään numeroon' : R.nd + ' desimaaliin') + ': ' + sfText(R) + (R.tie ? ' (poistettava osa on täsmälleen puolikas: pyöristetään ylöspäin)' : '') + '.');
        }
      }
      var cv = TDC.viz.canvas(stage, { aspect: function (w) { return w < 520 ? 0.78 : 0.46; }, animate: true,
        draw: function (g, w, h, t, dt) {
          if (S.run) { S.tm += dt; if (S.tm >= 1.3) { S.tm = 0; S.phase++; if (S.phase >= 5) { S.phase = 5; S.run = false; } } }
          g.clearRect(0, 0, w, h); g.lineJoin = 'round';
          var fg = ctx.color('--fg'), mu = ctx.color('--muted'), wire = ctx.color('--c-wire'), bad = ctx.color('--bad'), ok = ctx.color('--ok'), c1 = ctx.color('--c-1'), c2 = ctx.color('--c-2'), fs = fsz(w);
          var A = SF.parse(S.a), B = SF.parse(S.b);
                    if (!A || !B) {
            lab(g, '', tx2(ctx, 'Enter two positive numbers, e.g. 14.0550 and 6.05 (point or comma).', 'Kirjoita kaksi positiivista lukua, esim. 14,0550 ja 6,05 (piste tai pilkku).'), w / 2, h / 2, mu, 'center', fs);
            if (capKey !== 'err') { capKey = 'err'; cap.textContent = ''; } return;
          }
          var R = SF.calc(A, B, S.op), mul = S.op === '×' || S.op === '÷', ph = S.phase;
          var uS = (R.sign < 0 ? '' : '') + SF.dec(R.uq, R.up), rs = sfText(R), sci = /·10/.test(rs);
          var rowsW = [A, B, { ip: uS.split('.')[0], fp: uS.indexOf('.') >= 0 ? uS.split('.')[1] : '' }, { ip: SF.dec(R.rq, R.rp).split('.')[0], fp: SF.dec(R.rq, R.rp).split('.')[1] || '' }];
          var wmax = 0, wmin = 0;
          rowsW.forEach(function (r) { wmax = Math.max(wmax, r.ip.length - 1); wmin = Math.min(wmin, -r.fp.length); });
          var cols = wmax - wmin + 1, cw = Math.min(36, (w - 20) / (cols + 2)), x0 = (w - cols * cw) / 2 + cw * 0.3, xDot = x0 + (wmax + 1) * cw;
          var px = Math.max(12, Math.min(26, cw * 0.78)), yA = h * 0.14, yB = h * 0.3, yS = h * 0.4, yU = h * 0.52, yR = h * 0.72;
          px = Math.max(10, Math.min(px, (yB - yA) / 1.9));   // rule badges under row A stay clear of row B (phones)
          var X = function (wt) { return xDot - (wt + 1) * cw; };           // left edge of the column with the weight 10^wt
          function digits(info, y, opt) {
            var ip = info.ip, fp = info.fp, all = ip + fp, i, wt;
            for (i = 0; i < all.length; i++) {
              wt = ip.length - 1 - i;
              var cnt = opt.counts ? opt.counts[i] : true, drop = opt.dropBelow != null && wt < opt.dropBelow;
              if (opt.hi && cnt) { g.fillStyle = TDC.mechViz.alpha(opt.hi, 0.28); TDC.mechViz.rr(g, X(wt) + 1, y - px * 0.72, cw - 2, px * 1.44, 4); g.fill(); }
              mono(g, px); g.textAlign = 'center'; g.textBaseline = 'middle';
              g.fillStyle = drop ? TDC.mechViz.alpha(bad, 0.8) : opt.counts && !cnt ? mu : fg; g.fillText(all[i], X(wt) + cw / 2, y);
              if (drop) { g.strokeStyle = bad; g.lineWidth = 1.5; line(g, X(wt) + 3, y + px * 0.5, X(wt) + cw - 3, y - px * 0.5); }
              if (opt.badge) { mono(g, Math.max(9, px * 0.42)); g.fillStyle = mu; g.fillText(String(opt.badge[i]), X(wt) + cw / 2, y + px * 0.95); }
            }
            if (info.fp.length || info.pt) {
              g.fillStyle = fg; g.beginPath(); g.arc(xDot, y + px * 0.3, Math.max(1.6, px * 0.09), 0, 2 * Math.PI); g.fill();
              if (TDC.i18n.lang === 'fi') { g.strokeStyle = fg; g.lineWidth = Math.max(1.4, px * 0.07); line(g, xDot + px * 0.05, y + px * 0.33, xDot - px * 0.07, y + px * 0.55); }   // decimal comma
            }
          }
          mono(g, px); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(S.op, x0 - cw * 0.1, yB);
          digits(A, yA, { counts: ph >= 1 ? A.counts : null, hi: ph >= 1 ? c1 : null, badge: ph >= 1 ? A.rules : null });
          digits(B, yB, { counts: ph >= 2 ? B.counts : null, hi: ph >= 2 ? c2 : null, badge: ph >= 2 ? B.rules : null });
          g.strokeStyle = wire; g.lineWidth = 2; line(g, x0, yS, x0 + cols * cw, yS);
          var lx = xDot - R.pr * cw;                                          // right edge of the last digit that is kept
          if (ph >= 3) {
            g.strokeStyle = bad; g.lineWidth = 2.5; g.setLineDash([6, 4]);
            if (mul) { line(g, lx, yU - px * 0.8, lx, yR + px * 0.9); } else { line(g, lx, yA - px * 0.9, lx, yR + px * 0.9); }
            g.setLineDash([]);
            if (mul) {   // the least accurate value: a frame around its counted digits
              var L = R.lim === 'B' ? B : A, ly = R.lim === 'B' ? yB : yA;
              g.strokeStyle = bad; g.lineWidth = 2; TDC.mechViz.rr(g, X(L.ip.length - 1) - 1, ly - px * 0.8, L.d.length * cw + 2, px * 1.6, 5); g.stroke();
              lab(g, 'n', ' = ' + R.n, x0 + cols * cw + 2 > w - 30 ? w - 30 : x0 + cols * cw + 2, ly, bad, 'left', fs - 1);
            } else {
              lab(g, '', nf(R.nd, 2) + ' ' + ctx.tx(T('dec.', 'des.')), clamp(lx, 40, w - 40), yR + px * 1.5, bad, 'center', fs - 1);
            }
          }
          if (ph >= 4) {
            var uInfo = rowsW[2]; var dropBelow = ph >= 5 ? R.pr : null;
            digits(uInfo, yU, { dropBelow: dropBelow });
            if (R.inexact) { lab(g, '', '…', x0 + cols * cw + 6, yU, mu, 'left', fs); }
            if (R.sign < 0) lab(g, '', '−', x0 - cw * 0.1, yU, fg, 'center', fs + 2);
          }
          if (ph >= 5) {
            if (sci) { lab(g, '', ln(rs), w / 2, yR, ok, 'center', fs + 6); }
            else { g.save(); digits(rowsW[3], yR, { hi: ok }); g.restore(); if (R.sign < 0 && R.rq !== 0n) lab(g, '', '−', x0 - cw * 0.1, yR, fg, 'center', fs + 2); }
          }
          var ck = S.phase + '|' + S.a + S.op + S.b + '|' + TDC.i18n.lang;
          if (capKey !== ck) { capKey = ck; cap.textContent = caption(A, B, R); }
        } });
      var aria = function () { cv.canvas.setAttribute('aria-label', ctx.t('mv.deviceAria')); }; aria();
      ctx.onTheme(function () { cv.redraw(); }); ctx.onLang(function () { aria(); capKey = ''; cv.redraw(); });
      return { destroy: cv.destroy, getAnswer: function () { return {}; }, getAnswerState: function () { return {}; }, setAnswerState: function () {}, lock: function () {} };
    } };
  }

  // ---------------------------------------------------------------- device: the rounding trap (t1-sf-trap)
  var TRAP_STEPS = 7;
  var TRAP = {
    animate: true,
    aspect: function (w) { return w < 520 ? 1.0 : 0.6; },
    params: [{ id: 'x', tex: 'x', min: 4.5, max: 6, step: 0.05, value: 5.05 }],
    buttons: [{ label: T('Run the calculation', 'Aja lasku'), click: function (p, D) { D.S.u = D.motion ? 0 : 99; D.S.run = D.motion; } },
              { label: T('Keep all digits', 'Säilytä kaikki numerot'), click: function (p, D) { p.mode = 'keep'; D.S.u = D.motion ? 0 : 99; D.S.run = D.motion; D.set({}); } },
              { label: T('Round every intermediate result', 'Pyöristä jokainen välitulos'), click: function (p, D) { p.mode = 'round'; D.S.u = D.motion ? 0 : 99; D.S.run = D.motion; D.set({}); } }],
    draw: function (g, w, h, p, ctx, TV, D) {
      var S = D.S; if (S.u == null) S.u = 99;
      if (S.run) { S.u += D.dt / 0.9; if (S.u >= TRAP_STEPS) S.run = false; }
      var mode = p.mode || 'keep', T0 = trapCalc(p.x, mode), K = trapCalc(p.x, 'keep');
      var fg = ctx.color('--fg'), mu = ctx.color('--muted'), wire = ctx.color('--c-wire'), bad = ctx.color('--bad'), ok = ctx.color('--ok'), bg = ctx.color('--surface'), fs = fsz(w);
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      var xs = Math.min(S.u, TRAP_STEPS), y0 = h * 0.1, dy = h * 0.115, xe = 10, xv = w * 0.62;
      lab(g, '', tx2(ctx, 'Mode: ' + (mode === 'keep' ? 'keep all digits' : 'round every intermediate result'), 'Tila: ' + (mode === 'keep' ? 'kaikki numerot säilytetään' : 'jokainen välitulos pyöristetään')), xe, y0, mode === 'keep' ? ok : bad, 'left', fs);
      lab(g, '', ln('9.500 ÷ ' + p.x.toFixed(2) + ' + 2.45 + 3.84 × 2.0 − 1.58'), xe, y0 + dy * 0.9, fg, 'left', fs);
      var sfN = function (s) { return s && tx2(ctx, s, s.replace('s.f.', 'm.n.')); };   // (3 s.f.) = (3 m.n.)
      var rows = [['9.500 ÷ ' + p.x.toFixed(2), T0.t1, sfN(T0.t1n)], ['', '2.45', ''], ['3.84 × 2.0', T0.t3, sfN(T0.t3n)], ['', '−1.58', '']];
      rows.forEach(function (r, i) {
        if (xs < i + 1) return; var y = y0 + dy * (2 + i * 0.95), a = clamp(xs - i, 0, 1); g.globalAlpha = a;
        lab(g, '', ln(r[0]), xe, y, mu, 'left', fs); lab(g, '', ln(r[1]), xv, y, fg, 'right', fs);
        if (r[2]) lab(g, '', ln(r[2]), w - 8, y, mu, 'right', fs - 1); g.globalAlpha = 1;
      });
      var ys = y0 + dy * (2 + 4 * 0.95) + dy * 0.2;
      if (xs >= 5) { g.globalAlpha = clamp(xs - 4, 0, 1); g.strokeStyle = wire; g.lineWidth = 1.5; line(g, xe, ys - dy * 0.45, xv + 4, ys - dy * 0.45);
        lab(g, '', tx2(ctx, 'sum', 'summa'), xe, ys, mu, 'left', fs); lab(g, '', ln(T0.sum), xv, ys, fg, 'right', fs); g.globalAlpha = 1; }
      var yf = ys + dy * 1.1;
      if (xs >= 6) { g.globalAlpha = clamp(xs - 5, 0, 1);
        lab(g, '', tx2(ctx, '1 decimal place (3.84 × 2.0 has only 2 s.f.)', '1 desimaali (3,84 × 2,0:ssa on vain 2 m.n.)'), xe, yf, mu, 'left', fs - 1); g.globalAlpha = 1; }
      var yr = yf + dy * 1.15;
      if (xs >= 7) {
        lab(g, '', tx2(ctx, 'result', 'tulos'), xe, yr, mu, 'left', fs); lab(g, '', ln(T0.res), xv, yr, mode === 'keep' ? ok : bad, 'right', fs + 3);
        if (T0.tie) lab(g, '', tx2(ctx, 'exactly a tie: 10.45 → 10.5?', 'täsmälleen puoliväli: 10,45 → 10,5?'), xe, yr + dy * 0.95, bad, 'left', fs - 1);
        else if (mode === 'round' && T0.res !== K.res) lab(g, '', tx2(ctx, 'differs from ' + K.res, 'poikkeaa tuloksesta ' + K.res), xe, yr + dy * 0.95, bad, 'left', fs - 1);
        else if (mode === 'round') lab(g, '', tx2(ctx, 'same here, but not always (try x = 5.05)', 'sama tässä, mutta ei aina (kokeile x = 5,05)'), xe, yr + dy * 0.95, mu, 'left', fs - 1);
      }
    },
    outputs: function (p) {
      var K = trapCalc(p.x, 'keep'), R = trapCalc(p.x, 'round');
      return [{ label: T('Keeping all digits', 'Kaikki numerot säilyttäen'), value: ln(K.sum + ' → ' + K.res) },
              { label: T('Rounding every step', 'Jokainen askel pyöristäen'), value: ln(R.sum + (R.tie ? TDC.tx(T(' (tie)', ' (puoliväli)')) : '') + ' → ' + R.res) }];
    }
  };
  /** 9.500 / x + 2.45 + 3.84 x 2.0 - 1.58 with exact decimals; mode 'keep' = no intermediate rounding, 'round' = each step to its own s.f. */
  function trapCalc(x, mode) {
    var c = SF.parse(x.toFixed(2)), d = SF.calc(SF.parse('9.500'), c, '÷'), m = SF.calc(SF.parse('3.84'), SF.parse('2.0'), '×'), t1, t3, o = {};
    if (mode === 'round') { var a = SF.rnd(d.q, d.p, d.pr), b = SF.rnd(m.q, m.p, m.pr); t1 = { q: a.q, p: a.p, sign: 1 }; t3 = { q: b.q, p: b.p, sign: 1 };
      o.t1 = SF.dec(a.q, a.p); o.t3 = SF.dec(b.q, b.p); o.t1n = '(3 s.f.)'; o.t3n = '(2 s.f.)'; }
    else { t1 = { q: d.q, p: d.p, sign: 1 }; t3 = { q: m.q, p: m.p, sign: 1 };
      var cut = Math.max(0, d.q.toString().length - 10); o.t1 = SF.dec(d.q / (10n ** BigInt(cut)), d.p + cut) + '…'; o.t3 = SF.dec(m.q, m.p).replace(/0+$/, ''); o.t1n = ''; o.t3n = ''; }
    var s = SF.sum([t1, { q: 245n, p: -2, sign: 1 }, t3, { q: 158n, p: -2, sign: -1 }]), r = SF.rnd(s.q, s.p, -1);
    var cutS = Math.max(0, s.p + 10 < 0 ? -(s.p + 10) : 0), sq = s.q / (10n ** BigInt(cutS));
    o.sum = SF.dec(sq, s.p + cutS); if (o.sum.indexOf('.') >= 0) o.sum = o.sum.replace(/0+$/, '').replace(/\.$/, ''); o.sum += cutS ? '…' : ''; o.res = SF.dec(r.q, r.p); o.tie = r.tie;
    return o;
  }

  // ---------------------------------------------------------------- device: prefix ruler (t1-prefix-lab)
  var PFX = [[24, 'Y', 'yotta', 'jotta'], [21, 'Z', 'zetta', 'tsetta'], [18, 'E', 'exa', 'eksa'], [15, 'P', 'peta', 'peta'], [12, 'T', 'tera', 'tera'], [9, 'G', 'giga', 'giga'],
             [6, 'M', 'mega', 'mega'], [3, 'k', 'kilo', 'kilo'], [0, '', '', ''], [-3, 'm', 'milli', 'milli'], [-6, 'µ', 'micro', 'mikro'], [-9, 'n', 'nano', 'nano'],
             [-12, 'p', 'pico', 'piko'], [-15, 'f', 'femto', 'femto'], [-18, 'a', 'atto', 'atto'], [-21, 'z', 'zepto', 'tsepto'], [-24, 'y', 'yocto', 'jokto']];
  function pfxOf(k) { for (var i = 0; i < PFX.length; i++) if (PFX[i][0] === k) return PFX[i]; return PFX[8]; }
  /** m10 x 10^e (m10 an integer) as a plain decimal string: dec10(10, -4) = "0.0010". */
  function dec10(m10, e) { return SF.dec(BigInt(m10), e); }
  function prefixForms(p) {
    var m10 = Math.round(p.m * 10), n = p.n, k = 3 * Math.floor(n / 3), pf = pfxOf(k), u = p.u || 'J', r = {};
    r.k = k; r.pf = pf; r.best = dec10(m10, n - 1 - k) + ' ' + pf[1] + u;
    r.alt = k > -24 ? dec10(m10, n - 1 - k + 3) + ' ' + pfxOf(k - 3)[1] + u : '';
    r.sci = p.m.toFixed(1) + '·10' + sup(n) + ' ' + u;
    r.plain = n >= -9 && n <= 9 ? dec10(m10, n - 1) + ' ' + u : '';
    return r;
  }
  var PREFIX = {
    animate: true,
    aspect: function (w) { return w < 520 ? 1.0 : 0.62; },
    params: [{ id: 'm', tex: 'm', min: 1, max: 9.9, step: 0.1, value: 1.0 }, { id: 'n', label: T('Power of ten, n', 'Kymmenpotenssi, n'), min: -24, max: 24, step: 1, value: -3 }],
    buttons: ['J', 'm', 'Pa', 'W'].map(function (u) { return { label: T(u, u), click: function (p, D) { p.u = u; D.set({}); } }; })
      .concat([{ label: T('Zoom in from 10²⁴', 'Zoomaa sisään arvosta 10²⁴'), click: function (p, D) { D.S.cur = 24; } }]),
    draw: function (g, w, h, p, ctx, TV, D) {
      var S = D.S, tgt = p.n + Math.log10(p.m), u = p.u || 'J', F = prefixForms(p);
      if (S.cur == null || !D.motion) S.cur = tgt; else S.cur += (tgt - S.cur) * Math.min(1, D.dt * 5);
      var fg = ctx.color('--fg'), mu = ctx.color('--muted'), wire = ctx.color('--c-wire'), c1 = ctx.color('--c-1'), c2 = ctx.color('--c-2'), ok = ctx.color('--ok'), bg = ctx.color('--surface'), fs = fsz(w);
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      lab(g, '', ln(p.m.toFixed(1) + '·10' + sup(p.n) + ' ' + u), w / 2, h * 0.07, fg, 'center', fs + 5);
      // strip 1: the whole range 10^-24 ... 10^24 with the prefix bands; the band of the best prefix is lit
      var xa = 18, xb = w - 18, X1 = function (e) { return xa + (e + 24) / 48 * (xb - xa); }, ya = h * 0.27;
      g.fillStyle = TV.alpha(ok, 0.3); g.fillRect(X1(F.k - 1.5), ya - 16, X1(F.k + 1.5) - X1(F.k - 1.5), 30);
      g.strokeStyle = wire; g.lineWidth = 2; line(g, xa, ya, xb, ya);
      PFX.forEach(function (q) { var x = X1(q[0]); g.lineWidth = 2; line(g, x, ya - 5, x, ya + 5); lab(g, '', q[1] || '1', x, ya - 11, q[0] === F.k ? fg : mu, 'center', fs - 3); });
      for (var e = -24; e <= 24; e++) { if (e % 3) { g.lineWidth = 1; line(g, X1(e), ya - 2, X1(e), ya + 2); } }
      var xm = X1(S.cur); g.fillStyle = c2; g.beginPath(); g.moveTo(xm, ya + 4); g.lineTo(xm - 6, ya + 16); g.lineTo(xm + 6, ya + 16); g.closePath(); g.fill();
      lab(g, '', ln('10' + sup(-24)), xa, ya + 26, mu, 'left', fs - 2); lab(g, '', '10' + sup(24), xb, ya + 26, mu, 'right', fs - 2);
      // strip 2: zoom window of +-4 decades round the value, labelled with the best prefix of each decade
      var yb = h * 0.57, pxd = (w - 36) / 8.4, xc = w / 2, X2 = function (v) { return xc + (v - S.cur) * pxd; };
      g.strokeStyle = wire; g.lineWidth = 2; line(g, 6, yb, w - 6, yb);
      for (var d = Math.floor(S.cur - 4.5); d <= Math.ceil(S.cur + 4.5); d++) {
        if (d < -24 || d > 24) continue;
        for (var mm = 1; mm < 10; mm++) { var xx = X2(d + Math.log10(mm)); if (xx < 4 || xx > w - 4) continue; g.lineWidth = mm === 1 ? 2.5 : 1; line(g, xx, yb - (mm === 1 ? 12 : 6), xx, yb); }
        var kk = 3 * Math.floor(d / 3), xl = X2(d);
        if (xl > 20 && xl < w - 20) lab(g, '', ln(Math.pow(10, d - kk) + ' ' + pfxOf(kk)[1] + u), xl, yb + 20 + (d % 2 ? 0 : 0), d - kk === 0 ? fg : mu, 'center', fs - 3);
      }
      g.strokeStyle = c2; g.lineWidth = 3; line(g, xc, yb - 24, xc, yb + 4);
      g.fillStyle = c2; g.beginPath(); g.moveTo(xc, yb - 4); g.lineTo(xc - 6, yb - 17); g.lineTo(xc + 6, yb - 17); g.closePath(); g.fill();
      lab(g, '', tx2(ctx, 'zoom window (log scale)', 'zoomi-ikkuna (logaritminen asteikko)'), w / 2, yb - 30, mu, 'center', fs - 2);
      var l1 = F.best + (F.pf[1] ? '  (' + ctx.tx(T(F.pf[2], F.pf[3])) + ')' : '');
      lab(g, '', ln(l1), w / 2, h * 0.8, ok, 'center', fs + 3);
      lab(g, '', ln([F.alt, F.sci, F.plain].filter(Boolean).join('  =  ')), w / 2, h * 0.9, fg, 'center', fs - 1);
    },
    outputs: function (p) {
      var F = prefixForms(p), o = [{ label: T('Best prefix (exponent divisible by 3, value 1…1000)', 'Paras etuliite (eksponentti jaollinen kolmella, arvo 1…1000)'), value: ln(F.best) },
        { label: T('Power-of-ten form', 'Kymmenpotenssimuoto'), value: ln(F.sci) }];
      if (F.alt) o.splice(1, 0, { label: T('One prefix lower', 'Yksi etuliite alempana'), value: ln(F.alt) });
      return o;
    }
  };

  // ---------------------------------------------------------------- device: dimension checker (t1-dim-lab)
  var BASEU = ['kg', 'm', 's', 'A'];
  var NAMED = [['J', [1, 2, -2, 0]], ['N', [1, 1, -2, 0]], ['W', [1, 2, -3, 0]], ['Pa', [1, -1, -2, 0]], ['Wb', [1, 2, -2, -1]], ['T', [1, 0, -2, -1]],
               ['V', [1, 2, -3, -1]], ['H', [1, 2, -2, -2]], ['Hz', [0, 0, -1, 0]]];
  function sameV(a, b) { return a.every(function (x, i) { return x === b[i]; }); }
  function unitStr(v) {
    var num = [], den = [];
    v.forEach(function (e, i) { if (e > 0) num.push(BASEU[i] + (e > 1 ? sup(e) : '')); else if (e < 0) den.push(BASEU[i] + (e < -1 ? sup(-e) : '')); });
    return (num.join('·') || '1') + (den.length ? '/' + (den.length > 1 ? '(' + den.join('·') + ')' : den[0]) : '');
  }
  function unitFull(v) {
    var u = unitStr(v), n = null; NAMED.forEach(function (q) { if (sameV(v, q[1])) n = q[0]; });
    return n && n !== u ? u + ' (= ' + n + ')' : u;
  }
  // each side = list of steps [label, exponent vector over kg, m, s, A] (null = square root: halve every exponent)
  var KG = [1, 0, 0, 0], M1 = [0, 1, 0, 0], VV = [0, 1, -1, 0], NN = [1, 1, -2, 0], I1 = [0, 0, 0, 1];
  var DIMF = [
    { tex: 'E = ½ m v²', L: [['E = J', [1, 2, -2, 0]]], R: [['m', KG], ['v', VV], ['v', VV]] },
    { tex: 's = v²/(2a)', L: [['s', M1]], R: [['v', VV], ['v', VV], ['÷ a', [0, -1, 2, 0]]] },
    { tex: 'T = 2π √(F/(m l))', L: [['T', [0, 0, 1, 0]]], R: [['F = N', NN], ['÷ m', [-1, 0, 0, 0]], ['÷ l', [0, -1, 0, 0]], ['√', null]] },
    { tex: 'T = 2π √(m l / F)', L: [['T', [0, 0, 1, 0]]], R: [['m', KG], ['l', M1], ['÷ F = N', [-1, -1, 2, 0]], ['√', null]] },
    { tex: 'B = L I', L: [['B = T', [1, 0, -2, -1]]], R: [['L = H', [1, 2, -2, -2]], ['I', I1]] },
    { tex: 'p = 4F/(π d²)', L: [['p = Pa', [1, -1, -2, 0]]], R: [['F = N', NN], ['÷ d', [0, -1, 0, 0]], ['÷ d', [0, -1, 0, 0]]] },
    { tex: 'P = U I', L: [['P = W', [1, 2, -3, 0]]], R: [['U = V', [1, 2, -3, -1]], ['I', I1]] }
  ];
  function cumV(steps, k) {
    var v = [0, 0, 0, 0];
    for (var i = 0; i < k; i++) { var s = steps[i][1]; v = s ? v.map(function (x, j) { return x + s[j]; }) : v.map(function (x) { return x / 2; }); }
    return v;
  }
  var DIM = {
    animate: true,
    aspect: function (w) { return w < 520 ? 1.0 : 0.6; },
    params: [],
    buttons: DIMF.map(function (f, i) { return { label: T(f.tex, f.tex), click: function (p, D) { p.f = i; D.S.t = D.motion ? 0 : 99; D.S.run = D.motion; D.set({}); } }; })
      .concat([{ label: T('Run', 'Aja'), click: function (p, D) { D.S.t = D.motion ? 0 : 99; D.S.run = D.motion; } }]),
    draw: function (g, w, h, p, ctx, TV, D) {
      var S = D.S, f = DIMF[p.f || 0], nS = Math.max(f.L.length, f.R.length), STEP = 1.1;
      if (S.t == null) S.t = 99;
      if (S.run) { S.t += D.dt; if (S.t >= nS * STEP + 1.2) S.run = false; }
      var tt = Math.min(S.t, nS * STEP) / STEP, k = Math.min(nS, Math.floor(tt + 1e-9)), fr = k >= nS ? 0 : tt - k;
      var fg = ctx.color('--fg'), mu = ctx.color('--muted'), wire = ctx.color('--c-wire'), bad = ctx.color('--bad'), ok = ctx.color('--ok'), bg = ctx.color('--surface'), fs = fsz(w);
      var cols = [ctx.color('--c-1'), ctx.color('--c-2'), ctx.color('--c-3'), ctx.color('--c-4')];
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      lab(g, f.tex, '', w / 2, h * 0.06, fg, 'center', fs + 3);
      var y0 = h * 0.55, bh = clamp(h * 0.062, 9, 22), pw = w / 2 - 22;
      function side(steps, x0, title) {
        var n = steps.length, kk = Math.min(k, n), cur = cumV(steps, kk), st = k < n && fr > 0 ? steps[k] : null, colw = pw / 4, bw = colw * 0.78;
        lab(g, '', ctx.tx(title), x0 + pw / 2, h * 0.14, mu, 'center', fs - 1);
        var ci = k < n ? (fr > 0 ? k : k - 1) : n - 1;
        lab(g, '', ci >= 0 ? (ci + 1) + '/' + n + ':  ' + steps[ci][0] : '…', x0 + pw / 2, h * 0.21, fg, 'center', fs - 1);
        function blk(c, i, sgn, al, tint) {
          var x = x0 + c * colw + (colw - bw) / 2, y = sgn > 0 ? y0 - 3 - (i + 1) * bh : y0 + 3 + i * bh;
          g.globalAlpha = al; g.fillStyle = tint ? bad : cols[c]; TV.rr(g, x, y + 1, bw, bh - 2, 3); g.fill();
          if (bh >= 13 && !tint) { g.fillStyle = ctx.color('--surface'); g.font = '700 ' + Math.min(11, bh - 4) + 'px ' + getComputedStyle(document.body).fontFamily; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(BASEU[c], x + bw / 2, y + bh / 2); }
          g.globalAlpha = 1;
        }
        for (var c = 0; c < 4; c++) {
          var e = cur[c], inc = st && st[1] ? st[1][c] : 0, root = st && !st[1], m = Math.abs(e), sg = e > 0 ? 1 : -1, canc = 0, i;
          if (inc && e && inc * e < 0) canc = Math.min(m, Math.abs(inc));
          for (i = 0; i < m; i++) blk(c, i, sg, root ? (i < m / 2 ? 1 : 1 - fr) : (i < canc ? 1 - fr : 1), (root && i >= m / 2) || i < canc);
          if (inc) {
            var si = inc > 0 ? 1 : -1, mi = Math.abs(inc), base = e * inc > 0 ? m : 0;
            for (i = 0; i < mi; i++) blk(c, base + i, si, i < canc ? 1 - fr : fr, i < canc);
          }
          lab(g, '', BASEU[c], x0 + c * colw + colw / 2, h * 0.94, mu, 'center', fs - 1);
        }
        g.strokeStyle = wire; g.lineWidth = 3; line(g, x0, y0, x0 + pw, y0);
      }
      side(f.L, 8, T('left side', 'vasen puoli')); side(f.R, w / 2 + 14, T('right side', 'oikea puoli'));
      lab(g, '', '=', w / 2, y0, fg, 'center', fs + 8);
      if (S.t >= nS * STEP + 0.2) {
        var L = cumV(f.L, f.L.length), R = cumV(f.R, f.R.length), good = sameV(L, R);
        g.globalAlpha = clamp((S.t - nS * STEP - 0.2) / 0.5, 0, 1);
        lab(g, '', good ? '✓ ' + ln(unitFull(L)) : '✗ ' + ln(unitFull(L)) + '  ≠  ' + ln(unitFull(R)), w / 2, h * 0.86, good ? ok : bad, 'center', fs + 2, bg);
        g.globalAlpha = 1;
      }
    },
    outputs: function (p) {
      var f = DIMF[p.f || 0], L = cumV(f.L, f.L.length), R = cumV(f.R, f.R.length);
      return [{ label: T('Unit of the left side', 'Vasemman puolen yksikkö'), value: unitFull(L) }, { label: T('Unit of the right side', 'Oikean puolen yksikkö'), value: unitFull(R) },
              { label: T('Dimensionally correct', 'Dimensioiltaan oikein'), value: sameV(L, R) ? T('yes', 'kyllä') : T('no', 'ei') }];
    }
  };

  // ---------------------------------------------------------------- device: vector components (t1-vec-lab)
  function signCh(v) { return v > 1e-9 ? '+' : v < -1e-9 ? '−' : '0'; }
  function vecParts(p) {
    var a = p.th * Math.PI / 180, x = p.A * Math.cos(a), y = p.A * Math.sin(a);
    return { x: Math.abs(x) < 1e-9 ? 0 : x, y: Math.abs(y) < 1e-9 ? 0 : y };
  }
  var VEC = {
    animate: true,
    aspect: function (w) { return w < 520 ? 1.0 : 0.66; },
    params: [{ id: 'A', tex: 'A', min: 1, max: 10, step: 0.1, value: 7 }, { id: 'th', tex: 'θ', min: 0, max: 360, step: 1, value: 35, unit: '°' }],
    buttons: [{ label: T('Unit vectors i, j on/off', 'Yksikkövektorit i, j päälle/pois'), click: function (p, D) { D.S.units = !D.S.units; } },
              { label: T('Run: sweep θ a full turn', 'Aja: kierrä θ täysi kierros'), click: function (p, D) {
                if (!D.motion) { D.set({ th: (Math.floor(p.th / 90) + 1) * 90 % 360 + 45 }); return; }
                D.S.sw = true; D.S.ang = 0; D.set({ th: 0 }); D.S.lastSet = 0; } }],
    drag: {
      hit: function (x, y, p, D) { var G = D.S.geom; return G && Math.hypot(x - G.tx, y - G.ty) < 24 ? 'tip' : null; },
      move: function (k, x, y, p, D) { var G = D.S.geom, dx = (x - G.cx) / G.sc, dy = -(y - G.cy) / G.sc; D.S.sw = false; return { A: Math.hypot(dx, dy), th: (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360 }; }
    },
    draw: function (g, w, h, p, ctx, TV, D) {
      var S = D.S;
      if (S.sw) {
        if (p.th !== S.lastSet) S.sw = false;
        else { S.ang += 36 * D.dt; if (S.ang >= 360) { S.ang = 360; S.sw = false; } D.set({ th: S.ang }); S.lastSet = p.th; }
      }
      var fg = ctx.color('--fg'), mu = ctx.color('--muted'), wire = ctx.color('--c-wire'), cA = ctx.color('--f-applied'), cX = ctx.color('--f-accel'), cY = ctx.color('--f-normal'), c1 = ctx.color('--c-1'), bg = ctx.color('--surface'), fs = fsz(w);
      var V = vecParts(p), size = Math.min(w, h * 0.9), sc = size * 0.44 / 10, cx = w / 2, cy = h * 0.52, tx = cx + V.x * sc, ty = cy - V.y * sc;
      S.geom = { cx: cx, cy: cy, sc: sc, tx: tx, ty: ty };
      g.clearRect(0, 0, w, h); g.lineJoin = 'round'; g.lineCap = 'round';
      if (V.x !== 0 && V.y !== 0) {   // light fill of the quadrant the vector is in
        g.fillStyle = TV.alpha(c1, 0.1); g.fillRect(V.x >= 0 ? cx : cx - 10 * sc, V.y >= 0 ? cy - 10 * sc : cy, 10 * sc, 10 * sc);
      }
      g.strokeStyle = TV.alpha(mu, 0.25); g.lineWidth = 1;
      for (var k = -10; k <= 10; k++) { line(g, cx + k * sc, cy - 10 * sc, cx + k * sc, cy + 10 * sc); line(g, cx - 10 * sc, cy + k * sc, cx + 10 * sc, cy + k * sc); }
      g.strokeStyle = wire; g.lineWidth = 2; line(g, cx - 10.4 * sc, cy, cx + 10.4 * sc, cy); line(g, cx, cy - 10.4 * sc, cx, cy + 10.4 * sc);
      lab(g, 'x', '', cx + 10.4 * sc - 4, cy + 12, mu, 'right', fs); lab(g, 'y', '', cx + 10, cy - 10.4 * sc + 4, mu, 'left', fs);
      ['I', 'II', 'III', 'IV'].forEach(function (q, i) { lab(g, '', q, cx + (i === 0 || i === 3 ? 1 : -1) * 9.2 * sc, cy + (i < 2 ? -1 : 1) * 9.2 * sc, TV.alpha(mu, 0.8), 'center', fs - 2); });
      // components: A_x on the x axis, A_y as the dashed side of the rectangle
      var L = Math.hypot(V.x, V.y);
      if (Math.abs(V.x) > 0.05) TV.arrow(g, cx, cy, cx + V.x * sc, cy, cX, 3.5);
      if (Math.abs(V.y) > 0.05) { g.setLineDash([6, 4]); TV.arrow(g, cx + V.x * sc, cy, cx + V.x * sc, cy - V.y * sc, cY, 3.5); g.setLineDash([]); }
      if (Math.abs(V.x) > 0.05 && Math.abs(V.y) > 0.05) { g.strokeStyle = mu; g.lineWidth = 1.5; var s9 = 9 * (V.x > 0 ? -1 : 1), t9 = 9 * (V.y > 0 ? -1 : 1); g.strokeRect(Math.min(tx, tx + s9), Math.min(cy, cy + t9), 9, 9); }
      TV.arrow(g, cx, cy, tx, ty, cA, 4);
      g.fillStyle = cA; g.beginPath(); g.arc(tx, ty, 6, 0, 2 * Math.PI); g.fill(); g.strokeStyle = bg; g.lineWidth = 2; g.stroke();
      // the angle theta from the +x axis (counter-clockwise)
      var ra = Math.min(3.2 * sc, Math.max(L * sc * 0.45, 14));
      if (p.th > 0) { g.strokeStyle = mu; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, ra, 0, -p.th * Math.PI / 180, true); g.stroke();
        var mid = -p.th * Math.PI / 360; lab(g, 'θ', ' = ' + nf(p.th, 3) + '°', cx + (ra + 20) * Math.cos(mid), cy + (ra + 14) * Math.sin(mid), mu, 'center', fs - 1, bg); }
      if (Math.abs(V.x) > 0.05) lab(g, 'A_x', ' = ' + nf(V.x, 3), cx + V.x * sc / 2, cy + (V.y >= 0 ? 17 : -17), cX, 'center', fs, bg);
      if (Math.abs(V.y) > 0.05) lab(g, 'A_y', ' = ' + nf(V.y, 3), cx + V.x * sc + (V.x >= 0 ? 1 : -1) * 6, cy - V.y * sc / 2, cY, V.x >= 0 ? 'left' : 'right', fs, bg);
      var mx = (cx + tx) / 2, my = (cy + ty) / 2, ddx = tx - cx, ddy = ty - cy, ll = Math.hypot(ddx, ddy) || 1, nx = ddy / ll, ny = -ddx / ll;
      if (nx * (cx + V.x * sc - mx) + ny * (cy - my) > 0) { nx = -nx; ny = -ny; }   // the label sits outside the rectangle of the components
      lab(g, 'A', ' = ' + nf(p.A, 3), mx + nx * 20, my + ny * 14, cA, 'center', fs, bg);
      if (S.units) {
        TV.arrow(g, cx, cy, cx + sc, cy, fg, 3); TV.arrow(g, cx, cy, cx, cy - sc, fg, 3);
        lab(g, 'i', '', cx + sc * 0.5, cy + 15, fg, 'center', fs + 1, bg); lab(g, 'j', '', cx - 12, cy - sc * 0.5, fg, 'center', fs + 1, bg);
        var sy = V.y < 0 ? ' − ' : ' + ';
        lab(g, 'A = ' + nf(V.x, 3) + ' i' + sy + nf(Math.abs(V.y), 3) + ' j', '', 8, 14, fg, 'left', fs);
      }
      var wq = lab(g, 'A_x', ' ' + signCh(V.x) + '   ', 8, h - 12, cX, 'left', fs); lab(g, 'A_y', ' ' + signCh(V.y), 8 + wq, h - 12, cY, 'left', fs);
    },
    outputs: function (p) {
      var V = vecParts(p);
      return [{ tex: 'A_x = A cos θ', value: V.x }, { tex: 'A_y = A sin θ', value: V.y }, { tex: 'A = sqrt{A_x^2 + A_y^2}', value: Math.hypot(V.x, V.y) },
              { tex: 'tan θ = {A_y}/{A_x}', value: V.x === 0 ? NaN : V.y / V.x }];
    },
    answer: function (p) { return { v: vecParts(p).x }; }
  };

  // ---------------------------------------------------------------- device: braking distance (t1-brake-lab)
  var BR_VMAX = 120 / 3.6, BR_SMAX = 200;
  var BRAKE = {
    animate: true,
    aspect: function (w) { return w < 520 ? 1.2 : 0.7; },
    params: [{ id: 'v', tex: 'v', min: 20, max: 60, step: 5, value: 40, unit: 'km/h' }, { id: 'a', tex: 'a', min: 3, max: 9, step: 0.5, value: 6, unit: 'm/s²' }],
    buttons: [{ label: T('Brake!', 'Jarruta!'), click: function (p, D) { D.S.u = D.motion ? 0 : 1; D.S.run = D.motion; D.S.ran = true; D.S.k = p.v + '|' + p.a; } }],
    draw: function (g, w, h, p, ctx, TV, D) {
      var S = D.S, v0 = p.v / 3.6, a = p.a, s1 = v0 * v0 / (2 * a), s2 = 4 * s1, key = p.v + '|' + p.a;
      if (S.u == null) S.u = 1;
      if (S.k !== key) { S.k = key; S.run = false; S.ran = false; S.u = 1; }
      if (S.run) { S.u += D.dt / clamp(2 * v0 / a, 1.5, 6);   // real stopping time of the 2v car (kept within 1.5 … 6 s)
        if (S.u >= 1) { S.u = 1; S.run = false; } }
      var fg = ctx.color('--fg'), mu = ctx.color('--muted'), wire = ctx.color('--c-wire'), bad = ctx.color('--bad'), c1 = ctx.color('--c-1'), c2 = ctx.color('--c-2'), cA = ctx.color('--f-accel'), bg = ctx.color('--surface'), fs = fsz(w);
      g.clearRect(0, 0, w, h); g.lineJoin = 'round'; g.lineCap = 'round';
      var xmax = 200,   // fixed 200 m (the longest 2v stop is 185 m): v and a change the trail lengths on screen
         x0 = 16, x1 = w - 22, X = function (m) { return x0 + 30 + m / xmax * (x1 - x0 - 30); };
      var T2 = 2 * v0 / a, tau = S.u * T2, tauD = S.ran ? tau : 0, lanes = [[h * 0.15, v0, s1, c1, 'v', 'v'], [h * 0.31, 2 * v0, s2, c2, '2v', '2v']], ya = h * 0.43;
      lanes.forEach(function (L) {
        var yy = L[0], vi = L[1], si = L[2], col = L[3], tstop = vi / a, xi = tau >= tstop ? si : vi * tau - 0.5 * a * tau * tau, now = Math.max(0, vi - a * tauD);
        g.strokeStyle = wire; g.lineWidth = 2; line(g, X(0), yy + 12, X(xmax), yy + 12);
        g.strokeStyle = TV.alpha(mu, 0.9); g.lineWidth = 3; line(g, X(0), yy + 12, X(xi), yy + 12);   // skid trail
        var cw = Math.min(46, w * 0.12), ch = cw * 0.4, ly = yy + 8 - ch - fs * 0.8;   // labels clear the car roof
        g.fillStyle = col; TV.rr(g, X(xi) - cw, yy + 8 - ch, cw, ch, 5); g.fill();
        g.fillStyle = wire; [0.25, 0.75].forEach(function (f) { g.beginPath(); g.arc(X(xi) - cw * (1 - f), yy + 10, 4, 0, 2 * Math.PI); g.fill(); });
        if (S.u >= 1 || tau >= tstop) { g.strokeStyle = bad; g.lineWidth = 2; g.setLineDash([5, 4]); line(g, X(si), yy - 6, X(si), ya); g.setLineDash([]);
          lab(g, L[5] === 'v' ? 's' : '4 s', ln(' = ' + nf(si, 3) + ' m'), X(si) - 4, ly, bad, X(si) > w * 0.5 ? 'right' : 'left', fs, bg); }
        lab(g, L[4], ln(' = ' + nf(now * 3.6, 3) + ' km/h'), x0, ly, col, 'left', fs);
      });
      g.strokeStyle = wire; g.lineWidth = 2; line(g, X(0), ya, X(xmax), ya);
      var tk = xmax <= 30 ? 5 : xmax <= 80 ? 10 : xmax <= 160 ? 20 : 50;
      for (var m = 0; m <= xmax; m += tk) { line(g, X(m), ya - 4, X(m), ya + 4); lab(g, '', String(m), X(m), ya + 14, mu, 'center', fs - 2); }
      lab(g, 'x', ' / m', X(xmax), ya + 28, mu, 'right', fs - 1);
      // graph s over v: the stopping distance s = v²/(2a), so the curve is steeper for a small a; the dots slide down it while the cars brake
      var gx0 = x0 + 34, gx1 = w - 18, gy0 = h * 0.6, gy1 = h * 0.9, GX = function (kmh) { return gx0 + kmh / 120 * (gx1 - gx0); }, GY = function (s) { return gy1 - Math.min(s, BR_SMAX) / BR_SMAX * (gy1 - gy0); };
      g.strokeStyle = wire; g.lineWidth = 1.5; line(g, gx0, gy1, gx1, gy1); line(g, gx0, gy1, gx0, gy0 - 6);
      lab(g, 's', ' / m', gx0 - 4, gy0 - 14, mu, 'left', fs - 1); lab(g, 'v', ' / (km/h)', gx1, gy1 - 10, mu, 'right', fs - 1);
      [0, 60, 120].forEach(function (kv) { lab(g, '', String(kv), GX(kv), gy1 + 14, mu, 'center', fs - 3); }); [0, 100, 200].forEach(function (sv) { lab(g, '', String(sv), gx0 - 5, GY(sv), mu, 'right', fs - 3); });
      g.strokeStyle = cA; g.lineWidth = 3; g.beginPath();
      for (var kv = 0; kv <= 120; kv += 2) { var vm = kv / 3.6, sy = GY(vm * vm / (2 * a)); if (kv === 0) g.moveTo(GX(kv), sy); else g.lineTo(GX(kv), sy); } g.stroke();
      lab(g, 's = v²/(2a)', '', gx1 - 4, gy0 + 4, cA, 'right', fs - 1);
      [[v0, c1], [2 * v0, c2]].forEach(function (D2) {
        var vi = D2[0], now = Math.max(0, vi - a * tauD), rem = now * now / (2 * a);   // remaining stopping distance at the current speed
        g.setLineDash([4, 3]); g.strokeStyle = D2[1]; g.lineWidth = 1.5; line(g, GX(vi * 3.6), gy1, GX(vi * 3.6), GY(vi * vi / (2 * a))); g.setLineDash([]);
        g.fillStyle = D2[1]; g.beginPath(); g.arc(GX(now * 3.6), GY(rem), 6, 0, 2 * Math.PI); g.fill(); g.strokeStyle = bg; g.lineWidth = 2; g.stroke();
      });
      lab(g, '', tx2(ctx, '(cars are not to scale)', '(autot eivät ole mittakaavassa)'), x0, h - 4, mu, 'left', fs - 3);
    },
    outputs: function (p) {
      var v0 = p.v / 3.6, s1 = v0 * v0 / (2 * p.a);
      return [{ tex: 's_1 = {v^2}/{2a}', value: s1, unit: 'm' }, { tex: 's_2 = {(2v)^2}/{2a}', value: 4 * s1, unit: 'm' }, { tex: '{s_2}/{s_1}', value: 4 * v0 * v0 / (2 * p.a) / s1 }];
    }
  };

  // ---------------------------------------------------------------- tables
  function Cq(en, fi) { return T(en, fi); }
  var BASE_ROWS = [
    [Cq('length', 'pituus'), { tex: 'l' }, Cq('metre', 'metri'), 'm'],
    [Cq('mass', 'massa'), { tex: 'm' }, Cq('kilogram', 'kilogramma'), 'kg'],
    [Cq('time', 'aika'), { tex: 't' }, Cq('second', 'sekunti'), 's'],
    [Cq('electric current', 'sähkövirta'), { tex: 'I' }, Cq('ampere', 'ampeeri'), 'A'],
    [Cq('thermodynamic temperature', 'termodynaaminen lämpötila'), { tex: 'T' }, Cq('kelvin', 'kelvin'), 'K'],
    [Cq('amount of substance', 'ainemäärä'), { tex: 'n' }, Cq('mole', 'mooli'), 'mol'],
    [Cq('luminous intensity', 'valovoima'), { tex: 'I_v' }, Cq('candela', 'kandela'), 'cd']
  ];
  var DER = [   // [quantity, unit, symbol, relation] (slide p04, the 21 special names; spellings corrected, see PDF-ERRATA)
    ['plane angle', 'tasokulma', 'radian', 'radiaani', 'rad', '1 rad = 1 m/m = 1'],
    ['solid angle', 'avaruuskulma', 'steradian', 'steradiaani', 'sr', '1 sr = 1 m²/m² = 1'],
    ['frequency', 'taajuus', 'hertz', 'hertsi', 'Hz', '1 Hz = 1/s'],
    ['force', 'voima', 'newton', 'newton', 'N', '1 N = 1 kg·m/s²'],
    ['pressure, stress', 'paine, jännitys', 'pascal', 'pascal', 'Pa', '1 Pa = 1 N/m²'],
    ['energy, work', 'energia, työ', 'joule', 'joule', 'J', '1 J = 1 N·m'],
    ['power', 'teho', 'watt', 'watti', 'W', '1 W = 1 J/s'],
    ['electric charge', 'sähkövaraus', 'coulomb', 'coulombi', 'C', '1 C = 1 A·s'],
    ['potential difference', 'jännite', 'volt', 'voltti', 'V', '1 V = 1 W/A'],
    ['capacitance', 'kapasitanssi', 'farad', 'faradi', 'F', '1 F = 1 A·s/V'],
    ['electric resistance', 'resistanssi', 'ohm', 'ohmi', 'Ω', '1 Ω = 1 V/A'],
    ['conductance', 'konduktanssi', 'siemens', 'siemens', 'S', '1 S = 1/Ω'],
    ['magnetic flux', 'magneettivuo', 'weber', 'weber', 'Wb', '1 Wb = 1 V·s'],
    ['magnetic flux density', 'magneettivuon tiheys', 'tesla', 'tesla', 'T', '1 T = 1 Wb/m²'],
    ['inductance', 'induktanssi', 'henry', 'henry', 'H', '1 H = 1 V·s/A'],
    ['Celsius temperature', 'celsiuslämpötila', 'degree Celsius', 'celsiusaste', '°C', '1 °C = 1 K'],
    ['luminous flux', 'valovirta', 'lumen', 'luumen', 'lm', '1 lm = 1 cd·sr'],
    ['illuminance', 'valaistusvoimakkuus', 'lux', 'luksi', 'lx', '1 lx = 1 lm/m²'],
    ['activity (radioactivity)', 'aktiivisuus', 'becquerel', 'becquerel', 'Bq', '1 Bq = 1/s'],
    ['absorbed dose', 'absorboitunut annos', 'gray', 'gray', 'Gy', '1 Gy = 1 J/kg'],
    ['dose equivalent', 'ekvivalenttiannos', 'sievert', 'sievert', 'Sv', '1 Sv = 1 J/kg']
  ];
  var PFX_ROWS = [   // power, EN name, FI name, symbol, note
    ['24', 'yotta', 'jotta', 'Y', ''], ['21', 'zetta', 'tsetta', 'Z', ''], ['18', 'exa', 'eksa', 'E', ''], ['15', 'peta', 'peta', 'P', ''], ['12', 'tera', 'tera', 'T', ''],
    ['9', 'giga', 'giga', 'G', ''], ['6', 'mega', 'mega', 'M', ''], ['3', 'kilo', 'kilo', 'k', ''], ['2', 'hecto', 'hehto', 'h', 'x'], ['1', 'deca', 'deka', 'da', 'x'],
    ['-1', 'deci', 'desi', 'd', 'x'], ['-2', 'centi', 'sentti', 'c', 'x'], ['-3', 'milli', 'milli', 'm', ''], ['-6', 'micro', 'mikro', 'µ', ''], ['-9', 'nano', 'nano', 'n', ''],
    ['-12', 'pico', 'piko', 'p', ''], ['-15', 'femto', 'femto', 'f', ''], ['-18', 'atto', 'atto', 'a', ''], ['-21', 'zepto', 'tsepto', 'z', ''], ['-24', 'yocto', 'jokto', 'y', ''],
    ['30', 'quetta', 'kvetta', 'Q', 'n'], ['27', 'ronna', 'ronna', 'R', 'n'], ['-27', 'ronto', 'ronto', 'r', 'n'], ['-30', 'quecto', 'kvekto', 'q', 'n']   // (extra) the 2022 prefixes
  ];

  // ---------------------------------------------------------------- the topic
  TDC.registerTopic({
    id: 't1', num: 1,
    title: T('SI system and significant figures', 'SI-järjestelmä ja merkitsevät numerot'),
    subtitle: T('Units, prefixes, vectors and significant figures: the language of every calculation in mechanics.', 'Yksiköt, etuliitteet, vektorit ja merkitsevät numerot: kaiken mekaniikan laskennan kieli.'),
    objectives: [
      T('name the seven SI base quantities and units and the most important derived units', 'nimetä SI-järjestelmän seitsemän perussuuretta ja perusyksikköä sekä tärkeimmät johdannaisyksiköt'),
      T('choose a suitable SI prefix and convert between powers of ten, also for squared and cubed units', 'valita sopivan SI-etuliitteen ja muuntaa kymmenpotenssien välillä, myös neliö- ja kuutioyksiköille'),
      T('resolve a vector into components and find its magnitude and direction', 'jakaa vektorin komponentteihin ja määrittää sen pituuden ja suunnan'),
      T('check an equation by calculating with its units (dimension check)', 'tarkistaa yhtälön laskemalla sen yksiköillä (dimensiotarkistus)'),
      T('count significant figures and round the result of a calculation correctly', 'laskea merkitsevät numerot ja pyöristää laskun tuloksen oikein')
    ],
    glossary: {
      quantity: { en: 'quantity', fi: 'suure', def: T('A property of a body or phenomenon that can be measured or calculated.', 'Kappaleen tai ilmiön ominaisuus, joka voidaan mitata tai laskea.') },
      basequantity: { en: 'base quantity', fi: 'perussuure', def: T('One of the seven independent quantities of the SI system (length, mass, time, current, temperature, amount of substance, luminous intensity).', 'Yksi SI-järjestelmän seitsemästä riippumattomasta suureesta (pituus, massa, aika, sähkövirta, lämpötila, ainemäärä, valovoima).') },
      derivedquantity: { en: 'derived quantity', fi: 'johdannaissuure', def: T('A quantity defined by an equation from base quantities, e.g. force or energy.', 'Suure, joka määritellään yhtälöllä perussuureista, esim. voima tai energia.') },
      unit: { en: 'unit (of measurement)', fi: 'mittayksikkö', def: T('The reference value a quantity is compared with in a measurement, e.g. metre, second.', 'Vertailuarvo, johon suuretta verrataan mittauksessa, esim. metri, sekunti.') },
      baseunit: { en: 'base unit', fi: 'perusyksikkö', def: T('The unit of a base quantity: m, kg, s, A, K, mol, cd.', 'Perussuureen yksikkö: m, kg, s, A, K, mol, cd.') },
      derivedunit: { en: 'derived unit', fi: 'johdannaisyksikkö', def: T('A unit formed from base units by multiplication and division, e.g. N = kg·m/s².', 'Perusyksiköistä kerto- ja jakolaskulla muodostettu yksikkö, esim. N = kg·m/s².') },
      specialname: { en: 'special name', fi: 'erityisnimi', def: T('A derived unit with its own name and symbol, e.g. newton, joule, pascal.', 'Johdannaisyksikkö, jolla on oma nimi ja tunnus, esim. newton, joule, pascal.') },
      measurement: { en: 'measurement', fi: 'mittaus', def: T('Comparing a quantity with its unit.', 'Suureen vertaaminen sen yksikköön.') },
      valueq: { en: 'value of a quantity', fi: 'suureen arvo', sym: 'quantity = numerical value · unit', def: T('The numerical value multiplied by the unit, e.g. 12 m.', 'Lukuarvo kerrottuna mittayksiköllä, esim. 12 m.') },
      numval: { en: 'numerical value', fi: 'lukuarvo', def: T('The number in front of the unit.', 'Yksikön edessä oleva luku.') },
      scalar: { en: 'scalar quantity', fi: 'skalaarisuure', def: T('A quantity with a size only, e.g. temperature or time.', 'Suure, jolla on vain suuruus, esim. lämpötila tai aika.') },
      vector: { en: 'vector quantity', fi: 'vektorisuure', def: T('A quantity with a size and a direction, e.g. velocity or force.', 'Suure, jolla on suuruus ja suunta, esim. nopeus tai voima.') },
      si: { en: 'SI system', fi: 'SI-järjestelmä, SI-mittayksikköjärjestelmä', def: T('The International System of Units, built on seven base units.', 'Kansainvälinen yksikköjärjestelmä, joka perustuu seitsemään perusyksikköön.') },
      prefix: { en: 'prefix', fi: 'etuliite', def: T('A letter in front of a unit symbol that multiplies the unit by a power of ten (k = 10³, m = 10⁻³).', 'Yksikkötunnuksen edessä oleva kirjain, joka kertoo yksikön kymmenpotenssilla (k = 10³, m = 10⁻³).') },
      multiple: { en: 'multiple (of a unit)', fi: 'kerrannainen', def: T('A unit multiplied by a power of ten, written with a prefix.', 'Kymmenpotenssilla kerrottu yksikkö, kirjoitetaan etuliitteellä.') },
      factor: { en: 'factor, power', fi: 'kerroin', def: T('The number a prefix stands for, e.g. 10⁶ for mega.', 'Luku, jota etuliite tarkoittaa, esim. 10⁶ etuliitteellä mega.') },
      vectorq: { en: 'vector', fi: 'vektori', def: T('An arrow-like quantity with a length and a direction; in 2-D it can be given by its components.', 'Nuolimainen suure, jolla on pituus ja suunta; tasossa se voidaan antaa komponenteillaan.') },
      component: { en: 'component', fi: 'komponentti', def: T('The part of a vector along one axis: A_x = A cos θ, A_y = A sin θ.', 'Vektorin osa yhden akselin suunnassa: A_x = A cos θ, A_y = A sin θ.') },
      unitvector: { en: 'unit vector', fi: 'yksikkövektori', sym: 'i, j, k', def: T('A vector of length 1 along an axis: i along x, j along y, k along z.', 'Pituudeltaan 1:n vektori akselin suunnassa: i x-akselin, j y-akselin ja k z-akselin suuntaan.') },
      vlength: { en: 'length of a vector', fi: 'vektorin pituus', sym: 'A = √(A_x² + A_y²)', def: T('The magnitude of the vector, a scalar.', 'Vektorin suuruus, skalaari.') },
      direction: { en: 'direction', fi: 'suunta', sym: 'tan θ = A_y/A_x', def: T('The angle θ of a vector measured from the positive x axis.', 'Vektorin kulma θ mitattuna positiivisesta x-akselista.') },
      dimcheck: { en: 'dimensionally consistent', fi: 'mittayksiköiltään (dimensioiltaan) yhtenevä', def: T('Both sides of an equation have the same unit.', 'Yhtälön molemmilla puolilla on sama yksikkö.') },
      conversion: { en: 'conversion', fi: 'muunnos', def: T('Writing the same quantity in another unit, e.g. 1 cm³ = 10⁻⁶ m³.', 'Saman suureen kirjoittaminen toisessa yksikössä, esim. 1 cm³ = 10⁻⁶ m³.') },
      sigfig: { en: 'significant figure', fi: 'merkitsevä numero', def: T('A digit that carries information about the precision of a number.', 'Numero, joka kertoo luvun tarkkuudesta.') },
      leadzero: { en: 'leading zero', fi: 'etunolla', def: T('A zero before the first nonzero digit: never significant.', 'Nolla ennen ensimmäistä nollasta eroavaa numeroa: ei koskaan merkitsevä.') },
      endzero: { en: 'ending (trailing) zero', fi: 'loppunolla', def: T('A zero at the end of a number: significant only if the number has a decimal point.', 'Luvun lopussa oleva nolla: merkitsevä vain, jos luvussa on desimaalipilkku.') },
      intzero: { en: 'internal zero', fi: 'sisäinen nolla', def: T('A zero between nonzero digits: always significant.', 'Nollasta eroavien numeroiden välissä oleva nolla: aina merkitsevä.') },
      decplace: { en: 'decimal place', fi: 'desimaali', def: T('A digit after the decimal point.', 'Desimaalipilkun jälkeinen numero.') },
      decpoint: { en: 'decimal point', fi: 'desimaalipilkku', def: T('The separator between the integer part and the decimals (a comma in Finnish, a point in English).', 'Kokonaisosan ja desimaalien erotin (suomessa pilkku, englannissa piste).') },
      rounding: { en: 'rounding', fi: 'pyöristys', def: T('Replacing a number by a shorter one; the course rounds half up (…5 goes up).', 'Luvun korvaaminen lyhyemmällä; kurssilla pyöristetään puolikas ylöspäin (…5 pyöristyy ylös).') },
      unrounded: { en: 'unrounded answer', fi: 'pyöristämätön vastaus', def: T('The result with all calculator digits; round only this, never the steps before it.', 'Tulos kaikilla laskimen numeroilla; vain tämä pyöristetään, ei sitä edeltäviä vaiheita.') },
      interm: { en: 'intermediate result', fi: 'välitulos', def: T('A result in the middle of a longer calculation; it is not rounded.', 'Pidemmän laskun välivaiheen tulos; sitä ei pyöristetä.') },
      mulsig: { en: 'multiplication / division', fi: 'kertolasku / jakolasku', def: T('Significant figures: the result has as many as the least accurate factor.', 'Merkitsevät numerot: tuloksessa on yhtä monta kuin epätarkimmassa tekijässä.') },
      addsig: { en: 'addition / subtraction', fi: 'yhteenlasku / vähennyslasku', def: T('Decimals: the result has as many decimal places as the least precise term.', 'Desimaalit: tuloksessa on yhtä monta desimaalia kuin epätarkimmassa termissä.') },
      numerator: { en: 'numerator / denominator', fi: 'osoittaja / nimittäjä', def: T('Top and bottom of a fraction; a prefix belongs in the numerator.', 'Murtoluvun ylä- ja alaosa; etuliite kuuluu osoittajaan.') },
      brakedist: { en: 'braking distance', fi: 'jarrutusmatka', sym: 's = v²/(2a)', def: T('The distance a vehicle needs to stop at a constant deceleration.', 'Matka, jonka ajoneuvo tarvitsee pysähtyäkseen vakiohidastuvuudella.') },
      piston: { en: 'piston, cylinder', fi: 'mäntä, sylinteri', def: T('The moving part and the chamber of an engine (exercise 1.2).', 'Moottorin liikkuva osa ja kammio (tehtävä 1.2).') },
      pressure: { en: 'pressure', fi: 'paine', sym: 'p = F/A', def: T('Force per area; unit pascal (Pa); 1 bar = 100 kPa.', 'Voima pinta-alaa kohti; yksikkö pascal (Pa); 1 bar = 100 kPa.') }
    },
    formulas: [
      { name: T('Value of a quantity', 'Suureen arvo'), tex: T('quantity = numerical value · unit', 'suure = lukuarvo · yksikkö') },
      { name: T('Components of a vector', 'Vektorin komponentit'), tex: 'A_x = A cos θ,  A_y = A sin θ' },
      { name: T('Vector in unit-vector form', 'Vektori yksikkövektorein'), tex: 'A = A_x i + A_y j' },
      { name: T('Length and direction of a vector', 'Vektorin pituus ja suunta'), tex: 'A = sqrt{A_x^2 + A_y^2},  tan θ = {A_y}/{A_x}' },
      { name: T('Electrical energy', 'Sähköenergia'), tex: 'E = P t = U I t' },
      { name: T('Pressure from force and diameter', 'Paine voimasta ja halkaisijasta'), tex: 'p = {4F}/{π d^2}' },
      { name: T('Braking distance', 'Jarrutusmatka'), tex: 's = {v^2}/{2a}' },
      { name: T('Energy unit conversion', 'Energian yksikönmuunnos'), tex: '1 kWh = 3.6 MJ' },
      { name: T('Pressure unit conversion', 'Paineen yksikönmuunnos'), tex: '1 bar = 100 kN/m^2 = 10^5 N/m^2' }
    ],
    sections: [
      // ======================================================== 1.1 base quantities and units (p03)
      { id: 't1-base', title: T('SI base quantities and units', 'SI-perus­suureet ja -yksiköt'),
        blocks: [
          { id: 't1-base-text', type: 'text', html: T(
            '<p>A <dfn data-term="quantity">quantity</dfn> is a property of a body or phenomenon that can be measured or calculated. In a <dfn data-term="measurement">measurement</dfn> the quantity is compared with its <dfn data-term="unit">unit</dfn> (metre, second, …). The <dfn data-term="valueq">value of a quantity</dfn> is the <dfn data-term="numval">numerical value</dfn> multiplied by the unit, for example <f>l = 12 m</f>.</p><p>A <dfn data-term="scalar">scalar quantity</dfn> has only a size (temperature, time). A <dfn data-term="vector">vector quantity</dfn> also has a direction (velocity, force).</p>',
            '<p><dfn data-term="quantity">Suure</dfn> on kappaleen tai ilmiön ominaisuus, joka voidaan mitata tai laskea. <dfn data-term="measurement">Mittauksessa</dfn> suuretta verrataan sen <dfn data-term="unit">mittayksikköön</dfn> (metri, sekunti, …). <dfn data-term="valueq">Suureen arvo</dfn> on <dfn data-term="numval">lukuarvo</dfn> kerrottuna yksiköllä, esimerkiksi <f>l = 12 m</f>.</p><p><dfn data-term="scalar">Skalaarisuureella</dfn> on vain suuruus (lämpötila, aika). <dfn data-term="vector">Vektorisuureella</dfn> on lisäksi suunta (nopeus, voima).</p>') },
          { id: 't1-base-key', type: 'callout', kind: 'key', title: T('Quantity = number · unit', 'Suure = luku · yksikkö'), html: T(
            'Always write the unit after the number: an answer without a unit is not an answer. The slides say it plainly: in the exercises and in the exam you must also give the correct unit (the symbol after the answer).',
            'Kirjoita yksikkö aina luvun perään: vastaus ilman yksikköä ei ole vastaus. Kalvoilla sanotaan suoraan: tehtävissä ja kokeessa on osattava antaa myös oikea yksikkö (tunnus vastauksen perässä).') },
          { id: 't1-base-text2', type: 'text', html: T(
            '<p>The <dfn data-term="si">SI system</dfn> rests on seven <dfn data-term="basequantity">base quantities</dfn> and their <dfn data-term="baseunit">base units</dfn>. Everything else is derived from them.</p>',
            '<p><dfn data-term="si">SI-järjestelmä</dfn> perustuu seitsemään <dfn data-term="basequantity">perussuureeseen</dfn> ja niiden <dfn data-term="baseunit">perusyksikköön</dfn>. Kaikki muu johdetaan niistä.</p>') },
          { id: 't1-base-tab', type: 'table', caption: T('The seven SI base quantities. The slide uses the symbol I for both current and luminous intensity; the luminous intensity is I_v. Quantity symbols are italic, unit symbols upright.', 'SI-järjestelmän seitsemän perussuuretta. Kalvolla sekä sähkövirran että valovoiman tunnus on I; valovoiman tunnus on I_v. Suuretunnukset ovat kursiivilla, yksikkötunnukset pystyssä.'),
            head: [T('Quantity', 'Suure'), T('Symbol', 'Tunnus'), T('Base unit', 'Perusyksikkö'), T('Unit symbol', 'Yksikön tunnus')], rows: BASE_ROWS },
          { id: 't1-base-tip', type: 'callout', kind: 'info', title: T('The kilogram is the odd one', 'Kilogramma on poikkeus'), html: T(
            // (extra)
            'The base unit of mass is the <b>kilo</b>gram: it already contains a prefix. Prefixes for mass are therefore attached to the gram (mg, g) and never to “kg” (a “Mkg” does not exist, see the prefix rules).',
            'Massan perusyksikkö on <b>kilo</b>gramma: siinä on jo etuliite. Massan etuliitteet liitetään siksi grammaan (mg, g), ei koskaan ”kg”:aan (”Mkg” ei ole olemassa, ks. etuliitesäännöt).') },
          { type: 'question', q: 't1-q1', id: 't1-q1-blk' },
          { type: 'question', q: 't1-q2', id: 't1-q2-blk' },
          { type: 'question', q: 't1-q3', id: 't1-q3-blk' }
        ] },

      // ======================================================== 1.2-1.3 derived units and prefixes (p04, p05)
      { id: 't1-derived', title: T('Derived units and prefixes', 'Johdannais­yksiköt ja etuliitteet'),
        blocks: [
          { id: 't1-der-text', type: 'text', html: T(
            '<p><dfn data-term="derivedunit">Derived units</dfn> are obtained from the base units by the rules of algebra, and the most important have a <dfn data-term="specialname">special name</dfn>. It is recommended to use the derived units and their symbols.</p>',
            '<p><dfn data-term="derivedunit">Johdannaisyksiköt</dfn> saadaan perusyksiköistä algebran säännöillä, ja tärkeimmillä on oma <dfn data-term="specialname">erityisnimi</dfn>. Johdannaisyksiköiden ja niiden tunnusten käyttöä suositellaan.</p>') },
          { id: 't1-der-tab', type: 'table', caption: T('The derived units with special names (slide p04, 21 rows). Corrected spellings: hertz, conductance, Celsius, resistance, becquerel, magnetic flux density, absorbed dose.', 'Johdannaisyksiköt, joilla on erityisnimi (kalvo s. 04, 21 riviä). Korjatut kirjoitusasut: hertz, conductance, Celsius, resistance, becquerel, magnetic flux density, absorbed dose.'),
            head: [T('Quantity', 'Suure'), T('Unit', 'Yksikkö'), T('Symbol', 'Tunnus'), T('In other units', 'Muissa yksiköissä')],
            rows: DER.map(function (r) { return [T(r[0], r[1]), T(r[2], r[3]), r[4], r[5]]; }) },
          { type: 'question', q: 't1-q4', id: 't1-q4-blk' },
          { type: 'question', q: 't1-q6', id: 't1-q6-blk' },
          { id: 't1-pfx-h', type: 'h', text: T('SI prefixes', 'SI-etuliitteet') },
          { id: 't1-pfx-text', type: 'text', html: T(
            '<p>A <dfn data-term="prefix">prefix</dfn> in front of the unit symbol multiplies the unit by a power of ten and gives a <dfn data-term="multiple">multiple</dfn> of the unit. The prefixes of the slides are in the table; the italic ones (hecto, deca, deci, centi) are not recommended, because their exponent is not divisible by three.</p>',
            '<p>Yksikkötunnuksen edessä oleva <dfn data-term="prefix">etuliite</dfn> kertoo yksikön kymmenpotenssilla ja antaa yksikön <dfn data-term="multiple">kerrannaisen</dfn>. Kalvojen etuliitteet ovat taulukossa; kursivoituja (hehto, deka, desi, sentti) ei suositella, koska niiden eksponentti ei ole jaollinen kolmella.</p>') },
          { id: 't1-pfx-tab', type: 'table', caption: T('SI prefixes. The slide prints Finnish-style names for 10²⁴ … 10²¹ and 10⁻²¹ … 10⁻²⁴ (jotta, tsetta, tsepto, jokto); the English names are yotta, zetta, zepto, yocto. “not recommended” = rule 2 below. (extra) The four prefixes of 2022 (quetta, ronna, ronto, quecto) are not on the slides.', 'SI-etuliitteet. Kalvolla 10²⁴ … 10²¹ ja 10⁻²¹ … 10⁻²⁴ on kirjoitettu suomalaisittain (jotta, tsetta, tsepto, jokto); englanniksi yotta, zetta, zepto, yocto. ”ei suositella” = alla oleva sääntö 2. (lisä) Vuoden 2022 neljä etuliitettä (kvetta, ronna, ronto, kvekto) eivät ole kalvoilla.'),
            head: [T('Power', 'Potenssi'), T('Prefix', 'Etuliite'), T('Symbol', 'Tunnus'), T('Note', 'Huomautus')],
            rows: PFX_ROWS.map(function (r) {
              return [{ tex: '10^{' + r[0] + '}' }, T(r[1], r[2]), r[3], r[4] === 'x' ? T('not recommended', 'ei suositella') : r[4] === 'n' ? T('added in 2022 (extra)', 'lisätty 2022 (lisä)') : ''];
            }) },
          { id: 't1-prefix-lab', type: 'interactive', widget: 'custom', title: T('Prefix ruler: from 10⁻²⁴ to 10²⁴', 'Etuliiteviivain: 10⁻²⁴:stä 10²⁴:ään'),
            caption: T('Set the mantissa m and the power of ten n of a value and pick a unit. The top strip is the whole range with the prefix bands; the lit band is the best prefix (exponent divisible by three, numerical value 1 … 1000; rule 1 also allows 0.1 … 1, e.g. 0.5 mJ). The lower ruler zooms to the value and is labelled with the prefix of each decade. The text shows the same value in all its forms: 1.0 mJ = 1000 µJ = 1.0·10⁻³ J = 0.0010 J. Press “Zoom in” to fly in from 10²⁴.',
              'Aseta arvon mantissa m ja kymmenpotenssi n ja valitse yksikkö. Ylempi viiva on koko alue etuliitealueineen; valaistu alue on paras etuliite (eksponentti jaollinen kolmella, lukuarvo 1 … 1000; sääntö 1 sallii myös 0,1 … 1, esim. 0,5 mJ). Alempi viivain zoomaa arvoon ja siinä on kunkin dekadin etuliite. Teksti näyttää saman arvon kaikissa muodoissa: 1,0 mJ = 1000 µJ = 1,0·10⁻³ J = 0,0010 J. Paina ”Zoomaa sisään” lentääksesi alueelle 10²⁴.'),
            config: dev(PREFIX) },
          { id: 't1-pfx-rules-h', type: 'h', text: T('Seven rules for using prefixes', 'Seitsemän sääntöä etuliitteiden käyttöön') },
          { id: 't1-pfx-rules', type: 'list', ordered: true, items: [
            T('<b>Value between 0.1 and 1000.</b> Choose the prefix so the numerical value lies in this range: 3.49 mm, not 3490 µm.', '<b>Arvo välille 0,1 … 1000.</b> Valitse etuliite niin, että lukuarvo on tällä välillä: 3,49 mm, ei 3490 µm.'),
            T('<b>Exponent divisible by three.</b> 22.0·10⁵ Pa = 2.20·10⁶ Pa = 2.20 MPa.', '<b>Eksponentti jaollinen kolmella.</b> 22,0·10⁵ Pa = 2,20·10⁶ Pa = 2,20 MPa.'),
            T('<b>The prefix is in front of the unit symbol</b> and is raised to the power together with the unit: <f>1 cm^3 = (1·10^{-2} m)^3 = 10^{-6} m^3</f>.', '<b>Etuliite on yksikkötunnuksen edessä</b> ja korotetaan potenssiin yksikön mukana: <f>1 cm^3 = (1·10^{-2} m)^3 = 10^{-6} m^3</f>.'),
            T('<b>Only one prefix, in the numerator.</b> 1 000 000 kg = 1 Gg, not 1 Mkg; preferably 1 Mm/s rather than 1 m/µs.', '<b>Vain yksi etuliite, osoittajassa.</b> 1 000 000 kg = 1 Gg, ei 1 Mkg; mieluummin 1 Mm/s kuin 1 m/µs.'),
            T('<b>No room for misunderstanding.</b> The unit of torque is N·m, not mN (that would be a millinewton).', '<b>Ei sekaannuksen mahdollisuutta.</b> Momentin yksikkö on N·m, ei mN (se olisi millinewton).'),
            T('<b>Oblique line: the denominator in brackets.</b> W/(K·m²) and J/(kg·°C).', '<b>Vinoviiva: nimittäjä sulkuihin.</b> W/(K·m²) ja J/(kg·°C).'),
            T('<b>For calculation use the 10ⁿ format.</b> <f>10 kV · 5 mA = 10·10^3 V · 5·10^{-3} A = 50 W</f>.', '<b>Laskemisessa käytä 10ⁿ-muotoa.</b> <f>10 kV · 5 mA = 10·10^3 V · 5·10^{-3} A = 50 W</f>.')] },
          { id: 't1-pfx-ex', type: 'example', title: T('Choosing the prefix (slide p09, item 2)', 'Etuliitteen valinta (kalvo s. 09, kohta 2)'),
            problem: T('Write each energy with a suitable prefix: a) 1 000 000 J, b) 100 J, c) 10 000 J, d) 0.0010 J, e) 0.000001 J, f) 0.00010 J.', 'Kirjoita kukin energia sopivalla etuliitteellä: a) 1 000 000 J, b) 100 J, c) 10 000 J, d) 0,0010 J, e) 0,000001 J, f) 0,00010 J.'),
            given: ['1 MJ = 10^6 J', '1 kJ = 10^3 J', '1 mJ = 10^{-3} J', '1 µJ = 10^{-6} J'],
            steps: [
              T('a) 1 000 000 J = 10⁶ J = <b>1 MJ</b>.', 'a) 1 000 000 J = 10⁶ J = <b>1 MJ</b>.'),
              T('b) 100 J is already between 0.1 and 1000: <b>100 J</b> (or 0.1 kJ).', 'b) 100 J on jo välillä 0,1 … 1000: <b>100 J</b> (tai 0,1 kJ).'),
              T('c) 10 000 J = 10 · 10³ J = <b>10 kJ</b>.', 'c) 10 000 J = 10 · 10³ J = <b>10 kJ</b>.'),
              T('d) 0.0010 J = 1.0·10⁻³ J = <b>1.0 mJ</b> (1000 µJ also fits the range, but 1.0 mJ is shorter).', 'd) 0,0010 J = 1,0·10⁻³ J = <b>1,0 mJ</b> (myös 1000 µJ mahtuu välille, mutta 1,0 mJ on lyhyempi).'),
              T('e) 0.000001 J = 10⁻⁶ J = <b>1 µJ</b> (or 1000 nJ).', 'e) 0,000001 J = 10⁻⁶ J = <b>1 µJ</b> (tai 1000 nJ).'),
              T('f) 0.00010 J = 100·10⁻⁶ J = <b>100 µJ</b> (or 0.10 mJ).', 'f) 0,00010 J = 100·10⁻⁶ J = <b>100 µJ</b> (tai 0,10 mJ).')],
            result: T('1 MJ, 100 J, 10 kJ, 1.0 mJ, 1 µJ, 100 µJ', '1 MJ, 100 J, 10 kJ, 1,0 mJ, 1 µJ, 100 µJ') },
          { type: 'question', q: 't1-q7', id: 't1-q7-blk' },
          { type: 'question', q: 't1-q9', id: 't1-q9-blk' },
          { type: 'question', q: 't1-q10', id: 't1-q10-blk' }
        ] },

      // ======================================================== 1.4 vectors (p06)
      { id: 't1-vectors', title: T('Vectors and components', 'Vektorit ja komponentit'),
        blocks: [
          { id: 't1-vec-text', type: 'text', html: T(
            '<p>A <dfn data-term="vector">vector quantity</dfn> has a direction in addition to its numerical value. In a plane a vector <f>A</f> can be given by its <dfn data-term="component">components</dfn>, which contain as much information as the vector itself. With the <dfn data-term="unitvector">unit vectors</dfn> <f>i</f> (along x) and <f>j</f> (along y), each of length 1:</p>',
            '<p><dfn data-term="vector">Vektorisuureella</dfn> on lukuarvon lisäksi suunta. Tasossa vektori <f>A</f> voidaan antaa <dfn data-term="component">komponenteillaan</dfn>, jotka sisältävät yhtä paljon tietoa kuin itse vektori. <dfn data-term="unitvector">Yksikkövektoreilla</dfn> <f>i</f> (x-suunnassa) ja <f>j</f> (y-suunnassa), joiden pituus on 1:</p>') },
          { id: 't1-vec-f1', type: 'formula', key: true, tex: 'A = A_x i + A_y j', label: T('Vector in unit-vector form (in 3-D also + A_z k)', 'Vektori yksikkövektoreilla (3D:ssä myös + A_z k)') },
          { id: 't1-vec-f2', type: 'formula', key: true, tex: 'A_x = A cos θ,  A_y = A sin θ', label: T('Components (θ measured from the x axis)', 'Komponentit (θ mitataan x-akselista)'),
            legend: [['A', T('length (magnitude) of the vector', 'vektorin pituus (suuruus)'), ''], ['θ', T('angle from the positive x axis, counter-clockwise', 'kulma positiivisesta x-akselista vastapäivään'), '°'], ['A_x', T('x-component', 'x-komponentti'), ''], ['A_y', T('y-component', 'y-komponentti'), '']] },
          { id: 't1-vec-f3', type: 'formula', key: true, tex: 'A = sqrt{A_x^2 + A_y^2},  tan θ = {A_y}/{A_x}', label: T('Length and direction from the components', 'Pituus ja suunta komponenteista') },
          { id: 't1-vec-lab', type: 'interactive', widget: 'custom', title: T('Vector component explorer', 'Vektorin komponenttien tutkija'),
            caption: T('Drag the tip of A with the mouse or finger (or use the sliders A and θ, also with the keyboard). The right triangle shows A_x = A cos θ along the x axis and A_y = A sin θ as the vertical side. Switch the unit vectors i, j on to see A = A_x i + A_y j. Press Run: θ turns a full circle and you see the signs of the components in each quadrant. The same resolving is used in topic 3 for the weight mg on an incline.',
              'Vedä A:n kärkeä hiirellä tai sormella (tai käytä liukusäätimiä A ja θ, myös näppäimistöllä). Suorakulmainen kolmio näyttää A_x = A cos θ x-akselin suunnassa ja A_y = A sin θ pystysivuna. Kytke yksikkövektorit i, j päälle nähdäksesi A = A_x i + A_y j. Paina Aja: θ kiertää täyden kierroksen ja näet komponenttien etumerkit jokaisessa neljänneksessä. Samaa jakamista käytetään aiheessa 3 painon mg jakamiseen kaltevalla tasolla.'),
            config: dev(VEC) },
          { id: 't1-vec-ex', type: 'example', title: T('From components to length and direction (extra)', 'Komponenteista pituuteen ja suuntaan (lisä)'),
            problem: T('A force has the components F_x = −6.0 N and F_y = 8.0 N. Find its magnitude and the angle θ from the positive x axis.', 'Voiman komponentit ovat F_x = −6,0 N ja F_y = 8,0 N. Määritä sen suuruus ja kulma θ positiivisesta x-akselista.'),
            given: ['F_x = −6.0 N', 'F_y = 8.0 N'],
            steps: [
              { tex: 'F = sqrt{F_x^2 + F_y^2} = sqrt{(−6.0 N)^2 + (8.0 N)^2} = 10 N' },
              T('tan θ = F_y/F_x = 8.0/(−6.0). The calculator gives atan(−1.333) = −53.1°: that points into quadrant IV, but the vector has x negative and y positive (quadrant II).', 'tan θ = F_y/F_x = 8,0/(−6,0). Laskin antaa atan(−1,333) = −53,1°: se osoittaa neljänneksestä IV, mutta vektorilla x on negatiivinen ja y positiivinen (neljännes II).'),
              T('Add 180°: θ = −53.1° + 180° = 126.9°. Always check the signs of the components in the sketch.', 'Lisää 180°: θ = −53,1° + 180° = 126,9°. Tarkista komponenttien etumerkit aina piirroksesta.')],
            result: T('F = 10 N, θ ≈ 127° (from the +x axis)', 'F = 10 N, θ ≈ 127° (+x-akselista)') },
          { id: 't1-vec-warn', type: 'callout', kind: 'warn', title: T('Sine or cosine?', 'Sini vai kosini?'), html: T(
            'The formulas <f>A_x = A cos θ</f> and <f>A_y = A sin θ</f> hold when θ is measured from the <b>x axis</b>. If the angle is given from the y axis (or from the vertical, as with the weight on an incline), the roles of sin and cos swap. Draw the right triangle and ask which side is next to the angle (cos) and which is opposite (sin).',
            'Kaavat <f>A_x = A cos θ</f> ja <f>A_y = A sin θ</f> pätevät, kun θ mitataan <b>x-akselista</b>. Jos kulma annetaan y-akselista (tai pystysuunnasta, kuten painolla kaltevalla tasolla), sinin ja kosinin roolit vaihtuvat. Piirrä suorakulmainen kolmio ja kysy, mikä sivu on kulman vieressä (kosini) ja mikä vastapäätä (sini).') },
          { type: 'question', q: 't1-q12', id: 't1-q12-blk' },
          { type: 'question', q: 't1-q13', id: 't1-q13-blk' },
          { type: 'question', q: 't1-q15', id: 't1-q15-blk' },
          { type: 'question', q: 't1-q16', id: 't1-q16-blk' }
        ] },

      // ======================================================== 1.5 quantity calculation (p07) + exercises B1-B4
      { id: 't1-calc', title: T('Calculating with quantities and units', 'Lasku­toimitukset suureilla ja yksiköillä'),
        blocks: [
          { id: 't1-calc-text', type: 'text', html: T(
            '<p>Derived quantities are defined by mathematical equations, and the equations are <dfn data-term="dimcheck">dimensionally consistent</dfn>. The calculation is carried out on the numerical values <b>and on the units</b>, by the rules of algebra. If you put the numerical values in base units into the formula, the requested quantity comes out in base units. The units therefore work as a free check: if the unit of the result is wrong, so is the formula.</p>',
            '<p>Johdannaissuureet määritellään matemaattisilla yhtälöillä, ja yhtälöt ovat <dfn data-term="dimcheck">mittayksiköiltään yhteneviä</dfn>. Laskenta tehdään lukuarvoilla <b>ja yksiköillä</b> algebran säännöin. Jos kaavaan sijoitetaan perusyksiköissä olevat lukuarvot, haluttu suure tulee perusyksikössä. Yksiköt ovat siksi ilmainen tarkistus: jos tuloksen yksikkö on väärä, myös kaava on väärä.') },
          { id: 't1-dim-lab', type: 'interactive', widget: 'custom', title: T('Dimension checker', 'Dimensiotarkistin'),
            caption: T('Choose a formula and press Run. Each side is built as a stack of base-unit blocks: units in the numerator go above the line, units in the denominator below. Blocks above and below the line cancel, a square root halves the stack. The two stacks are then compared: ✓ if they are the same, ✗ if not. (Numbers such as ½, 2π and 4 have no unit.) These are the formulas of exercise B1; L is the inductance, I the current, B the magnetic flux density and F a force.',
              'Valitse kaava ja paina Aja. Kumpikin puoli rakennetaan perusyksikkölohkojen pinoksi: osoittajan yksiköt viivan yläpuolelle, nimittäjän alapuolelle. Viivan ylä- ja alapuolen lohkot kumoavat toisensa, neliöjuuri puolittaa pinon. Sitten pinoja verrataan: ✓ jos ne ovat samat, ✗ jos eivät. (Luvuilla kuten ½, 2π ja 4 ei ole yksikköä.) Nämä ovat tehtävän B1 kaavat; L on induktanssi, I virta, B magneettivuon tiheys ja F voima.'),
            config: dev(DIM) },
          { id: 't1-dim-ex', type: 'example', title: T('Dimension check of the kinetic energy', 'Liike-energian dimensiotarkistus'),
            problem: T('Is the equation E = ½ m v² dimensionally correct for an energy?', 'Onko yhtälö E = ½ m v² dimensioiltaan oikein energialle?'),
            given: ['[m] = kg', '[v] = m/s', '[E] = J = N·m'],
            steps: [
              T('Calculate the unit of the right side; the number ½ has no unit.', 'Laske oikean puolen yksikkö; luvulla ½ ei ole yksikköä.'),
              { tex: '[½ m v^2] = kg · (m/s)^2 = kg·m^2/s^2' },
              T('The left side: 1 J = 1 N·m = 1 (kg·m/s²)·m = 1 kg·m²/s².', 'Vasen puoli: 1 J = 1 N·m = 1 (kg·m/s²)·m = 1 kg·m²/s².'),
              T('Both sides are kg·m²/s²: the equation is dimensionally correct.', 'Molemmat puolet ovat kg·m²/s²: yhtälö on dimensioiltaan oikein.')],
            result: T('correct (a check of units cannot find a wrong number such as ½, only a wrong structure)', 'oikein (yksikkötarkistus ei löydä väärää lukukerrointa kuten ½, vain väärän rakenteen)') },
          { type: 'question', q: 't1-q17', id: 't1-q17-blk' },
          { type: 'question', q: 't1-q19', id: 't1-q19-blk' },
          { type: 'question', q: 't1-q20', id: 't1-q20-blk' },
          { id: 't1-calc-h', type: 'h', text: T('Units as numbers: electrical energy', 'Yksiköt lukujen tavoin: sähköenergia') },
          { id: 't1-energy-ex', type: 'example', title: T('Electrical energy (slide p07)', 'Sähköenergia (kalvo s. 07)'),
            problem: T('A device takes the current I = 15 A from the voltage U = 230 V for t = 45 min. Calculate the electrical energy E in joules, in megajoules and in kilowatt-hours (1 kWh = 3.6 MJ).', 'Laite ottaa virran I = 15 A jännitteestä U = 230 V ajan t = 45 min. Laske sähköenergia E jouleina, megajouleina ja kilowattitunteina (1 kWh = 3,6 MJ).'),
            given: ['U = 230 V', 'I = 15 A', 't = 45 min = 45·60 s = 2700 s'],
            steps: [
              T('Put the values in base units: the time must be in seconds.', 'Sijoita arvot perusyksiköissä: aika on oltava sekunteina.'),
              { tex: 'E = P t = U I t = 230 V · 15 A · 2700 s = 9 315 000 V·A·s' },
              T('V·A = W and W·s = J, so the unit is the joule: 9 315 000 J. With 10⁶ = M this is 9.315 MJ.', 'V·A = W ja W·s = J, joten yksikkö on joule: 9 315 000 J. Kun 10⁶ = M, tämä on 9,315 MJ.'),
              { tex: 'E = {9.315 MJ}/{3.6 MJ/kWh} = 2.5875 kWh ≈ 2.6 kWh' },
              T('The data have 2 and 3 significant figures: the answer 2.6 kWh gets two (see the next section).', 'Lähtöarvoissa on 2 ja 3 merkitsevää numeroa: vastaukseen 2,6 kWh jää kaksi (ks. seuraava osa).')],
            result: T('E = 9.315 MJ ≈ 2.6 kWh', 'E = 9,315 MJ ≈ 2,6 kWh') },
          { type: 'question', q: 't1-q21', id: 't1-q21-blk' },
          { id: 't1-brake-h', type: 'h', text: T('Exercise B2: how does the braking distance depend on speed?', 'Tehtävä B2: miten jarrutusmatka riippuu nopeudesta?') },
          { id: 't1-brake-text', type: 'text', html: T(
            '<p>For road safety it is useful to know how the <dfn data-term="brakedist">braking distance</dfn> depends on the initial speed when the braking performance stays the same. With a constant deceleration a, the final speed 0 gives <f>0 = v^2 − 2 a s</f>, so <f>s = {v^2}/{2a}</f>. The speed enters as a <b>square</b>: use that, then look at the lab.</p>',
            '<p>Tieliikenteen turvallisuuden kannalta on tärkeää tietää, miten <dfn data-term="brakedist">jarrutusmatka</dfn> riippuu alkunopeudesta, kun jarrutuskyky pysyy samana. Vakiohidastuvuudella a ja loppunopeudella 0 saadaan <f>0 = v^2 − 2 a s</f>, joten <f>s = {v^2}/{2a}</f>. Nopeus tulee kaavaan <b>neliönä</b>: hyödynnä sitä ja katso sitten laboratoriota.</p>') },
          { id: 't1-brake-lab', type: 'interactive', widget: 'custom', title: T('Two cars, speeds v and 2v, the same deceleration', 'Kaksi autoa, nopeudet v ja 2v, sama hidastuvuus'),
            caption: T('Set the speed v and the deceleration a, then press Brake. Both cars brake with the same a: the stop marks show the distances s and 4 s, and the track rescales to fit them. In the lower graph the curve s = v²/(2a) becomes steeper when a is small; the two dots slide down it as the cars slow down, and the one for 2v starts four times as high.',
              'Säädä nopeus v ja hidastuvuus a ja paina Jarruta. Molemmat autot jarruttavat samalla a:lla: pysähtymismerkit näyttävät matkat s ja 4 s, ja rata skaalautuu niiden mukaan. Alemmassa kuvaajassa käyrä s = v²/(2a) jyrkkenee, kun a on pieni; kaksi pistettä liukuu käyrää alas autojen hidastuessa, ja 2v:n piste alkaa nelinkertaisesta korkeudesta.'),
            config: dev(BRAKE) },
          { type: 'question', q: 't1-q24', id: 't1-q24-blk' },
          { id: 't1-piston-h', type: 'h', text: T('Exercise 1.2: pressure in the cylinder', 'Tehtävä 1.2: paine sylinterissä') },
          { id: 't1-piston-ex', type: 'example', title: T('Piston pressure (exercise 1.2)', 'Männän paine (tehtävä 1.2)'),
            problem: T('Calculate the <dfn data-term="pressure">pressure</dfn> in the cylinder of an internal combustion engine from <f>p = {4F}/{π d^2}</f>. The force on the <dfn data-term="piston">piston</dfn> is 12 000 N and its diameter is d = 70 mm. Give the result in bar (1 bar = 100 kN/m²).', 'Laske polttomoottorin sylinterin <dfn data-term="pressure">paine</dfn> kaavasta <f>p = {4F}/{π d^2}</f>. <dfn data-term="piston">Mäntään</dfn> kohdistuva voima on 12 000 N ja sen halkaisija d = 70 mm. Anna tulos yksikössä bar (1 bar = 100 kN/m²).'),
            given: ['F = 12 000 N', 'd = 70 mm = 0.070 m', '1 bar = 100 kN/m^2'],
            steps: [
              T('Convert the diameter to metres first: d = 70 mm = 70·10⁻³ m = 0.070 m.', 'Muunna halkaisija ensin metreiksi: d = 70 mm = 70·10⁻³ m = 0,070 m.'),
              { tex: 'p = {4 · 12 000 N}/{π · (0.070 m)^2} = 3.118·10^6 N/m^2' },
              T('1 N/m² = 1 Pa and 1 bar = 100 kN/m² = 10⁵ Pa, so divide by 10⁵ to get bar: p = 31.18 bar.', '1 N/m² = 1 Pa ja 1 bar = 100 kN/m² = 10⁵ Pa, joten jaa luvulla 10⁵ saadaksesi barit: p = 31,18 bar.'),
              T('The slide prints 30 bar, which is the same value rounded to one significant figure; with the data of 2 s.f. the answer is 31 bar.', 'Kalvolla on 30 bar, mikä on sama arvo pyöristettynä yhteen merkitsevään numeroon; kahden merkitsevän numeron lähtöarvoilla vastaus on 31 bar.')],
            result: T('p ≈ 31 bar (31.18 bar before rounding)', 'p ≈ 31 bar (31,18 bar ennen pyöristystä)') }
        ] },

      // ======================================================== 1.5-1.7 significant figures (p07-p09) + exercise A1
      { id: 't1-sf', title: T('Significant figures', 'Merkitsevät numerot'),
        blocks: [
          { id: 't1-sf-text', type: 'text', html: T(
            '<p>A measured or given number is only as precise as its <dfn data-term="sigfig">significant figures</dfn>. The result of a calculation cannot be more precise than the data, so we need rules for which digits count and for how to round.</p><p>Which digits are significant? Four rules:</p>',
            '<p>Mitattu tai annettu luku on yhtä tarkka kuin sen <dfn data-term="sigfig">merkitsevät numerot</dfn>. Laskun tulos ei voi olla tarkempi kuin lähtöarvot, joten tarvitaan säännöt sille, mitkä numerot lasketaan mukaan ja miten pyöristetään.</p><p>Mitkä numerot ovat merkitseviä? Neljä sääntöä:</p>') },
          { id: 't1-sf-rules', type: 'table', caption: T('The four rules for significant figures (slide p07).', 'Merkitsevien numeroiden neljä sääntöä (kalvo s. 07).'),
            head: [T('Rule', 'Sääntö'), T('Counts?', 'Merkitsevä?'), T('Examples', 'Esimerkit')],
            rows: [
              [T('1. Nonzero digits', '1. Nollasta eroavat numerot'), T('always', 'aina'), '5.46 (3), 63 (2)'],
              [T('2. Internal zeros (between nonzero digits)', '2. Sisäiset nollat (nollasta eroavien välissä)'), T('always', 'aina'), '0.07804 (4), 708 (3), 8.0097 (5)'],
              [T('3. Leading zeros', '3. Etunollat'), T('never', 'ei koskaan'), '0.708 (3), 0.00008 (1)'],
              [T('4. Ending zeros', '4. Loppunollat'), T('only with a decimal point', 'vain desimaalipilkun kanssa'), '6.080 (4), 9.00 (3), 70 (1)']] },
          { type: 'question', q: 't1-q27', id: 't1-q27-blk' },
          { type: 'question', q: 't1-q28', id: 't1-q28-blk' },
          { type: 'question', q: 't1-q29', id: 't1-q29-blk' },
          { id: 't1-sf-h2', type: 'h', text: T('Calculating with significant figures', 'Laskeminen merkitsevillä numeroilla') },
          { id: 't1-sf-mul', type: 'callout', kind: 'key', title: T('Multiplication and division', 'Kerto- ja jakolasku'), html: T(
            'The result has <b>as many significant figures as the least accurate value</b> (the one with the fewest). <f>2.8 × 3.21 = 8.988 ≈ 9.0</f> (2 and 3 s.f. → 2 s.f.); <f>2.000 ÷ 15 = 0.1333… ≈ 0.13</f> (4 and 2 s.f. → 2 s.f.).',
            'Tuloksessa on <b>yhtä monta merkitsevää numeroa kuin epätarkimmassa lähtöarvossa</b> (siinä, jossa niitä on vähiten). <f>2,8 × 3,21 = 8,988 ≈ 9,0</f> (2 ja 3 m.n. → 2 m.n.); <f>2,000 ÷ 15 = 0,1333… ≈ 0,13</f> (4 ja 2 m.n. → 2 m.n.).') },
          { id: 't1-sf-add', type: 'callout', kind: 'key', title: T('Addition and subtraction', 'Yhteen- ja vähennyslasku'), html: T(
            'The result has <b>as many decimal places as the least precise starting value</b>. <f>4.5 − 3.2750 = 1.225 ≈ 1.2</f> (1 and 4 decimals → 1 decimal); <f>4.530 + 3.27 = 7.800 ≈ 7.80</f> (3 and 2 decimals → 2 decimals). Here the decimals count, not the significant figures.',
            'Tuloksessa on <b>yhtä monta desimaalia kuin epätarkimmassa lähtöarvossa</b>. <f>4,5 − 3,2750 = 1,225 ≈ 1,2</f> (1 ja 4 desimaalia → 1 desimaali); <f>4,530 + 3,27 = 7,800 ≈ 7,80</f> (3 ja 2 desimaalia → 2 desimaalia). Tässä lasketaan desimaalit, ei merkitseviä numeroita.') },
          { id: 't1-sf-nb', type: 'callout', kind: 'warn', title: T('N.B.: do not round the intermediate results', 'Huom: älä pyöristä välituloksia'), html: T(
            'Intermediate results are <b>not</b> rounded; only the final answer is, by the rules above (unless the task says otherwise). Rounding in the middle adds errors, and it can even change the last digit: see the rounding trap below. In this course the digit 5 after the last kept digit rounds up.',
            'Välituloksia <b>ei</b> pyöristetä; vain lopullinen vastaus pyöristetään yllä olevin säännöin (ellei tehtävässä toisin sanota). Välissä pyöristäminen kasvattaa virhettä ja voi jopa muuttaa viimeistä numeroa: katso alla oleva pyöristysansa. Tällä kurssilla viimeisen säilytettävän numeron perässä oleva 5 pyöristetään ylöspäin.') },
          { id: 't1-sf-calc', type: 'interactive', widget: 'custom', title: T('Significant-figure calculator', 'Merkitsevien numeroiden laskin'),
            caption: T('Pick an example or type two positive numbers (their digits are kept exactly as typed, so 3.50 and 3.5 differ) and choose × ÷ + −. Step or Run shows the method: first the digits that count in A and in B, each with its rule number (1 nonzero, 2 internal zero, 3 leading zero, 4 ending zero); then for × ÷ the counts of significant figures are compared, and for + − the numbers are aligned by the decimal point and a red line drops through the last decimal column of the least precise value; then the unrounded result, whose digits behind the line are crossed out, and the rounded answer.',
              'Valitse esimerkki tai kirjoita kaksi positiivista lukua (numerot säilyvät täsmälleen kirjoitettuina, joten 3,50 ja 3,5 eroavat) ja valitse × ÷ + −. Vaihe tai Aja näyttää menetelmän: ensin A:n ja B:n merkitsevät numerot sääntönumeroineen (1 nollasta eroava, 2 sisäinen nolla, 3 etunolla, 4 loppunolla); sitten ×- ja ÷-laskussa verrataan merkitsevien numeroiden määriä, ja +- ja −-laskussa luvut tasataan desimaalipilkun mukaan ja punainen viiva laskeutuu epätarkimman luvun viimeisen desimaalin sarakkeen kohdalle; sitten pyöristämätön tulos, jonka viivan takana olevat numerot yliviivataan, ja pyöristetty vastaus.'),
            config: sfCalc() },
          { type: 'question', q: 't1-q30', id: 't1-q30-blk' },
          { id: 't1-sf-h3', type: 'h', text: T('Rounding examples (slide p09)', 'Pyöristysesimerkkejä (kalvo s. 09)') },
          { id: 't1-unit-ex', type: 'example', title: T('Unit selection (slide p09, item 1)', 'Yksikön valinta (kalvo s. 09, kohta 1)'),
            problem: T('Give the SI unit of: the area A, the flow rate q (volume per time), the current I and the acceleration of gravity g.', 'Anna SI-yksikkö suureille: pinta-ala A, tilavuusvirta q (tilavuus aikaa kohti), virta I ja putoamiskiihtyvyys g.'),
            given: ['[A]', '[q]', '[I]', '[g]'],
            steps: [T('Area = length · length: [A] = m².', 'Pinta-ala = pituus · pituus: [A] = m².'), T('Flow rate = volume per time = m³/s.', 'Tilavuusvirta = tilavuus per aika = m³/s.'), T('Current: the base unit ampere, [I] = A.', 'Virta: perusyksikkö ampeeri, [I] = A.'), T('Acceleration = velocity per time = (m/s)/s: [g] = m/s².', 'Kiihtyvyys = nopeus per aika = (m/s)/s: [g] = m/s².')],
            result: T('m², m³/s, A, m/s²', 'm², m³/s, A, m/s²') },
          { id: 't1-round-ex', type: 'example', title: T('Rounding to two significant figures (slide p09, item 3)', 'Pyöristys kahteen merkitsevään numeroon (kalvo s. 09, kohta 3)'),
            problem: T('Round to two significant figures: a) 156, b) 1878 m (give also in km), c) 8.83 m × 100 m, d) 10 W ÷ 230 V (in mA).', 'Pyöristä kahteen merkitsevään numeroon: a) 156, b) 1878 m (anna myös km), c) 8,83 m × 100 m, d) 10 W ÷ 230 V (mA).'),
            given: ['a) 156', 'b) 1878 m', 'c) 8.83 m · 100 m', 'd) 10 W / 230 V'],
            steps: [
              T('a) The two digits 1 and 5 stay, the next digit 6 rounds up: 156 → <b>160</b> (= 1.6·10²; the written 160 has 2 s.f. by rule 4).', 'a) Kaksi numeroa 1 ja 5 säilyy, seuraava numero 6 pyöristää ylöspäin: 156 → <b>160</b> (= 1,6·10²; kirjoitettuna 160 sisältää 2 m.n. säännön 4 mukaan).'),
              T('b) 1878 m → 1900 m = 1.9·10³ m = <b>1.9 km</b>.', 'b) 1878 m → 1900 m = 1,9·10³ m = <b>1,9 km</b>.'),
              T('c) 8.83 m × 100 m = 883 m² → <b>880 m²</b> = 8.8·10² m².', 'c) 8,83 m × 100 m = 883 m² → <b>880 m²</b> = 8,8·10² m².'),
              { tex: 'd) {10 W}/{230 V} = 0.04347… A = 43.47… mA ≈ 43 mA' }],
            result: T('160, 1.9 km, 880 m², 43 mA', '160, 1,9 km, 880 m², 43 mA') },
          { type: 'question', q: 't1-q35', id: 't1-q35-blk' },
          { type: 'question', q: 't1-q36', id: 't1-q36-blk' },
          { id: 't1-sf-h4', type: 'h', text: T('Exercise A1: significant figures', 'Tehtävä A1: merkitsevät numerot') },
          { type: 'question', q: 't1-q33', id: 't1-q33-blk' },
          { id: 't1-sf-h5', type: 'h', text: T('The rounding trap', 'Pyöristysansa') },
          { id: 't1-trap-text', type: 'text', html: T(
            '<p>Slide p09 item 4 mixes all the operations: <f>9.500 ÷ 5.05 + 2.45 + 3.84 × 2.0 − 1.58</f>. The division has 3 s.f. (1.88) and the multiplication 2 s.f. (7.7), so the <b>sum</b> is given to one decimal place, limited by 7.7. The slide’s roundings only <b>identify the precision</b>; the numbers are not rounded before the end. The lab shows why: round the intermediate results and the sum is exactly 10.45, a tie between 10.4 and 10.5.</p>',
            '<p>Kalvon s. 09 kohdassa 4 on kaikki laskutoimitukset samassa laskussa: <f>9,500 ÷ 5,05 + 2,45 + 3,84 × 2,0 − 1,58</f>. Jakolaskussa on 3 m.n. (1,88) ja kertolaskussa 2 m.n. (7,7), joten <b>summa</b> annetaan yhdellä desimaalilla 7,7:n rajoittamana. Kalvon pyöristykset vain <b>tunnistavat tarkkuuden</b>; lukuja ei pyöristetä ennen loppua. Laboratorio näyttää miksi: pyöristä välitulokset ja summa on täsmälleen 10,45, tasan lukujen 10,4 ja 10,5 puolivälissä.</p>') },
          { id: 't1-trap-lab', type: 'interactive', widget: 'custom', title: T('Rounding trap: keep the digits or round every step?', 'Pyöristysansa: säilytätkö numerot vai pyöristätkö joka askeleen?'),
            caption: T('Press “Run the calculation” and watch the terms appear one by one. Switch between the two modes with the buttons: with all digits kept the sum is 10.43118… and the answer 10.4; with every intermediate result rounded the sum is 10.45, a tie, and rounding it up gives 10.5, which is wrong. The slider x changes the divisor, so you can look for other values where the two modes disagree.',
              'Paina ”Aja lasku” ja katso, kuinka termit ilmestyvät yksi kerrallaan. Vaihda tilaa painikkeilla: kun kaikki numerot säilytetään, summa on 10,43118… ja vastaus 10,4; kun jokainen välitulos pyöristetään, summa on 10,45, tasan puolivälissä, ja ylöspäin pyöristettynä saadaan 10,5, mikä on väärin. Liukusäädin x muuttaa jakajaa, joten voit etsiä muita arvoja, joilla tilat eroavat.'),
            config: dev(TRAP) },
          { id: 't1-mixed-ex', type: 'example', title: T('The mixed calculation (slide p09, item 4)', 'Sekalasku (kalvo s. 09, kohta 4)'),
            problem: T('Calculate 9.500 ÷ 5.05 + 2.45 + 3.84 × 2.0 − 1.58 with the correct number of significant figures.', 'Laske 9,500 ÷ 5,05 + 2,45 + 3,84 × 2,0 − 1,58 oikealla määrällä merkitseviä numeroita.'),
            given: ['9.500 ÷ 5.05', '3.84 × 2.0'],
            steps: [
              T('Calculate every term without rounding: 9.500 ÷ 5.05 = 1.881188…, 3.84 × 2.0 = 7.68.', 'Laske jokainen termi pyöristämättä: 9,500 ÷ 5,05 = 1,881188…, 3,84 × 2,0 = 7,68.'),
              T('Add and subtract: 1.881188 + 2.45 + 7.68 − 1.58 = 10.431188…', 'Laske yhteen ja vähennä: 1,881188 + 2,45 + 7,68 − 1,58 = 10,431188…'),
              T('Which term is the least precise? The product 3.84 × 2.0 has 2 s.f., so it is known to a tenth (7.7): one decimal place.', 'Mikä termi on epätarkin? Tulossa 3,84 × 2,0 on 2 m.n., joten se tunnetaan kymmenesosan tarkkuudella (7,7): yksi desimaali.'),
              T('Round once, at the end, to one decimal: 10.4.', 'Pyöristä kerran, lopussa, yhteen desimaaliin: 10,4.')],
            result: T('10.4', '10,4') },
          { type: 'question', q: 't1-q37', id: 't1-q37-blk' },
          { id: 't1-sf-h6', type: 'h', text: T('Exercise 1.5: the cube', 'Tehtävä 1.5: kuutio') },
          { id: 't1-cube-text', type: 'text', html: T(
            '<p>The edge of a cube is 4.14 m. The volume is <f>V = a^3 = 4.14^3 m^3 = 70.958… m^3</f>. The data have 3 s.f., so the s.f. rule would give 71.0 m³; but the task asks for <b>two decimal places</b>, and that instruction overrides the rule: 70.96 m³.</p>',
            '<p>Kuution särmä on 4,14 m. Tilavuus on <f>V = a^3 = 4,14^3 m^3 = 70,958… m^3</f>. Lähtöarvossa on 3 m.n., joten m.n.-sääntö antaisi 71,0 m³; mutta tehtävä pyytää <b>kaksi desimaalia</b>, ja tämä ohje ohittaa säännön: 70,96 m³.</p>') }
        ] }
    ],
    questions: [
      // ================= 1.1 base quantities
      { id: 't1-q1', mode: 'practice', type: 'mc', difficulty: 1,
        prompt: T('How many base quantities does the SI system have?', 'Montako perussuuretta SI-järjestelmässä on?'),
        options: [{ id: 'a', html: T('5', '5') }, { id: 'b', html: T('6', '6') }, { id: 'c', html: T('7', '7') }, { id: 'd', html: T('9', '9') }],
        hints: [T('Count the rows of the table of base quantities above.', 'Laske yllä olevan perussuuretaulukon rivit.')] },
      { id: 't1-q2', mode: 'practice', type: 'match', difficulty: 1,
        prompt: T('Match each base quantity with the symbol of its base unit.', 'Yhdistä kukin perussuure sen perusyksikön tunnukseen.'),
        left: [{ id: 'len', html: T('length', 'pituus') }, { id: 'mas', html: T('mass', 'massa') }, { id: 'tim', html: T('time', 'aika') }, { id: 'cur', html: T('electric current', 'sähkövirta') },
               { id: 'tem', html: T('thermodynamic temperature', 'termodynaaminen lämpötila') }, { id: 'amo', html: T('amount of substance', 'ainemäärä') }, { id: 'lum', html: T('luminous intensity', 'valovoima') }],
        right: [{ id: 'm', html: T('m', 'm') }, { id: 'kg', html: T('kg', 'kg') }, { id: 's', html: T('s', 's') }, { id: 'A', html: T('A', 'A') }, { id: 'K', html: T('K', 'K') }, { id: 'mol', html: T('mol', 'mol') }, { id: 'cd', html: T('cd', 'cd') }],
        hints: [T('The base units are metre, kilogram, second, ampere, kelvin, mole and candela.', 'Perusyksiköt ovat metri, kilogramma, sekunti, ampeeri, kelvin, mooli ja kandela.')] },
      { id: 't1-q3', mode: 'practice', type: 'fill', difficulty: 1,
        prompt: T('Complete the sentence.', 'Täydennä lause.'),
        text: T('The value of a quantity is the numerical value multiplied by the [[a]], for example the “m” in 12 m.', 'Suureen arvo = lukuarvo · [[a]], esimerkiksi ”m” lukemassa 12 m.'),
        fields: [{ id: 'a', kind: 'text' }],
        hints: [T('12 is the numerical value. What do we call the “m”?', '12 on lukuarvo. Miksi ”m” kutsutaan?')] },

      // ================= 1.2-1.3 derived units and prefixes
      { id: 't1-q4', mode: 'practice', type: 'fill', difficulty: 1,
        prompt: T('Complete the definition of the newton.', 'Täydennä newtonin määritelmä.'),
        text: T('1 N = 1 kg·[[a]]/s²', '1 N = 1 kg·[[a]]/s²'),
        fields: [{ id: 'a', kind: 'text', size: 4 }],
        hints: [T('Force = mass · acceleration, and acceleration has the unit (length)/s².', 'Voima = massa · kiihtyvyys, ja kiihtyvyyden yksikkö on (pituus)/s².')] },
      { id: 't1-q5', mode: 'graded', type: 'match', difficulty: 2,
        prompt: T('Match each derived unit with its definition in other units.', 'Yhdistä kukin johdannaisyksikkö sen määritelmään toisissa yksiköissä.'),
        left: [{ id: 'pa', html: T('pascal (Pa)', 'pascal (Pa)') }, { id: 'j', html: T('joule (J)', 'joule (J)') }, { id: 'w', html: T('watt (W)', 'watti (W)') }, { id: 'v', html: T('volt (V)', 'voltti (V)') },
               { id: 'hz', html: T('hertz (Hz)', 'hertsi (Hz)') }, { id: 't', html: T('tesla (T)', 'tesla (T)') }],
        right: [{ id: 'r1', html: T('N/m²', 'N/m²') }, { id: 'r2', html: T('N·m', 'N·m') }, { id: 'r3', html: T('J/s', 'J/s') }, { id: 'r4', html: T('W/A', 'W/A') }, { id: 'r5', html: T('1/s', '1/s') }, { id: 'r6', html: T('Wb/m²', 'Wb/m²') }],
        hints: [T('Think of the quantities: pressure is force per area, work is force times distance, power is energy per time.', 'Ajattele suureita: paine on voima per pinta-ala, työ on voima kertaa matka, teho on energia per aika.'), T('Use the table of derived units above.', 'Käytä yllä olevaa johdannaisyksikkötaulukkoa.')] },
      { id: 't1-q6', mode: 'practice', type: 'mc', difficulty: 1,
        prompt: T('Which is the correct unit of torque (moment of a force)?', 'Mikä on momentin (voiman momentin) oikea yksikkö?'),
        options: [{ id: 'a', html: T('N/m', 'N/m') }, { id: 'b', html: T('N·m', 'N·m') }, { id: 'c', html: T('mN', 'mN') }, { id: 'd', html: T('kg·m/s', 'kg·m/s') }],
        hints: [T('Torque is force times lever arm.', 'Momentti on voima kertaa vipuvarsi.'), T('Look at prefix rule 5: one of the options is a millinewton.', 'Katso etuliitesääntöä 5: yksi vaihtoehdoista on millinewton.')] },
      { id: 't1-q7', mode: 'practice', type: 'numeric', difficulty: 1,
        prompt: T('Write the pressure 22.0·10⁵ Pa with a prefix, in MPa (rules 1 and 2).', 'Kirjoita paine 22,0·10⁵ Pa etuliitteellä, yksikössä MPa (säännöt 1 ja 2).'),
        fields: [{ id: 'p', tex: 'p', unit: 'MPa' }],
        hints: [T('Mega means 10⁶.', 'Mega tarkoittaa 10⁶.'), T('22.0·10⁵ = 2.20·10^?', '22,0·10⁵ = 2,20·10^?')] },
      { id: 't1-q8', mode: 'graded', type: 'mc', difficulty: 1,
        prompt: T('Which is the preferred way to write the length 3490 µm?', 'Mikä on suositeltava tapa kirjoittaa pituus 3490 µm?'),
        options: [{ id: 'a', html: T('3490 µm', '3490 µm') }, { id: 'b', html: T('0.00349 m', '0,00349 m') }, { id: 'c', html: T('3.49 mm', '3,49 mm') }, { id: 'd', html: T('3.49·10³ µm', '3,49·10³ µm') }],
        hints: [T('Rule 1: the numerical value should be between 0.1 and 1000.', 'Sääntö 1: lukuarvon tulee olla välillä 0,1 … 1000.'), T('Rule 2: the exponent of the prefix is divisible by three.', 'Sääntö 2: etuliitteen eksponentti on jaollinen kolmella.')] },
      { id: 't1-q9', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('Convert (type powers of ten as 1e-6): a) 1 cm³ in m³, b) 1 km² in m².', 'Muunna (kirjoita kymmenpotenssit muodossa 1e-6): a) 1 cm³ yksikköön m³, b) 1 km² yksikköön m².'),
        fields: [{ id: 'a', label: T('a) 1 cm³ =', 'a) 1 cm³ ='), unit: 'm³' }, { id: 'b', label: T('b) 1 km² =', 'b) 1 km² ='), unit: 'm²' }],
        hints: [T('The prefix is raised to the power together with the unit: (10⁻² m)³.', 'Etuliite korotetaan potenssiin yksikön mukana: (10⁻² m)³.'), T('1 km = 10³ m, so 1 km² = (10³ m)².', '1 km = 10³ m, joten 1 km² = (10³ m)².')] },
      { id: 't1-q10', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('Express in the unit shown: a) 0.00010 J in µJ, b) 0.000001 J in nJ.', 'Ilmaise annetussa yksikössä: a) 0,00010 J yksikössä µJ, b) 0,000001 J yksikössä nJ.'),
        fields: [{ id: 'a', label: T('a)', 'a)'), unit: 'µJ' }, { id: 'b', label: T('b)', 'b)'), unit: 'nJ' }],
        hints: [T('µ = 10⁻⁶ and n = 10⁻⁹. How many of the new units fit into one joule?', 'µ = 10⁻⁶ ja n = 10⁻⁹. Montako uutta yksikköä mahtuu yhteen jouleen?'), T('Try the prefix ruler above.', 'Kokeile yllä olevaa etuliiteviivainta.')] },
      { id: 't1-q11', mode: 'graded', type: 'numeric', difficulty: 2,
        prompt: T('Calculate in the 10ⁿ format (rule 7): the power P = 10 kV · 5 mA, in W.', 'Laske 10ⁿ-muodossa (sääntö 7): teho P = 10 kV · 5 mA yksikössä W.'),
        fields: [{ id: 'P', tex: 'P', unit: 'W' }],
        hints: [T('k = 10³ and m = 10⁻³: write 10·10³ V · 5·10⁻³ A.', 'k = 10³ ja m = 10⁻³: kirjoita 10·10³ V · 5·10⁻³ A.'), T('V·A = W.', 'V·A = W.')] },

      // ================= 1.4 vectors
      { id: 't1-q12', mode: 'practice', type: 'match', difficulty: 1,
        prompt: T('Match each quantity of a vector with its formula (θ is measured from the x axis).', 'Yhdistä vektorin kukin suure kaavaansa (θ mitataan x-akselista).'),
        left: [{ id: 'ax', html: T('x-component A_x', 'x-komponentti A_x') }, { id: 'ay', html: T('y-component A_y', 'y-komponentti A_y') }, { id: 'len', html: T('length A', 'pituus A') }, { id: 'dir', html: T('direction θ', 'suunta θ') }],
        right: [{ id: 'f1', html: '<f>A cos θ</f>' }, { id: 'f2', html: '<f>A sin θ</f>' }, { id: 'f3', html: '<f>sqrt{A_x^2 + A_y^2}</f>' }, { id: 'f4', html: '<f>tan θ = {A_y}/{A_x}</f>' }],
        hints: [T('Use the right triangle of the vector explorer: the x-component is the side next to the angle θ.', 'Käytä vektoritutkijan suorakulmaista kolmiota: x-komponentti on kulman θ viereinen sivu.')] },
      { id: 't1-q13', mode: 'practice', type: 'numeric', difficulty: 1,
        prompt: T('A velocity vector has the magnitude 10.0 m/s and points at θ = 30° above the x axis. Find its components.', 'Nopeusvektorin suuruus on 10,0 m/s ja sen suunta on θ = 30° x-akselin yläpuolella. Määritä sen komponentit.'),
        fields: [{ id: 'x', tex: 'v_x', unit: 'm/s' }, { id: 'y', tex: 'v_y', unit: 'm/s' }],
        hints: [T('v_x = v cos θ, v_y = v sin θ. Set the calculator to degrees.', 'v_x = v cos θ, v_y = v sin θ. Aseta laskin asteille.')] },
      { id: 't1-q14', mode: 'graded', type: 'numeric', difficulty: 2,
        prompt: T('A force has the components F_x = 3.0 N and F_y = 4.0 N. Find a) its magnitude and b) the angle θ from the x axis in degrees.', 'Voiman komponentit ovat F_x = 3,0 N ja F_y = 4,0 N. Määritä a) sen suuruus ja b) kulma θ x-akselista asteina.'),
        fields: [{ id: 'F', tex: 'F', unit: 'N' }, { id: 'th', tex: 'θ', unit: '°' }],
        hints: [T('The magnitude is the hypotenuse of the right triangle.', 'Suuruus on suorakulmaisen kolmion hypotenuusa.'), T('tan θ = F_y/F_x; use the inverse tangent (atan) in degrees.', 'tan θ = F_y/F_x; käytä käänteistä tangenttia (atan) asteina.')] },
      { id: 't1-q15', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('A force of 12 N points at θ = 150° (measured counter-clockwise from the positive x axis). Find its components, with signs.', 'Voiman suuruus on 12 N ja sen suunta on θ = 150° (mitattuna vastapäivään positiivisesta x-akselista). Määritä sen komponentit etumerkkeineen.'),
        fields: [{ id: 'x', tex: 'F_x', unit: 'N' }, { id: 'y', tex: 'F_y', unit: 'N' }],
        hints: [T('The formulas work for any θ: put 150° into cos and sin.', 'Kaavat toimivat millä tahansa θ:lla: sijoita 150° kosiniin ja siniin.'), T('Check the signs with the vector explorer (Run): which quadrant is 150° in?', 'Tarkista etumerkit vektoritutkijalla (Aja): missä neljänneksessä 150° on?')] },
      { id: 't1-q16', mode: 'practice', type: 'numeric', difficulty: 3,
        prompt: T('A box with the weight mg = 100 N rests on a slope that makes the angle 30° with the horizontal. The weight points straight down. Resolve it into a) the component <b>along</b> the slope and b) the component <b>perpendicular</b> to the slope. (Topic 3 uses exactly this.)', 'Laatikon paino mg = 100 N lepää rinteellä, joka muodostaa 30°:n kulman vaakatason kanssa. Paino osoittaa suoraan alas. Jaa se komponentteihin: a) rinteen <b>suuntainen</b> komponentti ja b) rinteeseen <b>nähden kohtisuora</b> komponentti. (Aihe 3 käyttää juuri tätä.)'),
        fields: [{ id: 'along', label: T('along the slope', 'rinteen suuntainen'), unit: 'N' }, { id: 'perp', label: T('perpendicular', 'kohtisuora'), unit: 'N' }],
        hints: [T('Draw the slope as a right triangle and the weight as a vertical arrow from the box.', 'Piirrä rinne suorakulmaiseksi kolmioksi ja paino pystysuoraksi nuoleksi laatikosta.'), T('The angle between the weight and the perpendicular to the slope equals the slope angle 30°.', 'Painon ja rinteen normaalin välinen kulma on yhtä suuri kuin rinteen kulma 30°.'), T('Which side is next to this angle (cos) and which is opposite (sin)?', 'Mikä sivu on tämän kulman vieressä (cos) ja mikä vastapäätä (sin)?')] },

      // ================= 1.5 quantity calculation, dimension checks, exercises B1-B4
      { id: 't1-q17', mode: 'practice', type: 'mc', difficulty: 1,
        prompt: T('What is the unit of ½ m v², with m in kg and v in m/s, in base units?', 'Mikä on suureen ½ m v² yksikkö perusyksiköissä, kun m on yksikössä kg ja v yksikössä m/s?'),
        options: [{ id: 'a', html: T('kg·m/s²', 'kg·m/s²') }, { id: 'b', html: T('kg·m/s', 'kg·m/s') }, { id: 'c', html: T('kg·m²/s', 'kg·m²/s') }, { id: 'd', html: T('kg·m²/s²', 'kg·m²/s²') }],
        hints: [T('Square the unit of v, then multiply by kg. The number ½ has no unit.', 'Korota v:n yksikkö toiseen ja kerro kg:lla. Luvulla ½ ei ole yksikköä.')] },
      { id: 't1-q18', mode: 'graded', type: 'multi', difficulty: 2,
        prompt: T('Exercise B1: check the equations. Which are dimensionally correct? Select all. (E energy, m mass, v speed, s distance, a acceleration, T period, F force, l length, L inductance, I current, B magnetic flux density.)', 'Tehtävä B1: tarkista yhtälöt. Mitkä ovat dimensioiltaan oikein? Valitse kaikki. (E energia, m massa, v nopeus, s matka, a kiihtyvyys, T jaksonaika, F voima, l pituus, L induktanssi, I virta, B magneettivuon tiheys.)'),
        options: [{ id: 'a', html: '<f>T = 2π sqrt{{F}/{m l}}</f>' }, { id: 'b', html: '<f>E = ½ m v^2</f>' }, { id: 'c', html: '<f>B = L I</f>' }, { id: 'd', html: '<f>s = {v^2}/{2a}</f>' }],
        hints: [T('Calculate the unit of the right side in base units and compare it with the unit of the left side. Use the dimension checker.', 'Laske oikean puolen yksikkö perusyksiköissä ja vertaa sitä vasemman puolen yksikköön. Käytä dimensiotarkistinta.'), T('A period T is a time: the unit must be s.', 'Jaksonaika T on aika: yksikön täytyy olla s.'), T('Remember 1 T = 1 Wb/m² and 1 H = 1 V·s/A.', 'Muista 1 T = 1 Wb/m² ja 1 H = 1 V·s/A.')] },
      { id: 't1-q19', mode: 'practice', type: 'mc', difficulty: 2,
        prompt: T('What is the unit of <f>sqrt{{F}/{m l}}</f>, with F in N, m in kg and l in m?', 'Mikä on suureen <f>sqrt{{F}/{m l}}</f> yksikkö, kun F on yksikössä N, m yksikössä kg ja l yksikössä m?'),
        options: [{ id: 'a', html: T('s', 's') }, { id: 'b', html: T('1/s²', '1/s²') }, { id: 'c', html: T('1/s', '1/s') }, { id: 'd', html: T('s²', 's²') }],
        hints: [T('Write N as kg·m/s² and cancel kg and m inside the root.', 'Kirjoita N muodossa kg·m/s² ja supista kg ja m neliöjuuren sisällä.'), T('Then take the square root of the unit.', 'Ota sitten yksiköstä neliöjuuri.')] },
      { id: 't1-q20', mode: 'practice', type: 'mc', difficulty: 2,
        prompt: T('The inductance L is in henry (1 H = 1 V·s/A) and the current I in ampere. What is the unit of the product L·I?', 'Induktanssi L on yksikössä henry (1 H = 1 V·s/A) ja virta I yksikössä ampeeri. Mikä on tulon L·I yksikkö?'),
        options: [{ id: 'a', html: T('T (tesla)', 'T (tesla)') }, { id: 'b', html: T('V (volt)', 'V (voltti)') }, { id: 'c', html: T('Wb (weber)', 'Wb (weber)') }, { id: 'd', html: T('H (henry)', 'H (henry)') }],
        hints: [T('(V·s/A)·A: the ampere cancels.', '(V·s/A)·A: ampeeri supistuu.'), T('Compare with the table of derived units: which unit is V·s? Is that the unit of B?', 'Vertaa johdannaisyksikkötaulukkoon: mikä yksikkö on V·s? Onko se B:n yksikkö?')] },
      { id: 't1-q21', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('A device takes I = 15 A from U = 230 V for t = 45 min. Calculate the energy E = U I t in megajoules.', 'Laite ottaa virran I = 15 A jännitteestä U = 230 V ajan t = 45 min. Laske energia E = U I t megajouleina.'),
        fields: [{ id: 'E', tex: 'E', unit: 'MJ' }],
        hints: [T('Put the time in seconds first.', 'Muuta aika ensin sekunneiksi.'), T('V·A·s = J, and 1 MJ = 10⁶ J.', 'V·A·s = J ja 1 MJ = 10⁶ J.')] },
      { id: 't1-q22', mode: 'graded', type: 'numeric', difficulty: 2,
        prompt: T('Give the energy of the previous question in kilowatt-hours (1 kWh = 3.6 MJ), with the correct number of significant figures (U = 230 V, I = 15 A, t = 45 min).', 'Anna edellisen kysymyksen energia kilowattitunteina (1 kWh = 3,6 MJ) oikealla määrällä merkitseviä numeroita (U = 230 V, I = 15 A, t = 45 min).'),
        fields: [{ id: 'E', kind: 'sig', tex: 'E', unit: 'kWh' }],
        hints: [T('Divide the energy in MJ by 3.6 MJ/kWh.', 'Jaa energia (MJ) luvulla 3,6 MJ/kWh.'), T('The data have 2 (15 A and 45 min) and 3 (230 V) significant figures: take the least.', 'Lähtöarvoissa on 2 (15 A ja 45 min) ja 3 (230 V) merkitsevää numeroa: ota vähin.')] },
      { id: 't1-q23', mode: 'graded', type: 'numeric', difficulty: 2,
        prompt: T('Exercise B2: a car brakes with a constant deceleration. By what factor does the braking distance grow when the initial speed is doubled? Other circumstances do not change.', 'Tehtävä B2: auto jarruttaa vakiohidastuvuudella. Kuinka moninkertaiseksi jarrutusmatka muuttuu, kun alkunopeus kaksinkertaistuu? Muut olosuhteet eivät muutu.'),
        fields: [{ id: 'f', label: T('factor', 'kerroin'), unit: '×' }],
        hints: [T('From v² = 2 a s: s = v²/(2a). Replace v by 2v.', 'Kaavasta v² = 2 a s: s = v²/(2a). Korvaa v luvulla 2v.'), T('Check with the braking lab.', 'Tarkista jarrutuslaboratoriolla.')] },
      { id: 't1-q24', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('A car stops from 50 km/h in a braking distance of 14 m. With the same deceleration, how long is the braking distance from a) 100 km/h and b) 25 km/h?', 'Auto pysähtyy nopeudesta 50 km/h jarrutusmatkalla 14 m. Kuinka pitkä on jarrutusmatka samalla hidastuvuudella nopeudesta a) 100 km/h ja b) 25 km/h?'),
        fields: [{ id: 'a', label: T('a)', 'a)'), unit: 'm' }, { id: 'b', label: T('b)', 'b)'), unit: 'm' }],
        hints: [T('The braking distance is proportional to the square of the speed.', 'Jarrutusmatka on verrannollinen nopeuden neliöön.'), T('How many times is the speed larger or smaller than 50 km/h?', 'Kuinka monta kertaa nopeus on suurempi tai pienempi kuin 50 km/h?')] },
      { id: 't1-q25', mode: 'graded', type: 'numeric', difficulty: 3, tol: 0.05,
        prompt: T('Exercise 1.2: calculate the pressure in the cylinder of an engine from <f>p = {4F}/{π d^2}</f>. The force on the piston is 12 000 N and the piston diameter is 70 mm. Give the result in bar (1 bar = 100 kN/m²).', 'Tehtävä 1.2: laske moottorin sylinterin paine kaavasta <f>p = {4F}/{π d^2}</f>. Mäntään kohdistuva voima on 12 000 N ja männän halkaisija 70 mm. Anna tulos yksikössä bar (1 bar = 100 kN/m²).'),
        fields: [{ id: 'p', tex: 'p', unit: 'bar' }],
        hints: [T('Convert 70 mm to metres before you square it.', 'Muunna 70 mm metreiksi ennen neliöön korottamista.'), T('F/d² is in N/m² = Pa. Then divide by 100 000 Pa/bar.', 'F/d² on yksikössä N/m² = Pa. Jaa sitten luvulla 100 000 Pa/bar.')] },

      // ================= 1.5-1.7 significant figures
      { id: 't1-q27', mode: 'practice', type: 'mc', difficulty: 1,
        prompt: T('How many significant figures does 0.07804 have?', 'Montako merkitsevää numeroa luvussa 0,07804 on?'),
        options: [{ id: 'a', html: T('3', '3') }, { id: 'b', html: T('4', '4') }, { id: 'c', html: T('5', '5') }, { id: 'd', html: T('6', '6') }],
        hints: [T('Leading zeros never count; zeros between nonzero digits always do.', 'Etunollat eivät koskaan ole merkitseviä; nollasta eroavien numeroiden välissä olevat nollat ovat aina merkitseviä.')] },
      { id: 't1-q28', mode: 'practice', type: 'numeric', difficulty: 1,
        prompt: T('Give the number of significant figures: a) 9.00, b) 70, c) 6.080, d) 8.0097.', 'Anna merkitsevien numeroiden määrä: a) 9,00, b) 70, c) 6,080, d) 8,0097.'),
        fields: [{ id: 'a', label: T('a)', 'a)') }, { id: 'b', label: T('b)', 'b)') }, { id: 'c', label: T('c)', 'c)') }, { id: 'd', label: T('d)', 'd)') }],
        hints: [T('Ending zeros count only if the number has a decimal point.', 'Loppunollat ovat merkitseviä vain, jos luvussa on desimaalipilkku.')] },
      { id: 't1-q29', mode: 'practice', type: 'match', difficulty: 1,
        prompt: T('Match each number with the rule that decides its zeros or digits.', 'Yhdistä kukin luku sääntöön, joka ratkaisee sen numerot tai nollat.'),
        left: [{ id: 'n1', html: T('63', '63') }, { id: 'n2', html: T('708', '708') }, { id: 'n3', html: T('0.00008', '0,00008') }, { id: 'n4', html: T('9.00', '9,00') }],
        right: [{ id: 'r1', html: T('all nonzero digits count', 'kaikki nollasta eroavat numerot ovat merkitseviä') }, { id: 'r2', html: T('a zero between nonzero digits counts', 'nollasta eroavien numeroiden välissä oleva nolla on merkitsevä') },
                { id: 'r3', html: T('leading zeros do not count', 'etunollat eivät ole merkitseviä') }, { id: 'r4', html: T('ending zeros count (there is a decimal point)', 'loppunollat ovat merkitseviä (desimaalipilkku on)') }],
        hints: [T('Look at the table of the four rules.', 'Katso neljän säännön taulukkoa.')] },
      { id: 't1-q30', mode: 'practice', type: 'numeric', difficulty: 1,
        prompt: T('Multiplication and division: give the result with the correct number of significant figures. a) 2.8 × 3.21, b) 2.000 ÷ 15.', 'Kerto- ja jakolasku: anna tulos oikealla määrällä merkitseviä numeroita. a) 2,8 × 3,21, b) 2,000 ÷ 15.'),
        fields: [{ id: 'a', kind: 'sig', label: T('a)', 'a)') }, { id: 'b', kind: 'sig', label: T('b)', 'b)') }],
        hints: [T('Count the significant figures of each factor; the result gets as many as the smaller count.', 'Laske kunkin tekijän merkitsevät numerot; tulokseen tulee niistä pienempi määrä.'), T('Calculate with all digits first, round last. 9 and 9.0 are different answers.', 'Laske ensin kaikilla numeroilla, pyöristä viimeksi. 9 ja 9,0 ovat eri vastauksia.')] },
      { id: 't1-q31', mode: 'graded', type: 'numeric', difficulty: 2,
        prompt: T('Addition and subtraction: give the result with the correct number of decimals. a) 4.5 − 3.2750, b) 4.530 + 3.27.', 'Yhteen- ja vähennyslasku: anna tulos oikealla määrällä desimaaleja. a) 4,5 − 3,2750, b) 4,530 + 3,27.'),
        fields: [{ id: 'a', kind: 'sig', label: T('a)', 'a)') }, { id: 'b', kind: 'sig', label: T('b)', 'b)') }],
        hints: [T('Here the number of decimals decides, not the significant figures: the least precise value has the fewest decimals.', 'Tässä desimaalien määrä ratkaisee, ei merkitsevien numeroiden: epätarkimmassa arvossa on vähiten desimaaleja.'), T('Keep a trailing zero if the rule says the result has that many decimals.', 'Säilytä loppunolla, jos säännön mukaan tuloksessa on niin monta desimaalia.')] },
      { id: 't1-q35', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('Round to two significant figures (slide p09): a) the number 156 (type 1.6e2 or 160), b) the length 1878 m, given in km.', 'Pyöristä kahteen merkitsevään numeroon (kalvo s. 09): a) luku 156 (kirjoita 1.6e2 tai 160), b) pituus 1878 m ilmoitettuna yksikössä km.'),
        fields: [{ id: 'a', kind: 'sig', label: T('a)', 'a)') }, { id: 'b', kind: 'sig', label: T('b)', 'b)'), unit: 'km' }],
        hints: [T('Keep the first two digits and look at the third to decide whether the second goes up.', 'Säilytä kaksi ensimmäistä numeroa ja katso kolmatta päättääksesi, nouseeko toinen.'), T('For b) convert to km first, then round (1 km = 1000 m).', 'Kohdassa b) muunna ensin km:ksi ja pyöristä sitten (1 km = 1000 m).')] },
      { id: 't1-q36', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('Give the answers to two significant figures: c) the area 8.83 m × 100 m in m² (type it as 8.8e2), d) the current 10 W ÷ 230 V in mA.', 'Anna vastaukset kahdella merkitsevällä numerolla: c) pinta-ala 8,83 m × 100 m yksikössä m² (kirjoita muodossa 8.8e2), d) virta 10 W ÷ 230 V yksikössä mA.'),
        fields: [{ id: 'c', kind: 'sig', label: T('c)', 'c)'), unit: 'm²' }, { id: 'd', kind: 'sig', label: T('d)', 'd)'), unit: 'mA' }],
        hints: [T('Powers of ten: 8.8e2 means 8.8·10².', 'Kymmenpotenssit: 8.8e2 tarkoittaa 8,8·10².'), T('For d) calculate in A first (W/V = A), then multiply by 1000 to get mA.', 'Kohdassa d) laske ensin A:na (W/V = A) ja kerro sitten 1000:lla saadaksesi mA.')] },
      { id: 't1-q32', mode: 'graded', type: 'numeric', difficulty: 2,
        prompt: T('Exercise A1: a) 14.0550 + 6.05, b) 252.2 − 17.789. Give the results with the correct number of decimals.', 'Tehtävä A1: a) 14,0550 + 6,05, b) 252,2 − 17,789. Anna tulokset oikealla määrällä desimaaleja.'),
        fields: [{ id: 'a', kind: 'sig', label: T('a)', 'a)') }, { id: 'b', kind: 'sig', label: T('b)', 'b)') }],
        hints: [T('Find the term with the fewest decimals: it fixes the decimals of the result.', 'Etsi termi, jossa on vähiten desimaaleja: se ratkaisee tuloksen desimaalien määrän.'), T('In a) the dropped digit is a 5 followed by a 0: it rounds up.', 'Kohdassa a) poistettava numero on 5, jota seuraa 0: se pyöristyy ylöspäin.')] },
      { id: 't1-q33', mode: 'practice', type: 'numeric', difficulty: 2,
        prompt: T('Exercise A1: c) 0.0577 / 0.753 (write it as a plain decimal, e.g. 0.0766; the slide writes 76.6·10⁻³), d) 18.4 · 2.85 / 10.49.', 'Tehtävä A1: c) 0,0577 / 0,753 (kirjoita desimaalilukuna, esim. 0,0766; kalvolla 76,6·10⁻³), d) 18,4 · 2,85 / 10,49.'),
        fields: [{ id: 'c', kind: 'sig', label: T('c)', 'c)') }, { id: 'd', kind: 'sig', label: T('d)', 'd)') }],
        hints: [T('Leading zeros do not count: how many significant figures do 0.0577 and 0.753 have?', 'Etunollat eivät ole merkitseviä: montako merkitsevää numeroa luvuissa 0,0577 ja 0,753 on?'), T('In d) the data have 3, 3 and 4 significant figures. A zero at the end of the answer may be needed.', 'Kohdassa d) lähtöarvoissa on 3, 3 ja 4 merkitsevää numeroa. Vastauksen loppuun voi tarvita nollan.')] },
      { id: 't1-q34', mode: 'graded', type: 'numeric', difficulty: 3,
        prompt: T('Exercise A1 e): (4.70·10⁴ / 18.533) + 664.99. Type the answer with a power of ten, e.g. 3.20e3 means 3.20·10³.', 'Tehtävä A1 e): (4,70·10⁴ / 18,533) + 664,99. Kirjoita vastaus kymmenpotenssimuodossa, esim. 3.20e3 tarkoittaa 3,20·10³.'),
        fields: [{ id: 'v', kind: 'sig' }],
        hints: [T('Work out the quotient and the sum without rounding first.', 'Laske osamäärä ja summa ensin pyöristämättä.'), T('4.70·10⁴ is known only to the hundreds, so the sum is known to the tens: how many significant figures is that?', '4,70·10⁴ tunnetaan vain satasten tarkkuudella, joten summa tunnetaan kymmenten tarkkuudella: montako merkitsevää numeroa se on?')] },
      { id: 't1-q37', mode: 'practice', type: 'order', difficulty: 2,
        prompt: T('Put the steps of the mixed calculation 9.500 ÷ 5.05 + 2.45 + 3.84 × 2.0 − 1.58 in order.', 'Järjestä sekalaskun 9,500 ÷ 5,05 + 2,45 + 3,84 × 2,0 − 1,58 vaiheet järjestykseen.'),
        items: [{ id: 'o3', html: T('Round once, at the end, to the decimal places of the least precise term', 'Pyöristä kerran, lopuksi, epätarkimman termin desimaaleihin') },
                { id: 'o1', html: T('Evaluate each division and multiplication, keeping all digits', 'Laske jokainen jako- ja kertolasku kaikki numerot säilyttäen') },
                { id: 'o4', html: T('State the answer with its unit', 'Ilmoita vastaus yksikön kanssa') },
                { id: 'o2', html: T('Add and subtract the unrounded terms', 'Laske pyöristämättömät termit yhteen ja vähennä') }],
        hints: [T('Intermediate results are not rounded, so rounding comes late.', 'Välituloksia ei pyöristetä, joten pyöristys tulee myöhään.')] },
      { id: 't1-q38', mode: 'graded', type: 'numeric', difficulty: 3,
        prompt: T('Calculate 9.500 ÷ 5.05 + 2.45 + 3.84 × 2.0 − 1.58 and give the result with the correct number of significant figures. (Slide p09, item 4.)', 'Laske 9,500 ÷ 5,05 + 2,45 + 3,84 × 2,0 − 1,58 ja anna tulos oikealla määrällä merkitseviä numeroita. (Kalvo s. 09, kohta 4.)'),
        fields: [{ id: 'v', kind: 'sig' }],
        hints: [T('Do not round the division or the multiplication; only the final sum.', 'Älä pyöristä jako- tai kertolaskua; vain lopullinen summa pyöristetään.'), T('Which term limits the decimals of the sum? Use the calculator lab above or the rounding trap.', 'Mikä termi rajoittaa summan desimaaleja? Käytä yllä olevaa laskinta tai pyöristysansaa.')] },
      { id: 't1-q26', mode: 'graded', type: 'numeric', difficulty: 2,
        prompt: T('Exercise 1.5: the edge of a cube is 4.14 m. Calculate the volume of the cube to two decimal places.', 'Tehtävä 1.5: kuution särmän pituus on 4,14 m. Laske kuution tilavuus kahden desimaalin tarkkuudella.'),
        fields: [{ id: 'V', kind: 'sig', tex: 'V', unit: 'm³' }],
        hints: [T('The volume of a cube is the edge cubed.', 'Kuution tilavuus on särmän kolmas potenssi.'), T('Keep all digits of the cube until the end, then round to two decimals as the task says.', 'Säilytä kuution kaikki numerot loppuun asti ja pyöristä sitten kahteen desimaaliin tehtävän ohjeen mukaan.')] }
    ]
  });
})();

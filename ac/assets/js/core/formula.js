/* Offline formula renderer -> native MathML (Chrome/Edge 109+, Firefox, Safari), so formulas look like
 * Word's equation editor without a maths library.
 * Syntax:  {a}/{b} fraction · x_1 or x_{AB} subscript · x^2 or x^{-1} superscript · ∫_0^t both
 *          sqrt{...} root · r² (Unicode super/subscripts) · \{ \} literal braces · 2+ spaces = wider gap
 *          everything else is literal (Unicode welcome: Ω ρ Σ · ≈). Runs of 3+ letters are upright words.
 * Example: "R = {ρ · l}/{A}",  "I_1 + I_2 = I_3",  "P = U^2 / R"  */
(function (TDC) {
  'use strict';
  var esc = TDC.util.escapeHtml;
  var SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺', SUB = '₀₁₂₃₄₅₆₇₈₉';
  var OPS = '=+−-×·≈<>≤≥→⇒⇔±∓÷∥|,:;()[]–∝∠/∫∑Σ∞';
  var LETTER = /[A-Za-zΑ-Ωα-ωµ]/;

  function mi(s) { return s.length > 2 ? '<mi mathvariant="normal">' + esc(s) + '</mi>' : '<mi>' + esc(s) + '</mi>'; }
  function digitsOrWord(s) { return /^[\d.]+$/.test(s) ? '<mn>' + s + '</mn>' : /^[−-]?[\d.]+$/.test(s) ? '<mrow><mo>−</mo><mn>' + s.replace(/^[−-]/, '') + '</mn></mrow>' : mi(s); }

  function render(src) {
    var i = 0;
    function group() { i++; var out = seq('}'); i++; return '<mrow>' + out.join('') + '</mrow>'; }   // src[i] === '{'
    // Script argument: {group} or a run of letters/digits (a leading minus is allowed: x^-1).
    function scriptArg() {
      if (src[i] === '{') return group();
      if (src[i] === '\\' && i + 1 < src.length) { i += 2; return mi(src[i - 1]); }
      var m = /^[−-]?[A-Za-z0-9Α-Ωα-ω]+/.exec(src.slice(i));
      if (m) { i += m[0].length; return digitsOrWord(m[0]); }
      return '<mrow></mrow>';
    }
    function seq(stop) {
      var out = [], spaces = 0;
      function isOp(x) { return x && x.indexOf('<mo') === 0; }
      function push(node) {
        if (spaces && out.length) {
          if (spaces >= 2) out.push('<mspace width="' + (0.3 * spaces).toFixed(2) + 'em"/>');
          else if (!isOp(out[out.length - 1]) && !isOp(node)) out.push('<mspace width="0.25em"/>');
        }
        spaces = 0; out.push(node);
      }
      function base() { return out.length ? out.pop() : '<mrow></mrow>'; }
      while (i < src.length && src[i] !== stop) {
        var c = src[i];
        if (c === ' ') { spaces++; i++; continue; }
        if (src.substr(i, 5) === 'sqrt{') { i += 4; push('<msqrt>' + group() + '</msqrt>'); continue; }
        if (c === '{') {
          var num = group();
          if (src[i] === '/' && src[i + 1] === '{') { i++; push('<mfrac>' + num + group() + '</mfrac>'); } else push(num);
          continue;
        }
        if (c === '_' || c === '^') {
          spaces = 0; i++;
          var b = base(), first = scriptArg(), other = c === '_' ? '^' : '_';
          if (src[i] === other) { i++; var second = scriptArg(); push(c === '_' ? '<msubsup>' + b + first + second + '</msubsup>' : '<msubsup>' + b + second + first + '</msubsup>'); }
          else push((c === '_' ? '<msub>' : '<msup>') + b + first + (c === '_' ? '</msub>' : '</msup>'));
          continue;
        }
        if (SUP.indexOf(c) >= 0 || SUB.indexOf(c) >= 0) {           // r², e⁻, Cu²⁺, I₁
          var tbl = SUP.indexOf(c) >= 0 ? SUP : SUB, run = '';
          while (i < src.length && tbl.indexOf(src[i]) >= 0) { run += '0123456789−+'[tbl.indexOf(src[i])]; i++; }
          var tag = tbl === SUP ? 'msup' : 'msub', arg = /^\d+$/.test(run) ? '<mn>' + run + '</mn>' : '<mo>' + run + '</mo>';
          spaces = 0; var bb = base(); push('<' + tag + '>' + bb + arg + '</' + tag + '>');
          continue;
        }
        if (c === '\\' && i + 1 < src.length) { push(mi(src[i + 1])); i += 2; continue; }
        var m = /^\d+(?:[.,]\d+)?/.exec(src.slice(i));            // 0.5 or 0,5 -> the reader's decimal separator
        if (m) { push('<mn>' + m[0].replace(/[.,]/, TDC.i18n.lang === 'fi' ? ',' : '.') + '</mn>'); i += m[0].length; continue; }
        if (LETTER.test(c)) {
          var w = /^[A-Za-zΑ-Ωα-ωµ]+/.exec(src.slice(i))[0];
          i += w.length;
          if (w.length > 2) push(mi(w)); else for (var k = 0; k < w.length; k++) push(mi(w[k]));
          continue;
        }
        // Literal brackets keep text height (MathML would stretch them around subscripts: "(N_p − N_e)")
        if (OPS.indexOf(c) >= 0) { push('<mo' + ('()[]|'.indexOf(c) >= 0 ? ' stretchy="false"' : '') + '>' + esc(c === '-' ? '−' : c) + '</mo>'); i++; continue; }
        push('<mtext>' + esc(c) + '</mtext>'); i++;
      }
      return out;
    }
    return seq(null).join('');
  }
  function wrap(inner, display) { return '<math' + (display ? ' display="block"' : '') + '>' + inner + '</math>'; }

  TDC.formula = {
    html: function (src) { return wrap(render(src)); },
    /** Wrap ready-made MathML (e.g. TDC.calc.toMathML) in a <math> element string. */
    wrap: wrap,
    /** Element with a rendered formula; `display` makes it a centred block. src: tex string, or {en, fi} when it has words. */
    el: function (src, display) {
      if (src && typeof src === 'object') { var n = TDC.formula.el(TDC.i18n.tx(src), display); n.dataset.texi = JSON.stringify(src); return n; }
      if (!display) {
        // MathML never line-breaks: give long inline formulas a break chance before each top-level "=" (phones)
        var pieces = [], d = 0, from = 0;
        if (src.length > 16) for (var j = 1; j < src.length; j++) {
          var ch = src[j];
          if ('{(['.indexOf(ch) >= 0 && src[j - 1] !== '\\') d++; else if ('})]'.indexOf(ch) >= 0 && src[j - 1] !== '\\') d--;
          else if (!d && ch === '=' && src[j - 1] === ' ') { pieces.push(src.slice(from, j - 1)); from = j; }
        }
        pieces.push(src.slice(from));
        return TDC.util.el('span', { class: 'formula', dataset: { tex: src }, html: pieces.map(function (p) { return wrap(render(p.trim())); }).join(' ') });
      }
      // "A = …,   B = …" (comma + 2 spaces at brace depth 0) -> separate pieces that wrap on narrow screens
      var parts = [], depth = 0, start = 0;
      for (var i = 0; i < src.length; i++) {
        if (src[i] === '{' && src[i - 1] !== '\\') depth++; else if (src[i] === '}' && src[i - 1] !== '\\') depth--;
        else if (!depth && (src[i] === ',' || src[i] === ';') && src.substr(i + 1, 2) === '  ') { parts.push(src.slice(start, i)); start = i + 1; }
      }
      parts.push(src.slice(start));
      return TDC.util.el('div', { class: 'formula formula-display', dataset: { tex: src, display: '1' }, html: parts.map(function (p) { return wrap(render(p.trim()), true); }).join('') });
    }
  };
  // Decimal separators follow the language: re-render formulas in place after a switch.
  TDC.on('langchange', function () {
    document.querySelectorAll('.formula[data-tex]').forEach(function (n) {
      n.innerHTML = TDC.formula.el(n.dataset.texi ? JSON.parse(n.dataset.texi) : n.dataset.tex, !!n.dataset.display).innerHTML;
    });
  });
})(window.TDC);

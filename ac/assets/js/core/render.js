/* Page rendering: home page, topic pages and content blocks. Block types are pluggable through
 * TDC.render.blocks[type] = function (block, ctx) -> Node. Content schema: ../.claude/skills/author-topic-content. */
(function (TDC) {
  'use strict';
  var U = TDC.util, el = U.el, I = TDC.i18n;
  var cleanups = [];          // run on every page change (widgets, observers)
  var R = TDC.render = { blocks: {}, postprocessors: [] };

  function tx(obj, asText) { var n = el(asText ? 'span' : 'div'); I.bind(n, obj, asText); return n; }
  function txs(tag, obj, attrs) { var n = el(tag, attrs); I.bind(n, obj); post(n); return n; }
  function post(n) { R.postprocessors.forEach(function (p) { p(n); }); }
  R.tx = tx; R.txs = txs; R.post = post;
  R.onCleanup = function (fn) { cleanups.push(fn); };
  R.cleanup = function () { cleanups.splice(0).forEach(function (f) { try { f(); } catch (e) { console.error(e); } }); I.resetBindings(); };

  // Inline markup inside bilingual HTML: <f>U = R·I</f> -> formula; <dfn data-term="key"> -> glossary popover.
  R.postprocessors.push(function (root) {
    root.querySelectorAll('f').forEach(function (f) { f.replaceWith(TDC.formula.el(f.textContent, false)); });
    root.querySelectorAll('dfn[data-term]:not(.term)').forEach(function (d) {
      d.tabIndex = 0; d.classList.add('term');
      d.addEventListener('click', function () { TDC.tools && TDC.tools.termPopover(d, d.dataset.term); });
      d.addEventListener('keydown', function (e) { if (e.key === 'Enter') d.click(); });
    });
  });
  // Plain-text maths in prose ("U_T", "R_{eq}", "N_p", "10^-3") becomes MathML, so raw _ and ^ never show.
  var RAW_MATH = /[A-Za-zΑ-Ωα-ωµ]+_(?:\{[^}]*\}|[A-Za-z0-9]+)(?:\^(?:\{[^}]*\}|[-−]?[A-Za-z0-9]+))?|\b\d+(?:[.,]\d+)?\^(?:\{[^}]*\}|[-−]?\d+)/g;
  var RAW_MATH_1 = new RegExp(RAW_MATH.source), SVGNS = 'http://www.w3.org/2000/svg';
  function upgradeText(t) {
    var p = t.parentNode;
    if (!p || !RAW_MATH_1.test(t.data) || p.closest('math, code, kbd, pre, script, style, textarea, select, .formula, .no-math')) return;
    var inSvg = p.namespaceURI === SVGNS, s = t.data, frag = document.createDocumentFragment(), last = 0;
    if (inSvg && !/^(text|tspan)$/.test(p.localName)) return;
    s.replace(RAW_MATH, function (m, off) {
      frag.append(s.slice(last, off)); last = off + m.length;
      if (!inSvg) { frag.append(TDC.formula.el(m)); return m; }
      // SVG cannot hold MathML: subscript as a lowered, smaller tspan (dy works in every browser)
      var mm = /^([^_^]+)_\{?([^}^]*)\}?(?:\^\{?([^}]*)\}?)?$/.exec(m);
      if (!mm) { frag.append(m); return m; }
      var sub = document.createElementNS(SVGNS, 'tspan'), back = document.createElementNS(SVGNS, 'tspan');
      sub.setAttribute('dy', '0.3em'); sub.setAttribute('font-size', '75%'); sub.textContent = mm[2];
      back.setAttribute('dy', '-0.3em'); back.textContent = '​';
      frag.append(mm[1], sub, back);
      return m;
    });
    frag.append(s.slice(last));
    t.replaceWith(frag);
  }
  function upgradeRawMath(root) {
    if (root.nodeType === 3) return upgradeText(root);
    if (root.nodeType !== 1) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = [];
    while (w.nextNode()) if (RAW_MATH_1.test(w.currentNode.data)) nodes.push(w.currentNode);
    nodes.forEach(upgradeText);
  }
  R.postprocessors.push(upgradeRawMath);
  R.upgradeRawMath = upgradeRawMath;   // for text built outside topic blocks (glossary drawer, term popovers)
  // Widgets write their own HTML/SVG (readouts, tables, plot labels): upgrade those as they appear.
  if ('MutationObserver' in window) document.addEventListener('DOMContentLoaded', function () {
    var main = document.getElementById('main');
    if (main) new MutationObserver(function (ms) {
      ms.forEach(function (m) { if (m.target.closest && m.target.closest('.widget-host, .q-widget')) m.addedNodes.forEach(upgradeRawMath); });
    }).observe(main, { childList: true, subtree: true });
  });
  // Re-run postprocessors after a language switch (bound HTML is replaced).
  TDC.on('langchange', function () { var m = document.getElementById('main'); if (m) post(m); });

  // ---------- block renderers ----------
  var B = R.blocks;
  B.text = function (b) { return txs('div', b.html, { class: 'blk-text' }); };
  B.h = function (b) { return txs('h3', b.text, { class: 'blk-h' }); };
  B.list = function (b) {
    return el(b.ordered ? 'ol' : 'ul', { class: 'blk-list' }, b.items.map(function (it) { return txs('li', it); }));
  };
  B.formula = function (b) {
    var box = el('div', { class: 'blk-formula' + (b.key ? ' is-key' : '') });
    if (b.label) box.appendChild(txs('div', b.label, { class: 'formula-label' }));
    box.appendChild(TDC.formula.el(b.tex, true));
    if (b.legend) box.appendChild(el('dl', { class: 'formula-legend' }, b.legend.map(function (row) {
      return el('div', {}, [el('dt', { html: TDC.formula.html(row[0]) }), txs('dd', row[1]), row[2] ? el('dd', { class: 'unit' }, '[' + row[2] + ']') : null]);
    })));
    return box;
  };
  B.callout = function (b) {
    var icons = { key: '★', tip: '💡', warn: '⚠', info: 'ℹ', fun: '⚡', history: '📜' };
    return el('aside', { class: 'blk-callout callout-' + (b.kind || 'info') }, [
      el('span', { class: 'callout-icon', 'aria-hidden': 'true' }, icons[b.kind] || 'ℹ'),
      el('div', {}, [b.title ? txs('strong', b.title, { class: 'callout-title' }) : null, txs('div', b.html)])
    ]);
  };
  function cell(c, tag) {
    if (c && typeof c === 'object' && !Array.isArray(c) && (c.en != null || c.fi != null)) return txs(tag, c);
    if (c && typeof c === 'object' && c.tex) return el(tag, {}, TDC.formula.el(c.tex));
    return el(tag, { html: c == null ? '' : String(c) });
  }
  // Optional b.rowColors: one '#rrggbb' (or 'none') per row, tinting the row; the tone class keeps the text readable.
  function rowTint(hex) {
    if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return {};
    var lum = [1, 3, 5].reduce(function (s, i, k) {
      var c = parseInt(hex.substr(i, 2), 16) / 255;
      return s + [0.2126, 0.7152, 0.0722][k] * (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    }, 0);
    return { style: { '--row-bg': hex }, class: lum > 0.4 ? 'row-tint tone-light' : lum < 0.1 ? 'row-tint tone-dark' : 'row-tint' };
  }
  B.table = function (b) {
    var t = el('table', { class: 'blk-table' }, [
      b.caption ? txs('caption', b.caption) : null,
      b.head ? el('thead', {}, el('tr', {}, b.head.map(function (h) { return cell(h, 'th'); }))) : null,
      el('tbody', {}, b.rows.map(function (r, i) { return el('tr', rowTint(b.rowColors && b.rowColors[i]), r.map(function (c) { return cell(c, 'td'); })); }))
    ]);
    return el('div', { class: 'table-wrap', tabindex: '0' }, t);
  };
  function setAlt(n) { n.setAttribute(n.tagName === 'IMG' ? 'alt' : 'aria-label', I.tx(JSON.parse(n.dataset.alti))); }
  TDC.on('langchange', function () { document.querySelectorAll('[data-alti]').forEach(setAlt); });
  B.figure = function (b) {
    // svg: markup string, or {en, fi} when the drawing contains words (re-bound on language change)
    var media = b.svg ? (typeof b.svg === 'object' ? I.bind(el('div', { class: 'fig-svg' }), b.svg) : el('div', { class: 'fig-svg', html: b.svg }))
      : el('img', { src: b.img, alt: '', loading: 'lazy' });
    if (b.svg) upgradeRawMath(media);     // "I_s" labels -> real subscripts
    // alt -> <img alt> or, for inline SVG, role=img + aria-label (hides the SVG's own single-language labels)
    if (b.alt) { media.dataset.alti = JSON.stringify(b.alt); if (b.svg) media.setAttribute('role', 'img'); setAlt(media); }
    return el('figure', { class: 'blk-figure' }, [media, b.caption ? txs('figcaption', b.caption) : null]);
  };
  B.details = function (b) {
    return el('details', { class: 'blk-details' }, [el('summary', {}, tx(b.summary, true)), txs('div', b.html)]);
  };
  B.columns = function (b, ctx) {
    return el('div', { class: 'blk-columns' }, b.cols.map(function (col) {
      return el('div', {}, col.map(function (cb, i) { return renderBlock(cb, ctx, (b.id || 'col') + '-' + i); }));
    }));
  };
  B.example = function (b) {
    // Worked example with step-by-step reveal (PDF examples are public, so no encryption needed).
    var stepsBox = el('ol', { class: 'ex-steps' });
    var shown = 0;
    var steps = (b.steps || []).map(function (s) {
      var li = el('li', { class: 'ex-step' });
      if (s.tex) li.appendChild(TDC.formula.el(s.tex, true));
      if (s.en != null || s.fi != null) li.appendChild(txs('div', s));
      if (s.text) li.appendChild(txs('div', s.text));
      return li;
    });
    var nextBtn = el('button', { class: 'btn btn-small', onclick: function () {
      if (shown < steps.length) { stepsBox.appendChild(steps[shown]); shown++; }
      if (shown >= steps.length) { nextBtn.hidden = true; allBtn.hidden = true; if (result) result.hidden = false; }
    } }, tx({ en: 'Next step ›', fi: 'Seuraava vaihe ›' }, true));
    var allBtn = el('button', { class: 'btn btn-small btn-ghost', onclick: function () { while (shown < steps.length) nextBtn.click(); nextBtn.click(); } },
      tx({ en: 'Show all', fi: 'Näytä kaikki' }, true));
    var result = b.result ? txs('div', b.result, { class: 'ex-result', hidden: true }) : null;
    return el('div', { class: 'blk-example' }, [
      el('div', { class: 'ex-head' }, [el('span', { class: 'ex-badge' }, tx({ en: 'Example', fi: 'Esimerkki' }, true)), b.title ? txs('strong', b.title) : null]),
      b.problem ? txs('div', b.problem, { class: 'ex-problem' }) : null,
      b.given ? el('div', { class: 'ex-given' }, b.given.map(function (g) {
        if (typeof g === 'string' || g.tex) return el('span', { class: 'chip' }, TDC.formula.el(g.tex || g));   // tex string or {tex: {en, fi}}
        var c = el('span', { class: 'chip' }); I.bind(c, g); return c;   // bilingual {en, fi} given
      })) : null,
      stepsBox, result, el('div', { class: 'ex-actions' }, [nextBtn, allBtn])
    ]);
  };
  B.interactive = function (b, ctx) {
    var host = el('div', { class: 'widget-host', style: b.height ? { minHeight: b.height + 'px' } : null });
    var fig = el('figure', { class: 'blk-interactive', dataset: { widget: b.widget } }, [
      b.title ? el('div', { class: 'widget-title' }, [el('span', { class: 'widget-badge' }, tx({ en: 'Interactive', fi: 'Interaktiivinen' }, true)), txs('strong', b.title)]) : null,
      host,
      b.caption ? txs('figcaption', b.caption) : null
    ]);
    mountLazy(host, function () {
      var wctx = widgetContext(b.id, ctx);
      var inst = TDC.widgets.create(b.widget, host, b.config, wctx);
      return function () { wctx._destroy(); if (inst && inst.destroy) inst.destroy(); };
    });
    return fig;
  };
  B.question = function (b) { return TDC.quiz.renderQuestion(TDC.questionById(b.q), { inline: true }); };
  B.html = function (b) { return el('div', { class: 'blk-html', html: b.html }); };   // trusted author HTML, no translation

  function renderBlock(b, ctx, fallbackId) {
    var f = B[b.type];
    var node;
    try { node = f ? f(b, ctx) : el('div', { class: 'blk-error' }, 'Unknown block type: ' + b.type); }
    catch (e) { console.error('[TDC] block', b, e); node = el('div', { class: 'blk-error' }, '⚠ ' + e.message); }
    var wrap = el('div', { class: 'blk', dataset: { block: b.id || fallbackId } }, node);
    return wrap;
  }
  R.renderBlock = renderBlock;

  // ---------- widgets ----------
  function widgetContext(id, ctx) {
    var offs = [];
    return {
      id: id, topic: ctx && ctx.topic,
      t: TDC.t, tx: TDC.tx, el: el, svg: U.svg, fmtSI: U.fmtSI, fmtNum: U.fmtNum,
      color: TDC.theme.color,
      readOnly: function () { return TDC.store.readOnly(); },
      onLang: function (fn) { offs.push(TDC.on('langchange', fn)); },
      onTheme: function (fn) { offs.push(TDC.on('themechange', fn)); },
      getState: function () { return TDC.store.doc.widgets[id]; },
      setState: function (s) { TDC.store.update(function (d) { d.widgets[id] = s; }, { silent: true, source: 'widget' }); },
      _destroy: function () { offs.splice(0).forEach(function (f) { f(); }); }
    };
  }
  R.widgetContext = widgetContext;
  function mountLazy(host, mount) {
    var destroy = null;
    if (!('IntersectionObserver' in window)) { destroy = mount(); R.onCleanup(function () { destroy && destroy(); }); return; }
    var io = new IntersectionObserver(function (es) {
      if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); destroy = mount(); }
    }, { rootMargin: '300px' });
    io.observe(host);
    R.onCleanup(function () { io.disconnect(); if (destroy) destroy(); });
  }
  R.mountLazy = mountLazy;

  // ---------- progress ----------
  R.topicProgress = function (topicId) {
    var t = TDC.topics[topicId];
    if (!t) return 0;
    var p = (TDC.store.doc.progress[topicId] || {}).visited || {};
    var secs = t.sections.length, seen = t.sections.filter(function (s) { return p[s.id]; }).length;
    var prac = t.questions || [];   // practice and topic-test questions alike are self-checked
    var ok = prac.filter(function (q) { var a = TDC.store.doc.answers[q.id]; return a && a.correct; }).length;
    var total = secs + prac.length;
    return total ? (seen + ok) / total : 0;
  };

  R.courseScore = function () {
    var score = 0, max = 0;
    TDC.topicList.forEach(function (m) {
      var t = TDC.topics[m.id]; if (!t) return;
      var s = TDC.scoring.topicScore(t, TDC.store.doc.answers); score += s.score; max += s.max;
    });
    return { score: Math.round(score * 100) / 100, max: Math.round(max * 100) / 100 };
  };

  // Score label that follows language changes (the home page is not re-rendered on them).
  function scoreText(key, sc) {
    var n = el('span'), set = function () { n.textContent = TDC.t(key, { s: U.locNum(sc.score, 1), p: U.locNum(sc.max) }); };
    set(); R.onCleanup(TDC.on('langchange', set));
    return n;
  }

  // ---------- home ----------
  R.home = function (main) {
    var list = TDC.topicList;
    var last = TDC.store.doc.lastLocation;
    var hero = el('section', { class: 'hero' }, [
      el('div', { class: 'hero-text' }, [
        el('p', { class: 'eyebrow', 'data-i18n': 'home.eyebrow' }),
        el('h1', { 'data-i18n': 'home.title' }),
        el('p', { class: 'lead', 'data-i18n': 'home.lead' }),
        el('div', { class: 'hero-actions' }, [
          last ? el('a', { class: 'btn btn-primary', href: '#/topic/' + last.topic + '/' + last.section, 'data-i18n': 'home.continue' })
               : el('a', { class: 'btn btn-primary', href: '#/topic/' + (list[0] && list[0].id), 'data-i18n': 'home.start' }),
          el('button', { class: 'btn btn-ghost', onclick: function () { TDC.tools.openHelp(); }, 'data-i18n': 'home.howto' })
        ])
      ]),
      heroArt()
    ]);
    var grid = el('div', { class: 'topic-grid' }, list.map(function (m, i) {
      var t = TDC.topics[m.id] || {}, pct = Math.round(R.topicProgress(m.id) * 100), sc = TDC.scoring.topicScore(t, TDC.store.doc.answers);
      return el('a', { class: 'topic-card', href: '#/topic/' + m.id, style: { '--accent': m.color, '--i': i } }, [
        el('div', { class: 'tc-top' }, [
          el('span', { class: 'tc-num' }, String(m.num)),
          el('div', { class: 'tc-icon', html: m.icon || '' })
        ]),
        txs('h2', m.title, { class: 'tc-title' }),
        txs('p', m.summary, { class: 'tc-sum' }),
        el('div', { class: 'tc-foot' }, [
          el('div', { class: 'progress', role: 'progressbar', 'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100 }, el('span', { style: { width: pct + '%' } })),
          el('span', { class: 'tc-pct' }, pct + '%'),
          sc.max ? el('span', { class: 'tc-score' }, scoreText('topic.score', sc)) : null,
          t.sections ? el('span', { class: 'tc-meta' }, tx({ en: t.sections.length + ' sections', fi: t.sections.length + ' osiota' }, true)) : null
        ])
      ]);
    }));
    var features = el('section', { class: 'feature-strip' }, [
      ['✍', 'home.f.annotate'], ['⚡', 'home.f.simulate'], ['🧩', 'home.f.quiz'], ['💾', 'home.f.save']
    ].map(function (f) { return el('div', { class: 'feature' }, [el('span', { class: 'feature-icon', 'aria-hidden': 'true' }, f[0]), el('span', { 'data-i18n': f[1] })]); }));
    var cs = R.courseScore();
    main.append(hero, el('h2', { class: 'section-title', 'data-i18n': 'home.topics' }),
      cs.max ? el('p', { class: 'home-total' }, scoreText('home.scoreTotal', cs)) : null, grid, features);
    I.applyStatic(main);
  };

  function heroArt() {
    // Animated AC circuit: a sine source drives a loop; the charge dots swing back and forth. The knob sets the
    // frequency (×1…×3 of the base 0.5 Hz swing); the phase is integrated, so turning it never makes the dots jump.
    var pic = el('div', { 'aria-hidden': 'true', html:
      '<svg viewBox="0 0 320 220">' +
      '<path class="ha-wire" d="M60 40 H260 V180 H60 Z"/>' +
      '<g class="ha-dots">' + '<circle r="4"/>'.repeat(13) + '</g>' +   // above the wire, under the part bodies
      '<g class="ha-src"><circle cx="60" cy="110" r="18"/><path d="M48 110c4-10 8-10 12 0s8 10 12 0"/><text x="88" y="116">u</text></g>' +
      '<g class="ha-res"><rect x="135" y="30" width="50" height="20" rx="3"/><text x="160" y="22">R</text></g>' +
      '<g class="ha-lamp"><circle cx="260" cy="110" r="18"/><path d="M247 97 L273 123 M273 97 L247 123"/></g>' +
      '<text class="ha-i" x="196" y="200">i ⇄</text></svg>' });
    var loop = pic.querySelector('.ha-wire'), dots = pic.querySelectorAll('.ha-dots circle'), k = 1, ph = 0, last = 0;
    var MIN = 1, MAX = 3, ANG = 135;   // knob sweeps −135° … +135°
    var face = el('span', { class: 'ha-knob-face' }), val = el('b', { class: 'ha-knob-val' });
    var knob = el('div', { class: 'ha-knob', role: 'slider', tabindex: '0', 'aria-valuemin': MIN, 'aria-valuemax': MAX, 'data-i18n-aria': 'home.knob' }, face);
    function setK(v) {
      k = Math.round(Math.min(MAX, Math.max(MIN, v)) * 10) / 10;
      face.style.transform = 'rotate(' + (-ANG + 2 * ANG * (k - MIN) / (MAX - MIN)) + 'deg)';
      val.textContent = 'f × ' + U.fmtNum(k, 2);
      knob.setAttribute('aria-valuenow', k); knob.setAttribute('aria-valuetext', val.textContent);
    }
    function fromPointer(e) {
      var b = knob.getBoundingClientRect(), a = Math.atan2(e.clientX - b.left - b.width / 2, b.top + b.height / 2 - e.clientY) * 180 / Math.PI;
      setK(MIN + (MAX - MIN) * (Math.min(ANG, Math.max(-ANG, a)) + ANG) / (2 * ANG));
    }
    knob.addEventListener('pointerdown', function (e) { knob.setPointerCapture(e.pointerId); fromPointer(e); e.preventDefault(); });
    knob.addEventListener('pointermove', function (e) { if (knob.hasPointerCapture(e.pointerId)) fromPointer(e); });
    knob.addEventListener('keydown', function (e) {
      var d = { ArrowUp: 0.1, ArrowRight: 0.1, ArrowDown: -0.1, ArrowLeft: -0.1, PageUp: 0.5, PageDown: -0.5 }[e.key];
      if (d) setK(k + d); else if (e.key === 'Home') setK(MIN); else if (e.key === 'End') setK(MAX); else return;
      e.preventDefault();
    });
    setK(1);
    function place() {
      var L = loop.getTotalLength(), s = Math.sin(ph);
      dots.forEach(function (c, i) {   // same swing as before: each dot moves 6 % of the loop back and forth
        var pt = loop.getPointAtLength(L * (((i + 0.5) / dots.length + 0.03 * s) % 1));
        c.setAttribute('cx', pt.x.toFixed(1)); c.setAttribute('cy', pt.y.toFixed(1));
      });
    }
    requestAnimationFrame(function tick(t) {
      if (!pic.isConnected) return;   // home view left: stop
      if (last) ph = (ph + Math.PI * k * Math.min(0.05, (t - last) / 1000)) % (2 * Math.PI);   // 0.5 Hz × k
      last = t; place();
      if (!U.reducedMotion()) requestAnimationFrame(tick);
    });
    // fixed scale around the knob: ticks every 0.2, numbered at 1, 2, 3 (135° per unit, same mapping as setK)
    var marks = '';
    for (var i = 0; i <= 10; i++) {   // integer steps: summing 0.2 drifts in floating point
      var v = MIN + i / 5, a = (v - MIN) * 2 * ANG / (MAX - MIN) - ANG, sn = Math.sin(a * Math.PI / 180), cs = -Math.cos(a * Math.PI / 180), big = i % 5 === 0, r1 = big ? 56 : 52;
      marks += '<line x1="' + (47 * sn).toFixed(1) + '" y1="' + (47 * cs).toFixed(1) + '" x2="' + (r1 * sn).toFixed(1) + '" y2="' + (r1 * cs).toFixed(1) + '"' + (big ? ' class="big"' : '') + '/>';
      if (big) marks += '<text x="' + (64 * sn).toFixed(1) + '" y="' + (64 * cs).toFixed(1) + '">' + v + '</text>';
    }
    var dial = el('div', { class: 'ha-dial' }, [el('span', { 'aria-hidden': 'true', html: '<svg viewBox="-70 -70 140 140">' + marks + '</svg>' }), knob]);
    return el('div', { class: 'hero-art' }, [pic, el('div', { class: 'ha-panel' }, [dial, el('span', {}, [el('span', { class: 'ha-knob-lab', 'data-i18n': 'home.knob' }), val])])]);
  }

  // ---------- topic page ----------
  R.topic = function (main, topicId, sectionId) {
    var t = TDC.topics[topicId], meta = TDC.topicList.filter(function (m) { return m.id === topicId; })[0] || {};
    if (!t) { main.appendChild(el('p', { class: 'empty' }, 'Topic not found: ' + topicId)); return; }
    var ctx = { topic: topicId };
    var sections = t.sections.slice();
    var practiceLeft = (t.questions || []).filter(function (q) {
      return q.mode !== 'graded' && !JSON.stringify(t.sections).includes('"q":"' + q.id + '"');
    });
    if (practiceLeft.length) sections.push({ id: topicId + '-practice', title: { en: 'More practice', fi: 'Lisää harjoituksia' }, auto: true,
      blocks: practiceLeft.map(function (q) { return { type: 'question', q: q.id, id: q.id + '-blk' }; }) });
    var graded = (t.questions || []).filter(function (q) { return q.mode === 'graded'; });
    if (graded.length) sections.push({ id: topicId + '-quiz', title: { get en() { return TDC.t('quiz.topicTest'); }, get fi() { return TDC.t('quiz.topicTest'); } }, quiz: true, blocks: [] });

    var visited = ((TDC.store.doc.progress[topicId] || {}).visited) || {};
    var tocMin = TDC.prefs.get('tocMin', false);
    var tocMinBtn = el('button', { class: 'icon-btn toc-min', 'aria-expanded': String(!tocMin), 'data-i18n-title': 'topic.tocMin', 'data-i18n-aria': 'topic.tocMin',
      onclick: function () {
        var min = toc.classList.toggle('min'); tocMinBtn.setAttribute('aria-expanded', !min); TDC.prefs.set('tocMin', min);
      } }, el('span', { 'aria-hidden': 'true' }, '▴'));
    var toc = el('nav', { class: 'toc' + (tocMin ? ' min' : ''), 'aria-label': 'Sections' }, [
      el('div', { class: 'toc-head' }, [el('span', { class: 'toc-num', style: { background: meta.color } }, String(t.num != null ? t.num : meta.num)), txs('strong', t.title), tocMinBtn]),
      el('div', { class: 'progress toc-progress' }, el('span', { style: { width: Math.round(R.topicProgress(topicId) * 100) + '%' } })),
      el('ol', {}, sections.map(function (s) {
        return el('li', { class: visited[s.id] ? 'seen' : '' }, el('a', { href: '#/topic/' + topicId + '/' + s.id, dataset: { sec: s.id } }, tx(s.title, true)));
      })),
      TDC.store.readOnly() ? null : el('button', { class: 'btn btn-small btn-ghost toc-reset', onclick: function () { TDC.tools.confirmReset(topicId); } },
        [el('span', { 'aria-hidden': 'true' }, '↺ '), el('span', { 'data-i18n': 'reset.topic' })])
    ]);
    var tocToggle = el('button', { class: 'btn btn-small toc-toggle', 'aria-expanded': 'false', onclick: function () {
      var open = toc.classList.toggle('open'); tocToggle.setAttribute('aria-expanded', open);
    } }, [el('span', { 'aria-hidden': 'true' }, '☰ '), el('span', { 'data-i18n': 'topic.contents' })]);

    var article = el('article', { class: 'topic-content', style: { '--accent': meta.color } }, [
      el('header', { class: 'topic-hero' }, [
        el('div', { class: 'topic-hero-icon', html: meta.icon || '' }),
        el('div', {}, [
          el('p', { class: 'eyebrow' }, tx({ en: 'Topic ' + t.num, fi: 'Aihe ' + t.num }, true)),
          txs('h1', t.title),
          t.subtitle ? txs('p', t.subtitle, { class: 'lead' }) : null,
          t.objectives ? el('details', { class: 'objectives', open: true }, [
            el('summary', { 'data-i18n': 'topic.objectives' }),
            el('ul', {}, t.objectives.map(function (o) { return txs('li', o); }))
          ]) : null
        ])
      ])
    ]);
    sections.forEach(function (s) {
      var sec = el('section', { class: 'sec' + (s.quiz ? ' sec-quiz' : ''), id: s.id, dataset: { section: s.id } }, [
        el('div', { class: 'sec-head' }, [
          txs('h2', s.title),
          el('button', { class: 'icon-btn bm-btn', 'data-i18n-title': 'notes.bookmark', 'data-i18n-aria': 'notes.bookmark', 'aria-pressed': String(TDC.store.doc.bookmarks.indexOf(s.id) >= 0),
            onclick: function (e) { TDC.tools.toggleBookmark(s.id, e.currentTarget); } }, '🔖')
        ])
      ]);
      var body = el('div', { class: 'sec-body' });
      if (s.quiz) body.appendChild(TDC.quiz.renderTopicTest(t, graded));
      else s.blocks.forEach(function (b, i) { body.appendChild(renderBlock(b, ctx, s.id + '-b' + i)); });
      sec.appendChild(body);
      sec.appendChild(TDC.tools.sectionNoteBox(s.id));
      article.appendChild(sec);
    });
    // Prev / next topic
    var idx = TDC.topicList.findIndex(function (m) { return m.id === topicId; });
    var prev = TDC.topicList[idx - 1], next = TDC.topicList[idx + 1];
    article.appendChild(el('nav', { class: 'topic-nav' }, [
      prev ? el('a', { class: 'btn btn-ghost', href: '#/topic/' + prev.id }, ['‹ ', tx(prev.title, true)]) : el('span'),
      next ? el('a', { class: 'btn btn-primary', href: '#/topic/' + next.id }, [tx(next.title, true), ' ›']) : el('a', { class: 'btn btn-ghost', href: '#/' , 'data-i18n': 'nav.home' })
    ]));

    main.append(el('div', { class: 'topic-layout' }, [el('div', { class: 'toc-wrap' }, [tocToggle, toc]), article]));
    I.applyStatic(main);
    TDC.annotate.attach(article, topicId);
    trackSections(topicId, article, toc);
    if (sectionId) {
      var target = document.getElementById(sectionId);
      if (target) setTimeout(function () { target.scrollIntoView({ block: 'start' }); }, 30);
    } else window.scrollTo(0, 0);
  };

  function trackSections(topicId, article, toc) {
    if (!('IntersectionObserver' in window)) return;
    var mark = U.debounce(function (secId) {
      if (TDC.store.readOnly()) return;
      TDC.store.update(function (d) {
        var p = d.progress[topicId] = d.progress[topicId] || { visited: {} };
        if (!p.visited[secId]) p.visited[secId] = new Date().toISOString();
        d.lastLocation = { topic: topicId, section: secId };
      }, { silent: true, source: 'progress' });
    }, 1200);
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var id = e.target.dataset.section;
        toc.querySelectorAll('a').forEach(function (a) { a.classList.toggle('current', a.dataset.sec === id); });
        var li = toc.querySelector('a[data-sec="' + id + '"]'); if (li) li.parentNode.classList.add('seen');
        mark(id);
      });
    }, { rootMargin: '-35% 0px -55% 0px' });
    article.querySelectorAll('.sec').forEach(function (s) { io.observe(s); });
    R.onCleanup(function () { io.disconnect(); });
  }
})(window.TDC);

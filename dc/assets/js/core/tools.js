/* Study tools: "My work" drawer (saving, notes file), tools drawer (calculator,
 * formula sheet, EN-FI glossary, help), bookmarks, per-section notes and glossary popovers. */
(function (TDC) {
  'use strict';
  var U = TDC.util, el = U.el, I = TDC.i18n;
  var S = function () { return TDC.store; };
  var Tools = TDC.tools = {};

  // ---------- section notes & bookmarks ----------
  Tools.sectionNoteBox = function (sectionId) {
    var txt = S().doc.sectionNotes[sectionId] || '';
    var ta = el('textarea', { class: 'input', rows: 3, 'data-i18n-ph': 'notes.sectionPh', 'aria-label': TDC.t('notes.sectionNotes'), readonly: S().readOnly() ? true : null });
    ta.value = txt;
    ta.addEventListener('input', U.debounce(function () { S().update(function (d) { d.sectionNotes[sectionId] = ta.value; }, { source: 'note' }); }, 400));
    var det = el('details', { class: 'sec-notes' + (txt ? ' has-notes' : ''), open: txt ? true : null }, [
      el('summary', {}, [el('span', { 'aria-hidden': 'true' }, '📝 '), el('span', { 'data-i18n': 'notes.sectionNotes' })]), ta
    ]);
    return det;
  };
  Tools.toggleBookmark = function (sectionId, btn) {
    S().update(function (d) {
      var i = d.bookmarks.indexOf(sectionId);
      if (i >= 0) d.bookmarks.splice(i, 1); else d.bookmarks.push(sectionId);
      if (btn) btn.setAttribute('aria-pressed', String(i < 0));
      TDC.ui.toast(TDC.t(i < 0 ? 'notes.bookmarked' : 'notes.unbookmarked'));
    });
  };
  function sectionTitle(secId) {
    for (var id in TDC.topics) {
      var s = TDC.topics[id].sections.find(function (x) { return x.id === secId; });
      if (s) return { topic: id, title: I.tx(s.title), num: TDC.topics[id].num };
    }
    return { topic: secId.split('-')[0], title: secId, num: '' };
  }

  // ---------- "My work" drawer ----------
  Tools.openNotes = function () {
    TDC.ui.drawer('notes', TDC.t('notes.title'), function (c) {
      var d = S().doc, st = S().status();
      // Saving
      {
        var fileInput = el('input', { type: 'file', accept: '.js,.json', hidden: true, onchange: function () {
          var f = fileInput.files[0]; if (!f) return;
          fileInput.value = '';   // so choosing the same file again still fires change
          TDC.ui.confirm(TDC.t('notes.loadTitle'), TDC.t('notes.loadBody'), TDC.t('notes.loadOk'), true).then(function (ok) {
            if (!ok) return;
            S().importFile(f).then(function () { TDC.ui.toast(TDC.t('notes.importRestored'), 'ok'); TDC.ui.closeDrawer(); TDC.router.refresh(); })
              .catch(function (e) { TDC.ui.toast(TDC.t(e && e.message === 'other-course' ? 'notes.importOtherCourse' : 'notes.importFailed'), 'bad'); });
          });
        } });
        var linkRow = [];
        if (st.fs) {
          if (st.file === 'linked') linkRow.push(el('p', { class: 'ok' }, '✓ ' + TDC.t('notes.fileLinked')), el('button', { class: 'btn btn-small btn-ghost', onclick: function () { S().unlink(); TDC.ui.closeDrawer(); }, 'data-i18n': 'notes.unlink' }));
          else if (st.file === 'needs-permission') linkRow.push(el('button', { class: 'btn btn-primary', onclick: function () { S().reconnect().then(function () { TDC.ui.closeDrawer(); }); }, 'data-i18n': 'notes.reconnect' }));
          else linkRow.push(el('button', { class: 'btn btn-primary', onclick: function () {
            S().linkFile().then(function () { TDC.ui.toast(TDC.t('notes.fileLinked'), 'ok'); TDC.ui.closeDrawer(); }).catch(function (e) { if (e.name !== 'AbortError') TDC.ui.toast(TDC.t('notes.saveFailed'), 'bad'); });
          }, 'data-i18n': 'notes.link' }));
        }
        c.appendChild(el('section', { class: 'drawer-sec' }, [
          el('h3', { 'data-i18n': 'notes.saving' }),
          el('p', { class: 'muted', 'data-i18n': 'notes.autosaveInfo' }),
          st.fs ? el('p', { class: 'muted', html: TDC.t('notes.linkInfo') }) : el('p', { class: 'muted', html: TDC.t('notes.noFsInfo') }),
          el('div', { class: 'btn-col' }, linkRow.concat([
            el('button', { class: 'btn', onclick: function () { S().download(); TDC.ui.toast(TDC.t('notes.downloaded'), 'ok', 5000); }, 'data-i18n': 'notes.download' }),
            el('button', { class: 'btn btn-ghost', onclick: function () { fileInput.click(); }, 'data-i18n': 'notes.import' }), fileInput
          ]))
        ]));
      }
      // Bookmarks
      c.appendChild(el('section', { class: 'drawer-sec' }, [
        el('h3', { 'data-i18n': 'notes.bookmarks' }),
        d.bookmarks.length ? el('ul', { class: 'link-list' }, d.bookmarks.map(function (b) {
          var s = sectionTitle(b);
          return el('li', {}, el('a', { href: '#/topic/' + s.topic + '/' + b, onclick: TDC.ui.closeDrawer }, s.num + ' · ' + s.title));
        })) : el('p', { class: 'muted', 'data-i18n': 'notes.noBookmarks' })
      ]));
      // Notes overview
      var noteKeys = Object.keys(d.sectionNotes).filter(function (k) { return d.sectionNotes[k]; });
      c.appendChild(el('section', { class: 'drawer-sec' }, [
        el('h3', { 'data-i18n': 'notes.allNotes' }),
        noteKeys.length ? el('ul', { class: 'link-list' }, noteKeys.map(function (k) {
          var s = sectionTitle(k);
          return el('li', {}, [el('a', { href: '#/topic/' + s.topic + '/' + k, onclick: TDC.ui.closeDrawer }, s.title), el('p', { class: 'muted clamp' }, d.sectionNotes[k])]);
        })) : el('p', { class: 'muted', 'data-i18n': 'notes.noNotes' })
      ]));
      c.appendChild(el('section', { class: 'drawer-sec' }, [
        el('h3', { 'data-i18n': 'reset.heading' }),
        el('p', { class: 'muted small', 'data-i18n': 'reset.info' }),
        el('button', { class: 'btn btn-small btn-danger-ghost', onclick: function () { Tools.confirmReset(); }, 'data-i18n': 'reset.all' })
      ]));
      I.applyStatic(c);
    });
  };

  Tools.openHelp = function () {
    TDC.ui.modal({ title: TDC.t('help.title'), body: TDC.t('help.body'), wide: true });
  };
  // ---------- tools drawer ----------
  Tools.openTools = function (tab) {
    TDC.ui.drawer('tools', TDC.t('tools.title'), function (c) {
      var tabs = [['calc', 'tools.calc'], ['formulas', 'tools.formulas'], ['glossary', 'tools.glossary']];
      var panel = el('div', { class: 'tool-panel' });
      var bar = el('div', { class: 'tabs', role: 'tablist' }, tabs.map(function (t) {
        return el('button', { class: 'tab', role: 'tab', dataset: { tab: t[0] }, 'data-i18n': t[1], onclick: function () { show(t[0]); } });
      }));
      function show(id) {
        bar.querySelectorAll('.tab').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.tab === id)); });
        panel.innerHTML = '';
        ({ calc: calculator, formulas: formulaSheet, glossary: glossary })[id](panel);
        I.applyStatic(panel);
      }
      c.append(bar, panel);
      I.applyStatic(c);
      show(tab || 'calc');
    });
  };

  // ---------- calculator (engine: core/calc.js; every feature is available) ----------
  var C = TDC.calc;
  var calcEnv = {}, calcHist = [];          // kept while the page is open (not saved in the notes file)
  function dec() { return I.lang === 'fi' ? ',' : '.'; }
  function calcErr(e) { return TDC.t('tools.calcErr.' + ((e && e.key) || 'at'), { x: e && e.arg }); }
  /** "Interpreted as" box under an input: shows the parsed expression as maths, or what is wrong. */
  function previewBox() {
    var math = el('div', { class: 'mp-math' }), msg = el('div', { class: 'mp-msg' });
    var box = el('div', { class: 'math-preview', 'aria-live': 'polite', hidden: true }, [el('span', { class: 'mp-label', 'data-i18n': 'tools.interpreted' }), math, msg]);
    box.show = function (mathml, err) {
      box.hidden = !mathml && !err;
      box.classList.toggle('is-bad', !!err);
      math.innerHTML = mathml ? TDC.formula.wrap(mathml, true) : '';
      msg.textContent = err || '';
    };
    I.applyStatic(box);
    return box;
  }
  Tools.previewBox = previewBox;

  function calculator(p) {
    var hist = el('ol', { class: 'calc-hist' });
    var inp = el('input', { class: 'input calc-input', placeholder: '12 / (4k7 || 10k)', 'aria-label': TDC.t('tools.calc'), autocomplete: 'off', spellcheck: 'false' });
    var pv = previewBox();
    var out = el('div', { class: 'calc-out', role: 'status' });
    var disp = el('div', { class: 'calc-display' }, [pv, out]);   // above the input: its growing rows never move the keys
    function toEnd() { disp.scrollTop = disp.scrollHeight; }
    function preview() {
      if (!inp.value.trim()) return pv.show();
      try { pv.show(C.toMathML(C.parse(inp.value).tree, dec())); } catch (e) { pv.show(null, calcErr(e)); }
    }
    function drawHist() {
      hist.innerHTML = '';
      calcHist.forEach(function (h) {
        hist.appendChild(el('li', { tabindex: '0', onclick: function () { inp.value = String(h.v); preview(); inp.focus(); } },
          [el('span', { class: 'ch-expr', html: TDC.formula.wrap(h.ml) }), el('b', {}, '= ' + U.fmtNum(h.v, 6))]));
      });
      var names = Object.keys(calcEnv).filter(function (k) { return k !== 'ans'; });
      if (names.length) hist.appendChild(el('li', { class: 'ch-vars' }, names.map(function (k) {
        return el('span', { class: 'chip', html: TDC.formula.wrap(C.varMl(k) + '<mo>=</mo>' + C.numberMl(calcEnv[k], dec())) });
      })));
    }
    function run() {
      if (!inp.value.trim()) return;
      try {
        var parsed = C.parse(inp.value), v = C.evaluate(parsed.tree, calcEnv);
        calcEnv.ans = v;
        out.classList.remove('bad');
        out.textContent = '= ' + U.fmtNum(v, 6) + '   (' + U.fmtSI(v, '', 4) + ')';
        calcHist.unshift({ ml: C.toMathML(parsed.tree, dec()), v: v }); calcHist.length = Math.min(calcHist.length, 20); drawHist();
        inp.select();
      } catch (e) { out.classList.add('bad'); out.textContent = calcErr(e); }
      toEnd();
    }
    inp.addEventListener('input', preview);
    inp.addEventListener('input', toEnd);
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); });
    // [inserted text, label]
    var keys = [['7'], ['8'], ['9'], ['/', '÷'], ['('], [')'], ['4'], ['5'], ['6'], ['*', '×'], ['^', 'xʸ'], ['sqrt(', '√'],
      ['1'], ['2'], ['3'], ['-', '−'], ['||', '∥'], ['ans', 'ans'], ['0'], ['.', dec()], ['k', 'k'], ['+'], ['m', 'm'], ['µ', 'µ', 'prefixes']];
    U.append(p, [disp, inp,
      el('div', { class: 'calc-keys' }, keys.map(function (k) {
        return el('button', { class: 'calc-key' + (/^[0-9.]$/.test(k[0]) ? ' num' : ''),
          onclick: function () { inp.value += k[0]; preview(); inp.focus(); } }, k[1] || k[0]);
      }).concat([
        el('button', { class: 'calc-key wide', onclick: function () { inp.value = ''; out.textContent = ''; preview(); inp.focus(); } }, 'C'),
        el('button', { class: 'calc-key wide primary', onclick: run }, '=')
      ])),
      el('p', { class: 'muted small', 'data-i18n': 'tools.calcHelp' }), hist, solver()]);
    drawHist();
    setTimeout(function () { inp.focus(); });
  }

  /** Linear system solver A·x = b (n = 2…4); each cell accepts a calculator expression. */
  function solver() {
    var n = 2, cells = [];
    var grid = el('div', { class: 'solver-grid' });
    var pv = previewBox(), res = el('div', { class: 'calc-out', role: 'status' });
    var size = el('select', { class: 'input solver-size', 'aria-label': TDC.t('tools.solverSize'), onchange: function () { n = +size.value; build(); } },
      [2, 3, 4].map(function (k) { return el('option', { value: k }, k + ' × ' + k); }));
    function cellVal(inp) {
      if (!inp.value.trim()) return { v: 0, ml: '<mn>0</mn>' };
      var t = C.parse(inp.value).tree, ml = C.toMathML(t, dec());
      // A sum or negative coefficient needs brackets: (4+6+2)·x₁, not 4+6+2·x₁
      if (t.t === 'neg' || (t.t === 'bin' && /^[-+|]/.test(t.op))) ml = '<mrow><mo>(</mo>' + ml + '<mo>)</mo></mrow>';
      return { v: C.evaluate(t, calcEnv), ml: ml };
    }
    function read() { return cells.map(function (r) { return r.map(cellVal); }); }
    function show() {
      res.textContent = '';
      try {
        var rows = read().map(function (r) {
          var lhs = r.slice(0, n).map(function (c, j) { return '<mrow>' + c.ml + '<mo>·</mo>' + C.varMl('x' + (j + 1)) + '</mrow>'; }).join('<mo>+</mo>');
          return '<mtr><mtd><mrow>' + lhs + '<mo>=</mo>' + r[n].ml + '</mrow></mtd></mtr>';
        }).join('');
        pv.show('<mrow><mo>{</mo><mtable columnalign="left">' + rows + '</mtable></mrow>');
      } catch (e) { pv.show(null, calcErr(e)); }
    }
    function run() {
      try {
        var M = read(), x = C.solve(M.map(function (r) { return r.slice(0, n).map(function (c) { return c.v; }); }), M.map(function (r) { return r[n].v; }));
        res.classList.toggle('bad', !x);
        if (!x) { res.textContent = TDC.t('tools.solverSingular'); return; }
        res.innerHTML = x.map(function (v, j) { return TDC.formula.wrap(C.varMl('x' + (j + 1)) + '<mo>=</mo>' + C.numberMl(v, dec())); }).join('<span class="sep"></span>');
      } catch (e) { res.classList.add('bad'); res.textContent = calcErr(e); }
    }
    function build() {
      grid.innerHTML = ''; cells = [];
      grid.style.gridTemplateColumns = 'repeat(' + n + ', minmax(0, 1fr)) auto minmax(0, 1fr)';
      for (var i = 0; i < n; i++) {
        var r = [];
        for (var j = 0; j <= n; j++) {
          if (j === n) grid.appendChild(el('span', { class: 'solver-eq', 'aria-hidden': 'true' }, '='));
          var inp = el('input', { class: 'input solver-cell', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false',
            placeholder: j < n ? 'a' + (i + 1) + (j + 1) : 'b' + (i + 1), 'aria-label': j < n ? 'a' + (i + 1) + (j + 1) : 'b' + (i + 1), oninput: show,
            onkeydown: function (e) { if (e.key === 'Enter') run(); } });
          r.push(inp); grid.appendChild(inp);
        }
        cells.push(r);
      }
      show();
    }
    build();
    var box = el('details', { class: 'solver', open: true }, [
      el('summary', {}, [el('span', { 'data-i18n': 'tools.solver' })]),
      el('p', { class: 'muted small', 'data-i18n': 'tools.solverHelp' }),
      el('div', { class: 'solver-top' }, [size, el('button', { class: 'btn btn-primary btn-small', onclick: run, 'data-i18n': 'tools.solve' })]),
      grid, pv, res
    ]);
    return box;
  }

  // ---------- reset progress ----------
  /** Confirm, offer a backup download, then clear one topic's work (or everything). The student id is kept. */
  Tools.confirmReset = function (topicId) {
    var title = topicId ? I.tx(TDC.topics[topicId].title) : '';
    TDC.ui.modal({
      title: TDC.t(topicId ? 'reset.topicTitle' : 'reset.allTitle', { topic: title }),
      body: TDC.t(topicId ? 'reset.topicBody' : 'reset.allBody', { topic: title }),
      actions: [
        { label: TDC.t('common.cancel') },
        { label: TDC.t('reset.backup'), run: function () { S().download(); TDC.ui.toast(TDC.t('notes.downloaded'), 'ok', 5000); return false; } },
        { label: TDC.t('reset.confirm'), danger: true, run: function () {
          if (S().reset(topicId)) { TDC.ui.toast(TDC.t('reset.done'), 'ok'); TDC.ui.closeDrawer(); TDC.router.refresh(); }
        } }
      ]
    });
  };
  function formulaSheet(p) {
    var groups = TDC.FORMULAS || [];
    var q = el('input', { class: 'input', type: 'search', 'data-i18n-ph': 'tools.search', 'aria-label': TDC.t('tools.search') });
    var list = el('div', { class: 'formula-sheet' });
    function draw() {
      var f = q.value.toLowerCase(); list.innerHTML = '';
      groups.forEach(function (g) {
        var items = g.items.filter(function (it) { return !f || (I.tx(it.name) + ' ' + I.tx(it.tex)).replace(/\u00AD/g, '').toLowerCase().indexOf(f) >= 0; });
        if (!items.length) return;
        list.appendChild(el('h4', {}, I.tx(g.title)));
        items.forEach(function (it) {
          list.appendChild(el('div', { class: 'fs-item' }, [el('span', { class: 'fs-name' }, I.tx(it.name)), TDC.formula.el(it.tex)]));
        });
      });
    }
    q.addEventListener('input', draw); p.append(q, list); draw();
  }
  function glossary(p) {
    var q = el('input', { class: 'input', type: 'search', 'data-i18n-ph': 'tools.search', 'aria-label': TDC.t('tools.search') });
    var list = el('dl', { class: 'glossary' });
    function draw() {
      var f = q.value.toLowerCase(); list.innerHTML = '';
      Object.keys(TDC.GLOSSARY || {}).sort(function (a, b) { return TDC.GLOSSARY[a].en.localeCompare(TDC.GLOSSARY[b].en); }).forEach(function (k) {
        var g = TDC.GLOSSARY[k];
        if (f && (g.en + g.fi + (g.def ? I.tx(g.def) : '')).replace(/\u00AD/g, '').toLowerCase().indexOf(f) < 0) return;
        list.append(el('dt', {}, [el('span', { lang: 'en' }, g.en), el('span', { class: 'gl-sep' }, ' · '), el('span', { lang: 'fi' }, g.fi), g.sym ? el('span', { class: 'gl-sym' }, TDC.formula.el(g.sym)) : null]),
          el('dd', {}, g.def ? I.tx(g.def) : ''));
      });
      TDC.render.upgradeRawMath(list);   // "μ_r" in definitions -> real subscript
    }
    q.addEventListener('input', draw); p.append(q, list); draw();
  }
  Tools.termPopover = function (anchor, key) {
    var g = (TDC.GLOSSARY || {})[key];
    if (!g) return;
    var box = el('div', { class: 'term-pop' }, [
      el('strong', {}, g.en + ' · ' + g.fi), g.sym ? el('div', {}, TDC.formula.el(g.sym)) : null, g.def ? el('p', {}, I.tx(g.def)) : null
    ]);
    TDC.render.upgradeRawMath(box);   // "μ_r" in the definition -> real subscript
    TDC.ui.popover(anchor, box);
  };
})(window.TDC);

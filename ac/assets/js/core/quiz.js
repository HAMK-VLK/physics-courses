/* Quiz engine. Question definitions live in content/topicN.js (NO answers there); answers are checked
 * against hashed/encrypted keys via TDC.crypto. Types: mc, multi, numeric, fill, order, match, and
 * widget-backed tasks (slider, circuit, plot) whose value comes from an interactive's getAnswer(). */
(function (TDC) {
  'use strict';
  var U = TDC.util, el = U.el, I = TDC.i18n, R = function () { return TDC.render; };
  var N = TDC.answerNorm;
  var Q = TDC.quiz = { types: {} };
  var TYPE_ICON = { mc: '◉', multi: '☑', numeric: '#', fill: '▭', order: '⇅', match: '⇄', slider: '🎚', circuit: '⚡', plot: '📈' };

  function store() { return TDC.store; }
  function saved(q) { return store().doc.answers[q.id] || null; }
  function seed(q) { return (store().doc.student.id || '') + q.id; }
  function txs(tag, obj, attrs) { return R().txs(tag, obj, attrs); }

  // ---------- input renderers: each returns {node, get():values, set(values), disable()} ----------
  var T = Q.types;
  T.mc = function (q, multi) {
    var name = U.uid('q');
    var opts = q.shuffle === false ? q.options : U.shuffle(q.options, seed(q));
    var inputs = [];
    var node = el('div', { class: 'q-options', role: multi ? 'group' : 'radiogroup' }, opts.map(function (o) {
      var inp = el('input', { type: multi ? 'checkbox' : 'radio', name: name, value: o.id });
      inputs.push(inp);
      return el('label', { class: 'q-option' }, [inp, o.tex ? TDC.formula.el(o.tex) : txs('span', o.html)]);
    }));
    return {
      node: node,
      get: function () {
        var sel = inputs.filter(function (i) { return i.checked; }).map(function (i) { return i.value; });
        return { v: multi ? sel : (sel[0] || null) };
      },
      set: function (v) { var val = v && v.v; inputs.forEach(function (i) { i.checked = multi ? (val || []).indexOf(i.value) >= 0 : i.value === val; }); },
      disable: function () { inputs.forEach(function (i) { i.disabled = true; }); },
      mark: function () {}
    };
  };
  T.multi = function (q) { return T.mc(q, true); };

  function fieldInput(f) {
    var inp = el('input', { type: 'text', inputmode: f.kind === 'text' ? 'text' : 'decimal', autocomplete: 'off', spellcheck: 'false', class: 'q-input', dataset: { field: f.id },
      size: f.size || (f.kind === 'text' ? 12 : 8) });
    return inp;
  }
  T.numeric = function (q) {
    var fields = (q.fields || [{ id: 'v' }]), inputs = {};
    var node = el('div', { class: 'q-fields' }, fields.map(function (f) {
      var inp = fieldInput(f); inputs[f.id] = inp;
      inp.setAttribute('aria-label', f.label ? I.tx(f.label) : (f.tex || TDC.t('quiz.answer')));
      var pv = numPreview(inp, f.unit);
      return el('div', { class: 'q-field-wrap' }, [el('label', { class: 'q-field' }, [
        f.tex ? TDC.formula.el(f.tex + ' =') : f.label ? txs('span', f.label) : null,
        inp, f.unit ? el('span', { class: 'q-unit' }, f.unit) : null
      ]), pv]);
    }));
    node.appendChild(el('p', { class: 'q-hint-small', 'data-i18n': 'quiz.numHelp' }));
    return fieldsApi(node, inputs);
  };
  /** Shows how a typed number is understood (4k7 -> 4.7·10³ Ω, "4,7m" -> 4.7·10⁻³), checked as you type. */
  function numPreview(inp, unit) {
    var box = TDC.tools.previewBox();
    function upd() {
      var raw = inp.value.trim();
      if (!raw) return box.show();
      var v = N.parseNum(raw);
      if (!isFinite(v)) return box.show(null, TDC.t('quiz.notNumber'));
      box.show(TDC.calc.numberMl(v, I.lang === 'fi' ? ',' : '.') + (unit ? '<mspace width="0.25em"/><mi mathvariant="normal">' + U.escapeHtml(unit) + '</mi>' : ''));
    }
    inp.addEventListener('input', upd);
    setTimeout(upd);            // saved answers are filled in after render
    return box;
  }
  function fieldsApi(node, inputs) {
    return {
      node: node,
      get: function () { var o = {}; for (var k in inputs) o[k] = inputs[k].value; return o; },
      set: function (v) { for (var k in inputs) if (v && v[k] != null) inputs[k].value = v[k]; },
      disable: function () { for (var k in inputs) inputs[k].disabled = true; },
      mark: function (res) { for (var k in inputs) { inputs[k].classList.toggle('ok', res && res.fields[k] === true); inputs[k].classList.toggle('bad', res && res.fields[k] === false); } }
    };
  }
  T.fill = function (q) {
    // Text with blanks: "The unit of resistance is [[a]]." Rebuilt on language change (values kept).
    var holder = el('div', { class: 'q-fill' }), inputs = {}, api;
    function build() {
      var vals = api ? api.get() : {};
      holder.innerHTML = '';
      var parts = I.tx(q.text).split(/(\[\[\w+\]\])/);
      inputs = {};
      parts.forEach(function (p) {
        var m = /^\[\[(\w+)\]\]$/.exec(p);
        if (m) {
          var f = (q.fields || []).find(function (x) { return x.id === m[1]; }) || { id: m[1] };
          var inp = fieldInput(f); inp.setAttribute('aria-label', TDC.t('quiz.blank') + ' ' + m[1]);
          inputs[f.id] = inp; holder.appendChild(inp);
          if (f.unit) holder.appendChild(el('span', { class: 'q-unit' }, f.unit));
        } else { var s = el('span', { html: p }); R().post(s); holder.appendChild(s); }
      });
      api && api.set(vals);
      if (api) api._inputs = inputs;
    }
    api = {
      node: holder,
      get: function () { var o = {}; for (var k in inputs) o[k] = inputs[k].value; return o; },
      set: function (v) { for (var k in inputs) if (v && v[k] != null) inputs[k].value = v[k]; },
      disable: function () { for (var k in inputs) inputs[k].disabled = true; holder.dataset.disabled = '1'; },
      mark: function (res) { for (var k in inputs) { inputs[k].classList.toggle('ok', res && res.fields[k] === true); inputs[k].classList.toggle('bad', res && res.fields[k] === false); } }
    };
    build();
    var off = TDC.on('langchange', function () { if (!holder.isConnected) return off(); var dis = holder.dataset.disabled; build(); if (dis) api.disable(); });
    return api;
  };
  T.order = function (q) {
    var list = el('ol', { class: 'q-order' });
    var items = U.shuffle(q.items, seed(q));
    var disabled = false;
    function row(it) {
      var li = el('li', { class: 'q-order-item', dataset: { id: it.id } }, [
        el('span', { class: 'grip', 'aria-hidden': 'true' }, '⠿'), it.tex ? TDC.formula.el(it.tex) : txs('span', it.html),
        el('span', { class: 'q-order-btns' }, [
          el('button', { class: 'icon-btn sm', 'aria-label': TDC.t('quiz.moveUp'), onclick: function () { if (!disabled && li.previousSibling) list.insertBefore(li, li.previousSibling); } }, '▲'),
          el('button', { class: 'icon-btn sm', 'aria-label': TDC.t('quiz.moveDown'), onclick: function () { if (!disabled && li.nextSibling) list.insertBefore(li.nextSibling, li); } }, '▼')
        ])
      ]);
      // Pointer drag (works for mouse + touch; HTML5 DnD does not work on touch screens)
      li.querySelector('.grip').addEventListener('pointerdown', function (e) {
        if (disabled) return;
        e.preventDefault(); li.classList.add('dragging'); li.setPointerCapture(e.pointerId);
        function mv(ev) {
          var sibs = Array.prototype.slice.call(list.children).filter(function (x) { return x !== li; });
          var after = sibs.find(function (s) { var r = s.getBoundingClientRect(); return ev.clientY < r.top + r.height / 2; });
          if (after) list.insertBefore(li, after); else list.appendChild(li);
        }
        function up() { li.classList.remove('dragging'); li.removeEventListener('pointermove', mv); li.removeEventListener('pointerup', up); }
        li.addEventListener('pointermove', mv); li.addEventListener('pointerup', up);
      });
      return li;
    }
    items.forEach(function (it) { list.appendChild(row(it)); });
    return {
      node: list,
      get: function () { return { v: Array.prototype.map.call(list.children, function (li) { return li.dataset.id; }) }; },
      set: function (v) { if (!v || !v.v) return; v.v.forEach(function (id) { var li = list.querySelector('[data-id="' + id + '"]'); if (li) list.appendChild(li); }); },
      disable: function () { disabled = true; list.classList.add('disabled'); },
      mark: function () {}
    };
  };
  T.match = function (q) {
    var selects = {};
    var rights = U.shuffle(q.right, seed(q) + 'r');
    var node = el('div', { class: 'q-match' }, q.left.map(function (l) {
      var sel = el('select', { class: 'input', 'aria-label': I.tx(l.html || l.tex || l.id) }, [el('option', { value: '' }, '—')].concat(rights.map(function (r) {
        var o = el('option', { value: r.id }); I.bind(o, r.html || r.tex, true); return o;
      })));
      selects[l.id] = sel;
      return el('div', { class: 'q-match-row' }, [l.tex ? TDC.formula.el(l.tex) : txs('span', l.html, { class: 'q-match-left' }), el('span', { class: 'q-match-arrow', 'aria-hidden': 'true' }, '→'), sel]);
    }));
    return {
      node: node,
      get: function () { var o = {}; for (var k in selects) o[k] = selects[k].value; return { v: o }; },
      set: function (v) { if (v && v.v) for (var k in selects) selects[k].value = v.v[k] || ''; },
      disable: function () { for (var k in selects) selects[k].disabled = true; },
      mark: function () {}
    };
  };
  // Widget-backed: the interactive provides the value(s) through getAnswer().
  function widgetType(q) {
    var host = el('div', { class: 'widget-host q-widget' });
    var inst = null, pending = null, disabled = false;
    var wctx = R().widgetContext(q.id + '-w', { topic: q.topic });
    R().mountLazy(host, function () {
      var cfg = Object.assign({}, q.widget.config, { task: true });
      inst = TDC.widgets.create(q.widget.name, host, cfg, wctx);
      if (inst && pending && inst.setAnswerState) inst.setAnswerState(pending);
      if (inst && disabled && inst.lock) inst.lock();
      return function () { wctx._destroy(); if (inst && inst.destroy) inst.destroy(); };
    });
    return {
      node: host,
      get: function () {
        var v = inst && inst.getAnswer ? inst.getAnswer() : {};
        if (inst && inst.getAnswerState) v._state = inst.getAnswerState();
        return v;
      },
      set: function (v) { if (!v) return; if (inst && inst.setAnswerState) inst.setAnswerState(v._state); else pending = v._state; },
      disable: function () { disabled = true; if (inst && inst.lock) inst.lock(); },
      mark: function () {}
    };
  }
  T.slider = T.circuit = T.plot = widgetType;

  function valuesForCheck(q, raw) {
    // Map raw input values to field ids expected by answer-norm (single field 'v' unless q.fields).
    var out = {};
    N.fieldsOf(q).forEach(function (f) { out[f.id] = raw[f.id]; });
    return out;
  }
  function isEmpty(q, raw) {
    return N.fieldsOf(q).some(function (f) {
      var v = raw[f.id];
      return v == null || v === '' || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).some(function (k) { return !v[k]; }));
    });
  }

  // ---------- question card ----------
  Q.renderQuestion = function (q, opts) {
    if (!q) return el('div', { class: 'blk-error' }, 'Question not found');
    opts = opts || {};
    var input = (T[q.type] || T.numeric)(q);
    var fb = el('div', { class: 'q-feedback', role: 'status', 'aria-live': 'polite' });
    var explain = el('div', { class: 'q-explain', hidden: true });
    var hintBox = el('div', { class: 'q-hints' });
    var hintIdx = 0;
    var card = el('div', { class: 'q-card q-practice', id: 'q-' + q.id, dataset: { qid: q.id } });
    var head = el('div', { class: 'q-head' }, [
      el('span', { class: 'q-type', 'data-i18n-title': 'quiz.type.' + q.type, title: TDC.t('quiz.type.' + q.type), 'aria-hidden': 'true' }, TYPE_ICON[q.type] || '?'),
      el('span', { class: 'q-badge', 'data-i18n': 'quiz.practice' }),
      el('span', { class: 'q-points' }),
      el('span', { class: 'q-status' })
    ]);
    var prompt = txs('div', q.prompt, { class: 'q-prompt' });
    var figure = q.figure ? R().renderBlock(Object.assign({ type: 'figure' }, q.figure), {}, q.id + '-fig') : null;

    var checkBtn = el('button', { class: 'btn btn-primary btn-small', 'data-i18n': 'quiz.check', onclick: onCheck });
    var hintBtn = q.hints && q.hints.length ? el('button', { class: 'btn btn-ghost btn-small', 'data-i18n': 'quiz.hint', onclick: addHint }) : null;
    function addHint() {   // shared by the Hint button and difficulty-3 auto hints, so the index stays consistent
      if (!q.hints || hintIdx >= q.hints.length) return;
      hintBox.appendChild(txs('p', q.hints[hintIdx++], { class: 'q-hint' }));
      if (hintIdx >= q.hints.length && hintBtn) hintBtn.disabled = true;
    }
    var resetBtn = el('button', { class: 'btn btn-ghost btn-small', 'data-i18n': 'quiz.tryAgain', hidden: true, onclick: function () {
      card.classList.remove('is-correct', 'is-wrong'); setFb('', null); input.mark(null); resetBtn.hidden = true;
      var r = saved(q); setStatus(r && r.correct ? 'ok' : '');
    } });
    var actions = el('div', { class: 'q-actions' }, [checkBtn, hintBtn, resetBtn]);
    [head, prompt, figure, el('div', { class: 'q-input-area' }, input.node), actions, hintBox, fb, explain].forEach(function (n) { if (n) card.appendChild(n); });

    function setStatus(kind) {
      var s = head.querySelector('.q-status');
      s.className = 'q-status ' + (kind || '');
      s.textContent = kind === 'ok' ? '✓' : kind === 'bad' ? '✗' : kind === 'saved' ? '●' : '';
    }
    // The feedback line is kept as a key (+ index of the random praise) so it re-translates on langchange.
    var fbKey = null;
    function setFb(cls, key, idx) {
      fbKey = key ? { k: key, i: idx } : null; fb.className = 'q-feedback ' + cls;
      fb.textContent = key ? (idx != null ? TDC.t(key).split('|')[idx] : TDC.t(key)) : '';
    }
    function showExplain(obj) {
      if (!obj) return;
      explain.hidden = false; explain.innerHTML = '';
      explain.append(el('strong', { 'data-i18n': 'quiz.explanation' }), txs('div', obj));
      I.applyStatic(explain);
    }
    var running = false, timer = null, wasConnected = false;
    function updateScore() {
      var a = saved(q);   // score always 1 decimal (0.8 / 1.0), points a plain number (1, 1.5)
      head.querySelector('.q-points').textContent = TDC.t('quiz.scoreOf', { s: U.locNum((a && a.score) || 0, 1), p: U.locNum(TDC.scoring.points(q)) });
    }
    function busy(b) { if (b) checkBtn.setAttribute('aria-disabled', 'true'); else checkBtn.removeAttribute('aria-disabled'); }
    // Countdown after a wrong check: derived from the saved waitUntil, so a reload keeps it (remainingWait clamps to 10 s).
    function tick() {
      if (card.isConnected) wasConnected = true;
      else if (wasConnected) { clearInterval(timer); timer = null; return; }
      var a = saved(q), n = a ? TDC.scoring.remainingWait(a.waitUntil, Date.now()) : 0;
      if (!running) busy(n > 0);
      if (n > 0) { checkBtn.removeAttribute('data-i18n'); checkBtn.textContent = TDC.t('quiz.waitN', { n: n }); if (!timer) timer = setInterval(tick, 1000); }
      else { checkBtn.setAttribute('data-i18n', 'quiz.check'); checkBtn.textContent = TDC.t('quiz.check'); clearInterval(timer); timer = null; }
    }
    var offLang = TDC.on('langchange', function () {
      if (!card.isConnected) { if (wasConnected) offLang(); return; }
      tick(); updateScore();
      if (fbKey) fb.textContent = fbKey.i != null ? TDC.t(fbKey.k).split('|')[fbKey.i] : TDC.t(fbKey.k);
    });
    function onCheck() {
      if (running || checkBtn.getAttribute('aria-disabled') === 'true') return;
      var raw = input.get();
      if (isEmpty(q, raw)) { setFb('warn', 'quiz.empty'); return; }
      var prev = saved(q) || { attempts: 0 };
      running = true; busy(true);
      TDC.crypto.checkPractice(q, valuesForCheck(q, raw)).then(function (res) {
        var v = TDC.scoring.award(q, res, prev.wrong, raw).verdict, ok = v === 'correct';
        input.mark(res);
        card.classList.toggle('is-correct', ok); card.classList.toggle('is-wrong', !ok);
        setStatus(ok || prev.correct ? 'ok' : 'bad');   // an already-correct question keeps its check mark
        if (ok) setFb('ok', 'quiz.correctMsgs', Math.floor(Math.random() * TDC.t('quiz.correctMsgs').split('|').length));
        else setFb(v === 'partial' ? 'warn' : 'bad', v === 'partial' ? 'quiz.partial' : 'quiz.notice.' + q.type);
        resetBtn.hidden = ok;
        if (ok) { showExplain(res.explain); celebrate(card); }
        else if (!prev.correct && q.difficulty === 3) addHint();
        // An already-correct question only gives feedback: no wait, no wrong count, score unchanged.
        if (!prev.correct) store().update(function (d) { d.answers[q.id] = TDC.scoring.record(prev, res, raw, q, Date.now()); }, { source: 'quiz' });
        updateScore();
        TDC.emit('quiz:answered', { qid: q.id, correct: ok });
      }).catch(function (e) {
        setFb('warn', e.message === 'no-key' ? 'quiz.noKey' : 'quiz.cryptoMissing');
      }).then(function () { running = false; tick(); });
    }
    // Restore previous answer
    var prev = saved(q);
    if (prev) {
      input.set(prev.values);
      if (prev.correct) { setStatus('ok'); card.classList.add('was-correct'); showExplain(prev.explain); }
    }
    updateScore(); tick();
    I.applyStatic(card);
    return card;
  };

  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function celebrate(card) {
    if (U.reducedMotion()) return;
    var box = el('div', { class: 'confetti', 'aria-hidden': 'true' });
    for (var i = 0; i < 18; i++) box.appendChild(el('i', { style: { '--x': (Math.random() * 2 - 1).toFixed(2), '--d': (Math.random() * 0.4).toFixed(2) + 's', '--h': Math.floor(Math.random() * 360) } }));
    card.appendChild(box); setTimeout(function () { box.remove(); }, 1400);
  }

  // ---------- topic test section: the former graded questions, every one self-checked ----------
  Q.renderTopicTest = function (topic, questions) {
    var wrap = el('div', { class: 'topic-test' });
    wrap.appendChild(el('div', { class: 'blk-callout callout-key' }, [el('span', { class: 'callout-icon' }, '🎓'), el('div', {}, [
      el('strong', { 'data-i18n': 'quiz.topicTest' }), el('p', { 'data-i18n': 'quiz.topicTestIntro' })
    ])]));
    questions.forEach(function (q, i) {
      var c = Q.renderQuestion(q);
      c.querySelector('.q-head').insertBefore(el('span', { class: 'q-index' }, (i + 1) + '/' + questions.length), c.querySelector('.q-head').firstChild);
      wrap.appendChild(c);
    });
    I.applyStatic(wrap);
    return wrap;
  };
})(window.TDC);

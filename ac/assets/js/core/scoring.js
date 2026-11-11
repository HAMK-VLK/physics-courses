/* Scoring rules (TDC.scoring): retry factor, partial credit, wait times, schema-2 migration.
 * Pure functions, no DOM; also require()d by tools/test-scoring.mjs. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.TDC = root.TDC || {}; root.TDC.scoring = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var r2 = function (x) { return Math.round(x * 100) / 100; };
  var vals = function (o) { return Object.keys(o || {}).map(function (k) { return o[k]; }); };

  function points(q) { return q.points || 1; }

  /** res = checkPractice result; values only needed for multi (selected ids). */
  function award(q, res, wrongBefore, values) {
    var P = points(q), f = Math.max(0, 1 - 0.25 * (wrongBefore || 0));
    if (res.correct === true) return { score: r2(P * f), verdict: 'correct' }; // never derive from parts
    var wrong = { score: 0, verdict: 'wrong' }, part = function (k) { return { score: r2(Math.max(0, k)), verdict: 'partial' }; };
    var parts = res.parts || {};
    if (q.type === 'multi' && q.options) {
      var sel = (values && values.v) || [], wrongSel = 0, missing = 0;
      q.options.forEach(function (o) {
        if (parts[o.id] === false) { if (sel.indexOf(o.id) >= 0) wrongSel++; else missing++; }
      });
      return !missing && wrongSel ? part(P * f - wrongSel * P / q.options.length) : wrong;
    }
    var flags = null;
    if (q.type === 'match') flags = vals(parts);
    else if ((q.type === 'fill' || q.type === 'numeric') && q.fields && q.fields.length >= 2) flags = vals(res.fields);
    if (!flags || !flags.length) return wrong;
    var k = flags.filter(Boolean).length;
    return k > 0 && k < flags.length ? part(P * f * k / flags.length) : wrong;
  }

  function waitSeconds(n) { return n >= 2 ? 10 : n === 1 ? 5 : 0; }

  function remainingWait(untilIso, nowMs) {
    if (!untilIso) return 0;
    var s = Math.ceil((Date.parse(untilIso) - nowMs) / 1000);
    return Math.min(10, Math.max(0, s || 0));
  }

  function record(prev, res, values, q, nowMs) {
    prev = prev || {};
    var wrongBefore = prev.wrong || 0, a = award(q, res, wrongBefore, values), ok = a.verdict === 'correct', wrong = wrongBefore + (ok ? 0 : 1);
    return { values: values, attempts: (prev.attempts || 0) + 1, wrong: wrong, score: Math.max(prev.score || 0, a.score),
      correct: ok || !!prev.correct, explain: res.explain != null ? res.explain : prev.explain, ts: nowMs,
      waitUntil: ok ? null : new Date(nowMs + waitSeconds(wrong) * 1000).toISOString() };
  }

  function topicScore(topic, answers) {
    var score = 0, max = 0;
    (topic.questions || []).forEach(function (q) { max += points(q); score += ((answers || {})[q.id] || {}).score || 0; });
    return { score: r2(score), max: r2(max) };
  }

  /** schema 1 -> 2: drop teacher/personal fields, give old answers scores. Idempotent. */
  function migrateDoc(doc, questionsById) {
    doc = doc || {};
    if (doc.schemaVersion >= 2) return doc;
    delete doc.submitted; delete doc.feedback;
    if (doc.student) { delete doc.student.name; delete doc.student.studentNo; }
    var ans = doc.answers || {};
    Object.keys(ans).forEach(function (id) {
      var a = ans[id], q = (questionsById || {})[id] || {};
      if (!a) return;
      if (a.correct === true && a.score == null) { a.score = points(q); a.wrong = 0; }
      else if (q.mode === 'graded' && !a.correct) { a.score = 0; a.wrong = 0; a.attempts = 0; }
    });
    doc.schemaVersion = 2;
    return doc;
  }

  return { points: points, award: award, waitSeconds: waitSeconds, remainingWait: remainingWait,
    record: record, topicScore: topicScore, migrateDoc: migrateDoc };
});

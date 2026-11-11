/* Answer checking against generated keys (assets/data/keys.js -> window.TDC_KEYS).
 * Practice: PBKDF2-SHA-256 hashes of canonical answers; explanation AES-GCM-encrypted with a key
 * derived from the correct answer. Every question (including the topic test) is checked this way.
 * See ../.claude/rules/40-answer-security.md (shared course standard). Must mirror tools/build-keys.mjs exactly. */
(function (TDC) {
  'use strict';
  var N = TDC.answerNorm;
  var enc = new TextEncoder(), dec = new TextDecoder();
  var subtle = window.crypto && window.crypto.subtle;
  var hashCache = new Map();

  function b64(bytes) {
    var s = ''; bytes = new Uint8Array(bytes);
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
  function unb64(str) {
    var s = atob(str), out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }
  function pbkdf2(pass, salt, iter, bits) {
    var ck = pass + '|' + salt + '|' + iter;
    if (hashCache.has(ck)) return Promise.resolve(hashCache.get(ck));
    return subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits']).then(function (k) {
      return subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: iter }, k, bits || 256);
    }).then(function (b) { var u = new Uint8Array(b); hashCache.set(ck, u); return u; });
  }
  function aesDecrypt(rawKey, ivB64, ctB64) {
    return subtle.importKey('raw', rawKey, 'AES-GCM', false, ['decrypt']).then(function (k) {
      return subtle.decrypt({ name: 'AES-GCM', iv: unb64(ivB64) }, k, unb64(ctB64));
    }).then(function (buf) { return dec.decode(buf); });
  }

  function keys() { return window.TDC_KEYS || null; }

  var C = TDC.crypto = {
    available: !!subtle,
    hasKeys: function () { return !!keys(); },
    isPractice: function (qid) { var k = keys(); return !!(k && k.practice && k.practice[qid]); },

    /** Check a practice answer. values: {fieldId: rawValue}. Resolves
     *  {correct, fields:{fid:bool}, parts:{partId:bool}|null, explain:{en,fi}|null}.
     *  parts (multi: per option, match: per left id) is set only for those types. */
    checkPractice: function (q, values) {
      var K = keys(), entry = K && K.practice && K.practice[q.id];
      if (!subtle) return Promise.reject(new Error('crypto-unavailable'));
      if (!entry) return Promise.reject(new Error('no-key'));
      var fields = N.fieldsOf(q), result = { correct: true, fields: {}, parts: null, explain: null };
      var firstMatch = null;
      return fields.reduce(function (p, f, fi) {
        return p.then(function () {
          var cands = N.candidates(f, values[f.id]), hashes = entry.f[f.id] || [];
          result.fields[f.id] = false;
          return cands.reduce(function (pp, c) {
            return pp.then(function (done) {
              if (done) return true;
              return pbkdf2(c, entry.s + ':' + f.id, entry.it, 256).then(function (h) {
                var idx = hashes.indexOf(b64(h));
                if (idx >= 0) { result.fields[f.id] = true; if (fi === 0) firstMatch = { c: c, idx: idx }; return true; }
                return false;
              });
            });
          }, Promise.resolve(false)).then(function (ok) { if (!ok) result.correct = false; });
        });
      }, Promise.resolve()).then(function () {
        var P = entry.p, v = values.v;
        if (!P || (q.type !== 'multi' && q.type !== 'match')) return;
        var ids = q.type === 'multi' ? q.options : q.left;
        result.parts = {};
        return Promise.all(ids.map(function (it) {
          var str = q.type === 'multi' ? 'o:' + it.id + '=' + ((v || []).indexOf(it.id) >= 0 ? 1 : 0)
            : 'p:' + it.id + '=' + (v ? v[it.id] : undefined);
          return pbkdf2(str, P.s + ':p', entry.it, 256).then(function (h) { result.parts[it.id] = b64(h) === P.h[it.id]; });
        }));
      }).then(function () {
        if (!result.correct || !firstMatch || !entry.x || !entry.x[firstMatch.idx]) return result;
        var x = entry.x[firstMatch.idx];
        return pbkdf2(firstMatch.c, entry.s + ':x', entry.it, 256)
          .then(function (k) { return aesDecrypt(k, x.iv, x.ct); })
          .then(function (txt) { result.explain = JSON.parse(txt); return result; })
          .catch(function () { return result; });
      });
    },

    _b64: b64
  };
})(window.TDC);

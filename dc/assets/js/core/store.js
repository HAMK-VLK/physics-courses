/* Student notes document: autosave to localStorage, optional direct file autosave (File System Access
 * API, Chrome/Edge), and download/import fallback (all browsers). The notes file is student-notes.js
 * containing `TDC_NOTES_FILE = {...};`, parsed with JSON.parse (never evaluated). */
(function (TDC) {
  'use strict';
  var U = TDC.util;
  var LS_KEY = 'tdc.notes.v1';
  var APP = 'TDC-ResponsiveMaterials';
  var FS_KEY = LS_KEY.replace('.notes.v1', '.fileSaved');   // doc.updated of the last copy written to a file
  var SCHEMA = 2;
  var FILE_NAME = 'student-notes.js';
  var PREFIX = 'TDC_NOTES_FILE = ';

  function blankDoc(student) {
    var now = new Date().toISOString();
    return {
      app: APP, schemaVersion: SCHEMA,
      student: student || { id: U.uid('s'), created: now },
      created: now, updated: now,
      progress: {},        // topicId -> {visited: {sectionId: ts}, last: sectionId}
      annotations: {},     // sectionId -> {strokes:[], stickies:[], highlights:[]}
      sectionNotes: {},    // sectionId -> text
      bookmarks: [],       // sectionIds
      answers: {},         // qid -> {values, attempts, wrong, score, correct, explain, ts, waitUntil} (TDC.scoring.record)
      widgets: {}          // widget id -> saved state (e.g. a circuit the student built)
    };
  }
  function questionsById() {
    var m = {};
    Object.keys(TDC.topics || {}).forEach(function (t) { (TDC.topics[t].questions || []).forEach(function (q) { m[q.id] = q; }); });
    return m;
  }
  function migrate(d) {
    if (!d || d.app !== APP) return null;
    d = TDC.scoring.migrateDoc(d, questionsById());   // schema 1 -> 2 (also for imported files)
    var b = blankDoc(d.student);
    for (var k in b) if (d[k] == null) d[k] = b[k];
    d.schemaVersion = SCHEMA;
    return d;
  }
  function serialize(d) { return PREFIX + JSON.stringify(d, null, 1) + ';\n'; }
  function rawParse(txt) {
    var s = String(txt).trim();
    if (s.indexOf(PREFIX.trim()) === 0) s = s.slice(s.indexOf('=') + 1);
    s = s.replace(/;\s*$/, '');
    return JSON.parse(s);   // JSON.parse only, never eval
  }
  function parseFileText(txt) { return migrate(rawParse(txt)); }
  function hasContent(d) {
    return ['progress', 'annotations', 'sectionNotes', 'answers', 'widgets'].some(function (k) { return Object.keys(d[k] || {}).length; }) || (d.bookmarks || []).length > 0;
  }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  // Tiny digest for the course landing page (read without loading the notes), visible topics only.
  function summary() {
    var R = TDC.render, c = R.courseScore(), visited = 0, sections = 0;
    TDC.topicList.forEach(function (m) {
      var t = TDC.topics[m.id]; if (!t) return;
      var p = (S.doc.progress[m.id] || {}).visited || {};
      sections += t.sections.length; visited += t.sections.filter(function (s) { return p[s.id]; }).length;
    });
    return { v: 1, visited: visited, sections: sections, score: c.score, max: c.max, updated: new Date().toISOString() };
  }
  function readLocal() { try { return migrate(JSON.parse(localStorage.getItem(LS_KEY))); } catch (e) { return null; } }

  // ---------- IndexedDB (remember the linked file handle) ----------
  function idb(mode, fn) {
    return new Promise(function (res, rej) {
      if (!window.indexedDB) return rej(new Error('no idb'));
      var r = indexedDB.open('tdc', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('kv'); };
      r.onerror = function () { rej(r.error); };
      r.onsuccess = function () {
        var tx = r.result.transaction('kv', mode), st = tx.objectStore('kv'), q = fn(st);
        tx.oncomplete = function () { res(q && q.result); };
        tx.onerror = function () { rej(tx.error); };
      };
    });
  }

  var S = TDC.store = {
    doc: null,
    mode: 'own',             // always 'own'; kept because widgets and status read it
    fileHandle: null,
    fileState: 'none',       // none | linked | needs-permission | unsupported
    lastSaved: null,
    fileSavedAt: null,       // ISO doc.updated of the last file copy (download or linked autosave)
    fsSupported: typeof window.showSaveFilePicker === 'function',
    readOnly: function () { return false; },   // kept for widgets that still ask

    /** Load the viewer's own document. Returns a Promise. */
    init: function () {
      S.doc = readLocal() || blankDoc();
      S.fileSavedAt = lsGet(FS_KEY);
      S._persistLocal();
      return S._restoreHandle();
    },

    /** Mutate the document through fn(doc). */
    update: function (fn, opts) {
      fn(S.doc);
      S.doc.updated = new Date().toISOString();
      S._scheduleSave();
      TDC.emit('notes:change', opts || {});
      return true;
    },
    section: function (sectionId, create) {
      var a = S.doc.annotations[sectionId];
      if (!a && create !== false) a = S.doc.annotations[sectionId] = { strokes: [], stickies: [], highlights: [] };
      return a || { strokes: [], stickies: [], highlights: [] };
    },
    /** Clear one topic's work (ids start with "<topicId>-"), or everything when topicId is omitted.
     *  The student id is kept. */
    reset: function (topicId) {
      return S.update(function (d) {
        if (!topicId) {
          var b = blankDoc(d.student);
          for (var k in b) if (k !== 'student' && k !== 'created') d[k] = b[k];
          delete d.lastLocation;
          return;
        }
        var pre = topicId + '-';
        ['annotations', 'sectionNotes', 'widgets', 'answers'].forEach(function (k) {
          Object.keys(d[k]).forEach(function (id) { if (id.indexOf(pre) === 0) delete d[k][id]; });
        });
        d.bookmarks = d.bookmarks.filter(function (id) { return id.indexOf(pre) !== 0; });
        delete d.progress[topicId];
        if (d.lastLocation && d.lastLocation.topic === topicId) delete d.lastLocation;
      }, { source: 'reset' });
    },

    // ---------- saving ----------
    _persistLocal: function () {
      try { localStorage.setItem(LS_KEY, JSON.stringify(S.doc)); S.lastSaved = new Date(); }
      catch (e) { TDC.ui && TDC.ui.toast(TDC.t('notes.saveFailed')); }
      try { localStorage.setItem(LS_KEY.replace('.notes.v1', '.summary'), JSON.stringify(summary())); } catch (e) { /* private mode / quota: the landing page just shows no progress */ }
      TDC.emit('savestatus', S.status());
    },
    _scheduleSave: U.debounce(function () { S.saveNow(); }, 800),
    saveNow: function () {
      S._persistLocal();
      if (S.fileHandle && S.fileState === 'linked') return S._writeFile().catch(function () {});
      return Promise.resolve();
    },
    /** True when this browser holds work that no saved file has. A fresh browser with no work is not "unsaved". */
    unsaved: function () {
      return !!S.doc && hasContent(S.doc) && (!S.fileSavedAt || S.doc.updated > S.fileSavedAt);
    },
    _markFileSaved: function (updated) {
      S.fileSavedAt = updated;
      try { localStorage.setItem(FS_KEY, updated); } catch (e) { /* private mode: the mark just resets on reload */ }
    },
    status: function () { return { mode: S.mode, file: S.fileState, saved: S.lastSaved, fs: S.fsSupported, unsaved: S.unsaved() }; },

    // ---------- direct file autosave (Chrome/Edge) ----------
    linkFile: function () {
      if (!S.fsSupported) return Promise.reject(new Error('unsupported'));
      return window.showSaveFilePicker({
        suggestedName: FILE_NAME, id: 'tdc-notes',
        types: [{ description: 'Notes file', accept: { 'text/javascript': ['.js'] } }]
      }).then(function (h) {
        S.fileHandle = h; S.fileState = 'linked';
        idb('readwrite', function (st) { return st.put(h, 'notesHandle'); }).catch(function () {});
        return S._writeFile();
      });
    },
    reconnect: function () {
      if (!S.fileHandle) return Promise.resolve(false);
      return S.fileHandle.requestPermission({ mode: 'readwrite' }).then(function (p) {
        S.fileState = p === 'granted' ? 'linked' : 'needs-permission';
        TDC.emit('savestatus', S.status());
        if (p === 'granted') return S._writeFile().then(function () { return true; });
        return false;
      });
    },
    unlink: function () {
      S.fileHandle = null; S.fileState = 'none';
      idb('readwrite', function (st) { return st.delete('notesHandle'); }).catch(function () {});
      TDC.emit('savestatus', S.status());
    },
    _restoreHandle: function () {
      if (!S.fsSupported) { S.fileState = 'unsupported'; return Promise.resolve(); }
      return idb('readonly', function (st) { return st.get('notesHandle'); }).then(function (h) {
        if (!h) return;
        S.fileHandle = h;
        return h.queryPermission({ mode: 'readwrite' }).then(function (p) {
          S.fileState = p === 'granted' ? 'linked' : 'needs-permission';
        });
      }).catch(function () {}).then(function () { TDC.emit('savestatus', S.status()); });
    },
    _writeFile: function () {
      var at = S.doc.updated;
      return S.fileHandle.createWritable().then(function (w) {
        return w.write(serialize(S.doc)).then(function () { return w.close(); });
      }).then(function () { S.lastSaved = new Date(); S._markFileSaved(at); TDC.emit('savestatus', S.status()); })
        .catch(function (e) { S.fileState = 'needs-permission'; TDC.emit('savestatus', S.status()); throw e; });
    },

    // ---------- download / import (all browsers) ----------
    download: function (doc) {
      var blob = new Blob([serialize(doc || S.doc)], { type: 'text/javascript' });
      var a = U.el('a', { href: URL.createObjectURL(blob), download: FILE_NAME });
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      if (!doc || doc === S.doc) { S._markFileSaved(S.doc.updated); TDC.emit('savestatus', S.status()); }
    },
    /** Read a notes file chosen by the user and restore it as the student's own document. */
    importFile: function (file) {
      return file.text().then(function (txt) {
        var raw;
        try { raw = rawParse(txt); } catch (e) { throw new Error('invalid'); }
        if (raw && raw.app && raw.app !== APP) throw new Error('other-course');
        var d = migrate(raw);
        if (!d) throw new Error('invalid');
        S.doc = d; S._markFileSaved(d.updated); S._persistLocal(); TDC.emit('notes:loaded', {});
        return 'restored';
      });
    },
    _parse: parseFileText, _raw: rawParse, _serialize: serialize, FILE_NAME: FILE_NAME
  };

  // Warn before leaving with work that only exists in this browser.
  window.addEventListener('beforeunload', function (e) { if (S.unsaved()) { e.preventDefault(); e.returnValue = ''; } });

  // Last-chance save when the tab closes.
  window.addEventListener('pagehide', function () { if (S.doc) S._persistLocal(); });
})(window.TDC);

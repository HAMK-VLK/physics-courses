/* Landing page: EN/FI + theme (phys.prefs), progress cards from tdc.summary / tac.summary / fht.summary. Classic script, no network. */
(function () {
  'use strict';
  var T = {
    en: {
      brand: 'Häme University of Applied Sciences',
      eyebrow: 'HAMK · Self-study materials', title: 'Physics and electrical engineering courses',
      intro: 'Interactive, bilingual self-study courses with live diagrams and simulations and instantly checked exercises. Your work stays in your own browser.',
      'dc.title': 'Theoretical Electrical Engineering DC',
      'dc.lead': 'Learn DC circuits by doing: change values, draw wires, watch the current flow, take notes right on the page and test yourself.',
      'ac.title': 'Theoretical Electrical Engineering AC',
      'ac.lead': 'Learn AC circuits by doing: change values, turn the phasors, watch voltage and current shift in phase, take notes right on the page and test yourself.',
      'thermo.title': 'Fluids, Heat and Thermodynamics',
      'thermo.lead': 'Learn the physics of fluids and heat by doing: dive a submarine, squeeze a gas, narrow a pipe, cool a heat sink, take notes right on the page and test yourself.',
      topics: '{n} topics', notStarted: 'Not started', open: 'Open', cont: 'Continue',
      progress: '{v} of {s} sections visited · {p} / {m} points',
      footer: 'Course material CC BY 4.0 · code MIT · provided as is. No accounts, no tracking: progress is saved only in your browser.',
      lang: 'Language', theme: 'Light or dark theme', go: 'Open course: {t}', goc: 'Continue course: {t}'
    },
    fi: {
      brand: 'Hämeen ammattikorkeakoulu',
      eyebrow: 'HAMK · Itseopiskelumateriaali', title: 'Fysiikan ja sähkötekniikan kurssit',
      intro: 'Interaktiiviset, kaksikieliset itseopiskelukurssit: eläviä kaavioita ja simulaatioita sekä heti tarkistettavia tehtäviä. Työsi pysyy omassa selaimessasi.',
      'dc.title': 'Sähkötekniikan teoria: tasavirtapiirit',
      'dc.lead': 'Opi tasavirtapiirit tekemällä: muuta arvoja, piirrä johtimia, katso virran kulkua, tee muistiinpanoja suoraan sivulle ja testaa osaamisesi.',
      'ac.title': 'Sähkötekniikan teoria: vaihtovirtapiirit',
      'ac.lead': 'Opi vaihtovirtapiirit tekemällä: muuta arvoja, pyöritä osoittimia, katso jännitteen ja virran vaihe-eroa, tee muistiinpanoja suoraan sivulle ja testaa osaamisesi.',
      'thermo.title': 'Fluidit, lämpö ja termodynamiikka',
      'thermo.lead': 'Opi fluidien ja lämmön fysiikkaa tekemällä: sukella sukellusveneellä, purista kaasua, kavenna putkea, jäähdytä jäähdytyslevyä, tee muistiinpanoja suoraan sivulle ja testaa osaamisesi.',
      topics: '{n} aihetta', notStarted: 'Ei aloitettu', open: 'Avaa', cont: 'Jatka',
      progress: '{v} / {s} osiota käyty · {p} / {m} pistettä',
      footer: 'Kurssimateriaali CC BY 4.0 · koodi MIT · sellaisenaan. Ei tilejä eikä seurantaa: edistyminen tallentuu vain selaimeesi.',
      lang: 'Kieli', theme: 'Vaalea tai tumma teema', go: 'Avaa kurssi: {t}', goc: 'Jatka kurssia: {t}'
    }
  };
  var root = document.documentElement, prefs = {};
  try { prefs = JSON.parse(localStorage.getItem('phys.prefs')) || {}; } catch (e) {}
  var lang = prefs.lang === 'fi' || prefs.lang === 'en' ? prefs.lang : ((navigator.language || 'en').slice(0, 2) === 'fi' ? 'fi' : 'en');

  function save(k, v) { prefs[k] = v; try { localStorage.setItem('phys.prefs', JSON.stringify(prefs)); } catch (e) {} }
  function t(k, v) { return (T[lang][k] || '').replace(/\{(\w+)\}/g, function (m, x) { return v && v[x] != null ? v[x] : m; }); }
  function num(n) { return n.toLocaleString(lang === 'fi' ? 'fi-FI' : 'en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
  function plain(n) { return n.toLocaleString(lang === 'fi' ? 'fi-FI' : 'en-GB'); }   // max points: no forced decimals
  function summary(key) {
    try {
      var s = JSON.parse(localStorage.getItem(key));
      if (s && s.v === 1 && isFinite(s.visited) && s.sections > 0 && isFinite(s.score) && isFinite(s.max) && (s.visited > 0 || s.score > 0)) return s;   // a zero digest counts as not started
    } catch (e) {}
    return null;
  }

  function render() {
    root.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(function (n) {
      var c = n.closest('.card');
      n.textContent = t(n.dataset.i18n, { n: c ? c.dataset.topics : '' });
    });
    document.querySelectorAll('#btn-lang span').forEach(function (s) { s.classList.toggle('on', s.textContent.toLowerCase() === lang); });
    var bl = document.getElementById('btn-lang'), bt = document.getElementById('btn-theme');
    var ln = t('lang') + ': ' + (lang === 'fi' ? 'suomi' : 'English');
    bl.title = ln; bl.setAttribute('aria-label', 'EN FI – ' + ln);   // accessible name contains the visible text (WCAG 2.5.3)
    bt.title = t('theme'); bt.setAttribute('aria-label', t('theme'));
    document.title = t('title') + ' · HAMK';
    document.querySelectorAll('.card').forEach(function (c) {
      var s = summary(c.dataset.key), btn = c.querySelector('.btn'), title = c.querySelector('h2').textContent;
      var pct = s ? Math.round(100 * Math.min(s.visited, s.sections) / s.sections) : 0;
      c.querySelector('.progress > span').style.width = pct + '%';
      var bar = c.querySelector('.progress');
      bar.setAttribute('aria-valuenow', pct); bar.setAttribute('aria-label', title);
      c.querySelector('.stat').textContent = s ? t('progress', { v: s.visited, s: s.sections, p: num(s.score), m: plain(s.max) }) : t('notStarted');
      btn.textContent = t(s ? 'cont' : 'open');
      btn.setAttribute('aria-label', t(s ? 'goc' : 'go', { t: title }));
    });
  }

  document.getElementById('btn-lang').addEventListener('click', function () { lang = lang === 'en' ? 'fi' : 'en'; save('lang', lang); render(); });
  document.getElementById('btn-theme').addEventListener('click', function () {
    var n = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', n); save('theme', n);
  });
  // AC art: three phase waves 120° apart (period 37, amplitude 13), one extra period on the left to scroll in.
  document.querySelectorAll('.card-ac .phase').forEach(function (p, k) {
    var d = '';
    for (var x = 5; x <= 118; x += 1.5) d += (d ? 'L' : 'M') + x + ' ' + (32 - 13 * Math.sin(2 * Math.PI * (x - 42) / 37 - k * 2 * Math.PI / 3)).toFixed(1);
    p.setAttribute('d', d);
  });
  // Click anywhere on a card: play its art effect for 2 s, then open the course. New-tab clicks keep the browser default.
  document.querySelectorAll('.card').forEach(function (c) {
    c.addEventListener('click', function (e) {
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      if (c.classList.contains('go')) return;
      c.classList.add('go');
      setTimeout(function () { location.href = c.querySelector('.btn').href; }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 2000);
    });
  });
  window.addEventListener('pageshow', function () {   // back from a course: bulb off, refresh progress
    document.querySelectorAll('.card.go').forEach(function (c) { c.classList.remove('go'); });
    render();
  });
  render();
})();

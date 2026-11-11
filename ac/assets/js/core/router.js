/* Hash router (works on file://): #/ · #/topic/<id>[/<sectionId>] */
(function (TDC) {
  'use strict';
  var el = TDC.util.el, I = TDC.i18n;
  var current = { name: null, topic: null };

  function parse() {
    var h = (location.hash || '#/').replace(/^#\/?/, '').split('/');
    if (h[0] === 'topic' && h[1]) return { name: 'topic', topic: h[1], section: h[2] || null };
    return { name: 'home' };
  }
  function crumbs(r) {
    var c = document.getElementById('crumbs'); c.innerHTML = '';
    c.appendChild(el('a', { href: '#/', 'data-i18n': 'nav.home' }));
    if (r.name === 'topic' && TDC.topics[r.topic]) {
      var t = TDC.topics[r.topic];
      c.append(el('span', { class: 'sep', 'aria-hidden': 'true' }, '›'), el('span', { class: 'crumb-current' }, [t.num + '. ', TDC.render.tx(t.title, true)]));
    }
    I.applyStatic(c);
  }
  function render(keepScroll) {
    var r = parse(), main = document.getElementById('main');
    // Same topic, different section: just scroll.
    if (!keepScroll && r.name === 'topic' && current.name === 'topic' && current.topic === r.topic) {
      current = r;
      var tgt = r.section && document.getElementById(r.section);
      if (tgt) tgt.scrollIntoView({ behavior: TDC.util.reducedMotion() ? 'auto' : 'smooth', block: 'start' });
      return;
    }
    var y = window.scrollY;
    TDC.ui.closePopover();
    TDC.render.cleanup();
    main.innerHTML = '';
    main.className = 'view-' + r.name;
    current = r;
    if (r.name === 'topic') TDC.render.topic(main, r.topic, keepScroll ? null : r.section);
    else TDC.render.home(main);
    crumbs(r);
    if (keepScroll) window.scrollTo(0, y);
    else if (r.name !== 'topic') { window.scrollTo(0, 0); }
    document.title = (r.name === 'topic' && TDC.topics[r.topic] ? I.tx(TDC.topics[r.topic].title) + ' · ' : '') + TDC.t('app.title');
    TDC.emit('routechange', r);
  }
  TDC.router = {
    start: function () {
      window.addEventListener('hashchange', function () { render(false); });
      render(false);
    },
    refresh: function () { render(true); },
    current: function () { return current; }
  };
})(window.TDC);

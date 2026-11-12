/* 'three' widget: hosts a three.js (r149 UMD, window.THREE) scene with drag-to-rotate, wheel/pinch zoom,
 * optional parameter sliders, theme-aware background, and pausing when off-screen.
 * cfg: { height, params:[...], camera:[x,y,z], build(THREE, scene, api) -> {update(p), tick(dt,t,p)} }
 * api passed to build: {color(cssVar) -> THREE.Color, label(text) -> Sprite, ctx} */
(function (TDC) {
  'use strict';
  var U = TDC.util, el = U.el;

  TDC.widgets.register('three', function (host, cfg, ctx) {
    var THREE = window.THREE;
    if (!THREE) { host.textContent = '3D library missing'; return {}; }
    var H = cfg.height || 340;
    var panel = cfg.params ? TDC.viz.params(cfg.params, function (p) { if (scn.update) scn.update(p); render(); }, ctx) : null;
    var stage = el('div', { class: 'three-stage', style: { height: H + 'px' } });
    var hint = el('div', { class: 'three-hint' }, ctx.t('viz.drag3d'));
    host.append(el('div', { class: 'three-widget' }, [stage, hint, panel]));

    var renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch (e) { stage.textContent = ctx.t('viz.noWebgl'); return {}; }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    stage.appendChild(renderer.domElement);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
    var camPos = cfg.camera || [6, 4, 8];
    var radius = Math.hypot(camPos[0], camPos[1], camPos[2]);
    var theta = Math.atan2(camPos[0], camPos[2]), phi = Math.acos(camPos[1] / radius);
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    var dl = new THREE.DirectionalLight(0xffffff, 0.8); dl.position.set(5, 10, 7); scene.add(dl);

    function cssColor(v) { return new THREE.Color(TDC.theme.color(v) || v); }
    function label(text, opts) {
      opts = opts || {};
      var c = document.createElement('canvas'), g = c.getContext('2d'), fs = 48;
      g.font = '600 ' + fs + 'px system-ui, sans-serif';
      c.width = Math.ceil(g.measureText(text).width) + 24; c.height = fs + 20;
      g.font = '600 ' + fs + 'px system-ui, sans-serif';
      g.fillStyle = opts.color || TDC.theme.color('--fg'); g.textBaseline = 'middle'; g.fillText(text, 12, c.height / 2);
      var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
      var s = opts.size || 0.5; sp.scale.set(s * c.width / c.height, s, 1);
      return sp;
    }
    var scn = cfg.build(THREE, scene, { color: cssColor, label: label, ctx: ctx, params: panel ? panel.values : {} }) || {};
    if (panel && scn.update) scn.update(panel.values);

    function placeCamera() {
      camera.position.set(radius * Math.sin(phi) * Math.sin(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.cos(theta));
      camera.lookAt(0, 0, 0);
    }
    function resize() {
      var w = stage.clientWidth || 300;
      renderer.setSize(w, H, false); renderer.domElement.style.width = '100%'; renderer.domElement.style.height = H + 'px';
      camera.aspect = w / H; camera.updateProjectionMatrix(); render();
    }
    function render() { placeCamera(); renderer.render(scene, camera); }

    // Pointer orbit + pinch/wheel zoom
    var pts = new Map(), pinch0 = 0, r0 = radius;
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.addEventListener('pointerdown', function (e) { renderer.domElement.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); hint.classList.add('hide');
      if (pts.size === 2) { var a = Array.from(pts.values()); pinch0 = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]); r0 = radius; } });
    renderer.domElement.addEventListener('pointermove', function (e) {
      if (!pts.has(e.pointerId)) return;
      var prev = pts.get(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 1) { theta -= (e.clientX - prev[0]) * 0.008; phi = U.clamp(phi - (e.clientY - prev[1]) * 0.008, 0.15, Math.PI - 0.15); }
      else if (pts.size === 2) { var a = Array.from(pts.values()), d = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]); radius = U.clamp(r0 * pinch0 / d, 2, 60); }
      render();
    });
    function end(e) { pts.delete(e.pointerId); }
    renderer.domElement.addEventListener('pointerup', end); renderer.domElement.addEventListener('pointercancel', end);
    renderer.domElement.addEventListener('wheel', function (e) { e.preventDefault(); radius = U.clamp(radius * (1 + Math.sign(e.deltaY) * 0.1), 2, 60); render(); }, { passive: false });

    var raf = 0, visible = false, last = performance.now(), t0 = last;
    function loop(now) {
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (scn.tick) scn.tick(dt, (now - t0) / 1000, panel ? panel.values : {});
      render();
      if (visible && !U.reducedMotion()) raf = requestAnimationFrame(loop);
    }
    var io = new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting; cancelAnimationFrame(raf);
      if (visible) { last = performance.now(); raf = requestAnimationFrame(loop); }
    });
    io.observe(stage);
    var ro = new ResizeObserver(resize); ro.observe(stage);
    ctx.onTheme(function () { if (scn.theme) scn.theme(); render(); });
    resize();
    return {
      getAnswer: function () { return cfg.answer ? cfg.answer(panel.values) : {}; },
      destroy: function () {
        cancelAnimationFrame(raf); io.disconnect(); ro.disconnect();
        scene.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { if (m.map) m.map.dispose(); m.dispose(); }); } });
        renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss();
      }
    };
  });
})(window.TDC);

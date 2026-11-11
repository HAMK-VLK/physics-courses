/* Colour picker dialog for the annotation tools: saturation/brightness square, hue slider, editable HEX with a copy
 * button, and RGB / CMYK / HSV / HSL read-outs. TDC.colorPicker.open(hex, onPick): onPick(hex) runs on "Use colour". */
(function (TDC) {
  'use strict';
  var U = TDC.util, el = U.el;

  // ---------- conversions (pure; checked by tools/test-format.mjs) ----------
  function hsvToRgb(h, s, v) {   // h 0..360, s and v 0..1 -> [r, g, b] 0..255
    var f = function (n) { var k = (n + h / 60) % 6; return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1)))); };
    return [f(5), f(3), f(1)];
  }
  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var mx = Math.max(r, g, b), d = mx - Math.min(r, g, b), h = 0;
    if (d) h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, mx ? d / mx : 0, mx];
  }
  function rgbToHsl(r, g, b) {
    var q = rgbToHsv(r, g, b), l = q[2] * (1 - q[1] / 2);
    return [q[0], l === 0 || l === 1 ? 0 : (q[2] - l) / Math.min(l, 1 - l), l];
  }
  function rgbToCmyk(r, g, b) {
    var k = 1 - Math.max(r, g, b) / 255;
    return k === 1 ? [0, 0, 0, 1] : [r, g, b].map(function (c) { return (1 - c / 255 - k) / (1 - k); }).concat(k);
  }
  function toHex(rgb) { return '#' + rgb.map(function (c) { return ('0' + c.toString(16)).slice(-2); }).join(''); }
  function parseHex(s) {
    var m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(s || '').trim());
    if (!m) return null;
    var x = m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1];
    return [0, 2, 4].map(function (i) { return parseInt(x.substr(i, 2), 16); });
  }

  // ---------- eyedropper: pick a colour anywhere in this page ----------
  // A page cannot read its own pixels, so the tab is captured ("share this tab") while picking. A circle loupe sits
  // top-right of the pointer (flips near the right/top edges); left-click picks, Esc or right-click cancels.
  var canDrop = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
  function dropper(onColor, onEnd) {
    var LOUPE = 121, N = 11, GAP = 18;   // 11 x 11 captured pixels, each drawn 11 px wide
    navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'browser', cursor: 'never' }, audio: false, preferCurrentTab: true, selfBrowserSurface: 'include' })
      .then(start, function () { TDC.ui.toast(TDC.t('annot.dropperFail'), 'warn', 4000); onEnd(); });
    function start(stream) {
      var track = stream.getVideoTracks()[0], surf = track.getSettings().displaySurface;
      if (surf && surf !== 'browser') { track.stop(); TDC.ui.toast(TDC.t('annot.dropperTab'), 'warn', 5000); onEnd(); return; }   // a window/screen would not line up with the page
      var video = document.createElement('video'); video.muted = true; video.playsInline = true; video.srcObject = stream; video.play();
      var small = el('canvas', { width: N, height: N }), sctx = small.getContext('2d', { willReadFrequently: true });
      var lens = el('canvas', { width: LOUPE, height: LOUPE }), lctx = lens.getContext('2d');
      var chip = el('i'), hexTxt = el('span'), tag = el('span', { class: 'cp-loupe-hex' }, [chip, hexTxt]);
      var loupe = el('div', { class: 'cp-loupe', 'aria-hidden': 'true' }, [lens, tag]);
      // Chrome draws the mouse pointer into the captured tab, so the pointer is hidden while picking and this ring
      // (always just outside the magnified pixels) shows where you aim.
      var aim = el('div', { class: 'cp-aim', 'aria-hidden': 'true' });
      var layer = el('div', { class: 'cp-drop' }, [aim, loupe]), on = true, last = null, cur = null, raf = 0;
      function render(p) {   // copy the pixels around p into the lens and remember the centre colour
        if (!video.videoWidth) return;
        var kx = video.videoWidth / innerWidth, ky = video.videoHeight / innerHeight, h = N >> 1, px = LOUPE / N;
        sctx.clearRect(0, 0, N, N);
        sctx.drawImage(video, Math.round(p.x * kx) - h, Math.round(p.y * ky) - h, N, N, 0, 0, N, N);
        lctx.imageSmoothingEnabled = false; lctx.clearRect(0, 0, LOUPE, LOUPE); lctx.drawImage(small, 0, 0, LOUPE, LOUPE);
        lctx.lineWidth = 2; lctx.strokeStyle = '#000'; lctx.strokeRect(h * px - 1, h * px - 1, px + 2, px + 2);
        lctx.lineWidth = 1; lctx.strokeStyle = '#fff'; lctx.strokeRect(h * px + 0.5, h * px + 0.5, px - 1, px - 1);
        var d = sctx.getImageData(h, h, 1, 1).data; cur = [d[0], d[1], d[2]]; hexTxt.textContent = toHex(cur); chip.style.background = toHex(cur);
      }
      function place(p) {
        var k = video.videoWidth ? Math.min(video.videoWidth / innerWidth, video.videoHeight / innerHeight) : 1;
        var r = Math.ceil(((N >> 1) + 1) / k) + 4;   // ring radius in CSS px: inner edge clears the 11 x 11 captured pixels
        aim.style.width = aim.style.height = 2 * r + 'px';
        aim.style.transform = 'translate(' + (p.x - r) + 'px,' + (p.y - r) + 'px)'; aim.style.visibility = 'visible';
        var left = p.x + GAP, top = p.y - GAP - LOUPE;
        if (left + LOUPE > innerWidth) left = p.x - GAP - LOUPE;   // too close to the right edge: show it on the left
        if (top < 0) top = p.y + GAP;                               // too close to the top: show it below
        loupe.style.transform = 'translate(' + left + 'px,' + top + 'px)'; loupe.style.visibility = 'visible';
      }
      function loop() { if (last) render(last); raf = requestAnimationFrame(loop); }   // keep sampling while the page changes
      function end(rgb) {
        if (!on) return;
        on = false; cancelAnimationFrame(raf); stream.getTracks().forEach(function (t) { t.stop(); });
        layer.remove(); removeEventListener('keydown', key, true); onEnd();
        if (rgb) onColor(rgb);
      }
      function key(e) { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); end(); } }
      layer.addEventListener('pointermove', function (e) { last = { x: e.clientX, y: e.clientY }; place(last); });
      layer.addEventListener('pointerdown', function (e) { if (e.button === 0) { e.preventDefault(); last = { x: e.clientX, y: e.clientY }; place(last); } });
      layer.addEventListener('pointerup', function (e) { if (e.button !== 0) return; render({ x: e.clientX, y: e.clientY }); if (cur) end(cur); });
      layer.addEventListener('contextmenu', function (e) { e.preventDefault(); end(); });
      addEventListener('keydown', key, true);   // capture: Esc must not also close the picker dialog
      track.addEventListener('ended', function () { end(); });   // the browser's "Stop sharing" button
      document.body.appendChild(layer);
      TDC.ui.toast(TDC.t('annot.dropperHint'), 'info', 4000);
      loop();
    }
  }

  // ---------- dialog ----------
  function open(hex, onPick) {
    var c0 = parseHex(hex) || [235, 64, 52], q = rgbToHsv(c0[0], c0[1], c0[2]);
    var h = q[0], s = q[1], v = q[2], cur = toHex(c0);
    var pct = function (x) { return Math.round(x * 100) + '%'; };
    var preview = el('div', { class: 'cp-preview' }), thumb = el('div', { class: 'cp-thumb' });
    var area = el('div', { class: 'cp-sv', tabindex: '0', role: 'slider', 'aria-label': TDC.t('annot.sv') }, thumb);
    var hue = el('input', { type: 'range', class: 'cp-hue', min: 0, max: 359, 'aria-label': TDC.t('annot.hue'), oninput: function () { h = +hue.value; paint(); } });
    var hexIn = el('input', { class: 'input cp-hex', spellcheck: 'false', 'aria-label': 'HEX', oninput: function () {
      var c = parseHex(hexIn.value); if (!c) return;
      var r = rgbToHsv(c[0], c[1], c[2]); h = r[0]; s = r[1]; v = r[2]; paint(true);
    } });
    var outs = {};
    var fields = el('div', { class: 'cp-fields' }, ['RGB', 'CMYK', 'HSV', 'HSL'].map(function (k) {
      return el('div', { class: 'cp-field' }, [el('span', {}, k), outs[k] = el('output')]);
    }));
    function copied() { TDC.ui.toast(TDC.t('annot.copied', { hex: cur })); }
    function copyFallback() { hexIn.value = cur; hexIn.select(); try { if (document.execCommand('copy')) copied(); } catch (e) {} }
    var copy = el('button', { class: 'icon-btn', type: 'button', title: TDC.t('annot.copy'), 'aria-label': TDC.t('annot.copy'), onclick: function () {
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(cur).then(copied, copyFallback); else copyFallback();
    } }, '⧉');
    var drop = canDrop ? el('button', { class: 'btn btn-ghost cp-dropbtn', type: 'button', title: TDC.t('annot.dropperHint'), onclick: function () {
      var backdrop = area.closest('.modal-backdrop');
      backdrop.style.visibility = 'hidden';   // out of the way (and out of the captured image) while picking
      dropper(function (c) { var r = rgbToHsv(c[0], c[1], c[2]); h = r[0]; s = r[1]; v = r[2]; paint(); },
        function () { backdrop.style.visibility = ''; drop.focus(); });
    } }, '💧 ' + TDC.t('annot.dropper')) : null;

    function paint(fromHex) {
      var rgb = hsvToRgb(h, s, v), hsl = rgbToHsl(rgb[0], rgb[1], rgb[2]), cmyk = rgbToCmyk(rgb[0], rgb[1], rgb[2]);
      cur = toHex(rgb);
      area.style.setProperty('--hue', h);
      thumb.style.left = pct(s); thumb.style.top = pct(1 - v);
      preview.style.background = cur;
      hue.value = Math.round(h);
      if (!fromHex) hexIn.value = cur;
      area.setAttribute('aria-valuetext', TDC.t('annot.sv') + ': ' + pct(s) + ', ' + pct(v));
      outs.RGB.textContent = rgb.join(', ');
      outs.CMYK.textContent = cmyk.map(pct).join(', ');
      outs.HSV.textContent = Math.round(h) + '°, ' + pct(s) + ', ' + pct(v);
      outs.HSL.textContent = Math.round(hsl[0]) + '°, ' + pct(hsl[1]) + ', ' + pct(hsl[2]);
    }
    function pick(e) {
      var r = area.getBoundingClientRect();
      s = U.clamp((e.clientX - r.left) / r.width, 0, 1); v = 1 - U.clamp((e.clientY - r.top) / r.height, 0, 1); paint();
    }
    area.addEventListener('pointerdown', function (e) { area.setPointerCapture(e.pointerId); area.onpointermove = pick; pick(e); });
    area.addEventListener('pointerup', function () { area.onpointermove = null; });
    area.addEventListener('keydown', function (e) {   // arrows: left/right = saturation, up/down = brightness
      var st = e.shiftKey ? 0.1 : 0.02, k = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, st], ArrowDown: [0, -st] }[e.key];
      if (!k) return;
      e.preventDefault(); s = U.clamp(s + k[0], 0, 1); v = U.clamp(v + k[1], 0, 1); paint();
    });
    paint();

    TDC.ui.modal({ title: TDC.t('annot.picker'), body: el('div', { class: 'cp' }, [
      el('div', { class: 'cp-top' }, [preview, area]), hue, drop,
      el('label', { class: 'cp-hexrow' }, [el('span', {}, 'HEX'), hexIn, copy]), fields
    ]), actions: [
      { label: TDC.t('common.cancel') },
      { label: TDC.t('annot.useColor'), primary: true, run: function () { onPick(cur); } }
    ] });
  }

  TDC.colorPicker = { open: open, conv: { hsvToRgb: hsvToRgb, rgbToHsv: rgbToHsv, rgbToHsl: rgbToHsl, rgbToCmyk: rgbToCmyk, toHex: toHex, parseHex: parseHex } };
})(window.TDC);

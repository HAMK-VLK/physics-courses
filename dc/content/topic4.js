/* Topic 4: Thévenin and Norton theorems, source transformation, Y-Δ, maximum power transfer, Wheatstone bridge.
 * NO answers in this file: they live in src/answers/topic4.json. Block ids are stable: never rename them.
 * Source: EE4ThevenNorton.pdf (corrected per PDF-ERRATA.md). Additions beyond the PDF are marked "(extra)". */
(function () {
  "use strict";
  function L(en, fi) { return { en: en, fi: fi }; }

  /* ------------------------------------------------------------------------------------------------
   * S: tiny schematic renderer (SVG string). Grid units, y downwards. Used for figures and for the
   * custom widgets below (which also solve the same netlists with TDC.sim).
   * ---------------------------------------------------------------------------------------------- */
  var S = (function () {
    var U = 34, M = 1.3;
    function P(v) { return +(v * U).toFixed(1); }
    function C(c) { return c ? "var(" + c + ")" : "currentColor"; }
    function X(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
    function txt(x, y, s, o) {
      o = o || {};
      return "<text x='" + P(x + M) + "' y='" + P(y + M) + "' text-anchor='" + (o.anchor || "middle") + "' dominant-baseline='central' font-size='" +
        (o.size || 13) + "' fill='" + C(o.color) + "'" + (o.bold ? " font-weight='700'" : "") + ">" + X(s) + "</text>";
    }
    function poly(pts, color, w, dash) {
      return "<polyline points='" + pts.map(function (p) { return P(p[0] + M) + "," + P(p[1] + M); }).join(" ") + "' fill='none' stroke='" + C(color) +
        "' stroke-width='" + (w || 2) + "' stroke-linejoin='round' stroke-linecap='round'" + (dash ? " stroke-dasharray='6 5'" : "") + "/>";
    }
    function part(p) {
      var a = p.a, b = p.b, dx = b[0] - a[0], dy = b[1] - a[1], Ln = Math.sqrt(dx * dx + dy * dy), ux = dx / Ln, uy = dy / Ln;
      var ang = Math.atan2(dy, dx) * 180 / Math.PI, t = p.t, c = C(p.color);
      var cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2;
      var body = t === "R" ? 1.3 : (t === "W" ? 0 : 0.95);
      var Lp = Ln * U, bp = body * U, m = Lp / 2, h = 0.17 * U;
      var g = "<g" + (p.ghost ? " opacity='0.3'" : "") + "><g transform='translate(" + P(a[0] + M) + " " + P(a[1] + M) + ") rotate(" + ang.toFixed(2) +
        ")' fill='none' stroke='" + c + "' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>";
      if (t === "W") g += "<line x1='0' y1='0' x2='" + Lp + "' y2='0'/>";
      else {
        g += "<line x1='0' y1='0' x2='" + (m - bp / 2) + "' y2='0'/><line x1='" + (m + bp / 2) + "' y1='0' x2='" + Lp + "' y2='0'/>";
        if (t === "R") {
          var f = [0, 1 / 12, 3 / 12, 5 / 12, 7 / 12, 9 / 12, 11 / 12, 1], yy = [0, -1, 1, -1, 1, -1, 1, 0];
          g += "<polyline points='" + f.map(function (q, i) { return (m - bp / 2 + q * bp).toFixed(1) + "," + (yy[i] * h).toFixed(1); }).join(" ") + "'/>";
        } else {
          g += "<circle cx='" + m + "' cy='0' r='" + (bp / 2) + "' fill='var(--surface)'/>";
          if (t === "I") g += "<line x1='" + (m - 0.3 * bp) + "' y1='0' x2='" + (m + 0.3 * bp) + "' y2='0'/><polygon points='" + (m + 0.3 * bp) + ",0 " +
            (m + 0.3 * bp - 7) + ",-4.5 " + (m + 0.3 * bp - 7) + ",4.5' fill='" + c + "'/>";
        }
      }
      g += "</g>";
      if (t === "V") g += txt(cx + ux * 0.2, cy + uy * 0.2, "+", { size: 13, bold: true, color: p.color }) + txt(cx - ux * 0.2, cy - uy * 0.2, "−", { size: 13, bold: true, color: p.color });
      if (t === "volt" || t === "amp" || t === "ohm") g += txt(cx, cy, p.sym || (t === "volt" ? "V" : t === "amp" ? "A" : "Ω"), { size: 14, bold: true, color: p.color });
      if (p.label) {
        var s = p.flip ? -1 : 1, nx = uy * s, ny = -ux * s, off = t === "R" ? 0.55 + 0.5 * Math.abs(ux * uy) : (t === "W" ? 0.5 : 0.75);   // slanted resistors need more room
        var anc = nx > 0.4 ? "start" : (nx < -0.4 ? "end" : "middle");
        g += txt(cx + nx * off, cy + ny * off - (anc === "middle" ? 0.1 : 0), p.label, { anchor: anc, color: p.lcolor });
      }
      return g + "</g>";
    }
    function render(spec) {
      var vw = P(spec.w + 2 * M), vh = P(spec.h + 2 * M), s = "";
      // a frame label above the top margin ("Thévenin") would be cut off: grow the viewBox upwards for it
      var top = Math.min(0, Math.min.apply(null, (spec.rects || []).filter(function (r) { return r.label; }).map(function (r) { return P(r.y + M - 0.35) - 14; }).concat([0])));
      s += "<svg class='t4-sch' xmlns='http://www.w3.org/2000/svg' viewBox='0 " + top + " " + vw + " " + (vh - top) + "' style='width:100%;max-width:" + vw + "px;height:auto' role='img' aria-label='" + X(spec.alt ? spec.alt[(TDC.i18n || {}).lang] || spec.alt.en : "") + "'>";
      (spec.rects || []).forEach(function (r) {
        s += "<rect x='" + P(r.x + M) + "' y='" + P(r.y + M) + "' width='" + P(r.w) + "' height='" + P(r.h) + "' rx='8' fill='none' stroke='" + C(r.color || "--muted") + "' stroke-dasharray='6 5' stroke-width='1.6'/>";
        if (r.label) s += txt(r.x + 0.2, r.y - 0.35, r.label, { anchor: "start", size: 12, color: "--muted" });
      });
      (spec.wires || []).forEach(function (w) { s += poly(w, w.color); });
      (spec.parts || []).forEach(function (p) { s += part(p); });
      (spec.dots || []).forEach(function (d) { s += "<circle cx='" + P(d[0] + M) + "' cy='" + P(d[1] + M) + "' r='3.4' fill='currentColor'/>"; });
      (spec.terms || []).forEach(function (t) {
        s += "<circle cx='" + P(t.at[0] + M) + "' cy='" + P(t.at[1] + M) + "' r='4.6' fill='var(--surface)' stroke='currentColor' stroke-width='2'/>";
        if (t.text) s += txt(t.at[0] + (t.dx == null ? 0.5 : t.dx), t.at[1] + (t.dy || 0), t.text, { bold: true });
      });
      (spec.texts || []).forEach(function (t) { s += txt(t.at[0], t.at[1], t.text, t); });
      return s + "</svg>";
    }
    function sim(spec, ground) {
      return {
        parts: spec.parts.filter(function (p) { return p.t === "R" || p.t === "V" || p.t === "I" || p.t === "W"; })
          .map(function (p) { return { id: p.id, type: p.t, a: p.a, b: p.b, value: p.value }; }),
        wires: spec.wires.map(function (w) { return w.slice(); }), ground: ground
      };
    }
    return { render: render, sim: sim };
  })();

  /* ---------- netlists reused by figures and widgets ---------- */
  function n3(v) { return (window.TDC && TDC.util && TDC.util.fmtNum) ? TDC.util.fmtNum(v, 3) : String(+(+v).toPrecision(3)); }
  function lab(sym, v, unit) { return sym + " = " + n3(v) + " " + unit; }

  // Example 4.1 network. o: {E,R1,R2,R3,RL, load, kill, meter}
  function ex41(o) {
    o = o || {};
    var E = o.E == null ? 10 : o.E, R1 = o.R1 == null ? 2 : o.R1, R2 = o.R2 == null ? 8 : o.R2, R3 = o.R3 == null ? 5 : o.R3, RL = o.RL == null ? 10 : o.RL;
    var hi = o.kill ? "--c-2" : null;
    var parts = [
      { id: "V1", t: o.kill ? "W" : "V", a: [0, 6], b: [0, 3], value: E, label: o.kill ? null : lab("U", E, "V"), flip: true, color: o.kill ? "--c-2" : null },
      { id: "R1", t: "R", a: [0, 3], b: [0, 0], value: R1, label: lab("R₁", R1, "Ω"), flip: true, color: hi },
      { id: "R2", t: "R", a: [4, 0], b: [4, 6], value: R2, label: lab("R₂", R2, "Ω"), color: hi },
      { id: "R3", t: "R", a: [4, 0], b: [8, 0], value: R3, label: lab("R₃", R3, "Ω"), color: hi }
    ];
    var wires = [[[0, 0], [4, 0]], [[0, 6], [o.meter ? 10 : 8, 6]]];
    if (o.load) parts.push({ id: "RL", t: "R", a: [8, 0], b: [8, 6], value: RL, label: lab("R", RL, "Ω") });
    if (o.meter) { parts.push({ id: "M", t: o.meter, a: [10, 0], b: [10, 6] }); wires.push([[8, 0], [10, 0]]); }
    return { w: 11.4, h: 6.6, parts: parts, wires: wires, dots: [[4, 0], [4, 6]],
      terms: [{ at: [8, 0], text: "A", dx: -0.1, dy: -0.55 }, { at: [8, 6], text: "B", dx: -0.1, dy: 0.55 }],
      alt: L("Example 4.1 circuit", "Esimerkin 4.1 piiri") };
  }
  // Thévenin equivalent drawn the same way
  function theveninSpec(UT, RT, RL, load) {
    var parts = [
      { id: "Vt", t: "V", a: [0, 6], b: [0, 3], value: UT, label: lab("Uᴛ", UT, "V"), flip: true, color: "--c-1" },
      { id: "Rt", t: "R", a: [0, 3], b: [0, 0], value: RT, label: lab("Rᴛ", RT, "Ω"), flip: true, color: "--c-1" }
    ];
    if (load) parts.push({ id: "RL", t: "R", a: [4, 0], b: [4, 6], value: RL, label: lab("R", RL, "Ω") });
    return { w: 7.4, h: 6.6, parts: parts, wires: [[[0, 0], [4, 0]], [[0, 6], [4, 6]]],
      terms: [{ at: [4, 0], text: "A", dx: -0.1, dy: -0.55 }, { at: [4, 6], text: "B", dx: -0.1, dy: 0.55 }],
      rects: [{ x: -0.7, y: -0.8, w: 5.4, h: 7.6, label: "Thévenin" }], alt: L("Thevenin equivalent", "Théveninin ekvivalentti") };
  }
  function voltBetween(spec, pa, pb) {
    var r = TDC.sim.solve(S.sim(spec, pb)); if (!r.ok) return NaN;
    return (r.V[TDC.sim.key(pa)] || 0) - (r.V[TDC.sim.key(pb)] || 0);
  }

  /* ---------- small DOM helpers for widgets ---------- */
  function h(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function btn(text, fn) { var b = h("button", "btn btn-small"); b.type = "button"; b.textContent = text; b.addEventListener("click", fn); return b; }
  function injectStyle() {
    if (document.getElementById("t4-style")) return;
    var st = document.createElement("style"); st.id = "t4-style";
    st.textContent = ".t4-box{display:flex;flex-wrap:wrap;gap:1rem;align-items:flex-start}.t4-col{flex:1 1 250px;min-width:0}" +
      ".t4-col h5{margin:.2rem 0;font-size:.9rem;color:var(--muted)}.t4-fade{animation:t4in .45s ease}" +
      "@keyframes t4in{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}" +
      "@media (prefers-reduced-motion:reduce){.t4-fade{animation:none}}" +
      ".t4-read{margin:.5rem 0;padding:.45rem .7rem;border:1px solid var(--line);border-radius:8px;background:var(--surface-2)}" +
      ".t4-read b{font-variant-numeric:tabular-nums}.t4-nav{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;margin:.4rem 0}" +
      ".t4-ok{color:var(--ok);background:var(--ok-bg);padding:.1rem .5rem;border-radius:999px;font-weight:600}" +
      ".t4-no{color:var(--warn);background:var(--warn-bg);padding:.1rem .5rem;border-radius:999px;font-weight:600}" +
      ".t4-tog[aria-pressed=true]{outline:2px solid var(--c-2)}";
    document.head.appendChild(st);
  }

  /* ---------- widget: collapse the network into a black box (Example 4.1) ---------- */
  function wizardMount(host, ctx) {
    injectStyle();
    var step = 0, N = 5;
    var steps = [
      { t: L("Start: the load R is connected to terminals A and B. We only want I in R, so the rest of the network is a \"black box\" for R.",
             "Alku: kuorma R on kytketty navoihin A ja B. Haluamme vain virran I vastuksessa R, joten muu verkko on R:lle \"musta laatikko\"."),
        o: { load: true } },
      { t: L("Step 1: remove the load. A voltmeter at the open terminals A–B shows the open-circuit voltage U_T. R₃ carries no current, so U_T = voltage across R₂.",
             "Vaihe 1: poista kuorma. Avoimiin napoihin A–B kytketty volttimittari näyttää tyhjäkäyntijännitteen U_T. R₃:ssa ei kulje virtaa, joten U_T = R₂:n jännite."),
        o: { meter: "volt" } },
      { t: L("Step 2: replace the voltage source by a wire (short circuit). An ohmmeter at A–B now shows the Thévenin resistance R_T = R₃ + R₁∥R₂.",
             "Vaihe 2: korvaa jännitelähde johtimella (oikosulku). Ohmimittari navoissa A–B näyttää nyt Théveninin resistanssin R_T = R₃ + R₁∥R₂."),
        o: { meter: "ohm", kill: true } },
      { t: L("Step 3: the whole network collapses into one source U_T in series with R_T.",
             "Vaihe 3: koko verkko tiivistyy yhdeksi lähteeksi U_T ja sarjaan kytketyksi vastukseksi R_T."),
        thev: true },
      { t: L("Step 4: connect the load R back and use Ohm's law: I = U_T / (R_T + R).",
             "Vaihe 4: kytke kuorma R takaisin ja käytä Ohmin lakia: I = U_T / (R_T + R)."),
        thev: true, load: true }
    ];
    var cap = h("p"), fig = h("div", "t4-fade"), read = h("div", "t4-read"), nav = h("div", "t4-nav"), cnt = h("span");
    var prev = btn("◀", function () { go(-1); }), next = btn("▶", function () { go(1); });
    prev.setAttribute("aria-label", "previous"); next.setAttribute("aria-label", "next");
    var reset = btn("↺", function () { step = 0; draw(); }); reset.setAttribute("aria-label", "reset");
    nav.append(prev, cnt, next, reset);
    host.append(nav, cap, fig, read);
    function go(d) { step = Math.max(0, Math.min(N - 1, step + d)); draw(); }
    function draw() {
      var s = steps[step], spec, rd = "";
      var base = ex41({ load: false });
      var UT = voltBetween(ex41({ meter: "volt" }), [10, 0], [10, 6]);
      var RT = TDC.sim.equivalentResistance(S.sim(ex41({ load: false })), [8, 0], [8, 6]);
      if (s.thev) spec = theveninSpec(UT, RT, 10, s.load);
      else spec = ex41(s.o);
      if (step === 1) rd = "U_T = U_AB = <b>" + TDC.util.fmtSI(UT, "V") + "</b>";
      if (step === 2) rd = "R_T = <b>" + TDC.util.fmtSI(RT, "Ω") + "</b> &nbsp;(5 + 2·8/(2+8))";
      if (step === 3) rd = "U_T = <b>" + TDC.util.fmtSI(UT, "V") + "</b>, R_T = <b>" + TDC.util.fmtSI(RT, "Ω") + "</b>";
      if (step === 4) rd = "I = U_T/(R_T+R) = <b>" + TDC.util.fmtSI(UT / (RT + 10), "A", 3) + "</b>";
      if (step === 0) rd = ctx.tx(L("Question: what is the current I in the 10 Ω resistor?", "Kysymys: kuinka suuri on virta I 10 Ω:n vastuksessa?"));
      cap.textContent = ctx.tx(s.t); read.innerHTML = rd;
      cnt.textContent = (step + 1) + " / " + N;
      prev.disabled = step === 0; next.disabled = step === N - 1;
      fig.className = ""; void fig.offsetWidth; fig.className = "t4-fade";
      fig.innerHTML = S.render(spec);
      void base;
    }
    ctx.onLang(draw); draw();
    return { destroy: function () { host.innerHTML = ""; } };
  }

  /* ---------- widget: source switches and ohmmeter (how to find R_T) ---------- */
  function togglesMount(host, ctx) {
    injectStyle();
    var vOn = true, iOn = true;
    var row = h("div", "t4-nav"), fig = h("div"), read = h("div", "t4-read"), note = h("p");
    var bv = h("button", "btn t4-tog"), bi = h("button", "btn t4-tog");
    bv.type = bi.type = "button";
    bv.addEventListener("click", function () { vOn = !vOn; draw(); });
    bi.addEventListener("click", function () { iOn = !iOn; draw(); });
    row.append(bv, bi);
    host.append(row, fig, read, note);
    function spec() {
      var parts = [
        { id: "U1", t: vOn ? "V" : "W", a: [0, 6], b: [0, 3], value: 12, label: vOn ? "12 V" : null, flip: true, color: vOn ? null : "--c-2" },
        { id: "R1", t: "R", a: [0, 3], b: [0, 0], value: 6, label: "R₁ = 6 Ω", flip: true },
        { id: "R2", t: "R", a: [4, 0], b: [4, 6], value: 3, label: "R₂ = 3 Ω" },
        { id: "I1", t: "I", a: [7, 6], b: [7, 0], value: 1, label: "1 A", flip: true, ghost: !iOn }
      ];
      return { w: 10.4, h: 6.6, parts: parts, wires: [[[0, 0], [9, 0]], [[0, 6], [9, 6]]], dots: [[4, 0], [4, 6]],
        terms: [{ at: [9, 0], text: "A", dx: 0.5 }, { at: [9, 6], text: "B", dx: 0.5 }], alt: L("network with a voltage source and a current source", "verkko, jossa on jännitelähde ja virtalähde") };
    }
    function draw() {
      var sp = spec();
      var model = S.sim(sp, [9, 6]);
      if (!iOn) model.parts = model.parts.filter(function (p) { return p.id !== "I1"; });
      var r = TDC.sim.solve(model);
      var Uab = r.ok ? (r.V[TDC.sim.key([9, 0])] || 0) - (r.V[TDC.sim.key([9, 6])] || 0) : NaN;
      bv.textContent = ctx.tx(vOn ? L("Voltage source: active", "Jännitelähde: toiminnassa") : L("Voltage source: replaced by a wire", "Jännitelähde: korvattu johtimella"));
      bi.textContent = ctx.tx(iOn ? L("Current source: active", "Virtalähde: toiminnassa") : L("Current source: removed (open)", "Virtalähde: poistettu (avoin)"));
      bv.setAttribute("aria-pressed", String(!vOn)); bi.setAttribute("aria-pressed", String(!iOn));
      var html = "U_AB = <b>" + TDC.util.fmtSI(Uab, "V", 3) + "</b> ";
      if (!vOn && !iOn) {
        var RT = TDC.sim.equivalentResistance(S.sim(spec()), [9, 0], [9, 6]);
        html += "<br>" + ctx.tx(L("Ohmmeter between A and B: ", "Ohmimittari napojen A ja B välillä: ")) + "R_T = <b>" + TDC.util.fmtSI(RT, "Ω", 3) + "</b> (6∥3)";
      } else {
        html += "<br><em>" + ctx.tx(L("An ohmmeter only works when ALL sources are deactivated.", "Ohmimittari toimii vain, kun KAIKKI lähteet on kytketty pois.")) + "</em>";
      }
      read.innerHTML = html;
      note.textContent = ctx.tx(L("Try all four combinations. With both sources active U_AB = U_T = 6 V; each source alone contributes part of it (superposition).",
        "Kokeile kaikki neljä yhdistelmää. Kun molemmat lähteet ovat toiminnassa, U_AB = U_T = 6 V; kumpikin lähde antaa osan siitä (superpositio)."));
      fig.innerHTML = S.render(sp);
    }
    ctx.onLang(draw); draw();
    return { destroy: function () { host.innerHTML = ""; } };
  }

  /* ---------- widget: original network next to its Thévenin equivalent with one shared load ---------- */
  function twinMount(host, ctx) {
    injectStyle();
    var params = [
      { id: "E", tex: "U", min: 1, max: 24, step: 0.5, value: 10, unit: "V" },
      { id: "R1", tex: "R_1", min: 1, max: 20, step: 0.5, value: 2, unit: "Ω" },
      { id: "R2", tex: "R_2", min: 1, max: 20, step: 0.5, value: 8, unit: "Ω" },
      { id: "R3", tex: "R_3", min: 1, max: 20, step: 0.5, value: 5, unit: "Ω" },
      { id: "RL", tex: "R", min: 1, max: 50, step: 1, value: 10, unit: "Ω" }
    ];
    var panel = TDC.viz.params(params, function () { draw(); }, ctx);
    var wrap = h("div", "t4-box"), a = h("div", "t4-col"), b = h("div", "t4-col"), read = h("div", "t4-read");
    var ha = h("h5"), hb = h("h5"), fa = h("div"), fb = h("div");
    a.append(ha, fa); b.append(hb, fb); wrap.append(a, b);
    host.append(panel, wrap, read);
    function draw() {
      var v = panel.values;
      var sp = ex41({ E: v.E, R1: v.R1, R2: v.R2, R3: v.R3, RL: v.RL, load: true });
      var UT = v.E * v.R2 / (v.R1 + v.R2), RT = v.R3 + v.R1 * v.R2 / (v.R1 + v.R2);
      var r = TDC.sim.solve(S.sim(sp, [8, 6]));
      var Io = r.ok ? r.parts.RL.I : NaN, Ie = UT / (RT + v.RL);
      ha.textContent = ctx.tx(L("Original network", "Alkuperäinen verkko"));
      hb.textContent = ctx.tx(L("Thévenin equivalent", "Théveninin ekvivalentti"));
      fa.innerHTML = S.render(sp); fb.innerHTML = S.render(theveninSpec(UT, RT, v.RL, true));
      read.innerHTML = "U_T = <b>" + TDC.util.fmtSI(UT, "V") + "</b><br>R_T = <b>" + TDC.util.fmtSI(RT, "Ω") + "</b><br>" +
        ctx.tx(L("Load current, original network: ", "Kuormavirta, alkuperäinen verkko: ")) + "<b>" + TDC.util.fmtSI(Io, "A", 4) + "</b><br>" +
        ctx.tx(L("Load current, Thévenin equivalent: ", "Kuormavirta, Théveninin ekvivalentti: ")) + "<b>" + TDC.util.fmtSI(Ie, "A", 4) + "</b>";
    }
    ctx.onLang(draw); draw();
    return { destroy: function () { host.innerHTML = ""; } };
  }

  /* ---------- widget: Thévenin <-> Norton side by side ---------- */
  function morphMount(host, ctx) {
    injectStyle();
    var params = [
      { id: "E", tex: "U_T", min: 1, max: 24, step: 0.5, value: 12, unit: "V" },
      { id: "r", tex: "R_T", min: 1, max: 50, step: 1, value: 6, unit: "Ω" },
      { id: "RL", tex: "R_L", min: 1, max: 100, step: 1, value: 12, unit: "Ω" }
    ];
    var panel = TDC.viz.params(params, function () { draw(); }, ctx);
    var wrap = h("div", "t4-box"), a = h("div", "t4-col"), b = h("div", "t4-col"), read = h("div", "t4-read");
    var ha = h("h5"), hb = h("h5"), fa = h("div"), fb = h("div");
    a.append(ha, fa); b.append(hb, fb); wrap.append(a, b);
    host.append(panel, wrap, read);
    function draw() {
      var v = panel.values, IN = v.E / v.r;
      var th = { w: 7.4, h: 6.6, alt: L("Thevenin source with load", "Thévenin-lähde ja kuorma"),
        parts: [{ id: "Vt", t: "V", a: [0, 6], b: [0, 3], label: lab("Uᴛ", v.E, "V"), flip: true, color: "--c-1" },
                { id: "Rt", t: "R", a: [0, 3], b: [0, 0], label: lab("Rᴛ", v.r, "Ω"), flip: true, color: "--c-1" },
                { id: "RL", t: "R", a: [4, 0], b: [4, 6], label: lab("Rₗ", v.RL, "Ω") }],
        wires: [[[0, 0], [4, 0]], [[0, 6], [4, 6]]], terms: [{ at: [4, 0], text: "A", dx: -0.1, dy: -0.55 }, { at: [4, 6], text: "B", dx: -0.1, dy: 0.55 }] };
      var no = { w: 9.4, h: 6.6, alt: L("Norton source with load", "Norton-lähde ja kuorma"),
        parts: [{ id: "In", t: "I", a: [0, 6], b: [0, 0], label: lab("Iₙ", IN, "A"), flip: true, color: "--c-3" },
                { id: "Rn", t: "R", a: [3, 0], b: [3, 6], label: lab("Rₙ", v.r, "Ω"), color: "--c-3" },
                { id: "RL", t: "R", a: [7, 0], b: [7, 6], label: lab("Rₗ", v.RL, "Ω") }],
        wires: [[[0, 0], [7, 0]], [[0, 6], [7, 6]]], dots: [[3, 0], [3, 6]],
        terms: [{ at: [7, 0], text: "A", dx: -0.1, dy: -0.55 }, { at: [7, 6], text: "B", dx: -0.1, dy: 0.55 }] };
      ha.textContent = ctx.tx(L("Thévenin: voltage source + series resistor", "Thévenin: jännitelähde + sarjavastus"));
      hb.textContent = ctx.tx(L("Norton: current source + parallel resistor", "Norton: virtalähde + rinnakkaisvastus"));
      fa.innerHTML = S.render(th); fb.innerHTML = S.render(no);
      var It = v.E / (v.r + v.RL), In2 = IN * v.r / (v.r + v.RL);
      read.innerHTML = "I_N = U_T / R_T = <b>" + TDC.util.fmtSI(IN, "A") + "</b><br>" +
        ctx.tx(L("Load current (Thévenin): ", "Kuormavirta (Thévenin): ")) + "<b>" + TDC.util.fmtSI(It, "A", 4) + "</b><br>" +
        ctx.tx(L("Load current (Norton, current divider): ", "Kuormavirta (Norton, virranjako): ")) + "<b>" + TDC.util.fmtSI(In2, "A", 4) + "</b><br>" +
        ctx.tx(L("Load voltage: ", "Kuormajännite: ")) + "<b>" + TDC.util.fmtSI(It * v.RL, "V", 4) + "</b>";
    }
    ctx.onLang(draw); draw();
    return { destroy: function () { host.innerHTML = ""; } };
  }

  /* ---------- widget: Wheatstone bridge with galvanometer needle ---------- */
  function bridgeMount(host, ctx) {
    injectStyle();
    var params = [
      { id: "RV", tex: "R_V", min: 100, max: 3000, step: 10, value: 1000, unit: "Ω" },
      { id: "RX", tex: "R_X", min: 500, max: 3000, step: 10, value: 1800, unit: "Ω" },
      { id: "Vs", tex: "U_s", min: 1, max: 24, step: 1, value: 12, unit: "V" }
    ];
    var panel = TDC.viz.params(params, function () { draw(); }, ctx);
    var wrap = h("div", "t4-box"), a = h("div", "t4-col"), b = h("div", "t4-col"), read = h("div", "t4-read");
    var fa = h("div"), fb = h("div");
    a.append(fa); b.append(fb); wrap.append(a, b);
    host.append(panel, wrap, read);
    function draw() {
      var v = panel.values, R2 = 150, R4 = 100;
      var VA = v.Vs * v.RV / (v.RX + v.RV), VB = v.Vs * R4 / (R2 + R4), Vo = VA - VB;
      var bal = Math.abs(Vo) < 0.005 * Math.max(1, v.Vs / 12);
      var sp = { w: 10.4, h: 6.6, alt: L("Wheatstone bridge", "Wheatstonen silta"),
        parts: [{ id: "Vs", t: "V", a: [0, 6], b: [0, 0], label: lab("Uₛ", v.Vs, "V"), flip: true },
                { id: "RX", t: "R", a: [4, 0], b: [4, 3], label: lab("Rₓ", v.RX, "Ω"), color: "--c-2" },
                { id: "RV", t: "R", a: [4, 3], b: [4, 6], label: lab("Rᵥ", v.RV, "Ω"), color: "--c-1" },
                { id: "R2", t: "R", a: [8, 0], b: [8, 3], label: lab("R₂", R2, "Ω") },
                { id: "R4", t: "R", a: [8, 3], b: [8, 6], label: lab("R₄", R4, "Ω") },
                { id: "G", t: "volt", sym: "G", a: [4, 3], b: [8, 3], color: bal ? "--ok" : "--c-flow" }],
        wires: [[[0, 0], [8, 0]], [[0, 6], [8, 6]]], dots: [[4, 0], [4, 6]],
        terms: [{ at: [4, 3], text: "A", dx: -0.5 }, { at: [8, 3], text: "B", dx: 0.6 }] };
      fa.innerHTML = S.render(sp);
      var ang = Math.max(-1, Math.min(1, Vo / (0.25 * v.Vs))) * 60, rad = ang * Math.PI / 180;
      var nx = 110 + 80 * Math.sin(rad), ny = 105 - 80 * Math.cos(rad);
      var g = "<svg viewBox='0 0 220 125' style='width:100%;max-width:300px;height:auto' role='img' aria-label='galvanometer'>" +
        "<path d='M30 105 A80 80 0 0 1 190 105' fill='none' stroke='currentColor' stroke-width='2' opacity='.5'/>";
      [-60, -30, 0, 30, 60].forEach(function (d) {
        var r2 = d * Math.PI / 180;
        g += "<line x1='" + (110 + 74 * Math.sin(r2)) + "' y1='" + (105 - 74 * Math.cos(r2)) + "' x2='" + (110 + 84 * Math.sin(r2)) + "' y2='" + (105 - 84 * Math.cos(r2)) + "' stroke='currentColor' stroke-width='2'/>";
      });
      g += "<line x1='110' y1='105' x2='" + nx.toFixed(1) + "' y2='" + ny.toFixed(1) + "' stroke='" + (bal ? "var(--ok)" : "var(--c-flow)") + "' stroke-width='3' stroke-linecap='round'/>" +
        "<circle cx='110' cy='105' r='5' fill='currentColor'/><text x='110' y='122' text-anchor='middle' font-size='12' fill='currentColor'>0</text></svg>";
      fb.innerHTML = g;
      read.innerHTML = "U_A = <b>" + TDC.util.fmtSI(VA, "V", 4) + "</b><br>U_B = <b>" + TDC.util.fmtSI(VB, "V", 4) + "</b><br>U_OUT = U_A − U_B = <b>" + TDC.util.fmtSI(Vo, "V", 3) + "</b> &nbsp; " +
        (bal ? "<span class='t4-ok'>" + ctx.tx(L("balanced", "tasapainossa")) + "</span>" : "<span class='t4-no'>" + ctx.tx(L("unbalanced", "epätasapainossa")) + "</span>") +
        "<br>R_X / R_V = <b>" + n3(v.RX / v.RV) + "</b><br>R₂ / R₄ = <b>" + n3(R2 / R4) + "</b>";
    }
    ctx.onLang(draw); draw();
    return { destroy: function () { host.innerHTML = ""; } };
  }

  /* ---------- static figures ---------- */
  var figVoltage = function (ideal, real) { return S.render({ w: 10, h: 8.4, alt: L("Ideal and real voltage source", "Ideaalinen ja todellinen jännitelähde"), texts: [
      { at: [1, 8.2], text: ideal, size: 12, color: "--muted" }, { at: [7, 8.2], text: real, size: 12, color: "--muted" }],
    parts: [{ id: "a", t: "V", a: [0, 7], b: [0, 0], label: "U = E", flip: true },
            { id: "b", t: "V", a: [6, 7], b: [6, 4], label: "E", flip: true }, { id: "c", t: "R", a: [6, 4], b: [6, 0], label: "Rᵢ", flip: true }],
    wires: [[[0, 0], [2, 0]], [[0, 7], [2, 7]], [[6, 0], [8, 0]], [[6, 7], [8, 7]]],
    terms: [{ at: [2, 0], text: "a", dx: 0.5 }, { at: [2, 7], text: "b", dx: 0.5 }, { at: [8, 0], text: "a", dx: 0.5 }, { at: [8, 7], text: "b", dx: 0.5 }] }); };
  var figCurrent = function (ideal, real) { return S.render({ w: 11, h: 8.4, alt: L("Ideal and real current source", "Ideaalinen ja todellinen virtalähde"), texts: [
      { at: [1, 8.2], text: ideal, size: 12, color: "--muted" }, { at: [7, 8.2], text: real, size: 12, color: "--muted" }],
    parts: [{ id: "a", t: "I", a: [0, 7], b: [0, 0], label: "I = I₀", flip: true },
            { id: "b", t: "I", a: [5, 7], b: [5, 0], label: "I₀", flip: true }, { id: "c", t: "R", a: [7.5, 0], b: [7.5, 7], label: "Rᵢ" }],
    wires: [[[0, 0], [2, 0]], [[0, 7], [2, 7]], [[5, 0], [9, 0]], [[5, 7], [9, 7]]], dots: [],
    terms: [{ at: [2, 0], text: "a", dx: 0.5 }, { at: [2, 7], text: "b", dx: 0.5 }, { at: [9, 0], text: "a", dx: 0.5 }, { at: [9, 7], text: "b", dx: 0.5 }] }); };
  var figEx41 = S.render(ex41({ load: true }));
  var figThev = S.render(theveninSpec(8, 6.6, 10, true));
  var figNortonEq = S.render({ w: 9.4, h: 6.6, alt: L("Norton equivalent with load", "Nortonin ekvivalentti ja kuorma"), rects: [],
    parts: [{ id: "In", t: "I", a: [0, 6], b: [0, 0], label: "Iₙ = 5 A", flip: true, color: "--c-3" }, { id: "Rn", t: "R", a: [3, 0], b: [3, 6], label: "Rₙ = 1,6 Ω", color: "--c-3" },
      { id: "RL", t: "R", a: [7, 0], b: [7, 6], label: "5 + 10 Ω" }],
    wires: [[[0, 0], [7, 0]], [[0, 6], [7, 6]]], dots: [[3, 0], [3, 6]], terms: [{ at: [7, 0], text: "A", dx: -0.1, dy: -0.55 }, { at: [7, 6], text: "B", dx: -0.1, dy: 0.55 }] });
  var figYD = S.render({ w: 17, h: 8.5, alt: L("Star and delta", "Tähti ja kolmio"), texts: [{ at: [3, 8.6], text: "Y", bold: true }, { at: [13, 8.6], text: "Δ", bold: true }, { at: [8, 3.6], text: "⇄", size: 28 }],
    parts: [{ id: "ya", t: "R", a: [3, 3.6], b: [1.4, 0.8], label: "R_a", color: "--c-1" }, { id: "yb", t: "R", a: [3, 3.6], b: [4.6, 0.8], label: "R_b", color: "--c-2", flip: true },
      { id: "yc", t: "R", a: [3, 3.6], b: [3, 7], label: "R_c", color: "--c-3" },
      { id: "dab", t: "R", a: [11.3, 0.8], b: [14.7, 0.8], label: "R_ab", color: "--c-1" }, { id: "dca", t: "R", a: [13, 6.8], b: [11.3, 0.8], label: "R_ca", color: "--c-2", flip: true },
      { id: "dbc", t: "R", a: [14.7, 0.8], b: [13, 6.8], label: "R_bc", color: "--c-3" }],
    wires: [], dots: [[3, 3.6]], terms: [{ at: [1.4, 0.8], text: "a", dx: -0.5 }, { at: [4.6, 0.8], text: "b", dx: 0.5 }, { at: [3, 7], text: "c", dy: 0.6, dx: 0 },
      { at: [11.3, 0.8], text: "a", dx: -0.5 }, { at: [14.7, 0.8], text: "b", dx: 0.5 }, { at: [13, 6.8], text: "c", dy: 0.6, dx: 0 }] });
  var figBridge = S.render({ w: 10.4, h: 6.6, alt: L("Wheatstone bridge", "Wheatstonen silta"),
    parts: [{ id: "Vs", t: "V", a: [0, 6], b: [0, 0], label: "Uₛ", flip: true }, { id: "R1", t: "R", a: [4, 0], b: [4, 3], label: "R₁" },
      { id: "R3", t: "R", a: [4, 3], b: [4, 6], label: "R₃" }, { id: "R2", t: "R", a: [8, 0], b: [8, 3], label: "R₂" },
      { id: "R4", t: "R", a: [8, 3], b: [8, 6], label: "R₄" }, { id: "G", t: "volt", sym: "U", a: [4, 3], b: [8, 3] }],
    wires: [[[0, 0], [8, 0]], [[0, 6], [8, 6]]], dots: [[4, 0], [4, 6]], terms: [{ at: [4, 3], text: "A", dx: -0.5 }, { at: [8, 3], text: "B", dx: 0.6 }] });
  var figEx44 = S.render({ w: 14.4, h: 8.6, alt: L("Example 4.4 network", "Esimerkin 4.4 verkko"),
    parts: [{ id: "U1", t: "V", a: [0, 8], b: [0, 5], label: "10 V", flip: true }, { id: "Ra", t: "R", a: [0, 5], b: [0, 2], label: "2 kΩ", flip: true },
      { id: "U2", t: "V", a: [4, 8], b: [4, 5], label: "6 V", flip: true }, { id: "Rb", t: "R", a: [4, 5], b: [4, 2], label: "3 kΩ", flip: true },
      { id: "I1", t: "I", a: [8, 3], b: [8, 0], label: "1 mA", flip: true }, { id: "Rc", t: "R", a: [10.5, 0], b: [10.5, 3], label: "600 Ω" },
      { id: "RL", t: "R", a: [13, 3], b: [13, 8], label: "200 Ω" }],
    wires: [[[0, 2], [0, 0]], [[4, 2], [4, 0]], [[0, 0], [10.5, 0]], [[0, 8], [13, 8]], [[8, 3], [13, 3]]], dots: [[4, 0], [8, 3], [10.5, 3]],
    terms: [{ at: [13, 3], text: "A", dx: -0.6, dy: -0.4 }, { at: [13, 8], text: "B", dx: -0.6, dy: 0.4 }, { at: [0, 0], text: "C", dx: -0.1, dy: -0.6 }, { at: [0, 8], text: "D", dx: -0.1, dy: 0.6 }] });
  var figEx45 = S.render({ w: 10.4, h: 6.6, alt: L("Example 4.5 bridge network", "Esimerkin 4.5 siltaverkko"),
    parts: [{ id: "V", t: "V", a: [0, 6], b: [0, 0], label: "12 V", flip: true }, { id: "Ra", t: "R", a: [3, 0], b: [3, 3], label: "5 Ω" },
      { id: "Rb", t: "R", a: [3, 3], b: [3, 6], label: "0,5 Ω" }, { id: "Rc", t: "R", a: [9, 0], b: [9, 3], label: "2 Ω" },
      { id: "Rd", t: "R", a: [9, 3], b: [9, 6], label: "0,4 Ω" }, { id: "Re", t: "R", a: [3, 3], b: [9, 3], label: "3 Ω" }],
    wires: [[[0, 0], [9, 0]], [[0, 6], [9, 6]]], dots: [[3, 3], [9, 3]],
    terms: [{ at: [3, 3], text: "M₁", dx: -0.6 }, { at: [9, 3], text: "M₂", dx: -0.1, dy: 0.0 }] });

  /* ---------- shared plot generators ---------- */
  function uiPlot(withLoad) {
    var params = [{ id: "E", tex: "U_{oc}", min: 1, max: 12, step: 0.5, value: 9, unit: "V" }, { id: "r", tex: "R_i", min: 0.5, max: 6, step: 0.5, value: 3, unit: "Ω" }];
    if (withLoad) params.push({ id: "RL", tex: "R_L", min: 0.5, max: 30, value: 6, unit: "Ω", log: true });
    return {
      x: { min: 0, max: 24, label: L("Current I", "Virta I"), unit: "A" },
      y: { min: 0, max: 12, label: L("Terminal voltage U", "Napajännite U"), unit: "V" },
      params: params,
      curves: [{ fn: function (x, p) { return p.E - p.r * x; }, label: L("U = U_oc − R_i·I (source)", "U = U_oc − R_i·I (lähde)"), color: "--c-1" }].concat(withLoad ?
        [{ fn: function (x, p) { return p.RL * x; }, label: L("U = R_L·I (load)", "U = R_L·I (kuorma)"), color: "--c-2", dash: true }] : []),
      points: function (p) {
        var pts = [{ x: 0, y: p.E, label: L("U_oc", "U_oc") }, { x: p.E / p.r, y: 0, label: L("I_sc", "I_sc") }];
        if (withLoad) { var i = p.E / (p.r + p.RL); pts.push({ x: i, y: i * p.RL, label: L("operating point", "toimintapiste") }); }
        return pts;
      },
      readouts: function (p) {
        var o = [{ tex: "U_{oc}", value: p.E, unit: "V" }, { tex: "I_{sc} = {U_{oc}}/{R_i}", value: p.E / p.r, unit: "A" }];
        if (withLoad) { var i = p.E / (p.r + p.RL); o.push({ tex: "I_L", value: i, unit: "A" }, { tex: "U_L", value: i * p.RL, unit: "V" }, { tex: "P_L", value: i * i * p.RL, unit: "W" }); }
        return o;
      }
    };
  }

  /* ================================================================================================ */
  TDC.registerTopic({
    id: "t4", num: 4,
    title: L("Thévenin's and Norton's theorems", "Théveninin ja Nortonin teoreemat"),
    subtitle: L("Replace a whole network by one source and one resistor: equivalents, source transformation, maximum power transfer, bridges.",
                "Korvaa koko verkko yhdellä lähteellä ja yhdellä vastuksella: ekvivalentit, lähdemuunnos, maksimitehon siirto ja siltakytkennät."),
    objectives: [
      L("distinguish ideal and real voltage and current sources", "erottaa ideaaliset ja todelliset jännite- ja virtalähteet toisistaan"),
      L("find U_T, R_T and I_N of a linear two-terminal network", "määrittää lineaarisen kaksinapaisen verkon U_T, R_T ja I_N"),
      L("convert between Thévenin and Norton equivalents with source transformation", "muuntaa Théveninin ja Nortonin ekvivalentit toisikseen lähdemuunnoksella"),
      L("use Y–Δ transformations to reduce bridge-type networks", "käyttää tähti-kolmiomuunnoksia siltakytkentöjen sieventämiseen"),
      L("find the load that receives maximum power", "määrittää kuorman, johon siirtyy suurin teho"),
      L("analyse a balanced and an unbalanced Wheatstone bridge", "analysoida tasapainotetun ja epätasapainoisen Wheatstonen sillan")
    ],
    glossary: {
      thevenin_theorem: { en: "Thévenin's theorem", fi: "Théveninin teoreema", def: L("Any linear two-terminal network is equivalent to one voltage source U_T in series with one resistance R_T.", "Mikä tahansa lineaarinen kaksinapainen verkko on ekvivalentti yhden jännitelähteen U_T ja sarjaan kytketyn resistanssin R_T kanssa.") },
      thevenin_equivalent: { en: "Thévenin equivalent", fi: "Théveninin ekvivalentti", sym: "U_T, R_T", def: L("The source U_T in series with R_T that replaces the network.", "Verkon korvaava lähde U_T ja sarjavastus R_T. Myös Théveninin sijaiskytkentä.") },
      norton_theorem: { en: "Norton's theorem", fi: "Nortonin teoreema", def: L("Any linear two-terminal network is equivalent to one current source I_N in parallel with one resistance R_N.", "Mikä tahansa lineaarinen kaksinapainen verkko on ekvivalentti yhden virtalähteen I_N ja rinnalle kytketyn resistanssin R_N kanssa.") },
      norton_equivalent: { en: "Norton equivalent", fi: "Nortonin ekvivalentti", sym: "I_N, R_N", def: L("The current source I_N in parallel with R_N.", "Virtalähde I_N ja rinnakkaisvastus R_N. Myös Nortonin sijaiskytkentä.") },
      source_transformation: { en: "source transformation", fi: "lähdemuunnos", def: L("Converting a voltage source with series resistor into a current source with parallel resistor, or back.", "Jännitelähteen ja sarjavastuksen muuntaminen virtalähteeksi ja rinnakkaisvastukseksi tai päinvastoin.") },
      voltage_source: { en: "voltage source", fi: "jännitelähde", def: L("A source that keeps its voltage; ideal: independent of current.", "Lähde, joka pyrkii pitämään jännitteensä; ideaalinen: jännite ei riipu virrasta.") },
      current_source: { en: "current source", fi: "virtalähde", def: L("A source that keeps its current; ideal: independent of voltage.", "Lähde, joka pyrkii pitämään virtansa; ideaalinen: virta ei riipu jännitteestä.") },
      emf: { en: "electromotive force (emf)", fi: "lähdejännite", sym: "E", def: L("Open-circuit voltage of a source.", "Lähteen tyhjäkäyntijännite (sähkömotorinen voima).") },
      internal_resistance: { en: "internal resistance", fi: "sisäresistanssi", sym: "R_i", def: L("Resistance inside a real source that makes its terminal voltage drop under load.", "Todellisen lähteen sisäinen resistanssi, joka pienentää napajännitettä kuormitettaessa.") },
      open_circuit_voltage: { en: "open-circuit voltage", fi: "tyhjäkäyntijännite", sym: "U_oc", def: L("Voltage across the terminals when nothing is connected (I = 0).", "Napojen välinen jännite, kun mitään ei ole kytketty (I = 0).") },
      short_circuit_current: { en: "short-circuit current", fi: "oikosulkuvirta", sym: "I_sc", def: L("Current through a wire connected across the terminals (U = 0).", "Napojen yli kytketyn johtimen virta (U = 0).") },
      short_circuit: { en: "short circuit", fi: "oikosulku", def: L("A zero-resistance connection (a wire).", "Nollaresistanssinen yhteys (johdin).") },
      open_circuit: { en: "open circuit", fi: "avoin piiri, tyhjäkäynti", def: L("A break in the circuit: no current can flow.", "Katkos piirissä: virta ei voi kulkea.") },
      equivalent_resistance: { en: "equivalent resistance", fi: "sijaisresistanssi", sym: "R_T", def: L("Resistance seen from the terminals with all sources deactivated.", "Napoihin nähtävä resistanssi, kun kaikki lähteet on kytketty pois.") },
      load_resistance: { en: "load resistance", fi: "kuormaresistanssi", sym: "R_L", def: L("Resistance connected to the terminals that draws power.", "Napoihin kytketty resistanssi, joka ottaa tehoa.") },
      terminals: { en: "terminals", fi: "navat", def: L("The two connection points a–b (A–B) of a two-terminal network.", "Kaksinapaisen verkon kaksi liityntäpistettä a–b (A–B).") },
      active_network: { en: "active network", fi: "aktiivinen verkko", def: L("A network that contains sources.", "Lähteitä sisältävä verkko.") },
      linear_network: { en: "linear network", fi: "lineaarinen verkko", def: L("A network of linear elements: voltages and currents scale proportionally.", "Lineaarisista elementeistä koostuva verkko: jännitteet ja virrat skaalautuvat verrannollisesti.") },
      current_divider: { en: "current divider", fi: "virranjakaja", def: L("Parallel branches share a current in inverse proportion to their resistances.", "Rinnakkaishaarat jakavat virran käänteisesti resistanssien suhteessa.") },
      voltage_divider: { en: "voltage divider", fi: "jännitteenjakaja", def: L("Series resistors share a voltage in proportion to their resistances.", "Sarjavastukset jakavat jännitteen resistanssien suhteessa.") },
      star_connection: { en: "star connection (Y)", fi: "tähtikytkentä", def: L("Three resistors joined at a common point.", "Kolme yhteisestä pisteestä lähtevää vastusta.") },
      delta_connection: { en: "delta connection (Δ)", fi: "kolmiokytkentä", def: L("Three resistors forming a triangle.", "Kolme kolmioksi kytkettyä vastusta.") },
      star_delta: { en: "star–delta transformation", fi: "tähti-kolmiomuunnos", def: L("Replacing a Y by an equivalent Δ or vice versa.", "Tähden korvaaminen kolmiolla tai päinvastoin.") },
      max_power_transfer: { en: "maximum power transfer", fi: "maksimitehon siirto", def: L("The load gets maximum power when R_L = R_T.", "Kuorma saa suurimman tehon, kun R_L = R_T.") },
      power_matching: { en: "power matching", fi: "tehosovitus", def: L("Choosing R_L = R_T.", "Kuormituksen valinta R_L = R_T.") },
      load_line: { en: "I,V-line (load line)", fi: "virta-jännitekäyrä, kuormasuora", def: L("Straight line U = U_oc − R_i·I of a real source.", "Todellisen lähteen suora U = U_oc − R_i·I.") },
      wheatstone_bridge: { en: "Wheatstone bridge", fi: "Wheatstonen silta", def: L("Two voltage dividers whose midpoints are compared.", "Kaksi jännitteenjakajaa, joiden keskipisteitä verrataan.") },
      balanced_bridge: { en: "balanced bridge", fi: "tasapainotettu silta", def: L("A bridge with U_OUT = 0; R₁/R₃ = R₂/R₄.", "Silta, jossa U_OUT = 0; R₁/R₃ = R₂/R₄.") },
      unbalanced_bridge: { en: "unbalanced bridge", fi: "epätasapainoinen silta", def: L("A bridge whose output voltage tells a resistance change.", "Silta, jonka lähtöjännite kertoo resistanssin muutoksen.") },
      thermistor: { en: "thermistor", fi: "termistori", def: L("Resistor whose resistance depends strongly on temperature.", "Vastus, jonka resistanssi riippuu voimakkaasti lämpötilasta.") }
    },
    formulas: [
      { name: L("Real voltage source", "Todellinen jännitelähde"), tex: "U = E − R_i · I" },
      { name: L("Thévenin: load current", "Thévenin: kuormavirta"), tex: "I = {U_T}/{R_T + R_L}" },
      { name: L("Norton: load current (current divider)", "Norton: kuormavirta (virranjako)"), tex: "I = {R_N}/{R_N + R_L} · I_N" },
      { name: L("Source transformation", "Lähdemuunnos"), tex: "I_N = {U_T}/{R_T},  U_T = I_N · R_T" },
      { name: L("Star to delta", "Tähti kolmioksi"), tex: "R_{ab} = R_a + R_b + {R_a R_b}/{R_c}" },
      { name: L("Delta to star", "Kolmio tähdeksi"), tex: "R_a = {R_{ab} R_{ca}}/{R_{ab} + R_{bc} + R_{ca}}" },
      { name: L("Load power", "Kuorman teho"), tex: "P_L = {R_L U_T^2}/{(R_T + R_L)^2}" },
      { name: L("Maximum power", "Maksimiteho"), tex: "R_L = R_T,  P_{max} = {U_T^2}/{4 R_T}" },
      { name: L("Balanced Wheatstone bridge", "Tasapainotettu Wheatstonen silta"), tex: "{R_1}/{R_3} = {R_2}/{R_4}" }
    ],

    sections: [
      /* ------------------------------------------------------------------ 4.0 sources */
      {
        id: "t4-sources", title: L("Ideal and real sources", "Ideaaliset ja todelliset lähteet"),
        blocks: [
          { id: "t4-sources-p1", type: "text", html: L(
            "<p>A network with many sources and resistors can be hard to analyse. Often we care about only one branch, the <b>load</b>. The idea of this topic: look at the rest of the network from the load's two terminals and replace it with something much simpler.</p><p>First we need the building blocks: the four kinds of sources.</p>",
            "<p>Monta lähdettä ja vastusta sisältävää verkkoa on vaikea analysoida. Usein kiinnostaa vain yksi haara, <b>kuorma</b>. Tämän aiheen ajatus: katsotaan loppuverkkoa kuorman kahdesta navasta ja korvataan se paljon yksinkertaisemmalla.</p><p>Tarvitsemme ensin rakennuspalikat: neljä lähdetyyppiä.</p>") },
          { id: "t4-sources-cols", type: "columns", cols: [
            [{ id: "t4-sources-figv", type: "figure", svg: { en: figVoltage('ideal', 'real'), fi: figVoltage('ideaalinen', 'todellinen') }, caption: L("Voltage sources: ideal (left), real = E in series with R_i (right).", "Jännitelähteet: ideaalinen (vasen), todellinen = E ja sarjaan R_i (oikea)."), alt: L("Ideal and real voltage source", "Ideaalinen ja todellinen jännitelähde") }],
            [{ id: "t4-sources-figi", type: "figure", svg: { en: figCurrent('ideal', 'real'), fi: figCurrent('ideaalinen', 'todellinen') }, caption: L("Current sources: ideal (left), real = I₀ in parallel with R_i (right).", "Virtalähteet: ideaalinen (vasen), todellinen = I₀ ja rinnalle R_i (oikea)."), alt: L("Ideal and real current source", "Ideaalinen ja todellinen virtalähde") }]
          ] },
          { id: "t4-sources-p2", type: "text", html: L(
            "<p>An <b>ideal voltage source</b> holds its voltage whatever current is drawn. An <b>ideal current source</b> pushes its current whatever voltage appears across it.</p><p>A <b>real voltage source</b> (a battery) has an <dfn data-term='internal_resistance'>internal resistance</dfn> <f>R_i</f> in series. The more current it supplies, the more voltage is lost inside it.</p>",
            "<p><b>Ideaalinen jännitelähde</b> pitää jännitteensä riippumatta otetusta virrasta. <b>Ideaalinen virtalähde</b> pakottaa virtansa riippumatta siihen muodostuvasta jännitteestä.</p><p><b>Todellisella jännitelähteellä</b> (paristolla) on sarjassa <dfn data-term='internal_resistance'>sisäresistanssi</dfn> <f>R_i</f>. Mitä suurempi virta otetaan, sitä enemmän jännitettä hukkuu lähteen sisälle.</p>") },
          { id: "t4-sources-f1", type: "formula", key: true, tex: "U = E − R_i · I", label: L("Terminal voltage of a real source (I,V-line)", "Todellisen lähteen napajännite (virta-jännitekäyrä)"),
            legend: [["U", L("terminal voltage", "napajännite"), "V"], ["E", L("emf = open-circuit voltage U_oc", "lähdejännite = tyhjäkäyntijännite U_oc"), "V"], ["R_i", L("internal resistance", "sisäresistanssi"), "Ω"], ["I", L("load current", "kuormavirta"), "A"]] },
          { id: "t4-sources-plot", type: "interactive", widget: "plot", title: L("The I,V-line of a real source", "Todellisen lähteen virta-jännitekäyrä"),
            caption: L("Change U_oc and R_i. The line meets the voltage axis at U_oc (open circuit, I = 0) and the current axis at I_sc = U_oc/R_i (short circuit, U = 0).",
                       "Muuta U_oc:ta ja R_i:tä. Suora leikkaa jänniteakselin pisteessä U_oc (tyhjäkäynti, I = 0) ja virta-akselin pisteessä I_sc = U_oc/R_i (oikosulku, U = 0)."),
            config: uiPlot(false) },
          { id: "t4-sources-c1", type: "callout", kind: "warn", title: L("Careful with shorts and opens", "Varo oikosulkua ja katkosta"),
            html: L("Never short an ideal <em>voltage</em> source (infinite current). Never open an ideal <em>current</em> source (infinite voltage). A real battery survives a short circuit only because <f>R_i</f> limits the current to <f>I_sc = E/R_i</f>, and then all its power heats the battery itself.",
                    "Älä koskaan oikosulje ideaalista <em>jännite</em>lähdettä (ääretön virta). Älä koskaan katkaise ideaalista <em>virta</em>lähdettä (ääretön jännite). Todellinen paristo kestää oikosulun vain siksi, että <f>R_i</f> rajoittaa virran arvoon <f>I_sc = E/R_i</f>, ja silloin koko teho lämmittää paristoa itseään.") },
          { id: "t4-sources-q1", type: "question", q: "t4-q-src" }
        ]
      },

      /* ------------------------------------------------------------------ 4.1 Thévenin */
      {
        id: "t4-thevenin", title: L("Thévenin's theorem", "Théveninin teoreema"),
        blocks: [
          { id: "t4-th-p1", type: "text", html: L(
            "<p><b>Thévenin's theorem.</b> In any <dfn data-term='linear_network'>linear</dfn> electrical network, any branch with two terminals is electrically equivalent to a single voltage source <f>U_T</f> in series with a single resistance <f>R_T</f>.</p><p>So no matter how complicated the network is (resistors, voltage sources, current sources), from the terminals A–B it behaves like a battery with an internal resistance.</p>",
            "<p><b>Théveninin teoreema.</b> Missä tahansa <dfn data-term='linear_network'>lineaarisessa</dfn> verkossa mikä tahansa kaksinapainen haara on sähköisesti ekvivalentti yhden jännitelähteen <f>U_T</f> ja sarjaan kytketyn yhden resistanssin <f>R_T</f> kanssa.</p><p>Verkon monimutkaisuudella (vastukset, jännitelähteet, virtalähteet) ei ole väliä: navoista A–B katsottuna se käyttäytyy kuin paristo, jolla on sisäresistanssi.</p>") },
          { id: "t4-th-f1", type: "formula", key: true, tex: "I = {U_T}/{R_T + R_L}", label: L("Load current from the Thévenin equivalent", "Kuormavirta Théveninin ekvivalentista"),
            legend: [["U_T", L("Thévenin voltage = open-circuit voltage U_AB", "Théveninin jännite = tyhjäkäyntijännite U_AB"), "V"], ["R_T", L("Thévenin resistance seen from A–B", "Théveninin resistanssi navoista A–B nähtynä"), "Ω"], ["R_L", L("load resistance", "kuormaresistanssi"), "Ω"]] },
          { id: "t4-th-h1", type: "h", text: L("The procedure", "Menettely") },
          { id: "t4-th-l1", type: "list", ordered: true, items: [
            L("<b>Remove the load</b> <f>R_L</f> from the branch. The terminals A–B are now open.", "<b>Poista kuorma</b> <f>R_L</f> haarasta. Navat A–B jäävät avoimiksi."),
            L("Find the <b>open-circuit voltage</b> across the break: <f>U_T = U_AB</f>.", "Määritä katkoksen yli oleva <b>tyhjäkäyntijännite</b>: <f>U_T = U_AB</f>."),
            L("<b>Deactivate every source</b>: replace each voltage source by a <b>short circuit</b> (a wire) and each current source by an <b>open circuit</b> (a gap). Find the resistance <f>R_T</f> looking into A–B.", "<b>Kytke kaikki lähteet pois</b>: korvaa jokainen jännitelähde <b>oikosululla</b> (johdin) ja jokainen virtalähde <b>katkoksella</b> (avoin piiri). Määritä navoista A–B nähty resistanssi <f>R_T</f>."),
            L("Connect the load to the equivalent source and compute <f>I = U_T/(R_T + R_L)</f>.", "Kytke kuorma ekvivalenttiin lähteeseen ja laske <f>I = U_T/(R_T + R_L)</f>.")
          ] },
          { id: "t4-th-c1", type: "callout", kind: "warn", title: L("Common misconception", "Yleinen harhakäsitys"),
            html: L("\"Removing\" a voltage source does <b>not</b> mean cutting its branch. A voltage source is <b>shorted</b> (replaced by a wire) and a current source is <b>opened</b>. Mixing these up gives a wrong <f>R_T</f>.",
                    "Jännitelähteen \"poistaminen\" ei tarkoita sen haaran katkaisemista. Jännitelähde <b>oikosuljetaan</b> (korvataan johtimella) ja virtalähde <b>avataan</b>. Näiden sekoittaminen johtaa väärään <f>R_T</f>:hen.") },
          { id: "t4-th-fig1", type: "figure", svg: figEx41, caption: L("Network of Example 4.1: find the current in the 10 Ω resistor.", "Esimerkin 4.1 verkko: laske virta 10 Ω:n vastuksessa."), alt: L("Circuit of Example 4.1", "Esimerkin 4.1 piiri") },
          { id: "t4-th-wiz", type: "interactive", widget: "custom", title: L("Collapse the network into a black box", "Tiivistä verkko mustaksi laatikoksi"),
            caption: L("Step through Example 4.1 with the arrow buttons.", "Käy esimerkki 4.1 läpi nuolipainikkeilla."), config: { mount: wizardMount } },
          { id: "t4-th-circ1", type: "interactive", widget: "circuit", title: L("Measure U_oc and I_sc in the simulator", "Mittaa U_oc ja I_sc simulaattorilla"),
            caption: L("Click the switch S1 to open the load branch: the voltmeter then shows the open-circuit voltage U_T = 8 V. Close S1 again and use the wire tool to short R (draw across it): the ammeter now shows the short-circuit current I_sc = U_T/R_T. Edit the source or resistors by clicking them.",
                       "Napsauta kytkintä S1 avataksesi kuormahaaran: volttimittari näyttää tyhjäkäyntijännitteen U_T = 8 V. Sulje S1 ja oikosulje R johtimella (piirrä sen yli): virtamittari näyttää oikosulkuvirran I_sc = U_T/R_T. Muokkaa lähdettä ja vastuksia napsauttamalla niitä."),
            config: {
              size: [11, 6],
              parts: [
                { id: "U1", type: "V", a: [0, 6], b: [0, 3], value: 10, editable: { min: 1, max: 24, step: 0.5 }, label: "U" },
                { id: "R1", type: "R", a: [0, 3], b: [0, 0], value: 2, editable: { min: 1, max: 20, step: 0.5 }, label: "R1" },
                { id: "R2", type: "R", a: [4, 0], b: [4, 6], value: 8, editable: { min: 1, max: 20, step: 0.5 }, label: "R2" },
                { id: "R3", type: "R", a: [4, 0], b: [8, 0], value: 5, editable: { min: 1, max: 20, step: 0.5 }, label: "R3", labelSide: "other" },
                { id: "S1", type: "switch", a: [8, 0], b: [8, 1], closed: true },
                { id: "A1", type: "ammeter", a: [8, 1], b: [8, 2] },
                { id: "RL", type: "R", a: [8, 2], b: [8, 5], value: 10, editable: { min: 1, max: 50, step: 1 }, label: "R" },
                { id: "VM", type: "voltmeter", a: [10, 0], b: [10, 6] }
              ],
              wires: [[[0, 0], [4, 0]], [[8, 5], [8, 6]], [[0, 6], [10, 6]], [[8, 0], [10, 0]]],
              labels: [{ at: [8, 0], text: "A", dx: -10, dy: -8 }, { at: [8, 6], text: "B", dx: -10, dy: 12 }],
              ground: [0, 6], tools: ["wire", "cut"], show: { values: true, flow: true }, table: true
            } },
          { id: "t4-th-ex1", type: "example", title: L("Example 4.1: Thévenin's theorem", "Esimerkki 4.1: Théveninin teoreema"),
            problem: L("Find the current in the 10 Ω resistor of the network above using Thévenin's theorem.", "Laske yllä olevan verkon 10 Ω:n vastuksen virta Théveninin teoreemalla."),
            given: ["U = 10 V", "R₁ = 2 Ω", "R₂ = 8 Ω", "R₃ = 5 Ω", "R = 10 Ω"],
            steps: [
              L("Remove the 10 Ω resistor. With A–B open, no current flows in R₃, so the only loop is U, R₁, R₂:", "Poista 10 Ω:n vastus. Navat A–B ovat avoimet, joten R₃:ssa ei kulje virtaa ja ainoa silmukka on U, R₁, R₂:"),
              { tex: "I_1 = {10 V}/{R_1 + R_2} = {10 V}/{(2 + 8) Ω} = 1,0 A" },
              L("The open-circuit voltage is the voltage across R₂:", "Tyhjäkäyntijännite on R₂:n jännite:"),
              { tex: "U_T = U_{AB} = I_1 · R_2 = 1,0 A · 8 Ω = 8,0 V" },
              L("Short the voltage source. Looking into A–B we see R₃ in series with R₁ ∥ R₂:", "Oikosulje jännitelähde. Navoista A–B nähdään R₃ sarjassa rinnankytkennän R₁ ∥ R₂ kanssa:"),
              { tex: "R_T = R_3 + {R_1 R_2}/{R_1 + R_2} = 5 + {2 · 8}/{2 + 8} = 6,6 Ω" },
              L("Connect the 10 Ω load to the equivalent source:", "Kytke 10 Ω:n kuorma ekvivalenttiin lähteeseen:"),
              { tex: "I = {U_T}/{R_T + R} = {8 V}/{(6,6 + 10) Ω} = 0,482 A" }
            ],
            result: L("U_T = 8,0 V, R_T = 6,6 Ω, I = 0,482 A", "U_T = 8,0 V, R_T = 6,6 Ω, I = 0,482 A") },
          { id: "t4-th-fig2", type: "figure", svg: figThev, caption: L("The Thévenin equivalent of Example 4.1: 8 V in series with 6,6 Ω, loaded with 10 Ω.", "Esimerkin 4.1 Théveninin ekvivalentti: 8 V ja sarjaan 6,6 Ω, kuormana 10 Ω."), alt: L("Thévenin equivalent", "Théveninin ekvivalentti") },
          // (extra)
          { id: "t4-th-ex2", type: "example", title: L("Extra: a voltage divider as source", "Lisäesimerkki: jännitteenjakaja lähteenä"),
            problem: L("A 20 V source in series with 5 Ω feeds terminals A–B; a 20 Ω resistor is connected across A–B. Find U_T, R_T and the current in a 10 Ω load connected to A–B.", "20 V:n lähde ja sarjaan 5 Ω syöttää napoja A–B; 20 Ω:n vastus on kytketty napojen A–B yli. Laske U_T, R_T ja napoihin A–B kytketyn 10 Ω:n kuorman virta."),
            given: ["U = 20 V", "R₁ = 5 Ω", "R₂ = 20 Ω", "R_L = 10 Ω"],
            steps: [
              { tex: "U_T = U · {R_2}/{R_1 + R_2} = 20 · {20}/{25} = 16 V" },
              { tex: "R_T = R_1 ∥ R_2 = {5 · 20}/{25} = 4 Ω" },
              { tex: "I = {16 V}/{(4 + 10) Ω} = 1,143 A" }
            ],
            result: L("U_T = 16 V, R_T = 4 Ω, I = 1,14 A", "U_T = 16 V, R_T = 4 Ω, I = 1,14 A") },
          { id: "t4-th-h2", type: "h", text: L("How do I find R_T? Switch the sources off", "Miten R_T löytyy? Kytke lähteet pois") },
          { id: "t4-th-tog", type: "interactive", widget: "custom", title: L("Source switches and ohmmeter", "Lähdekytkimet ja ohmimittari"),
            caption: L("Replace the voltage source by a wire and remove the current source. Only then does the ohmmeter at A–B show R_T.", "Korvaa jännitelähde johtimella ja poista virtalähde. Vasta sitten ohmimittari navoissa A–B näyttää R_T:n."), config: { mount: togglesMount } },
          { id: "t4-th-circ2", type: "interactive", widget: "circuit", title: L("Try it: short the source", "Kokeile: oikosulje lähde"),
            caption: L("The ideal 12 V source and the 1 A current source are in the network. Use the wire tool to put a wire across the voltage source and the cut tool on the wire of the current-source branch. Watch how the values change.", "Verkossa on ideaalinen 12 V:n lähde ja 1 A:n virtalähde. Piirrä johdin jännitelähteen yli ja katkaise virtalähdehaaran johdin. Seuraa, miten arvot muuttuvat."),
            config: {
              size: [10, 6],
              parts: [
                { id: "U1", type: "V", a: [0, 6], b: [0, 3], value: 12, label: "U" },
                { id: "R1", type: "R", a: [0, 3], b: [0, 0], value: 6, label: "R1" },
                { id: "R2", type: "R", a: [4, 0], b: [4, 6], value: 3, label: "R2" },
                { id: "I1", type: "I", a: [7, 6], b: [7, 3], value: 1, label: "I" },
                { id: "VM", type: "voltmeter", a: [9, 0], b: [9, 6] }
              ],
              wires: [[[0, 0], [9, 0]], [[0, 6], [9, 6]], [[7, 3], [7, 0]]],
              labels: [{ at: [9, 0], text: "A", dx: 10, dy: -8 }, { at: [9, 6], text: "B", dx: 10, dy: 12 }],
              ground: [0, 6], tools: ["wire", "cut"], allowCutAll: true, show: { values: true, flow: true }, table: true
            } },
          { id: "t4-th-h3", type: "h", text: L("Same load, same current", "Sama kuorma, sama virta") },
          { id: "t4-th-twin", type: "interactive", widget: "custom", title: L("Original network vs. Thévenin equivalent", "Alkuperäinen verkko ja Théveninin ekvivalentti"),
            caption: L("Change any element: the load current is the same in both networks, because from the load's view they are equivalent. (Only the inside of the black box differs: heat in the source resistors is not the same.)", "Muuta mitä tahansa elementtiä: kuormavirta on sama molemmissa, koska kuorman kannalta ne ovat ekvivalentit. (Vain laatikon sisus eroaa: lähteen sisäiset häviöt eivät ole samat.)"), config: { mount: twinMount } },
          { id: "t4-th-q1", type: "question", q: "t4-q-th1" },
          { id: "t4-th-q2", type: "question", q: "t4-q-th2" },
          { id: "t4-th-q3", type: "question", q: "t4-q-th3" },
          { id: "t4-th-q4", type: "question", q: "t4-q-th4" },
          { id: "t4-th-q5", type: "question", q: "t4-q-th5" },
          { id: "t4-th-q6", type: "question", q: "t4-q-isc" }
        ]
      },

      /* ------------------------------------------------------------------ 4.2 Norton */
      {
        id: "t4-norton", title: L("Norton's theorem", "Nortonin teoreema"),
        blocks: [
          { id: "t4-no-p1", type: "text", html: L(
            "<p><b>Norton's theorem.</b> In a linear network, any combination of voltage sources, current sources and resistors with two terminals is electrically equivalent to an ideal current source <f>I_N</f> in parallel with a single resistor <f>R_N</f>.</p><p>It is Thévenin's theorem seen from the other side: instead of the open-circuit voltage we measure the <dfn data-term='short_circuit_current'>short-circuit current</dfn>.</p>",
            "<p><b>Nortonin teoreema.</b> Lineaarisessa verkossa mikä tahansa kaksinapainen jännitelähteiden, virtalähteiden ja vastusten yhdistelmä on sähköisesti ekvivalentti ideaalisen virtalähteen <f>I_N</f> ja sen rinnalle kytketyn yhden vastuksen <f>R_N</f> kanssa.</p><p>Se on Théveninin teoreema toiselta puolelta nähtynä: tyhjäkäyntijännitteen sijaan mitataan <dfn data-term='short_circuit_current'>oikosulkuvirta</dfn>.</p>") },
          { id: "t4-no-l1", type: "list", ordered: true, items: [
            L("<b>Short-circuit</b> the terminals A–B (replace the load by a wire).", "<b>Oikosulje</b> navat A–B (korvaa kuorma johtimella)."),
            L("Find the <b>short-circuit current</b> <f>I_N = I_sc</f> in the wire.", "Määritä johtimessa kulkeva <b>oikosulkuvirta</b> <f>I_N = I_sc</f>."),
            L("Deactivate the sources (voltage sources shorted, <b>current sources opened</b>) and find <f>R_N</f> looking into A–B. It is the same number as <f>R_T</f>.", "Kytke lähteet pois (jännitelähteet oikosuljetaan, <b>virtalähteet avataan</b>) ja määritä navoista A–B nähty <f>R_N</f>. Se on sama luku kuin <f>R_T</f>."),
            L("Find the load current with the current divider.", "Laske kuormavirta virranjaolla.")
          ] },
          { id: "t4-no-f1", type: "formula", key: true, tex: "I = {R_N}/{R_N + R_L} · I_N", label: L("Load current from the Norton equivalent", "Kuormavirta Nortonin ekvivalentista"),
            legend: [["I_N", L("short-circuit current", "oikosulkuvirta"), "A"], ["R_N", L("= R_T, resistance seen from A–B", "= R_T, navoista A–B nähty resistanssi"), "Ω"], ["R_L", L("load resistance", "kuormaresistanssi"), "Ω"]] },
          { id: "t4-no-circ", type: "interactive", widget: "circuit", title: L("Short-circuit current", "Oikosulkuvirta"),
            caption: L("Close the switch S1: it shorts the terminals A–B through the ammeter. The ammeter shows I_N = 5 A; R₃ and the load now carry no current. (Terminals A–B are placed in front of R₃, so R₃ belongs to the load: this is Example 4.2.)",
                       "Sulje kytkin S1: se oikosulkee navat A–B ampeerimittarin kautta. Ampeerimittari näyttää I_N = 5 A; R₃:ssa ja kuormassa ei kulje virtaa. (Navat A–B ovat R₃:n edessä, joten R₃ kuuluu kuormaan: tämä on esimerkki 4.2.)"),
            config: {
              size: [10, 6],
              parts: [
                { id: "U1", type: "V", a: [0, 6], b: [0, 3], value: 10, label: "U" },
                { id: "R1", type: "R", a: [0, 3], b: [0, 0], value: 2, label: "R1", editable: { min: 1, max: 20, step: 0.5 } },
                { id: "R2", type: "R", a: [4, 0], b: [4, 6], value: 8, label: "R2", editable: { min: 1, max: 20, step: 0.5 } },
                { id: "S1", type: "switch", a: [6, 0], b: [6, 1], closed: false },
                { id: "A1", type: "ammeter", a: [6, 1], b: [6, 2] },
                { id: "R3", type: "R", a: [6, 0], b: [9, 0], value: 5, label: "R3", labelSide: "other" },
                { id: "RL", type: "R", a: [9, 0], b: [9, 6], value: 10, label: "R" }
              ],
              wires: [[[0, 0], [6, 0]], [[0, 6], [9, 6]], [[6, 2], [6, 6]]],
              labels: [{ at: [4, 0], text: "A", dx: -10, dy: -8 }, { at: [4, 6], text: "B", dx: -10, dy: 12 }],
              ground: [0, 6], tools: ["wire", "cut"], show: { values: true, flow: true }, table: true
            } },
          { id: "t4-no-ex1", type: "example", title: L("Example 4.2: Norton's theorem", "Esimerkki 4.2: Nortonin teoreema"),
            problem: L("Find the current in the 10 Ω resistor of Example 4.1 using Norton's theorem. Place A–B in front of the 5 Ω resistor, so the 5 Ω resistor belongs to the load branch.", "Laske esimerkin 4.1 10 Ω:n vastuksen virta Nortonin teoreemalla. Sijoita navat A–B 5 Ω:n vastuksen eteen, jolloin 5 Ω kuuluu kuormahaaraan."),
            given: ["U = 10 V", "R₁ = 2 Ω", "R₂ = 8 Ω", "load branch = 5 Ω + 10 Ω"],
            steps: [
              L("Short A–B. The 8 Ω resistor is bypassed by the short, so only the source and R₁ drive the short-circuit current:", "Oikosulje A–B. Oikosulku ohittaa 8 Ω:n vastuksen, joten oikosulkuvirran ajavat vain lähde ja R₁:"),
              { tex: "I_N = I_{sc} = {10 V}/{2 Ω} = 5 A" },
              L("Deactivate the source (short it) and look into A–B: R₁ ∥ R₂:", "Kytke lähde pois (oikosulku) ja katso navoista A–B: R₁ ∥ R₂:"),
              { tex: "R_N = {2 · 8}/{2 + 8} = 1,6 Ω" },
              L("The 5 Ω and 10 Ω in the load branch are in series; current divider:", "Kuormahaaran 5 Ω ja 10 Ω ovat sarjassa; virranjako:"),
              { tex: "I = {R_N}/{R_N + 5 + 10} · I_N = {1,6}/{1,6 + 15} · 5 A = 0,482 A" }
            ],
            result: L("I_N = 5 A, R_N = 1,6 Ω, I = 0,482 A (same as with Thévenin)", "I_N = 5 A, R_N = 1,6 Ω, I = 0,482 A (sama kuin Théveninillä)") },
          { id: "t4-no-fig", type: "figure", svg: figNortonEq, caption: L("Norton equivalent of Example 4.2: 5 A in parallel with 1,6 Ω, loaded with 5 + 10 Ω.", "Esimerkin 4.2 Nortonin ekvivalentti: 5 A ja rinnalle 1,6 Ω, kuormana 5 + 10 Ω."), alt: L("Norton equivalent", "Nortonin ekvivalentti") },
          { id: "t4-no-c1", type: "callout", kind: "info", title: L("Where you put A–B matters", "Napojen A–B paikalla on väliä"),
            html: L("Thévenin used A–B after R₃ (R_T = 6,6 Ω), Norton used A–B before R₃ (R_N = 1,6 Ω). The equivalents differ because the terminals differ, but the load current is the same: 0,482 A.",
                    "Thévenin-esimerkissä A–B oli R₃:n jälkeen (R_T = 6,6 Ω), Norton-esimerkissä R₃:n edessä (R_N = 1,6 Ω). Ekvivalentit eroavat, koska navat eroavat, mutta kuormavirta on sama: 0,482 A.") },
          // (extra)
          { id: "t4-no-ex2", type: "example", title: L("Extra: a current source with a parallel resistor", "Lisäesimerkki: virtalähde ja rinnakkaisvastus"),
            problem: L("A 6 A current source with 10 Ω in parallel feeds a 15 Ω load. Find the load current directly, and via a Thévenin equivalent.", "6 A:n virtalähde ja sen rinnalla 10 Ω syöttää 15 Ω:n kuormaa. Laske kuormavirta suoraan sekä Théveninin ekvivalentin avulla."),
            given: ["I_N = 6 A", "R_N = 10 Ω", "R_L = 15 Ω"],
            steps: [
              { tex: "I = {10}/{10 + 15} · 6 A = 2,4 A" },
              { tex: "U_T = I_N · R_N = 60 V,   R_T = 10 Ω" },
              { tex: "I = {60 V}/{(10 + 15) Ω} = 2,4 A" }
            ],
            result: L("I = 2,4 A both ways", "I = 2,4 A kumpaakin tietä") },
          { id: "t4-no-q1", type: "question", q: "t4-q-no1" }
        ]
      },

      /* ------------------------------------------------------------------ 4.3 equivalents and source transformation */
      {
        id: "t4-equiv", title: L("Thévenin–Norton conversion and source transformation", "Thévenin–Norton-muunnos ja lähdemuunnos"),
        blocks: [
          { id: "t4-eq-p1", type: "text", html: L(
            "<p>The Thévenin and Norton equivalents describe the <em>same</em> terminal behaviour, so they can be converted into each other. Both have the same resistance <f>R_T = R_N</f> looking into A–B. The short-circuit current must also agree: for the Thévenin source it is <f>U_T/R_T</f>.</p>",
            "<p>Théveninin ja Nortonin ekvivalentit kuvaavat <em>samaa</em> napakäyttäytymistä, joten ne voi muuntaa toisikseen. Molemmilla on sama resistanssi <f>R_T = R_N</f> navoista A–B katsottuna. Myös oikosulkuvirran on oltava sama: Thévenin-lähteellä se on <f>U_T/R_T</f>.</p>") },
          { id: "t4-eq-f1", type: "formula", key: true, tex: "I_N = {U_T}/{R_T},    U_T = I_N · R_T,    R_N = R_T", label: L("Source transformation", "Lähdemuunnos"),
            legend: [["U_T", L("voltage of the voltage source", "jännitelähteen jännite"), "V"], ["I_N", L("current of the current source", "virtalähteen virta"), "A"], ["R_T = R_N", L("same resistor, in series (Th) or in parallel (No)", "sama vastus, sarjassa (Th) tai rinnan (No)"), "Ω"]] },
          { id: "t4-eq-p2", type: "text", html: L(
            "<p>Why does it work? A voltage source <f>U_T</f> with series <f>R_T</f> and load <f>R</f> gives <f>I = {U_T}/{R_T + R} = {R_T}/{R_T + R} · {U_T}/{R_T}</f>, which is exactly a current source <f>I_N = U_T/R_T</f> split between <f>R_T</f> and <f>R</f> in parallel.</p>",
            "<p>Miksi tämä toimii? Jännitelähde <f>U_T</f>, sarjavastus <f>R_T</f> ja kuorma <f>R</f> antavat virran <f>I = {U_T}/{R_T + R} = {R_T}/{R_T + R} · {U_T}/{R_T}</f>, mikä on täsmälleen virtalähde <f>I_N = U_T/R_T</f>, joka jakautuu rinnakkaisten <f>R_T</f>:n ja <f>R</f>:n kesken.</p>") },
          { id: "t4-eq-morph", type: "interactive", widget: "custom", title: L("Thévenin ↔ Norton side by side", "Thévenin ↔ Norton rinnakkain"),
            caption: L("Move the sliders. The two sources always deliver the same current and voltage to the load.", "Liikuta liukusäätimiä. Kaksi lähdettä antavat kuormalle aina saman virran ja jännitteen."), config: { mount: morphMount } },
          { id: "t4-eq-ro", type: "interactive", widget: "readout", title: L("Converter: Norton → Thévenin", "Muunnin: Norton → Thévenin"),
            caption: L("Set I_N and R_N of a Norton source and read the Thévenin equivalent.", "Aseta Norton-lähteen I_N ja R_N ja lue Théveninin ekvivalentti."),
            config: {
              params: [{ id: "IN", tex: "I_N", min: 0.5, max: 10, step: 0.5, value: 6, unit: "A" }, { id: "RN", tex: "R_N", min: 1, max: 100, step: 1, value: 10, unit: "Ω" }],
              outputs: function (v) { return [{ tex: "U_T = I_N · R_N", value: v.IN * v.RN, unit: "V" }, { tex: "R_T", value: v.RN, unit: "Ω" }]; }
            } },
          { id: "t4-eq-h1", type: "h", text: L("Rules for combining sources", "Lähteiden yhdistämissäännöt") },
          { id: "t4-eq-l1", type: "list", items: [
            L("Parallel current sources add (KCL): <f>I = I₁ + I₂</f> (opposite directions subtract). Their parallel resistors combine: <f>R = R₁R₂/(R₁+R₂)</f>.", "Rinnakkaiset virtalähteet summautuvat (KVL): <f>I = I₁ + I₂</f> (vastakkaissuuntaiset vähennetään). Niiden rinnakkaisvastukset yhdistyvät: <f>R = R₁R₂/(R₁+R₂)</f>."),
            L("Series voltage sources add with sign (opposite polarity subtract). Their series resistors add.", "Sarjaan kytketyt jännitelähteet summautuvat etumerkkeineen (vastakkaisnapaiset vähennetään). Niiden sarjavastukset summautuvat."),
            L("Strategy: turn every branch into the same form, combine, then convert once more.", "Strategia: muunna jokainen haara samaan muotoon, yhdistä ja muunna vielä kerran.")
          ] },
          { id: "t4-eq-ex3", type: "example", title: L("Example 4.3: voltage source → Norton", "Esimerkki 4.3: jännitelähde → Norton"),
            problem: L("Convert a 10 V source in series with 2 Ω into a Norton network.", "Muunna 10 V:n lähde ja sarjaan kytketty 2 Ω Norton-verkoksi."),
            given: ["U_T = 10 V", "R_T = 2 Ω"],
            steps: [{ tex: "I_N = {U_T}/{R_T} = {10 V}/{2 Ω} = 5 A" }, L("The resistance is the same in both networks: R_N = 2 Ω.", "Resistanssi on kummassakin verkossa sama: R_N = 2 Ω.")],
            result: L("Norton: 5 A in parallel with 2 Ω", "Norton: 5 A ja rinnalle 2 Ω") },
          { id: "t4-eq-fig44", type: "figure", svg: figEx44, caption: L("Network of Example 4.4. The 1 mA source pushes current from A towards C (see errata note).", "Esimerkin 4.4 verkko. 1 mA:n lähde työntää virran pisteestä A kohti pistettä C (ks. korjausmerkintä)."), alt: L("Example 4.4 circuit", "Esimerkin 4.4 piiri") },
          { id: "t4-eq-ex4", type: "example", title: L("Example 4.4: several sources, one load", "Esimerkki 4.4: useita lähteitä, yksi kuorma"),
            problem: L("Find the Thévenin equivalent seen by the 200 Ω load and the current in it.", "Määritä 200 Ω:n kuorman näkemä Théveninin ekvivalentti ja kuorman virta."),
            given: ["10 V + 2 kΩ", "6 V + 3 kΩ", "1 mA ∥ 600 Ω", "R_L = 200 Ω"],
            steps: [
              L("Convert both voltage branches to current sources:", "Muunna molemmat jännitehaarat virtalähteiksi:"),
              { tex: "I_1 = {10 V}/{2 kΩ} = 5 mA,    I_2 = {6 V}/{3 kΩ} = 2 mA" },
              L("Combine the two in parallel:", "Yhdistä ne rinnakkain:"),
              { tex: "I = 5 + 2 = 7 mA,    R = {2k · 3k}/{2k + 3k} = 1,2 kΩ" },
              L("Back to voltage sources: 7 mA ∥ 1,2 kΩ becomes 8,4 V in series with 1,2 kΩ. The 1 mA ∥ 600 Ω becomes 0,6 V in series with 0,6 kΩ, with opposite polarity:", "Takaisin jännitelähteiksi: 7 mA ∥ 1,2 kΩ muuttuu 8,4 V:ksi ja sarjaan 1,2 kΩ. 1 mA ∥ 600 Ω muuttuu 0,6 V:ksi ja sarjaan 0,6 kΩ vastakkaisella napaisuudella:"),
              { tex: "U_T = 8,4 − 0,6 = 7,8 V,    R_T = 1,2 + 0,6 = 1,8 kΩ" },
              { tex: "I = {7,8 V}/{(1800 + 200) Ω} = 3,9 mA" }
            ],
            result: L("U_T = 7,8 V, R_T = 1,8 kΩ, I = 3,9 mA", "U_T = 7,8 V, R_T = 1,8 kΩ, I = 3,9 mA") },
          { id: "t4-eq-circ", type: "interactive", widget: "circuit", title: L("Check Example 4.4 in the simulator", "Tarkista esimerkki 4.4 simulaattorilla"),
            caption: L("The ammeter in the load branch shows 3,9 mA. Change a source or resistor and compare with a Thévenin calculation.", "Kuormahaaran ampeerimittari näyttää 3,9 mA. Muuta lähdettä tai vastusta ja vertaa Thévenin-laskuun."),
            config: {
              size: [14, 8],
              parts: [
                { id: "U1", type: "V", a: [0, 8], b: [0, 5], value: 10, label: "U1", editable: { min: 0, max: 24, step: 0.5 } },
                { id: "Ra", type: "R", a: [0, 5], b: [0, 2], value: 2000, label: "2k", editable: { min: 100, max: 10000 } },
                { id: "U2", type: "V", a: [4, 8], b: [4, 5], value: 6, label: "U2", editable: { min: 0, max: 24, step: 0.5 } },
                { id: "Rb", type: "R", a: [4, 5], b: [4, 2], value: 3000, label: "3k", editable: { min: 100, max: 10000 } },
                { id: "I1", type: "I", a: [8, 3], b: [8, 0], value: 0.001, label: "I1" },
                { id: "Rc", type: "R", a: [10, 0], b: [10, 3], value: 600, label: "600" },
                { id: "A1", type: "ammeter", a: [13, 3], b: [13, 4] },
                { id: "RL", type: "R", a: [13, 4], b: [13, 8], value: 200, label: "200", editable: { min: 10, max: 5000 } }
              ],
              wires: [[[0, 2], [0, 0]], [[4, 2], [4, 0]], [[0, 0], [10, 0]], [[0, 8], [13, 8]], [[8, 3], [13, 3]]],
              labels: [{ at: [13, 3], text: "A", dx: -10, dy: -8 }, { at: [13, 8], text: "B", dx: -10, dy: 12 }],
              ground: [0, 8], tools: [], show: { values: true, flow: true }, table: true
            } },
          { id: "t4-eq-q1", type: "question", q: "t4-q-eq1" },
          { id: "t4-eq-q2", type: "question", q: "t4-q-eq2" },
          { id: "t4-eq-q3", type: "question", q: "t4-q-eq3" }
        ]
      },

      /* ------------------------------------------------------------------ 4.4 Y-Δ */
      {
        id: "t4-ydelta", title: L("Star–delta (Y–Δ) transformation", "Tähti-kolmiomuunnos (Y–Δ)"),
        blocks: [
          { id: "t4-yd-p1", type: "text", html: L(
            "<p>Look at a <b>bridge-type network</b>: two series branches with a resistor joining their midpoints. There are no series or parallel connections, so neither the series–parallel rules nor source transformations can reduce it. We need a <b>three-terminal</b> transformation: <dfn data-term='star_delta'>Y–Δ</dfn>.</p><p>A Y has resistors <f>R_a, R_b, R_c</f> from terminals a, b, c to a common point. A Δ has <f>R_ab, R_bc, R_ca</f> between pairs of terminals. From outside, the two are indistinguishable if the resistance between every pair of terminals is equal.</p>",
            "<p>Tarkastellaan <b>siltakytkentää</b>: kaksi sarjahaaraa, joiden keskipisteet yhdistää vastus. Siinä ei ole sarja- eikä rinnankytkentöjä, joten sarja-rinnakkaissäännöt ja lähdemuunnokset eivät sievennä sitä. Tarvitaan <b>kolminapainen</b> muunnos: <dfn data-term='star_delta'>Y–Δ</dfn>.</p><p>Tähdessä Y on vastukset <f>R_a, R_b, R_c</f> navoista a, b, c yhteiseen pisteeseen. Kolmiossa Δ on <f>R_ab, R_bc, R_ca</f> napaparien välissä. Ulkoa katsoen ne ovat samanlaisia, kun resistanssi jokaisen napaparin välillä on yhtä suuri.</p>") },
          { id: "t4-yd-fig", type: "figure", svg: figYD, caption: L("Star (Y) and delta (Δ) with terminals a, b, c.", "Tähti (Y) ja kolmio (Δ), navat a, b, c."), alt: L("Star and delta networks", "Tähti- ja kolmiokytkentä") },
          { id: "t4-yd-cols", type: "columns", cols: [
            [{ id: "t4-yd-f1", type: "formula", key: true, tex: "R_{ab} = R_a + R_b + {R_a R_b}/{R_c}", label: L("Y → Δ (similarly bc, ca)", "Y → Δ (vastaavasti bc, ca)") },
             { id: "t4-yd-f1b", type: "formula", tex: "R_{bc} = R_b + R_c + {R_b R_c}/{R_a},    R_{ca} = R_c + R_a + {R_c R_a}/{R_b}" }],
            [{ id: "t4-yd-f2", type: "formula", key: true, tex: "R_a = {R_{ab} R_{ca}}/{R_{ab} + R_{bc} + R_{ca}}", label: L("Δ → Y (similarly b, c)", "Δ → Y (vastaavasti b, c)") },
             { id: "t4-yd-f2b", type: "formula", tex: "R_b = {R_{ab} R_{bc}}/{R_{ab} + R_{bc} + R_{ca}},    R_c = {R_{ca} R_{bc}}/{R_{ab} + R_{bc} + R_{ca}}" }]
          ] },
          // (extra)
          { id: "t4-yd-c1", type: "callout", kind: "tip", title: L("Memory aid (extra)", "Muistisääntö (lisä)"),
            html: L("Each Y resistor = (product of the two Δ resistors that meet at its terminal) / (sum of all three Δ resistors). If all three are equal: <f>R_Y = R_Δ/3</f>, <f>R_Δ = 3 R_Y</f>.", "Jokainen tähden vastus = (kahden sen navassa kohtaavan kolmion vastuksen tulo) / (kaikkien kolmen kolmiovastuksen summa). Jos kaikki kolme ovat yhtä suuret: <f>R_Y = R_Δ/3</f>, <f>R_Δ = 3 R_Y</f>.") },
          { id: "t4-yd-ro", type: "interactive", widget: "readout", title: L("Y → Δ calculator (extra)", "Y → Δ -laskin (lisä)"),
            caption: L("Change the star resistors and read the delta. The last three lines are the resistance measured between each pair of terminals in the star: they must equal the delta's pair resistances.", "Muuta tähden vastuksia ja lue kolmio. Kolme viimeistä riviä ovat tähden napaparien väliset resistanssit; ne ovat yhtä suuret kuin kolmion vastaavat."),
            config: {
              params: [{ id: "Ra", tex: "R_a", min: 1, max: 100, step: 1, value: 10, unit: "Ω" }, { id: "Rb", tex: "R_b", min: 1, max: 100, step: 1, value: 20, unit: "Ω" }, { id: "Rc", tex: "R_c", min: 1, max: 100, step: 1, value: 30, unit: "Ω" }],
              outputs: function (v) {
                var ab = v.Ra + v.Rb + v.Ra * v.Rb / v.Rc, bc = v.Rb + v.Rc + v.Rb * v.Rc / v.Ra, ca = v.Rc + v.Ra + v.Rc * v.Ra / v.Rb;
                var par = function (x, y) { return x * y / (x + y); };
                return [{ tex: "R_{ab}", value: ab, unit: "Ω" }, { tex: "R_{bc}", value: bc, unit: "Ω" }, { tex: "R_{ca}", value: ca, unit: "Ω" },
                  { label: L("Y: between a and b = R_a + R_b", "Y: a:n ja b:n välillä = R_a + R_b"), value: v.Ra + v.Rb, unit: "Ω" },
                  { label: L("Δ: R_ab ∥ (R_bc + R_ca)", "Δ: R_ab ∥ (R_bc + R_ca)"), value: par(ab, bc + ca), unit: "Ω" }];
              }
            } },
          { id: "t4-yd-fig5", type: "figure", svg: figEx45, caption: L("Network of Example 4.5. The delta 5 Ω–2 Ω–3 Ω over the node pair N_T, M₁, M₂ is converted into a star.", "Esimerkin 4.5 verkko. Kolmio 5 Ω–2 Ω–3 Ω muunnetaan tähdeksi."), alt: L("Bridge network of Example 4.5", "Esimerkin 4.5 siltaverkko") },
          { id: "t4-yd-ex", type: "example", title: L("Example 4.5: power in a bridge network", "Esimerkki 4.5: tehohäviö siltaverkossa"),
            problem: L("A 12 V source feeds the bridge: 5 Ω (top node – M₁), 2 Ω (top node – M₂), 3 Ω (M₁ – M₂), 0,5 Ω (M₁ – bottom node), 0,4 Ω (M₂ – bottom node). Find the total power dissipation.", "12 V:n lähde syöttää siltaa: 5 Ω (ylä – M₁), 2 Ω (ylä – M₂), 3 Ω (M₁ – M₂), 0,5 Ω (M₁ – ala), 0,4 Ω (M₂ – ala). Laske kokonaistehohäviö."),
            given: ["U = 12 V", "5, 2, 3, 0,5, 0,4 Ω"],
            steps: [
              L("Convert the delta 5 Ω, 2 Ω, 3 Ω into a star. The sum is 2 + 3 + 5 = 10 Ω:", "Muunna kolmio 5 Ω, 2 Ω, 3 Ω tähdeksi. Summa on 2 + 3 + 5 = 10 Ω:"),
              { tex: "R_a = {2 · 3}/{10} = 0,6 Ω (at M₂),   R_b = {3 · 5}/{10} = 1,5 Ω (at M₁),   R_c = {2 · 5}/{10} = 1 Ω (at top node)" },
              L("Now only series and parallel remain: the 1 Ω is in series with two parallel branches (1,5 + 0,5) and (0,6 + 0,4):", "Nyt jäljellä on vain sarja- ja rinnankytkentöjä: 1 Ω on sarjassa kahden rinnakkaisen haaran (1,5 + 0,5) ja (0,6 + 0,4) kanssa:"),
              { tex: "R_{tot} = 1 + {2,0 · 1,0}/{2,0 + 1,0} = 1 + 0,667 = 1,67 Ω" },
              { tex: "P = {U^2}/{R_{tot}} = {12^2}/{1,67} = 86,4 W" }
            ],
            result: L("R_total = 5/3 Ω ≈ 1,67 Ω, P = 86,4 W", "R_kok = 5/3 Ω ≈ 1,67 Ω, P = 86,4 W") },
          { id: "t4-yd-circ", type: "interactive", widget: "circuit", title: L("Check the bridge in the simulator", "Tarkista silta simulaattorilla"),
            caption: L("The source power in the table is 86,4 W. Change a resistor and see how the distribution of power changes (no Y–Δ needed: the solver does the whole network at once).", "Taulukon lähdeteho on 86,4 W. Muuta vastusta ja katso, miten tehojakauma muuttuu (Y–Δ-muunnosta ei tarvita: ratkaisija laskee koko verkon kerralla)."),
            config: {
              size: [9, 6],
              parts: [
                { id: "V1", type: "V", a: [0, 6], b: [0, 0], value: 12 },
                { id: "Ra", type: "R", a: [3, 0], b: [3, 3], value: 5, label: "5", editable: { min: 0.1, max: 20, step: 0.1 } },
                { id: "Rb", type: "R", a: [3, 3], b: [3, 6], value: 0.5, label: "0.5", editable: { min: 0.1, max: 20, step: 0.1 } },
                { id: "Rc", type: "R", a: [9, 0], b: [9, 3], value: 2, label: "2", editable: { min: 0.1, max: 20, step: 0.1 } },
                { id: "Rd", type: "R", a: [9, 3], b: [9, 6], value: 0.4, label: "0.4", editable: { min: 0.1, max: 20, step: 0.1 } },
                { id: "Re", type: "R", a: [3, 3], b: [9, 3], value: 3, label: "3", editable: { min: 0.1, max: 20, step: 0.1 } }
              ],
              wires: [[[0, 0], [9, 0]], [[0, 6], [9, 6]]], ground: [0, 6], tools: [], show: { values: true, flow: true }, table: true
            } },
          { id: "t4-yd-q1", type: "question", q: "t4-q-yd1" }
        ]
      },

      /* ------------------------------------------------------------------ 4.5 maximum power */
      {
        id: "t4-maxpower", title: L("Maximum power transfer", "Maksimitehon siirto"),
        blocks: [
          { id: "t4-mp-p1", type: "text", html: L(
            "<p>A source with <f>U_T</f> and <f>R_T</f> feeds a load <f>R_L</f>. The current is <f>I = U_T/(R_T+R_L)</f> and the load power is <f>P_L = R_L I²</f>.</p><p>Two extremes: at <f>R_L = 0</f> (short circuit) the current is <f>I_sc</f> and the terminal voltage is 0, so the load gets no power and all power is dissipated inside the source. At <f>R_L → ∞</f> (open circuit) <f>U = U_T</f> but <f>I = 0</f>: again no power. In between, the power must have a maximum.</p>",
            "<p>Lähde, jolla on <f>U_T</f> ja <f>R_T</f>, syöttää kuormaa <f>R_L</f>. Virta on <f>I = U_T/(R_T+R_L)</f> ja kuorman teho <f>P_L = R_L I²</f>.</p><p>Ääritapaukset: kun <f>R_L = 0</f> (oikosulku), virta on <f>I_sc</f> ja napajännite 0, joten kuorma ei saa tehoa ja kaikki teho kuluu lähteen sisällä. Kun <f>R_L → ∞</f> (tyhjäkäynti), <f>U = U_T</f> mutta <f>I = 0</f>: taas ei tehoa. Välillä tehon täytyy olla maksimissaan.</p>") },
          { id: "t4-mp-f1", type: "formula", key: true, tex: "R_L = R_T", label: L("Maximum power transfer theorem", "Maksimitehon siirron ehto"),
            legend: [["R_L", L("load resistance", "kuormaresistanssi"), "Ω"], ["R_T", L("source (Thévenin) resistance", "lähteen (Théveninin) resistanssi"), "Ω"]] },
          { id: "t4-mp-f2", type: "formula", tex: "P_L = {R_L U_T^2}/{(R_T + R_L)^2},    P_{max} = {U_T^2}/{4 R_T}", label: L("Load power and its maximum (extra for P_max)", "Kuorman teho ja sen maksimi (P_max lisä)") },
          { id: "t4-mp-plot1", type: "interactive", widget: "plot", title: L("Operating point on the I,V-line", "Toimintapiste virta-jännitekäyrällä"),
            caption: L("The load line U = R_L·I (dashed) crosses the source line at the operating point. Drag R_L from 0 (short circuit) to large values (open circuit).", "Kuormasuora U = R_L·I (katkoviiva) leikkaa lähteen suoran toimintapisteessä. Vedä R_L:ää nollasta (oikosulku) suuriin arvoihin (tyhjäkäynti)."),
            config: uiPlot(true) },
          { id: "t4-mp-plot2", type: "interactive", widget: "plot", title: L("Load power vs. load resistance", "Kuorman teho kuormaresistanssin funktiona"),
            caption: L("The peak is at R_L = R_T (red line). The readouts show the power lost inside the source and the efficiency η = R_L/(R_T+R_L).", "Huippu on kohdassa R_L = R_T (pystyviiva). Lukemissa näkyvät lähteen sisällä hukkuva teho ja hyötysuhde η = R_L/(R_T+R_L)."),
            config: {
              x: { min: 0, max: 12, label: L("Load resistance R_L", "Kuormaresistanssi R_L"), unit: "Ω" },
              y: { min: 0, max: 1, label: L("Load power P_L", "Kuorman teho P_L"), unit: "W", auto: true },
              params: [{ id: "E", tex: "U_T", min: 1, max: 12, step: 0.5, value: 3, unit: "V" }, { id: "r", tex: "R_T", min: 0.5, max: 6, step: 0.5, value: 3, unit: "Ω" }, { id: "RL", tex: "R_L", min: 0.1, max: 12, value: 1, unit: "Ω" }],
              curves: [{ fn: function (x, p) { return p.E * p.E * x / Math.pow(p.r + x, 2); }, label: L("P_L(R_L)", "P_L(R_L)"), color: "--c-1" }],
              points: function (p) { return [{ x: p.RL, y: p.E * p.E * p.RL / Math.pow(p.r + p.RL, 2) }]; },
              vlines: function (p) { return [{ x: p.r, label: L("R_L = R_T", "R_L = R_T") }]; },
              readouts: function (p) {
                var i = p.E / (p.r + p.RL);
                return [{ tex: "P_L", value: i * i * p.RL, unit: "W" }, { tex: "P_{max}", value: p.E * p.E / (4 * p.r), unit: "W" },
                  { label: L("power lost in R_T", "R_T:ssä hukkuva teho"), value: i * i * p.r, unit: "W" }, { tex: "η", value: p.RL / (p.r + p.RL) * 100, unit: "%" }];
              }
            } },
          { id: "t4-mp-c1", type: "callout", kind: "warn", title: L("Maximum power is not maximum efficiency", "Maksimiteho ei ole paras hyötysuhde"),
            html: L("At <f>R_L = R_T</f> the efficiency is only 50 %: half of the power is lost in <f>R_T</f>. Power stations want high efficiency (<f>R_L ≫ R_T</f>); a radio receiver or an audio amplifier wants the most power into the load (<f>R_L = R_T</f>, <dfn data-term='power_matching'>power matching</dfn>).",
                    "Kun <f>R_L = R_T</f>, hyötysuhde on vain 50 %: puolet tehosta hukkuu <f>R_T</f>:hen. Voimalaitos haluaa korkean hyötysuhteen (<f>R_L ≫ R_T</f>); radiovastaanotin tai äänivahvistin haluaa suurimman tehon kuormaan (<f>R_L = R_T</f>, <dfn data-term='power_matching'>tehosovitus</dfn>).") },
          { id: "t4-mp-ex6", type: "example", title: L("Example 4.6: the I,V-line of a battery", "Esimerkki 4.6: pariston virta-jännitekäyrä"),
            problem: L("A battery has E = 9,0 V and R_i = 3,0 Ω. Find the short-circuit current and the behaviour at open circuit.", "Paristolla on E = 9,0 V ja R_i = 3,0 Ω. Määritä oikosulkuvirta ja käyttäytyminen tyhjäkäynnillä."),
            given: ["E = 9,0 V", "R_i = 3,0 Ω"],
            steps: [{ tex: "I_{sc} = {E}/{R_i} = {9,0}/{3,0} = 3,0 A" }, { tex: "R_L → ∞:  I → 0 A,   U = E − I R_i = 9,0 V = E" }],
            result: L("I_sc = 3,0 A, U_oc = 9,0 V", "I_sc = 3,0 A, U_oc = 9,0 V") },
          { id: "t4-mp-ex7", type: "example", title: L("Example 4.7: power vs. load resistance", "Esimerkki 4.7: teho kuormaresistanssin funktiona"),
            problem: L("E = 3,0 V, R_i = 3,0 Ω. Find the maximum load power and the power at R_L = 1 Ω, 6 Ω, 12 Ω.", "E = 3,0 V, R_i = 3,0 Ω. Laske kuorman maksimiteho sekä teho, kun R_L = 1 Ω, 6 Ω, 12 Ω."),
            given: ["E = 3,0 V", "R_i = 3,0 Ω"],
            steps: [
              { tex: "R_L = R_i = 3 Ω,    P_{max} = {E^2}/{4 R_i} = {9}/{12} = 0,75 W" },
              { tex: "P(1 Ω) = {9 · 1}/{(3+1)^2} = 0,5625 W,    P(6 Ω) = {9 · 6}/{81} = 0,667 W,    P(12 Ω) = {9 · 12}/{225} = 0,48 W" }
            ],
            result: L("P_max = 0,75 W at 3 Ω", "P_max = 0,75 W kohdassa 3 Ω") },
          // (extra)
          { id: "t4-mp-ex8", type: "example", title: L("Extra: maximum power from a Thévenin source", "Lisäesimerkki: maksimiteho Thévenin-lähteestä"),
            problem: L("A Thévenin source has U_T = 16 V and R_T = 4 Ω (the source of the extra example in section 4.1). Compare the power at R_L = R_T with R_L = 10 Ω.", "Thévenin-lähteellä on U_T = 16 V ja R_T = 4 Ω (kohdan 4.1 lisäesimerkin lähde). Vertaa tehoa kuormilla R_L = R_T ja R_L = 10 Ω."),
            given: ["U_T = 16 V", "R_T = 4 Ω"],
            steps: [{ tex: "P_{max} = {16^2}/{4 · 4} = 16 W" }, { tex: "P(10 Ω) = {10 · 256}/{14^2} = 13,06 W" }],
            result: L("16 W at 4 Ω; 13,06 W at 10 Ω", "16 W kohdassa 4 Ω; 13,06 W kohdassa 10 Ω") },
          { id: "t4-mp-q1", type: "question", q: "t4-q-mp1" },
          { id: "t4-mp-q2", type: "question", q: "t4-q-mp2" }
        ]
      },

      /* ------------------------------------------------------------------ 4.6 Wheatstone */
      {
        id: "t4-bridge", title: L("The Wheatstone bridge", "Wheatstonen silta"),
        blocks: [
          { id: "t4-br-p1", type: "text", html: L(
            "<p>The <dfn data-term='wheatstone_bridge'>Wheatstone bridge</dfn> was invented for precise resistance measurement. Today it is mostly used with <b>transducers</b> (strain gauges, thermistors, pressure sensors) that turn a change in a physical quantity into a change of resistance, and so into a voltage. It can be used <b>balanced</b> or <b>unbalanced</b>.</p><p>The bridge is two voltage dividers (R₁–R₃ and R₂–R₄) from the same source. The output <f>U_OUT = U_A − U_B</f> is the difference between their midpoints.</p>",
            "<p><dfn data-term='wheatstone_bridge'>Wheatstonen silta</dfn> kehitettiin tarkkaan resistanssin mittaukseen. Nykyään sitä käytetään useimmiten <b>antureiden</b> (venymäliuskat, termistorit, paineanturit) kanssa: fysikaalisen suureen muutos muuttaa resistanssia ja siten jännitettä. Siltaa voi käyttää <b>tasapainotettuna</b> tai <b>epätasapainoisena</b>.</p><p>Silta on kaksi samasta lähteestä syötettyä jännitteenjakajaa (R₁–R₃ ja R₂–R₄). Lähtöjännite <f>U_OUT = U_A − U_B</f> on niiden keskipisteiden jännite-ero.</p>") },
          { id: "t4-br-fig", type: "figure", svg: figBridge, caption: L("Wheatstone bridge: A and B are the divider midpoints, the meter measures U_OUT.", "Wheatstonen silta: A ja B ovat jakajien keskipisteet, mittari mittaa U_OUT:n."), alt: L("Wheatstone bridge", "Wheatstonen silta") },
          { id: "t4-br-h1", type: "h", text: L("Balanced bridge", "Tasapainotettu silta") },
          { id: "t4-br-p2", type: "text", html: L(
            "<p>The bridge is <b>balanced</b> when <f>U_OUT = 0</f>, i.e. <f>U_1 = U_2</f> and <f>U_3 = U_4</f>. Then no current flows through the meter, so <f>I_1 = I_3</f> and <f>I_2 = I_4</f>. Dividing the voltage equations:</p>",
            "<p>Silta on <b>tasapainossa</b>, kun <f>U_OUT = 0</f>, eli <f>U_1 = U_2</f> ja <f>U_3 = U_4</f>. Silloin mittarin läpi ei kulje virtaa, joten <f>I_1 = I_3</f> ja <f>I_2 = I_4</f>. Jakamalla jänniteyhtälöt keskenään:</p>") },
          { id: "t4-br-f1", type: "formula", key: true, tex: "{R_1}/{R_3} = {R_2}/{R_4}    ⇒    R_1 = R_3 · {R_2}/{R_4}", label: L("Balance condition", "Tasapainoehto"),
            legend: [["R_2/R_4", L("scale factor (mittakerroin)", "mittakerroin"), ""], ["R_1", L("the unknown resistance R_X", "tuntematon resistanssi R_X"), "Ω"]] },
          { id: "t4-br-bal", type: "interactive", widget: "custom", title: L("Wheatstone balancer", "Wheatstonen sillan tasapainotus"),
            caption: L("Turn R_V until the needle sits at zero and the badge says \"balanced\". Then check that R_X/R_V = R₂/R₄.", "Säädä R_V:tä, kunnes osoitin on nollassa ja merkki näyttää \"tasapainossa\". Tarkista sitten, että R_X/R_V = R₂/R₄."), config: { mount: bridgeMount } },
          { id: "t4-br-ex8", type: "example", title: L("Example 4.8: measuring an unknown resistor", "Esimerkki 4.8: tuntemattoman vastuksen mittaus"),
            problem: L("A bridge is balanced with R_V = 1200 Ω, R₂ = 150 Ω, R₄ = 100 Ω. Find R_X.", "Silta on tasapainossa, kun R_V = 1200 Ω, R₂ = 150 Ω, R₄ = 100 Ω. Laske R_X."),
            given: ["R_V = 1200 Ω", "R₂ = 150 Ω", "R₄ = 100 Ω"],
            steps: [{ tex: "{R_2}/{R_4} = {150}/{100} = 1,5" }, { tex: "R_X = R_V · {R_2}/{R_4} = 1200 · 1,5 = 1800 Ω" }],
            result: L("R_X = 1800 Ω", "R_X = 1800 Ω") },
          { id: "t4-br-q1", type: "question", q: "t4-q-br1" },
          { id: "t4-br-h2", type: "h", text: L("Unbalanced bridge", "Epätasapainoinen silta") },
          { id: "t4-br-p3", type: "text", html: L(
            "<p>In the unbalanced bridge a sensor replaces one resistor. Each side is a voltage divider and the output is read directly:</p>",
            "<p>Epätasapainoisessa sillassa yksi vastuksista on anturi. Kumpikin puoli on jännitteenjakaja ja lähtöjännite luetaan suoraan:</p>") },
          { id: "t4-br-f2", type: "formula", key: true, tex: "U_{OUT} = U_A − U_B = {R_3}/{R_3 + R_t} U_s − {R_4}/{R_2 + R_4} U_s", label: L("Output of a bridge with a sensor R_t in the upper-left arm", "Sillan lähtö, kun anturi R_t on vasemmassa yläharassa") },
          { id: "t4-br-plot", type: "interactive", widget: "plot", title: L("Bridge output vs. sensor resistance", "Sillan lähtö anturin resistanssin funktiona"),
            caption: L("All fixed arms equal R_n. The output is zero at R_t = R_n and its sign tells the direction of the change. The point marks the thermistor of Example 4.9 (900 Ω at 50 °C) when R_n = 1000 Ω.", "Kaikki kiinteät haarat ovat yhtä suuria (R_n). Lähtö on nolla kohdassa R_t = R_n ja sen etumerkki kertoo muutoksen suunnan. Piste on esimerkin 4.9 termistori (900 Ω lämpötilassa 50 °C), kun R_n = 1000 Ω."),
            config: {
              x: { min: 500, max: 2000, label: L("Sensor resistance R_t", "Anturin resistanssi R_t"), unit: "Ω" },
              y: { min: -3, max: 3, label: L("Bridge output U_OUT", "Sillan lähtö U_OUT"), unit: "V" },
              params: [{ id: "Vs", tex: "U_s", min: 1, max: 12, step: 1, value: 12, unit: "V" }, { id: "Rn", tex: "R_n", min: 500, max: 1500, step: 50, value: 1000, unit: "Ω" }, { id: "Rt", tex: "R_t", min: 500, max: 2000, step: 10, value: 900, unit: "Ω" }],
              curves: [{ fn: function (x, p) { return p.Vs * (p.Rn / (p.Rn + x) - 0.5); }, label: L("U_OUT(R_t)", "U_OUT(R_t)"), color: "--c-1" }],
              points: function (p) { return [{ x: p.Rt, y: p.Vs * (p.Rn / (p.Rn + p.Rt) - 0.5) }]; },
              vlines: function (p) { return [{ x: p.Rn, label: L("balanced", "tasapaino") }]; },
              readouts: function (p) { return [{ tex: "U_{OUT}", value: p.Vs * (p.Rn / (p.Rn + p.Rt) - 0.5), unit: "V" }]; }
            } },
          { id: "t4-br-ex9", type: "example", title: L("Example 4.9: thermistor bridge", "Esimerkki 4.9: termistorisilta"),
            problem: L("U_s = 12 V; R₂ = R₃ = R₄ = 1,0 kΩ. The thermistor in the upper-left arm is 1,0 kΩ at 25 °C and 900 Ω at 50 °C. Find U_OUT at 50 °C.", "U_s = 12 V; R₂ = R₃ = R₄ = 1,0 kΩ. Vasemman yläharan termistori on 1,0 kΩ lämpötilassa 25 °C ja 900 Ω lämpötilassa 50 °C. Laske U_OUT lämpötilassa 50 °C."),
            given: ["U_s = 12 V", "R_t = 900 Ω", "R₂ = R₃ = R₄ = 1,0 kΩ"],
            steps: [
              { tex: "U_A = {R_3}/{R_3 + R_t} U_s = {1,0}/{1,0 + 0,90} · 12 = 6,32 V" },
              { tex: "U_B = {R_4}/{R_2 + R_4} U_s = {1,0}/{2,0} · 12 = 6,00 V" },
              { tex: "U_{OUT} = U_A − U_B = 0,32 V" },
              L("(Exactly 0,316 V.) A is at a higher potential than B. At 25 °C the bridge is balanced and U_OUT = 0.", "(Tarkasti 0,316 V.) A on korkeammassa potentiaalissa kuin B. Lämpötilassa 25 °C silta on tasapainossa ja U_OUT = 0.")
            ],
            result: L("U_OUT ≈ 0,32 V", "U_OUT ≈ 0,32 V") },
          // (extra)
          { id: "t4-br-ex10", type: "example", title: L("Extra: thermistor 1,1 kΩ", "Lisäesimerkki: termistori 1,1 kΩ"),
            problem: L("U_s = 10 V, all fixed resistors 1 kΩ, thermistor (upper left) 1,1 kΩ. Find U_OUT = U_A − U_B.", "U_s = 10 V, kaikki kiinteät vastukset 1 kΩ, termistori (vasen yläosa) 1,1 kΩ. Laske U_OUT = U_A − U_B."),
            given: ["U_s = 10 V"],
            steps: [{ tex: "U_A = {1}/{2,1} · 10 = 4,762 V,    U_B = 5 V" }, { tex: "U_{OUT} = −0,238 V" }],
            result: L("U_OUT = −0,238 V (B is higher than A)", "U_OUT = −0,238 V (B on korkeammalla kuin A)") },
          { id: "t4-br-q2", type: "question", q: "t4-q-br2" }
        ]
      }
    ],

    questions: [
      /* ------------------------------ practice ------------------------------ */
      { id: "t4-q-src", mode: "practice", type: "multi", difficulty: 2,
        prompt: L("Which statements about a real voltage source with emf <f>E</f> and internal resistance <f>R_i</f> are true?", "Mitkä väitteet todellisesta jännitelähteestä, jonka lähdejännite on <f>E</f> ja sisäresistanssi <f>R_i</f>, pitävät paikkansa?"),
        options: [
          { id: "a", html: L("The terminal voltage drops when the load current increases.", "Napajännite pienenee, kun kuormavirta kasvaa.") },
          { id: "b", html: L("The open-circuit voltage equals <f>E</f>.", "Tyhjäkäyntijännite on <f>E</f>.") },
          { id: "c", html: L("The short-circuit current is infinite.", "Oikosulkuvirta on ääretön.") },
          { id: "d", html: L("The short-circuit current is <f>E/R_i</f>.", "Oikosulkuvirta on <f>E/R_i</f>.") }
        ], shuffle: true },
      { id: "t4-q-th1", mode: "practice", type: "mc", difficulty: 1,
        prompt: L("Which of these is NOT a step of finding the Thévenin equivalent?", "Mikä seuraavista EI kuulu Théveninin ekvivalentin määritykseen?"),
        options: [
          { id: "a", html: L("Remove the load from the terminals.", "Poistetaan kuorma navoilta.") },
          { id: "b", html: L("Find the open-circuit voltage across the terminals.", "Määritetään napojen tyhjäkäyntijännite.") },
          { id: "c", html: L("Find only the short-circuit current and stop.", "Määritetään pelkkä oikosulkuvirta ja lopetetaan.") },
          { id: "d", html: L("Find the resistance seen from the terminals with the sources deactivated.", "Määritetään navoista nähty resistanssi lähteet pois kytkettyinä.") }
        ], shuffle: true, hints: [{ en: "One of these belongs to the Norton procedure.", fi: "Yksi näistä kuuluu Nortonin menettelyyn." }] },
      { id: "t4-q-th2", mode: "practice", type: "numeric", tol: 0.02, difficulty: 2,
        prompt: L("A 12 V source feeds a 6 Ω resistor in series, and a 3 Ω resistor is connected across the terminals A–B. Find the Thévenin voltage and resistance seen from A–B.", "12 V:n lähde syöttää sarjassa olevaa 6 Ω:n vastusta, ja 3 Ω:n vastus on kytketty napojen A–B yli. Määritä navoista A–B nähty Théveninin jännite ja resistanssi."),
        fields: [{ id: "UT", tex: "U_T", unit: "V" }, { id: "RT", tex: "R_T", unit: "Ω" }],
        hints: [{ en: "U_T is a voltage divider; R_T is a parallel connection once the source is shorted.", fi: "U_T saadaan jännitteenjaolla; R_T on rinnankytkentä, kun lähde on oikosuljettu." }] },
      { id: "t4-q-th3", mode: "practice", type: "fill", difficulty: 1,
        prompt: L("Complete the rule for deactivating sources when finding <f>R_T</f>.", "Täydennä sääntö lähteiden pois kytkemiseksi, kun etsitään <f>R_T</f>."),
        text: L("An ideal voltage source is replaced by a [[a]] and an ideal current source by an [[b]].", "Ideaalinen jännitelähde korvataan kytkennällä: [[a]]. Ideaalinen virtalähde korvataan kytkennällä: [[b]]."),
        fields: [{ id: "a", kind: "text" }, { id: "b", kind: "text" }] },
      { id: "t4-q-th4", mode: "practice", type: "order", difficulty: 1,
        prompt: L("Put the steps of the Thévenin procedure in order (U_T is found before R_T, as in the lectures).", "Järjestä Théveninin menettelyn vaiheet (U_T määritetään ennen R_T:tä, kuten luennoilla)."),
        items: [
          { id: "z", html: L("Deactivate the sources and calculate <f>R_T</f> looking into the terminals.", "Kytke lähteet pois ja laske navoista nähty <f>R_T</f>.") },
          { id: "i", html: L("Connect the load to the equivalent source and calculate <f>I = U_T/(R_T+R_L)</f>.", "Kytke kuorma ekvivalenttiin lähteeseen ja laske <f>I = U_T/(R_T+R_L)</f>.") },
          { id: "r", html: L("Remove the load; the terminals A–B are open.", "Poista kuorma; navat A–B jäävät avoimiksi.") },
          { id: "o", html: L("Calculate the open-circuit voltage <f>U_T = U_AB</f>.", "Laske tyhjäkäyntijännite <f>U_T = U_AB</f>.") }
        ] },
      { id: "t4-q-th5", mode: "practice", type: "match", difficulty: 1,
        prompt: L("Match each quantity with how it is obtained.", "Yhdistä kukin suure siihen, miten se saadaan."),
        left: [
          { id: "UT", html: L("<f>U_T</f>", "<f>U_T</f>") }, { id: "IN", html: L("<f>I_N</f>", "<f>I_N</f>") },
          { id: "RT", html: L("<f>R_T = R_N</f>", "<f>R_T = R_N</f>") }, { id: "pr", html: L("<f>I_N · R_T</f>", "<f>I_N · R_T</f>") }
        ],
        right: [
          { id: "A", html: L("open-circuit voltage", "tyhjäkäyntijännite") }, { id: "B", html: L("short-circuit current", "oikosulkuvirta") },
          { id: "C", html: L("resistance seen with sources deactivated", "lähteet pois kytkettynä nähty resistanssi") }, { id: "D", html: L("the Thévenin voltage", "Théveninin jännite") }
        ] },
      { id: "t4-q-isc", mode: "practice", type: "circuit", tol: 0.02, difficulty: 3,
        hints: [
          { en: "Short-circuit current: replace the load branch by a wire, so the ammeter carries all of the current that reaches A–B.", fi: "Oikosulkuvirta: korvaa kuormahaara johtimella, jolloin ampeerimittarin läpi kulkee koko napoihin A–B tuleva virta." },
          { en: "Draw the circuit with the wire: the source, R1, and R2 in parallel with the R3-wire branch. R3 is now in series with the wire, so it still limits the current.", fi: "Piirrä piiri johtimen kanssa: lähde, R1 ja R2 rinnan R3-johdinhaaran kanssa. R3 on nyt sarjassa johtimen kanssa ja rajoittaa edelleen virtaa." },
          { en: "Find the current from the source first, then use the current divider (or the divider voltage over R2 and R3 in series) to get the current in the wire.", fi: "Laske ensin lähteestä tuleva virta ja määritä sitten johtimen virta virranjaolla (tai R2:n ja R3:n sarjakytkennän jännitteen avulla)." }
        ],
        prompt: L("The load branch contains an ammeter. Using the wire tool, short the load resistor R (draw a wire across it) so that the ammeter measures the short-circuit current of terminals A–B.", "Kuormahaarassa on ampeerimittari. Oikosulje kuormavastus R johtimella (piirrä johdin sen yli), jolloin ampeerimittari mittaa napojen A–B oikosulkuvirran."),
        widget: { name: "circuit", config: {
          size: [10, 6],
          parts: [
            { id: "U1", type: "V", a: [0, 6], b: [0, 3], value: 10 },
            { id: "R1", type: "R", a: [0, 3], b: [0, 0], value: 2 },
            { id: "R2", type: "R", a: [4, 0], b: [4, 6], value: 8 },
            { id: "R3", type: "R", a: [4, 0], b: [8, 0], value: 5, labelSide: "other" },
            { id: "A1", type: "ammeter", a: [8, 0], b: [8, 1] },
            { id: "RL", type: "R", a: [8, 1], b: [8, 4], value: 10 }
          ],
          wires: [[[0, 0], [4, 0]], [[8, 4], [8, 6]], [[0, 6], [8, 6]]],
          ground: [0, 6], tools: ["wire", "cut"], table: true, show: { values: true, flow: true },
          answer: { kind: "I", part: "A1" }
        } } },
      { id: "t4-q-no1", mode: "practice", type: "numeric", tol: 0.02, difficulty: 1,
        prompt: L("Convert a 24 V source in series with 8 Ω into a Norton source.", "Muunna 24 V:n lähde ja sarjaan kytketty 8 Ω Norton-lähteeksi."),
        fields: [{ id: "IN", tex: "I_N", unit: "A" }, { id: "RN", tex: "R_N", unit: "Ω" }] },
      { id: "t4-q-eq1", mode: "practice", type: "numeric", tol: 0.02, difficulty: 3,
        hints: [
          { en: "Use source transformation: each branch (voltage source with series resistor) can be changed into a current source with a parallel resistor.", fi: "Käytä lähdemuunnosta: jokainen haara (jännitelähde ja sarjavastus) muutetaan virtalähteeksi ja rinnakkaisvastukseksi." },
          { en: "Convert both branches to Norton form, I = U/R each. Mind the polarity: both + terminals are on the same side, so the currents add.", fi: "Muunna molemmat haarat Nortonin muotoon, I = U/R. Huomaa napaisuus: molemmat plus-navat ovat samalla puolella, joten virrat summautuvat." },
          { en: "Add the two source currents and combine the two resistors in parallel. Then convert back: U_T = I · R, with R_T the parallel resistance.", fi: "Laske lähdevirrat yhteen ja yhdistä vastukset rinnan. Muunna sitten takaisin: U_T = I · R, ja R_T on rinnakkaisresistanssi." }
        ],
        prompt: L("Two branches are connected in parallel between the same two terminals: 10 V in series with 2 kΩ, and 6 V in series with 3 kΩ (both with + on the same terminal). Find the Thévenin equivalent of the pair (use source transformation).", "Kaksi haaraa on kytketty rinnan samojen napojen välille: 10 V ja sarjaan 2 kΩ sekä 6 V ja sarjaan 3 kΩ (molempien + on samalla navalla). Määritä parin Théveninin ekvivalentti (käytä lähdemuunnosta)."),
        fields: [{ id: "UT", tex: "U_T", unit: "V" }, { id: "RT", tex: "R_T", unit: "Ω" }] },
      { id: "t4-q-eq2", mode: "practice", type: "mc", difficulty: 1,
        prompt: L("A source transformation turns a voltage source <f>U_T</f> in series with <f>R_T</f> into:", "Lähdemuunnos muuttaa jännitelähteen <f>U_T</f> ja sarjaan kytketyn <f>R_T</f>:n:"),
        options: [
          { id: "a", html: L("a current source <f>U_T/R_T</f> in parallel with <f>R_T</f>", "virtalähteeksi <f>U_T/R_T</f> ja rinnalle <f>R_T</f>") },
          { id: "b", html: L("a current source <f>U_T·R_T</f> in parallel with <f>R_T</f>", "virtalähteeksi <f>U_T·R_T</f> ja rinnalle <f>R_T</f>") },
          { id: "c", html: L("a current source <f>U_T/R_T</f> in series with <f>R_T</f>", "virtalähteeksi <f>U_T/R_T</f> ja sarjaan <f>R_T</f>") },
          { id: "d", html: L("a current source <f>R_T/U_T</f> in parallel with <f>R_T</f>", "virtalähteeksi <f>R_T/U_T</f> ja rinnalle <f>R_T</f>") }
        ], shuffle: true },
      { id: "t4-q-eq3", mode: "practice", type: "numeric", tol: 0.02, difficulty: 1,
        prompt: L("Y–Δ: a star has <f>R_a = R_b = R_c = 6 Ω</f>. What is each resistor of the equivalent delta?", "Y–Δ: tähden vastukset ovat <f>R_a = R_b = R_c = 6 Ω</f>. Kuinka suuri on ekvivalenttisen kolmion jokainen vastus?"),
        fields: [{ id: "R", tex: "R_Δ", unit: "Ω" }] },
      { id: "t4-q-yd1", mode: "practice", type: "numeric", tol: 0.02, difficulty: 2,
        prompt: L("A delta has <f>R_ab = 30 Ω</f>, <f>R_bc = 60 Ω</f> and <f>R_ca = 90 Ω</f>. Find the equivalent star resistors.", "Kolmion vastukset ovat <f>R_ab = 30 Ω</f>, <f>R_bc = 60 Ω</f> ja <f>R_ca = 90 Ω</f>. Laske ekvivalenttisen tähden vastukset."),
        fields: [{ id: "Ra", tex: "R_a", unit: "Ω" }, { id: "Rb", tex: "R_b", unit: "Ω" }, { id: "Rc", tex: "R_c", unit: "Ω" }] },
      { id: "t4-q-mp1", mode: "practice", type: "mc", difficulty: 2,
        prompt: L("At maximum power transfer, what fraction of the total power delivered by the Thévenin source is dissipated in the load?", "Mikä osuus Thévenin-lähteen antamasta kokonaistehosta kuluu kuormaan maksimitehon siirrossa?"),
        options: [{ id: "a", html: L("25 %", "25 %") }, { id: "b", html: L("50 %", "50 %") }, { id: "c", html: L("75 %", "75 %") }, { id: "d", html: L("100 %", "100 %") }], shuffle: true },
      { id: "t4-q-mp2", mode: "practice", type: "slider", tol: 0.05, difficulty: 2,
        prompt: L("A battery has <f>E = 9 V</f> and <f>R_i = 3 Ω</f>. Set <f>R_L</f> so that the load receives the maximum power.", "Pariston lähdejännite on <f>E = 9 V</f> ja sisäresistanssi <f>R_i = 3 Ω</f>. Säädä <f>R_L</f> niin, että kuorma saa suurimman tehon."),
        widget: { name: "plot", config: {
          x: { min: 0, max: 20, label: L("R_L", "R_L"), unit: "Ω" }, y: { min: 0, max: 7, label: L("P_L", "P_L"), unit: "W" },
          params: [{ id: "RL", tex: "R_L", min: 0.5, max: 20, value: 10, unit: "Ω" }],
          curves: [{ fn: function (x) { return 81 * x / Math.pow(3 + x, 2); } }],
          points: function (p) { return [{ x: p.RL, y: 81 * p.RL / Math.pow(3 + p.RL, 2) }]; },
          readouts: function (p) { return [{ tex: "P_L", value: 81 * p.RL / Math.pow(3 + p.RL, 2), unit: "W" }]; },
          answer: function (p) { return { v: p.RL }; }
        } } },
      { id: "t4-q-br1", mode: "practice", type: "numeric", tol: 0.02, difficulty: 2,
        prompt: L("A Wheatstone bridge (R₁ and R₂ in the upper arms, R₃ and R₄ in the lower arms) with <f>U_s = 10 V</f>, <f>R_2 = R_3 = R_4 = 1 kΩ</f> and <f>R_1 = 900 Ω</f>. Find the output voltage <f>U_OUT = U_A − U_B</f> (A between R₁ and R₃, B between R₂ and R₄).", "Wheatstonen sillassa (R₁ ja R₂ yläharoissa, R₃ ja R₄ alaharoissa) on <f>U_s = 10 V</f>, <f>R_2 = R_3 = R_4 = 1 kΩ</f> ja <f>R_1 = 900 Ω</f>. Laske lähtöjännite <f>U_OUT = U_A − U_B</f> (A on R₁:n ja R₃:n välissä, B on R₂:n ja R₄:n välissä)."),
        fields: [{ id: "U", tex: "U_{OUT}", unit: "V" }], tol: 0.02 },
      { id: "t4-q-br2", mode: "practice", type: "mc", difficulty: 1,
        prompt: L("A balanced bridge has <f>R_2/R_4 = 2</f> and <f>R_3 = 300 Ω</f>. What is <f>R_1</f>?", "Tasapainotetussa sillassa <f>R_2/R_4 = 2</f> ja <f>R_3 = 300 Ω</f>. Kuinka suuri on <f>R_1</f>?"),
        options: [{ id: "a", html: L("150 Ω", "150 Ω") }, { id: "b", html: L("300 Ω", "300 Ω") }, { id: "c", html: L("600 Ω", "600 Ω") }, { id: "d", html: L("900 Ω", "900 Ω") }], shuffle: true },

      /* ------------------------------ graded ------------------------------ */
      { id: "t4-g1", mode: "graded", type: "numeric", points: 3, tol: 0.02, difficulty: 3,
        hints: [
          { en: "Thévenin: remove the load and look into the terminals A–B. You need an open-circuit voltage and a resistance.", fi: "Théveninin menetelmä: poista kuorma ja tarkastele piiriä napoihin A–B päin. Tarvitset tyhjäkäyntijännitteen ja resistanssin." },
          { en: "U_T is the voltage across the 20 Ω resistor with nothing else connected (voltage divider). R_T: short the source, then the two resistors are in parallel.", fi: "U_T on 20 Ω:n vastuksen jännite, kun mitään muuta ei ole kytketty (jännitteenjako). R_T: oikosulje lähde, jolloin vastukset ovat rinnan." },
          { en: "Connect the load to the equivalent source: a single series loop, so I = U_T/(R_T + R_L).", fi: "Kytke kuorma ekvivalenttilähteeseen: yksi sarjasilmukka, joten I = U_T/(R_T + R_L)." }
        ],
        prompt: L("A 20 V source in series with 5 Ω feeds terminals A–B. A 20 Ω resistor is connected across A–B (see figure). Find the Thévenin equivalent seen by a load at A–B, and the current in a 10 Ω load connected to A–B.", "20 V:n lähde ja sarjaan 5 Ω syöttää napoja A–B. 20 Ω:n vastus on kytketty napojen A–B yli (ks. kuva). Määritä napoihin A–B kytketyn kuorman näkemä Théveninin ekvivalentti sekä napoihin kytketyn 10 Ω:n kuorman virta."),
        figure: { svg: S.render({ w: 9.4, h: 6.6, alt: L("Graded network", "Arvioitavan tehtävän verkko"), parts: [
            { id: "U1", t: "V", a: [0, 6], b: [0, 3], label: "20 V", flip: true }, { id: "R1", t: "R", a: [0, 3], b: [0, 0], label: "5 Ω", flip: true },
            { id: "R2", t: "R", a: [5, 0], b: [5, 6], label: "20 Ω" }],
          wires: [[[0, 0], [8, 0]], [[0, 6], [8, 6]]], dots: [[5, 0], [5, 6]], terms: [{ at: [8, 0], text: "A", dx: 0.5 }, { at: [8, 6], text: "B", dx: 0.5 }] }),
          caption: L("Network for the question. The load is connected to A–B.", "Tehtävän verkko. Kuorma kytketään napoihin A–B.") },
        fields: [{ id: "UT", tex: "U_T", unit: "V" }, { id: "RT", tex: "R_T", unit: "Ω" }, { id: "IL", tex: "I_L", unit: "A" }] },
      { id: "t4-g2", mode: "graded", type: "numeric", points: 2, tol: 0.02, difficulty: 2,
        prompt: L("A current source of 6 A with 10 Ω in parallel is converted to a Thévenin source. A 15 Ω load is connected. Find <f>U_T</f>, <f>R_T</f> and the load current.", "6 A:n virtalähde ja sen rinnalla 10 Ω muunnetaan Thévenin-lähteeksi. Kuormaksi kytketään 15 Ω. Laske <f>U_T</f>, <f>R_T</f> ja kuormavirta."),
        fields: [{ id: "UT", tex: "U_T", unit: "V" }, { id: "RT", tex: "R_T", unit: "Ω" }, { id: "IL", tex: "I_L", unit: "A" }] },
      { id: "t4-g3", mode: "graded", type: "slider", points: 2, tol: 0.06, difficulty: 3,
        hints: [
          { en: "Write the load power as a function of R_L for the Thévenin source: P = R_L · I² with I = U_T/(R_T + R_L).", fi: "Kirjoita kuorman teho R_L:n funktiona Théveninin lähteelle: P = R_L · I², missä I = U_T/(R_T + R_L)." },
          { en: "Set P equal to the given power and multiply out: you get a quadratic equation in R_L. It has two roots, one on each side of R_T.", fi: "Aseta P yhtä suureksi kuin annettu teho ja kerro auki: saat R_L:n toisen asteen yhtälön. Sillä on kaksi juurta, yksi kummallakin puolella R_T:tä." },
          { en: "Pick the root that is smaller than R_T. You can also move the slider and watch the P_L readout until it matches.", fi: "Valitse juuri, joka on pienempi kuin R_T. Voit myös liikuttaa liukusäädintä ja seurata P_L-lukemaa, kunnes se täsmää." }
        ],
        prompt: L("A source has <f>U_T = 3 V</f> and <f>R_T = 3 Ω</f>. Set <f>R_L</f> to the value BELOW <f>R_T</f> at which the load power is 0.5625 W.", "Lähteellä on <f>U_T = 3 V</f> ja <f>R_T = 3 Ω</f>. Säädä <f>R_L</f> arvoon, joka on <f>R_T</f>:tä PIENEMPI ja jolla kuorman teho on 0,5625 W."),
        widget: { name: "plot", config: {
          x: { min: 0, max: 12, label: L("R_L", "R_L"), unit: "Ω" }, y: { min: 0, max: 0.8, label: L("P_L", "P_L"), unit: "W" },
          params: [{ id: "RL", tex: "R_L", min: 0.1, max: 3, step: 0.01, value: 2.5, unit: "Ω" }],
          curves: [{ fn: function (x) { return 9 * x / Math.pow(3 + x, 2); } }],
          points: function (p) { return [{ x: p.RL, y: 9 * p.RL / Math.pow(3 + p.RL, 2) }]; },
          readouts: function (p) { return [{ tex: "P_L", value: 9 * p.RL / Math.pow(3 + p.RL, 2), unit: "W" }]; },
          answer: function (p) { return { v: p.RL }; }
        } } },
      { id: "t4-g4", mode: "graded", type: "numeric", points: 2, tol: 0.02, difficulty: 2,
        prompt: L("A source has <f>U_T = 12 V</f> and <f>R_T = 4 Ω</f>. Find the load resistance for maximum power and that maximum power.", "Lähteellä on <f>U_T = 12 V</f> ja <f>R_T = 4 Ω</f>. Laske maksimitehon antava kuormaresistanssi ja tuo maksimiteho."),
        fields: [{ id: "RL", tex: "R_L", unit: "Ω" }, { id: "P", tex: "P_{max}", unit: "W" }] },
      { id: "t4-g5", mode: "graded", type: "circuit", points: 2, tol: 0.03, difficulty: 2,
        prompt: L("The bridge supplies 12 V, with unknown <f>R_X = 1800 Ω</f>, <f>R_2 = 150 Ω</f>, <f>R_4 = 100 Ω</f>. Click the variable resistor R_V and adjust it until the voltmeter between A and B reads zero.", "Silta saa 12 V:n jännitteen; tuntematon <f>R_X = 1800 Ω</f>, <f>R_2 = 150 Ω</f>, <f>R_4 = 100 Ω</f>. Napsauta säädettävää vastusta R_V ja säädä sitä, kunnes volttimittari pisteiden A ja B välillä näyttää nollaa."),
        widget: { name: "circuit", config: {
          size: [8, 6],
          parts: [
            { id: "V1", type: "V", a: [0, 6], b: [0, 0], value: 12 },
            { id: "RX", type: "R", a: [4, 0], b: [4, 3], value: 1800, label: "RX" },
            { id: "RV", type: "R", a: [4, 3], b: [4, 6], value: 1000, label: "RV", editable: { min: 100, max: 3000, step: 10 } },
            { id: "R2", type: "R", a: [8, 0], b: [8, 3], value: 150, label: "R2" },
            { id: "R4", type: "R", a: [8, 3], b: [8, 6], value: 100, label: "R4" },
            { id: "G", type: "voltmeter", a: [4, 3], b: [8, 3], signed: true }
          ],
          wires: [[[0, 0], [8, 0]], [[0, 6], [8, 6]]], labels: [{ at: [4, 3], text: "A", dx: -10, dy: -8 }, { at: [8, 3], text: "B", dx: 10, dy: -8 }],
          ground: [0, 6], tools: [], show: { values: true }, answer: { kind: "value", part: "RV" }
        } } },
      { id: "t4-g6", mode: "graded", type: "circuit", points: 2, tol: 0.02, difficulty: 3,
        hints: [
          { en: "Thévenin resistance: deactivate the sources. A voltage source becomes a short circuit, a current source becomes an open circuit.", fi: "Théveninin resistanssi: kytke lähteet pois. Jännitelähde korvataan oikosululla ja virtalähde avoimella piirillä." },
          { en: "After deactivating, see which resistors are in parallel as seen from A–B. R3 stays in series with that combination; check whether the opened current source changes anything.", fi: "Kun lähteet on kytketty pois, katso, mitkä vastukset ovat rinnan navoista A–B nähtynä. R3 on sarjassa tämän yhdistelmän kanssa; tarkista, vaikuttaako avattu virtalähde mihinkään." },
          { en: "Write R_T = R_3 + (R_1 ∥ R_2), evaluate the parallel part, and solve R_3 from the target value.", fi: "Kirjoita R_T = R_3 + (R_1 ∥ R_2), laske rinnankytkennän resistanssi ja ratkaise R_3 tavoitearvosta." }
        ],
        prompt: L("Adjust the editable resistor R3 so that the Thévenin resistance seen from terminals A–B (voltage source shorted, current source opened) is exactly 8 Ω.", "Säädä muokattavaa vastusta R3 niin, että navoista A–B nähty Théveninin resistanssi (jännitelähde oikosuljettuna, virtalähde avoimena) on tasan 8 Ω."),
        widget: { name: "circuit", config: {
          size: [12, 6],
          parts: [
            { id: "U1", type: "V", a: [0, 6], b: [0, 3], value: 10 },
            { id: "R1", type: "R", a: [0, 3], b: [0, 0], value: 2, label: "2 Ω" },
            { id: "R2", type: "R", a: [4, 0], b: [4, 6], value: 8, label: "8 Ω" },
            { id: "I1", type: "I", a: [7, 6], b: [7, 0], value: 0.5, label: "0,5 A" },
            { id: "R3", type: "R", a: [7, 0], b: [11, 0], value: 5, label: "R3", labelSide: "other", editable: { min: 1, max: 15, step: 0.1 } }
          ],
          wires: [[[0, 0], [7, 0]], [[0, 6], [11, 6]]],
          labels: [{ at: [11, 0], text: "A", dx: 10, dy: -8 }, { at: [11, 6], text: "B", dx: 10, dy: 12 }],
          ground: [0, 6], tools: [], show: { values: true }, answer: { kind: "Req", a: [11, 0], b: [11, 6] }
        } } }
    ]
  });
})();

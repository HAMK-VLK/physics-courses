/* Topic 2: Ohm's law and resistors. Source: source/extracted/topic2-ohms-law-resistors.md (errata applied).
 * NO answers in this file: they live in src/answers/topic2.json. Block ids are stable; never rename. */
(function () {
  "use strict";

  // ---------- small helpers (pure, no DOM access at load time) ----------
  var COL = [
    { en: "black", fi: "musta", hex: "#1a1a1a" }, { en: "brown", fi: "ruskea", hex: "#7b4a1e" },
    { en: "red", fi: "punainen", hex: "#d62828" }, { en: "orange", fi: "oranssi", hex: "#f28a1a" },
    { en: "yellow", fi: "keltainen", hex: "#f2d21a" }, { en: "green", fi: "vihreä", hex: "#2a9d3f" },
    { en: "blue", fi: "sininen", hex: "#2a62d4" }, { en: "violet", fi: "violetti", hex: "#8a3fc4" },
    { en: "gray", fi: "harmaa", hex: "#8a8f96" }, { en: "white", fi: "valkoinen", hex: "#f4f4f4" },
    { en: "gold", fi: "kulta", hex: "#d4af37" }, { en: "silver", fi: "hopea", hex: "#c0c0c0" },
    { en: "none", fi: "ei väriä", hex: "none" }
  ];
  function colMult(ci) { return ci <= 9 ? Math.pow(10, ci) : (ci === 10 ? 0.1 : 0.01); }
  var TOL4 = { 1: 1, 2: 2, 10: 5, 11: 10, 12: 20 };
  var TOL5 = { 1: 1, 2: 2, 5: 0.5, 6: 0.25, 7: 0.1, 10: 5, 11: 10, 12: 20 };

  /** SVG string of a resistor with colour bands (indices into COL). Used in figures and the colour-code widget. */
  function bandsSvg(idx, attrs) {
    var n = idx.length, x0 = 62, step = n === 5 ? 24 : 30, s = "";
    s += "<svg viewBox='0 0 240 70' " + (attrs || "") + " xmlns='http://www.w3.org/2000/svg'>";
    s += "<line x1='4' y1='35' x2='236' y2='35' stroke='currentColor' stroke-width='3'/>";
    s += "<rect x='42' y='14' width='156' height='42' rx='16' fill='#d9bd8c' stroke='currentColor' stroke-width='1.5'/>";
    idx.forEach(function (ci, i) {
      var x = i === n - 1 ? x0 + step * (n - 1) + 16 : x0 + step * i;
      if (COL[ci].hex === "none") s += "<rect class='band' data-i='" + i + "' x='" + x + "' y='14' width='9' height='42' fill='none' stroke='currentColor' stroke-dasharray='2 2' stroke-width='.8'/>";
      else s += "<rect class='band' data-i='" + i + "' x='" + x + "' y='14' width='9' height='42' fill='" + COL[ci].hex + "' stroke='#0006' stroke-width='.6'/>";
    });
    return s + "</svg>";
  }
  function T(en, fi) { return { en: en, fi: fi }; }
  function par(a, b) { return a * b / (a + b); }

  // ---------- circuit config builders ----------
  /** Series loop: three resistors + ammeter. vals=[R1,R2,R3] */
  function seriesCfg(vals, src, extra) {
    var ed = { min: 10, max: 2000 };
    var c = {
      size: [9, 4],
      parts: [
        { id: "U1", type: "V", a: [0, 4], b: [0, 0], value: src, editable: { min: 0, max: 24, step: 0.5 } },
        { id: "R1", type: "R", a: [1, 0], b: [4, 0], value: vals[0], editable: ed },
        { id: "R2", type: "R", a: [5, 0], b: [8, 0], value: vals[1], editable: ed },
        { id: "R3", type: "R", a: [9, 1], b: [9, 4], value: vals[2], editable: ed },
        { id: "A1", type: "ammeter", a: [3, 4], b: [5, 4] }
      ],
      wires: [[[0, 0], [1, 0]], [[4, 0], [5, 0]], [[8, 0], [9, 0], [9, 1]], [[9, 4], [5, 4]], [[3, 4], [0, 4]]],
      ground: [0, 4], tools: ["wire", "cut"], show: { values: true, flow: true }, table: true
    };
    if (extra) for (var k in extra) c[k] = extra[k];
    return c;
  }
  /** Parallel: three vertical branches. */
  function parallelCfg(vals, src) {
    var ed = { min: 10, max: 2000 }, xs = [5, 8, 11];
    var parts = [
      { id: "U1", type: "V", a: [0, 4], b: [0, 0], value: src, editable: { min: 0, max: 24, step: 0.5 } },
      { id: "A1", type: "ammeter", a: [1, 4], b: [3, 4] }
    ], wires = [[[0, 0], [11, 0]], [[3, 4], [11, 4]], [[0, 4], [1, 4]]];
    xs.forEach(function (x, i) {
      parts.push({ id: "R" + (i + 1), type: "R", a: [x, 1], b: [x, 4], value: vals[i], editable: ed });
      wires.push([[x, 0], [x, 1]]);
    });
    return { size: [11, 4], parts: parts, wires: wires, ground: [0, 4], tools: ["wire", "cut"], show: { values: true, flow: true }, table: true };
  }
  /** Short-circuit demo: R1 + R2 in series, ammeter. */
  function twoSeriesCfg(r1, r2, src, tools) {
    return {
      size: [8, 4],
      parts: [
        { id: "U1", type: "V", a: [0, 4], b: [0, 0], value: src },
        { id: "R1", type: "R", a: [1, 0], b: [4, 0], value: r1 },
        { id: "R2", type: "R", a: [5, 0], b: [8, 0], value: r2 },
        { id: "A1", type: "ammeter", a: [3, 4], b: [5, 4] }
      ],
      wires: [[[0, 0], [1, 0]], [[4, 0], [5, 0]], [[8, 0], [8, 4], [5, 4]], [[3, 4], [0, 4]]],
      ground: [0, 4], tools: tools || ["wire", "cut"], show: { values: true, flow: true }, table: true
    };
  }

  TDC.registerTopic({
    id: "t2", num: 2,
    title: T("Ohm's law and resistors", "Ohmin laki ja vastukset"),
    subtitle: T("Current, resistance, power, and how resistors combine in series, in parallel and as dividers.",
                "Virta, resistanssi, teho sekä vastusten sarjaan- ja rinnankytkentä ja jakajat."),
    objectives: [
      T("explain current, current density and drift velocity (I = n·e·v_d·A)", "selittää virran, virrantiheyden ja kulkeutumisnopeuden (I = n·e·v_d·A)"),
      T("apply Ohm's law and R = ρ·l/A, and read a U–I characteristic", "soveltaa Ohmin lakia ja kaavaa R = ρ·l/A sekä lukea U–I-ominaiskäyrää"),
      T("decode resistor colour codes and label codes", "lukea vastusten värikoodit ja merkintäkoodit"),
      T("account for the temperature dependence of resistance", "ottaa huomioon resistanssin lämpötilariippuvuuden"),
      T("calculate electric power and size fuses", "laskea sähkötehon ja mitoittaa sulakkeita"),
      T("find equivalent resistance of series, parallel and mixed networks", "määrittää sarja-, rinnan- ja sekakytkentöjen korvausresistanssin"),
      T("use the voltage divider and the current divider", "käyttää jännitteenjakoa ja virranjakoa")
    ],
    glossary: {
      current: { en: "electric current", fi: "sähkövirta", sym: "I", def: T("Net charge passing a cross-section per unit time, unit ampere (A).", "Johtimen poikkileikkauksen läpi aikayksikössä kulkeva nettovaraus, yksikkö ampeeri (A).") },
      currentdensity: { en: "current density", fi: "virrantiheys", sym: "J = I/A", def: T("Current per unit cross-section area, unit A/m².", "Virta poikkipinta-alayksikköä kohti, yksikkö A/m².") },
      driftvelocity: { en: "drift velocity", fi: "kulkeutumisnopeus", sym: "v_d", def: T("Slow average velocity of free charges along the wire, typically tenths of a mm/s.", "Vapaiden varausten hidas keskimääräinen nopeus johtimen suunnassa, tyypillisesti kymmenesosia mm/s.") },
      resistance: { en: "resistance", fi: "resistanssi", sym: "R = U/I", def: T("Ratio of voltage to current for a component, unit ohm (Ω).", "Komponentin jännitteen ja virran suhde, yksikkö ohmi (Ω).") },
      resistivity: { en: "resistivity", fi: "resistiivisyys", sym: "ρ", def: T("Material property: R = ρ·l/A, unit Ω·m.", "Aineen ominaisuus: R = ρ·l/A, yksikkö Ω·m.") },
      conductance: { en: "conductance", fi: "konduktanssi", sym: "G = 1/R", def: T("Reciprocal of resistance, unit siemens (S).", "Resistanssin käänteisluku, yksikkö siemens (S).") },
      conductivity: { en: "conductivity", fi: "konduktiivisuus", sym: "γ = 1/ρ", def: T("Reciprocal of resistivity, unit S/m.", "Resistiivisyyden käänteisluku, yksikkö S/m.") },
      ohmic: { en: "ohmic (linear) material", fi: "ohminen (lineaarinen) aine", def: T("Voltage is proportional to current, so R is constant.", "Jännite on suoraan verrannollinen virtaan, joten R on vakio.") },
      tempcoeff: { en: "temperature coefficient", fi: "lämpötilakerroin", sym: "α", def: T("Relative change of resistance per degree: R_T = R₀[1 + α(T − T₀)].", "Resistanssin suhteellinen muutos astetta kohti: R_T = R₀[1 + α(T − T₀)].") },
      ntc: { en: "NTC resistor", fi: "NTC-vastus", def: T("Resistor with a negative temperature coefficient; resistance falls as it warms.", "Vastus, jonka lämpötilakerroin on negatiivinen; resistanssi pienenee lämpötilan noustessa.") },
      resistor: { en: "resistor", fi: "vastus", def: T("Component with a defined resistance: limits current, divides voltage, produces heat.", "Komponentti, jolla on määrätty resistanssi: rajoittaa virtaa, jakaa jännitettä ja tuottaa lämpöä.") },
      tolerance: { en: "tolerance", fi: "toleranssi", def: T("Permitted relative deviation of the actual value from the nominal value.", "Todellisen arvon sallittu suhteellinen poikkeama nimellisarvosta.") },
      colorcode: { en: "colour code", fi: "värikoodi", def: T("Coloured bands encoding digits, multiplier and tolerance.", "Värirenkaat, jotka koodaavat numerot, kertoimen ja toleranssin.") },
      potentiometer: { en: "potentiometer", fi: "potentiometri", def: T("Three-terminal variable resistor used as an adjustable voltage divider.", "Kolminapainen säätövastus, jota käytetään säädettävänä jännitteenjakajana.") },
      rheostat: { en: "rheostat", fi: "reostaatti (säätövastus)", def: T("Two-terminal variable resistor used to control current.", "Kaksinapainen säätövastus virran säätöön.") },
      power: { en: "electric power", fi: "sähköteho", sym: "P = U·I", def: T("Rate of energy conversion, unit watt (W).", "Energian muuntumisnopeus, yksikkö watti (W).") },
      fuse: { en: "fuse", fi: "sulake", def: T("Thin conductor in series that melts at overcurrent and opens the circuit.", "Sarjaan kytketty ohut johdin, joka sulaa ylivirrassa ja katkaisee piirin.") },
      breaker: { en: "circuit breaker", fi: "johdonsuojakatkaisija", def: T("Resettable overcurrent protection using a bimetallic strip.", "Palautettava ylivirtasuoja, joka toimii bimetalliliuskan avulla.") },
      series: { en: "series connection", fi: "sarjaankytkentä", def: T("Components in one path: same current, voltages add.", "Komponentit samassa reitissä: sama virta, jännitteet summautuvat.") },
      parallel: { en: "parallel connection", fi: "rinnankytkentä", def: T("Components across the same two nodes: same voltage, currents add.", "Komponentit samojen kahden solmun välissä: sama jännite, virrat summautuvat.") },
      equivres: { en: "equivalent resistance", fi: "korvausresistanssi (kokonaisresistanssi)", sym: "R_eq", def: T("Single resistance that draws the same current from the same voltage.", "Yksittäinen resistanssi, joka ottaa saman virran samasta jännitteestä.") },
      voltagedivider: { en: "voltage divider", fi: "jännitteenjakaja", def: T("Series resistors: U_k = (R_k/R_total)·U.", "Sarjaan kytketyt vastukset: U_k = (R_k/R_kok)·U.") },
      currentdivider: { en: "current divider", fi: "virranjakaja", def: T("Two parallel resistors: I₁ = R₂/(R₁+R₂)·I.", "Kaksi rinnankytkettyä vastusta: I₁ = R₂/(R₁+R₂)·I.") },
      shortcircuit: { en: "short circuit", fi: "oikosulku", def: T("A near-zero-resistance path bypassing part of a circuit.", "Lähes nollaresistanssinen reitti, joka ohittaa osan piiristä.") },
      ground: { en: "ground (reference node)", fi: "maa (vertailusolmu)", def: T("Node chosen as 0 V; potentials are measured against it.", "Solmu, jonka potentiaaliksi valitaan 0 V; muut potentiaalit mitataan siihen nähden.") },
      load: { en: "load", fi: "kuorma", def: T("Component that consumes the power of the source.", "Komponentti, joka kuluttaa lähteen tehoa.") }
    },
    formulas: [
      { name: T("Current", "Virta"), tex: "I = {dQ}/{dt} ≈ {ΔQ}/{Δt}" },
      { name: T("Current and drift velocity", "Virta ja kulkeutumisnopeus"), tex: "I = n·e·v_d·A" },
      { name: T("Current density", "Virrantiheys"), tex: "J = {I}/{A}" },
      { name: T("Ohm's law", "Ohmin laki"), tex: "U = R·I" },
      { name: T("Local form of Ohm's law", "Ohmin lain paikallinen muoto"), tex: "E = ρ·J" },
      { name: T("Resistance of a conductor", "Johtimen resistanssi"), tex: "R = {ρ·l}/{A}" },
      { name: T("Conductance", "Konduktanssi"), tex: "G = {1}/{R},  I = G·U" },
      { name: T("Conductivity", "Konduktiivisuus"), tex: "γ = {1}/{ρ}" },
      { name: T("Temperature dependence", "Lämpötilariippuvuus"), tex: "R_T = R_0[1 + α(T − T_0)]" },
      { name: T("Electric power", "Sähköteho"), tex: "P = U·I = R·I^2 = {U^2}/{R}" },
      { name: T("Series connection", "Sarjaankytkentä"), tex: "R_{eq} = R_1 + R_2 + R_3 + …" },
      { name: T("Parallel connection", "Rinnankytkentä"), tex: "{1}/{R_{eq}} = {1}/{R_1} + {1}/{R_2} + …" },
      { name: T("Two parallel resistors", "Kaksi rinnakkaista vastusta"), tex: "R_{eq} = {R_1·R_2}/{R_1 + R_2}" },
      { name: T("Voltage divider", "Jännitteenjako"), tex: "U_k = {R_k}/{R_1 + R_2 + …}·U" },
      { name: T("Current divider (two resistors)", "Virranjako (kaksi vastusta)"), tex: "I_1 = {R_2}/{R_1 + R_2}·I" }
    ],
    sections: [
      /* ===================== 2.1 CURRENT ===================== */
      {
        id: "t2-current", title: T("Electric current", "Sähkövirta"),
        blocks: [
          { id: "t2-cur-p1", type: "text", html: T(
            "<p>Inside a metal at room temperature the free electrons rush around at roughly <b>100–120 km/s</b> in random directions. Because there is no preferred direction, the <b>net current is zero</b>.</p><p>A potential difference between the ends of a wire creates an electric field <em>E</em> inside it. The field adds a slow, common drift to the random motion, and that drift is the current.</p>",
            "<p>Metallin vapaat elektronit liikkuvat huoneenlämmössä satunnaisiin suuntiin noin <b>100–120 km/s</b> nopeudella. Koska mikään suunta ei ole etusijalla, <b>nettovirta on nolla</b>.</p><p>Johtimen päiden välinen potentiaaliero synnyttää johtimeen sähkökentän <em>E</em>. Kenttä lisää satunnaiseen liikkeeseen hitaan yhteisen ajautumisen, ja tämä ajautuminen on virta.</p>") },
          { id: "t2-cur-fig1", type: "figure", caption: T("Conventional current I points from high to low potential. Electrons drift the opposite way.", "Virran suunta sovitaan korkeammasta potentiaalista matalampaan. Elektronit ajautuvat vastakkaiseen suuntaan."),
            alt: T("Wire with current arrow right and electrons moving left", "Johdin, jossa virtanuoli oikealle ja elektronit vasemmalle"),
            svg: (function (s) { return { en: s, fi: s.replace('(electrons)', '(elektronit)') }; })("<svg viewBox='0 0 340 120' xmlns='http://www.w3.org/2000/svg' style='max-width:100%;color:var(--fg)'><rect x='38' y='46' width='260' height='40' rx='10' fill='var(--surface-2)' stroke='currentColor'/><g fill='var(--c-electron)'><circle cx='78' cy='58' r='5'/><circle cx='128' cy='75' r='5'/><circle cx='196' cy='56' r='5'/><circle cx='262' cy='74' r='5'/></g><g stroke='var(--c-electron)' stroke-width='2' fill='none'><path d='M228 67 H160 M166 62 L160 67 L166 72'/></g><text x='168' y='106' text-anchor='middle' fill='var(--c-electron)' font-size='12'>v_d (electrons)</text><path d='M88 26 H248 M240 20 L248 26 L240 32' stroke='var(--c-flow)' stroke-width='2.5' fill='none'/><text x='168' y='18' text-anchor='middle' fill='var(--c-flow)' font-size='13'>I, E</text><text x='34' y='70' text-anchor='end' fill='currentColor' font-size='13'>V₁ (+)</text><text x='302' y='70' fill='currentColor' font-size='13'>V₂ (−)</text></svg>") },
          { id: "t2-cur-f1", type: "formula", key: true, tex: "I = {dQ}/{dt} ≈ {ΔQ}/{Δt}", label: T("Definition of current", "Virran määritelmä"),
            legend: [["Q", T("charge", "varaus"), "C"], ["t", T("time", "aika"), "s"], ["I", T("current", "virta"), "A = C/s"]] },
          { id: "t2-cur-p2", type: "text", html: T(
            "<p>With <f>n</f> free charges per unit volume, in time <f>dt</f> all charges within the length <f>v_d·dt</f> pass the cross-section <f>A</f>. Hence <f>dQ = n·e·v_d·A·dt</f>.</p>",
            "<p>Kun vapaita varauksia on <f>n</f> tilavuusyksikköä kohti, kaikki matkalla <f>v_d·dt</f> olevat varaukset ehtivät ajassa <f>dt</f> poikkipinnan <f>A</f> läpi. Siten <f>dQ = n·e·v_d·A·dt</f>.</p>") },
          { id: "t2-cur-f2", type: "formula", key: true, tex: "I = n·e·v_d·A", label: T("Current and drift velocity", "Virta ja kulkeutumisnopeus"),
            legend: [["n", T("free charges per m³", "vapaita varauksia / m³"), "m⁻³"], ["e", T("elementary charge", "alkeisvaraus"), "1.60·10⁻¹⁹ C"], ["v_d", T("drift velocity", "kulkeutumisnopeus"), "m/s"], ["A", T("cross-section area", "poikkipinta-ala"), "m²"]] },
          { id: "t2-cur-f3", type: "formula", tex: "J = {I}/{A}", label: T("Current density", "Virrantiheys"), legend: [["J", T("current density", "virrantiheys"), "A/m²"]] },
          { id: "t2-cur-c1", type: "callout", kind: "warn", title: T("Misconception", "Yleinen virhekäsitys"), html: T(
            "Electrons do <b>not</b> race through the wire at light speed. They drift at fractions of a millimetre per second; the lamp lights at once because the <em>field</em> is set up almost instantly along the whole wire. Current is also not \"used up\": the same current leaves the lamp as enters it.",
            "Elektronit eivät kiitä johtimessa valon nopeudella. Ne ajautuvat murto-osan millimetristä sekunnissa. Lamppu syttyy heti, koska <em>kenttä</em> syntyy lähes silmänräpäyksessä koko johtimeen. Virta ei myöskään \"kulu loppuun\": lampusta lähtee yhtä suuri virta kuin sinne tulee.") },
          { id: "t2-cur-w1", type: "interactive", widget: "custom", title: T("Drift explorer: random motion vs slow drift", "Kulkeutumisen tutkija: satunnaisliike vs. hidas ajautuminen"),
            caption: T("Electrons jitter fast in all directions but drift slowly against I. Change current, area and material and watch v_d and the fuse limit (copper table: 1.5 mm² → 10 A, 2.5 → 16 A, 6 → 20 A, 16 → 50 A).",
                       "Elektronit värähtelevät nopeasti joka suuntaan mutta ajautuvat hitaasti virtaa vastaan. Muuta virtaa, pinta-alaa ja materiaalia ja seuraa v_d:tä ja sulakkeen rajaa (kuparitaulukko: 1,5 mm² → 10 A, 2,5 → 16 A, 6 → 20 A, 16 → 50 A)."),
            config: { mount: function (host, ctx) {
              var U = TDC.util, el = U.el, E = 1.602e-19;
              var mats = [{ n: 8.48e28, en: "copper", fi: "kupari" }, { n: 6.02e28, en: "aluminium", fi: "alumiini" }, { n: 5.86e28, en: "silver", fi: "hopea" }];
              var mat = mats[0];
              var params = [{ id: "I", tex: "I", min: 0.1, max: 60, value: 10, unit: "A", log: true }, { id: "A", tex: "A", min: 0.5, max: 16, value: 3, unit: "mm²", log: true }];
              var panel = TDC.viz.params(params, function () { update(); }, ctx);
              var sel = el("select", { "aria-label": "material" });
              function fillSel() { var v = sel.selectedIndex < 0 ? 0 : sel.selectedIndex; sel.innerHTML = ""; mats.forEach(function (m, i) { sel.appendChild(el("option", { value: i }, ctx.tx(m))); }); sel.selectedIndex = v; }
              fillSel(); sel.addEventListener("change", function () { mat = mats[sel.selectedIndex]; update(); });
              var out = el("div", { class: "readout-list" }), bar = el("div", { style: { height: "10px", background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: "6px", overflow: "hidden", margin: ".4rem 0" } }), fill = el("div", { style: { height: "100%", width: "0%" } });
              bar.appendChild(fill);
              var dots = []; for (var i = 0; i < 40; i++) dots.push({ x: Math.random(), y: Math.random(), ph: Math.random() * 6 });
              var vd = 0, vis = 20, thick = 0.5;
              function lim(A) { return A >= 16 ? 50 : A >= 6 ? 20 : A >= 2.5 ? 16 : A >= 1.5 ? 10 : 10 * A / 1.5; }
              function update() {
                var I = panel.values.I, A = panel.values.A * 1e-6;
                vd = I / (mat.n * E * A); var J = I / A, L = lim(panel.values.A);
                vis = 15 + 25 * Math.max(0, Math.log10(vd / 1e-7)); thick = Math.sqrt(panel.values.A / 16);
                out.innerHTML = "";
                [["J = I/A", U.fmtSI(J, "A/m²", 3)], ["v_d", U.fmtSI(vd, "m/s", 3)], ["v_rms (T = 293 K)", "≈ 115 km/s"], ["v_rms / v_d", "≈ " + U.fmtNum(115392 / vd, 2)]].forEach(function (r) { out.appendChild(el("div", { class: "readout" }, [el("span", {}, r[0]), el("b", {}, " = " + r[1])])); });
                var over = I > L;
                out.appendChild(el("div", { class: "readout" }, [el("span", {}, ctx.tx(T("Fuse limit of this copper wire", "Tämän kuparijohtimen sulakeraja"))), el("b", { style: { color: over ? "var(--bad)" : "var(--ok)" } }, " = " + U.fmtNum(L, 3) + " A  " + (over ? ctx.tx(T("OVERLOAD", "YLIKUORMA")) : "OK"))]));
                fill.style.width = Math.min(100, I / L * 100) + "%"; fill.style.background = over ? "var(--bad)" : "var(--ok)";
                c.redraw();
              }
              var c = TDC.viz.canvas(host, { aspect: 0.28, draw: function (g, w, h, t, dt) {
                g.clearRect(0, 0, w, h);
                var th = (h - 30) * (0.35 + 0.65 * thick), y0 = (h - th) / 2;
                g.fillStyle = ctx.color("--surface-2"); g.strokeStyle = ctx.color("--line"); g.lineWidth = 1.5;
                g.fillRect(10, y0, w - 20, th); g.strokeRect(10, y0, w - 20, th);
                g.fillStyle = ctx.color("--c-electron");
                var moving = !U.reducedMotion();
                dots.forEach(function (d) {
                  if (moving) { d.x -= dt * vis / w; if (d.x < 0) d.x += 1; }
                  var jx = moving ? (Math.random() - 0.5) * 7 : 0, jy = moving ? (Math.random() - 0.5) * 7 : 0;
                  g.beginPath(); g.arc(10 + d.x * (w - 20) + jx, y0 + 5 + d.y * (th - 10) + jy, 3, 0, 7); g.fill();
                });
                g.strokeStyle = ctx.color("--c-flow"); g.fillStyle = ctx.color("--c-flow"); g.lineWidth = 2.5;
                g.beginPath(); g.moveTo(w * 0.3, 12); g.lineTo(w * 0.7, 12); g.stroke();
                g.beginPath(); g.moveTo(w * 0.7, 12); g.lineTo(w * 0.7 - 9, 7); g.lineTo(w * 0.7 - 9, 17); g.fill();
                g.fillStyle = ctx.color("--fg"); g.font = "13px system-ui,sans-serif"; g.fillText("I", w * 0.5 - 3, h - 8);
                g.fillStyle = ctx.color("--c-electron"); g.fillText("e⁻ ←", 16, h - 8);
              } });
              host.append(el("div", { style: { display: "flex", gap: ".6rem", alignItems: "center", margin: ".4rem 0" } }, [el("span", {}, ctx.tx(T("Material:", "Materiaali:"))), sel]), panel, bar, out);
              ctx.onLang(function () { fillSel(); update(); });
              update();
              return { destroy: function () { c.destroy(); } };
            } } },
          { id: "t2-cur-ex1", type: "example", title: T("Electron in a field", "Elektroni sähkökentässä"),
            problem: T("An electron is accelerated by V = 230 V over d = 5.0 mm (vacuum). Find a) the acceleration, b) the final speed.", "Elektroni kiihdytetään jännitteellä V = 230 V matkalla d = 5,0 mm (tyhjiö). Laske a) kiihtyvyys ja b) loppunopeus."),
            given: ["V = 230 V", "d = 5.0 mm", "e = 1.60·10⁻¹⁹ C", "m = 9.11·10⁻³¹ kg"],
            steps: [
              T("Force on the electron: F = m·a = e·E = e·V/d.", "Elektroniin kohdistuva voima: F = m·a = e·E = e·V/d."),
              { tex: "a = {e·V}/{m·d} = {1.60·10^{-19}·230}/{9.11·10^{-31}·0.0050} ≈ 8.1·10^{15} m/s^2" },
              T("Energy conservation: e·V = ½·m·v².", "Energian säilyminen: e·V = ½·m·v²."),
              { tex: "v = sqrt{{2·e·V}/{m}} ≈ 9.0·10^6 m/s" }
            ],
            result: T("a ≈ 8.1·10¹⁵ m/s², v ≈ 9.0 Mm/s", "a ≈ 8,1·10¹⁵ m/s², v ≈ 9,0 Mm/s") },
          { id: "t2-cur-w2", type: "interactive", widget: "custom", title: T("Electron between two plates", "Elektroni kahden levyn välissä"),
            caption: T("Check the example: V = 230 V and d = 5 mm give v ≈ 9.0·10⁶ m/s. The animation is slowed down enormously.", "Tarkista esimerkki: V = 230 V ja d = 5 mm antavat v ≈ 9,0·10⁶ m/s. Animaatio on hidastettu moninkertaisesti."),
            config: { mount: function (host, ctx) {
              var U = TDC.util, el = U.el, E = 1.60e-19, M = 9.11e-31;
              var panel = TDC.viz.params([{ id: "V", tex: "V", min: 10, max: 500, step: 10, value: 230, unit: "V" }, { id: "d", tex: "d", min: 1, max: 10, step: 0.5, value: 5, unit: "mm" }], function () { upd(); }, ctx);
              var out = el("div", { class: "readout-list" });
              function upd() {
                var V = panel.values.V, d = panel.values.d * 1e-3;
                out.innerHTML = "";
                [["a = eV/(md)", U.fmtSI(E * V / (M * d), "m/s²", 3)], ["v = √(2eV/m)", U.fmtSI(Math.sqrt(2 * E * V / M), "m/s", 3)]].forEach(function (r) { out.appendChild(el("div", { class: "readout" }, [el("span", {}, r[0]), el("b", {}, " = " + r[1])])); });
                c.redraw();
              }
              // Flight time t = d·√(2m/(eV)): one shared slow-motion factor (2 s for the 230 V / 5 mm example),
              // so a higher V or a smaller d visibly gives a faster crossing. The gap width follows d.
              var ph = 0, rest = 0;
              var c = TDC.viz.canvas(host, { aspect: 0.3, draw: function (g, w, h, t, dt) {
                g.clearRect(0, 0, w, h);
                var V = panel.values.V, dmm = panel.values.d, gap = w * (0.2 + 0.065 * dmm), x1 = (w - gap) / 2, x2 = x1 + gap;
                var dur = 2 * (dmm / 5) * Math.sqrt(230 / V);
                if (rest > 0) { rest -= dt; if (rest <= 0) ph = 0; } else { ph += dt / dur; if (ph >= 1) { ph = 1; rest = 0.8; } }
                g.lineWidth = 6; g.strokeStyle = ctx.color("--c-electron"); g.beginPath(); g.moveTo(x1, h * 0.1); g.lineTo(x1, h * 0.9); g.stroke();
                g.strokeStyle = ctx.color("--c-2"); g.beginPath(); g.moveTo(x2, h * 0.1); g.lineTo(x2, h * 0.9); g.stroke();
                g.fillStyle = ctx.color("--fg"); g.font = "bold 16px system-ui,sans-serif"; g.fillText("−", x1 - 4, h * 0.08 + 8); g.fillText("+", x2 - 5, h * 0.08 + 8);
                g.strokeStyle = ctx.color("--muted"); g.lineWidth = 1; g.setLineDash([5, 4]);
                for (var k = 1; k < 4; k++) { var yy = h * (0.2 + 0.2 * k); g.beginPath(); g.moveTo(x2, yy); g.lineTo(x1, yy); g.stroke(); }
                g.setLineDash([]);
                var f = U.reducedMotion() ? 0.6 : ph;
                var xe = x1 + (x2 - x1) * f * f;
                g.fillStyle = ctx.color("--c-electron"); g.beginPath(); g.arc(xe, h / 2, 7, 0, 7); g.fill();
                g.strokeStyle = ctx.color("--c-flow"); g.fillStyle = ctx.color("--c-flow"); g.lineWidth = 2.5; var len = 8 + 70 * f * Math.sqrt(V / 500);
                g.beginPath(); g.moveTo(xe + 10, h / 2); g.lineTo(xe + 10 + len, h / 2); g.stroke();
                g.beginPath(); g.moveTo(xe + 10 + len, h / 2); g.lineTo(xe + len + 2, h / 2 - 5); g.lineTo(xe + len + 2, h / 2 + 5); g.fill();
                g.fillStyle = ctx.color("--fg"); g.font = "13px system-ui,sans-serif"; g.fillText("v", xe + len + 16, h / 2 + 4); g.fillText("d", (x1 + x2) / 2, h * 0.97);
              } });
              host.append(panel, out); upd();
              return { destroy: function () { c.destroy(); } };
            } } },
          { id: "t2-cur-ex2", type: "example", title: T("Drift velocity in copper", "Kulkeutumisnopeus kuparissa"),
            problem: T("A copper wire (n = 8.48·10²⁸ m⁻³, A = 3.0 mm²) carries I = 10 A. Find v_d and compare with v_rms ≈ 115 km/s.", "Kuparijohtimessa (n = 8,48·10²⁸ m⁻³, A = 3,0 mm²) kulkee virta I = 10 A. Laske v_d ja vertaa arvoon v_rms ≈ 115 km/s."),
            given: ["I = 10 A", "A = 3.0 mm²", "n = 8.48·10²⁸ m⁻³"],
            steps: [
              { tex: "v_d = {I}/{n·e·A} = {10}/{8.48·10^{28}·1.60·10^{-19}·3.0·10^{-6}}" },
              { tex: "v_d ≈ 2.5·10^{-4} m/s ≈ 0.25 mm/s" },
              T("The thermal speed is about 10⁹ times larger.", "Terminen liikkeen nopeus on noin 10⁹ kertaa suurempi.")
            ],
            result: T("v_d ≈ 0.25 mm/s", "v_d ≈ 0,25 mm/s") },
          { id: "t2-cur-ex3", type: "example", title: T("Charge and current density", "Varaus ja virrantiheys"),
            problem: T("A copper wire (A = 1.5 mm²) carries I = 9.5 A. Find the charge in 1.0 s, the number of elementary charges and J.", "Kuparijohtimessa (A = 1,5 mm²) kulkee virta I = 9,5 A. Laske varaus 1,0 sekunnissa, alkeisvarausten lukumäärä ja J."),
            given: ["I = 9.5 A", "t = 1.0 s", "A = 1.5 mm²"],
            steps: [
              { tex: "Q = I·t = 9.5 C" },
              { tex: "N = {Q}/{e} = {9.5}/{1.602·10^{-19}} ≈ 5.9·10^{19}" },
              { tex: "J = {I}/{A} = {9.5}/{1.5·10^{-6}} ≈ 6.3·10^6 A/m^2" }
            ],
            result: T("Q = 9.5 C, N ≈ 5.9·10¹⁹, J ≈ 6.3·10⁶ A/m²", "Q = 9,5 C, N ≈ 5,9·10¹⁹, J ≈ 6,3·10⁶ A/m²") },
          { id: "t2-cur-t1", type: "table", caption: T("Minimum copper cross-section for each fuse (k = 1.1)", "Pienin kuparijohtimen poikkipinta kullekin sulakkeelle (k = 1,1)"),
            head: [T("Fuse (A)", "Sulake (A)"), T("Copper (mm²)", "Kupari (mm²)")], rows: [["10", "1.5"], ["16", "2.5"], ["20", "6.0"], ["50", "16"]] },
          { id: "t2-cur-d1", type: "details", summary: T("Why don't the electrons escape the wire?", "Miksi elektronit eivät karkaa johtimesta?"), html: T(
            "<p>(extra) Electrons are held in the metal by a potential barrier at the surface (the work function), and the wire is insulated. For sensitive electronics the conductors are shielded and earthed so that stray fields and static charge do not disturb the signals.</p>",
            "<p>(lisä) Elektroneja pitää metallissa pintaa vasten oleva potentiaalivalli (irrotustyö), ja johdin on lisäksi eristetty. Herkässä elektroniikassa johtimet suojataan ja maadoitetaan, jotta häiriökentät ja staattinen varaus eivät häiritse signaaleja.</p>") },
          { id: "t2-cur-qb1", type: "question", q: "t2-q-dir" },
          { id: "t2-cur-qb2", type: "question", q: "t2-q-J" }
        ]
      },
      /* ===================== 2.2 OHM ===================== */
      {
        id: "t2-ohm", title: T("Ohm's law, resistivity and resistance", "Ohmin laki, resistiivisyys ja resistanssi"),
        blocks: [
          { id: "t2-ohm-p1", type: "text", html: T(
            "<p>In <b>ohmic</b> (linear) materials such as metals the field is proportional to the current density: <f>E = ρ·J</f>. The slope is the <dfn data-term='resistivity'>resistivity</dfn> ρ, unit Ω·m. In <b>nonohmic</b> materials (e.g. semiconductors) the relation is a curve and ρ is not constant.</p><p>For a wire of length <f>l</f> and area <f>A</f>: <f>E = U/l</f> and <f>J = I/A</f>, so <f>U = ρ(l/A)·I = R·I</f>.</p>",
            "<p><b>Ohmisissa</b> (lineaarisissa) aineissa, kuten metalleissa, kenttä on verrannollinen virrantiheyteen: <f>E = ρ·J</f>. Kulmakerroin on <dfn data-term='resistivity'>resistiivisyys</dfn> ρ, yksikkö Ω·m. <b>Epäohmisissa</b> aineissa (esim. puolijohteet) riippuvuus on käyrä eikä ρ ole vakio.</p><p>Johtimelle, jonka pituus on <f>l</f> ja pinta-ala <f>A</f>, pätee <f>E = U/l</f> ja <f>J = I/A</f>, joten <f>U = ρ(l/A)·I = R·I</f>.</p>") },
          { id: "t2-ohm-f1", type: "formula", key: true, tex: "U = R·I", label: T("Ohm's law", "Ohmin laki"),
            legend: [["U", T("voltage", "jännite"), "V"], ["R", T("resistance", "resistanssi"), "Ω"], ["I", T("current", "virta"), "A"]] },
          { id: "t2-ohm-f2", type: "formula", key: true, tex: "R = {ρ·l}/{A}", label: T("Resistance of a conductor", "Johtimen resistanssi"),
            legend: [["ρ", T("resistivity", "resistiivisyys"), "Ω·m"], ["l", T("length", "pituus"), "m"], ["A", T("cross-section area", "poikkipinta-ala"), "m²"]] },
          { id: "t2-ohm-c1", type: "callout", kind: "warn", title: T("Misconception", "Yleinen virhekäsitys"), html: T(
            "<f>R = U/I</f> does not mean R <em>depends</em> on U and I. For a wire R is fixed by ρ, l, A (and temperature). Doubling U doubles I, and R stays the same. A tungsten lamp is not ohmic: its R grows as it heats up.",
            "<f>R = U/I</f> ei tarkoita, että R <em>riippuisi</em> U:sta ja I:stä. Johtimen R määräytyy suureista ρ, l, A (ja lämpötilasta). Kun U kaksinkertaistuu, myös I kaksinkertaistuu ja R pysyy samana. Volframilamppu ei ole ohminen: sen R kasvaa lämmetessä.") },
          { id: "t2-ohm-w1", type: "interactive", widget: "plot", title: T("U–I characteristic: slope = R", "U–I-ominaiskäyrä: kulmakerroin = R"),
            caption: T("The solid line is an ohmic resistor, the dashed curve a nonohmic device. Drag R and I: the operating point moves along the line, and U/I at the point is always the slope.", "Yhtenäinen viiva on ohminen vastus ja katkoviiva epäohminen komponentti. Säädä R ja I: toimintapiste liikkuu viivalla ja U/I on aina kulmakerroin."),
            config: {
              x: { min: 0, max: 0.1, label: T("Current I", "Virta I"), unit: "A" }, y: { min: 0, max: 20, label: T("Voltage U", "Jännite U"), unit: "V", auto: true },
              params: [{ id: "R", tex: "R", min: 20, max: 200, step: 5, value: 100, unit: "Ω" }, { id: "I", tex: "I", min: 0.005, max: 0.1, step: 0.005, value: 0.05, unit: "A" }],
              curves: [
                { fn: function (x, p) { return p.R * x; }, label: T("ohmic: U = R·I", "ohminen: U = R·I"), color: "--c-1" },
                { fn: function (x, p) { return p.R * x * (1 + Math.pow(x / 0.05, 2) * 0.8); }, label: T("nonohmic", "epäohminen"), color: "--c-2", dash: true }
              ],
              points: function (p) { return [{ x: p.I, y: p.R * p.I, label: { en: "U = R·I", fi: "U = R·I" } }]; },
              readouts: function (p) { return [{ tex: "U", value: p.R * p.I, unit: "V" }, { tex: "{U}/{I}", value: p.R, unit: "Ω" }, { tex: "P", value: p.R * p.I * p.I, unit: "W" }]; }
            } },
          { id: "t2-ohm-w2", type: "interactive", widget: "three", title: T("A conductor in 3D: R = ρ·l/A", "Johdin 3D:nä: R = ρ·l/A"),
            caption: T("Drag to rotate. Make the wire longer or thinner and R grows; change the material's resistivity ρ (copper 16.8 nΩ·m, aluminium 26.5 nΩ·m, nichrome 1 µΩ·m). The electrons drift from − to + as if the same voltage were across every wire: a larger R means a slower drift, and a larger ρ means more scattering (jitter).", "Käännä vetämällä. Pidennä tai ohenna johdinta, niin R kasvaa; muuta aineen resistiivisyyttä ρ (kupari 16,8 nΩ·m, alumiini 26,5 nΩ·m, nikkelikromi 1 µΩ·m). Elektronit ajautuvat −:sta +:aan ikään kuin jokaisen johtimen yli olisi sama jännite: suurempi R hidastaa ajautumista ja suurempi ρ lisää sirontaa (värinää)."),
            config: {
              height: 300, camera: [0, 2.2, 7.2],
              params: [{ id: "l", tex: "l", min: 1, max: 10, step: 0.5, value: 4, unit: "m" }, { id: "A", tex: "A", min: 0.5, max: 16, step: 0.5, value: 2.5, unit: "mm²" }, { id: "rho", tex: "ρ", min: 16, max: 1000, value: 16.8, unit: "nΩ·m", log: true }],
              // Metal core (colour follows ρ: copper → aluminium → nichrome) inside a clear sleeve, + and − terminals,
              // drifting electrons (− → +; faster when R is smaller at the same voltage, more jitter when ρ is larger),
              // and a dimension line for l plus a ring marking the cross-section A.
              build: function (THREE, scene, api) {
                var CYL = new THREE.CylinderGeometry(1, 1, 1, 48, 1, true);
                function rod(m) { var o = new THREE.Mesh(CYL, m); o.rotation.z = Math.PI / 2; scene.add(o); return o; }
                var coreMat = new THREE.MeshStandardMaterial({ color: 0xc8742f, metalness: 0.55, roughness: 0.35, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
                var core = rod(coreMat);
                var sleeve = rod(new THREE.MeshStandardMaterial({ color: 0x7fb4ff, roughness: 0.15, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
                function cap(color) { var m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 48), new THREE.MeshStandardMaterial({ color: color, metalness: 0.3, roughness: 0.4 })); m.rotation.z = Math.PI / 2; scene.add(m); return m; }
                var capP = cap(api.color("--bad")), capN = cap(api.color("--c-electron"));
                var ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 12, 64), new THREE.MeshBasicMaterial({ color: api.color("--c-flow") }));
                ring.rotation.y = Math.PI / 2; scene.add(ring);
                var lineMat = new THREE.LineBasicMaterial({ color: api.color("--muted") });
                var dim = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([[-0.5, 0], [0.5, 0], [-0.5, -0.15], [-0.5, 0.15], [0.5, -0.15], [0.5, 0.15]]
                  .map(function (q) { return new THREE.Vector3(q[0], q[1], 0); })), lineMat);
                scene.add(dim);
                var N = 90, dots = [], e = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: api.color("--c-electron") }), N);
                for (var i = 0; i < N; i++) dots.push({ u: Math.random(), rr: Math.sqrt(Math.random()) * 0.75, a: Math.random() * 6.283 });
                scene.add(e);
                var M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V3 = new THREE.Vector3(), S3 = new THREE.Vector3();
                var labels = {}, geo = { L: 1, r: 0.2, speed: 1, jit: 0 }, last = null;
                function setLabel(key, txt, pos, size) {
                  var o = labels[key];
                  if (!o || o.txt !== txt) {
                    if (o) { scene.remove(o.sp); o.sp.material.map.dispose(); o.sp.material.dispose(); }
                    o = labels[key] = { txt: txt, sp: api.label(txt, { size: size || 0.5 }) }; scene.add(o.sp);
                  }
                  o.sp.position.set(pos[0], pos[1], pos[2]);
                }
                function mix(a, b, t) { return new THREE.Color(a).lerp(new THREE.Color(b), Math.max(0, Math.min(1, t))); }
                function placeDots(dt) {
                  var L = geo.L, r = geo.r, s = Math.min(0.09, r * 0.3);
                  dots.forEach(function (d, i) {
                    if (dt) { d.u -= dt * geo.speed / L; if (d.u < 0) d.u += 1; }
                    var j = dt ? geo.jit : 0, jr = (Math.random() - 0.5) * j;
                    var rr = Math.max(0, Math.min(0.85, d.rr + jr)) * r;
                    V3.set(-L / 2 + d.u * L + (Math.random() - 0.5) * j * r * 2, rr * Math.cos(d.a), rr * Math.sin(d.a));
                    S3.set(s, s, s); M4.compose(V3, Q, S3); e.setMatrixAt(i, M4);
                  });
                  e.instanceMatrix.needsUpdate = true;
                }
                function update(p) {
                  last = p;
                  var L = p.l * 1.3, r = 0.24 * Math.sqrt(p.A), R = p.rho * 1e-9 * p.l / (p.A * 1e-6), lr = Math.log(p.rho / 16) / Math.log(1000 / 16);
                  geo.L = L; geo.r = r;
                  geo.speed = 0.12 + 0.22 * TDC.util.flowRate(1 / R);          // drift with 1 V across the wire, log-compressed
                  geo.jit = 0.04 + 0.5 * lr;                                     // stronger scattering in a worse conductor
                  core.scale.set(r, L, r); sleeve.scale.set(r * 1.45, L * 0.82, r * 1.45);
                  coreMat.color = lr < 0.12 ? mix(0xc8742f, 0xc0c4cc, lr / 0.12) : mix(0xc0c4cc, 0x5d5f66, (lr - 0.12) / 0.88);
                  [[capP, -1], [capN, 1]].forEach(function (c) { c[0].scale.set(r * 1.7, 0.14, r * 1.7); c[0].position.set(c[1] * (L / 2 + 0.07), 0, 0); });
                  ring.scale.set(r * 1.08, r * 1.08, 1); ring.position.set(L * 0.18, 0, 0);
                  dim.scale.set(L, 1, 1); dim.position.set(0, -r * 1.45 - 0.45, 0);
                  setLabel("R", "R = " + TDC.util.fmtSI(R, "Ω", 3), [0, r * 1.45 + 0.75, 0], 0.65);
                  setLabel("l", "l = " + TDC.util.fmtSI(p.l, "m", 3), [0, -r * 1.45 - 0.75, 0], 0.38);
                  setLabel("A", "A = " + TDC.util.fmtNum(p.A, 3) + " mm²", [L * 0.18, r * 1.45 + 0.3, 0], 0.34);
                  setLabel("+", "+", [-(L / 2 + 0.07), r * 1.7 + 0.3, 0], 0.45);
                  setLabel("−", "−", [L / 2 + 0.07, r * 1.7 + 0.3, 0], 0.45);
                  placeDots(0);
                }
                return {
                  update: update,
                  tick: function (dt) { placeDots(dt); },
                  theme: function () { capP.material.color = api.color("--bad"); capN.material.color = e.material.color = api.color("--c-electron"); ring.material.color = api.color("--c-flow"); lineMat.color = api.color("--muted"); Object.keys(labels).forEach(function (k) { labels[k].txt = null; }); if (last) update(last); }
                };
              }
            } },
          { id: "t2-ohm-t1", type: "table", caption: T("Resistivity ρ and temperature coefficient α (reference temperature 20 °C)", "Resistiivisyys ρ ja lämpötilakerroin α (vertailulämpötila 20 °C)"),
            head: [T("Material", "Aine"), T("ρ (Ω·m)", "ρ (Ω·m)"), T("α (1/°C)", "α (1/°C)")],
            rows: [
              [T("Silver", "Hopea"), "1.59·10⁻⁸", "0.0061"], [T("Copper", "Kupari"), "1.68·10⁻⁸", "0.0068"], [T("Gold", "Kulta"), "2.44·10⁻⁸", "0.0034"],
              [T("Aluminium", "Alumiini"), "2.65·10⁻⁸", "0.00429"], [T("Tungsten", "Volframi"), "5.60·10⁻⁸", "0.0045"], [T("Iron", "Rauta"), "9.71·10⁻⁸", "0.00651"],
              [T("Platinum", "Platina"), "10.6·10⁻⁸", "0.003927"], [T("Mercury", "Elohopea"), "98·10⁻⁸", "0.0009"], [T("Nichrome", "Nikkelikromi"), "100·10⁻⁸", "0.0004"],
              [T("Carbon (graphite)", "Hiili (grafiitti)"), "(3–60)·10⁻⁵", "−0.0005"], [T("Germanium", "Germanium"), "(1–500)·10⁻³", "−0.05"], [T("Silicon", "Pii"), "0.1–60", "−0.07"],
              [T("Glass", "Lasi"), "10⁹–10¹²", "–"], [T("Hard rubber", "Kovakumi"), "10¹³–10¹⁵", "–"]
            ] },
          { id: "t2-ohm-ex1", type: "example", title: T("Aluminium cable", "Alumiinikaapeli"),
            problem: T("An aluminium wire has l = 300 m, A = 16 mm², ρ = 28.3 nΩ·m. a) Find R. b) What voltage drop does I = 9.5 A cause?", "Alumiinijohtimen pituus on l = 300 m, A = 16 mm² ja ρ = 28,3 nΩ·m. a) Laske R. b) Mikä on jännitehäviö, kun I = 9,5 A?"),
            given: ["l = 300 m", "A = 16 mm²", "ρ = 28.3·10⁻⁹ Ω·m", "I = 9.5 A"],
            steps: [
              { tex: "R = {ρ·l}/{A} = {28.3·10^{-9}·300}/{16·10^{-6}} ≈ 0.53 Ω" },
              { tex: "U = R·I = 0.53·9.5 ≈ 5.0 V" },
              T("The slide prints ρ = 2.83 nΩ·m, a typo: the calculation uses 28.3 nΩ·m. The table value for pure aluminium (26.5 nΩ·m) would give 0.50 Ω and 4.7 V.", "Kalvossa lukee ρ = 2,83 nΩ·m, mikä on kirjoitusvirhe: laskussa käytetään arvoa 28,3 nΩ·m. Taulukon puhtaan alumiinin arvolla (26,5 nΩ·m) saataisiin 0,50 Ω ja 4,7 V.")
            ],
            result: T("R ≈ 0.53 Ω, U ≈ 5.0 V", "R ≈ 0,53 Ω, U ≈ 5,0 V") },
          { id: "t2-ohm-qb1", type: "question", q: "t2-q-rho" },
          { id: "t2-ohm-qb2", type: "question", q: "t2-q-ohm" },
          { id: "t2-ohm-qb3", type: "question", q: "t2-q-slider" }
        ]
      },
      /* ===================== 2.3 CONDUCTANCE ===================== */
      {
        id: "t2-conductance", title: T("Conductance and conductivity", "Konduktanssi ja konduktiivisuus"),
        blocks: [
          { id: "t2-cond-p1", type: "text", html: T(
            "<p>Sometimes it is easier to think in the reciprocals. <dfn data-term='conductance'>Conductance</dfn> is <f>G = 1/R</f> with unit siemens (S = 1/Ω); <dfn data-term='conductivity'>conductivity</dfn> is <f>γ = 1/ρ</f> with unit S/m. So <f>R = l/(γ·A)</f> and Ohm's law becomes <f>I = G·U</f>. Conductance is handy with Y-connected resistors that share a common node.</p>",
            "<p>Joskus on helpompi ajatella käänteislukuja. <dfn data-term='conductance'>Konduktanssi</dfn> on <f>G = 1/R</f>, yksikkö siemens (S = 1/Ω), ja <dfn data-term='conductivity'>konduktiivisuus</dfn> on <f>γ = 1/ρ</f>, yksikkö S/m. Siten <f>R = l/(γ·A)</f> ja Ohmin laki on <f>I = G·U</f>. Konduktanssi on kätevä tähtikytkennöissä, joissa vastuksilla on yhteinen solmu.</p>") },
          { id: "t2-cond-f1", type: "formula", key: true, tex: "G = {1}/{R},   γ = {1}/{ρ},   I = G·U", label: T("Conductance and conductivity", "Konduktanssi ja konduktiivisuus") },
          { id: "t2-cond-w1", type: "interactive", widget: "readout", title: T("R ↔ G converter", "R ↔ G -muunnin"),
            caption: T("Slide R and see G. Parallel branches add conductances; series branches add resistances.", "Säädä R:ää ja katso G. Rinnankytkennässä konduktanssit summautuvat, sarjaankytkennässä resistanssit."),
            config: { params: [{ id: "R", tex: "R", min: 1, max: 100000, value: 250, unit: "Ω", log: true }, { id: "U", tex: "U", min: 1, max: 24, step: 0.5, value: 12, unit: "V" }],
              outputs: function (v) { return [{ tex: "G = {1}/{R}", value: 1 / v.R, unit: "S" }, { tex: "I = G·U", value: v.U / v.R, unit: "A" }]; } } },
          { id: "t2-cond-ex1", type: "example", title: T("Copper vs aluminium", "Kupari vs. alumiini"),
            problem: T("By how many percent is the conductivity of copper greater than that of aluminium? ρ_Cu = 16.8 nΩ·m, ρ_Al = 26.5 nΩ·m.", "Kuinka monta prosenttia kuparin konduktiivisuus on suurempi kuin alumiinin? ρ_Cu = 16,8 nΩ·m, ρ_Al = 26,5 nΩ·m."),
            given: ["ρ_Cu = 16.8 nΩ·m", "ρ_Al = 26.5 nΩ·m"],
            steps: [
              { tex: "γ_{Cu} = {1}/{16.8·10^{-9}} ≈ 59.5 MS/m,   γ_{Al} = {1}/{26.5·10^{-9}} ≈ 37.7 MS/m" },
              { tex: "{γ_{Cu} − γ_{Al}}/{γ_{Al}}·100 % ≈ 58 %" }
            ],
            result: T("about 58 % greater", "noin 58 % suurempi") },
          { id: "t2-cond-qb1", type: "question", q: "t2-q-units" }
        ]
      },
      /* ===================== 2.4 RESISTORS ===================== */
      {
        id: "t2-resistors", title: T("Resistors and colour codes", "Vastukset ja värikoodit"),
        blocks: [
          { id: "t2-res-p1", type: "text", html: T(
            "<p>A <dfn data-term='resistor'>resistor</dfn> has a defined resistance. Its jobs: <b>limit current</b>, <b>divide voltage</b> and <b>produce heat</b>. Fixed types include carbon-composition, metal-film, chip (SMD) resistors, resistor arrays/networks and wire-wound power resistors. Wire-wound resistors are coils and so have inductance; they are not used at high frequencies.</p>",
            "<p><dfn data-term='resistor'>Vastuksella</dfn> on määrätty resistanssi. Sen tehtävät: <b>rajoittaa virtaa</b>, <b>jakaa jännitettä</b> ja <b>tuottaa lämpöä</b>. Kiinteitä tyyppejä ovat hiilikoostumus-, metallikalvo- ja sirumuotoiset (SMD) vastukset, vastusverkot sekä lankavastukset. Lankavastus on kela ja siten induktiivinen, joten sitä ei käytetä suurilla taajuuksilla.</p>") },
          { id: "t2-res-t1", type: "table", caption: T("Colour code. 4 bands: digit, digit, multiplier, tolerance. 5 bands: digit ×3, multiplier, tolerance.", "Värikoodi. 4 rengasta: numero, numero, kerroin, toleranssi. 5 rengasta: numero ×3, kerroin, toleranssi."),
            head: [T("Colour", "Väri"), T("Digit", "Numero"), T("Multiplier", "Kerroin"), T("Tol. 4-band", "Tol. 4 rengasta"), T("Tol. 5-band", "Tol. 5 rengasta")],
            rows: [
              [T("black", "musta"), "0", "1", "–", "–"], [T("brown", "ruskea"), "1", "10", "1 %", "1 %"], [T("red", "punainen"), "2", "10²", "2 %", "2 %"],
              [T("orange", "oranssi"), "3", "10³", "–", "–"], [T("yellow", "keltainen"), "4", "10⁴", "–", "–"], [T("green", "vihreä"), "5", "10⁵", "–", "0.5 %"],
              [T("blue", "sininen"), "6", "10⁶", "–", "0.25 %"], [T("violet", "violetti"), "7", "10⁷", "–", "0.1 %"], [T("gray", "harmaa"), "8", "10⁸", "–", "–"],
              [T("white", "valkoinen"), "9", "10⁹", "–", "–"], [T("gold", "kulta"), "–", "0.1", "5 %", "5 %"], [T("silver", "hopea"), "–", "0.01", "10 %", "10 %"], [T("none", "ei väriä"), "–", "–", "20 %", "20 %"]
            ], rowColors: COL.map(function (c) { return c.hex; }) },
          { id: "t2-res-w1", type: "interactive", widget: "custom", title: T("Colour-code decoder and builder", "Värikoodin lukija ja rakentaja"),
            caption: T("Click a band (or use the menus) to change its colour. Switch between 4 and 5 bands, or press Challenge and set the bands to match the target value.", "Napsauta rengasta (tai käytä valikkoja) vaihtaaksesi väriä. Vaihda 4 ja 5 renkaan välillä tai paina Haaste ja aseta renkaat tavoitearvon mukaan."),
            config: { mount: function (host, ctx) {
              var U = TDC.util, el = U.el;
              var nb = 4, bands = { 4: [1, 0, 2, 10], 5: [4, 7, 0, 2, 1] }, target = null;
              function opts(pos) {
                if (nb === 4) return pos < 2 ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] : pos === 2 ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] : [1, 2, 10, 11, 12];
                return pos < 3 ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] : pos === 3 ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] : [1, 2, 5, 6, 7, 10, 11, 12];
              }
              function value() { var b = bands[nb]; return nb === 4 ? (10 * b[0] + b[1]) * colMult(b[2]) : (100 * b[0] + 10 * b[1] + b[2]) * colMult(b[3]); }
              function tol() { var b = bands[nb]; return (nb === 4 ? TOL4 : TOL5)[b[nb - 1]]; }
              var area = el("div"); host.appendChild(area);
              function render() {
                var b = bands[nb], v = value(), tl = tol();
                var h = "<div style='display:flex;gap:.4rem;margin-bottom:.4rem;flex-wrap:wrap'>";
                [4, 5].forEach(function (k) { h += "<button class='btn " + (k === nb ? "btn-primary" : "btn-ghost") + "' data-nb='" + k + "'>" + k + " " + ctx.tx(T("bands", "rengasta")) + "</button>"; });
                h += "<button class='btn btn-ghost' data-act='chal'>" + ctx.tx(T("Challenge", "Haaste")) + "</button></div>";
                h += "<div style='max-width:420px;color:var(--fg)'>" + bandsSvg(b, "style='width:100%;cursor:pointer' role='img'") + "</div>";
                h += "<div style='display:flex;gap:.4rem;flex-wrap:wrap;margin:.4rem 0'>";
                b.forEach(function (ci, pos) {
                  h += "<select data-pos='" + pos + "' aria-label='band " + (pos + 1) + "'>";
                  opts(pos).forEach(function (o) { h += "<option value='" + o + "'" + (o === ci ? " selected" : "") + ">" + ctx.tx(COL[o]) + "</option>"; });
                  h += "</select>";
                });
                h += "</div><div class='readout-list'><div class='readout'><span>R</span><b> = " + U.fmtSI(v, "Ω", 4) + " ± " + tl + " %</b></div>";
                h += "<div class='readout'><span>" + ctx.tx(T("range", "vaihteluväli")) + "</span><b> = " + U.fmtSI(v * (1 - tl / 100), "Ω", 4) + " … " + U.fmtSI(v * (1 + tl / 100), "Ω", 4) + "</b></div>";
                h += "</div>";
                if (target != null) {
                  var hit = Math.abs(v - target) < target * 1e-6;
                  h += "<div class='challenge" + (hit ? " is-done" : "") + "'><span class='ch-badge'>🎯 " + ctx.tx(T("Challenge", "Haaste")) + "</span><div class='ch-body'>" +
                    ctx.tx(T("Set the bands to ", "Aseta renkaat arvoon ")) + "<b>" + U.fmtSI(target, "Ω", 4) + "</b></div>" +
                    (hit ? "<span class='ch-state'>✓ " + ctx.tx(T("matched!", "täsmää!")) + "</span>" : "") + "</div>";
                }
                area.innerHTML = h;
              }
              area.addEventListener("click", function (e) {
                var t = e.target, bt = t.closest && t.closest("button");
                if (bt && bt.dataset.nb) { nb = +bt.dataset.nb; target = null; render(); return; }
                if (bt && bt.dataset.act === "chal") {
                  var d1 = 1 + Math.floor(Math.random() * 9), d2 = Math.floor(Math.random() * 10), m = Math.floor(Math.random() * 6);
                  target = (10 * d1 + d2) * Math.pow(10, m); bands[nb] = nb === 4 ? [0, 0, 0, 10] : [0, 0, 0, 0, 1]; render(); return;
                }
                var rc = t.closest && t.closest(".band");
                if (rc) { var pos = +rc.getAttribute("data-i"), o = opts(pos), cur = o.indexOf(bands[nb][pos]); bands[nb][pos] = o[(cur + 1) % o.length]; render(); }
              });
              area.addEventListener("change", function (e) { var s = e.target; if (s.dataset && s.dataset.pos != null) { bands[nb][+s.dataset.pos] = +s.value; render(); } });
              ctx.onLang(render); render();
              return { destroy: function () { area.innerHTML = ""; } };
            } } },
          { id: "t2-res-ex1", type: "example", title: T("Reading a 5-band resistor", "5-renkaisen vastuksen lukeminen"),
            problem: T("Bands: gray, red, orange, gold, red. Find the resistance and its tolerance range.", "Renkaat: harmaa, punainen, oranssi, kulta, punainen. Laske resistanssi ja toleranssialue."),
            given: [T("gray = 8, red = 2, orange = 3", "harmaa = 8, punainen = 2, oranssi = 3"), T("gold = ×0.1, red = ±2 %", "kulta = ×0,1, punainen = ±2 %")],
            steps: [{ tex: "R = 823 · 0.1 = 82.3 Ω" }, { tex: "±2 %:  80.65 Ω … 83.95 Ω" }],
            result: T("82.3 Ω ± 2 %", "82,3 Ω ± 2 %") },
          { id: "t2-res-ex2", type: "example", title: T("Reading a 4-band resistor", "4-renkaisen vastuksen lukeminen"),
            problem: T("Bands: black, gray, red, gold (as on the slide). What is R?", "Renkaat: musta, harmaa, punainen, kulta (kuten kalvossa). Mikä on R?"),
            given: [T("0, 8, ×10², ±5 %", "0, 8, ×10², ±5 %")],
            steps: [{ tex: "R = 8·10^2 = 800 Ω ± 5 %  (760 … 840 Ω)" }, T("Real resistors never start with black, but the arithmetic is the same.", "Oikeissa vastuksissa ensimmäinen rengas ei ole koskaan musta, mutta laskutapa on sama.")],
            result: T("800 Ω ± 5 %", "800 Ω ± 5 %") },
          { id: "t2-res-h1", type: "h", text: T("Label codes and variable resistors", "Merkintäkoodit ja säätövastukset") },
          { id: "t2-res-p2", type: "text", html: T(
            "<p><b>Numeric code:</b> three digits, the third is the number of zeros: <f>123 → 12 000 Ω = 12 kΩ</f>. <b>Alphanumeric code:</b> the letter is the decimal point and the multiplier (R = ×1, K = ×10³, M = ×10⁶): <f>22R = 22 Ω</f>, <f>2M2 = 2.2 MΩ</f>, <f>220K = 220 kΩ</f>.</p><p>A <dfn data-term='potentiometer'>potentiometer</dfn> has three terminals and divides voltage; a <dfn data-term='rheostat'>rheostat</dfn> has two terminals and controls current. A potentiometer with the wiper tied to one end works as a rheostat.</p>",
            "<p><b>Numeerinen koodi:</b> kolme numeroa, kolmas on nollien lukumäärä: <f>123 → 12 000 Ω = 12 kΩ</f>. <b>Kirjain-numerokoodi:</b> kirjain on desimaalipilkku ja kerroin (R = ×1, K = ×10³, M = ×10⁶): <f>22R = 22 Ω</f>, <f>2M2 = 2,2 MΩ</f>, <f>220K = 220 kΩ</f>.</p><p><dfn data-term='potentiometer'>Potentiometrissä</dfn> on kolme napaa ja sillä jaetaan jännitettä; <dfn data-term='rheostat'>reostaatissa</dfn> on kaksi napaa ja sillä säädetään virtaa. Potentiometri, jonka liukukosketin on kytketty toiseen päähän, toimii reostaattina.</p>") },
          { id: "t2-res-w2", type: "interactive", widget: "custom", title: T("Label-code decoder", "Merkintäkoodin tulkki"),
            caption: T("Type a code such as 123, 22R, 2M2, 220K, 4R7 or pick an example.", "Kirjoita koodi, esim. 123, 22R, 2M2, 220K, 4R7, tai valitse esimerkki."),
            config: { mount: function (host, ctx) {
              var U = TDC.util, el = U.el;
              var inp = el("input", { type: "text", value: "2M2", maxlength: 6, "aria-label": "code", class: "input", style: { width: "6rem", fontFamily: "var(--font-mono)" } });
              var out = el("b", {}), row = el("div", { style: { display: "flex", gap: ".4rem", flexWrap: "wrap", alignItems: "center" } });
              ["123", "22R", "2M2", "220K", "4R7", "473"].forEach(function (c) { row.appendChild(el("button", { class: "btn btn-ghost", onclick: function () { inp.value = c; upd(); } }, c)); });
              function dec(s) {
                s = s.trim().toUpperCase(); var m = /^(\d+)([RKM])(\d*)$/.exec(s);
                if (m) return parseFloat(m[1] + "." + (m[3] || "0")) * { R: 1, K: 1e3, M: 1e6 }[m[2]];
                m = /^(\d)(\d)(\d)$/.exec(s); if (m) return (10 * m[1] + 1 * m[2]) * Math.pow(10, +m[3]);
                return NaN;
              }
              function upd() { var v = dec(inp.value); out.textContent = isFinite(v) ? " = " + U.fmtSI(v, "Ω", 4) : " = ?"; }
              inp.addEventListener("input", upd); upd();
              host.append(el("div", { style: { display: "flex", gap: ".6rem", alignItems: "center", flexWrap: "wrap" } }, [inp, out]), row);
              return {};
            } } },
          { id: "t2-res-qb1", type: "question", q: "t2-q-color5" },
          { id: "t2-res-qb2", type: "question", q: "t2-q-label" }
        ]
      },
      /* ===================== 2.5 TEMPERATURE ===================== */
      {
        id: "t2-temp", title: T("Temperature dependence", "Lämpötilariippuvuus"),
        blocks: [
          { id: "t2-temp-p1", type: "text", html: T(
            "<p>In metals the atoms vibrate more when hot, which disturbs the electron flow: <b>resistance rises with temperature</b>. A linear approximation works over moderate ranges. A few semiconductors have a negative α: an <dfn data-term='ntc'>NTC resistor</dfn> conducts better when warm.</p>",
            "<p>Metalleissa atomit värähtelevät lämpimänä voimakkaammin ja häiritsevät elektronien kulkua: <b>resistanssi kasvaa lämpötilan noustessa</b>. Kohtuullisella lämpötila-alueella lineaarinen approksimaatio riittää. Joillakin puolijohteilla α on negatiivinen: <dfn data-term='ntc'>NTC-vastus</dfn> johtaa paremmin lämpimänä.</p>") },
          { id: "t2-temp-f1", type: "formula", key: true, tex: "R_T = R_0[1 + α(T − T_0)]", label: T("Linear temperature model", "Lineaarinen lämpötilamalli"),
            legend: [["R_0", T("resistance at reference T₀", "resistanssi vertailulämpötilassa T₀"), "Ω"], ["α", T("temperature coefficient", "lämpötilakerroin"), "1/°C"], ["T", T("temperature", "lämpötila"), "°C"]] },
          { id: "t2-temp-w1", type: "interactive", widget: "plot", title: T("R(T) of a filament or sensor", "Hehkulangan tai anturin R(T)"),
            caption: T("Default: tungsten filament, R₀ = 85 Ω at 20 °C, α = 0.0045 1/°C. Set α below zero to see an NTC.", "Oletus: volframihehkulanka, R₀ = 85 Ω lämpötilassa 20 °C, α = 0,0045 1/°C. Aseta α negatiiviseksi nähdäksesi NTC:n."),
            config: {
              x: { min: 0, max: 2800, label: T("Temperature T", "Lämpötila T"), unit: "°C" }, y: { min: 0, max: 100, label: T("Resistance R", "Resistanssi R"), unit: "Ω", auto: true },
              params: [{ id: "R0", tex: "R_0", min: 10, max: 200, step: 5, value: 85, unit: "Ω" }, { id: "a", tex: "α", min: -0.0004, max: 0.0068, step: 0.0001, value: 0.0045, unit: "1/°C" }, { id: "T", tex: "T", min: 0, max: 2800, step: 20, value: 2600, unit: "°C" }],
              curves: [{ fn: function (x, p) { return Math.max(0, p.R0 * (1 + p.a * (x - 20))); }, label: T("R(T)", "R(T)"), color: "--c-2" }],
              points: function (p) { return [{ x: p.T, y: Math.max(0, p.R0 * (1 + p.a * (p.T - 20))), label: { en: "R_T", fi: "R_T" } }]; },
              readouts: function (p) { return [{ tex: "R_T", value: Math.max(0, p.R0 * (1 + p.a * (p.T - 20))), unit: "Ω" }]; }
            } },
          { id: "t2-temp-ex1", type: "example", title: T("Light-bulb filament", "Hehkulampun lanka"),
            problem: T("A tungsten filament has R₀ = 85 Ω at 20 °C, α = 4.5·10⁻³ 1/°C. Find R at 2600 °C.", "Volframilangan R₀ = 85 Ω lämpötilassa 20 °C ja α = 4,5·10⁻³ 1/°C. Laske R lämpötilassa 2600 °C."),
            given: ["R₀ = 85 Ω", "α = 4.5·10⁻³ 1/°C", "T₀ = 20 °C", "T = 2600 °C"],
            steps: [{ tex: "R_T = 85[1 + 4.5·10^{-3}(2600 − 20)] = 85·12.61" }, { tex: "R_T ≈ 1070 Ω ≈ 1.07 kΩ" }, T("A hot filament has about 12 times the cold resistance, so the switch-on current surge is large.", "Kuuma lanka on noin 12-kertainen kylmään verrattuna, joten kytkentävirtapiikki on suuri.")],
            result: T("R ≈ 1.07 kΩ", "R ≈ 1,07 kΩ") },
          { id: "t2-temp-qb1", type: "question", q: "t2-q-temp" }
        ]
      },
      /* ===================== 2.6 POWER ===================== */
      {
        id: "t2-power", title: T("Electric power", "Sähköteho"),
        blocks: [
          { id: "t2-pow-p1", type: "text", html: T(
            "<p>A charge <f>dQ</f> falling through a potential difference <f>U</f> releases energy <f>U·dQ</f>. Per unit time that is the <dfn data-term='power'>power</dfn> <f>P = U·I</f>, unit watt (W = V·A). With Ohm's law two more forms follow. Motors turn the energy into motion, pumps into fluid energy, a resistor into heat and radiation.</p>",
            "<p>Potentiaalieron <f>U</f> läpi kulkeva varaus <f>dQ</f> luovuttaa energian <f>U·dQ</f>. Aikayksikköä kohti se on <dfn data-term='power'>teho</dfn> <f>P = U·I</f>, yksikkö watti (W = V·A). Ohmin lailla saadaan vielä kaksi muotoa. Moottori muuttaa energian liikkeeksi, pumppu nesteen energiaksi ja vastus lämmöksi ja säteilyksi.</p>") },
          { id: "t2-pow-f1", type: "formula", key: true, tex: "P = U·I = R·I^2 = {U^2}/{R}", label: T("Electric power", "Sähköteho") },
          { id: "t2-pow-c1", type: "callout", kind: "tip", title: T("Which form to use?", "Mitä muotoa käytetään?"), html: T(
            "Same <em>current</em> (series): <f>P = R·I²</f>, the larger R heats more. Same <em>voltage</em> (parallel): <f>P = U²/R</f>, the smaller R heats more.",
            "Sama <em>virta</em> (sarjassa): <f>P = R·I²</f>, suurempi R lämpenee enemmän. Sama <em>jännite</em> (rinnan): <f>P = U²/R</f>, pienempi R lämpenee enemmän.") },
          { id: "t2-pow-w1", type: "interactive", widget: "plot", title: T("Power vs resistance: two viewpoints", "Teho vs. resistanssi: kaksi näkökulmaa"),
            caption: T("Blue: fixed voltage, P = U²/R falls with R. Orange: fixed current, P = I²R rises with R. The marker sits at the chosen R.", "Sininen: kiinteä jännite, P = U²/R pienenee R:n kasvaessa. Oranssi: kiinteä virta, P = I²R kasvaa R:n kasvaessa. Merkki on valitun R:n kohdalla."),
            config: {
              x: { min: 10, max: 500, label: T("Resistance R", "Resistanssi R"), unit: "Ω" }, y: { min: 0, max: 5, label: T("Power P", "Teho P"), unit: "W", auto: true },
              params: [{ id: "U", tex: "U", min: 1, max: 24, step: 1, value: 12, unit: "V" }, { id: "I", tex: "I", min: 0.01, max: 0.3, step: 0.01, value: 0.1, unit: "A" }, { id: "R", tex: "R", min: 10, max: 500, step: 10, value: 100, unit: "Ω" }],
              curves: [{ fn: function (x, p) { return p.U * p.U / x; }, label: T("P = U²/R", "P = U²/R"), color: "--c-1" }, { fn: function (x, p) { return p.I * p.I * x; }, label: T("P = I²R", "P = I²R"), color: "--c-2" }],
              points: function (p) { return [{ x: p.R, y: p.U * p.U / p.R }, { x: p.R, y: p.I * p.I * p.R }]; },
              readouts: function (p) { return [{ tex: "U^2/R", value: p.U * p.U / p.R, unit: "W" }, { tex: "I^2·R", value: p.I * p.I * p.R, unit: "W" }]; }
            } },
          { id: "t2-pow-ex1", type: "example", title: T("Heater", "Lämmitin"),
            problem: T("A heater of 450 W is connected to 230 V. Find a) its resistance, b) its current. (The slide says 220 V in the question but uses 230 V; labels a/b are swapped there.)", "450 W:n lämmitin kytketään 230 V:iin. Laske a) sen resistanssi ja b) virta. (Kalvon tehtävässä lukee 220 V, mutta ratkaisussa käytetään 230 V; kohtien a/b nimet ovat siellä väärin päin.)"),
            given: ["P = 450 W", "U = 230 V"],
            steps: [{ tex: "I = {P}/{U} = {450}/{230} ≈ 1.96 A" }, { tex: "R = {P}/{I^2} = {450}/{1.96^2} ≈ 118 Ω" }, { tex: "(check) R = {U^2}/{P} = {230^2}/{450} ≈ 117.6 Ω" }],
            result: T("R ≈ 118 Ω, I ≈ 1.96 A", "R ≈ 118 Ω, I ≈ 1,96 A") },
          { id: "t2-pow-qb1", type: "question", q: "t2-q-pow" }
        ]
      },
      /* ===================== 2.7 FUSES ===================== */
      {
        id: "t2-fuses", title: T("Fuses, breakers and household circuits", "Sulakkeet, johdonsuojat ja kotitalouden piirit"),
        blocks: [
          { id: "t2-fus-p1", type: "text", html: T(
            "<p>Too much current heats a wire at the rate <f>R·I²</f> and may start a fire. A <dfn data-term='fuse'>fuse</dfn> is a thin ribbon in series that melts at overcurrent (one use). A <dfn data-term='breaker'>circuit breaker</dfn> heats a bimetallic strip; the strip bends and releases a spring-loaded contact, and it can be reset.</p><p>Household appliances are connected <b>in parallel</b> so each gets the full mains voltage (230 V in Europe, 120 V in the USA); the fuse is in series with the supply, so it carries the <b>sum</b> of all branch currents.</p>",
            "<p>Liian suuri virta kuumentaa johdinta teholla <f>R·I²</f> ja voi aiheuttaa tulipalon. <dfn data-term='fuse'>Sulake</dfn> on sarjaan kytketty ohut nauha, joka sulaa ylivirrassa (kertakäyttöinen). <dfn data-term='breaker'>Johdonsuojakatkaisijassa</dfn> virta kuumentaa bimetalliliuskaa; liuska taipuu ja vapauttaa jousikuormitteisen koskettimen, ja katkaisijan voi palauttaa.</p><p>Kodin laitteet kytketään <b>rinnan</b>, jotta jokainen saa koko verkkojännitteen (Euroopassa 230 V, Yhdysvalloissa 120 V). Sulake on syötön kanssa sarjassa, joten sen läpi kulkee kaikkien haarojen virtojen <b>summa</b>.</p>") },
          { id: "t2-fus-w1", type: "interactive", widget: "custom", title: T("Breaker game: 230 V, 16 A", "Johdonsuojapeli: 230 V, 16 A"),
            caption: T("Plug appliances in. Above 16 A the bimetal strip heats up, bends and trips the breaker. Which combinations are safe? (extra)", "Kytke laitteita päälle. Yli 16 A:n virralla bimetalliliuska lämpenee, taipuu ja katkaisija laukeaa. Mitkä yhdistelmät ovat turvallisia? (lisä)"),
            config: { mount: function (host, ctx) {
              var U = TDC.util, el = U.el, V = 230, LIM = 16;
              var apps = [{ n: T("Bulb 100 W", "Lamppu 100 W"), P: 100 }, { n: T("Stereo 350 W", "Stereot 350 W"), P: 350 }, { n: T("Hair dryer 1200 W", "Hiustenkuivain 1200 W"), P: 1200 }, { n: T("Heater 1800 W", "Lämmitin 1800 W"), P: 1800 }, { n: T("Kettle 2000 W", "Vedenkeitin 2000 W"), P: 2000 }];
              var on = apps.map(function () { return false; }), heat = 0, tripped = false;
              var btns = el("div", { style: { display: "flex", gap: ".4rem", flexWrap: "wrap", margin: ".4rem 0" } });
              var reset = el("button", { class: "btn btn-ghost" }, ctx.tx(T("Reset breaker", "Palauta katkaisija")));
              var out = el("div", { class: "readout-list" });
              function totalI() { return on.reduce(function (s, o, i) { return s + (o && !tripped ? apps[i].P : 0); }, 0) / V; }
              function build() {
                btns.innerHTML = "";
                apps.forEach(function (a, i) {
                  var b = el("button", { class: "btn " + (on[i] ? "btn-primary" : "btn-ghost"), "aria-pressed": on[i] ? "true" : "false" }, ctx.tx(a.n));
                  b.addEventListener("click", function () { on[i] = !on[i]; if (U.reducedMotion() && totalI() > LIM) trip(); build(); show(); c.redraw(); });
                  btns.appendChild(b);
                });
                reset.textContent = ctx.tx(T("Reset breaker", "Palauta katkaisija"));
              }
              function trip() { tripped = true; on = apps.map(function () { return false; }); }
              reset.addEventListener("click", function () { tripped = false; heat = 0; build(); show(); c.redraw(); });
              function show() {
                out.innerHTML = "";
                var I = totalI(), P = on.reduce(function (s, o, i) { return s + (o ? apps[i].P : 0); }, 0);
                [["P_total", U.fmtSI(P, "W", 4)], ["I = P/U", U.fmtNum(I, 3) + " A"]].forEach(function (r) { out.appendChild(el("div", { class: "readout" }, [el("span", {}, r[0]), el("b", {}, " = " + r[1])])); });
                if (tripped) out.appendChild(el("div", { class: "readout" }, [el("b", { style: { color: "var(--bad)" } }, ctx.tx(T("Breaker tripped!", "Katkaisija laukesi!")))]));
              }
              var c = TDC.viz.canvas(host, { aspect: 0.3, draw: function (g, w, h, t, dt) {
                var I = totalI();
                if (!tripped && dt > 0) { heat = Math.max(0, Math.min(1, heat + dt * (I > LIM ? (I / LIM - 1) * 1.6 + 0.15 : -0.4))); if (heat >= 1) { trip(); build(); show(); } }
                g.clearRect(0, 0, w, h);
                var bx = 20, bw = w - 40, by = h - 26;
                g.fillStyle = ctx.color("--surface-2"); g.strokeStyle = ctx.color("--line"); g.lineWidth = 1; g.fillRect(bx, by, bw, 14); g.strokeRect(bx, by, bw, 14);
                var fr = Math.min(1, I / (LIM * 1.5)); g.fillStyle = I > LIM ? ctx.color("--bad") : ctx.color("--ok"); g.fillRect(bx, by, bw * fr, 14);
                g.fillStyle = ctx.color("--fg"); g.fillRect(bx + bw / 1.5 - 1, by - 4, 2, 22);
                g.font = "12px system-ui,sans-serif"; g.fillText("I = " + I.toFixed(1) + " A   (" + LIM + " A)", bx, by - 8);
                var sx = w * 0.3, ex = w * 0.7, y = h * 0.4, bend = tripped ? 28 : 28 * heat;
                g.strokeStyle = ctx.color("--c-wire"); g.lineWidth = 3; g.beginPath(); g.moveTo(10, y); g.lineTo(sx, y); g.stroke(); g.beginPath(); g.moveTo(ex, y); g.lineTo(w - 10, y); g.stroke();
                g.strokeStyle = heat > 0.6 || tripped ? ctx.color("--bad") : ctx.color("--c-2"); g.lineWidth = 6; g.beginPath(); g.moveTo(sx, y); g.quadraticCurveTo((sx + ex) / 2, y - bend * 1.6, ex, y - bend); g.stroke();
                g.fillStyle = ctx.color("--fg"); g.beginPath(); g.arc(sx, y, 4, 0, 7); g.fill(); g.beginPath(); g.arc(ex, y, 4, 0, 7); g.fill();
                g.font = "12px system-ui,sans-serif"; g.fillText(ctx.tx(tripped ? T("OPEN (tripped)", "AUKI (laukesi)") : T("closed", "kiinni")), (sx + ex) / 2 - 24, y + 22);
              } });
              host.append(btns, reset, out); build(); show();
              ctx.onLang(function () { build(); show(); c.redraw(); });
              return { destroy: function () { c.destroy(); } };
            } } },
          { id: "t2-fus-ex1", type: "example", title: T("(extra) Household load at 120 V", "(lisä) Kotitalouden kuorma 120 V:n jännitteellä"),
            problem: T("Bulb 100 W, heater 1800 W, stereo 350 W, hair dryer 1200 W on 120 V. Find the total current.", "Lamppu 100 W, lämmitin 1800 W, stereot 350 W ja hiustenkuivain 1200 W jännitteellä 120 V. Laske kokonaisvirta."),
            given: ["U = 120 V"],
            steps: [{ tex: "P_{tot} = 100 + 1800 + 350 + 1200 = 3450 W" }, { tex: "I = {P_{tot}}/{U} = {3450}/{120} = 28.75 A" }, T("The individual currents are 0.83, 15.0, 2.92 and 10.0 A. A 20 A fuse would trip when everything runs.", "Yksittäiset virrat ovat 0,83, 15,0, 2,92 ja 10,0 A. 20 A:n sulake laukeaisi, jos kaikki laitteet olisivat päällä.")],
            result: T("I ≈ 28.8 A", "I ≈ 28,8 A") },
          { id: "t2-fus-qb1", type: "question", q: "t2-q-breaker" }
        ]
      },
      /* ===================== 2.8 SERIES / PARALLEL ===================== */
      {
        id: "t2-seriespar", title: T("Resistors in series and parallel", "Vastusten sarjaan- ja rinnankytkentä"),
        blocks: [
          { id: "t2-sp-h1", type: "h", text: T("Series connection", "Sarjaankytkentä") },
          { id: "t2-sp-p1", type: "text", html: T(
            "<p>In a <dfn data-term='series'>series connection</dfn> the same current flows through all resistors and the voltages add: <f>U = U_1 + U_2 + U_3 = I(R_1+R_2+R_3)</f>.</p>",
            "<p><dfn data-term='series'>Sarjaankytkennässä</dfn> kaikkien vastusten läpi kulkee sama virta ja jännitteet summautuvat: <f>U = U_1 + U_2 + U_3 = I(R_1+R_2+R_3)</f>.</p>") },
          { id: "t2-sp-f1", type: "formula", key: true, tex: "R_{eq} = R_1 + R_2 + R_3 + … = Σ R_i", label: T("Series: resistances add", "Sarjassa resistanssit summautuvat") },
          { id: "t2-sp-w1", type: "interactive", widget: "circuit", title: T("Series circuit", "Sarjapiiri"),
            caption: T("Edit the resistors (click a value) and see that the current is the same everywhere and the voltages share in proportion to R. Draw a wire across a resistor with the wire tool to short it out.", "Muokkaa vastuksia (napsauta arvoa) ja huomaa, että virta on kaikkialla sama ja jännitteet jakautuvat R:n suhteessa. Piirrä johdin vastuksen yli oikosulkeaksesi sen."),
            config: seriesCfg([100, 220, 330], 12) },
          { id: "t2-sp-h2", type: "h", text: T("Parallel connection", "Rinnankytkentä") },
          { id: "t2-sp-p2", type: "text", html: T(
            "<p>In a <dfn data-term='parallel'>parallel connection</dfn> every resistor has the same voltage and the currents add: <f>I = U/R_1 + U/R_2 + U/R_3</f>. In terms of conductance, <f>G_{eq} = G_1 + G_2 + G_3</f>.</p>",
            "<p><dfn data-term='parallel'>Rinnankytkennässä</dfn> jokaisella vastuksella on sama jännite ja virrat summautuvat: <f>I = U/R_1 + U/R_2 + U/R_3</f>. Konduktansseina <f>G_{eq} = G_1 + G_2 + G_3</f>.</p>") },
          { id: "t2-sp-f2", type: "formula", key: true, tex: "{1}/{R_{eq}} = {1}/{R_1} + {1}/{R_2} + {1}/{R_3}", label: T("Parallel: conductances add", "Rinnan konduktanssit summautuvat") },
          { id: "t2-sp-f3", type: "formula", tex: "R_{eq} = {R_1·R_2}/{R_1 + R_2}", label: T("Two resistors in parallel", "Kaksi vastusta rinnan") },
          { id: "t2-sp-c1", type: "callout", kind: "warn", title: T("Misconception", "Yleinen virhekäsitys"), html: T(
            "Adding a resistor in parallel <b>lowers</b> the total resistance (more paths), always below the smallest branch. Adding one in series raises it.",
            "Vastuksen lisääminen rinnalle <b>pienentää</b> kokonaisresistanssia (reittejä on enemmän), ja tulos on aina pienempi kuin pienin haara. Sarjaan lisääminen suurentaa sitä.") },
          { id: "t2-sp-w2", type: "interactive", widget: "circuit", title: T("Parallel circuit", "Rinnakkaispiiri"),
            caption: T("Each branch sees the full source voltage; the ammeter shows the sum of the branch currents. Change any R and compare I with U/R_eq.", "Jokaisella haaralla on lähteen koko jännite; virtamittari näyttää haaravirtojen summan. Muuta jotakin R:ää ja vertaa I:tä arvoon U/R_eq."),
            config: parallelCfg([100, 220, 330], 12) },
          { id: "t2-sp-h3", type: "h", text: T("Mixed connections", "Sekakytkennät") },
          { id: "t2-sp-p3", type: "text", html: T(
            "<p>Reduce a series-parallel network step by step: replace each parallel group by its equivalent resistance, then add the series parts. Going around any loop the potential rises at the source and drops by <f>I·R</f> at each resistor, summing to zero.</p>",
            "<p>Sekakytkentä sievennetään vaiheittain: korvataan jokainen rinnankytkentä korvausresistanssillaan ja lasketaan sitten sarjassa olevat yhteen. Kun silmukka kierretään ympäri, potentiaali nousee lähteessä ja laskee jokaisessa vastuksessa määrän <f>I·R</f>; summa on nolla.</p>") },
          { id: "t2-sp-w3", type: "interactive", widget: "circuit", title: T("Mixed circuit: 400 Ω in series with 500 Ω ∥ 700 Ω", "Sekakytkentä: 400 Ω sarjassa 500 Ω ∥ 700 Ω -ryhmän kanssa"),
            caption: T("The textbook example. Short R1 with a wire and watch the current jump; open nothing, just compare the table with the worked example.", "Esimerkkitehtävä. Oikosulje R1 johtimella ja katso virran hyppäystä; vertaa taulukkoa ratkaistuun esimerkkiin."),
            config: {
              size: [9, 4],
              parts: [
                { id: "U1", type: "V", a: [0, 4], b: [0, 0], value: 12, editable: { min: 0, max: 24, step: 0.5 } },
                { id: "R1", type: "R", a: [1, 0], b: [4, 0], value: 400, editable: { min: 10, max: 2000 } },
                { id: "R2", type: "R", a: [6, 1], b: [6, 4], value: 500, editable: { min: 10, max: 2000 } },
                { id: "R3", type: "R", a: [9, 1], b: [9, 4], value: 700, editable: { min: 10, max: 2000 } },
                { id: "A1", type: "ammeter", a: [2, 4], b: [4, 4] }
              ],
              wires: [[[0, 0], [1, 0]], [[4, 0], [9, 0]], [[6, 0], [6, 1]], [[9, 0], [9, 1]], [[0, 4], [2, 4]], [[4, 4], [9, 4]]],
              labels: [{ at: [0, 0], text: "a", dx: -10 }, { at: [4, 0], text: "b" }, { at: [9, 4], text: "c", dx: 8 }],
              ground: [0, 4], tools: ["wire", "cut"], show: { values: true, flow: true, potentials: true }, table: true
            } },
          { id: "t2-sp-ex1", type: "example", title: T("Current in the 500 Ω resistor", "500 Ω:n vastuksen virta"),
            problem: T("A 12.0 V source feeds 400 Ω in series with 500 Ω ∥ 700 Ω. Find the total current and the current through 500 Ω.", "12,0 V:n lähde syöttää 400 Ω:n vastusta, jonka kanssa sarjassa on 500 Ω ∥ 700 Ω. Laske kokonaisvirta ja 500 Ω:n virta."),
            given: ["U = 12.0 V", "R = 400 Ω", "500 Ω ∥ 700 Ω"],
            steps: [
              { tex: "R_P = {500·700}/{500+700} ≈ 292 Ω" },
              { tex: "R_{eq} = 400 + 292 = 692 Ω" },
              { tex: "I = {12.0}/{692} ≈ 17.3 mA" },
              { tex: "U_{bc} = R_P·I ≈ 5.06 V,   I_1 = {U_{bc}}/{500} ≈ 10.1 mA" },
              T("The slide rounds U_bc to 5.1 V and prints 10.2 mA; the exact value is 10.1 mA. I₂ = 7.23 mA, and 10.1 + 7.2 = 17.3 mA.", "Kalvo pyöristää U_bc:n arvoon 5,1 V ja antaa 10,2 mA; tarkka arvo on 10,1 mA. I₂ = 7,23 mA ja 10,1 + 7,2 = 17,3 mA.")
            ],
            result: T("I ≈ 17.3 mA, I(500 Ω) ≈ 10.1 mA", "I ≈ 17,3 mA, I(500 Ω) ≈ 10,1 mA") },
          { id: "t2-sp-ex2", type: "example", title: T("Potential around a loop", "Potentiaali piirin ympäri"),
            problem: T("12.0 V source, 400 Ω and 290 Ω in series. Find the current and the voltage across each resistor.", "12,0 V:n lähde, 400 Ω ja 290 Ω sarjassa. Laske virta ja kummankin vastuksen jännite."),
            given: ["U = 12.0 V", "R₁ = 400 Ω", "R₂ = 290 Ω"],
            steps: [
              { tex: "R_{eq} = 690 Ω,   I = {12.0}/{690} ≈ 17.4 mA" },
              { tex: "U_{bc} = 290·0.01739 ≈ 5.0 V,   U_{ab} = 12 − 5.0 ≈ 7.0 V" },
              T("Potential graph: 0 V → +12 V at the source, stays 12 V along the wire, drops 7.0 V over 400 Ω to 5.0 V, drops 5.0 V over 290 Ω back to 0 V.", "Potentiaalikuvaaja: 0 V → +12 V lähteessä, pysyy 12 V:ssa johtimella, laskee 7,0 V 400 Ω:n yli arvoon 5,0 V ja 5,0 V 290 Ω:n yli takaisin nollaan.")
            ],
            result: T("I ≈ 17.4 mA, U₁ ≈ 7.0 V, U₂ ≈ 5.0 V", "I ≈ 17,4 mA, U₁ ≈ 7,0 V, U₂ ≈ 5,0 V") },
          { id: "t2-sp-qb1", type: "question", q: "t2-q-order" },
          { id: "t2-sp-qb2", type: "question", q: "t2-q-short" },
          { id: "t2-sp-qb3", type: "question", q: "t2-q-req" },
          { id: "t2-sp-qb4", type: "question", q: "t2-q-mixed" }
        ]
      },
      /* ===================== 2.9 VOLTAGE DIVIDER ===================== */
      {
        id: "t2-vdiv", title: T("Voltage divider", "Jännitteenjakaja"),
        blocks: [
          { id: "t2-vd-p1", type: "text", html: T(
            "<p>Two or more series resistors form a <dfn data-term='voltagedivider'>voltage divider</dfn>: the larger the resistor, the larger its share of the voltage. Outputs are measured against the <dfn data-term='ground'>ground</dfn> node (0 V).</p>",
            "<p>Kaksi tai useampi sarjaan kytketty vastus muodostaa <dfn data-term='voltagedivider'>jännitteenjakajan</dfn>: mitä suurempi vastus, sitä suurempi osuus jännitteestä. Lähtöjännitteet mitataan <dfn data-term='ground'>maasolmun</dfn> (0 V) suhteen.</p>") },
          { id: "t2-vd-f1", type: "formula", key: true, tex: "U_{R1} = {R_1}/{R_1+R_2}·U,    U_{R2} = {R_2}/{R_1+R_2}·U", label: T("Voltage divider rule", "Jännitteenjakosääntö"),
            legend: [["U_{Rk}", T("voltage over R_k", "R_k:n jännite"), "V"]] },
          { id: "t2-vd-w1", type: "interactive", widget: "circuit", title: T("Voltage divider with meters", "Jännitteenjakaja mittareineen"),
            caption: T("12 V across 100 Ω + 47 Ω. The two voltmeters read the shares. Change either resistor and check U₁/U₂ = R₁/R₂.", "12 V jaetaan 100 Ω:n ja 47 Ω:n kesken. Kaksi jännitemittaria näyttää osuudet. Muuta vastuksia ja tarkista U₁/U₂ = R₁/R₂."),
            config: {
              size: [7, 6],
              parts: [
                { id: "U1", type: "V", a: [0, 6], b: [0, 0], value: 12, editable: { min: 0, max: 24, step: 0.5 } },
                { id: "R1", type: "R", a: [4, 0], b: [4, 3], value: 100, editable: { min: 10, max: 2000 } },
                { id: "R2", type: "R", a: [4, 3], b: [4, 6], value: 47, editable: { min: 10, max: 2000 } },
                { id: "V1", type: "voltmeter", a: [2, 0], b: [2, 3] },
                { id: "V2", type: "voltmeter", a: [6, 3], b: [6, 6] }
              ],
              wires: [[[0, 0], [4, 0]], [[2, 3], [4, 3]], [[4, 3], [6, 3]], [[4, 6], [6, 6]], [[0, 6], [4, 6]]],
              labels: [{ at: [4, 3], text: "A", dx: 10 }, { at: [0, 6], text: "GND", dy: 14 }],
              ground: [0, 6], tools: ["wire", "cut"], show: { values: true, flow: true, potentials: true }, table: true
            } },
          { id: "t2-vd-ex1", type: "example", title: T("Two-resistor divider", "Kahden vastuksen jakaja"),
            problem: T("U = 12 V, R₁ = 100 Ω, R₂ = 47 Ω. Find U_R1 and U_R2.", "U = 12 V, R₁ = 100 Ω, R₂ = 47 Ω. Laske U_R1 ja U_R2."),
            given: ["U = 12 V", "R₁ = 100 Ω", "R₂ = 47 Ω"],
            steps: [{ tex: "R = 100 + 47 = 147 Ω" }, { tex: "U_{R1} = {100}/{147}·12 ≈ 8.2 V" }, { tex: "U_{R2} = {47}/{147}·12 ≈ 3.8 V" }, { tex: "8.2 + 3.8 = 12 V ✓" }],
            result: T("8.2 V and 3.8 V", "8,2 V ja 3,8 V") },
          { id: "t2-vd-ex2", type: "example", title: T("Three-resistor divider with taps", "Kolmen vastuksen jakaja ja väliotot"),
            problem: T("Us = 15 V across R₁ = 5.6 kΩ, R₂ = 10 kΩ, R₃ = 3.3 kΩ in series (ground at the bottom). Find the potentials at A (top), B and C.", "Us = 15 V jaetaan sarjassa oleville vastuksille R₁ = 5,6 kΩ, R₂ = 10 kΩ ja R₃ = 3,3 kΩ (maa alhaalla). Laske potentiaalit pisteissä A (ylhäällä), B ja C."),
            given: ["Us = 15 V", "R₁ = 5.6 kΩ", "R₂ = 10 kΩ", "R₃ = 3.3 kΩ"],
            steps: [{ tex: "R_{tot} = 18.9 kΩ,   I = {15}/{18.9 kΩ} ≈ 0.794 mA" }, { tex: "V_A = 15 V" }, { tex: "V_B = 15·{10+3.3}/{18.9} ≈ 10.6 V" }, { tex: "V_C = 15·{3.3}/{18.9} ≈ 2.6 V" }],
            result: T("V_A = 15 V, V_B ≈ 10.6 V, V_C ≈ 2.6 V", "V_A = 15 V, V_B ≈ 10,6 V, V_C ≈ 2,6 V") },
          { id: "t2-vd-w2", type: "interactive", widget: "circuit", title: T("The same divider, live", "Sama jakaja toiminnassa"),
            caption: T("The node potentials step down along the series loop from 15 V towards 0 V. Edit the values.", "Solmupotentiaalit laskevat portaittain sarjasilmukassa 15 V:sta kohti nollaa. Muokkaa arvoja."),
            config: seriesCfg([5600, 10000, 3300], 15, { show: { values: true, flow: true, potentials: true } }) },
          { id: "t2-vd-w3", type: "interactive", widget: "plot", title: T("Potentiometer and the loading effect", "Potentiometri ja kuormitusvaikutus"),
            caption: T("Drag the wiper (position marker). The dashed line is the unloaded output U·x. Connect a load R_L and the output sags, most when R_L is small compared with the pot. (extra)", "Siirrä liukukoskettimen asentoa. Katkoviiva on kuormittamaton lähtö U·x. Kytke kuorma R_L, jolloin lähtö laskee; eniten silloin, kun R_L on pieni potentiometriin nähden. (lisä)"),
            config: {
              x: { min: 0, max: 100, label: T("Wiper position x", "Liukukoskettimen asento x"), unit: "%" }, y: { min: 0, max: 12, label: T("Output U_out", "Lähtö U_out"), unit: "V", auto: true },
              params: [{ id: "U", tex: "U", min: 1, max: 24, step: 1, value: 12, unit: "V" }, { id: "Rp", tex: "R_p", min: 100, max: 10000, value: 1000, unit: "Ω", log: true }, { id: "RL", tex: "R_L", min: 100, max: 1000000, value: 1000, unit: "Ω", log: true }, { id: "x", tex: "x", min: 0, max: 100, step: 1, value: 50, unit: "%" }],
              curves: [
                { fn: function (x, p) { return p.U * x / 100; }, label: T("unloaded", "kuormittamaton"), color: "--c-3", dash: true },
                { fn: function (x, p) { var f = x / 100, rl = f * p.Rp, rpar = rl * p.RL / (rl + p.RL || 1); return p.U * rpar / ((1 - f) * p.Rp + rpar); }, label: T("with load R_L", "kuormitettuna R_L"), color: "--c-1" }
              ],
              points: function (p) { var f = p.x / 100, rl = f * p.Rp, rpar = rl * p.RL / (rl + p.RL || 1); return [{ x: p.x, y: p.U * rpar / ((1 - f) * p.Rp + rpar) }]; },
              readouts: function (p) { var f = p.x / 100, rl = f * p.Rp, rpar = rl * p.RL / (rl + p.RL || 1); return [{ tex: "U_{out}", value: p.U * rpar / ((1 - f) * p.Rp + rpar), unit: "V" }, { label: { en: "unloaded", fi: "kuormittamaton" }, value: p.U * f, unit: "V" }]; }
            } },
          { id: "t2-vd-qb1", type: "question", q: "t2-q-vdiv" }
        ]
      },
      /* ===================== 2.10 CURRENT DIVIDER ===================== */
      {
        id: "t2-cdiv", title: T("Current divider", "Virranjakaja"),
        blocks: [
          { id: "t2-cd-p1", type: "text", html: T(
            "<p>Two resistors in parallel share the total current <f>I</f>. Since <f>U = I·R_1R_2/(R_1+R_2)</f> and <f>I_1 = U/R_1</f>, the <b>larger resistor carries the smaller current</b>. The rule below is valid for <b>exactly two</b> parallel resistors.</p>",
            "<p>Kaksi rinnankytkettyä vastusta jakaa kokonaisvirran <f>I</f>. Koska <f>U = I·R_1R_2/(R_1+R_2)</f> ja <f>I_1 = U/R_1</f>, <b>suurempi vastus kuljettaa pienemmän virran</b>. Alla oleva sääntö pätee <b>täsmälleen kahdelle</b> rinnakkaiselle vastukselle.</p>") },
          { id: "t2-cd-f1", type: "formula", key: true, tex: "I_1 = {R_2}/{R_1+R_2}·I,    I_2 = {R_1}/{R_1+R_2}·I", label: T("Current divider rule (two resistors)", "Virranjakosääntö (kaksi vastusta)") },
          { id: "t2-cd-c1", type: "callout", kind: "warn", title: T("Careful", "Varo"), html: T(
            "Note the crossed indices: I₁ contains R₂. For three or more branches use <f>I_k = U/R_k</f> (or conductances: <f>I_k = G_k/G_{tot}·I</f>), not the two-resistor formula.",
            "Huomaa ristikkäiset indeksit: I₁:n lausekkeessa on R₂. Kolmelle tai useammalle haaralle käytä kaavaa <f>I_k = U/R_k</f> (tai konduktansseilla <f>I_k = G_k/G_{kok}·I</f>), älä kahden vastuksen kaavaa.") },
          { id: "t2-cd-w1", type: "interactive", widget: "circuit", title: T("Current divider: 112 mA into 680 Ω ∥ 330 Ω", "Virranjakaja: 112 mA jaetaan 680 Ω ∥ 330 Ω"),
            caption: T("An ideal current source feeds two branches. Change the source current or the resistors and watch the table: the smaller resistor takes the larger share. Draw a wire across a branch to short it.", "Ideaalinen virtalähde syöttää kahta haaraa. Muuta lähdevirtaa tai vastuksia ja seuraa taulukkoa: pienempi vastus ottaa suuremman osan. Piirrä johdin haaran yli oikosulkeaksesi sen."),
            config: {
              size: [6, 4],
              parts: [
                { id: "I1", type: "I", a: [0, 4], b: [0, 0], value: 0.112, editable: { min: 0.01, max: 0.3, step: 0.001 } },
                { id: "R1", type: "R", a: [3, 1], b: [3, 4], value: 680, editable: { min: 10, max: 2000 } },
                { id: "R2", type: "R", a: [6, 1], b: [6, 4], value: 330, editable: { min: 10, max: 2000 } }
              ],
              wires: [[[0, 0], [6, 0]], [[3, 0], [3, 1]], [[6, 0], [6, 1]], [[0, 4], [6, 4]]],
              ground: [0, 4], tools: ["wire", "cut"], show: { values: true, flow: true }, table: true
            } },
          { id: "t2-cd-ex1", type: "example", title: T("Splitting 112 mA", "112 mA:n jakautuminen"),
            problem: T("I = 112 mA flows into R₁ = 680 Ω ∥ R₂ = 330 Ω. Find I₁, I₂ and the source voltage U_s.", "Virta I = 112 mA virtaa vastuksiin R₁ = 680 Ω ∥ R₂ = 330 Ω. Laske I₁, I₂ ja lähdejännite U_s."),
            given: ["I = 112 mA", "R₁ = 680 Ω", "R₂ = 330 Ω"],
            steps: [
              { tex: "R = {680·330}/{1010} ≈ 222 Ω,   U_s = I·R ≈ 24.9 V ≈ 25 V" },
              { tex: "I_1 = {330}/{1010}·112 mA ≈ 36.6 mA" },
              { tex: "I_2 = {680}/{1010}·112 mA ≈ 75.4 mA" },
              T("Check: 36.6 + 75.4 = 112 mA. The slide prints 36.8 and 76.8 mA, which add up to 113.6 mA, so those are wrong.", "Tarkistus: 36,6 + 75,4 = 112 mA. Kalvolla on 36,8 ja 76,8 mA, jotka summautuvat arvoon 113,6 mA, eli ne ovat virheellisiä.")
            ],
            result: T("I₁ = 36.6 mA, I₂ = 75.4 mA, U_s ≈ 25 V", "I₁ = 36,6 mA, I₂ = 75,4 mA, U_s ≈ 25 V") },
          { id: "t2-cd-ex2", type: "example", title: T("Parallel exercises", "Rinnankytkentäharjoituksia"),
            problem: T("a) 10 V across three 33 kΩ resistors in parallel. b) 25 V across 1.0 kΩ, 3.9 kΩ and 560 Ω in parallel. Find the branch currents and R_eq.", "a) 10 V kolmen rinnankytketyn 33 kΩ:n vastuksen yli. b) 25 V rinnankytkettyjen 1,0 kΩ, 3,9 kΩ ja 560 Ω:n vastusten yli. Laske haaravirrat ja R_eq."),
            given: ["a) 3 × 33 kΩ, 10 V", "b) 1.0 kΩ, 3.9 kΩ, 560 Ω, 25 V"],
            steps: [
              { tex: "a) I_k = {10}/{33000} ≈ 0.303 mA,   I_{tot} ≈ 0.909 mA,   R_{eq} = 11 kΩ" },
              { tex: "b) I_1 = 25 mA,  I_2 ≈ 6.41 mA,  I_3 ≈ 44.6 mA,  I_{tot} ≈ 76.1 mA,  R_{eq} ≈ 329 Ω" }
            ],
            result: T("a) 0.303 mA each, b) 25 / 6.41 / 44.6 mA", "a) 0,303 mA kukin, b) 25 / 6,41 / 44,6 mA") },
          { id: "t2-cd-qb1", type: "question", q: "t2-q-cdiv" }
        ]
      }
    ],
    questions: [
      /* ---------- practice ---------- */
      { id: "t2-q-dir", mode: "practice", type: "mc", difficulty: 1,
        prompt: T("A wire is connected to a battery. Which statement about directions is correct?", "Johdin on kytketty paristoon. Mikä väite suunnista on oikein?"),
        options: [
          { id: "a", html: T("Conventional current flows from − to + inside the wire.", "Virta kulkee johtimessa miinuksesta plussaan.") },
          { id: "b", html: T("Conventional current flows from + to −; the electrons drift the opposite way.", "Virta kulkee plussasta miinukseen; elektronit ajautuvat vastakkaiseen suuntaan.") },
          { id: "c", html: T("Current and the electrons move in the same direction.", "Virta ja elektronit liikkuvat samaan suuntaan.") },
          { id: "d", html: T("The direction of the current alternates.", "Virran suunta vaihtelee.") }
        ], shuffle: true },
      { id: "t2-q-J", mode: "practice", type: "numeric", difficulty: 1, tol: 0.02,
        prompt: T("A copper wire with cross-section 1.5 mm² carries 9.5 A. Find the current density J (type e.g. 6.3e6).", "Kuparijohtimen poikkipinta on 1,5 mm² ja siinä kulkee 9,5 A. Laske virrantiheys J (kirjoita esim. 6.3e6)."),
        fields: [{ id: "J", tex: "J", unit: "A/m²" }] },
      { id: "t2-q-rho", mode: "practice", type: "fill", difficulty: 1,
        prompt: T("Complete the statement about a conductor.", "Täydennä johtimea koskeva väite."),
        text: T("In <f>R = X·l/A</f> the material constant X is called [[a]], and the unit of R is the [[b]].", "Kaavassa <f>R = X·l/A</f> aineen ominaisuutta X kutsutaan nimellä [[a]] ja R:n yksikkö on [[b]]."),
        fields: [{ id: "a", kind: "text" }, { id: "b", kind: "text" }] },
      { id: "t2-q-ohm", mode: "practice", type: "multi", difficulty: 2,
        prompt: T("Select ALL true statements about <f>R = ρ·l/A</f> for a metal wire at constant temperature.", "Valitse KAIKKI tosi väitteet kaavasta <f>R = ρ·l/A</f> metallijohtimelle vakiolämpötilassa."),
        options: [
          { id: "a", html: T("Doubling the length doubles R.", "Pituuden kaksinkertaistaminen kaksinkertaistaa R:n.") },
          { id: "b", html: T("Doubling the cross-section doubles R.", "Poikkipinnan kaksinkertaistaminen kaksinkertaistaa R:n.") },
          { id: "c", html: T("Doubling both l and A leaves R unchanged.", "Sekä l:n että A:n kaksinkertaistaminen jättää R:n ennalleen.") },
          { id: "d", html: T("R is the same for copper and nichrome of equal size.", "R on sama kuparille ja nikkelikromille, kun mitat ovat samat.") },
          { id: "e", html: T("Doubling the voltage doubles R.", "Jännitteen kaksinkertaistaminen kaksinkertaistaa R:n.") }
        ], shuffle: true },
      { id: "t2-q-slider", mode: "practice", type: "slider", difficulty: 2, tol: 0.03,
        prompt: T("A 50 m copper wire (ρ = 1.68·10⁻⁸ Ω·m) must have a resistance of 0.168 Ω. Set the cross-section A.", "50 m pitkän kuparijohtimen (ρ = 1,68·10⁻⁸ Ω·m) resistanssin tulee olla 0,168 Ω. Aseta poikkipinta-ala A."),
        widget: { name: "plot", config: {
          x: { min: 1, max: 10, label: T("Cross-section A", "Poikkipinta A"), unit: "mm²" }, y: { min: 0, max: 0.9, label: T("Resistance R", "Resistanssi R"), unit: "Ω", auto: true },
          params: [{ id: "A", tex: "A", min: 1, max: 10, step: 0.1, value: 2, unit: "mm²" }],
          curves: [{ fn: function (x) { return 1.68e-8 * 50 / (x * 1e-6); }, label: T("R(A)", "R(A)") }],
          points: function (p) { return [{ x: p.A, y: 1.68e-8 * 50 / (p.A * 1e-6) }]; },
          readouts: function (p) { return [{ tex: "R", value: 1.68e-8 * 50 / (p.A * 1e-6), unit: "Ω" }]; },
          answer: function (p) { return { v: p.A }; }
        } } },
      { id: "t2-q-units", mode: "practice", type: "match", difficulty: 1,
        prompt: T("Match each quantity with its SI unit.", "Yhdistä suure ja sen SI-yksikkö."),
        left: [{ id: "rho", html: T("resistivity", "resistiivisyys") }, { id: "G", html: T("conductance", "konduktanssi") }, { id: "gam", html: T("conductivity", "konduktiivisuus") }, { id: "J", html: T("current density", "virrantiheys") }, { id: "P", html: T("power", "teho") }],
        right: [{ id: "u1", html: "Ω·m" }, { id: "u2", html: "S" }, { id: "u3", html: "S/m" }, { id: "u4", html: "A/m²" }, { id: "u5", html: "W" }, { id: "u6", html: "V/m" }] },
      { id: "t2-q-color5", mode: "practice", type: "numeric", difficulty: 1, tol: 0.01,
        prompt: T("Read this 5-band resistor (yellow, violet, black, red, brown). Give R in ohms (e.g. 47k).", "Lue tämä 5-renkainen vastus (keltainen, violetti, musta, punainen, ruskea). Anna R ohmeina (esim. 47k)."),
        fields: [{ id: "R", tex: "R", unit: "Ω" }],
        figure: { svg: bandsSvg([4, 7, 0, 2, 1], "style='max-width:340px;width:100%;color:var(--fg)'"), caption: T("yellow – violet – black – red – brown", "keltainen – violetti – musta – punainen – ruskea") } },
      { id: "t2-q-label", mode: "practice", type: "match", difficulty: 1,
        prompt: T("Match each label code with its resistance.", "Yhdistä merkintäkoodi ja resistanssi."),
        left: [{ id: "c1", html: "473" }, { id: "c2", html: "4R7" }, { id: "c3", html: "2M2" }, { id: "c4", html: "220K" }, { id: "c5", html: "22R" }],
        right: [{ id: "r1", html: "47 kΩ" }, { id: "r2", html: "4.7 Ω" }, { id: "r3", html: "2.2 MΩ" }, { id: "r4", html: "220 kΩ" }, { id: "r5", html: "22 Ω" }, { id: "r6", html: "4.7 kΩ" }] },
      { id: "t2-q-temp", mode: "practice", type: "numeric", difficulty: 2, tol: 0.01,
        prompt: T("A copper coil has R₀ = 10 Ω at 20 °C (α = 0.0068 1/°C). Find its resistance at 70 °C.", "Kuparikelan R₀ = 10 Ω lämpötilassa 20 °C (α = 0,0068 1/°C). Laske resistanssi lämpötilassa 70 °C."),
        fields: [{ id: "R", tex: "R_T", unit: "Ω" }] },
      { id: "t2-q-pow", mode: "practice", type: "mc", difficulty: 2,
        prompt: T("A fixed resistor is connected to a voltage source. The source voltage is doubled. What happens to the power in the resistor?", "Kiinteä vastus on kytketty jännitelähteeseen. Lähteen jännite kaksinkertaistetaan. Mitä vastuksen teholle tapahtuu?"),
        options: [{ id: "a", html: T("It doubles.", "Se kaksinkertaistuu.") }, { id: "b", html: T("It quadruples.", "Se nelinkertaistuu.") }, { id: "c", html: T("It halves.", "Se puolittuu.") }, { id: "d", html: T("It stays the same.", "Se pysyy samana.") }], shuffle: true },
      { id: "t2-q-breaker", mode: "practice", type: "numeric", difficulty: 2, tol: 0.02,
        prompt: T("A 2000 W kettle and a 1800 W heater run on the same 230 V circuit. Find the total current.", "2000 W:n vedenkeitin ja 1800 W:n lämmitin ovat samassa 230 V:n piirissä. Laske kokonaisvirta."),
        fields: [{ id: "I", tex: "I", unit: "A" }] },
      { id: "t2-q-order", mode: "practice", type: "order", difficulty: 2,
        prompt: T("Order these networks by equivalent resistance, smallest first.", "Järjestä kytkennät korvausresistanssin mukaan pienimmästä suurimpaan."),
        items: [
          { id: "a", html: T("two 100 Ω in parallel", "kaksi 100 Ω:n vastusta rinnan") },
          { id: "b", html: T("one 100 Ω resistor", "yksi 100 Ω:n vastus") },
          { id: "c", html: T("two 100 Ω in series", "kaksi 100 Ω:n vastusta sarjassa") },
          { id: "d", html: T("100 Ω in series with two 100 Ω in parallel", "100 Ω sarjassa kahden rinnakkaisen 100 Ω:n kanssa") }
        ] },
      { id: "t2-q-short", mode: "practice", type: "circuit", difficulty: 3, tol: 0.02,
        prompt: T("12 V drives R1 and R2 in series. Use the wire tool to draw ONE wire so that the ammeter shows 120 mA.", "12 V syöttää sarjassa olevia R1:tä ja R2:ta. Piirrä johdintyökalulla YKSI johdin niin, että virtamittari näyttää 120 mA."),
        hints: [
          { en: "Which resistor must carry no current?", fi: "Minkä vastuksen läpi virran ei pidä kulkea?" },
          { en: "A wire connected across a resistor gives the current an easier path, so that resistor is bypassed.", fi: "Vastuksen yli kytketty johdin antaa virralle helpomman reitin, joten vastus ohitetaan." },
          { en: "After the bypass only the remaining resistor limits the current. Use Ohm’s law U = R·I with the source voltage.", fi: "Ohituksen jälkeen virtaa rajoittaa enää jäljelle jäänyt vastus. Käytä Ohmin lakia U = R·I ja lähdejännitettä." }
        ],
        widget: { name: "circuit", config: (function () { var c = twoSeriesCfg(100, 220, 12); c.answer = { kind: "I", part: "A1" }; return c; })() } },
      { id: "t2-q-req", mode: "practice", type: "circuit", difficulty: 3, tol: 0.01,
        prompt: T("Using only the four given resistors and the wire tool, connect a network between A and B whose equivalent resistance is 400 Ω. Not every resistor has to be used.", "Kytke annetuista neljästä vastuksesta ja johdintyökalulla A:n ja B:n väliin verkko, jonka korvausresistanssi on 400 Ω. Kaikkia vastuksia ei tarvitse käyttää."),
        hints: [
          { en: "Series adds, parallel reduces.", fi: "Sarjaankytkennässä resistanssit summataan, rinnankytkennässä kokonaisresistanssi pienenee." },
          { en: "The target is larger than the smallest resistor, so start from a series combination. Check which pairs of values could add up to the target.", fi: "Tavoite on suurempi kuin pienin vastus, joten aloita sarjaankytkennästä. Tarkista, mitkä arvoparit voisivat summautua tavoitteeseen." },
          { en: "Wire the chosen resistors one after another between A and B, and read the equivalent resistance shown by the widget.", fi: "Kytke valitut vastukset peräkkäin A:n ja B:n välille ja lue korvausresistanssi kaaviosta." }
        ],
        widget: { name: "circuit", config: {
          size: [8, 6],
          parts: [
            { id: "R1", type: "R", a: [2, 0], b: [5, 0], value: 100 }, { id: "R2", type: "R", a: [2, 2], b: [5, 2], value: 300 },
            { id: "R3", type: "R", a: [2, 4], b: [5, 4], value: 200 }, { id: "R4", type: "R", a: [2, 6], b: [5, 6], value: 600 }
          ],
          wires: [], labels: [{ at: [0, 3], text: "A", dx: -8 }, { at: [8, 3], text: "B", dx: 8 }],
          tools: ["wire", "cut"], show: { values: true }, answer: { kind: "Req", a: [0, 3], b: [8, 3] }
        } } },
      { id: "t2-q-mixed", mode: "practice", type: "numeric", difficulty: 3, tol: 0.01,
        prompt: T("A 24 V source feeds R1 = 60 Ω in series with 100 Ω ∥ 150 Ω. Find the source current.", "24 V:n lähde syöttää R1 = 60 Ω:ia, jonka kanssa sarjassa on 100 Ω ∥ 150 Ω. Laske lähteen virta."),
        hints: [
          { en: "Combine the resistors step by step: first the parallel pair, then the series connection.", fi: "Yhdistä vastukset vaiheittain: ensin rinnankytkentä, sitten sarjaankytkentä." },
          { en: "For the parallel pair use R = R₁·R₂/(R₁ + R₂). Then add the series resistor to get the total resistance seen by the source.", fi: "Rinnankytkennälle käytä R = R₁·R₂/(R₁ + R₂). Lisää sitten sarjassa oleva vastus, niin saat lähteen näkemän kokonaisresistanssin." },
          { en: "The source current is the source voltage divided by that total resistance (Ohm’s law).", fi: "Lähteen virta on lähdejännite jaettuna tällä kokonaisresistanssilla (Ohmin laki)." }
        ],
        fields: [{ id: "I", tex: "I", unit: "A" }] },
      { id: "t2-q-vdiv", mode: "practice", type: "numeric", difficulty: 2, tol: 0.02,
        prompt: T("A 9 V source feeds R1 = 2 kΩ (top) in series with R2 = 1 kΩ (bottom). Find the output voltage across R2.", "9 V:n lähde syöttää R1 = 2 kΩ (ylhäällä) ja sen kanssa sarjassa R2 = 1 kΩ (alhaalla). Laske lähtöjännite R2:n yli."),
        fields: [{ id: "U", tex: "U_{out}", unit: "V" }] },
      { id: "t2-q-cdiv", mode: "practice", type: "mc", difficulty: 2,
        prompt: T("Two resistors, 100 Ω and 400 Ω, are in parallel and carry a total of 50 mA. Which current does the 100 Ω resistor carry?", "Kaksi vastusta, 100 Ω ja 400 Ω, ovat rinnan ja niiden yhteisvirta on 50 mA. Paljonko virtaa 100 Ω:n vastus kuljettaa?"),
        options: [{ id: "a", html: "10 mA" }, { id: "b", html: "40 mA" }, { id: "c", html: "25 mA" }, { id: "d", html: "20 mA" }], shuffle: true },
      /* ---------- graded ---------- */
      { id: "t2-g-drift", mode: "graded", type: "mc", difficulty: 1, points: 1,
        prompt: T("Compare the drift velocity v_d of electrons in a copper wire at 10 A with their random thermal speed.", "Vertaa elektronien kulkeutumisnopeutta v_d kuparijohtimessa (10 A) niiden satunnaiseen lämpöliikkeen nopeuteen."),
        options: [
          { id: "a", html: T("v_d is about 10⁹ times smaller than the thermal speed.", "v_d on noin 10⁹ kertaa pienempi kuin lämpöliikkeen nopeus.") },
          { id: "b", html: T("v_d is about the same as the thermal speed.", "v_d on suunnilleen yhtä suuri kuin lämpöliikkeen nopeus.") },
          { id: "c", html: T("v_d is about 10⁹ times larger than the thermal speed.", "v_d on noin 10⁹ kertaa suurempi kuin lämpöliikkeen nopeus.") },
          { id: "d", html: T("v_d equals the speed of light.", "v_d on valon nopeus.") }
        ], shuffle: true },
      { id: "t2-g-wire", mode: "graded", type: "numeric", difficulty: 1, points: 2, tol: 0.01,
        prompt: T("A copper wire is 50 m long with cross-section 2.5 mm² (ρ = 1.68·10⁻⁸ Ω·m). Find its resistance.", "Kuparijohtimen pituus on 50 m ja poikkipinta 2,5 mm² (ρ = 1,68·10⁻⁸ Ω·m). Laske sen resistanssi."),
        fields: [{ id: "R", tex: "R", unit: "Ω" }] },
      { id: "t2-g-color4", mode: "graded", type: "numeric", difficulty: 1, points: 1, tol: 0.01,
        prompt: T("Read this 4-band resistor (brown, black, red, gold). Give R in ohms.", "Lue tämä 4-renkainen vastus (ruskea, musta, punainen, kulta). Anna R ohmeina."),
        fields: [{ id: "R", tex: "R", unit: "Ω" }],
        figure: { svg: bandsSvg([1, 0, 2, 10], "style='max-width:340px;width:100%;color:var(--fg)'"), caption: T("brown – black – red – gold", "ruskea – musta – punainen – kulta") } },
      { id: "t2-g-heater", mode: "graded", type: "numeric", difficulty: 2, points: 2, tol: 0.01,
        prompt: T("A heater is rated 2300 W at 230 V. Find the current and the resistance.", "Lämmittimen nimellisteho on 2300 W jännitteellä 230 V. Laske virta ja resistanssi."),
        fields: [{ id: "I", tex: "I", unit: "A" }, { id: "R", tex: "R", unit: "Ω" }] },
      { id: "t2-g-lamp", mode: "graded", type: "circuit", difficulty: 3, points: 3, tol: 0.02,
        prompt: T("Draw ONE wire with the wire tool so that the lamp receives the greatest possible power, without short-circuiting the source.", "Piirrä johdintyökalulla YKSI johdin niin, että lamppu saa mahdollisimman suuren tehon oikosulkematta lähdettä."),
        hints: [
          { en: "The lamp power is P = U²/R, or P = R·I²: the larger the lamp current (or voltage), the more power.", fi: "Lampun teho on P = U²/R tai P = R·I²: mitä suurempi lampun virta (tai jännite), sitä suurempi teho." },
          { en: "The series resistors take part of the source voltage. A wire across one of them removes that loss.", fi: "Sarjavastukset ottavat osan lähdejännitteestä. Johdin yhden niistä yli kytkettynä poistaa tämän häviön." },
          { en: "Do not wire across the source itself, and try both resistors to compare the lamp power in the table.", fi: "Älä kytke johdinta itse lähteen yli, vaan kokeile molempia vastuksia ja vertaa lampun tehoa taulukosta." }
        ],
        widget: { name: "circuit", config: {
          size: [9, 4],
          parts: [
            { id: "U1", type: "V", a: [0, 4], b: [0, 0], value: 12 },
            { id: "R1", type: "R", a: [1, 0], b: [4, 0], value: 50 }, { id: "R2", type: "R", a: [5, 0], b: [8, 0], value: 50 },
            { id: "L1", type: "lamp", a: [9, 1], b: [9, 4], value: 50, rated: 3 }
          ],
          wires: [[[0, 0], [1, 0]], [[4, 0], [5, 0]], [[8, 0], [9, 0], [9, 1]], [[9, 4], [0, 4]]],
          ground: [0, 4], tools: ["wire", "cut"], show: { values: true, flow: true }, table: true, answer: { kind: "P", part: "L1" }
        } } },
      { id: "t2-g-cdiv", mode: "graded", type: "numeric", difficulty: 2, points: 2, tol: 0.01,
        prompt: T("A current of 112 mA enters a parallel pair 680 Ω ∥ 330 Ω. Find the current through the 680 Ω resistor.", "Virta 112 mA tulee rinnankytkentään 680 Ω ∥ 330 Ω. Laske 680 Ω:n vastuksen läpi kulkeva virta."),
        fields: [{ id: "I", tex: "I_1", unit: "A" }] }
    ]
  });
})();

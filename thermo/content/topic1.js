/* Topic 1: Fluid statics. Source: slide deck Ph2_1 (source/extracted/pages/ph2-1/p01-p19), errata applied.
 * NO answers in this file: they live in src/answers/topic1.json. Block ids are stable; never rename. */
(function () {
  "use strict";
  function T(en, fi) { return { en: en, fi: fi }; }
  var P0 = 101325;
  var GAUGE_SVG = "<svg viewBox='0 -8 360 208' xmlns='http://www.w3.org/2000/svg' font-family='system-ui,sans-serif' font-size='11'><line x1='40' y1='10' x2='40' y2='170' stroke='currentColor' stroke-width='2'/><line x1='40' y1='170' x2='350' y2='170' stroke='currentColor' stroke-width='2'/><line x1='40' y1='130' x2='350' y2='130' stroke='currentColor' stroke-dasharray='4 3'/><text x='4' y='174'>0</text><text x='4' y='134'>0.1</text><text x='4' y='94'>0.2</text><text x='4' y='54'>0.3</text><text x='40' y='8'>p / MPa</text><circle cx='90' cy='70' r='5' fill='currentColor'/><text x='102' y='66'>p_e = 0.15 MPa, p = 0.25 MPa</text><circle cx='90' cy='130' r='5' fill='currentColor'/><text x='102' y='126'>p_e = 0, p = 0.1 MPa = p_0</text><circle cx='150' cy='170' r='5' fill='currentColor'/><text x='162' y='162'>p_e = −0.1 MPa, p = 0</text></svg>";   // symbols only, same in both languages

  /** Bourdon-gauge dial: the needle shows GAUGE pressure p_e = p - p_0, the slider sets the ABSOLUTE pressure. */
  function bourdonMount(host, ctx) {
    var U = TDC.util, V = TDC.viz, lo = -1, hi = 9;      // dial range in bar (gauge)
    var out = document.createElement("div"); out.className = "readout-list";
    var panel = V.params([{ id: "pabs", tex: "p", min: 0, max: 1000, step: 1, value: 250, unit: "kPa" }], upd, ctx);
    function upd() {
      var p = panel.values.pabs * 1000, pe = p - P0;
      out.innerHTML = "";
      [[T("Absolute pressure p", "Absoluuttinen paine p"), U.fmtNum(p / 1e5, 4) + " bar"],
       [T("Gauge pressure p_e = p − p_0", "Ylipaine p_e = p − p_0"), U.fmtNum(pe / 1e5, 4) + " bar"],
       [T("Dial reads", "Mittari näyttää"), pe < 0 ? ctx.tx(T("vacuum (negative gauge pressure)", "alipaine (negatiivinen ylipaine)")) : ctx.tx(T("overpressure", "ylipaine"))]
      ].forEach(function (r) {
        var d = document.createElement("div"); d.className = "readout";
        var s = document.createElement("span"); s.textContent = ctx.tx(r[0]);
        var b = document.createElement("b"); b.textContent = " = " + r[1]; d.appendChild(s); d.appendChild(b); out.appendChild(d);
      });
    }
    var c = V.canvas(host, { aspect: function (w) { return w < 520 ? 0.85 : 0.5; }, draw: function (g, w, h) {
      g.clearRect(0, 0, w, h);
      var pe = (panel.values.pabs * 1000 - P0) / 1e5, cx = w / 2, cy = h * 0.5, R = Math.min(w * 0.42, h * 0.44) / 1.12;   // whole dial (radius 1.12 R) inside the canvas
      var a0 = 0.75 * Math.PI, sweep = 1.5 * Math.PI;
      function ang(v) { return a0 + sweep * (v - lo) / (hi - lo); }
      g.fillStyle = ctx.color("--surface-2"); g.strokeStyle = ctx.color("--fg"); g.lineWidth = 3;
      g.beginPath(); g.arc(cx, cy, R * 1.12, 0, 7); g.fill(); g.stroke();
      g.lineWidth = 6; g.strokeStyle = ctx.color("--c-flow"); g.beginPath(); g.arc(cx, cy, R * 0.98, ang(lo), ang(0)); g.stroke();
      g.font = Math.round(R * 0.12) + "px system-ui,sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
      for (var v = lo; v <= hi; v++) {
        var a = ang(v), c1 = Math.cos(a), s1 = Math.sin(a);
        g.strokeStyle = ctx.color("--fg"); g.lineWidth = 2;
        g.beginPath(); g.moveTo(cx + c1 * R * 0.88, cy + s1 * R * 0.88); g.lineTo(cx + c1 * R * 0.98, cy + s1 * R * 0.98); g.stroke();
        g.fillStyle = ctx.color("--fg"); g.fillText(String(v), cx + c1 * R * 0.72, cy + s1 * R * 0.72);
      }
      g.fillStyle = ctx.color("--muted"); g.fillText("bar", cx, cy + R * 0.42);
      var pv = Math.max(lo, Math.min(hi, pe)), an = ang(pv);
      g.strokeStyle = ctx.color("--c-2"); g.lineWidth = 4; g.lineCap = "round";
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(an) * R * 0.85, cy + Math.sin(an) * R * 0.85); g.stroke();
      g.fillStyle = ctx.color("--fg"); g.beginPath(); g.arc(cx, cy, R * 0.06, 0, 7); g.fill();
    } });
    host.appendChild(panel); host.appendChild(out); upd();
    return { destroy: function () { c.destroy(); } };
  }

  TDC.registerTopic({
    id: "t1", num: 1,
    title: T("Fluid statics", "Nesteiden statiikka"),
    subtitle: T("Density, pressure, hydrostatic and atmospheric pressure, buoyancy and Pascal's law, seen through submarines, gauges, level sensors and hydraulics.",
                "Tiheys, paine, hydrostaattinen ja ilmanpaine, noste ja Pascalin laki sukellusveneiden, mittareiden, pinta-antureiden ja hydrauliikan avulla."),
    objectives: [
      T("tell hydrostatics from hydrodynamics and name the phases of matter", "erottaa hydrostatiikan hydrodynamiikasta ja nimetä aineen olomuodot"),
      T("use density ρ = m/V and pressure p = F/A, and convert between pressure units", "käyttää tiheyttä ρ = m/V ja painetta p = F/A sekä muuntaa paineyksiköitä"),
      T("separate absolute and gauge pressure and explain how barometers, manometers, Bourdon gauges and pressure transmitters measure them", "erottaa absoluuttisen paineen ja ylipaineen ja selittää, miten ilmapuntarit, manometrit, Bourdon-mittarit ja painelähettimet mittaavat niitä"),
      T("calculate hydrostatic pressure p = p_0 + ρgh and the atmospheric pressure at a given height", "laskea hydrostaattisen paineen p = p_0 + ρgh ja ilmanpaineen tietyllä korkeudella"),
      T("apply Archimedes' principle to floating and submerged bodies (ships, submarines)", "soveltaa Arkhimedeen lakia kelluviin ja uponneisiin kappaleisiin (laivat, sukellusveneet)"),
      T("apply Pascal's law to hydraulic lifts and brakes", "soveltaa Pascalin lakia hydraulisiin nostimiin ja jarruihin")
    ],
    glossary: {
      fluid: { en: "fluid", fi: "fluidi (virtaava aine)", def: T("A liquid or a gas: no fixed shape and able to flow.", "Neste tai kaasu: ei pysyvää muotoa ja voi virrata.") },
      density: { en: "density", fi: "tiheys", sym: "ρ = m/V", def: T("Mass per unit volume, unit kg/m³.", "Massa tilavuusyksikköä kohti, yksikkö kg/m³.") },
      pressure: { en: "pressure", fi: "paine", sym: "p = F_n/A", def: T("Normal force per unit area, unit pascal (Pa = N/m²).", "Pintaa vastaan kohtisuora voima pinta-alayksikköä kohti, yksikkö pascal (Pa = N/m²).") },
      abspressure: { en: "absolute pressure", fi: "absoluuttinen paine", sym: "p", def: T("Pressure measured from zero (vacuum).", "Paine mitattuna nollasta (tyhjiöstä).") },
      gaugepressure: { en: "gauge pressure", fi: "ylipaine", sym: "p_e = p − p_0", def: T("Pressure relative to the surrounding atmospheric pressure; negative below it (vacuum).", "Paine suhteessa ympäröivään ilmanpaineeseen; ilmanpainetta pienempi paine on alipainetta (negatiivinen ylipaine).") },
      atmpressure: { en: "atmospheric pressure", fi: "ilmanpaine", sym: "p_0", def: T("Pressure of the air; standard value 101.325 kPa.", "Ilman paine; normaaliarvo 101,325 kPa.") },
      hydrostatic: { en: "hydrostatic pressure", fi: "hydrostaattinen paine", sym: "ρgh", def: T("Pressure caused by the weight of a fluid column of height h.", "Nestepatsaan, jonka korkeus on h, painon aiheuttama paine.") },
      buoyancy: { en: "buoyant force", fi: "noste", sym: "F_n = ρ_n gV", def: T("Upward force of a fluid on a submerged body, equal to the weight of the displaced fluid.", "Fluidin upotettuun kappaleeseen kohdistama ylöspäin suuntautuva voima, joka on yhtä suuri kuin syrjäytetyn fluidin paino.") },
      archimedes: { en: "Archimedes' principle", fi: "Arkhimedeen laki", def: T("The buoyant force equals the weight of the displaced fluid.", "Noste on yhtä suuri kuin syrjäytetyn fluidin paino.") },
      pascal: { en: "Pascal's law", fi: "Pascalin laki", def: T("Pressure applied to a confined fluid acts equally at every point of it.", "Suljettuun nesteeseen kohdistettu paine vaikuttaa yhtä suurena kaikkialla nesteessä.") },
      pressuregauge: { en: "pressure gauge / manometer", fi: "painemittari (manometri)", def: T("Instrument that shows pressure, e.g. a U-tube or a Bourdon gauge.", "Laite, joka näyttää paineen, esim. U-putki tai Bourdon-mittari.") },
      transmitter: { en: "pressure transmitter", fi: "paineanturi / painelähetin", def: T("Sensor that converts pressure into a standard signal, typically 4–20 mA.", "Anturi, joka muuntaa paineen standardiviestiksi, tyypillisesti 4–20 mA.") },
      barometer: { en: "barometer", fi: "ilmapuntari (barometri)", def: T("Instrument for absolute atmospheric pressure, e.g. Torricelli's mercury barometer.", "Ilmanpaineen absoluuttinen mittari, esim. Torricellin elohopeailmapuntari.") },
      bourdon: { en: "Bourdon tube", fi: "Bourdon-putki", def: T("Curved flattened tube that straightens under overpressure and moves a pointer.", "Kaareva litteä putki, joka suoristuu ylipaineessa ja liikuttaa osoitinta.") },
      incompressible: { en: "incompressible", fi: "kokoonpuristumaton", def: T("Density stays almost constant under pressure (liquids).", "Tiheys pysyy lähes vakiona paineessa (nesteet).") },
      hydraulics: { en: "hydraulics", fi: "hydrauliikka", def: T("Technical applications of fluids using liquids.", "Nesteiden tekniset sovellukset.") },
      pneumatics: { en: "pneumatics", fi: "pneumatiikka", def: T("Technical applications using gases (compressed air).", "Kaasujen (paineilman) tekniset sovellukset.") }
    },
    formulas: [
      { name: T("Density", "Tiheys"), tex: "ρ = {m}/{V}" },
      { name: T("Pressure", "Paine"), tex: "p = {F_n}/{A}" },
      { name: T("Gauge pressure", "Ylipaine"), tex: "p_e = p − p_0" },
      { name: T("Pressure at depth h", "Paine syvyydellä h"), tex: "p = p_0 + ρgh" },
      { name: T("Hydrostatic (gauge) pressure", "Hydrostaattinen paine (ylipaine)"), tex: "p_e = ρgh" },
      { name: T("Atmospheric pressure at height h", "Ilmanpaine korkeudella h"), tex: "p(h) = p_0·e^{-{ρ_0 g h}/{p_0}}" },
      { name: T("Buoyant force (Archimedes)", "Noste (Arkhimedes)"), tex: "F_n = ρ_n g V" },
      { name: T("Floating body", "Kelluva kappale"), tex: "m g = ρ_n g V_u" },
      { name: T("Pascal: hydraulic lift", "Pascal: hydraulinen nostin"), tex: "{F_1}/{A_1} = {F_2}/{A_2}" },
      { name: T("Work of the pistons", "Mäntien tekemä työ"), tex: "W = F_1 s_1 = F_2 s_2 = pΔV" },
      { name: T("Pressure units", "Paineyksiköt"), tex: "100 kPa = 1 bar ≈ 750 mmHg ≈ 14.5 psi" }
    ],
    sections: [
      // ---------------------------------------------------------------- 1
      { id: "t1-fluids", title: T("Fluids and density", "Fluidit ja tiheys"), blocks: [
        { id: "t1-fl-t1", type: "text", html: T(
          "<p><b>Hydrostatics</b> studies fluids at rest. <b>Hydrodynamics</b> studies moving fluids, e.g. flow and hydrodynamic power transfer (topic 2). <b>Hydraulics</b> is the technical use of fluids with <em>liquids</em>; <b>pneumatics</b> is the same with <em>gases</em>.</p><p>The three common <b>phases of matter</b> are solid, liquid and gas. Solids keep their shape in normal conditions. Liquids and gases do not keep a fixed shape and can flow, so together they are called <dfn data-term='fluid'>fluids</dfn>. The fourth phase, plasma (ionised gas with a lot of energy), is the most common phase in the Universe.</p>",
          "<p><b>Hydrostatiikka</b> tutkii levossa olevia fluideja. <b>Hydrodynamiikka</b> tutkii liikkuvia fluideja, esim. virtausta ja hydrodynaamista tehonsiirtoa (aihe 2). <b>Hydrauliikka</b> on fluidien tekninen käyttö <em>nesteillä</em>, <b>pneumatiikka</b> vastaavasti <em>kaasuilla</em>.</p><p>Aineen kolme tavallista <b>olomuotoa</b> ovat kiinteä, neste ja kaasu. Kiinteät aineet säilyttävät muotonsa normaaliolosuhteissa. Neste ja kaasu eivät säilytä muotoaan ja voivat virrata, joten niitä kutsutaan yhdessä <dfn data-term='fluid'>fluideiksi</dfn>. Neljäs olomuoto, plasma (ionisoitunut, runsaasti energiaa sisältävä kaasu), on maailmankaikkeuden yleisin olomuoto.</p>") },
        { id: "t1-fl-t2", type: "text", html: T(
          "<p>The <b><dfn data-term='density'>density</dfn></b> of a substance is its mass per unit volume. The SI unit is kg/m³; g/cm³ is also common.</p>",
          "<p>Aineen <b><dfn data-term='density'>tiheys</dfn></b> on sen massa tilavuusyksikköä kohti. SI-yksikkö on kg/m³; myös g/cm³ on yleinen.</p>") },
        { id: "t1-fl-f1", type: "formula", tex: "ρ = {m}/{V}", key: true, label: T("Density", "Tiheys"),
          legend: [["ρ", T("density", "tiheys"), "kg/m³"], ["m", T("mass", "massa"), "kg"], ["V", T("volume", "tilavuus"), "m³"]] },
        { id: "t1-fl-note", type: "callout", kind: "tip", html: T("<p><b>Remember:</b> 1.0 g/cm³ = 1000 kg/m³.</p>", "<p><b>Muista:</b> 1,0 g/cm³ = 1000 kg/m³.</p>") },
        { id: "t1-fl-tab", type: "table",
          caption: T("Densities at 0 °C and 1 atm unless stated (Table 13-1 of the slides).", "Tiheyksiä lämpötilassa 0 °C ja paineessa 1 atm, ellei toisin mainita (diojen taulukko 13-1)."),
          head: [T("Substance", "Aine"), T("ρ (kg/m³)", "ρ (kg/m³)")],
          rows: [
            [T("Aluminium", "Alumiini"), "2.70·10³"], [T("Iron and steel", "Rauta ja teräs"), "7.8·10³"], [T("Copper", "Kupari"), "8.9·10³"],
            [T("Lead", "Lyijy"), "11.3·10³"], [T("Gold", "Kulta"), "19.3·10³"], [T("Concrete", "Betoni"), "2.3·10³"], [T("Granite", "Graniitti"), "2.7·10³"],
            [T("Wood (typical)", "Puu (tyypillinen)"), "0.3–0.9·10³"], [T("Glass, common", "Lasi, tavallinen"), "2.4–2.8·10³"], [T("Ice (H₂O)", "Jää (H₂O)"), "0.917·10³"],
            [T("Bone", "Luu"), "1.7–2.0·10³"], [T("Water (4 °C)", "Vesi (4 °C)"), "1.00·10³"], [T("Blood, plasma", "Veri, plasma"), "1.03·10³"],
            [T("Blood, whole", "Kokoveri"), "1.05·10³"], [T("Sea water", "Merivesi"), "1.025·10³"], [T("Mercury", "Elohopea"), "13.6·10³"],
            [T("Ethyl alcohol", "Etanoli"), "0.79·10³"], [T("Gasoline", "Bensiini"), "0.68·10³"], [T("Air", "Ilma"), "1.29"], [T("Helium", "Helium"), "0.179"],
            [T("Carbon dioxide", "Hiilidioksidi"), "1.98"], [T("Steam (100 °C)", "Vesihöyry (100 °C)"), "0.598"]
          ] },
        { id: "t1-q-fl1-blk", type: "question", q: "t1-q1" },
        { id: "t1-q-fl2-blk", type: "question", q: "t1-q2" }
      ] },
      // ---------------------------------------------------------------- 2
      { id: "t1-pressure", title: T("Pressure and its units", "Paine ja sen yksiköt"), blocks: [
        { id: "t1-pr-t1", type: "text", html: T(
          "<p><b><dfn data-term='pressure'>Pressure</dfn></b> is the normal (perpendicular) force <f>F_n</f> acting on an area <f>A</f>. Only the component of the force perpendicular to the surface counts. The unit is the pascal, 1 Pa = 1 N/m².</p>",
          "<p><b><dfn data-term='pressure'>Paine</dfn></b> on pinta-alaan <f>A</f> kohdistuva pintaa vastaan kohtisuora voima <f>F_n</f>. Vain voiman pintaa vastaan kohtisuora komponentti lasketaan. Yksikkö on pascal, 1 Pa = 1 N/m².</p>") },
        { id: "t1-pr-f1", type: "formula", tex: "p = {F_n}/{A},   [p] = {N}/{m^2} = Pa", key: true, label: T("Pressure", "Paine"),
          legend: [["p", T("pressure", "paine"), "Pa"], ["F_n", T("normal force", "kohtisuora voima"), "N"], ["A", T("area", "pinta-ala"), "m²"]] },
        { id: "t1-pr-ex1", type: "example", title: T("Car on its tyres", "Auto renkaidensa varassa"),
          problem: T("The total contact area of the four tyres of a car is about 4.5 dm². What pressure does the car (m = 1250 kg) exert on the ground?", "Auton neljän renkaan kokonaiskosketuspinta-ala on noin 4,5 dm². Kuinka suuren paineen auto (m = 1250 kg) kohdistaa maahan?"),
          given: ["m = 1250 kg", "A = 4.5 dm² = 4.5·10⁻² m²"],
          steps: [
            { tex: "p = {F_n}/{A} = {m g}/{A}" },
            { tex: "p = {1250·9.81}/{4.5·10^{-2}} = 272 500 Pa" },
            T("That is about 0.27 MPa (almost 2.7 bar).", "Se on noin 0,27 MPa (lähes 2,7 bar).")],
          result: T("p ≈ 0.27 MPa", "p ≈ 0,27 MPa") },
        { id: "t1-q-pr1-blk", type: "question", q: "t1-q3" },
        { id: "t1-pr-h1", type: "h", text: T("Units of pressure", "Paineyksiköt") },
        { id: "t1-pr-t2", type: "text", html: T(
          "<p>For historical reasons and because of different measuring techniques there are many pressure units, and many are not SI units but are still in use:</p>",
          "<p>Historiallisista syistä ja erilaisten mittaustekniikoiden vuoksi paineelle on paljon yksiköitä, ja monet niistä eivät kuulu SI-järjestelmään mutta ovat yhä käytössä:</p>") },
        { id: "t1-pr-l1", type: "list", items: [
          T("<b>bar</b>: atmospheric and liquid pressure, 1 bar = 10⁵ Pa", "<b>bar</b>: ilmanpaine ja nestepaine, 1 bar = 10⁵ Pa"),
          T("<b>mmHg or torr</b>: laboratory systems, 1 mmHg = 1 torr ≈ 133.3 Pa", "<b>mmHg eli torr</b>: laboratoriomittaukset, 1 mmHg = 1 torr ≈ 133,3 Pa"),
          T("<b>mmH₂O</b>: easy way to measure small pressures, 1 mmH₂O ≈ 9.81 Pa", "<b>mmH₂O</b>: helppo tapa mitata pieniä paineita, 1 mmH₂O ≈ 9,81 Pa"),
          T("<b>psi</b> (pound per square inch), mostly American: 1 psi ≈ 6.90 kPa", "<b>psi</b> (pound per square inch), pääosin amerikkalainen: 1 psi ≈ 6,90 kPa"),
          T("<b>kp/cm²</b> (weight of 1 kg on 1 cm²): an old Finnish unit", "<b>kp/cm²</b> (1 kg:n paino 1 cm²:llä): vanha suomalainen yksikkö")] },
        { id: "t1-pr-f2", type: "formula", tex: "100 kPa = 1 bar ≈ 1 kp/cm^2 ≈ 14.5 psi,   1 atm = 101.325 kPa = 760 mmHg", key: true, label: T("Rule of thumb", "Muistisääntö") },
        { id: "t1-pr-tab", type: "table",
          caption: T("Conversion factors (Table 13-2 of the slides, slightly rounded).", "Muuntokertoimia (diojen taulukko 13-2, hieman pyöristetty)."),
          head: [T("In terms of 1 Pa = 1 N/m²", "Pascaleina"), T("1 atm in other units", "1 atm muissa yksiköissä")],
          rows: [
            ["1 atm = 1.013·10⁵ Pa = 101.3 kPa", "1 atm = 1.013·10⁵ N/m²"],
            ["1 bar = 1.000·10⁵ N/m²", "1 atm = 1.013 bar"],
            ["1 dyn/cm² = 0.1 N/m²", "1 atm = 1.013·10⁶ dyn/cm²"],
            ["1 lb/in² = 6.90·10³ N/m²", "1 atm = 14.7 lb/in²"],
            ["1 lb/ft² = 47.9 N/m²", "1 atm = 2.12·10³ lb/ft²"],
            ["1 cmHg = 1.33·10³ N/m²", "1 atm = 76.0 cmHg"],
            ["1 mmHg = 1 torr = 133 N/m²", "1 atm = 760 mmHg"],
            ["1 mmH₂O (4 °C) = 9.80 N/m²", "1 atm = 1.03·10⁴ mmH₂O"]] },
        { id: "t1-pr-w1", type: "interactive", widget: "readout",
          title: T("Pressure unit converter", "Paine\u00ADyksikkö\u00ADmuunnin"),
          caption: T("Slide the absolute pressure and read it in every unit. At 101.325 kPa you get exactly 1 atm and 760 mmHg.", "Säädä absoluuttista painetta ja lue se kaikissa yksiköissä. Arvolla 101,325 kPa saat tasan 1 atm ja 760 mmHg."),
          config: { params: [{ id: "p", tex: "p", min: 1, max: 250, step: 0.5, value: 101.325, unit: "kPa" }],
            outputs: function (v) {
              var U = TDC.util, p = v.p * 1000;
              return [{ label: T("bar", "bar"), value: U.fmtNum(p / 1e5, 4) + " bar" },
                      { label: T("atm", "atm"), value: U.fmtNum(p / 101325, 4) + " atm" },
                      { label: T("psi", "psi"), value: U.fmtNum(p / 6894.76, 4) + " psi" },
                      { label: T("mmHg (torr)", "mmHg (torr)"), value: U.fmtNum(p / 133.322, 4) + " mmHg" },
                      { label: T("mmH₂O", "mmH₂O"), value: U.fmtNum(p / 9.80665, 4) + " mmH₂O" }];
            } } },
        { id: "t1-q-pr2-blk", type: "question", q: "t1-q4" },
        { id: "t1-q-pr3-blk", type: "question", q: "t1-q5" }
      ] },
      // ---------------------------------------------------------------- 3
      { id: "t1-gauges", title: T("Absolute and gauge pressure, gauges and sensors", "Absoluuttinen paine ja ylipaine, mittarit ja anturit"), blocks: [
        { id: "t1-ga-t1", type: "text", html: T(
          "<p>There are many ways to measure pressure, but two main principles: measuring the <b><dfn data-term='abspressure'>absolute pressure</dfn></b> (from zero) and measuring a <b>pressure difference</b>, usually the <b><dfn data-term='gaugepressure'>gauge pressure</dfn></b> compared with the atmosphere. Industrial <em>differential</em> gauges measure the difference between two vessels.</p>",
          "<p>Painetta voi mitata monella tavalla, mutta periaatteita on kaksi: <b><dfn data-term='abspressure'>absoluuttisen paineen</dfn></b> mittaus (nollasta) ja <b>paine-eron</b> mittaus, yleensä <b><dfn data-term='gaugepressure'>ylipaineen</dfn></b> eli ilmanpaineeseen verrattavan paineen mittaus. Teollisuuden <em>differentiaalimittarit</em> mittaavat kahden säiliön välisen paine-eron.</p>") },
        { id: "t1-ga-f1", type: "formula", tex: "p_e = p − p_0", key: true, label: T("Gauge pressure", "Ylipaine"),
          legend: [["p_e", T("gauge pressure", "ylipaine"), "Pa"], ["p", T("absolute pressure", "absoluuttinen paine"), "Pa"], ["p_0", T("atmospheric pressure (≈ 101.3 kPa)", "ilmanpaine (≈ 101,3 kPa)"), "Pa"]] },
        { id: "t1-ga-fig", type: "figure",
          svg: T(GAUGE_SVG, GAUGE_SVG),
          alt: T("Pressure axis in MPa with three points: gauge 0.15 MPa, gauge 0, gauge minus 0.1 MPa", "Paineakseli MPa:na ja kolme pistettä: ylipaine 0,15 MPa, ylipaine 0, ylipaine −0,1 MPa"),
          caption: T("The same gauge pressure scale: p_0 = 0.1 MPa is the reference. Vacuum (p = 0) is p_e = −0.1 MPa.", "Sama ylipainiasteikko: vertailuna on p_0 = 0,1 MPa. Tyhjiö (p = 0) on p_e = −0,1 MPa.") },
        { id: "t1-ga-h1", type: "h", text: T("Absolute pressure: the barometer", "Absoluuttinen paine: ilmapuntari") },
        { id: "t1-ga-t2", type: "text", html: T(
          "<p>A <b>closed-end manometer</b> has a vacuum (<f>p_1 = 0</f>) above the liquid, so <f>p_2 = p_1 + ρgh = ρgh</f> is an absolute pressure. Measuring the atmosphere this way gives a <dfn data-term='barometer'>barometer</dfn>. <b>Torricelli's mercury barometer</b> shows the standard atmospheric pressure as a 760 mm mercury column: <f>p_0 = 101.325 kPa</f>. An <em>aneroid</em> barometer uses a flexible evacuated chamber moving a pointer, and a <b>semiconductor sensor</b> measures absolute pressure electrically.</p>",
          "<p><b>Umpipäisessä manometrissä</b> nesteen yläpuolella on tyhjiö (<f>p_1 = 0</f>), joten <f>p_2 = p_1 + ρgh = ρgh</f> on absoluuttinen paine. Kun tällä mitataan ilmanpainetta, saadaan <dfn data-term='barometer'>ilmapuntari</dfn>. <b>Torricellin elohopeailmapuntari</b> näyttää normaali-ilmanpaineen 760 mm:n elohopeapatsaana: <f>p_0 = 101,325 kPa</f>. <em>Aneroidi-ilmapuntarissa</em> tyhjiökammio liikuttaa osoitinta, ja <b>puolijohdeanturi</b> mittaa absoluuttista painetta sähköisesti.</p>") },
        { id: "t1-ga-f2", type: "formula", tex: "p_2 = p_1 + ρgh = ρgh,   p_0 = 101.325 kPa = 760 mmHg", key: true, label: T("Closed-end manometer (barometer)", "Umpipäinen manometri (ilmapuntari)") },
        { id: "t1-ga-h2", type: "h", text: T("Gauge pressure: the open-tube manometer", "Ylipaine: avoin U-putkimanometri") },
        { id: "t1-ga-t3", type: "text", html: T(
          "<p>An <b>open-tube manometer</b> compares the pressure <f>p_2</f> of a vessel with the surrounding air <f>p_0</f> (≈ 100 kPa). The liquid column difference gives <f>p_e = p_2 − p_0 = ρgh</f>. It is used, for example, to measure car tyre pressure. A heavy liquid such as mercury (13 600 kg/m³) gives a short column; water (1000 kg/m³) a column 13.6 times taller.</p>",
          "<p><b>Avoin U-putkimanometri</b> vertaa säiliön painetta <f>p_2</f> ympäröivään ilmaan <f>p_0</f> (≈ 100 kPa). Nestepatsaiden korkeusero antaa <f>p_e = p_2 − p_0 = ρgh</f>. Sillä mitataan esimerkiksi auton rengaspainetta. Raskas neste kuten elohopea (13 600 kg/m³) antaa lyhyen patsaan; vesi (1000 kg/m³) 13,6 kertaa korkeamman.</p>") },
        { id: "t1-ga-f3", type: "formula", tex: "p_e = p_2 − p_0 = ρgh,   h = {p_e}/{ρg}", key: true, label: T("Open-tube manometer", "Avoin U-putkimanometri") },
        { id: "t1-ga-w1", type: "interactive", widget: "tank",
          title: T("U-tube manometer", "U-putkimanometri"),
          caption: T("Change the gauge pressure p_e (also negative = vacuum) and the liquid: Δh = p_e/(ρg). Mercury needs a column 13.6 times shorter than water.", "Muuta ylipainetta p_e (myös negatiivinen = alipaine) ja nestettä: Δh = p_e/(ρg). Elohopea tarvitsee 13,6 kertaa lyhyemmän patsaan kuin vesi."),
          config: { mode: "manometer" } },
        { id: "t1-q-ga1-blk", type: "question", q: "t1-q6" },
        { id: "t1-q-ga2-blk", type: "question", q: "t1-q7" },
        { id: "t1-ga-h3", type: "h", text: T("Gauges and sensors in practice", "Mittarit ja anturit käytännössä") },
        { id: "t1-ga-t4", type: "text", html: T(
          "<p>A <dfn data-term='bourdon'>Bourdon-tube</dfn> gauge (typical for steam, compressed gas and hydraulics) contains a curved, flattened tube. Overpressure straightens it a little and a linkage turns the pointer, so it reads the <em>gauge</em> pressure. A typical industrial <dfn data-term='transmitter'>pressure transmitter</dfn> (e.g. 1–24 bar) uses a semiconductor or strain-gauge element and outputs a standard signal such as 4–20 mA. Many instruments can be calibrated for absolute pressure instead.</p>",
          "<p><dfn data-term='bourdon'>Bourdon-putkimittari</dfn> (tyypillinen höyryn, paineilman ja hydrauliikan mittari) sisältää kaarevan litteän putken. Ylipaine suoristaa sitä hieman ja vipumekanismi kääntää osoitinta, joten se näyttää <em>ylipaineen</em>. Tyypillinen teollinen <dfn data-term='transmitter'>painelähetin</dfn> (esim. 1–24 bar) käyttää puolijohde- tai venymäliuskaelementtiä ja antaa standardiviestin, kuten 4–20 mA. Monet laitteet voidaan kalibroida myös absoluuttiselle paineelle.</p>") },
        { id: "t1-ga-w2", type: "interactive", widget: "custom",
          title: T("Bourdon gauge", "Bourdon-mittari"),
          caption: T("The slider sets the absolute pressure. The dial shows gauge pressure: 0 at atmospheric pressure, negative (vacuum) below it.", "Liukusäädin asettaa absoluuttisen paineen. Mittari näyttää ylipaineen: nolla ilmanpaineessa ja negatiivinen (alipaine) sen alapuolella."),
          config: { mount: bourdonMount } },
        { id: "t1-q-ga3-blk", type: "question", q: "t1-q8" }
      ] },
      // ---------------------------------------------------------------- 4
      { id: "t1-hydro", title: T("Hydrostatic pressure", "Hydrostaattinen paine"), blocks: [
        { id: "t1-hy-t1", type: "text", html: T(
          "<p><b><dfn data-term='hydrostatic'>Hydrostatic pressure</dfn></b> is caused by the weight of a liquid or gas above. Liquids are almost <dfn data-term='incompressible'>incompressible</dfn>: their density stays nearly constant, so pressure grows linearly with depth <f>h</f>. At depth <f>h</f> the absolute pressure and the hydrostatic (gauge) pressure are:</p>",
          "<p><b><dfn data-term='hydrostatic'>Hydrostaattinen paine</dfn></b> johtuu yläpuolella olevan nesteen tai kaasun painosta. Nesteet ovat lähes <dfn data-term='incompressible'>kokoonpuristumattomia</dfn>: tiheys pysyy lähes vakiona, joten paine kasvaa lineaarisesti syvyyden <f>h</f> mukana. Syvyydellä <f>h</f> absoluuttinen paine ja hydrostaattinen paine (ylipaine) ovat:</p>") },
        { id: "t1-hy-f1", type: "formula", tex: "p = p_0 + ρgh;  p_e = p − p_0 = ρgh", key: true, label: T("Pressure at depth h", "Paine syvyydellä h"),
          legend: [["p_0", T("pressure at the surface", "paine pinnalla"), "Pa"], ["ρ", T("density of the liquid", "nesteen tiheys"), "kg/m³"], ["g", T("gravity 9.81", "putoamiskiihtyvyys 9,81"), "m/s²"], ["h", T("depth", "syvyys"), "m"]] },
        { id: "t1-hy-ex1", type: "example", title: T("Submarine at 200 m", "Sukellusvene 200 m:n syvyydessä"),
          problem: T("What is the hydrostatic pressure caused by water at depth h = 200 m?", "Kuinka suuri on veden aiheuttama hydrostaattinen paine syvyydellä h = 200 m?"),
          given: ["ρ = 1000 kg/m³", "h = 200 m", "g = 9.81 m/s²"],
          steps: [
            { tex: "p_e = ρgh = 1000·9.81·200 = 1 962 000 Pa" },
            T("The absolute pressure adds the air above the surface: p = 101 325 + 1 962 000 ≈ 2.06 MPa.", "Absoluuttinen paine sisältää pinnalla olevan ilmanpaineen: p = 101 325 + 1 962 000 ≈ 2,06 MPa.")],
          result: T("p_e ≈ 1.96 MPa (≈ 19.6 bar)", "p_e ≈ 1,96 MPa (≈ 19,6 bar)") },
        { id: "t1-hy-call", type: "callout", kind: "key", html: T("<p><b>Rule of thumb:</b> in water the pressure grows about <b>1 bar for every 10 m</b>. At 100 m depth the hydrostatic pressure is about 10 bar.</p>", "<p><b>Nyrkkisääntö:</b> vedessä paine kasvaa noin <b>1 bar jokaista 10 m kohti</b>. 100 m:n syvyydessä hydrostaattinen paine on noin 10 bar.</p>") },
        { id: "t1-hy-w1", type: "interactive", widget: "submarine",
          title: T("Submarine: pressure on the hull", "Sukellusvene: runkoon kohdistuva paine"),
          caption: T("Drag the hull deeper (or use the slider). The pressure grows linearly with depth, and the force on a 1 m² hatch is F = p_e·A.", "Vedä runko syvemmälle (tai käytä liukusäädintä). Paine kasvaa lineaarisesti syvyyden mukana, ja voima 1 m²:n luukkuun on F = p_e·A."),
          config: { mode: "depth" } },
        { id: "t1-q-hy1-blk", type: "question", q: "t1-q9" },
        { id: "t1-q-hy2-blk", type: "question", q: "t1-q10" },
        { id: "t1-hy-h1", type: "h", text: T("Device: hydrostatic level sensor (4–20 mA)", "Laite: hydrostaattinen pinta-anturi (4–20 mA)") },
        { id: "t1-hy-t2", type: "text", html: T(
          "<p>A <dfn data-term='transmitter'>pressure transmitter</dfn> at the bottom of a tank measures <f>p_e = ρgh</f>, which is proportional to the liquid level <f>h</f>. Automation systems use a standard current signal: 4 mA = bottom of the range, 20 mA = top of the range, linear in between. A \"live zero\" of 4 mA also tells the controller that the wire is not broken.</p>",
          "<p>Säiliön pohjalla oleva <dfn data-term='transmitter'>painelähetin</dfn> mittaa ylipaineen <f>p_e = ρgh</f>, joka on verrannollinen nesteen pinnankorkeuteen <f>h</f>. Automaatiojärjestelmät käyttävät standardivirtaviestiä: 4 mA = mittausalueen alku, 20 mA = alueen loppu, välillä lineaarisesti. Nollapisteen \"elävä nolla\" 4 mA kertoo säätimelle myös, ettei johto ole poikki.</p>") },
        { id: "t1-hy-f2", type: "formula", tex: "I = 4 mA + 16 mA·{ρgh}/{p_{range}}", key: true, label: T("Transmitter current", "Lähettimen virta") },
        { id: "t1-hy-w2", type: "interactive", widget: "tank",
          title: T("Tank level transmitter", "Säiliön pinnan\u00ADkorkeus\u00ADlähetin"),
          caption: T("Change the liquid level and density. The transmitter (range 0–50 kPa) sends 4–20 mA. A denser liquid at the same level gives a higher current.", "Muuta nestepinnan korkeutta ja tiheyttä. Lähetin (alue 0–50 kPa) lähettää 4–20 mA. Tiheämpi neste samalla korkeudella antaa suuremman virran."),
          config: { mode: "level" } },
        { id: "t1-hy-ex2", type: "example", title: T("Water tank transmitter", "Vesisäiliön lähetin"),
          problem: T("A transmitter at the bottom of a water tank has the range 0–50 kPa (4–20 mA). The water level is 3.0 m. What current does it send?", "Vesisäiliön pohjalla olevan lähettimen alue on 0–50 kPa (4–20 mA). Vedenpinta on 3,0 m. Kuinka suuri virta lähtee?"),
          given: ["ρ = 1000 kg/m³", "h = 3.0 m", "p_range = 50 kPa"],
          steps: [
            { tex: "p_e = ρgh = 1000·9.81·3.0 = 29 430 Pa" },
            { tex: "I = 4 + 16·{29 430}/{50 000} = 13.4 mA" }],
          result: T("I ≈ 13.4 mA", "I ≈ 13,4 mA") },
        { id: "t1-q-hy3-blk", type: "question", q: "t1-q11" },
        { id: "t1-q-hy4-blk", type: "question", q: "t1-q12" }
      ] },
      // ---------------------------------------------------------------- 5
      { id: "t1-atm", title: T("Atmospheric pressure", "Ilmanpaine"), blocks: [
        { id: "t1-at-t1", type: "text", html: T(
          "<p>Gases are easily compressed (pneumatics), so the density of the atmosphere drops with height and the hydrostatic formula <f>ρgh</f> cannot be used directly. The <dfn data-term='atmpressure'>atmospheric pressure</dfn> decreases <b>exponentially</b> with height <f>h</f>:</p>",
          "<p>Kaasut puristuvat helposti (pneumatiikka), joten ilmakehän tiheys pienenee korkeuden mukana eikä hydrostaattista kaavaa <f>ρgh</f> voi käyttää suoraan. <dfn data-term='atmpressure'>Ilmanpaine</dfn> pienenee <b>eksponentiaalisesti</b> korkeuden <f>h</f> kasvaessa:</p>") },
        { id: "t1-at-f1", type: "formula", tex: "p(h) = p_0·e^{-{ρ_0 g h}/{p_0}}", key: true, label: T("Atmospheric pressure at height h", "Ilmanpaine korkeudella h"),
          legend: [["p_0", T("sea-level pressure 101.325 kPa", "paine merenpinnalla 101,325 kPa"), "Pa"], ["ρ_0", T("air density at the surface 1.29", "ilman tiheys pinnalla 1,29"), "kg/m³"], ["h", T("height", "korkeus"), "m"]] },
        { id: "t1-at-ex1", type: "example", title: T("Pressure at 5 km", "Paine 5 km:n korkeudessa"),
          problem: T("What is the atmospheric pressure at h = 5.0 km?", "Kuinka suuri on ilmanpaine korkeudella h = 5,0 km?"),
          given: ["p_0 = 101.325 kPa", "ρ_0 = 1.29 kg/m³", "h = 5000 m"],
          steps: [
            { tex: "{ρ_0 g h}/{p_0} = {1.29·9.81·5000}/{101 325} = 0.624" },
            { tex: "p = 101.3 kPa·e^{-0.624} = 101.3·0.5355 ≈ 54 kPa" }],
          result: T("p ≈ 54 kPa (about half of the sea-level pressure)", "p ≈ 54 kPa (noin puolet merenpinnan paineesta)") },
        { id: "t1-at-t2", type: "text", html: T(
          "<p>The pressure falls to about half at 5 km. At 10 km it is only about a third of the ground value, and above 50 km it is under 1 kPa. (The simple formula assumes constant temperature, so it is approximate.)</p>",
          "<p>Paine putoaa noin puoleen 5 km:n korkeudessa. 10 km:n korkeudessa se on vain noin kolmannes maanpinnan arvosta, ja yli 50 km:n korkeudessa alle 1 kPa. (Yksinkertainen kaava olettaa lämpötilan vakioksi, joten se on likimääräinen.)</p>") },
        { id: "t1-at-w1", type: "interactive", widget: "readout",
          title: T("Barometer and altitude", "Ilmapuntari ja korkeus"),
          caption: T("Raise the height and watch the pressure fall exponentially. A mercury barometer would show the column in the last line (760 mm at sea level).", "Nosta korkeutta ja katso, miten paine laskee eksponentiaalisesti. Elohopeailmapuntari näyttäisi patsaan viimeisellä rivillä (760 mm merenpinnalla)."),
          config: { params: [{ id: "h", tex: "h", min: 0, max: 20, step: 0.1, value: 0, unit: "km" }],
            outputs: function (v) {
              var U = TDC.util, p = TDC.thermo.atmosphere(v.h * 1000);
              return [{ tex: "p(h)", value: U.fmtNum(p / 1000, 4) + " kPa" },
                      { tex: "p/p_0", value: U.fmtNum(100 * p / P0, 3) + " %" },
                      { label: T("Mercury column", "Elohopeapatsas"), value: U.fmtNum(p / (13600 * 9.81) * 1000, 4) + " mm" }];
            } } },
        { id: "t1-q-at1-blk", type: "question", q: "t1-q13" }
      ] },
      // ---------------------------------------------------------------- 6
      { id: "t1-buoy", title: T("Buoyancy and Archimedes' principle", "Noste ja Arkhimedeen laki"), blocks: [
        { id: "t1-bu-t1", type: "text", html: T(
          "<p>An object submerged in a fluid seems to weigh less than outside it. The reason is that pressure increases with depth: the bottom of the object (depth <f>h_2</f>) is pushed up harder than the top (depth <f>h_1</f>) is pushed down. With the fluid density <f>ρ_n</f> and the top/bottom area <f>A</f>:</p>",
          "<p>Fluidiin upotettu kappale näyttää painavan vähemmän kuin sen ulkopuolella. Syynä on paineen kasvu syvyyden mukana: kappaleen pohjaa (syvyys <f>h_2</f>) työnnetään ylöspäin kovemmin kuin yläpintaa (syvyys <f>h_1</f>) alaspäin. Kun fluidin tiheys on <f>ρ_n</f> ja ylä- ja alapinnan ala <f>A</f>:</p>") },
        { id: "t1-bu-f1", type: "formula", tex: "p_1 = p_0 + ρ_n g h_1;  p_2 = p_0 + ρ_n g h_2;  F_1 = p_1 A;  F_2 = p_2 A", label: T("Pressures and forces on top and bottom", "Paineet ja voimat ylä- ja alapinnalla") },
        { id: "t1-bu-f2", type: "formula", tex: "F_n = F_2 − F_1 = ρ_n g (h_2 − h_1) A = ρ_n g V", key: true, label: T("Buoyant force", "Noste"),
          legend: [["F_n", T("buoyant force", "noste"), "N"], ["ρ_n", T("density of the fluid", "fluidin tiheys"), "kg/m³"], ["V", T("volume of the body under the surface", "kappaleen tilavuus pinnan alla"), "m³"]] },
        { id: "t1-bu-t2", type: "text", html: T(
          "<p><b><dfn data-term='archimedes'>Archimedes' principle</dfn>:</b> the <dfn data-term='buoyancy'>buoyant force</dfn> on an object immersed in a fluid equals the <em>weight of the fluid displaced</em> by the object. Notice that it depends on the fluid density and the submerged volume, not on the density of the object.</p><p>A body is in <b>equilibrium</b> when the buoyant force balances its weight. For a floating object the displaced volume is only the submerged part <f>V_u</f>:</p>",
          "<p><b><dfn data-term='archimedes'>Arkhimedeen laki</dfn>:</b> fluidiin upotettuun kappaleeseen kohdistuva <dfn data-term='buoyancy'>noste</dfn> on yhtä suuri kuin kappaleen <em>syrjäyttämän fluidin paino</em>. Huomaa, että noste riippuu fluidin tiheydestä ja upotetusta tilavuudesta, ei kappaleen tiheydestä.</p><p>Kappale on <b>tasapainossa</b>, kun noste kumoaa sen painon. Kelluvalla kappaleella syrjäytetty tilavuus on vain upotettu osa <f>V_u</f>:</p>") },
        { id: "t1-bu-f3", type: "formula", tex: "m g = ρ_n g V_u", key: true, label: T("Floating (equilibrium) condition", "Kelluvan kappaleen tasapainoehto"),
          legend: [["m", T("total mass of the object", "kappaleen kokonaismassa"), "kg"], ["V_u", T("volume under the fluid", "nesteen alla oleva tilavuus"), "m³"]] },
        // (extra)
        { id: "t1-bu-ex1", type: "example", title: T("Ice floating in the sea (extra)", "Merellä kelluva jää (lisä)"),
          problem: T("What fraction of an ice block (917 kg/m³) is under the surface of sea water (1025 kg/m³)?", "Kuinka suuri osa jäälohkareesta (917 kg/m³) on merivedessä pinnan alla (1025 kg/m³)?"),
          given: ["ρ_ice = 917 kg/m³", "ρ_n = 1025 kg/m³"],
          steps: [
            { tex: "ρ_{ice} V g = ρ_n V_u g" },
            { tex: "{V_u}/{V} = {ρ_{ice}}/{ρ_n} = {917}/{1025} = 0.895" }],
          result: T("About 89.5 % is under water.", "Noin 89,5 % on veden alla.") },
        { id: "t1-q-bu1-blk", type: "question", q: "t1-q14" },
        { id: "t1-bu-h1", type: "h", text: T("Device: the submarine and its ballast tanks", "Laite: sukellusvene ja painolastisäiliöt") },
        { id: "t1-bu-t3", type: "text", html: T(
          "<p>A submarine keeps its hull volume constant, so the buoyant force <f>ρgV</f> is nearly constant too. It changes its <em>weight</em> by flooding ballast tanks with water (heavier: sinks) or blowing the water out with compressed air (lighter: rises). When the weight equals the buoyant force it hovers (neutral buoyancy).</p>",
          "<p>Sukellusveneen rungon tilavuus on vakio, joten noste <f>ρgV</f> on lähes vakio. Se muuttaa <em>painoaan</em> täyttämällä painolastisäiliöt vedellä (painavampi: uppoaa) tai puhaltamalla veden ulos paineilmalla (kevyempi: nousee). Kun paino on yhtä suuri kuin noste, alus leijuu (neutraali noste).</p>") },
        { id: "t1-bu-w1", type: "interactive", widget: "submarine",
          title: T("Submarine: sink, hover, surface", "Sukellusvene: uppoa, leiju, nouse"),
          caption: T("Slider f fills the ballast tanks (50 % = neutral). Compare F_b and G: net force down = sink, up = rise. Drag the hull deeper and see how the hull pressure grows at the same time.", "Liukusäädin f täyttää painolastisäiliöt (50 % = neutraali). Vertaa F_b:tä ja G:tä: nettovoima alas = uppoaa, ylös = nousee. Vedä runko syvemmälle ja katso, miten rungon paine samalla kasvaa."),
          config: { mode: "both" } },
        { id: "t1-q-bu2-blk", type: "question", q: "t1-q15" },
        { id: "t1-q-bu3-blk", type: "question", q: "t1-q16" }
      ] },
      // ---------------------------------------------------------------- 7
      { id: "t1-pascal", title: T("Pascal's law: hydraulic lift and brakes", "Pascalin laki: hydraulinen nostin ja jarrut"), blocks: [
        { id: "t1-pa-t1", type: "text", html: T(
          "<p><b><dfn data-term='pascal'>Pascal's law</dfn>:</b> if an external pressure is applied to a confined fluid, the pressure has the same magnitude at every point of the fluid. In a hydraulic system the input piston (area <f>A_1</f>) and the output piston (area <f>A_2</f>) therefore see the same pressure:</p>",
          "<p><b><dfn data-term='pascal'>Pascalin laki</dfn>:</b> jos suljettuun nesteeseen kohdistetaan ulkoinen paine, paine on yhtä suuri nesteen jokaisessa pisteessä. Hydraulijärjestelmässä syöttömännän (ala <f>A_1</f>) ja ulostulomännän (ala <f>A_2</f>) kohdalla paine on siksi sama:</p>") },
        { id: "t1-pa-f1", type: "formula", tex: "p_1 = p_2,   {F_1}/{A_1} = {F_2}/{A_2}", key: true, label: T("Hydraulic lift", "Hydraulinen nostin"),
          legend: [["F_1", T("force on the input piston", "voima syöttömännällä"), "N"], ["F_2", T("force of the output piston", "ulostulomännän voima"), "N"], ["A_1, A_2", T("piston areas", "mäntien alat"), "m²"]] },
        { id: "t1-pa-f2", type: "formula", tex: "W_1 = F_1 s_1 = p A_1 s_1 = p V_1 = F_2 s_2 = W_2,   W = pΔV", key: true, label: T("Work of the pistons", "Mäntien tekemä työ") },
        { id: "t1-pa-t2", type: "text", html: T(
          "<p>A small force on a small piston gives a large force on a large piston, but the large piston moves proportionally less: <f>s_2 = s_1 A_1/A_2</f>. Work is not multiplied: the input work equals the output work (ideal, no friction).</p>",
          "<p>Pieni voima pienellä männällä antaa suuren voiman suurella männällä, mutta suuri mäntä liikkuu vastaavasti vähemmän: <f>s_2 = s_1 A_1/A_2</f>. Työ ei kasvaa: syöttötyö on yhtä suuri kuin ulostulotyö (ihannetapaus, ei kitkaa).</p>") },
        { id: "t1-pa-w1", type: "interactive", widget: "tank",
          title: T("Hydraulic lift", "Hydraulinen nostin"),
          caption: T("Change F_1 and the piston diameters. The pressure is the same everywhere; F_2 = F_1·A_2/A_1, the output piston moves s_2 = s_1·A_1/A_2, and the work W stays equal.", "Muuta F_1:tä ja mäntien halkaisijoita. Paine on kaikkialla sama; F_2 = F_1·A_2/A_1, ulostulomäntä liikkuu s_2 = s_1·A_1/A_2 ja työ W pysyy samana."),
          config: { mode: "press" } },
        // (extra: numbers follow the widget defaults)
        { id: "t1-pa-ex1", type: "example", title: T("Lifting a car", "Auton nosto"),
          problem: T("A hydraulic lift has an input piston of diameter 20 mm and an output piston of diameter 200 mm. The input force is 200 N and the stroke 0.10 m. Find the output force, the heaviest load and the output stroke.", "Hydraulisen nostimen syöttömännän halkaisija on 20 mm ja ulostulomännän 200 mm. Syöttövoima on 200 N ja isku 0,10 m. Laske ulostulovoima, raskain nostettava kuorma ja ulostuloiskun pituus."),
          given: ["d_1 = 20 mm", "d_2 = 200 mm", "F_1 = 200 N", "s_1 = 0.10 m"],
          steps: [
            { tex: "{A_2}/{A_1} = ({d_2}/{d_1})^2 = 10^2 = 100" },
            { tex: "p = {F_1}/{A_1} = {200}/{π·0.010^2} ≈ 637 kPa" },
            { tex: "F_2 = F_1·{A_2}/{A_1} = 200·100 = 20 000 N,   m = {F_2}/g ≈ 2040 kg" },
            { tex: "s_2 = s_1·{A_1}/{A_2} = 0.10/100 = 1.0 mm,   W = F_1 s_1 = F_2 s_2 = 20 J" }],
          result: T("F₂ = 20 kN (a load of about 2.0 t), s₂ = 1 mm, W = 20 J on both sides", "F₂ = 20 kN (noin 2,0 t:n kuorma), s₂ = 1 mm, W = 20 J molemmilla puolilla") },
        { id: "t1-q-pa1-blk", type: "question", q: "t1-q17" },
        { id: "t1-q-pa2-blk", type: "question", q: "t1-q18" },
        { id: "t1-pa-h1", type: "h", text: T("Device: hydraulic brakes", "Laite: hydrauliset jarrut") },
        { id: "t1-pa-t3", type: "text", html: T(
          "<p>The hydraulic brakes of a car have a <b>master cylinder</b> (moved by the pedal) and <b>brake cylinders</b> at the wheels, connected by hose pipes. Pascal's law gives the same pressure in every brake cylinder when the pedal is pressed, and the larger brake-cylinder pistons multiply the force on the brake pads that squeeze the disc.</p><p><b>Why do the brakes not work if there is air in the pipes?</b> Air is easily compressed, liquid is not. The pedal movement compresses the air bubble instead of pushing the pistons, so the pressure stays low. That is why brakes are \"bled\".</p>",
          "<p>Auton hydrauliset jarrut koostuvat <b>pääsylinteristä</b> (poljin liikuttaa sitä) ja pyörien <b>jarrusylintereistä</b>, jotka on yhdistetty letkuilla. Pascalin lain mukaan paine on jokaisessa jarrusylinterissä sama, kun poljinta painetaan, ja suuremmat jarrusylinterin männät vahvistavat voimaa jarrupaloihin, jotka puristavat levyä.</p><p><b>Miksi jarrut eivät toimi, jos putkissa on ilmaa?</b> Ilma puristuu helposti kokoon, neste ei. Polkimen liike puristaa ilmakuplaa eikä työnnä mäntiä, joten paine jää pieneksi. Siksi jarrut ilmataan.</p>") },
        // (extra)
        { id: "t1-pa-ex2", type: "example", title: T("Brake force multiplication (extra)", "Jarruvoiman vahvistus (lisä)"),
          problem: T("The master cylinder piston has a diameter of 20 mm and is pushed with 300 N. A brake-cylinder piston has a diameter of 40 mm. What force does it give on the pad (ideal)?", "Pääsylinterin männän halkaisija on 20 mm ja sitä työnnetään 300 N:n voimalla. Jarrusylinterin männän halkaisija on 40 mm. Kuinka suuren voiman se antaa jarrupalaan (ihannetapaus)?"),
          given: ["d_1 = 20 mm", "d_2 = 40 mm", "F_1 = 300 N"],
          steps: [
            { tex: "F_2 = F_1·({d_2}/{d_1})^2 = 300·2^2 = 1200 N" }],
          result: T("F₂ = 1200 N (the pedal travel is 4 times longer than the pad travel)", "F₂ = 1200 N (polkimen liike on 4 kertaa pitempi kuin palan liike)") },
        { id: "t1-pa-w2", type: "interactive", widget: "tank",
          title: T("Hydraulic brake: master and brake cylinder", "Hydraulinen jarru: pää- ja jarrusylinteri"),
          caption: T("Same device, brake numbers: pedal force F_1 on a small master piston, a large brake piston (d_1 = 20 mm, d_2 = 40 mm).", "Sama laite jarrun luvuilla: poljinvoima F_1 pienellä pääsylinterin männällä, suuri jarrumäntä (d_1 = 20 mm, d_2 = 40 mm)."),
          config: { mode: "press", values: { F1: 300, d1: 0.02, d2: 0.04, s1: 0.1 } } },
        { id: "t1-q-pa3-blk", type: "question", q: "t1-q19" },
        { id: "t1-q-pa4-blk", type: "question", q: "t1-q20" }
      ] }
    ],
    questions: [
      { id: "t1-q1", mode: "practice", type: "mc", difficulty: 1,
        prompt: T("Which phases together are called fluids?", "Mitkä olomuodot yhdessä ovat fluideja?"),
        options: [{ id: "a", html: T("solid and liquid", "kiinteä ja neste") }, { id: "b", html: T("liquid and gas", "neste ja kaasu") }, { id: "c", html: T("solid and gas", "kiinteä ja kaasu") }, { id: "d", html: T("only gases", "vain kaasut") }],
        hints: [T("What do liquids and gases have in common that solids lack?", "Mikä on nesteillä ja kaasuilla yhteistä, mitä kiinteillä aineilla ei ole?")] },
      { id: "t1-q2", mode: "practice", type: "numeric", difficulty: 1, tol: 0.02,
        prompt: T("A steel plate of mass 15.6 kg has a volume of 2.0 dm³. Find its density (in kg/m³).", "Teräslevyn massa on 15,6 kg ja tilavuus 2,0 dm³. Laske sen tiheys (yksikössä kg/m³)."),
        fields: [{ id: "rho", tex: "ρ", unit: "kg/m³" }],
        hints: [T("Convert the volume to m³ first: 1 dm³ = 10⁻³ m³.", "Muunna ensin tilavuus kuutiometreiksi: 1 dm³ = 10⁻³ m³."), T("ρ = m/V.", "ρ = m/V.")] },
      { id: "t1-q3", mode: "practice", type: "numeric", difficulty: 2, tol: 0.02,
        prompt: T("A person of mass 60 kg stands with all the weight on one stiletto heel of area 1.0 cm². Find the pressure under the heel (in Pa).", "Henkilön massa on 60 kg ja koko paino on yhden korkokengän korolla, jonka ala on 1,0 cm². Laske korkoon kohdistuva paine (yksikössä Pa)."),
        fields: [{ id: "p", tex: "p", unit: "Pa" }],
        hints: [T("The normal force is the weight mg.", "Kohtisuora voima on paino mg."), T("1 cm² = 10⁻⁴ m².", "1 cm² = 10⁻⁴ m².")] },
      { id: "t1-q4", mode: "practice", type: "order", difficulty: 1,
        prompt: T("Order these pressures from smallest to largest.", "Järjestä paineet pienimmästä suurimpaan."),
        items: [{ id: "bar", html: T("1 bar", "1 bar") }, { id: "mmhg", html: T("1 mmHg", "1 mmHg") }, { id: "psi", html: T("1 psi", "1 psi") }, { id: "mmh2o", html: T("1 mmH₂O", "1 mmH₂O") }],
        hints: [T("Convert each to pascals: the slides give 9.81 Pa, 133 Pa, 6.90 kPa and 100 kPa for the four units.", "Muunna kukin pascaleiksi: dioissa nämä ovat 9,81 Pa, 133 Pa, 6,90 kPa ja 100 kPa.")] },
      { id: "t1-q5", mode: "practice", type: "numeric", difficulty: 1, tol: 0.02,
        prompt: T("A tyre gauge shows 2.2 bar (gauge pressure). Find the absolute pressure inside the tyre in Pa, using p₀ = 101 325 Pa.", "Rengasmittari näyttää 2,2 bar (ylipaine). Laske renkaan sisällä oleva absoluuttinen paine yksikössä Pa, kun p₀ = 101 325 Pa."),
        fields: [{ id: "p", tex: "p", unit: "Pa" }],
        hints: [T("1 bar = 100 000 Pa.", "1 bar = 100 000 Pa."), T("Absolute pressure = gauge pressure + atmospheric pressure.", "Absoluuttinen paine = ylipaine + ilmanpaine.")] },
      { id: "t1-q6", mode: "practice", type: "mc", difficulty: 2,
        prompt: T("What is the gauge pressure p_e of a perfect vacuum (absolute pressure 0) in normal air?", "Mikä on täydellisen tyhjiön (absoluuttinen paine 0) ylipaine p_e normaalissa ilmanpaineessa?"),
        options: [{ id: "a", html: T("0", "0") }, { id: "b", html: T("about −101 kPa", "noin −101 kPa") }, { id: "c", html: T("about +101 kPa", "noin +101 kPa") }, { id: "d", html: T("it is not defined", "sitä ei ole määritelty") }],
        hints: [T("p_e = p − p₀.", "p_e = p − p₀."), T("Put p = 0 into the formula.", "Sijoita kaavaan p = 0.")] },
      { id: "t1-q7", mode: "practice", type: "numeric", difficulty: 2, tol: 0.03,
        prompt: T("An open-tube manometer with mercury (ρ = 13 600 kg/m³) is connected to a vessel with gauge pressure 10 kPa. Find the height difference of the mercury columns (in m).", "Avoin U-putkimanometri on täytetty elohopealla (ρ = 13 600 kg/m³) ja liitetty säiliöön, jonka ylipaine on 10 kPa. Laske elohopeapatsaiden korkeusero (yksikössä m)."),
        fields: [{ id: "h", tex: "Δh", unit: "m" }],
        hints: [T("p_e = ρgh.", "p_e = ρgh."), T("Solve h = p_e/(ρg).", "Ratkaise h = p_e/(ρg).")] },
      { id: "t1-q8", mode: "practice", type: "mc", difficulty: 1,
        prompt: T("A Bourdon gauge connected to an open compressed-air tank (air at ordinary atmospheric pressure) reads:", "Avoimeen paineilmasäiliöön (ilma tavallisessa ilmanpaineessa) liitetty Bourdon-mittari näyttää:"),
        options: [{ id: "a", html: T("about 1 bar", "noin 1 bar") }, { id: "b", html: T("zero", "nollaa") }, { id: "c", html: T("about 10 bar", "noin 10 bar") }, { id: "d", html: T("a negative value", "negatiivista arvoa") }],
        hints: [T("A Bourdon gauge measures pressure relative to the surroundings.", "Bourdon-mittari mittaa painetta ympäristöön verrattuna.")] },
      { id: "t1-q9", mode: "practice", type: "numeric", difficulty: 1, tol: 0.02,
        prompt: T("A submarine dives 40 m in sea water (ρ = 1025 kg/m³). Find the hydrostatic (gauge) pressure on the hull in Pa.", "Sukellusvene sukeltaa 40 m merivedessä (ρ = 1025 kg/m³). Laske rungon hydrostaattinen paine (ylipaine) yksikössä Pa."),
        fields: [{ id: "pe", tex: "p_e", unit: "Pa" }],
        hints: [T("p_e = ρgh.", "p_e = ρgh.")] },
      { id: "t1-q10", mode: "practice", type: "slider", difficulty: 2, tol: 0.03,
        prompt: T("Drive the submarine to the depth where the water adds a gauge pressure of 2.5 MPa on the hull.", "Aja sukellusvene syvyyteen, jossa vesi aiheuttaa rungolle 2,5 MPa:n ylipaineen."),
        widget: { name: "submarine", config: { mode: "depth", depthMax: 300 } },
        hints: [T("Read the readout p_e: it must show 25 bar.", "Lue mittaria p_e: sen on näytettävä 25 bar."), T("About 1 bar per 10 m, so look for roughly 250 m.", "Noin 1 bar / 10 m, joten etsi noin 250 m.")] },
      { id: "t1-q11", mode: "practice", type: "slider", difficulty: 2, tol: 0.03,
        prompt: T("Set the water level so that the transmitter outputs the middle of its 4–20 mA range.", "Säädä vedenpinta niin, että lähetin antaa 4–20 mA -alueensa keskikohdan."),
        widget: { name: "tank", config: { mode: "level", values: { rho: 1000 } } },
        hints: [T("The middle of the range is the average of 4 mA and 20 mA.", "Alueen keskikohta on 4 mA:n ja 20 mA:n keskiarvo."), T("Check the readout of I while moving the level slider.", "Seuraa lukemaa I liikuttaessasi pinnan liukusäädintä.")] },
      { id: "t1-q12", mode: "practice", type: "mc", difficulty: 2,
        prompt: T("A transmitter at the bottom of a tank sends 4–20 mA. The tank is refilled with a liquid of higher density at the same level. The current:", "Säiliön pohjalla oleva lähetin antaa 4–20 mA. Säiliö täytetään samaan korkeuteen tiheämmällä nesteellä. Virta:"),
        options: [{ id: "a", html: T("stays the same", "pysyy samana") }, { id: "b", html: T("increases", "kasvaa") }, { id: "c", html: T("decreases", "pienenee") }, { id: "d", html: T("drops to 0 mA", "putoaa nollaan mA") }],
        hints: [T("The transmitter measures p_e = ρgh, not the level directly.", "Lähetin mittaa ylipainetta p_e = ρgh, ei pinnankorkeutta suoraan.")] },
      { id: "t1-q13", mode: "practice", type: "numeric", difficulty: 2, tol: 0.02,
        prompt: T("Find the atmospheric pressure at height 3000 m (p₀ = 101 325 Pa, ρ₀ = 1.29 kg/m³). Answer in Pa.", "Laske ilmanpaine korkeudella 3000 m (p₀ = 101 325 Pa, ρ₀ = 1,29 kg/m³). Vastaus yksikössä Pa."),
        fields: [{ id: "p", tex: "p", unit: "Pa" }],
        hints: [T("Use p = p₀·e^(−ρ₀gh/p₀).", "Käytä kaavaa p = p₀·e^(−ρ₀gh/p₀)."), T("First compute the exponent ρ₀gh/p₀.", "Laske ensin eksponentti ρ₀gh/p₀.")] },
      { id: "t1-q14", mode: "practice", type: "numeric", difficulty: 1, tol: 0.02,
        prompt: T("A fully submerged block has the volume 2.0 dm³. Find the buoyant force in fresh water (1000 kg/m³), in N.", "Täysin veden alla olevan kappaleen tilavuus on 2,0 dm³. Laske noste makeassa vedessä (1000 kg/m³) yksikössä N."),
        fields: [{ id: "F", tex: "F_n", unit: "N" }],
        hints: [T("Archimedes: the weight of the displaced water.", "Arkhimedes: syrjäytetyn veden paino."), T("F_n = ρ_n g V with V in m³.", "F_n = ρ_n g V, kun V on m³.")] },
      { id: "t1-q15", mode: "practice", type: "slider", difficulty: 1, tol: 0.04,
        prompt: T("Set the ballast tanks so that the submarine hovers (neither sinks nor rises).", "Säädä painolastisäiliöt niin, että sukellusvene leijuu (ei uppoa eikä nouse)."),
        widget: { name: "submarine", config: { mode: "ballast", values: { f: 80 } } },
        hints: [T("Hovering means net force zero: F_b = G.", "Leijuminen tarkoittaa nollanettovoimaa: F_b = G."), T("Watch the state line while you change f.", "Seuraa tilariviä, kun muutat arvoa f.")] },
      { id: "t1-q16", mode: "practice", type: "multi", difficulty: 2,
        prompt: T("Which of these increase the buoyant force on a fully submerged body?", "Mitkä seuraavista kasvattavat täysin upotettuun kappaleeseen kohdistuvaa nostetta?"),
        options: [{ id: "a", html: T("a larger volume of the body", "kappaleen suurempi tilavuus") }, { id: "b", html: T("a denser fluid", "tiheämpi fluidi") }, { id: "c", html: T("a heavier body of the same volume", "painavampi kappale samalla tilavuudella") }, { id: "d", html: T("diving deeper (same body, same fluid)", "sukeltaminen syvemmälle (sama kappale, sama neste)") }],
        hints: [T("F_n = ρ_n g V: which quantities are in the formula?", "F_n = ρ_n g V: mitkä suureet kaavassa ovat mukana?")] },
      { id: "t1-q17", mode: "practice", type: "numeric", difficulty: 2, tol: 0.02,
        prompt: T("A hydraulic lift has pistons of areas 0.0020 m² and 0.12 m². What force on the small piston lifts a 1000 kg load? Answer in N.", "Hydraulisen nostimen mäntien alat ovat 0,0020 m² ja 0,12 m². Kuinka suuri voima pienelle männälle nostaa 1000 kg:n kuorman? Vastaus yksikössä N."),
        fields: [{ id: "F1", tex: "F_1", unit: "N" }],
        hints: [T("The load's weight is F_2 = mg.", "Kuorman paino on F_2 = mg."), T("F_1/A_1 = F_2/A_2.", "F_1/A_1 = F_2/A_2.")] },
      { id: "t1-q18", mode: "practice", type: "slider", difficulty: 2, tol: 0.03,
        prompt: T("The lift has d_1 = 20 mm and d_2 = 200 mm. Adjust the input force F_1 so that the output force can hold up a 1500 kg car.", "Nostimen d_1 = 20 mm ja d_2 = 200 mm. Säädä syöttövoimaa F_1 niin, että ulostulovoima pitää 1500 kg:n auton ylhäällä."),
        widget: { name: "tank", config: { mode: "press", ranges: { F1: { min: 10, max: 500, step: 1 } } } },
        hints: [T("The car's weight is mg ≈ 14.7 kN.", "Auton paino on mg ≈ 14,7 kN."), T("Watch F_2 in the readout while changing F_1.", "Seuraa lukemaa F_2 muuttaessasi arvoa F_1.")] },
      { id: "t1-q19", mode: "practice", type: "mc", difficulty: 2,
        prompt: T("Why does a car's pedal go \"soft\" and the brakes weak when there is an air bubble in the brake line?", "Miksi jarrupoljin muuttuu \"pehmeäksi\" ja jarrut heikoiksi, jos jarruputkessa on ilmakupla?"),
        options: [{ id: "a", html: T("Air is a heavier fluid than brake fluid.", "Ilma on raskaampi fluidi kuin jarrunneste.") }, { id: "b", html: T("Air is compressible, so the pedal movement compresses it and the pressure rises too little.", "Ilma on kokoonpuristuvaa, joten polkimen liike puristaa sitä ja paine nousee liian vähän.") }, { id: "c", html: T("Air makes Pascal's law invalid for the fluid in the pipe.", "Ilma kumoaa Pascalin lain putkessa olevalle nesteelle.") }, { id: "d", html: T("Air increases the area of the brake cylinder.", "Ilma suurentaa jarrusylinterin alaa.") }],
        hints: [T("Think about which of liquid and gas is almost incompressible.", "Mieti, kumpi on lähes kokoonpuristumatonta, neste vai kaasu.")] },
      { id: "t1-q20", mode: "practice", type: "match", difficulty: 1,
        prompt: T("Match each device or situation with the principle behind it.", "Yhdistä laite tai tilanne taustalla olevaan periaatteeseen."),
        left: [{ id: "baro", html: T("Torricelli mercury barometer", "Torricellin elohopeailmapuntari") }, { id: "tyre", html: T("open-tube manometer on a tyre", "avoin U-putkimanometri renkaassa") }, { id: "brake", html: T("hydraulic brakes", "hydrauliset jarrut") }, { id: "ship", html: T("ship floating at its waterline", "vesirajaansa kelluva laiva") }],
        right: [{ id: "abs", html: T("absolute pressure", "absoluuttinen paine") }, { id: "gauge", html: T("gauge pressure", "ylipaine") }, { id: "pascal", html: T("Pascal's law", "Pascalin laki") }, { id: "arch", html: T("Archimedes' principle", "Arkhimedeen laki") }],
        hints: [T("Which one has a vacuum above the liquid?", "Missä nesteen yläpuolella on tyhjiö?")] },

      // ---- topic test (graded)
      { id: "t1-g1", mode: "graded", type: "numeric", difficulty: 2, tol: 0.02,
        prompt: T("A diver is 200 m below the surface of a lake (ρ = 1000 kg/m³, p₀ = 101 325 Pa). Find the absolute pressure in Pa.", "Sukeltaja on 200 m järven pinnan alla (ρ = 1000 kg/m³, p₀ = 101 325 Pa). Laske absoluuttinen paine yksikössä Pa."),
        fields: [{ id: "p", tex: "p", unit: "Pa" }],
        hints: [T("Absolute = surface pressure + ρgh.", "Absoluuttinen = pintapaine + ρgh.")] },
      { id: "t1-g2", mode: "graded", type: "numeric", difficulty: 2, tol: 0.02,
        prompt: T("What fraction (a number between 0 and 1) of an ice block (917 kg/m³) floats below the surface of sea water (1025 kg/m³)?", "Kuinka suuri osa (luku välillä 0–1) jäälohkareesta (917 kg/m³) on merivedessä (1025 kg/m³) pinnan alla?"),
        fields: [{ id: "f", tex: "V_u/V" }],
        hints: [T("Floating: weight = buoyant force, mg = ρ_n g V_u.", "Kelluminen: paino = noste, mg = ρ_n g V_u."), T("Use m = ρ_ice V.", "Käytä m = ρ_jää V.")] },
      { id: "t1-g3", mode: "graded", type: "numeric", difficulty: 2, tol: 0.02,
        prompt: T("A tank holds oil of density 850 kg/m³ to a depth of 3.5 m. Find the hydrostatic (gauge) pressure at the bottom in Pa.", "Säiliössä on öljyä, jonka tiheys on 850 kg/m³, 3,5 m:n syvyydeltä. Laske hydrostaattinen paine (ylipaine) pohjalla yksikössä Pa."),
        fields: [{ id: "pe", tex: "p_e", unit: "Pa" }],
        hints: [T("p_e = ρgh.", "p_e = ρgh.")] },
      { id: "t1-g4", mode: "graded", type: "numeric", difficulty: 3, tol: 0.02, points: 2,
        prompt: T("A garage lift raises a 1800 kg car. The input piston has the area 0.0020 m² and the output piston 0.12 m². Find the force needed on the input piston (in N).", "Autonostin nostaa 1800 kg:n auton. Syöttömännän ala on 0,0020 m² ja ulostulomännän 0,12 m². Laske syöttömäntää kohti tarvittava voima (yksikössä N)."),
        fields: [{ id: "F1", tex: "F_1", unit: "N" }],
        hints: [T("Find the car's weight first.", "Laske ensin auton paino."), T("Pascal: F_1/A_1 = F_2/A_2.", "Pascal: F_1/A_1 = F_2/A_2.")] },
      { id: "t1-g5", mode: "graded", type: "multi", difficulty: 2, points: 2,
        prompt: T("Select all true statements.", "Valitse kaikki oikeat väittämät."),
        options: [
          { id: "a", html: T("Gauge pressure can be negative.", "Ylipaine voi olla negatiivinen.") },
          { id: "b", html: T("Absolute pressure can be negative.", "Absoluuttinen paine voi olla negatiivinen.") },
          { id: "c", html: T("In water the pressure increases about 1 bar per 10 m.", "Vedessä paine kasvaa noin 1 bar / 10 m.") },
          { id: "d", html: T("The buoyant force depends on the density of the submerged body.", "Noste riippuu upotetun kappaleen tiheydestä.") },
          { id: "e", html: T("Pressure applied to a confined fluid acts equally everywhere in it.", "Suljettuun nesteeseen kohdistettu paine vaikuttaa kaikkialla siinä yhtä suurena.") }],
        hints: [T("Check each statement against its definition: p_e = p − p₀, F_n = ρ_n g V.", "Tarkista väittämät määritelmistä: p_e = p − p₀, F_n = ρ_n g V.")] },
      { id: "t1-g6", mode: "graded", type: "slider", difficulty: 2, tol: 0.03,
        prompt: T("Adjust the gauge pressure and the manometer liquid so that the column difference is exactly 0.50 m.", "Säädä ylipainetta ja manometrinestettä niin, että patsaiden korkeusero on täsmälleen 0,50 m."),
        widget: { name: "tank", config: { mode: "manometer" } },
        hints: [T("Δh = p_e/(ρg): read Δh in the readout (mm).", "Δh = p_e/(ρg): lue Δh mittarista (mm)."), T("Any combination that gives 500 mm is fine.", "Kaikki yhdistelmät, jotka antavat 500 mm, kelpaavat.")] }
    ]
  });
})();

/* Topic 7: Heat transfer. Source: slides ph2-6 p01-p14 (errata applied, see source/extracted/PDF-ERRATA.md).
 * NO answers in this file: they live in src/answers/topic7.json. Block ids are stable; never rename. */
(function () {
  "use strict";
  function T(en, fi) { return { en: en, fi: fi }; }
  function opt(id, en, fi) { return { id: id, html: T(en, fi) }; }

  TDC.registerTopic({
    id: "t7", num: 7,
    title: T("Heat transfer", "Lämmönsiirto"),
    subtitle: T("Conduction, convection and radiation: from the heat sink of a power transistor to the U-value of a window and a pyrometer.",
                "Johtuminen, konvektio ja säteily: tehotransistorin jäähdytyselementistä ikkunan U-arvoon ja pyrometriin."),
    objectives: [
      T("name the three ways of heat transfer and say which of them needs a medium", "nimetä kolme lämmönsiirtotapaa ja kertoa, mitkä tarvitsevat väliaineen"),
      T("calculate conduction with Φ = λ·A·ΔT/l and the density of heat flow rate q", "laskea johtumisen kaavalla Φ = λ·A·ΔT/l sekä lämpövirran tiheyden q"),
      T("use thermal resistance and the U-value of a multilayer wall, and the resistance chain of a heat sink", "käyttää lämmönvastusta ja monikerrosseinän U-arvoa sekä jäähdytyselementin vastusketjua"),
      T("calculate convection heat flow with Φ = q_m·c·ΔT", "laskea konvektiolämpövirran kaavalla Φ = q_m·c·ΔT"),
      T("apply Wien's displacement law, the Stefan–Boltzmann law and emissivity", "soveltaa Wienin siirtymälakia, Stefanin–Boltzmannin lakia ja emissiivisyyttä")
    ],
    glossary: {
      heat_transfer: { en: "heat transfer", fi: "lämmönsiirto", def: T("Energy moving from a hotter to a cooler place by conduction, convection or radiation.", "Energian siirtyminen kuumemmasta paikasta kylmempään johtumalla, konvektiolla tai säteilemällä.") },
      conduction: { en: "conduction", fi: "johtuminen", def: T("Heat transfer through matter by vibrating atoms and free electrons, without bulk motion.", "Lämmön siirtyminen aineessa atomien värähtelyn ja vapaiden elektronien avulla ilman aineen virtausta.") },
      convection: { en: "convection (natural/forced)", fi: "konvektio (luonnollinen/pakotettu)", def: T("Heat carried along by a moving liquid or gas. Natural: driven by density differences. Forced: driven by a pump or fan.", "Lämmön siirtyminen virtaavan nesteen tai kaasun mukana. Luonnollinen: tiheyserot ajavat virtauksen. Pakotettu: pumppu tai puhallin.") },
      radiation: { en: "radiation", fi: "säteily", def: T("Heat transfer by electromagnetic waves; needs no medium.", "Lämmönsiirto sähkömagneettisena aaltoliikkeenä; ei tarvitse väliainetta.") },
      heat_flow: { en: "heat flow rate", fi: "lämpövirta", sym: "Φ", def: T("Heat transferred per second, unit W.", "Aikayksikössä siirtyvä lämpö, yksikkö W.") },
      heat_flux: { en: "density of heat flow rate", fi: "lämpövirran tiheys", sym: "q", def: T("Heat flow rate per area, q = Φ/A, unit W/m².", "Lämpövirta pinta-alaa kohti, q = Φ/A, yksikkö W/m².") },
      conductivity: { en: "thermal conductivity", fi: "lämmönjohtavuus", sym: "λ", def: T("Material property: how well it conducts heat, unit W/(m·K).", "Aineen ominaisuus: kuinka hyvin aine johtaa lämpöä, yksikkö W/(m·K).") },
      h_coeff: { en: "coefficient of heat transfer", fi: "lämmönsiirtokerroin", sym: "h", def: T("Describes the thin air layer at a surface, unit W/(m²·K).", "Kuvaa pinnan ohutta ilmakerrosta, yksikkö W/(m²·K).") },
      thermal_resistance: { en: "thermal resistance", fi: "lämmönvastus", sym: "R", def: T("Resistance to heat flow. Per area: R = Σ1/h + Σd/λ in m²·K/W.", "Vastus lämpövirralle. Pinta-alaa kohti: R = Σ1/h + Σd/λ, yksikkö m²·K/W.") },
      u_value: { en: "U-value (U-coefficient)", fi: "lämmönläpäisykerroin (U-arvo)", sym: "U = 1/R", def: T("Heat flow per area and kelvin through a wall, unit W/(m²·K). Smaller is better insulation.", "Seinän läpi kulkeva lämpövirta pinta-alaa ja kelviniä kohti, yksikkö W/(m²·K). Pienempi on parempi eristys.") },
      surface_resistance: { en: "surface resistance", fi: "pintavastus", sym: "1/h", def: T("The thermal resistance 1/h of the air layer at a surface.", "Pinnan ilmakerroksen lämmönvastus 1/h.") },
      blackbody: { en: "black body", fi: "musta kappale", def: T("Ideal emitter and absorber, emissivity 1.", "Ihanteellinen säteilijä ja absorboija, emissiivisyys 1.") },
      emissivity: { en: "emissivity", fi: "emissiivisyys", sym: "ε", def: T("How much a surface radiates compared with a black body, 0 ≤ ε ≤ 1.", "Kuinka paljon pinta säteilee mustaan kappaleeseen verrattuna, 0 ≤ ε ≤ 1.") },
      exitance: { en: "radiant exitance (intensity)", fi: "säteilyn intensiteetti (emittanssi)", sym: "M", def: T("Radiated power per area, M = Φ/A, unit W/m².", "Säteilevä teho pinta-alaa kohti, M = Φ/A, yksikkö W/m².") },
      wien: { en: "Wien's displacement law", fi: "Wienin siirtymälaki", sym: "λ_max·T = 2898 µm·K", def: T("The wavelength of peak emission is inversely proportional to the temperature.", "Säteilyn huippukohdan aallonpituus on kääntäen verrannollinen lämpötilaan.") },
      stefan: { en: "Stefan–Boltzmann law", fi: "Stefanin–Boltzmannin laki", sym: "M = σT⁴", def: T("Radiated power per area is proportional to the fourth power of the absolute temperature.", "Säteilevä teho pinta-alaa kohti on verrannollinen absoluuttisen lämpötilan neljänteen potenssiin.") },
      sigma: { en: "Stefan–Boltzmann constant", fi: "Stefanin–Boltzmannin vakio", sym: "σ", def: T("σ = 5.67·10⁻⁸ W/(m²·K⁴).", "σ = 5,67·10⁻⁸ W/(m²·K⁴).") },
      wavelength: { en: "wavelength", fi: "aallonpituus", sym: "λ", def: T("Distance over which a wave repeats.", "Matka, jonka jälkeen aalto toistuu.") },
      pyrometer: { en: "pyrometer", fi: "pyrometri", def: T("Instrument measuring the temperature of a hot object from its thermal radiation.", "Mittari, joka määrittää kuuman kohteen lämpötilan sen lämpösäteilystä.") },
      thermal_camera: { en: "thermal camera", fi: "lämpökamera", def: T("Camera that images infrared radiation as a temperature map.", "Kamera, joka kuvaa infrapunasäteilyn lämpötilakarttana.") },
      heat_sink: { en: "heat sink", fi: "jäähdytyselementti", def: T("Finned metal body that conducts heat away from a component and gives it to the air.", "Ripainen metallikappale, joka johtaa lämmön pois komponentista ja luovuttaa sen ilmaan.") },
      junction_temp: { en: "junction temperature", fi: "liitoslämpötila", sym: "t_j", def: T("Temperature of the semiconductor junction; must stay below the datasheet limit.", "Puolijohdeliitoksen lämpötila; sen pitää pysyä alle datalehden rajan.") }
    },
    formulas: [
      { name: T("Heat conduction", "Lämmön johtuminen"), tex: "Φ = λ·A·{T_1 − T_2}/{l}" },
      { name: T("Density of heat flow rate", "Lämpövirran tiheys"), tex: "q = {Φ}/{A} = {λ·ΔT}/{l}" },
      { name: T("Thermal resistance of a wall", "Seinän lämmönvastus"), tex: "R = Σ {1}/{h_i} + Σ {d_j}/{λ_j}" },
      { name: T("U-value and heat flow", "U-arvo ja lämpövirta"), tex: "U = {1}/{R}, Φ = U·A·(T_{in} − T_{out})" },
      { name: T("Convection", "Konvektio"), tex: "Φ = q_m·c·ΔT" },
      { name: T("Surface heat transfer", "Pinnan lämmönsiirto"), tex: "Φ = h·A·ΔT" },
      { name: T("Wien's displacement law", "Wienin siirtymälaki"), tex: "λ_{max}·T = 2898 µm·K" },
      { name: T("Radiant exitance", "Säteilyn intensiteetti"), tex: "M = σ·T^4" },
      { name: T("Net radiation", "Nettosäteily"), tex: "Φ = ε·σ·A·(T_1^4 − T_2^4)" },
      { name: T("Stefan–Boltzmann constant", "Stefanin–Boltzmannin vakio"), tex: "σ = 5.67·10^{-8} W/(m^2·K^4)" }
    ],
    sections: [
      // ---------------------------------------------------------------- 1
      { id: "t7-intro", title: T("Three ways of heat transfer", "Kolme lämmönsiirtotapaa"),
        blocks: [
          { id: "t7-intro-t1", type: "text", html: T(
            "<p>Energy moves from a hotter to a cooler place in three ways: <b>conduction</b>, <b>convection</b> and <b>radiation</b>. Conduction and convection need <b>matter</b> as a medium. <b>Radiation needs no medium</b>: heat crosses a vacuum only by radiation, which is how the Sun warms the Earth.</p><p>In real devices all three happen at once. A boiler wall conducts heat through the metal, its warm outer surface radiates to the room, and an open boiler also loses heat with the rising vapour (convection).</p>",
            "<p>Energia siirtyy kuumemmasta paikasta kylmempään kolmella tavalla: <b>johtumalla</b>, <b>konvektiolla</b> ja <b>säteilemällä</b>. Johtuminen ja konvektio tarvitsevat <b>väliaineen</b>. <b>Säteily ei tarvitse väliainetta</b>: tyhjiön läpi lämpö siirtyy vain säteilemällä, ja näin Aurinko lämmittää Maata.</p><p>Todellisissa laitteissa kaikki kolme tapahtuvat yhtä aikaa. Kattilan seinä johtaa lämpöä metallin läpi, sen lämmin ulkopinta säteilee huoneeseen, ja avoin kattila menettää lämpöä myös nousevan höyryn mukana (konvektio).</p>") },
          { id: "t7-intro-fig", type: "figure", alt: T("Three arrows: conduction in a rod, convection loop in a fluid, radiation as waves", "Kolme nuolta: johtuminen sauvassa, konvektiosilmukka nesteessä, säteily aaltoina"),
            caption: T("Conduction (solid), convection (moving fluid), radiation (waves, no medium).", "Johtuminen (kiinteä aine), konvektio (virtaava neste), säteily (aallot, ei väliainetta)."),
            svg: (function () {   // hot = --c-hot, cold = --c-cold; arrows show the direction of the heat flow
              function fig(a, b, c) {
                return "<svg viewBox='0 0 360 116' xmlns='http://www.w3.org/2000/svg' font-size='12' fill='currentColor' text-anchor='middle'>" +
                  "<defs><linearGradient id='t7g' x1='0' x2='1'><stop offset='0' stop-color='var(--c-hot)'/><stop offset='1' stop-color='var(--c-cold)'/></linearGradient>" +
                  "<marker id='t7a' markerUnits='userSpaceOnUse' markerWidth='9' markerHeight='9' refX='6' refY='4' orient='auto'><path d='M0 0L8 4L0 8z' fill='var(--c-flow)'/></marker>" +
                  "<marker id='t7h' markerUnits='userSpaceOnUse' markerWidth='9' markerHeight='9' refX='6' refY='4' orient='auto'><path d='M0 0L8 4L0 8z' fill='var(--c-hot)'/></marker>" +
                  "<marker id='t7c' markerUnits='userSpaceOnUse' markerWidth='9' markerHeight='9' refX='6' refY='4' orient='auto'><path d='M0 0L8 4L0 8z' fill='var(--c-cold)'/></marker></defs>" +
                  // conduction: a rod, hot on the left, cold on the right
                  "<rect x='12' y='44' width='96' height='22' rx='3' fill='url(#t7g)' opacity='.75' stroke='currentColor'/><path d='M24 32H92' stroke='var(--c-flow)' stroke-width='2.5' marker-end='url(#t7a)'/>" +
                  // convection: warm fluid rises over the heater, cool fluid sinks on the other side
                  "<rect x='140' y='18' width='80' height='66' rx='6' fill='none' stroke='currentColor'/>" +
                  "<path d='M160 74V32Q160 26 166 26H194Q200 26 200 32' fill='none' stroke='var(--c-hot)' stroke-width='3' marker-end='url(#t7h)'/>" +
                  "<path d='M200 40V68Q200 74 194 74H170' fill='none' stroke='var(--c-cold)' stroke-width='3' marker-end='url(#t7c)'/>" +
                  "<path d='M146 92l5 5 5-5 5 5 5-5 5 5 5-5' fill='none' stroke='var(--c-hot)' stroke-width='2'/>" +
                  // radiation: waves from a hot body, no medium needed
                  "<circle cx='262' cy='55' r='12' fill='var(--c-hot)'/><path d='M280 55q6-9 12 0t12 0t12 0t12 0H334' fill='none' stroke='var(--c-flow)' stroke-width='2.5' marker-end='url(#t7a)'/>" +
                  "<text x='60' y='108'>" + a + "</text><text x='180' y='112'>" + b + "</text><text x='300' y='108'>" + c + "</text></svg>";
              }
              return { en: fig('conduction', 'convection', 'radiation'), fi: fig('johtuminen', 'konvektio', 'säteily') };
            })() },
          { id: "t7-q-medium-blk", type: "question", q: "t7-q-medium" }
        ] },
      // ---------------------------------------------------------------- 2
      { id: "t7-cond", title: T("Conduction", "Johtuminen"),
        blocks: [
          { id: "t7-cond-t1", type: "text", html: T(
            "<p>In solids heat moves as vibration energy from atom to neighbouring atom. In metals the free electrons add to the transfer (about 30 % in the slides), which is why good electrical conductors are also good heat conductors. Conduction needs a temperature difference: heat flows from <f>T_1</f> to the cooler <f>T_2</f>.</p>",
            "<p>Kiinteässä aineessa lämpö siirtyy värähdysenergiana atomilta toiselle. Metalleissa vapaat elektronit lisäävät siirtoa (dioissa noin 30 %), minkä vuoksi hyvät sähköjohteet johtavat myös lämpöä hyvin. Johtuminen vaatii lämpötilaeron: lämpö virtaa lämpötilasta <f>T_1</f> kylmempään <f>T_2</f>.</p>") },
          { id: "t7-cond-f1", type: "formula", key: true, tex: "Φ = λ·A·{T_1 − T_2}/{l}",
            label: T("Heat flow rate through a layer", "Lämpövirta kerroksen läpi"),
            legend: [["Φ", T("heat flow rate", "lämpövirta"), "W"], ["λ", T("thermal conductivity", "lämmönjohtavuus"), "W/(m·K)"], ["A", T("cross-section area", "poikkipinta-ala"), "m²"], ["l", T("length (thickness)", "pituus (paksuus)"), "m"]] },
          { id: "t7-cond-f2", type: "formula", key: true, tex: "q = {Φ}/{A} = {λ·ΔT}/{l}",
            label: T("Density of heat flow rate", "Lämpövirran tiheys"),
            legend: [["q", T("density of heat flow rate", "lämpövirran tiheys"), "W/m²"]] },
          { id: "t7-cond-tab", type: "table", caption: T("Thermal conductivities λ in W/(K·m)", "Lämmönjohtavuuksia λ yksikössä W/(K·m)"),
            head: [T("Substance", "Aine"), "λ", T("Substance", "Aine"), "λ"],
            rows: [
              [T("aluminium", "alumiini"), "238", T("glass", "lasi"), "0.84"],
              [T("silver", "hopea"), "427", T("ice", "jää"), "2"],
              [T("copper", "kupari"), "397", T("rubber", "kumi"), "0.2"],
              [T("iron", "rauta"), "79.5", T("water", "vesi"), "0.56"],
              ["", "", T("wood", "puu"), "0.14"],
              [T("air", "ilma"), "0.0234", T("brick", "tiili"), "0.7"],
              [T("helium", "helium"), "0.138", T("rock wool", "kivivilla"), "0.04"],
              [T("oxygen", "happi"), "0.0238", "", ""],
              [T("nitrogen", "typpi"), "0.0234", "", ""],
              [T("hydrogen", "vety"), "0.172", "", ""]
            ] },
          { id: "t7-cond-ex1", type: "example", title: T("Single glass window", "Yksinkertainen lasi-ikkuna"),
            problem: T("Find the heat flow rate and its density through a glass window 2.0 m × 1.8 m, 4.0 mm thick. Outside surface −12 °C, inside surface +21 °C, λ = 0.84 W/(K·m).", "Laske lämpövirta ja sen tiheys lasi-ikkunan läpi, kun ikkuna on 2,0 m × 1,8 m ja 4,0 mm paksu. Ulkopinta on −12 °C, sisäpinta +21 °C ja λ = 0,84 W/(K·m)."),
            given: ["A = 2.0 m · 1.8 m = 3.6 m²", "l = 4.0·10⁻³ m", "ΔT = 21 − (−12) = 33 K", "λ = 0.84 W/(K·m)"],
            steps: [
              { tex: "Φ = λ·A·{ΔT}/{l} = 0.84·3.6·{33}/{4.0·10^{-3}} ≈ 24.9 kW" },
              { tex: "q = {Φ}/{A} = {λ·ΔT}/{l} ≈ 6.93 kW/m^2" },
              T("This is far too large for a real window. The slides ask why houses can be kept warm at all: the answer comes in the next section (the surface air layers).", "Tämä on aivan liian suuri todelliselle ikkunalle. Dioissa kysytään, miksi talot ylipäätään pysyvät lämpiminä: vastaus tulee seuraavassa osiossa (pintojen ilmakerrokset).")
            ],
            result: T("Φ ≈ 24.9 kW, q ≈ 6.93 kW/m²", "Φ ≈ 24,9 kW, q ≈ 6,93 kW/m²") },
          { id: "t7-q-cond-blk", type: "question", q: "t7-q-cond" },
          { id: "t7-q-thick-blk", type: "question", q: "t7-q-thick" },
          { id: "t7-q-order-blk", type: "question", q: "t7-q-order" },
          // (extra) device: thermal-resistance chain of a power transistor
          { id: "t7-cond-h1", type: "h", text: T("Device: heat sink of a power transistor", "Laite: tehotransistorin jäähdytyselementti") },
          { id: "t7-cond-t2", type: "text", html: T(
            "<p>(extra) Conduction through a layer behaves like a resistor: <f>ΔT = Φ·R_{th}</f> with <f>R_{th} = {l}/{λ·A}</f> in K/W. The temperature drops across the thermal resistances add up like voltages across resistors in series. A transistor dissipating <f>P</f> heats the junction above the air by <f>P</f> times the sum of the resistances junction → case → sink → air.</p>",
            "<p>(lisä) Johtuminen kerroksen läpi toimii kuin vastus: <f>ΔT = Φ·R_{th}</f>, missä <f>R_{th} = {l}/{λ·A}</f> yksikössä K/W. Lämmönvastusten yli tapahtuvat lämpötilaputoukset summautuvat kuten sarjaan kytkettyjen vastusten jännitteet. Tehoa <f>P</f> kuluttava transistori lämmittää liitoksen ilmaa kuumemmaksi <f>P</f> kertaa vastusten summa liitos → kotelo → jäähdytyselementti → ilma.</p>") },
          { id: "t7-cond-f3", type: "formula", key: true, tex: "t_j = t_a + P·(R_{jc} + R_{cs} + R_{sa})",
            label: T("Junction temperature", "Liitoslämpötila"),
            legend: [["R_{jc}", T("junction → case", "liitos → kotelo"), "K/W"], ["R_{cs}", T("case → sink", "kotelo → jäähdytyselementti"), "K/W"], ["R_{sa}", T("sink → air", "jäähdytyselementti → ilma"), "K/W"]] },
          { id: "t7-cond-sink", type: "interactive", widget: "heatflow",
            title: T("Heat sink: keep the junction below its limit", "Jäähdytyselementti: pidä liitos rajan alapuolella"),
            caption: T("Raise the power or the sink-to-air resistance R_sa (a smaller sink) and watch t_j climb past 150 °C. A better sink has a lower R_sa.", "Nosta tehoa tai jäähdytyselementin ja ilman välistä vastusta R_sa (pienempi elementti) ja katso, miten t_j nousee yli 150 °C:n. Parempi elementti on pienempi R_sa."),
            config: { mode: "sink" } },
          { id: "t7-q-sink-blk", type: "question", q: "t7-q-sink" },
          { id: "t7-q-sinkslide-blk", type: "question", q: "t7-q-sinkslide" }
        ] },
      // ---------------------------------------------------------------- 3
      { id: "t7-wall", title: T("Multilayer wall and the U-value", "Monikerrosseinä ja U-arvo"),
        blocks: [
          { id: "t7-wall-t1", type: "text", html: T(
            "<p>The single glass above would lose far too much heat. In reality a thin layer of air clings to each side: on the cold side air flows down, on the warm side up, and these layers insulate and make the glass surfaces less extreme. They are described with the <b>coefficient of heat transfer</b> <f>h</f> (unit W/(m²·K)):</p>",
            "<p>Yllä laskettu yksittäinen lasi hukkaisi aivan liikaa lämpöä. Todellisuudessa kummallakin puolella on ohut ilmakerros: kylmällä puolella ilma virtaa alas, lämpimällä ylös, ja nämä kerrokset eristävät ja tekevät lasin pintalämpötiloista vähemmän äärimmäisiä. Niitä kuvataan <b>lämmönsiirtokertoimella</b> <f>h</f> (yksikkö W/(m²·K)):</p>") },
          { id: "t7-wall-f1", type: "formula", tex: "Φ = h_{out}·A·(T_{out} − T_{wout}), Φ = h_{in}·A·(T_{in} − T_{win})",
            label: T("Heat transfer through the air layers", "Lämmönsiirto ilmakerrosten läpi") },
          { id: "t7-wall-t2", type: "text", html: T(
            "<p>The coefficients <f>h</f> are measured for each situation, there are no universal values. For practice the wall is described by its <b>thermal resistance</b> <f>R</f>: the two <b>surface resistances</b> <f>1/h</f> and every layer <f>d/λ</f> add up like resistors in series. The <b>U-value</b> is <f>U = 1/R</f>.</p>",
            "<p>Kertoimet <f>h</f> mitataan kullekin tilanteelle, yleisiä arvoja ei ole. Käytännössä seinää kuvataan <b>lämmönvastuksella</b> <f>R</f>: kaksi <b>pintavastusta</b> <f>1/h</f> ja jokainen kerros <f>d/λ</f> summautuvat kuten sarjaan kytketyt vastukset. <b>Lämmönläpäisykerroin (U-arvo)</b> on <f>U = 1/R</f>.</p>") },
          { id: "t7-wall-f2", type: "formula", key: true, tex: "R = Σ {1}/{h_i} + Σ {d_j}/{λ_j}, U = {1}/{R}",
            label: T("Thermal resistance and U-value", "Lämmönvastus ja U-arvo"),
            legend: [["R", T("thermal resistance (per area)", "lämmönvastus (pinta-alaa kohti)"), "m²·K/W"], ["U", T("U-value", "U-arvo"), "W/(m²·K)"], ["d", T("layer thickness", "kerroksen paksuus"), "m"]] },
          { id: "t7-wall-f3", type: "formula", key: true, tex: "Φ = U·A·(T_{in} − T_{out})",
            label: T("Total heat flow (air temperatures)", "Kokonaislämpövirta (ilman lämpötilat)") },
          { id: "t7-wall-ex1", type: "example", title: T("The same window with air layers", "Sama ikkuna ilmakerrosten kanssa"),
            problem: T("Glass 2.0 m × 1.8 m, 4.0 mm, λ = 0.84 W/(K·m), air temperatures −22 °C outside and +23 °C inside, h_in = h_out = 10 W/(m²·K). Find R, U and Φ.", "Lasi 2,0 m × 1,8 m, 4,0 mm, λ = 0,84 W/(K·m), ilman lämpötilat −22 °C ulkona ja +23 °C sisällä, h_in = h_out = 10 W/(m²·K). Laske R, U ja Φ."),
            given: ["A = 3.6 m²", "d = 4.0 mm", "ΔT = 45 K"],
            steps: [
              { tex: "R = {1}/{h_{in}} + {d}/{λ} + {1}/{h_{out}} = 0.1 + 0.00476 + 0.1 ≈ 0.205 m^2·K/W" },
              { tex: "U = {1}/{R} ≈ 4.88 W/(m^2·K)" },
              { tex: "Φ = U·A·(T_{in} − T_{out}) = 4.88·3.6·45 ≈ 790 W" },
              T("The two air layers are about 98 % of the resistance: the glass itself hardly matters. That is why houses stay warm.", "Kaksi ilmakerrosta muodostavat noin 98 % vastuksesta: lasi itse ei juuri merkitse. Siksi talot pysyvät lämpiminä.")
            ],
            result: T("R ≈ 0.205 m²·K/W, U ≈ 4.88 W/(m²·K), Φ ≈ 790 W (exact values give 791 W)", "R ≈ 0,205 m²·K/W, U ≈ 4,88 W/(m²·K), Φ ≈ 790 W (tarkoilla arvoilla 791 W)") },
          { id: "t7-wall-win", type: "interactive", widget: "heatflow",
            title: T("Window: U-value and heat loss", "Ikkuna: U-arvo ja lämpöhäviö"),
            caption: T("The default is the slide example: U = 4.88 W/(m²·K), Φ = 791 W. Change the glass thickness: the heat loss barely changes, because the air layers dominate.", "Oletus on diaesimerkki: U = 4,88 W/(m²·K), Φ = 791 W. Muuta lasin paksuutta: lämpöhäviö muuttuu tuskin lainkaan, koska ilmakerrokset hallitsevat."),
            config: { mode: "wall", A: 3.6 } },
          { id: "t7-q-U-blk", type: "question", q: "t7-q-U" },
          // (extra) device: insulated wall
          { id: "t7-wall-h1", type: "h", text: T("Device: an insulated wall", "Laite: eristetty seinä") },
          { id: "t7-wall-wall", type: "interactive", widget: "heatflow",
            title: T("Plaster, rock wool and brick", "Rappaus, kivivilla ja tiili"),
            caption: T("(extra) Vary the rock wool thickness d. Thick insulation has the largest thermal resistance and sets the U-value, and the temperature falls most steeply inside it.", "(lisä) Muuta kivivillan paksuutta d. Paksulla eristeellä on suurin lämmönvastus ja se määrää U-arvon, ja lämpötila laskee jyrkimmin sen sisällä."),
            config: { mode: "wall", A: 10, hIn: 8, hOut: 25, layers: [{ name: T("plaster", "rappaus"), d: 0.01, lambda: 0.7 }, { name: T("rock wool", "kivivilla"), d: 0.15, lambda: 0.04 }, { name: T("brick", "tiili"), d: 0.13, lambda: 0.7 }] } },
          { id: "t7-q-wallslide-blk", type: "question", q: "t7-q-wallslide" }
        ] },
      // ---------------------------------------------------------------- 4
      { id: "t7-conv", title: T("Convection", "Konvektio"),
        blocks: [
          { id: "t7-conv-t1", type: "text", html: T(
            "<p>Liquids and gases carry energy with them when they move. The heat transferred depends on the specific heat and the mass flow rate. In a central heating system the water is warmed in the furnace and rises (<b>natural convection</b>), carrying heat to the radiators. A pump makes the transfer more efficient (<b>forced convection</b>).</p>",
            "<p>Nesteet ja kaasut kuljettavat energiaa mukanaan liikkuessaan. Siirtyvä lämpö riippuu ominaislämpökapasiteetista ja massavirrasta. Keskuslämmityksessä vesi lämpenee kattilassa ja nousee ylös (<b>luonnollinen konvektio</b>) kuljettaen lämpöä pattereihin. Pumppu tehostaa siirtoa (<b>pakotettu konvektio</b>).</p>") },
          { id: "t7-conv-f1", type: "formula", key: true, tex: "Φ = q_m·c·ΔT",
            label: T("Heat carried by a flowing fluid", "Virtaavan aineen kuljettama lämpö"),
            legend: [["q_m", T("mass flow rate", "massavirta"), "kg/s"], ["c", T("specific heat", "ominaislämpökapasiteetti"), "J/(kg·K)"], ["ΔT", T("temperature change", "lämpötilan muutos"), "K"]] },
          { id: "t7-conv-ex1", type: "example", title: T("Radiator water flow", "Patterin vesivirta"),
            problem: T("(extra) Water cools by 15 K in a radiator circuit. The flow is 0.050 kg/s, c = 4190 J/(kg·K). What power does it deliver to the room?", "(lisä) Vesi jäähtyy pattereissa 15 K. Virtaus on 0,050 kg/s ja c = 4190 J/(kg·K). Kuinka suuren tehon vesi luovuttaa huoneeseen?"),
            given: ["q_m = 0.050 kg/s", "c = 4190 J/(kg·K)", "ΔT = 15 K"],
            steps: [{ tex: "Φ = q_m·c·ΔT = 0.050·4190·15 ≈ 3.1 kW" }],
            result: T("Φ ≈ 3.1 kW", "Φ ≈ 3,1 kW") },
          // (extra) device: panel radiator, Phi = h A dT at the surface
          { id: "t7-conv-rad", type: "interactive", widget: "readout",
            title: T("Device: panel radiator", "Laite: vesipatteri"),
            caption: T("(extra) At the surface the heat goes to the room air as Φ = h·A·ΔT. The hot water must supply the same power: the flow q_m needed follows from Φ = q_m·c·ΔT with a 15 K water temperature drop.", "(lisä) Pinnalta lämpö siirtyy huoneilmaan kaavalla Φ = h·A·ΔT. Kuuman veden täytyy tuoda sama teho: tarvittava virtaus q_m seuraa kaavasta Φ = q_m·c·ΔT, kun veden lämpötila laskee 15 K."),
            config: {
              params: [
                { id: "h", tex: "h", min: 4, max: 25, step: 0.5, value: 10, unit: "W/(m²·K)" },
                { id: "A", tex: "A", min: 0.5, max: 3, step: 0.1, value: 1.5, unit: "m²" },
                { id: "ts", tex: "t_s", min: 30, max: 80, step: 1, value: 60, unit: "°C" },
                { id: "tr", tex: "t_r", min: 10, max: 26, step: 1, value: 21, unit: "°C" }
              ],
              outputs: function (v) {
                var phi = v.h * v.A * (v.ts - v.tr);
                return [
                  { tex: "Φ = h·A·ΔT", value: Math.round(phi), unit: "W" },
                  { tex: "q = Φ/A", value: Math.round(phi / v.A), unit: "W/m²" },
                  { tex: "q_m = {Φ}/{c·ΔT_w}", value: Math.round(phi / (4190 * 15) * 10000) / 10000, unit: "kg/s" }
                ];
              }
            } },
          { id: "t7-conv-d1", type: "details", summary: T("Gulf Stream and the Norwegian Current", "Golfvirta ja Norjan merivirta"), html: T(
            "<p>Western Europe and Scandinavia are warmed by the Gulf Stream, which begins in the Caribbean Sea. A branch flows along the coast of Western Europe and the western coast of Norway. This Norwegian Current releases a huge amount of heat to Scandinavia and keeps cold Arctic currents away from the Norwegian coast: convection on a continental scale.</p>",
            "<p>Länsi-Eurooppaa ja Skandinaviaa lämmittää Golfvirta, joka saa alkunsa Karibianmereltä. Yksi haara virtaa Länsi-Euroopan rannikkoa ja Norjan länsirannikkoa pitkin. Tämä Norjan merivirta luovuttaa valtavasti lämpöä Skandinaviaan ja estää kylmiä Jäämeren virtauksia kulkemasta Norjan rannikkoa pitkin: konvektiota mantereen mittakaavassa.</p>") },
          { id: "t7-q-conv-blk", type: "question", q: "t7-q-conv" },
          { id: "t7-q-match-blk", type: "question", q: "t7-q-match" }
        ] },
      // ---------------------------------------------------------------- 5
      { id: "t7-rad", title: T("Radiation", "Säteily"),
        blocks: [
          { id: "t7-rad-t1", type: "text", html: T(
            "<p>Every object above 0 K emits electromagnetic radiation. Near 300 K it is too weak for us to notice, above about 600 K it is easy to detect. An idealised <b>black body</b> emits a continuous spectrum. The peak of the spectrum moves to shorter <b>wavelength</b> as the temperature rises (<b>Wien's displacement law</b>).</p>",
            "<p>Jokainen kappale, jonka lämpötila on yli 0 K, lähettää sähkömagneettista säteilyä. Noin 300 K:ssa se on liian heikkoa havaittavaksi, yli noin 600 K:n sen havaitsee helposti. Ihanteellinen <b>musta kappale</b> lähettää jatkuvan spektrin. Spektrin huippu siirtyy lyhyemmälle <b>aallonpituudelle</b> lämpötilan noustessa (<b>Wienin siirtymälaki</b>).</p>") },
          { id: "t7-rad-f1", type: "formula", key: true, tex: "λ_{max}·T = 2898 µm·K",
            label: T("Wien's displacement law", "Wienin siirtymälaki"),
            legend: [["λ_{max}", T("wavelength of the spectrum peak", "spektrin huipun aallonpituus"), "m"], ["T", T("absolute temperature", "absoluuttinen lämpötila"), "K"]] },
          { id: "t7-rad-ex1", type: "example", title: T("Hot metal plate and the Sun", "Kuuma metallilevy ja Aurinko"),
            problem: T("a) A metal plate is heated to 750 °C. Find the wavelength of maximum emission. b) The Sun has λ_max = 500 nm. Find its surface temperature.", "a) Metallilevy lämmitetään 750 °C:seen. Laske voimakkaimman säteilyn aallonpituus. b) Auringon λ_max = 500 nm. Laske sen pintalämpötila."),
            given: ["T = 750 + 273 = 1023 K", "λ_max,Sun = 500 nm"],
            steps: [
              { tex: "λ_{max} = {2898 µm·K}/{T} = {2898}/{1023} µm ≈ 2.83 µm" },
              T("2.83 µm is infrared. The short-wavelength end of the spectrum reaches the visible range, so the plate glows red.", "2,83 µm on infrapunaa. Spektrin lyhytaaltoinen pää yltää näkyvälle alueelle, joten levy hehkuu punaisena."),
              { tex: "T = {2898·10^{-6} m·K}/{500·10^{-9} m} ≈ 5800 K" }
            ],
            result: T("a) λ_max ≈ 2.83 µm, b) T ≈ 5800 K", "a) λ_max ≈ 2,83 µm, b) T ≈ 5800 K") },
          { id: "t7-q-wien-blk", type: "question", q: "t7-q-wien" },
          { id: "t7-rad-t2", type: "text", html: T(
            "<p><b>Radiant exitance</b> <f>M</f> (also called intensity) is the radiated power per area. For a black body it grows with the fourth power of the absolute temperature (<b>Stefan–Boltzmann law</b>). Real surfaces emit less, by the factor <b>emissivity</b> <f>ε</f>, <f>0 ≤ ε ≤ 1</f>, which depends on the wavelength (<f>ε = ε(λ)</f>). Shiny metal has ε close to zero at some wavelengths; a black body has ε = 1 and is also a perfect absorber.</p>",
            "<p><b>Säteilyn intensiteetti (emittanssi)</b> <f>M</f> on säteilevä teho pinta-alaa kohti. Mustalla kappaleella se kasvaa absoluuttisen lämpötilan neljännen potenssin mukana (<b>Stefanin–Boltzmannin laki</b>). Todelliset pinnat säteilevät vähemmän <b>emissiivisyyden</b> <f>ε</f> verran, <f>0 ≤ ε ≤ 1</f>, ja se riippuu aallonpituudesta (<f>ε = ε(λ)</f>). Kiiltävällä metallilla ε on joillakin aallonpituuksilla lähellä nollaa; musta kappale on ε = 1 ja täydellinen absorboija.</p>") },
          { id: "t7-rad-f2", type: "formula", key: true, tex: "M = {Φ}/{A} = σ·T^4, σ = 5.67·10^{-8} W/(m^2·K^4)",
            label: T("Radiant exitance of a black body", "Mustan kappaleen säteilyn intensiteetti") },
          { id: "t7-rad-f3", type: "formula", key: true, tex: "Φ = ε·σ·A·T_1^4, Φ_{net} = ε·σ·A·(T_1^4 − T_2^4)",
            label: T("Stefan–Boltzmann equation (emitted and net)", "Stefanin–Boltzmannin yhtälö (emittoitu ja netto)"),
            legend: [["T_1", T("object temperature", "kappaleen lämpötila"), "K"], ["T_2", T("environment temperature", "ympäristön lämpötila"), "K"], ["ε", T("emissivity", "emissiivisyys"), "1"]] },
          { id: "t7-rad-callout", type: "callout", kind: "warn", title: T("Use kelvins", "Käytä kelvinejä"),
            html: T("In Wien's and the Stefan–Boltzmann laws <f>T</f> must be in kelvins. 820 °C is 1093 K, not 820.", "Wienin ja Stefanin–Boltzmannin laeissa <f>T</f> on annettava kelvineinä. 820 °C on 1093 K, ei 820.") },
          { id: "t7-rad-ex2", type: "example", title: T("Hot steel bar", "Kuuma teräspalkki"),
            problem: T("A round metal bar (d = 10 cm, l = 6.0 m) is at 820 °C. The environment is 25 °C, ε ≈ 0.85. Find the net radiated heat flow rate.", "Pyöreän metallitangon (d = 10 cm, l = 6,0 m) lämpötila on 820 °C. Ympäristö on 25 °C ja ε ≈ 0,85. Laske nettosäteilylämpövirta."),
            given: ["T_1 = 1093 K", "T_2 = 298 K", "ε = 0.85"],
            steps: [
              { tex: "A = {π·d^2}/{2} + π·d·l = ({π·0.10^2}/{2} + π·0.10·6.0) m^2 ≈ 1.90 m^2" },
              T("(Two end faces π·d²/4 each, plus the side surface.)", "(Kaksi päätypintaa, kumpikin π·d²/4, sekä vaippa.)"),
              { tex: "Φ = 0.85·5.67·10^{-8}·1.90·(1093^4 − 298^4) W ≈ 130 kW" },
              T("The environment radiates back to the bar only about 721 W, small next to 130 kW.", "Ympäristö säteilee takaisin tankoon vain noin 721 W, mikä on vähän verrattuna 130 kW:iin.")
            ],
            result: T("Φ ≈ 130 kW", "Φ ≈ 130 kW") },
          { id: "t7-rad-w", type: "interactive", widget: "heatflow",
            title: T("Pyrometer and thermal camera", "Pyrometri ja lämpökamera"),
            caption: T("The default is the bar example: 1093 K, ε = 0.85, A = 1.9 m² gives about 130 kW and λ_max = 2.65 µm. A pyrometer or thermal camera reads this radiation and works backwards to the temperature. Lower ε (shiny surface) and the reading falls.", "Oletus on tankoesimerkki: 1093 K, ε = 0,85, A = 1,9 m² antaa noin 130 kW ja λ_max = 2,65 µm. Pyrometri tai lämpökamera lukee tämän säteilyn ja päättelee lämpötilan. Pienennä ε:a (kiiltävä pinta), niin lukema laskee."),
            config: { mode: "radiation", A: 1.9 } },
          { id: "t7-q-stef-blk", type: "question", q: "t7-q-stef" },
          { id: "t7-q-t4-blk", type: "question", q: "t7-q-t4" },
          { id: "t7-q-net-blk", type: "question", q: "t7-q-net" },
          { id: "t7-rad-d1", type: "details", summary: T("Why does a thermal camera mis-read shiny metal?", "Miksi lämpökamera lukee kiiltävää metallia väärin?"), html: T(
            "<p>(extra) A shiny busbar has ε ≈ 0.1, so it radiates only a tenth of what a black body would at the same temperature, and the camera, assuming ε = 1, shows it far too cold. Electricians paint a black patch or stick a tape of known ε on the part before measuring.</p>",
            "<p>(lisä) Kiiltävän kiskon ε ≈ 0,1, joten se säteilee vain kymmenesosan siitä, mitä musta kappale samassa lämpötilassa, ja kamera olettaa ε = 1 ja näyttää kohteen aivan liian kylmänä. Sähköasentajat maalaavat osaan mustan läntin tai liimaavat tunnetun ε:n teipin ennen mittaamista.</p>") }
        ] }
    ],
    questions: [
      { id: "t7-q-medium", mode: "practice", type: "mc", difficulty: 1,
        prompt: T("Which way of heat transfer works across a vacuum?", "Mikä lämmönsiirtotapa toimii tyhjiön läpi?"),
        options: [opt("a", "Conduction", "Johtuminen"), opt("b", "Natural convection", "Luonnollinen konvektio"), opt("c", "Radiation", "Säteily"), opt("d", "Forced convection", "Pakotettu konvektio")],
        hints: [T("Which way does the Sun use?", "Mitä tapaa Aurinko käyttää?")] },
      { id: "t7-q-cond", mode: "practice", type: "numeric", difficulty: 2,
        prompt: T("A copper busbar (λ = 397 W/(K·m)) has cross-section 2.0 cm² and length 0.50 m. One end is at 100 °C, the other at 20 °C. Find the heat flow rate.", "Kuparikiskon (λ = 397 W/(K·m)) poikkipinta-ala on 2,0 cm² ja pituus 0,50 m. Toinen pää on 100 °C:ssa ja toinen 20 °C:ssa. Laske lämpövirta."),
        fields: [{ id: "phi", tex: "Φ", unit: "W" }],
        hints: [T("Convert cm² to m².", "Muunna cm² yksikköön m²."), T("Use Φ = λ·A·ΔT/l with ΔT = 80 K.", "Käytä kaavaa Φ = λ·A·ΔT/l, ΔT = 80 K.")] },
      { id: "t7-q-thick", mode: "practice", type: "mc", difficulty: 1,
        prompt: T("The thickness of an insulating layer is doubled, the temperatures stay the same. What happens to the conducted heat flow rate?", "Eristekerroksen paksuus kaksinkertaistetaan ja lämpötilat pysyvät samoina. Mitä johtuvalle lämpövirralle tapahtuu?"),
        options: [opt("a", "It doubles", "Se kaksinkertaistuu"), opt("b", "It is halved", "Se puolittuu"), opt("c", "It quadruples", "Se nelinkertaistuu"), opt("d", "It does not change", "Se ei muutu")],
        hints: [T("In Φ = λ·A·ΔT/l, l is in the denominator.", "Kaavassa Φ = λ·A·ΔT/l pituus l on nimittäjässä.")] },
      { id: "t7-q-order", mode: "practice", type: "order", difficulty: 1,
        prompt: T("Order the materials from the best to the worst heat conductor.", "Järjestä aineet parhaasta huonoimpaan lämmönjohtimeen."),
        items: [{ id: "air", html: T("air", "ilma") }, { id: "cu", html: T("copper", "kupari") }, { id: "wood", html: T("wood", "puu") }, { id: "fe", html: T("iron", "rauta") }, { id: "gl", html: T("glass", "lasi") }],
        hints: [T("Metals first. Use the table.", "Metallit ensin. Käytä taulukkoa.")] },
      { id: "t7-q-sink", mode: "practice", type: "numeric", difficulty: 2,
        prompt: T("A power transistor dissipates 60 W. R_jc = 0.50 K/W, R_cs = 0.20 K/W, R_sa = 1.1 K/W, and the air is at 35 °C. Find the junction temperature.", "Tehotransistori kuluttaa 60 W. R_jc = 0,50 K/W, R_cs = 0,20 K/W, R_sa = 1,1 K/W ja ilman lämpötila on 35 °C. Laske liitoslämpötila."),
        fields: [{ id: "tj", tex: "t_j", unit: "°C" }],
        hints: [T("Add the three thermal resistances like series resistors.", "Laske kolme lämmönvastusta yhteen kuin sarjaan kytketyt vastukset."), T("t_j = t_a + P·R_total.", "t_j = t_a + P·R_yht.")] },
      { id: "t7-q-sinkslide", mode: "practice", type: "slider", difficulty: 2, tol: 0.02,
        prompt: T("The transistor dissipates 40 W in 40 °C air. Adjust the sink-to-air resistance R_sa until the junction temperature t_j is 125 °C.", "Transistori kuluttaa 40 W 40 °C:n ilmassa. Säädä jäähdytyselementin ja ilman välistä vastusta R_sa niin, että liitoslämpötila t_j on 125 °C."),
        widget: { name: "heatflow", config: { mode: "sink", values: { P: 40, ta: 40, Rsa: 2 }, fixed: ["P", "ta"] } },
        hints: [T("A better sink has a smaller R_sa.", "Parempi jäähdytyselementti tarkoittaa pienempää R_sa:ta."), T("Watch the t_j readout, not the slider value.", "Seuraa t_j-lukemaa, ei liukusäätimen arvoa.")] },
      { id: "t7-q-U", mode: "practice", type: "numeric", difficulty: 2,
        prompt: T("A 150 mm rock wool layer (λ = 0.040 W/(K·m)) is the only layer of a wall. Surface coefficients: h_in = 8 W/(m²·K), h_out = 25 W/(m²·K). Find the U-value.", "Seinän ainoa kerros on 150 mm kivivillaa (λ = 0,040 W/(K·m)). Pintakertoimet: h_in = 8 W/(m²·K), h_out = 25 W/(m²·K). Laske U-arvo."),
        fields: [{ id: "U", tex: "U", unit: "W/(m²·K)" }], tol: 0.03,
        hints: [T("R = 1/h_in + d/λ + 1/h_out.", "R = 1/h_in + d/λ + 1/h_out."), T("U = 1/R.", "U = 1/R.")] },
      { id: "t7-q-wallslide", mode: "practice", type: "slider", difficulty: 2, tol: 0.05,
        prompt: T("Adjust the rock wool thickness d so that the wall has U = 0.30 W/(m²·K).", "Säädä kivivillan paksuutta d niin, että seinän U-arvo on 0,30 W/(m²·K)."),
        widget: { name: "heatflow", config: { mode: "wall", A: 10, hIn: 8, hOut: 25, vary: 1,
          layers: [{ name: T("plaster", "rappaus"), d: 0.01, lambda: 0.7 }, { name: T("rock wool", "kivivilla"), d: 0.05, lambda: 0.04 }, { name: T("brick", "tiili"), d: 0.13, lambda: 0.7 }] } },
        hints: [T("A smaller U needs a thicker layer.", "Pienempi U vaatii paksumman kerroksen."), T("Watch the U readout.", "Seuraa U-lukemaa.")] },
      { id: "t7-q-conv", mode: "practice", type: "numeric", difficulty: 2,
        prompt: T("Water (c = 4190 J/(kg·K)) flows through a radiator at 0.050 kg/s and cools by 15 K. How large is the heat flow rate it delivers?", "Vesi (c = 4190 J/(kg·K)) virtaa pattereissa 0,050 kg/s ja jäähtyy 15 K. Kuinka suuri lämpövirta siitä siirtyy?"),
        fields: [{ id: "phi", tex: "Φ", unit: "W" }],
        hints: [T("Use Φ = q_m·c·ΔT.", "Käytä kaavaa Φ = q_m·c·ΔT.")] },
      { id: "t7-q-match", mode: "practice", type: "match", difficulty: 1,
        prompt: T("Match each device effect with its way of heat transfer.", "Yhdistä laitteen ilmiö ja lämmönsiirtotapa."),
        left: [{ id: "fin", html: T("heat flows along a metal heat-sink fin", "lämpö virtaa jäähdytyselementin metalliripaa pitkin") }, { id: "rad", html: T("central-heating water carries heat to the radiators", "keskuslämmityksen vesi kuljettaa lämpöä pattereihin") }, { id: "pyro", html: T("a pyrometer reads a hot furnace wall", "pyrometri lukee kuuman uunin seinää") }],
        right: [{ id: "cond", html: T("conduction", "johtuminen") }, { id: "conv", html: T("convection", "konvektio") }, { id: "radi", html: T("radiation", "säteily") }],
        hints: [T("Which one needs moving fluid? Which one needs no medium?", "Mikä tarvitsee virtaavaa ainetta? Mikä ei tarvitse väliainetta?")] },
      { id: "t7-q-wien", mode: "practice", type: "numeric", difficulty: 2,
        prompt: T("A furnace wall is at 1500 °C. At which wavelength does it radiate most strongly? (Answer in metres, e.g. 1.6e-6 or 1.6µ.)", "Uunin seinä on 1500 °C:ssa. Millä aallonpituudella se säteilee voimakkaimmin? (Vastaa metreinä, esim. 1,6e-6 tai 1,6µ.)"),
        fields: [{ id: "lam", tex: "λ_{max}", unit: "m" }],
        hints: [T("Convert to kelvins first.", "Muunna ensin kelvineiksi."), T("λ_max = 2898 µm·K / T.", "λ_max = 2898 µm·K / T.")] },
      { id: "t7-q-stef", mode: "practice", type: "numeric", difficulty: 1,
        prompt: T("Find the radiant exitance of a black body at 600 K.", "Laske mustan kappaleen säteilyn intensiteetti lämpötilassa 600 K."),
        fields: [{ id: "M", tex: "M", unit: "W/m²" }],
        hints: [T("M = σ·T⁴ with σ = 5.67·10⁻⁸ W/(m²·K⁴).", "M = σ·T⁴, σ = 5,67·10⁻⁸ W/(m²·K⁴).")] },
      { id: "t7-q-t4", mode: "practice", type: "mc", difficulty: 1,
        prompt: T("The absolute temperature of a radiating black body is doubled. By what factor does the radiated power grow?", "Säteilevän mustan kappaleen absoluuttinen lämpötila kaksinkertaistuu. Kuinka moninkertaiseksi säteilyteho kasvaa?"),
        options: [opt("a", "2", "2"), opt("b", "4", "4"), opt("c", "8", "8"), opt("d", "16", "16")],
        hints: [T("The power is proportional to T to the fourth power.", "Teho on verrannollinen lämpötilan neljänteen potenssiin.")] },
      { id: "t7-q-net", mode: "practice", type: "numeric", difficulty: 2,
        prompt: T("A steel plate has emissivity 0.90 and area 2.0 m² and is at 400 K. The room is at 300 K. Find the net radiated heat flow rate.", "Teräslevyn emissiivisyys on 0,90, pinta-ala 2,0 m² ja lämpötila 400 K. Huone on 300 K:ssa. Laske säteilyn nettolämpövirta."),
        fields: [{ id: "phi", tex: "Φ", unit: "W" }],
        hints: [T("Use Φ = ε·σ·A·(T₁⁴ − T₂⁴), temperatures in kelvins.", "Käytä kaavaa Φ = ε·σ·A·(T₁⁴ − T₂⁴), lämpötilat kelvineinä.")] },
      // ---- topic test
      { id: "t7-tq1", mode: "graded", type: "mc", difficulty: 1,
        prompt: T("Why does a double-glazed window with an air gap insulate better than one glass pane?", "Miksi kaksinkertainen ikkuna ilmaraolla eristää paremmin kuin yksi lasi?"),
        options: [opt("a", "Air conducts heat better than glass", "Ilma johtaa lämpöä paremmin kuin lasi"), opt("b", "Still air has a very low thermal conductivity, so the gap adds a large thermal resistance", "Seisova ilma johtaa lämpöä erittäin huonosti, joten rako lisää suuren lämmönvastuksen"), opt("c", "Glass emits no radiation", "Lasi ei säteile"), opt("d", "The gap makes the glass thicker, and U grows with thickness", "Rako paksuntaa lasia, ja U kasvaa paksuuden mukana")],
        hints: [T("Compare λ of air and glass in the table.", "Vertaa ilman ja lasin λ:aa taulukossa.")] },
      { id: "t7-tq2", mode: "graded", type: "numeric", difficulty: 3, points: 2, tol: 0.02,
        prompt: T("A window 3.6 m² has two 4.0 mm glass panes (λ = 0.84 W/(K·m)) with a 12 mm air gap (λ = 0.0234 W/(K·m), convection in the gap ignored). h_in = h_out = 10 W/(m²·K). Air is +23 °C inside and −22 °C outside. Find the heat flow rate.", "Ikkunan pinta-ala on 3,6 m², siinä on kaksi 4,0 mm:n lasia (λ = 0,84 W/(K·m)) ja 12 mm:n ilmarako (λ = 0,0234 W/(K·m), raon konvektio jätetään huomiotta). h_in = h_out = 10 W/(m²·K). Ilma on sisällä +23 °C ja ulkona −22 °C. Laske lämpövirta."),
        fields: [{ id: "phi", tex: "Φ", unit: "W" }],
        hints: [T("Five resistances in series: two surfaces, two panes, the gap.", "Viisi sarjaan kytkettyä vastusta: kaksi pintaa, kaksi lasia ja rako."), T("R = 0.1 + 0.1 + 2·d/λ(glass) + d/λ(air); then U = 1/R.", "R = 0,1 + 0,1 + 2·d/λ(lasi) + d/λ(ilma); sitten U = 1/R."), T("Φ = U·A·ΔT.", "Φ = U·A·ΔT.")] },
      { id: "t7-tq3", mode: "graded", type: "numeric", difficulty: 2,
        prompt: T("A pyrometer sees the maximum of a furnace's spectrum at 2.0 µm. What is the furnace temperature?", "Pyrometri havaitsee uunin spektrin huipun aallonpituudella 2,0 µm. Mikä on uunin lämpötila?"),
        fields: [{ id: "T", tex: "T", unit: "K" }],
        hints: [T("Use Wien's displacement law.", "Käytä Wienin siirtymälakia.")] },
      { id: "t7-tq4", mode: "graded", type: "numeric", difficulty: 3, points: 2,
        prompt: T("A metal plate of area 0.50 m² and emissivity 0.80 is at 750 °C. The surroundings are at 20 °C. Find the net radiated heat flow rate.", "Metallilevyn pinta-ala on 0,50 m², emissiivisyys 0,80 ja lämpötila 750 °C. Ympäristö on 20 °C:ssa. Laske säteilyn nettolämpövirta."),
        fields: [{ id: "phi", tex: "Φ", unit: "W" }],
        hints: [T("Convert both temperatures to kelvins.", "Muunna molemmat lämpötilat kelvineiksi."), T("Φ = ε·σ·A·(T₁⁴ − T₂⁴).", "Φ = ε·σ·A·(T₁⁴ − T₂⁴).")] },
      { id: "t7-tq5", mode: "graded", type: "multi", difficulty: 2,
        prompt: T("Select all true statements.", "Valitse kaikki tosit väittämät."),
        options: [opt("a", "A smaller U-value means better insulation.", "Pienempi U-arvo tarkoittaa parempaa eristystä."), opt("b", "Conducted heat flow is proportional to T⁴.", "Johtuva lämpövirta on verrannollinen lämpötilaan T⁴."), opt("c", "The emissivity of a real surface is between 0 and 1.", "Todellisen pinnan emissiivisyys on välillä 0–1."), opt("d", "Forced convection needs no pump or fan.", "Pakotettu konvektio ei tarvitse pumppua tai puhallinta.")],
        hints: [T("Check each statement against its formula.", "Tarkista kukin väittämä kaavaa vasten.")] },
      { id: "t7-tq6", mode: "graded", type: "fill", difficulty: 1,
        prompt: T("Fill in the blanks.", "Täydennä aukot."),
        text: T("Heat crosses a vacuum only by [[a]], and the radiant exitance of a black body is proportional to T to the power [[b]].", "Lämpö siirtyy tyhjiön läpi vain tavalla nimeltä [[a]], ja mustan kappaleen säteilyn intensiteetti on verrannollinen lämpötilan potenssiin [[b]]."),
        fields: [{ id: "a", kind: "text" }, { id: "b", kind: "num" }],
        hints: [T("Think of the Sun and the Stefan–Boltzmann law.", "Ajattele Aurinkoa ja Stefanin–Boltzmannin lakia.")] }
    ]
  });
})();

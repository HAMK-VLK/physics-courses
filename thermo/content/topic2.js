/* Topic 2: Fluid dynamics. Source: slides ph2-2 p01-p39 (errata: source/extracted/PDF-ERRATA.md, section t2).
 * NO answers in this file: they live in src/answers/topic2.json. Block ids are stable; never rename. */
(function () {
  "use strict";
  function T(en, fi) { return { en: en, fi: fi }; }
  var PI = Math.PI;

  // Velocity profiles of laminar, turbulent and plug flow (slide p03), drawn as a figure.
  function profileSvg(fi) {
    function pipe(y0, label, pts) {
      var s = "<line x1='10' y1='" + y0 + "' x2='190' y2='" + y0 + "' stroke='currentColor' stroke-width='2'/>" +
        "<line x1='10' y1='" + (y0 + 60) + "' x2='190' y2='" + (y0 + 60) + "' stroke='currentColor' stroke-width='2'/>";
      var path = "M" + pts.map(function (p) { return p[0] + " " + (y0 + 60 * p[1]); }).join(" L");
      s += "<path d='M30 " + y0 + " L30 " + (y0 + 60) + "' stroke='currentColor' stroke-width='1.5' fill='none'/>";
      for (var i = 1; i <= 5; i++) {
        var f = i / 6, x = pts.reduce(function (acc, p) { return Math.abs(p[1] - f) < Math.abs(acc[1] - f) ? p : acc; }, pts[0])[0];
        s += "<line x1='30' y1='" + (y0 + 60 * f) + "' x2='" + x + "' y2='" + (y0 + 60 * f) + "' stroke='var(--c-electron)' stroke-width='2'/>";
      }
      s += "<path d='" + path + "' stroke='var(--c-2)' stroke-width='2' fill='none'/>";
      s += "<text x='100' y='" + (y0 + 78) + "' text-anchor='middle' font-size='11' fill='currentColor'>" + label + "</text>";
      return s;
    }
    var lam = [], tur = [], plug = [];
    for (var i = 0; i <= 12; i++) {
      var y = i / 12, r = 2 * y - 1;
      lam.push([30 + 110 * (1 - r * r), y]);
      tur.push([30 + 110 * (1 - Math.pow(Math.abs(r), 8) * 0.9) * 0.97, y]);
      plug.push([140, y]);
    }
    return "<svg viewBox='0 0 200 300' xmlns='http://www.w3.org/2000/svg'>" +
      pipe(10, fi ? "laminaarinen: v = 0,5 v_max" : "laminar: v = 0.5 v_max", lam) + pipe(105, fi ? "turbulentti: v = (0,8 … 0,9) v_max" : "turbulent: v = (0.8 … 0.9) v_max", tur) + pipe(200, fi ? "tulppavirtaus: v = v_max" : "plug: v = v_max", plug) + "</svg>";
  }

  TDC.registerTopic({
    id: "t2", num: 2,
    title: T("Fluid dynamics", "Virtausoppi"),
    subtitle: T("How fluids move in pipes, through meters and through pumps: flow rate, Bernoulli, viscosity and pipe losses.",
      "Miten nesteet ja kaasut virtaavat putkissa, mittareissa ja pumpuissa: virtaama, Bernoulli, viskositeetti ja putkihäviöt."),
    objectives: [
      T("calculate volume and mass flow rate and use the continuity equation", "laskea tilavuus- ja massavirran ja käyttää jatkuvuusyhtälöä"),
      T("use Bernoulli’s equation (static, hydrostatic and dynamic pressure) and its special cases", "käyttää Bernoullin yhtälöä (staattinen, hydrostaattinen ja dynaaminen paine) ja sen erikoistapauksia"),
      T("explain the Venturi flowmeter, the Pitot tube, Torricelli’s outflow and the pump power balance", "selittää venturimittarin, pitot-putken, Torricellin ulosvirtauksen ja pumpun tehotaseen"),
      T("describe viscosity and use Poiseuille’s equation for laminar flow", "kuvata viskositeetin ja käyttää Poiseuillen yhtälöä laminaariseen virtaukseen"),
      T("decide laminar or turbulent flow with the Reynolds number and calculate pipe and fitting losses", "ratkaista laminaarisen tai turbulentin virtauksen Reynoldsin luvulla ja laskea putki- ja osahäviöt")
    ],

    glossary: {
      fluiddyn: { en: "fluid dynamics", fi: "virtausoppi", def: T("Study of fluids in motion: flows of gases and liquids and power transfer with fluids (with water: hydrodynamics).", "Nesteiden ja kaasujen liikkeen tutkimus: virtaukset ja tehonsiirto nesteillä (veden virtaus: hydrodynamiikka).") },
      streamline: { en: "streamline", fi: "virtaviiva", def: T("Smooth path followed by a fluid particle in laminar flow; streamlines do not cross.", "Laminaarisessa virtauksessa nestehiukkasen seuraama tasainen rata; virtaviivat eivät leikkaa toisiaan.") },
      laminar: { en: "laminar flow", fi: "laminaarinen virtaus", def: T("Layered flow along streamlines, Re < 2000 in a pipe.", "Kerroksittainen virtaus virtaviivoja pitkin, putkessa Re < 2000.") },
      turbulent: { en: "turbulent flow", fi: "turbulentti virtaus", def: T("Chaotic flow with eddies, Re > 3000 in a pipe.", "Epäsäännöllinen, pyörteinen virtaus, putkessa Re > 3000.") },
      volflow: { en: "volume flow rate", fi: "tilavuusvirta", sym: "q_V", def: T("Volume of fluid passing a cross-section per second, q_V = A·v, unit m³/s.", "Poikkileikkauksen läpi sekunnissa kulkeva tilavuus, q_V = A·v, yksikkö m³/s.") },
      massflow: { en: "mass flow rate", fi: "massavirta", sym: "q_m", def: T("Mass passing a cross-section per second, q_m = ρ·q_V, unit kg/s.", "Poikkileikkauksen läpi sekunnissa kulkeva massa, q_m = ρ·q_V, yksikkö kg/s.") },
      velocity: { en: "flow velocity", fi: "virtausnopeus", sym: "v", def: T("Average speed of the fluid over the cross-section.", "Nesteen keskimääräinen nopeus poikkileikkauksessa.") },
      continuity: { en: "equation of continuity", fi: "jatkuvuusyhtälö", sym: "A_1v_1 = A_2v_2", def: T("Without leaks the volume flow rate is the same everywhere in a pipe.", "Ilman vuotoja tilavuusvirta on putkessa joka kohdassa sama.") },
      bernoulli: { en: "Bernoulli’s equation", fi: "Bernoullin yhtälö", sym: "p + ρgh + ½ρv²", def: T("Energy conservation for ideal flow: the sum of static, hydrostatic and dynamic pressure is constant.", "Ideaalivirtauksen energian säilyminen: staattisen, hydrostaattisen ja dynaamisen paineen summa on vakio.") },
      dynpress: { en: "dynamic pressure", fi: "dynaaminen paine", sym: "p_D = ½ρv²", def: T("Pressure term that belongs to the kinetic energy of the flow.", "Virtauksen liike-energiaa vastaava painetermi.") },
      statpress: { en: "static pressure", fi: "staattinen paine", sym: "p", def: T("Pressure of the fluid itself; needed to make the fluid move.", "Nesteen oma paine; tarvitaan nesteen liikuttamiseen.") },
      venturi: { en: "Venturi tube", fi: "venturiputki", def: T("Narrowing pipe section; the pressure drop between the wide and narrow points measures the flow.", "Kapeneva putkiosa; leveän ja kapean kohdan paine-ero mittaa virtausta.") },
      pitot: { en: "Pitot tube", fi: "pitot-putki", def: T("Probe that measures dynamic pressure and gives the flow speed.", "Anturi, joka mittaa dynaamisen paineen ja antaa virtausnopeuden.") },
      torricelli: { en: "Torricelli’s theorem", fi: "Torricellin laki", sym: "v = √(2gh)", def: T("Outflow speed from an opening at depth h below the surface of an open tank.", "Avoimen säiliön pinnan alapuolella syvyydellä h olevasta aukosta ulosvirtaavan nesteen nopeus.") },
      viscosity: { en: "viscosity", fi: "viskositeetti", sym: "η", def: T("Internal friction of a fluid, unit Pa·s.", "Nesteen sisäinen kitka, yksikkö Pa·s.") },
      poiseuille: { en: "Poiseuille’s equation", fi: "Poiseuillen yhtälö", sym: "q_V = πR⁴Δp/(8ηΔz)", def: T("Volume flow of laminar flow in a round pipe; proportional to R⁴.", "Laminaarin virtauksen tilavuusvirta pyöreässä putkessa; verrannollinen suureeseen R⁴.") },
      reynolds: { en: "Reynolds number", fi: "Reynoldsin luku", sym: "R_e = ρvD/η", def: T("Dimensionless number that tells laminar from turbulent flow.", "Dimensioton luku, joka erottaa laminaarisen virtauksen turbulentista.") },
      friction: { en: "friction loss", fi: "kitkahäviö", sym: "Δp_l", def: T("Pressure lost to friction in pipes, bends and valves.", "Putkien, mutkien ja venttiilien kitkan aiheuttama painehäviö.") },
      frictionfactor: { en: "friction factor", fi: "kitkakerroin", sym: "8f", def: T("Dimensionless factor of a straight pipe; laminar 8f = 64/Re, otherwise from tables.", "Suoran putken dimensioton kerroin; laminaarisesti 8f = 64/Re, muuten taulukosta.") },
      pumpeff: { en: "pump efficiency", fi: "pumpun hyötysuhde", sym: "η", def: T("Output (hydraulic) power divided by input (shaft or electrical) power.", "Hydraulisen antotehon ja syöttötehon suhde.") },
      pressgrad: { en: "pressure gradient", fi: "painegradientti", sym: "Δp/Δz", def: T("Pressure drop per metre along the pipe.", "Putken suuntainen painehäviö metriä kohti.") }
    },
    formulas: [
      { name: T("Volume flow rate", "Tilavuusvirta"), tex: "q_V = {V}/{t} = A·v" },
      { name: T("Mass flow rate", "Massavirta"), tex: "q_m = ρ·q_V" },
      { name: T("Continuity", "Jatkuvuus"), tex: "A_1·v_1 = A_2·v_2" },
      { name: T("Bernoulli’s equation", "Bernoullin yhtälö"), tex: "p_1 + ρgh_1 + {1}/{2}ρv_1^2 = p_2 + ρgh_2 + {1}/{2}ρv_2^2" },
      { name: T("Dynamic pressure", "Dynaaminen paine"), tex: "p_D = {1}/{2}ρv^2" },
      { name: T("Venturi flow speed", "Venturimittarin nopeus"), tex: "v_1 = sqrt{{2Δp}/{ρ({A_1^2}/{A_2^2} − 1)}}" },
      { name: T("Pitot tube", "Pitot-putki"), tex: "v = sqrt{{2Δp}/{ρ}}" },
      { name: T("Torricelli", "Torricelli"), tex: "v = sqrt{2gh}" },
      { name: T("Pump pressure and power", "Pumpun paine ja teho"), tex: "Δp_P = p_2 − p_1 + ρgh + {1}/{2}ρ(v_2^2 − v_1^2),   P_A = Δp_P·q_V,   P_0 = {P_A}/{η}" },
      { name: T("Viscous force", "Viskositeettivoima"), tex: "F = ηA{v}/{l}" },
      { name: T("Poiseuille", "Poiseuille"), tex: "q_V = {πR^4}/{8η}·{Δp}/{Δz}" },
      { name: T("Reynolds number", "Reynoldsin luku"), tex: "R_e = {ρvD}/{η}" },
      { name: T("Pipe friction loss", "Putken kitkahäviö"), tex: "Δp_l = 8f·{L}/{D}·{1}/{2}ρv^2" },
      { name: T("Fitting loss", "Osahäviö"), tex: "Δp_k = k·{1}/{2}ρv^2" }
    ],

    sections: [
      // ---------------------------------------------------------------- 1
      {
        id: "t2-types", title: T("Ideal flow and the types of flow", "Ideaalivirtaus ja virtaustyypit"),
        blocks: [
          { id: "t2-types-p1", type: "text", html: T(
            "<p><dfn data-term=\"fluiddyn\">Fluid dynamics</dfn> studies fluids in motion: gas and liquid flows and power transfer with fluids (<em>hydrodynamics</em> when the liquid is water). The full equations (viscosity, local density changes, eddies) cannot be solved by hand, so engineers use computers. With a few assumptions we still get the basic principles and a good understanding.</p>",
            "<p><dfn data-term=\"fluiddyn\">Virtausoppi</dfn> tutkii nesteitä ja kaasuja liikkeessä: kaasu- ja nestevirtauksia sekä tehonsiirtoa nesteillä (<em>hydrodynamiikka</em>, kun neste on vettä). Täydellisiä yhtälöitä (viskositeetti, paikalliset tiheyden muutokset, pyörteet) ei voi ratkaista käsin, joten käytännössä lasketaan tietokoneella. Muutamalla oletuksella saadaan silti perusperiaatteet ja hyvä ymmärrys.</p>") },
          { id: "t2-types-assume", type: "callout", kind: "key", title: T("Basic assumptions (ideal flow)", "Perusoletukset (ideaalivirtaus)"), html: T(
            "<ol><li>Viscosity (internal friction) is neglected: the fluid is ideal, there are no energy losses and the total energy of the flowing fluid is constant.</li><li>The density and the volume of the flowing fluid are constant even if the static pressure changes.</li></ol><p>The assumptions require <b>laminar</b> flow.</p>",
            "<ol><li>Viskositeetti (sisäinen kitka) jätetään huomiotta: neste on ideaalinen, energiahäviöitä ei ole ja virtaavan nesteen kokonaisenergia on vakio.</li><li>Virtaavan nesteen tiheys ja tilavuus ovat vakiot, vaikka staattinen paine muuttuu.</li></ol><p>Oletukset edellyttävät <b>laminaarista</b> virtausta.</p>") },
          { id: "t2-types-p2", type: "text", html: T(
            "<p>In <dfn data-term=\"laminar\">laminar flow</dfn> every fluid particle follows a smooth path, a <dfn data-term=\"streamline\">streamline</dfn>, and the paths never cross. In <dfn data-term=\"turbulent\">turbulent flow</dfn> the streamlines cross in a chaotic mixture with <b>eddies</b>.</p>",
            "<p><dfn data-term=\"laminar\">Laminaarisessa virtauksessa</dfn> jokainen nestehiukkanen seuraa tasaista rataa, <dfn data-term=\"streamline\">virtaviivaa</dfn>, eivätkä radat leikkaa toisiaan. <dfn data-term=\"turbulent\">Turbulentissa virtauksessa</dfn> virtaviivat risteävät epäsäännöllisesti ja syntyy <b>pyörteitä</b>.</p>") },
          { id: "t2-types-fig", type: "figure", svg: { en: profileSvg(false), fi: profileSvg(true) },
            caption: T("Velocity profiles over the pipe cross-section: the mean speed is 0.5 v_max in laminar flow, (0.8 … 0.9) v_max in turbulent flow and v_max in plug flow.",
              "Nopeusprofiilit putken poikkileikkauksessa: keskinopeus on laminaarissa 0,5 v_max, turbulentissa (0,8 … 0,9) v_max ja tulppavirtauksessa v_max."),
            alt: T("Three pipes with parabolic, flat-topped and uniform velocity arrows", "Kolme putkea: paraabelinmuotoinen, tasaisempi ja tasainen nopeusjakauma") },
          { id: "t2-types-c1", type: "callout", kind: "info", html: T(
            "Real flows are almost always turbulent in practice (for example water in a 110 mm pipe above about 0.03 m/s). Later in this topic you will meet the Reynolds number that decides it.",
            "Käytännössä todelliset virtaukset ovat lähes aina turbulentteja (esimerkiksi vesi 110 mm:n putkessa jo noin 0,03 m/s:n nopeudesta ylöspäin). Myöhemmin tässä aiheessa tutustut Reynoldsin lukuun, joka ratkaisee asian.") },
          { id: "t2-types-q1", type: "question", q: "t2-q1" }
        ]
      },
      // ---------------------------------------------------------------- 2
      {
        id: "t2-rate", title: T("Volume and mass flow rate", "Tilavuusvirta ja massavirta"),
        blocks: [
          { id: "t2-rate-p1", type: "text", html: T(
            "<p>The <dfn data-term=\"volflow\">volume flow rate</dfn> <f>q_V</f> is the volume of fluid that passes a cross-section in a given time. In time <f>t</f> the fluid moves a distance <f>s = vt</f>, so the volume that passed is <f>V = Avt</f>.</p>",
            "<p><dfn data-term=\"volflow\">Tilavuusvirta</dfn> <f>q_V</f> on nestetilavuus, joka kulkee poikkileikkauksen läpi tietyssä ajassa. Ajassa <f>t</f> neste etenee matkan <f>s = vt</f>, joten läpi kulkenut tilavuus on <f>V = Avt</f>.</p>") },
          { id: "t2-rate-f1", type: "formula", key: true, tex: "q_V = {V}/{t} = {Avt}/{t} = A·v", label: T("Volume flow rate", "Tilavuusvirta"),
            legend: [["q_V", T("volume flow rate", "tilavuusvirta"), "m³/s"], ["A", T("cross-section area", "poikkipinta-ala"), "m²"], ["v", T("average flow velocity", "keskimääräinen virtausnopeus"), "m/s"]] },
          { id: "t2-rate-p2", type: "text", html: T(
            "<p>The unit is m³/s, also L/s (1 m³/s = 1000 L/s). The differential definition is <f>q_V = {dV}/{dt}</f>.</p>",
            "<p>Yksikkö on m³/s, myös L/s (1 m³/s = 1000 L/s). Differentiaalinen määritelmä on <f>q_V = {dV}/{dt}</f>.</p>") },
          { id: "t2-rate-ex1", type: "example", title: T("Water main", "Vesijohto"),
            problem: T("The main pipe of a water pipeline is 110 mm in diameter and the average speed of water is 2.5 m/s. Calculate the volume flow rate.",
              "Vesijohdon runkoputken halkaisija on 110 mm ja veden keskinopeus 2,5 m/s. Laske tilavuusvirta."),
            given: ["d = 110 mm", "v = 2.5 m/s"],
            steps: [T("Area of the circle:", "Ympyrän pinta-ala:"), { tex: "A = {πd^2}/{4} = {π·(0.110 m)^2}/{4} = 9.50·10^{-3} m^2" }, { tex: "q_V = A·v = 9.50·10^{-3} m^2 · 2.5 m/s ≈ 0.024 m^3/s" }],
            result: T("q_V ≈ 0.024 m³/s ≈ 24 L/s", "q_V ≈ 0,024 m³/s ≈ 24 L/s") },
          { id: "t2-rate-p3", type: "text", html: T(
            "<p>The <dfn data-term=\"massflow\">mass flow rate</dfn> <f>q_m</f> is the mass that passes per second. Since <f>m = ρV</f>:</p>",
            "<p><dfn data-term=\"massflow\">Massavirta</dfn> <f>q_m</f> on sekunnissa kulkeva massa. Koska <f>m = ρV</f>:</p>") },
          { id: "t2-rate-f2", type: "formula", key: true, tex: "q_m = {dm}/{dt} ≈ {m}/{t} = {ρV}/{t} = ρ·q_V", label: T("Mass flow rate", "Massavirta"),
            legend: [["q_m", T("mass flow rate", "massavirta"), "kg/s"], ["ρ", T("density", "tiheys"), "kg/m³"]] },
          { id: "t2-rate-ex2", type: "example", title: T("Oil pipeline", "Öljyputki"),
            problem: T("Oil (density 880 kg/m³) flows at 1.5 m/s in a 55 mm pipeline. Calculate the mass flow rate.",
              "Öljy (tiheys 880 kg/m³) virtaa 1,5 m/s nopeudella 55 mm:n putkessa. Laske massavirta."),
            given: ["ρ = 880 kg/m³", "d = 55 mm", "v = 1.5 m/s"],
            steps: [{ tex: "q_m = ρ q_V = {ρπd^2v}/{4} = {880·π·(0.055)^2·1.5}/{4}" }, { tex: "q_m ≈ 3.1 kg/s" }],
            result: T("q_m ≈ 3.1 kg/s (the slide gives 3.2 kg/s; see the errata)", "q_m ≈ 3,1 kg/s (kalvossa 3,2 kg/s; ks. virhetaulukko)") },
          { id: "t2-rate-q2", type: "question", q: "t2-q2" },
          { id: "t2-rate-q3", type: "question", q: "t2-q3" }
        ]
      },
      // ---------------------------------------------------------------- 3
      {
        id: "t2-cont", title: T("Continuity: narrow the pipe, speed up the flow", "Jatkuvuus: kavenna putkea, nopeuta virtausta"),
        blocks: [
          { id: "t2-cont-p1", type: "text", html: T(
            "<p>If a pipe has no holes or tanks, the volume flow rate is the same at every cross-section (laminar flow, no friction). This is the <dfn data-term=\"continuity\">equation of continuity</dfn>:</p>",
            "<p>Jos putkessa ei ole reikiä eikä säiliöitä, tilavuusvirta on sama joka poikkileikkauksessa (laminaarinen virtaus, ei kitkaa). Tämä on <dfn data-term=\"continuity\">jatkuvuusyhtälö</dfn>:</p>") },
          { id: "t2-cont-f1", type: "formula", key: true, tex: "q_V = A_1 v_1 = A_2 v_2 = constant", label: T("Equation of continuity", "Jatkuvuusyhtälö"),
            legend: [["A", T("cross-section area", "poikkipinta-ala"), "m²"], ["v", T("flow velocity", "virtausnopeus"), "m/s"]] },
          { id: "t2-cont-p2", type: "text", html: T(
            "<p>Because <f>A = {πd^2}/{4}</f>, the speed grows with the <b>square</b> of the diameter ratio: <f>v_2 = (d_1/d_2)^2 · v_1</f>. Halve the diameter and the speed becomes four times larger.</p>",
            "<p>Koska <f>A = {πd^2}/{4}</f>, nopeus kasvaa halkaisijasuhteen <b>neliössä</b>: <f>v_2 = (d_1/d_2)^2 · v_1</f>. Puolitettaessa halkaisija nopeus nelinkertaistuu.</p>") },
          // canonical reactive diagram of the course
          { id: "t2-cont-pipe", type: "interactive", widget: "pipeflow",
            title: T("Pipe flow: narrow the pipe", "Putkivirtaus: kavenna putkea"),
            caption: T("Drag the slider d₂ (or the narrow part) to narrow the pipe. The particles speed up (continuity) and the pressure column over the narrow part drops (Bernoulli). The start values are the slide example: 110 mm → 55 mm at 1.45 m/s gives 5.80 m/s.",
              "Vedä liukusäädintä d₂ (tai kapeaa osaa) ja kavenna putkea. Hiukkaset nopeutuvat (jatkuvuus) ja kapean kohdan painepylväs laskee (Bernoulli). Alkuarvot ovat kalvon esimerkki: 110 mm → 55 mm nopeudella 1,45 m/s antaa 5,80 m/s."),
            config: { mode: "venturi" } },
          { id: "t2-cont-ex1", type: "example", title: T("Pipe reduces from 110 mm to 55 mm", "Putki kapenee 110 mm:stä 55 mm:iin"),
            problem: T("The diameter of a water pipe is 110 mm and the average velocity 1.45 m/s. The pipe narrows to 55 mm. Calculate the velocity there.",
              "Vesiputken halkaisija on 110 mm ja keskinopeus 1,45 m/s. Putki kapenee 55 mm:iin. Laske nopeus siinä."),
            given: ["d_1 = 110 mm", "v_1 = 1.45 m/s", "d_2 = 55 mm"],
            steps: [{ tex: "v_2 = {A_1}/{A_2}·v_1 = (d_1/d_2)^2 · v_1" }, { tex: "v_2 = (110/55)^2 · 1.45 m/s = 4 · 1.45 m/s = 5.80 m/s" }],
            result: T("v₂ = 5.80 m/s", "v₂ = 5,80 m/s") },
          { id: "t2-cont-q4", type: "question", q: "t2-q4" },
          { id: "t2-cont-q5", type: "question", q: "t2-q5" },
          { id: "t2-cont-q6", type: "question", q: "t2-q6" }
        ]
      },
      // ---------------------------------------------------------------- 4
      {
        id: "t2-bern", title: T("Bernoulli’s equation", "Bernoullin yhtälö"),
        blocks: [
          { id: "t2-bern-p1", type: "text", html: T(
            "<p><dfn data-term=\"bernoulli\">Bernoulli’s equation</dfn> (Daniel Bernoulli, 1700–1782) relates density, velocity, pressure and height in a pipeline. It follows from conservation of energy: the <b>total pressure</b> is the same at every point of the pipeline.</p>",
            "<p><dfn data-term=\"bernoulli\">Bernoullin yhtälö</dfn> (Daniel Bernoulli, 1700–1782) yhdistää putkistossa tiheyden, nopeuden, paineen ja korkeuden. Se seuraa energian säilymisestä: <b>kokonaispaine</b> on putkiston jokaisessa kohdassa sama.</p>") },
          { id: "t2-bern-f1", type: "formula", key: true, tex: "p_1 + ρgh_1 + {1}/{2}ρv_1^2 = p_2 + ρgh_2 + {1}/{2}ρv_2^2 = constant", label: T("Bernoulli’s equation (ideal flow)", "Bernoullin yhtälö (ideaalivirtaus)"),
            legend: [["p", T("static pressure", "staattinen paine"), "Pa"], ["ρgh", T("hydrostatic pressure", "hydrostaattinen paine"), "Pa"], ["½ρv²", T("dynamic pressure p_D", "dynaaminen paine p_D"), "Pa"]] },
          { id: "t2-bern-p2", type: "text", html: T(
            "<p>Every term has the unit of pressure. <dfn data-term=\"statpress\">Static pressure</dfn> is needed to move the fluid, hydrostatic pressure to change its potential energy and <dfn data-term=\"dynpress\">dynamic pressure</dfn> belongs to its kinetic energy. Simplify the equation to the situation at hand: three cases follow.</p>",
            "<p>Jokaisen termin yksikkö on paine. <dfn data-term=\"statpress\">Staattinen paine</dfn> tarvitaan nesteen liikuttamiseen, hydrostaattinen paine potentiaalienergian muuttamiseen ja <dfn data-term=\"dynpress\">dynaaminen paine</dfn> kuuluu liike-energialle. Yhtälö sievennetään kulloiseenkin tilanteeseen: kolme tapausta.</p>") },
          { id: "t2-bern-tab", type: "table", caption: T("Special cases of Bernoulli’s equation", "Bernoullin yhtälön erikoistapaukset"),
            head: [T("Case", "Tapaus"), T("Result", "Tulos"), T("Meaning", "Merkitys")],
            rows: [
              [T("1. same height, pipe narrows (h₁ = h₂)", "1. sama korkeus, putki kapenee (h₁ = h₂)"), { tex: "p_1 + {1}/{2}ρv_1^2 = p_2 + {1}/{2}ρv_2^2" }, T("faster flow, lower static pressure", "nopeampi virtaus, pienempi staattinen paine")],
              [T("2. constant diameter, height changes (v₁ = v₂)", "2. vakiohalkaisija, korkeus muuttuu (v₁ = v₂)"), { tex: "p_1 + ρgh_1 = p_2 + ρgh_2" }, T("pressure falls with height by ρgΔh", "paine laskee korkeuden mukana määrän ρgΔh")],
              [T("3. same diameter and height", "3. sama halkaisija ja korkeus"), { tex: "p_1 = p_2" }, T("no friction means no pressure drop (real pipes always have a drop)", "ei kitkaa, ei paine-eroa (todellisissa putkissa aina paine-ero)")]
            ] },
          { id: "t2-bern-ex1", type: "example", title: T("Level pipe that narrows", "Vaakaputki kapenee"),
            problem: T("Water flows in a level pipe from a wide to a narrow section. At the wide section p₁ = 120 kPa and v₁ = 1.4 m/s. The diameters are d₁ = 80 mm and d₂ = 30 mm. Calculate v₂ and p₂.",
              "Vesi virtaa vaakasuoran putken leveästä osasta kapeaan. Leveässä osassa p₁ = 120 kPa ja v₁ = 1,4 m/s. Halkaisijat ovat d₁ = 80 mm ja d₂ = 30 mm. Laske v₂ ja p₂."),
            given: ["p_1 = 120 kPa", "v_1 = 1.4 m/s", "d_1 = 80 mm", "d_2 = 30 mm", "ρ = 1000 kg/m³"],
            steps: [
              T("Speed from the continuity equation:", "Nopeus jatkuvuusyhtälöstä:"),
              { tex: "v_2 = (d_1/d_2)^2 · v_1 = (80/30)^2 · 1.4 m/s ≈ 9.96 m/s" },
              T("Bernoulli with h₁ = h₂:", "Bernoulli, kun h₁ = h₂:"),
              { tex: "p_2 = p_1 + {1}/{2}ρ(v_1^2 − v_2^2) = 120 kPa + {1}/{2}·1000·(1.4^2 − 9.96^2) Pa" },
              { tex: "p_2 ≈ 120 kPa − 48.6 kPa ≈ 71 kPa" }],
            result: T("v₂ ≈ 9.96 m/s, p₂ ≈ 71 kPa: faster flow, lower static pressure.", "v₂ ≈ 9,96 m/s, p₂ ≈ 71 kPa: nopeampi virtaus, pienempi staattinen paine.") },
          { id: "t2-bern-calc", type: "interactive", widget: "readout",
            title: T("Bernoulli calculator for the level pipe", "Bernoulli-laskin vaakaputkelle"),
            caption: T("Change the pipe sections and see the speed and the static pressure of the narrow part. The defaults are the example above.",
              "Muuta putken osia ja katso kapean osan nopeus ja staattinen paine. Oletusarvot ovat yllä oleva esimerkki."),
            config: {
              params: [
                { id: "p1", tex: "p_1", min: 20, max: 400, step: 1, value: 120, unit: "kPa" },
                { id: "v1", tex: "v_1", min: 0.2, max: 5, step: 0.1, value: 1.4, unit: "m/s" },
                { id: "d1", tex: "d_1", min: 20, max: 120, step: 1, value: 80, unit: "mm" },
                { id: "d2", tex: "d_2", min: 10, max: 120, step: 1, value: 30, unit: "mm" }],
              outputs: function (v) {
                var v2 = v.v1 * Math.pow(v.d1 / v.d2, 2), p2 = v.p1 * 1000 + 0.5 * 1000 * (v.v1 * v.v1 - v2 * v2);
                return [{ tex: "v_2", value: v2, unit: "m/s" }, { tex: "p_2", value: p2 / 1000, unit: "kPa" },
                  { tex: "p_{D2} = {1}/{2}ρv_2^2", value: 0.5 * 1000 * v2 * v2 / 1000, unit: "kPa" },
                  { label: T("Total pressure p + p_D (constant)", "Kokonaispaine p + p_D (vakio)"), value: (p2 + 0.5 * 1000 * v2 * v2) / 1000, unit: "kPa" },
                  { label: T("Warning", "Varoitus"), value: p2 < 0 ? T("p₂ < 0: ideal model fails, cavitation", "p₂ < 0: ideaalimalli ei päde, kavitaatio") : T("none", "ei") }];
              } } },
          { id: "t2-bern-c1", type: "callout", kind: "warn", html: T(
            "In case 3 the equation says <f>p_1 = p_2</f>: a frictionless fluid would need no pressure difference to flow through a level pipe (only a superfluid such as helium below 4 K comes close). Real fluids always lose pressure; that comes at the end of this topic.",
            "Tapauksessa 3 yhtälö antaa <f>p_1 = p_2</f>: kitkaton neste virtaisi vaakaputkessa ilman paine-eroa (vain superneste, kuten helium alle 4 K:n, on lähellä tätä). Todelliset nesteet menettävät aina painetta; siihen palataan aiheen lopussa.") },
          { id: "t2-bern-q7", type: "question", q: "t2-q7" },
          { id: "t2-bern-q8", type: "question", q: "t2-q8" }
        ]
      },
      // ---------------------------------------------------------------- 5
      {
        id: "t2-apps", title: T("Applications: meters, outflow and pumps", "Sovelluksia: mittarit, ulosvirtaus ja pumput"),
        blocks: [
          { id: "t2-apps-h1", type: "h", text: T("Venturi flowmeter", "Venturimittari") },
          { id: "t2-apps-p1", type: "text", html: T(
            "<p>A <dfn data-term=\"venturi\">Venturi tube</dfn> measures the flow of gases, liquids and vapours. A pressure difference <f>Δp = ρgh</f> (or a differential-pressure transmitter) is measured between the wide and the narrow point. With continuity and Bernoulli the speed in the wide part is:</p>",
            "<p><dfn data-term=\"venturi\">Venturiputki</dfn> mittaa kaasujen, nesteiden ja höyryjen virtausta. Leveän ja kapean kohdan välillä mitataan paine-ero <f>Δp = ρgh</f> (tai painelähettimellä). Jatkuvuudesta ja Bernoullista saadaan nopeus leveässä osassa:</p>") },
          { id: "t2-apps-f1", type: "formula", key: true, tex: "v_1 = sqrt{{2Δp}/{ρ({A_1^2}/{A_2^2} − 1)}} = sqrt{{2gh}/{({d_1^4}/{d_2^4}) − 1}}", label: T("Venturi tube", "Venturiputki"),
            legend: [["Δp", T("pressure difference", "paine-ero"), "Pa"], ["h", T("height difference of the liquid columns", "nestepylväiden korkeusero"), "m"]] },
          { id: "t2-apps-venturi", type: "interactive", widget: "pipeflow", title: T("Venturi flowmeter with a differential-pressure transmitter", "Venturimittari ja paine-erolähetin"),
            caption: T("Change the flow speed and the throat diameter: the transmitter shows Δp, which is what the plant system turns into a flow reading. The slide example is d₁ = 80 mm, d₂ = 30 mm, v₁ = 1.4 m/s.",
              "Muuta virtausnopeutta ja kurkun halkaisijaa: lähetin näyttää paine-eron Δp, jonka automaatiojärjestelmä muuttaa virtausluvuksi. Kalvon esimerkki: d₁ = 80 mm, d₂ = 30 mm, v₁ = 1,4 m/s."),
            config: { mode: "venturi", values: { d1: 0.08, d2: 0.03, v1: 1.4 } } },
          { id: "t2-apps-c1", type: "callout", kind: "tip", title: T("Why Venturi?", "Miksi venturi?"), html: T(
            "Simple construction, long life, easy to install, small permanent pressure loss, only a short straight pipe needed before and after, and it suits liquids, gases and vapours.",
            "Yksinkertainen rakenne, pitkä käyttöikä, helppo asentaa, pieni pysyvä painehäviö, vain lyhyt suora putkiosa tarvitaan ennen ja jälkeen, ja sopii nesteille, kaasuille ja höyryille.") },
          { id: "t2-apps-q9", type: "question", q: "t2-q9" },
          { id: "t2-apps-q10", type: "question", q: "t2-q10" },

          { id: "t2-apps-h2", type: "h", text: T("Pitot tube", "Pitot-putki") },
          { id: "t2-apps-p2", type: "text", html: T(
            "<p>A <dfn data-term=\"pitot\">Pitot tube</dfn> faces the flow. At the tip the fluid stops (<f>v_2 ≈ 0</f>), so the pressure there is <f>p_2 = p_1 + {1}/{2}ρv_1^2</f>. The difference is the dynamic pressure, measured with a pressure sensor or a liquid manometer:</p>",
            "<p><dfn data-term=\"pitot\">Pitot-putki</dfn> osoittaa virtausta vastaan. Kärjessä neste pysähtyy (<f>v_2 ≈ 0</f>), joten paine on siellä <f>p_2 = p_1 + {1}/{2}ρv_1^2</f>. Ero on dynaaminen paine, joka mitataan paineanturilla tai nestemanometrillä:</p>") },
          { id: "t2-apps-f2", type: "formula", key: true, tex: "v_1 = sqrt{{2Δp}/{ρ}} = sqrt{{2ρ_n g h}/{ρ}}", label: T("Pitot tube", "Pitot-putki"),
            legend: [["ρ", T("density of the flowing fluid", "virtaavan aineen tiheys"), "kg/m³"], ["ρ_n", T("density of the manometer liquid", "manometrinesteen tiheys"), "kg/m³"]] },
          { id: "t2-apps-pitot", type: "interactive", widget: "pipeflow", title: T("Pitot tube in an air duct", "Pitot-putki ilmakanavassa"),
            caption: T("Change the air speed in the duct and see the liquid column h of the manometer. Pitot tubes are used in aircraft, ships and wind tunnels (aircraft versions are heated); they need a long straight pipe before them and must point along the flow.",
              "Muuta ilman nopeutta kanavassa ja katso manometrin nestepylvään h korkeutta. Pitot-putkia käytetään lentokoneissa, laivoissa ja tuulitunneleissa (lentokoneissa lämmitettyinä); niiden eteen tarvitaan pitkä suora putkiosa ja ne on suunnattava virtauksen suuntaan."),
            config: { mode: "pitot" } },
          { id: "t2-apps-q11", type: "question", q: "t2-q11" },
          { id: "t2-apps-q12", type: "question", q: "t2-q12" },

          { id: "t2-apps-h3", type: "h", text: T("Torricelli: outflow from a tank", "Torricelli: ulosvirtaus säiliöstä") },
          { id: "t2-apps-p3", type: "text", html: T(
            "<p><dfn data-term=\"torricelli\">Torricelli’s theorem</dfn> gives the speed of liquid leaving an opening at the bottom of a reservoir. The surface is wide, so <f>v_1 ≈ 0</f>, and Bernoulli gives</p>",
            "<p><dfn data-term=\"torricelli\">Torricellin laki</dfn> antaa säiliön pohjan aukosta ulosvirtaavan nesteen nopeuden. Pinta on leveä, joten <f>v_1 ≈ 0</f>, ja Bernoullista saadaan</p>") },
          { id: "t2-apps-f3", type: "formula", key: true, tex: "v_2 = sqrt{{2(p_1 − p_2)}/{ρ} + 2gh},   open tank (p_1 = p_2):   v_2 = sqrt{2gh}", label: T("Torricelli’s theorem", "Torricellin laki"),
            legend: [["h", T("depth of the opening below the surface", "aukon syvyys pinnan alapuolella"), "m"]] },
          { id: "t2-apps-p4", type: "text", html: T("<p>In practice a discharge coefficient is needed: it depends on the shape of the opening and on the viscosity. The volume flow rate through an opening of diameter <f>d</f> is <f>q_V = {πd^2}/{4}·sqrt{2gh}</f>.</p>",
            "<p>Käytännössä tarvitaan purkauskerroin, joka riippuu aukon muodosta ja viskositeetista. Halkaisijaltaan <f>d</f>:n aukon läpi virtaava tilavuusvirta on <f>q_V = {πd^2}/{4}·sqrt{2gh}</f>.</p>") },
          { id: "t2-apps-ex1", type: "example", title: T("Reservoir with a changing level", "Säiliö, jonka pinta vaihtelee"),
            problem: T("The water level of a reservoir changes between 2.5 m and 3.5 m above the outlet pipe (d₂ = 35 mm). The gas above the water is at normal atmospheric pressure. Find the largest and the smallest volume flow rate.",
              "Vesisäiliön pinta vaihtelee 2,5 m ja 3,5 m välillä ulosvirtausputken yläpuolella (d₂ = 35 mm). Veden päällä on normaali ilmanpaine. Laske suurin ja pienin tilavuusvirta."),
            given: ["d_2 = 35 mm", "h = 2.5 … 3.5 m", "g = 9.81 m/s²"],
            steps: [{ tex: "q_{V,max} = {π·(0.035)^2}/{4}·sqrt{2·9.81·3.5} ≈ 7.97 L/s" }, { tex: "q_{V,min} = {π·(0.035)^2}/{4}·sqrt{2·9.81·2.5} ≈ 6.74 L/s" }],
            result: T("6.7 L/s ≤ q_V ≤ 8.0 L/s. The flow depends only on the water level.", "6,7 L/s ≤ q_V ≤ 8,0 L/s. Virtaus riippuu vain pinnan korkeudesta.") },
          { id: "t2-apps-torr", type: "interactive", widget: "pipeflow", title: T("Draining tank", "Tyhjenevä säiliö"),
            caption: T("The level sinks as the tank drains and the outflow slows (v ∝ √h). The defaults are the example: h = 3.5 m, d = 35 mm gives 7.97 L/s.",
              "Pinta laskee säiliön tyhjentyessä ja ulosvirtaus hidastuu (v ∝ √h). Oletusarvot ovat esimerkki: h = 3,5 m, d = 35 mm antaa 7,97 L/s."),
            config: { mode: "torricelli" } },
          { id: "t2-apps-q13", type: "question", q: "t2-q13" },
          { id: "t2-apps-q14", type: "question", q: "t2-q14" },

          { id: "t2-apps-h4", type: "h", text: T("Motor-driven pump", "Moottorikäyttöinen pumppu") },
          { id: "t2-apps-p5", type: "text", html: T(
            "<p>A pump adds the pressure difference <f>Δp_P</f> to Bernoulli’s equation:</p>",
            "<p>Pumppu lisää Bernoullin yhtälöön paine-eron <f>Δp_P</f>:</p>") },
          { id: "t2-apps-f4", type: "formula", key: true, tex: "p_1 + {1}/{2}ρv_1^2 + Δp_P = p_2 + ρgh + {1}/{2}ρv_2^2", label: T("Bernoulli’s equation with a pump", "Bernoullin yhtälö pumpun kanssa") },
          { id: "t2-apps-f5", type: "formula", tex: "Δp_P = p_2 − p_1 + ρgh + {1}/{2}ρ(v_2^2 − v_1^2),   P_A = Δp_P·q_V,   P_0 = {P_A}/{η}", label: T("Pump pressure, output power, input power", "Pumpun paine, antoteho, ottoteho"),
            legend: [["P_A", T("hydraulic output power", "hydraulinen antoteho"), "W"], ["P_0", T("input power of the motor drive", "moottorikäytön ottoteho"), "W"], ["η", T("<dfn data-term=\"pumpeff\">pump efficiency</dfn>", "<dfn data-term=\"pumpeff\">pumpun hyötysuhde</dfn>"), ""]] },
          { id: "t2-apps-ex2", type: "example", title: T("Pumping to an elevated tank", "Pumppaus ylös säiliöön"),
            problem: T("Water is pumped from an open tank to a second tank 8.5 m higher at 15 L/s. The pressure in the second tank is 0.20 MPa (absolute). The pipe is 50 mm at the pump output and 40 mm at the inlet of the second tank. Friction is neglected. Find (a) the pressure difference of the pump and (b) the input power at an efficiency of 75 %.",
              "Vettä pumpataan avoimesta säiliöstä 8,5 m ylempänä olevaan toiseen säiliöön 15 L/s. Toisen säiliön paine on 0,20 MPa (absoluuttinen). Putken halkaisija on pumpun ulostulossa 50 mm ja toisen säiliön sisääntulossa 40 mm. Kitka jätetään huomiotta. Laske (a) pumpun paine-ero ja (b) ottoteho hyötysuhteella 75 %."),
            given: ["q_V = 15 L/s", "h = 8.5 m", "p_2 = 200 kPa", "p_1 = p_0 = 101.3 kPa", "d_1 = 50 mm", "d_2 = 40 mm", "η = 0.75"],
            steps: [
              { tex: "v_1 = {4q_V}/{πd_1^2} ≈ 7.64 m/s,   v_2 = {4q_V}/{πd_2^2} ≈ 11.9 m/s" },
              { tex: "Δp_P = p_2 − p_1 + ρgh + {1}/{2}ρ(v_2^2 − v_1^2) ≈ 98.7 + 83.4 + 42.1 kPa ≈ 224 kPa" },
              { tex: "P_A = Δp_P·q_V = 224 kPa · 0.015 m^3/s ≈ 3.36 kW" },
              { tex: "P_0 = {P_A}/{η} = {3.36 kW}/{0.75} ≈ 4.48 kW" }],
            result: T("Δp_P ≈ 224 kPa (slide: 225 kPa), P₀ ≈ 4.5 kW.", "Δp_P ≈ 224 kPa (kalvo: 225 kPa), P₀ ≈ 4,5 kW.") },
          { id: "t2-apps-pump", type: "interactive", widget: "pipeflow", title: T("Pump with motor: pressure, hydraulic and electrical power", "Pumppu ja moottori: paine, hydraulinen ja sähköinen teho"),
            caption: T("Change the flow, the lift, the tank pressure and the efficiency. The electrical input power P₀ is what the motor, the cable and the drive must deliver; the rest is lost as heat. The defaults are the example above.",
              "Muuta virtaamaa, nostokorkeutta, säiliön painetta ja hyötysuhdetta. Sähköinen ottoteho P₀ on se, minkä moottorin, kaapelin ja taajuusmuuttajan on annettava; loput menee lämpönä hukkaan. Oletusarvot ovat yllä oleva esimerkki."),
            config: { mode: "pump" } },
          { id: "t2-apps-q15", type: "question", q: "t2-q15" },
          { id: "t2-apps-q16", type: "question", q: "t2-q16" }
        ]
      },
      // ---------------------------------------------------------------- 6
      {
        id: "t2-visc", title: T("Viscosity and Poiseuille’s equation", "Viskositeetti ja Poiseuillen yhtälö"),
        blocks: [
          { id: "t2-visc-p1", type: "text", html: T(
            "<p>Real fluids lose pressure in pipelines, and pumps must make up for it. The cause is <dfn data-term=\"viscosity\">viscosity</dfn> (internal friction): in liquids it comes from cohesive forces between molecules (and between fluid and wall), in gases from collisions between molecules. Between two plates, a force <f>F</f> is needed to drag the upper one at speed <f>v</f>; the layers move with a <b>velocity gradient</b> <f>v/l</f>:</p>",
            "<p>Todelliset nesteet menettävät painetta putkistoissa, ja pumppujen täytyy korvata häviö. Syynä on <dfn data-term=\"viscosity\">viskositeetti</dfn> (sisäinen kitka): nesteissä se johtuu molekyylien välisistä koheesiovoimista (ja nesteen sekä seinämän välisistä), kaasuissa molekyylien törmäyksistä. Kahden levyn välissä ylälevyn vetämiseen nopeudella <f>v</f> tarvitaan voima <f>F</f>; kerrokset liikkuvat <b>nopeusgradientilla</b> <f>v/l</f>:</p>") },
          { id: "t2-visc-f1", type: "formula", key: true, tex: "F = η·A·{v}/{l}", label: T("Viscous force", "Viskositeettivoima"),
            legend: [["η", T("coefficient of viscosity", "viskositeettikerroin"), "Pa·s"], ["A", T("plate area", "levyn ala"), "m²"], ["l", T("thickness of the fluid layer", "nestekerroksen paksuus"), "m"]] },
          { id: "t2-visc-p2", type: "text", html: T("<p>The unit is <f>[η] = N·s/m^2 = Pa·s</f>. Viscosity depends on temperature; oils depend on it strongly (water at 0 °C is almost twice as viscous as at 20 °C).</p>",
            "<p>Yksikkö on <f>[η] = N·s/m^2 = Pa·s</f>. Viskositeetti riippuu lämpötilasta; öljyillä riippuvuus on voimakas (0 °C:n vesi on lähes kaksi kertaa viskoosimpaa kuin 20 °C:n).</p>") },
          { id: "t2-visc-tab", type: "table", caption: T("Coefficients of viscosity η (1 Pa·s = 10 P = 1000 cP)", "Viskositeettikertoimet η (1 Pa·s = 10 P = 1000 cP)"),
            head: [T("Fluid (temperature in °C)", "Aine (lämpötila °C:ssa)"), T("η (Pa·s)", "η (Pa·s)")],
            rows: [
              [T("Water (0°)", "Vesi (0°)"), { tex: "1.8 · 10^{-3}" }], [T("Water (20°)", "Vesi (20°)"), { tex: "1.0 · 10^{-3}" }], [T("Water (100°)", "Vesi (100°)"), { tex: "0.3 · 10^{-3}" }],
              [T("Whole blood (37°)", "Kokoveri (37°)"), { tex: "≈ 4 · 10^{-3}" }], [T("Blood plasma (37°)", "Veriplasma (37°)"), { tex: "≈ 1.5 · 10^{-3}" }],
              [T("Ethyl alcohol (20°)", "Etyylialkoholi (20°)"), { tex: "1.2 · 10^{-3}" }], [T("Engine oil (30°) SAE 10", "Moottoriöljy (30°) SAE 10"), { tex: "200 · 10^{-3}" }],
              [T("Glycerine (20°)", "Glyseriini (20°)"), { tex: "1500 · 10^{-3}" }], [T("Air (20°)", "Ilma (20°)"), { tex: "0.018 · 10^{-3}" }],
              [T("Hydrogen (0°)", "Vety (0°)"), { tex: "0.009 · 10^{-3}" }], [T("Water vapour (100°)", "Vesihöyry (100°)"), { tex: "0.013 · 10^{-3}" }]
            ] },
          { id: "t2-visc-ex1", type: "example", title: T("Plate on oil", "Levy öljykalvon päällä"),
            problem: T("A smooth plate of 1.0 m² moves at 0.25 m/s above a stationary oiled plate. The oil layer is 0.50 mm thick and a force of 22 N is needed. Find the viscosity of the oil.",
              "Sileä 1,0 m²:n levy liikkuu nopeudella 0,25 m/s paikallaan olevan öljytyn levyn yläpuolella. Öljykerros on 0,50 mm paksu ja vetämiseen tarvitaan 22 N. Laske öljyn viskositeetti."),
            given: ["A = 1.0 m²", "v = 0.25 m/s", "l = 0.50 mm", "F = 22 N"],
            steps: [{ tex: "η = {F·l}/{v·A} = {22 N · 0.50·10^{-3} m}/{0.25 m/s · 1.0 m^2}" }, { tex: "η = 44·10^{-3} Pa·s = 44 mPa·s" }],
            result: T("η = 44 mPa·s", "η = 44 mPa·s") },
          { id: "t2-visc-h", type: "h", text: T("Laminar flow in a round pipe: Poiseuille", "Laminaarinen virtaus pyöreässä putkessa: Poiseuille") },
          { id: "t2-visc-p3", type: "text", html: T(
            "<p>In viscous laminar flow the speed over the cross-section is a parabola, <f>v(r) = v_max [1 − (r/R)^2]</f> (the mean speed is <f>0.5v_max</f>). The volume flow is given by <dfn data-term=\"poiseuille\">Poiseuille’s equation</dfn>, where <f>Δp/Δz</f> is the <dfn data-term=\"pressgrad\">pressure gradient</dfn> along the pipe:</p>",
            "<p>Viskoosissa laminaarisessa virtauksessa nopeus poikkileikkauksessa on paraabeli, <f>v(r) = v_max [1 − (r/R)^2]</f> (keskinopeus on <f>0,5v_max</f>). Tilavuusvirran antaa <dfn data-term=\"poiseuille\">Poiseuillen yhtälö</dfn>, jossa <f>Δp/Δz</f> on putken suuntainen <dfn data-term=\"pressgrad\">painegradientti</dfn>:</p>") },
          { id: "t2-visc-f2", type: "formula", key: true, tex: "q_V = {πR^4}/{8η}·{Δp}/{Δz}", label: T("Poiseuille’s equation", "Poiseuillen yhtälö"),
            legend: [["R", T("pipe radius", "putken säde"), "m"], ["Δp/Δz", T("pressure gradient", "painegradientti"), "Pa/m"]] },
          { id: "t2-visc-c1", type: "callout", kind: "key", html: T("The volume flow is proportional to <f>R^4</f>! Double the radius and the flow is 16 times larger at the same pressure gradient. That is why big flows (a nuclear plant’s cooling system, the pumps feeding the wet end of a paper machine) need wide pipes.",
            "Tilavuusvirta on verrannollinen suureeseen <f>R^4</f>! Kaksinkertainen säde antaa 16-kertaisen virtaaman samalla painegradientilla. Siksi suuret virtaamat (ydinvoimalan jäähdytys, paperikoneen märän pään pumput) vaativat leveitä putkia.") },
          { id: "t2-visc-calc", type: "interactive", widget: "readout", title: T("Poiseuille calculator (oil in a pipe)", "Poiseuille-laskin (öljy putkessa)"),
            caption: T("Change the radius, the pressure gradient and the viscosity of oil (ρ = 880 kg/m³). Note how strongly the radius matters, and that the equation is valid only while the flow is laminar (Re below 2000).",
              "Muuta sädettä, painegradienttia ja öljyn viskositeettia (ρ = 880 kg/m³). Huomaa, kuinka voimakkaasti säde vaikuttaa ja että yhtälö pätee vain laminaarille virtaukselle (Re alle 2000)."),
            config: {
              params: [
                { id: "R", tex: "R", min: 2, max: 30, step: 0.5, value: 10, unit: "mm" },
                { id: "g", tex: "{Δp}/{Δz}", min: 100, max: 20000, value: 2000, unit: "Pa/m", log: true },
                { id: "eta", tex: "η", min: 20, max: 500, value: 100, unit: "mPa·s", log: true }],
              outputs: function (v) {
                var R = v.R / 1000, eta = v.eta / 1000, q = PI * Math.pow(R, 4) / (8 * eta) * v.g, vm = v.g * R * R / (4 * eta), vmean = vm / 2, re = 880 * vmean * 2 * R / eta;
                return [{ tex: "q_V", value: q * 1000, unit: "L/s" }, { tex: "v_{max}", value: vm, unit: "m/s" }, { tex: "v_{mean} = 0.5 v_{max}", value: vmean, unit: "m/s" },
                  { tex: "R_e", value: re, unit: "" }, { label: T("Poiseuille valid?", "Pätevätkö Poiseuillen yhtälö?"), value: re < 2000 ? T("yes, laminar", "kyllä, laminaarinen") : T("no, the flow would be turbulent", "ei, virtaus olisi turbulenttia") }];
              } } },
          { id: "t2-visc-p4", type: "text", html: T(
            "<p>Practical example: a centrifugal pump of the Finnish maker Ahlström has an input power of about 850 kW and a casing diameter of about 1.5 m, with connections of 800 – 1200 mm. It delivers about 2 m³/s of water, lifts it nearly 10 m and gives a speed of 18 m/s: it feeds the wet end of a paper machine, which sprays diluted pulp on the paper web at 18.3 m/s.</p>",
            "<p>Käytännön esimerkki: suomalaisen Ahlströmin keskipakopumpun ottoteho on noin 850 kW ja pumppukotelon halkaisija noin 1,5 m, liitäntöjen halkaisijat 800 – 1200 mm. Se tuottaa noin 2 m³/s vettä, nostaa sen lähes 10 m ja antaa nopeuden 18 m/s: pumppu syöttää paperikoneen märkäpäätä, joka ruiskuttaa laimeaa massaa paperiradalle nopeudella 18,3 m/s.</p>") },
          { id: "t2-visc-q17", type: "question", q: "t2-q17" },
          { id: "t2-visc-q18", type: "question", q: "t2-q18" },
          { id: "t2-visc-q19", type: "question", q: "t2-q19" }
        ]
      },
      // ---------------------------------------------------------------- 7
      {
        id: "t2-re", title: T("Reynolds number: laminar or turbulent?", "Reynoldsin luku: laminaarinen vai turbulentti?"),
        blocks: [
          { id: "t2-re-p1", type: "text", html: T(
            "<p>Without viscosity a fluid would flow through a level pipe with no force. Laminar flow needs little energy; when the speed grows, eddies appear and both the kinetic energy and the eddies need more energy, so a larger pressure difference is needed. Turbulent flow is chaotic and has been modelled with fractals and chaos theory since the 1960s–70s. Still, the type of flow is easy to decide with a dimensionless number, the <dfn data-term=\"reynolds\">Reynolds number</dfn>:</p>",
            "<p>Ilman viskositeettia neste virtaisi vaakaputkessa ilman voimaa. Laminaarinen virtaus tarvitsee vähän energiaa; nopeuden kasvaessa syntyy pyörteitä, ja sekä liike-energia että pyörteet vaativat enemmän energiaa, joten tarvitaan suurempi paine-ero. Turbulenttinen virtaus on kaoottista, ja sitä on mallinnettu fraktaaleilla ja kaaosteorialla 1960–70-luvulta lähtien. Virtaustyyppi on silti helppo ratkaista dimensiottomalla luvulla, <dfn data-term=\"reynolds\">Reynoldsin luvulla</dfn>:</p>") },
          { id: "t2-re-f1", type: "formula", key: true, tex: "R_e = {ρ v D}/{η}", label: T("Reynolds number", "Reynoldsin luku"),
            legend: [["D", T("pipe diameter", "putken halkaisija"), "m"], ["v", T("flow velocity", "virtausnopeus"), "m/s"], ["ρ", T("density", "tiheys"), "kg/m³"], ["η", T("viscosity", "viskositeetti"), "Pa·s"]] },
          { id: "t2-re-tab", type: "table", caption: T("Type of flow in a pipe", "Virtaustyyppi putkessa"),
            head: [T("Reynolds number", "Reynoldsin luku"), T("Flow", "Virtaus")],
            rows: [[{ tex: "R_e < 2000" }, T("laminar", "laminaarinen")], [{ tex: "2000 < R_e < 3000" }, T("mixture, not clearly decidable", "sekamuoto, ei selvästi ratkaistavissa")], [{ tex: "R_e > 3000" }, T("turbulent", "turbulentti")]] },
          { id: "t2-re-w", type: "interactive", widget: "pipeflow", title: T("Laminar or turbulent?", "Laminaarinen vai turbulentti?"),
            caption: T("Change the speed, the diameter and the viscosity. Watch the particle paths and the velocity profile change at Re about 2000 – 3000. Thin oil in a small pipe stays laminar; water in a large pipe almost never does.",
              "Muuta nopeutta, halkaisijaa ja viskositeettia. Seuraa hiukkasratojen ja nopeusprofiilin muuttumista, kun Re on noin 2000 – 3000. Ohut öljy pienessä putkessa pysyy laminaarisena; vesi isossa putkessa ei juuri koskaan."),
            config: { mode: "reynolds" } },
          { id: "t2-re-ex1", type: "example", title: T("Limit speeds of a water pipe", "Vesiputken rajanopeudet"),
            problem: T("The diameter of a water pipe is 110 mm and the viscosity of the water is 1.0 mPa·s. Find the limit speeds of laminar and turbulent flow.",
              "Vesiputken halkaisija on 110 mm ja veden viskositeetti 1,0 mPa·s. Laske laminaarisen ja turbulentin virtauksen rajanopeudet."),
            given: ["D = 110 mm", "η = 1.0 mPa·s", "ρ = 1000 kg/m³"],
            steps: [{ tex: "v < {η R_e}/{ρ D} = {1.0·10^{-3} · 2000}/{1000 · 0.110} ≈ 0.018 m/s   (laminar)" }, { tex: "v > {1.0·10^{-3} · 3000}/{1000 · 0.110} ≈ 0.027 m/s   (turbulent)" }],
            result: T("Laminar below 0.018 m/s, turbulent above 0.027 m/s: normal water flow is turbulent.", "Laminaarinen alle 0,018 m/s, turbulentti yli 0,027 m/s: tavallinen vesivirtaus on turbulenttia.") },
          { id: "t2-re-q20", type: "question", q: "t2-q20" },
          { id: "t2-re-q21", type: "question", q: "t2-q21" },
          { id: "t2-re-q22", type: "question", q: "t2-q22" }
        ]
      },
      // ---------------------------------------------------------------- 8
      {
        id: "t2-loss", title: T("Bernoulli with pumps and friction", "Bernoulli pumpuilla ja kitkalla"),
        blocks: [
          { id: "t2-loss-p1", type: "text", html: T(
            "<p>When pipes, bends and valves are included, there are extra pressure losses. The complete equation is</p>",
            "<p>Kun otetaan huomioon putket, mutkat ja venttiilit, syntyy lisää painehäviöitä. Täydellinen yhtälö on</p>") },
          { id: "t2-loss-f1", type: "formula", key: true, tex: "p_1 + ρgh_1 + {1}/{2}Cρv_1^2 + Δp_P = p_2 + ρgh_2 + {1}/{2}Cρv_2^2 + Δp_l", label: T("Bernoulli with pump and losses", "Bernoulli pumpulla ja häviöillä"),
            legend: [["Δp_P", T("pressure difference of the pump", "pumpun paine-ero"), "Pa"], ["Δp_l", T("all pressure losses", "kaikki painehäviöt"), "Pa"], ["v", T("average speed", "keskinopeus"), "m/s"]] },
          { id: "t2-loss-p2", type: "text", html: T("<p>The coefficient <f>C = 2</f> for laminar flow and <f>C ≈ 1</f> for turbulent flow, so the type of flow must be found with the Reynolds number. For laminar flow the loss follows from Poiseuille’s equation; for turbulent flow <b>Fanning’s equation</b> is used:</p>",
            "<p>Kerroin <f>C = 2</f> laminaarille ja <f>C ≈ 1</f> turbulentille virtaukselle, joten virtaustyyppi on selvitettävä Reynoldsin luvulla. Laminaarisessa virtauksessa häviö saadaan Poiseuillen yhtälöstä; turbulentissa käytetään <b>Fanningin yhtälöä</b>:</p>") },
          { id: "t2-loss-f2", type: "formula", key: true, tex: "Δp_l = 8f·{L}/{D}·{1}/{2}ρv^2,   laminar: 8f = {64}/{R_e}", label: T("Friction loss of a straight pipe", "Suoran putken kitkahäviö"),
            legend: [["8f", T("<dfn data-term=\"frictionfactor\">friction factor</dfn> (tables, depends on roughness)", "<dfn data-term=\"frictionfactor\">kitkakerroin</dfn> (taulukosta, riippuu karkeudesta)"), ""], ["L", T("pipe length", "putken pituus"), "m"], ["D", T("pipe diameter", "putken halkaisija"), "m"]] },
          { id: "t2-loss-f3", type: "formula", key: true, tex: "Δp_k = k·{1}/{2}ρv^2", label: T("Local loss in a fitting (bend, valve, change of diameter)", "Paikallinen häviö osassa (mutka, venttiili, halkaisijan muutos)"),
            legend: [["k", T("local friction loss factor", "paikallinen kitkahäviökerroin"), ""]] },
          { id: "t2-loss-tab1", type: "table", caption: T("Relative roughness factors ε for pipes", "Putkien suhteelliset karkeuskertoimet ε"),
            head: [T("Material", "Materiaali"), T("Roughness factor ε", "Karkeuskerroin ε")],
            rows: [
              [T("Riveted steel", "Niitattu teräs"), "0.001 – 0.01"], [T("Concrete", "Betoni"), "0.0003 – 0.003"], [T("Wood staves", "Puulankku"), "0.0002 – 0.003"], [T("Cast iron", "Valurauta"), "0.0003"],
              [T("Galvanized iron", "Galvanoitu rauta"), "0.0002"], [T("Asphalted cast iron", "Asfaltoitu valurauta"), "0.001"], [T("Commercial steel", "Kaupallinen teräs"), "0.00005"], [T("Drawn tubing", "Vedetty putki"), T("smooth", "sileä")]] },
          { id: "t2-loss-tab2", type: "table", caption: T("Friction loss factors k in fittings", "Kitkahäviökertoimet k osissa"),
            head: [T("Fitting", "Osa"), "k"],
            rows: [
              [T("Valve, fully open: gate", "Venttiili, täysin auki: luisti"), "0.13"], [T("Valve: globe", "Venttiili: palloventtiili (globe)"), "6.0"], [T("Valve: angle", "Venttiili: kulmaventtiili"), "3.0"],
              [T("Elbow 90° standard", "Kulma 90° normaali"), "0.74"], [T("Elbow: medium sweep", "Kulma: keskisäde"), "0.5"], [T("Elbow: long radius", "Kulma: pitkä säde"), "0.25"], [T("Elbow: square", "Kulma: jyrkkä"), "1.5"],
              [T("Tee, used as elbow", "T-haara, kulmana"), "1.5"], [T("Tee, straight through", "T-haara, suoraan läpi"), "0.5"],
              [T("Entrance, tank to pipe: sharp", "Sisääntulo, säiliöstä putkeen: terävä"), "0.5"], [T("Entrance: rounded", "Sisääntulo: pyöristetty"), "0.05"]] },
          { id: "t2-loss-tab3", type: "table", caption: T("Loss factors k in contractions", "Häviökertoimet k supistuksissa"),
            head: ["D₂/D₁", "0.1", "0.3", "0.5", "0.7", "0.9"], rows: [["k", "0.36", "0.31", "0.22", "0.11", "0.02"]] },
          { id: "t2-loss-ex1", type: "example", title: T("Air-conditioning duct", "Ilmastointikanava"),
            problem: T("An air-conditioning pipe has a 75 m long straight section of diameter 110 mm and two 90° bends. The average air speed is 4.0 m/s, 8f = 0.021 for the pipe and k = 0.35 for each bend. Air: ρ = 1.3 kg/m³, η = 18 µPa·s. Find the total pressure loss.",
              "Ilmastointiputkessa on 75 m pitkä suora, halkaisijaltaan 110 mm:n osuus ja kaksi 90°:n mutkaa. Ilman keskinopeus on 4,0 m/s, 8f = 0,021 putkelle ja k = 0,35 kummallekin mutkalle. Ilma: ρ = 1,3 kg/m³, η = 18 µPa·s. Laske kokonaispainehäviö."),
            given: ["L = 75 m", "D = 110 mm", "v = 4.0 m/s", "8f = 0.021", "k = 0.35 (×2)"],
            steps: [
              { tex: "R_e = {ρ v D}/{η} = {1.3 · 0.110 · 4.0}/{18·10^{-6}} ≈ 31800 > 3000   (turbulent)" },
              { tex: "Δp_l = 0.021 · {75}/{0.110} · {1}/{2} · 1.3 · 4.0^2 ≈ 149 Pa" },
              { tex: "Δp_k = 2 · 0.35 · {1}/{2} · 1.3 · 4.0^2 ≈ 7.3 Pa" },
              { tex: "Δp_l + Δp_k ≈ 156 Pa" }],
            result: T("Total pressure loss ≈ 156 Pa; the straight pipe dominates.", "Kokonaispainehäviö ≈ 156 Pa; suora putki hallitsee.") },
          { id: "t2-loss-calc", type: "interactive", widget: "readout", title: T("Pipe friction losses of a duct", "Kanavan kitkahäviöt"),
            caption: T("Change the speed, length, diameter, friction factor and fittings. The Reynolds number tells the flow type and Δp = 8f·L/D·½ρv² gives the pressure loss. Air: ρ = 1.3 kg/m³, η = 18 µPa·s; defaults: the air duct above. Note that doubling the speed quadruples the loss.",
              "Muuta nopeutta, pituutta, halkaisijaa, kitkakerrointa ja osia. Reynoldsin luku kertoo virtaustyypin ja kaava Δp = 8f·L/D·½ρv² antaa painehäviön. Ilma: ρ = 1,3 kg/m³, η = 18 µPa·s; oletusarvot: yllä oleva ilmakanava. Huomaa, että nopeuden kaksinkertaistaminen nelinkertaistaa häviön."),
            config: {
              params: [
                { id: "v", tex: "v", min: 0.5, max: 20, step: 0.1, value: 4, unit: "m/s" },
                { id: "L", tex: "L", min: 1, max: 200, step: 1, value: 75, unit: "m" },
                { id: "D", tex: "D", min: 20, max: 500, step: 1, value: 110, unit: "mm" },
                { id: "f8", tex: "8f", min: 0.01, max: 0.1, step: 0.001, value: 0.021, unit: "" },
                { id: "kk", tex: "Σk", min: 0, max: 6, step: 0.05, value: 0.7, unit: "" }],
              outputs: function (v) {
                var rho = 1.3, eta = 18e-6, D = v.D / 1000, th = TDC.thermo;
                var re = th.reynolds(rho, v.v, D, eta), dl = th.frictionLoss(v.f8, v.L, D, rho, v.v), dk = v.kk * 0.5 * rho * v.v * v.v;
                return [{ tex: "R_e", value: re, unit: "" }, { label: T("Flow", "Virtaus"), value: re < 2000 ? T("laminar", "laminaarinen") : re > 3000 ? T("turbulent", "turbulentti") : T("transition", "siirtymäalue") },
                  { tex: "Δp_l", value: dl, unit: "Pa" }, { tex: "Δp_k", value: dk, unit: "Pa" }, { tex: "Δp_l + Δp_k", value: dl + dk, unit: "Pa" }];
              } } },
          { id: "t2-loss-c1", type: "callout", kind: "info", html: T(
            "The slides’ charts of 8f against R<sub>e</sub> show that for laminar flow 8f falls with R<sub>e</sub>, while for turbulent flow it levels out at a value set by the roughness ε/D. The values read from such charts are only for the situation they were measured in.",
            "Kalvojen 8f–R<sub>e</sub>-kuvaajat osoittavat, että laminaarisessa virtauksessa 8f pienenee R<sub>e</sub>:n kasvaessa, kun taas turbulentissa se tasaantuu karkeuden ε/D määräämään arvoon. Tällaisista kuvaajista luetut arvot pätevät vain siihen tilanteeseen, jossa ne on mitattu.") },
          { id: "t2-loss-q23", type: "question", q: "t2-q23" },
          { id: "t2-loss-q24", type: "question", q: "t2-q24" }
        ]
      }
    ],

    questions: [
      { id: "t2-q1", mode: "practice", type: "mc", difficulty: 1,
        prompt: T("What does laminar flow mean?", "Mitä laminaarinen virtaus tarkoittaa?"),
        options: [
          { id: "a", html: T("Fluid particles follow smooth paths (streamlines) that do not cross.", "Nestehiukkaset seuraavat tasaisia ratoja (virtaviivoja), jotka eivät leikkaa toisiaan.") },
          { id: "b", html: T("The streamlines cross in a chaotic mixture with eddies.", "Virtaviivat risteävät epäsäännöllisesti ja syntyy pyörteitä.") },
          { id: "c", html: T("The fluid does not move at all.", "Neste ei liiku lainkaan.") },
          { id: "d", html: T("The fluid is a gas.", "Neste on kaasua.") }],
        hints: [{ en: "Think of layers sliding smoothly past each other.", fi: "Ajattele kerroksia, jotka liukuvat tasaisesti toistensa ohi." }] },
      { id: "t2-q2", mode: "practice", type: "numeric", difficulty: 1, tol: 0.02,
        prompt: T("Water flows at 3.0 m/s in a pipe of diameter 80 mm. Find the volume flow rate.", "Vesi virtaa 3,0 m/s nopeudella 80 mm:n putkessa. Laske tilavuusvirta."),
        fields: [{ id: "q", tex: "q_V", unit: "m³/s" }],
        hints: [{ en: "First find the cross-section area A = πd²/4 in m².", fi: "Laske ensin poikkipinta-ala A = πd²/4 yksikössä m²." }, { en: "Then q_V = A·v. Give the answer in m³/s.", fi: "Sitten q_V = A·v. Anna vastaus yksikössä m³/s." }] },
      { id: "t2-q3", mode: "practice", type: "numeric", difficulty: 1, tol: 0.02,
        prompt: T("Oil of density 850 kg/m³ flows at 2.0 m/s in a 40 mm pipe. Find the mass flow rate.", "Öljy (tiheys 850 kg/m³) virtaa 2,0 m/s nopeudella 40 mm:n putkessa. Laske massavirta."),
        fields: [{ id: "qm", tex: "q_m", unit: "kg/s" }],
        hints: [{ en: "q_m = ρ·q_V = ρ·A·v.", fi: "q_m = ρ·q_V = ρ·A·v." }] },
      { id: "t2-q4", mode: "practice", type: "numeric", difficulty: 1, tol: 0.02,
        prompt: T("A pipe of diameter 100 mm carries water at 2.0 m/s and then narrows to 40 mm. Find the speed in the narrow part.", "Putkessa, jonka halkaisija on 100 mm, virtaa vettä 2,0 m/s, ja putki kapenee 40 mm:iin. Laske nopeus kapeassa osassa."),
        fields: [{ id: "v2", tex: "v_2", unit: "m/s" }],
        hints: [{ en: "The volume flow rate stays constant: A₁v₁ = A₂v₂.", fi: "Tilavuusvirta pysyy vakiona: A₁v₁ = A₂v₂." }, { en: "Areas scale with the square of the diameters.", fi: "Pinta-alat skaalautuvat halkaisijoiden neliöiden mukaan." }] },
      { id: "t2-q5", mode: "practice", type: "mc", difficulty: 1,
        prompt: T("A level water pipe narrows. What happens to the flow speed and the static pressure in the narrow part?", "Vaakasuora vesiputki kapenee. Mitä nopeudelle ja staattiselle paineelle tapahtuu kapeassa osassa?"),
        options: [
          { id: "a", html: T("Speed increases, static pressure increases.", "Nopeus kasvaa, staattinen paine kasvaa.") },
          { id: "b", html: T("Speed decreases, static pressure decreases.", "Nopeus pienenee, staattinen paine pienenee.") },
          { id: "c", html: T("Speed increases, static pressure decreases.", "Nopeus kasvaa, staattinen paine pienenee.") },
          { id: "d", html: T("Speed stays the same, static pressure decreases.", "Nopeus pysyy samana, staattinen paine pienenee.") }],
        hints: [{ en: "Continuity first: what happens to v when A shrinks?", fi: "Jatkuvuus ensin: mitä v:lle tapahtuu, kun A pienenee?" }, { en: "Bernoulli: total pressure is constant, so a larger dynamic pressure costs static pressure.", fi: "Bernoulli: kokonaispaine on vakio, joten suurempi dynaaminen paine vie staattista painetta." }] },
      { id: "t2-q6", mode: "practice", type: "slider", difficulty: 2, tol: 0.03,
        prompt: T("Narrow the pipe (slider d₂) until the water speed in the narrow part is 8 m/s. The wide part has d₁ = 110 mm and v₁ = 1.45 m/s.", "Kavenna putkea (säädin d₂), kunnes veden nopeus kapeassa osassa on 8 m/s. Leveässä osassa d₁ = 110 mm ja v₁ = 1,45 m/s."),
        widget: { name: "pipeflow", config: { mode: "venturi", fixed: ["d1", "v1", "h1", "rho"], values: { d2: 0.1 }, ranges: { d2: { min: 0.02, max: 0.11, step: 0.001 } } } },
        hints: [{ en: "v₂ = v₁·(d₁/d₂)²: the narrower the pipe, the faster the flow.", fi: "v₂ = v₁·(d₁/d₂)²: mitä kapeampi putki, sitä nopeampi virtaus." }, { en: "Watch the readout v₂ while you move the slider.", fi: "Seuraa lukemaa v₂ säätimen liikuttamisen aikana." }] },
      { id: "t2-q7", mode: "practice", type: "numeric", difficulty: 2, tol: 0.02,
        prompt: T("Water flows in a level pipe. At the wide part p₁ = 200 kPa and v₁ = 2.0 m/s; at the narrow part v₂ = 8.0 m/s. Find the static pressure p₂ (in Pa).", "Vesi virtaa vaakaputkessa. Leveässä osassa p₁ = 200 kPa ja v₁ = 2,0 m/s; kapeassa osassa v₂ = 8,0 m/s. Laske staattinen paine p₂ (yksikössä Pa)."),
        fields: [{ id: "p2", tex: "p_2", unit: "Pa" }],
        hints: [{ en: "Same height: p₁ + ½ρv₁² = p₂ + ½ρv₂².", fi: "Sama korkeus: p₁ + ½ρv₁² = p₂ + ½ρv₂²." }, { en: "Use ρ = 1000 kg/m³ and SI units throughout.", fi: "Käytä ρ = 1000 kg/m³ ja SI-yksiköitä." }] },
      { id: "t2-q8", mode: "practice", type: "numeric", difficulty: 2, tol: 0.02,
        prompt: T("Water flows at constant speed in a pipe of constant diameter that rises 5.0 m. The pressure at the lower end is 300 kPa. Find the pressure at the upper end (in Pa).", "Vesi virtaa vakionopeudella vakiohalkaisijaisessa putkessa, joka nousee 5,0 m. Paine alapäässä on 300 kPa. Laske paine yläpäässä (yksikössä Pa)."),
        fields: [{ id: "p2", tex: "p_2", unit: "Pa" }],
        hints: [{ en: "With v₁ = v₂ the dynamic pressures cancel.", fi: "Kun v₁ = v₂, dynaamiset paineet kumoavat toisensa." }, { en: "p₂ = p₁ − ρg·Δh.", fi: "p₂ = p₁ − ρg·Δh." }] },
      { id: "t2-q9", mode: "practice", type: "numeric", difficulty: 2, tol: 0.02,
        prompt: T("A Venturi tube has d₁ = 100 mm and d₂ = 50 mm. The differential-pressure transmitter shows Δp = 30 kPa for water. Find the flow speed v₁ in the wide part.", "Venturiputken halkaisijat ovat d₁ = 100 mm ja d₂ = 50 mm. Paine-erolähetin näyttää vedelle Δp = 30 kPa. Laske virtausnopeus v₁ leveässä osassa."),
        fields: [{ id: "v1", tex: "v_1", unit: "m/s" }],
        hints: [{ en: "A₁/A₂ = (d₁/d₂)²; then square it again for the formula.", fi: "A₁/A₂ = (d₁/d₂)²; korota se vielä toiseen potenssiin kaavaa varten." }, { en: "v₁ = √(2Δp / (ρ((A₁/A₂)² − 1))).", fi: "v₁ = √(2Δp / (ρ((A₁/A₂)² − 1)))." }] },
      { id: "t2-q10", mode: "practice", type: "mc", difficulty: 1,
        prompt: T("What happens to the transmitter reading Δp of a Venturi flowmeter if the flow speed doubles?", "Mitä Venturi-mittarin paine-erolähettimen lukemalle Δp tapahtuu, kun virtausnopeus kaksinkertaistuu?"),
        options: [
          { id: "a", html: T("It doubles.", "Se kaksinkertaistuu.") },
          { id: "b", html: T("It becomes four times larger.", "Se nelinkertaistuu.") },
          { id: "c", html: T("It stays the same.", "Se pysyy samana.") },
          { id: "d", html: T("It halves.", "Se puolittuu.") }],
        hints: [{ en: "Δp is proportional to the dynamic pressure ½ρv².", fi: "Δp on verrannollinen dynaamiseen paineeseen ½ρv²." }] },
      { id: "t2-q11", mode: "practice", type: "mc", difficulty: 1,
        prompt: T("Which pressure does a Pitot tube measure, relative to the static pressure of the flow?", "Minkä paineen Pitot-putki mittaa virtauksen staattiseen paineeseen verrattuna?"),
        options: [
          { id: "a", html: T("The hydrostatic pressure ρgh.", "Hydrostaattisen paineen ρgh.") },
          { id: "b", html: T("The dynamic pressure ½ρv².", "Dynaamisen paineen ½ρv².") },
          { id: "c", html: T("The vapour pressure.", "Höyrynpaineen.") },
          { id: "d", html: T("The atmospheric pressure.", "Ilmanpaineen.") }],
        hints: [{ en: "At the tip of the tube the fluid is stopped (v₂ ≈ 0).", fi: "Putken kärjessä neste pysähtyy (v₂ ≈ 0)." }] },
      { id: "t2-q12", mode: "practice", type: "numeric", difficulty: 2, tol: 0.02,
        prompt: T("A Pitot tube in an air duct (ρ = 1.2 kg/m³) shows a pressure difference of 300 Pa. Find the air speed.", "Ilmakanavan Pitot-putki (ρ = 1,2 kg/m³) näyttää paine-eroksi 300 Pa. Laske ilman nopeus."),
        fields: [{ id: "v", tex: "v", unit: "m/s" }],
        hints: [{ en: "Δp = ½ρv², solve for v.", fi: "Δp = ½ρv², ratkaise v." }] },
      { id: "t2-q13", mode: "practice", type: "numeric", difficulty: 1, tol: 0.02,
        prompt: T("A tank is open to the atmosphere and the water surface is 1.8 m above a hole. Find the outflow speed (g = 9.81 m/s²).", "Säiliö on avoin ilmakehään ja vedenpinta on 1,8 m aukon yläpuolella. Laske ulosvirtausnopeus (g = 9,81 m/s²)."),
        fields: [{ id: "v", tex: "v", unit: "m/s" }],
        hints: [{ en: "Torricelli: v = √(2gh).", fi: "Torricelli: v = √(2gh)." }] },
      { id: "t2-q14", mode: "practice", type: "slider", difficulty: 2, tol: 0.03,
        prompt: T("Set the water level h of the tank (hole d = 35 mm) so that the outflow is 10 L/s.", "Säädä säiliön vedenpinnan korkeus h (aukon d = 35 mm) niin, että ulosvirtaus on 10 L/s."),
        widget: { name: "pipeflow", config: { mode: "torricelli", fixed: ["d"], values: { h: 2 }, ranges: { h: { min: 0.5, max: 8, step: 0.1 } } } },
        hints: [{ en: "q_V = A·√(2gh): the flow grows with the square root of the level.", fi: "q_V = A·√(2gh): virtaama kasvaa pinnankorkeuden neliöjuuren mukana." }, { en: "Read the readout q_V in L/s while moving the slider.", fi: "Seuraa lukemaa q_V yksikössä L/s säätimen liikuttamisen aikana." }] },
      { id: "t2-q15", mode: "practice", type: "numeric", difficulty: 2, tol: 0.02,
        prompt: T("A pump generates a pressure difference of 300 kPa at 10 L/s. Its efficiency is 70 %. Find the input power P₀ the motor must deliver (in W).", "Pumppu tuottaa paine-eron 300 kPa virtaamalla 10 L/s. Sen hyötysuhde on 70 %. Laske moottorin annettava ottoteho P₀ (yksikössä W)."),
        fields: [{ id: "P0", tex: "P_0", unit: "W" }],
        hints: [{ en: "Hydraulic output power P_A = Δp·q_V (use m³/s and Pa).", fi: "Hydraulinen antoteho P_A = Δp·q_V (käytä m³/s ja Pa)." }, { en: "P₀ = P_A / η.", fi: "P₀ = P_A / η." }] },
      { id: "t2-q16", mode: "practice", type: "mc", difficulty: 1,
        prompt: T("In the pump example the pump has to supply the pressure difference Δp_P. Which of these does it NOT need to cover (friction neglected)?", "Pumppuesimerkissä pumpun on tuotettava paine-ero Δp_P. Mitä näistä sen EI tarvitse kattaa (kitka jätetty huomiotta)?"),
        options: [
          { id: "a", html: T("The increase in pressure p₂ − p₁ between the tanks.", "Säiliöiden välinen paineen kasvu p₂ − p₁.") },
          { id: "b", html: T("The lifting height (ρgh).", "Nostokorkeus (ρgh).") },
          { id: "c", html: T("The increase of the dynamic pressure ½ρ(v₂² − v₁²).", "Dynaamisen paineen kasvu ½ρ(v₂² − v₁²).") },
          { id: "d", html: T("The colour of the pipe.", "Putken väri.") }],
        hints: [{ en: "Look at the terms of the pump formula.", fi: "Katso pumpun kaavan termejä." }] },
      { id: "t2-q17", mode: "practice", type: "numeric", difficulty: 1, tol: 0.02,
        prompt: T("Oil of viscosity 0.10 Pa·s is between two plates 1.0 mm apart. The moving plate has area 0.50 m² and speed 0.40 m/s. Find the force needed to pull it.", "Kahden 1,0 mm:n päässä toisistaan olevan levyn välissä on öljyä, jonka viskositeetti on 0,10 Pa·s. Liikkuvan levyn ala on 0,50 m² ja nopeus 0,40 m/s. Laske vetämiseen tarvittava voima."),
        fields: [{ id: "F", tex: "F", unit: "N" }],
        hints: [{ en: "F = η·A·v/l.", fi: "F = η·A·v/l." }] },
      { id: "t2-q18", mode: "practice", type: "numeric", difficulty: 1, tol: 0.02,
        prompt: T("The pressure gradient is unchanged but the radius of a pipe with laminar flow is doubled. By what factor does the volume flow rate grow?", "Painegradientti pysyy ennallaan, mutta laminaarisen virtauksen putken säde kaksinkertaistetaan. Kuinka monikertaiseksi tilavuusvirta kasvaa?"),
        fields: [{ id: "k", tex: "q_{V2}/q_{V1}", unit: "" }],
        hints: [{ en: "Poiseuille: q_V is proportional to R to some power.", fi: "Poiseuille: q_V on verrannollinen säteen johonkin potenssiin." }] },
      { id: "t2-q19", mode: "practice", type: "order", difficulty: 1,
        prompt: T("Order these fluids from the lowest to the highest viscosity (see the table).", "Järjestä nesteet pienimmästä suurimpaan viskositeettiin (ks. taulukko)."),
        items: [{ id: "g", html: T("glycerine (20 °C)", "glyseriini (20 °C)") }, { id: "a", html: T("air (20 °C)", "ilma (20 °C)") }, { id: "o", html: T("engine oil SAE 10 (30 °C)", "moottoriöljy SAE 10 (30 °C)") }, { id: "w", html: T("water (20 °C)", "vesi (20 °C)") }],
        hints: [{ en: "Gases are far less viscous than liquids.", fi: "Kaasut ovat paljon vähemmän viskoosisia kuin nesteet." }] },
      { id: "t2-q20", mode: "practice", type: "fill", difficulty: 1,
        prompt: T("Fill in the limits of the Reynolds number in a pipe.", "Täydennä Reynoldsin luvun rajat putkessa."),
        text: T("The flow is laminar when R_e is below [[a]] and turbulent when R_e is above [[b]].", "Virtaus on laminaarinen, kun R_e on alle [[a]], ja turbulentti, kun R_e on yli [[b]]."),
        fields: [{ id: "a", kind: "num" }, { id: "b", kind: "num" }],
        hints: [{ en: "Between the limits the flow is a mixture.", fi: "Rajojen välissä virtaus on sekamuotoista." }] },
      { id: "t2-q21", mode: "practice", type: "match", difficulty: 1,
        prompt: T("Match the type of flow with its Reynolds number range.", "Yhdistä virtaustyyppi ja Reynoldsin luvun alue."),
        left: [{ id: "lam", html: T("laminar flow", "laminaarinen virtaus") }, { id: "tur", html: T("turbulent flow", "turbulentti virtaus") }, { id: "mix", html: T("mixture of both", "molempien sekamuoto") }],
        right: [{ id: "r2", html: T("<f>R_e > 3000</f>", "<f>R_e > 3000</f>") }, { id: "r3", html: T("<f>2000 < R_e < 3000</f>", "<f>2000 < R_e < 3000</f>") }, { id: "r1", html: T("<f>R_e < 2000</f>", "<f>R_e < 2000</f>") }],
        hints: [{ en: "Small Reynolds number means viscous forces win: smooth layers.", fi: "Pieni Reynoldsin luku tarkoittaa, että viskoosit voimat voittavat: tasaiset kerrokset." }] },
      { id: "t2-q22", mode: "practice", type: "numeric", difficulty: 2, tol: 0.02,
        prompt: T("Oil (ρ = 880 kg/m³, η = 0.20 Pa·s) flows at 1.5 m/s in a pipe of diameter 50 mm. Find the Reynolds number.", "Öljy (ρ = 880 kg/m³, η = 0,20 Pa·s) virtaa 1,5 m/s nopeudella 50 mm:n putkessa. Laske Reynoldsin luku."),
        fields: [{ id: "Re", tex: "R_e", unit: "" }],
        hints: [{ en: "R_e = ρvD/η with D in metres.", fi: "R_e = ρvD/η, kun D on metreinä." }] },
      { id: "t2-q23", mode: "practice", type: "numeric", difficulty: 2, tol: 0.02,
        prompt: T("Water flows at 2.0 m/s in a pipe of length 40 m and diameter 50 mm with 8f = 0.020. Find the friction loss Δp_l (in Pa).", "Vesi virtaa 2,0 m/s nopeudella 40 m pitkässä, 50 mm:n putkessa, 8f = 0,020. Laske kitkahäviö Δp_l (yksikössä Pa)."),
        fields: [{ id: "dp", tex: "Δp_l", unit: "Pa" }],
        hints: [{ en: "Δp_l = 8f · L/D · ½ρv².", fi: "Δp_l = 8f · L/D · ½ρv²." }] },
      { id: "t2-q24", mode: "practice", type: "numeric", difficulty: 2, tol: 0.02,
        prompt: T("A fully open globe valve (k = 6.0, see the table) sits in a water pipe where the speed is 2.0 m/s. Find its pressure loss (in Pa).", "Täysin auki oleva palloventtiili (globe, k = 6,0, ks. taulukko) on vesiputkessa, jossa nopeus on 2,0 m/s. Laske sen painehäviö (yksikössä Pa)."),
        fields: [{ id: "dp", tex: "Δp_k", unit: "Pa" }],
        hints: [{ en: "Δp_k = k · ½ρv².", fi: "Δp_k = k · ½ρv²." }] },

      // ---- Topic test (graded) ----
      { id: "t2-t1", mode: "graded", type: "numeric", difficulty: 2, points: 2, tol: 0.02,
        prompt: T("A level water pipe of diameter 100 mm carries 20 L/s at a pressure of 250 kPa. It reduces to 50 mm. Find the speed v₂ in the narrow part and the pressure p₂ there (in Pa).", "Vaakasuora 100 mm:n vesiputki kuljettaa 20 L/s paineessa 250 kPa. Putki kapenee 50 mm:iin. Laske nopeus v₂ kapeassa osassa ja paine p₂ siellä (yksikössä Pa)."),
        fields: [{ id: "v2", tex: "v_2", unit: "m/s" }, { id: "p2", tex: "p_2", unit: "Pa" }],
        hints: [{ en: "v = q_V / A for each section, with q_V in m³/s.", fi: "v = q_V / A kummassakin osassa, q_V yksikössä m³/s." }, { en: "Then Bernoulli with h₁ = h₂.", fi: "Sitten Bernoulli, kun h₁ = h₂." }] },
      { id: "t2-t2", mode: "graded", type: "numeric", difficulty: 2, tol: 0.02,
        prompt: T("Water leaves a hole of diameter 20 mm in the side of an open tank, 4.0 m below the surface. Find the volume flow rate (g = 9.81 m/s²).", "Vesi virtaa avoimen säiliön kyljessä olevasta 20 mm:n aukosta, joka on 4,0 m pinnan alapuolella. Laske tilavuusvirta (g = 9,81 m/s²)."),
        fields: [{ id: "q", tex: "q_V", unit: "m³/s" }],
        hints: [{ en: "First the speed from Torricelli.", fi: "Ensin nopeus Torricellin laista." }, { en: "Then q_V = A·v.", fi: "Sitten q_V = A·v." }] },
      { id: "t2-t3", mode: "graded", type: "numeric", difficulty: 3, points: 2, tol: 0.02,
        prompt: T("A pump lifts water from an open tank (atmospheric pressure 101 325 Pa) 10 m up to a closed tank at an absolute pressure of 300 kPa, at 20 L/s. The pipe has the same diameter everywhere and friction is neglected. Find the pressure difference of the pump (in Pa) and the electrical input power (in W) at an efficiency of 80 %.", "Pumppu nostaa vettä avoimesta säiliöstä (ilmanpaine 101 325 Pa) 10 m ylös suljettuun säiliöön, jossa absoluuttinen paine on 300 kPa, virtaamalla 20 L/s. Putken halkaisija on kaikkialla sama eikä kitkaa huomioida. Laske pumpun paine-ero (yksikössä Pa) ja sähköinen ottoteho (yksikössä W) hyötysuhteella 80 %."),
        fields: [{ id: "dp", tex: "Δp_P", unit: "Pa" }, { id: "P0", tex: "P_0", unit: "W" }],
        hints: [{ en: "Same diameter means the dynamic pressures cancel.", fi: "Sama halkaisija tarkoittaa, että dynaamiset paineet kumoavat toisensa." }, { en: "Δp_P = p₂ − p₁ + ρgh, then P_A = Δp_P·q_V and P₀ = P_A/η.", fi: "Δp_P = p₂ − p₁ + ρgh, sitten P_A = Δp_P·q_V ja P₀ = P_A/η." }] },
      { id: "t2-t4", mode: "graded", type: "numeric", difficulty: 2, tol: 0.02,
        prompt: T("Water (η = 1.0 mPa·s, ρ = 1000 kg/m³) flows at 0.50 m/s in a pipe of diameter 25 mm. Find the Reynolds number.", "Vesi (η = 1,0 mPa·s, ρ = 1000 kg/m³) virtaa 0,50 m/s nopeudella 25 mm:n putkessa. Laske Reynoldsin luku."),
        fields: [{ id: "Re", tex: "R_e", unit: "" }],
        hints: [{ en: "Convert D to metres and η to Pa·s.", fi: "Muunna D metreiksi ja η yksikköön Pa·s." }] },
      { id: "t2-t5", mode: "graded", type: "numeric", difficulty: 3, points: 2, tol: 0.02,
        prompt: T("An air duct (ρ = 1.2 kg/m³) is 50 m long with diameter 200 mm. The air speed is 6.0 m/s, 8f = 0.018 and there are three bends with k = 0.35 each. Find the total pressure loss (in Pa).", "Ilmakanava (ρ = 1,2 kg/m³) on 50 m pitkä ja halkaisijaltaan 200 mm. Ilman nopeus on 6,0 m/s, 8f = 0,018 ja kanavassa on kolme mutkaa, joiden k = 0,35 kukin. Laske kokonaispainehäviö (yksikössä Pa)."),
        fields: [{ id: "dp", tex: "Δp_l + Δp_k", unit: "Pa" }],
        hints: [{ en: "Straight pipe: Δp_l = 8f·L/D·½ρv².", fi: "Suora putki: Δp_l = 8f·L/D·½ρv²." }, { en: "Bends: Δp_k = (sum of k)·½ρv². Add them.", fi: "Mutkat: Δp_k = (k:n summa)·½ρv². Laske ne yhteen." }] },
      { id: "t2-t6", mode: "graded", type: "multi", difficulty: 2, points: 2,
        prompt: T("A level pipe with ideal flow narrows. Select ALL statements that are true.", "Ideaalivirtaus vaakaputkessa, ja putki kapenee. Valitse KAIKKI oikeat väittämät."),
        options: [
          { id: "a", html: T("The flow speed increases in the narrow part.", "Virtausnopeus kasvaa kapeassa osassa.") },
          { id: "b", html: T("The static pressure increases in the narrow part.", "Staattinen paine kasvaa kapeassa osassa.") },
          { id: "c", html: T("The volume flow rate is the same in both parts.", "Tilavuusvirta on molemmissa osissa sama.") },
          { id: "d", html: T("The dynamic pressure increases in the narrow part.", "Dynaaminen paine kasvaa kapeassa osassa.") },
          { id: "e", html: T("The total pressure p + ½ρv² changes.", "Kokonaispaine p + ½ρv² muuttuu.") }],
        hints: [{ en: "Use continuity first, then Bernoulli.", fi: "Käytä ensin jatkuvuutta, sitten Bernoullia." }] }
    ]
  });
})();

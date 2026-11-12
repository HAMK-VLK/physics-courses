/* Topic 6: Capacitance and capacitors. NO answers here; see src/answers/topic6.json. */
(function () {
  var E0 = 8.854187e-12;
  function svg(vb, inner) { return '<svg viewBox="' + vb + '" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" font-size="13">' + inner + '</svg>'; }
  function T(x, y, s, a) { return '<text x="' + x + '" y="' + y + '" fill="currentColor" stroke="none" text-anchor="' + (a || 'middle') + '">' + s + '</text>'; }
  // Figures with words are {en, fi} pairs: both(fn) calls fn(word) with a picker for the language's label.
  function both(fn) { return { en: fn(function (en) { return en; }), fi: fn(function (en, fi) { return fi; }) }; }
  // 2 plates (vertical gap) helper for the static figures
  var figPlates = svg('0 0 300 150',
    '<path d="M60 40H240" stroke-width="5" stroke="var(--c-1)"/><path d="M60 110H240" stroke-width="5" stroke="var(--c-3)"/>' +
    [90, 120, 150, 180, 210].map(function (x) { return '<path d="M' + x + ' 106V44M' + (x - 4) + ' 52L' + x + ' 44L' + (x + 4) + ' 52" stroke="var(--c-flow)" stroke-width="1.5"/>'; }).join('') +
    T(50, 44, '+Q', 'end') + T(50, 114, '−Q', 'end') + T(150, 24, 'A') + T(268, 78, 'd', 'start') + '<path d="M262 42V108" stroke-width="1"/>' + T(105, 82, 'E', 'start'));
  var figKey = both(function (w) { return svg('0 0 300 150',
    '<rect x="95" y="8" width="110" height="26" rx="4" stroke="var(--c-2)"/>' + T(150, 26, w('key', 'näppäin')) +
    '<path d="M70 62H230" stroke-width="5" stroke="var(--c-1)"/><path d="M70 112H230" stroke-width="5" stroke="var(--c-3)"/>' +
    '<path d="M150 36V56M144 48L150 56L156 48" stroke="var(--c-2)"/>' + '<path d="M246 64V110" stroke-width="1"/>' + T(252, 92, 'd', 'start') + T(150, 142, 'd ↓  ⇒  C ↑')); });
  var cap = function (x, y) { return '<path d="M' + x + ' ' + (y - 16) + 'V' + (y + 16) + 'M' + (x + 8) + ' ' + (y - 16) + 'V' + (y + 16) + '" stroke-width="3"/>'; };
  var figSeries = both(function (w) { return svg('0 0 320 120',
    '<path d="M20 40H70M78 40H150M158 40H230M238 40H300V90H20V40"/>' + cap(70, 40) + cap(150, 40) + cap(230, 40) +
    T(78, 18, 'C₁') + T(158, 18, 'C₂') + T(238, 18, 'C₃') + T(160, 112, w('same Q', 'sama Q'))); });
  var figPar = both(function (w) { return svg('0 0 320 130',
    '<path d="M20 20H300M20 110H300M60 20V47M60 71V110M160 20V47M160 71V110M260 20V47M260 71V110"/>' +
    '<path d="M44 47H76M44 55H76M144 47H176M144 55H176M244 47H276M244 55H276" stroke-width="3"/>' +
    T(92, 56, 'C₁', 'start') + T(192, 56, 'C₂', 'start') + T(292, 56, 'C₃', 'end') + T(160, 126, w('same U', 'sama U'))); });
  var figSymbols = both(function (w) { return svg('0 0 360 110',
    '<path d="M20 55H45M45 35V75M57 35V75M57 55H82"/>' + T(51, 100, 'C') +
    '<path d="M120 55H145M145 35V75M157 35Q168 55 157 75M157 55H182"/>' + T(132, 36, '+') + T(151, 100, w('electrolytic', 'elektrolyytti')) +
    '<path d="M240 55H265M265 35V75M277 35V75M277 55H302M250 80L292 30" stroke-width="2"/>' + T(271, 100, w('variable', 'muuttuva'))); });
  var figRC = svg('0 0 340 140',
    '<path d="M30 30H80M104 30H140M172 30H230V56M210 56H250M210 64H250M230 64V104H30V30"/>' +
    '<path d="M80 30L102 16"/><circle cx="80" cy="30" r="2.5" fill="currentColor"/><circle cx="104" cy="30" r="2.5" fill="currentColor"/>' +
    '<rect x="140" y="22" width="32" height="16"/>' + T(92, 12, 'S') + T(156, 16, 'R') + T(262, 64, 'C', 'start') + T(40, 72, 'Uₛ', 'start') + T(170, 124, 'i →'));
  var figPolar = both(function (w) { return svg('0 0 340 130',
    '<path d="M20 20H150M20 110H150" stroke-width="4" stroke="var(--c-1)"/><path d="M190 20H320M190 110H320" stroke-width="4" stroke="var(--c-3)"/>' +
    '<rect x="190" y="40" width="130" height="50" fill="var(--surface-2)" stroke="var(--line)"/>' +
    [205, 235, 265, 295].map(function (x) { return T(x, 70, '−+'); }).join('') +
    '<path d="M50 105V26M85 105V26M120 105V26M215 105V26M255 105V26M295 105V26" stroke="var(--c-flow)" stroke-width="1.5"/>' +
    T(85, 128, w('E₀ (vacuum)', 'E₀ (tyhjiö)')) + T(255, 128, 'E = E₀/K')); });

  function plateMount(host, ctx) {
    var P = [{ id: 'A', tex: 'A', min: 1e-4, max: 1e-2, value: 4e-3, unit: 'm²', log: true }, { id: 'd', tex: 'd', min: 1e-4, max: 5e-3, value: 1e-3, unit: 'm', log: true },
             { id: 'er', tex: 'ε_r', min: 1, max: 300, value: 1, log: true }, { id: 'U', tex: 'U', min: 1, max: 100, value: 12, unit: 'V' }];
    var panel;
    var c = TDC.viz.canvas(host, { aspect: 0.55, draw: function (g, w, h) {
      var v = panel.values, C = E0 * v.er * v.A / v.d, Q = C * v.U;
      g.clearRect(0, 0, w, h);
      var gap = 18 + Math.log(v.d / 1e-4) / Math.log(50) * (h * 0.4), pw = 60 + Math.log(v.A / 1e-4) / Math.log(100) * (w * 0.5), cx = w / 2, y1 = h * 0.08, y2 = y1 + gap;
      if (v.er > 1) { g.fillStyle = ctx.color('--surface-2'); g.fillRect(cx - pw / 2, y1, pw, gap); }
      g.lineWidth = 6; g.strokeStyle = ctx.color('--c-1'); g.beginPath(); g.moveTo(cx - pw / 2, y1); g.lineTo(cx + pw / 2, y1); g.stroke();
      g.strokeStyle = ctx.color('--c-3'); g.beginPath(); g.moveTo(cx - pw / 2, y2); g.lineTo(cx + pw / 2, y2); g.stroke();
      g.lineWidth = 1.5; g.strokeStyle = ctx.color('--c-flow'); var n = Math.max(3, Math.round(pw / 22));
      for (var i = 0; i < n; i++) { var x = cx - pw / 2 + (i + 0.5) * pw / n; g.beginPath(); g.moveTo(x, y2 - 3); g.lineTo(x, y1 + 3); g.stroke(); g.beginPath(); g.moveTo(x - 4, y1 + 10); g.lineTo(x, y1 + 3); g.lineTo(x + 4, y1 + 10); g.stroke(); }
      g.fillStyle = ctx.color('--fg'); g.font = '13px system-ui,sans-serif'; g.textAlign = 'left';
      g.fillText('+Q', Math.max(4, cx - pw / 2 - 30), y1 + 4); g.fillText('−Q', Math.max(4, cx - pw / 2 - 30), y2 + 4);
      g.fillText('C = ' + TDC.util.fmtSI(C, 'F', 3) + '    Q = ' + TDC.util.fmtSI(Q, 'C', 3), 8, h - 24);
      g.fillText('E = U/d = ' + TDC.util.fmtSI(v.U / v.d, 'V/m', 3), 8, h - 6);
    } });
    panel = TDC.viz.params(P, function () { c.redraw(); }, ctx); host.insertBefore(panel, host.firstChild);
    return { destroy: c.destroy };
  }

  TDC.registerTopic({
    id: 't6', num: 6,
    title: { en: 'Capacitance and capacitors', fi: 'Kapasitanssi ja kondensaattorit' },
    subtitle: { en: 'Charge, field energy, networks and RC transients.', fi: 'Varaus, kentän energia, kytkennät ja RC-transientit.' },
    objectives: [
      { en: 'define capacitance C = Q/U and calculate it for plate, coaxial and parallel-wire geometries', fi: 'määritellä kapasitanssi C = Q/U ja laskea se levy\u00ADkondensaattorille, koaksiaalikaapelille ja rinnakkaisille johtimille' },
      { en: 'explain the role of the dielectric, relative permittivity and dielectric strength', fi: 'selittää eristeen, suhteellisen permittiivisyyden ja läpilyöntilujuuden merkitys' },
      { en: 'use i = C·du/dt and recognise the main capacitor types and their polarity', fi: 'käyttää kaavaa i = C·du/dt ja tunnistaa tärkeimmät kondensaattorityypit ja niiden napaisuuden' },
      { en: 'combine capacitors in series and in parallel and find charges and voltages', fi: 'kytkeä kondensaattoreita sarjaan ja rinnan sekä laskea varaukset ja jännitteet' },
      { en: 'calculate the stored energy and the energy density of the field', fi: 'laskea varastoitunut energia ja kentän energiatiheys' },
      { en: 'analyse RC charging and discharging with the time constant τ = RC', fi: 'analysoida RC-piirin lataus ja purkaus aikavakion τ = RC avulla' }
    ],
    glossary: {
      capacitor: { en: 'capacitor', fi: 'kondensaattori', def: { en: 'Two conductors separated by an insulator; stores charge and energy in the electric field.', fi: 'Kaksi eristeellä erotettua johdinta; varastoi varausta ja energiaa sähkökenttään.' } },
      capacitance: { en: 'capacitance', fi: 'kapasitanssi', sym: 'C = Q/U', def: { en: 'Charge per volt, unit farad (F).', fi: 'Varaus jännitettä kohti, yksikkö faradi (F).' } },
      farad: { en: 'farad', fi: 'faradi', sym: 'F = C/V', def: { en: 'Unit of capacitance.', fi: 'Kapasitanssin yksikkö.' } },
      dielectric: { en: 'dielectric', fi: 'eriste, dielektrinen aine', def: { en: 'Insulating material between the conductors; raises C by the factor ε_r.', fi: 'Johtimien välinen eriste; kasvattaa C:tä kertoimella ε_r.' } },
      permittivity: { en: 'relative permittivity', fi: 'suhteellinen permittiivisyys', sym: 'ε_r = K', def: { en: 'Ratio C/C₀ with and without the dielectric.', fi: 'Kapasitanssien suhde C/C₀ eristeen kanssa ja ilman.' } },
      e0: { en: 'permittivity of vacuum', fi: 'tyhjiön permittiivisyys', sym: 'ε_0 = 8,854·10⁻¹² F/m', def: { en: 'Constant linking charge and field in vacuum.', fi: 'Vakio, joka yhdistää varauksen ja kentän tyhjiössä.' } },
      dielstrength: { en: 'dielectric strength', fi: 'läpilyöntilujuus', sym: 'E_max', def: { en: 'Highest field strength (V/m) before breakdown.', fi: 'Suurin kentänvoimakkuus (V/m) ennen läpilyöntiä.' } },
      breakdown: { en: 'breakdown voltage', fi: 'läpilyöntijännite', sym: 'U_max = E_max·d', def: { en: 'Voltage at which the insulator fails.', fi: 'Jännite, jolla eriste pettää.' } },
      platecap: { en: 'parallel plate capacitor', fi: 'levykondensaattori', def: { en: 'Two parallel plates with a dielectric between.', fi: 'Kaksi yhdensuuntaista levyä, joiden välissä on eriste.' } },
      polarisation: { en: 'polarisation', fi: 'polarisaatio', def: { en: 'Alignment of dipoles in a dielectric that weakens the field.', fi: 'Eristeen dipolien suuntautuminen, joka heikentää kenttää.' } },
      leakage: { en: 'leakage current', fi: 'vuotovirta', def: { en: 'Small current through the imperfect dielectric.', fi: 'Epätäydellisen eristeen läpi kulkeva pieni virta.' } },
      ceq: { en: 'equivalent capacitance', fi: 'korvauskapasitanssi', sym: 'C_eq', def: { en: 'Single capacitance that replaces a network.', fi: 'Yksittäinen kapasitanssi, joka korvaa kytkennän.' } },
      electrolytic: { en: 'electrolytic capacitor', fi: 'elektrolyyttikondensaattori', def: { en: 'Polarised, large C, oxide dielectric.', fi: 'Napainen, suuri C, oksidieriste.' } },
      tantalum: { en: 'tantalum capacitor', fi: 'tantaalikondensaattori', def: { en: 'Polarised electrolytic with tantalum pentoxide dielectric.', fi: 'Napainen elektrolyyttikondensaattori, eristeenä tantaalipentoksidi.' } },
      trimmer: { en: 'variable capacitor / trimmer', fi: 'muuttuva kondensaattori / trimmeri', def: { en: 'Capacitor whose value is adjusted.', fi: 'Kondensaattori, jonka arvoa säädetään.' } },
      polarised: { en: 'polarised', fi: 'napainen', def: { en: 'Has a + and a - terminal that must not be reversed.', fi: 'Siinä on + ja - napa, joita ei saa kääntää.' } },
      coax: { en: 'coaxial cable', fi: 'koaksiaalikaapeli', def: { en: 'Cable with an inner conductor inside a tubular outer conductor.', fi: 'Kaapeli, jossa sisäjohdin on putkimaisen ulkojohtimen sisällä.' } },
      energy: { en: 'stored energy', fi: 'varastoitunut energia', sym: 'W = ½CU²', def: { en: 'Energy held in the electric field.', fi: 'Sähkökenttään varastoitunut energia.' } },
      energydens: { en: 'energy density', fi: 'energiatiheys', sym: 'w = ½ε E²', def: { en: 'Stored energy per unit volume (J/m³).', fi: 'Varastoitunut energia tilavuusyksikköä kohti (J/m³).' } },
      timeconst: { en: 'time constant', fi: 'aikavakio', sym: 'τ = RC', def: { en: 'Time in which an RC transient covers 63 % of its change.', fi: 'Aika, jossa RC-transientti etenee 63 % muutoksestaan.' } },
      transient: { en: 'transient', fi: 'transientti, ohimenoilmiö', def: { en: 'Temporary behaviour between two steady states.', fi: 'Tilapäinen käyttäytyminen kahden vakiotilan välillä.' } },
      charging: { en: 'charging / discharging', fi: 'lataus / purkaus', def: { en: 'Charge flows onto / off the plates.', fi: 'Varaus siirtyy levyille / levyiltä pois.' } },
      stray: { en: 'stray capacitance', fi: 'hajakapasitanssi', def: { en: 'Unwanted capacitance between nearby conductors.', fi: 'Lähekkäisten johtimien välinen ei-toivottu kapasitanssi.' } }
    },
    formulas: [
      { name: { en: 'Capacitance', fi: 'Kapasitanssi' }, tex: 'C = {Q}/{U}' },
      { name: { en: 'Plate capacitor', fi: 'Levykondensaattori' }, tex: 'C = {ε_0 ε_r A}/{d}' },
      { name: { en: 'Capacitor law', fi: 'Kondensaattorin laki' }, tex: 'i = C · {du}/{dt}' },
      { name: { en: 'Coaxial cable', fi: 'Koaksiaalikaapeli' }, tex: 'C/l = {2π ε_0 ε_r}/{ln(R_a/R_b)}' },
      { name: { en: 'Parallel wires', fi: 'Rinnakkaiset johdot' }, tex: 'C/l ≈ {π ε_0}/{ln(d/R)}' },
      { name: { en: 'Capacitors in series', fi: 'Kondensaattorit sarjassa' }, tex: '{1}/{C_T} = {1}/{C_1} + {1}/{C_2} + {1}/{C_3}' },
      { name: { en: 'Capacitors in parallel', fi: 'Kondensaattorit rinnan' }, tex: 'C_{eq} = C_1 + C_2 + C_3' },
      { name: { en: 'Stored energy', fi: 'Varastoitunut energia' }, tex: 'W = {1}/{2} C U^2 = {Q^2}/{2C}' },
      { name: { en: 'Energy density', fi: 'Energiatiheys' }, tex: 'w = {1}/{2} ε_0 ε_r E^2' },
      { name: { en: 'Time constant', fi: 'Aikavakio' }, tex: 'τ = R C' },
      { name: { en: 'RC transient', fi: 'RC-transientti' }, tex: 'u = U_F + (U_i − U_F) e^{−t/τ}' }
    ],
    sections: [
      // ---------------- 6.1 ----------------
      { id: 't6-cap', title: { en: 'Capacitor, charge and capacitance', fi: 'Kondensaattori, varaus ja kapasitanssi' }, blocks: [
        { id: 't6-cap-p1', type: 'text', html: {
          en: '<p>A <dfn data-term="capacitor">capacitor</dfn> is any pair of conductors that are close to each other and insulated from each other. It stores electric charge, and the energy sits in the electric field between the conductors. Typical uses: camera flash, energy back-up in computers, sensors.</p><p>One conductor holds +Q and the other −Q, so the net charge is zero. The <dfn data-term="capacitance">capacitance</dfn> tells how much charge is stored per volt.</p>',
          fi: '<p><dfn data-term="capacitor">Kondensaattori</dfn> on mikä tahansa pari johtimia, jotka ovat lähellä toisiaan ja eristetyt toisistaan. Se varastoi sähkövarausta, ja energia on johtimien välisessä sähkökentässä. Käyttökohteita ovat esimerkiksi kameran salama, tietokoneen varmistusenergia ja anturit.</p><p>Toisessa johtimessa on +Q ja toisessa −Q, joten nettovaraus on nolla. <dfn data-term="capacitance">Kapasitanssi</dfn> kertoo, kuinka paljon varausta varastoituu volttia kohti.</p>' } },
        { id: 't6-cap-f1', type: 'formula', key: true, tex: 'C = {Q}/{U}', label: { en: 'Definition of capacitance', fi: 'Kapasitanssin määritelmä' },
          legend: [['C', { en: 'capacitance', fi: 'kapasitanssi' }, 'F = C/V'], ['Q', { en: 'charge on one conductor', fi: 'varaus yhdellä johtimella' }, 'C'], ['U', { en: 'voltage between conductors', fi: 'johtimien välinen jännite' }, 'V']] },
        { id: 't6-cap-f2', type: 'formula', key: true, tex: 'C = {ε_0 ε_r A}/{d}', label: { en: 'Parallel plate capacitor', fi: 'Levy\u00ADkondensaattori' }, // (extra) the PDF never prints it explicitly
          legend: [['ε_0', { en: 'permittivity of vacuum', fi: 'tyhjiön permittiivisyys' }, '8,854·10⁻¹² F/m'], ['ε_r', { en: 'relative permittivity', fi: 'suhteellinen permittiivisyys' }, ''], ['A', { en: 'plate area', fi: 'levyn pinta-ala' }, 'm²'], ['d', { en: 'plate distance', fi: 'levyjen etäisyys' }, 'm']] },
        { id: 't6-cap-fig1', type: 'figure', svg: figPlates, caption: { en: 'Plate capacitor: charges +Q and −Q, field lines run from + to −.', fi: 'Levy\u00ADkondensaattori: varaukset +Q ja −Q, kenttäviivat kulkevat +:sta −:een.' }, alt: { en: 'Two parallel plates with field lines', fi: 'Kaksi yhdensuuntaista levyä ja kenttäviivoja' } },
        { id: 't6-cap-i1', type: 'interactive', widget: 'custom', title: { en: 'Plate capacitor explorer', fi: 'Levy\u00ADkondensaattorin tutkija' },
          caption: { en: 'Slide the area, distance and permittivity. C grows with A and ε_r and falls with d, whatever the voltage is.', fi: 'Säädä pinta-alaa, etäisyyttä ja permittiivisyyttä. C kasvaa A:n ja ε_r:n kasvaessa ja pienenee d:n kasvaessa jännitteestä riippumatta.' },
          config: { mount: plateMount } },
        { id: 't6-cap-t1', type: 'text', html: {
          en: '<p>C depends only on size, shape, the material between the conductors and their relative position, not on Q or U. Every pair of conductors has some capacitance; in wires and cables it is unwanted (<dfn data-term="stray">stray capacitance</dfn>). Charged plates attract each other strongly, so the insulator needs both a high dielectric strength and a high relative permittivity.</p>',
          fi: '<p>C riippuu vain koosta, muodosta, johtimien välisestä aineesta ja johtimien keskinäisestä asennosta, ei varauksesta Q eikä jännitteestä U. Jokaisella johdinparilla on jokin kapasitanssi; johtimissa ja kaapeleissa se on haitallinen (<dfn data-term="stray">hajakapasitanssi</dfn>). Varatut levyt vetävät toisiaan voimakkaasti puoleensa, joten eristeen on oltava sekä läpilyöntilujuudeltaan että permittiivisyydeltään hyvä.</p>' } },
        { id: 't6-cap-ex1', type: 'example', title: { en: 'Plate capacitor with mica', fi: 'Levy\u00ADkondensaattori kiilteellä' }, // (extra)
          problem: { en: 'A plate capacitor has A = 0.010 m² (10 cm × 10 cm) and d = 1.0 mm. Find C with air and with mica (ε_r = 7). Then find the charge of a 470 µF capacitor at 12 V.', fi: 'Levy\u00ADkondensaattorin A = 0,010 m² (10 cm × 10 cm) ja d = 1,0 mm. Laske C ilmalla ja kiilteellä (ε_r = 7). Laske sitten 470 µF:n kondensaattorin varaus 12 V:lla.' },
          given: ['A = 0.010 m²', 'd = 1.0 mm', 'ε_r = 1 / 7'],
          steps: [{ tex: { en: 'C_{air} = {8,854·10^{-12} · 0,010}/{1,0·10^{-3}} ≈ 88,5 pF', fi: 'C_{ilma} = {8,854·10^{-12} · 0,010}/{1,0·10^{-3}} ≈ 88,5 pF' } }, { tex: { en: 'C_{mica} = 7 · 88,5 pF ≈ 620 pF', fi: 'C_{kiille} = 7 · 88,5 pF ≈ 620 pF' } }, { tex: 'Q = C U = 470 µF · 12 V = 5,64 mC' }],
          result: { en: 'C_air ≈ 88.5 pF, C_mica ≈ 620 pF, Q = 5.64 mC', fi: 'C_ilma ≈ 88,5 pF, C_kiille ≈ 620 pF, Q = 5,64 mC' } },
        { id: 't6-cap-c1', type: 'callout', kind: 'warn', html: { en: 'The farad is a huge unit: practical capacitors are pF, nF and µF. And C does <b>not</b> change when you raise the voltage; Q rises in proportion.', fi: 'Faradi on valtava yksikkö: käytännön kondensaattorit ovat pF-, nF- ja µF-luokkaa. C ei muutu, kun jännitettä nostetaan; varaus Q kasvaa suhteessa.' } },
        { id: 't6-cap-q1', type: 'question', q: 't6-q1' },
        { id: 't6-cap-q2', type: 'question', q: 't6-q2' }
      ] },
      // ---------------- 6.2 ----------------
      { id: 't6-diel', title: { en: 'Dielectrics', fi: 'Eristeet' }, blocks: [
        { id: 't6-diel-p1', type: 'text', html: {
          en: '<p>A <dfn data-term="dielectric">dielectric</dfn> (paper, plastic, ceramic ...) between the conductors raises the capacitance by the factor ε<sub>r</sub> (in the USA called K). Vacuum is the reference; every other material has ε<sub>r</sub> &gt; 1.</p><p>The <dfn data-term="dielstrength">dielectric strength</dfn> is the largest field before breakdown. The highest voltage of a capacitor is therefore <f>U_{max} = E_{max} · d</f>.</p>',
          fi: '<p><dfn data-term="dielectric">Eriste</dfn> (paperi, muovi, keraami ...) johtimien välissä kasvattaa kapasitanssia kertoimella ε<sub>r</sub> (USA:ssa K). Vertailukohta on tyhjiö; kaikilla muilla aineilla ε<sub>r</sub> &gt; 1.</p><p><dfn data-term="dielstrength">Läpilyöntilujuus</dfn> on suurin kentänvoimakkuus ennen läpilyöntiä. Kondensaattorin suurin jännite on siis <f>U_{max} = E_{max} · d</f>.</p>' } },
        { id: 't6-diel-f1', type: 'formula', key: true, tex: 'ε_r = K = {C}/{C_0} = {ε}/{ε_0}', label: { en: 'Relative permittivity', fi: 'Suhteellinen permittiivisyys' },
          legend: [['C_0', { en: 'capacitance with vacuum', fi: 'kapasitanssi tyhjiöllä' }, 'F']] },
        { id: 't6-diel-tab', type: 'table', caption: { en: 'Relative permittivity and dielectric strength', fi: 'Suhteellinen permittiivisyys ja läpilyöntilujuus' },
          head: [{ en: 'Material', fi: 'Aine' }, { tex: 'ε_r' }, { en: 'E_max (MV/m)', fi: 'E_max (MV/m)' }],
          rows: [[{ en: 'Vacuum', fi: 'Tyhjiö' }, '1.0000', '-'], [{ en: 'Air (1 atm)', fi: 'Ilma (1 atm)' }, '1.0006', '3'], [{ en: 'Paraffin', fi: 'Parafiini' }, '2.2', '10'], [{ en: 'Polystyrene', fi: 'Polystyreeni' }, '2.6', '24'],
                 [{ en: 'Vinyl', fi: 'Vinyyli' }, '2 - 4', '50'], [{ en: 'Paper', fi: 'Paperi' }, '3.7', '15'], [{ en: 'Quartz', fi: 'Kvartsi' }, '4.3', '8'], [{ en: 'Oil', fi: 'Öljy' }, '4', '12'],
                 [{ en: 'Glass, Pyrex', fi: 'Lasi, Pyrex' }, '5', '14'], [{ en: 'Porcelain', fi: 'Posliini' }, '6 - 8', '5'], [{ en: 'Mica', fi: 'Kiille' }, '7', '150'], [{ en: 'Water', fi: 'Vesi' }, '80', '-'], [{ en: 'Strontium titanate', fi: 'Strontiumtitanaatti' }, '300', '8']] },
        { id: 't6-diel-fig', type: 'figure', svg: figPolar, caption: { en: 'Left: field E₀ in vacuum. Right: dipoles in the dielectric align, surface charges appear and the field falls to E₀/K at constant charge, so C rises by K.', fi: 'Vasemmalla: kenttä E₀ tyhjiössä. Oikealla: eristeen dipolit suuntautuvat, pintavaraukset syntyvät ja kenttä heikkenee arvoon E₀/K vakiovarauksella, joten C kasvaa kertoimella K.' }, alt: { en: 'Polarisation of a dielectric', fi: 'Eristeen polarisaatio' } },
        { id: 't6-diel-i1', type: 'interactive', widget: 'readout', title: { en: 'How much voltage can the gap take?', fi: 'Paljonko jännitettä rako kestää?' },
          caption: { en: 'Try mica (150 MV/m) and air (3 MV/m) at d = 1 mm.', fi: 'Kokeile kiillettä (150 MV/m) ja ilmaa (3 MV/m), kun d = 1 mm.' },
          config: { params: [{ id: 'Es', tex: 'E_{max}', min: 3, max: 150, value: 3, unit: 'MV/m' }, { id: 'd', tex: 'd', min: 1e-4, max: 5e-3, value: 1e-3, unit: 'm', log: true }, { id: 'U', tex: 'U', min: 10, max: 200000, value: 1000, unit: 'V', log: true }],
            outputs: function (v) { var Um = v.Es * 1e6 * v.d, E = v.U / v.d / 1e6; return [{ tex: 'U_{max}', value: Um, unit: 'V' }, { tex: 'E = U/d', value: TDC.util.fmtNum(E, 3) + ' MV/m' }, { label: { en: 'Breakdown?', fi: 'Läpilyönti?' }, value: v.U > Um ? { en: '⚠ YES', fi: '⚠ KYLLÄ' } : { en: 'no', fi: 'ei' } }]; } } },
        { id: 't6-diel-ex1', type: 'example', title: { en: 'Maximum voltage of a mica and an air capacitor', fi: 'Kiille- ja ilmakondensaattorin suurin jännite' },
          problem: { en: 'Two plate capacitors have d = 1.0 mm; one has mica, the other air. Find the maximum voltage of each.', fi: 'Kahden levy\u00ADkondensaattorin etäisyys on d = 1,0 mm; toisessa on kiille, toisessa ilma. Laske kummankin suurin jännite.' },
          given: ['d = 1.0 mm', { tex: { en: 'E_{max,mica} = 150 MV/m', fi: 'E_{max,kiille} = 150 MV/m' } }, { tex: { en: 'E_{max,air} = 3 MV/m', fi: 'E_{max,ilma} = 3 MV/m' } }],
          steps: [{ en: 'U_max = E_max · d.', fi: 'U_max = E_max · d.' }, { tex: { en: 'U_{mica} = 150·10^6 · 1,0·10^{-3} = 150 kV', fi: 'U_{kiille} = 150·10^6 · 1,0·10^{-3} = 150 kV' } }, { tex: { en: 'U_{air} = 3·10^6 · 1,0·10^{-3} = 3,0 kV', fi: 'U_{ilma} = 3·10^6 · 1,0·10^{-3} = 3,0 kV' } }],
          result: { en: 'Mica 150 kV, air 3.0 kV', fi: 'Kiille 150 kV, ilma 3,0 kV' } },
        { id: 't6-diel-c1', type: 'callout', kind: 'tip', html: { en: '(extra) A 100 pF air capacitor filled with oil (K = 4) becomes 400 pF. If the charge is kept constant while you fill it, the voltage falls to 1/4.', fi: '(lisä) 100 pF:n ilmakondensaattori muuttuu öljytäytteisenä 400 pF:ksi. Jos varaus pidetään vakiona täytön aikana, jännite putoaa neljäsosaan.' } },
        { id: 't6-diel-q1', type: 'question', q: 't6-q3' }
      ] },
      // ---------------- 6.3 ----------------
      { id: 't6-model', title: { en: 'Capacitor model and applications', fi: 'Kondensaattorin malli ja sovellukset' }, blocks: [
        { id: 't6-model-p1', type: 'text', html: {
          en: '<p>Whatever its technology, a capacitor is modelled by one number, its capacitance: "capacitance is a model of the electric field". The element law links the current to the <em>rate of change</em> of the voltage (associated reference directions, i into the + terminal).</p>',
          fi: '<p>Tekniikasta riippumatta kondensaattoria mallinnetaan yhdellä luvulla, kapasitanssilla: "kapasitanssi on sähkökentän malli". Elementtiyhtälö yhdistää virran jännitteen <em>muutosnopeuteen</em> (virran ja jännitteen vertailusuunnat ovat yhdenmukaiset: i kulkee +napaan).</p>' } },
        { id: 't6-model-f1', type: 'formula', key: true, tex: 'Q = C U,  i = C · {du}/{dt}', label: { en: 'Capacitor laws', fi: 'Kondensaattorin lait' } },
        { id: 't6-model-i1', type: 'interactive', widget: 'readout', title: { en: 'Current from a voltage ramp', fi: 'Virta jännitteen nousussa' },
          caption: { en: 'i = C·Δu/Δt. A steady voltage (Δu = 0) gives zero current.', fi: 'i = C·Δu/Δt. Tasainen jännite (Δu = 0) ei anna virtaa.' },
          config: { params: [{ id: 'C', tex: 'C', min: 1e-7, max: 1e-3, value: 1e-5, unit: 'F', log: true }, { id: 'du', tex: 'Δu', min: 0, max: 20, value: 5, unit: 'V' }, { id: 'dt', tex: 'Δt', min: 1e-5, max: 1e-1, value: 1e-3, unit: 's', log: true }],
            outputs: function (v) { return [{ tex: 'i', value: v.C * v.du / v.dt, unit: 'A' }]; } } },
        { id: 't6-model-fig', type: 'figure', svg: figKey, caption: { en: 'Keyboard key: pressing reduces d, so C rises and the electronics detect the key. Humidity and level sensors work the same way.', fi: 'Näppäimistön näppäin: painallus pienentää d:tä, jolloin C kasvaa ja elektroniikka havaitsee näppäimen. Kosteus- ja pinta-anturit toimivat samoin.' }, alt: { en: 'Capacitive key', fi: 'Kapasitiivinen näppäin' } },
        { id: 't6-model-ex1', type: 'example', title: { en: 'Keyboard and ramp current', fi: 'Näppäin ja nousuvirta' }, // (extra)
          problem: { en: 'a) The key distance falls from 3.0 mm to 1.5 mm. By what factor does C change? b) C = 10 µF; the voltage ramps from 0 to 5 V in 1 ms. Find i.', fi: 'a) Näppäimen etäisyys pienenee 3,0 mm:stä 1,5 mm:iin. Kuinka C muuttuu? b) C = 10 µF; jännite nousee 0:sta 5 V:iin ajassa 1 ms. Laske i.' },
          given: ['d: 3.0 mm → 1.5 mm', 'C = 10 µF', 'Δu = 5 V', 'Δt = 1 ms'],
          steps: [{ tex: 'C ∝ {1}/{d}  ⇒  C_2/C_1 = {3,0}/{1,5} = 2' }, { tex: 'i = C {Δu}/{Δt} = 10·10^{-6} · {5}/{1·10^{-3}} = 50 mA' }],
          result: { en: 'C doubles; i = 50 mA', fi: 'C kaksinkertaistuu; i = 50 mA' } },
        { id: 't6-model-c1', type: 'callout', kind: 'info', title: { en: 'Preview of AC (extra)', fi: 'Esimakua vaihtosähköstä (lisä)' }, html: { en: 'For u = U<sub>m</sub> sin ωt the current i = ωC U<sub>m</sub> cos ωt <b>leads</b> the voltage by 90°. The reactance is <f>X_C = {1}/{ωC}</f>. Later topics build on this.', fi: 'Kun u = U<sub>m</sub> sin ωt, virta i = ωC U<sub>m</sub> cos ωt <b>edeltää</b> jännitettä 90°. Reaktanssi on <f>X_C = {1}/{ωC}</f>. Seuraavat aiheet rakentuvat tälle.' } },
        { id: 't6-model-q1', type: 'question', q: 't6-q10' }
      ] },
      // ---------------- 6.4 ----------------
      { id: 't6-types', title: { en: 'Types of capacitors', fi: 'Kondensaattorityypit' }, blocks: [
        { id: 't6-types-p1', type: 'text', html: { en: '<p>The dielectric and construction decide the range, voltage rating and whether the part is <dfn data-term="polarised">polarised</dfn>.</p>', fi: '<p>Eriste ja rakenne ratkaisevat arvoalueen, jännitekestoisuuden ja sen, onko komponentti <dfn data-term="polarised">napainen</dfn>.</p>' } },
        { id: 't6-types-tab', type: 'table', caption: { en: 'Main capacitor types', fi: 'Tärkeimmät kondensaattorityypit' },
          head: [{ en: 'Type', fi: 'Tyyppi' }, { en: 'Range', fi: 'Alue' }, { en: 'Notes', fi: 'Huomioita' }],
          rows: [[{ en: 'Mica', fi: 'Kiillekondensaattori' }, '1 pF - 0.1 µF', { en: 'foil and mica layers, 100 V - 2.5 kV, very stable', fi: 'folio- ja kiillekerrokset, 100 V - 2,5 kV, erittäin vakaa' }],
                 [{ en: 'Ceramic', fi: 'Keraaminen' }, '1 pF - 2.2 µF', { en: 'disc or multilayer, high ε_r, small size, up to 6 kV', fi: 'levy tai monikerros, suuri ε_r, pieni koko, enintään 6 kV' }],
                 [{ en: 'Plastic film', fi: 'Muovikalvo' }, '1 nF - 100 µF', { en: 'rolled foil and film', fi: 'rullattu folio ja kalvo' }],
                 [{ en: 'Electrolytic', fi: 'Elektrolyytti' }, '1 µF - 200 mF', { en: 'polarised, oxide dielectric, max about 350 V, high leakage; wrong polarity can make it explode', fi: 'napainen, oksidieriste, enintään noin 350 V, suuri vuotovirta; väärä napaisuus voi aiheuttaa räjähdyksen' }],
                 [{ en: 'Tantalum', fi: 'Tantaali' }, 'µF', { en: 'polarised, solid electrolyte, DC only; reverse polarity destroys it', fi: 'napainen, kiinteä elektrolyytti, vain tasasähkö; väärä napaisuus tuhoaa komponentin' }],
                 [{ en: 'Variable / trimmer', fi: 'Muuttuva / trimmeri' }, '< 300 pF / < 100 pF', { en: 'adjusted by hand or screw', fi: 'säädetään käsin tai ruuvilla' }]] },
        { id: 't6-types-fig', type: 'figure', svg: figSymbols, caption: { en: 'Symbols: plain, polarised (+ to the higher potential) and variable.', fi: 'Piirrosmerkit: tavallinen, napainen (+ korkeampaan potentiaaliin) ja muuttuva.' }, alt: { en: 'Capacitor symbols', fi: 'Kondensaattorin piirrosmerkit' } },
        { id: 't6-types-ex1', type: 'example', title: { en: 'Reading a label code', fi: 'Merkintäkoodin lukeminen' }, // (extra)
          problem: { en: 'Decode 104K and 822K.', fi: 'Tulkitse 104K ja 822K.' }, given: ['104K', '822K'],
          steps: [{ tex: '104K = 10·10^4 pF = 100 nF = 0,1 µF,  K = ±10 %' }, { tex: '822K = 82·10^2 pF = 8,2 nF,  ±10 %' }],
          result: { en: '0.1 µF ±10 %, 8.2 nF ±10 %', fi: '0,1 µF ±10 %, 8,2 nF ±10 %' } },
        { id: 't6-types-c1', type: 'callout', kind: 'warn', html: { en: 'Never reverse an electrolytic or tantalum capacitor. (The slide values for ceramic "typical K = 5" and "200 000 ppm/°C" contradict "K around 1200" on the same slide; treat them as typos. The slides also give mica K = 5 in one place and 7 in the table.)', fi: 'Älä koskaan käännä elektrolyytti- tai tantaalikondensaattoria väärin päin. (Dian keraamisen kondensaattorin arvot "tyypillinen K = 5" ja "200 000 ppm/°C" ovat ristiriidassa saman dian arvon "K noin 1200" kanssa; pidä niitä kirjoitusvirheinä. Kiilteen K on diassa kerran 5 ja taulukossa 7.)' } },
        { id: 't6-types-q1', type: 'question', q: 't6-q6' }
      ] },
      // ---------------- 6.5 ----------------
      { id: 't6-geom', title: { en: 'Coaxial cable and parallel wires', fi: 'Koaksiaalikaapeli ja rinnakkaiset johdot' }, blocks: [
        { id: 't6-geom-p1', type: 'text', html: { en: '<p>Cables are long, so their capacitance is given <b>per metre</b>: the total grows with the length and loads fast data signals. A <dfn data-term="coax">coaxial cable</dfn> has an inner conductor (radius R<sub>b</sub>) inside a tube (radius R<sub>a</sub>).</p>', fi: '<p>Kaapelit ovat pitkiä, joten niiden kapasitanssi ilmoitetaan <b>metriä kohti</b>: kokonaiskapasitanssi kasvaa pituuden mukana ja kuormittaa nopeita datasignaaleja. <dfn data-term="coax">Koaksiaalikaapelissa</dfn> sisäjohdin (säde R<sub>b</sub>) on putken (säde R<sub>a</sub>) sisällä.</p>' } },
        { id: 't6-geom-f1', type: 'formula', key: true, tex: 'C_L = {C}/{l} = {2π ε_0 ε_r}/{ln(R_a/R_b)}', label: { en: 'Coaxial cable (R_a outer, R_b inner radius)', fi: 'Koaksiaalikaapeli (R_a ulko-, R_b sisäsäde)' } },
        { id: 't6-geom-f2', type: 'formula', key: true, tex: 'C_L ≈ {π ε_0}/{ln(d/R)}', label: { en: 'Two long parallel wires (d ≫ R, R is the radius)', fi: 'Kaksi pitkää rinnakkaista johtoa (d ≫ R, R on säde)' } },
        { id: 't6-geom-i1', type: 'interactive', widget: 'plot', title: { en: 'Coax capacitance per metre', fi: 'Koaksiaalin kapasitanssi metriä kohti' },
          caption: { en: 'C_L depends on the ratio R_a/R_b only logarithmically. A dielectric multiplies it by ε_r.', fi: 'C_L riippuu suhteesta R_a/R_b vain logaritmisesti. Eriste kertoo sen luvulla ε_r.' },
          config: { x: { min: 1.2, max: 20, label: { en: 'R_a / R_b', fi: 'R_a / R_b' } }, y: { min: 0, max: 400, label: { en: 'C_L', fi: 'C_L' }, unit: 'pF/m', auto: true },
            params: [{ id: 'er', tex: 'ε_r', min: 1, max: 4, step: 0.1, value: 2.3 }, { id: 'k', tex: 'R_a/R_b', min: 1.2, max: 20, step: 0.1, value: 6.5 }],
            curves: [{ fn: function (x, p) { return 2 * Math.PI * E0 * p.er / Math.log(x) * 1e12; }, label: { en: 'C_L', fi: 'C_L' } }],
            points: function (p) { return [{ x: p.k, y: 2 * Math.PI * E0 * p.er / Math.log(p.k) * 1e12 }]; },
            readouts: function (p) { return [{ tex: 'C_L', value: 2 * Math.PI * E0 * p.er / Math.log(p.k) * 1e12, unit: 'pF/m' }]; } } },
        { id: 't6-geom-ex1', type: 'example', title: { en: 'Coax and twin wires', fi: 'Koaksiaali ja kaksoisjohto' }, // (extra) numbers
          problem: { en: 'Coax: R_b = 0.45 mm, R_a = 2.95 mm, ε_r = 2.3. Twin wires in air: d = 10 mm, R = 1 mm. Find C per metre for both, and for the wires at d = 20 mm.', fi: 'Koaksiaali: R_b = 0,45 mm, R_a = 2,95 mm, ε_r = 2,3. Kaksoisjohto ilmassa: d = 10 mm, R = 1 mm. Laske C metriä kohti molemmille sekä johdoille, kun d = 20 mm.' },
          given: ['R_a/R_b = 6.56', 'ε_r = 2.3'],
          steps: [{ tex: 'C_L = {2π · 8,854·10^{-12} · 2,3}/{ln 6,56} ≈ 68,0 pF/m' }, { tex: 'C_L = {π · 8,854·10^{-12}}/{ln 10} ≈ 12,1 pF/m' }, { tex: 'd = 20 mm:  C_L = {π ε_0}/{ln 20} ≈ 9,28 pF/m' }],
          result: { en: '68.0 pF/m; 12.1 pF/m; 9.28 pF/m', fi: '68,0 pF/m; 12,1 pF/m; 9,28 pF/m' } },
        { id: 't6-geom-c1', type: 'callout', kind: 'info', html: { en: 'An insulator between the cables multiplies C by ε_r. Many wires close together have more stray capacitance to their neighbours, which causes crosstalk. (One slide calls R a "diameter"; the formula needs the radius.)', fi: 'Kaapeleiden välinen eriste kertoo C:n luvulla ε_r. Lähekkäiset johdot kytkeytyvät toisiinsa hajakapasitanssilla, mikä aiheuttaa ylikuulumista. (Yksi dia sanoo R:ää halkaisijaksi; kaava vaatii säteen.)' } },
        { id: 't6-geom-q1', type: 'question', q: 't6-q11' }
      ] },
      // ---------------- 6.6 ----------------
      { id: 't6-netw', title: { en: 'Capacitors in series and in parallel', fi: 'Kondensaattorit sarjassa ja rinnan' }, blocks: [
        { id: 't6-netw-p1', type: 'text', html: { en: '<p>Capacitors behave opposite to resistors: capacitances <b>add</b> in parallel and combine by <b>reciprocals</b> in series. In series the charge Q is the same and the voltages add; in parallel the voltage is the same and the charges add.</p>', fi: '<p>Kondensaattorit toimivat päinvastoin kuin vastukset: kapasitanssit <b>summautuvat</b> rinnankytkennässä ja yhdistyvät <b>käänteisarvoilla</b> sarjassa. Sarjassa varaus Q on sama ja jännitteet summautuvat; rinnan jännite on sama ja varaukset summautuvat.</p>' } },
        { id: 't6-netw-cols', type: 'columns', cols: [
          [{ id: 't6-netw-s', type: 'figure', svg: figSeries, caption: { en: 'Series: same Q, U = U₁ + U₂ + U₃', fi: 'Sarja: sama Q, U = U₁ + U₂ + U₃' }, alt: { en: 'Series capacitors', fi: 'Sarjaan kytketyt kondensaattorit' } },
           { id: 't6-netw-fs', type: 'formula', key: true, tex: '{1}/{C_T} = {1}/{C_1} + {1}/{C_2} + {1}/{C_3},  C_T = {C_1 C_2}/{C_1 + C_2},  U_k = {C_T}/{C_k} U_s' }],
          [{ id: 't6-netw-p', type: 'figure', svg: figPar, caption: { en: 'Parallel: same U, Q = Q₁ + Q₂ + Q₃', fi: 'Rinnan: sama U, Q = Q₁ + Q₂ + Q₃' }, alt: { en: 'Parallel capacitors', fi: 'Rinnan kytketyt kondensaattorit' } },
           { id: 't6-netw-fp', type: 'formula', key: true, tex: 'C_{eq} = C_1 + C_2 + C_3' }]
        ] },
        { id: 't6-netw-i1', type: 'interactive', widget: 'readout', title: { en: 'Series and parallel calculator', fi: 'Sarja- ja rinnan\u00ADkytkentä\u00ADlaskuri' },
          caption: { en: 'In series the smallest capacitor gets the largest voltage. Defaults: 4, 6, 12 µF on 24 V.', fi: 'Sarjassa pienin kondensaattori saa suurimman jännitteen. Oletukset: 4, 6, 12 µF 24 V:lla.' },
          config: { params: [{ id: 'C1', tex: 'C_1', min: 1e-6, max: 100e-6, value: 4e-6, unit: 'F', log: true }, { id: 'C2', tex: 'C_2', min: 1e-6, max: 100e-6, value: 6e-6, unit: 'F', log: true }, { id: 'C3', tex: 'C_3', min: 1e-6, max: 100e-6, value: 12e-6, unit: 'F', log: true }, { id: 'U', tex: 'U_s', min: 1, max: 50, value: 24, unit: 'V' }],
            outputs: function (v) { var CT = 1 / (1 / v.C1 + 1 / v.C2 + 1 / v.C3), Q = CT * v.U, Ce = v.C1 + v.C2 + v.C3; return [{ tex: 'C_T', value: CT, unit: 'F' }, { tex: 'Q', value: Q, unit: 'C' }, { tex: 'U_1', value: Q / v.C1, unit: 'V' }, { tex: 'U_2', value: Q / v.C2, unit: 'V' }, { tex: 'U_3', value: Q / v.C3, unit: 'V' }, { tex: 'C_{eq}', value: Ce, unit: 'F' }, { tex: 'Q_{tot}', value: Ce * v.U, unit: 'C' }]; } } },
        { id: 't6-netw-ex1', type: 'example', title: { en: 'Two capacitors in series on 24 V', fi: 'Kaksi sarjaan kytkettyä kondensaattoria 24 V:n jännitteellä' },
          problem: { en: 'C₁ = 100 pF and C₂ = 330 pF are in series across U_s = 24 V. Find C_T, U₁ and U₂.', fi: 'C₁ = 100 pF ja C₂ = 330 pF on kytketty sarjaan jännitteelle U_s = 24 V. Laske C_T, U₁ ja U₂.' },
          given: ['C₁ = 100 pF', 'C₂ = 330 pF', 'U_s = 24 V'],
          steps: [{ tex: 'C_T = {100 · 330}/{100 + 330} = 76,7 pF' }, { tex: 'U_1 = {C_T}/{C_1} U_s = 0,767 · 24 V = 18,4 V' }, { tex: 'U_2 = {76,7}/{330} · 24 V = 5,6 V' }, { en: 'Check: U₁ + U₂ = 24 V. The charge is Q = C_T U_s = 1.84 nC on each capacitor.', fi: 'Tarkistus: U₁ + U₂ = 24 V. Varaus on Q = C_T U_s = 1,84 nC kummallakin kondensaattorilla.' }],
          result: { en: 'C_T = 76.7 pF, U₁ = 18.4 V, U₂ = 5.6 V', fi: 'C_T = 76,7 pF, U₁ = 18,4 V, U₂ = 5,6 V' } },
        { id: 't6-netw-ex2', type: 'example', title: { en: '10, 22 and 47 µF', fi: '10, 22 ja 47 µF' }, // (extra)
          problem: { en: 'Find the parallel and series values.', fi: 'Laske rinnan- ja sarjakytkennän arvot.' }, given: ['10 µF', '22 µF', '47 µF'],
          steps: [{ tex: 'C_{eq} = 10 + 22 + 47 = 79 µF' }, { tex: 'C_T = (1/10 + 1/22 + 1/47)^{-1} = 5,998 µF ≈ 6,0 µF' }],
          result: { en: '79 µF in parallel, 6.0 µF in series', fi: '79 µF rinnan, 6,0 µF sarjassa' } },
        { id: 't6-netw-c1', type: 'callout', kind: 'warn', html: { en: 'In series C_T is smaller than the smallest capacitor; in parallel it is larger than the largest. Two equal 100 pF: 50 pF in series, 200 pF in parallel.', fi: 'Sarjassa C_T on pienempi kuin pienin kondensaattori; rinnan se on suurempi kuin suurin. Kaksi yhtä suurta 100 pF:n kondensaattoria: sarjassa 50 pF, rinnan 200 pF.' } },
        { id: 't6-netw-q1', type: 'question', q: 't6-q4' },
        { id: 't6-netw-q2', type: 'question', q: 't6-q5' }
      ] },
      // ---------------- 6.7 ----------------
      { id: 't6-energy', title: { en: 'Energy stored in a capacitor', fi: 'Kondensaattoriin varastoitunut energia' }, blocks: [
        { id: 't6-energy-p1', type: 'text', html: {
          en: '<p>Moving a small charge dq against the voltage u = q/C costs dW = u·dq. Adding this up from 0 to Q gives the area of the triangle under the u-q line.</p>',
          fi: '<p>Pienen varauksen dq siirto jännitettä u = q/C vastaan vaatii työn dW = u·dq. Summaamalla 0:sta Q:hun saadaan u-q-suoran alle jäävän kolmion pinta-ala.</p>' } },
        { id: 't6-energy-f1', type: 'formula', key: true, tex: 'W = ∫_0^Q u dq = {Q^2}/{2C} = {1}/{2} C U^2 = {1}/{2} Q U', label: { en: 'Stored energy', fi: 'Varastoitunut energia' } },
        { id: 't6-energy-f2', type: 'formula', key: true, tex: 'w = {W}/{A d} = {1}/{2} ε_0 ε_r E^2', label: { en: 'Energy density of the field (J/m³)', fi: 'Kentän energiatiheys (J/m³)' } },
        { id: 't6-energy-i1', type: 'interactive', widget: 'plot', title: { en: 'Energy as the area under u = q/C', fi: 'Energia u = q/C -suoran alla olevana pinta-alana' },
          caption: { en: 'The marked point is the charged state; W is the triangle below it. Doubling U quadruples W.', fi: 'Merkitty piste on varattu tila; W on sen alle jäävä kolmio. U:n kaksinkertaistaminen nelinkertaistaa W:n.' },
          config: { x: { min: 0, max: 15, label: { en: 'Charge Q', fi: 'Varaus Q' }, unit: 'mC' }, y: { min: 0, max: 30, label: { en: 'Voltage u', fi: 'Jännite u' }, unit: 'V' },
            params: [{ id: 'C', tex: 'C', min: 100, max: 1000, value: 470, unit: 'µF' }, { id: 'U', tex: 'U', min: 1, max: 30, value: 12, unit: 'V' }],
            curves: [{ fn: function (x, p) { return x / p.C * 1000; }, label: { en: 'u = q/C', fi: 'u = q/C' } }],
            points: function (p) { return [{ x: p.C * p.U / 1000, y: p.U, label: 'Q' }]; },
            readouts: function (p) { return [{ tex: 'W', value: 0.5 * p.C * 1e-6 * p.U * p.U, unit: 'J' }, { tex: 'Q', value: p.C * 1e-6 * p.U, unit: 'C' }]; } } },
        { id: 't6-energy-ex1', type: 'example', title: { en: 'Energy of two capacitors', fi: 'Kahden kondensaattorin energia' },
          problem: { en: 'a) C = 470 µF at 12 V. b) Air plate capacitor A = 0.01 m², d = 1 mm at 100 V; check with the field formula. c) Air breaks down at 3 MV/m: find the energy density there.', fi: 'a) C = 470 µF, jännite 12 V. b) Ilmaeristeisen levy\u00ADkondensaattorin A = 0,01 m², d = 1 mm ja jännite 100 V; tarkista kenttäkaavalla. c) Ilman läpilyöntikenttä on 3 MV/m: laske energiatiheys tässä kentässä.' },
          given: ['470 µF, 12 V', 'A = 0.01 m², d = 1 mm', 'E = 3 MV/m'],
          steps: [{ tex: 'W = {1}/{2} · 470·10^{-6} · 12^2 = 33,8 mJ' }, { tex: 'C = 88,5 pF,  W = {1}/{2} C U^2 = 0,443 µJ;  E = 100 kV/m,  {1}/{2} ε_0 E^2 A d = 0,443 µJ' }, { tex: 'w = {1}/{2} · 8,854·10^{-12} · (3·10^6)^2 = 39,8 J/m³' }],
          result: { en: '33.8 mJ; 0.443 µJ; 39.8 J/m³', fi: '33,8 mJ; 0,443 µJ; 39,8 J/m³' } },
        { id: 't6-energy-c1', type: 'callout', kind: 'tip', html: { en: '(extra) When a capacitor is charged from a source U_s through a resistor, the source delivers Q·U_s, but only half of it, ½CU_s², ends up in the capacitor. The other half becomes heat in the resistor, whatever R is.', fi: '(lisä) Kun kondensaattori ladataan lähteestä U_s vastuksen kautta, lähde antaa energian Q·U_s, mutta vain puolet, ½CU_s², päätyy kondensaattoriin. Toinen puoli muuttuu lämmöksi vastuksessa R:stä riippumatta.' } },
        { id: 't6-energy-q1', type: 'question', q: 't6-q8' }
      ] },
      // ---------------- 6.8 ----------------
      { id: 't6-dc', title: { en: 'Capacitors in DC circuits', fi: 'Kondensaattorit tasasähköpiireissä' }, blocks: [
        { id: 't6-dc-p1', type: 'text', html: {
          en: '<p>Close the switch: the current first jumps to its maximum as charge flows onto the plates, then falls while u<sub>C</sub> rises. When u<sub>C</sub> = U<sub>s</sub> the current is zero. If the switch opens, the capacitor stays charged for a long time; <dfn data-term="leakage">leakage current</dfn> slowly discharges it.</p>',
          fi: '<p>Kun kytkin suljetaan, virta hyppää ensin suurimmilleen varauksen siirtyessä levyille ja pienenee sitten u<sub>C</sub>:n noustessa. Kun u<sub>C</sub> = U<sub>s</sub>, virta on nolla. Jos kytkin avataan, kondensaattori pysyy ladattuna pitkään; <dfn data-term="leakage">vuotovirta</dfn> purkaa sitä hitaasti.</p>' } },
        { id: 't6-dc-fig', type: 'figure', svg: figRC, caption: { en: 'Series RC charging circuit (the resistor is in series with the capacitor).', fi: 'Sarjaan kytketty RC-latauspiiri (vastus on sarjassa kondensaattorin kanssa).' }, alt: { en: 'RC charging circuit', fi: 'RC-latauspiiri' } },
        { id: 't6-dc-c1', type: 'callout', kind: 'key', title: { en: 'Two rules', fi: 'Kaksi sääntöä' }, html: { en: '<ul><li>In the steady state a capacitor is an <b>open circuit</b> for DC.</li><li>For an instantaneous voltage change (or high frequency) it acts as a <b>short circuit</b>: <f>X_C = {1}/{2π f C} → 0</f>.</li></ul>', fi: '<ul><li>Vakiotilassa kondensaattori on tasasähkölle <b>avoin piiri</b>.</li><li>Äkilliselle jännitteen muutokselle (tai suurelle taajuudelle) se on <b>oikosulku</b>: <f>X_C = {1}/{2π f C} → 0</f>.</li></ul>' } },
        { id: 't6-dc-c2', type: 'callout', kind: 'warn', html: { en: 'The slide says "no current through the capacitor". Charge does not cross the dielectric, but the wire current i = C du/dt is real while u changes. The slide text also says the resistor is "in parallel"; in the figure it is in series.', fi: 'Dia sanoo "kondensaattorin läpi ei kulje virtaa". Varaus ei läpäise eristettä, mutta johtimien virta i = C du/dt on todellinen jännitteen muuttuessa. Dian teksti sanoo vastuksen olevan "rinnan"; kuvassa se on sarjassa.' } },
        { id: 't6-dc-q1', type: 'question', q: 't6-q9' }
      ] },
      // ---------------- 6.9 ----------------
      { id: 't6-rc', title: { en: 'RC time constant and transients', fi: 'RC-aikavakio ja transientit' }, blocks: [
        { id: 't6-rc-p1', type: 'text', html: {
          en: '<p>The <dfn data-term="timeconst">time constant</dfn> τ = RC sets the speed of a <dfn data-term="transient">transient</dfn>. From the initial value U<sub>i</sub> towards the final value U<sub>F</sub> the capacitor voltage follows one exponential. The same form holds for the current with I<sub>i</sub> and I<sub>F</sub>.</p>',
          fi: '<p><dfn data-term="timeconst">Aikavakio</dfn> τ = RC määrää <dfn data-term="transient">transientin</dfn> nopeuden. Alkuarvosta U<sub>i</sub> kohti loppuarvoa U<sub>F</sub> kondensaattorin jännite noudattaa eksponentiaalista käyrää. Sama muoto pätee virralle arvoilla I<sub>i</sub> ja I<sub>F</sub>.</p>' } },
        { id: 't6-rc-f1', type: 'formula', key: true, tex: 'τ = R C,  u = U_F + (U_i − U_F) e^{−t/τ}', label: { en: 'General transient', fi: 'Yleinen transientti' } },
        { id: 't6-rc-f2', type: 'formula', tex: 'u = U_s (1 − e^{−t/τ}),  i = {U_s}/{R} e^{−t/τ},  u = U_i e^{−t/τ}', label: { en: 'Charging from 0 / charging current / discharging', fi: 'Lataus nollasta / latausvirta / purku' } },
        { id: 't6-rc-tab', type: 'table', caption: { en: 'Percent of the final change', fi: 'Prosenttia kokonaismuutoksesta' },
          head: [{ tex: 't' }, '1τ', '2τ', '3τ', '4τ', '5τ'],
          rows: [[{ en: 'Charging, u/U_s', fi: 'Lataus, u/U_s' }, '63 %', '86 %', '95 %', '98 %', '99 %'], [{ en: 'Discharging, u/U_i', fi: 'Purku, u/U_i' }, '37 %', '14 %', '5 %', '2 %', '1 %']] },
        { id: 't6-rc-i1', type: 'interactive', widget: 'plot', title: { en: 'Charge and discharge curves (time in τ)', fi: 'Lataus- ja purkukäyrät (aika yksikössä τ)' },
          caption: { en: 'Set R, C and U_s: the curves keep their shape, only the time scale τ changes. Markers at 1τ ... 5τ.', fi: 'Säädä R, C ja U_s: käyrien muoto säilyy, vain aika-asteikko τ muuttuu. Merkit kohdissa 1τ ... 5τ.' },
          config: { x: { min: 0, max: 5, label: { en: 't / τ', fi: 't / τ' } }, y: { min: 0, max: 1.05, label: { en: 'u / U', fi: 'u / U' } },
            params: [{ id: 'R', tex: 'R', min: 100, max: 1e6, value: 1e4, unit: 'Ω', log: true }, { id: 'C', tex: 'C', min: 1e-9, max: 1e-3, value: 1e-5, unit: 'F', log: true }, { id: 'Us', tex: 'U_s', min: 1, max: 50, value: 12, unit: 'V' }],
            curves: [{ fn: function (x) { return 1 - Math.exp(-x); }, label: { en: 'charging', fi: 'lataus' } }, { fn: function (x) { return Math.exp(-x); }, label: { en: 'discharging', fi: 'purku' }, color: '--c-3' }],
            points: function () { return [1, 2, 3, 4, 5].map(function (k) { return { x: k, y: 1 - Math.exp(-k) }; }); },
            vlines: function () { return [{ x: 1, label: 'τ' }]; },
            readouts: function (p) { return [{ tex: 'τ', value: p.R * p.C, unit: 's' }, { tex: '5τ', value: 5 * p.R * p.C, unit: 's' }, { tex: 'I_0 = U_s/R', value: p.Us / p.R, unit: 'A' }]; } } },
        { id: 't6-rc-ex1', type: 'example', title: { en: 'Time constant and early charging', fi: 'Aikavakio ja alkulataus' },
          problem: { en: 'a) R = 2.0 kΩ, C = 750 µF: find τ. b) R = 250 Ω, C = 150 µF, U_s = 25 V: find u at t = 0.25 ms.', fi: 'a) R = 2,0 kΩ, C = 750 µF: laske τ. b) R = 250 Ω, C = 150 µF, U_s = 25 V: laske u hetkellä t = 0,25 ms.' },
          given: ['R = 2.0 kΩ, C = 750 µF', 'R = 250 Ω, C = 150 µF, U_s = 25 V'],
          steps: [{ tex: 'τ = 2000 · 750·10^{-6} = 1,5 s' }, { tex: 'τ = 250 · 150·10^{-6} = 37,5 ms' }, { tex: 'u = 25 (1 − e^{−0,25/37,5}) = 25 · 0,006645 = 0,166 V' }],
          result: { en: 'τ = 1.5 s; u = 166 mV', fi: 'τ = 1,5 s; u = 166 mV' } },
        { id: 't6-rc-ex2', type: 'example', title: { en: 'Discharging 2.2 µF through 10 kΩ', fi: '2,2 µF:n purku 10 kΩ:n kautta' },
          problem: { en: 'C = 2.2 µF is charged to 10 V and discharges through R = 10 kΩ. Find u at 6.0 ms and the time to be practically empty.', fi: 'C = 2,2 µF on ladattu 10 V:iin ja purkautuu vastuksen R = 10 kΩ kautta. Laske u hetkellä 6,0 ms ja aika, jolloin kondensaattori on käytännössä tyhjä.' },
          given: ['U_i = 10 V', 'R = 10 kΩ', 'C = 2.2 µF'],
          steps: [{ tex: 'τ = 10·10^3 · 2,2·10^{-6} = 22 ms' }, { tex: 'u = 10 e^{−6/22} = 7,61 V' }, { tex: '5τ = 110 ms' }],
          result: { en: '7.61 V; about 110 ms', fi: '7,61 V; noin 110 ms' } },
        { id: 't6-rc-ex3', type: 'example', title: { en: 'Time to reach 75 V; value at 2τ', fi: 'Aika 75 V:iin; arvo 2τ:ssa' },
          problem: { en: 'U_s = 100 V, R = 100 kΩ, C = 10 nF. a) When does u reach 75 V? b) Find u at t = 2.0 ms.', fi: 'U_s = 100 V, R = 100 kΩ, C = 10 nF. a) Milloin u saavuttaa 75 V? b) Laske u hetkellä t = 2,0 ms.' },
          given: ['U_s = 100 V', 'R = 100 kΩ', 'C = 10 nF'],
          steps: [{ tex: 'τ = 100·10^3 · 10·10^{-9} = 1,0 ms' }, { tex: 't = −τ ln(1 − 0,75) = 1,0 ms · 1,386 = 1,39 ms' }, { tex: 'u(2 ms) = 100 (1 − e^{−2}) = 86,5 V' }, { en: '(extra) With 12 V, 1 kΩ, 100 µF: τ = 0.1 s, initial current 12 mA; at t = τ: u = 7.59 V, i = 4.41 mA.', fi: '(lisä) Kun jännite on 12 V, R = 1 kΩ ja C = 100 µF: τ = 0,1 s, alkuvirta 12 mA; hetkellä t = τ: u = 7,59 V, i = 4,41 mA.' }],
          result: { en: 't = 1.39 ms; u = 86.5 V', fi: 't = 1,39 ms; u = 86,5 V' } },
        { id: 't6-rc-c1', type: 'callout', kind: 'warn', html: { en: 'After one τ the discharging voltage is at 37 % of the start, i.e. it has fallen by 63 % (the slide wrongly writes 67 %). After 5τ the transient is over (99.3 %).', fi: 'Yhden τ:n jälkeen purkautuva jännite on 37 % alkuarvosta eli se on pudonnut 63 % (dia kirjoittaa virheellisesti 67 %). 5τ:n jälkeen transientti on ohi (99,3 %).' } },
        { id: 't6-rc-c2', type: 'callout', kind: 'tip', html: { en: '(extra) Time to reach fraction f: t = −τ ln(1 − f). Half-way: t = 0.693 τ. 95 % takes 3τ (2.996τ exactly).', fi: '(lisä) Aika osuuteen f: t = −τ ln(1 − f). Puoliväli: t = 0,693 τ. 95 % vaatii 3τ (tarkasti 2,996τ).' } },
        { id: 't6-rc-q1', type: 'question', q: 't6-q7' },
        { id: 't6-rc-q2', type: 'question', q: 't6-q12' }
      ] }
    ],
    questions: [
      { id: 't6-q1', mode: 'practice', type: 'fill', difficulty: 1,
        prompt: { en: 'Complete the definition of capacitance.', fi: 'Täydennä kapasitanssin määritelmä.' },
        text: { en: 'C = [[a]] / [[b]], so the unit farad equals [[c]] per volt.', fi: 'C = [[a]] / [[b]], joten yksikkö faradi on [[c]] jaettuna voltilla.' },
        fields: [{ id: 'a', kind: 'text' }, { id: 'b', kind: 'text' }, { id: 'c', kind: 'text' }] },
      { id: 't6-q2', mode: 'practice', type: 'numeric', difficulty: 1, tol: 0.02,
        prompt: { en: 'A plate capacitor has A = 0.010 m², d = 1.0 mm and a mica dielectric (<f>ε_r = 7</f>). Find C.', fi: 'Levy\u00ADkondensaattorin A = 0,010 m², d = 1,0 mm ja eristeenä kiille (<f>ε_r = 7</f>). Laske C.' },
        fields: [{ id: 'C', tex: 'C', unit: 'F' }] },
      { id: 't6-q3', mode: 'practice', type: 'mc', difficulty: 2, shuffle: true,
        prompt: { en: 'A charged capacitor is isolated (Q constant) and a dielectric with K = 4 is inserted. What happens?', fi: 'Varattu kondensaattori eristetään (Q vakio) ja siihen työnnetään eriste, jolla K = 4. Mitä tapahtuu?' },
        options: [{ id: 'a', html: { en: 'C rises 4 times, U falls to 1/4', fi: 'C kasvaa nelinkertaiseksi, U putoaa neljäsosaan' } }, { id: 'b', html: { en: 'C falls to 1/4, U rises 4 times', fi: 'C putoaa neljäsosaan, U nelinkertaistuu' } }, { id: 'c', html: { en: 'C and U stay the same', fi: 'C ja U pysyvät samoina' } }, { id: 'd', html: { en: 'C and U both rise 4 times', fi: 'C ja U kasvavat kumpikin nelinkertaiseksi' } }] },
      { id: 't6-q4', mode: 'practice', type: 'numeric', difficulty: 3, tol: 0.01,
        prompt: { en: '<f>C_1 = 100 pF</f> and <f>C_2 = 330 pF</f> are in series across 24 V. Find the voltage <f>U_1</f> across C₁.', fi: '<f>C_1 = 100 pF</f> ja <f>C_2 = 330 pF</f> on kytketty sarjaan 24 V:n jännitteelle. Laske C₁:n jännite <f>U_1</f>.' },
        fields: [{ id: 'U1', tex: 'U_1', unit: 'V' }], hints: [{ en: 'The charge is the same on both.', fi: 'Varaus on sama molemmilla.' },
          { en: 'Find the series total C_T first, then the charge Q = C_T · U_s that flows through both.', fi: 'Laske ensin sarjakapasitanssi C_T ja sitten molempien läpi kulkeva varaus Q = C_T · U_s.' },
          { en: 'The voltage across C_1 is U_1 = Q / C_1.', fi: 'C_1:n jännite on U_1 = Q / C_1.' }] },
      { id: 't6-q5', mode: 'practice', type: 'multi', difficulty: 1,
        prompt: { en: 'Select all statements that are true for capacitors in series.', fi: 'Valitse kaikki sarjaan kytketyille kondensaattoreille pätevät väitteet.' },
        options: [{ id: 'a', html: { en: 'They carry the same charge.', fi: 'Niillä on sama varaus.' } }, { id: 'b', html: { en: 'They have the same voltage.', fi: 'Niillä on sama jännite.' } }, { id: 'c', html: { en: 'The voltages add up to the source voltage.', fi: 'Jännitteet summautuvat lähdejännitteeksi.' } }, { id: 'd', tex: '1/C_T = Σ 1/C_i' }, { id: 'e', html: { en: 'C_T is larger than the largest capacitor.', fi: 'C_T on suurempi kuin suurin kondensaattori.' } }] },
      { id: 't6-q6', mode: 'practice', type: 'match', difficulty: 1,
        prompt: { en: 'Match each capacitor type with its characteristic.', fi: 'Yhdistä kondensaattorityyppi ja sen tunnusomainen piirre.' },
        left: [{ id: 'mica', html: { en: 'mica', fi: 'kiille' } }, { id: 'cer', html: { en: 'ceramic', fi: 'keraaminen' } }, { id: 'film', html: { en: 'plastic film', fi: 'muovikalvo' } }, { id: 'el', html: { en: 'aluminium electrolytic', fi: 'alumiinielektrolyytti' } }, { id: 'ta', html: { en: 'tantalum', fi: 'tantaali' } }, { id: 'tr', html: { en: 'trimmer', fi: 'trimmeri' } }],
        right: [{ id: 'r1', html: { en: 'very stable, 1 pF - 0.1 µF, high voltage', fi: 'erittäin vakaa, 1 pF - 0,1 µF, suuri jännite' } }, { id: 'r2', html: { en: 'high ε_r, large C in small size', fi: 'suuri ε_r, suuri C pienessä koossa' } }, { id: 'r3', html: { en: 'rolled foil and film, nF - 100 µF', fi: 'rullattu folio ja kalvo, nF - 100 µF' } }, { id: 'r4', html: { en: 'polarised, 1 µF - 200 mF, leaky', fi: 'napainen, 1 µF - 200 mF, suuri vuotovirta' } }, { id: 'r5', html: { en: 'polarised, solid electrolyte, DC only', fi: 'napainen, kiinteä elektrolyytti, vain tasasähkö' } }, { id: 'r6', html: { en: 'screw-adjusted, below 100 pF', fi: 'ruuvilla säädettävä, alle 100 pF' } }] },
      { id: 't6-q7', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.01,
        prompt: { en: 'C = 2.2 µF is charged to 10 V and discharges through 10 kΩ. Find the voltage after 6.0 ms.', fi: 'C = 2,2 µF on ladattu 10 V:iin ja purkautuu 10 kΩ:n kautta. Laske jännite 6,0 ms:n kuluttua.' },
        fields: [{ id: 'u', tex: 'u', unit: 'V' }] },
      { id: 't6-q8', mode: 'practice', type: 'numeric', difficulty: 1, tol: 0.01,
        prompt: { en: 'How much energy is stored in a 470 µF capacitor charged to 12 V?', fi: 'Paljonko energiaa on varastoituneena 12 V:iin ladatussa 470 µF:n kondensaattorissa?' },
        fields: [{ id: 'W', tex: 'W', unit: 'J' }] },
      { id: 't6-q9', mode: 'practice', type: 'fill', difficulty: 1,
        prompt: { en: 'Complete.', fi: 'Täydennä.' },
        text: { en: 'In the DC steady state a capacitor acts as an [[a]] circuit; for an instantaneous voltage step it acts as a [[b]] circuit.', fi: 'Tasasähkön vakiotilassa kondensaattori on [[a]] piiri; äkilliselle jännitteen askeleelle se on [[b]].' },
        fields: [{ id: 'a', kind: 'text' }, { id: 'b', kind: 'text' }] },
      { id: 't6-q10', mode: 'practice', type: 'slider', difficulty: 2, tol: 0.03,
        prompt: { en: 'An air plate capacitor has A = 0.010 m². Adjust the distance d so that C = 100 pF.', fi: 'Ilmalevykondensaattorin A = 0,010 m². Säädä etäisyys d niin, että C = 100 pF.' },
        widget: { name: 'plot', config: {
          x: { min: 0.1, max: 5, label: { en: 'd', fi: 'd' }, unit: 'mm' }, y: { min: 0, max: 900, label: { en: 'C', fi: 'C' }, unit: 'pF' },
          params: [{ id: 'd', tex: 'd', min: 0.1, max: 5, value: 3, unit: 'mm', step: 0.005 }],
          curves: [{ fn: function (x) { return E0 * 0.01 / (x * 1e-3) * 1e12; } }],
          points: function (p) { return [{ x: p.d, y: E0 * 0.01 / (p.d * 1e-3) * 1e12 }]; },
          readouts: function (p) { return [{ tex: 'C', value: E0 * 0.01 / (p.d * 1e-3), unit: 'F' }]; },
          answer: function (p) { return { v: E0 * 0.01 / (p.d * 1e-3) }; } } } },
      { id: 't6-q11', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.02,
        prompt: { en: 'Two long parallel wires in air, wire radius R = 1 mm and distance d = 20 mm. Find C per metre.', fi: 'Kaksi pitkää rinnakkaista johtoa ilmassa, säde R = 1 mm ja etäisyys d = 20 mm. Laske C metriä kohti.' },
        fields: [{ id: 'CL', tex: 'C_L', unit: 'F/m' }] },
      { id: 't6-q12', mode: 'practice', type: 'order', difficulty: 2,
        prompt: { en: 'Order by the time at which a charging capacitor reaches the given percentage of its final voltage (earliest first).', fi: 'Järjestä ajan mukaan, milloin latautuva kondensaattori saavuttaa annetun prosenttiosuuden loppujännitteestään (aikaisin ensin).' },
        items: [{ id: 'p99', html: { en: '99 %', fi: '99 %' } }, { id: 'p63', html: { en: '63 %', fi: '63 %' } }, { id: 'p95', html: { en: '95 %', fi: '95 %' } }, { id: 'p86', html: { en: '86 %', fi: '86 %' } }] },
      // ---- graded ----
      { id: 't6-g1', mode: 'graded', type: 'mc', difficulty: 1, points: 1, shuffle: true,
        prompt: { en: 'On what does the capacitance of a given capacitor depend?', fi: 'Mistä tietyn kondensaattorin kapasitanssi riippuu?' },
        options: [{ id: 'a', html: { en: 'The charge Q only', fi: 'Pelkästään varauksesta Q' } }, { id: 'b', html: { en: 'The voltage U only', fi: 'Pelkästään jännitteestä U' } }, { id: 'c', html: { en: 'Size, shape, dielectric and relative position of the conductors', fi: 'Johtimien koosta, muodosta, eristeestä ja keskinäisestä asennosta' } }, { id: 'd', html: { en: 'The current through it', fi: 'Sen läpi kulkevasta virrasta' } }] },
      { id: 't6-g2', mode: 'graded', type: 'numeric', difficulty: 1, points: 2, tol: 0.01,
        prompt: { en: '<f>C_1 = 100 pF</f> and <f>C_2 = 330 pF</f> are connected in series. Find <f>C_T</f>.', fi: '<f>C_1 = 100 pF</f> ja <f>C_2 = 330 pF</f> on kytketty sarjaan. Laske <f>C_T</f>.' },
        fields: [{ id: 'CT', tex: 'C_T', unit: 'F' }] },
      { id: 't6-g3', mode: 'graded', type: 'numeric', difficulty: 1, points: 2, tol: 0.01,
        prompt: { en: '<f>R = 2.0 kΩ</f> and <f>C = 750 µF</f>. Find the time constant.', fi: '<f>R = 2,0 kΩ</f> ja <f>C = 750 µF</f>. Laske aikavakio.' },
        fields: [{ id: 'tau', tex: 'τ', unit: 's' }] },
      { id: 't6-g4', mode: 'graded', type: 'numeric', difficulty: 2, points: 3, tol: 0.02,
        prompt: { en: 'An uncharged <f>C = 150 µF</f> is charged through <f>R = 250 Ω</f> from <f>U_s = 25 V</f>. Find the capacitor voltage at <f>t = 0.25 ms</f>.', fi: 'Varaamaton <f>C = 150 µF</f> ladataan vastuksen <f>R = 250 Ω</f> kautta lähteestä <f>U_s = 25 V</f>. Laske kondensaattorin jännite hetkellä <f>t = 0,25 ms</f>.' },
        fields: [{ id: 'u', tex: 'u', unit: 'V' }] },
      { id: 't6-g5', mode: 'graded', type: 'slider', difficulty: 3, points: 3, tol: 0.02,
        prompt: { en: 'U_s = 100 V charges C through R = 100 kΩ. Adjust C so that the capacitor voltage is 75 V at t = 2.0 ms.', fi: 'U_s = 100 V lataa C:n vastuksen R = 100 kΩ kautta. Säädä C niin, että kondensaattorin jännite on 75 V hetkellä t = 2,0 ms.' },
        hints: [{ en: 'Use the charging law u = U_s (1 − e^(−t/τ)) with τ = R C.', fi: 'Käytä latauslakia u = U_s (1 − e^(−t/τ)), missä τ = R C.' },
          { en: 'Solve the law for τ first: put in u, U_s and t, and take the natural logarithm of e^(−t/τ).', fi: 'Ratkaise laista ensin τ: sijoita u, U_s ja t ja ota e^(−t/τ):n luonnollinen logaritmi.' },
          { en: 'Once τ is known, C = τ / R.', fi: 'Kun τ tunnetaan, C = τ / R.' }],
        widget: { name: 'plot', config: {
          x: { min: 0, max: 6, label: { en: 't', fi: 't' }, unit: 'ms' }, y: { min: 0, max: 100, label: { en: 'u', fi: 'u' }, unit: 'V' },
          params: [{ id: 'C', tex: 'C', min: 1e-9, max: 5e-8, value: 3e-8, unit: 'F', log: true }],
          curves: [{ fn: function (x, p) { return 100 * (1 - Math.exp(-x * 1e-3 / (1e5 * p.C))); } }],
          vlines: function () { return [{ x: 2, label: '2 ms' }]; },
          points: function (p) { return [{ x: 2, y: 100 * (1 - Math.exp(-2e-3 / (1e5 * p.C))) }]; },
          readouts: function (p) { return [{ tex: 'u(2 ms)', value: 100 * (1 - Math.exp(-2e-3 / (1e5 * p.C))), unit: 'V' }]; },
          answer: function (p) { return { v: p.C }; } } } },
      { id: 't6-g6', mode: 'graded', type: 'mc', difficulty: 1, points: 1, shuffle: true,
        prompt: { en: 'What can happen if a polarised electrolytic capacitor is connected with reversed polarity?', fi: 'Mitä voi tapahtua, jos napainen elektrolyyttikondensaattori kytketään väärin päin?' },
        options: [{ id: 'a', html: { en: 'Nothing, it works the same', fi: 'Ei mitään, se toimii samoin' } }, { id: 'b', html: { en: 'Its capacitance halves', fi: 'Sen kapasitanssi puolittuu' } }, { id: 'c', html: { en: 'It may be destroyed or explode', fi: 'Se voi tuhoutua tai räjähtää' } }, { id: 'd', html: { en: 'Its capacitance doubles', fi: 'Sen kapasitanssi kaksinkertaistuu' } }] }
    ]
  });
})();

/* Topic 7: Coils (inductors) and inductance. Source: EE7 CoilsInductance.pdf. NO answers here (src/answers/topic7.json). */
(function () {
  var MU0 = 4 * Math.PI * 1e-7;
  // SVG: inductor circuit model (V = L di/dt)
  var svgModel = '<svg viewBox="0 0 320 110" role="img" style="max-width:420px;width:100%" fill="none" stroke="currentColor" stroke-width="2">' +
    '<path d="M10 70H90"/><path d="M90 70c0-22 20-22 20 0c0-22 20-22 20 0c0-22 20-22 20 0c0-22 20-22 20 0"/><path d="M170 70H250"/>' +
    '<path d="M30 45H60"/><path d="M54 40l8 5l-8 5" fill="currentColor"/>' +
    '<path d="M95 30Q130 5 165 30"/><path d="M160 22l6 8l-9 1" fill="currentColor"/>' +
    '<g fill="currentColor" stroke="none" font-size="16"><text x="124" y="98">L</text><text x="40" y="35">i</text><text x="124" y="14">V</text></g></svg>';
  // SVG: three coil symbols
  function coil(x, extra) {
    return '<g transform="translate(' + x + ',0)"><path d="M0 60H20"/><path d="M20 60c0-18 15-18 15 0c0-18 15-18 15 0c0-18 15-18 15 0c0-18 15-18 15 0"/><path d="M80 60H100"/>' + extra + '</g>';
  }
  var svgSyms = '<svg viewBox="0 0 340 120" role="img" style="max-width:520px;width:100%" fill="none" stroke="currentColor" stroke-width="2">' +
    coil(0, '') + coil(115, '<path d="M20 30H80M20 36H80"/>') + coil(230, '<path d="M25 85L75 25"/><path d="M66 24l10 0l-1 10" fill="currentColor"/>') +
    '<g fill="currentColor" stroke="none" font-size="14"><text x="40" y="112">(a)</text><text x="155" y="112">(b)</text><text x="270" y="112">(c)</text></g></svg>';
  // SVG: real inductor equivalent circuit
  var svgReal = '<svg viewBox="0 0 340 130" role="img" style="max-width:460px;width:100%" fill="none" stroke="currentColor" stroke-width="2">' +
    '<path d="M10 80H40"/><rect x="40" y="70" width="50" height="20"/><path d="M90 80H120"/>' +
    '<path d="M120 80c0-20 15-20 15 0c0-20 15-20 15 0c0-20 15-20 15 0c0-20 15-20 15 0"/><path d="M180 80H320"/>' +
    '<path d="M25 80V30H175"/><path d="M175 20V40M185 20V40"/><path d="M185 30H300V80"/>' +
    '<circle cx="10" cy="80" r="3"/><circle cx="320" cy="80" r="3"/>' +
    '<g fill="currentColor" stroke="none" font-size="14"><text x="55" y="110">R_W</text><text x="140" y="110">L</text><text x="170" y="14">C_W</text></g></svg>';

  TDC.registerTopic({
    id: 't7', num: 7,
    title: { en: 'Coils and inductance', fi: 'Kelat ja induktanssi' },
    subtitle: { en: 'Magnetic field as a circuit element: self-inductance, solenoids, series and parallel coils, energy and the RL time constant.',
                fi: 'Magneettikenttä piirielementtinä: itseinduktio, solenoidi, kelojen sarja- ja rinnankytkentä, energia ja RL-aikavakio.' },
    objectives: [
      { en: 'explain self-inductance and Lenz\'s law, and use <f>V = L·di/dt</f>', fi: 'selittää itseinduktio ja Lenzin laki sekä käyttää kaavaa <f>V = L·di/dt</f>' },
      { en: 'compute the inductance of a solenoid from N, A, l and μ_r', fi: 'laskea solenoidin induktanssi suureista N, A, l ja μ_r' },
      { en: 'combine inductors in series and in parallel', fi: 'laskea kelojen kokonaisinduktanssi sarja- ja rinnankytkennässä' },
      { en: 'describe a real inductor and compute the energy <f>W = ½·L·I²</f>', fi: 'kuvata todellinen kela ja laskea energia <f>W = ½·L·I²</f>' },
      { en: 'find the time constant τ = L/R and the current in a series RL circuit', fi: 'määrittää aikavakio τ = L/R ja virta RL-sarjapiirissä' }
    ],
    glossary: {
      inductor: { en: 'coil, inductor', fi: 'kela, induktori', sym: 'L', def: { en: 'A component made of wound wire that stores energy in a magnetic field.', fi: 'Johtimesta kierretty komponentti, joka varastoi energiaa magneettikenttään.' } },
      inductance: { en: 'inductance, self-inductance', fi: 'induktanssi, itseinduktio', sym: 'L', def: { en: 'Ratio of magnetic flux to current, Φ = L·I. Unit henry (H) = Ωs.', fi: 'Magneettivuon ja virran suhde, Φ = L·I. Yksikkö henry (H) = Ωs.' } },
      solenoid: { en: 'solenoid', fi: 'solenoidi, sylinterikela', def: { en: 'A tightly wound cylindrical coil.', fi: 'Tiukasti kierretty sylinterimäinen kela.' } },
      toroid: { en: 'toroid, toroidal coil', fi: 'toroidi, rengaskela', def: { en: 'A coil wound on a ring-shaped core.', fi: 'Rengasmaiselle sydämelle kierretty kela.' } },
      permeability: { en: 'permeability', fi: 'permeabiliteetti', sym: 'μ', def: { en: 'How easily a material supports a magnetic field. μ = μ₀·μ_r.', fi: 'Aineen kyky johtaa magneettikenttää. μ = μ₀·μ_r.' } },
      lenz: { en: "Lenz's law", fi: 'Lenzin laki', def: { en: 'The induced voltage always opposes the change of current that causes it.', fi: 'Indusoitunut jännite vastustaa aina sitä aiheuttavaa virran muutosta.' } },
      timeconstant: { en: 'time constant', fi: 'aikavakio', sym: 'τ', def: { en: 'τ = L/R: the time scale of the exponential change in an RL circuit.', fi: 'τ = L/R: RL-piirin eksponentiaalisen muutoksen aika-asteikko.' } },
      corewinding: { en: 'winding resistance', fi: 'käämin resistanssi', sym: 'R_W', def: { en: 'Resistance of the winding wire; in series with L.', fi: 'Käämilangan resistanssi; sarjassa L:n kanssa.' } },
      straycap: { en: 'stray capacitance', fi: 'hajakapasitanssi', sym: 'C_W', def: { en: 'Capacitance between adjacent turns, in parallel with the winding.', fi: 'Vierekkäisten kierrosten välinen kapasitanssi, rinnan käämin kanssa.' } },
      storedenergy: { en: 'stored energy', fi: 'varastoitunut energia', sym: 'W', def: { en: 'Energy kept in the magnetic field, W = ½LI².', fi: 'Magneettikenttään varastoitunut energia, W = ½LI².' } }
    },
    formulas: [
      { name: { en: 'Inductor voltage', fi: 'Kelan jännite' }, tex: 'V = L · {di}/{dt}' },
      { name: { en: 'Induced EMF', fi: 'Indusoitunut jännite' }, tex: 'ε = -L · {ΔI}/{Δt}' },
      { name: { en: 'Solenoid inductance', fi: 'Solenoidin induktanssi' }, tex: 'L = {N^2 · μ_0 · μ_r · A}/{l}' },
      { name: { en: 'Inductors in series', fi: 'Kelat sarjassa' }, tex: 'L_T = L_1 + L_2 + … + L_n' },
      { name: { en: 'Inductors in parallel', fi: 'Kelat rinnan' }, tex: '{1}/{L_T} = {1}/{L_1} + {1}/{L_2} + … + {1}/{L_n}' },
      { name: { en: 'Energy of an inductor', fi: 'Kelan energia' }, tex: 'W = {1}/{2} · L · I^2' },
      { name: { en: 'RL time constant', fi: 'RL-aikavakio' }, tex: 'τ = {L}/{R}' },
      { name: { en: 'Exponential current', fi: 'Eksponentiaalinen virta' }, tex: 'i(t) = I_f + (I_i - I_f) · e^{-t/τ}' }
    ],
    sections: [
      // ---------------------------------------------------------------- 7.1
      { id: 't7-self', title: { en: 'Coils and self-inductance', fi: 'Kelat ja itseinduktio' }, blocks: [
        { id: 't7-self-p1', type: 'text', html: {
          en: '<p>A wire wound into a cylinder is a <dfn data-term="inductor">coil</dfn> (inductor). Special forms are the <dfn data-term="solenoid">solenoid</dfn> and the <dfn data-term="toroid">toroid</dfn>. The core is air or, usually, a material with high <dfn data-term="permeability">permeability</dfn> μ.</p><p>A constant current gives a constant magnetic field. When the current <em>changes</em>, the field changes and induces a voltage in the coil, always in the direction that <b>opposes</b> the change. This property is <dfn data-term="inductance">self-inductance</dfn> L.</p>',
          fi: '<p>Sylinteriksi kierretty johdin on <dfn data-term="inductor">kela</dfn> (induktori). Erikoismuotoja ovat <dfn data-term="solenoid">solenoidi</dfn> ja <dfn data-term="toroid">toroidi</dfn>. Sydän on ilmaa tai yleensä aine, jonka <dfn data-term="permeability">permeabiliteetti</dfn> μ on suuri.</p><p>Vakiovirta synnyttää vakiomagneettikentän. Kun virta <em>muuttuu</em>, kenttä muuttuu ja indusoi kelaan jännitteen, jonka suunta on aina muutosta <b>vastustava</b>. Tätä ominaisuutta kuvaa <dfn data-term="inductance">itseinduktanssi</dfn> L.</p>' } },
        { id: 't7-self-f1', type: 'formula', key: true, tex: 'Φ = L · I,  V = L · {di}/{dt}', label: { en: 'Inductance and the circuit model', fi: 'Induktanssi ja piirimalli' },
          legend: [['L', { en: 'inductance', fi: 'induktanssi' }, 'H'], ['Φ', { en: 'magnetic flux', fi: 'magneettivuo' }, 'Wb'], ['di/dt', { en: 'rate of change of current', fi: 'virran muutosnopeus' }, 'A/s']] },
        { id: 't7-self-fig1', type: 'figure', svg: svgModel,
          caption: { en: 'Circuit model of an inductor: V and i in the same direction (passive convention).', fi: 'Kelan piirimalli: V ja i on valittu samansuuntaisiksi (passiivinen merkintätapa).' },
          alt: { en: 'Inductor symbol with current i and voltage V', fi: 'Kelan symboli, virta i ja jännite V' } },
        { id: 't7-self-f2', type: 'formula', tex: 'ε = -L · {ΔI}/{Δt},  [L] = {Vs}/{A} = Ωs = H', label: { en: 'Induced EMF and the unit henry', fi: 'Indusoitunut jännite ja yksikkö henry' } },
        { id: 't7-self-c1', type: 'callout', kind: 'key', title: { en: "Lenz's law", fi: 'Lenzin laki' }, html: {
          en: 'The induced voltage always opposes the <em>change</em> of current. That is the meaning of the minus sign in <f>ε = -L·ΔI/Δt</f>. The voltage drop across the coil is <f>V = -ε = L·di/dt</f>.',
          fi: 'Indusoitunut jännite vastustaa aina virran <em>muutosta</em>. Tämä on miinusmerkin merkitys kaavassa <f>ε = -L·ΔI/Δt</f>. Kelan napojen välinen jännite on <f>V = -ε = L·di/dt</f>.' } },
        { id: 't7-self-ex1', type: 'example', title: { en: 'EMF of a coil', fi: 'Kelan indusoituva jännite' },
          problem: { en: 'The current of a 35.0 mH coil rises from 1.0 A to 5.0 A in 0.1 s. Find the induced voltage.', fi: '35,0 mH:n kelan virta nousee 1,0 A:sta 5,0 A:iin ajassa 0,1 s. Laske indusoitunut jännite.' },
          given: ['L = 35.0 mH', 'ΔI = 5.0 A - 1.0 A = 4.0 A', 'Δt = 0.1 s'],
          steps: [
            { tex: 'ε = -L · {ΔI}/{Δt} = -35.0·10^{-3} · {4.0}/{0.1}' },
            { tex: 'ε = -35.0·10^{-3} · 40 = -1.4 V' },
            { en: 'The magnitude is 1.4 V; the minus sign says the polarity opposes the rise of the current. (extra) If the current fell from 5 A to 1 A in 0.1 s, ε = +1.4 V: the coil tries to keep the current up.',
              fi: 'Suuruus on 1,4 V; miinusmerkki kertoo, että napaisuus vastustaa virran nousua. (lisä) Jos virta laskisi 5 A:sta 1 A:iin ajassa 0,1 s, olisi ε = +1,4 V: kela yrittää pitää virran yllä.' }
          ],
          result: { en: 'ε = -1.4 V', fi: 'ε = -1,4 V' } },
        // (extra)
        { id: 't7-self-int1', type: 'interactive', widget: 'readout', title: { en: 'Induced voltage explorer (extra)', fi: 'Indusoituneen jännitteen tutkija (lisä)' },
          caption: { en: 'Change L, the current step and the time. Try 35 mH, 1 A to 5 A, 0.1 s, then a falling current.', fi: 'Muuta L:ää, virran muutosta ja aikaa. Kokeile 35 mH, 1 A → 5 A, 0,1 s ja sitten laskevaa virtaa.' },
          config: {
            params: [{ id: 'L', tex: 'L', min: 0.001, max: 0.5, value: 0.035, unit: 'H', log: true }, { id: 'I1', tex: 'I_1', min: 0, max: 10, step: 0.1, value: 1, unit: 'A' },
                     { id: 'I2', tex: 'I_2', min: 0, max: 10, step: 0.1, value: 5, unit: 'A' }, { id: 'dt', tex: 'Δt', min: 0.01, max: 1, value: 0.1, unit: 's', log: true }],
            outputs: function (v) {
              var e = -v.L * (v.I2 - v.I1) / v.dt;
              return [{ tex: 'ε', value: e, unit: 'V' },
                      { label: { en: 'Behaviour', fi: 'Käyttäytyminen' }, value: e < 0 ? { en: 'opposes the rising current', fi: 'vastustaa virran nousua' } : e > 0 ? { en: 'opposes the falling current', fi: 'vastustaa virran laskua' } : { en: 'constant current', fi: 'vakiovirta' } }];
            } } },
        { id: 't7-self-c2', type: 'callout', kind: 'warn', title: { en: 'Common misconception', fi: 'Yleinen väärinkäsitys' }, html: {
          en: 'The coil does not oppose the current itself, only its <em>change</em>. For a constant (DC) current <f>di/dt = 0</f>, so <f>V = 0</f>.',
          fi: 'Kela ei vastusta virtaa sinänsä vaan vain sen <em>muutosta</em>. Vakiovirralla (tasavirralla) <f>di/dt = 0</f>, joten <f>V = 0</f>.' } },
        { id: 't7-self-qb1', type: 'question', q: 't7-q1' },
        { id: 't7-self-qb2', type: 'question', q: 't7-q2' }
      ] },
      // ---------------------------------------------------------------- 7.2
      { id: 't7-solenoid', title: { en: 'Inductance of a solenoid', fi: 'Solenoidin induktanssi' }, blocks: [
        { id: 't7-sol-p1', type: 'text', html: {
          en: '<p>The inductance of a long solenoid depends on its geometry and core: number of turns N, cross-section area A, length l and the relative permeability μ_r of the core. An iron core multiplies L by μ_r.</p>',
          fi: '<p>Pitkän solenoidin induktanssi riippuu geometriasta ja sydämestä: kierrosluvusta N, poikkipinta-alasta A, pituudesta l ja sydämen suhteellisesta permeabiliteetista μ_r. Rautasydän kertoo L:n luvulla μ_r.</p>' } },
        { id: 't7-sol-f1', type: 'formula', key: true, tex: 'L = {N^2 · μ_0 · μ_r · A}/{l}', label: { en: 'Inductance of a solenoid', fi: 'Solenoidin induktanssi' },
          legend: [['N', { en: 'number of turns', fi: 'kierrosluku' }, ''], ['μ_0', { en: 'permeability of vacuum, 4π·10⁻⁷', fi: 'tyhjiön permeabiliteetti, 4π·10⁻⁷' }, 'Vs/Am'], ['μ_r', { en: 'relative permeability of the core', fi: 'sydämen suhteellinen permeabiliteetti' }, ''], ['A', { en: 'cross-section area', fi: 'poikkipinta-ala' }, 'm²'], ['l', { en: 'length', fi: 'pituus' }, 'm']] },
        { id: 't7-sol-int1', type: 'interactive', widget: 'custom', title: { en: 'Solenoid designer', fi: 'Solenoidin suunnittelija' },
          caption: { en: 'Change N, l, d and μ_r. Start from the example (200 turns, 15 cm, 2 cm, μ_r = 500). Doubling N quadruples L.', fi: 'Muuta arvoja N, l, d ja μ_r. Lähde esimerkistä (200 kierrosta, 15 cm, 2 cm, μ_r = 500). N:n kaksinkertaistaminen nelinkertaistaa L:n.' },
          config: { mount: function (host, ctx) {
            var params = [{ id: 'N', tex: 'N', min: 10, max: 1000, step: 10, value: 200 }, { id: 'l', tex: 'l', min: 0.02, max: 0.3, step: 0.005, value: 0.15, unit: 'm' },
                          { id: 'd', tex: 'd', min: 0.005, max: 0.05, step: 0.001, value: 0.02, unit: 'm' }, { id: 'mu', tex: 'μ_r', min: 1, max: 5000, value: 500, log: true }];
            var c;
            var panel = TDC.viz.params(params, function () { c.redraw(); }, ctx);
            c = TDC.viz.canvas(host, { aspect: 0.4, animate: false, draw: function (g, w, h) {
              var v = panel.values, A = Math.PI * v.d * v.d / 4, L = v.N * v.N * MU0 * v.mu * A / v.l;
              g.clearRect(0, 0, w, h);
              var len = w * 0.8 * Math.max(0.15, v.l / 0.3), dp = h * 0.62 * Math.max(0.2, v.d / 0.05), x0 = (w - len) / 2, cy = h * 0.45;
              g.globalAlpha = Math.min(0.7, Math.log(v.mu) / Math.log(5000) * 0.7); g.fillStyle = ctx.color('--c-2');
              g.fillRect(x0, cy - dp / 2, len, dp); g.globalAlpha = 1;
              var n = Math.max(4, Math.min(v.N, Math.floor(len / 9))); g.strokeStyle = ctx.color('--c-1'); g.lineWidth = 2;
              for (var i = 0; i < n; i++) { var x = x0 + (i + 0.5) / n * len; g.beginPath(); g.ellipse(x, cy, dp * 0.12, dp / 2, 0, 0, 7); g.stroke(); }
              g.fillStyle = ctx.color('--fg'); g.font = '14px system-ui, sans-serif'; g.textAlign = 'center';
              g.fillText('L = ' + TDC.util.fmtSI(L, 'H', 3) + '   (N = ' + v.N + ', μ_r = ' + v.mu + ')', w / 2, h - 8);
            } });
            host.insertBefore(panel, host.firstChild);   // house style: sliders above the visual
            ctx.onTheme(function () { c.redraw(); });
            return { destroy: c.destroy };
          } } },
        { id: 't7-sol-ex1', type: 'example', title: { en: 'Iron-core solenoid', fi: 'Rautasydämellinen solenoidi' },
          problem: { en: 'A solenoid has l = 15 cm, diameter d = 2.0 cm, N = 200 turns and μ_r = 500. Find L, and L without the core.', fi: 'Solenoidin pituus l = 15 cm, halkaisija d = 2,0 cm, kierroksia N = 200 ja μ_r = 500. Laske L sekä L ilman sydäntä.' },
          given: ['l = 0.15 m', 'd = 2.0 cm', 'N = 200', 'μ_r = 500'],
          steps: [
            { tex: 'A = π · (0.01 m)^2 = 3.1416·10^{-4} m^2' },
            { tex: 'L = {200^2 · 4π·10^{-7} · 500 · 3.1416·10^{-4}}/{0.15} ≈ 0.0526 H' },
            { en: 'Without the iron core μ_r = 1, so L is 500 times smaller:', fi: 'Ilman rautasydäntä μ_r = 1, joten L on 500 kertaa pienempi:' },
            { tex: 'L ≈ {52.6 mH}/{500} ≈ 105 μH' },
            { en: '(extra) With N = 400, L = 4 · 52.6 = 210.6 mH. With l = 30 cm, L = 26.3 mH.', fi: '(lisä) Kun N = 400, L = 4 · 52,6 = 210,6 mH. Kun l = 30 cm, L = 26,3 mH.' }
          ],
          result: { en: 'L ≈ 53 mH with the core, ≈ 105 μH without', fi: 'L ≈ 53 mH sydämen kanssa, ≈ 105 μH ilman' } },
        { id: 't7-sol-c1', type: 'callout', kind: 'warn', html: {
          en: 'L grows with the <b>square</b> of the turns N, but only <em>linearly</em> with A and μ_r. A longer winding at the same N makes L <em>smaller</em> (1/l). Wire thickness does not enter the formula.',
          fi: 'L kasvaa kierrosluvun N <b>neliössä</b>, mutta vain <em>suoraan</em> verrannollisena A:han ja μ_r:ään. Pidempi käämi samalla N:llä <em>pienentää</em> L:ää (1/l). Langan paksuus ei näy kaavassa.' } },
        { id: 't7-sol-qb1', type: 'question', q: 't7-q3' },
        { id: 't7-sol-qb2', type: 'question', q: 't7-q4' }
      ] },
      // ---------------------------------------------------------------- 7.3
      { id: 't7-types', title: { en: 'Inductor types, symbols and DC/high-frequency behaviour', fi: 'Kelatyypit, symbolit ja käyttäytyminen tasa- ja suurtaajuudella' }, blocks: [
        { id: 't7-typ-p1', type: 'text', html: {
          en: '<p>Inductors come in many forms: axial-lead moulded coils, coils wound on a former, toroids, SMD inductors (round or shielded) and adjustable coils with a ferrite slug. The symbols are (a) air-core, (b) iron-core (two lines above the coil) and (c) adjustable (an arrow across the coil).</p>',
          fi: '<p>Keloja on monenlaisia: aksiaalijohtimiset valetut kelat, runkoon kierretyt kelat, toroidit, pintaliitoskelat (SMD) ja ferriittiytimellä säädettävät kelat. Symbolit ovat (a) ilmasydäminen, (b) rautasydäminen (kaksi viivaa kelan yläpuolella) ja (c) säädettävä (nuoli kelan poikki).</p>' } },
        { id: 't7-typ-fig1', type: 'figure', svg: svgSyms, caption: { en: 'Coil symbols: (a) air core, (b) iron core, (c) adjustable.', fi: 'Kelasymbolit: (a) ilmasydän, (b) rautasydän, (c) säädettävä.' }, alt: { en: 'Three coil symbols', fi: 'Kolme kelasymbolia' } },
        { id: 't7-typ-c1', type: 'callout', kind: 'key', title: { en: 'DC and very high frequency', fi: 'Tasasähkö ja erittäin suuri taajuus' }, html: {
          en: 'With a constant DC current an ideal inductor is a <b>short circuit</b> (<f>di/dt = 0</f>). At very high AC frequencies it behaves like an <b>open circuit</b>, because its reactance <f>X_L = 2πfL</f> grows with f.',
          fi: 'Vakiotasavirralla ihanteellinen kela on <b>oikosulku</b> (<f>di/dt = 0</f>). Erittäin suurilla vaihtosähkötaajuuksilla se käyttäytyy kuin <b>avoin piiri</b>, koska reaktanssi <f>X_L = 2πfL</f> kasvaa taajuuden mukana.' } },
        // (extra)
        { id: 't7-typ-int1', type: 'interactive', widget: 'readout', title: { en: 'Reactance of a coil (extra)', fi: 'Kelan reaktanssi (lisä)' },
          caption: { en: 'Raise f: the coil blocks more and more. At f = 0 (DC) X_L = 0. Try L = 0.1 H at 50 Hz (31.4 Ω).', fi: 'Kasvata taajuutta f: kela estää yhä enemmän. Kun f = 0 (tasasähkö), X_L = 0. Kokeile L = 0,1 H ja 50 Hz (31,4 Ω).' },
          config: { params: [{ id: 'L', tex: 'L', min: 0.001, max: 1, value: 0.1, unit: 'H', log: true }, { id: 'f', tex: 'f', min: 0, max: 5000, step: 10, value: 50, unit: 'Hz' }],
            outputs: function (v) { return [{ tex: 'X_L = 2πfL', value: 2 * Math.PI * v.f * v.L, unit: 'Ω' }]; } } },
        // (extra)
        { id: 't7-typ-ph1', type: 'interactive', widget: 'phasor', title: { en: 'Current through a coil lags the voltage by 90° (extra)', fi: 'Kelan virta jää jännitteestä 90° jälkeen (lisä)' },
          caption: { en: 'For an ideal coil v = L·di/dt gives a current phasor 90° behind the voltage phasor. The AC theory follows in later topics.', fi: 'Ihanteellisella kelalla v = L·di/dt antaa virtaosoittimen, joka on 90° jännitettä jäljessä. Vaihtosähköteoria jatkuu myöhemmin.' },
          config: { params: [{ id: 'U', tex: 'U', min: 1, max: 20, value: 10, unit: 'V' }, { id: 'f', tex: 'f', min: 10, max: 200, step: 5, value: 50, unit: 'Hz' }],
            scale: { V: 20, A: 0.5 }, f: function (p) { return p.f; },
            phasors: function (p) { var I = p.U / (2 * Math.PI * p.f * 0.1); return [{ id: 'U', mag: p.U, deg: 0, unit: 'V' }, { id: 'I', mag: I, deg: -90, unit: 'A' }]; },
            arcs: function () { return [{ from: 'I', to: 'U', label: '90°' }]; } } },
        { id: 't7-typ-qb1', type: 'question', q: 't7-q5' },
        { id: 't7-typ-qb2', type: 'question', q: 't7-q6' }
      ] },
      // ---------------------------------------------------------------- 7.4
      { id: 't7-sp', title: { en: 'Inductors in series and parallel', fi: 'Kelojen sarja- ja rinnankytkentä' }, blocks: [
        { id: 't7-sp-p1', type: 'text', html: {
          en: '<p>Inductors combine like resistors (assuming no mutual coupling between the coils): in series they add; in parallel the reciprocals add, so the total is smaller than the smallest coil.</p>',
          fi: '<p>Kelat yhdistyvät kuten vastukset (kun kelojen välillä ei ole keskinäisinduktiota): sarjassa arvot lasketaan yhteen, rinnan käänteisarvot, jolloin kokonaisinduktanssi on pienempi kuin pienin kela.</p>' } },
        { id: 't7-sp-f1', type: 'formula', key: true, tex: 'L_T = L_1 + L_2 + L_3 + … + L_n', label: { en: 'Series', fi: 'Sarjaankytkentä' } },
        { id: 't7-sp-f2', type: 'formula', key: true, tex: '{1}/{L_T} = {1}/{L_1} + {1}/{L_2} + {1}/{L_3} + … + {1}/{L_n}', label: { en: 'Parallel', fi: 'Rinnankytkentä' } },
        { id: 't7-sp-f3', type: 'formula', tex: 'L_T = {L_1 · L_2}/{L_1 + L_2}', label: { en: 'Two in parallel (extra)', fi: 'Kaksi rinnan (lisä)' } },
        { id: 't7-sp-int1', type: 'interactive', widget: 'readout', title: { en: 'Series and parallel inductance', fi: 'Sarja- ja rinnakkaisinduktanssi' },
          caption: { en: 'Set the three inductances. Try 10 mH, 5 mH, 2 mH: the parallel total is 1.25 mH, below the smallest.', fi: 'Aseta kolme induktanssia. Kokeile 10 mH, 5 mH, 2 mH: rinnankytkennän kokonaisarvo on 1,25 mH eli pienintä pienempi.' },
          config: { params: [{ id: 'L1', tex: 'L_1', min: 0.0001, max: 1, value: 0.01, unit: 'H', log: true }, { id: 'L2', tex: 'L_2', min: 0.0001, max: 1, value: 0.005, unit: 'H', log: true }, { id: 'L3', tex: 'L_3', min: 0.0001, max: 1, value: 0.002, unit: 'H', log: true }],
            outputs: function (v) { return [{ label: { en: 'L_T (series)', fi: 'L_T (sarja)' }, value: v.L1 + v.L2 + v.L3, unit: 'H' }, { label: { en: 'L_T (parallel)', fi: 'L_T (rinnan)' }, value: 1 / (1 / v.L1 + 1 / v.L2 + 1 / v.L3), unit: 'H' }]; } } },
        { id: 't7-sp-ex1', type: 'example', title: { en: 'Series and parallel coils', fi: 'Sarjaan ja rinnan kytketyt kelat' },
          problem: { en: '(a) Coils 1 H, 2 H, 1.5 H and 5 H in series. (b) Coils 5 mH, 2 mH, 10 mH and 1000 μH in series. (c) Coils 10 mH, 5 mH and 2 mH in parallel.', fi: '(a) Kelat 1 H, 2 H, 1,5 H ja 5 H sarjassa. (b) Kelat 5 mH, 2 mH, 10 mH ja 1000 μH sarjassa. (c) Kelat 10 mH, 5 mH ja 2 mH rinnan.' },
          given: ['(a) 1 H, 2 H, 1.5 H, 5 H', '(b) 5 mH, 2 mH, 10 mH, 1000 μH', '(c) 10 mH ∥ 5 mH ∥ 2 mH'],
          steps: [
            { tex: 'L_a = 1 + 2 + 1.5 + 5 = 9.5 H' },
            { en: 'Convert 1000 μH = 1 mH first:', fi: 'Muunna ensin 1000 μH = 1 mH:' },
            { tex: 'L_b = 5 + 2 + 10 + 1 = 18 mH' },
            { tex: '{1}/{L_c} = {1}/{10} + {1}/{5} + {1}/{2} = 0.1 + 0.2 + 0.5 = 0.8 mH^{-1}' },
            { tex: 'L_c = {1}/{0.8} = 1.25 mH' },
            { en: 'Check: 1.25 mH is smaller than the smallest coil (2 mH). (extra) 4 mH ∥ 12 mH = 3.0 mH, 6 mH ∥ 3 mH = 2.0 mH.', fi: 'Tarkistus: 1,25 mH on pienempi kuin pienin kela (2 mH). (lisä) 4 mH ∥ 12 mH = 3,0 mH, 6 mH ∥ 3 mH = 2,0 mH.' }
          ],
          result: { en: 'L_a = 9.5 H, L_b = 18 mH, L_c = 1.25 mH', fi: 'L_a = 9,5 H, L_b = 18 mH, L_c = 1,25 mH' } },
        { id: 't7-sp-c1', type: 'callout', kind: 'warn', html: {
          en: 'Watch the units: convert all coils to the same unit before adding. The parallel formula ends with <f>1/L_n</f>, the last coil, not always <f>1/L_3</f>.',
          fi: 'Varo yksiköitä: muunna kaikki kelat samaan yksikköön ennen yhteenlaskua. Rinnankytkennän kaava päättyy termiin <f>1/L_n</f> eli viimeiseen keloon, ei aina <f>1/L_3</f>.' } },
        { id: 't7-sp-qb1', type: 'question', q: 't7-q7' }
      ] },
      // ---------------------------------------------------------------- 7.5
      { id: 't7-real', title: { en: 'The real inductor and stored energy', fi: 'Todellinen kela ja varastoitunut energia' }, blocks: [
        { id: 't7-real-p1', type: 'text', html: {
          en: '<p>Because of its structure, a real inductor also has a <dfn data-term="corewinding">winding resistance</dfn> R_W (in series) and a <dfn data-term="straycap">stray capacitance</dfn> C_W between the turns (in parallel with the winding). The winding resistance dissipates heat <f>P = I²·R_W</f>.</p>',
          fi: '<p>Rakenteensa vuoksi todellisella kelalla on myös <dfn data-term="corewinding">käämin resistanssi</dfn> R_W (sarjassa) ja kierrosten välinen <dfn data-term="straycap">hajakapasitanssi</dfn> C_W (rinnan käämin kanssa). Käämin resistanssi muuttaa sähköenergiaa lämmöksi: <f>P = I²·R_W</f>.</p>' } },
        { id: 't7-real-fig1', type: 'figure', svg: svgReal, caption: { en: 'Equivalent circuit of a real inductor: R_W in series with L, and C_W across both.', fi: 'Todellisen kelan sijaiskytkentä: R_W sarjassa L:n kanssa ja C_W molempien rinnalla.' }, alt: { en: 'Real inductor equivalent circuit', fi: 'Todellisen kelan sijaiskytkentä' } },
        { id: 't7-real-f1', type: 'formula', key: true, tex: 'W = {1}/{2} · L · I^2', label: { en: 'Energy stored in the magnetic field', fi: 'Magneettikenttään varastoitunut energia' },
          legend: [['W', { en: 'energy', fi: 'energia' }, 'J'], ['L', { en: 'inductance', fi: 'induktanssi' }, 'H'], ['I', { en: 'current', fi: 'virta' }, 'A']] },
        { id: 't7-real-int1', type: 'interactive', widget: 'readout', title: { en: 'Energy and heat', fi: 'Energia ja lämpö' },
          caption: { en: 'Stored energy depends on L and I², while the winding resistance converts power into heat. Try 35 mH at 5 A: 0.44 J.', fi: 'Varastoitunut energia riippuu L:stä ja I²:sta, kun taas käämin resistanssi muuttaa energiaa lämmöksi. Kokeile 35 mH ja 5 A: 0,44 J.' },
          config: { params: [{ id: 'L', tex: 'L', min: 0.001, max: 1, value: 0.035, unit: 'H', log: true }, { id: 'I', tex: 'I', min: 0, max: 10, step: 0.1, value: 5, unit: 'A' }, { id: 'Rw', tex: 'R_W', min: 0.01, max: 5, value: 0.5, unit: 'Ω', log: true }],
            outputs: function (v) { return [{ tex: 'W', value: 0.5 * v.L * v.I * v.I, unit: 'J' }, { tex: 'P', value: v.I * v.I * v.Rw, unit: 'W' }]; } } },
        { id: 't7-real-ex1', type: 'example', title: { en: 'Energy in a coil (extra)', fi: 'Kelan energia (lisä)' },
          problem: { en: 'How much energy does the 35.0 mH coil store at 5.0 A?', fi: 'Paljonko energiaa 35,0 mH:n kela varastoi virralla 5,0 A?' },
          given: ['L = 35.0 mH', 'I = 5.0 A'],
          steps: [{ tex: 'W = {1}/{2} · 0.035 · 5.0^2' }, { tex: 'W = 0.4375 J ≈ 0.44 J' }],
          result: { en: 'W ≈ 0.44 J', fi: 'W ≈ 0,44 J' } },
        { id: 't7-real-c1', type: 'callout', kind: 'info', title: { en: 'Note on symbols', fi: 'Huomio merkinnöistä' }, html: {
          en: 'The energy is written W here (some slides use E). Avoid confusing it with the electric field or with the EMF ε.',
          fi: 'Energia merkitään tässä W:llä (osassa kalvoja E:llä). Älä sekoita sitä sähkökenttään tai lähdejännitteeseen ε.' } }
      ] },
      // ---------------------------------------------------------------- 7.6
      { id: 't7-tau', title: { en: 'The time constant τ = L/R', fi: 'Aikavakio τ = L/R' }, blocks: [
        { id: 't7-tau-p1', type: 'text', html: {
          en: '<p>When a switch closes in a series circuit with R and L, the current does not jump to its final value: the coil induces an opposing voltage and smooths the change. The speed is set by the <dfn data-term="timeconstant">time constant</dfn> τ. After about 5τ the current has practically reached its final value.</p>',
          fi: '<p>Kun kytkin sulkeutuu R:n ja L:n sarjapiirissä, virta ei hypähdä loppuarvoonsa: kela indusoi vastustavan jännitteen ja tasoittaa muutosta. Nopeuden määrää <dfn data-term="timeconstant">aikavakio</dfn> τ. Noin 5τ:n jälkeen virta on käytännössä saavuttanut loppuarvonsa.</p>' } },
        { id: 't7-tau-f1', type: 'formula', key: true, tex: 'τ = {L}/{R},  [τ] = {Vs/A}/{V/A} = s', label: { en: 'Time constant', fi: 'Aikavakio' } },
        { id: 't7-tau-plot1', type: 'interactive', widget: 'plot', title: { en: 'Current rise and decay in units of τ', fi: 'Virran nousu ja lasku aikavakion yksikössä' },
          caption: { en: 'Rise (switch closed) and decay (switch opened) as a percentage of the final/initial value. Markers: 63, 86, 95, 98, 99 %. Change R and L to see the real τ.', fi: 'Nousu (kytkin suljetaan) ja lasku (kytkin avataan) prosentteina loppu-/alkuarvosta. Merkit: 63, 86, 95, 98, 99 %. Muuta R:ää ja L:ää nähdäksesi todellisen τ:n.' },
          config: {
            x: { min: 0, max: 5.5, label: { en: 'Time t', fi: 'Aika t' }, unit: 'τ' }, y: { min: 0, max: 105, label: { en: 'Share of value', fi: 'Osuus arvosta' }, unit: '%' },
            params: [{ id: 'R', tex: 'R', min: 100, max: 5000, value: 1200, unit: 'Ω', log: true }, { id: 'L', tex: 'L', min: 0.001, max: 1, value: 0.01, unit: 'H', log: true }, { id: 'U', tex: 'U', min: 1, max: 24, value: 12, unit: 'V' }],
            curves: [{ fn: function (x) { return 100 * (1 - Math.exp(-x)); }, label: { en: 'Rise', fi: 'Nousu' }, color: '--c-1' }, { fn: function (x) { return 100 * Math.exp(-x); }, label: { en: 'Decay', fi: 'Lasku' }, color: '--c-3' }],
            points: function () { var o = []; [1, 2, 3, 4, 5].forEach(function (k) { o.push({ x: k, y: 100 * (1 - Math.exp(-k)), label: Math.round(100 * (1 - Math.exp(-k))) + ' %' }); o.push({ x: k, y: 100 * Math.exp(-k), label: Math.round(100 * Math.exp(-k)) + ' %' }); }); return o; },
            readouts: function (p) { return [{ tex: 'τ', value: p.L / p.R, unit: 's' }, { tex: 'I_f', value: p.U / p.R, unit: 'A' }, { tex: '5τ', value: 5 * p.L / p.R, unit: 's' }]; }
          } },
        { id: 't7-tau-t1', type: 'table', caption: { en: 'Percentage of final value (rise) and of initial value (decay)', fi: 'Osuus loppuarvosta (nousu) ja alkuarvosta (lasku)' },
          head: [{ en: 'Time', fi: 'Aika' }, { en: 'Rise', fi: 'Nousu' }, { en: 'Decay', fi: 'Lasku' }],
          rows: [['1τ', '63 %', '37 %'], ['2τ', '86 %', '14 %'], ['3τ', '95 %', '5 %'], ['4τ', '98 %', '2 %'], ['5τ', '99 %', '1 %']] },
        { id: 't7-tau-ex1', type: 'example', title: { en: 'Time constant of an RL circuit', fi: 'RL-piirin aikavakio' },
          problem: { en: 'A 12 V battery, a switch, R = 1.2 kΩ and L = 10 mH are in series. Find τ, the final current and the time to reach it (5τ).', fi: '12 V:n paristo, kytkin, R = 1,2 kΩ ja L = 10 mH ovat sarjassa. Laske τ, loppuvirta ja aika loppuarvon saavuttamiseen (5τ).' },
          given: ['U = 12 V', 'R = 1200 Ω', 'L = 10 mH'],
          steps: [{ tex: 'τ = {L}/{R} = {10·10^{-3}}/{1200} = 8.33 μs' }, { tex: 'I_f = {U}/{R} = {12}/{1200} = 10 mA' }, { tex: '5τ = 41.7 μs' }],
          result: { en: 'τ = 8.33 μs, I_f = 10 mA, t = 41.7 μs', fi: 'τ = 8,33 μs, I_f = 10 mA, t = 41,7 μs' } },
        { id: 't7-tau-c1', type: 'callout', kind: 'tip', html: {
          en: 'A big L or a small R means a large τ: a slow current. In the final state the coil is a short circuit, so the final current is set by R alone: <f>I_f = U/R</f>.',
          fi: 'Suuri L tai pieni R tarkoittaa suurta τ:ta eli hidasta virtaa. Lopputilassa kela on oikosulku, joten loppuvirran määrää pelkkä R: <f>I_f = U/R</f>.' } },
        { id: 't7-tau-qb1', type: 'question', q: 't7-q8' },
        { id: 't7-tau-qb2', type: 'question', q: 't7-q9' },
        { id: 't7-tau-qb3', type: 'question', q: 't7-q10' }
      ] },
      // ---------------------------------------------------------------- 7.7
      { id: 't7-rl', title: { en: 'Current and voltage in the series RL circuit', fi: 'Virta ja jännite RL-sarjapiirissä' }, blocks: [
        { id: 't7-rl-p1', type: 'text', html: {
          en: '<p>Every exponential change follows one universal formula, with initial (i) and final (f) values. For a rising current I_i = 0; for a falling current I_f = 0.</p>',
          fi: '<p>Jokainen eksponentiaalinen muutos noudattaa yhtä yleistä kaavaa, jossa on alkuarvo (i) ja loppuarvo (f). Nousevalla virralla I_i = 0 ja laskevalla I_f = 0.</p>' } },
        { id: 't7-rl-f1', type: 'formula', key: true, tex: 'i(t) = I_f + (I_i - I_f) · e^{-t/τ}', label: { en: 'Universal exponential formula', fi: 'Yleinen eksponenttikaava' } },
        { id: 't7-rl-f2', type: 'formula', tex: 'i(t) = I_f · (1 - e^{-t/τ}),  i(t) = I_i · e^{-t/τ}', label: { en: 'Rising current / falling current', fi: 'Nouseva virta / laskeva virta' } },
        // (extra)
        { id: 't7-rl-plot1', type: 'interactive', widget: 'plot', title: { en: 'Voltages in the RL circuit after the switch closes (extra)', fi: 'RL-piirin jännitteet kytkimen sulkemisen jälkeen (lisä)' },
          caption: { en: 'The coil voltage starts at the source voltage (open circuit at t = 0⁺) and decays to 0 (short circuit in DC). The resistor voltage rises as the current does.', fi: 'Kelan jännite alkaa lähdejännitteestä (avoin piiri hetkellä t = 0⁺) ja laskee nollaan (tasasähkössä oikosulku). Vastuksen jännite nousee virran mukana.' },
          config: { x: { min: 0, max: 5.5, label: { en: 'Time t', fi: 'Aika t' }, unit: 'τ' }, y: { min: 0, max: 12, label: { en: 'Voltage', fi: 'Jännite' }, unit: 'V', auto: true },
            params: [{ id: 'U', tex: 'V_s', min: 1, max: 24, value: 12, unit: 'V' }],
            curves: [{ fn: function (x, p) { return p.U * Math.exp(-x); }, label: { en: 'v_L', fi: 'v_L' }, color: '--c-3' }, { fn: function (x, p) { return p.U * (1 - Math.exp(-x)); }, label: { en: 'v_R', fi: 'v_R' }, color: '--c-1' }],
            vlines: function () { return [{ x: 1, label: 'τ' }]; },
            readouts: function (p) { return [{ tex: 'v_L(τ)', value: p.U * Math.exp(-1), unit: 'V' }]; } } },
        { id: 't7-rl-ex1', type: 'example', title: { en: 'Current 30 μs after closing', fi: 'Virta 30 μs sulkemisen jälkeen' },
          problem: { en: 'A 12 V source, R = 2.2 kΩ and L = 100 mH in series. (a) Final current? (b) Current 30 μs after the switch closes?', fi: '12 V:n lähde, R = 2,2 kΩ ja L = 100 mH sarjassa. (a) Loppuvirta? (b) Virta 30 μs kytkimen sulkemisen jälkeen?' },
          given: ['U = 12 V', 'R = 2.2 kΩ', 'L = 100 mH', 't = 30 μs'],
          steps: [
            { tex: 'τ = {0.1}/{2200} = 45.5 μs,  I_f = {12}/{2200} = 5.45 mA' },
            { tex: 'i = 5.45 mA · (1 - e^{-30/45.5}) = 5.45 · (1 - e^{-0.66})' },
            { tex: 'i = 5.45 mA · 0.4833 ≈ 2.63 mA' },
            { en: '(extra) At t = 2τ, i = 4.71 mA; at 5τ, i = 5.41 mA. The slide text says "30 ms" by mistake: at 30 ms (660τ) the current would already be the full 5.45 mA.', fi: '(lisä) Hetkellä t = 2τ i = 4,71 mA; hetkellä 5τ i = 5,41 mA. Kalvon teksti sanoo erehdyksessä "30 ms": ajassa 30 ms (660τ) virta olisi jo täydet 5,45 mA.' }
          ],
          result: { en: 'I_f = 5.45 mA, i(30 μs) ≈ 2.63 mA', fi: 'I_f = 5,45 mA, i(30 μs) ≈ 2,63 mA' } },
        { id: 't7-rl-ex2', type: 'example', title: { en: 'Pulse-driven RL circuit', fi: 'Pulssisyötetty RL-piiri' },
          problem: { en: 'A pulse source (0 or 2.5 V, 1 kHz, 50 % duty) drives R = 10 kΩ in series with L = 1.0 H. Find τ, the final current, the current at t = τ after the rising edge, and the current 0.1 ms after the falling edge at t = 0.5 ms.', fi: 'Pulssilähde (0 tai 2,5 V, 1 kHz, 50 % täyttösuhde) syöttää sarjaan kytkettyä vastusta R = 10 kΩ ja kelaa L = 1,0 H. Laske τ, loppuvirta, virta ajan τ kuluttua nousevasta reunasta sekä virta 0,1 ms laskevan reunan jälkeen hetkellä t = 0,5 ms.' },
          given: ['V_s = 2.5 V', 'R = 10 kΩ', 'L = 1.0 H'],
          steps: [
            { tex: 'τ = {1.0}/{10000} = 0.10 ms,  I_f = {2.5}/{10000} = 0.25 mA' },
            { tex: 'i(0.1 ms) = 0.25 mA · (1 - e^{-1}) = 0.25 · 0.632 ≈ 0.16 mA' },
            { en: 'Half-period 0.5 ms = 5τ, so the current has nearly reached 0.25 mA. After the falling edge (I_f = 0):', fi: 'Puolijakso 0,5 ms = 5τ, joten virta on lähes saavuttanut arvon 0,25 mA. Laskevan reunan jälkeen (I_f = 0):' },
            { tex: 'i = I_i · e^{-1} = 0.25 mA · 0.368 ≈ 0.092 mA' }
          ],
          result: { en: 'τ = 0.10 ms, I_f = 0.25 mA, i(τ) ≈ 0.16 mA, 0.092 mA after the fall', fi: 'τ = 0,10 ms, I_f = 0,25 mA, i(τ) ≈ 0,16 mA, 0,092 mA laskun jälkeen' } },
        { id: 't7-rl-c1', type: 'callout', kind: 'warn', html: {
          en: 'Check the units of t and τ before using the exponential: <f>t/τ</f> must be dimensionless. The initial current of the pulse example is 0.25 <em>mA</em>, not 2.5 mA (2.5 is the source voltage in volts).',
          fi: 'Tarkista t:n ja τ:n yksiköt ennen eksponenttia: <f>t/τ</f> on dimensioton. Pulssiesimerkin alkuvirta on 0,25 <em>mA</em>, ei 2,5 mA (2,5 on lähdejännite voltteina).' } },
        { id: 't7-rl-qb1', type: 'question', q: 't7-q11' },
        { id: 't7-rl-qb2', type: 'question', q: 't7-q12' }
      ] }
    ],
    questions: [
      { id: 't7-q1', mode: 'practice', type: 'numeric', difficulty: 1, tol: 0.03,
        prompt: { en: 'The current of a 35.0 mH coil rises from 1.0 A to 5.0 A in 0.1 s. Find the magnitude of the induced voltage.', fi: '35,0 mH:n kelan virta nousee 1,0 A:sta 5,0 A:iin ajassa 0,1 s. Laske indusoituneen jännitteen suuruus.' },
        fields: [{ id: 'e', tex: '|ε|', unit: 'V' }] },
      { id: 't7-q2', mode: 'practice', type: 'fill', difficulty: 1,
        prompt: { en: 'Fill in the blanks.', fi: 'Täydennä aukot.' },
        text: { en: 'The unit of inductance is the [[a]], and 1 H = 1 Ω·[[b]] (a time unit).', fi: 'Induktanssin yksikkö on [[a]], ja 1 H = 1 Ω·[[b]] (aikayksikkö).' },
        fields: [{ id: 'a', kind: 'text' }, { id: 'b', kind: 'text' }] },
      { id: 't7-q3', mode: 'practice', type: 'multi', difficulty: 2,
        prompt: { en: 'Which changes <b>increase</b> the inductance of a solenoid? (select all)', fi: 'Mitkä muutokset <b>kasvattavat</b> solenoidin induktanssia? (valitse kaikki)' },
        options: [
          { id: 'a', html: { en: 'more turns N', fi: 'enemmän kierroksia N' } }, { id: 'b', html: { en: 'iron core instead of air', fi: 'rautasydän ilmasydämen tilalle' } },
          { id: 'c', html: { en: 'longer winding at the same N', fi: 'pidempi käämi samalla N:llä' } }, { id: 'd', html: { en: 'larger cross-section A', fi: 'suurempi poikkipinta-ala A' } },
          { id: 'e', html: { en: 'thinner wire, same geometry', fi: 'ohuempi lanka, sama geometria' } }] },
      { id: 't7-q4', mode: 'practice', type: 'slider', difficulty: 3,
        prompt: { en: 'Take the solenoid of the example (l = 15 cm, d = 2.0 cm, μ_r = 500) and adjust N until L is 105 mH.', fi: 'Ota esimerkin solenoidi (l = 15 cm, d = 2,0 cm, μ_r = 500) ja säädä N, kunnes L on 105 mH.' },
        hints: [
          { en: 'Inductance depends on the number of turns squared: L = N²·μ₀·μᵣ·A/l.', fi: 'Induktanssi riippuu kierrosluvun neliöstä: L = N²·μ₀·μᵣ·A/l.' },
          { en: 'Compute L for a known N (for example the starting value) and use that L ∝ N², so the ratio of the inductances equals the squared ratio of the turn numbers.', fi: 'Laske L tunnetulla N:llä (esim. alkuarvolla) ja käytä sitä, että L ∝ N², jolloin induktanssien suhde on kierroslukujen suhteen neliö.' },
          { en: 'Solve N from N = N₀·√(L_target/L₀), then round to a whole number of turns and check the readout.', fi: 'Ratkaise N kaavasta N = N₀·√(L_tavoite/L₀), pyöristä kokonaisiin kierroksiin ja tarkista lukema.' }],
        tol: 0.02,
        widget: { name: 'readout', config: {
          params: [{ id: 'N', tex: 'N', min: 50, max: 400, step: 1, value: 100 }],
          outputs: function (v) { return [{ tex: 'L', value: v.N * v.N * MU0 * 500 * Math.PI * 1e-4 / 0.15, unit: 'H' }]; },
          answer: function (v) { return { v: v.N }; } } } },
      { id: 't7-q5', mode: 'practice', type: 'mc', difficulty: 1,
        prompt: { en: 'What does an ideal inductor look like in a DC circuit with constant current?', fi: 'Miltä ihanteellinen kela näyttää tasasähköpiirissä, kun virta on vakio?' },
        options: [{ id: 'a', html: { en: 'an open circuit', fi: 'avoin piiri' } }, { id: 'b', html: { en: 'a short circuit', fi: 'oikosulku' } }, { id: 'c', html: { en: 'a resistor', fi: 'vastus' } }, { id: 'd', html: { en: 'a capacitor', fi: 'kondensaattori' } }] },
      { id: 't7-q6', mode: 'practice', type: 'match', difficulty: 1,
        prompt: { en: 'Match each symbol or circuit with its meaning.', fi: 'Yhdistä kukin symboli tai kytkentä merkitykseensä.' },
        left: [{ id: 'p', html: { en: 'coil with two parallel lines above it', fi: 'kela ja kaksi yhdensuuntaista viivaa sen yllä' } }, { id: 'q', html: { en: 'coil with an arrow across it', fi: 'kela ja nuoli sen poikki' } },
               { id: 'r', html: { en: 'plain coil symbol', fi: 'pelkkä kelasymboli' } }, { id: 's', html: { en: '<f>R_W</f> in series with <f>L</f>, <f>C_W</f> across both', fi: '<f>R_W</f> sarjassa <f>L</f>:n kanssa, <f>C_W</f> molempien rinnalla' } }],
        right: [{ id: 'iron', html: { en: 'iron-core coil', fi: 'rautasydäminen kela' } }, { id: 'adj', html: { en: 'adjustable inductor', fi: 'säädettävä kela' } },
                { id: 'air', html: { en: 'air-core coil', fi: 'ilmasydäminen kela' } }, { id: 'real', html: { en: 'real inductor model', fi: 'todellisen kelan malli' } }] },
      { id: 't7-q7', mode: 'practice', type: 'numeric', difficulty: 1, tol: 0.02,
        prompt: { en: 'Two coils, 6 mH and 3 mH, are connected in parallel. Find the total inductance.', fi: 'Kaksi kelaa, 6 mH ja 3 mH, on kytketty rinnan. Laske kokonaisinduktanssi.' },
        fields: [{ id: 'L', tex: 'L_T', unit: 'H' }] },
      { id: 't7-q8', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.02,
        prompt: { en: 'A 12 V source, R = 1.2 kΩ and L = 10 mH are in series. Find the time constant, the final current and the time 5τ.', fi: '12 V:n lähde, R = 1,2 kΩ ja L = 10 mH ovat sarjassa. Laske aikavakio, loppuvirta ja aika 5τ.' },
        fields: [{ id: 'tau', tex: 'τ', unit: 's' }, { id: 'I', tex: 'I_f', unit: 'A' }, { id: 't5', tex: '5τ', unit: 's' }] },
      { id: 't7-q9', mode: 'practice', type: 'order', difficulty: 2,
        prompt: { en: 'Order the values from the smallest to the largest percentage of the final (rise) or initial (decay) value.', fi: 'Järjestä arvot pienimmästä suurimpaan prosenttiosuuteen loppuarvosta (nousu) tai alkuarvosta (lasku).' },
        items: [{ id: 'c2', html: { en: 'rise at t = 2τ', fi: 'nousu hetkellä t = 2τ' } }, { id: 'd1', html: { en: 'decay at t = 1τ', fi: 'lasku hetkellä t = 1τ' } }, { id: 'c3', html: { en: 'rise at t = 3τ', fi: 'nousu hetkellä t = 3τ' } },
                { id: 'd2', html: { en: 'decay at t = 2τ', fi: 'lasku hetkellä t = 2τ' } }, { id: 'c1', html: { en: 'rise at t = 1τ', fi: 'nousu hetkellä t = 1τ' } }] },
      { id: 't7-q10', mode: 'practice', type: 'slider', difficulty: 1,
        prompt: { en: 'With R = 1.0 kΩ, adjust L so that the time constant is 1.0 ms.', fi: 'Kun R = 1,0 kΩ, säädä L niin, että aikavakio on 1,0 ms.' },
        tol: 0.03,
        widget: { name: 'readout', config: {
          params: [{ id: 'L', tex: 'L', min: 0.1, max: 2, step: 0.01, value: 0.3, unit: 'H' }],
          outputs: function (v) { return [{ tex: 'τ', value: v.L / 1000, unit: 's' }]; },
          answer: function (v) { return { v: v.L }; } } } },
      { id: 't7-q11', mode: 'practice', type: 'numeric', difficulty: 3, tol: 0.03,
        prompt: { en: 'In the pulse circuit (R = 10 kΩ, L = 1.0 H) the source steps from 2.5 V to 0 at t = 0.5 ms, when the current is practically 0.25 mA. Find the current at t = 0.6 ms.', fi: 'Pulssipiirissä (R = 10 kΩ, L = 1,0 H) lähde putoaa 2,5 V:sta nollaan hetkellä t = 0,5 ms, jolloin virta on käytännössä 0,25 mA. Laske virta hetkellä t = 0,6 ms.' },
        hints: [
          { en: 'After the source drops to zero the current decays through R and L: use the decaying exponential i(t) = I_i·e^(-t/τ).', fi: 'Kun lähde putoaa nollaan, virta laskee R:n ja L:n kautta: käytä laskevaa eksponenttia i(t) = I_i·e^(-t/τ).' },
          { en: 'The time constant is τ = L/R. Note that the decay starts at t = 0.5 ms, so the elapsed time is t − 0.5 ms, not 0.6 ms.', fi: 'Aikavakio on τ = L/R. Huomaa, että lasku alkaa hetkellä t = 0,5 ms, joten kulunut aika on t − 0,5 ms eikä 0,6 ms.' },
          { en: 'Compute τ in the same unit as the elapsed time and form the ratio elapsed time/τ; the initial current is 0.25 mA.', fi: 'Laske τ samassa yksikössä kuin kulunut aika ja muodosta suhde kulunut aika/τ; alkuvirta on 0,25 mA.' }],
        fields: [{ id: 'i', tex: 'i', unit: 'A' }] },
      { id: 't7-q12', mode: 'practice', type: 'fill', difficulty: 1,
        prompt: { en: 'Fill in the blanks.', fi: 'Täydennä aukot.' },
        text: { en: 'After about [[a]] time constants the current is considered to have reached its final value; after one time constant it has reached about [[b]] % of it.', fi: 'Noin [[a]] aikavakion jälkeen virran katsotaan saavuttaneen loppuarvonsa; yhden aikavakion jälkeen se on saavuttanut noin [[b]] % siitä.' },
        fields: [{ id: 'a', kind: 'num' }, { id: 'b', kind: 'num', tol: 0.02 }] },
      // graded
      { id: 't7-g1', mode: 'graded', type: 'mc', difficulty: 1, points: 1,
        prompt: { en: "According to Lenz's law, the voltage induced in a coil always...", fi: 'Lenzin lain mukaan kelaan indusoituva jännite...' },
        options: [{ id: 'a', html: { en: 'aids the change of the current', fi: 'tukee virran muutosta' } }, { id: 'b', html: { en: 'opposes the change of the current', fi: 'vastustaa virran muutosta' } },
                  { id: 'c', html: { en: 'is zero when the current changes', fi: 'on nolla, kun virta muuttuu' } }, { id: 'd', html: { en: 'is independent of L', fi: 'ei riipu L:stä' } }] },
      { id: 't7-g2', mode: 'graded', type: 'numeric', difficulty: 2, points: 2, tol: 0.03,
        prompt: { en: 'A solenoid has l = 15 cm, d = 2.0 cm, N = 200 and μ_r = 500. Find its inductance.', fi: 'Solenoidin pituus on l = 15 cm, halkaisija d = 2,0 cm, N = 200 ja μ_r = 500. Laske sen induktanssi.' },
        fields: [{ id: 'L', tex: 'L', unit: 'H' }] },
      { id: 't7-g3', mode: 'graded', type: 'numeric', difficulty: 1, points: 1, tol: 0.02,
        prompt: { en: 'Coils of 5 mH, 2 mH, 10 mH and 1000 μH are connected in series. Find the total inductance.', fi: 'Kelat 5 mH, 2 mH, 10 mH ja 1000 μH on kytketty sarjaan. Laske kokonaisinduktanssi.' },
        fields: [{ id: 'L', tex: 'L_T', unit: 'H' }] },
      { id: 't7-g4', mode: 'graded', type: 'numeric', difficulty: 1, points: 1, tol: 0.02,
        prompt: { en: 'A 4 mH and a 12 mH coil are in parallel. Find the total inductance.', fi: '4 mH:n ja 12 mH:n kelat ovat rinnan. Laske kokonaisinduktanssi.' },
        fields: [{ id: 'L', tex: 'L_T', unit: 'H' }] },
      { id: 't7-g5', mode: 'graded', type: 'numeric', difficulty: 1, points: 2, tol: 0.03,
        prompt: { en: 'Find the energy stored in a 35.0 mH coil carrying 5.0 A.', fi: 'Laske energia, joka on varastoitunut 35,0 mH:n keloon, kun sen virta on 5,0 A.' },
        fields: [{ id: 'W', tex: 'W', unit: 'J' }] },
      { id: 't7-g6', mode: 'graded', type: 'numeric', difficulty: 2, points: 3, tol: 0.03,
        prompt: { en: 'A 12 V source is switched on in series with R = 2.2 kΩ and L = 100 mH. Find the current 30 µs after the switch closes.', fi: '12 V:n lähde kytketään sarjaan vastuksen R = 2,2 kΩ ja kelan L = 100 mH kanssa. Laske virta 30 µs kytkimen sulkemisen jälkeen.' },
        hints: [
          { en: 'A series RL circuit connected to a DC source: the current rises as i(t) = I_f·(1 − e^(-t/τ)).', fi: 'Tasajännitelähteeseen kytketyssä RL-sarjapiirissä virta nousee: i(t) = I_f·(1 − e^(-t/τ)).' },
          { en: 'First find the final current I_f = U/R (the coil acts as a short circuit in the steady state) and the time constant τ = L/R.', fi: 'Laske ensin loppuvirta I_f = U/R (tasaantuneessa tilassa kela toimii oikosulkuna) ja aikavakio τ = L/R.' },
          { en: 'Watch the units: convert mH and µs to H and s, form the ratio t/τ, and put it into the exponent.', fi: 'Varo yksiköitä: muunna mH ja µs muotoon H ja s, muodosta suhde t/τ ja sijoita se eksponenttiin.' }],
        fields: [{ id: 'i', tex: 'i', unit: 'A' }] }
    ]
  });
})();

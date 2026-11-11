/* Topic 10: Parallel AC circuits. NO answers here: they live in src/answers/topic10.json. */
(function () {
  var PI = Math.PI, D = 180 / PI;
  // admittance parts of R || L || C at f (Hz); L in H, C in F
  function adm(R, L, C, f) { var w = 2 * PI * f; return { G: 1 / R, BC: w * C, BL: 1 / (w * L) }; }
  function yMag(R, L, C, f) { var a = adm(R, L, C, f); return Math.hypot(a.G, a.BC - a.BL); }
  function lpHz(R, C, f) { return 1 / Math.hypot(1, 2 * PI * f * R * C); }
  function hpHz(R, C, f) { var a = 2 * PI * f * R * C; return a / Math.hypot(1, a); }
  function reactX(L, C, f) { var w = 2 * PI * f; return w * L - 1 / (w * C); }
  function rlcParts(src) {
    return [
      { id: 'U1', type: 'V', a: [0, 4], b: [0, 0], value: src },
      { id: 'A1', type: 'ammeter', a: [1, 0], b: [3, 0] },
      { id: 'R1', type: 'R', a: [4, 0], b: [4, 4], value: 100, editable: { min: 20, max: 400, step: 10 } },
      { id: 'L1', type: 'L', a: [7, 0], b: [7, 4], value: 0.09, editable: { min: 0.02, max: 0.3, step: 0.01 } },
      { id: 'C1', type: 'C', a: [10, 0], b: [10, 4], value: 50e-6, editable: { min: 10e-6, max: 200e-6, step: 2e-6 } }
    ];
  }
  var rlcWires = [[[0, 0], [1, 0]], [[3, 0], [10, 0]], [[10, 4], [0, 4]]];
  function pfCircuit(cVal) {
    return {
      ac: 50,
      parts: [
        { id: 'U1', type: 'V', a: [0, 6], b: [0, 0], value: 230 },
        { id: 'A1', type: 'ammeter', a: [1, 0], b: [3, 0] },
        { id: 'R1', type: 'R', a: [4, 0], b: [4, 3], value: 100 },
        { id: 'L1', type: 'L', a: [4, 3], b: [4, 6], value: 0.2 },
        { id: 'C1', type: 'C', a: [7, 0], b: [7, 6], value: cVal, editable: { min: 1e-6, max: 40e-6, step: 0.5e-6 } }
      ],
      wires: [[[0, 0], [1, 0]], [[3, 0], [7, 0]], [[7, 6], [0, 6]]]
    };
  }
  function tanAcos(c) { return Math.tan(Math.acos(c)); }

TDC.registerTopic({
  id: 't10', num: 10,
  title: { en: 'Parallel AC circuits', fi: 'Rinnankytketyt vaihtosähköpiirit' },
  subtitle: { en: 'Admittance, parallel resonance, power factor correction and simple filters.', fi: 'Admittanssi, rinnakkaisresonanssi, loistehon kompensointi ja yksinkertaiset suodattimet.' },
  objectives: [
    { en: 'use admittance Y, conductance G and susceptance B to analyse parallel R, L and C branches', fi: 'käyttää admittanssia Y, konduktanssia G ja suskeptanssia B rinnankytkettyjen R-, L- ja C-haarojen laskemiseen' },
    { en: 'add branch currents as phasors and draw the phasor diagram and admittance triangle', fi: 'laskea haaravirrat yhteen osoittimina ja piirtää osoitinpiirroksen sekä admittanssikolmion' },
    { en: 'find the resonant frequency, impedance and currents of a parallel RLC circuit', fi: 'määrittää RLC-rinnakkaispiirin resonanssitaajuuden, impedanssin ja virrat' },
    { en: 'size a capacitor for power factor correction (parallel and series)', fi: 'mitoittaa kondensaattori loistehon kompensointiin (rinnakkain ja sarjaan)' },
    { en: 'explain active and reactive energy', fi: 'selittää pätö- ja loisenergian' },
    { en: 'read the cut-off frequency and bandwidth of RC, band pass and band stop filters', fi: 'lukea RC-, kaistanpäästö- ja kaistanestosuodattimien rajataajuus ja kaistanleveys' }
  ],
  glossary: {
    parallel: { en: 'parallel connection', fi: 'rinnankytkentä', def: { en: 'Branches connected between the same two nodes, so every branch has the same voltage.', fi: 'Haarat on kytketty samojen kahden solmun väliin, joten jokaisella haaralla on sama jännite.' } },
    admittance: { en: 'admittance', fi: 'admittanssi', sym: 'Y = 1/Z', def: { en: 'Reciprocal of impedance, unit siemens (S).', fi: 'Impedanssin käänteisluku, yksikkö siemens (S).' } },
    conductance: { en: 'conductance', fi: 'konduktanssi', sym: 'G = 1/R', def: { en: 'Real part of admittance, unit siemens (S).', fi: 'Admittanssin reaaliosa, yksikkö siemens (S).' } },
    susceptance: { en: 'susceptance', fi: 'suskeptanssi', sym: 'B = 1/X', def: { en: 'Imaginary part of admittance, unit siemens (S).', fi: 'Admittanssin imaginaariosa, yksikkö siemens (S).' } },
    parres: { en: 'parallel resonance', fi: 'rinnakkaisresonanssi', sym: 'ω₀ = 1/√(LC)', def: { en: 'B_L = B_C: the source current is minimum and the impedance maximum.', fi: 'B_L = B_C: lähdevirta on pienin ja impedanssi suurin.' } },
    tank: { en: 'oscillating circuit (tank)', fi: 'värähtelypiiri', def: { en: 'Coil and capacitor exchanging energy at the resonant frequency.', fi: 'Kela ja kondensaattori, jotka vaihtavat energiaa resonanssitaajuudella.' } },
    qfactor: { en: 'quality factor', fi: 'hyvyysluku (Q-arvo)', sym: 'Q', def: { en: 'Ratio of stored to dissipated energy; sets the bandwidth BW = f₀/Q.', fi: 'Varastoituneen ja kuluvan energian suhde; määrää kaistanleveyden BW = f₀/Q.' } },
    lossfactor: { en: 'loss factor', fi: 'häviökerroin', sym: 'tan δ', def: { en: 'Measure of a real capacitor’s losses: tan δ = X_C/R_h.', fi: 'Todellisen kondensaattorin häviöiden mitta: tan δ = X_C/R_h.' } },
    bandwidth: { en: 'bandwidth', fi: 'kaistanleveys', sym: 'BW', def: { en: 'Width of the frequency band between the half-power frequencies.', fi: 'Puolitehotaajuuksien välinen taajuuskaista.' } },
    cutoff: { en: 'cut-off frequency', fi: 'rajataajuus', sym: 'f_c', def: { en: 'Frequency at which the output power has fallen to half (−3 dB).', fi: 'Taajuus, jolla lähtöteho on pudonnut puoleen (−3 dB).' } },
    transfer: { en: 'transfer function', fi: 'siirtofunktio', sym: 'H', def: { en: 'Complex ratio U_out/U_in versus frequency.', fi: 'Kompleksinen suhde U_out/U_in taajuuden funktiona.' } },
    pfcorr: { en: 'power factor correction', fi: 'loistehon kompensointi', def: { en: 'Adding a capacitor to supply the reactive power of an inductive load.', fi: 'Kondensaattorin lisääminen syöttämään induktiivisen kuorman loisteho.' } },
    activecurrent: { en: 'active current', fi: 'pätövirta', sym: 'I_p = I cos φ', def: { en: 'Component of the current in phase with the voltage.', fi: 'Virran jännitteen kanssa samassa vaiheessa oleva komponentti.' } },
    reactivecurrent: { en: 'reactive current', fi: 'loisvirta', sym: 'I_q = I sin φ', def: { en: 'Component of the current 90° out of phase with the voltage.', fi: 'Virran komponentti, jonka vaihe-ero jännitteeseen on 90°.' } },
    lowpass: { en: 'low pass filter', fi: 'alipäästösuodatin', def: { en: 'Passes low frequencies and attenuates high ones.', fi: 'Päästää matalat taajuudet läpi ja vaimentaa korkeat.' } },
    highpass: { en: 'high pass filter', fi: 'ylipäästösuodatin', def: { en: 'Passes high frequencies and attenuates low ones.', fi: 'Päästää korkeat taajuudet läpi ja vaimentaa matalat.' } },
    bandpass: { en: 'band pass filter', fi: 'kaistanpäästösuodatin', def: { en: 'Passes a band around the resonant frequency.', fi: 'Päästää resonanssitaajuuden ympärillä olevan kaistan läpi.' } },
    bandstop: { en: 'band stop filter', fi: 'kaistanestosuodatin', def: { en: 'Blocks a band around the resonant frequency (notch).', fi: 'Estää resonanssitaajuuden ympärillä olevan kaistan.' } },
    activeenergy: { en: 'active energy', fi: 'pätöenergia', sym: 'W_P', def: { en: 'Time integral of active power, kWh.', fi: 'Pätötehon aikaintegraali, kWh.' } },
    reactiveenergy: { en: 'reactive energy', fi: 'loisenergia', sym: 'W_Q', def: { en: 'Time integral of reactive power, kvarh.', fi: 'Loistehon aikaintegraali, kvarh.' } },
    ballast: { en: 'choke / ballast', fi: 'kuristin', def: { en: 'Coil limiting the current of a fluorescent lamp.', fi: 'Loisteputkivalaisimen virtaa rajoittava kela.' } }
  },
  formulas: [
    { name: { en: 'Admittance', fi: 'Admittanssi' }, tex: 'Y = {1}/{Z} = G + jB' },
    { name: { en: 'Parallel RC / RL magnitude', fi: 'RC- ja RL-rinnakkaispiirin suuruus' }, tex: '|Y| = sqrt{G^2 + B^2}' },
    { name: { en: 'Parallel RLC', fi: 'RLC-rinnakkaispiiri' }, tex: 'I = sqrt{I_R^2 + (I_C - I_L)^2}' },
    { name: { en: 'Parallel resonance', fi: 'Rinnakkaisresonanssi' }, tex: 'f_0 = {1}/{2π sqrt{LC}}' },
    { name: { en: 'Parallel Q and bandwidth', fi: 'Rinnakkaispiirin Q ja kaistanleveys' }, tex: 'Q = {R}/{X_L}, BW = {f_0}/{Q}' },
    { name: { en: 'Loss factor of a capacitor', fi: 'Kondensaattorin häviökerroin' }, tex: 'tan δ = {X_C}/{R_h} = {1}/{Q}' },
    { name: { en: 'Parallel compensation', fi: 'Rinnakkaiskompensointi' }, tex: { en: 'C = {P (tan φ - tan φ_new)}/{ω U^2}', fi: 'C = {P (tan φ - tan φ_{uusi})}/{ω U^2}' } },
    { name: { en: 'Active and reactive current', fi: 'Pätö- ja loisvirta' }, tex: 'I_p = I cos φ, I_q = I sin φ' },
    { name: { en: 'RC filter cut-off', fi: 'RC-suodattimen rajataajuus' }, tex: 'f_c = {1}/{2πRC}' },
    { name: { en: 'Energy', fi: 'Energia' }, tex: 'W_P = ∫P dt, 1 kWh = 3.6 MJ' }
  ],
  sections: [
    // ---------------- 10.1
    { id: 't10-props', title: { en: '10.1 Properties of parallel AC circuits', fi: '10.1 Rinnankytketyn vaihtosähköpiirin ominaisuudet' },
      blocks: [
        { id: 't10-props-p1', type: 'text', html: {
          en: '<p>In a <dfn data-term="parallel">parallel connection</dfn> every branch is connected between the same two nodes, so <b>the voltage is the same across every branch</b>. Kirchhoff’s current law still holds, but for current <b>phasors</b>: add them as vectors, not as plain numbers. Prerequisites: phasors and impedance from topic 9.</p>',
          fi: '<p><dfn data-term="parallel">Rinnankytkennässä</dfn> jokainen haara on kytketty samojen kahden solmun väliin, joten <b>jännite on kaikilla haaroilla sama</b>. Kirchhoffin virtalaki pätee edelleen, mutta se koskee virtaosoittimia: laske ne yhteen vektoreina, ei tavallisina lukuina. Esitiedot: osoittimet ja impedanssi (aihe 9).</p>' } },
        { id: 't10-props-l1', type: 'list', items: [
          { en: 'Phasor diagram: the voltage is the reference (x axis). The resistor current points the same way.', fi: 'Osoitinpiirros: jännite on vertailusuunta (x-akseli). Vastuksen virta osoittaa samaan suuntaan.' },
          { en: 'The capacitor current leads the voltage by 90° (points up).', fi: 'Kondensaattorin virta edeltää jännitettä 90° (osoittaa ylös).' },
          { en: 'The coil current lags the voltage by 90° (points down).', fi: 'Kelan virta jää jännitteestä 90° jälkeen (osoittaa alas).' }
        ] },
        { id: 't10-props-fig', type: 'interactive', widget: 'circuit', title: { en: 'R, L and C in parallel on one source', fi: 'R, L ja C rinnakkain yhdellä lähteellä' },
          caption: { en: 'Click each branch to see its current with phase angle. The ammeter shows the source current. Change f.', fi: 'Napsauta haaraa nähdäksesi sen virran ja vaihekulman. Virtamittari näyttää lähdevirran. Muuta taajuutta f.' },
          config: { ac: { f: 50, min: 10, max: 300 }, parts: rlcParts(25), wires: rlcWires, table: true } },
        { id: 't10-props-c1', type: 'callout', kind: 'warn', title: { en: 'Common mistake', fi: 'Yleinen virhe' }, html: {
          en: 'The source current is <em>not</em> the sum of the branch current magnitudes. A 3 A resistor current and a 4 A capacitor current give 5 A, not 7 A.',
          fi: 'Lähdevirta <em>ei</em> ole haaravirtojen itseisarvojen summa. 3 A:n vastusvirta ja 4 A:n kondensaattorivirta antavat 5 A, ei 7 A.' } },
        { id: 't10-props-q1', type: 'question', q: 't10-q8' }
      ] },
    // ---------------- 10.2
    { id: 't10-adm', title: { en: '10.2 Admittance, conductance, susceptance', fi: '10.2 Admittanssi, konduktanssi, suskeptanssi' },
      blocks: [
        { id: 't10-adm-p1', type: 'text', html: {
          en: '<p>For parallel branches it is easier to work with reciprocals. <dfn data-term="admittance">Admittance</dfn> is <f>Y = 1/Z</f>, <dfn data-term="conductance">conductance</dfn> <f>G = 1/R</f> and <dfn data-term="susceptance">susceptance</dfn> <f>B = 1/X</f>. All are measured in siemens (S = 1/Ω). Ohm’s law becomes <f>I = Y·U</f>, and conductances of parallel resistors simply add: <f>G_T = G_1 + G_2 + …</f></p>',
          fi: '<p>Rinnankytkennässä on helpompaa käyttää käänteislukuja. <dfn data-term="admittance">Admittanssi</dfn> on <f>Y = 1/Z</f>, <dfn data-term="conductance">konduktanssi</dfn> <f>G = 1/R</f> ja <dfn data-term="susceptance">suskeptanssi</dfn> <f>B = 1/X</f>. Kaikkien yksikkö on siemens (S = 1/Ω). Ohmin laki saa muodon <f>I = Y·U</f>, ja rinnankytkettyjen vastusten konduktanssit vain summautuvat: <f>G_T = G_1 + G_2 + …</f></p>' } },
        { id: 't10-adm-f1', type: 'formula', key: true, tex: '|Y| = sqrt{G^2 + (B_L - B_C)^2},  B_C = ωC,  B_L = {1}/{ωL}', label: { en: 'Admittance of R, L, C in parallel', fi: 'Rinnankytkettyjen R-, L- ja C-haarojen admittanssi' },
          legend: [['G', { en: 'conductance', fi: 'konduktanssi' }, 'S'], ['B_C', { en: 'capacitive susceptance', fi: 'kapasitiivinen suskeptanssi' }, 'S'], ['B_L', { en: 'inductive susceptance', fi: 'induktiivinen suskeptanssi' }, 'S']] },
        { id: 't10-adm-p2', type: 'text', html: {
          en: '<p>In complex form <f>Y = G + j(B_C − B_L)</f>: a capacitor adds a positive imaginary admittance (<f>jωC</f>), a coil a negative one (<f>1/(jωL)</f>).</p>',
          fi: '<p>Kompleksimuodossa <f>Y = G + j(B_C − B_L)</f>: kondensaattori lisää positiivisen imaginaarisen admittanssin (<f>jωC</f>), kela negatiivisen (<f>1/(jωL)</f>).</p>' } },
        { id: 't10-adm-cp', type: 'interactive', widget: 'cplane', title: { en: 'Admittance triangle Y = G + jB', fi: 'Admittanssikolmio Y = G + jB' },
          caption: { en: 'B is the net susceptance B_C − B_L. Positive B (up) means a capacitive circuit, negative B an inductive one.', fi: 'B on nettosuskeptanssi B_C − B_L. Positiivinen B (ylös) tarkoittaa kapasitiivista, negatiivinen induktiivista piiriä.' },
          config: { unit: 'mS',
            params: [{ id: 'G', tex: 'G', min: 1, max: 10, step: 0.5, value: 4, unit: 'mS' }, { id: 'BC', tex: 'B_C', min: 0, max: 10, step: 0.5, value: 3, unit: 'mS' }, { id: 'BL', tex: 'B_L', min: 0, max: 10, step: 0.5, value: 7, unit: 'mS' }],
            vectors: function (p) { var B = p.BC - p.BL; return [{ re: p.G, im: 0, label: 'G' }, { re: 0, im: B, from: [p.G, 0], label: 'B' }, { re: p.G, im: B, label: 'Y', value: true }]; },
            arcs: function (p) { return [{ to: Math.atan2(p.BC - p.BL, p.G) * D, label: 'φ' }]; },
            bounds: function () { return { re: [0, 12], im: [-10, 10] }; },
            readouts: function (p) { var Y = Math.hypot(p.G, p.BC - p.BL); return [{ tex: '|Z|', value: 1000 / Y, unit: 'Ω' }, { tex: 'φ', value: TDC.util.fmtNum(Math.atan2(p.BC - p.BL, p.G) * D, 3) + '°' }]; } } },
        // (extra)
        { id: 't10-adm-ex1', type: 'example', title: { en: 'R = 60 Ω in parallel with X_L = 80 Ω', fi: 'R = 60 Ω ja X_L = 80 Ω rinnakkain' },
          problem: { en: 'Find |Z| and the phase angle of the current relative to the voltage.', fi: 'Laske |Z| ja virran vaihekulma jännitteeseen nähden.' },
          given: ['R = 60 Ω', 'X_L = 80 Ω'],
          steps: [
            { tex: 'G = 1/60 = 16.67 mS, B_L = 1/80 = 12.5 mS' },
            { tex: '|Y| = sqrt{16.67^2 + 12.5^2} = 20.83 mS' },
            { tex: '|Z| = 1/|Y| = 48 Ω' },
            { tex: 'φ = -arctan(12.5/16.67) = -36.87°' }
          ],
          result: { en: '|Z| = 48 Ω, the current lags the voltage by 36.9°.', fi: '|Z| = 48 Ω, virta jää jännitteestä 36,9° jälkeen.' } },
        { id: 't10-adm-c1', type: 'callout', kind: 'tip', title: { en: 'Remember', fi: 'Muista' }, html: {
          en: 'The impedances do not combine like parallel resistors: 60 Ω ∥ 80 Ω is <em>not</em> 34.3 Ω. The reactance is 90° away from the resistance, so G and B are added as a vector.',
          fi: 'Impedanssit eivät yhdisty kuten rinnankytketyt vastukset: 60 Ω ∥ 80 Ω ei ole 34,3 Ω. Reaktanssi on 90° kulmassa resistanssiin nähden, joten G ja B lasketaan yhteen vektorina.' } },
        { id: 't10-adm-q1', type: 'question', q: 't10-q1' },
        { id: 't10-adm-q2', type: 'question', q: 't10-q3' }
      ] },
    // ---------------- 10.3
    { id: 't10-rc', title: { en: '10.3 Parallel RC circuit', fi: '10.3 RC-rinnakkaispiiri' },
      blocks: [
        { id: 't10-rc-p1', type: 'text', html: {
          en: '<p>Across the same voltage <f>U</f>: <f>I_R = U/R</f> is in phase with <f>U</f> and <f>I_C = U/X_C</f> leads it by 90°. The total current is the phasor sum. Dividing the current triangle by <f>U</f> gives the <b>admittance triangle</b> with legs <f>G</f> and <f>B_C</f> and hypotenuse <f>Y</f>.</p>',
          fi: '<p>Samalla jännitteellä <f>U</f>: <f>I_R = U/R</f> on samassa vaiheessa jännitteen kanssa ja <f>I_C = U/X_C</f> edeltää sitä 90°. Kokonaisvirta on osoitinsumma. Kun virtakolmio jaetaan jännitteellä <f>U</f>, saadaan <b>admittanssikolmio</b>, jonka kateetit ovat <f>G</f> ja <f>B_C</f> ja hypotenuusa <f>Y</f>.</p>' } },
        { id: 't10-rc-f1', type: 'formula', key: true, tex: 'I = sqrt{I_R^2 + I_C^2},  φ = arctan{I_C}/{I_R},  |Y| = sqrt{G^2 + B_C^2}', label: { en: 'Parallel RC (the current leads the voltage)', fi: 'RC-rinnakkaispiiri (virta edeltää jännitettä)' } },
        { id: 't10-rc-ph', type: 'interactive', widget: 'phasor', title: { en: 'Current phasors of a parallel RC circuit (U = 12 V)', fi: 'RC-rinnakkaispiirin virtaosoittimet (U = 12 V)' },
          caption: { en: 'I_R and I_C are added tip to tail. Their sum I is the source current; φ is its lead over U.', fi: 'I_R ja I_C lasketaan yhteen peräkkäin. Summa I on lähdevirta; φ on sen etumatka jännitteeseen U nähden.' },
          config: { rotate: false, waves: false, scale: { V: 12, A: 0.12 },
            params: [{ id: 'R', tex: 'R', min: 50, max: 500, step: 10, value: 220, unit: 'Ω' }, { id: 'XC', tex: 'X_C', min: 50, max: 500, step: 10, value: 150, unit: 'Ω' }],
            phasors: function (p) { var ir = 12 / p.R, ic = 12 / p.XC;
              return [{ id: 'U', mag: 12, deg: 0, unit: 'V' }, { id: 'IR', label: 'I_R', mag: ir, deg: 0, unit: 'A', wave: false },
                { id: 'IC', label: 'I_C', mag: ic, deg: 90, unit: 'A', from: 'IR', wave: false }, { id: 'I', label: 'I', mag: Math.hypot(ir, ic), deg: Math.atan2(ic, ir) * D, unit: 'A', color: '--c-5' }]; },
            arcs: function () { return [{ from: 'U', to: 'I', label: 'φ' }]; },
            readouts: function (p) { var ir = 12 / p.R, ic = 12 / p.XC; return [{ tex: 'I', value: Math.hypot(ir, ic) * 1000, unit: 'mA' }, { tex: 'φ', value: TDC.util.fmtNum(Math.atan2(ic, ir) * D, 3) + '°' }]; } } },
        { id: 't10-rc-cir', type: 'interactive', widget: 'circuit', title: { en: 'Parallel RC circuit', fi: 'RC-rinnakkaispiiri' },
          caption: { en: 'Raise f: X_C falls, I_C grows and φ approaches 90°. (At 50 Hz, C = 21.2 µF gives X_C = 150 Ω.)', fi: 'Nosta taajuutta f: X_C pienenee, I_C kasvaa ja φ lähestyy 90°. (50 Hz:llä C = 21,2 µF antaa X_C = 150 Ω.)' },
          config: { ac: { f: 50, min: 10, max: 500 },
            parts: [{ id: 'U1', type: 'V', a: [0, 4], b: [0, 0], value: 12 }, { id: 'A1', type: 'ammeter', a: [1, 0], b: [3, 0] },
              { id: 'R1', type: 'R', a: [4, 0], b: [4, 4], value: 220, editable: true }, { id: 'C1', type: 'C', a: [7, 0], b: [7, 4], value: 21.22e-6, editable: true }],
            wires: [[[0, 0], [1, 0]], [[3, 0], [7, 0]], [[7, 4], [0, 4]]], table: true } },
        { id: 't10-rc-ex1', type: 'example', title: { en: 'Currents, impedance and phase angle', fi: 'Virrat, impedanssi ja vaihekulma' },
          problem: { en: 'U = 12 V (rms) is applied to R = 220 Ω in parallel with a capacitor of X_C = 150 Ω.', fi: 'Jännite U = 12 V (tehollisarvo) kytketään vastuksen R = 220 Ω ja kondensaattorin X_C = 150 Ω rinnankytkentään.' },
          given: ['U = 12 V', 'R = 220 Ω', 'X_C = 150 Ω'],
          steps: [
            { tex: 'I_R = 12/220 = 54.5 mA, I_C = 12/150 = 80.0 mA' },
            { tex: 'I = sqrt{54.5^2 + 80.0^2} = 96.8 mA' },
            { tex: 'φ = arctan(80.0/54.5) = 55.7°' },
            { tex: 'Y = sqrt{(1/220)^2 + (1/150)^2} = 8.07 mS, Z = 1/Y = 124 Ω' },
            { en: 'Check: I = U/Z = 12 V / 124 Ω = 96.8 mA.', fi: 'Tarkistus: I = U/Z = 12 V / 124 Ω = 96,8 mA.' }
          ],
          result: { en: 'I = 96.8 mA, φ = +55.7° (leading), Z ≈ 124 Ω.', fi: 'I = 96,8 mA, φ = +55,7° (virta edellä), Z ≈ 124 Ω.' } },
        { id: 't10-rc-c1', type: 'callout', kind: 'warn', title: { en: 'Common mistake', fi: 'Yleinen virhe' }, html: {
          en: 'Do not add 54.5 mA + 80 mA = 134.5 mA. The two currents are 90° apart, so the total is only 96.8 mA.',
          fi: 'Älä laske 54,5 mA + 80 mA = 134,5 mA. Virtojen vaihe-ero on 90°, joten kokonaisvirta on vain 96,8 mA.' } },
        // (extra)
        { id: 't10-rc-h', type: 'h', text: { en: 'Real capacitors: loss factor and Q', fi: 'Todelliset kondensaattorit: häviökerroin ja Q' } },
        { id: 't10-rc-p2', type: 'text', html: {
          en: '<p>A real capacitor has leakage, modelled as a loss resistance <f>R_h</f> in parallel with <f>C</f>. The current then leads by slightly less than 90°. The deviation is described by the <dfn data-term="lossfactor">loss factor</dfn> and the <dfn data-term="qfactor">quality factor</dfn>.</p>',
          fi: '<p>Todellisessa kondensaattorissa on vuotoa, jota mallinnetaan <f>C</f>:n kanssa rinnakkaisella häviövastuksella <f>R_h</f>. Virta edeltää jännitettä hieman alle 90°. Poikkeamaa kuvaavat <dfn data-term="lossfactor">häviökerroin</dfn> ja <dfn data-term="qfactor">hyvyysluku</dfn>.</p>' } },
        { id: 't10-rc-f2', type: 'formula', key: true, tex: 'tan δ = {X_C}/{R_h},  Q = {R_h}/{X_C} = {1}/{tan δ}', label: { en: 'Loss factor and quality factor', fi: 'Häviökerroin ja hyvyysluku' } },
        { id: 't10-rc-lf', type: 'interactive', widget: 'readout', title: { en: 'Loss factor of a capacitor', fi: 'Kondensaattorin häviökerroin' },
          caption: { en: 'With 100 nF at 50 Hz and R_h = 100 kΩ you get tan δ ≈ 0.32 and Q ≈ 3.1.', fi: 'Kun C = 100 nF, f = 50 Hz ja R_h = 100 kΩ, saadaan tan δ ≈ 0,32 ja Q ≈ 3,1.' },
          config: { params: [{ id: 'C', tex: 'C', min: 10, max: 1000, value: 100, unit: 'nF', log: true }, { id: 'f', tex: 'f', min: 10, max: 1000, value: 50, unit: 'Hz', log: true }, { id: 'Rh', tex: 'R_h', min: 10, max: 1000, value: 100, unit: 'kΩ', log: true }],
            outputs: function (v) { var xc = 1 / (2 * PI * v.f * v.C * 1e-9); return [{ tex: 'X_C', value: xc / 1000, unit: 'kΩ' }, { tex: 'tan δ', value: xc / (v.Rh * 1000) }, { tex: 'Q', value: v.Rh * 1000 / xc }]; } } },
        { id: 't10-rc-q1', type: 'question', q: 't10-q2' }
      ] },
    // ---------------- 10.4
    { id: 't10-rlc', title: { en: '10.4 Parallel RLC circuit', fi: '10.4 RLC-rinnakkaispiiri' },
      blocks: [
        { id: 't10-rlc-p1', type: 'text', html: {
          en: '<p>The capacitor current <f>I_C = ωCU</f> points up and the coil current <f>I_L = U/(ωL)</f> points down, so they partly cancel. Only the <b>net reactive current</b> <f>I_C − I_L</f> adds to the resistor current.</p>',
          fi: '<p>Kondensaattorin virta <f>I_C = ωCU</f> osoittaa ylös ja kelan virta <f>I_L = U/(ωL)</f> alas, joten ne kumoavat osin toisensa. Vastuksen virtaan lisätään vain <b>loisvirran nettoarvo</b> <f>I_C − I_L</f>.</p>' } },
        { id: 't10-rlc-f1', type: 'formula', key: true, tex: 'I = sqrt{I_R^2 + (I_C - I_L)^2},  φ = arctan{I_C - I_L}/{I_R}', label: { en: 'Parallel RLC (φ < 0: inductive, current lags)', fi: 'RLC-rinnakkaispiiri (φ < 0: induktiivinen, virta jää jälkeen)' } },
        { id: 't10-rlc-ph', type: 'interactive', widget: 'phasor', title: { en: 'Currents of R ∥ L ∥ C (R = 100 Ω, L = 90 mH, C = 50 µF, U = 25 V)', fi: 'R ∥ L ∥ C -piirin virrat (R = 100 Ω, L = 90 mH, C = 50 µF, U = 25 V)' },
          caption: { en: 'Slide f. Below 75 Hz the coil current dominates (inductive); above it the capacitor current dominates. The waves rotate with the phasors.', fi: 'Liu’uta taajuutta f. Alle 75 Hz kelan virta on suurempi (induktiivinen), yli 75 Hz kondensaattorin virta. Aallot pyörivät osoittimien mukana.' },
          config: { scale: { V: 25, A: 1 }, periods: 2,
            params: [{ id: 'f', tex: 'f', min: 20, max: 150, step: 1, value: 50, unit: 'Hz' }],
            f: function (p) { return p.f; },
            phasors: function (p) { var a = adm(100, 0.09, 50e-6, p.f), U = 25;
              return [{ id: 'U', mag: U, deg: 0, unit: 'V' }, { id: 'IR', label: 'I_R', mag: a.G * U, deg: 0, unit: 'A' }, { id: 'IC', label: 'I_C', mag: a.BC * U, deg: 90, unit: 'A' },
                { id: 'IL', label: 'I_L', mag: a.BL * U, deg: -90, unit: 'A' }, { id: 'I', label: 'I', mag: U * Math.hypot(a.G, a.BC - a.BL), deg: Math.atan2(a.BC - a.BL, a.G) * D, unit: 'A', color: '--c-5' }]; },
            arcs: function () { return [{ from: 'U', to: 'I', label: 'φ' }]; },
            readouts: function (p) { var a = adm(100, 0.09, 50e-6, p.f); return [{ tex: 'I', value: 25 * Math.hypot(a.G, a.BC - a.BL), unit: 'A' }, { tex: 'φ', value: TDC.util.fmtNum(Math.atan2(a.BC - a.BL, a.G) * D, 3) + '°' }]; } } },
        { id: 't10-rlc-ex1', type: 'example', title: { en: 'RLC at 50 Hz', fi: 'RLC 50 Hz:llä' },
          problem: { en: 'R = 100 Ω, L = 90 mH and C = 50 µF are in parallel across 25 V, 50 Hz. Find the currents, φ and |Z|.', fi: 'R = 100 Ω, L = 90 mH ja C = 50 µF ovat rinnakkain 25 V:n, 50 Hz:n jännitteessä. Laske virrat, φ ja |Z|.' },
          given: ['U = 25 V', 'f = 50 Hz', 'R = 100 Ω', 'L = 90 mH', 'C = 50 µF'],
          steps: [
            { tex: 'I_R = 25/100 = 0.250 A' },
            { tex: 'I_C = ωCU = 314.2 · 50·10^{-6} · 25 = 0.393 A' },
            { tex: 'I_L = U/(ωL) = 25/(314.2 · 0.090) = 0.884 A' },
            { tex: 'I = sqrt{0.250^2 + (0.393 - 0.884)^2} = 0.551 A' },
            { tex: 'φ = arctan{0.393 - 0.884}/{0.250} = -63.0°' },
            { tex: '|Z| = 25/0.551 = 45.3 Ω' }
          ],
          result: { en: 'I = 0.551 A, φ = −63.0° (inductive), |Z| = 45.3 Ω. [PDF issue: it prints 45.5 Ω and the unit of 0.55 as Ω; it is A.]', fi: 'I = 0,551 A, φ = −63,0° (induktiivinen), |Z| = 45,3 Ω. [PDF:n virhe: se antaa 45,5 Ω ja merkitsee 0,55:n yksiköksi Ω; oikea yksikkö on A.]' } },
        { id: 't10-rlc-c1', type: 'callout', kind: 'info', html: {
          en: 'At 100 Hz the same circuit is capacitive: I_C = 0.785 A, I_L = 0.442 A, I = 0.424 A, φ = +53.9°.',
          fi: 'Samassa piirissä 100 Hz:llä piiri on kapasitiivinen: I_C = 0,785 A, I_L = 0,442 A, I = 0,424 A, φ = +53,9°.' } },
        { id: 't10-rlc-q1', type: 'question', q: 't10-q4' },
        { id: 't10-rlc-q2', type: 'question', q: 't10-q5' }
      ] },
    // ---------------- 10.5
    { id: 't10-res', title: { en: '10.5 Parallel resonance', fi: '10.5 Rinnakkaisresonanssi' },
      blocks: [
        { id: 't10-res-p1', type: 'text', html: {
          en: '<p>At <dfn data-term="parres">parallel resonance</dfn> the susceptances cancel, <f>B_L = B_C</f>. Then <f>Y = G</f> is at its minimum, the impedance is at its maximum (<f>Z = R</f>) and the source current is the <b>minimum</b>, <f>I = U/R</f>. The coil and capacitor currents are equal and opposite: they circulate between L and C and cancel in the source lead.</p>',
          fi: '<p><dfn data-term="parres">Rinnakkaisresonanssissa</dfn> suskeptanssit kumoavat toisensa, <f>B_L = B_C</f>. Silloin <f>Y = G</f> on pienimmillään, impedanssi suurimmillaan (<f>Z = R</f>) ja lähdevirta <b>pienin</b>, <f>I = U/R</f>. Kelan ja kondensaattorin virrat ovat yhtä suuret ja vastakkaissuuntaiset: ne kiertävät L:n ja C:n välillä ja kumoavat toisensa lähdejohdossa.</p>' } },
        { id: 't10-res-f1', type: 'formula', key: true, tex: 'ω_0 = {1}/{sqrt{LC}},  f_0 = {1}/{2π sqrt{LC}}', label: { en: 'Resonant frequency', fi: 'Resonanssitaajuus' } },
        { id: 't10-res-zp', type: 'interactive', widget: 'plot', title: { en: 'Impedance |Z|(f) of R ∥ L ∥ C', fi: 'R ∥ L ∥ C -piirin impedanssi |Z|(f)' },
          caption: { en: 'The peak is at f₀ and its height is R. A larger R gives a narrower, sharper peak (higher Q).', fi: 'Huippu on taajuudella f₀ ja sen korkeus on R. Suurempi R antaa kapeamman, terävämmän huipun (suurempi Q).' },
          config: { x: { min: 10, max: 200, label: { en: 'Frequency f', fi: 'Taajuus f' }, unit: 'Hz' }, y: { min: 0, max: 450, label: { en: 'Impedance |Z|', fi: 'Impedanssi |Z|' }, unit: 'Ω' },
            params: [{ id: 'R', tex: 'R', min: 50, max: 400, step: 10, value: 100, unit: 'Ω' }, { id: 'L', tex: 'L', min: 40, max: 200, step: 5, value: 90, unit: 'mH' }, { id: 'C', tex: 'C', min: 20, max: 100, step: 2, value: 50, unit: 'µF' }],
            curves: [{ fn: function (x, p) { return 1 / yMag(p.R, p.L / 1000, p.C * 1e-6, x); }, label: { en: '|Z|', fi: '|Z|' } }],
            vlines: function (p) { return [{ x: 1 / (2 * PI * Math.sqrt(p.L / 1000 * p.C * 1e-6)), label: 'f₀' }]; },
            hlines: function (p) { return [{ y: p.R, label: 'R' }]; },
            readouts: function (p) { var f0 = 1 / (2 * PI * Math.sqrt(p.L / 1000 * p.C * 1e-6)), Q = p.R / (2 * PI * f0 * p.L / 1000);
              return [{ tex: 'f_0', value: f0, unit: 'Hz' }, { tex: 'Q', value: Q }, { tex: 'BW', value: f0 / Q, unit: 'Hz' }]; } } },
        { id: 't10-res-ip', type: 'interactive', widget: 'plot', title: { en: 'Source current I(f) at U = 25 V', fi: 'Lähdevirta I(f), U = 25 V' },
          caption: { en: 'The current has a minimum of U/R at f₀ = 75 Hz and rises on both sides.', fi: 'Virralla on minimi U/R taajuudella f₀ = 75 Hz, ja se kasvaa molemmin puolin.' },
          config: { x: { min: 10, max: 200, label: { en: 'Frequency f', fi: 'Taajuus f' }, unit: 'Hz' }, y: { min: 0, max: 1.5, label: { en: 'Current I', fi: 'Virta I' }, unit: 'A' },
            params: [{ id: 'R', tex: 'R', min: 50, max: 400, step: 10, value: 100, unit: 'Ω' }],
            curves: [{ fn: function (x, p) { return 25 * yMag(p.R, 0.09, 50e-6, x); }, label: { en: 'I', fi: 'I' } }],
            vlines: function () { return [{ x: 75.03, label: 'f₀' }]; },
            hlines: function (p) { return [{ y: 25 / p.R, label: 'U/R' }]; } } },
        { id: 't10-res-ph', type: 'interactive', widget: 'phasor', title: { en: 'Phasors near resonance (f₀ ≈ 75 Hz)', fi: 'Osoittimet resonanssin lähellä (f₀ ≈ 75 Hz)' },
          caption: { en: 'At 75 Hz I_C and I_L are equal and opposite (0.589 A each); only I_R = 0.25 A remains in the source.', fi: 'Taajuudella 75 Hz I_C ja I_L ovat yhtä suuret ja vastakkaiset (0,589 A kumpikin); lähteeseen jää vain I_R = 0,25 A.' },
          config: { scale: { V: 25, A: 0.7 },
            params: [{ id: 'f', tex: 'f', min: 50, max: 100, step: 0.5, value: 75, unit: 'Hz' }],
            f: function (p) { return p.f; },
            phasors: function (p) { var a = adm(100, 0.09, 50e-6, p.f), U = 25;
              return [{ id: 'U', mag: U, deg: 0, unit: 'V' }, { id: 'IR', label: 'I_R', mag: a.G * U, deg: 0, unit: 'A' }, { id: 'IC', label: 'I_C', mag: a.BC * U, deg: 90, unit: 'A' },
                { id: 'IL', label: 'I_L', mag: a.BL * U, deg: -90, unit: 'A' }, { id: 'I', label: 'I', mag: U * Math.hypot(a.G, a.BC - a.BL), deg: Math.atan2(a.BC - a.BL, a.G) * D, unit: 'A', color: '--c-5' }]; } } },
        { id: 't10-res-ex1', type: 'example', title: { en: 'Resonance of the 100 Ω, 90 mH, 50 µF circuit', fi: 'Piirin 100 Ω, 90 mH, 50 µF resonanssi' },
          problem: { en: 'Find f₀, the source current and the L and C currents at U = 25 V.', fi: 'Laske f₀, lähdevirta sekä L:n ja C:n virrat, kun U = 25 V.' },
          given: ['U = 25 V', 'R = 100 Ω', 'L = 90 mH', 'C = 50 µF'],
          steps: [
            { tex: 'f_0 = {1}/{2π sqrt{0.090 · 50·10^{-6}}} = 75.0 Hz, ω_0 = 471.4 rad/s' },
            { tex: 'I = G U = 25/100 = 0.250 A' },
            { tex: 'I_C = ω_0 C U = 471.4 · 50·10^{-6} · 25 = 0.589 A ∠ +90°' },
            { tex: 'I_L = U/(ω_0 L) = 25/(471.4 · 0.090) = 0.589 A ∠ -90°' }
          ],
          result: { en: 'f₀ = 75.0 Hz; I = 0.250 A; I_C = I_L = 0.589 A. [PDF issue: it prints these currents in mA; they are A.]', fi: 'f₀ = 75,0 Hz; I = 0,250 A; I_C = I_L = 0,589 A. [PDF:n virhe: virrat on merkitty mA:na; oikea yksikkö on A.]' } },
        // (extra)
        { id: 't10-res-p2', type: 'text', html: {
          en: '<p>Parallel <f>Q = R/(ω_0 L) = 100/(471.4·0.09) = 2.36</f> and the bandwidth is <f>BW = f_0/Q = 1/(2πRC) = 31.8 Hz</f>. The circulating current is Q times the source current (0.589 A vs 0.25 A).</p>',
          fi: '<p>Rinnakkaispiirissä <f>Q = R/(ω_0 L) = 100/(471,4·0,09) = 2,36</f> ja kaistanleveys on <f>BW = f_0/Q = 1/(2πRC) = 31,8 Hz</f>. Kiertävä virta on Q-kertainen lähdevirtaan nähden (0,589 A ja 0,25 A).</p>' } },
        { id: 't10-res-c1', type: 'callout', kind: 'warn', title: { en: 'Common mistake', fi: 'Yleinen virhe' }, html: {
          en: 'Series resonance has minimum impedance and maximum current. <b>Parallel</b> resonance is the opposite: maximum impedance and <em>minimum</em> source current.',
          fi: 'Sarjaresonanssissa impedanssi on pienin ja virta suurin. <b>Rinnakkais</b>resonanssissa tilanne on päinvastainen: impedanssi on suurin ja lähdevirta <em>pienin</em>.' } },
        { id: 't10-res-q1', type: 'question', q: 't10-q6' },
        { id: 't10-res-q2', type: 'question', q: 't10-q11' }
      ] },
    // ---------------- 10.6
    { id: 't10-tank', title: { en: '10.6 Ideal parallel LC circuit (tank)', fi: '10.6 Ideaalinen LC-rinnakkaispiiri (värähtelypiiri)' },
      blocks: [
        { id: 't10-tank-p1', type: 'text', html: {
          en: '<p>A coil and a capacitor form an <dfn data-term="tank">oscillating circuit</dfn>: energy sloshes between the coil’s magnetic field and the capacitor’s electric field. With no loss branch (no parallel resistor, so <f>G = 0</f>), at <f>f_0</f> the source current is <b>zero</b> and <f>Z → ∞</f>, while a circulating current flows between L and C.</p>',
          fi: '<p>Kela ja kondensaattori muodostavat <dfn data-term="tank">värähtelypiirin</dfn>: energia heilahtelee kelan magneettikentän ja kondensaattorin sähkökentän välillä. Jos häviöhaaraa ei ole (ei rinnakkaista vastusta, siis <f>G = 0</f>), lähdevirta on taajuudella <f>f_0</f> <b>nolla</b> ja <f>Z → ∞</f>, vaikka L:n ja C:n välillä kiertää virta.</p>' } },
        { id: 't10-tank-ph', type: 'interactive', widget: 'phasor', title: { en: 'I_L and I_C in antiphase', fi: 'I_L ja I_C vastavaiheessa' },
          caption: { en: 'The two currents are mirror images, so their sum I is zero at f₀ = 75 Hz. Move f away from 75 Hz and a net current appears.', fi: 'Virrat ovat toistensa peilikuvia, joten summa I on nolla taajuudella f₀ = 75 Hz. Siirrä f pois 75 Hz:stä, niin lähteeseen ilmestyy nettovirta.' },
          config: { scale: { V: 25, A: 1.2 }, periods: 2,
            params: [{ id: 'f', tex: 'f', min: 40, max: 120, step: 0.5, value: 75, unit: 'Hz' }],
            f: function (p) { return p.f; },
            phasors: function (p) { var a = adm(1e9, 0.09, 50e-6, p.f), U = 25;
              return [{ id: 'U', mag: U, deg: 0, unit: 'V' }, { id: 'IC', label: 'I_C', mag: a.BC * U, deg: 90, unit: 'A' }, { id: 'IL', label: 'I_L', mag: a.BL * U, deg: -90, unit: 'A' },
                { id: 'I', label: 'I', mag: Math.abs(a.BC - a.BL) * U, deg: a.BC > a.BL ? 90 : -90, unit: 'A', color: '--c-5' }]; } } },
        { id: 't10-tank-cir', type: 'interactive', widget: 'circuit', title: { en: 'Ideal L ∥ C: watch the source ammeter', fi: 'Ideaalinen L ∥ C: seuraa lähteen virtamittaria' },
          caption: { en: 'Tune f to 75 Hz: the ammeter reads almost 0, but click L and C to see the large circulating currents.', fi: 'Säädä f arvoon 75 Hz: virtamittari näyttää lähes nollaa, mutta napsauttamalla L:ää ja C:tä näet suuret kiertävät virrat.' },
          config: { ac: { f: 50, min: 20, max: 150, step: 0.5 },
            parts: [{ id: 'U1', type: 'V', a: [0, 4], b: [0, 0], value: 25 }, { id: 'A1', type: 'ammeter', a: [1, 0], b: [3, 0] },
              { id: 'L1', type: 'L', a: [4, 0], b: [4, 4], value: 0.09 }, { id: 'C1', type: 'C', a: [7, 0], b: [7, 4], value: 50e-6 }],
            wires: [[[0, 0], [1, 0]], [[3, 0], [7, 0]], [[7, 4], [0, 4]]], table: true } },
        { id: 't10-tank-c1', type: 'callout', kind: 'tip', title: { en: 'Why can the circulating current exceed the source current?', fi: 'Miksi kiertävä virta voi olla lähdevirtaa suurempi?' }, html: {
          en: 'Each reactive current is limited only by U/X. They cancel in the source lead, not inside the L–C loop. [PDF issue: it writes "R = 0" for G = 0; it should say no loss resistance, i.e. R → ∞.]',
          fi: 'Kutakin loisvirtaa rajoittaa vain U/X. Virrat kumoavat toisensa lähdejohdossa, eivät L–C-silmukan sisällä. [PDF:n virhe: se kirjoittaa "R = 0" ehdolle G = 0; oikea tulkinta on ei häviövastusta, eli R → ∞.]' } },
        { id: 't10-tank-q1', type: 'question', q: 't10-q10' }
      ] },
    // ---------------- 10.7
    { id: 't10-pfp', title: { en: '10.7 Power factor correction: parallel capacitor', fi: '10.7 Loistehon kompensointi: rinnakkaiskondensaattori' },
      blocks: [
        { id: 't10-pfp-p1', type: 'text', html: {
          en: '<p>Inductive loads (motors, transformers, fluorescent lamps with a <dfn data-term="ballast">ballast</dfn>) draw reactive current. A capacitor connected <b>in parallel</b> with the load supplies that reactive current locally, so the line carries less current (<dfn data-term="pfcorr">power factor correction</dfn>). The active current <f>I_p = I cos φ</f> is unchanged, because the capacitor is lossless.</p>',
          fi: '<p>Induktiiviset kuormat (moottorit, muuntajat, <dfn data-term="ballast">kuristimella</dfn> varustetut loisteputkivalaisimet) ottavat loisvirtaa. Kuorman kanssa <b>rinnan</b> kytketty kondensaattori tuottaa loisvirran paikallisesti, jolloin syöttöjohdon virta pienenee (<dfn data-term="pfcorr">loistehon kompensointi</dfn>). Pätövirta <f>I_p = I cos φ</f> ei muutu, koska kondensaattori on häviötön.</p>' } },
        { id: 't10-pfp-f1', type: 'formula', key: true, tex: { en: 'I_p = I cos φ,  I_q = I sin φ,  I_C = I_q - I_p tan φ_new,  C = {I_C}/{ωU}', fi: 'I_p = I cos φ,  I_q = I sin φ,  I_C = I_q - I_p tan φ_{uusi},  C = {I_C}/{ωU}' }, label: { en: 'Sizing the capacitor', fi: 'Kondensaattorin mitoitus' } },
        { id: 't10-pfp-f2', type: 'formula', tex: { en: 'C = {P (tan φ - tan φ_new)}/{ω U^2}', fi: 'C = {P (tan φ - tan φ_{uusi})}/{ω U^2}' }, label: { en: 'Same result with powers (extra)', fi: 'Sama tehoilla (lisä)' } },
        { id: 't10-pfp-ph', type: 'interactive', widget: 'phasor', title: { en: 'Uncompensated and compensated (230 V, I = 1.48 A, cos φ = 0.5)', fi: 'Kompensoimaton ja kompensoitu (230 V, I = 1,48 A, cos φ = 0,5)' },
          caption: { en: 'Increase I_C: the reactive part I_q − I_C shrinks, the line current falls and φ gets smaller. I_p stays fixed.', fi: 'Kasvata I_C:tä: loisosa I_q − I_C pienenee, verkkovirta laskee ja φ pienenee. I_p pysyy samana.' },
          config: { rotate: false, waves: false, scale: { V: 230, A: 1.6 },
            params: [{ id: 'IC', tex: 'I_C', min: 0, max: 1.28, step: 0.02, value: 0.92, unit: 'A' }],
            phasors: function (p) { var ip = 0.74, net = 1.2817 - p.IC;
              return [{ id: 'U', mag: 230, deg: 0, unit: 'V' }, { id: 'IP', label: 'I_p', mag: ip, deg: 0, unit: 'A', wave: false },
                { id: 'IQ', label: 'I_q−I_C', mag: Math.abs(net), deg: -90, unit: 'A', from: 'IP', wave: false },
                { id: 'I', label: 'I', mag: Math.hypot(ip, net), deg: -Math.atan2(net, ip) * D, unit: 'A', color: '--c-5' }]; },
            arcs: function () { return [{ from: 'U', to: 'I', label: 'φ' }]; },
            readouts: function (p) { var net = 1.2817 - p.IC; return [{ tex: 'cos φ', value: 0.74 / Math.hypot(0.74, net), digits: 3 }, { tex: 'I', value: Math.hypot(0.74, net), unit: 'A' }]; } } },
        { id: 't10-pfp-cp', type: 'interactive', widget: 'cplane', title: { en: 'Power triangle S = P + jQ before and after', fi: 'Tehokolmio S = P + jQ ennen ja jälkeen' },
          caption: { en: 'P is fixed. The capacitor reduces Q from Q₁ to Q₂, so the apparent power S shrinks from S₁ to S₂. The C readout assumes 400 V, 50 Hz.', fi: 'P pysyy samana. Kondensaattori pienentää Q:n arvosta Q₁ arvoon Q₂, jolloin näennäisteho S pienenee arvosta S₁ arvoon S₂. C-lukema olettaa 400 V, 50 Hz.' },
          config: { unit: 'kW',
            params: [{ id: 'P', tex: 'P', min: 2, max: 20, step: 0.5, value: 10, unit: 'kW' }, { id: 'pf1', tex: 'cos φ₁', min: 0.5, max: 0.95, step: 0.01, value: 0.7 }, { id: 'pf2', tex: 'cos φ₂', min: 0.8, max: 1, step: 0.01, value: 0.95 }],
            vectors: function (p) { var q1 = p.P * tanAcos(p.pf1), q2 = p.P * tanAcos(p.pf2);
              return [{ re: p.P, im: 0, label: 'P' }, { re: 0, im: q1, from: [p.P, 0], label: 'Q_1' }, { re: p.P, im: q1, label: 'S_1' }, { re: p.P, im: q2, label: 'S_2', color: '--c-5' }]; },
            arcs: function (p) { return [{ to: Math.acos(p.pf1) * D, label: 'φ₁' }, { to: Math.acos(p.pf2) * D, label: 'φ₂' }]; },
            readouts: function (p) { var qc = p.P * (tanAcos(p.pf1) - tanAcos(p.pf2)); return [{ tex: 'Q_C', value: qc, unit: 'kvar' }, { tex: 'C', value: qc * 1000 / (2 * PI * 50 * 160000) * 1e6, unit: 'µF' }]; } } },
        { id: 't10-pfp-cir', type: 'interactive', widget: 'circuit', title: { en: 'Try it: R–L load on 230 V with a parallel capacitor', fi: 'Kokeile: R–L-kuorma 230 V:lla ja rinnakkaiskondensaattori' },
          caption: { en: 'Change C1 and watch the ammeter. The current is smallest where the load is fully compensated.', fi: 'Muuta C1:tä ja seuraa virtamittaria. Virta on pienimmillään, kun kuorma on täysin kompensoitu.' },
          config: Object.assign(pfCircuit(5e-6), { table: true }) },
        { id: 't10-pfp-ex1', type: 'example', title: { en: 'Fluorescent lamp: cos φ from 0.50 to 0.90', fi: 'Loisteputkivalaisin: cos φ 0,50 → 0,90' },
          problem: { en: 'A lamp installation draws I = 1.48 A at 230 V, 50 Hz and cos φ = 0.50 (inductive). Find the parallel capacitor for cos φ = 0.90.', fi: 'Valaisinryhmä ottaa virran I = 1,48 A, kun jännite on 230 V, 50 Hz ja cos φ = 0,50 (induktiivinen). Mitoita rinnakkaiskondensaattori arvolle cos φ = 0,90.' },
          given: ['U = 230 V', 'f = 50 Hz', 'I = 1.48 A', 'cos φ = 0.50'],
          steps: [
            { tex: 'φ = 60°, I_p = 1.48 · 0.5 = 0.74 A, I_q = 1.48 · sin 60° = 1.28 A' },
            { tex: { en: 'φ_new = arccos 0.9 = 25.8°, I_q - I_C = I_p tan φ_new = 0.74 · 0.484 = 0.358 A', fi: 'φ_{uusi} = arccos 0.9 = 25.8°, I_q - I_C = I_p tan φ_{uusi} = 0.74 · 0.484 = 0.358 A' } },
            { tex: 'I_C = 1.28 - 0.358 = 0.92 A' },
            { tex: 'X_C = U/I_C = 230/0.92 = 250 Ω' },
            { tex: 'C = {1}/{ωX_C} = {1}/{314 · 250} = 12.7 µF' },
            { en: 'Line current after compensation: I = I_p / 0.9 = 0.822 A (from 1.48 A).', fi: 'Verkkovirta kompensoinnin jälkeen: I = I_p / 0,9 = 0,822 A (aiemmin 1,48 A).' }
          ],
          result: { en: 'C ≈ 12.7 µF (12.8 µF with unrounded values).', fi: 'C ≈ 12,7 µF (12,8 µF pyöristämättömillä arvoilla).' } },
        // (extra)
        { id: 't10-pfp-ex2', type: 'example', title: { en: 'Workshop motor load', fi: 'Konepajan moottorikuorma' },
          problem: { en: '400 V, 50 Hz, P = 10 kW, cos φ = 0.70. Improve to cos φ = 0.95.', fi: '400 V, 50 Hz, P = 10 kW, cos φ = 0,70. Paranna arvoon cos φ = 0,95.' },
          given: ['U = 400 V', 'P = 10 kW'],
          steps: [
            { tex: { en: 'tan φ = tan 45.57° = 1.020, tan φ_new = tan 18.19° = 0.329', fi: 'tan φ = tan 45.57° = 1.020, tan φ_{uusi} = tan 18.19° = 0.329' } },
            { tex: { en: 'Q_C = P (tan φ - tan φ_new) = 6.92 kvar', fi: 'Q_C = P (tan φ - tan φ_{uusi}) = 6.92 kvar' } },
            { tex: 'C = {Q_C}/{ω U^2} = {6915}/{314.16 · 400^2} = 137.6 µF' },
            { en: 'Line current drops from 35.7 A to 26.3 A.', fi: 'Verkkovirta laskee 35,7 A:sta 26,3 A:iin.' }
          ],
          result: { en: 'C ≈ 138 µF', fi: 'C ≈ 138 µF' } },
        { id: 't10-pfp-c1', type: 'callout', kind: 'info', html: {
          en: '[PDF issue] The lamp is marked 2 × 58 W = 116 W, but U·I·cos φ = 230 · 1.48 · 0.5 = 170 W. The difference (about 54 W) must be the ballast loss.',
          fi: '[PDF:n epäjohdonmukaisuus] Valaisin on merkitty 2 × 58 W = 116 W, mutta U·I·cos φ = 230 · 1,48 · 0,5 = 170 W. Eron (noin 54 W) täytyy olla kuristimen häviöt.' } },
        { id: 't10-pfp-q1', type: 'question', q: 't10-q9' },
        { id: 't10-pfp-q2', type: 'question', q: 't10-q7' }
      ] },
    // ---------------- 10.8
    { id: 't10-pfs', title: { en: '10.8 Power factor correction: series capacitor', fi: '10.8 Loistehon kompensointi: sarjakondensaattori' },
      blocks: [
        { id: 't10-pfs-p1', type: 'text', html: {
          en: '<p>A capacitor can also be connected <b>in series</b> with the device. It reduces the net reactance <f>X_L − X_C</f>, but it changes the voltage and current of the device, so it is not a good fix for a load with fixed voltage. Procedure: <f>Z = U/I</f>, <f>R = Z cos φ</f>, <f>X_L = Z sin φ</f>; then <f>tan φ_1 = (X_L − X_C)/R</f> gives <f>X_C</f> and <f>C = 1/(ωX_C)</f>.</p>',
          fi: '<p>Kondensaattori voidaan kytkeä myös laitteen kanssa <b>sarjaan</b>. Se pienentää nettoreaktanssia <f>X_L − X_C</f>, mutta muuttaa laitteen jännitettä ja virtaa, joten se ei sovi kuormille, joilla on vakiojännite. Menetelmä: <f>Z = U/I</f>, <f>R = Z cos φ</f>, <f>X_L = Z sin φ</f>; sitten <f>tan φ_1 = (X_L − X_C)/R</f> antaa <f>X_C</f>:n ja <f>C = 1/(ωX_C)</f>.</p>' } },
        { id: 't10-pfs-cp', type: 'interactive', widget: 'cplane', title: { en: 'Impedance triangle with a series capacitor', fi: 'Impedanssikolmio sarjakondensaattorilla' },
          caption: { en: 'R = 15 Ω, X_L = 13.2 Ω. Increase X_C: the net reactance and φ fall, but |Z| falls too, so the current (at 240 V) rises.', fi: 'R = 15 Ω, X_L = 13,2 Ω. Kasvata X_C:tä: nettoreaktanssi ja φ pienenevät, mutta myös |Z| pienenee, joten virta (240 V:lla) kasvaa.' },
          config: { unit: 'Ω',
            params: [{ id: 'XC', tex: 'X_C', min: 0, max: 13, step: 0.1, value: 8.3, unit: 'Ω' }],
            vectors: function (p) { var x = 13.23 - p.XC; return [{ re: 15, im: 0, label: 'R' }, { re: 0, im: x, from: [15, 0], label: 'X' }, { re: 15, im: x, label: 'Z', value: true }]; },
            arcs: function (p) { return [{ to: Math.atan2(13.23 - p.XC, 15) * D, label: 'φ' }]; },
            bounds: function () { return { re: [0, 20], im: [0, 15] }; },
            readouts: function (p) { var x = 13.23 - p.XC, z = Math.hypot(15, x); return [{ tex: 'cos φ', value: 15 / z, digits: 3 }, { tex: 'I', value: 240 / z, unit: 'A' }]; } } },
        { id: 't10-pfs-ex1', type: 'example', title: { en: 'Series compensation of an R–L device', fi: 'R–L-laitteen sarjakompensointi' },
          problem: { en: 'U = 240 V, 50 Hz, I = 12 A, cos φ = 0.75 inductive. Improve to cos φ₁ = 0.95 with a series capacitor. Find C and the active powers before and after.', fi: 'U = 240 V, 50 Hz, I = 12 A, cos φ = 0,75 induktiivinen. Paranna arvoon cos φ₁ = 0,95 sarjakondensaattorilla. Laske C ja pätötehot ennen ja jälkeen.' },
          given: ['U = 240 V', 'I = 12 A', 'cos φ = 0.75'],
          steps: [
            { tex: 'Z = 240/12 = 20 Ω, R = Z cos φ = 15.0 Ω, X_L = Z sin φ = 13.2 Ω' },
            { tex: 'P = 240 · 12 · 0.75 = 2.16 kW' },
            { tex: 'tan φ_1 = tan 18.2° = 0.329, X_L - X_C = R tan φ_1 = 4.93 Ω' },
            { tex: 'X_C = 13.2 - 4.93 = 8.27 Ω, C = {1}/{314 · 8.27} = 385 µF' },
            { tex: 'Z_1 = sqrt{15^2 + 4.93^2} = 15.8 Ω, I_1 = 240/15.8 = 15.2 A' },
            { tex: 'P_1 = U I_1 cos φ_1 = 240 · 15.2 · 0.95 = 3.47 kW' }
          ],
          result: { en: 'C ≈ 385 µF; P rises from 2.16 kW to 3.47 kW and the current from 12 A to 15.2 A.', fi: 'C ≈ 385 µF; P kasvaa 2,16 kW:sta 3,47 kW:iin ja virta 12 A:sta 15,2 A:iin.' } },
        { id: 't10-pfs-c1', type: 'callout', kind: 'warn', title: { en: 'Common mistake', fi: 'Yleinen virhe' }, html: {
          en: 'A series capacitor does <em>not</em> reduce the line current; here it raised it from 12 A to 15.2 A. The load runs at a different operating point. With a parallel capacitor the same device keeps P = 2.16 kW and needs only C ≈ 66 µF (extra). [PDF issues: "arccos(0,70) = 41.4°" should be arccos(0.75); "capacitive inductance" means capacitive reactance.]',
          fi: 'Sarjakondensaattori <em>ei</em> pienennä verkkovirtaa; tässä se kasvatti sen 12 A:sta 15,2 A:iin. Kuorma toimii eri toimintapisteessä. Rinnakkaiskondensaattorilla sama laite säilyttää tehon P = 2,16 kW ja tarvitsee vain C ≈ 66 µF (lisä). [PDF:n virheet: "arccos(0,70) = 41,4°" pitäisi olla arccos(0,75); "capacitive inductance" tarkoittaa kapasitiivista reaktanssia.]' } },
        { id: 't10-pfs-q1', type: 'question', q: 't10-q12' }
      ] },
    // ---------------- 10.9
    { id: 't10-energy', title: { en: '10.9 Energy of AC circuits', fi: '10.9 Vaihtosähköpiirin energia' },
      blocks: [
        { id: 't10-energy-p1', type: 'text', html: {
          en: '<p>Each power type has a matching energy, its time integral: <dfn data-term="activeenergy">active energy</dfn> <f>W_P = ∫P dt</f> (Ws = J, kWh), <dfn data-term="reactiveenergy">reactive energy</dfn> <f>W_Q = ∫Q dt</f> (var·s, kvarh) and apparent energy <f>W_S = ∫S dt</f> (VA·s). Households pay only for active energy. Industry is also billed for reactive energy, because it loads the network and limits its capacity.</p>',
          fi: '<p>Jokaista tehoa vastaa energia, sen aikaintegraali: <dfn data-term="activeenergy">pätöenergia</dfn> <f>W_P = ∫P dt</f> (Ws = J, kWh), <dfn data-term="reactiveenergy">loisenergia</dfn> <f>W_Q = ∫Q dt</f> (var·s, kvarh) ja näennäisenergia <f>W_S = ∫S dt</f> (VA·s). Kotitaloudet maksavat vain pätöenergiasta. Teollisuudelta laskutetaan myös loisenergia, koska se kuormittaa verkkoa ja rajoittaa sen kapasiteettia.</p>' } },
        { id: 't10-energy-f1', type: 'formula', key: true, tex: '1 kWh = 1000 W · 3600 s = 3.6 MJ', label: { en: 'Unit conversion', fi: 'Yksikkömuunnos' } },
        { id: 't10-energy-ro', type: 'interactive', widget: 'readout', title: { en: 'Energy of a motor', fi: 'Moottorin energia' },
          caption: { en: 'A motor with P = 10 kW and Q = 6 kvar running for 8 h: W_P = 80 kWh, W_Q = 48 kvarh.', fi: 'Moottori, jolla P = 10 kW ja Q = 6 kvar, käy 8 h: W_P = 80 kWh, W_Q = 48 kvarh.' },
          config: { params: [{ id: 'P', tex: 'P', min: 1, max: 50, step: 0.5, value: 10, unit: 'kW' }, { id: 'Q', tex: 'Q', min: 0, max: 50, step: 0.5, value: 6, unit: 'kvar' }, { id: 't', tex: 't', min: 1, max: 24, step: 1, value: 8, unit: 'h' }],
            outputs: function (v) { return [{ tex: 'S', value: Math.hypot(v.P, v.Q), unit: 'kVA' }, { tex: 'W_P', value: v.P * v.t, unit: 'kWh' }, { tex: 'W_Q', value: v.Q * v.t, unit: 'kvarh' }, { tex: 'W_P', value: v.P * v.t * 3.6, unit: 'MJ' }]; } } },
        { id: 't10-energy-c1', type: 'callout', kind: 'tip', html: {
          en: 'This is the economic reason for power factor correction (10.7): less reactive energy to pay for and smaller line currents.',
          fi: 'Tämä on loistehon kompensoinnin (10.7) taloudellinen peruste: vähemmän maksettavaa loisenergiaa ja pienemmät verkkovirrat.' } },
        { id: 't10-energy-q1', type: 'question', q: 't10-q13' }
      ] },
    // ---------------- 10.10
    { id: 't10-filt', title: { en: '10.10 Analog filters', fi: '10.10 Analogiset suodattimet' },
      blocks: [
        { id: 't10-filt-p1', type: 'text', html: {
          en: '<p>The <dfn data-term="transfer">transfer function</dfn> <f>H(ω) = U_out/U_in</f> is complex: |H| is the amplitude ratio and arg H the phase shift. (The PDF words it as input over output; the formula is output/input.) The cut-off (half-power) frequency is where <f>|H| = 0.707</f> (−3 dB).</p>',
          fi: '<p><dfn data-term="transfer">Siirtofunktio</dfn> <f>H(ω) = U_out/U_in</f> on kompleksinen: |H| on amplitudisuhde ja arg H vaihesiirto. (PDF kuvaa sen sanallisesti tulo jaettuna lähdöllä; kaava on lähtö/tulo.) Rajataajuus (puolitehotaajuus) on taajuus, jolla <f>|H| = 0,707</f> (−3 dB).</p>' } },
        { id: 't10-filt-h1', type: 'h', text: { en: 'RC low pass and high pass', fi: 'RC-alipäästö- ja ylipäästösuodatin' } },
        { id: 't10-filt-f1', type: 'formula', key: true, tex: 'H_{LP} = {1}/{1 + jωRC},  H_{HP} = {jωRC}/{1 + jωRC},  f_c = {1}/{2πRC}', label: { en: 'RC filters', fi: 'RC-suodattimet' } },
        { id: 't10-filt-cir', type: 'interactive', widget: 'circuit', title: { en: 'RC low pass: voltmeter across C', fi: 'RC-alipäästö: jännitemittari C:n yli' },
          caption: { en: 'U_in = 10 V. Sweep f: at f_c = 187 Hz the voltmeter reads 7.07 V.', fi: 'U_in = 10 V. Muuta taajuutta f: rajataajuudella f_c = 187 Hz mittari näyttää 7,07 V.' },
          config: { ac: { f: 20, min: 10, max: 1000 },
            parts: [{ id: 'U1', type: 'V', a: [0, 4], b: [0, 0], value: 10 }, { id: 'R1', type: 'R', a: [0, 0], b: [3, 0], value: 850 }, { id: 'C1', type: 'C', a: [6, 0], b: [6, 4], value: 1e-6 }, { id: 'V1', type: 'voltmeter', a: [8, 0], b: [8, 4] }],
            wires: [[[3, 0], [8, 0]], [[8, 4], [0, 4]]], table: true } },
        { id: 't10-filt-lp', type: 'interactive', widget: 'plot', title: { en: 'Low pass and high pass magnitude', fi: 'Ali- ja ylipäästön amplitudivaste' },
          caption: { en: 'Both curves cross 0.707 at f_c = 1/(2πRC). R = 850 Ω, C = 1 µF gives 187 Hz (ω_c = 1176 rad/s).', fi: 'Molemmat käyrät leikkaavat arvon 0,707 rajataajuudella f_c = 1/(2πRC). R = 850 Ω, C = 1 µF antaa 187 Hz (ω_c = 1176 rad/s).' },
          config: { x: { min: 1, max: 1e5, log: true, label: { en: 'Frequency f', fi: 'Taajuus f' }, unit: 'Hz' }, y: { min: 0, max: 1.05, label: { en: '|H|', fi: '|H|' } },
            params: [{ id: 'R', tex: 'R', min: 100, max: 3000, step: 50, value: 850, unit: 'Ω' }, { id: 'C', tex: 'C', min: 0.1, max: 5, step: 0.1, value: 1, unit: 'µF' }],
            curves: [{ fn: function (x, p) { return lpHz(p.R, p.C * 1e-6, x); }, label: { en: 'low pass', fi: 'alipäästö' } },
              { fn: function (x, p) { return hpHz(p.R, p.C * 1e-6, x); }, label: { en: 'high pass', fi: 'ylipäästö' }, color: '--c-2' }],
            vlines: function (p) { return [{ x: 1 / (2 * PI * p.R * p.C * 1e-6), label: 'f_c' }]; },
            hlines: function () { return [{ y: 0.7071, label: '0.707' }]; },
            readouts: function (p) { return [{ tex: 'f_c', value: 1 / (2 * PI * p.R * p.C * 1e-6), unit: 'Hz' }, { tex: 'ω_c', value: 1 / (p.R * p.C * 1e-6), unit: 'rad/s' }]; } } },
        { id: 't10-filt-ex1', type: 'example', title: { en: 'Cut-off of the RC low pass', fi: 'RC-alipäästön rajataajuus' },
          problem: { en: 'R = 850 Ω, C = 1.0 µF. Find ω_c, f_c and H at ω_c.', fi: 'R = 850 Ω, C = 1,0 µF. Laske ω_c, f_c ja H arvolla ω_c.' },
          given: ['R = 850 Ω', 'C = 1.0 µF'],
          steps: [
            { tex: 'ω_c = {1}/{RC} = {1}/{850 · 10^{-6}} = 1176 rad/s' },
            { tex: 'f_c = ω_c/(2π) = 187.2 Hz' },
            { tex: 'H = {1}/{1 + j} = 0.707 ∠ -45°' }
          ],
          result: { en: 'ω_c = 1176 rad/s (f_c = 187 Hz). [PDF issue: "1.2 kHz" should be 1.2 krad/s.]', fi: 'ω_c = 1176 rad/s (f_c = 187 Hz). [PDF:n virhe: "1,2 kHz" pitäisi olla 1,2 krad/s.]' } },
        { id: 't10-filt-h2', type: 'h', text: { en: 'Band pass', fi: 'Kaistanpäästösuodatin' } },
        { id: 't10-filt-f2', type: 'formula', key: true, tex: 'H = {R}/{R_T + j(ωL - 1/(ωC))},  f_r = {1}/{2π sqrt{LC}},  Q = {X_L}/{R},  BW = {f_r}/{Q}', label: { en: 'Series L–C, output over R', fi: 'Sarja-LC, lähtö R:n yli' } },
        { id: 't10-filt-bp', type: 'interactive', widget: 'plot', title: { en: 'Band pass (C = 14.7 µF, L = 10 mH)', fi: 'Kaistanpäästö (C = 14,7 µF, L = 10 mH)' },
          caption: { en: 'Larger R lowers Q and widens the band. With R = 51 Ω: f_r = 415 Hz, Q = 0.51, BW ≈ 812 Hz (the PDF reads 765 Hz from the graph and mixes ω and f).', fi: 'Suurempi R pienentää Q:ta ja leventää kaistaa. Kun R = 51 Ω: f_r = 415 Hz, Q = 0,51, BW ≈ 812 Hz (PDF lukee kuvaajasta 765 Hz ja sekoittaa ω:n ja f:n).' },
          config: { x: { min: 10, max: 20000, log: true, label: { en: 'Frequency f', fi: 'Taajuus f' }, unit: 'Hz' }, y: { min: 0, max: 1.05, label: { en: '|H|', fi: '|H|' } },
            params: [{ id: 'R', tex: 'R', min: 5, max: 200, step: 1, value: 51, unit: 'Ω' }],
            curves: [{ fn: function (x, p) { return p.R / Math.hypot(p.R, reactX(0.01, 14.7e-6, x)); }, label: { en: '|H|', fi: '|H|' } }],
            vlines: function () { return [{ x: 415.1, label: 'f_r' }]; },
            hlines: function () { return [{ y: 0.7071, label: '0.707' }]; },
            readouts: function (p) { var xl = 2 * PI * 415.1 * 0.01; return [{ tex: 'Q', value: xl / p.R }, { tex: 'BW', value: p.R / (2 * PI * 0.01), unit: 'Hz' }]; } } },
        { id: 't10-filt-h3', type: 'h', text: { en: 'Band stop (notch)', fi: 'Kaistanestosuodatin' } },
        { id: 't10-filt-p2', type: 'text', html: {
          en: '<p>R in series, series L–C to ground, output over the L–C branch. At resonance the L–C branch is a short circuit, so <f>U_out → 0</f>. Again <f>Q = X_L/R</f> and <f>BW = f_r/Q</f>. The phase swings from 0 to −90°, jumps to +90° just above resonance and decays to 0.</p>',
          fi: '<p>R sarjassa, sarja-LC maahan, lähtö LC-haaran yli. Resonanssissa LC-haara on oikosulku, joten <f>U_out → 0</f>. Taas <f>Q = X_L/R</f> ja <f>BW = f_r/Q</f>. Vaihe kääntyy arvosta 0 arvoon −90°, hyppää resonanssin yläpuolella arvoon +90° ja vaimenee takaisin nollaan.</p>' } },
        { id: 't10-filt-bs', type: 'interactive', widget: 'plot', title: { en: 'Band stop (R = 4 kΩ, C = 0.59 µF)', fi: 'Kaistanestosuodatin (R = 4 kΩ, C = 0,59 µF)' },
          caption: { en: 'Change L to move the notch. L = 0.27 H gives f_r = 399 Hz; exact −3 dB edges are 65.6 Hz and 2423 Hz (the PDF reads 60 Hz and 2.4 kHz).', fi: 'Muuta L:ää siirtääksesi lovea. L = 0,27 H antaa f_r = 399 Hz; tarkat −3 dB:n rajat ovat 65,6 Hz ja 2423 Hz (PDF lukee 60 Hz ja 2,4 kHz).' },
          config: { x: { min: 10, max: 10000, log: true, label: { en: 'Frequency f', fi: 'Taajuus f' }, unit: 'Hz' }, y: { min: 0, max: 1.05, label: { en: '|H|', fi: '|H|' } },
            params: [{ id: 'L', tex: 'L', min: 0.05, max: 1, step: 0.01, value: 0.27, unit: 'H' }],
            curves: [{ fn: function (x, p) { var X = Math.abs(reactX(p.L, 0.59e-6, x)); return X / Math.hypot(4000, X); }, label: { en: '|H|', fi: '|H|' } }],
            vlines: function (p) { return [{ x: 1 / (2 * PI * Math.sqrt(p.L * 0.59e-6)), label: 'f_r' }]; },
            hlines: function () { return [{ y: 0.7071, label: '0.707' }]; },
            readouts: function (p) { var fr = 1 / (2 * PI * Math.sqrt(p.L * 0.59e-6)); return [{ tex: 'f_r', value: fr, unit: 'Hz' }, { tex: 'BW', value: 4000 / (2 * PI * p.L), unit: 'Hz' }]; } } },
        { id: 't10-filt-c1', type: 'callout', kind: 'warn', title: { en: 'Common mistake', fi: 'Yleinen virhe' }, html: {
          en: 'ω (rad/s) and f (Hz) differ by 2π. A cut-off "ω_c = 1176" is not "1.2 kHz". Always check which one a graph axis uses.',
          fi: 'ω (rad/s) ja f (Hz) eroavat kertoimella 2π. Rajakulmataajuus "ω_c = 1176" ei ole "1,2 kHz". Tarkista aina, kumpaa kuvaajan akseli käyttää.' } },
        { id: 't10-filt-q1', type: 'question', q: 't10-q14' }
      ] }
  ],
  questions: [
    { id: 't10-q1', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.02,
      prompt: { en: 'A resistor R = 60 Ω is connected in parallel with a coil of reactance X_L = 80 Ω. Find the magnitude of the impedance |Z|.', fi: 'Vastus R = 60 Ω on kytketty rinnan kelan kanssa, jonka reaktanssi on X_L = 80 Ω. Laske impedanssin suuruus |Z|.' },
      fields: [{ id: 'Z', tex: '|Z|', unit: 'Ω' }], hints: [{ en: 'Add G and B as a vector: |Y| = √(G² + B²).', fi: 'Laske G ja B yhteen vektorina: |Y| = √(G² + B²).' }] },
    { id: 't10-q2', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.02,
      prompt: { en: '12 V (rms) is applied to R = 220 Ω in parallel with a capacitor of X_C = 150 Ω. Find the total current I and the phase angle φ of the current relative to the voltage (positive = leading).', fi: '12 V:n (tehollisarvo) jännite kytketään vastuksen R = 220 Ω ja kondensaattorin X_C = 150 Ω rinnankytkentään. Laske kokonaisvirta I ja virran vaihekulma φ jännitteeseen nähden (positiivinen = virta edellä).' },
      fields: [{ id: 'I', tex: 'I', unit: 'A' }, { id: 'phi', tex: 'φ', unit: '°' }] },
    { id: 't10-q3', mode: 'practice', type: 'fill', difficulty: 1,
      prompt: { en: 'Fill in the blanks.', fi: 'Täydennä aukot.' },
      text: { en: 'Admittance is the reciprocal of [[a]], and its SI unit is the [[b]].', fi: 'Admittanssi on [[a]]:n käänteisluku, ja sen SI-yksikkö on [[b]].' },
      fields: [{ id: 'a', kind: 'text' }, { id: 'b', kind: 'text' }] },
    { id: 't10-q4', mode: 'practice', type: 'order', difficulty: 3, hints: [{ en: 'For each frequency find the three branch currents separately: I_R = U/R, I_L = U/(ωL), I_C = U·ωC. Then combine them, remembering that I_L and I_C point in opposite directions.', fi: 'Laske jokaisella taajuudella kolme haaravirtaa erikseen: I_R = U/R, I_L = U/(ωL), I_C = U·ωC. Yhdistä ne sitten ottaen huomioon, että I_L ja I_C ovat vastakkaisvaiheiset.' }, { en: 'Write the source current as I = √(I_R² + (I_C − I_L)²). Compute ω = 2πf first for each frequency.', fi: 'Kirjoita lähdevirta muotoon I = √(I_R² + (I_C − I_L)²). Laske ensin ω = 2πf jokaiselle taajuudelle.' }, { en: 'I_R does not depend on frequency, so only the difference |I_C − I_L| decides the order. The smaller that difference, the smaller the source current.', fi: 'I_R ei riipu taajuudesta, joten vain erotus |I_C − I_L| ratkaisee järjestyksen. Mitä pienempi erotus, sitä pienempi lähdevirta.' }],
      prompt: { en: 'R = 100 Ω, L = 90 mH, C = 50 µF in parallel across 25 V. Order the source current from smallest to largest at these frequencies.', fi: 'R = 100 Ω, L = 90 mH ja C = 50 µF ovat rinnakkain 25 V:n jännitteessä. Järjestä lähdevirta pienimmästä suurimpaan näillä taajuuksilla.' },
      items: [{ id: 'a', html: { en: '50 Hz', fi: '50 Hz' } }, { id: 'b', html: { en: '75 Hz', fi: '75 Hz' } }, { id: 'c', html: { en: '100 Hz', fi: '100 Hz' } }] },
    { id: 't10-q5', mode: 'practice', type: 'match', difficulty: 1,
      prompt: { en: 'Match each quantity with its definition.', fi: 'Yhdistä suure ja sen määritelmä.' },
      left: [{ id: 'G', html: { en: 'conductance', fi: 'konduktanssi' } }, { id: 'B', html: { en: 'susceptance', fi: 'suskeptanssi' } }, { id: 'Y', html: { en: 'admittance', fi: 'admittanssi' } }, { id: 'tan', html: { en: 'loss factor tan δ', fi: 'häviökerroin tan δ' } }, { id: 'Q', html: { en: 'quality factor Q', fi: 'hyvyysluku Q' } }],
      right: [{ id: 'r4', html: { en: '<f>X_C/R_h</f>', fi: '<f>X_C/R_h</f>' } }, { id: 'r2', html: { en: '<f>1/X</f>', fi: '<f>1/X</f>' } }, { id: 'r5', html: { en: '<f>R_h/X_C</f>', fi: '<f>R_h/X_C</f>' } }, { id: 'r1', html: { en: '<f>1/R</f>', fi: '<f>1/R</f>' } }, { id: 'r3', html: { en: '<f>1/Z</f>', fi: '<f>1/Z</f>' } }] },
    { id: 't10-q6', mode: 'practice', type: 'slider', difficulty: 2, tol: 0.03,
      prompt: { en: 'R = 100 Ω, L = 90 mH, U = 25 V, f = 50 Hz. Adjust C so that the source current is at its minimum (parallel resonance at 50 Hz).', fi: 'R = 100 Ω, L = 90 mH, U = 25 V, f = 50 Hz. Säädä C niin, että lähdevirta on pienimmillään (rinnakkaisresonanssi 50 Hz:llä).' },
      widget: { name: 'plot', config: {
        x: { min: 20, max: 250, label: { en: 'Capacitance C', fi: 'Kapasitanssi C' }, unit: 'µF' }, y: { min: 0, max: 2, label: { en: 'Source current I', fi: 'Lähdevirta I' }, unit: 'A' },
        params: [{ id: 'C', tex: 'C', min: 20, max: 250, step: 1, value: 50, unit: 'µF' }],
        curves: [{ fn: function (x) { return 25 * yMag(100, 0.09, x * 1e-6, 50); } }],
        points: function (p) { return [{ x: p.C, y: 25 * yMag(100, 0.09, p.C * 1e-6, 50) }]; },
        answer: function (p) { return { v: p.C }; } } } },
    { id: 't10-q7', mode: 'practice', type: 'circuit', difficulty: 3, hints: [{ en: 'Current in phase with voltage means the total susceptance of the circuit is zero: Im(Y) = 0. Work with admittances.', fi: 'Virta samassa vaiheessa jännitteen kanssa tarkoittaa, että piirin kokonaissuskeptanssi on nolla: Im(Y) = 0. Käytä admittansseja.' }, { en: 'The R–L branch has Y = 1/(R + jX_L), so its susceptance is −X_L/(R² + X_L²) (inductive). The capacitor branch adds +ωC.', fi: 'R–L-haaran admittanssi on Y = 1/(R + jX_L), joten sen suskeptanssi on −X_L/(R² + X_L²) (induktiivinen). Kondensaattorihaara lisää +ωC.' }, { en: 'Set ωC = X_L/(R² + X_L²). First compute X_L = ωL with ω = 2πf, then solve for C.', fi: 'Aseta ωC = X_L/(R² + X_L²). Laske ensin X_L = ωL, kun ω = 2πf, ja ratkaise sitten C.' }], tol: 0.03,
      prompt: { en: 'An R–L load (100 Ω in series with 0.2 H) is on 230 V, 50 Hz. Set C1 so that the power factor of the whole circuit is 1, i.e. the current is in phase with the voltage.', fi: 'R–L-kuorma (100 Ω:n vastus sarjassa 0,2 H:n kelan kanssa) on 230 V:n, 50 Hz:n jännitteessä. Aseta C1 niin, että koko piirin tehokerroin on 1, eli virta on samassa vaiheessa jännitteen kanssa.' },
      widget: { name: 'circuit', config: Object.assign(pfCircuit(5e-6), { table: true, answer: { kind: 'value', part: 'C1' } }) } },
    { id: 't10-q8', mode: 'practice', type: 'multi', difficulty: 2,
      prompt: { en: 'Select all statements that are true at parallel resonance of R ∥ L ∥ C.', fi: 'Valitse kaikki väitteet, jotka pätevät R ∥ L ∥ C -piirin rinnakkaisresonanssissa.' },
      options: [{ id: 'a', html: { en: '<f>B_L = B_C</f>', fi: '<f>B_L = B_C</f>' } }, { id: 'b', html: { en: '<f>Y = G</f>', fi: '<f>Y = G</f>' } }, { id: 'c', html: { en: 'The source current is at its minimum', fi: 'Lähdevirta on pienimmillään' } }, { id: 'd', html: { en: 'The impedance is at its minimum', fi: 'Impedanssi on pienimmillään' } }] },
    { id: 't10-q9', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.02,
      prompt: { en: 'A load draws I = 1.48 A at cos φ = 0.50. Find the active current I_p and the reactive current I_q.', fi: 'Kuorma ottaa virran I = 1,48 A, kun cos φ = 0,50. Laske pätövirta I_p ja loisvirta I_q.' },
      fields: [{ id: 'Ip', tex: 'I_p', unit: 'A' }, { id: 'Iq', tex: 'I_q', unit: 'A' }] },
    { id: 't10-q10', mode: 'practice', type: 'fill', difficulty: 1,
      prompt: { en: 'Fill in the blank.', fi: 'Täydennä aukko.' },
      text: { en: 'The greater the Q, the [[a]] the bandwidth (BW = f₀/Q).', fi: 'Mitä suurempi Q, sitä [[a]] on kaistanleveys (BW = f₀/Q).' },
      fields: [{ id: 'a', kind: 'text' }] },
    { id: 't10-q11', mode: 'practice', type: 'numeric', difficulty: 1, tol: 0.02,
      prompt: { en: 'Find the resonant frequency of a parallel circuit with L = 10 mH and C = 1 µF.', fi: 'Laske rinnakkaispiirin resonanssitaajuus, kun L = 10 mH ja C = 1 µF.' },
      fields: [{ id: 'f0', tex: 'f_0', unit: 'Hz' }] },
    { id: 't10-q12', mode: 'practice', type: 'numeric', difficulty: 3, hints: [{ en: 'Parallel compensation does not change P; it only reduces the reactive power Q. Use the power triangle.', fi: 'Rinnakkaiskompensointi ei muuta pätötehoa P, vaan pienentää loistehoa Q. Käytä tehokolmiota.' }, { en: 'Find the reactive power before and after: Q = P·tan φ with φ = arccos(cos φ) for both power factors. The capacitor must supply the difference Q_C = Q₁ − Q₂.', fi: 'Laske loisteho ennen ja jälkeen: Q = P·tan φ, missä φ = arccos(cos φ) molemmille tehokertoimille. Kondensaattorin on tuotettava erotus Q_C = Q₁ − Q₂.' }, { en: 'A capacitor at voltage U has Q_C = ωC·U², so C = Q_C/(ωU²) with ω = 2πf.', fi: 'Kondensaattorin loisteho jännitteellä U on Q_C = ωC·U², joten C = Q_C/(ωU²), missä ω = 2πf.' }], tol: 0.03,
      prompt: { en: 'The device of 10.8 (240 V, 50 Hz, P = 2.16 kW, cos φ = 0.75) is instead compensated with a PARALLEL capacitor to cos φ = 0.95. Find C.', fi: 'Kohdan 10.8 laite (240 V, 50 Hz, P = 2,16 kW, cos φ = 0,75) kompensoidaan sen sijaan RINNAKKAISKONDENSAATTORILLA arvoon cos φ = 0,95. Laske C.' },
      fields: [{ id: 'C', tex: 'C', unit: 'F' }] },
    { id: 't10-q13', mode: 'practice', type: 'mc', difficulty: 1,
      prompt: { en: 'A motor draws P = 10 kW and Q = 6 kvar for 8 hours. How much reactive energy is that?', fi: 'Moottori ottaa tehon P = 10 kW ja Q = 6 kvar 8 tunnin ajan. Kuinka suuri loisenergia on?' },
      options: [{ id: 'a', html: { en: '80 kvarh', fi: '80 kvarh' } }, { id: 'b', html: { en: '48 kvarh', fi: '48 kvarh' } }, { id: 'c', html: { en: '6 kvarh', fi: '6 kvarh' } }, { id: 'd', html: { en: '10 kvarh', fi: '10 kvarh' } }] },
    { id: 't10-q14', mode: 'practice', type: 'match', difficulty: 2,
      prompt: { en: 'Match each filter with its structure.', fi: 'Yhdistä suodatin ja sen rakenne.' },
      left: [{ id: 'lp', html: { en: 'RC low pass', fi: 'RC-alipäästö' } }, { id: 'hp', html: { en: 'RC high pass', fi: 'RC-ylipäästö' } }, { id: 'bp', html: { en: 'band pass', fi: 'kaistanpäästö' } }, { id: 'bs', html: { en: 'band stop', fi: 'kaistaneste' } }],
      right: [{ id: 'd', html: { en: 'R in series, series L–C to ground, output over L–C', fi: 'R sarjassa, sarja-LC maahan, lähtö LC:n yli' } }, { id: 'b', html: { en: 'C in series, output over R', fi: 'C sarjassa, lähtö R:n yli' } }, { id: 'a', html: { en: 'R in series, output over C', fi: 'R sarjassa, lähtö C:n yli' } }, { id: 'c', html: { en: 'series L–C, output over R', fi: 'sarja-LC, lähtö R:n yli' } }] },
    // ---- graded
    { id: 't10-g1', mode: 'graded', type: 'mc', difficulty: 1, points: 1,
      prompt: { en: 'Which quantity is the same in all branches of a parallel AC circuit?', fi: 'Mikä suure on sama rinnankytketyn vaihtosähköpiirin kaikissa haaroissa?' },
      options: [{ id: 'a', html: { en: 'current', fi: 'virta' } }, { id: 'b', html: { en: 'voltage', fi: 'jännite' } }, { id: 'c', html: { en: 'power', fi: 'teho' } }, { id: 'd', html: { en: 'reactance', fi: 'reaktanssi' } }] },
    { id: 't10-g2', mode: 'graded', type: 'numeric', difficulty: 2, points: 2, tol: 0.02,
      prompt: { en: '12 V is applied to R = 220 Ω in parallel with X_C = 100 Ω. Find the total current.', fi: '12 V:n jännite kytketään vastuksen R = 220 Ω ja X_C = 100 Ω rinnankytkentään. Laske kokonaisvirta.' },
      fields: [{ id: 'I', tex: 'I', unit: 'A' }] },
    { id: 't10-g3', mode: 'graded', type: 'mc', difficulty: 2, points: 1,
      prompt: { en: 'An ideal parallel L–C circuit (no loss) at its resonant frequency draws from the source:', fi: 'Ideaalinen LC-rinnakkaispiiri (ei häviöitä) ottaa resonanssitaajuudellaan lähteestä:' },
      options: [{ id: 'a', html: { en: 'maximum current', fi: 'suurimman virran' } }, { id: 'b', html: { en: 'zero current', fi: 'nollavirran' } }, { id: 'c', html: { en: 'the current U/R', fi: 'virran U/R' } }, { id: 'd', html: { en: 'infinite current', fi: 'äärettömän virran' } }] },
    { id: 't10-g4', mode: 'graded', type: 'numeric', difficulty: 3, hints: [{ en: 'Parallel compensation leaves the active power P unchanged and reduces only the reactive power. Use the power triangle before and after.', fi: 'Rinnakkaiskompensointi ei muuta pätötehoa P, vaan pienentää vain loistehoa. Käytä tehokolmiota ennen ja jälkeen.' }, { en: 'Compute φ₁ = arccos(0.70) and φ₂ = arccos(0.95), then the capacitor must supply Q_C = P(tan φ₁ − tan φ₂).', fi: 'Laske φ₁ = arccos(0,70) ja φ₂ = arccos(0,95). Kondensaattorin on tuotettava Q_C = P(tan φ₁ − tan φ₂).' }, { en: 'Use Q_C = ωC·U² with ω = 2πf and the line voltage given, and solve C = Q_C/(ωU²).', fi: 'Käytä relaatiota Q_C = ωC·U², missä ω = 2πf ja U on annettu jännite, ja ratkaise C = Q_C/(ωU²).' }], points: 3, tol: 0.03,
      prompt: { en: 'A 400 V, 50 Hz load takes P = 10 kW at cos φ = 0.70 (inductive). Find the parallel capacitor that raises the power factor to 0.95.', fi: '400 V:n, 50 Hz:n kuorma ottaa tehon P = 10 kW, kun cos φ = 0,70 (induktiivinen). Laske rinnakkaiskondensaattori, joka nostaa tehokertoimen arvoon 0,95.' },
      fields: [{ id: 'C', tex: 'C', unit: 'F' }] },
    { id: 't10-g5', mode: 'graded', type: 'numeric', difficulty: 1, points: 2, tol: 0.02,
      prompt: { en: 'An RC low pass has R = 850 Ω and C = 1.0 µF. Find the cut-off frequency f_c in hertz.', fi: 'RC-alipäästösuodattimessa R = 850 Ω ja C = 1,0 µF. Laske rajataajuus f_c hertseinä.' },
      fields: [{ id: 'fc', tex: 'f_c', unit: 'Hz' }] }
  ]
});
})();

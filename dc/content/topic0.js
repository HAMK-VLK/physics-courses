/* topic0 = component gallery / authoring template (hidden from the home page; open #/topic/t0).
 * Topic builders: copy patterns from here. Every text is {en, fi}. NO answers in this file:
 * answers live in src/answers/topic0.json. Block ids must be unique and must never be renamed. */
TDC.registerTopic({
  id: 't0', num: 0,
  title: { en: 'Component gallery (template)', fi: 'Komponenttigalleria (malli)' },
  subtitle: { en: 'Every block and question type in one place.', fi: 'Kaikki lohko- ja tehtävätyypit yhdessä paikassa.' },
  objectives: [
    { en: 'see how each block type looks', fi: 'nähdä, miltä kukin lohkotyyppi näyttää' },
    { en: 'test the annotation tools', fi: 'kokeilla merkintätyökaluja' }
  ],
  // Glossary terms and formula-sheet entries contributed by this topic (merged into the tools drawer)
  glossary: {
    resistance: { en: 'resistance', fi: 'resistanssi', sym: 'R', def: { en: 'Opposition to current, unit ohm (Ω).', fi: 'Virran kulkua vastustava ominaisuus, yksikkö ohmi (Ω).' } }
  },
  formulas: [
    { name: { en: "Ohm's law", fi: 'Ohmin laki' }, tex: 'U = R · I' }
  ],
  sections: [
    {
      id: 't0-text', title: { en: 'Text, formulas, callouts', fi: 'Teksti, kaavat, huomiolaatikot' },
      blocks: [
        { id: 't0-text-p1', type: 'text', html: {
          en: '<p>Inline formulas use the <code>&lt;f&gt;</code> tag: <f>U = R·I</f>. Glossary terms use <dfn data-term="resistance">resistance</dfn>.</p>',
          fi: '<p>Rivinsisäiset kaavat merkitään <code>&lt;f&gt;</code>-tagilla: <f>U = R·I</f>. Sanaston termit: <dfn data-term="resistance">resistanssi</dfn>.</p>' } },
        { id: 't0-text-f1', type: 'formula', key: true, tex: 'R = {ρ · l}/{A}', label: { en: 'Resistance of a conductor', fi: 'Johtimen resistanssi' },
          legend: [['ρ', { en: 'resistivity', fi: 'resistiivisyys' }, 'Ωm'], ['l', { en: 'length', fi: 'pituus' }, 'm'], ['A', { en: 'cross-section area', fi: 'poikkipinta-ala' }, 'm²']] },
        { id: 't0-text-c1', type: 'callout', kind: 'key', title: { en: 'Key idea', fi: 'Ydinajatus' }, html: { en: 'Current is the same everywhere in a series circuit.', fi: 'Sarjapiirissä virta on joka kohdassa sama.' } },
        { id: 't0-text-c2', type: 'callout', kind: 'warn', html: { en: 'Never short an ideal voltage source.', fi: 'Älä koskaan oikosulje ideaalista jännitelähdettä.' } },
        { id: 't0-text-l1', type: 'list', items: [{ en: 'first point', fi: 'ensimmäinen kohta' }, { en: 'second point', fi: 'toinen kohta' }] },
        { id: 't0-text-t1', type: 'table', caption: { en: 'Prefixes', fi: 'Etuliitteet' },
          head: [{ en: 'Prefix', fi: 'Etuliite' }, { en: 'Symbol', fi: 'Tunnus' }, { en: 'Factor', fi: 'Kerroin' }],
          rows: [['kilo', 'k', { tex: '10^3' }], ['milli', 'm', { tex: '10^{-3}' }]] },
        { id: 't0-text-d1', type: 'details', summary: { en: 'Show derivation', fi: 'Näytä johto' }, html: { en: '<p>Hidden until opened.</p>', fi: '<p>Piilossa, kunnes avataan.</p>' } }
      ]
    },
    {
      id: 't0-example', title: { en: 'Worked example', fi: 'Ratkaistu esimerkki' },
      blocks: [
        { id: 't0-ex1', type: 'example', title: { en: 'Current through a resistor', fi: 'Vastuksen läpi kulkeva virta' },
          problem: { en: 'A 12 V source feeds a 470 Ω resistor. Find the current.', fi: '12 V:n lähde syöttää 470 Ω:n vastusta. Laske virta.' },
          given: ['U = 12 V', 'R = 470 Ω'],
          steps: [
            { en: "Use Ohm's law solved for the current:", fi: 'Käytä Ohmin lakia virran suhteen ratkaistuna:' },
            { tex: 'I = U / R = 12 V / 470 Ω' },
            { tex: 'I ≈ 25.5 mA' }
          ],
          result: { en: 'I ≈ 25.5 mA', fi: 'I ≈ 25,5 mA' } }
      ]
    },
    {
      id: 't0-circuit', title: { en: 'Interactive circuit', fi: 'Interaktiivinen piiri' },
      blocks: [
        { id: 't0-circ1', type: 'interactive', widget: 'circuit', title: { en: 'Short a resistor with a wire', fi: 'Oikosulje vastus johtimella' },
          caption: { en: 'Choose 〰 and draw a wire from one end of R2 to the other. The current bypasses R2 and the ammeter reading rises.',
                     fi: 'Valitse 〰 ja piirrä johdin R2:n päästä päähän. Virta ohittaa R2:n ja virtamittarin lukema kasvaa.' },
          config: {
            size: [8, 4],
            parts: [
              { id: 'U1', type: 'V', a: [0, 4], b: [0, 0], value: 12, editable: { min: 0, max: 24, step: 0.5 } },
              { id: 'R1', type: 'R', a: [1, 0], b: [4, 0], value: 100, editable: { min: 10, max: 1000 } },
              { id: 'R2', type: 'R', a: [5, 0], b: [8, 0], value: 200, editable: { min: 10, max: 1000 } },
              { id: 'L1', type: 'lamp', a: [8, 1], b: [8, 4], value: 60, rated: 0.3 },
              { id: 'A1', type: 'ammeter', a: [3, 4], b: [5, 4] },
              { id: 'S1', type: 'switch', a: [0, 0], b: [1, 0], closed: true }
            ],
            wires: [[[4, 0], [5, 0]], [[8, 0], [8, 1]], [[8, 4], [5, 4]], [[3, 4], [0, 4]]],
            labels: [{ at: [5, 0], text: 'A' }, { at: [8, 0], text: 'B', dx: 8 }],
            tools: ['wire', 'cut'],
            table: true
          } }
      ]
    },
    {
      id: 't0-viz', title: { en: 'Graph, 3D and canvas', fi: 'Kuvaaja, 3D ja kanvas' },
      blocks: [
        { id: 't0-plot1', type: 'interactive', widget: 'plot', title: { en: 'Power in the load', fi: 'Kuorman teho' },
          config: {
            x: { min: 0, max: 100, label: { en: 'Load resistance R_L', fi: 'Kuormaresistanssi R_L' }, unit: 'Ω' },
            y: { min: 0, max: 1.2, label: { en: 'Power P', fi: 'Teho P' }, unit: 'W', auto: true },
            params: [{ id: 'U', tex: 'U', min: 1, max: 20, value: 10, unit: 'V' }, { id: 'Ri', tex: 'R_i', min: 1, max: 50, value: 20, unit: 'Ω' }],
            curves: [{ fn: function (x, p) { var i = p.U / (p.Ri + x); return i * i * x; }, label: { en: 'P(R_L)', fi: 'P(R_L)' } }],
            vlines: function (p) { return [{ x: p.Ri, label: { en: 'R_L = R_i', fi: 'R_L = R_i' } }]; },
            readouts: function (p) { return [{ tex: 'P_{max}', value: p.U * p.U / (4 * p.Ri), unit: 'W' }]; }
          } },
        { id: 't0-3d1', type: 'interactive', widget: 'three', title: { en: 'Conductor in 3D', fi: 'Johdin 3D:nä' },
          config: {
            height: 300,
            params: [{ id: 'l', tex: 'l', min: 1, max: 6, value: 4, unit: 'm' }, { id: 'r', tex: 'r', min: 0.2, max: 1, value: 0.5, unit: 'mm' }],
            build: function (THREE, scene, api) {
              var mat = new THREE.MeshStandardMaterial({ color: 0xc8742f, metalness: 0.7, roughness: 0.35 });
              var mesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 48), mat);
              mesh.rotation.z = Math.PI / 2; scene.add(mesh);
              return { update: function (p) { mesh.scale.set(p.r, p.l, p.r); }, tick: function (dt) { mesh.rotation.x += dt * 0.3; } };
            }
          } },
        { id: 't0-canvas1', type: 'interactive', widget: 'custom', title: { en: 'Drifting electrons (canvas)', fi: 'Ajautuvat elektronit (kanvas)' },
          config: {
            mount: function (host, ctx) {
              var dots = []; for (var i = 0; i < 60; i++) dots.push({ x: Math.random(), y: Math.random() });
              var c = TDC.viz.canvas(host, { aspect: 0.3, draw: function (g, w, h, t, dt) {
                g.clearRect(0, 0, w, h); g.fillStyle = ctx.color('--c-electron');
                dots.forEach(function (d) { d.x = (d.x + dt * 0.1) % 1; g.beginPath(); g.arc(d.x * w, d.y * h, 3, 0, 7); g.fill(); });
              } });
              return { destroy: c.destroy };
            }
          } }
      ]
    },
    {
      id: 't0-questions', title: { en: 'Question types', fi: 'Tehtävätyypit' },
      blocks: [
        { id: 't0-q-mc', type: 'question', q: 't0-q1' },
        { id: 't0-q-num', type: 'question', q: 't0-q2' },
        { id: 't0-q-fill', type: 'question', q: 't0-q3' },
        { id: 't0-q-order', type: 'question', q: 't0-q4' },
        { id: 't0-q-match', type: 'question', q: 't0-q5' },
        { id: 't0-q-circ', type: 'question', q: 't0-q6' },
        { id: 't0-q-slider', type: 'question', q: 't0-q7' }
      ]
    }
  ],
  questions: [
    { id: 't0-q1', mode: 'practice', type: 'mc',
      prompt: { en: 'What is the unit of resistance?', fi: 'Mikä on resistanssin yksikkö?' },
      options: [{ id: 'a', html: { en: 'volt (V)', fi: 'voltti (V)' } }, { id: 'b', html: { en: 'ohm (Ω)', fi: 'ohmi (Ω)' } }, { id: 'c', html: { en: 'ampere (A)', fi: 'ampeeri (A)' } }],
      hints: [{ en: 'Named after Georg Simon Ohm.', fi: 'Nimetty Georg Simon Ohmin mukaan.' }] },
    { id: 't0-q2', mode: 'practice', type: 'numeric', tol: 0.02,
      prompt: { en: 'A 9 V battery drives 30 mA through a resistor. Find R.', fi: '9 V:n paristo syöttää vastuksen läpi 30 mA:n virran. Laske R.' },
      fields: [{ id: 'R', tex: 'R', unit: 'Ω' }] },
    { id: 't0-q3', mode: 'practice', type: 'fill',
      prompt: { en: 'Fill in the blanks.', fi: 'Täydennä aukot.' },
      text: { en: 'Voltage is measured in [[a]] and a 2 A current for 3 s moves [[b]] C of charge.', fi: 'Jännitteen yksikkö on [[a]], ja 2 A:n virta 3 s:n ajan siirtää [[b]] C varausta.' },
      fields: [{ id: 'a', kind: 'text' }, { id: 'b', kind: 'num' }] },
    { id: 't0-q4', mode: 'practice', type: 'order',
      prompt: { en: 'Order from smallest to largest.', fi: 'Järjestä pienimmästä suurimpaan.' },
      items: [{ id: 'm', html: { en: '1 mA', fi: '1 mA' } }, { id: 'u', html: { en: '1 µA', fi: '1 µA' } }, { id: 'a', html: { en: '1 A', fi: '1 A' } }] },
    { id: 't0-q5', mode: 'graded', type: 'match', points: 2,
      prompt: { en: 'Match each quantity with its unit.', fi: 'Yhdistä suure ja yksikkö.' },
      left: [{ id: 'U', html: { en: 'voltage', fi: 'jännite' } }, { id: 'I', html: { en: 'current', fi: 'virta' } }],
      right: [{ id: 'V', html: { en: 'V', fi: 'V' } }, { id: 'A', html: { en: 'A', fi: 'A' } }, { id: 'W', html: { en: 'W', fi: 'W' } }] },
    { id: 't0-q6', mode: 'graded', type: 'circuit', points: 2,
      prompt: { en: 'Using the 〰 tool, add ONE wire so that the ammeter shows the largest possible current without shorting the source.',
                fi: 'Lisää 〰-työkalulla YKSI johdin niin, että virtamittari näyttää suurimman mahdollisen virran oikosulkematta lähdettä.' },
      widget: { name: 'circuit', config: {
        size: [6, 3],
        parts: [
          { id: 'U1', type: 'V', a: [0, 3], b: [0, 0], value: 10 },
          { id: 'R1', type: 'R', a: [0, 0], b: [3, 0], value: 100 },
          { id: 'R2', type: 'R', a: [3, 0], b: [6, 0], value: 100 },
          { id: 'R3', type: 'R', a: [6, 0], b: [6, 3], value: 100 },
          { id: 'A1', type: 'ammeter', a: [6, 3], b: [3, 3] }
        ],
        wires: [[[3, 3], [0, 3]]],
        tools: ['wire', 'cut'],
        answer: { kind: 'I', part: 'A1' }
      } } },
    { id: 't0-q7', mode: 'practice', type: 'slider',
      prompt: { en: 'Adjust R_L until the load receives maximum power.', fi: 'Säädä R_L niin, että kuorma saa suurimman tehon.' },
      tol: 0.05,
      widget: { name: 'plot', config: {
        x: { min: 0, max: 100, label: { en: 'R_L', fi: 'R_L' }, unit: 'Ω' }, y: { min: 0, max: 1.5, label: { en: 'P', fi: 'P' }, unit: 'W' },
        params: [{ id: 'RL', tex: 'R_L', min: 1, max: 100, value: 70, unit: 'Ω' }],
        curves: [{ fn: function (x) { var i = 10 / (25 + x); return i * i * x; } }],
        points: function (p) { var i = 10 / (25 + p.RL); return [{ x: p.RL, y: i * i * p.RL }]; },
        answer: function (p) { return { v: p.RL }; }
      } } }
  ]
});

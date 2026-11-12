/* Topic registry (home page cards + order). To add a topic: append an entry here, create
 * content/topicN.js (TDC.registerTopic) + src/answers/topicN.json, and add a <script> tag in index.html.
 * Numbering continues the DC course (EE1–EE5), so the AC topics are 6–10 like the source PDFs EE6–EE10. */
(function () {
  var S = 'fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"';
  TDC.topicList = [
    { id: 't6', num: 6, color: 'var(--t1)',
      title: { en: 'Capacitance and capacitors', fi: 'Kapasitanssi ja kondensaattorit' },
      summary: { en: 'Storing charge in an electric field: the plate capacitor, dielectrics, capacitor types, connections, energy and RC charging.', fi: 'Varauksen varastointi sähkökenttään: levy\u00ADkondensaattori, eristeet, kondensaattorityypit, kytkennät, energia ja RC-piirin varautuminen.' },
      icon: '<svg viewBox="0 0 64 64"><path ' + S + ' d="M4 32h22M38 32h22M26 14v36M38 14v36"/><path ' + S + ' d="M16 22h6M19 19v6M42 22h6" opacity=".55"/></svg>' },
    { id: 't7', num: 7, color: 'var(--t2)',
      title: { en: 'Coils and inductance', fi: 'Kelat ja induktanssi' },
      summary: { en: 'Storing energy in a magnetic field: self-inductance, the solenoid, series and parallel inductors and the RL time constant.', fi: 'Energian varastointi magneettikenttään: itseinduktanssi, solenoidi, kelojen sarjaan- ja rinnankytkentä sekä RL-piirin aikavakio.' },
      icon: '<svg viewBox="0 0 64 64"><path ' + S + ' d="M4 40h8c0-14 10-14 10 0 0-14 10-14 10 0 0-14 10-14 10 0 0-14 10-14 10 0h8"/><path ' + S + ' d="M10 50h44" opacity=".55"/></svg>' },
    { id: 't8', num: 8, color: 'var(--t3)',
      title: { en: 'Magnetism and AC production', fi: 'Magnetismi ja vaihtosähkön tuottaminen' },
      summary: { en: 'Magnetic fields of currents, forces on wires, Faraday’s and Lenz’s laws, generators, transformers and power transmission.', fi: 'Virran magneettikenttä, johtimeen kohdistuva voima, Faradayn ja Lenzin lait, generaattorit, muuntajat ja sähkönsiirto.' },
      icon: '<svg viewBox="0 0 64 64"><circle ' + S + ' cx="32" cy="32" r="24"/><path ' + S + ' d="M14 32c4-12 8-12 12 0s8 12 12 0 8-12 12 0"/><path ' + S + ' d="M32 8v6M32 50v6" opacity=".55"/></svg>' },
    { id: 't9', num: 9, color: 'var(--t4)',
      title: { en: 'AC quantities and series circuits', fi: 'Vaihto\u00ADsähkö\u00ADsuureet ja sarjapiirit' },
      summary: { en: 'Sine waves, frequency, phasors and complex numbers, RMS values, reactance and impedance of series RL, RC and RLC circuits, power and resonance.', fi: 'Siniaallot, taajuus, osoittimet ja kompleksiluvut, tehollisarvot, reaktanssi ja impedanssi RL-, RC- ja RLC-sarjapiireissä, teho ja resonanssi.' },
      icon: '<svg viewBox="0 0 64 64"><path ' + S + ' d="M6 32h52M14 32V12"/><path ' + S + ' d="M14 32l26-14" /><path ' + S + ' d="M40 18l-1 6M40 18l-6 0" opacity=".7"/><path ' + S + ' d="M6 46c6-10 12-10 18 0s12 10 18 0 12-10 18 0" opacity=".55"/></svg>' },
    { id: 't10', num: 10, color: 'var(--t5)',
      title: { en: 'Parallel AC circuits', fi: 'Rinnakkaiset vaihtosähköpiirit' },
      summary: { en: 'Admittance, conductance and susceptance; parallel RC, RL and RLC circuits with current phasors, parallel resonance and power factor correction.', fi: 'Admittanssi, konduktanssi ja suskeptanssi; RC-, RL- ja RLC-rinnankytkennät virtaosoittimin, rinnakkaisresonanssi ja tehokertoimen parantaminen.' },
      icon: '<svg viewBox="0 0 64 64"><path ' + S + ' d="M8 12h48M8 52h48M20 12v12M20 40v12M44 12v14M44 38v14"/><rect ' + S + ' x="15" y="24" width="10" height="16" rx="1"/><path ' + S + ' d="M36 26h16M36 38h16"/></svg>' }
  ];
})();

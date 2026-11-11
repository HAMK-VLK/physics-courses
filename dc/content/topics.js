/* Topic registry (home page cards + order). To add a topic: append an entry here, create
 * content/topicN.js (TDC.registerTopic) + src/answers/topicN.json, and add a <script> tag in index.html. */
(function () {
  var S = 'fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"';
  TDC.topicList = [
    { id: 't1', num: 1, color: 'var(--t1)',
      title: { en: 'Introduction to electricity', fi: 'Johdanto sähköön' },
      summary: { en: 'Charge, current, voltage, units and standards, electric fields, energy and power: the building blocks.', fi: 'Varaus, virta, jännite, suureet ja standardit, sähkökenttä, energia ja teho: perusrakennuspalikat.' },
      icon: '<svg viewBox="0 0 64 64"><path ' + S + ' d="M36 4 14 36h16l-4 24 24-34H34z"/></svg>' },
    { id: 't2', num: 2, color: 'var(--t2)',
      title: { en: "Ohm's law and resistors", fi: 'Ohmin laki ja vastukset' },
      summary: { en: 'Resistance and resistivity, temperature effects, colour codes, series and parallel connections, voltage and current dividers.', fi: 'Resistanssi ja resistiivisyys, lämpötilan vaikutus, värikoodit, sarjaan- ja rinnankytkentä, jännitteen- ja virranjakajat.' },
      icon: '<svg viewBox="0 0 64 64"><path ' + S + ' d="M4 32h12M48 32h12"/><rect ' + S + ' x="16" y="22" width="32" height="20" rx="2"/><path ' + S + ' d="M24 22v20M31 22v20M38 22v20" opacity=".55"/></svg>' },
    { id: 't3', num: 3, color: 'var(--t3)',
      title: { en: "Kirchhoff's laws and DC circuits", fi: 'Kirchhoffin lait ja tasavirtapiirit' },
      summary: { en: 'Sources and batteries, the current and voltage laws, solving networks with equations, matrices and superposition.', fi: 'Lähteet ja paristot, virta- ja jännitelaki, verkkojen ratkaiseminen yhtälöillä, matriiseilla ja superpositiolla.' },
      icon: '<svg viewBox="0 0 64 64"><circle ' + S + ' cx="32" cy="32" r="5"/><path ' + S + ' d="M32 4v23M32 37v23M4 32h23M37 32h23"/><path ' + S + ' d="M26 12l6-7 6 7M52 26l7 6-7 6M12 38l-7-6 7-6"/></svg>' },
    { id: 't4', num: 4, color: 'var(--t4)',
      title: { en: 'Thévenin and Norton equivalents', fi: 'Théveninin ja Nortonin ekvivalentit' },
      summary: { en: 'Replace any linear network by one source and one resistor; source transformations and maximum power transfer.', fi: 'Korvaa mikä tahansa lineaarinen verkko yhdellä lähteellä ja vastuksella; lähdemuunnokset ja maksimitehon siirto.' },
      icon: '<svg viewBox="0 0 64 64"><rect ' + S + ' x="4" y="14" width="22" height="36" rx="3"/><path ' + S + ' d="M26 32h6M42 24v16M32 32h4M52 32h8"/><circle ' + S + ' cx="42" cy="32" r="8"/><path ' + S + ' d="M11 26h8M11 38h8M15 22v8" opacity=".6"/></svg>' },
    { id: 't5', num: 5, color: 'var(--t5)',
      title: { en: 'Loop (mesh) current method', fi: 'Silmukkavirtamenetelmä' },
      summary: { en: 'Systematic analysis with loop currents: writing the equations, the resistance matrix and solving larger networks.', fi: 'Järjestelmällinen analyysi silmukkavirroilla: yhtälöiden kirjoittaminen, resistanssimatriisi ja suurempien verkkojen ratkaisu.' },
      icon: '<svg viewBox="0 0 64 64"><rect ' + S + ' x="6" y="12" width="52" height="40" rx="2"/><path ' + S + ' d="M32 12v40"/><path ' + S + ' d="M14 26a8 8 0 1 1 3 10M50 38a8 8 0 1 1-3-10"/><path ' + S + ' d="M14 22v5h5M50 42v-5h-5"/></svg>' }
  ];
})();

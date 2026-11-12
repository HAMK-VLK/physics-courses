/* Topic registry (home page cards + order). To add a topic: append an entry here, create
 * content/topicN.js (TDC.registerTopic) + src/answers/topicN.json, and add a <script> tag in index.html. */
(function () {
  var S = 'fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"';
  TDC.topicList = [
    { id: 't1', num: 1, color: 'var(--t1)',
      title: { en: 'Fluid statics', fi: 'Nesteiden statiikka' },
      summary: { en: 'Density and pressure, gauges and sensors, hydrostatic pressure, buoyancy and Archimedes, hydraulic lifts and brakes.', fi: 'Tiheys ja paine, painemittarit ja -anturit, hydrostaattinen paine, noste ja Arkhimedeen laki, hydrauliset nostimet ja jarrut.' },
      icon: '<svg viewBox="0 0 64 64"><path ' + S + ' d="M4 18c5-4 9-4 14 0s9 4 14 0 9-4 14 0 9 4 14 0"/><path ' + S + ' d="M14 40h30a8 6 0 0 1 0 12H14a8 6 0 0 1 0-12z"/><path ' + S + ' d="M28 40v-6h8v6M52 46h8"/><path ' + S + ' d="M8 26v28M5 50l3 4 3-4" opacity=".55"/></svg>' },
    { id: 't2', num: 2, color: 'var(--t2)',
      title: { en: 'Fluid dynamics', fi: 'Virtausoppi' },
      summary: { en: 'Flow rate and continuity, Bernoulli’s equation, Venturi and Pitot meters, outflow, pumps, viscosity, Reynolds number and pipe losses.', fi: 'Tilavuusvirta ja jatkuvuusyhtälö, Bernoullin yhtälö, venturi- ja pitot-mittarit, ulosvirtaus, pumput, viskositeetti, Reynoldsin luku ja putkihäviöt.' },
      icon: '<svg viewBox="0 0 64 64"><path ' + S + ' d="M4 16h14l12 10h4l12-10h14M4 48h14l12-10h4l12 10h14"/><path ' + S + ' d="M8 32h48M50 27l6 5-6 5" opacity=".6"/></svg>' },
    { id: 't3', num: 3, color: 'var(--t3)',
      title: { en: 'Temperature and thermal expansion', fi: 'Lämpötila ja lämpölaajeneminen' },
      summary: { en: 'Temperature scales and the zeroth law, linear, area and volume expansion, the anomaly of water and thermal stress.', fi: 'Lämpötila-asteikot ja termodynamiikan nollas pääsääntö, pituus-, pinta-ala- ja tilavuuslaajeneminen, veden poikkeuksellinen käyttäytyminen ja lämpöjännitys.' },
      icon: '<svg viewBox="0 0 64 64"><path ' + S + ' d="M26 38V10a6 6 0 0 1 12 0v28a11 11 0 1 1-12 0z"/><circle ' + S + ' cx="32" cy="47" r="4"/><path ' + S + ' d="M32 43V20M44 14h8M44 22h6M44 30h8" opacity=".6"/></svg>' },
    { id: 't4', num: 4, color: 'var(--t4)',
      title: { en: 'Ideal gas and kinetic theory', fi: 'Ideaalikaasu ja kineettinen kaasuteoria' },
      summary: { en: 'Gas laws and pV = nRT, the mole and molar mass, absolute zero, partial pressures, molecular speeds and the Maxwell distribution.', fi: 'Kaasujen tilanyhtälöt ja pV = nRT, mooli ja moolimassa, absoluuttinen nollapiste, osapaineet, molekyylien nopeudet ja Maxwellin jakauma.' },
      icon: '<svg viewBox="0 0 64 64"><path ' + S + ' d="M12 8v48h40V8"/><path ' + S + ' d="M12 24h40M32 24V4"/><circle ' + S + ' cx="22" cy="36" r="2.5"/><circle ' + S + ' cx="38" cy="32" r="2.5"/><circle ' + S + ' cx="30" cy="46" r="2.5"/><circle ' + S + ' cx="44" cy="46" r="2.5"/><path ' + S + ' d="M25 34l6-3M33 47l7-1" opacity=".55"/></svg>' },
    { id: 't5', num: 5, color: 'var(--t5)',
      title: { en: 'Phases, vapour pressure and humidity', fi: 'Olomuodot, höyrynpaine ja kosteus' },
      summary: { en: 'Phase diagrams, critical and triple points, saturated vapour pressure, boiling point, absolute and relative humidity, dew point.', fi: 'Olomuotopiirrokset, kriittinen piste ja kolmoispiste, kylläisen höyryn paine, kiehumispiste, absoluuttinen ja suhteellinen kosteus, kastepiste.' },
      icon: '<svg viewBox="0 0 64 64"><path ' + S + ' d="M8 56C20 50 28 34 32 8"/><path ' + S + ' d="M32 30c8 4 16 8 26 10M32 30c-2 10-4 18-6 26"/><circle ' + S + ' cx="32" cy="30" r="3"/><path ' + S + ' d="M50 12c-3 4-5 7-5 9a5 5 0 0 0 10 0c0-2-2-5-5-9z" opacity=".6"/></svg>' },
    { id: 't6', num: 6, color: 'var(--t6)',
      title: { en: 'Heat and latent heat', fi: 'Lämpö ja olomuodon muutokset' },
      summary: { en: 'Heat and its unit, heat capacity and specific heat, calorimetry, heating at constant volume or pressure, heats of fusion and vaporisation.', fi: 'Lämpö ja sen yksikkö, lämpökapasiteetti ja ominaislämpökapasiteetti, kalorimetria, lämmitys vakiotilavuudessa tai -paineessa, sulamis- ja höyrystymislämpö.' },
      icon: '<svg viewBox="0 0 64 64"><path ' + S + ' d="M14 22h36v26a8 8 0 0 1-8 8H22a8 8 0 0 1-8-8z"/><path ' + S + ' d="M14 34h36" opacity=".55"/><path ' + S + ' d="M24 14c-3-4 3-6 0-10M32 14c-3-4 3-6 0-10M40 14c-3-4 3-6 0-10"/></svg>' },
    { id: 't7', num: 7, color: 'var(--t7)',
      title: { en: 'Heat transfer', fi: 'Lämmönsiirto' },
      summary: { en: 'Conduction, convection and radiation: thermal conductivity, U-values of walls and windows, black bodies, Wien’s and Stefan–Boltzmann laws.', fi: 'Johtuminen, konvektio ja säteily: lämmönjohtavuus, seinien ja ikkunoiden U-arvot, musta kappale, Wienin ja Stefanin–Boltzmannin lait.' },
      icon: '<svg viewBox="0 0 64 64"><path ' + S + ' d="M28 6v52M36 6v52"/><path ' + S + ' d="M4 20h18M16 14l6 6-6 6M42 32h18M54 26l6 6-6 6M4 44c3-3 6 3 9 0s6 3 9 0" opacity=".7"/></svg>' }
  ];
})();

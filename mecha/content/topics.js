/* Topic registry (home page cards + order). To add a topic: append an entry here, create
 * content/topicN.js (TDC.registerTopic) + src/answers/topicN.json, and add a <script> tag in index.html. */
(function () {
  var S = 'fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"';
  TDC.topicList = [
    { id: 't1', num: 1, color: 'var(--t1)',
      title: { en: 'SI system and significant figures', fi: 'SI-järjestelmä ja merkitsevät numerot' },
      summary: { en: 'Units, prefixes, dimensions, significant figures and vectors: the language of every calculation.', fi: 'Yksiköt, etuliitteet, dimensiot, merkitsevät numerot ja vektorit: jokaisen laskun kieli.' },
      icon: '<svg viewBox="0 0 64 64"><path ' + S + ' d="M6 44h52M6 44v-8M16 44v-5M26 44v-8M36 44v-5M46 44v-8M56 44v-5"/><path ' + S + ' d="M14 24l36-12M44 10l6 2-2 6"/></svg>' },
    { id: 't2', num: 2, color: 'var(--t2)',
      title: { en: 'Kinematics', fi: 'Kinematiikka' },
      summary: { en: 'Position, velocity and acceleration; reading x-t, v-t and a-t graphs; uniform acceleration and free fall.', fi: 'Paikka, nopeus ja kiihtyvyys; x-t-, v-t- ja a-t-kuvaajien lukeminen; tasainen kiihtyvyys ja vapaa pudotus.' },
      icon: '<svg viewBox="0 0 64 64"><path ' + S + ' d="M6 54V8M6 54h52"/><path ' + S + ' d="M10 50c12 0 18-8 24-20s12-18 20-20"/><circle ' + S + ' cx="34" cy="30" r="3.5"/></svg>' },
    { id: 't3', num: 3, color: 'var(--t3)',
      title: { en: 'Force', fi: 'Voima' },
      summary: { en: "Newton's laws, free-body diagrams, friction, inclines, equilibrium and torque balance.", fi: 'Newtonin lait, vapaakappalekuviot, kitka, kaltevat tasot, tasapaino ja momenttitasapaino.' },
      icon: '<svg viewBox="0 0 64 64"><path ' + S + ' d="M6 52h52"/><rect ' + S + ' x="22" y="30" width="20" height="18" rx="2"/><path ' + S + ' d="M32 39v-30M26 15l6-6 6 6M42 39h16M52 33l6 6-6 6"/></svg>' },
    { id: 't4', num: 4, color: 'var(--t4)',
      title: { en: 'Work, power and energy', fi: 'Työ, teho ja energia' },
      summary: { en: 'Work of a force, kinetic and potential energy, conservation of energy, friction losses, power and efficiency.', fi: 'Voiman työ, liike- ja potentiaalienergia, energian säilyminen, kitkahäviöt, teho ja hyötysuhde.' },
      icon: '<svg viewBox="0 0 64 64"><path ' + S + ' d="M6 20c14 0 18 32 52 32"/><circle ' + S + ' cx="16" cy="19" r="5"/><path ' + S + ' d="M30 8v14M38 12v10M46 16v6" opacity=".6"/></svg>' },
    { id: 't5', num: 5, color: 'var(--t5)',
      title: { en: 'Momentum and impulse', fi: 'Liikemäärä ja impulssi' },
      summary: { en: 'Momentum, impulse as area under F(t), collisions (elastic and inelastic) and recoil in one and two dimensions.', fi: 'Liikemäärä, impulssi F(t)-kuvaajan alana, törmäykset (kimmoisa ja kimmoton) ja rekyyli yhdessä ja kahdessa ulottuvuudessa.' },
      icon: '<svg viewBox="0 0 64 64"><circle ' + S + ' cx="16" cy="32" r="9"/><circle ' + S + ' cx="48" cy="32" r="9"/><path ' + S + ' d="M2 52h20M16 46l6 6M30 32h4"/></svg>' },
    { id: 't6', num: 6, color: 'var(--t6)',
      title: { en: 'Rotation', fi: 'Pyörimisliike' },
      summary: { en: 'Angular velocity and acceleration, moment of inertia, torque, rolling, and conservation of angular momentum.', fi: 'Kulmanopeus ja -kiihtyvyys, hitausmomentti, vääntömomentti, vierimisliike ja liikemäärämomentin säilyminen.' },
      icon: '<svg viewBox="0 0 64 64"><circle ' + S + ' cx="32" cy="32" r="22"/><circle ' + S + ' cx="32" cy="32" r="3"/><path ' + S + ' d="M32 32 50 22M54 8a26 26 0 0 1 4 12M58 20l-6 0"/></svg>' }
  ];
})();

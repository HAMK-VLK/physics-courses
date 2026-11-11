/* Topic 8: Magnetism and AC production. Source: EE8 ACCurrentProduction.pdf. NO answers in this file (see src/answers/topic8.json). */
(function () {
  var MU0 = 4 * Math.PI * 1e-7;
  var RAD = Math.PI / 180;
  // Faraday / Lenz canvas: drag the slider, the galvanometer reacts to the SPEED of the change.
  function faradayMount(host, ctx) {
    var panel = TDC.viz.params([{ id: 'pos', label: { en: 'Magnet position (far to near)', fi: 'Magneetin paikka (kaukana – lähellä)' }, min: 0, max: 1, step: 0.01, value: 0 }], function () {}, ctx);
    var flux = function (pos) { var d = (1 - pos) * 3; return 1 / Math.pow(1 + d * d, 1.5); };
    var last = flux(0), needle = 0, e = 0;
    var cv = TDC.viz.canvas(host, { aspect: 0.5, draw: function (g, w, h, t, dt) {
      var pos = panel.values.pos, ph = flux(pos);
      dt = Math.max(dt || 0.016, 0.008);
      e = -(ph - last) / dt * 0.25; last = ph;
      needle += (Math.max(-1, Math.min(1, e)) - needle) * Math.min(1, dt * 10);
      g.clearRect(0, 0, w, h);
      var cx = w * 0.32, cy = h * 0.28, fg = ctx.color('--fg'), muted = ctx.color('--muted');
      // magnet (N up)
      var my = cy + h * 0.08 + (1 - pos) * h * 0.26, mw = w * 0.07, mh = h * 0.1;   // whole magnet stays inside the canvas
      g.fillStyle = ctx.color('--c-1'); g.fillRect(cx - mw / 2, my, mw, mh);
      g.fillStyle = ctx.color('--c-2'); g.fillRect(cx - mw / 2, my + mh, mw, mh);
      g.fillStyle = '#fff'; g.font = 'bold ' + Math.max(11, Math.round(h * 0.06)) + 'px sans-serif'; g.textAlign = 'center';
      g.fillText('N', cx, my + mh * 0.75); g.fillText('S', cx, my + mh * 1.75);
      // coil (edge-on ellipse, three turns)
      g.strokeStyle = ctx.color('--c-wire'); g.lineWidth = 3;
      for (var k = 0; k < 3; k++) { g.beginPath(); g.ellipse(cx, cy + k * 5, w * 0.12, h * 0.035, 0, 0, 7); g.stroke(); }
      // induced field arrow in the coil
      var dir = Math.abs(needle) < 0.05 ? 0 : (needle > 0 ? -1 : 1); // needle>0: flux increasing, B_ind points down
      if (dir) {
        g.strokeStyle = ctx.color('--c-flow'); g.fillStyle = ctx.color('--c-flow'); g.lineWidth = 3;
        var y0 = cy - dir * h * 0.07, y1 = cy + dir * h * 0.07 + 2;
        g.beginPath(); g.moveTo(cx, y0); g.lineTo(cx, y1); g.stroke();
        g.beginPath(); g.moveTo(cx, y1 + dir * 7); g.lineTo(cx - 6, y1 - dir * 3); g.lineTo(cx + 6, y1 - dir * 3); g.fill();
        g.textAlign = 'left'; g.font = Math.max(12, Math.round(h * 0.05)) + 'px sans-serif'; g.fillText('B_ind', cx + 10, cy + h * 0.1 * -dir * 0 - h * 0.1);
      }
      // galvanometer
      var gx = w * 0.74, gy = h * 0.5, gr = w * 0.17;
      g.strokeStyle = fg; g.lineWidth = 2; g.beginPath(); g.arc(gx, gy, gr, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
      g.strokeStyle = ctx.color('--c-2'); g.lineWidth = 3; g.beginPath(); g.moveTo(gx, gy);
      var a = -Math.PI / 2 + needle * 0.9; g.lineTo(gx + Math.cos(a) * gr * 0.95, gy + Math.sin(a) * gr * 0.95); g.stroke();
      g.fillStyle = muted; g.textAlign = 'center'; g.font = Math.max(12, Math.round(h * 0.05)) + 'px sans-serif';
      g.fillText('- 0 +', gx, gy + h * 0.1);
      var msg = dir === -1 ? { en: 'Flux increasing: B_ind points down, current clockwise (seen from above)', fi: 'Vuo kasvaa: B_ind osoittaa alas, virta myötäpäivään (ylhäältä katsoen)' }
        : dir === 1 ? { en: 'Flux decreasing: B_ind points up, current counter-clockwise (seen from above)', fi: 'Vuo pienenee: B_ind osoittaa ylös, virta vastapäivään (ylhäältä katsoen)' }
        : { en: 'Flux not changing: no emf, I = 0', fi: 'Vuo ei muutu: ei lähdejännitettä, I = 0' };
      var key = dir + TDC.i18n.lang;   // status as page text (readable on phones), rewritten only when it changes
      if (note.dataset.k !== key) { note.dataset.k = key; note.textContent = ctx.tx(msg); }
    } });
    var note = ctx.el('p', { class: 'muted', 'aria-live': 'polite' });
    host.insertBefore(panel, host.firstChild); host.appendChild(note);
    return { destroy: cv.destroy };
  }

  TDC.registerTopic({
    id: 't8', num: 8,
    title: { en: 'Magnetism and AC production', fi: 'Magnetismi ja vaihtosähkön tuotanto' },
    subtitle: { en: 'From the field of a wire to generators, transformers and the power grid.', fi: 'Johtimen kentästä generaattoreihin, muuntajiin ja sähköverkkoon.' },
    objectives: [
      { en: 'calculate the magnetic field of a straight wire and a circular loop and use the right-hand rule', fi: 'laskea suoran johtimen ja ympyräsilmukan magneettikenttä ja käyttää oikean käden sääntöä' },
      { en: 'calculate the force on a current-carrying wire in a magnetic field', fi: 'laskea magneettikentässä olevaan virtajohtimeen kohdistuva voima' },
      { en: 'explain magnetic flux, Faraday\'s law and Lenz\'s law and find the direction of an induced current', fi: 'selittää magneettivuo, Faradayn ja Lenzin lait sekä määrittää indusoituneen virran suunta' },
      { en: 'derive and use the emf of an ac generator, e = N·B·A·ω·sin ωt, and explain back emf and counter torque', fi: 'johtaa ja käyttää vaihtovirtageneraattorin lähdejännitteen kaavaa e = N·B·A·ω·sin ωt sekä selittää vastajännite ja vastamomentti' },
      { en: 'use transformer ratios and explain why power is transmitted at high voltage', fi: 'käyttää muuntosuhteita ja selittää, miksi sähkö siirretään korkealla jännitteellä' },
      { en: 'calculate mutual and self-inductance and the energy stored in a magnetic field', fi: 'laskea keskinäis- ja itseisinduktanssi sekä magneettikenttään varastoitunut energia' }
    ],
    glossary: {
      magfield: { en: 'magnetic field', fi: 'magneettikenttä', sym: 'B', def: { en: 'Region where moving charges and currents feel a force. Unit tesla (T).', fi: 'Alue, jossa liikkuviin varauksiin ja virtoihin kohdistuu voima. Yksikkö tesla (T).' } },
      fluxdensity: { en: 'magnetic flux density', fi: 'magneettivuon tiheys', sym: 'B', def: { en: 'Flux per unit area, B = Φ/A. Unit T = Vs/m².', fi: 'Vuo pinta-alaa kohti, B = Φ/A. Yksikkö T = Vs/m².' } },
      fieldstrength: { en: 'magnetic field strength', fi: 'magneettikentän voimakkuus', sym: 'H', def: { en: 'Field quantity independent of the medium, H = B/μ. Unit A/m.', fi: 'Aineesta riippumaton kenttäsuure, H = B/μ. Yksikkö A/m.' } },
      flux: { en: 'magnetic flux', fi: 'magneettivuo', sym: 'Φ', def: { en: 'Φ = B·A·cos θ through a loop. Unit weber (Wb = Vs).', fi: 'Silmukan läpi kulkeva Φ = B·A·cos θ. Yksikkö weber (Wb = Vs).' } },
      permeability: { en: 'permeability', fi: 'permeabiliteetti', sym: 'μ', def: { en: 'How well a material supports a magnetic field; μ = μ₀·μ_r.', fi: 'Aineen kyky johtaa magneettikenttää; μ = μ₀·μ_r.' } },
      relperm: { en: 'relative permeability', fi: 'suhteellinen permeabiliteetti', sym: 'μ_r', def: { en: 'Ratio μ/μ₀ of a material.', fi: 'Aineen permeabiliteetin ja tyhjiön permeabiliteetin suhde μ/μ₀.' } },
      ampere: { en: "Ampère's law", fi: 'Ampèren laki (kiertolaki)', def: { en: 'The line integral of H around a closed path equals the enclosed current.', fi: 'H:n viivaintegraali suljetun polun ympäri on yhtä suuri kuin polun sisään jäävä virta.' } },
      righthand: { en: 'right-hand rule', fi: 'oikean käden sääntö', def: { en: 'Thumb along the current, fingers show the direction of B.', fi: 'Peukalo virran suuntaan, sormet osoittavat B:n suunnan.' } },
      solenoid: { en: 'solenoid', fi: 'solenoidi, lieriökela', def: { en: 'Long tightly wound coil with a nearly uniform field inside.', fi: 'Pitkä tiiviisti kierretty kela, jonka sisällä kenttä on lähes tasainen.' } },
      induction: { en: 'electromagnetic induction', fi: 'sähkömagneettinen induktio', def: { en: 'A changing flux induces an emf.', fi: 'Muuttuva vuo indusoi lähdejännitteen.' } },
      faraday: { en: "Faraday's law", fi: 'Faradayn induktiolaki', sym: 'e = −N·dΦ/dt', def: { en: 'The induced emf is the negative rate of change of flux.', fi: 'Indusoitunut lähdejännite on vuon muutosnopeuden vastaluku.' } },
      lenz: { en: "Lenz's law", fi: 'Lenzin laki', def: { en: 'The induced current opposes the change of flux.', fi: 'Indusoitunut virta vastustaa vuon muutosta.' } },
      backemf: { en: 'back emf (counter emf)', fi: 'vastasähkömotorinen voima, vastajännite', def: { en: 'Emf induced in a rotating armature that opposes the supply.', fi: 'Pyörivään ankkuriin indusoituva jännite, joka vastustaa syöttöä.' } },
      countertorque: { en: 'counter torque', fi: 'vastamomentti', def: { en: 'Torque on a loaded generator armature opposing the rotation.', fi: 'Kuormitetun generaattorin ankkuriin kohdistuva pyörimistä vastustava momentti.' } },
      armature: { en: 'armature', fi: 'roottori, ankkuri', def: { en: 'The rotating coil of a generator or motor.', fi: 'Generaattorin tai moottorin pyörivä käämi.' } },
      slipring: { en: 'slip ring', fi: 'liukurengas', def: { en: 'Ring on the axle that carries current out through a brush.', fi: 'Akselilla oleva rengas, josta virta johdetaan harjalle.' } },
      brush: { en: 'brush', fi: 'harja', def: { en: 'Fixed contact that rubs on a slip ring or commutator.', fi: 'Liukurenkaaseen tai kommutaattoriin nojaava kiinteä kosketin.' } },
      commutator: { en: 'commutator', fi: 'kommutaattori', def: { en: 'Split ring that makes the output of a dc generator one-directional.', fi: 'Jaettu rengas, joka tekee tasavirtageneraattorin lähdöstä yksisuuntaisen.' } },
      generator: { en: 'generator', fi: 'generaattori', def: { en: 'Converts mechanical energy to electrical energy.', fi: 'Muuttaa mekaanisen energian sähköenergiaksi.' } },
      alternator: { en: 'alternator', fi: 'vaihtovirtageneraattori', def: { en: 'Ac generator with a rotating electromagnet (rotor) and fixed output coils (stator).', fi: 'Vaihtovirtageneraattori, jossa pyörii sähkömagneetti (roottori) ja ulostulokäämit ovat staattorissa.' } },
      rotor: { en: 'rotor / stator', fi: 'roottori / staattori', def: { en: 'Rotating and stationary part of a machine.', fi: 'Koneen pyörivä ja paikallaan pysyvä osa.' } },
      transformer: { en: 'transformer', fi: 'muuntaja', def: { en: 'Changes an ac voltage using two coils on a common core.', fi: 'Muuttaa vaihtojännitteen suuruutta kahdella yhteisellä sydämellä olevalla käämillä.' } },
      primary: { en: 'primary / secondary coil', fi: 'ensiökäämi / toisiokäämi', def: { en: 'Input coil and output coil of a transformer.', fi: 'Muuntajan tulo- ja lähtökäämi.' } },
      turnsratio: { en: 'turns ratio', fi: 'muuntosuhde', sym: 'N_S/N_P', def: { en: 'Ratio of the numbers of turns; equals the voltage ratio.', fi: 'Kierroslukujen suhde; yhtä suuri kuin jännitesuhde.' } },
      stepupdown: { en: 'step-up / step-down', fi: 'jännitettä nostava / laskeva', def: { en: 'Transformer with N_S > N_P or N_S < N_P.', fi: 'Muuntaja, jolla N_S > N_P tai N_S < N_P.' } },
      laminated: { en: 'laminated core', fi: 'kerroksinen (lamelloitu) rautasydän', def: { en: 'Core of insulated iron sheets that reduces eddy currents.', fi: 'Eristetyistä rautalevyistä koottu sydän, joka vähentää pyörrevirtoja.' } },
      eddy: { en: 'eddy current', fi: 'pyörrevirta', def: { en: 'Circulating currents induced in a conducting core.', fi: 'Johtavaan sydämeen indusoituvat kiertävät virrat.' } },
      transline: { en: 'transmission line', fi: 'siirtojohto', def: { en: 'High-voltage line that carries power over long distances.', fi: 'Suurjännitejohto, joka siirtää tehoa pitkiä matkoja.' } },
      powerloss: { en: 'power loss', fi: 'tehohäviö', sym: 'P_L = R·I²', def: { en: 'Power dissipated as heat in the line resistance.', fi: 'Johdon resistanssissa lämmöksi muuttuva teho.' } },
      gfci: { en: 'ground fault circuit interrupter (GFCI)', fi: 'vikavirtasuojakytkin', def: { en: 'Device that trips when hot and neutral currents differ (about 30 mA).', fi: 'Laite, joka laukeaa, kun vaihe- ja nollajohtimen virrat eroavat (noin 30 mA).' } },
      mutual: { en: 'mutual inductance', fi: 'keskinäisinduktanssi', sym: 'M', def: { en: 'emf₂ = −M·dI₁/dt. Unit henry (H).', fi: 'e₂ = −M·dI₁/dt. Yksikkö henry (H).' } },
      selfind: { en: 'self-inductance', fi: 'itseisinduktanssi', sym: 'L', def: { en: 'e = −L·dI/dt. Unit henry (H).', fi: 'e = −L·dI/dt. Yksikkö henry (H).' } },
      inductor: { en: 'inductor', fi: 'induktori, kela', def: { en: 'A coil with significant inductance.', fi: 'Kela, jolla on merkittävä induktanssi.' } },
      energydensity: { en: 'energy density', fi: 'energiatiheys', sym: 'u = B²/(2μ₀)', def: { en: 'Energy per unit volume of a magnetic field.', fi: 'Magneettikentän energia tilavuusyksikköä kohti.' } },
      peakvalue: { en: 'peak value', fi: 'huippuarvo', def: { en: 'Maximum instantaneous value of an ac quantity.', fi: 'Vaihtosuureen hetkellisarvon suurin arvo.' } },
      rmsvalue: { en: 'rms value', fi: 'tehollisarvo', def: { en: 'Peak value divided by √2 for a sine wave.', fi: 'Siniaallon huippuarvo jaettuna luvulla √2.' } }
    },
    formulas: [
      { name: { en: 'Field of a long straight wire', fi: 'Pitkän suoran johtimen kenttä' }, tex: 'B = {μ_0 · I}/{2π · r}' },
      { name: { en: 'Field at the centre of a loop (N turns)', fi: 'Magneettivuon tiheys silmukan keskellä (N kierrosta)' }, tex: 'B = {μ · N · I}/{2R}' },
      { name: { en: 'Force on a wire in a field', fi: 'Johtimeen kohdistuva voima kentässä' }, tex: 'F = I · l · B · sin θ' },
      { name: { en: 'Magnetic flux', fi: 'Magneettivuo' }, tex: 'Φ = B · A · cos θ' },
      { name: { en: "Faraday's law", fi: 'Faradayn induktiolaki' }, tex: 'e = −N · {ΔΦ}/{Δt}' },
      { name: { en: 'Motional emf', fi: 'Liikkuvan johtimen jännite' }, tex: 'e = B · l · v' },
      { name: { en: 'AC generator emf', fi: 'Vaihtovirtageneraattorin jännite' }, tex: 'e = N · B · A · ω · sin ωt' },
      { name: { en: 'Motor current with back emf', fi: 'Moottorin virta vastajännitteellä' }, tex: 'I = {U - E}/{R_a}' },
      { name: { en: 'Ideal transformer', fi: 'Ideaalinen muuntaja' }, tex: '{U_S}/{U_P} = {N_S}/{N_P} = {I_P}/{I_S}' },
      { name: { en: 'Line loss', fi: 'Johdon häviöteho' }, tex: 'P_L = R · I^2, I = P/U' },
      { name: { en: 'Mutual inductance', fi: 'Keskinäisinduktanssi' }, tex: 'e_2 = −M · {dI_1}/{dt}' },
      { name: { en: 'Self-inductance', fi: 'Itseisinduktanssi' }, tex: 'e = −L · {dI}/{dt}' },
      { name: { en: 'Solenoid inductance', fi: 'Solenoidin induktanssi' }, tex: 'L = {μ · N^2 · π r^2}/{l}' },
      { name: { en: 'Energy in an inductor', fi: 'Induktorin energia' }, tex: 'W = {1}/{2} · L · I^2' },
      { name: { en: 'Magnetic energy density', fi: 'Magneettikentän energiatiheys' }, tex: 'u = {B^2}/{2μ_0}' }
    ],
    sections: [
      // ---------------------------------------------------------------- 8.1 + 8.2
      {
        id: 't8-wire', title: { en: 'Magnetic field of a current-carrying wire', fi: 'Virtajohtimen magneettikenttä' },
        blocks: [
          { id: 't8-wire-p1', type: 'text', html: {
            en: '<p>A compass needle near a wire turns when a current is switched on: <b>an electric current produces a <dfn data-term="magfield">magnetic field</dfn></b>. Around a long straight wire the field lines are circles in planes perpendicular to the wire. The <dfn data-term="righthand">right-hand rule</dfn> gives the direction: thumb along the current <f>I</f>, fingers curl in the direction of <f>B</f>.</p>',
            fi: '<p>Johtimen lähellä oleva kompassineula kääntyy, kun virta kytketään: <b>sähkövirta synnyttää <dfn data-term="magfield">magneettikentän</dfn></b>. Pitkän suoran johtimen ympärillä kenttäviivat ovat johtimeen nähden kohtisuorissa tasoissa olevia ympyröitä. <dfn data-term="righthand">Oikean käden säännön</dfn> mukaan peukalo osoittaa virran <f>I</f> suuntaan ja sormet kiertävät <f>B</f>:n suuntaan.</p>' } },
          { id: 't8-wire-f1', type: 'formula', key: true, tex: 'B = {μ_0 · I}/{2π · r}', label: { en: 'Straight wire', fi: 'Suora johdin' },
            legend: [['B', { en: 'magnetic flux density', fi: 'magneettivuon tiheys' }, 'T'], ['μ_0', { en: 'permeability of vacuum, 4π·10^-7', fi: 'tyhjiön permeabiliteetti, 4π·10^-7' }, 'Vs/(Am)'], ['I', { en: 'current', fi: 'virta' }, 'A'], ['r', { en: 'distance from the wire centre', fi: 'etäisyys johtimen keskipisteestä' }, 'm']] },
          { id: 't8-wire-i1', type: 'interactive', widget: 'plot', title: { en: 'Field against distance', fi: 'Kenttä etäisyyden funktiona' },
            caption: { en: 'B falls as 1/r. For I = 15 A the field is 150 µT at 2 cm and 15 µT at 20 cm.', fi: 'B pienenee kuten 1/r. Kun I = 15 A, kenttä on 150 µT etäisyydellä 2 cm ja 15 µT etäisyydellä 20 cm.' },
            config: {
              x: { min: 0.01, max: 0.3, label: { en: 'Distance r', fi: 'Etäisyys r' }, unit: 'm' },
              y: { min: 0, max: 0.0003, label: { en: 'Field B', fi: 'Kenttä B' }, unit: 'T', auto: true },
              params: [{ id: 'I', tex: 'I', min: 1, max: 50, step: 1, value: 15, unit: 'A' }],
              curves: [{ fn: function (x, p) { return MU0 * p.I / (2 * Math.PI * x); }, label: { en: 'B(r)', fi: 'B(r)' } }],
              points: function (p) { return [{ x: 0.02, y: MU0 * p.I / (2 * Math.PI * 0.02), label: '2 cm' }, { x: 0.2, y: MU0 * p.I / (2 * Math.PI * 0.2), label: '20 cm' }]; },
              readouts: function (p) { return [{ tex: 'B(2 cm)', value: MU0 * p.I / (2 * Math.PI * 0.02), unit: 'T' }, { tex: 'B(20 cm)', value: MU0 * p.I / (2 * Math.PI * 0.2), unit: 'T' }]; }
            } },
          { id: 't8-wire-ex1', type: 'example', title: { en: 'Field near a 15 A wire', fi: 'Kenttä 15 A:n johtimen lähellä' },
            problem: { en: 'A long straight wire carries 15 A. Find B at a) 2.0 cm and b) 20 cm from the wire.', fi: 'Pitkässä suorassa johtimessa kulkee 15 A. Laske B a) 2,0 cm:n ja b) 20 cm:n etäisyydellä johtimesta.' },
            given: ['I = 15 A', 'r_1 = 2.0 cm', 'r_2 = 20 cm'],
            steps: [
              { tex: 'B_1 = {4π·10^-7 · 15}/{2π · 0.020} = 1.5·10^-4 T = 150 µT' },
              { tex: 'B_2 = {4π·10^-7 · 15}/{2π · 0.20} = 15 µT' },
              { en: 'Ten times the distance gives one tenth of the field. For comparison, the Earth\'s field is about 50 µT (extra).', fi: 'Kymmenkertainen etäisyys antaa kymmenesosan kentästä. Vertailuksi: Maan magneettikenttä on noin 50 µT (lisä).' }
            ],
            result: { en: 'B = 150 µT at 2.0 cm and 15 µT at 20 cm', fi: 'B = 150 µT etäisyydellä 2,0 cm ja 15 µT etäisyydellä 20 cm' } },
          { id: 't8-wire-h2', type: 'h', text: { en: "Ampère's law and the field strength H", fi: 'Ampèren laki ja kentänvoimakkuus H' } },
          { id: 't8-wire-p2', type: 'text', html: {
            en: '<p><dfn data-term="ampere">Ampère\'s law</dfn>: the line integral of <f>H</f> around any closed path equals the current <f>I_e</f> passing through the surface the path encloses. The <dfn data-term="fieldstrength">field strength</dfn> <f>H</f> describes the field independently of the medium: in vacuum <f>H = B/μ_0</f>, unit A/m (in a material <f>B = μ·H</f>).</p><p>For a straight wire choose a circle of radius <f>r</f>: <f>H·2π r = I</f>, so <f>H = I/(2π r)</f>, the same result as above.</p>',
            fi: '<p><dfn data-term="ampere">Ampèren laki</dfn>: <f>H</f>:n viivaintegraali minkä tahansa suljetun polun ympäri on yhtä suuri kuin polun rajaaman pinnan läpi kulkeva virta <f>I_e</f>. <dfn data-term="fieldstrength">Kentänvoimakkuus</dfn> <f>H</f> kuvaa kenttää riippumatta väliaineesta: tyhjiössä <f>H = B/μ_0</f>, yksikkö A/m (aineessa <f>B = μ·H</f>).</p><p>Suoralle johtimelle valitaan r-säteinen ympyrä: <f>H·2π r = I</f>, joten <f>H = I/(2π r)</f>, sama tulos kuin yllä.</p>' } },
          { id: 't8-wire-f2', type: 'formula', key: true, tex: '∮ H · dl = I_e,  H = B/μ_0', label: { en: "Ampère's law", fi: 'Ampèren laki' } },
          // (extra)
          { id: 't8-wire-ex2', type: 'example', title: { en: 'Field strength H (extra)', fi: 'Kentänvoimakkuus H (lisä)' },
            problem: { en: 'Find H and B at r = 2.0 cm for I = 15 A.', fi: 'Laske H ja B etäisyydellä r = 2,0 cm, kun I = 15 A.' },
            given: ['I = 15 A', 'r = 2.0 cm'],
            steps: [{ tex: 'H = {I}/{2π r} = {15}/{2π · 0.02} = 119.4 A/m' }, { tex: 'B = μ_0 · H = 4π·10^-7 · 119.4 = 150 µT' }],
            result: { en: 'H = 119 A/m, B = 150 µT', fi: 'H = 119 A/m, B = 150 µT' } },
          { id: 't8-wire-c1', type: 'callout', kind: 'warn', title: { en: 'Common mistake', fi: 'Yleinen virhe' }, html: {
            en: 'The field does not point along the wire or towards it: it circles around it. Doubling the current doubles B, but doubling the distance halves it (B is not proportional to 1/r²).',
            fi: 'Kenttä ei osoita johtimen suuntaan eikä johtimeen päin vaan kiertää sen ympäri. Virran kaksinkertaistaminen kaksinkertaistaa B:n, mutta etäisyyden kaksinkertaistaminen puolittaa sen (B ei ole verrannollinen suureeseen 1/r²).' } },
          { id: 't8-q1-blk', type: 'question', q: 't8-q1' },
          { id: 't8-q2-blk', type: 'question', q: 't8-q2' }
        ]
      },
      // ---------------------------------------------------------------- 8.3
      {
        id: 't8-loop', title: { en: 'Magnetic field of a circular loop', fi: 'Ympyräsilmukan magneettikenttä' },
        blocks: [
          { id: 't8-loop-p1', type: 'text', html: {
            en: '<p>Bending the wire into a circle changes the field shape. Inside the loop the lines run along the axis and return outside, so the loop behaves like a short bar magnet. Right-hand rule for loops: fingers along the current, thumb gives the direction of <f>B</f> inside the loop.</p>',
            fi: '<p>Kun johdin taivutetaan ympyräksi, kentän muoto muuttuu. Silmukan sisällä kenttäviivat kulkevat akselin suuntaisesti ja palaavat ulkopuolelta, joten silmukka käyttäytyy kuin lyhyt sauvamagneetti. Silmukan oikean käden sääntö: sormet virran suuntaan, peukalo osoittaa B:n suunnan silmukan sisällä.</p>' } },
          { id: 't8-loop-f1', type: 'formula', key: true, tex: 'B = {μ · N · I}/{2R}', label: { en: 'Centre of a loop of N turns', fi: 'Silmukan keskipiste, N kierrosta' },
            legend: [['R', { en: 'loop radius', fi: 'silmukan säde' }, 'm'], ['N', { en: 'number of close turns (the PDF shows N = 1)', fi: 'tiheiden kierrosten lukumäärä (PDF: N = 1)' }, ''], ['μ', { en: 'permeability (μ_0 in air)', fi: 'permeabiliteetti (ilmassa μ_0)' }, 'Vs/(Am)']] },
          { id: 't8-loop-fig', type: 'figure', caption: { en: 'Side view of a loop. The current flows down on the left; the field exits on the right (north side) and enters on the left (south side).', fi: 'Silmukka sivulta. Virta kulkee vasemmalla alas; kenttä tulee ulos oikealta (pohjoispuoli) ja menee sisään vasemmalta (eteläpuoli).' },
            alt: { en: 'Loop with field lines through its axis', fi: 'Silmukka ja sen akselin läpi kulkevat kenttäviivat' },
            svg: '<svg viewBox="0 0 320 150" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="160" cy="75" rx="14" ry="50" style="stroke:var(--c-wire)" stroke-width="4"/><path d="M60 75H260" style="stroke:var(--c-1)"/><path d="M175 75C230 75 290 20 160 20C60 20 100 75 145 75" style="stroke:var(--c-1)" stroke-dasharray="4 3"/><path d="M175 75C230 75 290 130 160 130C60 130 100 75 145 75" style="stroke:var(--c-1)" stroke-dasharray="4 3"/></g><path d="M254 75l-9-5v10z" style="fill:var(--c-1)"/><path d="M146 38v14l-5-7m5 7l5-7" fill="none" stroke="currentColor" stroke-width="2"/><text x="124" y="42" fill="currentColor" font-size="13" text-anchor="end">I</text><text x="262" y="68" fill="currentColor" font-size="13">B</text><text x="160" y="145" fill="currentColor" font-size="12" text-anchor="middle">N</text></svg>' },
          { id: 't8-loop-i1', type: 'interactive', widget: 'readout', title: { en: 'Field at the centre of a coil', fi: 'Kenttä kelan keskellä' },
            caption: { en: 'Field in air. More turns or a smaller radius give a stronger field.', fi: 'Kenttä ilmassa. Useampi kierros tai pienempi säde antaa voimakkaamman kentän.' },
            config: {
              params: [{ id: 'I', tex: 'I', min: 1, max: 30, step: 1, value: 10, unit: 'A' }, { id: 'R', tex: 'R', min: 0.01, max: 0.2, step: 0.005, value: 0.05, unit: 'm' }, { id: 'N', tex: 'N', min: 1, max: 50, step: 1, value: 1 }],
              outputs: function (v) { return [{ tex: 'B', value: MU0 * v.N * v.I / (2 * v.R), unit: 'T' }]; }
            } },
          // (extra)
          { id: 't8-loop-ex1', type: 'example', title: { en: 'A single loop and a coil (extra)', fi: 'Yksi silmukka ja kela (lisä)' },
            problem: { en: 'R = 5.0 cm, I = 10 A. Find B at the centre for N = 1 and N = 20.', fi: 'R = 5,0 cm, I = 10 A. Laske B keskipisteessä, kun N = 1 ja N = 20.' },
            given: ['R = 5.0 cm', 'I = 10 A'],
            steps: [{ tex: 'B = {4π·10^-7 · 10}/{2 · 0.05} = 125.7 µT' }, { tex: 'B_20 = 20 · 125.7 µT = 2.51 mT' }],
            result: { en: 'B = 126 µT (N = 1), 2.51 mT (N = 20)', fi: 'B = 126 µT (N = 1), 2,51 mT (N = 20)' } },
          { id: 't8-loop-c1', type: 'callout', kind: 'info', title: { en: 'Note on the PDF', fi: 'Huomio PDF:stä' }, html: {
            en: 'The slide formula <f>B = μI/(2R)</f> is for a single turn. For N close turns multiply by N.',
            fi: 'Kalvon kaava <f>B = μI/(2R)</f> pätee yhdelle kierrokselle. N tiheälle kierrokselle kerrotaan luvulla N.' } }
        ]
      },
      // ---------------------------------------------------------------- 8.4
      {
        id: 't8-force', title: { en: 'Magnetic force on a current-carrying wire', fi: 'Virtajohtimeen kohdistuva magneettinen voima' },
        blocks: [
          { id: 't8-force-p1', type: 'text', html: {
            en: '<p>A magnetic field pushes on moving charges, so it also pushes on a wire carrying current. The force is largest when the wire is perpendicular to <f>B</f> and zero when the wire is parallel to it. The direction is perpendicular to both the wire and <f>B</f> (right-hand rule, with the current as the direction of positive charge motion).</p>',
            fi: '<p>Magneettikenttä kohdistaa voiman liikkuviin varauksiin ja siten myös virtajohtimeen. Voima on suurin, kun johdin on kohtisuorassa B:tä vasten, ja nolla, kun johdin on B:n suuntainen. Suunta on kohtisuorassa sekä johdinta että B:tä vastaan (oikean käden sääntö, virran suunta = positiivisen varauksen liikesuunta).</p>' } },
          { id: 't8-force-f1', type: 'formula', key: true, tex: 'F = I · l · B · sin θ', label: { en: 'Force on a wire', fi: 'Voima johtimeen' },
            legend: [['l', { en: 'length of wire in the field', fi: 'kentässä olevan johtimen pituus' }, 'm'], ['θ', { en: 'angle between wire and B', fi: 'johtimen ja B:n välinen kulma' }, '°']] },
          { id: 't8-force-i1', type: 'interactive', widget: 'plot', title: { en: 'Force against angle', fi: 'Voima kulman funktiona' },
            caption: { en: 'Defaults are the PDF example: 7.5 N at 90°, zero at 0° and 180°.', fi: 'Oletusarvot ovat PDF:n esimerkki: 7,5 N kulmassa 90°, nolla kulmissa 0° ja 180°.' },
            config: {
              x: { min: 0, max: 180, label: { en: 'Angle θ', fi: 'Kulma θ' }, unit: '°' },
              y: { min: 0, max: 8, label: { en: 'Force F', fi: 'Voima F' }, unit: 'N', auto: true },
              params: [{ id: 'I', tex: 'I', min: 1, max: 20, step: 1, value: 10, unit: 'A' }, { id: 'l', tex: 'l', min: 0.5, max: 10, step: 0.5, value: 5, unit: 'm' }, { id: 'B', tex: 'B', min: 0.01, max: 0.3, step: 0.01, value: 0.15, unit: 'T' }, { id: 'th', tex: 'θ', min: 0, max: 180, step: 5, value: 90, unit: '°' }],
              curves: [{ fn: function (x, p) { return p.I * p.l * p.B * Math.sin(x * RAD); }, label: { en: 'F(θ)', fi: 'F(θ)' } }],
              points: function (p) { return [{ x: p.th, y: p.I * p.l * p.B * Math.sin(p.th * RAD) }]; },
              readouts: function (p) { return [{ tex: 'F', value: p.I * p.l * p.B * Math.sin(p.th * RAD), unit: 'N' }]; }
            } },
          { id: 't8-force-ex1', type: 'example', title: { en: 'Force on a 5 m wire', fi: 'Voima 5 m:n johtimeen' },
            problem: { en: 'I = 10 A, B = 150 mT, l = 5 m. Find F when a) θ = 90° and b) θ = 180°.', fi: 'I = 10 A, B = 150 mT, l = 5 m. Laske F, kun a) θ = 90° ja b) θ = 180°.' },
            given: ['I = 10 A', 'B = 150 mT', 'l = 5 m'],
            steps: [{ tex: 'F = I · l · B = 10 · 5 · 0.150 = 7.5 N' }, { tex: 'F = I · l · B · sin 180° = 0' }, { en: 'Extra: at θ = 30° the force is 7.5 · 0.5 = 3.75 N.', fi: 'Lisä: kulmassa θ = 30° voima on 7,5 · 0,5 = 3,75 N.' }],
            result: { en: 'a) 7.5 N, b) 0', fi: 'a) 7,5 N, b) 0' } },
          { id: 't8-force-c1', type: 'callout', kind: 'warn', title: { en: 'Common mistake', fi: 'Yleinen virhe' }, html: {
            en: 'Zero force does not mean zero field. A wire parallel to B feels no force even in a strong field.',
            fi: 'Nollavoima ei tarkoita nollakenttää. B:n suuntainen johdin ei tunne voimaa edes voimakkaassa kentässä.' } },
          { id: 't8-q3-blk', type: 'question', q: 't8-q3' }
        ]
      },
      // ---------------------------------------------------------------- 8.5
      {
        id: 't8-induction', title: { en: 'Electromagnetic induction', fi: 'Sähkömagneettinen induktio' },
        blocks: [
          { id: 't8-ind-p1', type: 'text', html: {
            en: '<p>A current makes a field, and a field acts on a current. Can a field make a current? Faraday found the answer: <b>only a <em>changing</em> magnetic field induces a current</b>. A steady current in coil X gives nothing in coil Y. Closing the switch makes the galvanometer deflect, opening it makes it deflect the other way. Likewise, moving a magnet relative to a coil induces an emf, while a magnet at rest in the coil does not.</p>',
            fi: '<p>Virta synnyttää kentän ja kenttä vaikuttaa virtaan. Voiko kenttä synnyttää virran? Faraday löysi vastauksen: <b>vain <em>muuttuva</em> magneettikenttä indusoi virran</b>. Tasainen virta kelassa X ei aiheuta mitään kelassa Y. Kytkimen sulkeminen saa galvanometrin poikkeamaan, avaaminen vastakkaiseen suuntaan. Samoin magneetin liike kelaan nähden indusoi jännitteen, mutta kelassa levossa oleva magneetti ei.</p>' } },
          { id: 't8-ind-i1', type: 'interactive', widget: 'custom', title: { en: 'Move the magnet towards the coil', fi: 'Liikuta magneettia kelaa kohti' },
            caption: { en: 'Drag the slider quickly, slowly, or not at all. The needle follows the speed of change, not the position.', fi: 'Vedä liukusäädintä nopeasti, hitaasti tai älä lainkaan. Neula seuraa muutoksen nopeutta, ei asemaa.' },
            config: { mount: faradayMount } },
          { id: 't8-ind-c1', type: 'callout', kind: 'key', title: { en: 'Three ways to change the flux', fi: 'Kolme tapaa muuttaa vuota' }, html: {
            en: 'Move the magnet (or the coil), change the current that makes the field, or change the area or angle of the coil (extra).',
            fi: 'Liikuta magneettia (tai kelaa), muuta kentän tuottavaa virtaa tai muuta kelan pinta-alaa tai kulmaa (lisä).' } },
          { id: 't8-q4-blk', type: 'question', q: 't8-q4' }
        ]
      },
      // ---------------------------------------------------------------- 8.6
      {
        id: 't8-flux', title: { en: 'Magnetic flux', fi: 'Magneettivuo' },
        blocks: [
          { id: 't8-flux-p1', type: 'text', html: {
            en: '<p>The induced emf depends on how fast the <dfn data-term="flux">magnetic flux</dfn> <f>Φ_B</f> through the loop changes. Flux is proportional to the number of field lines passing through the loop. The area vector <f>A</f> is perpendicular to the loop surface, and <f>θ</f> is the angle between <f>B</f> and <f>A</f>, <em>not</em> between <f>B</f> and the loop plane.</p>',
            fi: '<p>Indusoitunut jännite riippuu siitä, kuinka nopeasti silmukan läpi kulkeva <dfn data-term="flux">magneettivuo</dfn> <f>Φ_B</f> muuttuu. Vuo on verrannollinen silmukan läpi kulkevien kenttäviivojen lukumäärään. Pinta-alavektori <f>A</f> on kohtisuorassa silmukan pintaa vastaan ja <f>θ</f> on kulma <f>B</f>:n ja <f>A</f>:n välillä, <em>ei</em> B:n ja silmukan tason välillä.</p>' } },
          { id: 't8-flux-f1', type: 'formula', key: true, tex: 'Φ_B = B · A · cos θ = B · A', label: { en: 'Flux through a loop', fi: 'Vuo silmukan läpi' },
            legend: [['Φ_B', { en: 'flux, 1 Wb = 1 T·m² = 1 Vs', fi: 'vuo, 1 Wb = 1 T·m² = 1 Vs' }, 'Wb']] },
          { id: 't8-flux-i1', type: 'interactive', widget: 'plot', title: { en: 'Flux against the angle', fi: 'Vuo kulman funktiona' },
            caption: { en: 'Face-on (θ = 0) gives the maximum, edge-on (θ = 90°) gives zero. Extra example: B = 0.2 T, 10 cm × 20 cm.', fi: 'Kohtisuoraan (θ = 0) vuo on suurin, reunasta (θ = 90°) nolla. Lisäesimerkki: B = 0,2 T, 10 cm × 20 cm.' },
            config: {
              x: { min: 0, max: 180, label: { en: 'Angle θ', fi: 'Kulma θ' }, unit: '°' },
              y: { min: -0.005, max: 0.005, label: { en: 'Flux Φ', fi: 'Vuo Φ' }, unit: 'Wb', auto: true },
              params: [{ id: 'B', tex: 'B', min: 0.05, max: 0.5, step: 0.05, value: 0.2, unit: 'T' }, { id: 'A', tex: 'A', min: 0.005, max: 0.05, step: 0.005, value: 0.02, unit: 'm²' }, { id: 'th', tex: 'θ', min: 0, max: 180, step: 5, value: 45, unit: '°' }],
              curves: [{ fn: function (x, p) { return p.B * p.A * Math.cos(x * RAD); }, label: { en: 'Φ(θ)', fi: 'Φ(θ)' } }],
              points: function (p) { return [{ x: p.th, y: p.B * p.A * Math.cos(p.th * RAD) }]; },
              readouts: function (p) { return [{ tex: 'Φ', value: p.B * p.A * Math.cos(p.th * RAD), unit: 'Wb' }]; }
            } },
          // (extra)
          { id: 't8-flux-ex1', type: 'example', title: { en: 'Flux of a rectangular loop (extra)', fi: 'Suorakulmaisen silmukan vuo (lisä)' },
            problem: { en: 'B = 0.2 T, loop 10 cm × 20 cm. Find Φ at 0°, 45° and 90°.', fi: 'B = 0,2 T, silmukka 10 cm × 20 cm. Laske Φ kulmissa 0°, 45° ja 90°.' },
            given: ['B = 0.2 T', 'A = 0.10 m · 0.20 m = 0.02 m²'],
            steps: [{ tex: 'Φ_max = 0.2 · 0.02 = 4 mWb' }, { tex: 'Φ_45 = 4 mWb · cos 45° = 2.83 mWb' }, { tex: 'Φ_90 = 0' }],
            result: { en: '4 mWb, 2.83 mWb, 0', fi: '4 mWb, 2,83 mWb, 0' } },
          { id: 't8-q5-blk', type: 'question', q: 't8-q5' }
        ]
      },
      // ---------------------------------------------------------------- 8.7 + 8.8
      {
        id: 't8-faraday', title: { en: "Faraday's and Lenz's laws", fi: 'Faradayn ja Lenzin lait' },
        blocks: [
          { id: 't8-far-p1', type: 'text', html: {
            en: '<p><dfn data-term="faraday">Faraday\'s law</dfn>: the induced emf equals the negative rate of change of flux. For <f>N</f> closely wound loops the same flux passes through each, so the emf is <f>N</f> times larger.</p>',
            fi: '<p><dfn data-term="faraday">Faradayn induktiolaki</dfn>: indusoitunut lähdejännite on vuon muutosnopeuden vastaluku. Kun N kierrosta on tiheästi kierretty, jokaisen läpi kulkee sama vuo, joten jännite on N-kertainen.</p>' } },
          { id: 't8-far-f1', type: 'formula', key: true, tex: 'e = −N · {dΦ_B}/{dt} ≈ −N · {ΔΦ_B}/{Δt}', label: { en: "Faraday's law", fi: 'Faradayn laki' } },
          { id: 't8-far-ex1', type: 'example', title: { en: 'Coil in a growing field (PDF example)', fi: 'Kela kasvavassa kentässä (PDF:n esimerkki)' },
            problem: { en: 'A circular coil with N = 25 loops and radius 15 cm lies perpendicular to a field that grows by 150 mT/s. Find the emf.', fi: 'Ympyränmuotoinen kela, N = 25 kierrosta ja säde 15 cm, on kohtisuorassa kenttää vastaan, joka kasvaa 150 mT/s. Laske lähdejännite.' },
            given: ['N = 25', 'r = 0.15 m', 'ΔB/Δt = 0.15 T/s'],
            steps: [
              { tex: 'A = π · 0.15^2 = 0.0707 m²' },
              { tex: 'e = −N · A · {ΔB}/{Δt} = −25 · 0.0707 · 0.15 = −0.265 V' },
              { en: 'The slide prints 0.26 V, but 0.2651 V rounds to 0.27 V. If "15 cm" meant the diameter, r = 7.5 cm and |e| = 0.066 V.', fi: 'Kalvossa lukee 0,26 V, mutta 0,2651 V pyöristyy arvoon 0,27 V. Jos "15 cm" tarkoittaisi halkaisijaa, olisi r = 7,5 cm ja |e| = 0,066 V.' }
            ],
            result: { en: '|e| ≈ 0.265 V (minus sign: Lenz)', fi: '|e| ≈ 0,265 V (miinusmerkki: Lenz)' } },
          { id: 't8-far-h2', type: 'h', text: { en: "Lenz's law", fi: 'Lenzin laki' } },
          { id: 't8-far-p2', type: 'text', html: {
            en: '<p><dfn data-term="lenz">Lenz\'s law</dfn> (the minus sign): the induced current flows so that its own field <b>opposes the change</b> in flux, not the flux itself. Procedure: (1) direction of the external <f>B</f> through the loop; (2) is the flux increasing or decreasing; (3) <f>B_ind</f> is opposite to <f>B</f> if the flux grows, in the same direction if it falls; (4) use the right-hand rule to get the current.</p>',
            fi: '<p><dfn data-term="lenz">Lenzin laki</dfn> (miinusmerkki): indusoitunut virta kulkee niin, että sen oma kenttä <b>vastustaa vuon muutosta</b>, ei itse vuota. Menettely: (1) ulkoisen B:n suunta silmukan läpi; (2) kasvaako vai pieneneekö vuo; (3) <f>B_ind</f> on vastakkainen B:n kanssa, jos vuo kasvaa, ja samansuuntainen, jos vuo pienenee; (4) oikean käden säännöllä saadaan virran suunta.</p>' } },
          { id: 't8-far-t1', type: 'table', caption: { en: 'The four PDF cases (a wire in the plane of the page and a loop next to it)', fi: 'PDF:n neljä tapausta (johdin paperin tasossa ja sen vieressä silmukka)' },
            head: [{ en: 'Case', fi: 'Tapaus' }, { en: 'B of the wire at the loop', fi: 'Johtimen B silmukan kohdalla' }, { en: 'Flux', fi: 'Vuo' }, { en: 'Induced current', fi: 'Indusoitunut virta' }],
            rows: [
              [{ en: 'a) wire below the loop, I to the left, increasing', fi: 'a) johdin silmukan alapuolella, I vasemmalle, kasvaa' }, { en: 'into the page', fi: 'paperiin päin' }, { en: 'increases', fi: 'kasvaa' }, { en: 'counter-clockwise', fi: 'vastapäivään' }],
              [{ en: 'b) wire above the loop, I to the right, decreasing', fi: 'b) johdin silmukan yläpuolella, I oikealle, pienenee' }, { en: 'into the page', fi: 'paperiin päin' }, { en: 'decreases', fi: 'pienenee' }, { en: 'clockwise', fi: 'myötäpäivään' }],
              [{ en: 'c) wire to the right, I constant', fi: 'c) johdin oikealla, I vakio' }, { en: 'constant', fi: 'vakio' }, { en: 'constant', fi: 'vakio' }, { en: 'zero', fi: 'nolla' }],
              [{ en: 'd) wire to the left, I up, increasing', fi: 'd) johdin vasemmalla, I ylös, kasvaa' }, { en: 'into the page', fi: 'paperiin päin' }, { en: 'increases', fi: 'kasvaa' }, { en: 'counter-clockwise', fi: 'vastapäivään' }]
            ] },
          { id: 't8-far-c1', type: 'callout', kind: 'warn', title: { en: 'Common mistake', fi: 'Yleinen virhe' }, html: {
            en: 'Lenz does not say the induced field opposes the original field. It opposes the <em>change</em>: if the flux falls, the induced field points the same way as the original one.',
            fi: 'Lenz ei sano, että indusoitunut kenttä vastustaa alkuperäistä kenttää. Se vastustaa <em>muutosta</em>: jos vuo pienenee, indusoitunut kenttä osoittaa samaan suuntaan kuin alkuperäinen.' } },
          { id: 't8-far-c2', type: 'callout', kind: 'info', title: { en: 'Note on the PDF', fi: 'Huomio PDF:stä' }, html: {
            en: 'On the magnet figure the current is drawn in perspective. Seen from above, a north pole approaching from below (B up, increasing) gives B_ind down and therefore a <em>clockwise</em> current, as in the simulation above.',
            fi: 'Magneettikuvassa virta on piirretty perspektiivissä. Ylhäältä katsoen alhaalta lähestyvä pohjoisnapa (B ylös, kasvaa) antaa B_ind-kentän alas ja siten <em>myötäpäivään</em> kulkevan virran, kuten yllä olevassa simulaatiossa.' } },
          { id: 't8-q6-blk', type: 'question', q: 't8-q6' },
          { id: 't8-q7-blk', type: 'question', q: 't8-q7' }
        ]
      },
      // ---------------------------------------------------------------- 8.9
      {
        id: 't8-rod', title: { en: 'EMF in a moving conductor', fi: 'Liikkuvan johtimen lähdejännite' },
        blocks: [
          { id: 't8-rod-p1', type: 'text', html: {
            en: '<p>A rod of length <f>l</f> slides at speed <f>v</f> on a U-shaped conductor in a field <f>B</f> perpendicular to the plane. In time <f>dt</f> the area grows by <f>dA = l·v·dt</f>, so by Faraday <f>e = B·dA/dt = B·l·v</f>. The same emf appears across any straight conductor moving through a field, even without a closed loop: the magnetic force pushes free charges to one end.</p>',
            fi: '<p>Sauva, jonka pituus on <f>l</f>, liukuu nopeudella <f>v</f> U-muotoisella johtimella kentässä <f>B</f>, joka on kohtisuorassa tasoa vastaan. Ajassa <f>dt</f> pinta-ala kasvaa määrällä <f>dA = l·v·dt</f>, joten Faradayn lain mukaan <f>e = B·dA/dt = B·l·v</f>. Sama jännite syntyy minkä tahansa kentässä liikkuvan suoran johtimen yli myös ilman suljettua silmukkaa: magneettinen voima työntää vapaat varaukset johtimen toiseen päähän.</p>' } },
          { id: 't8-rod-f1', type: 'formula', key: true, tex: 'e = B · l · v', label: { en: 'Motional emf (magnitude)', fi: 'Liikejännite (suuruus)' } },
          { id: 't8-rod-i1', type: 'interactive', widget: 'readout', title: { en: 'Moving rod calculator', fi: 'Liikkuvan sauvan laskuri' },
            caption: { en: 'Defaults are the airliner: 1100 km/h (305.6 m/s), 65 µT vertical field, wing tips 70 m apart.', fi: 'Oletusarvot ovat lentokone: 1100 km/h (305,6 m/s), 65 µT:n pystykenttä, siivenkärkien väli 70 m.' },
            config: {
              params: [{ id: 'B', tex: 'B', min: 1e-6, max: 1, value: 65e-6, unit: 'T', log: true }, { id: 'l', tex: 'l', min: 0.1, max: 100, value: 70, unit: 'm', log: true }, { id: 'v', tex: 'v', min: 0.1, max: 400, value: 305.6, unit: 'm/s', log: true }, { id: 'R', tex: 'R', min: 0.01, max: 10, value: 0.1, unit: 'Ω', log: true }],
              outputs: function (v) { return [{ tex: 'e = B·l·v', value: v.B * v.l * v.v, unit: 'V' }, { tex: 'I = e/R', value: v.B * v.l * v.v / v.R, unit: 'A' }]; }
            } },
          { id: 't8-rod-ex1', type: 'example', title: { en: 'Aeroplane wings', fi: 'Lentokoneen siivet' },
            problem: { en: 'A plane flies at 1100 km/h. The vertical field component is 65 µT and the wing tips are 70 m apart. Find the emf between the tips.', fi: 'Lentokone lentää nopeudella 1100 km/h. Pystysuuntainen kenttäkomponentti on 65 µT ja siivenkärkien väli 70 m. Laske kärkien välinen jännite.' },
            given: ['v = 1100 km/h', 'B = 65 µT', 'l = 70 m'],
            steps: [{ tex: 'v = 1100/3.6 = 305.6 m/s' }, { tex: 'e = B · l · v = 65·10^-6 · 70 · 305.6 = 1.39 V' }],
            result: { en: 'e ≈ 1.4 V', fi: 'e ≈ 1,4 V' } },
          { id: 't8-q8-blk', type: 'question', q: 't8-q8' }
        ]
      },
      // ---------------------------------------------------------------- 8.10
      {
        id: 't8-generator', title: { en: 'Electric generators', fi: 'Sähkögeneraattorit' },
        blocks: [
          { id: 't8-gen-p1', type: 'text', html: {
            en: '<p>A <dfn data-term="generator">generator</dfn> turns mechanical energy into electrical energy by induction. Electricity cannot be stored in large amounts, so power plants must produce what is consumed. In an ac generator a coil (the <dfn data-term="armature">armature</dfn>, many loops) rotates in a uniform field; water, a steam turbine or a heat engine turns the axle, and <dfn data-term="slipring">slip rings</dfn> with <dfn data-term="brush">brushes</dfn> take the current out.</p><p>The angle between <f>A</f> and <f>B</f> is <f>θ = ωt</f> with <f>ω = 2π f</f>. Then <f>Φ_B = B·A·cos ωt</f>, and differentiating gives the emf below. One revolution is one sine period, so for a two-pole machine the rotation frequency equals the electrical frequency.</p>',
            fi: '<p><dfn data-term="generator">Generaattori</dfn> muuttaa mekaanisen energian sähköenergiaksi induktion avulla. Sähköä ei voi varastoida suuria määriä, joten voimalaitosten on tuotettava juuri se, mitä kulutetaan. Vaihtovirtageneraattorissa kela (<dfn data-term="armature">ankkuri</dfn>, monta kierrosta) pyörii tasaisessa kentässä; akselia pyörittää vesi, höyryturbiini tai lämpövoimakone, ja <dfn data-term="slipring">liukurenkaat</dfn> ja <dfn data-term="brush">harjat</dfn> johtavat virran ulos.</p><p>Kulma <f>A</f>:n ja <f>B</f>:n välillä on <f>θ = ωt</f>, missä <f>ω = 2π f</f>. Tällöin <f>Φ_B = B·A·cos ωt</f>, ja derivoimalla saadaan alla oleva jännite. Yksi kierros on yksi siniaallon jakso, joten kaksinapaisessa koneessa pyörimistaajuus on yhtä suuri kuin sähköinen taajuus.</p>' } },
          { id: 't8-gen-f1', type: 'formula', key: true, tex: 'e = N · B · A · ω · sin ωt = e_0 · sin ωt,  e_0 = N · B · A · ω', label: { en: 'AC generator', fi: 'Vaihtovirtageneraattori' },
            legend: [['e_0', { en: 'peak value of the emf', fi: 'jännitteen huippuarvo' }, 'V'], ['ω', { en: '2π f, angular frequency', fi: '2π f, kulmataajuus' }, 'rad/s']] },
          { id: 't8-gen-i1', type: 'interactive', widget: 'phasor', title: { en: 'Rotating coil: phasor and waveform', fi: 'Pyörivä kela: osoitin ja aaltomuoto' },
            caption: { en: 'The rotating phasor is the peak e_0. Defaults give about 330 V peak (233 V rms) at 50 Hz. Raise N, B, A or f and the peak grows.', fi: 'Pyörivä osoitin on huippuarvo e_0. Oletuksilla huippuarvo on noin 330 V (tehollisarvo 233 V) taajuudella 50 Hz. Kasvata N:ää, B:tä, A:ta tai f:ää, niin huippuarvo kasvaa.' },
            config: {
              params: [{ id: 'N', tex: 'N', min: 1, max: 100, step: 1, value: 35 }, { id: 'B', tex: 'B', min: 0.05, max: 1, step: 0.05, value: 0.25, unit: 'T' }, { id: 'A', label: { en: 'Area A (cm²)', fi: 'Pinta-ala A (cm²)' }, min: 100, max: 2000, step: 50, value: 1200 }, { id: 'f', tex: 'f', min: 10, max: 100, step: 5, value: 50, unit: 'Hz' }],
              scale: { V: 700 },
              f: function (p) { return p.f; },
              peak: true,
              phasors: function (p) { return [{ id: 'e', label: 'e_0', mag: p.N * p.B * p.A * 1e-4 * 2 * Math.PI * p.f, deg: 0, unit: 'V', peak: true }]; },
              readouts: function (p) { var e0 = p.N * p.B * p.A * 1e-4 * 2 * Math.PI * p.f; return [{ tex: 'e_0', value: e0, unit: 'V' }, { tex: 'e_{rms}', value: e0 / Math.SQRT2, unit: 'V' }, { tex: 'ω', value: 2 * Math.PI * p.f, unit: 'rad/s' }]; }
            } },
          { id: 't8-gen-ex1', type: 'example', title: { en: 'Designing a 50 Hz generator (PDF example)', fi: '50 Hz:n generaattorin mitoitus (PDF:n esimerkki)' },
            problem: { en: 'A loop of 30 cm × 40 cm rotates 50 times per second in a field of 250 mT. How many loops give a sinusoidal 325 V peak?', fi: '30 cm × 40 cm:n silmukka pyörii 50 kertaa sekunnissa 250 mT:n kentässä. Montako kierrosta tarvitaan, jotta saadaan sinimuotoinen jännite, jonka huippuarvo on 325 V?' },
            given: ['e_0 = 325 V', 'B = 250 mT', 'A = 0.30 m · 0.40 m', 'f = 50 Hz'],
            steps: [
              { tex: 'A = 0.12 m², ω = 2π · 50 = 314.16 rad/s' },
              { tex: 'N = {e_0}/{B · A · ω} = {325}/{0.25 · 0.12 · 314.16} = 34.5' },
              { en: 'Round up: N = 35 gives e_0 = 329.9 V, e_rms = 233.3 V. (Extra: 325 V peak is 325/√2 = 230 V rms.)', fi: 'Pyöristetään ylöspäin: N = 35 antaa e_0 = 329,9 V, e_rms = 233,3 V. (Lisä: huippuarvo 325 V on 325/√2 = 230 V tehollisarvona.)' }
            ],
            result: { en: 'N ≈ 35 loops', fi: 'N ≈ 35 kierrosta' } },
          { id: 't8-gen-c1', type: 'callout', kind: 'tip', title: { en: 'Halving the speed (extra)', fi: 'Nopeuden puolittaminen (lisä)' }, html: {
            en: 'If the same generator turns at 25 Hz, both the frequency and the peak emf halve: e_0 = 164.9 V. In a power grid the frequency must stay at 50 Hz, so the speed is held constant.',
            fi: 'Jos sama generaattori pyörii taajuudella 25 Hz, sekä taajuus että huippujännite puolittuvat: e_0 = 164,9 V. Sähköverkossa taajuuden on pysyttävä 50 Hz:ssä, joten pyörimisnopeus pidetään vakiona.' } },
          { id: 't8-gen-h2', type: 'h', text: { en: 'DC generator and alternator', fi: 'Tasavirtageneraattori ja vaihtovirtageneraattori (alternaattori)' } },
          { id: 't8-gen-p2', type: 'text', html: {
            en: '<p>In a dc generator the slip rings are replaced by a split-ring <dfn data-term="commutator">commutator</dfn>, which reverses the connection every half turn, so the output is rectified, a series of arches. Using many windings (or a capacitor in parallel) smooths the ripple. A car <dfn data-term="alternator">alternator</dfn> feeds a rotating electromagnet (rotor) from the battery through slip rings; the output coils sit in the fixed stator, and a four-diode bridge rectifies the output to charge the battery.</p>',
            fi: '<p>Tasavirtageneraattorissa liukurenkaat on korvattu jaetulla <dfn data-term="commutator">kommutaattorilla</dfn>, joka vaihtaa kytkennän joka puolikierroksella, joten lähtö on tasasuunnattu: peräkkäisiä kaaria. Useampi käämi (tai rinnalle kytketty kondensaattori) tasoittaa aaltoilua. Auton <dfn data-term="alternator">vaihtovirtageneraattori</dfn> syöttää pyörivää sähkömagneettia (roottori) akusta liukurenkaiden kautta; ulostulokäämit ovat kiinteässä staattorissa, ja nelidiodisilta tasasuuntaa lähdön, jotta akku latautuu.</p>' } },
          // (extra)
          { id: 't8-gen-i2', type: 'interactive', widget: 'plot', title: { en: 'DC generator ripple (extra)', fi: 'Tasavirtageneraattorin aaltoilu (lisä)' },
            caption: { en: 'One winding gives |sin|, with arches touching zero. Add windings shifted around the armature and the ripple shrinks.', fi: 'Yksi käämi antaa |sin|-muodon, jonka kaaret koskettavat nollaa. Kun lisätään ankkurin ympäri siirrettyjä käämejä, aaltoilu pienenee.' },
            config: {
              x: { min: 0, max: 540, label: { en: 'Angle ωt', fi: 'Kulma ωt' }, unit: '°' },
              y: { min: 0, max: 1.1, label: { en: 'Output (relative)', fi: 'Lähtö (suhteellinen)' }, unit: '' },
              params: [{ id: 'n', label: { en: 'Number of windings', fi: 'Käämien lukumäärä' }, min: 1, max: 12, step: 1, value: 1 }],
              curves: [{ fn: function (x, p) { var m = 0; for (var k = 0; k < p.n; k++) m = Math.max(m, Math.abs(Math.sin((x - k * 180 / p.n) * RAD))); return m; }, label: { en: 'Output', fi: 'Lähtö' } }]
            } },
          { id: 't8-q9-blk', type: 'question', q: 't8-q9' },
          { id: 't8-q10-blk', type: 'question', q: 't8-q10' }
        ]
      },
      // ---------------------------------------------------------------- 8.11
      {
        id: 't8-motor', title: { en: 'Back emf and counter torque', fi: 'Vastajännite ja vastamomentti' },
        blocks: [
          { id: 't8-mot-p1', type: 'text', html: {
            en: '<p><b>Motor.</b> A spinning armature changes the flux through its coil, so an emf is induced that opposes the supply: the <dfn data-term="backemf">back emf</dfn> <f>E</f>. The faster the motor, the larger <f>E</f>; unloaded, the speed rises until <f>E</f> almost equals the supply voltage. The current is limited by the armature resistance <f>R_a</f> only through the difference.</p><p><b>Generator.</b> With no external circuit there is emf but no current, and the shaft turns easily. With a load, the current in the coil sits in the field and feels forces that give a <dfn data-term="countertorque">counter torque</dfn> opposing the rotation. More load needs more mechanical power (energy conservation).</p>',
            fi: '<p><b>Moottori.</b> Pyörivän ankkurin kelan läpi kulkeva vuo muuttuu, joten siihen indusoituu syöttöä vastustava jännite: <dfn data-term="backemf">vastajännite</dfn> <f>E</f>. Mitä nopeammin moottori pyörii, sitä suurempi <f>E</f> on; kuormittamattomana nopeus kasvaa, kunnes <f>E</f> on lähes yhtä suuri kuin syöttöjännite. Ankkurin resistanssi <f>R_a</f> rajoittaa virtaa vain erotusjännitteen <f>U − E</f> kautta.</p><p><b>Generaattori.</b> Ilman ulkoista piiriä syntyy jännite mutta ei virtaa, ja akseli pyörii kevyesti. Kuormitettuna kelan virtaan kohdistuu kentässä voimia, jotka muodostavat pyörimistä vastustavan <dfn data-term="countertorque">vastamomentin</dfn>. Suurempi kuorma vaatii suuremman mekaanisen tehon (energian säilyminen).</p>' } },
          { id: 't8-mot-f1', type: 'formula', key: true, tex: 'I = {U − E}/{R_a}', label: { en: 'DC motor armature current', fi: 'Tasavirtamoottorin ankkurivirta' } },
          { id: 't8-mot-i1', type: 'interactive', widget: 'readout', title: { en: 'Motor from start-up to full speed', fi: 'Moottori käynnistyksestä täyteen nopeuteen' },
            caption: { en: 'Set E = 0 for start-up (or a stalled rotor): the current is huge. At E = 108 V it is only 2.4 A.', fi: 'Aseta E = 0 käynnistykselle (tai jumittuneelle roottorille): virta on valtava. Kun E = 108 V, virta on vain 2,4 A.' },
            config: {
              params: [{ id: 'U', tex: 'U', min: 12, max: 240, step: 1, value: 120, unit: 'V' }, { id: 'Ra', tex: 'R_a', min: 1, max: 20, step: 0.5, value: 5, unit: 'Ω' }, { id: 'E', tex: 'E', min: 0, max: 120, step: 1, value: 108, unit: 'V' }],
              outputs: function (v) { var I = (v.U - v.E) / v.Ra; return [{ tex: 'I', value: I, unit: 'A' }, { tex: 'P_{in} = U·I', value: v.U * I, unit: 'W' }, { tex: 'P_{Ra} = I^2·R_a', value: I * I * v.Ra, unit: 'W' }, { tex: { en: 'P_{mech} = E·I', fi: 'P_{mek} = E·I' }, value: v.E * I, unit: 'W' }]; }
            } },
          { id: 't8-mot-ex1', type: 'example', title: { en: 'Start-up and running current (PDF example)', fi: 'Käynnistys- ja käyntivirta (PDF:n esimerkki)' },
            problem: { en: 'Armature resistance 5.0 Ω, supply 120 V, back emf 108 V at normal speed. Find the current a) at start-up, b) at full speed.', fi: 'Ankkurin resistanssi 5,0 Ω, syöttö 120 V, vastajännite 108 V normaalinopeudella. Laske virta a) käynnistyksessä, b) täydellä nopeudella.' },
            given: ['R_a = 5.0 Ω', 'U = 120 V', 'E = 108 V'],
            steps: [{ tex: { en: 'I_{start} = {120}/{5.0} = 24 A', fi: 'I_{käynn} = {120}/{5.0} = 24 A' } }, { tex: 'I = {120 − 108}/{5.0} = 2.4 A' }, { en: 'Extra: at full speed 288 W goes in, 28.8 W heats the armature and 259.2 W becomes mechanical power. A stalled motor dissipates 576 W and burns out.', fi: 'Lisä: täydellä nopeudella sisään menee 288 W, 28,8 W lämmittää ankkuria ja 259,2 W muuttuu mekaaniseksi tehoksi. Jumittunut moottori kuluttaa 576 W ja palaa.' }],
            result: { en: '24 A at start, 2.4 A at full speed', fi: '24 A käynnistyksessä, 2,4 A täydellä nopeudella' } },
          { id: 't8-mot-i2', type: 'interactive', widget: 'readout', title: { en: 'Generator under load (extra: PDF p20)', fi: 'Kuormitettu generaattori (lisä: PDF s. 20)' },
            caption: { en: 'Defaults: 50 r/s, N = 35, A = 0.12 m², B = 250 mT, load 15 Ω. Power in must exceed power out because of losses.', fi: 'Oletukset: 50 r/s, N = 35, A = 0,12 m², B = 250 mT, kuorma 15 Ω. Häviöiden vuoksi sisään tarvitaan enemmän tehoa kuin ulos saadaan.' },
            config: {
              params: [{ id: 'R', tex: 'R', min: 5, max: 100, step: 1, value: 15, unit: 'Ω' }, { id: 'eta', tex: 'η', min: 0.5, max: 1, step: 0.01, value: 0.8 }],
              outputs: function (v) {
                var w = 2 * Math.PI * 50, e0 = 35 * 0.25 * 0.12 * w, P = e0 * e0 / (2 * v.R);
                return [{ tex: 'e_0', value: e0, unit: 'V' }, { tex: 'I_{rms}', value: e0 / Math.SQRT2 / v.R, unit: 'A' }, { tex: 'P_{el}', value: P, unit: 'W' }, { tex: { en: 'P_{mech}', fi: 'P_{mek}' }, value: P / v.eta, unit: 'W' }, { tex: 'τ_{avg}', value: P / v.eta / w, unit: 'Nm' }];
              }
            } },
          { id: 't8-mot-c1', type: 'callout', kind: 'key', title: { en: 'Energy conservation', fi: 'Energian säilyminen' }, html: {
            en: 'Counter torque is not a loss; it is how the shaft hands over mechanical energy. With the PDF numbers the average output is P = e_0²/(2R) = 3.63 kW, and at 80 % efficiency 4.53 kW must be supplied to the shaft.',
            fi: 'Vastamomentti ei ole häviö, vaan tapa, jolla akseli luovuttaa mekaanista energiaa. PDF:n luvuilla keskimääräinen lähtöteho on P = e_0²/(2R) = 3,63 kW, ja 80 %:n hyötysuhteella akselille on syötettävä 4,53 kW.' } },
          { id: 't8-q11-blk', type: 'question', q: 't8-q11' }
        ]
      },
      // ---------------------------------------------------------------- 8.12
      {
        id: 't8-transformer', title: { en: 'Transformers', fi: 'Muuntajat' },
        blocks: [
          { id: 't8-tr-p1', type: 'text', html: {
            en: '<p>A <dfn data-term="transformer">transformer</dfn> raises or lowers an ac voltage. The primary (<f>N_P</f> turns) and secondary (<f>N_S</f> turns) sit on a <dfn data-term="laminated">laminated</dfn> iron core, which reduces <dfn data-term="eddy">eddy currents</dfn>. The alternating primary current makes a changing flux in the core; the same flux passes through the secondary and induces an emf there. Each turn sees the same <f>dΦ/dt</f>, so the voltages are in the ratio of the turns. A transformer works only with ac: with dc the flux is steady, <f>dΦ/dt = 0</f>, and no emf appears.</p>',
            fi: '<p><dfn data-term="transformer">Muuntaja</dfn> nostaa tai laskee vaihtojännitettä. Ensiö (<f>N_P</f> kierrosta) ja toisio (<f>N_S</f> kierrosta) ovat <dfn data-term="laminated">kerroksisella</dfn> rautasydämellä, mikä vähentää <dfn data-term="eddy">pyörrevirtoja</dfn>. Vaihtuva ensiövirta tuottaa sydämeen muuttuvan vuon; sama vuo kulkee toision läpi ja indusoi sinne jännitteen. Jokaisen kierroksen läpi kulkee sama dΦ/dt, joten jännitteiden suhde on kierrosten suhde. Muuntaja toimii vain vaihtovirralla: tasavirralla vuo on vakio, dΦ/dt = 0, eikä jännitettä synny.</p>' } },
          { id: 't8-tr-f1', type: 'formula', key: true, tex: '{U_S}/{U_P} = {N_S}/{N_P} = {I_P}/{I_S},  U_P · I_P = U_S · I_S', label: { en: 'Ideal transformer (no losses)', fi: 'Ideaalinen muuntaja (ei häviöitä)' } },
          { id: 't8-tr-i1', type: 'interactive', widget: 'readout', title: { en: 'Transformer ratios', fi: 'Muuntosuhteet' },
            caption: { en: 'Defaults: 230 V to 12 V, N_P = 1150 turns, giving N_S = 60. Step-up when N_S > N_P, step-down when N_S < N_P.', fi: 'Oletukset: 230 V → 12 V, N_P = 1150 kierrosta, jolloin N_S = 60. Jännitettä nostava, kun N_S > N_P, laskeva, kun N_S < N_P.' },
            config: {
              params: [{ id: 'Up', tex: 'U_P', min: 12, max: 400, step: 1, value: 230, unit: 'V' }, { id: 'Np', tex: 'N_P', min: 100, max: 2000, step: 50, value: 1150 }, { id: 'Ns', tex: 'N_S', min: 10, max: 4000, step: 10, value: 60 }, { id: 'R', tex: { en: 'R_{load}', fi: 'R_{kuorma}' }, min: 1, max: 100, step: 1, value: 6, unit: 'Ω' }],
              outputs: function (v) { var Us = v.Up * v.Ns / v.Np, Is = Us / v.R, P = Us * Is; return [{ tex: 'U_S', value: Us, unit: 'V' }, { tex: 'I_S', value: Is, unit: 'A' }, { tex: 'I_P', value: P / v.Up, unit: 'A' }, { tex: 'P', value: P, unit: 'W' }]; }
            } },
          // (extra)
          { id: 't8-tr-ex1', type: 'example', title: { en: 'A 12 V supply (extra)', fi: '12 V:n syöttö (lisä)' },
            problem: { en: 'A transformer lowers 230 V to 12 V; N_P = 1150 turns. Find N_S and the currents for a 24 W load.', fi: 'Muuntaja laskee 230 V:n jännitteen 12 V:ksi; N_P = 1150 kierrosta. Laske N_S ja virrat 24 W:n kuormalla.' },
            given: ['U_P = 230 V', 'U_S = 12 V', 'N_P = 1150', 'P = 24 W'],
            steps: [{ tex: 'N_S = N_P · {U_S}/{U_P} = 1150 · {12}/{230} = 60' }, { tex: 'I_S = {24}/{12} = 2.0 A, I_P = {24}/{230} = 0.104 A' }],
            result: { en: 'N_S = 60 turns, I_S = 2.0 A, I_P = 0.104 A', fi: 'N_S = 60 kierrosta, I_S = 2,0 A, I_P = 0,104 A' } },
          { id: 't8-tr-c1', type: 'callout', kind: 'warn', title: { en: 'Common mistake', fi: 'Yleinen virhe' }, html: {
            en: 'A step-up transformer does not create power. When the voltage goes up, the current goes down by the same factor.',
            fi: 'Jännitettä nostava muuntaja ei luo tehoa. Kun jännite kasvaa, virta pienenee samalla kertoimella.' } },
          { id: 't8-q12-blk', type: 'question', q: 't8-q12' }
        ]
      },
      // ---------------------------------------------------------------- 8.13
      {
        id: 't8-transmission', title: { en: 'Transmission of electric power', fi: 'Sähkötehon siirto' },
        blocks: [
          { id: 't8-trn-p1', type: 'text', html: {
            en: '<p>Power plants convert energy into electricity with ac generators. Step-up transformers raise the voltage to the transmission level (20 kV to 400 kV in Finland); near the customers, step-down transformers (often in several stages) lower it to the standard 230 V. The reason is the line loss. The current is <f>I = P/U</f> and the loss is <f>P_L = R·I²</f>, so ten times the voltage gives one hundredth of the loss.</p>',
            fi: '<p>Voimalaitokset muuttavat energian sähköksi vaihtovirtageneraattoreilla. Jännitettä nostavat muuntajat nostavat jännitteen siirtotasolle (Suomessa 20–400 kV); lähellä käyttäjiä jännitettä laskevat muuntajat (usein useassa vaiheessa) alentavat sen tavalliseen 230 V:n jännitteeseen. Syynä on johdon tehohäviö. Virta on <f>I = P/U</f> ja häviö <f>P_L = R·I²</f>, joten kymmenkertainen jännite antaa sadasosan häviöstä.</p>' } },
          { id: 't8-trn-fig', type: 'figure', caption: { en: 'Chain from generator to home. (The PDF figure uses US voltage levels, 12 kV and 240 V; Finland uses 230 V.)', fi: 'Ketju generaattorista kotiin. (PDF:n kuvassa on yhdysvaltalaiset jännitetasot, 12 kV ja 240 V; Suomessa on 230 V.)' },
            alt: { en: 'Block diagram of the power chain', fi: 'Sähkönsiirtoketjun lohkokaavio' },
            svg: { en: '<svg viewBox="0 0 520 90" xmlns="http://www.w3.org/2000/svg" font-size="11" text-anchor="middle" fill="currentColor"><g fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="25" width="70" height="40" rx="6"/><rect x="100" y="25" width="70" height="40" rx="6"/><rect x="200" y="25" width="100" height="40" rx="6"/><rect x="330" y="25" width="70" height="40" rx="6"/><rect x="430" y="25" width="86" height="40" rx="6"/><path d="M74 45H100M170 45H200M300 45H330M400 45H430" style="stroke:var(--c-flow)"/></g><text x="39" y="49">Generator</text><text x="135" y="43">Step-up</text><text x="135" y="57">transformer</text><text x="250" y="43">High-voltage</text><text x="250" y="57">line</text><text x="365" y="43">Step-down</text><text x="365" y="57">stages</text><text x="473" y="49">Home 230 V</text></svg>',
              fi: '<svg viewBox="0 0 520 90" xmlns="http://www.w3.org/2000/svg" font-size="11" text-anchor="middle" fill="currentColor"><g fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="25" width="70" height="40" rx="6"/><rect x="100" y="25" width="70" height="40" rx="6"/><rect x="200" y="25" width="100" height="40" rx="6"/><rect x="330" y="25" width="70" height="40" rx="6"/><rect x="430" y="25" width="86" height="40" rx="6"/><path d="M74 45H100M170 45H200M300 45H330M400 45H430" style="stroke:var(--c-flow)"/></g><text x="39" y="49" font-size="10">Generaattori</text><text x="135" y="43">Nosto-</text><text x="135" y="57">muuntaja</text><text x="250" y="43">Suurjännite-</text><text x="250" y="57">johto</text><text x="365" y="43">Jakelu-</text><text x="365" y="57">muuntajat</text><text x="473" y="49">Koti 230 V</text></svg>' } },
          { id: 't8-trn-i1', type: 'interactive', widget: 'plot', title: { en: 'Line loss against transmission voltage', fi: 'Johdon häviö siirtojännitteen funktiona' },
            caption: { en: 'Defaults: 120 kW over a line of 0.40 Ω. At 230 V the loss is 109 kW (91 %), at 230 kV only 0.11 W.', fi: 'Oletukset: 120 kW johdon yli, jonka resistanssi on 0,40 Ω. Jännitteellä 230 V häviö on 109 kW (91 %), jännitteellä 230 kV vain 0,11 W.' },
            config: {
              x: { min: 0.23, max: 400, log: true, label: { en: 'Transmission voltage U', fi: 'Siirtojännite U' }, unit: 'kV' },
              y: { min: 1e-7, max: 1e4, log: true, label: { en: 'Line loss P_L', fi: 'Häviöteho P_L' }, unit: 'kW' },
              params: [{ id: 'P', tex: 'P', min: 10, max: 1000, step: 10, value: 120, unit: 'kW' }, { id: 'R', tex: 'R', min: 0.1, max: 5, step: 0.1, value: 0.4, unit: 'Ω' }, { id: 'U', tex: 'U', min: 0.23, max: 400, value: 230, unit: 'kV', log: true }],
              curves: [{ fn: function (x, p) { return p.R * Math.pow(p.P / x, 2) / 1000; }, label: { en: 'P_L(U)', fi: 'P_L(U)' } }],
              points: function (p) { return [{ x: p.U, y: p.R * Math.pow(p.P / p.U, 2) / 1000 }]; },
              readouts: function (p) { var I = p.P / p.U; return [{ tex: 'I', value: I, unit: 'A' }, { tex: 'P_L', value: p.R * I * I, unit: 'W' }]; }
            } },
          { id: 't8-trn-ex1', type: 'example', title: { en: '120 kW over a 0.40 Ω line (PDF example)', fi: '120 kW 0,40 Ω:n johdolla (PDF:n esimerkki)' },
            problem: { en: 'P = 120 kW is sent over a line of total resistance 0.40 Ω. Find the line loss at a) 230 V and b) 230 kV.', fi: 'Tehoa P = 120 kW siirretään johdolla, jonka kokonaisresistanssi on 0,40 Ω. Laske johdon häviö, kun jännite on a) 230 V ja b) 230 kV.' },
            given: ['P = 120 kW', 'R = 0.40 Ω'],
            steps: [
              { tex: 'I = {120000}/{230} = 522 A, P_L = 0.40 · 522^2 = 109 kW' },
              { tex: 'I = {120000}/{230000} = 0.52 A, P_L = 0.40 · 0.52^2 = 0.11 W' },
              { en: 'The loss ratio is 1000² = 10⁶. Do not use P = U²/R for the loss: U is not the voltage across the line resistance. Case a) is unrealistic: the line would drop 209 V out of 230 V (extra).', fi: 'Häviöiden suhde on 1000² = 10⁶. Häviölle ei saa käyttää kaavaa P = U²/R: U ei ole johdon resistanssin yli vaikuttava jännite. Tapaus a) on epärealistinen: johdolla putoaisi 209 V 230 V:sta (lisä).' }
            ],
            result: { en: 'a) 109 kW (91 %), b) 0.11 W', fi: 'a) 109 kW (91 %), b) 0,11 W' } },
          { id: 't8-trn-c1', type: 'callout', kind: 'tip', title: { en: 'Extra: a real line', fi: 'Lisä: oikea johto' }, html: {
            en: '1 GW at 400 kV over R = 10 Ω: I = 2500 A, P_L = 62.5 MW, only 6.25 %.',
            fi: '1 GW 400 kV:n jännitteellä, R = 10 Ω: I = 2500 A, P_L = 62,5 MW, vain 6,25 %.' } },
          { id: 't8-q13-blk', type: 'question', q: 't8-q13' },
          { id: 't8-q14-blk', type: 'question', q: 't8-q14' }
        ]
      },
      // ---------------------------------------------------------------- 8.14
      {
        id: 't8-applications', title: { en: 'Applications of induction', fi: 'Induktion sovelluksia' },
        blocks: [
          { id: 't8-app-p1', type: 'text', html: {
            en: '<ul><li><b>Microphone:</b> a membrane carries a small coil in the field of a permanent magnet; sound moves the coil, the flux changes and a signal emf is induced.</li><li><b><dfn data-term="gfci">GFCI</dfn> (residual-current device):</b> fuses are too slow to protect people, and an ac current above about 50 mA can be fatal. The hot and neutral wires pass through an iron ring with a sensing coil. Normally the two currents are equal and opposite, so the net flux is zero. If part of the current leaks to earth, a net flux appears, the coil emf triggers an electronic circuit, and a solenoid opens the switch within a very short time. It trips at about 30 mA of net current.</li><li><b>Read/write head:</b> writing: the signal current magnetizes the moving tape or disk at the gap. Reading: the magnetized areas passing the gap change the flux and induce a signal proportional to what was written.</li></ul>',
            fi: '<ul><li><b>Mikrofoni:</b> kalvossa on pieni kela kestomagneetin kentässä; ääni liikuttaa kelaa, vuo muuttuu ja syntyy signaalijännite.</li><li><b><dfn data-term="gfci">Vikavirtasuojakytkin</dfn>:</b> sulakkeet ovat liian hitaita suojaamaan ihmistä, ja yli noin 50 mA:n vaihtovirta voi olla hengenvaarallinen. Vaihe- ja nollajohdin kulkevat rautarenkaan läpi, jossa on tunnistuskela. Normaalisti virrat ovat yhtä suuret ja vastakkaiset, joten nettovuo on nolla. Jos osa virrasta vuotaa maahan, syntyy nettovuo, kelan jännite laukaisee elektroniikan ja solenoidi avaa kytkimen hyvin nopeasti. Laukeaminen tapahtuu noin 30 mA:n nettovirralla.</li><li><b>Luku-/kirjoituspää:</b> kirjoitus: signaalivirta magnetoi liikkuvaa nauhaa tai levyä raossa. Luku: raon ohi kulkevat magnetoituneet alueet muuttavat vuota ja indusoivat kirjoitettua signaalia vastaavan jännitteen.</li></ul>' } },
          { id: 't8-app-fig', type: 'figure', caption: { en: 'GFCI principle: both wires through one ring; if the currents are not equal, the net flux triggers the switch.', fi: 'Vikavirtasuojan periaate: molemmat johtimet saman renkaan läpi; jos virrat eivät ole yhtä suuret, nettovuo laukaisee kytkimen.' },
            alt: { en: 'GFCI ring with hot and neutral wires', fi: 'Vikavirtarengas, vaihe- ja nollajohdin' },
            svg: { en: '<svg viewBox="0 0 380 130" xmlns="http://www.w3.org/2000/svg" font-size="11" fill="currentColor"><g fill="none" stroke="currentColor" stroke-width="2"><path d="M10 40H100M10 90H100" /><path d="M160 40H260M160 90H260"/><rect x="100" y="25" width="60" height="80" rx="10" style="stroke:var(--c-2)"/><rect x="260" y="30" width="70" height="70" rx="6"/><path d="M280 15l12 15" style="stroke:var(--c-1)"/></g><text x="12" y="34">Hot (L)</text><text x="12" y="84">Neutral (N)</text><text x="130" y="68" text-anchor="middle">ring</text><text x="295" y="70" text-anchor="middle">load</text><text x="190" y="120" text-anchor="middle">I_L − I_N = leakage</text></svg>',
              fi: '<svg viewBox="0 0 380 130" xmlns="http://www.w3.org/2000/svg" font-size="11" fill="currentColor"><g fill="none" stroke="currentColor" stroke-width="2"><path d="M10 40H100M10 90H100" /><path d="M160 40H260M160 90H260"/><rect x="100" y="25" width="60" height="80" rx="10" style="stroke:var(--c-2)"/><rect x="260" y="30" width="70" height="70" rx="6"/><path d="M280 15l12 15" style="stroke:var(--c-1)"/></g><text x="12" y="34">Vaihe (L)</text><text x="12" y="84">Nolla (N)</text><text x="130" y="68" text-anchor="middle">rengas</text><text x="295" y="70" text-anchor="middle">kuorma</text><text x="190" y="120" text-anchor="middle">I_L − I_N = vikavirta</text></svg>' } },
          { id: 't8-app-i1', type: 'interactive', widget: 'readout', title: { en: 'GFCI: leakage and tripping', fi: 'Vikavirtasuoja: vuoto ja laukeaminen' },
            caption: { en: 'A 230 V, 2 kW heater draws 8.70 A on both wires: net current 0. Leak current to earth and see when the 30 mA device trips.', fi: '230 V:n, 2 kW:n lämmitin ottaa 8,70 A molemmissa johtimissa: nettovirta 0. Lisää vuotovirtaa maahan ja katso, milloin 30 mA:n suoja laukeaa.' },
            config: {
              params: [{ id: 'leak', label: { en: 'Leakage to earth', fi: 'Vuoto maahan' }, min: 0, max: 0.06, step: 0.001, value: 0.01, unit: 'A' }],
              outputs: function (v) { return [{ label: { en: 'Net current through the ring', fi: 'Renkaan läpi kulkeva nettovirta' }, value: v.leak, unit: 'A' }, { label: { en: 'Trips at 30 mA?', fi: 'Laukeaa 30 mA:ssa?' }, value: v.leak >= 0.03 ? '✔ TRIP' : '– OK' }]; }
            } },
          { id: 't8-app-c1', type: 'callout', kind: 'info', title: { en: 'Example (extra)', fi: 'Esimerkki (lisä)' }, html: {
            en: 'A leakage of 40 mA is a 40 mA difference between hot and neutral. A 30 mA device trips; a 100 mA one would not.',
            fi: '40 mA:n vuoto tarkoittaa 40 mA:n eroa vaihe- ja nollajohtimen välillä. 30 mA:n suoja laukeaa; 100 mA:n suoja ei laukeaisi.' } },
          { id: 't8-q15-blk', type: 'question', q: 't8-q15' }
        ]
      },
      // ---------------------------------------------------------------- 8.15 + 8.16
      {
        id: 't8-inductance', title: { en: 'Mutual and self-inductance', fi: 'Keskinäis- ja itseisinduktanssi' },
        blocks: [
          { id: 't8-l-p1', type: 'text', html: {
            en: '<p><b><dfn data-term="mutual">Mutual inductance</dfn>.</b> If the current <f>I_1</f> in coil 1 changes, the flux through a nearby coil 2 changes and an emf is induced there. <f>M</f> depends on the relative position of the coils and on any ferromagnetic material, and <f>M_12 = M_21</f>. Unit: <f>1 H = 1 Vs/A = 1 Ω·s</f>. A transformer is mutual inductance at work.</p><p><b><dfn data-term="selfind">Self-inductance</dfn>.</b> A changing current in a single coil changes its own flux, and the induced emf opposes the change (Lenz). A coil with significant <f>L</f> is an <dfn data-term="inductor">inductor</dfn>.</p>',
            fi: '<p><b><dfn data-term="mutual">Keskinäisinduktanssi</dfn>.</b> Jos kelan 1 virta <f>I_1</f> muuttuu, viereisen kelan 2 läpi kulkeva vuo muuttuu ja siihen indusoituu jännite. <f>M</f> riippuu kelojen keskinäisestä asennosta ja ferromagneettisesta aineesta, ja <f>M_12 = M_21</f>. Yksikkö: <f>1 H = 1 Vs/A = 1 Ω·s</f>. Muuntaja on keskinäisinduktanssin sovellus.</p><p><b><dfn data-term="selfind">Itseisinduktanssi</dfn>.</b> Yksittäisen kelan muuttuva virta muuttaa sen omaa vuota, ja indusoitunut jännite vastustaa muutosta (Lenz). Kela, jolla on merkittävä <f>L</f>, on <dfn data-term="inductor">induktori</dfn>.</p>' } },
          { id: 't8-l-f1', type: 'formula', key: true, tex: 'e_2 = −M · {dI_1}/{dt},  e = −L · {dI}/{dt},  L = {N · Φ_B}/{I}', label: { en: 'Inductance', fi: 'Induktanssi' } },
          { id: 't8-l-ex1', type: 'example', title: { en: 'Mutual inductance (extra)', fi: 'Keskinäisinduktanssi (lisä)' },
            problem: { en: 'M = 20 mH. The current in coil 1 rises from 0 to 2 A in 10 ms. Find |e_2|.', fi: 'M = 20 mH. Kelan 1 virta nousee nollasta 2 A:iin ajassa 10 ms. Laske |e_2|.' },
            given: ['M = 20 mH', 'ΔI = 2 A', 'Δt = 10 ms'],
            steps: [{ tex: '|e_2| = M · {ΔI}/{Δt} = 0.020 · {2}/{0.010} = 4 V' }],
            result: { en: '|e_2| = 4 V', fi: '|e_2| = 4 V' } },
          { id: 't8-l-h2', type: 'h', text: { en: 'The solenoid', fi: 'Solenoidi' } },
          { id: 't8-l-p2', type: 'text', html: {
            en: '<p>A long <dfn data-term="solenoid">solenoid</dfn> (<f>N</f> turns, length <f>l</f>, radius <f>r</f>) has the field <f>B = μ·N·I/l</f> inside, flux <f>Φ_B = B·π r²</f> and so the inductance below, with <f>μ = μ_0·μ_r</f>. An iron core multiplies <f>L</f> by <f>μ_r</f>.</p>',
            fi: '<p>Pitkän <dfn data-term="solenoid">solenoidin</dfn> (<f>N</f> kierrosta, pituus <f>l</f>, säde <f>r</f>) sisällä kenttä on <f>B = μ·N·I/l</f>, vuo <f>Φ_B = B·π r²</f> ja siten alla oleva induktanssi, missä <f>μ = μ_0·μ_r</f>. Rautasydän kertoo <f>L</f>:n luvulla <f>μ_r</f>.</p>' } },
          { id: 't8-l-f2', type: 'formula', key: true, tex: 'L = {μ · N^2 · π r^2}/{l}', label: { en: 'Solenoid', fi: 'Solenoidi' } },
          { id: 't8-l-i1', type: 'interactive', widget: 'readout', title: { en: 'Solenoid inductance', fi: 'Solenoidin induktanssi' },
            caption: { en: 'Defaults are the PDF example: N = 150, l = 10 cm, r = 1.0 cm. Set μ_r = 1 (air) or 850 (iron).', fi: 'Oletukset ovat PDF:n esimerkki: N = 150, l = 10 cm, r = 1,0 cm. Aseta μ_r = 1 (ilma) tai 850 (rauta).' },
            config: {
              params: [{ id: 'N', tex: 'N', min: 10, max: 500, step: 10, value: 150 }, { id: 'l', tex: 'l', min: 0.02, max: 0.4, step: 0.01, value: 0.1, unit: 'm' }, { id: 'r', tex: 'r', min: 0.002, max: 0.05, step: 0.001, value: 0.01, unit: 'm' }, { id: 'mur', tex: 'μ_r', min: 1, max: 1000, value: 1, log: true }],
              outputs: function (v) { return [{ tex: 'L', value: MU0 * v.mur * v.N * v.N * Math.PI * v.r * v.r / v.l, unit: 'H' }]; }
            } },
          { id: 't8-l-ex2', type: 'example', title: { en: 'Inductance of a solenoid (PDF example)', fi: 'Solenoidin induktanssi (PDF:n esimerkki)' },
            problem: { en: 'N = 150, l = 10.0 cm, r = 1.0 cm. Find L a) in air and b) with an iron core, μ_r = 850.', fi: 'N = 150, l = 10,0 cm, r = 1,0 cm. Laske L a) ilmassa ja b) rautasydämellä, μ_r = 850.' },
            given: ['N = 150', 'l = 0.100 m', 'r = 0.010 m', 'μ_r = 850'],
            steps: [{ tex: 'L = {4π·10^-7 · 150^2 · π · 0.010^2}/{0.10} = 88.8 µH' }, { tex: { en: 'L_{iron} = 850 · 88.83 µH = 75.5 mH', fi: 'L_{rauta} = 850 · 88.83 µH = 75.5 mH' } }, { en: 'The slide prints 88.9 µH and 75.7 mH; the correct values are 88.8 µH and 75.5 mH. Extra: if the current changes 2 A in 1 ms the air coil gives |e| = 0.178 V.', fi: 'Kalvossa lukee 88,9 µH ja 75,7 mH; oikeat arvot ovat 88,8 µH ja 75,5 mH. Lisä: jos virta muuttuu 2 A ajassa 1 ms, ilmakela antaa |e| = 0,178 V.' }],
            result: { en: 'a) 88.8 µH, b) 75.5 mH', fi: 'a) 88,8 µH, b) 75,5 mH' } },
          { id: 't8-l-c1', type: 'callout', kind: 'tip', title: { en: 'Scaling (extra)', fi: 'Skaalaus (lisä)' }, html: {
            en: 'L grows with N² (double the turns: four times L) and falls with length (double the length: half of L).',
            fi: 'L kasvaa verrannollisena lukuun N² (kierrokset kaksinkertaistuvat: L nelinkertaistuu) ja pienenee pituuden kasvaessa (pituus kaksinkertaistuu: L puolittuu).' } },
          { id: 't8-q16-blk', type: 'question', q: 't8-q16' },
          { id: 't8-q17-blk', type: 'question', q: 't8-q17' }
        ]
      },
      // ---------------------------------------------------------------- 8.17
      {
        id: 't8-energy', title: { en: 'Energy stored in a magnetic field', fi: 'Magneettikenttään varastoitunut energia' },
        blocks: [
          { id: 't8-en-p1', type: 'text', html: {
            en: '<p>An inductor carrying a current stores energy, just as a capacitor stores energy in its electric field. For an ideal air solenoid, substituting <f>L = μ_0 N² A/l</f> and <f>I = B l/(μ_0 N)</f> gives the energy as a quantity of the field alone. Divide by the volume <f>A·l</f> to get the <dfn data-term="energydensity">energy density</dfn>; in a ferromagnetic material replace <f>μ_0</f> by <f>μ</f>.</p>',
            fi: '<p>Virtaa kuljettava induktori varastoi energiaa, aivan kuten kondensaattori varastoi energiaa sähkökenttään. Ideaaliselle ilmasolenoidille sijoittamalla <f>L = μ_0 N² A/l</f> ja <f>I = B l/(μ_0 N)</f> energia voidaan esittää pelkän kentän avulla. Jakamalla tilavuudella <f>A·l</f> saadaan <dfn data-term="energydensity">energiatiheys</dfn>; ferromagneettisessa aineessa <f>μ_0</f> korvataan arvolla <f>μ</f>.</p>' } },
          { id: 't8-en-f1', type: 'formula', key: true, tex: 'W = {1}/{2} · L · I^2,  u = {W}/{A · l} = {B^2}/{2μ_0}', label: { en: 'Energy and energy density', fi: 'Energia ja energiatiheys' },
            legend: [['W', { en: 'stored energy (U in the PDF)', fi: 'varastoitunut energia (PDF:ssä U)' }, 'J'], ['u', { en: 'energy density', fi: 'energiatiheys' }, 'J/m³']] },
          { id: 't8-en-i1', type: 'interactive', widget: 'readout', title: { en: 'Energy in the solenoid of the last section', fi: 'Edellisen osan solenoidin energia' },
            caption: { en: 'Air coil (N = 150, l = 10 cm, r = 1 cm) carrying I. Set μ_r = 850 to see 850 times more energy at the same current.', fi: 'Ilmakela (N = 150, l = 10 cm, r = 1 cm) virralla I. Aseta μ_r = 850, niin näet 850-kertaisen energian samalla virralla.' },
            config: {
              params: [{ id: 'I', tex: 'I', min: 0.1, max: 5, step: 0.1, value: 1, unit: 'A' }, { id: 'mur', tex: 'μ_r', min: 1, max: 1000, value: 1, log: true }],
              outputs: function (v) {
                var L = MU0 * v.mur * 150 * 150 * Math.PI * 1e-4 / 0.1, B = MU0 * v.mur * 150 * v.I / 0.1;
                return [{ tex: 'L', value: L, unit: 'H' }, { tex: 'W', value: 0.5 * L * v.I * v.I, unit: 'J' }, { tex: 'B', value: B, unit: 'T' }, { tex: 'u', value: B * B / (2 * MU0 * v.mur), unit: 'J/m³' }];
              }
            } },
          // (extra)
          { id: 't8-en-ex1', type: 'example', title: { en: 'Energy at 1 A (extra)', fi: 'Energia 1 A:lla (lisä)' },
            problem: { en: 'The air solenoid (L = 88.83 µH) carries 1 A. Find W, B and u, and check W = u·V.', fi: 'Ilmasolenoidin (L = 88,83 µH) virta on 1 A. Laske W, B ja u sekä tarkista W = u·V.' },
            given: ['L = 88.83 µH', 'I = 1 A', 'V = π · 0.01² · 0.1 = 31.4 cm³'],
            steps: [{ tex: 'W = {1}/{2} · 88.83·10^-6 · 1^2 = 44.4 µJ' }, { tex: 'B = {μ_0 N I}/{l} = {4π·10^-7 · 150 · 1}/{0.1} = 1.885 mT' }, { tex: 'u = {B^2}/{2μ_0} = 1.414 J/m³, u·V = 44.4 µJ' }, { en: 'A field of 1 T stores u = 3.98·10⁵ J/m³. With the iron core (μ_r = 850) the same current stores 37.8 mJ.', fi: '1 T:n kenttä varastoi u = 3,98·10⁵ J/m³. Rautasydämellä sama virta varastoi 37,8 mJ.' }],
            result: { en: 'W = 44.4 µJ, u = 1.41 J/m³', fi: 'W = 44,4 µJ, u = 1,41 J/m³' } },
          { id: 't8-en-c1', type: 'callout', kind: 'info', title: { en: 'Link to later topics', fi: 'Yhteys seuraaviin aiheisiin' }, html: {
            en: 'Inductor and capacitor are the two energy-storing parts of ac circuits: <f>W = ½ L I²</f> against <f>W = ½ C U²</f>.',
            fi: 'Induktori ja kondensaattori ovat vaihtovirtapiirien kaksi energiaa varastoivaa komponenttia: <f>W = ½ L I²</f> ja <f>W = ½ C U²</f>.' } },
          { id: 't8-q18-blk', type: 'question', q: 't8-q18' }
        ]
      }
    ],
    questions: [
      // ---- practice
      { id: 't8-q1', mode: 'practice', type: 'numeric', difficulty: 1, tol: 0.02,
        prompt: { en: 'A long straight wire carries 5 A. Find the field <f>B</f> at <f>r = 5 cm</f> from the wire.', fi: 'Pitkässä suorassa johtimessa kulkee 5 A. Laske kenttä <f>B</f> etäisyydellä <f>r = 5 cm</f> johtimesta.' },
        fields: [{ id: 'B', tex: 'B', unit: 'T' }],
        hints: [{ en: 'B = μ_0·I/(2π r)', fi: 'B = μ_0·I/(2π r)' }] },
      { id: 't8-q2', mode: 'practice', type: 'mc', difficulty: 1,
        prompt: { en: 'A long vertical wire carries a current upwards. Seen from above, the field lines around it run:', fi: 'Pitkässä pystysuorassa johtimessa kulkee virta ylöspäin. Ylhäältä katsoen sen ympärillä kenttäviivat kiertävät:' },
        options: [{ id: 'a', html: { en: 'clockwise', fi: 'myötäpäivään' } }, { id: 'b', html: { en: 'counter-clockwise', fi: 'vastapäivään' } }, { id: 'c', html: { en: 'radially outwards', fi: 'säteittäin ulospäin' } }, { id: 'd', html: { en: 'parallel to the wire', fi: 'johtimen suuntaisesti' } }] },
      { id: 't8-q3', mode: 'practice', type: 'slider', difficulty: 2, tol: 0.04,
        prompt: { en: 'I = 10 A, l = 5 m, B = 0.15 T. Adjust the angle <f>θ</f> (0 to 90°) so that the force is 3.75 N.', fi: 'I = 10 A, l = 5 m, B = 0,15 T. Säädä kulma <f>θ</f> (0–90°) niin, että voima on 3,75 N.' },
        widget: { name: 'readout', config: {
          params: [{ id: 'th', tex: 'θ', min: 0, max: 90, step: 1, value: 90, unit: '°' }],
          outputs: function (v) { return [{ tex: 'F', value: 10 * 5 * 0.15 * Math.sin(v.th * RAD), unit: 'N' }]; },
          answer: function (v) { return { v: v.th }; } } } },
      { id: 't8-q4', mode: 'practice', type: 'mc', difficulty: 2,
        prompt: { en: 'In Faraday\'s experiment the switch in the coil X circuit is opened after being closed for a long time. The galvanometer in coil Y:', fi: 'Faradayn kokeessa kelan X piirin kytkin avataan pitkän sulkuajan jälkeen. Kelan Y galvanometri:' },
        options: [{ id: 'a', html: { en: 'stays at zero', fi: 'pysyy nollassa' } }, { id: 'b', html: { en: 'deflects in the same direction as on closing', fi: 'poikkeaa samaan suuntaan kuin suljettaessa' } }, { id: 'c', html: { en: 'deflects in the opposite direction to closing', fi: 'poikkeaa vastakkaiseen suuntaan kuin suljettaessa' } }, { id: 'd', html: { en: 'deflects only if the iron core is removed', fi: 'poikkeaa vain, jos rautasydän poistetaan' } }] },
      { id: 't8-q5', mode: 'practice', type: 'fill', difficulty: 1,
        prompt: { en: 'Complete the flux formula.', fi: 'Täydennä vuon kaava.' },
        text: { en: 'The flux is <f>Φ_B = B·A·</f>[[a]]<f>(θ)</f>, where <f>θ</f> is the angle between <f>B</f> and the [[b]] vector of the loop.', fi: 'Vuo on <f>Φ_B = B·A·</f>[[a]]<f>(θ)</f>, missä <f>θ</f> on <f>B</f>:n ja silmukan [[b]]vektorin välinen kulma.' },
        fields: [{ id: 'a', kind: 'text' }, { id: 'b', kind: 'text' }] },
      { id: 't8-q6', mode: 'practice', type: 'mc', difficulty: 1,
        prompt: { en: 'Lenz\'s law says that the induced current opposes:', fi: 'Lenzin lain mukaan indusoitunut virta vastustaa:' },
        options: [{ id: 'a', html: { en: 'the flux itself', fi: 'itse vuota' } }, { id: 'b', html: { en: 'the emf', fi: 'lähdejännitettä' } }, { id: 'c', html: { en: 'the change of flux', fi: 'vuon muutosta' } }, { id: 'd', html: { en: 'the motion of the magnet only', fi: 'vain magneetin liikettä' } }] },
      { id: 't8-q7', mode: 'practice', type: 'match', difficulty: 3, points: 2,
        prompt: { en: 'A circular loop lies near a long straight wire in the plane of the page. Match each case with the induced current in the loop.', fi: 'Ympyrämäinen silmukka on paperin tasossa pitkän suoran johtimen lähellä. Yhdistä kukin tapaus silmukan indusoituneeseen virtaan.' },
        left: [
          { id: 'a', html: { en: 'wire below the loop, I to the left, increasing', fi: 'johdin silmukan alapuolella, I vasemmalle, kasvaa' } },
          { id: 'b', html: { en: 'wire above the loop, I to the right, decreasing', fi: 'johdin silmukan yläpuolella, I oikealle, pienenee' } },
          { id: 'c', html: { en: 'wire to the right, I constant', fi: 'johdin oikealla, I vakio' } },
          { id: 'd', html: { en: 'wire to the left, I up, increasing', fi: 'johdin vasemmalla, I ylös, kasvaa' } }],
        right: [{ id: 'cw', html: { en: 'clockwise', fi: 'myötäpäivään' } }, { id: 'ccw', html: { en: 'counter-clockwise', fi: 'vastapäivään' } }, { id: 'zero', html: { en: 'zero', fi: 'nolla' } }],
        hints: [
          { en: 'Use Lenz’s law: the induced current opposes the change of flux through the loop.', fi: 'Käytä Lenzin lakia: indusoitunut virta vastustaa silmukan läpi kulkevan vuon muutosta.' },
          { en: 'For each case, find the direction of the wire’s field B at the loop (right-hand rule), then decide whether the flux grows or falls.', fi: 'Selvitä jokaisessa tapauksessa johtimen kentän B suunta silmukan kohdalla (oikean käden sääntö) ja päätä, kasvaako vai pieneneekö vuo.' },
          { en: 'The induced field opposes a growing flux and supports a falling one.', fi: 'Indusoitunut kenttä vastustaa kasvavaa vuota ja tukee pienenevää.' }] },
      { id: 't8-q8', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.02,
        prompt: { en: 'An aeroplane flies at 1100 km/h. The vertical field component is 65 µT and the wing tips are 70 m apart. Find the emf between the wing tips.', fi: 'Lentokone lentää nopeudella 1100 km/h. Pystykenttäkomponentti on 65 µT ja siivenkärkien väli 70 m. Laske siivenkärkien välinen jännite.' },
        fields: [{ id: 'e', tex: 'e', unit: 'V' }] },
      { id: 't8-q9', mode: 'practice', type: 'mc', difficulty: 1,
        prompt: { en: 'A dc generator differs from an ac generator by:', fi: 'Tasavirtageneraattori eroaa vaihtovirtageneraattorista seuraavasti:' },
        options: [{ id: 'a', html: { en: 'a split-ring commutator instead of slip rings', fi: 'siinä on liukurenkaiden sijaan jaettu kommutaattori' } }, { id: 'b', html: { en: 'a stronger magnet', fi: 'siinä on voimakkaampi magneetti' } }, { id: 'c', html: { en: 'a stationary armature', fi: 'siinä on paikallaan pysyvä ankkuri' } }, { id: 'd', html: { en: 'no magnetic field', fi: 'siinä ei ole magneettikenttää' } }] },
      { id: 't8-q10', mode: 'practice', type: 'order', difficulty: 1,
        prompt: { en: 'Put the power transmission chain in order, from the power plant to the home.', fi: 'Järjestä sähkönsiirtoketju voimalaitokselta kotiin.' },
        items: [{ id: 'pole', html: { en: 'step-down transformer on the pole', fi: 'jakelumuuntaja pylväällä' } }, { id: 'gen', html: { en: 'ac generator', fi: 'vaihtovirtageneraattori' } }, { id: 'up', html: { en: 'step-up transformer', fi: 'jännitettä nostava muuntaja' } }, { id: 'sub', html: { en: 'substation step-down transformer', fi: 'sähköaseman muuntaja' } }, { id: 'line', html: { en: 'high-voltage transmission line', fi: 'suurjännitesiirtojohto' } }] },
      { id: 't8-q11', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.02,
        prompt: { en: 'A dc motor has armature resistance 5.0 Ω and a 120 V supply. Find the current at start-up and at full speed, where the back emf is 108 V.', fi: 'Tasavirtamoottorin ankkurin resistanssi on 5,0 Ω ja syöttö 120 V. Laske virta käynnistyksessä ja täydellä nopeudella, jolloin vastajännite on 108 V.' },
        fields: [{ id: 'start', label: { en: 'at start-up', fi: 'käynnistyksessä' }, unit: 'A' }, { id: 'run', label: { en: 'at full speed', fi: 'täydellä nopeudella' }, unit: 'A' }] },
      { id: 't8-q12', mode: 'practice', type: 'mc', difficulty: 2,
        prompt: { en: 'Why does a transformer not work with a dc source?', fi: 'Miksi muuntaja ei toimi tasajännitteellä?' },
        options: [{ id: 'a', html: { en: 'dΦ/dt = 0, so no emf is induced in the secondary', fi: 'dΦ/dt = 0, joten toisioon ei indusoidu jännitettä' } }, { id: 'b', html: { en: 'iron cannot carry dc flux', fi: 'rauta ei johda tasavirran vuota' } }, { id: 'c', html: { en: 'the primary current would be zero because of Lenz\'s law', fi: 'ensiövirta olisi Lenzin lain vuoksi nolla' } }, { id: 'd', html: { en: 'dc has no voltage', fi: 'tasavirralla ei ole jännitettä' } }] },
      { id: 't8-q13', mode: 'practice', type: 'mc', difficulty: 2,
        prompt: { en: 'The transmission voltage is raised ten times for the same transmitted power. The line loss changes by a factor:', fi: 'Siirtojännite nostetaan kymmenkertaiseksi samalle siirretylle teholle. Johdon häviö muuttuu kertoimella:' },
        options: [{ id: 'a', html: { en: '1/10', fi: '1/10' } }, { id: 'b', html: { en: '10', fi: '10' } }, { id: 'c', html: { en: '1/100', fi: '1/100' } }, { id: 'd', html: { en: '100', fi: '100' } }] },
      { id: 't8-q14', mode: 'practice', type: 'slider', difficulty: 3, tol: 0.1,
        prompt: { en: '120 kW is sent over a line of 0.40 Ω. Find the smallest transmission voltage for which the loss is at most 1 % of the power (1.2 kW).', fi: '120 kW siirretään 0,40 Ω:n johdolla. Etsi pienin siirtojännite, jolla häviö on enintään 1 % tehosta (1,2 kW).' },
        hints: [
          { en: 'The loss is the power dissipated in the line resistance: P_L = R·I².', fi: 'Häviö on johdon resistanssissa kuluva teho: P_L = R·I².' },
          { en: 'First find the largest allowed line current from P_L = 1.2 kW and R, then relate it to the voltage with P = U·I.', fi: 'Laske ensin suurin sallittu johtovirta ehdosta P_L = 1,2 kW ja R, ja yhdistä se jännitteeseen kaavalla P = U·I.' },
          { en: 'Larger U means smaller I, so the loss falls as U grows; you want the voltage at the limit current.', fi: 'Suurempi U tarkoittaa pienempää virtaa I, joten häviö pienenee jännitteen kasvaessa; etsit rajavirtaa vastaavaa jännitettä.' }],
        widget: { name: 'readout', config: {
          params: [{ id: 'U', tex: 'U', min: 230, max: 100000, value: 1000, unit: 'V', log: true }],
          outputs: function (v) { var I = 120000 / v.U; return [{ tex: 'I', value: I, unit: 'A' }, { tex: 'P_L', value: 0.4 * I * I, unit: 'W' }]; },
          answer: function (v) { return { v: v.U }; } } } },
      { id: 't8-q15', mode: 'practice', type: 'multi', difficulty: 2,
        prompt: { en: 'Which statements about a GFCI (residual-current device) are correct?', fi: 'Mitkä väitteet vikavirtasuojakytkimestä pitävät paikkansa?' },
        options: [{ id: 'a', html: { en: 'It senses the difference between hot and neutral currents', fi: 'Se havaitsee vaihe- ja nollajohtimen virtojen eron' } }, { id: 'b', html: { en: 'It works only with dc', fi: 'Se toimii vain tasavirralla' } }, { id: 'c', html: { en: 'It trips at about 30 mA', fi: 'Se laukeaa noin 30 mA:ssa' } }, { id: 'd', html: { en: 'It protects people faster than a fuse', fi: 'Se suojaa ihmistä nopeammin kuin sulake' } }] },
      { id: 't8-q16', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.02,
        prompt: { en: 'An air solenoid has N = 150 turns, length 10 cm and radius 1.0 cm. Find its inductance <f>L</f>.', fi: 'Ilmasolenoidissa on N = 150 kierrosta, pituus 10 cm ja säde 1,0 cm. Laske sen induktanssi <f>L</f>.' },
        fields: [{ id: 'L', tex: 'L', unit: 'H' }] },
      { id: 't8-q17', mode: 'practice', type: 'match', difficulty: 1,
        prompt: { en: 'Match each unit with its quantity.', fi: 'Yhdistä yksikkö ja suure.' },
        left: [{ id: 'T', html: { en: 'tesla (T)', fi: 'tesla (T)' } }, { id: 'Wb', html: { en: 'weber (Wb)', fi: 'weber (Wb)' } }, { id: 'Am', html: { en: 'A/m', fi: 'A/m' } }, { id: 'H', html: { en: 'henry (H)', fi: 'henry (H)' } }],
        right: [{ id: 'B', html: { en: 'flux density B', fi: 'vuontiheys B' } }, { id: 'phi', html: { en: 'magnetic flux', fi: 'magneettivuo' } }, { id: 'h', html: { en: 'field strength H', fi: 'kentänvoimakkuus H' } }, { id: 'l', html: { en: 'inductance', fi: 'induktanssi' } }] },
      { id: 't8-q18', mode: 'practice', type: 'numeric', difficulty: 1, tol: 0.02,
        prompt: { en: 'An inductor of 88.8 µH carries 1 A. How much energy is stored in it?', fi: '88,8 µH:n induktorin läpi kulkee 1 A. Kuinka paljon energiaa siihen on varastoitunut?' },
        fields: [{ id: 'W', tex: 'W', unit: 'J' }] },
      // ---- graded
      { id: 't8-g1', mode: 'graded', type: 'mc', difficulty: 1, points: 1,
        prompt: { en: 'A long straight wire carries 15 A. The field at 2.0 cm is 150 µT. What is it at 20 cm?', fi: 'Pitkässä suorassa johtimessa kulkee 15 A. Kenttä 2,0 cm:n etäisyydellä on 150 µT. Mikä se on 20 cm:n etäisyydellä?' },
        options: [{ id: 'a', html: { en: '1.5 µT', fi: '1,5 µT' } }, { id: 'b', html: { en: '15 µT', fi: '15 µT' } }, { id: 'c', html: { en: '150 µT', fi: '150 µT' } }, { id: 'd', html: { en: '1.5 mT', fi: '1,5 mT' } }] },
      { id: 't8-g2', mode: 'graded', type: 'numeric', difficulty: 1, points: 2, tol: 0.02,
        prompt: { en: 'A 5 m wire carries 10 A perpendicular to a uniform field of 150 mT. Find the force on the wire.', fi: '5 m:n johtimessa kulkee 10 A kohtisuoraan 150 mT:n tasaista kenttää vastaan. Laske johtimeen kohdistuva voima.' },
        fields: [{ id: 'F', tex: 'F', unit: 'N' }] },
      { id: 't8-g3', mode: 'graded', type: 'multi', difficulty: 2, points: 2,
        prompt: { en: 'Which of these induce an emf in a coil?', fi: 'Mitkä seuraavista indusoivat kelaan jännitteen?' },
        options: [{ id: 'a', html: { en: 'a magnet moving towards the coil', fi: 'magneetti liikkuu kelaa kohti' } }, { id: 'b', html: { en: 'a magnet at rest inside the coil', fi: 'magneetti on levossa kelan sisällä' } }, { id: 'c', html: { en: 'switching on the current of a nearby coil', fi: 'viereisen kelan virran kytkeminen päälle' } }, { id: 'd', html: { en: 'rotating the coil in a uniform field', fi: 'kelan pyörittäminen tasaisessa kentässä' } }] },
      { id: 't8-g4', mode: 'graded', type: 'numeric', difficulty: 2, points: 2, tol: 0.03,
        prompt: { en: 'A 25-turn circular coil of radius 15 cm lies perpendicular to a field that grows at 0.15 T/s. Find the magnitude of the induced emf.', fi: '25 kierroksen ympyräkela, säde 15 cm, on kohtisuorassa kenttää vastaan, joka kasvaa nopeudella 0,15 T/s. Laske indusoituneen jännitteen suuruus.' },
        hints: [
          { en: 'Use Faraday’s law for a coil: |e| = N·dΦ/dt.', fi: 'Käytä Faradayn lakia kelalle: |e| = N·dΦ/dt.' },
          { en: 'The coil is perpendicular to B, so Φ = B·A. The area A is that of a circle of radius r; B is the only changing quantity.', fi: 'Kela on kohtisuorassa kenttään B nähden, joten Φ = B·A. Pinta-ala A on r-säteisen ympyrän pinta-ala; vain B muuttuu.' },
          { en: 'Then dΦ/dt = A·dB/dt. Compute A first (mind the unit of the radius), then multiply by dB/dt and N.', fi: 'Tällöin dΦ/dt = A·dB/dt. Laske ensin A (huomaa säteen yksikkö) ja kerro sitten dB/dt:llä ja N:llä.' }],
        fields: [{ id: 'e', tex: '|e|', unit: 'V' }] },
      { id: 't8-g5', mode: 'graded', type: 'numeric', difficulty: 2, points: 2, tol: 0.03,
        prompt: { en: 'A rectangular loop of 30 cm × 40 cm turns at 50 revolutions per second in a field of 250 mT. How many loops are needed for a peak emf of 325 V?', fi: 'Suorakulmainen silmukka, 30 cm × 40 cm, pyörii 50 kierrosta sekunnissa 250 mT:n kentässä. Montako kierrosta tarvitaan, jotta huippujännite on 325 V?' },
        hints: [
          { en: 'A loop rotating in a uniform field gives a sinusoidal emf: e = N·B·A·ω·sin(ωt).', fi: 'Tasaisessa kentässä pyörivä silmukka tuottaa sinimuotoisen jännitteen: e = N·B·A·ω·sin(ωt).' },
          { en: 'The peak value is e₀ = N·B·A·ω. Find A from the sides and ω from the frequency: ω = 2π f.', fi: 'Huippuarvo on e₀ = N·B·A·ω. Laske A sivuista ja ω taajuudesta: ω = 2π f.' },
          { en: 'Solve the formula for N and substitute e₀, B, A and ω.', fi: 'Ratkaise kaavasta N ja sijoita e₀, B, A ja ω.' }],
        fields: [{ id: 'N', tex: 'N' }] },
      { id: 't8-g6', mode: 'graded', type: 'numeric', difficulty: 1, points: 2, tol: 0.02,
        prompt: { en: 'A transformer has N_P = 1150 turns and takes 230 V. How many secondary turns give 12 V?', fi: 'Muuntajan ensiössä on N_P = 1150 kierrosta ja siihen syötetään 230 V. Montako toisiokierrosta tarvitaan 12 V:n jännitteeseen?' },
        fields: [{ id: 'Ns', tex: 'N_S' }] }
    ]
  });
})();

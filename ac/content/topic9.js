/* Topic 9: AC quantities and series circuits. Source: EE9 ACSeriesCircuits.pdf. NO answers in this file (see src/answers/topic9.json). */
(function () {
  var PI = Math.PI, D = PI / 180, TAU = 2 * PI, SQ2 = Math.SQRT2;
  var U = function () { return TDC.util; };

  // ---- small helpers -------------------------------------------------------------------------------------------
  function q(id) { return { id: id + '-blk', type: 'question', q: id }; }
  function pts(fn, n, x0, x1, w, h, y0, sc) { // polyline points for the mini waveform figure
    var s = [], i; for (i = 0; i <= n; i++) { var x = i / n; s.push((x0 + x * w).toFixed(1) + ',' + (y0 - fn(x) * sc).toFixed(1)); } return s.join(' ');
  }
  // Four waveform shapes (sine, triangle, square, sawtooth) as one inline SVG.
  function shapesSvg() {
    var f = [
      function (x) { return Math.sin(TAU * x); },
      function (x) { return x < 0.25 ? 4 * x : x < 0.75 ? 2 - 4 * x : 4 * x - 4; },
      function (x) { return x < 0.5 ? 1 : -1; },
      function (x) { return 2 * x - 1; }
    ];
    var out = '<svg viewBox="0 0 340 80" xmlns="http://www.w3.org/2000/svg" fill="none" stroke-width="2">';
    f.forEach(function (fn, k) {
      var x0 = 8 + k * 83;
      out += '<path d="M' + x0 + ' 40H' + (x0 + 74) + '" stroke="currentColor" stroke-width="1" opacity=".5"/>' +
        '<polyline points="' + pts(fn, k === 2 ? 4 : 60, x0, 0, 74, 0, 40, 28) + '" style="stroke:var(--c-' + (k + 1) + ')"/>';
    });
    return out + '</svg>';
  }
  // dc with ripple (never negative) against an ac wave
  function rippleSvg() {
    var ac = pts(function (x) { return 9.5 * Math.sin(TAU * x * 3); }, 180, 30, 0, 280, 0, 70, 5.5);
    var dc = pts(function (x) { return 4 + 1.5 * Math.sin(TAU * x * 3); }, 180, 30, 0, 280, 0, 70, 5.5);
    return '<svg viewBox="0 0 330 140" xmlns="http://www.w3.org/2000/svg" fill="none" stroke-width="2"><path d="M30 70H318M30 8V132" stroke="currentColor" stroke-width="1"/>' +
      '<polyline points="' + ac + '" style="stroke:var(--c-2)"/><polyline points="' + dc + '" style="stroke:var(--c-1)"/>' +
      '<g fill="currentColor" stroke="none" font-size="11"><text x="4" y="14">+9.5</text><text x="4" y="74">0</text><text x="4" y="130">-9.5</text><text x="320" y="66" text-anchor="end">t</text></g></svg>';
  }

  // Wave in space and time: lambda = c / f. Slider panel above the canvas (house style).
  function waveMount(host, ctx) {
    var panel = TDC.viz.params([
      { id: 'f', tex: 'f', min: 50, max: 1e9, value: 50, unit: 'Hz', log: true },
      { id: 'k', label: { en: 'Speed factor v/c_0', fi: 'Nopeuskerroin v/c_0' }, min: 0.5, max: 1, step: 0.01, value: 1 }
    ], function () { note.update(); }, ctx);
    host.insertBefore(panel, host.firstChild);
    function len(m) { return m >= 1000 ? U().fmtNum(m / 1000, 3) + ' km' : m >= 1 ? U().fmtNum(m, 3) + ' m' : m >= 1e-3 ? U().fmtNum(m * 1e3, 3) + ' mm' : U().fmtNum(m * 1e6, 3) + ' µm'; }
    var cv = TDC.viz.canvas(host, { aspect: function (w) { return w < 520 ? 0.5 : 0.32; }, draw: function (g, w, h, t) {
      var f = panel.values.f, k = panel.values.k, lam = k * 3e8 / f;
      g.clearRect(0, 0, w, h);
      var fg = ctx.color('--fg'), muted = ctx.color('--muted'), x0 = 24, x1 = w - 16, lw = (x1 - x0) / 3, mid = h * 0.56, amp = h * 0.3;
      g.strokeStyle = muted; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, mid); g.lineTo(x1, mid); g.stroke();
      g.strokeStyle = ctx.color('--c-1'); g.lineWidth = 3; g.beginPath();
      for (var x = x0; x <= x1; x += 2) { var y = mid - amp * Math.sin(TAU * ((x - x0) / lw - 0.4 * t)); if (x === x0) g.moveTo(x, y); else g.lineTo(x, y); }
      g.stroke();
      // λ bracket from crest to crest, riding with the wave. Each bracket fades with cos² of its distance from the
      // middle, so the two brackets in view always add up to full opacity (no jump when one leaves).
      var ya = mid - amp - 14, first = (0.25 + 0.4 * t) % 1;
      g.font = Math.max(12, Math.round(h * 0.06)) + 'px sans-serif'; g.textAlign = 'center';
      for (var n = 0; first + n + 1 <= 3; n++) {
        var c = x0 + (first + n) * lw, d = first + n - 1, a = Math.cos(Math.PI / 2 * d); a *= a;
        if (a < 0.02) continue;
        g.globalAlpha = a; g.strokeStyle = fg; g.fillStyle = fg; g.lineWidth = 1.5; g.beginPath();
        g.moveTo(c, ya); g.lineTo(c + lw, ya); g.moveTo(c, ya - 5); g.lineTo(c, ya + 5); g.moveTo(c + lw, ya - 5); g.lineTo(c + lw, ya + 5); g.stroke();
        g.setLineDash([3, 3]); g.lineWidth = 1; g.beginPath(); g.moveTo(c, ya + 5); g.lineTo(c, mid - amp); g.moveTo(c + lw, ya + 5); g.lineTo(c + lw, mid - amp); g.stroke(); g.setLineDash([]);
        g.fillText('λ = ' + len(lam), c + lw / 2, ya - 8);
      }
      g.globalAlpha = 1;
    } });
    // Wrapping DOM text below the canvas (canvas text cannot wrap on phones).
    var note = ctx.el('p', { class: 'muted' });
    note.update = function () {
      var f = panel.values.f, lam = panel.values.k * 3e8 / f;
      note.textContent = ctx.tx({ en: 'Snapshot of u(x): three wavelengths shown (not to scale); the wave moves to the right.', fi: 'Hetkellinen kuva u(x): kolme aallonpituutta (ei mittakaavassa); aalto etenee oikealle.' }) +
        '  T = 1/f = ' + U().fmtSI(1 / f, 's', 3) + ',  λ = v·T = ' + len(lam);
    };
    host.appendChild(note); note.update(); ctx.onLang(note.update);
    return { destroy: cv.destroy };
  }

  // Series RLC helper (all in SI)
  function rlc(R, L, C, f) {
    var w = TAU * f, XL = w * L, XC = 1 / (w * C), X = XL - XC, Z = Math.hypot(R, X);
    return { w: w, XL: XL, XC: XC, X: X, Z: Z, phi: Math.atan2(X, R) / D };
  }

  TDC.registerTopic({
    id: 't9', num: 9,
    title: { en: 'AC quantities and series circuits', fi: 'Vaihtosähkösuureet ja sarjapiirit' },
    subtitle: { en: 'Sine waves, phasors, rms values, reactance, impedance, power and series resonance.', fi: 'Siniaallot, osoittimet, tehollisarvot, reaktanssi, impedanssi, teho ja sarjaresonanssi.' },
    objectives: [
      { en: 'describe ac waveforms with period, frequency, angular frequency and wavelength', fi: 'kuvata vaihtosähköaaltomuotoja jaksonajan, taajuuden, kulmataajuuden ja aallonpituuden avulla' },
      { en: 'write a sine wave as v(t) = V_m sin(ωt + φ_0) and read phase differences between voltage and current', fi: 'kirjoittaa siniaalto muodossa v(t) = V_m sin(ωt + φ_0) ja lukea jännitteen ja virran vaihe-eron' },
      { en: 'represent sinusoidal quantities as rotating phasors and complex numbers', fi: 'esittää sinimuotoiset suureet pyörivinä osoittimina ja kompleksilukuina' },
      { en: 'convert between peak, peak-to-peak, rms and average values and explain what a multimeter reads', fi: 'muuntaa huippu-, huipusta huippuun -, tehollis- ja keskiarvoja toisikseen ja selittää, mitä yleismittari näyttää' },
      { en: 'calculate X_C, X_L, impedance Z, phase angle φ and the component voltages of RL, RC and RLC series circuits', fi: 'laskea RL-, RC- ja RLC-sarjapiirin X_C, X_L, impedanssi Z, vaihekulma φ ja komponenttijännitteet' },
      { en: 'calculate active, reactive and apparent power and the power factor', fi: 'laskea pätö-, lois- ja näennäisteho sekä tehokerroin' },
      { en: 'find the resonant frequency, Q-factor and bandwidth of a series resonant circuit', fi: 'määrittää sarjaresonanssipiirin resonanssitaajuuden, hyvyysluvun ja kaistanleveyden' }
    ],
    glossary: {
      ac: { en: 'alternating current (ac) / voltage', fi: 'vaihtovirta / vaihtojännite', def: { en: 'Current or voltage whose polarity changes periodically.', fi: 'Virta tai jännite, jonka napaisuus vaihtuu jaksollisesti.' } },
      dc: { en: 'direct current (dc)', fi: 'tasavirta', def: { en: 'Current that never changes direction, even if it has ripple.', fi: 'Virta, joka ei koskaan vaihda suuntaansa, vaikka siinä olisi aaltoisuutta.' } },
      ripple: { en: 'ripple', fi: 'aaltoisuus', def: { en: 'Small ac variation on top of a dc level.', fi: 'Tasajännitteen päällä oleva pieni vaihtelu.' } },
      waveform: { en: 'waveform', fi: 'aaltomuoto', def: { en: 'Shape of a quantity against time: sine, triangle, square, sawtooth.', fi: 'Suureen kuvaaja ajan funktiona: sini-, kolmio-, suorakulma- tai saha-aalto.' } },
      sinewave: { en: 'sine wave', fi: 'sinimuotoinen aalto', def: { en: 'v(t) = V_m sin(ωt + φ_0).', fi: 'v(t) = V_m sin(ωt + φ_0).' } },
      period: { en: 'period', fi: 'jaksonaika', sym: 'T = 1/f', def: { en: 'Time of one full cycle. Unit s.', fi: 'Yhden täyden jakson kesto. Yksikkö s.' } },
      frequency: { en: 'frequency', fi: 'taajuus', sym: 'f = 1/T', def: { en: 'Number of cycles per second. Unit hertz (Hz).', fi: 'Jaksojen lukumäärä sekunnissa. Yksikkö hertsi (Hz).' } },
      angfreq: { en: 'angular frequency', fi: 'kulmataajuus', sym: 'ω = 2πf', def: { en: 'Rate of change of the phase angle. Unit rad/s.', fi: 'Vaihekulman muutosnopeus. Yksikkö rad/s.' } },
      radian: { en: 'radian', fi: 'radiaani', def: { en: 'Angle unit: 180° = π rad. A ratio, dimensionless.', fi: 'Kulman yksikkö: 180° = π rad. Suhdeluku, dimensioton.' } },
      phasor: { en: 'phasor', fi: 'osoitin', def: { en: 'Rotating vector whose length is the amplitude and whose angle is the phase; its height is the sine wave.', fi: 'Pyörivä vektori, jonka pituus on amplitudi ja kulma vaihe; sen korkeus on siniaalto.' } },
      phasordiagram: { en: 'phasor diagram', fi: 'osoitinpiirros', def: { en: 'Drawing of phasors of the same frequency at t = 0.', fi: 'Samantaajuisten osoittimien piirros hetkellä t = 0.' } },
      complexnumber: { en: 'complex number', fi: 'kompleksiluku', sym: 'z = a + jb', def: { en: 'Number with a real and an imaginary part; z = r∠φ = r·e^{jφ}.', fi: 'Luku, jolla on reaali- ja imaginaariosa; z = r∠φ = r·e^{jφ}.' } },
      imagunit: { en: 'imaginary unit', fi: 'imaginääriyksikkö', sym: 'j = √-1', def: { en: 'Written j in electrical engineering because i is the current.', fi: 'Sähkötekniikassa j, koska i on virta.' } },
      magnitude: { en: 'magnitude (absolute value) / argument', fi: 'itseisarvo (moduuli) / argumentti (vaihekulma)', def: { en: '|z| = √(a² + b²) and φ = arctan(b/a).', fi: '|z| = √(a² + b²) ja φ = arctan(b/a).' } },
      wavelength: { en: 'wavelength', fi: 'aallonpituus', sym: 'λ = c/f', def: { en: 'Distance the wave travels in one period. Unit m.', fi: 'Matka, jonka aalto etenee yhdessä jaksossa. Yksikkö m.' } },
      instvalue: { en: 'instantaneous value', fi: 'hetkellisarvo', def: { en: 'Value of v(t) at one moment.', fi: 'Suureen v(t) arvo yhdellä hetkellä.' } },
      peakamp: { en: 'peak value / amplitude', fi: 'huippuarvo / amplitudi', sym: 'V_m', def: { en: 'Largest value of a half cycle.', fi: 'Puolijakson suurin arvo.' } },
      pkpk: { en: 'peak-to-peak value', fi: 'huipusta huippuun -arvo', sym: 'V_pp', def: { en: 'Maximum minus minimum; 2 V_m for a symmetric wave.', fi: 'Suurin arvo miinus pienin arvo; symmetrisellä aallolla 2 V_m.' } },
      average: { en: 'average (mean) value', fi: 'keskiarvo', def: { en: 'Of a symmetric ac quantity: the average over a half cycle.', fi: 'Symmetrisellä vaihtosuureella: keskiarvo puolijakson yli.' } },
      acrms: { en: 'rms (effective) value', fi: 'tehollisarvo', sym: 'V = V_m/√2', def: { en: 'The dc value that heats a resistor as much as the ac quantity does.', fi: 'Tasasuureen arvo, joka lämmittää vastusta yhtä paljon kuin vaihtosuure.' } },
      initphase: { en: 'initial phase angle', fi: 'alkuvaihekulma', sym: 'φ_0', def: { en: 'Phase angle at t = 0.', fi: 'Vaihekulma hetkellä t = 0.' } },
      phasediff: { en: 'phase difference', fi: 'vaihe-ero', sym: 'φ = φ_u − φ_i', def: { en: 'Angle of voltage minus angle of current. φ > 0: voltage leads (inductive).', fi: 'Jännitteen kulma miinus virran kulma. φ > 0: jännite on edellä (induktiivinen).' } },
      leadlag: { en: 'leads / lags', fi: 'edellä / jäljessä', def: { en: 'A wave that reaches its peak earlier leads; later, lags.', fi: 'Aalto, joka saavuttaa huippunsa aiemmin, on edellä; myöhemmin, jäljessä.' } },
      formfactor: { en: 'form factor', fi: 'muotokerroin', sym: 'k_m = rms/average', def: { en: 'Ratio of rms to rectified average; 1.11 for a sine.', fi: 'Tehollisarvon ja tasasuunnatun keskiarvon suhde; siniaallolla 1,11.' } },
      peakfactor: { en: 'peak factor (crest factor)', fi: 'huippukerroin', def: { en: 'Ratio of the maximum to the rms value; √2 for a sine.', fi: 'Maksimiarvon ja tehollisarvon suhde; siniaallolla √2.' } },
      rectifier: { en: 'rectifier (full-wave / half-wave)', fi: 'tasasuuntaaja (kokoaalto- / puoliaaltotasasuuntaaja)', def: { en: 'Circuit with diodes that turns ac into one-directional voltage.', fi: 'Diodeilla toteutettu piiri, joka muuttaa vaihtojännitteen yksisuuntaiseksi.' } },
      multimeter: { en: 'multimeter', fi: 'yleismittari', def: { en: 'Meter for U, I and R. In ac a simple one shows average × 1.11, a TRMS one the true rms.', fi: 'Mittari jännitteelle, virralle ja resistanssille. Vaihtosähköllä yksinkertainen näyttää keskiarvo × 1,11, TRMS-mittari todellisen tehollisarvon.' } },
      reactance: { en: 'reactance', fi: 'reaktanssi', sym: 'X', def: { en: 'Imaginary part of the impedance. Unit Ω.', fi: 'Impedanssin imaginaariosa. Yksikkö Ω.' } },
      xc: { en: 'capacitive reactance', fi: 'kapasitiivinen reaktanssi', sym: 'X_C = 1/(ωC)', def: { en: 'Falls with frequency; the current leads the voltage by 90°.', fi: 'Pienenee taajuuden kasvaessa; virta on 90° jännitettä edellä.' } },
      xl: { en: 'inductive reactance', fi: 'induktiivinen reaktanssi', sym: 'X_L = ωL', def: { en: 'Grows with frequency; the voltage leads the current by 90°.', fi: 'Kasvaa taajuuden kasvaessa; jännite on 90° virtaa edellä.' } },
      impedance: { en: 'impedance', fi: 'impedanssi', sym: 'Z', def: { en: 'Ratio U/I as a complex number; Z = R + jX. Unit Ω.', fi: 'Suhde U/I kompleksilukuna; Z = R + jX. Yksikkö Ω.' } },
      imptriangle: { en: 'impedance triangle', fi: 'impedanssikolmio', def: { en: 'Right triangle with R, X and Z.', fi: 'Suorakulmainen kolmio, jonka sivut ovat R, X ja Z.' } },
      voltriangle: { en: 'voltage triangle', fi: 'jännitekolmio', def: { en: 'Impedance triangle multiplied by I.', fi: 'Impedanssikolmio kerrottuna virralla I.' } },
      activepower: { en: 'active power', fi: 'pätöteho', sym: 'P = UI cos φ', def: { en: 'Power converted to heat or work. Unit W.', fi: 'Lämmöksi tai työksi muuttuva teho. Yksikkö W.' } },
      reactivepower: { en: 'reactive power', fi: 'loisteho', sym: 'Q = UI sin φ', def: { en: 'Power swinging between source and field. Unit var.', fi: 'Lähteen ja kentän välillä heilahteleva teho. Yksikkö var.' } },
      apparentpower: { en: 'apparent power', fi: 'näennäisteho', sym: 'S = UI', def: { en: 'S = √(P² + Q²). Unit VA.', fi: 'S = √(P² + Q²). Yksikkö VA.' } },
      powertriangle: { en: 'power triangle', fi: 'tehokolmio', def: { en: 'Right triangle with P, Q and S.', fi: 'Suorakulmainen kolmio, jonka sivut ovat P, Q ja S.' } },
      powerfactor: { en: 'power factor', fi: 'tehokerroin', sym: 'PF = P/S', def: { en: 'Equals cos φ for a sine wave; distortion makes it smaller.', fi: 'Sinimuotoisella aallolla cos φ; särö pienentää sitä.' } },
      cosphi: { en: 'displacement factor (cos φ)', fi: 'siirtymätehokerroin (cos φ)', def: { en: 'Depends only on the phase angle between fundamentals.', fi: 'Riippuu vain perusaaltojen vaihekulmasta.' } },
      harmonics: { en: 'harmonics / overtones', fi: 'yliaallot', def: { en: 'Components at multiples of the fundamental frequency.', fi: 'Perustaajuuden kerrannaistaajuuksien komponentit.' } },
      compensation: { en: 'compensation of power factor', fi: 'loistehon kompensointi', def: { en: 'Adding a capacitor to cancel inductive reactive power.', fi: 'Kondensaattorin lisääminen induktiivisen loistehon kumoamiseksi.' } },
      seriescircuit: { en: 'series circuit', fi: 'sarjapiiri, sarjaankytkentä', def: { en: 'All parts carry the same current.', fi: 'Kaikissa osissa kulkee sama virta.' } },
      seriesres: { en: 'series resonance', fi: 'sarjaresonanssi', def: { en: 'X_L = X_C: φ = 0, Z = R, the current is largest.', fi: 'X_L = X_C: φ = 0, Z = R, virta on suurimmillaan.' } },
      resfreq: { en: 'resonant frequency', fi: 'resonanssitaajuus', sym: 'f_r = 1/(2π√(LC))', def: { en: 'Frequency at which X_L = X_C.', fi: 'Taajuus, jolla X_L = X_C.' } },
      qfactor: { en: 'Q-factor', fi: 'hyvyysluku, Q-arvo', sym: 'Q = ω_r L/R', def: { en: 'Measures the loss of a resonant circuit; U_L = U_C = Q·U at resonance.', fi: 'Kuvaa resonanssipiirin häviöitä; resonanssissa U_L = U_C = Q·U.' } },
      bandwidth: { en: 'bandwidth', fi: 'kaistanleveys', sym: 'BW = f_r/Q', def: { en: 'Distance between the half-power frequencies.', fi: 'Puolen tehon taajuuksien väli.' } },
      halfpower: { en: 'half-power point', fi: 'puolen tehon piste', def: { en: 'Where P = P_r/2, i.e. I = I_r/√2 (−3 dB).', fi: 'Piste, jossa P = P_r/2 eli I = I_r/√2 (−3 dB).' } },
      decibel: { en: 'decibel', fi: 'desibeli', sym: 'G = 10 log(P/P_0)', def: { en: 'Logarithmic power ratio; half power is −3 dB.', fi: 'Logaritminen tehosuhde; puolet tehosta on −3 dB.' } }
    },
    formulas: [
      { name: { en: 'Frequency and period', fi: 'Taajuus ja jaksonaika' }, tex: 'f = {1}/{T}, T = {1}/{f}' },
      { name: { en: 'Angular frequency', fi: 'Kulmataajuus' }, tex: 'ω = 2π f = {2π}/{T}' },
      { name: { en: 'Wavelength', fi: 'Aallonpituus' }, tex: 'λ = {c_0}/{f}' },
      { name: { en: 'Sine wave', fi: 'Siniaalto' }, tex: 'v(t) = V_m sin(ωt + φ_0)' },
      { name: { en: 'Peak, rms, peak-to-peak (sine)', fi: 'Huippu-, tehollis- ja huipusta huippuun -arvo (sini)' }, tex: 'V_m = √2 · V, V_pp = 2 V_m' },
      { name: { en: 'Average of a rectified sine', fi: 'Tasasuunnatun siniaallon keskiarvo' }, tex: 'V_av = {2}/{π} · V_m = 0.637 V_m' },
      { name: { en: 'Form factor and peak factor (sine)', fi: 'Muoto- ja huippukerroin (sini)' }, tex: 'k_m = {V}/{V_av} = 1.11, V_m/V = √2' },
      { name: { en: 'rms value (any waveform)', fi: 'Tehollisarvo (mikä tahansa aaltomuoto)' }, tex: 'V = sqrt{{1}/{T} ∫ v(t)^2 dt}' },
      { name: { en: 'Capacitive reactance', fi: 'Kapasitiivinen reaktanssi' }, tex: 'X_C = {1}/{ωC} = {1}/{2π f C}' },
      { name: { en: 'Inductive reactance', fi: 'Induktiivinen reaktanssi' }, tex: 'X_L = ωL = 2π f L' },
      { name: { en: 'Impedance (series RLC)', fi: 'RLC-sarjapiirin impedanssi' }, tex: 'Z = sqrt{R^2 + (X_L − X_C)^2}, tan φ = {X_L − X_C}/{R}' },
      { name: { en: 'Component voltages', fi: 'Komponenttijännitteet' }, tex: 'U_R = I R, U_L = I X_L, U_C = I X_C, U = I Z' },
      { name: { en: 'Powers (P, Q, S)', fi: 'Tehot (P, Q, S)' }, tex: 'P = U I cos φ, Q = U I sin φ, S = U I = sqrt{P^2 + Q^2}' },
      { name: { en: 'Resonant frequency (series)', fi: 'Resonanssitaajuus (sarja)' }, tex: 'f_r = {1}/{2π sqrt{L C}}' },
      { name: { en: 'Q-factor and bandwidth', fi: 'Hyvyysluku ja kaistanleveys' }, tex: 'Q = {ω_r L}/{R}, BW = f_2 − f_1 = {f_r}/{Q}' }
    ],
    sections: [
      // ================================================================ 9.1
      { id: 't9-freq', title: { en: '9.1 AC voltage, period and frequency', fi: '9.1 Vaihtojännite, jaksonaika ja taajuus' },
        blocks: [
          { id: 't9-freq-p1', type: 'text', html: {
            en: '<p>In an <dfn data-term="ac">ac circuit</dfn> the polarity of voltage and current changes periodically: they have positive and negative values in turn. Power networks use generators that make a continuous sine wave. Electronics, telecommunication and control systems also use other <dfn data-term="waveform">waveforms</dfn>: triangle, square and sawtooth (a function generator makes all of them).</p>',
            fi: '<p><dfn data-term="ac">Vaihtosähköpiirissä</dfn> jännitteen ja virran napaisuus vaihtuu jaksollisesti: ne ovat vuorotellen positiivisia ja negatiivisia. Sähköverkoissa generaattorit tuottavat jatkuvaa siniaaltoa. Elektroniikassa, tietoliikenteessä ja säätöjärjestelmissä käytetään myös muita <dfn data-term="waveform">aaltomuotoja</dfn>: kolmio-, suorakulma- ja saha-aaltoa (funktiogeneraattori tuottaa ne kaikki).</p>' } },
          { id: 't9-freq-fig1', type: 'figure', svg: shapesSvg(),
            caption: { en: 'From left: sine, triangle, square and sawtooth wave.', fi: 'Vasemmalta: sini-, kolmio-, suorakulma- ja saha-aalto.' },
            alt: { en: 'Four common ac waveforms', fi: 'Neljä yleistä vaihtosähköaaltomuotoa' } },
          { id: 't9-freq-f1', type: 'formula', key: true, tex: 'f = {1}/{T},  T = {1}/{f}', label: { en: 'Frequency and period', fi: 'Taajuus ja jaksonaika' },
            legend: [['T', { en: 'period (time of one cycle)', fi: 'jaksonaika' }, 's'], ['f', { en: 'frequency', fi: 'taajuus' }, 'Hz = 1/s']] },
          { id: 't9-freq-i1', type: 'interactive', widget: 'plot', title: { en: 'Period and frequency of a 325 V sine wave', fi: 'Siniaallon 325 V jaksonaika ja taajuus' },
            caption: { en: 'Raise f and the period T shrinks. Points with the same phase are exactly one period apart.', fi: 'Kasvata f:ää, jolloin jaksonaika T lyhenee. Samassa vaiheessa olevat pisteet ovat täsmälleen yhden jaksonajan päässä toisistaan.' },
            config: {
              x: { min: 0, max: 60, label: { en: 'Time t', fi: 'Aika t' }, unit: 'ms' },
              y: { min: -400, max: 400, label: { en: 'Voltage v', fi: 'Jännite v' }, unit: 'V' },
              params: [{ id: 'f', tex: 'f', min: 10, max: 200, step: 5, value: 50, unit: 'Hz' }],
              curves: [{ fn: function (x, p) { return 325 * Math.sin(TAU * p.f * x / 1000); }, label: { en: 'v(t)', fi: 'v(t)' } }],
              vlines: function (p) { return [{ x: 1000 / p.f, label: 'T' }]; },
              readouts: function (p) { return [{ tex: 'T', value: 1 / p.f, unit: 's' }, { tex: 'f', value: p.f, unit: 'Hz' }]; }
            } },
          { id: 't9-freq-ex1', type: 'example', title: { en: 'Period of the mains', fi: 'Sähköverkon jaksonaika' },
            problem: { en: 'The mains frequency is 50 Hz. Find the period T and the number of periods in 5.0 s.', fi: 'Sähköverkon taajuus on 50 Hz. Laske jaksonaika T ja jaksojen lukumäärä 5,0 sekunnissa.' },
            given: ['f = 50 Hz', 't = 5.0 s'],
            steps: [{ tex: 'T = {1}/{f} = {1}/{50 Hz} = 0.020 s = 20 ms' }, { tex: 'N = {5.0 s}/{0.020 s} = 250' }],
            result: { en: 'T = 20 ms; 250 periods', fi: 'T = 20 ms; 250 jaksoa' } },
          // (extra)
          { id: 't9-freq-ex2', type: 'example', title: { en: 'Other mains frequencies (extra)', fi: 'Muita verkkotaajuuksia (lisä)' },
            problem: { en: 'Find T for a 1.00 kHz signal and for the 60 Hz US mains.', fi: 'Laske T 1,00 kHz:n signaalille ja USA:n 60 Hz:n verkolle.' },
            given: ['f_1 = 1.00 kHz', 'f_2 = 60 Hz'],
            steps: [{ tex: 'T_1 = {1}/{1000 Hz} = 1.00 ms' }, { tex: 'T_2 = {1}/{60 Hz} = 16.67 ms' }],
            result: { en: 'T_1 = 1.00 ms, T_2 = 16.67 ms', fi: 'T_1 = 1,00 ms, T_2 = 16,67 ms' } },
          { id: 't9-freq-fig2', type: 'figure', svg: rippleSvg(),
            caption: { en: 'Red: ac with amplitude 9.5 V (T = 0.02 s). Blue: dc of 4.0 V with a 1.5 V ripple; it swings between 2.5 V and 5.5 V and never changes polarity.', fi: 'Punainen: vaihtojännite, amplitudi 9,5 V (T = 0,02 s). Sininen: 4,0 V:n tasajännite ja 1,5 V:n aaltoisuus; se vaihtelee 2,5 V:n ja 5,5 V:n välillä eikä koskaan vaihda napaisuutta.' },
            alt: { en: 'Ac wave and dc with ripple', fi: 'Vaihtojännite ja aaltoileva tasajännite' } },
          { id: 't9-freq-c1', type: 'callout', kind: 'warn', title: { en: 'Common mistake', fi: 'Yleinen virhe' }, html: {
            en: 'Ripple does not make a voltage ac. What matters is whether the polarity changes: <dfn data-term="dc">dc</dfn> with ripple is still dc.',
            fi: 'Aaltoisuus ei tee jännitteestä vaihtojännitettä. Ratkaisevaa on, vaihtuuko napaisuus: aaltoileva <dfn data-term="dc">tasajännite</dfn> on yhä tasajännitettä.' } },
          q('t9-q1')
        ] },
      // ================================================================ 9.2
      { id: 't9-omega', title: { en: '9.2 Angular frequency, phasors and complex numbers', fi: '9.2 Kulmataajuus, osoittimet ja kompleksiluvut' },
        blocks: [
          { id: 't9-omega-p1', type: 'text', html: {
            en: '<p>Angles are measured in <dfn data-term="radian">radians</dfn>: <f>φ(rad) = {π}/{180°} · θ(deg)</f>, so 90° = π/2, 180° = π and 360° = 2π. The radian is a ratio of lengths and has no dimension.</p><p>A <dfn data-term="phasor">phasor</dfn> rotates counter-clockwise with the <dfn data-term="angfreq">angular frequency</dfn> ω. Its length is the amplitude, its angle is the phase <f>φ = φ_0 + ωt</f>. One revolution makes one period of a sine wave, and the height of the phasor is the wave value at that moment.</p>',
            fi: '<p>Kulmat mitataan <dfn data-term="radian">radiaaneina</dfn>: <f>φ(rad) = {π}/{180°} · θ(aste)</f>, joten 90° = π/2, 180° = π ja 360° = 2π. Radiaani on pituuksien suhde eikä sillä ole dimensiota.</p><p><dfn data-term="phasor">Osoitin</dfn> pyörii vastapäivään <dfn data-term="angfreq">kulmataajuudella</dfn> ω. Sen pituus on amplitudi ja kulma vaihe <f>φ = φ_0 + ωt</f>. Yksi kierros muodostaa siniaallon yhden jakson, ja osoittimen korkeus on aallon arvo kyseisellä hetkellä.</p>' } },
          { id: 't9-omega-f1', type: 'formula', key: true, tex: 'ω = 2π f = {2π}/{T}', label: { en: 'Angular frequency', fi: 'Kulmataajuus' },
            legend: [['ω', { en: 'angular frequency', fi: 'kulmataajuus' }, 'rad/s'], ['f', { en: 'frequency', fi: 'taajuus' }, 'Hz']] },
          { id: 't9-omega-i1', type: 'interactive', widget: 'phasor', title: { en: 'Rotating phasor and sine wave', fi: 'Pyörivä osoitin ja siniaalto' },
            caption: { en: 'Change the amplitude, frequency and initial phase. The wave is the vertical projection of the phasor. Preset: mains, 325 V, 50 Hz.', fi: 'Muuta amplitudia, taajuutta ja alkuvaihetta. Aalto on osoittimen pystysuora projektio. Esiasetus: verkkojännite, 325 V, 50 Hz.' },
            config: {
              params: [{ id: 'Vm', tex: 'V_m', min: 0, max: 400, step: 5, value: 325, unit: 'V' }, { id: 'f', tex: 'f', min: 1, max: 100, step: 1, value: 50, unit: 'Hz' }, { id: 'p0', tex: 'φ_0', min: -180, max: 180, step: 5, value: 0, unit: '°' }],
              scale: { V: 400 },
              f: function (p) { return p.f; },
              phasors: function (p) { return [{ id: 'V', label: 'v', mag: p.Vm, peak: true, deg: p.p0, unit: 'V' }]; },
              periods: 2,
              readouts: function (p) { return [{ tex: 'ω', value: TAU * p.f, unit: 'rad/s' }, { tex: 'T', value: 1 / p.f, unit: 's' }]; }
            } },
          { id: 't9-omega-h1', type: 'h', text: { en: 'Complex numbers', fi: 'Kompleksiluvut' } },
          { id: 't9-omega-p2', type: 'text', html: {
            en: '<p>A phasor is a <dfn data-term="complexnumber">complex number</dfn>. The <dfn data-term="imagunit">imaginary unit</dfn> is <f>j = sqrt{-1}</f>, <f>j^2 = -1</f> (we write j, because i is the current).</p>',
            fi: '<p>Osoitin on <dfn data-term="complexnumber">kompleksiluku</dfn>. <dfn data-term="imagunit">Imaginääriyksikkö</dfn> on <f>j = sqrt{-1}</f>, <f>j^2 = -1</f> (käytämme merkintää j, koska i tarkoittaa virtaa).</p>' } },
          { id: 't9-omega-f2', type: 'formula', key: true, tex: 'z = a + jb = r(cos φ + j sin φ),  z = r e^{jφ} = r∠φ,  r = |z| = sqrt{a^2 + b^2}', label: { en: 'Complex number', fi: 'Kompleksiluku' },
            legend: [['a', { en: 'real part', fi: 'reaaliosa' }, ''], ['b', { en: 'imaginary part', fi: 'imaginaariosa' }, ''], ['φ', { en: 'argument, arctan(b/a)', fi: 'argumentti (vaihekulma), arctan(b/a)' }, '°']] },
          { id: 't9-omega-p3', type: 'text', html: {
            en: '<p>Euler: <f>e^{jφ} = cos φ + j sin φ</f>. Voltage and current phasors are <f>U = U_m∠φ_u</f> and <f>I = I_m∠φ_i</f>. All phasors in one circuit rotate with the same ω, so their phase difference <f>φ = φ_u − φ_i</f> stays constant. Ohm\'s law for a resistor is <f>U = R I</f>.</p>',
            fi: '<p>Euler: <f>e^{jφ} = cos φ + j sin φ</f>. Jännite- ja virtaosoittimet ovat <f>U = U_m∠φ_u</f> ja <f>I = I_m∠φ_i</f>. Kaikki piirin osoittimet pyörivät samalla ω:lla, joten niiden vaihe-ero <f>φ = φ_u − φ_i</f> pysyy vakiona. Vastuksen Ohmin laki on <f>U = R I</f>.</p>' } },
          { id: 't9-omega-c1', type: 'callout', kind: 'warn', title: { en: 'PDF error', fi: 'PDF:n virhe' }, html: {
            en: 'The slide writes <f>e^{jπ} = 1</f>. The correct value is <b>−1</b> (cos π = −1, sin π = 0). Only <f>e^{j2π} = 1</f>.',
            fi: 'Diassa lukee <f>e^{jπ} = 1</f>. Oikea arvo on <b>−1</b> (cos π = −1, sin π = 0). Vain <f>e^{j2π} = 1</f>.' } },
          { id: 't9-omega-ex1', type: 'example', title: { en: 'Degrees, radians and ω', fi: 'Asteet, radiaanit ja ω' },
            problem: { en: 'a) Convert 90° to radians. b) Find ω of the 50 Hz mains.', fi: 'a) Muunna 90° radiaaneiksi. b) Laske 50 Hz:n verkon ω.' },
            given: ['θ = 90°', 'f = 50 Hz'],
            steps: [{ tex: 'φ = {π}/{180°} · 90° = {π}/{2} = 1.571 rad' }, { tex: 'ω = 2π f = 2π · 50 = 100π = 314 rad/s' }],
            result: { en: 'π/2 rad; ω = 314 rad/s', fi: 'π/2 rad; ω = 314 rad/s' } },
          // (extra)
          { id: 't9-omega-ex2', type: 'example', title: { en: 'A complex number in polar form (extra)', fi: 'Kompleksiluku napamuodossa (lisä)' },
            problem: { en: 'Write z = 3 + j4 in polar form. (The calculator accepts <b>3 + j4</b> and <b>5∠53.13</b>.)', fi: 'Kirjoita z = 3 + j4 napamuodossa. (Laskin hyväksyy muodot <b>3 + j4</b> ja <b>5∠53.13</b>.)' },
            given: ['a = 3', 'b = 4'],
            steps: [{ tex: '|z| = sqrt{3^2 + 4^2} = 5' }, { tex: 'φ = arctan({4}/{3}) = 53.13°' }],
            result: { en: 'z = 5∠53.13°', fi: 'z = 5∠53,13°' } },
          q('t9-q2')
        ] },
      // ================================================================ 9.3
      { id: 't9-wave', title: { en: '9.3 Wavelength', fi: '9.3 Aallonpituus' },
        blocks: [
          { id: 't9-wave-p1', type: 'text', html: {
            en: '<p>The charges in a wire drift very slowly (about 0.1 to 5 cm/s). Yet when an ac voltage is connected, an electromagnetic wave runs along the wires at almost the speed of light, <f>c_0 = 300 000 km/s</f> in bare lines and 0.6 to 0.7 <f>c_0</f> in a coaxial cable.</p><p>The <dfn data-term="wavelength">wavelength</dfn> λ is the length of one period in <em>position</em> (x) space. In one period T the wave moves exactly one wavelength.</p>',
            fi: '<p>Johtimessa varauksenkuljettajat ajautuvat hyvin hitaasti (noin 0,1...5 cm/s). Silti, kun vaihtojännite kytketään, sähkömagneettinen aalto etenee johtimia pitkin lähes valonnopeudella: <f>c_0 = 300 000 km/s</f> paljaassa johdossa ja 0,6...0,7 <f>c_0</f> koaksiaalikaapelissa.</p><p><dfn data-term="wavelength">Aallonpituus</dfn> λ on yhden jakson pituus <em>paikka</em>tasossa (x). Yhdessä jaksossa T aalto etenee täsmälleen yhden aallonpituuden.</p>' } },
          { id: 't9-wave-f1', type: 'formula', key: true, tex: 'λ = {c_0}/{f} = c_0 · T', label: { en: 'Wavelength', fi: 'Aallonpituus' },
            legend: [['λ', { en: 'wavelength', fi: 'aallonpituus' }, 'm'], ['c_0', { en: 'propagation speed (300 000 km/s in air)', fi: 'etenemisnopeus (300 000 km/s ilmassa)' }, 'm/s']] },
          { id: 't9-wave-i1', type: 'interactive', widget: 'custom', title: { en: 'Wave in space and time', fi: 'Aalto paikassa ja ajassa' },
            caption: { en: 'Slide f from 50 Hz (λ = 6000 km) up to 1 GHz (λ = 0.30 m). A speed factor below 1 models a cable.', fi: 'Liu\'uta f:ää 50 Hz:stä (λ = 6000 km) 1 GHz:iin (λ = 0,30 m). Alle 1 oleva nopeuskerroin kuvaa kaapelia.' },
            config: { mount: waveMount } },
          { id: 't9-wave-ex1', type: 'example', title: { en: 'Wavelength at 50 Hz', fi: 'Aallonpituus 50 Hz:llä' },
            problem: { en: 'Find the wavelength of a 50 Hz wave in a bare line and the distance it travels in three periods.', fi: 'Laske 50 Hz:n aallon aallonpituus paljaassa johdossa ja kolmessa jaksossa kuljettu matka.' },
            given: ['f = 50 Hz', 'c_0 = 300 000 km/s'],
            steps: [{ tex: 'λ = {c_0}/{f} = {300 000 km/s}/{50 1/s} = 6000 km' }, { tex: 's = 3 · 6000 km = 18 000 km (3 · 20 ms = 60 ms)' }],
            result: { en: 'λ = 6000 km; 18 000 km in three periods', fi: 'λ = 6000 km; 18 000 km kolmessa jaksossa' } },
          // (extra)
          { id: 't9-wave-ex2', type: 'example', title: { en: 'Cable and radio (extra)', fi: 'Kaapeli ja radio (lisä)' },
            problem: { en: 'a) λ at 50 Hz in a coaxial cable with v = 0.65 c_0. b) λ at 1 GHz in air.', fi: 'a) λ 50 Hz:llä koaksiaalikaapelissa, kun v = 0,65 c_0. b) λ 1 GHz:llä ilmassa.' },
            given: ['v = 0.65 c_0', 'f = 1 GHz'],
            steps: [{ tex: 'λ_a = 0.65 · 6000 km = 3900 km' }, { tex: 'λ_b = {3·10^8}/{10^9} = 0.30 m' }],
            result: { en: 'λ_a = 3900 km, λ_b = 0.30 m', fi: 'λ_a = 3900 km, λ_b = 0,30 m' } },
          { id: 't9-wave-c1', type: 'callout', kind: 'info', title: { en: 'Time domain vs position domain', fi: 'Aikataso ja paikkataso' }, html: {
            en: 'A graph of u against <b>t</b> (time domain) gives the period T. A snapshot of u against <b>x</b> (position domain) gives the wavelength λ. Both describe the same wave.',
            fi: 'Kuvaaja u ajan <b>t</b> funktiona (aikataso) antaa jaksonajan T. Hetkellinen kuva u paikan <b>x</b> funktiona (paikkataso) antaa aallonpituuden λ. Molemmat kuvaavat samaa aaltoa.' } },
          q('t9-q3')
        ] },
      // ================================================================ 9.4
      { id: 't9-sine', title: { en: '9.4 Sine wave: phase angle and phase difference', fi: '9.4 Siniaalto: vaihekulma ja vaihe-ero' },
        blocks: [
          { id: 't9-sine-p1', type: 'text', html: {
            en: '<p>A sine wave in the time domain is <f>v(t) = V_m sin(ωt ± φ_0)</f>. Here <f>V_m</f> is the amplitude, <f>ωt ± φ_0</f> the phase angle and <f>φ_0</f> the <dfn data-term="initphase">initial phase angle</dfn>. The mains voltage is <f>v(t) = 325 V · sin(2π · 50 · t)</f>.</p><p>A wave with a positive <f>φ_0</f> is shifted to the left: it <b>leads</b>. The <dfn data-term="phasediff">phase difference</dfn> between voltage and current is <f>φ = φ_u − φ_i</f>. If φ &gt; 0 the voltage leads the current (inductive), if φ &lt; 0 the current leads (capacitive). Both waves must have the same frequency.</p>',
            fi: '<p>Siniaalto aikatasossa on <f>v(t) = V_m sin(ωt ± φ_0)</f>. Tässä <f>V_m</f> on amplitudi, <f>ωt ± φ_0</f> vaihekulma ja <f>φ_0</f> <dfn data-term="initphase">alkuvaihekulma</dfn>. Verkkojännite on <f>v(t) = 325 V · sin(2π · 50 · t)</f>.</p><p>Aalto, jonka <f>φ_0</f> on positiivinen, siirtyy vasemmalle: se on <b>edellä</b>. Jännitteen ja virran <dfn data-term="phasediff">vaihe-ero</dfn> on <f>φ = φ_u − φ_i</f>. Jos φ &gt; 0, jännite on virtaa edellä (induktiivinen); jos φ &lt; 0, virta on edellä (kapasitiivinen). Aaltojen taajuuden on oltava sama.</p>' } },
          { id: 't9-sine-f1', type: 'formula', key: true, tex: 'v(t) = V_m sin(ωt + φ_0),  φ = φ_u − φ_i,  Δt = {φ}/{ω} = {φ}/{360°} · T', label: { en: 'Sine wave and phase shift', fi: 'Siniaalto ja vaihesiirto' } },
          { id: 't9-sine-i1', type: 'interactive', widget: 'phasor', title: { en: 'Voltage and current with a phase difference', fi: 'Jännite ja virta vaihe-erolla' },
            caption: { en: 'Slide φ from −180° to +180°. For φ > 0 the voltage phasor is ahead of the current phasor and its wave peaks earlier. Δt is the time shift between the peaks.', fi: 'Liu\'uta φ:tä välillä −180°...+180°. Kun φ > 0, jänniteosoitin on virtaosoitinta edellä ja sen aalto saavuttaa huipun aiemmin. Δt on huippujen aikaero.' },
            config: {
              params: [{ id: 'phi', tex: 'φ', min: -180, max: 180, step: 5, value: 60, unit: '°' }, { id: 'f', tex: 'f', min: 10, max: 100, step: 5, value: 50, unit: 'Hz' }],
              scale: { V: 325, A: 8 },
              f: function (p) { return p.f; },
              phasors: function (p) { return [{ id: 'U', mag: 230, deg: 0, unit: 'V' }, { id: 'I', mag: 5.66, deg: -p.phi, unit: 'A' }]; },
              arcs: function () { return [{ from: 'I', to: 'U', label: 'φ' }]; },
              periods: 2,
              readouts: function (p) { return [{ tex: 'Δt', value: Math.abs(p.phi) / 360 / p.f, unit: 's' }]; }
            } },
          { id: 't9-sine-ex1', type: 'example', title: { en: 'Which wave leads?', fi: 'Kumpi aalto on edellä?' },
            problem: { en: 'A red wave is <f>v(t) = 200 V · sin(2π · 50 · t + π/3)</f> and a blue wave is <f>325 V · sin(2π · 50 · t)</f>. Compare them and find the time shift.', fi: 'Punainen aalto on <f>v(t) = 200 V · sin(2π · 50 · t + π/3)</f> ja sininen <f>325 V · sin(2π · 50 · t)</f>. Vertaa niitä ja laske aikaero.' },
            given: ['φ_0 = π/3', 'f = 50 Hz'],
            steps: [{ tex: 'φ_0 = π/3 = 60° > 0' }, { en: 'Positive initial phase: the red wave is 60° ahead of the blue one (leads).', fi: 'Positiivinen alkuvaihe: punainen aalto on 60° sinistä edellä.' },
              { tex: 'Δt = {60°}/{360°} · 20 ms = 3.33 ms' }, { tex: 'v(0) = 200 · sin 60° = 173.2 V' }],
            result: { en: 'Red leads by 60° = 3.33 ms; v(0) = 173 V', fi: 'Punainen on 60° = 3,33 ms edellä; v(0) = 173 V' } },
          // (extra)
          { id: 't9-sine-ex2', type: 'example', title: { en: 'Samples of the mains wave (extra)', fi: 'Verkkojännitteen näytteitä (lisä)' },
            problem: { en: 'Find v at t = 2.5 ms and 3 ms for <f>v = 325 V · sin(100π · t)</f>.', fi: 'Laske v hetkillä t = 2,5 ms ja 3 ms, kun <f>v = 325 V · sin(100π · t)</f>.' },
            given: ['V_m = 325 V', 'ω = 100π rad/s'],
            steps: [{ tex: 'v(2.5 ms) = 325 · sin(45°) = 229.8 V' }, { tex: 'v(3 ms) = 325 · sin(54°) = 262.9 V' }],
            result: { en: '229.8 V and 262.9 V', fi: '229,8 V ja 262,9 V' } },
          { id: 't9-sine-c1', type: 'callout', kind: 'warn', title: { en: 'Common mistake', fi: 'Yleinen virhe' }, html: {
            en: '"Leads" means the wave reaches its peak <em>earlier</em>, not that it is bigger. On a graph the leading wave is shifted to the <b>left</b>. A negative φ = φ_u − φ_i means the voltage lags the current.',
            fi: '"Edellä" tarkoittaa, että aalto saavuttaa huippunsa <em>aiemmin</em>, ei sitä, että se olisi suurempi. Kuvaajassa edellä oleva aalto on siirtynyt <b>vasemmalle</b>. Negatiivinen φ = φ_u − φ_i tarkoittaa, että jännite on virtaa jäljessä.' } },
          q('t9-q4')
        ] },
      // ================================================================ 9.5
      { id: 't9-rms', title: { en: '9.5 Peak, rms and average values', fi: '9.5 Huippu-, tehollis- ja keskiarvo' },
        blocks: [
          { id: 't9-rms-p1', type: 'text', html: {
            en: '<p>The <dfn data-term="peakamp">peak value</dfn> <f>V_m</f> is the largest value of a half cycle, the <dfn data-term="pkpk">peak-to-peak value</dfn> <f>V_pp</f> is maximum minus minimum. The <dfn data-term="acrms">rms (effective) value</dfn> is the dc value that heats a resistor as much as the ac quantity does. The mains 230 V is an rms value.</p>',
            fi: '<p><dfn data-term="peakamp">Huippuarvo</dfn> <f>V_m</f> on puolijakson suurin arvo ja <dfn data-term="pkpk">huipusta huippuun -arvo</dfn> <f>V_pp</f> on suurimman ja pienimmän arvon erotus. <dfn data-term="acrms">Tehollisarvo</dfn> on se tasasuureen arvo, joka lämmittää vastusta yhtä paljon kuin vaihtosuure. Verkon 230 V on tehollisarvo.</p>' } },
          { id: 't9-rms-f1', type: 'formula', key: true, tex: 'V_m = √2 · V,  V = {V_m}/{√2},  V_pp = 2 V_m = 2√2 · V', label: { en: 'Sine wave only', fi: 'Vain siniaallolle' },
            legend: [['V_m', { en: 'peak value', fi: 'huippuarvo' }, 'V'], ['V', { en: 'rms value', fi: 'tehollisarvo' }, 'V'], ['V_pp', { en: 'peak-to-peak', fi: 'huipusta huippuun' }, 'V']] },
          { id: 't9-rms-p2', type: 'text', html: {
            en: '<p>Why √2? In a resistor <f>p(t) = v·i = R I_m^2 sin^2(ωt) = P_m sin^2(ωt)</f>, with <f>P_m = V_m I_m</f>. The average of sin² is ½, so <f>P = P_m/2 = R I_m^2/2 = R I^2</f> and <f>I = I_m/√2</f>. This is why the rms value is the square root of the mean of the square.</p><p>The <b>average</b> of a rectified sine is the area of a half period divided by T/2: <f>V_av = {2}/{π} V_m = 0.637 V_m</f>. The average over a whole period of a symmetric wave is zero.</p>',
            fi: '<p>Miksi √2? Vastuksessa <f>p(t) = v·i = R I_m^2 sin^2(ωt) = P_m sin^2(ωt)</f>, missä <f>P_m = V_m I_m</f>. Suureen sin² keskiarvo on ½, joten <f>P = P_m/2 = R I_m^2/2 = R I^2</f> ja <f>I = I_m/√2</f>. Siksi tehollisarvo on neliön keskiarvon neliöjuuri.</p><p>Tasasuunnatun siniaallon <b>keskiarvo</b> on puolijakson pinta-ala jaettuna ajalla T/2: <f>V_av = {2}/{π} V_m = 0,637 V_m</f>. Symmetrisen aallon keskiarvo koko jakson yli on nolla.</p>' } },
          { id: 't9-rms-i1', type: 'interactive', widget: 'plot', title: { en: 'Peak, rms and average of a sine wave', fi: 'Siniaallon huippu-, tehollis- ja keskiarvo' },
            caption: { en: 'Solid: v(t). Dashed: the full-wave rectified wave |v|. Lines: rms value and the average of |v|. Preset: 230 V rms.', fi: 'Yhtenäinen viiva: v(t). Katkoviiva: kokoaaltotasasuunnattu aalto |v|. Viivat: tehollisarvo ja |v|:n keskiarvo. Esiasetus: 230 V tehollinen.' },
            config: {
              x: { min: 0, max: 40, label: { en: 'Time t', fi: 'Aika t' }, unit: 'ms' },
              y: { min: -600, max: 600, label: { en: 'Voltage', fi: 'Jännite' }, unit: 'V' },
              params: [{ id: 'V', tex: 'V', min: 12, max: 400, step: 1, value: 230, unit: 'V' }],
              curves: [
                { fn: function (x, p) { return SQ2 * p.V * Math.sin(TAU * 50 * x / 1000); }, label: { en: 'v(t)', fi: 'v(t)' }, color: '--c-1' },
                { fn: function (x, p) { return SQ2 * p.V * Math.abs(Math.sin(TAU * 50 * x / 1000)); }, label: { en: '|v(t)|', fi: '|v(t)|' }, color: '--c-3', dash: true }
              ],
              hlines: function (p) { return [{ y: p.V, label: 'V (rms)', color: '--c-2' }, { y: 2 / PI * SQ2 * p.V, label: 'V_av', color: '--c-4' }]; },
              readouts: function (p) { return [{ tex: 'V_m', value: SQ2 * p.V, unit: 'V' }, { tex: 'V_pp', value: 2 * SQ2 * p.V, unit: 'V' }, { tex: { en: 'V_av (full-wave)', fi: 'V_av (kokoaalto)' }, value: 2 / PI * SQ2 * p.V, unit: 'V' }, { tex: { en: 'V_av (half-wave)', fi: 'V_av (puoliaalto)' }, value: SQ2 * p.V / PI, unit: 'V' }]; }
            } },
          { id: 't9-rms-ex1', type: 'example', title: { en: 'The mains in numbers', fi: 'Verkkojännite lukuina' },
            problem: { en: 'The mains is 230 V rms. Find V_m and V_pp.', fi: 'Verkkojännite on 230 V (tehollinen). Laske V_m ja V_pp.' },
            given: ['V = 230 V'],
            steps: [{ tex: 'V_m = √2 · 230 V = 325.3 V' }, { tex: 'V_pp = 2 · 325.3 V = 650.5 V' }],
            result: { en: 'V_m = 325 V, V_pp = 650 V (230 V is a rounded value of 325/√2 = 229.8 V)', fi: 'V_m = 325 V, V_pp = 650 V (230 V on pyöristetty arvo: 325/√2 = 229,8 V)' } },
          { id: 't9-rms-ex2', type: 'example', title: { en: 'Rectifier output', fi: 'Tasasuuntaajan lähtö' },
            problem: { en: 'A full-wave bridge rectifier is fed with 230 V rms. What does a dc voltmeter (average) show after the bridge, and what after a single diode (half-wave)?', fi: 'Kokoaaltotasasuuntaussilta saa syötteekseen 230 V:n tehollisen jännitteen. Mitä tasajännitemittari (keskiarvo) näyttää sillan jälkeen ja mitä yhden diodin (puoliaalto) jälkeen?' },
            given: ['V = 230 V'],
            steps: [{ tex: 'V_m = √2 · 230 = 325 V' }, { tex: { en: 'U_2 = {2}/{π} · 325 V = 207 V (full-wave)', fi: 'U_2 = {2}/{π} · 325 V = 207 V (kokoaalto)' } }, { tex: { en: 'U_2 = {207 V}/{2} = 103.5 V (half-wave)', fi: 'U_2 = {207 V}/{2} = 103.5 V (puoliaalto)' } }],
            result: { en: '207 V and 103.5 V', fi: '207 V ja 103,5 V' } },
          // (extra)
          { id: 't9-rms-ex3', type: 'example', title: { en: 'Heating power of the mains (extra)', fi: 'Verkon lämmitysteho (lisä)' },
            problem: { en: '230 V rms is applied to a 50 Ω resistor. Find P and the peak of p(t).', fi: '50 Ω:n vastukseen kytketään 230 V (tehollinen). Laske P ja p(t):n huippu.' },
            given: ['V = 230 V', 'R = 50 Ω'],
            steps: [{ tex: 'P = {V^2}/{R} = {230^2}/{50} = 1058 W' }, { tex: 'p_m = {V_m^2}/{R} = 2 P = 2116 W' }],
            result: { en: 'P = 1058 W; the peak of p(t) is 2116 W', fi: 'P = 1058 W; p(t):n huippu on 2116 W' } },
          { id: 't9-rms-c1', type: 'callout', kind: 'warn', title: { en: 'Common mistake', fi: 'Yleinen virhe' }, html: {
            en: 'The factors √2 and 2/π hold for <b>sine waves only</b>. Triangle and square waves have other factors (next section). Also: the multimeter and the plug label give rms, but the oscilloscope shows the peak.',
            fi: 'Kertoimet √2 ja 2/π pätevät <b>vain siniaallolle</b>. Kolmio- ja suorakulma-aallolla kertoimet ovat toiset (seuraava kohta). Lisäksi: yleismittari ja laitteen arvokilpi antavat tehollisarvon, mutta oskilloskooppi näyttää huipun.' } },
          q('t9-q5'), q('t9-q6')
        ] },
      // ================================================================ 9.6
      { id: 't9-other', title: { en: '9.6 Other waveforms and multimeter readings', fi: '9.6 Muut aaltomuodot ja yleismittarin lukemat' },
        blocks: [
          { id: 't9-other-p1', type: 'text', html: {
            en: '<p>For any waveform the average of a symmetric wave is the area of half a cycle divided by the <em>half</em> period, and the rms value is defined by</p>',
            fi: '<p>Symmetrisen aallon keskiarvo on puolijakson pinta-ala jaettuna <em>puolijaksolla</em>, ja tehollisarvo määritellään kaavalla</p>' } },
          { id: 't9-other-f1', type: 'formula', key: true, tex: 'V = sqrt{{1}/{T} ∫_0^T v(t)^2 dt},  k_m = {V}/{V_av}', label: { en: 'rms value (any waveform) and form factor', fi: 'Tehollisarvo (mikä tahansa aaltomuoto) ja muotokerroin' } },
          { id: 't9-other-p2', type: 'text', html: {
            en: '<p>The <dfn data-term="formfactor">form factor</dfn> is rms divided by the rectified average, the <dfn data-term="peakfactor">peak factor</dfn> is maximum divided by rms. Sampling gives the rms as <f>V = sqrt{(v_1^2 + v_2^2 + … + v_n^2)/n}</f> from mid-ordinates of equal strips.</p>',
            fi: '<p><dfn data-term="formfactor">Muotokerroin</dfn> on tehollisarvo jaettuna tasasuunnatulla keskiarvolla ja <dfn data-term="peakfactor">huippukerroin</dfn> maksimiarvo jaettuna tehollisarvolla. Näytteistyksellä tehollisarvo saadaan kaavalla <f>V = sqrt{(v_1^2 + v_2^2 + … + v_n^2)/n}</f> yhtä leveiden kaistojen keskiordinaateista.</p>' } },
          { id: 't9-other-tab1', type: 'table',
            head: [{ en: 'Waveform (peak v̂)', fi: 'Aaltomuoto (huippu v̂)' }, { en: 'rms', fi: 'Tehollisarvo' }, { en: 'Average (rectified)', fi: 'Keskiarvo (tasasuunnattu)' }, { en: 'Form factor', fi: 'Muotokerroin' }, { en: 'Peak factor', fi: 'Huippukerroin' }],
            rows: [
              [{ en: 'Sine', fi: 'Sini' }, '0.707 v̂', '0.637 v̂', '1.11', '1.414'],
              [{ en: 'Triangle', fi: 'Kolmio' }, '0.577 v̂', '0.5 v̂', '1.15', '1.732'],
              [{ en: 'Square', fi: 'Suorakulma' }, '1.0 v̂', '1.0 v̂', '1.00', '1.00']],
            caption: { en: 'Sawtooth: rms = v̂/√3 = 0.577 v̂, as for the triangle. Peak factors are extra.', fi: 'Saha-aalto: tehollisarvo = v̂/√3 = 0,577 v̂, kuten kolmioaallolla. Huippukertoimet ovat lisätietoa.' } },
          { id: 't9-other-i1', type: 'interactive', widget: 'readout', title: { en: 'What does a multimeter show?', fi: 'Mitä yleismittari näyttää?' },
            caption: { en: 'A simple (average-responding) meter shows the rectified average × 1.11, correct only for sine waves. A true-rms (TRMS) meter shows the real rms. Presets: triangle 200 V gives V_av = 100 V and V = 115.5 V.', fi: 'Yksinkertainen (keskiarvoa mittaava) mittari näyttää tasasuunnatun keskiarvon × 1,11, mikä on oikein vain siniaallolle. TRMS-mittari näyttää todellisen tehollisarvon. Esimerkki: kolmio 200 V antaa V_av = 100 V ja V = 115,5 V.' },
            config: {
              params: [{ id: 'Vm', tex: 'V_m', min: 1, max: 400, step: 1, value: 200, unit: 'V' }],
              outputs: function (v) {
                var k = PI / (2 * SQ2), m = v.Vm;
                return [
                  { label: { en: 'Sine: true rms', fi: 'Sini: todellinen tehollisarvo' }, value: m / SQ2, unit: 'V' }, { label: { en: 'Sine: simple meter', fi: 'Sini: yksinkertainen mittari' }, value: 2 / PI * m * k, unit: 'V' },
                  { label: { en: 'Triangle: average', fi: 'Kolmio: keskiarvo' }, value: m / 2, unit: 'V' }, { label: { en: 'Triangle: true rms', fi: 'Kolmio: todellinen tehollisarvo' }, value: m / Math.sqrt(3), unit: 'V' }, { label: { en: 'Triangle: simple meter', fi: 'Kolmio: yksinkertainen mittari' }, value: m / 2 * k, unit: 'V' },
                  { label: { en: 'Square: true rms', fi: 'Suorakulma: todellinen tehollisarvo' }, value: m, unit: 'V' }, { label: { en: 'Square: simple meter', fi: 'Suorakulma: yksinkertainen mittari' }, value: m * k, unit: 'V' }
                ];
              }
            } },
          { id: 't9-other-ex1', type: 'example', title: { en: 'Triangle wave: average and rms', fi: 'Kolmioaalto: keskiarvo ja tehollisarvo' },
            problem: { en: 'A triangle wave rises from 0 to 200 V in 5 ms (T = 20 ms). Find the average using the half period, and estimate the rms from four mid-ordinates 25, 75, 125 and 175 V.', fi: 'Kolmioaalto nousee 0:sta 200 V:iin 5 ms:ssa (T = 20 ms). Laske keskiarvo puolijakson avulla ja arvioi tehollisarvo neljästä keskiordinaatista 25, 75, 125 ja 175 V.' },
            given: ['v̂ = 200 V', 'T = 20 ms'],
            steps: [{ tex: 'A = {10 ms · 200 V}/{2} = 1.0 Vs, V_av = {1.0 Vs}/{10 ms} = 100 V' }, { tex: 'V ≈ sqrt{{25^2 + 75^2 + 125^2 + 175^2}/4} = sqrt{13125} = 114.6 V' }, { tex: { en: 'exact: V = {200}/{√3} = 115.5 V', fi: 'tarkka: V = {200}/{√3} = 115.5 V' } }],
            result: { en: 'V_av = 100 V, V = 115.5 V (the 4-strip estimate is 0.8 % low)', fi: 'V_av = 100 V, V = 115,5 V (neljän kaistan arvio on 0,8 % liian pieni)' } },
          { id: 't9-other-c1', type: 'callout', kind: 'warn', title: { en: 'PDF errors on these slides', fi: 'PDF:n virheet näissä dioissa' }, html: {
            en: '<ul><li>The slide says "T = 10 ms" and "T/2 = 5 ms" for the triangle, but the period in the figure is T = 20 ms: 10 ms is the half period. The results are correct.</li><li>For the square wave the slide writes "V_av = 10 A": it is a current, so <f>I_av = I = 10 A</f>.</li></ul>',
            fi: '<ul><li>Diassa kolmioaallolle lukee "T = 10 ms" ja "T/2 = 5 ms", mutta kuvan jaksonaika on T = 20 ms: 10 ms on puolijakso. Tulokset ovat oikein.</li><li>Suorakulma-aallolle diassa lukee "V_av = 10 A": kyseessä on virta, joten <f>I_av = I = 10 A</f>.</li></ul>' } },
          // (extra)
          { id: 't9-other-ex2', type: 'example', title: { en: 'A cheap meter on a square wave (extra)', fi: 'Halpa mittari suorakulma-aallolla (lisä)' },
            problem: { en: 'A square-wave current of ±10 A is measured with an average-responding meter (calibrated for sine waves). What does it show?', fi: 'Suorakulma-aaltoista ±10 A:n virtaa mitataan keskiarvoa mittaavalla mittarilla (kalibroitu siniaallolle). Mitä se näyttää?' },
            given: ['I_av = 10 A', { tex: { en: 'k_{m,sine} = 1.11', fi: 'k_{m,sini} = 1.11' } }],
            steps: [{ tex: { en: 'reading = 1.11 · 10 A = 11.1 A', fi: 'lukema = 1.11 · 10 A = 11.1 A' } }, { en: 'The true rms value is 10 A: the meter reads 11 % too high.', fi: 'Todellinen tehollisarvo on 10 A: mittari näyttää 11 % liikaa.' }],
            result: { en: '11.1 A instead of 10 A', fi: '11,1 A eikä 10 A' } },
          q('t9-q7')
        ] },
      // ================================================================ 9.7
      { id: 't9-r', title: { en: '9.7 Resistor in an AC circuit and active power', fi: '9.7 Vastus vaihtosähköpiirissä ja pätöteho' },
        blocks: [
          { id: 't9-r-p0', type: 'text', html: {
            en: '<p>Properties of a <dfn data-term="seriescircuit">series</dfn> ac circuit: the <b>current is the same</b> through every part; <b>voltages are added as phasors</b>, not as plain numbers; the voltage across a coil or capacitor can be <em>larger than the source</em>; when current and voltage are in phase the circuit is in <b>resonance</b>. In phasor diagrams the baseline is the resistor current.</p>',
            fi: '<p><dfn data-term="seriescircuit">Sarjapiirin</dfn> ominaisuudet vaihtosähköllä: <b>virta on sama</b> jokaisessa osassa; <b>jännitteet lasketaan yhteen osoittimina</b>, ei tavallisina lukuina; kelan tai kondensaattorin jännite voi olla <em>suurempi kuin lähteen</em>; kun virta ja jännite ovat samassa vaiheessa, piiri on <b>resonanssissa</b>. Osoitinpiirroksessa vaakasuuntana on vastuksen virta.</p>' } },
          { id: 't9-r-p1', type: 'text', html: {
            en: '<p>In a resistor the voltage and current are in phase (φ = 0) and Ohm\'s law holds for instantaneous, peak and rms values: <f>u(t) = R i(t)</f>, <f>û = R î</f>, <f>U = R I</f>. The power <f>p(t) = u·i = p̂ sin^2(ωt)</f> oscillates at <b>double frequency</b> (100 Hz for 50 Hz) and is never negative: power flows into the resistor all the time and becomes heat. This is the <dfn data-term="activepower">active power</dfn> <f>P = p̂/2 = U I</f>.</p>',
            fi: '<p>Vastuksessa jännite ja virta ovat samassa vaiheessa (φ = 0) ja Ohmin laki pätee hetkellis-, huippu- ja tehollisarvoille: <f>u(t) = R i(t)</f>, <f>û = R î</f>, <f>U = R I</f>. Teho <f>p(t) = u·i = p̂ sin^2(ωt)</f> värähtelee <b>kaksinkertaisella taajuudella</b> (100 Hz, kun verkko on 50 Hz) eikä ole koskaan negatiivinen: teho virtaa vastukseen koko ajan ja muuttuu lämmöksi. Tämä on <dfn data-term="activepower">pätöteho</dfn> <f>P = p̂/2 = U I</f>.</p>' } },
          { id: 't9-r-f1', type: 'formula', key: true, tex: 'P = {p̂}/{2} = U I = I^2 R = {U^2}/{R}', label: { en: 'Active power of a resistor', fi: 'Vastuksen pätöteho' } },
          { id: 't9-r-i1', type: 'interactive', widget: 'plot', title: { en: 'Instantaneous power of a resistor', fi: 'Vastuksen hetkellinen teho' },
            caption: { en: 'p(t) is always positive and swings between 0 and p̂ at double frequency. The mean line is P = p̂/2. Preset: R = 1.75 Ω, î = 8.0 A, 50 Hz.', fi: 'p(t) on aina positiivinen ja vaihtelee välillä 0...p̂ kaksinkertaisella taajuudella. Keskiarvoviiva on P = p̂/2. Esiasetus: R = 1,75 Ω, î = 8,0 A, 50 Hz.' },
            config: {
              x: { min: 0, max: 40, label: { en: 'Time t', fi: 'Aika t' }, unit: 'ms' },
              y: { min: 0, max: 250, label: { en: 'Power p', fi: 'Teho p' }, unit: 'W' },
              params: [{ id: 'R', tex: 'R', min: 0.5, max: 5, step: 0.05, value: 1.75, unit: 'Ω' }, { id: 'Im', tex: 'î', min: 1, max: 10, step: 0.5, value: 8, unit: 'A' }],
              curves: [{ fn: function (x, p) { var s = Math.sin(TAU * 50 * x / 1000); return p.R * p.Im * p.Im * s * s; }, label: { en: 'p(t)', fi: 'p(t)' } }],
              hlines: function (p) { return [{ y: p.R * p.Im * p.Im / 2, label: 'P', color: '--c-2' }]; },
              readouts: function (p) { return [{ tex: 'û', value: p.R * p.Im, unit: 'V' }, { tex: 'U', value: p.R * p.Im / SQ2, unit: 'V' }, { tex: 'p̂', value: p.R * p.Im * p.Im, unit: 'W' }, { tex: 'P', value: p.R * p.Im * p.Im / 2, unit: 'W' }]; }
            } },
          { id: 't9-r-ex1', type: 'example', title: { en: 'Voltage and power of a small resistor', fi: 'Pienen vastuksen jännite ja teho' },
            problem: { en: 'A resistor R = 1.75 Ω carries a current of peak value 8.0 A at 50 Hz. Find the peak and rms voltage and the active power.', fi: 'Vastuksen R = 1,75 Ω läpi kulkee virta, jonka huippuarvo on 8,0 A taajuudella 50 Hz. Laske jännitteen huippu- ja tehollisarvo sekä pätöteho.' },
            given: ['R = 1.75 Ω', 'î = 8.0 A'],
            steps: [{ tex: 'û = R î = 1.75 · 8.0 = 14 V' }, { tex: 'U = {û}/{√2} = 9.9 V' }, { tex: 'p̂ = û î = 14 · 8.0 = 112 W' }, { tex: 'P = {p̂}/{2} = 56 W (= I^2 R = 5.657^2 · 1.75)' }],
            result: { en: 'û = 14 V, U = 9.9 V, P = 56 W', fi: 'û = 14 V, U = 9,9 V, P = 56 W' } },
          // (extra)
          { id: 't9-r-ex2', type: 'example', title: { en: 'A 2 kW heater (extra)', fi: '2 kW:n lämmitin (lisä)' },
            problem: { en: 'A 2.0 kW heater is connected to 230 V, 50 Hz. Find R, the rms and peak current and p̂.', fi: '2,0 kW:n lämmitin liitetään 230 V:n, 50 Hz:n verkkoon. Laske R, virran tehollis- ja huippuarvo sekä p̂.' },
            given: ['P = 2000 W', 'U = 230 V'],
            steps: [{ tex: 'R = {U^2}/{P} = {230^2}/{2000} = 26.45 Ω' }, { tex: 'I = {P}/{U} = 8.70 A, î = √2 · 8.70 = 12.3 A' }, { tex: 'p̂ = 2 P = 4.0 kW' }],
            result: { en: 'R = 26.5 Ω, I = 8.70 A (12.3 A peak), p̂ = 4.0 kW', fi: 'R = 26,5 Ω, I = 8,70 A (huippu 12,3 A), p̂ = 4,0 kW' } },
          { id: 't9-r-c1', type: 'callout', kind: 'key', title: { en: 'Key idea', fi: 'Pääasia' }, html: {
            en: 'With rms values an ac resistor circuit behaves exactly like a dc circuit: <f>P = U I</f>, <f>U = R I</f>. Powers in a resistor oscillate, but never reverse.',
            fi: 'Tehollisarvoilla vaihtosähköinen vastuspiiri toimii täsmälleen kuin tasasähköpiiri: <f>P = U I</f>, <f>U = R I</f>. Vastuksen teho värähtelee mutta ei koskaan vaihda suuntaa.' } }
        ] },
      // ================================================================ 9.8
      { id: 't9-c', title: { en: '9.8 Capacitor in an AC circuit', fi: '9.8 Kondensaattori vaihtosähköpiirissä' },
        blocks: [
          { id: 't9-c-p1', type: 'text', html: {
            en: '<p>An ideal capacitor blocks dc but passes ac the better the higher the frequency. Its opposition is the <dfn data-term="xc">capacitive reactance</dfn> <f>X_C</f>. The <b>current leads the voltage by 90°</b>, so <f>φ = φ_u − φ_i = −90°</f>.</p><p>The power <f>p(t)</f> oscillates about zero at double frequency: energy flows into the capacitor and back to the source. The active power is <b>P = 0</b>. This is <dfn data-term="reactivepower">reactive power</dfn> (unit var). It does no work, but it loads the source and wires.</p>',
            fi: '<p>Ihanteellinen kondensaattori estää tasavirran mutta päästää vaihtovirran läpi sitä paremmin, mitä suurempi taajuus on. Sen vastustus on <dfn data-term="xc">kapasitiivinen reaktanssi</dfn> <f>X_C</f>. <b>Virta on 90° jännitettä edellä</b>, joten <f>φ = φ_u − φ_i = −90°</f>.</p><p>Teho <f>p(t)</f> värähtelee nollan ympäri kaksinkertaisella taajuudella: energiaa virtaa kondensaattoriin ja takaisin lähteeseen. Pätöteho on <b>P = 0</b>. Tämä on <dfn data-term="reactivepower">loistehoa</dfn> (yksikkö var). Se ei tee työtä, mutta kuormittaa lähdettä ja johtimia.</p>' } },
          { id: 't9-c-f1', type: 'formula', key: true, tex: 'X_C = {U_C}/{I_C} = {1}/{ωC} = {1}/{2π f C}', label: { en: 'Capacitive reactance', fi: 'Kapasitiivinen reaktanssi' },
            legend: [['X_C', { en: 'capacitive reactance', fi: 'kapasitiivinen reaktanssi' }, 'Ω'], ['C', { en: 'capacitance', fi: 'kapasitanssi' }, 'F'], ['f', { en: 'frequency', fi: 'taajuus' }, 'Hz']] },
          { id: 't9-c-i1', type: 'interactive', widget: 'plot', title: { en: 'X_C against frequency', fi: 'X_C taajuuden funktiona' },
            caption: { en: 'X_C is inversely proportional to f and to C. Preset 100 µF: 31.8 Ω at 50 Hz.', fi: 'X_C on kääntäen verrannollinen taajuuteen f ja kapasitanssiin C. Esiasetus 100 µF: 31,8 Ω taajuudella 50 Hz.' },
            config: {
              x: { min: 10, max: 1000, label: { en: 'Frequency f', fi: 'Taajuus f' }, unit: 'Hz' },
              y: { min: 0, max: 200, label: { en: 'Reactance X_C', fi: 'Reaktanssi X_C' }, unit: 'Ω' },
              params: [{ id: 'C', tex: 'C', min: 10e-6, max: 470e-6, step: 1e-6, value: 100e-6, unit: 'F' }],
              curves: [{ fn: function (x, p) { return 1 / (TAU * x * p.C); }, label: { en: 'X_C(f)', fi: 'X_C(f)' } }],
              points: function (p) { return [{ x: 50, y: 1 / (TAU * 50 * p.C), label: '50 Hz' }]; },
              readouts: function (p) { return [{ tex: 'X_C(50 Hz)', value: 1 / (TAU * 50 * p.C), unit: 'Ω' }, { tex: 'X_C(1 kHz)', value: 1 / (TAU * 1000 * p.C), unit: 'Ω' }]; }
            } },
          { id: 't9-c-i2', type: 'interactive', widget: 'phasor', title: { en: 'Capacitor: the current leads', fi: 'Kondensaattori: virta on edellä' },
            caption: { en: 'Raise f: X_C falls, so the current grows. The current wave peaks a quarter period before the voltage (U = 10 V, C = 15 µF).', fi: 'Kasvata f:ää: X_C pienenee, joten virta kasvaa. Virta saavuttaa huippunsa neljänneksen jaksonajasta ennen jännitettä (U = 10 V, C = 15 µF).' },
            config: {
              params: [{ id: 'f', tex: 'f', min: 50, max: 1000, step: 10, value: 500, unit: 'Hz' }],
              scale: { V: 10, A: 1 },
              f: function (p) { return p.f; },
              phasors: function (p) { return [{ id: 'U', mag: 10, deg: 0, unit: 'V' }, { id: 'I', mag: 10 * TAU * p.f * 15e-6, deg: 90, unit: 'A' }]; },
              arcs: function () { return [{ from: 'I', to: 'U', label: 'φ' }]; },
              periods: 2,
              readouts: function (p) { return [{ tex: 'X_C', value: 1 / (TAU * p.f * 15e-6), unit: 'Ω' }, { tex: 'φ', value: '−90°' }]; }
            } },
          { id: 't9-c-ex1', type: 'example', title: { en: 'X_C of 100 µF', fi: '100 µF:n X_C' },
            problem: { en: 'Find X_C of a 100 µF capacitor at 50 Hz and at 1000 Hz.', fi: 'Laske 100 µF:n kondensaattorin X_C taajuuksilla 50 Hz ja 1000 Hz.' },
            given: ['C = 100 µF'],
            steps: [{ tex: 'X_C(50) = {1}/{2π · 50 · 100·10^-6} = 31.8 Ω' }, { tex: 'X_C(1000) = {1}/{2π · 1000 · 100·10^-6} = 1.59 Ω' }],
            result: { en: '31.8 Ω and 1.59 Ω', fi: '31,8 Ω ja 1,59 Ω' } },
          { id: 't9-c-ex2', type: 'example', title: { en: 'Current in a capacitor', fi: 'Kondensaattorin virta' },
            problem: { en: 'U = 10 V, f = 500 Hz, C = 15 µF. Find X_C and I.', fi: 'U = 10 V, f = 500 Hz, C = 15 µF. Laske X_C ja I.' },
            given: ['U = 10 V', 'f = 500 Hz', 'C = 15 µF'],
            steps: [{ tex: 'X_C = {1}/{2π · 500 · 15·10^-6} = 21.2 Ω' }, { tex: 'I = {U}/{X_C} = {10}/{21.2} = 0.47 A' }],
            result: { en: 'X_C = 21.2 Ω, I = 0.47 A (rms)', fi: 'X_C = 21,2 Ω, I = 0,47 A (tehollinen)' } },
          // (extra) the open task of the slide
          { id: 't9-c-ex3', type: 'example', title: { en: 'Open task: add 10 µF (extra solution)', fi: 'Avoin tehtävä: lisää 10 µF (lisäratkaisu)' },
            problem: { en: 'A 10 µF capacitor is connected a) in series, b) in parallel with the 15 µF capacitor (10 V, 500 Hz). Find the current.', fi: '10 µF:n kondensaattori kytketään a) sarjaan, b) rinnan 15 µF:n kondensaattorin kanssa (10 V, 500 Hz). Laske virta.' },
            given: ['C_1 = 10 µF', 'C_2 = 15 µF', 'U = 10 V', 'f = 500 Hz'],
            steps: [{ tex: 'a) C = {10 · 15}/{10 + 15} = 6.0 µF, X_C = 53.05 Ω, I = 0.188 A' }, { tex: 'b) C = 25 µF, X_C = 12.73 Ω, I = 0.785 A' }, { en: 'Capacitors in series give a smaller C and a larger X_C; in parallel the capacitances add.', fi: 'Sarjaan kytketyt kondensaattorit antavat pienemmän C:n ja suuremman X_C:n; rinnankytkennässä kapasitanssit summautuvat.' }],
            result: { en: 'a) 0.188 A, b) 0.785 A', fi: 'a) 0,188 A, b) 0,785 A' } },
          { id: 't9-c-i3', type: 'interactive', widget: 'circuit', title: { en: 'Capacitor circuit at a chosen frequency', fi: 'Kondensaattoripiiri valitulla taajuudella' },
            caption: { en: 'Move f and watch the ammeter. Click the capacitor to see its voltage, current and phase.', fi: 'Muuta f:ää ja seuraa virtamittaria. Napsauta kondensaattoria nähdäksesi sen jännitteen, virran ja vaihekulman.' },
            config: {
              ac: { f: 100, min: 10, max: 2000, step: 10 },
              parts: [
                { id: 'U1', type: 'V', a: [0, 4], b: [0, 0], value: 10 },
                { id: 'C1', type: 'C', a: [0, 0], b: [4, 0], value: 15e-6 },
                { id: 'A1', type: 'ammeter', a: [4, 0], b: [4, 4] }
              ],
              wires: [[[4, 4], [0, 4]]],
              table: true
            } },
          { id: 't9-c-c1', type: 'callout', kind: 'tip', title: { en: 'Memory aid', fi: 'Muistisääntö' }, html: {
            en: 'In a <b>C</b>apacitor the <b>C</b>urrent comes first (leads). In an inductor <b>L</b>: the voltage leads ("ELI the ICE man": E before I in L, I before E in C).',
            fi: 'Kondensaattorissa <b>virta</b> on edellä. Kelassa <b>jännite</b> on edellä (englanniksi "ELI the ICE man": E ennen I:tä kelassa L, I ennen E:tä kondensaattorissa C).' } },
          q('t9-q8'), q('t9-q9')
        ] },
      // ================================================================ 9.9
      { id: 't9-power', title: { en: '9.9 Power in AC circuits: P, Q and S', fi: '9.9 Teho vaihtosähköpiireissä: P, Q ja S' },
        blocks: [
          { id: 't9-power-p1', type: 'text', html: {
            en: '<p>With a phase difference φ between U and I, the power has three parts: <dfn data-term="activepower">active power</dfn> P (W), <dfn data-term="reactivepower">reactive power</dfn> Q (var) and <dfn data-term="apparentpower">apparent power</dfn> S (VA). They form the <dfn data-term="powertriangle">power triangle</dfn>: P is the base, Q the vertical side and S the hypotenuse.</p>',
            fi: '<p>Kun U:n ja I:n välillä on vaihe-ero φ, teholla on kolme osaa: <dfn data-term="activepower">pätöteho</dfn> P (W), <dfn data-term="reactivepower">loisteho</dfn> Q (var) ja <dfn data-term="apparentpower">näennäisteho</dfn> S (VA). Ne muodostavat <dfn data-term="powertriangle">tehokolmion</dfn>: P on vaakakateetti, Q pystykateetti ja S hypotenuusa.</p>' } },
          { id: 't9-power-f1', type: 'formula', key: true, tex: 'P = U I cos φ,  Q = U I sin φ,  S = U I = sqrt{P^2 + Q^2},  tan φ = {Q}/{P}', label: { en: 'Power triangle', fi: 'Tehokolmio' },
            legend: [['P', { en: 'active power', fi: 'pätöteho' }, 'W'], ['Q', { en: 'reactive power', fi: 'loisteho' }, 'var'], ['S', { en: 'apparent power', fi: 'näennäisteho' }, 'VA'], ['cos φ', { en: 'power factor (displacement)', fi: 'siirtymätehokerroin' }, '']] },
          { id: 't9-power-i1', type: 'interactive', widget: 'cplane', title: { en: 'Power triangle', fi: 'Tehokolmio' },
            caption: { en: 'Set S and φ. Positive φ: inductive (Q above the axis), negative φ: capacitive. Presets: S = 2.3 kVA, cos φ = 0.9 ind (φ = 25.8°).', fi: 'Aseta S ja φ. Positiivinen φ: induktiivinen (Q akselin yläpuolella), negatiivinen φ: kapasitiivinen. Esimerkki: S = 2,3 kVA, cos φ = 0,9 ind (φ = 25,8°).' },
            config: {
              unit: 'kVA', re: { label: { en: 'P', fi: 'P' } }, im: { label: { en: 'Q', fi: 'Q' } },
              params: [{ id: 'S', tex: 'S', min: 0.5, max: 5, step: 0.1, value: 2.3, unit: 'kVA' }, { id: 'phi', tex: 'φ', min: -90, max: 90, step: 0.1, value: 25.8, unit: '°' }],
              vectors: function (p) {
                var P = p.S * Math.cos(p.phi * D), Qv = p.S * Math.sin(p.phi * D);
                return [{ re: P, im: 0, label: 'P', unit: 'kW', value: true }, { re: 0, im: Qv, from: [P, 0], label: 'Q', unit: 'kvar', value: true }, { re: P, im: Qv, label: 'S', unit: 'kVA', value: true }];
              },
              arcs: function (p) { return [{ to: p.phi, label: 'φ' }]; },
              bounds: function () { return { re: [-0.5, 5.5], im: [-5, 5] }; },
              readouts: function (p) { return [{ tex: 'cos φ', value: Math.cos(p.phi * D), digits: 3 }, { label: { en: 'Marking', fi: 'Merkintä' }, value: p.phi > 0 ? 'ind' : p.phi < 0 ? 'cap' : '-' }]; }
            } },
          { id: 't9-power-ex1', type: 'example', title: { en: 'Marking cos φ and the angle', fi: 'cos φ -merkintä ja kulma' },
            problem: { en: 'Find φ for a) cos φ = 0.85 ind and b) cos φ = 0.90 cap.', fi: 'Laske φ, kun a) cos φ = 0,85 ind ja b) cos φ = 0,90 cap.' },
            given: ['cos φ = 0.85 ind', 'cos φ = 0.90 cap'],
            steps: [{ tex: { en: 'a) φ = arccos 0.85 = +31.8° (voltage leads: inductive)', fi: 'a) φ = arccos 0.85 = +31.8° (jännite edellä: induktiivinen)' } }, { tex: { en: 'b) φ = −arccos 0.90 = −25.8° (current leads: capacitive)', fi: 'b) φ = −arccos 0.90 = −25.8° (virta edellä: kapasitiivinen)' } }],
            result: { en: 'φ = +31.8° and −25.8°', fi: 'φ = +31,8° ja −25,8°' } },
          { id: 't9-power-ex2', type: 'example', title: { en: 'Power triangle of a machine', fi: 'Koneen tehokolmio' },
            problem: { en: 'A load has S = 2.3 kVA and cos φ = 0.9 (inductive). Find φ, P and Q.', fi: 'Kuorman S = 2,3 kVA ja cos φ = 0,9 (induktiivinen). Laske φ, P ja Q.' },
            given: ['S = 2.3 kVA', 'cos φ = 0.9 ind'],
            steps: [{ tex: 'φ = arccos 0.9 = 25.8°' }, { tex: 'P = S cos φ = 2.3 · 0.9 = 2.07 kW' }, { tex: 'Q = S sin φ = 2.3 · sin 25.8° = 1.0 kvar' }, { tex: 'check: sqrt{2.07^2 + 1.0025^2} = 2.30 kVA' }],
            result: { en: 'φ = 25.8°, P = 2.07 kW, Q = 1.0 kvar', fi: 'φ = 25,8°, P = 2,07 kW, Q = 1,0 kvar' } },
          // (extra)
          { id: 't9-power-ex3', type: 'example', title: { en: '2 kW at cos φ = 0.8 (extra)', fi: '2 kW, kun cos φ = 0,8 (lisä)' },
            problem: { en: 'A 2.0 kW load has cos φ = 0.80 ind on 230 V. Find S, Q and I.', fi: '2,0 kW:n kuorman cos φ = 0,80 ind 230 V:n jännitteellä. Laske S, Q ja I.' },
            given: ['P = 2000 W', 'cos φ = 0.80', 'U = 230 V'],
            steps: [{ tex: 'S = {P}/{cos φ} = 2500 VA' }, { tex: 'Q = sqrt{S^2 − P^2} = 1500 var (φ = 36.87°)' }, { tex: 'I = {S}/{U} = 10.87 A' }],
            result: { en: 'S = 2500 VA, Q = 1500 var, I = 10.87 A', fi: 'S = 2500 VA, Q = 1500 var, I = 10,87 A' } },
          { id: 't9-power-h1', type: 'h', text: { en: 'cos φ versus power factor', fi: 'cos φ ja tehokerroin' } },
          { id: 't9-power-p2', type: 'text', html: {
            en: '<p>The <dfn data-term="cosphi">displacement factor</dfn> cos φ contains only the phase angle between voltage and current. The <dfn data-term="powerfactor">power factor</dfn> <f>PF = P/S</f> also includes the <dfn data-term="harmonics">harmonics</dfn> of a distorted current, so PF ≤ cos φ. For pure sine waves they are equal.</p>',
            fi: '<p><dfn data-term="cosphi">Siirtymätehokerroin</dfn> cos φ sisältää vain jännitteen ja virran vaihekulman. <dfn data-term="powerfactor">Tehokerroin</dfn> <f>PF = P/S</f> sisältää myös vääristyneen virran <dfn data-term="harmonics">yliaallot</dfn>, joten PF ≤ cos φ. Puhtailla siniaalloilla ne ovat yhtä suuret.</p>' } },
          { id: 't9-power-c1', type: 'callout', kind: 'warn', title: { en: 'PDF issues: the harmonics slide', fi: 'PDF:n virheet: yliaaltodia' }, html: {
            en: '<ul><li>Bulbs: S = 325 VA and P = 321 W would give Q = √(325² − 321²) = 50.8 var, not 2 var. cos φ = 321/325 = 0.99 is fine.</li><li>Fluorescent lamps: P/S = 66/72 = 0.92 is cos φ of the fundamental; the quoted power factor 0.58 means the total apparent power including harmonics is 66/0.58 = 114 VA.</li><li>The "398 V" on the screen is inconsistent with a 230 V single phase (probably the line-to-line voltage).</li></ul>',
            fi: '<ul><li>Hehkulamput: S = 325 VA ja P = 321 W antaisivat Q = √(325² − 321²) = 50,8 var, ei 2 var. cos φ = 321/325 = 0,99 on kunnossa.</li><li>Loistelamput: P/S = 66/72 = 0,92 on perusaallon cos φ; ilmoitettu tehokerroin 0,58 tarkoittaa, että kokonaisnäennäisteho yliaaltoineen on 66/0,58 = 114 VA.</li><li>Näytön "398 V" ei sovi 230 V:n yksivaiheiseen jännitteeseen (todennäköisesti pääjännite).</li></ul>' } },
          q('t9-q10')
        ] },
      // ================================================================ 9.10
      { id: 't9-l', title: { en: '9.10 Coil in an AC circuit', fi: '9.10 Kela vaihtosähköpiirissä' },
        blocks: [
          { id: 't9-l-p1', type: 'text', html: {
            en: '<p>In an ideal coil (R = 0) the <b>voltage leads the current by 90°</b>, so <f>φ = +90°</f>. The <dfn data-term="xl">inductive reactance</dfn> grows with frequency: dc is limited only by the winding resistance, ac by <f>X_L</f>. The power oscillates at double frequency, the positive and negative areas are equal, so <b>P = 0</b>: the coil takes reactive power Q only.</p>',
            fi: '<p>Ihanteellisessa kelassa (R = 0) <b>jännite on 90° virtaa edellä</b>, joten <f>φ = +90°</f>. <dfn data-term="xl">Induktiivinen reaktanssi</dfn> kasvaa taajuuden mukana: tasavirtaa rajoittaa vain käämin resistanssi, vaihtovirtaa <f>X_L</f>. Teho värähtelee kaksinkertaisella taajuudella, positiivinen ja negatiivinen pinta-ala ovat yhtä suuret, joten <b>P = 0</b>: kela ottaa vain loistehoa Q.</p>' } },
          { id: 't9-l-f1', type: 'formula', key: true, tex: 'X_L = {U_L}/{I} = ωL = 2π f L', label: { en: 'Inductive reactance', fi: 'Induktiivinen reaktanssi' },
            legend: [['X_L', { en: 'inductive reactance', fi: 'induktiivinen reaktanssi' }, 'Ω'], ['L', { en: 'inductance', fi: 'induktanssi' }, 'H']] },
          { id: 't9-l-i1', type: 'interactive', widget: 'plot', title: { en: 'X_L against frequency', fi: 'X_L taajuuden funktiona' },
            caption: { en: 'X_L grows in proportion to f and to L. Preset 25 mH: 7.85 Ω at 50 Hz.', fi: 'X_L on suoraan verrannollinen taajuuteen f ja induktanssiin L. Esiasetus 25 mH: 7,85 Ω taajuudella 50 Hz.' },
            config: {
              x: { min: 0, max: 1000, label: { en: 'Frequency f', fi: 'Taajuus f' }, unit: 'Hz' },
              y: { min: 0, max: 400, label: { en: 'Reactance X_L', fi: 'Reaktanssi X_L' }, unit: 'Ω', auto: true },
              params: [{ id: 'L', tex: 'L', min: 0.005, max: 0.5, step: 0.005, value: 0.025, unit: 'H' }],
              curves: [{ fn: function (x, p) { return TAU * x * p.L; }, label: { en: 'X_L(f)', fi: 'X_L(f)' } }],
              points: function (p) { return [{ x: 50, y: TAU * 50 * p.L, label: '50 Hz' }]; },
              readouts: function (p) { return [{ tex: 'X_L(50 Hz)', value: TAU * 50 * p.L, unit: 'Ω' }, { tex: 'X_L(1 kHz)', value: TAU * 1000 * p.L, unit: 'Ω' }]; }
            } },
          { id: 't9-l-i2', type: 'interactive', widget: 'phasor', title: { en: 'Coil: the voltage leads', fi: 'Kela: jännite on edellä' },
            caption: { en: 'The current lags the voltage by 90° and shrinks when f rises (U = 10 V, L = 25 mH).', fi: 'Virta on 90° jännitettä jäljessä ja pienenee f:n kasvaessa (U = 10 V, L = 25 mH).' },
            config: {
              params: [{ id: 'f', tex: 'f', min: 10, max: 200, step: 5, value: 50, unit: 'Hz' }],
              scale: { V: 10, A: 8 },
              f: function (p) { return p.f; },
              phasors: function (p) { return [{ id: 'U', mag: 10, deg: 0, unit: 'V' }, { id: 'I', mag: 10 / (TAU * p.f * 0.025), deg: -90, unit: 'A' }]; },
              arcs: function () { return [{ from: 'I', to: 'U', label: 'φ' }]; },
              periods: 2,
              readouts: function (p) { return [{ tex: 'X_L', value: TAU * p.f * 0.025, unit: 'Ω' }, { tex: 'φ', value: '+90°' }]; }
            } },
          { id: 't9-l-ex1', type: 'example', title: { en: 'X_L of a 25 mH coil', fi: '25 mH:n kelan X_L' },
            problem: { en: 'Find X_L of L = 25 mH at 50 Hz and at 1.0 kHz.', fi: 'Laske L = 25 mH:n X_L taajuuksilla 50 Hz ja 1,0 kHz.' },
            given: ['L = 25 mH'],
            steps: [{ tex: 'X_L(50) = 2π · 50 · 0.025 = 7.85 Ω' }, { tex: 'X_L(1000) = 2π · 1000 · 0.025 = 157.1 Ω' }],
            result: { en: '7.85 Ω and 157 Ω', fi: '7,85 Ω ja 157 Ω' } },
          { id: 't9-l-c1', type: 'callout', kind: 'warn', title: { en: 'PDF error', fi: 'PDF:n virhe' }, html: {
            en: 'The slide lists X_L(50 Hz) = 314 Ω and X_L(1.0 kHz) = 6.28 kΩ for L = 25 mH. Those are the values for <b>L = 1.0 H</b>. For 25 mH the correct values are 7.85 Ω and 157 Ω.',
            fi: 'Diassa L = 25 mH:lle annetaan X_L(50 Hz) = 314 Ω ja X_L(1,0 kHz) = 6,28 kΩ. Ne ovat arvot, kun <b>L = 1,0 H</b>. 25 mH:lle oikeat arvot ovat 7,85 Ω ja 157 Ω.' } },
          { id: 't9-l-ex2', type: 'example', title: { en: 'Inductance from a measured figure', fi: 'Induktanssi mittauskuvasta' },
            problem: { en: 'From the graphs the coil voltage peaks at 15 V and the current at 8 A (50 Hz). Find X_L and L.', fi: 'Kuvaajista kelan jännitteen huippu on 15 V ja virran huippu 8 A (50 Hz). Laske X_L ja L.' },
            given: ['v̂ = 15 V', 'î = 8 A', 'f = 50 Hz'],
            steps: [{ tex: 'X_L = {√2 U}/{√2 I} = {15}/{8} = 1.9 Ω' }, { tex: 'L = {X_L}/{ω} = {1.875}/{2π · 50} = 6.0 mH' }],
            result: { en: 'X_L ≈ 1.9 Ω, L ≈ 6.0 mH', fi: 'X_L ≈ 1,9 Ω, L ≈ 6,0 mH' } },
          // (extra)
          { id: 't9-l-c2', type: 'callout', kind: 'info', title: { en: 'Ideal versus real coil (extra)', fi: 'Ihanteellinen ja todellinen kela (lisä)' }, html: {
            en: 'An ideal 6.0 mH coil on 230 V, 50 Hz would carry 122 A. A real coil has resistance, which limits the current: this is why we model it as R in series with L (next section).',
            fi: 'Ihanteellisen 6,0 mH:n kelan läpi kulkisi 230 V:n, 50 Hz:n verkossa 122 A. Todellisella kelalla on resistanssi, joka rajoittaa virtaa: siksi se mallinnetaan sarjaan kytkettynä R:nä ja L:nä (seuraava kohta).' } },
          q('t9-q11')
        ] },
      // ================================================================ 9.11
      { id: 't9-rl', title: { en: '9.11 RL series circuit', fi: '9.11 RL-sarjapiiri' },
        blocks: [
          { id: 't9-rl-p1', type: 'text', html: {
            en: '<p>In a series RL circuit the current is common. <f>U_R</f> is in phase with <f>I</f>, <f>U_L</f> leads <f>I</f> by 90°, so the voltages form a right triangle. Dividing the <dfn data-term="voltriangle">voltage triangle</dfn> by I gives the <dfn data-term="imptriangle">impedance triangle</dfn>, multiplying it by I gives the power triangle (<f>P = I^2 R</f>, <f>Q = I^2 X_L</f>, <f>S = I^2 Z</f>).</p>',
            fi: '<p>RL-sarjapiirissä virta on yhteinen. <f>U_R</f> on samassa vaiheessa virran <f>I</f> kanssa ja <f>U_L</f> on 90° virtaa edellä, joten jännitteet muodostavat suorakulmaisen kolmion. Kun <dfn data-term="voltriangle">jännitekolmio</dfn> jaetaan virralla I, saadaan <dfn data-term="imptriangle">impedanssikolmio</dfn>; kun se kerrotaan I:llä, saadaan tehokolmio (<f>P = I^2 R</f>, <f>Q = I^2 X_L</f>, <f>S = I^2 Z</f>).</p>' } },
          { id: 't9-rl-f1', type: 'formula', key: true, tex: 'Z = sqrt{R^2 + X_L^2},  tan φ = {X_L}/{R},  cos φ = {R}/{Z},  I = {U}/{Z}', label: { en: 'RL series circuit', fi: 'RL-sarjapiiri' },
            legend: [['Z', { en: 'impedance', fi: 'impedanssi' }, 'Ω'], ['φ', { en: 'phase angle (φ > 0: inductive)', fi: 'vaihekulma (φ > 0: induktiivinen)' }, '°']] },
          { id: 't9-rl-i1', type: 'interactive', widget: 'phasor', title: { en: 'Voltage triangle of a series RL circuit', fi: 'RL-sarjapiirin jännitekolmio' },
            caption: { en: 'U_R and U_L are added tip to tail; the sum is the source voltage U = 25 V. The current is the horizontal reference. Preset: R = 1.0 kΩ, L = 20 mH, f = 10 kHz.', fi: 'U_R ja U_L lasketaan yhteen peräkkäin; summa on lähdejännite U = 25 V. Virta on vaakasuora vertailusuunta. Esiasetus: R = 1,0 kΩ, L = 20 mH, f = 10 kHz.' },
            config: {
              rotate: false, waves: false,
              params: [{ id: 'R', tex: 'R', min: 100, max: 3000, step: 50, value: 1000, unit: 'Ω' }, { id: 'L', tex: 'L', min: 0.001, max: 0.05, step: 0.001, value: 0.02, unit: 'H' }, { id: 'f', tex: 'f', min: 1000, max: 20000, step: 500, value: 10000, unit: 'Hz' }],
              phasors: function (p) {
                var XL = TAU * p.f * p.L, Z = Math.hypot(p.R, XL), I = 25 / Z;
                return [{ id: 'UR', label: 'U_R', mag: I * p.R, deg: 0, unit: 'V' }, { id: 'UL', label: 'U_L', mag: I * XL, deg: 90, unit: 'V', from: 'UR' }, { id: 'U', label: 'U', mag: 25, deg: Math.atan2(XL, p.R) / D, unit: 'V', color: '--c-5' }];
              },
              arcs: function () { return [{ to: 'U', label: 'φ' }]; },
              readouts: function (p) { var XL = TAU * p.f * p.L, Z = Math.hypot(p.R, XL); return [{ tex: 'X_L', value: XL, unit: 'Ω' }, { tex: 'Z', value: Z, unit: 'Ω' }, { tex: 'I', value: 25 / Z, unit: 'A' }, { tex: 'φ', value: U().fmtNum(Math.atan2(XL, p.R) / D, 3) + '°' }]; }
            } },
          { id: 't9-rl-i2', type: 'interactive', widget: 'cplane', title: { en: 'Impedance triangle of a series RL circuit', fi: 'RL-sarjapiirin impedanssikolmio' },
            caption: { en: 'R along the real axis, X_L along the imaginary axis, Z = R + jX_L. Z grows with f.', fi: 'R reaaliakselilla, X_L imaginaariakselilla, Z = R + jX_L. Z kasvaa f:n kasvaessa.' },
            config: {
              unit: 'Ω',
              params: [{ id: 'R', tex: 'R', min: 100, max: 3000, step: 50, value: 1000, unit: 'Ω' }, { id: 'L', tex: 'L', min: 0.001, max: 0.05, step: 0.001, value: 0.02, unit: 'H' }, { id: 'f', tex: 'f', min: 1000, max: 20000, step: 500, value: 10000, unit: 'Hz' }],
              vectors: function (p) { var XL = TAU * p.f * p.L; return [{ re: p.R, im: 0, label: 'R' }, { re: 0, im: XL, from: [p.R, 0], label: 'X_L' }, { re: p.R, im: XL, label: 'Z', value: true }]; },
              arcs: function (p) { return [{ to: Math.atan2(TAU * p.f * p.L, p.R) / D, label: 'φ' }]; },
              bounds: function () { return { re: [0, 3500], im: [0, 6500] }; },
              readouts: function (p) { var XL = TAU * p.f * p.L; return [{ tex: 'cos φ', value: p.R / Math.hypot(p.R, XL), digits: 3 }]; }
            } },
          { id: 't9-rl-ex1', type: 'example', title: { en: 'Pythagorean triple 5–12–13', fi: 'Pythagoraan kolmikko 5–12–13' },
            problem: { en: 'In a series RL circuit U = 13 V and U_L = 5 V. Find U_R and φ.', fi: 'RL-sarjapiirissä U = 13 V ja U_L = 5 V. Laske U_R ja φ.' },
            given: ['U = 13 V', 'U_L = 5 V'],
            steps: [{ tex: 'U_R = sqrt{U^2 − U_L^2} = sqrt{169 − 25} = 12 V' }, { tex: 'φ = arctan({5}/{12}) = 22.6°' }],
            result: { en: 'U_R = 12 V, φ = 22.6° (inductive)', fi: 'U_R = 12 V, φ = 22,6° (induktiivinen)' } },
          { id: 't9-rl-ex2', type: 'example', title: { en: 'RL circuit at 10 kHz', fi: 'RL-piiri 10 kHz:llä' },
            problem: { en: 'U = 25 V, f = 10 kHz, R = 1.0 kΩ, L = 20 mH. Find X_L, Z, φ, I, P, Q and S.', fi: 'U = 25 V, f = 10 kHz, R = 1,0 kΩ, L = 20 mH. Laske X_L, Z, φ, I, P, Q ja S.' },
            given: ['U = 25 V', 'f = 10 kHz', 'R = 1.0 kΩ', 'L = 20 mH'],
            steps: [{ tex: 'X_L = 2π · 10^4 · 0.020 = 1257 Ω ≈ 1.26 kΩ' }, { tex: 'Z = sqrt{1.0^2 + 1.26^2} = 1.61 kΩ' }, { tex: 'φ = arctan({1.26}/{1.0}) = 51.5°' }, { tex: 'I = {U}/{Z} = {25}/{1606} = 15.6 mA' }, { tex: 'P = U I cos φ = 0.24 W (= I^2 R), Q = U I sin φ = 0.30 var, S = U I = 0.389 VA' }],
            result: { en: 'Z = 1.61 kΩ, φ = 51.5° (inductive), I = 15.6 mA, P = 0.24 W, Q = 0.30 var, S = 0.39 VA', fi: 'Z = 1,61 kΩ, φ = 51,5° (induktiivinen), I = 15,6 mA, P = 0,24 W, Q = 0,30 var, S = 0,39 VA' } },
          // (extra)
          { id: 't9-rl-ex3', type: 'example', title: { en: 'Raising cos φ with R (extra)', fi: 'cos φ:n nostaminen R:llä (lisä)' },
            problem: { en: 'X_L = 40 Ω at 230 V. What R gives cos φ = 0.8? Find Z and I.', fi: 'X_L = 40 Ω, jännite 230 V. Millä R:llä cos φ = 0,8? Laske Z ja I.' },
            given: ['X_L = 40 Ω', 'U = 230 V', 'cos φ = 0.8'],
            steps: [{ tex: 'tan φ = tan(arccos 0.8) = 0.75, R = {X_L}/{tan φ} = {40}/{0.75} = 53.3 Ω' }, { tex: 'Z = {R}/{cos φ} = 66.7 Ω, I = {230}/{66.7} = 3.45 A' }],
            result: { en: 'R = 53.3 Ω, Z = 66.7 Ω, I = 3.45 A', fi: 'R = 53,3 Ω, Z = 66,7 Ω, I = 3,45 A' } },
          { id: 't9-rl-i3', type: 'interactive', widget: 'circuit', title: { en: 'Series RL circuit with a frequency slider', fi: 'RL-sarjapiiri taajuussäätimellä' },
            caption: { en: 'Source 25 V, R = 1 kΩ, L = 20 mH. At 10 kHz the current is 15.6 mA. Try other frequencies and values.', fi: 'Lähde 25 V, R = 1 kΩ, L = 20 mH. Taajuudella 10 kHz virta on 15,6 mA. Kokeile muita taajuuksia ja arvoja.' },
            config: {
              ac: { f: 10000, min: 100, max: 50000, step: 100 },
              parts: [
                { id: 'U1', type: 'V', a: [0, 4], b: [0, 0], value: 25 },
                { id: 'R1', type: 'R', a: [0, 0], b: [3, 0], value: 1000, editable: true },
                { id: 'L1', type: 'L', a: [3, 0], b: [6, 0], value: 0.02, editable: true },
                { id: 'A1', type: 'ammeter', a: [6, 0], b: [6, 4] }
              ],
              wires: [[[6, 4], [0, 4]]],
              table: true
            } },
          { id: 't9-rl-c1', type: 'callout', kind: 'warn', title: { en: 'Common mistake', fi: 'Yleinen virhe' }, html: {
            en: 'You cannot add <f>R + X_L</f> or <f>U_R + U_L</f> as plain numbers: they are 90° apart. With <f>U_R = 12 V</f> and <f>U_L = 5 V</f> the source is 13 V, not 17 V.',
            fi: 'Suureita <f>R</f> ja <f>X_L</f> tai <f>U_R</f> ja <f>U_L</f> ei saa laskea yhteen tavallisina lukuina: niiden välillä on 90° vaihe-ero. Kun <f>U_R = 12 V</f> ja <f>U_L = 5 V</f>, lähde on 13 V eikä 17 V.' } },
          q('t9-q12')
        ] },
      // ================================================================ 9.12
      { id: 't9-rlc', title: { en: '9.12 RLC series circuit', fi: '9.12 RLC-sarjapiiri' },
        blocks: [
          { id: 't9-rlc-p1', type: 'text', html: {
            en: '<p>In a series RLC circuit <f>U_R</f> is in phase with <f>I</f>, <f>U_L</f> leads by 90° and <f>U_C</f> lags by 90°. The two reactive voltages point in opposite directions and partly cancel, so the net reactance is <f>X = X_L − X_C</f>. If <f>X_L &gt; X_C</f> the circuit is inductive (φ &gt; 0), otherwise capacitive (φ &lt; 0).</p>',
            fi: '<p>RLC-sarjapiirissä <f>U_R</f> on samassa vaiheessa virran <f>I</f> kanssa, <f>U_L</f> on 90° edellä ja <f>U_C</f> 90° jäljessä. Jännitteet <f>U_L</f> ja <f>U_C</f> osoittavat vastakkaisiin suuntiin ja kumoavat osin toisensa, joten nettoreaktanssi on <f>X = X_L − X_C</f>. Jos <f>X_L &gt; X_C</f>, piiri on induktiivinen (φ &gt; 0), muuten kapasitiivinen (φ &lt; 0).</p>' } },
          { id: 't9-rlc-f1', type: 'formula', key: true, tex: 'Z = sqrt{R^2 + (X_L − X_C)^2},  I = {U}/{Z},  φ = arctan({X_L − X_C}/{R})', label: { en: 'RLC series circuit', fi: 'RLC-sarjapiiri' } },
          { id: 't9-rlc-f2', type: 'formula', tex: 'U_R = I R,  U_L = I X_L,  U_C = I X_C,  U = sqrt{U_R^2 + (U_L − U_C)^2}', label: { en: 'Component voltages', fi: 'Komponenttijännitteet' } },
          { id: 't9-rlc-i1', type: 'interactive', widget: 'phasor', title: { en: 'Voltages of a series RLC circuit, tip to tail', fi: 'RLC-sarjapiirin jännitteet peräkkäin' },
            caption: { en: 'U_R, U_L and U_C add tip to tail to the source voltage U = 25 V. U_L and U_C can be larger than U. Preset: R = 10 Ω, L = 0.20 H, C = 70 µF, 50 Hz.', fi: 'U_R, U_L ja U_C summautuvat peräkkäin lähdejännitteeksi U = 25 V. U_L ja U_C voivat olla suurempia kuin U. Esiasetus: R = 10 Ω, L = 0,20 H, C = 70 µF, 50 Hz.' },
            config: {
              rotate: false, waves: false,
              params: [{ id: 'R', tex: 'R', min: 5, max: 60, step: 1, value: 10, unit: 'Ω' }, { id: 'L', tex: 'L', min: 0.05, max: 0.5, step: 0.01, value: 0.2, unit: 'H' }, { id: 'C', tex: 'C', min: 20e-6, max: 200e-6, step: 1e-6, value: 70e-6, unit: 'F' }, { id: 'f', tex: 'f', min: 20, max: 100, step: 1, value: 50, unit: 'Hz' }],
              phasors: function (p) {
                var s = rlc(p.R, p.L, p.C, p.f), I = 25 / s.Z;
                return [{ id: 'UR', label: 'U_R', mag: I * p.R, deg: 0, unit: 'V' }, { id: 'UL', label: 'U_L', mag: I * s.XL, deg: 90, unit: 'V', from: 'UR' },
                  { id: 'UC', label: 'U_C', mag: I * s.XC, deg: -90, unit: 'V', from: 'UL' }, { id: 'U', label: 'U', mag: 25, deg: s.phi, unit: 'V', color: '--c-4' }];
              },
              arcs: function () { return [{ to: 'U', label: 'φ' }]; },
              readouts: function (p) { var s = rlc(p.R, p.L, p.C, p.f), I = 25 / s.Z; return [{ tex: 'Z', value: s.Z, unit: 'Ω' }, { tex: 'I', value: I, unit: 'A' }, { tex: 'U_L', value: I * s.XL, unit: 'V' }, { tex: 'U_C', value: I * s.XC, unit: 'V' }, { tex: 'φ', value: U().fmtNum(s.phi, 3) + '°' }]; }
            } },
          { id: 't9-rlc-i2', type: 'interactive', widget: 'cplane', title: { en: 'Impedance triangle of the RLC circuit', fi: 'RLC-piirin impedanssikolmio' },
            caption: { en: 'X_L goes up, X_C goes down; Z = R + j(X_L − X_C). Change f to see the circuit turn from capacitive to inductive.', fi: 'X_L osoittaa ylös, X_C alas; Z = R + j(X_L − X_C). Muuta f:ää ja katso, miten piiri muuttuu kapasitiivisesta induktiiviseksi.' },
            config: {
              unit: 'Ω',
              params: [{ id: 'R', tex: 'R', min: 5, max: 60, step: 1, value: 10, unit: 'Ω' }, { id: 'f', tex: 'f', min: 20, max: 100, step: 1, value: 50, unit: 'Hz' }],
              vectors: function (p) {
                var s = rlc(p.R, 0.2, 70e-6, p.f);
                return [{ re: p.R, im: 0, label: 'R' }, { re: 0, im: s.XL, from: [p.R, 0], label: 'X_L' }, { re: 0, im: -s.XC, from: [p.R, s.XL], label: 'X_C' }, { re: p.R, im: s.X, label: 'Z', value: true, color: '--c-5' }];
              },
              arcs: function (p) { return [{ to: rlc(p.R, 0.2, 70e-6, p.f).phi, label: 'φ' }]; },
              readouts: function (p) { var s = rlc(p.R, 0.2, 70e-6, p.f); return [{ tex: 'X_L', value: s.XL, unit: 'Ω' }, { tex: 'X_C', value: s.XC, unit: 'Ω' }, { tex: 'φ', value: U().fmtNum(s.phi, 3) + '°' }]; }
            } },
          { id: 't9-rlc-ex1', type: 'example', title: { en: 'Impedance, current and angle', fi: 'Impedanssi, virta ja kulma' },
            problem: { en: 'U = 25 V, f = 50 Hz, R = 10 Ω, L = 0.20 H, C = 70 µF. Find X_L, X_C, Z, I and φ.', fi: 'U = 25 V, f = 50 Hz, R = 10 Ω, L = 0,20 H, C = 70 µF. Laske X_L, X_C, Z, I ja φ.' },
            given: ['U = 25 V', 'f = 50 Hz', 'R = 10 Ω', 'L = 0.20 H', 'C = 70 µF'],
            steps: [{ tex: 'X_L = 2π · 50 · 0.20 = 62.8 Ω' }, { tex: 'X_C = {1}/{314 · 70·10^-6} = 45.5 Ω' }, { tex: 'X = 62.8 − 45.5 = 17.3 Ω' }, { tex: 'Z = sqrt{10^2 + 17.3^2} = 20.0 Ω' }, { tex: { en: 'I = {25}/{20.0} = 1.25 A, φ = arctan({17.3}/{10}) = 60° (inductive)', fi: 'I = {25}/{20.0} = 1.25 A, φ = arctan({17.3}/{10}) = 60° (induktiivinen)' } }],
            result: { en: 'Z = 20 Ω, I = 1.25 A, φ = 60° (voltage leads)', fi: 'Z = 20 Ω, I = 1,25 A, φ = 60° (jännite on edellä)' } },
          { id: 't9-rlc-ex2', type: 'example', title: { en: 'Voltages larger than the source', fi: 'Lähdettä suuremmat jännitteet' },
            problem: { en: 'For the same circuit find U_R, U_L, U_C and check the sum.', fi: 'Laske samalle piirille U_R, U_L, U_C ja tarkista summa.' },
            given: ['I = 1.25 A'],
            steps: [{ tex: 'U_R = I R = 1.25 · 10 = 12.5 V' }, { tex: 'U_L = I X_L = 1.25 · 62.8 = 78.5 V (∠ +90°)' }, { tex: 'U_C = I X_C = 1.25 · 45.5 = 56.9 V (∠ −90°)' }, { tex: 'U = sqrt{12.5^2 + (78.5 − 56.9)^2} = 24.96 V ≈ 25 V' }],
            result: { en: 'U_R = 12.5 V, U_L = 78.5 V (3.1 × the source), U_C = 56.9 V', fi: 'U_R = 12,5 V, U_L = 78,5 V (3,1 × lähdejännite), U_C = 56,9 V' } },
          { id: 't9-rlc-ex3', type: 'example', title: { en: 'Power of the RLC circuit', fi: 'RLC-piirin teho' },
            problem: { en: 'Find P, Q and S of the same circuit.', fi: 'Laske samalle piirille P, Q ja S.' },
            given: ['U = 25 V', 'I = 1.25 A', 'φ = 60°'],
            steps: [{ tex: 'cos φ = 0.5, P = U I cos φ = 25 · 1.25 · 0.5 = 15.6 W (= I^2 R)' }, { tex: 'Q = U I sin φ = 27.1 var' }, { tex: 'S = U I = 31.3 VA' }],
            result: { en: 'P = 15.6 W, Q = 27.1 var, S = 31.3 VA', fi: 'P = 15,6 W, Q = 27,1 var, S = 31,3 VA' } },
          // (extra)
          { id: 't9-rlc-ex4', type: 'example', title: { en: 'R and C only at 230 V (extra)', fi: 'Vain R ja C 230 V:lla (lisä)' },
            problem: { en: 'R = 100 Ω in series with C = 22 µF at 230 V, 50 Hz. Find Z, I, φ, U_R, U_C and P.', fi: 'Sarjaan kytketyt R = 100 Ω ja C = 22 µF ovat 230 V:n, 50 Hz:n jännitteessä. Laske Z, I, φ, U_R, U_C ja P.' },
            given: ['R = 100 Ω', 'C = 22 µF', 'U = 230 V'],
            steps: [{ tex: 'X_C = 144.7 Ω, Z = 175.9 Ω, I = 1.308 A' }, { tex: { en: 'φ = −arctan({144.7}/{100}) = −55.35° (current leads)', fi: 'φ = −arctan({144.7}/{100}) = −55.35° (virta edellä)' } }, { tex: 'U_R = 130.8 V, U_C = 189.2 V, P = I^2 R = 171 W, Q = −247 var' }],
            result: { en: 'Z = 175.9 Ω, I = 1.31 A, φ = −55.4°, P = 171 W, cos φ = 0.569 cap', fi: 'Z = 175,9 Ω, I = 1,31 A, φ = −55,4°, P = 171 W, cos φ = 0,569 cap' } },
          { id: 't9-rlc-i3', type: 'interactive', widget: 'circuit', title: { en: 'Series RLC circuit', fi: 'RLC-sarjapiiri' },
            caption: { en: 'R = 10 Ω, L = 0.20 H, C = 70 µF, source 25 V. At 50 Hz I = 1.25 A and φ = 60°. Click each part to see its voltage: U_L and U_C exceed 25 V. At 20 Hz the circuit is capacitive.', fi: 'R = 10 Ω, L = 0,20 H, C = 70 µF, lähde 25 V. Taajuudella 50 Hz I = 1,25 A ja φ = 60°. Napsauta osia nähdäksesi jännitteet: U_L ja U_C ovat yli 25 V. Taajuudella 20 Hz piiri on kapasitiivinen.' },
            config: {
              ac: { f: 50, min: 10, max: 100, step: 0.5 },
              parts: [
                { id: 'U1', type: 'V', a: [0, 4], b: [0, 0], value: 25 },
                { id: 'R1', type: 'R', a: [0, 0], b: [3, 0], value: 10, editable: true },
                { id: 'L1', type: 'L', a: [3, 0], b: [6, 0], value: 0.2, editable: true },
                { id: 'C1', type: 'C', a: [6, 0], b: [9, 0], value: 70e-6, editable: true },
                { id: 'A1', type: 'ammeter', a: [9, 0], b: [9, 4] }
              ],
              wires: [[[9, 4], [0, 4]]],
              table: true
            } },
          { id: 't9-rlc-c1', type: 'callout', kind: 'tip', title: { en: 'How to solve every series problem', fi: 'Näin ratkaiset kaikki sarjapiiritehtävät' }, html: {
            en: '1) Find <f>X_L</f> and <f>X_C</f> from f. 2) <f>X = X_L − X_C</f>, then <f>Z = sqrt{R^2 + X^2}</f>. 3) <f>I = U/Z</f>. 4) <f>φ = arctan(X/R)</f>. 5) Component voltages <f>I·R</f>, <f>I·X_L</f>, <f>I·X_C</f>. 6) <f>P = I^2 R</f>, <f>Q = I^2 X</f>, <f>S = U I</f>. You can also type complex numbers in the calculator: <b>10 + j17.3</b> or <b>20∠60</b>.',
            fi: '1) Laske <f>X_L</f> ja <f>X_C</f> taajuudesta. 2) <f>X = X_L − X_C</f>, sitten <f>Z = sqrt{R^2 + X^2}</f>. 3) <f>I = U/Z</f>. 4) <f>φ = arctan(X/R)</f>. 5) Komponenttijännitteet <f>I·R</f>, <f>I·X_L</f>, <f>I·X_C</f>. 6) <f>P = I^2 R</f>, <f>Q = I^2 X</f>, <f>S = U I</f>. Laskimeen voi syöttää myös kompleksilukuja: <b>10 + j17.3</b> tai <b>20∠60</b>.' } },
          q('t9-q13')
        ] },
      // ================================================================ 9.13
      { id: 't9-res', title: { en: '9.13 Series resonance', fi: '9.13 Sarjaresonanssi' },
        blocks: [
          { id: 't9-res-p1', type: 'text', html: {
            en: '<p>A circuit is in <dfn data-term="seriesres">resonance</dfn> when current and voltage are in phase (φ = 0). In a series circuit this happens when <f>X_L = X_C</f>. Then <f>Z = R</f> is the <b>smallest</b> possible impedance, <f>I = U/R</f> the <b>largest</b> current, and <f>U_L</f> and <f>U_C</f> are equal in size and opposite in phase, so they cancel in the sum. They can be many times larger than the source voltage.</p>',
            fi: '<p>Piiri on <dfn data-term="seriesres">resonanssissa</dfn>, kun virta ja jännite ovat samassa vaiheessa (φ = 0). Sarjapiirissä näin on, kun <f>X_L = X_C</f>. Silloin <f>Z = R</f> on <b>pienin</b> mahdollinen impedanssi, <f>I = U/R</f> <b>suurin</b> virta, ja <f>U_L</f> ja <f>U_C</f> ovat yhtä suuret ja vastakkaisvaiheiset, joten ne kumoavat toisensa summassa. Ne voivat olla moninkertaisia lähdejännitteeseen verrattuna.</p>' } },
          { id: 't9-res-f1', type: 'formula', key: true, tex: 'ω_r L = {1}/{ω_r C},  ω_r = {1}/{sqrt{L C}},  f_r = {1}/{2π sqrt{L C}}', label: { en: 'Series resonance', fi: 'Sarjaresonanssi' },
            legend: [['f_r', { en: 'resonant frequency', fi: 'resonanssitaajuus' }, 'Hz'], ['L', { en: 'inductance', fi: 'induktanssi' }, 'H'], ['C', { en: 'capacitance', fi: 'kapasitanssi' }, 'F']] },
          { id: 't9-res-i1', type: 'interactive', widget: 'plot', title: { en: 'X_L, X_C and |Z| against frequency', fi: 'X_L, X_C ja |Z| taajuuden funktiona' },
            caption: { en: 'X_L rises linearly, X_C falls as 1/f. They cross at f_r. Left of f_r: capacitive (X_C > X_L). Right: inductive. |Z| touches R at f_r.', fi: 'X_L kasvaa lineaarisesti, X_C pienenee kuten 1/f. Ne leikkaavat taajuudella f_r. Vasemmalla: kapasitiivinen (X_C > X_L). Oikealla: induktiivinen. |Z| on pienimmillään, R, taajuudella f_r.' },
            config: {
              x: { min: 10, max: 100, label: { en: 'Frequency f', fi: 'Taajuus f' }, unit: 'Hz' },
              y: { min: 0, max: 250, label: { en: 'Impedance', fi: 'Impedanssi' }, unit: 'Ω' },
              params: [{ id: 'R', tex: 'R', min: 1, max: 60, step: 1, value: 10, unit: 'Ω' }, { id: 'L', tex: 'L', min: 0.1, max: 0.5, step: 0.01, value: 0.2, unit: 'H' }, { id: 'C', tex: 'C', min: 40e-6, max: 200e-6, step: 1e-6, value: 70e-6, unit: 'F' }],
              curves: [
                { fn: function (x, p) { return TAU * x * p.L; }, label: { en: 'X_L', fi: 'X_L' }, color: '--c-1' },
                { fn: function (x, p) { return 1 / (TAU * x * p.C); }, label: { en: 'X_C', fi: 'X_C' }, color: '--c-2' },
                { fn: function (x, p) { return rlc(p.R, p.L, p.C, x).Z; }, label: { en: '|Z|', fi: '|Z|' }, color: '--c-3' }
              ],
              hlines: function (p) { return [{ y: p.R, label: 'R', color: '--c-4' }]; },
              vlines: function (p) { return [{ x: 1 / (TAU * Math.sqrt(p.L * p.C)), label: 'f_r' }]; },
              readouts: function (p) { return [{ tex: 'f_r', value: 1 / (TAU * Math.sqrt(p.L * p.C)), unit: 'Hz' }, { tex: 'X_L = X_C', value: Math.sqrt(p.L / p.C), unit: 'Ω' }]; }
            } },
          { id: 't9-res-i2', type: 'interactive', widget: 'plot', title: { en: 'Current against frequency for three resistances', fi: 'Virta taajuuden funktiona kolmella resistanssilla' },
            caption: { en: 'Same RLC circuit, U = 25 V, R = 5, 10 and 15 Ω. The peaks at f_r = 42.5 Hz are 5.0 A, 2.5 A and 1.67 A (I = U/R). Smaller R gives a taller, sharper peak.', fi: 'Sama RLC-piiri, U = 25 V, R = 5, 10 ja 15 Ω. Huiput taajuudella f_r = 42,5 Hz ovat 5,0 A, 2,5 A ja 1,67 A (I = U/R). Pienempi R antaa korkeamman ja terävämmän huipun.' },
            config: {
              x: { min: 10, max: 80, label: { en: 'Frequency f', fi: 'Taajuus f' }, unit: 'Hz' },
              y: { min: 0, max: 5.5, label: { en: 'Current I', fi: 'Virta I' }, unit: 'A' },
              params: [],
              curves: [5, 10, 15].map(function (R, k) { return { fn: function (x) { return 25 / rlc(R, 0.2, 70e-6, x).Z; }, label: { en: 'R = ' + R + ' Ω', fi: 'R = ' + R + ' Ω' }, color: '--c-' + (k + 1) }; }),
              vlines: function () { return [{ x: 1 / (TAU * Math.sqrt(0.2 * 70e-6)), label: 'f_r' }]; }
            } },
          { id: 't9-res-i3', type: 'interactive', widget: 'phasor', title: { en: 'Phase of the current across resonance', fi: 'Virran vaihe resonanssin yli' },
            caption: { en: 'Slide f through 42.5 Hz (R = 10 Ω). Below f_r the current leads (φ < 0), at f_r they are in phase, above f_r the current lags (φ > 0). The phase goes from −90° to +90°.', fi: 'Liu\'uta f:ää arvon 42,5 Hz yli (R = 10 Ω). Alle f_r virta on edellä (φ < 0), taajuudella f_r ne ovat samassa vaiheessa ja yli f_r virta on jäljessä (φ > 0). Vaihe kulkee −90°:sta +90°:een.' },
            config: {
              params: [{ id: 'f', tex: 'f', min: 15, max: 100, step: 0.5, value: 30, unit: 'Hz' }],
              scale: { V: 25, A: 3 },
              f: function (p) { return p.f; },
              phasors: function (p) { var s = rlc(10, 0.2, 70e-6, p.f); return [{ id: 'U', mag: 25, deg: 0, unit: 'V' }, { id: 'I', mag: 25 / s.Z, deg: -s.phi, unit: 'A' }]; },
              arcs: function () { return [{ from: 'I', to: 'U', label: 'φ' }]; },
              periods: 2,
              readouts: function (p) { var s = rlc(10, 0.2, 70e-6, p.f); return [{ tex: 'Z', value: s.Z, unit: 'Ω' }, { tex: 'I', value: 25 / s.Z, unit: 'A' }, { tex: 'φ', value: U().fmtNum(s.phi, 3) + '°' }]; }
            } },
          { id: 't9-res-ex1', type: 'example', title: { en: 'Resonance of the 9.12 circuit', fi: 'Kohdan 9.12 piirin resonanssi' },
            problem: { en: 'L = 0.20 H, C = 70 µF, R = 10 Ω, U = 25 V. Find f_r, I_0, U_L, U_C, P and Q at resonance.', fi: 'L = 0,20 H, C = 70 µF, R = 10 Ω, U = 25 V. Laske resonanssissa f_r, I_0, U_L, U_C, P ja Q.' },
            given: ['L = 0.20 H', 'C = 70 µF', 'R = 10 Ω', 'U = 25 V'],
            steps: [{ tex: 'f_r = {1}/{2π sqrt{0.20 · 70·10^-6}} = 42.54 Hz, ω_r = 267.3 rad/s' }, { tex: 'I_0 = {U}/{R} = {25}/{10} = 2.5 A (φ = 0)' }, { tex: 'U_L = ω_r L I_0 = 267.3 · 0.2 · 2.5 = 133.6 V (∠ +90°), U_C = 133.6 V (∠ −90°)' }, { tex: 'P = S = U I_0 = {U^2}/{R} = 62.5 W, Q = 0' }],
            result: { en: 'f_r = 42.5 Hz, I_0 = 2.5 A; U_L = U_C = 133.6 V = 5.3 × U; P = 62.5 W', fi: 'f_r = 42,5 Hz, I_0 = 2,5 A; U_L = U_C = 133,6 V = 5,3 × U; P = 62,5 W' } },
          // (extra)
          { id: 't9-res-ex2', type: 'example', title: { en: 'Away from resonance (extra)', fi: 'Kauempana resonanssista (lisä)' },
            problem: { en: 'Same circuit, find Z, I and φ at 30 Hz and 60 Hz.', fi: 'Sama piiri; laske Z, I ja φ taajuuksilla 30 Hz ja 60 Hz.' },
            given: ['R = 10 Ω', 'L = 0.20 H', 'C = 70 µF', 'U = 25 V'],
            steps: [{ tex: { en: '30 Hz: Z = 39.4 Ω, I = 0.635 A, φ = −75.3° (capacitive)', fi: '30 Hz: Z = 39.4 Ω, I = 0.635 A, φ = −75.3° (kapasitiivinen)' } }, { tex: { en: '60 Hz: Z = 38.8 Ω, I = 0.644 A, φ = +75.1° (inductive)', fi: '60 Hz: Z = 38.8 Ω, I = 0.644 A, φ = +75.1° (induktiivinen)' } }],
            result: { en: 'The current is only about a quarter of the resonant 2.5 A', fi: 'Virta on vain noin neljäsosa resonanssin 2,5 A:sta' } },
          { id: 't9-res-ex3', type: 'example', title: { en: 'Design for 1 kHz (extra)', fi: 'Mitoitus 1 kHz:lle (lisä)' },
            problem: { en: 'Choose C so that L = 10 mH resonates at 1.0 kHz. With R = 20 Ω and U = 10 V find I_0 and U_L.', fi: 'Valitse C niin, että L = 10 mH resonoi taajuudella 1,0 kHz. Kun R = 20 Ω ja U = 10 V, laske I_0 ja U_L.' },
            given: ['L = 10 mH', 'f_r = 1.0 kHz', 'R = 20 Ω', 'U = 10 V'],
            steps: [{ tex: 'C = {1}/{(2π f_r)^2 L} = {1}/{(6283)^2 · 0.010} = 2.53 µF' }, { tex: 'I_0 = {10}/{20} = 0.5 A, X_L = X_C = 62.8 Ω' }, { tex: 'U_L = U_C = 0.5 · 62.8 = 31.4 V (3.14 × U)' }],
            result: { en: 'C = 2.53 µF, I_0 = 0.5 A, U_L = U_C = 31.4 V', fi: 'C = 2,53 µF, I_0 = 0,5 A, U_L = U_C = 31,4 V' } },
          { id: 't9-res-i4', type: 'interactive', widget: 'circuit', title: { en: 'Resonance hunt', fi: 'Resonanssin etsintä' },
            caption: { en: 'Move f and read the ammeter: it is largest at resonance. Click L and C: their voltages are equal and exceed 25 V.', fi: 'Muuta f:ää ja lue virtamittaria: se on suurimmillaan resonanssissa. Napsauta L:ää ja C:tä: niiden jännitteet ovat yhtä suuret ja yli 25 V.' },
            config: {
              ac: { f: 30, min: 10, max: 100, step: 0.5 },
              parts: [
                { id: 'U1', type: 'V', a: [0, 4], b: [0, 0], value: 25 },
                { id: 'R1', type: 'R', a: [0, 0], b: [3, 0], value: 10, editable: true },
                { id: 'L1', type: 'L', a: [3, 0], b: [6, 0], value: 0.2 },
                { id: 'C1', type: 'C', a: [6, 0], b: [9, 0], value: 70e-6 },
                { id: 'A1', type: 'ammeter', a: [9, 0], b: [9, 4] }
              ],
              wires: [[[9, 4], [0, 4]]],
              table: true
            } },
          { id: 't9-res-c1', type: 'callout', kind: 'warn', title: { en: 'Danger of resonance', fi: 'Resonanssin vaara' }, html: {
            en: 'Resonance is not "free energy". If R is tiny (R = 0.15 Ω), the 25 V circuit carries 167 A and the coil and capacitor see about 8.9 kV (Q = 356). On the mains such resonances can cause dangerous current surges and voltages.',
            fi: 'Resonanssi ei ole "ilmaista energiaa". Jos R on pieni (R = 0,15 Ω), 25 V:n piirissä kulkee 167 A ja kelan ja kondensaattorin jännite on noin 8,9 kV (Q = 356). Verkossa tällaiset resonanssit voivat aiheuttaa vaarallisia virtapiikkejä ja jännitteitä.' } },
          q('t9-q14'), q('t9-q15')
        ] },
      // ================================================================ 9.14
      { id: 't9-q', title: { en: '9.14 Q-factor and bandwidth', fi: '9.14 Hyvyysluku ja kaistanleveys' },
        blocks: [
          { id: 't9-q-p1', type: 'text', html: {
            en: '<p>The <dfn data-term="qfactor">Q-factor</dfn> measures the loss of a resonant circuit: <f>Q = 2π · {energy stored}/{energy lost per period}</f>. Small R (small loss) gives large Q. For a series circuit <f>Q_r = ω_r L / R = 1/(ω_r C R)</f>, and at resonance <f>U_L = U_C = Q · U</f>.</p><p>The <dfn data-term="bandwidth">bandwidth</dfn> is the distance between the <dfn data-term="halfpower">half-power frequencies</dfn> <f>f_1</f> and <f>f_2</f>, where <f>P = P_r/2</f> and the current has fallen to <f>I_r/√2</f> (−3 dB).</p>',
            fi: '<p><dfn data-term="qfactor">Hyvyysluku</dfn> kuvaa resonanssipiirin häviöitä: <f>Q = 2π · {varastoitunut energia}/{jaksossa menetetty energia}</f>. Pieni R (pienet häviöt) antaa suuren Q:n. Sarjapiirissä <f>Q_r = ω_r L / R = 1/(ω_r C R)</f>, ja resonanssissa <f>U_L = U_C = Q · U</f>.</p><p><dfn data-term="bandwidth">Kaistanleveys</dfn> on <dfn data-term="halfpower">puolen tehon taajuuksien</dfn> <f>f_1</f> ja <f>f_2</f> väli, joissa <f>P = P_r/2</f> ja virta on pudonnut arvoon <f>I_r/√2</f> (−3 dB).</p>' } },
          { id: 't9-q-f1', type: 'formula', key: true, tex: 'Q_r = {ω_r L}/{R},  BW = f_2 − f_1 = {f_r}/{Q_r} = {R}/{2π L}', label: { en: 'Q-factor and bandwidth', fi: 'Hyvyysluku ja kaistanleveys' },
            legend: [['Q_r', { en: 'quality factor', fi: 'hyvyysluku' }, ''], ['BW', { en: 'bandwidth', fi: 'kaistanleveys' }, 'Hz']] },
          { id: 't9-q-i1', type: 'interactive', widget: 'plot', title: { en: 'Power curve and half-power bandwidth', fi: 'Tehokäyrä ja puolen tehon kaistanleveys' },
            caption: { en: 'Power P(f) = I²R for U = 25 V, L = 0.20 H, C = 70 µF. The dotted line is P_r/2; it cuts the curve at f_1 and f_2. A small R gives a tall, narrow peak. R = 5 Ω: BW = 3.98 Hz, Q = 10.7.', fi: 'Teho P(f) = I²R, kun U = 25 V, L = 0,20 H, C = 70 µF. Pisteviiva on P_r/2; se leikkaa käyrän taajuuksilla f_1 ja f_2. Pieni R antaa korkean ja kapean huipun. R = 5 Ω: BW = 3,98 Hz, Q = 10,7.' },
            config: {
              x: { min: 10, max: 80, label: { en: 'Frequency f', fi: 'Taajuus f' }, unit: 'Hz' },
              y: { min: 0, max: 140, label: { en: 'Power P', fi: 'Teho P' }, unit: 'W' },
              params: [{ id: 'R', tex: 'R', min: 2, max: 30, step: 0.5, value: 5, unit: 'Ω' }],
              curves: [{ fn: function (x, p) { var Z = rlc(p.R, 0.2, 70e-6, x).Z; return 625 / (Z * Z) * p.R; }, label: { en: 'P(f)', fi: 'P(f)' } }],
              hlines: function (p) { return [{ y: 625 / p.R / 2, label: 'P_r/2', color: '--c-2' }]; },
              vlines: function (p) {
                var a = p.R / (2 * 0.2), b = Math.sqrt(a * a + 1 / (0.2 * 70e-6));
                return [{ x: (b - a) / TAU, label: 'f_1' }, { x: 1 / (TAU * Math.sqrt(0.2 * 70e-6)), label: 'f_r' }, { x: (b + a) / TAU, label: 'f_2' }];
              },
              readouts: function (p) { var wr = 1 / Math.sqrt(0.2 * 70e-6), Qr = wr * 0.2 / p.R; return [{ tex: 'Q', value: Qr }, { tex: 'BW', value: p.R / (TAU * 0.2), unit: 'Hz' }, { tex: 'P_r', value: 625 / p.R, unit: 'W' }, { tex: 'U_L', value: 25 * Qr, unit: 'V' }]; }
            } },
          { id: 't9-q-i2', type: 'interactive', widget: 'readout', title: { en: 'Q-factor calculator', fi: 'Hyvyysluvun laskin' },
            caption: { en: 'Presets from the slides: R = 15 Ω gives Q = 3.6, R = 0.15 Ω gives Q = 356. Watch U_L: it can be dangerously high.', fi: 'Esimerkit dioista: R = 15 Ω antaa Q = 3,6, R = 0,15 Ω antaa Q = 356. Seuraa U_L:ää: se voi olla vaarallisen korkea.' },
            config: {
              params: [{ id: 'R', tex: 'R', min: 0.15, max: 30, step: 0.05, value: 15, unit: 'Ω' }, { id: 'L', tex: 'L', min: 0.05, max: 0.5, step: 0.01, value: 0.2, unit: 'H' }, { id: 'C', tex: 'C', min: 40e-6, max: 200e-6, step: 1e-6, value: 70e-6, unit: 'F' }],
              outputs: function (v) { var wr = 1 / Math.sqrt(v.L * v.C), Q = wr * v.L / v.R, fr = wr / TAU; return [{ tex: 'f_r', value: fr, unit: 'Hz' }, { tex: 'Q', value: Q }, { tex: 'BW', value: fr / Q, unit: 'Hz' }, { tex: 'U_L / U', value: Q }, { tex: 'U_L (25 V)', value: 25 * Q, unit: 'V' }]; }
            } },
          { id: 't9-q-ex1', type: 'example', title: { en: 'Q-factor for two resistances', fi: 'Hyvyysluku kahdella resistanssilla' },
            problem: { en: 'L = 0.20 H, f_r = 42.5 Hz (ω_r = 267 rad/s). Find Q for R_1 = 15 Ω and R_2 = 0.15 Ω.', fi: 'L = 0,20 H, f_r = 42,5 Hz (ω_r = 267 rad/s). Laske Q kun R_1 = 15 Ω ja R_2 = 0,15 Ω.' },
            given: ['L = 0.20 H', 'ω_r = 267 rad/s'],
            steps: [{ tex: 'Q_1 = {267 · 0.20}/{15} = 3.6' }, { tex: 'Q_2 = {267 · 0.20}/{0.15} = 356' }],
            result: { en: 'Q = 3.6 and 356', fi: 'Q = 3,6 ja 356' } },
          // (extra)
          { id: 't9-q-ex2', type: 'example', title: { en: 'Bandwidths of the three curves (extra)', fi: 'Kolmen käyrän kaistanleveydet (lisä)' },
            problem: { en: 'For the circuit of the three current curves (L = 0.20 H, C = 70 µF) find Q and BW for R = 5, 10, 15 Ω.', fi: 'Kolmen virtakäyrän piirille (L = 0,20 H, C = 70 µF) laske Q ja BW, kun R = 5, 10, 15 Ω.' },
            given: ['f_r = 42.54 Hz'],
            steps: [{ tex: 'R = 5 Ω: Q = 10.7, BW = {42.54}/{10.7} = 3.98 Hz (40.59 ... 44.57 Hz)' }, { tex: 'R = 10 Ω: Q = 5.35, BW = 7.96 Hz (38.74 ... 46.70 Hz)' }, { tex: 'R = 15 Ω: Q = 3.56, BW = 11.94 Hz (36.98 ... 48.92 Hz)' }],
            result: { en: 'BW = R/(2πL): proportional to R', fi: 'BW = R/(2πL): suoraan verrannollinen R:ään' } },
          { id: 't9-q-ex3', type: 'example', title: { en: 'Choosing R for a bandwidth (extra)', fi: 'R:n valinta kaistanleveyden mukaan (lisä)' },
            problem: { en: 'Find R so that BW = 5.0 Hz for L = 0.20 H, and the Q that follows.', fi: 'Laske R niin, että BW = 5,0 Hz, kun L = 0,20 H, sekä siitä seuraava Q.' },
            given: ['BW = 5.0 Hz', 'L = 0.20 H', 'f_r = 42.54 Hz'],
            steps: [{ tex: 'R = 2π L · BW = 2π · 0.2 · 5 = 6.28 Ω' }, { tex: 'Q = {f_r}/{BW} = {42.54}/{5.0} = 8.5' }],
            result: { en: 'R = 6.28 Ω, Q = 8.5', fi: 'R = 6,28 Ω, Q = 8,5' } },
          { id: 't9-q-c1', type: 'callout', kind: 'warn', title: { en: 'PDF errors on the Q-factor slides', fi: 'PDF:n virheet hyvyyslukudioissa' }, html: {
            en: '<ul><li>The decibel formula is <f>G = 10 log(P/P_r)</f>, so <f>10 log 0.5 = −3.01 dB</f>. The slide leaves out the factor 10. For amplitudes: <f>20 log(1/√2) = −3.01 dB</f>.</li><li>The half-power point is where the <b>current</b> has fallen to 0.707 of its peak, not "the peak divided by the half-power value".</li><li>On the power plot the peak of about 125 W belongs to R = 5 Ω (625/5), whose true half-power points are 40.6 Hz and 44.6 Hz (BW = 4 Hz). The markers at about 40 and 46 Hz on the slide are only schematic.</li></ul>',
            fi: '<ul><li>Desibelikaava on <f>G = 10 log(P/P_r)</f>, joten <f>10 log 0,5 = −3,01 dB</f>. Diasta puuttuu kerroin 10. Amplituduille: <f>20 log(1/√2) = −3,01 dB</f>.</li><li>Puolen tehon pisteessä <b>virta</b> on pudonnut arvoon 0,707 huipusta, ei "huippu jaettuna puolen tehon arvolla".</li><li>Tehokuvaajassa noin 125 W:n huippu kuuluu arvolle R = 5 Ω (625/5), jonka todelliset puolen tehon pisteet ovat 40,6 Hz ja 44,6 Hz (BW = 4 Hz). Dian noin 40 ja 46 Hz:n merkinnät ovat vain kaaviollisia.</li></ul>' } },
          q('t9-q16')
        ] }
    ],
    questions: [
      // ---------------- practice
      { id: 't9-q1', mode: 'practice', type: 'mc', difficulty: 1,
        prompt: { en: 'A wave <f>200 V · sin(ωt + π/3)</f> is compared with <f>325 V · sin(ωt)</f>. What is true?', fi: 'Aaltoa <f>200 V · sin(ωt + π/3)</f> verrataan aaltoon <f>325 V · sin(ωt)</f>. Mikä pitää paikkansa?' },
        options: [
          { id: 'a', html: { en: 'It is 60° behind (lags)', fi: 'Se on 60° jäljessä' } },
          { id: 'b', html: { en: 'It is 60° ahead (leads)', fi: 'Se on 60° edellä' } },
          { id: 'c', html: { en: 'It is 30° ahead', fi: 'Se on 30° edellä' } },
          { id: 'd', html: { en: 'It is 120° ahead', fi: 'Se on 120° edellä' } }],
        hints: [{ en: 'A positive initial phase shifts the wave to the left.', fi: 'Positiivinen alkuvaihe siirtää aaltoa vasemmalle.' }] },
      { id: 't9-q2', mode: 'practice', type: 'numeric', difficulty: 1, tol: 0.02,
        prompt: { en: 'A signal generator gives 400 Hz. Find its period T in seconds.', fi: 'Signaaligeneraattorin taajuus on 400 Hz. Laske jaksonaika T sekunteina.' },
        fields: [{ id: 'T', tex: 'T', unit: 's' }] },
      { id: 't9-q3', mode: 'practice', type: 'numeric', difficulty: 1, tol: 0.02,
        prompt: { en: 'An FM radio signal has f = 100 MHz. Find its wavelength in air (c_0 = 3.00·10^8 m/s).', fi: 'FM-radiosignaalin taajuus on 100 MHz. Laske sen aallonpituus ilmassa (c_0 = 3,00·10^8 m/s).' },
        fields: [{ id: 'lam', tex: 'λ', unit: 'm' }] },
      { id: 't9-q4', mode: 'practice', type: 'multi', difficulty: 2,
        prompt: { en: 'Which statements hold for <b>sine waves only</b>?', fi: 'Mitkä väitteet pätevät <b>vain siniaalloille</b>?' },
        options: [
          { id: 'a', html: { en: '<f>V = V_m/√2</f>', fi: '<f>V = V_m/√2</f>' } },
          { id: 'b', html: { en: '<f>V_pp = 2 V_m</f> (symmetric wave)', fi: '<f>V_pp = 2 V_m</f> (symmetrinen aalto)' } },
          { id: 'c', html: { en: '<f>V_av = (2/π) V_m</f>', fi: '<f>V_av = (2/π) V_m</f>' } },
          { id: 'd', html: { en: 'The average over a whole period is zero', fi: 'Keskiarvo koko jakson yli on nolla' } }] },
      { id: 't9-q5', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.02,
        prompt: { en: 'A full-wave bridge rectifier is fed from 230 V rms. A dc voltmeter measures the average value at its output. What does it show?', fi: 'Kokoaaltotasasuuntaussilta saa 230 V:n tehollisen jännitteen. Tasajännitemittari mittaa lähdön keskiarvoa. Mitä se näyttää?' },
        fields: [{ id: 'U', tex: 'U_2', unit: 'V' }] },
      { id: 't9-q6', mode: 'practice', type: 'match', difficulty: 1,
        prompt: { en: 'Match each waveform with its form factor (rms / rectified average).', fi: 'Yhdistä aaltomuoto ja sen muotokerroin (tehollisarvo / tasasuunnattu keskiarvo).' },
        left: [{ id: 'sin', html: { en: 'sine', fi: 'sini' } }, { id: 'tri', html: { en: 'triangle', fi: 'kolmio' } }, { id: 'sq', html: { en: 'square', fi: 'suorakulma' } }],
        right: [{ id: 'r1', html: { en: '1.00', fi: '1,00' } }, { id: 'r2', html: { en: '1.11', fi: '1,11' } }, { id: 'r3', html: { en: '1.15', fi: '1,15' } }, { id: 'r4', html: { en: '0.71', fi: '0,71' } }] },
      { id: 't9-q7', mode: 'practice', type: 'mc', difficulty: 2,
        prompt: { en: 'A simple average-responding multimeter (calibrated for sine waves) measures a square-wave current of ±10 A. What does it show?', fi: 'Yksinkertainen keskiarvoa mittaava yleismittari (kalibroitu siniaallolle) mittaa suorakulma-aaltoista ±10 A:n virtaa. Mitä se näyttää?' },
        options: [{ id: 'a', html: { en: '10.0 A', fi: '10,0 A' } }, { id: 'b', html: { en: '11.1 A', fi: '11,1 A' } }, { id: 'c', html: { en: '7.07 A', fi: '7,07 A' } }, { id: 'd', html: { en: '14.1 A', fi: '14,1 A' } }] },
      { id: 't9-q8', mode: 'practice', type: 'fill', difficulty: 1,
        prompt: { en: 'Complete the sentences about ideal components.', fi: 'Täydennä virkkeet ihanteellisista komponenteista.' },
        text: { en: 'In a capacitor the [[a]] leads by 90°; in a coil the [[b]] leads by 90°.', fi: 'Kondensaattorissa [[a]] on 90° edellä; kelassa [[b]] on 90° edellä.' },
        fields: [{ id: 'a', kind: 'text' }, { id: 'b', kind: 'text' }] },
      { id: 't9-q9', mode: 'practice', type: 'slider', difficulty: 2, tol: 0.03,
        prompt: { en: 'A 15 µF capacitor is connected to 10 V. Set the frequency so that the current is 0.47 A.', fi: '15 µF:n kondensaattori liitetään 10 V:n jännitteeseen. Säädä taajuus niin, että virta on 0,47 A.' },
        widget: { name: 'plot', config: {
          x: { min: 50, max: 1000, label: { en: 'Frequency f', fi: 'Taajuus f' }, unit: 'Hz' }, y: { min: 0, max: 1, label: { en: 'Current I', fi: 'Virta I' }, unit: 'A' },
          params: [{ id: 'f', tex: 'f', min: 50, max: 1000, step: 5, value: 200, unit: 'Hz' }],
          curves: [{ fn: function (x) { return 10 * TAU * x * 15e-6; }, label: { en: 'I(f)', fi: 'I(f)' } }],
          hlines: function () { return [{ y: 0.47, label: '0.47 A', color: '--c-2' }]; },
          points: function (p) { return [{ x: p.f, y: 10 * TAU * p.f * 15e-6 }]; },
          readouts: function (p) { return [{ tex: 'I', value: 10 * TAU * p.f * 15e-6, unit: 'A' }]; },
          answer: function (p) { return { v: p.f }; }
        } } },
      { id: 't9-q10', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.02,
        prompt: { en: 'A load takes P = 2.0 kW at cos φ = 0.80 (inductive). Find its reactive power Q.', fi: 'Kuorma ottaa tehon P = 2,0 kW, kun cos φ = 0,80 (induktiivinen). Laske sen loisteho Q.' },
        fields: [{ id: 'Q', tex: 'Q', unit: 'var' }] },
      { id: 't9-q11', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.02,
        prompt: { en: 'A series circuit has R = 1.0 kΩ and L = 20 mH at 10 kHz. Find |Z| and the phase angle φ (inductive, so positive).', fi: 'Sarjapiirissä R = 1,0 kΩ ja L = 20 mH taajuudella 10 kHz. Laske |Z| ja vaihekulma φ (induktiivinen, joten positiivinen).' },
        fields: [{ id: 'Z', tex: '|Z|', unit: 'Ω' }, { id: 'phi', tex: 'φ', unit: '°', tol: 0.02 }] },
      { id: 't9-q12', mode: 'practice', type: 'order', difficulty: 2,
        prompt: { en: 'Order the behaviour of a series RLC circuit from low to high frequency.', fi: 'Järjestä RLC-sarjapiirin käyttäytyminen matalasta korkeaan taajuuteen.' },
        items: [{ id: 'i', html: { en: 'inductive: I lags U', fi: 'induktiivinen: I on U:ta jäljessä' } }, { id: 'c', html: { en: 'capacitive: I leads U', fi: 'kapasitiivinen: I on U:ta edellä' } }, { id: 'r', html: { en: 'resonance: φ = 0', fi: 'resonanssi: φ = 0' } }] },
      { id: 't9-q13', mode: 'practice', type: 'numeric', difficulty: 3, tol: 0.02,
        prompt: { en: 'Series RLC: U = 25 V, R = 10 Ω, L = 0.20 H, C = 70 µF, f = 50 Hz. Find the voltage across the coil, U_L.', fi: 'RLC-sarjapiiri: U = 25 V, R = 10 Ω, L = 0,20 H, C = 70 µF, f = 50 Hz. Laske kelan jännite U_L.' },
        fields: [{ id: 'UL', tex: 'U_L', unit: 'V' }],
        hints: [{ en: 'Find the current first: it is the same through R, L and C. Then use U_L = I·X_L.', fi: 'Laske ensin virta: se on sama R:ssä, L:ssä ja C:ssä. Käytä sitten U_L = I·X_L.' }, { en: 'Write X_L = 2π f L and X_C = 1/(2π f C), then Z = √(R² + (X_L − X_C)²) and I = U/Z.', fi: 'Kirjoita X_L = 2π f L ja X_C = 1/(2π f C), sitten Z = √(R² + (X_L − X_C)²) ja I = U/Z.' }, { en: 'Do not divide U by R or by X_L alone: the whole impedance Z limits the current.', fi: 'Älä jaa U:ta pelkällä R:llä tai X_L:llä: virtaa rajoittaa koko impedanssi Z.' }] },
      { id: 't9-q14', mode: 'practice', type: 'circuit', difficulty: 2, tol: 0.03,
        prompt: { en: 'Set the frequency slider so that the series RLC circuit is in resonance (the ammeter is at its maximum).', fi: 'Säädä taajuussäädin niin, että RLC-sarjapiiri on resonanssissa (virtamittari näyttää suurinta arvoa).' },
        widget: { name: 'circuit', config: {
          ac: { f: 20, min: 10, max: 100, step: 0.5 },
          parts: [
            { id: 'U1', type: 'V', a: [0, 4], b: [0, 0], value: 25 },
            { id: 'R1', type: 'R', a: [0, 0], b: [3, 0], value: 10 },
            { id: 'L1', type: 'L', a: [3, 0], b: [6, 0], value: 0.2 },
            { id: 'C1', type: 'C', a: [6, 0], b: [9, 0], value: 70e-6 },
            { id: 'A1', type: 'ammeter', a: [9, 0], b: [9, 4] }
          ],
          wires: [[[9, 4], [0, 4]]],
          tools: [], table: true,
          answer: { kind: 'f' }
        } } },
      { id: 't9-q15', mode: 'practice', type: 'numeric', difficulty: 3, tol: 0.02,
        prompt: { en: 'The same circuit (25 V, R = 10 Ω, L = 0.20 H, C = 70 µF) is at resonance. Find the voltage across the coil.', fi: 'Sama piiri (25 V, R = 10 Ω, L = 0,20 H, C = 70 µF) on resonanssissa. Laske kelan jännite.' },
        fields: [{ id: 'UL', tex: 'U_L', unit: 'V' }],
        hints: [{ en: 'At resonance X_L = X_C, so the reactances cancel in Z.', fi: 'Resonanssissa X_L = X_C, joten reaktanssit kumoavat toisensa Z:ssä.' }, { en: 'Then Z = R and the current is I = U/R. Find the resonance angular frequency from ω_r = 1/√(L C).', fi: 'Silloin Z = R ja virta on I = U/R. Laske resonanssikulmataajuus kaavasta ω_r = 1/√(L C).' }, { en: 'Now U_L = I·X_L with X_L = ω_r L. Use the current at resonance, not the current from the 50 Hz case.', fi: 'Nyt U_L = I·X_L, missä X_L = ω_r L. Käytä resonanssin virtaa, älä 50 Hz:n tapauksen virtaa.' }] },
      { id: 't9-q16', mode: 'practice', type: 'fill', difficulty: 2,
        prompt: { en: 'Complete the sentence.', fi: 'Täydennä virke.' },
        text: { en: 'When R is reduced, the resonance peak becomes [[a]] and the bandwidth becomes [[b]].', fi: 'Kun R:ää pienennetään, resonanssihuippu muuttuu [[a]] ja kaistanleveys [[b]].' },
        fields: [{ id: 'a', kind: 'text' }, { id: 'b', kind: 'text' }] },
      // ---------------- graded
      { id: 't9-g1', mode: 'graded', type: 'numeric', difficulty: 1, points: 2, tol: 0.01,
        prompt: { en: 'Find the angular frequency ω of the 50 Hz mains in rad/s.', fi: 'Laske 50 Hz:n verkon kulmataajuus ω yksikössä rad/s.' },
        fields: [{ id: 'w', tex: 'ω', unit: 'rad/s' }] },
      { id: 't9-g2', mode: 'graded', type: 'numeric', difficulty: 1, points: 2, tol: 0.01,
        prompt: { en: 'Find the peak value of a sinusoidal voltage of 230 V rms.', fi: 'Laske sinimuotoisen 230 V:n (tehollinen) jännitteen huippuarvo.' },
        fields: [{ id: 'Vm', tex: 'V_m', unit: 'V' }] },
      { id: 't9-g3', mode: 'graded', type: 'numeric', difficulty: 1, points: 2, tol: 0.01,
        prompt: { en: 'Find the rms value of a triangle wave with peak value 200 V.', fi: 'Laske kolmioaallon tehollisarvo, kun huippuarvo on 200 V.' },
        fields: [{ id: 'V', tex: 'V', unit: 'V' }] },
      { id: 't9-g4', mode: 'graded', type: 'numeric', difficulty: 3, points: 3, tol: 0.02,
        prompt: { en: 'Series RLC: U = 25 V, R = 10 Ω, L = 0.20 H, C = 70 µF, f = 50 Hz. Find |Z| and the current I.', fi: 'RLC-sarjapiiri: U = 25 V, R = 10 Ω, L = 0,20 H, C = 70 µF, f = 50 Hz. Laske |Z| ja virta I.' },
        fields: [{ id: 'Z', tex: '|Z|', unit: 'Ω' }, { id: 'I', tex: 'I', unit: 'A' }],
        hints: [{ en: 'Series circuit: the impedance combines R and the net reactance X = X_L − X_C.', fi: 'Sarjapiirissä impedanssi yhdistää R:n ja nettoreaktanssin X = X_L − X_C.' }, { en: 'First calculate X_L = 2π f L and X_C = 1/(2π f C) separately at the given frequency.', fi: 'Laske ensin X_L = 2π f L ja X_C = 1/(2π f C) erikseen annetulla taajuudella.' }, { en: 'Then |Z| = √(R² + X²) (reactances subtract, they do not add) and I = U/|Z|.', fi: 'Sitten |Z| = √(R² + X²) (reaktanssit vähennetään, ei lasketa yhteen) ja I = U/|Z|.' }] },
      { id: 't9-g5', mode: 'graded', type: 'multi', difficulty: 2, points: 2,
        prompt: { en: 'Which statements hold for a series RLC circuit at resonance?', fi: 'Mitkä väitteet pätevät RLC-sarjapiirille resonanssissa?' },
        options: [
          { id: 'a', html: { en: '<f>Z = R</f>', fi: '<f>Z = R</f>' } },
          { id: 'b', html: { en: '<f>U_L</f> and <f>U_C</f> are equal in size', fi: '<f>U_L</f> ja <f>U_C</f> ovat yhtä suuret' } },
          { id: 'c', html: { en: 'The current is at its maximum', fi: 'Virta on suurimmillaan' } },
          { id: 'd', html: { en: '<f>φ = 90°</f>', fi: '<f>φ = 90°</f>' } },
          { id: 'e', html: { en: 'The reactive power of the whole circuit is zero', fi: 'Koko piirin loisteho on nolla' } }] },
      { id: 't9-g6', mode: 'graded', type: 'numeric', difficulty: 3, points: 3, tol: 0.02,
        prompt: { en: 'A series RLC circuit has L = 0.20 H, C = 70 µF and R = 5.0 Ω. Find its Q-factor and bandwidth.', fi: 'RLC-sarjapiirissä L = 0,20 H, C = 70 µF ja R = 5,0 Ω. Laske hyvyysluku ja kaistanleveys.' },
        fields: [{ id: 'Q', tex: 'Q' }, { id: 'BW', tex: 'BW', unit: 'Hz' }],
        hints: [{ en: 'Q-factor links the reactance at resonance to the resistance, and bandwidth links f_r and Q.', fi: 'Hyvyysluku yhdistää resonanssin reaktanssin ja resistanssin, ja kaistanleveys yhdistää f_r:n ja Q:n.' }, { en: 'Find ω_r = 1/√(L C) first, then Q = ω_r L / R.', fi: 'Laske ensin ω_r = 1/√(L C), sitten Q = ω_r L / R.' }, { en: 'Convert to f_r = ω_r/(2π), then BW = f_r / Q (equivalently R/(2π L)). Q has no unit.', fi: 'Muunna f_r = ω_r/(2π), sitten BW = f_r / Q (vastaavasti R/(2π L)). Q:lla ei ole yksikköä.' }] }
    ]
  });
})();

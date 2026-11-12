/* Topic 4: Ideal gas and kinetic theory (slides Ph2_3 p16-p29 and Ph2_4 p01-p08).
 * NO answers in this file: they live in src/answers/topic4.json. Ids are stable, never rename. */
(function () {
  'use strict';
  function L(en, fi) { return { en: en, fi: fi }; }
  function fsz(w) { return Math.max(11, Math.min(14, Math.round(w / 48))); }
  // device widget (thermo-common.js TV.device), looked up at mount: the tools load content without the viz scripts
  function dev(def, vals) { return { mount: function (h, c) { return TDC.thermoViz.device(def, vals).mount(h, c); } }; }
  function nf(v, d) { return TDC.util.fmtNum(v, d); }
  function line(g, x1, y1, x2, y2) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }

  // ---------- device: compressed-air receiver feeding a pneumatic cylinder (t4-dev-air) ----------
  var PA = 101300, VR = 0.1, TK = 293.15, PW = 6e5 + PA, VC = Math.PI / 4 * 0.05 * 0.05 * 0.2;   // 100 L at 20 °C; 6 bar gauge; Ø 50 × 200 mm
  function airState(v) {
    var TH = TDC.thermo, n0 = TH.idealGas({ p: v.pg * 1e5 + PA, V: VR, T: TK }, 'n'), nc = TH.idealGas({ p: PW, V: VC, T: TK }, 'n');
    var nk = Math.max(0, n0 - v.k * nc), p = nk > 0 ? TH.idealGas({ n: nk, V: VR, T: TK }, 'p') : 0;
    return { n0: n0, nc: nc, p: p, pg: Math.max(0, p - PA), left: Math.max(0, (v.pg * 1e5 + PA - PW) * VR / (PW * VC)) };
  }
  var AIR = {
    animate: true,
    params: [{ id: 'pg', tex: 'p_g', min: 4, max: 10, step: 0.1, value: 7, unit: 'bar' }, { id: 'k', label: L('strokes made', 'tehdyt iskut'), min: 0, max: 80, step: 1, value: 0, unit: '' }],
    buttons: [
      { label: L('Make a stroke', 'Tee isku'), click: function (p, D) { if (D.motion) { if (D.S.st == null) D.S.st = 0; } else D.set({ k: p.k + 1 }); } },
      { label: L('10 strokes', '10 iskua'), click: function (p, D) { D.set({ k: p.k + 10 }); } },
      { label: L('Refill with the compressor', 'Täytä kompressorilla'), click: function (p, D) { D.S.st = null; D.set({ k: 0 }); } }
    ],
    draw: function (g, w, h, p, ctx, TV, D) {
      var S = D.S, s = airState(p), weak = s.pg < 6e5;
      if (S.st != null) { S.st += D.dt / (weak ? 2.6 : 1); if (S.st >= 1) { S.st = null; D.set({ k: p.k + 1 }); s = airState(p); weak = s.pg < 6e5; } }
      var fg = ctx.color('--fg'), mu = ctx.color('--muted'), wire = ctx.color('--c-wire'), body = ctx.color('--c-body-fill'), air = ctx.color('--c-electron');
      var warn = ctx.color('--c-2'), fs = fsz(w), narrow = w < 520, floor = h * 0.92;
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      g.strokeStyle = wire; g.lineWidth = 2; line(g, 0, floor, w, floor);
      // receiver: horizontal vessel on two legs, air dots ∝ absolute pressure
      var tx0 = w * 0.04, tx1 = w * (narrow ? 0.44 : 0.38), ty0 = h * 0.5, ty1 = h * 0.78, tr = (ty1 - ty0) / 2;
      g.lineWidth = 3; [tx0 + tr, tx1 - tr].forEach(function (x) { line(g, x, ty1, x - 6, floor); line(g, x, ty1, x + 6, floor); });
      g.fillStyle = body; TV.rr(g, tx0, ty0, tx1 - tx0, ty1 - ty0, tr); g.fill();
      g.fillStyle = TV.alpha(air, 0.06 + 0.25 * Math.min(1, s.p / 1.2e6)); g.fill(); g.strokeStyle = wire; g.lineWidth = 2.5; g.stroke();
      if (!S.dots) { S.dots = []; for (var i = 0; i < 48; i++) S.dots.push([Math.random(), Math.random(), Math.random() * 6]); }
      var nd = Math.min(48, Math.round(s.p / 1e5 * 4)); g.fillStyle = air;
      for (i = 0; i < nd; i++) {
        var d = S.dots[i], x = tx0 + tr * 0.6 + (tx1 - tx0 - tr * 1.2) * d[0] + 3 * Math.sin(D.t * 4 + d[2]), y = ty0 + 6 + (ty1 - ty0 - 12) * d[1] + 3 * Math.cos(D.t * 5 + d[2]);
        g.beginPath(); g.arc(x, y, 2.4, 0, 2 * Math.PI); g.fill();
      }
      TV.font(g, fs, 600); TV.text(g, '100 L · 20 °C', (tx0 + tx1) / 2, ty1 - 10, fg, 'center', body);
      // receiver gauge (bar, gauge pressure)
      var r = Math.min(w * 0.075, h * 0.12), gx = (tx0 + tx1) / 2, gy = ty0 - r - 14;
      g.strokeStyle = wire; g.lineWidth = 3; line(g, gx, ty0, gx, gy + r);
      TV.gauge(g, ctx, gx, gy, r, s.pg / 1e5, 12, null, nf(s.pg / 1e5, 2));
      TV.font(g, fs - 1, 500); TV.text(g, '0…12 bar', gx + r + 6, gy - r * 0.6, mu, 'left');
      // regulator set to 6 bar: its outlet gauge shows min(6 bar, receiver)
      var ym = (ty0 + ty1) / 2, rx = tx1 + w * 0.07, rw = Math.max(18, w * 0.04);
      g.strokeStyle = wire; g.lineWidth = 4; line(g, tx1, ym, rx - rw / 2, ym);
      g.fillStyle = body; g.lineWidth = 2; TV.rr(g, rx - rw / 2, ym - rw * 0.7, rw, rw * 1.4, 3); g.fill(); g.stroke();
      line(g, rx, ym - rw * 0.7, rx, ym - rw * 1.1); TV.rr(g, rx - rw * 0.35, ym - rw * 1.3, rw * 0.7, rw * 0.25, 2); g.stroke();
      var r2 = r * 0.62, g2y = ym + rw * 0.7 + r2 + 8;
      line(g, rx, ym + rw * 0.7, rx, g2y - r2);
      TV.gauge(g, ctx, rx, g2y, r2, Math.min(6, s.pg / 1e5), 12, null, nf(Math.min(6, s.pg / 1e5), 2));
      TV.font(g, fs - 1, 500); TV.text(g, ctx.tx(L('regulator 6 bar', 'säädin 6 bar')), rx, g2y + r2 + 10, mu, 'center');
      // pneumatic cylinder with a 5/2 valve; piston travel u = 0…1
      var cx0 = w * (narrow ? 0.6 : 0.58), cx1 = w * 0.78, cy = h * 0.3, ch = Math.max(22, h * 0.12), trav = w * 0.12;
      var u = S.st == null ? 0 : S.st < 0.5 ? S.st * 2 : (1 - S.st) * 2, px = cx0 + 6 + u * trav;
      g.strokeStyle = wire; g.lineWidth = 4; g.beginPath(); g.moveTo(rx + rw / 2, ym); g.lineTo(cx0 - 14, ym); g.lineTo(cx0 - 14, cy); g.lineTo(cx0, cy); g.stroke();
      g.fillStyle = body; g.strokeStyle = wire; g.lineWidth = 2.5; TV.rr(g, cx0, cy - ch / 2, cx1 - cx0, ch, 3); g.fill(); g.stroke();
      if (S.st != null && S.st < 0.5) { g.fillStyle = TV.alpha(air, 0.3); g.fillRect(cx0 + 1, cy - ch / 2 + 1, px - cx0 - 1, ch - 2); }
      g.fillStyle = wire; g.fillRect(px, cy - ch / 2 + 2, 6, ch - 4);
      var tip = px + cx1 - cx0 + w * 0.03; g.fillRect(px + 6, cy - 3, tip - px - 6, 6); g.fillRect(tip - 4, cy - ch * 0.4, 6, ch * 0.8);
      // workpiece pushed along by the rod
      var bx = Math.max(tip + 2, cx1 + w * 0.03 + 6 + 2), bs = ch * 0.8;
      g.fillStyle = TV.alpha(ctx.color('--c-6'), 0.6); g.fillRect(Math.min(bx, w - bs - 2), cy - bs / 2, bs, bs);
      TV.font(g, fs - 1, 500); TV.text(g, 'Ø 50 mm × 200 mm', (cx0 + cx1) / 2, cy + ch / 2 + 11, mu, 'center', ctx.color('--surface'));
      TV.lcd(g, ctx, (cx0 + cx1) / 2, cy - ch / 2 - 18, ctx.tx(L('strokes ', 'iskuja ')) + p.k, fs);
      TV.font(g, fs, 700);
      TV.text(g, ctx.tx(weak ? L('weak stroke: receiver below 6 bar', 'heikko isku: säiliö alle 6 bar') : L('full force', 'täysi voima')),
        (cx0 + w) / 2, h * 0.62, weak ? warn : ctx.color('--c-3'), 'center');
    },
    outputs: function (v) {
      var s = airState(v);
      return [
        { tex: 'n_0', value: s.n0, unit: 'mol' },
        { tex: 'n_c', value: s.nc, unit: 'mol' },
        { tex: 'p', value: s.p, unit: 'Pa' },
        { tex: 'p_g', value: s.pg, unit: 'Pa' },
        { label: L('full strokes at 6 bar from the start', 'täydet iskut 6 barilla alusta'), value: Math.floor(s.left) },
        { label: L('cylinder', 'sylinteri'), value: s.pg >= 6e5 ? L('full force', 'täysi voima') : L('receiver pressure below working pressure', 'säiliön paine alle työpaineen'), warn: s.pg < 6e5 }
      ];
    }
  };

  // ---------- device: electrical cabinet purged with nitrogen, oxygen analyser (t4-da-purge) ----------
  var PURGE = {
    animate: true,
    params: [{ id: 'p', tex: 'p_{tot}', min: 0.5, max: 10, step: 0.1, value: 1, unit: 'bar' }, { id: 'x', tex: 'x_{O_2}', min: 1, max: 21, step: 1, value: 21, unit: '%' }],
    buttons: [
      { label: L('Purge with N₂ (3 s)', 'Huuhtele typellä (3 s)'), click: function (p, D) { if (D.motion) { D.S.pg = 3; D.S.xf = p.x; } else D.set({ x: p.x * Math.exp(-3 / 4) }); } },
      { label: L('Open the door', 'Avaa ovi'), click: function (p, D) { D.S.pg = 0; D.set({ x: 21 }); } }
    ],
    draw: function (g, w, h, p, ctx, TV, D) {
      var S = D.S, i;
      if (S.pg > 0) {   // dilution: x falls as e^(−t/τ), τ = 4 s; the slider moves in whole percents
        S.pg -= D.dt; S.xf = Math.max(1, S.xf * Math.exp(-D.dt / 4));
        if (Math.round(S.xf) !== p.x) D.set({ x: S.xf });
      }
      var purging = S.pg > 0, fg = ctx.color('--fg'), mu = ctx.color('--muted'), wire = ctx.color('--c-wire'), body = ctx.color('--c-body-fill');
      var cO = ctx.color('--c-2'), cN = ctx.color('--c-1'), fs = fsz(w), narrow = w < 520, floor = h * 0.92;
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      g.strokeStyle = wire; g.lineWidth = 2; line(g, 0, floor, w, floor);
      // cabinet with DIN rails and breakers, molecules inside
      var cx0 = w * 0.3, cx1 = w * (narrow ? 0.68 : 0.64), cy0 = h * 0.16, cy1 = floor - 4;
      g.fillStyle = body; g.strokeStyle = wire; g.lineWidth = 3; TV.rr(g, cx0, cy0, cx1 - cx0, cy1 - cy0, 4); g.fill(); g.stroke();
      g.globalAlpha = 0.3; g.lineWidth = 2;
      [0.35, 0.65].forEach(function (f) {
        var y = cy0 + (cy1 - cy0) * f; line(g, cx0 + 8, y, cx1 - 8, y);
        for (var x = cx0 + 14; x < cx1 - 22; x += 16) { g.strokeRect(x, y - 12, 11, 24); }
      });
      g.globalAlpha = 1;
      if (!S.mol) { S.mol = []; for (i = 0; i < 50; i++) S.mol.push({ x: Math.random(), y: Math.random(), a: Math.random() * 6.3 }); }
      var n = Math.min(50, Math.round(10 + 4 * p.p)), xs = S.pg > 0 ? S.xf : p.x, nO = Math.round(n * xs / 100);
      for (i = 0; i < n; i++) {
        var m = S.mol[i], sp = D.dt * 0.25;
        m.x += Math.cos(m.a) * sp; m.y += Math.sin(m.a) * sp * 1.3;
        if (m.x < 0 || m.x > 1) { m.a = Math.PI - m.a; m.x = Math.max(0, Math.min(1, m.x)); }
        if (m.y < 0 || m.y > 1) { m.a = -m.a; m.y = Math.max(0, Math.min(1, m.y)); }
        g.fillStyle = i < nO ? cO : cN; g.beginPath();
        g.arc(cx0 + 10 + (cx1 - cx0 - 20) * m.x, cy0 + 26 + (cy1 - cy0 - 36) * m.y, i < nO ? 4 : 3.2, 0, 2 * Math.PI); g.fill();
      }
      TV.font(g, fs - 1, 600);
      g.fillStyle = cO; g.beginPath(); g.arc(cx0 + 12, cy0 + 12, 4, 0, 7); g.fill(); TV.text(g, 'O₂', cx0 + 20, cy0 + 12, fg, 'left');
      g.fillStyle = cN; g.beginPath(); g.arc(cx0 + 50, cy0 + 12, 3.2, 0, 7); g.fill(); TV.text(g, 'N₂', cx0 + 58, cy0 + 12, fg, 'left');
      // vent on the roof, gas out while purging
      var vx = cx1 - 22; g.strokeStyle = wire; g.lineWidth = 3; line(g, vx, cy0, vx, cy0 - 14); line(g, vx - 8, cy0 - 14, vx + 8, cy0 - 14);
      if (purging) TV.arrow(g, vx + 4, cy0 - 18, vx + 20, cy0 - 34 + 3 * Math.sin(D.t * 8), mu, 2);
      // nitrogen bottle with valve and hose into the cabinet bottom
      var bw = Math.max(22, w * 0.07), bx = w * 0.06, by0 = h * 0.3;
      g.fillStyle = TV.alpha(cN, 0.25); g.strokeStyle = wire; g.lineWidth = 2.5; TV.rr(g, bx, by0, bw, floor - by0, bw / 2); g.fill(); g.stroke();
      g.fillStyle = wire; g.fillRect(bx + bw / 2 - 3, by0 - 12, 6, 12); g.fillRect(bx + bw / 2 - 9, by0 - 16, 18, 5);
      TV.font(g, fs, 700); TV.text(g, 'N₂', bx + bw / 2, (by0 + floor) / 2, fg, 'center');
      var hy = cy1 - 18; g.strokeStyle = purging ? cN : wire; g.lineWidth = 3;
      if (purging) { g.setLineDash([8, 6]); g.lineDashOffset = -D.t * 40; }
      g.beginPath(); g.moveTo(bx + bw / 2 + 9, by0 - 14); g.lineTo(bx + bw + 14, by0 - 14); g.lineTo(bx + bw + 14, hy); g.lineTo(cx0, hy); g.stroke();
      g.setLineDash([]); g.lineDashOffset = 0;
      TV.font(g, fs - 1, 500); TV.text(g, ctx.tx(purging ? L('valve open', 'venttiili auki') : L('valve closed', 'venttiili kiinni')), bx + bw + 18, hy - 12, purging ? cN : mu, 'left', ctx.color('--surface'));
      // oxygen analyser and total-pressure gauge on the right
      var ax = (cx1 + w) / 2, r = Math.min(w * 0.08, h * 0.12);
      g.strokeStyle = wire; g.lineWidth = 2; line(g, cx1, h * 0.3, ax - 30, h * 0.3);
      TV.font(g, fs - 1, 500); TV.text(g, ctx.tx(L('O₂ analyser', 'O₂-analysaattori')), ax, h * 0.3 - 26, mu, 'center');
      TV.lcd(g, ctx, ax, h * 0.3, 'O₂ ' + nf(xs, 3) + ' %', fs + 1);
      TV.lcd(g, ctx, ax, h * 0.3 + fs + 16, nf(p.p * 100 * xs / 100, 3) + ' kPa', fs);
      var gy = h * 0.68; line(g, cx1, gy, ax - r, gy);
      TV.gauge(g, ctx, ax, gy, r, p.p, 10, 'p_{tot} / bar', nf(p.p, 2));
    },
    outputs: function (v) {
      var pt = v.p * 1e5;
      return [{ tex: 'p_{O_2}', value: pt * v.x / 100, unit: 'Pa' }, { tex: 'p_{rest}', value: pt * (1 - v.x / 100), unit: 'Pa' }];
    }
  };

TDC.registerTopic({
  id: 't4', num: 4,
  title: { en: 'Ideal gas and kinetic theory', fi: 'Ideaalikaasu ja kineettinen kaasuteoria' },
  subtitle: { en: 'From pneumatic cylinders and tyres to switchgear: how pressure, volume and temperature of a gas belong together, and what the molecules are doing.',
              fi: 'Paineilmasylinterien, rengasten ja kytkinlaitteiden kautta: miten kaasun paine, tilavuus ja lämpötila liittyvät toisiinsa ja mitä molekyylit tekevät.' },
  objectives: [
    { en: 'explain absolute zero and use the kelvin scale with gas laws', fi: 'selittää absoluuttinen nollapiste ja käyttää kelvinasteikkoa kaasulaeissa' },
    { en: 'use the mole, molar mass, molar volume and the Avogadro constant', fi: 'käyttää moolia, moolimassaa, moolitilavuutta ja Avogadron vakiota' },
    { en: 'apply Boyle\'s, Charles\'s and Gay-Lussac\'s laws and pV = nRT (also in the form pV = NkT)', fi: 'soveltaa Boylen, Charlesin ja Gay-Lussacin lakeja sekä yhtälöä pV = nRT (myös muodossa pV = NkT)' },
    { en: 'calculate with partial pressures (Dalton\'s law)', fi: 'laskea osapaineilla (Daltonin laki)' },
    { en: 'explain gas pressure and temperature with molecular motion; calculate v_rms and the three speeds of the Maxwell distribution', fi: 'selittää kaasun paine ja lämpötila molekyylien liikkeellä; laskea v_rms ja Maxwellin jakauman kolme nopeutta' }
  ],
  glossary: {
    idealgas: { en: 'ideal gas', fi: 'ideaalikaasu', def: { en: 'Gas of point-like particles with no forces between them except elastic collisions. Good model for low pressure (about 1 bar or less).', fi: 'Kaasu, jonka hiukkaset ovat pistemäisiä ja joiden välillä ei ole voimia törmäyksiä lukuun ottamatta. Hyvä malli pienillä paineilla (noin 1 bar tai alle).' } },
    eos: { en: 'equation of state of a gas', fi: 'kaasun tilanyhtälö', sym: 'pV = nRT', def: { en: 'Relation between pressure, volume, temperature and amount of gas.', fi: 'Yhtälö, joka liittää kaasun paineen, tilavuuden, lämpötilan ja ainemäärän toisiinsa.' } },
    gasconst: { en: 'universal gas constant', fi: 'yleinen kaasuvakio', sym: 'R = 8.314 J/(mol·K)', def: { en: 'Constant in pV = nRT.', fi: 'Yhtälön pV = nRT vakio.' } },
    boltzmann: { en: 'Boltzmann constant', fi: 'Boltzmannin vakio', sym: 'k = R/N_A', def: { en: 'Gas constant per molecule, k = 1.3806·10^-23 J/K.', fi: 'Kaasuvakio yhtä molekyyliä kohti, k = 1,3806·10^-23 J/K.' } },
    avogadro: { en: 'Avogadro constant', fi: 'Avogadron vakio', sym: 'N_A = 6.022·10^23 1/mol', def: { en: 'Number of particles in one mole.', fi: 'Hiukkasten lukumäärä yhdessä moolissa.' } },
    amount: { en: 'amount of substance', fi: 'ainemäärä', sym: 'n', def: { en: 'Number of particles counted in moles, n = m/M = N/N_A.', fi: 'Hiukkasten lukumäärä moolina, n = m/M = N/N_A.' } },
    mole: { en: 'mole', fi: 'mooli', sym: 'mol', def: { en: 'SI unit of amount of substance: N_A particles.', fi: 'Ainemäärän SI-yksikkö: N_A hiukkasta.' } },
    molarmass: { en: 'molar mass', fi: 'moolimassa', sym: 'M', def: { en: 'Mass of one mole, in g/mol (numerically the molecular mass in u).', fi: 'Yhden moolin massa, yksikkö g/mol (numeroarvoltaan molekyylimassa yksikössä u).' } },
    molarvol: { en: 'molar volume', fi: 'moolitilavuus', sym: 'V_m', def: { en: 'Volume of one mole of gas; 22.414 l/mol at STP.', fi: 'Yhden moolin tilavuus; NTP-oloissa 22,414 l/mol.' } },
    amu: { en: 'atomic mass unit', fi: 'atomimassayksikkö', sym: 'u', def: { en: '1/12 of the mass of a carbon-12 atom, 1.6605·10^-27 kg.', fi: 'Hiili-12-atomin massan 1/12, 1,6605·10^-27 kg.' } },
    stp: { en: 'standard conditions (STP)', fi: 'NTP-olot (normaaliolot)', sym: '273.15 K, 101.325 kPa', def: { en: 'Reference state of 0 °C and standard atmospheric pressure.', fi: 'Vertailutila 0 °C ja normaali ilmanpaine.' } },
    abszero: { en: 'absolute zero', fi: 'absoluuttinen nollapiste', sym: '0 K = -273.15 °C', def: { en: 'Lowest possible temperature, where the extrapolated gas volume would reach zero.', fi: 'Alin mahdollinen lämpötila, jossa ekstrapoloitu kaasun tilavuus olisi nolla.' } },
    boyle: { en: "Boyle's law", fi: 'Boylen laki', sym: 'pV = constant', def: { en: 'At constant T and n the product pV is constant.', fi: 'Vakiolämpötilassa ja vakioainemäärällä tulo pV on vakio.' } },
    charles: { en: "Charles's law", fi: 'Charlesin laki', sym: 'V/T = constant', def: { en: 'At constant p and n the volume is proportional to T.', fi: 'Vakiopaineessa ja vakioainemäärällä tilavuus on verrannollinen lämpötilaan T.' } },
    gaylussac: { en: "Gay-Lussac's law", fi: 'Gay-Lussacin laki', sym: 'p/T = constant', def: { en: 'At constant V and n the pressure is proportional to T.', fi: 'Vakiotilavuudessa ja vakioainemäärällä paine on verrannollinen lämpötilaan T.' } },
    isothermal: { en: 'isothermal change', fi: 'isoterminen muutos', def: { en: 'Change at constant temperature.', fi: 'Muutos vakiolämpötilassa.' } },
    isobaric: { en: 'isobaric change', fi: 'isobaarinen muutos', def: { en: 'Change at constant pressure.', fi: 'Muutos vakiopaineessa.' } },
    isochoric: { en: 'isochoric change', fi: 'isokoorinen muutos', def: { en: 'Change at constant volume.', fi: 'Muutos vakiotilavuudessa.' } },
    partialp: { en: 'partial pressure', fi: 'osapaine', sym: 'p_i = x_i · p_tot', def: { en: 'Pressure a gas component would have alone in the same volume.', fi: 'Paine, jonka kaasun komponentti aiheuttaisi yksin samassa tilavuudessa.' } },
    dalton: { en: "Dalton's law", fi: 'Daltonin laki', sym: 'p_tot = Σ p_i', def: { en: 'Total pressure of a gas mixture is the sum of the partial pressures.', fi: 'Kaasuseoksen kokonaispaine on osapaineiden summa.' } },
    kinetic: { en: 'kinetic theory of gases', fi: 'kineettinen kaasuteoria', def: { en: 'Explains gas properties by the random motion of molecules and statistics.', fi: 'Selittää kaasun ominaisuudet molekyylien satunnaisella liikkeellä ja tilastollisilla keskiarvoilla.' } },
    meanke: { en: 'mean kinetic energy', fi: 'keskimääräinen liike-energia', sym: 'K = 3/2·kT', def: { en: 'Average translational kinetic energy of a molecule, proportional to T.', fi: 'Molekyylin keskimääräinen translaatioliike-energia, verrannollinen lämpötilaan T.' } },
    vrms: { en: 'root-mean-square speed', fi: 'neliöllinen keskinopeus', sym: 'v_rms = √(3kT/m)', def: { en: 'Square root of the mean of the squared speeds.', fi: 'Nopeuden neliön keskiarvon neliöjuuri.' } },
    vp: { en: 'most probable speed', fi: 'todennäköisin nopeus', sym: 'v_p = √(2kT/m)', def: { en: 'Speed at the peak of the Maxwell distribution.', fi: 'Maxwellin jakauman huipun kohdalla oleva nopeus.' } },
    vmean: { en: 'mean speed', fi: 'keskinopeus', sym: 'v̄ = √(8kT/πm)', def: { en: 'Average of the molecular speeds.', fi: 'Molekyylien nopeuksien keskiarvo.' } },
    maxwell: { en: 'Maxwell speed distribution', fi: 'Maxwellin nopeusjakauma', def: { en: 'Distribution of molecular speeds in a gas; depends only on T (and the molecular mass).', fi: 'Molekyylien nopeuksien jakauma kaasussa; riippuu vain lämpötilasta (ja molekyylimassasta).' } },
    pressure: { en: 'pressure', fi: 'paine', sym: 'p', def: { en: 'Force per area, unit pascal (Pa).', fi: 'Voima pinta-alaa kohti, yksikkö pascal (Pa).' } },
    density: { en: 'density', fi: 'tiheys', sym: 'ρ', def: { en: 'Mass per volume.', fi: 'Massa tilavuutta kohti.' } },
    gaugep: { en: 'gauge pressure', fi: 'ylipaine', sym: 'p_g = p − p_0', def: { en: 'Pressure above the atmospheric pressure.', fi: 'Ilmanpaineen ylittävä paine.' } },
    absp: { en: 'absolute pressure', fi: 'absoluuttinen paine', sym: 'p = p_g + p_0', def: { en: 'Pressure measured from vacuum. Always use it in gas laws.', fi: 'Tyhjiöstä mitattu paine. Käytä aina kaasulaeissa.' } },
    temperature: { en: 'temperature', fi: 'lämpötila', sym: 'T', def: { en: 'Measure of the mean kinetic energy of the molecules; absolute temperature T in kelvins.', fi: 'Molekyylien keskimääräisen liike-energian mitta; absoluuttinen lämpötila T kelvineinä.' } }
  },
  formulas: [
    { name: { en: 'Ideal gas law', fi: 'Kaasun tilanyhtälö' }, tex: 'pV = nRT = NkT' },
    { name: { en: 'Combined gas law (n constant)', fi: 'Yhdistetty kaasulaki (n vakio)' }, tex: '{p_1V_1}/{T_1} = {p_2V_2}/{T_2}' },
    { name: { en: 'Amount of substance', fi: 'Ainemäärä' }, tex: 'n = {m}/{M} = {N}/{N_A}' },
    { name: { en: 'Density of a gas', fi: 'Kaasun tiheys' }, tex: 'ρ = {M}/{V_m} = {pM}/{RT}' },
    { name: { en: 'Boltzmann constant', fi: 'Boltzmannin vakio' }, tex: 'k = {R}/{N_A} ≈ 1.3806·10^{-23} J/K' },
    { name: { en: "Dalton's law", fi: 'Daltonin laki' }, tex: 'p_{tot} = Σ p_i, p_i = x_i · p_{tot}' },
    { name: { en: 'Pressure from collisions', fi: 'Paine törmäyksistä' }, tex: 'p = {1}/{3}·{N m ⟨v^2⟩}/{V}' },
    { name: { en: 'Mean kinetic energy', fi: 'Keskimääräinen liike-energia' }, tex: 'K = {1}/{2} m⟨v^2⟩ = {3}/{2} kT' },
    { name: { en: 'Root-mean-square speed', fi: 'Neliöllinen keskinopeus' }, tex: 'v_{rms} = sqrt{{3kT}/{m}} = sqrt{{3RT}/{M}}' },
    { name: { en: 'Most probable speed', fi: 'Todennäköisin nopeus' }, tex: 'v_p = sqrt{{2kT}/{m}}' },
    { name: { en: 'Mean speed', fi: 'Keskinopeus' }, tex: 'v̄ = sqrt{{8kT}/{πm}}' }
  ],
  sections: [
    // ------------------------------------------------------------------ absolute zero
    {
      id: 't4-zero', title: { en: 'Gas thermometer and absolute zero', fi: 'Kaasulämpömittari ja absoluuttinen nollapiste' },
      blocks: [
        { id: 't4-zero-p1', type: 'text', html: {
          en: '<p>A <b>constant-volume gas thermometer</b> is a standard thermometer for accurate measurements, especially at low temperatures. A gas bulb is connected to a mercury manometer. The right-hand tube is raised or lowered so that the mercury in the left-hand tube always stays at the reference mark, which keeps the gas volume constant. When the temperature rises, the pressure in the bulb rises in proportion, so the tube must be lifted higher.</p><p>A temperature rise expands a gas and a drop shrinks it. This basic law is <b><dfn data-term="charles">Charles\'s law</dfn></b>: <f>V ∝ T</f> (at constant pressure).</p>',
          fi: '<p><b>Vakiotilavuuskaasulämpömittari</b> on tarkka vertailulämpömittari, erityisesti alhaisissa lämpötiloissa. Kaasupullo on yhdistetty elohopeamanometriin. Oikeaa putkea nostetaan tai lasketaan niin, että elohopea vasemmassa putkessa pysyy aina vertailumerkillä, jolloin kaasun tilavuus pysyy vakiona. Lämpötilan noustessa pullon paine kasvaa suhteessa, joten putkea on nostettava ylemmäs.</p><p>Lämpötilan nousu laajentaa kaasua ja lasku supistaa sitä. Tämä peruslaki on <b><dfn data-term="charles">Charlesin laki</dfn></b>: <f>V ∝ T</f> (vakiopaineessa).</p>' } },
        { id: 't4-zero-p2', type: 'text', html: {
          en: '<p>Measure the volume of a fixed amount of gas at constant pressure as a function of temperature. The points lie on a straight line. Gases liquefy at low temperatures, so the measurement cannot go below the liquefaction point, but extrapolating the line (dashed) it meets the T axis at <b>−273.15 °C = 0 K</b>. This is the <b><dfn data-term="abszero">absolute zero</dfn></b>. On the kelvin scale the line goes through the origin: V is directly proportional to T.</p>',
          fi: '<p>Mitataan kiinteän kaasumäärän tilavuutta vakiopaineessa lämpötilan funktiona. Pisteet asettuvat suoralle. Kaasut nesteytyvät alhaisissa lämpötiloissa, joten mittaus ei ulotu nesteytymispisteen alapuolelle, mutta suoraa jatkamalla (katkoviiva) se leikkaa lämpötila-akselin kohdassa <b>−273,15 °C = 0 K</b>. Tämä on <b><dfn data-term="abszero">absoluuttinen nollapiste</dfn></b>. Kelvin-asteikolla suora kulkee origon kautta: V on suoraan verrannollinen lämpötilaan T.</p>' } },
        { id: 't4-zero-plot', type: 'interactive', widget: 'plot',
          title: { en: 'Charles\'s law: volume against temperature', fi: 'Charlesin laki: tilavuus lämpötilan funktiona' },
          caption: { en: 'Change the amount of gas or the pressure: the line always points at −273.15 °C where the extrapolated volume is zero.',
                     fi: 'Muuta kaasun määrää tai painetta: suora osoittaa aina kohtaan −273,15 °C, jossa ekstrapoloitu tilavuus on nolla.' },
          config: {
            x: { min: -300, max: 300, label: { en: 'Temperature t', fi: 'Lämpötila t' }, unit: '°C' },
            y: { min: 0, max: 10, label: { en: 'Volume V', fi: 'Tilavuus V' }, unit: 'L', auto: true },
            params: [{ id: 'n', tex: 'n', min: 0.05, max: 0.5, step: 0.05, value: 0.1, unit: 'mol' }, { id: 'p', tex: 'p', min: 50, max: 200, step: 10, value: 100, unit: 'kPa' }],
            // measured while the gas stays a gas (nitrogen liquefies near −196 °C); below that only the dashed extrapolation, none below 0 K
            curves: [{ fn: function (x, p) { return x >= -190 ? p.n * 8.314 * (x + 273.15) / p.p : NaN; }, label: { en: 'V(t), measured', fi: 'V(t), mitattu' } },
                     { fn: function (x, p) { return x >= -273.15 && x <= -188 ? p.n * 8.314 * (x + 273.15) / p.p : NaN; }, dash: true, color: '--c-1', label: { en: 'extrapolated', fi: 'ekstrapoloitu' } }],
            vlines: function () { return [{ x: -273.15, label: { en: 'absolute zero', fi: 'absoluuttinen nollapiste' } }]; },
            readouts: function (p) { return [{ tex: 'V(0 °C)', value: p.n * 8.314 * 273.15 / p.p, unit: 'L' }]; }
          } },
        { id: 't4-zero-c1', type: 'callout', kind: 'warn', title: { en: 'Always use kelvins in gas laws', fi: 'Käytä kaasulaeissa aina kelvinejä' },
          html: { en: '<p><f>T = t + 273.15</f> (t in °C, T in K). Gas laws with °C give nonsense: 0 °C is not "zero gas".</p>', fi: '<p><f>T = t + 273,15</f> (t °C:na, T kelvineinä). Kaasulait °C-lämpötiloilla antavat järjettömiä tuloksia: 0 °C ei tarkoita "nollakaasua".</p>' } },
        { id: 't4-zero-q1', type: 'question', q: 't4-q1' },
        { id: 't4-zero-q2', type: 'question', q: 't4-q2' }
      ]
    },
    // ------------------------------------------------------------------ ideal gas, mole
    {
      id: 't4-mole', title: { en: 'The ideal gas and the mole', fi: 'Ideaalikaasu ja mooli' },
      blocks: [
        { id: 't4-mole-p1', type: 'text', html: {
          en: '<p>Gases expand much more than liquids and solids, and they fill the whole container. So it is valuable to find a relation between pressure, volume, temperature and the amount of gas: an <b><dfn data-term="eos">equation of state</dfn></b>. After a change we wait until pressure and temperature are the same everywhere: the gas is in <b>equilibrium</b>. The <b><dfn data-term="idealgas">ideal gas</dfn></b> theory gives the equation of state of ideal gases. It rests on three postulates:</p>',
          fi: '<p>Kaasut laajenevat paljon enemmän kuin nesteet ja kiinteät aineet, ja ne täyttävät koko säiliön. Siksi on hyödyllistä löytää yhtälö paineen, tilavuuden, lämpötilan ja kaasun määrän välille: <b><dfn data-term="eos">tilanyhtälö</dfn></b>. Muutoksen jälkeen odotetaan, että paine ja lämpötila ovat joka kohdassa samat: kaasu on <b>tasapainotilassa</b>. <b><dfn data-term="idealgas">Ideaalikaasun</dfn></b> teoria antaa ideaalikaasujen tilanyhtälön. Se perustuu kolmeen oletukseen:</p>' } },
        { id: 't4-mole-l1', type: 'list', items: [
          { en: 'the atoms and molecules act as particles (no volume)', fi: 'atomit ja molekyylit käyttäytyvät hiukkasina (ei tilavuutta)' },
          { en: 'there are no attractive or repulsive forces between the molecules', fi: 'molekyylien välillä ei ole vetäviä eikä hylkiviä voimia' },
          { en: 'energy and momentum are conserved in every collision', fi: 'energia ja liikemäärä säilyvät jokaisessa törmäyksessä' }] },
        { id: 't4-mole-p2', type: 'text', html: {
          en: '<p>Consequently the <b>number of molecules determines the behaviour</b> of the gas, whatever the gas is. This holds when the pressure is low enough, about one bar or less.</p><p>The number of particles is counted in <b><dfn data-term="mole">moles</dfn></b>, the SI unit of the <b><dfn data-term="amount">amount of substance</dfn></b>. One mole contains as many particles as there are in 12 g of carbon-12. This number is the <b><dfn data-term="avogadro">Avogadro constant</dfn></b> (compare: one dozen is 12 pieces):</p>',
          fi: '<p>Näin ollen <b>molekyylien lukumäärä ratkaisee</b> kaasun käyttäytymisen kaasun lajista riippumatta. Tämä pätee, kun paine on riittävän pieni, noin yksi baari tai alle.</p><p>Hiukkasten lukumäärä lasketaan <b><dfn data-term="mole">moolina</dfn></b>, joka on <b><dfn data-term="amount">ainemäärän</dfn></b> SI-yksikkö. Yhdessä moolissa on yhtä monta hiukkasta kuin 12 grammassa hiili-12:ta. Tämä luku on <b><dfn data-term="avogadro">Avogadron vakio</dfn></b> (vertaa: tusina on 12 kappaletta):</p>' } },
        { id: 't4-mole-f1', type: 'formula', key: true, tex: 'N_A = 6.022·10^{23} 1/mol', label: { en: 'Avogadro constant', fi: 'Avogadron vakio' } },
        { id: 't4-mole-p3', type: 'text', html: {
          en: '<p>Because molecules affect each other only by collisions, every gas takes the same volume under the same conditions. The reference is <b>standard temperature and pressure (<dfn data-term="stp">STP</dfn>)</b>: <f>T = 273.15 K = 0 °C</f> (the slides round to 273 K) and <f>p = 101.325 kPa</f> (standard atmospheric pressure). One mole of any gas then occupies the <b><dfn data-term="molarvol">molar volume</dfn></b>:</p>',
          fi: '<p>Koska molekyylit vaikuttavat toisiinsa vain törmäämällä, jokainen kaasu vie samoissa olosuhteissa saman tilavuuden. Vertailutila on <b>NTP-olot (<dfn data-term="stp">normaaliolot</dfn>)</b>: <f>T = 273,15 K = 0 °C</f> (dioissa pyöristetty 273 K:iin) ja <f>p = 101,325 kPa</f> (normaali ilmanpaine). Yksi mooli mitä tahansa kaasua vie silloin <b><dfn data-term="molarvol">moolitilavuuden</dfn></b>:</p>' } },
        { id: 't4-mole-f2', type: 'formula', key: true, tex: 'V_m = 22.414 l/mol', label: { en: 'Molar volume at STP', fi: 'Moolitilavuus NTP-oloissa' } },
        { id: 't4-mole-p4', type: 'text', html: {
          en: '<p>The <b>mass</b> of a mole depends on the gas. Molecular masses are measured in the <b><dfn data-term="amu">atomic mass unit</dfn></b> u, one twelfth of the mass of a carbon-12 atom:</p>',
          fi: '<p>Moolin <b>massa</b> riippuu kaasusta. Molekyylimassat mitataan <b><dfn data-term="amu">atomimassayksikössä</dfn></b> u, joka on hiili-12-atomin massan kahdestoistaosa:</p>' } },
        { id: 't4-mole-f3', type: 'formula', tex: 'u = {1}/{12}·m(^{12}C) = 1.6605·10^{-27} kg' },
        { id: 't4-mole-p5', type: 'text', html: {
          en: '<p>Oxygen (O₂): <f>M = 2·16.0 u = 32.0 g/mol</f>. Carbon dioxide (CO₂): <f>M = (2·16.0 + 12.0) u = 44.0 g/mol</f>. The <b><dfn data-term="molarmass">molar mass</dfn></b> M is the mass of one mole, and the amount of substance follows from the mass:</p>',
          fi: '<p>Happi (O₂): <f>M = 2·16,0 u = 32,0 g/mol</f>. Hiilidioksidi (CO₂): <f>M = (2·16,0 + 12,0) u = 44,0 g/mol</f>. <b><dfn data-term="molarmass">Moolimassa</dfn></b> M on yhden moolin massa, ja ainemäärä saadaan massasta:</p>' } },
        { id: 't4-mole-f4', type: 'formula', key: true, tex: 'n = {m}/{M}', label: { en: 'Amount of substance', fi: 'Ainemäärä' },
          legend: [['n', { en: 'amount of substance', fi: 'ainemäärä' }, 'mol'], ['m', { en: 'mass', fi: 'massa' }, 'g'], ['M', { en: 'molar mass', fi: 'moolimassa' }, 'g/mol']] },
        { id: 't4-mole-ex1', type: 'example', title: { en: 'Amount of nitrogen', fi: 'Typen ainemäärä' },
          problem: { en: 'Calculate the amount of nitrogen gas when its mass is 1.53 kg.', fi: 'Laske typpikaasun ainemäärä, kun sen massa on 1,53 kg.' },
          given: ['m = 1.53 kg = 1530 g', 'M(N₂) = 2·14 g/mol = 28 g/mol'],
          steps: [{ en: 'Use n = m/M:', fi: 'Käytä kaavaa n = m/M:' }, { tex: 'n = {1530 g}/{28 g/mol} ≈ 54.6 mol' }],
          result: { en: 'n ≈ 54.6 mol', fi: 'n ≈ 54,6 mol' } },
        { id: 't4-mole-p6', type: 'text', html: {
          en: '<p>The <dfn data-term="density">density</dfn> of a gas at STP follows from the molar mass and the molar volume: <f>ρ = M/V_m</f>.</p>',
          fi: '<p>Kaasun <dfn data-term="density">tiheys</dfn> NTP-oloissa saadaan moolimassasta ja moolitilavuudesta: <f>ρ = M/V_m</f>.</p>' } },
        { id: 't4-mole-ex2', type: 'example', title: { en: 'Density of nitrogen at STP', fi: 'Typen tiheys NTP-oloissa' },
          problem: { en: 'Calculate the density of nitrogen gas at STP.', fi: 'Laske typpikaasun tiheys NTP-oloissa.' },
          given: ['M = 28 g/mol', 'V_m = 22.4 l/mol'],
          steps: [{ tex: 'ρ = {M}/{V_m} = {28 g/mol}/{22.4 l/mol} = 1.25 g/l = 1.25 kg/m³' }],
          result: { en: 'ρ ≈ 1.25 kg/m³ (the slide says 1.15, an arithmetic slip)', fi: 'ρ ≈ 1,25 kg/m³ (dioissa 1,15, laskuvirhe)' } },
        { id: 't4-mole-t1', type: 'table', caption: { en: 'Molar masses of common gases', fi: 'Yleisten kaasujen moolimassoja' }, // (extra)
          head: [{ en: 'Gas', fi: 'Kaasu' }, { en: 'Formula', fi: 'Kaava' }, { en: 'M (g/mol)', fi: 'M (g/mol)' }],
          rows: [[{ en: 'hydrogen', fi: 'vety' }, 'H₂', '2'], [{ en: 'nitrogen', fi: 'typpi' }, 'N₂', '28'], [{ en: 'oxygen', fi: 'happi' }, 'O₂', '32'], [{ en: 'carbon dioxide', fi: 'hiilidioksidi' }, 'CO₂', '44'], [{ en: 'sulphur hexafluoride', fi: 'rikkiheksafluoridi' }, 'SF₆', '146']] },
        { id: 't4-mole-c1', type: 'callout', kind: 'key', title: { en: 'Why 44 u = 44 g/mol?', fi: 'Miksi 44 u = 44 g/mol?' },
          html: { en: '<p>Because <f>N_A · u = 6.022·10^23 · 1.6605·10^-27 kg ≈ 1 g/mol</f>. One mole of molecules each weighing 44 u weighs 44 g.</p>',
                  fi: '<p>Koska <f>N_A · u = 6,022·10^23 · 1,6605·10^-27 kg ≈ 1 g/mol</f>. Mooli molekyylejä, joiden massa on 44 u, painaa 44 g.</p>' } },
        { id: 't4-mole-q3', type: 'question', q: 't4-q3' },
        { id: 't4-mole-q4', type: 'question', q: 't4-q4' },
        { id: 't4-mole-q5', type: 'question', q: 't4-q5' },
        { id: 't4-mole-q6', type: 'question', q: 't4-q6' }
      ]
    },
    // ------------------------------------------------------------------ gas laws
    {
      id: 't4-law', title: { en: 'Gas laws and pV = nRT', fi: 'Kaasulait ja pV = nRT' },
      blocks: [
        { id: 't4-law-p1', type: 'text', html: {
          en: '<p>Before the equation of state was found, Boyle, Charles and Avogadro had discovered three relations:</p>',
          fi: '<p>Ennen tilanyhtälön löytämistä Boyle, Charles ja Avogadro olivat havainneet kolme riippuvuutta:</p>' } },
        { id: 't4-law-t1', type: 'table',
          head: [{ en: 'Law', fi: 'Laki' }, { en: 'Relation', fi: 'Riippuvuus' }, { en: 'Constant', fi: 'Vakiona' }, { en: 'Process', fi: 'Muutos' }],
          rows: [
            [{ en: "Boyle's law", fi: 'Boylen laki' }, { tex: 'pV = const.' }, { en: 'n and T', fi: 'n ja T' }, { en: 'isothermal', fi: 'isoterminen' }],
            [{ en: "Charles's law", fi: 'Charlesin laki' }, { tex: '{V}/{T} = const.' }, { en: 'p and n', fi: 'p ja n' }, { en: 'isobaric', fi: 'isobaarinen' }],
            [{ en: "Gay-Lussac's law", fi: 'Gay-Lussacin laki' }, { tex: '{p}/{T} = const.' }, { en: 'V and n', fi: 'V ja n' }, { en: 'isochoric', fi: 'isokoorinen' }],
            [{ en: "Avogadro's law", fi: 'Avogadron laki' }, { tex: '{V}/{n} = const.' }, { en: 'p and T', fi: 'p ja T' }, '–']] },
        { id: 't4-law-p2', type: 'text', html: {
          en: '<p>Together they say that <f>pV</f> is proportional to <f>nT</f>. In SI units the constant is the <b><dfn data-term="gasconst">universal gas constant</dfn></b> <f>R = 8.314 J/(mol·K)</f> (the slide writes "J/Kmol"):</p>',
          fi: '<p>Yhdessä ne sanovat, että <f>pV</f> on verrannollinen suureeseen <f>nT</f>. SI-yksiköissä vakio on <b><dfn data-term="gasconst">yleinen kaasuvakio</dfn></b> <f>R = 8,314 J/(mol·K)</f> (dioissa kirjoitettu "J/Kmol"):</p>' } },
        { id: 't4-law-f1', type: 'formula', key: true, tex: 'pV = nRT', label: { en: 'Ideal gas law (equation of state)', fi: 'Ideaalikaasun tilanyhtälö' },
          legend: [['p', { en: 'absolute pressure', fi: 'absoluuttinen paine' }, 'Pa'], ['V', { en: 'volume', fi: 'tilavuus' }, 'm³'], ['n', { en: 'amount of substance', fi: 'ainemäärä' }, 'mol'], ['R', { en: 'gas constant', fi: 'kaasuvakio' }, 'J/(mol·K)'], ['T', { en: 'absolute temperature', fi: 'absoluuttinen lämpötila' }, 'K']] },
        { id: 't4-law-gas', type: 'interactive', widget: 'gas',
          title: { en: 'Gas piston: drag the piston, heat the gas', fi: 'Kaasumäntä: vedä mäntää, lämmitä kaasua' },
          caption: { en: 'Drag the piston or use the sliders. The state (V, T) moves on the pV diagram, the pressure is always p = nRT/V, and the molecules speed up when you heat the gas.',
                     fi: 'Vedä mäntää tai käytä liukusäätimiä. Tila (V, T) liikkuu pV-käyrästössä, paine on aina p = nRT/V ja molekyylit vauhdittuvat, kun lämmität kaasua.' },
          config: { process: 'free' } },
        { id: 't4-law-p3', type: 'text', html: {
          en: '<p>Hold one quantity fixed and each simple law appears as a special case. Try them on the same piston:</p>',
          fi: '<p>Pidä yksi suure vakiona, jolloin kukin yksinkertainen laki näkyy erikoistapauksena. Kokeile niitä samalla männällä:</p>' } },
        { id: 't4-law-iso', type: 'interactive', widget: 'gas',
          title: { en: "Boyle's law: isothermal change (T constant)", fi: 'Boylen laki: isoterminen muutos (T vakio)' },
          caption: { en: 'Push the piston in: V halves, p doubles, pV stays the same. The state slides along one isotherm.', fi: 'Työnnä mäntää sisään: V puolittuu, p kaksinkertaistuu, pV pysyy samana. Tila liukuu yhtä isotermiä pitkin.' },
          config: { process: 'isothermal' } },
        { id: 't4-law-isobar', type: 'interactive', widget: 'gas',
          title: { en: "Charles's law: isobaric change (p constant)", fi: 'Charlesin laki: isobaarinen muutos (p vakio)' },
          caption: { en: 'Heat the gas: the free piston rises, V grows in proportion to T.', fi: 'Lämmitä kaasua: vapaa mäntä nousee, V kasvaa suhteessa lämpötilaan T.' },
          config: { process: 'isobaric' } },
        { id: 't4-law-isochor', type: 'interactive', widget: 'gas',
          title: { en: "Gay-Lussac's law: isochoric change (V constant)", fi: 'Gay-Lussacin laki: isokoorinen muutos (V vakio)' },
          caption: { en: 'The piston is locked. Heat the gas: p grows in proportion to T.', fi: 'Mäntä on lukittu. Lämmitä kaasua: p kasvaa suhteessa lämpötilaan T.' },
          config: { process: 'isochoric' } },
        { id: 't4-law-adia-c', type: 'callout', kind: 'tip', title: { en: 'Fast compression heats the gas (extra)', fi: 'Nopea puristus lämmittää kaasua (lisätieto)' },
          html: { en: '<p>When the piston moves fast, no heat has time to flow through the walls (an <em>adiabatic</em> change). The work done on the gas goes into the molecules: they move faster, hit each other and the walls more often, and <i>T</i> rises. Expansion cools the gas the same way. A bicycle pump gets warm, and a diesel engine ignites its fuel only by compressing air to about 1/20 of its volume (over 800 K).</p><p>For an ideal gas <i>pV</i><sup>γ</sup> = constant and <i>TV</i><sup>γ−1</sup> = constant, γ = 1.4 for air. The adiabat is steeper than the isotherm.</p>',
                  fi: '<p>Kun mäntä liikkuu nopeasti, lämpö ei ehdi siirtyä seinien läpi (<em>adiabaattinen</em> muutos). Kaasuun tehty työ menee molekyyleille: ne liikkuvat nopeammin, törmäävät toisiinsa ja seiniin useammin, ja <i>T</i> nousee. Laajeneminen jäähdyttää kaasua samalla tavalla. Polkupyörän pumppu lämpenee, ja dieselmoottori sytyttää polttoaineensa pelkästään puristamalla ilman noin 1/20:aan tilavuudestaan (yli 800 K).</p><p>Ideaalikaasulle <i>pV</i><sup>γ</sup> = vakio ja <i>TV</i><sup>γ−1</sup> = vakio, ilmalle γ = 1,4. Adiabaatti on jyrkempi kuin isotermi.</p>' } },
        { id: 't4-law-adia', type: 'interactive', widget: 'gas',
          title: { en: 'Adiabatic compression: push the piston fast', fi: 'Adiabaattinen puristus: työnnä mäntää nopeasti' },
          caption: { en: 'No heat flows through the walls. Push the piston down: the gas heats up, the molecules turn red and speed up, and p rises faster than on the isotherm. Pull it up: the gas cools.',
                     fi: 'Lämpöä ei siirry seinien läpi. Työnnä mäntää alas: kaasu lämpenee, molekyylit punertuvat ja nopeutuvat, ja p kasvaa jyrkemmin kuin isotermillä. Vedä ylös: kaasu jäähtyy.' },
          config: { process: 'adiabatic', values: { V: 5 } } },
        { id: 't4-law-q7', type: 'question', q: 't4-q7' },
        { id: 't4-law-q8', type: 'question', q: 't4-q8' },
        { id: 't4-law-q9', type: 'question', q: 't4-q9' }
      ]
    },
    // ------------------------------------------------------------------ combined law, devices
    {
      id: 't4-devices', title: { en: 'Combined gas law: tyres, air receivers and switchgear', fi: 'Yhdistetty kaasulaki: renkaat, paineilmasäiliöt ja kytkinlaitteet' },
      blocks: [
        { id: 't4-dev-p1', type: 'text', html: {
          en: '<p>When the amount of gas stays constant but p, V and T change, it is easier to compare two states. From <f>pV = nRT</f> with constant n and R:</p>',
          fi: '<p>Kun kaasun määrä pysyy vakiona mutta p, V ja T muuttuvat, on helpompaa verrata kahta tilaa. Yhtälöstä <f>pV = nRT</f> vakioilla n ja R saadaan:</p>' } },
        { id: 't4-dev-f1', type: 'formula', key: true, tex: '{p_1V_1}/{T_1} = {p_2V_2}/{T_2}', label: { en: 'Combined gas law', fi: 'Yhdistetty kaasulaki' } },
        { id: 't4-dev-c1', type: 'callout', kind: 'warn', title: { en: 'Absolute pressure and kelvins', fi: 'Absoluuttinen paine ja kelvinit' },
          html: { en: '<p>A gauge shows the <dfn data-term="gaugep">gauge pressure</dfn> <f>p_g</f>. In gas laws use the <dfn data-term="absp">absolute pressure</dfn> <f>p = p_g + p_0</f> and the temperature in kelvins.</p>',
                  fi: '<p>Painemittari näyttää <dfn data-term="gaugep">ylipainetta</dfn> <f>p_g</f>. Kaasulaeissa käytetään <dfn data-term="absp">absoluuttista painetta</dfn> <f>p = p_g + p_0</f> ja lämpötilaa kelvineinä.</p>' } },
        { id: 't4-dev-ex1', type: 'example', title: { en: 'Tyre pressure after a drive', fi: 'Renkaan paine ajon jälkeen' },
          problem: { en: 'A car tyre is filled to a gauge pressure of 210 kPa at 10 °C. After a drive the temperature inside the tyre is 40 °C. What is the pressure then?',
                     fi: 'Auton rengas täytetään 210 kPa:n ylipaineeseen 10 °C:ssa. Ajon jälkeen renkaan sisälämpötila on 40 °C. Mikä on paine silloin?' },
          given: ['p_g1 = 210 kPa', 'p_0 = 101 kPa', 't_1 = 10 °C, t_2 = 40 °C', 'V_1 = V_2'],
          steps: [
            { en: 'Convert to absolute pressure and kelvins:', fi: 'Muunna absoluuttiseksi paineeksi ja kelvineiksi:' },
            { tex: 'p_1 = 210 kPa + 101 kPa = 311 kPa, T_1 = 283 K, T_2 = 313 K' },
            { en: 'The volume is constant, so p_1/T_1 = p_2/T_2:', fi: 'Tilavuus on vakio, joten p_1/T_1 = p_2/T_2:' },
            { tex: 'p_2 = p_1 · {T_2}/{T_1} = 311 kPa · {313 K}/{283 K} ≈ 344 kPa' },
            { en: 'Gauge pressure after the drive:', fi: 'Ylipaine ajon jälkeen:' },
            { tex: 'p_g2 = 344 kPa − 101 kPa = 243 kPa' }],
          result: { en: 'p ≈ 344 kPa absolute, 243 kPa gauge. (The slide uses T_2 = 323 K, which is 50 °C, and gets 355 kPa / 254 kPa; 40 °C is 313 K.)',
                    fi: 'p ≈ 344 kPa absoluuttinen, ylipaine 243 kPa. (Dioissa käytetään T_2 = 323 K, joka on 50 °C, ja saadaan 355 kPa / 254 kPa; 40 °C on 313 K.)' } },
        { id: 't4-dev-h1', type: 'h', text: { en: 'Device: compressed-air receiver and pneumatic cylinder', fi: 'Laite: paineilmasäiliö ja paineilmasylinteri' } },
        { id: 't4-dev-p2', type: 'text', html: {
          en: '<p>An automation line has a 100 l air receiver (20 °C) feeding a pneumatic cylinder (Ø 50 mm, stroke 200 mm) through a regulator at 6 bar gauge. Each stroke fills the cylinder volume with air at the working pressure and removes <f>n_c = p_w V_c/(RT)</f> from the receiver. Because <f>pV = nRT</f>, the receiver pressure falls by <f>Δp = p_w V_c / V</f> per stroke. When the receiver pressure drops to the working pressure, the cylinder weakens.</p>',
          fi: '<p>Automaatiolinjalla on 100 l:n paineilmasäiliö (20 °C), josta syötetään paineilmasylinteriä (Ø 50 mm, iskunpituus 200 mm) paineensäätimen kautta 6 barin ylipaineella. Jokainen isku täyttää sylinterin tilavuuden työpaineella olevalla ilmalla ja poistaa säiliöstä ainemäärän <f>n_c = p_w V_c/(RT)</f>. Koska <f>pV = nRT</f>, säiliön paine laskee iskua kohti määrän <f>Δp = p_w V_c / V</f>. Kun säiliön paine laskee työpaineeseen, sylinterin voima heikkenee.</p>' } },
        { id: 't4-dev-air', type: 'interactive', widget: 'custom',
          title: { en: 'Compressed-air receiver: how many strokes?', fi: 'Paineilmasäiliö: montako iskua?' },
          caption: { en: "Press “Make a stroke”: the cylinder pushes a part and the receiver gauge drops, because every stroke takes the amount n_c of air. Below 6 bar gauge the regulator can no longer hold the working pressure and the strokes get weak. Refill with the compressor, or set the start pressure with the slider (temperature kept constant).",
            fi: "Paina ”Tee isku”: sylinteri työntää kappaletta ja säiliön painemittarin lukema laskee, koska jokainen isku vie ainemäärän n_c ilmaa. Alle 6 barin ylipaineessa säädin ei enää pysty pitämään työpainetta ja iskut heikkenevät. Täytä säiliö kompressorilla tai aseta alkupaine liukusäätimellä (lämpötila vakio)." },
          config: dev(AIR) },
        { id: 't4-dev-q10', type: 'question', q: 't4-q10' },
        { id: 't4-dev-q11', type: 'question', q: 't4-q11' },
        { id: 't4-dev-h2', type: 'h', text: { en: 'Device: SF₆ gas-insulated switchgear', fi: 'Laite: SF₆-kaasueristeinen kytkinlaitteisto' } },
        { id: 't4-dev-p3', type: 'text', html: {
          en: '<p>High-voltage switchgear is insulated with SF₆ gas in a sealed, rigid compartment: the volume is constant (isochoric). The gas is filled to 600 kPa absolute at 20 °C. If the pressure falls because of a leak, insulation is lost, so a pressure monitor raises an alarm at 520 kPa absolute. But temperature also changes the pressure, so a cold night looks like a leak. Real SF₆ at these pressures is not exactly ideal, so this is an approximation; real monitors compensate for temperature.</p>',
          fi: '<p>Suurjännitekytkinlaitteet eristetään SF₆-kaasulla suljetussa, jäykässä kotelossa: tilavuus on vakio (isokoorinen). Kaasu täytetään 600 kPa:n absoluuttiseen paineeseen 20 °C:ssa. Jos paine laskee vuodon takia, eristys heikkenee, joten paineenvalvonta antaa hälytyksen 520 kPa:n absoluuttisessa paineessa. Lämpötila kuitenkin muuttaa painetta, joten kylmä yö näyttää vuodolta. Todellinen SF₆ ei ole näillä paineilla täysin ideaalinen, joten tämä on approksimaatio; oikeat valvontalaitteet kompensoivat lämpötilan.</p>' } },
        { id: 't4-dev-sf6', type: 'interactive', widget: 'readout',
          title: { en: 'SF₆ switchgear: pressure against temperature', fi: 'SF₆-kytkinlaitteisto: paine lämpötilan funktiona' },
          caption: { en: 'Cool the compartment (no leak!) and see when the alarm level of 520 kPa is crossed.', fi: 'Jäähdytä koteloa (ei vuotoa!) ja katso, milloin hälytysraja 520 kPa alittuu.' },
          config: {
            params: [{ id: 't', tex: 't', min: -40, max: 60, step: 1, value: 20, unit: '°C' }],
            outputs: function (v) {
              var TH = TDC.thermo, Vg = 0.5, n = TH.idealGas({ p: 600e3, V: Vg, T: 293.15 }, 'n'), Tk = v.t + 273.15, p = TH.idealGas({ n: n, V: Vg, T: Tk }, 'p');
              return [
                { tex: 'T', value: Tk, unit: 'K' },
                { tex: 'p', value: p, unit: 'Pa' },
                { label: { en: 'margin to alarm (520 kPa)', fi: 'marginaali hälytykseen (520 kPa)' }, value: p - 520e3, unit: 'Pa' },
                { label: { en: 'status', fi: 'tila' }, value: p < 520e3 ? { en: 'ALARM (low pressure)', fi: 'HÄLYTYS (matala paine)' } : { en: 'normal', fi: 'normaali' } }
              ];
            }
          } },
        { id: 't4-dev-q12', type: 'question', q: 't4-q12' }
      ]
    },
    // ------------------------------------------------------------------ Boltzmann
    {
      id: 't4-boltzmann', title: { en: 'Number of molecules and the Boltzmann constant', fi: 'Molekyylien lukumäärä ja Boltzmannin vakio' },
      blocks: [
        { id: 't4-bz-p1', type: 'text', html: {
          en: '<p>The amount of substance can be written with the mass or the number of molecules <f>N</f>, where <f>N_A</f> is the Avogadro constant:</p>',
          fi: '<p>Ainemäärä voidaan kirjoittaa massan tai molekyylien lukumäärän <f>N</f> avulla, kun <f>N_A</f> on Avogadron vakio:</p>' } },
        { id: 't4-bz-f1', type: 'formula', tex: 'n = {m}/{M} = {N}/{N_A}' },
        { id: 't4-bz-f2', type: 'formula', key: true, tex: 'pV = nRT = {m}/{M}·RT = {N}/{N_A}·RT = NkT', label: { en: 'Ideal gas law with the number of molecules', fi: 'Tilanyhtälö molekyylien lukumäärällä' } },
        { id: 't4-bz-p2', type: 'text', html: {
          en: '<p>Here <f>k = R/N_A</f> is the <b><dfn data-term="boltzmann">Boltzmann constant</dfn></b>:</p>',
          fi: '<p>Tässä <f>k = R/N_A</f> on <b><dfn data-term="boltzmann">Boltzmannin vakio</dfn></b>:</p>' } },
        { id: 't4-bz-f3', type: 'formula', key: true, tex: 'k = {8.314 J/(mol·K)}/{6.022·10^{23} 1/mol} ≈ 1.3806·10^{-23} J/K' },
        { id: 't4-bz-ex1', type: 'example', title: { en: 'Molecules in 1 cm³ of air', fi: 'Molekyylejä 1 cm³:ssä ilmaa' },
          problem: { en: 'How many nitrogen and oxygen molecules are in 1.0 cm³ of air at STP? Air is 78 % nitrogen and 21 % oxygen by volume.', fi: 'Kuinka monta typpi- ja happimolekyyliä on 1,0 cm³:ssä ilmaa NTP-oloissa? Ilmassa on tilavuudesta 78 % typpeä ja 21 % happea.' },
          given: ['p = 101.3 kPa', 'T = 273 K', 'V = 1.0·10^-6 m³'],
          steps: [
            { tex: 'N = {pVN_A}/{RT}, N_{N_2} = {101300·0.78·1.0·10^{-6}·6.022·10^{23}}/{8.314·273} ≈ 21.0·10^{18}' },
            { tex: 'N_{O_2} = {101300·0.21·1.0·10^{-6}·6.022·10^{23}}/{8.314·273} ≈ 5.64·10^{18}' },
            { tex: 'n = {N}/{N_A}: n_{N_2} ≈ 34.9 µmol, n_{O_2} ≈ 9.37 µmol' }],
          result: { en: 'About 2.1·10^19 N₂ and 5.6·10^18 O₂ molecules.', fi: 'Noin 2,1·10^19 N₂- ja 5,6·10^18 O₂-molekyyliä.' } },
        { id: 't4-bz-q13', type: 'question', q: 't4-q13' }
      ]
    },
    // ------------------------------------------------------------------ Dalton
    {
      id: 't4-dalton', title: { en: "Dalton's law of partial pressures", fi: 'Daltonin osapaineiden laki' },
      blocks: [
        { id: 't4-da-p1', type: 'text', html: {
          en: '<p><b><dfn data-term="Dalton\'s law">Dalton\'s law</dfn></b>: the total pressure of a gas mixture equals the sum of the <b><dfn data-term="partialp">partial pressures</dfn></b> of its components. For a mixture of n components:</p>',
          fi: '<p><b><dfn data-term="dalton">Daltonin laki</dfn></b>: kaasuseoksen kokonaispaine on komponenttien <b><dfn data-term="partialp">osapaineiden</dfn></b> summa. Seokselle, jossa on n komponenttia:</p>' } },
        { id: 't4-da-f1', type: 'formula', key: true, tex: 'p_{tot} = Σ p_i = p_1 + p_2 + … + p_n', label: { en: "Dalton's law", fi: 'Daltonin laki' } },
        { id: 't4-da-f2', type: 'formula', key: true, tex: 'p_i = p_{tot} · x_i', label: { en: 'Partial pressure', fi: 'Osapaine' },
          legend: [['x_i', { en: 'mole fraction of component i (= n_i / n_tot)', fi: 'komponentin i ainemääräosuus (= n_i / n_tot)' }, '']] },
        { id: 't4-da-t1', type: 'table', caption: { en: 'Dry air, mole fractions', fi: 'Kuiva ilma, ainemääräosuudet' }, // (extra)
          head: [{ en: 'Gas', fi: 'Kaasu' }, { en: 'Fraction', fi: 'Osuus' }, { en: 'Partial pressure at 101.325 kPa', fi: 'Osapaine 101,325 kPa:ssa' }],
          rows: [[{ en: 'nitrogen', fi: 'typpi' }, '78 %', '79.0 kPa'], [{ en: 'oxygen', fi: 'happi' }, '21 %', '21.3 kPa'], [{ en: 'argon and others', fi: 'argon ym.' }, '1 %', '1.0 kPa']] },
        { id: 't4-da-purge', type: 'interactive', widget: 'custom',
          title: { en: 'Nitrogen-purged cabinet: partial pressure of oxygen', fi: 'Typellä huuhdeltu kotelo: hapen osapaine' },
          caption: { en: "Purge the cabinet with nitrogen: the O₂ molecules are flushed out through the vent and the oxygen analyser falls. Open the door and air comes back. The total pressure (gauge) and the oxygen fraction set the oxygen partial pressure.",
            fi: "Huuhtele kotelo typellä: O₂-molekyylit huuhtoutuvat ulos tuuletusaukosta ja happianalysaattorin lukema laskee. Avaa ovi, niin ilma palaa. Kokonaispaine (painemittari) ja hapen osuus määräävät hapen osapaineen." },
          config: dev(PURGE) },
        { id: 't4-da-q14', type: 'question', q: 't4-q14' }
      ]
    },
    // ------------------------------------------------------------------ kinetic theory
    {
      id: 't4-kinetic', title: { en: 'Kinetic theory of gases', fi: 'Kineettinen kaasuteoria' },
      blocks: [
        { id: 't4-kin-p1', type: 'text', html: {
          en: '<p>The ideal gas law was derived macroscopically. In the <b><dfn data-term="kinetic">kinetic theory of gases</dfn></b> we apply Newton\'s laws to a single molecule and use statistical averages; the averages correspond to macroscopic quantities. The two views must agree. Example, nitrogen at STP: mean free path 59 nm, average distance between molecules 3.3 nm, molecule length 0.38 nm, speeds of the order of 500 m/s. The slide says "v_rms = 400 m/s" next to a 490 m/s arrow; the correct v_rms is 493 m/s (400 m/s is close to the most probable speed). The motion is a zigzag (Brownian-like) path of collisions.</p><p>The postulates:</p>',
          fi: '<p>Ideaalikaasun tilanyhtälö johdettiin makroskooppisesti. <b><dfn data-term="kinetic">Kineettisessä kaasuteoriassa</dfn></b> sovelletaan Newtonin lakeja yksittäiseen molekyyliin ja käytetään tilastollisia keskiarvoja; keskiarvot vastaavat makroskooppisia suureita. Näkökulmien on oltava sopusoinnussa. Esimerkki, typpi NTP-oloissa: keskimääräinen vapaa matka 59 nm, molekyylien keskimääräinen etäisyys 3,3 nm, molekyylin pituus 0,38 nm, nopeudet suuruusluokkaa 500 m/s. Dioissa lukee "v_rms = 400 m/s" 490 m/s:n nuolen vieressä; oikea v_rms on 493 m/s (400 m/s on lähellä todennäköisintä nopeutta). Liike on törmäysten muodostamaa siksak-rataa.</p><p>Oletukset:</p>' } },
        { id: 't4-kin-l1', type: 'list', items: [
          { en: 'molecules act as particles (no volume)', fi: 'molekyylit ovat hiukkasia (ei tilavuutta)' },
          { en: 'a large number of molecules of equal mass moving in random directions', fi: 'suuri määrä samanmassaisia molekyylejä liikkuu satunnaisiin suuntiin' },
          { en: 'the molecules have a wide distribution of speeds', fi: 'molekyylien nopeuksissa on laaja jakauma' },
          { en: 'molecules obey classical mechanics', fi: 'molekyylit noudattavat klassista mekaniikkaa' },
          { en: 'no attractive or repulsive forces between molecules', fi: 'molekyylien välillä ei ole vetäviä eikä hylkiviä voimia' },
          { en: 'energy and momentum conserved in every collision (perfectly elastic)', fi: 'energia ja liikemäärä säilyvät jokaisessa törmäyksessä (täysin kimmoisa)' }] },
        { id: 't4-kin-fig', type: 'figure', caption: { en: 'One molecule bouncing between the walls of a box of length l. Each bounce changes its momentum by 2mv_x.', fi: 'Yksi molekyyli kimpoilee laatikon seinien välillä (pituus l). Jokainen kimpoaminen muuttaa liikemäärää määrän 2mv_x.' },
          alt: { en: 'Box with a molecule path between two walls', fi: 'Laatikko ja molekyylin rata kahden seinän välillä' },
          svg: '<svg viewBox="0 0 320 130" style="max-width:420px;width:100%" fill="none" stroke="currentColor" stroke-width="2"><rect x="20" y="20" width="280" height="80" rx="3"/><path d="M20 80 L110 40 L200 80 L290 40" stroke="var(--c-2)"/><circle cx="110" cy="40" r="5" fill="var(--c-1)" stroke="none"/><path d="M20 112 H300 M20 106 V118 M300 106 V118" stroke-width="1.2"/><text x="160" y="127" text-anchor="middle" fill="currentColor" stroke="none" font-size="12" font-style="italic">l</text></svg>' },
        { id: 't4-kin-p2', type: 'text', html: {
          en: '<p>Take a box of length l with end walls of area A. The pressure comes from the collisions of the molecules with the walls. For one molecule moving in the x direction:</p>',
          fi: '<p>Tarkastellaan laatikkoa, jonka pituus on l ja päätyseinien pinta-ala A. Paine syntyy molekyylien törmäyksistä seiniin. Yhdelle x-suunnassa liikkuvalle molekyylille:</p>' } },
        { id: 't4-kin-f1', type: 'formula', tex: 'Δp = mv_x − (−mv_x) = 2mv_x, Δt = {2l}/{v_x}' },
        { id: 't4-kin-f2', type: 'formula', tex: 'F_1 = {Δp}/{Δt} = {2mv_x}/{2l/v_x} = {mv_x^2}/{l}' },
        { id: 't4-kin-d1', type: 'details', summary: { en: 'Derivation of p = (1/3)·N m ⟨v²⟩ / V', fi: 'Johto: p = (1/3)·N m ⟨v²⟩ / V' },
          html: { en: '<p>For N molecules: <f>F = {m}/{l} N ⟨v_x^2⟩</f>, where <f>⟨v_x^2⟩</f> is the mean of the squared x-velocities. Random motion gives <f>⟨v_x^2⟩ = ⟨v_y^2⟩ = ⟨v_z^2⟩</f> and <f>⟨v^2⟩ = ⟨v_x^2⟩ + ⟨v_y^2⟩ + ⟨v_z^2⟩ = 3⟨v_x^2⟩</f>. So <f>F = {m}/{l} N {⟨v^2⟩}/{3}</f> and, with <f>V = A l</f>:</p><p><f>p = {F}/{A} = {1}/{3}·{N m ⟨v^2⟩}/{A l} = {1}/{3}·{N m ⟨v^2⟩}/{V}</f></p>',
                  fi: '<p>N molekyylille: <f>F = {m}/{l} N ⟨v_x^2⟩</f>, missä <f>⟨v_x^2⟩</f> on x-nopeuksien neliöiden keskiarvo. Satunnainen liike antaa <f>⟨v_x^2⟩ = ⟨v_y^2⟩ = ⟨v_z^2⟩</f> ja <f>⟨v^2⟩ = ⟨v_x^2⟩ + ⟨v_y^2⟩ + ⟨v_z^2⟩ = 3⟨v_x^2⟩</f>. Siis <f>F = {m}/{l} N {⟨v^2⟩}/{3}</f> ja kun <f>V = A l</f>:</p><p><f>p = {F}/{A} = {1}/{3}·{N m ⟨v^2⟩}/{A l} = {1}/{3}·{N m ⟨v^2⟩}/{V}</f></p>' } },
        { id: 't4-kin-p3', type: 'text', html: {
          en: '<p>Rearranged, <f>pV = {2}/{3} N ( {1}/{2} m⟨v^2⟩ )</f>, where <f>K = {1}/{2} m⟨v^2⟩</f> is the <b><dfn data-term="meanke">mean translational kinetic energy</dfn></b> of a molecule. Comparing with <f>pV = NkT</f> gives the important result:</p>',
          fi: '<p>Järjestämällä <f>pV = {2}/{3} N ( {1}/{2} m⟨v^2⟩ )</f>, missä <f>K = {1}/{2} m⟨v^2⟩</f> on molekyylin <b><dfn data-term="meanke">keskimääräinen translaatioliike-energia</dfn></b>. Vertaamalla yhtälöön <f>pV = NkT</f> saadaan tärkeä tulos:</p>' } },
        { id: 't4-kin-f3', type: 'formula', key: true, tex: 'K = {1}/{2} m⟨v^2⟩ = {3}/{2} kT', label: { en: 'Mean kinetic energy', fi: 'Keskimääräinen liike-energia' } },
        { id: 't4-kin-c1', type: 'callout', kind: 'key', title: { en: 'Temperature is molecular motion', fi: 'Lämpötila on molekyylien liikettä' },
          html: { en: '<p>The mean translational kinetic energy of molecules in an ideal gas is directly proportional to the absolute temperature. It does not depend on the gas: at the same T, heavy and light molecules have the same K (the light ones are just faster). At 0 K the motion would stop.</p>',
                  fi: '<p>Ideaalikaasun molekyylien keskimääräinen translaatioliike-energia on suoraan verrannollinen absoluuttiseen lämpötilaan. Se ei riipu kaasusta: samassa lämpötilassa raskailla ja kevyillä molekyyleillä on sama K (kevyet ovat vain nopeampia). Nollapisteessä liike pysähtyisi.</p>' } },
        { id: 't4-kin-p4', type: 'text', html: {
          en: '<p>Solving for the speed gives the <b><dfn data-term="vrms">root-mean-square speed</dfn></b> (<f>m</f> is the mass of one molecule, <f>m = M/N_A</f>):</p>',
          fi: '<p>Nopeuden ratkaiseminen antaa <b><dfn data-term="vrms">neliöllisen keskinopeuden</dfn></b> (<f>m</f> on yhden molekyylin massa, <f>m = M/N_A</f>):</p>' } },
        { id: 't4-kin-f4', type: 'formula', key: true, tex: 'v_{rms} = sqrt{⟨v^2⟩} = sqrt{{3kT}/{m}} = sqrt{{3RT}/{M}}', label: { en: 'Root-mean-square speed', fi: 'Neliöllinen keskinopeus' } },
        { id: 't4-kin-ex1', type: 'example', title: { en: 'Speed of nitrogen molecules', fi: 'Typpimolekyylien nopeus' },
          problem: { en: 'Calculate v_rms of a nitrogen molecule at 273 K (0 °C).', fi: 'Laske typpimolekyylin v_rms lämpötilassa 273 K (0 °C).' },
          given: ['M = 28 g/mol', 'u = 1.66·10^-27 kg', 'k = 1.38·10^-23 J/K'],
          steps: [{ tex: 'v_{rms} = sqrt{{3kT}/{m}} = sqrt{{3·1.38·10^{-23}·273}/{28·1.66·10^{-27}}} ≈ 493 m/s' },
                  { en: 'At 600 °C (873 K), about the average temperature in a car engine cylinder:', fi: 'Lämpötilassa 600 °C (873 K), likimain auton moottorin sylinterin keskilämpötila:' },
                  { tex: 'v_{rms} = sqrt{{3·8.314·873}/{0.028}} ≈ 880 m/s' }],
          result: { en: 'v_rms ≈ 490 m/s at 0 °C and ≈ 880 m/s at 600 °C.', fi: 'v_rms ≈ 490 m/s lämpötilassa 0 °C ja ≈ 880 m/s lämpötilassa 600 °C.' } },
        { id: 't4-kin-gas', type: 'interactive', widget: 'gas',
          title: { en: 'Heat the gas: molecules get faster', fi: 'Lämmitä kaasua: molekyylit nopeutuvat' },
          caption: { en: 'Slider T: the molecules speed up like √T and the readout shows v_rms of nitrogen. Squeeze the piston at constant T: the molecules hit the wall more often and p rises, but v_rms does not change.',
                     fi: 'Säädin T: molekyylit nopeutuvat kuten √T ja näytössä on typen v_rms. Purista mäntää vakiolämpötilassa: molekyylit osuvat seinään useammin ja p kasvaa, mutta v_rms ei muutu.' },
          config: { process: 'free', show: 'pv' } },
        { id: 't4-kin-q15', type: 'question', q: 't4-q15' },
        { id: 't4-kin-q16', type: 'question', q: 't4-q16' }
      ]
    },
    // ------------------------------------------------------------------ Maxwell
    {
      id: 't4-maxwell', title: { en: 'Maxwell speed distribution', fi: 'Maxwellin nopeusjakauma' },
      blocks: [
        { id: 't4-mx-p1', type: 'text', html: {
          en: '<p>The molecules do not all have the same speed. The distribution of speeds depends on temperature: a higher temperature raises the average speed and <b>broadens</b> the distribution, with a high-energy "tail". The usual description is the <b><dfn data-term="maxwell">Maxwell distribution</dfn></b>. For a given gas it depends only on the absolute temperature T. It is also the only way to define temperature at extremely low pressures (say 1 nPa), where a pressure gauge is useless: measure the distribution and read T from it.</p><p>The distribution has three characteristic speeds:</p>',
          fi: '<p>Kaikilla molekyyleillä ei ole samaa nopeutta. Nopeuksien jakauma riippuu lämpötilasta: korkeampi lämpötila nostaa keskinopeutta ja <b>levittää</b> jakaumaa, jolloin syntyy suurienergiainen "häntä". Yleisin kuvaus on <b><dfn data-term="maxwell">Maxwellin jakauma</dfn></b>. Tietylle kaasulle se riippuu vain absoluuttisesta lämpötilasta T. Se on myös ainoa tapa määrittää lämpötila äärimmäisen pienillä paineilla (esim. 1 nPa), joilla painemittarista ei ole hyötyä: mitataan jakauma ja luetaan siitä T.</p><p>Jakaumalla on kolme tunnusomaista nopeutta:</p>' } },
        { id: 't4-mx-f1', type: 'formula', key: true, tex: 'v_p = sqrt{{2kT}/{m}}', label: { en: 'Most probable speed (peak of the curve)', fi: 'Todennäköisin nopeus (käyrän huippu)' } },
        { id: 't4-mx-f2', type: 'formula', key: true, tex: 'v̄ = sqrt{{8}/{π}·{kT}/{m}}', label: { en: 'Mean speed', fi: 'Keskinopeus' } },
        { id: 't4-mx-f3', type: 'formula', key: true, tex: 'v_{rms} = sqrt{{3kT}/{m}}', label: { en: 'Root-mean-square speed', fi: 'Neliöllinen keskinopeus' } },
        { id: 't4-mx-p2', type: 'text', html: {
          en: '<p>The ratios are fixed: <f>v_p : v̄ : v_rms = 1 : 1.128 : 1.225</f>, so always <f>v_p &lt; v̄ &lt; v_rms</f>. For nitrogen at 273 K these are 403 m/s, 454 m/s and 493 m/s. The graph below shows the distribution of nitrogen; the three speeds are marked.</p>',
          fi: '<p>Suhteet ovat kiinteät: <f>v_p : v̄ : v_rms = 1 : 1,128 : 1,225</f>, joten aina <f>v_p &lt; v̄ &lt; v_rms</f>. Typelle 273 K:ssä ne ovat 403 m/s, 454 m/s ja 493 m/s. Alla olevassa kuvaajassa on typen jakauma; kolme nopeutta on merkitty.</p>' } },
        { id: 't4-mx-gas', type: 'interactive', widget: 'gas',
          title: { en: 'Maxwell distribution of nitrogen: v_p, mean and v_rms', fi: 'Typen Maxwellin jakauma: v_p, keskinopeus ja v_rms' },
          caption: { en: 'Heat the locked gas: the peak moves right, drops and the curve broadens (the area stays the same). Compare 80 K and 300 K with the slide.',
                     fi: 'Lämmitä lukittua kaasua: huippu siirtyy oikealle, madaltuu ja käyrä levenee (pinta-ala pysyy samana). Vertaa 80 K:iä ja 300 K:iä dian kuvaan.' },
          config: { process: 'isochoric', show: 'maxwell', values: { T: 300 } } },
        { id: 't4-mx-c1', type: 'callout', kind: 'info', title: { en: 'Light molecules are fast', fi: 'Kevyet molekyylit ovat nopeita' }, // (extra)
          html: { en: '<p>At the same T all gases have the same mean kinetic energy, so v ∝ 1/√M. Hydrogen (2 g/mol) is √14 ≈ 3.7 times faster than nitrogen (28 g/mol). That is why light hydrogen and helium escape from the atmosphere.</p>',
                  fi: '<p>Samassa lämpötilassa kaikilla kaasuilla on sama keskimääräinen liike-energia, joten v ∝ 1/√M. Vety (2 g/mol) on √14 ≈ 3,7 kertaa typpeä (28 g/mol) nopeampaa. Siksi kevyt vety ja helium karkaavat ilmakehästä.</p>' } },
        { id: 't4-mx-q17', type: 'question', q: 't4-q17' }
      ]
    }
  ],
  questions: [
    // ---------------------------------------------------------------- practice
    { id: 't4-q1', mode: 'practice', type: 'mc', difficulty: 1,
      prompt: { en: 'Extrapolating the volume of a gas at constant pressure towards zero volume, the line meets the temperature axis at:', fi: 'Kun kaasun tilavuutta vakiopaineessa ekstrapoloidaan kohti nollaa, suora leikkaa lämpötila-akselin kohdassa:' },
      options: [{ id: 'a', html: { en: '−100 °C', fi: '−100 °C' } }, { id: 'b', html: { en: '−273.15 °C', fi: '−273,15 °C' } }, { id: 'c', html: { en: '−373.15 °C', fi: '−373,15 °C' } }, { id: 'd', html: { en: '0 °C', fi: '0 °C' } }],
      hints: [{ en: 'This is the absolute zero.', fi: 'Tämä on absoluuttinen nollapiste.' }] },
    { id: 't4-q2', mode: 'practice', type: 'numeric', difficulty: 1, tol: 0.005,
      prompt: { en: 'The coolant of a sensor is at 37 °C. Express this temperature in kelvins.', fi: 'Anturin jäähdytysaineen lämpötila on 37 °C. Ilmoita lämpötila kelvineinä.' },
      fields: [{ id: 'T', tex: 'T', unit: 'K' }],
      hints: [{ en: 'Add the offset between the scales.', fi: 'Lisää asteikkojen välinen siirtymä.' }] },
    { id: 't4-q3', mode: 'practice', type: 'mc', difficulty: 1,
      prompt: { en: 'Which of these is NOT a postulate of the ideal gas?', fi: 'Mikä seuraavista EI ole ideaalikaasun oletus?' },
      options: [{ id: 'a', html: { en: 'the molecules have no volume', fi: 'molekyyleillä ei ole tilavuutta' } }, { id: 'b', html: { en: 'the molecules attract each other weakly', fi: 'molekyylit vetävät toisiaan heikosti puoleensa' } }, { id: 'c', html: { en: 'momentum is conserved in collisions', fi: 'liikemäärä säilyy törmäyksissä' } }, { id: 'd', html: { en: 'energy is conserved in collisions', fi: 'energia säilyy törmäyksissä' } }],
      hints: [{ en: 'Ideal gas particles interact only by collisions.', fi: 'Ideaalikaasun hiukkaset vuorovaikuttavat vain törmäyksillä.' }] },
    { id: 't4-q4', mode: 'practice', type: 'numeric', difficulty: 1, tol: 0.02,
      prompt: { en: 'A cylinder holds 2.0 kg of carbon dioxide (CO₂, M = 44 g/mol). Find the amount of substance.', fi: 'Pullossa on 2,0 kg hiilidioksidia (CO₂, M = 44 g/mol). Laske ainemäärä.' },
      fields: [{ id: 'n', tex: 'n', unit: 'mol' }],
      hints: [{ en: 'Convert kg to g first.', fi: 'Muunna ensin kg grammoiksi.' }, { en: 'n = m / M.', fi: 'n = m / M.' }] },
    { id: 't4-q5', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.02,
      prompt: { en: 'Find the density of carbon dioxide (M = 44 g/mol) at STP.', fi: 'Laske hiilidioksidin (M = 44 g/mol) tiheys NTP-oloissa.' },
      fields: [{ id: 'rho', tex: 'ρ', unit: 'kg/m³' }],
      hints: [{ en: 'One mole occupies 22.414 l at STP.', fi: 'Yksi mooli vie NTP-oloissa 22,414 l.' }, { en: 'ρ = M / V_m. Mind that g/l = kg/m³.', fi: 'ρ = M / V_m. Huomaa, että g/l = kg/m³.' }] },
    { id: 't4-q6', mode: 'practice', type: 'mc', difficulty: 2,
      prompt: { en: 'Why can we write 44 u = 44 g/mol?', fi: 'Miksi voidaan kirjoittaa 44 u = 44 g/mol?' },
      options: [{ id: 'a', html: { en: 'because 1 u = 1 g', fi: 'koska 1 u = 1 g' } }, { id: 'b', html: { en: 'because the product of the Avogadro constant and u is 1 g/mol', fi: 'koska Avogadron vakion ja yksikön u tulo on 1 g/mol' } }, { id: 'c', html: { en: 'because the molar volume is 22.4 l/mol', fi: 'koska moolitilavuus on 22,4 l/mol' } }, { id: 'd', html: { en: 'because carbon has 12 protons', fi: 'koska hiilellä on 12 protonia' } }],
      hints: [{ en: 'Multiply the mass of one molecule by the number of molecules in a mole.', fi: 'Kerro yhden molekyylin massa moolin molekyylimäärällä.' }] },
    { id: 't4-q7', mode: 'practice', type: 'match', difficulty: 1,
      prompt: { en: 'Match each law with the relation that is constant in it.', fi: 'Yhdistä laki ja suure, joka on siinä vakio.' },
      left: [{ id: 'boyle', html: { en: "Boyle's law", fi: 'Boylen laki' } }, { id: 'charles', html: { en: "Charles's law", fi: 'Charlesin laki' } }, { id: 'gl', html: { en: "Gay-Lussac's law", fi: 'Gay-Lussacin laki' } }],
      right: [{ id: 'vt', html: { tex: 'V/T' } }, { id: 'pt', html: { tex: 'p/T' } }, { id: 'pv', html: { tex: 'pV' } }],
      hints: [{ en: 'Think which quantity is held fixed: T, p or V.', fi: 'Mieti, mikä suure pidetään vakiona: T, p vai V.' }] },
    { id: 't4-q8', mode: 'practice', type: 'slider', difficulty: 2, tol: 0.05,
      prompt: { en: 'Isothermal compression (T = 300 K, n = 0.1 mol). Push the piston in until the pressure is three times what it is at V = 2.5 L.', fi: 'Isoterminen puristus (T = 300 K, n = 0,1 mol). Työnnä mäntä sisään, kunnes paine on kolminkertainen tilavuuden V = 2,5 L paineeseen verrattuna.' },
      widget: { name: 'gas', config: { process: 'isothermal' } },
      hints: [{ en: 'Boyle: pV is constant, so tripled pressure means a third of the volume.', fi: 'Boyle: pV on vakio, joten kolminkertainen paine tarkoittaa kolmasosaa tilavuudesta.' }] },
    { id: 't4-q9', mode: 'practice', type: 'slider', difficulty: 2, tol: 0.04,
      prompt: { en: 'Locked piston (V = 2.5 L, n = 0.1 mol). Heat the gas until its pressure is double the pressure at 300 K.', fi: 'Lukittu mäntä (V = 2,5 L, n = 0,1 mol). Lämmitä kaasua, kunnes sen paine on kaksinkertainen 300 K:n paineeseen verrattuna.' },
      widget: { name: 'gas', config: { process: 'isochoric', values: { T: 200 } } },
      hints: [{ en: 'Gay-Lussac: p/T is constant at constant volume.', fi: 'Gay-Lussac: p/T on vakio vakiotilavuudessa.' }, { en: 'Doubled pressure means doubled kelvin temperature.', fi: 'Kaksinkertainen paine tarkoittaa kaksinkertaista kelvinlämpötilaa.' }] },
    { id: 't4-q10', mode: 'practice', type: 'numeric', difficulty: 3, tol: 0.01,
      prompt: { en: 'A tyre is inflated to 220 kPa gauge at 5 °C. On a hot day it heats to 35 °C (volume constant, p_0 = 101.3 kPa). Find the gauge pressure.', fi: 'Rengas täytetään 220 kPa:n ylipaineeseen 5 °C:ssa. Kuumana päivänä se lämpenee 35 °C:seen (tilavuus vakio, p_0 = 101,3 kPa). Laske ylipaine.' },
      fields: [{ id: 'pg', tex: 'p_g', unit: 'kPa' }],
      hints: [{ en: 'Convert to absolute pressure and kelvins before using the law.', fi: 'Muunna absoluuttiseksi paineeksi ja kelvineiksi ennen lain käyttöä.' }, { en: 'p_2 = p_1·T_2/T_1, then subtract p_0.', fi: 'p_2 = p_1·T_2/T_1, vähennä sitten p_0.' }] },
    { id: 't4-q11', mode: 'practice', type: 'numeric', difficulty: 3, tol: 0.03,
      prompt: { en: 'A 100 l receiver at 7 bar gauge (20 °C) feeds a cylinder (Ø 50 mm, stroke 200 mm) through a regulator at 6 bar gauge. How many strokes until the receiver pressure falls to 6 bar gauge? (p_0 = 101.3 kPa, temperature constant.)', fi: '100 l:n säiliö, ylipaine 7 bar (20 °C), syöttää sylinteriä (Ø 50 mm, isku 200 mm) säätimen kautta 6 barin ylipaineella. Montako iskua, kunnes säiliön paine laskee 6 barin ylipaineeseen? (p_0 = 101,3 kPa, lämpötila vakio.)' },
      fields: [{ id: 'k', tex: 'k', unit: '' }],
      hints: [{ en: 'Air per stroke: the cylinder volume at the working pressure (absolute).', fi: 'Ilmaa iskua kohti: sylinterin tilavuus työpaineessa (absoluuttinen).' }, { en: 'Receiver pressure drop per stroke is p_w·V_c / V.', fi: 'Säiliön paineen lasku iskua kohti on p_w·V_c / V.' }] },
    { id: 't4-q12', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.01,
      prompt: { en: 'SF₆ switchgear filled to 600 kPa absolute at 20 °C (293.15 K), no leak, constant volume. At what temperature does the pressure fall to the alarm level 520 kPa?', fi: 'SF₆-kytkinlaitteisto on täytetty 600 kPa:n absoluuttiseen paineeseen 20 °C:ssa (293,15 K), ei vuotoa, tilavuus vakio. Missä lämpötilassa paine laskee hälytystasoon 520 kPa?' },
      fields: [{ id: 'T', tex: 'T', unit: 'K' }],
      hints: [{ en: 'Constant volume: p/T is constant.', fi: 'Vakiotilavuus: p/T on vakio.' }] },
    { id: 't4-q13', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.02,
      prompt: { en: 'How many molecules are there in 1.0 l of gas at 100 kPa and 300 K? (k = 1.3806·10^-23 J/K)', fi: 'Kuinka monta molekyyliä on 1,0 litrassa kaasua, kun paine on 100 kPa ja lämpötila 300 K? (k = 1,3806·10^-23 J/K)' },
      fields: [{ id: 'N', tex: 'N', unit: '' }],
      hints: [{ en: 'Use pV = NkT.', fi: 'Käytä yhtälöä pV = NkT.' }, { en: 'Convert l to m³.', fi: 'Muunna litra kuutiometreiksi.' }] },
    { id: 't4-q14', mode: 'practice', type: 'numeric', difficulty: 1, tol: 0.01,
      prompt: { en: 'Compressed air at 800 kPa contains 21 % oxygen (mole fraction). Find the partial pressure of oxygen.', fi: 'Paineilman paine on 800 kPa ja siinä on 21 % happea (ainemääräosuus). Laske hapen osapaine.' },
      fields: [{ id: 'p', tex: 'p_{O_2}', unit: 'kPa' }],
      hints: [{ en: 'p_i = x_i · p_tot.', fi: 'p_i = x_i · p_tot.' }] },
    { id: 't4-q15', mode: 'practice', type: 'numeric', difficulty: 2, tol: 0.01,
      prompt: { en: 'Find v_rms of oxygen molecules (M = 32 g/mol) at 300 K.', fi: 'Laske happimolekyylien (M = 32 g/mol) v_rms lämpötilassa 300 K.' },
      fields: [{ id: 'v', tex: 'v_{rms}', unit: 'm/s' }],
      hints: [{ en: 'v_rms = √(3RT/M) with M in kg/mol.', fi: 'v_rms = √(3RT/M), M yksikössä kg/mol.' }] },
    { id: 't4-q16', mode: 'practice', type: 'mc', difficulty: 2,
      prompt: { en: 'The absolute temperature of a gas is multiplied by four (300 K to 1200 K). What happens to v_rms?', fi: 'Kaasun absoluuttinen lämpötila nelinkertaistuu (300 K:stä 1200 K:iin). Mitä v_rms:lle tapahtuu?' },
      options: [{ id: 'a', html: { en: 'multiplied by 4', fi: 'nelinkertaistuu' } }, { id: 'b', html: { en: 'multiplied by 2', fi: 'kaksinkertaistuu' } }, { id: 'c', html: { en: 'multiplied by √2', fi: 'kertautuu luvulla √2' } }, { id: 'd', html: { en: 'unchanged', fi: 'ei muutu' } }],
      hints: [{ en: 'v_rms is proportional to the square root of T.', fi: 'v_rms on verrannollinen lämpötilan neliöjuureen.' }] },
    { id: 't4-q17', mode: 'practice', type: 'order', difficulty: 1,
      prompt: { en: 'Order the three characteristic speeds of the Maxwell distribution from smallest to largest.', fi: 'Järjestä Maxwellin jakauman kolme tunnusnopeutta pienimmästä suurimpaan.' },
      items: [{ id: 'vr', html: { en: 'root-mean-square speed', fi: 'neliöllinen keskinopeus' } }, { id: 'vp', html: { en: 'most probable speed', fi: 'todennäköisin nopeus' } }, { id: 'vm', html: { en: 'mean speed', fi: 'keskinopeus' } }],
      hints: [{ en: 'The peak of the curve is the leftmost.', fi: 'Käyrän huippu on vasemmanpuoleisin.' }] },
    // ---------------------------------------------------------------- topic test
    { id: 't4-g1', mode: 'graded', type: 'numeric', difficulty: 2, tol: 0.01,
      prompt: { en: 'A gas of 2.0 l at 100 kPa and 300 K is compressed to 0.50 l and heated to 450 K. Find the final absolute pressure.', fi: 'Kaasu, jonka tilavuus on 2,0 l, paine 100 kPa ja lämpötila 300 K, puristetaan 0,50 litraan ja lämmitetään 450 K:iin. Laske lopullinen absoluuttinen paine.' },
      fields: [{ id: 'p', tex: 'p_2', unit: 'kPa' }],
      hints: [{ en: 'Combined gas law.', fi: 'Yhdistetty kaasulaki.' }] },
    { id: 't4-g2', mode: 'graded', type: 'numeric', difficulty: 2, tol: 0.01,
      prompt: { en: 'Find the mean translational kinetic energy of a molecule at 300 K. Give it in units of 10^-21 J.', fi: 'Laske molekyylin keskimääräinen translaatioliike-energia lämpötilassa 300 K. Ilmoita se yksikössä 10^-21 J.' },
      fields: [{ id: 'K', tex: 'K', unit: '10^-21 J' }],
      hints: [{ en: 'K = (3/2)kT.', fi: 'K = (3/2)kT.' }] },
    { id: 't4-g3', mode: 'graded', type: 'slider', difficulty: 3, tol: 0.03,
      prompt: { en: 'Nitrogen in a locked piston. Heat the gas until v_rms is 1.5 times its value at 300 K.', fi: 'Typpeä lukitussa männässä. Lämmitä kaasua, kunnes v_rms on 1,5-kertainen 300 K:n arvoonsa verrattuna.' },
      widget: { name: 'gas', config: { process: 'isochoric', show: 'maxwell', values: { T: 300 }, answer: function (p, s) { return { v: s.vrms }; } } },
      hints: [{ en: 'v_rms is proportional to √T.', fi: 'v_rms on verrannollinen suureeseen √T.' }, { en: 'Factor 1.5 in speed means factor 1.5² in temperature.', fi: 'Nopeuden kerroin 1,5 tarkoittaa lämpötilan kerrointa 1,5².' }] },
    { id: 't4-g4', mode: 'graded', type: 'multi', difficulty: 2,
      prompt: { en: 'Select all true statements about the kinetic theory of gases.', fi: 'Valitse kaikki kineettistä kaasuteoriaa koskevat tosi väittämät.' },
      options: [{ id: 'a', html: { en: 'The mean translational kinetic energy is proportional to T.', fi: 'Keskimääräinen translaatioliike-energia on verrannollinen lämpötilaan T.' } },
                { id: 'b', html: { en: 'At the same T, heavier molecules have a higher mean kinetic energy.', fi: 'Samassa lämpötilassa raskailla molekyyleillä on suurempi keskimääräinen liike-energia.' } },
                { id: 'c', html: { en: 'Gas pressure comes from collisions of molecules with the walls.', fi: 'Kaasun paine aiheutuu molekyylien törmäyksistä seinämiin.' } },
                { id: 'd', html: { en: 'A higher temperature broadens the speed distribution.', fi: 'Korkeampi lämpötila levittää nopeusjakaumaa.' } },
                { id: 'e', html: { en: 'All molecules have the same speed.', fi: 'Kaikilla molekyyleillä on sama nopeus.' } }],
      hints: [{ en: 'K = (3/2)kT contains no mass.', fi: 'Lauseke K = (3/2)kT ei sisällä massaa.' }] },
    { id: 't4-g5', mode: 'graded', type: 'numeric', difficulty: 3, tol: 0.02,
      prompt: { en: 'An air receiver of 0.10 m³ holds air at 800 kPa absolute and 20 °C. Find the amount of air in it.', fi: 'Paineilmasäiliön tilavuus on 0,10 m³ ja siinä on ilmaa 800 kPa:n absoluuttisessa paineessa lämpötilassa 20 °C. Laske ilman ainemäärä.' },
      fields: [{ id: 'n', tex: 'n', unit: 'mol' }],
      hints: [{ en: 'Use pV = nRT with SI units (Pa, m³, K).', fi: 'Käytä yhtälöä pV = nRT SI-yksiköillä (Pa, m³, K).' }] },
    { id: 't4-g6', mode: 'graded', type: 'numeric', difficulty: 2, tol: 0.02,
      prompt: { en: 'At the same temperature, how many times larger is v_rms of hydrogen (H₂, 2.0 g/mol) than that of nitrogen (N₂, 28 g/mol)?', fi: 'Montako kertaa suurempi on vedyn (H₂, 2,0 g/mol) v_rms kuin typen (N₂, 28 g/mol) samassa lämpötilassa?' },
      fields: [{ id: 'r', tex: 'v_{H_2}/v_{N_2}', unit: '' }],
      hints: [{ en: 'v_rms is proportional to 1/√M.', fi: 'v_rms on verrannollinen suureeseen 1/√M.' }] }
  ]
});
})();

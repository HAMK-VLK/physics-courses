/* Topic 6: Heat and latent heat. Source: slides ph2-5 p01-p12 (errata applied, see source/extracted/PDF-ERRATA.md).
 * NO answers in this file: they live in src/answers/topic6.json. Block ids are stable; never rename. */
(function () {
  "use strict";
  function T(en, fi) { return { en: en, fi: fi }; }
  var AIR_CV = 714, AIR_RHO = 1.29;

  function fsz(w) { return Math.max(11, Math.min(14, Math.round(w / 48))); }
  // device widget (thermo-common.js TV.device), looked up at mount: the tools load content without the viz scripts
  function dev(def, vals) { return { mount: function (h, c) { return TDC.thermoViz.device(def, vals).mount(h, c); } }; }
  function nf(v, d) { return TDC.util.fmtNum(v, d); }
  function line(g, x1, y1, x2, y2) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
  function thermoHit(x, y, tx, top, bot) { return Math.abs(x - tx) < 16 && y > top - 8 && y < bot + 10; }
  function thermoVal(y, top, bot, tmin, tmax) { return tmin + (bot - 7 - y) / (bot - 11 - top) * (tmax - tmin); }   // inverse of TV.thermometer

  // ---------- device: Joule's apparatus, falling weight turns paddles in insulated water (t6-heat-joule) ----------
  function jLay(w, h, p, drop) {
    var floor = h * 0.92, pulX = w * 0.68, pulY = h * 0.1, bs = 14 + 22 * Math.cbrt(p.m / 100), sc = (floor - pulY - 26 - 36) / 5;
    var bot = floor - p.h * (1 - (drop || 0)) * sc;
    return { floor: floor, pulX: pulX, pulY: pulY, bs: bs, sc: sc, wx: pulX + 10, wb: bot, vx0: w * 0.06, vx1: w * 0.46, vtop: h * 0.42 };
  }
  var JOULE = {
    animate: true,
    aspect: function (w) { return w < 520 ? 0.95 : 0.55; },
    params: [
      { id: "m", tex: "m", min: 1, max: 100, step: 1, value: 20, unit: "kg" },
      { id: "h", tex: "h", min: 0.5, max: 5, step: 0.1, value: 1.5, unit: "m" },
      { id: "N", tex: "N", min: 0, max: 200, step: 1, value: 40, unit: "" },
      { id: "M", tex: "M", min: 0.5, max: 10, step: 0.5, value: 1, unit: "kg" }],
    buttons: [
      { label: T("Drop the weight", "Pudota paino"), click: function (p, D) { if (D.motion) { if (D.S.drop == null) D.S.drop = 0; } else D.set({ N: p.N + 1 }); } },
      { label: T("Fresh water (N = 0)", "Uusi vesi (N = 0)"), click: function (p, D) { D.S.drop = null; D.set({ N: 0 }); } }
    ],
    drag: {   // lift or lower the weight: sets the drop height h
      hit: function (x, y, p, D) { var L = jLay(D.w, D.h, p, D.S.drop); return D.S.drop == null && Math.abs(x - L.wx) < L.bs / 2 + 6 && y > L.wb - L.bs - 6 && y < L.wb + 6 ? 'h' : null; },
      move: function (k, x, y, p, D) { var L = jLay(D.w, D.h, p); return { h: (L.floor - y - L.bs / 2) / L.sc }; }
    },
    draw: function (g, w, h, p, ctx, TV, D) {
      var S = D.S;
      if (S.drop != null) { S.drop += D.dt / 1.6; S.a = (S.a || 0) + D.dt * 7; if (S.drop >= 1) { S.drop = null; D.set({ N: p.N + 1 }); } }
      var L = jLay(w, h, p, S.drop), fg = ctx.color('--fg'), mu = ctx.color('--muted'), wire = ctx.color('--c-wire'), body = ctx.color('--c-body-fill'), fs = fsz(w);
      var dT = (p.N + (S.drop || 0)) * p.m * 9.81 * p.h / (p.M * 4186);
      var top = [2, 5, 10, 20, 50, 100, 200, 500].filter(function (s) { return s >= dT * 1.05; })[0] || 500;
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      g.strokeStyle = wire; g.lineWidth = 2; line(g, 0, L.floor, w, L.floor);
      // insulated vessel (double wall) with water warmed by the paddles
      var ax = (L.vx0 + L.vx1) / 2, wy = L.vtop + 16;
      g.fillStyle = TV.alpha(mu, 0.15); TV.rr(g, L.vx0, L.vtop, L.vx1 - L.vx0, L.floor - L.vtop, 6); g.fill();
      g.fillStyle = TV.heat(Math.min(1, dT / 60), 0.35); g.fillRect(L.vx0 + 8, wy, L.vx1 - L.vx0 - 16, L.floor - 8 - wy);
      g.strokeStyle = wire; g.lineWidth = 2.5; TV.rr(g, L.vx0, L.vtop, L.vx1 - L.vx0, L.floor - L.vtop, 6); g.stroke();
      g.lineWidth = 1.5; g.strokeRect(L.vx0 + 8, L.vtop + 8, L.vx1 - L.vx0 - 16, L.floor - L.vtop - 16);
      TV.waterLine(g, L.vx0 + 8, L.vx1 - 8, wy, D.t, ctx.color('--c-electron'));
      // paddle wheel: two rows of four blades on the axle, fixed vanes on the walls
      var R = (L.vx1 - L.vx0) * 0.3, a = S.a || 0;
      g.strokeStyle = wire; g.lineWidth = 3; line(g, ax, L.pulY, ax, L.floor - 14);
      [0.4, 0.75].forEach(function (f) {
        var y = wy + (L.floor - 8 - wy) * f;
        for (var k = 0; k < 4; k++) {
          var c = Math.cos(a + k * Math.PI / 2), s = Math.sin(a + k * Math.PI / 2);
          g.fillStyle = TV.alpha(wire, s > 0 ? 0.9 : 0.45); g.fillRect(Math.min(ax, ax + R * c), y - 6, Math.abs(R * c), 12);
        }
        g.fillStyle = wire; g.fillRect(L.vx0 + 8, y - 14, 8, 8); g.fillRect(L.vx1 - 16, y - 14, 8, 8);
      });
      // drum, rope over the pulley, weight
      g.fillStyle = body; g.strokeStyle = wire; g.lineWidth = 2; g.fillRect(ax - 12, L.pulY - 10, 24, 20); g.strokeRect(ax - 12, L.pulY - 10, 24, 20);
      g.lineWidth = 1.5; line(g, ax + 12, L.pulY - 10, L.pulX, L.pulY - 10);
      g.beginPath(); g.arc(L.pulX, L.pulY, 10, -Math.PI / 2, 0); g.stroke(); line(g, L.wx, L.pulY, L.wx, L.wb - L.bs);
      g.lineWidth = 2.5; g.beginPath(); g.arc(L.pulX, L.pulY, 10, 0, 2 * Math.PI); g.stroke();
      g.lineWidth = 3; line(g, L.pulX, L.pulY, L.pulX + 34, L.pulY); line(g, L.pulX + 34, L.pulY, L.pulX + 34, L.floor);
      g.fillStyle = TV.alpha(ctx.color('--c-6'), 0.75); g.strokeStyle = wire; g.lineWidth = 2;
      g.fillRect(L.wx - L.bs / 2, L.wb - L.bs, L.bs, L.bs); g.strokeRect(L.wx - L.bs / 2, L.wb - L.bs, L.bs, L.bs);
      TV.font(g, fs, 700); TV.text(g, nf(p.m, 3) + ' kg', L.wx, L.wb - L.bs - 12, fg, 'center', ctx.color('--surface'));
      // drop height
      var x = L.wx + 48, y0 = L.floor - p.h * L.sc;
      if (S.drop != null) { g.setLineDash([4, 4]); g.strokeStyle = mu; g.strokeRect(L.wx - L.bs / 2, y0 - L.bs, L.bs, L.bs); g.setLineDash([]); }
      TV.arrow(g, x, y0, x, L.floor, mu, 1.5); TV.arrow(g, x, L.floor, x, y0, mu, 1.5);
      TV.font(g, fs, 600); var hl = 'h = ' + nf(p.h, 3) + ' m'; TV.text(g, hl, Math.min(x + 6, w - g.measureText(hl).width - 6), (y0 + L.floor) / 2, fg, 'left', ctx.color('--surface'));
      // thermometer in the water (scale grows with ΔT), drop counter
      var tx = L.vx1 - 22;
      TV.thermometer(g, ctx, tx, L.vtop - 46, L.floor - 18, 20 + dT, 20, 20 + top, 'right');
      TV.font(g, fs - 2, 500); TV.text(g, '20…' + (20 + top) + ' °C', tx, L.vtop - 56, mu, 'center');
      TV.lcd(g, ctx, (L.vx0 + ax) / 2, (L.pulY + L.vtop) / 2 + 6, 'N = ' + (p.N + (S.drop != null ? 1 : 0)), fs);
      TV.font(g, fs - 1, 500); TV.text(g, ctx.tx(T("water ", "vettä ")) + nf(p.M, 3) + ' kg', ax, L.floor - 22, fg, 'center', ctx.color('--surface'));
    },
    outputs: function (v) {
      var W = v.N * v.m * 9.81 * v.h;
      return [{ tex: "W = N·m·g·h", value: W, unit: "J" }, { tex: "ΔT", value: W / (v.M * 4186), unit: "K", digits: 3 }];
    }
  };

  // ---------- device: house with a ventilation heater, air flows through (t6-cp-house) ----------
  function hLay(w, h, p) {
    var ground = h * 0.86, k = w < 520 ? 0.62 : 0.5, bw = Math.max(w * 0.3, w * k * Math.cbrt(p.V / 600)), hx0 = w * 0.58 - bw / 2, wh = Math.min(bw * 0.6, h * 0.5);
    var wallTop = ground - wh;
    return { ground: ground, bw: bw, hx0: hx0, hx1: hx0 + bw, wallTop: wallTop, roof: Math.min(bw * 0.28, wallTop - h * 0.05),
      ox: w * 0.07, oTop: h * 0.18, iX: hx0 + bw - 18, iTop: wallTop + 34 };
  }
  function houseP(v) { return 1.4 * AIR_CV * AIR_RHO * v.V * (v.ti - v.to) / (v.th * 3600); }
  var HOUSE = {
    animate: true,
    aspect: function (w) { return w < 520 ? 0.85 : 0.5; },
    params: [
      { id: "V", tex: "V", min: 100, max: 600, step: 10, value: 290, unit: "m³" },
      { id: "to", tex: "t_{out}", min: -40, max: 10, step: 1, value: -22, unit: "°C" },
      { id: "ti", tex: "t_{in}", min: 15, max: 25, step: 1, value: 21, unit: "°C" },
      { id: "th", tex: "t", min: 0.5, max: 6, step: 0.5, value: 2, unit: "h" }],
    drag: {   // drag the outdoor or indoor thermometer column
      hit: function (x, y, p, D) {
        var L = hLay(D.w, D.h, p);
        return thermoHit(x, y, L.ox, L.oTop, L.ground - 6) ? 'to' : thermoHit(x, y, L.iX, L.iTop, L.ground - 8) ? 'ti' : null;
      },
      move: function (k, x, y, p, D) {
        var L = hLay(D.w, D.h, p);
        return k === 'to' ? { to: thermoVal(y, L.oTop, L.ground - 6, -40, 10) } : { ti: thermoVal(y, L.iTop, L.ground - 8, 15, 25) };
      }
    },
    draw: function (g, w, h, p, ctx, TV, D) {
      var L = hLay(w, h, p), S = D.S, fg = ctx.color('--fg'), mu = ctx.color('--muted'), wire = ctx.color('--c-wire'), fs = fsz(w);
      var fOut = (p.to + 40) / 80, fIn = (p.ti + 40) / 80, P = houseP(p), surf = ctx.color('--surface');
      g.clearRect(0, 0, w, h); g.lineJoin = 'round';
      g.fillStyle = TV.alpha(ctx.color(p.to < 0 ? '--c-cold' : '--c-3'), 0.15); g.fillRect(0, L.ground, w, h - L.ground);
      g.strokeStyle = wire; g.lineWidth = 2; line(g, 0, L.ground, w, L.ground);
      // house: warm room, walls, roof
      g.fillStyle = TV.heat(fIn, 0.14); g.fillRect(L.hx0, L.wallTop, L.bw, L.ground - L.wallTop);
      g.strokeStyle = wire; g.lineWidth = 5; g.strokeRect(L.hx0, L.wallTop, L.bw, L.ground - L.wallTop);
      g.lineWidth = 3; g.beginPath(); g.moveTo(L.hx0 - 12, L.wallTop); g.lineTo((L.hx0 + L.hx1) / 2, L.wallTop - L.roof); g.lineTo(L.hx1 + 12, L.wallTop); g.stroke();
      // air path: outdoors → intake → heater → room → exhaust → outdoors
      var yi = L.ground - 20, ye = L.wallTop + 18, hb0 = L.hx0 + 6, hbw = Math.max(36, L.bw * 0.18), xm = L.hx0 + L.bw * 0.5;
      var pts = [[0, yi], [hb0 + hbw, yi], [xm, yi], [xm, ye], [w, ye]], seg = [], tot = 0, heatAt;
      for (var i = 1; i < pts.length; i++) { var d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); tot += d; if (i === 1) heatAt = tot; }
      S.off = ((S.off || 0) + D.dt * 0.08 * 2 / p.th) % 1;
      for (i = 0; i < 22; i++) {
        var s = ((i / 22 + S.off) % 1) * tot, k = 0; while (k < seg.length - 1 && s > seg[k]) { s -= seg[k]; k++; }
        var u = Math.min(1, s / seg[k]), x = pts[k][0] + (pts[k + 1][0] - pts[k][0]) * u, y = pts[k][1] + (pts[k + 1][1] - pts[k][1]) * u;
        var warm = k > 0 || x > hb0 + hbw * 0.5;
        g.fillStyle = TV.heat(warm ? fIn : fOut, 0.9); g.beginPath(); g.arc(x, y + 3 * Math.sin(i * 1.7 + D.t * 3), 3.5, 0, 2 * Math.PI); g.fill();
      }
      // grilles in the walls, the heater box with its power display
      g.fillStyle = surf; g.fillRect(L.hx0 - 4, yi - 9, 8, 18); g.fillRect(L.hx1 - 4, ye - 9, 8, 18);
      g.strokeStyle = wire; g.lineWidth = 1.5; [yi - 5, yi, yi + 5].forEach(function (y) { line(g, L.hx0 - 4, y, L.hx0 + 4, y); });
      [ye - 5, ye, ye + 5].forEach(function (y) { line(g, L.hx1 - 4, y, L.hx1 + 4, y); });
      g.fillStyle = TV.alpha(ctx.color('--c-hot'), 0.25); g.lineWidth = 2; g.fillRect(hb0, yi - 12, hbw, 24); g.strokeRect(hb0, yi - 12, hbw, 24);
      g.strokeStyle = ctx.color('--c-hot'); g.beginPath();
      for (var zx = hb0 + 4; zx <= hb0 + hbw - 4; zx += 3) g.lineTo(zx, yi + ((zx - hb0) % 6 < 3 ? -6 : 6));
      g.stroke();
      TV.lcd(g, ctx, Math.max(hb0 + hbw / 2, L.hx0 + 48), (L.ground + h) / 2, 'P = ' + TV.fmt(P, 'W', 3), fs);
      TV.font(g, fs, 600); TV.text(g, 'V = ' + nf(p.V, 3) + ' m³', xm, L.wallTop + (L.ground - L.wallTop) * 0.22, fg, 'center', surf);
      TV.font(g, fs - 1, 500);
      TV.text(g, ctx.tx(T("1 air change / ", "1 ilmanvaihto / ")) + nf(p.th, 2) + ' h', xm, L.wallTop + (L.ground - L.wallTop) * 0.22 + fs + 6, mu, 'center', surf);
      // thermometers (drag them)
      TV.thermometer(g, ctx, L.ox, L.oTop, L.ground - 6, p.to, -40, 10, 'right');
      TV.thermometer(g, ctx, L.iX, L.iTop, L.ground - 8, p.ti, 15, 25, 'left');
    },
    outputs: function (v) {
      var P = houseP(v);
      return [{ tex: "c_p = γ c_V", value: 1.4 * AIR_CV, unit: "J/(kg·K)" }, { tex: "P_p", value: P, unit: "W" }, { tex: "E (24 h)", value: P * 86400 / 3.6e6, unit: "kWh" }];
    }
  };

  var EN_L = { solid: 'solid', liquid: 'liquid', gas: 'gas', melting: 'melting', freezing: 'freezing', vaporization: 'vaporization', condensation: 'condensation', sublimation: 'sublimation', deposition: 'deposition', need: 'energy is needed (heat in)', rel: 'energy is released (heat out)' };
  var FI_L = { solid: 'kiinteä', liquid: 'neste', gas: 'kaasu', melting: 'sulaminen', freezing: 'jähmettyminen', vaporization: 'höyrystyminen', condensation: 'tiivistyminen', sublimation: 'sublimoituminen', deposition: 'härmistyminen', need: 'energiaa tarvitaan (lämpö sisään)', rel: 'energiaa vapautuu (lämpö ulos)' };
  // Phase-change diagram (slide p08): energy needed to the right, released to the left.
  function phaseSvg(L) { return "<svg viewBox='0 0 520 190' xmlns='http://www.w3.org/2000/svg' font-size='13'>" +
    "<defs><marker id='t6ah' markerUnits='userSpaceOnUse' markerWidth='9' markerHeight='8' refX='6' refY='4' orient='auto'><path d='M0,0 L8,4 L0,8 z' fill='currentColor'/></marker></defs>" +
    "<rect x='10' y='72' width='100' height='44' rx='6' fill='none' stroke='var(--c-1)' stroke-width='2'/><text x='60' y='99' text-anchor='middle' fill='currentColor'>" + L['solid'] + "</text>" +
    "<rect x='210' y='72' width='100' height='44' rx='6' fill='none' stroke='var(--c-electron)' stroke-width='2'/><text x='260' y='99' text-anchor='middle' fill='currentColor'>" + L['liquid'] + "</text>" +
    "<rect x='410' y='72' width='100' height='44' rx='6' fill='none' stroke='var(--c-flow)' stroke-width='2'/><text x='460' y='99' text-anchor='middle' fill='currentColor'>" + L['gas'] + "</text>" +
    "<line x1='112' y1='84' x2='206' y2='84' stroke='var(--c-flow)' stroke-width='2' marker-end='url(#t6ah)'/><text x='160' y='76' text-anchor='middle' fill='currentColor' font-size='11'>" + L['melting'] + "</text>" +
    "<line x1='206' y1='106' x2='114' y2='106' stroke='var(--c-electron)' stroke-width='2' marker-end='url(#t6ah)'/><text x='160' y='122' text-anchor='middle' fill='currentColor' font-size='11'>" + L['freezing'] + "</text>" +
    "<line x1='312' y1='84' x2='406' y2='84' stroke='var(--c-flow)' stroke-width='2' marker-end='url(#t6ah)'/><text x='360' y='76' text-anchor='middle' fill='currentColor' font-size='11'>" + L['vaporization'] + "</text>" +
    "<line x1='406' y1='106' x2='314' y2='106' stroke='var(--c-electron)' stroke-width='2' marker-end='url(#t6ah)'/><text x='360' y='122' text-anchor='middle' fill='currentColor' font-size='11'>" + L['condensation'] + "</text>" +
    "<path d='M60,70 V36 H460 V68' fill='none' stroke='var(--c-flow)' stroke-width='2' marker-end='url(#t6ah)'/><text x='260' y='30' text-anchor='middle' fill='currentColor' font-size='11'>" + L['sublimation'] + "</text>" +
    "<path d='M460,118 V156 H60 V120' fill='none' stroke='var(--c-electron)' stroke-width='2' marker-end='url(#t6ah)'/><text x='260' y='172' text-anchor='middle' fill='currentColor' font-size='11'>" + L['deposition'] + "</text>" +
    "<text x='260' y='12' text-anchor='middle' fill='var(--c-flow)' font-size='12'>" + L['need'] + "</text>" +
    "<text x='260' y='188' text-anchor='middle' fill='var(--c-electron)' font-size='12'>" + L['rel'] + "</text></svg>"; }

  TDC.registerTopic({
    id: "t6", num: 6,
    title: T("Heat and latent heat", "Lämpö ja olomuodon muutokset"),
    subtitle: T("Joule's experiment, specific heat, calorimetry, water heaters, heating a house, and the energy of melting and boiling.",
                "Joulen koe, ominais\u00ADlämpö\u00ADkapasiteetti, kalorimetria, vedenlämmittimet, talon lämmitys sekä sulamisen ja kiehumisen energia."),
    objectives: [
      T("explain heat as energy transferred because of a temperature difference, and convert between J, cal and kWh",
        "selittää lämpö lämpötilaeron vuoksi siirtyväksi energiaksi sekä muuntaa yksiköt J, cal ja kWh"),
      T("use Q = c·m·ΔT and P = Q/t to size a water heater or a heating system",
        "käyttää kaavoja Q = c·m·ΔT ja P = Q/t vedenlämmittimen tai lämmitysjärjestelmän mitoitukseen"),
      T("solve calorimetry problems with the rule 'heat lost = heat gained'",
        "ratkaista kalorimetritehtäviä säännöllä 'luovutettu lämpö = vastaanotettu lämpö'"),
      T("tell c_p from c_V and use γ = c_p/c_V", "erottaa c_p ja c_V toisistaan ja käyttää kaavaa γ = c_p/c_V"),
      T("calculate the energy of melting, freezing, boiling and condensing with Q = m·L and read a heating curve",
        "laskea sulamisen, jähmettymisen, höyrystymisen ja tiivistymisen energian kaavalla Q = m·L ja lukea lämmityskäyrää")
    ],
    glossary: {
      heat: { en: "heat", fi: "lämpö", sym: "Q", def: T("Energy transferred from one object to another because of a temperature difference. Unit joule (J).", "Kahden kappaleen välillä lämpötilaeron vuoksi siirtyvä energia. Yksikkö joule (J).") },
      calorie: { en: "calorie", fi: "kalori", sym: "cal", def: T("Old heat unit: 1 cal = 4.1868 J.", "Vanha lämmön yksikkö: 1 cal = 4,1868 J.") },
      heatcapacity: { en: "heat capacity", fi: "lämpökapasiteetti", sym: "C", def: T("Heat needed to raise the temperature of an object by 1 K: C = Q/ΔT, unit J/K.", "Lämpö, joka nostaa kappaleen lämpötilaa 1 K: C = Q/ΔT, yksikkö J/K.") },
      specificheat: { en: "specific heat capacity", fi: "ominaislämpökapasiteetti", sym: "c", def: T("Heat needed to warm 1 kg of a substance by 1 K: c = Q/(mΔT), unit J/(kg·K).", "Lämpö, joka lämmittää 1 kg ainetta 1 K: c = Q/(mΔT), yksikkö J/(kg·K).") },
      molarheat: { en: "molar heat capacity", fi: "moolinen lämpökapasiteetti", sym: "C_m", def: T("Heat capacity per amount of substance, J/(mol·K).", "Lämpökapasiteetti ainemäärää kohti, J/(mol·K).") },
      cp: { en: "specific heat at constant pressure", fi: "ominaislämpökapasiteetti vakiopaineessa", sym: "c_p", def: T("Specific heat when the substance is heated at constant pressure.", "Ominaislämpökapasiteetti, kun ainetta lämmitetään vakiopaineessa.") },
      cv: { en: "specific heat at constant volume", fi: "ominaislämpökapasiteetti vakiotilavuudessa", sym: "c_V", def: T("Specific heat when the substance is heated at constant volume.", "Ominaislämpökapasiteetti, kun ainetta lämmitetään vakiotilavuudessa.") },
      gamma: { en: "adiabatic index", fi: "adiabaattivakio", sym: "γ", def: T("Ratio c_p/c_V: 1.67 monatomic, 1.40 diatomic gas, about 1 for solids and liquids.", "Suhde c_p/c_V: 1,67 yksiatomisella, 1,40 kaksiatomisella kaasulla, noin 1 kiinteillä aineilla ja nesteillä.") },
      calorimeter: { en: "calorimeter", fi: "kalorimetri", def: T("Insulated vessel used to measure heat exchange between substances.", "Eristetty astia, jolla mitataan aineiden välistä lämmönvaihtoa.") },
      thermaleq: { en: "thermal equilibrium", fi: "lämpötasapaino", def: T("State where the bodies in contact have the same temperature and no net heat flows.", "Tila, jossa toisiinsa kosketuksissa olevilla kappaleilla on sama lämpötila eikä nettolämpöä siirry.") },
      phasechange: { en: "phase change", fi: "olomuodon muutos", def: T("Change between solid, liquid and gas at constant temperature.", "Muutos kiinteän, nesteen ja kaasun välillä vakiolämpötilassa.") },
      melting: { en: "melting", fi: "sulaminen", def: T("Solid to liquid; needs heat.", "Kiinteästä nesteeksi; vaatii lämpöä.") },
      freezing: { en: "freezing", fi: "jähmettyminen", def: T("Liquid to solid; releases heat.", "Nesteestä kiinteäksi; vapauttaa lämpöä.") },
      vaporization: { en: "vaporization", fi: "höyrystyminen", def: T("Liquid to gas; needs heat.", "Nesteestä kaasuksi; vaatii lämpöä.") },
      condensation: { en: "condensation", fi: "tiivistyminen", def: T("Gas to liquid; releases heat.", "Kaasusta nesteeksi; vapauttaa lämpöä.") },
      heatfusion: { en: "specific latent heat of fusion", fi: "ominaissulamislämpö", sym: "L_F", def: T("Heat to melt 1 kg at its melting point; water 333 kJ/kg.", "Lämpö, joka sulattaa 1 kg ainetta sen sulamispisteessä; vesi 333 kJ/kg.") },
      heatvap: { en: "specific latent heat of vaporization", fi: "ominaishöyrystymislämpö", sym: "L_V", def: T("Heat to vaporize 1 kg at its boiling point; water 2260 kJ/kg.", "Lämpö, joka höyrystää 1 kg ainetta sen kiehumispisteessä; vesi 2260 kJ/kg.") },
      heatingcurve: { en: "heating curve", fi: "lämmityskäyrä", def: T("Graph of temperature against the heat added.", "Lämpötila lisätyn lämmön funktiona.") },
      power: { en: "power", fi: "teho", sym: "P", def: T("Energy per unit time, P = Q/t, unit watt (W).", "Energia aikayksikköä kohti, P = Q/t, yksikkö watti (W).") },
      efficiency: { en: "efficiency", fi: "hyötysuhde", sym: "η", def: T("Useful output divided by input, η = P_out/P_in.", "Hyötyteho jaettuna syöttöteholla, η = P_ulos/P_sisään.") },
      kwh: { en: "kilowatt-hour", fi: "kilowattitunti", sym: "kWh", def: T("Energy unit of electricity bills: 1 kWh = 3.6 MJ.", "Sähkölaskun energiayksikkö: 1 kWh = 3,6 MJ.") }
    },
    formulas: [
      { name: T("Mechanical equivalent of heat", "Lämmön mekaaninen ekvivalentti"), tex: "1 cal = 4.1868 J" },
      { name: T("Heat capacity", "Lämpökapasiteetti"), tex: "C = {Q}/{ΔT}" },
      { name: T("Specific heat", "Ominaislämpökapasiteetti"), tex: "c = {Q}/{mΔT}" },
      { name: T("Heat to change temperature", "Lämpötilan muutoksen vaatima lämpö"), tex: "Q = c·m·ΔT" },
      { name: T("Heating power", "Lämmitysteho"), tex: "P = {Q}/{t} = {c·m·ΔT}/{t}" },
      { name: T("Calorimetry (heat lost = heat gained)", "Kalorimetria (luovutettu = vastaanotettu lämpö)"), tex: "m_a c_a ΔT_a = m_w c_w ΔT_w + m_{cal} c_{cal} ΔT_{cal}" },
      { name: T("Ratio of specific heats", "Ominaislämpöjen suhde"), tex: "γ = {c_p}/{c_V}" },
      { name: T("Heat at constant V and p", "Lämpö vakiotilavuudessa ja -paineessa"), tex: "Q_V = c_V m ΔT,   Q_p = c_p m ΔT" },
      { name: T("Latent heat", "Olomuodon muutoksen lämpö"), tex: "Q_F = m L_F,   Q_V = m L_V" },
      { name: T("Kilowatt-hour", "Kilowattitunti"), tex: "1 kWh = 3.6 MJ" }
    ],
    sections: [
      // ------------------------------------------------------------------ 1
      {
        id: "t6-heat", title: T("Heat and the unit of heat", "Lämpö ja lämmön yksikkö"),
        blocks: [
          { id: "t6-heat-p1", type: "text", html: T(
            "<p>The concept of <dfn data-term=\"heat\">heat</dfn> was not well understood until Joule's experiment: a falling weight turns a paddle wheel in water, and friction warms the water slightly. Joule's idea was that a given amount of work is always equivalent to a particular amount of heat input.</p>",
            "<p><dfn data-term=\"heat\">Lämmön</dfn> käsite ymmärrettiin hyvin vasta Joulen kokeen jälkeen: putoava paino pyörittää siipipyörää vedessä ja kitka lämmittää vettä hieman. Joulen ajatus oli, että tietty tehty työ vastaa aina tiettyä lämpömäärää.</p>") },
          { id: "t6-heat-c1", type: "callout", kind: "key", title: T("Definition", "Määritelmä"),
            html: T("Heat is energy transferred from one object to another because of a difference in temperature.",
                    "Lämpö on energiaa, joka siirtyy kappaleesta toiseen lämpötilaeron vuoksi.") },
          { id: "t6-heat-p2", type: "text", html: T(
            "<p>Joule found that 4.1868 J of work equals 1.0 <dfn data-term=\"calorie\">calorie</dfn> of heat (the mechanical equivalent of heat). Heat, work and energy all share one unit, the joule.</p>",
            "<p>Joule havaitsi, että 4,1868 J työtä vastaa 1,0 <dfn data-term=\"calorie\">kalorin</dfn> lämpöä (lämmön mekaaninen ekvivalentti). Lämmöllä, työllä ja energialla on sama yksikkö, joule.</p>") },
          { id: "t6-heat-f1", type: "formula", key: true, tex: "4.1868 J = 1.0 cal,   4.1868 kJ = 1.0 kcal", label: T("Mechanical equivalent of heat", "Lämmön mekaaninen ekvivalentti") },
          { id: "t6-heat-f2", type: "formula", tex: "[Q] = [W] = [E] = J", label: T("Unit of heat", "Lämmön yksikkö") },
          // (extra) kWh
          { id: "t6-heat-p3", type: "text", html: T(
            "<p>On electricity bills and for water heaters the energy unit is the <dfn data-term=\"kwh\">kilowatt-hour</dfn>: 1 kWh = 1000 W · 3600 s = 3.6 MJ.</p>",
            "<p>Sähkölaskuissa ja vedenlämmittimissä energian yksikkö on <dfn data-term=\"kwh\">kilowattitunti</dfn>: 1 kWh = 1000 W · 3600 s = 3,6 MJ.</p>") },
          // (extra) Joule's paddle wheel as a readout
          { id: "t6-heat-joule", type: "interactive", widget: "custom", title: T("Joule's paddle wheel", "Joulen siipipyörä"),
            caption: { en: "Drop the weight: it turns the paddles, and its work m·g·h ends up as heat in the insulated water, ΔT = N·m·g·h/(M·c). Drag the weight up or down to change the height h, or use the sliders, and see how little the water warms.",
            fi: "Pudota paino: se pyörittää siipiä, ja sen tekemä työ m·g·h muuttuu eristetyn veden lämmöksi, ΔT = N·m·g·h/(M·c). Vedä painoa ylös tai alas muuttaaksesi korkeutta h tai käytä liukusäätimiä ja katso, kuinka vähän vesi lämpenee." },
          config: dev(JOULE) },
          { id: "t6-heat-q1", type: "question", q: "t6-q1" },
          { id: "t6-heat-q2", type: "question", q: "t6-q2" }
        ]
      },
      // ------------------------------------------------------------------ 2
      {
        id: "t6-capacity", title: T("Heat capacity and specific heat", "Lämpökapasiteetti ja ominais\u00ADlämpö\u00ADkapasiteetti"),
        blocks: [
          { id: "t6-cap-p1", type: "text", html: T(
            "<p>When heat flows into an object, its temperature rises. How much depends on its <dfn data-term=\"heatcapacity\">heat capacity</dfn> <em>C</em>.</p>",
            "<p>Kun lämpöä virtaa kappaleeseen, sen lämpötila nousee. Nousun suuruus riippuu kappaleen <dfn data-term=\"heatcapacity\">lämpökapasiteetista</dfn> <em>C</em>.</p>") },
          { id: "t6-cap-f1", type: "formula", key: true, tex: "C = {Q}/{ΔT}", label: T("Heat capacity", "Lämpökapasiteetti"),
            legend: [["Q", T("heat flowed into the object", "kappaleeseen virrannut lämpö"), "J"], ["ΔT", T("change of temperature", "lämpötilan muutos"), "K"]] },
          { id: "t6-cap-p2", type: "text", html: T(
            "<p>Heat capacity ignores size, mass and substance, so it is not very useful. The <dfn data-term=\"specificheat\">specific heat capacity</dfn> <em>c</em> describes the material, per kilogram. The values of solids and liquids depend only slightly on temperature and pressure, so for small temperature changes <em>c</em> is treated as constant.</p>",
            "<p>Lämpökapasiteetti ei ota huomioon kappaleen kokoa, massaa tai ainetta, joten se ei ole kovin käyttökelpoinen. <dfn data-term=\"specificheat\">Ominais\u00ADlämpö\u00ADkapasiteetti</dfn> <em>c</em> kuvaa ainetta kilogrammaa kohti. Kiinteiden aineiden ja nesteiden arvot riippuvat lämpötilasta ja paineesta vain vähän, joten pienillä lämpötilan muutoksilla <em>c</em> on vakio.</p>") },
          { id: "t6-cap-f2", type: "formula", key: true, tex: "c = {Q}/{m ΔT},   Q = c·m·ΔT", label: T("Specific heat", "Ominais\u00ADlämpö\u00ADkapasiteetti"),
            legend: [["c", T("specific heat", "ominais\u00ADlämpö\u00ADkapasiteetti"), "J/(kg·K)"], ["m", T("mass", "massa"), "kg"]] },
          { id: "t6-cap-t1", type: "table", caption: T("Specific heats (1 atm, 20 °C unless stated)", "Ominais\u00ADlämpö\u00ADkapasiteetteja (1 atm, 20 °C ellei toisin mainita)"),
            head: [T("Substance", "Aine"), "c (kcal/(kg·K))", "c (J/(kg·K))"],
            rows: [
              [T("Aluminium", "Alumiini"), "0.22", "900"], [T("Alcohol (ethyl)", "Etanoli"), "0.58", "2400"], [T("Copper", "Kupari"), "0.093", "390"],
              [T("Glass", "Lasi"), "0.20", "840"], [T("Iron or steel", "Rauta tai teräs"), "0.11", "450"], [T("Lead", "Lyijy"), "0.031", "130"],
              [T("Marble", "Marmori"), "0.21", "860"], [T("Mercury", "Elohopea"), "0.033", "140"], [T("Silver", "Hopea"), "0.056", "230"],
              [T("Wood", "Puu"), "0.4", "1700"], [T("Ice (−5 °C)", "Jää (−5 °C)"), "0.50", "2100"], [T("Water (15 °C)", "Vesi (15 °C)"), "1.00", "4186"],
              [T("Steam (110 °C)", "Vesihöyry (110 °C)"), "0.48", "2010"], [T("Human body (average)", "Ihmiskeho (keskiarvo)"), "0.83", "3470"], [T("Protein", "Proteiini"), "0.4", "1700"]] },
          { id: "t6-cap-c1", type: "callout", kind: "tip", html: T(
            "Water has an unusually large specific heat. That is why it stores so much heat, and why heating water consumes so much energy.",
            "Vedellä on poikkeuksellisen suuri ominais\u00ADlämpö\u00ADkapasiteetti. Siksi vesi varastoi paljon lämpöä ja veden lämmittäminen kuluttaa paljon energiaa.") },
          { id: "t6-cap-ex1", type: "example", title: T("Electric water heater", "Sähköinen vedenlämmitin"),
            problem: T("A water heater holds 450 L. What energy is needed to raise the temperature from 4.0 °C to 75 °C, and what average electrical power does it take to do it in 8.0 h?",
                       "Vedenlämmittimen tilavuus on 450 L. Kuinka paljon energiaa tarvitaan lämpötilan nostamiseen 4,0 °C:sta 75 °C:seen ja mikä keskimääräinen sähköteho vaaditaan, kun lämmitys kestää 8,0 h?"),
            given: ["V = 450 L → m ≈ 450 kg", "c = 4190 J/(kg·K)", "ΔT = 71 K", "t = 8.0 h = 28 800 s"],
            steps: [
              { tex: "Q = c·m·ΔT = 4190 · 450 · 71 J ≈ 134 MJ" },
              { tex: "P = {Q}/{t} = {134 MJ}/{8.0·60·60 s} ≈ 4.7 kW" },
              T("In kilowatt-hours: 134 MJ / 3.6 MJ per kWh ≈ 37 kWh.", "Kilowattitunteina: 134 MJ / 3,6 MJ/kWh ≈ 37 kWh.")],
            result: T("Q ≈ 134 MJ (about 37 kWh), P ≈ 4.7 kW. Heating water consumes a lot of energy.",
                      "Q ≈ 134 MJ (noin 37 kWh), P ≈ 4,7 kW. Veden lämmitys kuluttaa paljon energiaa.") },
          { id: "t6-cap-heater", type: "interactive", widget: "heating", title: T("Electric water heater", "Sähköinen vedenlämmitin"),
            caption: T("Change the volume, the temperatures and the heater power. The energy comes out in J and kWh, and the heating time follows from P = Q/t. The start values are the slide example.",
                       "Muuta tilavuutta, lämpötiloja ja lämmittimen tehoa. Energia saadaan J- ja kWh-yksiköissä ja lämmitysaika kaavasta P = Q/t. Alkuarvot ovat dian esimerkki."),
            config: { mode: "heater" } },
          { id: "t6-cap-q1", type: "question", q: "t6-q3" },
          { id: "t6-cap-q2", type: "question", q: "t6-q4" },
          { id: "t6-cap-q3", type: "question", q: "t6-q5" },
          { id: "t6-cap-q4", type: "question", q: "t6-q6" }
        ]
      },
      // ------------------------------------------------------------------ 3
      {
        id: "t6-calorimetry", title: T("Calorimetry", "Kalorimetria"),
        blocks: [
          { id: "t6-cal-p1", type: "text", html: T(
            "<p><b>Calorimetry</b> is the technique of measuring the heat exchanged between objects. A <dfn data-term=\"calorimeter\">calorimeter</dfn> is a well-insulated cup with a thermometer and a stirrer. The bodies exchange heat until they reach <dfn data-term=\"thermaleq\">thermal equilibrium</dfn>. With no losses, the heat lost equals the heat gained.</p>",
            "<p><b>Kalorimetria</b> tarkoittaa kappaleiden välisen lämmönvaihdon mittaamista. <dfn data-term=\"calorimeter\">Kalorimetri</dfn> on hyvin eristetty astia, jossa on lämpömittari ja sekoitin. Kappaleet vaihtavat lämpöä, kunnes ne ovat <dfn data-term=\"thermaleq\">lämpötasapainossa</dfn>. Ilman häviöitä luovutettu lämpö on yhtä suuri kuin vastaanotettu lämpö.</p>") },
          { id: "t6-cal-f1", type: "formula", key: true, tex: "m_a c_a ΔT_a = m_w c_w ΔT_w + m_{cal} c_{cal} ΔT_{cal}",
            label: T("Heat lost = heat gained", "Luovutettu lämpö = vastaanotettu lämpö"),
            legend: [["a", T("hot sample (alloy)", "kuuma näyte (seos)"), ""], ["w", T("water", "vesi"), ""], ["cal", T("calorimeter cup", "kalorimetrin kuppi"), ""]] },
          { id: "t6-cal-c1", type: "callout", kind: "warn", html: T(
            "Take each ΔT as a positive difference (initial minus final for the body that cools, final minus initial for the bodies that warm up).",
            "Käytä jokaisessa ΔT:ssa positiivista erotusta (jäähtyvällä kappaleella alkulämpötila miinus loppulämpötila, lämpenevillä loppulämpötila miinus alkulämpötila).") },
          { id: "t6-cal-ex1", type: "example", title: T("Specific heat of an alloy", "Seoksen ominais\u00ADlämpö\u00ADkapasiteetti"),
            problem: T("A 0.150 kg alloy sample is heated to 540 °C and placed in 0.400 kg of water at 10.0 °C in a 0.200 kg aluminium calorimeter cup. The final temperature is 30.5 °C. Find the specific heat of the alloy.",
                       "0,150 kg:n seosnäyte kuumennetaan 540 °C:seen ja pudotetaan 0,400 kg:aan 10,0 °C:n vettä, joka on 0,200 kg:n alumiinisessa kalorimetrin kupissa. Loppulämpötila on 30,5 °C. Laske seoksen ominais\u00ADlämpö\u00ADkapasiteetti."),
            given: ["m_a = 0.150 kg, t_a = 540 °C", "m_w = 0.400 kg, c_w = 4186 J/(kg·K), t_w = 10.0 °C", "m_cal = 0.200 kg, c_cal = 900 J/(kg·K)", "t_l = 30.5 °C"],
            steps: [
              T("Heat lost by the alloy equals heat gained by water and cup. Solve for c_a:", "Seoksen luovuttama lämpö on yhtä suuri kuin veden ja kupin vastaanottama lämpö. Ratkaistaan c_a:"),
              { tex: "c_a = {m_w c_w ΔT_w + m_{cal} c_{cal} ΔT_{cal}}/{m_a ΔT_a}" },
              { tex: "c_a = {[0.400·4186 + 0.200·900]·(30.5 − 10.0)}/{0.150·(540 − 30.5)} J/(kg·K)" },
              { tex: "c_a ≈ 497 J/(kg·K)" }],
            result: T("c_a ≈ 497 J/(kg·K)", "c_a ≈ 497 J/(kg·K)") },
          { id: "t6-cal-mix", type: "interactive", widget: "heating", title: T("Calorimeter", "Kalorimetri"),
            caption: T("Drop the hot alloy into the cup. Change the masses, the temperatures and c_a and watch the final temperature. The defaults are the slide example (t_l = 30.5 °C when c_a = 497 J/(kg·K)); the heat lost by the alloy always equals the heat gained.",
                       "Pudota kuuma seos kuppiin. Muuta massoja, lämpötiloja ja arvoa c_a ja seuraa loppulämpötilaa. Oletusarvot ovat dian esimerkki (t_l = 30,5 °C, kun c_a = 497 J/(kg·K)); seoksen luovuttama lämpö on aina yhtä suuri kuin vastaanotettu lämpö."),
            config: { mode: "mix" } },
          { id: "t6-cal-q1", type: "question", q: "t6-q7" },
          { id: "t6-cal-q2", type: "question", q: "t6-q8" }
        ]
      },
      // ------------------------------------------------------------------ 4
      {
        id: "t6-cpcv", title: T("Heating at constant volume or constant pressure", "Lämmitys vakiotilavuudessa tai vakiopaineessa"),
        blocks: [
          { id: "t6-cp-p1", type: "text", html: T(
            "<p>Energy and power equations are the base for designing simple heating or cooling systems, and systems where heat is moved from one place to another. The subscripts <em>V</em> and <em>p</em> mean heating at constant volume or at constant pressure.</p>",
            "<p>Energia- ja tehoyhtälöt ovat perusta yksinkertaisten lämmitys- ja jäähdytysjärjestelmien sekä lämmönsiirtojärjestelmien suunnittelulle. Alaindeksit <em>V</em> ja <em>p</em> tarkoittavat lämmitystä vakiotilavuudessa tai vakiopaineessa.</p>") },
          { id: "t6-cp-f1", type: "formula", key: true, tex: "Q_V = c_V m ΔT,   Q_p = c_p m ΔT", label: T("Energy equations", "Energiayhtälöt") },
          { id: "t6-cp-f2", type: "formula", key: true, tex: "P_V = {Q_V}/{t} = {c_V m ΔT}/{t},   P_p = {Q_p}/{t} = {c_p m ΔT}/{t}", label: T("Power equations", "Tehoyhtälöt") },
          { id: "t6-cp-p2", type: "text", html: T(
            "<p>Two equations are needed because the specific heats at constant pressure and at constant volume differ. The difference is given by the ratio of specific heats, the <dfn data-term=\"gamma\">adiabatic index</dfn>. It comes from thermal expansion. When a gas is heated at constant pressure it expands and does work, so it needs more heat than at constant volume.</p>",
            "<p>Tarvitaan kaksi yhtälöä, koska ominais\u00ADlämpö\u00ADkapasiteetit vakiopaineessa ja vakiotilavuudessa poikkeavat toisistaan. Ero kuvataan ominaislämpöjen suhteella, <dfn data-term=\"gamma\">adiabaattivakiolla</dfn>. Ero johtuu lämpö\u00ADlaajenemisesta: kun kaasua lämmitetään vakiopaineessa, se laajenee ja tekee työtä, joten se tarvitsee enemmän lämpöä kuin vakiotilavuudessa.</p>") },
          { id: "t6-cp-f3", type: "formula", key: true, tex: "γ = {c_p}/{c_V}", label: T("Ratio of specific heats", "Ominaislämpöjen suhde") },
          { id: "t6-cp-t1", type: "table", caption: T("Typical values of γ", "γ:n tyypillisiä arvoja"),
            head: [T("Substance", "Aine"), "γ"],
            rows: [[T("solids and liquids", "kiinteät aineet ja nesteet"), "≈ 1"], [T("monatomic gas", "yksiatominen kaasu"), "1.67"], [T("diatomic gas (e.g. air)", "kaksiatominen kaasu (esim. ilma)"), "1.40"]] },
          { id: "t6-cp-c1", type: "callout", kind: "warn", html: T(
            "For solids and liquids γ ≈ 1, so it does not matter which equation you use. For gases you must decide whether the process is at constant pressure or at constant volume.",
            "Kiinteillä aineilla ja nesteillä γ ≈ 1, joten ei ole väliä, kumpaa yhtälöä käyttää. Kaasuilla on päätettävä, tapahtuuko prosessi vakiopaineessa vai vakiotilavuudessa.") },
          { id: "t6-cp-ex1", type: "example", title: T("Heating the air of a house", "Talon ilman lämmitys"),
            problem: T("In a one-family house the air must be changed at least once in two hours. Outdoors it is −22 °C, indoors +21 °C, the volume is 290 m³. What average power is needed to warm the incoming air to the indoor temperature? For air c_V = 714 J/(kg·K), ρ = 1.29 kg/m³.",
                       "Omakotitalon ilma on vaihdettava vähintään kerran kahdessa tunnissa. Ulkolämpötila on −22 °C, sisälämpötila +21 °C ja talon tilavuus 290 m³. Mikä keskimääräinen teho tarvitaan lämmittämään tuleva ilma sisälämpötilaan? Ilmalle c_V = 714 J/(kg·K) ja ρ = 1,29 kg/m³."),
            given: ["c_V = 714 J/(kg·K)", "V = 290 m³", "ΔT = 43 K", "t = 7200 s", "ρ = 1.29 kg/m³"],
            steps: [
              T("The air flows through the house at (nearly) constant pressure, so use c_p.", "Ilma virtaa talon läpi (lähes) vakiopaineessa, joten käytetään c_p:tä."),
              { tex: "c_p = γ·c_V = 1.40 · 714 J/(kg·K) ≈ 1.0 kJ/(kg·K)" },
              { tex: "P_p = {c_p ρ V ΔT}/{t} = 1000·1.29·{290}/{7200}·43 W ≈ 2.23 kW" }],
            result: T("P ≈ 2.23 kW", "P ≈ 2,23 kW") },
          { id: "t6-cp-house", type: "interactive", widget: "custom", title: T("House heating", "Talon lämmitys"),
            caption: { en: "The heater of the ventilation unit warms the incoming outdoor air at constant pressure. Drag the outdoor or indoor thermometer, make the house bigger or leakier (shorter air-change time) and watch the heater power. The defaults are the slide example.",
            fi: "Ilmanvaihtokoneen lämmitin lämmittää sisään tulevan ulkoilman vakiopaineessa. Vedä ulko- tai sisälämpömittaria, tee talosta suurempi tai vuotavampi (lyhyempi ilmanvaihtoaika) ja seuraa lämmittimen tehoa. Oletusarvot ovat dian esimerkki." },
          config: dev(HOUSE) },
          { id: "t6-cp-q1", type: "question", q: "t6-q9" },
          { id: "t6-cp-q2", type: "question", q: "t6-q10" }
        ]
      },
      // ------------------------------------------------------------------ 5
      {
        id: "t6-latent", title: T("Latent heat and phase changes", "Olomuodon muutokset ja piilevä lämpö"),
        blocks: [
          { id: "t6-lat-p1", type: "text", html: T(
            "<p>When a material changes phase, heat is absorbed or released <b>without a change of temperature</b>. Melting, vaporization and sublimation need energy; freezing, condensation and deposition release it. The energies involved are the <b>latent heats</b>. In Finnish: <dfn data-term=\"melting\">sulaminen</dfn>, <dfn data-term=\"vaporization\">höyrystyminen</dfn>, sublimoituminen; <dfn data-term=\"freezing\">jähmettyminen</dfn>, <dfn data-term=\"condensation\">tiivistyminen</dfn>, härmistyminen.</p>",
            "<p>Kun aineen olomuoto muuttuu (<dfn data-term=\"phasechange\">olomuodon muutos</dfn>), lämpöä sitoutuu tai vapautuu <b>lämpötilan muuttumatta</b>. <dfn data-term=\"melting\">Sulaminen</dfn>, <dfn data-term=\"vaporization\">höyrystyminen</dfn> ja sublimoituminen vaativat energiaa; <dfn data-term=\"freezing\">jähmettyminen</dfn>, <dfn data-term=\"condensation\">tiivistyminen</dfn> ja härmistyminen vapauttavat sitä. Näitä energioita kutsutaan <b>piileviksi lämmöiksi</b>.</p>") },
          { id: "t6-lat-fig", type: "figure", svg: T(phaseSvg(EN_L), phaseSvg(FI_L)),
            caption: T("Phase changes. Energy is needed to the right (melting, vaporization, sublimation) and released to the left (freezing, condensation, deposition).",
                       "Olomuodon muutokset. Energiaa tarvitaan oikealle (sulaminen, höyrystyminen, sublimoituminen) ja sitä vapautuu vasemmalle (jähmettyminen, tiivistyminen, härmistyminen)."),
            alt: T("Solid, liquid and gas with arrows for phase changes", "Kiinteä, neste ja kaasu sekä olomuodon muutosten nuolet") },
          { id: "t6-lat-q1", type: "question", q: "t6-q11" },
          { id: "t6-lat-p2", type: "text", html: T(
            "<p>The widget below shows the temperature of 1.0 kg of ice at −40 °C as heat is added (the slide figure, in kcal: 20 for the ice, 80 for melting, 100 for the water, about 540 for boiling). The sloped parts follow the specific heats. The flat steps are the phase changes: the long one at 100 °C is boiling, which costs far more than melting.</p>",
            "<p>Alla oleva komponentti näyttää 1,0 kg:n −40 °C:n jään lämpötilan lisätyn lämmön funktiona (dian kuvaaja kilokaloreina: 20 jäälle, 80 sulamiselle, 100 vedelle, noin 540 kiehumiselle). Kaltevat osat noudattavat ominais\u00ADlämpö\u00ADkapasiteetteja. Vaakasuorat osat ovat olomuodon muutokset: pitkä 100 °C:n kohdalla on kiehuminen, joka vaatii paljon enemmän energiaa kuin sulaminen.</p>") },
          { id: "t6-lat-curve", type: "interactive", widget: "heating", title: T("Heating curve: ice → water → steam", "Lämmityskäyrä: jää → vesi → höyry"),
            caption: T("Drag Q or press Play to heat 1 kg at power P. The temperature stays at 0 °C while the ice melts and at 100 °C while the water boils (1 kcal = 4.186 kJ).",
                       "Vedä Q:ta tai paina Play, niin 1 kg lämpenee teholla P. Lämpötila pysyy 0 °C:ssa jään sulaessa ja 100 °C:ssa veden kiehuessa (1 kcal = 4,186 kJ)."),
            config: { mode: "curve" } },
          { id: "t6-lat-p3", type: "text", html: T(
            "<p>The heat needed to change 1 kg from solid to liquid is the <dfn data-term=\"heatfusion\">specific latent heat of fusion</dfn> <em>L</em><sub>F</sub> (water: 333 kJ/kg). The heat needed to change 1 kg from liquid to vapour is the <dfn data-term=\"heatvap\">specific latent heat of vaporization</dfn> <em>L</em><sub>V</sub> (water: 2.26 MJ/kg). The same energy is released in the reverse change.</p>",
            "<p>Lämpö, joka muuttaa 1 kg ainetta kiinteästä nesteeksi, on <dfn data-term=\"heatfusion\">ominaissulamislämpö</dfn> <em>L</em><sub>F</sub> (vesi: 333 kJ/kg). Lämpö, joka muuttaa 1 kg ainetta nesteestä höyryksi, on <dfn data-term=\"heatvap\">ominaishöyrystymislämpö</dfn> <em>L</em><sub>V</sub> (vesi: 2,26 MJ/kg). Käänteisessä muutoksessa vapautuu yhtä suuri energia.</p>") },
          { id: "t6-lat-f1", type: "formula", key: true, tex: "Q_F = m L_F,   Q_V = m L_V", label: T("Energy of melting/freezing and vaporization/condensation", "Sulamisen/jähmettymisen ja höyrystymisen/tiivistymisen energia"),
            legend: [["L_F", T("heat of fusion", "sulamislämpö"), "J/kg"], ["L_V", T("heat of vaporization", "höyrystymislämpö"), "J/kg"]] },
          { id: "t6-lat-t1", type: "table", caption: T("Latent heats (1 atm)", "Piilevät lämmöt (1 atm)"),
            head: [T("Substance", "Aine"), T("Melting point (°C)", "Sulamispiste (°C)"), { tex: "L_F / (kJ/kg)" }, T("Boiling point (°C)", "Kiehumispiste (°C)"), { tex: "L_V / (kJ/kg)" }],
            rows: [
              [T("Oxygen", "Happi"), "−218.8", "14", "−183", "210"], [T("Nitrogen", "Typpi"), "−210.0", "26", "−195.8", "200"],
              [T("Ethyl alcohol", "Etanoli"), "−114", "104", "78", "850"], [T("Ammonia", "Ammoniakki"), "−77.8", "33", "−33.4", "137"],
              [T("Water", "Vesi"), "0", "333", "100", "2260"], [T("Lead", "Lyijy"), "327", "25", "1750", "870"],
              [T("Silver", "Hopea"), "961", "88", "2193", "2300"], [T("Iron", "Rauta"), "1808", "289", "3023", "6340"],
              [T("Tungsten", "Volframi"), "3410", "184", "5900", "4800"]] },
          { id: "t6-lat-ex1", type: "example", title: T("Condensing steam", "Höyryn tiivistyminen"),
            problem: T("What energy is released when 150 kg of water vapour at 100 °C condenses? L_V = 2260 kJ/kg.",
                       "Kuinka paljon energiaa vapautuu, kun 150 kg 100 °C:n vesihöyryä tiivistyy? L_V = 2260 kJ/kg."),
            given: ["m = 150 kg", "L_V = 2 260 000 J/kg"],
            steps: [{ tex: "Q_V = m L_V = 150 kg · 2 260 000 J/kg = 339 MJ" }],
            result: T("Q_V = 339 MJ released", "Q_V = 339 MJ vapautuu") },
          { id: "t6-lat-ex2", type: "example", title: T("Melting the ice of a lake", "Järven jään sulattaminen"),
            problem: T("How much energy is needed to melt the ice of a lake at 0.0 °C? The lake area is 25 km², the ice is 0.65 m thick, ρ = 920 kg/m³. What average power melts it in three weeks?",
                       "Kuinka paljon energiaa tarvitaan sulattamaan järven jää 0,0 °C:ssa? Järven pinta-ala on 25 km², jään paksuus 0,65 m ja tiheys 920 kg/m³. Mikä keskiteho sulattaa jään kolmessa viikossa?"),
            given: ["ρ = 920 kg/m³", "A = 25 km² = 25·10⁶ m²", "d = 0.65 m", "L_F = 333 kJ/kg"],
            steps: [
              { tex: "m = ρ V = 920 · 25·10^6 · 0.65 kg ≈ 15·10^9 kg" },
              { tex: "Q = m L_F = 15·10^9 kg · 333·10^3 J/kg ≈ 5.0·10^{15} J" },
              { tex: "P = {Q}/{t} = {5.0·10^{15} J}/{3·7·24·60^2 s} ≈ 2.7·10^9 W" }],
            result: T("Q ≈ 5.0·10¹⁵ J, P ≈ 2.7 GW (the output of several large power plants)",
                      "Q ≈ 5,0·10¹⁵ J, P ≈ 2,7 GW (usean suuren voimalaitoksen teho)") },
          { id: "t6-lat-lake", type: "interactive", widget: "readout", title: T("Lake ice", "Järven jää"),
            caption: T("Change the lake, the ice thickness and the melting time. The energy needed does not depend on the time; the power does.",
                       "Muuta järveä, jään paksuutta ja sulamisaikaa. Tarvittava energia ei riipu ajasta, mutta teho riippuu."),
            config: { params: [
              { id: "A", tex: "A", min: 1, max: 100, step: 1, value: 25, unit: "km²" },
              { id: "d", tex: "d", min: 0.1, max: 1.5, step: 0.05, value: 0.65, unit: "m" },
              { id: "w", tex: "t", min: 1, max: 12, step: 1, value: 3, unit: "weeks" }],
              outputs: function (v) {
                var m = 920 * v.A * 1e6 * v.d, Q = m * 333e3;
                return [{ tex: "m = ρ A d", value: m, unit: "kg" }, { tex: "Q = m L_F", value: Q, unit: "J" }, { tex: "P = Q/t", value: Q / (v.w * 7 * 86400), unit: "W" }];
              } } },
          { id: "t6-lat-q2", type: "question", q: "t6-q12" },
          { id: "t6-lat-q3", type: "question", q: "t6-q13" },
          { id: "t6-lat-q4", type: "question", q: "t6-q14" },
          { id: "t6-lat-q5", type: "question", q: "t6-q15" },
          { id: "t6-lat-q6", type: "question", q: "t6-q16" }
        ]
      }
    ],
    questions: [
      // ---------------- practice ----------------
      { id: "t6-q1", mode: "practice", type: "mc", difficulty: 1,
        prompt: T("Which statement describes heat correctly?", "Mikä väite kuvaa lämpöä oikein?"),
        options: [
          { id: "a", html: T("Energy transferred between objects because of a temperature difference", "Kappaleiden välillä lämpötilaeron vuoksi siirtyvä energia") },
          { id: "b", html: T("The temperature of an object", "Kappaleen lämpötila") },
          { id: "c", html: T("The amount of heat stored in an object at rest", "Lepäävään kappaleeseen varastoitunut lämpö") },
          { id: "d", html: T("A substance that flows from hot to cold", "Aine, joka virtaa kuumasta kylmään") }],
        hints: [T("Think of Joule: work and heat are both forms of energy transfer.", "Ajattele Joulea: työ ja lämpö ovat molemmat energian siirtymistapoja.")] },
      { id: "t6-q2", mode: "practice", type: "numeric", difficulty: 1, tol: 0.02,
        prompt: T("How many joules is 2.5 kcal? Use 1 cal = 4.1868 J.", "Montako joulea on 2,5 kcal? Käytä yhtälöä 1 cal = 4,1868 J."),
        fields: [{ id: "Q", tex: "Q", unit: "J" }],
        hints: [T("1 kcal = 1000 cal.", "1 kcal = 1000 cal."), T("Multiply the calories by 4.1868.", "Kerro kalorit luvulla 4,1868.")] },
      { id: "t6-q3", mode: "practice", type: "numeric", difficulty: 2, tol: 0.02,
        prompt: T("How much energy, in kWh, does it take to heat 150 L of water from 10 °C to 60 °C? Take 1 L = 1 kg and c = 4186 J/(kg·K).",
                  "Kuinka paljon energiaa kilowattitunteina tarvitaan 150 L:n veden lämmittämiseen 10 °C:sta 60 °C:seen? Käytä 1 L = 1 kg ja c = 4186 J/(kg·K)."),
        fields: [{ id: "E", tex: "E", unit: "kWh" }],
        hints: [T("First Q = c·m·ΔT in joules.", "Laske ensin Q = c·m·ΔT joulina."), T("1 kWh = 3.6 MJ.", "1 kWh = 3,6 MJ.")] },
      { id: "t6-q4", mode: "practice", type: "mc", difficulty: 1,
        prompt: T("Equal masses of water and copper receive the same heat. Which warms up more, and why?", "Yhtä suuret vesi- ja kuparimassat saavat saman lämmön. Kumpi lämpenee enemmän ja miksi?"),
        options: [
          { id: "a", html: T("Copper: its specific heat is much smaller", "Kupari: sen ominais\u00ADlämpö\u00ADkapasiteetti on paljon pienempi") },
          { id: "b", html: T("Water: its specific heat is much smaller", "Vesi: sen ominais\u00ADlämpö\u00ADkapasiteetti on paljon pienempi") },
          { id: "c", html: T("Both the same: same mass, same heat", "Yhtä paljon: sama massa, sama lämpö") },
          { id: "d", html: T("Copper: its density is larger", "Kupari: sen tiheys on suurempi") }],
        hints: [T("ΔT = Q/(c·m). Compare the c values in the table.", "ΔT = Q/(c·m). Vertaa taulukon c-arvoja.")] },
      { id: "t6-q5", mode: "practice", type: "numeric", difficulty: 1, tol: 0.02,
        prompt: T("Heating a 2.0 kg aluminium block from 20 °C to 100 °C. How much heat does it need? (c = 900 J/(kg·K))",
                  "Alumiinikappale, jonka massa on 2,0 kg, lämmitetään 20 °C:sta 100 °C:seen. Kuinka paljon lämpöä se vaatii? (c = 900 J/(kg·K))"),
        fields: [{ id: "Q", tex: "Q", unit: "J" }],
        hints: [T("Q = c·m·ΔT with ΔT = final − initial.", "Q = c·m·ΔT, missä ΔT = loppu − alku.")] },
      { id: "t6-q6", mode: "practice", type: "slider", difficulty: 2, tol: 0.05,
        prompt: T("The 450 L water heater must raise the water from 4 °C to 75 °C in 8.0 h. Set the heater power P so that the heating time shown is 8 h.",
                  "450 litran vedenlämmittimen on nostettava veden lämpötila 4 °C:sta 75 °C:seen 8,0 tunnissa. Säädä lämmittimen teho P niin, että näytetty lämmitysaika on 8 h."),
        widget: { name: "heating", config: { mode: "heater", fixed: ["V", "t1", "t2"], ranges: { P: { min: 1000, max: 12000, step: 50 } },
          answer: function (p) { return { v: p.P }; } } },
        hints: [T("Heating time = Q / P.", "Lämmitysaika = Q / P."), T("Watch the time readout while you move the P slider.", "Seuraa aikalukemaa P-liukusäätimen liikuttamisen aikana.")] },
      { id: "t6-q7", mode: "practice", type: "numeric", difficulty: 2, tol: 0.02,
        prompt: T("A 0.20 kg copper piece (c = 390 J/(kg·K)) at 100 °C is dropped into 0.50 kg of water at 20 °C in an ideal calorimeter whose cup has negligible heat capacity. What is the final temperature?",
                  "0,20 kg:n kuparikappale (c = 390 J/(kg·K)) 100 °C:ssa pudotetaan 0,50 kg:aan 20 °C:n vettä ideaalisessa kalorimetrissä, jonka kupin lämpökapasiteetti on mitätön. Mikä on loppulämpötila?"),
        fields: [{ id: "t", tex: "t_l", unit: "°C" }],
        hints: [T("Heat lost by copper = heat gained by water.", "Kuparin luovuttama lämpö = veden vastaanottama lämpö."),
                T("m₁c₁(100 − t) = m₂c₂(t − 20); solve for t.", "m₁c₁(100 − t) = m₂c₂(t − 20); ratkaise t.")] },
      { id: "t6-q8", mode: "practice", type: "mc", difficulty: 1,
        prompt: T("Why is the cup of a calorimeter insulated and fitted with a lid?", "Miksi kalorimetrin kuppi eristetään ja varustetaan kannella?"),
        options: [
          { id: "a", html: T("So that almost no heat is exchanged with the surroundings, and heat lost = heat gained holds", "Jotta lämpöä ei vaihdu juuri lainkaan ympäristön kanssa ja luovutettu lämpö = vastaanotettu lämpö pätee") },
          { id: "b", html: T("So that the water can reach a higher temperature than the sample", "Jotta vesi voi saavuttaa näytettä korkeamman lämpötilan") },
          { id: "c", html: T("To keep the specific heat of water constant", "Jotta veden ominais\u00ADlämpö\u00ADkapasiteetti pysyy vakiona") },
          { id: "d", html: T("To make the final temperature equal to zero", "Jotta loppulämpötila olisi nolla") }],
        hints: [T("Think about what the equation assumes about losses.", "Mieti, mitä yhtälö olettaa häviöistä.")] },
      { id: "t6-q9", mode: "practice", type: "numeric", difficulty: 2, tol: 0.02,
        prompt: T("A room of 60 m³ must have all its air warmed by 25 K in one hour (constant pressure). For air c_V = 714 J/(kg·K), γ = 1.40 and ρ = 1.29 kg/m³. What average power is needed?",
                  "Huoneen, jonka tilavuus on 60 m³, koko ilma on lämmitettävä 25 K tunnissa (vakiopaine). Ilmalle c_V = 714 J/(kg·K), γ = 1,40 ja ρ = 1,29 kg/m³. Mikä keskimääräinen teho tarvitaan?"),
        fields: [{ id: "P", tex: "P_p", unit: "W" }],
        hints: [T("Constant pressure: use c_p = γ·c_V.", "Vakiopaine: käytä c_p = γ·c_V."), T("m = ρ·V and t = 3600 s.", "m = ρ·V ja t = 3600 s.")] },
      { id: "t6-q10", mode: "practice", type: "mc", difficulty: 2,
        prompt: T("A gas is heated by the same ΔT, once in a rigid closed vessel and once in a cylinder with a free piston. Which needs more heat?",
                  "Kaasua lämmitetään saman ΔT:n verran kerran jäykässä suljetussa astiassa ja kerran sylinterissä, jossa on vapaasti liikkuva mäntä. Kumpi vaatii enemmän lämpöä?"),
        options: [
          { id: "a", html: T("The free piston (constant pressure), since c_p > c_V", "Vapaa mäntä (vakiopaine), koska c_p > c_V") },
          { id: "b", html: T("The rigid vessel (constant volume), since c_V > c_p", "Jäykkä astia (vakiotilavuus), koska c_V > c_p") },
          { id: "c", html: T("Equal, since γ = 1 for gases", "Yhtä paljon, koska γ = 1 kaasuilla") },
          { id: "d", html: T("Equal, since the mass is the same", "Yhtä paljon, koska massa on sama") }],
        hints: [T("In the cylinder the gas also expands and does work on the piston.", "Sylinterissä kaasu myös laajenee ja tekee työtä mäntään.")] },
      { id: "t6-q11", mode: "practice", type: "multi", difficulty: 1,
        prompt: T("Which phase changes release energy to the surroundings?", "Mitkä olomuodon muutokset vapauttavat energiaa ympäristöön?"),
        options: [
          { id: "a", html: T("condensation", "tiivistyminen") }, { id: "b", html: T("melting", "sulaminen") },
          { id: "c", html: T("freezing", "jähmettyminen") }, { id: "d", html: T("vaporization", "höyrystyminen") },
          { id: "e", html: T("deposition (gas to solid)", "härmistyminen (kaasusta kiinteäksi)") }],
        hints: [T("Check the diagram: energy is released going left.", "Katso kaaviota: energiaa vapautuu vasemmalle mentäessä.")] },
      { id: "t6-q12", mode: "practice", type: "mc", difficulty: 1,
        prompt: T("Ice at 0 °C is heated and starts to melt. What happens to its temperature while it melts?", "Jäätä 0 °C:ssa lämmitetään ja se alkaa sulaa. Mitä sen lämpötilalle tapahtuu sulamisen aikana?"),
        options: [
          { id: "a", html: T("It stays at 0 °C until all ice has melted", "Se pysyy 0 °C:ssa, kunnes kaikki jää on sulanut") },
          { id: "b", html: T("It rises steadily", "Se nousee tasaisesti") },
          { id: "c", html: T("It falls", "Se laskee") },
          { id: "d", html: T("It rises, then falls", "Se nousee ja laskee sitten") }],
        hints: [T("Look at the flat steps of the heating curve.", "Katso lämmityskäyrän vaakasuoria osia.")] },
      { id: "t6-q13", mode: "practice", type: "numeric", difficulty: 1, tol: 0.02,
        prompt: T("How much heat is needed to melt 2.5 kg of ice at 0 °C? (L_F = 333 kJ/kg)", "Kuinka paljon lämpöä tarvitaan sulattamaan 2,5 kg jäätä 0 °C:ssa? (L_F = 333 kJ/kg)"),
        fields: [{ id: "Q", tex: "Q_F", unit: "J" }],
        hints: [T("Q = m·L_F.", "Q = m·L_F.")] },
      { id: "t6-q14", mode: "practice", type: "numeric", difficulty: 1, tol: 0.02,
        prompt: T("A steam heating system condenses 40 kg of steam at 100 °C into water at 100 °C. How much heat is released? (L_V = 2260 kJ/kg)",
                  "Höyrylämmitysjärjestelmässä tiivistyy 40 kg 100 °C:n höyryä 100 °C:n vedeksi. Kuinka paljon lämpöä vapautuu? (L_V = 2260 kJ/kg)"),
        fields: [{ id: "Q", tex: "Q_V", unit: "J" }],
        hints: [T("Q = m·L_V.", "Q = m·L_V.")] },
      { id: "t6-q15", mode: "practice", type: "order", difficulty: 2,
        prompt: T("Order the energies needed for 1 kg of water, from smallest to largest.", "Järjestä 1 kg:n veden vaatimat energiat pienimmästä suurimpaan."),
        items: [
          { id: "d", html: T("boiling the water at 100 °C", "veden höyrystäminen 100 °C:ssa") },
          { id: "b", html: T("melting the ice at 0 °C", "jään sulattaminen 0 °C:ssa") },
          { id: "a", html: T("warming ice from −40 °C to 0 °C", "jään lämmitys −40 °C:sta 0 °C:seen") },
          { id: "c", html: T("warming water from 0 °C to 100 °C", "veden lämmitys 0 °C:sta 100 °C:seen") }],
        hints: [T("Use c·ΔT for the warming steps and L for the phase changes. Compare in kJ.", "Käytä lämmitysosissa c·ΔT ja olomuutoksissa L. Vertaa kilojouleina.")] },
      { id: "t6-q16", mode: "practice", type: "slider", difficulty: 2, tol: 0.03,
        prompt: T("Heat 1 kg of ice that starts at −40 °C. Set Q to the smallest heat at which all of it is liquid water at 100 °C and is just about to boil.",
                  "Lämmitä 1 kg jäätä, jonka alkulämpötila on −40 °C. Säädä Q pienimmäksi lämmöksi, jolla kaikki on nestemäistä vettä 100 °C:ssa ja kiehuminen on juuri alkamassa."),
        widget: { name: "heating", config: { mode: "curve", fixed: ["P"], answer: function (p) { return { v: p.Q }; } } },
        hints: [T("The temperature first reaches 100 °C at the end of the second sloped part of the curve.", "Lämpötila saavuttaa 100 °C:n ensimmäisen kerran käyrän toisen kaltevan osan lopussa."),
                T("Add three parts: warm ice, melt, warm water.", "Laske yhteen kolme osaa: jään lämmitys, sulaminen, veden lämmitys.")] },

      // ---------------- topic test ----------------
      { id: "t6-g1", mode: "graded", type: "numeric", difficulty: 2, tol: 0.03, points: 2,
        prompt: T("In a Joule experiment a 10 kg weight falls 2.0 m, 100 times, and all its energy ends up as heat in 5.0 kg of water (c = 4186 J/(kg·K), g = 9.81 m/s²). By how many kelvin does the water warm up?",
                  "Joulen kokeessa 10 kg:n paino putoaa 2,0 m 100 kertaa ja kaikki sen energia päätyy lämmöksi 5,0 kg:aan vettä (c = 4186 J/(kg·K), g = 9,81 m/s²). Kuinka monta kelviniä vesi lämpenee?"),
        fields: [{ id: "dT", tex: "ΔT", unit: "K" }],
        hints: [T("Work = N·m·g·h.", "Työ = N·m·g·h."), T("All the work becomes Q = c·M·ΔT.", "Kaikki työ muuttuu lämmöksi Q = c·M·ΔT.")] },
      { id: "t6-g2", mode: "graded", type: "numeric", difficulty: 2, tol: 0.03, points: 2,
        prompt: T("The ice of a lake at 0 °C is 0.40 m thick over an area of 10 km², density 920 kg/m³ (L_F = 333 kJ/kg). How much energy melts it?",
                  "Järven jää 0 °C:ssa on 0,40 m paksua 10 km²:n alueella, tiheys 920 kg/m³ (L_F = 333 kJ/kg). Kuinka paljon energiaa sen sulattamiseen tarvitaan?"),
        fields: [{ id: "Q", tex: "Q", unit: "J" }],
        hints: [T("1 km² = 10⁶ m². First the mass m = ρ·A·d.", "1 km² = 10⁶ m². Laske ensin massa m = ρ·A·d.")] },
      { id: "t6-g3", mode: "graded", type: "numeric", difficulty: 3, tol: 0.02, points: 2,
        prompt: T("How much heat takes 0.50 kg of ice at −10 °C to water at +20 °C? Use c_ice = 2100 J/(kg·K), c_water = 4186 J/(kg·K), L_F = 333 kJ/kg.",
                  "Kuinka paljon lämpöä tarvitaan, kun 0,50 kg jäätä −10 °C:ssa lämmitetään vedeksi +20 °C:seen? Käytä arvoja c_jää = 2100 J/(kg·K), c_vesi = 4186 J/(kg·K), L_F = 333 kJ/kg."),
        fields: [{ id: "Q", tex: "Q", unit: "J" }],
        hints: [T("Three steps: warm the ice to 0 °C, melt it, warm the water.", "Kolme vaihetta: jään lämmitys 0 °C:seen, sulatus, veden lämmitys."), T("Add the three heats.", "Laske kolme lämpömäärää yhteen.")] },
      { id: "t6-g4", mode: "graded", type: "numeric", difficulty: 3, tol: 0.02, points: 2,
        prompt: T("A water heater warms 200 L of water from 10 °C to 60 °C in 5.0 h. Its efficiency is 90 %. What electrical power does it draw on average? (c = 4186 J/(kg·K), 1 L = 1 kg)",
                  "Vedenlämmitin lämmittää 200 L vettä 10 °C:sta 60 °C:seen 5,0 tunnissa. Sen hyötysuhde on 90 %. Mikä on sen keskimääräinen sähköteho? (c = 4186 J/(kg·K), 1 L = 1 kg)"),
        fields: [{ id: "P", tex: "P_{el}", unit: "W" }],
        hints: [T("Useful power = Q/t.", "Hyötyteho = Q/t."), T("Electrical power = useful power / efficiency.", "Sähköteho = hyötyteho / hyötysuhde.")] },
      { id: "t6-g5", mode: "graded", type: "numeric", difficulty: 2, tol: 0.02,
        prompt: T("0.30 kg of water at 80 °C is mixed with 0.50 kg of water at 20 °C in an ideal calorimeter. What is the final temperature?",
                  "0,30 kg 80 °C:n vettä sekoitetaan 0,50 kg:aan 20 °C:n vettä ideaalisessa kalorimetrissä. Mikä on loppulämpötila?"),
        fields: [{ id: "t", tex: "t_l", unit: "°C" }],
        hints: [T("The specific heat of both parts is the same and cancels.", "Molempien osien ominais\u00ADlämpö\u00ADkapasiteetti on sama ja supistuu pois.")] },
      { id: "t6-g6", mode: "graded", type: "mc", difficulty: 2,
        prompt: T("Which statement about the heating curve of water at 1 atm is correct?", "Mikä väite veden lämmityskäyrästä 1 atm:n paineessa on oikea?"),
        options: [
          { id: "a", html: T("Boiling takes about seven times more energy than melting the same mass of ice", "Kiehuminen vaatii noin seitsemän kertaa enemmän energiaa kuin saman jäämassan sulaminen") },
          { id: "b", html: T("Melting takes more energy than boiling", "Sulaminen vaatii enemmän energiaa kuin kiehuminen") },
          { id: "c", html: T("The temperature rises during boiling", "Lämpötila nousee kiehumisen aikana") },
          { id: "d", html: T("Ice and steam have the same specific heat", "Jäällä ja höyryllä on sama ominais\u00ADlämpö\u00ADkapasiteetti") }],
        hints: [T("Compare L_V = 2260 kJ/kg with L_F = 333 kJ/kg.", "Vertaa arvoja L_V = 2260 kJ/kg ja L_F = 333 kJ/kg.")] }
    ]
  });
})();

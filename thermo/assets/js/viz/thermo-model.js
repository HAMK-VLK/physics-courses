/* TDC.thermo: the physics behind the thermo widgets (pure functions, no DOM; tested by tools/test-thermo.mjs).
 * SI units everywhere (Pa, m, m³, kg, K, J, W) except where a name says otherwise (satVapour: °C, g/m³, kPa).
 * Constants follow the course slides: g = 9.81 m/s², R = 8.314 J/(mol·K). */
(function (root) {
  'use strict';
  var G = 9.81, R = 8.314, SIGMA = 5.670374e-8, WIEN = 2.898e-3;

  // Saturated vapour density (g/m³) and pressure (kPa) of water in air, −30…100 °C (course table, Insinööri (AMK) Fysiikka 1).
  var SAT = [[-30, 0.33, 0.037], [-25, 0.55, 0.063], [-20, 0.88, 0.103], [-15, 1.39, 0.165], [-10, 2.36, 0.287],
    [-9, 2.54, 0.310], [-8, 2.74, 0.335], [-7, 2.95, 0.362], [-6, 3.17, 0.391], [-5, 3.41, 0.422], [-4, 3.66, 0.455],
    [-3, 3.93, 0.490], [-2, 4.21, 0.527], [-1, 4.52, 0.568], [0, 4.85, 0.611], [1, 5.19, 0.657], [2, 5.56, 0.706],
    [3, 5.95, 0.758], [4, 6.36, 0.813], [5, 6.79, 0.872], [6, 7.26, 0.935], [7, 7.74, 1.00], [8, 8.25, 1.07],
    [9, 8.83, 1.15], [10, 9.41, 1.23], [11, 9.99, 1.31], [12, 10.6, 1.40], [13, 11.4, 1.50], [14, 12.1, 1.60],
    [15, 12.8, 1.70], [16, 13.6, 1.82], [17, 14.5, 1.94], [18, 15.3, 2.06], [19, 16.3, 2.20], [20, 17.3, 2.34],
    [21, 18.3, 2.49], [22, 19.4, 2.64], [23, 20.6, 2.81], [24, 21.7, 2.98], [25, 23.0, 3.17], [26, 24.3, 3.36],
    [27, 25.7, 3.56], [28, 27.2, 3.78], [29, 28.8, 4.01], [30, 30.3, 4.24], [35, 39.5, 5.62], [40, 51.1, 7.38],
    [45, 65.3, 9.58], [50, 82.5, 12.3], [55, 104, 15.7], [60, 129, 19.9], [65, 160, 25.0], [70, 197, 31.2],
    [75, 238, 38.3], [80, 290, 47.3], [85, 350, 57.8], [90, 418, 70.1], [95, 497, 84.5], [100, 588.4, 101.3]];

  /** Linear interpolation in SAT: column x -> column y, clamped to the table; exact on table rows. */
  function lookup(x, cx, cy) {
    var n = SAT.length;
    if (!(x > SAT[0][cx])) return SAT[0][cy];
    if (x >= SAT[n - 1][cx]) return SAT[n - 1][cy];
    for (var i = 0; i < n - 1; i++) if (x < SAT[i + 1][cx]) {
      var a = SAT[i], b = SAT[i + 1];
      return a[cy] + (b[cy] - a[cy]) * (x - a[cx]) / (b[cx] - a[cx]);
    }
  }

  // Water from ice to steam (per kg): specific heats J/(kg·K) and latent heats J/kg, as in the slides.
  var C_ICE = 2100, C_WATER = 4186, C_STEAM = 2010, L_F = 333e3, L_V = 2260e3, T_START = -40;

  var T = {
    G: G, R: R, SIGMA: SIGMA, SAT: SAT,
    // ---- fluid statics
    hydro: function (p0, rho, g, h) { return p0 + rho * g * h; },
    buoyancy: function (rhoFluid, V, g) { return rhoFluid * (g || G) * V; },
    /** Barometric formula p(h) = p0·e^(−ρ0·g·h/p0), slide values p0 = 101.325 kPa, ρ0 = 1.29 kg/m³. */
    atmosphere: function (h, p0, rho0) { p0 = p0 || 101325; return p0 * Math.exp(-(rho0 || 1.29) * G * h / p0); },
    /** Hydraulic press: same pressure on both pistons, F2 = F1·A2/A1. */
    press: function (F1, A1, A2) { return F1 * A2 / A1; },
    /** Submarine: hull volume hullV (displaced when submerged), dry mass, ballast tank volume ballastV filled to ballastFrac. */
    subState: function (s) {
      var rho = s.rhoWater || 1000, g = s.g || G, mass = s.hullMass + s.ballastFrac * s.ballastV * rho;
      var Fb = rho * s.hullV * g, W = mass * g, net = Fb - W;
      return { mass: mass, Fb: Fb, W: W, net: net, verdict: Math.abs(net) <= 0.005 * Fb ? 'hover' : net > 0 ? 'rise' : 'sink',
        floatFrac: Math.min(1, mass / (rho * s.hullV)) };   // part of the hull under water when it floats at the surface
    },
    // ---- fluid dynamics
    continuity: function (A1, v1, A2) { return A2 > 0 ? A1 * v1 / A2 : Infinity; },
    bernoulli: function (s) { var g = s.g || G; return s.p1 + 0.5 * s.rho * (s.v1 * s.v1 - s.v2 * s.v2) + s.rho * g * ((s.h1 || 0) - (s.h2 || 0)); },
    reynolds: function (rho, v, D, eta) { return rho * v * D / eta; },
    venturiV1: function (dp, rho, A1, A2) { return Math.sqrt(2 * dp / (rho * ((A1 / A2) * (A1 / A2) - 1))); },
    torricelli: function (h, g) { return Math.sqrt(2 * (g || G) * Math.max(0, h)); },
    /** Pressure loss of a straight pipe (Fanning form of the slides): Δp = 8f·(L/D)·½ρv². */
    frictionLoss: function (f8, L, D, rho, v) { return f8 * L / D * 0.5 * rho * v * v; },
    // ---- gases
    /** pV = nRT solved for 'p', 'V', 'n' or 'T'; NaN when T ≤ 0 K or the target is unknown. */
    idealGas: function (s, solveFor) {
      if (solveFor !== 'T' && !(s.T > 0)) return NaN;
      switch (solveFor) {
        case 'p': return s.n * R * s.T / s.V;
        case 'V': return s.n * R * s.T / s.p;
        case 'n': return s.p * s.V / (R * s.T);
        case 'T': return s.p * s.V / (s.n * R);
      }
      return NaN;
    },
    vrms: function (Tk, M) { return Math.sqrt(3 * R * Tk / M); },
    /** Maxwell speed distribution f(v) (1/(m/s)), molar mass M in kg/mol. */
    maxwell: function (v, Tk, M) { var a = M / (2 * R * Tk); return 4 * Math.PI * Math.pow(a / Math.PI, 1.5) * v * v * Math.exp(-a * v * v); },
    // ---- vapour and humidity
    satVapour: function (tC) { return { rho: lookup(tC, 0, 1), p: lookup(tC, 0, 2) }; },
    dewPoint: function (rhoV) { return lookup(rhoV, 1, 0); },
    // ---- heat
    /** Temperature (°C) of m kg of water starting as ice at −40 °C after heat Q (J): warm, melt, warm, boil, warm. */
    heatingCurve: function (m, Q) {
      var steps = [[C_ICE * m, 0 - T_START], [L_F * m, 0], [C_WATER * m, 100], [L_V * m, 0]], t = T_START;
      for (var i = 0; i < steps.length; i++) {
        var c = steps[i][0], dT = steps[i][1], need = dT ? c * dT : c;
        if (Q <= need) return dT ? t + Q / c : t;
        Q -= need; t += dT;
      }
      return t + Q / (C_STEAM * m);
    },
    /** Final temperature of bodies {m, c, T} that exchange heat without phase changes. */
    mix: function (list) {
      var s = 0, mc = 0;
      list.forEach(function (b) { s += b.m * b.c * b.T; mc += b.m * b.c; });
      return s / mc;
    },
    linExp: function (alpha, l0, dT) { return alpha * l0 * dT; },
    // ---- heat transfer
    conduction: function (lambda, A, dT, l) { return lambda * A * dT / l; },
    /** Multilayer wall: layers [{d, lambda}], surface coefficients h_in/h_out, air temperatures Tin/Tout.
     *  Returns R (m²·K/W), U (W/(m²·K)), q (W/m²) and temps: air in, each interface, air out. */
    wall: function (layers, hIn, hOut, Tin, Tout) {
      var res = [1 / hIn].concat(layers.map(function (l) { return l.d / l.lambda; }), [1 / hOut]);
      var Rt = res.reduce(function (a, b) { return a + b; }, 0), U = 1 / Rt, q = U * (Tin - Tout), temps = [Tin], t = Tin;
      res.forEach(function (r, i) { t -= q * r; temps.push(i === res.length - 1 ? Tout : t); });
      return { R: Rt, U: U, q: q, temps: temps };
    },
    radiation: function (eps, A, T1, T2) { return eps * SIGMA * A * (Math.pow(T1, 4) - Math.pow(T2 || 0, 4)); },
    wien: function (Tk) { return WIEN / Tk; }
  };
  (root.TDC = root.TDC || {}).thermo = T;
})(typeof window !== 'undefined' ? window : this);

// impact_effects.ts
// Functions extracted from study at https://impact.ese.ic.ac.uk/ImpactEarth/ImpactEffects/effects.pdf


export type Damage_Inputs = {
  L0: number; // m
  rho_i: number; // kg/m^3
  v0: number; // m/s
  theta_deg: number; // degrees from horizontal
  is_water?: boolean; // true for water target
  K?: number; // luminous efficiency
  Cd?: number; // drag coefficient
  rho0?: number; // atmosphere surface density for breakup (kg/m^3)
  H?: number; // scale height (m)
};

export type Damage_Results = {
  E_J: number;
  E_Mt: number;
  Tre_years: number;
  m_kg: number;
  zb_breakup: number; // m
  airburst: boolean;
  v_impact_for_crater: number;
  Rf_m: number | null;
  r_clothing_m: number;
  r_2nd_burn_m: number;
  r_3rd_burn_m: number;
  Dtc_m: number | null;
  dtc_m: number | null;
  Dfr_m: number | null;
  dfr_m: number | null;
  Vtc_km3: number | null;
  Vtc_over_Ve: number | null;
  earth_effect: 'destroyed' | 'strongly_disturbed' | 'negligible_disturbed';
  M: number | null;
  radius_M_ge_7_5_m: number | null;
  airblast_radius_building_collapse_m: number | null; // p=42600 Pa
  airblast_radius_glass_shatter_m: number | null; // p=6900 Pa
};

// Constants
const MT_TO_J = 4.184e15;
const G = 9.81;
const VE_KM3 = 1.083e12; // Earth's volume km^3 for comparison
const DEFAULTS = {
  K: 3e-3,
  Cd: 2.0,
  rho0: 1.0,
  H: 8000,
  fp: 7,
  rho_air_for_wind: 1.2,
  burn_horizon_m: 1_500_000, // 1500 km cap
};

// energy and mass
export function energyFromDiameter(L0: number, rho_i: number, v0: number) {
  const m = rho_i * (Math.PI / 6) * Math.pow(L0, 3);
  const E_J = 0.5 * m * v0 * v0;
  const E_Mt = E_J / MT_TO_J;
  return { m, E_J, E_Mt };
}

// intact surface velocity from drag eq (eq.8* simplified)
export function intactSurfaceVelocity(v0: number, L0: number, rho_i: number, theta_rad: number, Cd = DEFAULTS.Cd, rho0 = DEFAULTS.rho0, H = DEFAULTS.H) {
  // v_surface = v0 * exp(-3*Cd*rho0*FH/(4*rho_i*L0*sin(theta)))
  const sinT = Math.sin(theta_rad);
  const denom = 4 * rho_i * L0 * sinT;
  const factor = (3 * Cd * rho0 * H) / denom;
  const v_surface = v0 * Math.exp(-factor);
  return v_surface;
}

function strengthFromDensity(rho_i: number): number {
  return Math.pow(10, 2.107 + 0.0624 * rho_i);
}

// Atmospheric density at altitude z
function atmosphericDensity(z: number, rho0 = DEFAULTS.rho0, H = DEFAULTS.H): number {
  return rho0 * Math.exp(-z / H);
}


// breakup If and altitude z* (analytic approx)
export function breakupIfAndZstar(Lo: number, rho_i: number, vo: number, theta: number, CD = DEFAULTS.Cd, H = DEFAULTS.H, rho_0 = DEFAULTS.rho0) {
  // Calculate the yield strength Y_i using the empirical formula.
  const Yi = Math.pow(10, 2.107 + 0.0624 * Math.sqrt(rho_i));
  
  // Calculate the breakup parameter I_f.
  const If = (CD * H * Yi) / (rho_i * Lo * Math.pow(vo, 2) * Math.sin(theta));
  
  // Determine if breakup occurs.
  const breakup = If < 1;
  
  let z_star = 0;
  // If breakup occurs, calculate the breakup altitude z_star.
  if (breakup) {
    z_star = -H * (Math.log(Yi / (rho_0 * Math.pow(vo, 2))) + 1.308 - 0.314 * If - 1.303 * Math.sqrt(1 - If));
  }
  
  return { If, z_star, breakup };
}

export function pancakeAirburstAltitude(Lo: number, rho_i: number, theta: number, z_star: number, H = DEFAULTS.H, fp = DEFAULTS.fp, CD = DEFAULTS.Cd) {
  // The document uses rho(z*) which is the atmospheric density at the breakup altitude.
  // We need to use the provided atmosphericDensity function to get this value.
  const rho_z_star = atmosphericDensity(z_star);
  
  // Calculate the dispersion length scale 'l'.
  const l = Lo * Math.sin(theta) * Math.sqrt(rho_i / (CD * rho_z_star));
  
  // Calculate the airburst altitude z_b using the rearranged equation.
  const zb = z_star - 2 * H * Math.log(1 + (l / (2 * H)) * Math.sqrt(Math.pow(fp, 2) - 1));
  
  return zb;
}

// fireball radius
export function fireballRadius(E_J: number) {
  // Rf = 0.002 * E^(1/3) with E in joules
  return 0.002 * Math.pow(E_J, 1 / 3);
}

// 7) burn radii (clothing, 2nd, 3rd) with horizon cap
export function burnRadii(E_Mt: number, E_J: number, K = DEFAULTS.K) {
  const thresholds_1Mt_MJ = {
    clothing: 1.0,
    second: 0.25,
    third: 0.42,
  } as const;

  const results: { clothing: number; second: number; third: number } = { clothing: 0, second: 0, third: 0 };
  for (const key of Object.keys(thresholds_1Mt_MJ) as (keyof typeof thresholds_1Mt_MJ)[]) {
    const thr_MJ = thresholds_1Mt_MJ[key];
    const thr_J = thr_MJ * 1e6;
    const thr_scaled = thr_J * Math.pow(Math.max(E_Mt, 1e-12), 1 / 6);
    const r = Math.sqrt((K * E_J) / (2 * Math.PI * thr_scaled));
    results[key] = Math.min(r, DEFAULTS.burn_horizon_m);
  }
  return results;
}

// 8) crater scaling
export function transientCrater(L0: number, rho_i: number, v_i: number, theta_rad: number, is_water=false) {
  const rho_t = is_water ? 2700 : 2500;
  const coeff = is_water ? 1.365 : 1.161;
  const term = Math.pow(rho_i / rho_t, 1 / 3);
  const Dtc = coeff * term * Math.pow(L0, 0.78) * Math.pow(v_i, 0.44) * Math.pow(G, -0.22) * Math.pow(Math.sin(theta_rad), 1 / 3);
  const dtc = Dtc / (2 * Math.sqrt(2));
  // final diameter
  let Dfr: number;
  let dfr: number;
  if (Dtc < 3200) {
    Dfr = 1.25 * Dtc;
    dfr = dtc;
  } else {
    Dfr = 1.17 * Math.pow(Dtc, 1.13) / Math.pow(3200, 0.13);
    dfr = 1000*(0.294 * Math.pow(Dfr/1000, 0.301));
  }
  return { Dtc, dtc, Dfr, dfr };
}

// 9) transient crater volume and Earth effect
export function craterVolumeAndEffect(Dtc_m: number) {
  // Vtc = pi * Dtc^3 / (16*sqrt(2))  (m^3)
  const Vtc_m3 = Math.PI * Math.pow(Dtc_m, 3) / (16 * Math.sqrt(2));
  const Vtc_km3 = Vtc_m3 / 1e9;
  const ratio = Vtc_km3 / VE_KM3;
  let effect: Damage_Results['earth_effect'] = 'negligible_disturbed';
  if (ratio > 0.5) effect = 'destroyed';
  else if (ratio >= 0.1) effect = 'strongly_disturbed';
  return { Vtc_km3, ratio, effect };
}

// 10) seismic magnitude and radius for Meff >= 7.5
export function seismicMagnitudeAndRadius(E_J: number, threshold = 7.5) {
  const M = 0.67 * Math.log10(E_J) - 5.87;
  // piecewise radii. solve each piece for r_km bounds
  // piece1 (<60): Meff = M - 0.0238*r => r = (M - threshold)/0.0238
  const r1 = (M - threshold) / 0.0238; // km
  if (r1 >= 0 && r1 <= 60) return { M, radius_km: r1, radius_m: r1 * 1000 };
  // piece2 (60..700): Meff = M - 0.0048*r -1.1644 => r = (M -1.1644 - threshold)/0.0048
  const r2 = (M - 1.1644 - threshold) / 0.0048;
  if (r2 >= 60 && r2 <= 700) return { M, radius_km: r2, radius_m: r2 * 1000 };
  // piece3 (>700): Meff = M -1.66*log10(r) -6.399 => solve for r
  // rearrange: log10(r) = (M -6.399 - threshold)/1.66
  const exp3 = Math.pow(10, (M - 6.399 - threshold) / 1.66);
  if (exp3 > 700) return { M, radius_km: exp3, radius_m: exp3 * 1000 };
  // none satisfied => no radius where Meff >= threshold
  return { M, radius_km: null, radius_m: null } as any;
}

// 11) airblast p(r) and wind using provided eqs
export function peakOverpressureAtR(r_m: number, E_Mt: number, zb_m: number) {
  if (E_Mt <= 0) throw new Error('E_Mt must be > 0');
  const E_kt = E_Mt * 1000.0;
  const r1 = r_m / Math.pow(E_kt, 1 / 3);
  const zb1 = zb_m / Math.pow(E_kt, 1 / 3);
  // constants
  const p_x = 75000.0;
  const r_x = 289.0 + 0.65 * zb1;
  const p0 = 3.14e11 * Math.pow(zb1, -2.6);
  const beta = 34.87 * Math.pow(zb1, -1.73);
  const rm1 = 550.0 * Math.pow(zb1, 1.2);
  let p: number;
  if (r1 > rm1) {
    if (r1 <= 0) p = p_x;
    else {
      const frac = r_x / r1;
      p = (p_x * r_x) / (4.0 * r1) * (1.0 + 3.0 * Math.pow(frac, 1.3));
    }
  } else {
    p = p0 * Math.exp(-beta * r1);
  }
  const U = Math.sqrt(Math.max(0, 2 * p / DEFAULTS.rho_air_for_wind));
  return { p, U, r1, zb1, rm1 };
}

// bisection solver for radius where p(r)=targetP
function findRadiusForOverpressure(targetP: number, E_Mt: number, zb_m: number, r_max = 3e6) {
  // check monotonicity: p decreases with r; find bracket
  const eps = 1e-6;
  const p0 = peakOverpressureAtR(1.0, E_Mt, zb_m).p;
  if (p0 < targetP) return null; // even at 1 m p < target
  let lo = 1.0;
  let hi = r_max;
  let p_hi = peakOverpressureAtR(hi, E_Mt, zb_m).p;
  if (p_hi > targetP) return null; // not decaying enough within r_max
  for (let i = 0; i < 60; i++) {
    const mid = 0.5 * (lo + hi);
    const p_mid = peakOverpressureAtR(mid, E_Mt, zb_m).p;
    if (Math.abs(p_mid - targetP) / (targetP + eps) < 1e-4) return mid;
    if (p_mid > targetP) lo = mid; else hi = mid;
  }
  return 0.5 * (lo + hi);
}

export function computeImpactEffects(inputs: Damage_Inputs): Damage_Results {
  const { L0, rho_i, v0, theta_deg, is_water } = inputs;
  const K = inputs.K ?? DEFAULTS.K;
  const Cd = inputs.Cd ?? DEFAULTS.Cd;
  const rho0 = inputs.rho0 ?? DEFAULTS.rho0;
  const H = inputs.H ?? DEFAULTS.H;

  const theta_rad = (theta_deg * Math.PI) / 180.0;
  const { m, E_J, E_Mt } = energyFromDiameter(L0, rho_i, v0);
  const Tre_years = 109 * Math.pow(Math.max(E_Mt, 1e-12), 0.78);

  // intact surface velocity
  const v_surface_intact = intactSurfaceVelocity(v0, L0, rho_i, theta_rad, Cd, rho0, H);

  // breakup and airburst
  const { If, z_star, breakup } = breakupIfAndZstar(L0, rho_i, v0, theta_rad, Cd, H, rho0);
  const zb = breakup ? pancakeAirburstAltitude(L0, rho_i, z_star, theta_rad, z_star) : 0;
  const airburst = breakup && zb > 0;

  // choose impact velocity for cratering
  const v_i = v_surface_intact; // assume intact terminal value if not broken to ground

  // fireball and burns
  const burns = burnRadii(E_Mt, E_J, K);
  let Rf_m: number | null = null;
  if (!airburst) {
    Rf_m = fireballRadius(E_J);
  }

  // crater and seismic only if not airburst
  let Dtc: number | null = null, dtc: number | null = null, Dfr: number | null = null, dfr: number | null = null;
  let Vtc_km3: number | null = null, ratio: number | null = null;
  let effect: Damage_Results['earth_effect'] = 'negligible_disturbed';
  if (!airburst) {
    const crater = transientCrater(L0, rho_i, v_i, theta_rad, is_water);
    Dtc = crater.Dtc; dtc = crater.dtc; Dfr = crater.Dfr; dfr = crater.dfr;
    const vol = craterVolumeAndEffect(Dtc);
    Vtc_km3 = vol.Vtc_km3; ratio = vol.ratio; effect = vol.effect;
  }

  // seismic
  let M: number | null = null, radius_km: number | null = null, radius_m: number | null = null;
  if (!airburst) {
    const seismic = seismicMagnitudeAndRadius(E_J);
    M = seismic.M; radius_km = seismic.radius_km; radius_m = seismic.radius_m;
  }

  // airblast radii for thresholds
  const r_building = findRadiusForOverpressure(42600, E_Mt, zb);
  const r_glass = findRadiusForOverpressure(6900, E_Mt, zb);

  const results: Damage_Results = {
    E_J,
    E_Mt,
    Tre_years,
    m_kg: m,
    zb_breakup: zb,
    airburst,
    v_impact_for_crater: v_i,
    Rf_m,
    r_clothing_m: burns.clothing,
    r_2nd_burn_m: burns.second,
    r_3rd_burn_m: burns.third,
    Dtc_m: Dtc,
    dtc_m: dtc,
    Dfr_m: Dfr,
    dfr_m: dfr,
    Vtc_km3,
    Vtc_over_Ve: ratio,
    earth_effect: effect,
    M,
    radius_M_ge_7_5_m: radius_m,
    airblast_radius_building_collapse_m: r_building,
    airblast_radius_glass_shatter_m: r_glass,
  };

  return results;
}
// components/meteors/utils/waveRadii.ts
'use client';

import { Damage_Results } from '../DamageValues';

export interface WaveRadii {
  thermalMax_m: number;
  collapse_m: number;
  glass_m: number;
  shockReach_m: number;
  sonicReach_m: number;
}

export interface WaveRadiiOptions {
  /** collapse must exceed thermal by this factor */
  thermalVsCollapse?: number; // default 1.20
  /** glass must exceed thermal by this factor */
  thermalVsGlass?: number;    // default 1.35
  /** shock outer reach must exceed thermal by this factor */
  shockVsThermal?: number;    // default 1.25
  /** sonic outer reach must exceed thermal by this factor */
  sonicVsThermal?: number;    // default 1.45
  /** multiplier for shock vs collapse */
  shockFactor?: number;       // default 3.0
  /** multiplier for sonic vs glass */
  sonicFactor?: number;       // default 4.0
}

export function computeWaveRadii(
  damage: Damage_Results,
  opts: WaveRadiiOptions = {}
): WaveRadii {
  const {
    thermalVsCollapse = 1.20,
    thermalVsGlass = 1.35,
    shockVsThermal = 1.25,
    sonicVsThermal = 1.45,
    shockFactor = 3.0,
    sonicFactor = 4.0,
  } = opts;

  const thermal = [
    damage.r_2nd_burn_m,
    damage.r_3rd_burn_m,
    damage.Rf_m,
  ].filter((n): n is number => !!n && n > 0);

  const thermalMax_m = thermal.length ? Math.max(...thermal) : 0;

  const collapse_m = Math.max(
    damage.airblast_radius_building_collapse_m || 0,
    thermalMax_m * thermalVsCollapse
  );

  const glass_m = Math.max(
    damage.airblast_radius_glass_shatter_m || 0,
    thermalMax_m * thermalVsGlass
  );

  const shockReach_m = Math.max(
    (damage.airblast_radius_building_collapse_m || 0) * shockFactor,
    thermalMax_m * shockVsThermal
  );

  const sonicReach_m = Math.max(
    (damage.airblast_radius_glass_shatter_m || 0) * sonicFactor,
    thermalMax_m * sonicVsThermal
  );

  return { thermalMax_m, collapse_m, glass_m, shockReach_m, sonicReach_m };
}

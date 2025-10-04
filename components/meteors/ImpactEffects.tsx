import React from 'react';
import Link from 'next/link';
import styles from './ImpactEffects.module.css';

// Helper function to format distances
function formatDistance(meters: number | null): string {
  if (meters === null) return 'N/A';
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${meters.toFixed(0)} m`;
}

// Helper function to format energy
function formatEnergy(joules: number): string {
  const mt = joules / 4.184e15; // Convert to megatons
  if (mt >= 1000) return `${(mt / 1000).toFixed(1)} Gigatons`;
  if (mt >= 1) return `${mt.toFixed(1)} Megatons`;
  return `${(mt * 1000).toFixed(1)} Kilotons`;
}

function formatOverPressure(pascals: number | null): string {
    if (pascals === null) return 'N/A';
    if (pascals >= 100000) return `${(pascals / 100000).toFixed(2)} Bars`;
    if (pascals >= 1000) return `${(pascals / 1000).toFixed(2)} kPa`;
    return `${pascals.toFixed(1)} Pa`;
}

interface ImpactEffectsProps {
  effects: {
    E_J: number;
    E_Mt: number;
    Tre_years: number;
    m_kg: number;
    zb_breakup: number;
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
    airblast_radius_building_collapse_m: number | null;
    airblast_radius_glass_shatter_m: number | null;
    airblast_peak_overpressure: number | null;
  };
  impactLat: number;
  impactLon: number;
}

export default function ImpactEffects({ effects, impactLat, impactLon }: ImpactEffectsProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('overview');
  
  // Get descriptive text for earth effect
  const earthEffectText = {
    destroyed: 'Earth Forms a new asteroid belt orbiting the sun',
    strongly_disturbed: 'Earth\'s orbit is shifted substantially. Apocolypse is inevitable.',
    negligible_disturbed: 'Earth Loses Negligible Mass'
  }[effects.earth_effect];

  const earthEffectClass = {
    destroyed: styles.destroyed,
    strongly_disturbed: styles.disturbed,
    negligible_disturbed: styles.negligible
  }[effects.earth_effect];

  return (
    <div className={`${styles.effectsPanel} ${isCollapsed ? styles.collapsed : ''}`}>
      <button 
        className={styles.toggleButton} 
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? "Show Impact Details" : "Hide Impact Details"}
      >
        {isCollapsed ? '◀' : '▶'}
      </button>
      <div className={styles.tabList}>
        <button 
          className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'thermal' ? styles.active : ''}`}
          onClick={() => setActiveTab('thermal')}
        >
          Thermal
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'blast' ? styles.active : ''}`}
          onClick={() => setActiveTab('blast')}
        >
          Wave Blast
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'crater' ? styles.active : ''}`}
          onClick={() => setActiveTab('crater')}
        >
          Crater
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'seismic' ? styles.active : ''}`}
          onClick={() => setActiveTab('seismic')}
        >
          Seismic
        </button>
      </div>

      <div className={styles.scrollContent}>
        {activeTab === 'overview' && (
          <div className={styles.section}>
            <div className={styles.dataRow}>
              <span className={styles.label}>Location</span>
              <span className={styles.value}>{impactLat.toFixed(1)}°N, {impactLon.toFixed(1)}°E</span>
            </div>
            <div className={styles.dataRow}>
              <span className={styles.label}>Energy</span>
              <span className={styles.value}>{formatEnergy(effects.E_J)} of TNT</span>
            </div>
            <div className={styles.dataRow}>
              <span className={styles.label}>Recurrence Period</span>
              <span className={styles.value}>{effects.Tre_years.toFixed(1)} years</span>
            </div>
            <div className={styles.impactType + ' ' + (effects.airburst ? styles.airburst : styles.surface)}>
              {effects.airburst ? '☁️ Airburst' : '🌋 Surface Impact'}
              {effects.airburst && (
                <span> at {formatDistance(effects.zb_breakup)} altitude</span>
              )}
            </div>
            <div className={styles.dataRow}>
              <span className={styles.label}>Impact Velocity</span>
              <span className={styles.value}>{(effects.v_impact_for_crater/1000).toFixed(1)} km/s</span>
            </div>
            <Link href="/meteors/formulas?category=overview" className={styles.scienceButton}>
              🧪 Check the Science
            </Link>
          </div>
        )}

        {activeTab === 'thermal' && (
          <div className={styles.section}>
            <div className={styles.sectionInfo}>
              Thermal effects are caused by the intense heat generated during impact or airburst.
            </div>
            {effects.Rf_m && (
              <div className={styles.dataRow}>
                <span className={styles.label}>Fireball Radius</span>
                <span className={styles.value}>{formatDistance(effects.Rf_m)}</span>
              </div>
            )}
            <div className={styles.distanceGrid}>
              {effects.r_3rd_burn_m && (
                <div className={styles.distanceCard}>
                  <div className={styles.distanceValue}>{formatDistance(effects.r_3rd_burn_m)}</div>
                  <div className={styles.distanceLabel}>Third Degree Burns</div>
                  <div className={styles.distanceDesc}>100% thickness burns, requiring immediate medical attention</div>
                </div>
              )}
              {effects.r_2nd_burn_m && (
                <div className={styles.distanceCard}>
                  <div className={styles.distanceValue}>{formatDistance(effects.r_2nd_burn_m)}</div>
                  <div className={styles.distanceLabel}>Second Degree Burns</div>
                  <div className={styles.distanceDesc}>Partial thickness burns with blistering</div>
                </div>
              )}
            </div>
            {effects.r_clothing_m && (
              <div className={styles.dataRow}>
                <span className={styles.label}>Clothing Ignition</span>
                <span className={styles.value}>{formatDistance(effects.r_clothing_m)}</span>
              </div>
            )}
            {effects.Rf_m && effects.Rf_m >= 1500 && (
              <div className={styles.dataRow}>
                <span className={styles.label} style={{ color: '#d34646ff' }}>Due to the curvature of the earth, the fireball cannot exceed a max of about 1500km in radius at sea level*</span>
              </div>
            )}
            <Link href="/meteors/formulas?category=thermal" className={styles.scienceButton}>
              🧪 Check the Science
            </Link>
          </div>
        )}

        {activeTab === 'blast' && (
          <div className={styles.section}>
            <div className={styles.sectionInfo}>
              The wave blast creates a sudden pressure increase that can damage structures and cause injuries.
            </div>
                <div className={styles.dataRow}>
                    <span className={styles.label}>Peak Overpressure</span>
                    <span className={styles.value}>{formatOverPressure(effects.airblast_peak_overpressure)}</span>
              </div>
            <div className={styles.distanceGrid}>
              {effects.airblast_radius_building_collapse_m && (
                <div className={styles.distanceCard}>
                  <div className={styles.distanceValue}>
                    {formatDistance(effects.airblast_radius_building_collapse_m)}
                  </div>
                  <div className={styles.distanceLabel}>Building Collapse</div>
                  <div className={styles.distanceDesc}>Complete destruction of buildings</div>
                </div>
              )}
              {effects.airblast_radius_glass_shatter_m && (
                <div className={styles.distanceCard}>
                  <div className={styles.distanceValue}>
                    {formatDistance(effects.airblast_radius_glass_shatter_m)}
                  </div>
                  <div className={styles.distanceLabel}>Window Breakage</div>
                  <div className={styles.distanceDesc}>Glass windows shatter due to pressure wave</div>
                </div>
                
              )}
            </div>
            <div className={styles.sectionInfo}>
                {effects.airblast_radius_building_collapse_m && effects.airblast_radius_building_collapse_m > 10000000 && (
                    <span style = {{color: "#d34646ff"}}>The proposed meteor is too large for conventional wind blast calculations. Though the theoretical ranges are provided, with impacts of this size, global catastrophe is imminent and metrics like "flattened buildings" become irrelevant and calculations break</span>
                )
                }
            </div>
            <Link href="/meteors/formulas?category=blast" className={styles.scienceButton}>
              🧪 Check the Science
            </Link>
          </div>
        )}

        {activeTab === 'crater' && (
          <div className={styles.section}>
            <div className={styles.sectionInfo}>
              Crater formation occurs in two phases: initial transient crater followed by final crater.
            </div>
            {effects.Dtc_m && (
              <>
                <div className={styles.dataRow}>
                  <span className={styles.label}>Transient Diameter</span>
                  <span className={styles.value}>{formatDistance(effects.Dtc_m)}</span>
                </div>
                {effects.dtc_m && (
                  <div className={styles.dataRow}>
                    <span className={styles.label}>Transient Depth</span>
                    <span className={styles.value}>{formatDistance(effects.dtc_m)}</span>
                  </div>
                )}
              </>
            )}
            {effects.Dfr_m && (
              <>
                <div className={styles.dataRow}>
                  <span className={styles.label}>Final Diameter</span>
                  <span className={styles.value}>{formatDistance(effects.Dfr_m)}</span>
                </div>
                {effects.dfr_m && (
                  <div className={styles.dataRow}>
                    <span className={styles.label}>Final Depth</span>
                    <span className={styles.value}>{formatDistance(effects.dfr_m)}</span>
                  </div>
                )}
              </>
            )}
            {effects.Vtc_km3 && (
              <div className={styles.dataRow}>
                <span className={styles.label}>Excavated Volume</span>
                <span className={styles.value}>{effects.Vtc_km3.toFixed(2)} km³</span>
              </div>
            )}
            {effects.Vtc_over_Ve && (
              <div className={styles.dataRow}>
                <span className={styles.label}>Earth Volume Ratio</span>
                <span className={styles.value}>{(effects.Vtc_over_Ve * 100).toFixed(6)}%</span>
              </div>
            )}
            <Link href="/meteors/formulas?category=crater" className={styles.scienceButton}>
              🧪 Check the Science
            </Link>
          </div>
        )}

        {activeTab === 'seismic' && (
          <div className={styles.section}>
            <div className={styles.sectionInfo}>
              The impact generates seismic waves which create an earthquake.
            </div>
            {effects.M && (
              <div className={styles.dataRow}>
                <span className={styles.label}>Immediate Richter Magnitude</span>
                <span className={styles.value}>{effects.M.toFixed(1)}</span>
              </div>
            )}
            {effects.radius_M_ge_7_5_m && (
              <div className={styles.dataRow}>
                <span className={styles.label}>Range for widespread building collapse</span>
                <span className={styles.value}>{formatDistance(effects.radius_M_ge_7_5_m)}</span>
              </div>
            )}
            <Link href="/meteors/formulas?category=seismic" className={styles.scienceButton}>
              🧪 Check the Science
            </Link>
          </div>
        )}

        {/* Global Effect - shown on all tabs */}
        <div className={`${styles.earthEffect} ${earthEffectClass}`}>
          {earthEffectText}
        </div>
      </div>
    </div>
    );
}

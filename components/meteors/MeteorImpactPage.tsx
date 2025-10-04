'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, Stars } from '@react-three/drei';
import * as THREE from 'three';
import EarthImpact from './EarthImpact'; // Adjust path as needed
import styles from './MeteorImpactPage.module.css';

type Meteor = {
  name: string;       // selection id (e.g., "101955_bennu")
  mass: number;       // kg
  diameter: number;   // m
  speed: number;      // m/s
};

type EffectsState = {
  showAsteroid: boolean;
  fireball: boolean;
  sonicWave: boolean;
  shockwave: boolean;
  thermal: boolean;
  overpressure: boolean;
  ejecta: boolean;
  labels: boolean;
};

const IMPACT_TIME = 0.40; // timeline point where impact occurs (0..1)

// More realistic damage calculations
function calculateRealisticDamage(meteor: Meteor) {
  const { mass, speed, diameter } = meteor;

  // Kinetic energy in Joules
  const energyJ = 0.5 * mass * speed * speed;
  const energyMt = energyJ / 4.184e15; // Convert to megatons TNT equivalent

  const diameterKm = diameter / 1000;

  // Conservative empirical formulas
  const thermalKm = Math.max(0.5, Math.pow(energyMt, 0.33) * 2.0);
  const overpressureKm = Math.max(0.3, Math.pow(energyMt, 0.28) * 1.5);
  const shockwaveKm = Math.max(1.0, Math.pow(energyMt, 0.35) * 3.0);
  const craterKm = Math.max(0.1, Math.pow(diameterKm, 0.8) * 2.0);

  return {
    thermal: thermalKm,
    overpressure: overpressureKm,
    shockwave: shockwaveKm,
    crater: craterKm,
    energy: energyMt,
  };
}

// Helper to format large numbers
const formatNum = (n: number): string =>
  n >= 1e12 ? (n / 1e12).toFixed(1) + 'T' :
  n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' :
  n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' :
  n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' :
  n >= 1 ? n.toFixed(1) : n.toExponential(2);

// Format energy with proper units
const formatEnergy = (mt: number): string =>
  mt >= 1000 ? (mt / 1000).toFixed(1) + ' Gt' :
  mt >= 1 ? mt.toFixed(1) + ' Mt' :
  mt >= 0.001 ? (mt * 1000).toFixed(1) + ' kt' :
  (mt * 1000000).toFixed(1) + ' t';

// Format asteroid name
const formatAsteroidName = (id: string): string =>
  (id || 'Demo Meteor')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

export default function MeteorImpactPage({ meteor }: { meteor: Meteor }) {
  const [impactLat, setImpactLat] = useState(20);
  const [impactLon, setImpactLon] = useState(-45);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(true);

  const [effects, setEffects] = useState<EffectsState>({
    showAsteroid: true,
    fireball: true,
    sonicWave: true,
    shockwave: true,
    thermal: true,
    overpressure: true,
    ejecta: true,
    labels: false,
  });

  const damage = useMemo(() => calculateRealisticDamage(meteor), [meteor]);
  const typedName = formatAsteroidName(meteor.name);

  const toggles: ReadonlyArray<[keyof EffectsState, string]> = [
    ['showAsteroid', 'Asteroid Model'],
    ['fireball', 'Fireball Flash'],
    ['sonicWave', 'Sonic Wave'],
    ['shockwave', 'Surface Shockwave'],
    ['thermal', 'Thermal Damage Zone'],
    ['overpressure', 'Overpressure Zone'],
    ['ejecta', 'Ejecta & Crater'],
    ['labels', 'Effect Labels'],
  ];

  // Timeline status
  const getTimelineStatus = () => {
    if (t < IMPACT_TIME) return 'Approaching';
    if (t < IMPACT_TIME + 0.1) return 'Impact!';
    if (t < IMPACT_TIME + 0.3) return 'Shockwave';
    return 'Aftermath';
  };

  // Auto-play timeline
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      setT((prev) => {
        const next = prev + 0.003;
        return next > 1 ? 1 : next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  useEffect(() => {
    if (t >= 1) setPlaying(false);
  }, [t]);

  const handleToggle = (key: keyof EffectsState) =>
    setEffects((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className={styles.container}>
      {/* LEFT CONTROL PANEL */}
      <div className={styles.panel}>
        <h3 className={styles.title}>Impact Controls</h3>
        <p className={styles.description}>
          Double-click the Earth to set impact location. Use timeline controls to navigate the sequence.
        </p>

        <div className={styles.toggleGroup}>
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#88ccff' }}>
            VISUAL EFFECTS
          </div>
          {toggles.map(([key, label]) => (
            <label key={key} className={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={effects[key]}
                onChange={() => handleToggle(key)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button
            onClick={() => setPlaying((p) => !p)}
            className={`${styles.button} ${playing ? styles.playPause : styles.play}`}
          >
            {playing ? '⏸ Pause' : '▶ Play'}
          </button>
          <button
            onClick={() => { setT(0); setPlaying(true); }}
            className={`${styles.button} ${styles.restart}`}
          >
            ↻ Restart
          </button>
        </div>

        <div className={styles.statusBox}>
          <div className={styles.statusTitle}>STATUS: {getTimelineStatus()}</div>
          <div className={styles.statusText}>Timeline: {(t * 100).toFixed(1)}%</div>
        </div>
      </div>

      {/* RIGHT HUD */}
      <div className={styles.hud}>
        <div className={styles.asteroidName}>{typedName}</div>

        <div className={styles.infoList}>
          <div><b>Mass:</b> {formatNum(meteor.mass)} kg</div>
          <div><b>Diameter:</b> {(meteor.diameter / 1000).toFixed(2)} km</div>
          <div><b>Speed:</b> {(meteor.speed / 1000).toFixed(1)} km/s</div>
          <div><b>Energy:</b> {formatEnergy(damage.energy)} TNT equiv.</div>
        </div>

        <hr className={styles.divider} />

        <div className={styles.infoList}>
          <div className={styles.damageTitle}>Damage Radii (Estimated)</div>
          <div><b>Crater:</b> {damage.crater.toFixed(1)} km</div>
          <div><b>Thermal:</b> {damage.thermal.toFixed(1)} km</div>
          <div><b>Overpressure:</b> {damage.overpressure.toFixed(1)} km</div>
          <div><b>Max Shockwave:</b> {damage.shockwave.toFixed(1)} km</div>
        </div>

        <hr className={styles.divider} />

        <div className={styles.locationInfo}>
          <div><b>Impact Location:</b></div>
          <div>{impactLat.toFixed(2)}°N, {impactLon.toFixed(2)}°E</div>
          <div style={{ marginTop: 4 }}>
            <b>Timeline:</b> {(t * 100).toFixed(1)}% complete
          </div>
        </div>
      </div>

      {/* 3D CANVAS */}
      <Canvas
        shadows
        camera={{ fov: 50, position: [0, 1.8, 3.5] }}
        style={{ background: 'radial-gradient(circle, #001122 0%, #000408 100%)' }}
      >
        <ambientLight intensity={0.15} />
        <directionalLight
          position={[8, 10, 6]}
          intensity={1.8}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={20}
          shadow-camera-left={-5}
          shadow-camera-right={5}
          shadow-camera-top={5}
          shadow-camera-bottom={-5}
        />
        <pointLight position={[-8, -3, -8]} intensity={0.3} color="#4488ff" />
        <Stars radius={120} depth={60} count={8000} factor={3} fade speed={0.2} />
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={2.2}
          maxDistance={8}
          maxPolarAngle={Math.PI}
        />
        <React.Suspense
          fallback={
            <Html center style={{ color: '#fff', textAlign: 'center' }}>
              <div>Loading 3D Models...</div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                Please wait while asteroid models load
              </div>
            </Html>
          }
        >
          <EarthImpact
            meteor={meteor}
            impact={{ lat: impactLat, lon: impactLon }}
            t={t}
            onImpactSelect={(la, lo) => { setImpactLat(la); setImpactLon(lo); }}
            effects={effects}
            impactTime={IMPACT_TIME}
          />
        </React.Suspense>
      </Canvas>

      {/* TIMELINE BAR */}
      <div className={styles.bottomBar}>
        <div className={styles.barInner}>
          <button
            onClick={() => setPlaying((p) => !p)}
            className={`${styles.button} ${playing ? styles.playPause : styles.play}`}
          >
            {playing ? '⏸' : '▶'}
          </button>

          <div className={styles.timelineControls}>
            <span className={styles.timelineLabel}>0%</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.001"
              value={t}
              onChange={(e) => setT(parseFloat(e.target.value))}
              className={styles.timelineInput}
            />
            <span className={styles.timelineEndLabel}>100%</span>
          </div>

          <button
            onClick={() => { setT(0); setPlaying(true); }}
            className={`${styles.button} ${styles.restart}`}
          >
            ↻
          </button>

          <div className={styles.timelineStatus}>{getTimelineStatus()}</div>
        </div>
      </div>
    </div>
  );
}
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, Stars } from '@react-three/drei';
import EarthImpact from './EarthImpact';

type Meteor = {
  name: string;       // selection id (e.g., "101955_bennu")
  mass: number;       // kg
  diameter: number;   // m
  speed: number;      // m/s
  angle: number;      // degrees from horizontal
  density: number;   // kg/m3
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

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  top: 16,
  left: 16,
  zIndex: 10,
  background: 'rgba(15,15,20,0.95)',
  border: '1px solid #333',
  borderRadius: 12,
  padding: '16px 18px',
  width: 340,
  color: '#e9f1ff',
  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  backdropFilter: 'blur(8px)'
};

const hudStyle: React.CSSProperties = {
  position: 'absolute',
  top: 16,
  right: 16,
  zIndex: 10,
  background: 'rgba(15,15,20,0.95)',
  border: '1px solid #333',
  borderRadius: 12,
  padding: '14px 16px',
  color: '#e9f1ff',
  minWidth: 280,
  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  backdropFilter: 'blur(8px)'
};

const bottomBar: React.CSSProperties = {
  position: 'absolute',
  left: 0, right: 0, bottom: 20,
  display: 'flex',
  justifyContent: 'center',
  zIndex: 10
};

const barInner: React.CSSProperties = {
  background: 'rgba(15,15,20,0.95)',
  border: '1px solid #333',
  borderRadius: 12,
  padding: '12px 18px',
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  color: '#e9f1ff',
  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  backdropFilter: 'blur(8px)'
};

// More realistic damage calculations
function calculateRealisticDamage(meteor: Meteor) {
  const { mass, speed, diameter } = meteor;
  
  // Kinetic energy in Joules
  const energyJ = 0.5 * mass * speed * speed;
  const energyMt = energyJ / 4.184e15; // Convert to megatons TNT equivalent
  
  // More conservative and realistic damage radius calculations
  const diameterKm = diameter / 1000;
  
  // Empirical formulas based on impact physics research
  // These are much more conservative than the previous calculations
  const thermalKm = Math.max(0.5, Math.pow(energyMt, 0.33) * 2.0);
  const overpressureKm = Math.max(0.3, Math.pow(energyMt, 0.28) * 1.5);
  const shockwaveKm = Math.max(1.0, Math.pow(energyMt, 0.35) * 3.0);
  const craterKm = Math.max(0.1, Math.pow(diameterKm, 0.8) * 2.0);
  
  return {
    thermal: thermalKm,
    overpressure: overpressureKm,
    shockwave: shockwaveKm,
    crater: craterKm,
    energy: energyMt
  };
}

// Local helper (so we don't need ./asteroidGlb)
const formatAsteroidName = (id: string) =>
  (id || 'Demo Meteor').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function MeteorImpactPage({ meteor }: { meteor: Meteor }) {
  const [impactLat, setImpactLat] = useState(20);   // degrees
  const [impactLon, setImpactLon] = useState(-45);  // degrees
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

  // timeline play/pause
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      setT((prev) => {
        const next = prev + 0.003; // Slightly faster timeline
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

  // Calculate more realistic damage radii
  const damage = useMemo(() => calculateRealisticDamage(meteor), [meteor]);

  const handleToggle = (key: keyof EffectsState) =>
    setEffects((prev) => ({ ...prev, [key]: !prev[key] }));

  const formatNum = (n: number) =>
    n >= 1e12 ? (n/1e12).toFixed(1)+'T' :
    n >= 1e9 ? (n/1e9).toFixed(1)+'B' :
    n >= 1e6 ? (n/1e6).toFixed(1)+'M' :
    n >= 1e3 ? (n/1e3).toFixed(1)+'k' : 
    n >= 1 ? n.toFixed(1) : n.toExponential(2);

  const formatEnergy = (mt: number) =>
    mt >= 1000 ? (mt/1000).toFixed(1) + ' Gt' :
    mt >= 1 ? mt.toFixed(1) + ' Mt' :
    mt >= 0.001 ? (mt*1000).toFixed(1) + ' kt' :
    (mt*1000000).toFixed(1) + ' t';

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

  return (
    <div style={{ position: 'relative', width: '100%', height: '100dvh', background: '#000812' }}>
      {/* LEFT CONTROL PANEL */}
      <div style={panelStyle}>
        <h3 style={{ margin: 0, marginBottom: 8, letterSpacing: 0.5, color: '#00ccff' }}>
          Impact Controls
        </h3>
        <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 12, lineHeight: 1.4 }}>
          Double-click the Earth to set impact location. Use timeline controls to navigate the sequence.
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#88ccff' }}>
            VISUAL EFFECTS
          </div>
          {toggles.map(([key, label]) => (
            <label key={key} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              margin: '5px 0',
              fontSize: 13,
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={effects[key]}
                onChange={() => handleToggle(key)}
                style={{ accentColor: '#00ccff' }}
              />
              <span style={{ opacity: effects[key] ? 1 : 0.6 }}>{label}</span>
            </label>
          ))}
        </div>

        <div style={{ 
          marginTop: 16, 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: 10 
        }}>
          <button
            onClick={() => setPlaying((p) => !p)}
            style={btnStyle(playing ? '#0066cc' : '#00aa44', '#fff')}
          >
            {playing ? '⏸ Pause' : '▶ Play'}
          </button>
          <button
            onClick={() => { setT(0); setPlaying(true); }}
            style={btnStyle('#444', '#fff')}
          >
            ↻ Restart
          </button>
        </div>

        <div style={{ 
          marginTop: 12, 
          padding: 8, 
          background: 'rgba(0,200,255,0.1)', 
          borderRadius: 6,
          border: '1px solid rgba(0,200,255,0.2)'
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#00ccff' }}>
            STATUS: {getTimelineStatus()}
          </div>
          <div style={{ fontSize: 10, opacity: 0.8 }}>
            Timeline: {(t * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* RIGHT HUD */}
      <div style={hudStyle}>
        <div style={{ 
          fontWeight: 700, 
          marginBottom: 6, 
          color: '#ffaa44',
          fontSize: 15
        }}>
          {typedName}
        </div>
        
        <div style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}>
          <div><b>Mass:</b> {formatNum(meteor.mass)} kg</div>
          <div><b>Diameter:</b> {(meteor.diameter/1000).toFixed(2)} km</div>
          <div><b>Speed:</b> {(meteor.speed/1000).toFixed(1)} km/s</div>
          <div><b>Energy:</b> {formatEnergy(damage.energy)} TNT equiv.</div>
        </div>
        
        <hr style={{ borderColor: '#444', margin: '12px 0' }} />
        
        <div style={{ fontSize: 12, lineHeight: 1.5 }}>
          <div style={{ fontWeight: 600, marginBottom: 4, color: '#ff6644' }}>
            Damage Radii (Estimated)
          </div>
          <div><b>Crater:</b> {damage.crater.toFixed(1)} km</div>
          <div><b>Thermal:</b> {damage.thermal.toFixed(1)} km</div>
          <div><b>Overpressure:</b> {damage.overpressure.toFixed(1)} km</div>
          <div><b>Max Shockwave:</b> {damage.shockwave.toFixed(1)} km</div>
        </div>
        
        <hr style={{ borderColor: '#444', margin: '12px 0' }} />
        
        <div style={{ fontSize: 11, lineHeight: 1.4, opacity: 0.8 }}>
          <div><b>Impact Location:</b></div>
          <div>{impactLat.toFixed(2)}°N, {impactLon.toFixed(2)}°E</div>
          <div style={{ marginTop: 4 }}>
            <b>Timeline:</b> {(t * 100).toFixed(1)}% complete
          </div>
        </div>
      </div>

      {/* 3D SCENE */}
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
        <Stars 
          radius={120} 
          depth={60} 
          count={8000} 
          factor={3} 
          fade 
          speed={0.2} 
        />
        <OrbitControls 
          enablePan 
          enableZoom 
          enableRotate 
          minDistance={2.2}
          maxDistance={8}
          maxPolarAngle={Math.PI}
        />
        <React.Suspense fallback={
          <Html center style={{ color:'#fff', textAlign: 'center' }}>
            <div>Loading 3D Models...</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
              Please wait while asteroid models load
            </div>
          </Html>
        }>
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

      {/* TIMELINE */}
      <div style={bottomBar}>
        <div style={barInner}>
          <button
            onClick={() => setPlaying((p) => !p)}
            style={btnStyle(playing ? '#0066cc' : '#00aa44', '#fff')}
          >
            {playing ? '⏸' : '▶'}
          </button>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 12,
            minWidth: 480
          }}>
            <span style={{ fontSize: 11, minWidth: 30 }}>0%</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={t}
              onChange={(e) => setT(parseFloat(e.target.value))}
              style={{ 
                flex: 1,
                accentColor: '#00ccff',
                cursor: 'pointer'
              }}
            />
            <span style={{ fontSize: 11, minWidth: 35 }}>100%</span>
          </div>
          
          <button
            onClick={() => { setT(0); setPlaying(true); }}
            style={btnStyle('#444', '#fff')}
          >
            ↻
          </button>
          
          <div style={{ 
            marginLeft: 12,
            fontSize: 11,
            opacity: 0.8,
            minWidth: 80,
            textAlign: 'center'
          }}>
            {getTimelineStatus()}
          </div>
        </div>
      </div>
    </div>
  );
}

function btnStyle(bg: string, fg: string): React.CSSProperties {
  return {
    background: bg,
    color: fg,
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 8,
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 13,
    transition: 'all 0.2s ease',
    minWidth: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };
}
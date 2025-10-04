'use client';

import * as THREE from 'three';
import React, { useMemo, useRef } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import { TextureLoader } from 'three';
import { GLTF } from 'three-stdlib';

type Meteor = { name: string; mass: number; diameter: number; speed: number; angle: number; density: number; };
type Impact = { lat: number; lon: number; };

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

interface Props {
  meteor: Meteor;
  impact: Impact;
  t: number;               // 0..1 timeline
  impactTime: number;      // when impact happens on timeline
  onImpactSelect?: (lat: number, lon: number) => void;
  effects: EffectsState;
}

interface ImpactData {
  craterDiameterKm: number;
  craterDepthm: number;
  windSpeedMs: number;
}

const EARTH_R = 1;           // Earth radius in scene units
const EARTH_R_KM = 6371;     // Earth radius in kilometers

type GLTFResult = GLTF & { scene: THREE.Group };

// ==== Inline helper: resolve GLB path (same logic as list page) ====
const specialMap: Record<string, string> = {
  '5535_annefrank': '3.glb',
  '9969_braille': '2.glb',
  '152830_dinkinesh': '3.glb',
  '52246_donaldjohanson': '2.glb',
  '3548_eurybates': '3.glb',
  '243_ida': '2.glb',
  '11351_leucus': '3.glb',
  '21_lutetia': '2.glb',
  'menoetius': '3.glb',
  '21900_orus': '2.glb',
  '617_patroclus': '1.glb',
  '15094_polymele': '1.glb',
  '73p_schwassman_wachmann_3': '3.glb',
  '81p_wild_2': '3.glb',
};
function getGlbFile(selectionName: string): string {
  if (!selectionName) return '/meteors/psyche.glb';
  if (specialMap[selectionName]) return `/meteors/${specialMap[selectionName]}`;
  const afterUnderscore = selectionName.includes('_')
    ? selectionName.substring(selectionName.indexOf('_') + 1)
    : selectionName;
  return `/meteors/${afterUnderscore}.glb`;
}
// ================================================================

// --- More accurate distance mapping with smaller scaling
function surfaceKmToChordUnits(km: number): number {
  const maxKm = Math.min(km, EARTH_R_KM * 0.5);
  const theta = maxKm / EARTH_R_KM;
  return EARTH_R * theta * 0.8;
}

// More realistic energy and damage calculations with detailed zones
function calculateDamageZones(meteor: Meteor) {
  const { mass, speed, diameter } = meteor;
  
  const energyJ = 0.5 * mass * speed * speed;
  const energyMt = energyJ / 4.184e15;
  
  const diameterKm = diameter / 1000;
  
  // Multiple thermal zones based on heat flux
  const baseThermal = Math.pow(energyMt, 0.33) * 2.0;
  const baseOverpressure = Math.pow(energyMt, 0.28) * 1.5;
  const baseShockwave = Math.pow(energyMt, 0.35) * 3.0;
  
  return {
    // Thermal zones (decreasing intensity)
    vaporization: Math.max(0.1, baseThermal * 0.3),      // Complete vaporization
    thirddegree: Math.max(0.3, baseThermal * 0.6),       // 3rd degree burns
    seconddegree: Math.max(0.5, baseThermal * 0.85),     // 2nd degree burns
    firstdegree: Math.max(0.8, baseThermal * 1.0),       // 1st degree burns
    
    // Overpressure zones
    totalDestruction: Math.max(0.2, baseOverpressure * 0.4),  // Complete building collapse
    heavyDamage: Math.max(0.4, baseOverpressure * 0.7),       // Heavy structural damage
    moderateDamage: Math.max(0.6, baseOverpressure * 1.0),    // Moderate damage
    
    // Shockwave (visible, permanent)
    shockwaveMax: Math.max(2.0, baseShockwave * 1.2),
    
    crater: Math.max(0.1, Math.pow(diameterKm, 0.8) * 2.0),
    energy: energyMt
  };
}

export default function EarthImpact({
  meteor, impact, t, impactTime, onImpactSelect, effects
}: Props) {
  const dayTex = useLoader(TextureLoader, '/textures/earthDay.png');
  const explosionRef = useRef<THREE.Group>(null!);

  // Impact point & entry path
  const impactPos = useMemo(
    () => latLonToVec3(impact.lat, impact.lon, EARTH_R + 0.001),
    [impact]
  );
  const entryStart = useMemo(
    () => latLonToVec3(impact.lat, impact.lon, EARTH_R * 1.8),
    [impact]
  );

  // Calculate detailed damage zones
  const damage = useMemo(() => calculateDamageZones(meteor), [meteor]);

  // Load asteroid & scale it
  const modelUrl = getGlbFile(meteor.name || '');
  const gltf = useGLTF(modelUrl) as GLTFResult;
  const asteroidRef = useRef<THREE.Group>(null!);

  const desiredAsteroidRadiusUnits = useMemo(() => {
    const diameterKm = Math.max(meteor.diameter / 1000, 0);
    const radiusKm = diameterKm / 2;
    const minVisible = 0.002 * EARTH_R;
    const maxVisible = 0.05 * EARTH_R;
    const calculatedSize = (radiusKm / EARTH_R_KM) * EARTH_R;
    return Math.max(minVisible, Math.min(calculatedSize, maxVisible));
  }, [meteor.diameter]);

  const asteroidScale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);
    const current = sphere.radius || 1;
    return desiredAsteroidRadiusUnits / current;
  }, [gltf.scene, desiredAsteroidRadiusUnits]);

  // Animate asteroid position with slower approach
  const asteroidPos = useMemo(() => {
    if (t >= impactTime) return impactPos.clone();
    const alpha = THREE.MathUtils.clamp(t / impactTime, 0, 1);
    const curved = Math.pow(alpha, 2); // More dramatic final approach
    return entryStart.clone().lerp(impactPos, curved);
  }, [t, impactTime, entryStart, impactPos]);

  useFrame((_, dt) => {
    if (asteroidRef.current) {
      asteroidRef.current.rotation.y += 0.8 * dt;
      asteroidRef.current.rotation.x += 0.3 * dt;
    }
    
    // Animate explosion particles
    if (explosionRef.current && t >= impactTime && t < impactTime + 0.3) {
      const post = t - impactTime;
      const scale = 1 + post * 15;
      explosionRef.current.scale.setScalar(scale);
      explosionRef.current.rotation.y += dt * 2;
    }
  });

  // Slower, more dramatic post-impact timing
  const post = Math.max(0, t - impactTime);
  const sonicFrac = THREE.MathUtils.smoothstep(post / 0.8, 0, 1);  // Slower
  const shockFrac = THREE.MathUtils.smoothstep(post / 1.2, 0, 1); // Much slower
  const explosionIntensity = Math.max(0, 1 - post / 0.3);

  function handleDoubleClick(e: any) {
    if (!onImpactSelect) return;
    const p = e.point.clone().normalize();
    const lat = THREE.MathUtils.radToDeg(Math.asin(p.y));
    const lon = THREE.MathUtils.radToDeg(Math.atan2(p.z, p.x));
    onImpactSelect(lat, lon);
  }

  const thermalZones = [
    { radius: damage.vaporization, color: '#ffffff', label: 'Complete Vaporization', opacity: 0.25 },
    { radius: damage.thirddegree, color: '#ff0000', label: '100% 3rd Degree Burns', opacity: 0.18 },
    { radius: damage.seconddegree, color: '#ff4400', label: '100% 2nd Degree Burns', opacity: 0.12 },
    { radius: damage.firstdegree, color: '#ff8800', label: '1st Degree Burns', opacity: 0.08 },
  ];

  const pressureZones = [
    { radius: damage.totalDestruction, color: '#660000', label: 'Total Destruction', opacity: 0.2 },
    { radius: damage.heavyDamage, color: '#aa3300', label: 'Heavy Structural Damage', opacity: 0.15 },
    { radius: damage.moderateDamage, color: '#dd6600', label: 'Moderate Damage', opacity: 0.1 },
  ];

  return (
    <group>
      {/* Earth */}
      <mesh onDoubleClick={handleDoubleClick} receiveShadow>
        <sphereGeometry args={[EARTH_R, 128, 128]} />
        <meshStandardMaterial map={dayTex} metalness={0.02} roughness={0.8} />
      </mesh>

      {/* Subtle atmosphere */}
      <mesh>
        <sphereGeometry args={[EARTH_R * 1.008, 64, 64]} />
        <meshBasicMaterial color={'#4a90e2'} transparent opacity={0.12} />
      </mesh>

      {/* Asteroid in-flight */}
      {effects.showAsteroid && t < impactTime && (
        <group ref={asteroidRef} position={asteroidPos}>
          <primitive object={gltf.scene} scale={asteroidScale} />
          {/* Enhanced reentry glow */}
          <mesh>
            <sphereGeometry args={[desiredAsteroidRadiusUnits * 2.0, 16, 16]} />
            <meshBasicMaterial 
              color="#ff6622" 
              transparent 
              opacity={0.4 * Math.pow(t / impactTime, 2)} 
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <mesh>
            <sphereGeometry args={[desiredAsteroidRadiusUnits * 3.0, 12, 12]} />
            <meshBasicMaterial 
              color="#ff9944" 
              transparent 
              opacity={0.2 * Math.pow(t / impactTime, 2)} 
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}

      {/* Multi-stage explosion animation */}
      {effects.fireball && t >= impactTime && t < impactTime + 0.3 && (
        <group ref={explosionRef} position={impactPos}>
          {/* Core blast */}
          <mesh>
            <sphereGeometry args={[desiredAsteroidRadiusUnits * 2, 32, 32]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={explosionIntensity * 0.9}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          {/* Secondary fireball */}
          <mesh>
            <sphereGeometry args={[desiredAsteroidRadiusUnits * 4, 24, 24]} />
            <meshBasicMaterial
              color="#ff6600"
              transparent
              opacity={explosionIntensity * 0.7}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          {/* Outer blast wave */}
          <mesh>
            <sphereGeometry args={[desiredAsteroidRadiusUnits * 6, 16, 16]} />
            <meshBasicMaterial
              color="#ffaa00"
              transparent
              opacity={explosionIntensity * 0.4}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}

      {/* Crater and ejecta */}
      {effects.ejecta && t >= impactTime && (
        <mesh position={impactPos.clone().multiplyScalar(1.0005)} rotation={ringRotation(impactPos)}>
          <ringGeometry args={[
            0,
            surfaceKmToChordUnits(damage.crater * (1.0 + 0.3 * Math.min(post / 0.5, 1))),
            64, 1
          ]} />
          <meshBasicMaterial
            color="#994422"
            transparent
            opacity={0.6 * Math.max(0.4, 1.0 - post / 2.0)}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Permanent, highly visible shockwave */}
      {effects.shockwave && t >= impactTime && (
        <mesh position={impactPos.clone().multiplyScalar(1.001)} rotation={ringRotation(impactPos)}>
          <ringGeometry args={[
            surfaceKmToChordUnits(damage.shockwaveMax * (1 - shockFrac)) - 0.01,
            surfaceKmToChordUnits(damage.shockwaveMax * (1 - shockFrac)) + 0.01,
            128, 1
          ]} />
          <meshBasicMaterial
            color="#00aaff"
            transparent
            opacity={0.8}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Enhanced sonic wave */}
      {effects.sonicWave && t >= impactTime && sonicFrac > 0.05 && (
        <mesh position={impactPos.clone().multiplyScalar(1.0008)} rotation={ringRotation(impactPos)}>
          <ringGeometry args={[
            surfaceKmToChordUnits(damage.shockwaveMax * 1.5 * (1 - sonicFrac)) - 0.005,
            surfaceKmToChordUnits(damage.shockwaveMax * 1.5 * (1 - sonicFrac)) + 0.005,
            128, 1
          ]} />
          <meshBasicMaterial
            color="#66ccff"
            transparent
            opacity={0.6 * sonicFrac}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Multiple thermal damage zones */}
      {effects.thermal && t >= impactTime && thermalZones.map((zone, i) => (
        <DamageDisk
          key={`thermal-${i}`}
          position={impactPos}
          color={zone.color}
          kmRadius={zone.radius}
          label={effects.labels ? zone.label : undefined}
          opacity={zone.opacity}
          borderOpacity={zone.opacity * 2}
        />
      ))}

      {/* Multiple overpressure zones */}
      {effects.overpressure && t >= impactTime && pressureZones.map((zone, i) => (
        <DamageDisk
          key={`pressure-${i}`}
          position={impactPos}
          color={zone.color}
          kmRadius={zone.radius}
          label={effects.labels ? zone.label : undefined}
          opacity={zone.opacity}
          borderOpacity={zone.opacity * 1.5}
        />
      ))}

      {/* Impact label */}
      {effects.labels && (
        <Html position={impactPos.clone().multiplyScalar(1.02)} style={labelStyle('#ffff00', true)}>
          <div>⚡ IMPACT POINT</div>
          <div style={{ fontSize: 10, opacity: 0.8 }}>
            {damage.energy.toFixed(1)} Mt TNT
          </div>
        </Html>
      )}
    </group>
  );
}

/** ===== helpers ===== **/

const labelStyle = (color: string, isTitle = false): React.CSSProperties => ({
  background: isTitle ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.8)',
  border: `2px solid ${color}`,
  padding: isTitle ? '8px 12px' : '6px 10px',
  borderRadius: 8,
  color,
  fontSize: isTitle ? 12 : 11,
  fontWeight: isTitle ? 'bold' : 'normal',
  whiteSpace: 'nowrap',
  boxShadow: `0 0 12px ${color}44`,
  textAlign: 'center',
  lineHeight: 1.2
});

function latLonToVec3(lat:number, lon:number, R:number){
  const la = THREE.MathUtils.degToRad(lat);
  const lo = THREE.MathUtils.degToRad(lon);
  return new THREE.Vector3(
    R*Math.cos(la)*Math.cos(lo),
    R*Math.sin(la),
    R*Math.cos(la)*Math.sin(lo)
  );
}

function getRealEarthData(lat:number, lon:number) {
  lon = -lon; // Invert longitude for texture coords
}

export function ringRotation(surfacePoint: THREE.Vector3) {
  const normal = surfacePoint.clone().normalize();
  const tmp = Math.abs(normal.x) > 0.9 ? new THREE.Vector3(0,1,0) : new THREE.Vector3(1,0,0);
  const tangent = new THREE.Vector3().crossVectors(tmp, normal).normalize();
  const binormal = new THREE.Vector3().crossVectors(normal, tangent).normalize();

  const m = new THREE.Matrix4();
  m.makeBasis(tangent, binormal, normal);
  const euler = new THREE.Euler().setFromRotationMatrix(m);
  return euler;
}

function DamageDisk({
  position, kmRadius, color, label, opacity = 0.1, borderOpacity = 0.3
}: { 
  position: THREE.Vector3; 
  kmRadius: number; 
  color: string; 
  label?: string;
  opacity?: number;
  borderOpacity?: number;
}) {
  const outer = surfaceKmToChordUnits(kmRadius);
  const inner = 0;
  
  return (
    <group position={position.clone().multiplyScalar(1.01)} rotation={ringRotation(position)}>
      {/* Fill */}
      <mesh>
        <ringGeometry args={[inner, Math.max(outer, 0.001), 64, 1]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} />
      </mesh>
      {/* Enhanced border */}
      <mesh>
        <ringGeometry args={[Math.max(outer - 0.003, 0.0005), outer, 64, 1]} />
        <meshBasicMaterial 
          color={color} 
          transparent 
          opacity={borderOpacity} 
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {label && (
        <Html position={[0, 0, Math.max(outer * 0.6, 0.015)]} style={labelStyle(color)}>
          <div>{label}</div>
          <div style={{ fontSize: 9, opacity: 0.7 }}>{kmRadius.toFixed(1)} km</div>
        </Html>
      )}
    </group>
  );
}

useGLTF.preload('/meteors/psyche.glb');
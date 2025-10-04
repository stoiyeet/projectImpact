'use client';

import * as THREE from 'three';
import React, { useMemo, useRef } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import { TextureLoader } from 'three';
import { GLTF } from 'three-stdlib';

import { getGlbFile } from './asteroidGLB';
import AsteroidExplosion from './AsteroidExplosion';
import Earth from './Earth';
import { Damage_Results } from './DamageValues';

type Meteor = {
  name: string;
  mass: number;
  diameter: number;
  speed: number;
  angle: number;
};

type Impact = {
  lat: number;
  lon: number;
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

interface Props {
  meteor: Meteor;
  damage: Damage_Results;
  impact: Impact;
  t: number; // 0..1 timeline
  impactTime: number; // when impact happens on timeline
  onImpactSelect?: (lat: number, lon: number) => void;
  effects: EffectsState;
}

interface ImpactData {
  craterDiameterKm: number;
  craterDepthm: number;
  windSpeedMs: number;
}

const EARTH_R = 1;
const EARTH_R_M = 6371000;

type GLTFResult = GLTF & { scene: THREE.Group };

// --- Distance mapping
function surfacemToChordUnits(m: number): number {
  const maxm = Math.min(m, EARTH_R_M * 0.5);
  const theta = maxm / EARTH_R_M;
  return EARTH_R * theta * 0.8;
}

export default function EarthImpact({
  meteor,
  damage,
  impact,
  t,
  impactTime,
  onImpactSelect,
  effects,
}: Props) {
  // Impact point & entry path
  const impactPos = useMemo(
    () => latLonToVec3(impact.lat, impact.lon, EARTH_R + 0.001),
    [impact]
  );

  const entryStart = useMemo(
    () => latLonToVec3(impact.lat+90-meteor.angle, impact.lon, EARTH_R * 1.8),
    [impact]
  );

  // Load asteroid model
  const modelUrl = getGlbFile(meteor.name || '');
  const gltf = useGLTF(modelUrl) as GLTFResult;
  const asteroidRef = useRef<THREE.Group>(null!);

  // Scale asteroid realistically
  const desiredAsteroidRadiusUnits = useMemo(() => {
    const diameterKm = Math.max(meteor.diameter / 100, 0);
    const radiusKm = diameterKm / 2;
    const minVisible = 0.002 * EARTH_R;
    const maxVisible = 0.05 * EARTH_R;
    const calculatedSize = (radiusKm / EARTH_R_M) * EARTH_R;
    return Math.max(minVisible, Math.min(calculatedSize, maxVisible));
  }, [meteor.diameter]);

  const asteroidScale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);
    const current = sphere.radius || 1;
    return desiredAsteroidRadiusUnits / current;
  }, [gltf.scene, desiredAsteroidRadiusUnits]);

  // Animate asteroid approach
  const asteroidPos = useMemo(() => {
    if (t >= impactTime) return impactPos.clone();
    const alpha = THREE.MathUtils.clamp(t / impactTime, 0, 1);
    const curved = Math.pow(alpha, 2);
    return entryStart.clone().lerp(impactPos, curved);
  }, [t, impactTime, entryStart, impactPos]);

  // Animate asteroid rotation
  useFrame((_, dt) => {
    if (asteroidRef.current) {
      asteroidRef.current.rotation.y += 0.8 * dt;
      asteroidRef.current.rotation.x += 0.3 * dt;
    }
  });

  // Timeline state
  const post = Math.max(0, t - impactTime);
  const sonicFrac = THREE.MathUtils.smoothstep(post / 0.8, 0, 1);
  const shockFrac = THREE.MathUtils.smoothstep(post / 1.2, 0, 1);
  const explosionIntensity = Math.max(0, 1 - post / 0.3);
  const explosionStrength = t >= impactTime ? explosionIntensity : 0; // For clouds

  // Double-click handler
  function handleDoubleClick(e: any) {
    if (!onImpactSelect) return;
    const p = e.point.clone().normalize();
    const lat = THREE.MathUtils.radToDeg(Math.asin(p.y));
    const lon = THREE.MathUtils.radToDeg(Math.atan2(p.z, p.x));
    onImpactSelect(lat, lon);
  }

  // Damage zones
  const thermalZones = [
    { radius: damage.Rf_m, color: '#ffffff', label: 'Complete Vaporization', opacity: 0.25 },
    { radius: damage.r_3rd_burn_m, color: '#ff0000', label: '100% 3rd Degree Burns', opacity: 0.18 },
    { radius: damage.r_2nd_burn_m, color: '#ff4400', label: '100% 2nd Degree Burns', opacity: 0.12 },
  ];

  const pressureZones = [
    { radius: damage.airblast_radius_building_collapse_m, color: '#06387aff', label: 'Total Destruction', opacity: 0.2 },
    { radius: damage.airblast_radius_glass_shatter_m, color: '#0ca8cfff', label: 'Heavy Structural Damage', opacity: 0.15 },
  ];

  // Blast radius in scene units
  const blastRadius = surfacemToChordUnits(damage.Rf_m || 0);

  return (
    <group>
      {/* Earth with dynamic clouds and explosion response */}
      <Earth
        onDoubleClick={handleDoubleClick}
        impactPosition={impactPos}
        blastRadius={blastRadius}
        explosionStrength={explosionStrength}
      />

      {/* Asteroid in-flight */}
      {effects.showAsteroid && t < impactTime && (
        <group ref={asteroidRef} position={asteroidPos}>
          <primitive object={gltf.scene} scale={asteroidScale*2} />
          {/* Intense reentry glow */}
          <mesh>
            <sphereGeometry args={[desiredAsteroidRadiusUnits * 1.8, 32, 32]} />
            <meshBasicMaterial
              color="#ff2200"
              transparent
              opacity={0.7 * Math.pow(t / impactTime, 1.5)}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <mesh>
            <sphereGeometry args={[desiredAsteroidRadiusUnits * 2.5, 24, 24]} />
            <meshBasicMaterial
              color="#ff4400"
              transparent
              opacity={0.5 * Math.pow(t / impactTime, 1.5)}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <mesh>
            <sphereGeometry args={[desiredAsteroidRadiusUnits * 3.5, 16, 16]} />
            <meshBasicMaterial
              color="#ff6622"
              transparent
              opacity={0.3 * Math.pow(t / impactTime, 1.5)}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}

      {/* Fireball explosion */}
      {effects.fireball && t >= impactTime && t < impactTime + 0.3 && (
        <AsteroidExplosion
          position={impactPos}
          intensity={explosionIntensity}
          asteroidRadiusUnits={desiredAsteroidRadiusUnits}
        />
      )}

      {/* Crater and ejecta */}
      {effects.ejecta && t >= impactTime && (
        <mesh position={impactPos.clone().multiplyScalar(1.0005)} rotation={ringRotation(impactPos)}>
          <ringGeometry args={[
            0,
            surfacemToChordUnits(damage.Dtc_m || damage.Dfr_m || 0* (1.0 + 0.3 * Math.min(post / 0.5, 1))),
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

      {/* Permanent shockwave ring */}
      {effects.shockwave && t >= impactTime && (
        <mesh position={impactPos.clone().multiplyScalar(1.001)} rotation={ringRotation(impactPos)}>
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

      {/* Sonic wave */}
      {effects.sonicWave && t >= impactTime && sonicFrac > 0.05 && (
        <mesh position={impactPos.clone().multiplyScalar(1.0008)} rotation={ringRotation(impactPos)}>
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

      {/* Thermal damage zones */}
      {effects.thermal && t >= impactTime && thermalZones.map((zone, i) => (
        <DamageDisk
          key={`thermal-${i}`}
          position={impactPos}
          color={zone.color}
          kmRadius={zone.radius || 0}
          label={effects.labels ? zone.label : undefined}
          opacity={zone.opacity}
          borderOpacity={zone.opacity * 2}
        />
      ))}

      {/* Overpressure zones */}
      {effects.overpressure && t >= impactTime && pressureZones.map((zone, i) => (
        <DamageDisk
          key={`pressure-${i}`}
          position={impactPos}
          color={zone.color}
          kmRadius={zone.radius || 0}
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
            {damage.E_Mt.toFixed(3)} Mt TNT
          </div>
        </Html>
      )}
    </group>
  );
}

// === Helper Functions ===

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
  lineHeight: 1.2,
});

function latLonToVec3(lat: number, lon: number, R: number): THREE.Vector3 {
  const la = THREE.MathUtils.degToRad(lat);
  const lo = THREE.MathUtils.degToRad(lon);
  return new THREE.Vector3(
    R * Math.cos(la) * Math.cos(lo),
    R * Math.sin(la),
    R * Math.cos(la) * Math.sin(lo)
  );
}

function getRealEarthData(lat:number, lon:number) {
  lon = -lon; // Invert longitude for texture coords
}

export function ringRotation(surfacePoint: THREE.Vector3) {
  const normal = surfacePoint.clone().normalize();
  const tmp = Math.abs(normal.x) > 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const tangent = new THREE.Vector3().crossVectors(tmp, normal).normalize();
  const binormal = new THREE.Vector3().crossVectors(normal, tangent).normalize();
  const m = new THREE.Matrix4().makeBasis(tangent, binormal, normal);
  return new THREE.Euler().setFromRotationMatrix(m);
}

function DamageDisk({
  position,
  kmRadius,
  color,
  label,
  opacity = 0.1,
  borderOpacity = 0.3,
}: {
  position: THREE.Vector3;
  kmRadius: number;
  color: string;
  label?: string;
  opacity?: number;
  borderOpacity?: number;
}) {
  const outer = surfacemToChordUnits(kmRadius);
  const inner = 0;

  return (
    <group position={position.clone().multiplyScalar(1.01)} rotation={ringRotation(position)}>
      {/* Fill */}
      <mesh>
        <ringGeometry args={[inner, Math.max(outer, 0.001), 64, 1]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} />
      </mesh>
      {/* Border */}
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

// Preload default model
useGLTF.preload('/meteors/psyche.glb');
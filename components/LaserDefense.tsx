'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Vector3, Group, Mesh } from 'three';

interface LaserDefenseProps {
  asteroidPosition: Vector3;
  onComplete: () => void;
  isActive: boolean;
  onDeflect?: (delta: Vector3) => void; // push asteroid away each frame while firing
}

const LaserDefense: React.FC<LaserDefenseProps> = ({
  asteroidPosition,
  onComplete,
  isActive,
  onDeflect,
}) => {
  const satelliteRef = useRef<Group>(null);
  const coreGlowRef = useRef<Mesh>(null);
  const beamRef = useRef<Mesh>(null);
  const impactRef = useRef<Group>(null);

  const [phase, setPhase] = useState<'idle' | 'charging' | 'firing' | 'cooldown' | 'complete'>('idle');
  const [beamStart] = useState(() => new Vector3(15, 25, -30)); // satellite orbit position
  const [tCharge, setTCharge] = useState(0);
  const [tFire, setTFire] = useState(0);

  // Reset when toggled on
  useEffect(() => {
    if (isActive) {
      setPhase('charging');
      setTCharge(0);
      setTFire(0);
      if (beamRef.current) {
        beamRef.current.visible = false;
        (beamRef.current.material as THREE.MeshBasicMaterial).opacity = 0.9;
      }
      if (impactRef.current) impactRef.current.visible = false;
    } else {
      setPhase('idle');
    }
  }, [isActive]);

  const complete = useCallback(() => {
    setPhase('complete');
    onComplete();
  }, [onComplete]);

  useFrame((state, delta) => {
    if (!isActive) return;
    const time = state.clock.getElapsedTime();

    // Keep satellite looking at the asteroid
    if (satelliteRef.current) {
      satelliteRef.current.lookAt(asteroidPosition);
    }

    if (phase === 'charging') {
      if (tCharge === 0) setTCharge(time);
      const elapsed = time - tCharge;

      // Core pulse
      if (coreGlowRef.current) {
        const mat = coreGlowRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.4 + Math.sin(time * 6) * 0.3;
        coreGlowRef.current.scale.setScalar(1 + Math.sin(time * 3) * 0.25);
      }

      if (elapsed > 2.2) {
        setPhase('firing');
        setTFire(time);
        if (beamRef.current) beamRef.current.visible = true;
        if (impactRef.current) impactRef.current.visible = true;
      }
    }

    if (phase === 'firing') {
      const elapsed = time - tFire;

      // === Beam from start -> asteroid ===
      if (beamRef.current) {
        const start = beamStart;
        const end = asteroidPosition;
        const mid = start.clone().add(end).multiplyScalar(0.5);
        const dir = end.clone().sub(start);
        const length = dir.length();

        // Position beam at midpoint
        beamRef.current.position.copy(mid);

        // Rotate so cylinder's +Y aligns with dir
        const up = new THREE.Vector3(0, 1, 0);
        const q = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize());
        beamRef.current.setRotationFromQuaternion(q);

        // Scale height to match distance
        beamRef.current.scale.set(1, length, 1);

        // Pulse brightness
        const mat = beamRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.85 + Math.sin(time * 30) * 0.15;
      }

      // Impact flash / sparks at asteroid
      if (impactRef.current) {
        impactRef.current.position.copy(asteroidPosition);
        impactRef.current.children.forEach((child, i) => {
          if (child instanceof THREE.Mesh) {
            const mat = child.material as THREE.MeshBasicMaterial;
            mat.opacity = 0.6 + Math.sin(time * 20 + i) * 0.4;
            child.position.set(
              Math.sin(time * 18 + i) * 0.4,
              Math.cos(time * 16 + i) * 0.4,
              Math.sin(time * 14 + i) * 0.4
            );
          }
        });
      }

      // Apply outward nudge (simulate ablation plume). Earth is at origin.
      if (onDeflect && elapsed > 0.6) {
        const push = asteroidPosition.clone().normalize().multiplyScalar(0.25 * delta); // tune 0.25
        onDeflect(push);
      }

      if (elapsed > 4) setPhase('cooldown');
    }

    if (phase === 'cooldown') {
      if (beamRef.current) {
        const mat = beamRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity *= 0.9;
        if (mat.opacity < 0.05) {
          beamRef.current.visible = false;
          if (impactRef.current) impactRef.current.visible = false;
          complete();
        }
      } else {
        complete();
      }
    }
  });

  if (!isActive || phase === 'complete') return null;

  return (
    <group>
      {/* Satellite */}
      <group ref={satelliteRef} position={beamStart}>
        <mesh>
          <cylinderGeometry args={[0.8, 0.8, 2]} />
          <meshStandardMaterial color="#8a8a8a" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Panels */}
        <mesh position={[2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.05, 3.8, 1.6]} />
          <meshStandardMaterial color="#1a237e" roughness={0.8} metalness={0.1} />
        </mesh>
        <mesh position={[-2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.05, 3.8, 1.6]} />
          <meshStandardMaterial color="#1a237e" roughness={0.8} metalness={0.1} />
        </mesh>

        {/* Core */}
        <mesh ref={coreGlowRef} position={[0, 1, 0]}>
          <sphereGeometry args={[0.55]} />
          <meshBasicMaterial
            color="#00ffff"
            transparent
            opacity={0.5}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      {/* Beam (world-aligned) */}
      <mesh ref={beamRef} visible={false} renderOrder={10}>
        {/* height=1, centered; we scale Y up to distance */}
        <cylinderGeometry args={[0.07, 0.07, 1, 16, 1, true]} />
        <meshBasicMaterial
          color="#00ffff"
          transparent
          opacity={0.9}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Impact sparks */}
      <group ref={impactRef} visible={false}>
        {Array.from({ length: 10 }).map((_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.12]} />
            <meshBasicMaterial
              color={i % 2 ? '#ff7a00' : '#fffafa'}
              transparent
              opacity={0.8}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        ))}
        <pointLight color="#7fffff" intensity={6} distance={12} />
      </group>
    </group>
  );
};

export default LaserDefense;

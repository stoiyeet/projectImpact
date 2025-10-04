// components/IonBeamShepherd.tsx
"use client";
import React, { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface IonBeamShepherdProps {
  asteroidPosition: THREE.Vector3;
  isActive: boolean;
  onComplete?: () => void;
  onDeflect?: (delta: THREE.Vector3) => void;
  /** Approx asteroid radius in scene units for beam hit & surface FX */
  asteroidRadius?: number; // default ~1.5..3 depending on your model scale
  /** Multiplier for how strong the push is */
  deflectionStrength?: number; // default 0.08
}

const IonBeamShepherd: React.FC<IonBeamShepherdProps> = ({
  asteroidPosition,
  isActive,
  onComplete,
  onDeflect,
  asteroidRadius = 2.0,
  deflectionStrength = 0.08,
}) => {
  // Groups & nodes
  const rootRef = useRef<THREE.Group>(null);
  const shipRef = useRef<THREE.Group>(null);
  const beamCoreRef = useRef<THREE.Mesh>(null);
  const beamHaloRef = useRef<THREE.Mesh>(null);
  const hitGlowRef = useRef<THREE.Mesh>(null);
  const scorchRef = useRef<THREE.Mesh>(null);
  const plumeRef = useRef<THREE.Points>(null);

  // Phase tracking
  const tStart = useRef(0);
  const started = useRef(false);
  const finished = useRef(false);
  const approachDone = useRef(false);
  const lastPush = useRef(0);

  // Launch & target set-up
  const targetOffset = useMemo(() => new THREE.Vector3(-8, 3, 2), []);
  const approachSeconds = 3.5;
  const shepherdSeconds = 12.0;

  const launchPos = useMemo(() => {
    // Launch from along the Earth→asteroid direction at 25 units
    const dir = asteroidPosition.clone().normalize();
    return dir.multiplyScalar(25);
    // If Earth is not at (0,0,0), adapt this as needed.
  }, [asteroidPosition]);

  const targetPos = useMemo(
    () => asteroidPosition.clone().add(targetOffset),
    [asteroidPosition, targetOffset]
  );

  /* --------------------------- Materials & Shaders -------------------------- */

  const beamCoreMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          time: { value: 0 },
          opacity: { value: 0.95 },
          color: { value: new THREE.Color(0.9, 0.98, 1.0) },
          intensity: { value: 1.0 },
        },
        vertexShader: `
          uniform float time;
          varying float vDist;
          void main() {
            vec3 p = position;
            // Thin turbulent core
            p.x += sin((position.y*22.0)+time*20.0)*0.04;
            p.z += cos((position.y*18.0)+time*16.0)*0.04;
            vDist = abs(position.x) + abs(position.z);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0);
          }
        `,
        fragmentShader: `
          uniform float opacity;
          uniform vec3 color;
          uniform float intensity;
          varying float vDist;
          void main() {
            float core = 1.0 - smoothstep(0.0, 0.25, vDist);
            float glow = 1.0 - smoothstep(0.25, 0.6, vDist);
            float a = (core*1.0 + glow*0.4) * opacity * intensity;
            gl_FragColor = vec4(color, a);
          }
        `,
        side: THREE.DoubleSide,
      }),
    []
  );

  const beamHaloMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          time: { value: 0 },
          opacity: { value: 0.45 },
          color: { value: new THREE.Color(0.35, 0.7, 1.0) },
          intensity: { value: 1.0 },
        },
        vertexShader: `
          uniform float time;
          varying float vR;
          void main() {
            vec3 p = position;
            // Larger soft halo with gentle wobble
            p.x += sin((position.y*6.0)+time*3.0)*0.1;
            p.z += cos((position.y*7.0)+time*2.6)*0.1;
            vR = length(position.xz);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0);
          }
        `,
        fragmentShader: `
          uniform float opacity;
          uniform vec3 color;
          uniform float intensity;
          varying float vR;
          void main() {
            float falloff = 1.0 - smoothstep(0.0, 1.5, vR);
            float a = falloff * opacity * intensity;
            gl_FragColor = vec4(color, a);
          }
        `,
        side: THREE.DoubleSide,
      }),
    []
  );

  const hitGlowMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0x9ad4ff,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );

  const scorchMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0x3377ff,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    []
  );

  /* ------------------------------ Geometries -------------------------------- */

  // Beam cylinders (Y-up; we rotate/align in frame)
  const coreGeom = useMemo(() => new THREE.CylinderGeometry(0.12, 0.12, 2, 24, 1, true), []);
  const haloGeom = useMemo(() => new THREE.CylinderGeometry(0.5, 0.5, 2, 24, 1, true), []);

  // Ship bits (simple but crisp)
  const hullGeom = useMemo(() => new THREE.BoxGeometry(2, 0.8, 1.2), []);
  const hullMat = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        color: 0x2e3357,
        emissive: 0x0a1130,
        shininess: 80,
      }),
    []
  );
  const ionBellGeom = useMemo(() => new THREE.CylinderGeometry(0.45, 0.7, 1.2, 12), []);
  const ionBellMat = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        color: 0x4a65d9,
        emissive: 0x0b1a66,
        shininess: 120,
      }),
    []
  );
  const panelGeom = useMemo(() => new THREE.BoxGeometry(3.2, 0.05, 1.6), []);
  const panelMat = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        color: 0x0b1b3f,
        shininess: 40,
      }),
    []
  );

  /* ------------------------------ Plume (FX) -------------------------------- */

  // Small ejecta plume at the surface contact point
  const PLUME_COUNT = 160;
  const plumePositions = useMemo(() => new Float32Array(PLUME_COUNT * 3), []);
  const plumeVel = useMemo(() => new Float32Array(PLUME_COUNT * 3), []);
  const plumeLife = useMemo(() => new Float32Array(PLUME_COUNT), []);
  const plumeGeom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(plumePositions, 3));
    return g;
  }, [plumePositions]);
  const plumeMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 0.08,
        color: 0xaec7ff,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );

  const respawnPlumeParticle = (i: number, hit: THREE.Vector3, normal: THREE.Vector3) => {
    plumePositions[i * 3 + 0] = hit.x + (Math.random() - 0.5) * 0.05;
    plumePositions[i * 3 + 1] = hit.y + (Math.random() - 0.5) * 0.05;
    plumePositions[i * 3 + 2] = hit.z + (Math.random() - 0.5) * 0.05;

    // Velocity mostly along normal, with slight sideways spread
    const spread = new THREE.Vector3(
      (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.3
    );
    const v = normal
      .clone()
      .multiplyScalar(0.6 + Math.random() * 0.6)
      .add(spread.multiplyScalar(0.25));
    plumeVel[i * 3 + 0] = v.x;
    plumeVel[i * 3 + 1] = v.y;
    plumeVel[i * 3 + 2] = v.z;

    plumeLife[i] = 0.9 + Math.random() * 0.6; // seconds
  };

  /* --------------------------------- Frame ---------------------------------- */

  useFrame(({ clock }) => {
    if (!isActive) {
      started.current = false;
      finished.current = false;
      approachDone.current = false;
      if (beamCoreRef.current) beamCoreRef.current.visible = false;
      if (beamHaloRef.current) beamHaloRef.current.visible = false;
      if (hitGlowRef.current) hitGlowRef.current.visible = false;
      if (scorchRef.current) scorchRef.current.visible = false;
      if (plumeRef.current) plumeRef.current.visible = false;
      return;
    }

    if (!started.current) {
      tStart.current = clock.elapsedTime;
      started.current = true;

      // Reset plume lives to zero (spawn on first update)
      for (let i = 0; i < PLUME_COUNT; i++) plumeLife[i] = 0;
    }

    const t = clock.elapsedTime - tStart.current;
    const total = approachSeconds + shepherdSeconds;

    // Approach phase: fly from launchPos -> targetPos
    if (t < approachSeconds) {
      const k = t / approachSeconds;
      const p = new THREE.Vector3().lerpVectors(launchPos, targetPos, k);
      if (shipRef.current) {
        shipRef.current.position.copy(p);
        shipRef.current.lookAt(asteroidPosition);
      }

      // Hide beam/hit fx in approach
      if (beamCoreRef.current) beamCoreRef.current.visible = false;
      if (beamHaloRef.current) beamHaloRef.current.visible = false;
      if (hitGlowRef.current) hitGlowRef.current.visible = false;
      if (scorchRef.current) scorchRef.current.visible = false;
      if (plumeRef.current) plumeRef.current.visible = false;
    } else {
      if (!approachDone.current) approachDone.current = true;

      // Maintain position near asteroid (relative offset retained even as asteroid moves)
      if (shipRef.current) {
        const desired = asteroidPosition.clone().add(targetOffset);
        shipRef.current.position.lerp(desired, 0.12);
        shipRef.current.lookAt(asteroidPosition);
        // tiny idle bob
        shipRef.current.position.y += Math.sin(clock.elapsedTime * 1.2) * 0.06;
      }

      // Compute beam end point on asteroid surface
      const shipPos = shipRef.current?.position || new THREE.Vector3();
      const toAst = asteroidPosition.clone().sub(shipPos);
      const dir = toAst.clone().normalize();
      const dist = Math.max(toAst.length() - asteroidRadius, 0.001); // stop at surface
      const hitPoint = shipPos.clone().add(dir.clone().multiplyScalar(dist));
      const hitNormal = hitPoint.clone().sub(asteroidPosition).normalize();

      // Update beam uniforms & alignment
      const intensityGain = THREE.MathUtils.smoothstep(
        (t - approachSeconds) / 0.8,
        0.0,
        1.0
      ) * 1.1;

      if (beamCoreRef.current && beamHaloRef.current) {
        const mid = shipPos.clone().add(hitPoint).multiplyScalar(0.5);
        const q = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0), // cylinder up
          dir
        );
        const len = hitPoint.distanceTo(shipPos);

        // Core
        beamCoreRef.current.visible = true;
        beamCoreRef.current.position.copy(mid);
        beamCoreRef.current.quaternion.copy(q);
        (beamCoreRef.current.material as THREE.ShaderMaterial).uniforms.time.value = clock.elapsedTime;
        (beamCoreRef.current.material as THREE.ShaderMaterial).uniforms.intensity.value = intensityGain;
        beamCoreRef.current.scale.set(1, len / 2, 1); // Y is length/2

        // Halo
        beamHaloRef.current.visible = true;
        beamHaloRef.current.position.copy(mid);
        beamHaloRef.current.quaternion.copy(q);
        (beamHaloRef.current.material as THREE.ShaderMaterial).uniforms.time.value = clock.elapsedTime;
        (beamHaloRef.current.material as THREE.ShaderMaterial).uniforms.intensity.value = intensityGain * 1.0;
        beamHaloRef.current.scale.set(1, len / 2, 1);
      }

      // Surface FX at hit point
      const pulse = 1 + Math.sin(clock.elapsedTime * 9) * 0.25;

      if (hitGlowRef.current) {
        hitGlowRef.current.visible = true;
        hitGlowRef.current.position.copy(hitPoint);
        hitGlowRef.current.scale.setScalar(0.55 * pulse);
      }

      if (scorchRef.current) {
        scorchRef.current.visible = true;
        // Place a tiny plane slightly above the surface, facing outwards
        const n = hitNormal.clone();
        const tangent = new THREE.Vector3(0, 1, 0).cross(n).normalize();
        if (tangent.lengthSq() < 0.001) tangent.set(1, 0, 0);
        const bitangent = n.clone().cross(tangent).normalize();
        const m = new THREE.Matrix4().makeBasis(tangent, n, bitangent); // columns = x=tangent,y=normal,z=bitangent
        scorchRef.current.position.copy(hitPoint.clone().add(n.multiplyScalar(0.01)));
        scorchRef.current.setRotationFromMatrix(m);
        scorchRef.current.scale.setScalar(0.8 + Math.sin(clock.elapsedTime * 3) * 0.1);
        (scorchRef.current.material as THREE.MeshBasicMaterial).opacity = 0.35 + 0.25 * Math.sin(clock.elapsedTime * 5);
      }

      // Ablation plume particles
      if (plumeRef.current) {
        plumeRef.current.visible = true;

        // First-time respawn
        for (let i = 0; i < PLUME_COUNT; i++) {
          if (plumeLife[i] <= 0) respawnPlumeParticle(i, hitPoint, hitNormal);
        }

        const dt = 1 / 60; // approx
        for (let i = 0; i < PLUME_COUNT; i++) {
          // Integrate simple motion
          plumePositions[i * 3 + 0] += plumeVel[i * 3 + 0] * dt;
          plumePositions[i * 3 + 1] += plumeVel[i * 3 + 1] * dt;
          plumePositions[i * 3 + 2] += plumeVel[i * 3 + 2] * dt;

          // Small turbulence
          plumeVel[i * 3 + 0] += (Math.random() - 0.5) * 0.02 * dt;
          plumeVel[i * 3 + 1] += (Math.random() - 0.5) * 0.02 * dt;
          plumeVel[i * 3 + 2] += (Math.random() - 0.5) * 0.02 * dt;

          // Fade life
          plumeLife[i] -= dt;
          if (plumeLife[i] <= 0) respawnPlumeParticle(i, hitPoint, hitNormal);
        }
        plumeGeom.attributes.position.needsUpdate = true;
      }

      // Apply continuous push away from ship → asteroid direction
      if (t - lastPush.current > 0.05) {
        const push = dir.clone().multiplyScalar(
          deflectionStrength * (0.9 + 0.4 * Math.sin(clock.elapsedTime * 2.0))
        );
        onDeflect?.(push);
        lastPush.current = t;
      }
    }

    // Finish
    if (t > approachSeconds + shepherdSeconds && !finished.current) {
      finished.current = true;
      onComplete?.();
    }
  });

  /* --------------------------------- Mount ---------------------------------- */

  useEffect(() => {
    // Clean up shader materials on unmount to avoid WebGL leaks
    return () => {
      beamCoreMaterial.dispose();
      beamHaloMaterial.dispose();
      coreGeom.dispose();
      haloGeom.dispose();
      hullGeom.dispose();
      ionBellGeom.dispose();
      panelGeom.dispose();
      plumeGeom.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isActive) return null;

  return (
    <group ref={rootRef}>
      {/* Spacecraft */}
      <group ref={shipRef}>
        {/* Hull */}
        <mesh geometry={hullGeom} material={hullMat} />
        {/* Ion engine bell */}
        <mesh
          geometry={ionBellGeom}
          material={ionBellMat}
          position={[1.15, 0, 0]}
          rotation={[0, 0, Math.PI / 2]}
        />
        {/* Solar panels */}
        <mesh geometry={panelGeom} material={panelMat} position={[0, 1.5, 0]} />
        <mesh geometry={panelGeom} material={panelMat} position={[0, -1.5, 0]} />
      </group>

      {/* Beam core & halo (aligned every frame) */}
      <mesh ref={beamCoreRef} geometry={coreGeom} material={beamCoreMaterial} visible={false} />
      <mesh ref={beamHaloRef} geometry={haloGeom} material={beamHaloMaterial} visible={false} />

      {/* Surface hit FX */}
      <mesh ref={hitGlowRef} visible={false}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <primitive object={hitGlowMaterial} attach="material" />
      </mesh>

      {/* Scorch decal (tiny plane aligned to surface normal) */}
      <mesh ref={scorchRef} visible={false}>
        <planeGeometry args={[0.8, 0.8]} />
        <primitive object={scorchMaterial} attach="material" />
      </mesh>

      {/* Ablation plume */}
      <points ref={plumeRef} geometry={plumeGeom} material={plumeMat} visible={false} />
    </group>
  );
};

export default IonBeamShepherd;

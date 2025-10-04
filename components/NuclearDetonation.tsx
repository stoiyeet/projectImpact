// components/NuclearDetonation.tsx
"use client";
import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface NuclearDetonationProps {
  position: [number, number, number];
  isActive: boolean;
  onComplete?: () => void;
  onDestroy?: () => void; // Called when asteroid should be destroyed
}

const NuclearDetonation: React.FC<NuclearDetonationProps> = ({
  position,
  isActive,
  onComplete,
  onDestroy,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const missileRef = useRef<THREE.Group>(null);
  const explosionRef = useRef<THREE.Mesh>(null);
  const shockwaveRef = useRef<THREE.Mesh>(null);
  const flashRef = useRef<THREE.Mesh>(null);
  const debrisRef = useRef<THREE.Points>(null);
  const trailRef = useRef<THREE.Points>(null);
  
  const startTime = useRef<number>(0);
  const hasStarted = useRef<boolean>(false);
  const isComplete = useRef<boolean>(false);
  const missileHasImpacted = useRef<boolean>(false);
  const hasDestroyed = useRef<boolean>(false);

  // Missile launch position (from Earth's direction)
  const launchPosition = useMemo(() => {
    const targetPos = new THREE.Vector3(...position);
    const earthPos = new THREE.Vector3(0, 0, 0);
    const direction = targetPos.clone().sub(earthPos).normalize();
    return earthPos.clone().add(direction.multiplyScalar(35)); // Launch from close to Earth
  }, [position]);

  // Create missile geometry and material
  const missileGeometry = useMemo(() => {
    const geometry = new THREE.CylinderGeometry(0.1, 0.2, 2, 8);
    geometry.rotateZ(Math.PI / 2); // Point it horizontally
    return geometry;
  }, []);

  const missileMaterial = useMemo(
    () => new THREE.MeshPhongMaterial({
      color: 0x333333,
      shininess: 100,
      emissive: 0x110000,
    }),
    []
  );

  // Create missile trail
  const trailGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(100 * 3);
    const colors = new Float32Array(100 * 3);
    
    for (let i = 0; i < 100; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      
      const intensity = (100 - i) / 100;
      colors[i * 3] = 1.0 * intensity; // Red
      colors[i * 3 + 1] = 0.5 * intensity; // Green
      colors[i * 3 + 2] = 0.0; // Blue
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    return geometry;
  }, []);

  const trailMaterial = useMemo(
    () => new THREE.PointsMaterial({
      size: 0.3,
      transparent: true,
      opacity: 0.8,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
    }),
    []
  );

  // Create explosion sphere geometry and material
  const explosionMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          intensity: { value: 1.0 },
          color1: { value: new THREE.Color(1, 0.8, 0) }, // Orange
          color2: { value: new THREE.Color(1, 0.2, 0) }, // Red
          color3: { value: new THREE.Color(1, 1, 1) }, // White
        },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vPosition;
          uniform float time;
          
          void main() {
            vUv = uv;
            vPosition = position;
            
            // Animate explosion expansion
            vec3 pos = position;
            float expansionFactor = 1.0 + time * 12.0;
            pos *= expansionFactor;
            
            // Add noise to make explosion irregular
            float noise = sin(pos.x * 15.0 + time * 25.0) * 
                         sin(pos.y * 15.0 + time * 25.0) * 
                         sin(pos.z * 15.0 + time * 25.0) * 0.15;
            pos += normalize(pos) * noise;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          varying vec3 vPosition;
          uniform float time;
          uniform float intensity;
          uniform vec3 color1;
          uniform vec3 color2;
          uniform vec3 color3;
          
          void main() {
            float dist = length(vPosition);
            float t = clamp(time * 2.0, 0.0, 1.0);
            
            // Create fireball gradient
            vec3 color = mix(color3, color1, smoothstep(0.0, 0.4, dist));
            color = mix(color, color2, smoothstep(0.4, 1.0, dist));
            
            // Add intense pulsing effect
            float pulse = sin(time * 40.0) * 0.4 + 0.6;
            color *= pulse;
            
            // More dramatic fade
            float fadeOut = 1.0 - smoothstep(0.7, 1.3, time);
            
            gl_FragColor = vec4(color, intensity * fadeOut * (1.2 - dist * 0.6));
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  // Create shockwave material
  const shockwaveMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          color: { value: new THREE.Color(0.8, 0.9, 1.0) },
        },
        vertexShader: `
          varying vec2 vUv;
          uniform float time;
          
          void main() {
            vUv = uv;
            vec3 pos = position;
            
            // Expand shockwave faster
            float expansion = time * 25.0;
            pos *= (1.0 + expansion);
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          uniform float time;
          uniform vec3 color;
          
          void main() {
            float dist = length(vUv - 0.5) * 2.0;
            float ring = smoothstep(0.7, 1.0, dist) * smoothstep(1.0, 0.7, dist);
            float fadeOut = 1.0 - smoothstep(0.3, 1.2, time);
            
            gl_FragColor = vec4(color, ring * fadeOut * 0.5);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  // Create flash material
  const flashMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(3, 3, 3),
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      }),
    []
  );

  // Create debris particles
  const debrisGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(800 * 3);
    const velocities = new Float32Array(800 * 3);
    
    for (let i = 0; i < 800; i++) {
      // Random positions around explosion center
      positions[i * 3] = (Math.random() - 0.5) * 3;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 3;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 3;
      
      // Random velocities with higher intensity
      velocities[i * 3] = (Math.random() - 0.5) * 30;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 30;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    
    return geometry;
  }, []);

  const debrisMaterial = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: new THREE.Color(1, 0.6, 0.1),
        size: 0.15,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  useFrame((state) => {
    if (!isActive) {
      hasStarted.current = false;
      isComplete.current = false;
      missileHasImpacted.current = false;
      hasDestroyed.current = false;
      return;
    }

    if (!hasStarted.current) {
      startTime.current = state.clock.elapsedTime;
      hasStarted.current = true;
    }

    const elapsed = state.clock.elapsedTime - startTime.current;
    const flightDuration = 2.0; // 2 seconds flight time
    const explosionDuration = 4.0; // 4 seconds explosion
    const totalDuration = flightDuration + explosionDuration;

    // Phase 1: Missile flight
    if (elapsed < flightDuration) {
      const flightProgress = elapsed / flightDuration;
      
      if (missileRef.current && trailRef.current) {
        // Interpolate missile position
        const currentPos = new THREE.Vector3().lerpVectors(
          new THREE.Vector3(...launchPosition.toArray()),
          new THREE.Vector3(...position),
          flightProgress
        );
        
        missileRef.current.position.copy(currentPos);
        missileRef.current.visible = true;
        
        // Point missile toward target
        const direction = new THREE.Vector3(...position).sub(currentPos).normalize();
        missileRef.current.lookAt(currentPos.clone().add(direction));
        
        // Update trail
        const trailPositions = trailGeometry.attributes.position.array as Float32Array;
        for (let i = 99; i > 0; i--) {
          trailPositions[i * 3] = trailPositions[(i - 1) * 3];
          trailPositions[i * 3 + 1] = trailPositions[(i - 1) * 3 + 1];
          trailPositions[i * 3 + 2] = trailPositions[(i - 1) * 3 + 2];
        }
        trailPositions[0] = currentPos.x;
        trailPositions[1] = currentPos.y;
        trailPositions[2] = currentPos.z;
        
        trailGeometry.attributes.position.needsUpdate = true;
        trailRef.current.visible = true;
      }
    }
    // Phase 2: Impact and explosion
    else {
      // Hide missile and trail after impact
      if (missileRef.current) missileRef.current.visible = false;
      if (trailRef.current) trailRef.current.visible = false;
      
      if (!missileHasImpacted.current) {
        missileHasImpacted.current = true;
      }
      
      const explosionElapsed = elapsed - flightDuration;
      const explosionProgress = Math.min(explosionElapsed / explosionDuration, 1);
      
      // Destroy asteroid early in explosion (after 0.5 seconds)
      if (explosionElapsed > 0.5 && !hasDestroyed.current) {
        hasDestroyed.current = true;
        onDestroy?.();
      }

      // Update explosion effects
      if (explosionRef.current && explosionMaterial) {
        explosionMaterial.uniforms.time.value = explosionProgress;
        explosionMaterial.uniforms.intensity.value = Math.max(0, 1.2 - explosionProgress * 0.9);
      }

      // Update shockwave
      if (shockwaveRef.current && shockwaveMaterial) {
        shockwaveMaterial.uniforms.time.value = explosionProgress;
      }

      // Update flash (intense initial flash)
      if (flashRef.current && flashMaterial) {
        if (explosionProgress < 0.15) {
          flashMaterial.opacity = (1 - explosionProgress * 6.67) * 1.0;
        } else {
          flashMaterial.opacity = 0;
        }
      }

      // Update debris
      if (debrisRef.current && debrisGeometry) {
        const positions = debrisGeometry.attributes.position.array as Float32Array;
        const velocities = debrisGeometry.attributes.velocity.array as Float32Array;
        
        for (let i = 0; i < positions.length; i += 3) {
          positions[i] += velocities[i] * 0.02 * explosionProgress;
          positions[i + 1] += velocities[i + 1] * 0.02 * explosionProgress;
          positions[i + 2] += velocities[i + 2] * 0.02 * explosionProgress;
        }
        
        debrisGeometry.attributes.position.needsUpdate = true;
        debrisMaterial.opacity = Math.max(0, 0.9 - explosionProgress);
      }

      // Intense screen shake effect
      if (explosionProgress < 0.6) {
        const shakeIntensity = (0.6 - explosionProgress) * 0.4;
        state.camera.position.add(
          new THREE.Vector3(
            (Math.random() - 0.5) * shakeIntensity,
            (Math.random() - 0.5) * shakeIntensity,
            (Math.random() - 0.5) * shakeIntensity
          )
        );
      }
    }

    // Complete the effect
    if (elapsed > totalDuration && !isComplete.current) {
      isComplete.current = true;
      onComplete?.();
    }
  });

  if (!isActive) return null;

  return (
    <group ref={groupRef}>
      {/* Nuclear Missile */}
      <group ref={missileRef}>
        <mesh geometry={missileGeometry} material={missileMaterial} />
        {/* Missile fins */}
        <mesh position={[-0.8, 0, 0]}>
          <boxGeometry args={[0.1, 0.4, 0.05]} />
          <meshPhongMaterial color={0x444444} />
        </mesh>
        <mesh position={[-0.8, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.1, 0.4, 0.05]} />
          <meshPhongMaterial color={0x444444} />
        </mesh>
        {/* Engine glow */}
        <mesh position={[-1.2, 0, 0]}>
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshBasicMaterial color={0xff4400} transparent opacity={0.8} />
        </mesh>
      </group>
      
      {/* Missile trail */}
      <points ref={trailRef} geometry={trailGeometry} material={trailMaterial} />
      
      {/* Explosion effects positioned at target */}
      <group position={position}>
        {/* Main explosion fireball */}
        <mesh ref={explosionRef} material={explosionMaterial}>
          <sphereGeometry args={[2, 32, 32]} />
        </mesh>
        
        {/* Shockwave */}
        <mesh ref={shockwaveRef} material={shockwaveMaterial}>
          <sphereGeometry args={[3, 32, 32]} />
        </mesh>
        
        {/* Initial flash */}
        <mesh ref={flashRef} material={flashMaterial}>
          <sphereGeometry args={[8, 16, 16]} />
        </mesh>
        
        {/* Debris particles */}
        <points ref={debrisRef} geometry={debrisGeometry} material={debrisMaterial} />
      </group>
    </group>
  );
};

export default NuclearDetonation;
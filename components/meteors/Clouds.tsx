// components/Clouds.tsx

import * as THREE from 'three';
import React, { useRef, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';

const CLOUDS_RADIUS = 1.006;
const BASE_ROTATION_SPEED = 0.0003;
const CLOUD_PARTICLES = 2000;
const EXPLOSION_FORCE = 8.0;
const RECOVERY_RATE = 0.5;

interface CloudParticle {
  originalPosition: THREE.Vector3;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  size: number;
  opacity: number;
  blastVelocity: THREE.Vector3;
  distanceFromImpact: number;
}

export default function Clouds({
  intensity = 1,
  impactPosition = null,
  blastRadius = 0,
  explosionStrength = 0,
}: {
  intensity?: number;
  impactPosition?: THREE.Vector3 | null;
  blastRadius?: number;
  explosionStrength?: number;
}) {
  const cloudRef = useRef<THREE.Group>(null!);
  const particleSystemRef = useRef<THREE.Points>(null!);
  const texture = useLoader(TextureLoader, '/textures/earthClouds.png');
  
  // Create cloud particles
  const { geometry, material, particles } = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(CLOUD_PARTICLES * 3);
    const sizes = new Float32Array(CLOUD_PARTICLES);
    const opacities = new Float32Array(CLOUD_PARTICLES);
    const particles: CloudParticle[] = [];

    for (let i = 0; i < CLOUD_PARTICLES; i++) {
      // Distribute particles in a spherical shell around Earth
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.acos(1 - 2 * Math.random());
      
      const x = CLOUDS_RADIUS * Math.sin(theta) * Math.cos(phi);
      const y = CLOUDS_RADIUS * Math.sin(theta) * Math.sin(phi);
      const z = CLOUDS_RADIUS * Math.cos(theta);
      
      const originalPos = new THREE.Vector3(x, y, z);
      
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      
      const size = 0.02 + Math.random() * 0.04;
      sizes[i] = size;
      opacities[i] = 0.3 + Math.random() * 0.7;
      
      particles.push({
        originalPosition: originalPos.clone(),
        position: originalPos.clone(),
        velocity: new THREE.Vector3(0, 0, 0),
        size,
        opacity: opacities[i],
        blastVelocity: new THREE.Vector3(0, 0, 0),
        distanceFromImpact: 0
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: texture },
        time: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        attribute float opacity;
        varying float vOpacity;
        varying vec2 vUv;
        
        void main() {
          vOpacity = opacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        uniform float time;
        varying float vOpacity;
        
        void main() {
          vec2 coords = gl_PointCoord;
          vec4 textureColor = texture2D(pointTexture, coords);
          
          // Add some animation to the cloud texture
          float pulse = sin(time * 2.0) * 0.1 + 0.9;
          
          gl_FragColor = vec4(textureColor.rgb, textureColor.a * vOpacity * pulse);
        }
      `,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false
    });

    return { geometry, material, particles };
  }, [texture]);

  // Animation loop
  useFrame((state, delta) => {
    if (!cloudRef.current || !particleSystemRef.current) return;

    const time = state.clock.elapsedTime;
    material.uniforms.time.value = time;

    // Base rotation
    cloudRef.current.rotation.y += BASE_ROTATION_SPEED;

    // Update particle positions
    const positions = particleSystemRef.current.geometry.attributes.position.array as Float32Array;
    const opacities = particleSystemRef.current.geometry.attributes.opacity.array as Float32Array;

    particles.forEach((particle, i) => {
      // Apply explosion force if impact occurred
      if (impactPosition && explosionStrength > 0) {
        const distanceFromImpact = particle.position.distanceTo(impactPosition);
        particle.distanceFromImpact = distanceFromImpact;
        
        // Calculate blast force based on distance
        const maxBlastDistance = blastRadius * 2;
        if (distanceFromImpact < maxBlastDistance) {
          const forceMagnitude = EXPLOSION_FORCE * explosionStrength * 
            (1 - distanceFromImpact / maxBlastDistance) * 
            (1 - distanceFromImpact / maxBlastDistance); // Quadratic falloff
          
          const forceDirection = particle.position.clone()
            .sub(impactPosition)
            .normalize();
          
          const blastForce = forceDirection.multiplyScalar(forceMagnitude);
          particle.blastVelocity.add(blastForce.multiplyScalar(delta * 10));
        }
      }

      // Apply velocities and physics
      particle.velocity.multiplyScalar(0.98); // Air resistance
      particle.blastVelocity.multiplyScalar(0.95); // Blast velocity decay
      
      // Combine natural drift with blast velocity
      const naturalDrift = new THREE.Vector3(
        Math.sin(time * 0.1 + i * 0.1) * 0.001,
        Math.cos(time * 0.15 + i * 0.2) * 0.001,
        Math.sin(time * 0.08 + i * 0.3) * 0.001
      );
      
      particle.velocity.add(naturalDrift);
      particle.position.add(particle.velocity.clone().multiplyScalar(delta));
      particle.position.add(particle.blastVelocity.clone().multiplyScalar(delta));

      // Gradual recovery towards original position
      const returnForce = particle.originalPosition.clone()
        .sub(particle.position)
        .multiplyScalar(RECOVERY_RATE * delta);
      particle.velocity.add(returnForce);

      // Update buffer attributes
      positions[i * 3] = particle.position.x;
      positions[i * 3 + 1] = particle.position.y;
      positions[i * 3 + 2] = particle.position.z;

      // Adjust opacity based on distance from impact
      let targetOpacity = particle.opacity * intensity;
      if (impactPosition && explosionStrength > 0) {
        const impactEffect = Math.max(0, 1 - (particle.distanceFromImpact / (blastRadius * 3)));
        targetOpacity *= (1 - impactEffect * 0.8); // Reduce opacity near impact
      }
      
      opacities[i] = THREE.MathUtils.lerp(opacities[i], targetOpacity, delta * 2);
    });

    // Mark attributes as needing update
    particleSystemRef.current.geometry.attributes.position.needsUpdate = true;
    particleSystemRef.current.geometry.attributes.opacity.needsUpdate = true;
  });

  return (
    <group ref={cloudRef}>
      {/* 3D Particle Clouds */}
      <points ref={particleSystemRef} geometry={geometry} material={material} />
      
      {/* Additional cloud layers for depth */}
      <mesh renderOrder={0}>
        <sphereGeometry args={[CLOUDS_RADIUS * 0.998, 64, 64]} />
        <meshPhongMaterial
          map={texture}
          opacity={0.15 * intensity}
          transparent
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </mesh>
      
      <mesh renderOrder={0}>
        <sphereGeometry args={[CLOUDS_RADIUS * 1.002, 64, 64]} />
        <meshPhongMaterial
          map={texture}
          opacity={0.1 * intensity}
          transparent
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </mesh>
    </group>
  );
}
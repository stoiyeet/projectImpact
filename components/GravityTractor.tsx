// components/GravityTractor.tsx
"use client";
import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface GravityTractorProps {
  asteroidPosition: THREE.Vector3;
  isActive: boolean;
  onComplete?: () => void;
  onDeflect?: (delta: THREE.Vector3) => void; // Called to apply deflection
}

const GravityTractor: React.FC<GravityTractorProps> = ({
  asteroidPosition,
  isActive,
  onComplete,
  onDeflect,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const spacecraftRef = useRef<THREE.Group>(null);
  const thrusterRef = useRef<THREE.Points>(null);
  const tractorBeamRef = useRef<THREE.Mesh>(null);
  const gravityFieldRef = useRef<THREE.Points>(null);
  
  const startTime = useRef<number>(0);
  const hasStarted = useRef<boolean>(false);
  const isComplete = useRef<boolean>(false);
  const approachComplete = useRef<boolean>(false);
  const lastDeflectionTime = useRef<number>(0);

  // Spacecraft approach position (offset from asteroid)
  const targetPosition = useMemo(() => {
    const offset = new THREE.Vector3(3, 2, 1); // Stay close to asteroid
    return asteroidPosition.clone().add(offset);
  }, [asteroidPosition]);

  // Launch position (from Earth's direction)
  const launchPosition = useMemo(() => {
    const earthPos = new THREE.Vector3(0, 0, 0);
    const direction = asteroidPosition.clone().sub(earthPos).normalize();
    return earthPos.clone().add(direction.multiplyScalar(20));
  }, [asteroidPosition]);

  // Spacecraft geometry and materials
  const spacecraftGeometry = useMemo(() => {
    const geometry = new THREE.CylinderGeometry(0.3, 0.5, 1.5, 8);
    geometry.rotateZ(Math.PI / 2); // Point horizontally
    return geometry;
  }, []);

  const spacecraftMaterial = useMemo(
    () => new THREE.MeshPhongMaterial({
      color: 0x2244aa,
      shininess: 100,
      emissive: 0x001122,
    }),
    []
  );

  // Solar panels
  const solarPanelGeometry = useMemo(() => new THREE.BoxGeometry(2, 0.05, 1), []);
  const solarPanelMaterial = useMemo(
    () => new THREE.MeshPhongMaterial({
      color: 0x001133,
      shininess: 50,
    }),
    []
  );

  // Thruster particles
  const thrusterGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(50 * 3);
    const colors = new Float32Array(50 * 3);
    
    for (let i = 0; i < 50; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
      
      const intensity = Math.random();
      colors[i * 3] = 0.2 + intensity * 0.8; // Blue
      colors[i * 3 + 1] = 0.6 + intensity * 0.4; // Cyan
      colors[i * 3 + 2] = 1.0; // Full blue
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    return geometry;
  }, []);

  const thrusterMaterial = useMemo(
    () => new THREE.PointsMaterial({
      size: 0.1,
      transparent: true,
      opacity: 0.8,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
    }),
    []
  );

  // Tractor beam effect
  const tractorBeamMaterial = useMemo(
    () => new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        opacity: { value: 0.3 },
        color: { value: new THREE.Color(0.3, 0.7, 1.0) },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        uniform float time;
        
        void main() {
          vUv = uv;
          vPosition = position;
          
          // Subtle beam animation
          vec3 pos = position;
          pos.x += sin(pos.y * 20.0 + time * 10.0) * 0.05;
          pos.z += cos(pos.y * 15.0 + time * 8.0) * 0.03;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        uniform float time;
        uniform float opacity;
        uniform vec3 color;
        
        void main() {
          float dist = length(vUv - 0.5) * 2.0;
          float beam = 1.0 - smoothstep(0.0, 1.0, dist);
          
          // Pulsing effect
          float pulse = sin(time * 5.0) * 0.3 + 0.7;
          beam *= pulse;
          
          gl_FragColor = vec4(color, beam * opacity);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
    []
  );

  // Gravity field visualization
  const gravityFieldGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(200 * 3);
    const colors = new Float32Array(200 * 3);
    
    for (let i = 0; i < 200; i++) {
      // Create particles in a sphere around the spacecraft
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = 2 * Math.PI * Math.random();
      const radius = 1 + Math.random() * 3;
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      
      const intensity = 1 - (radius - 1) / 3; // Fade with distance
      colors[i * 3] = 0.8 * intensity; // Purple
      colors[i * 3 + 1] = 0.3 * intensity;
      colors[i * 3 + 2] = 1.0 * intensity;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    return geometry;
  }, []);

  const gravityFieldMaterial = useMemo(
    () => new THREE.PointsMaterial({
      size: 0.05,
      transparent: true,
      opacity: 0.6,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
    }),
    []
  );

  useFrame((state) => {
    if (!isActive) {
      hasStarted.current = false;
      isComplete.current = false;
      approachComplete.current = false;
      lastDeflectionTime.current = 0;
      return;
    }

    if (!hasStarted.current) {
      startTime.current = state.clock.elapsedTime;
      hasStarted.current = true;
    }

    const elapsed = state.clock.elapsedTime - startTime.current;
    const approachDuration = 3.0; // 3 seconds to reach asteroid
    const tractorDuration = 8.0; // 8 seconds of gravitational traction
    const totalDuration = approachDuration + tractorDuration;

    // Phase 1: Approach asteroid
    if (elapsed < approachDuration) {
      const approachProgress = elapsed / approachDuration;
      
      if (spacecraftRef.current) {
        // Interpolate spacecraft position
        const currentPos = new THREE.Vector3().lerpVectors(
          launchPosition,
          targetPosition,
          approachProgress
        );
        
        spacecraftRef.current.position.copy(currentPos);
        spacecraftRef.current.visible = true;
        
        // Point spacecraft toward asteroid
        spacecraftRef.current.lookAt(asteroidPosition);
        
        // Show thruster during approach
        if (thrusterRef.current) {
          thrusterRef.current.visible = true;
          
          // Animate thruster particles
          const positions = thrusterGeometry.attributes.position.array as Float32Array;
          for (let i = 0; i < positions.length; i += 3) {
            positions[i] -= 0.1; // Move particles backward
            if (positions[i] < -2) positions[i] = 0.5; // Reset position
          }
          thrusterGeometry.attributes.position.needsUpdate = true;
        }
      }
    }
    // Phase 2: Gravitational traction
    else {
      if (!approachComplete.current) {
        approachComplete.current = true;
        if (thrusterRef.current) thrusterRef.current.visible = false;
      }
      
      const tractorElapsed = elapsed - approachDuration;
      const tractorProgress = Math.min(tractorElapsed / tractorDuration, 1);
      
      if (spacecraftRef.current) {
        // Keep spacecraft in position relative to asteroid
        const currentOffset = targetPosition.clone().sub(asteroidPosition);
        spacecraftRef.current.position.copy(asteroidPosition.clone().add(currentOffset));
        spacecraftRef.current.lookAt(asteroidPosition);
        
        // Gentle oscillation to show active positioning
        const oscillation = Math.sin(elapsed * 2) * 0.2;
        spacecraftRef.current.position.y += oscillation;
      }
      
      // Show tractor beam and gravity field
      if (tractorBeamRef.current) {
        tractorBeamRef.current.visible = true;
        tractorBeamMaterial.uniforms.time.value = elapsed;
        tractorBeamMaterial.uniforms.opacity.value = 0.4 * (1 - tractorProgress * 0.3);
      }
      
      if (gravityFieldRef.current) {
        gravityFieldRef.current.visible = true;
        
        // Animate gravity field particles
        const positions = gravityFieldGeometry.attributes.position.array as Float32Array;
        for (let i = 0; i < positions.length; i += 3) {
          const angle = elapsed * 2 + i * 0.1;
          const radius = 1 + Math.sin(angle) * 0.5 + (i / 600) * 2;
          const phi = Math.acos(2 * ((i / 3) % 100) / 100 - 1);
          const theta = 2 * Math.PI * ((i / 3) % 100) / 100 + elapsed;
          
          positions[i] = radius * Math.sin(phi) * Math.cos(theta);
          positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
          positions[i + 2] = radius * Math.cos(phi);
        }
        gravityFieldGeometry.attributes.position.needsUpdate = true;
        
        gravityFieldMaterial.opacity = 0.6 * (1 - tractorProgress * 0.5);
      }
      
      // Apply gradual deflection to asteroid
      if (elapsed - lastDeflectionTime.current > 0.1) { // Every 100ms
        const deflectionStrength = 0.05 * (1 + tractorProgress); // Increase over time
        const deflectionDirection = new THREE.Vector3(1, 0.3, 0.2).normalize();
        const deflection = deflectionDirection.multiplyScalar(deflectionStrength);
        
        onDeflect?.(deflection);
        lastDeflectionTime.current = elapsed;
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
      {/* Gravity Tractor Spacecraft */}
      <group ref={spacecraftRef}>
        {/* Main body */}
        <mesh geometry={spacecraftGeometry} material={spacecraftMaterial} />
        
        {/* Solar panels */}
        <mesh position={[0, 1, 0]} geometry={solarPanelGeometry} material={solarPanelMaterial} />
        <mesh position={[0, -1, 0]} geometry={solarPanelGeometry} material={solarPanelMaterial} />
        
        {/* Communication dish */}
        <mesh position={[0.5, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.1, 16]} />
          <meshPhongMaterial color={0xaaaaaa} />
        </mesh>
        
        {/* Thruster glow (rear of spacecraft) */}
        <mesh position={[-1, 0, 0]}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshBasicMaterial color={0x4488ff} transparent opacity={0.8} />
        </mesh>
        
        {/* Thruster particles */}
        <points ref={thrusterRef} geometry={thrusterGeometry} material={thrusterMaterial} position={[-1.5, 0, 0]} />
        
        {/* Gravity field visualization */}
        <points ref={gravityFieldRef} geometry={gravityFieldGeometry} material={gravityFieldMaterial} />
      </group>
      
      {/* Tractor beam connecting spacecraft to asteroid */}
      <mesh ref={tractorBeamRef} material={tractorBeamMaterial} visible={false}>
        <cylinderGeometry args={[0.1, 0.2, 4, 8]} />
      </mesh>
    </group>
  );
};

export default GravityTractor;
// components/KineticImpactor.tsx
"use client";
import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface KineticImpactorProps {
  asteroidPosition: THREE.Vector3;
  isActive: boolean;
  onComplete?: () => void;
}

const KineticImpactor: React.FC<KineticImpactorProps> = ({
  asteroidPosition,
  isActive,
  onComplete,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const impactorRef = useRef<THREE.Group>(null);
  const explosionRef = useRef<THREE.Mesh>(null);
  const shockwaveRef = useRef<THREE.Mesh>(null);
  const flashRef = useRef<THREE.Mesh>(null);
  const debrisRef = useRef<THREE.Points>(null);
  const trailRef = useRef<THREE.Points>(null);
  const engineGlowRef = useRef<THREE.Mesh>(null);
  
  const startTime = useRef<number>(0);
  const hasStarted = useRef<boolean>(false);
  const isComplete = useRef<boolean>(false);
  const hasImpacted = useRef<boolean>(false);

  // Launch position (from Earth's direction)
  const launchPosition = useMemo(() => {
    const targetPos = asteroidPosition.clone();
    const earthPos = new THREE.Vector3(0, 0, 0);
    const direction = targetPos.clone().sub(earthPos).normalize();
    return earthPos.clone().add(direction.multiplyScalar(25)); // Launch from near Earth
  }, [asteroidPosition]);

  // Create impactor geometry and materials
  const impactorGeometry = useMemo(() => {
    const geometry = new THREE.CylinderGeometry(0.3, 0.5, 2.5, 8);
    geometry.rotateZ(Math.PI / 2); // Point it horizontally
    return geometry;
  }, []);

  const impactorMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: 0xE0E0E0,
      metalness: 0.9,
      roughness: 0.1,
    }),
    []
  );

  const noseConeGeometry = useMemo(() => {
    const geometry = new THREE.ConeGeometry(0.3, 0.6, 8);
    geometry.rotateZ(Math.PI / 2);
    return geometry;
  }, []);

  const noseConeMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: 0xA0A0A0,
      metalness: 0.8,
      roughness: 0.2,
    }),
    []
  );

  // Create engine trail
  const trailGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(50 * 3);
    const colors = new Float32Array(50 * 3);
    
    for (let i = 0; i < 50; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      
      const intensity = (50 - i) / 50;
      colors[i * 3] = 1.0 * intensity; // Red
      colors[i * 3 + 1] = 0.4 * intensity; // Green
      colors[i * 3 + 2] = 0.0; // Blue
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    return geometry;
  }, []);

  const trailMaterial = useMemo(
    () => new THREE.PointsMaterial({
      size: 0.2,
      transparent: true,
      opacity: 0.7,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
    }),
    []
  );

  // Create dust cloud material
  const dustCloudMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          intensity: { value: 1.0 },
        },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vPosition;
          varying vec3 vNormal;
          uniform float time;
          
          // Noise function
          vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
          vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
          vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
          vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
          
          float snoise(vec3 v) {
            const vec2 C = vec2(1.0/6.0, 1.0/3.0);
            const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
            vec3 i  = floor(v + dot(v, C.yyy));
            vec3 x0 = v - i + dot(i, C.xxx);
            vec3 g = step(x0.yzx, x0.xyz);
            vec3 l = 1.0 - g;
            vec3 i1 = min(g.xyz, l.zxy);
            vec3 i2 = max(g.xyz, l.zxy);
            vec3 x1 = x0 - i1 + C.xxx;
            vec3 x2 = x0 - i2 + C.yyy;
            vec3 x3 = x0 - D.yyy;
            i = mod289(i);
            vec4 p = permute(permute(permute(
                     i.z + vec4(0.0, i1.z, i2.z, 1.0))
                   + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                   + i.x + vec4(0.0, i1.x, i2.x, 1.0));
            float n_ = 0.142857142857;
            vec3 ns = n_ * D.wyz - D.xzx;
            vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
            vec4 x_ = floor(j * ns.z);
            vec4 y_ = floor(j - 7.0 * x_);
            vec4 x = x_ *ns.x + ns.yyyy;
            vec4 y = y_ *ns.x + ns.yyyy;
            vec4 h = 1.0 - abs(x) - abs(y);
            vec4 b0 = vec4(x.xy, y.xy);
            vec4 b1 = vec4(x.zw, y.zw);
            vec4 s0 = floor(b0)*2.0 + 1.0;
            vec4 s1 = floor(b1)*2.0 + 1.0;
            vec4 sh = -step(h, vec4(0.0));
            vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
            vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
            vec3 p0 = vec3(a0.xy, h.x);
            vec3 p1 = vec3(a0.zw, h.y);
            vec3 p2 = vec3(a1.xy, h.z);
            vec3 p3 = vec3(a1.zw, h.w);
            vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
            p0 *= norm.x;
            p1 *= norm.y;
            p2 *= norm.z;
            p3 *= norm.w;
            vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
            m = m * m;
            return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
          }
          
          void main() {
            vUv = uv;
            vNormal = normal;
            vec3 pos = position;
            
            // Expand cloud outward
            float expansionSpeed = 3.0;
            vec3 expandDir = normalize(pos);
            pos += expandDir * time * expansionSpeed;
            
            // Add turbulent motion with noise
            float noise1 = snoise(pos * 0.5 + time * 2.0);
            float noise2 = snoise(pos * 1.0 + time * 1.5);
            float noise3 = snoise(pos * 2.0 + time * 1.0);
            
            pos += expandDir * noise1 * 1.5;
            pos += vec3(noise2, noise3, noise1) * 0.8;
            
            vPosition = pos;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          varying vec3 vPosition;
          varying vec3 vNormal;
          uniform float time;
          uniform float intensity;
          
          void main() {
            // Dust/rock color palette (grays and browns)
            vec3 dustColor1 = vec3(0.4, 0.35, 0.3); // Brown-gray
            vec3 dustColor2 = vec3(0.5, 0.5, 0.5); // Medium gray
            vec3 dustColor3 = vec3(0.3, 0.25, 0.2); // Dark brown
            
            // Vary color based on position
            float colorMix = fract(sin(dot(vPosition.xy, vec2(12.9898, 78.233))) * 43758.5453);
            vec3 color = mix(dustColor1, dustColor2, colorMix);
            color = mix(color, dustColor3, fract(colorMix * 2.5));
            
            // Fade out over time as cloud disperses
            float fadeOut = 1.0 - smoothstep(0.3, 1.0, time);
            
            // Add some variation in opacity
            float opacityNoise = fract(sin(dot(vPosition.xz, vec2(15.234, 91.456))) * 23456.789);
            float opacity = intensity * fadeOut * (0.3 + opacityNoise * 0.4);
            
            gl_FragColor = vec4(color, opacity);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    []
  );

  // Create shockwave material
  const shockwaveMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          color: { value: new THREE.Color(0.6, 0.8, 1.0) },
        },
        vertexShader: `
          varying vec2 vUv;
          uniform float time;
          
          void main() {
            vUv = uv;
            vec3 pos = position;
            
            // Expand shockwave
            float expansion = time * 15.0;
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
            float ring = smoothstep(0.6, 1.0, dist) * smoothstep(1.0, 0.6, dist);
            float fadeOut = 1.0 - smoothstep(0.2, 1.0, time);
            
            gl_FragColor = vec4(color, ring * fadeOut * 0.6);
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
        color: new THREE.Color(2, 2, 2),
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      }),
    []
  );

  // Engine glow material
  const engineGlowMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0xFF4500,
        transparent: true,
        opacity: 0.8,
      }),
    []
  );

  // Create debris chunks (larger rock pieces)
  const debrisGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(200 * 3);
    const velocities = new Float32Array(200 * 3);
    const sizes = new Float32Array(200);
    
    for (let i = 0; i < 200; i++) {
      // Start near center
      positions[i * 3] = (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
      
      // Random outward velocities
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 5 + Math.random() * 10;
      
      velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
      velocities[i * 3 + 2] = Math.cos(phi) * speed;
      
      // Varying sizes for chunks
      sizes[i] = 0.15 + Math.random() * 0.25;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    return geometry;
  }, []);

  const debrisMaterial = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: new THREE.Color(0.35, 0.3, 0.25), // Rocky gray-brown
        size: 0.2,
        transparent: true,
        opacity: 0.9,
        sizeAttenuation: true,
      }),
    []
  );

  useFrame((state) => {
    if (!isActive) {
      hasStarted.current = false;
      isComplete.current = false;
      hasImpacted.current = false;
      return;
    }

    if (!hasStarted.current) {
      startTime.current = state.clock.elapsedTime;
      hasStarted.current = true;
    }

    const elapsed = state.clock.elapsedTime - startTime.current;
    const flightDuration = 2.5; // 2.5 seconds flight time
    const explosionDuration = 3.0; // 3 seconds explosion
    const totalDuration = flightDuration + explosionDuration;

    // Phase 1: Impactor flight
    if (elapsed < flightDuration) {
      const flightProgress = elapsed / flightDuration;
      
      if (impactorRef.current && trailRef.current && engineGlowRef.current) {
        // Interpolate impactor position
        const currentPos = new THREE.Vector3().lerpVectors(
          launchPosition,
          asteroidPosition,
          flightProgress
        );
        
        impactorRef.current.position.copy(currentPos);
        impactorRef.current.visible = true;
        
        // Point impactor toward target
        const direction = asteroidPosition.clone().sub(currentPos).normalize();
        impactorRef.current.lookAt(currentPos.clone().add(direction));
        
        // Engine glow pulsing
        const pulse = 0.6 + Math.sin(elapsed * 15) * 0.4;
        engineGlowMaterial.opacity = pulse;
        const scale = 1 + Math.sin(elapsed * 12) * 0.2;
        engineGlowRef.current.scale.setScalar(scale);
        
        // Update trail
        const trailPositions = trailGeometry.attributes.position.array as Float32Array;
        for (let i = 49; i > 0; i--) {
          trailPositions[i * 3] = trailPositions[(i - 1) * 3];
          trailPositions[i * 3 + 1] = trailPositions[(i - 1) * 3 + 1];
          trailPositions[i * 3 + 2] = trailPositions[(i - 1) * 3 + 2];
        }
        // Add slight offset for engine exhaust position
        const exhaustPos = currentPos.clone().add(direction.clone().multiplyScalar(-1.5));
        trailPositions[0] = exhaustPos.x;
        trailPositions[1] = exhaustPos.y;
        trailPositions[2] = exhaustPos.z;
        
        trailGeometry.attributes.position.needsUpdate = true;
        trailRef.current.visible = true;
      }
    }
    // Phase 2: Impact and explosion
    else {
      // Hide impactor and trail after impact
      if (impactorRef.current) impactorRef.current.visible = false;
      if (trailRef.current) trailRef.current.visible = false;
      
      if (!hasImpacted.current) {
        hasImpacted.current = true;
      }
      
      const explosionElapsed = elapsed - flightDuration;
      const explosionProgress = Math.min(explosionElapsed / explosionDuration, 1);

      // Update explosion effects
      if (explosionRef.current && dustCloudMaterial) {
        dustCloudMaterial.uniforms.time.value = explosionProgress;
        dustCloudMaterial.uniforms.intensity.value = Math.max(0, 1.0 - explosionProgress * 0.8);
        explosionRef.current.visible = true;
      }

      // Update shockwave
      if (shockwaveRef.current && shockwaveMaterial) {
        shockwaveMaterial.uniforms.time.value = explosionProgress;
      }

      // Update flash (very brief initial impact flash)
      if (flashRef.current && flashMaterial) {
        if (explosionProgress < 0.05) {
          flashMaterial.opacity = (1 - explosionProgress * 20) * 0.5;
        } else {
          flashMaterial.opacity = 0;
        }
      }

      // Update debris chunks
      if (debrisRef.current && debrisGeometry) {
        const positions = debrisGeometry.attributes.position.array as Float32Array;
        const velocities = debrisGeometry.attributes.velocity.array as Float32Array;
        
        for (let i = 0; i < positions.length; i += 3) {
          // Move debris outward
          positions[i] += velocities[i] * 0.025;
          positions[i + 1] += velocities[i + 1] * 0.025;
          positions[i + 2] += velocities[i + 2] * 0.025;
        }
        
        debrisGeometry.attributes.position.needsUpdate = true;
        debrisMaterial.opacity = Math.max(0, 0.9 - explosionProgress * 0.7);
      }

      // Camera shake effect (brief and subtle)
      if (explosionProgress < 0.15) {
        const shakeIntensity = (0.15 - explosionProgress) * 0.4;
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
      {/* Kinetic Impactor Spacecraft */}
      <group ref={impactorRef}>
        {/* Main body */}
        <mesh geometry={impactorGeometry} material={impactorMaterial} />
        
        {/* Reinforced nose cone */}
        <mesh geometry={noseConeGeometry} material={noseConeMaterial} position={[1.5, 0, 0]} />
        
        {/* Solar panels */}
        <mesh position={[0, 1.5, 0]} rotation={[0, 0, Math.PI/2]}>
          <boxGeometry args={[0.03, 2.5, 1]} />
          <meshStandardMaterial color={0x1a237e} metalness={0.1} roughness={0.8} />
        </mesh>
        <mesh position={[0, -1.5, 0]} rotation={[0, 0, Math.PI/2]}>
          <boxGeometry args={[0.03, 2.5, 1]} />
          <meshStandardMaterial color={0x1a237e} metalness={0.1} roughness={0.8} />
        </mesh>
        
        {/* Thruster nozzles */}
        {Array.from({ length: 4 }).map((_, i) => (
          <mesh 
            key={i}
            position={[
              -1.5,
              Math.cos(i * Math.PI / 2) * 0.25,
              Math.sin(i * Math.PI / 2) * 0.25
            ]}
          >
            <cylinderGeometry args={[0.06, 0.1, 0.3]} />
            <meshStandardMaterial color={0x333333} metalness={0.8} roughness={0.3} />
          </mesh>
        ))}
        
        {/* Main engine exhaust glow */}
        <mesh 
          ref={engineGlowRef}
          position={[-2, 0, 0]}
          material={engineGlowMaterial}
        >
          <coneGeometry args={[0.25, 1.2]} />
        </mesh>
        
        {/* Status lights */}
        <mesh position={[1, 0, 0.35]}>
          <sphereGeometry args={[0.04]} />
          <meshBasicMaterial color={0x00FF00} />
        </mesh>
        <mesh position={[0.6, 0.2, 0.35]}>
          <sphereGeometry args={[0.03]} />
          <meshBasicMaterial color={0xFF0000} />
        </mesh>
        <mesh position={[0.6, -0.2, 0.35]}>
          <sphereGeometry args={[0.03]} />
          <meshBasicMaterial color={0xFF0000} />
        </mesh>

        {/* Engine illumination */}
        <pointLight
          position={[-2, 0, 0]}
          color={0xFF4500}
          intensity={2}
          distance={6}
        />
      </group>
      
      {/* Engine trail */}
      <points ref={trailRef} geometry={trailGeometry} material={trailMaterial} />
      
      {/* Impact explosion effects positioned at asteroid */}
      <group position={asteroidPosition}>
        {/* Expanding dust/debris cloud */}
        <mesh ref={explosionRef} material={dustCloudMaterial}>
          <sphereGeometry args={[2, 32, 32]} />
        </mesh>
        
        {/* Shockwave ring */}
        <mesh ref={shockwaveRef} material={shockwaveMaterial}>
          <sphereGeometry args={[2, 32, 32]} />
        </mesh>
        
        {/* Brief initial flash */}
        <mesh ref={flashRef} material={flashMaterial}>
          <sphereGeometry args={[3, 16, 16]} />
        </mesh>
        
        {/* Rock/debris chunks */}
        <points ref={debrisRef} geometry={debrisGeometry} material={debrisMaterial} />
        
        {/* Brief impact light */}
        <pointLight
          color={0xFFDDAA}
          intensity={8}
          distance={20}
          decay={2}
        />
      </group>
    </group>
  );
};

export default KineticImpactor;
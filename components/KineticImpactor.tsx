'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, Mesh, Group } from 'three';
import * as THREE from 'three';

interface KineticImpactorProps {
  asteroidPosition: Vector3;
  onComplete: () => void;
  isActive: boolean;
}

const KineticImpactor: React.FC<KineticImpactorProps> = ({ 
  asteroidPosition, 
  onComplete, 
  isActive 
}) => {
  const impactorRef = useRef<Group>(null);
  const trailRef = useRef<Group>(null);
  const explosionRef = useRef<Group>(null);
  const engineGlowRef = useRef<Mesh>(null);
  
  const [phase, setPhase] = useState<'approaching' | 'impact' | 'complete'>('approaching');
  const [impactorPos, setImpactorPos] = useState(new Vector3());
  const [trailPoints, setTrailPoints] = useState<Vector3[]>([]);
  const [velocity, setVelocity] = useState(new Vector3());
  const [explosionStartTime, setExplosionStartTime] = useState(0);
  
  // Starting position for the impactor (off-screen)
  const startPosition = new Vector3(-50, 15, -25);

  // Reset and initialize when becoming active
  useEffect(() => {
    if (isActive && phase === 'complete') {
      // Reset everything for a new launch
      setPhase('approaching');
      setImpactorPos(startPosition.clone());
      setTrailPoints([]);
      setExplosionStartTime(0);
      
      // Calculate trajectory
      const direction = asteroidPosition.clone()
        .sub(startPosition)
        .normalize();
      setVelocity(direction.multiplyScalar(25)); // Increased speed
      
      // Reset visibility
      if (impactorRef.current) {
        impactorRef.current.visible = true;
      }
      if (explosionRef.current) {
        explosionRef.current.visible = false;
      }
    }
  }, [isActive, asteroidPosition, phase]);

  // Initialize on first activation
  useEffect(() => {
    if (isActive && phase === 'approaching' && velocity.length() === 0) {
      setImpactorPos(startPosition.clone());
      const direction = asteroidPosition.clone()
        .sub(startPosition)
        .normalize();
      setVelocity(direction.multiplyScalar(25));
    }
  }, [isActive, asteroidPosition, phase, velocity]);

  const completeImpact = useCallback(() => {
    setPhase('complete');
    onComplete();
  }, [onComplete]);
  
  useFrame((state, delta) => {
    if (!isActive || !impactorRef.current) return;
    
    const time = state.clock.getElapsedTime();
    
    if (phase === 'approaching') {
      // Update position with physics
      const newPos = impactorPos.clone().add(velocity.clone().multiplyScalar(delta));
      setImpactorPos(newPos);
      impactorRef.current.position.copy(newPos);
      
      // Orient impactor towards target
      impactorRef.current.lookAt(asteroidPosition);
      
      // Update exhaust trail
      setTrailPoints(prev => {
        const newTrail = [...prev, newPos.clone()];
        return newTrail.slice(-20); // Keep last 20 positions
      });
      
      // Engine glow pulsing
      if (engineGlowRef.current) {
        const pulse = 0.7 + Math.sin(time * 12) * 0.3;
        const material = engineGlowRef.current.material as THREE.MeshBasicMaterial;
        material.opacity = pulse;
        
        // Engine heat scaling
        const heatScale = 1 + Math.sin(time * 8) * 0.15;
        engineGlowRef.current.scale.setScalar(heatScale);
      }
      
      // Check for impact - more generous collision detection
      const distanceToTarget = newPos.distanceTo(asteroidPosition);
      if (distanceToTarget < 2.5) {
        setPhase('impact');
        setExplosionStartTime(time);
        
        // Position explosion at impact point
        if (explosionRef.current) {
          explosionRef.current.position.copy(asteroidPosition);
          explosionRef.current.visible = true;
        }
        
        // Complete after explosion animation
        setTimeout(completeImpact, 2000);
      }
      
      // Safety check - reset if impactor goes too far
      if (distanceToTarget > 100) {
        completeImpact();
      }
    } 
    
    if (phase === 'impact') {
      // Hide impactor during explosion
      if (impactorRef.current) {
        impactorRef.current.visible = false;
      }
      
      // Animate explosion
      if (explosionRef.current && explosionStartTime > 0) {
        const explosionTime = time - explosionStartTime;
        const normalizedTime = Math.min(explosionTime / 2, 1); // 2 second explosion
        
        // Expanding shockwave
        const shockwaveScale = normalizedTime * 6;
        explosionRef.current.scale.setScalar(Math.max(0.1, shockwaveScale));
        
        // Animate explosion particles
        explosionRef.current.children.forEach((child, index) => {
          if (child instanceof THREE.Mesh) {
            const material = child.material as THREE.MeshBasicMaterial;
            
            // Fade out over time
            material.opacity = Math.max(0, 1 - normalizedTime);
            
            // Different behaviors for different particle types
            if (index === 0) {
              // Central flash - quick fade
              material.opacity = Math.max(0, 1 - normalizedTime * 2);
            } else if (index <= 12) {
              // Explosion particles expand outward
              const angle = (index / 12) * Math.PI * 2;
              const distance = normalizedTime * 3;
              child.position.set(
                Math.cos(angle) * distance,
                Math.sin(angle + Math.PI / 4) * distance * 0.5,
                Math.sin(angle) * distance * 0.3
              );
              
              // Rotate particles
              child.rotation.x += delta * 8;
              child.rotation.y += delta * 6;
              child.rotation.z += delta * 4;
            } else if (index === 13) {
              // Shockwave ring
              material.opacity = Math.max(0, 0.6 - normalizedTime * 0.8);
            } else {
              // Debris particles
              const debrisIndex = index - 14;
              const angle = (debrisIndex / 8) * Math.PI * 2;
              const distance = normalizedTime * 4;
              child.position.set(
                Math.cos(angle + normalizedTime) * distance,
                Math.sin(normalizedTime * 3) * distance * 0.5,
                Math.sin(angle + normalizedTime) * distance
              );
              
              // Tumbling motion
              child.rotation.x += delta * 15;
              child.rotation.y += delta * 12;
              child.rotation.z += delta * 18;
            }
          }
        });
      }
    }
  });

  if (!isActive || phase === 'complete') return null;

  return (
    <group>
      {/* Main Kinetic Impactor Spacecraft */}
      <group ref={impactorRef}>
        {/* Main body - cylindrical probe */}
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.4, 0.6, 3]} />
          <meshStandardMaterial 
            color="#E5E5E5" 
            metalness={0.9} 
            roughness={0.1}
          />
        </mesh>
        
        {/* Nose cone - reinforced for impact */}
        <mesh position={[0, 1.8, 0]} castShadow>
          <coneGeometry args={[0.4, 0.8]} />
          <meshStandardMaterial 
            color="#B0B0B0" 
            metalness={0.8} 
            roughness={0.2}
          />
        </mesh>
        
        {/* Solar panels */}
        <group position={[0, 0.5, 0]}>
          <mesh position={[2, 0, 0]} rotation={[0, 0, Math.PI/2]} castShadow>
            <boxGeometry args={[0.05, 3, 1.5]} />
            <meshStandardMaterial color="#1a237e" metalness={0.1} roughness={0.8} />
          </mesh>
          <mesh position={[-2, 0, 0]} rotation={[0, 0, Math.PI/2]} castShadow>
            <boxGeometry args={[0.05, 3, 1.5]} />
            <meshStandardMaterial color="#1a237e" metalness={0.1} roughness={0.8} />
          </mesh>
        </group>
        
        {/* Communications dish */}
        <mesh position={[0, 0, 0.8]} rotation={[Math.PI/4, 0, 0]}>
          <cylinderGeometry args={[0.6, 0.6, 0.1]} />
          <meshStandardMaterial 
            color="#F5F5F5" 
            metalness={0.9} 
            roughness={0.1}
          />
        </mesh>
        
        {/* Thruster nozzles */}
        <group position={[0, -1.8, 0]}>
          {Array.from({ length: 4 }).map((_, i) => (
            <mesh 
              key={i}
              position={[
                Math.cos(i * Math.PI / 2) * 0.3,
                0,
                Math.sin(i * Math.PI / 2) * 0.3
              ]}
            >
              <cylinderGeometry args={[0.08, 0.12, 0.4]} />
              <meshStandardMaterial color="#444444" metalness={0.8} roughness={0.3} />
            </mesh>
          ))}
        </group>
        
        {/* Main engine exhaust */}
        <mesh 
          ref={engineGlowRef}
          position={[0, -2.5, 0]}
        >
          <coneGeometry args={[0.3, 1.5]} />
          <meshBasicMaterial 
            color="#FF4500"
            transparent
            opacity={0.8}
          />
        </mesh>
        
        {/* Navigation/status lights */}
        <mesh position={[0, 1.2, 0.6]}>
          <sphereGeometry args={[0.05]} />
          <meshBasicMaterial color="#00FF00" />
        </mesh>
        <mesh position={[0.3, 0.8, 0.6]}>
          <sphereGeometry args={[0.05]} />
          <meshBasicMaterial color="#FF0000" />
        </mesh>
        <mesh position={[-0.3, 0.8, 0.6]}>
          <sphereGeometry args={[0.05]} />
          <meshBasicMaterial color="#FF0000" />
        </mesh>

        {/* Point light for engine illumination */}
        <pointLight
          position={[0, -2.5, 0]}
          color="#FF4500"
          intensity={1}
          distance={8}
        />
      </group>
      
      {/* Exhaust trail system */}
      <group ref={trailRef}>
        {trailPoints.map((point, index) => {
          const opacity = (index / trailPoints.length) * 0.7;
          const size = (index / trailPoints.length) * 0.4 + 0.05;
          return (
            <mesh key={`trail-${index}`} position={point.toArray()}>
              <sphereGeometry args={[size]} />
              <meshBasicMaterial 
                color="#FF6500"
                transparent 
                opacity={opacity}
              />
            </mesh>
          );
        })}
      </group>
      
      {/* Impact explosion effect */}
      <group ref={explosionRef} visible={false}>
        {/* Central flash */}
        <mesh>
          <sphereGeometry args={[0.5]} />
          <meshBasicMaterial 
            color="#FFFFFF"
            transparent
            opacity={1}
          />
        </mesh>
        
        {/* Explosion particles */}
        {Array.from({ length: 12 }).map((_, i) => (
          <mesh key={`explosion-${i}`}>
            <sphereGeometry args={[0.15 + Math.random() * 0.25]} />
            <meshBasicMaterial 
              color={i % 3 === 0 ? "#FFD700" : i % 3 === 1 ? "#FF4500" : "#FF6B00"}
              transparent
              opacity={0.9}
            />
          </mesh>
        ))}
        
        {/* Shockwave ring */}
        <mesh rotation={[Math.PI/2, 0, 0]}>
          <ringGeometry args={[0.5, 1.5]} />
          <meshBasicMaterial 
            color="#87CEEB"
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
        
        {/* Debris particles */}
        {Array.from({ length: 8 }).map((_, i) => (
          <mesh key={`debris-${i}`}>
            <boxGeometry args={[0.08, 0.08, 0.15]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>
        ))}

        {/* Impact flash light */}
        <pointLight
          color="#FFFFFF"
          intensity={15}
          distance={25}
          decay={2}
        />
      </group>
    </group>
  );
};

export default KineticImpactor;
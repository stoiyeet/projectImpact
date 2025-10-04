'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';

interface EarthSceneProps {
  position?: [number, number, number];
}

const EarthScene: React.FC<EarthSceneProps> = ({ position = [50, 0, 0] }) => {
  const earthRef = useRef<Mesh>(null);
  
  // Rotate Earth
  useFrame(() => {
    if (earthRef.current) {
      earthRef.current.rotation.y += 0.005;
    }
  });

  return (
    <mesh ref={earthRef} position={position}>
      <sphereGeometry args={[3, 32, 32]} />
      <meshStandardMaterial 
        color="#4A90E2" 
        roughness={0.8}
        metalness={0.1}
      />
    </mesh>
  );
};

export default EarthScene;
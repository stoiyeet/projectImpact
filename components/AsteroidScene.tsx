'use client';

import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Vector3 } from 'three';
import EarthScene from './EarthScene';
import Asteroid from './Asteroid';
// import KineticImpactor from '..components/KineticImpactor';

interface AsteroidSceneProps {
  asteroidTrajectory: number[];
  isKineticActive: boolean;
  onKineticComplete: () => void;
  onAsteroidUpdate: (position: Vector3) => void;
}

const AsteroidScene: React.FC<AsteroidSceneProps> = ({
  asteroidTrajectory,
  isKineticActive,
  onKineticComplete,
  onAsteroidUpdate
}) => {
  const [asteroidPos, setAsteroidPos] = useState(new Vector3(-30, 0, 0));

  const handleAsteroidUpdate = (pos: Vector3) => {
    setAsteroidPos(pos);
    if (onAsteroidUpdate) onAsteroidUpdate(pos);
  };

  return (
    <Canvas
      camera={{ position: [0, 10, 30], fov: 75 }}
      style={{ background: '#000011' }}
    >
      {/* Stars background */}
      <mesh>
        <sphereGeometry args={[500, 32, 32]} />
        <meshBasicMaterial color="#000033" side={2} />
      </mesh>

      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight 
        position={[100, 50, 50]} 
        intensity={1.5}
        castShadow
      />
      
      {/* Earth */}
      <EarthScene position={[50, 0, 0]} />
      
      {/* Asteroid */}
      <Asteroid 
        position={[-30, 0, 0]}
        trajectory={asteroidTrajectory}
        isDeflected={false}
        onPositionUpdate={handleAsteroidUpdate}
      />
      
      {/* Kinetic Impactor Effect
      <KineticImpactor
        asteroidPosition={asteroidPos}
        isActive={isKineticActive}
        onComplete={onKineticComplete}
      />
       */}

      {/* Camera Controls */}
      <OrbitControls 
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
      />
    </Canvas>
  );
};

export default AsteroidScene;
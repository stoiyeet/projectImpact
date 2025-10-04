"use client";
import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";

const Asteroid: React.FC = () => {
  return (
    <mesh>
      <icosahedronGeometry args={[1.2, 2]} />
      <meshStandardMaterial color="#888" roughness={0.9} metalness={0.3} />
    </mesh>
  );
};

const AsteroidScene: React.FC = () => {
  return (
    <Canvas camera={{ position: [3, 3, 3] }}>
      <ambientLight intensity={0.6} />
      <pointLight position={[5, 5, 5]} />
      <Stars radius={100} depth={50} count={4000} factor={4} fade />
      <Suspense fallback={null}>
        <Asteroid />
      </Suspense>
      <OrbitControls enableZoom={false} />
    </Canvas>
  );
};

export default AsteroidScene;

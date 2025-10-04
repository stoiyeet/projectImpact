"use client";
import React, { useRef, useMemo } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";

interface AsteroidProps {
  orbitRadius?: number;   // distance from Earth (kept for backward compatibility)
  orbitSpeed?: number;    // angular speed (kept for backward compatibility)
  earthPosition?: [number, number, number]; // Earth's world position (kept for backward compatibility)
}

const Asteroid: React.FC<AsteroidProps> = ({
  orbitRadius = 8,
  orbitSpeed = 0.2,
  earthPosition = [0, 0, 0],
}) => {
  const meshRef = useRef<THREE.Mesh>(null!);

  const map = useLoader(THREE.TextureLoader, "/textures/Asteroid.png");

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map,
        roughness: 0.95,
        metalness: 0.05,
      }),
    [map]
  );

  useFrame(() => {
    // Only spin the asteroid itself, no orbital movement
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
      meshRef.current.rotation.x += 0.005;
    }
  });

  return (
    <mesh
      ref={meshRef}
      castShadow
      receiveShadow
      material={material}
    >
      <dodecahedronGeometry args={[1, 2]} />
    </mesh>
  );
};

export default Asteroid;
"use client";
import React, { useRef, useMemo } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";

const Asteroid: React.FC = () => {
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

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.003;
      meshRef.current.rotation.x += 0.002;
      meshRef.current.rotation.z = Math.sin(t * 0.5) * 0.05;
    }
  });

  return (
    <mesh ref={meshRef} castShadow receiveShadow material={material}>
      <dodecahedronGeometry args={[2, 1]} />
    </mesh>
  );
};

export default Asteroid;

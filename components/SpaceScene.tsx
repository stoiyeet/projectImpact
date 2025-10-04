'use client';

// components/SpaceScene.tsx
import React, { useRef, Suspense, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Text } from "@react-three/drei";
import * as THREE from "three";

import Earth from "@/components/Earth";
import Asteroid from "@/components/Asteroid";
import Sun from "@/components/Sun";
import KineticImpactor from "@/components/KineticImpactor";
import LaserDefense from "@/components/LaserDefense";
import NuclearDetonation from "@/components/NuclearDetonation";
import GravityTractor from "@/components/GravityTractor";

// === Types ===
// IMPORTANT: Keep this in sync with ai/page.tsx EFFECTS_CONFIG keys
type EffectKey =
  | "kineticImpactor"
  | "nuclearDetonation"
  | "gravityTractor"
  | "laserAblation"
  | "ionBeamShepherd";

type SpaceSceneProps = {
  effects: Record<EffectKey, boolean>;
  followingAsteroid: boolean;
  asteroidClicked: boolean;
  onAsteroidClick: () => void;
};

// === Stationary Asteroid (with deflection offset) ===
const StationaryAsteroid = React.forwardRef<
  THREE.Group,
  {
    onAsteroidClick: () => void;
    showLabel: boolean;
    isVisible: boolean;
    offset: THREE.Vector3;
  }
>(function StationaryAsteroid({ onAsteroidClick, showLabel, isVisible, offset }, ref) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    const time = clock.getElapsedTime();
    
    // Base orbital parameters for slight movement
    const earthPosition = new THREE.Vector3(0, 0, 0); // Earth is at origin
    const baseOrbitRadius = 35; // Distance from Earth
    const orbitSpeed = 0.05; // Very slow orbital movement
    
    // Calculate orbital position with very slight movement
    const orbitAngle = time * orbitSpeed;
    const baseX = earthPosition.x + Math.cos(orbitAngle) * baseOrbitRadius;
    const baseY = earthPosition.y + Math.sin(orbitAngle * 0.3) * 2; // Slight vertical oscillation
    const baseZ = earthPosition.z + Math.sin(orbitAngle) * baseOrbitRadius;

    // Apply persistent deflection offset
    groupRef.current.position.set(baseX + offset.x, baseY + offset.y, baseZ + offset.z);
    groupRef.current.scale.setScalar(0.4);
    groupRef.current.visible = isVisible;

    // Spin asteroid in place
    groupRef.current.rotation.x += 0.01;
    groupRef.current.rotation.y += 0.005;
  });

  React.useImperativeHandle(ref, () => groupRef.current);

  if (!isVisible) return null;

  return (
    <group ref={groupRef}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onAsteroidClick();
        }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "default")}
      >
        <Asteroid />
      </mesh>
      {showLabel && (
        <Text
          position={[0, 3, 0]}
          fontSize={1}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="black"
        >
          Impactor-2025
        </Text>
      )}
    </group>
  );
});

// === Camera Follow Asteroid ===
const CameraFollowAsteroid: React.FC<{
  asteroidRef: React.RefObject<THREE.Group | null>;
  isFollowing: boolean;
}> = ({ asteroidRef, isFollowing }) => {
  const { camera } = useThree();

  useFrame(() => {
    if (!isFollowing || !asteroidRef.current) return;

    const asteroidPosition = new THREE.Vector3();
    asteroidRef.current.getWorldPosition(asteroidPosition);

    const offset = new THREE.Vector3(8, 5, 8);
    const targetPosition = asteroidPosition.clone().add(offset);

    camera.position.lerp(targetPosition, 0.05);
    camera.lookAt(asteroidPosition);
  });

  return null;
};

// === Scene Content ===
const SceneContent: React.FC<{
  effects: Record<EffectKey, boolean>;
  followingAsteroid: boolean;
  asteroidClicked: boolean;
  onAsteroidClick: () => void;
}> = ({ effects, followingAsteroid, asteroidClicked, onAsteroidClick }) => {
  const earthRef = useRef<THREE.Object3D>(null);
  const asteroidRef = useRef<THREE.Group | null>(null);
  const sunRef = useRef<THREE.Group>(null);

  const [asteroidVisible, setAsteroidVisible] = useState(true);
  const [currentAsteroidPosition, setCurrentAsteroidPosition] = useState(new THREE.Vector3());

  // Persistent offset (e.g. laser nudges)
  const [deflectionOffset, setDeflectionOffset] = useState(new THREE.Vector3());

  // Nuclear detonation state
  const [nuclearActive, setNuclearActive] = useState(false);
  const [nuclearPosition, setNuclearPosition] = useState<[number, number, number]>([0, 0, 0]);

  // Gravity tractor state
  const [gravityTractorActive, setGravityTractorActive] = useState(false);

  useFrame(() => {
    if (asteroidRef.current) {
      const newPos = new THREE.Vector3();
      asteroidRef.current.getWorldPosition(newPos);
      setCurrentAsteroidPosition(newPos);
    }

    // Sun orbit
    if (sunRef.current) {
      const time = Date.now() * 0.000001;
      const sunOrbitRadius = 700;
      const sunX = Math.cos(time) * sunOrbitRadius;
      const sunZ = Math.sin(time) * sunOrbitRadius;
      const sunY = Math.sin(time * 0.1) * 20;
      sunRef.current.position.set(sunX, sunY, sunZ);
    }
  });

  // Handle kinetic impact completion
  const handleImpactComplete = useCallback(() => {
    setAsteroidVisible(false);
    setTimeout(() => {
      setDeflectionOffset(new THREE.Vector3());
      setAsteroidVisible(true);
    }, 3000);
  }, []);

  // Handle nuclear detonation
  React.useEffect(() => {
    if (effects.nuclearDetonation && !nuclearActive && asteroidVisible) {
      setNuclearPosition([
        currentAsteroidPosition.x,
        currentAsteroidPosition.y,
        currentAsteroidPosition.z
      ]);
      setNuclearActive(true);
    }
  }, [effects.nuclearDetonation, nuclearActive, asteroidVisible, currentAsteroidPosition]);

  // Handle gravity tractor
  React.useEffect(() => {
    if (effects.gravityTractor && !gravityTractorActive && asteroidVisible) {
      setGravityTractorActive(true);
    }
  }, [effects.gravityTractor, gravityTractorActive, asteroidVisible]);

  const handleNuclearComplete = useCallback(() => {
    setNuclearActive(false);
    setTimeout(() => {
      setDeflectionOffset(new THREE.Vector3());
    }, 2000);
  }, []);

  const handleNuclearDestroy = useCallback(() => {
    setAsteroidVisible(false);
    setTimeout(() => {
      setAsteroidVisible(true);
      setDeflectionOffset(new THREE.Vector3());
    }, 5000);
  }, []);

  const handleGravityTractorComplete = useCallback(() => {
    setGravityTractorActive(false);
    setTimeout(() => {
      setDeflectionOffset(new THREE.Vector3());
    }, 2000);
  }, []);

  const handleEarthDoubleClick = useCallback(() => {
    console.log("Earth double-clicked");
  }, []);

  return (
    <>
      <Stars count={15000} fade speed={0.1} radius={200} depth={100} />

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        enabled={!followingAsteroid}
        maxDistance={500}
        minDistance={5}
      />

      {/* Ambient light for better visibility */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 5]} intensity={1} />

      {/* Earth */}
      <group scale={[30, 30, 30]} ref={earthRef}>
        <Earth onDoubleClick={handleEarthDoubleClick} />
      </group>

      {/* Asteroid (stationary with possible deflection offset) */}
      <StationaryAsteroid
        ref={asteroidRef}
        onAsteroidClick={onAsteroidClick}
        showLabel={asteroidClicked}
        isVisible={asteroidVisible}
        offset={deflectionOffset}
      />

      {/* Sun */}
      <group ref={sunRef} position={[500, 0, 0]}>
        <Sun targetRef={earthRef as React.RefObject<THREE.Object3D>} />
      </group>

      {/* Kinetic Impactor */}
      {asteroidVisible && (
        <KineticImpactor
          isActive={effects.kineticImpactor}
          asteroidPosition={currentAsteroidPosition}
          onComplete={handleImpactComplete}
        />
      )}

      {/* Laser Defense */}
      {asteroidVisible && (
        <LaserDefense
          isActive={effects.laserAblation}
          asteroidPosition={currentAsteroidPosition}
          onComplete={handleImpactComplete}
          onDeflect={(delta) => setDeflectionOffset((prev) => prev.clone().add(delta))}
        />
      )}

      {/* Nuclear Detonation */}
      <NuclearDetonation
        position={nuclearPosition}
        isActive={nuclearActive}
        onComplete={handleNuclearComplete}
        onDestroy={handleNuclearDestroy}
      />

      {/* Gravity Tractor */}
      {asteroidVisible && (
        <GravityTractor
          asteroidPosition={currentAsteroidPosition}
          isActive={gravityTractorActive}
          onComplete={handleGravityTractorComplete}
          onDeflect={(delta) => setDeflectionOffset((prev) => prev.clone().add(delta))}
        />
      )}

      <CameraFollowAsteroid asteroidRef={asteroidRef} isFollowing={followingAsteroid} />
    </>
  );
};

// === Main SpaceScene ===
const SpaceScene: React.FC<SpaceSceneProps> = ({
  effects,
  followingAsteroid,
  asteroidClicked,
  onAsteroidClick,
}) => {
  return (
    <Canvas camera={{ position: [40, 20, 30], fov: 50 }}>
      <Suspense fallback={null}>
        <SceneContent
          effects={effects}
          followingAsteroid={followingAsteroid}
          asteroidClicked={asteroidClicked}
          onAsteroidClick={onAsteroidClick}
        />
      </Suspense>
    </Canvas>
  );
};

export default SpaceScene;

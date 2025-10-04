"use client";
import React, {
  useRef,
  useMemo,
  useState,
  useImperativeHandle,
  useEffect,
} from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { useSunPosition } from "./Sun"; // Gets sunToEarthDir

type Props = {
  hardTerminator?: boolean;
  rotationSpeed?: number;
};

const Earth = React.forwardRef<THREE.Mesh, Props>(
  ({ hardTerminator = false, rotationSpeed = 0.005 }, ref) => {
    const meshRef = useRef<THREE.Mesh>(null!);
    useImperativeHandle(ref, () => meshRef.current);

    const { sunToEarthDir: sunToEarthDirFromContext } = useSunPosition();

    const dayMap = useLoader(THREE.TextureLoader, "/textures/earthDay.png");
    const nightMap = useLoader(THREE.TextureLoader, "/textures/earthNight.png");

    const [isDragging, setIsDragging] = useState(false);
    const [lastX, setLastX] = useState(0);

    // Store the sun direction in a mutable ref
    const sunDirRef = useRef(new THREE.Vector3(1, 0.2, 0.5).normalize());

    const material = useMemo(
      () =>
        new THREE.ShaderMaterial({
          uniforms: {
            dayTexture: { value: dayMap },
            nightTexture: { value: nightMap },
            sunToEarthDir: { value: sunDirRef.current }, // updated every frame
            terminatorSoftness: { value: 0.08 },
            hardMode: { value: hardTerminator ? 1.0 : 0.0 },
          },
          vertexShader: `
            varying vec2 vUv;
            varying vec3 vWorldNormal;
            varying vec3 vViewPos;
            varying vec3 vWorldPos;
            
            void main() {
              vUv = uv;
              vWorldNormal = normalize(mat3(modelMatrix) * normal);
              vViewPos = (modelViewMatrix * vec4(position, 1.0)).xyz;
              vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform sampler2D dayTexture;
            uniform sampler2D nightTexture;
            uniform vec3 sunToEarthDir;     
            uniform float terminatorSoftness;
            uniform float hardMode;

            varying vec2 vUv;
            varying vec3 vWorldNormal;
            varying vec3 vViewPos;
            varying vec3 vWorldPos;

            void main() {
              vec3 dayCol = texture2D(dayTexture, vUv).rgb;
              vec3 nightCol = texture2D(nightTexture, vUv).rgb;

              vec3 worldNormal = normalize(vWorldNormal);

              // Dot product: how much surface faces the incoming sunlight
              float ndotl = dot(worldNormal, sunToEarthDir);

              float light = mix(
                smoothstep(-terminatorSoftness, terminatorSoftness, ndotl),
                step(0.0, ndotl),
                hardMode
              );

              vec3 color = mix(nightCol, dayCol, light);

              if (hardMode < 0.5) {
                float nightSide = 1.0 - light;
                if (nightSide > 0.7) {
                  color += nightCol * nightSide * 1.05; // city lights
                }

                float rim = pow(1.0 - abs(dot(normalize(-vViewPos), worldNormal)), 2.0);
                color += vec3(0.5, 0.7, 1.0) * rim * max(0.0, light - 0.5) * 0.22;
              }

              gl_FragColor = vec4(color, 1.0);
            }
          `,
        }),
      [dayMap, nightMap, hardTerminator]
    );

    // Update sun direction every frame
    useFrame(() => {
      if (meshRef.current) {
        if (!isDragging) {
          meshRef.current.rotation.y += rotationSpeed;
        }
      }

      // Flip Sun→Earth vector into Earth→Sun before sending to shader
      sunDirRef.current.copy(sunToEarthDirFromContext).multiplyScalar(-1);
      material.uniforms.sunToEarthDir.value.copy(sunDirRef.current);
    });

    // Update hardMode when prop changes
    useEffect(() => {
      material.uniforms.hardMode.value = hardTerminator ? 1.0 : 0.0;
    }, [hardTerminator, material]);

    // Drag handlers
    const onPointerDown = (e: React.PointerEvent) => {
      setIsDragging(true);
      setLastX(e.clientX);
    };

    const onPointerUp = () => setIsDragging(false);
    const onPointerMove = (e: React.PointerEvent) => {
      if (isDragging && meshRef.current) {
        const dx = e.clientX - lastX;
        meshRef.current.rotation.y += dx * 0.005;
        setLastX(e.clientX);
      }
    };

    return (
      <mesh
        ref={meshRef}
        position={[-2.5, -0.2, 1]}
        material={material}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerUp}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[2, 64, 64]} />
      </mesh>
    );
  }
);

Earth.displayName = "Earth";

export default Earth;

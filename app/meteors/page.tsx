"use client";
import React, { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import asteroidInfo from '../../data/asteroidInfo.json';
import { useRouter } from 'next/navigation'
import styles from "./AsteroidViewer.module.css";

const asteroids = [
  "16_psyche","67p_churyumov_gerasimenko","5535_annefrank",
  "99942_apophis","101955_bennu","19p_borrelly","9969_braille",
  "65803_didymos","dimorphos","152830_dinkinesh","52246_donaldjohanson",
  "433_eros","3548_eurybates","951_gaspra","103p_hartley","243_ida",
  "25143_itokawa","11351_leucus","21_luteita","menoetius","21900_orus",
  "617_patroclus","15094_polymele","162173_ryugu","73p_schwassman_wachmann_3",
  "9p_tempel_1","4_vesta","81p_wild_2"
];

const specialMap: Record<string, string> = {
  "5535_annefrank": "3.glb",
  "9969_braille": "2.glb",
  "152830_dinkinesh": "3.glb",
  "52246_donaldjohanson": "2.glb",
  "3548_eurybates": "3.glb",
  "243_ida": "2.glb",
  "11351_leucus": "3.glb",
  "21_luteita": "2.glb",
  "menoetius": "3.glb",
  "21900_orus": "2.glb",
  "617_patroclus": "1.glb",
  "15094_polymele": "1.glb",
  "73p_schwassman_wachmann_3": "3.glb",
  "81p_wild_2": "3.glb"
};

const formatName = (name: string) => name.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase());



export default function AsteroidViewer() {
  const [selected, setSelected] = useState<string>(asteroids[0]);
  const [lighting, setLighting] = useState<'flood' | 'shadow'>('flood');
  const mountRef = useRef<HTMLDivElement>(null);
  const router = useRouter()

  const demoMeteor = {
    mass: 2.7e19,
    diameter: 226e3,
    speed: 25e3
  }


  const getGlbFile = (name: string) => {
    if (specialMap[name]) return `/meteors/${specialMap[name]}`;
    const b = name.substring(name.indexOf('_') + 1);    
    return `/meteors/${b}.glb`;
  };

  useEffect(() => {
    if (!mountRef.current) return;

    let stopped = false;
    let frameId: number;
    let loader: GLTFLoader | null = null;
    let model: THREE.Group | null = null;

    // Remove any previous renderer DOM node
    while (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);

    const camera = new THREE.PerspectiveCamera(
      60,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1e7
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = lighting === 'shadow';
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Lighting setup
    let ambient: THREE.AmbientLight;
    let dirLight: THREE.DirectionalLight;
    if (lighting === 'flood') {
      // Aggressive, high-detail flood lighting
      ambient = new THREE.AmbientLight(0xffffff, 3.5);
      scene.add(ambient);
      dirLight = new THREE.DirectionalLight(0xffffff, 4.5);
      dirLight.position.set(120, 120, 120);
      scene.add(dirLight);
      // Add a second, slightly bluish fill light from the opposite side
      const fillLight = new THREE.DirectionalLight(0xe0eaff, 2.5);
      fillLight.position.set(-100, -80, 80);
      scene.add(fillLight);
    } else {
      ambient = new THREE.AmbientLight(0xffffff, 0.3);
      scene.add(ambient);
      dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
      dirLight.position.set(100, 100, 100);
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.width = 1024;
      dirLight.shadow.mapSize.height = 1024;
      dirLight.shadow.camera.near = 0.5;
      dirLight.shadow.camera.far = 500;
      scene.add(dirLight);
    }

    loader = new GLTFLoader();
    let gltfController: { abort: () => void } | null = null;

    const loadModel = () => {
      if (model) scene.remove(model);
      if (gltfController) gltfController.abort();
      // Use AbortController for loader if available
      let controller: AbortController | null = null;
      if (typeof window !== 'undefined' && 'AbortController' in window) {
        controller = new AbortController();
      }
      gltfController = controller;

      loader!.load(
        getGlbFile(selected),
        (gltf) => {
          if (stopped) return;
          model = gltf.scene;
          model.traverse((child: any) => {
            if (child.isMesh) {
              child.castShadow = lighting === 'shadow';
              child.receiveShadow = lighting === 'shadow';
              // Add glossiness and contrast
              if (child.material && (child.material.isMeshStandardMaterial || child.material.isMeshPhysicalMaterial)) {
                child.material.metalness = 0.3;
                if ('envMapIntensity' in child.material) child.material.envMapIntensity = 1.2;
                child.material.needsUpdate = true;
              }
            }
          });
          model.scale.setScalar(5);
          scene.add(model);

          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);

          camera.position.set(center.x, center.y, center.z + maxDim * 2);
          camera.lookAt(center);
        },
        undefined,
        (err) => {
          if (!stopped) console.error("GLB load error:", err);
        }
      );
    };

    loadModel();

    const animate = () => {
      if (stopped) return;
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);

    const handleResize = () => {
      camera.aspect = mountRef.current!.clientWidth / mountRef.current!.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current!.clientWidth, mountRef.current!.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      stopped = true;
      window.removeEventListener("resize", handleResize);
      if (frameId) cancelAnimationFrame(frameId);
      if (renderer) {
        renderer.dispose();
        if (renderer.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      }
      if (gltfController && typeof gltfController.abort === 'function') gltfController.abort();
      model = null;
    };
  }, [selected, lighting]);

const info = asteroidInfo[selected as keyof typeof asteroidInfo];

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <select value={selected} onChange={(e) => setSelected(e.target.value)} className={styles.select}>
          {asteroids.map(a => (
            <option key={a} value={a}>{formatName(a)}</option>
          ))}
        </select>

        {info && (
          <div className={styles.infoPanel}>
            <h2>{formatName(selected)}</h2>
            <p><strong>Size:</strong> {info.size}</p>
            <p><strong>Weight:</strong> {info.weight}</p>
            <p><strong>Material:</strong> {info.material}</p>
            <p>{info.blurb}</p>
            <button
              className={styles.launchButton}
              onClick={() => router.push(`/meteors/impact?mass=${demoMeteor.mass}&diameter=${demoMeteor.diameter}&speed=${demoMeteor.speed}`)}
            >
              Launch
            </button>
          </div>
        )}
      </div>

      <div ref={mountRef} className={styles.viewer} />

      {/* Lighting control at the bottom center */}
      <div style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 32,
        display: 'flex',
        justifyContent: 'center',
        zIndex: 20
      }}>
        <div style={{
          display: 'flex',
          gap: 16,
          background: 'rgba(20,20,20,0.85)',
          borderRadius: 12,
          boxShadow: '0 2px 12px #000a',
          padding: '8px 24px',
          alignItems: 'center',
          border: '1px solid #222'
        }}>
          <button
            onClick={() => setLighting('flood')}
            style={{
              background: lighting === 'flood' ? 'linear-gradient(90deg,#fff,#ccc)' : 'transparent',
              color: lighting === 'flood' ? '#111' : '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '8px 18px',
              fontWeight: 600,
              fontSize: 16,
              cursor: 'pointer',
              boxShadow: lighting === 'flood' ? '0 4px 16px #fff8' : 'none',
              transition: 'all 0.15s'
            }}
          >
            Flood Light
          </button>
          <button
            onClick={() => setLighting('shadow')}
            style={{
              background: lighting === 'shadow' ? 'linear-gradient(90deg,#222,#444)' : 'transparent',
              color: lighting === 'shadow' ? '#fff' : '#aaa',
              border: 'none',
              borderRadius: 6,
              padding: '8px 18px',
              fontWeight: 600,
              fontSize: 16,
              cursor: 'pointer',
              boxShadow: lighting === 'shadow' ? '0 2px 8px #0008' : 'none',
              transition: 'all 0.15s'
            }}
          >
            Shadow Lighting
          </button>
        </div>
      </div>
    </div>
  );
}

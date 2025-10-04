import * as THREE from 'three';

export function createThermalSunShader(canvasWidth: number, canvasHeight: number) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(canvasWidth, canvasHeight) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec2 vUv;
      uniform float uTime;
      uniform vec2 uResolution;

      #define M_PI 3.14159265359

      // --- Simplex-like 2D noise ---
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f*f*(3.0-2.0*f);

        return mix(
          mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
          mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x),
          u.y
        );
      }

      // --- Fractal Brownian Motion ---
      float fbm(vec2 p) {
        float total = 0.0;
        float amplitude = 0.5;
        for(int i=0; i<5; i++) {
          total += noise(p) * amplitude;
          p *= 2.0;
          amplitude *= 0.5;
        }
        return total;
      }

      void main() {
        vec2 uv = vUv * 2.0 - 1.0; // normalize to [-1,1]
        uv.x *= uResolution.x / uResolution.y;

        float t = uTime * 0.2;

        // Turbulent displacement
        float n = fbm(uv * 3.0 + t);
        float m = fbm(uv * 5.0 - t*0.5);

        // Sun/fire-like color palette
        vec3 color = vec3(0.0);
        color = mix(color, vec3(1.0, 0.4, 0.0), n);        // fiery orange
        color = mix(color, vec3(1.0, 1.0, 0.0), m*0.7);    // yellow highlights
        color = mix(color, vec3(0.2, 0.0, 0.0), 1.0-n);   // dark patches

        // Enhance contrast and glow
        color = pow(color, vec3(1.5));

        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });

  return material;
}

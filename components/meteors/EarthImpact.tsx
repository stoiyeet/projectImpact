import * as THREE from 'three'
import { useMemo } from 'react'
import { useLoader, useFrame } from '@react-three/fiber'
import { TextureLoader } from 'three'


interface Meteor { mass:number, diameter:number, speed:number }
interface Impact { lat:number, lon:number }

interface EarthImpactProps {
  meteor: Meteor;
  impact: Impact;
  t: number;
  onImpactSelect?: (lat: number, lon: number) => void;
}

export default function EarthImpact({ meteor, impact, t, onImpactSelect }: EarthImpactProps) {
  const R = 1 // normalized Earth radius
  const normal = useLoader(TextureLoader, '/textures/earthDay2.png')
  // const rough  = useLoader(TextureLoader, '/textures/earth_rough.jpg')

  const impactPos = useMemo(()=>latLonToVec3(impact.lat, impact.lon, R+0.001),[impact])
  const startPos = useMemo(()=>latLonToVec3(impact.lat, impact.lon, 2*R),[impact])

  // Fireball / Shockwave scale based on mass/diameter/speed (normalized)
const effectScale = useMemo(() => impactEffectScale(meteor), [meteor])

  // Handler to convert double-click to lat/lon
  function handleDoubleClick(e: any) {
    if (!onImpactSelect) return;
    const p = e.point.clone().normalize();
    const lat = THREE.MathUtils.radToDeg(Math.asin(p.y));
    const lon = THREE.MathUtils.radToDeg(Math.atan2(p.z, p.x));
    onImpactSelect(lat, lon);
  }

  return (
    <group>
      {/* Earth Sphere */}
      <mesh onDoubleClick={handleDoubleClick}>
        <sphereGeometry args={[R, 128, 128]} />
        <meshStandardMaterial map={normal} metalness={0}/>
      </mesh>

      {/* Atmosphere */}
      <mesh>
        <sphereGeometry args={[R*1.01, 64, 64]} />
        <meshBasicMaterial color={'#3399ff'} transparent opacity={0.2} />
      </mesh>

      {/* Asteroid flight - animated */}
      {t<0.4 && 
      <mesh position={meteorFlightPosition(t, impactPos, startPos)}>
        <sphereGeometry args={[0.02,16,16]} />
        <meshStandardMaterial color="orange" />
      </mesh>

      }
      

      {/* Impact flash */}
      {t > 0.38 && t < 0.43 && (
        <mesh position={impactPos}>
          <sphereGeometry args={[0.02 + effectScale * (t-0.38)*1.5, 32, 32]} />
          <meshBasicMaterial
            color="#fffbe7"
            transparent
            opacity={Math.max(0, 1.2 - 10*Math.abs(t-0.405))}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Shockwave ring */}
      {t > 0.39 && (
        <mesh position={impactPos.clone().multiplyScalar(1.01)} rotation={ringRotation(impactPos)}>
          <ringGeometry args={[
            0.001 + (t-0.39)*0.01,               // inner radius
            0.01 + effectScale*(t-0.39)*1.2,     // outer radius scales with meteor
            64, 1
          ]}/>
          <meshBasicMaterial
            color="#ffbb88"
            transparent
            opacity={Math.max(0, 0.4 - (t-0.39)*1.5)}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}


    </group>
  )
}

function latLonToVec3(lat:number, lon:number, R:number){
  const la = THREE.MathUtils.degToRad(lat)
  const lo = THREE.MathUtils.degToRad(lon)
  return new THREE.Vector3(
    R*Math.cos(la)*Math.cos(lo),
    R*Math.sin(la),
    R*Math.cos(la)*Math.sin(lo)
  )
}

export function ringRotation(surfacePoint: THREE.Vector3) {
  const normal = surfacePoint.clone().normalize() // points outward from sphere
  const tangent = new THREE.Vector3(1, 0, 0)     // arbitrary tangent vector
  if (normal.dot(tangent) > 0.999) tangent.set(0, 0, 1) // avoid colinear

  const binormal = new THREE.Vector3().crossVectors(normal, tangent).normalize()
  const alignedTangent = new THREE.Vector3().crossVectors(binormal, normal).normalize()

  const m = new THREE.Matrix4()
  m.makeBasis(alignedTangent, binormal, normal) // X=tangent, Y=binormal, Z=normal
  const euler = new THREE.Euler().setFromRotationMatrix(m)
  return euler
}

// Animate meteor from start to impact point as t goes 0 to 0.4
function meteorFlightPosition(t: number, impactPos: THREE.Vector3, startPos: THREE.Vector3) {
  if (t <= 0) return startPos;
  if (t >= 0.4) return impactPos;
  const alpha = t / 0.4;
  return startPos.clone().lerp(impactPos, alpha);
}

function impactEffectScale(meteor: Meteor) {
  // Kinetic-energy-like scaling: proportional to (mass * speed^2)^(1/3)
  const energy = meteor.mass * meteor.speed ** 2
  return Math.cbrt(energy) * 1e-10 // normalized for your scene
}

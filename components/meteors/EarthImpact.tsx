import * as THREE from 'three'
import { useMemo } from 'react'
import { useLoader, useFrame } from '@react-three/fiber'
import { TextureLoader } from 'three'

interface Meteor { mass:number, diameter:number, speed:number }
interface Impact { lat:number, lon:number }

export default function EarthImpact({ meteor, impact, t }:{meteor:Meteor, impact:Impact, t:number}) {
  const R = 1 // normalized Earth radius
  const normal = useLoader(TextureLoader, '/textures/earthDay2.png')
  // const rough  = useLoader(TextureLoader, '/textures/earth_rough.jpg')

  const impactPos = useMemo(()=>latLonToVec3(impact.lat, impact.lon, R+0.001),[impact])
  const startPos = useMemo(()=>latLonToVec3(impact.lat, impact.lon, 2*R),[impact])

  // Fireball / Shockwave scale based on mass/diameter/speed (normalized)
  const effectScale = useMemo(()=>Math.cbrt(meteor.mass)*1e-5, [meteor])

  return (
    <group>
      {/* Earth Sphere */}
      <mesh>
        <sphereGeometry args={[R, 128, 128]} />
        <meshStandardMaterial map={normal} metalness={0}/>
      </mesh>

      {/* Atmosphere */}
      <mesh>
        <sphereGeometry args={[R*1.01, 64, 64]} />
        <meshBasicMaterial color={'#3399ff'} transparent opacity={0.2} />
      </mesh>

      {/* Asteroid flight - animated */}
      <mesh position={meteorFlightPosition(t, impactPos, startPos)}>
        <sphereGeometry args={[0.02,16,16]} />
        <meshStandardMaterial color='orange' />
      </mesh>
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
function ringRotation(n:THREE.Vector3){
  const up = new THREE.Vector3(0,1,0)
  const q = new THREE.Quaternion().setFromUnitVectors(up, n.clone().normalize())
  const e = new THREE.Euler().setFromQuaternion(q)
  return e
}

// Animate meteor from start to impact point as t goes 0 to 0.4
function meteorFlightPosition(t: number, impactPos: THREE.Vector3, startPos: THREE.Vector3) {
  if (t <= 0) return startPos;
  if (t >= 0.4) return impactPos;
  const alpha = t / 0.4;
  return startPos.clone().lerp(impactPos, alpha);
}

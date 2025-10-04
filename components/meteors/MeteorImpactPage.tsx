import React, { useState, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import EarthImpact from './EarthImpact'

// Example hardcoded asteroid data
const DEFAULT_METEOR = {
  name: 'Demo Meteor',
  mass: 2.7e19,      // kg
  diameter: 226e3,   // meters
  speed: 25e3        // m/s
}

export default function MeteorImpactPage({ meteor = DEFAULT_METEOR }) {
  const [impactLat, setImpactLat] = useState(20) // degrees
  const [impactLon, setImpactLon] = useState(-45)
  const [t, setT] = useState(0) // timeline 0->1

  return (
    <div style={{ width:'100vw', height:'100vh', position:'relative' }}>
      {/* Info text top right */}
      <div style={{position:'absolute', top:20, right:30, color:'#fff', background:'rgba(0,0,0,0.6)', padding:'10px 18px', borderRadius:3, zIndex:10, fontSize:12, fontWeight:500}}>
        Double-click the globe to set the impact location
      </div>

      <Canvas camera={{ position: [0,2.5,5], fov: 45 }}>
        <ambientLight intensity={0.3} />
        <directionalLight position={[5,5,5]} intensity={1} />
        <EarthImpact
          meteor={meteor}
          impact={{ lat: impactLat, lon: impactLon }}
          t={t}
          onImpactSelect={(lat, lon) => {
            setImpactLat(lat);
            setImpactLon(lon);
          }}
        />
        <OrbitControls enableZoom={true} />
      </Canvas>

      {/* Timeline slider */}
      <div style={{ position:'absolute', bottom:100, left:700, width:'50%' }}>
        <input type="range" min={0} max={1} step={0.01} value={t} onChange={e=>setT(parseFloat(e.target.value))} />
      </div>
    </div>
  )
}

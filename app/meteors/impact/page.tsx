'use client';

import { useSearchParams } from 'next/navigation';
import MeteorImpactPage from '@/components/meteors/MeteorImpactPage';

export default function ImpactPage() {
  const params = useSearchParams();

  const mass     = Number(params.get('mass'))     || 2.7e19;   // kg
  const diameter = Number(params.get('diameter')) || 226e3;    // meters
  const speed    = Number(params.get('speed'))    || 25e3;     // m/s
  const name     = params.get('name') || '16_psyche';          // default selection id from list page

  const meteor = { name, mass, diameter, speed };
  return <MeteorImpactPage meteor={meteor} />;
}

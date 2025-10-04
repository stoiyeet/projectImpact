'use client';
import React from 'react';

export default function ImpactStyles() {
  return (
    <style>{`
      /* Shared label styling */
      .impact-label, .damage-zone-label {
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      /* Impact badge */
      .impact-label {
        gap: 4px;
        background: linear-gradient(135deg, rgba(0,0,0,0.95), rgba(20,20,20,0.9));
        border: 2px solid var(--label-color, #ffff00);
        border-radius: 12px;
        padding: 12px 16px;
        color: var(--label-color, #ffff00);
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        font-weight: bold;
        letter-spacing: 0.5px;
        text-align: center;
        line-height: 1.3;
        text-shadow: 0 0 8px currentColor;
        backdrop-filter: blur(4px);
        transform: translateZ(0);
      }
      .impact-icon { font-size: 20px; animation: pulse 2s infinite; }
      .impact-energy {
        font-size: 10px; opacity: 0.8; font-weight: normal;
      }

      /* Damage zone pill */
      .damage-zone-label {
        gap: 2px;
        background: linear-gradient(135deg, rgba(0,0,0,0.92), rgba(10,10,10,0.88));
        border: 2px solid var(--zone-color, #00aaff);
        border-radius: 10px;
        padding: 8px 12px;
        color: var(--zone-color, #00aaff);
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 11px;
        font-weight: 600;
        text-align: center;
        line-height: 1.2;
        text-shadow: 0 0 6px currentColor;
        backdrop-filter: blur(3px);
        transform: translateZ(0);
        min-width: 80px;
      }
      .zone-type { font-size: 8px; font-weight: 700; opacity: 0.7; letter-spacing: 0.5px; }
      .zone-name { font-size: 11px; font-weight: 600; }
      .zone-radius { font-size: 9px; opacity: 0.6; }

      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.7; transform: scale(1.1); }
      }
    `}</style>
  );
}

"use client";
import React, { useState } from "react";
import SpaceScene from "@/components/SpaceScene";
import ChatBot from "@/components/ChatBot";
import { ChevronUp, ChevronDown, MessageSquare } from "lucide-react";

/* ---------------------------- Types ---------------------------- */
type EffectKey =
  | "kineticImpactor"
  | "nuclearDetonation"
  | "gravityTractor"
  | "laserAblation"
  | "ionBeamShepherd"
  | "analyze";

/* ----------------------- Effect config ----------------------- */
const EFFECTS_CONFIG = {
  kineticImpactor: { icon: "🚀", label: "Kinetic Impactor" },
  nuclearDetonation: { icon: "☢️", label: "Nuclear Detonation" },
  gravityTractor: { icon: "🛸", label: "Gravity Tractor" },
  laserAblation: { icon: "🔦", label: "Laser Ablation" },
  ionBeamShepherd: { icon: "⚡", label: "Ion Beam Shepherd" },
  analyze: { icon: "🔍", label: "Analyze Target" },
} as const;

/* Single-effect setter */
function makeEmptyEffects(): Record<EffectKey, boolean> {
  return Object.keys(EFFECTS_CONFIG).reduce((acc, k) => {
    acc[k as EffectKey] = false;
    return acc;
  }, {} as Record<EffectKey, boolean>);
}

const Page: React.FC = () => {
  const [effects, setEffects] = useState<Record<EffectKey, boolean>>(makeEmptyEffects());
  const [followingAsteroid, setFollowingAsteroid] = useState(false);
  const [asteroidClicked, setAsteroidClicked] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);

  const effectsActiveCount = Object.values(effects).filter(Boolean).length;

  const setSingleEffect = (key: EffectKey | null) => {
    const next = makeEmptyEffects();
    if (key) next[key] = true;
    setEffects(next);
  };

  const clearAllEffects = () => setSingleEffect(null);
  const toggleChatExpansion = () => setChatExpanded((v) => !v);

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden">
      <div className="flex h-full">
        {/* LEFT: 3D Scene */}
        <div className={`relative transition-all duration-300 ${chatExpanded ? "w-2/3" : "w-full"} h-full`}>
          <div className="w-full h-full">
            <SpaceScene
              effects={effects}
              followingAsteroid={followingAsteroid}
              asteroidClicked={asteroidClicked}
              onAsteroidClick={() => {
                setAsteroidClicked(true);
                setFollowingAsteroid((prev) => !prev);
              }}
            />
          </div>

          {/* HUD */}
          <div className="absolute top-4 left-4 z-10 bg-black/70 backdrop-blur-md rounded-xl p-3 text-white">
            <div className="font-bold">🌍 Earth Defense</div>
            <div className="text-sm opacity-90">
              {effectsActiveCount > 0 ? `${effectsActiveCount} strategy active` : "Chat to deploy defense"}
            </div>
          </div>

          {/* Manual Mitigation Controls (enforce single-effect) */}
          <div className="absolute bottom-4 left-4 z-20">
            <details className="bg-gray-900/80 backdrop-blur-md rounded-xl border border-gray-700 w-56">
              <summary className="cursor-pointer px-3 py-2 text-sm font-semibold flex items-center justify-between">
                <span>⚙️ Manual Mitigation</span>
                <ChevronUp size={14} />
              </summary>
              <div className="max-h-64 overflow-y-auto p-2 space-y-3 text-sm">
                {[
                  { key: "analyze", label: "Analyze Target", icon: "🔍", description: "Scan and gather detailed information about the Impactor-2025 asteroid" },
                  { key: "nuclearDetonation", label: "Nuclear Option", icon: "☢️", description: "Detonate near the asteroid to deflect with explosive force" },
                  { key: "laserAblation", label: "Laser Defense", icon: "🔦", description: "Heat the surface with lasers to vaporize material and push it" },
                  { key: "gravityTractor", label: "Gravity Tractor", icon: "🛸", description: "Use a spacecraft's gravity to slowly tug the asteroid's path" },
                  { key: "ionBeamShepherd", label: "Ion Beam Shepherd", icon: "⚡", description: "Fire a steady ion stream to nudge the asteroid over time" },
                  { key: "kineticImpactor", label: "Kinetic Impactor", icon: "🚀", description: "Crash a high-speed probe to alter the asteroid's trajectory" },
                ].map(({ key, label, icon, description }) => (
                  <div key={key} className="bg-gray-800/70 rounded-lg p-2 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{icon}</span>
                      <span className="font-medium">{label}</span>
                    </div>
                    <img
                      src={`/images/${key}.jpg`}
                      alt={label}
                      className="w-full h-20 object-cover rounded-md border border-gray-600"
                    />
                    <p className="text-xs text-gray-300">{description}.</p>
                    <button
                      onClick={() => setSingleEffect(key as EffectKey)}
                      className="bg-blue-600 hover:bg-blue-700 text-xs px-3 py-1 rounded-md self-start"
                    >
                      {key === "analyze" ? "Scan" : "Launch"}
                    </button>
                  </div>
                ))}
                {/* Complete/clear button */}
                <button
                  onClick={() => setSingleEffect(null)}
                  className="w-full mt-2 bg-gray-700 hover:bg-gray-600 text-xs px-3 py-2 rounded-md"
                >
                  -- complete --
                </button>
              </div>
            </details>
          </div>

          {effectsActiveCount > 0 && (
            <button
              onClick={clearAllEffects}
              className="absolute top-20 left-4 z-10 bg-red-600/80 backdrop-blur-md px-3 py-1 rounded-lg border border-red-400/50 text-white text-sm hover:bg-red-700 transition"
            >
              🛑 Clear Strategies
            </button>
          )}
        </div>

        {/* RIGHT PANEL */}
        {chatExpanded && (
          <div className="w-1/3 h-full">
            <ChatBot
              effects={effects}
              onSetSingleEffect={setSingleEffect}
              expanded={chatExpanded}
              onToggleExpanded={toggleChatExpansion}
            />
          </div>
        )}
      </div>

      {/* Floating open button */}
      {!chatExpanded && (
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={toggleChatExpansion}
            className="bg-blue-600 hover:bg-blue-700 p-3 rounded-full shadow-lg transition-colors flex items-center gap-2 text-white"
          >
            <MessageSquare size={20} />
            <ChevronUp size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Page;

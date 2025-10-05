"use client";
import React, { useState, useEffect } from "react";
import SpaceScene from "@/components/SpaceScene";
import ChatBot from "@/components/ChatBot";
import { ChevronUp, MessageSquare } from "lucide-react";
import Image from "next/image";

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const effectsActiveCount = Object.values(effects).filter(Boolean).length;

  const setSingleEffect = (key: EffectKey | null) => {
    console.log('Setting single effect:', key);
    const next = makeEmptyEffects();
    if (key) {
      next[key] = true;
      console.log('Activating effect:', key);
    }
    setEffects(next);
  };

  const clearAllEffects = () => {
    console.log('Clearing all effects');
    setSingleEffect(null);
  };
  
  const toggleChatExpansion = () => setChatExpanded((v) => !v);

  if (!mounted) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden">
      <div className="flex h-full flex-col md:flex-row">
        {/* LEFT: 3D Scene */}
        <div className={`relative transition-all duration-300 ${chatExpanded ? "w-full md:w-2/3 h-1/2 md:h-full" : "w-full h-full"}`}>
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
          <div className="absolute top-16 md:top-4 left-2 md:left-4 right-2 md:right-auto z-10 bg-black/70 backdrop-blur-md rounded-xl p-2 md:p-3 text-white max-w-[calc(100%-1rem)] md:max-w-xs">
            <div className="font-bold text-sm md:text-base">🌍 Earth Defense</div>
            <div className="text-xs md:text-sm opacity-90">
              {effectsActiveCount > 0 ? `${effectsActiveCount} strategy active` : "Chat to deploy defense"}
            </div>
            {effectsActiveCount > 0 && (
              <div className="text-xs opacity-70 mt-1 truncate">
                {Object.entries(effects)
                  .filter(([_, active]) => active)
                  .map(([key, _]) => EFFECTS_CONFIG[key as EffectKey]?.label)
                  .join(", ")}
              </div>
            )}
          </div>

          {/* Manual Mitigation Controls (single-effect) */}
          <div className="absolute bottom-4 left-2 md:left-4 z-20 max-w-[calc(100vw-1rem)] md:max-w-none">
            <details className="bg-gray-900/80 backdrop-blur-md rounded-xl border border-gray-700 w-full md:w-64">
              <summary className="cursor-pointer px-3 py-2 text-sm font-semibold flex items-center justify-between min-h-[44px]">
                <span>⚙️ Manual Mitigation</span>
                <ChevronUp size={14} />
              </summary>
              <div className="max-h-[50vh] md:max-h-64 overflow-y-auto p-2 space-y-3 text-sm">
                {[
                  { key: "kineticImpactor", label: "Kinetic Impactor", icon: "🚀", description: "Launch a high-speed probe to crash into and alter the asteroid's trajectory" },
                  { key: "nuclearDetonation", label: "Nuclear Option", icon: "☢️", description: "Detonate near the asteroid to deflect with explosive force" },
                  { key: "laserAblation", label: "Laser Defense", icon: "🔦", description: "Heat the surface with lasers to vaporize material and push it" },
                  { key: "gravityTractor", label: "Gravity Tractor", icon: "🛸", description: "Use a spacecraft's gravity to slowly tug the asteroid's path" },
                  { key: "ionBeamShepherd", label: "Ion Beam Shepherd", icon: "⚡", description: "Fire a steady ion stream to nudge the asteroid over time" },
                ].map(({ key, label, icon, description }) => (
                  <div key={key} className="bg-gray-800/70 rounded-lg p-2 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{icon}</span>
                      <span className="font-medium">{label}</span>
                      {effects[key as EffectKey] && (
                        <span className="ml-auto text-green-400 text-xs">ACTIVE</span>
                      )}
                    </div>
                    <div className="relative w-full h-20">
                      <Image
                        src={`/images/${key}.jpg`}
                        alt={label}
                        fill
                        sizes="(max-width: 768px) 100vw, 224px"
                        className="rounded-md border border-gray-600 object-cover"
                        priority={false}
                      />
                    </div>
                    <p className="text-xs text-gray-300">{description}</p>
                    <button
                      onClick={() => setSingleEffect(key as EffectKey)}
                      className={`text-xs px-3 py-2 rounded-md self-start transition-colors min-h-[44px] ${
                        effects[key as EffectKey] 
                          ? "bg-green-600 hover:bg-green-700" 
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                      disabled={effects[key as EffectKey]}
                    >
                      {effects[key as EffectKey] ? "Running..." : (key === "analyze" ? "Scan" : "Launch")}
                    </button>
                  </div>
                ))}
                {/* Complete/clear button */}
                <button
                  onClick={clearAllEffects}
                  className="w-full mt-2 bg-gray-700 hover:bg-gray-600 text-xs px-3 py-2 rounded-md transition-colors min-h-[44px]"
                >
                  Complete Mission
                </button>
              </div>
            </details>
          </div>

          {/* Clear Strategies Button */}
          {effectsActiveCount > 0 && (
            <button
              onClick={clearAllEffects}
              className="absolute top-32 md:top-20 left-2 md:left-4 z-10 bg-red-600/80 backdrop-blur-md px-3 py-2 rounded-lg border border-red-400/50 text-white text-sm hover:bg-red-700 transition-colors min-h-[44px]"
            >
              🛑 Clear Strategies
            </button>
          )}
        </div>

        {/* RIGHT PANEL */}
        {chatExpanded && (
          <div className="w-full md:w-1/3 h-1/2 md:h-full">
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
            className="bg-blue-600 hover:bg-blue-700 p-3 rounded-full shadow-lg transition-colors flex items-center gap-2 text-white min-h-[56px] min-w-[56px] justify-center"
            aria-label="Open chat"
          >
            <MessageSquare size={24} />
            <ChevronUp size={20} className="hidden sm:block" />
          </button>
        </div>
      )}
    </div>
  );
};

export default Page;
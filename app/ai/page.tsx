// app/page.tsx
"use client";
import React, { useRef, useState, useEffect } from "react";
import SpaceScene from "@/components/SpaceScene";
import { Send, Bot, User, ChevronUp, ChevronDown } from "lucide-react";

// === Types ===
type EffectKey =
  | "kineticImpactor"
  | "nuclearDetonation"
  | "gravityTractor"
  | "laserAblation"
  | "ionBeamShepherd";

interface ChatMessage {
  id: string;
  content: string;
  role: "user" | "assistant";
  effects?: EffectKey[];
}

// === Effect Configuration ===
const EFFECTS_CONFIG = {
  kineticImpactor: { icon: "🚀", label: "Kinetic Impactor" },
  nuclearDetonation: { icon: "☢️", label: "Nuclear Detonation" },
  gravityTractor: { icon: "🛸", label: "Gravity Tractor" },
  laserAblation: { icon: "🔦", label: "Laser Ablation" },
  ionBeamShepherd: { icon: "⚡", label: "Ion Beam Shepherd" },
} as const;

// === Parse Effects from Response ===
const parseEffectsFromResponse = (response: string): EffectKey[] => {
  const effectKeywords: Record<EffectKey, string[]> = {
    kineticImpactor: [
      "kinetic impactor",
      "dart mission",
      "hit the asteroid",
      "ram the asteroid",
      "crash probe",
      "deflection mission",
    ],
    nuclearDetonation: [
      "nuclear",
      "nuke",
      "detonate",
      "explosion",
      "atomic",
      "blast",
      "thermonuclear",
      "warhead",
    ],
    gravityTractor: [
      "gravity tractor",
      "tug spacecraft",
      "gravitational pull",
      "hover near",
      "gravitational tug",
      "space tug",
      "gradual deflection",
    ],
    laserAblation: [
      "laser",
      "ablation",
      "vaporize surface",
      "beam energy",
      "photonic pressure",
    ],
    ionBeamShepherd: [
      "ion beam",
      "charged particles",
      "shepherd",
      "plasma thruster",
    ],
  };

  const detectedEffects: EffectKey[] = [];
  const lowerResponse = response.toLowerCase();

  (Object.keys(effectKeywords) as EffectKey[]).forEach((effect) => {
    if (
      effectKeywords[effect].some((keyword) =>
        lowerResponse.includes(keyword)
      )
    ) {
      detectedEffects.push(effect);
    }
  });

  return detectedEffects;
};

// === Main Page ===
const Page: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      content:
        "Welcome to Asteroid Defense Simulator! I'm your planetary defense AI. Describe a strategy to deflect the incoming asteroid — kinetic impact, nuclear detonation, gravity tractor, laser ablation, or other methods — and I'll simulate it in real time.",
      role: "assistant",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [effects, setEffects] = useState<Record<EffectKey, boolean>>(
    Object.keys(EFFECTS_CONFIG).reduce((acc, key) => {
      acc[key as EffectKey] = false;
      return acc;
    }, {} as Record<EffectKey, boolean>)
  );
  const [followingAsteroid, setFollowingAsteroid] = useState(false);
  const [asteroidClicked, setAsteroidClicked] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const effectsActiveCount = Object.values(effects).filter(Boolean).length;

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message
  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: input,
      role: "user",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
      });

      const data = await res.json();
      const assistantContent =
        data?.answer ?? "I couldn't process that strategy.";

      // Parse effects
      const detectedEffects = parseEffectsFromResponse(assistantContent);

      // Update effects
      if (detectedEffects.length > 0) {
        setEffects((prev) => {
          const newEffects = { ...prev };
          detectedEffects.forEach((effect) => {
            newEffects[effect] = true;
          });
          return newEffects;
        });
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: assistantContent,
        role: "assistant",
        effects: detectedEffects,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: "⚠️ Failed to reach the AI. Please try again.",
        role: "assistant",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearEffects = () => {
    setEffects(
      Object.keys(EFFECTS_CONFIG).reduce((acc, key) => {
        acc[key as EffectKey] = false;
        return acc;
      }, {} as Record<EffectKey, boolean>)
    );
  };

  const toggleChatExpansion = () => {
    setChatExpanded(!chatExpanded);
  };

  return (
    <div className="flex flex-row w-full h-screen bg-black text-white">
      {/* LEFT: 3D Scene (2/3 width) */}
      <div className="relative flex-1">
        <SpaceScene
          effects={effects}
          followingAsteroid={followingAsteroid}
          asteroidClicked={asteroidClicked}
          onAsteroidClick={() => {
            setAsteroidClicked(true);
            setFollowingAsteroid((prev) => !prev);
          }}
        />

        {/* HUD Overlay */}
        <div className="absolute top-4 left-4 z-10 bg-black/70 backdrop-blur-md rounded-xl p-3 text-white">
          <div className="font-bold">🌍 Earth Defense</div>
          <div className="text-sm opacity-90">
            {effectsActiveCount > 0
              ? `${effectsActiveCount} strategy active`
              : "Chat to deploy defense"}
          </div>
        </div>

        {effectsActiveCount > 0 && (
          <button
            onClick={clearEffects}
            className="absolute top-20 left-4 z-10 bg-red-600/80 backdrop-blur-md px-3 py-1 rounded-lg border border-red-400/50 text-white text-sm hover:bg-red-700 transition"
          >
            🛑 Clear Strategies
          </button>
        )}
      </div>

      {/* RIGHT: Chat (1/3 width, expandable height) */}
      <div
        className={`w-1/3 flex flex-col border-l border-gray-700 bg-gray-900/80 backdrop-blur-sm transition-all duration-300 ${
          chatExpanded ? "h-2/3" : "h-1/3"
        } self-end`}
      >
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-700 bg-gray-800/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot size={20} />
            <h2 className="text-xl font-bold">Strategy AI</h2>
            <div className="flex flex-wrap gap-1 ml-4">
              {Object.entries(effects)
                .filter(([, active]) => active)
                .map(([key]) => {
                  const config = EFFECTS_CONFIG[key as EffectKey];
                  return (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1 bg-blue-500/30 px-2 py-1 rounded-full text-xs"
                    >
                      {config.icon} {config.label}
                    </span>
                  );
                })}
            </div>
          </div>
          <button
            onClick={toggleChatExpansion}
            className="bg-gray-700 hover:bg-gray-600 p-2 rounded-lg transition-colors flex items-center gap-2"
          >
            {chatExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            <span className="text-sm">
              {chatExpanded ? "Minimize" : "Expand"}
            </span>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`flex gap-2 max-w-[80%] ${
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === "user" ? "bg-blue-500" : "bg-purple-600"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User size={16} className="text-white" />
                  ) : (
                    <Bot size={16} className="text-white" />
                  )}
                </div>
                <div
                  className={`p-3 rounded-2xl ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-100"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  {msg.effects && msg.effects.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-500/50">
                      <div className="text-xs opacity-80 mb-1">Activated:</div>
                      <div className="flex flex-wrap gap-1">
                        {msg.effects.map((effect) => {
                          const config = EFFECTS_CONFIG[effect];
                          return (
                            <span
                              key={effect}
                              className="inline-flex items-center gap-1 bg-green-500/30 px-2 py-1 rounded-full text-xs"
                            >
                              {config.icon} {config.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                  <Bot size={16} className="text-white" />
                </div>
                <div className="bg-gray-700 p-3 rounded-2xl">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-white rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-white rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-700 bg-gray-800/30">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Try: 'Launch a kinetic impactor' or 'Use a nuclear detonation'"
              className="flex-1 bg-gray-800 border border-gray-600 rounded-xl px-4 py-2 text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              rows={2}
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-4 py-2 rounded-xl flex items-center justify-center transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Click the asteroid to toggle camera tracking. Use expand button to
            see more chat history.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Page;

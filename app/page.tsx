"use client";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import React, { useState, useEffect } from "react";
import LoadingScreen from "../components/LoadingScreen";

const EarthScene = dynamic(() => import("@/components/EarthScene"), { ssr: false });

export default function Home(): React.ReactElement {
  const [currentPhase, setCurrentPhase] = useState<"loading" | "project">("loading");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [sceneLoaded, setSceneLoaded] = useState(false);

  useEffect(() => {
    // Simulate loading progress
    const loadingInterval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(loadingInterval);
          // Start loading the 3D scene
          setTimeout(() => setSceneLoaded(true), 300);
          // Transition to project phase
          setTimeout(() => setCurrentPhase("project"), 1000);
          return 100;
        }
        const increment = Math.random() * 15 + 5;
        return Math.min(prev + increment, 100);
      });
    }, 150);

    return () => clearInterval(loadingInterval);
  }, []);

  return (
    <main className="relative w-full h-screen bg-black text-white overflow-hidden">
      {/* 3D Background Scene */}
      <motion.div
        className="absolute inset-0 w-full h-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: sceneLoaded ? 1 : 0 }}
        transition={{ duration: 2, ease: "easeInOut" }}
      >
        <EarthScene />
      </motion.div>

      {/* Overlay Text Content */}
      <section className="absolute inset-0 z-10 flex items-center justify-center px-10 pointer-events-none">
        <AnimatePresence mode="wait">
          {currentPhase === "loading" && (
            <motion.div
              key="loading-screen"
              className="flex items-center justify-center w-full h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            >
              <LoadingScreen loadingProgress={loadingProgress} />
            </motion.div>
          )}

          {currentPhase === "project" && (
            <motion.div
              key="project-text"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="absolute inset-0 flex flex-col items-start justify-center text-right max-w-xl ml-auto mr-10 pointer-events-auto"
            >
              {/* Subtitle */}
              <motion.p
                className="text-lg md:text-2xl mb-3 text-gray-300"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
              >
                Near Earth Objects
              </motion.p>

              {/* Title */}
              <motion.h1
                className="text-6xl md:text-8xl font-extrabold tracking-tight mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <motion.span
                  className="text-cyan-400"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                >
                  N
                </motion.span>
                <motion.span
                  className="text-cyan-300"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6, duration: 0.4 }}
                >
                  E
                </motion.span>
                <motion.span
                  className="text-cyan-200"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7, duration: 0.4 }}
                >
                  O
                </motion.span>
              </motion.h1>

              {/* Description */}
              <motion.p
                className="text-gray-400 text-base md:text-lg leading-relaxed mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.6 }}
              >
                Tracking asteroids and space objects that orbit near Earth.  
                Project NEO combines real-time data, interactive 3D visualization,  
                and advanced simulations to bring space exploration closer to home.
              </motion.p>

              {/* CTA Button */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2, duration: 0.6 }}
                className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-black font-semibold rounded-lg shadow-lg pointer-events-auto"
              >
                Explore the Data
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}

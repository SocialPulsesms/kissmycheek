'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CrownLogo } from './CrownLogo';

export const SplashScreen: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Check if splash was already shown in this app session
    if (typeof window !== 'undefined') {
      try {
        if (sessionStorage.getItem('kmc_splash_shown') === 'true') {
          setIsVisible(false);
          setIsDismissed(true);
          return;
        }
      } catch (e) {
        // Fallback if sessionStorage is disabled
      }
    }

    // Smooth progression from 0% to 100% over 1850ms
    const startTime = Date.now();
    const duration = 1850;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.floor((elapsed / duration) * 100));
      setProgress(pct);
      if (elapsed >= duration) {
        clearInterval(interval);
      }
    }, 40);

    // Fade out after exactly 2 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('kmc_splash_shown', 'true');
        } catch (e) {}
      }
    }, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  if (isDismissed && !isVisible) {
    return null;
  }

  return (
    <AnimatePresence onExitComplete={() => setIsDismissed(true)}>
      {isVisible && (
        <motion.div
          key="kmc-luxury-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[99999] bg-[#050507] flex flex-col items-center justify-center select-none overflow-hidden pointer-events-auto"
          style={{ willChange: 'opacity' }}
        >
          {/* Subtle Deep Ambient Vignette */}
          <div className="absolute inset-0 bg-radial from-transparent via-[#050507]/70 to-[#020203] pointer-events-none" />

          {/* Central Deep Crown Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0.9 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="flex flex-col items-center relative z-10 px-6 text-center max-w-sm"
          >
            {/* Deep Royal Crown Emblem */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 mb-4 relative">
              <CrownLogo className="w-full h-full" showRing={true} variant="deep" />
              {/* Subtle pulsing aura ring */}
              <div className="absolute inset-0 rounded-full border border-[#C69E46]/20 animate-ping opacity-25 pointer-events-none" />
            </div>

            {/* Deep Gold Typography */}
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-[0.25em] text-[#E5C378] drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
              KISSMYCHEEK
            </h1>
            
            <span className="text-[9px] uppercase tracking-[0.35em] text-[#C69E46]/80 font-medium mt-1.5">
              EXCLUSIVE DATING & SOCIAL CLUB
            </span>

            {/* Loading Indicator with Animated 2-second Progress Bar */}
            <div className="mt-8 flex flex-col items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs tracking-widest text-[#C69E46]/90 uppercase font-medium">
                <span>Loading</span>
                <span className="inline-flex gap-0.5">
                  <span className="animate-pulse">.</span>
                  <span className="animate-pulse delay-150">.</span>
                  <span className="animate-pulse delay-300">.</span>
                </span>
              </div>
              
              {/* Luxury Gold Progress Bar (0% to 100%) */}
              <div className="w-32 h-1 bg-[#1A1815] rounded-full overflow-hidden mt-1 p-0.5 border border-[#C69E46]/20">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-[#C69E46] via-[#E5C378] to-[#F9E99B] transition-all duration-75 ease-out shadow-[0_0_8px_rgba(229,195,120,0.5)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

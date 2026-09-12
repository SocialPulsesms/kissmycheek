'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CrownLogo } from './CrownLogo';

export const SplashScreen: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Show splash for exactly 2 seconds on app launch
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="fixed inset-0 z-[99999] bg-[#050507] flex flex-col items-center justify-center select-none overflow-hidden"
        >
          {/* Subtle Deep Ambient Vignette */}
          <div className="absolute inset-0 bg-radial from-transparent via-[#050507]/70 to-[#020203] pointer-events-none" />

          {/* Central Deep Crown Container */}
          <motion.div
            initial={{ scale: 0.96, opacity: 1 }}
            animate={{ scale: [0.96, 1, 0.98, 1], opacity: 1 }}
            transition={{ duration: 2, ease: 'easeInOut' }}
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

            {/* Loading Indicator with Animated Progress */}
            <div className="mt-8 flex flex-col items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs tracking-widest text-[#C69E46]/90 uppercase font-medium">
                <span>Loading</span>
                <span className="inline-flex gap-0.5">
                  <span className="animate-bounce delay-100">.</span>
                  <span className="animate-bounce delay-200">.</span>
                  <span className="animate-bounce delay-300">.</span>
                </span>
              </div>
              
              {/* Refined Gold Loading Bar */}
              <div className="w-28 h-0.5 bg-[#1F1912] rounded-full overflow-hidden mt-1">
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                  className="w-full h-full bg-gradient-to-r from-transparent via-[#E5C378] to-transparent"
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

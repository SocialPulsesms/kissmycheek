'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const SplashScreen: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

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

    // Fast ~2 seconds loading duration from navigation start
    const elapsedSinceNav = typeof performance !== 'undefined' ? performance.now() : 0;
    const remainingTime = Math.max(700, Math.min(2000, 2000 - elapsedSinceNav));

    const timer = setTimeout(() => {
      setIsVisible(false);
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('kmc_splash_shown', 'true');
        } catch (e) {}
      }
    }, remainingTime);

    return () => {
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
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[99999] bg-[#050507] flex items-center justify-center select-none overflow-hidden pointer-events-auto"
          style={{ willChange: 'opacity' }}
        >
          {/* Central Luxury Crown Emblem — Matches the exact launch screenshot */}
          <motion.div
            initial={{ scale: 0.96, opacity: 0.95 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex items-center justify-center p-4 relative z-10"
          >
            <img
              src="/crown-emblem.png"
              alt="Kiss My Cheek"
              className="w-36 h-36 sm:w-44 sm:h-44 object-contain pointer-events-none drop-shadow-[0_0_35px_rgba(212,175,55,0.3)]"
              loading="eager"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};


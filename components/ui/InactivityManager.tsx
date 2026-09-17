'use client';

import { useEffect } from 'react';
import { performLogout } from '@/lib/authClient';

const INACTIVITY_LIMIT_MS = 10 * 60 * 1000; // 10 minutes
const STORAGE_KEY = 'kmc_last_active_ts';

export function InactivityManager() {
  useEffect(() => {
    // Only monitor on browser environment
    if (typeof window === 'undefined') return;

    // Check if session token exists in cookies
    const hasActiveSession = () => {
      return document.cookie.includes('session-token=') && !document.cookie.includes('session-token=;');
    };

    const updateLastActive = () => {
      try {
        localStorage.setItem(STORAGE_KEY, Date.now().toString());
      } catch {}
    };

    const checkInactivity = () => {
      if (!hasActiveSession()) return;

      try {
        const lastActiveStr = localStorage.getItem(STORAGE_KEY);
        if (!lastActiveStr) {
          updateLastActive();
          return;
        }

        const lastActive = parseInt(lastActiveStr, 10);
        const elapsed = Date.now() - lastActive;

        if (elapsed >= INACTIVITY_LIMIT_MS) {
          try {
            if (sessionStorage.getItem('kmc_in_call') === '1') {
              updateLastActive();
              return;
            }
          } catch {}
          console.warn('[Security] User inactive for > 10 minutes. Triggering automatic logout.');
          localStorage.removeItem(STORAGE_KEY);
          performLogout();
        }
      } catch (err) {
        console.error('[Security] Inactivity check error:', err);
      }
    };

    // Initialize timestamp if not present
    updateLastActive();

    // Interaction events to reset inactivity timer
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    let throttleTimeout: NodeJS.Timeout | null = null;

    const handleUserActivity = () => {
      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          updateLastActive();
          throttleTimeout = null;
        }, 2000); // Throttle writes to once every 2 seconds
      }
    };

    activityEvents.forEach(evt => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    // Check on visibility change (e.g., user returns to app after phone screen was locked or app in background)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkInactivity);

    // Periodic check every 5 seconds
    const interval = setInterval(checkInactivity, 5000);

    return () => {
      activityEvents.forEach(evt => {
        window.removeEventListener(evt, handleUserActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkInactivity);
      clearInterval(interval);
      if (throttleTimeout) clearTimeout(throttleTimeout);
    };
  }, []);

  return null;
}

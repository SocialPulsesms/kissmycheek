'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

declare global {
  interface Window {
    kmcHandleAndroidBack?: () => boolean;
  }
}

export function AppBackButtonHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    // Universal In-App Back Navigation Handler
    const handleUniversalBack = (): boolean => {
      const currentPath = pathnameRef.current || window.location.pathname || '';

      // 1. Close any visible open modal, lightbox, popup or drawer first
      const modalCloseBtn = document.querySelector<HTMLButtonElement>(
        '[data-modal-close], .modal-close, [aria-label="Close"], button[title="Close"], button[title="Close modal"]'
      );
      if (modalCloseBtn && modalCloseBtn.offsetParent !== null) {
        modalCloseBtn.click();
        return true;
      }

      // 2. If in active call stage, let the call stage's back / end button handle it
      const callEndBtn = document.querySelector<HTMLButtonElement>('button[title="End Call and Return to Chat"]');
      if (callEndBtn && callEndBtn.offsetParent !== null) {
        callEndBtn.click();
        return true;
      }

      // 3. If in an active messages conversation thread, return to thread list
      if (currentPath.startsWith('/messages')) {
        const backToConvBtn = document.querySelector<HTMLButtonElement>(
          'button[title="Back to conversations"]'
        );
        if (backToConvBtn && backToConvBtn.offsetParent !== null) {
          backToConvBtn.click();
          return true;
        }
      }

      // 4. If in Naughty Zone, always return cleanly to Discover
      if (currentPath.includes('/naughty-zone')) {
        router.push('/discover');
        return true;
      }

      // 5. Non-root routes (e.g. /boost, /events, /membership, /profile/xxx, /settings, /child-safety, /privacy)
      const rootPaths = ['/discover', '/login', '/register', '/'];
      const isRootPath = rootPaths.includes(currentPath);

      if (!isRootPath) {
        try {
          if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back();
          } else {
            router.push('/discover');
          }
        } catch {
          router.push('/discover');
        }
        return true;
      }

      // If on root path (/discover), return false to let Android handle exit or double-tap
      return false;
    };

    window.kmcHandleAndroidBack = handleUniversalBack;

    // Listen for Cordova / Capacitor document 'backbutton' event
    const handleDocumentBackButton = (e: Event) => {
      e.preventDefault();
      handleUniversalBack();
    };
    document.addEventListener('backbutton', handleDocumentBackButton, false);

    let removeCapacitorListener: (() => void) | null = null;

    const initCapacitorBackButton = async () => {
      try {
        const { App } = await import('@capacitor/app');

        let lastExitTap = 0;

        const handle = await App.addListener('backButton', ({ canGoBack }) => {
          const handled = handleUniversalBack();
          if (handled) return;

          const now = Date.now();
          if (now - lastExitTap < 2000) {
            App.exitApp();
          } else {
            lastExitTap = now;
            if (canGoBack) {
              try {
                window.history.back();
              } catch {}
            }
          }
        });

        removeCapacitorListener = () => {
          handle.remove();
        };
      } catch {}
    };

    initCapacitorBackButton();

    return () => {
      document.removeEventListener('backbutton', handleDocumentBackButton);
      if (removeCapacitorListener) removeCapacitorListener();
      delete window.kmcHandleAndroidBack;
    };
  }, [router]);

  return null;
}

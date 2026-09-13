'use client';

import React from 'react';

export interface StartCallEventDetail {
  partnerId: string;
  partnerName?: string;
  partnerPhoto?: string;
  partnerOccupation?: string;
  partnerLocation?: string;
  mode?: 'voice' | 'video';
  roomId?: string;
  role?: 'caller' | 'callee';
}

/**
 * Cleanly disabled call launcher.
 * Video & audio calls have been removed by user request.
 */
export function startInAppCall(_detail?: StartCallEventDetail) {
  // Calling is currently removed/offline
  if (typeof window !== 'undefined') {
    // No-op
  }
}

/**
 * GlobalCallManager
 * Calling features disabled. Returns null and performs no background polling or audio rings.
 */
export function GlobalCallManager() {
  return null;
}

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
  roomUrl?: string;
  role?: 'caller' | 'callee';
}

export async function startInAppCall(_detail: StartCallEventDetail): Promise<void> {
  // Video and audio calls have been retired to prioritize high-interactivity messaging
  return;
}

export function GlobalCallManager() {
  return null;
}

'use client';

import React from 'react';

export interface LiveCallStageProps {
  partnerId: string;
  partnerName?: string;
  partnerPhoto?: string;
  partnerOccupation?: string;
  partnerLocation?: string;
  initialMode?: 'voice' | 'video';
  initialRoomId?: string;
  roomUrl?: string;
  role?: 'caller' | 'callee';
  onEndCall?: () => void;
}

export function LiveCallStage({ onEndCall }: LiveCallStageProps) {
  React.useEffect(() => {
    if (onEndCall) onEndCall();
  }, [onEndCall]);

  return null;
}

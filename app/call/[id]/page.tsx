'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LiveCallStage } from '@/components/call/LiveCallStage';

function CallContent({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  const modeParam = (searchParams.get('mode') || searchParams.get('type')) === 'voice' ? 'voice' : 'video';
  const nameParam = searchParams.get('name') ? decodeURIComponent(searchParams.get('name')!) : 'Club Member';
  const photoParam = searchParams.get('photo') ? decodeURIComponent(searchParams.get('photo')!) : '';
  const roleParam = searchParams.get('role') === 'callee' ? 'callee' : 'caller';
  const roomParam = searchParams.get('room') || undefined;

  return (
    <LiveCallStage
      partnerId={resolvedParams.id}
      partnerName={nameParam}
      partnerPhoto={photoParam}
      initialMode={modeParam}
      initialRoomId={roomParam}
      role={roleParam}
      onEndCall={() => {
        router.push(`/messages?recipient=${resolvedParams.id}&name=${encodeURIComponent(nameParam)}&photo=${encodeURIComponent(photoParam)}`);
      }}
    />
  );
}

export default function CallPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={
      <div className="h-[100dvh] w-full bg-black text-[#F4F4F6] flex flex-col items-center justify-center p-6 text-center select-none font-sans">
        <div className="w-16 h-16 rounded-full border-2 border-[#D4AF37] border-t-transparent animate-spin mb-4" />
        <span className="font-serif text-lg text-[#D4AF37] tracking-wider">Establishing Encrypted Date Room...</span>
      </div>
    }>
      <CallContent params={params} />
    </Suspense>
  );
}

'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Crown, MessageSquare, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

function CallContent({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  const nameParam = searchParams.get('name') ? decodeURIComponent(searchParams.get('name')!) : 'Club Member';
  const photoParam = searchParams.get('photo') ? decodeURIComponent(searchParams.get('photo')!) : '';

  return (
    <div className="h-[100dvh] w-full bg-[#070709] text-[#F4F4F6] flex flex-col items-center justify-center p-6 text-center select-none font-sans">
      <div className="max-w-md w-full bg-[#0E0E14] border border-[#D4AF37]/30 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/40 flex items-center justify-center mx-auto text-[#D4AF37]">
          <Crown className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="font-serif text-2xl font-bold text-[#F4F4F6]">
            Calling Unavailable
          </h2>
          <p className="text-sm text-white/60 leading-relaxed">
            Live audio and video calls have been temporarily decommissioned. Please connect with <span className="text-[#D4AF37] font-semibold">{nameParam}</span> via private dispatches.
          </p>
        </div>

        <div className="pt-2 flex flex-col gap-3">
          <Button
            variant="gold"
            fullWidth
            onClick={() => {
              router.push(`/messages?recipient=${resolvedParams.id}&name=${encodeURIComponent(nameParam)}&photo=${encodeURIComponent(photoParam)}`);
            }}
            icon={<MessageSquare className="w-4 h-4 text-black" />}
          >
            Open Chat with {nameParam.split(' ')[0]}
          </Button>

          <Link href="/messages" className="w-full">
            <Button variant="outline" fullWidth icon={<ArrowLeft className="w-4 h-4" />}>
              Back to Dispatches
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CallPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={
      <div className="h-[100dvh] w-full bg-black text-[#F4F4F6] flex flex-col items-center justify-center p-6 text-center select-none font-sans">
        <div className="w-16 h-16 rounded-full border-2 border-[#D4AF37] border-t-transparent animate-spin mb-4" />
        <span className="font-serif text-lg text-[#D4AF37] tracking-wider">Loading...</span>
      </div>
    }>
      <CallContent params={params} />
    </Suspense>
  );
}

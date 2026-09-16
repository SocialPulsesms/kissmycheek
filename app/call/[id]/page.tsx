'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MessageSquare } from 'lucide-react';

function RedirectContent({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const name = searchParams.get('name');
    const photo = searchParams.get('photo');
    const target = resolvedParams.id
      ? `/messages?recipient=${resolvedParams.id}${name ? `&name=${encodeURIComponent(name)}` : ''}${photo ? `&photo=${encodeURIComponent(photo)}` : ''}`
      : '/messages';
    router.replace(target);
  }, [resolvedParams.id, router, searchParams]);

  return (
    <div className="h-[100dvh] w-full bg-[#070709] text-[#F4F4F6] flex flex-col items-center justify-center p-6 text-center select-none font-sans">
      <div className="w-12 h-12 rounded-full border-2 border-[#D4AF37] border-t-transparent animate-spin mb-4" />
      <span className="font-serif text-base text-[#D4AF37] tracking-wider flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-[#D4AF37]" /> Redirecting to Exclusive Messages...
      </span>
    </div>
  );
}

export default function CallPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={
      <div className="h-[100dvh] w-full bg-[#070709] text-[#F4F4F6] flex flex-col items-center justify-center p-6 text-center select-none font-sans">
        <div className="w-12 h-12 rounded-full border-2 border-[#D4AF37] border-t-transparent animate-spin mb-4" />
        <span className="font-serif text-base text-[#D4AF37] tracking-wider">Loading...</span>
      </div>
    }>
      <RedirectContent params={params} />
    </Suspense>
  );
}

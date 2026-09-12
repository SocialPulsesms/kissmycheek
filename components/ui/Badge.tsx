'use client';

import React from 'react';
import { ShieldCheck, Crown, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BadgeProps {
  type?: 'verified' | 'tier' | 'compatibility' | 'interest' | 'live';
  label?: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  type = 'verified',
  label,
  className
}) => {
  if (type === 'verified') {
    return (
      <span className={twMerge("inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#F5E6CA] backdrop-blur-md shadow-[0_0_10px_rgba(212,175,55,0.2)]", className)}>
        <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
        <span>{label || 'Verified Member'}</span>
      </span>
    );
  }

  if (type === 'tier') {
    return (
      <span className={twMerge("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase bg-gradient-to-r from-[#E6C858]/20 to-[#9A7B1C]/20 border border-[#D4AF37]/50 text-[#FFF6D6]", className)}>
        <Crown className="w-3.5 h-3.5 text-[#D4AF37]" />
        <span>{label || 'ELITE CLUB'}</span>
      </span>
    );
  }

  if (type === 'compatibility') {
    return (
      <span className={twMerge("inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 border border-amber-400/40 text-amber-200", className)}>
        <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
        <span>{label}</span>
      </span>
    );
  }

  if (type === 'live') {
    return (
      <span className={twMerge("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400", className)}>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        <span>{label || 'Online Now'}</span>
      </span>
    );
  }

  return (
    <span className={twMerge("inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:border-[#D4AF37]/30 transition-all", className)}>
      {label}
    </span>
  );
};

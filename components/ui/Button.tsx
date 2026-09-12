'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: 'gold' | 'outline' | 'glass' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'gold',
  size = 'md',
  children,
  icon,
  fullWidth = false,
  className,
  ...props
}) => {
  const baseStyles = 'relative inline-flex items-center justify-center font-medium transition-all duration-300 rounded-full focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden';
  
  const variants = {
    gold: 'bg-gradient-to-r from-[#E6C858] via-[#D4AF37] to-[#9A7B1C] text-black font-semibold shadow-lg shadow-[#D4AF37]/25 hover:shadow-xl hover:shadow-[#D4AF37]/40 hover:brightness-110 active:scale-[0.98]',
    outline: 'border border-[#D4AF37]/40 text-[#F5E6CA] bg-transparent hover:bg-[#D4AF37]/10 hover:border-[#D4AF37] hover:shadow-[0_0_15px_rgba(212,175,55,0.25)]',
    glass: 'glass-panel text-[#F4F4F6] hover:border-[#D4AF37]/60 hover:shadow-[0_8px_25px_rgba(0,0,0,0.5)]',
    ghost: 'text-[#F4F4F6]/80 hover:text-[#D4AF37] hover:bg-white/5',
    danger: 'bg-rose-900/60 border border-rose-500/30 text-rose-200 hover:bg-rose-800/80 hover:border-rose-400'
  };

  const sizes = {
    sm: 'px-4 py-1.5 text-xs gap-1.5 tracking-wider uppercase',
    md: 'px-6 py-2.5 text-sm gap-2 tracking-wide',
    lg: 'px-8 py-3.5 text-base gap-2.5 tracking-wide font-medium',
    xl: 'px-10 py-4 text-lg gap-3 tracking-wide font-semibold'
  };

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      className={twMerge(
        clsx(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )
      )}
      {...props}
    >
      {/* Light sheen hover effect */}
      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full hover:animate-[shimmer_1.5s_infinite]" />
      
      {icon && <span className="relative z-10 shrink-0">{icon}</span>}
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
};

'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  variant?: 'glass' | 'solid' | 'gold-border';
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'glass',
  hoverable = true,
  className,
  ...props
}) => {
  const baseStyles = 'rounded-3xl p-6 relative overflow-hidden transition-all duration-300';
  
  const variants = {
    glass: 'glass-card',
    solid: 'bg-[#0D0D12] border border-white/10 shadow-2xl',
    'gold-border': 'glass-panel gold-border-glow'
  };

  return (
    <motion.div
      className={twMerge(
        clsx(
          baseStyles,
          variants[variant],
          hoverable && 'glass-card-hover cursor-pointer',
          className
        )
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
};

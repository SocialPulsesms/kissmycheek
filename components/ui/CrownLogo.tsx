import React from 'react';

interface CrownLogoProps {
  className?: string;
  showRing?: boolean;
  variant?: 'deep' | 'standard';
}

export const CrownLogo: React.FC<CrownLogoProps> = ({ 
  className = "w-10 h-10", 
  showRing = true,
  variant = 'deep'
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
      >
        <defs>
          {/* Deep Royal Metallic Gold Gradient */}
          <linearGradient id="kmcDeepCrownGradient" x1="15%" y1="10%" x2="85%" y2="90%">
            <stop offset="0%" stopColor="#E5C378" />
            <stop offset="35%" stopColor="#C69E46" />
            <stop offset="70%" stopColor="#8E6A21" />
            <stop offset="100%" stopColor="#5D4310" />
          </linearGradient>

          {/* Subtle Deep Shading */}
          <linearGradient id="kmcCrownFill" x1="50%" y1="20%" x2="50%" y2="80%">
            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#5D4310" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Outer Circular Ring */}
        {showRing && (
          <circle
            cx="50"
            cy="50"
            r="44"
            stroke="url(#kmcDeepCrownGradient)"
            strokeWidth="3.2"
            className="transition-all duration-300"
          />
        )}

        {/* Crown Body with subtle rich fill */}
        <path
          d="M32.2 58.8 L26.8 38.5 L40.5 49.8 L50 30.8 L59.5 49.8 L73.2 38.5 L67.8 58.8 Z"
          fill="url(#kmcCrownFill)"
          stroke="url(#kmcDeepCrownGradient)"
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Crown Base Jewels / Dots */}
        <circle cx="26.8" cy="38.5" r="1.5" fill="#E5C378" />
        <circle cx="50" cy="30.8" r="1.8" fill="#E5C378" />
        <circle cx="73.2" cy="38.5" r="1.5" fill="#E5C378" />

        {/* Underline Bar */}
        <line
          x1="32.5"
          y1="65.2"
          x2="67.5"
          y2="65.2"
          stroke="url(#kmcDeepCrownGradient)"
          strokeWidth="3.6"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};


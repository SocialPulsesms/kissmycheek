import React from 'react';

interface CrownLogoProps {
  className?: string;
  showRing?: boolean;
  variant?: 'deep' | 'standard';
}

export const CrownLogo: React.FC<CrownLogoProps> = ({ 
  className = "w-10 h-10", 
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <img
        src="/crown-emblem.png"
        alt="Kiss My Cheek"
        className="w-full h-full object-contain pointer-events-none drop-shadow-[0_2px_10px_rgba(212,175,55,0.3)]"
        loading="eager"
      />
    </div>
  );
};


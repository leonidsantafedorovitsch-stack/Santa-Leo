import React from 'react';

interface LMLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export const LMLogo: React.FC<LMLogoProps> = ({ 
  size = 40, 
  className = '',
  showText = false 
}) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Precision Geometric SVG Emblem for LM */}
      <div 
        className="relative shrink-0 flex items-center justify-center select-none"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_0_10px_rgba(56,189,248,0.45)]"
        >
          <defs>
            {/* Background Gradient */}
            <linearGradient id="lmBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0F172A" />
              <stop offset="50%" stopColor="#1E293B" />
              <stop offset="100%" stopColor="#0B1329" />
            </linearGradient>

            {/* Neon Cyan Stroke Gradient */}
            <linearGradient id="lmCyanBorder" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="50%" stopColor="#0284C7" />
              <stop offset="100%" stopColor="#38BDF8" />
            </linearGradient>

            {/* Letter L Gradient (Clean Bright White to Silver) */}
            <linearGradient id="lGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#CBD5E1" />
            </linearGradient>

            {/* Letter M Gradient (Electric Cyan to Azure) */}
            <linearGradient id="mGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7DD3FC" />
              <stop offset="50%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>

            {/* Subtle glow filter */}
            <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Squircle Badge Background */}
          <rect
            x="4"
            y="4"
            width="92"
            height="92"
            rx="24"
            fill="url(#lmBgGrad)"
            stroke="url(#lmCyanBorder)"
            strokeWidth="3.5"
          />

          {/* Subtle Inner Telemetry Grid / Accent Ring */}
          <rect
            x="11"
            y="11"
            width="78"
            height="78"
            rx="18"
            fill="none"
            stroke="#38BDF8"
            strokeWidth="0.8"
            strokeDasharray="4 4"
            opacity="0.3"
          />

          {/* Monogram: Geometric Letter 'L' */}
          <path
            d="M 22 28 
               L 31 28 
               L 31 64 
               L 44 64 
               L 44 72 
               L 22 72 
               Z"
            fill="url(#lGrad)"
          />

          {/* Monogram: Geometric Letter 'M' with Sharp Modern Angles */}
          <path
            d="M 48 72 
               L 48 28 
               L 57 28 
               L 66 51 
               L 75 28 
               L 84 28 
               L 84 72 
               L 75.5 72 
               L 75.5 42 
               L 69 58 
               L 63 58 
               L 56.5 42 
               L 56.5 72 
               Z"
            fill="url(#mGrad)"
          />

          {/* GPS Radar / Telemetry Accent Point above M */}
          <circle 
            cx="84" 
            cy="20" 
            r="4" 
            fill="#38BDF8" 
            filter="url(#glowFilter)"
          />
          <circle 
            cx="84" 
            cy="20" 
            r="1.8" 
            fill="#FFFFFF" 
          />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col select-none">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-black text-white text-base tracking-wider">
              LM
            </span>
            <span className="text-[10px] uppercase font-bold text-[#38BDF8] tracking-widest bg-[#38BDF8]/15 px-1.5 py-0.5 rounded border border-[#38BDF8]/30">
              GPS
            </span>
          </div>
          <span className="text-[11px] font-semibold text-[#94A3B8] tracking-tight mt-0.5">
            Дневник парковок
          </span>
        </div>
      )}
    </div>
  );
};

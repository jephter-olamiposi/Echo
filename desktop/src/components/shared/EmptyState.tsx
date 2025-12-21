import React from 'react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  title = "No History Yet", 
  description = "Copy something on your other devices to see it appear here instantly.",
  action
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-in fade-in zoom-in-95 duration-700 ease-(--spring-easing)">
      {/* Abstract Geometric Illustration */}
      <div className="relative w-48 h-48 mb-8">
        <div className="absolute inset-0 bg-purple-500/20 blur-[60px] rounded-full animate-pulse" />
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10 w-full h-full drop-shadow-2xl">
          <circle cx="100" cy="100" r="80" stroke="url(#paint0_linear)" strokeWidth="1" strokeDasharray="4 4" className="opacity-20 animate-[spin_10s_linear_infinite]" />
          <circle cx="100" cy="100" r="60" stroke="url(#paint1_linear)" strokeWidth="1" className="opacity-40" />
          
          <g className="animate-[bounce_3s_infinite]">
            <rect x="65" y="75" width="70" height="50" rx="8" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" transform="rotate(-6 100 100)" />
            <rect x="75" y="65" width="70" height="50" rx="8" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" transform="rotate(6 100 100)" />
          </g>

          <defs>
            <linearGradient id="paint0_linear" x1="20" y1="20" x2="180" y2="180" gradientUnits="userSpaceOnUse">
              <stop stopColor="#A855F7" stopOpacity="0" />
              <stop offset="0.5" stopColor="#A855F7" />
              <stop offset="1" stopColor="#A855F7" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="paint1_linear" x1="180" y1="20" x2="20" y2="180" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3B82F6" stopOpacity="0" />
              <stop offset="0.5" stopColor="#3B82F6" />
              <stop offset="1" stopColor="#3B82F6" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{title}</h3>
      <p className="text-zinc-500 text-sm leading-relaxed max-w-xs mx-auto font-medium">
        {description}
      </p>

      {action && (
        <div className="mt-8">
          {action}
        </div>
      )}
    </div>
  );
};

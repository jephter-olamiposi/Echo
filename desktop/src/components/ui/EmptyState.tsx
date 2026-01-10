import React from 'react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  title = "No history yet", 
  description = "Copy something on your other devices to see it appear here.",
  action
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {/* Simple Illustration */}
      <div className="relative w-32 h-32 mb-6">
        <div className="absolute inset-0 bg-purple-500/10 blur-2xl rounded-full" />
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10 w-full h-full text-(--color-text-tertiary)">
          <circle cx="100" cy="100" r="60" stroke="rgba(168,85,247,0.2)" strokeWidth="1" />
          <g>
            <rect x="70" y="75" width="60" height="50" rx="8" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeOpacity="0.2" />
          </g>
        </svg>
      </div>

      <h3 className="text-lg font-semibold text-(--color-text-primary) mb-2">{title}</h3>
      <p className="text-(--color-text-secondary) text-[14px] leading-relaxed max-w-xs mx-auto">
        {description}
      </p>

      {action && (
        <div className="mt-6">
          {action}
        </div>
      )}
    </div>
  );
};

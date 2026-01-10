import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'text';
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = "", 
  variant = 'rectangular' 
}) => {
  const baseStyles = "bg-(--color-surface-raised) animate-pulse overflow-hidden relative";
  
  const variantStyles = {
    rectangular: "rounded-2xl",
    circular: "rounded-full",
    text: "rounded-md"
  };

  return (
    <div 
      className={`
        ${baseStyles} 
        ${variantStyles[variant]} 
        ${className}
      `}
    >
      {/* Shimmer Effect */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-linear-to-r from-transparent via-(--color-highlight) to-transparent" />
    </div>
  );
};

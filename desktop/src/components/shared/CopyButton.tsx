import React, { useState } from 'react';
import { Icons } from '../Icons';
import { haptic } from '../../utils/haptics';

interface CopyButtonProps {
  content: string;
  onCopy: (text: string) => void;
  className?: string;
  children?: React.ReactNode;
  iconClassName?: string;
}

export const CopyButton: React.FC<CopyButtonProps> = ({ 
  content, 
  onCopy, 
  className = "", 
  children,
  iconClassName = "w-4 h-4"
}) => {
  const [copied, setCopied] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Trigger "Delight" logic
    haptic.success();
    setCopied(true);
    
    // Perform actual copy
    onCopy(content);

    // Reset after delay
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <button 
      className={`${className} group relative overflow-hidden`} 
      onClick={handleClick}
      disabled={copied}
      aria-label={copied ? "Copied to clipboard" : "Copy to clipboard"}
      title={copied ? "Copied!" : "Copy"}
      type="button"
    >
      <div className={`relative ${iconClassName} flex items-center justify-center`}>
        {/* Copy Icon - Exits when copied */}
        <div className={`absolute inset-0 transition-all duration-300 ease-(--spring-easing) ${copied ? 'scale-0 opacity-0 -rotate-45' : 'scale-100 opacity-100 rotate-0'}`}>
          {Icons.copy}
        </div>
        
        {/* Check Icon - Enters when copied */}
        <div className={`absolute inset-0 transition-all duration-300 ease-(--spring-easing) text-green-500 ${copied ? 'scale-100 opacity-100 rotate-0' : 'scale-0 opacity-0 rotate-45'}`}>
          {Icons.check}
        </div>
      </div>
      
      {children && (
         <span className={`transition-opacity duration-300 ${copied ? 'text-green-500' : ''}`}>
            {children}
         </span>
      )}
    </button>
  );
};

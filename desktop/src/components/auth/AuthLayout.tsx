import React from 'react';

export const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-dvh w-full bg-black flex justify-center pt-12 pb-40 px-6 relative">
      {/* Big Tech: Dynamic Mesh Background */}
      <div className="mesh-background" />
      <div className="mesh-orb w-100 h-100 bg-purple-600/20 top-0 -left-20" />
      <div className="mesh-orb w-75 h-75 bg-blue-600/10 bottom-20 -right-20" style={{ animationDelay: '-5s' }} />
      
      <div className="w-full max-w-md relative z-10 my-auto">
        <div className="flex flex-col items-center mb-12">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-2xl mb-4 rotate-3">
             <div className="w-8 h-8 text-black font-black text-2xl">E</div>
          </div>
          <span className="text-xl font-black text-white tracking-widest uppercase italic">Echo</span>
        </div>
        
        {children}
      </div>
    </div>
  );
};

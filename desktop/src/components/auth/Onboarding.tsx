import React, { useState } from 'react';
import { Icons } from '../Icons';
import { haptic } from '../../utils/haptics';

interface OnboardingProps {
  onComplete: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [slide, setSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const slides = [
    {
      title: "Your Clipboard,\nEverywhere.",
      desc: "Copy on your Mac, paste on your phone. Seamlessly sync across all your devices.",
      icon: Icons.clipboard,
      gradient: "from-purple-500 via-purple-600 to-blue-600",
      accentColor: "bg-purple-500",
    },
    {
      title: "Instant\nSync",
      desc: "Changes happen instantly. No delays, no waiting. Just seamless productivity.",
      icon: Icons.sync,
      gradient: "from-blue-500 via-cyan-500 to-teal-500",
      accentColor: "bg-blue-500",
    },
    {
      title: "Private &\nSecure",
      desc: "Your data is encrypted and stays yours. We can't read it, and neither can anyone else.",
      icon: Icons.shield,
      gradient: "from-emerald-500 via-green-600 to-teal-600",
      accentColor: "bg-emerald-500",
    }
  ];

  const currentSlide = slides[slide];

  const handleNext = () => {
    haptic.light();
    if (slide < slides.length - 1) {
      setSlide(slide + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    haptic.light();
    setSlide(slides.length - 1);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 75) {
      if (slide < slides.length - 1) {
        setSlide(slide + 1);
        haptic.light();
      }
    }

    if (touchStart - touchEnd < -75) {
      if (slide > 0) {
        setSlide(slide - 1);
        haptic.light();
      }
    }
  };

  return (
    <div 
      className="h-dvh w-full bg-black text-white flex flex-col relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Stylish Background - Matching AuthLayout */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-linear-to-br from-purple-900/20 via-black to-blue-900/20" />
        <div className="absolute top-0 left-0 w-100 h-100 bg-purple-500/20 rounded-full blur-[150px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-75 h-75 bg-blue-500/15 rounded-full blur-[120px] translate-x-1/3 translate-y-1/3" />
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-5" 
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }} 
        />
      </div>

      {/* Skip Button - Hidden on last slide */}
      {slide < slides.length - 1 && (
        <div className="absolute top-0 right-6 z-20" style={{ paddingTop: 'calc(env(safe-area-inset-top, 20px) + 1rem)' }}>
          <button 
            onClick={handleSkip}
            className="text-zinc-400 text-sm font-semibold hover:text-white transition-colors px-4 py-2"
          >
            Skip
          </button>
        </div>
      )}

      {/* Slides Container */}
      <div className="flex-1 relative px-6 pt-safe">
        <div 
          className="absolute inset-0 flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${slide * 100}%)`, paddingTop: 'env(safe-area-inset-top, 20px)' }}
        >
          {slides.map((s, i) => (
            <div key={i} className="w-full h-full shrink-0 flex flex-col items-center justify-center text-center px-6">
              {/* Icon Container - No underlying circle */}
              <div className="relative mb-12">
                <div className={`w-28 h-28 rounded-3xl bg-linear-to-br ${s.gradient} flex items-center justify-center shadow-2xl border border-white/20`}>
                  <div className="w-14 h-14 text-white">
                    {s.icon}
                  </div>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-4xl font-black mb-4 tracking-tight leading-tight whitespace-pre-line">
                {s.title}
              </h1>

              {/* Description */}
              <p className="text-zinc-400 text-base leading-relaxed max-w-xs mx-auto">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="p-8 pb-12 flex flex-col gap-6 z-10 relative">
        {/* Pagination Dots */}
        <div className="flex justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setSlide(i);
                haptic.light();
              }}
              className={`transition-all duration-300 rounded-full ${
                i === slide 
                  ? `${currentSlide.accentColor} w-8 h-2` 
                  : "bg-zinc-700 w-2 h-2"
              }`}
            />
          ))}
        </div>

        {/* Action Button */}
        {slide === slides.length - 1 ? (
          <button
            onClick={handleNext}
            className={`w-full py-4 rounded-2xl bg-linear-to-r ${currentSlide.gradient} text-white font-bold text-lg hover:opacity-90 active:scale-98 transition-all shadow-2xl`}
          >
            Get Started
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="w-full py-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-white font-bold text-lg hover:bg-white/15 active:scale-98 transition-all"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
};

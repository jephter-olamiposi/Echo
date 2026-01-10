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
      className="h-dvh w-full bg-(--color-bg) text-(--color-text-primary) flex flex-col relative overflow-hidden transition-colors duration-300"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Stylish Background - Matching AuthLayout */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-linear-to-br from-purple-900/20 via-(--color-bg) to-blue-900/20" />
        <div className="absolute top-0 left-0 w-100 h-100 bg-purple-500/20 rounded-full blur-[150px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-75 h-75 bg-blue-500/15 rounded-full blur-[120px] translate-x-1/3 translate-y-1/3" />
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-5" 
          style={{
            backgroundImage: 'linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }} 
        />
      </div>

      {/* Skip Button - Hidden on last slide */}
      {slide < slides.length - 1 && (
        <div className="absolute top-0 right-4 z-20 pt-safe">
          <button 
            onClick={handleSkip}
            className="text-(--color-text-secondary) text-[14px] font-medium hover:text-(--color-text-primary) transition-colors p-4"
          >
            Skip
          </button>
        </div>
      )}

      {/* Slides Container */}
      <div className="flex-1 relative">
        <div 
          className="absolute inset-0 flex transition-transform duration-500 ease-out pt-safe"
          style={{ transform: `translateX(-${slide * 100}%)` }}
        >
          {slides.map((s, i) => (
            <div key={i} className="w-full h-full shrink-0 flex flex-col items-center justify-center text-center px-8">
              {/* Icon Container with outer glow */}
              <div className="relative mb-14">
                <div className={`absolute inset-0 blur-2xl opacity-40 rounded-3xl bg-linear-to-br ${s.gradient}`} />
                <div className={`relative w-32 h-32 rounded-3xl bg-linear-to-br ${s.gradient} flex items-center justify-center shadow-xl border border-white/20 scale-110`}>
                  <div className="w-16 h-16 text-white drop-shadow-md">
                    {s.icon}
                  </div>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-3xl font-semibold mb-5 leading-[1.2] whitespace-pre-line text-(--color-text-primary)">
                {s.title}
              </h1>

              {/* Description */}
              <p className="text-(--color-text-tertiary) text-base leading-relaxed max-w-65 mx-auto font-normal">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="px-6 pb-safe pt-4 flex flex-col gap-8 z-10 relative mb-8">
        {/* Pagination Dots */}
        <div className="flex justify-center gap-2.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setSlide(i);
                haptic.light();
              }}
              className={`transition-all duration-500 rounded-full h-1.5 ${
                i === slide 
                  ? `${currentSlide.accentColor} w-8 shadow-[0_0_8px_rgba(168,85,247,0.4)]` 
                  : "bg-(--color-surface-raised) w-1.5"
              }`}
            />
          ))}
        </div>

        {/* Action Button */}
        {slide === slides.length - 1 ? (
          <button
            onClick={handleNext}
            className="w-full h-14 rounded-xl bg-(--color-text-primary) text-(--color-bg) font-semibold text-[16px] hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Get started
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="w-full h-14 rounded-xl bg-(--color-surface) border border-(--color-border) text-(--color-text-primary) font-semibold text-[16px] hover:bg-(--color-surface-raised) active:scale-[0.98] transition-all"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
};

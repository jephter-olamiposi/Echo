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
      meshColors: {
        1: "rgba(107, 33, 168, 0.45)", // Purple
        2: "rgba(59, 130, 246, 0.3)",  // Blue
        3: "rgba(236, 72, 153, 0.25)", // Magenta
        orb1: "rgba(139, 92, 246, 0.4)",
        orb2: "rgba(59, 130, 246, 0.3)"
      }
    },
    {
      title: "Instant\nSync",
      desc: "Changes happen instantly. No delays, no waiting. Just seamless productivity.",
      icon: Icons.sync,
      gradient: "from-blue-500 via-cyan-500 to-teal-500",
      accentColor: "bg-blue-500",
      meshColors: {
        1: "rgba(37, 99, 235, 0.4)",  // Blue
        2: "rgba(6, 182, 212, 0.35)", // Cyan
        3: "rgba(20, 184, 166, 0.25)", // Teal
        orb1: "rgba(6, 182, 212, 0.4)",
        orb2: "rgba(20, 184, 166, 0.3)"
      }
    },
    {
      title: "Private &\nSecure",
      desc: "Your data is encrypted and stays yours. We can't read it, and neither can anyone else.",
      icon: Icons.shield,
      gradient: "from-emerald-500 via-green-600 to-teal-600",
      accentColor: "bg-emerald-500",
      meshColors: {
        1: "rgba(16, 185, 129, 0.4)",  // Emerald
        2: "rgba(20, 184, 166, 0.35)", // Teal
        3: "rgba(59, 130, 246, 0.25)",  // Blue
        orb1: "rgba(52, 211, 153, 0.4)",
        orb2: "rgba(16, 185, 129, 0.3)"
      }
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
    const x = e.targetTouches[0].clientX;
    setTouchStart(x);
    setTouchEnd(x); // Reset touchEnd to prevent stale swipe math on clicks
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
      className="h-dvh w-full bg-(--color-bg) text-(--color-text-primary) flex flex-col relative overflow-hidden transition-colors duration-500"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        // Inject slide-specific colors override
        // @ts-ignore
        '--mesh-gradient-1': currentSlide.meshColors[1],
        // @ts-ignore
        '--mesh-gradient-2': currentSlide.meshColors[2],
        // @ts-ignore
        '--mesh-gradient-3': currentSlide.meshColors[3],
        // @ts-ignore
        '--orb-color-1': currentSlide.meshColors.orb1,
        // @ts-ignore
        '--orb-color-2': currentSlide.meshColors.orb2,
      }}
    >
      <div className="mesh-gradient-bg transition-colors duration-700" />

      <div className="gradient-orb gradient-orb-1 transition-all duration-700" />
      <div className="gradient-orb gradient-orb-2 transition-all duration-700" />
      <div className="gradient-orb gradient-orb-3 transition-all duration-700" />

      <div className="absolute inset-0 overflow-hidden pointer-events-none z-1">
        <div className="glass-shape shape-sphere float-slow w-32 h-32 top-[15%] left-[10%] opacity-40 blur-[2px] transition-all duration-500"
          style={{ transform: `translateX(${slide * 20}px) translateY(${slide * -10}px)` }} />
        <div className="glass-shape shape-ring rotate-slow w-48 h-48 top-[40%] right-[-5%] opacity-30 transition-all duration-500"
          style={{ transform: `scale(${1 + slide * 0.1})` }} />
        <div className="glass-shape shape-cube float-medium rotate-slow w-20 h-20 bottom-[20%] left-[15%] opacity-25 blur-[1px] transition-all duration-500" />
        <div className="glass-shape shape-sphere float-slow w-16 h-16 top-[60%] left-[40%] opacity-20 transition-all duration-500" />
        <div className="glass-shape shape-ring float-medium w-64 h-64 bottom-[-10%] right-[10%] opacity-15 blur-[4px] transition-all duration-500" />
      </div>

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

      <div className="flex-1 relative">
        <div
          className="absolute inset-0 flex transition-transform duration-500 ease-out pt-safe"
          style={{ transform: `translateX(-${slide * 100}%)` }}
        >
          {slides.map((s, i) => (
            <div key={i} className="w-full h-full shrink-0 flex flex-col items-center justify-center text-center px-8">
              <div className="relative mb-14 transition-all duration-500"
                style={{ transform: slide === i ? 'scale(1)' : 'scale(0.8)', opacity: slide === i ? 1 : 0.5 }}>
                <div className={`absolute inset-0 blur-2xl opacity-40 rounded-3xl bg-linear-to-br ${s.gradient} transition-all duration-500`} />
                <div className={`relative w-32 h-32 rounded-3xl bg-linear-to-br ${s.gradient} flex items-center justify-center shadow-xl border border-(--color-glass-border) scale-110`}>
                  <div className="w-16 h-16 text-white drop-shadow-md">
                    {s.icon}
                  </div>
                </div>
              </div>

              <h1 className="text-3xl font-semibold mb-5 leading-[1.2] whitespace-pre-line text-(--color-text-primary) transition-all duration-500"
                style={{ transform: slide === i ? 'translateY(0)' : 'translateY(20px)', opacity: slide === i ? 1 : 0 }}>
                {s.title}
              </h1>

              <p className="text-(--color-text-tertiary) text-base leading-relaxed max-w-65 mx-auto font-normal transition-all duration-500 delay-75"
                style={{ transform: slide === i ? 'translateY(0)' : 'translateY(20px)', opacity: slide === i ? 1 : 0 }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 pb-safe pt-4 flex flex-col gap-8 z-10 relative mb-8">
        <div className="flex justify-center gap-2.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setSlide(i);
                haptic.light();
              }}
              className={`transition-all duration-500 rounded-full h-1.5 ${i === slide
                ? `${currentSlide.accentColor} w-8 shadow-[0_0_8px_rgba(168,85,247,0.4)]`
                : "bg-(--color-surface-raised) w-1.5"
                }`}
            />
          ))}
        </div>

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

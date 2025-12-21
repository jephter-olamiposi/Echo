import { useState, useEffect, useCallback, useRef } from "react";

export const usePullToRefresh = (onRefresh: () => Promise<void>) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullHeight, setPullHeight] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const THRESHOLD = 80; // px to trigger refresh
  const MAX_HEIGHT = 120; // max visual pull height

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const scrollTop = containerRef.current?.scrollTop || 0;
    if (scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isPulling || isLoading) return;

      const y = e.touches[0].clientY;
      const diff = y - startY.current;

      // Only allow pulling if we are at the top and pulling down
      if (diff > 0 && (containerRef.current?.scrollTop || 0) === 0) {
        // Add resistance
        const newHeight = Math.min(diff * 0.4, MAX_HEIGHT);
        setPullHeight(newHeight);

        // Prevent default to stop scrolling while pulling
        if (e.cancelable) e.preventDefault();
      }
    },
    [isPulling, isLoading]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || isLoading) return;

    if (pullHeight > THRESHOLD) {
      setIsLoading(true);
      setPullHeight(60); // Snap to loading height
      await onRefresh();
      setIsLoading(false);
    }

    // Reset
    setPullHeight(0);
    setIsPulling(false);
  }, [isPulling, pullHeight, isLoading, onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener("touchstart", handleTouchStart);
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd);

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    containerRef,
    pullHeight,
    isLoading,
  };
};

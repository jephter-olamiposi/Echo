import { useState, useEffect, useCallback, useRef } from "react";

const THRESHOLD = 80;
const MAX_HEIGHT = 120;

export const usePullToRefresh = (onRefresh: () => Promise<void>) => {
  const [pullHeight, setPullHeight] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isPulling = useRef(false);
  const pullHeightRef = useRef(0);

  useEffect(() => {
    pullHeightRef.current = pullHeight;
  }, [pullHeight]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    isPulling.current = true;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling.current) return;
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) {
      isPulling.current = false;
      setPullHeight(0);
      return;
    }

    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      const newHeight = Math.min(diff * 0.4, MAX_HEIGHT);
      setPullHeight(newHeight);
      if (e.cancelable) e.preventDefault();
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullHeightRef.current >= THRESHOLD) {
      setIsLoading(true);
      setPullHeight(60);
      try {
        await onRefresh();
      } finally {
        setIsLoading(false);
        setPullHeight(0);
      }
    } else {
      setPullHeight(0);
    }
  }, [onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd);

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { containerRef, pullHeight, isLoading };
};

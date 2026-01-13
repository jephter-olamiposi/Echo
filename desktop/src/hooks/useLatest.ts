import { useRef, useLayoutEffect } from "react";

/**
 * Returns a ref that always contains the latest value.
 * Useful for accessing current values in callbacks without stale closures.
 * Uses useLayoutEffect to update synchronously after render.
 */
export function useLatest<T>(value: T): { readonly current: T } {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}

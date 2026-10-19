import { useEffect, useRef, useState } from "react";
import { easeOutCubic } from "./reveal";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Eased progress 0..1 that plays once when `ready` becomes true. With reduced motion it is 1 immediately.
 * It is time-based (not frame-counted), so a background tab still finishes on the exact final value.
 */
export function useReveal(ready: boolean, duration = 800): number {
  const [p, setP] = useState(() => (reduced() ? 1 : 0));
  const finished = useRef(reduced());

  useEffect(() => {
    if (!ready || finished.current) return;
    if (reduced()) { finished.current = true; setP(1); return; }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setP(easeOutCubic(t));
      if (t < 1) raf = requestAnimationFrame(tick);
      else finished.current = true;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready, duration]);

  return p;
}

import { useEffect, useRef } from 'react';
import { SLICES } from '../lib/sections';

export function computeSpin(start: number, steps: number) {
  return (start + steps) % SLICES;
}

export function useSpin(reduced: boolean) {
  const tokenRef = useRef(0);

  useEffect(() => {
    tokenRef.current = 0;
  }, []);

  async function spinSteps(steps: number, cb: (idx: number) => void) {
    if (reduced) {
      tokenRef.current = (tokenRef.current + steps) % SLICES;
      cb(tokenRef.current);
      return;
    }
    const start = tokenRef.current;
    const target = (start + steps) % SLICES;
    const total = Math.max(steps * 20, 300);
    const startTime = performance.now();
    await new Promise<void>(resolve => {
      const frame = (now: number) => {
        const t = Math.min(1, (now - startTime) / total);
        const progressed = Math.floor(t * steps);
        const idx = (start + progressed) % SLICES;
        cb(idx);
        if (t < 1) requestAnimationFrame(frame); else { tokenRef.current = target; resolve(); }
      };
      requestAnimationFrame(frame);
    });
  }

  return { spinSteps, get token() { return tokenRef.current; } } as const;
}

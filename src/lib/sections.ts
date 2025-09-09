import { clamp } from './math';

export const SLICES = 16;
export type SectionId = 'Largest Number' | 'Biggest Reserve' | 'Strongest Attack' | 'Momentum';
export interface Section { id: SectionId; color: string; start: number; end: number; }

export function inSection(index: number, s: Section): boolean {
  if (s.start <= s.end) return index >= s.start && index <= s.end;
  return index >= s.start || index <= s.end;
}

export function totalMove(p: number, e: number, slices = SLICES): number {
  return ((p % slices) + (e % slices)) % slices;
}

export function generateSections(): Section[] {
  // simple equal distribution: 4 sections each size 4
  const base: SectionId[] = ['Largest Number','Biggest Reserve','Strongest Attack','Momentum'];
  let start = 0;
  return base.map(id => {
    const len = 4;
    const sec: Section = { id, color: '#ccc', start, end: (start + len - 1) % SLICES };
    start = (start + len) % SLICES;
    return sec;
  });
}

// self-tests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if ((import.meta as any).vitest) {
  const secs = generateSections();
  console.assert(secs.length === 4);
  console.assert(secs.reduce((a,s)=>a+((s.end - s.start + 16)%16 + 1),0) === 16);
}

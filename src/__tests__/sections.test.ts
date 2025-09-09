import { describe, expect, it } from 'vitest';
import { inSection, generateSections, Section } from '../lib/sections';

describe('inSection', () => {
  it('handles normal range', () => {
    const s: Section = { id: 'Largest Number', color: '', start: 2, end: 5 };
    expect(inSection(3, s)).toBe(true);
    expect(inSection(6, s)).toBe(false);
  });
  it('handles wrap range', () => {
    const s: Section = { id: 'Largest Number', color: '', start: 12, end: 3 };
    expect(inSection(14, s)).toBe(true);
    expect(inSection(2, s)).toBe(true);
    expect(inSection(8, s)).toBe(false);
  });
});

describe('generateSections', () => {
  it('coverage sums to 16', () => {
    const secs = generateSections();
    let total = 0;
    secs.forEach(s => {
      const len = (s.end - s.start + 16) % 16 + 1;
      total += len;
    });
    expect(total).toBe(16);
  });
});

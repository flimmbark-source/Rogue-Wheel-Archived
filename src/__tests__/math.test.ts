import { describe, expect, it } from 'vitest';
import { totalMove } from '../lib/sections';

describe('totalMove', () => {
  it('wraps modulo slices', () => {
    expect(totalMove(17, 15)).toBe((17%16 + 15%16)%16);
    expect(totalMove(16, 0)).toBe(0);
  });
});

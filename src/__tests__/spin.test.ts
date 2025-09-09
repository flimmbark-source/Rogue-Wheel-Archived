import { describe, expect, it } from 'vitest';
import { computeSpin } from '../hooks/useSpin';

describe('spinSteps logic', () => {
  it('final index wraps modulo 16', () => {
    expect(computeSpin(0, 3)).toBe(3);
    expect(computeSpin(15, 4)).toBe(3);
  });
});

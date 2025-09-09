import { describe, expect, it } from 'vitest';
import { F_drawOne, F_refillTo, applyDamage, Fighter } from '../lib/fighter';

const makeF = (): Fighter => ({ name: 'x', hp: 10, maxHp: 10, block: 0, deck: [], hand: [], discard: [] });

describe('Fighter utilities', () => {
  it('drawOne pulls from discard when deck empty', () => {
    const f: Fighter = { ...makeF(), deck: [], discard: [{ id: 'a', name: 'c', type: 'Attack', number: 1 }] };
    const res = F_drawOne(f);
    expect(res.hand.length).toBe(1);
    expect(res.deck.length).toBe(0);
    expect(res.discard.length).toBe(0);
  });
  it('refillTo stops when sources empty', () => {
    const f: Fighter = { ...makeF(), deck: [], discard: [] };
    const res = F_refillTo(f, 3);
    expect(res.hand.length).toBe(0);
  });
  it('damage clamps and consumes block', () => {
    const f: Fighter = { ...makeF(), block: 2 };
    const res = applyDamage(f, 5);
    expect(res.block).toBe(0);
    expect(res.hp).toBe(7);
  });
});

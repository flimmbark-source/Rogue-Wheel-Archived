import { describe, expect, it } from 'vitest';
import { totalMove } from '../lib/sections';

describe('preEffects ordering', () => {
  interface Card { number: number; id: string }
  function order(cards: { who: 'player'|'enemy'; card: Card }[], initiative: 'player'|'enemy') {
    return cards.sort((a,b)=> a.card.number-b.card.number || (initiative===a.who?-1:1)).map(c=>c.who);
  }
  it('orders by lowest number then initiative', () => {
    const cards = [
      { who: 'player', card: { id:'p', number: 5 }},
      { who: 'enemy', card: { id:'e', number: 5 }}
    ];
    expect(order(cards,'player')).toEqual(['player','enemy']);
    expect(order(cards,'enemy')).toEqual(['enemy','player']);
  });
});

describe('0-step rule', () => {
  it('no movement when totalMove is 0', () => {
    const p = 16, e = 0;
    expect(totalMove(p,e)).toBe(0);
  });
});

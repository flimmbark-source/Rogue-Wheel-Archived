import { clamp } from './math';

export type CardType = 'Attack' | 'Defense' | 'Special';
export interface Card {
  id: string;
  name: string;
  type: CardType;
  number: number;
}

export interface Fighter {
  name: string;
  hp: number;
  maxHp: number;
  block: number;
  deck: Card[];
  hand: Card[];
  discard: Card[];
}

export function F_copy(f: Fighter): Fighter {
  return {
    ...f,
    deck: [...f.deck],
    hand: [...f.hand],
    discard: [...f.discard]
  };
}

export function F_drawOne(f: Fighter): Fighter {
  const q = F_copy(f);
  if (q.deck.length === 0) {
    q.deck = [...q.discard];
    q.discard = [];
  }
  if (q.deck.length) {
    q.hand.push(q.deck.shift()!);
  }
  return q;
}

export function F_refillTo(f: Fighter, n: number): Fighter {
  let q = f;
  while (q.hand.length < n) {
    const before = q.hand.length;
    q = F_drawOne(q);
    if (q.hand.length === before) break;
  }
  return q;
}

export function applyDamage(f: Fighter, dmg: number): Fighter {
  const raw = Math.max(0, dmg - f.block);
  const hp = clamp(f.hp - raw, 0, f.maxHp);
  const block = Math.max(0, f.block - dmg);
  return { ...f, hp, block };
}

export function addBlock(f: Fighter, amt: number): Fighter {
  return { ...f, block: f.block + amt };
}

// self-tests
if ((import.meta as any).vitest) {
  const base: Fighter = { name: 't', hp: 10, maxHp: 10, block: 0, deck: [], hand: [], discard: [] };
  console.assert(F_drawOne({ ...base, deck: [{ id: '1', name: 'a', type: 'Attack', number: 1 }], hand: [], discard: [] }).hand.length === 1);
  console.assert(F_refillTo({ ...base, deck: [], hand: [], discard: [] }, 2).hand.length === 0);
}

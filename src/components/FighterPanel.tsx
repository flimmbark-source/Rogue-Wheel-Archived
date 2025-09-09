import React from 'react';
import { Fighter } from '../lib/fighter';

export function FighterPanel({ f, side }: { f: Fighter; side: 'player' | 'enemy' }) {
  return (
    <div>
      <div>{f.name} ({side})</div>
      <div>HP {f.hp}/{f.maxHp} • 🛡 {f.block}</div>
      <div>Deck {f.deck.length} Hand {f.hand.length} Discard {f.discard.length}</div>
    </div>
  );
}

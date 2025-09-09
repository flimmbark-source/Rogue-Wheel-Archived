import React from 'react';
import { Card } from '../lib/fighter';

export function Hand({ cards, onSelect }: { cards: Card[]; onSelect?: (c: Card) => void }) {
  return (
    <div role="grid">
      {cards.map(c => (
        <button key={c.id} onClick={() => onSelect?.(c)} role="gridcell">
          {c.name} [{c.number}]
        </button>
      ))}
    </div>
  );
}

import React from 'react';
import { Card } from '../lib/fighter';

export function Hand({ cards, onSelect }: { cards: Card[]; onSelect?: (c: Card) => void }) {
  return (
    <div role="grid" className="flex gap-2 justify-center">
      {cards.map(c => (
        <button
          key={c.id}
          onClick={() => onSelect?.(c)}
          role="gridcell"
          className="relative transition-transform duration-200 
                     -translate-y-4 hover:-translate-y-6 
                     bg-white border rounded p-2 shadow"
        >
          <div className="text-sm font-bold">{c.name}</div>
          <div className="text-lg">{c.number}</div>
        </button>
      ))}
    </div>
  );
}

import React from 'react';
import { Card } from '../lib/fighter';

type HandProps = {
  cards: Card[];
  onSelect?: (c: Card) => void;
  /** How far above the bottom edge to lift the hand (px) */
  liftPx?: number;
};

export function Hand({ cards, onSelect, liftPx = 24 }: HandProps) {
  return (
    <div
      role="grid"
      className="fixed inset-x-0 bottom-0 z-40 pointer-events-none"
      // Lift the hand above the bottom, respecting iOS safe area
      style={{ bottom: `calc(env(safe-area-inset-bottom, 0px) + ${liftPx}px)` }}
    >
      <div
        className="pointer-events-auto mx-auto max-w-screen-md"
      >
        <div
          className="flex items-end justify-center gap-2 px-3 pb-2 overflow-x-auto"
          // Prevent accidental touch scrolling trapping; tweak if needed
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {cards.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect?.(c)}
              role="gridcell"
              className="shrink-0 transition-transform duration-200 bg-white/95 border border-black/10 rounded-lg px-3 py-2 shadow-md hover:-translate-y-2"
            >
              <div className="text-xs font-semibold opacity-70">{c.name}</div>
              <div className="text-xl font-bold leading-none">{c.number}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

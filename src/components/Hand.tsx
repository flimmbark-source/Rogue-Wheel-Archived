// Hand.tsx
import React from 'react';
import { createPortal } from 'react-dom';
import { Card } from '../lib/fighter';

type HandProps = {
  cards: Card[];
  onSelect?: (c: Card) => void;
  liftPx?: number; // how much to float it above the edge
};

export function Hand({ cards, onSelect, liftPx = 24 }: HandProps) {
  const handUI = (
    <div
      role="grid"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: `calc(env(safe-area-inset-bottom, 0px) + ${liftPx}px)`,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      <div style={{ maxWidth: 960, margin: '0 auto', pointerEvents: 'auto' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            gap: 8,
            padding: '0 12px 8px',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {cards.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect?.(c)}
              style={{
                flexShrink: 0,
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid rgba(0,0,0,0.1)',
                background: 'rgba(255,255,255,0.95)',
                boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                transform: 'translateY(-8px)',
                transition: 'transform 200ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-12px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(-8px)')}
            >
              <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.7 }}>{c.name}</div>
              <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{c.number}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // Render to <body> so transforms/overflow on ancestors can’t clip it
  return createPortal(handUI, document.body);
}

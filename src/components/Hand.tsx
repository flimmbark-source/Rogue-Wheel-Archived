// Hand.tsx
import React, { useLayoutEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { Card } from '../lib/fighter';

type HandProps = {
  cards: Card[];
  onSelect?: (c: Card) => void;
  liftPx?: number; // how far above the bottom to float
  reserveHeightPx?: number; // space to reserve at bottom of page
};

export function Hand({
  cards,
  onSelect,
  liftPx = 24,
  reserveHeightPx = 92
}: HandProps) {
  // Ensure an overlay root exists on <body>
  const overlayRoot = useMemo(() => {
    let el = document.getElementById('overlay-root');
    if (!el) {
      el = document.createElement('div');
      el.id = 'overlay-root';
      document.body.appendChild(el);
    }
    return el;
  }, []);

  // Reserve space at the bottom of the document so important UI isn’t hidden
  useLayoutEffect(() => {
    const spacer = document.createElement('div');
    spacer.setAttribute('data-hand-spacer', 'true');
    spacer.style.width = '100%';
    spacer.style.height = `${reserveHeightPx}px`;
    spacer.style.pointerEvents = 'none';
    document.body.appendChild(spacer);
    return () => { spacer.remove(); };
  }, [reserveHeightPx]);

  const ui = (
    <div
      role="grid"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        // sit above the system safe area + small lift
        bottom: `calc(env(safe-area-inset-bottom, 0px) + ${liftPx}px)`,
        zIndex: 2147483646,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          maxWidth: 980,
          margin: '0 auto',
          pointerEvents: 'auto',
        }}
      >
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
              role="gridcell"
              style={{
                flexShrink: 0,
                padding: '8px 12px',
                borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.12)',
                background: 'rgba(255,255,255,0.98)',
                boxShadow: '0 6px 16px rgba(0,0,0,0.18)',
                transform: 'translateY(-10px)', // “resting” lifted look
                transition: 'transform 180ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-16px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(-10px)')}
            >
              <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7 }}>{c.name}</div>
              <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{c.number}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return createPortal(ui, overlayRoot);
}

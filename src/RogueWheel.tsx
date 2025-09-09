import React, { useState } from 'react';
import { Fighter, F_refillTo } from './lib/fighter';
import { generateSections } from './lib/sections';
import { makePlayerStarterDeck, makeEnemyDeck } from './content/decks';
import { Wheel } from './components/Wheel';
import { FighterPanel } from './components/FighterPanel';
import { Hand } from './components/Hand';
import { ErrorBoundary } from './ErrorBoundary';
import { useSpin } from './hooks/useSpin';

export default function RogueWheel() {
  const [player, setPlayer] = useState<Fighter>(() => F_refillTo({ name: 'Hero', hp: 20, maxHp: 20, block: 0, deck: makePlayerStarterDeck(), hand: [], discard: [] }, 3));
  const [enemy, setEnemy] = useState<Fighter>(() => F_refillTo({ name: 'Bandit', hp: 12, maxHp: 12, block: 0, deck: makeEnemyDeck(), hand: [], discard: [] }, 3));
  const [sections] = useState(generateSections());
  const [log, setLog] = useState<string[]>([]);
  const [token, setToken] = useState(0);
  const spin = useSpin(false);

  function play(card: any) {
    setLog([`Played ${card.name}`, ...log]);
    spin.spinSteps(card.number, idx => setToken(idx));
  }

  return (
    <ErrorBoundary>
      <div>
        <FighterPanel f={player} side="player" />
        <Wheel sections={sections} token={token} />
        <FighterPanel f={enemy} side="enemy" />
        <Hand cards={player.hand} onSelect={play} />
        <div aria-live="polite">{log.map((l, i) => <div key={i}>{l}</div>)}</div>
      </div>
    </ErrorBoundary>
  );
}

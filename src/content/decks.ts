import { Card } from '../lib/fighter';

let uidCounter = 0;
const uid = () => `c${++uidCounter}`;

export function makePlayerStarterDeck(): Card[] {
  return [
    { id: uid(), name: 'Strike', type: 'Attack', number: 5 },
    { id: uid(), name: 'Guard', type: 'Defense', number: 4 },
    { id: uid(), name: 'Focus', type: 'Special', number: 3 },
  ];
}

export function makeEnemyDeck(): Card[] {
  return [
    { id: uid(), name: 'Claw', type: 'Attack', number: 6 },
    { id: uid(), name: 'Hide', type: 'Defense', number: 2 },
    { id: uid(), name: 'Roar', type: 'Special', number: 1 },
  ];
}

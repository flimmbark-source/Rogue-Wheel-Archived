import React from 'react';
import { Section, inSection, SLICES } from '../lib/sections';

export function Wheel({ sections, token }: { sections: Section[]; token: number }) {
  const slices = Array.from({ length: SLICES });
  return (
    <svg width={200} height={200} viewBox="0 0 200 200" role="img" aria-label="wheel">
      {slices.map((_, i) => (
        <circle key={i} cx={100} cy={100} r={90} fill={sections.find(s => inSection(i, s)) ? '#888' : '#222'} />
      ))}
      <circle cx={100} cy={100} r={10} fill="#fff" />
      <text x={100} y={20} textAnchor="middle">{token}</text>
    </svg>
  );
}

import { describe, it, expect } from 'vitest';
import type { FurnitureItem } from '../types/furniture';
import { presetScore } from './autoPopulate';

function makeItem(over: Partial<FurnitureItem> & { name: string }): FurnitureItem {
  const shape = over.shape ?? [[2]];
  let spaces = 0;
  for (const row of shape) for (const cell of row) if (cell === 2 || cell === 3) spaces++;
  spaces = Math.max(spaces, 1);
  const base = {
    image_url: '',
    appeal: 0, comfort: 0, stimulation: 0, health: 0, mutation: 0,
    ...over,
    shape,
  };
  return {
    ...base,
    id: over.id ?? over.name,
    spacesOccupied: spaces,
    appealPerSpace: base.appeal / spaces,
    comfortPerSpace: base.comfort / spaces,
    stimulationPerSpace: base.stimulation / spaces,
    healthPerSpace: base.health / spaces,
    mutationPerSpace: base.mutation / spaces,
  };
}

describe('presetScore', () => {
  const item = makeItem({ name: 'x', comfort: 2, stimulation: 3, health: 1, mutation: 4 });

  it('breeding = comfort + stimulation', () => {
    expect(presetScore(item, 'breeding')).toBe(5);
  });

  it('storage = 0.5*comfort + health - stimulation', () => {
    expect(presetScore(item, 'storage')).toBe(2 * 0.5 + 1 - 3); // -1
  });

  it('mutation = 0.5*comfort + mutation', () => {
    expect(presetScore(item, 'mutation')).toBe(5);
  });
});

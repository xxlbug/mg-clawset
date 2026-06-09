import type { FurnitureItem, StatKey } from '../types/furniture';

export type PresetKey = 'breeding' | 'storage' | 'mutation';

export interface PresetDef {
  label: string;
  weights: Partial<Record<StatKey, number>>;
}

export const PRESETS: Record<PresetKey, PresetDef> = {
  breeding: { label: 'Breeding', weights: { comfort: 1.0, stimulation: 1.0 } },
  storage: { label: 'Storage', weights: { comfort: 0.5, health: 1.0, stimulation: -1.0 } },
  mutation: { label: 'Mutation', weights: { comfort: 0.5, mutation: 1.0 } },
};

export function presetScore(item: FurnitureItem, preset: PresetKey): number {
  let score = 0;
  for (const [stat, weight] of Object.entries(PRESETS[preset].weights)) {
    score += item[stat as StatKey] * weight;
  }
  return score;
}

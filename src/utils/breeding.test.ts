import { describe, it, expect } from 'vitest';
import {
  betterStatChance,
  comfortMultiplier,
  pairCoverage,
  analyzeRoomsForBreeding,
  recommendBreedingRoom,
  TOTAL_STEPS,
  nextStep,
  PERFECT7_STAGES,
  type CatStat,
} from './breeding';
import type { FurnitureItem, PlacedFurniture } from '../types/furniture';

function fakeItem(stimulation: number, comfort: number): FurnitureItem {
  return {
    name: 't', image_url: '', shape: [[2]],
    appeal: 0, comfort, stimulation, health: 0, mutation: 0,
    id: 't', spacesOccupied: 1,
    appealPerSpace: 0, comfortPerSpace: 0, stimulationPerSpace: 0, healthPerSpace: 0, mutationPerSpace: 0,
  };
}
function room(stimulation: number, comfort: number): PlacedFurniture[] {
  return [{ instanceId: 'x', item: fakeItem(stimulation, comfort), row: 0, col: 0 }];
}

describe('betterStatChance', () => {
  it('matches the game formula at key stimulations', () => {
    expect(betterStatChance(0)).toBeCloseTo(0.5);
    expect(betterStatChance(50)).toBeCloseTo(0.6);
    expect(betterStatChance(100)).toBeCloseTo(2 / 3);
  });
});

describe('comfortMultiplier', () => {
  it('auto-fails below -10', () => {
    expect(comfortMultiplier(-11)).toBeNull();
    expect(comfortMultiplier(-10)).toBeCloseTo(0);
    expect(comfortMultiplier(0)).toBeCloseTo(1);
    expect(comfortMultiplier(10)).toBeCloseTo(2);
  });
});

describe('pairCoverage', () => {
  const a: Record<CatStat, number> = { STR: 7, DEX: 7, CON: 5, INT: 7, SPD: 4, CHA: 7, LCK: 6 };
  const b: Record<CatStat, number> = { STR: 6, DEX: 7, CON: 7, INT: 5, SPD: 7, CHA: 4, LCK: 7 };

  it('classifies locked/reachable/missing', () => {
    const cov = pairCoverage(a, b, 50);
    expect(cov.locked).toEqual(['DEX']); // both ≥7
    expect(cov.missing).toEqual([]); // every stat reachable by at least one parent
    // STR,CON,INT,SPD,CHA,LCK reachable (one parent ≥7)
    expect(cov.reachable.sort()).toEqual(['CHA', 'CON', 'INT', 'LCK', 'SPD', 'STR']);
  });

  it('coverage = locked + reachable * betterChance', () => {
    const cov = pairCoverage(a, b, 50);
    expect(cov.coverage).toBeCloseTo(1 + 6 * 0.6); // 4.6
  });

  it('flags a missing stat when neither parent has 7', () => {
    const lowA = { ...a, SPD: 3 };
    const lowB = { ...b, SPD: 2 };
    const cov = pairCoverage(lowA, lowB, 50);
    expect(cov.missing).toContain('SPD');
  });
});

describe('room recommendation', () => {
  it('picks highest stimulation among viable rooms', () => {
    const rooms = [room(30, 5), room(80, 2), room(80, 10), room(99, -20)];
    const infos = analyzeRoomsForBreeding(rooms, () => true);
    const best = recommendBreedingRoom(infos);
    expect(best?.index).toBe(2); // stim 80 with higher comfort beats other 80; -20 room excluded
  });

  it('returns null when no room is viable', () => {
    const infos = analyzeRoomsForBreeding([room(50, -50)], () => true);
    expect(recommendBreedingRoom(infos)).toBeNull();
  });

  it('skips locked rooms', () => {
    const infos = analyzeRoomsForBreeding([room(99, 0), room(10, 0)], (i) => i === 1);
    expect(infos).toHaveLength(1);
    expect(infos[0].stimulation).toBe(10);
  });
});

describe('plan steps', () => {
  it('counts every step across stages', () => {
    const sum = PERFECT7_STAGES.reduce((n, s) => n + s.steps.length, 0);
    expect(TOTAL_STEPS).toBe(sum);
  });

  it('nextStep walks in order and ends null when complete', () => {
    expect(nextStep(new Set())?.step.id).toBe(PERFECT7_STAGES[0].steps[0].id);
    const all = new Set(PERFECT7_STAGES.flatMap((s) => s.steps.map((st) => st.id)));
    expect(nextStep(all)).toBeNull();
  });
});

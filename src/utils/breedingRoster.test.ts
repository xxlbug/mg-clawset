import { describe, it, expect } from 'vitest';
import { isRelated, suggestFoundationPairs, summarizeRoster, sevensCount, hatesEachOther, mutualLovers, bestSevens, deriveCompletedSteps } from './breedingRoster';
import { CAT_STATS } from './breeding';
import type { ParsedCat, Sex } from './catParser';
import type { CatStat } from './breeding';

let nextKey = 1;
function cat(opts: { sex: Sex; stats: Partial<Record<CatStat, number>>; parents?: number[]; status?: ParsedCat['status']; name?: string; lovers?: number[]; haters?: number[]; dbKey?: number; room?: string }): ParsedCat {
  const dbKey = opts.dbKey ?? nextKey++;
  const baseStats = {} as Record<CatStat, number>;
  for (const s of CAT_STATS) baseStats[s] = opts.stats[s] ?? 4;
  return {
    dbKey,
    uid: '0x0',
    uidInt: 0,
    name: opts.name ?? `Cat${dbKey}`,
    sex: opts.sex,
    baseStats,
    baseSum: (Object.values(baseStats) as number[]).reduce((a, b) => a + b, 0),
    aggression: 0.2,
    libido: 0.5,
    status: opts.status ?? 'In House',
    room: opts.room ?? 'Floor1_Large',
    parents: opts.parents ?? [],
    loverKeys: opts.lovers ?? [],
    haterKeys: opts.haters ?? [],
  };
}

describe('isRelated', () => {
  it('flags parent/child', () => {
    const parent = cat({ sex: 'female', stats: {} });
    const child = cat({ sex: 'male', stats: {}, parents: [parent.dbKey] });
    expect(isRelated(parent, child)).toBe(true);
  });
  it('flags siblings (shared parent)', () => {
    const a = cat({ sex: 'male', stats: {}, parents: [100, 101] });
    const b = cat({ sex: 'female', stats: {}, parents: [101, 102] });
    expect(isRelated(a, b)).toBe(true);
  });
  it('treats unrelated cats as unrelated', () => {
    const a = cat({ sex: 'male', stats: {}, parents: [1, 2] });
    const b = cat({ sex: 'female', stats: {}, parents: [3, 4] });
    expect(isRelated(a, b)).toBe(false);
  });
});

describe('suggestFoundationPairs', () => {
  it('ranks unrelated opposite-sex pairs by coverage and excludes relatives', () => {
    // perfect-complement pair: between them every stat is 7
    const m = cat({ sex: 'male', stats: { STR: 7, DEX: 7, CON: 7, INT: 7 }, parents: [10, 11], name: 'Dad' });
    const f = cat({ sex: 'female', stats: { SPD: 7, CHA: 7, LCK: 7, CON: 7 }, parents: [12, 13], name: 'Mom' });
    // weaker pair
    const f2 = cat({ sex: 'female', stats: { STR: 5 }, parents: [14, 15], name: 'Mid' });
    // related to m (shares parent 10) — must be excluded
    const fRel = cat({ sex: 'female', stats: { SPD: 7, CHA: 7, LCK: 7, CON: 7 }, parents: [10, 99], name: 'Sis' });

    const pairs = suggestFoundationPairs([m, f, f2, fRel], 100, { limit: 5 });
    expect(pairs.length).toBeGreaterThan(0);
    // best pair is Dad×Mom (full coverage)
    expect(new Set([pairs[0].a.name, pairs[0].b.name])).toEqual(new Set(['Dad', 'Mom']));
    // no suggested pair includes the related female with Dad
    const hasRelated = pairs.some((p) => (p.a.name === 'Sis' && p.b.name === 'Dad') || (p.a.name === 'Dad' && p.b.name === 'Sis'));
    expect(hasRelated).toBe(false);
  });

  it('skips cats that are not in the house', () => {
    const m = cat({ sex: 'male', stats: {}, status: 'Gone' });
    const f = cat({ sex: 'female', stats: {} });
    expect(suggestFoundationPairs([m, f], 50)).toHaveLength(0);
  });

  it('excludes pairs that hate each other', () => {
    const m = cat({ sex: 'male', stats: {}, dbKey: 200 });
    const f = cat({ sex: 'female', stats: {}, dbKey: 201, haters: [200] });
    expect(suggestFoundationPairs([m, f], 50)).toHaveLength(0);
  });

  it('prefers mutual lovers over equal-coverage non-lovers', () => {
    const m = cat({ sex: 'male', stats: {}, dbKey: 300, lovers: [301] });
    const lover = cat({ sex: 'female', stats: {}, dbKey: 301, lovers: [300] });
    const other = cat({ sex: 'female', stats: {}, dbKey: 302 });
    const pairs = suggestFoundationPairs([m, lover, other], 50);
    expect(pairs[0].mutualLover).toBe(true);
    expect(new Set([pairs[0].a.dbKey, pairs[0].b.dbKey])).toEqual(new Set([300, 301]));
  });

  it('flags a pair where one cat loves someone else', () => {
    const m = cat({ sex: 'male', stats: {}, dbKey: 400, lovers: [999] }); // loves a cat not in the pair
    const f = cat({ sex: 'female', stats: {}, dbKey: 401 });
    const pairs = suggestFoundationPairs([m, f], 50);
    expect(pairs[0].lovesElsewhere).toBe(true);
    expect(pairs[0].mutualLover).toBe(false);
  });
});

describe('relationship helpers', () => {
  it('hatesEachOther is symmetric', () => {
    const a = cat({ sex: 'male', stats: {}, dbKey: 1, haters: [2] });
    const b = cat({ sex: 'female', stats: {}, dbKey: 2 });
    expect(hatesEachOther(a, b)).toBe(true);
    expect(hatesEachOther(b, a)).toBe(true);
  });
  it('mutualLovers needs both directions', () => {
    const a = cat({ sex: 'male', stats: {}, dbKey: 1, lovers: [2] });
    const b = cat({ sex: 'female', stats: {}, dbKey: 2 });
    expect(mutualLovers(a, b)).toBe(false);
    b.loverKeys = [1];
    expect(mutualLovers(a, b)).toBe(true);
  });
});

describe('summarizeRoster', () => {
  it('counts presence and sexes', () => {
    const r = summarizeRoster([
      cat({ sex: 'male', stats: { STR: 7, DEX: 7 } }),
      cat({ sex: 'female', stats: {} }),
      cat({ sex: 'male', stats: {}, status: 'Gone' }),
    ]);
    expect(r.total).toBe(3);
    expect(r.inHouse).toBe(2);
    expect(r.males).toBe(2);
    expect(r.females).toBe(1);
  });
});

describe('sevensCount', () => {
  it('counts stats already at 7', () => {
    expect(sevensCount(cat({ sex: 'male', stats: { STR: 7, CHA: 7, LCK: 7 } }))).toBe(3);
  });
});

describe('bestSevens', () => {
  it('returns the highest maxed-stat count among in-house cats', () => {
    expect(bestSevens([
      cat({ sex: 'male', stats: { STR: 7, CHA: 7 } }),
      cat({ sex: 'female', stats: { STR: 7, DEX: 7, CON: 7, INT: 7 } }),
      cat({ sex: 'male', stats: { STR: 7, DEX: 7, CON: 7, INT: 7, SPD: 7, CHA: 7, LCK: 7 }, status: 'Gone' }),
    ])).toBe(4); // the perfect cat is Gone, so excluded
  });
  it('is 0 with no cats', () => {
    expect(bestSevens([])).toBe(0);
  });
});

describe('deriveCompletedSteps', () => {
  const PERFECT = { STR: 7, DEX: 7, CON: 7, INT: 7, SPD: 7, CHA: 7, LCK: 7 } as const;

  it('marks nothing for an empty roster', () => {
    expect(deriveCompletedSteps([], [], { dependableDen: false, viableRooms: 0 }).size).toBe(0);
  });

  it('marks foundation steps once pairs and a dependable den exist', () => {
    const m = cat({ sex: 'male', stats: { STR: 7, DEX: 7, CON: 7, INT: 7 }, parents: [10, 11] });
    const f = cat({ sex: 'female', stats: { SPD: 7, CHA: 7, LCK: 7, CON: 7 }, parents: [12, 13], room: 'RoomB' });
    const pairs = suggestFoundationPairs([m, f], 100);
    const done = deriveCompletedSteps([m, f], pairs, { dependableDen: true, viableRooms: 2 });
    expect(done.has('s1-pairs')).toBe(true);   // a pair exists
    expect(done.has('s1-room')).toBe(true);    // dependable den passed in
    expect(done.has('s1-keep')).toBe(true);    // a strong male + female in house
    expect(done.has('s2-rooms')).toBe(true);   // two viable rooms = parallel lines
    expect(done.has('s3-detect')).toBe(false); // best cat only maxes 4 stats (< 5)
  });

  it('is monotonic: an unmet early step blocks satisfiable later ones', () => {
    // Strong cats and a live pair, but NO dependable den → stalls at s1-room.
    const m = cat({ sex: 'male', stats: PERFECT, parents: [10, 11] });
    const f = cat({ sex: 'female', stats: PERFECT, parents: [12, 13], room: 'RoomB' });
    const pairs = suggestFoundationPairs([m, f], 100);
    const done = deriveCompletedSteps([m, f], pairs, { dependableDen: false, viableRooms: 2 });
    expect(done.has('s1-pairs')).toBe(true);
    expect(done.has('s1-room')).toBe(false);  // no den
    expect(done.has('s1-keep')).toBe(false);  // satisfiable, but gated by s1-room
    expect(done.has('s4-finish')).toBe(false);
  });

  it('does not finish the plan from a single lucky cat', () => {
    const perfect = cat({ sex: 'male', stats: PERFECT });
    const done = deriveCompletedSteps([perfect], [], { dependableDen: false, viableRooms: 0 });
    expect(done.has('s1-pairs')).toBe(false);    // no partner → no pair
    expect(done.has('s4-maintain')).toBe(false); // owning one 7/7 cat is not a finished program
  });

  it('completes the plan only when the stable can replenish itself', () => {
    // A maxed cat of each sex, two unrelated lines, a den, parallel rooms.
    const m = cat({ sex: 'male', stats: PERFECT, parents: [10, 11] });
    const f = cat({ sex: 'female', stats: PERFECT, parents: [12, 13], room: 'RoomB' });
    const m2 = cat({ sex: 'male', stats: PERFECT, parents: [14, 15] });
    const f2 = cat({ sex: 'female', stats: PERFECT, parents: [16, 17], room: 'RoomC' });
    const cats = [m, f, m2, f2];
    const pairs = suggestFoundationPairs(cats, 100);
    expect(pairs.length).toBeGreaterThanOrEqual(2); // multiple live unrelated pairs
    const done = deriveCompletedSteps(cats, pairs, { dependableDen: true, viableRooms: 3 });
    expect(done.has('s4-backup')).toBe(true);    // elite of both sexes
    expect(done.has('s4-maintain')).toBe(true);  // + ≥2 live pairs → self-replenishing
  });
});

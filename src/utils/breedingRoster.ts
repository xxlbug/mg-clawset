// Breeding analysis over a real parsed roster: relatedness checks and
// foundation-pair suggestions that feed the Breeding Guide.

import { pairCoverage, buildGenerations, makeKinship, defectRiskPercent } from './breeding';
import type { CatStat, PairCoverage } from './breeding';
import type { ParsedCat, Sex } from './catParser';

/** Parent-child or full/half siblings (share at least one parent). */
export function isRelated(a: ParsedCat, b: ParsedCat): boolean {
  if (a.dbKey === b.dbKey) return true;
  if (a.parents.includes(b.dbKey) || b.parents.includes(a.dbKey)) return true;
  return a.parents.some((p) => b.parents.includes(p));
}

/** A cat can breed when it is present in the house (not gone/adventuring). */
export function isAvailable(cat: ParsedCat): boolean {
  return cat.status === 'In House';
}

/** Two sexes can pair when they are opposite, or either is undefined ('?'). */
function sexesCompatible(a: Sex, b: Sex): boolean {
  if (a === '?' || b === '?') return true;
  return a !== b;
}

export interface PairSuggestion {
  a: ParsedCat;
  b: ParsedCat;
  coverage: PairCoverage;
  missing: CatStat[];
  related: boolean;
  /** Offspring coefficient of inbreeding. */
  coi: number;
  /** Combined birth-defect probability (0–100 %), from the game CoI formula. */
  riskPercent: number;
}

export interface SuggestOptions {
  limit?: number;
  /** Drop pairs whose offspring birth-defect risk exceeds this %. Default 10. */
  maxRiskPercent?: number;
}

/** Index every cat by db_key so ancestry walks can resolve parents. */
export function catsByKey(cats: ParsedCat[]): Map<number, ParsedCat> {
  return new Map(cats.map((c) => [c.dbKey, c]));
}

/**
 * Rank candidate breeding pairs by projected 7-coverage at the given room
 * Stimulation. Only available (in-house), sex-compatible pairs whose offspring
 * birth-defect risk stays within `maxRiskPercent` are suggested. Each result
 * carries its offspring COI / risk% (computed from the full pedigree, so even
 * "Gone" ancestors count). Returns the strongest `limit` pairs.
 */
export function suggestFoundationPairs(
  cats: ParsedCat[],
  stimulation: number,
  opts: SuggestOptions = {},
): PairSuggestion[] {
  const { limit = 6, maxRiskPercent = 10 } = opts;
  const byKey = catsByKey(cats);
  const gen = buildGenerations(byKey);
  const kinship = makeKinship(byKey, gen);
  const pool = cats.filter(isAvailable);
  const out: PairSuggestion[] = [];

  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      const a = pool[i];
      const b = pool[j];
      if (!sexesCompatible(a.sex, b.sex)) continue;
      // Direct relations (parent/child, siblings) are excluded outright — this
      // catches them even when the shared parent isn't in the roster. Deeper
      // inbreeding is then gated by the COI-derived defect risk.
      if (isRelated(a, b)) continue;
      const coi = kinship(a.dbKey, b.dbKey);
      const riskPercent = defectRiskPercent(coi);
      if (riskPercent > maxRiskPercent) continue;
      const coverage = pairCoverage(a.baseStats, b.baseStats, stimulation);
      out.push({ a, b, coverage, missing: coverage.missing, related: false, coi, riskPercent });
    }
  }

  // Best coverage first; break ties toward the cleaner (lower-risk) pair.
  out.sort((x, y) => y.coverage.coverage - x.coverage.coverage || x.riskPercent - y.riskPercent);
  return out.slice(0, limit);
}

export interface RosterSummary {
  total: number;
  inHouse: number;
  males: number;
  females: number;
  /** Cats whose base-stat sum is in the top tier (≥ this many 7s already). */
  topBreeders: ParsedCat[];
}

export function summarizeRoster(cats: ParsedCat[]): RosterSummary {
  const inHouse = cats.filter(isAvailable);
  const males = cats.filter((c) => c.sex === 'male').length;
  const females = cats.filter((c) => c.sex === 'female').length;
  const sevensOf = (c: ParsedCat) => (Object.values(c.baseStats) as number[]).filter((v) => v >= 7).length;
  const topBreeders = [...inHouse]
    .sort((a, b) => sevensOf(b) - sevensOf(a) || b.baseSum - a.baseSum)
    .slice(0, 8);
  return { total: cats.length, inHouse: inHouse.length, males, females, topBreeders };
}

export function sevensCount(cat: ParsedCat): number {
  return (Object.values(cat.baseStats) as number[]).filter((v) => v >= 7).length;
}

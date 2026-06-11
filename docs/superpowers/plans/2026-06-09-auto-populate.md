# Auto-Populate Room Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Auto-fill" button to the room designer that fills the active room with owned furniture using a greedy weighted-score algorithm with three presets (breeding / storage / mutation).

**Architecture:** Extract the placement-validity helpers from `RoomGrid.tsx` into a shared module, build a pure `autoPopulateRoom()` function on top of them (greedy first-fit by score-per-space), and wire a preset dropdown + button into `RoomDesignerWorkspace` via a new App callback.

**Tech Stack:** React 19 + TypeScript + Vite 8. New dev dep: vitest (unit tests for the pure logic only).

**Spec:** `docs/superpowers/specs/2026-06-09-auto-populate-design.md`

---

### Task 1: Vitest setup

**Files:**
- Modify: `package.json` (dev dep + script)

- [ ] **Step 1: Install vitest**

Run: `npm install -D vitest`
Expected: success. If peer-dependency conflict with vite 8: `npm install -D vitest --force` and verify `npx vitest --version` works.

- [ ] **Step 2: Add test script**

In `package.json` `"scripts"`, add:

```json
"test": "vitest run"
```

- [ ] **Step 3: Verify runner works with no tests**

Run: `npm test`
Expected: "No test files found" (exit code may be 1 — that's fine, runner itself works).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add vitest for unit testing"
```

---

### Task 2: Extract shared grid helpers (pure refactor, no behavior change)

**Files:**
- Create: `src/utils/gridHelpers.ts`
- Modify: `src/components/RoomGrid.tsx:40-124` (delete the three module-private functions, import instead)

- [ ] **Step 1: Create `src/utils/gridHelpers.ts`**

Move these three functions **verbatim** from `RoomGrid.tsx` (lines 40–124), adding `export` and the imports they need:

```ts
import type { FurnitureItem, PlacedFurniture, RoomConfig } from '../types/furniture';

export function buildOccupancy(placed: PlacedFurniture[], cfg: RoomConfig, ignoreId?: string, ignoreIds?: Set<string>): (string | null)[][] {
  // ... exact body from RoomGrid.tsx:40-62
}

export function buildAnchorPointSet(placed: PlacedFurniture[], cfg: RoomConfig, ignoreId?: string, ignoreIds?: Set<string>): Set<string> {
  // ... exact body from RoomGrid.tsx:64-92
}

export function canPlace(
  item: FurnitureItem,
  row: number,
  col: number,
  occupancy: (string | null)[][],
  anchorPointSet: Set<string>,
  cfg: RoomConfig,
): boolean {
  // ... exact body from RoomGrid.tsx:94-124
}
```

(Bodies are copied unchanged — this is a move, not a rewrite.)

- [ ] **Step 2: Update `RoomGrid.tsx`**

Delete the three local functions; extend the existing utils import:

```ts
import { findAllAnchored, canPlaceGroup } from '../utils/anchorHelpers';
import { buildOccupancy, buildAnchorPointSet, canPlace } from '../utils/gridHelpers';
```

- [ ] **Step 3: Verify no behavior change**

Run: `npm run build && npm run lint`
Expected: both pass (type-check catches any missed reference).

- [ ] **Step 4: Commit**

```bash
git add src/utils/gridHelpers.ts src/components/RoomGrid.tsx
git commit -m "refactor: extract grid placement helpers from RoomGrid"
```

---

### Task 3: Presets and scoring (TDD)

**Files:**
- Create: `src/utils/autoPopulate.ts`
- Test: `src/utils/autoPopulate.test.ts`

- [ ] **Step 1: Write failing tests for `presetScore`**

Create `src/utils/autoPopulate.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { FurnitureItem } from '../types/furniture';
import { presetScore } from './autoPopulate';

export function makeItem(over: Partial<FurnitureItem> & { name: string }): FurnitureItem {
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/autoPopulate.test.ts`
Expected: FAIL — cannot resolve `./autoPopulate`.

- [ ] **Step 3: Implement presets + scoring**

Create `src/utils/autoPopulate.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/autoPopulate.test.ts`
Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add src/utils/autoPopulate.ts src/utils/autoPopulate.test.ts
git commit -m "feat: add auto-populate presets and scoring"
```

---

### Task 4: Greedy placement algorithm (TDD)

**Files:**
- Modify: `src/utils/autoPopulate.ts`
- Test: `src/utils/autoPopulate.test.ts`

- [ ] **Step 1: Write failing tests for `autoPopulateRoom`**

Append to `src/utils/autoPopulate.test.ts`:

```ts
import { autoPopulateRoom } from './autoPopulate';
import { getRoomConfig, isAtticCellValid, ATTIC_INDEX } from '../types/furniture';
import type { PlacedFurniture } from '../types/furniture';

function makeOpts(over: Partial<Parameters<typeof autoPopulateRoom>[0]>) {
  let n = 0;
  return {
    preset: 'breeding' as const,
    roomIndex: 0,
    allFurniture: [],
    ownership: {},
    usedInOtherRooms: {},
    makeInstanceId: () => `t-${n++}`,
    ...over,
  };
}

function solidCells(p: PlacedFurniture): [number, number][] {
  const out: [number, number][] = [];
  for (let r = 0; r < p.item.shape.length; r++) {
    for (let c = 0; c < p.item.shape[r].length; c++) {
      if (p.item.shape[r][c] === 2 || p.item.shape[r][c] === 3) {
        out.push([p.row + r, p.col + c]);
      }
    }
  }
  return out;
}

describe('autoPopulateRoom', () => {
  it('returns empty for empty pool', () => {
    expect(autoPopulateRoom(makeOpts({}))).toEqual([]);
  });

  it('never exceeds remaining counts (ownership minus other rooms)', () => {
    const item = makeItem({ name: 'sofa', comfort: 5, shape: [[2]] });
    const result = autoPopulateRoom(makeOpts({
      allFurniture: [item],
      ownership: { sofa: 5 },
      usedInOtherRooms: { sofa: 2 },
    }));
    expect(result).toHaveLength(3);
  });

  it('never places items with score <= 0', () => {
    const junk = makeItem({ name: 'junk', appeal: 5, shape: [[2]] }); // breeding score 0
    const result = autoPopulateRoom(makeOpts({
      allFurniture: [junk],
      ownership: { junk: 10 },
    }));
    expect(result).toEqual([]);
  });

  it('produces no overlaps and stays in bounds', () => {
    const big = makeItem({ name: 'big', comfort: 4, shape: [[2, 2], [2, 2]] });
    const small = makeItem({ name: 'small', comfort: 1, shape: [[2]] });
    const result = autoPopulateRoom(makeOpts({
      allFurniture: [big, small],
      ownership: { big: 100, small: 200 },
    }));
    const cfg = getRoomConfig(0);
    const seen = new Set<string>();
    for (const p of result) {
      for (const [r, c] of solidCells(p)) {
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThan(cfg.rows);
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThan(cfg.cols);
        expect(seen.has(`${r},${c}`)).toBe(false);
        seen.add(`${r},${c}`);
      }
    }
    // 16x7 room, plenty of 1x1s owned: room should be completely full
    expect(seen.size).toBe(cfg.rows * cfg.cols);
  });

  it('prefers higher score-per-space items', () => {
    const good = makeItem({ name: 'good', comfort: 9, shape: [[2]] });
    const bad = makeItem({ name: 'bad', comfort: 1, shape: [[2]] });
    const result = autoPopulateRoom(makeOpts({
      allFurniture: [bad, good],
      ownership: { good: 1, bad: 1 },
    }));
    expect(result[0].item.name).toBe('good');
  });

  it('storage preset rejects net-negative stimulation items', () => {
    const stimToy = makeItem({ name: 'toy', comfort: 2, stimulation: 3, shape: [[2]] }); // storage: 1 - 3 < 0
    const bed = makeItem({ name: 'bed', comfort: 2, health: 1, shape: [[2]] }); // storage: 2
    const result = autoPopulateRoom(makeOpts({
      preset: 'storage',
      allFurniture: [stimToy, bed],
      ownership: { toy: 5, bed: 1 },
    }));
    expect(result).toHaveLength(1);
    expect(result[0].item.name).toBe('bed');
  });

  it('respects attic cell validity', () => {
    const item = makeItem({ name: 'cube', comfort: 1, shape: [[2]] });
    const result = autoPopulateRoom(makeOpts({
      roomIndex: ATTIC_INDEX,
      allFurniture: [item],
      ownership: { cube: 500 },
    }));
    expect(result.length).toBeGreaterThan(0);
    for (const p of result) {
      for (const [r, c] of solidCells(p)) {
        expect(isAtticCellValid(r, c)).toBe(true);
      }
    }
  });

  it('places anchored items only when anchor support exists', () => {
    // anchor (4) on top must sit on an anchor point (3); attic has no ceiling anchors
    const hanging = makeItem({ name: 'hanging', comfort: 10, shape: [[4], [2]] });
    const noSupport = autoPopulateRoom(makeOpts({
      roomIndex: ATTIC_INDEX,
      allFurniture: [hanging],
      ownership: { hanging: 1 },
    }));
    expect(noSupport).toEqual([]);

    // with an anchor-point provider placed first, the hanging item attaches
    const shelf = makeItem({ name: 'shelf', comfort: 1, shape: [[3]] });
    const withSupport = autoPopulateRoom(makeOpts({
      roomIndex: ATTIC_INDEX,
      allFurniture: [hanging, shelf],
      ownership: { hanging: 1, shelf: 1 },
    }));
    expect(withSupport.map(p => p.item.name).sort()).toEqual(['hanging', 'shelf']);
  });
});
```

- [ ] **Step 2: Run tests to verify new ones fail**

Run: `npx vitest run src/utils/autoPopulate.test.ts`
Expected: FAIL — `autoPopulateRoom` not exported.

- [ ] **Step 3: Implement `autoPopulateRoom`**

Append to `src/utils/autoPopulate.ts`:

```ts
import type { PlacedFurniture } from '../types/furniture';
import { getRoomConfig } from '../types/furniture';
import { buildOccupancy, buildAnchorPointSet, canPlace } from './gridHelpers';

export interface AutoPopulateOptions {
  preset: PresetKey;
  roomIndex: number;
  allFurniture: FurnitureItem[];
  ownership: Record<string, number>;
  usedInOtherRooms: Record<string, number>;
  makeInstanceId: () => string;
}

interface Candidate {
  item: FurnitureItem;
  score: number;
  remaining: number;
}

export function autoPopulateRoom(opts: AutoPopulateOptions): PlacedFurniture[] {
  const { preset, roomIndex, allFurniture, ownership, usedInOtherRooms, makeInstanceId } = opts;
  const cfg = getRoomConfig(roomIndex);

  const candidates: Candidate[] = [];
  for (const item of allFurniture) {
    const remaining = (ownership[item.id] ?? 0) - (usedInOtherRooms[item.id] ?? 0);
    if (remaining <= 0) continue;
    const score = presetScore(item, preset);
    if (score <= 0) continue;
    candidates.push({ item, score, remaining });
  }

  // Best score-per-space first; deterministic tie-breaking
  candidates.sort((a, b) =>
    b.score / b.item.spacesOccupied - a.score / a.item.spacesOccupied
    || b.score - a.score
    || a.item.name.localeCompare(b.item.name),
  );

  const placed: PlacedFurniture[] = [];
  const occupancy = buildOccupancy([], cfg);
  const anchorPoints = buildAnchorPointSet([], cfg);

  // Scan top-left to bottom-right; offsets extended so anchor cells (which may
  // hang outside the solid bounding box) can reach floor/ceiling anchor rows.
  const findSpot = (item: FurnitureItem): { row: number; col: number } | null => {
    const h = item.shape.length;
    const w = Math.max(...item.shape.map((r) => r.length));
    for (let row = -h; row <= cfg.rows; row++) {
      for (let col = -w; col <= cfg.cols; col++) {
        if (canPlace(item, row, col, occupancy, anchorPoints, cfg)) return { row, col };
      }
    }
    return null;
  };

  const applyPlacement = (p: PlacedFurniture): boolean => {
    let addedAnchorPoint = false;
    for (let r = 0; r < p.item.shape.length; r++) {
      for (let c = 0; c < p.item.shape[r].length; c++) {
        const t = p.item.shape[r][c];
        if (t === 2 || t === 3) occupancy[p.row + r][p.col + c] = p.instanceId;
        if (t === 3) {
          anchorPoints.add(`${p.row + r},${p.col + c}`);
          addedAnchorPoint = true;
        }
      }
    }
    return addedAnchorPoint;
  };

  // Items that failed to fit; retried only after new anchor points appear
  // (occupancy only ever shrinks options, anchor points can unlock anchored items).
  const failed = new Set<string>();

  for (;;) {
    let progress = false;
    for (const cand of candidates) {
      if (cand.remaining <= 0 || failed.has(cand.item.id)) continue;
      const spot = findSpot(cand.item);
      if (!spot) {
        failed.add(cand.item.id);
        continue;
      }
      const piece: PlacedFurniture = {
        instanceId: makeInstanceId(),
        item: cand.item,
        row: spot.row,
        col: spot.col,
      };
      placed.push(piece);
      if (applyPlacement(piece)) failed.clear();
      cand.remaining -= 1;
      progress = true;
      break; // restart from best candidate
    }
    if (!progress) break;
  }

  return placed;
}
```

Merge the two `import type` lines from `../types/furniture` into one if the linter complains.

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: all tests pass (3 scoring + 8 placement).

- [ ] **Step 5: Commit**

```bash
git add src/utils/autoPopulate.ts src/utils/autoPopulate.test.ts
git commit -m "feat: add greedy auto-populate placement algorithm"
```

---

### Task 5: Wire into App

**Files:**
- Modify: `src/App.tsx` (new callback, pass prop)

- [ ] **Step 1: Add imports**

In `src/App.tsx`, extend imports:

```ts
import { autoPopulateRoom } from './utils/autoPopulate';
import type { PresetKey } from './utils/autoPopulate';
```

- [ ] **Step 2: Add callback (after `handleMoveFurniture`)**

```ts
const handleAutoPopulate = useCallback((preset: PresetKey) => {
  const usedInOtherRooms: Record<string, number> = {};
  rooms.forEach((room, i) => {
    if (i === activeRoom) return;
    for (const p of room) {
      usedInOtherRooms[p.item.id] = (usedInOtherRooms[p.item.id] || 0) + 1;
    }
  });
  const result = autoPopulateRoom({
    preset,
    roomIndex: activeRoom,
    allFurniture,
    ownership,
    usedInOtherRooms,
    makeInstanceId: () => `placed-${nextInstanceId++}`,
  });
  if (result.length === 0) {
    window.alert('Nothing to place: no owned furniture with remaining copies scores positively for this preset.');
    return;
  }
  setRooms(prev => prev.map((room, i) => (i === activeRoom ? result : room)));
}, [rooms, activeRoom, ownership]);
```

- [ ] **Step 3: Pass prop to workspace**

In the `<RoomDesignerWorkspace>` JSX, add:

```tsx
onAutoPopulate={handleAutoPopulate}
```

- [ ] **Step 4: Verify it type-checks (UI prop doesn't exist yet — expect failure)**

Run: `npm run build`
Expected: FAIL — `onAutoPopulate` not in workspace Props. That's the next task; commit happens there.

---

### Task 6: Workspace UI (preset dropdown + Auto-fill button)

**Files:**
- Modify: `src/components/RoomDesignerWorkspace.tsx`

- [ ] **Step 1: Add imports and props**

```ts
import { PRESETS } from '../utils/autoPopulate';
import type { PresetKey } from '../utils/autoPopulate';
```

In `Props`, add:

```ts
onAutoPopulate: (preset: PresetKey) => void;
```

Destructure `onAutoPopulate` in the component signature.

- [ ] **Step 2: Add preset state + handler (top of component, next to `expertView`)**

```ts
const [preset, setPreset] = useState<PresetKey>('breeding');

const handleAutoFill = () => {
  if (
    placed.length > 0 &&
    !window.confirm(`Replace ${placed.length} item(s) in ${getRoomLabel(activeRoom)} with an auto-generated ${PRESETS[preset].label} layout?`)
  ) {
    return;
  }
  onAutoPopulate(preset);
};
```

- [ ] **Step 3: Add controls to header**

Replace the lone Expert View button in the header with a button group (reuse `smallBtn`/`toggleBtn` styles):

```tsx
<div style={{ display: 'flex', gap: 6, alignItems: 'center', alignSelf: 'flex-start' }}>
  <select
    value={preset}
    onChange={(e) => setPreset(e.target.value as PresetKey)}
    style={{ ...smallBtn, padding: '5px 8px' }}
    title="Auto-fill preset"
  >
    {(Object.keys(PRESETS) as PresetKey[]).map((key) => (
      <option key={key} value={key}>{PRESETS[key].label}</option>
    ))}
  </select>
  <button style={smallBtn} onClick={handleAutoFill} title="Automatically fill this room with owned furniture">
    Auto-fill
  </button>
  <button style={toggleBtn} onClick={() => setExpertView((v) => !v)}>
    {expertView ? 'Image View' : 'Expert View'}
  </button>
</div>
```

- [ ] **Step 4: Verify build + lint + tests**

Run: `npm run build && npm run lint && npm test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/RoomDesignerWorkspace.tsx
git commit -m "feat: add auto-fill UI with breeding/storage/mutation presets"
```

---

### Task 7: Manual verification + PR

- [ ] **Step 1: Manual smoke test**

Run: `npm run dev`

In browser:
1. Mark several furniture items as owned (+ buttons), including some with comfort/stimulation.
2. Expand room designer, pick Room 1, preset Breeding, click Auto-fill → room fills.
3. Place items manually in Room 2, click Auto-fill → confirm dialog appears; cancel keeps layout.
4. Switch to Attic (Room 5), Auto-fill → items respect trapezoid shape.
5. Storage preset with only high-stim furniture owned → alert "nothing to place".

- [ ] **Step 2: Push branch and open PR against fork**

```bash
git push -u origin feature/auto-populate
gh pr create --repo <fork-owner>/mg-clawset --base main --title "feat: auto-populate rooms with breeding/storage/mutation presets" --body "..."
```

PR body summarizes feature, links spec, ends with:
🤖 Generated with [Claude Code](https://claude.com/claude-code)

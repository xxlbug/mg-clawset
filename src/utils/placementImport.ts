import type { FurnitureItem } from '../types/furniture';
import { getRoomConfig } from '../types/furniture';
import type { SavedPlacement } from './savegame';

export interface ImportedPlacement {
  item: FurnitureItem;
  row: number;
  col: number;
}

const solidOffsets = (shape: number[][]) => {
  const cells: [number, number][] = [];
  shape.forEach((row, r) => row.forEach((t, c) => { if (t === 2 || t === 3) cells.push([r, c]); }));
  return cells;
};

const anchorCells = (shape: number[][]) => {
  const cells: [number, number][] = [];
  shape.forEach((row, r) => row.forEach((t, c) => { if (t === 4) cells.push([r, c]); }));
  return cells;
};

// y semantics depend on the anchor direction of the shape:
// bottom-anchored items reference their bottom solid row, hanging and
// wall items their top solid row.
const anchorDir = (shape: number[][]): 'below' | 'above' | 'none' => {
  const sol = solidOffsets(shape);
  const anc = anchorCells(shape);
  if (anc.length === 0) return 'none';
  const maxS = Math.max(...sol.map(([r]) => r));
  const minS = Math.min(...sol.map(([r]) => r));
  if (anc.every(([r]) => r > maxS)) return 'below';
  if (anc.every(([r]) => r < minS)) return 'above';
  return 'none';
};

/**
 * Convert one room's saved placements (z-ordered) into grid positions.
 *
 * The save stores grid coordinates, but dense in-game stacks reference
 * support relationships we cannot read (anchored trinkets may carry their
 * supporter's cell, and some records leave standing furniture without
 * anything beneath it). Two repairs keep the import physical:
 *  - snap-on-top: a standing item whose coordinate cell is already occupied
 *    sits down on that cell via its own anchor offset;
 *  - settle: a standing item with no support under its anchors (own column,
 *    one column of slack for off-by-one records) slides straight down until
 *    its anchors rest on another item or the floor.
 */
export function applyRoomPlacements(
  roomIndex: number,
  placements: SavedPlacement[],
  byId: Map<string, FurnitureItem>,
): ImportedPlacement[] {
  const cfg = getRoomConfig(roomIndex);
  const occupied = new Set<string>();
  const result: ImportedPlacement[] = [];

  const ordered = [...placements].sort((a, b) => a.order - b.order);
  for (const pl of ordered) {
    const item = byId.get(pl.itemId);
    if (!item) continue;
    const solids = solidOffsets(item.shape);
    const anchors = anchorCells(item.shape);
    const minR = Math.min(...solids.map(([r]) => r));
    const maxR = Math.max(...solids.map(([r]) => r));
    const minC = Math.min(...solids.map(([, c]) => c));
    const dir = anchorDir(item.shape);
    const collides = (row0: number, col0: number) =>
      solids.some(([r, c]) => occupied.has(`${row0 + r},${col0 + c}`));

    // pl.row encodes bottom solid for standing items, top solid otherwise
    let row0 = dir === 'below' ? pl.row - maxR : pl.row - minR;
    let col0 = pl.col - minC;

    if (collides(row0, col0) && dir === 'below' && occupied.has(`${pl.row},${pl.col}`)) {
      // coordinate points at the cell it stands on — sit on top of it
      const [ar, ac] = anchors[0];
      if (!collides(pl.row - ar, pl.col - ac)) {
        row0 = pl.row - ar;
        col0 = pl.col - ac;
      }
    }

    if (dir === 'below') {
      // keep stacked items above the room (negative rows) inside the grid
      if (row0 + minR < 0) row0 = -minR;

      const supportedAt = (r0: number, slack: number) =>
        anchors.some(([ar, ac]) => {
          const r = r0 + ar;
          if (r >= cfg.rows) return true; // resting on the floor
          for (let d = -slack; d <= slack; d++) {
            if (occupied.has(`${r},${col0 + ac + d}`)) return true;
          }
          return false;
        });

      // adjacent-column support is good enough to stay put, but while
      // falling only an exact landing or the floor stops the slide
      if (!supportedAt(row0, 1)) {
        while (!supportedAt(row0, 0)) row0++;
      }
    }

    for (const [r, c] of solids) occupied.add(`${row0 + r},${col0 + c}`);
    result.push({ item, row: row0, col: col0 });
  }
  return result;
}

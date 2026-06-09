import type { FurnitureItem, PlacedFurniture, RoomConfig } from '../types/furniture';

export function buildOccupancy(placed: PlacedFurniture[], cfg: RoomConfig, ignoreId?: string, ignoreIds?: Set<string>): (string | null)[][] {
  const grid: (string | null)[][] = Array.from({ length: cfg.rows }, () =>
    Array(cfg.cols).fill(null),
  );
  for (const p of placed) {
    if (p.instanceId === ignoreId) continue;
    if (ignoreIds?.has(p.instanceId)) continue;
    const shape = p.item.shape;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        const cellType = shape[r][c];
        if (cellType === 2 || cellType === 3) {
          const gr = p.row + r;
          const gc = p.col + c;
          if (gr >= 0 && gr < cfg.rows && gc >= 0 && gc < cfg.cols) {
            grid[gr][gc] = p.instanceId;
          }
        }
      }
    }
  }
  return grid;
}

export function buildAnchorPointSet(placed: PlacedFurniture[], cfg: RoomConfig, ignoreId?: string, ignoreIds?: Set<string>): Set<string> {
  const set = new Set<string>();

  // Bottom boundary anchors
  for (let c = 0; c < cfg.cols; c++) {
    set.add(`${cfg.rows},${c}`);
  }

  // Top boundary anchors (only for rooms that have them)
  if (cfg.hasTopAnchors) {
    for (let c = 0; c < cfg.cols; c++) {
      set.add(`${-1},${c}`);
    }
  }

  for (const p of placed) {
    if (p.instanceId === ignoreId) continue;
    if (ignoreIds?.has(p.instanceId)) continue;
    const shape = p.item.shape;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] === 3) {
          set.add(`${p.row + r},${p.col + c}`);
        }
      }
    }
  }
  return set;
}

export function canPlace(
  item: FurnitureItem,
  row: number,
  col: number,
  occupancy: (string | null)[][],
  anchorPointSet: Set<string>,
  cfg: RoomConfig,
): boolean {
  const shape = item.shape;
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      const cellType = shape[r][c];
      const gr = row + r;
      const gc = col + c;
      if (cellType === 2 || cellType === 3) {
        if (gr < 0 || gr >= cfg.rows || gc < 0 || gc >= cfg.cols) return false;
        if (!cfg.isValidCell(gr, gc)) return false;
        if (occupancy[gr][gc] !== null) return false;
      }
      if (cellType === 4) {
        if (gc < 0 || gc >= cfg.cols) return false;
        if (!anchorPointSet.has(`${gr},${gc}`)) return false;
      }
      if (cellType === 5) {
        if (gr < 0 || gr >= cfg.rows || gc < 0 || gc >= cfg.cols) return false;
        if (!cfg.isValidCell(gr, gc)) return false;
      }
    }
  }
  return true;
}

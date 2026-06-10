import type { CSSProperties } from 'react';
import type { PlacedFurniture } from '../types/furniture';
import { getRoomConfig, getRoomLabel, ATTIC_INDEX } from '../types/furniture';

const CELL_COLORS: Record<number, string> = {
  2: 'var(--lavender-grey)',
  3: 'var(--blushed-brick)',
  5: 'var(--charcoal)',
};

interface Props {
  rooms: PlacedFurniture[][];
  isRoomUnlocked: (i: number) => boolean;
  onSelectRoom: (i: number) => void;
}

function MiniRoom({ roomIndex, placed, unlocked, onSelect }: {
  roomIndex: number;
  placed: PlacedFurniture[];
  unlocked: boolean;
  onSelect: () => void;
}) {
  const cfg = getRoomConfig(roomIndex);

  // Cell type per grid position (solid / anchor point / background)
  const grid: (number | null)[][] = Array.from({ length: cfg.rows }, () => Array(cfg.cols).fill(null));
  for (const p of placed) {
    for (let r = 0; r < p.item.shape.length; r++) {
      for (let c = 0; c < p.item.shape[r].length; c++) {
        const t = p.item.shape[r][c];
        if (t !== 1 && t !== 4) {
          const gr = p.row + r;
          const gc = p.col + c;
          if (gr >= 0 && gr < cfg.rows && gc >= 0 && gc < cfg.cols) grid[gr][gc] = t;
        }
      }
    }
  }

  const wrapper: CSSProperties = {
    position: 'relative',
    flex: 1,
    minWidth: 0,
    border: `1px solid ${unlocked ? 'var(--border)' : 'transparent'}`,
    borderRadius: 10,
    padding: 8,
    background: 'var(--social-bg)',
    cursor: unlocked ? 'pointer' : 'default',
    opacity: unlocked ? 1 : 0.45,
  };

  return (
    <div
      style={wrapper}
      onClick={unlocked ? onSelect : undefined}
      title={unlocked ? `Open ${getRoomLabel(roomIndex)}` : `${getRoomLabel(roomIndex)} is not yet unlocked in game`}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-h)', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
        <span>{getRoomLabel(roomIndex)}</span>
        <span style={{ color: 'var(--text-m)', fontWeight: 400 }}>
          {unlocked ? `${placed.length} item${placed.length !== 1 ? 's' : ''}` : '🔒 locked'}
        </span>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cfg.cols}, 1fr)`,
        gap: 1,
      }}>
        {grid.map((row, r) =>
          row.map((cell, c) => {
            const valid = cfg.isValidCell(r, c);
            return (
              <div
                key={`${r}-${c}`}
                style={{
                  aspectRatio: '1',
                  borderRadius: 1,
                  background: !valid ? 'transparent' : cell ? CELL_COLORS[cell] : 'var(--code-bg)',
                  border: valid ? '1px solid var(--border)' : 'none',
                }}
              />
            );
          }),
        )}
      </div>
    </div>
  );
}

/**
 * Whole-house overview in the game's arrangement: attic on top,
 * Room 4 / Room 3 above Room 1 / Room 2 (matches the house image export).
 * Click a room to open it in the designer.
 */
export default function HouseView({ rooms, isRoomUnlocked, onSelectRoom }: Props) {
  const mini = (i: number) => (
    <MiniRoom
      roomIndex={i}
      placed={rooms[i]}
      unlocked={isRoomUnlocked(i)}
      onSelect={() => onSelectRoom(i)}
    />
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', minHeight: 0, paddingRight: 4 }}>
      {mini(ATTIC_INDEX)}
      <div style={{ display: 'flex', gap: 10 }}>
        {mini(3)}
        {mini(2)}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        {mini(0)}
        {mini(1)}
      </div>
    </div>
  );
}

import type { CSSProperties } from 'react';
import type { FurnitureItem } from '../types/furniture';
import FurnitureImage from './FurnitureImage';
import ShapeVisualizer from './ShapeVisualizer';
import StatDisplay from './StatDisplay';
import { STAT_COLORS } from '../utils/statColors';
import OwnershipCounter from './OwnershipCounter';

const GRID_FULL = '56px 48px minmax(120px, 1fr) repeat(5, 60px) 90px';
const GRID_COMPACT = '36px 28px minmax(40px, 1fr) repeat(5, 28px) 68px';
const GRID_COMPACT_REM = '36px 28px minmax(40px, 1fr) repeat(5, 28px) 68px 48px';

const baseCard: CSSProperties = {
  display: 'grid',
  alignItems: 'center',
  padding: '10px 12px',
  borderRadius: 12,
  background: 'var(--social-bg)',
  border: '1px solid var(--border)',
};

const nameStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  color: 'var(--text-h)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

interface Props {
  item: FurnitureItem;
  owned: number;
  onIncrement: () => void;
  onDecrement: () => void;
  compact?: boolean;
  isMobile?: boolean;
  statsPerSpace?: boolean;
  remaining?: number;
}

export default function FurnitureCard({ item, owned, onIncrement, onDecrement, compact, isMobile, statsPerSpace, remaining }: Props) {
  const apl = statsPerSpace ? item.appealPerSpace : item.appeal;
  const cmf = statsPerSpace ? item.comfortPerSpace : item.comfort;
  const stm = statsPerSpace ? item.stimulationPerSpace : item.stimulation;
  const hlt = statsPerSpace ? item.healthPerSpace : item.health;
  const mut = statsPerSpace ? item.mutationPerSpace : item.mutation;

  if (isMobile) {
    return (
      <div style={{
        ...baseCard,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
      }}>
        <FurnitureImage src={item.image_url} alt={item.name} compact />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...nameStyle, fontSize: 13, marginBottom: 4 }} title={item.name}>{item.name}</div>
          <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--text)', flexWrap: 'wrap' }}>
            <span style={{ color: STAT_COLORS.appeal }}>A:{apl}</span>
            <span style={{ color: STAT_COLORS.comfort }}>C:{cmf}</span>
            <span style={{ color: STAT_COLORS.stimulation }}>S:{stm}</span>
            <span style={{ color: STAT_COLORS.health }}>H:{hlt}</span>
            <span style={{ color: STAT_COLORS.mutation }}>M:{mut}</span>
          </div>
        </div>
        <OwnershipCounter count={owned} onIncrement={onIncrement} onDecrement={onDecrement} compact />
      </div>
    );
  }

  const showRem = remaining !== undefined;
  const gridCols = showRem ? GRID_COMPACT_REM : compact ? GRID_COMPACT : GRID_FULL;

  return (
    <div style={{ ...baseCard, gridTemplateColumns: gridCols, gap: compact ? 8 : 0 }}>
      <FurnitureImage src={item.image_url} alt={item.name} compact={compact} draggableItem={item} />
      <ShapeVisualizer shape={item.shape} compact={compact} />
      <div style={nameStyle} title={item.name}>{item.name}</div>
      <StatDisplay value={apl} compact={compact} stat="appeal" />
      <StatDisplay value={cmf} compact={compact} stat="comfort" />
      <StatDisplay value={stm} compact={compact} stat="stimulation" />
      <StatDisplay value={hlt} compact={compact} stat="health" />
      <StatDisplay value={mut} compact={compact} stat="mutation" />
      <OwnershipCounter count={owned} onIncrement={onIncrement} onDecrement={onDecrement} compact={compact} />
      {showRem && (
        <div style={{
          fontSize: 12,
          fontWeight: 600,
          textAlign: 'center',
          color: remaining > 0 ? 'var(--accent)' : remaining < 0 ? 'var(--blushed-brick)' : 'var(--text)',
        }}>
          {remaining}
        </div>
      )}
    </div>
  );
}

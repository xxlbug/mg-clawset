import { STAT_COLORS } from '../utils/statColors';
import type { CSSProperties } from 'react';

interface Props {
  value: number;
  compact?: boolean;
  /** Stat key for color coding (appeal/comfort/...). */
  stat?: string;
}

export default function StatDisplay({ value, compact, stat }: Props) {
  const isDecimal = value !== Math.floor(value);
  const style: CSSProperties = {
    width: '100%',
    textAlign: 'center',
    fontSize: compact ? (isDecimal ? 10 : 12) : (isDecimal ? 12 : 14),
    fontWeight: 500,
    color: value !== 0 && stat && stat in STAT_COLORS ? STAT_COLORS[stat as keyof typeof STAT_COLORS] : 'var(--text-h)',
  };

  return <span style={style}>{isDecimal ? value.toFixed(2) : value}</span>;
}

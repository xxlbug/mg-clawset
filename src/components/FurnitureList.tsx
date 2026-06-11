import type { CSSProperties } from 'react';
import type { FurnitureItem } from '../types/furniture';
import FurnitureCard from './FurnitureCard';

const styles: Record<string, CSSProperties> = {
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 16px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  empty: {
    textAlign: 'center',
    padding: 40,
    color: 'var(--text)',
    fontSize: 14,
  },
  paginationRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 16px 12px',
    borderTop: '1px solid var(--border)',
    flexShrink: 0,
  },
  paginationCenter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
  },
  pageButton: {
    padding: '4px 12px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--code-bg)',
    color: 'var(--text-h)',
    fontFamily: 'var(--font)',
    fontSize: 13,
    cursor: 'pointer',
  },
  pageInfo: {
    fontSize: 13,
    color: 'var(--text)',
    minWidth: 100,
    textAlign: 'center',
  },
};

interface Props {
  items: FurnitureItem[];
  totalItems: number;
  ownership: Record<string, number>;
  onIncrement: (name: string) => void;
  onDecrement: (name: string) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  compact?: boolean;
  isMobile?: boolean;
  statsPerSpace?: boolean;
  usedCounts?: Record<string, number>;
}

export default function FurnitureList({
  items,
  totalItems,
  ownership,
  onIncrement,
  onDecrement,
  page,
  totalPages,
  onPageChange,
  compact,
  isMobile,
  statsPerSpace,
  usedCounts,
}: Props) {
  return (
    <>
      <div style={{
        ...styles.list,
        ...(isMobile ? { flex: 'none', overflowY: 'visible' } : {}),
      }}>
        {items.length === 0 ? (
          <div style={styles.empty}>No furniture matches your filters.</div>
        ) : (
          items.map((item) => (
            <FurnitureCard
              key={item.id}
              item={item}
              owned={ownership[item.id] || 0}
              onIncrement={() => onIncrement(item.id)}
              onDecrement={() => onDecrement(item.id)}
              compact={compact}
              isMobile={isMobile}
              statsPerSpace={statsPerSpace}
              remaining={usedCounts ? (ownership[item.id] || 0) - (usedCounts[item.id] || 0) : undefined}
            />
          ))
        )}
      </div>
      <div style={{
        ...styles.paginationRow,
        ...(isMobile ? { flexDirection: 'column', gap: 8, padding: '10px 12px' } : {}),
      }}>
        <div style={styles.paginationCenter}>
          <button
            style={{
              ...styles.pageButton,
              opacity: page === 0 ? 0.4 : 1,
              cursor: page === 0 ? 'not-allowed' : 'pointer',
            }}
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0}
          >
            ← Prev
          </button>
          <span style={styles.pageInfo}>
            {page + 1} / {totalPages} ({totalItems})
          </span>
          <button
            style={{
              ...styles.pageButton,
              opacity: page >= totalPages - 1 ? 0.4 : 1,
              cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
            }}
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages - 1}
          >
            Next →
          </button>
        </div>
      </div>
    </>
  );
}

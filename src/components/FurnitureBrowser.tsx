import type { CSSProperties } from 'react';
import type { FurnitureItem, Filters, SortConfig, SortField } from '../types/furniture';
import FilterHeader from './FilterHeader';
import FurnitureList from './FurnitureList';
import ViewToggleButton from './ViewToggleButton';

const styles: Record<string, CSSProperties> = {
  browser: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 16,
    border: '1px solid var(--border)',
    background: 'var(--bg)',
    overflow: 'visible',
    minHeight: 0,
    height: '100%',
  },
};

interface Props {
  items: FurnitureItem[];
  totalItems: number;
  ownership: Record<string, number>;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  sort: SortConfig;
  onSortChange: (field: SortField) => void;
  onIncrement: (name: string) => void;
  onDecrement: (name: string) => void;
  expanded: boolean;
  onToggle: () => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onImportClick: () => void;
  isMobile?: boolean;
  statsPerSpace: boolean;
  onStatsPerSpaceChange: (v: boolean) => void;
  usedCounts: Record<string, number>;
  /** Hide the drawer collapse arrow (full-page furniture view). */
  showToggle?: boolean;
}

export default function FurnitureBrowser({
  items,
  totalItems,
  ownership,
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  onIncrement,
  onDecrement,
  expanded,
  onToggle,
  page,
  totalPages,
  onPageChange,
  onImportClick,
  isMobile,
  statsPerSpace,
  onStatsPerSpaceChange,
  usedCounts,
  showToggle = true,
}: Props) {
  return (
    <div style={{
      ...styles.browser,
      ...(isMobile ? { height: 'auto', overflow: 'visible', position: 'static' as const } : {}),
    }}>
      <FilterHeader
        onLoadSavegame={onImportClick}
        filters={filters}
        onFiltersChange={onFiltersChange}
        sort={sort}
        onSortChange={onSortChange}
        compact={expanded}
        isMobile={isMobile}
        statsPerSpace={statsPerSpace}
        onStatsPerSpaceChange={onStatsPerSpaceChange}
        showRemaining={expanded}
      />
      <FurnitureList
        items={items}
        totalItems={totalItems}
        ownership={ownership}
        onIncrement={onIncrement}
        onDecrement={onDecrement}
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
        compact={expanded}
        isMobile={isMobile}
        statsPerSpace={statsPerSpace}
        usedCounts={expanded ? usedCounts : undefined}
      />
      {!isMobile && showToggle && <ViewToggleButton expanded={expanded} onClick={onToggle} />}
    </div>
  );
}

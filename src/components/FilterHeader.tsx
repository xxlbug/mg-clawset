import type { CSSProperties } from 'react';
import type { Filters, SortConfig, SortField } from '../types/furniture';
import SearchInput from './SearchInput';
import StatFilter from './StatFilter';
import ToggleSwitch from './ToggleSwitch';
import SortButton from './SortButton';
import StatIcon from './StatIcon';
import CatMascot from './CatMascot';
import AdvancedFilters from './AdvancedFilters';

const GRID_FULL = 'minmax(160px, 1fr) repeat(5, 60px) 90px';
const GRID_COMPACT = 'minmax(90px, 1fr) repeat(5, 28px) 68px';
const GRID_COMPACT_REM = 'minmax(90px, 1fr) repeat(5, 28px) 68px 48px';

const styles: Record<string, CSSProperties> = {
  wrapper: {
    padding: '12px 0',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    position: 'sticky',
    top: 0,
    background: 'var(--bg)',
    zIndex: 10,
    borderRadius: '16px 16px 0 0',
  },
};

const statColumns: { label: string; stat: string; field: SortField; filterKey: keyof Filters }[] = [
  { label: 'APL', stat: 'appeal', field: 'appeal', filterKey: 'minAppeal' },
  { label: 'CMF', stat: 'comfort', field: 'comfort', filterKey: 'minComfort' },
  { label: 'STM', stat: 'stimulation', field: 'stimulation', filterKey: 'minStimulation' },
  { label: 'HLT', stat: 'health', field: 'health', filterKey: 'minHealth' },
  { label: 'MUT', stat: 'mutation', field: 'mutation', filterKey: 'minMutation' },
];

interface Props {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  sort: SortConfig;
  onSortChange: (field: SortField) => void;
  compact?: boolean;
  isMobile?: boolean;
  statsPerSpace: boolean;
  onStatsPerSpaceChange: (v: boolean) => void;
  showRemaining?: boolean;
  onLoadSavegame?: () => void;
}

export default function FilterHeader({ filters, onFiltersChange, sort, onSortChange, compact, isMobile, statsPerSpace, onStatsPerSpaceChange, showRemaining, onLoadSavegame }: Props) {
  const update = (partial: Partial<Filters>) =>
    onFiltersChange({ ...filters, ...partial });

  if (isMobile) {
    return (
      <div style={{ ...styles.wrapper, position: 'sticky', top: 0, zIndex: 10 }}>
        {/* Row 1: Cat + Name sort + Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px' }}>
          <CatMascot compact={false} isMobile onLoadSavegame={onLoadSavegame} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <SortButton label="Name" active={sort.field === 'name'} direction={sort.direction} onClick={() => onSortChange('name')} />
            <SearchInput value={filters.name} onChange={(v) => update({ name: v })} />
          </div>
        </div>
        {/* Row 2: Stat sort + filter icons in a single compact row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr) auto',
          alignItems: 'center',
          gap: 4,
          padding: '0 12px',
        }}>
          {statColumns.map((col) => (
            <div key={col.field} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <SortButton
                label={<StatIcon stat={col.stat} size={16} />}
                active={sort.field === col.field}
                direction={sort.direction}
                onClick={() => onSortChange(col.field)}
              />
              <StatFilter
                label={col.label}
                value={filters[col.filterKey] as number}
                onChange={(v) => update({ [col.filterKey]: v })}
              />
            </div>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <SortButton label="Owned" active={sort.field === 'owned'} direction={sort.direction} onClick={() => onSortChange('owned')} />
            <ToggleSwitch checked={filters.onlyOwned} onChange={(v) => update({ onlyOwned: v })} label="" />
          </div>
        </div>
        <AdvancedFilters
          filters={filters}
          onFiltersChange={onFiltersChange}
          statsPerSpace={statsPerSpace}
          onStatsPerSpaceChange={onStatsPerSpaceChange}
          compact
          isMobile
        />
      </div>
    );
  }

  const gridCols = showRemaining
    ? GRID_COMPACT_REM
    : compact ? GRID_COMPACT : GRID_FULL;

  const headerGrid: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: gridCols,
    gridTemplateRows: 'auto auto',
    alignItems: 'center',
    gap: compact ? '8px 8px' : '8px 0',
    padding: '0 29px',
  };

  return (
    <div style={styles.wrapper}>
      <div style={headerGrid}>
        <SortButton
          label="Name"
          active={sort.field === 'name'}
          direction={sort.direction}
          onClick={() => onSortChange('name')}
        />
        {statColumns.map((col) => (
          <SortButton
            key={col.field}
            label={<StatIcon stat={col.stat} size={18} />}
            active={sort.field === col.field}
            direction={sort.direction}
            onClick={() => onSortChange(col.field)}
          />
        ))}
        <SortButton
          label="Owned"
          active={sort.field === 'owned'}
          direction={sort.direction}
          onClick={() => onSortChange('owned')}
        />
        {showRemaining && (
          <SortButton
            label="Unused"
            active={sort.field === 'remaining'}
            direction={sort.direction}
            onClick={() => onSortChange('remaining')}
          />
        )}

        <SearchInput value={filters.name} onChange={(v) => update({ name: v })} />
        {statColumns.map((col) => (
          <StatFilter
            key={col.field}
            label={col.label}
            value={filters[col.filterKey] as number}
            onChange={(v) => update({ [col.filterKey]: v })}
          />
        ))}
        <ToggleSwitch
          checked={filters.onlyOwned}
          onChange={(v) => update({ onlyOwned: v })}
          label={compact ? '' : 'Only'}
        />
        {showRemaining && (
          <ToggleSwitch
            checked={filters.onlyRemaining}
            onChange={(v) => update({ onlyRemaining: v })}
            label=""
          />
        )}
      </div>
      <AdvancedFilters
        filters={filters}
        onFiltersChange={onFiltersChange}
        statsPerSpace={statsPerSpace}
        onStatsPerSpaceChange={onStatsPerSpaceChange}
        compact={compact}
      />
    </div>
  );
}

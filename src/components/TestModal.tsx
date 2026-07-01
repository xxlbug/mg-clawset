import { useState } from 'react';
import type { CSSProperties } from 'react';

const overlay: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modal: CSSProperties = {
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 16,
  padding: '28px 32px',
  maxWidth: 520,
  width: '90%',
  fontFamily: 'var(--font)',
  color: 'var(--text-h)',
  position: 'relative',
};

const heading: CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  marginBottom: 16,
  color: 'var(--text-h)',
};

const label: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text-h)',
  marginBottom: 8,
  display: 'block',
};

const presetCard = (selected: boolean): CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  padding: '14px 16px',
  borderRadius: 10,
  border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
  background: selected ? 'var(--accent-bg)' : 'var(--code-bg)',
  cursor: 'pointer',
  flex: 1,
  minWidth: 0,
  transition: 'border-color 0.15s, background 0.15s',
});

const presetName: CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--text-h)',
};

const section: CSSProperties = {
  marginTop: 20,
};

const sliderRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
};

const sliderVal: CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--accent)',
  minWidth: 40,
  textAlign: 'right',
  whiteSpace: 'nowrap',
};

const buttonRow: CSSProperties = {
  display: 'flex',
  gap: 10,
  justifyContent: 'flex-end',
  marginTop: 24,
};

const btnBase: CSSProperties = {
  padding: '8px 18px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  fontFamily: 'var(--font)',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
};

export type TestPresetKey = 'early' | 'mid' | 'late';

interface PresetDef {
  key: TestPresetKey;
  label: string;
  defaultItemCount: number;
  defaultRarePercent: number;
  defaultRooms: number;
}

const PRESETS: PresetDef[] = [
  { key: 'early', label: 'Early Game', defaultItemCount: 35,  defaultRarePercent: 0, defaultRooms: 2 },
  { key: 'mid',   label: 'Mid Game',   defaultItemCount: 180, defaultRarePercent: 3, defaultRooms: 4 },
  { key: 'late',  label: 'Late Game',  defaultItemCount: 500, defaultRarePercent: 8, defaultRooms: 5 },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onTest: (itemCount: number, rarePercent: number, unlockedRooms: number) => void;
}

export default function TestModal({ open, onClose, onTest }: Props) {
  const [selectedPreset, setSelectedPreset] = useState<TestPresetKey>('early');
  const [itemCount, setItemCount] = useState(35);
  const [rarePercent, setRarePercent] = useState(0);
  const [roomCount, setRoomCount] = useState(2);

  if (!open) return null;

  const selectPreset = (key: TestPresetKey) => {
    const p = PRESETS.find((pr) => pr.key === key)!;
    setSelectedPreset(key);
    setItemCount(p.defaultItemCount);
    setRarePercent(p.defaultRarePercent);
    setRoomCount(p.defaultRooms);
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={heading}>Test Mode</h2>

        <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, marginBottom: 16 }}>
          Generate a fake inventory to test the auto-fill algorithm without hunting for a real save file.
          Pick a progression stage, then tweak the sliders to fine-tune.
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {PRESETS.map((p) => (
            <div
              key={p.key}
              style={presetCard(selectedPreset === p.key)}
              onClick={() => selectPreset(p.key)}
            >
              <span style={presetName}>{p.label}</span>
              <span style={{ fontSize: 11, color: 'var(--text-m)', marginTop: 2 }}>
                {p.defaultItemCount} items · {p.defaultRarePercent}% rare · {p.defaultRooms} rooms
              </span>
            </div>
          ))}
        </div>

        <div style={section}>
          <span style={label}>Items in inventory</span>
          <div style={sliderRow}>
            <span style={{ fontSize: 12, color: 'var(--text-m)', minWidth: 32 }}>0</span>
            <input
              type="range"
              min={0}
              max={2000}
              step={5}
              value={itemCount}
              onChange={(e) => setItemCount(Number(e.target.value))}
              style={{ flex: 1, accentColor: 'var(--accent)' }}
            />
            <span style={sliderVal}>{itemCount}</span>
          </div>
        </div>

        <div style={section}>
          <span style={label}>Rare items</span>
          <div style={sliderRow}>
            <span style={{ fontSize: 12, color: 'var(--text-m)', minWidth: 32 }}>0%</span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={rarePercent}
              onChange={(e) => setRarePercent(Number(e.target.value))}
              style={{ flex: 1, accentColor: 'var(--accent)' }}
            />
            <span style={sliderVal}>{rarePercent}%</span>
          </div>
        </div>

        <div style={section}>
          <span style={label}>Unlocked rooms</span>
          <div style={sliderRow}>
            <span style={{ fontSize: 12, color: 'var(--text-m)', minWidth: 32 }}>2</span>
            <input
              type="range"
              min={2}
              max={5}
              step={1}
              value={roomCount}
              onChange={(e) => setRoomCount(Number(e.target.value))}
              style={{ flex: 1, accentColor: 'var(--accent)' }}
            />
            <span style={sliderVal}>
              {roomCount}
              {roomCount === 2 ? ' rooms' : roomCount >= 5 ? ' (all)' : ' rooms'}
            </span>
          </div>
        </div>

        <div style={{ ...section, background: 'var(--code-bg)', borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
            {itemCount} items ({rarePercent}% rare),
            {roomCount >= 5 ? ' all rooms' : ` ${roomCount} rooms`}
          </div>
        </div>

        <div style={buttonRow}>
          <button
            style={{ ...btnBase, background: 'var(--code-bg)', color: 'var(--text)' }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            style={{
              ...btnBase,
              background: 'var(--accent)',
              color: 'var(--bg)',
              border: '1px solid var(--accent)',
              fontWeight: 600,
            }}
            onClick={() => onTest(itemCount, rarePercent, roomCount)}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

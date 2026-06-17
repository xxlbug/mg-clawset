import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { PlacedFurniture } from '../types/furniture';
import StatIcon from './StatIcon';
import {
  PERFECT7_STAGES,
  TOTAL_STEPS,
  ALL_STEP_IDS,
  nextStep,
  analyzeRoomsForBreeding,
  recommendBreedingRoom,
  pairCoverage,
  betterStatChance,
  abilityInheritanceChances,
  CAT_STATS,
  CAT_STAT_LABELS,
  MAX_STAT,
} from '../utils/breeding';
import type { CatStat, RoomBreedingInfo, StatState } from '../utils/breeding';

const PROGRESS_KEY = 'mg-clawset-breeding-progress';

function loadProgress(): Set<string> {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) {
      const arr = JSON.parse(raw) as string[];
      if (Array.isArray(arr)) return new Set(arr.filter((id) => ALL_STEP_IDS.includes(id)));
    }
  } catch { /* ignore */ }
  return new Set();
}

// Illustrative foundation pair for the "cats you need" preview. mg-clawset has
// no cat data yet, so this is a worked example, not your save.
const EXAMPLE_A: Record<CatStat, number> = { STR: 7, DEX: 7, CON: 5, INT: 7, SPD: 4, CHA: 7, LCK: 6 };
const EXAMPLE_B: Record<CatStat, number> = { STR: 6, DEX: 7, CON: 7, INT: 5, SPD: 7, CHA: 4, LCK: 7 };

const STATE_COLOR: Record<StatState, string> = {
  locked: 'rgb(80, 160, 80)',
  reachable: 'rgb(180, 140, 60)',
  missing: 'rgb(193, 73, 83)',
};
const STATE_LABEL: Record<StatState, string> = {
  locked: 'Locked 7 (both parents ≥7)',
  reachable: 'Reachable (one parent ≥7)',
  missing: 'Missing (needs an outcross)',
};

const card: CSSProperties = {
  background: 'var(--code-bg)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: 20,
  marginBottom: 16,
};
const h2: CSSProperties = { fontSize: 17, fontWeight: 700, color: 'var(--text-h)', margin: '0 0 4px' };
const sub: CSSProperties = { fontSize: 12, color: 'var(--text-m)', margin: '0 0 14px' };
const pill = (bg: string): CSSProperties => ({
  display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 11,
  fontWeight: 700, color: '#fff', background: bg,
});

interface Props {
  rooms: PlacedFurniture[][];
  isRoomUnlocked: (i: number) => boolean;
  /** Jump to a room in the designer. */
  onOpenRoom: (i: number) => void;
}

export default function BreedingGuide({ rooms, isRoomUnlocked, onOpenRoom }: Props) {
  const [done, setDone] = useState<Set<string>>(loadProgress);

  useEffect(() => {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify([...done]));
  }, [done]);

  const toggle = useCallback((id: string) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const roomInfos = useMemo(
    () => analyzeRoomsForBreeding(rooms, isRoomUnlocked),
    [rooms, isRoomUnlocked],
  );
  const recommended = useMemo(() => recommendBreedingRoom(roomInfos), [roomInfos]);
  const stim = recommended?.stimulation ?? 0;

  const next = nextStep(done);
  const completedCount = done.size;
  const pct = Math.round((completedCount / TOTAL_STEPS) * 100);

  const exampleCoverage = useMemo(() => pairCoverage(EXAMPLE_A, EXAMPLE_B, stim), [stim]);
  const abilities = abilityInheritanceChances(stim);

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16 }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        {/* Intro */}
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-h)', margin: '0 0 4px' }}>
            🧬 Breeding Guide — Perfect 7
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-m)', margin: 0, lineHeight: 1.5 }}>
            A "Perfect 7" cat has all seven base stats at the max value of {MAX_STAT}
            {' '}(STR · DEX · CON · INT · SPD · CHA · LCK). You breed toward it by stacking
            parents that already hold 7s and pushing clean, unrelated lines. This guide walks
            the {PERFECT7_STAGES.length}-stage method and recommends which of your rooms to breed in.
          </p>
        </div>

        {/* 1 + 2 — next step + total progress */}
        <div style={card}>
          <h2 style={h2}>Your next step</h2>
          <p style={sub}>{completedCount}/{TOTAL_STEPS} steps complete ({pct}%) toward a perfect 7-line.</p>
          <div style={{ height: 8, background: 'var(--bg)', borderRadius: 6, overflow: 'hidden', marginBottom: 16, border: '1px solid var(--border)' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', transition: 'width .3s ease' }} />
          </div>

          {next ? (
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', background: 'var(--accent-bg)', border: '1px solid var(--accent)', borderRadius: 10, padding: 16 }}>
              <span style={pill('var(--accent)')}>Stage {next.stage.num}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-h)' }}>{next.step.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 4, lineHeight: 1.5 }}>{next.step.detail}</div>
                {(next.step.id === 's1-room' || next.step.id === 's1-pairs') && (
                  <div style={{ marginTop: 10, fontSize: 13 }}>
                    {recommended ? (
                      <span>
                        Recommended breeding room:{' '}
                        <button onClick={() => onOpenRoom(recommended.index)} style={linkBtn}>
                          {recommended.label}
                        </button>{' '}
                        — Stimulation <b>{recommended.stimulation}</b>
                        {' '}(higher-stat inheritance {Math.round(recommended.betterChance * 100)}%), Comfort <b>{recommended.comfort}</b>.
                      </span>
                    ) : (
                      <span style={{ color: STATE_COLOR.missing }}>
                        No viable breeding room yet — build a room with Comfort ≥ -10 in the House view first.
                      </span>
                    )}
                  </div>
                )}
                <button onClick={() => toggle(next.step.id)} style={{ ...primaryBtn, marginTop: 12 }}>
                  Mark done →
                </button>
              </div>
            </div>
          ) : (
            <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent)', borderRadius: 10, padding: 16, fontSize: 14, color: 'var(--text-h)' }}>
              🎉 All {TOTAL_STEPS} steps complete — your perfect-7 line should be locked in. Keep an unrelated backup alive.
            </div>
          )}
        </div>

        {/* 3 — room guidance */}
        <div style={card}>
          <h2 style={h2}>Room guidance</h2>
          <p style={sub}>
            Breeding rooms want high <b>Stimulation</b> and non-negative <b>Comfort</b>. Stimulation
            raises the odds a kitten inherits the better parent's stat; Comfort below -10 makes
            breeding auto-fail. Totals come from the furniture you placed in the House view.
          </p>

          {roomInfos.length === 0 ? (
            <p style={{ fontSize: 13, color: STATE_COLOR.missing }}>No unlocked rooms. Load a savegame or design rooms in the House view.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--text-m)', fontSize: 11 }}>
                    <th style={th}>Room</th>
                    <th style={th}><StatIcon stat="stimulation" size={14} /> Stim</th>
                    <th style={th}><StatIcon stat="comfort" size={14} /> Comfort</th>
                    <th style={th}>Better-stat odds</th>
                    <th style={th}>Status</th>
                    <th style={th} />
                  </tr>
                </thead>
                <tbody>
                  {roomInfos.map((r) => <RoomRow key={r.index} r={r} best={r.index === recommended?.index} onOpen={() => onOpenRoom(r.index)} />)}
                </tbody>
              </table>
            </div>
          )}

          <ul style={tips}>
            <li>Dedicate your strongest-Stimulation room to the active breeding pair.</li>
            <li><b>Separate your lines:</b> keep different lines (and grown siblings) in different rooms so you never inbreed by accident — that's Stage 2.</li>
            <li>Keep Comfort ≥ 0 — negative Comfort lowers success, and below -10 nothing breeds at all.</li>
            <li style={{ color: 'var(--text-m)' }}>
              At Stimulation {stim}: better-stat inheritance {Math.round(betterStatChance(stim) * 100)}%,
              first-ability {Math.round(abilities.firstActive * 100)}%, passive {Math.round(abilities.passive * 100)}%.
            </li>
          </ul>
        </div>

        {/* 4 — cats you need preview */}
        <div style={card}>
          <h2 style={h2}>Cats you need (preview)</h2>
          <p style={sub}>
            A <b>foundation pair</b> should, between both parents, cover every stat at 7. A stat is
            <span style={{ color: STATE_COLOR.locked, fontWeight: 700 }}> locked</span> when both parents have ≥7,
            <span style={{ color: STATE_COLOR.reachable, fontWeight: 700 }}> reachable</span> when one does, and
            <span style={{ color: STATE_COLOR.missing, fontWeight: 700 }}> missing</span> when neither does.
            Worked example below (odds use your recommended room's Stimulation = {stim}).
          </p>

          <CoverageGrid a={EXAMPLE_A} b={EXAMPLE_B} cov={exampleCoverage} />

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 14, fontSize: 12 }}>
            <div>Expected 7s per kitten: <b style={{ fontSize: 15, color: 'var(--accent)' }}>{exampleCoverage.coverage.toFixed(1)}/7</b></div>
            {exampleCoverage.missing.length > 0 && (
              <div style={{ color: STATE_COLOR.missing }}>
                Still missing: <b>{exampleCoverage.missing.join(', ')}</b> → outcross for these (Stage 3).
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 12 }}>
            {(['locked', 'reachable', 'missing'] as StatState[]).map((s) => (
              <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-m)' }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: STATE_COLOR[s], display: 'inline-block' }} />
                {STATE_LABEL[s]}
              </span>
            ))}
          </div>
        </div>

        {/* full staged plan */}
        <div style={card}>
          <h2 style={h2}>The {PERFECT7_STAGES.length}-stage plan ({TOTAL_STEPS} steps)</h2>
          <p style={sub}>Tick steps as you go — progress is saved in your browser.</p>
          {PERFECT7_STAGES.map((stage) => (
            <div key={stage.num} style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={pill('var(--accent)')}>Stage {stage.num}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-h)' }}>{stage.title}</span>
                <span style={{ fontSize: 12, color: 'var(--text-m)' }}>— {stage.goal}</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text)', margin: '0 0 10px', lineHeight: 1.5 }}>{stage.summary}</p>
              {stage.steps.map((step) => {
                const checked = done.has(step.id);
                return (
                  <label key={step.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', borderRadius: 8, cursor: 'pointer', background: checked ? 'var(--social-bg)' : 'transparent', marginBottom: 4 }}>
                    <input type="checkbox" checked={checked} onChange={() => toggle(step.id)} style={{ marginTop: 3, accentColor: 'var(--accent)' }} />
                    <span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h)', textDecoration: checked ? 'line-through' : 'none', opacity: checked ? 0.6 : 1 }}>{step.title}</span>
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--text-m)', marginTop: 2, lineHeight: 1.45 }}>{step.detail}</span>
                    </span>
                  </label>
                );
              })}
              <ul style={{ ...tips, marginTop: 6 }}>
                {stage.notes.map((n) => <li key={n} style={{ color: 'var(--text-m)' }}>{n}</li>)}
              </ul>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 11, color: 'var(--text-m)', textAlign: 'center', marginBottom: 24 }}>
          Method adapted from the Perfect 7 Planner in frankieg33/MewgenicsBreedingManager.
          Cat-stat data is illustrative — mg-clawset reads furniture, not cats, for now.
        </p>
      </div>
    </div>
  );
}

function RoomRow({ r, best, onOpen }: { r: RoomBreedingInfo; best: boolean; onOpen: () => void }) {
  return (
    <tr style={{ borderTop: '1px solid var(--border)', background: best ? 'var(--accent-bg)' : 'transparent' }}>
      <td style={td}>
        <b style={{ color: best ? 'var(--accent)' : 'var(--text-h)' }}>{r.label}</b>
        {best && <span style={{ ...pill('var(--accent)'), marginLeft: 8 }}>BEST</span>}
        {r.itemCount === 0 && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-m)' }}>(empty)</span>}
      </td>
      <td style={td}>{r.stimulation}</td>
      <td style={{ ...td, color: r.comfort < 0 ? STATE_COLOR.missing : 'var(--text)' }}>{r.comfort}</td>
      <td style={td}>{Math.round(r.betterChance * 100)}%</td>
      <td style={td}>
        {r.viable
          ? <span style={{ color: STATE_COLOR.locked }}>✓ viable</span>
          : <span style={{ color: STATE_COLOR.missing }}>✗ auto-fail (Comfort &lt; -10)</span>}
      </td>
      <td style={td}><button onClick={onOpen} style={linkBtn}>Open →</button></td>
    </tr>
  );
}

function CoverageGrid({ a, b, cov }: { a: Record<CatStat, number>; b: Record<CatStat, number>; cov: ReturnType<typeof pairCoverage> }) {
  const cell: CSSProperties = { padding: '4px 8px', textAlign: 'center', fontWeight: 700, fontSize: 13 };
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ ...cell, textAlign: 'left', color: 'var(--text-m)' }} />
            {CAT_STATS.map((s) => (
              <th key={s} style={{ ...cell, color: 'var(--text-m)' }} title={CAT_STAT_LABELS[s]}>{s}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[['Parent A', a], ['Parent B', b]].map(([label, stats]) => (
            <tr key={label as string}>
              <td style={{ ...cell, textAlign: 'left', color: 'var(--text)' }}>{label as string}</td>
              {CAT_STATS.map((s) => {
                const v = (stats as Record<CatStat, number>)[s];
                return (
                  <td key={s} style={{ ...cell, color: v >= MAX_STAT ? STATE_COLOR.locked : 'var(--text-m)' }}>{v}</td>
                );
              })}
            </tr>
          ))}
          <tr style={{ borderTop: '1px solid var(--border)' }}>
            <td style={{ ...cell, textAlign: 'left', color: 'var(--text)' }}>Kitten 7?</td>
            {CAT_STATS.map((s) => (
              <td key={s} style={cell}>
                <span style={{ display: 'inline-block', width: 22, height: 22, lineHeight: '22px', borderRadius: 5, color: '#fff', background: STATE_COLOR[cov.states[s]] }}>
                  {cov.states[s] === 'locked' ? '7' : cov.states[s] === 'reachable' ? '~' : '✗'}
                </span>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

const th: CSSProperties = { padding: '6px 10px', fontWeight: 600 };
const td: CSSProperties = { padding: '8px 10px' };
const tips: CSSProperties = { margin: '12px 0 0', paddingLeft: 18, fontSize: 12.5, color: 'var(--text)', lineHeight: 1.6 };
const linkBtn: CSSProperties = { background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: 13, fontFamily: 'var(--font)' };
const primaryBtn: CSSProperties = { padding: '7px 16px', borderRadius: 8, background: 'var(--accent)', color: 'var(--bg)', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'var(--font)' };

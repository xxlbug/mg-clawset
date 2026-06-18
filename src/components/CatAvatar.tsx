import type { CSSProperties } from 'react';
import { CatSVG } from './CatMascot';
import type { ParsedCat } from '../utils/catParser';

// A deterministic 0–359 hue from a cat's stable identity, so the same cat always
// draws the same colour and two different cats look distinct. We can't render the
// real in-game sprite (that needs the game's art assets), so this tints the shared
// cat illustration into a recognisable per-cat token for quick scanning.
function catHue(cat: ParsedCat): number {
  const seed = (cat.dbKey * 2654435761) ^ (cat.headShape * 40503) ^ (cat.bodyShape * 12289);
  return Math.abs(seed) % 360;
}

const SEX_RING: Record<string, string> = {
  male: 'rgb(70,130,180)',
  female: 'rgb(200,90,140)',
  '?': 'var(--border)',
};

export default function CatAvatar({ cat, size = 48 }: { cat: ParsedCat; size?: number }) {
  const ring = SEX_RING[cat.sex] ?? 'var(--border)';
  const title = `${cat.name} · ${cat.sex}${cat.catClass ? ' · ' + cat.catClass : ''} · ${cat.room || cat.status}`;
  const wrap: CSSProperties = {
    width: size + 8,
    height: size + 8,
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `2px solid ${ring}`,
    background: 'var(--bg)',
    flexShrink: 0,
    overflow: 'hidden',
  };
  const tint: CSSProperties = {
    filter: `hue-rotate(${catHue(cat)}deg) saturate(1.25)`,
    display: 'inline-flex',
  };
  return (
    <span style={wrap} title={title} aria-label={title}>
      <span style={tint}><CatSVG size={size} /></span>
    </span>
  );
}

# Cat identity cards in “Breed next”

**Date:** 2026-06-18
**Status:** Design approved, pending spec review
**Branch:** `feature/breeding-guide` (PR #2)

## Problem

The “Breed next” card names two cats but gives no visual help finding them in-game.
A faithful rendered sprite is not viable (the game’s art can’t be redistributed on a
public site). Goal: let the user **match each cat to its in-game counterpart at a
glance**, using only rights-clean data (facts/numbers/short labels), never game art.

## What the user sees

Two side-by-side mini-cards (“layout B”), one per cat, with `×` between, replacing the
current tinted-`CatSVG` avatar in the breed-next hero. Each card:

- **Avatar**: a circle whose fill is the cat’s **coat color** (2–3 stop ramp:
  shadow / base / highlight), the **class emoji** centered, and a ring in the
  **class accent color**.
- **Name** (bold).
- `sex · class` line, with a tiny class **stat hint** (e.g. `+INT +CHA`).
- `◆ <color name> · 📍 <room>`.
- **Notable-mutation tags** (e.g. `Pyramid Head`) — only when the cat has one.

Sex is conveyed in the `sex · class` text (the ring now encodes class, not sex).

## Rights basis (why this is safe)

- **Colors are facts.** We extract RGB values from the game palette and ship them as
  our own number table — never the palette PNG file.
- **Numbers are facts.** Per-class stat modifiers are data.
- **Short labels** (mutation names, class names) are factual labels, not creative text.
- **Excluded:** sprites/shapes/portraits/the palette file (art); ability/passive
  descriptions (creative text).
- The one-time **extraction** from `resources.gpak` is a local act by the project
  owner against their own install; only derived facts are committed/shipped.

## Data model — `catParser.ts`

Add to `ParsedCat` (all from the already-validated `T[72]` walk; alignment proven
against the 736-cat save):

- `basePalette: number` — `T[1]`, the coat-color palette row.
- `furPattern: number` — `T[0]`, the fur texture id (carried for future use).
- `visualParts: Record<string, number>` — the 16 part-slot ids (fur, body, head,
  tail, leg_L/R, arm_L/R, eye_L/R, eyebrow_L/R, ear_L/R, mouth) for mutation
  detection. (Already present: `headShape` = body part `head`, `bodyShape` = `body`,
  `catClass`.)

## New module — `catCosmetics.ts` (bundled data + lookups)

Pure data tables built offline from the extracted gpak, plus small lookup helpers.
No game files at runtime.

- `BASE_PALETTE_COLORS: Record<number, { shadow: string; base: string; highlight: string; name: string }>`
  — one entry per palette row (≤256). `base` = `palette.png` column 3 (the renderer’s
  `PALETTE_COL_BASE`). The two ramp stops come from the row’s other coat columns if
  extraction shows a clean shadow→base→highlight set; otherwise they are derived
  programmatically by darkening/lightening `base` (the exact source is fixed during
  the extraction step, not assumed here — note col 1 is the class-tint column and is
  not a coat stop). `name` from our own RGB→name classification
  (black/white/grey/tan/cream/orange/brown/blue-grey/…).
- `CLASS_INFO: Record<string, { paletteRow: number; accent: string; statMods: Partial<Record<CatStat, number>>; levelup: CatStat[] }>`
  — from `classes.gon` + `advanced_classes.gon`; `accent` resolved through the same
  palette. Keyed by the class string the save already gives us (`Mage`, `Tank`, …).
- `CLASS_GLYPH: Record<string, string>` — our own emoji map (🧙 Mage, 🛡️ Tank,
  🏹 Hunter, ⛑️ Medic, 💀 Necromancer, 🔪 Butcher, 🥊 Fighter, 🗡️ Thief, 🌿 Druid,
  🔮 Psychic, 🧘 Monk, 🔧 Tinkerer, 🃏 Jester; 🐾 classless/unknown).
- `MUTATION_NAMES: Record<string, Record<number, string>>` — ported from
  `visual_mutation_catalog.py`, **notable ids only** (the named 300+/700+/900+
  specials; base <300 are normal and produce no tag).
- Helpers: `coatColor(cat)`, `colorName(cat)`, `classInfo(cat)`,
  `notableMutations(cat): { part: string; name: string }[]`.

## New component — `CatCard.tsx`

`CatCard({ cat })` renders one mini-card per the layout above, using `catCosmetics`
lookups. Inline styles, matching the codebase (no CSS files). Breed-next renders
`<CatCard a/> × <CatCard b/>`. `CatAvatar.tsx` is removed (superseded); `CatSVG`
stays in `CatMascot.tsx` for the mascot.

## Data acquisition (offline, one-time)

A throwaway extraction step (not shipped) produces the committed tables:

1. Parse `resources.gpak` directory; slice out `textures/palette.png`,
   `data/classes/classes.gon`, `data/classes/advanced_classes.gon`.
2. Read coat ramps (cols 1/3/5 per row) → `BASE_PALETTE_COLORS`.
3. Parse class `palette` + `stat_mods` + `levelup_stats` → `CLASS_INFO`; resolve
   accent hex via palette.
4. Port mutation names from the catalog.

Commit only the resulting TS data tables. Document the procedure in the module header
so it can be regenerated when the game updates.

## Fallbacks / edge cases

- Unknown palette row → stable grouping tint + name `palette #N`.
- Unknown/empty class → 🐾, `classless`, neutral ring, no stat hint.
- No notable mutation → no tags.
- Cats restored from older `localStorage` lacking the new fields → guard with
  defaults; a save reload repopulates.

## Testing

- `catParser`: new fields populated; `visualParts` slot mapping. Extend existing
  fixtures. (Offsets already proven on the real save.)
- `catCosmetics`: `colorName` + fallback, `classInfo` lookup + stat hint formatting,
  `notableMutations` returns names for notable ids and nothing for base ids.
- `CatCard` itself untested (matches codebase convention for inline-style components).

## Out of scope (possible follow-ups)

- Full **breeding-by-role** feature from `stat_mods`/`levelup` (only a small hint
  ships here).
- Cat identity cards in **Top breeders** / suggestion rows (breed-next only for now).
- Fur-pattern naming and eye/part colors.
- Any rendered sprite path.

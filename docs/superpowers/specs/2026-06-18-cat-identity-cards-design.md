# Cat face sprites + identity cards in “Breed next”

**Date:** 2026-06-18
**Status:** Design — pending spec review
**Branch:** `feature/breeding-guide` (PR #2)
**Supersedes:** the data-only avatar from the first draft of this spec. The
rights-clean data card (coat color, class, mutations) is **retained as the
fallback** and as the card chrome around the sprite.

## Problem

“Breed next” names two cats but gives no visual help finding them in-game. We
want a **real, in-game-accurate cat face** per cat so the user matches it at a
glance, with the data card as a graceful fallback.

## Decisions (from brainstorming)

- **Architecture B:** bundle offline-converted assets + a browser compositor
  (static-site friendly, lazy-loaded). No backend.
- **Scope:** **face only** (`render_cat_face_thumbnail` equivalent), not full body.
- **Asset format:** **SVG** vector shapes, tinted at runtime from the palette.
- **Fallback:** when a sprite can’t render, show the data-card avatar
  (coat-color circle + class emoji).

## Rights posture (explicit)

This bundles **derived game art** (cat-part shape geometry as SVG) — the
developers’ copyright, reproduced as vector. This is a deliberate,
owner-accepted redistribution decision; it is a weaker fair-use posture than a
reference wiki and is not covered by any license the project holds. Mitigations
the spec assumes: a `NOTICE` crediting Mewgenics / Edmund McMillen & Tyler
Glaiel, a “not affiliated, takedown on request” statement, and keeping assets in
a clearly separable directory so they can be pulled fast. Assembly numbers and
palette RGB values are facts and are not the sensitive part; the **SVG shape
geometry is**.

## How a cat face renders (reference: `swf_cat_renderer.py`, MIT)

`face parts (save T[72]) → per-part shape layers + 2D matrices + depth
(catparts assembly) → fill each layer with a palette colour (by depth/column,
row = cat palette index) → composite in depth order`.

Each shape layer is a flat silhouette; shading comes from stacking depth layers
(shadow/base/highlight), each filled with its palette colour. So in SVG: one
`<path>`/`<g>` per layer, `fill` set from the palette — no rasterisation, no
gradients in the common case.

Face slots (subset of the 16): `fur, head, ear_L, ear_R, eye_L, eye_R,
eyebrow_L, eyebrow_R, mouth`, plus the face-detail overlay (`aface`), in the
upstream face order.

## Offline build pipeline (tooling, not shipped)

Lives in `tools/catsprites/` (scripts + notes; committed for reproducibility,
not bundled into the app). Inputs: the owner’s `resources.gpak` + JPEXS FFDEC.

1. Parse the gpak directory; extract the cat SWF(s), `textures/palette.png`,
   `data/classes/classes.gon`, `data/classes/advanced_classes.gon`.
2. FFDEC: export the **face-slot** `DefineShape`s → individual SVGs.
3. Build `assembly.json`: `{ slot: { partId: [ { shapeId, matrix:[a,b,c,d,tx,ty],
   depth } … ] } }` from the SWF sprite/frame structure (numeric facts; the
   reference’s `catparts.db` frame_objects is the model).
4. Build `palette.json`: `row → { [col]: "#rrggbb" }` from `palette.png`.
5. Emit committed assets:
   - `public/catparts/<shapeId>.svg` — face-subset shape geometry only.
   - `src/data/catAssembly.json`, `src/data/catPalette.json`.
   - `src/data/catCosmetics.ts` tables (below).
6. Document the procedure + a cache-version constant so it can be regenerated on
   game updates.

## Bundled data tables — `catCosmetics.ts` (facts/labels, ships regardless)

Unchanged from the data-card design; used by the sprite tint **and** the fallback:

- `BASE_PALETTE_COLORS: Record<number,{shadow,base,highlight,name}>` — `base` =
  palette col 3; ramp stops from confirmed coat columns or derived from `base`
  (col 1 is the class-tint column, not a coat stop); `name` = our RGB→name.
- `CLASS_INFO: Record<string,{paletteRow,accent,statMods,levelup}>` from
  `classes.gon`/`advanced_classes.gon`.
- `CLASS_GLYPH` — our emoji map (🧙 Mage … 🐾 classless).
- `MUTATION_NAMES` — ported, notable ids only.

## Data model — `catParser.ts`

Add to `ParsedCat` (from the validated `T[72]` walk): `basePalette` (T[1]),
`classPalette` (T[2]), `furPattern` (T[0]), and `visualParts:
Record<slot,number>` (the 16 part ids; head/body already captured). The face
compositor reads `visualParts` + `basePalette`/`classPalette`.

## Runtime compositor

- `catSprite.ts` (pure logic): `buildFaceLayers(cat): Layer[]` where
  `Layer = { shapeId, transform, fill }`. Looks up `assembly[slot][partId]` for
  each face slot, resolves each layer’s `fill` from `catPalette` (row =
  `basePalette`, or `classPalette` for class-tinted slots; column by depth),
  ordered by depth. Returns `null` when any required slot/shape is missing →
  signals fallback. **Pure and unit-testable** (no DOM, no real SVGs).
- `CatFace.tsx`: renders one `<svg viewBox>`; for each layer, lazy-loads
  `public/catparts/<shapeId>.svg` (in-memory `Map` cache + HTTP cache), wraps it
  in `<g transform>` with the layer `fill`. On `null` from `buildFaceLayers` or a
  load error → renders the **fallback avatar** (coat circle + class emoji).
- Lazy-loading keeps the initial payload to compositor + `catAssembly.json` +
  `catPalette.json`; shape SVGs fetch on demand per cat shown.

## Component integration — `CatCard.tsx`

Layout B, as designed. The avatar slot is `<CatFace cat/>` (was the emoji
circle; that circle is now `CatFace`’s fallback). Card body unchanged: name,
`sex · class` + stat hint, `◆ color · 📍 room`, mutation tags. Two `CatCard`s
with `×` in the breed-next hero. `CatAvatar.tsx` removed; `CatSVG` stays for the
mascot.

## Fallbacks / edge cases

- Missing/garbled shape or assembly entry → fallback avatar (per cat, per slot
  failure cascades to whole-face fallback for predictability).
- Unknown palette row → grouping tint + `palette #N` (fallback only).
- Old `localStorage` cats lacking new fields → defaults; reload repopulates.

## Testing

- `catParser`: new fields populated; `visualParts` mapping (fixtures; offsets
  already proven on the 736-cat save).
- `catSprite.buildFaceLayers`: with a small fake `assembly`+`palette`, asserts
  correct ordered layers (shapeId/transform/fill) and `null` on missing slots.
- `catCosmetics`: color name + fallback, class lookup/stat-hint format, notable
  mutation lookup.
- Components (`CatFace`, `CatCard`) not unit-tested (inline-style convention);
  manual visual validation against the real save documented in `tools/catsprites`.

## Risks / unknowns (resolve during the build)

- **FFDEC SVG fidelity** for atypical shapes (any gradients/bitmap fills).
- **Matrix units**: SWF matrices use twips + 16.16 fixed scale
  (`_normalize_matrix_scale` default 65536) — must match in the SVG transforms.
- **Depth→palette-column** mapping and which slots use the class palette
  (port `_get_effective_parts` + tint logic).
- **Face SVG payload size** — measured during build; lazy-load mitigates.
- **Maintenance**: game updates shift shape ids/palette → re-run the pipeline.

## Out of scope (follow-ups)

- Full-body sprite; equipment/accessories; fur-pattern naming.
- Sprites in Top breeders / suggestion rows (breed-next only first).
- The full breeding-by-role feature from `stat_mods` (only a hint ships here).

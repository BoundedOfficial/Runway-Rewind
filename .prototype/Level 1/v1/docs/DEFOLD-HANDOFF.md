# Defold reconstruction reference

Use this playable as the behavior reference for the Defold rebuild. Its current files are self-contained; old APK analysis and obsolete iterations were intentionally removed at the user's request.

## Sequence

1. Extract fourteen individual pimples.
2. Apply cleansing cream to forehead and both cheeks.
3. Wipe away cream, residue and grime, including eye surrounds and neck.
4. Clean both sides of the robe while retaining hanging hair.
5. Shave both eyebrows independently.
6. Apply lip scrub.
7. Remove scrub and hydrate lips.
8. Apply foundation to face and neck.
9. Fill complete eyebrow arches.
10. Reveal the full eye look together: shadow, liner and lashes.
11. Apply blush and contour together.
12. Apply crimson lipstick.
13. Style both sides of the hair, preserving facial expression and exposed clean clothing.

Earlier tiny eye passes, separate residue wiping, concealer and powder steps were deliberately removed for a faster, more visible transformation. Do not restore them merely because old source-role labels mention them.

## Assets and coordinates

Rendering and input use a 640 by 960 logical canvas with top-left origin and downward-positive Y. Full plates are scaled into this space. Each compiled sprite has an `x`, `y`, `width`, `height`, source plate, artwork PNG, mask PNG and sampled coverage cells in `assets/layers/manifest.json`. Convert Y/pivots when importing into an engine with different conventions.

`authoring/layers.json` is the editable source of mask paths, ellipses, rectangles, subtraction/intersection, expansion and feathering. `hitShape` can be smaller than visible artwork: styling uses two compact side-hair targets. Never derive those guides from the artwork bounds. The tool atlas has four rows and four columns; indices in the treatment sequence identify cells. Index 16 uses the separate brush plate.

## Interaction and rendering invariants

Select a tool before applying it. Individual extraction targets complete on a valid press; continuous treatments track strokes through independent sampled cells. Each group completes at 80% coverage. The soft brush has an opaque core at 65% of its radius; completion fades remaining pixels over 320 ms, or 700 ms for styling. Camera transforms must be inverted for input.

Keep a committed canvas plus a reveal mask for each active target. Multiply the target artwork alpha by the reveal mask once. Do not blend the old cover and new target through the same fractional alpha twice. Commit groups after their completion fade. The Defold implementation must reproduce this compositing behavior; select its rendering approach when the rebuild begins.

Removal masks extend beyond applied cream/scrub edges; otherwise feathering leaves pale outlines. Broad makeup layers use hair-down source plates to avoid importing the updo's background and hairline. Preserve full brows, including tails. Styling must not replace the face, change the expression or clean the already-visible robe. It may expose clean fabric previously hidden by loose hair.

Replay restores the original dirty state. The final comparison slider shows the starting portrait over the accumulated result. The prototype is silent and has no persistence, backend or analytics.

## Validation

Run `npm test` before and after porting logic. It drives real pointer/touch input and saves captures for each significant phase. Visually compare partial cleansing, one shaved eyebrow, combined eye makeup, robe cleanup, partial styling and the final result. Numerical completion alone does not establish visual correctness.

Independent agent playtests previously caught eyebrow-tail mixing, held facial crossfades, leftover hair over the robe and oversized styling guides. These were fixed in the retained version. Raster halfway styling still shows a mixture of loose and styled hair; a physical hair animation is outside this prototype's scope.

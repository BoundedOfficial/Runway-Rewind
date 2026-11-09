# Level 1 / v1 — Camellia Studio

The final silent, 13-treatment browser prototype, retained as a reference for the Defold rebuild. Open `index.html` directly in Chrome. No build or game engine is required to play.

## Contents

- `src/`: complete browser runtime, styles and generated sprite wrapper.
- `assets/plates/`: eleven retained original images, including the brush.
- `assets/layers/`: 38 active artwork sprites, 38 alpha masks and registration manifest.
- `assets/tools.png`: original 4-by-4 tool atlas.
- `assets/gallery.html`: artwork and mask inspection.
- `authoring/layers.json`: editable shapes, feathering, source images and hit regions.
- `authoring/prompts.json`: available generation prompts.
- `scripts/serve.cjs`: optional local server for this version.
- `tests/`: existing browser playthrough and input/gallery checks.
- `docs/DEFOLD-HANDOFF.md`: sequence, rendering requirements and visual invariants.

## Existing preview and tests

From this directory, `npm start` serves the playable at http://localhost:5173. Install test dependencies with `npm install`, then run `npm test` to play all thirteen treatments and check touch, keyboard, comparison, replay and artwork loading. Tests use installed Chrome; `CHROME_PATH` overrides its location and `PLAYWRIGHT_MODULE` optionally selects an existing playwright-core installation.

Tests write disposable captures into `test-results/`, ignored by Git. Keep this version self-contained; future revisions should use a new version folder.

## Rebuild the layers

The reusable compiler and gallery generator live in `../../../tools/layers`, with installation and invocation instructions in its README. From the repository root:

```powershell
node tools/layers/build-layers.cjs ".prototype/Level 1/v1"
python tools/layers/gallery.py ".prototype/Level 1/v1"
```

They update generated outputs in the explicitly selected version. Original source images and authoring definitions stay here. There is no shared browser framework, root command suite or Defold import pipeline at this stage.

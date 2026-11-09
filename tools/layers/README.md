# Layer tools

These two scripts process a selected prototype version. They contain no game runtime. Source artwork and authoring definitions belong to the level version, not this directory.

Install the compiler dependency once with `npm install --prefix tools/layers` from the repository root. The compiler uses installed Chrome (`CHROME_PATH` overrides the executable). `PLAYWRIGHT_MODULE` can select an existing playwright-core installation. Gallery generation uses Python 3's standard library.

From the repository root:

```powershell
node tools/layers/build-layers.cjs ".prototype/Level 1/v1"
python tools/layers/gallery.py ".prototype/Level 1/v1"
```

Both commands accept an absolute directory or one relative to the current working directory. Quote paths containing spaces. They do not automatically select or update any other version.

The compiler reads `authoring/layers.json` and `assets/plates/`. It writes artwork/mask PNGs and `manifest.json` into `assets/layers/`, plus the browser wrapper `src/sprites.js`. Its current format uses the prototype's 640 by 960 logical canvas. Source PNGs and authoring definitions are not modified. Run only against a version you intend to rebuild; existing generated outputs are overwritten, and obsolete files are not automatically deleted.

The gallery reads the compiled manifest and source plates, then writes `assets/gallery.html` and `assets/layer-map.csv`. Run it after compiling. The selected version supplies the provenance and generation prompts linked from the gallery.

These tools retain their existing behavior and languages. Add Defold-specific processing only when the reconstruction requires it.

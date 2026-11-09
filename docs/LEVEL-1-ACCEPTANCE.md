# Level 1 acceptance

Level 1 was accepted by the user on 2026-11-09 after the visual and interaction revisions. Final local checks passed the seven skincare treatments, five makeup treatments, and hair/final reveal with mouse and simulated touch. All thirteen tools were checked at 390 � 844, held and at rest.

After prototype removal, the debug build and default release packager passed. The distribution ZIP was checked for automatic platform detection, absence of development controls/direct YouTube loader, and error-free rendering in Chrome.

The records below describe earlier compatibility builds, not the final distribution artifact. Those temporary ZIPs were removed during completion cleanup. Reproduce them with `package-html5.ps1 -CompatibilityTargets`; the default packager now produces one auto-detected Playgama distribution ZIP.

## Historical compatibility acceptance

Verified locally on 2026-11-09 using Windows x64 build 26200, PowerShell 7.6.9,
Node.js 24.16.0, and headless Chrome 156.0.8078.81. The packages were built
on the same Windows host with Defold Bob 1.14.0 and Temurin 25.0.2+10, using
the shipped Wasm engine and bundled Playgama Bridge 2.4.1 with the checked
compatibility patch.

## Artifacts

The two ZIPs and `package-manifest.json` are in `.scratch/releases/`. Both
were built from the clean source revision
`b35bc63c3d2c0fae33b182114346387e14e29017`. The release check verified the
ZIP hashes and matched the files served from the extracted directories to
the manifest. Both targets have the same engine and game archive hashes.

| Target | ZIP | ZIP bytes | Unpacked bytes | Largest file | Files |
| --- | --- | ---: | ---: | ---: | ---: |
| YouTube Playables | `runway-rewind-youtube.zip` | 10,860,300 | 14,060,421 | 2,889,375 B | 20 |
| Playgama | `runway-rewind-playgama.zip` | 10,860,272 | 14,060,360 | 2,889,375 B | 20 |

- YouTube SHA-256 `9acb3527f9b2644455958ee23e6300e95a6fcea5a857aaee0cbfdbc01dfa9909`
- Playgama SHA-256 `2970f5f874ef11782446c5a81a7d77e4dcdebbdae6e1d26e99dcf76ac844c131`

## Verified behavior

- A fresh run reached all thirteen treatments with mouse on YouTube and
  simulated touch on Playgama. Both saved one milestone per treatment in order.
  Visible results checked extraction, cleansing cream, face and neck wipe,
  robe cleanup, eyebrow shaving, lip scrub, scrub removal and hydration,
  foundation, brow fill, combined eye makeup, blush and contour, crimson
  lipstick, and both sides of hair styling.
- The release runs checked off-target movement, fourteen individually treated
  pimples, single-pointer ownership, independent region completion, visible
  work after releasing the tool, fast continuous coverage, and the end of a
  held stroke at a tool handoff. The cream and eye-brush captures show the
  working tip over the stroke, including in the eye close-up. Strokes completed
  treatments without tracing every pixel.
- Inspected partial cream and wiping, cleaned robe, one shaved eyebrow,
  combined eyes, partial hair, and finished portrait captures. The cheek
  stroke has a soft edge, and the wipe and hydration checks sample the authored
  clean colors at former product edges. Robe cleanup preserves the hanging
  hair. Hair styling preserves the eyes, lips, expression, and already-visible
  clean silk. The halfway hairstyle shows the layered reveal with a visible
  separation between loose and styled hair.
- Focused release checks covered the portrait progress strip, first-use and
  idle guidance at 390 × 844, landscape at 960 × 540, and square at 640 × 640.
  Captured the extractor entering from the right, at rest, and exiting before
  the spatula arrived. The portrait kept its proportions, the backdrop extended across wider
  screens, and the tool remained reachable. The release captures showed one
  tool, a short label, and a compact progress strip during treatment.
- YouTube host pause froze drawing with the spatula held. Resuming preserved
  the exact cheek stroke and canceled stale movement. Reload restored
  extraction and reset the unfinished cream. A completed reload restored the
  portrait pixel-for-pixel, with small antialiasing differences in the action
  text. The tool and treatment indicators cleared before Replay and Next
  appeared. Next opened **More makeovers coming soon**, and both the direct
  and end-of-content Replay routes restored the dirty portrait. On Playgama,
  Replay during a pending completion save persisted the reset after that
  write settled, and reload opened the fresh run.
- Both package smoke checks exercised the actual bundled Bridge with
  simulated platform SDKs. They checked readiness and resource loads,
  pause and resume, failed-load protection, paused write deferral, failed-save
  recovery, and reload. The only external request URL per build was the
  corresponding SDK URL, intercepted by the test. Local startup transfer was
  14,297,213 B on YouTube and 14,297,152 B on Playgama. Browser and resource
  error checks passed. Release configuration disables debug and analytics.
  The ZIPs exclude development controls and fixture files. The release stage
  has no comparison slider, score screen, timer, failure screen, or permanent
  tool tray.

The final review found no spec discrepancies. After extracting the shared
mouse and touch driver, the focused makeup, finish, and presentation checks
passed against the existing debug bundles. Both release ZIP hashes still
match the values above.

## Reproduce the checks

See [Defold setup, preview, pinned dependencies, and packaging](../game/README.md)
for the host toolchain and extraction commands. The build imports the checked-in
prototype plates, treatment layers, and tool sprites using the
[artwork preparation script](../game/scripts/prepare-artwork.ps1) and the
[artwork recipes](../game/assets/recipes). The
[layer tools](../tools/layers/README.md) describe regenerating the prototype
layers from the versioned plates and authoring definitions.

After extracting both ZIPs as `.scratch/releases/youtube` and
`.scratch/releases/playgama`, run from the repository root.

```powershell
npm ci --prefix game/tests
$env:STAGE_EVIDENCE_DIR = "$PWD/.scratch/acceptance"
node game/tests/acceptance.cjs .scratch/releases
$env:PACKAGE_EVIDENCE_FILE = "$env:STAGE_EVIDENCE_DIR/package-smoke.json"
node game/tests/packages.cjs .scratch/releases/youtube .scratch/releases/playgama
```

The acceptance runner also accepts `mouse`, `touch`, or `presentation`
after the release directory for a narrower rerun. Use the same host
executable with `CHROME_PATH` if Chrome is installed elsewhere.

The evidence directory contains `acceptance.json`, `acceptance-presentation.json`,
`package-smoke.json`, and the package manifest. It includes `extractor-arriving.png`
and `extractor-exiting.png` from the focused tool motion check.
For visual review, see `mouse-cream-held.png`, `mouse-wipe-committed.png`,
`mouse-robe-committed.png`, `mouse-one-eyebrow-shaved.png`,
`mouse-combined-left-eye.png`, `touch-partial-left-hair.png`,
`mouse-finished-portrait-hold.png`, `mouse-completed-after-reload.png`,
and `touch-replay-reset-after-reload.png`. Corresponding treatment captures
are available for both input modes.

## Limits

Startup transfer is measured over local HTTP through readiness with
simulated SDK responses. The smoke report samples JavaScript heap at
readiness. That sample excludes peak process, Wasm and GPU memory and
cannot establish live-platform startup performance. Local verification used
a real Chrome mouse path and CDP-simulated touch, with the host SDK and
storage callbacks simulated at the network boundary. No physical device,
live platform SDK, platform publication, certification, or off-host build
was used. Level 1 is ad-free under the approved scope. Playgama's
interstitial requirement remains a publication limitation. See the platform
requirements linked from the [packaging notes](../game/README.md#platform-packages).

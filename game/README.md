# Defold game

A fresh Level 1 run opens on the dirty portrait. **Start makeover** introduces the extractor. Pick it up and guide its tip over each of the fourteen pimples. The next tools arrive in order for cleansing cream, face and neck wiping, robe cleanup, eyebrow shaving, lip scrub, and hydration. Foundation, brow fill, eye makeup, blush and contour, crimson lipstick, and hair styling complete the makeover. After the finished portrait reveal, **Replay** returns to the dirty portrait and **Next** opens the end-of-content screen.

## Windows host setup

Use PowerShell 7, Node.js 24 and Chrome. Run from the repository root:

```powershell
./game/scripts/setup-toolchain.ps1
./game/scripts/build-html5.ps1
node game/scripts/serve.cjs
```

Open [the local preview](http://127.0.0.1:5174/). The bundle is in `.scratch/html5/Runway Rewind`. Use `-BundleOutput` to choose a different bundle parent directory and `-Variant release` for a release-mode preview. Pass the bundle directory as the first argument to `serve.cjs` when serving a non-default build. In a linked worktree, both PowerShell scripts accept `-Toolchain <path>` for reuse of the main checkout's `.scratch/toolchain`.

The setup script verifies the SHA-256 of each upstream download before use.

| Dependency | Pin | Role |
| --- | --- | --- |
| [Defold Bob](https://github.com/defold/defold/releases/tag/1.14.0) | 1.14.0, engine revision `d295ed4` | Host compiler and bundled stock Wasm engine |
| [Eclipse Temurin](https://github.com/adoptium/temurin25-binaries/releases/tag/jdk-25.0.2%2B10) | JDK 25.0.2+10, Windows x64 | Java runtime for Bob |
| [Playgama Bridge](https://github.com/Playgama/bridge/releases/tag/v2.4.1) | 2.4.1 | JavaScript SDK served with the game |
| [Playwright Core](https://www.npmjs.com/package/playwright-core/v/1.58.2) and [PNGJS](https://www.npmjs.com/package/pngjs/v/7.0.0) | 1.58.2 and 7.0.0 | Host-only Chrome smoke check |

The build imports the starting portrait, authored layers, and tool sprites from `.prototype/Level 1/v1/assets/` and stages the checked Bridge download as a bundle resource. Artwork recipes in `game/assets/recipes/` select authored region IDs or wildcard patterns and map tool names to cells of the 4-by-4 tool sheet or to standalone images. The build generates Defold atlases and imports the original hit cells in `game/assets/generated/`. Open `game/game.project` in the matching Defold editor after preparing the artwork with the build script.

## Build audit

The project has no Defold libraries, native extensions, or custom app manifests. The build script checks for them and pins Bob's build-server endpoint to unused loopback. Bob compiles game resources locally and bundles its shipped `wasm-web` engine. Its Java HTTP client requires access to a local loopback socket, even for the stock engine build. Setup downloads upstream binaries and JavaScript once. Building and serving the bundle use the host.

The HTML5 shell paints its loading state, initializes the pinned Bridge, then loads the Defold archive and engine. Once Defold has drawn the interactive stage, `platform.stage_ready()` sends Bridge `GAME_READY` once. The JavaScript adapter uses Bridge pause and audio events, including its standalone focus handling. It suspends the Defold frame loop while paused, leaving browser event handlers available to resume. The stage cancels the previous drag and discards the first resumed tick before taking new input. Development builds show Pause/Resume and Restart makeover. Confirming restart returns to the dirty portrait and Start prompt.

The SDK is delivered as a separate, unmodified JavaScript file. See the included [third-party notice](web/wasm-web/licenses/Playgama-Bridge-NOTICE.txt) for its source and license.

## Focused HTML5 check

```powershell
npm ci --prefix game/tests
npm test --prefix game/tests
```

Set `CHROME_PATH` to use a different Chrome executable. Set `STAGE_EVIDENCE_DIR` to save canvas PNGs from startup, tool use, and partial and settled skincare. Pass an alternate bundle directory to the check using `npm test --prefix game/tests -- "<bundle directory>"`.

Run `node game/tests/presentation.cjs "<debug bundle directory>"` to check the
treatment label and progress, first-use drag guidance, and idle hints. The check
uses mouse and simulated touch with focused portrait, landscape, and square
viewports. Set `STAGE_EVIDENCE_DIR` to capture screenshots.

Run `npm run test:lifecycle --prefix game/tests` for the focused pause check. To check a release build, pass its bundle directory followed by `--release`. The check verifies the frozen frame and suspended WebGL drawing during tool arrival, partial cream retention with mouse and simulated touch, and development control visibility.

Run `npm run test:persistence --prefix game/tests -- "<bundle directory>"` on a preview built without a fixture. The check exercises standalone local storage and controlled Bridge responses, including a rejected read, a slow first read, a rejected write, and Replay while a completion save is pending. It checks the visible result after reload. Set `STAGE_EVIDENCE_DIR` to capture the restored stage and portrait.

On 2026-11-09 the Windows host built the Wasm preview with Bob 1.14.0. Chrome 156.0.8078.81 over loopback verified the portrait, Start prompt, `GAME_READY`, same-origin requests, and the seven skincare treatments with mouse input and simulated touch. The check covers an unheld portrait tap, a fast continuous stroke, release and return, automatic handoff with a held pointer, individual pimples, independent robe and eyebrow regions, and loose hair across cleaned fabric. Pixel checks compare feathered cream and lip scrub edges with the authored clean result. Bob returned success with a Windows temporary-directory cleanup warning.

## Saved makeovers

Level 1 stores a versioned record at `runway-rewind.level-1` with the level ID, number of completed treatments, and completion state. The runner rebuilds the portrait from that boundary. A returning player resumes at the next treatment or sees the finished portrait with Replay and Next. Partial strokes start over on reload. Replay and confirmed development restart both save a fresh run.

The stage waits up to 1.5 seconds for its initial read. A failed or slow read leaves the current visit playable and holds writes until the previous record is known. Recovery preserves the active portrait and any higher saved progress. Replay explicitly replaces known progress. An unsupported record stays intact. Reads and writes retry after failures, and the newest pending milestone waits for any earlier write to finish.

Standalone previews use browser local storage for the current origin. Release targets use Bridge storage. For these targets, `storage.get(key, false)` must return a raw record string or `null` after a successful cloud read. The compatibility layer must propagate unavailable storage and rejected reads and writes. In Bridge 2.4.1, `StorageModule` otherwise catches cloud errors and falls back to local data, including reading an empty key or reporting a local write as successful. Its cloud read can also migrate local values into the cloud. YouTube's adapter additionally treats malformed `loadData()` JSON as empty. Release checks must drive both adapters through the actual bundled Bridge with rejected reads and writes and verify that local fallback does not authorize an overwrite or swallow a failed write. The focused preview check controls Bridge responses directly.

## Portrait and treatment interfaces

### Makeup fixture

For a focused makeup check, build with `-Fixture makeup`. Start makeover in
that debug bundle reconstructs completed skincare and introduces the foundation
sponge. This fixture is selected at build time and the build script rejects it
in release builds.

```powershell
./game/scripts/build-html5.ps1 -Fixture makeup -BundleOutput .scratch/makeup
node game/tests/makeup.cjs ".scratch/makeup/Runway Rewind"
```

The check exercises foundation, full brow arches, the combined eye look, blush
and contour, and crimson lipstick with mouse and simulated touch. Set
`STAGE_EVIDENCE_DIR` to capture the makeup stages.

### Finish fixture

The debug finish fixture starts at hair styling with the first twelve
treatments completed. It checks the independent compact styling targets,
preservation of the eyes, lips, and clean robe, and the finished portrait hold.
Mouse input follows Next through the end-of-content screen to Replay.
Simulated touch selects Replay from the finished portrait. Both routes
restore the dirty portrait and allow the first pimple to be treated again.
Set `STAGE_EVIDENCE_DIR` to capture the partial and finished portrait and
end-of-content screen.

```powershell
./game/scripts/build-html5.ps1 -Fixture finish -BundleOutput .scratch/finish
node game/tests/finish.cjs ".scratch/finish/Runway Rewind"
```

### Runner and renderer

`treatments/runner.lua` consumes the ordered definitions in `treatments/level_one.lua`. Each continuous treatment supplies an ID, ordered authored region IDs, brush radius, and tool artwork with its tip anchor. Extraction supplies `target_radius` instead of a brush radius and settles the nearest authored target under the held tip. The runner handles input and timing and reports the committed treatment ID once through the stage's `treatment_completed` message. The stage suspends runner updates during pause and calls `runner.cancel` to break a held stroke. Starting at a later treatment reconstructs the portrait from the preceding treatment definitions and restores temporary products before their removal treatment. Replay and development restart share the stage reset path, which emits `makeover_reset`.

An optional `camera` on a treatment sets the scale and center in the artwork's
top-left coordinates. Framing eases during tool arrival. The runner maps the
tool's stage-space tip back to portrait space for treatment coverage.
The first extraction demonstrates a drag from the tool to a target. After a
stall, the runner briefly marks the first unfinished region using an untouched
sample or pimple anchor in the current framing. New coverage clears the hint
and restarts its idle delay.

`portrait/portrait.render_script` uses a 640-by-960 committed target and cropped reveal targets. Each eligible pointer segment draws an analytic soft brush into the corresponding target. Independent sampled hit cells govern completion, and the remaining region fades in smoothly. The renderer multiplies the already feathered atlas artwork by reveal coverage once and composites it with premultiplied blending. For temporary products such as cream, it retains the pre-product portrait and builds the wipe result on that surface. The wipe reveals the clean result under the brush, and the committed surface switches to it after all regions settle.

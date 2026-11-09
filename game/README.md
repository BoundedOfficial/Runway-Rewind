# Defold game

A fresh Level 1 run opens on the dirty portrait. **Start makeover** introduces the extractor. Pick it up and guide its tip to each of the fourteen pimples. Keep holding while the extractor presses and lifts, then move to the next pimple. The next tools arrive in order for cleansing cream, face and neck wiping, robe cleanup, eyebrow shaving, lip scrub, and hydration. Foundation, brow fill, eye makeup, blush and contour, crimson lipstick, and hair styling complete the makeover. After the finished portrait reveal, **Replay** returns to the dirty portrait and **Next** opens the end-of-content screen.

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

The standalone preview uses the unmodified SDK. The target archives bundle a separate copy of Bridge 2.4.1 with the compatibility changes in [patch-bridge.cjs](scripts/patch-bridge.cjs). The script checks the upstream hash and each patch anchor. The archives include the patch source and [third-party notices](web/wasm-web/licenses/Playgama-Bridge-NOTICE.txt).

## Platform packages

**Release workflow correction:** delivery goes through Playgama, including distribution to YouTube. The separate platform-forced ZIPs described below are compatibility-test artifacts from the earlier implementation, not two required publishing handoffs. A distribution handoff must let Bridge select the host platform rather than force either adapter. The existing packaging script still generates those test artifacts.

Run from the checkout you intend to package. Setup is shared with the preview.
In a linked worktree, supply the main checkout's `.scratch/toolchain` to
`-Toolchain` and its `.scratch/releases` to `-ReleaseOutput` to keep the
archives after worktree cleanup.

```powershell
./game/scripts/package-html5.ps1
npm ci --prefix game/tests
Expand-Archive .scratch/releases/runway-rewind-youtube.zip .scratch/releases/youtube -Force
Expand-Archive .scratch/releases/runway-rewind-playgama.zip .scratch/releases/playgama -Force
$env:PACKAGE_EVIDENCE_FILE = "$PWD/.scratch/releases/package-smoke.json"
node game/tests/packages.cjs .scratch/releases/youtube .scratch/releases/playgama
```

The packager builds release mode once, then stages two ZIPs with `index.html`
at the root. Both ship identical engine and game files. The target configs
choose the appropriate Bridge adapter and disable analytics and remote
configuration. Release mode excludes fixture settings, and the ZIPs omit
the development controls script. `package-manifest.json` records the source
revision, worktree state, toolchain and Bridge hashes, per-file hashes, and ZIP
hashes and sizes.

| Target | Startup dependencies | Package budgets |
| --- | --- | --- |
| YouTube Playables | The required YouTube SDK loads before game code. Bridge, engine, and game resources come from the ZIP. Bridge uses SDK callbacks for pause, resume, and audio. | Initial transfer below 30 MiB, every file below 30 MiB, total below 250 MiB, up to 8,000 files. Recommended initial transfer below 15 MiB. Saves at most 3 MiB. |
| Playgama | Bridge loads the platform's `platform-sdk/v1.js`. Game resources and Bridge come from the ZIP. | Game files at most 300 MB, Latin filenames, startup memory below 2 GB. |

The YouTube loader paints a loading frame before Bridge calls
`firstFrameReady`. Both builds send `gameReady` after the stage draws and
the initial restore succeeds or reaches the playable failure path. The engine
and archive loaders defer new requests during a pause. Release storage uses
cloud reads and writes through Bridge. The compatibility patch propagates
unavailable storage, rejected operations, and malformed cloud records, and
prevents browser fallback and migration. It also defers retries when a pause
interrupts a pending write.

The smoke check serves the extracted ZIPs on the Windows host and intercepts
each platform SDK at its documented URL. It exercises the actual bundled
Bridge with simulated host callbacks and storage responses. It checks the
rendered stage, readiness, request origins, browser and resource errors,
pause and resume, rejected and malformed reads, and write recovery after
reload. The JSON report gives uncompressed local transfer through readiness
and a sampled ready-state JS heap. These are local measurements. The
simulation excludes live SDK transfer, platform-side requests, peak memory,
device testing, and certification.

The approved Level 1 scope excludes ads. Playgama's current required-steps
guide calls for interstitial ads, which remains a publication requirement
outside this delivery.

Requirements checked on 2026-11-09. [YouTube setup](https://developers.google.com/youtube/gaming/playables/reference/getting_started) ·
[YouTube integration](https://developers.google.com/youtube/gaming/playables/certification/requirements_integration) ·
[YouTube stability](https://developers.google.com/youtube/gaming/playables/certification/requirements_stability) ·
[YouTube privacy](https://developers.google.com/youtube/gaming/playables/certification/requirements_privacydata) ·
[Playgama technical requirements](https://wiki.playgama.com/playgama/game-requirements/technical-requirements) ·
[Playgama required steps](https://wiki.playgama.com/playgama/bridge-sdk/api) ·
[Bridge releases](https://github.com/Playgama/bridge/releases).

## Focused HTML5 check

```powershell
npm ci --prefix game/tests
npm test --prefix game/tests
```

Set `CHROME_PATH` to use a different Chrome executable. Set `STAGE_EVIDENCE_DIR` to save canvas PNGs from startup, tool use, and partial and settled skincare. Pass an alternate bundle directory to the check using `npm test --prefix game/tests -- "<bundle directory>"`.

Run `npm run test:extraction --prefix game/tests` to check the approach, press, and lift with mouse and simulated touch. The check also covers quick swipes, early release, and platform pauses. Set `STAGE_EVIDENCE_DIR` to capture the phases.

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
treatments completed. It checks brushing the loose hair and crown, progress
on each side, preservation of the eyes, lips, and clean robe, and the
finished portrait hold.
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

`treatments/runner.lua` consumes the ordered definitions in `treatments/level_one.lua`. Each continuous treatment supplies an ID, ordered authored region IDs, brush radius, and tool artwork with its tip anchor. Extraction supplies `target_radius` and `extraction_time` for the approach, press, and lift. It locks onto one authored target until the extractor lifts. The pimple starts clearing and its dashed guide disappears when the press lands. Releasing or pausing before the press lands cancels the attempt. The runner handles input and timing and reports the committed treatment ID once through the stage's `treatment_completed` message. The stage suspends runner updates during pause and calls `runner.cancel` to break a held stroke. Starting at a later treatment reconstructs the portrait from the preceding treatment definitions and restores temporary products before their removal treatment. Replay and development restart share the stage reset path, which emits `makeover_reset`.

An optional `camera` on a treatment sets the scale and center in the artwork's
top-left coordinates. Framing eases during tool arrival. The runner maps the
tool's stage-space tip back to portrait space for treatment coverage.
Unfinished regions use the prototype's thin, warm-yellow dashed markers,
with small sparkles on non-anchor regions. All targets remain visible at their
authored positions until individually completed, including under eye/lip
framing. Picking up the tool emphasizes the markers and shows its working
radius; releasing hides that cursor without hiding the remaining targets.

Hair styling counts brush travel over the loose hair on each side. Each side
gradually fades into its styled artwork and settles after a few strokes.

`portrait/portrait.render_script` uses a 640-by-960 committed target and cropped reveal targets. For local reveals, each eligible pointer segment draws an analytic soft brush into the corresponding target. Independent sampled hit cells govern completion, and the remaining region fades in smoothly. The renderer multiplies the already feathered atlas artwork by reveal coverage once and composites it with premultiplied blending. For temporary products such as cream, it retains the pre-product portrait and builds the wipe result on that surface. The wipe reveals the clean result under the brush, and the committed surface switches to it after all regions settle.

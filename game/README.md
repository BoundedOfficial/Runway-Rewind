# Defold game

The game starts on the dirty Level 1 portrait. In this focused cleansing preview, **Start makeover** settles the preceding pimple extraction treatment and introduces the cream spatula. Pick up the spatula to treat the forehead and both cheeks. The cotton wipe then arrives automatically to clean the face and neck.

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

The build imports the starting portrait, authored layers, and tool sprites from `.prototype/Level 1/v1/assets/` and stages the checked Bridge download as a bundle resource. Artwork recipes in `game/assets/recipes/` select authored region IDs or wildcard patterns and map tool names to cells of the 4-by-4 tool sheet. The build generates Defold atlases and imports the original hit cells in `game/assets/generated/`. Open `game/game.project` in the matching Defold editor after preparing the artwork with the build script.

## Build audit

The project has no Defold libraries, native extensions, or custom app manifests. The build script checks for them and pins Bob's build-server endpoint to unused loopback. Bob compiles game resources locally and bundles its shipped `wasm-web` engine. Its Java HTTP client requires access to a local loopback socket, even for the stock engine build. Setup downloads upstream binaries and JavaScript once. Building and serving the bundle use the host.

The HTML5 shell paints its loading state, initializes the pinned Bridge, then loads the Defold archive and engine. Once Defold has drawn the interactive stage, `platform.stage_ready()` sends Bridge `GAME_READY` once. The Lua platform module reads pause and audio flags through the JavaScript adapter. That same adapter owns async storage reads and writes via Bridge. Save restoration, in-game pausing, and platform-specific configuration belong to the later gameplay and packaging work.

The SDK is delivered as a separate, unmodified JavaScript file. See the included [third-party notice](web/wasm-web/licenses/Playgama-Bridge-NOTICE.txt) for its source and license.

## Focused HTML5 check

```powershell
npm ci --prefix game/tests
npm test --prefix game/tests
```

Set `CHROME_PATH` to use a different Chrome executable. Set `STAGE_EVIDENCE_DIR` to save canvas PNGs from startup, tool use, partial and settled coverage, and the final committed wipe. Pass an alternate bundle directory to the check using `npm test --prefix game/tests -- "<bundle directory>"`.

On 2026-11-09 the Windows host built the Wasm preview with Bob 1.14.0. Chrome 156.0.8078.81 over loopback verified the portrait, Start prompt, `GAME_READY`, same-origin requests, and the focused cleansing sequence with mouse input and simulated touch. The check covers an unheld portrait tap, a fast continuous stroke, release and return, independent coverage, automatic handoff with a held pointer, and wiping the face and neck. Three pixel checks use the authored clean result around the feathered lip opening to catch residual cream. Bob returned success with a Windows temporary-directory cleanup warning. The browser check exercises this focused entry on the host.

## Portrait and treatment interfaces

`treatments/runner.lua` consumes ordered treatment definitions. Each continuous treatment supplies an ID, ordered authored region IDs, brush radius, and tool artwork with its tip anchor. The runner handles input and timing and reports the committed treatment ID once through the stage's `treatment_completed` message. The stage suspends runner updates during pause and calls `runner.cancel` to break a held stroke. The runner accepts completed artwork IDs when rebuilding the starting portrait, with optional separate transient artwork IDs when resuming at the matching removal treatment.

`portrait/portrait.render_script` uses a 640-by-960 committed target and cropped reveal targets. Each eligible pointer segment draws an analytic soft brush into the corresponding target. Independent sampled hit cells govern completion, and the remaining region fades in smoothly. The renderer multiplies the already feathered atlas artwork by reveal coverage once and composites it with premultiplied blending. For temporary products such as cream, it retains the pre-product portrait and builds the wipe result on that surface. The wipe reveals the clean result under the brush, and the committed surface switches to it after all regions settle.

# Defold game

The game starts on the Level 1 portrait. Select **Start makeover** to dismiss the prompt and begin. The scene emits the `makeover_started` message for the treatment runner. This startup milestone contains the initial portrait and Start interaction.

## Windows host setup

Use PowerShell, Node.js 24 and Chrome. Run from the repository root:

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

The build copies the starting portrait from `.prototype/Level 1/v1/assets/plates/00-dirty.png` and stages the checked Bridge download as a bundle resource. Defold project files live under `game/`. Open `game/game.project` in the matching Defold editor after preparing the artwork with the build script.

## Build audit

The project has no Defold libraries, native extensions, or custom app manifests. The build script checks for them and pins Bob's build-server endpoint to unused loopback. Bob compiles game resources locally and bundles its shipped `wasm-web` engine. Its Java HTTP client requires access to a local loopback socket, even for the stock engine build. Setup downloads upstream binaries and JavaScript once. Building and serving the bundle use the host.

The HTML5 shell paints its loading state, initializes the pinned Bridge, then loads the Defold archive and engine. Once Defold has drawn the interactive stage, `platform.stage_ready()` sends Bridge `GAME_READY` once. The Lua platform module reads pause and audio flags through the JavaScript adapter. That same adapter owns async storage reads and writes via Bridge. Save restoration, in-game pausing, and platform-specific configuration belong to the later gameplay and packaging work.

The SDK is delivered as a separate, unmodified JavaScript file. See the included [third-party notice](web/wasm-web/licenses/Playgama-Bridge-NOTICE.txt) for its source and license.

## Startup check

```powershell
npm ci --prefix game/tests
npm test --prefix game/tests
```

Set `CHROME_PATH` to use a different Chrome executable. Set `STAGE_EVIDENCE_DIR` to save before/after canvas PNGs. Pass an alternate bundle directory to the check using `npm test --prefix game/tests -- "<bundle directory>"`.

On 2026-11-09 the Windows host built the debug and release-mode Wasm previews with Bob 1.14.0. Chrome 156.0.8078.81 loaded both over loopback HTTP, displayed the portrait and Start prompt, received `GAME_READY`, and dismissed the prompt through mouse input and simulated touch. The check confirmed that the portrait remained visible, the browser and HTTP error checks passed, and all preview resource requests were same-origin. Bob returned success with a Windows temporary-directory cleanup warning. This is standalone Chrome evidence. The two platform packages, device testing and certification are outside this startup milestone.

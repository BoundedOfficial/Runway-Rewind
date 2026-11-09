# Reference game experience: asset investigation incomplete

Date: 2026-11-09. Target: `Skincare+Time_+Makeover+ASMR_0.9.6_APKPure.xapk`.

REA's artifact workflow is available and successfully inventoried the supplied package. The initial investigation stopped prematurely after archive inventory: it did not extract the main APK and attempt Unity serialized asset decoding. Missing native/runtime providers establish limits on those analysis routes, not that scenes, animation data, or serialized configuration cannot be recovered. Asset investigation is being resumed. No target code was executed, providers installed, or reference assets copied into the project during the initial pass. This is an identity/capability report, not a completed gameplay analysis.

## Observed evidence

- XAPK SHA-256: `84cb163bbbe185f8ffc8a9cb22b4f38fb7f776e98e749fd9ce455cdfed16a0cd`.
- REA extraction Evidence `ev_137864fbe73ac49da92d0e1a729a854887caa34a4f53d5f8fed77826874f617d` identifies the main APK, `config.armeabi_v7a.apk`, `manifest.json`, and `icon.png`; extraction verified containment and found no integrity contradictions.
- The extracted XAPK `manifest.json` declares package `com.fc.p.gp.skincare.makeup.makeover.asmr.game`, name `Skincare Time`, version `0.9.6`, version code `114`, minimum SDK `24`, and split `config.armeabi_v7a`. These are distributor manifest declarations, not independently decoded Android manifest facts. Manifest SHA-256: `9c26c6f88126ab120ba671aa72b61a6418be5ef39873198e3d7885ac53db8e44`.
- Main APK SHA-256: `a75eb097660c6aa1db3514472f9e446e7311c33bffa2d10849e81ff9ba0aa188`. Inventory Evidence `ev_a99ba21310cd03e032d09c3fe7fcda9d34de9d93ed15238402e90aa4cdc68a3e`, manifest `agm_1e670c33992597241be07431462bc3ea30e5a3ed4ce2ec49aaefedeb23a0a6a4`, covers central-directory entries (3,436 contained files plus root). It does not decode application behavior.
- Exact contained anchors: `assets/bin/Data/Managed/Metadata/global-metadata.dat` (14,488,204 bytes, artifact `art_52f0c83c6acef62f60596f736d2a9e85f4c0772a8a2a40b1a144bdc331f0dfab`), `assets/bin/Data/globalgamemanagers` (396,564 bytes), `assets/bin/Data/boot.config` (219 bytes), and `assets/bin/Data/globalgamemanagers.assets.split0` through `split4`.

**Inference:** these paths strongly indicate a Unity IL2CPP game. Their presence does not prove rendered layout, interaction rules, animation timings, or stage ordering. Metadata names alone would not resolve those questions.

## Requested questions

| Question | Status | Missing evidence |
| --- | --- | --- |
| Onboarding and start flow | Unresolved | Executed flow or recovered gameplay control flow |
| Portrait stage versus webpage shell | Unresolved | Rendered screens and decoded scene/camera configuration |
| Sequential offscreen tool arrivals, positions, easing and timing | Unresolved | Animation/configuration values tied to active gameplay, or measured runtime capture |
| Pickup, use, release and exit | Unresolved | Input/state handlers or controlled interaction observation |
| Drag versus tap and valid targets | Unresolved | Hit-testing/input logic or controlled interaction observation |
| Progress/completion and automatic versus manual next | Unresolved | Completion-to-next-stage transition evidence |
| Hints/tutorial and idle cues | Unresolved | Trigger conditions and runtime observation |
| Camera framing | Unresolved | Active camera configuration and rendered stage |
| Treatment transitions and rewards | Unresolved | State transition logic or complete recorded flow |
| Final reveal and replay | Unresolved | End-of-level flow |
| Pause/resume | Unresolved | Lifecycle behavior and interaction observation |

No reference-grounded recommendation is made for these choices. In particular, this investigation does not justify changing explicit Next to automatic progression or selecting release behavior, pickup gating, or hint timing. Comparison to frozen `.prototype/Level 1/v1` would not fill the missing reference evidence and was not performed.

## Corrected audit: asset recovery remains a separate route

The initial stop was premature. Missing native decompilation and Android runtime do not prevent archive extraction or necessarily prevent Unity scene, prefab, animation, and serialized configuration recovery. The previous pass had not attempted that route.

The resumed audit successfully extracted all exposed regular main-APK files with REA. Evidence `ev_d597a6d902a306de10ae1bed5de3264106ffd8ba8abae01255641bad42ab42a0` reports complete container-entry extraction to `C:\Users\Dev\AppData\Local\Temp\rea-extracted-bb407fc2-0c37-4ccd-95ce-c666645e828d`. Actual files now accessible include `assets/bin/Data/level0` (270,156 bytes), `globalgamemanagers`, and split `sharedassets0.assets` files. No scene objects or animation curves have yet been decoded.

REA also successfully decoded `assets/bin/Data/Managed/Metadata/global-metadata.dat`: metadata version 31, SHA-256 `ddcd5b1435805dff69a1aeccd20af6db93c05ec2be183003065fef6bc0a8f297`, 174 images, 17,277 types, and 113,683 methods. Complete retained Evidence: `ev_fef74504d44bbbe2fbc407b77004b63bc4ab37f04c7fbd614647d9964ccae23c`. Exact image query Evidence `ev_dd9aef676a06760267f9b481525d63a25730f5424019f97541add21709b2d5e8` identifies `Assembly-CSharp.dll`, image index 1, type start 1751, type count 2480. These are metadata observations, not decompiled method bodies or executed behavior.

Direct reading of extracted `assets/bin/Data/boot.config` observes `androidStartInFullscreen=1` and `androidRenderOutsideSafeArea=1`. These packaged settings partially inform intended display mode; they do not establish portrait orientation, actual camera framing, or the visible screen layout.

Bounded local decoder search found no usable UnityPy, AssetRipper, or AssetStudio installation: PATH and depth-limited Downloads, Desktop, Local Programs, Temp, `C:\Tools`, pip cache, `.cache\uv`, `AppData\Local\uv\cache`, roaming Python, and default Python 3.14 site-packages were checked. One other project virtual environment was discovered (`feed-the-monsters\.venv`); its site-packages had no matching Unity/asset package. This is bounded negative evidence, not proof no copy exists anywhere. The repository's three-commit history contains layer-processing tools, with no recovered Unity extraction workflow. The REA catalog has IL2CPP metadata inspection but no explicit Unity serialized-asset decoder; its `inspect_asset_catalog` is for Apple Assets.car.

**Precise next step:** provide the location of the prior working Unity parser/export, or make a compatible Unity serialized-asset decoder such as UnityPy or AssetRipper available, then decode the extracted files. No emulator or native decompiler is required merely to attempt that asset route. Compatibility, embedded type-tree coverage, and recoverable MonoBehaviour fields are still untested. Runtime or native analysis should be considered only for questions left unresolved after asset decoding. No installation was attempted in this audit.

## Separate native and runtime limitations

The current REA session has no configured native deep-analysis provider. Ghidra remediation reports `GHIDRA_INSTALL_DIR` must point to an extracted Ghidra 12.1.x installation; matching native decompiler and suitable Java also need to be available. A provider must support the actual extracted Android native image and host combination; merely setting that variable is not evidence of support. REA's built-in IL2CPP metadata tool exposes static names and tables, with optional linking limited to 64-bit little-endian native binaries. The supplied package declares an ARMv7 split. Native support and scene/resource decoding or Android runtime observation are needed to bridge those limits.

Android static analysis separately requires caller-supplied headless JADX MCP JAR 0.7.1 selected by `REA_JADX_MCP_JAR` and a full JDK 17+. That can inspect Android declarations/wrappers, but should not be represented as sufficient to recover Unity gameplay. The initial environment check also reported no adb/apktool. No setup changes were attempted, honoring the request to stop for missing capabilities.

An Android execution/capture environment compatible with this supplied split package can later resolve visible behavior and measure timings. It is optional for asset recovery and is not the immediate prerequisite established by this audit. Native and runtime routes remain unvalidated here.

Preserve the project's authorized design constraints during any later investigation: Level 1 only, existing 13 treatments/order, relaxed play without timer/failure/score, existing artwork with simple movement/rotation/scale, and no sound effects. These are project requirements, not findings about the reference.

## Local evidence handoff

All extracted files remain outside the repository in `C:\Users\Dev\AppData\Local\Temp\rea-extracted-cb8fec10-2313-43f4-8a58-a03d88337733`.

Exported REA bundles:

- `C:\Users\Dev\AppData\Local\Temp\runway-reference-xapk-evidence.json`
- `C:\Users\Dev\AppData\Local\Temp\runway-reference-apk-evidence.json`
- `C:\Users\Dev\AppData\Local\Temp\runway-reference-assets-metadata-evidence.json` (resumed APK extraction and successful metadata parse)

Temporary paths may expire. The exported bundles retain static inventory, hashes and Evidence IDs; they do not contain behavioral observations. REA analysis session was closed after export.

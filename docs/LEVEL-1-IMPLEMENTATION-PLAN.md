# Level 1 implementation plan

Status: approved by the user on 2026-11-09. Shared understanding confirmed; ready for implementation. Implementation has not started.

## Confirmed constraints

- Use Defold for the game implementation, including initial project setup.
- Target YouTube Playables and Playgama.
- Integrate Playgama Bridge.
- Build and verify on the host running Codex. Do not introduce CI/CD or Docker containers solely for building. Request operator approval if a genuine need for an off-host or container build arises.
- Add simple animations for the makeup tools during the migration. Sound effects are outside the current scope.
- Reserve the full thirteen-treatment acceptance playthrough for the final step. During implementation, check only the behavior affected by a change; do not replay the entire level after each small edit.

## Settled scope and experience

- First milestone: one complete, polished Level 1 in Defold, initial project setup, Playgama Bridge, and packages for both target platforms verified on this host. Additional levels, monetization, and platform publication are outside this milestone.
- Preserve the thirteen treatments and their order. Propose any specific sequence changes separately.
- Improve tool selection clarity, responsive touch controls, treatment progress feedback, and transitions. Keep a relaxed experience without timers, failure conditions, or scoring.
- Initially animate existing tool artwork using movement, rotation, and scale, with pickup, active-use, and completion feedback. Bespoke frame animation and character animation are separate decisions.
- Replace the prototype's web-page presentation with a game-stage presentation. Tools arrive smoothly from offscreen, one after another; do not retain a permanently visible side tray of tools.
- Enter Level 1 with the character visible and a small Start makeover prompt; no separate main menu or level selector in this milestone.
- Each tool arrives at a bottom resting position. Drag it onto the character to use it, with a working-tip offset that keeps the treatment visible. Releasing returns it smoothly to rest and preserves progress. An unheld tool cannot be applied by tapping the portrait.
- Completing a treatment automatically settles the visual cleanup, shows a brief completion flourish, moves the old tool out, and brings in the next. No manual Next button between treatments. Require release of an already-held pointer before the next tool can be operated.
- Preserve individual pimple targets and approximately 80% completion per continuous-treatment region, followed by a smooth finish. Regions remain independent; off-target movement has no penalty.
- Use a short treatment label, a compact overall progress indicator, a first-treatment drag demonstration, and gentle remaining-target hints after inactivity. Avoid persistent target outlines and multiple face-overlay progress bars.
- The character dominates a portrait-oriented stage. Extend the background on wide screens without stretching the portrait or adding side panels. Use restrained automatic eye/lip close-ups and no player-controlled camera.
- Level completion offers Replay and Next after a clean reveal and brief hold of the finished portrait. Do not implement a before/after comparison or score screen. Replay restores the original dirty state. Next opens a clearly labeled More makeovers coming soon screen in this milestone; it will advance to Level 2 when that level exists.
- Save progress at completed-treatment boundaries. A new visit resumes at the first unfinished treatment and restarts any partial work within it. Brief backgrounding without closing preserves exact current progress.
- Animation should feel calm and tactile: initial tuning targets are approximately 400 ms for entrances and 250 ms for returns/exits, with subtle tool-specific dabs, swishes, or rotations. Keep timings configurable. Decorative movement must not move the visible working tip away from its effective treatment point.
- Pause and Restart makeover controls are development-only. Release gameplay has no extra pause/restart buttons. Development restart asks before discarding progress. Automatic background pausing remains enabled in all builds, suspends gameplay and animation, and safely cancels held input while retaining treatment progress.
- Returning after completing Level 1 restores the finished portrait with Replay and Next. Replay begins a fresh saved run. Temporary save failures do not block gameplay. Failed initial loading must not overwrite an unknown existing save; preserve session progress and retry.
- Use platform-supported storage for release builds and local storage for standalone development.
- Retain existing character and treatment artwork. Allow small tool, background, and interface-art adjustments for the game presentation. Preserve expression and treatment outcomes. Halfway hair styling may remain a layered reveal; physical hair animation is outside this milestone.

## Existing reference

The retained Level 1 browser prototype is `.prototype/Level 1/v1`. Its README and `docs/DEFOLD-HANDOFF.md` describe thirteen treatments, selective tool interaction, coverage-based completion, replay, and a final comparison slider. Preserve the treatment sequence and visual correctness invariants; redesign the surrounding presentation as a game.

## Implementation phases

### 1. Host setup and project skeleton

- Locate or install the required Defold toolchain on this Windows host and record the version and reproducible local build commands. Keep dependencies pinned.
- Add the Defold project separately from the frozen `.prototype/Level 1/v1` reference, proposed under `game/`. Preserve the reusable `tools/layers` pipeline and source artwork.
- Establish boot, portrait stage, responsive layout, mouse/touch bindings, and development-only controls. Keep development controls out of release configuration.
- Add Playgama Bridge and a small platform boundary for readiness, pause/resume, audio state, and storage. Keep one owner for platform lifecycle events.
- Audit dependency build requirements before invoking a build that may use Defold's remote extension compiler. Obtain operator approval if remote compilation is genuinely required; no CI/CD or Docker build workaround.
- Check a minimal HTML5 launch locally through HTTP. This is a setup smoke check, not a full-level test.

### 2. Prove interaction and rendering

- Import placement and authored hit-region data from the prototype, converting its 640 by 960 top-left coordinate system to Defold coordinates. Keep hit regions independent of artwork bounds.
- Establish data-driven treatment definitions with stable IDs, ordered regions, tool definitions, completion rules, camera framing, and adjustable animation values.
- Prove dragging, partial cream application/removal, independent regions, and correct blending in a focused scene before assembling all treatments.
- Evaluate a committed portrait surface plus active reveal masks using Defold render targets/materials. Select the concrete rendering implementation based on this host proof; native extensions are not preauthorized as a shortcut.
- Multiply artwork alpha by reveal coverage once. Avoid double feathering, residual cream outlines, and held facial crossfades. Invert camera transforms for input.
- Retain the prototype's swept-stroke coverage behavior so fast movement does not skip treatment areas. Use a single active pointer and cancel input safely on pause or focus loss.
- Gate the next phase on correct partial and completed visuals. Do not substitute numerical completion checks for visual correctness.

### 3. Assemble Level 1 and tool choreography

Preserve this sequence:

1. Extract fourteen individual pimples.
2. Apply cleansing cream to forehead and both cheeks.
3. Wipe cream, residue, and grime, including eye surrounds and neck.
4. Clean both sides of the robe while retaining hanging hair.
5. Shave both eyebrows independently.
6. Apply lip scrub.
7. Remove scrub and hydrate lips.
8. Apply foundation to face and neck.
9. Fill complete eyebrow arches.
10. Reveal eye shadow, liner, and lashes together.
11. Apply blush and contour together.
12. Apply crimson lipstick.
13. Style both sides of the hair without replacing the face or changing already-visible clean clothing.

- Implement explicit tool phases: entering, ready, held, returning, completing, and exiting. Only ready/held interactions can start or apply work; completion fires once after all regions settle.
- Add short labels, overall progress, first-use drag guidance, idle hints, and restrained close-ups. Tune hints and animation timings as presentation details without changing the agreed interaction rules.
- Preserve brow tails, compact hair hit regions, and the distinction between hidden fabric exposed by styling and already-visible robe areas.
- Add the clean final reveal, Replay, Next, and the end-of-content screen. Give the end-of-content screen a route back to Replay so it is not a dead end.

### 4. Persistence and platform packaging

- Save a versioned record of the level, completed-treatment boundary, and completion state; do not save GPU masks or partial strokes. Reconstruct completed visuals deterministically when resuming.
- Load before allowing writes to an existing save. Keep failed-load recovery distinct from an empty save, prevent a late response from silently replacing the current session, and serialize writes so a delayed completion save cannot undo Replay.
- Preserve exact in-memory treatment progress during brief backgrounding. Pause treatment updates, animation, input, and rendering as required by the platform, while retaining the event path needed to resume.
- Honor platform audio state even though this milestone remains silent.
- Prepare separate YouTube Playables and Playgama HTML5 packages from the same game source. Audit bundled resources and external requests, including Bridge loading, against each platform's requirements.
- Document installation, local preview, packaging commands, dependency versions, and the development/release distinction.

### 5. Final acceptance on this host only

Run the complete thirteen-treatment acceptance pass only after the level is assembled and ready for delivery. Cover mouse and simulated touch, with visual/layout checks in portrait, landscape, and square browser viewports. Batch these checks; do not rerun the full sequence for every viewport or minor adjustment when a focused check suffices.

- All thirteen treatments complete in order, without manual between-treatment Next controls, scoring, timers, or failure penalties.
- Tools arrive one at a time, require pickup, track the working tip accurately, preserve progress on release, and exit automatically. Held input cannot spill into the next treatment.
- Check partial cleansing, one shaved eyebrow, combined eye makeup, robe cleanup, partial styling, and the final portrait against the reference's visual invariants.
- Verify hints, close-ups, target independence, and completion feedback. Ensure the character and active tool remain usable in all selected layouts.
- Verify background pause/resume, canceled drags, treatment-boundary save/reload, completed-level reload, save failure behavior, and Replay reset.
- Verify Replay and Next, the end-of-content return path, and absence of the comparison slider and development-only controls in release output.
- Smoke-check both final packages locally and inspect loading, resource/network behavior, console errors, and applicable size limits.
- Record the tested host/browser, packages, and any remaining limitations. Simulated touch does not establish actual-device compatibility, and local checks do not establish platform certification.

During earlier phases, run only relevant syntax/build checks, focused interaction or visual checks, and meaningful tests for state/save logic where needed. If final acceptance finds a defect, retest its affected behavior and broaden only when the fix creates a credible wider regression risk. Do not use the prototype's old instruction to run its entire suite before and after porting to override this agreed validation policy.

## Delivery and exclusions

Deliver the Defold source project, imported/generated assets and their reproducible preparation steps, pinned dependencies, local build/preview instructions, both HTML5 platform packages, and final acceptance notes. Build feasibility must be established before claiming either package is deliverable under the host-only constraint.

Excluded: additional playable levels, ads/monetization, sound effects, scoring, physical hair simulation, a release pause/settings menu, before/after comparison, actual-device testing, platform publication/certification, CI/CD, and unapproved off-host/container builds. Reference reverse engineering and emulator setup remain deferred.

No player-experience decisions remain open from the interview. Rendering implementation and exact platform packaging are evidence-driven implementation checkpoints, not assumed solved dependencies. Surface any blocker that requires changing scope or violating a confirmed constraint.

## Reference investigation status

The user has deferred further reference investigation and emulator setup. Continue the design interview using the user's decisions; reference research is not a prerequisite for finalizing the plan.

REA is connected and can inspect archives. The main APK was extracted and its IL2CPP metadata parsed; serialized Unity scenes and animation curves were not decoded. Gameplay behavior has not been established. If research is requested again, resume the asset investigation before claiming an emulator is necessary. Do not treat tool entrances, progression rules, hint behavior, or timings as observed in the reference.

## Platform research notes (not implementation decisions)

- [Playgama Bridge for Defold](https://github.com/playgama/bridge-defold) supports both target platforms. Prefer a single owner for platform services; assess whether Bridge covers all required lifecycle behavior before adding a separate YouTube integration.
- [Defold bundling](https://defold.com/manuals/bundling/) supports host-driven HTML5 builds. [Native extensions](https://defold.com/llms/manuals/extensions/) normally use a remote build server. Do not silently treat a host-issued command as approval for remote compilation: investigate dependency needs and request operator approval if required.
- [YouTube integration requirements](https://developers.google.com/youtube/gaming/playables/certification/requirements_integration) govern readiness, pause/resume, audio state, and save behavior. Silent gameplay still needs the applicable platform lifecycle integration.
- [YouTube privacy requirements](https://developers.google.com/youtube/gaming/playables/certification/requirements_privacydata) restrict external requests. Assess locally bundled Bridge JavaScript using the [Bridge setup documentation](https://wiki.playgama.com/playgama/bridge-sdk/setup); do not assume the default CDN route is suitable.
- Check final packages against [YouTube performance requirements](https://developers.google.com/youtube/gaming/playables/certification/requirements_stability) and [Playgama technical requirements](https://wiki.playgama.com/playgama/game-requirements/technical-requirements). Local validation is not platform certification or publication approval.

# Build Level 1 in Defold with sequential tools and platform integration

Status: synthesized from the approved plan. Test boundary and GitHub publication confirmed by the user on 2026-11-09. Triage label: `ready-for-agent`.

## Problem Statement

Runway Rewind currently has a working browser prototype of its first makeover, but its webpage-style shell, permanent tool tray, and manual treatment navigation do not deliver the intended game experience. There is no Defold project or established engine build workflow yet.

Players need a cohesive, relaxed makeover in which the character dominates the game stage, tools arrive in sequence, treatment responds clearly to touch or mouse movement, and progress flows naturally toward the finished result. Development needs to preserve the prototype's carefully tuned artwork and treatment behavior while delivering host-verified HTML5 packages for YouTube Playables and Playgama.

## Solution

Build one complete, polished Level 1 in Defold. Preserve the thirteen existing treatments and their order, but replace the surrounding webpage presentation with a portrait-oriented game stage. Show the character immediately, start through a small Start makeover prompt, and introduce each tool through a smooth offscreen entrance.

Players drag the current tool from its resting position to perform the treatment. Releasing preserves work and returns the tool to rest. Completing a treatment settles its visual result, retires the tool, and introduces the next without a manual navigation button. Use minimal labels, compact overall progress, gentle hints, and restrained close-ups.

End with the finished portrait and Replay/Next actions. Next leads to a clearly labeled end-of-content screen until another level exists. Save completed-treatment progress, handle platform lifecycle events through Playgama Bridge, and package the same game for both release platforms. Keep setup, builds, and validation on the host running Codex unless the operator explicitly approves an exception.

## User Stories

1. As a player, I want to see the character as soon as Level 1 opens, so that I immediately understand the focus of the game.
2. As a player, I want a small Start makeover prompt, so that I can begin without navigating a separate menu.
3. As a player, I want a coherent game stage instead of a webpage layout, so that the makeover feels like a game.
4. As a player, I want the character to dominate the stage, so that treatment changes remain easy to see.
5. As a player, I want tools to arrive smoothly from offscreen one at a time, so that I know which treatment comes next.
6. As a player, I want the current tool to rest near the bottom of the stage, so that I can find and pick it up easily.
7. As a touch player, I want to drag a tool onto the character, so that applying a treatment feels direct and tactile.
8. As a mouse player, I want the same pickup-and-drag interaction, so that the makeover works naturally on desktop.
9. As a player, I want the working tip to stay visible near my finger or cursor, so that I can see where I am applying treatment.
10. As a player, I want the tool's visible working tip to match the effective treatment point, so that animation never makes input feel inaccurate.
11. As a player, I want releasing a tool to return it smoothly to rest without losing work, so that I can reposition or take a break.
12. As a player, I want an unheld tool to remain inactive, so that accidental portrait taps do not apply treatment.
13. As a player, I want subtle dabs, swishes, or rotations appropriate to the tool, so that using it feels responsive.
14. As a player, I want calm, short tool transitions, so that animation adds polish without repeatedly interrupting play.
15. As a player, I want to treat fourteen pimples individually, so that each visible target responds independently.
16. As a player, I want to apply cleansing cream to the forehead and both cheeks, so that I prepare the whole intended area.
17. As a player, I want to wipe away cream, residue, and grime around the face and neck, so that the cleaned result is visibly complete.
18. As a player, I want to clean both sides of the robe while keeping hanging hair intact, so that each treatment changes only its intended subject.
19. As a player, I want to shave each eyebrow independently, so that work on one side does not finish the other automatically.
20. As a player, I want to apply lip scrub and then remove it and hydrate the lips, so that the skincare sequence has clear visible stages.
21. As a player, I want to apply foundation to the face and neck, so that the makeup result is consistent across both areas.
22. As a player, I want to fill complete eyebrow arches, including their tails, so that the finished brows look intentional.
23. As a player, I want eye shadow, liner, and lashes revealed together, so that the eye treatment produces a clear transformation.
24. As a player, I want blush and contour applied together, so that the treatment feels like one cohesive step.
25. As a player, I want to apply crimson lipstick, so that the lip makeover has a distinct final result.
26. As a player, I want to style both sides of the hair without changing the character's face or expression, so that the makeover remains visually consistent.
27. As a player, I want treatment regions to complete after sufficient coverage, so that I do not need to hunt for tiny missed pixels.
28. As a player, I want remaining pixels to settle smoothly when a region completes, so that the final result does not jump abruptly.
29. As a player, I want each separate region to require attention, so that finishing one cheek or eyebrow does not skip the other.
30. As a player, I want fast dragging to leave continuous treatment coverage, so that quick movements do not create unexplained gaps.
31. As a player, I want off-target movement to have no penalty, so that I can explore the controls without frustration.
32. As a player, I want a short treatment label and compact overall progress, so that I understand the sequence without a cluttered face overlay.
33. As a first-time player, I want a visual dragging demonstration, so that I can learn without a long written tutorial.
34. As a player who is not making progress, I want a gentle hint toward the remaining target, so that I can continue without permanent guide outlines.
35. As a player, I want restrained eye and lip close-ups, so that detailed work remains comfortable.
36. As a player on a wide or square screen, I want the background and layout to adapt without stretching the portrait, so that the makeover remains readable.
37. As a player, I want completed treatments to advance automatically, so that the makeover flows without repeated Next clicks.
38. As a player, I want a held drag to stop at a treatment transition, so that it cannot accidentally operate the next tool.
39. As a player, I want a relaxed makeover without timers, scoring, or failure conditions, so that I can proceed at my own pace.
40. As a player, I want automatic pausing when I switch away, so that treatment and animation do not continue without me.
41. As a returning player, I want brief backgrounding to preserve my exact treatment progress and cancel stale dragging, so that I resume safely.
42. As a returning player, I want completed treatments remembered between visits, so that I do not have to repeat the entire makeover.
43. As a returning player, I want a new visit to resume at the first unfinished treatment, so that the saved position is predictable even though partial strokes restart.
44. As a player, I want temporary storage failures to leave the current session playable, so that a platform problem does not stop the makeover.
45. As a player with an existing save, I want a failed initial load not to overwrite it, so that temporary loading problems do not erase progress.
46. As a player, I want the final tool and treatment indicators to leave before the finished portrait is presented, so that I can appreciate the result.
47. As a player, I want Replay to restore the original dirty state and begin a fresh saved run, so that I can repeat the makeover.
48. As a player, I want Next after completion, so that I have a clear action for continuing beyond the current level.
49. As a player who has finished the available content, I want an honest More makeovers coming soon screen with a route back to Replay, so that Next does not become a dead end.
50. As a returning player who already finished Level 1, I want the completed portrait and Replay/Next actions restored, so that completion is remembered.
51. As a player, I want release gameplay free of development pause and restart buttons, so that extra controls do not interfere with treatment.
52. As a developer, I want development-only pause and restart controls with restart confirmation, so that I can inspect behavior without accidentally discarding a run.
53. As a developer, I want a reproducible Defold setup and pinned dependencies, so that the game can be maintained from a known local environment.
54. As a developer, I want to preserve the frozen prototype and reusable artwork tooling, so that the behavior reference remains available during the migration.
55. As a developer, I want the hardest dragging and compositing behavior proven first, so that rendering problems are discovered before assembling the full level.
56. As a developer, I want one platform integration boundary backed by Playgama Bridge, so that readiness, lifecycle, and saves behave consistently across the release targets.
57. As a developer, I want separate YouTube Playables and Playgama packages from the same game source, so that platform packaging does not split the gameplay implementation.
58. As an operator, I want builds and verification confined to this host, so that work does not introduce unwanted CI/CD, containers, or remote build infrastructure.
59. As an operator, I want explicit approval requested before any genuinely necessary remote or container build, so that a locally invoked command cannot silently bypass the build constraint.
60. As a developer, I want focused checks while making small changes and a full playthrough only at final acceptance, so that validation catches problems without repeatedly spending time on all thirteen treatments.
61. As a reviewer, I want visual evidence of important partial and completed treatments, so that numerical completion alone does not conceal rendering defects.
62. As a reviewer, I want final acceptance notes to distinguish local simulation from device testing and platform certification, so that the delivery claims match the evidence.

## Implementation Decisions

- **Engine and project setup:** Use Defold. Establish the project, host toolchain, startup scene, HTML5 preview, input bindings, development configuration, and reproducible local packaging commands. Keep the engine project separate from the frozen browser prototype. Pin dependencies and record versions.
- **Implementation order:** Establish host setup and the platform skeleton; prove focused interaction/rendering; assemble the complete level and tool choreography; complete persistence and target packaging; perform final acceptance. Rendering and build feasibility are checkpoints, not assumptions that have already been validated.
- **Treatment model:** Use data-driven definitions with stable treatment IDs, ordered regions, authored hit geometry, tool definitions, completion rules, camera framing, and configurable animation values. Keep visible artwork bounds separate from treatment hit regions.
- **Treatment order:** Preserve exactly: fourteen pimple extractions; cleansing cream on forehead and cheeks; wiping cream/residue/grime including eye surrounds and neck; robe cleanup; independent eyebrow shaving; lip scrub; scrub removal and lip hydration; face/neck foundation; full eyebrow fill; combined shadow/liner/lashes; combined blush/contour; crimson lipstick; both-side hair styling. Do not restore removed concealer, powder, or extra tiny passes merely because historical source labels mention them.
- **Stage and interface:** Use a portrait-oriented stage with the character immediately visible, a small Start makeover prompt, minimal treatment label, compact overall progress, and first-use/idle guidance. Extend the background on wider screens without stretching the portrait or adding webpage side panels. Retain automatic eye/lip close-ups and no player-controlled camera.
- **Input boundary:** Support real mouse input and touch with one active pointer. Require pickup from the current tool's resting position. Maintain a visible working-tip offset while keeping effective treatment coordinates aligned. Cancel held input safely on focus loss or pause. Invert camera transforms before hit testing.
- **Tool lifecycle:** Represent entering, ready, held, returning, completing, and exiting explicitly. Input can pick up a ready tool and perform treatment while it is held. Releasing preserves work and animates the tool back. Completion occurs once after all required regions settle; perform the completion flourish and exit before introducing the next tool. Require release of a preexisting held pointer before the next tool can be used.
- **Animation:** Reuse tool artwork with movement, rotation, and scale. Initial tuning targets are approximately 400 ms entrances and 250 ms returns/exits. Use restrained tool-specific dabs, swishes, or rotations, with adjustable timing. Decorative motion must not visually detach the working tip from its actual treatment point. Sound effects are excluded.
- **Coverage and completion:** Preserve individually addressed extraction targets and independent sampled coverage for continuous treatments. Use swept-stroke coverage so fast motion does not skip areas. Complete each continuous region at approximately 80% coverage and smoothly finish remaining pixels. Off-target input is harmless. The existing prototype's completion-fade behavior is the starting reference; tool entrance/exit timings are separate from those fades.
- **Rendering proof:** Evaluate a committed portrait surface plus active reveal masks using Defold render targets/materials. Choose the concrete renderer based on a focused host proof of partial cream application/removal, dragging, and region independence. Native extensions are not preapproved as a shortcut around technical constraints.
- **Compositing correctness:** Multiply artwork alpha by reveal coverage once; avoid double feathering, residual cream/scrub outlines, and held facial crossfades. Preserve full brow tails. Keep compact hair interaction regions independent of the larger visible artwork. Hair styling must preserve the face, expression, and already-visible clean clothing; it may reveal previously hidden clean fabric.
- **Asset migration:** Reuse existing generated character and treatment art and the layer-processing pipeline. Convert the prototype's 640-by-960, top-left coordinate convention for Defold placement and input. Permit small tool, background, and interface-art adjustments. A layered reveal remains acceptable for halfway hair styling; physical hair animation is excluded.
- **Completion flow:** Clear treatment tools and indicators, briefly hold the finished portrait, then offer Replay and Next. Remove before/after comparison. Replay restores the dirty starting state and starts a fresh saved run. Next leads to a clearly labeled More makeovers coming soon screen with a return route to Replay until another level exists.
- **Development-only controls:** Pause and Restart makeover controls exist only in development builds; restart asks for confirmation. Release gameplay must not display these controls. Start, completion Replay/Next, and the agreed minimal gameplay feedback remain part of the release experience.
- **Platform boundary:** Integrate Playgama Bridge as the common owner of readiness, lifecycle, audio state, and storage integration. Keep target-specific packaging configuration separate from gameplay. Avoid duplicated platform lifecycle ownership.
- **Pause behavior:** All builds automatically pause gameplay, input, animation, and rendering as required by the platform when backgrounded or paused. Retain the platform event path needed for resumption. Cancel stale held input while preserving exact in-memory progress during brief backgrounding. Honor platform audio state even though this milestone is silent.
- **Save contract:** Store a versioned level identifier, completed-treatment boundary, and completion state. Do not store GPU masks or partial strokes. Reconstruct completed visuals deterministically; a new visit resumes at the first unfinished treatment. A completed save restores the finished portrait and Replay/Next.
- **Save lifecycle:** Use platform-supported release storage and local storage for standalone development. Load before permitting writes to an existing save. Distinguish a failed load from an empty save. Preserve current-session progress and retry after failure; do not silently replace it with a late response. Serialize writes so an earlier completion save cannot undo a newer Replay reset. Temporary failures must not block gameplay or destroy an unknown prior save.
- **Packaging:** Produce separate YouTube Playables and Playgama HTML5 artifacts from one source implementation. Audit Bridge loading, bundled resources, external requests, and relevant packaging limits for each target. Do not presume a default CDN configuration is suitable for both.
- **Build constraint:** Perform builds and verification on the host running Codex. No CI/CD and no Docker containers solely to build the game. Audit Defold dependency/native-extension requirements before invoking a command that could compile remotely. Request operator approval if off-host or container compilation becomes genuinely necessary; do not quietly substitute a prohibited build route.
- **Delivery:** Supply the Defold project, imported/generated assets with reproducible preparation steps, pinned dependencies, setup/preview/build instructions, both platform packages, and acceptance notes. Do not claim package delivery until actual host-only build feasibility is established.

## Testing Decisions

- **Confirmed primary test boundary:** Exercise the locally running HTML5 game through real mouse and simulated-touch input, observing player-visible behavior. This is the highest practical shared boundary for treatment flow, rendering, tool interaction, and layout. The user explicitly confirmed it.
- **Controlled external responses:** At the existing planned platform boundary, control lifecycle and storage responses only where necessary to reproduce pause, failed loading, failed saving, delayed responses, and write ordering. Verify their observable effects through continued play, reload, and visible progress. Avoid adding test entry points throughout individual gameplay modules.
- **Good tests:** Assert external behavior and meaningful outcomes rather than private phase names, call counts, implementation structure, or constants copied from the code. Check whether work appears under the tool, independent regions remain independent, progress survives the agreed lifecycle, and the next treatment cannot consume stale input. Do not rely on a numeric completion flag to establish visual correctness.
- **Coverage by responsibility:** Exercise the treatment runner and tool interaction through pickup/use/release/transition behavior; the portrait renderer through partial/completed visuals; stage layout through viewport changes; persistence through save/reload/replay and failure recovery; platform integration through readiness/lifecycle/storage effects; release packaging through local launch, resources, and absence of development controls.
- **Existing prior art:** The browser prototype already uses Playwright with installed Chrome to drive pointer and simulated-touch interactions, inspect camera-adjusted geometry, validate independent regions, capture significant treatment phases, and check browser errors and artwork loading. Reuse that high-level approach rather than building an unrelated test stack. Its DOM-specific controls, manual Next navigation, keyboard-only behavior, and comparison-slider expectations are not automatically requirements of the Defold version.
- **Early checks:** Validate minimal host setup with a local HTTP HTML5 smoke check. Prove the rendering/dragging risks in a focused scene. During development, use syntax/build checks and small behavior-specific checks appropriate to the change. Do not run a full thirteen-treatment playthrough after each small edit or mirror every internal function with a test.
- **Final acceptance only:** When the game is assembled and ready for delivery, run complete Level 1 acceptance covering mouse and simulated touch. Verify portrait, landscape, and square layouts using focused viewport checks; do not multiply full playthroughs by every viewport when focused checks suffice.
- **Gameplay acceptance:** Confirm all thirteen treatments and their order, individual pimple targets, independent continuous regions, forgiving completion, off-target behavior, accurate working-tip alignment, automatic progression, and input isolation across tool transitions.
- **Visual acceptance:** Inspect partial cleansing, one shaved eyebrow, combined eye makeup, robe cleanup, partial styling, and the finished portrait. Confirm that the face/expression and already-visible clean robe remain intact and that no cream residue outlines or double-feathering artifacts appear.
- **Presentation acceptance:** Verify sequential tool entrances/exits, release returns, subtle use animations, hints, short labels, overall progress, restrained close-ups, usable framing, final reveal, Replay, Next, and the end-of-content return path. Confirm no before/after slider, score screen, permanent tool tray, or release pause/restart controls.
- **Lifecycle acceptance:** Verify background pause/resume, stale drag cancellation, exact same-session progress retention, completed-treatment restoration after reload, partial-treatment restart on a new visit, completed-level restoration, failed-load protection, save failure recovery, and Replay reset ordering.
- **Package acceptance:** Smoke-check both final packages locally, including startup, resources/network requests, browser errors, relevant size limits, and release configuration. Record the host, browser, tested artifacts, and limitations. No actual-device verification, remote build verification, or platform certification is implied.
- **Retesting policy:** If final acceptance finds a defect, retest the affected behavior. Broaden testing only when the fix creates a credible wider regression risk. The approved focused-check policy supersedes the prototype handoff's older instruction to run its entire suite before and after porting.

## Out of Scope

- Additional playable levels, a separate main menu, and a level selector.
- Ads, monetization, scoring, timers, failure penalties, and a score screen.
- Sound effects and other audio production for this milestone.
- Bespoke frame-by-frame tool animation, character animation, and physically simulated hair.
- Before/after comparison and manual Next controls between treatments.
- Release pause, restart, or settings menus that add controls during treatment.
- Persistence of partial strokes across new visits.
- A separate backend or analytics system.
- Actual-device testing, platform publication, certification, and guaranteed platform acceptance.
- CI/CD, Docker containers solely for building, and off-host/container builds without explicit operator approval.
- Further APK reverse engineering and Android emulator setup; those investigations are deferred and do not block this spec.

## Further Notes

The user approved the implementation plan and shared understanding on 2026-11-09. The gameplay and presentation requirements here are user-approved design choices. They are not claims that those behaviors were observed in the supplied reference APK.

The repository currently contains the frozen browser prototype and reusable layer-processing tooling, but no Defold implementation. No implementation work is authorized by a claim that an untested renderer or packaging path already succeeds. The rendering proof and dependency/build audit must establish feasibility and surface conflicts with the agreed constraints.

The reference investigation extracted the main APK and parsed Unity IL2CPP metadata. It did not decode serialized scenes or animation curves or establish runtime behavior. Do not turn that incomplete investigation into invented animation timings or interaction requirements.

Use the project glossary consistently: a Level is a complete makeover; a Treatment is one stage; a Tool is the implement used for treatment; Tool arrival is its offscreen entrance; the Game stage is the visible gameplay space; Replay restarts the makeover; Next proceeds beyond the finished level or to the End-of-content screen.

No ADRs were present in the inspected repository. The accepted decisions and constraints above govern implementation; technical implementation choices that remain evidence-dependent must not silently change the player experience or build policy.

The configured project issue tracker is GitHub Issues in BoundedOfficial/Runway-Rewind. Publish with the `ready-for-agent` triage label and no additional triage.

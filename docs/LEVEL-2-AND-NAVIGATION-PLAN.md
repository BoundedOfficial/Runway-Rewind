# Level 2 transfer and basic navigation

Status: implemented in Defold and browser-verified. See [implementation review](LEVEL-2-IMPLEMENTATION-REVIEW.md) for review outcomes and verification scope.

Published implementation specification: [GitHub issue #15](https://github.com/BoundedOfficial/Runway-Rewind/issues/15), labeled `ready-for-agent`.

## Agreed scope

- Port the current HTML5 dental prototype into the main Defold game using its generated artwork.
- Preserve eight treatments: collect food and worms, scrape crust, clean tight gaps, floss, apply toothpaste, brush, suction, polish.
- Floss removes trapped fibers only. Enamel stays yellow until brushing reveals clean ivory teeth. Polishing provides the final pearl-white finish. Mouthwash is excluded.
- Collect food and worms in any order into one petri dish. Preserve original sprite scale on drop and render all debris above the dish. Keep food spawn areas separate from worms.
- Add a home screen with the game title, a simple soft pastel background and a large gently pulsing Play button. Play opens level selection.
- Both levels are available immediately. No unlock requirements, currency, or entry ads.
- Level selection borrows the reference's pastel background, rounded cards, white borders and small level numbers. Show only the two implemented levels; no placeholder cards or pagination.
- Thumbnails show each level's dirty starting state, making the transformation and subject clear.

## Agreed navigation and progress

- Every launch opens Home, including returning players. Play always opens level selection rather than resuming directly.
- Selecting an unfinished level resumes from its last completed treatment. Selecting a completed level begins a fresh replay. Each level owns independent progress; existing Level 1 saves are preserved.
- Save at treatment boundaries. Partial strokes, held objects and partly completed collections are not checkpoints. Reconstruct all effects of completed treatments when resuming.
- A small in-level menu button offers return to level selection. Before leaving, confirm: completed treatments are saved, but the current treatment will restart. Cancel returns to the same run without resetting work.
- Results offer Replay and Levels. Level 1 additionally offers Next to enter Level 2 through the same resume-or-fresh entry behavior as selection. Level 2 has no Next button or end-of-content detour.
- Replay resets only the current level. Other levels' progress remains intact.
- Keep menus and gameplay in a centered portrait layout on wide displays, extending the pastel background into the remaining space. Show the two large level cards side by side within the portrait area.

## Dental treatment contract

| Treatment | Interaction | Visible result |
| --- | --- | --- |
| Collect leftovers | Hold and pull any food scrap or worm, then release over the petri dish | Nine scraps and four worms leave the mouth and remain visible in the dish at their original scale; invalid releases return the object |
| Scrape crust | Sweep the scaler over buildup | Rough dirty enamel becomes smooth but visibly yellow |
| Clean tight gaps | Hold the handpiece on deposits | Gap deposits break away; enamel remains yellow |
| Floss | Sweep between teeth | Trapped fibers disappear; enamel color does not change |
| Apply toothpaste | Hold over each row | Generated mint paste covers the application areas; yellow stains remain |
| Brush | Brush across teeth | Yellow stains give way to clean ivory enamel while generated foam builds |
| Suction | Hold over foam | Foam clears to expose the cleaned teeth |
| Polish | Buff each tooth | Ivory enamel becomes the final pearl-white finish |

Preserve mixed extraction order, six-frame worm animation, forgiving drop behavior, input cancellation, and the prototype's transition guard. Maintain the invariant that food spawns do not overlap reserved worm spaces. Render the petri dish below anchored, held and collected debris. Use generated raster artwork for the mouth, tools, debris and treatment effects; code handles input, masks, animation and compositing.

## Confirmed implementation constraints

- Production startup, result and end screens currently live in `game/main/stage.gui_script`, which directly owns Level 1. Introduce level selection and level ownership across navigation, runner and renderer.
- Artwork loading and build scripts assume one Level 1 atlas and manifest. Author Level 2 regions and convert its generated plates and sprite sheets into production assets; retain source artwork and prompts.
- The runner needs movable collectibles, drop targets, animated worms and dental overlays in addition to existing stroke/hold mechanics.
- Existing progress storage is Level 1-specific. Any extension must preserve legacy saves, delayed-read/write protections and replay semantics; avoid cross-level write races.
- Preserve Playgama pause/audio lifecycle integration. Review GUI node allocation when adding screens and thumbnails.
- Update browser checks that assume immediate Level 1 startup or Next leading to end-of-content. Verify both levels, dental treatment boundaries, extraction/drop cancellation, whitening timing and platform lifecycle behavior.

## Implementation sequence

1. **Prepare the integration baseline.** Start an implementation branch from current main. Preserve the latest prototype changes and selected generated assets, including the petri dish and corrected eight-treatment flow. Confirm existing Level 1 checks before changing shared runtime ownership.
2. **Introduce level ownership and checkpoints.** Define a small catalog with stable level IDs, display metadata, thumbnail, treatment sequence and artwork references. Make the runner, artwork renderer and camera use the selected level. Extend the platform persistence adapter for independent level checkpoints, migrating legacy Level 1 records without destructive rewrites. Keep writes bound to their originating level even when selection changes. Preserve existing unknown-read, unsupported-record, retry and replay protections.
3. **Build the navigation screens.** Add Home, selection, return confirmation and results routes. Create original pastel background artwork where needed and crop level thumbnails from their dirty plates. Implement gentle Play pulsing, rounded white-bordered cards, level numbers and wide-screen backdrop. Recalculate GUI node allocation and touch hit areas. Keep level loading under a transition so stale artwork and input cannot leak between levels.
4. **Author and port Level 2 assets.** Move production assets into a dedicated Level 2 artwork directory with provenance and prompts. Extend asset preparation/build scripts for per-level manifests, atlases and the differing sheet layouts. Author tooth/gap interaction regions and treatment masks from the registered plates. Carry over the existing generated tool, worm, food, paste and foam sprites; do not ship prototype-only Review controls.
5. **Implement the dental treatments.** Add collectible grip/pull/drop behavior and independent overlays. Wire the eight-treatment contract above into production timing, touch input, camera transforms and boundary reconstruction. Update result navigation and replay without changing Level 1's treatment design.
6. **Validate and package.** Run the focused checks below, inspect phone and wide-screen captures, and play both levels end to end. Produce the existing Playgama-compatible HTML5 package through the normal pipeline. Keep distribution through Playgama; no separate YouTube-specific package. Prepare a PR to main describing the new navigation, level transfer and validation evidence.

## Acceptance and regression checks

- Fresh and returning sessions open Home. Play reaches exactly two unlocked, recognizable cards. Selection, exit confirmation, cancel, Replay, Levels and Next obey the agreed routes.
- Menu/title/button text fits phone layouts. Both cards remain comfortably tappable, and the portrait area stays centered on wide displays. The Play pulse is gentle and does not move its hit area.
- Both levels remain playable to completion. Selecting a completed level starts fresh, while selecting an unfinished level resumes at the next incomplete treatment.
- Load legacy Level 1 checkpoints; preserve progress when reads are delayed, unavailable or unsupported. Switch levels with delayed saves and verify no cross-level overwrite. Replay must win over stale writes for that level only.
- Resume Level 2 at every treatment boundary with the correct enamel, deposits, paste and foam. Leave during extraction, flossing and brushing; re-entry restarts only the unfinished treatment. Canceling exit does not discard progress.
- Collect food and worms in mixed order. Verify valid/invalid drops, dragging over the dish rim, equal on-mouth/drop scale, z-order, reserved spawn spacing and pointer cancellation.
- Confirm flossing does not alter enamel pixels away from removed fibers. Brushing must visibly clean yellow enamel. Suction exposes the clean result and advances directly to polish. No mouthwash appears in the playable sequence.
- Pause or lose focus during a drag, transition and menu interaction. Resume without stuck tools, unintended progress or audio-state violations. Exercise host restart in each level.
- Update existing navigation-dependent smoke tests, finish tests, persistence fixtures and package checks. Verify generated assets load from the packaged build and capture the final visual sequence for review.

## Scope boundaries

No level locks, economy, new ad behavior, placeholder levels, pagination, mouthwash, or Level 1 treatment redesign. Existing platform lifecycle and distribution behavior remain in scope for compatibility. Any defects found while transferring the approved mechanics should be fixed without silently changing the treatment sequence.

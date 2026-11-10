## Problem Statement

Runway Rewind's production game contains only the first makeover level and has no home screen or level selection. The dental-cleaning level exists only as an HTML5 prototype, so players cannot reach it through the main game. The production navigation and saved progress assume a single level.

Players need a simple entry flow, recognizable level choices, independent progress, and a satisfying dental transformation that preserves the prototype's approved interactions. In particular, flossing must remove trapped debris without whitening teeth; brushing must deliver the yellow-to-clean transformation.

## Solution

Transfer the approved dental prototype into the Defold game as Level 2. Add a minimal pastel Home screen with the game title and a large gently pulsing Play button. Play opens level selection with two large, unlocked cards showing the dirty starting states of the existing makeover and dental levels.

Preserve the eight-treatment dental sequence: collect leftovers, scrape crust, clean tight gaps, floss, apply toothpaste, brush, suction, polish. Use the generated artwork and approved petri-dish collection behavior. Remove mouthwash from the playable flow.

Always launch into Home. Resume unfinished levels at treatment checkpoints, preserve existing Level 1 saves, and provide clear exit, replay and result navigation. Deliver through the existing Playgama-compatible HTML5 pipeline.

## User Stories

1. As a new player, I want a clear Home screen, so that I understand where to begin.
2. As a returning player, I want the game to open on Home, so that I can choose what to play rather than being dropped into a previous session.
3. As a player, I want a large gently pulsing Play button, so that the main action is obvious without flashing distractions.
4. As a player, I want Play to open level selection, so that I can choose either available makeover.
5. As a player, I want both levels unlocked immediately, so that I can try the dental level without completing another level first.
6. As a player, I want thumbnails showing each level's dirty starting state, so that its subject and transformation are immediately recognizable.
7. As a player, I want rounded cards with white borders and small level numbers, so that choices are easy to distinguish.
8. As a player, I want only playable levels shown, so that I do not encounter placeholder cards or unnecessary pages.
9. As a phone player, I want large touch targets and readable text, so that menus are comfortable to use.
10. As a player on a wide display, I want centered portrait content with an extended pastel background, so that the game remains composed and readable.
11. As a player, I want each level to remember its own completed treatments, so that switching levels does not lose the other level's progress.
12. As an existing Level 1 player, I want my saved progress preserved, so that this update does not force me to start over.
13. As a returning player, I want an unfinished level to resume at its next incomplete treatment, so that completed work is retained.
14. As a player selecting a completed level, I want a fresh replay, so that I can experience its transformation again.
15. As a player, I want a small in-level menu button offering level selection, so that I can leave a run deliberately.
16. As a player leaving mid-treatment, I want a brief confirmation explaining that the current treatment will restart, so that the consequence is clear.
17. As a player canceling that confirmation, I want to continue the same run with my work intact, so that opening the menu does not reset progress.
18. As a returning player, I want previously completed effects reconstructed correctly, so that the resumed image matches my checkpoint.
19. As a player, I want food scraps and worms available together, so that I can choose my extraction order.
20. As a player, I want food placement to stay separate from worm spaces, so that neither obscures the other.
21. As a player, I want to hold an item, pull it free and drop it into a visible petri dish, so that extraction has an understandable destination.
22. As a player, I want an invalid drop to return the item rather than count as collected, so that collection behaves consistently.
23. As a player, I want the dish to accept forgiving drops, so that small touch inaccuracies do not make collection frustrating.
24. As a player, I want collected scraps and worms to retain their original on-mouth scale, so that they do not shrink when dropped.
25. As a player, I want anchored, held and collected debris to appear above the dish, so that its rim never incorrectly hides an item.
26. As a player, I want animated worms that match the mouth's visual style, so that the shocking starting state feels cohesive.
27. As a player, I want scraping to remove rough crust while leaving yellow teeth, so that this treatment has a distinct purpose.
28. As a player, I want the handpiece to remove deposits in tight gaps, so that those spaces visibly clear.
29. As a player, I want flossing to remove fibers between teeth without whitening enamel, so that it behaves like the action shown.
30. As a player, I want applying toothpaste to visibly add paste without cleaning stains yet, so that brushing remains the cleaning step.
31. As a player, I want brushing to remove yellow stains and build foam, so that it produces a large, satisfying visual transformation.
32. As a player, I want suction to clear foam and expose cleaned teeth, so that I can see the result of brushing.
33. As a player, I want suction to lead directly to polishing, so that the disliked mouthwash interaction is absent.
34. As a player, I want polishing to reveal a pearl-white finish, so that the level ends with a clear final payoff.
35. As a player, I want every treatment's generated artwork and effects to fit the mouth, so that the production port preserves the prototype's visual direction.
36. As a player, I want treatment transitions to ignore leftover input, so that completing one action does not accidentally advance the next.
37. As a player finishing either level, I want Replay and Levels choices, so that I can repeat the experience or choose another level.
38. As a player finishing Level 1, I want Next to enter Level 2, so that I can continue directly.
39. As a player finishing Level 2, I want to return to selection instead of an end-of-content detour, so that the available choices stay useful.
40. As a player replaying a level, I want only that level reset, so that the other level's checkpoint is untouched.
41. As a player switching levels while storage is slow, I want saves to remain associated with the correct level, so that delayed writes cannot corrupt another run.
42. As a player whose saved progress cannot yet be read, I want existing data protected, so that a temporary read problem does not erase it.
43. As a player interrupted by focus loss or a platform pause, I want held tools released safely and progress paused, so that returning does not cause stuck input or unintended actions.
44. As a player, I want platform audio and restart behavior to work for the selected level, so that the new navigation respects the host environment.
45. As an existing player, I want Level 1's treatments to remain intact, so that adding another level does not degrade the completed makeover.

## Implementation Decisions

- Implement native Defold gameplay and navigation, using the prototype as interaction and artwork evidence rather than embedding the HTML prototype.
- Use a small level catalog with stable identities, display metadata, thumbnails, treatment sequences and artwork references. Remove single-level ownership assumptions from navigation, the treatment runner, portrait renderer and camera integration.
- Home contains the title, a simple soft pastel background and one large Play button with a gentle scale pulse. Its effective touch target remains stable. Play always opens level selection.
- Selection contains exactly two unlocked cards, side by side within the portrait area. Borrow the reference's pastel palette, rounded cards, white borders and small level numbers; use original game artwork rather than copying reference-game assets. Thumbnails depict each level's dirty starting state.
- Keep portrait composition on both phone and wide displays, extending the background around it. Size text and hit areas for phone use. Revisit GUI allocation for the additional screens and thumbnails.
- Every launch opens Home. Entry through selection or Next uses the same resume-or-fresh policy: unfinished levels resume at their checkpoint; completed levels begin a fresh replay.
- A treatment checkpoint records the boundary after a completed treatment, not partial strokes, held items or a partially completed collection. Restore the visual effects of completed treatments and restart the unfinished treatment.
- Keep checkpoints independent per level. Extend the current persistence contract to carry level identity and checkpoint/completion state; migrate existing Level 1 saves. Preserve protections for unknown or delayed reads, unsupported records, retries, higher progress and Replay overriding stale writes. Pending operations must retain their originating level identity.
- An in-level menu offers return to selection with an explicit confirmation about restarting the current treatment. Confirm saves/retains completed boundaries and leaves the run. Cancel preserves in-memory treatment progress. Opening or dismissing menus must not advance gameplay accidentally.
- Results offer Replay and Levels. Level 1 additionally offers Next to Level 2. Level 2 has neither Next nor an end-of-content detour. Replay resets only the selected level.
- Port exactly eight dental treatments in the order below. Preserve the approved transition guard, input cancellation, camera alignment, forgiving interaction areas and visible treatment payoffs.

| Treatment | Interaction and result |
| --- | --- |
| Collect leftovers | Nine food scraps and four worms are available together. Hold, pull free, then release over one generated glass petri dish. Count collection only on a valid drop; otherwise return the item. Progress continues after all thirteen items are collected. |
| Scrape crust | Scaler strokes remove rough dirty buildup and reveal smooth, visibly yellow enamel. |
| Clean tight gaps | Holding the handpiece removes gap deposits without whitening enamel. |
| Floss | Sweeping removes trapped fibers only. Enamel stays yellow. |
| Apply toothpaste | Holding adds visible mint paste across both rows. Stains remain. |
| Brush | Strokes remove yellow stains, reveal clean ivory enamel and build generated foam. |
| Suction | Holding over foam removes it and exposes cleaned enamel. |
| Polish | Buffing reveals the final pearl-white finish. |

- Keep food spawn bounds clear of reserved worm spaces. Keep collected food and worms visibly separate within the single dish. Use the same camera-relative sprite scale on the mouth and after collection. Composite the dish below anchored, held and collected debris. Preserve the six-frame worm loop and pull feedback.
- Use the existing generated registered mouth plates, tools, food, worms and treatment effects. Author production regions, masks and manifests; adapt the asset pipeline for per-level atlases and differing sheet layouts. Retain source artwork, generation prompts and provenance. Code supplies interaction, masking, motion and compositing, not substitute vector artwork for treatment assets.
- Load the selected level under a transition so old artwork or input cannot leak into the new level. Preserve Level 1's treatment design while generalizing shared infrastructure.
- Preserve Playgama pause, audio and restart integration for menus and both levels. Continue the existing Playgama-compatible HTML5 packaging workflow; distribution remains through Playgama.
- Preserve the latest prototype corrections during integration: combined collection, generated petri dish, correct scale/z-order, eight treatments, no mouthwash and whitening during brushing. Older prototype descriptions are not authoritative where they conflict with these decisions.

## Testing Decisions

- The user approved the existing built-game browser tests as the primary testing seam: real mouse/touch input, rendered output, navigation and persistence-visible behavior. Reuse existing platform persistence and lifecycle fixtures to control save delays, legacy records and host events. Do not add internal gameplay APIs solely for testing.
- Good tests assert what a player or host can observe: which screen appears, which treatment resumes, what an action visibly changes, what survives reload, and whether pause prevents progress. Do not couple tests to private runner data structures, draw-call counts or incidental module organization.
- Exercise navigation, the level-aware treatment runner/renderer and checkpoint adapter through that shared browser seam. Existing launch, finish, extraction, presentation, persistence, lifecycle and packaged-build checks provide prior art, including pointer helpers and screenshot/pixel comparisons.
- Update existing entry helpers and result assertions that assume direct Level 1 startup or Next leading to end-of-content. Continue Level 1 regression checks and play both levels to completion.
- Verify fresh and returning sessions open Home; Play exposes exactly two unlocked cards; selection, completed-level entry, Replay, Levels and Next use the agreed routes. Verify exit confirmation, cancellation without lost partial work, and confirmed exit restarting only the incomplete treatment.
- Check phone and wide-screen layout captures for readable text, accessible cards, correct thumbnails, centered portrait content and gentle Play motion. Validate real touch collection as well as mouse playthroughs.
- Resume at every Level 2 treatment boundary and verify the correct enamel, deposits, paste and foam. Exercise leaving during extraction, flossing and brushing. Check per-level independence, legacy Level 1 migration, delayed writes during level switching and replay, unknown/unsupported reads, retries and progress preservation.
- Collect food and worms in mixed order. Verify thirteen-item completion, nonoverlapping spawn regions, valid/invalid drops, forgiving dish targeting, same on-mouth/drop scale, correct layering over the rim, and pointer cancellation.
- Compare stable enamel regions to confirm flossing does not whiten them. Verify brushing visibly changes yellow enamel to clean ivory, suction exposes it, and polishing produces the final finish. Confirm mouthwash is absent and suction leads directly to polish.
- Exercise focus loss and host pause during drags, transitions and menus. Resume without stuck objects, unintended progress or audio violations. Verify host restart acts on the selected level.
- Run existing package checks against the produced build and verify all selected-level assets load. Capture visual evidence for the dental sequence and navigation rather than relying only on successful loading.

## Out of Scope

- Mouthwash or replacement treatments beyond the approved eight.
- Level locks, progression gates, currency, economy or new ad behavior.
- Placeholder levels, pagination, additional levels or a broader menu system.
- Redesigning Level 1 treatments.
- Saving partial treatment state or automatically bypassing Home to resume gameplay.
- Shipping prototype Review/debug controls in the player interface.
- Replacing generated treatment artwork with vector stand-ins or copying the reference game's assets.
- A separate YouTube-specific release package or direct publication outside the established Playgama workflow.

## Further Notes

The user approved the visual direction, transfer scope, unlocked levels, thumbnail subjects, independent checkpoints, exit behavior, result navigation and portrait layout. The testing seams were separately confirmed during spec preparation. No additional product interview is required before implementation.

The latest local prototype includes corrections beyond its earlier published snapshot; preserve those changes and selected assets before preparing the production integration branch. Prototype history and initial exploration are tracked in https://github.com/BoundedOfficial/Runway-Rewind/issues/14. This specification supersedes earlier nine- or ten-treatment descriptions and early floss-whitening behavior.

Implementation should proceed from shared level ownership and safe checkpoint migration to navigation, production asset authoring, dental mechanics, then browser/visual regression checks and packaging. Prepare the resulting change as a PR to main. Creating this specification does not itself begin gameplay implementation.

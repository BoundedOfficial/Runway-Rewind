# Level 2 prototype: The Deep Clean

Throwaway HTML5 gameplay prototype, isolated on `codex/level-2-teeth-prototype`. This is not part of the Level 1 PR and is not Defold production code.

The design question: does an exaggerated, shocking dental before-state sustain a satisfying ten-treatment cleanup without repeating the same action? The verdict is pending user playtesting. This is a playable sequence, not a layout-variant gallery.

## Run

From the repository root:

```powershell
node prototypes/level-2-teeth/serve.cjs
```

Open http://127.0.0.1:5175/. No dependencies or build step. The game uses mouse or touch, keeps state in memory, and offers optional synthesized sound. Restart resets the whole sequence. The Review control can jump to any treatment and displays its progress/state.

## Treatments

1. Tweezers: hold and pull nine food remnants free, then drop them in the collection dish.
2. Tweezers: hold and pull four animated worms free, then drop them in the separate worm compartment.
3. Scaler: scrape away the heavy tartar crust.
4. Handpiece: hold over tight gaps to break down deposits.
5. Floss pick: sweep between teeth.
6. Toothpaste: apply mint paste across both rows.
7. Toothbrush: brush back and forth to reveal the clean enamel and build foam.
8. Suction: clear the foam.
9. Mouthwash: swish across the smile.
10. Polisher: buff each tooth, then compare before/after and replay.

Dental actions and worms are fictional makeover gameplay, not dental-care instructions. No drilling holes, tooth removal, injury, or real medical simulation is implemented.

## Artwork and interaction

The built-in image-generation tool created the registered clean/dirty mouth plates, nine-tool sheet, food cutouts, and six-frame worm loop. Prompts are retained in `assets/prompts.json` and `assets/revision-prompts.json`. The revision adds registered descaled/polished plates and a transparent treatment sheet containing the two-compartment dish, deposits, fibers, paste, foam, and mouthwash. Food and worms are independent sprites; only the grabbed object moves. Worms wriggle with staggered frame timing and stretch slightly when pulled. Warm lighting, transparent edges, and restrained shadows keep the objects consistent with the mouth artwork.

The canvas uses a 640 × 960 stage and a fixed close-up camera. Reserved worm bounds are checked against every food spawn, with padding. Extracted items only count after release over the forgiving collection dish; releasing elsewhere returns them to their original position. Separate dish slots keep collected food and worms apart. Brush strokes reveal registered treatment plates through an alpha mask. Treatments have independent progress; transition time prevents an accidental input from affecting the next treatment. Browser blur and pointer cancellation release held objects. Scraping reveals the generated yellow descaled plate; flossing removes generated fibers and reveals ivory enamel; paste becomes generated foam; suction clears it; generated mouthwash swishes and drains; polishing reveals the registered pearl-white plate. Treatment sprites replace the procedural paste, foam, water, sparkles, and particle circles.

## Playthrough observations

The ten-stage mouse playthrough reached the finished smile through actual pointer inputs. Phone-size before, held-tool, and final states were visually inspected at 390 × 844. The generated worms and food replace the initial procedural drawings following user feedback. The revised sequence also completed all ten treatments through mouse input; emulated touch collected both food and worms in the dish. The spacing guard passed, and the generated effects sheet contains transparent pixels. Physical-device feel and desired shock level remain for user review.

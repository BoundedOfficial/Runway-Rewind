# Reference makeup tool scale

Skincare Time 0.9.6, version code 114, was read from the supplied XAPK. The archive SHA-256 is `84cb163bbbe185f8ffc8a9cb22b4f38fb7f776e98e749fd9ce455cdfed16a0cd`. REA inventory evidence is `ev_41436eb12aec4407cbb297f70b517d629530aba1ee805dd79eab4c8dc4685df8`. REA metadata evidence `ev_0b9bf804fd26ffc287426f9685b11a01298eafc6e5ca93724a1d9108766ad511` identifies Unity IL2CPP metadata v31. The size calculations come from the base APK's Unity 6000.0.58f2 Addressables bundles.

The static measurement multiplies the Sprite rectangle divided by its pixels per unit by the serialized Transform scales along the renderer's parent chain. Compare the longest tool dimension with the head height, since the authored brow pencil is horizontal and the blush brush is angled. The head dimension is the head sprite, measured separately from the body and hair. UnityPy decoding confirms the L198 and LC038 head alpha spans the full texture height.

| Tool | Reference level | Authored world dimensions | Longest dimension / head height |
| --- | --- | --- | --- |
| Eye brush | L198 | 0.84 × 4.88 | 62% |
| Brow pencil | L198 | 5.24 × 0.40 | 66% |
| Lipstick | L198 | 0.721 × 4.067 | 52% |
| Cheek brush | L198 | 1.01 × 3.48 | 44% |
| Cheek brush | LC038 | 0.856 × 4.136 unrotated | 53% |
| Contour blending brush | LC038 | 0.71 × 3.22 | 42% |
| Contour pencil | LC038 | 0.629 × 4.242 | 55% |
| Foundation sponge | LC038 | 1.41 × 1.87 | 24% |

- L198 uses `level_198_assets_all_97175dc3c8733a1402a98208e3a13f73.bundle`, serialized file `CAB-62832f6d704f1e879a27d0c8e55939e5`. Under `L_198/Anchor/Sprites`, `Base/BaseHead` is 6.24 × 7.89 units (renderer `-3159333494224290258`). Tool renderers under `Tools` are `EyeShadowBrush/Sprite` (`5668850596154670638`), `EyebrowDrawerLeft/Sprite` (`9155607185908137518`), `LipStick/Sprite` (`-8957712443055768018`) and `CushionBrush/Sprite` (`-7656936711906427346`). Lipstick uses a 0.7 transform applied to a 103 × 581 sprite at 100 pixels per unit. Eye brush, brow pencil and cheek brush use a unit transform at 100 pixels per unit.
- LC038 uses `level_038_assets_all_9d8fb7a524d7f8fbca21f260703cb4f4.bundle`, serialized file `CAB-560d24f8fcdbb71a78c2fe80b31d96c7`. `LC_038/Sprites/asset/Base_head` is 7.55 × 7.74 units (renderer `-1632222484923722733`). Its foundation sponge, contour blending brush and contour pencil renderer IDs are `-940809607610870765`, `6939328983662679059` and `5850632765444281363`. `LC_038/Sequence/Sequence-step3.3_ma hong/CheekBrush/Sprite` has SkeletonAnimation `6391066195863098387` and references the shared `coma_SkeletonData` asset `-711664718841774448`. The Spine mesh `co-ma-add1` is authored at 107 × 517 with data scale 0.01 and transform 0.8. Its weighted setup vertices give a 4.17-unit longest point-to-point span, also 54% of the head height.
- `L_SCStar_001` provides a smaller comparison with an 8.73-unit face, 3.20-unit brow pen, 2.24-unit lipstick and 1.87-unit sponge. The package has level-specific artwork and scales.

For a roughly 400 px base head and a 118 px Runway Rewind tool canvas, choose the larger measured brush and lipstick variants and keep their size proportional through portrait zoom. Approximate visible dimensions below use a source alpha threshold of 16 and omit camera magnification.

| Runway Rewind artwork | Suggested scale | Visible width × height | Height / 400 px |
| --- | ---: | ---: | ---: |
| Foundation sponge | 1.85 | 127 × 177 px | 44% |
| Brow brush | 2.35 | 40 × 259 px | 65% |
| Eye brush | 2.20 | 61 × 252 px | 63% |
| Blush brush, also used for contour | 1.95 | 115 × 219 px | 55% |
| Lipstick | 1.90 | 62 × 211 px | 53% |

The foundation sponge increase is a design choice based on the user's request. At scale 1.55, the existing Runway Rewind sponge is already larger relative to the face than the measured reference sponge. The cheek artwork in Runway Rewind is also wider than the reference brushes, so matching length yields a larger head on the brush. These are serialized sizes and static geometry. Animation, camera placement, frame clipping, and device-specific framing were unobserved.

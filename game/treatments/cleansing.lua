local artwork = require "portrait.artwork"
local LIP_CAMERA = { scale = 1.12, y = 490 }

return {
    {
        id = "pimple-extraction",
        label = "Extract pimples",
        regions = artwork.extraction,
        target_radius = 13,
        extraction_time = { approach = 0.24, press = 0.21, retract = 0.34 },
        settle_time = 0.22,
        tool = { artwork = "extractor", tip_x = 0, tip_y = -49 },
    },
    {
        id = "cleansing-cream",
        label = "Cleansing cream",
        regions = { "cream-forehead", "cream-left", "cream-right" },
        transient = true,
        radius = 42,
        tool = { artwork = "cream-spatula", tip_x = 2, tip_y = -54, sway = 10 },
    },
    {
        id = "cleansing-wipe",
        label = "Wipe and cleanse",
        regions = { "clean-forehead", "clean-left", "clean-right" },
        removes_transient = true,
        radius = 42,
        tool = { artwork = "cotton-wipe", tip_x = 0, tip_y = 0, sway = 6 },
    },
    {
        id = "robe-cleanup",
        label = "Clean the robe",
        regions = { "robe-L", "robe-R" },
        radius = 48,
        tool = { artwork = "fabric-pad", tip_x = 0, tip_y = 3, sway = 8 },
    },
    {
        id = "eyebrow-shave",
        label = "Shape the brows",
        regions = { "brow-clean-L", "brow-clean-R" },
        radius = 27,
        tool = { artwork = "eyebrow-razor", tip_x = 8, tip_y = -38, sway = 5 },
    },
    {
        id = "lip-scrub",
        label = "Lip scrub",
        regions = { "scrub" },
        transient = true,
        radius = 26,
        camera = LIP_CAMERA,
        tool = { artwork = "lip-scrub-brush", tip_x = 0, tip_y = -38, sway = 9 },
    },
    {
        id = "lip-hydration",
        label = "Hydrate the lips",
        regions = { "hydrated-lips" },
        removes_transient = true,
        radius = 31,
        camera = LIP_CAMERA,
        tool = { artwork = "lip-sponge", tip_x = 0, tip_y = 4, sway = 7 },
    },
}

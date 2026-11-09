return {
    {
        id = "foundation",
        label = "Blend foundation",
        regions = { "foundation" },
        radius = 42,
        tool = { artwork = "foundation-sponge", tip_x = 0, tip_y = -15, scale = 1.95, follow_camera = true, sway = 7 },
    },
    {
        id = "eyebrow-fill",
        label = "Fill the brows",
        regions = { "brow-L", "brow-R" },
        radius = 26,
        tool = { artwork = "brow-brush", tip_x = 1, tip_y = -46, scale = 2.45, follow_camera = true, sway = 8 },
    },
    {
        id = "eye-makeup",
        label = "Eye makeup",
        regions = { "eye-look-L", "eye-look-R" },
        radius = 42,
        camera = { scale = 1.18, y = 410 },
        tool = { artwork = "eye-brush", tip_x = 0, tip_y = -43, scale = 2.3, follow_camera = true, sway = 9 },
    },
    {
        id = "blush-contour",
        label = "Blush and contour",
        regions = { "blush-L", "blush-R", "contour-L", "contour-R" },
        radius = 42,
        tool = { artwork = "blush-brush", tip_x = 3, tip_y = -35, scale = 2.2, follow_camera = true, sway = 11 },
    },
    {
        id = "lipstick",
        label = "Crimson lipstick",
        regions = { "lipstick" },
        radius = 34,
        camera = { scale = 1.12, y = 490 },
        tool = { artwork = "lipstick-bullet", tip_x = 1, tip_y = -46, scale = 2.05, follow_camera = true, sway = 6 },
    },
}

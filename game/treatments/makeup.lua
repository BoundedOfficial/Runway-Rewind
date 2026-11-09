return {
    {
        id = "foundation",
        label = "Blend foundation",
        regions = { "foundation" },
        radius = 42,
        tool = { artwork = "foundation-sponge", tip_x = 0, tip_y = -45, sway = 7 },
    },
    {
        id = "eyebrow-fill",
        label = "Fill the brows",
        regions = { "brow-L", "brow-R" },
        radius = 26,
        tool = { artwork = "brow-brush", tip_x = 6, tip_y = -53, sway = 8 },
    },
    {
        id = "eye-makeup",
        label = "Sweep on eye makeup",
        regions = { "eye-look-L", "eye-look-R" },
        radius = 42,
        camera = { scale = 1.23, y = 400 },
        tool = { artwork = "eye-brush", tip_x = 0, tip_y = -50, sway = 9 },
    },
    {
        id = "blush-contour",
        label = "Apply blush and contour",
        regions = { "blush-L", "blush-R", "contour-L", "contour-R" },
        radius = 42,
        tool = { artwork = "blush-brush", tip_x = 4, tip_y = -49, sway = 11 },
    },
    {
        id = "lipstick",
        label = "Apply crimson lipstick",
        regions = { "lipstick" },
        radius = 34,
        camera = { scale = 1.12, y = 490 },
        tool = { artwork = "lipstick-bullet", tip_x = 3, tip_y = -54, sway = 6 },
    },
}

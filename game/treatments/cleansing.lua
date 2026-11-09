return {
    {
        id = "cleansing-cream",
        label = "Apply cleansing cream",
        regions = { "cream-forehead", "cream-left", "cream-right" },
        transient = true,
        radius = 42,
        tool = { artwork = "cream-spatula", tip_x = 2, tip_y = -54, sway = 10 },
    },
    {
        id = "cleansing-wipe",
        label = "Wipe face and neck",
        regions = { "clean-forehead", "clean-left", "clean-right" },
        removes_transient = true,
        radius = 42,
        tool = { artwork = "cotton-wipe", tip_x = 0, tip_y = 0, sway = 6 },
    },
}

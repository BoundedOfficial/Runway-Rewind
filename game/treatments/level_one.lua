local sequence = {}
for _, group in ipairs({ require("treatments.cleansing"), require("treatments.makeup") }) do
    for _, treatment in ipairs(group) do
        sequence[#sequence + 1] = treatment
    end
end

sequence[#sequence + 1] = {
    id = "hair-styling",
    label = "Style the hair",
    regions = { "style-L", "style-R" },
    radius = 62,
    settle_time = 0.7,
    tool = { artwork = "styling-brush", tip_x = 0, tip_y = -36, sway = 9 },
}

return sequence

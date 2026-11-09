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
    sweep = {
        distance = 400,
        -- Each row gives y and the left/right edges of the brushable loose hair.
        -- The ranges follow the crown, side locks, and ends on each side.
        ranges = {
            {
                { 0, 104, 320 }, { 100, 18, 320 }, { 178, 0, 320 },
                { 246, 0, 201 }, { 380, 0, 177 }, { 480, 0, 206 },
                { 635, 0, 222 }, { 731, 0, 225 }, { 778, 92, 223 },
                { 846, 125, 221 }, { 922, 133, 178 },
            },
            {
                { 0, 320, 557 }, { 100, 320, 630 }, { 178, 320, 640 },
                { 246, 437, 640 }, { 380, 462, 640 }, { 480, 431, 640 },
                { 635, 408, 640 }, { 710, 438, 640 }, { 785, 595, 640 },
            },
        },
    },
    tool = { artwork = "styling-brush", tip_x = 0, tip_y = -36, sway = 9 },
}

return sequence

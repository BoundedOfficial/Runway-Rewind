local artwork = require "portrait.artwork"

local M = {}
local CENTER_X, CENTER_Y = artwork.width / 2, artwork.height / 2
local TARGET_COLOR = vmath.vector4(1, 1, 0.69, 0.55)

local function marker()
    local node = gui.new_box_node(vmath.vector3(), vmath.vector3())
    gui.set_material(node, "target_guide")
    gui.set_enabled(node, false)
    return node
end

local function place(node, x, y)
    gui.set_position(node, vmath.vector3(x, artwork.height - y, 0))
end

local function shape(node, radius, dashes, sparkle)
    local size = 2 * radius + 6
    gui.set_size(node, vmath.vector3(size, size, 0))
    gui.set(node, "guide", vmath.vector4(radius, dashes, sparkle, 0))
end

function M.create(sequence)
    local count = 0
    for _, treatment in ipairs(sequence) do
        count = math.max(count, #treatment.regions)
    end
    local self = { targets = {} }
    for index = 1, count do
        local node = marker()
        gui.set_color(node, TARGET_COLOR)
        self.targets[index] = node
    end
    return self
end

function M.clear(self)
    for _, node in ipairs(self.targets) do
        gui.set_enabled(node, false)
    end
end

function M.show(self, treatment, camera)
    for index, id in ipairs(treatment.regions) do
        local region = artwork.regions[id]
        local anchor = region.anchor
        local x, y, radius, sparkle
        if anchor then
            x, y = anchor[1], anchor[2]
            -- The authored side-hair target is much smaller than its artwork.
            radius = region.hitShape and 32 or math.min(region.width, region.height) * 0.35
            sparkle = 0
        else
            x, y = region.x + region.width / 2, region.y + region.height / 2
            radius = math.min(24, region.width / 4, region.height / 4)
            sparkle = 8
        end
        local dashes = math.floor(2 * math.pi * radius / 8 + 0.5)
        local node = self.targets[index]
        place(node, CENTER_X + (x - camera.x) * camera.z, CENTER_Y + (y - camera.y) * camera.z)
        shape(node, radius * camera.z, dashes, sparkle * camera.z)
        gui.set_alpha(node, TARGET_COLOR.w)
        gui.set_enabled(node, true)
    end
end

function M.complete(self, index)
    gui.set_enabled(self.targets[index], false)
end

function M.hold(self)
    for _, node in ipairs(self.targets) do
        gui.set_alpha(node, 0.80)
    end
end

function M.release(self)
    for _, node in ipairs(self.targets) do
        gui.set_alpha(node, TARGET_COLOR.w)
    end
end

return M

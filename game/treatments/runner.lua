local artwork = require "portrait.artwork"

local M = {}
local RENDER = "@render:"
local REST = vmath.vector3(320, 828, 0)
local OFFSTAGE = vmath.vector3(710, 828, 0)
local TOOL_SIZE = 118
local TIP_X, TIP_Y = 28, -24
local TIMING = { entering = 0.46, returning = 0.27, completing = 0.18, exiting = 0.28 }
local CENTER_X, CENTER_Y = artwork.width / 2, artwork.height / 2
local DEFAULT_CAMERA = vmath.vector3(CENTER_X, CENTER_Y, 1)
local STEP_PAST = vmath.vector4(0.82, 0.61, 0.50, 1)
local STEP_CURRENT = vmath.vector4(1, 0.80, 0.58, 1)
local STEP_PENDING = vmath.vector4(0.43, 0.31, 0.28, 1)
local HINT_DELAY, HINT_LENGTH = 2.4, 1.25

local function ease(t)
    return t * t * (3 - 2 * t)
end

local function position(self, x, y, angle)
    self.pose = vmath.vector3(x, y, angle)
    gui.set_position(self.tool_node, vmath.vector3(x, artwork.height - y, 0))
    gui.set_rotation(self.tool_node, vmath.vector3(0, 0, angle))
end

local function animate(self, state, to)
    self.state = state
    self.elapsed = 0
    self.from = self.pose
    self.to = to
end

local function set_camera(self, camera)
    self.camera = camera
    msg.post(RENDER, "frame_portrait", { camera = camera })
end

local function frame_during_transition(self, camera)
    self.camera_from = self.camera
    self.camera_to = camera and vmath.vector3(camera.x or CENTER_X, camera.y or CENTER_Y, camera.scale)
        or DEFAULT_CAMERA
end

local function clear_guidance(self)
    gui.set_enabled(self.hud.ring, false)
    gui.set_enabled(self.hud.instruction, false)
end

local function reset_guidance(self)
    self.idle, self.hint = 0, nil
    clear_guidance(self)
end

local function begin(self, index)
    self.index = index
    local treatment = self.sequence[index]
    self.treatment = treatment
    reset_guidance(self)
    if not treatment then
        self.state = "finished"
        gui.set_enabled(self.tool_node, false)
        gui.set_enabled(self.hud.background, false)
        return
    end

    self.regions = {}
    for i, id in ipairs(treatment.regions) do
        self.regions[i] = { cells = assert(artwork.regions[id], id).cells, hit = {}, count = 0 }
    end
    msg.post(RENDER, "begin_treatment", {
        regions = treatment.regions,
        transient = treatment.transient,
        removes_transient = treatment.removes_transient,
    })
    gui.set_text(self.hud.label, treatment.label)
    for i, step in ipairs(self.hud.steps) do
        gui.set_color(step, i < index and STEP_PAST or i == index and STEP_CURRENT or STEP_PENDING)
    end
    gui.set_enabled(self.hud.background, true)
    gui.set_enabled(self.tool_node, true)
    gui.play_flipbook(self.tool_node, treatment.tool.artwork)
    position(self, OFFSTAGE.x, OFFSTAGE.y, 0)
    animate(self, "entering", REST)
    frame_during_transition(self, treatment.camera)
end

function M.start(sequence, hud, tool_node, first_unfinished)
    local self = {
        sequence = sequence, hud = hud, tool_node = tool_node, camera = DEFAULT_CAMERA,
        demonstrate = first_unfinished == 1,
    }
    local portrait = { completed = {} }
    for i = 1, first_unfinished - 1 do
        local treatment = sequence[i]
        if treatment.transient then
            portrait.transient = treatment.regions
        else
            for _, id in ipairs(treatment.regions) do
                portrait.completed[#portrait.completed + 1] = id
            end
            if treatment.removes_transient then portrait.transient = nil end
        end
    end
    msg.post(RENDER, "reset_portrait", portrait)
    begin(self, first_unfinished)
    return self
end

local function paint(self, ax, ay, bx, by)
    local dx, dy = bx - ax, by - ay
    local span = dx * dx + dy * dy
    local radius = self.treatment.radius
    local core_squared = (0.65 * radius) ^ 2
    local advanced = false
    for index, region in ipairs(self.regions) do
        if not region.settle then
            local touched = false
            for i, cell in ipairs(region.cells) do
                local x, y = cell[1] - ax, cell[2] - ay
                local t = span > 0 and math.min(1, math.max(0, (x * dx + y * dy) / span)) or 0
                if (x - dx * t) ^ 2 + (y - dy * t) ^ 2 < core_squared then
                    touched = true
                    if not region.hit[i] then
                        region.hit[i] = true
                        region.count = region.count + 1
                        advanced = true
                    end
                end
            end
            if touched then
                msg.post(RENDER, "paint_region", { index = index, ax = ax, ay = ay, bx = bx, by = by, radius = radius })
                if region.count >= 0.8 * #region.cells then
                    region.settle = 0
                end
            end
        end
    end
    if advanced then reset_guidance(self) end
end

local function extract(self, x, y)
    local nearest
    local distance = self.treatment.target_radius ^ 2
    for index, id in ipairs(self.treatment.regions) do
        local anchor = artwork.regions[id].anchor
        local squared = (x - anchor[1]) ^ 2 + (y - anchor[2]) ^ 2
        if squared < distance then
            nearest, distance = self.regions[index], squared
        end
    end
    if nearest and not nearest.settle then
        nearest.settle = 0
        reset_guidance(self)
    end
end

local function portrait_point(camera, x, y)
    return camera.x + (x - CENTER_X) / camera.z, camera.y + (y - CENTER_Y) / camera.z
end

local function remaining_target(self)
    for index, region in ipairs(self.regions) do
        if not region.settle then
            if self.treatment.target_radius then
                return artwork.regions[self.treatment.regions[index]].anchor
            end
            local x, y = 0, 0
            for i, cell in ipairs(region.cells) do
                if not region.hit[i] then x, y = x + cell[1], y + cell[2] end
            end
            local remaining = #region.cells - region.count
            x, y = x / remaining, y / remaining
            local closest, distance = nil, math.huge
            for i, cell in ipairs(region.cells) do
                if not region.hit[i] then
                    local squared = (cell[1] - x) ^ 2 + (cell[2] - y) ^ 2
                    if squared < distance then closest, distance = cell, squared end
                end
            end
            return closest
        end
    end
end

local function guide(self, dt)
    self.idle = self.idle + dt
    local teaching = self.demonstrate
    local delay = teaching and 0.18 or HINT_DELAY
    local length = teaching and 1.5 or HINT_LENGTH
    if self.idle < delay then return end
    local t = (self.idle - delay) / length
    if t >= 1 then
        reset_guidance(self)
        return
    end
    self.hint = self.hint or remaining_target(self)
    if not self.hint then return end
    local camera = self.camera
    local x = CENTER_X + (self.hint[1] - camera.x) * camera.z
    local y = CENTER_Y + (self.hint[2] - camera.y) * camera.z
    if teaching then
        local travel = ease(math.min(1, t * 1.25))
        x, y = REST.x + (x - REST.x) * travel, REST.y + (y - REST.y) * travel
    end
    local ring = self.hud.ring
    gui.set_position(ring, vmath.vector3(x, artwork.height - y, 0))
    gui.set_alpha(ring, math.min(1, t * 7, (1 - t) * 5))
    gui.set_enabled(ring, not self.tip_x or (self.tip_x - x) ^ 2 + (self.tip_y - y) ^ 2 > 38 ^ 2)
    gui.set_enabled(self.hud.instruction, teaching)
end

local function aim(self, x, y)
    -- Coverage runs in portrait space. The tool pose stays in stage space.
    local tip_x, tip_y = x + TIP_X, y + TIP_Y
    local bx, by = portrait_point(self.camera, tip_x, tip_y)
    if self.treatment.target_radius then
        extract(self, bx, by)
    elseif self.tip_x and (tip_x ~= self.tip_x or tip_y ~= self.tip_y) then
        local ax, ay = portrait_point(self.camera, self.tip_x, self.tip_y)
        paint(self, ax, ay, bx, by)
    end
    self.tip_x, self.tip_y = tip_x, tip_y
end

local function held_pose(self)
    local tool = self.treatment.tool
    local angle = math.sin(self.elapsed * 11) * tool.sway * 0.72
    local radians = math.rad(angle)
    local sin, cos = math.sin(radians), math.cos(radians)
    -- Rotate around the artwork tip, which is also the endpoint of coverage.
    local x = tool.tip_x * cos + tool.tip_y * sin
    local y = -tool.tip_x * sin + tool.tip_y * cos
    position(self, self.tip_x - x, self.tip_y - y, angle)
end

function M.cancel(self, pointer_lost)
    if pointer_lost then self.pointer_down = false end
    self.tip_x, self.tip_y = nil, nil
    if self.state == "held" then
        animate(self, "returning", REST)
        clear_guidance(self)
    end
end

function M.input(self, x, y, pressed, released, pointer_button)
    if pointer_button and released then
        M.cancel(self, true)
    elseif pointer_button and pressed and not self.pointer_down then
        self.pointer_down = true
        if self.state == "ready" and math.abs(x - REST.x) <= TOOL_SIZE / 2 and
                math.abs(y - REST.y) <= TOOL_SIZE / 2 then
            self.state, self.elapsed = "held", 0
            if self.demonstrate then
                self.demonstrate = false
                reset_guidance(self)
            end
            aim(self, x, y)
            held_pose(self)
        end
    elseif self.state == "held" then
        aim(self, x, y)
        held_pose(self)
    end
end

local function settle(self, dt)
    local complete = true
    local duration = self.treatment.settle_time or 0.32
    for index, region in ipairs(self.regions) do
        if region.settle and region.settle < 1 then
            region.settle = math.min(1, region.settle + dt / duration)
            msg.post(RENDER, "settle_region", { index = index, amount = ease(region.settle) })
        end
        if region.settle ~= 1 then complete = false end
    end
    return complete
end

function M.update(self, dt)
    local state = self.state
    if state == "finished" then return end
    if state ~= "completing" and state ~= "exiting" and settle(self, dt) then
        msg.post(RENDER, "commit_treatment")
        self.tip_x, self.tip_y = nil, nil
        local pose = self.pose
        clear_guidance(self)
        animate(self, "completing", vmath.vector3(pose.x, pose.y - 8, pose.z + 4))
        return self.treatment.id
    end

    if state == "ready" or state == "held" then guide(self, dt) end
    if state == "ready" then return end
    self.elapsed = self.elapsed + dt
    if state == "held" then
        held_pose(self)
        return
    end

    local t = math.min(1, self.elapsed / TIMING[state])
    local pose = vmath.lerp(ease(t), self.from, self.to)
    position(self, pose.x, pose.y, pose.z)
    if self.camera_to and self.camera_from ~= self.camera_to then
        set_camera(self, vmath.lerp(ease(t), self.camera_from, self.camera_to))
    end
    if t < 1 then return end
    self.camera_from, self.camera_to = nil, nil
    if state == "completing" then
        animate(self, "exiting", OFFSTAGE)
        if not self.sequence[self.index + 1] then
            frame_during_transition(self)
        end
    elseif state == "exiting" then
        begin(self, self.index + 1)
        return nil, self.state == "finished"
    else
        self.state = "ready"
    end
end

return M

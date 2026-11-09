local artwork = require "portrait.artwork"

local M = {}
local RENDER = "@render:"
local REST = vmath.vector3(320, 828, 0)
local OFFSTAGE = vmath.vector3(710, 828, 0)
local TOOL_SIZE = 118
local TIP_X, TIP_Y = 28, -24
local TIMING = { entering = 0.4, returning = 0.25, completing = 0.16, exiting = 0.25 }
local CENTER_X, CENTER_Y = artwork.width / 2, artwork.height / 2
local DEFAULT_CAMERA = vmath.vector3(CENTER_X, CENTER_Y, 1)

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

local function begin(self, index)
    self.index = index
    local treatment = self.sequence[index]
    self.treatment = treatment
    if not treatment then
        self.state = "finished"
        gui.set_enabled(self.tool_node, false)
        gui.set_text(self.label, "")
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
    gui.set_text(self.label, treatment.label)
    gui.set_enabled(self.tool_node, true)
    gui.play_flipbook(self.tool_node, treatment.tool.artwork)
    position(self, OFFSTAGE.x, OFFSTAGE.y, 0)
    animate(self, "entering", REST)
    frame_during_transition(self, treatment.camera)
end

function M.start(sequence, label, tool_node, portrait)
    local self = { sequence = sequence, label = label, tool_node = tool_node, camera = DEFAULT_CAMERA }
    msg.post(RENDER, "reset_portrait", portrait)
    begin(self, 1)
    return self
end

local function paint(self, ax, ay, bx, by)
    local dx, dy = bx - ax, by - ay
    local span = dx * dx + dy * dy
    local radius = self.treatment.radius
    local core_squared = (0.65 * radius) ^ 2
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
end

local function aim(self, x, y)
    local tip_x, tip_y = x + TIP_X, y + TIP_Y
    local camera = self.camera
    if self.tip_x and (tip_x ~= self.tip_x or tip_y ~= self.tip_y) then
        -- Coverage runs in portrait space. The tool pose stays in stage space.
        paint(self,
            camera.x + (self.tip_x - CENTER_X) / camera.z,
            camera.y + (self.tip_y - CENTER_Y) / camera.z,
            camera.x + (tip_x - CENTER_X) / camera.z,
            camera.y + (tip_y - CENTER_Y) / camera.z)
    end
    self.tip_x, self.tip_y = tip_x, tip_y
end

local function held_pose(self)
    local tool = self.treatment.tool
    local angle = math.sin(self.elapsed * 16) * tool.sway
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
        animate(self, "completing", vmath.vector3(pose.x, pose.y - 12, pose.z + 7))
        return self.treatment.id
    end

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
    else
        self.state = "ready"
    end
end

return M

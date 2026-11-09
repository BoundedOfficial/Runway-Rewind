local artwork = require "portrait.artwork"
local target_guidance = require "main.target_guidance"

local M = {}
local RENDER = "@render:"
local REST = vmath.vector4(320, 828, 0, 1)
local TOOL_SIZE = 118
local INTERACTION_SCALE = 1.2
local TIP_X, TIP_Y = 28, -24
local TIMING = { entering = 0.46, returning = 0.27, completing = 0.18, exiting = 0.28 }
local CENTER_X, CENTER_Y = artwork.width / 2, artwork.height / 2
local DEFAULT_CAMERA = vmath.vector3(CENTER_X, CENTER_Y, 1)
local STEP_PAST = vmath.vector4(0.82, 0.61, 0.50, 1)
local STEP_CURRENT = vmath.vector4(1, 0.80, 0.58, 1)
local STEP_PENDING = vmath.vector4(0.43, 0.31, 0.28, 1)

local function ease(t)
    return t * t * (3 - 2 * t)
end

local function tool_scale(self)
    local tool = self.treatment.tool
    return (tool.scale or 1) * (tool.follow_camera and self.camera.z or 1)
end

local function position(self, x, y, angle, scale)
    self.pose = vmath.vector4(x, y, angle, scale)
    gui.set_position(self.tool_node, vmath.vector3(x, artwork.height - y, 0))
    gui.set_rotation(self.tool_node, vmath.vector3(0, 0, angle))
    local visual_scale = scale * tool_scale(self)
    gui.set_scale(self.tool_node, vmath.vector3(visual_scale, visual_scale, 1))
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
    target_guidance.clear(self.hud.guides)
    gui.set_enabled(self.hud.instruction, false)
end

local function begin(self, index)
    self.index = index
    local treatment = self.sequence[index]
    self.treatment = treatment
    clear_guidance(self)
    if not treatment then
        self.state = "finished"
        gui.set_enabled(self.tool_node, false)
        gui.set_enabled(self.hud.background, false)
        return
    end

    local camera_scale = treatment.camera and treatment.camera.scale or 1
    local extent = TOOL_SIZE * (treatment.tool.scale or 1) * (treatment.tool.follow_camera and camera_scale or 1) / 2
    -- Keep the full enlarged tool on its shelf and outside the stage during arrival.
    self.rest = vmath.vector4(REST.x, math.min(REST.y, artwork.height - extent - 20), 0, 1)
    self.offstage = vmath.vector4(artwork.width + extent + 24, self.rest.y, 0, 1)
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
    position(self, self.offstage.x, self.offstage.y, 0, 1)
    animate(self, "entering", self.rest)
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

local function within_ranges(ranges, x, y, padding)
    for i = 2, #ranges do
        local from, to = ranges[i - 1], ranges[i]
        if y >= from[1] - padding and y <= to[1] + padding then
            local t = math.min(1, math.max(0, (y - from[1]) / (to[1] - from[1])))
            local left = from[2] + t * (to[2] - from[2])
            local right = from[3] + t * (to[3] - from[3])
            if x >= left - padding and x < right + padding then return true end
        end
    end
    return false
end

local function brush_sweep(self, ax, ay, dx, dy)
    local sweep = self.treatment.sweep
    local distance = math.sqrt(dx * dx + dy * dy)
    local samples = math.ceil(distance / 12)
    local step = distance / samples
    for index, region in ipairs(self.regions) do
        if not region.settle then
            local travel = region.travel or 0
            for sample = 1, samples do
                local t = (sample - 0.5) / samples
                if within_ranges(sweep.ranges[index], ax + dx * t, ay + dy * t, self.treatment.radius * (INTERACTION_SCALE - 1)) then
                    travel = travel + step
                end
            end
            region.travel = travel
            if travel >= sweep.distance then
                region.settle = 0
                target_guidance.complete(self.hud.guides, index)
            else
                -- Fade the whole side as it is brushed, so the loose locks stay
                -- connected until the styled side finishes fading into view.
                region.reveal_to = 0.4 * travel / sweep.distance
            end
        end
    end
end

local function paint(self, ax, ay, bx, by)
    local dx, dy = bx - ax, by - ay
    if self.treatment.sweep then
        brush_sweep(self, ax, ay, dx, dy)
        return
    end
    local span = dx * dx + dy * dy
    local radius = self.treatment.radius * INTERACTION_SCALE
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
                    target_guidance.complete(self.hud.guides, index)
                end
            end
        end
    end
end

local function portrait_point(camera, x, y)
    return camera.x + (x - CENTER_X) / camera.z, camera.y + (y - CENTER_Y) / camera.z
end

local function tip_pose(self, x, y, angle, scale)
    local tool = self.treatment.tool
    local contact_scale = scale * tool_scale(self)
    local radians = math.rad(angle)
    local sin, cos = math.sin(radians), math.cos(radians)
    -- Pivot around the artwork tip, which is also the endpoint of coverage.
    local offset_x = (tool.tip_x * cos + tool.tip_y * sin) * contact_scale
    local offset_y = (-tool.tip_x * sin + tool.tip_y * cos) * contact_scale
    position(self, x - offset_x, y - offset_y, angle, scale)
end

local function extract(self, x, y)
    local bx, by = portrait_point(self.camera, x, y)
    local nearest
    local distance = (self.treatment.target_radius * INTERACTION_SCALE) ^ 2
    for index, id in ipairs(self.treatment.regions) do
        local anchor = artwork.regions[id].anchor
        local squared = (bx - anchor[1]) ^ 2 + (by - anchor[2]) ^ 2
        if squared < distance then
            nearest, distance = index, squared
        end
    end
    if not nearest or self.regions[nearest].settle then return end
    local anchor = artwork.regions[self.treatment.regions[nearest]].anchor
    local camera = self.camera
    local target_x = CENTER_X + (anchor[1] - camera.x) * camera.z
    local target_y = CENTER_Y + (anchor[2] - camera.y) * camera.z
    self.extraction = {
        index = nearest,
        anchor = vmath.vector3(anchor[1], artwork.height - anchor[2], 0),
        elapsed = 0,
        from = vmath.vector4(x, y - 15, 3, 0.96),
        hover = vmath.vector4(target_x, target_y - 5, 14, 0.97),
        contact = vmath.vector4(target_x, target_y, 0, 1.07),
        lift = vmath.vector4(target_x - 4, target_y - 15, -10, 0.95),
    }
end

local function extraction_effect(extraction, pressure, release)
    msg.post(RENDER, "extraction_effect", {
        phase = vmath.vector4(extraction.anchor.x, extraction.anchor.y, pressure, release),
    })
end

local function aim(self, x, y)
    -- Coverage runs in portrait space. The tool pose stays in stage space.
    local tip_x, tip_y = x + TIP_X, y + TIP_Y
    local moved = tip_x ~= self.tip_x or tip_y ~= self.tip_y
    if self.treatment.extraction_time then
        self.tip_x, self.tip_y = tip_x, tip_y
        -- Record movement during the press without starting or queuing another target.
        if self.extraction or not moved then return end
        extract(self, tip_x, tip_y)
        local pose = self.extraction and self.extraction.from or vmath.vector4(tip_x, tip_y, 0, 1)
        tip_pose(self, pose.x, pose.y, pose.z, pose.w)
        return
    end
    if self.tip_x and moved then
        local bx, by = portrait_point(self.camera, tip_x, tip_y)
        local ax, ay = portrait_point(self.camera, self.tip_x, self.tip_y)
        paint(self, ax, ay, bx, by)
    end
    self.tip_x, self.tip_y = tip_x, tip_y
end

local function held_pose(self)
    local tool = self.treatment.tool
    local angle = math.sin(self.elapsed * 11) * tool.sway * 0.72
    tip_pose(self, self.tip_x, self.tip_y, angle, 1)
end

function M.cancel(self, pointer_lost)
    if pointer_lost then self.pointer_down = false end
    self.tip_x, self.tip_y = nil, nil
    if self.state == "held" then
        target_guidance.release(self.hud.guides)
        if self.extraction and self.extraction.popped then return end
        if self.extraction then extraction_effect(self.extraction, 0, 1) end
        self.extraction = nil
        animate(self, "returning", self.rest)
    end
end

function M.input(self, x, y, pressed, released, pointer_button)
    if pointer_button and released then
        M.cancel(self, true)
    elseif pointer_button and pressed and not self.pointer_down then
        self.pointer_down = true
        local pickup_radius = TOOL_SIZE * tool_scale(self) * INTERACTION_SCALE / 2
        if self.state == "ready" and math.abs(x - self.rest.x) <= pickup_radius and
                math.abs(y - self.rest.y) <= pickup_radius then
            self.state, self.elapsed = "held", 0
            if self.demonstrate then
                self.demonstrate = false
                gui.set_enabled(self.hud.instruction, false)
            end
            target_guidance.hold(self.hud.guides)
            aim(self, x, y)
            if not self.treatment.extraction_time then held_pose(self) end
        end
    elseif self.state == "held" and self.tip_x then
        aim(self, x, y)
        if not self.treatment.extraction_time then held_pose(self) end
    end
end

local function advance_extraction(self, dt)
    local extraction = self.extraction
    local timing = self.treatment.extraction_time
    local pop_time = timing.approach + timing.press
    extraction.elapsed = extraction.elapsed + dt
    local elapsed = extraction.elapsed
    local pose
    if elapsed < timing.approach then
        pose = vmath.lerp(ease(elapsed / timing.approach), extraction.from, extraction.hover)
    elseif elapsed < pop_time then
        local press = ease((elapsed - timing.approach) / timing.press)
        pose = vmath.lerp(press, extraction.hover, extraction.contact)
        extraction_effect(extraction, press, 1)
    else
        if not extraction.popped then
            extraction.popped = true
            self.regions[extraction.index].settle = 0
            target_guidance.complete(self.hud.guides, extraction.index)
        end
        local retract = math.min(1, (elapsed - pop_time) / timing.retract)
        pose = vmath.lerp(ease(retract), extraction.contact, extraction.lift)
        extraction_effect(extraction, 0, retract)
        if retract == 1 then self.extraction = nil end
    end
    tip_pose(self, pose.x, pose.y, pose.z, pose.w)
    if not self.tip_x and not self.extraction then
        animate(self, "returning", self.rest)
    end
end

local function settle(self, dt)
    local complete = true
    local duration = self.treatment.settle_time or 0.32
    for index, region in ipairs(self.regions) do
        local reveal = region.reveal or 0
        if region.settle and region.settle < 1 then
            region.settle = math.min(1, region.settle + dt / duration)
            local amount = reveal + (1 - reveal) * ease(region.settle)
            msg.post(RENDER, "settle_region", { index = index, amount = amount })
        elseif not region.settle and region.reveal_to and region.reveal_to > reveal then
            region.reveal = math.min(region.reveal_to, reveal + dt * 2)
            msg.post(RENDER, "settle_region", { index = index, amount = region.reveal })
        end
        if region.settle ~= 1 then complete = false end
    end
    return complete
end

function M.update(self, dt)
    local state = self.state
    if state == "finished" then return end
    if state ~= "completing" and state ~= "exiting" and settle(self, dt) and not self.extraction then
        msg.post(RENDER, "commit_treatment")
        self.tip_x, self.tip_y = nil, nil
        local pose = self.pose
        clear_guidance(self)
        animate(self, "completing", vmath.vector4(pose.x, pose.y - 8, pose.z + 4, 1))
        return self.treatment.id
    end

    if state == "ready" then return end
    self.elapsed = self.elapsed + dt
    if state == "held" then
        if self.extraction then
            advance_extraction(self, dt)
        elseif not self.treatment.extraction_time then
            held_pose(self)
        end
        return
    end

    local t = math.min(1, self.elapsed / TIMING[state])
    local pose = vmath.lerp(ease(t), self.from, self.to)
    if self.camera_to and self.camera_from ~= self.camera_to then
        set_camera(self, vmath.lerp(ease(t), self.camera_from, self.camera_to))
    end
    position(self, pose.x, pose.y, pose.z, pose.w)
    if t < 1 then return end
    self.camera_from, self.camera_to = nil, nil
    if state == "completing" then
        animate(self, "exiting", self.offstage)
        if not self.sequence[self.index + 1] then
            frame_during_transition(self)
        end
    elseif state == "exiting" then
        begin(self, self.index + 1)
        return nil, self.state == "finished"
    else
        self.state = "ready"
        if state == "entering" then
            target_guidance.show(self.hud.guides, self.treatment, self.camera)
            gui.set_enabled(self.hud.instruction, self.demonstrate)
        end
    end
end

return M

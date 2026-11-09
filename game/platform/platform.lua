local M = {}
local editor_state = { paused = false, audio_enabled = true }

function M.stage_ready()
    if html5 then
        html5.run("window.runwayPlatform.stageReady()")
    end
end

function M.state()
    if not html5 then
        return editor_state
    end
    return json.decode(html5.run("JSON.stringify(window.runwayPlatform.state())"))
end

return M

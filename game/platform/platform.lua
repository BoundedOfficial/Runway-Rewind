local M = {}
local editor_state = { paused = false, audio_enabled = true, pause_count = 0, restart_count = 0 }

function M.stage_ready()
    if html5 then
        local debug = sys.get_engine_info().is_debug
        html5.run("window.runwayPlatform.stageReady(" .. tostring(debug) .. ")")
    end
end

function M.listen_for_editor_focus()
    if html5 then return end
    window.set_listener(function(_, event)
        if event == window.WINDOW_EVENT_FOCUS_LOST and not editor_state.paused then
            editor_state.paused = true
            editor_state.audio_enabled = false
            editor_state.pause_count = editor_state.pause_count + 1
            sys.set_render_enable(false)
        elseif event == window.WINDOW_EVENT_FOCUS_GAINED and editor_state.paused then
            editor_state.paused = false
            editor_state.audio_enabled = true
            sys.set_render_enable(true)
        end
    end)
end

function M.state()
    if not html5 then
        return editor_state
    end
    return json.decode(html5.run("JSON.stringify(window.runwayPlatform.state())"))
end

function M.prepare_run(treatment_count)
    if html5 then html5.run("window.runwayPlatform.prepareRun(" .. treatment_count .. ")") end
end

function M.initial_run()
    if not html5 then return { ready = true } end
    return json.decode(html5.run("JSON.stringify(window.runwayPlatform.initialRun())"))
end

function M.save_run(completed_treatments)
    if html5 then html5.run("window.runwayPlatform.saveRun(" .. completed_treatments .. ")") end
end

return M

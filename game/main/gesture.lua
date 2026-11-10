-- Non-interactive demonstration; the fingertip is the gesture's anchor.
local M = {}
function M.create(parent)
    local node=gui.new_box_node(vmath.vector3(),vmath.vector3(48,60,0))
    if parent then gui.set_parent(node,parent,false) end
    gui.set_texture(node,'dental'); gui.play_flipbook(node,'gesture-hand')
    gui.set_size_mode(node,gui.SIZE_MODE_MANUAL); gui.set_size(node,vmath.vector3(48,60,0))
    gui.set_enabled(node,false)
    return node
end
function M.show(node,time,x,y,mode,to_x,to_y)
    local phase=time%3.6
    local opacity=math.min(1,phase/.25,(3.6-phase)/.35)*.9
    if mode=='collect' then
        local t=math.max(0,math.min(1,(phase-.65)/1.6)); t=t*t*(3-2*t)
        x=x+(to_x-x)*t; y=y+(to_y-y)*t-80*math.sin(t*math.pi)
    elseif mode=='stroke' then x=x+38*math.sin(math.max(0,phase-.4)*5)
    elseif mode=='pickup' or mode=='pickup_hold' then
        local t=math.max(0,math.min(1,(phase-.5)/1)); x=x+(to_x-x)*t; y=y+(to_y-y)*t
        if phase>1.5 and mode=='pickup' then x=x+30*math.sin((phase-1.5)*5) end
    end
    local scale=(mode=='hold' or mode=='pickup_hold' and phase>1.5) and (.94+.06*math.cos(phase*6)) or 1
    gui.set_enabled(node,true); gui.set_color(node,vmath.vector4(1,1,1,opacity))
    gui.set_scale(node,vmath.vector3(scale,scale,1))
    gui.set_position(node,vmath.vector3(x+2,960-y-25,0))
    gui.move_above(node,nil)
end
return M

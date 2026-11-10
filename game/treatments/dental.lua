-- Native GUI artwork composition and interaction for the dental treatment sequence.
local M = {}
local gesture = require 'main.gesture'
local DIMENSIONS = json.decode(sys.load_resource('/assets/generated/dental/dimensions.json'))
local REGIONS = json.decode(sys.load_resource("/assets/generated/dental/regions.json"))
local CAMERA = { x = -70.4, y = -97.9, scale = 1.22 }
local TEETH = {{80,381},{128,380},{193,388},{275,390},{378,390},{459,384},{521,377},{563,380},{93,482},{156,507},{225,521},{293,526},{359,526},{424,520},{484,506},{539,480}}
local GAPS = {{101,396},{158,405},{223,422},{326,430},{426,417},{491,400},{548,395},{126,504},{193,532},{259,544},{326,548},{392,540},{457,528},{516,505}}
local PASTE = {{135,392},{278,402},{410,400},{506,390},{178,520},{310,533},{442,520}}
local FOOD = {{80,400,1},{395,365,3},{565,400,4},{100,500,1},{175,530,3},{425,530,1},{550,515,4}}
local WORMS = {{155,394},{326,412},{487,407},{260,537}}
M.sequence = {
    {id="collect", label="Clear the leftovers", tool=1, mode="collect", plate="dirty"},
    {id="scale", label="Crack the crust", tool=2, mode="stroke", plate="dirty", reveal="descaled", effect="treatment-fx-2", travel=125},
    {id="drill", label="Clean the tight spots", tool=3, mode="hold", plate="descaled", effect="treatment-fx-2", remove_effect=true, targets=GAPS, radius=24, duration=.85},
    {id="floss", label="Floss the gaps", tool=4, mode="stroke", plate="descaled", effect="treatment-fx-3", remove_effect=true, targets=GAPS, radius=30, travel=125, tip=.08},
    {id="paste", label="A little mint magic", tool=5, mode="hold", plate="descaled", targets=PASTE, paste="apply"},
    {id="brush", label="Brush it all away", tool=6, mode="stroke", plate="descaled", reveal="clean", travel=165, paste="remove", foam="apply", tip=.1, sway=24},
    {id="suction", label="Clear the foam", tool=8, mode="hold", plate="clean", foam="remove"},
    {id="polish", label="Make it shine", tool=9, mode="hold", plate="clean", reveal="polished"},
}
local function screen(x,y) return CAMERA.x+x*CAMERA.scale, CAMERA.y+y*CAMERA.scale end
local function portrait(x,y) return (x-CAMERA.x)/CAMERA.scale, (y-CAMERA.y)/CAMERA.scale end
local function distance(x,y,a,b) return math.sqrt((x-a)^2+(y-b)^2) end
local function place(node,x,y) gui.set_position(node,vmath.vector3(x,960-y,0)) end
local function alpha(node,a) gui.set_color(node,vmath.vector4(1,1,1,a)) end
local function sprite(self,id,x,y,w,h)
    local node=gui.new_box_node(vmath.vector3(),vmath.vector3(1,1,0))
    gui.set_parent(node,self.root,false)
    gui.set_texture(node,"dental"); gui.play_flipbook(node,id)
    local natural=assert(DIMENSIONS[id],id)
    gui.set_size_mode(node,gui.SIZE_MODE_MANUAL)
    local width=w or (h and h*natural.width/natural.height) or natural.width
    gui.set_size(node,vmath.vector3(width,h or width*natural.height/natural.width,0))
    place(node,x,y)
    return node
end
local function at(self,id,x,y,w,h)
    local sx,sy=screen(x,y)
    return sprite(self,id,sx,sy,w*CAMERA.scale,h and h*CAMERA.scale)
end
local function targets(treatment) return treatment.targets or TEETH end
local function create_item(self,p,kind,index)
    local worm=kind=="worm"
    local node=at(self,worm and "worms-1" or "food-"..p[3],p[1],p[2]+(worm and 27 or 0),worm and 80 or ({36,27,43,33})[p[3]],worm and 80 or nil)
    if not worm then gui.set_rotation(node,vmath.vector3(0,0,-({-.3,.2,1.15,.95})[p[3]]*180/math.pi)) end
    self.items[#self.items+1]={x=p[1],y=p[2],node=node,worm=worm,id=index}
end
local function begin(self,index)
    if self.root then gui.delete_node(self.root) end
    self.root=gui.new_box_node(vmath.vector3(),vmath.vector3())
    self.index=index; self.work={}; self.contact={}; self.travel={}; self.items={}; self.tiles={}; self.effects={}; self.pastes={}; self.bubbles={}
    self.pointer=nil; self.grip=nil; self.arrival=0; self.transition=nil; self.idle=0
    self.food_count=0; self.worm_count=0
    self.treatment=M.sequence[index]
    local treatment=self.treatment or {plate="polished"}
    local plate=treatment.plate
    at(self,"dental-"..plate,320,480,640,960)
    if treatment.reveal then
        local result=treatment.reveal
        for i=1,16 do
            local r=REGIONS[i]
            local node=at(self,result.."-"..i,r.x+r.width/2,r.y+r.height/2,r.width,r.height)
            alpha(node,0); self.tiles[i]=node
        end
    end
    if treatment.effect then
        for i,p in ipairs(GAPS) do self.effects[i]=at(self,treatment.effect,p[1],p[2],treatment.id=="floss" and 28 or 22,48) end
    end
    if treatment.paste then
        for i,p in ipairs(PASTE) do self.pastes[i]=at(self,"treatment-fx-4",p[1],p[2],82,37); if treatment.paste=="apply" then alpha(self.pastes[i],0) end end
    end
    if treatment.foam then
        for i,p in ipairs(TEETH) do self.bubbles[i]=at(self,"treatment-fx-5",p[1],p[2],90,73); if treatment.foam=="apply" then alpha(self.bubbles[i],0) end end
    end
    if treatment.mode=="collect" then
        sprite(self,"petri",245,660,450)
        for i,p in ipairs(FOOD) do create_item(self,p,"food",i) end
        for i,p in ipairs(WORMS) do create_item(self,p,"worm",i) end
    end
    if index<=#M.sequence then
        self.tool=sprite(self,"tools-"..M.sequence[index].tool,535,800,nil,230)
        self.gesture=gesture.create(self.root)
        for i=1,#targets(treatment) do self.work[i]=0 end
    else self.tool=nil end
end
function M.start(boundary)
    local self={clock=0,food_count=0,worm_count=0}
    begin(self,boundary+1); return self
end
function M.destroy(self) if self and self.root then gui.delete_node(self.root); self.root=nil end end
function M.cancel(self)
    if self.grip then local item=self.grip; item.freed=false; local x,y=screen(item.x,item.y+(item.worm and 27 or 0)); place(item.node,x,y) end
    self.grip=nil; self.pointer=nil; self.previous=nil
    for _,item in ipairs(self.items) do item.hold=0 end
end
local function finish(self)
    self.transition=.9; self.pointer=nil; self.previous=nil; self.grip=nil
end
local function collection_progress(self)
    local n=0; for _,item in ipairs(self.items) do if item.done then n=n+1 end end; return n
end
function M.input(self,x,y,pressed,released)
    if self.index>#M.sequence or self.transition or self.arrival<.45 then return end
    if pressed then self.pointer={x=x,y=y}; self.previous=nil; self.idle=0; gui.set_enabled(self.gesture,false)
    elseif self.pointer then self.pointer.x=x; self.pointer.y=y end
    if released then
        local item=self.grip
        if item and item.freed and x>=0 and x<=490 and y>=570 and y<=750 then
            item.done=true
            local dx,dy
            if item.worm then dx=260+self.worm_count*42; dy=638; self.worm_count=self.worm_count+1
            else dx=100+(self.food_count%4)*36; dy=637+math.floor(self.food_count/4)*24; self.food_count=self.food_count+1 end
            item.drop_x,item.drop_y=dx,dy
            -- Dish positions describe sprite centers, not the mouth's grip anchor.
            place(item.node,dx,dy); self.grip=nil
            if collection_progress(self)==#self.items then finish(self) end
        end
        M.cancel(self)
    end
end
local function hit_segment(x,y,previous,target,radius)
    if distance(x,y,target[1],target[2])<radius then return true end
    if not previous then return false end
    local dx,dy=x-previous[1],y-previous[2]; local length=dx*dx+dy*dy
    if length==0 then return false end
    local t=math.max(0,math.min(1,((target[1]-previous[1])*dx+(target[2]-previous[2])*dy)/length))
    return distance(previous[1]+dx*t,previous[2]+dy*t,target[1],target[2])<radius
end
local function render_progress(self)
    local treatment=self.treatment
    for i,node in ipairs(self.tiles) do
        local amount=self.work[i] or 0
        -- Keep a visible stained/unpolished remainder until this tooth is done.
        alpha(node,amount>=1 and 1 or amount*.7)
    end
    -- Unfinished debris must remain legible, even after an almost-complete pass.
    -- Remove it only when that individual target is actually finished.
    if treatment.remove_effect then
        for i,node in ipairs(self.effects) do
            alpha(node,self.work[i]>=1 and 0 or math.max(.65,1-self.work[i]*.35))
        end
    end
    if treatment.paste=="apply" then for i,node in ipairs(self.pastes) do alpha(node,self.work[i]) end end
    if treatment.paste=="remove" then
        for i,node in ipairs(self.pastes) do
            local nearest=1
            for j,p in ipairs(TEETH) do if distance(p[1],p[2],PASTE[i][1],PASTE[i][2])<distance(TEETH[nearest][1],TEETH[nearest][2],PASTE[i][1],PASTE[i][2]) then nearest=j end end
            alpha(node,self.work[nearest]>=1 and 0 or math.max(.6,1-self.work[nearest]))
        end
    end
    for i,node in ipairs(self.bubbles) do
        local amount=self.work[i]
        local a=treatment.foam=="apply" and (amount>=1 and 1 or amount*.45)
            or (amount>=1 and 0 or math.max(.6,1-amount))
        alpha(node,a); gui.set_scale(node,vmath.vector3(math.sqrt(a),math.sqrt(a),1))
    end
end
function M.update(self,dt)
    self.clock=self.clock+dt; self.arrival=self.arrival+dt
    if self.index>#M.sequence then return nil,true end
    if self.transition then
        gui.set_enabled(self.gesture,false)
        self.transition=self.transition-dt
        if self.transition<=0 then local completed=self.index; begin(self,completed+1); return completed,completed==#M.sequence end
        return
    end
    local pointer=self.pointer
    if pointer then
        local x,y=portrait(pointer.x,pointer.y)
        if self.treatment.mode=="collect" then
            if not self.grip then
                for _,item in ipairs(self.items) do
                    if not item.done and distance(x,y,item.x,item.y)<37 then
                        item.hold=(item.hold or 0)+dt
                        if item.hold>=.24 then self.grip=item; item.start_x=x; item.start_y=y; gui.move_above(item.node,nil); gui.move_above(self.tool,nil); break end
                    else item.hold=0 end
                end
            else
                local item=self.grip; local dx,dy=x-item.start_x,y-item.start_y
                if distance(dx,dy,0,0)>(item.worm and 88 or 65) then item.freed=true end
                local sx,sy=screen(item.x+dx,item.y+dy+(item.worm and 27 or 0)); place(item.node,sx,sy)
            end
        else
            local speed=self.previous and distance(x,y,self.previous[1],self.previous[2]) or 0
            local hold=self.treatment.mode=="hold"
            local reach=(self.treatment.radius or 48)*1.15
            local complete=true
            for i,p in ipairs(targets(self.treatment)) do
                if self.work[i]<1 and hit_segment(x,y,self.previous,p,reach) then
                    -- A fast sweep may touch several targets, but cannot finish
                    -- them instantly: each needs sustained contact and movement.
                    if hold then
                        self.work[i]=math.min(1,self.work[i]+dt/(self.treatment.duration or .85))
                    else
                        self.contact[i]=(self.contact[i] or 0)+dt
                        self.travel[i]=(self.travel[i] or 0)+math.min(speed,50)
                        self.work[i]=math.min(1,self.contact[i]/.75,self.travel[i]/(self.treatment.travel or 125))
                    end
                end
                if self.work[i]<1 then complete=false end
            end
            if complete then finish(self) end
        end
        self.previous={x,y}
    end
    for _,item in ipairs(self.items) do
        if item.worm then gui.play_flipbook(item.node,"worms-"..(1+math.floor(self.clock*7+item.id*1.7)%6)) end
    end
    local tx,ty=535+math.max(0,1-self.arrival/.45)*240,650
    if self.pointer then tx,ty=self.pointer.x,self.pointer.y end
    local tip=self.treatment.tip or .035
    place(self.tool,tx,ty+230*(.5-tip))
    gui.set_rotation(self.tool,vmath.vector3(0,0,self.pointer and math.sin(self.clock*(self.treatment.sway or 9))*3 or 7))
    render_progress(self)
    self.idle=self.pointer and 0 or self.idle+dt
    if not self.pointer and not self.transition and self.idle>1.2 then
        local target
        if self.treatment.mode=='collect' then
            for _,item in ipairs(self.items) do if not item.done then target={item.x,item.y}; break end end
        else
            for i,p in ipairs(targets(self.treatment)) do if self.work[i]<1 then target=p; break end end
        end
        if target then local x,y=screen(target[1],target[2]); gesture.show(self.gesture,self.idle-1.2,x,y,self.treatment.mode,245,645) end
    else gui.set_enabled(self.gesture,false) end
end
return M

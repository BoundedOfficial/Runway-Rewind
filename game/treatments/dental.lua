-- Native GUI artwork composition and interaction for the dental treatment sequence.
local M = {}
local CAMERA = { x = -70.4, y = -97.9, scale = 1.22 }
local TEETH = {{80,381},{128,380},{193,388},{275,390},{378,390},{459,384},{521,377},{563,380},{93,482},{156,507},{225,521},{293,526},{359,526},{424,520},{484,506},{539,480}}
local GAPS = {{101,396},{158,405},{223,422},{326,430},{426,417},{491,400},{548,395},{126,504},{193,532},{259,544},{326,548},{392,540},{457,528},{516,505}}
local PASTE = {{135,392},{278,402},{410,400},{506,390},{178,520},{310,533},{442,520}}
local FOOD = {{80,400,1},{225,365,2},{395,365,3},{565,400,4},{100,500,1},{175,530,3},{350,545,2},{425,530,1},{550,515,4}}
local WORMS = {{155,394},{326,412},{487,407},{260,537}}
M.sequence = {
    {id="collect", label="Clear the leftovers", instruction="Food or worms: pull, then drop", tool=1},
    {id="scale", label="Crack the crust", instruction="Scrape the rough buildup", tool=2},
    {id="drill", label="Clean the tight spots", instruction="Hold the tip in each dark gap", tool=3},
    {id="floss", label="Floss the gaps", instruction="Pull trapped fibers from the gaps", tool=4},
    {id="paste", label="A little mint magic", instruction="Apply paste across both rows", tool=5},
    {id="brush", label="Brush it all away", instruction="Brush yellow stains off each tooth", tool=6},
    {id="suction", label="Clear the foam", instruction="Hold the tip over the foam", tool=8},
    {id="polish", label="Make it shine", instruction="Buff each tooth to a bright finish", tool=9},
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
    gui.set_size_mode(node,gui.SIZE_MODE_AUTO)
    local natural=gui.get_size(node)
    gui.set_size_mode(node,gui.SIZE_MODE_MANUAL)
    gui.set_size(node,vmath.vector3(w or natural.x,h or ((w or natural.x)*natural.y/natural.x),0))
    place(node,x,y)
    return node
end
local function at(self,id,x,y,w,h)
    local sx,sy=screen(x,y)
    return sprite(self,id,sx,sy,w*CAMERA.scale,h and h*CAMERA.scale)
end
local function label(self,x,y,value,size)
    local node=gui.new_text_node(vmath.vector3(),value)
    gui.set_parent(node,self.root,false); gui.set_font(node,"prompt")
    gui.set_color(node,vmath.vector4(.12,.26,.23,1)); gui.set_scale(node,vmath.vector3(size or 1,size or 1,1))
    place(node,x,y); return node
end
local function targets(index) return (index==3 or index==4) and GAPS or index==5 and PASTE or TEETH end
local function create_item(self,p,kind,index)
    local worm=kind=="worm"
    local node=at(self,worm and "worms-1" or "food-"..p[3],p[1],p[2]+(worm and 27 or 0),worm and 80 or ({36,27,43,33})[p[3]],worm and 80 or nil)
    if not worm then gui.set_rotation(node,vmath.vector3(0,0,-({-.3,.2,1.15,.95})[p[3]]*180/math.pi)) end
    self.items[#self.items+1]={x=p[1],y=p[2],node=node,worm=worm,id=index}
end
local function begin(self,index)
    if self.root then gui.delete_node(self.root) end
    self.root=gui.new_box_node(vmath.vector3(),vmath.vector3())
    self.index=index; self.work={}; self.items={}; self.tiles={}; self.effects={}; self.pastes={}; self.bubbles={}
    self.pointer=nil; self.grip=nil; self.arrival=0; self.transition=nil
    self.dish_label=nil; self.instruction=nil; self.counter=nil
    local plate=index<=2 and "dirty" or index<=6 and "descaled" or index<=8 and "clean" or "polished"
    at(self,"dental-"..plate,320,480,640,960)
    if index==2 or index==6 or index==8 then
        local result=index==2 and "descaled" or index==6 and "clean" or "polished"
        for i=1,16 do
            local node=at(self,result.."-"..i,75+((i-1)%8)*70,370+math.floor((i-1)/8)*140,70,140)
            alpha(node,0); self.tiles[i]=node
        end
    end
    if index>=2 and index<=4 then
        for i,p in ipairs(GAPS) do self.effects[i]=at(self,index==4 and "treatment-fx-3" or "treatment-fx-2",p[1],p[2],index==4 and 28 or 22,48) end
    end
    if index==5 or index==6 then
        for i,p in ipairs(PASTE) do self.pastes[i]=at(self,"treatment-fx-4",p[1],p[2],82,37); if index==5 then alpha(self.pastes[i],0) end end
    end
    if index==6 or index==7 then
        for i,p in ipairs(TEETH) do self.bubbles[i]=at(self,"treatment-fx-5",p[1],p[2],90,73); if index==6 then alpha(self.bubbles[i],0) end end
    end
    if index==1 then
        sprite(self,"petri",245,660,450,140)
        self.dish_label=label(self,245,583,"PETRI DISH",.75)
        for i,p in ipairs(FOOD) do create_item(self,p,"food",i) end
        for i,p in ipairs(WORMS) do create_item(self,p,"worm",i) end
    end
    if index<=#M.sequence then
        local panel=sprite(self,"rounded",320,815,604,160); gui.set_color(panel,vmath.vector4(.79,.91,.85,.97))
        label(self,320,770,M.sequence[index].label,1.1)
        self.instruction=label(self,320,811,M.sequence[index].instruction,.78)
        self.counter=label(self,320,855,"",.7)
        self.tool=sprite(self,"tools-"..M.sequence[index].tool,535,800,nil,230)
        gui.set_size_mode(self.tool,gui.SIZE_MODE_AUTO); local natural=gui.get_size(self.tool); gui.set_size_mode(self.tool,gui.SIZE_MODE_MANUAL)
        self.tool_width=math.min(180,230*natural.x/natural.y)
        gui.set_size(self.tool,vmath.vector3(self.tool_width,230,0))
        for i=1,#targets(index) do self.work[i]=0 end
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
    if pressed then self.pointer={x=x,y=y}; self.previous=nil
    elseif self.pointer then self.pointer.x=x; self.pointer.y=y end
    if released then
        local item=self.grip
        if item and item.freed and x>=0 and x<=490 and y>=570 and y<=750 then
            item.done=true
            local dx,dy
            if item.worm then dx=250+self.worm_count*50; dy=620; self.worm_count=self.worm_count+1
            else dx=80+(self.food_count%3)*50; dy=635+math.floor(self.food_count/3)*30; self.food_count=self.food_count+1 end
            item.drop_x,item.drop_y=dx,dy
            place(item.node,dx,dy+(item.worm and 27*CAMERA.scale or 0)); self.grip=nil
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
    local index=self.index
    for i,node in ipairs(self.tiles) do alpha(node,self.work[i] or 0) end
    if index==3 or index==4 then for i,node in ipairs(self.effects) do alpha(node,1-self.work[i]) end end
    if index==5 then for i,node in ipairs(self.pastes) do alpha(node,self.work[i]) end end
    if index==6 then
        for i,node in ipairs(self.pastes) do
            local nearest=1
            for j,p in ipairs(TEETH) do if distance(p[1],p[2],PASTE[i][1],PASTE[i][2])<distance(TEETH[nearest][1],TEETH[nearest][2],PASTE[i][1],PASTE[i][2]) then nearest=j end end
            alpha(node,1-self.work[nearest])
        end
    end
    for i,node in ipairs(self.bubbles) do local a=index==6 and self.work[i] or 1-self.work[i]; alpha(node,a); gui.set_scale(node,vmath.vector3(math.sqrt(a),math.sqrt(a),1)) end
    local progress=0
    for _,amount in ipairs(self.work) do progress=progress+amount end
    gui.set_text(self.counter,index==1 and collection_progress(self).." / 13 collected" or math.floor(progress/#self.work*100).."%  -  "..index.." / 8")
end
function M.update(self,dt)
    self.clock=self.clock+dt; self.arrival=self.arrival+dt
    if self.index>#M.sequence then return nil,true end
    if self.transition then
        self.transition=self.transition-dt
        if self.transition<=0 then local completed=self.index; begin(self,completed+1); return completed,completed==#M.sequence end
        return
    end
    local pointer=self.pointer
    if pointer then
        local x,y=portrait(pointer.x,pointer.y)
        if self.index==1 then
            if not self.grip then
                for _,item in ipairs(self.items) do
                    if not item.done and distance(x,y,item.x,item.y)<31 then
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
            local hold=self.index==3 or self.index==5 or self.index==7 or self.index==8
            local reach=self.index==3 and 24 or self.index==4 and 30 or 48
            local all=true
            for i,p in ipairs(targets(self.index)) do
                if self.work[i]<1 and hit_segment(x,y,self.previous,p,reach) then
                    local amount=hold and dt/(self.index==3 and .55 or .5) or math.min(speed,50)/(self.index==6 and 165 or 125)
                    self.work[i]=math.min(1,self.work[i]+amount)
                end
                if self.work[i]<1 then all=false end
            end
            if all then finish(self) end
        end
        self.previous={x,y}
    end
    for _,item in ipairs(self.items) do
        if item.worm then gui.play_flipbook(item.node,"worms-"..(1+math.floor(self.clock*7+item.id*1.7)%6)) end
    end
    if self.dish_label then gui.set_text(self.dish_label,self.grip and self.grip.freed and "DROP HERE" or "PETRI DISH") end
    gui.set_text(self.instruction,self.grip and (self.grip.freed and "Drop into the petri dish below" or "Pull to release") or M.sequence[self.index].instruction)
    local tx,ty=535+math.max(0,1-self.arrival/.45)*240,709
    if self.pointer then tx,ty=self.pointer.x,self.pointer.y end
    local tip=self.index==4 and .08 or self.index==6 and .1 or .035
    place(self.tool,tx,ty+230*(.5-tip))
    gui.set_rotation(self.tool,vmath.vector3(0,0,self.pointer and math.sin(self.clock*(self.index==6 and 24 or 9))*3 or 7))
    render_progress(self)
end
return M

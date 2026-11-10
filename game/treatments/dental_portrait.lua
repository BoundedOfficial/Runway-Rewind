-- A single composite guarantees identical pixels on both sides of a checkpoint.
local M={}
local bases
local function atlas_basis(geometry,texture)
    local vertices,uvs=geometry.vertices,geometry.uvs
    local min_x,min_y,max_x,max_y=math.huge,math.huge,-math.huge,-math.huge
    for i=1,#vertices,2 do
        min_x=math.min(min_x,vertices[i]); max_x=math.max(max_x,vertices[i])
        min_y=math.min(min_y,vertices[i+1]); max_y=math.max(max_y,vertices[i+1])
    end
    local origin,right,top
    for i=1,#vertices,2 do
        local uv=vmath.vector3(uvs[i]/texture.width,1-uvs[i+1]/texture.height,0)
        if vertices[i]==min_x and vertices[i+1]==max_y then origin=uv
        elseif vertices[i]==max_x and vertices[i+1]==max_y then right=uv
        elseif vertices[i]==min_x and vertices[i+1]==min_y then top=uv end
    end
    return {x=vmath.vector4(origin.x,origin.y,right.x-origin.x,right.y-origin.y),y=vmath.vector4(top.x-origin.x,top.y-origin.y,0,0)}
end
function M.configure(node,from,to,targets)
    if not bases then
        local atlas=resource.get_atlas('/assets/generated/dental/dental.a.texturesetc')
        local texture=resource.get_texture_info(atlas.texture)
        bases={}
        for _,animation in ipairs(atlas.animations) do
            if animation.id:match('^dental%-') then bases[animation.id]=atlas_basis(atlas.geometries[animation.frames[1]],texture) end
        end
    end
    gui.set_material(node,'dental_portrait')
    for _,entry in ipairs({{'from',from},{'to',to or from},{'background','dirty'}}) do
        local basis=assert(bases['dental-'..entry[2]])
        gui.set(node,entry[1]..'_x',basis.x)
        gui.set(node,entry[1]..'_y',vmath.vector4(basis.y.x,basis.y.y,entry[2]=='polished' and 1 or 0,0))
    end
    M.update(node,targets,{})
end
function M.update(node,targets,progress)
    for i,p in ipairs(targets) do gui.set(node,'target'..(i-1),vmath.vector4(p[1],p[2],progress[i] or 0,#progress>0 and 1 or 0)) end
end
return M

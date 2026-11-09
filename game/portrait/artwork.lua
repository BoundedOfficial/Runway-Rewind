local M = { width = 640, height = 960, regions = {}, extraction = {} }

local records = json.decode(sys.load_resource("/assets/generated/regions.json"))
for _, region in ipairs(records) do
    M.regions[region.id] = region
    if region.id:match("^extract%-") then
        M.extraction[#M.extraction + 1] = region.id
    end
end

return M

local size = 112
local input = assert(app.params["input"])
local output = assert(app.params["output"])
local names = {"sand-scorpion","bone-wolf","bone-skeleton","bone-general","sand-worm","sand-golem","flame-lizard","bone-king","wetland-toad"}
local poses = {"idle","move","windup","active","recover","hurt","death","skill","disguise","run","secondary","special"}
local directions = {"south","west","east","north"}
local durations = {260,115,120,100,112,70,135,110,190,85,105,105}
for _,name in ipairs(names) do
  local sprite = Sprite(size,size,ColorMode.RGB)
  local shadowLayer = sprite.layers[1]; shadowLayer.name = "Contact shadow"
  local bodyLayer = sprite:newLayer(); bodyLayer.name = "Articulated creature"
  local shadow = Image{fromFile=app.fs.joinPath(input,name.."-shadow.png")}
  local body = Image{fromFile=app.fs.joinPath(input,name.."-body.png")}
  for row=0,#poses-1 do
    for col=0,15 do
      local index=row*16+col+1
      local f=index==1 and sprite.frames[1] or sprite:newEmptyFrame()
      f.duration=durations[row+1]/1000
      for _,part in ipairs({{layer=shadowLayer,atlas=shadow},{layer=bodyLayer,atlas=body}}) do
        local frame=Image(size,size,ColorMode.RGB)
        frame:drawImage(part.atlas,Point(-col*size,-row*size))
        sprite:newCel(part.layer,f,frame,Point(0,0))
      end
    end
    for dir=0,3 do
      local first=row*16+dir*4+1
      local tag=sprite:newTag(first,first+3)
      tag.name=poses[row+1].." "..directions[dir+1]
    end
  end
  assert(#sprite.frames==192)
  assert(#sprite.layers==2)
  assert(#sprite.tags==48)
  sprite:saveAs(app.fs.joinPath(output,name..".aseprite"))
  sprite:close()
end
local verified=assert(io.open(app.fs.joinPath(output,"export.txt"),"w"))
verified:write("Aseprite source export: 9 creatures, 192 frames, 2 layers, 48 directional tags per file.\n")
verified:close()

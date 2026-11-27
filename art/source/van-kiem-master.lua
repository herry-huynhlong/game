-- Import the authored atlas as editable layer-separated animation cels.
local root=app.params.root or app.fs.currentPath
local atlasPath=app.fs.joinPath(root,"public","assets","van-kiem")
local input=assert(io.open(app.fs.joinPath(atlasPath,"cinematic.json"),"r"))
local frames=json.decode(input:read("*a")).frames
input:close()
local atlas=assert(app.open(app.fs.joinPath(atlasPath,"cinematic.png")))
local pixels=atlas.cels[1].image
local sprite=Sprite(800,620,ColorMode.RGB)
local groups={
  {"Bong mat dat","shadow",1,25,115},
  {"Phan chieu ho phach","amber",1,25,8},
  {"Phan chieu xanh bac","silver",1,245,10},
  {"Phap tran mat dat","ground",6,15,173},
  {"Kiem tran tren cao","heaven",6,14,306},
  {"May linh luc","mist",8,554,115},
  {"Vet kiem","ribbon",8,446,193},
  {"Song xung kich","ripple",8,475,259},
  {"Bui dat","dust",8,571,355},
  {"Thuong diem va cham","impact",8,484,440},
  {"Linh khi","mote",6,416,128},
}
for i=0,4 do groups[#groups+1]={"Luoi kiem pham "..tostring(i+1),"blade"..i,0,365+i*72,3} end
local layers={}
for i,group in ipairs(groups)do
  local layer=i==1 and sprite.layers[1] or sprite:newLayer()
  layer.name=group[1]
  layers[i]=layer
end
for i=1,8 do
  local frame=i==1 and sprite.frames[1] or sprite:newEmptyFrame()
  frame.duration=.10
  for j,group in ipairs(groups)do
    local key=group[3]==0 and group[2] or group[2]..tostring((i-1)%group[3])
    local bounds=assert(frames[key]).frame
    local image=Image(bounds.w,bounds.h,ColorMode.RGB)
    image:drawImage(pixels,Point(-bounds.x,-bounds.y))
    sprite:newCel(layers[j],frame,image,Point(group[4],group[5]))
  end
end
local tag=sprite:newTag(1,8)
tag.name="Kiem tran - texture cycles"
sprite:saveAs(app.fs.joinPath(root,"art","source","van-kiem-master.aseprite"))
print("Editable Van Kiem master: "..#sprite.layers.." layers, "..#sprite.frames.." frames")

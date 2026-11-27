-- Open the packed runtime pixels as editable, named layers and animation cels.
local root=app.params.root or app.fs.currentPath
local function path(...) return app.fs.joinPath(root,...) end
local input=assert(io.open(path("public","assets","van-phap","atlas.json"),"r"))
local frames=json.decode(input:read("*a")).frames
input:close()
local atlas=assert(app.open(path("public","assets","van-phap","atlas.png")))
local pixels=atlas.cels[1].image
local arms=assert(app.open(path("public","assets","items","martial-arms.png"))).cels[1].image
local sheaths=assert(app.open(path("public","assets","items","martial-arms-back.png"))).cels[1].image
local schools={
  "chaos","sun","myriad","void","storm","dragon","violet","ice","ghost","jade","ember","wood","steel","earth","spear"
}
local variants={
  "seal","crest","wake","burst","head","body","leg","crow","disc","cloud","bolt",
  "crystal","lotus","vine","claw","soul","hand","rubble","rift","banner","flower"
}
local sprite=Sprite(1120,1280,ColorMode.RGB)
local layerByVariant={}
for i,name in ipairs(variants) do
  local layer=i==1 and sprite.layers[1] or sprite:newLayer()
  layer.name=name
  layerByVariant[name]=layer
end
local weapons=sprite:newLayer()
weapons.name="Weapons - grip at local (12, 24)"
local scabbards=sprite:newLayer()
scabbards.name="Scabbards"
for i=1,8 do
  local frame=i==1 and sprite.frames[1] or sprite:newEmptyFrame()
  frame.duration=.09
  local cels={}
  for row,style in ipairs(schools) do
    local col=(row-1)%3
    local group=math.floor((row-1)/3)
    local x,y,tall=0,0,0
    for _,name in ipairs(variants) do
      local key=style.."-"..name..((i-1)%(name=="crow" and 8 or 4))
      local b=frames[key] and frames[key].frame
      if b then
        -- Aseprite supports one cel per layer per frame, so all schools share a sheet cel.
        local layer=layerByVariant[name]
        local cel=cels[name]
        if not cel then
          cel=sprite:newCel(layer,frame,Image(sprite.width,sprite.height,ColorMode.RGB),Point(0,0))
          cels[name]=cel
        end
        local asset=Image(b.w,b.h,ColorMode.RGB)
        asset:drawImage(pixels,Point(-b.x,-b.y))
        if x+b.w>350 then x,y,tall=0,y+tall+5,0 end
        cel.image:drawImage(asset,Point(x+col*371,y+group*241))
        x,tall=x+b.w+5,math.max(tall,b.h)
      end
    end
  end
  sprite:newCel(weapons,frame,arms,Point(90,1238))
  sprite:newCel(scabbards,frame,sheaths,Point(492,1238))
end
local tag=sprite:newTag(1,8)
tag.name="Pixel effects - material cycles"
sprite:saveAs(path("art","source","van-phap-master.aseprite"))
print("Van Phap master: "..#sprite.layers.." layers, "..#sprite.frames.." frames")

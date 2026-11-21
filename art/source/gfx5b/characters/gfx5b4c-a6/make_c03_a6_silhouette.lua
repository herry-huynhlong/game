local input=assert(app.params.input)
local output=assert(app.params.output)
local src=assert(app.open(input))
local dst=Sprite(src.width,src.height,ColorMode.RGB)
local layer=dst.layers[1];layer.name='silhouette_only'
local solid=app.pixelColor.rgba(40,57,57,255)
local names={'front','profile_east','three_quarter_south_east'}
for i,srcFrame in ipairs(src.frames) do
  local frame=i==1 and dst.frames[1] or dst:newEmptyFrame()
  frame.duration=srcFrame.duration
  local merged=Image(src.width,src.height,ColorMode.RGB)
  for _,srcLayer in ipairs(src.layers) do
    local cel=srcLayer:cel(srcFrame)
    if cel then merged:drawImage(cel.image,cel.position) end
  end
  local image=Image(src.width,src.height,ColorMode.RGB)
  for y=0,src.height-1 do for x=0,src.width-1 do
    local pixel=merged:getPixel(x,y)
    if app.pixelColor.rgbaA(pixel)>0 then image:drawPixel(x,y,solid) end
  end end
  dst:newCel(layer,frame,image,Point(0,0))
  local tag=dst:newTag(i,i);tag.name='silhouette_'..names[i];tag.aniDir=AniDir.FORWARD
end
dst:saveAs(output)
print('C03 A6 silhouettes exported without facial or garment detail')

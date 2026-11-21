-- Pixel-by-pixel drawing inside the real Aseprite graphics engine.
-- This Lua script is executed by Aseprite CLI; it does not use Pillow.
local spec_path = app.params["spec"]
local output = app.params["output"]
assert(type(spec_path) == "string" and type(output) == "string", "Missing spec/output")
local f = assert(io.open(spec_path, "rb"))
local data = f:read("*a")
f:close()
local doc = json.decode(data)
assert(doc and doc.frames and #doc.frames > 0, "Bad drawing spec")
local sprite = Sprite(doc.width, doc.height, ColorMode.RGB)
local layers = {}
-- Sprite() creates a default image layer.
local default_layer = sprite.layers[1]
local used_default = false
local function get_layer(name)
  if layers[name] then return layers[name] end
  local layer
  if not used_default then layer = default_layer; used_default = true
  else layer = sprite:newLayer() end
  layer.name = name
  layers[name] = layer
  return layer
end
local function rgba(hex)
  local value = doc.palette and doc.palette[hex] or hex
  assert(type(value) == "string" and value:sub(1,1) == "#", "Unknown color: " .. tostring(hex))
  local r = tonumber(value:sub(2,3), 16)
  local g = tonumber(value:sub(4,5), 16)
  local b = tonumber(value:sub(6,7), 16)
  local a = #value == 9 and tonumber(value:sub(8,9),16) or 255
  return app.pixelColor.rgba(r,g,b,a)
end
local function paint(image, x, y, v)
  if x>=0 and y>=0 and x<doc.width and y<doc.height then image:drawPixel(x,y,v) end
end
local function line(image,x0,y0,x1,y1,v)
  local dx, dy = math.abs(x1-x0), math.abs(y1-y0)
  local sx, sy = (x0<x1 and 1 or -1), (y0<y1 and 1 or -1)
  local err = dx-dy
  while true do
    paint(image,x0,y0,v)
    if x0==x1 and y0==y1 then break end
    local e2=2*err
    if e2 > -dy then err=err-dy; x0=x0+sx end
    if e2 < dx then err=err+dx; y0=y0+sy end
  end
end
local function draw(image, op)
  local v = rgba(op.color)
  if op.type=="pixel" then paint(image,op.x,op.y,v)
  elseif op.type=="pixels" then for _,p in ipairs(op.points) do paint(image,p[1],p[2],v) end
  elseif op.type=="line" then line(image,op.x1,op.y1,op.x2,op.y2,v)
  elseif op.type=="rect" or op.type=="outline" then
    if op.type=="rect" then
      for y=op.y,op.y+op.h-1 do for x=op.x,op.x+op.w-1 do paint(image,x,y,v) end end
    else
      line(image,op.x,op.y,op.x+op.w-1,op.y,v)
      line(image,op.x,op.y+op.h-1,op.x+op.w-1,op.y+op.h-1,v)
      line(image,op.x,op.y,op.x,op.y+op.h-1,v)
      line(image,op.x+op.w-1,op.y,op.x+op.w-1,op.y+op.h-1,v)
    end
  else error("Unknown drawing command: " .. tostring(op.type)) end
end
for frame_i, frame_info in ipairs(doc.frames) do
  local frame
  if frame_i==1 then frame=sprite.frames[1]
  else frame=sprite:newEmptyFrame() end
  frame.duration=(frame_info.durationMs or 140)/1000
  for _, layer_info in ipairs(frame_info.layers) do
    local layer=get_layer(layer_info.name)
    local image=Image(doc.width,doc.height,ColorMode.RGB)
    for _,op in ipairs(layer_info.ops) do draw(image,op) end
    sprite:newCel(layer,frame,image,Point(0,0))
  end
end
sprite:saveAs(output)
print("Aseprite saved " .. output)

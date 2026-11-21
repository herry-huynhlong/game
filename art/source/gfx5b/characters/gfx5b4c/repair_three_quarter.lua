-- GFX.5B.4C-A: edit the actual layered Aseprite file, preserving animation,
-- body, positions, palette, frame durations and all existing cels.
local src=assert(app.params.input);local out=assert(app.params.output)
local s=assert(app.open(src));assert(s.width==32 and s.height==40 and #s.frames==98)
local target={face=true,hair_front=true,hair_back=true}
-- Down-left was drawn with the same three-quarter head facing as down-right.
-- Reflect only the independently layered head; body and limbs retain their own
-- hand-authored direction and the cel origin is preserved.
local function repairHead(f)
 for _,layer in ipairs(s.layers) do
  if target[layer.name] then
   local cel=layer:cel(s.frames[f]);if cel then
    local old=cel.image;local im=Image(32,40,ColorMode.RGB)
    for y=0,old.height-1 do for x=0,old.width-1 do
     local px=old:getPixel(x,y);local xx=31-(x+cel.position.x);local yy=y+cel.position.y
     if xx>=0 and xx<32 and yy>=0 and yy<40 then im:drawPixel(xx,yy,px)end
    end end
    cel.image=im;cel.position=Point(0,0)
   end
  end
 end
end
for f=29,32 do repairHead(f) end
for f=75,80 do repairHead(f) end
s:saveAs(out)
print('Saved corrected source '..out..' frames='..#s.frames..' layers='..#s.layers)

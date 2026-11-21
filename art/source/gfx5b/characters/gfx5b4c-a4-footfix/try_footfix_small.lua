-- Candidate targeted fix for visible foot drift. Start from A4, edit only legs.
-- Move planted-foot boot pixels (y>=33), preserving torso/other layers/special frames.
local s=assert(app.open(assert(app.params.input)));assert(s.width==32 and s.height==40 and #s.frames==98)
local layer;for _,l in ipairs(s.layers)do if l.name=='legs' then layer=l end end;assert(layer)
local vectors={{0,1},{1,1},{1,0},{1,-1},{0,-1},{-1,-1},{-1,0},{-1,1}}
for di,v in ipairs(vectors)do
 local unit=2;local vx=v[1]*unit;local vy=v[2]*unit
 for _,pair in ipairs({{2,3,1},{5,6,0}})do
  -- For upward travel shift the earlier foot, preserving the bottom canvas;
  -- otherwise shift the later foot back relative to travel.
  local phase,dx,dy
  if vy<0 then phase=pair[1];dx=vx;dy=vy else phase=pair[2];dx=-vx;dy=-vy end
  local n=33+(di-1)*6+phase-1;local cel=assert(layer:cel(s.frames[n]));local old=Image(32,40,ColorMode.RGB);old:drawImage(cel.image,cel.position);local out=Image(32,40,ColorMode.RGB)
  for y=0,39 do for x=0,31 do local px=old:getPixel(x,y);if app.pixelColor.rgbaA(px)>0 then
   local selected=y>=33 and ((pair[3]==1 and x>=16) or (pair[3]==0 and x<16))
   if selected then local xx,yy=x+dx,y+dy;if xx>=0 and xx<32 and yy>=0 and yy<40 then out:drawPixel(xx,yy,px)end else out:drawPixel(x,y,px)end
  end end end
  cel.image=out;cel.position=Point(0,0)
 end
end
s:saveAs(assert(app.params.output))

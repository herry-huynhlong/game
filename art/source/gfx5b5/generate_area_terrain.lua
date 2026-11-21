local output=assert(app.params.output)
local W,H=512,512
local sprite=Sprite(W,H,ColorMode.RGB)
local layerGround=sprite.layers[1];layerGround.name='01 Terrain materials'
local layerRelief=sprite:newLayer();layerRelief.name='02 Shores and cliff relief'
local layerDetails=sprite:newLayer();layerDetails.name='03 Grass flowers and roots'
local function col(hex)
 return app.pixelColor.rgba(tonumber(hex:sub(2,3),16),tonumber(hex:sub(4,5),16),tonumber(hex:sub(6,7),16),255)
end
local palettes={
 grass={'#3C6740','#507A47','#6C914F','#2F5037','#87A65E'},forest={'#3B4837','#4E5A3A','#756344','#283A31','#65744A'},
 earth={'#76543A','#8B6847','#A17A4E','#533F31','#C09A63'},dry={'#76683B','#978545','#B6A45A','#514D32','#D0B869'},
 city={'#626B68','#79817A','#939489','#444E4B','#ABB0A0'},sect={'#58656A','#718084','#9AA39B','#39474C','#B4B7A7'},
 rock={'#4E5048','#6B695B','#898271','#343D3A','#A99C7D'},water={'#285D72','#367C91','#58A1AC','#204959','#96C4BC'},
 moss={'#3D5940','#55754A','#78905A','#2B4136','#9DA56C'}
}
local function xy(id)return (id%16)*32,math.floor(id/16)*32 end
local function rect(im,id,x,y,w,h,c)local ox,oy=xy(id);local v=col(c);for yy=math.max(0,y),math.min(31,y+h-1)do for xx=math.max(0,x),math.min(31,x+w-1)do im:drawPixel(ox+xx,oy+yy,v)end end end
local function px(im,id,x,y,c)if x>=0 and x<32 and y>=0 and y<32 then local ox,oy=xy(id);im:drawPixel(ox+x,oy+y,col(c))end end
local function line(im,id,x1,y1,x2,y2,c)local ox,oy=xy(id);local dx=math.abs(x2-x1);local dy=math.abs(y2-y1);local sx=x1<x2 and 1 or -1;local sy=y1<y2 and 1 or -1;local err=dx-dy;while true do if x1>=0 and x1<32 and y1>=0 and y1<32 then im:drawPixel(ox+x1,oy+y1,col(c))end;if x1==x2 and y1==y2 then break end;local e=2*err;if e>-dy then err=err-dy;x1=x1-dy*sx;x1=x1+sx end;if e<dx then err=err+dx;y1=y1+sy end end end
-- The line helper above uses integer Bresenham with fixed small motifs; use stepped paths for long seams.
local function path(im,id,pts,c)for i=1,#pts-1 do local a,b=pts[i],pts[i+1];local x,y=a[1],a[2];local dx=math.abs(b[1]-x);local dy=math.abs(b[2]-y);local sx=x<b[1]and 1 or -1;local sy=y<b[2]and 1 or -1;local e=dx-dy;while true do px(im,id,x,y,c);if x==b[1]and y==b[2]then break end;local q=2*e;if q>-dy then e=e-dy;x=x+sx end;if q<dx then e=e+dx;y=y+sy end end end end
local function poly(im,id,pts,c)local ymin,ymax=32,0;for _,p in ipairs(pts)do ymin=math.min(ymin,p[2]);ymax=math.max(ymax,p[2])end;for y=math.max(0,ymin),math.min(31,ymax)do local xs={};for i,p in ipairs(pts)do local q=pts[i%#pts+1];if(p[2]<=y and q[2]>y)or(q[2]<=y and p[2]>y)then xs[#xs+1]=p[1]+(y-p[2])*(q[1]-p[1])/(q[2]-p[2])end end;table.sort(xs);for i=1,#xs-1,2 do for x=math.max(0,math.ceil(xs[i])),math.min(31,math.floor(xs[i+1]))do px(im,id,x,y,c)end end end end
local g=Image(W,H,ColorMode.RGB);local r=Image(W,H,ColorMode.RGB);local d=Image(W,H,ColorMode.RGB)
local function groundTile(id,pal,kind,v)
 rect(g,id,0,0,32,32,pal[1]);math.randomseed(5609+id*733+v*91)
 if kind=='grass' then
  for n=1,4 do local x=math.random(3,28);local y=math.random(3,28);local c=math.random(1,3);px(g,id,x,y,pal[c]);px(g,id,x+1,y,pal[2]);if n%2==0 then px(g,id,x-1,y+1,pal[1])end end
  for n=1,2 do local x=math.random(3,28);local y=math.random(5,27);path(d,id,{{x,y},{x-1,y-2}},pal[2]);path(d,id,{{x,y},{x+1,y-2}},pal[3]);px(d,id,x,y-3,pal[4])end
 elseif kind=='forest' then
  for n=1,4 do local x=math.random(3,27);local y=math.random(3,28);px(g,id,x,y,pal[3]);px(g,id,x+1,y,pal[2]);px(g,id,x+2,y+1,pal[4]);if n%2==1 then path(g,id,{{x-2,y+2},{x,y+1},{x+2,y+2}},pal[4])end end
 elseif kind=='earth' or kind=='dry' or kind=='rock' or kind=='moss' then
  for n=1,(kind=='rock'and 6 or 3)do local x=math.random(2,27);local y=math.random(2,28);local w=math.random(1,3);rect(g,id,x,y,w,1,pal[3]);if w>1 then px(g,id,x+1,y+1,pal[2])end;px(g,id,x,y+1,pal[4])end
  if kind=='dry' or kind=='moss' then for n=1,2 do local x=math.random(3,28);local y=math.random(8,28);path(d,id,{{x,y},{x-1,y-3}},pal[2]);path(d,id,{{x,y},{x+1,y-2}},pal[3])end end
 elseif kind=='city' or kind=='sect' then
  local shift=(v%2)*5
  for row=0,3 do local y=row*8;local x0=(row%2==0 and 0 or -shift)
   for x=x0,32,11 do local xx=x+1;local yy=y+1;local w=math.random(7,10);local h=math.random(5,6)
    poly(g,id,{{xx,yy+1},{xx+2,yy},{xx+w-1,yy+1},{xx+w,yy+h-1},{xx+w-2,yy+h},{xx+1,yy+h-1}},pal[2]);path(g,id,{{xx+2,yy},{xx+w-2,yy+1}},pal[3]);path(g,id,{{xx+1,yy+h-1},{xx+w-2,yy+h}},pal[4])
   end
  end
 elseif kind=='water' then
  for n=1,4 do local y=math.random(3,28);local x=math.random(1,21);local w=math.random(5,10);path(g,id,{{x,y},{x+2,y},{x+3,y+1},{x+w,y+1}},pal[2]);px(g,id,x+math.random(1,3),y-1,pal[3])end
 end
 -- restrained chipped corners vary each tile without creating a repeated checker pattern.
 if kind=='city' or kind=='sect' then px(g,id,math.random(2,29),math.random(2,29),pal[1])end
end
local families={{0,'grass',palettes.grass},{8,'forest',palettes.forest},{16,'earth',palettes.earth},{24,'dry',palettes.dry},{32,'city',palettes.city},{40,'sect',palettes.sect},{48,'rock',palettes.rock},{56,'water',palettes.water},{72,'earth',palettes.earth},{80,'sect',palettes.sect},{112,'moss',palettes.moss}}
for _,f in ipairs(families)do for v=0,7 do groundTile(f[1]+v,f[3],f[2],v)end end
-- Shore strips and cliff caps/faces. Each 32px panel has a fixed top-left light and dark lower plane.
for v=0,7 do
 local id=64+v;rect(r,id,0,0,32,32,palettes.water[1]);local side=v%4
 if side==0 then for y=0,8 do for x=0,31 do local edge=6+math.floor(math.abs(x-15)/6);if y>=edge then px(r,id,x,y,palettes.earth[2]);if y==edge then px(r,id,x,y,palettes.grass[2])end end end end
 elseif side==1 then for y=0,31 do for x=23,31 do if x>=23+math.floor(math.abs(y-15)/6)then px(r,id,x,y,palettes.earth[2])end end end
 elseif side==2 then for y=23,31 do for x=0,31 do if y>=23+math.floor(math.abs(x-15)/6)then px(r,id,x,y,palettes.earth[2])end end end
 else for y=0,31 do for x=0,8 do if x<=8-math.floor(math.abs(y-15)/6)then px(r,id,x,y,palettes.earth[2])end end end end
 for n=1,3 do local x=math.random(2,29);local y=math.random(2,29);px(r,id,x,y,palettes.rock[3]);px(r,id,x+1,y,palettes.rock[2])end
 local c=88+v;rect(r,c,0,0,32,32,palettes.grass[1]);rect(r,c,0,0,32,7,palettes.grass[2]);path(r,c,{{0,7},{5,6},{11,8},{16,6},{23,7},{31,5}},palettes.grass[3]);rect(r,c,0,9,32,23,palettes.rock[2]);path(r,c,{{0,10},{8,9},{14,11},{21,9},{31,10}},palettes.rock[3]);path(r,c,{{0,30},{8,28},{18,30},{25,28},{31,29}},palettes.rock[4]);for n=1,5 do local x=math.random(2,29);local y=math.random(12,28);path(r,c,{{x,y},{x-1,y+2},{x+1,y+4}},palettes.rock[1])end
 local corner=96+v;rect(r,corner,0,0,32,32,palettes.grass[1]);poly(r,corner,{{0,0},{31,0},{31,20},{26,19},{21,22},{15,19},{10,21},{4,19},{0,21}},palettes.rock[2]);path(r,corner,{{0,20},{5,18},{10,20},{15,18},{21,21},{26,18},{31,20}},palettes.rock[3]);rect(r,corner,0,22,32,10,palettes.rock[1])
end
-- Pixel plants, roots, flowers, and moss as transparent map decals.
for v=0,15 do local id=128+v;math.randomseed(837+v*127)
 if v<6 then local x=math.random(11,20);local y=math.random(17,23);for n=1,4 do local bx=x+math.random(-5,5);local by=y+math.random(-2,2);path(d,id,{{bx,by},{bx-1,by-4}},palettes.grass[1]);px(d,id,bx-1,by-5,palettes.grass[3]);px(d,id,bx,by-4,palettes.grass[2])end
 elseif v<11 then local x=math.random(12,20);local y=math.random(14,22);for _,o in ipairs({{-2,0},{2,0},{0,-2},{0,2}})do px(d,id,x+o[1],y+o[2],palettes.grass[3])end;px(d,id,x,y,palettes.dry[5]);px(d,id,x,y+1,palettes.earth[4])
 else local x=math.random(5,14);local y=math.random(15,23);path(d,id,{{x,y},{x+5,y+2},{x+9,y+1}},palettes.earth[4]);path(d,id,{{x+4,y+1},{x+3,y-3},{x+7,y-5}},palettes.moss[3])end
end
-- Cliff-face and dry-bank variants are placed on a dedicated Tiled overlay layer.
for id=104,111 do local v=id-104;rect(r,id,0,0,32,32,palettes.rock[1]);poly(r,id,{{0,0},{31,0},{31,5},{26,7},{22,5},{17,8},{11,6},{6,8},{0,6}},palettes.grass[2]);poly(r,id,{{0,7},{6,8},{11,6},{17,8},{22,5},{26,7},{31,5},{31,31},{0,31}},palettes.rock[2]);path(r,id,{{1,10},{7,12},{8,18}},palettes.rock[3]);path(r,id,{{22,9},{19,15},{24,19},{22,27}},palettes.rock[1]);for n=1,3 do local x=math.random(3,28);local y=math.random(10,26);px(r,id,x,y,palettes.rock[4]);px(r,id,x+1,y+1,palettes.rock[3])end end
sprite:newCel(layerGround,sprite.frames[1],g,Point(0,0));sprite:newCel(layerRelief,sprite.frames[1],r,Point(0,0));sprite:newCel(layerDetails,sprite.frames[1],d,Point(0,0));sprite:saveAs(output)
print('GFX5B.5 area terrain atlas: 256 tiles, 3 editable layers')

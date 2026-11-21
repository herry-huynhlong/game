local output=assert(app.params.output,'missing output')
local W,H=256,256
local sprite=Sprite(W,H,ColorMode.RGB)
local baseLayer=sprite.layers[1];baseLayer.name='01 Depth and water color fields'
local detailLayer=sprite:newLayer();detailLayer.name='02 Currents stones banks and light'
local function col(hex,alpha)
 return app.pixelColor.rgba(tonumber(hex:sub(2,3),16),tonumber(hex:sub(4,5),16),tonumber(hex:sub(6,7),16),alpha or 255)
end
local palettes={
 river={'#173F52','#20566A','#2C7180','#438F98','#66ADA9','#A4D3C6'},
 stream={'#285D6B','#397B83','#55979A','#7BB7AE','#B8D7C4','#183F4C'},
 lake={'#1B4A5C','#286376','#377E89','#559D9E','#83BDB2','#B9D8C7'},
 sand={'#69543B','#846945','#9C8051','#B19A68','#6C7650'},
 rock={'#353D3B','#4E5650','#697066','#899080','#A5A38C','#C1B99C'}
}
local function origin(id)return (id%8)*32,math.floor(id/8)*32 end
local function px(im,id,x,y,c,alpha)
 if x>=0 and x<32 and y>=0 and y<32 then local ox,oy=origin(id);im:drawPixel(ox+x,oy+y,col(c,alpha))end
end
local function rect(im,id,x,y,w,h,c,alpha)
 for yy=math.max(0,y),math.min(31,y+h-1)do for xx=math.max(0,x),math.min(31,x+w-1)do px(im,id,xx,yy,c,alpha)end end
end
local function line(im,id,x0,y0,x1,y1,c,alpha)
 local dx=math.abs(x1-x0);local sx=x0<x1 and 1 or -1;local dy=-math.abs(y1-y0);local sy=y0<y1 and 1 or -1;local err=dx+dy
 while true do px(im,id,x0,y0,c,alpha);if x0==x1 and y0==y1 then break end;local e=2*err;if e>=dy then err=err+dy;x0=x0+sx end;if e<=dx then err=err+dx;y0=y0+sy end end
end
local function poly(im,id,points,c,alpha)
 local lo,hi=32,0;for _,p in ipairs(points)do lo=math.min(lo,p[2]);hi=math.max(hi,p[2])end
 for y=math.max(0,lo),math.min(31,hi)do local xs={};for i,p in ipairs(points)do local q=points[i%#points+1];if(p[2]<=y and q[2]>y)or(q[2]<=y and p[2]>y)then xs[#xs+1]=p[1]+(y-p[2])*(q[1]-p[1])/(q[2]-p[2])end end;table.sort(xs);for i=1,#xs-1,2 do for x=math.max(0,math.ceil(xs[i])),math.min(31,math.floor(xs[i+1]))do px(im,id,x,y,c,alpha)end end end
end
local base=Image(W,H,ColorMode.RGB);base:clear(Color(0,0,0,0))
local details=Image(W,H,ColorMode.RGB);details:clear(Color(0,0,0,0))
local function drawBase(id,palette,seed,kind)
 local ground=kind=='river' and palette[1]or kind=='stream'and palette[2]or palette[1]
 rect(base,id,0,0,32,32,ground)
 math.randomseed(seed*199+721)
 if kind=='river' then
  for n=1,5 do local x=math.random(2,27);local y=math.random(0,25);local len=math.random(5,12);local bend=math.random(-2,2);line(base,id,x,y,x+bend,y+len,palette[2]);if n%2==0 then line(details,id,x-1,y+2,x+bend-1,y+len-1,palette[1])end end
  for n=1,4 do local x=math.random(3,27);local y=math.random(2,28);line(details,id,x,y,x+math.random(-1,1),y+math.random(2,5),palette[3]);if n%2==0 then px(details,id,x-1,y,palette[4],210)end end
 elseif kind=='east' then
  for n=1,5 do local x=math.random(0,22);local y=math.random(2,27);local len=math.random(5,12);local bend=math.random(-2,2);line(base,id,x,y,x+len,y+bend,palette[2]);if n%2==0 then line(details,id,x+2,y-1,x+len-1,y+bend-1,palette[1])end end
  for n=1,4 do local x=math.random(2,26);local y=math.random(3,27);line(details,id,x,y,x+math.random(2,5),y+math.random(-1,1),palette[3])end
 elseif kind=='stream' then
  for n=1,3 do local x=math.random(2,25);local y=math.random(2,25);local w=math.random(2,4);local h=math.random(2,4);poly(base,id,{{x,y},{x+w,y+1},{x+w-1,y+h},{x+1,y+h-1}},palette[1])end
  for n=1,4 do local x=math.random(2,26);local y=math.random(2,26);line(details,id,x,y,x+math.random(2,5),y+math.random(-1,1),palette[4])end
 elseif kind=='lake' then
  for n=1,5 do local x=math.random(1,27);local y=math.random(1,27);local w=math.random(2,6);local h=math.random(1,3);poly(base,id,{{x,y+1},{x+1,y},{x+w-1,y+1},{x+w,y+h},{x+2,y+h-1}},n%2==0 and palette[2]or palette[1])end
  for n=1,4 do local x=math.random(2,27);local y=math.random(2,27);line(details,id,x,y,x+math.random(2,6),y,palette[3],175)end
 end
end
for v=0,7 do drawBase(v,palettes.river,v+1,'river')end
for v=0,7 do drawBase(8+v,palettes.river,v+9,'east')end
for v=0,7 do drawBase(16+v,palettes.stream,v+17,'stream')end
for v=0,7 do drawBase(24+v,palettes.lake,v+25,'lake')end
-- Bank strips: 32-39 are top/bottom/left/right with two hand-authored pixel variants each.
for v=0,7 do
 local id=32+v;local side=math.floor(v/2);local flip=v%2==1;math.randomseed(8100+v*77)
 rect(base,id,0,0,32,32,palettes.sand[1])
 local jitter=flip and 2 or 0
 if side==0 then
  poly(base,id,{{0,17+jitter},{4,15},{8,16+jitter},{13,14},{18,16},{23,15+jitter},{27,17},{32,15},{32,32},{0,32}},palettes.stream[2]);line(details,id,0,18+jitter,31,17,palettes.stream[3]);line(details,id,1,20+jitter,30,19,palettes.stream[1])
  for n=1,4 do local x=math.random(2,28);px(details,id,x,math.random(3,12),palettes.sand[math.random(2,5)])end
 elseif side==1 then
  poly(base,id,{{0,0},{32,0},{32,15},{27,17},{23,15+jitter},{18,17},{13,15},{8,17+jitter},{4,15},{0,17}},palettes.stream[2]);line(details,id,0,15,31,17+jitter,palettes.stream[3]);line(details,id,0,18,31,20,palettes.stream[1])
  for n=1,4 do local x=math.random(2,28);px(details,id,x,math.random(21,29),palettes.sand[math.random(2,5)])end
 elseif side==2 then
  poly(base,id,{{16+jitter,0},{32,0},{32,32},{16,32},{14,27},{16+jitter,22},{14,17},{16,12},{14,7}},palettes.stream[2]);line(details,id,16+jitter,0,15,31,palettes.stream[3]);line(details,id,18,1,17,30,palettes.stream[1])
  for n=1,4 do local y=math.random(2,28);px(details,id,math.random(2,11),y,palettes.sand[math.random(2,5)])end
 else
  poly(base,id,{{0,0},{16,0},{18,5},{16+jitter,10},{18,15},{16,20},{18,25},{16,32},{0,32}},palettes.stream[2]);line(details,id,15,0,17+jitter,31,palettes.stream[3]);line(details,id,13,1,15,30,palettes.stream[1])
  for n=1,4 do local y=math.random(2,28);px(details,id,math.random(21,29),y,palettes.sand[math.random(2,5)])end
 end
end
-- Bank corners 40-47: diagonal water/soil transitions for bends and coves.
for v=0,7 do
 local id=40+v;math.randomseed(9300+v*43);rect(base,id,0,0,32,32,palettes.sand[1])
 local kind=v%4
 if kind==0 then poly(base,id,{{0,19},{5,17},{9,18},{14,14},{18,15},{23,10},{27,11},{32,7},{32,32},{0,32}},palettes.stream[2]);line(details,id,0,20,31,8,palettes.stream[3])
 elseif kind==1 then poly(base,id,{{0,7},{5,10},{9,11},{14,16},{18,16},{23,21},{27,22},{32,25},{32,32},{0,32}},palettes.stream[2]);line(details,id,0,6,31,24,palettes.stream[3])
 elseif kind==2 then poly(base,id,{{0,32},{0,15},{5,17},{9,16},{14,20},{18,19},{23,24},{27,23},{32,27},{32,32}},palettes.stream[2]);line(details,id,0,14,31,26,palettes.stream[3])
 else poly(base,id,{{0,0},{32,0},{32,16},{27,14},{23,15},{18,11},{14,12},{9,8},{5,9},{0,5}},palettes.stream[2]);line(details,id,0,6,31,17,palettes.stream[3])end
 for n=1,3 do local x=math.random(2,29);local y=math.random(2,29);px(details,id,x,y,palettes.sand[math.random(2,5)])end
end
-- Eight distinct stream stones sit in water; their rims use broken white-cyan foam.
for v=0,7 do
 local id=48+v;drawBase(id,palettes.river,v+52,'river');math.randomseed(920+v*61)
 local cx=math.random(12,20);local cy=math.random(12,19);local rx=math.random(4,6);local ry=math.random(3,5)
 poly(details,id,{{cx-rx,cy-1},{cx-rx+2,cy-ry},{cx+rx-2,cy-ry-1},{cx+rx,cy-1},{cx+rx-1,cy+ry-2},{cx+1,cy+ry},{cx-rx+1,cy+ry-1}},palettes.rock[1])
 poly(details,id,{{cx-rx+1,cy-2},{cx-rx+2,cy-ry+1},{cx+rx-2,cy-ry},{cx+rx-1,cy},{cx+rx-2,cy+ry-2},{cx+1,cy+ry-1},{cx-rx+1,cy+ry-2}},palettes.rock[3])
 line(details,id,cx-rx+2,cy-ry+1,cx+1,cy-ry,palettes.rock[5]);px(details,id,cx-1,cy-2,palettes.rock[6]);px(details,id,cx+2,cy+1,palettes.rock[2])
 for n=1,4 do local angle=math.random()*6.28;local x=math.floor(cx+math.cos(angle)*(rx+2));local y=math.floor(cy+math.sin(angle)*(ry+2));px(details,id,x,y,palettes.stream[5]);if n%2==0 then px(details,id,x+1,y,palettes.stream[4])end end
end
for i=1,#sprite.frames do
 local frame=sprite.frames[i];sprite:newCel(baseLayer,frame,base,Point(0,0));sprite:newCel(detailLayer,frame,details,Point(0,0))
end
sprite:newTag(1,1).name='water_tiles_64'
app.activeSprite=sprite;sprite:saveAs(output)
print('Water A tiles: 64 distinct tiles, 8x8 atlas, depth/flow/shore/rock layers')

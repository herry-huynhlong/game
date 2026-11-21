-- WORLD.GATE.4DIR: hand-drawn directional city gates, not rotated copies.
-- Run with the local Aseprite CLI; the editable source has four frames and five layers.
print('GATE SCRIPT START')
local root = app.params['root'] or 'D:/anh/game/xianxia-mvp'
local out = root .. '/art/source/world-gates-4dir'
local runtime = root .. '/public/assets/world-gates-4dir'
print('DIRS READY')
local W,H=192,192
local C=ColorMode.RGB
local function c(r,g,b,a) return app.pixelColor.rgba(r,g,b,a or 255) end
local P={
  ink=c(25,34,31),shadow=c(28,40,35,150),shadowSoft=c(40,53,44,115),
  stoneD=c(54,66,62),stone=c(91,105,96),stoneM=c(121,133,118),stoneL=c(161,164,137),stoneHi=c(190,184,147),
  mortar=c(71,82,75),jadeD=c(21,59,55),jade=c(29,82,75),jadeM=c(42,111,99),jadeL=c(77,145,125),jadeHi=c(137,177,145),
  woodD=c(61,42,33),wood=c(94,58,40),woodM=c(128,79,49),woodL=c(164,111,66),gold=c(213,171,83),red=c(142,57,43),
  passage=c(67,73,63),floor=c(117,119,99),floorL=c(153,150,119),lantern=c(242,185,77),
}
local function line(im,x0,y0,x1,y1,col)
  local dx,dy=math.abs(x1-x0),math.abs(y1-y0);local sx=x0<x1 and 1 or -1;local sy=y0<y1 and 1 or -1;local e=dx-dy
  while true do if x0>=0 and y0>=0 and x0<W and y0<H then im:drawPixel(x0,y0,col) end;if x0==x1 and y0==y1 then break end;local q=2*e;if q>-dy then e=e-dy;x0=x0+sx end;if q<dx then e=e+dx;y0=y0+sy end end
end
local function fill(im,x,y,w,h,col) for yy=math.max(0,y),math.min(H-1,y+h-1) do for xx=math.max(0,x),math.min(W-1,x+w-1) do im:drawPixel(xx,yy,col) end end end
local function poly(im,pts,col)
  local miny,maxy=H,0;for _,p in ipairs(pts) do miny=math.min(miny,p[2]);maxy=math.max(maxy,p[2]) end
  for y=math.max(0,miny),math.min(H-1,maxy) do local xs={};for i=1,#pts do local a,b=pts[i],pts[i%#pts+1];if(a[2]<=y and b[2]>y)or(b[2]<=y and a[2]>y)then xs[#xs+1]=a[1]+(y-a[2])*(b[1]-a[1])/(b[2]-a[2])end end;table.sort(xs);for i=1,#xs-1,2 do for x=math.max(0,math.ceil(xs[i])),math.min(W-1,math.floor(xs[i+1])) do im:drawPixel(x,y,col)end end end
end
local function rect(im,x,y,w,h,edge,inside) fill(im,x,y,w,h,edge);if w>2 and h>2 then fill(im,x+1,y+1,w-2,h-2,inside)end end
local function shadowEllipse(im,cx,cy,rx,ry,col)
  for y=-ry,ry do for x=-rx,rx do if (x*x)/(rx*rx)+(y*y)/(ry*ry)<=1 then local px,py=cx+x,cy+y;if px>=0 and py>=0 and px<W and py<H then im:drawPixel(px,py,col)end end end end
end
local function pavers(im,x0,y0,x1,y1,vertical)
  fill(im,x0,y0,x1-x0+1,y1-y0+1,P.floor)
  if vertical then for y=y0+3,y1-2,8 do line(im,x0+2,y,x1-2,y,P.mortar);line(im,x0+4,y+1,x1-4,y+1,P.floorL) end
  else for x=x0+3,x1-2,8 do line(im,x,y0+2,x,y1-2,P.mortar);line(im,x+1,y0+4,x+1,y1-4,P.floorL) end end
end
local function ledgeH(im,y,x0,x1)
  fill(im,x0,y,x1-x0+1,11,P.stoneD);fill(im,x0+2,y+2,x1-x0-3,6,P.stoneM);line(im,x0+3,y+2,x1-3,y+2,P.stoneHi);line(im,x0+3,y+8,x1-3,y+8,P.mortar)
  for x=x0+8,x1-8,18 do line(im,x,y+3,x,y+7,P.stoneL)end
end
local function ledgeV(im,x,y0,y1)
  fill(im,x,y0,11,y1-y0+1,P.stoneD);fill(im,x+2,y0+2,6,y1-y0-3,P.stoneM);line(im,x+2,y0+3,x+2,y1-3,P.stoneHi);line(im,x+8,y0+3,x+8,y1-3,P.mortar)
  for y=y0+8,y1-8,18 do line(im,x+3,y,x+7,y,P.stoneL)end
end
local function roofH(im,variant)
  local pts=variant==1 and {{20,65},{33,39},{57,25},{135,25},{159,39},{174,65},{163,105},{29,105}} or {{18,67},{35,46},{58,34},{134,34},{158,46},{176,67},{160,99},{32,99}}
  poly(im,{{pts[1][1]+7,pts[1][2]+9},{pts[2][1]+7,pts[2][2]+9},{pts[3][1]+7,pts[3][2]+9},{pts[4][1]+7,pts[4][2]+9},{pts[5][1]+7,pts[5][2]+9},{pts[6][1]+7,pts[6][2]+9},{pts[7][1]+7,pts[7][2]+9},{pts[8][1]+7,pts[8][2]+9}},P.shadow)
  poly(im,pts,P.ink)
  local roof=variant==1 and {{22,63},{36,42},{59,31},{133,31},{157,42},{171,63},{161,91},{32,91}} or {{22,65},{38,49},{60,40},{132,40},{154,49},{171,65},{158,88},{35,88}}
  poly(im,roof,P.jadeD);poly(im,{{30,61},{44,45},{63,36},{129,36},{150,45},{164,62},{155,72},{37,72}},P.jade)
  for y=47,70,7 do line(im,45,y,148,y,P.jadeM);line(im,48,y+1,146,y+1,P.jadeL)end
  line(im,28,64,18,75,P.jadeL);line(im,164,64,176,74,P.jadeM);line(im,18,75,35,76,P.jadeL);line(im,161,76,176,74,P.jadeL)
  fill(im,32,89,129,7,P.woodD);fill(im,36,89,121,3,P.woodL);line(im,28,97,163,97,P.gold)
  if variant==1 then fill(im,82,32,28,5,P.gold);fill(im,91,20,10,13,P.woodM);fill(im,94,15,4,8,P.gold) else fill(im,76,38,40,5,P.woodL);fill(im,84,39,24,3,P.gold) end
end
local function baseNorthSouth(im,variant)
  -- Gatehouse body and open arch, with separate side piers and visible depth.
  fill(im,45,82,20,60,P.stoneD);fill(im,48,84,14,54,P.stoneM);fill(im,50,86,3,49,P.stoneHi)
  fill(im,127,82,20,60,P.stoneD);fill(im,130,84,14,54,P.stoneM);fill(im,141,86,3,49,P.mortar)
  fill(im,64,97,8,31,P.woodD);fill(im,120,97,8,31,P.woodD)
  -- The open arch center stays transparent; roof and masonry are separate layers.
  fill(im,65,91,62,10,P.woodD);fill(im,70,94,52,5,P.woodM);line(im,73,94,119,94,P.gold)
  -- Carved lintel frames the tunnel, not its center.
  fill(im,67,99,58,8,P.stoneD);fill(im,72,101,48,3,P.woodL);line(im,70,108,122,108,P.stoneHi)
  for y=110,135,8 do line(im,70,y,75,y,P.gold);line(im,117,y,122,y,P.gold)end
  -- Open timber doors fold against the jambs.
  poly(im,{{53,103},{65,107},{65,131},{55,127}},P.woodD);poly(im,{{55,105},{63,109},{63,127},{57,124}},P.woodM);line(im,57,108,61,110,P.gold)
  poly(im,{{139,103},{127,107},{127,131},{137,127}},P.woodD);poly(im,{{137,105},{129,109},{129,127},{135,124}},P.wood);line(im,131,110,135,108,P.woodL)
  -- Deep passage threshold with light entering from upper-left.
  fill(im,76,112,39,4,P.stoneHi);fill(im,79,116,33,3,P.floorL);line(im,80,119,111,119,P.floor)
  for x=80,105,8 do line(im,x,124,x+2,124,P.floorL)end
end
local function gateNorth(im)
  -- North face: crenellated exterior parapet and a taller double-eave roof.
  fill(im,22,57,9,9,P.stoneL);fill(im,160,57,9,9,P.stoneL);line(im,23,59,29,59,P.stoneHi);line(im,161,59,167,59,P.stoneHi)
  for x=44,140,16 do fill(im,x,105,5,5,P.stoneHi);fill(im,x+1,106,2,3,P.gold)end
  fill(im,35,73,6,20,P.woodD);fill(im,34,77,8,10,P.woodM);fill(im,35,79,6,6,P.lantern)
  fill(im,151,73,6,20,P.woodD);fill(im,150,77,8,10,P.woodM);fill(im,151,79,6,6,P.lantern)
  rect(im,80,77,32,13,P.woodD,P.woodM);rect(im,83,79,26,8,P.gold,P.wood);fill(im,90,82,11,2,P.gold)
end
local function gateSouth(im)
  -- South face: lower covered awning, broader side galleries, sect-route plaque.
  fill(im,30,100,12,35,P.stoneD);fill(im,32,103,8,28,P.stoneM);fill(im,150,100,12,35,P.stoneD);fill(im,152,103,8,28,P.stoneM)
  line(im,34,111,39,111,P.stoneHi);line(im,154,111,159,111,P.stoneHi)
  fill(im,79,145,34,3,P.woodD);fill(im,84,146,24,2,P.gold)
  fill(im,39,75,6,18,P.woodD);fill(im,38,79,8,8,P.woodM);fill(im,39,80,6,5,P.lantern)
  fill(im,147,75,6,18,P.woodD);fill(im,146,79,8,8,P.woodM);fill(im,147,80,6,5,P.lantern)
  rect(im,77,78,38,11,P.woodD,P.red);rect(im,80,80,32,6,P.gold,P.wood);line(im,84,83,108,83,P.gold)
end
local function roofV(im,variant)
  local outline
  if variant==1 then outline={{74,18},{112,10},{139,25},{147,47},{147,143},{132,166},{101,180},{73,164},{61,145},{61,48}} else outline={{62,28},{87,12},{125,19},{143,41},{142,150},{121,174},{86,170},{67,153},{57,132},{57,54}} end
  local sh={};for _,p in ipairs(outline)do sh[#sh+1]={p[1]+8,p[2]+9}end;poly(im,sh,P.shadow);poly(im,outline,P.ink)
  local inner=variant==1 and {{78,25},{111,18},{134,31},{140,51},{140,139},{128,157},{102,170},{79,157},{68,140},{68,50}} or {{67,34},{89,20},{121,27},{136,46},{135,145},{117,164},{89,160},{73,146},{64,128},{64,58}}
  poly(im,inner,P.jadeD)
  for y=39,151,9 do
    local left=variant==1 and (70+math.floor(math.max(0,y-40)*.035)) or (65+math.floor(math.max(0,y-40)*.025))
    local right=variant==1 and 137 or 134
    line(im,left,y,right,y-1,P.jadeM);line(im,left+3,y+2,right-3,y+1,P.jadeL)
  end
  line(im,73,42,68,52,P.jadeHi);line(im,137,42,145,52,P.jadeM)
  if variant==1 then fill(im,78,27,50,4,P.gold);fill(im,123,35,5,20,P.red) else fill(im,70,42,5,20,P.gold);fill(im,79,20,39,4,P.jadeL) end
  -- Ridge cap follows the north-left light direction for both orientations.
  line(im,80,26,111,18,P.jadeHi);line(im,80,30,113,22,P.jadeM)
end
local function baseEastWest(im,variant)
  -- Open portal throat and piers align with the vertical wall cut.
  fill(im,99,44,31,22,P.stoneD);fill(im,103,47,23,16,P.stoneM)
  fill(im,99,126,31,22,P.stoneD);fill(im,103,129,23,16,P.stoneM)
  fill(im,105,63,8,19,P.woodD);fill(im,105,110,8,19,P.woodD)
  -- Roof and surface paving have their own layers.
  fill(im,105,70,22,13,P.stoneD);fill(im,108,73,16,6,P.woodM);line(im,108,73,123,73,P.gold)
  -- The side arch remains open, with folded leaves to either side of the walk lane.
  fill(im,122,77,9,37,P.woodD);fill(im,125,80,5,31,P.woodM);line(im,126,83,126,105,P.gold)
  fill(im,98,77,9,37,P.stoneD);fill(im,100,80,5,31,P.stoneM);line(im,102,83,102,105,P.stoneHi)
  fill(im,111,74,12,4,P.stoneHi);fill(im,111,112,12,4,P.stoneD)
end
local function gateEast(im)
  -- East-facing vertical gate: river-side wayfinding plaque and lantern row.
  rect(im,149,75,19,42,P.woodD,P.woodM);rect(im,152,78,13,36,P.gold,P.wood)
  for y=82,106,8 do line(im,155,y,162,y,P.gold)end
  fill(im,144,54,8,16,P.woodD);fill(im,146,57,4,9,P.lantern)
  for y=23,165,24 do fill(im,148,y,5,8,P.stoneHi)end
end
local function gateWest(im)
  -- West-facing watch edge and forest warning banner; different massing, not a flip.
  rect(im,25,71,18,43,P.woodD,P.red);rect(im,28,75,12,34,P.gold,P.wood)
  for y=80,101,7 do line(im,31,y,37,y,P.gold)end
  fill(im,46,60,8,17,P.woodD);fill(im,48,63,4,10,P.lantern)
  fill(im,70,151,47,5,P.stoneD);fill(im,75,152,36,2,P.gold)
  for y=24,166,22 do fill(im,47,y,5,8,P.stoneHi)end
end

print('DRAW FUNCTIONS READY')
local sprite=Sprite(W,H,C)
local names={'Ground shadow','Stone foundation and approach','Gate piers and passage','Curved tiled roof','Carving lanterns and signs'}
local layers={};for i,n in ipairs(names) do local layer=i==1 and sprite.layers[1] or sprite:newLayer();layer.name=n;layers[i]=layer end
local draw={gateNorth,gateSouth,gateEast,gateWest};local tags={'NORTH','SOUTH','EAST','WEST'}
print('LAYERS READY')
for f=1,4 do
  print('DRAW FRAME '..f)
  local frame=f==1 and sprite.frames[1] or sprite:newEmptyFrame();frame.duration=.18
  local draws={
    function(im) if f==1 then shadowEllipse(im,100,154,79,12,P.shadow);shadowEllipse(im,96,152,58,6,P.shadowSoft) elseif f==2 then shadowEllipse(im,94,156,74,12,P.shadow);shadowEllipse(im,99,153,54,5,P.shadowSoft) elseif f==3 then shadowEllipse(im,109,96,16,82,P.shadow);shadowEllipse(im,108,98,8,60,P.shadowSoft) else shadowEllipse(im,102,98,14,79,P.shadow);shadowEllipse(im,100,98,7,57,P.shadowSoft) end end,
    function(im) if f<=2 then pavers(im,66,112,125,191,true);ledgeH(im,117,0,63);ledgeH(im,117,128,191);ledgeH(im,137,0,63);ledgeH(im,137,128,191);fill(im,64,114,4,28,P.stoneHi);fill(im,124,114,4,28,P.stoneD) else pavers(im,0,65,191,126,false);ledgeV(im,117,0,62);ledgeV(im,117,129,191);ledgeV(im,137,0,62);ledgeV(im,137,129,191);fill(im,113,63,28,4,P.stoneHi);fill(im,113,125,28,4,P.stoneD) end end,
    function(im) if f<=2 then baseNorthSouth(im,f) else baseEastWest(im,f-2) end end,
    function(im) if f<=2 then roofH(im,f) else roofV(im,f-2) end end,
    function(im) draw[f](im) end,
  }
  for i,layer in ipairs(layers) do local image=Image(W,H,C);draws[i](image);sprite:newCel(layer,frame,image,Point(0,0)) end
  print('FRAME DONE '..f)
  -- Frame order is NORTH, SOUTH, EAST, WEST; metadata names each static gate.
end
local source=out..'/Qingyun-directional-city-gates.aseprite'
sprite:saveAs(source)
print('Wrote four-direction layered Aseprite source: '..source)
app.exit()

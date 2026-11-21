-- Pixel-by-pixel Aseprite Lua art for WORLD.CITY.1.
-- Four distinct civic/commercial buildings plus seven market stall variants.
local root = app.params['root'] or 'D:/anh/game/xianxia-mvp'
local source = root .. '/art/source/world-city-1'
local runtime = root .. '/public/assets/world-city-1'
local which = app.params['asset'] or 'all'
os.execute('mkdir "'..source..'" 2>nul')
os.execute('mkdir "'..runtime..'" 2>nul')
local C=ColorMode.RGB
local function rgba(r,g,b,a) return app.pixelColor.rgba(r,g,b,a or 255) end
local P={
 ink=rgba(29,36,34), shade=rgba(24,38,36,150), shade2=rgba(33,48,43,110),
 stoneD=rgba(70,77,72), stone=rgba(112,119,103), stoneL=rgba(166,166,136), stoneHi=rgba(204,197,158),
 plasterD=rgba(136,126,96), plaster=rgba(191,179,139), plasterL=rgba(222,208,164),
 woodD=rgba(70,44,35), wood=rgba(105,65,43), woodM=rgba(143,91,54), woodL=rgba(184,130,72), woodHi=rgba(217,169,98),
 tealD=rgba(25,58,59), teal=rgba(31,83,78), tealM=rgba(43,111,99), tealL=rgba(77,145,123),
 redD=rgba(95,39,39), red=rgba(139,53,43), redM=rgba(177,70,51), redL=rgba(211,107,68),
 goldD=rgba(143,103,48), gold=rgba(205,158,73), goldL=rgba(240,204,120),
 glow=rgba(255,211,116), glass=rgba(239,191,99), greenD=rgba(48,81,52), green=rgba(77,119,58), greenL=rgba(139,164,72),
 linen=rgba(224,210,172), blue=rgba(69,112,126), blueL=rgba(126,171,174), herb=rgba(115,150,69), herbL=rgba(174,188,91),
 ceramic=rgba(88,128,137), ceramicL=rgba(150,183,176), white=rgba(232,222,188)
}
local function line(im,x1,y1,x2,y2,c)
 local dx,dy=math.abs(x2-x1),math.abs(y2-y1);local sx=x1<x2 and 1 or -1;local sy=y1<y2 and 1 or -1;local e=dx-dy
 while true do if x1>=0 and y1>=0 and x1<im.width and y1<im.height then im:drawPixel(x1,y1,c) end;if x1==x2 and y1==y2 then break end;local q=2*e;if q>-dy then e=e-dy;x1=x1+sx end;if q<dx then e=e+dx;y1=y1+sy end end
end
local function fill(im,x,y,w,h,c) for yy=math.max(0,y),math.min(im.height-1,y+h-1) do for xx=math.max(0,x),math.min(im.width-1,x+w-1) do im:drawPixel(xx,yy,c) end end end
local function poly(im,pts,c)
 local miny,maxy=im.height,0;for _,p in ipairs(pts)do miny=math.min(miny,p[2]);maxy=math.max(maxy,p[2])end
 for y=math.max(0,miny),math.min(im.height-1,maxy)do local xs={};for i=1,#pts do local a,b=pts[i],pts[i%#pts+1];if(a[2]<=y and b[2]>y)or(b[2]<=y and a[2]>y)then xs[#xs+1]=a[1]+(y-a[2])*(b[1]-a[1])/(b[2]-a[2])end end;table.sort(xs);for i=1,#xs-1,2 do for x=math.max(0,math.ceil(xs[i])),math.min(im.width-1,math.floor(xs[i+1]))do im:drawPixel(x,y,c)end end end
end
local function rect(im,x,y,w,h,c)line(im,x,y,x+w-1,y,c);line(im,x,y+h-1,x+w-1,y+h-1,c);line(im,x,y,x,y+h-1,c);line(im,x+w-1,y,x+w-1,y+h-1,c)end
local function ellipse(im,cx,cy,rx,ry,c)for y=-ry,ry do local q=1-(y*y)/(ry*ry);if q>=0 then local x=math.floor(rx*math.sqrt(q));line(im,cx-x,cy+y,cx+x,cy+y,c)end end end
local function newdoc(w,h,names)local s=Sprite(w,h,C);local ls={};for i,n in ipairs(names)do local l=i==1 and s.layers[1]or s:newLayer();l.name=n;ls[i]=l end;return s,ls end
local function write(s,ls,frames,file,w,h)
 for fi,f in ipairs(frames)do local fr=fi==1 and s.frames[1]or s:newEmptyFrame();fr.duration=.2;for li,layer in ipairs(ls)do local im=Image(w,h,C);f[li](im);s:newCel(layer,fr,im,Point(0,0))end end
 s:saveAs(file);print('Wrote layered Aseprite '..file)
end

local function facade(im,kind)
 local x,w=28,264;if kind=='lord' then x,w=18,284 elseif kind=='quest' then x,w=40,240 end
 -- Stone plinth, shadowed walls and timber framing.
 poly(im,{{x+8,102},{x+w-8,102},{x+w-1,211},{x+w-12,224},{x+12,224},{x,211}},P.ink)
 poly(im,{{x+14,108},{x+w-14,108},{x+w-9,208},{x+w-20,216},{x+20,216},{x+8,207}},P.plasterD)
 fill(im,x+20,113,w-40,91,P.plasterL)
 for bx=x+27,x+w-34,54 do fill(im,bx,110,11,101,P.woodD);fill(im,bx+2,112,5,94,P.woodM);line(im,bx+1,114,bx+1,201,P.woodL)end
 line(im,x+21,119,x+w-21,119,P.white);line(im,x+22,202,x+w-22,202,P.plasterD)
 -- recessed lattice windows with amber paper and split wooden muntins
 local windows=kind=='lord' and {x+50,x+85,x+w-119,x+w-84} or {x+46,x+w-78}
 for _,wx in ipairs(windows)do
  poly(im,{{wx,136},{wx+34,136},{wx+34,178},{wx,178}},P.woodD);fill(im,wx+4,140,26,34,P.glass);fill(im,wx+7,143,8,9,P.glow)
  for sy=143,170,9 do line(im,wx+3,sy,wx+31,sy,P.woodD)end;line(im,wx+17,139,wx+17,175,P.woodD);line(im,wx+2,179,wx+32,179,P.woodL)
 end
 -- central entrance varies by building; the hall gets formal double leaves.
 if kind=='lord' then
  poly(im,{{x+120,143},{x+164,143},{x+164,207},{x+120,207}},P.ink);fill(im,x+124,148,36,58,P.woodD);fill(im,x+128,151,14,51,P.redD);fill(im,x+144,151,13,51,P.woodM)
  for yy=158,192,17 do line(im,x+128,yy,x+157,yy,P.goldD)end;fill(im,x+153,176,3,4,P.goldL)
 else
  local dw=kind=='tavern' and 40 or 32;local dx=x+math.floor((w-dw)/2)
  poly(im,{{dx-3,139},{dx+dw+3,139},{dx+dw+3,209},{dx-3,209}},P.woodD);fill(im,dx,145,dw,62,kind=='tavern' and P.redD or P.wood)
  fill(im,dx+4,151,dw-8,49,kind=='tavern' and P.red or P.woodD);line(im,dx+dw-7,149,dx+dw-7,201,P.woodL);fill(im,dx+dw-11,173,3,5,P.goldL)
  if kind=='quest' then fill(im,dx+dw+9,144,5,52,P.woodD)end
 end
 -- carved foundation stones and broad approach stair, leaving the door clear.
 for sx=x+12,x+w-18,22 do fill(im,sx,211,19,8,P.stoneD);line(im,sx+2,213,sx+16,213,P.stoneL);line(im,sx+10,216,sx+10,218,P.stone)end
 fill(im,x+78,224,w-156,6,P.stoneD);fill(im,x+88,230,w-176,7,P.stoneL);fill(im,x+98,237,w-196,5,P.stoneHi)
 -- wall seams, vent slats and small support brackets add structure at game scale.
 for bx=x+36,x+w-42,54 do poly(im,{{bx,122},{bx+16,122},{bx+12,130},{bx+4,130}},P.woodD);line(im,bx+4,125,bx+12,125,P.goldD)end
 if kind=='inn' then fill(im,x+110,124,44,5,P.redD);line(im,x+111,125,x+152,125,P.goldL) end
 if kind=='tavern' then fill(im,x+70,187,27,14,P.woodD);fill(im,x+72,189,23,9,P.woodM);fill(im,x+77,187,3,7,P.goldD);fill(im,x+87,187,3,7,P.goldD) end
 if kind=='quest' then
  -- two service windows for future issuer/receiver, separated by a wall pier.
  for _,wx in ipairs({x+69,x+w-101})do fill(im,wx,185,32,15,P.woodD);fill(im,wx+3,188,26,8,P.linen);line(im,wx+4,193,wx+28,193,P.goldD);fill(im,wx+14,186,3,13,P.woodM)end
 end
end
local function shadow(im,kind)
 local cx=160;local y=230;local rx=kind=='lord' and 148 or 137
 ellipse(im,cx,y,rx,17,P.shade);ellipse(im,cx,y-2,rx-16,8,P.shade2)
end
local function court(im,kind)
 local cx=160
 poly(im,{{cx-132,232},{cx+132,232},{cx+115,251},{cx-115,251}},P.stoneD)
 for y=235,248,7 do line(im,cx-119,y,cx+119,y,P.stoneL)end
 for row=0,2 do for col=0,8 do local xx=cx-103+col*26+(row%2)*4;local yy=235+row*5;line(im,xx,yy,xx+16,yy,P.stone);im:drawPixel(xx+4,yy+1,P.stoneHi)end end
 -- side lanterns and stone balustrades
 for _,lx in ipairs({28,292})do fill(im,lx-7,222,14,20,P.stoneD);fill(im,lx-5,224,10,15,P.stoneL);fill(im,lx-3,228,6,7,P.glow);line(im,lx-8,227,lx+8,227,P.goldD);line(im,lx-5,223,lx+5,223,P.goldL)end
 if kind=='lord' then
  for _,px in ipairs({78,242})do fill(im,px-4,228,8,10,P.woodD);fill(im,px-2,222,4,7,P.green);im:drawPixel(px-1,221,P.greenL)end
 end
end
local function roof(im,kind)
 local dark,mid,light= P.tealD,P.teal,P.tealL
 if kind=='tavern' then dark,mid,light=P.redD,P.red,P.redL elseif kind=='inn' then dark,mid,light=P.tealD,P.teal,P.tealL elseif kind=='quest' then dark,mid,light=P.woodD,P.red,P.gold end
 if kind=='lord' then
  -- three roof masses: elevated central hall and balanced side wings.
  poly(im,{{18,129},{34,89},{76,69},{122,61},{160,41},{198,61},{244,69},{286,89},{302,129},{282,139},{263,116},{216,105},{202,124},{185,119},{160,91},{135,119},{118,124},{104,105},{57,116},{38,139}},P.ink)
  poly(im,{{25,124},{41,93},{78,75},{122,68},{160,49},{198,68},{241,75},{279,93},{295,124},{279,129},{259,111},{216,100},{203,117},{187,112},{160,83},{133,112},{117,117},{104,100},{61,111},{41,130}},dark)
  poly(im,{{76,91},{88,62},{119,49},{144,47},{160,31},{176,47},{201,49},{232,62},{244,91},{229,98},{211,81},{189,77},{178,94},{160,69},{142,94},{131,77},{109,81},{91,98}},P.ink)
  poly(im,{{83,87},{95,65},{121,53},{144,52},{160,37},{176,52},{199,53},{225,65},{237,87},{224,92},{207,78},{190,74},{177,88},{160,64},{143,88},{130,74},{112,78},{96,92}},mid)
  poly(im,{{137,55},{146,35},{160,20},{174,35},{183,55},{172,60},{160,49},{148,60}},P.ink);poly(im,{{143,52},{151,37},{160,27},{169,37},{177,52},{168,55},{160,46},{151,55}},light)
  for y=100,119,6 do for x=48+(y%2)*8,275,18 do line(im,x,y,x+11,y-7,light)end end
  for y=69,85,5 do for x=100+(y%2)*9,218,16 do line(im,x,y,x+7,y-5,P.tealL)end end
  line(im,34,125,283,125,P.gold);line(im,91,84,230,84,P.goldD);line(im,147,51,173,51,P.goldL)
 else
  local pts
  if kind=='inn' then pts={{18,127},{38,86},{85,68},{114,70},{160,48},{206,70},{235,68},{282,86},{302,127},{286,137},{263,115},{57,115},{34,138}}
  elseif kind=='tavern' then pts={{9,137},{27,91},{72,72},{112,75},{160,49},{207,75},{249,72},{293,91},{311,137},{293,148},{271,122},{49,122},{26,148}}
  else pts={{34,128},{52,88},{93,68},{125,70},{160,49},{195,70},{227,68},{268,88},{286,128},{270,137},{251,116},{68,116},{49,137}} end
  poly(im,pts,P.ink)
  local inset={};for i,p in ipairs(pts)do local dx=p[1]<160 and 7 or -7;local dy=p[2]<100 and 5 or -4;inset[i]={p[1]+dx,p[2]+dy}end;poly(im,inset,dark)
  local bands=kind=='tavern' and {{48,116,272},{63,100,257},{86,84,234},{126,66,194}} or {{51,112,269},{67,96,253},{90,80,230},{128,63,192}}
  for _,b in ipairs(bands)do line(im,b[1],b[2],b[3],b[2],light);line(im,b[1]+4,b[2]+2,b[3]-4,b[2]+2,mid)end
  for y=78,116,7 do local yy=y+(kind=='tavern' and 4 or 0);for x=44+(yy%2)*8,276,18 do line(im,x,yy,x+8,yy-4,mid);im:drawPixel(x+2,yy-1,light)end end
  line(im,18,134,302,134,P.gold);line(im,31,139,291,139,kind=='tavern' and P.woodL or P.goldD)
  if kind=='inn' then
   -- upper dormer with timber lattice, built into this silhouette only.
   poly(im,{{118,73},{128,51},{160,36},{192,51},{202,73},{191,80},{129,80}},P.ink);poly(im,{{124,70},{132,54},{160,41},{188,54},{196,70},{187,75},{133,75}},P.tealM)
   line(im,137,58,183,58,P.gold);line(im,144,62,176,62,P.tealL)
  elseif kind=='quest' then
   -- small roof crest resembling a bound jade scroll rather than a shop awning.
   poly(im,{{139,62},{148,45},{160,39},{172,45},{181,62},{173,66},{160,57},{147,66}},P.ink);line(im,149,58,171,58,P.goldL)
  end
 end
 -- individually tiled ridge caps and curled eave tips; highlights follow a top-left light.
 for _,x in ipairs({30,160,290})do fill(im,x-5,128,11,4,kind=='tavern' and P.goldD or P.gold);im:drawPixel(x-4,127,light);im:drawPixel(x+4,127,light)end
 for _,x in ipairs({47,273})do line(im,x,130,x-7,125,P.gold);im:drawPixel(x-8,124,P.goldL)end
end
local function signs(im,kind)
 local center=160
 -- building-specific framed plaque, rendered as a hand-painted sign rather than text texture.
 local y=kind=='lord' and 139 or 143;local w=kind=='lord' and 74 or 64;local x=center-w/2
 fill(im,x-4,y-4,w+8,22,P.woodD);fill(im,x,y,w,14,kind=='tavern' and P.redD or P.wood);rect(im,x,y,w,14,P.goldD);line(im,x+4,y+3,x+w-5,y+3,P.goldL)
 if kind=='inn' then
  -- three warm window-like strokes and a central gold seal
  for dx=12,52,20 do fill(im,x+dx,y+6,7,5,P.glow);line(im,x+dx+3,y+6,x+dx+3,y+10,P.goldD)end
 elseif kind=='tavern' then
  for dx=13,51,19 do fill(im,x+dx,y+5,6,7,P.gold);im:drawPixel(x+dx+2,y+7,P.redD)end
 elseif kind=='lord' then
  rect(im,x+25,y+5,24,7,P.gold);line(im,x+29,y+8,x+45,y+8,P.tealD);im:drawPixel(x+37,y+6,P.goldL)
 else
  -- two tied scrolls + central stamp signify issuing/returning commissions.
  for _,dx in ipairs({10,45})do fill(im,x+dx,y+5,8,6,P.linen);line(im,x+dx+2,y+7,x+dx+6,y+7,P.red);im:drawPixel(x+dx+4,y+8,P.goldD)end
 end
 -- paired lanterns and ornate brackets, with lit cores under the eaves.
 for _,lx in ipairs({center-79,center+79})do
  line(im,lx,136,lx,153,P.woodD);fill(im,lx-6,150,12,16,P.redD);fill(im,lx-4,152,8,11,P.glow);line(im,lx-7,151,lx+7,151,P.gold);line(im,lx-4,163,lx+4,163,P.goldL);im:drawPixel(lx,168,P.gold)
 end
 if kind=='quest' then
  -- exterior notice board and two distinct future-service signs.
  fill(im,25,184,34,30,P.woodD);fill(im,28,187,28,23,P.linen);line(im,31,191,52,191,P.red);line(im,31,196,50,196,P.goldD);line(im,31,201,46,201,P.goldD);line(im,34,214,34,229,P.woodD);line(im,52,214,52,229,P.woodD)
 end
end
local kinds={'inn','tavern','lord','quest'}
if which=='all' or which=='WorldCityStructures' then
 local s,l=newdoc(320,256,{'Contact shadow','Stone court and stairs','Carpentry and plaster','Layered curved roof tiles','Plaque lanterns and carved details'});local frames={}
 for _,kind in ipairs(kinds)do frames[#frames+1]={function(im)shadow(im,kind)end,function(im)court(im,kind)end,function(im)facade(im,kind)end,function(im)roof(im,kind)end,function(im)signs(im,kind)end}end
 write(s,l,frames,source..'/WorldCityStructures.aseprite',320,256)
end

local function stallFrame(frame)
 local palette={{P.redD,P.red,P.redL},{P.tealD,P.teal,P.tealL},{P.blue,P.blueL,P.white},{P.greenD,P.green,P.greenL},{P.redD,P.teal,P.gold},{P.woodD,P.red,P.gold},{P.tealD,P.blue,P.gold}}
 local pal=palette[frame]
 return {function(im)ellipse(im,64,104,58,7,P.shade);ellipse(im,64,103,43,4,P.shade2)end,function(im)
  -- rough-carved uprights, counter boards, feet and a small backed display shelf
  for _,x in ipairs({20,108})do poly(im,{{x,38},{x+7,38},{x+6,93},{x+3,101},{x,94}},P.woodD);line(im,x+2,43,x+2,92,P.woodL);fill(im,x-3,98,13,4,P.stoneD)end
  poly(im,{{13,73},{115,73},{122,87},{117,96},{11,96},{6,87}},P.ink);poly(im,{{15,76},{113,76},{117,86},{113,91},{14,91},{10,86}},P.wood);line(im,13,80,114,80,P.woodL);line(im,15,88,113,88,P.woodD)
  for x=20,108,22 do line(im,x,80,x,89,P.woodD);im:drawPixel(x+1,82,P.woodHi)end
  -- tucked rear crate and a hanging side cloth
  poly(im,{{27,50},{41,47},{51,54},{50,72},{29,72}},P.woodD);fill(im,31,54,17,14,P.woodM);line(im,32,56,47,56,P.goldD);line(im,34,60,46,60,P.woodL)
  fill(im,100,55,8,18,P.redD);line(im,102,57,106,57,P.gold)
 end,function(im)
  local awning=frame==7 and 'gable' or frame==4 and 'draped' or 'striped'
  if awning=='gable' then
   poly(im,{{8,47},{15,32},{33,23},{64,13},{95,23},{113,32},{120,47},{108,57},{20,57}},P.ink);poly(im,{{14,44},{20,34},{37,27},{64,18},{91,27},{108,34},{114,44},{105,51},{23,51}},pal[1]);line(im,22,38,106,38,pal[3]);line(im,27,44,101,44,pal[2]);line(im,64,20,64,48,pal[3])
  elseif awning=='draped' then
   poly(im,{{10,45},{25,26},{49,24},{64,29},{78,24},{103,26},{118,45},{110,57},{92,54},{64,59},{36,54},{18,57}},P.ink);poly(im,{{16,43},{29,30},{49,28},{64,33},{79,28},{99,30},{112,43},{105,50},{91,48},{64,53},{37,48},{22,51}},pal[1]);for x=24,102,18 do line(im,x,32,x,49,pal[3])end
  else
   poly(im,{{8,48},{17,31},{35,24},{93,24},{111,31},{120,48},{111,57},{17,57}},P.ink);poly(im,{{14,45},{22,34},{38,28},{90,28},{106,34},{114,45},{108,51},{20,51}},pal[1]);line(im,21,34,108,34,pal[3]);line(im,17,46,112,46,pal[2])
   for x=18,108,18 do poly(im,{{x,31},{x+9,31},{x+10,49},{x+5,52},{x,49}},x%3==0 and pal[3] or pal[2]);line(im,x+2,33,x+2,47,pal[3])end
  end
  -- rolled canopy edge with tiny tassels and a marked stall number medallion
  line(im,15,51,112,51,P.gold);for x=23,105,14 do line(im,x,52,x,58,P.goldD);im:drawPixel(x,59,P.goldL)end
  fill(im,59,55,10,8,P.woodD);fill(im,61,57,6,4,P.gold);im:drawPixel(63,58,P.plasterD)
 end,function(im)
  -- distinct goods clusters by stall: fabric, produce, medicinal jars, tools, pantry, tea, household wares.
  if frame==1 then
   poly(im,{{42,66},{48,61},{55,64},{58,74},{46,76}},P.blue);line(im,47,65,54,73,P.blueL);poly(im,{{60,65},{68,60},{74,64},{76,74},{65,76}},P.red);line(im,65,64,72,72,P.gold)
  elseif frame==2 then
   for _,p in ipairs({{46,65,P.red},{59,66,P.green},{72,64,P.gold}})do ellipse(im,p[1],p[2],6,6,p[3]);im:drawPixel(p[1]-2,p[2]-2,P.greenL)end
  elseif frame==3 or frame==6 then
   for _,p in ipairs({{43,70,P.ceramic},{58,66,P.redD},{74,69,P.green}})do fill(im,p[1],p[2]-8,11,13,P.ink);fill(im,p[1]+2,p[2]-6,7,9,p[3]);fill(im,p[1]+4,p[2]-10,4,3,P.goldD);line(im,p[1]+3,p[2]-4,p[1]+7,p[2]-4,P.ceramicL)end
  elseif frame==4 then
   for x=43,80,10 do line(im,x,61,x-4,73,P.greenD);line(im,x+3,61,x+8,73,P.herbL);im:drawPixel(x+1,66,P.greenL)end
  elseif frame==5 then
   fill(im,44,65,42,5,P.woodD);for x=49,78,9 do fill(im,x,60,6,10,P.gold);line(im,x+2,61,x+2,68,P.woodL)end
  else
   for x=47,78,12 do fill(im,x,63,9,12,P.wood);fill(im,x+1,64,7,8,P.linen);line(im,x+2,67,x+6,67,P.woodL)end
  end
  -- display tray lip and a few sharp top-left glints, never fogged or blurred.
  line(im,38,75,88,75,P.goldD);line(im,41,76,85,76,P.goldL);im:drawPixel(40,62,P.white);im:drawPixel(84,63,P.goldL)
 end}
end
if which=='all' or which=='WorldMarketStalls' then
 local s,l=newdoc(128,112,{'Canopy shadows','Timber counter and frame','Distinct cloth roof','Displayed wares and trim'});local frames={};for i=1,7 do frames[i]=stallFrame(i)end
 write(s,l,frames,source..'/WorldMarketStalls.aseprite',128,112)
end
app.exit()

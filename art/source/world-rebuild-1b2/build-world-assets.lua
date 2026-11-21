-- Hand-authored pixel sprites for WORLD.REBUILD.1-B2. Run with Aseprite CLI.
-- Output files are native, layered Aseprite documents and their runtime PNG sheets.
local root = app.params['root'] or 'D:/anh/game/xianxia-mvp'
local out = root .. '/art/source/world-rebuild-1b2'
local runtime = root .. '/public/assets/world-rebuild-1b2'
local only = app.params['asset'] or 'all'
os.execute('mkdir "'..out..'" 2>nul')
os.execute('mkdir "'..runtime..'" 2>nul')
local C=ColorMode.RGB
local function rgba(r,g,b,a) return app.pixelColor.rgba(r,g,b,a or 255) end
local P={ink=rgba(32,43,35),shadow=rgba(28,43,34,115),barkD=rgba(75,48,34),bark=rgba(112,72,43),barkL=rgba(157,111,66),barkHi=rgba(193,150,89),leafD=rgba(30,69,43),leaf=rgba(45,102,54),leafM=rgba(68,132,62),leafL=rgba(105,164,72),leafHi=rgba(159,190,94),pineD=rgba(22,63,56),pine=rgba(28,99,76),pineM=rgba(42,132,91),pineL=rgba(82,165,103),willow=rgba(61,132,74),moss=rgba(88,125,59),stone=rgba(104,112,91),stoneL=rgba(151,155,121),wall=rgba(115,124,112),wallD=rgba(72,84,79),roof=rgba(28,78,74),roofM=rgba(37,103,96),roofL=rgba(73,139,123),wood=rgba(93,60,41),woodL=rgba(151,104,61),plaster=rgba(202,193,155),plasterL=rgba(228,218,180),red=rgba(137,54,41),gold=rgba(218,171,83),window=rgba(242,198,105),ground=rgba(81,105,57)}
local function line(im,x1,y1,x2,y2,c)
 local dx,dy=math.abs(x2-x1),math.abs(y2-y1);local sx=x1<x2 and 1 or -1;local sy=y1<y2 and 1 or -1;local e=dx-dy
 while true do if x1>=0 and y1>=0 and x1<im.width and y1<im.height then im:drawPixel(x1,y1,c) end;if x1==x2 and y1==y2 then break end;local q=2*e;if q>-dy then e=e-dy;x1=x1+sx end;if q<dx then e=e+dx;y1=y1+sy end end
end
local function fill(im,x,y,w,h,c) for yy=math.max(0,y),math.min(im.height-1,y+h-1) do for xx=math.max(0,x),math.min(im.width-1,x+w-1) do im:drawPixel(xx,yy,c) end end end
local function rect(im,x,y,w,h,c) line(im,x,y,x+w-1,y,c);line(im,x,y,x,y+h-1,c);line(im,x+w-1,y,x+w-1,y+h-1,c);line(im,x,y+h-1,x+w-1,y+h-1,c) end
local function poly(im,pts,c)
 local miny,maxy=im.height,0;for _,p in ipairs(pts) do miny=math.min(miny,p[2]);maxy=math.max(maxy,p[2]) end
 for y=math.max(0,miny),math.min(im.height-1,maxy) do local xs={};for i=1,#pts do local a,b=pts[i],pts[i%#pts+1];if(a[2]<=y and b[2]>y)or(b[2]<=y and a[2]>y)then xs[#xs+1]=a[1]+(y-a[2])*(b[1]-a[1])/(b[2]-a[2])end end;table.sort(xs);for i=1,#xs-1,2 do for x=math.max(0,math.ceil(xs[i])),math.min(im.width-1,math.floor(xs[i+1])) do im:drawPixel(x,y,c)end end end
end
local function polyShift(im,pts,c,dx,dy)
 local moved={};for i,p in ipairs(pts)do moved[i]={p[1]+dx,p[2]+dy}end;poly(im,moved,c)
end
local wind={0,1,2,1,0,-1,-2,-1}
local function sway(frame,delay,amp)
 local value=wind[((frame-1+delay)%#wind)+1];return math.floor(value*(amp or 1)+.5)
end
local function newdoc(w,h,names)
 local s=Sprite(w,h,C);local ls={};for i,n in ipairs(names) do local l=i==1 and s.layers[1] or s:newLayer();l.name=n;ls[i]=l end;return s,ls
end
local function emit(s,ls,frames,src,png,w,h,tagName)
 for fi,f in ipairs(frames) do local fr=fi==1 and s.frames[1] or s:newEmptyFrame();fr.duration=f.duration or .22
  for li,layer in ipairs(ls) do local im=Image(w,h,C);f.draw[li](im);s:newCel(layer,fr,im,Point(0,0)) end end
 if tagName then local tag=s:newTag(s.frames[1],s.frames[#s.frames]);tag.name=tagName;tag.aniDir=AniDir.FORWARD;tag.repeats=0 end
 s:saveAs(src)
 print('Wrote source '..src)
end

-- Four distinct canopy/trunk silhouettes; each species is exported as a layered eight-frame wind cycle.
local function tree(kind,phase)
 local L={function(im) if kind==4 then poly(im,{{22,103},{30,100},{43,99},{57,100},{71,102},{78,104},{70,107},{54,108},{37,107},{26,106}},P.shadow)else poly(im,{{32,103},{38,100},{45,99},{53,100},{62,102},{58,105},{46,106},{36,105}},P.shadow)end end,function(im)
  if kind==1 then -- wind-bent mountain pine, tiered needle fans
   poly(im,{{43,94},{39,75},{33,62},{31,48},{26,34},{36,39},{41,53},{43,21},{47,20},{50,52},{62,34},{69,31},{62,47},{57,65},{54,93}},P.barkD);fill(im,43,45,6,48,P.bark);line(im,45,72,38,58,P.barkL);line(im,50,60,63,43,P.barkL)
  elseif kind==2 then -- broad branching tree
   poly(im,{{39,96},{37,73},{31,61},{21,51},{16,40},{23,43},{38,55},{39,39},{33,28},{39,31},{45,45},{49,34},{59,27},{54,39},{49,55},{63,47},{75,37},{80,39},{68,55},{55,69},{53,96}},P.barkD);fill(im,43,49,8,45,P.bark);line(im,44,79,39,59,P.barkL);line(im,48,64,62,51,P.barkL)
  elseif kind==3 then -- slim willow with drooping boughs
   poly(im,{{43,96},{43,65},{40,44},{36,24},{40,36},{46,54},{47,27},{51,15},{52,50},{62,31},{70,22},{64,39},{54,62},{54,96}},P.barkD);fill(im,46,41,5,53,P.bark);line(im,48,65,62,41,P.barkL)
  else -- contorted ancient monster wood and roots
   poly(im,{{19,100},{27,90},{34,82},{31,73},{34,62},{30,48},{35,35},{31,22},{39,31},{42,48},{48,35},{56,29},{53,43},{48,58},{54,69},{67,80},{78,91},{63,87},{54,80},{51,99}},P.barkD);fill(im,39,45,10,47,P.bark);line(im,43,78,37,61,P.moss);line(im,47,65,59,47,P.barkL);line(im,43,52,46,43,P.ink)
  end
 end,function(im)
  local shift=0
  if kind==1 then
   for _,b in ipairs({{42,12,18},{28,25,20},{54,25,19},{20,39,20},{39,40,21},{59,43,18},{31,56,20},{51,58,22}})do local x,y,r=b[1]+shift,b[2],b[3];poly(im,{{x-r,y+6},{x-r+4,y-1},{x-r/2,y-5},{x-2,y-10},{x+r/2,y-5},{x+r,y+1},{x+r-4,y+8},{x,y+5}},P.pineD);line(im,x-r+4,y-1,x-2,y-8,P.pineL);line(im,x-3,y-4,x+r-4,y+1,P.pineM);line(im,x-r+2,y+6,x+r-3,y+6,P.pine)end
  elseif kind==2 then
   local clusters={{{9,37},{13,29},{22,25},{27,19},{37,18},{43,23},{48,18},{58,20},{66,27},{77,30},{83,39},{78,47},{69,49},{64,56},{54,55},{49,62},{39,57},{31,62},{23,55},{15,54},{10,48}},{{20,37},{25,31},{33,29},{39,32},{45,28},{54,31},{61,36},{68,34},{74,40},{71,47},{63,49},{58,54},{48,51},{43,56},{34,52},{28,55},{21,49},{16,45}}}
   poly(im,clusters[1],P.leafD);poly(im,clusters[2],P.leaf)
   for _,v in ipairs({{{15,37},{21,31},{27,33},{29,37},{22,40}},{{32,29},{38,26},{44,29},{45,33},{37,35}},{{52,29},{58,27},{64,31},{66,35},{59,37}},{{66,39},{71,37},{76,41},{74,45},{68,45}},{{27,43},{33,39},{39,41},{41,45},{35,48}},{{47,42},{53,38},{59,40},{60,44},{54,47}},{{42,51},{48,47},{54,49},{53,53},{47,55}}})do poly(im,v,P.leafM)end
   for _,p in ipairs({{19,33},{36,29},{56,31},{70,40},{31,42},{50,42},{46,50}})do im:drawPixel(p[1],p[2],P.leafHi);im:drawPixel(p[1]+1,p[2]+1,P.leafL)end
  elseif kind==3 then
   poly(im,{{15,41},{18,32},{26,28},{32,23},{40,26},{46,22},{54,25},{61,27},{69,29},{77,36},{80,43},{75,49},{68,48},{62,54},{54,51},{48,57},{40,52},{34,55},{27,51},{21,49}},P.leafD)
   poly(im,{{19,40},{23,33},{30,30},{36,28},{42,30},{48,27},{55,29},{63,31},{70,34},{75,40},{71,45},{65,44},{59,48},{52,45},{46,50},{40,46},{34,49},{27,46},{22,47}},P.willow)
   for i=1,8 do local x=15+i*8+shift*(i%2);local top=37+(i%3)*3;local bottom=68+(i%3)*7;local width=i%2==0 and 5 or 4;poly(im,{{x-width,top+4},{x-width+1,top},{x+1,top+2},{x+width,top+7},{x+width-1,top+15},{x+2,bottom-4},{x,bottom},{x-2,bottom-7},{x-4,top+17}},P.leafD);poly(im,{{x-2,top+8},{x+1,top+5},{x+3,top+12},{x+1,bottom-9},{x-1,bottom-3}},i%3==0 and P.leafL or P.willow);line(im,x-1,top+13,x,bottom-8,P.leafM)end
   for _,p in ipairs({{24,33},{34,29},{48,27},{61,32},{70,37},{42,38},{55,40}})do im:drawPixel(p[1]+shift,p[2],P.leafHi)end
  else
   poly(im,{{7,47},{10,37},{18,33},{21,25},{30,20},{37,23},{44,15},{54,18},{61,15},{70,22},{78,27},{85,35},{88,44},{83,53},{76,56},{72,65},{62,67},{55,75},{44,70},{35,76},{27,68},{17,66},{12,58}},P.leafD)
   for _,v in ipairs({{{13,43},{16,36},{23,34},{28,37},{26,43},{19,47}},{{27,33},{31,25},{38,24},{44,28},{43,35},{36,39}},{{44,29},{48,21},{56,21},{61,25},{61,32},{54,35},{48,33}},{{62,34},{66,27},{73,29},{79,34},{81,40},{75,44},{68,42}},{{22,52},{28,45},{36,44},{41,49},{39,56},{32,59},{25,57}},{{45,48},{50,40},{58,40},{64,45},{63,52},{57,57},{49,55}},{{65,52},{70,46},{77,48},{80,53},{75,59},{68,59}}})do poly(im,v,P.leaf)end
   for _,v in ipairs({{{15,40},{19,37},{22,39},{20,42}},{{31,31},{35,27},{39,28},{38,32}},{{49,27},{52,24},{56,25},{57,29}},{{66,34},{70,31},{74,34},{75,37}},{{27,50},{31,47},{34,49},{33,52}},{{50,47},{54,44},{58,46},{58,49}}})do poly(im,v,P.moss)end
   line(im,18+shift,34,33+shift,25,P.leafL);line(im,45+shift,23,57+shift,23,P.leafM);line(im,66+shift,32,75+shift,35,P.leafL)
  end
  -- ground-contact stones and grass tufts
  for _,p in ipairs({{22,97},{71,98},{14,93}})do im:drawPixel(p[1],p[2],P.moss)end
 end,function(im)
  -- Only branch tips and small leaf bunches bend; the trunk, roots, anchor and shadow stay fixed.
  if kind==1 then
   local tips={{25,39,17},{37,28,18},{57,34,19},{19,51,20},{43,49,21},{64,50,22},{31,64,23},{54,65,24}}
   for i,p in ipairs(tips)do local x,y,delay=p[1],p[2],p[3];local dx=sway(phase,delay,1.6);line(im,x,y+5,x+dx,y+1,P.pineM);line(im,x+dx,y+1,x+dx+2,y-2,P.pineL);polyShift(im,{{x-3,y+2},{x,y-2},{x+3,y+1},{x+1,y+4}},P.pineL,dx,0)end
  elseif kind==2 then
   local clusters={{13,39,1},{26,32,2},{43,27,3},{60,31,4},{76,40,5},{21,53,6},{42,55,7},{66,51,0}}
   for i,p in ipairs(clusters)do local x,y,delay=p[1],p[2],p[3];local amp=(x<20 or x>70)and 2 or 1;local dx=sway(phase,delay,amp);polyShift(im,{{x-3,y},{x,y-3},{x+4,y-1},{x+3,y+2},{x,y+4}},i%2==0 and P.leafL or P.leafM,dx,0);im:drawPixel(x+dx,y-2,P.leafHi)end
  elseif kind==3 then
   local branches={{22,37,68},{30,34,80},{38,31,72},{47,30,84},{56,34,77},{65,38,87},{74,42,73},{81,44,82}}
   for i,p in ipairs(branches)do local x,y,bottom=p[1],p[2],p[3];local delay=i*2;local mid=sway(phase,delay,1);local tip=sway(phase,delay+2,2.5);local my=y+math.floor((bottom-y)*.52);line(im,x,y,x+mid,my,P.barkL);line(im,x+mid,my,x+tip,bottom,P.willow);line(im,x+mid,my,x+tip+1,bottom-3,P.leafM);polyShift(im,{{x-2,bottom-2},{x,bottom-5},{x+2,bottom-2},{x,bottom}},P.leafL,tip,0)end
  else
   local vines={{34,58,86},{42,51,94},{52,55,89},{60,62,96},{69,70,91},{28,66,90}}
   for i,p in ipairs(vines)do local x,y,bottom=p[1],p[2],p[3];local mid=sway(phase,i*2,1);local tip=sway(phase,i*2+3,1.5);line(im,x,y,x+mid,y+12,P.moss);line(im,x+mid,y+12,x+tip,bottom,P.leafD);line(im,x+tip,bottom,x+tip+2,bottom+2,P.leafM);im:drawPixel(x+tip+2,bottom+2,P.leafL)end
  end
 end}
 return L
end
local windDurations={[1]={.16,.16,.18,.16,.16,.18,.16,.16},[2]={.17,.18,.17,.17,.18,.17,.17,.18},[3]={.20,.20,.22,.20,.20,.22,.20,.20},[4]={.22,.22,.24,.22,.22,.24,.22,.22}}
for kind,name in ipairs({'T03-mountain-pine','T04-broadleaf','T05-willow','T06-monster-ancient'})do if only=='all' or name==only then local s,l=newdoc(96,112,{'Contact shadow','Trunk roots and branches','Foliage base','Wind-bent branch tips'});local frames={};for frame=1,8 do local phase=frame;frames[frame]={duration=windDurations[kind][frame],draw=tree(kind,phase)}end;emit(s,l,frames,out..'/'..name..'.aseprite',runtime..'/'..name..'.png',96,112,'wind_light')end end

-- Four readable Chinese-period building fronts with distinct footprints/materials.
local function house(kind)
 return {duration=.2,draw={function(im) fill(im,15,127,130,10,P.shadow)end,function(im)
  local x=kind==3 and 12 or 19;local w=kind==3 and 136 or 122
  fill(im,x+8,58,w-16,64,P.plaster);fill(im,x+8,58,w-16,64,P.ink);fill(im,x+11,62,w-22,57,kind==4 and P.plaster or P.plasterL)
  fill(im,x+16,68,8,47,P.wood);fill(im,x+w-24,68,8,47,P.wood);fill(im,x+16,68,5,42,P.woodL);fill(im,x+w-21,68,5,42,P.woodL)
  fill(im,x+w/2-11,87,22,35,P.wood);fill(im,x+w/2-8,91,16,29,P.barkD);fill(im,x+w/2+5,100,2,2,P.gold)
  for _,wx in ipairs({x+26,x+w-40})do fill(im,wx,76,15,20,P.wood);fill(im,wx+2,78,11,15,P.window);line(im,wx+7,78,wx+7,92,P.wood);line(im,wx+2,84,wx+12,84,P.wood)end
  fill(im,x+5,117,w-10,5,P.stone);fill(im,x+1,122,w-2,4,P.stoneL)
 end,function(im)
  local roof=kind==3 and P.roof or kind==4 and P.bark or P.red;local rooflit=kind==3 and P.roofM or kind==4 and P.woodL or P.gold
  poly(im,{{8,61},{22,26},{42,19},{53,23},{71,13},{93,17},{111,12},{136,26},{151,61},{140,68},{125,48},{35,48},{18,68}},P.ink)
  poly(im,{{12,56},{25,30},{44,23},{53,27},{72,18},{93,22},{111,17},{132,30},{147,56},{136,61},{122,43},{37,43},{22,62}},roof)
  line(im,20,54,140,54,rooflit);line(im,28,43,132,43,rooflit);line(im,41,32,120,32,rooflit);line(im,62,23,106,23,rooflit)
  for y=32,51,5 do for x=27,134,10 do im:drawPixel(x+(y%2),y,kind==4 and P.barkD or P.ink);im:drawPixel(x+1+(y%2),y,rooflit)end end
  fill(im,5,59,142,5,rooflit);line(im,13,64,140,64,P.wood)
  if kind==2 then -- shop awning and hanging fascia
   poly(im,{{19,69},{44,69},{46,84},{18,84}},P.red);for x=20,44,7 do line(im,x,70,x,82,P.plasterL)end;fill(im,105,66,29,8,P.gold);rect(im,108,67,22,5,P.wood)
  elseif kind==3 then -- sect insignia and restrained roof ornaments
   rect(im,66,65,27,9,P.gold);fill(im,68,67,23,5,P.roof);line(im,72,69,87,69,P.gold);im:drawPixel(80,68,P.gold)
  elseif kind==4 then
   fill(im,12,112,132,5,P.barkD);line(im,20,111,137,111,P.woodL)
  else fill(im,70,67,18,5,P.gold);line(im,73,69,84,69,P.wood)end
 end}}
end
for kind,name in ipairs({'H02-city-home','H03-market-shop','H04-sect-dorm','H05-wilderness-hut'})do if only=='all' or name==only then local s,l=newdoc(160,144,{'Stone and plaster walls','Timber framing and doors','Curved roof tiles and trim'});emit(s,l,{house(kind)},out..'/'..name..'.aseprite',runtime..'/'..name..'.png',160,144)end end

-- Wall kit atlas: tile roles are deliberately separate and reusable in Tiled.
if only=='all' or only=='Qingyun-wall-gate-kit' then local s,l=newdoc(64,64,{'Masonry shadow','Cut stone courses','Crenellations and coping'});local frames={}
for k=1,8 do frames[k]={duration=.2,draw={function(im) if k~=7 then fill(im,0,52,64,12,P.shadow)end end,function(im)
 if k==7 then -- gate pier support
  fill(im,8,8,48,56,P.wallD);fill(im,12,12,40,48,P.wall);fill(im,17,15,30,6,P.stoneL);fill(im,17,28,30,5,P.wallD);fill(im,17,41,30,5,P.stoneL)
 elseif k==8 then -- watchtower module
  fill(im,5,18,54,46,P.wallD);fill(im,9,22,46,42,P.wall);fill(im,2,16,60,8,P.stoneL);fill(im,7,7,50,10,P.roof);line(im,11,10,52,10,P.roofL)
 else
  local vertical=k==2 or k==4 or k==6;local x=vertical and 22 or 0;local y=vertical and 0 or 24;local w=vertical and 30 or 64;local h=vertical and 64 or 31
  fill(im,x,y,w,h,P.wallD);fill(im,x+2,y+2,w-4,h-4,P.wall)
  for yy=y+5,y+h-6,8 do local off=((yy-y)/8)%2==0 and 0 or 8;for xx=x+3+off,x+w-7,16 do line(im,xx,yy,math.min(xx+12,x+w-5),yy,P.stoneL)end end
  if k==1 or k==2 then for xx=x+2,x+w-6,12 do fill(im,xx,y-4,8,6,P.stoneL);fill(im,xx+2,y-6,5,3,P.wall)end end
  if k==3 or k==4 then fill(im,x,y,w,h,P.wallD);fill(im,x+3,y+3,w-6,h-6,P.wall);line(im,x+4,y+4,x+w-5,y+4,P.stoneL)end
  if k==5 or k==6 then line(im,x,y+h-4,x+w,y+h-4,P.wallD);line(im,x,y+h-2,x+w,y+h-2,P.stoneL)end
 end
 end,function(im)
 if k<=6 then local vertical=k==2 or k==4 or k==6;if k==1 or k==2 then if vertical then fill(im,22,0,30,6,P.stoneL)else fill(im,0,20,64,7,P.stoneL)end end
 elseif k==7 then fill(im,4,4,56,5,P.gold);fill(im,20,17,24,3,P.red)
 else fill(im,4,12,56,5,P.gold);fill(im,11,13,4,4,P.red);fill(im,49,13,4,4,P.red)end end}}
end
emit(s,l,frames,out..'/Qingyun-wall-gate-kit.aseprite',runtime..'/Qingyun-wall-gate-kit.png',64,64)
end
app.exit()

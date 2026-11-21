-- T02: individually placed bamboo stems, joints and leaves, rendered by Aseprite.
local s=Sprite(96,96,ColorMode.RGB)
local names={'ground_shadow','rear_stems','front_stems','rear_leaves','front_leaves'}
local layers={};for i,n in ipairs(names) do local l=i==1 and s.layers[1] or s:newLayer();l.name=n;layers[i]=l end
local function C(r,g,b,a)return app.pixelColor.rgba(r,g,b,a or 255) end
local col={shadow=C(23,44,33,70),edge=C(34,59,38),shade=C(46,83,49),stem=C(73,117,61),light=C(120,151,76),joint=C(146,166,88),dark=C(37,74,47),leaf=C(58,111,65),young=C(106,151,80),tip=C(157,181,104)}
local function drawline(im,x0,y0,x1,y1,c)
 local dx,dy=math.abs(x1-x0),math.abs(y1-y0);local sx=x0<x1 and 1 or -1;local sy=y0<y1 and 1 or -1;local e=dx-dy
 while true do if x0>=0 and x0<96 and y0>=0 and y0<96 then im:drawPixel(x0,y0,c) end;if x0==x1 and y0==y1 then break end;local q=2*e;if q>-dy then e=e-dy;x0=x0+sx end;if q<dx then e=e+dx;y0=y0+sy end end
end
local function poly(im,p,c)
 local y0,y1=96,0;for _,v in ipairs(p) do y0=math.min(y0,v[2]);y1=math.max(y1,v[2]) end
 for y=y0,y1 do local xs={};for i,v in ipairs(p) do local n=p[i%#p+1];if (v[2]<=y and n[2]>y) or (n[2]<=y and v[2]>y) then xs[#xs+1]=v[1]+(y-v[2])*(n[1]-v[1])/(n[2]-v[2]) end end;table.sort(xs);for i=1,#xs-1,2 do for x=math.ceil(xs[i]),math.floor(xs[i+1]) do if x>=0 and x<96 and y>=0 and y<96 then im:drawPixel(x,y,c) end end end end
end
local stems={{29,83,23,23,3,2},{34,86,36,12,4,2},{42,86,40,7,5,3},{49,87,53,16,4,3},{56,86,62,24,3,2},{63,84,68,34,3,2},{39,84,31,36,3,2}}
local leafs={
 {24,28,-1,13,-6,4},{25,35,1,15,-8,4},{26,48,-1,15,-8,4},{29,55,1,15,-7,4},{33,20,-1,13,-8,4},{34,29,1,17,-10,5},{35,43,-1,16,-10,4},{35,58,1,14,-9,4},
 {40,14,-1,16,-9,5},{41,23,1,19,-10,5},{41,35,-1,18,-9,4},{42,49,1,18,-9,5},{42,64,-1,14,-7,4},
 {53,23,1,17,-10,5},{52,32,-1,17,-9,5},{51,45,1,19,-10,4},{51,58,-1,16,-9,4},{61,30,1,15,-7,4},{60,39,-1,14,-7,4},{59,52,1,16,-8,4},{66,40,1,12,-6,4},{65,51,-1,13,-7,4}
}
local wind={0,.35,.75,1,.70,.25,-.25,-.15}
local lag={-.15,0,.35,.75,1,.70,.25,-.25}
local function center(b,y,strength)
 local x,ground,topx,topy=table.unpack(b);local t=math.max(0,math.min(1,(ground-y)/(ground-topy)))
 return math.floor(x+(topx-x)*t+strength*3*t*t+.5)
end
for frame=1,#wind do
 local f=frame==1 and s.frames[1] or s:newEmptyFrame();f.duration=.22
 local images={};for i=1,#names do images[i]=Image(96,96,ColorMode.RGB) end
 poly(images[1],{{23,86},{30,84},{52,84},{67,86},{76,90},{66,91},{48,89},{30,90}},col.shadow)
 for idx,b in ipairs(stems) do
  local x,y,topx,topy,w,li=table.unpack(b);local im=images[li]
  -- Draw adjoining cross-sections; base stays fixed while upper joints bend.
  for yy=topy,y do local cx=center(b,yy,wind[frame]);local width=math.max(1,w-math.floor((y-yy)/(y-topy)*1.4));drawline(im,cx-width,yy,cx+width-1,yy,col.edge);drawline(im,cx-width+1,yy,cx+width-2,yy,li==2 and col.shade or col.stem);if width>2 then im:drawPixel(cx-width+1,yy,col.light) end end
  for j=1,4 do local t=j/5;local cy=math.floor(topy+(y-topy)*t+.5);local cx=center(b,cy,wind[frame]);drawline(im,cx-w+1,cy,cx+w-1,cy,col.shade);drawline(im,cx-w+2,cy-1,cx+w-2,cy-1,col.joint);drawline(im,cx-w+1,cy+1,cx+w-2,cy+1,col.edge) end
 end
 for i,v in ipairs(leafs) do
  local x,y,side,len,dy,th=table.unpack(v);local nearest,best=nil,999
  for _,stem in ipairs(stems) do if y>=stem[4] and y<=stem[2] then local distance=math.abs(x-center(stem,y,0));if distance<best then best=distance;nearest=stem end end end
  local ax=nearest and center(nearest,y,wind[frame]) or x;local anchorOffset=ax-(nearest and center(nearest,y,0) or x);x=x+anchorOffset
  local im=images[i%3==0 and 4 or 5];local inertia=math.floor((lag[frame]-wind[frame])*2+(i%3==0 and -.3 or .3)+.5);local endx=x+side*len+inertia;local endy=y+dy
  drawline(im,ax,y,x+side*5,y-3,col.dark)
  poly(im,{{x,y},{x+side*math.floor(len*.34),y+dy-1},{endx,endy},{x+side*math.floor(len*.58)+inertia,y+dy+th-1},{x+side*3,y+2}},i%4==0 and col.young or col.leaf)
  drawline(im,x+side*3,y,x+side*math.floor(len*.7)+inertia,y+math.floor(dy*.75),i%4==0 and col.tip or col.young)
 end
 -- Stable bamboo shoots and dry leaves at the fixed contact area.
 poly(images[3],{{28,85},{30,78},{32,85},{31,88}},col.shade);drawline(images[3],30,80,30,86,col.joint)
 poly(images[3],{{57,87},{60,80},{62,87},{61,89}},col.stem);drawline(images[3],59,83,61,84,col.joint)
 drawline(images[5],25,89,32,87,col.light);drawline(images[5],62,89,69,87,col.shade)
 for i,l in ipairs(layers) do s:newCel(l,f,images[i],Point(0,0)) end
end
assert(app.params.output);s:saveAs(app.params.output);print('Saved T02 bamboo '..app.params.output)

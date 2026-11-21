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
local wind={0,1,2,1,0,-1,-2,-1}
for frame=1,#wind do
 local f=frame==1 and s.frames[1] or s:newEmptyFrame();f.duration=.18
 local images={};for i=1,#names do images[i]=Image(96,96,ColorMode.RGB) end
 poly(images[1],{{23,86},{30,84},{52,84},{67,86},{76,90},{66,91},{48,89},{30,90}},col.shadow)
 for idx,b in ipairs(stems) do
  local x,y,topx,topy,w,li=table.unpack(b);local drift=math.floor(wind[frame]*(1-topy/120));local tx=topx+drift;local im=images[li]
  poly(im,{{x-w,y},{x+w,y},{tx+w-1,topy},{tx-w+1,topy}},col.edge)
  poly(im,{{x-w+1,y-1},{x+w-1,y-1},{tx+w-2,topy+1},{tx-w+2,topy+1}},col.stem)
  drawline(im,tx-1,topy+2,x-2,y-2,col.light)
  for j=1,4 do local t=j/5;local cx=math.floor(tx+(x-tx)*t+.5);local cy=math.floor(topy+(y-topy)*t+.5);drawline(im,cx-w+1,cy,cx+w-1,cy,col.shade);drawline(im,cx-w+2,cy-1,cx+w-2,cy-1,col.joint);drawline(im,cx-w+1,cy+1,cx+w-2,cy+1,col.edge) end
 end
 for i,v in ipairs(leafs) do
  local x,y,side,len,dy,th=table.unpack(v);local d=math.floor(wind[frame]*(1-y/110));x=x+d
  local im=images[i%3==0 and 4 or 5];local endx=x+side*len;local endy=y+dy
  drawline(im,x,y,x+side*5,y-3,col.dark)
  poly(im,{{x,y},{x+side*math.floor(len*.34),y+dy-1},{endx,endy},{x+side*math.floor(len*.58),y+dy+th-1},{x+side*3,y+2}},i%4==0 and col.young or col.leaf)
  drawline(im,x+side*3,y,x+side*math.floor(len*.7),y+math.floor(dy*.75),i%4==0 and col.tip or col.young)
 end
 for i,l in ipairs(layers) do s:newCel(l,f,images[i],Point(0,0)) end
end
assert(app.params.output);s:saveAs(app.params.output);print('Saved T02 bamboo '..app.params.output)

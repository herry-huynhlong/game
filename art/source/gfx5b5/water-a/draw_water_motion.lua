local output=assert(app.params.output,'missing output')
local W,H=64,64
local sprite=Sprite(W,H,ColorMode.RGB)
local flowLayer=sprite.layers[1];flowLayer.name='01 Current strokes and reflection ribbons'
local foamLayer=sprite:newLayer();foamLayer.name='02 Foam bubbles and ripple rings'
local function col(hex,alpha)return app.pixelColor.rgba(tonumber(hex:sub(2,3),16),tonumber(hex:sub(4,5),16),tonumber(hex:sub(6,7),16),alpha or 255)end
local p={deep='#1B5063',shadow='#246779',current='#398D98',light='#68B5B0',glint='#B7E2CF',foam='#D6EEE0',foamShade='#75C5C0'}
local function px(im,x,y,c,a)if x>=0 and x<W and y>=0 and y<H then im:drawPixel(x,y,col(c,a))end end
local function line(im,x0,y0,x1,y1,c,a)
 local dx=math.abs(x1-x0);local sx=x0<x1 and 1 or -1;local dy=-math.abs(y1-y0);local sy=y0<y1 and 1 or -1;local err=dx+dy
 while true do px(im,x0,y0,c,a);if x0==x1 and y0==y1 then break end;local e=2*err;if e>=dy then err=err+dy;x0=x0+sx end;if e<=dx then err=err+dx;y0=y0+sy end end
end
local function wrapLineY(im,x,y,len,c,a,thickness)
 local left=len;while left>0 do local part=math.min(left,H-y);line(im,x,y,x,y+part-1,c,a);left=left-part;y=0 end
 if thickness then wrapLineY(im,x+1,(y-len)%H,len-2,c,a,nil)end
end
local function wrapLineX(im,x,y,len,c,a)
 local left=len;while left>0 do local part=math.min(left,W-x);line(im,x,y,x+part-1,y,c,a);left=left-part;x=0 end
end
local function streakSouth(im,frame)
 local offset=(frame-1)*8
 local patterns={{4,3,17},{12,20,11},{22,5,14},{31,35,18},{42,12,12},{52,26,17},{59,48,10},{27,54,8}}
 for i,v in ipairs(patterns)do local x,base,len=v[1],v[2],v[3];local y=(base+offset)%64
  wrapLineY(im,x,y,len,p.shadow,220);wrapLineY(im,x-1,(y+2)%64,math.max(4,len-5),p.current,245)
  if i%2==0 then wrapLineY(im,x-2,(y+3)%64,math.max(2,math.floor(len*.45)),p.light,255)end
  px(im,(x-2+(frame%3)),(y+1)%64,p.glint,255)
 end
end
local function streakEast(im,frame)
 local offset=(frame-1)*8
 local patterns={{3,5,18},{12,17,13},{25,8,16},{36,29,20},{49,13,14},{58,42,17},{19,51,10},{42,56,8}}
 for i,v in ipairs(patterns)do local base,y,len=v[1],v[2],v[3];local x=(base+offset)%64
  wrapLineX(im,x,y,len,p.shadow,220);wrapLineX(im,(x+2)%64,y-1,math.max(4,len-5),p.current,245)
  if i%2==0 then wrapLineX(im,(x+4)%64,y-2,math.max(2,math.floor(len*.45)),p.light,255)end
  px(im,(x+1)%64,y-3+(frame%3),p.glint,255)
 end
end
local function streamSouth(im,frame)
 local offset=(frame-1)*8
 local patterns={{10,0,7},{22,15,6},{40,7,9},{52,37,6},{30,47,8},{5,32,6},{59,21,4},{18,55,5}}
 for i,v in ipairs(patterns)do local x,base,len=v[1],v[2],v[3];local y=(base+offset)%64
  wrapLineY(im,x,y,len,p.shadow,190);wrapLineY(im,x-1,(y+1)%64,math.max(2,len-3),p.light,250)
  if i%3~=0 then px(im,x-2,(y+2)%64,p.glint,245)end
 end
end
local function foamRing(im,cx,cy,r,frame,phase,scale)
 local pieces=7+(frame%3);local start=phase+frame*0.23
 for n=0,pieces do local a=start+n*(6.28318/pieces);local x=math.floor(cx+math.cos(a)*r*scale+.5);local y=math.floor(cy+math.sin(a)*r*.68*scale+.5)
  if (n+frame+phase*3)%4~=0 then px(im,x,y,p.foam,255);if n%2==0 then px(im,x+1,y,p.foamShade,255)end end
 end
end
local function rockFoam(im,frame)
 local t=frame-1
 -- Broken upstream horseshoes split at the rock; the loose tails drift down current.
 for arm=0,1 do
  local cx=32+(arm==0 and -1 or 2);local cy=32+(arm==0 and -2 or 1);local start=arm==0 and 3.35 or 5.15
  for n=0,7 do local a=start+n*.27;local x=math.floor(cx+math.cos(a)*13+.5);local y=math.floor(cy+math.sin(a)*9+.5)
   if (n+t+arm)%3~=0 then px(im,x,y,p.foam,255);if n%2==0 then px(im,x-1,y,p.foamShade,255)end end
  end
 end
 for n=0,3 do local y=(42+n*5+t*2)%64;local x=37+(n%2)*4;px(im,x,y,p.foamShade,255);px(im,x+1,y,p.foam,255);if n%2==0 then px(im,x+2,y-1,p.glint,255)end end
 for n=0,2 do local y=(18+n*9-t*2)%64;local x=14-(n%2)*3;px(im,x,y,p.foam,255);px(im,x+1,y,p.foamShade,255)end
end
local function lakeRipple(im,frame)
 local t=frame-1
 local r1=4+t;local r2=12-t
 foamRing(im,20,29,r1,frame,1.15,.72)
 foamRing(im,46,37,r2,frame,3.7,.62)
 -- Broken reflected glints stay on the upper-left arcs and never form a perfect ring.
 if frame%2==0 then for n=0,3 do px(im,12+n*3,20+(n%2),p.glint,220)end end
end
local draw={}
for f=1,8 do local ix=f;draw[#draw+1]=function(flow,foam)streakSouth(flow,ix)end end
for f=1,8 do local ix=f;draw[#draw+1]=function(flow,foam)streakEast(flow,ix)end end
for f=1,8 do local ix=f;draw[#draw+1]=function(flow,foam)streamSouth(flow,ix)end end
for f=1,8 do local ix=f;draw[#draw+1]=function(flow,foam)rockFoam(foam,ix)end end
for f=1,8 do local ix=f;draw[#draw+1]=function(flow,foam)lakeRipple(foam,ix)end end
for fi,fn in ipairs(draw)do
 local frame=fi==1 and sprite.frames[1]or sprite:newEmptyFrame();frame.duration=.12
 local flow=Image(W,H,ColorMode.RGB);flow:clear(Color(0,0,0,0));local foam=Image(W,H,ColorMode.RGB);foam:clear(Color(0,0,0,0))
 fn(flow,foam);sprite:newCel(flowLayer,frame,flow,Point(0,0));sprite:newCel(foamLayer,frame,foam,Point(0,0))
end
for _,tag in ipairs({{'river_south',1,8},{'river_east',9,16},{'stream_south',17,24},{'rock_foam',25,32},{'lake_ripple',33,40}})do local t=sprite:newTag(sprite.frames[tag[2]],sprite.frames[tag[3]]);t.name=tag[1];t.aniDir=AniDir.FORWARD end
app.activeSprite=sprite;sprite:saveAs(output)
print('Water A motion: 40 edited pixel frames, 5 tagged loops, 64x64 transparent overlays')

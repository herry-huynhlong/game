-- GFX.5B.4C-A3: edit the layered C03 32x40 file in place and save separately.
-- Existing special-action frames 80-97 are not changed.
local s=assert(app.open(assert(app.params.input)));assert(s.width==32 and s.height==40 and #s.frames==98)
local ref=assert(app.open(assert(app.params.reference)));assert(ref.width==32 and #ref.frames==98)
local layer,refLayer={},{};for _,l in ipairs(s.layers)do layer[l.name]=l end;for _,l in ipairs(ref.layers)do refLayer[l.name]=l end
local function col(r,g,b)return app.pixelColor.rgba(r,g,b,255)end
local c={ink=col(35,39,35),hair=col(28,32,37),hairlit=col(57,67,67),skin=col(219,174,137),skins=col(164,117,90),light=col(239,231,203),robe=col(141,185,175),shade=col(75,124,126),white=col(218,232,209),belt=col(59,118,119),gold=col(200,171,102),shoe=col(62,65,60)}
local function line(a,x,y,X,Y,k)local dx,dy=math.abs(X-x),math.abs(Y-y);local sx=x<X and 1 or -1;local sy=y<Y and 1 or -1;local err=dx-dy;while true do if x>=0 and x<32 and y>=0 and y<40 then a:drawPixel(x,y,k)end;if x==X and y==Y then break end;local e=2*err;if e>-dy then err=err-dy;x=x+sx end;if e<dx then err=err+dx;y=y+sy end end end
local function poly(a,p,k)local lo,hi=40,0;for _,v in ipairs(p)do lo=math.min(lo,v[2]);hi=math.max(hi,v[2])end;for y=lo,hi do local xs={};for i,v in ipairs(p)do local n=p[i%#p+1];if(v[2]<=y and n[2]>y)or(n[2]<=y and v[2]>y)then xs[#xs+1]=v[1]+(y-v[2])*(n[1]-v[1])/(n[2]-v[2])end end;table.sort(xs);for i=1,#xs-1,2 do for x=math.ceil(xs[i]),math.floor(xs[i+1])do if x>=0 and x<32 and y>=0 and y<40 then a:drawPixel(x,y,k)end end end end end
local function image(name,frame) local cel=assert(layer[name]:cel(s.frames[frame]));local im=Image(32,40,ColorMode.RGB);im:drawImage(cel.image,cel.position);return im end
local function write(name,frame,im)local cel=assert(layer[name]:cel(s.frames[frame]));cel.image=im;cel.position=Point(0,0)end
local function refImage(name)local cel=assert(refLayer[name]:cel(ref.frames[5]));local im=Image(32,40,ColorMode.RGB);im:drawImage(cel.image,cel.position);return im end
-- Each view has dedicated head pixels; the two forward diagonals use the
-- hand-redrawn A2 head as a base and asymmetric side locks are corrected.
local function head(dir,frame)
 if dir==2 or dir==8 then
  for _,name in ipairs({'face','hair_front'})do
   local src=refImage(name);local dst=Image(32,40,ColorMode.RGB)
   if dir==2 then dst:drawImage(src,Point(0,0)) else
    for y=0,39 do for x=0,31 do dst:drawPixel(31-x,y,src:getPixel(x,y)) end end
    if name=='hair_front' then
     line(dst,11,6,13,5,c.hairlit);dst:drawPixel(20,9,c.hair)
    else dst:drawPixel(9,13,c.skins) end
   end
   write(name,frame,dst)
  end
 else
  local h=image('hair_front',frame);local f=image('face',frame)
  if dir==1 then line(h,12,7,14,6,c.hairlit);line(f,13,11,14,11,c.ink);line(f,19,11,20,11,c.ink);f:drawPixel(16,14,c.skins)
  elseif dir==3 then line(h,12,6,14,5,c.hairlit);f:drawPixel(20,10,c.ink);f:drawPixel(22,13,c.skins)
  elseif dir==4 then line(h,13,7,16,6,c.hairlit);f:drawPixel(22,12,c.skins)
  elseif dir==5 then line(h,12,8,15,6,c.hairlit);line(h,17,7,20,8,c.hairlit)
  elseif dir==6 then line(h,13,6,15,6,c.hairlit);f:drawPixel(9,12,c.skins)
  elseif dir==7 then line(h,15,5,18,5,c.hairlit);f:drawPixel(11,10,c.ink);f:drawPixel(10,13,c.skins) end
  write('hair_front',frame,h);write('face',frame,f)
 end
end
local function rebuildArms(dir,phase,frame,walking)
 local sway=walking and ({-1,-1,0,1,1,0})[phase] or 0
 local im=Image(32,40,ColorMode.RGB);local facingBack=dir>=4 and dir<=6
 -- Near/far sleeves change area with side and 3/4 views. Hands follow sleeves.
 local leftNear=dir==6 or dir==7 or dir==8
 local rightNear=dir==2 or dir==3 or dir==4
 local lx=leftNear and 6 or 7;local rx=rightNear and 26 or 25
 local lcol=leftNear and c.white or c.shade;local rcol=rightNear and c.white or c.shade
 if dir==1 or dir==5 then lcol=c.shade;rcol=c.white end
 poly(im,{{9,17},{12,17},{13,21},{11,25+sway},{lx+1,25+sway},{lx,22+sway},{7,19}},c.ink)
 poly(im,{{9,18},{11,18},{12,21},{10,24+sway},{lx+1,24+sway},{lx+1,22+sway},{8,20}},lcol)
 poly(im,{{21,17},{23,17},{25,19},{rx,22-sway},{rx-1,25-sway},{22,25-sway},{20,22}},c.ink)
 poly(im,{{21,18},{23,18},{24,20},{rx-1,22-sway},{rx-2,24-sway},{22,24-sway},{21,22}},rcol)
 if not facingBack then poly(im,{{lx+1,24+sway},{lx+3,24+sway},{lx+3,26+sway},{lx+1,26+sway}},c.skin);poly(im,{{rx-3,24-sway},{rx-1,24-sway},{rx-1,26-sway},{rx-3,26-sway}},c.skin)end
 if leftNear then line(im,lx+2,20,lx+3,23+sway,c.robe)end
 if rightNear then line(im,rx-3,20,rx-2,23-sway,c.robe)end
 write('arms',frame,im)
end
local function rebuildLegs(dir,phase,frame,walking)
 local shift=walking and ({-2,-1,0,2,1,0})[phase] or 0
 local leftLift=walking and (phase==2 or phase==3) and -1 or 0
 local rightLift=walking and (phase==5 or phase==6) and -1 or 0
 local im=Image(32,40,ColorMode.RGB)
 -- Two separate boots, with a planted foot and lifted trailing foot.
 if dir==3 or dir==7 then
  poly(im,{{12,28},{16,28},{17-shift,34+leftLift},{19-shift,36+leftLift},{18-shift,38+leftLift},{13-shift,38+leftLift},{11-shift,36+leftLift}},c.ink)
  poly(im,{{13,29},{15,29},{16-shift,35+leftLift},{18-shift,36+leftLift},{17-shift,37+leftLift},{12-shift,37+leftLift}},c.shoe)
  poly(im,{{17,28},{21,28},{22+shift,34+rightLift},{24+shift,36+rightLift},{22+shift,38+rightLift},{18+shift,37+rightLift}},c.ink)
  poly(im,{{18,29},{20,29},{21+shift,35+rightLift},{23+shift,36+rightLift},{22+shift,37+rightLift},{19+shift,36+rightLift}},c.shoe)
 else
  poly(im,{{11,28},{15,28},{15+shift,35+leftLift},{14+shift,38+leftLift},{9+shift,38+leftLift},{9+shift,35+leftLift}},c.ink)
  poly(im,{{12,29},{14,29},{14+shift,35+leftLift},{13+shift,37+leftLift},{10+shift,37+leftLift}},c.shoe)
  poly(im,{{17,28},{21,28},{23-shift,35+rightLift},{22-shift,38+rightLift},{17-shift,38+rightLift},{17-shift,35+rightLift}},c.ink)
  poly(im,{{18,29},{20,29},{22-shift,35+rightLift},{21-shift,37+rightLift},{18-shift,37+rightLift}},c.shoe)
 end
 write('legs',frame,im)
end
local function reviseDetails(dir,phase,frame,walking)
 local im=Image(32,40,ColorMode.RGB);local sway=walking and ({-1,-1,0,1,1,0})[phase] or 0
 if dir==3 then im:drawPixel(20,11,c.ink) elseif dir==7 then im:drawPixel(11,11,c.ink) end
 if dir==4 or dir==5 or dir==6 then
  -- Back collar is a shallow seam, not a front crossed lapel.
  line(im,10,17,16,20,c.white);line(im,16,20,22,17,c.white)
  line(im,12,19,16,21,c.shade);line(im,10,25,22,25,c.belt)
  line(im,17,27,18+sway,32,c.shade);line(im,13,27,12+sway,31,c.white)
 else
  local dx=(dir==2 or dir==3) and 1 or (dir==7 or dir==8) and -1 or 0
  line(im,11,16,16+dx,21,c.light);line(im,16+dx,21,21,16,c.light)
  line(im,13+dx,17,18+dx,22,c.white);line(im,18+dx,22,20+dx,20,c.white)
  line(im,10,25,22,25,c.belt);line(im,15,24,18,24,c.gold);line(im,15,25,18,25,c.gold)
  line(im,17,27,19+sway,32,c.belt);line(im,19+sway,32,18+sway,34,c.belt)
  line(im,11,29,10,32,c.shade);line(im,21,28,22,31,c.white)
 end
 write('details',frame,im)
end
for dir=1,8 do
 for phase=1,4 do local f=(dir-1)*4+phase;head(dir,f);rebuildArms(dir,phase,f,false);rebuildLegs(dir,phase,f,false);reviseDetails(dir,phase,f,false) end
 for phase=1,6 do local f=33+(dir-1)*6+phase-1;head(dir,f);rebuildArms(dir,phase,f,true);rebuildLegs(dir,phase,f,true);reviseDetails(dir,phase,f,true) end
end
-- Add tags that describe existing frame ranges. The underlying document may
-- already contain tags if a different input was selected.
if #s.tags==0 then
 local dirs={'down','down_right','right','up_right','up','up_left','left','down_left'}
 for j,dir in ipairs(dirs)do local t=s:newTag(s.frames[(j-1)*4+1],s.frames[j*4]);t.name='idle_'..dir;local first=33+(j-1)*6;t=s:newTag(s.frames[first],s.frames[first+5]);t.name='walk_'..dir end
 for _,a in ipairs({{'sit_enter',81,84},{'cultivate',85,88},{'sit_exit',89,91},{'hit',92,94},{'death',95,98}})do local t=s:newTag(s.frames[a[2]],s.frames[a[3]]);t.name=a[1] end
end
s:saveAs(assert(app.params.output))

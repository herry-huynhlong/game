-- C03 A4: edits the existing layered A3 document; no changes to frames 80-97.
local s=assert(app.open(assert(app.params.input)));assert(s.width==32 and s.height==40 and #s.frames==98)
local layers={};for _,l in ipairs(s.layers)do layers[l.name]=l end
local function color(r,g,b)return app.pixelColor.rgba(r,g,b,255)end
local c={ink=color(35,39,35),hair=color(28,32,37),hairlit=color(57,67,67),skin=color(219,174,137),skins=color(164,117,90),light=color(239,231,203),robe=color(141,185,175),shade=color(75,124,126),white=color(218,232,209),belt=color(59,118,119),gold=color(200,171,102),shoe=color(62,65,60)}
local function line(a,x,y,X,Y,k)local dx,dy=math.abs(X-x),math.abs(Y-y);local sx=x<X and 1 or -1;local sy=y<Y and 1 or -1;local err=dx-dy;while true do if x>=0 and x<32 and y>=0 and y<40 then a:drawPixel(x,y,k)end;if x==X and y==Y then break end;local e=2*err;if e>-dy then err=err-dy;x=x+sx end;if e<dx then err=err+dx;y=y+sy end end end
local function path(a,p,k)for i=1,#p-1 do line(a,p[i][1],p[i][2],p[i+1][1],p[i+1][2],k)end end
local function poly(a,p,k)local lo,hi=40,0;for _,v in ipairs(p)do lo=math.min(lo,v[2]);hi=math.max(hi,v[2])end;for y=lo,hi do local xs={};for i,v in ipairs(p)do local n=p[i%#p+1];if(v[2]<=y and n[2]>y)or(n[2]<=y and v[2]>y)then xs[#xs+1]=v[1]+(y-v[2])*(n[1]-v[1])/(n[2]-v[2])end end;table.sort(xs);for i=1,#xs-1,2 do for x=math.ceil(xs[i]),math.floor(xs[i+1])do if x>=0 and x<32 and y>=0 and y<40 then a:drawPixel(x,y,k)end end end end end
local function blank()return Image(32,40,ColorMode.RGB)end
local function get(name,n)local cel=assert(layers[name]:cel(s.frames[n]));local im=blank();im:drawImage(cel.image,cel.position);return im end
local function put(name,n,im)local cel=assert(layers[name]:cel(s.frames[n]));cel.image=im;cel.position=Point(0,0)end
local function backView(ne,n,phase,walking)
 local lag=walking and ({-1,-1,0,1,1,0})[phase] or 0
 local stride=walking and ({-2,-1,0,2,1,0})[phase] or 0
 local liftL=walking and (phase==2 or phase==3) and -1 or 0
 local liftR=walking and (phase==5 or phase==6) and -1 or 0
 -- Two separately drawn three-quarter silhouettes, with a narrow visible ear.
 local hair,face,back,robe,arms,legs,details=blank(),blank(),blank(),blank(),blank(),blank(),blank()
 if ne then
  poly(back,{{10,10},{20,9},{23,13},{22,21},{24+lag,25},{22+lag,28},{19+lag,25},{17,24},{13,26},{10,23},{11,17}},c.ink)
  poly(back,{{11,11},{19,10},{22,13},{21,21},{23+lag,25},{21+lag,26},{19+lag,23},{16,22},{13,24},{11,22}},c.hair)
  path(back,{{12,15},{13,20},{12,22}},c.hairlit);path(back,{{19,16},{20,21},{21+lag,24}},c.hairlit)
  poly(hair,{{10,8},{11,5},{14,3},{20,3},{23,6},{24,10},{23,13},{21,15},{18,16},{12,15},{10,13}},c.ink)
  poly(hair,{{11,8},{12,6},{15,4},{20,4},{22,6},{23,9},{22,12},{20,14},{18,15},{13,14},{11,12}},c.hair)
  poly(hair,{{13,4},{13,1},{18,1},{20,3},{19,5}},c.hair);line(hair,13,4,19,4,c.gold);path(hair,{{13,7},{16,5},{20,6}},c.hairlit)
  poly(face,{{21,10},{23,10},{24,12},{23,15},{21,15}},c.skin);line(face,22,12,23,13,c.skins)
  poly(robe,{{11,16},{18,15},{22,17},{25,20},{23,26},{24,32},{22,34},{18,33},{15,35},{10,34},{8,32},{10,25},{8,20}},c.ink)
  poly(robe,{{11,17},{18,16},{21,18},{24,20},{22,25},{23,31},{21,33},{18,32},{15,34},{11,33},{9,31},{11,25},{9,20}},c.robe)
  poly(robe,{{9,20},{12,18},{14,20},{14,26},{12,32},{9,31},{11,25}},c.shade)
  poly(robe,{{17,26},{21,25},{23,31},{21,33},{18+lag,31},{15,34},{14,32}},c.white)
  -- Near right sleeve projects in front; left far sleeve is narrower.
  poly(arms,{{8,18},{11,17},{12,21},{11,24+lag},{8,25+lag},{6,22+lag},{7,20}},c.ink)
  poly(arms,{{8,19},{10,18},{11,21},{10,23+lag},{8,24+lag},{7,22+lag}},c.shade)
  poly(arms,{{20,17},{23,17},{26,20},{27,23-lag},{25,26-lag},{21,26-lag},{19,23}},c.ink)
  poly(arms,{{21,18},{23,18},{25,20},{26,23-lag},{24,25-lag},{21,25-lag},{20,23}},c.white)
  path(arms,{{22,19},{24,21},{24,23-lag}},c.robe)
  poly(legs,{{11,28},{15,28},{15+stride,35+liftL},{14+stride,38+liftL},{9+stride,38+liftL},{9+stride,35+liftL}},c.ink)
  poly(legs,{{12,29},{14,29},{14+stride,35+liftL},{13+stride,37+liftL},{10+stride,37+liftL}},c.shoe)
  poly(legs,{{17,28},{21,28},{23-stride,34+liftR},{25-stride,36+liftR},{24-stride,38+liftR},{19-stride,38+liftR},{17-stride,35+liftR}},c.ink)
  poly(legs,{{18,29},{20,29},{22-stride,35+liftR},{24-stride,36+liftR},{23-stride,37+liftR},{19-stride,37+liftR}},c.shoe)
  path(details,{{11,17},{15,20},{20,18}},c.white);path(details,{{12,19},{16,21},{20,19}},c.shade)
  path(details,{{10,25},{16,26},{22,24}},c.belt);path(details,{{13,27},{12,31},{10,32}},c.shade)
  path(details,{{18,27},{20+lag,31},{19+lag,33}},c.robe)
  poly(details,{{22,10},{24,11},{24,14},{23,15},{22,14}},c.skin);line(details,23,12,23,13,c.skins)
 else
  poly(back,{{12,9},{22,10},{22,17},{23,23},{21,26},{18,24},{15-lag,25},{12-lag,28},{10-lag,25},{11,21}},c.ink)
  poly(back,{{13,10},{21,11},{21,17},{22,22},{20,24},{18,22},{15,23},{13-lag,26},{11-lag,24},{12,20}},c.hair)
  path(back,{{20,15},{19,20},{20,22}},c.hairlit);path(back,{{13,16},{12,21},{12-lag,24}},c.hairlit)
  poly(hair,{{9,10},{10,6},{13,4},{19,3},{22,5},{23,9},{22,13},{20,15},{14,16},{11,14},{9,12}},c.ink)
  poly(hair,{{10,10},{11,7},{14,5},{19,4},{21,6},{22,9},{21,12},{19,14},{14,15},{12,13},{10,12}},c.hair)
  poly(hair,{{13,4},{14,1},{19,1},{20,3},{19,5}},c.hair);line(hair,14,4,20,4,c.gold);path(hair,{{13,7},{16,6},{20,7}},c.hairlit)
  poly(face,{{8,11},{10,10},{11,12},{11,15},{9,15},{8,14}},c.skin);line(face,9,12,9,14,c.skins)
  poly(robe,{{10,17},{14,15},{21,16},{24,19},{23,25},{25,32},{23,34},{18,35},{15,33},{12,34},{8,32},{9,26},{7,20}},c.ink)
  poly(robe,{{11,18},{14,16},{20,17},{23,19},{22,25},{24,31},{22,33},{18,34},{15,32},{12,33},{9,31},{10,25},{8,20}},c.robe)
  poly(robe,{{20,19},{23,20},{22,25},{24,31},{22,32},{19,27}},c.shade)
  poly(robe,{{11,25},{15,26},{18,32},{15,34},{12-lag,32},{10,32}},c.white)
  poly(arms,{{9,17},{12,17},{13,22},{11,26-lag},{7,26-lag},{5,23-lag},{6,20}},c.ink)
  poly(arms,{{9,18},{11,18},{12,22},{10,25-lag},{7,25-lag},{6,23-lag},{7,20}},c.white)
  path(arms,{{8,19},{7,22},{8,23-lag}},c.robe)
  poly(arms,{{20,17},{23,18},{25,20},{25,23+lag},{23,25+lag},{20,24+lag},{19,21}},c.ink)
  poly(arms,{{21,18},{23,19},{24,21},{24,23+lag},{22,24+lag},{20,23+lag}},c.shade)
  poly(legs,{{11,28},{15,28},{14+stride,34+liftL},{13+stride,38+liftL},{8+stride,38+liftL},{7+stride,36+liftL},{9+stride,34+liftL}},c.ink)
  poly(legs,{{12,29},{14,29},{13+stride,35+liftL},{12+stride,37+liftL},{8+stride,37+liftL},{9+stride,35+liftL}},c.shoe)
  poly(legs,{{17,28},{21,28},{23-stride,35+liftR},{22-stride,38+liftR},{17-stride,38+liftR},{17-stride,35+liftR}},c.ink)
  poly(legs,{{18,29},{20,29},{22-stride,35+liftR},{21-stride,37+liftR},{18-stride,37+liftR}},c.shoe)
  path(details,{{12,18},{17,20},{21,17}},c.white);path(details,{{12,20},{16,21},{20,19}},c.shade)
  path(details,{{10,24},{16,26},{23,25}},c.belt);path(details,{{20,27},{21,31},{23,32}},c.shade)
  path(details,{{14,27},{12-lag,31},{13-lag,33}},c.robe)
 end
 put('hair_back',n,back);put('hair_front',n,hair);put('face',n,face);put('robe',n,robe);put('arms',n,arms);put('legs',n,legs);put('details',n,details)
end
-- Idle and walk for NE and NW: author silhouettes independently.
for _,dir in ipairs({4,6})do
 for phase=1,4 do backView(dir==4,(dir-1)*4+phase,phase,false)end
 for phase=1,6 do backView(dir==4,33+(dir-1)*6+phase-1,phase,true)end
end
-- Other walk directions: add a restrained trailing hair lock on the existing
-- hair-back layer and an alternating robe hem. No whole-sprite transform.
for dir=1,8 do if dir~=4 and dir~=6 then for phase=1,6 do
 local n=33+(dir-1)*6+phase-1;local lag=({-1,-1,0,1,1,0})[phase]
 local hair=get('hair_back',n)
 if dir==2 or dir==3 then path(hair,{{11,15},{10,19},{10+lag,22},{11+lag,24}},c.hair)
 elseif dir==7 or dir==8 then path(hair,{{21,15},{22,19},{22-lag,22},{21-lag,24}},c.hair)
 else path(hair,{{12,17},{11,21},{11+lag,23}},c.hair);path(hair,{{20,17},{21,21},{21-lag,23}},c.hair)end
 put('hair_back',n,hair)
 local detail=get('details',n);if dir==5 then path(detail,{{14,29},{13+lag,32},{14+lag,33}},c.white)else path(detail,{{19,29},{20+lag,32},{19+lag,33}},c.light)end;put('details',n,detail)
end end end
s:saveAs(assert(app.params.output))

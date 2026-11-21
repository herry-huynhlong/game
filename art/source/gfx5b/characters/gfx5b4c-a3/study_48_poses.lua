-- Four representative 48x64 studies; the base is the editable A2 3/4 pose.
-- Each added pose edits individual layers and is not a finished animation.
local s=assert(app.open(assert(app.params.input)));assert(s.width==48 and s.height==64 and #s.frames==1)
local layers={};for _,l in ipairs(s.layers)do layers[l.name]=l end
local function col(r,g,b,a)return app.pixelColor.rgba(r,g,b,a or 255)end
local c={ink=col(32,42,40),hair=col(31,37,42),hairlit=col(59,70,73),skin=col(224,179,142),skins=col(169,121,95),light=col(240,221,188),robe=col(141,185,175),shade=col(74,124,126),dark=col(49,91,94),white=col(222,234,216),belt=col(55,105,106),gold=col(205,177,104),shoe=col(50,61,57),shadow=col(26,46,37,85)}
local function line(a,x,y,X,Y,k)
 local dx,dy=math.abs(X-x),math.abs(Y-y);local sx=x<X and 1 or -1;local sy=y<Y and 1 or -1;local err=dx-dy
 while true do if x>=0 and x<a.width and y>=0 and y<a.height then a:drawPixel(x,y,k) end;if x==X and y==Y then break end;local e=2*err;if e>-dy then err=err-dy;x=x+sx end;if e<dx then err=err+dx;y=y+sy end end
end
local function path(a,p,k)for i=1,#p-1 do line(a,p[i][1],p[i][2],p[i+1][1],p[i+1][2],k)end end
local function poly(a,p,k)
 local lo,hi=64,0;for _,v in ipairs(p)do lo=math.min(lo,v[2]);hi=math.max(hi,v[2])end
 for y=lo,hi do local xs={};for i,v in ipairs(p)do local n=p[i%#p+1];if(v[2]<=y and n[2]>y)or(n[2]<=y and v[2]>y)then xs[#xs+1]=v[1]+(y-v[2])*(n[1]-v[1])/(n[2]-v[2])end end;table.sort(xs);for i=1,#xs-1,2 do for x=math.ceil(xs[i]),math.floor(xs[i+1])do if x>=0 and x<a.width and y>=0 and y<a.height then a:drawPixel(x,y,k)end end end end
end

local function imageFor(name,fr)local cel=assert(layers[name]:cel(s.frames[fr]));local im=Image(48,64,ColorMode.RGB);im:drawImage(cel.image,cel.position);return im end
local function replace(name,fr,im)local cel=assert(layers[name]:cel(s.frames[fr]));cel.image=im;cel.position=Point(0,0)end
local function blank()return Image(48,64,ColorMode.RGB)end
for fr=2,4 do
 local f=s:newEmptyFrame();f.duration=.24
 for _,l in ipairs(s.layers)do local cel=assert(l:cel(s.frames[1]));s:newCel(l,f,cel.image:clone(),cel.position)end
end
-- Frame 2: front face and symmetrical shoulders, not a rotated 3/4 head.
do
 local f=blank();poly(f,{{16,10},{20,7},{28,7},{32,10},{33,15},{32,21},{29,25},{24,26},{19,24},{16,21},{15,15}},c.ink)
 poly(f,{{17,11},{20,9},{28,9},{31,11},{32,16},{31,21},{28,24},{24,25},{20,23},{17,20},{16,15}},c.skin)
 line(f,19,17,20,17,c.ink);line(f,28,17,29,17,c.ink);line(f,19,15,21,15,c.hair);line(f,27,15,29,15,c.hair);f:drawPixel(24,20,c.skins);line(f,23,22,25,22,c.skins);replace('face',2,f)
 local h=blank();poly(h,{{15,14},{15,10},{18,7},{21,5},{28,5},{32,8},{33,12},{32,15},{29,12},{26,11},{24,13},{21,11},{18,14},{16,18}},c.hair)
 poly(h,{{20,6},{20,3},{22,1},{27,1},{29,3},{29,7}},c.ink);line(h,21,5,28,5,c.gold);path(h,{{18,10},{21,8},{25,8}},c.hairlit);replace('hair_front',2,h)
 local arms=imageFor('arms',2);poly(arms,{{11,29},{15,28},{17,32},{16,38},{13,40},{10,38}},c.shade);poly(arms,{{11,38},{14,38},{15,41},{13,43},{10,42}},c.skin);replace('arms',2,arms)
end
-- Frame 3: side profile and shifted head/neck; retained robe is a study.
do
 local f=blank();poly(f,{{16,9},{22,7},{29,8},{32,11},{32,16},{35,18},{32,20},{31,23},{27,25},{21,25},{17,23},{15,20},{15,14}},c.ink)
 poly(f,{{17,10},{22,9},{28,9},{31,12},{31,16},{34,18},{31,19},{30,22},{27,24},{22,24},{18,22},{16,19},{16,14}},c.skin)
 line(f,29,16,31,16,c.ink);line(f,28,14,31,14,c.hair);f:drawPixel(31,20,c.skins);line(f,27,22,29,22,c.skins);replace('face',3,f)
 local h=blank();poly(h,{{15,16},{15,11},{17,8},{21,6},{27,6},{31,8},{33,12},{32,15},{29,12},{26,11},{23,12},{21,11},{19,15},{18,20},{16,21}},c.hair)
 poly(h,{{20,6},{20,3},{22,1},{27,1},{29,3},{29,7}},c.ink);line(h,21,5,28,5,c.gold);path(h,{{17,10},{20,8},{24,8}},c.hairlit);replace('hair_front',3,h)
 local arms=blank();poly(arms,{{14,26},{19,27},{20,32},{18,39},{15,42},{11,40},{11,35}},c.shade);poly(arms,{{13,39},{16,39},{17,42},{15,44},{12,43}},c.skin);poly(arms,{{29,27},{34,28},{38,33},{38,39},{35,42},{31,40},{29,35}},c.white);poly(arms,{{33,39},{36,39},{37,42},{35,44},{32,43}},c.skin);replace('arms',3,arms)
end
-- Frame 4: single diagonal stride with separate raised and planted boots.
do
 local feet=blank();poly(feet,{{15,45},{21,46},{22,53},{17,57},{11,57},{10,55},{15,52}},c.ink);poly(feet,{{15,48},{20,48},{20,53},{16,55},{11,55},{16,52}},c.shoe)
 poly(feet,{{25,44},{31,44},{35,54},{38,56},{37,59},{30,59},{26,56}},c.ink);poly(feet,{{26,47},{30,46},{34,55},{37,56},{36,57},{30,57},{27,55}},c.shoe);replace('legs',4,feet)
 local arms=blank();poly(arms,{{12,27},{17,27},{18,32},{15,37},{12,39},{9,37},{10,32}},c.shade);poly(arms,{{10,36},{13,36},{14,39},{12,41},{9,40}},c.skin)
 poly(arms,{{29,27},{34,28},{38,33},{39,40},{37,43},{33,43},{30,39},{31,33}},c.white);poly(arms,{{34,41},{37,41},{38,44},{35,45},{33,43}},c.skin);replace('arms',4,arms)
 local r=imageFor('robe',4);poly(r,{{15,47},{20,45},{23,53},{18,55},{13,54}},c.shade);path(r,{{15,50},{16,53},{19,54}},c.white);replace('robe',4,r)
end
for i,name in ipairs({'study_SE','study_S','study_E','study_SE_step'})do local t=s:newTag(s.frames[i],s.frames[i]);t.name=name end
s:saveAs(assert(app.params.output))

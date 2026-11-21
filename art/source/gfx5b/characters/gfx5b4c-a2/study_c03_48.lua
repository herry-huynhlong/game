-- C03 A2 study B: original 48x64 pixel drawing, one south-east idle key pose.
-- No upscaled or imported pixels. Layered for subsequent hand editing.
local s=Sprite(48,64,ColorMode.RGB)
local names={'shadow','legs','hair_back','robe','arms','face','hair_front','details'}
local ls={};for i,n in ipairs(names) do local l=i==1 and s.layers[1] or s:newLayer();l.name=n;ls[i]=l end
local im={};for i=1,#names do im[i]=Image(48,64,ColorMode.RGB) end
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
-- Contact shadow, boots and separate legs.
poly(im[1],{{12,60},{16,59},{33,59},{38,61},{34,63},{15,63},{11,62}},c.shadow)
poly(im[2],{{16,45},{22,45},{23,55},{21,59},{13,59},{13,57},{16,55}},c.ink)
poly(im[2],{{25,45},{31,44},{34,54},{36,56},{35,59},{27,59},{25,56}},c.ink)
poly(im[2],{{16,49},{21,49},{21,55},{20,57},{14,57},{17,55}},c.shoe)
poly(im[2],{{26,49},{31,48},{33,55},{35,56},{34,57},{27,57},{25,55}},c.shoe)
path(im[2],{{15,57},{19,57},{21,56}},c.shade);path(im[2],{{28,57},{34,57}},c.shade)
-- Long tied hair, visible behind shoulder with strand divisions.
poly(im[3],{{16,12},{29,11},{32,16},{31,28},{34,40},{31,44},{27,40},{23,37},{20,42},{16,39},{17,31},{13,24}},c.ink)
poly(im[3],{{17,15},{28,14},{30,19},{29,30},{32,39},{30,41},{27,37},{23,35},{19,39},{18,37},{19,27},{15,23}},c.hair)
path(im[3],{{18,21},{19,30},{18,36}},c.hairlit);path(im[3],{{29,24},{28,31},{30,38}},c.hairlit)
-- Three-quarter torso with an offset chest and layered hems.
poly(im[4],{{16,24},{21,22},{29,24},{34,27},{37,33},{34,41},{37,52},{32,56},{26,54},{21,57},{16,55},{12,56},{10,52},{13,42},{10,33},{12,28}},c.ink)
poly(im[4],{{16,25},{21,24},{29,25},{33,28},{35,33},{32,40},{35,51},{32,54},{26,52},{21,55},{16,53},{12,54},{12,51},{15,41},{12,33},{14,28}},c.robe)
poly(im[4],{{13,30},{17,27},{19,32},{18,43},{16,52},{12,53},{15,40},{12,33}},c.shade)
poly(im[4],{{19,38},{26,39},{28,52},{21,55},{18,52},{21,46}},c.white)
poly(im[4],{{26,40},{31,39},{34,51},{31,54},{27,52}},c.shade)
path(im[4],{{18,29},{20,32},{19,40}},c.white);path(im[4],{{30,31},{31,36},{30,40}},c.white)
path(im[4],{{15,46},{14,50},{13,51}},c.dark);path(im[4],{{30,44},{32,50}},c.dark)
-- Far sleeve behind torso and nearer broad sleeve in front.
poly(im[5],{{13,27},{17,27},{18,32},{15,39},{12,41},{9,39},{10,34},{10,30}},c.ink)
poly(im[5],{{12,29},{16,28},{17,32},{14,38},{12,39},{10,38},{11,33}},c.shade)
poly(im[5],{{10,38},{13,38},{14,41},{12,43},{9,42}},c.skin)
poly(im[5],{{29,26},{34,27},{38,31},{40,38},{38,42},{32,43},{29,39},{30,34},{28,30}},c.ink)
poly(im[5],{{30,28},{33,28},{37,32},{38,38},{37,40},{33,41},{30,38},{31,33},{29,30}},c.white)
poly(im[5],{{33,38},{37,38},{38,41},{36,43},{33,42}},c.skin)
path(im[5],{{32,30},{35,33},{36,37}},c.robe);path(im[5],{{31,39},{33,40},{35,40}},c.shade)
-- Neck attaches to chest below the hair line.
poly(im[6],{{20,21},{27,20},{29,25},{26,28},{21,27},{19,24}},c.skins)
poly(im[6],{{21,21},{26,21},{27,25},{25,26},{21,25}},c.skin)
-- Three-quarter head: offset nose, far eye, cheek and jaw are individually placed.
poly(im[6],{{17,9},{24,7},{30,9},{33,13},{33,17},{35,18},{33,20},{32,23},{28,26},{23,26},{18,24},{16,20},{15,15}},c.ink)
poly(im[6],{{18,10},{24,9},{30,10},{32,14},{32,17},{34,18},{32,19},{31,22},{28,24},{23,25},{19,23},{17,20},{16,15}},c.skin)
poly(im[6],{{17,17},{19,16},{20,19},{19,21},{17,20}},c.skins)
path(im[6],{{21,12},{25,11},{28,12}},c.light);path(im[6],{{29,21},{31,21}},c.skins)
line(im[6],23,17,24,17,c.ink);line(im[6],30,16,31,16,c.ink)
line(im[6],23,15,25,15,c.hair);line(im[6],30,14,31,14,c.hair)
im[6]:drawPixel(31,19,c.skins);line(im[6],26,22,28,22,c.skins)
-- Crown, tied topknot, hairline and a narrow tie.
poly(im[7],{{15,13},{16,9},{19,6},{24,5},{29,6},{32,9},{33,13},{31,15},{29,13},{27,12},{24,14},{21,12},{19,15},{17,19},{15,18}},c.ink)
poly(im[7],{{16,12},{18,9},{21,7},{25,7},{29,8},{31,10},{32,12},{30,12},{28,11},{25,12},{23,12},{21,11},{19,13},{17,17},{16,17}},c.hair)
path(im[7],{{18,10},{21,8},{25,8}},c.hairlit);path(im[7],{{27,8},{30,10}},c.hairlit)
poly(im[7],{{20,6},{20,3},{22,1},{27,1},{29,3},{29,7}},c.ink)
poly(im[7],{{21,5},{21,3},{23,2},{27,2},{28,4},{28,6}},c.hair)
line(im[7],21,5,28,5,c.gold)
-- Crossed collar, belt and asymmetric front panel, gold ornament.
path(im[8],{{19,25},{24,31},{29,25}},c.ink);path(im[8],{{19,26},{24,32},{30,26}},c.white)
path(im[8],{{21,25},{27,31},{30,28}},c.light);path(im[8],{{24,32},{27,36},{30,34}},c.white)
poly(im[8],{{15,39},{32,38},{33,42},{15,43}},c.belt)
path(im[8],{{15,39},{32,38}},c.light);poly(im[8],{{23,39},{27,39},{27,42},{23,42}},c.gold)
path(im[8],{{26,42},{29,48},{28,52}},c.belt);path(im[8],{{25,42},{26,48},{24,53}},c.light)
for i,l in ipairs(ls)do s:newCel(l,s.frames[1],im[i],Point(0,0))end
s.frames[1].duration=.24
s:saveAs(assert(app.params.output))

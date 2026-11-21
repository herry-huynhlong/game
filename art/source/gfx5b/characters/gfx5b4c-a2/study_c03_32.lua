-- C03 A2 study A: edit a single south-east idle cel set in the existing document.
-- This is one design study, not a finished animation or a generated replacement sheet.
local s=assert(app.open(assert(app.params.input)));assert(s.width==32 and s.height==40 and #s.frames==98)
local layer={};for _,l in ipairs(s.layers)do layer[l.name]=l end
local function col(r,g,b)return app.pixelColor.rgba(r,g,b,255)end
local c={ink=col(35,39,35),hair=col(28,32,37),skin=col(219,174,137),skins=col(164,117,90),light=col(239,231,203),robe=col(141,185,175),shade=col(75,124,126),white=col(218,232,209),belt=col(59,118,119),gold=col(200,171,102),shoe=col(62,65,60)}
local function line(a,x,y,X,Y,k)local dx,dy=math.abs(X-x),math.abs(Y-y);local sx=x<X and 1 or -1;local sy=y<Y and 1 or -1;local err=dx-dy;while true do if x>=0 and x<32 and y>=0 and y<40 then a:drawPixel(x,y,k)end;if x==X and y==Y then break end;local e=2*err;if e>-dy then err=err-dy;x=x+sx end;if e<dx then err=err+dx;y=y+sy end end end
local function poly(a,p,k)local lo,hi=40,0;for _,v in ipairs(p)do lo=math.min(lo,v[2]);hi=math.max(hi,v[2])end;for y=lo,hi do local xs={};for i,v in ipairs(p)do local n=p[i%#p+1];if(v[2]<=y and n[2]>y)or(n[2]<=y and v[2]>y)then xs[#xs+1]=v[1]+(y-v[2])*(n[1]-v[1])/(n[2]-v[2])end end;table.sort(xs);for i=1,#xs-1,2 do for x=math.ceil(xs[i]),math.floor(xs[i+1])do if x>=0 and x<32 and y>=0 and y<40 then a:drawPixel(x,y,k)end end end end end
local frame=s.frames[5]
local function replace(name,draw)local cel=assert(layer[name]:cel(frame));local im=Image(32,40,ColorMode.RGB);draw(im);cel.image=im;cel.position=Point(0,0)end
-- Head is redrawn as a directional silhouette, rather than mirrored.
replace('face',function(im)
 poly(im,{{12,7},{15,5},{21,6},{23,9},{23,11},{24,12},{22,13},{22,15},{19,17},{14,17},{11,15},{10,12},{10,9}},c.ink)
 poly(im,{{12,8},{15,7},{20,7},{22,9},{22,11},{23,12},{21,13},{21,15},{19,16},{14,16},{12,14},{11,12},{11,10}},c.skin)
 line(im,12,12,13,14,c.skins);im:drawPixel(16,11,c.ink);im:drawPixel(21,11,c.ink);im:drawPixel(21,13,c.skins);line(im,18,14,19,14,c.skins)
end)
replace('hair_front',function(im)
 poly(im,{{10,10},{11,6},{14,4},{19,3},{22,5},{23,8},{22,10},{20,9},{18,8},{16,9},{14,8},{12,11},{11,13},{10,12}},c.hair)
 poly(im,{{14,4},{14,1},{19,1},{20,3},{19,5}},c.hair);line(im,14,4,20,4,c.gold)
end)
-- Near and far sleeves have different silhouettes; hands remain separate.
replace('arms',function(im)
 poly(im,{{9,17},{12,17},{13,21},{11,25},{8,25},{7,23},{7,20}},c.shade)
 poly(im,{{8,23},{10,23},{11,25},{10,27},{7,26}},c.skin)
 poly(im,{{20,17},{23,17},{26,20},{27,23},{25,26},{22,26},{20,23},{21,20}},c.ink)
 poly(im,{{21,18},{23,18},{25,20},{26,23},{24,25},{22,25},{21,23},{22,20}},c.white)
 poly(im,{{23,24},{25,24},{26,26},{24,27},{22,26}},c.skin)
 line(im,23,19,25,22,c.robe)
end)
-- Collar, crossed panels and asymmetric waist detail. This replaces the
-- previous decorations for this cel, not the original editable robe layer.
replace('details',function(im)
 line(im,11,16,16,21,c.light);line(im,16,21,21,16,c.light)
 line(im,14,17,19,22,c.white);line(im,19,22,21,20,c.white)
 line(im,10,25,23,24,c.belt);line(im,15,24,18,24,c.gold);line(im,16,25,18,25,c.gold)
 line(im,17,26,20,31,c.belt);line(im,20,31,19,33,c.belt)
 line(im,12,29,11,32,c.shade);line(im,22,28,23,31,c.shade)
end)
-- The original document contains no Aseprite tags; add explicit ranges for
-- the existing frames without altering durations or the frame ordering.
local dirs={'down','down_right','right','up_right','up','up_left','left','down_left'}
for j,dir in ipairs(dirs) do
 local idle=s:newTag(s.frames[(j-1)*4+1],s.frames[j*4]);idle.name='idle_'..dir
 local first=33+(j-1)*6;local walk=s:newTag(s.frames[first],s.frames[first+5]);walk.name='walk_'..dir
end
for _,a in ipairs({{'sit_enter',81,84},{'cultivate',85,88},{'sit_exit',89,91},{'hit',92,94},{'death',95,98}})do
 local tag=s:newTag(s.frames[a[2]],s.frames[a[3]]);tag.name=a[1]
end
s:saveAs(assert(app.params.output))

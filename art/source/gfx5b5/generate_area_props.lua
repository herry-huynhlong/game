local output=assert(app.params.output)
local s=Sprite(512,256,ColorMode.RGB);local l=s.layers[1];l.name='01 Wood stone and cloth forms';local d=s:newLayer();d.name='02 Highlights and insignia'
local a=Image(512,256,ColorMode.RGB);local b=Image(512,256,ColorMode.RGB)
local function color(h)return app.pixelColor.rgba(tonumber(h:sub(2,3),16),tonumber(h:sub(4,5),16),tonumber(h:sub(6,7),16),255)end
local function P(im,id,x,y,c)if x>=0 and x<128 and y>=0 and y<128 then im:drawPixel((id%4)*128+x,math.floor(id/4)*128+y,color(c))end end
local function R(im,id,x,y,w,h,c)for yy=y,y+h-1 do for xx=x,x+w-1 do P(im,id,xx,yy,c)end end end
local function L(im,id,x1,y1,x2,y2,c)local dx=math.abs(x2-x1);local dy=math.abs(y2-y1);local sx=x1<x2 and 1 or -1;local sy=y1<y2 and 1 or -1;local e=dx-dy;while true do P(im,id,x1,y1,c);if x1==x2 and y1==y2 then break end;local q=2*e;if q>-dy then e=e-dy;x1=x1+sx end;if q<dx then e=e+dx;y1=y1+sy end end end
local function poly(im,id,pts,c)local ymin,ymax=128,0;for _,p in ipairs(pts)do ymin=math.min(ymin,p[2]);ymax=math.max(ymax,p[2])end;for y=ymin,ymax do local xs={};for i,p in ipairs(pts)do local q=pts[i%#pts+1];if(p[2]<=y and q[2]>y)or(q[2]<=y and p[2]>y)then xs[#xs+1]=p[1]+(y-p[2])*(q[1]-p[1])/(q[2]-p[2])end end;table.sort(xs);for i=1,#xs-1,2 do for x=math.ceil(xs[i]),math.floor(xs[i+1])do P(im,id,x,y,c)end end end end
local wood='#69442F';local woodMid='#8D5D3D';local woodHi='#C08A54';local woodDark='#392D29';local stone='#535E5A';local stoneHi='#A8AD9B';local gold='#D3AE61';local teal='#3E8B83';local red='#A44339'
-- 0: top-down plank bridge with raised rails and stone feet.
R(a,0,13,39,102,58,woodDark);R(a,0,17,42,94,50,woodMid);R(a,0,17,42,94,5,woodHi);R(a,0,17,87,94,5,woodDark)
for y=49,81,8 do L(a,0,18,y,110,y,woodDark);L(b,0,20,y-1,108,y-1,woodHi)end
R(a,0,10,35,108,7,stone);R(a,0,10,91,108,7,stone);for x=15,113,14 do R(a,0,x,32,5,12,woodDark);R(a,0,x,88,5,12,woodDark);P(b,0,x+1,33,stoneHi);P(b,0,x+1,89,stoneHi)end
-- 1: hand cart carrying jars and herbs.
R(a,1,30,38,64,48,woodDark);R(a,1,34,42,56,39,woodMid);R(a,1,34,42,56,4,woodHi);for x=40,82,12 do L(a,1,x,48,x,77,woodDark);L(b,1,x+1,49,x+1,76,woodHi)end
for x=36,88,52 do for y=83,98,8 do P(a,1,x,y,woodDark);P(b,1,x+1,y,gold)end end
for x=40,66,13 do R(a,1,x,47,7,9,teal);R(b,1,x+2,46,3,3,'#8EB37C')end
L(a,1,90,49,115,36,woodDark);L(b,1,91,48,114,35,woodHi)
-- 2: carved stele on a square footing.
R(a,2,31,83,66,18,stone);R(b,2,35,85,58,4,stoneHi);R(a,2,42,30,44,54,'#666E66');R(b,2,45,32,4,47,stoneHi);R(a,2,37,23,54,10,stone);R(b,2,40,24,48,3,stoneHi);R(a,2,47,36,34,2,gold);R(a,2,47,44,34,2,gold);R(a,2,50,52,28,2,gold)
-- 3: red sect banner and gold spear finial.
L(a,3,35,15,35,110,woodDark);L(b,3,33,18,33,105,woodHi);poly(a,3,{{37,20},{100,25},{95,78},{85,91},{75,78},{37,82}},red);L(b,3,40,26,92,30,gold);L(b,3,45,43,78,45,gold);L(b,3,45,51,78,53,gold)
-- 4: woven meditation mat with a restrained jade motif.
R(a,4,23,34,82,58,woodDark);R(a,4,27,38,74,50,'#B99A65');R(b,4,31,42,66,2,'#D8C591');R(a,4,31,45,66,2,'#7B613F');L(b,4,52,62,76,62,teal);L(b,4,64,50,64,74,teal);L(b,4,55,53,73,71,teal)
-- 5: enclosed brazier with small, crisp flame.
R(a,5,33,41,62,50,stone);R(b,5,38,45,52,3,stoneHi);R(a,5,42,50,44,32,woodDark);poly(b,5,{{54,72},{58,60},{62,65},{67,48},{74,64},{81,55},{78,73}},'#E7A64F');poly(a,5,{{61,72},{65,62},{70,69},{73,57},{78,72}},red)
-- 6: modular wood fence segment.
R(a,6,10,46,108,8,woodDark);R(b,6,10,45,108,3,woodHi);R(a,6,10,72,108,8,woodDark);R(b,6,10,72,3,108,woodHi);for x=14,116,17 do R(a,6,x,38,7,51,woodMid);R(b,6,x+1,39,2,49,woodHi);R(a,6,x-1,38,9,5,woodDark)end
-- 7: wooden mission/sign board.
R(a,7,25,30,78,54,woodDark);R(b,7,29,34,70,4,woodHi);R(a,7,33,42,62,30,teal);R(b,7,37,46,54,2,gold);R(a,7,37,54,54,2,'#C4D1B0');R(a,7,38,99,5,18,woodMid);R(a,7,85,99,5,18,woodMid)
s:newCel(l,s.frames[1],a,Point(0,0));s:newCel(d,s.frames[1],b,Point(0,0));s:saveAs(output);print('GFX5B.5 props atlas: bridge, handcart, stele, banner, meditation mat, brazier, fence, signboard')

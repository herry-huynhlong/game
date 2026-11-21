-- GFX.5B.6 Phase A: two original freshwater pixel fish, authored in Aseprite Lua.
local root=app.params['root'] or 'D:/anh/game/xianxia-mvp'
local source=root..'/art/source/gfx5b5/fish';local runtime=root..'/public/assets/fauna/fish'
local C=ColorMode.RGB
local function rgba(r,g,b,a)return app.pixelColor.rgba(r,g,b,a or 255)end
local P={ink=rgba(34,46,43),shadow=rgba(13,41,49,105),commonBack=rgba(113,77,42),commonBackHi=rgba(156,110,55),commonSide=rgba(170,142,93),commonSideHi=rgba(211,187,129),belly=rgba(224,211,173),silver=rgba(174,185,164),silverHi=rgba(219,222,195),fin=rgba(145,92,52),finHi=rgba(210,157,83),gill=rgba(118,78,52),eye=rgba(24,31,31),eyeHi=rgba(242,225,170),jadeD=rgba(35,93,93),jade=rgba(43,148,145),jadeHi=rgba(101,204,186),ice=rgba(185,229,207),spirit=rgba(113,200,185),spiritD=rgba(56,127,133),gold=rgba(209,190,124)}
local function line(im,x0,y0,x1,y1,col)
 local dx,dy=math.abs(x1-x0),math.abs(y1-y0);local sx=x0<x1 and 1 or -1;local sy=y0<y1 and 1 or -1;local e=dx-dy
 while true do if x0>=0 and y0>=0 and x0<im.width and y0<im.height then im:drawPixel(x0,y0,col)end;if x0==x1 and y0==y1 then break end;local q=2*e;if q>-dy then e=e-dy;x0=x0+sx end;if q<dx then e=e+dx;y0=y0+sy end end
end
local function fill(im,x,y,w,h,col)for yy=math.max(0,y),math.min(im.height-1,y+h-1)do for xx=math.max(0,x),math.min(im.width-1,x+w-1)do im:drawPixel(xx,yy,col)end end end
local function dot(im,x,y,col)if x>=0 and y>=0 and x<im.width and y<im.height then im:drawPixel(x,y,col)end end
local function poly(im,pts,col)
 local mn,mx=im.height,0;for _,p in ipairs(pts)do mn=math.min(mn,p[2]);mx=math.max(mx,p[2])end
 for y=math.max(0,mn),math.min(im.height-1,mx)do local xs={};for i=1,#pts do local a,b=pts[i],pts[i%#pts+1];if(a[2]<=y and b[2]>y)or(b[2]<=y and a[2]>y)then xs[#xs+1]=a[1]+(y-a[2])*(b[1]-a[1])/(b[2]-a[2])end end;table.sort(xs);for i=1,#xs-1,2 do for x=math.max(0,math.ceil(xs[i])),math.min(im.width-1,math.floor(xs[i+1]))do im:drawPixel(x,y,col)end end end
end
local function ellipse(im,cx,cy,rx,ry,col)for y=-ry,ry do for x=-rx,rx do if x*x*ry*ry+y*y*rx*rx<=rx*rx*ry*ry then local xx,yy=cx+x,cy+y;if xx>=0 and yy>=0 and xx<im.width and yy<im.height then im:drawPixel(xx,yy,col)end end end end end
local function wave(frame,phase)local a={0,1,2,1,0,-1};return a[((frame+phase-2)%#a)+1]end
local function drawOne(species,frame,imgs)
 local spirit=species=='spirit';local tail=wave(frame,1);local bend=wave(frame,4);local fin=wave(frame,3)
 -- Contact shadow stays tight and translucent, giving the fish depth under the surface.
 ellipse(imgs[1],19,18,13,3,P.shadow)
 -- Tail silhouette and rays: broad forked river-fish tail versus flowing spirit streamers.
 if not spirit then
  poly(imgs[2],{{12,15+bend},{8,12+tail},{3,8+tail},{4,13+tail},{1,17+tail},{7,18+tail},{12,17+bend}},P.ink)
  poly(imgs[2],{{11,15+bend},{8,13+tail},{4,10+tail},{6,14+tail},{4,16+tail},{8,17+tail},{12,16+bend}},P.fin)
  line(imgs[2],5,11+tail,11,15+bend,P.finHi);line(imgs[2],5,17+tail,11,16+bend,P.commonSideHi)
 else
  poly(imgs[2],{{13,15+bend},{9,12+tail},{5,7+tail},{1,4+tail},{2,11+tail},{6,16+tail},{2,22+tail},{7,20+tail},{13,17+bend}},P.ink)
  poly(imgs[2],{{12,15+bend},{9,13+tail},{4,8+tail},{5,13+tail},{9,16+bend},{5,19+tail},{12,17+bend}},P.spiritD)
  poly(imgs[2],{{8,13+tail},{4,8+tail},{6,14+tail},{10,16+bend}},P.jadeHi)
  line(imgs[2],5,7+tail,12,15+bend,P.ice);line(imgs[2],5,21+tail,12,17+bend,P.jadeHi)
 end
 -- Separate dorsal and pectoral fins, flexing slightly on alternating strokes.
 if not spirit then
  poly(imgs[4],{{13,12+bend},{15,8+fin},{19,6+fin},{22,9+bend},{26,10+bend},{24,12+bend}},P.ink)
  poly(imgs[4],{{14,11+bend},{16,8+fin},{19,7+fin},{21,10+bend}},P.fin);line(imgs[4],16,10+fin,20,10+bend,P.finHi)
  poly(imgs[4],{{18,19+bend},{15,22+fin},{20,21+fin},{23,18+bend}},P.ink);poly(imgs[4],{{18,19+bend},{16,21+fin},{20,20+fin}},P.finHi)
  poly(imgs[4],{{23,17+bend},{21,21+fin},{26,20+fin},{28,17+bend}},P.ink);poly(imgs[4],{{23,18+bend},{22,20+fin},{26,19+fin}},P.fin)
 else
  poly(imgs[4],{{12,13+bend},{14,8+fin},{18,6+fin},{22,8+bend},{25,11+bend},{22,12+bend}},P.ink)
  poly(imgs[4],{{13,12+bend},{15,8+fin},{18,7+fin},{21,9+bend}},P.spiritD);line(imgs[4],14,11+bend,19,9+fin,P.ice)
  poly(imgs[4],{{18,19+bend},{15,23+fin},{21,21+fin},{24,18+bend}},P.ink);poly(imgs[4],{{19,19+bend},{17,21+fin},{21,20+fin}},P.jadeHi)
  poly(imgs[4],{{25,17+bend},{25,22+fin},{30,20+fin},{31,16+bend}},P.ink);poly(imgs[4],{{26,17+bend},{27,20+fin},{29,18+fin}},P.spirit)
 end
 -- Body outline is asymmetric, gently arched, and narrows into a distinct head.
 local body=imgs[3]
 if not spirit then
  poly(body,{{8,16+bend},{10,12+bend},{14,9+bend},{19,8+bend},{24,9+bend},{29,11+bend},{33,14+bend},{34,16+bend},{30,19+bend},{26,21+bend},{20,22+bend},{14,21+bend},{10,19+bend}},P.ink)
  poly(body,{{10,16+bend},{12,12+bend},{16,10+bend},{21,9+bend},{26,10+bend},{31,13+bend},{32,15+bend},{29,18+bend},{25,20+bend},{20,21+bend},{15,20+bend},{11,18+bend}},P.commonSide)
  poly(body,{{12,13+bend},{16,10+bend},{21,9+bend},{27,11+bend},{31,13+bend},{28,15+bend},{22,15+bend},{16,14+bend}},P.commonBack)
  line(body,15,11+bend,21,10+bend,P.commonBackHi);line(body,22,11+bend,27,12+bend,P.commonBackHi)
  poly(body,{{15,17+bend},{20,17+bend},{26,17+bend},{29,18+bend},{25,20+bend},{20,21+bend},{15,20+bend},{12,18+bend}},P.belly)
  line(body,18,18+bend,25,18+bend,P.commonSideHi);line(body,22,19+bend,27,18+bend,P.belly)
 else
  poly(body,{{8,16+bend},{11,12+bend},{16,10+bend},{22,9+bend},{28,10+bend},{32,12+bend},{35,15+bend},{34,17+bend},{30,20+bend},{24,21+bend},{18,20+bend},{12,19+bend}},P.ink)
  poly(body,{{10,16+bend},{13,13+bend},{17,11+bend},{23,10+bend},{29,11+bend},{33,14+bend},{33,16+bend},{29,19+bend},{24,20+bend},{18,19+bend},{13,18+bend}},P.jadeD)
  poly(body,{{14,14+bend},{18,12+bend},{24,11+bend},{29,12+bend},{32,14+bend},{28,16+bend},{22,15+bend},{17,16+bend}},P.jade)
  line(body,16,13+bend,21,11+bend,P.jadeHi);line(body,22,12+bend,27,12+bend,P.ice)
  poly(body,{{16,17+bend},{21,16+bend},{27,17+bend},{30,18+bend},{25,20+bend},{19,19+bend},{15,18+bend}},P.ice)
  line(body,19,18+bend,25,18+bend,P.spirit)
 end
 -- Face, gill, scales/markings, and small controlled light accents.
 local d=imgs[5]
 if not spirit then
  line(d,27,13+bend,28,17+bend,P.gill);line(d,28,13+bend,28,16+bend,P.commonSideHi)
  dot(d,30,13+bend,P.ink);dot(d,31,13+bend,P.eyeHi);dot(d,33,16+bend,P.ink)
  for _,p in ipairs({{15,14},{18,13},{21,14},{24,14},{17,17},{21,17},{24,16}})do dot(d,p[1],p[2]+bend,P.commonBackHi);dot(d,p[1]+1,p[2]+1+bend,P.commonSideHi)end
  line(d,11,15+bend,14,13+bend,P.commonBackHi);dot(d,13,18+bend,P.silverHi)
 else
  line(d,28,12+bend,29,17+bend,P.spiritD);line(d,29,13+bend,30,16+bend,P.ice)
  dot(d,32,13+bend,P.ink);dot(d,33,13+bend,P.ice);dot(d,35,16+bend,P.jadeHi)
  for _,p in ipairs({{16,15},{19,13},{22,14},{25,13},{18,17},{22,17},{26,16}})do dot(d,p[1],p[2]+bend,P.jadeHi);dot(d,p[1]+1,p[2]+1+bend,P.ice)end
  dot(d,23,12+bend,P.gold);dot(d,26,18+bend,P.ice)
 end
end
local function build(species,tag)
 local s=Sprite(40,32,C);local names={'01 Soft underwater shadow','02 Tail and caudal rays','03 Body volume and scales','04 Dorsal and pectoral fins','05 Face and markings'};local ls={}
 for i,n in ipairs(names)do local l=i==1 and s.layers[1]or s:newLayer();l.name=n;ls[i]=l end
 for fi=1,6 do local fr=fi==1 and s.frames[1]or s:newEmptyFrame();fr.duration=species=='common' and .14 or .18;local imgs={};for i=1,5 do imgs[i]=Image(40,32,C)end;drawOne(species,fi,imgs);for i=1,5 do s:newCel(ls[i],fr,imgs[i],Point(0,0))end end
 local t=s:newTag(s.frames[1],s.frames[#s.frames]);t.name=tag;t.aniDir=AniDir.FORWARD;t.repeats=0
 local path=source..'/'..tag..'.aseprite';s:saveAs(path);print('Wrote '..path);app.exit()
end
local which=app.params['species']or'common'
if which=='common'then build('common','FishCommon')else build('spirit','FishSpirit')end

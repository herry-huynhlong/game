print('START GFX5B5')
-- GFX.5B.5-A terrain atlas: hand-authored pixel clusters and material-specific tile grammar.
local output=assert(app.params.output)
local W,H=512,512
local sprite=Sprite(W,H,ColorMode.RGB)
local names={'01 Ground G01-G10','02 Wang Transitions','03 Roads R01-R04','04 Cliffs','05 Ground Details','06 Water and Stone Accents'}
local layers={}
for i,n in ipairs(names) do local l=i==1 and sprite.layers[1] or sprite:newLayer();l.name=n;layers[n]=l end
local function rgba(h)return app.pixelColor.rgba(tonumber(h:sub(2,3),16),tonumber(h:sub(4,5),16),tonumber(h:sub(6,7),16),255)end
local C={
 soil={'#77523A','#94704D','#BA925E','#45372B'}, red={'#744534','#915741','#B57552','#4C332C'}, dry={'#8B6938','#AC884B','#C9A45E','#5F4D34'}, damp={'#494238','#685747','#89775B','#2E3932'}, forest={'#304432','#47583A','#6A633D','#26382F'}, gravel={'#514A3E','#716552','#A18D69','#393B35'}, grass={'#3C653D','#56804A','#7DA35B','#294C37'}, straw={'#756B3B','#9B8C49','#C1A258','#514B35'}, stone={'#5D655C','#7C8578','#A5A492','#3D4743'}, paving={'#6E746B','#8D9084','#B0B09F','#4D5751'}, water={'#28586A','#39788A','#64A4A5','#1E4049'}, moss={'#476448','#66864F','#91A461','#344A3B'} }
local families={C.soil,C.red,C.dry,C.damp,C.forest,C.gravel,C.grass,C.straw,C.stone,C.paving}
local function px(im,x,y,c) if x>=0 and y>=0 and x<W and y<H then im:drawPixel(x,y,rgba(c)) end end
local function rect(im,x,y,w,h,c) local col=rgba(c);for yy=y,y+h-1 do for xx=x,x+w-1 do if xx>=0 and yy>=0 and xx<W and yy<H then im:drawPixel(xx,yy,col) end end end end
local function line(im,x1,y1,x2,y2,c) local dx=math.abs(x2-x1);local dy=math.abs(y2-y1);local sx=x1<x2 and 1 or -1;local sy=y1<y2 and 1 or -1;local err=dx-dy;local col=rgba(c);while true do if x1>=0 and y1>=0 and x1<W and y1<H then im:drawPixel(x1,y1,col)end;if x1==x2 and y1==y2 then break end;local e=err*2;if e>-dy then err=err-dy;x1=x1+sx end;if e<dx then err=err+dx;y1=y1+sy end end end
local function poly(im,pts,c)
 local ymin,ymax=64,0;for _,v in ipairs(pts)do ymin=math.min(ymin,v[2]);ymax=math.max(ymax,v[2])end
 for y=ymin,ymax do local xs={};for i,v in ipairs(pts)do local n=pts[i%#pts+1];if(v[2]<=y and n[2]>y)or(n[2]<=y and v[2]>y)then xs[#xs+1]=v[1]+(y-v[2])*(n[1]-v[1])/(n[2]-v[2])end end;table.sort(xs);for i=1,#xs-1,2 do for x=math.ceil(xs[i]),math.floor(xs[i+1])do px(im,x,y,c)end end end
end
local function origin(id)return (id%16)*32,math.floor(id/16)*32 end
local function tileimg(id)return blank end -- overwritten below
local function newImage()return Image(W,H,ColorMode.RGB)end
local images={ground=newImage(),trans=newImage(),roads=newImage(),cliffs=newImage(),details=newImage(),water=newImage()}
local function P(im,id,x,y,c)local ox,oy=origin(id);px(im,ox+x,oy+y,c)end
local function L(im,id,x1,y1,x2,y2,c)local ox,oy=origin(id);line(im,ox+x1,oy+y1,ox+x2,oy+y2,c)end
local function Poly(im,id,pts,c)local ox,oy=origin(id);local q={};for _,v in ipairs(pts)do q[#q+1]={v[1]+ox,v[2]+oy}end;poly(im,q,c)end
local function R(im,id,x,y,w,h,c)local ox,oy=origin(id);rect(im,ox+x,oy+y,w,h,c)end
local function base(im,id,f,v)
 local pal=families[f+1];local bg=pal[1];R(im,id,0,0,32,32,bg)
 -- Material-specific, low-frequency broken clusters; seeds change by tile, never a stamped repeated sprite.
 math.randomseed(9107+id*7919+f*101+v*17)
 local clusterCount=f==6 and 0 or f==4 and 1 or 2
 for k=1,clusterCount do local cx=math.random(4,27);local cy=math.random(4,27);local rx=math.random(2,4);local ry=math.random(1,3);local col=pal[math.random(2,3)];local threshold=math.random(72,92)/100
  for y=math.max(1,cy-ry),math.min(30,cy+ry) do for x=math.max(1,cx-rx),math.min(30,cx+rx) do local dx=(x-cx)/rx;local dy=(y-cy)/ry;if dx*dx+dy*dy<threshold then P(im,id,x,y,col) end end end
 end
 if f==6 or f==4 or f==7 then
  for k=1,2 do local x=math.random(4,27);local y=math.random(5,27);P(im,id,x,y,pal[3]);P(im,id,x-1,y+1,pal[2]);P(im,id,x+1,y+1,pal[2]);P(im,id,x,y+2,pal[1]) end
 elseif f==5 then
  for k=1,3 do local x=math.random(3,28);local y=math.random(3,28);R(im,id,x,y,math.random(2,4),math.random(1,2),pal[3]);P(im,id,x,y-1,pal[2]) end
 elseif f==8 then
  for k=1,3 do local x=math.random(5,25);local y=math.random(5,25);L(im,id,x,y,x+math.random(2,5),y+math.random(2,4),pal[4]);P(im,id,x-1,y,pal[3]) end
 elseif f==9 then
  -- Uneven worn paving slabs with an offset bond; relief stays within each 32px cell.
  math.randomseed(4701+v*311)
  local yy=-2;local row=0
  while yy<32 do local hh=math.random(6,9);local xx=-(row%2)*math.random(3,7)
   while xx<32 do local ww=math.random(8,13);local x0=xx+1;local y0=yy+1;local x1=xx+ww-1;local y1=yy+hh-1
    Poly(im,id,{{x0,y0+1},{x0+2,y0},{x1-1,y0+1},{x1,y1-1},{x1-2,y1},{x0+1,y1}},pal[2])
    L(im,id,x0+2,y0,x1-2,y0+1,pal[3]);L(im,id,x1-1,y0+2,x1,y1-1,pal[4]);L(im,id,x0+2,y1,x1-2,y1,pal[4])
    if math.random(1,3)==1 then P(im,id,x0+3,y0+3,pal[1]) end
    xx=xx+ww+1
   end
   yy=yy+hh+1;row=row+1
  end
 elseif f==0 or f==1 or f==2 or f==3 then
  -- embedded grit, pressure lines and scattered mineral highlights.
  for k=1,3 do local x=math.random(3,28);local y=math.random(3,28);P(im,id,x,y,pal[3]);P(im,id,x+1,y,pal[2]);if k==2 then P(im,id,x,y+1,pal[4]) end end
 end
 -- clean, restrained top-left flecks rather than blur or gradient.
 P(im,id,2,2,pal[3]);P(im,id,3,2,pal[2]);P(im,id,29,29,pal[4])
end
for f=0,9 do for v=0,3 do base(images.ground,f*4+v,f,v) end end
-- Eight material pairs, each with four directional edges in both base/overlay orders.
local terrainPairs={{6,0},{6,4},{0,5},{0,10},{6,9},{6,2},{0,8},{4,10}}
local function terrainTile(im,id,fam,variant)
 local pal=fam==10 and C.water or families[fam+1];if fam==10 then R(im,id,0,0,32,32,C.water[1]);L(im,id,2,6,11,6,C.water[2]);L(im,id,18,18,28,18,C.water[2]);P(im,id,7,5,C.water[3]);P(im,id,23,17,C.water[3]) else base(im,id,fam,variant%4) end
 return pal
end
for g,pair in ipairs(terrainPairs) do for variant=0,7 do
 local id=40+(g-1)*8+variant;local baseFam,patchFam=pair[1],pair[2];if variant>=4 then baseFam,patchFam=pair[2],pair[1] end
 local pal=terrainTile(images.trans,id,baseFam,variant)
 local pp=patchFam==10 and C.water or families[patchFam+1]
 local side=variant%4;local edge={}
 if side==0 then edge={{0,0},{31,0},{31,8},{27,9},{24,11},{18,10},{14,12},{9,10},{5,11},{0,8}}
 elseif side==1 then edge={{24,0},{31,0},{31,31},{23,31},{22,27},{20,23},{21,18},{19,14},{22,9}}
 elseif side==2 then edge={{0,24},{5,21},{10,22},{15,20},{19,22},{24,20},{28,22},{31,21},{31,31},{0,31}}
 else edge={{0,0},{8,0},{9,5},{11,9},{10,14},{12,19},{10,24},{12,29},{10,31},{0,31}} end
 Poly(images.trans,id,edge,pp[1]);
 -- irregular light/dark contour makes a pixel-clean soft boundary, not a straight split.
 for i=1,#edge-2 do local a,b=edge[i],edge[i+1];L(images.trans,id,a[1],a[2],b[1],b[2],pp[2]) end
 math.randomseed(812+id*79);for k=1,4 do local x=math.random(3,28);local y=math.random(3,28);P(images.trans,id,x,y,pal[3]) end
 end end
local function roadBounds(mask,x)
 local n=mask%2==1;local e=math.floor(mask/2)%2==1;local s=math.floor(mask/4)%2==1;local w=math.floor(mask/8)%2==1
 local curve=math.floor(3*math.abs(15.5-x)/15.5+0.5)
 return w and 0 or 6+curve,e and 31 or 25-curve,n and 0 or 6+curve,s and 31 or 25-curve
end
local roadPal={{'#71543A','#9A7650','#BE9A66','#44362C'},{'#626960','#858A7E','#ABA997','#404843'},{'#3D4B37','#65573C','#99804C','#29382F'},{'#686F68','#899084','#AEB09E','#454C47'}}
for style=0,3 do for mask=0,15 do local id=104+style*16+mask;local pal=roadPal[style+1]
  local inRoad={};math.randomseed(771+id*67)
  for y=0,31 do for x=0,31 do local l,r,t,b=roadBounds(mask,x);local on=x>=l and x<=r and y>=t and y<=b;inRoad[y*32+x]=on;if on then px(images.roads,(id%16)*32+x,math.floor(id/16)*32+y,pal[1]) end end end
  -- Only the exposed earth edge is outlined; connected tile seams stay open and seamless.
  for y=0,31 do for x=0,31 do if inRoad[y*32+x] then
   local edge=(x>0 and not inRoad[y*32+x-1])or(x<31 and not inRoad[y*32+x+1])or(y>0 and not inRoad[(y-1)*32+x])or(y<31 and not inRoad[(y+1)*32+x])
   if edge then px(images.roads,(id%16)*32+x,math.floor(id/16)*32+y,pal[4]) elseif math.random(1,61)==1 then px(images.roads,(id%16)*32+x,math.floor(id/16)*32+y,pal[2]) end
  end end end
  if style==1 or style==3 then
   for k=1,3 do local x=math.random(5,24);local y=math.random(6,24);local len=math.random(4,8);for q=0,len-1 do if inRoad[y*32+x+q] then P(images.roads,id,x+q,y,pal[3]) end end end
  elseif style==0 then for k=1,3 do local x=math.random(7,23);local y=math.random(8,23);if inRoad[y*32+x] then L(images.roads,id,x,y,x+2,y+1,pal[3]) end end
  else for k=1,4 do local x=math.random(8,23);local y=math.random(9,24);if inRoad[y*32+x] then P(images.roads,id,x,y,k%2==0 and pal[3] or pal[4]) end end end
 end end
-- Modular high-ground edges and vertical cliff faces. Included in the atlas, not placed across traversable routes.
local cliff={'#555D54','#73786D','#949488','#3C4541'}
for i=0,31 do local id=168+i;local var=i%8;local ox,oy=origin(id);R(images.cliffs,id,0,0,32,32,'#354539')
 if var<8 then
  Poly(images.cliffs,id,{{0,0},{31,0},{31,18},{27,19},{24,17},{19,21},{15,18},{10,22},{6,19},{0,22}},cliff[2]);Poly(images.cliffs,id,{{0,22},{6,19},{10,22},{15,18},{19,21},{24,17},{27,19},{31,18},{31,31},{0,31}},cliff[1]);L(images.cliffs,id,2,26,29,26,cliff[4]);L(images.cliffs,id,5,23,8,21,cliff[3]);L(images.cliffs,id,21,24,26,21,cliff[4])
 end
 if i%4==0 then L(images.cliffs,id,10,5,8,12,cliff[4]);L(images.cliffs,id,8,12,12,16,cliff[4]);P(images.cliffs,id,9,6,cliff[3]) end
 end
-- Transparent ground decals: tufts, leaves, flowers, exposed roots, lichen and gravel.
local deco={'#39613B','#58824B','#82A45E','#B6A46A','#D8C27A','#819887','#665B48','#A58D67'}
for i=0,15 do local id=199+i;math.randomseed(6001+i*137)
 if i<4 then for j=1,4 do local x=math.random(8,23);local y=math.random(12,22);L(images.details,id,x,y,x-2,y-5,deco[1]);L(images.details,id,x,y,x+2,y-4,deco[2]);P(images.details,id,x,y-6,deco[3]);P(images.details,id,x-1,y-1,deco[4]) end
 elseif i<8 then local x=math.random(9,22);local y=math.random(10,22);for _,d in ipairs({{-2,0},{2,0},{0,-2},{0,2}})do P(images.details,id,x+d[1],y+d[2],deco[1])end;P(images.details,id,x,y,deco[i%2==0 and 4 or 5])
 elseif i<12 then for j=1,5 do local x=math.random(4,27);local y=math.random(7,25);P(images.details,id,x,y,deco[6]);P(images.details,id,x+1,y,deco[7])end
 else local x=math.random(5,20);local y=math.random(12,24);L(images.details,id,x,y,x+7,y+3,deco[7]);L(images.details,id,x+3,y+1,x+2,y-3,deco[8]);P(images.details,id,x+5,y+2,deco[6]) end
 end
-- Water, 16 water/shallow/shore variants.
for v=0,15 do local id=215+v;local pal=C.water;R(images.water,id,0,0,32,32,v<8 and pal[1] or '#52715D');math.randomseed(v*881+3)
 for k=1,4 do local y=math.random(5,27);local x=math.random(2,20);L(images.water,id,x,y,x+math.random(5,11),y,pal[2]);P(images.water,id,x+2,y-1,pal[3]) end
 if v>=8 then for x=0,31 do local y=math.floor(4+2*math.sin((x+v)*.45));for q=0,4 do P(images.water,id,x,y+q,pal[2])end end end
 end
-- 24 ground stone accents, individually seeded silhouettes and face planes.
local stonePal={'#4A514B','#687068','#8A8E82','#B0AC98','#343D39','#57724D'}
for v=0,23 do local id=231+v;math.randomseed(2201+v*47);local x=math.random(7,14);local y=math.random(12,18);local w=math.random(7,14);local h=math.random(5,10)
 Poly(images.water,id,{{x,y+h},{x+2,y+2},{x+5,y},{x+w-2,y+1},{x+w,y+h-1}},stonePal[1]);Poly(images.water,id,{{x+2,y+h-1},{x+5,y+1},{x+w-2,y+2},{x+w-2,y+h-2}},stonePal[2]);L(images.water,id,x+5,y+1,x+w-3,y+2,stonePal[4]);L(images.water,id,x+2,y+h-1,x+w,y+h,stonePal[5]);if v%3==0 then P(images.water,id,x+3,y+4,stonePal[6])end
 end
for name,img in pairs(images)do sprite:newCel(layers[({ground=names[1],trans=names[2],roads=names[3],cliffs=names[4],details=names[5],water=names[6]})[name]],sprite.frames[1],img,Point(0,0)) end
local tag=sprite:newTag(1,1);tag.name='terrain_atlas_256';tag.aniDir=AniDir.FORWARD
sprite:saveAs(output);print('GFX5B.5 terrain atlas generated: 256 tiles, 16x16, 32px, six editable layers')


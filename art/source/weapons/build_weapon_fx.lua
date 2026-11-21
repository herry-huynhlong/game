-- Crisp hand-authored combat pixels. Each FX sheet has four cardinal facings.
local kind=assert(app.params['kind']);local output=assert(app.params['output']);assert(({dao=true,thrust=true,jian=true,impact=true})[kind],'invalid FX kind')
local size=48;local framesPerDir=6;local dirs={{0,1,1,0},{0,-1,1,0},{-1,0,0,1},{1,0,0,1}}
local C={ink={35,49,49},shade={84,139,148},steel={177,220,218},light={229,244,218},jade={109,201,184},gold={226,184,105}}
local function rgba(c)return app.pixelColor.rgba(c[1],c[2],c[3],c[4]or 255)end
local function p(im,x,y,c)if x>=0 and x<size and y>=0 and y<size then im:drawPixel(math.floor(x),math.floor(y),rgba(c))end end
local function line(im,x0,y0,x1,y1,c,w)
 w=w or 1;local dx,dy=math.abs(x1-x0),math.abs(y1-y0);local sx=x0<x1 and 1 or -1;local sy=y0<y1 and 1 or -1;local e=dx-dy;while true do for oy=-math.floor(w/2),math.floor(w/2)do for ox=-math.floor(w/2),math.floor(w/2)do if math.abs(ox)+math.abs(oy)<=w-1 then p(im,x0+ox,y0+oy,c)end end end;if x0==x1 and y0==y1 then break end;local q=2*e;if q>-dy then e=e-dy;x0=x0+sx end;if q<dx then e=e+dx;y0=y0+sy end end
end
local function pt(d,u,v)
 local f=dirs[d];local cx,cy=size/2,size/2;return cx+f[3]*u+f[1]*v,cy+f[4]*u+f[2]*v
end
local sprite=Sprite(size,size,ColorMode.RGB);local names={'soft-core','colored-edge','bright-edge','sparks'};local layers={sprite.layers[1]};layers[1].name=names[1];for i=2,#names do layers[i]=sprite:newLayer();layers[i].name=names[i]end
for d=1,4 do for phase=1,framesPerDir do
 local frame=((d-1)*framesPerDir+phase);local cels={Image(size,size,ColorMode.RGB),Image(size,size,ColorMode.RGB),Image(size,size,ColorMode.RGB),Image(size,size,ColorMode.RGB)};local soft,edge,bright,spark=cels[1],cels[2],cels[3],cels[4]
 if kind=='dao' or kind=='jian' then
  local arc=kind=='dao' and {{-16,5},{-13,11},{-8,15},{0,17},{8,15},{13,11},{16,5}} or {{-12,8},{-9,12},{-4,15},{2,16},{8,14},{12,9}}
  local shown=math.max(2,math.min(#arc,2+phase));local offset=(phase%2)*2
  for i=1,shown-1 do local x1,y1=pt(d,arc[i][1],arc[i][2]-offset);local x2,y2=pt(d,arc[i+1][1],arc[i+1][2]-offset);line(soft,x1,y1,x2,y2,C.ink,kind=='dao' and 5 or 3);line(edge,x1,y1,x2,y2,C.shade,kind=='dao' and 3 or 2);line(bright,x1,y1,x2,y2,kind=='dao' and C.light or C.steel,1)end
  local sx,sy=pt(d,arc[shown][1],arc[shown][2]-offset);p(spark,sx,sy,C.gold)
 elseif kind=='thrust' then
  local x1,y1=pt(d,0,3+phase);local x2,y2=pt(d,0,14+phase*2);line(soft,x1,y1,x2,y2,C.ink,6);line(edge,x1,y1,x2,y2,C.jade,4);line(bright,x1,y1,x2,y2,C.light,1);local lx,ly=pt(d,-2,5+phase);local rx,ry=pt(d,2,5+phase);line(spark,lx,ly,rx,ry,C.gold,1)
 else
  local cx,cy=size/2,size/2;local rays={{0,-8},{6,-5},{8,0},{5,5},{0,8},{-6,5},{-8,0},{-5,-5}};for i,v in ipairs(rays)do if i<=math.min(8,phase+3)then local scale=phase<3 and 1 or .7;line(soft,cx+v[1]*.45,cy+v[2]*.45,cx+v[1]*scale,cy+v[2]*scale,C.shade,2);p(bright,cx+v[1]*scale,cy+v[2]*scale,C.light)end end;p(spark,cx,cy,C.gold);p(bright,cx,cy,C.light)
 end
 local f=frame==1 and sprite.frames[1]or sprite:newEmptyFrame();f.duration=phase<=2 and 65 or 55;for li,im in ipairs(cels)do sprite:newCel(layers[li],f,im,Point(0,0))end
end end
for d,name in ipairs({'down','up','left','right'})do local a=(d-1)*framesPerDir+1;local t=sprite:newTag(sprite.frames[a],sprite.frames[a+framesPerDir-1]);t.name=kind..'_'..name;t.aniDir=AniDir.FORWARD;t.repeats=0 end
sprite:saveAs(output);print('Created Aseprite FX '..kind..' 4 directions x 6 frames: '..output)

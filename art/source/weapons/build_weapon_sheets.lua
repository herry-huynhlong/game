-- Hand-authored Pixel Art attachment layers for WORLD.REBUILD's 32x40 actors.
-- Exported by Aseprite CLI; all pixels live in named editable layers and tags.
local kind=assert(app.params['kind'],'kind=dao|jian is required')
local output=assert(app.params['output'],'output path is required')
assert(kind=='dao' or kind=='jian','unknown weapon kind')
local W,H,COLS,ROWS=32,40,8,36
local pal={ink={28,34,34},edge={226,233,218},steel={157,177,179},steelHi={201,216,211},steelShade={85,112,119},gold={202,164,83},goldHi={235,207,130},wood={104,64,42},wrap={206,177,119},sleeve={39,80,75},sleeveHi={78,126,111},sleeveShade={28,55,56},skin={219,173,132},skinHi={239,201,157}}
local function color(c)return app.pixelColor.rgba(c[1],c[2],c[3],c[4] or 255)end
local function pixel(im,x,y,c)if x>=0 and x<W and y>=0 and y<H then im:drawPixel(x,y,color(c))end end
local function line(im,x0,y0,x1,y1,c,width)
 width=width or 1;local dx,dy=math.abs(x1-x0),math.abs(y1-y0);local sx=x0<x1 and 1 or -1;local sy=y0<y1 and 1 or -1;local err=dx-dy
 while true do for oy=-math.floor((width-1)/2),math.ceil((width-1)/2) do for ox=-math.floor((width-1)/2),math.ceil((width-1)/2) do if math.abs(ox)+math.abs(oy)<=width-1 then pixel(im,x0+ox,y0+oy,c)end end end;if x0==x1 and y0==y1 then break end;local e=2*err;if e>-dy then err=err-dy;x0=x0+sx end;if e<dx then err=err+dx;y0=y0+sy end end
end
local function image()return Image(W,H,ColorMode.RGB)end
local function pose(state,dir,phase)
 local hand,tip,elbow
 if dir==0 then hand={23,24};tip={29,13};elbow={21,20}
 elseif dir==1 then hand={9,24};tip={3,12};elbow={11,20}
 elseif dir==2 then hand={10,24};tip={2,17};elbow={13,21}
 else hand={22,24};tip={30,17};elbow={19,21} end
 if state==12 then local reach=({-2,-1,1,3,2,0,0,0})[phase+1]or 0;hand={hand[1]+(dir==2 and -reach or dir==3 and reach or 0),hand[2]-math.floor(reach/2)};tip={tip[1]+(dir==2 and -reach*2 or dir==3 and reach*2 or 0),tip[2]+(dir==0 and reach*2 or dir==1 and -reach*2 or 0)};elbow={elbow[1]+(dir==2 and -reach or dir==3 and reach or 0),elbow[2]-math.floor(reach/3)}
 elseif state==16 then local reach=({-1,0,2,4,5,3,1,0})[phase+1]or 0;if dir==0 then hand={16,25+reach};tip={16,34+reach};elbow={20,21+reach}elseif dir==1 then hand={16,23-reach};tip={16,4-reach};elbow={12,20-reach}elseif dir==2 then hand={13-reach,24};tip={2-reach,24};elbow={18-reach,21}else hand={19+reach,24};tip={30+reach,24};elbow={14+reach,21}end
 elseif state==20 then local reach=({-1,0,1,2,1,0,0,0})[phase+1]or 0;if dir==0 then hand={23+reach,24};tip={27+reach,12+reach}elseif dir==1 then hand={9-reach,24};tip={5-reach,12+reach}elseif dir==2 then hand={10,24+reach};tip={2+reach,15+reach}else hand={22,24+reach};tip={30-reach,15+reach}end end
 return hand,tip,elbow
end
local function arm(state,hand,elbow)
 local im=image();local hx,hy=hand[1],hand[2];local ex,ey=elbow[1],elbow[2]
 line(im,ex,ey,hx,hy,pal.ink,6);line(im,ex,ey,hx,hy,pal.sleeveShade,4);line(im,ex-1,ey-1,hx-1,hy-1,pal.sleeveHi,2);line(im,ex,ey,hx,hy,pal.sleeve,2)
 line(im,hx-1,hy-1,hx+1,hy+1,pal.ink,5);line(im,hx-1,hy-1,hx+1,hy+1,pal.skin,3);pixel(im,hx-1,hy-2,pal.skinHi);pixel(im,hx+1,hy+1,pal.skinHi);line(im,hx-2,hy-2,hx+2,hy-2,pal.gold,1)
 return im
end
local function weapon(hand,tip)
 local blade,grip,glint=image(),image(),image();local hx,hy=hand[1],hand[2];local tx,ty=tip[1],tip[2];local dx,dy=tx-hx,ty-hy;local length=math.max(math.abs(dx),math.abs(dy));local ux=dx/math.max(1,length);local uy=dy/math.max(1,length);local px=-uy;local py=ux
 if kind=='jian' then line(blade,hx+math.floor(px*2),hy+math.floor(py*2),tx+math.floor(px*2),ty+math.floor(py*2),pal.ink,4);line(blade,hx,hy,tx,ty,pal.steelShade,3);line(blade,hx+math.floor(px),hy+math.floor(py),tx+math.floor(px),ty+math.floor(py),pal.steelHi,1);line(glint,hx+math.floor(px*2),hy+math.floor(py*2),tx+math.floor(px*2),ty+math.floor(py*2),pal.edge,1);pixel(blade,tx,ty,pal.edge)
 else local mx,my=hx+dx*.55+(-uy)*1.2,hy+dy*.55+ux*1.2;line(blade,hx+math.floor(px),hy+math.floor(py),math.floor(mx),math.floor(my),pal.ink,5);line(blade,math.floor(mx),math.floor(my),tx+math.floor(px*2),ty+math.floor(py*2),pal.ink,4);line(blade,hx,hy,math.floor(mx),math.floor(my),pal.steelShade,3);line(blade,math.floor(mx),math.floor(my),tx+math.floor(px),ty+math.floor(py),pal.steelShade,3);line(glint,hx+math.floor(px*2),hy+math.floor(py*2),math.floor(mx+px*2),math.floor(my+py*2),pal.steelHi,1);line(glint,math.floor(mx+px*2),math.floor(my+py*2),tx+math.floor(px*3),ty+math.floor(py*3),pal.edge,1);pixel(blade,tx,ty,pal.edge)end
 line(grip,hx+math.floor(px*2),hy+math.floor(py*2),hx-math.floor(px*2),hy-math.floor(py*2),pal.ink,3);line(grip,hx-math.floor(ux),hy-math.floor(uy),hx-math.floor(ux*4),hy-math.floor(uy*4),pal.ink,4);line(grip,hx-math.floor(ux),hy-math.floor(uy),hx-math.floor(ux*4),hy-math.floor(uy*4),pal.wood,2);for i=2,4 do pixel(grip,hx-math.floor(ux*i)+math.floor(px),hy-math.floor(uy*i)+math.floor(py),pal.wrap)end;pixel(grip,hx-math.floor(ux*5),hy-math.floor(uy*5),pal.goldHi)
 return blade,grip,glint
end
local sprite=Sprite(W,H,ColorMode.RGB);local names={'arm_sleeve','hand_grip','weapon_silhouette','metal_highlights'};local layers={sprite.layers[1]};layers[1].name=names[1];for i=2,#names do layers[i]=sprite:newLayer();layers[i].name=names[i]end
for fi=1,COLS*ROWS do local row=math.floor((fi-1)/COLS);local phase=(fi-1)%COLS;local state=math.floor(row/4)*4;local dir=row%4;local hand,tip,elbow=pose(state,dir,phase);local armImage=arm(state,hand,elbow);local blade,grip,glint=weapon(hand,tip);local frame=fi==1 and sprite.frames[1]or sprite:newEmptyFrame();frame.duration=state==0 and 180 or state==4 and 110 or 85;for li,im in ipairs({armImage,grip,blade,glint})do sprite:newCel(layers[li],frame,im,Point(0,0))end end
local directions={'down','up','left','right'};for state,name in ipairs({'idle','walk','run','dao_slash','jian_thrust','jian_slash'})do for d,label in ipairs(directions)do local row=(state-1)*4+(d-1);local first=row*COLS+1;local last=first+(state==1 and 3 or state==2 and 7 or 5);local tag=sprite:newTag(sprite.frames[first],sprite.frames[last]);tag.name=name..'_'..label;tag.aniDir=AniDir.FORWARD;tag.repeats=0 end end
sprite:saveAs(output);print('Created '..kind..' 32x40 weapon attachment sheet with 288 frames and 4 editable layers: '..output)

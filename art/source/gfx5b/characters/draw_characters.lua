-- Five 32x40 character studies drawn in Aseprite, no embedded equipment.
-- Frame order: idle down/up/left/right, then walk down/up/left/right, 4 each.
local specs={
 C01={hair={42,35,30},cloth={132,96,64},shade={88,65,52},light={180,143,94},inner={202,187,151},belt={72,94,78},shoe={65,51,41},kind='farmer_m'},
 C02={hair={39,32,30},cloth={119,133,105},shade={72,91,76},light={173,174,129},inner={216,201,166},belt={135,91,68},shoe={68,56,45},kind='farmer_f'},
 C03={hair={28,32,37},cloth={141,185,175},shade={75,124,126},light={218,232,209},inner={239,231,203},belt={59,118,119},shoe={62,65,60},kind='cultivator_m'},
 C04={hair={36,31,42},cloth={163,195,196},shade={101,138,150},light={227,235,218},inner={240,224,207},belt={108,112,155},shoe={72,64,65},kind='cultivator_f'},
 C05={hair={175,179,170},cloth={99,133,128},shade={57,89,91},light={191,210,195},inner={227,220,196},belt={126,108,69},shoe={72,68,58},kind='elder'}
}
local id=assert(app.params.id);local a=assert(specs[id]);local out=assert(app.params.output)
local s=Sprite(32,40,ColorMode.RGB);local names={'shadow','legs','hair_back','robe','arms','face','hair_front','details'};local layers={};for i,n in ipairs(names) do local l=i==1 and s.layers[1] or s:newLayer();l.name=n;layers[i]=l end
local function rgba(t)return app.pixelColor.rgba(t[1],t[2],t[3],255)end
local c={ink=rgba({35,39,35}),hair=rgba(a.hair),cloth=rgba(a.cloth),shade=rgba(a.shade),light=rgba(a.light),inner=rgba(a.inner),belt=rgba(a.belt),shoe=rgba(a.shoe),skin=rgba({219,174,137}),skins=rgba({164,117,90}),shadow=app.pixelColor.rgba(22,40,32,85),gold=rgba({200,171,102}),eye=rgba({43,40,35}),white=rgba({237,226,201})}
local function line(im,x,y,X,Y,col)
 local dx,dy=math.abs(X-x),math.abs(Y-y);local sx=x<X and 1 or -1;local sy=y<Y and 1 or -1;local err=dx-dy
 while true do if x>=0 and x<32 and y>=0 and y<40 then im:drawPixel(x,y,col)end;if x==X and y==Y then break end;local e=2*err;if e>-dy then err=err-dy;x=x+sx end;if e<dx then err=err+dx;y=y+sy end end
end
local function poly(im,p,col)
 local lo,hi=40,0;for _,v in ipairs(p)do lo=math.min(lo,v[2]);hi=math.max(hi,v[2])end
 for y=lo,hi do local xs={};for i,v in ipairs(p)do local n=p[i%#p+1];if(v[2]<=y and n[2]>y)or(n[2]<=y and v[2]>y)then xs[#xs+1]=v[1]+(y-v[2])*(n[1]-v[1])/(n[2]-v[2])end end;table.sort(xs);for i=1,#xs-1,2 do for x=math.ceil(xs[i]),math.floor(xs[i+1])do if x>=0 and x<32 and y>=0 and y<40 then im:drawPixel(x,y,col)end end end end
end
local function box(im,x,y,w,h,col)poly(im,{{x,y},{x+w,y},{x+w,y+h},{x,y+h}},col)end
local function path(im,p,col)for i=1,#p-1 do line(im,p[i][1],p[i][2],p[i+1][1],p[i+1][2],col)end end
local farmer=a.kind=='farmer_m' or a.kind=='farmer_f';local female=a.kind=='farmer_f' or a.kind=='cultivator_f';local elder=a.kind=='elder'
local dirs={'down','up','left','right'}
for state=1,2 do for di,dir in ipairs(dirs)do for phase=1,4 do
 local index=(state-1)*16+(di-1)*4+phase;local frame=index==1 and s.frames[1] or s:newEmptyFrame();frame.duration=state==1 and (elder and .30 or .24) or .14
 local im={};for i=1,#names do im[i]=Image(32,40,ColorMode.RGB)end
 local walk=state==2;local stride=walk and ({-2,0,2,0})[phase] or 0;local sway=walk and ({1,0,-1,0})[phase] or (phase==3 and 1 or 0)
 poly(im[1],{{10,37},{13,36},{21,36},{24,38},{20,39},{12,39}},c.shadow)
 -- Alternating legs are drawn in place; grounded feet stay at y=37.
 if dir=='left' or dir=='right' then
  poly(im[2],{{13,28},{17,28},{18-stride,35},{20-stride,37},{15-stride,38},{12-stride,35}},c.shoe)
  poly(im[2],{{17,28},{21,28},{21+stride,34},{23+stride,36},{21+stride,38},{18+stride,36}},c.shade)
 else
  poly(im[2],{{11,27},{15,28},{15+stride,35},{14+stride,37},{10+stride,37},{9+stride,35}},c.shoe)
  poly(im[2],{{17,28},{21,27},{23-stride,35},{22-stride,37},{18-stride,37},{17-stride,35}},c.shoe)
 end
 if female or not farmer then
  local endy=farmer and 21 or 25;poly(im[3],{{11,9},{21,9},{23,endy-3},{21+sway,endy},{17+sway,endy-2},{13,endy},{10,endy-4}},c.hair)
 end
 local hem=farmer and 29 or elder and 35 or 33;local left=farmer and 9 or female and 7 or 8;local right=farmer and 23 or female and 25 or 24
 poly(im[4],{{11,15},{21,15},{25,19},{23,25},{right,hem-2},{21,hem},{16+sway,hem-2},{11,hem},{left,hem-2},{9,25},{7,19}},c.ink)
 poly(im[4],{{11,16},{21,16},{24,19},{22,25},{right-1,hem-3},{21,hem-1},{16+sway,hem-3},{11,hem-1},{left+1,hem-3},{10,25},{8,19}},c.cloth)
 poly(im[4],{{9,20},{12,17},{14,21},{13,hem-3},{10,hem-2},{left+1,hem-4}},c.shade)
 path(im[4],{{20,19},{22,22},{21,29},{22,hem-3}},c.light)
 if not farmer then poly(im[4],{{13,24},{18,24},{20+sway,hem-2},{16+sway,hem-3},{13,hem-1}},c.light)end
 -- Sleeves and hand swing respond to the gait, without baked weapons.
 local aw=female and not farmer and 5 or 3
 if dir=='down' or dir=='up' then
  poly(im[5],{{8,17},{11,16},{12,22},{10,25+sway},{7,24+sway},{6,20}},c.shade)
  poly(im[5],{{21,16},{24,17},{26,20},{25,24-sway},{22,25-sway},{20,22}},c.light)
  if dir=='down' then box(im[5],7,23+sway,3,3,c.skin);box(im[5],22,23-sway,3,3,c.skin)end
  if aw==5 then path(im[5],{{6,21},{5,25+sway},{9,27+sway},{11,24+sway}},c.light);path(im[5],{{23,20},{27,24-sway},{25,27-sway},{21,24-sway}},c.shade)end
 else
  local front=dir=='right' and 21 or 7;local other=dir=='right' and 8 or 22
  poly(im[5],{{front,17},{front+3,18},{front+4,23+sway},{front+1,26+sway},{front-1,23}},c.light);box(im[5],front,23+sway,3,3,c.skin)
  path(im[5],{{other,17},{other-1,21},{other,24-sway}},c.shade)
 end
 -- Four separately drawn facing silhouettes and facial details.
 if dir=='down' then
  poly(im[6],{{11,7},{13,5},{20,5},{22,8},{22,14},{19,17},{13,17},{10,14},{10,9}},c.ink)
  poly(im[6],{{12,8},{20,7},{21,10},{21,14},{19,16},{13,16},{11,14},{11,10}},c.skin)
  im[6]:drawPixel(13,12,c.eye);im[6]:drawPixel(19,12,c.eye);im[6]:drawPixel(16,14,c.skins)
  poly(im[7],{{10,9},{10,6},{13,3},{20,3},{23,7},{22,11},{20,9},{18,8},{16,10},{13,8},{11,11}},c.hair)
 elseif dir=='up' then
  poly(im[7],{{10,8},{11,5},{14,3},{20,4},{23,8},{22,15},{20,17},{12,17},{10,14}},c.hair);path(im[7],{{12,8},{15,6},{20,7}},c.shade)
 else
  local rightward=dir=='right'
  if rightward then
   poly(im[6],{{11,7},{19,6},{22,9},{23,12},{21,13},{21,15},{18,17},{12,16},{10,13}},c.skin)
   poly(im[7],{{10,9},{10,6},{13,3},{19,3},{22,6},{22,9},{19,8},{17,9},{14,8},{13,13},{11,15},{9,12}},c.hair)
   im[8]:drawPixel(20,11,c.eye);path(im[8],{{20,15},{19,16}},c.skins)
  else
   poly(im[6],{{13,6},{21,7},{22,13},{20,16},{14,17},{11,15},{11,13},{9,12},{10,9}},c.skin)
   poly(im[7],{{10,6},{13,3},{19,3},{22,6},{22,12},{21,15},{19,13},{18,8},{15,9},{13,8},{10,9}},c.hair)
   im[8]:drawPixel(11,11,c.eye);path(im[8],{{12,15},{13,16}},c.skins)
  end
 end
 -- Individually tailored occupation and age details.
 if farmer then
  if female then poly(im[7],{{10,6},{12,3},{19,3},{22,6},{19,8},{13,7}},c.belt);path(im[7],{{20,6},{23,8},{23,12}},c.belt)
  else box(im[7],13,2,6,3,c.hair);path(im[7],{{11,7},{20,7}},c.belt)end
  path(im[8],{{10,16},{16,21},{20,17}},c.inner);path(im[8],{{11,24},{21,24}},c.belt);path(im[8],{{12,27},{13,29}},c.light)
  if female then poly(im[8],{{12,25},{20,25},{22,30},{11,30}},c.inner);path(im[8],{{12,30},{18,30}},c.shade);path(im[8],{{13,26},{13,29}},c.light)
  else path(im[8],{{10,27},{12,28},{13,27}},c.shade);path(im[8],{{19,28},{21,27}},c.light)end
 else
  box(im[7],13,1,6,4,c.hair);path(im[7],{{13,4},{20,4}},female and c.belt or c.gold)
  if female then path(im[7],{{20,4},{24,1}},c.gold);path(im[3],{{19,16},{21+sway,23},{19+sway,26}},c.belt)end
  if dir=='up' then path(im[8],{{11,17},{16,20},{22,17}},c.light)else path(im[8],{{11,16},{16,21},{21,16}},c.inner);path(im[8],{{13,17},{18,22},{20,20}},c.light)end
  path(im[8],{{10,25},{22,25}},c.belt);box(im[8],15,24,3,3,c.gold);path(im[8],{{17,27},{19+sway,32},{17+sway,34}},c.belt)
  if elder and dir=='down' then poly(im[8],{{12,14},{15,16},{19,14},{20,17},{18,21},{16,23},{14,20},{12,18}},c.hair);path(im[8],{{14,18},{15,21},{16,22}},c.white);im[8]:drawPixel(11,12,c.skins);im[8]:drawPixel(21,12,c.skins)end
  if elder and (dir=='left' or dir=='right') then local x=dir=='left' and 11 or 18;poly(im[8],{{x,14},{x+4,15},{x+4,19},{x+2,22},{x,18}},c.hair);path(im[8],{{x+1,16},{x+2,20}},c.white)end
  if elder then path(im[8],{{9,22},{12,22}},c.gold);path(im[8],{{20,22},{23,22}},c.gold)end
 end
 for i,l in ipairs(layers)do s:newCel(l,frame,im[i],Point(0,0))end
end end end
s:saveAs(out);print('Saved '..id..' '..out)

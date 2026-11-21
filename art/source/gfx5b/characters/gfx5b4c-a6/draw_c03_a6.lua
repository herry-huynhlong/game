-- C03 A6: three deliberately authored pixel-art views, built in Aseprite.
-- The body silhouettes, facial planes, sleeves, robe panels and feet are drawn
-- independently for each facing; no pose is a transformed A5 sprite.
local output=assert(app.params.output)
local W,H=48,64
local sprite=Sprite(W,H,ColorMode.RGB)
local layerNames={'shadow','hair_back','robe_back','legs_boots','sleeves','body','face','hair_front','facial_features','embroidered_trim'}
local layers={}
for i,name in ipairs(layerNames) do
  local layer=i==1 and sprite.layers[1] or sprite:newLayer()
  layer.name=name; layers[name]=layer
end
local function rgba(hex)
  return app.pixelColor.rgba(tonumber(hex:sub(2,3),16),tonumber(hex:sub(4,5),16),tonumber(hex:sub(6,7),16),255)
end
local C={
  ink='#26343A',edge='#394B50',hair='#20282F',hair2='#344249',hair3='#526265',hair4='#71807A',
  skin='#E7BC9C',skinL='#F4D4B6',skinM='#CD987A',skinS='#A96F5D',
  inner='#EAE6D2',innerL='#F5F1DB',innerS='#B9C9BA',
  jade='#5D9390',jadeL='#84B0A4',jadeD='#3D6F70',jadeX='#2F555C',
  belt='#334B50',gold='#C9A760',goldL='#E6CB84',
  trouser='#435A5B',trouserL='#607572',boot='#443F3A',bootL='#766B58',
  shadow='#34483F',shadowL='#4B6050'
}
local function blank() return Image(W,H,ColorMode.RGB) end
local function put(im,x,y,c) if x>=0 and y>=0 and x<W and y<H then im:drawPixel(x,y,rgba(C[c] or c)) end end
local function line(im,x0,y0,x1,y1,c)
  local dx,dy=math.abs(x1-x0),math.abs(y1-y0);local sx=x0<x1 and 1 or -1;local sy=y0<y1 and 1 or -1;local e=dx-dy
  while true do put(im,x0,y0,c);if x0==x1 and y0==y1 then break end;local q=2*e;if q>-dy then e=e-dy;x0=x0+sx end;if q<dx then e=e+dx;y0=y0+sy end end
end
local function poly(im,p,c)
  local lo,hi=H,0
  for _,v in ipairs(p) do lo=math.min(lo,v[2]);hi=math.max(hi,v[2]) end
  for y=lo,hi do local xs={};for i,v in ipairs(p) do local n=p[i%#p+1];if(v[2]<=y and n[2]>y)or(n[2]<=y and v[2]>y)then xs[#xs+1]=v[1]+(y-v[2])*(n[1]-v[1])/(n[2]-v[2])end end;table.sort(xs);for i=1,#xs-1,2 do for x=math.ceil(xs[i]),math.floor(xs[i+1])do put(im,x,y,c)end end end
end
local function outlined(im,p,fill,edge)
  poly(im,p,edge)
  local inner={};for i,v in ipairs(p) do local centerX,centerY=24,32;local dx=v[1]-centerX;local dy=v[2]-centerY;inner[i]={v[1]-(dx==0 and 0 or (dx>0 and 1 or -1)),v[2]-(dy==0 and 0 or (dy>0 and 1 or -1))} end
  poly(im,inner,fill)
end
local function shadow(L)
  local s=L.shadow;poly(s,{{11,58},{14,56},{20,55},{26,56},{33,55},{38,57},{36,60},{30,61},{19,61},{12,60}},'shadow');line(s,17,58,23,57,'shadowL');line(s,28,58,34,57,'shadowL')
end

local function front(L)
  -- Back hair: tied knot, long nape locks and a narrow ribbon.
  local h=L.hair_back
  outlined(h,{{18,10},{20,6},{24,4},{28,6},{31,11},{31,19},{34,25},{32,31},{29,34},{27,28},{26,20},{21,20},{19,27},{16,32},{13,29},{15,22},{15,15}},'hair2','ink')
  poly(h,{{18,17},{20,21},{19,27},{16,31},{15,28},{17,22}},'hair3');poly(h,{{29,18},{30,23},{33,27},{31,30},{28,25}},'hair2')
  outlined(h,{{21,5},{21,2},{23,1},{27,2},{28,5},{27,8},{23,8}},'hair2','ink');line(h,22,3,25,2,'hair4');line(h,22,6,26,6,'gold')
  -- Hairline shadow and tapered, lightly parted fringe frame a small face.
  local face=L.face
  outlined(face,{{19,9},{21,7},{27,7},{30,10},{30,15},{29,19},{26,22},{22,21},{19,18},{18,14}},'skin','edge')
  poly(face,{{21,9},{24,8},{27,9},{29,11},{28,13},{22,13},{19,12}},'skinL')
  put(face,18,13,'skinM');put(face,30,13,'skinM')
  -- brows, focused eyes, nose bridge and soft mouth in deliberate small clusters
  line(face,20,12,22,12,'hair2');line(face,26,12,28,12,'hair2');put(face,21,14,'ink');put(face,27,14,'ink')
  put(face,22,14,'skinS');put(face,28,14,'skinS');line(face,24,14,23,16,'skinM');put(face,24,17,'skinL');line(face,23,19,25,19,'skinS')
  -- Ears and neck taper into the shoulders.
  poly(face,{{21,19},{27,19},{27,25},{25,27},{22,25}},'skinM');poly(face,{{22,20},{26,20},{26,24},{24,25},{22,24}},'skin')
  -- Rear robe establishes a slim shoulder line and a split hem above both legs.
  local back=L.robe_back
  outlined(back,{{19,23},{22,21},{27,21},{30,23},{33,25},{35,32},{34,42},{37,51},{34,55},{14,55},{11,52},{15,42},{13,33},{15,27}},'jadeD','ink')
  poly(back,{{18,27},{22,24},{27,24},{31,27},{32,39},{34,50},{31,53},{26,51},{24,44},{21,52},{16,53},{14,51},{18,40}},'jade')
  line(back,19,31,18,39,'jadeL');line(back,29,32,31,41,'jadeX');line(back,18,47,16,51,'jadeL');line(back,29,47,32,51,'jadeD')
  -- Trouser legs and boots are visible through two natural robe openings.
  local legs=L.legs_boots
  outlined(legs,{{18,46},{23,47},{23,56},{21,59},{15,59},{14,57},{16,52}},'trouser','ink')
  poly(legs,{{19,49},{22,49},{21,55},{19,57},{16,57},{17,53}},'trouserL')
  outlined(legs,{{26,46},{30,47},{34,52},{35,57},{33,59},{27,59},{25,56}},'trouser','ink')
  poly(legs,{{27,49},{30,50},{33,54},{33,57},{28,57},{27,54}},'trouserL')
  outlined(legs,{{15,56},{21,56},{22,60},{20,62},{13,62},{12,60}},'boot','ink');line(legs,14,60,19,60,'bootL')
  outlined(legs,{{28,56},{34,56},{37,60},{36,62},{28,62},{26,60}},'boot','ink');line(legs,30,60,35,60,'bootL')
  -- Sleeves: sloped shoulder seams, broad cloth tapering to fitted cuffs.
  local arm=L.sleeves
  outlined(arm,{{18,23},{14,24},{11,27},{8,32},{9,37},{12,39},{16,37},{20,31}},'jadeD','ink')
  poly(arm,{{16,26},{13,28},{10,33},{11,36},{13,37},{16,34},{19,30}},'jadeL');line(arm,11,31,13,29,'innerS');line(arm,12,36,15,34,'jade')
  outlined(arm,{{29,23},{33,24},{37,28},{40,33},{39,37},{36,40},{32,37},{28,31}},'jadeD','ink')
  poly(arm,{{31,26},{34,27},{38,33},{37,36},{35,37},{32,34},{29,30}},'jadeL');line(arm,37,32,35,29,'innerL')
  -- Hands emerge below cuffs, each with a thumb notch.
  poly(arm,{{9,37},{12,37},{13,40},{11,42},{9,41},{8,39}},'skinM');poly(arm,{{10,38},{12,38},{12,40},{10,41}},'skinL')
  poly(arm,{{36,38},{39,37},{41,39},{40,42},{37,42},{35,40}},'skinM');poly(arm,{{37,38},{39,38},{40,40},{38,41},{36,40}},'skinL')
  -- Inner crossed robe and outer panels taper at waist and open at the shin.
  local body=L.body
  outlined(body,{{20,23},{22,22},{27,22},{30,24},{32,30},{31,39},{34,50},{31,55},{25,54},{24,45},{22,54},{16,55},{13,52},{17,40},{16,30}},'inner','ink')
  poly(body,{{21,25},{23,24},{27,24},{29,27},{29,38},{31,50},{28,52},{25,49},{24,42},{21,50},{17,52},{16,50},{19,39},{18,30}},'innerL')
  poly(body,{{19,27},{22,25},{25,28},{24,34},{21,39},{18,49},{16,50},{18,38}},'jade')
  poly(body,{{28,26},{30,29},{30,38},{33,50},{30,52},{27,42},{28,35}},'jadeD')
  line(body,19,33,21,37,'innerS');line(body,20,42,18,48,'innerS');line(body,28,43,30,49,'jadeL');line(body,25,31,27,36,'innerS')
  -- Trim lays over the torso: folded lapels, belt knot, cloud stitch and hems.
  local t=L.embroidered_trim
  poly(t,{{20,22},{22,22},{25,27},{29,30},{27,32},{24,29},{21,26}},'innerL');poly(t,{{29,22},{27,22},{24,27},{20,30},{22,32},{26,28},{28,26}},'jadeL')
  line(t,20,23,23,27,'gold');line(t,29,23,26,27,'gold');line(t,23,27,25,29,'goldL')
  line(t,17,39,22,40,'belt');line(t,22,40,29,39,'belt');line(t,17,40,22,41,'gold');line(t,22,41,29,40,'gold')
  poly(t,{{22,39},{25,38},{27,40},{25,43},{22,42}},'gold');put(t,24,40,'goldL');line(t,26,42,28,45,'gold')
  line(t,20,45,19,48,'jadeL');line(t,28,46,30,49,'innerS');line(t,17,53,20,54,'gold');line(t,28,53,31,53,'gold')
  line(t,22,32,23,35,'innerL');line(t,27,33,26,36,'jadeX');put(t,21,34,'goldL');put(t,28,36,'gold')
  -- Hair front last, with broken fringe and narrow temple locks; brow remains visible.
  local hf=L.hair_front
  outlined(hf,{{18,11},{18,8},{20,6},{23,5},{28,6},{31,9},{31,12},{29,14},{27,12},{25,13},{23,11},{21,13},{19,15}},'hair','ink')
  poly(hf,{{19,9},{21,7},{24,7},{26,8},{25,10},{23,9},{21,11},{19,12}},'hair2');line(hf,20,8,22,7,'hair3');line(hf,27,8,29,10,'hair3')
  -- lift the broken fringe above the eyes; pin catches the same warm light as the robe stitch
  line(hf,18,11,18,8,'hair');line(hf,18,8,20,6,'hair');line(hf,29,8,31,10,'hair');line(hf,23,4,27,4,'gold');put(hf,22,4,'goldL')
  poly(hf,{{18,11},{20,11},{20,17},{18,20},{17,17}},'hair');poly(hf,{{29,11},{31,12},{31,17},{29,20},{28,17}},'hair2')
  line(hf,18,14,18,17,'hair3');line(hf,30,14,30,16,'hair3')
  local marks=L.facial_features
  line(marks,20,12,22,12,'hair2');line(marks,26,12,28,12,'hair2');line(marks,20,13,22,13,'skinS');line(marks,26,13,28,13,'skinS')
  put(marks,21,14,'ink');put(marks,27,14,'ink');put(marks,22,14,'skinL');put(marks,28,14,'skinL')
  line(marks,24,14,23,16,'skinM');put(marks,24,17,'skinL');line(marks,23,19,25,19,'skinS');put(marks,26,18,'skinM')
end

local function profile(L)
  -- True east-facing side: narrow chest, a visible profile, one forward shoulder,
  -- the far arm occluded, hip/feet staggered, and robe tails following that axis.
  local h=L.hair_back
  outlined(h,{{10,14},{12,9},{17,6},{23,5},{28,7},{31,11},{30,16},{27,19},{25,24},{20,29},{16,27},{19,20},{15,18}},'hair2','ink')
  poly(h,{{11,14},{14,10},{18,8},{23,7},{27,9},{29,12},{27,15},{23,16},{20,22},{17,25},{21,18},{16,17}},'hair3')
  outlined(h,{{21,6},{23,3},{27,2},{30,4},{29,8},{25,9}},'hair2','ink');line(h,23,5,27,4,'hair4');line(h,22,7,27,7,'gold')
  -- profile cheek, brow, single eye, nose tip and closed mouth
  local f=L.face
  outlined(f,{{22,9},{27,8},{31,10},{32,13},{35,15},{32,17},{31,20},{28,22},{24,20},{21,17}},'skin','edge')
  poly(f,{{24,10},{27,9},{30,11},{30,13},{32,15},{29,15},{28,18},{25,17},{23,14}},'skinL')
  line(f,25,12,28,12,'hair2');put(f,27,14,'ink');put(f,28,14,'skinS');line(f,27,18,29,18,'skinS')
  poly(f,{{24,19},{28,19},{28,25},{25,27},{22,24}},'skinM');line(f,24,21,26,23,'skinL')
  local back=L.robe_back
  outlined(back,{{20,24},{26,22},{31,25},{33,32},{31,41},{35,52},{32,55},{15,54},{19,45},{21,36},{18,30}},'jadeD','ink')
  poly(back,{{24,27},{29,27},{30,34},{28,42},{32,51},{29,53},{21,52},{23,43},{22,36}},'jade');line(back,27,31,29,38,'jadeL');line(back,22,44,20,50,'jadeX')
  local legs=L.legs_boots
  outlined(legs,{{23,46},{28,47},{27,56},{24,59},{17,59},{16,57},{21,52}},'trouser','ink');line(legs,20,54,25,55,'trouserL')
  outlined(legs,{{29,48},{33,49},{37,55},{37,59},{34,60},{27,59},{26,57}},'trouser','ink');line(legs,30,54,34,57,'trouserL')
  outlined(legs,{{18,56},{25,56},{25,60},{22,62},{15,62},{14,60}},'boot','ink');line(legs,16,60,21,60,'bootL')
  outlined(legs,{{29,56},{35,56},{39,60},{38,62},{30,62},{28,60}},'boot','ink');line(legs,31,60,36,60,'bootL')
  local a=L.sleeves
  outlined(a,{{23,24},{28,23},{33,26},{37,30},{38,35},{35,39},{31,37},{29,32}},'jadeD','ink')
  poly(a,{{27,26},{31,26},{35,30},{36,34},{34,37},{31,34},{28,31}},'jadeL');line(a,32,28,35,32,'innerL')
  poly(a,{{35,36},{39,36},{40,39},{38,42},{35,40}},'skinM');poly(a,{{36,37},{38,37},{39,39},{37,40}},'skinL')
  -- far arm is a restrained contour behind the torso, not a second front sleeve
  poly(a,{{20,27},{23,26},{25,30},{24,35},{21,38},{19,36},{21,32}},'jadeX');line(a,20,31,22,29,'jadeL')
  local b=L.body
  outlined(b,{{23,23},{29,23},{33,27},{34,33},{31,41},{34,51},{31,55},{16,54},{20,46},{22,38},{20,30}},'inner','ink')
  poly(b,{{26,25},{30,26},{31,32},{29,41},{32,50},{29,52},{22,51},{25,41},{24,32}},'innerL')
  poly(b,{{23,26},{27,25},{29,29},{27,35},{24,41},{21,50},{18,51},{22,39}},'jade');poly(b,{{30,29},{32,32},{30,40},{33,50},{30,52},{27,41}},'jadeD')
  line(b,24,32,27,35,'innerS');line(b,22,43,20,49,'innerS');line(b,29,43,31,49,'jadeL')
  local t=L.embroidered_trim
  poly(t,{{23,23},{26,23},{29,27},{32,29},{30,31},{27,29},{24,26}},'innerL');line(t,23,24,27,28,'gold');line(t,28,29,29,35,'jadeX')
  line(t,21,39,27,40,'belt');line(t,21,40,27,41,'gold');poly(t,{{27,39},{30,39},{31,41},{28,43},{26,41}},'gold');put(t,28,40,'goldL')
  line(t,27,44,29,48,'jadeL');line(t,17,52,20,53,'gold');line(t,29,52,32,53,'gold')
  local hf=L.hair_front
  outlined(hf,{{21,12},{22,8},{26,6},{30,7},{32,10},{32,12},{30,12},{28,10},{26,12},{24,11},{22,13}},'hair','ink')
  poly(hf,{{22,10},{24,8},{28,8},{30,10},{29,11},{26,10},{24,12},{22,12}},'hair2');line(hf,23,9,26,8,'hair3');line(hf,24,5,28,5,'gold');put(hf,23,5,'goldL')
  poly(hf,{{21,13},{23,13},{22,18},{20,21},{19,18}},'hair2');line(hf,21,15,20,18,'hair3')
  local marks=L.facial_features
  line(marks,25,12,28,12,'hair2');put(marks,27,14,'ink');put(marks,28,14,'skinL');put(marks,29,14,'skinS')
  line(marks,31,15,33,15,'skinM');put(marks,31,16,'skinL');line(marks,27,18,29,18,'skinS')
end

local function threeQuarter(L)
  -- South-east 3/4: near shoulder/hand lead; far side recedes; all body planes
  -- share the same diagonal axis from crown through chest, sash, hip and feet.
  local h=L.hair_back
  outlined(h,{{15,13},{17,8},{22,5},{28,5},{32,8},{34,13},{33,18},{30,23},{26,27},{21,24},{17,20}},'hair2','ink')
  poly(h,{{17,13},{19,9},{23,7},{28,7},{31,10},{32,14},{29,19},{26,22},{22,20},{18,17}},'hair3');line(h,19,12,21,9,'hair4');line(h,28,10,30,13,'hair2')
  outlined(h,{{21,6},{22,3},{26,2},{30,4},{30,8},{27,10},{23,9}},'hair2','ink');line(h,23,5,27,4,'hair4');line(h,23,7,28,8,'gold')
  local f=L.face
  outlined(f,{{18,10},{21,8},{27,8},{31,10},{33,14},{32,18},{29,21},{24,22},{20,19},{18,15}},'skin','edge')
  poly(f,{{22,10},{25,9},{28,10},{31,12},{31,14},{28,15},{23,14},{20,13}},'skinL')
  put(f,19,13,'skinM');put(f,31,15,'skinM');line(f,24,15,25,16,'skinM');put(f,26,17,'skinL');line(f,24,19,27,19,'skinS');put(f,21,15,'skinS')
  poly(f,{{22,19},{28,20},{28,25},{25,27},{21,24}},'skinM');poly(f,{{23,20},{27,21},{27,24},{25,25},{23,24}},'skin')
  local back=L.robe_back
  outlined(back,{{20,24},{26,22},{32,24},{37,28},{39,35},{35,43},{39,51},{35,55},{15,54},{13,51},{19,43},{17,35},{16,29}},'jadeD','ink')
  poly(back,{{23,27},{28,25},{33,28},{35,34},{32,42},{36,50},{32,53},{25,51},{23,44},{19,51},{16,51},{21,40},{20,32}},'jade');line(back,21,31,22,39,'jadeL');line(back,31,32,33,39,'jadeX')
  local legs=L.legs_boots
  outlined(legs,{{18,47},{24,48},{22,56},{19,59},{13,59},{12,57},{16,52}},'trouser','ink');line(legs,15,55,19,56,'trouserL')
  outlined(legs,{{27,47},{32,48},{37,54},{38,58},{35,60},{28,59},{25,56}},'trouser','ink');line(legs,30,52,34,56,'trouserL')
  outlined(legs,{{14,56},{20,56},{21,60},{19,62},{12,62},{11,60}},'boot','ink');line(legs,13,60,18,60,'bootL')
  outlined(legs,{{29,56},{35,56},{39,60},{38,62},{30,62},{28,60}},'boot','ink');line(legs,31,60,36,60,'bootL')
  local a=L.sleeves
  outlined(a,{{20,24},{24,23},{28,26},{27,31},{22,35},{17,34},{14,31},{16,27}},'jadeD','ink')
  poly(a,{{20,26},{23,25},{26,28},{25,31},{21,33},{17,31},{18,28}},'jadeL');line(a,17,30,20,27,'innerL')
  outlined(a,{{30,24},{35,25},{40,30},{42,36},{40,40},{36,41},{33,37},{30,32}},'jadeD','ink')
  poly(a,{{33,27},{36,28},{39,32},{40,36},{38,38},{35,35},{32,31}},'jadeL');line(a,37,30,39,34,'innerL')
  poly(a,{{39,38},{42,38},{43,41},{41,43},{38,41}},'skinM');poly(a,{{40,39},{42,40},{41,42},{39,41}},'skinL')
  local b=L.body
  outlined(b,{{22,23},{27,22},{32,25},{35,30},{33,39},{37,50},{34,55},{16,54},{19,48},{23,39},{20,31}},'inner','ink')
  poly(b,{{25,25},{29,25},{32,29},{31,37},{29,42},{34,50},{31,52},{25,50},{24,42},{20,51},{17,51},{22,39},{22,31}},'innerL')
  poly(b,{{21,27},{25,25},{28,29},{26,35},{23,40},{20,49},{17,51},{20,39}},'jade');poly(b,{{31,29},{33,32},{31,40},{35,50},{32,52},{28,41}},'jadeD')
  line(b,23,32,26,35,'innerS');line(b,22,43,19,49,'innerS');line(b,30,43,33,49,'jadeL');line(b,27,31,29,35,'innerS')
  local t=L.embroidered_trim
  poly(t,{{22,23},{25,23},{29,27},{34,29},{32,31},{28,29},{24,26}},'innerL');poly(t,{{31,23},{28,23},{25,27},{21,30},{23,32},{27,28},{30,27}},'jadeL')
  line(t,22,24,26,28,'gold');line(t,31,25,28,28,'goldL');line(t,24,28,28,31,'innerL')
  line(t,20,39,25,40,'belt');line(t,25,40,32,39,'belt');line(t,20,40,25,41,'gold');line(t,25,41,32,40,'gold');poly(t,{{25,39},{28,38},{30,40},{28,43},{25,42}},'gold');put(t,27,40,'goldL')
  line(t,27,44,30,48,'jadeL');line(t,17,52,20,53,'gold');line(t,31,52,34,53,'gold')
  local hf=L.hair_front
  outlined(hf,{{17,12},{18,9},{21,6},{26,5},{30,7},{33,10},{34,12},{32,13},{30,11},{28,10},{26,12},{24,10},{22,12},{20,13},{18,13}},'hair','ink')
  poly(hf,{{19,10},{22,7},{26,7},{29,9},{30,10},{27,9},{25,11},{22,9},{20,12}},'hair2');line(hf,21,9,24,7,'hair3');line(hf,23,4,27,4,'gold');put(hf,22,4,'goldL')
  poly(hf,{{17,12},{20,12},{20,18},{18,21},{16,18}},'hair');poly(hf,{{31,12},{33,13},{32,18},{29,21},{28,17}},'hair2');line(hf,18,15,18,18,'hair3')
  local marks=L.facial_features
  line(marks,21,12,23,12,'hair2');line(marks,27,12,29,12,'hair2');put(marks,22,14,'ink');put(marks,28,14,'ink');put(marks,23,14,'skinL');put(marks,29,14,'skinL')
  put(marks,26,16,'skinM');put(marks,27,17,'skinL');line(marks,24,19,26,19,'skinS');put(marks,20,15,'skinM')
end

local poseNames={'front','profile_east','three_quarter_south_east'}
local drawPose={front,profile,threeQuarter}
for frameIndex,fn in ipairs(drawPose) do
  local frame=frameIndex==1 and sprite.frames[1] or sprite:newEmptyFrame()
  frame.duration=1.0
  local canvases={};for _,name in ipairs(layerNames) do canvases[name]=blank() end
  shadow(canvases);fn(canvases)
  for _,name in ipairs(layerNames) do sprite:newCel(layers[name],frame,canvases[name],Point(0,0)) end
end
for i,name in ipairs(poseNames) do local tag=sprite:newTag(i,i);tag.name='idle_'..name;tag.aniDir=AniDir.FORWARD;tag.repeats=0 end
sprite:saveAs(output)
print('C03 A6: authored 3 poses, 48x64, 10 editable layers, 3 tags')

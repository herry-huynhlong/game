-- C03 A6.2: original three-pose redraw inspired by the user's martial-artist reference.
-- Designed and rendered as editable pixel layers in Aseprite; no reference pixels are copied.
local output=assert(app.params.output);local W,H=48,64;local sprite=Sprite(W,H,ColorMode.RGB)
local names={'shadow','hair_back','robe_back','legs_boots','sleeves','body','face','beard_moustache','hair_front','facial_features','robe_trim'}
local layers={};for i,n in ipairs(names)do local ly=i==1 and sprite.layers[1]or sprite:newLayer();ly.name=n;layers[n]=ly end
local L={}
local C={
 ink='#251F1A',edge='#433127',hair='#121719',hairD='#202728',hairM='#343A36',hairL='#57584D',hairHi='#82745A',
 skin='#D8A27A',skinL='#EBC09A',skinM='#B77D5B',skinD='#84533E',
 robeD='#4B2D1C',robe='#71452A',robeM='#8B5834',robeL='#AA7043',robeHi='#C28A55',
 under='#D9D0BC',underL='#E9E1D0',underS='#A99A83',belt='#292520',beltL='#55402D',gold='#B78B4F',goldL='#D6B76E',
 pant='#3A3027',pantL='#5C4936',boot='#302922',bootL='#64503B',shadow='#3C392D',shadowL='#625841'
}
local function rgba(hex)return app.pixelColor.rgba(tonumber(hex:sub(2,3),16),tonumber(hex:sub(4,5),16),tonumber(hex:sub(6,7),16),255)end
local function blank()return Image(W,H,ColorMode.RGB)end
local function p(im,x,y,c)if x>=0 and x<W and y>=0 and y<H then im:drawPixel(x,y,rgba(C[c]or c))end end
local function line(im,x0,y0,x1,y1,c)local dx,dy=math.abs(x1-x0),math.abs(y1-y0);local sx=x0<x1 and 1 or -1;local sy=y0<y1 and 1 or -1;local e=dx-dy;while true do p(im,x0,y0,c);if x0==x1 and y0==y1 then break end;local q=2*e;if q>-dy then e=e-dy;x0=x0+sx end;if q<dx then e=e+dx;y0=y0+sy end end end
local function poly(im,pts,c)local lo,hi=H,0;for _,v in ipairs(pts)do lo=math.min(lo,v[2]);hi=math.max(hi,v[2])end;for y=lo,hi do local xs={};for i,v in ipairs(pts)do local n=pts[i%#pts+1];if(v[2]<=y and n[2]>y)or(n[2]<=y and v[2]>y)then xs[#xs+1]=v[1]+(y-v[2])*(n[1]-v[1])/(n[2]-v[2])end end;table.sort(xs);for i=1,#xs-1,2 do for x=math.ceil(xs[i]),math.floor(xs[i+1])do p(im,x,y,c)end end end end
local function shape(im,pts,fill,edge)poly(im,pts,edge);poly(im,pts,fill)end
local function shadow()poly(L.shadow,{{13,58},{17,56},{23,55},{29,56},{35,58},{32,60},{24,61},{16,60}},'shadow');line(L.shadow,18,58,22,57,'shadowL');line(L.shadow,27,58,31,58,'shadowL')end
local function knot(im,x,y)
 shape(im,{{x,y+3},{x,y},{x+2,y-2},{x+5,y-1},{x+6,y+2},{x+4,y+4}},'hairM','ink');line(im,x+1,y+1,x+3,y,'hairL');line(im,x+1,y+3,x+5,y+3,'gold')
end
local function front()
 local h=L.hair_back
 shape(h,{{16,14},{17,9},{20,6},{25,5},{30,7},{32,11},{31,17},{33,22},{31,28},{28,30},{26,24},{23,22},{20,26},{17,30},{14,27},{15,21}},'hairD','ink')
 poly(h,{{18,14},{20,9},{24,8},{28,9},{30,12},{29,17},{27,21},{24,20},{21,23},{18,27},{16,24}},'hairM');line(h,19,13,21,10,'hairL');line(h,27,11,29,14,'hairD')
 poly(h,{{17,18},{19,20},{18,25},{15,28},{14,26}},'hair');line(h,17,22,16,26,'hairL');poly(h,{{28,19},{30,21},{32,25},{30,28},{28,24}},'hairD')
 knot(h,22,5)
 local f=L.face
 shape(f,{{20,10},{22,8},{27,8},{30,10},{31,14},{30,18},{28,21},{24,22},{21,20},{19,17},{19,13}},'skin','edge')
 poly(f,{{21,11},{23,9},{27,9},{29,11},{29,13},{26,14},{22,13}},'skinL');poly(f,{{20,13},{21,12},{21,17},{23,19},{21,18}},'skinM');poly(f,{{30,13},{31,15},{29,18},{28,19}},'skinM')
 poly(f,{{22,20},{27,20},{27,25},{24,27},{21,24}},'skinM');poly(f,{{23,21},{26,21},{26,24},{24,25}},'skin')
 -- Rear robe and broad but controlled silhouette.
 local r=L.robe_back
 shape(r,{{19,24},{23,22},{28,22},{32,25},{35,30},{35,38},{32,44},{34,51},{31,54},{16,54},{13,51},{16,44},{14,37},{16,29}},'robeD','edge')
 poly(r,{{20,27},{24,25},{28,25},{31,28},{32,37},{29,44},{32,51},{28,53},{23,51},{18,53},{15,51},{18,43},{17,36}},'robe');poly(r,{{17,31},{19,29},{20,40},{17,49},{16,50}},'robeL');poly(r,{{31,30},{34,33},{32,41},{29,45},{29,37}},'robeD')
 line(r,19,45,17,49,'robeHi');line(r,30,45,31,49,'robeD')
 local legs=L.legs_boots
 shape(legs,{{18,49},{23,49},{23,57},{21,59},{17,59},{16,57}},'pant','ink');poly(legs,{{19,51},{22,51},{21,56},{18,57}},'pantL')
 shape(legs,{{26,49},{31,49},{32,56},{29,59},{26,58},{25,55}},'pant','ink');poly(legs,{{27,51},{30,52},{30,56},{27,56}},'pantL')
 shape(legs,{{16,56},{22,56},{22,60},{20,62},{14,61},{14,59}},'boot','ink');line(legs,16,60,20,60,'bootL');shape(legs,{{26,56},{31,56},{33,60},{32,62},{26,61},{24,60}},'boot','ink');line(legs,27,60,31,60,'bootL')
 local a=L.sleeves
 -- Sleeves slope down from relaxed shoulders and taper at the wrist; hands remain close to the body.
 shape(a,{{19,24},{16,25},{13,29},{14,34},{17,38},{16,42},{18,45},{21,43},{20,39},{22,35},{22,29}},'robeD','edge')
 poly(a,{{17,27},{15,30},{16,34},{18,37},{18,40},{17,43},{16,40},{15,35},{15,31}},'robeL');line(a,15,34,17,37,'robeHi')
 poly(a,{{17,43},{20,42},{21,45},{19,47},{17,46},{16,44}},'skin');p(a,18,43,'skinL');line(a,19,45,18,46,'skinM')
 shape(a,{{29,24},{32,26},{35,30},{35,35},{32,39},{32,42},{34,44},{32,46},{30,44},{30,40},{28,36},{27,30}},'robeD','edge')
 poly(a,{{31,27},{34,31},{33,35},{31,38},{31,41},{33,43},{31,42},{30,38},{28,33}},'robeL');line(a,33,34,31,38,'robeHi')
 poly(a,{{31,43},{34,43},{35,46},{33,48},{31,46}},'skin');p(a,32,44,'skinL');line(a,34,45,33,46,'skinM')
 local b=L.body
 shape(b,{{19,24},{23,23},{28,23},{31,26},{33,32},{32,40},{34,49},{31,53},{25,52},{22,53},{16,52},{14,49},{18,40},{17,32}},'robe','edge')
 poly(b,{{21,27},{24,26},{28,26},{30,30},{30,38},{32,48},{29,51},{25,50},{22,52},{16,51},{19,41},{18,32}},'robeM')
 poly(b,{{17,28},{21,25},{25,29},{23,35},{21,40},{18,49},{15,50},{17,40}},'robe');poly(b,{{29,28},{32,31},{31,39},{33,48},{30,50},{27,40}},'robeD')
 poly(b,{{22,29},{24,30},{24,34},{22,37},{20,35}},'under');poly(b,{{23,30},{24,31},{23,33},{22,33}},'underS');line(b,29,42,31,47,'robeL')
 local beard=L.beard_moustache
 poly(beard,{{21,16},{23,17},{24,18},{25,17},{28,16},{29,18},{28,21},{27,24},{25,27},{23,25},{21,22},{20,19}},'hairD')
 poly(beard,{{22,19},{24,20},{25,19},{27,19},{27,22},{25,25},{24,24},{22,22}},'hair');line(beard,23,21,24,23,'hairM');line(beard,26,21,25,23,'hairL')
 poly(beard,{{21,16},{24,16},{25,18},{23,19},{21,18}},'hairD');poly(beard,{{25,18},{27,16},{29,17},{28,19},{25,19}},'hairD');line(beard,22,17,24,17,'hairL')
 local hf=L.hair_front
 poly(hf,{{18,12},{19,9},{22,7},{27,7},{30,9},{32,12},{31,14},{28,12},{26,13},{24,11},{22,13},{20,15}},'hair')
 poly(hf,{{20,10},{23,8},{27,8},{29,10},{27,10},{25,11},{23,10}},'hairM');line(hf,21,10,23,9,'hairL')
 poly(hf,{{18,12},{20,12},{21,17},{19,20},{17,17}},'hairD');poly(hf,{{29,12},{31,13},{30,17},{28,19},{27,16}},'hairD')
 local m=L.facial_features
 line(m,21,12,23,12,'hairD');line(m,27,12,29,13,'hairD');line(m,21,14,23,14,'ink');line(m,27,14,29,14,'ink');p(m,22,14,'skinL');p(m,28,14,'skinL');p(m,25,15,'skinM');p(m,25,16,'skinL');line(m,22,17,24,17,'hair');line(m,25,17,27,17,'hairD');p(m,24,18,'hairL')
 local t=L.robe_trim
 poly(t,{{20,23},{23,23},{27,27},{31,30},{29,32},{25,29},{21,26}},'underL');poly(t,{{30,23},{27,23},{23,27},{19,30},{21,32},{26,28},{29,27}},'robeL');line(t,20,24,24,28,'gold')
 line(t,16,39,24,40,'belt');line(t,24,40,32,39,'belt');line(t,16,41,24,42,'beltL');line(t,24,42,32,41,'belt');poly(t,{{23,39},{26,39},{27,41},{25,43},{22,42}},'gold');p(t,25,40,'goldL')
 line(t,18,46,17,49,'robeHi');line(t,29,45,31,49,'underS');line(t,16,52,20,53,'gold');line(t,28,52,32,52,'gold')
end
local function profile()
 local h=L.hair_back
 shape(h,{{20,10},{23,7},{28,7},{31,10},{32,14},{30,18},{28,21},{27,25},{24,29},{21,30},{18,28},{20,24},{18,21},{17,16}},'hairD','ink')
 poly(h,{{21,11},{24,9},{28,9},{30,12},{29,16},{27,20},{25,24},{22,27},{20,26},{22,21},{20,18}},'hairM');line(h,22,12,25,10,'hairL');poly(h,{{20,21},{22,22},{20,27},{18,29},{17,27}},'hair')
 knot(h,25,6)
 local f=L.face
 shape(f,{{23,10},{26,9},{29,10},{31,12},{32,14},{33,15},{32,16},{31,17},{30,19},{28,21},{25,22},{22,20},{21,17},{21,13}},'skin','edge')
 poly(f,{{24,11},{27,10},{29,11},{30,13},{31,14},{32,15},{30,15},{29,17},{27,19},{24,18},{22,16}},'skinL');p(f,31,15,'skinM');line(f,29,18,30,18,'skinD')
 poly(f,{{24,20},{28,20},{28,25},{25,27},{22,24}},'skinM')
 local r=L.robe_back
 shape(r,{{23,24},{27,23},{31,25},{33,30},{33,38},{31,44},{32,51},{30,54},{20,54},{18,51},{21,44},{21,37},{20,30}},'robeD','edge')
 poly(r,{{25,26},{29,27},{31,31},{30,39},{29,44},{30,51},{27,53},{22,52},{24,43},{23,35}},'robe');line(r,24,31,25,39,'robeL');line(r,29,43,28,49,'robeD')
 local legs=L.legs_boots
 shape(legs,{{23,49},{27,49},{27,57},{25,59},{22,58},{22,55}},'pant','ink');line(legs,23,52,25,55,'pantL');shape(legs,{{28,49},{32,49},{33,56},{36,59},{34,61},{28,59},{27,56}},'pant','ink');line(legs,29,52,31,55,'pantL')
 shape(legs,{{21,56},{26,56},{26,60},{24,62},{19,61},{19,59}},'boot','ink');line(legs,21,60,24,60,'bootL');shape(legs,{{29,56},{34,56},{37,60},{36,62},{30,61},{28,59}},'boot','ink');line(legs,31,60,35,60,'bootL')
 local a=L.sleeves
 poly(a,{{22,26},{24,27},{24,33},{22,37},{20,38},{19,36},{21,32}},'robeD');line(a,20,32,22,29,'robeL')
 shape(a,{{28,25},{32,27},{35,31},{35,36},{33,39},{33,42},{35,44},{33,46},{31,44},{31,40},{29,37},{27,32}},'robeD','edge');poly(a,{{31,28},{34,32},{33,36},{32,39},{32,42},{34,44},{32,43},{31,39},{29,34}},'robeL')
 poly(a,{{32,43},{35,43},{36,46},{34,48},{32,46}},'skin');p(a,33,44,'skinL')
 local b=L.body
 shape(b,{{23,24},{28,23},{32,26},{34,31},{33,39},{34,49},{31,53},{20,53},{19,51},{22,43},{21,35},{21,29}},'robe','edge')
 poly(b,{{26,26},{30,27},{32,31},{31,40},{32,50},{29,52},{23,51},{25,42},{24,34}},'robeM');poly(b,{{22,27},{26,26},{28,30},{26,35},{24,41},{23,49},{20,50},{22,40}},'robe');poly(b,{{30,30},{33,33},{31,41},{33,49},{30,51},{28,41}},'robeD')
 local beard=L.beard_moustache
 poly(beard,{{24,16},{26,17},{27,18},{29,17},{30,18},{29,21},{27,24},{25,26},{23,24},{22,21},{22,18}},'hairD');poly(beard,{{24,19},{26,20},{28,19},{28,22},{26,24},{24,22}},'hair');line(beard,25,21,26,23,'hairM');poly(beard,{{23,16},{26,16},{27,18},{25,19},{23,18}},'hairD');poly(beard,{{27,18},{29,16},{31,18},{29,19}},'hairD')
 local hf=L.hair_front
 poly(hf,{{22,12},{23,9},{26,7},{30,8},{32,11},{32,13},{30,13},{28,11},{26,13},{24,12}},'hair');poly(hf,{{24,10},{27,8},{30,10},{28,10},{26,11}},'hairM');line(hf,25,9,27,8,'hairL');poly(hf,{{22,12},{24,12},{24,17},{22,20},{21,17}},'hairD')
 local m=L.facial_features
 line(m,27,12,29,12,'hairD');line(m,27,14,29,14,'ink');p(m,28,14,'skinL');p(m,32,15,'skinM');p(m,31,16,'skinL');line(m,27,17,29,17,'hair');p(m,28,18,'hairL')
 local t=L.robe_trim
 poly(t,{{23,24},{26,24},{30,28},{34,30},{32,32},{28,30},{24,27}},'underL');line(t,23,25,27,29,'gold');line(t,21,39,28,40,'belt');line(t,21,41,28,42,'beltL');poly(t,{{27,39},{30,40},{29,42},{27,42}},'gold');line(t,24,46,23,50,'robeHi');line(t,21,52,24,53,'gold');line(t,29,52,32,52,'gold')
end
local function threeQuarter()
 local h=L.hair_back
 shape(h,{{19,12},{20,9},{23,6},{28,5},{32,7},{34,10},{35,15},{33,19},{31,23},{28,26},{25,24},{22,22},{20,19},{18,16}},'hairD','ink')
 poly(h,{{21,12},{23,9},{27,8},{31,9},{33,12},{33,16},{30,20},{27,22},{24,20},{21,17}},'hairM');line(h,22,12,25,9,'hairL');poly(h,{{20,18},{22,20},{21,25},{18,28},{17,26}},'hair');poly(h,{{30,19},{32,20},{33,23},{31,26},{29,23}},'hairD');knot(h,26,6)
 local f=L.face
 shape(f,{{22,10},{25,8},{29,9},{32,11},{34,14},{34,16},{32,18},{30,20},{27,21},{24,20},{21,18},{20,14}},'skin','edge')
 poly(f,{{24,10},{28,9},{31,11},{32,13},{32,14},{30,15},{26,14},{22,13}},'skinL');poly(f,{{21,13},{22,12},{22,17},{24,19},{22,18}},'skinM');poly(f,{{33,14},{33,16},{31,18},{30,19}},'skinM');poly(f,{{24,20},{29,20},{29,25},{26,27},{23,24}},'skinM')
 local r=L.robe_back
 shape(r,{{22,24},{27,22},{32,24},{36,28},{38,34},{36,41},{35,45},{36,51},{33,54},{19,54},{16,51},{20,43},{18,36},{19,29}},'robeD','edge')
 poly(r,{{25,25},{30,25},{34,28},{35,34},{32,42},{34,50},{30,53},{25,51},{21,53},{18,51},{22,43},{20,35}},'robe');poly(r,{{20,31},{22,29},{23,40},{20,49},{19,50}},'robeL');poly(r,{{33,31},{36,34},{33,41},{30,46},{30,37}},'robeD')
 local legs=L.legs_boots
 shape(legs,{{21,49},{25,49},{25,56},{23,59},{20,58},{19,55}},'pant','ink');line(legs,20,52,23,55,'pantL');shape(legs,{{29,49},{33,49},{34,56},{32,59},{28,58},{27,55}},'pant','ink');line(legs,29,52,32,55,'pantL')
 shape(legs,{{19,55},{24,55},{24,59},{22,61},{17,60},{16,59}},'boot','ink');line(legs,18,59,22,59,'bootL');shape(legs,{{29,55},{34,55},{37,59},{36,61},{30,60},{28,59}},'boot','ink');line(legs,31,59,35,59,'bootL')
 local a=L.sleeves
 poly(a,{{21,26},{23,27},{23,33},{21,37},{19,38},{18,36},{19,31}},'robeD');line(a,19,32,21,29,'robeL')
 shape(a,{{31,24},{35,26},{38,30},{39,35},{37,39},{36,42},{38,44},{36,46},{34,44},{34,40},{32,37},{29,31}},'robeD','edge');poly(a,{{34,27},{37,31},{37,35},{35,39},{35,42},{37,44},{35,43},{34,39},{31,33}},'robeL')
 poly(a,{{35,43},{38,43},{39,46},{37,48},{35,46}},'skin');p(a,36,44,'skinL')
 local b=L.body
 shape(b,{{22,24},{27,22},{32,24},{36,28},{36,34},{33,41},{35,49},{32,53},{20,53},{18,51},{22,43},{20,35},{20,29}},'robe','edge')
 poly(b,{{26,25},{30,25},{34,28},{34,35},{31,42},{33,49},{30,52},{25,50},{22,52},{20,50},{24,42},{22,34}},'robeM')
 poly(b,{{21,27},{25,25},{29,29},{27,35},{24,41},{22,49},{19,50},{21,40}},'robe');poly(b,{{33,29},{35,32},{32,40},{34,49},{31,51},{28,41}},'robeD')
 poly(b,{{24,28},{27,27},{30,30},{29,33},{26,32}},'under');line(b,25,29,28,31,'underS');line(b,23,43,21,48,'robeHi');line(b,31,43,33,48,'robeL')
 local beard=L.beard_moustache
 poly(beard,{{23,16},{25,17},{26,18},{28,17},{30,16},{31,18},{30,21},{28,24},{26,27},{24,25},{22,22},{22,19}},'hairD');poly(beard,{{24,19},{26,20},{28,19},{29,21},{27,24},{25,23}},'hair');line(beard,25,21,26,23,'hairM');poly(beard,{{22,16},{25,16},{26,18},{24,19},{22,18}},'hairD');poly(beard,{{27,18},{30,16},{32,18},{29,19}},'hairD')
 local hf=L.hair_front
 poly(hf,{{20,12},{21,9},{24,7},{28,7},{32,9},{34,12},{34,14},{31,13},{29,11},{27,13},{25,11},{23,14}},'hair');poly(hf,{{22,10},{25,8},{29,8},{31,10},{29,10},{27,11},{25,10}},'hairM');line(hf,23,10,25,8,'hairL');poly(hf,{{20,12},{22,12},{23,17},{21,19},{19,16}},'hairD');poly(hf,{{31,12},{33,13},{32,17},{30,19},{29,16}},'hairD')
 local m=L.facial_features
 line(m,23,12,25,13,'hairD');p(m,24,14,'ink');line(m,29,12,31,13,'hairD');line(m,29,14,31,14,'ink');p(m,30,14,'skinL');p(m,32,15,'skinM');p(m,31,16,'skinL');line(m,25,17,27,17,'hair');line(m,28,17,30,17,'hairD');p(m,27,18,'hairL')
 local t=L.robe_trim
 poly(t,{{22,23},{25,23},{30,27},{35,29},{33,31},{28,29},{24,26}},'underL');poly(t,{{32,23},{29,23},{25,27},{21,30},{23,32},{28,28},{31,27}},'robeL');line(t,22,24,27,28,'gold');line(t,31,25,28,28,'goldL')
 line(t,19,39,26,40,'belt');line(t,26,40,34,39,'belt');line(t,19,41,26,42,'beltL');line(t,26,42,34,41,'belt');poly(t,{{25,39},{28,39},{29,41},{27,43},{24,42}},'gold');p(t,27,40,'goldL');line(t,22,46,20,50,'robeHi');line(t,30,45,32,49,'underS');line(t,19,52,23,53,'gold');line(t,30,52,33,52,'gold')
end
local draw={front,profile,threeQuarter};local tags={'front','profile_east','three_quarter_south_east'}
for fi,fn in ipairs(draw)do local frame=fi==1 and sprite.frames[1]or sprite:newEmptyFrame();frame.duration=1;for _,n in ipairs(names)do L[n]=blank()end;shadow();fn();for _,n in ipairs(names)do sprite:newCel(layers[n],frame,L[n],Point(0,0))end end
for i,n in ipairs(tags)do local tag=sprite:newTag(i,i);tag.name='idle_'..n;tag.aniDir=AniDir.FORWARD;tag.repeats=0 end
sprite:saveAs(output);print('C03 A6.2: three original reference-led poses, 48x64, 11 layers')

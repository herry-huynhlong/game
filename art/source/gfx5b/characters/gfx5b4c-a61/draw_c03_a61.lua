-- C03 A6.1: hand-authored pose redraw in Aseprite Lua.
-- Each facing has its own silhouette, facial profile, sleeves, robe planes and stance.
local output=assert(app.params.output)
local W,H=48,64
local sprite=Sprite(W,H,ColorMode.RGB)
local names={'shadow','hair_back','robe_back','legs_boots','sleeves','body','face','hair_front','facial_features','robe_trim'}
local layers={}
for i,n in ipairs(names) do local layer=i==1 and sprite.layers[1] or sprite:newLayer();layer.name=n;layers[n]=layer end
local L={}
local function color(s)return app.pixelColor.rgba(tonumber(s:sub(2,3),16),tonumber(s:sub(4,5),16),tonumber(s:sub(6,7),16),255)end
local C={
 ink='#29383B',edge='#485B5B',hair='#20292F',hairD='#2B363A',hairM='#3E4D4F',hairL='#657675',hairHi='#879184',
 skin='#E7BEA0',skinL='#F1D3B6',skinM='#C99477',skinD='#A97661',
 inner='#EEE9D9',innerL='#F5F0DE',innerS='#C5D0C4',jade='#5A8983',jadeL='#80A99A',jadeM='#47736F',jadeD='#345B60',jadeX='#2B494F',
 belt='#344A4C',gold='#BE9A58',goldL='#DFC47D',pant='#475C5B',pantL='#637775',boot='#403D39',bootL='#716958',shadow='#34473F',shadowL='#506354'
}
local function blank()return Image(W,H,ColorMode.RGB)end
local function p(im,x,y,c)if x>=0 and x<W and y>=0 and y<H then im:drawPixel(x,y,color(C[c]or c))end end
local function line(im,x0,y0,x1,y1,c)
 local dx,dy=math.abs(x1-x0),math.abs(y1-y0);local sx=x0<x1 and 1 or -1;local sy=y0<y1 and 1 or -1;local e=dx-dy
 while true do p(im,x0,y0,c);if x0==x1 and y0==y1 then break end;local q=2*e;if q>-dy then e=e-dy;x0=x0+sx end;if q<dx then e=e+dx;y0=y0+sy end end
end
local function poly(im,pts,c)
 local lo,hi=H,0;for _,v in ipairs(pts)do lo=math.min(lo,v[2]);hi=math.max(hi,v[2])end
 for y=lo,hi do local xs={};for i,v in ipairs(pts)do local n=pts[i%#pts+1];if(v[2]<=y and n[2]>y)or(n[2]<=y and v[2]>y)then xs[#xs+1]=v[1]+(y-v[2])*(n[1]-v[1])/(n[2]-v[2])end end;table.sort(xs);for i=1,#xs-1,2 do for x=math.ceil(xs[i]),math.floor(xs[i+1])do p(im,x,y,c)end end end
end
local function shape(im,pts,fill,edge)poly(im,pts,edge);poly(im,pts,fill)end
local function drawShadow()
 poly(L.shadow,{{14,58},{18,56},{24,55},{30,56},{34,58},{31,60},{24,61},{17,60}},'shadow');line(L.shadow,19,58,23,57,'shadowL');line(L.shadow,27,58,30,58,'shadowL')
end
local function front()
 local h=L.hair_back
 shape(h,{{17,13},{17,9},{20,6},{25,5},{30,7},{32,11},{31,17},{33,22},{31,27},{28,30},{26,25},{23,22},{20,26},{17,30},{14,27},{16,21},{15,16}},'hairD','ink')
 poly(h,{{19,14},{20,10},{23,8},{27,8},{29,11},{29,16},{27,21},{25,24},{23,20},{21,23},{18,27},{18,21}},'hairM')
 poly(h,{{17,19},{19,20},{18,25},{15,28},{14,26}},'hair');line(h,17,21,16,25,'hairL')
 poly(h,{{28,19},{31,20},{33,24},{31,27},{28,24}},'hairD');line(h,31,22,32,24,'hairL')
 -- compact topknot wrapped by a jade-dark tie
 shape(h,{{22,7},{22,4},{24,2},{27,3},{28,6},{26,8}},'hairM','ink');line(h,23,4,25,3,'hairHi');line(h,23,6,26,6,'gold')
 local f=L.face
 shape(f,{{20,10},{22,8},{26,8},{29,10},{30,13},{29,17},{27,20},{24,21},{21,20},{19,17},{19,13}},'skin','edge')
 poly(f,{{21,11},{23,9},{26,9},{28,11},{28,13},{25,14},{21,13}},'skinL')
 poly(f,{{19,13},{20,12},{20,16},{21,18},{20,17}},'skinM');poly(f,{{29,13},{30,14},{29,17},{28,18}},'skinM')
 poly(f,{{22,20},{27,20},{27,25},{24,27},{22,24}},'skinM');poly(f,{{23,21},{26,21},{26,24},{24,25},{23,24}},'skin')
 -- Fine brows and calm eyes: one-pixel pupils sit under a soft brow, not dots alone.
 line(f,21,13,23,12,'hairD');line(f,26,12,28,13,'hairD');line(f,21,14,23,14,'ink');line(f,26,14,28,14,'ink');p(f,22,14,'skinL');p(f,27,14,'skinL')
 p(f,24,15,'skinM');p(f,24,16,'skinL');line(f,23,18,25,18,'skinD');p(f,24,19,'skinM')
 local back=L.robe_back
 shape(back,{{19,24},{23,22},{28,22},{32,24},{35,29},{35,38},{32,44},{34,51},{31,54},{17,54},{13,51},{16,44},{15,37},{16,29}},'jadeD','edge')
 poly(back,{{20,27},{24,25},{28,25},{31,28},{32,37},{29,44},{32,51},{28,53},{23,51},{19,53},{15,51},{18,43},{17,36}},'jadeM')
 poly(back,{{17,31},{19,29},{19,41},{16,49},{15,50}},'jadeL');poly(back,{{31,30},{34,33},{32,40},{29,44},{29,37}},'jadeX')
 line(back,19,45,17,49,'jadeL');line(back,30,46,31,50,'jadeD')
 local legs=L.legs_boots
 shape(legs,{{18,49},{23,49},{23,56},{21,59},{17,59},{16,57}},'pant','ink');poly(legs,{{19,51},{22,51},{21,56},{18,57}},'pantL')
 shape(legs,{{26,49},{31,49},{32,56},{29,59},{26,58},{25,55}},'pant','ink');poly(legs,{{27,51},{30,52},{30,56},{27,56}},'pantL')
 shape(legs,{{16,56},{22,56},{22,60},{20,61},{15,61},{14,60}},'boot','ink');line(legs,16,59,20,59,'bootL')
 shape(legs,{{26,56},{31,56},{33,60},{32,61},{26,61},{24,60}},'boot','ink');line(legs,27,59,31,59,'bootL')
 local a=L.sleeves
 -- relaxed arms hang close to the ribs; the wrists turn inward and hands are small.
 shape(a,{{19,24},{16,25},{13,28},{13,33},{15,36},{16,40},{16,43},{18,44},{20,42},{19,39},{21,35},{22,30}},'jadeD','edge')
 poly(a,{{17,27},{15,30},{15,34},{17,37},{17,40},{16,42},{15,39},{14,35},{14,30}},'jadeL');line(a,15,35,17,37,'jade')
 poly(a,{{15,42},{18,42},{18,45},{17,47},{15,46},{14,44}},'skin');p(a,15,43,'skinL');line(a,17,44,16,45,'skinM')
 shape(a,{{29,24},{32,25},{35,28},{35,33},{33,36},{33,40},{34,43},{32,44},{31,42},{31,39},{28,35},{27,30}},'jadeD','edge')
 poly(a,{{31,27},{34,30},{34,33},{32,36},{32,40},{33,42},{32,41},{31,37},{28,32}},'jadeL');line(a,33,35,32,38,'jade')
 poly(a,{{32,42},{35,42},{35,45},{33,47},{31,45}},'skin');p(a,33,43,'skinL');line(a,34,44,33,45,'skinM')
 local b=L.body
 shape(b,{{19,24},{23,23},{28,23},{31,25},{33,31},{32,39},{34,49},{31,53},{25,52},{22,53},{16,52},{14,49},{18,40},{17,32}},'inner','edge')
 poly(b,{{20,26},{24,25},{28,25},{30,28},{30,37},{32,48},{29,51},{25,50},{22,52},{16,51},{19,41},{18,32}},'innerL')
 poly(b,{{17,28},{21,25},{25,29},{23,34},{21,39},{18,49},{15,50},{17,40}},'jade');poly(b,{{29,27},{32,30},{31,38},{33,48},{30,50},{27,40},{28,34}},'jadeD')
 poly(b,{{22,30},{25,32},{24,38},{21,43},{19,47},{18,47},{21,39}},'innerS');line(b,29,42,31,47,'jadeL')
 local t=L.robe_trim
 poly(t,{{20,23},{23,23},{27,27},{31,30},{29,32},{25,29},{21,26}},'innerL');poly(t,{{30,23},{27,23},{23,27},{19,30},{21,32},{26,28},{29,27}},'jadeL')
 line(t,20,24,24,28,'gold');line(t,29,25,26,28,'goldL')
 line(t,16,39,24,40,'belt');line(t,24,40,32,39,'belt');line(t,16,40,24,41,'gold');line(t,24,41,32,40,'gold');poly(t,{{23,39},{25,39},{27,41},{25,42},{23,41}},'gold');p(t,25,40,'goldL')
 line(t,18,45,17,49,'jadeL');line(t,29,44,30,48,'innerS');line(t,16,52,20,53,'gold');line(t,28,52,32,52,'gold')
 local hf=L.hair_front
 poly(hf,{{19,12},{19,9},{22,7},{26,7},{29,9},{30,12},{28,13},{26,11},{24,13},{22,11},{20,14}},'hair')
 poly(hf,{{20,10},{22,8},{25,8},{27,9},{25,10},{23,10},{21,12}},'hairM');line(hf,21,9,23,8,'hairL');line(hf,27,10,28,11,'hairD')
 poly(hf,{{19,12},{21,12},{21,17},{19,19},{18,16}},'hairD');poly(hf,{{28,12},{30,13},{29,17},{28,19},{27,16}},'hair')
 line(hf,19,14,19,16,'hairL');line(hf,29,14,29,16,'hairM')
end
local function profile()
 local h=L.hair_back
 -- compact nape locks; the rear contour is rounded and tied into separate locks.
 shape(h,{{20,10},{23,7},{27,7},{30,9},{31,13},{30,17},{28,20},{26,24},{24,28},{21,30},{18,28},{20,24},{18,21},{17,16}},'hairD','ink')
 poly(h,{{21,11},{24,9},{27,9},{29,11},{29,15},{27,19},{25,23},{22,27},{20,26},{22,21},{20,18}},'hairM');line(h,22,12,24,10,'hairL')
 poly(h,{{20,20},{22,22},{20,27},{18,29},{17,27}},'hair');line(h,19,24,18,27,'hairL')
 shape(h,{{23,8},{24,5},{27,4},{30,6},{29,9},{26,10}},'hairM','ink');line(h,25,6,27,5,'hairHi');line(h,24,8,28,8,'gold')
 local f=L.face
 -- Short, quiet profile: forehead, tiny bridge/tip, closed mouth, soft chin.
 shape(f,{{22,10},{25,9},{28,10},{30,12},{31,14},{33,15},{32,16},{31,17},{31,19},{29,21},{26,22},{23,20},{21,17},{21,13}},'skin','edge')
 poly(f,{{23,11},{26,10},{28,11},{29,13},{30,14},{31,15},{29,15},{28,17},{27,19},{24,18},{22,16}},'skinL')
 p(f,30,15,'skinM');p(f,31,15,'skinL');line(f,29,18,30,18,'skinD');p(f,29,19,'skinM')
 poly(f,{{24,20},{28,20},{28,25},{25,27},{22,24}},'skinM');poly(f,{{25,21},{27,21},{27,24},{25,25}},'skin')
 local back=L.robe_back
 shape(back,{{23,24},{27,23},{30,25},{32,30},{32,39},{31,45},{31,52},{29,54},{20,54},{18,52},{21,44},{21,37},{20,30}},'jadeD','edge')
 poly(back,{{25,26},{29,27},{30,33},{29,42},{29,51},{27,53},{22,52},{24,43},{23,35}},'jadeM');line(back,24,31,25,39,'jadeL');line(back,29,42,28,49,'jadeX')
 local legs=L.legs_boots
 shape(legs,{{23,49},{27,49},{27,57},{25,59},{22,58},{22,55}},'pant','ink');line(legs,23,52,25,54,'pantL')
 shape(legs,{{28,49},{31,49},{32,56},{35,59},{34,60},{28,59},{27,56}},'pant','ink');line(legs,29,52,30,55,'pantL')
 shape(legs,{{21,56},{26,56},{26,60},{24,61},{20,61},{19,60}},'boot','ink');line(legs,21,59,24,59,'bootL')
 shape(legs,{{29,56},{33,56},{36,59},{35,61},{29,61},{28,59}},'boot','ink');line(legs,30,59,34,59,'bootL')
 local a=L.sleeves
 -- Far sleeve is mostly hidden behind the torso; the near sleeve hangs along the front.
 poly(a,{{22,26},{24,27},{24,32},{23,36},{21,38},{20,36},{21,32}},'jadeX');line(a,21,31,22,29,'jadeL')
 shape(a,{{28,25},{31,27},{33,31},{33,35},{31,38},{31,41},{32,43},{30,45},{28,42},{28,38},{27,34}},'jadeD','edge')
 poly(a,{{30,28},{32,32},{32,35},{30,38},{30,41},{31,43},{29,41},{29,37},{28,33}},'jadeL');line(a,31,35,30,38,'jade')
 poly(a,{{30,42},{33,42},{33,45},{31,47},{29,45}},'skin');p(a,31,43,'skinL');line(a,32,44,31,45,'skinM')
 local b=L.body
 shape(b,{{23,24},{28,23},{31,26},{32,31},{31,39},{32,49},{30,53},{20,53},{19,51},{22,43},{22,35},{21,29}},'inner','edge')
 poly(b,{{25,26},{29,26},{30,31},{29,40},{30,50},{28,52},{22,51},{25,42},{24,34}},'innerL')
 poly(b,{{23,27},{26,26},{28,29},{27,34},{25,40},{23,49},{21,50},{23,40}},'jade');poly(b,{{29,29},{31,32},{30,40},{31,49},{29,51},{27,41}},'jadeD')
 line(b,24,33,26,35,'innerS');line(b,24,43,22,48,'innerS');line(b,29,43,30,48,'jadeL')
 local t=L.robe_trim
 poly(t,{{23,24},{26,24},{29,27},{32,29},{30,31},{27,29},{24,27}},'innerL');line(t,23,25,27,29,'gold');line(t,29,30,28,36,'jadeX')
 line(t,21,39,27,40,'belt');line(t,21,40,27,41,'gold');poly(t,{{27,39},{29,39},{30,41},{28,42},{26,41}},'gold');p(t,28,40,'goldL')
 line(t,24,45,23,49,'jadeL');line(t,21,52,24,52,'gold');line(t,28,52,30,52,'gold')
 local hf=L.hair_front
 poly(hf,{{22,12},{22,9},{25,7},{28,8},{30,10},{31,12},{30,13},{28,12},{26,13},{24,12},{23,14}},'hair')
 poly(hf,{{23,10},{25,8},{28,9},{29,10},{27,10},{25,11}},'hairM');line(hf,24,9,26,8,'hairL')
 poly(hf,{{22,12},{24,12},{24,17},{22,20},{21,17}},'hairD');line(hf,22,15,22,17,'hairL')
 local m=L.facial_features
 line(m,26,13,28,13,'hairD');line(m,27,14,28,14,'ink');p(m,30,15,'skinM');p(m,31,15,'skinL');line(m,29,18,30,18,'skinD')
end
local function threeQuarter()
 local h=L.hair_back
 shape(h,{{20,12},{21,9},{24,6},{28,5},{32,7},{34,10},{34,15},{32,19},{30,23},{27,26},{24,24},{22,21},{20,19},{19,16}},'hairD','ink')
 poly(h,{{22,12},{24,9},{28,8},{31,9},{32,12},{32,16},{30,19},{27,22},{25,21},{23,18},{21,16}},'hairM');line(h,23,12,25,9,'hairL')
 poly(h,{{21,18},{23,20},{22,25},{20,28},{19,26}},'hair');poly(h,{{29,18},{31,20},{32,23},{30,26},{28,23}},'hairD')
 shape(h,{{25,7},{25,4},{28,2},{31,4},{31,7},{29,9}},'hairM','ink');line(h,26,5,28,4,'hairHi');line(h,26,7,30,7,'gold')
 local f=L.face
 shape(f,{{22,10},{25,8},{29,9},{32,11},{33,14},{33,16},{31,18},{29,20},{26,21},{23,20},{21,18},{21,14}},'skin','edge')
 poly(f,{{24,10},{27,9},{30,10},{31,12},{31,14},{29,15},{25,14},{22,13}},'skinL')
 poly(f,{{22,13},{23,12},{23,17},{25,19},{23,18}},'skinM');poly(f,{{32,13},{32,16},{30,18},{29,19}},'skinM')
 poly(f,{{25,20},{30,20},{30,25},{27,27},{24,24}},'skinM');poly(f,{{26,21},{29,21},{29,24},{27,25}},'skin')
 -- Far eye is partly covered by the fringe; the near eye and cheek plane lead the turn.
 line(f,23,13,24,13,'hairD');p(f,24,14,'ink');line(f,28,12,30,13,'hairD');line(f,28,14,30,14,'ink');p(f,29,14,'skinL');p(f,31,15,'skinM');p(f,30,16,'skinL');line(f,27,18,29,18,'skinD')
 local back=L.robe_back
 shape(back,{{22,24},{27,22},{32,24},{36,28},{37,34},{34,41},{35,50},{32,54},{20,54},{18,51},{22,43},{20,36},{20,29}},'jadeD','edge')
 poly(back,{{26,25},{30,25},{34,28},{34,35},{31,42},{33,50},{30,53},{25,51},{22,53},{20,50},{24,42},{22,34}},'jadeM')
 poly(back,{{20,31},{22,29},{23,40},{20,49},{19,50}},'jadeL');poly(back,{{33,31},{35,34},{33,41},{30,46},{30,37}},'jadeX')
 local legs=L.legs_boots
 shape(legs,{{21,49},{24,49},{24,56},{22,59},{19,58},{19,55}},'pant','ink');line(legs,20,52,22,55,'pantL')
 shape(legs,{{28,49},{32,49},{33,55},{31,59},{27,58},{26,55}},'pant','ink');line(legs,29,52,31,55,'pantL')
 shape(legs,{{18,55},{23,55},{23,59},{21,60},{17,60},{16,59}},'boot','ink');line(legs,18,58,21,58,'bootL')
 shape(legs,{{28,55},{33,55},{35,59},{34,60},{28,60},{26,59}},'boot','ink');line(legs,29,58,33,58,'bootL')
 local a=L.sleeves
 -- Far arm is a narrow glimpse at the left; the near arm falls in front at right.
 poly(a,{{20,26},{22,27},{22,32},{20,36},{18,37},{17,35},{18,31}},'jadeX');line(a,18,32,20,29,'jadeL')
 shape(a,{{31,24},{35,25},{38,29},{39,34},{37,38},{36,41},{37,43},{35,45},{33,43},{33,40},{32,36},{30,32}},'jadeD','edge')
 poly(a,{{34,27},{37,31},{37,34},{35,38},{35,41},{36,43},{34,41},{34,37},{32,33}},'jadeL');line(a,37,34,35,38,'jade')
 poly(a,{{34,42},{37,42},{37,45},{35,47},{33,45}},'skin');p(a,35,43,'skinL');line(a,36,44,35,45,'skinM')
 local b=L.body
 shape(b,{{22,24},{27,22},{32,24},{35,28},{35,34},{32,41},{34,49},{32,53},{20,53},{19,51},{23,43},{21,35},{20,29}},'inner','edge')
 poly(b,{{26,25},{30,25},{33,28},{33,35},{30,42},{32,49},{30,52},{25,50},{22,52},{20,50},{24,42},{22,34}},'innerL')
 poly(b,{{21,27},{25,25},{28,29},{26,35},{24,40},{22,49},{19,50},{21,40}},'jade');poly(b,{{32,29},{34,32},{31,40},{33,49},{30,51},{28,41}},'jadeD')
 line(b,24,32,27,35,'innerS');line(b,23,43,21,48,'innerS');line(b,30,43,32,48,'jadeL')
 local t=L.robe_trim
 poly(t,{{22,23},{25,23},{30,27},{35,29},{33,31},{28,29},{24,26}},'innerL');poly(t,{{32,23},{29,23},{25,27},{22,30},{24,32},{28,28},{31,27}},'jadeL');line(t,23,24,27,28,'gold');line(t,32,25,29,28,'goldL')
 line(t,20,39,26,40,'belt');line(t,26,40,34,39,'belt');line(t,20,40,26,41,'gold');line(t,26,41,34,40,'gold');poly(t,{{26,39},{28,39},{29,41},{27,42},{25,41}},'gold');p(t,27,40,'goldL')
 line(t,23,45,21,49,'jadeL');line(t,30,44,32,48,'innerS');line(t,20,52,23,52,'gold');line(t,30,52,33,52,'gold')
 local hf=L.hair_front
 poly(hf,{{21,12},{22,9},{25,7},{29,8},{32,10},{34,13},{33,14},{30,12},{28,11},{26,13},{24,11},{22,14}},'hair')
 poly(hf,{{23,10},{25,8},{29,9},{31,10},{29,10},{27,11},{25,10}},'hairM');line(hf,24,9,26,8,'hairL')
 poly(hf,{{21,12},{23,12},{24,17},{22,19},{20,16}},'hairD');poly(hf,{{31,12},{33,13},{32,17},{30,19},{29,16}},'hairD')
 local m=L.facial_features
 line(m,23,13,24,13,'hairD');p(m,24,14,'ink');line(m,28,12,30,13,'hairD');line(m,28,14,30,14,'ink');p(m,29,14,'skinL');p(m,31,15,'skinM');p(m,30,16,'skinL');line(m,27,18,29,18,'skinD')
end
local draw={front,profile,threeQuarter};local tags={'front','profile_east','three_quarter_south_east'}
for fi,fn in ipairs(draw)do local frame=fi==1 and sprite.frames[1]or sprite:newEmptyFrame();frame.duration=1.0;for _,n in ipairs(names)do L[n]=blank()end;drawShadow();fn();for _,n in ipairs(names)do sprite:newCel(layers[n],frame,L[n],Point(0,0))end end
for i,n in ipairs(tags)do local tag=sprite:newTag(i,i);tag.name='idle_'..n;tag.aniDir=AniDir.FORWARD;tag.repeats=0 end
sprite:saveAs(output)
print('C03 A6.1: three redrawn poses, 48x64, 10 editable layers, 3 tags')

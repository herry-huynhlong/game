-- Aseprite script: first hand-positioned study, not yet approved for runtime.
local sprite=Sprite(112,96,ColorMode.RGB)
local names={'shadow','roots_and_trunk','branches','foliage_dark','foliage_mid','foliage_light','bark_details','wounds','debris'}
local layers={}
for i,name in ipairs(names) do local l=i==1 and sprite.layers[1] or sprite:newLayer();l.name=name;layers[i]=l end
local function c(r,g,b,a) return app.pixelColor.rgba(r,g,b,a or 255) end
local palette={shadow=c(22,43,35,80),outline=c(29,42,31),bark0=c(51,45,32),bark1=c(82,61,40),bark2=c(113,80,48),bark3=c(157,116,68),bark4=c(188,153,95),leaf0=c(25,55,39),leaf1=c(36,77,49),leaf2=c(52,101,57),leaf3=c(78,126,69),leaf4=c(115,153,82),leaf5=c(158,177,103),cut0=c(75,36,29),cut1=c(212,164,92),cut2=c(245,202,130)}
local function poly(im,vertices,color)
 local miny,maxy=96,0
 for _,p in ipairs(vertices) do miny=math.min(miny,p[2]);maxy=math.max(maxy,p[2]) end
 for y=miny,maxy do
  local intersections={}
  for i=1,#vertices do local p,q=vertices[i],vertices[i%#vertices+1];if (p[2]<=y and q[2]>y) or (q[2]<=y and p[2]>y) then intersections[#intersections+1]=p[1]+(y-p[2])*(q[1]-p[1])/(q[2]-p[2]) end end
  table.sort(intersections)
  for i=1,#intersections-1,2 do for x=math.ceil(intersections[i]),math.floor(intersections[i+1]) do if x>=0 and x<112 and y>=0 and y<96 then im:drawPixel(x,y,color) end end end
 end
end
local function path(im,points,color)
 for i=1,#points-1 do
  local a,b=points[i],points[i+1];local x,y=a[1],a[2];local dx,dy=math.abs(b[1]-x),math.abs(b[2]-y);local sx=x<b[1] and 1 or -1;local sy=y<b[2] and 1 or -1;local err=dx-dy
  while true do if x>=0 and y>=0 and x<112 and y<96 then im:drawPixel(x,y,color) end;if x==b[1] and y==b[2] then break end;local e=2*err;if e>-dy then err=err-dy;x=x+sx end;if e<dx then err=err+dx;y=y+sy end end
 end
end
local function image() return Image(112,96,ColorMode.RGB) end
local base={};for i=1,#names do base[i]=image() end
poly(base[1],{{24,87},{34,84},{55,84},{71,87},{82,91},{74,93},{55,91},{39,92},{24,90}},palette.shadow)
poly(base[2],{{23,88},{31,85},{36,80},{38,69},{37,60},{31,51},{28,44},{33,42},{39,50},{42,55},{43,43},{48,40},{52,51},{55,47},{60,40},{65,42},{61,54},{55,62},{56,72},{59,80},{67,85},{77,89},{75,91},{63,89},{57,86},{52,84},{49,90},{46,92},{44,86},{40,84},{35,88},{28,90}},palette.outline)
poly(base[2],{{27,87},{34,83},{39,77},{41,64},{36,53},{33,45},{38,51},{44,60},{46,46},{49,45},{49,61},{56,52},{62,44},{62,50},{54,63},{53,74},{56,82},{64,87},{72,89},{61,87},{54,83},{49,82},{47,89},{45,84},{39,82},{33,87}},palette.bark1)
poly(base[2],{{35,82},{40,76},{42,64},{39,57},{43,62},{46,60},{46,50},{48,48},{49,65},{46,75},{45,82},{40,81}},palette.bark2)
poly(base[2],{{49,64},{54,57},{58,52},{54,62},{52,70},{53,79},{56,83},{50,80},{48,74}},palette.bark0)
local branches={{{41,57},{34,48},{23,44},{17,38}},{{45,52},{43,39},{37,30},{35,23}},{{49,51},{55,39},{64,33},{71,27}},{{54,61},{65,53},{75,51},{80,45}},{{37,51},{31,39},{26,32}}}
for _,v in ipairs(branches) do path(base[3],v,palette.outline);local q={};for _,p in ipairs(v) do q[#q+1]={p[1],p[2]+1} end;path(base[3],q,palette.bark2) end
local clusters={
 {{6,37},{9,30},{15,28},{17,22},{25,21},{28,15},{35,15},{39,11},{46,13},{51,9},{59,12},{64,16},{71,16},{75,21},{81,23},{84,29},{89,32},{88,39},{91,44},{87,50},{81,51},{77,57},{69,56},{65,60},{58,57},{52,61},{45,57},{39,60},{33,56},{26,58},{22,54},{15,54},{13,49},{8,47}},
 {{8,37},{12,31},{18,30},{20,25},{27,25},{31,20},{38,20},{40,15},{47,16},{52,13},{59,16},{62,20},{69,20},{73,25},{80,26},{82,31},{87,34},{85,40},{88,44},{83,48},{77,48},{74,53},{67,52},{63,56},{56,53},{51,56},{44,53},{38,56},{32,52},{25,54},{21,50},{15,50},{14,46},{10,44}}
}
poly(base[4],clusters[1],palette.leaf0);poly(base[4],clusters[2],palette.leaf1)
local islands={
 {{10,37},{14,31},{20,30},{23,25},{30,25},{33,29},{30,35},{25,36},{22,41},{16,40},{13,43},{10,41}},
 {{27,29},{30,23},{37,21},{40,17},{46,18},{49,22},{47,28},{42,30},{39,35},{33,34}},
 {{45,24},{49,18},{53,15},{59,17},{63,22},{69,23},{70,29},{66,34},{59,33},{55,36},{49,32}},
 {{66,30},{69,25},{76,27},{80,31},{85,34},{84,39},{80,42},{75,40},{70,44},{65,40},{62,35}},
 {{17,42},{21,37},{28,36},{32,39},{37,37},{41,42},{39,47},{33,48},{30,51},{24,49},{20,50},{17,47}},
 {{38,41},{42,35},{48,34},{52,37},{57,35},{62,39},{61,46},{56,48},{53,51},{47,48},{42,50},{38,47}},
 {{59,43},{63,38},{69,40},{73,39},{78,43},{77,47},{72,50},{69,53},{63,51},{60,49}}
}
for _,v in ipairs(islands) do poly(base[5],v,palette.leaf2) end
local lights={{{13,34},{18,31},{23,32},{25,29},{29,30},{27,33},{22,35},{18,35},{16,38},{12,38}},{{30,27},{34,23},{39,23},{42,20},{46,21},{45,25},{41,27},{38,30},{33,29}},{{49,22},{53,18},{58,19},{60,22},{64,23},{64,27},{59,28},{55,26},{51,28},{48,26}},{{68,30},{71,27},{75,29},{79,31},{81,34},{78,36},{73,34},{70,36},{66,34}},{{21,40},{26,38},{30,39},{32,42},{29,45},{24,44},{21,46},{19,44}},{{42,40},{46,37},{51,38},{55,37},{58,40},{56,43},{51,43},{47,45},{43,44}},{{65,43},{69,41},{73,42},{75,44},{72,46},{68,45},{65,47},{63,45}}}
for _,v in ipairs(lights) do poly(base[6],v,palette.leaf3) end
local highlights={{{15,33},{19,31},{22,32},{20,34},{16,35}},{{32,25},{36,23},{40,23},{38,25},{34,26}},{{52,20},{55,18},{58,19},{57,21},{53,22}},{{70,30},{73,29},{76,31},{74,32},{71,32}},{{45,39},{49,37},{52,39},{49,40},{46,41}},{{23,40},{26,39},{28,40},{26,42},{23,42}}}
for _,v in ipairs(highlights) do poly(base[6],v,palette.leaf4) end
-- Broken glimpses of older limbs between overlapping foliage, and leaf tips.
path(base[6],{{29,48},{32,45},{35,44},{38,40}},palette.bark0);path(base[6],{{30,48},{33,46},{36,45}},palette.bark3)
path(base[6],{{52,52},{55,47},{59,45},{61,42}},palette.bark0);path(base[6],{{53,52},{56,48},{59,46}},palette.bark2)
for _,p in ipairs({{17,27},{20,26},{25,22},{32,17},{37,19},{43,14},{50,12},{55,15},{62,18},{70,22},{77,28},{82,35},{76,45},{69,48},{58,46},{49,50},{37,49},{25,47},{15,44}}) do
 base[6]:drawPixel(p[1],p[2],palette.leaf4);base[6]:drawPixel(p[1]+1,p[2]-1,palette.leaf3)
end
local marks={{{40,79},{42,72},{42,67}},{{43,61},{41,57},{39,53}},{{45,80},{46,73},{45,69}},{{49,80},{48,74},{49,69}},{{52,80},{51,74},{52,69}},{{35,85},{38,82},{40,80}},{{53,82},{58,85},{63,87}},{{38,75},{39,69},{38,65}},{{30,87},{35,85},{37,83}}}
for _,v in ipairs(marks) do path(base[7],v,palette.bark3) end
path(base[7],{{42,78},{43,73},{43,70}},palette.bark4);path(base[7],{{39,63},{38,60},{37,57}},palette.bark0);path(base[7],{{50,58},{53,54},{55,50}},palette.bark3)
path(base[7],{{37,85},{40,82},{41,79},{42,77}},palette.bark4);path(base[7],{{52,82},{56,85},{62,87}},palette.bark3)
path(base[7],{{43,77},{44,73},{43,70},{44,66},{42,63}},palette.bark0);path(base[7],{{50,76},{50,71},{51,67},{50,63}},palette.bark3)
local slash=image();path(slash,{{39,69},{42,70},{45,69},{49,67},{52,65}},palette.cut0);path(slash,{{40,68},{43,69},{46,68},{50,66},{52,64}},palette.cut1);path(slash,{{41,68},{43,68},{46,67}},palette.cut2)
local severe=image();poly(severe,{{38,69},{42,71},{45,72},{49,70},{53,66},{53,72},{49,76},{44,77},{39,74}},palette.cut0);poly(severe,{{39,69},{43,70},{46,70},{50,68},{52,66},{51,70},{48,73},{44,74},{40,72}},palette.cut1);path(severe,{{40,70},{43,71},{46,71},{49,69}},palette.cut2)
-- Individually positioned break poses, with the stump anchored at (47,83).
-- Coordinates deliberately differ between limb and canopy to convey lag.
local fall={
 {trunk={{45,77},{46,62},{51,49},{56,34},{62,29},{59,43},{55,55},{53,68},{52,77}},canopy={{15,40},{19,31},{27,28},{30,22},{38,20},{43,16},{51,18},{56,14},{64,17},{69,20},{76,20},{80,25},{87,27},{91,34},{90,40},{87,46},{81,47},{76,53},{68,51},{61,55},{54,51},{47,54},{39,50},{31,53},{25,49},{19,49}},light={{23,35},{29,29},{36,28},{41,23},{48,24},{53,20},{60,23},{65,24},{69,29},{74,30},{78,34},{73,38},{67,35},{61,40},{54,37},{49,40},{42,36},{36,40},{30,37},{25,40}},branch={{53,56},{65,44},{77,40}}},
 {trunk={{46,77},{50,65},{59,53},{68,43},{74,41},{70,50},{62,59},{56,69},{53,77}},canopy={{45,42},{48,34},{55,29},{63,27},{70,28},{75,32},{83,33},{88,40},{86,47},{80,50},{76,55},{69,53},{64,58},{56,55},{49,53}},light={{51,37},{57,32},{64,32},{68,30},{74,34},{79,35},{81,39},{76,41},{69,39},{64,43},{58,40},{54,42}},branch={{59,60},{70,52},{83,48}}},
 {trunk={{46,77},{53,69},{65,61},{77,57},{84,58},{79,63},{67,66},{56,75},{52,79}},canopy={{53,54},{58,47},{66,44},{73,44},{78,47},{86,46},{92,51},{92,59},{87,63},{82,64},{78,69},{70,68},{65,71},{57,67},{52,64}},light={{60,52},{65,48},{72,48},{76,51},{83,50},{87,53},{85,56},{79,56},{76,60},{70,58},{65,61},{60,58}},branch={{65,66},{79,64},{90,60}}},
 {trunk={{46,79},{56,75},{68,72},{80,72},{91,75},{89,79},{78,78},{67,79},{55,82},{50,83}},canopy={{54,68},{59,62},{67,60},{73,61},{79,59},{87,62},{94,65},{95,72},{91,77},{84,77},{80,81},{72,78},{66,82},{59,78},{54,77}},light={{60,67},{65,63},{72,64},{77,62},{83,65},{89,65},{91,68},{87,71},{81,70},{76,73},{70,71},{65,74},{60,72}},branch={{61,77},{74,76},{88,72}}}
}
local function stump(im)
 poly(im,{{32,87},{39,83},{40,76},{43,74},{46,77},{49,73},{53,76},{54,82},{60,85},{68,88},{57,88},{51,85},{48,89},{44,87},{39,89},{30,90}},palette.outline)
 poly(im,{{35,87},{41,82},{42,77},{46,79},{49,76},{52,78},{52,83},{58,86},{51,84},{47,88},{44,85},{39,88}},palette.bark2)
 path(im,{{41,77},{44,79},{48,77},{51,76}},palette.cut1)
end
local function canopy_texture(im,points,tone)
 local minx,maxx,miny,maxy=96,0,96,0
 for _,v in ipairs(points) do minx=math.min(minx,v[1]);maxx=math.max(maxx,v[1]);miny=math.min(miny,v[2]);maxy=math.max(maxy,v[2]) end
 local w,h=maxx-minx,maxy-miny
 local groups={{.20,.42},{.35,.28},{.52,.35},{.69,.25},{.78,.48},{.56,.62},{.34,.60}}
 for _,g in ipairs(groups) do local x=math.floor(minx+w*g[1]);local y=math.floor(miny+h*g[2]);path(im,{{x-2,y+1},{x,y-1},{x+3,y-1},{x+4,y}},tone);im:drawPixel(x,y,palette.leaf4) end
end
for n=1,15 do
 local f=n==1 and sprite.frames[1] or sprite:newEmptyFrame();f.duration= n>=4 and n<=8 and .15 or n>=12 and .22 or .25
 for i,l in ipairs(layers) do
  local im=image()
  if n>=12 then
   local sway=({0,1,0,-1})[n-11]
   if i>=4 and i<=6 then im:drawImage(base[i],Point(sway,0)) else im:drawImage(base[i]) end
  elseif n<=3 then im:drawImage(base[i]);if i==8 and n==2 then im:drawImage(slash) elseif i==8 and n==3 then im:drawImage(severe) end
  elseif n==4 then im:drawImage(base[i]);if i==8 then im:drawImage(severe);path(im,{{42,66},{43,63},{45,61},{44,58}},palette.cut0) end
  elseif n<=8 then
   local pose=fall[n-4]
   if i==1 then poly(im,{{32,86},{48,83},{66,84},{78,86},{90,89},{85,91},{67,89},{48,91},{32,89}},palette.shadow)
   elseif i==2 then poly(im,pose.trunk,palette.bark1);path(im,pose.trunk,palette.bark3);stump(im)
   elseif i==3 then path(im,pose.branch,palette.bark2)
   elseif i==4 then poly(im,pose.canopy,palette.leaf1);path(im,pose.canopy,palette.leaf0)
   elseif i==5 then poly(im,pose.light,palette.leaf2)
   elseif i==6 then local q=pose.light;path(im,{q[1],q[2],q[3]},palette.leaf4);canopy_texture(im,pose.canopy,palette.leaf3)
   elseif i==7 then path(im,{pose.trunk[2],pose.trunk[3],pose.trunk[4]},palette.bark3)
   elseif i==9 then local p={{19+n,39+n*4},{25+n,49+n*4},{31+n,56+n*3},{57+n,65+n*2},{63+n,71+n*2}};for k,v in ipairs(p) do if v[2]<95 then im:drawPixel(v[1],v[2],k%2==0 and palette.bark3 or palette.leaf4);im:drawPixel(v[1]+1,v[2],palette.leaf2) end end end
  elseif n<=10 then
   if i==1 then poly(im,{{30,87},{50,84},{69,85},{88,88},{95,91},{75,91},{53,90},{34,91}},palette.shadow)
   elseif i==2 then stump(im);poly(im,{{50,80},{64,77},{79,78},{92,82},{90,86},{78,84},{65,83},{53,85}},palette.bark1);path(im,{{54,81},{67,79},{80,80},{89,83}},palette.bark3)
   elseif i==4 then poly(im,{{62,76},{67,71},{75,70},{80,72},{87,71},{94,76},{95,82},{89,85},{80,83},{74,86},{65,83}},palette.leaf1)
   elseif i==5 then poly(im,{{68,75},{73,72},{80,74},{86,73},{91,76},{89,80},{82,79},{78,82},{71,80},{66,80}},palette.leaf3)
   elseif i==9 and n==9 then path(im,{{58,87},{62,85},{64,87}},palette.cut1);path(im,{{75,88},{79,86},{82,88}},palette.bark4);im:drawPixel(89,88,palette.leaf4) end
  elseif i==2 then stump(im) end
  sprite:newCel(l,f,im,Point(0,0))
 end
end
local output=app.params['output'];assert(output);sprite:saveAs(output)
print('Saved hand-positioned tree study: '..output)

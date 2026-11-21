-- H01 farmhouse: individual pixel strokes, roof/structure/props kept as layers.
local s=Sprite(144,120,ColorMode.RGB);local layers={};for i,n in ipairs({'ground_shadow','foundation','walls','timber','thatched_roof','door_and_windows','wear_and_props'}) do local l=i==1 and s.layers[1] or s:newLayer();l.name=n;layers[i]=l end
local function C(r,g,b,a)return app.pixelColor.rgba(r,g,b,a or 255)end
local k={shadow=C(22,39,32,65),ink=C(51,49,36),darkwood=C(75,53,34),wood=C(110,75,43),woodlight=C(155,109,59),stone0=C(79,94,82),stone=C(125,137,117),stonehi=C(173,177,145),mud0=C(136,119,79),mud=C(191,171,119),mudhi=C(214,196,147),thatch0=C(91,71,39),thatch1=C(133,99,45),thatch2=C(169,130,64),thatch3=C(205,170,90),thatch4=C(225,194,120),black=C(38,36,29),lamp=C(232,183,83)}
local images={};for i=1,#layers do images[i]=Image(144,120,ColorMode.RGB)end
local function line(im,x0,y0,x1,y1,c)local dx,dy=math.abs(x1-x0),math.abs(y1-y0);local sx=x0<x1 and 1 or -1;local sy=y0<y1 and 1 or -1;local e=dx-dy;while true do if x0>=0 and x0<144 and y0>=0 and y0<120 then im:drawPixel(x0,y0,c)end;if x0==x1 and y0==y1 then break end;local q=2*e;if q>-dy then e=e-dy;x0=x0+sx end;if q<dx then e=e+dx;y0=y0+sy end end end
local function poly(im,p,c)local a,b=120,0;for _,v in ipairs(p)do a=math.min(a,v[2]);b=math.max(b,v[2])end;for y=a,b do local xs={};for i,v in ipairs(p)do local n=p[i%#p+1];if(v[2]<=y and n[2]>y)or(n[2]<=y and v[2]>y)then xs[#xs+1]=v[1]+(y-v[2])*(n[1]-v[1])/(n[2]-v[2])end end;table.sort(xs);for i=1,#xs-1,2 do for x=math.ceil(xs[i]),math.floor(xs[i+1])do if x>=0 and x<144 and y>=0 and y<120 then im:drawPixel(x,y,c)end end end end end
local function rect(im,x,y,w,h,c)poly(im,{{x,y},{x+w,y},{x+w,y+h},{x,y+h}},c)end
local function path(im,p,c)for i=1,#p-1 do line(im,p[i][1],p[i][2],p[i+1][1],p[i+1][2],c)end end
poly(images[1],{{15,104},{33,100},{108,100},{124,104},{137,111},{124,114},{106,111},{38,113},{17,110}},k.shadow)
poly(images[2],{{22,94},{116,94},{123,99},{123,106},{112,110},{25,109},{19,105}},k.ink);poly(images[2],{{23,95},{113,95},{119,99},{118,104},{111,107},{25,106},{22,103}},k.stone0);rect(images[2],25,98,87,4,k.stone)
for _,x in ipairs({32,48,66,86,102})do line(images[2],x,100,x+1,104,k.ink);line(images[2],x+2,99,x+10,99,k.stonehi)end
poly(images[3],{{27,48},{110,48},{114,94},{108,98},{27,98},{24,93}},k.darkwood);poly(images[3],{{30,50},{107,50},{108,91},{105,94},{29,94}},k.mud);rect(images[3],31,52,72,4,k.mudhi)
for _,v in ipairs({{30,55,33,90},{106,53,103,90},{55,56,56,92},{83,56,82,91}})do line(images[4],v[1],v[2],v[3],v[4],k.wood);line(images[4],v[1]+1,v[2],v[3]+1,v[4],k.woodlight)end
rect(images[4],26,49,84,5,k.darkwood);line(images[4],29,51,109,51,k.woodlight);rect(images[4],26,90,83,4,k.darkwood)
poly(images[5],{{13,50},{20,42},{28,28},{39,17},{51,13},{91,14},{103,19},{113,29},{124,43},{132,48},{126,54},{115,53},{110,57},{32,56},{25,54},{18,55}},k.ink)
poly(images[5],{{18,48},{25,40},{32,28},{41,20},{51,17},{91,18},{101,22},{110,31},{120,43},{128,48},{123,51},{113,50},{108,53},{33,52},{25,51},{19,52}},k.thatch1)
poly(images[5],{{28,39},{38,25},{47,19},{53,18},{89,19},{99,23},{108,31},{116,42},{106,40},{96,37},{83,35},{67,35},{51,36},{40,39}},k.thatch2)
poly(images[5],{{40,26},{48,20},{54,18},{87,19},{97,22},{103,27},{96,26},{87,24},{75,23},{62,23},{50,25}},k.thatch3)
for _,v in ipairs({{28,43,24,49},{34,37,29,47},{40,31,35,44},{47,26,41,39},{54,22,49,35},{61,21,57,34},{68,20,65,33},{76,20,75,33},{83,21,85,34},{90,22,94,35},{97,25,103,39},{104,29,112,42},{110,37,119,47},{36,44,32,50},{45,41,42,50},{55,38,52,49},{65,37,64,49},{76,37,78,49},{88,38,91,50},{99,40,103,50},{112,45,116,50}})do line(images[5],v[1],v[2],v[3],v[4],k.thatch3)end
path(images[5],{{20,50},{30,51},{41,53},{52,52},{63,53},{75,52},{87,53},{99,52},{111,52},{123,51}},k.thatch0)
rect(images[6],57,53,30,42,k.darkwood);rect(images[6],60,54,25,40,k.black);rect(images[6],62,55,21,37,k.wood);line(images[6],72,55,72,91,k.darkwood);line(images[6],63,57,63,90,k.woodlight);images[6]:drawPixel(78,77,k.lamp)
for _,x in ipairs({35,88})do rect(images[6],x,61,17,16,k.darkwood);rect(images[6],x+2,63,13,12,k.thatch3);line(images[6],x+8,63,x+8,75,k.darkwood);line(images[6],x+2,69,x+14,69,k.darkwood)end
poly(images[7],{{18,96},{23,90},{27,91},{28,99},{23,101}},k.wood);path(images[7],{{19,94},{22,92},{25,93},{26,98}},k.woodlight)
for _,v in ipairs({{34,82,37,84},{44,87,48,88},{92,80,95,82},{99,87,102,87},{35,55,38,56},{93,55,96,57}})do line(images[7],v[1],v[2],v[3],v[4],k.mud0)end
-- Uneven straw fringe and small gaps break the otherwise straight eave.
for _,v in ipairs({{20,51,17,54},{25,52,23,56},{30,52,29,57},{36,53,34,56},{43,53,42,57},{50,54,49,57},{58,53,56,58},{65,54,64,57},{73,53,72,57},{80,54,79,57},{88,53,88,57},{96,53,97,56},{104,53,105,57},{112,52,115,56},{120,51,123,54}})do line(images[7],v[1],v[2],v[3],v[4],k.thatch2)end
for _,v in ipairs({{37,32,34,39},{44,25,42,31},{53,23,51,29},{58,26,56,32},{69,24,68,30},{80,24,81,29},{92,25,94,31},{102,29,105,35},{107,38,111,44},{42,41,39,47},{51,40,48,46},{61,37,59,43},{72,38,72,45},{83,39,85,46},{95,41,98,48}})do line(images[7],v[1],v[2],v[3],v[4],k.thatch4)end
-- Split bamboo fence, leaning broom and clay pot at the edge of the porch.
for _,x in ipairs({10,15,20})do line(images[7],x,84,x-1,101,k.darkwood);line(images[7],x+1,85,x,99,k.woodlight)end
line(images[7],8,89,24,89,k.wood);line(images[7],8,96,24,95,k.darkwood)
line(images[7],112,65,119,94,k.darkwood);line(images[7],113,65,120,92,k.woodlight)
for x=116,123,2 do line(images[7],119,91,x,98,k.thatch2)end
poly(images[7],{{104,97},{106,94},{111,94},{113,97},{112,103},{105,103}},k.darkwood);poly(images[7],{{106,96},{111,96},{111,101},{106,101}},k.wood);line(images[7],106,95,111,95,k.woodlight)
-- Layered sheaves: dark overlaps follow the pitch; varied short strands sit
-- between the seams. All marks are explicitly positioned for this roof.
local roof=images[5]
for _,v in ipairs({{27,43,38,40},{37,37,50,35},{49,32,63,30},{61,28,75,27},{73,29,88,30},{86,32,100,35},{97,37,111,42},{32,47,44,44},{44,43,57,41},{57,40,69,39},{69,40,82,40},{81,41,94,43},{93,44,106,47},{105,47,117,50}})do line(roof,v[1],v[2],v[3],v[4],k.thatch0)end
for _,v in ipairs({{30,43,28,46},{33,41,31,46},{38,39,35,44},{41,37,39,41},{46,34,43,39},{52,32,50,37},{57,30,55,34},{63,28,62,33},{69,28,68,32},{75,28,76,32},{81,29,82,33},{87,31,89,35},{94,33,97,38},{101,36,105,41},{108,40,112,44},{37,46,35,49},{46,44,44,49},{55,42,54,47},{64,41,63,47},{75,41,76,48},{86,43,88,48},{98,45,101,50}})do line(roof,v[1],v[2],v[3],v[4],k.thatch3)end
poly(roof,{{48,18},{54,15},{66,14},{78,15},{89,15},{99,19},{101,22},{89,20},{76,19},{62,19},{53,21}},k.thatch1)
for _,v in ipairs({{53,17,56,20},{60,16,62,19},{68,16,70,19},{77,16,79,19},{85,17,87,20},{93,18,95,21}})do line(roof,v[1],v[2],v[3],v[4],k.thatch4)end
-- Shadow under the overhang, layered planks and timber footings.
poly(images[4],{{28,54},{108,54},{107,60},{31,60}},k.darkwood);line(images[4],30,59,105,59,k.woodlight)
for _,x in ipairs({29,54,84,105})do rect(images[4],x,57,4,36,k.darkwood);line(images[4],x+1,60,x+1,89,k.woodlight);rect(images[7],x-1,91,6,4,k.stone0);line(images[7],x,91,x+4,91,k.stonehi)end
for _,v in ipairs({{32,68,35,71},{32,78,34,82},{52,61,51,66},{55,79,54,84},{86,63,87,67},{86,80,87,86},{103,68,102,74},{31,86,34,88}})do line(images[7],v[1],v[2],v[3],v[4],k.mud0)end
-- Recessed threshold, hand-worked planks, latch and two stone steps.
rect(images[7],59,92,27,3,k.wood);rect(images[7],56,96,34,3,k.stone0);line(images[7],57,96,88,96,k.stonehi);rect(images[7],53,100,40,3,k.stone);line(images[7],55,100,91,100,k.stonehi)
for _,x in ipairs({65,69,75,80})do line(images[7],x,61,x,88,k.darkwood)end
line(images[7],64,84,80,84,k.darkwood);line(images[7],64,85,79,85,k.woodlight);rect(images[7],76,75,4,2,k.darkwood);images[7]:drawPixel(78,75,k.lamp)
for i,l in ipairs(layers)do s:newCel(l,s.frames[1],images[i],Point(0,0))end
assert(app.params.output);s:saveAs(app.params.output);print('Saved H01 '..app.params.output)

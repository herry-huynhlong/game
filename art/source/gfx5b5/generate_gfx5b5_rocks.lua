local output=assert(app.params.output);local W,H=64,64
local s=Sprite(W,H,ColorMode.RGB);local names={'contact_shadow','stone_body','lit_facets','moss_cracks'};local layers={}
for i,n in ipairs(names)do local l=i==1 and s.layers[1]or s:newLayer();l.name=n;layers[n]=l end
local C={edge='#333D39',dark='#4B554E',mid='#68736A',light='#899084',hi='#B0AD98',moss='#526F4B',mossL='#789258',crack='#343C39',ground='#344038',shade='#29362F'}
local function rgba(h)return app.pixelColor.rgba(tonumber(h:sub(2,3),16),tonumber(h:sub(4,5),16),tonumber(h:sub(6,7),16),255)end
local function image()return Image(W,H,ColorMode.RGB)end
local function p(im,x,y,c)if x>=0 and y>=0 and x<W and y<H then im:drawPixel(x,y,rgba(C[c]or c))end end
local function line(im,x1,y1,x2,y2,c)local dx=math.abs(x2-x1);local dy=math.abs(y2-y1);local sx=x1<x2 and 1 or -1;local sy=y1<y2 and 1 or -1;local e=dx-dy;while true do p(im,x1,y1,c);if x1==x2 and y1==y2 then break end;local q=2*e;if q>-dy then e=e-dy;x1=x1+sx end;if q<dx then e=e+dx;y1=y1+sy end end end
local function poly(im,pts,c)local lo,hi=64,0;for _,v in ipairs(pts)do lo=math.min(lo,v[2]);hi=math.max(hi,v[2])end;for y=lo,hi do local xs={};for i,v in ipairs(pts)do local n=pts[i%#pts+1];if(v[2]<=y and n[2]>y)or(n[2]<=y and v[2]>y)then xs[#xs+1]=v[1]+(y-v[2])*(n[1]-v[1])/(n[2]-v[2])end end;table.sort(xs);for i=1,#xs-1,2 do for x=math.ceil(xs[i]),math.floor(xs[i+1])do p(im,x,y,c)end end end end
local shapes={
 {{9,48},{12,38},{18,32},{23,37},{27,31},{34,35},{37,43},{32,51},{20,54}},
 {{11,46},{12,37},{18,31},{27,29},{36,34},{43,42},{41,50},{33,54},{18,52}},
 {{8,48},{11,38},{18,32},{22,34},{27,28},{38,32},{45,41},{43,49},{35,54},{17,53}},
 {{10,49},{12,38},{19,31},{24,35},{31,26},{38,33},{44,32},{51,42},{47,50},{36,54},{17,53}},
 {{8,47},{12,36},{20,32},{26,34},{31,29},{41,35},{46,43},{43,51},{32,55},{15,53}},
 {{7,48},{9,36},{16,29},{22,32},{28,24},{37,29},{44,35},{53,42},{49,51},{38,56},{16,54}},
 {{17,50},{18,37},{22,25},{28,18},{33,29},{39,22},{43,34},{43,50},{35,56},{20,54}},
 {{8,48},{13,37},{17,33},{21,35},{28,29},{37,32},{47,39},{48,48},{38,54},{17,53}},
 {{9,48},{12,38},{20,31},{25,35},{31,28},{39,32},{47,40},{44,51},{35,55},{17,53}},
 {{8,48},{11,36},{18,29},{24,33},{31,26},{39,31},{48,36},{53,45},{48,52},{35,56},{17,54}}
}
for fi=1,10 do local f=fi-1;local frame=fi==1 and s.frames[1]or s:newEmptyFrame();frame.duration=1000;local imgs={shadow=image(),body=image(),facets=image(),detail=image()}
 poly(imgs.shadow,{{8,49},{15,46},{30,45},{45,47},{53,51},{44,55},{22,57},{10,54}},'shade')
 local pts=shapes[fi];poly(imgs.body,pts,'edge')
 local face={{pts[1][1]+3,pts[1][2]-1},{pts[2][1]+2,pts[2][2]-1},{pts[3][1]+2,pts[3][2]-1},{pts[4][1]+1,pts[4][2]-1},{pts[5][1]+1,pts[5][2]-1},{pts[6][1],pts[6][2]},{pts[7][1]-1,pts[7][2]+1},{pts[8][1]-2,pts[8][2]+1},{pts[9][1]-1,pts[9][2]+1}}
 poly(imgs.body,face,'mid')
 -- Faceted plane has an angular shoulder and a darker turned side; no circular stone stamp.
 poly(imgs.facets,{{pts[2][1]+2,pts[2][2]},{pts[3][1]+2,pts[3][2]},{pts[4][1]+1,pts[4][2]},{pts[5][1],pts[5][2]+1},{pts[6][1]-1,pts[6][2]+2},{pts[7][1]-2,pts[7][2]+1},{pts[6][1]-2,pts[6][2]+7},{pts[4][1]+1,pts[4][2]+7}},'light')
 line(imgs.facets,pts[2][1]+3,pts[2][2]+1,pts[4][1],pts[4][2]+1,'hi');line(imgs.facets,pts[4][1]+2,pts[4][2]+5,pts[6][1]-2,pts[6][2]+4,'dark')
 if fi==3 or fi==8 then poly(imgs.detail,{{13,39},{17,35},{22,36},{25,34},{31,37},{29,41},{22,43},{17,42}},'moss');line(imgs.detail,16,38,21,37,'mossL');p(imgs.detail,24,39,'mossL') end
 if fi==9 or fi==10 then line(imgs.detail,29,32,25,38,'crack');line(imgs.detail,25,38,29,42,'crack');line(imgs.detail,29,42,26,48,'crack');line(imgs.facets,28,31,24,37,'light') end
 if fi==7 or fi==10 then line(imgs.detail,28,10,28,28,'light');line(imgs.detail,24,28,32,29,'mid') end
 for _,name in ipairs(names)do s:newCel(layers[name],frame,imgs[name==names[1]and'shadow'or name==names[2]and'body'or name==names[3]and'facets'or'detail'],Point(0,0)) end
 local tag=s:newTag(fi,fi);tag.name=({'S01_gravel','S02_cobble','S03_forest','S04_mountain','S05_low_boulder','S06_large_boulder','S07_standing','S08_moss','S09_cracked','S10_cairn'})[fi];tag.aniDir=AniDir.FORWARD
end
s:saveAs(output);print('GFX5B.5 rock study: ten separate 64px silhouettes, four editable layers')

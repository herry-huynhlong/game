local input=assert(app.params.input);local output=assert(app.params.output)
local x=tonumber(assert(app.params.x));local y=tonumber(assert(app.params.y));local w=tonumber(assert(app.params.w));local h=tonumber(assert(app.params.h))
local src=assert(app.open(input));local dst=Sprite(w,h,ColorMode.RGB);dst.layers[1].name='merged_pose_detail'
for fi,sf in ipairs(src.frames)do
 local merged=Image(src.width,src.height,ColorMode.RGB)
 for _,layer in ipairs(src.layers)do local cel=layer:cel(sf);if cel then merged:drawImage(cel.image,cel.position)end end
 local cropped=Image(w,h,ColorMode.RGB);cropped:drawImage(merged,Point(-x,-y))
 local df=fi==1 and dst.frames[1]or dst:newEmptyFrame();df.duration=sf.duration;dst:newCel(dst.layers[1],df,cropped,Point(0,0))
 local tag=dst:newTag(fi,fi);tag.name='pose_'..fi;tag.aniDir=AniDir.FORWARD
end
dst:saveAs(output);print('C03 A6.1 crop: '..w..'x'..h..' x3 frames')

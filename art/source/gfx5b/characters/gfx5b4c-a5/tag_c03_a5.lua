local input=assert(app.params.input)
local output=assert(app.params.output)
local sprite=assert(app.open(input))
assert(sprite.width==48 and sprite.height==64 and #sprite.frames==56)
local dirs={'south','south_east','east','north_east','north','north_west','west','south_west'}
for i,name in ipairs(dirs) do
  local idle=sprite:newTag(i,i)
  idle.name='idle_'..name
  idle.aniDir=AniDir.FORWARD
  idle.repeats=0
  local first=9+(i-1)*6
  local walk=sprite:newTag(first,first+5)
  walk.name='walk_'..name
  walk.aniDir=AniDir.FORWARD
  walk.repeats=0
end
sprite:saveAs(output)
print('Tagged C03 A5 idle/walk for eight directions')

local s=assert(app.open(assert(app.params.input)))
print('SIZE='..s.width..'x'..s.height..' FRAMES='..#s.frames..' LAYERS='..#s.layers..' TAGS='..#s.tags)
for i,l in ipairs(s.layers) do print('LAYER '..i..' '..l.name) end
for i,t in ipairs(s.tags) do print('TAG '..i..' '..t.name..' ') end


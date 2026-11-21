local sprite=app.activeSprite
assert(sprite and #sprite.frames==12,'Expected a 12-frame editable Aseprite document')
assert(#sprite.layers==3,'Expected separate shadow/body/marking layers')
for i,layer in ipairs(sprite.layers) do print(string.format('LAYER %d: %s',i,layer.name)) end
print(string.format('VERIFIED Aseprite source: %dx%d, %d frames, %d layers',sprite.width,sprite.height,#sprite.frames,#sprite.layers))

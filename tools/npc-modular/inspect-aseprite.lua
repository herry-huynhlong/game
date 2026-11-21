local input = app.params.input
assert(input and #input > 0, 'Pass input=<path>')
app.open(input)
local sprite = app.activeSprite
assert(sprite, 'Aseprite did not open the requested sprite')
print('FILE', input)
print('CANVAS', sprite.width, sprite.height, 'FRAMES', #sprite.frames, 'LAYERS', #sprite.layers)
for i, layer in ipairs(sprite.layers) do
  print('LAYER', i, layer.name, 'VISIBLE', layer.isVisible)
end
for _, tag in ipairs(sprite.tags) do print('TAG', tag.name, tag.fromFrame, tag.toFrame) end

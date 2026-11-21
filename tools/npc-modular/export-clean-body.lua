local input = app.params.input
local output = app.params.output
assert(input and #input > 0, 'Pass input=<path>')
assert(output and #output > 0, 'Pass output=<path>')
app.open(input)
local sprite = app.activeSprite
assert(sprite, 'Aseprite did not open the requested sprite')
local hide = { hair_back=true, hair_front=true, face=true, robe=true, details=true }
local found = {}
for _, layer in ipairs(sprite.layers) do
  if hide[layer.name] then layer.isVisible = false; found[layer.name] = true end
end
for name, _ in pairs(hide) do assert(found[name], 'Missing expected source layer: ' .. name) end
sprite:saveAs(output)
print('Saved non-destructive body extraction:', output)
print('Kept layers: shadow, legs, arms. Disabled: hair_back, hair_front, face, robe, details.')

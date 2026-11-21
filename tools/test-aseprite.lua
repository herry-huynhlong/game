print('HELLO LUA',app.params.output)
local s=Sprite(32,32,ColorMode.RGB)
local l=s.layers[1];l.name='test'
s:saveAs(app.params.output)
print('SAVED')

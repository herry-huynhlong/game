local root = app.params['root']
for i=1,12 do
 local name=string.format('npc_%02d',i)
 local sprite=app.open(root..'/art/source/npc-xianxia-12/editable/'..string.format('%02d',i)..'/pixels.png')
 assert(#sprite.frames==1)
 sprite.layers[1].name='AI artwork - normalized palette'
 local corrections=sprite:newLayer()
 corrections.name='Retouch - editable'
 app.activeSprite=sprite
 sprite:saveAs(root..'/art/source/npc-xianxia-12/'..name..'.aseprite')
 sprite:close()
end

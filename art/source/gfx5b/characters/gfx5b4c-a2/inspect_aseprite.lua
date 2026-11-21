local src=assert(app.params.input);local report=assert(app.params.report);local s=assert(app.open(src));local f=assert(io.open(report,'w'))
f:write('canvas=',s.width,'x',s.height,'\nframes=',#s.frames,'\nlayers=',#s.layers,'\ntags=',#s.tags,'\n')
for _,l in ipairs(s.layers)do f:write('layer=',l.name,'\n')end
for _,t in ipairs(s.tags)do f:write('tag=',t.name,':',t.fromFrame.frameNumber-1,'-',t.toFrame.frameNumber-1,'\n')end
for i,fr in ipairs(s.frames)do f:write('frame ',i-1,' duration=',fr.duration,'\n')end
f:close()

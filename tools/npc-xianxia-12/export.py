from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,shutil
root=Path(__file__).resolve().parents[2]
src=root/'art/source/npc-xianxia-12';out=root/'assets/npc';out.mkdir(parents=True,exist_ok=True)
manifest=json.loads((src/'manifest.json').read_text(encoding='utf-8-sig'))
for row in manifest:
 im=Image.open(src/row['source']).convert('RGBA')
 alpha=im.getchannel('A').point(lambda a:255 if a>=200 else 0)
 im.putalpha(alpha);im=im.crop(alpha.getbbox())
 w,h=row['size'];scale=min((w-6)/im.width,90/im.height)
 im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.NEAREST)
 alpha=im.getchannel('A');rgb=im.convert('RGB').quantize(colors=40,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE).convert('RGB').convert('RGBA');rgb.putalpha(alpha)
 canvas=Image.new('RGBA',(w,h));canvas.alpha_composite(rgb,((w-im.width)//2,h-3-im.height));# Remove detached single-pixel specks, preserving connected hair and embroidery.
 pix=canvas.load(); remove=[]
 for yy in range(1,h-1):
  for xx in range(1,w-1):
   if pix[xx,yy][3] and not any(pix[xx+dx,yy+dy][3] for dx,dy in [(-1,0),(1,0),(0,-1),(0,1),(-1,-1),(1,-1),(-1,1),(1,1)]):remove.append((xx,yy))
 for xy in remove:pix[xy]=(0,0,0,0)
 canvas.save(out/f"npc_{row['id']:02}.png")
 row['anchor']=[.5,(h-3)/h];row['palette']=[list(c) for c in sorted(set(canvas.getdata())) if c[3]]
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',18)
preview=Image.new('RGB',(4*300,((len(manifest)+3)//4)*390),(18,35,39));d=ImageDraw.Draw(preview)
for i,row in enumerate(manifest):
 im=Image.open(out/f"npc_{row['id']:02}.png");im=im.resize((im.width*3,im.height*3),Image.Resampling.NEAREST)
 x=(i%4)*300+(300-im.width)//2;y=(i//4)*390+10+(112-row['size'][1])*3
 preview.paste(im,(x,y),im);d.text(((i%4)*300+150,(i//4)*390+355),row['name'],fill='#e5d9b0',font=font,anchor='mt')
preview.save(out/'npc_preview.png')
(out/'npc_metadata.json').write_text(json.dumps({'provenance':'AI generated initial art, nearest-neighbor raster normalization and 40-color palette. Static front poses only. Not hand-drawn Aseprite.','characters':manifest},ensure_ascii=False,indent=2),encoding='utf-8')

atlas=Image.new('RGBA',(320,336));frames={}
for i,row in enumerate(manifest):
 im=Image.open(out/f"npc_{row['id']:02}.png")
 x=(i%4)*80+(80-im.width)//2;y=(i//4)*112+112-im.height
 atlas.alpha_composite(im,(x,y))
 frames[f"npc_{row['id']:02}"]={'frame':{'x':x,'y':y,'w':im.width,'h':im.height},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':im.width,'h':im.height},'sourceSize':{'w':im.width,'h':im.height}}
atlas.save(out/'npc_spritesheet.png')
(out/'npc_atlas.json').write_text(json.dumps({'frames':frames,'meta':{'image':'npc_spritesheet.png','size':{'w':320,'h':336},'scale':'1'}}),encoding='utf-8')
for zoom in [1,2]:
 atlas.resize((320*zoom,336*zoom),Image.Resampling.NEAREST).save(out/f'npc_grid_{zoom}x.png')
# Runtime lab copy, not connected to roster or NPC animation definitions.
runtime=root/'public/assets/npc';runtime.mkdir(parents=True,exist_ok=True)
for f in out.glob('*'):
 if f.is_file():shutil.copy2(f,runtime/f.name)
validation=[]
for row in manifest:
 im=Image.open(out/f"npc_{row['id']:02}.png").convert('RGBA');alpha=set(im.getchannel('A').getdata())
 assert im.size==tuple(row['size']) and alpha=={0,255}
 assert len(set(im.getdata()))<=41
 validation.append({'id':row['id'],'size':im.size,'colors':len(set(im.getdata())),'alpha':'binary 0/255','bbox':im.getbbox()})
(src/'validation.json').write_text(json.dumps(validation,indent=2),encoding='utf-8')

from PIL import Image, ImageDraw
from pathlib import Path
import json, hashlib
base=Path('art/source/gfx5b/characters'); old=base/'gfx5b4b'; new=base/'gfx5b4c'
canvas=Image.new('RGB',(5*160,2*200),'#293d31');d=ImageDraw.Draw(canvas)
for i in range(1,6):
 id=f'C{i:02}'
 before=Image.open(old/f'{id}-8dir.png').convert('RGBA'); after=Image.open(new/f'{id}-8dir.png').convert('RGBA')
 meta=json.loads((new/f'{id}-8dir.json').read_text(encoding='utf8'));assert len(meta['frames'])==98
 assert before.size==after.size==(256,520)
 changed=[]
 def frame(im,n):
  x=n%8*32;y=n//8*40
  return im.crop((x,y,x+32,y+40))
 for n in range(98):
  if frame(before,n).tobytes()!=frame(after,n).tobytes():changed.append(n)
 assert set(changed)<=set(range(28,32))|set(range(74,80)),(id,changed)
 assert changed, id
 print(id,'changed',changed,'walk distinct per direction',[len({hashlib.sha256(frame(after,32+di*6+ph).tobytes()).digest() for ph in range(6)}) for di in range(8)])
 for row,im in enumerate([before,after]):
  tile=frame(im,28).resize((128,160),Image.Resampling.NEAREST);canvas.paste(tile,((i-1)*160+16,row*200+25),tile)
  d.text(((i-1)*160+8,row*200+6),f'{id} '+('before' if row==0 else 'after'),fill='#f1e5c9')
 frames=[]
 for di in range(8):
  for ph in range(6):
   f=frame(after,32+di*6+ph).resize((128,160),Image.Resampling.NEAREST)
   bg=Image.new('RGBA',f.size,'#293d31');bg.alpha_composite(f);frames.append(bg.convert('RGB'))
 frames[0].save(new/f'{id}-walk-8dir.gif',save_all=True,append_images=frames[1:],duration=120,loop=0,disposal=2)
canvas.save(new/'before-after-5.png')

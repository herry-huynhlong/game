from pathlib import Path
from PIL import Image,ImageDraw
import json,hashlib
base=Path('art/source/gfx5b/characters');o=base/'gfx5b4c-a3'; old=Image.open(base/'gfx5b4b/C03-8dir.png').convert('RGBA');new=Image.open(o/'C03-a3.png').convert('RGBA');assert old.size==new.size==(256,520)
def crop(im,n):
 x=(n%8)*32;y=(n//8)*40;return im.crop((x,y,x+32,y+40))
changed=[i for i in range(98) if crop(old,i).tobytes()!=crop(new,i).tobytes()]
assert changed==list(range(80)),changed
meta=json.loads((o/'C03-a3.json').read_text());assert len(meta['frames'])==98
print('changed:',len(changed),'special frames 80-97 preserved; transparency:',new.getextrema()[3])
for j,name in enumerate(['S','SE','E','NE','N','NW','W','SW']):
 seq=[crop(new,32+j*6+i) for i in range(6)]
 print(name,'walk distinct:',len({hashlib.sha256(x.tobytes()).digest() for x in seq}))
img=Image.new('RGB',(8*136,2*188),'#30483b');d=ImageDraw.Draw(img)
for j,name in enumerate(['S','SE','E','NE','N','NW','W','SW']):
 for row,source in enumerate((old,new)):
  f=crop(source,j*4).resize((128,160),Image.Resampling.NEAREST);img.paste(f,(j*136+4,row*188+22),f)
  d.text((j*136+6,row*188+3),('old ' if row==0 else 'A3 ')+name,fill='#eee5c7')
img.save(o/'before-after-8directions.png')
img=Image.new('RGB',(6*136,4*188),'#30483b');d=ImageDraw.Draw(img)
for row,(di,name) in enumerate(((1,'SE'),(3,'NE'),(5,'NW'),(7,'SW'))):
 for ph in range(6):
  f=crop(new,32+di*6+ph).resize((128,160),Image.Resampling.NEAREST);img.paste(f,(ph*136+4,row*188+22),f);d.text((ph*136+6,row*188+3),f'{name} {ph+1}',fill='#eee5c7')
img.save(o/'walk-diagonals.png')
frames=[]
for di in range(8):
 for ph in range(6):
  f=crop(new,32+di*6+ph).resize((128,160),Image.Resampling.NEAREST);bg=Image.new('RGBA',f.size,'#30483b');bg.alpha_composite(f);frames.append(bg.convert('RGB'))
frames[0].save(o/'C03-walk-8directions.gif',save_all=True,append_images=frames[1:],duration=120,loop=0,disposal=2)

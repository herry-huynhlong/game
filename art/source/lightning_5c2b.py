from PIL import Image, ImageDraw
from pathlib import Path
import random
root=Path(__file__).resolve().parents[2]
out=root/'public/assets/effects/heavenly_lightning.png'
out.parent.mkdir(parents=True,exist_ok=True)
sheet=Image.new('RGBA',(64*8,128))
for frame in range(8):
 im=Image.new('RGBA',(64,128)); d=ImageDraw.Draw(im); r=random.Random(100+frame)
 for x,y,rad in [(15,21,11),(26,15,13),(39,19,12),(50,23,9)]: d.ellipse((x-rad,y-rad//2,x+rad,y+rad//2),fill='#343b69',outline='#887dbe',width=2)
 if frame in range(1,7):
  points=[(32,24),(28+r.randrange(-5,6),43),(37+r.randrange(-5,6),60),(26+r.randrange(-5,6),78),(34+r.randrange(-4,5),100)]
  d.line(points,fill='#6658b8',width=9,joint='curve');d.line(points,fill='#99d7fd',width=5,joint='curve');d.line(points,fill='#f3ffff',width=2,joint='curve')
  for j in (1,2,3):
   x,y=points[j];d.line((x,y,x+(-14 if j%2 else 14),y+12),fill='#96e7f3',width=2)
  radius=8+frame*3;d.ellipse((32-radius,106-radius//3,32+radius,106+radius//3),outline='#82e6e8',width=2)
  for i in range(9):
   x=r.randrange(8,56);y=r.randrange(88,122);d.rectangle((x,y,x+2,y+2),fill='#d5ffff')
 sheet.alpha_composite(im,(frame*64,0))
sheet.save(out)

from pathlib import Path
from PIL import Image,ImageDraw
import hashlib,json
base=Path('art/source/gfx5b/characters');o=base/'gfx5b4c-a4';old=Image.open(base/'gfx5b4c-a3/C03-a3.png').convert('RGBA');new=Image.open(o/'C03-a4.png').convert('RGBA');assert old.size==new.size==(256,520)
def frame(im,n):x=n%8*32;y=n//8*40;return im.crop((x,y,x+32,y+40))
changed=[n for n in range(98) if frame(old,n).tobytes()!=frame(new,n).tobytes()];assert all(n<80 for n in changed);assert all(frame(old,n).tobytes()==frame(new,n).tobytes() for n in range(80,98))
print('changed frames',len(changed),'special 80-97 unchanged','alpha',new.getextrema()[3])
names=['S','SE','E','NE','N','NW','W','SW'];comp=Image.new('RGB',(8*136,2*188),'#30483b');d=ImageDraw.Draw(comp)
for j,name in enumerate(names):
 for row,source in enumerate((old,new)):
  f=frame(source,j*4).resize((128,160),Image.Resampling.NEAREST);comp.paste(f,(j*136+4,row*188+22),f);d.text((j*136+6,row*188+3),('A3 ' if row==0 else 'A4 ')+name,fill='#eee5c7')
comp.save(o/'before-after-8directions.png')
seq=Image.new('RGB',(6*136,4*188),'#30483b');d=ImageDraw.Draw(seq)
for row,(di,name) in enumerate(((1,'SE'),(3,'NE'),(5,'NW'),(7,'SW'))):
 for ph in range(6):
  f=frame(new,32+di*6+ph).resize((128,160),Image.Resampling.NEAREST);seq.paste(f,(ph*136+4,row*188+22),f);d.text((ph*136+6,row*188+3),f'{name} {ph+1}',fill='#eee5c7')
seq.save(o/'walk-diagonals.png')
def gif(name,dirs):
 out=[]
 for di in dirs:
  for phase in range(6):
   f=frame(new,32+di*6+phase).resize((128,160),Image.Resampling.NEAREST);b=Image.new('RGBA',f.size,'#30483b');b.alpha_composite(f);out.append(b.convert('RGB'))
 out[0].save(o/name,save_all=True,append_images=out[1:],duration=120,loop=0,disposal=2)
gif('walk-eight-directions.gif',range(8));gif('walk-NE.gif',[3]);gif('walk-NW.gif',[5]);gif('walk-SE.gif',[1])
for di,name in enumerate(names):
 frames=[frame(new,32+di*6+i) for i in range(6)];print(name,'distinct frames',len({hashlib.sha256(x.tobytes()).digest() for x in frames}))

from PIL import Image,ImageDraw
from pathlib import Path
import json
root=Path('art/source/gfx5b/characters');o=root/'gfx5b4c-a2';prev=Image.open(root/'gfx5b4b/C03-8dir.png').convert('RGBA');a=Image.open(o/'C03-study-A-32.png').convert('RGBA');b=Image.open(o/'C03-study-B-48.png').convert('RGBA')
assert prev.size==a.size==(256,520) and b.size==(48,64)
assert len(json.loads((o/'C03-study-A-32.json').read_text())['frames'])==98
changed=[]
def crop(im,n):x=n%8*32;y=n//8*40;return im.crop((x,y,x+32,y+40))
for n in range(98):
 if crop(prev,n).tobytes()!=crop(a,n).tobytes():changed.append(n)
assert changed==[4],changed
old=crop(prev,4);aa=crop(a,4);bb=b.resize((30,40),Image.Resampling.NEAREST)
canvas=Image.new('RGB',(900,570),'#2e493c');d=ImageDraw.Draw(canvas)
for i,(label,im) in enumerate([('GFX.5B.4B 32x40',old),('A: revised 32x40',aa),('B: new 48x64 -> 30x40',bb)]):
 x=i*300;d.text((x+15,15),label,fill='#eee5c7');large=im.resize((im.width*6,im.height*6),Image.Resampling.NEAREST);canvas.paste(large,(x+40,55),large)
 d.text((x+15,350),'Same 40px canvas height',fill='#eee5c7');canvas.paste(im,(x+110,390),im)
canvas.save(o/'C03-32-vs-48-same-world-height.png')
print('Verified modified frame indices:',changed,'source study B:',b.size,'same-height output:',bb.size,'alpha:',b.getextrema()[3])

from PIL import Image, ImageDraw
from pathlib import Path
out=Path('public/assets/effects'); out.mkdir(parents=True,exist_ok=True)
for name,edge,light in [('thuan','#b87520','#ffe89a'),('vo','#276a64','#94eee0'),('nghich','#772b5c','#fa83bd')]:
 im=Image.new('RGBA',(24,24)); d=ImageDraw.Draw(im)
 d.polygon([(12,1),(15,7),(21,10),(16,13),(17,20),(12,17),(7,20),(8,13),(3,10),(9,7)], fill=edge)
 d.polygon([(12,4),(14,9),(19,10),(14,12),(15,17),(12,14),(9,17),(10,12),(5,10),(10,9)],fill=light)
 d.rectangle((11,9,12,12),fill='#fff8df'); im.save(out/f'heaven_{name}.png')

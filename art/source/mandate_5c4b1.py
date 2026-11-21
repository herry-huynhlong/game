from PIL import Image, ImageDraw
from pathlib import Path
out=Path(__file__).resolve().parents[2]/'public/assets/effects'
out.mkdir(parents=True,exist_ok=True)
im=Image.new('RGBA',(24,24));d=ImageDraw.Draw(im)
d.line((12,21,12,8),fill='#416b43',width=2);d.polygon([(12,15),(4,12),(3,7),(9,8),(12,12)],fill='#68b67b',outline='#2c6b52');d.polygon([(12,12),(15,5),(21,3),(20,9),(15,14)],fill='#8fe0ae',outline='#327a5e');d.ellipse((10,3,14,7),fill='#e3daa0');im.save(out/'mandate_herb.png')
im=Image.new('RGBA',(24,24));d=ImageDraw.Draw(im);d.ellipse((3,3,21,21),outline='#d5be80',width=2);d.line((12,3,12,21),fill='#b3e4d4');d.line((3,12,21,12),fill='#b3e4d4');d.ellipse((9,9,15,15),fill='#dcab5a',outline='#f6e5b1');im.save(out/'mandate_target.png')

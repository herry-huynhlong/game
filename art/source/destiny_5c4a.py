from PIL import Image, ImageDraw
from pathlib import Path
base=Path(__file__).resolve().parents[2]/'public/assets/effects'
base.mkdir(parents=True,exist_ok=True)
sigil=Image.new('RGBA',(24,24));d=ImageDraw.Draw(sigil)
d.polygon([(12,1),(15,8),(22,12),(15,15),(12,23),(9,15),(2,12),(9,8)],fill='#d6b65e',outline='#fff2be');d.polygon([(12,6),(14,10),(18,12),(14,14),(12,18),(10,14),(6,12),(10,10)],fill='#73c9bc');d.point((12,12),fill='white');sigil.save(base/'destiny_sigil.png')
book=Image.new('RGBA',(24,24));d=ImageDraw.Draw(book);d.polygon([(3,5),(11,7),(12,19),(3,17)],fill='#dec898',outline='#795f39');d.polygon([(12,7),(21,5),(21,17),(12,19)],fill='#f2dcaa',outline='#795f39');d.line((12,7,12,19),fill='#8a6b41');d.line((5,9,10,10),fill='#987b4f');d.line((14,10,19,9),fill='#987b4f');book.save(base/'destiny_chronicle.png')

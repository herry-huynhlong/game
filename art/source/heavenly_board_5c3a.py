from PIL import Image, ImageDraw
from pathlib import Path
out=Path(__file__).resolve().parents[2]/'public/assets/effects/heavenly_board.png'
sheet=Image.new('RGBA',(96*8,64))
for f in range(8):
 im=Image.new('RGBA',(96,64));d=ImageDraw.Draw(im);width=[5,15,25,34,34,25,15,5][f];x=48-width
 d.ellipse((12,6,84,58),outline='#6e9d80',width=2);d.ellipse((17,10,79,54),outline='#d6bd65')
 d.rectangle((x,16,96-x,49),fill='#e6cd87',outline='#705736',width=2)
 for xx in (x,96-x):d.rectangle((xx-2,13,xx+2,52),fill='#835d36',outline='#f7df92')
 if width>20:
  for y in (23,29,35,41):d.line((x+6,y,96-x-6,y),fill='#82633e',width=1)
 for xx,yy in ((12,17),(80,15),(21,54),(75,51)):d.line((xx-2,yy,xx+2,yy),fill='#e8efb6');d.line((xx,yy-2,xx,yy+2),fill='#e8efb6')
 sheet.alpha_composite(im,(96*f,0))
out.parent.mkdir(parents=True,exist_ok=True);sheet.save(out)

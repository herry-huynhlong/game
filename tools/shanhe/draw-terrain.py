"""Material ramps and relief faces for the Shanhe Tiled map."""
from pathlib import Path
from random import Random
from PIL import Image, ImageDraw

root=Path(__file__).resolve().parents[2]/"public/assets/shanhe"
root.mkdir(parents=True,exist_ok=True)
# Grassy west, lowlands, wetland, then red and black minerals.
colors=[
 ("#3f5350","#547067","#688076","#344543"),("#465f4f","#5c795e","#78956f","#354b43"),
 ("#4c674c","#647f54","#849867","#3d5540"),("#556f50","#708559","#93a06b","#425a48"),
 ("#637d53","#7e9661","#9fac77","#526b48"),("#6d8558","#8da167","#b0b67d","#5b754c"),
 ("#5d795a","#799260","#a1a871","#48654c"),("#415d53","#5f7463","#849279","#354e49"),
 ("#6e7958","#878b65","#a5a37b","#556951"),("#799061","#93a86c","#b6b987","#657f52"),
 ("#778d66","#8da780","#b0bc87","#5d8263"),("#89936b","#a2a279","#bab187","#697f5d"),
 ("#9b7656","#b18c61","#c9a772","#7d614e"),("#904b3e","#aa694e","#c58a61","#723f39"),
 ("#6b5b50","#8a7361","#aa9077","#594c45"),("#bd8f55","#d4ad70","#e4c38a","#a37b50"),
 ("#95816a","#b3a087","#d0bda0","#7c7060"),("#7f7364","#968977","#b3a48b","#695f53"),
 ("#6d593f","#9e865d","#c2a475","#4a4538"),("#615451","#8b7667","#b3997e","#463d40"),
 ("#73483d","#aa6e54","#cd9970","#5a3b39"),("#60724f","#7d895c","#9fa475","#4c644a"),
 ("#789094","#93b6a7","#b2c5ae","#567d7e"),("#735b46","#947c59","#b3a17a","#574c42"),
]
atlas=Image.new("RGBA",(256,len(colors)*32))
for row,(base,mid,light,dark) in enumerate(colors):
 for v in range(8):
  rng=Random(row*1219+v*1667)
  im=Image.new("RGBA",(32,32),base); d=ImageDraw.Draw(im)
  if row in (19,20):
   d.polygon([(0,0),(31,0),(31,13),(25,10),(22,13),(16,9),(12,14),(4,11),(0,14)],fill=mid)
   d.line([(0,11),(4,9),(12,12),(16,7),(22,11),(25,8),(31,11)],fill=light,width=2)
   for x in range(-4,33,7):
    start=x+v%5
    d.polygon([(start,13),(start+4,9),(start+6,23),(start+4,30),(start+1,31)],fill=dark)
    d.line([(start+1,16),(start+3,22),(start+2,30)],fill=mid)
   d.line([(0,31),(8,29),(19,31),(31,28)],fill=dark,width=2)
  elif row in (12,13,14,15,16,17,23):
   if v>=3:
    y=5+v%5*4
    d.polygon([(0,y+5),(9,y+1),(18,y-2),(31,y),(31,y+6),(21,y+4),(11,y+6),(0,y+11)],fill=mid)
    d.line([(0,y+4),(8,y+1),(19,y-2),(31,y)],fill=light)
    d.line([(8,y+9),(15,y+6),(25,y+4)],fill=dark)
   if row in (13,14,17,23):
    x=rng.randrange(6,21)
    d.line([(x,4),(x-2,12),(x+4,17),(x+3,27)],fill=dark)
    d.line([(x+3,17),(x+8,13),(x+11,14)],fill=dark)
  elif row==22:
   for i in range(4):
    x,y=rng.randrange(3,21),rng.randrange(3,29)
    d.line([(x,y),(x+2,y-1),(x+8,y-1)],fill=light if i%2 else mid)
  else:
   for i in range(5):
    x,y=rng.randrange(1,29),rng.randrange(1,30)
    d.polygon([(x-4,y),(x-1,y-2),(x+2,y-2),(x+4,y),(x+2,y+2),(x-3,y+2)],fill=mid if i%2 else dark)
    d.line([(x-2,y),(x-1,y-2),(x+1,y-1)],fill=light if v%3 else mid)
  for i in range(14):
   x,y=rng.randrange(32),rng.randrange(32)
   d.line((x,y,x+i%2,y),fill=mid if i%3 else light)
  atlas.paste(im,(v*32,row*32))
atlas.save(root/"terrain.png")

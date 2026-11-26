from pathlib import Path
from random import Random
from PIL import Image, ImageDraw
import math
out=Path(__file__).resolve().parents[2]/"public/assets/east-wilds"
out.mkdir(parents=True,exist_ok=True)
rng=Random(3879)
palettes=[
 ("#d4ad66","#e3c580","#ad7a48"),("#e0c98f","#eed6a0","#ba9a66"),
 ("#bd774e","#d49060","#87493a"),("#a88a64","#b8986a","#685843"),
 ("#78985f","#a2ab63","#537254"),("#b2996e","#c9b289","#7a6860"),
 ("#af8759","#cca36a","#886239"),("#cbaa74","#e0c185","#98744e")]
terrain=Image.new("RGBA",(256,256))
for row,(base,light,dark) in enumerate(palettes):
 for v in range(8):
  im=Image.new("RGBA",(32,32),base);d=ImageDraw.Draw(im)
  for _ in range(72):
   x,y=rng.randrange(32),rng.randrange(32)
   d.point((x,y),fill=light if rng.random()>.28 else dark)
  if row in (3,5):
   x,y=rng.randrange(5,20),rng.randrange(2,12)
   d.line([(x,y),(x-2,y+6),(x+5,y+11),(x+3,y+20)],fill=dark)
   d.line([(x+4,y+10),(x+11,y+9),(x+15,y+13)],fill=dark)
   if row==5:d.line([(0,31),(31,31),(31,17)],fill=dark)
  else:
   for a in range(v%3+1):
    x,y=rng.randrange(1,21),rng.randrange(2,28)
    d.line([(x,y),(x+3,y-1),(x+7,y-1),(x+10,y)],fill=light)
    if v>4:d.line([(x+1,y+1),(x+6,y),(x+10,y+1)],fill=dark)
  terrain.paste(im,(v*32,row*32))
terrain.save(out/"terrain.png")

shore=Image.new("RGBA",(128,128))
for mask in range(1,16):
 im=Image.new("RGBA",(32,32));d=ImageDraw.Draw(im)
 for side in range(4):
  if not mask&(1<<side):continue
  for u in range(32):
   width=3+(u*3+u//6*4)%5
   for v in range(width):
    x,y=((u,v),(31-v,u),(31-u,31-v),(v,31-u))[side]
    color="#758f66" if v<2 else "#9a9f74" if v<width-2 else "#73a4a0" if v==width-2 else "#8eb6aa90"
    d.point((x,y),fill=color)
 shore.paste(im,((mask%4)*32,(mask//4)*32))
shore.save(out/"shore.png")

ivy=Image.new("RGBA",(8*96,4*96))
def plant(i,phase,im):
 d=ImageDraw.Draw(im); X=48;Y=81
 def poly(points,color):d.polygon([(X+x,Y+y) for x,y in points],fill=color)
 def line(points,color,width=1):d.line([(X+x,Y+y) for x,y in points],fill=color,width=width)
 d.ellipse((32,75,65,83),fill="#58482a50")
 if i in (0,11):
  color="#438567" if i==0 else "#8da45d"
  for x,h in [(-16,18),(0,33),(14,22)]:
   d.rounded_rectangle((X+x-4,Y-h,X+x+4,Y-2),3,fill=color,outline="#315544")
   line([(x-1,-h+3),(x-1,-5)],"#acd489",2)
   for j in range(3,h,5):line([(x-5,-j),(x-7,-j+1)],"#e1be83")
  if i==0:poly([(-4,-30),(0,-40),(4,-30),(0,-26)],"#de674f")
 elif i in (1,3,6,8,12):
  line([(0,0),(-3,-19),(2,-39),(-5,-53)],"#503d2b",8 if i!=12 else 5)
  line([(1,-4),(-1,-20),(5,-39)],"#b78e55",2)
  for x,y,k in [(-16,-36,-3),(13,-44,2),(-22,-55,-3),(9,-59,0)]:
   line([(k,-24),(x//2,y+9),(x,y),(x+3,y-5)],"#735535",4)
  for x in (-12,-5,10,18):
   line([(0,-8),(x//2,-3),(x,1)],"#664d34",3)
  if i!=6:
   for x,y in [(-16,-38),(13,-46),(-23,-56),(8,-61)]:
    c="#82965e" if i in (1,12) else "#d2a74b"
    if i==12:
     for sx,sy in [(-17,-5),(-10,-14),(0,-20),(18,-8),(17,2),(-13,6)]:
      line([(4,-57),(4+sx//2,-63),(4+sx,-60+sy)],"#688a52",3)
     break
    poly([(x-13,y),(x-10,y-8),(x-3,y-11),(x+6,y-10),(x+12,y-4),(x+9,y+3),(x-6,y+6)],c)
    line([(x-9,y-5),(x-5,y-8),(x+3,y-9)],"#c0b879",2)
    if i==8:d.ellipse((X+x+2,Y+y,X+x+8,Y+y+6),fill="#eb7839")
 elif i in (2,4,5,7,9,10):
  hue={2:"#ef9351",4:"#a6e3d5",5:"#94ad6c",7:"#d85f43",9:"#766449",10:"#bea36a"}[i]
  for j in range(6):
   s=j-3;h=7+phase*3+(j%3)*4
   line([(s*2,0),(s*3,-h//2),(s*5,-h)],"#635037" if i in (9,10) else "#4a6b4d",2)
   if i!=10:poly([(s*5-4,-h),(s*5,-h-4),(s*5+4,-h),(s*5+1,-h+3)],hue)
  if i==4:
   poly([(-17,-2),(-8,-10),(8,-10),(16,-3),(9,3),(-7,3)],"#447f64")
   poly([(-9,-10),(-7,-20),(0,-15),(5,-22),(8,-11),(0,-7)],hue)
  if i==7:
   poly([(-15,-11),(-9,-20),(3,-22),(13,-18),(18,-11),(8,-8),(-9,-8)],hue)
   line([(-9,-17),(-1,-19),(6,-17)],"#efb370",2)
 elif i in (13,14,15,16,17,18,19,20):
  if i in (13,14,20):
   c="#8f523b" if i!=14 else "#826455"
   poly([(-30,-1),(-26,-19),(-17,-42),(4,-58),(18,-40),(30,-5),(24,3)],c)
   poly([(-25,-18),(-16,-39),(4,-58),(16,-36),(1,-28),(-9,-12)],"#bd855d")
   poly([(4,-58),(20,-38),(30,-5),(12,-7),(1,-26)],"#634839")
   line([(-18,-29),(-7,-31),(-1,-37),(13,-40)],"#e0a375",2)
   line([(-22,-14),(-3,-17),(6,-22),(23,-26)],"#664c3a",2)
  elif i==15:
   for j in range(5):
    line([(-22+j*7,-1),(-16+j*7,-11)],"#f4ddab",3)
   poly([(4,-5),(10,-15),(19,-16),(25,-9),(18,-3),(10,-1)],"#ecd0a2")
   line([(13,-11),(20,-8)],"#8b6650",2)
  else:
   w=32 if i in (16,19) else 19
   poly([(-w,0),(-w,-26),(-w+14,-38),(w,-34),(w,-3),(w-5,3)],"#806953")
   poly([(-w,-24),(-w+14,-40),(w,-36),(w-4,-26),(-7,-24)],"#bfaa83")
   for j in range(4):
    y=-j*7-4
    line([(-w,y),(w-4,y-3)],"#5c5044",2)
    for x in range(-w+7+j%2*5,w-4,13):line([(x,y),(x,y-5)],"#ad9472")
   if i==19:
    poly([(-13,0),(-11,-21),(6,-26),(14,-19),(13,-1)],"#3e3d35")
 elif i==21: # Sandstone well, visible lip and dark water.
  poly([(-23,-5),(-21,-23),(-10,-31),(11,-31),(23,-22),(24,-7),(15,2),(-14,2)],"#695746")
  poly([(-21,-23),(-10,-32),(10,-32),(23,-22),(10,-13),(-11,-13)],"#c6b18b")
  poly([(-15,-23),(-7,-28),(8,-28),(17,-22),(8,-17),(-8,-17)],"#284b4c")
  line([(-10,-22),(-3,-23),(6,-23)],"#70adab")
  for x in (-17,-4,10):line([(x,-13),(x,-5),(x+2,-1)],"#9a8266")
 elif i==22: # Iron-bound coffer.
  poly([(-20,-1),(-20,-23),(-12,-31),(17,-31),(23,-24),(23,-1),(16,4),(-16,4)],"#453b34")
  poly([(-18,-24),(-10,-29),(16,-29),(22,-23),(-1,-18),(-18,-20)],"#a88652")
  poly([(-18,-18),(-1,-16),(22,-21),(22,-3),(-1,2),(-18,-2)],"#6c533b")
  for x in (-13,14):line([(x,-26),(x,-4)],"#b3a07a",3)
  poly([(-3,-15),(5,-15),(5,-9),(-3,-9)],"#d5b879")
  line([(1,-13),(1,-11)],"#473b30")
 elif i==23: # A broken octagonal ritual floor, sunk flat into the sand.
  ring=[(-34,-10),(-18,-22),(16,-22),(35,-11),(36,0),(18,9),(-16,9),(-34,1)]
  poly(ring,"#756660")
  line(ring+[ring[0]],"#b6a488",2)
  poly([(-24,-8),(0,-18),(23,-8),(0,5)],"#aa9082")
  line([(-21,-7),(0,-15),(20,-7),(0,2),(-21,-7)],"#4e5e67",2)
  for x in (-12,0,11):line([(x,-7),(x+3,-9),(x+4,-7),(x+1,-5)],"#8fbcbc")
 elif i==24: # Windbreak felt tent.
  poly([(-33,-1),(-26,-14),(-10,-47),(7,-44),(30,-4),(22,2)],"#665547")
  poly([(-30,-2),(-11,-44),(5,-41),(26,-5),(4,-9)],"#c3935f")
  poly([(-11,-44),(-3,-31),(4,-9),(-27,-3)],"#d8ae71")
  poly([(-9,-4),(0,-29),(14,-6)],"#433e38")
  line([(-9,-42),(2,-44),(16,-41)],"#e8c485",2)
  line([(-8,-39),(-36,0),(-40,1)],"#7c684e")
  line([(7,-40),(36,-1),(40,0)],"#7c684e")
 elif i==25:
  for x,y in [(-23,0),(-8,-6),(10,-13),(23,-18)]:
   poly([(x-8,y),(x-5,y-4),(x+4,y-6),(x+9,y-2),(x+8,y+2),(x-5,y+3)],"#858471")
   line([(x-6,y-1),(x+6,y-4)],"#b2b091")
 elif i==26:
  for x,y in [(-20,-3),(-8,-9),(10,-5),(19,-9)]:
   poly([(x-6,y),(x-3,y-4),(x+3,y-4),(x+6,y),(x+1,y+2)],"#579283")
   line([(x,y-1),(x,y-6)],"#b5d5ac")
   poly([(x-3,y-7),(x-1,y-10),(x+3,y-7),(x+2,y-5)],"#d5a5b1")
 for j in range(4):
  x=rng.randrange(30,66);y=rng.randrange(80,85);d.point((x,y),fill="#e3bf79")
for i in range(27):
 im=Image.new("RGBA",(96,96));plant(i,3,im);ivy.paste(im,((i%8)*96,(i//8)*96))
ivy.save(out/"props.png")
# Dedicated silhouettes with differentiated limbs and equipment for every creature.
ids=['bone-skeleton','bone-general','sand-scorpion','sand-worm','sand-golem','bone-wolf','flame-lizard','bone-king']
for s,name in enumerate(ids):
 atlas=Image.new("RGBA",(16*64,9*64))
 for pose in range(9):
  for direction in range(4):
   for f in range(4):
    im=Image.new("RGBA",(64,64));d=ImageDraw.Draw(im)
    ox=32+([-1,0,1,0][f] if pose in (1,3) else 0); oy=50-(f%2 if pose in (0,1) else 0)
    colors=[("#e1cca7","#715c55","#95ced3"),("#ebe0b7","#6b5453","#dc865c"),("#dca354","#683d33","#ffce76"),("#bd794a","#694332","#f1b06a"),("#ab8170","#634d4b","#f5c78b"),("#d7c9a7","#49434a","#8ccbd2"),("#bd6042","#694433","#ffa85e"),("#cec5dc","#55455d","#91dde8")]
    c,sh,gl=colors[s]
    def poly(points,color,outline=None):d.polygon([(ox+x,oy+y) for x,y in points],fill=color,outline=outline)
    def line(points,color,w=1):d.line([(ox+x,oy+y) for x,y in points],fill=color,width=w)
    d.ellipse((ox-18,oy-3,ox+19,oy+3),fill="#3c272859")
    if pose==8 or pose==6 and f>=2:
     for j in range(4):
      x=-16+j*9;line([(x,-1-f%2),(x+7,-4+j%2)],c,3)
     if s==3:
      poly([(-19,0),(-8,-5),(6,-6),(19,-1),(10,2)],c,sh)
     else:poly([(8,-5),(10,-11),(16,-11),(20,-7),(17,-3)],c,sh)
    elif s in (0,1,4,7):
     w=9 if s==0 else 14 if s in (1,4) else 17
     for k in (-1,1):
      kick=k*([0,3,0,-3][f]) if pose==1 else 0
      line([(k*5,-16),(k*7+kick,-8),(k*7+kick,-2)],sh,7 if s==4 else 5)
      line([(k*5,-16),(k*7+kick,-8),(k*8+kick,-2)],c,3)
      y= -21+((f*4) if pose==3 and k==1 else f%2)
      line([(k*w,-26),(k*(w+4),y),(k*(w+5),y+5)],c,5)
     poly([(-w,-28),(-3,-32),(w,-28),(w-4,-16),(1,-13),(-w+4,-17)],sh)
     for j in range(3):line([(-w+3,-26+j*4),(w-3,-26+j*4)],c,2)
     poly([(-7,-32),(-8,-42),(-3,-47),(5,-47),(9,-42),(8,-34),(4,-31)],c,sh)
     eye=[0,-3,3,0][direction]
     if direction!=3:
      line([(eye-4,-39),(eye+3,-39)],sh,3);line([(eye,-39),(eye+2,-39)],gl)
     if s in (1,7):
      poly([(-9,-44),(-13,-52),(-4,-47),(0,-54),(5,-47),(13,-51),(9,-43)],sh,c)
      line([(13,-21),(22+f,-37),(26+f,-42)],gl,3)
     if s==4:
      for x in [-13,13]:poly([(x-6,-23),(x-8,-30),(x,-36),(x+6,-30),(x+5,-24)],c,sh)
    else:
     head=-12 if direction==1 else 12 if direction==2 else 2
     width=17 if s==2 else 22
     if s!=3:
      for j,x in enumerate((-12,-6,6,12)):
       bend=((f+j)%3-1)*3 if pose==1 else j%2*2
       line([(x,-15),(x+bend,-8),(x+bend+2,-2)],sh,4)
       line([(x,-15),(x+bend,-8),(x+bend+2,-2)],c,2)
     poly([(-width,-11),(-width+3,-20),(-9,-25),(9,-23),(width,-17),(width-3,-9),(3,-7)],c,sh)
     for j in range(4):line([(-14+j*8,-19),(-11+j*8,-12)],sh,2)
     poly([(head-7,-16),(head-8,-23),(head,-29),(head+7,-23),(head+9,-15)],c,sh)
     line([(head-2,-22),(head+3,-22)],gl,2)
     if s==2:
      line([(1,-21),(-3,-32),(-12,-36),(-14,-29)],c,5)
      for x in (-1,1):poly([(x*16,-13),(x*25,-17),(x*28,-13),(x*24,-8),(x*20,-10)],c,sh)
     if s==3:
      poly([(head-9,-12),(head-9,-20),(head,-25),(head+10,-19),(head+8,-11),(head,-8)],sh,c)
      line([(head-6,-16),(head+6,-16)],gl,2)
     if s==5:
      for x in (-1,1):poly([(head+x*3,-26),(head+x*7,-37),(head+x*9,-25)],c,sh)
      line([(-16,-15),(-22,-20),(-28,-18)],c,3)
     if s==6:
      line([(-13,-17),(-23,-12),(-28,-9)],gl,3)
      for x in (-13,-6,1,8):poly([(x,-19),(x+1,-28),(x+4,-20)],gl)
    if pose in (2,3,7):
     for j in range(f+1):
      x=ox+(-1)**j*(9+j*5);y=oy-5-j*6
      d.point((x,y),fill=gl);d.line((x-1,y+2,x+1,y+2),fill=gl)
    if pose==5 and f%2==0:d.line((ox-12,oy-10,ox+12,oy-15),fill=gl)
    atlas.paste(im,((direction*4+f)*64,pose*64))
 for direction in range(4):
  for f in range(1,4):
   x=(direction*4+f)*64
   active=atlas.crop((x,0,x+64,64))
   lifted=Image.new("RGBA",(64,64))
   if s==3:
    lifted.alpha_composite(active,(0,(4-f)*6))
   else:
    for part,(left,top,right,bottom) in enumerate([(16,2,48,23),(8,23,56,39),(10,39,54,55)]):
     section=active.crop((left,top,right,bottom))
     lifted.alpha_composite(section,(left+((part%2)*2-1)*(4-f)*2,top+(4-f)*(5-part)))
   atlas.paste(lifted,(x,8*64))
 atlas.save(out/(name+"-normal.png"))
herbs=Image.new("RGBA",(10*32,4*32))
for j in range(4):
 for i,index in enumerate([8,2,5,7,4,1,14,13,15,9]):
  im=Image.new("RGBA",(96,96));plant(index,j,im)
  crop=im.crop(im.getbbox());crop.thumbnail((13+j*5,13+j*5),Image.Resampling.NEAREST)
  herbs.paste(crop,(i*32+(32-crop.width)//2,j*32+31-crop.height))
herbs.save(out/"treasures.png")

# Append the new icons without changing coordinates used by existing items.
import json

project=out.parents[2]
atlas_file=out.parent/"items/inventory-icons.png"
frames_file=project/"src/dao/ItemIconFrames.json"
catalog=json.loads(frames_file.read_text(encoding="utf-8"))
ids=["solar_fruit","scorch_flower","amber_dune_grass","ember_reishi","moon_lotus",
     "poplar_heartwood","phantom_sand_crystal","red_fire_crystal","bone_jade","yin_soul_herb"]
old_atlas=Image.open(atlas_file).convert("RGBA")
atlas=Image.new("RGBA",(256,384))
atlas.paste(old_atlas.crop((0,0,256,320)))
for index,item in enumerate(ids):
 x,y=index%8*32,320+index//8*32
 atlas.paste(herbs.crop((index*32,96,index*32+32,128)),(x,y))
 catalog[item]=[x,y]
atlas.save(atlas_file)
frames_file.write_text(json.dumps(catalog,indent=2)+"\n",encoding="utf-8")

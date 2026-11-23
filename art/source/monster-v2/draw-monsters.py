from pathlib import Path
from PIL import Image, ImageDraw
import math
W,H=80,72
OUT=Path('public/assets/fauna/monster-v2')
OUT.mkdir(parents=True,exist_ok=True)
DIRECTIONS=['south','west','east','north']
POSES=['idle','move','windup','active','recover','hurt','death','skill']
PAL={
 'wolf':['#121b22','#253033','#34474a','#46646a','#72938e','#8cf2c2'],
 'boar':['#271920','#452c2a','#663b32','#98503b','#d68054','#ff8767'],
 'toad':['#172d29','#284a41','#38675b','#58987a','#8cbe88','#edd47a'],
}
def sprite(species,elite,dr,pose,frame):
 im=Image.new('RGBA',(W,H));d=ImageDraw.Draw(im)
 ink,shadow,main,light,shine,eye=PAL[species]
 side=dr in ('west','east')
 sign=-1 if dr=='west' else 1
 death=pose=='death' and frame>=2
 lift=[0,2,5,2][frame] if species=='toad' and pose=='move' else 0
 breathe=([0,1,0,0][frame] if pose=='idle' else 0)
 crouch=2+frame//2 if pose=='windup' else (-2 if pose in ('active','skill') else 0)
 bounce=breathe+crouch-lift
 cx=40+(sign*min(5,frame*2) if side and pose=='active' else 0)
 cy=39+bounce
 ey=53 if death else 59
 d.ellipse((12 if elite else 16,ey-7,68 if elite else 64,ey+5),fill=(11,23,23,95))
 def poly(points,color,outline=None):
  d.polygon([(cx+x,cy+y) for x,y in points],fill=color,outline=outline)
 def line(points,color,width=1):
  d.line([(cx+x,cy+y) for x,y in points],fill=color,width=width)
 def oval(box,color,outline=None):
  a,b,c,e=box;d.ellipse((cx+a,cy+b,cx+c,cy+e),fill=color,outline=outline)
 if death:
  cy=49
  poly([(-29,3),(-24,-8),(-13,-12),(9,-11),(26,-7),(30,3),(20,7),(-26,7)],main,ink)
  line([(-25,-4),(-12,-8),(14,-7),(23,-3)],light,2)
  for j in range(-20,21,7):line([(j,-5),(j+4,-2),(j+2,0)],shine)
  line([(-24,0),(-19,2),(-15,0)],ink,2)
  return im
 if species=='toad':
  cy+=2
  poly([(-25,0),(-19,-13),(-11,-18),(10,-18),(21,-13),(27,1),(27,11),(15,17),(-16,17),(-27,10)],main,ink)
  for x in (-18,18):
   shift=((frame%2)*3 if pose in ('move','active') else 0)
   oval((x-9,7-shift,x+9,16),shadow,ink)
   poly([(x-4,13),(x+5,12),(x+9,18),(x+3,19),(x,16),(x-3,20),(x-8,19)],light,ink)
   oval((x-6,-11,x+6,3), '#565473' if elite else '#413b57',ink)
   if elite or pose in ('windup','skill'):
    oval((x-5,-9,x+5,3),'#766a94');line([(x-4,-5),(x,-8),(x+4,-5)],'#b4b9c2',2)
  poly([(-18,-2),(-15,-12),(-8,-16),(8,-16),(16,-12),(19,-2),(15,7),(-13,7)],light,ink)
  for x,y in [(-13,-8),(-7,-11),(0,-9),(8,-12),(14,-6),(-13,5),(13,5)]:
   oval((x-2,y-1,x+2,y+1),'#585473' if elite else '#3d5750')
  if dr!='north':
   face=sign*7 if side else 0
   if pose in ('windup','skill','active'):oval((face-12,0,face+12,16+frame//2),shine,ink)
   for x in ([face+8] if side else [-10,10]):
    oval((x-5,-11,x+5,-1),shadow,ink);oval((x-3,-10,x+3,-4),eye)
    line([(x,-9),(x,-4)],ink,2)
   line([(face-12,4),(face-4,6),(face+7,6),(face+12,4)],ink,2)
   if pose=='active':oval((face-7,4,face+8,8),'#571f46')
  else:
   line([(-13,-8),(0,-15),(13,-8)],shine,2)
  if elite:
   line([(-9,-3),(0,-8),(9,-3),(0,2),(-9,-3)],'#9acba8',2)
   oval((-3,-5,3,0),'#ca9db5')
  return im
 if side:
  def P(p,c,o=None):poly([(x*sign,y) for x,y in p],c,o)
  def L(p,c,w=1):line([(x*sign,y) for x,y in p],c,w)
  is_boar=species=='boar'
  # Distant legs before the ribcage.
  step=[-4,2,5,-2][frame] if pose in ('move','active') else 0
  for x,offset in [(-18,-step),(12,step)]:
   P([(x-4,3),(x+5,4),(x+offset+5,14),(x+offset+8,17),(x+offset-2,18),(x+offset-4,14)],shadow,ink)
  if is_boar:
   L([(-25,-10),(-31,-16),(-30,-20),(-26,-21),(-24,-18)],shine,2)
   P([(-28,3),(-29,-11),(-24,-17),(-12,-24),(3,-25),(16,-20),(23,-10),(23,8),(10,12),(-14,10)],main,ink)
   for k in range(4):
    x=-25+k*11;y=[-14,-21,-22,-20][k]
    P([(x,y+8),(x+5,y),(x+12,y+2),(x+16,y+10),(x+9,y+16),(x+2,y+13)],light,ink)
    L([(x+3,y+6),(x+6,y+3),(x+12,y+5)],shine,2)
    L([(x+9,y+5),(x+8,y+9),(x+11,y+12)],shadow)
   if elite:
    for x,y in [(-16,-20),(-4,-25),(8,-22),(17,-17)]:
     P([(x,y+5),(x+3,y-9),(x+10,y-4),(x+12,y+6)],'#b96c4d',ink)
     L([(x+3,y-7),(x+7,y-4)],'#f0b375')
   P([(8,-16),(16,-22),(23,-17),(23,-12),(32,-8),(34,1),(29,6),(20,5),(12,3)],main,ink)
   P([(24,0),(31,-2),(34,0),(34,4),(29,7),(24,6)],'#af695b',ink)
   P([(21,5),(26,6),(29,4),(31,-3),(31,6),(26,10),(22,9)],'#e0c394',ink)
   L([(20,-12),(24,-9)],eye,2)
  else:
   P([(-20,-5),(-32,-2),(-38,-8),(-36,-12),(-28,-10),(-19,-13)],shadow,ink)
   L([(-34,-9),(-27,-5),(-20,-9)],light,2)
   P([(-27,1),(-25,-10),(-14,-17),(4,-18),(10,-22),(20,-20),(24,-11),(18,5),(7,11),(-11,7),(-22,8)],main,ink)
   for x,y in [(-24,-7),(-19,-11),(-13,-12),(-7,-13),(-1,-14),(4,-15),(8,-16)]:
    P([(x,y+3),(x+5,y-1),(x+12,y),(x+8,y+3),(x+11,y+5)],light)
   for x,y in [(1,-15),(7,-18),(12,-19),(15,-18)]:
    P([(x-5,y+9),(x-5,y-3),(x+1,y-8 if elite else y-4),(x+6,y+2),(x+7,y+12),(x+2,y+10)],shine if elite else light,ink)
   P([(12,-17),(13,-28),(20,-25),(21,-19),(25,-18),(27,-21),(28,-12),(34,-7),(36,-2),(30,1),(24,-1),(16,1),(10,-7)],main,ink)
   L([(14,-23),(18,-22),(19,-19)],light,2)
   L([(20,-14),(25,-11),(29,-10)],light,2)
   L([(25,-10),(28,-9)],eye,2)
   L([(33,-5),(36,-3),(33,-2)],ink,2)
   if pose in ('windup','active','skill'):
    P([(20,-1),(29,0),(35,1),(28,7+frame//2),(23,5)],ink)
    P([(26,0),(27,4),(29,1),(31,0),(31,3),(33,1)],'#ddd6b3')
   if elite:L([(1,1),(-5,-3),(-2,-7),(4,-4),(1,1)],'#80cab0',2)
  for x,offset in [(-18,step),(8,-step)]:
   P([(x-5,0),(x+6,2),(x+offset+3,12),(x+offset+8,18),(x+offset-3,19),(x+offset-6,15)],main,ink)
   L([(x-3,4),(x+offset,13),(x+offset+4,17)],light,2)
   L([(x+offset+2,18),(x+offset+7,18)],shine)
 else:
  boar=species=='boar';w=22 if boar else 17
  if elite:w+=3
  poly([(-w,0),(-w,-13),(-13,-25),(13,-25),(w,-13),(w,2),(13,11),(-13,11)],main,ink)
  for i,x in enumerate((-w+5,w-5)):
   step=([0,3,5,2][(frame+i*2)%4] if pose in ('move','active') else 0)
   poly([(x-5,4),(x+5,4),(x+7,15+step),(x+3,19+step),(x-6,17+step)],shadow,ink)
   line([(x-3,7),(x-2,14+step),(x+3,16+step)],light,2)
  if boar:
   for y in (-22,-16,-10):
    poly([(-15,y+3),(-10,y-3),(10,y-3),(16,y+3),(9,y+8),(-9,y+8)],light,ink)
    line([(-9,y-1),(8,y-1)],shine,2)
   if elite:
    for x in (-13,0,13):poly([(x-4,-22),(x,-32),(x+5,-31),(x+6,-20)],shine,ink)
  else:
   for x in (-13,13):
    poly([(x-4,-16),(x-4,-28),(x+2,-27),(x+7,-14)],main,ink)
    line([(x-2,-26),(x+1,-23),(x+4,-19)],light,2)
   for y in (-21,-15,-9):
    line([(-13,y+5),(-7,y),(0,y+4),(8,y),(14,y+5)],shine if elite else light,2)
  if dr=='south':
   poly([(-15,-8),(-10,-15),(9,-15),(15,-8),(13,4),(7,12),(-7,12),(-13,4)],main,ink)
   line([(-12,-5),(-7,-4)],eye,2);line([(7,-4),(12,-5)],eye,2)
   poly([(-9,6),(-5,1),(5,1),(9,6),(6,10),(-6,10)],'#ac685e' if boar else shadow,ink)
   if boar:
    for sign2 in (-1,1):poly([(sign2*x,y) for x,y in [(9,9),(14,5),(16,-1),(17,7),(14,13),(9,13)]],'#e0c89a',ink)
   elif pose in ('windup','active','skill'):line([(-7,7),(0,12),(7,7)],'#d7d5ad',2)
  else:
   poly([(-4,-15),(-10,-22),(-4,-29),(4,-26),(6,-18),(3,-11)],shadow,ink)
 if pose=='hurt':
  line([(-4,-20),(0,-15),(4,-20)],'#f8b399',2)
 return im

for species in PAL:
 for level in ('normal','elite'):
  sheet=Image.new('RGBA',(W*16,H*8))
  for p,pose in enumerate(POSES):
   for j,dr in enumerate(DIRECTIONS):
    for frame in range(4):sheet.paste(sprite(species,level=='elite',dr,pose,frame),((j*4+frame)*W,p*H))
  sheet.save(OUT/f'{species}-{level}.png')
fx=Image.new('RGBA',(16*8,16)); d=ImageDraw.Draw(fx)
colors=['#e3cc9a','#709a9e','#c98471','#b687cc','#a5df9c','#dfd297','#df8250','#b1e6c5']
for i,color in enumerate(colors):
 x=i*16
 d.polygon([(x+8,0),(x+10,5),(x+15,8),(x+10,10),(x+8,15),(x+5,11),(x,8),(x+5,5)],fill=color)
 d.polygon([(x+8,4),(x+11,8),(x+8,11),(x+5,8)],fill='#eee2b8')
fx.save(OUT/'monster-fx.png')
loot=Image.new('RGBA',(16*8,16));d=ImageDraw.Draw(loot)
for i,c in enumerate(colors):
 x=16*i
 if i in (0,2):d.polygon([(x+4,3),(x+12,2),(x+12,8),(x+8,13),(x+4,15),(x+8,8)],fill=c,outline='#322b27')
 elif i in (1,3):d.polygon([(x+2,6),(x+6,2),(x+12,3),(x+14,8),(x+10,14),(x+4,12)],fill=c,outline='#322b27');d.line((x+5,6,x+9,4,x+12,7),fill='#e6cc9c')
 else:d.ellipse((x+2,2,x+13,13),fill=c,outline='#322b27',width=2);d.line((x+5,6,x+7,4,x+10,5),fill='#f9dda0',width=2)
loot.save(OUT/'monster-loot.png')

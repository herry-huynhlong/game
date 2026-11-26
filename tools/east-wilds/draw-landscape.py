from math import sin, cos, pi
from pathlib import Path
from random import Random
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/"public/assets/east-wilds/overhaul"
OUT.mkdir(parents=True,exist_ok=True)

# Each group is a material ramp, ordered by shade rather than random contrast.
PALETTES=[
    ("#ab804a","#c49858","#d4ad6a","#e4c482","#eed298"),
    ("#ae9068","#c2a477","#d5ba89","#e5cd9c","#f1dbac"),
    ("#834437","#a55a43","#ba6e50","#cd845e","#e29f71"),
    ("#665346","#87684f","#9e7e57","#b19364","#c2a477"),
    ("#435b4c","#5e7552","#758654","#83975d","#a2a773"),
    ("#645c52","#827562","#9c8e75","#b2a183","#caba97"),
    ("#80523b","#9e673f","#b4804a","#cd9557","#e4ab65"),
    ("#8a694f","#ab8a5f","#bfa171","#d5b887","#e3c99a"),
]

def terrain():
    atlas=Image.new("RGBA",(256,256))
    for group,p in enumerate(PALETTES):
        for variant in range(8):
            rng=Random(19937+group*211+variant*53)
            im=Image.new("RGBA",(32,32),p[2]); d=ImageDraw.Draw(im)
            if group in (0,1,2,6) and variant>=4:
                y=7+(variant//2)*4
                arc=[(0,y+4),(5,y+2),(10,y),(17,y-2),(23,y-2),(31,y)]
                d.polygon(arc+[(31,y+5),(25,y+4),(18,y+5),(9,y+9),(0,y+11)],fill=p[1])
                d.polygon([(0,y+3),(5,y+1),(10,y-1),(17,y-3),(23,y-3),(31,y-1),
                           (31,y),(23,y-1),(18,y),(11,y+3),(4,y+4),(0,y+6)],fill=p[3])
                if variant%2:d.line([(4,y+10),(11,y+8),(15,y+8),(23,y+6)],fill=p[0])
                if group==6:
                    for k in range(2):
                        cy=21+4*k
                        d.line([(4,cy+2),(10,cy),(18,cy-1),(25,cy)],fill=p[1])
            elif group==3:
                x,y=10+variant%4,6+variant//4*8
                d.polygon([(0,0),(x+5,0),(x-1,y),(x+5,y+6),(4,24),(0,25)],fill=p[1])
                cracks=[[(x+6,0),(x,y),(x+5,y+5),(x+2,y+13)],
                        [(x+5,y+5),(x+12,y+6),(32,y-1)],[(x+2,y+13),(x-4,y+17),(x-6,32)]]
                for crack in cracks:
                    d.line(crack,fill=p[0])
                    d.line([(x+1,y+1) for x,y in crack],fill=p[3])
            elif group==4:
                d.polygon([(0,4),(9,8),(18,6),(27,7),(32,13),(32,29),(20,25),(11,29),(0,23)],fill=p[1])
                for i in range(6):
                    x,y=rng.randrange(2,29),rng.randrange(2,29)
                    d.line([(x-2,y-2),(x,y),(x+1,y-4)],fill=p[3])
                    d.point((x,y-1),fill=p[4] if i%3==0 else p[2])
            elif group==5:
                for k,yy in enumerate((0,11,22)):
                    shift=(k*9+variant*13)%17-8
                    for xx in (shift,shift+17,shift+34):
                        d.polygon([(xx,yy),(xx+14,yy),(xx+17,yy+3),(xx+15,yy+10),(xx+1,yy+10),(xx,yy+8)],fill=p[1+(variant+k)%2])
                        d.line([(xx+1,yy+1),(xx+13,yy+1),(xx+16,yy+4)],fill=p[3])
                        d.line([(xx,yy+9),(xx+15,yy+9)],fill=p[0])
                if variant in (1,2,5,6):
                    d.line([(11,8),(15,12),(13,17),(20,19)],fill=p[0])
            else:
                for i in range(4):
                    x,y=rng.randrange(2,29),rng.randrange(2,29)
                    d.line([(x,y),(x+2,y-1),(x+4,y-1)],fill=p[(i%2)*3+1])
            for i in range(10):
                x,y=rng.randrange(32),rng.randrange(32)
                d.line([(x,y),(x+1+i%3,y)],fill=p[3] if i%3 else p[1])
            atlas.paste(im,(variant*32,group*32))
    atlas.save(OUT/"terrain.png")

def shore():
    atlas=Image.new("RGBA",(128,128))
    for mask in range(1,16):
        im=Image.new("RGBA",(32,32)); d=ImageDraw.Draw(im)
        for side in range(4):
            if not mask&(1<<side):continue
            for u in range(32):
                depth=6+round(2*sin(u*pi/16)+sin(u*pi/8))
                if mask&(1<<((side+1)%4)) and u>18:depth+=round((u-18)*.37)
                if mask&(1<<((side-1)%4)) and u<14:depth+=round((14-u)*.37)
                for v in range(depth):
                    x,y=((u,v),(31-v,u),(31-u,31-v),(v,31-u))[side]
                    if v<2:color="#7e8f61"
                    elif v<depth-3:color=("#c1a879" if (u+2*v)%9==0 else "#ab956e")
                    elif v<depth-2:color="#778e78"
                    elif v<depth-1:color="#709f92"
                    else:color="#8bc5af90"
                    d.point((x,y),fill=color)
        atlas.paste(im,((mask%4)*32,(mask//4)*32))
    atlas.save(OUT/"shore.png")

INK="#373337"
WOOD=("#42322c","#6a4836","#916544","#ba8c59","#d4a766")
DRY=("#514336","#7d654a","#a58b61","#c6aa72","#dfc185")
LEAF=("#243f36","#365c42","#4e784d","#6e935e","#99ac70")
GOLD=("#57473b","#75603f","#a28a4d","#bca257","#dcbe6b")
STONE=("#4e4645","#6f5e56","#998272","#b79b82","#d4bba0")
RED=("#54343a","#7d4742","#a85f49","#c77953","#e09767")
LIME=("#33493b","#4c6645","#6f8654","#95a76c","#bac486")
LOTUS=("#3f6554","#608e6b","#9c6b79","#dc9ba9","#f4cdb7")
FIRE=("#603b43","#9d4d51","#ba6352","#dc9560","#f2c384")

class Prop:
    def __init__(self,stage=3):
        self.im=Image.new("RGBA",(96,96))
        self.d=ImageDraw.Draw(self.im)
        self.stage=stage
    def p(self,points,color,outline=None):
        self.d.polygon([(round(48+x),round(82+y)) for x,y in points],fill=color,outline=outline)
    def l(self,points,color,width=1):
        self.d.line([(round(48+x),round(82+y)) for x,y in points],fill=color,width=width)
    def dot(self,x,y,c):
        self.d.point((round(48+x),round(82+y)),fill=c)
    def shade(self,w,h,color=(46,35,31,52)):
        self.d.ellipse((48-w//2,82-h//2,48+w//2,82+h//2),fill=color)
    def cluster(self,x,y,w,h,c,style=0):
        self.p([(x-w,y+1),(x-w+2,y-h//3),(x-w//2,y-h//2),(x-w//3,y-h),
                (x+w//5,y-h+2),(x+w//2,y-h//2),(x+w-1,y-h//2),(x+w,y+1),
                (x+w//2,y+4),(x-w//2,y+3)],c[1],c[0])
        self.p([(x-w+3,y),(x-w+5,y-h//3),(x-w//2,y-h//2),(x-w//3,y-h+2),
                (x+w//5,y-h+3),(x+w//2,y-h//3),(x+w//3,y+1),(x-w//4,y+2)],c[2])
        self.l([(x-w//2,y-h//2),(x-w//3,y-h+2),(x+w//6,y-h+3)],c[3],2)
        self.l([(x-w//4,y-h+2),(x,y-h+2),(x+w//6,y-h+5)],c[4])
        if style:
            for i in range(5):
                xx=x-w//2+(w*i//5)
                yy=y-h//2+i%3*3
                self.l([(xx,yy),(xx+2,yy-1)],c[3 if i%2 else 4])

def cactus(a,succulent=False):
    if succulent:
        a.shade(37,8)
        for i in range(13):
            angle=i*2.4
            w=7+i%3*2
            x=cos(angle)*(13-i//2);y=-4+sin(angle)*(6-i//3)
            a.p([(0,-2),(x-3,y-3),(x,y-w),(x+4,y-2),(x+1,y+2)],LIME[1+i%3],LIME[0])
            a.l([(x-1,y-w+3),(x-2,y-3),(0,-2)],LIME[4])
        return
    a.shade(57,12)
    for x,base,h,w,bend in [(-16,-8,30,6,-5),(-3,0,57,10,1),(10,-4,42,8,4),(23,-2,22,5,1)]:
        a.p([(x-w,base),(x-w,base-h//2),(x-w+bend+1,base-h+5),
             (x+bend-1,base-h),(x+w+bend-2,base-h+2),(x+w+bend,base-h+10),
             (x+w,base-3),(x+4,base+2)],LEAF[1],LEAF[0])
        a.p([(x-w+2,base-1),(x-w+2,base-h//2),(x-w+bend+3,base-h+6),
             (x+bend,base-h+1),(x+bend+3,base-h+5),(x+1,base-3)],LEAF[2])
        for i in (-4,0,4):
            if abs(i)>=w:continue
            a.l([(x+i,base-3),(x+i+bend//2,base-h//2),(x+i+bend,base-h+6)],LIME[3 if not i else 2])
        for j in range(8,h-1,8):
            a.l([(x-w+1,base-j),(x-w-2,base-j-2)],DRY[4])
            a.dot(x+w-2,base-j+1,LIME[4])
    a.p([(-7,-57),(-11,-63),(-7,-67),(-3,-63),(1,-66),(4,-62),(1,-57)],FIRE[3],FIRE[1])
    a.dot(-4,-63,FIRE[4])

def grove(a,style):
    # Each outline has its own structure and crowning habit.
    branches={
        'poplar':[(-24,-52),(-16,-67),(1,-66),(17,-62),(25,-48),(-1,-47),(-14,-39)],
        'gold':[(-26,-44),(-18,-58),(2,-68),(16,-50),(29,-37),(0,-42)],
        'fruit':[(-25,-47),(-10,-65),(10,-62),(25,-50),(18,-37),(-6,-42)],
        'old':[(-36,-49),(-19,-62),(-4,-71),(14,-61),(31,-72),(34,-47),(-14,-43),(6,-33)],
        'snag':[(-27,-39),(-19,-58),(3,-66),(24,-44),(20,-59)],
        'thorn':[(-20,-31),(-19,-50),(0,-53),(12,-38),(25,-43),(27,-28)],
    }[style]
    a.shade(66,16)
    lean=8 if style in ('old','gold') else -6 if style=='snag' else 2
    a.p([(-20,1),(-10,-5),(-6,-17),(-7,-31),(-1+lean,-55),(5+lean,-63),
         (11+lean,-56),(4+lean,-40),(4, -23),(10,-9),(22,2),(12,3),(3,-1),(-5,4)],WOOD[1],INK)
    a.p([(-16,1),(-5,-8),(-3,-23),(0,-33),(4+lean,-55),(8+lean,-58),
         (4+lean,-40),(0,-23),(4,-13),(-3,-5),(-9,3)],WOOD[2])
    for x,y in branches:
        elbow=(round(x*.55),y+10)
        a.l([(lean,-32),elbow,(x,y)],WOOD[0],6)
        a.l([(lean-1,-33),(elbow[0]-1,elbow[1]-1),(x-1,y)],WOOD[2],3)
        if style=='snag':
            a.l([elbow,(x+6,y-2),(x+10,y-9)],WOOD[1],2)
            a.l([(x,y),(x-2,y-7)],WOOD[3])
    for x,y in [(-22,-1),(-17,4),(15,1),(25,4)]:
        a.l([(5 if x>0 else -3,-9),(x//2, y-2),(x,y)],WOOD[1],4)
        a.l([(x//2,y-3),(x,y-1)],WOOD[3])
    for x,y in [(-4,-27),(0,-17),(3,-22),(4,-6),(lean,-43),(lean+2,-47)]:
        a.l([(x-1,y-5),(x+1,y-2),(x,y+4)],WOOD[3])
    if style=='snag':return
    color=GOLD if style=='gold' else LEAF
    for i,(x,y) in enumerate(branches):
        w=(11+3*(i%3)) if style!='thorn' else (9+i%3)
        a.cluster(x,y,w,8+i%4*2,color,1)
        if style=='fruit' and i%2==0:
            for dx,dy in [(-4,2),(1,5),(6,1)]:
                a.p([(x+dx,y+dy),(x+dx+3,y+dy-1),(x+dx+5,y+dy+1),(x+dx+3,y+dy+4),(x+dx,y+dy+3)],FIRE[3],FIRE[0])
                a.dot(x+dx+1,y+dy,FIRE[4])
        if style=='thorn':
            a.l([(x-3,y-6),(x-2,y-9),(x,y-7)],DRY[4])

def palm(a,young=False,bent=False):
    a.shade(57 if not young else 43,9)
    h=42 if young else 65
    lean=-14 if bent else 6
    trunk=[(0,0),(-5,-10),(lean//3,-h//2),(lean,-h)]
    a.l(trunk,WOOD[0],10 if not young else 7)
    a.l([(x-2,y) for x,y in trunk],WOOD[2],5 if not young else 3)
    for k in range(4,h-1,5):
        x=round(lean*k*k/(h*h))-2
        a.l([(x-2,-k),(x+3,-k+1)],WOOD[3] if k%2 else WOOD[4])
    for d in (-1,1):
        for length,dy in [(32,10),(29,-5),(20,-17),(26,20)]:
            length=round(length*(.68 if young else 1))
            p=[(lean,-h),(lean+d*length//3,-h-10+dy//3),(lean+d*length*2//3,-h-7+dy//2),
               (lean+d*length,-h+dy)]
            a.l(p,LEAF[0],6)
            a.l(p,LEAF[2],4)
            a.l([(x,y-1) for x,y in p],LEAF[3])
            for i in range(1,7):
                x=lean+d*i*length//7
                y=-h-7+round(i*i*(dy+7)/49)
                a.l([(x,y),(x+d*4,y+6+i%3),(x+d*3,y+10)],LEAF[2 if i%2 else 3],2)
    for x,y in [(-3,5),(-1,9),(3,10),(6,6)]:
        a.p([(lean+x-1,-h+y-1),(lean+x+2,-h+y-1),(lean+x+3,-h+y+1),(lean+x+1,-h+y+3)],WOOD[3],WOOD[0])

def herbs(a,mode):
    colors={'scorch':FIRE,'grass':LIME,'mushroom':RED,'lotus':LOTUS,'dry':DRY,'flowers':LOTUS,'shade':LEAF}
    c=colors[mode]
    a.shade(35,8,(52,48,35,40))
    if mode in ('lotus','flowers'):
        for i,(x,y) in enumerate([(-13,-2),(1,-5),(14,-3),(-2,2)]):
            a.p([(x-8,y),(x-5,y-5),(x+4,y-5),(x+8,y-2),(x+2,y+1),(x+6,y+2),(x+1,y+4),(x-6,y+3)],c[1],c[0])
            a.l([(x-6,y-1),(x-2,y-3),(x+3,y-3)],LIME[3])
        for x,y in [(-7,-10-a.stage*2),(11,-9-a.stage)]:
            a.l([(x-3,0),(x-1,y+3),(x,y)],LEAF[2],2)
            if a.stage<2:a.p([(x-3,y),(x-2,y-5),(x+1,y-7),(x+3,y-2),(x+2,y+2)],c[2],c[0])
            else:
                a.p([(x-9,y-4),(x-4,y-4),(x-3,y-9),(x,y-6),(x+3,y-9),(x+5,y-4),(x+9,y-5),
                     (x+6,y+1),(x,y+4),(x-6,y+1)],c[3],c[2])
                a.l([(x-3,y-4),(x,y),(x+4,y-5)],c[4],2)
                a.dot(x,y-2,GOLD[4])
        return
    if mode=='mushroom':
        for i,(x,y) in enumerate([(-12,-10),(2,-15),(14,-8)]):
            y+=8-a.stage*3
            a.l([(x-3,-1),(x-2,y+2),(x,y)],WOOD[3],3)
            a.cluster(x,y,10-i*2,7-i%2,c,1)
            a.l([(x-4,y+1),(x,y),(x+5,y+1)],FIRE[4],1)
        return
    for i in range(7):
        x=-24+i*8
        h=7+a.stage*(2+i%3)+i%4*2
        a.l([(x//3,0),(x//2,-h//2),(x,-h)],c[0],3)
        a.l([(x//3,-1),(x//2,-h//2),(x,-h)],c[2],2)
        for j in range(1,4):
            dx=round(x*j/4)
            y=-h*j//4
            k=-1 if (i+j)%2 else 1
            a.p([(dx,y+1),(dx+k*6,y-4),(dx+k*3,y-6),(dx,y-2)],c[1+j%3])
        if mode=='scorch' and i%2:
            a.p([(x-5,-h-2),(x-3,-h-6),(x,-h-4),(x+4,-h-7),(x+6,-h-3),(x+3,-h+1),(x-3,-h+1)],c[3],c[1])
            a.dot(x,-h-3,c[4])
        if mode=='shade':a.l([(x-3,-h-3),(x,-h-5),(x+4,-h-2)],"#9fafa7")

def crag(a,mode):
    c=RED if mode==13 else STONE
    a.shade(80,15)
    if mode==20:
        a.p([(-21,4),(-24,-10),(-15,-16),(-13,-30),(-5,-38),(-9,-50),(-5,-61),
             (6,-61),(13,-54),(12,-41),(8,-36),(16,-29),(15,-13),(25,-7),(22,5)],c[1],INK)
        a.p([(-8,-55),(-4,-59),(5,-59),(9,-53),(4,-44),(-4,-46)],c[3])
        a.p([(-14,-31),(-7,-36),(0,-41),(5,-33),(11,-20),(10,-14),(-8,-17)],c[2])
        a.l([(-18,-4),(-9,-10),(7,-13),(21,-7)],c[4],2)
        a.l([(-6,-50),(-3,-49),(0,-50),(5,-51)],c[0],2)
        a.l([(8,-29),(2,-24),(4,-19),(-1,-15)],c[0])
        return
    for i,(x,y,w,h) in enumerate([(-20,-3,17,34),(2,0,24,66),(21,1,17,41),(-6,4,13,18)]):
        if mode==14:h//=2;w=round(w*.88)
        a.p([(x-w,y),(x-w+2,y-h//3),(x-w//2,y-h+12),(x+3,y-h),
             (x+w//2,y-h+9),(x+w-4,y-h//5),(x+w,y-3),(x+10,y+4)],c[1],c[0])
        a.p([(x-w+2,y-1),(x-w+4,y-h//3),(x-w//2,y-h+13),(x+2,y-h+1),
             (x+3,y-h+16),(x-2,y-h//2),(x+4,y-h//4),(x-3,y+1)],c[2])
        for j in range(1,4):
            yy=y-j*h//4
            a.l([(x-w//2,yy),(x-1,yy-3),(x+5,yy-5),(x+w//3,yy-3)],c[0],2)
            a.l([(x-w//2,yy-2),(x-1,yy-5),(x+4,yy-6)],c[3])
        a.l([(x-w//2+1,y-h+14),(x+2,y-h+2),(x+7,y-h+10)],c[4])

def ruins(a,index):
    c=STONE
    a.shade(63,12)
    if index==15:
        for k in range(6):
            x=-25+k*7;y=-1+k%2*2
            a.l([(x,y),(x-3,y-4),(x,y-8),(x+5,y-11)],c[0],4)
            a.l([(x,y),(x-2,y-4),(x,y-8),(x+5,y-11)],DRY[4],2)
        a.p([(12,-4),(11,-12),(16,-18),(24,-17),(29,-12),(28,-7),(23,-4),(23,0),(14,0)],DRY[3],INK)
        a.l([(16,-9),(19,-9)],INK,2)
        a.dot(24,-10,INK)
        return
    if index in (17,18,19):
        w=(12,19,36)[index-17];h=(62,45,55)[index-17]
        shape=[(-w-4,3),(-w-2,-9),(-w,-h+10),(-w+8,-h),(w-10,-h-4),
               (w,-h+6),(w-3,-17),(w+4,0),(w-1,5)]
        a.p(shape,c[1],c[0])
        a.p([(-w,-7),(-w+2,-h+11),(-w+8,-h+1),(w-9,-h-3),(w-5,-h+8),
             (w-8,-8),(3,-5)],c[2])
        a.l([(-w,-h+11),(-w+8,-h+2),(w-10,-h-2),(w-5,-h+8)],c[4],2)
        a.l([(-w-3,0),(0,1),(w+2,-1)],c[3],3)
        if index==17:
            for y in (-12,-25,-40,-55):a.l([(-w,y),(0,y-2),(w-3,y-2)],c[0])
        if index==18:
            for y,dx in [(-30,0),(-23,4),(-16,1)]:
                a.l([(-9+dx,y),(1+dx,y),(7+dx,y-2)],c[0],2)
                a.l([(-4+dx,y-2),(-4+dx,y+4)],c[0])
        if index==19:
            a.p([(-18,1),(-18,-25),(-12,-35),(12,-37),(20,-26),(21,0),(14,4),(-17,4)],"#3c3a38",c[0])
            a.l([(-22,0),(-21,-25),(-16,-38),(14,-40),(22,-26),(23,0)],c[3],4)
            a.l([(-12,-2),(0,-4),(14,-3)],c[1],2)
        return
    a.p([(-37,1),(-37,-22),(-30,-32),(-18,-33),(-13,-28),(-7,-29),(-1,-34),
         (12,-35),(18,-31),(27,-34),(36,-25),(35,-3),(28,4)],c[1],c[0])
    for row in range(4):
        y=-2-row*7
        for x in range(-35+(row%2)*6,30,12):
            a.p([(x,y),(x,y-4),(x+3,y-6),(x+9,y-6),(x+11,y-4),(x+10,y)],c[2+((x+row)%4==0)])
            a.l([(x+2,y-5),(x+9,y-5)],c[4 if row==3 else 3])
    a.l([(-30,-29),(-19,-30),(-11,-25),(-2,-30),(10,-32),(18,-27),(27,-30),(35,-24)],c[3],2)

def fixture(a,idx):
    c=STONE
    a.shade(63,11)
    if idx==21:
        a.p([(-30,-9),(-27,-29),(-16,-38),(10,-40),(27,-31),(31,-12),(23,-3),(-21,-3)],c[1],INK)
        a.p([(-29,-28),(-17,-39),(12,-41),(27,-31),(22,-22),(7,-17),(-13,-18)],c[3],c[0])
        a.p([(-20,-28),(-11,-35),(10,-36),(19,-30),(18,-26),(7,-22),(-11,-22)],"#244a4c",c[0])
        a.l([(-16,-28),(-2,-31),(10,-31),(15,-29)],"#79a49a",2)
        for x in (-20,-10,0,11,19):
            a.l([(x,-16),(x-1,-9),(x+1,-6)],c[0],2)
        a.l([(-28,-9),(-15,-8),(8,-8),(24,-11)],c[3])
        a.l([(-22,-38),(-15,-42),(11,-43),(23,-36)],c[4],2)
    elif idx==22:
        a.p([(-24,-5),(-22,-26),(-17,-33),(-9,-36),(20,-36),(25,-29),(26,-5),(14,3),(-17,3)],WOOD[1],WOOD[0])
        a.p([(-21,-26),(-16,-33),(-7,-36),(16,-36),(23,-31),(23,-25),
             (9,-20),(-12,-21)],WOOD[3],WOOD[0])
        a.l([(-22,-19),(-9,-16),(14,-17),(24,-22)],WOOD[0],2)
        for x in (-12,15):
            a.l([(x-5,-33),(x,-35),(x+2,-18),(x+2,0)],STONE[0],4)
            a.l([(x-4,-32),(x-1,-32),(x,-18),(x,0)],GOLD[3],2)
        a.p([(-4,-17),(6,-17),(7,-9),(3,-7),(-4,-9)],GOLD[3],GOLD[0])
        a.l([(1,-14),(1,-11)],WOOD[0],2)
    elif idx==23:
        octagon=[(-35,-3),(-32,-13),(-15,-22),(15,-22),(34,-12),(37,-3),(24,7),(-24,8)]
        a.p(octagon,c[1],c[0])
        a.l(octagon+[octagon[0]],c[3],2)
        a.p([(-26,-7),(0,-19),(27,-7),(24,-3),(0,5),(-25,-2)],"#57706a",c[0])
        a.l([(-24,-6),(0,-17),(24,-6),(0,2),(-24,-6)],"#a5b199",2)
        for x,y in [(-16,-6),(-5,-10),(7,-10),(15,-5),(4,-2),(-7,-2)]:
            a.l([(x-2,y+1),(x,y-2),(x+2,y),(x+1,y+2)],"#c0cb9f")
    elif idx==24:
        a.p([(-40,0),(-29,-17),(-19,-49),(6,-52),(28,-42),(37,-4),(18,-1),(-5,3)],DRY[1],WOOD[0])
        a.p([(-39,-1),(-19,-47),(5,-52),(27,-42),(25,-27),(35,-5),(11,-3)],DRY[3],DRY[0])
        a.p([(-20,-48),(-12,-27),(-10,-7),(-36,-1),(-26,-24)],DRY[4])
        a.p([(-5,-6),(6,-35),(21,-5),(18,2),(8,1)],WOOD[0],INK)
        for x,y in [(-23,-16),(-13,-20),(20,-25),(25,-14),(-17,-35)]:
            a.l([(x-1,y+4),(x+4,y),(x+9,y-7)],DRY[2],2)
        a.l([(-18,-43),(-43,2)],DRY[0])
        a.l([(25,-42),(42,-2)],DRY[0])
        a.l([(-19,-48),(5,-52),(27,-42)],DRY[4],2)
    else:
        for x,y,w in [(-26,1,11),(-11,-5,10),(7,-12,12),(22,-19,10),(9,4,9)]:
            a.p([(x-w,y),(x-w+3,y-5),(x+3,y-7),(x+w,y-4),(x+w,y+2),(x+2,y+5),(x-w+3,y+3)],c[1],c[0])
            a.l([(x-w+3,y-4),(x+3,y-6),(x+w-2,y-3)],c[3],2)

def render_prop(index,stage=3):
    p=Prop(stage)
    if index in (0,11):cactus(p,index==11)
    elif index in (1,3,6,8,28,31):grove(p,{1:'poplar',3:'gold',6:'snag',8:'fruit',28:'old',31:'thorn'}[index])
    elif index in (12,27,30):palm(p,index==27,index==30)
    elif index in (2,4,5,7,9,10,26,29):herbs(p,{2:'scorch',4:'lotus',5:'grass',7:'mushroom',9:'shade',10:'dry',26:'lotus',29:'flowers'}[index])
    elif index in (13,14,20):crag(p,index)
    elif index in (15,16,17,18,19):ruins(p,index)
    else:fixture(p,index)
    return p.im

def icon_mineral(index,stage):
    p=Prop(stage)
    c={6:("#433c63","#65547f","#8a78a2","#b39abb","#d8cce3"),
       7:("#64413e","#8a4d43","#b4614c","#e29963","#ffd591"),
       8:("#3f5e53","#477766","#64a686","#8fc8a5","#cce3b4")}[index]
    p.shade(41,7)
    for i,(x,y,h) in enumerate([(-12,1,13),(1,2,24),(12,2,12),(-5,4,7)]):
        h=h*(2+stage)/5
        p.p([(x-6,y),(x-5,y-h+5),(x,y-h),(x+7,y-h/2),(x+5,y+2)],c[1],c[0])
        p.p([(x-5,y-h+5),(x,y-h),(x+3,y-h+4),(x,y+1),(x-4,y)],c[2])
        p.l([(x-3,y-h+4),(x,y-h+1),(x+3,y-h+3)],c[4],2)
        if i%2:p.l([(x+1,y-h//2),(x+3,y-h//3),(x+1,y)],c[3])
    return p.im

def landscape_atlases():
    terrain()
    shore()
    sheets=Image.new("RGBA",(768,384))
    for index in range(32):
        sheets.paste(render_prop(index),((index%8)*96,(index//8)*96))
    sheets.save(OUT/"props.png")
    atlas=Image.new("RGBA",(320,128))
    for stage in range(4):
        for index,prop in enumerate([8,2,5,7,4,1,14,13,15,9]):
            source=icon_mineral(index,stage) if index in (6,7,8) else render_prop(prop,stage)
            crop=source.crop(source.getbbox())
            crop.thumbnail((15+5*stage,15+5*stage),Image.Resampling.NEAREST)
            atlas.paste(crop,(32*index+(32-crop.width)//2,32*stage+31-crop.height))
    atlas.save(OUT/"treasures.png")
    legacy=ROOT/"public/assets/items/inventory-icons.png"
    items=Image.open(legacy).convert("RGBA")
    if items.size!=(256,384):raise ValueError("Unexpected inventory atlas bounds")
    for index in range(10):
        items.paste(atlas.crop((index*32,96,index*32+32,128)),(index%8*32,320+index//8*32))
    items.save(legacy)

def landforms():
    atlas=Image.new("RGBA",(640,192))
    for i in range(8):
        im=Image.new("RGBA",(160,96));d=ImageDraw.Draw(im)
        if i<6:
            p=PALETTES[[0,1,2,0,6,3][i]]
            shape=[(4,62),(24,50),(48,35),(73,29-i*2),(99,31-i),(120,41),(139,54),(156,57),
                   (153,61),(134,60),(102,51),(83,48),(55,52),(32,62),(11,66)]
            d.polygon(shape,fill=p[1]+"8f")
            d.line(shape[:8],fill=p[3]+"e0",width=2)
            d.line([(x,y+1) for x,y in shape[:8]],fill=p[4]+"95")
            for j in range(4):
                x=25+j*18;y=61-j*3
                d.line([(x,y),(x+7,y-2),(x+14,y-2)],fill=p[0]+"a0")
        else:
            p=PALETTES[4 if i==6 else 3]
            for j,(x,y,w) in enumerate([(24,61,17),(58,52,22),(93,42,18),(119,62,20),(109,35,14),(40,31,13)]):
                d.polygon([(x-w,y+1),(x-w+4,y-7),(x-4,y-11),(x+6,y-9),(x+w,y-2),(x+w-2,y+4),
                           (x+6,y+7),(x-w+5,y+6)],fill=p[1]+"bd")
                for n in range(7):
                    dx=x-w//2+n*2;dy=y+(n%4)*2-5
                    d.line([(dx-1,dy+2),(dx,dy),(dx+2,dy-1)],fill=p[(n+j)%2+2]+"cf")
        atlas.paste(im,((i%4)*160,(i//4)*96))
    atlas.save(OUT/"landforms.png")

def seams():
    tiles=Image.open(OUT/"terrain.png").convert("RGBA")
    atlas=Image.new("RGBA",(512,512))
    for source in range(8):
        for neighbor in range(8):
            for side in range(4):
                index=(source*8+neighbor)*4+side
                variant=(source*13+neighbor*11+side)%4
                im=tiles.crop((variant*32,source*32,variant*32+32,source*32+32))
                other=tiles.crop((variant*32,neighbor*32,variant*32+32,neighbor*32+32))
                for u in range(32):
                    width=12+round(sin(u/4+source)*4+sin(u/9+neighbor)*3)
                    for v in range(width):
                        x,y=((u,v),(31-v,u),(31-u,31-v),(v,31-u))[side]
                        t=round(max(0,(1-v/width))*.83*7)/7
                        a,b=im.getpixel((x,y)),other.getpixel((x,y))
                        im.putpixel((x,y),tuple(round(p+(q-p)*t) for p,q in zip(a,b)))
                atlas.paste(im,((index%16)*32,(index//16)*32))
    atlas.save(OUT/"seams.png")

if __name__=="__main__":
    landscape_atlases()
    landforms()
    seams()

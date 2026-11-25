"""Native-pixel artwork for the Van Linh species and six West Wilds trees."""
from math import cos, sin, pi
from pathlib import Path
from random import Random

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[3] / 'public/assets/west-wilds'
ROOT.mkdir(parents=True, exist_ok=True)
POSES = ('idle','move','windup','active','recover','hurt','death','skill')
DIRS = ('south','west','east','north')
WOOD = ('#493432','#704838','#a3714b','#c3a278')
TREE_PALETTES = (
    ('#263b35','#355849','#498266','#7ea16a','#b9c38a'),
    ('#253638','#34554f','#427e70','#74a795','#a8ce9e'),
    ('#254a47','#2d6c63','#43a28a','#91cdb0','#c6ecb2'),
    ('#3c2638','#653647','#934c5a','#ca765e','#eea877'),
    ('#313a43','#545559','#75756a','#9a9982','#c2b496'),
    ('#243f45','#31605e','#51877c','#80b99c','#b8dfaf'),
)
SPECIES = ('wood','millennial','flower','vine','centipede','python','stag','wood-king')


def tree(index):
    image=Image.new('RGBA',(176,176)); d=ImageDraw.Draw(image)
    rng=Random(27349+index*31)
    ink,shade,leaf,highlight,tip=TREE_PALETTES[index]
    root=[(43,151),(57,144),(66,133),(72,115),(71,100),(76,84),(67,65),(69,46),
          (79,50),(84,79),(92,92),(96,77),(103,59),(115,49),(121,52),(109,70),(106,102),(100,118),
          (107,137),(123,145),(140,148),(128,154),(112,153),(102,150),(91,162),(82,162),(78,153),(61,159),(45,156)]
    d.polygon([(52,147),(81,141),(117,139),(155,150),(144,161),(104,166),(56,161),(35,156)],fill='#283e3a')
    d.polygon(root,fill=WOOD[1],outline=WOOD[0],width=2)
    d.polygon([(51,152),(70,139),(75,116),(74,102),(79,92),(79,114),(82,121),(74,144),(64,153)],fill=WOOD[2])
    d.polygon([(84,156),(88,138),(86,119),(92,104),(96,111),(94,128),(100,147),(89,158)],fill=WOOD[0])
    for path in [[(69,148),(80,132),(78,112),(83,96)],[(103,150),(97,133),(96,117),(101,96)],[(59,150),(64,147),(72,146)],[(91,101),(86,92),(84,83)]]:
        d.line(path,fill=WOOD[3],width=2)
    d.ellipse((85,112,95,130),fill=WOOD[0]);d.line([(84,126),(84,114),(89,109),(94,110)],fill=WOOD[2],width=2)
    branches=[[(78,102),(60,84),(40,76),(27,58)],[(96,105),(111,84),(130,76),(149,56)],[(88,91),(90,68),(83,49),(73,31)],[(68,91),(54,69),(57,51),(44,44)],[(108,87),(128,87),(147,78),(161,81)],[(101,77),(117,49),(134,33)]]
    for i,path in enumerate(branches):
        d.line(path,fill=WOOD[0],width=8-i%2*2)
        d.line([(x-1,y-2) for x,y in path],fill=WOOD[2],width=3)
        x,y=path[-2]
        d.line([(x,y),(x-8,y-17),(x-15,y-21)],fill=WOOD[1],width=3)
    clusters=[(31,55,19,16),(55,49,22,16),(78,39,25,17),(113,40,24,20),(145,59,20,18),(123,75,19,14),(46,75,20,12),(85,59,27,18)]
    if index==4:clusters=[(31,52,10,6),(66,47,13,9),(116,43,10,6),(141,72,14,7)]
    if index==5:clusters +=[(98,26,20,15),(38,37,17,11),(137,39,18,13)]
    for cx,cy,rx,ry in clusters:
        cx+=rng.randint(-6,6);cy+=rng.randint(-5,4)
        vertices=[(round(cx+cos(a*pi/9)*(rx+rng.randrange(-4,5))),round(cy+sin(a*pi/9)*(ry+rng.randrange(-3,4)))) for a in range(18)]
        d.polygon(vertices,fill=shade,outline=ink,width=2)
        d.polygon([(int(cx+(x-cx)*.73-2),int(cy+(y-cy)*.61-2)) for x,y in vertices],fill=leaf)
        for _ in range(14 if index!=4 else 6):
            x=cx+rng.randint(-max(2,rx//2),max(2,rx//2));y=cy+rng.randint(-max(2,ry//2),max(2,ry//3))
            length=rng.randint(2,6)
            d.polygon([(x,y+1),(x+1,y-1),(x+length-1,y-2),(x+length,y),(x+2,y+2)],fill=highlight if rng.randrange(4) else tip)
    for x,y,h in [(57,83,22),(113,85,24),(127,72,19)]:
        d.line([(x,y),(x-3,y+7),(x+1,y+15),(x-3,y+h)],fill=shade,width=2)
        for s in range(7,h,5):d.line([(x-1,y+s),(x-6,y+s-3)],fill=leaf,width=2)
    d.line([(69,149),(71,143),(78,139),(82,140)],fill=leaf,width=3)
    if index in (2,3,5):
        d.polygon([(88,116),(91,112),(94,118),(91,123)],fill=highlight)
        d.point((91,115),fill=tip)
    return image


def creature(species,rank,direction,pose,frame):
    image=Image.new('RGBA',(112,112)); d=ImageDraw.Draw(image)
    west=direction=='west'; side=direction in ('west','east'); face=direction!='north'
    gait=(-3,1,3,0)[frame] if pose=='move' else 0
    strike=(0,5,12,5)[frame] if pose in ('active','skill') else (-5,-2,0,2)[frame] if pose=='windup' else 0
    breath=(0,-1,-2,-1)[frame] if pose in ('idle','hurt','windup','recover') else 0
    dy=(0,5,10,14)[frame] if pose=='death' else 0
    ink='#20282b'; cx,cy=56,89
    def xy(p):
        x,y=p;return (cx-x if west else cx+x,cy+y+dy)
    def poly(points,color,outline=ink):d.polygon([xy(p) for p in points],fill=color,outline=outline)
    def line(points,color,width=1):d.line([xy(p) for p in points],fill=color,width=width)
    def eye(x,y,c):line([(x,y),(x+2,y-1)],c,2)

    d.ellipse((29,82,85,97),fill=(27,41,38,108))
    if species in ('wood','millennial','wood-king'):
        king=species=='wood-king'; big=species!='wood'; index=5 if king else 1 if big else 0
        dark,leaf,green,light,top=TREE_PALETTES[index]
        mult=1.33 if king else 1.16 if big else .86
        def points(path):
            lean=0 if not big or king else -.14
            return [(round((x+lean*(y+20))*mult),round(y*mult)+breath) for x,y in path]
        if pose=='death':
            poly([(-27,-15),(-13,-22),(9,-21),(22,-18),(31,-10),(16,-8),(-16,-7)],WOOD[1]);line([(-23,-16),(9,-19),(24,-15)],light,2);return image
        roots=[-23,-17,-8,4,15,22] if king else [-19,-7,10,21] if big else [-11,8]
        for j,dx in enumerate(roots):
            reach=gait*(1 if j%2 else -1)
            poly(points([(dx-3,-24),(dx+4,-21),(dx+7,-8),(dx+10+reach,-2),(dx+6+reach,3),(dx-3+reach,1),(dx-7,-7)]),WOOD[1])
            line(points([(dx-3,-16),(dx+3,-6),(dx+6+reach,-2)]),WOOD[2],2)
        arm=(strike if face else -strike)//2
        for direction in (-1,1):
            if king:
                path=[(direction*11,-29),(direction*(22+arm),-35),(direction*(26+arm),-45),(direction*(32+arm),-52)]
            elif big:
                path=[(-10,-29),(-23-arm,-29),(-30-arm,-39),(-32-arm,-55)] if direction<0 else [(10,-30),(26+arm,-27),(29+arm,-18),(35+arm,-20)]
            else:
                path=[(direction*9,-28),(direction*(21+arm),-23),(direction*(25+arm),-29),(direction*(23+arm),-35)]
            line(points(path),WOOD[0],7 if king else 5);line(points(path),WOOD[2],2)
            x,y=path[-2];line(points([(x,y),(x+direction*8,y-3),(x+direction*11,y-12)]),WOOD[1],3)
        tip=-52 if king else -54
        poly(points([(-12,-14),(-17,-30),(-11,-40),(-14,-51),(-5,tip),(0,-49),(9,-55),(14,-50),(11,-40),(16,-35),(13,-18),(5,-13)]),WOOD[1])
        poly(points([(-10,-18),(-13,-31),(-7,-43),(-8,-47),(-4,-49),(-3,-38),(-8,-28),(-5,-19)]),WOOD[2],None)
        line(points([(7,-44),(5,-33),(8,-23),(5,-17)]),WOOD[0],2)
        clusters=[(-22,-40,7),(-17,-52,9),(14,-51,8),(24,-42,7)] if king else [(-17,-58,12),(-5,-51,15),(16,-44,12),(24,-26,9)] if big else [(-17,-42,11),(-8,-54,13),(8,-53,14),(20,-42,10)]
        if king:
            for side_sign in (-1,1):
                crest=[(0,-43),(side_sign*9,-51),(side_sign*14,-55),(side_sign*11,-60),(side_sign*14,-62),(side_sign*20,-56),(side_sign*26,-59)]
                line(points(crest),WOOD[0],5);line(points(crest),WOOD[3],2)
                line(points([(side_sign*8,-52),(side_sign*6,-60),(side_sign*3,-63)]),light,2)
        for x,y,r in clusters:
            poly(points([(x-r,y+3),(x-r+3,y-6),(x-2,y-9),(x+5,y-8),(x+r,y-3),(x+r-3,y+5),(x+1,y+8)]),leaf)
            line(points([(x-5,y-4),(x-1,y-6),(x+4,y-5)]),green,3)
            line(points([(x-1,y-6),(x+3,y-7)]),light)
        if face:
            ex=4 if side else 0
            eye(*points([(ex-5,-37)])[0],top)
            if not side:eye(*points([(ex+4,-37)])[0],top)
            line(points([(ex-5,-30),(ex,-32),(ex+5,-30)]),WOOD[0],2)
            if big:
                line(points([(ex-6,-39),(ex-3,-40),(ex,-39)]),WOOD[3],2)
                line(points([(ex-4,-29),(ex-3,-25),(ex-5,-23)]),WOOD[0],1)
                line(points([(ex+4,-28),(ex+2,-25),(ex+4,-22)]),WOOD[2],1)
        if king or rank=='elite':
            poly(points([(-5,-23),(0,-31),(5,-23),(0,-17)]),green)
            line(points([(-2,-23),(0,-28),(2,-23)]),top,2)
        if king:
            for x,y in [(-14,-11),(14,-12),(-23,-31),(24,-31)]:
                line(points([(x-2,y),(x,y-2),(x+2,y)]),light,2)
        return image

    if species in ('flower','vine'):
        violet=species=='flower'; color='#954d94' if violet else '#883b50'; lit='#e3a5ca' if violet else '#d5827e'
        stalk='#416653' if violet else '#523945'; droop=17 if pose=='death' else 0
        for side_sign in (-1,1):
            for j in (0,1):
                stride=gait*(1 if j==0 else -1)*side_sign
                joint=(side_sign*(13+j*5)+stride,-10-j*2-abs(stride))
                toe=(side_sign*(23+j*6)+stride*2,-3-j*4-(3 if stride>0 else 0))
                line([(0,-15),joint,toe],'#463739',5)
                line([(0,-15),(joint[0],joint[1]-1),toe],'#947357',2)
            poly([(0,-7),(side_sign*12,-19),(side_sign*23,-19),(side_sign*14,-10),(side_sign*11,-5)],'#5c8864')
        swing=breath+strike+gait
        if violet:
            head=(4+swing,-38+droop)
            line([(0,-3),(-4,-14),(3,-28),head],stalk,5)
            x,y=head
            for j in range(7):
                a=j*2*pi/7
                path=[(x+round(cos(a+t)*r),y+round(sin(a+t)*r)) for t,r in [(-.42,8),(-.32,16),(.02,22+strike//2),(.28,15),(.35,7)]]
                poly(path,color);line(path[1:3],lit,2)
            poly([(x-8,y-1),(x-4,y-7),(x+5,y-5),(x+9,y+1),(x+4,y+7),(x-4,y+7)],'#573754')
            if face:
                if strike>0:poly([(x-8,y-2),(x-3,y-5),(x+6,y-4),(x+9,y+2),(x+4,y+9),(x-6,y+7)],'#292331')
                for i,j in [(-4,1),(0,-2),(4,1)]:eye(x+i,y+j,'#efd58a')
        else:
            for offset in (-13,0,11):
                path=[(offset,-3),(offset-3,-15),(offset+8,-23+droop),(offset+4,-38+droop),(offset+16+swing,-42+droop),(offset+22+swing,-36+droop)]
                line(path,ink,8);line(path,color,6);line([(x-1,y-2) for x,y in path],lit,1)
                for x,y in path[1:-1]:poly([(x-4,y+2),(x-9,y-3),(x-2,y-5)],color)
                x,y=path[-1];eye(x-1,y,'#e9af83')
        return image

    if species in ('python','centipede'):
        python=species=='python'; shade='#425a47' if python else '#3d3c46'; body='#638f64' if python else '#5b6070'; hi='#a0bb81' if python else '#9e8379'
        if side:
            spine=[(x,-9+round(sin(j*.80+gait*.25)*(6 if python else 2))) for j,x in enumerate(range(-31,24,5))]
        else:
            spine=[(round(sin(j*.73+gait*.31)*(21 if python else 10)),-27+j*2) for j in range(12)]
        if pose=='death':spine=[(x,y//2-11) for x,y in spine]
        if python:
            line(spine,ink,13);line(spine,body,9);line([(x,y-3) for x,y in spine],hi,2)
        for j,(x,y) in enumerate(spine):
            if python:
                line([(x-2,y-5),(x+1,y-4),(x+3,y)],shade,2)
            else:
                swing=(-1)**j*gait
                for sign in (-1,1):line([(x,y),(x+sign*7,y+6),(x+sign*(10+swing),y+11)],'#9f6663',2)
                poly([(x-5,y-4),(x-1,y-6),(x+4,y-4),(x+6,y),(x+3,y+4),(x-4,y+4)],body)
                line([(x-2,y-4),(x+2,y-4)],hi,2)
        x,y=spine[-1]; x+=strike if side else 0;y-=4 if face else 9
        poly([(x-7,y),(x-5,y-8),(x+3,y-10),(x+8,y-5),(x+10,y),(x+5,y+4),(x-4,y+4)],body)
        if face:
            eye(x+3,y-5,'#efd57c')
            if not side:eye(x-4,y-5,'#efd57c')
            if not python:
                for s in (-1,1):line([(x+s*4,y),(x+s*9,y+5),(x+s*11,y+2)],'#bb826f',2)
        return image

    # Ling stag. Joint angles and hooves alternate across the four gait frames.
    if pose=='death':
        poly([(-29,-12),(-23,-20),(-4,-23),(14,-20),(28,-15),(22,-9),(-19,-7)],'#a58368');line([(13,-16),(21,-14),(24,-16)],ink);return image
    coat='#986e57'; pale='#ddbd8c'; neck=14 if side else 0
    for i,x in enumerate((-17,-7,9,17) if side else (-10,-6,6,10)):
        step=gait*(1 if i%2 else -1)
        poly([(x-3,-16),(x+3,-16),(x+step+2,-5),(x+step+3,1),(x+step-2,2),(x+step-4,-5)],coat)
        line([(x+step-2,1),(x+step+3,1)],ink,2)
    poly([(-24 if side else -13,-17),(-18,-28),(-3,-30),(14,-28),(20,-21),(15,-14),(0,-11),(-14,-13)],coat)
    line([(-19,-26),(-8,-27),(5,-26)],pale,2)
    for x,y in [(-14,-23),(-8,-22),(-3,-24),(4,-23)]:line([(x,y),(x+2,y-1)],'#edcc9e')
    poly([(neck-5,-20),(neck-5,-37),(neck+1,-46),(neck+8,-44),(neck+10,-35),(neck+3,-21)],coat)
    graze=(0,6,16,7)[frame] if pose=='idle' else 0
    hx=neck+(5 if side else -1)+strike//2+(graze//2 if side else 0); hy=-40+breath+graze
    poly([(hx-6,hy+3),(hx-5,hy-7),(hx+3,hy-8),(hx+7,hy-4),(hx+10,hy+2),(hx+7,hy+6),(hx,hy+6)],pale)
    for x in (-5,4):
        line([(hx+x,hy-6),(hx+x-1,hy-15),(hx+x+3,hy-24)],'#8ec6b6',3)
        line([(hx+x,hy-17),(hx+x-5,hy-22),(hx+x-5,hy-25)],'#c9e3bb',2)
    if face:eye(hx+4,hy-2,'#fcde9b')
    return image


trees=Image.new('RGBA',(176*6,176))
for index in range(6):trees.paste(tree(index),(index*176,0))
trees.save(ROOT/'ancient-grove.png')
for species in SPECIES:
    for rank in ('normal','elite') if species=='millennial' else ('normal',):
        atlas=Image.new('RGBA',(112*16,112*8))
        for row,pose in enumerate(POSES):
            for col,direction in enumerate(DIRS):
                for frame in range(4):
                    atlas.paste(creature(species,rank,direction,pose,frame),((col*4+frame)*112,row*112))
        atlas.save(ROOT/f'{species}-{rank}.png')

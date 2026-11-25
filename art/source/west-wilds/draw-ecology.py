"""Draw rooted flower transitions and species habitat decoration at native resolution."""
from math import cos, pi, sin
from pathlib import Path
from PIL import Image, ImageDraw

out=Path(__file__).resolve().parents[3]/'public/assets/west-wilds'


def flower_form(direction, row, frame):
    im=Image.new('RGBA',(112,112)); d=ImageDraw.Draw(im)
    progress=(0,.12,(frame+1)/4,1-(frame+1)/4)[row]
    wind=(0,-1,0,1)[frame]; vx=(-1 if direction==1 else 1 if direction==2 else 0)
    x=56+vx*round(progress*9)+wind; y=64-round(progress*15)
    d.polygon([(35,91),(44,85),(64,84),(80,90),(73,94),(44,95)],fill='#293c33')
    for i,side in enumerate((-1,1,-1,1)):
        heel=56+side*(13+i*3);toe=(heel+side*round(progress*7),90-i%2*4)
        joint=(heel-side*3,88-round(progress*(15+i*2)))
        d.line([(55,83-round(progress*7)),joint,toe],fill='#382e39',width=5)
        d.line([(55,81-round(progress*7)),(joint[0],joint[1]-1),toe],fill='#846449',width=2)
    d.line([(55,85-round(progress*7)),(53+wind,76),(x-2,y+2)],fill='#385d47',width=6)
    for side in (-1,1):
        d.polygon([(53,79),(53+side*13,72+wind*side),(53+side*20,76),(53+side*13,82)],fill='#588360',outline='#294b40')
        d.line([(53+side*2,79),(53+side*15,76)],fill='#a6bd7b')
    width=12+round(progress*12)
    for i in range(7):
        a=i*2*pi/7
        pts=[(x+round(cos(a+da)*r),y+round(sin(a+da)*r)) for da,r in [(-.45,5),(-.25,width*.82),(.03,width),(.31,width*.68),(.46,5)]]
        d.polygon(pts,fill='#94548e' if i%2 else '#ad649c',outline='#51364f'); d.line(pts[1:3],fill='#e7afda',width=2)
    if row==0:
        d.ellipse((x-4,y-3,x+4,y+4),fill='#dcb77b');d.point((x-2,y-2),fill='#ffe0a3')
    else:
        d.ellipse((x-6,y-3,x+7,y+5),fill='#452b45');d.line([(x-3,y),(x+3,y)],fill='#f6cf8d',width=2)
    return im


atlas=Image.new('RGBA',(112*16,112*4))
for phase in range(4):
    for direction in range(4):
        for frame in range(4):atlas.paste(flower_form(direction,phase,frame),((direction*4+frame)*112,phase*112))
atlas.save(out/'flower-forms.png')

plants=Image.new('RGBA',(48*11,48))
for i,color in enumerate(('#729481','#b0926f','#90a76b','#c88fc2','#a88473','#86bd79','#a8ccb2','#ad5f78','#79a685','#d2cc83','#7dcbbc')):
    patch=Image.new('RGBA',(48,48)); p=ImageDraw.Draw(patch)
    p.polygon([(4,37),(16,33),(37,31),(45,37),(40,42),(16,44),(5,41)],fill='#354a39')
    for j,(x,y) in enumerate([(13,36),(24,33),(34,37),(21,40)]):
        p.line([(x,y),(x-2,y-9),(x+3,y-14-j%3)],fill='#465f49',width=2)
        p.polygon([(x-1,y-5),(x-9,y-12),(x-4,y-13),(x+2,y-8)],fill='#68946b')
        if i in (2,3,5,6,9):
            p.polygon([(x-2,y-13),(x,y-19),(x+6,y-20),(x+8,y-15),(x+4,y-12)],fill=color,outline='#435644')
            p.point((x+3,y-17),fill='#f7dfad')
        else:
            p.line([(x,y-8),(x+7,y-13),(x+9,y-20)],fill=color,width=2)
    if i in (2,7,8):p.line([(7,35),(14,33),(24,34),(30,32),(40,33)],fill=color,width=2)
    if i in (0,4):
        p.polygon([(5,36),(8,25),(16,15),(24,12),(37,19),(43,33),(39,39),(13,42)],fill='#5a5e57',outline='#293832')
        p.polygon([(9,30),(16,18),(25,15),(32,18),(25,21),(21,25),(16,31)],fill='#8b8e7d')
        p.polygon([(16,39),(17,30),(21,25),(29,24),(34,30),(36,37),(28,39)],fill='#283931')
        p.line([(19,33),(23,27),(29,27)],fill=color,width=2)
    if i in (2,8):
        p.polygon([(6,36),(11,30),(17,30),(24,27),(35,27),(41,32),(43,36),(35,41),(13,42)],fill='#3f6d62',outline='#34584c')
        p.line([(13,34),(22,33),(27,34)],fill='#79a391')
        p.line([(22,38),(30,37),(36,37)],fill='#79a391')
        p.line([(12,33),(10,25),(7,21)],fill=color,width=2)
    if i==1:
        p.polygon([(5,39),(12,33),(29,32),(40,36),(43,40),(30,43),(13,43)],fill='#766049')
        p.line([(10,41),(17,37),(25,37),(31,40),(38,39)],fill='#bb9a68',width=2)
    if i==10:
        p.polygon([(15,36),(20,30),(31,30),(39,34),(37,40),(17,41)],fill='#5d6b64',outline='#394640')
        p.polygon([(22,31),(24,23),(29,19),(31,24),(30,33)],fill=color,outline='#395b52')
        p.point((26,24),fill='#dbf2d0')
    plants.paste(patch,(i*48,0))
plants.save(out/'habitat-accents.png')

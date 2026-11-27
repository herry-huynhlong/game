"""Van Kiem layered pixel-art atlas and synthesized audio masters."""
from pathlib import Path
import json
import math as m
import random
import struct
import wave
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[2] / "public/assets/van-kiem"
OUT.mkdir(parents=True, exist_ok=True)
GOLD=(214,158,75); PALE=(255,225,155); WHITE=(255,247,211)
INK=(29,39,53); BRONZE=(111,75,53); JADE=(101,174,177)

def canvas(size):
    im=Image.new("RGBA",size)
    return im,ImageDraw.Draw(im)
def c(rgb,a):
    return (*rgb,int(max(0,min(255,a))))
def orbit(x,y,rx,ry,a):
    return round(x+m.cos(a)*rx),round(y+m.sin(a)*ry)
def arc(x,y,rx,ry,a,b,n=28):
    return [orbit(x,y,rx,ry,a+(b-a)*i/n) for i in range(n+1)]

RUNES=[
    [[(0,0),(5,0)],[(2,-3),(2,4)],[(0,3),(5,3)]],
    [[(0,-2),(5,-2),(5,3),(0,3),(0,-2)],[(2,0),(4,0)]],
    [[(0,2),(5,-3)],[(1,-1),(1,4)],[(3,1),(5,4)]],
    [[(0,-2),(4,-2),(4,0),(1,0),(1,3),(5,3)],[(2,1),(3,4)]],
    [[(0,-2),(5,-2)],[(0,1),(5,1)],[(2,-4),(2,4)],[(5,1),(5,4)]],
]
def rune(d,x,y,n,color,scale=1):
    for stroke in RUNES[n%len(RUNES)]:
        d.line([(x+u*scale,y+v*scale) for u,v in stroke],fill=color,width=scale)

def sword(i):
    im,d=canvas((40,88))
    dark,face,edge,trim=[
        ((66,82,102),(160,179,187),(226,235,228),(165,124,82)),
        ((47,91,91),(86,167,153),(212,246,194),(218,167,88)),
        ((79,62,124),(150,120,202),(230,217,252),(203,159,109)),
        ((49,75,109),(103,162,204),(217,239,249),(223,178,89)),
        ((99,68,62),(206,149,73),(255,239,169),(135,174,179)),
    ][i]
    profiles=[
        [(20,3),(25,14),(25,56),(23,62),(17,62),(15,56),(15,15)],
        [(20,2),(27,16),(25,22),(26,54),(23,63),(17,63),(14,54),(15,22),(13,16)],
        [(20,1),(24,11),(29,18),(26,26),(26,53),(23,62),(17,62),(14,53),(14,26),(11,18),(16,11)],
        [(20,0),(28,17),(27,43),(29,49),(25,58),(22,63),(17,63),(12,58),(16,49),(13,43),(12,17)],
        [(20,0),(24,11),(30,20),(26,25),(29,33),(25,42),(28,49),(24,62),(16,62),(12,49),(15,42),(11,33),(14,25),(10,20),(16,11)],
    ]
    profile=profiles[i]
    d.polygon(profile,fill=dark,outline=INK)
    d.line(profile[:len(profile)//2+1],fill=trim,width=2)
    d.line([profile[0],*profile[:len(profile)//2:-1]],fill=edge,width=2)
    d.polygon([(20,7),(24,18),(22,27),(23,54),(20,61),(18,53),(18,18)],fill=face)
    d.line([(20,9),(20,56)],fill=edge)
    for j in range(3+i):
        y=17+j*6
        if i:rune(d,16+(j%2)*2,y,i+j,c(edge,198))
        else:d.line([(16,y),(19,y-4)],fill=face)
    guard=[
        [(11,62),(16,64),(25,64),(29,62),(28,67),(12,67)],
        [(7,60),(13,61),(18,65),(24,65),(28,61),(33,60),(31,67),(22,71),(17,71),(9,67)],
        [(6,59),(12,63),(16,61),(20,66),(25,62),(31,64),(34,59),(34,67),(26,72),(15,71),(6,67)],
        [(5,62),(11,60),(15,64),(20,65),(25,64),(29,60),(35,62),(31,69),(25,69),(23,73),(17,73),(15,69),(10,69)],
        [(4,61),(9,56),(13,58),(15,64),(19,61),(24,64),(27,58),(31,56),(36,61),(34,69),(28,73),(23,72),(16,72),(12,73),(6,68)],
    ][i]
    d.polygon([(17,64),(23,64),(23,81),(25,83),(22,87),(17,87),(15,83),(17,80)],fill=INK)
    for y in range(72,81,3):d.line([(17,y+1),(22,y)],fill=trim,width=2)
    d.polygon(guard,fill=BRONZE,outline=INK)
    d.line(guard[:len(guard)//2],fill=trim,width=2)
    d.polygon([(18,66),(20,63),(23,66),(20,70)],fill=edge)
    d.line([(17,84),(22,84)],fill=trim,width=2)
    return im

def seal(frame,heaven):
    w,h=(336,144) if heaven else (288,128)
    im,d=canvas((w,h));x,y=w//2,h//2
    d.polygon([orbit(x,y,x-5,y-5,i*m.tau/24) for i in range(24)],fill=c(INK,91 if heaven else 59))
    for k,(rx,ry) in enumerate([(x-13,y-12),(x-22,y-17),(x-47,y-29),(x-56,y-35)]):
        for i in range(12):
            a=i*m.tau/12
            points=arc(x,y,rx,ry,a+.035,a+.49)
            d.line(points,fill=c(INK,222),width=4)
            d.line(points,fill=c(GOLD if k%2==0 else JADE,188),width=2)
            if (i+frame+k*2)%6<2:d.line(arc(x,y,rx,ry,a+.09,a+.29),fill=c(PALE,242),width=2)
    for i in range(8):
        a=i*m.tau/8
        points=[orbit(x,y,x-71,y-40,a),orbit(x,y,x-41,y-25,a-.10),
                orbit(x,y,x-17,y-15,a),orbit(x,y,x-41,y-25,a+.10)]
        d.polygon(points,fill=c(BRONZE,202),outline=c(PALE,212))
        px,py=orbit(x,y,x-37,y-23,a+.28)
        d.polygon([(px-10,py-4),(px-5,py-7),(px+8,py-7),(px+11,py-2),(px+6,py+6),(px-8,py+5)],
                  fill=c(INK,215),outline=c(GOLD,202))
        rune(d,px-3,py+1,i,c(PALE if (i+frame)%4 else WHITE,228))
    d.polygon([(x-28,y),(x,y-19),(x+28,y),(x,y+19)],fill=c(INK,190),outline=c(PALE,209))
    d.polygon([(x-13,y),(x,y-11),(x+13,y),(x,y+11)],outline=c(JADE,230))
    rune(d,x-5,y+2,3,c(PALE,250),2)
    return im

def ribbon(frame):
    im,d=canvas((144,36));y=17
    for inset,color,a in [(0,BRONZE,120),(3,GOLD,199),(6,PALE,226),(10,WHITE,245)]:
        left,right=4+inset*4,138-inset
        d.polygon([(left,y+5),(right-42,y-9+inset//2),(right-20,y-11+inset//2),
                   (right,y-1),(right-22,y+4),(left+13,y+7)],fill=c(color,a))
    for i in range(20):
        x=(i*23+frame*12)%126+4; v=y-13+(i*13%25)
        d.rectangle((x,v,x+1+i%5,v+1),fill=c(PALE,58+i*7%145))
    return im

def mist(frame):
    im,d=canvas((184,72));rng=random.Random(715)
    for layer,(color,a) in enumerate([(INK,142),((66,78,96),129),(BRONZE,110),(GOLD,97),(PALE,62)]):
        for i in range(4):
            x=23+i*44;y=44-layer*4+(i%2)*5
            pts=[(x-19,y+7),(x-10,y-4),(x+7,y-11),(x+24,y-11),(x+31,y-5),(x+24,y-2),
                 (x+10,y-4),(x-1,y+1),(x+6,y+5),(x+27,y+2),(x+32,y+5),(x+19,y+10),(x-3,y+11)]
            bias=round(m.sin(frame*m.tau/8+i+layer*.2)*3)
            d.polygon([(max(0,min(183,u+bias)),v-rng.randrange(4)) for u,v in pts],fill=c(color,a))
    return im

def contact(frame):
    im,d=canvas((176,156));x,y=88,116
    rng=random.Random(802); growth=(frame+2)/11
    for i in range(21):
        a=i*m.tau/21+rng.uniform(-.13,.13);r=rng.randint(25,73)*growth*(1.22 if i%3==0 else 1)
        end=orbit(x,y,r,r*.62,a)
        bend=orbit(x,y,r*.47,r*.39,a+.16)
        top=(end[0],end[1]-rng.randrange(5,34)*growth)
        alpha=239-frame*22
        d.polygon([(x,y),bend,top,orbit(x,y,r*.19,r*.16,a-.10)],fill=c(BRONZE,alpha))
        d.line([(x,y-6),bend,top],fill=c(GOLD,alpha),width=3)
        d.line([bend,top],fill=c(PALE,alpha))
        if frame>1:
            u,v=orbit(x,y,r*1.17,r*.73,a)
            rune(d,u,v-rng.randrange(4,18),i,c(GOLD,alpha))
    if frame<4:
        high=65-frame*10
        d.polygon([(x-17,y),(x-6,y-19),(x,y-high),(x+6,y-23),(x+17,y),(x,y+8)],fill=PALE)
        d.polygon([(x-6,y),(x,y-high),(x+5,y),(x,y+4)],fill=WHITE)
    return im

def dust(frame):
    im,d=canvas((112,62)); rng=random.Random(115)
    for i in range(30):
        a=rng.uniform(0,m.tau);r=(10+frame*4)*rng.uniform(.35,1.2)
        x,y=orbit(56,42,r,r*.52,a);k=rng.randrange(2,8)
        d.polygon([(x-k,y),(x-k//2,y-4),(x+2,y-7),(x+k,y-3),(x+k,y+1),(x,y+3)],
                  fill=c((97,88,66) if i%3 else GOLD,157-frame*16))
    return im

def ripple(frame):
    im,d=canvas((240,104));x,y=120,52;r=16+frame*13
    for i in range(16):
        a=i*m.tau/16;points=arc(x,y,r,r*.42,a,a+.31,7)
        d.line(points,fill=c(INK,168-frame*14),width=5)
        d.line(points,fill=c(PALE,235-frame*20),width=2)
        d.line([orbit(x,y,r*.54,r*.23,a),points[2],orbit(x,y,r*1.07,r*.46,a+.19)],fill=c(GOLD,219-frame*18))
    return im

def mote(frame):
    im,d=canvas((16,18));h=[5,6,7,6,5,4][frame]
    d.polygon([(8,8-h),(12,8),(8,8+h),(4,8)],fill=c(GOLD,190))
    d.line([(8,9-h),(8,7+h)],fill=PALE,width=2)
    d.point((8,7),fill=WHITE);d.point((2+frame,14),fill=c(JADE,101))
    return im

def light(color,kind):
    im,d=canvas((192,112))
    for i in range(24,0,-1):
        a=233*(1-i/25)**2.15 if kind!="shadow" else 155*(1-i/25)
        rx=i*4-1;ry=round(i*2.28)
        d.ellipse((96-rx,56-ry,96+rx,56+ry),fill=c(color,a))
    return im

families={"blade":[sword(i) for i in range(5)],"ground":[seal(i,False) for i in range(6)],
    "heaven":[seal(i,True) for i in range(6)],"ribbon":[ribbon(i) for i in range(8)],
    "mist":[mist(i) for i in range(8)],"impact":[contact(i) for i in range(8)],
    "ripple":[ripple(i) for i in range(8)],"dust":[dust(i) for i in range(8)],
    "mote":[mote(i) for i in range(6)],"amber":[light(GOLD,"lamp")],"silver":[light((120,180,204),"lamp")],
    "shadow":[light((18,25,36),"shadow")]}

atlas=Image.new("RGBA",(2048,2048))
frames={};x=y=row=0
for name,images in families.items():
    for index,image in enumerate(images):
        w,h=image.size
        if x+w+2>atlas.width:x=0;y+=row;row=0
        atlas.paste(image,(x+1,y+1))
        frames[f"{name}{index}"]={"frame":{"x":x+1,"y":y+1,"w":w,"h":h},"rotated":False,"trimmed":False,
            "spriteSourceSize":{"x":0,"y":0,"w":w,"h":h},"sourceSize":{"w":w,"h":h}}
        x+=w+2;row=max(row,h+2)
atlas.crop((0,0,atlas.width,y+row)).save(OUT/"cinematic.png",optimize=True)
(OUT/"cinematic.json").write_text(json.dumps({"frames":frames,"meta":{"image":"cinematic.png","scale":"1"}},indent=2)+"\n")

notes={
    "gather":(1.5,95,[(1,.50),(2.002,.17),(2.997,.08)],.07),
    "chime":(.96,462,[(1,.39),(1.59,.19),(2.78,.10),(4.06,.07)],.013),
    "seal":(1.08,168,[(1,.45),(1.5,.24),(2.995,.15),(3.99,.08)],.018),
    "flight":(.64,150,[(1,.36),(2.17,.17),(3.06,.11)],.12),
    "strike":(.49,73,[(1,.50),(1.49,.22),(5.13,.09)],.21),
    "return":(1.35,275,[(1,.34),(1.498,.19),(2.75,.085)],.026),
}
for name,(duration,root,partials,noise) in notes.items():
    samples=[];rng=random.Random(root);low=phase=0
    for i in range(round(22050*duration)):
        t=i/22050
        envelope=(1-m.exp(-t*(16 if name=="gather" else 200)))*max(0,1-t/duration)**(1.2 if name in ("gather","return") else 3)
        sweep=1+(.58*t/duration if name=="gather" else -.48*t/duration if name in ("flight","strike") else 0)
        phase+=m.tau*root*sweep/22050
        low=.84*low+.16*rng.uniform(-1,1)
        sample=sum(weight*m.sin(phase*p+.55*m.sin(t*7)) for p,weight in partials)+low*noise*3
        samples.append(round(13300*envelope*sample))
    with wave.open(str(OUT/f"{name}.wav"),"wb") as sound:
        sound.setparams((1,2,22050,0,"NONE","not compressed"))
        sound.writeframes(struct.pack(f"<{len(samples)}h",*samples))

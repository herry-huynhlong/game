"""Native-resolution Qingyun rampart atlas. Paint planes separately for readable depth."""
from pathlib import Path
import json
import random
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'public/assets/ramparts'
OUT.mkdir(parents=True,exist_ok=True)
SIZE=(256,288)
COLS=6
STONE=['#35474a','#405456','#4b5d60','#556869','#607372','#6d7e78','#7c8c81','#89968a']
DARK='#222f34'
LIP='#a6ab91'
SHADE=(21,34,34,74)
JADE=['#112a31','#193842','#245058','#315f64','#4a7775']
TIMBER=['#322428','#503438','#6b4540','#8d604b','#aa7e58']
OX,OY=128,171

def polygon(d,points,color):
    d.polygon([(int(x),int(y)) for x,y in points],fill=color)

def brick(d,r,seed,base=4,w=17,h=9,deck=False):
    x,y,v,b=map(int,r)
    if v<=x or b<=y:return
    rng=random.Random(seed)
    d.rectangle((x,y,v-1,b-1),fill=STONE[max(0,base-2)])
    for row,yy in enumerate(range(y,b,h)):
        for xx in range(x-(w//2 if row%2 else 0),v,w):
            a=max(x,xx+1);u=min(v-1,xx+w-2);bottom=min(b-2,yy+h-2)
            if u<a or bottom<yy:continue
            i=min(7,max(0,base+rng.choices([-2,-1,0,1,2],[1,4,9,4,1])[0]))
            d.rectangle((a,yy,u,bottom),fill=STONE[i])
            if bottom>yy+1:
                d.line((a,yy,u-1,yy),fill=STONE[min(i+1,7)])
                d.line((a,bottom,u,bottom),fill=STONE[max(0,i-1)])
            if u-a>7 and bottom>yy+3 and rng.random()<.52:
                px=rng.randint(a+2,u-4);py=rng.randint(yy+2,bottom-1)
                d.line((px,py,px+rng.randint(1,4),py),fill=STONE[max(0,i-1)])
                if deck and rng.random()<.28:d.point((px+1,py-1),fill='#a4a291')

def molding(d,x1,x2,y,height=7):
    d.rectangle((x1,y,x2,y+height),fill='#455658')
    d.line((x1,y,x2,y),fill='#788b84',width=2)
    d.line((x1,y+2,x2,y+2),fill='#9ba99a')
    d.line((x1,y+height,x2,y+height),fill=DARK,width=2)

def merlon(d,x,y,w=13):
    polygon(d,[(x,y+3),(x+3,y),(x+w-2,y),(x+w,y+3),(x+w,y+12),(x,y+12)],STONE[3])
    d.line((x+3,y,x+w-2,y),fill=LIP)
    d.polygon([(x,y+3),(x+w-2,y+3),(x+w-2,y+5),(x+3,y+5),(x+3,y+11),(x,y+11)],fill=STONE[6])
    d.line((x+w,y+4,x+w,y+12),fill=DARK)

def shadow(layer,points):
    m=Image.new('RGBA',SIZE)
    polygon(ImageDraw.Draw(m),points,SHADE)
    layer.alpha_composite(m)

def wall(axis,variant):
    im=Image.new('RGBA',SIZE)
    d=ImageDraw.Draw(im)
    x,y=OX,OY
    if axis=='h':
        lo,hi=x-32,x+32
        shadow(im,[(lo,y+17),(hi,y+17),(hi+13,y+29),(lo+10,y+29)])
        brick(d,(lo,y-26,hi,y+22),variant+20,3,19,9)
        molding(d,lo,hi-1,y+14,7)
        for a in [lo+9,lo+39]:
            if (a+variant)%5:
                d.polygon([(a,y-13),(a+6,y-14),(a+6,y+3),(a+1,y+5),(a,y+3)],fill=DARK)
                d.line((a+1,y+4,a+6,y+4),fill=STONE[5])
        brick(d,(lo,y-78,hi,y-20),variant+54,6,21,15,True)
        d.line((lo,y-64,hi-1,y-64),fill='#9aa498')
        d.line((lo,y-37,hi-1,y-37),fill='#65796e')
        molding(d,lo,hi-1,y-79,6)
        for j in [0,16,32,48]:merlon(d,lo+j+1,y-87,(11,13,11,12)[(variant+j//16)%4])
        molding(d,lo,hi-1,y-27,7)
        for j in [4,26,47]:
            d.line((lo+j,y-27,lo+j+7,y-27),fill='#b1b2a0')
        if variant in [1,3]:
            d.line((lo+12,y+15,lo+15,y+9),fill='#657965')
            d.point((lo+14,y+8),fill='#82927a')
    else:
        lo,hi=y-32,y+32
        shadow(im,[(x-22,lo),(x+19,lo),(x+38,hi),(x-16,hi+8)])
        toward=1 if axis=='w' else -1
        brick(d,(x-32,lo-48,x+32,hi-48),variant+95,5,13,17,True)
        rail=x+26*toward
        brick(d,(rail-5,lo-51,rail+6,hi),variant+40,2,9,13)
        d.line((rail-5,lo-51,rail-5,hi),fill=STONE[4])
        d.line((rail+5,lo-48,rail+5,hi),fill=DARK)
        outer=x-28*toward
        d.rectangle((outer-4,lo-50,outer+5,hi-43),fill=STONE[4])
        for yy in range(lo-51,hi-46,16):
            merlon(d,outer-6,yy,10)
        d.line((x-14,lo-48,x-14,hi-49),fill='#82948a')
        d.line((x+14,lo-48,x+14,hi-49),fill='#485c5f')
    return im

def roof(d,x,y,w,h,flair=0):
    x1=x-w//2;x2=x+w//2
    points=[(x1-5,y+h-5),(x1-13,y+h-12),(x1+6,y+h-9),(x1+18,y+4),
            (x-w//4,y),(x+w//4,y),(x2-18,y+4),(x2-6,y+h-9),(x2+13,y+h-12),
            (x2+5,y+h-5),(x2,y+h),(x1,y+h)]
    polygon(d,points,JADE[0]);polygon(d,points[1:-2]+[(x1+6,y+h-4)],JADE[1])
    polygon(d,[(x1+18,y+4),(x-w//4,y+1),(x+w//4,y+1),(x2-18,y+4),
               (x2-13,y+11),(x1+13,y+11)],JADE[3])
    for at in range(x1+5,x2,6):
        start=x+int((at-x)*.65)
        yy=y+3+min(h-8,max(0,int((abs(at-x)/max(1,w/2)-.65)*h*1.8)))
        d.line((start,yy,at,y+h-5),fill=JADE[0],width=2)
        d.line((start+2,yy+2,at+2,y+h-9),fill=JADE[2])
        d.point((at+2,y+h-6),fill=JADE[4])
    d.line((x1,y+h-2,x2,y+h-2),fill='#6c5141',width=2)
    d.line((x-w//4,y,x+w//4,y),fill='#6f8a80',width=2)
    for xx,side in [(x1,-1),(x2,1)]:
        d.line((xx+5*side,y+h-4,xx+12*side,y+h-10,xx+11*side,y+h-17),fill=JADE[2],width=2)
        if flair:d.point((xx+12*side,y+h-14),fill='#caa367')

def lantern(d,x,y):
    d.line((x,y-7,x,y+1),fill='#c9af75')
    d.rounded_rectangle((x-4,y,x+4,y+11),radius=2,fill='#a94739',outline='#522f2e')
    d.rectangle((x-2,y+2,x+1,y+8),fill='#ffc274')
    d.line((x-2,y+1,x+2,y+1),fill='#efaa66')
    d.line((x,y+11,x,y+15),fill='#c07b4f')

def flag(d,x,y,face=1):
    d.line((x,y-33,x,y+6),fill='#855f45',width=2)
    d.line((x,y-33,x+face*17,y-33),fill='#d4ae69')
    polygon(d,[(x+face*2,y-31),(x+face*16,y-31),(x+face*16,y-14),
               (x+face*12,y-9),(x+face*8,y-13),(x+face*2,y-10)],'#963e39')
    d.line((x+face*4,y-28,x+face*4,y-14),fill='#dc9860')
    d.rectangle((min(x+face*8,x+face*12),y-25,max(x+face*8,x+face*12),y-23),fill='#e6c17c')

def gate(direction):
    im=Image.new('RGBA',SIZE)
    d=ImageDraw.Draw(im);x,y=OX,OY
    side=direction in 'ew'
    if not side:
        shadow(im,[(x-98,y+15),(x+98,y+15),(x+115,y+34),(x-84,y+34)])
        brick(d,(x-96,y-78,x+96,y-23),9+(direction=='s'),5,17,11,True)
        molding(d,x-96,x+95,y-79,6)
        for k in [-95,-78,-61,52,69,86]:merlon(d,x+k,y-87,11)
        for offset in [-1,1]:
            l=x+offset*61
            a,b=(x-96,x-29) if offset<0 else (x+29,x+96)
            brick(d,(a,y-27,b,y+21),16+offset,4,16,9)
            molding(d,a,b-1,y+13,8)
            brick(d,(l-13,y-36,l+14,y+22),24+offset,5,15,9)
            d.line((l-13,y-35,l-13,y+19),fill=STONE[6],width=2)
            flag(d,l+offset*20,y-44,offset)
        for k in range(-40,41):
            rise=max(0,37-int((abs(k)/44)**1.72*39))
            if abs(k)>=28 or rise>0:
                d.line((x+k,y-32,x+k,y-rise+8),fill=STONE[6 if k<0 else 4],width=1)
        roof(d,x,y-102,143,30,1)
        d.rectangle((x-51,y-106,x+51,y-92),fill=TIMBER[2])
        for off in [-39,-22,-6,10,27,40]:
            d.rectangle((x+off,y-104,x+off+3,y-93),fill=TIMBER[0])
        roof(d,x,y-135,105 if direction=='s' else 113,30,1)
        d.rectangle((x-17,y-74,x+17,y-63),fill=TIMBER[0],outline='#c79a60')
        d.line((x-10,y-69,x+10,y-69),fill='#f1d6a4')
        for off in [-39,39]:lantern(d,x+off,y-70)
    else:
        outward=1 if direction=='e' else -1
        shadow(im,[(x-42,y-93),(x+43,y-93),(x+53,y+105),(x-33,y+102)])
        # The lower road is visible through the crosswise opening, below the
        # projected deck. Keep the open masonry edges distinct at world scale.
        polygon(d,[(x-35,y-35),(x+36,y-35),(x+42,y+16),(x-38,y+16)],(22,37,35,110))
        brick(d,(x-33,y-144,x+33,y-34),42,5,14,17,True)
        for ly in [y-93,y+71]:
            brick(d,(x-45,ly-50,x+45,ly+35),int(ly),4,17,10)
            molding(d,x-46,x+46,ly+26,8)
            brick(d,(x-38,ly-52,x+38,ly-20),int(ly+4),6,14,10,True)
        k=x+outward*15
        roof(d,k,y-119,112,35,1)
        d.rectangle((k-36,y-84,k+36,y-61),fill=TIMBER[2])
        for off in [-32,-16,0,16,31]:
            d.rectangle((k+off,y-84,k+off+3,y-63),fill=TIMBER[0])
        roof(d,k+outward*6,y-153,89,32,1)
        roof(d,k-outward*6,y-75,108,26,1)
        for off in [-35,37]:lantern(d,k+off,y-49)
        molding(d,x-37,x+36,y-40,6)
        for p in [x-35,x+30]:
            d.line((p,y-33,p+4,y-29),fill=STONE[6],width=2)
            d.line((p,y+19,p+4,y+23),fill=STONE[3],width=2)
        flag(d,x-outward*20,y+36,-outward)
        merlon(d,x-29,y+27,12);merlon(d,x+18,y+27,12)
    return im

def stair(direction):
    # Artwork is drawn in projected screen coordinates. Its Tiled footprint is
    # the unprojected connector between the street and the rampart.
    im=Image.new('RGBA',SIZE);d=ImageDraw.Draw(im)
    vectors={'n':(0,1),'s':(0,-1),'w':(1,0),'e':(-1,0)}
    vx,vy=vectors[direction]
    x,y=OX,OY-66
    def pt(t,w):
        return (x+vx*105*t-vy*w,y+vy*105*t+vx*w-48*(1-t))
    shadow(im,[pt(0,-36),pt(1,-36),pt(1,36),pt(0,36)])
    if vx:
        for width in [-30,30]:
            p,q=pt(0,width),pt(1,width)
            polygon(d,[p,q,(q[0],q[1]+4),(p[0],p[1]+20)],STONE[2 if width*vx>0 else 3])
            d.line((p[0],p[1]+17,q[0],q[1]+3),fill=STONE[1])
    for index in range(16):
        i=15-index if direction=='s' else index
        a=i/16;b=(i+1)/16
        polygon(d,[pt(a,-29),pt(a,29),pt(b,29),pt(b,-29)],STONE[4+i%3])
        d.line((*pt(a,-28),*pt(a,28)),fill=STONE[7],width=2)
        d.line((*pt(b,-29),*pt(b,29)),fill=STONE[2],width=2)
        for mark in [-18,4,18]:
            p=pt((a+b)*.5,mark+(i%3))
            d.line((p[0],p[1],p[0]+2,p[1]+1),fill=STONE[3])
    for side in [-1,1]:
        u,v=pt(0,33*side),pt(1,33*side)
        d.line((*u,*v),fill=DARK,width=7)
        d.line((u[0],u[1]-2,v[0],v[1]-2),fill=STONE[6],width=3)
        for t in [0,.25,.50,.75,1]:
            p=pt(t,33*side)
            d.rectangle((p[0]-3,p[1]-7,p[0]+4,p[1]+3),fill=STONE[3])
            d.line((p[0]-3,p[1]-7,p[0]+4,p[1]-7),fill=LIP)
    return im

def tower(index,small=False):
    im=Image.new('RGBA',SIZE);d=ImageDraw.Draw(im);x,y=OX,OY
    w=76 if small else 108
    h=31 if small else 41
    shadow(im,[(x-w//2,y-16),(x+w//2,y-16),(x+w//2+17,y+18),(x-w//2+10,y+18)])
    brick(d,(x-w//2,y-h-18,x+w//2,y+15),84+index,3,14,9)
    molding(d,x-w//2,x+w//2-1,y+5,9)
    brick(d,(x-w//2-4,y-h-22,x+w//2+4,y-h-4),36+index,6,16,10,True)
    for a in [-w//2+3,-w//2+18,w//2-18,w//2-5]:merlon(d,x+a,y-h-28,10)
    d.rectangle((x-w//2+10,y-89,x+w//2-10,y-38),fill=TIMBER[2])
    for a in range(-w//2+14,w//2-8,13):
        d.rectangle((x+a,y-86,x+a+5,y-43),fill=TIMBER[0])
        d.rectangle((x+a+5,y-71,x+a+9,y-54),fill='#c69962')
        d.line((x+a+7,y-71,x+a+7,y-54),fill='#75533e')
    roof(d,x,y-107,w+8,32,1)
    if not small:roof(d,x,y-136,w-22,28,1)
    lantern(d,x-w//2+13,y-51);lantern(d,x+w//2-12,y-51)
    flag(d,x+w//2-3,y-67,1 if index%2 else -1)
    return im

frames=[wall(axis,variant) for axis in 'hwe' for variant in range(4)]
frames.extend(gate(direction) for direction in 'nsew')
frames.extend(stair(direction) for direction in 'nswe')
frames.extend(tower(i) for i in range(4))
frames.extend(tower(i,True) for i in range(4))
atlas=Image.new('RGBA',(SIZE[0]*COLS,SIZE[1]*((len(frames)+COLS-1)//COLS)))
for i,frame in enumerate(frames):
    atlas.paste(frame,((i%COLS)*SIZE[0],(i//COLS)*SIZE[1]))
atlas.save(OUT/'world-ramparts.png',optimize=True)
(OUT/'bounds.json').write_text(json.dumps([frame.getbbox() for frame in frames]), encoding='utf-8')

"""Original 1x indexed-style pixel artwork for Thanh Vân Thành. Run from the repository root."""
from pathlib import Path
from PIL import Image, ImageDraw
import json
import math

OUT = Path("public/assets/city-redesign")
OUT.mkdir(parents=True, exist_ok=True)

def canvas(size): return Image.new("RGBA", size)

def stone(d, box, light, face, shade):
    x, y, w, h = box
    d.polygon([(x,y+2),(x+2,y),(x+w-3,y),(x+w-1,y+2),(x+w-1,y+h-2),
               (x+w-3,y+h-1),(x+1,y+h-1),(x,y+h-3)], fill=face)
    d.line([(x+1,y+3),(x+2,y+1),(x+w-3,y+1)], fill=light)
    d.line([(x+2,y+h-1),(x+w-3,y+h-1),(x+w-1,y+h-3)], fill=shade)

# Materials are drawn as masonry, rammed earth and planted beds, with authored seams.
TERRAIN = [
    ("#6c7266","#86897a","#777c70","#5a6259"), # arterial flagstone
    ("#686c5e","#888875","#7b7d69","#55594e"), # alleys
    ("#82725d","#a08d6d","#978061","#75644f"), # terracotta
    ("#837053","#9e8965","#927b59","#766349"), # packed earth
    ("#465a44","#637651","#576b49","#405542"), # park
    ("#626e59","#909379","#7f8871","#535e50"), # courtyard
    ("#836b56","#a58769","#977b63","#694f43"), # market cobbles
    ("#686454","#a59a79","#87816a","#504e42"), # parade square
    ("#63533a","#927951","#7e6847","#554730"), # planted soil
    ("#586a56","#9bab88","#7c9273","#435849"), # trimmed court
    ("#436257","#719788","#597d72","#354e48"), # glazed plaza
    ("#74674e","#9d8e68","#8b7a5c","#5a543f"), # garden path
]

def ground(i, k):
    im = canvas((32,32)); d = ImageDraw.Draw(im)
    base,hi,face,lo = TERRAIN[i]
    d.rectangle((0,0,31,31), fill=base)
    if i in (3,4,8):
        for j,(x,y) in enumerate(((1,2),(13,9),(25,20),(5,24),(20,3))):
            x=(x+(k%4)*7)%31; y=(y+(k//4)*9+j*2)%31
            if i==4:
                d.polygon([(x,y+3),(x+1,y),(x+2,y+2),(x+4,y-1),(x+3,y+3)],fill=lo)
                d.line((x+2,y+2,x+4,y-1),fill=hi)
                if (k+j)%8==0:d.point((x+4,y-1),fill="#c4b776")
            elif i==8:
                d.line((1,j*6+2,30,j*6+2),fill=lo)
                d.line((3,j*6+3,27,j*6+3),fill=face)
                if j%2==0:
                    for px in (6,15,23):
                        d.line((px,j*6+3,px+2,j*6),fill="#85905c")
            else:
                d.polygon([(x-2,y),(x+4,y-1),(x+8,y+1),(x+3,y+2),(x,y+2)],fill=face)
                if j%3==k%3:d.line((x+1,y+2,x+3,y+2),fill=lo)
    elif i in (7,9,10):
        stone(d,(0,0,32,32),hi,face,lo)
        if i in (7,10):
            for v in (3,28):
                for w in (3,28):
                    d.rectangle((v,w,v+1,w+1),fill=hi)
            if k in (2,5):
                d.line((9,16,16,9,23,16,16,23,9,16),fill=hi)
                d.line((13,16,16,13,19,16,16,19,13,16),fill=lo)
            elif k in (4,7):
                d.line((3,27,27,27,27,3),fill=lo)
        elif k%3==0:
            d.line((6,25,25,25), fill=lo)
    else:
        h=8 if i in (1,2,6) else 16
        w=10 if i==6 else 16
        for y in range(0,32,h):
            for x in range(-w,32,w):
                px=x+((y//h+k)%2)*(w//2)
                tone=hi if (13*k+px+3*y)%7==0 else face
                stone(d,(px,y,w,h),hi,tone,lo)
                if (px+2*y+k)%5==1:d.line((px+3,y+h-3,px+7,y+h-3),fill=base)
    return im

terrain = canvas((32*8,32*(len(TERRAIN)+1)))
for kind in range(len(TERRAIN)):
    for variant in range(8):
        terrain.paste(ground(kind,variant),(variant*32,kind*32))
for grass in (False, True):
    edge = canvas((32,32)); brush=ImageDraw.Draw(edge)
    ragged=(6,6,7,7,9,10,10,8,8,9,10,12,12,10,9,9,
            7,7,9,8,8,6,5,6,7,9,9,8,7,7,6,6)
    surface="#576b49" if grass else "#927b59"
    shadow="#4a5745" if grass else "#75654d"
    cap="#6d7e55" if grass else "#a08a65"
    for x,h in enumerate(ragged):
        brush.line((x,0,x,h),fill=surface)
        brush.point((x,h),fill=shadow)
        if x%5<2:brush.point((x,h-2),fill=cap)
    for direction in range(4):
        terrain.paste(edge.rotate(-direction*90),((direction+(4 if grass else 0))*32,32*len(TERRAIN)))
terrain.save(OUT/"courtyard-ground.png")

W,H=192,176
ROOFS=[
    ("#1c2a27","#293c39","#3c5750","#638275","#93a182"), # green
    ("#372321","#55332d","#744639","#a5684e","#c48961"), # red
    ("#1f2931","#2d3947","#404f60","#607080","#a39a78"), # navy
    ("#3c3020","#5c4930","#7f643b","#9f8250","#b89a61"), # straw
    ("#242a27","#373b35","#525949","#748069","#a2aa78"),
]

def dark_shadow(d, points): d.polygon(points,fill="#18251249")

def roof(d, x, y, w, h, palette, thatch=False):
    edge,shade,mid,hi,cap=ROOFS[palette]
    d.polygon([(x,y+h-7),(x+13,y+h-10),(x+26,y+12),(x+40,y+4),(x+w-40,y+4),
               (x+w-26,y+12),(x+w-13,y+h-10),(x+w,y+h-7),(x+w-3,y+h+3),
               (x+11,y+h+8),(x+w-13,y+h+8),(x+5,y+h+6)],fill=edge)
    tops=[(x+17,y+h-4),(x+33,y+14),(x+44,y+6),(x+w-43,y+6),(x+w-32,y+14),(x+w-16,y+h-4)]
    d.polygon(tops,fill=mid)
    for j in range(7,x+w-x-21,5 if not thatch else 3):
        f=j/(w-22); end=x+11+j; start=int(x+39+f*(w-78))
        base=y+(8 if .16<f<.84 else 14)
        d.line((start,base,int(.6*start+.4*end),base+int(h*.45),end,y+h),fill=shade,width=2 if not thatch else 1)
        d.line((start+2,base+3,int(.6*start+.4*end)+2,base+int(h*.45),end+2,y+h-2),fill=hi)
        if not thatch and j%3:
            d.line((int((start+end)/2),y+h//2+6,int((start+end)/2)+2,y+h//2+6),fill=cap if j%5==2 else mid)
            d.point((end+2,y+h+1),fill=cap)
    for band in (h//2, h-10):
        d.line((x+32,y+band,x+w-32,y+band),fill=shade)
    d.line((x+1,y+h-5,x+10,y+h+1,x+27,y+h+4,x+w-27,y+h+4,x+w-11,y+h+1,x+w-1,y+h-6),fill=cap,width=2)
    d.line((x+27,y+12,x+38,y+3,x+47,y+2,x+w-47,y+2,x+w-38,y+3,x+w-27,y+12),fill=edge,width=3)
    d.line((x+37,y+4,x+47,y+1,x+w-47,y+1,x+w-37,y+4),fill=hi)

def window(d,x,y,w,h,lit=False):
    d.rectangle((x-2,y-2,x+w+2,y+h+2),fill="#322c23")
    d.rectangle((x,y,x+w,y+h),fill="#cca06a" if lit else "#777459")
    for ix in range(x+2,x+w,4):
        d.line((ix,y,ix,y+h),fill="#4b372b",width=1)
    for iy in range(y+3,y+h,5):
        d.line((x,iy,x+w,iy),fill="#51392c")
    d.line((x-2,y+h+3,x+w+2,y+h+3),fill="#ab8962",width=1)
    d.line((x-1,y-1,x+w,y-1),fill="#ad8861")

def lantern(d,x,y,mini=False):
    d.line((x,y-7,x,y+13),fill="#62452c")
    d.polygon([(x-5,y+2),(x-4,y-1),(x+3,y-1),(x+5,y+2),(x+4,y+9),
               (x+2,y+11),(x-3,y+11),(x-5,y+8)],fill="#7d372b")
    d.rounded_rectangle((x-3,y,x+3,y+9),radius=2,fill="#de673f")
    d.line((x-1,y+1,x-1,y+8),fill="#f1ac62")
    d.line((x-4,y-1,x+4,y-1),fill="#a08348")
    d.line((x,y+11,x,y+14),fill="#d1a453")

def house(kind):
    im=canvas((W,H)); d=ImageDraw.Draw(im)
    widths=[152,172,146,170,172,155,166,176]
    width=widths[kind]; x=(W-width)//2; y=[52,38,57,51,42,52,41,35][kind]
    main_y=150; left=x+13; right=x+width-14
    dark_shadow(d,[(left-2,143),(right+5,143),(right+26,158),(right+19,165),(left+10,165),(left-5,154)])
    stone(d,(left-3,135,right-left+7,20),"#b1a891","#777969","#454b42")
    for v in range(left+7,right-2,16):
        d.line((v,139,v,147),fill="#595e52")
    d.rectangle((left,92,right,135),fill="#473c2e")
    d.rectangle((left+3,94,right-15,132),fill="#c8b893" if kind!=3 else "#a99672")
    d.polygon([(right-15,94),(right,83),(right,134),(right-15,142)],fill="#8a7c60")
    d.line((right-14,102,right,94),fill="#544536",width=2)
    for v in range(101,132,9):
        d.line((right-13,v,right-2,v-7),fill="#a59471")
    for j in (0,1,2):
        for i in (0,1,2):
            bx=left+8+i*11+j*6; by=105+j*8
            d.line((bx,by,bx+5,by),fill="#b3a485")
    doorway=(left+right-10)//2
    for xpost in (left,left+38,doorway+15,right-15):
        d.rectangle((xpost,93,xpost+4,142),fill="#573a2d")
        d.line((xpost+1,98,xpost+1,139),fill="#a27753")
        stone(d,(xpost-1,139,8,5),"#a79e8a","#79786a","#4b514a")
    d.rectangle((doorway-12,106,doorway+14,140),fill="#392e25")
    for c in range(-10,15,5):
        d.line((doorway+c,111,doorway+c,137),fill="#78604a")
    d.rectangle((doorway-1,122,doorway+2,124),fill="#c89b53")
    for row in range(2):stone(d,(doorway-19-row*3,142+row*4,37+row*6,5),"#baa788","#96917b","#606153")
    window(d,left+11,108,20,17,kind in (1,4,6,7))
    window(d,right-43,108,19,18,kind in (4,6,7))
    d.line((left+1,100,right-14,100),fill="#4c3729",width=3)
    palette=[0,1,2,3,2,4,1,0][kind]
    if kind in (1,4,6,7):
        roof(d,x+14,y-14,width-28,38,palette)
        d.rectangle((x+25,y+23,x+width-25,y+32),fill="#664531")
        for sx in range(x+32,x+width-26,14):
            window(d,sx,y+24,9,7,kind in (4,7))
    roof(d,x,y+26 if kind in (1,4,6,7) else y,width, 55 if kind in (0,2,3,5) else 37,palette,kind==3)
    if kind in (1,4,5,6,7):
        d.rectangle((doorway-17,95,doorway+18,105),fill="#553b2a")
        d.rectangle((doorway-15,97,doorway+16,103),fill="#282c26")
        for i in range(3):
            xx=doorway-8+8*i
            d.line((xx,98,xx,102),fill="#d7b876")
            d.line((xx-2,100,xx+2,100),fill="#d7b876")
        lantern(d,left+6,101);lantern(d,right-22,101)
    return im

def planter(d,x,y,color="#66906a",flowers=False):
    dark_shadow(d,[(x-12,y-3),(x+14,y-3),(x+22,y+3),(x-9,y+5)])
    d.polygon([(x-12,y-12),(x+12,y-12),(x+9,y),(x-9,y)],fill="#785f47")
    d.rectangle((x-13,y-14,x+13,y-10),fill="#9b7953")
    for i,(dx,dy) in enumerate(((-9,-13),(-3,-21),(4,-17),(10,-14),(5,-24))):
        d.line((x,y-11,x+dx,y+dy),fill="#364b33")
        d.polygon([(x+dx-3,y+dy),(x+dx,y+dy-3),(x+dx+4,y+dy-1),(x+dx+2,y+dy+2)],fill=color)
        if flowers and i%2==0:d.rectangle((x+dx-1,y+dy-4,x+dx+1,y+dy-2),fill="#d6878b")

def wooden_box(d,x,y,w=28,h=21):
    d.polygon([(x,y-h),(x+w-5,y-h-5),(x+w,y-h),(x+w,y-2),(x,y)],fill="#593e28")
    d.polygon([(x+2,y-h+2),(x+w-5,y-h+1),(x+w-5,y-3),(x+2,y-3)],fill="#a27b4c")
    d.line((x+3,y-h+3,x+w-7,y-4),fill="#c3965b",width=2)
    for i in range(5,w-5,5):d.line((x+i,y-h+3,x+i,y-4),fill="#7b5837")
    d.line((x,y-h,x+w-5,y-h-5,x+w,y-h),fill="#c3a06a")

def prop(kind, sway=0):
    im=canvas((W,H));d=ImageDraw.Draw(im); x,y=96,152
    if kind in (0,1,2):
        ry=14 if kind==0 else (24 if kind==1 else 37)
        rx=24 if kind==0 else (48 if kind==1 else 67)
        dark_shadow(d,[(x-rx,y-5),(x+rx,y-5),(x+rx+19,y+9),(x-rx+5,y+10)])
        d.ellipse((x-rx,y-ry*2,x+rx,y+4),fill="#4a5048")
        d.ellipse((x-rx,y-ry*2-4,x+rx,y-4),fill="#8b9785")
        d.ellipse((x-rx+6,y-ry*2+1,x+rx-6,y-9),fill="#595e52")
        d.ellipse((x-rx+9,y-ry*2+5,x+rx-9,y-11),fill="#325f60" if kind!=2 else "#367371")
        for j in range(8):
            xx=x+(j%4-2)*rx//3; yy=y-ry-1+j%2*7
            d.line((xx,yy,xx+5,yy),fill="#619a8a")
        for j in range(12):
            a=math.pi*2*j/12
            xx=x+int((rx-4)*math.cos(a));yy=y-ry-4+int((ry-1)*math.sin(a))
            d.line((xx,yy,xx+2,yy+1),fill="#c2bda2")
        if kind in (1,2):
            stone(d,(x-13,y-ry-10,27,15),"#bcb59a","#737e70","#505a4f")
            d.polygon([(x-10,y-ry-7),(x-5,y-ry-27),(x+2,y-ry-35),(x+11,y-ry-20),(x+9,y-ry-7)],fill="#658c79")
            d.line((x-3,y-ry-9,x+1,y-ry-28,x+5,y-ry-22),fill="#a0baa0")
    elif kind==3:
        dark_shadow(d,[(x-34,y-6),(x+36,y-6),(x+40,y+4),(x-29,y+6)])
        for dx in (-28,26):d.rectangle((x+dx,y-20,x+dx+4,y),fill="#503b2b")
        for dy in (-23,-16,-11):
            d.polygon([(x-37,y+dy),(x+30,y+dy),(x+37,y+dy+3),(x-34,y+dy+5)],fill="#986846")
            d.line((x-35,y+dy,x+30,y+dy),fill="#be915f")
    elif kind in (4,5,6):
        planter(d,x,y,"#789064",kind==5)
        if kind==6:
            d.line((x,y-13,x-4,y-39,x+7,y-44),fill="#4f4230",width=3)
            for ox,oy,rad in [(-10,-36,9),(2,-42,11),(12,-40,8),(2,-50,6)]:
                d.ellipse((x+ox-rad,y+oy-rad//2,x+ox+rad,y+oy+rad//2),fill="#415f48")
                d.arc((x+ox-rad,y+oy-rad//2,x+ox+rad,y+oy+rad//2),180,320,fill="#869b66",width=2)
    elif kind==7:
        wooden_box(d,x-37,y,30,23);wooden_box(d,x-5,y-5,29,22);wooden_box(d,x-22,y-16,24,19)
    elif kind==8:
        dark_shadow(d,[(x-40,y-1),(x+38,y-1),(x+46,y+6),(x-32,y+5)])
        d.line((x-18,y-12,x-53,y-4),fill="#99815b",width=3)
        wooden_box(d,x-28,y-8,63,24)
        for px in (x-15,x+28):
            d.ellipse((px-9,y-18,px+9,y),fill="#4a372a",outline="#aa8053",width=2)
            for a in range(8):
                ang=a*math.pi/4
                d.line((px,y-9,px+int(math.cos(ang)*7),y-9+int(math.sin(ang)*7)),fill="#9b774d")
            d.rectangle((px-2,y-11,px+2,y-7),fill="#c29b60")
    elif kind in (9,10):
        dark_shadow(d,[(x-30,y),(x+28,y),(x+35,y+5),(x-21,y+6)])
        for ix in range(3):
            px=x-22+22*ix;py=y-(ix%2)*11
            d.ellipse((px-10,py-14,px+10,py),fill="#8e6848",outline="#554333",width=1)
            d.ellipse((px-9,py-14,px+9,py-8),fill="#57453a",outline="#bc9061")
            for j in range(7):
                dx=(j%4-2)*3;dy=(j//4)*3
                d.rectangle((px+dx,py-14+dy,px+dx+2,py-12+dy),fill=("#b95c48" if ix%2==0 else "#8da45d") if kind==9 else "#788f56")
    elif kind in (11,12,13,14):
        dark_shadow(d,[(x-7,y-4),(x+6,y-4),(x+25,y+4),(x+1,y+5)])
        stone(d,(x-6,y-5,13,6),"#8f9179","#6f7467","#484c45")
        d.line((x,y-7,x,y-58),fill="#45362a",width=4)
        d.line((x-1,y-8,x-1,y-57),fill="#a78657")
        if kind==11:
            d.line((x,y-52,x+19,y-52),fill="#6f5436",width=2);lantern(d,x+14+sway,y-43)
        elif kind==12:
            d.polygon([(x+2,y-52),(x+22,y-50),(x+21,y-22),(x+14,y-27),(x+2,y-23)],fill="#88483c")
            d.line((x+4,y-51,x+4,y-25),fill="#cc8f59")
            d.rectangle((x+12,y-45,x+15,y-35),fill="#d2af64")
        elif kind==13:
            stone(d,(x-8,y-40,17,15),"#b59058","#624936","#392e28")
            d.rectangle((x-4,y-37,x+4,y-30),fill="#e4bb6c")
            d.polygon([(x-10,y-40),(x,y-52),(x+10,y-40)],fill="#435044")
        else:
            d.rectangle((x-17,y-45,x+18,y-26),fill="#543c2c")
            d.rectangle((x-14,y-42,x+15,y-29),fill="#c3a279")
            for v in (-8,-2,4,10):d.line((x+v,y-39,x+v,y-33),fill="#70503a")
    elif kind in (15,16,17):
        if kind==15:
            for j in range(4):
                px=x-35+j*14;py=y-(j%2)*7
                d.polygon([(px,py-14),(px+12,py-19),(px+31,py-13),(px+31,py-3),(px,py)],fill="#805c3c")
                d.ellipse((px+24,py-13,px+35,py-3),fill="#bd945e",outline="#684a30")
                d.arc((px+26,py-11,px+32,py-5),90,325,fill="#956b43")
        elif kind==16:
            d.rectangle((x-23,y-21,x+23,y),fill="#784f34")
            stone(d,(x-31,y-30,64,16),"#9a9884","#484a43","#262a28")
            d.polygon([(x-24,y-38),(x+31,y-38),(x+18,y-31),(x-13,y-30)],fill="#7d8176")
            d.line((x-26,y-39,x+31,y-39),fill="#c2b8a0",width=2)
            d.line((x+2,y-44,x+19,y-28),fill="#b58a58",width=3)
        else:
            for px in range(x-57,x+60,10):
                d.polygon([(px,y),(px,y-19),(px+3,y-23),(px+5,y-20),(px+5,y)],fill="#766047")
                d.line((px+1,y-19,px+1,y-1),fill="#9a7d54")
            d.line((x-59,y-13,x+60,y-13),fill="#a27d54",width=2)
    return im

props=canvas((W*8,H*4))
for i in range(26):
    sprite=house(i) if i<8 else prop(i-8)
    props.paste(sprite,((i%8)*W,(i//8)*H))
for i in range(26,32):
    im=canvas((W,H));d=ImageDraw.Draw(im);x,y=96,152
    if i in (26,27,28): # rising smoke cells
        d.line((x-5,y-2,x+1,y-12,x-1,y-21,x+7,y-31),fill="#aaa99b55",width=5)
        d.line((x+7,y-32,x+2+(i%3)*3,y-40,x+8,y-51),fill="#a7a69d32",width=6)
    elif i==31:
        dark_shadow(d,[(x-16,y-4),(x+17,y-6),(x+49,y+6),(x+13,y+9),(x-22,y+3)])
        d.polygon([(x-13,y),(x-5,y-15),(x-8,y-58),(x-20,y-77),(x-14,y-79),
                  (x,y-63),(x+12,y-83),(x+17,y-80),(x+7,y-58),(x+4,y-27),(x+9,y)],fill="#563d31")
        d.line((x-4,y-3,x-2,y-33,x-4,y-59,x-17,y-75),fill="#9e7152",width=3)
        d.line((x+2,y-48,x+13,y-75,x+26,y-78),fill="#86573d",width=3)
        clusters=[(-30,-70,18,11),(-17,-87,22,15),(8,-88,22,14),(28,-72,20,14),
                  (17,-59,18,12),(-20,-57,20,14),(0,-69,26,14)]
        for j,(dx,dy,w,h) in enumerate(clusters):
            cx,cy=x+dx,y+dy
            ab=[(cx-w,cy+3),(cx-w+2,cy-5),(cx-w+8,cy-5),(cx-w+9,cy-h),
                (cx+w-9,cy-h+1),(cx+w-6,cy-5),(cx+w,cy-3),(cx+w,cy+5),
                (cx+w-9,cy+h),(cx-w+7,cy+h-2)]
            d.polygon(ab,fill="#834c58")
            d.polygon([(cx-w+2,cy),(cx-w+8,cy-7),(cx-4,cy-h+2),(cx+w-8,cy-h+3),
                       (cx+w-3,cy-1),(cx+w-10,cy+5),(cx-w+10,cy+6)],fill="#bd7180")
            for ox,oy in [(-8,-4),(1,-7),(7,-1),(-4,3)]:
                d.line((cx+ox-2,cy+oy,cx+ox+2,cy+oy),fill="#e6a2a0")
                d.line((cx+ox,cy+oy-2,cx+ox,cy+oy+2),fill="#d89491")
    else:
        im=prop(11,-1 if i==29 else 1)
    props.paste(im,((i%8)*W,(i//8)*H))
props.save(OUT/"courtyard-objects.png")
bounds = []
for i in range(32):
    col,row=(i%8)*W,(i//8)*H
    frame=props.crop((col,row,col+W,row+H))
    bounds.append(frame.getchannel("A").getbbox())
for group in ((19,29,30),(26,27,28)):
    rects=[bounds[i] for i in group]
    box=(min(r[0] for r in rects),min(r[1] for r in rects),max(r[2] for r in rects),max(r[3] for r in rects))
    for i in group: bounds[i]=box
(OUT/"object-bounds.json").write_text(json.dumps(bounds,indent=2)+"\n",encoding="utf-8")


def palace():
    im=canvas((320,256)); d=ImageDraw.Draw(im)
    dark_shadow(d,[(21,213),(265,210),(308,237),(300,250),(33,251),(10,234)])
    stone(d,(25,197,264,32),"#aa9e7d","#787e6d","#4d554b")
    stone(d,(34,188,247,23),"#b3a990","#818773","#4a5549")
    for y in (201,214,224):
        for x in range(29+(y%3)*7,280,16):
            d.line((x,y,x,y+3),fill="#596458")
    for level in range(5):
        stone(d,(131-level*4,212+level*6,60+level*8,8),"#cbc2a6","#a39e86","#676e60")
    # Side galleries and central timber frame.
    for wing in (25,209):
        d.rectangle((wing+9,136,wing+86,197),fill="#ae9f7e")
        d.rectangle((wing+13,148,wing+84,168),fill="#776049")
        for x in range(wing+17,wing+80,22):
            window(d,x,154,14,26,True)
        for x in (wing+8,wing+45,wing+82):
            d.rectangle((x,136,x+5,200),fill="#614234")
            d.line((x+1,142,x+1,198),fill="#ae7f54")
        roof(d,wing-8,93,111,53,2)
    d.rectangle((73,103,249,200),fill="#332f27")
    d.rectangle((79,109,241,193),fill="#b5a787")
    d.polygon([(221,111),(244,105),(244,197),(221,202)],fill="#887858")
    d.rectangle((135,145,187,207),fill="#3f3028")
    for x in range(141,183,7):
        d.line((x,153,x,201),fill="#956248")
        d.rounded_rectangle((x,160,x+3,177),radius=1,fill="#745140")
    d.line((161,152,161,204),fill="#2d2823",width=2)
    for x in (155,166): d.rectangle((x,180,x+2,182),fill="#d3ae55")
    for x in (89,193):
        window(d,x,158,22,29,True)
    for x in (77,119,194,233):
        d.rectangle((x,119,x+7,206),fill="#704437")
        d.line((x+1,124,x+1,198),fill="#ac7252",width=2)
        stone(d,(x-2,198,13,10),"#b0a486","#7f806f","#4d554b")
    d.rectangle((78,122,240,135),fill="#543a2f")
    for x in range(83,240,11):
        d.rectangle((x,128,x+4,131),fill="#a98149")
    roof(d,64,64,191,61,0)
    d.rectangle((109,64,210,84),fill="#513a30")
    for x in range(116,201,17):window(d,x,68,11,9,True)
    roof(d,91,16,137,53,0)
    for x in (123,199):
        d.line((x,25,x,17,x-4,16,x-3,11,x+2,9,x+6,12),fill="#9e9868",width=2)
    d.rectangle((127,137,193,151),fill="#6d482f")
    d.rectangle((130,139,190,149),fill="#313f37",outline="#b98e52")
    for x in (140,157,174):
        d.line((x-3,144,x+5,144),fill="#c6b371")
        d.line((x,141,x,147),fill="#c6b371")
    for x in (113,209):lantern(d,x,140)
    for x in (51,270):
        stone(d,(x-9,213,18,7),"#b6aa89","#808472","#4f5b4f")
        d.polygon([(x-7,212),(x-5,203),(x-8,201),(x-2,194),(x+5,196),(x+7,204),(x+5,213)],fill="#828777")
        d.line((x-5,199,x+3,198),fill="#b8b096",width=2)
        d.point((x+2,200),fill="#4d564a")
    return im

palace().save(OUT/"city-palace.png")

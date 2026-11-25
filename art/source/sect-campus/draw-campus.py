"""Paint the architecture and courtyard furnishings at native world resolution."""
from pathlib import Path
from PIL import Image, ImageDraw
import json
import random

OUT=Path(__file__).resolve().parents[3]/'public/assets/sect-campus'
SIZE=(320,256)
WIDTH=320
HEIGHT=256
GREEN=['#152d32','#203e44','#2c5960','#438079','#76a18a']
RED=['#30232a','#502f35','#7d4641','#a95d4a','#bd8e5c']
STONE=['#344c4a','#5f7370','#85918b','#b6b6a2']

def roof(d,x,y,w,h,p):
    l,r=x-w//2,x+w//2
    shape=[(l-12,y+h-13),(l+9,y+h-8),(l+31,y+9),(x-w//4,y),(x+w//4,y),(r-31,y+9),(r-9,y+h-8),(r+12,y+h-13),(r,y+h),(l,y+h)]
    d.polygon(shape,fill=p[1],outline=p[0],width=2)
    d.polygon([(l+25,y+14),(x-w//4,y+2),(x+w//4,y+2),(r-25,y+14),(r-16,y+23),(l+16,y+23)],fill=p[2])
    for u in range(l+8,r-6,6):
        xx=x+int((u-x)*.52)
        d.line((xx,y+5,u,y+h-4),fill=p[0],width=2)
        d.line((xx+2,y+7,u+2,y+h-6),fill=p[3])
    d.line((l,y+h-4,r,y+h-4),fill=p[0],width=3)
    d.line((l+5,y+h,r-5,y+h),fill=RED[4],width=2)
    d.line((x-w//4,y+1,x+w//4,y+1),fill=p[4],width=2)
    for xx,side in [(l,-1),(r,1)]:
        d.line((xx,y+h-4,xx+11*side,y+h-12,xx+10*side,y+h-20),fill=p[3],width=2)
        d.point((xx+11*side,y+h-17),fill='#dbac63')

def lantern(d,x,y):
    d.line((x,y-5,x,y+15),fill='#936847')
    d.rounded_rectangle((x-5,y,x+5,y+11),2,fill='#ae483e',outline='#703637')
    d.rectangle((x-2,y+2,x+2,y+8),fill='#f4b269')
    d.point((x,y+13),fill='#ed9862')

def building(i,w,h,p,tiers,gate=False):
    im=Image.new('RGBA',SIZE);d=ImageDraw.Draw(im); x,y=160,202; left=x-w//2; right=x+w//2
    d.polygon([(left-8,y-4),(right+6,y-14),(right+24,y+16),(left+12,y+15)],fill=(21,36,29,90))
    segments=[(left,right)] if not gate else [(left,x-49),(x+49,right)]
    rng=random.Random(145+i)
    for l,r in segments:
        d.rectangle((l,y-h,r,y+3),fill=STONE[0])
        d.rectangle((l+2,y-h+3,r-3,y-7),fill='#bbac89')
        d.rectangle((r-14,y-h+5,r-2,y-8),fill='#8c8069')
        for yy in range(y-21,y+4,6):
            d.line((l,yy,r,yy),fill=STONE[1],width=2)
            for xx in range(l+5+(yy%4)*2,r-4,14):d.line((xx,yy,xx,yy+4),fill=STONE[0])
        for xx in range(l+6,r-5,24):
            d.rectangle((xx-3,y-h,xx+4,y-17),fill=RED[1])
            d.line((xx-1,y-h,xx-1,y-19),fill=RED[3],width=2)
            if xx+18<r and (gate or abs(xx-x)>22):
                top=y-h+20
                d.rectangle((xx+5,top,xx+18,top+21),fill='#2d3432',outline=RED[1])
                for a in range(xx+6,xx+19,4):d.line((a,top+2,a,top+18),fill='#b99c6d')
                d.line((xx+5,top+12,xx+17,top+12),fill='#ad966e')
        for j in range(w//6):
            xx=rng.randrange(l+2,max(l+3,r-1))
            d.line((xx,y-4,xx+2,y-5),fill=STONE[2])
    if not gate:
        d.rectangle((x-17,y-47,x+17,y+1),fill=RED[0],outline=RED[4],width=2)
        d.rectangle((x-14,y-44,x+14,y-2),fill=RED[1])
        d.line((x,y-45,x,y+1),fill=RED[0],width=2)
        d.point((x-4,y-22),fill='#dfb375');d.point((x+4,y-22),fill='#dfb375')
        for step in range(4):
            d.rectangle((x-24-step*2,y+1+step*4,x+24+step*2,y+4+step*4),fill=STONE[step%3])
            d.line((x-24-step*2,y+1+step*4,x+24+step*2,y+1+step*4),fill=STONE[3])
    d.rectangle((left-1,y-h-7,right+1,y-h+12),fill=RED[0])
    roof(d,x,y-h-42,w+21,47,p)
    for tier in range(1,tiers):
        span=w-37*tier; top=y-h-42*tier
        d.rectangle((x-span//2+4,top-16,x+span//2-3,top+3),fill=RED[1])
        for post in range(x-span//2+10,x+span//2-6,13):d.line((post,top-15,post,top+1),fill=RED[4],width=2)
        roof(d,x,top-43,span,37,p)
    d.rectangle((x-21,y-h+7,x+21,y-h+18),fill='#393134',outline='#b78e56')
    for xx in [-10,0,10]:d.line((x+xx,y-h+11,x+xx,y-h+15),fill='#e4c18a')
    for a in [-1,1]:lantern(d,x+a*(w//2-16),y-h+16)
    return im

def garden(kind):
    im=Image.new('RGBA',SIZE);d=ImageDraw.Draw(im);x,y=160,202
    if kind in ['ring','pond']:
        rx,ry=(92,55) if kind=='ring' else (94,43)
        d.ellipse((x-rx,y-ry*2,x+rx,y),fill=STONE[0])
        d.ellipse((x-rx+3,y-ry*2+3,x+rx-3,y-5),fill=STONE[2])
        d.ellipse((x-rx+10,y-ry*2+12,x+rx-10,y-12),fill='#355b60' if kind=='ring' else '#265965')
        for at in range(16):
            import math
            px=x+int((rx-6)*math.cos(at*math.pi/8));py=y-ry+int((ry-6)*math.sin(at*math.pi/8))
            d.line((px-4,py,px+4,py),fill='#aec4a5',width=2)
        if kind=='ring':
            d.ellipse((x-44,y-ry-27,x+44,y-ry+27),outline='#80d9c5',width=2)
            d.polygon([(x,y-ry-29),(x+53,y-ry),(x,y-ry+27),(x-53,y-ry)],outline='#5aaca3',width=2)
            for dx,dy in [(-63,4),(63,4),(0,-38),(0,34)]:
                a,b=x+dx,y-ry+dy
                d.polygon([(a-5,b),(a+2,b-15),(a+7,b-3),(a+3,b+1)],fill='#529f9c',outline='#263e4f')
                d.line((a+1,b-13,a-1,b-2),fill='#beecd9')
            for row in [-81,-37]:
                for offset in [-70,-24,22,68]:
                    a,b=x+offset,y+row
                    d.ellipse((a-10,b-4,a+10,b+5),fill='#263e40',outline='#7aa799')
                    d.line((a-5,b+1,a+5,b+1),fill='#639081')
        else:
            for dx,dy in [(-62,-34),(-20,-19),(12,-58),(32,-28),(57,-43)]:
                d.line((x+dx,y+dy,x+dx+14,y+dy),fill='#6c9c9a')
                d.ellipse((x+dx-3,y+dy-7,x+dx+4,y+dy-3),fill='#54845b')
                d.point((x+dx,y+dy-6),fill='#e8a298')
    elif kind=='arena':
        edge=[(x-91,y-15),(x-103,y-73),(x-70,y-110),(x+67,y-110),(x+103,y-75),(x+94,y-20),(x+64,y),(x-63,y)]
        d.polygon(edge,fill='#56564e',outline='#253b3c',width=3)
        d.polygon([(px+int((x-px)*.06),py-4) for px,py in edge],fill='#8c8c78',outline='#b5a383',width=3)
        for row in range(y-104,y-4,9):
            l,r=x-80,x+80
            if row<y-85 or row>y-23:l+=15;r-=15
            d.line((l,row,r,row),fill='#777869')
            for col in range(l+8+(row%5)*3,r,22):d.line((col,row,col,row+7),fill='#a4a18b')
        cy=y-53
        d.ellipse((x-44,cy-36,x+44,cy+35),fill='#d2be9a',outline='#6e5947',width=2)
        d.pieslice((x-41,cy-33,x+41,cy+32),-90,90,fill='#4a4942')
        d.ellipse((x-20,cy-32,x+20,cy),fill='#4a4942')
        d.ellipse((x-20,cy,x+20,cy+31),fill='#d2be9a')
        d.ellipse((x-5,cy-22,x+5,cy-13),fill='#d2be9a')
        d.ellipse((x-5,cy+12,x+5,cy+21),fill='#4a4942')
    elif kind=='plot':
        for row in range(5):
            yy=y-72+row*14
            d.polygon([(x-80,yy),(x+76,yy),(x+82,yy+9),(x-84,yy+9)],fill='#675440')
            d.line((x-76,yy+3,x+76,yy+3),fill='#ae8254',width=2)
            for col in range(9):
                xx=x-69+col*17;d.line((xx,yy+6,xx,yy-3),fill='#6f9753')
                d.line((xx-3,yy,xx,yy+3,xx+3,yy-2),fill='#9abb6f',width=2)
                if (row+col)%5==0:d.point((xx,yy-4),fill='#ded199')
    elif kind=='dummy':
        d.ellipse((x-17,y-7,x+16,y+2),fill=(25,32,25,90))
        d.rectangle((x-4,y-46,x+4,y),fill=RED[1]);d.line((x-1,y-44,x-1,y-3),fill=RED[4],width=2)
        d.line((x-15,y-32,x+16,y-30),fill=RED[3],width=6)
        d.ellipse((x-9,y-52,x+9,y-40),fill='#aa8354',outline=RED[1])
    elif kind=='hedge':
        rng=random.Random(41)
        d.ellipse((x-38,y-12,x+42,y+2),fill=(28,44,31,104))
        for i in range(13):
            a=x-34+(i%7)*10;b=y-9-(i//7)*9;r=rng.randrange(6,11)
            d.polygon([(a-r,b),(a-r+2,b-7),(a-1,b-12),(a+8,b-8),(a+9,b+1),(a+2,b+5)],fill=['#345940','#467247','#568151'][i%3])
            d.line((a-4,b-6,a+4,b-8),fill='#89a866',width=2)
            if i%3==0:d.point((a,b-8),fill='#e3b681')
    elif kind=='pillar':
        d.rectangle((x-20,y-8,x+19,y),fill=STONE[1])
        d.rectangle((x-9,y-47,x+9,y-8),fill=GREEN[1])
        d.line((x-5,y-47,x-5,y-10),fill=GREEN[3],width=2)
        d.line((x-12,y-44,x+14,y-44),fill=RED[4],width=2)
        lantern(d,x+13,y-39)
    elif kind=='table':
        d.ellipse((x-42,y-9,x+46,y+2),fill=(25,36,31,100))
        for offset in [-29,24]:d.rectangle((x+offset,y-22,x+offset+5,y),fill=RED[1])
        d.polygon([(x-41,y-26),(x+36,y-26),(x+40,y-14),(x-35,y-14)],fill=RED[3],outline=RED[0])
        d.line((x-31,y-21,x+33,y-21),fill=RED[4])
        for offset in [-23,0,21]:
            d.ellipse((x+offset-8,y-27,x+offset+7,y-19),fill='#b29a6e',outline='#5d5549')
            d.ellipse((x+offset-5,y-26,x+offset+5,y-22),fill='#686e48')
    elif kind=='ore':
        d.ellipse((x-29,y-9,x+31,y+5),fill=(26,34,35,85))
        for a,b in [(-14,0),(11,-5),(0,-13)]:
            px,py=x+a,y+b
            d.polygon([(px-15,py-3),(px-12,py-15),(px-1,py-21),(px+11,py-15),(px+15,py-6),(px+5,py+2)],
                      fill='#535955',outline='#323b3d')
            d.polygon([(px-12,py-15),(px-1,py-20),(px+7,py-14),(px-6,py-10)],fill='#91a197')
            d.line((px-10,py-11,px-5,py-7,px+2,py-10),fill='#b38865',width=2)
            d.point((px+3,py-11),fill='#ddba83')
    elif kind=='wall-side':
        d.rectangle((x-11,y-53,x+10,y+2),fill=STONE[0])
        d.rectangle((x-9,y-50,x+8,y),fill='#9b9d84')
        d.line((x-9,y-48,x-9,y),fill=STONE[3],width=2)
        for yy in range(y-48,y,11):d.line((x-9,yy,x+9,yy),fill=STONE[1])
        d.rectangle((x+3,y-54,x+13,y+1),fill=GREEN[1])
        d.line((x+4,y-54,x+4,y+1),fill=GREEN[3],width=2)
    elif kind=='wall':
        d.rectangle((x-48,y-23,x+47,y),fill=STONE[0])
        d.rectangle((x-48,y-19,x+47,y-4),fill='#9b9e84')
        for xx in range(x-43,x+47,15):d.line((xx,y-21,xx,y-6),fill='#798478')
        d.rectangle((x-49,y-26,x+48,y-20),fill=GREEN[1])
        d.line((x-47,y-25,x+47,y-25),fill=GREEN[3])
    return im

frames=[building(i,w,h,GREEN if i in [0,1,2,4,7] else RED,t,i==0) for i,(w,h,t) in enumerate([
    (190,64,2),(243,78,3),(151,54,2),(150,58,2),(163,57,2),(175,62,2),(110,43,1),(155,62,2),(138,51,1),(132,55,2)])]
frames.extend(garden(kind) for kind in ['ring','pond','plot','dummy','wall','hedge','pillar','table','wall-side','ore','arena'])
atlas=Image.new('RGBA',(WIDTH*5,HEIGHT*5))
for frame,image in enumerate(frames):atlas.paste(image,(frame%5*WIDTH,frame//5*HEIGHT))
atlas.save(OUT/'campus.png',optimize=True)
(OUT/'bounds.json').write_text(json.dumps([f.getbbox() for f in frames]),encoding='utf8')

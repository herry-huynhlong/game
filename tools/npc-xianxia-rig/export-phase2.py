from pathlib import Path
from PIL import Image, ImageDraw, ImageOps
import json, math

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public/assets/npc-combat-mount'
OUT.mkdir(exist_ok=True)
source=Image.open(ROOT/'art/source/npc-xianxia-rig/phase2/huyen-ho.png').convert('RGBA')
frames={};anchors={};saddles={};weapon_points={}
DIRECTIONS=('down','up','right','left')

# Source coordinates are the actual saddle seats in the two distinct drawn poses.
for col,(a,b) in enumerate(zip((0,495,900),(495,900,1536))):
    direction=DIRECTIONS[col]
    for row in range(2):
        y0=row*512
        im=source.crop((a,y0,b,y0+512));im.putalpha(im.getchannel('A').point(lambda p:255 if p>=200 else 0))
        box=im.getbbox();im=im.crop(box)
        alpha=im.getchannel('A');im=im.convert('RGB').quantize(colors=39,dither=Image.Dither.NONE).convert('RGBA');im.putalpha(alpha)
        factor=.176
        im=im.resize((round(im.width*factor),round(im.height*factor)),Image.Resampling.NEAREST)
        px,py=[[(245,188),(707,202),(1224,217)],[(245,685),(705,692),(1224,714)]][row][col]
        x=round((px-a-box[0])*factor);y=round((py-y0-box[1])*factor)
        for facing,flipped,step in [(direction,False,row)]+([('left',True,row)] if direction=='right' else [(direction,True,2)] if row else []):
            pic=ImageOps.mirror(im) if flipped else im
            sx=pic.width-1-x if flipped else x
            key=f'tiger/{facing}/{step}'
            frames[key]=pic;anchors[key]=[sx,pic.height-1];saddles[key]=[0,y-pic.height+1]
        if row and direction=='right':
            # A gathered phase with the existing tail and body, and new inverted paw arcs.
            cut=round(im.height*.74)
            alternate=im.copy()
            alternate.paste((0,0,0,0),(0,cut,im.width,im.height))
            for a0,a1,offset in [(0,im.width//2,8),(im.width//2,im.width,-7)]:
                alternate.alpha_composite(im.crop((a0,cut,a1,im.height)),(a0+offset,cut-2))
            for facing,pic,sx in [('right',alternate,x),('left',ImageOps.mirror(alternate),im.width-1-x)]:
                key=f'tiger/{facing}/2';frames[key]=pic;anchors[key]=[sx,pic.height-1];saddles[key]=[0,y-pic.height+1]

VECTORS={'down':(0,1),'up':(0,-1),'left':(-1,0),'right':(1,0)}
EDGE={'sword':'#a4c8cd','saber':'#91adb2'}

def blade(weapon,direction,pose):
    u,v=VECTORS[direction];sign=-1 if direction=='left' else 1
    vectors={'guard':(12*sign,-14),'back':(-14*sign,-5),'high':(4*sign,-22),'point':(u*23,v*18-2),'cut':(u*20 or 20*sign,v*9-5),'low':(u*16 or 14*sign,v*10+9)}
    dx,dy=vectors[pose];n=math.hypot(dx,dy);ux,uy=dx/n,dy/n;px,py=-uy,ux
    im=Image.new('RGBA',(64,64));d=ImageDraw.Draw(im);gx=gy=32
    def p(t,s):return (round(gx+ux*t+px*s),round(gy+uy*t+py*s))
    wide=3.8 if weapon=='saber' else 2.0
    polygon=[p(3,-wide),p(n*.78,-wide),p(n+3,wide*.28),p(n*.63,wide),p(4,wide)]
    d.polygon(polygon,fill='#46616c',outline='#172531');d.line([p(5,-wide),p(n*.8,-wide),p(n+2,0)],fill=EDGE[weapon],width=2)
    d.line([p(7,0),p(n*.83,0)],fill='#e1ece2');d.line([p(-6,0),p(3,0)],fill='#332738',width=4);d.line([p(-6,0),p(2,0)],fill='#9a6744',width=2)
    d.line([p(2,-5),p(2,5)],fill='#5a352f',width=3);d.line([p(2,-4),p(2,4)],fill='#e1ac62');d.point(p(-6,0),fill='#f0c97d')
    return im,(32,32),p(n,0)


def crossbow(direction,pose):
    u,v=VECTORS[direction];px,py=-v,u
    # Vertical views show the wide limbs. On the profile they foreshorten.
    side=direction in ('left','right');spread=5 if side else 12
    im=Image.new('RGBA',(64,64));d=ImageDraw.Draw(im)
    def p(t,s):return (32+u*t+px*s,32+v*t+py*s)
    d.line([p(-9,0),p(18,0)],fill='#1d202a',width=7)
    d.line([p(-9,0),p(18,0)],fill='#775035',width=5)
    d.line([p(-8,-1),p(17,-1)],fill='#bd854f',width=2)
    d.line([p(6,-spread),p(12,-spread//2),p(12,spread//2),p(6,spread)],fill='#201e2d',width=5)
    d.line([p(6,-spread),p(12,-spread//2),p(12,spread//2),p(6,spread)],fill='#b98757',width=3)
    d.line([p(6,-spread),p(-2 if pose in ('aim','hold','reload') else 8,0),p(6,spread)],fill='#d2c4a7')
    if pose in ('aim','hold','reload'):d.line([p(-1,0),p(20,0)],fill='#b7d8d1');d.point(p(20,0),fill='#f6e5aa')
    d.line([p(15,-2),p(15,2)],fill='#e0af61');d.point(p(-8,0),fill='#e0af61')
    return im,(32,32),p(20,0)

for weapon in ('sword','saber','crossbow'):
    poses=('hold','aim','recoil','empty','reload') if weapon=='crossbow' else ('guard','back','high','point','cut','low')
    for direction in DIRECTIONS:
        for pose in poses:
            im,grip,tip=crossbow(direction,pose) if weapon=='crossbow' else blade(weapon,direction,pose)
            key=f'weapon/{weapon}/{direction}/{pose}';box=im.getbbox();frames[key]=im.crop(box)
            anchors[key]=[grip[0]-box[0],grip[1]-box[1]];weapon_points[key]=[tip[0]-grip[0],tip[1]-grip[1]]
# Horizontal bolt, with its point toward +X.
im=Image.new('RGBA',(23,7));d=ImageDraw.Draw(im);d.line((1,3,20,3),fill='#513a31',width=3);d.line((1,3,21,3),fill='#d2aa75');d.polygon([(17,1),(22,3),(17,5)],fill='#c4e0dc');d.line((2,2,7,3),fill='#a74d46',width=2);frames['bolt']=im

atlas=Image.new('RGBA',(512,512));x=y=2;row=0;packed={}
for key,im in frames.items():
    w,h=im.size
    if x+w+2>512:x=2;y+=row+2;row=0
    assert y+h<=512
    atlas.alpha_composite(im,(x,y));packed[key]={'frame':{'x':x,'y':y,'w':w,'h':h},'rotated':False,'trimmed':False}
    x+=w+2;row=max(row,h)
atlas=atlas.crop((0,0,512,y+row+1));atlas.save(OUT/'atlas.png')
(OUT/'atlas.json').write_text(json.dumps({'frames':packed,'meta':{'size':{'w':atlas.width,'h':atlas.height}}}),encoding='utf-8')
(OUT/'anchors.json').write_text(json.dumps({'origins':anchors,'saddles':saddles,'tips':weapon_points}),encoding='utf-8')
print('Combat and mount atlas:',len(packed),'frames',atlas.size)

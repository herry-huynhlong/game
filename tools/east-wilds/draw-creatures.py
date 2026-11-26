"""Original directional rigs for Dong Hoang. Coordinates are in game pixels.

Each part is drawn in a local plane and placed on a projected ground footprint.
Poses move joints and plates independently, keeping the contact point fixed.
"""
from argparse import ArgumentParser
from math import cos, hypot, pi, sin
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public/assets/east-wilds/overhaul"
OUT.mkdir(parents=True, exist_ok=True)
SIZE, ANCHOR = 112, 84
CENTER = SIZE // 2
SPECIES = ("sand-scorpion", "bone-wolf", "bone-skeleton", "bone-general",
           "sand-worm", "sand-golem", "flame-lizard", "bone-king", "wetland-toad")
INK = "#24232c"
BONE = ("#50464b", "#887572", "#b6a193", "#e2ceaa", "#f8e8c6")
BRASS = ("#453039", "#754634", "#a55f38", "#d28c49", "#f4b86b")
BASALT = ("#42383c", "#63514e", "#927267", "#c19a79", "#e2b791")
CINDER = ("#392a37", "#663241", "#99413b", "#cc6745", "#ed9256")
IRON = ("#283038", "#414653", "#61676b", "#92908a", "#bbaf94")
JADE = ("#263740", "#375861", "#427981", "#78b8b2", "#c3f0d6")
EMBER = ("#54303c", "#933b3e", "#ca6749", "#f6a65c", "#ffe2a1")
CLOTH = ("#2d2534", "#483044", "#653d50", "#925061", "#bb655f")
BACK_SHADOW = ("#282532", "#342d39", "#54474d", "#786366", "#ab9582")
stride = (0, 1, -.36, -1)


class Rig:
    def __init__(self, direction, pose, frame):
        self.image = Image.new("RGBA", (SIZE, SIZE))
        self.d = ImageDraw.Draw(self.image)
        self.shadow_image = Image.new("RGBA", (SIZE, SIZE))
        self.direction, self.pose, self.frame = direction, pose, frame
        self.side = direction in (1, 2)
        self.front = direction != 3
        self.spin = (-.16, -1.29, 1.29, pi + .13)[direction]
        self.fly = (0, 2, 4, 0)[frame] if pose == 9 else 0

    def point(self, along, cross, height=0):
        a = self.spin
        return (round(CENTER + along*sin(a) + cross*cos(a)),
                round(ANCHOR + .54*(along*cos(a)-cross*sin(a))-height-self.fly))

    def p(self, points, color, outline=None):
        self.d.polygon([(round(x), round(y)) for x, y in points], fill=color, outline=outline)

    def l(self, points, color, width=1):
        self.d.line([(round(x), round(y)) for x, y in points], fill=color, width=width)

    def local(self, center, points, color, outline=None):
        x, y = center
        self.p([(x+a, y+b) for a, b in points], color, outline)

    def trace(self, center, points, color, width=1):
        x, y = center
        self.l([(x+a, y+b) for a, b in points], color, width)

    def dot(self, p, color):
        self.d.point((round(p[0]), round(p[1])), fill=color)

    def shadow(self, width, height=10):
        d=ImageDraw.Draw(self.shadow_image)
        d.ellipse((CENTER-width//2, ANCHOR-height//2+1, CENTER+width//2, ANCHOR+height//2+1), fill=(39, 33, 49, 55))
        d.ellipse((CENTER+1-width//3, ANCHOR-2, CENTER-2+width//3, ANCHOR+3), fill=(40, 29, 37, 78))

    def mass(self, center, w, h, palette, face=1):
        """An irregular faceted section. Light falls from the upper left."""
        x, y = center
        self.local(center, [(-w,-h//4),(-w+2,-2*h//3),(-w//2,-h),(w//3,-h),
                   (w-1,-3*h//5),(w,-h//5),(w-1,h//3),(w//2,h),(-w//2,h),(-w,h//3)], palette[1], INK)
        self.local(center, [(-w+2,-h//3),(-w+4,-2*h//3),(-w//2,-h+1),(w//3,-h+1),
                   (w-2,-h//3),(w//3,0),(-w//2,h//4)], palette[2])
        self.local(center, [(-w+3,-h//3),(-w//2,-h+2),(w//4,-h+2),(w//2,-h//2),
                   (-w//2,-h//3),(-w//2,h//4)], palette[3])
        self.trace(center, [(-w//2,-h+3),(-w//5,-h+2),(w//5,-h+2)], palette[4])
        if face:
            self.trace(center, [(w//2,h//3),(w//4,h//2),(-w//4,h//2)], palette[0])

    def bone(self, a, b, width, tint=BONE):
        x,y = a
        dx,dy = b[0]-x,b[1]-y
        length = max(1,hypot(dx,dy))
        nx,ny = -dy/length,dx/length
        def at(t,w):
            return (x+dx*t+nx*w,y+dy*t+ny*w)
        w=width/2
        self.p([at(-.07,0),at(.08,w),at(.38,w*.49),at(.73,w*.55),at(.94,w),
                at(1.06,0),at(.9,-w),at(.65,-w*.53),at(.23,-w*.52),at(.03,-w)], tint[2], INK)
        self.l([at(.13,-w*.38),at(.47,-w*.24),at(.79,-w*.38)], tint[3])
        self.dot(at(.08,0),tint[4])

    def plate(self, a, b, width, palette):
        x,y=a
        dx,dy=b[0]-x,b[1]-y
        length=max(1,hypot(dx,dy))
        nx,ny=-dy/length,dx/length
        w=width/2
        def at(t,z):
            return (x+dx*t+nx*z,y+dy*t+ny*z)
        self.p([at(-.16,w*.2),at(.04,w),at(.48,w*.91),at(.79,w*.59),at(1.05,w*.23),
                at(1.12,-w*.25),at(.8,-w*.62),at(.23,-w),at(-.16,-w*.65)],palette[1],INK)
        self.p([at(-.03,w*.56),at(.2,w*.8),at(.65,w*.38),at(.86,-w*.12),at(.4,-w*.6),at(.06,-w*.68)],palette[2])
        self.l([at(.05,-w*.58),at(.32,-w*.56),at(.66,-w*.16)],palette[3],2)
        self.dot(at(.19,-w*.44),palette[4])

    def spark(self, x,y,tint):
        self.p([(x,y-4),(x+1,y-1),(x+4,y),(x+1,y+1),(x,y+4),(x-1,y+1),(x-4,y),(x-1,y-1)], tint[2])
        self.dot((x,y),tint[4])

    @property
    def gait(self):
        return stride[self.frame] if self.pose in (1,9) else 0

    @property
    def attack(self):
        return (3,10,7,1)[self.frame] if self.pose in (3,10,11) else (-2,-4,-6,-6)[self.frame] if self.pose==2 else 0


def paint_scorpion(r):
    f=r.frame
    r.shadow(61, 15)
    if r.pose==6 and f>=2:
        for i,(a,c) in enumerate([(-15,7),(-9,2),(1,-4),(6,9),(16,-9),(20,6)]):
            r.mass(r.point(a,c,1), (8,5,7,5,8,5)[i],3,BRASS)
        return
    low=(4,8,10,5)[f] if r.pose==10 else 3 if r.pose==6 else 0
    pins=(3,11,9,2)[f] if r.pose==3 else (2,5,0,0)[f] if r.pose==4 else 0
    tail_strike=(9,21,25,6)[f] if r.pose in (7,11) else 0
    for sign in (-1,1):
        for i in range(4):
            a=12-i*8
            step=4*stride[(f+2*(i%2)+2*(sign>0))%4] if r.pose in (1,9) else 0
            hip=r.point(a,sign*(9+int(i==1)*2),11-low)
            knee=r.point(a+7-i*4+step,sign*(21+i%2*2),12-low)
            ankle=r.point(a+4-i*5+step,sign*(27+i%2*3),3)
            foot=r.point(a+8-i*5+step,sign*(29+i%2*3),0)
            r.plate(hip,knee,6,BRASS)
            r.plate(knee,ankle,4,BRASS)
            r.l([ankle,foot],BRASS[2],2)
    for a,w,h in [(-21,7,5),(-17,9,7),(-11,13,8),(-4,15,8),(4,16,8),(10,14,7)]:
        p=r.point(a,0,12-low)
        r.mass(p,w if not r.side else max(6,w//2),h,BRASS)
        r.trace(p, [(-w//4,-h//2),(0,-h//2-1),(w//4,-h//2)],BRASS[4])
    head=r.point(16,0,10-low)
    r.mass(head,10 if not r.side else 8,6,BRASS)
    if r.front:
        r.trace(head,[(-5,0),(-3,0)],"#4c2930",2)
        r.trace(head,[(3,0),(5,0)],"#ffd385",2)
        r.trace(head,[(-4,3),(0,4),(4,3)],BRASS[0])
    for side in (-1,1):
        p=r.point(14,side*8,10)
        q=r.point(21+pins//2,side*(18-pins//3),10)
        wrist=r.point(27+pins,side*(18-pins//2),8+low)
        r.plate(p,q,9,BRASS);r.plate(q,wrist,7,BRASS)
        r.mass(wrist,7,6,BRASS)
        corner=2 if r.pose==3 and f in (1,2) else 6
        for k in (-1,1):
            claw=r.point(35+pins//2,side*(18-pins//2)+corner*k,8)
            tip=r.point(39+pins//4,side*(18-pins//2)+k*(corner-2),7)
            r.plate(wrist,claw,7,BRASS)
            r.plate(claw,tip,4,BRASS)
    last=r.point(-24,2,13-low)
    for i,(a,c,h) in enumerate([(-29,5,19),(-29,9,27),(-24,13,35),(-17,15,42),(-9,13,44),(0,10,40),(6,8,35)]):
        p=r.point(a+tail_strike*i/6,c+stride[f]*i/3,h-low)
        r.plate(last,p,10-i*.75,BRASS)
        last=p
    p=r.point(12+tail_strike,7+stride[f]*2,27-low)
    r.plate(last,p,5,BRASS)
    r.dot(p,"#e4cb71")


def paws(r,bony):
    f=r.frame
    for along,side in sorted([(13,-1),(-15,1),(13,1),(-15,-1)],
                             key=lambda part:r.point(part[0],part[1]*9)[1]):
        rear=along<0
        s=side*stride[(f+2*rear)%4]
        walk=s*(8 if r.pose==9 else 5) if r.pose in (1,9) else 0
        step=max(0,s)*(5 if r.pose==9 else 3) if walk else 0
        spring=r.attack if not rear else -r.attack*.36
        hip=r.point(along,side*(7 if bony else 9),19 if bony else 11)
        knee=r.point(along+(7 if rear else -3)+walk/2+spring,side*12,10 if bony else 6)
        pastern=r.point(along+walk+spring-(5 if rear else 2),side*13,3+step)
        foot=r.point(along+3+walk+spring,side*14,1+step)
        if bony:
            tint=BONE if r.point(along,side*9)[1]>=r.point(along,-side*9)[1] else BACK_SHADOW
            r.bone(hip,knee,7,tint)
            r.bone(knee,pastern,5,tint)
            r.plate(pastern,foot,5,tint)
            r.trace(foot,[(0,0),(2,1),(4,1)],tint[4])
        else:
            r.plate(hip,knee,9,CINDER);r.plate(knee,pastern,6,CINDER)
            r.plate(pastern,foot,5,CINDER)
            for k in (-2,1,4):
                r.trace(foot,[(k,-1),(k+1,1)],"#e9ba8c")


def paint_wolf(r):
    f=r.frame
    r.shadow(60, 12)
    if r.pose==6 and f>=2:
        bones_on_sand(r, False, f-2)
        return
    lower=4 if r.pose in (2,6) else -3 if r.pose==11 else 0
    last=r.point(-17,0,19-lower)
    for k in range(6):
        pt=r.point(-21-k*3,(-1)**f*k/2,20+sin(k/2)*5-lower)
        r.bone(last,pt,5-k*.48)
        last=pt
    paws(r,True)
    pelvis=r.point(-16,0,20-lower)
    r.mass(pelvis,9 if r.side else 11,7,BONE)
    r.local(pelvis,[(-5,0),(-2,-3),(3,-3),(5,0),(3,3),(-2,3)],BONE[0])
    for n in range(7):
        a=-12+n*4
        w=5+min(n,5)*1.1
        hi=23+n*.7-lower
        p=r.point(a,0,hi)
        next_p=r.point(a+4,0,hi+.7)
        for sign in (-1,1):
            q=r.point(a+1,sign*w,hi-3)
            t=r.point(a,sign*w*1.24,hi-10)
            m=r.point(a-3,sign*w*.33,hi-15)
            r.l([p,q,t,m], INK,4)
            shade=BONE[3] if sign==-1 or not r.side else BONE[2]
            r.l([p,q,t,m],shade,2)
            r.dot(q,BONE[4])
        r.bone(p,next_p,5)
        r.trace(p,[(-1,-1),(0,-3),(2,-2)],BONE[3])
    neck=r.point(14,0,28-lower)
    root=r.point(20+r.attack/2,0,34-lower)
    r.bone(neck,root,9)
    jaw=(3,5,4,2)[f] if r.pose in (2,3,7,10,11) else 1
    if r.side:
        sign=-1 if r.direction==1 else 1
        def shape(poly,color,outline=None):
            r.local(root,[(x*sign,y) for x,y in poly],color,outline)
        shape([(-12,-1),(-11,-9),(-7,-18),(-1,-12),(6,-10),(11,-3),(20,1),
              (23,6),(18,10),(9,8),(4,12),(-6,10),(-11,6)], BONE[2], INK)
        shape([(-10,-3),(-8,-12),(-4,-14),(0,-9),(7,-8),(13,0),(19,2),
              (20,5),(13,5),(7,1),(2,2),(-2,0),(-8,4)], BONE[3])
        shape([(-8,-6),(-6,-14),(-2,-8),(-3,-4)],BONE[0])
        shape([(2,-1),(7,-4),(13,0),(10,4),(5,5)],INK)
        shape([(7,0),(10,-1),(11,1),(9,3),(7,2)],JADE[4])
        shape([(10,5),(14,5),(18,6),(21,5),(19,12+jaw),(10,10+jaw),(3,8)],BONE[0],INK)
        for x,y in [(11,7),(15,7),(19,7),(18,10+jaw),(13,10+jaw)]:
            shape([(x-1,y-1),(x+1,y-1),(x,y+2)],BONE[4])
        shape([(4,10),(10,11+jaw),(18,13+jaw),(20,11+jaw),(20,14+jaw),(16,16+jaw),(7,14+jaw)],BONE[2],INK)
    else:
        wolf_mask(r,root,jaw)


def wolf_mask(r,p,jaw):
    r.local(p,[(-14,2),(-14,-13),(-10,-18),(-5,-11),(6,-11),(11,-17),(15,-13),
               (16,2),(10,10),(7,13+jaw),(-7,13+jaw),(-10,10)],BONE[2],INK)
    if not r.front:
        r.local(p,[(-12,0),(-9,-10),(9,-10),(13,0),(9,9),(-9,10)],BONE[1])
        r.trace(p,[(-5,-8),(0,-6),(3,-2),(0,5)],BONE[3],2)
        return
    r.local(p,[(-12,0),(-10,-10),(-4,-9),(2,-11),(9,-8),(12,-4),(8,3),
               (5,4),(4,10),(-6,9),(-7,3)],BONE[3])
    for s in (-1,1):
        r.local(p,[(4*s,0),(10*s,-2),(12*s,0),(8*s,4),(4*s,3)],INK)
        r.trace(p,[(6*s,1),(9*s,1)],JADE[4],2)
        r.local(p,[(9*s,7),(8*s,13),(6*s,9)],BONE[4])
    r.local(p,[(-5,6),(4,6),(6,9),(1,11),(-4,10)],INK)
    r.trace(p,[(-6,13),(0,15+jaw),(7,13)],BONE[3],2)


def bones_on_sand(r, armored, collapse=0, stone=False):
    r.shadow(49)
    if stone:
        for a,c,w,h in [(-13,6,10,7),(-4,-9,14,11),(7,4,15,10),(12,-4,9,8),(-2,13,7,4)]:
            r.mass(r.point(a,c,h//2),w,h,BASALT)
        return
    spread=collapse*3
    for a,c,x,y,w in [(-15,-7,-2,5,6),(-8,8,3,9,5),(3,-12,14,-4,5),
                      (10,8,22,13,4),(-20,8,-13,15,4)]:
        p=r.point(a,c-spread,1)
        q=r.point(x,y+spread,2)
        r.bone(p,q,w)
    r.mass(r.point(14,-4,4),8 if armored else 6,5,BONE)
    for z in (-2,2):
        r.dot((r.point(14,-4,4)[0]+z,r.point(14,-4,4)[1]),INK)
    if armored:
        r.mass(r.point(-4,-6,4),10,5,IRON)
        r.plate(r.point(-19,-14,1),r.point(14,-12,1),3,IRON)


def skull(r,p,size=1,eyes=JADE):
    def draw(points,color,outline=None):
        r.local(p,[(x*size,y*size) for x,y in points],color,outline)
    side=(-1 if r.direction==1 else 1) if r.side else 0
    draw([(-8,2),(-9,-5),(-6,-10),(-1,-12),(5,-11),(9,-7),(10,-2),
          (9+side*2,3),(5+side*3,8),(-4,8),(-5,5)],BONE[1],INK)
    draw([(-8,-4),(-5,-9),(-1,-11),(4,-10),(7,-7),(7,-4),(3,-2),
          (1,1),(-5,3),(-8,0)],BONE[3])
    draw([(-6,-7),(-3,-9),(2,-10),(3,-8),(-2,-7)],BONE[4])
    if not r.front:
        draw([(-6,2),(-3,6),(4,6),(7,2),(3,3),(-3,3)], BONE[2])
        return
    if side:
        draw([(side*-1,-3),(side*5,-5),(side*8,-2),(side*7,2),(side*3,3)],INK)
        draw([(side*4,-2),(side*7,-2),(side*6,0),(side*4,1)],eyes[4])
        draw([(side*5,3),(side*9,2),(side*10,4),(side*7,5)],BONE[3])
        draw([(side*4,5),(side*9,5),(side*7,8),(side*4,8)],INK)
    else:
        for x in (-5,4):
            draw([(x-3,-2),(x+2,-3),(x+3,0),(x+1,2),(x-2,1)],INK)
            draw([(x-1,-1),(x+1,-1),(x+1,0),(x-1,0)],eyes[4])
        draw([(-1,1),(1,2),(2,4),(-2,4)],BONE[0])
        draw([(-5,5),(5,5),(5,7),(-4,7)],INK)
    for x in (-3,0,3,6):
        if (not side and x<5) or (side and x*side>=0):
            draw([(x,5),(x+1,5),(x+1,6),(x,7)],BONE[4])


def blade(r, grip, tip, king=False):
    x,y=grip
    dx,dy=tip[0]-x,tip[1]-y
    length=max(1,hypot(dx,dy))
    px,py=-dy/length,dx/length
    def a(t,w):
        return x+t*dx+w*px,y+t*dy+w*py
    if king:
        r.plate(a(-.21,0),a(.72,0),5,IRON)
        r.p([a(.48,-4),a(.61,-9),a(.82,-12),a(1.02,-7),a(1.1,0),
             a(.95,4),a(.77,4),a(.69,8),a(.58,7)],JADE[1],INK)
        r.p([a(.64,-6),a(.85,-10),a(1.05,-2),a(.91,1),a(.77,-3),a(.72,3)],JADE[2])
        r.l([a(.61,-9),a(.82,-11),a(1.06,-5),a(1.10,0)],JADE[4],2)
        r.spark(*a(.79,-1),JADE)
    else:
        r.plate(a(-.23,0),a(.17,0),5,BRASS)
        r.p([a(.14,-3),a(.35,-5),a(.82,-6),a(1.05,-1),a(.94,3),
             a(.74,6),a(.3,5),a(.13,2)],IRON[1],INK)
        r.p([a(.18,0),a(.56,-1),a(.94,-3),a(1.03,-1),a(.74,5),a(.33,4),a(.16,2)],IRON[3])
        r.l([a(.3,4),a(.73,5),a(1,-.1)],BONE[4],2)
        r.l([a(.14,-7),a(.15,7)],BRASS[3],3)


def skeleton(r, grade):
    f=r.frame
    dressed=grade>0
    king=grade==2
    size=(1,1.15,1.35)[grade]
    awakening=r.pose==8
    dead=r.pose==6
    if (awakening and f==0) or (dead and f>=2):
        bones_on_sand(r,dressed,f-2 if dead else 0)
        return
    sign=-1 if r.direction==1 else 1
    lean=(4 if r.pose==5 else -2 if r.pose==2 else 0)*(sign if r.side else 1)
    low=(0,21,13,4)[f] if awakening else (6+f*12 if dead else 4 if r.pose==2 else -r.gait)
    offset=(0,9,5,2)[f] if awakening else 0
    x=CENTER+lean
    y=ANCHOR+low-round(30*size)+(7 if king else 0)
    shoulder=11*size
    rib_w=7*size
    if r.side:
        x+=2*sign
        shoulder*=.74
        rib_w*=.80
    r.shadow(30+grade*14,11)
    swing=3*stride[f] if r.pose in (1,9) else 0
    waist=(x-sign*2 if r.side else x,y+8)
    for j in (-1,1):
        hip=(waist[0]+j*5*size+offset*j,waist[1]-offset*.15)
        knee=(x+j*9*size+swing*j*.65+offset*j,y+18*size+(1 if j==1 else -1))
        foot=(x+j*9.5*size+swing*j+offset*j,ANCHOR+(1 if j==1 else -2)-max(0,swing*j))
        r.bone(hip,knee,6*size)
        r.bone(knee,foot,5*size)
        if dressed:r.plate((knee[0],knee[1]-4),foot,8*size,IRON)
        r.local(foot,[(-4,-2),(1,-2),(5+int(king),0),(6,3),(-5,3)],IRON[2] if dressed else BONE[2],INK)
        r.trace(foot,[(-3,0),(1,0),(4,1)],BRASS[3] if dressed else BONE[4])
    if dressed:
        flap=3*stride[f]+(7 if r.attack else 0)
        cape=[(-shoulder-1,-17),(shoulder+3,-17),(shoulder+7+flap,18),
              (shoulder+flap,23),(shoulder-4+flap,18),(5+flap,24),
              (flap,17),(-10+flap,24),(-shoulder-6+flap,20)]
        r.local((x,y),cape,CLOTH[1],INK)
        r.local((x,y),[(-shoulder-1,-15),(-shoulder+3,-15),(-12+flap,17),
                       (-10+flap,23),(-shoulder-4+flap,18)],CLOTH[3])
        r.trace((x,y),[(shoulder-3,-10),(shoulder+flap,13),(shoulder-3+flap,20)],CLOTH[2],3)
    if not dressed or r.front:
        for j in range(4):
            cy=y-12+j*4-offset*.18
            w=rib_w*(1-j*.13)
            r.l([(x-w,cy-3),(x-w+1,cy),(x-3,cy+2),(x+2,cy+2),(x+w-1,cy),(x+w,cy-3)],INK,4)
            r.l([(x-w,cy-3),(x-w+1,cy),(x-3,cy+2),(x+2,cy+2),(x+w-1,cy),(x+w,cy-3)],BONE[2],2)
            r.dot((x-w+1,cy),BONE[4])
        r.bone((x,y-16),(x,y+8),4.7)
        r.local(waist,[(-8,-2),(-8,2),(-4,5),(0,3),(4,5),(8,1),(7,-3),(3,-2),(0,0),(-3,-2)],BONE[2],INK)
    if dressed:
        center=(x,y-6)
        r.local(center,[(-shoulder,-11),(0,-13),(shoulder,-9),(shoulder-2,4),(0,10),(-shoulder+3,5)],IRON[1],INK)
        for j in range(3):
            yy=-10+j*5
            r.local(center,[(-shoulder+1,yy),(1,yy+2),(shoulder-2,yy-1),(shoulder-2,yy+2),
                            (2,yy+5),(-shoulder+2,yy+2)],IRON[3 if j==0 else 2])
            r.trace(center,[(-shoulder+2,yy),(1,yy+2),(shoulder-3,yy-1)],BRASS[3],1 if j else 2)
        r.local(center,[(-6,7),(0,6),(7,7),(5,11),(0,14),(-5,11)],BRASS[2],INK)
        r.trace(center,[(-5,8),(0,8),(5,8)],BRASS[4])
        if king:
            r.spark(x,y-9,JADE)
            r.trace(center,[(-9,-7),(-7,-5),(-6,-2)],BRASS[4],2)
            r.trace(center,[(9,-7),(7,-5),(6,-2)],BRASS[4],2)
    for j in (-1,1):
        ax=x+j*shoulder+j*offset
        sy=y-14
        push=(r.attack*1.6 if j==1 else 0) * sign
        elbow=(ax+j*(4+grade)+push*.6,sy+9+swing*j-offset*.24)
        hand=(ax+j*(4+grade)+push,sy+17+swing*j-r.attack*.8 if j==1 else sy+17+swing*j)
        r.bone((ax,sy),elbow,5*size);r.bone(elbow,hand,4*size)
        if dressed:
            r.mass((ax,sy-1),7+grade*2,5+grade,IRON)
            r.trace((ax,sy-1),[(-6,1),(0,2),(6,0)],BRASS[3],2)
            r.plate(elbow,hand,6*size,IRON)
            if j==1:
                if r.pose in (3,7,10,11):
                    end=(max(12,min(SIZE-12,hand[0]+sign*(23+grade*3))),hand[1]-(4 if f in (1,2) else 23))
                else:
                    end=(hand[0]+sign*(13 if king else 8),hand[1]-33*size)
                blade(r,hand,end,king)
        r.mass(hand,3+int(king),3,BONE,0)
    face=(x+sign*4 if r.side else x,y-(17 if dressed else 23)*size-offset*.42)
    skull(r,face,size,JADE if king or not dressed else EMBER)
    if dressed:
        a=10+grade*2
        if king:
            crown=[(-a,1),(-a-1,-20),(-a+3,-23),(-a+6,-13),(-4,-19),
                   (0,-25),(5,-18),(a-5,-13),(a-3,-23),(a+2,-20),(a,1),(a-5,-6),(-a+4,-6)]
        else:
            crown=[(-a,0),(-a-2,-12),(-7,-15),(-2,-14),(0,-18),(6,-14),(a+1,-12),(a,0),(a-4,-4),(-a+4,-4)]
        r.local(face,crown,IRON[1],INK)
        r.trace(face,crown[:len(crown)-3],BRASS[3],2)
        r.trace(face,[(-a+4,-8),(0,-11),(a-5,-8)],BRASS[4],2)
        r.spark(face[0],face[1]-13,JADE if king else EMBER)
    if king or awakening:
        for i,(dx,dy) in enumerate([(-22,4),(23,-8),(-14,-14),(9,12)]):
            if not king and i>f:break
            xx=x+dx;yy=y+dy-(f+i*2)%5
            r.trace((xx,yy),[(-2,2),(0,1),(1,-2),(0,-4)],JADE[2])
            r.dot((xx,yy),JADE[4])


def paint_worm(r):
    f=r.frame
    r.shadow(69,14)
    hidden=r.pose==8
    height=(0,5,17,35)[f] if hidden else 25 + (10 if r.pose in (2,3,7) else 0)
    if r.pose==6:height=max(2,31-f*12)
    if r.pose in (10,11):height=(8,4,15,31)[f]
    for i,(a,c) in enumerate([(-24,3),(-16,-8),(-8,11),(9,-11),(19,8),(26,5)]):
        p=r.point(a,c)
        r.trace(p,[(-7,1),(-2,-2),(3,-2),(7,0)],BRASS[0 if i%2 else 2])
        r.dot((p[0]+f%3-1,p[1]-5),BRASS[4])
    if height<=0:return
    last=None
    for i in range(9):
        a=-35+i*(5.9+r.attack*.13)
        level=max(0,height*(i/8)**2)
        if hidden and level<3:continue
        c=sin(i*.72-f*pi*.49)*(4.5 if r.pose in (1,9,10) else 2.5)
        p=r.point(a,c,level)
        if last:r.plate(last,p,8+i,CINDER)
        r.mass(p,5+i//2 if r.side else 6+i,5+i//2,CINDER)
        r.trace(p,[(-4,-3),(-1,-5),(3,-5),(5,-3)],BRASS[3],2)
        if i%2 and i>1:
            r.local(p,[(4,-2),(8,-5),(8,1),(5,2)],BRASS[2],INK)
        last=p
    p=r.point(18+r.attack, sin(f*pi/2)*2, height)
    w=13+int(r.pose in (3,7)*2)
    r.mass(p,w,11,CINDER,0)
    s=-1 if r.direction==1 else 1
    face=(p[0]+(5*s if r.side else 0),p[1]+(1 if r.front else -3))
    if r.front:
        r.local(face,[(-9,0),(-5,-6),(4,-7),(10,-3),(11,3),(5,8),(-4,8),(-9,5)],"#3d2534",INK)
        r.local(face,[(-6,1),(-3,-3),(3,-4),(7,-1),(7,4),(4,6),(-4,6)],"#873e44")
        r.local(face,[(-3,1),(0,-2),(4,0),(4,4),(-1,5)],"#2e202e")
        for x,y,tip in [(-5,-3,3),(0,-5,3),(5,-4,3),(-7,3,-2),(-2,6,-3),(4,6,-3),(8,3,-2)]:
            r.local(face,[(x-2,y),(x+1,y),(x,y+tip)],BONE[4])
    else:r.trace(face,[(-9,3),(-4,-4),(4,-4),(10,2)],CINDER[3],3)


def paint_golem(r):
    f=r.frame
    if (r.pose==8 and f==0) or (r.pose==6 and f>=2):
        bones_on_sand(r,False,0,True)
        return
    rise=(0,.36,.69,.92)[f] if r.pose==8 else 1-.2*f if r.pose==6 else 1
    wide=.86 if r.side else 1
    body_h=38*rise + (r.gait*1.4 if r.pose in (1,9) else -3 if r.pose==2 else 0)
    r.shadow(61,15)
    for j in (-1,1):
        swing=j*r.gait*4
        hip=r.point(-3,j*6,body_h*.51)
        ankle=r.point(swing,j*10+2*j,6)
        foot=r.point(swing+4,j*13,4)
        r.plate(hip,ankle,16,BASALT);r.mass(foot,11,6,BASALT)
        r.trace(foot,[(-6,0),(-4,3),(3,3)],BASALT[2],2)
    belly=r.point(-4,0,body_h*.65)
    r.mass(belly,round(16*wide),10,BASALT)
    chest=r.point(1,0,body_h)
    r.mass(chest,round(22*wide),12,BASALT)
    r.trace(chest,[(-13,-6),(-5,-1),(-2,-5),(5,1),(8,0),(9,7)],BASALT[0],3)
    r.trace(chest,[(-11,-6),(-5,-1),(-2,-5),(4,1),(7,0),(9,5)],EMBER[3] if r.front else BASALT[2])
    for j in (-1,1):
        aim=r.attack*1.24 if j==1 else r.attack*.2
        upper=r.point(2+j*1.5,j*18,body_h+1)
        elbow=r.point(4+aim,j*22,body_h*.59)
        fist=r.point(5+aim*1.8,j*23,body_h*.36+j*r.gait*3)
        r.mass(upper,13,10,BASALT)
        r.plate(upper,elbow,15,BASALT)
        r.mass(fist,10,9,BASALT)
        r.trace(fist,[(-6,0),(-4,3),(0,1),(5,5)],BASALT[0],2)
    p=r.point(7,0,body_h+13*rise)
    r.mass(p,10,10,BASALT)
    if r.front:
        r.local(p,[(-7,-1),(-3,-3),(6,-3),(8,0),(5,3),(-5,3)],BASALT[0],INK)
        for j in (-1,1):r.trace(p,[(j*3,0),(j*5,0)],EMBER[4],2)
    if r.pose in (7,11):r.spark(chest[0],chest[1],EMBER)


def paint_lizard(r):
    f=r.frame
    r.shadow(64,12)
    low=7 if r.pose==6 else 0
    if r.pose==6 and f>=2:low=9
    if r.pose!=6 or f<2:paws(r,False)
    last=r.point(-17,0,14-low)
    whipping=(0,10,16,4)[f] if r.pose in (10,11) else 2*stride[f]
    for k in range(8):
        p=r.point(-20-k*2.6+(1.5*k if abs(whipping)>8 else 0),
                  sin(k*.5)*whipping,14-k*.85-low*.5)
        r.plate(last,p,12-k*1.38,CINDER)
        if k in (1,3,5):r.dot((p[0],p[1]-2),EMBER[4])
        last=p
    for k in range(6):
        a=-15+k*5
        p=r.point(a,0,14+k*.7-low)
        w=int((12+k//2)*(.64 if r.side else 1))
        r.mass(p,w,8,CINDER)
        if k%2==0 or not r.side:
            r.local(p,[(-5,-6),(-3,-13),(0,-15),(5,-7),(4,-5)],CINDER[4],INK)
            r.trace(p,[(-3,-11),(-1,-13),(3,-7)],EMBER[3],2)
        for i,(x,y) in enumerate([(-w//2,0),(0,3),(w//2,-1),(-2,-3)]):
            r.trace(p,[(x-2,y),(x,y-1),(x+2,y)],CINDER[(i+k)%2+2])
    h=21-low+(6 if r.pose in (7,11) else 0)
    p=r.point(16+r.attack*.6,0,h)
    sign=-1 if r.direction==1 else 1
    shift=(4 if r.pose in (3,7,11) and f in (1,2) else 1)
    if r.side:
        def shape(points,color,outline=None):r.local(p,[(x*sign,y) for x,y in points],color,outline)
        shape([(-11,2),(-8,-9),(-4,-13),(0,-12),(7,-7),(11,-3),(20,0),(24,4),
               (21,7),(9,8),(2,12),(-7,9)],CINDER[2],INK)
        shape([(-9,1),(-6,-8),(-1,-10),(7,-7),(12,-1),(22,3),(19,5),(8,2),(2,4),(-4,6)],CINDER[3])
        shape([(5,0),(13,-1),(13,1),(9,3),(5,2)],INK)
        shape([(8,0),(10,0),(11,1),(8,2)],EMBER[4])
        shape([(8,5),(16,6),(22,5),(21,8+shift),(12,10+shift),(5,9)],CINDER[0],INK)
        for x in (12,16,20):shape([(x,7),(x+2,6),(x+1,9)],BONE[3])
        shape([(4,9),(12,9+shift),(21,7+shift),(18,12+shift),(10,12+shift),(4,11)],CINDER[3],INK)
    else:
        r.mass(p,15,12,CINDER)
        if r.front:
            for j in (-1,1):
                r.local(p,[(j*4,-2),(j*10,-5),(j*13,-2),(j*8,1)],INK)
                r.trace(p,[(j*7,-1),(j*10,-2)],EMBER[4],2)
            r.local(p,[(-10,4),(-5,3),(5,3),(10,5),(7,9+shift),(-7,9+shift)],CINDER[0],INK)
            r.trace(p,[(-7,8+shift),(0,10+shift),(7,8+shift)],CINDER[4],2)
    if r.pose in (7,11) and f in (1,2):
        p=r.point(33+r.attack,0,h-3)
        r.local(p,[(-4,-3),(1,-3),(7,-6),(5,-1),(9,1),(5,5),(0,4),(-5,3)],EMBER[3])
        r.dot((p[0]+3,p[1]),EMBER[4])


REED=("#36433e","#53664b","#768058","#93a573","#bcc293")

def wetland_toad(r):
    f=r.frame
    bloat=(2,5,7,1)[f] if r.pose in (2,3,7,10,11) else 0
    lift=(0,4,8,2)[f] if r.pose in (1,9) else 0
    r.shadow(53,13)
    body=r.point(-5,0,13+bloat+lift)
    if r.pose==6:
        body=r.point(-5,0,max(4,11-f*4))
    for j in (-1,1):
        heel=r.point(-15,j*14,3+lift)
        thigh=r.point(-7,j*13,7+lift)
        sole=r.point(-5+j*r.gait*5,j*17,1+lift)
        r.mass(thigh,9,7,REED)
        r.plate(thigh,heel,8,REED);r.plate(heel,sole,5,REED)
        for n in (-2,0,3):
            r.trace(sole,[(n,-1),(n+1,2)],REED[3])
    r.mass(body,21 if not r.side else 17,13+bloat//2,REED)
    for i,(dx,dy) in enumerate([(-12,-2),(-4,-5),(5,-7),(12,-5),(8,1),(-8,3)]):
        if r.side and abs(dx)>10:continue
        r.local(body,[(dx-3,dy),(dx,dy-2),(dx+3,dy),(dx+2,dy+2),(dx-2,dy+2)],REED[1])
        r.dot((body[0]+dx-1,body[1]+dy-1),REED[3])
    head=r.point(12+r.attack,0,11+lift+bloat)
    sign=-1 if r.direction==1 else 1
    r.mass(head,15 if not r.side else 12,10,REED)
    if not r.front:return
    for j in ((-1,1) if not r.side else (sign,)):
        eye=(head[0]+j*9,head[1]-8)
        r.mass(eye,5,5,REED)
        r.trace(eye,[(-2,-1),(2,-1)],"#e9bd73",2)
        r.dot((eye[0]+j,eye[1]),INK)
    r.trace(head,[(-11,3),(-4,5),(6,5),(12,3)],INK,2)
    if bloat:r.trace(head,[(-6,7),(3,8),(10,6)],REED[4],2)
    if r.pose in (3,10) and f in (1,2):
        tip=r.point(28+f*4,0,8+lift)
        r.l([head,(tip[0],tip[1]+2),tip],"#b67e73",3)


def paint(name,direction,pose,frame):
    r=Rig(direction,pose,frame)
    if name=="sand-scorpion":paint_scorpion(r)
    elif name=="bone-wolf":paint_wolf(r)
    elif name=="bone-skeleton":skeleton(r,0)
    elif name=="bone-general":skeleton(r,1)
    elif name=="bone-king":skeleton(r,2)
    elif name=="sand-golem":paint_golem(r)
    elif name=="sand-worm":paint_worm(r)
    elif name=="flame-lizard":paint_lizard(r)
    else:wetland_toad(r)
    return r


if __name__=="__main__":
    args=ArgumentParser()
    args.add_argument("--layer-dir",type=Path)
    layers=args.parse_args().layer_dir
    if layers:layers.mkdir(parents=True,exist_ok=True)
    for name in SPECIES:
        atlas=Image.new("RGBA",(SIZE*16,SIZE*12))
        if layers:
            shadow=Image.new("RGBA",atlas.size)
            body=Image.new("RGBA",atlas.size)
        for pose in range(12):
            for direction in range(4):
                for frame in range(4):
                    rig=paint(name,direction,pose,frame)
                    at=((direction*4+frame)*SIZE,pose*SIZE)
                    atlas.paste(Image.alpha_composite(rig.shadow_image,rig.image),at)
                    if layers:
                        shadow.paste(rig.shadow_image,at)
                        body.paste(rig.image,at)
        atlas.save(OUT/(name+".png"))
        if layers:
            shadow.save(layers/(name+"-shadow.png"))
            body.save(layers/(name+"-body.png"))

"""Original integer-pixel storm atlases and synthesized, mono sound cues."""
from array import array
from math import atan2, cos, exp, hypot, pi, sin, sqrt
from pathlib import Path
from random import Random
import wave

from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parents[2] / "public/assets/tribulation"
OUT.mkdir(parents=True, exist_ok=True)

# Asymmetric masses, each with a different front, tail and crest.
BODIES = [
    [(8,48),(21,36),(19,27),(31,19),(45,22),(48,11),(67,6),(83,14),(88,23),(104,19),(121,27),(124,38),(137,41),(140,56),(128,65),(107,65),(95,71),(78,68),(59,73),(40,67),(21,67),(10,60)],
    [(5,52),(17,42),(22,30),(38,28),(42,13),(55,9),(69,13),(85,8),(101,14),(103,27),(121,25),(131,34),(128,43),(142,48),(141,57),(130,62),(113,64),(97,72),(74,70),(58,65),(43,72),(24,66),(12,64)],
    [(12,46),(26,41),(29,22),(43,14),(56,17),(65,11),(79,4),(94,7),(110,18),(110,27),(130,32),(138,45),(135,55),(120,62),(101,68),(89,64),(70,72),(57,69),(41,70),(27,64),(12,63)],
    [(5,54),(15,40),(30,39),(36,26),(50,20),(60,24),(67,13),(82,9),(99,15),(108,29),(119,27),(132,35),(136,43),(142,52),(129,65),(114,66),(101,74),(83,70),(70,75),(51,69),(39,72),(23,65)],
    [(7,54),(23,44),(22,29),(34,21),(51,22),(57,9),(73,6),(90,11),(100,20),(114,21),(128,31),(125,41),(140,48),(137,59),(122,63),(108,64),(90,73),(76,71),(63,75),(45,66),(29,68),(13,61)],
    [(6,51),(22,40),(29,43),(38,26),(36,21),(55,12),(67,16),(74,7),(87,7),(101,18),(101,26),(121,27),(132,37),(129,45),(140,52),(135,63),(120,69),(105,65),(93,72),(75,69),(60,74),(41,68),(29,69),(15,62)],
]
PALETTE = [
    (17,19,37), (24,26,50), (31,32,61), (40,41,76), (49,49,91),
    (61,59,107), (73,72,126), (92,91,148), (113,112,171),
]


def storm():
    size = (144, 80)
    atlas = Image.new("RGBA", (size[0]*6, size[1]*2))
    for frame, anchors in enumerate(BODIES):
        # Edge stepping is fixed to texels, with small lobes etched into the ridge.
        rng = Random(105+frame)
        outline = []
        for a, b in zip(anchors, anchors[1:]+anchors[:1]):
            dx,dy = b[0]-a[0],b[1]-a[1]
            length = hypot(dx,dy)
            for k in range(max(1,round(length/4))):
                t = k/max(1,round(length/4))
                r = sin(pi*t)*rng.uniform(-2,3)
                outline.append((round(a[0]+dx*t-dy/max(1,length)*r),round(a[1]+dy*t+dx/max(1,length)*r)))
        mask = Image.new("L",size)
        ImageDraw.Draw(mask).polygon(outline,fill=255)
        inner = mask.filter(ImageFilter.MinFilter(5))
        highlight = Image.new("RGBA",size)
        art = Image.new("RGBA",size)
        bands = [(24,40,18),(43,27,17),(63,29,20),(81,20,22),(106,33,22),(126,47,18),
                 (35,53,21),(59,47,22),(83,51,22),(109,54,19)]
        bands = [(x+rng.randint(-4,4),y+rng.randint(-4,4),r) for x,y,r in bands]
        for y in range(size[1]):
            for x in range(size[0]):
                if not mask.getpixel((x,y)):
                    continue
                if not inner.getpixel((x,y)):
                    art.putpixel((x,y),(*PALETTE[0],255))
                    continue
                rise = 0
                strata = sin(x*.19+y*.21)*1.7+sin(x*.31-y*.29)*.7
                for px,py,r in bands:
                    dx,dy=(x-px)*.8,(y-py)*1.15
                    wrinkle=sin(atan2(dy,dx)*5+px)*1.25
                    rim=1-abs(hypot(dx,dy)+wrinkle-r*.72)/5
                    rise=max(rise,max(0,rim)*max(0,min(1,(py+9-y)/13)))
                luminosity=5.35-y*.061+rise*2.25+strata*.42
                if (x+y)%2==0 and 0.18 < luminosity%1 < .42:
                    luminosity+=.4
                art.putpixel((x,y),(*PALETTE[max(1,min(8,int(luminosity)))],255))
                well=max(0,1-hypot((x-72)*.72,(y-48)*1.37)/60)
                level=int(well*(2.7+rise+strata*.15))
                if level>0:
                    highlight.putpixel((x,y),(100+level*21,104+level*22,179+level*16,30+level*33))
        atlas.paste(art,(frame*size[0],0))
        atlas.paste(highlight,(frame*size[0],size[1]))
    atlas.save(OUT/"storm-atlas.png")


def impacts():
    w,h=128,80
    atlas=Image.new("RGBA",(w*8,h))
    for i in range(8):
        fx=Image.new("RGBA",(w,h))
        d=ImageDraw.Draw(fx)
        x,y=64,51
        radius=6+i*7
        salt=Random(20)
        points=[]
        for k in range(32):
            a=2*pi*k/32
            r=radius+(k%3-1)*2
            points.append((round(x+cos(a)*r),round(y+sin(a)*r*.39)))
        for k,point in enumerate(points):
            if (k+i*3)%7<5:
                d.line([point,points[(k+1)%32]],fill=(118,143,251,225-i*21),width=3 if i<3 else 2)
                if i<4:
                    d.point(point,fill=(231,244,255,248))
        for ray in range(14):
            angle=salt.uniform(-pi,pi)
            r=radius*salt.uniform(.28,.86)
            tx,ty=round(x+cos(angle)*r),round(y+sin(angle)*r*.42)
            height=salt.randint(4,24)*(1-abs(i-2)/9)
            top=round(ty-height)
            color=(75,69,121,239-i*23) if ray%3==0 else (142,125,192,245-i*22)
            if i<6:
                d.polygon([(tx-4,ty),(tx-6,ty-4),(tx-2,top+3),(tx+1,top),(tx+5,top+5),(tx+3,ty)],
                          fill=color)
            if i<5:
                d.line([(x,y),(int((tx+x)/2),ty-4),(tx,ty)],fill=(141,185,255,218-i*39),width=2)
                d.point((tx,top),fill=(224,240,255,240))
        if i<3:
            d.polygon([(x-22+i*6,y),(x-7,y-4),(x-4,y-15+i*4),(x+1,y-8),
                       (x+7,y-23+i*5),(x+8,y-5),(x+27-i*4,y-2),(x+9,y+5),(x-6,y+6)],
                      fill=(228,245,255,244-i*54))
        atlas.paste(fx,(i*w,0))
    atlas.save(OUT/"impact-atlas.png")


def sound(name, duration, seed):
    rate = 22050
    rng = Random(seed)
    samples = array("h")
    low = hiss = 0
    for i in range(int(rate*duration)):
        t=i/rate
        noise=rng.uniform(-1,1)
        low=.98*low+.02*noise
        hiss=.66*hiss+.34*noise
        envelope=min(1,t/.055)*min(1,(duration-t)/.17)
        if name=="wind":
            rumble=sin(2*pi*(44*t-3.2*t*t))*.17*exp(-((t-.91)/.42)**2)
            value=((low*2.6+hiss*.21)*(.47+.38*sin(t*8)**2)+rumble)*envelope
        elif name=="charge":
            value=(sin(2*pi*(96*t+125*t*t))*.22+hiss*.36+noise*.075)*envelope*(t/duration)**1.3
        elif name=="impact":
            value=(noise*.36*exp(-t*48)+low*2.05*exp(-t*3.2)+sin(2*pi*(56*t-9*t*t))*.27*exp(-t*7)) * min(1,(duration-t)/.16)
        else:
            value=(noise*.25+sin(2*pi*125*t)*.066)*exp(-t*11)*(1 if rng.random()<.25 else .18)
        samples.append(round(max(-1,min(1,value))*.72*32767))
    with wave.open(str(OUT/(name+".wav")),"wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(rate)
        f.writeframes(samples.tobytes())


if __name__=="__main__":
    storm()
    impacts()
    for cue, duration, seed in [("wind",2.15,61),("charge",.92,62),("impact",1.22,63),("residue",.55,64)]:
        sound(cue,duration,seed)

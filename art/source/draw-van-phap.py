"""Original layered pixel motifs and short procedural sound recordings."""
from pathlib import Path
import json
import math as m
import random
import struct
import wave
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[2] / "public/assets/van-phap"
OUT.mkdir(parents=True, exist_ok=True)
ATLAS = Image.new("RGBA", (1024, 2048))
FRAMES = {}
X = Y = ROW = 0
PALETTES = {
    "chaos": ("#221941", "#53499a", "#927dff", "#c7eaff", "#fff0a6"),
    "storm": ("#18294c", "#365891", "#69a9db", "#b9f5ff", "#fcfff1"),
    "sun": ("#702638", "#bd5333", "#ffc15a", "#ffe497", "#fff7ce"),
    "dragon": ("#492134", "#99382f", "#dc6444", "#ffa453", "#fff2a3"),
    "myriad": ("#383343", "#89684b", "#dca560", "#f3daa1", "#fffadd"),
    "void": ("#282d4e", "#555e94", "#8caacc", "#c6e5eb", "#fff1b5"),
    "violet": ("#342345", "#655188", "#ad7bcd", "#e1b5fb", "#f7efff"),
    "ice": ("#213e57", "#447b9d", "#78cadf", "#c2eff2", "#f4ffff"),
    "ghost": ("#232136", "#444366", "#7f75a3", "#a6b7bd", "#d3fae9"),
    "jade": ("#214945", "#3d816e", "#62b59a", "#b5e6c6", "#effbe0"),
    "ember": ("#572c36", "#ab4636", "#e87245", "#ffc571", "#fff0a0"),
    "wood": ("#294339", "#577242", "#84a25f", "#bad183", "#f5e3a1"),
    "steel": ("#303b49", "#5c7080", "#a0afad", "#c2ded8", "#f6f9e6"),
    "earth": ("#423343", "#78624e", "#a98a65", "#cdbc91", "#f2deaa"),
    "spear": ("#412e40", "#a05a52", "#a8a9a4", "#d6cfaf", "#fff5d9"),
}


def put(name, size, paint):
    global X, Y, ROW
    w, h = size
    if X + w + 2 > ATLAS.width:
        X, Y, ROW = 0, Y + ROW + 2, 0
    assert Y + h <= ATLAS.height, name
    image = Image.new("RGBA", size)
    paint(ImageDraw.Draw(image))
    ATLAS.paste(image, (X, Y))
    FRAMES[name] = {"frame": dict(x=X, y=Y, w=w, h=h)}
    X += w + 2
    ROW = max(ROW, h)


def stroke(d, points, palette, width=5):
    for i, offset in enumerate((0, -2, -4)):
        d.line(points, fill=palette[1 + i], width=max(1, width + offset), joint="curve")


def sigil(d, p, frame):
    for ring, (rx, ry) in enumerate(((57, 24), (49, 20), (35, 14))):
        for j in range(12):
            angle = (j + frame * (.12 if ring % 2 else -.09)) * m.tau / 12
            pts = [(64 + round(rx * m.cos(angle + u * .047)),
                    30 + round(ry * m.sin(angle + u * .047))) for u in range(8)]
            d.line(pts, fill=p[ring + 1], width=2 if ring != 1 else 1)
            x, y = pts[0]
            if j % 2 == ring % 2:
                d.polygon([(x-3,y),(x,y-4),(x+4,y),(x,y+3)], fill=p[0], outline=p[3])
    for j in range(6):
        x = 48 + j * 6
        d.line([(x,27+j%2*2),(x+3,31),(x+1,34),(x-1,31)], fill=p[2])


def fragment(d, p, frame, shape):
    if shape == "crest":
        d.polygon([(15,1),(21,8),(24,8),(22,14),(29,21),(21,22),(18,29),(13,25),
                   (7,30),(8,22),(1,19),(8,15),(6,9),(11,10)], fill=p[1], outline=p[0])
        d.polygon([(15,4),(17,14),(24,19),(16,23),(13,19),(8,19),(13,13)], fill=p[2])
        d.line([(15,5),(14,14),(18,18),(15,23)], fill=p[4], width=2)
    elif shape == "wake":
        pts = [(3,29),(10,27),(21,24),(33,20),(43,13),(49,5),
               (47,14),(39,22),(25,29),(16,30)]
        d.polygon(pts, fill=p[1])
        d.line(pts[1:7], fill=p[2], width=2)
        d.line([(23,25),(34,20),(43,13),(48,7)], fill=p[4])
        d.line([(9,32-frame),(23,30-frame),(32,27-frame)], fill=p[3])
    else:
        for i in range(9):
            a = i * m.tau / 9 + frame*.1
            length=8+frame*2+(i*7)%14
            ux,uy=m.cos(a),m.sin(a)
            pt=lambda v,o:(32+round(ux*v-uy*o),32+round(uy*v+ux*o))
            d.polygon([pt(3,-1),pt(length*.64,-2),pt(length,0),pt(length*.6,2)],fill=p[2+i%2])
            d.point(pt(length+3,1),fill=p[4])
        d.polygon([(32,23),(35,29),(41,32),(35,35),(32,40),(29,34),(24,32),(30,29)],fill=p[4])


def bolt(d, p, frame):
    rng=random.Random(452+frame)
    points=[(31,0)]+[(31+rng.randrange(-13,14), y) for y in range(8,100,9)]+[(32,106)]
    for i,(x,y) in enumerate(points[1:-1],1):
        sign=(-1)**i
        branch=[(x,y),(x+sign*9,y+2),(x+sign*14,y+12),(x+sign*20,y+15)]
        stroke(d,branch,p,3)
        d.line([branch[1],(x+sign*16,y-1),(x+sign*21,y+2)],fill=p[2])
    stroke(d,points,p,7)
    d.line(points,fill=p[4])


def dragon(d, p, part, frame):
    if part == "head":
        d.polygon([(4,27),(6,21),(14,16),(18,10),(24,12),(32,8),(39,14),(45,12),
                   (42,25),(51,29),(46,36),(34,36),(31,43),(23,40),(18,35),
                   (9,35),(4,31)],fill=p[1],outline=p[0])
        for side in (0,11):
            d.polygon([(21+side,16),(18+side,5),(24+side,8),(26+side,1),
                       (30+side,4),(27+side,17)],fill=p[3],outline=p[0])
        d.polygon([(7,24),(18,21),(23,15),(32,15),(35,20),(30,27),(19,28),
                   (12,30),(6,29)],fill=p[2])
        d.line([(22,22),(27,19),(32,21)],fill=p[4],width=2)
        d.point((27,21),fill=p[0])
        d.polygon([(6,29),(18,30),(22,27),(19,34+frame%2*2),(10,34)],
                  fill=p[0])
        for x in (10,15,19):
            d.line([(x,30),(x,32)],fill=p[4])
        for i in (0,1):
            d.line([(15,28),(8,33-i*12),(4,39-i*22),(0,38-i*19+frame%3)],fill=p[3])
        for j in range(6):
            d.line([(34+j%2*5,18+j*3),(38+j%2*5,20+j*3)],fill=p[2])
    elif part == "leg":
        d.polygon([(7,5),(14,3),(19,8),(16,13),(18,19),(21,21),
                   (18,23),(14,21),(12,24),(10,21),(6,22),(8,18),(7,13)],
                  fill=p[1],outline=p[0])
        d.line([(9,6),(13,9),(12,15),(15,19)],fill=p[3],width=2)
        for x in (7,12,19):
            d.point((x,22),fill=p[4])
    else:
        d.polygon([(1,12),(7,7),(11,8),(15,3),(18,7),(23,4),(25,8),(29,9),
                   (31,13),(27,20),(21,22),(15,24),(10,22),(4,23)],
                  fill=p[1],outline=p[0])
        d.line([(4,12),(11,9),(16,10),(22,8),(28,11)],fill=p[3],width=2)
        for i in range(3):
            for j in range(5):
                x,y=5+j*5+i%2*2,13+i*3
                d.line([(x,y),(x+2,y+1),(x+3,y-1)],fill=p[(j+i)%2+1])


def crow(d,p,frame):
    wing=[(65,46),(53,31),(37,24),(27,12),(15,10),(6,3),(5,12),(10,21),
          (3,19),(7,28),(16,35),(9,34),(13,42),(30,51),(36,59),(57,61)]
    lift=round(14*m.cos(frame*m.tau/8))
    wing=[(x,y+round(lift*(65-x)/65)) for x,y in wing]
    for side in (0,1):
        position=lambda x,y: (x,y+18) if not side else (130-x,y+18-(65-x)//12)
        d.polygon([position(x,y) for x,y in wing],fill=p[1],outline=p[0])
        for j in range(9):
            x,y=wing[4+j%8]
            a,b=position(x,y);u,v=position(53+(j%3)*3,54-j%4*3)
            d.polygon([(u,v),(a+2,b+2),(a+5,b+7),(u-1,v+3)],fill=p[2 if j%2 else 3])
            d.line([(u,v),(a+2,b+2)],fill=p[3 if j%2 else 4])
        for j in range(5):
            x,y=wing[5+j]
            trim=[position(x+2,y+6),position(x+8,y+11),position(44+j*2,51+j%2*4)]
            d.line(trim,fill=p[1],width=2)
            d.line([position(40+j*3,45+j%2*4),position(47+j*2,48+j%2*4)],fill=p[3])
    for j in range(5):
        x=49+j*8
        y=127-j%2*6+lift//3
        d.polygon([(57+j*3,77),(x+8,101),(x,y),(x-5,y-17),
                   (56+j*3,80)], fill=p[2 if j%2 else 1],outline=p[0])
        d.line([(57+j*3,79),(x+2,y-8)],fill=p[3])
    for x,y in [(58,94),(66,99),(73,93)]:
        d.line([(x,78),(x-3,y-4),(x+3,y),(x+8,y-3)],fill=p[3],width=2)
        d.line([(x+3,y),(x+3,y+3)],fill=p[4])
    d.polygon([(55,51),(61,46),(72,45),(78,53),(77,64),(84,73),
               (75,85),(63,89),(54,82),(47,73),(51,64)],fill=p[2],outline=p[0])
    d.polygon([(57,71),(64,67),(74,71),(70,83),(65,86),(59,80)],fill=p[3])
    d.polygon([(55,58),(62,54),(68,56),(71,64),(64,69),(58,66)],fill=p[1])
    for i in range(3):
        x,y=59+i*4,59+i%2*2
        d.line([(x-2,y-1),(x,y+2),(x+2,y+1)],fill=p[2])
    d.line([(59,74),(63,76),(66,73),(69,76),(73,73)],fill=p[1],width=2)
    d.line([(61,80),(65,83),(69,80)],fill=p[4])
    d.polygon([(69,44),(73,36),(82,33),(90,37),(94,43),(102,45),(97,51),
               (86,48),(78,55),(71,53)],fill=p[3],outline=p[0])
    d.polygon([(80,35),(77,29),(83,30),(87,24),(89,35)],fill=p[2],outline=p[0])
    d.line([(85,41),(89,40),(92,42)],fill=p[0],width=2)
    d.point((89,41),fill=p[4])
    d.line([(84,47),(89,46),(96,47)],fill=p[1])
    d.point((96,44),fill=p[4])


def sun(d,p,frame):
    for j in range(24):
        a=j*m.tau/24+frame*.035
        pts=[(32+round(m.cos(a+t)*r),32+round(m.sin(a+t)*r))
             for t,r in [(-.08,20),(-.03,26),(.045,31-j%3*2),(.065,24),(.09,20)]]
        d.polygon(pts,fill=p[2+j%2])
    d.ellipse((10,10,54,54),fill=p[1],outline=p[3],width=2)
    d.ellipse((15,15,49,49),fill=p[2],outline=p[3],width=2)
    for row in range(6):
        y=21+row*4
        d.line([(18+abs(row-3)*3,y),(28+frame%3,y-2),(41-abs(row-3)*2,y)],fill=p[3])
    d.ellipse((22,21,37,34),fill=p[4])


def cloud(d,p,frame):
    layers=[
        [(2,38),(9,29),(21,28),(30,20),(39,23),(47,10),(59,5),(71,9),(79,4),
         (94,10),(107,17),(115,28),(127,30),(139,37),(148,41),(140,48),
         (123,50),(111,46),(97,51),(82,48),(68,55),(52,49),(34,53),(19,46)],
        [(8,39),(28,33),(42,37),(55,26),(68,24),(76,29),(89,19),(104,22),
         (108,30),(124,32),(140,40),(125,44),(109,40),(88,44),(69,39),(49,46),(27,43)],
        [(19,40),(39,39),(50,41),(63,35),(75,36),(89,32),(109,35),(126,40),
         (111,41),(94,38),(75,42),(60,39),(48,44),(28,43)],
    ]
    for layer,pts in enumerate(layers):
        d.polygon([(x,y+(round(2*m.sin(x*.13+frame*.6)) if layer else 0))
                   for x,y in pts],fill=p[layer])
    d.line([(38,34),(53,29),(62,32),(70,28),(82,29),(91,25)],fill=p[3])


def motifs(d,p,name,phase):
    if name in ("lotus","flower"):
        spread=2+phase*2
        base=(36,46)
        for i in (0,4,1,3,2):
            offset=i-2
            x=36+offset*(5+spread)
            y=22+abs(offset)*(8-phase)
            pts=[base,(x+offset*4-5,y+14),(x-4,y+5),(x,y),(x+6,y+6),
                 (x+6,y+12),(36+offset*5,48)]
            d.polygon(pts,fill=p[1+i%2],outline=p[0])
            d.line([(x,y+2),(x+2,y+10),base],fill=p[3+i%2])
            d.line([(x-2,y+7),(x,y+11),(35+offset*5,42)],fill=p[2])
        for i in range(4):
            x=25+i*7
            d.polygon([(x,49),(x-9,44-i%2*6),(x-6,42-i%2*6),(36,46),(x+5,52)],
                      fill=p[2],outline=p[1])
        d.line([(29,43),(35,40),(42,42)],fill=p[4],width=2)
        return
    if name=="hand":
        d.polygon([(15,45),(20,31),(28,28),(43,30),(52,45),(43,57),(29,60),(20,54)],
                  fill=p[1],outline=p[0])
        d.polygon([(21,45),(29,33),(41,32),(48,43),(42,51),(28,55)],fill=p[2])
        d.line([(23,48),(31,41),(39,44),(46,39)],fill=p[3],width=2)
    if name in ("vine","lotus","claw","hand","rubble","soul","crystal","banner","rift"):
        centers=[(34,42),(25,26),(42,26),(17,33),(51,33)]
        for i,(x,y) in enumerate(centers):
            a=(i-2)*.21
            if name=="vine":
                pts=[(34+i*2,65),(x+4,50),(x-7,44-phase),(x+5,32-phase*2),(x+3,22-phase*3)]
                stroke(d,pts,p,6)
                for j,(u,v) in enumerate(pts[1:]):
                    s=(-1)**(j+i)
                    d.polygon([(u,v),(u+s*9,v-8),(u+s*10,v),(u+s*4,v+1)],fill=p[2+j%2])
            elif name in ("crystal","rubble"):
                base=56-i%2*4; tip=y-phase*2
                pts=[(x-8,base),(x-10,tip+11),(x,tip),(x+8,tip+10),(x+9,base-4)]
                d.polygon(pts,fill=p[1],outline=p[0])
                d.polygon([(x,tip+1),(x+7,tip+10),(x+3,base-4),(x-1,base)],fill=p[2])
                d.line([(x-6,tip+13),(x,tip+1),(x+1,base-6)],fill=p[3])
            elif name in ("claw","hand"):
                reach=(6 if name=="claw" else 1)*(i%3)+phase
                pts=[(x+3,55), (x-4,y+16), (x-7,y+5), (x-4,y-reach),
                     (x+1,y-3-reach),(x+4,y+8),(x+7,y+17)]
                d.polygon(pts,fill=p[1],outline=p[0])
                d.line(pts[2:6],fill=p[3],width=2)
            elif name=="soul":
                d.polygon([(x-7,y-7),(x,y-12-phase),(x+8,y-5),(x+5,y+5),
                           (x+12,y+14+phase),(x-1,y+8),(x-6,y+12)],fill=p[1],outline=p[3])
                d.line([(x-4,y-3),(x-2,y-2),(x+3,y-2),(x+5,y-3)],fill=p[4])
            elif name=="banner":
                d.polygon([(x-7,12),(x+7,12),(x+5,55-i%2*5),(x,48),(x-5,55)],
                          fill=p[1],outline=p[3])
                d.line([(x-4,25),(x+4,25),(x,34),(x+4,42)],fill=p[2])
            else:
                stroke(d,[(x-14,y-20),(x-5,y-14),(x-1,y-3),
                          (x-6,y+5),(x+4,y+15),(x+5,y+23)],p,4)


for key,p in PALETTES.items():
    for f in range(4):
        put(f"{key}-seal{f}",(128,60),lambda d:sigil(d,p,f))
        for name,size in (("crest",(32,32)),("wake",(52,36)),("burst",(64,64))):
            put(f"{key}-{name}{f}",size,lambda d:fragment(d,p,f,name))
for key in ("chaos","storm","violet"):
    p=PALETTES[key]
    for f in range(4):
        put(f"{key}-bolt{f}",(64,108),lambda d:bolt(d,p,f))
        if key!="violet":
            put(f"{key}-cloud{f}",(150,58),lambda d:cloud(d,p,f))
for key in ("chaos","dragon"):
    p=PALETTES[key]
    for f in range(4):
        for part,size in (("head",(52,44)),("body",(32,26)),("leg",(24,26))):
            put(f"{key}-{part}{f}",size,lambda d:dragon(d,p,part,f))
for f in range(8):
    put(f"sun-crow{f}",(132,136),lambda d:crow(d,PALETTES["sun"],f))
    if f<4:
        put(f"sun-disc{f}",(64,64),lambda d:sun(d,PALETTES["sun"],f))
for key,name in (("ice","crystal"),("ice","lotus"),("wood","vine"),("ghost","claw"),
                 ("ghost","soul"),("ember","hand"),("earth","rubble"),("void","rift"),
                 ("storm","banner"),("wood","flower")):
    for f in range(4):
        put(f"{key}-{name}{f}",(72,68),lambda d:motifs(d,PALETTES[key],name,f))

ATLAS.crop((0,0,1024,Y+ROW)).save(OUT/"atlas.png",optimize=True)
(OUT/"atlas.json").write_text(json.dumps({"frames":FRAMES,"meta":{"image":"atlas.png",
    "size":{"w":1024,"h":Y+ROW},"scale":"1"}},indent=2)+"\n",encoding="utf8")

AUDIO = {
    "blade": (440, 1049, .30, .26, 2), "dao": (148, 494, .36, .45, -3),
    "spear": (245, 895, .25, .47, 4), "fist": (57, 113, .31, .52, -2),
    "lightning": (53, 267, .68, .62, -1), "fire": (74, 137, .60, .72, -1),
    "ice": (643, 1481, .47, .13, 1), "spirit": (286, 574, .53, .15, 0),
    "seal": (106, 423, .66, .11, 1), "dragon": (61, 147, .84, .36, 1),
    "crow": (296, 618, .82, .28, 3), "shock": (41, 92, .48, .40, -1),
    "contact": (103, 182, .19, .57, -2), "tail": (251, 377, .65, .12, 0),
}
for i,(name,(fund,chime,duration,noise,sweep)) in enumerate(AUDIO.items()):
    rate=22050
    rng=random.Random(827303+i)
    previous=0
    samples=[]
    for j in range(round(duration*rate)):
        t=j/rate
        u=t/duration
        envelope=min(1,t/(.008 if duration<.5 else .041))*(1-u)**2
        previous=previous*.73+rng.uniform(-1,1)*.27
        f=fund*t*(1+sweep*.22*u)
        tones=.52*m.sin(m.tau*f+.2*m.sin(m.tau*13*t))+.2*m.sin(m.tau*chime*t)*m.exp(-4*u)
        amount=(tones*(1-noise)+noise*previous)*envelope
        samples.append(struct.pack("<h",round(15000*amount)))
    with wave.open(str(OUT/(name+".wav")),"wb") as file:
        file.setparams((1,2,rate,0,"NONE","not compressed"))
        file.writeframes(b"".join(samples))

"""Generate the Thanh Van Ky pixel-art source PNGs and Tiled map.

These assets are painted with integer-coordinate Pillow primitives; no image
generation model or Pixelorama painting session is used. Re-run with:
  python art/source/generate_assets.py
"""
from __future__ import annotations

import json
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "public" / "assets"
ART = ASSETS / "tilesets"
CHARS = ASSETS / "characters"
PROPS = ASSETS / "props"
MAPS = ROOT / "maps"
for folder in (ART, CHARS, PROPS, MAPS):
    folder.mkdir(parents=True, exist_ok=True)

PAL = {
    "ink": (30, 42, 39), "deep": (37, 61, 51), "grass": (65, 111, 76),
    "grass_hi": (91, 144, 88), "grass_light": (122, 165, 105),
    "grass_dark": (48, 86, 64), "leaf": (36, 91, 73), "leaf_hi": (62, 128, 97),
    "water": (54, 121, 138), "water_hi": (101, 185, 186), "water_dark": (42, 88, 111),
    "soil": (144, 111, 70), "soil_hi": (180, 143, 91), "soil_dark": (103, 76, 55),
    "stone": (123, 135, 119), "stone_hi": (171, 173, 143), "stone_dark": (78, 91, 83),
    "jade": (111, 194, 169), "jade_hi": (176, 237, 203), "jade_dark": (46, 132, 121),
    "gold": (226, 192, 112), "gold_hi": (250, 225, 161), "red": (177, 84, 59),
    "roof": (124, 73, 63), "roof_hi": (184, 110, 78), "wood": (114, 77, 51),
    "wood_hi": (165, 119, 75), "robe": (219, 230, 214), "robe_shadow": (134, 178, 164),
    "blue": (85, 145, 159), "blue_dark": (53, 88, 110), "skin": (231, 190, 145),
    "hair": (48, 44, 41), "cream": (232, 221, 185), "wolf": (98, 127, 135),
    "wolf_hi": (148, 176, 171), "crystal": (127, 230, 208), "flower": (239, 220, 161),
}
random.seed(27)


def rgb(name: str):
    return PAL.get(name, name)


def rect(d, box, color, outline=None):
    d.rectangle(box, fill=rgb(color), outline=rgb(outline) if outline else None)


def poly(d, pts, color, outline=None):
    d.polygon(pts, fill=rgb(color))
    if outline:
        d.line(pts + [pts[0]], fill=rgb(outline), width=1)


def line(d, pts, color, width=1):
    d.line(pts, fill=rgb(color), width=width)


def ellipse(d, box, color, outline=None):
    d.ellipse(box, fill=rgb(color), outline=rgb(outline) if outline else None)


def speckle(d, ox, oy, base, n=14, light="grass_hi", dark="grass_dark"):
    for _ in range(n):
        x, y = ox + random.randrange(2, 30), oy + random.randrange(2, 30)
        color = light if random.random() > .42 else dark
        d.point((x, y), fill=rgb(color))


def make_terrain():
    cols, rows, size = 16, 8, 32
    im = Image.new("RGBA", (cols * size, rows * size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for idx in range(cols * rows):
        ox, oy = idx % cols * size, idx // cols * size
        if idx < 8:  # grass field tiles, four natural variants
            base = "grass" if idx < 4 else "grass_dark"
            rect(d, (ox, oy, ox+31, oy+31), base)
            speckle(d, ox, oy, base, 7 if idx % 4 == 0 else 4,
                    "grass_light" if idx < 4 else "grass", "grass_dark" if idx < 4 else "deep")
            for j in range(3):
                x, y = ox+random.randrange(3, 28), oy+random.randrange(3, 28)
                line(d, [(x, y+2), (x, y)], "grass_light")
        elif 8 <= idx < 16:  # worn ochre paths
            rect(d, (ox, oy, ox+31, oy+31), "soil" if idx % 2 else "soil_dark")
            speckle(d, ox, oy, "soil", 22, "soil_hi", "soil_dark")
            for j in range(2):
                x, y = ox+random.randrange(4, 26), oy+random.randrange(5, 26)
                line(d, [(x, y), (x+2, y+1)], "soil_hi")
        elif 16 <= idx < 24:  # fitted stone paths
            rect(d, (ox, oy, ox+31, oy+31), "stone_dark")
            variant = idx % 4
            rect(d, (ox+1, oy+1, ox+14, oy+14), "stone" if variant else "stone_hi", "stone_dark")
            rect(d, (ox+16, oy+1, ox+30, oy+14), "stone_hi" if variant == 1 else "stone", "stone_dark")
            rect(d, (ox+1, oy+16, ox+14, oy+30), "stone_hi" if variant == 2 else "stone", "stone_dark")
            rect(d, (ox+16, oy+16, ox+30, oy+30), "stone" if variant == 3 else "stone_hi", "stone_dark")
            line(d, [(ox+4, oy+4), (ox+8, oy+4)], "cream")
        elif 24 <= idx < 32:  # sect practice court slabs
            # Quiet, continuous gray-green flagstone; avoid a checkerboard floor.
            rect(d, (ox, oy, ox+31, oy+31), "stone")
            speckle(d, ox, oy, "stone", 7, "stone_hi", "stone_dark")
            line(d, [(ox+5+(idx%3), oy+7), (ox+10+(idx%3), oy+7)], "stone_hi")
        elif 32 <= idx < 40:  # deep moving water
            rect(d, (ox, oy, ox+31, oy+31), "water_dark")
            for j in range(5):
                y = oy + 4 + j * 6
                x = ox + ((j*7 + idx*3) % 14)
                line(d, [(x, y), (x+7, y)], "water_hi" if j % 2 else "water")
                d.point((x+9, y+1), fill=rgb("jade"))
        elif 40 <= idx < 48:  # bank/shore pieces
            rect(d, (ox, oy, ox+31, oy+31), "water")
            rect(d, (ox, oy, ox+31, oy+8), "soil_hi")
            line(d, [(ox, oy+9), (ox+31, oy+9)], "cream")
            for j in range(4):
                x = ox + 3 + j*8
                d.point((x, oy+12+j%2), fill=rgb("water_hi"))
        elif 48 <= idx < 56:  # compact training terrace / stone border
            rect(d, (ox, oy, ox+31, oy+31), "stone_dark")
            rect(d, (ox+2, oy+2, ox+29, oy+29), "soil" if idx % 2 else "stone")
            line(d, [(ox+5, oy+5), (ox+12, oy+5)], "gold")
            line(d, [(ox+21, oy+24), (ox+27, oy+24)], "soil_hi")
        elif 56 <= idx < 64:  # garden soil
            rect(d, (ox, oy, ox+31, oy+31), "soil_dark")
            for y in (7, 15, 23):
                line(d, [(ox+2, oy+y), (ox+29, oy+y)], "soil")
                for x in (7, 18, 26):
                    d.point((ox+x, oy+y-2), fill=rgb("soil_hi"))
        elif 64 <= idx < 80:  # transparent flower / grass clusters
            if idx % 4 == 0:
                for x, y in [(10, 22), (17, 16), (23, 24)]:
                    line(d, [(ox+x, oy+y+6), (ox+x, oy+y)], "grass_dark")
                    d.point((ox+x, oy+y), fill=rgb(["gold", "jade_hi", "red", "cream"][idx % 4]))
                    d.point((ox+x+1, oy+y+1), fill=rgb("flower"))
            elif idx % 4 == 1:
                ellipse(d, (ox+5, oy+14, ox+27, oy+29), "grass_dark")
                ellipse(d, (ox+8, oy+10, ox+24, oy+25), "grass")
                for j in range(5):
                    d.point((ox+8+(j*7)%16, oy+16+(j*3)%9), fill=rgb("grass_light"))
            elif idx % 4 == 2:
                for x in (8, 15, 23):
                    line(d, [(ox+x, oy+29), (ox+x-2, oy+18)], "grass_light")
                    line(d, [(ox+x-2, oy+21), (ox+x-5, oy+17)], "grass")
                    line(d, [(ox+x-2, oy+19), (ox+x+2, oy+15)], "grass_hi")
            else:
                for x, c in [(9, "blue"), (16, "cream"), (23, "gold")]:
                    line(d, [(ox+x, oy+27), (ox+x, oy+17)], "grass_dark")
                    ellipse(d, (ox+x-3, oy+13, ox+x+3, oy+19), c, "grass_dark")
                    d.point((ox+x, oy+16), fill=rgb("gold_hi"))
        elif 80 <= idx < 96:  # paving cracks, edge stones, stepping stones
            rect(d, (ox, oy, ox+31, oy+31), "grass_dark")
            for j in range(4):
                x = ox + 2 + (j % 2)*15
                y = oy + 2 + (j // 2)*15
                ellipse(d, (x, y, x+12, y+12), "stone", "stone_dark")
                d.point((x+3, y+3), fill=rgb("stone_hi"))
        else:
            rect(d, (ox, oy, ox+31, oy+31), "grass")
            speckle(d, ox, oy, "grass", 12, "grass_hi", "grass_dark")
    im.save(ART / "qingyun_terrain.png")
    return im


def body_base(d, ox, oy, frame, direction="down", action="idle"):
    # Shadow, boots, ivory robe, teal waist sash and dark hair: 32x48 native pixels.
    bounce = [0, -1, -2, -1, 0, -1, -2, -1][frame % 8] if action == "run" else ([0, 0, -1, 0, 0, 0, -1, 0][frame % 8] if action == "walk" else [0, 0, -1, 0][frame % 4])
    y = oy + bounce
    ellipse(d, (ox+7, y+40, ox+25, y+44), (28, 44, 39, 155))
    foot = frame % 4
    if action in ("walk", "run"):
        stride = 3 if action == "run" else 2
        rect(d, (ox+11, y+36+(stride if foot in (1, 2) else 0), ox+14, y+41), "blue_dark")
        rect(d, (ox+18, y+36+(stride if foot in (0, 3) else 0), ox+21, y+41), "blue_dark")
    else:
        rect(d, (ox+11, y+37, ox+14, y+41), "blue_dark")
        rect(d, (ox+18, y+37, ox+21, y+41), "blue_dark")
    # Robe outline and flowing hem.
    poly(d, [(ox+10,y+21),(ox+21,y+21),(ox+25,y+37),(ox+22,y+40),(ox+8,y+40),(ox+6,y+37)], "blue_dark")
    poly(d, [(ox+11,y+22),(ox+20,y+22),(ox+23,y+36),(ox+20,y+38),(ox+9,y+38),(ox+8,y+36)], "robe")
    poly(d, [(ox+8,y+33),(ox+23,y+33),(ox+22,y+38),(ox+9,y+38)], "robe_shadow")
    line(d, [(ox+10,y+34),(ox+13,y+37),(ox+16,y+34)], "jade")
    rect(d, (ox+10,y+28,ox+21,y+30), "jade_dark")
    line(d, [(ox+11,y+28),(ox+20,y+28)], "jade_hi")
    # Sleeves are direction-aware; one arm carries a slim sword.
    if direction == "up":
        rect(d, (ox+9,y+23,ox+22,y+29), "robe")
        rect(d, (ox+11,y+22,ox+20,y+25), "hair")
        rect(d, (ox+12,y+20,ox+19,y+23), "blue_dark")
        rect(d, (ox+14,y+21,ox+17,y+22), "gold")
    elif direction in ("left", "right"):
        rect(d, (ox+7,y+24,ox+11,y+31), "robe_shadow")
        rect(d, (ox+19,y+25,ox+23,y+31), "robe")
        rect(d, (ox+8,y+30,ox+10,y+32), "skin")
        rect(d, (ox+21,y+29,ox+23,y+31), "skin")
        rect(d, (ox+7,y+32,ox+9,y+39), "stone_hi")
        d.point((ox+8,y+31), fill=rgb("gold"))
    else:
        rect(d, (ox+7,y+24,ox+11,y+31), "robe_shadow")
        rect(d, (ox+20,y+24,ox+24,y+31), "robe")
        rect(d, (ox+8,y+30,ox+10,y+32), "skin")
        rect(d, (ox+21,y+30,ox+23,y+32), "skin")
        rect(d, (ox+23,y+28,ox+25,y+38), "stone_hi")
        d.point((ox+24,y+27), fill=rgb("gold"))
    # Head and topknot.
    ellipse(d, (ox+11,y+8,ox+21,y+20), "skin", "hair")
    rect(d, (ox+11,y+12,ox+21,y+15), "skin")
    if direction == "up":
        rect(d, (ox+10,y+9,ox+22,y+19), "hair")
        rect(d, (ox+12,y+8,ox+20,y+14), "blue_dark")
        rect(d, (ox+14,y+9,ox+18,y+10), "gold")
    elif direction == "left":
        rect(d, (ox+10,y+8,ox+20,y+12), "hair")
        d.point((ox+11,y+14), fill=rgb("hair"))
        d.point((ox+12,y+15), fill=rgb("ink"))
        d.point((ox+17,y+14), fill=rgb("hair"))
        rect(d, (ox+11,y+7,ox+20,y+9), "blue_dark")
        rect(d, (ox+13,y+8,ox+18,y+9), "gold")
    elif direction == "right":
        rect(d, (ox+12,y+8,ox+22,y+12), "hair")
        d.point((ox+21,y+14), fill=rgb("hair"))
        d.point((ox+20,y+15), fill=rgb("ink"))
        d.point((ox+15,y+14), fill=rgb("hair"))
        rect(d, (ox+12,y+7,ox+21,y+9), "blue_dark")
        rect(d, (ox+14,y+8,ox+19,y+9), "gold")
    else:
        rect(d, (ox+10,y+7,ox+22,y+12), "hair")
        rect(d, (ox+13,y+5,ox+19,y+9), "hair")
        rect(d, (ox+11,y+7,ox+21,y+9), "blue_dark")
        rect(d, (ox+14,y+7,ox+18,y+8), "gold")
        d.point((ox+13,y+15), fill=rgb("ink")); d.point((ox+19,y+15), fill=rgb("ink"))
    # Fine embroidery and jade pendant.
    d.point((ox+16,y+25), fill=rgb("gold")); d.point((ox+16,y+26), fill=rgb("jade_hi"))
    d.point((ox+11,y+35), fill=rgb("gold")); d.point((ox+20,y+35), fill=rgb("gold"))


def make_player():
    fw, fh, cols, rows = 32, 48, 8, 36
    im = Image.new("RGBA", (fw*cols, fh*rows), (0,0,0,0))
    d = ImageDraw.Draw(im)
    dirs = ["down", "up", "left", "right"]
    row_specs = [("idle", d, 4, 0) for d in dirs]
    row_specs += [("walk", d, 8, 0) for d in dirs]
    row_specs += [("run", d, 8, 0) for d in dirs]
    row_specs += [(f"attack{combo}", d, 6, 0) for combo in range(1, 4) for d in dirs]
    row_specs += [("cast", d, 8, 0) for d in dirs]
    row_specs += [("hurt", d, 4, 0) for d in dirs]
    row_specs += [("death", d, 8, 0) for d in dirs]
    for row,(action,direction,frame_count,_) in enumerate(row_specs):
        for frame in range(cols):
            ox,oy=frame*fw,row*fh
            pose = "run" if action == "run" else "walk" if action == "walk" else "idle"
            body_base(d,ox,oy,frame,direction,pose)
            # Sword scabbard is visible on the back-facing view and at the waist in profile.
            if direction == "up" and action not in ("death",):
                line(d,[(ox+22,oy+27),(ox+26,oy+19)],"wood",3)
                line(d,[(ox+23,oy+25),(ox+27,oy+17)],"stone_hi")
                d.point((ox+21,oy+28),fill=rgb("gold"))
            if action.startswith("attack"):
                combo = int(action[-1]); phase = frame % 6
                if phase < 5:
                    reach = 4 + phase * 2 + combo
                    if direction == "down":
                        line(d,[(ox+23,oy+30),(ox+27,oy+34),(ox+25,oy+39)],"wood",2)
                        line(d,[(ox+25,oy+30),(ox+29,oy+35),(ox+27,oy+40)],"stone_hi",2)
                        if phase >= 2: line(d,[(ox+9,oy+27),(ox+19,oy+39),(ox+28,oy+37)],"jade_hi" if combo==3 else "cream",1)
                    elif direction == "up":
                        line(d,[(ox+8,oy+29),(ox+4,oy+24),(ox+7,oy+19)],"wood",2)
                        line(d,[(ox+7,oy+28),(ox+3,oy+23),(ox+6,oy+18)],"stone_hi",2)
                        if phase >= 2: line(d,[(ox+24,oy+28),(ox+13,oy+17),(ox+4,oy+19)],"jade_hi" if combo==3 else "cream",1)
                    elif direction == "left":
                        line(d,[(ox+12,oy+29),(ox+5-reach//4,oy+29),(ox+3-reach//3,oy+24)],"wood",2)
                        line(d,[(ox+11,oy+27),(ox+4-reach//4,oy+27),(ox+2-reach//3,oy+22)],"stone_hi",2)
                        if phase >= 2: line(d,[(ox+12,oy+37),(ox+2-reach//3,oy+31),(ox+3-reach//3,oy+23)],"jade_hi" if combo==3 else "cream",1)
                    else:
                        line(d,[(ox+21,oy+29),(ox+28+reach//4,oy+29),(ox+30+reach//3,oy+24)],"wood",2)
                        line(d,[(ox+22,oy+27),(ox+29+reach//4,oy+27),(ox+31+reach//3,oy+22)],"stone_hi",2)
                        if phase >= 2: line(d,[(ox+21,oy+37),(ox+31+reach//3,oy+31),(ox+30+reach//3,oy+23)],"jade_hi" if combo==3 else "cream",1)
                    d.point((ox+24,oy+27),fill=rgb("gold"))
            elif action == "cast":
                # Jade-white gathering rings and visible sword-channeling sparks.
                radius = 3 + frame % 4
                ellipse(d,(ox+16-radius,oy+26-radius,ox+16+radius,oy+26+radius),(0,0,0,0),"jade_hi" if frame%2 else "cream")
                for j in range(4):
                    px=ox+6+(frame*3+j*7)%21;py=oy+16+(j*5+frame*2)%20
                    d.point((px,py),fill=rgb("gold_hi" if j==0 else "jade_hi"))
            elif action == "hurt":
                d.point((ox+12+frame%3,oy+25),fill=rgb("red"));d.point((ox+20-frame%3,oy+31),fill=rgb("red"))
                line(d,[(ox+9,oy+23),(ox+22,oy+24)],"cream")
            elif action == "death":
                # The last frames lower the silhouette onto the ground.
                if frame >= 3:
                    rect(d,(ox+6,oy+36,ox+25,oy+40),"blue_dark","ink")
                    rect(d,(ox+9,oy+34,ox+21,oy+38),"robe")
                    ellipse(d,(ox+4,oy+32,ox+13,oy+40),"skin","hair")
                    line(d,[(ox+22,oy+36),(ox+29,oy+33)],"stone_hi",2)
                else:
                    line(d,[(ox+10,oy+23),(ox+16-frame,oy+32),(ox+22,oy+23)],"cream")
    # Keep the hand-coded 32x48 pixel grid crisp while delivering larger 48x64
    # gameplay frames. Nearest-neighbor scaling preserves hard pixel edges.
    scaled = Image.new("RGBA", (48*cols,64*rows),(0,0,0,0))
    for row in range(rows):
        for col in range(cols):
            cell=im.crop((col*fw,row*fh,(col+1)*fw,(row+1)*fh)).resize((48,64),Image.Resampling.NEAREST)
            scaled.alpha_composite(cell,(col*48,row*64))
    scaled.save(CHARS / "van_du.png")


def make_npc():
    im=Image.new("RGBA",(32,48),(0,0,0,0)); d=ImageDraw.Draw(im)
    # Elder steward in layered ochre and pine robes.
    ellipse(d,(7,40,25,44),(28,44,39,155))
    rect(d,(11,35,14,41),"blue_dark");rect(d,(18,35,21,41),"blue_dark")
    poly(d,[(10,20),(22,20),(26,38),(22,40),(8,40),(6,37)],"wood","ink")
    poly(d,[(11,21),(21,21),(23,36),(9,36)],"gold","soil_dark")
    poly(d,[(9,31),(23,31),(22,38),(9,38)],"red")
    rect(d,(10,26,22,28),"jade_dark");rect(d,(15,26,17,28),"gold_hi")
    rect(d,(8,23,11,31),"gold");rect(d,(21,23,24,31),"gold")
    ellipse(d,(10,7,22,20),"skin","hair")
    rect(d,(9,8,23,13),"hair");rect(d,(11,5,21,9),"cream");rect(d,(12,7,20,8),"gold")
    rect(d,(12,14,20,16),"hair");rect(d,(13,16,19,18),"cream")
    rect(d,(10,3,22,5),"wood");d.point((15,5),fill=rgb("gold"))
    im.save(CHARS / "steward_li.png")


def make_combat_effects():
    """Paint lightweight, transparent pixel spritesheets for combat feedback."""
    fxdir = ASSETS / "effects"
    fxdir.mkdir(parents=True, exist_ok=True)
    # Sweeping jade/ivory saber arcs, six 48x48 frames.
    im = Image.new("RGBA", (48*6, 48), (0,0,0,0))
    for f in range(6):
        cell = Image.new("RGBA", (48,48), (0,0,0,0)); d=ImageDraw.Draw(cell)
        start=22-f*5; end=56-f*5
        for radius,color,width in [(22,(41,119,112,80),8),(19,(91,203,181,150),4),(17,(218,250,229,245),1)]:
            pts=[]
            for a in range(start,end+1,5):
                rad=math.radians(a);pts.append((24+int(math.cos(rad)*radius),25+int(math.sin(rad)*radius)))
            if len(pts)>1:d.line(pts,fill=color,width=width,joint="curve")
        for j in range(5):
            x=7+(j*9+f*5)%34;y=8+(j*13+f*3)%30
            d.point((x,y),fill=(186,245,218,210 if j%2 else 130))
        im.alpha_composite(cell,(f*48,0))
    im.save(fxdir/"slash_arc.png")
    # A real pointed, layered energy projectile with a tapered luminous wake.
    im=Image.new("RGBA",(40*8,24),(0,0,0,0))
    for f in range(8):
        cell=Image.new("RGBA",(40,24),(0,0,0,0));d=ImageDraw.Draw(cell)
        flicker=f%3
        poly(d,[(2,12),(12,8-flicker),(25,9),(36,12),(25,15),(12,16+flicker)],(35,121,143,150))
        poly(d,[(6,12),(15,10),(29,11),(37,12),(29,13),(15,14)],(95,211,205,230))
        poly(d,[(20,12),(31,10),(39,12),(31,14)],(235,255,229,255))
        for j in range(5):
            x=4+(j*7+f*4)%30;y=5+(j*11+f*3)%14
            d.point((x,y),fill=(143,249,223,220 if j%2 else 140))
        im.alpha_composite(cell,(f*40,0))
    im.save(fxdir/"qi_bolt.png")
    # Pixel star-shaped impact and small dispersing death particles.
    for name,count,size in [("impact_spark",6,24),("spirit_burst",8,32)]:
        im=Image.new("RGBA",(size*count,size),(0,0,0,0))
        for f in range(count):
            cell=Image.new("RGBA",(size,size),(0,0,0,0));d=ImageDraw.Draw(cell)
            cx=cy=size//2; radius=max(1,(count-f)*2)
            if name=="impact_spark":
                for k in range(8):
                    a=math.radians(k*45+f*8);x=cx+int(math.cos(a)*radius);y=cy+int(math.sin(a)*radius)
                    line(d,[(cx,cy),(x,y)],"cream" if k%2 else "jade_hi",1 if f>2 else 2)
                d.rectangle((cx-2,cy-2,cx+2,cy+2),fill=rgb("gold_hi" if f%2 else "cream"))
            else:
                for j in range(8):
                    a=math.radians(j*45+f*13);r=max(2,f*2+3);x=cx+int(math.cos(a)*r);y=cy+int(math.sin(a)*r)
                    d.rectangle((x,y,x+1,y+1),fill=rgb("jade_hi" if j%2 else "gold_hi"))
            im.alpha_composite(cell,(f*size,0))
        im.save(fxdir/f"{name}.png")


def make_cultivation_assets():
    """Generate pixel-art sitting pose, meditation aura, arrays and five roots."""
    fxdir=ASSETS/"effects";fxdir.mkdir(parents=True,exist_ok=True);(ASSETS/"ui").mkdir(parents=True,exist_ok=True)
    # Seated cultivator pose derived from the same 32x48 pixel character design.
    base=Image.new("RGBA",(32,48),(0,0,0,0));body_base(ImageDraw.Draw(base),0,0,0,"down","idle")
    seated=base.resize((48,64),Image.Resampling.NEAREST);d=ImageDraw.Draw(seated)
    d.ellipse((11,53,38,59),fill=(20,31,26,145))
    d.rectangle((11,42,36,52),fill=rgb("blue_dark"),outline=rgb("ink"),width=2)
    d.polygon([(11,38),(18,34),(31,35),(38,41),(35,51),(14,51)],fill=rgb("robe"),outline=rgb("blue_dark"))
    d.polygon([(15,46),(34,46),(32,51),(17,51)],fill=rgb("robe_shadow"))
    d.line([(15,43),(23,47),(31,43)],fill=rgb("gold"),width=2)
    d.ellipse((16,9,31,25),fill=rgb("skin"),outline=rgb("hair"),width=2)
    d.rectangle((15,9,32,15),fill=rgb("hair"));d.rectangle((20,4,28,11),fill=rgb("hair"))
    d.rectangle((18,9,30,11),fill=rgb("blue_dark"));d.point((24,10),fill=rgb("gold_hi"))
    d.rectangle((20,17,27,18),fill=rgb("ink"))
    d.polygon([(10,35),(17,32),(22,37),(17,42)],fill=rgb("robe"),outline=rgb("blue_dark"))
    d.polygon([(30,35),(37,32),(40,38),(34,42)],fill=rgb("robe"),outline=rgb("blue_dark"))
    d.ellipse((21,26,27,31),fill=rgb("jade_hi"),outline=rgb("gold"))
    seated.save(CHARS/"van_du_meditation.png")
    # Eight-frame orbiting qi motes and a separate talisman-like floor array.
    aura=Image.new("RGBA",(48*8,48),(0,0,0,0))
    for f in range(8):
        cell=Image.new("RGBA",(48,48),(0,0,0,0));d=ImageDraw.Draw(cell)
        d.ellipse((10,7,37,40),outline=(83,187,172,70),width=1)
        for j in range(4):
            a=math.radians(f*45+j*90);x=24+round(math.cos(a)*16);y=23+round(math.sin(a)*17)
            d.rectangle((x-1,y-1,x+1,y+1),fill=(134,241,212,210 if j%2==0 else 145))
            d.point((x+int(math.cos(a)*3),y+int(math.sin(a)*3)),fill=(236,224,158,210))
        aura.alpha_composite(cell,(f*48,0))
    aura.save(fxdir/"spirit_aura.png")
    circle=Image.new("RGBA",(96,32),(0,0,0,0));d=ImageDraw.Draw(circle)
    d.ellipse((3,5,92,27),outline=(66,150,140,190),width=2);d.ellipse((12,8,83,24),outline=(218,184,106,200),width=1)
    for j in range(12):
        a=math.radians(j*30);x=48+round(math.cos(a)*39);y=16+round(math.sin(a)*9)
        d.rectangle((x-1,y-1,x+1,y+1),fill=rgb("gold_hi" if j%3==0 else "jade_hi"))
    for x in (23,48,73):d.polygon([(x,7),(x+2,12),(x,16),(x-2,12)],fill=rgb("cream" if x==48 else "jade"))
    circle.save(fxdir/"cultivation_circle.png")
    # Vertical rays/swirls for floor promotion and a larger breakthrough array.
    for name,count,size in [("realm_ascension",8,(64,80)),("foundation_breakthrough",12,(96,96))]:
        fw,fh=size;sheet=Image.new("RGBA",(fw*count,fh),(0,0,0,0))
        for f in range(count):
            cell=Image.new("RGBA",(fw,fh),(0,0,0,0));d=ImageDraw.Draw(cell);cx=fw//2;cy=fh//2+4
            if name=="realm_ascension":
                for j in range(9):
                    x=cx-27+j*7;lift=(f*7+j*5)%43
                    d.line([(x,fh-4-lift),(x+2,fh-16-lift)],fill=(116,232,194,90+((j+f)%3)*45),width=1)
                r=12+(f%4)*2;d.ellipse((cx-r,cy-r,cx+r,cy+r),outline=(207,241,204,140),width=1)
                for j in range(6):
                    a=math.radians(f*28+j*60);x=cx+round(math.cos(a)*r);y=cy+round(math.sin(a)*r)
                    d.point((x,y),fill=rgb("gold_hi" if j%2==0 else "jade_hi"))
            else:
                for radius,color,wid in [(34,(61,165,164,95),2),(27,(207,181,99,185),1),(18,(153,239,205,210),1)]:
                    d.ellipse((cx-radius,cy-radius,cx+radius,cy+radius),outline=color,width=wid)
                for j in range(8):
                    a=math.radians(f*10+j*45);r=37+(f%3)
                    x=cx+round(math.cos(a)*r);y=cy+round(math.sin(a)*r)
                    d.polygon([(x,y-4),(x+2,y),(x,y+4),(x-2,y)],fill=rgb("gold_hi" if j%2==0 else "jade_hi"))
                    d.line([(x,y),(cx+round(math.cos(a)*17),cy+round(math.sin(a)*17))],fill=(89,220,190,130),width=1)
                d.ellipse((cx-4,cy-4,cx+4,cy+4),fill=(237,247,197,210))
            sheet.alpha_composite(cell,(f*fw,0))
        sheet.save(fxdir/f"{name}.png")
    # Five clearly differentiated 32px wuxing root sigils.
    icon=Image.new("RGBA",(32*5,32),(0,0,0,0));d=ImageDraw.Draw(icon)
    colors=["stone_hi","grass_hi","water_hi","red","gold_hi"]
    for i,c in enumerate(colors):
        ox=i*32;d.ellipse((ox+3,3,ox+28,28),fill=(20,31,26,210),outline=rgb("gold"),width=1)
        if i==0: # metal blade
            d.polygon([(ox+16,6),(ox+21,16),(ox+16,25),(ox+11,16)],fill=rgb(c),outline=rgb("cream"));d.line([(ox+11,18),(ox+21,18)],fill=rgb("gold_hi"),width=2)
        elif i==1: # wood sprout
            d.line([(ox+16,24),(ox+16,10)],fill=rgb(c),width=3);d.polygon([(ox+15,17),(ox+8,12),(ox+9,19)],fill=rgb(c));d.polygon([(ox+17,14),(ox+24,9),(ox+22,17)],fill=rgb("jade_hi"))
        elif i==2: # water wave
            for y in (12,17,22):d.line([(ox+8,y),(ox+12,y-2),(ox+17,y),(ox+22,y-2),(ox+25,y)],fill=rgb(c),width=2)
        elif i==3: # fire flame
            d.polygon([(ox+16,7),(ox+22,16),(ox+19,22),(ox+16,25),(ox+12,21),(ox+11,16)],fill=rgb(c),outline=rgb("gold_hi"));d.polygon([(ox+16,14),(ox+19,19),(ox+16,22),(ox+14,19)],fill=rgb("cream"))
        else: # earth mountain
            d.polygon([(ox+7,23),(ox+13,11),(ox+16,16),(ox+20,8),(ox+26,23)],fill=rgb(c),outline=rgb("cream"));d.line([(ox+10,24),(ox+23,24)],fill=rgb("gold"),width=2)
    icon.save(ASSETS/"ui"/"spiritual_roots.png")


def make_beast(kind):
    cols,rows=6,4; im=Image.new("RGBA",(32*cols,32*rows),(0,0,0,0));d=ImageDraw.Draw(im)
    for row in range(rows):
        for f in range(cols):
            ox,oy=f*32,row*32; bob=1 if (row==1 and f%2) else 0
            # ground shadow
            ellipse(d,(ox+4,oy+24+bob,ox+28,oy+29+bob),(20,31,26,125))
            if row==3:
                # Six-frame collapse/fade pose, distinct for wolf and rabbit.
                if kind=="wolf":
                    ellipse(d,(ox+5,oy+21,ox+27,oy+28),"wolf","ink")
                    poly(d,[(ox+20,oy+22),(ox+25,oy+17),(ox+30,oy+20),(ox+27,oy+25)],"wolf_hi","ink")
                    line(d,[(ox+5,oy+21),(ox+2,oy+17),(ox+6,oy+16)],"wolf_hi",2)
                else:
                    ellipse(d,(ox+7,oy+20,ox+25,oy+28),"cream","ink")
                    ellipse(d,(ox+20,oy+18,ox+29,oy+25),"cream","ink")
                    line(d,[(ox+21,oy+19),(ox+20,oy+10),(ox+24,oy+18)],"robe_shadow",2)
                    ellipse(d,(ox+3,oy+20,ox+10,oy+26),"jade_hi","jade_dark")
                if f<4:
                    for j in range(3):d.point((ox+7+(f*3+j*7)%22,oy+12+(j*3)%7),fill=rgb("gold_hi" if j==0 else "jade_hi"))
            elif kind=="wolf":
                # curled tail, four legs, long wolf torso and angular head
                line(d,[(ox+8,oy+17+bob),(ox+4,oy+13+bob),(ox+5,oy+9+bob),(ox+9,oy+10+bob)],"wolf_hi",2)
                rect(d,(ox+8,oy+15+bob,ox+23,oy+23+bob),"wolf","ink")
                poly(d,[(ox+18,oy+17+bob),(ox+22,oy+9+bob),(ox+28,oy+11+bob),(ox+28,oy+18+bob),(ox+23,oy+21+bob)],"wolf_hi","ink")
                poly(d,[(ox+21,oy+11+bob),(ox+21,oy+5+bob),(ox+25,oy+10+bob)],"wolf","ink")
                poly(d,[(ox+25,oy+11+bob),(ox+28,oy+7+bob),(ox+28,oy+13+bob)],"wolf","ink")
                rect(d,(ox+25,oy+16+bob,ox+30,oy+18+bob),"cream")
                d.point((ox+26,oy+13+bob),fill=rgb("gold_hi"));d.point((ox+26,oy+13+bob),fill=rgb("red"))
                legshift=2 if row==1 and f%2 else 0
                for lx in (10,14,20,23):
                    rect(d,(ox+lx,oy+21+bob,ox+lx+2,oy+26+bob+(legshift if lx%2 else 0)),"blue_dark","ink")
                line(d,[(ox+12,oy+16+bob),(ox+16,oy+13+bob),(ox+19,oy+16+bob)],"wolf_hi")
                if row==2:
                    line(d,[(ox+6,oy+8),(ox+9,oy+6)],"jade_hi",2)
                    d.point((ox+26,oy+12),fill=rgb("gold_hi"))
            else:
                # rounded jade-grey body, long ears, luminous tail crystal
                ellipse(d,(ox+7,oy+13+bob,ox+25,oy+26+bob),"cream","ink")
                ellipse(d,(ox+18,oy+12+bob,ox+27,oy+21+bob),"cream","ink")
                ellipse(d,(ox+19,oy+3+bob,ox+23,oy+16+bob),"robe_shadow","ink")
                ellipse(d,(ox+24,oy+2+bob,ox+28,oy+15+bob),"robe_shadow","ink")
                line(d,[(ox+21,oy+6+bob),(ox+22,oy+12+bob)],"red")
                line(d,[(ox+26,oy+5+bob),(ox+27,oy+11+bob)],"red")
                d.point((ox+24,oy+16+bob),fill=rgb("ink"));d.point((ox+27,oy+18+bob),fill=rgb("red"))
                ellipse(d,(ox+4,oy+17+bob,ox+11,oy+24+bob),"jade_hi","jade_dark")
                for lx in (10,21):
                    rect(d,(ox+lx,oy+23+bob,ox+lx+3,oy+27+bob),"cream","ink")
                if row==2:
                    for j in range(4):
                        d.point((ox+4+(j*7+f*3)%24,oy+7+(j*5)%19),fill=rgb("jade_hi" if j%2 else "gold_hi"))
                if row==1 and f%3==1:
                    line(d,[(ox+11,oy+12),(ox+15,oy+9)],"gold_hi")
    im.save(CHARS / f"{kind}.png")


def outline_box(d, box, fill, edge="ink"):
    d.rectangle(box,fill=rgb(fill),outline=rgb(edge),width=2)


def prop_tree(d, idx):
    # tree silhouette with stepped foliage clusters and bark pixel grain
    trunk=rgb("wood")
    rect(d,(58,45,69,94),trunk,"ink")
    rect(d,(60,54,63,92),"wood_hi")
    line(d,[(62,71),(54,62),(51,53)],"wood",4);line(d,[(65,70),(75,59),(79,48)],"wood",4)
    for x,y,r,c in [(42,28,20,"grass_dark"),(59,18,23,"leaf"),(78,28,20,"grass"),(42,44,17,"leaf"),(73,45,18,"grass_dark"),(58,37,22,"grass_hi")]:
        ellipse(d,(x-r,y-r,x+r,y+r),c,"deep")
    for x,y,c in [(47,19,"grass_light"),(61,13,"leaf_hi"),(75,23,"grass_light"),(49,39,"leaf_hi"),(68,34,"grass_light"),(57,48,"leaf_hi")]:
        rect(d,(x,y,x+5,y+4),c)
    for j in range(7):
        x=38+(j*17+idx*3)%48;y=10+(j*11)%43
        d.point((x,y),fill=rgb("gold" if j%4==0 else "grass_light"))


def prop_bamboo(d):
    for x,h in [(39,72),(52,89),(66,77),(78,93),(90,70)]:
        rect(d,(x,96-h,x+4,96),"grass_dark","ink")
        for y in range(96-h+10,94,14):
            line(d,[(x-1,y),(x+5,y)],"grass_light")
        line(d,[(x+1,96-h+4),(x+1,92)],"grass_hi")
    for x,y,sgn in [(52,28,-1),(65,22,1),(77,38,-1),(40,50,1),(87,20,1),(55,62,-1)]:
        poly(d,[(x,y),(x+sgn*18,y-7),(x+sgn*11,y+1),(x,y+3)],"leaf","deep")
        line(d,[(x,y+1),(x+sgn*15,y-5)],"grass_light")


def prop_rock(d, crystal=False):
    if crystal:
        poly(d,[(42,81),(47,41),(56,25),(64,7),(73,30),(81,82),(67,92),(52,91)],"jade_dark","ink")
        poly(d,[(56,83),(60,34),(64,11),(68,42),(71,82)],"crystal","jade_hi")
        poly(d,[(47,76),(52,45),(58,30),(55,78)],"blue","jade")
        for p in [(46,38),(77,55),(57,16),(86,75)]: d.point(p,fill=rgb("gold_hi"))
    else:
        poly(d,[(30,82),(32,65),(42,54),(47,40),(60,37),(69,48),(82,51),(91,66),(95,83),(78,91),(45,91)],"stone_dark","ink")
        poly(d,[(38,77),(43,61),(52,53),(59,47),(69,54),(77,58),(84,73),(70,81),(47,83)],"stone","stone_dark")
        line(d,[(50,57),(58,52),(63,55)],"stone_hi",2)
        for x,y in [(43,76),(74,67),(62,83)]:d.point((x,y),fill=rgb("stone_hi"))


def prop_lantern(d):
    rect(d,(61,39,66,91),"wood","ink");rect(d,(56,88,71,94),"stone_dark","ink")
    poly(d,[(48,42),(53,34),(74,34),(80,42),(74,47),(53,47)],"roof","ink")
    rect(d,(51,46,77,71),"wood","ink");rect(d,(55,49,73,67),"gold","wood")
    rect(d,(58,51,70,65),"gold_hi");rect(d,(61,53,67,63),"cream")
    for x in (53,75):line(d,[(x,46),(x,71)],"wood_hi")
    line(d,[(52,73),(76,73)],"gold")
    for x in (57,63,69):line(d,[(x,74),(x,80)],"red")


def prop_hall(d, variant):
    # Shared wooden base, detailed raised roof, layered upturned eaves.
    if variant == "gate":
        rect(d,(18,56,31,94),"wood","ink");rect(d,(97,56,110,94),"wood","ink")
        rect(d,(25,61,34,91),"wood_hi");rect(d,(94,61,103,91),"wood_hi")
        rect(d,(21,46,106,56),"red","ink")
        for x in range(28,102,12):rect(d,(x,48,x+5,54),"gold")
        poly(d,[(3,49),(17,38),(47,43),(64,30),(81,43),(111,38),(125,49),(105,54),(22,54)],"roof","ink")
        poly(d,[(16,44),(48,47),(64,37),(81,47),(113,44),(104,48),(25,48)],"roof_hi")
        for x in range(21,112,12):line(d,[(x,43),(x+3,49)],"gold")
        rect(d,(54,57,74,95),"wood_dark" if "wood_dark" in PAL else "soil_dark","ink")
        rect(d,(57,63,71,93),"soil_dark")
        return
    wall="wood" if variant in ("hall","pavilion") else "soil_dark"
    rect(d,(25,45,103,91),wall,"ink")
    rect(d,(31,50,97,86),"wood_hi" if variant in ("hall","pavilion") else "soil")
    # stone foundation and timber framing
    rect(d,(21,87,107,94),"stone_dark","ink")
    line(d,[(26,89),(102,89)],"stone_hi")
    for x in (32,46,82,96):rect(d,(x,47,x+4,88),"wood","ink")
    if variant=="hall":
        rect(d,(54,64,76,91),"wood","ink");rect(d,(58,67,72,90),"soil_dark")
        rect(d,(40,57,48,67),"jade_dark","ink");rect(d,(81,57,89,67),"jade_dark","ink")
        rect(d,(42,59,46,64),"jade_hi");rect(d,(83,59,87,64),"jade_hi")
        rect(d,(49,36,79,44),"red","ink")
        line(d,[(53,37),(75,37)],"gold")
    elif variant=="house":
        rect(d,(57,65,73,91),"soil_dark","ink");rect(d,(60,68,70,91),"wood")
        for x in (39,85):
            rect(d,(x,58,x+13,70),"jade_dark","ink");rect(d,(x+3,60,x+10,66),"jade_hi")
    elif variant=="pavilion":
        rect(d,(35,54,40,91),"wood","ink");rect(d,(88,54,93,91),"wood","ink")
        rect(d,(49,54,54,91),"wood","ink");rect(d,(74,54,79,91),"wood","ink")
        rect(d,(54,69,75,91),"soil_dark","ink")
        rect(d,(59,74,70,91),"wood")
    else:
        rect(d,(57,66,73,91),"wood","ink");rect(d,(60,69,70,90),"soil_dark")
        rect(d,(39,58,52,70),"grass_dark","ink");rect(d,(76,58,89,70),"grass_dark","ink")
        for x in range(40,51,4):d.point((x,61),fill=rgb("jade_hi"))
    # curved tile roof using stair-step clusters
    poly(d,[(8,48),(18,43),(32,31),(45,27),(64,29),(83,27),(97,32),(111,43),(122,48),(115,52),(101,49),(91,44),(80,39),(65,37),(48,39),(36,44),(25,50)],"roof","ink")
    poly(d,[(18,44),(34,34),(48,30),(64,32),(81,30),(96,35),(111,45),(101,45),(90,40),(80,36),(64,35),(48,36),(35,40),(25,47)],"roof_hi")
    line(d,[(17,44),(10,47),(5,45)],"gold",2);line(d,[(111,44),(119,47),(124,44)],"gold",2)
    for x in range(25,111,10):
        line(d,[(x,40+(abs(x-65)//13)),(x+3,47+(abs(x-65)//13))],"red")
    for x in (16,111):d.point((x,47),fill=rgb("gold"))


def make_props():
    cols,rows,fw,fh=4,4,128,96
    im=Image.new("RGBA",(cols*fw,rows*fh),(0,0,0,0))
    funcs=[lambda d:prop_tree(d,0),lambda d:prop_bamboo(d),lambda d:prop_rock(d),lambda d:prop_rock(d,True),prop_lantern,
           lambda d:prop_hall(d,"hall"),lambda d:prop_hall(d,"house"),lambda d:prop_hall(d,"gate"),
           lambda d:prop_hall(d,"pavilion"),lambda d:prop_hall(d,"herb"),lambda d:prop_tree(d,1),
           lambda d:prop_tree(d,2),lambda d:prop_lantern,lambda d:prop_rock(d),lambda d:prop_rock(d,True),
           lambda d:prop_hall(d,"house")]
    names=["ancient_tree","bamboo_grove","boulder","spirit_crystal","red_lantern","sect_hall","village_house","qingyun_gate",
           "training_pavilion","herb_hut","spirit_tree","willow_tree","stone_lantern","mossy_rock","jade_spire","teahouse"]
    for idx,func in enumerate(funcs):
        ox,oy=idx%cols*fw,idx//cols*fh
        cell=Image.new("RGBA",(fw,fh),(0,0,0,0));func(ImageDraw.Draw(cell));im.alpha_composite(cell,(ox,oy))
        # framing specks/cut pixels are avoided at the tile edge; object alpha remains clean.
    im.save(PROPS/"world_props.png")
    (PROPS/"world_props.json").write_text(json.dumps({"frames":{name:{"frame":{"x":i%cols*fw,"y":i//cols*fh,"w":fw,"h":fh},"rotated":False,"trimmed":False,"spriteSourceSize":{"x":0,"y":0,"w":fw,"h":fh},"sourceSize":{"w":fw,"h":fh}} for i,name in enumerate(names)},"meta":{"image":"world_props.png","format":"RGBA8888","size":{"w":cols*fw,"h":rows*fh},"scale":"1"}},indent=2),encoding="utf-8")
    return names


def tilemap(terrain_count=128, prop_count=16):
    w,h,ts=72,50,32
    grass=1;dark_grass=2;alt_grass=3; dirt=9; dirt_alt=10;stone=17;court=25;water=33;bank=41;garden=57
    ground=[0]*(w*h); paths=[0]*(w*h); details=[0]*(w*h)
    def set_tile(layer,x,y,gid):
        if 0<=x<w and 0<=y<h:layer[y*w+x]=gid
    def fill(layer,x,y,ww,hh,gid):
        for yy in range(y,y+hh):
            for xx in range(x,x+ww):set_tile(layer,xx,yy,gid)
    for y in range(h):
        for x in range(w):
            # darker, denser forest canopy ground begins beyond the foothills
            roll=(x*13+y*37+x*y)%13
            if x>37:base=4+roll%4
            else:base=grass if roll<8 else (alt_grass if roll<11 else grass+1)
            set_tile(ground,x,y,base)
            if x>39 and (x*13+y*11)%19==0:set_tile(details,x,y,65+(x+y)%12)
    # A clear connected clay road from sect to village; garden walkways branch to yards.
    for x in range(21,61):
        for y in range(23,26):set_tile(paths,x,y,dirt+(x+y)%2)
    for y in range(16,25):
        for x in range(57,60):set_tile(paths,x,y,dirt+(x+y)%2)
    for x in range(11,24):
        for y in range(19,31):set_tile(paths,x,y,court+(x+y)%8)
    for x in range(8,20):
        for y in range(10,19):set_tile(paths,x,y,stone+(x+y)%8)
    for x in range(54,67):
        for y in range(14,29):
            if (x+y)%5==0:set_tile(paths,x,y,stone+(x*3+y)%8)
    # Small pond with organic shore and a crossing bridge.
    for y in range(5,14):
        for x in range(40,49):
            if ((x-44)**2/23 + (y-9)**2/17)<1.28:
                set_tile(ground,x,y,bank+(x+y)%4 if ((x-44)**2/23 + (y-9)**2/17)>0.72 else water+(x+y)%4)
    # training-ground decorative border pillars and practice marks
    for x in range(12,24):
        set_tile(details,x,19,67+(x%4));set_tile(details,x,30,67+(x%4))
    for y in range(20,30):
        set_tile(details,11,y,67+y%4);set_tile(details,24,y,67+y%4)
    # village garden strips
    fill(ground,54,29,12,5,garden)
    for x in range(55,66,3):
        for y in range(30,33):set_tile(details,x,y,64+(x+y)%8)
    # Scattered wild flowers, grasses and tiny pebbles, kept off the walkways/buildings.
    for y in range(2,h-2):
        for x in range(2,w-2):
            if paths[y*w+x] or (x<34 and 7<x<30 and 9<y<32) or (54<x<67 and 14<y<29):continue
            n=(x*17+y*23)%101
            if n<4:set_tile(details,x,y,64+n%16)
    props=[];colliders=[];zones=[];spawns=[];oid=1
    def prop(name,idx,tx,ty,solid=True):
        nonlocal oid
        x,y=tx*ts,ty*ts
        props.append({"id":oid,"name":name,"type":"prop","gid":terrain_count+1+idx,"x":x,"y":y,"width":128,"height":96,"rotation":0,"visible":True,"properties":[{"name":"sprite","type":"string","value":name}]})
        oid+=1
        if solid:
            if name in ("ancient_tree","spirit_tree","willow_tree","bamboo_grove"):
                colliders.append({"id":oid,"name":name+"_trunk","type":"solid","x":x+49,"y":y-22,"width":29,"height":20,"rotation":0,"visible":True});oid+=1
            else:
                colliders.append({"id":oid,"name":name+"_base","type":"solid","x":x+17,"y":y-39,"width":94,"height":31,"rotation":0,"visible":True});oid+=1
    # Sect compound
    prop("sect_hall",5,10,11);prop("qingyun_gate",7,28,27,False);prop("training_pavilion",8,17,18)
    prop("red_lantern",4,9,20,False);prop("red_lantern",4,24,20,False)
    prop("stone_lantern",12,29,25,False)
    # Village and cultivation garden
    prop("village_house",6,53,14);prop("teahouse",15,61,17);prop("herb_hut",9,55,25)
    prop("red_lantern",4,51,24,False);prop("red_lantern",4,66,23,False)
    prop("boulder",2,48,18);prop("spirit_crystal",3,47,34);prop("jade_spire",14,69,38)
    # Forest borders, bamboo pockets, spirit trees and boulders. Keep a walkable road corridor.
    for tx,ty,kind in [(37,8,0),(39,17,10),(39,34,0),(42,40,11),(46,16,1),(47,33,10),(51,7,0),(53,39,0),(58,7,11),(64,7,0),(69,12,10),(70,29,0),(67,42,11),(59,43,0),(53,38,1),(44,29,1),(41,24,0)]:
        nm=names_for_prop(kind)
        prop(nm,kind,tx,ty)
    # extra forest stones and luminous ore
    for tx,ty,idx,nm in [(43,18,2,"boulder"),(45,36,3,"spirit_crystal"),(68,35,14,"jade_spire"),(51,11,2,"mossy_rock"),(63,39,3,"spirit_crystal")]:
        prop(nm,idx,tx,ty)
    zones=[
        {"id":oid,"name":"Thanh Vân Môn","type":"zone","x":4*ts,"y":6*ts,"width":29*ts,"height":30*ts,"rotation":0,"visible":True,"properties":[{"name":"zone","type":"string","value":"sect"}]},
        {"id":oid+1,"name":"Rừng Yêu Thú","type":"zone","x":36*ts,"y":2*ts,"width":34*ts,"height":45*ts,"rotation":0,"visible":True,"properties":[{"name":"zone","type":"string","value":"forest"}]},
        {"id":oid+2,"name":"Thanh Vân Thôn","type":"zone","x":51*ts,"y":12*ts,"width":17*ts,"height":18*ts,"rotation":0,"visible":True,"properties":[{"name":"zone","type":"string","value":"village"}]},
        {"id":oid+3,"name":"Sân Luyện Công","type":"zone","x":11*ts,"y":19*ts,"width":14*ts,"height":12*ts,"rotation":0,"visible":True,"properties":[{"name":"zone","type":"string","value":"training"}]},
    ];oid+=4
    spawns=[
        {"id":oid,"name":"PlayerSpawn","type":"player","x":18*ts,"y":25*ts,"point":True,"visible":True},
        {"id":oid+1,"name":"Chấp sự Lý","type":"npc","x":18*ts+16,"y":24*ts,"point":True,"visible":True,"properties":[{"name":"sprite","type":"string","value":"steward_li"}]},
    ];oid+=2
    for name,x,y,kind in [("Thanh Lang",43,22,"wolf"),("Thanh Lang",49,19,"wolf"),("Thanh Lang",50,31,"wolf"),("Thanh Lang",60,37,"wolf"),("Linh Thỏ",46,30,"rabbit"),("Linh Thỏ",56,37,"rabbit"),("Linh Thỏ",66,32,"rabbit")]:
        spawns.append({"id":oid,"name":name,"type":"enemy","x":x*ts+16,"y":y*ts+16,"point":True,"visible":True,"properties":[{"name":"species","type":"string","value":kind}]});oid+=1
    layers=[]
    def tilelayer(i,name,data):
        layers.append({"id":i,"name":name,"type":"tilelayer","width":w,"height":h,"x":0,"y":0,"opacity":1,"visible":True,"data":data})
    def objlayer(i,name,objects):
        layers.append({"id":i,"name":name,"type":"objectgroup","draworder":"topdown","opacity":1,"visible":True,"objects":objects})
    tilelayer(1,"Ground",ground);tilelayer(2,"Paths",paths);tilelayer(3,"Details",details)
    objlayer(4,"WorldProps",props);objlayer(5,"Collision",colliders);objlayer(6,"Zones",zones);objlayer(7,"Spawns",spawns)
    terrain={"firstgid":1,"name":"ThanhVanTerrain","tilewidth":32,"tileheight":32,"tilecount":terrain_count,"columns":16,"spacing":0,"margin":0,"image":"../public/assets/tilesets/qingyun_terrain.png","imagewidth":512,"imageheight":256,"objectalignment":"bottomleft","tilerendersize":"tile","fillmode":"stretch"}
    props_tileset={"firstgid":terrain_count+1,"name":"ThanhVanProps","tilewidth":128,"tileheight":96,"tilecount":prop_count,"columns":4,"spacing":0,"margin":0,"image":"../public/assets/props/world_props.png","imagewidth":512,"imageheight":384,"objectalignment":"bottomleft","tilerendersize":"tile","fillmode":"stretch","tiles":[{"id":i,"type":names_for_prop(i),"properties":[{"name":"sprite","type":"string","value":names_for_prop(i)}]} for i in range(prop_count)]}
    m={"compressionlevel":-1,"height":h,"width":w,"infinite":False,"nextlayerid":8,"nextobjectid":oid,"orientation":"orthogonal","renderorder":"right-down","tiledversion":"1.12.2","tileheight":ts,"tilesets":[terrain,props_tileset],"tilewidth":ts,"type":"map","version":"1.10","layers":layers}
    (MAPS/"thanh_van_world.tmj").write_text(json.dumps(m,ensure_ascii=False,indent=2),encoding="utf-8")


def names_for_prop(idx):
    return ["ancient_tree","bamboo_grove","boulder","spirit_crystal","red_lantern","sect_hall","village_house","qingyun_gate","training_pavilion","herb_hut","spirit_tree","willow_tree","stone_lantern","mossy_rock","jade_spire","teahouse"][idx]


if __name__ == "__main__":
    make_terrain();make_player();make_npc();make_beast("wolf");make_beast("rabbit");make_props();make_combat_effects();make_cultivation_assets();tilemap()
    print("Generated pixel-art assets and maps/thanh_van_world.tmj")

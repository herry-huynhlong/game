"""Generate GFX.5A identity-stable NPC costume variants and map detail tiles.

The variants are recoloured and hand-pixel-accessor passes over the project's
32x40 sprite sheets. No Pixelorama claim: Pillow creates the runtime PNGs.
Run from any directory with Python 3 and Pillow installed.
"""
from __future__ import annotations

import json
import random
import sys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "art" / "source"))
from characters_gfx1 import PAL, ROWSPEC, FW, FH, COLS, ROWS  # noqa: E402

CHAR = ROOT / "public" / "assets" / "characters"
TERRAIN = ROOT / "public" / "assets" / "tilesets" / "qingyun_terrain.png"
MAP = ROOT / "maps" / "thanh_van_world.tmj"
PREVIEW = ROOT / "art" / "previews" / "gfx5a"

# key, base sprite palette, robe base/shadow/highlight, inner, accent/accent-hi,
# belt, boots, hair/hair-hi, hat style, beard, occupation accessory.
RECIPES = {
    "sect_m": [
        ("sect", (49,111,91),(31,73,66),(131,177,142),(229,225,188),(53,145,126),(142,211,174),(104,76,55),(68,57,48),(24,28,34),(78,73,68),"circlet",False,"sash"),
        ("sect", (72,112,151),(42,68,104),(139,171,197),(235,228,199),(64,132,177),(155,205,222),(95,68,51),(59,53,49),(25,29,37),(79,74,68),"headband",False,"scroll"),
        ("sect", (150,83,70),(93,49,48),(190,122,92),(233,211,176),(174,108,72),(224,167,112),(94,63,48),(61,52,45),(29,27,31),(85,72,65),"knot",False,"sash"),
        ("sect", (107,96,143),(67,62,102),(157,146,190),(233,224,201),(117,112,165),(190,181,215),(86,67,58),(58,51,48),(27,28,36),(83,75,73),"crown",False,"talisman"),
    ],
    "sect_f": [
        ("sect_female", (49,111,91),(31,73,66),(131,177,142),(229,225,188),(53,145,126),(142,211,174),(104,76,55),(68,57,48),(29,27,34),(92,75,68),"ribbon",False,"sash"),
        ("sect_female", (72,112,151),(42,68,104),(139,171,197),(235,228,199),(64,132,177),(155,205,222),(95,68,51),(59,53,49),(33,28,39),(100,77,89),"hairpin",False,"scroll"),
        ("sect_female", (150,83,70),(93,49,48),(190,122,92),(233,211,176),(174,108,72),(224,167,112),(94,63,48),(61,52,45),(43,28,31),(113,73,69),"ribbon",False,"pouch"),
        ("sect_female", (107,96,143),(67,62,102),(157,146,190),(233,224,201),(117,112,165),(190,181,215),(86,67,58),(58,51,48),(34,27,39),(91,74,88),"crown",False,"talisman"),
        ("sect_female", (174,139,79),(119,91,54),(207,177,111),(244,231,195),(161,126,59),(218,190,111),(103,73,47),(66,55,42),(31,28,35),(82,72,62),"hairpin",False,"vial"),
    ],
    "alchemist_m": [
        ("sect",(93,121,91),(57,79,61),(163,185,129),(234,226,195),(135,142,75),(199,197,117),(104,76,55),(68,57,48),(28,29,34),(77,74,65),"cap",False,"vial"),
        ("sect",(102,119,144),(61,77,101),(164,181,197),(234,229,210),(119,143,157),(190,209,211),(95,68,51),(59,53,49),(37,31,30),(89,74,63),"headband",True,"vial"),
        ("sect",(135,93,113),(78,56,77),(182,136,154),(238,222,209),(150,91,134),(212,153,187),(94,63,48),(61,52,45),(37,30,34),(96,77,77),"circlet",False,"pouch"),
        ("sect",(122,105,75),(74,65,48),(175,149,97),(239,227,190),(142,115,58),(201,172,103),(86,67,58),(58,51,48),(44,35,27),(103,83,57),"cap",True,"scroll"),
    ],
    "alchemist_f": [
        ("sect_female",(93,121,91),(57,79,61),(163,185,129),(234,226,195),(135,142,75),(199,197,117),(104,76,55),(68,57,48),(31,31,38),(90,78,64),"hairpin",False,"vial"),
    ],
    "merchant_m": [
        ("merchant",(152,78,50),(93,48,42),(203,139,83),(239,219,177),(169,105,45),(225,171,91),(104,67,44),(72,54,43),(36,29,27),(91,69,51),"hat",False,"pack"),
        ("merchant",(65,113,131),(39,74,94),(126,163,166),(235,222,190),(178,103,52),(224,166,83),(107,69,45),(73,56,45),(39,31,30),(93,72,54),"cap",True,"pack"),
        ("merchant",(121,82,125),(72,53,83),(168,127,163),(237,219,200),(166,89,119),(222,155,151),(97,65,55),(67,54,47),(37,30,37),(89,73,78),"hat",False,"satchel"),
    ],
    "merchant_f": [
        ("sect_female",(152,78,50),(93,48,42),(203,139,83),(239,219,177),(169,105,45),(225,171,91),(104,67,44),(72,54,43),(39,29,32),(97,70,58),"hat",False,"pack"),
        ("sect_female",(65,113,131),(39,74,94),(126,163,166),(235,222,190),(178,103,52),(224,166,83),(107,69,45),(73,56,45),(38,29,37),(91,69,76),"hairpin",False,"satchel"),
    ],
    "smith_m": [
        ("civilian",(139,86,51),(86,56,39),(190,133,80),(220,197,154),(112,78,53),(173,128,77),(96,64,45),(65,52,43),(32,29,26),(87,70,53),"bandana",True,"hammer"),
        ("civilian",(89,102,99),(54,68,67),(147,153,129),(224,211,173),(130,88,54),(189,139,82),(95,64,45),(65,52,43),(32,29,27),(84,70,56),"cap",False,"hammer"),
    ],
    "guard_m": [
        ("guard",(73,111,96),(43,72,66),(129,160,128),(220,211,182),(142,92,50),(202,156,87),(95,65,45),(58,52,44),(29,31,32),(77,73,65),"helmet",False,"armor"),
        ("guard",(79,91,117),(48,59,82),(139,147,168),(223,213,189),(151,87,60),(207,148,88),(91,62,48),(58,52,44),(29,30,34),(77,70,69),"helmet",True,"armor"),
    ],
    "guard_f": [
        ("sect_female",(73,111,96),(43,72,66),(129,160,128),(220,211,182),(142,92,50),(202,156,87),(95,65,45),(58,52,44),(33,29,35),(83,70,66),"helmet",False,"armor"),
    ],
    "smith_f": [
        ("sect_female",(139,86,51),(86,56,39),(190,133,80),(220,197,154),(112,78,53),(173,128,77),(96,64,45),(65,52,43),(42,28,30),(100,69,57),"bandana",False,"hammer"),
    ],
    "civilian_m": [
        ("civilian",(142,103,70),(88,66,48),(180,143,99),(222,207,171),(78,119,110),(136,171,150),(94,64,45),(65,52,43),(36,31,27),(91,72,53),"knot",False,"pouch"),
        ("civilian",(118,82,96),(70,52,67),(161,121,124),(226,205,174),(138,76,72),(197,137,108),(94,64,45),(65,52,43),(45,31,25),(108,75,52),"cap",True,"satchel"),
    ],
    "civilian_f": [
        ("sect_female",(142,103,70),(88,66,48),(180,143,99),(222,207,171),(78,119,110),(136,171,150),(94,64,45),(65,52,43),(39,29,30),(99,69,58),"ribbon",False,"pouch"),
    ],
    "farmer_m": [
        ("civilian",(89,125,74),(54,81,51),(147,170,99),(226,207,161),(139,101,55),(195,153,78),(94,64,45),(65,52,43),(44,34,26),(102,79,50),"straw",False,"basket"),
        ("civilian",(151,110,62),(94,72,42),(194,151,89),(234,216,171),(102,118,72),(162,165,99),(94,64,45),(65,52,43),(42,34,29),(104,83,56),"straw",True,"basket"),
    ],
    "elder_m": [
        ("sect",(83,106,91),(50,68,61),(150,166,127),(236,224,191),(146,119,67),(205,177,105),(112,78,51),(73,59,49),(166,170,161),(213,211,194),"elder",True,"scroll"),
        ("sect",(112,83,117),(68,52,79),(173,131,166),(238,221,204),(176,123,78),(217,175,113),(104,69,51),(70,56,49),(190,184,173),(225,219,201),"elder",True,"vial"),
    ],
    "elder_f": [
        ("sect_female",(83,106,91),(50,68,61),(150,166,127),(236,224,191),(146,119,67),(205,177,105),(112,78,51),(73,59,49),(166,170,161),(213,211,194),"elder",False,"talisman"),
    ],
    "rogue_m": [
        ("blackwind",(56,51,65),(32,31,43),(104,97,119),(132,109,112),(131,49,61),(191,85,81),(74,50,46),(51,45,47),(21,22,30),(62,51,57),"hood",False,"sash"),
        ("blackwind",(68,72,83),(39,43,56),(127,132,144),(157,146,130),(121,74,72),(189,118,93),(76,51,46),(52,44,43),(23,23,32),(63,54,60),"headband",True,"talisman"),
        ("blackwind",(86,57,69),(49,35,47),(146,96,106),(178,144,128),(139,43,58),(205,93,85),(75,45,43),(46,39,43),(22,21,28),(61,49,54),"hood",True,"satchel"),
        ("blackwind",(68,77,75),(38,48,49),(125,143,126),(169,163,140),(116,85,54),(176,137,76),(77,45,43),(46,39,43),(25,23,28),(68,55,53),"cap",False,"sash"),
    ],
}


def outfit_spec(group: str, index: int):
    return RECIPES[group][index % len(RECIPES[group])]


def draw_accessories(cell: Image.Image, hat: str, beard: bool, accessory: str, direction: str):
    d = ImageDraw.Draw(cell)
    ink, gold, pale = (29, 32, 32, 255), (205, 168, 84, 255), (232, 216, 174, 255)
    if hat == "hat":
        d.rectangle((8, 6, 23, 7), fill=ink); d.rectangle((11, 2, 20, 6), fill=(95, 63, 45, 255)); d.line((12, 3, 19, 3), fill=(173, 124, 73, 255))
    elif hat == "straw":
        d.rectangle((7, 6, 24, 7), fill=(82, 68, 42, 255)); d.rectangle((10, 3, 21, 5), fill=(180, 144, 76, 255)); d.point((12, 4), fill=(223, 193, 112, 255))
    elif hat == "helmet":
        d.rectangle((10, 4, 21, 7), fill=ink); d.rectangle((12, 1, 19, 5), fill=(100, 119, 107, 255)); d.line((13, 2, 18, 2), fill=(190, 178, 134, 255)); d.point((16, 0), fill=gold)
    elif hat == "cap":
        d.rectangle((11, 2, 20, 6), fill=ink); d.rectangle((12, 2, 19, 4), fill=(100, 73, 53, 255)); d.line((9, 6, 22, 6), fill=(170, 133, 77, 255))
    elif hat == "bandana":
        d.rectangle((10, 5, 21, 7), fill=(125, 59, 52, 255)); d.point((20, 8), fill=(176, 87, 67, 255))
    elif hat == "headband":
        d.line((10, 5, 21, 5), fill=(177, 66, 61, 255)); d.point((20, 6), fill=(216, 162, 92, 255))
    elif hat == "hood":
        d.polygon([(9,8),(9,4),(12,1),(15,0),(20,1),(23,5),(22,9),(20,7),(19,4),(13,4),(11,8)], fill=(37,39,48,255)); d.point((12,5), fill=(70,69,78,255))
    elif hat == "crown":
        d.rectangle((11, 4, 21, 6), fill=(129, 94, 46, 255)); d.polygon([(11,5),(12,1),(14,4),(16,0),(18,4),(20,1),(21,5)], fill=gold); d.point((16,3), fill=pale)
    elif hat == "elder":
        d.rectangle((11, 4, 21, 6), fill=(91,79,62,255)); d.line((12,4,19,4),fill=(203,191,157,255));d.point((16,3),fill=gold)
    elif hat in ("circlet", "hairpin"):
        d.line((11, 5, 20, 5), fill=gold); d.point((16, 4), fill=pale)
        if hat == "hairpin": d.line((20, 3, 23, 0), fill=gold)
    elif hat == "ribbon":
        d.rectangle((11, 5, 20, 6), fill=(155, 69, 80, 255)); d.polygon([(20,6),(24,7),(22,10)], fill=(175, 83, 93, 255))
    elif hat == "knot":
        d.rectangle((14, 0, 18, 5), fill=ink); d.point((16, 1), fill=(173, 124, 73, 255))
    if beard and direction in ("down", "left", "right"):
        beard_color=(204,199,183,255) if hat=="elder" else (49,39,34,255)
        if direction == "down": d.polygon([(13,16),(18,16),(18,19),(16,22),(14,20)], fill=beard_color)
        else: d.polygon([(15,16),(19,17),(18,21),(16,20)], fill=beard_color)
        if hat=="elder" and direction=="down": d.point((12,15),fill=beard_color);d.point((19,15),fill=beard_color)
    if accessory in ("pack", "basket") and direction in ("up", "left", "right"):
        color = (112, 74, 47, 255) if accessory == "pack" else (137, 106, 57, 255)
        d.rectangle((22, 20, 28, 29), fill=color, outline=ink); d.line((23,22,27,22), fill=(205, 166, 95, 255))
    elif accessory in ("pouch", "satchel", "vial", "talisman", "scroll"):
        col = (134,82,48,255) if accessory in ("pouch","satchel") else (66,143,144,255) if accessory=="vial" else (215,178,92,255)
        x = 22 if direction != "left" else 4
        d.rectangle((x, 27, x+4, 32), fill=col, outline=ink)
        if accessory == "talisman": d.line((x+2,28,x+2,31), fill=pale)
    elif accessory == "hammer":
        x = 24 if direction != "left" else 3
        d.line((x+1,26,x+1,34), fill=(113,76,48,255), width=2); d.rectangle((x-1,25,x+3,28), fill=(153,159,149,255), outline=ink)
    elif accessory == "armor":
        x = 22 if direction != "left" else 5
        d.rectangle((x,19,x+4,23), fill=(113,128,112,255), outline=ink); d.point((x+2,20), fill=gold)
    elif accessory == "basket":
        d.rectangle((23,25,28,31), fill=(146,112,58,255), outline=ink); d.line((24,27,27,27), fill=(202,172,106,255))
    elif accessory == "sash":
        d.line((10,27,21,29), fill=gold); d.point((20,29), fill=pale)


def build_characters():
    manifest = {}
    preview_items = []
    groups = {}
    for group, recipes in RECIPES.items():
        for index, recipe in enumerate(recipes):
            base_key, robe, shade, highlight, inner, accent, accent_hi, belt, boots, hair, hair_hi, hat, beard, accessory = recipe
            source_file = "sect_cultivator" if base_key == "sect" else base_key
            src = Image.open(CHAR / f"{source_file}.png").convert("RGBA")
            base_palette = PAL[base_key]
            old = {
                "hair": base_palette[1], "hair_hi": base_palette[2], "robe": base_palette[5],
                "light": base_palette[6], "shadow": base_palette[7], "inner": base_palette[8],
                "accent": base_palette[9], "accent_hi": base_palette[10], "belt": base_palette[11],
                "boots": base_palette[12],
            }
            new = {"hair":hair,"hair_hi":hair_hi,"robe":robe,"light":highlight,"shadow":shade,"inner":inner,"accent":accent,"accent_hi":accent_hi,"belt":belt,"boots":boots}
            recolor = {old[k]: (*v, 255) for k,v in new.items()}
            sheet = Image.new("RGBA", src.size, (0,0,0,0))
            for y in range(0, src.height, FH):
                row = y // FH
                state, direction, _ = ROWSPEC[row]
                for x in range(0, src.width, FW):
                    frame = src.crop((x,y,x+FW,y+FH))
                    pix = frame.load()
                    for py in range(FH):
                        for px in range(FW):
                            r,g,b,a = pix[px,py]
                            if a and a < 255: pix[px,py]=(0,0,0,0)
                            elif a: pix[px,py]=recolor.get((r,g,b,255),(r,g,b,255))
                    draw_accessories(frame,hat,beard,accessory,direction)
                    sheet.alpha_composite(frame,(x,y))
            texture = f"npc-{group}-{index+1:02d}"
            sheet.save(CHAR / f"{texture}.png", optimize=True)
            manifest.setdefault(group,[]).append(texture)
            preview_items.append((texture,sheet.crop((0,0,FW,FH))))
    # A hand-readable index is also the runtime texture registry.
    (CHAR / "npc_styles.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    cols=5; preview=Image.new("RGBA",(cols*FW,((len(preview_items)+cols-1)//cols)*FH),(34,48,40,255)); d=ImageDraw.Draw(preview)
    for i,(name,frame) in enumerate(preview_items):
        x=(i%cols)*FW;y=(i//cols)*FH;preview.alpha_composite(frame,(x,y));d.text((x+1,y+1),str(i+1),fill=(255,232,170,255),stroke_width=1,stroke_fill=(20,26,22,255))
    PREVIEW.mkdir(parents=True,exist_ok=True);preview.resize((preview.width*4,preview.height*4),Image.Resampling.NEAREST).save(PREVIEW/"npc-variants.png")
    return manifest


def draw_detail_tile(draw: ImageDraw.ImageDraw, tile_id: int):
    seed=tile_id*7919;rng=random.Random(seed)
    if tile_id<=88: # clipped grass and fern tufts
        count=3+(tile_id%3)
        for i in range(count):
            x=rng.randrange(4,29);y=rng.randrange(10,29);c=[(83,135,82,255),(108,151,91,255),(57,103,68,255)][(tile_id+i)%3]
            draw.line((x,y+3,x,y),fill=c);draw.line((x,y+1,x-2,y-1),fill=c);draw.line((x,y+1,x+2,y-2),fill=c)
    elif tile_id<=96: # wild flowers, warm but restrained
        colors=[(232,201,131,255),(221,180,191,255),(188,218,194,255),(224,225,182,255)]
        for i in range(2+(tile_id%2)):
            x=rng.randrange(5,28);y=rng.randrange(13,29);draw.line((x,y+3,x,y),fill=(66,112,70,255));draw.point((x,y-1),fill=colors[(tile_id+i)%len(colors)]);draw.point((x-1,y),fill=colors[(tile_id+i+1)%len(colors)])
    elif tile_id<=104: # compact leafy clusters with a narrow contact shade, never an oval blob
        for i in range(4):
            x=5+i*5;y=18+(i%2)*3;c=(65+(i%2)*16,119+(i%2)*14,74+(i%2)*8,255);draw.rectangle((x,y,x+3,y+3),fill=c);draw.point((x+1,y),fill=(136,169,103,255))
        draw.line((10,25,21,25),fill=(44,76,52,120))
    elif tile_id<=112: # small slate and ochre pebble pairs
        cols=[(127,137,121,255),(160,153,126,255),(91,112,102,255)]
        for i in range(4):
            x=rng.randrange(4,29);y=rng.randrange(12,29);draw.point((x,y),fill=cols[i%3]);draw.line((x,y+1,x+2,y+1),fill=cols[i%3])
    elif tile_id<=120: # scattered leaves and fallen petals
        colors=[(97,137,79,255),(157,170,107,255),(190,147,91,255),(178,118,105,255)]
        for i in range(5):
            x=rng.randrange(3,29);y=rng.randrange(8,29);draw.line((x,y,x+2,y-1),fill=colors[(tile_id+i)%4])
    else: # narrow gravel transition fringe at the edge toward a paved cell
        edge=(tile_id-121)%4
        for i in range(12):
            pos=2+i*2
            if edge==0:x,y=pos,1
            elif edge==1:x,y=30,pos
            elif edge==2:x,y=pos,30
            else:x,y=1,pos
            col=(133,143,130,255) if i%3 else (174,176,154,255)
            draw.point((x,y),fill=col);draw.point((x+1,y),fill=(94,111,101,255))


def rebuild_terrain_and_map():
    image=Image.open(TERRAIN).convert("RGBA");draw=ImageDraw.Draw(image)
    for tile_id in range(81,129):
        idx=tile_id-1;x=(idx%16)*32;y=(idx//16)*32
        image.paste((0,0,0,0),(x,y,x+32,y+32));draw_detail_tile(draw,tile_id)
    image.save(TERRAIN)
    m=json.loads(MAP.read_text(encoding="utf-8"));layers={l["name"]:l for l in m["layers"]};ground=layers["Ground"]["data"];paths=layers["Paths"]["data"];details=layers["Details"]["data"]
    collisions=[(o.get("x",0)-18,o.get("y",0)-18,o.get("x",0)+o.get("width",0)+18,o.get("y",0)+o.get("height",0)+18) for o in layers["Collision"]["objects"]]
    rng=random.Random(5025);added=0;edges=0
    # Remove prior generated details before rebuilding so this script is
    # idempotent and the ground does not become densely patterned.
    for i,tile in enumerate(details):
        if 81<=tile<=128:details[i]=0
    for ty in range(m["height"]):
        for tx in range(m["width"]):
            i=ty*m["width"]+tx
            if ground[i] not in range(1,9) or paths[i] or details[i]:continue
            cx,cy=tx*32+16,ty*32+16
            if any(x0<=cx<=x1 and y0<=cy<=y1 for x0,y0,x1,y1 in collisions):continue
            neighbors=[]
            if ty>0 and paths[i-m["width"]]:neighbors.append(0)
            if tx<m["width"]-1 and paths[i+1]:neighbors.append(1)
            if ty<m["height"]-1 and paths[i+m["width"]]:neighbors.append(2)
            if tx>0 and paths[i-1]:neighbors.append(3)
            # Region-aware density: wild ground is richer; town lawns stay open.
            if 1152<=cx<2240 and cy<1504: chance=.080
            elif 128<=cx<1056 and 192<=cy<1152: chance=.045
            elif 2304<=cx<3712 and 64<=cy<1536: chance=.018
            else: chance=.035
            if rng.random()<chance:
                if 1152<=cx<2240 and cy<1504: detail=rng.choice([81,82,83,89,90,97,98,105,106,113,114])
                elif 2304<=cx<3712 and 64<=cy<1536: detail=rng.choice([81,82,85,89,90,93,97,105,113])
                else: detail=rng.choice(list(range(81,121)))
                details[i]=detail;added+=1
    MAP.write_text(json.dumps(m,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"GFX.5A terrain: appended detail tiles 81–128; placed {added} non-colliding details and {edges} soft path-edge accents; collision layer unchanged.")


def build_shadows():
    effects=ROOT/"public"/"assets"/"effects";effects.mkdir(parents=True,exist_ok=True)
    # Tiny crisp contact shade for actors (no blur, two transparency values).
    im=Image.new("RGBA",(16,6),(0,0,0,0));d=ImageDraw.Draw(im)
    d.rectangle((3,2,12,3),fill=(25,42,34,82));d.rectangle((5,1,10,4),fill=(25,42,34,118));d.point((2,2),fill=(25,42,34,45));d.point((13,3),fill=(25,42,34,45));im.save(effects/"contact_shadow.png",optimize=True)
    # Keep these masks pixel-stepped and lightly tinted, cast to lower-right.
    broad=Image.new("RGBA",(72,24),(0,0,0,0));d=ImageDraw.Draw(broad);d.polygon([(1,8),(15,4),(31,5),(43,8),(57,9),(70,14),(65,18),(49,17),(35,14),(18,15),(4,12)],fill=(23,39,34,72));broad.save(effects/"shadow_tree_broad.png",optimize=True)
    tall=Image.new("RGBA",(42,22),(0,0,0,0));d=ImageDraw.Draw(tall);d.polygon([(2,8),(12,3),(24,5),(39,11),(35,16),(23,13),(11,14),(3,11)],fill=(23,39,34,70));tall.save(effects/"shadow_tree_tall.png",optimize=True)
    building=Image.new("RGBA",(160,28),(0,0,0,0));d=ImageDraw.Draw(building);d.polygon([(2,3),(126,3),(158,16),(151,22),(122,12),(10,12)],fill=(24,39,37,64));building.save(effects/"shadow_building.png",optimize=True)


if __name__=="__main__":
    manifest=build_characters();rebuild_terrain_and_map();build_shadows()
    print(f"GFX.5A generated {sum(map(len,manifest.values()))} reusable NPC costume sheets from current project sprites; see public/assets/characters/npc_styles.json and art/previews/gfx5a/npc-variants.png.")

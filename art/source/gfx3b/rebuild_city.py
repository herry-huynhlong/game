"""Hand-painted GFX.3B city atlas and terrain patch, kept at native pixel scale."""
from __future__ import annotations

import json
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[3]
ASSETS = ROOT / 'public' / 'assets'
MAP_PATH = ROOT / 'maps' / 'thanh_van_world.tmj'
OUT = ROOT / 'art' / 'previews'
OUT.mkdir(parents=True, exist_ok=True)
PROPS = ASSETS / 'props'
PALETTE = {
    'ink': '#202b2a', 'ink2': '#30413b', 'shade': '#283d38', 'shadow': '#263c32',
    'grass0': '#416947', 'grass1': '#4c7750', 'grass2': '#5a8555', 'grassHi': '#78a568',
    'moss': '#688558', 'soil': '#776b4c', 'soilHi': '#a18b60', 'stoneD': '#535e55',
    'stone': '#788073', 'stoneM': '#929486', 'stoneHi': '#b1a994', 'limestone': '#b6b69f',
    'plaster': '#c2b38b', 'plasterHi': '#dfd2ad', 'woodD': '#513b2d', 'wood': '#805638',
    'woodHi': '#b27c4c', 'roofD': '#163238', 'roof': '#1e4a4b', 'roofM': '#2b6663',
    'roofHi': '#548779', 'gold': '#d8b66c', 'red': '#9a4938', 'redHi': '#c36a4b',
    'jade': '#66b7a2', 'water': '#347e84', 'waterHi': '#69aaa0', 'window': '#f0ca72',
    'cream': '#efe0b9', 'leaf': '#28634a', 'leafM': '#438052', 'leafHi': '#75a965',
    'leafLit': '#9abc6b',
}


def poly(d, points, color, outline=None):
    d.polygon(points, fill=color, outline=outline)


def box(d, xy, color, outline=None):
    d.rectangle(xy, fill=color, outline=outline)


def line(d, points, color, width=1):
    d.line(points, fill=color, width=width)


def shadow(canvas, bounds, alpha=145):
    layer = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).ellipse(bounds, fill=(19, 36, 29, alpha))
    canvas.alpha_composite(layer)


def roof(d, x0, y0, x1, y1, *, color=None, tiers=1, trim=None):
    c = color or PALETTE['roof']
    trim = trim or PALETTE['woodHi']
    w = x1 - x0
    # Deep black fascia and turned-up eaves form one clear roof silhouette.
    poly(d, [(x0+8,y0+16),(x0+24,y0+3),(x1-24,y0+3),(x1-8,y0+16),(x1,y0+26),
             (x1-11,y0+28),(x1-19,y0+36),(x0+19,y0+36),(x0+11,y0+28),(x0,y0+26)], PALETTE['ink'])
    poly(d, [(x0+13,y0+16),(x0+27,y0+8),(x1-27,y0+8),(x1-13,y0+16),
             (x1-20,y0+27),(x0+20,y0+27)], c)
    # Lapped tile courses with alternating joints, highlights, and dark undersides.
    for row, y in enumerate(range(y0+15, y0+28, 4)):
        offset = 8 if row % 2 else 0
        line(d, [(x0+22,y),(x1-22,y)], PALETTE['roofM'] if row % 2 == 0 else PALETTE['roofD'])
        for x in range(x0+26+offset, x1-25, 12):
            line(d, [(x,y+1),(x+3,y+3)], PALETTE['roofHi'] if (x+row)%3 else PALETTE['roofM'])
    line(d, [(x0+17,y0+29),(x1-17,y0+29)], trim, 2)
    line(d, [(x0+11,y0+25),(x0+23,y0+22)], PALETTE['roofHi'], 2)
    line(d, [(x1-23,y0+22),(x1-11,y0+25)], PALETTE['roofHi'], 2)
    # Raised rear roof tier gives halls and gates a distinct silhouette.
    if tiers > 1:
        mid=(x0+x1)//2
        poly(d, [(mid-34,y0-2),(mid-25,y0-13),(mid+25,y0-13),(mid+34,y0-2),
                 (mid+30,y0+4),(mid-30,y0+4)], PALETTE['ink'])
        poly(d, [(mid-26,y0-3),(mid-20,y0-9),(mid+20,y0-9),(mid+26,y0-3)], PALETTE['roofM'])
        for xx in range(mid-18,mid+17,7): line(d,[(xx,y0-7),(xx+3,y0-4)],PALETTE['roofHi'])
        line(d,[(mid-31,y0+3),(mid+31,y0+3)],trim,2)


def sign(d, x, y, width=37, textmark=0):
    box(d,(x-3,y-3,x+width+3,y+14),PALETTE['ink'])
    box(d,(x,y,x+width,y+10),PALETTE['red'] if textmark in (0,3,5) else PALETTE['woodD'],PALETTE['gold'])
    # Small carved sign glyphs, drawn as pixels so the art has no font dependency.
    cx=x+width//2
    line(d,[(cx,y+2),(cx,y+8)],PALETTE['gold'],1)
    line(d,[(cx-5,y+4),(cx+5,y+4)],PALETTE['gold'],1)
    if textmark%2: line(d,[(cx-4,y+7),(cx+4,y+2)],PALETTE['cream'],1)


def lantern(d, x, y, scale=1):
    line(d,[(x,y),(x,y+4*scale)],PALETTE['woodD'],1)
    poly(d,[(x-3*scale,y+4*scale),(x+3*scale,y+4*scale),(x+2*scale,y+10*scale),(x-2*scale,y+10*scale)],PALETTE['red'],PALETTE['ink'])
    box(d,(x-2*scale,y+5*scale,x+2*scale,y+8*scale),PALETTE['window'])
    line(d,[(x-4*scale,y+4*scale),(x+4*scale,y+4*scale)],PALETTE['gold'])
    line(d,[(x,y+10*scale),(x,y+12*scale)],PALETTE['gold'])


def house(kind: str) -> Image.Image:
    im=Image.new('RGBA',(192,192),(0,0,0,0)); d=ImageDraw.Draw(im); p=PALETTE
    if kind=='city_wall':
        shadow(im,(8,136,184,174),160)
        # Horizontal curtain wall segment: parapet, broad dressed face, foot and joints.
        box(d,(8,71,184,151),p['ink'])
        poly(d,[(13,62),(179,62),(184,74),(8,74)],p['limestone'],p['ink'])
        box(d,(15,74,177,116),p['stone'])
        for x in range(18,180,25):
            box(d,(x,56,x+16,74),p['limestone'],p['ink']); line(d,[(x+2,59),(x+13,59)],p['cream'])
        # Varied hand-cut ashlar courses, with staggered seams and selective moss.
        for row,y in enumerate((79,91,103,115,127,139)):
            x0=14-(10 if row%2 else 0)
            for x in range(x0,182,23):
                bx=max(11,x); ex=min(180,x+21)
                tone=(p['stoneM'],p['stone'],p['stoneHi'],p['stone'])[((x//7+row*3)%4)]
                line(d,[(bx,y),(ex,y)],tone,1)
                if (x//23+row*5)%9==2: line(d,[(bx+2,y+2),(bx+7,y+2)],p['moss'],1)
        box(d,(8,146,184,161),p['stoneD'],p['ink'])
        line(d,[(12,148),(180,148)],p['stoneHi'],2)
        for x in (23,71,119,167): box(d,(x,153,x+5,158),p['stone'])
        return im
    if kind=='city_gate':
        shadow(im,(9,146,183,182),175)
        # Massive gatehouse, recognizable at gameplay scale; the open passage remains clear.
        box(d,(18,68,174,151),p['ink'])
        poly(d,[(25,57),(167,57),(181,73),(176,100),(16,100),(11,73)],p['stone'],p['ink'])
        box(d,(25,95,57,151),p['stoneM'],p['ink']); box(d,(135,95,167,151),p['stoneM'],p['ink'])
        for x in (29,143):
            line(d,[(x,103),(x+20,103)],p['limestone'],2)
            for yy in range(109,148,12): line(d,[(x,yy),(x+17,yy)],p['stoneHi'])
        box(d,(61,100,131,155),p['ink'])
        poly(d,[(67,109),(125,109),(125,151),(67,151)],p['woodD'],p['gold'])
        box(d,(76,119,116,154),p['shade']); box(d,(81,121,111,154),p['ink'])
        line(d,[(74,111),(118,111)],p['woodHi'],2)
        # Two-storey glazed roof with ridge end caps and gold plaque.
        roof(d,4,52,188,91,tiers=2,trim=p['gold'])
        roof(d,25,23,167,57,color=p['roofM'],trim=p['gold'])
        sign(d,76,73,40,1)
        for x in (34,158): lantern(d,x,90,2)
        for x in (10,176):
            poly(d,[(x,78),(x+7,80),(x+7,111),(x,108)],p['red'],p['ink'])
            line(d,[(x+2,83),(x+5,84)],p['gold'])
        # Broad stair apron leads from the gate into the city road.
        poly(d,[(64,151),(128,151),(150,181),(43,181)],p['stoneD'],p['ink'])
        for yy in (158,166,174): line(d,[(54+(yy-158),yy),(138-(yy-158),yy)],p['stoneHi'],2)
        return im
    if kind=='jade_fountain':
        shadow(im,(16,142,177,179),170)
        poly(d,[(96,68),(158,93),(170,126),(148,153),(45,153),(22,126),(34,93)],p['ink'])
        poly(d,[(96,73),(151,96),(160,124),(143,143),(49,143),(32,124),(41,96)],p['stone'],p['limestone'])
        for y in (101,114,127): line(d,[(40+(y-101)//2,y),(152-(y-101)//2,y)],p['stoneHi'],2)
        poly(d,[(49,101),(96,82),(143,101),(137,122),(96,136),(55,122)],p['water'],p['ink'])
        line(d,[(57,108),(81,101)],p['waterHi'],2);line(d,[(108,119),(130,111)],p['jade'],2)
        poly(d,[(80,102),(91,72),(96,35),(104,72),(117,101)],p['jade'],p['cream'])
        poly(d,[(93,91),(97,51),(102,91)],'#d9fff0',p['jade'])
        for x,y in ((46,92),(148,90),(38,132),(154,133)): d.point((x,y),fill=p['gold'])
        return im
    if kind=='market_stall':
        shadow(im,(20,148,172,176),140)
        box(d,(30,88,162,151),p['woodD'],p['ink']);box(d,(36,96,156,139),p['wood'],p['ink'])
        for x in (39,150): box(d,(x,73,x+7,151),p['woodHi'],p['ink'])
        # striped cloth canopy with a scalloped valance, baskets, jars, and wares.
        poly(d,[(17,51),(175,51),(166,90),(26,90)],p['ink'])
        poly(d,[(21,54),(171,54),(162,83),(30,83)],p['cream'])
        for i,x in enumerate(range(24,169,20)):
            c=(p['jade'],p['redHi'],p['cream'],p['roofM'])[i%4]
            poly(d,[(x,54),(x+11,54),(x+18,83),(x+7,83)],c)
            poly(d,[(x+7,82),(x+17,82),(x+17,88),(x+12,92),(x+7,88)],c,p['ink'])
        box(d,(27,111,165,121),p['woodHi'],p['ink'])
        for x,c in ((42,p['redHi']),(72,p['window']),(104,p['jade']),(136,p['soilHi'])):
            box(d,(x,101,x+18,112),c,p['ink']);box(d,(x+3,98,x+14,102),p['cream'])
        for x in (50,128):
            d.ellipse((x,124,x+16,143),fill=p['red'],outline=p['ink']);line(d,[(x+3,134),(x+13,134)],p['gold'])
        line(d,[(25,149),(168,149)],p['gold'],2)
        return im
    if kind in ('city_tree','ancient_tree','pine_tree'):
        shadow(im,(26,147,166,177),155)
        if kind=='pine_tree':
            box(d,(88,95,103,158),p['woodD'],p['ink']);line(d,[(91,105),(99,105)],p['woodHi'])
            for i,(top,base,w) in enumerate(((35,75,50),(57,104,66),(82,134,82))):
                poly(d,[(96,top),(96-w//2,base),(96+w//2,base)],(p['leaf'],p['leafM'],p['leaf'])[i],p['ink'])
                poly(d,[(96,top+6),(96-w//3,base-5),(96+2,base-5)],p['leafHi'])
                line(d,[(96-w//2+5,base-4),(96+w//2-4,base-4)],p['leaf'])
        else:
            box(d,(82,98,108,160),p['woodD'],p['ink'])
            poly(d,[(91,150),(91,102),(76,89),(79,85),(96,101),(109,86),(113,90),(102,105),(104,151)],p['wood'],p['ink'])
            if kind=='ancient_tree':
                line(d,[(96,126),(86,113),(82,105)],p['woodHi'],3);line(d,[(98,121),(110,110),(117,103)],p['woodHi'],3)
            clusters=[(58,76,47),(89,60,52),(124,77,42),(66,103,42),(109,103,48),(143,98,30)]
            for i,(cx,cy,r) in enumerate(clusters):
                color=(p['leafM'],p['leaf'],p['leafHi'],p['leafM'],p['leafLit'])[i%5]
                d.ellipse((cx-r//2,cy-r//3,cx+r//2,cy+r//3),fill=color,outline=p['ink'])
                d.ellipse((cx-r//2+5,cy-r//3+3,cx+2,cy+2),fill=p['leafHi'] if i%2 else p['leafLit'])
                for j in range(4):
                    xx=cx-r//3+(i*11+j*13)%(r//2+1); yy=cy-4+(j*7+i*5)%14
                    d.point((xx,yy),fill=p['leafLit'] if j%2 else p['leaf'])
            if kind=='ancient_tree':
                for x,y in ((52,80),(133,67),(99,48)): d.point((x,y),fill=p['window'])
        return im
    if kind in ('shrub_cluster','flower_patch','stone_lamp','market_cart','boulder','lantern_post'):
        shadow(im,(35,146,158,176),130)
        if kind=='shrub_cluster':
            for x,y,r,c in ((52,129,35,p['leaf']),(83,117,49,p['leafM']),(122,130,41,p['leaf']),(147,138,25,p['leafHi'])):
                d.ellipse((x-r//2,y-r//3,x+r//2,y+r//3),fill=c,outline=p['ink']);d.ellipse((x-r//2+5,y-r//3+3,x+3,y+2),fill=p['leafHi'])
        elif kind=='flower_patch':
            for x,y,c in ((52,141,p['window']),(80,125,p['redHi']),(109,145,p['cream']),(139,133,p['jade'])):
                line(d,[(x,y+13),(x+1,y+2)],p['leaf']);d.ellipse((x-5,y-3,x+7,y+6),fill=c,outline=p['leaf']);d.point((x+1,y+1),fill=p['window'])
        elif kind=='stone_lamp':
            box(d,(82,121,111,158),p['stone'],p['ink']);box(d,(77,116,116,126),p['limestone'],p['ink']);box(d,(86,85,107,117),p['woodD'],p['ink']);box(d,(89,89,104,111),p['window'],p['gold']);roof(d,74,69,119,94,color=p['roof'],trim=p['stoneHi']);box(d,(92,157,102,164),p['stoneD'])
        elif kind=='lantern_post':
            box(d,(92,85,100,162),p['woodD'],p['ink']);box(d,(88,157,105,166),p['stoneD'],p['ink']);lantern(d,96,67,3)
        elif kind=='market_cart':
            box(d,(34,112,150,139),p['wood'],p['ink']);box(d,(40,105,145,112),p['woodHi'],p['ink']);
            for x in (53,126): d.ellipse((x,136,x+25,160),fill=p['woodD'],outline=p['gold']);d.ellipse((x+8,144,x+17,153),fill=p['stone'])
            poly(d,[(47,106),(52,71),(136,71),(144,106)],p['cream'],p['ink']);
            for x in (58,81,104,127): line(d,[(x,73),(x-3,104)],p['red'],5)
            for x,c in ((60,p['redHi']),(84,p['window']),(110,p['jade'])): box(d,(x,113,x+17,126),c,p['ink'])
        else:
            poly(d,[(32,145),(47,110),(72,102),(93,80),(119,100),(151,108),(165,143)],p['stone'],p['ink'])
            poly(d,[(58,118),(76,104),(95,102),(81,120)],p['stoneHi']);line(d,[(111,109),(122,115),(117,124)],p['stoneD'],2)
        return im
    # Every shop has separate trim and props instead of relying on one recoloured house.
    shadow(im,(13,148,180,177),150)
    box(d,(26,83,166,151),p['ink'])
    poly(d,[(35,82),(157,82),(157,143),(35,143)],p['plaster'],p['ink'])
    box(d,(42,91,150,139),p['plasterHi'])
    # Stone footing and a two-step stair.
    box(d,(22,140,170,157),p['stoneD'],p['ink']);line(d,[(28,143),(164,143)],p['stoneHi'],2)
    poly(d,[(68,151),(125,151),(135,169),(58,169)],p['stone'],p['ink']);line(d,[(62,160),(131,160)],p['stoneHi'],2)
    # Exposed timber frame and corner braces.
    for x in (38,67,124,153): box(d,(x,80,x+7,145),p['wood'],p['ink'])
    box(d,(39,132,153,139),p['woodHi'],p['ink'])
    # Recessed double wood door with brass latch and stone threshold.
    box(d,(79,105,114,145),p['woodD'],p['ink']);box(d,(84,109,109,145),p['wood'],p['gold'])
    line(d,[(96,110),(96,142)],p['woodD']);line(d,[(84,123),(109,123)],p['woodHi'])
    d.ellipse((104,126,107,130),fill=p['gold']);box(d,(75,145,118,151),p['limestone'])
    # Lattice windows and shutters.
    for x in (49,125):
        box(d,(x,102,x+20,125),p['woodD'],p['ink']);box(d,(x+3,105,x+17,122),p['window'],p['gold'])
        line(d,[(x+10,105),(x+10,122)],p['wood'],2);line(d,[(x+3,113),(x+17,113)],p['wood'],2)
    roof_color={'food_hall':p['red'],'forge':p['red'],'residential_house':p['roofD'],'inn':p['roof'],'barracks':p['roofM'],'apothecary':p['roofM'],'city_hall':p['roofD']}.get(kind,p['roof'])
    roof_mid={'food_hall':p['redHi'],'forge':p['woodHi'],'residential_house':p['stoneD'],'inn':p['roofM'],'barracks':p['roof'],'apothecary':p['leaf'],'city_hall':p['roofM']}.get(kind,p['roofM'])
    # Broad hip roof, visible layered tiles, raised ridge cap, tile ends, and fascia shadow.
    poly(d,[(15,89),(31,42),(96,28),(178,42),(190,89),(176,100),(29,100)],p['ink'])
    poly(d,[(21,84),(37,47),(96,34),(171,47),(184,84),(170,92),(32,92)],p['roofD'] if kind not in ('food_hall','forge','residential_house') else roof_color)
    poly(d,[(35,73),(42,51),(96,40),(165,51),(174,75),(164,82),(38,82)],roof_color)
    poly(d,[(49,63),(55,52),(96,44),(153,52),(161,66),(150,73),(53,73)],roof_mid)
    for row,(y,left,right) in enumerate(((51,42,169),(58,31,180),(67,25,185),(77,20,189))):
        line(d,[(left,y),(right,y)],p['roofHi'] if row==0 else (p['woodD'] if kind in ('food_hall','forge') else p['roofD']),2)
        for x in range(left+5+(row%2)*9,right-4,15):
            line(d,[(x,y-2),(x+4,y+1)],p['roofM'] if row%2 else p['roofHi'])
    line(d,[(49,87),(161,87)],p['woodHi'],3)
    for x in (23,180):
        poly(d,[(x,82),(x+9,80),(x+17,86),(x+12,93),(x+4,93)],p['roofM'],p['ink'])
        line(d,[(x+5,86),(x+13,87)],p['roofHi'])
    # Shop-specific fixtures and symbols.
    if kind in ('inn','food_hall','apothecary','forge','city_hall','barracks','residential_house'):
        sign(d,73,75,48,{'inn':0,'food_hall':1,'apothecary':2,'forge':3,'city_hall':4,'barracks':5,'residential_house':6}[kind])
    if kind=='inn':
        for x in (55,137): lantern(d,x,77,2)
        box(d,(124,128,153,137),p['wood'],p['gold'])
    elif kind=='food_hall':
        box(d,(43,127,72,137),p['wood'],p['gold']);box(d,(44,121,71,127),p['redHi'],p['ink'])
        for x in (48,58,67):d.ellipse((x,119,x+6,125),fill=p['window'],outline=p['woodD'])
    elif kind=='apothecary':
        for x,c in ((46,p['jade']),(132,p['redHi'])):
            box(d,(x,127,x+15,137),p['woodD'],p['gold']);d.ellipse((x+3,121,x+12,130),fill=c,outline=p['ink']);box(d,(x+6,118,x+9,122),p['woodHi'])
    elif kind=='forge':
        box(d,(130,45,143,78),p['stoneD'],p['ink']);box(d,(133,34,140,48),p['stone'],p['ink']);
        for x,y,r in ((141,28,4),(148,17,3),(137,8,2)): d.ellipse((x-r,y-r,x+r,y+r),fill='#92a394')
        box(d,(126,128,155,143),p['stoneD'],p['ink']);poly(d,[(127,127),(141,116),(155,127)],p['redHi'],p['ink']);d.ellipse((137,124,146,135),fill=p['window'])
    elif kind=='barracks':
        for x in (43,144): box(d,(x,82,x+16,93),p['red'],p['gold']);poly(d,[(x+4,82),(x+8,75),(x+12,82)],p['cream'])
        box(d,(122,111,150,124),p['woodD'],p['gold']);line(d,[(128,114),(144,121)],p['stoneHi'],2)
    elif kind=='city_hall':
        for x in (46,148): box(d,(x,79,x+8,140),p['red'],p['gold'])
        roof(d,32,30,160,54,color=p['roofM'],trim=p['gold'])
    elif kind=='residential_house':
        box(d,(130,128,153,139),p['wood'],p['ink']);d.ellipse((126,118,137,129),fill=p['stone'],outline=p['ink'])
    elif kind=='market_stall':
        box(d,(29,114,163,136),p['wood'],p['ink']);
    return im


NAMES = ['city_gate','city_wall','market_stall','food_hall','inn','barracks','forge','apothecary','city_hall','farm_plot','training_yard','watchtower','residential_house','sect_gate','sect_hall','meditation_hall','disciple_house','sect_storehouse','blackwind_camp','spirit_vein','city_tree','pine_tree','ancient_tree','shrub_cluster','flower_patch','stone_lamp','market_cart','boulder','lantern_post','jade_fountain']


def create_atlas():
    cell=192; cols=5; rows=math.ceil(len(NAMES)/cols)
    sheet=Image.new('RGBA',(cols*cell,rows*cell),(0,0,0,0)); frames={}
    aliases={'watchtower':'city_hall','sect_gate':'city_gate','sect_hall':'city_hall','meditation_hall':'city_hall','disciple_house':'residential_house','sect_storehouse':'food_hall','blackwind_camp':'inn','spirit_vein':'ancient_tree','farm_plot':'flower_patch','training_yard':'city_wall'}
    for i,name in enumerate(NAMES):
        sprite=house(aliases.get(name,name)); x=(i%cols)*cell; y=(i//cols)*cell
        sheet.alpha_composite(sprite,(x,y)); frames[name]={'frame':{'x':x,'y':y,'w':cell,'h':cell},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':cell,'h':cell},'sourceSize':{'w':cell,'h':cell}}
    sheet.save(PROPS/'settlement_buildings.png')
    (PROPS/'settlement_buildings.json').write_text(json.dumps({'frames':frames,'meta':{'image':'settlement_buildings.png','format':'RGBA8888','size':{'w':cols*cell,'h':rows*cell},'scale':'1'}},indent=2),encoding='utf-8')
    return sheet


def tile_noise(d, ox, oy, seed, colors, count=10):
    r=random.Random(seed)
    for _ in range(count):
        x=ox+r.randrange(2,30); y=oy+r.randrange(2,30)
        d.point((x,y),fill=colors[r.randrange(len(colors))])


def create_terrain():
    # Preserve every pre-existing tile ID and replace only grass, paving, and foliage slots.
    path=ASSETS/'tilesets'/'qingyun_terrain.png'; im=Image.open(path).convert('RGBA'); d=ImageDraw.Draw(im); p=PALETTE
    for idx in range(8):
        ox=(idx%16)*32; oy=(idx//16)*32
        base=(p['grass0'],p['grass1'],p['grass1'],p['grass2'])[idx%4]
        box(d,(ox,oy,ox+31,oy+31),base)
        # Subtle tufts and leaves form an organic ground texture without a square noise pattern.
        r=random.Random(300+idx)
        for j in range(12):
            x=ox+r.randrange(3,29); y=oy+r.randrange(3,29)
            color=(p['grass2'],p['grassHi'],p['moss'],p['grass0'])[r.randrange(4)]
            if j%3==0:
                line(d,[(x,y+2),(x-1,y)],color);line(d,[(x,y+2),(x+2,y-1)],color)
            else: box(d,(x,y,x+1,y+1),color)
        if idx%4==1:
            d.ellipse((ox+21,oy+5,ox+22,oy+6),fill=p['window'])
    # Cobble atlas IDs 17-32: staggered, bevelled slabs with shared dark joints.
    for idx in range(16,32):
        ox=(idx%16)*32; oy=(idx//16)*32
        box(d,(ox,oy,ox+31,oy+31),p['stoneD'])
        r=random.Random(900+idx)
        row_sizes=(8,10,9,8); y=0; row=0
        while y<32:
            h=row_sizes[(row+idx)%len(row_sizes)]; offset=-(6 if row%2 else 0)
            x=offset
            while x<32:
                left=max(0,x+1); right=min(31,x+16+r.randrange(-2,3)); top=max(0,y+1); bottom=min(31,y+h-1)
                if right>=left and bottom>=top:
                    shade=(p['stone'],p['stoneM'],p['stoneHi'],p['stone'])[r.randrange(4)]
                    poly(d,[(left,top+1),(left+2,top),(right-2,top),(right,top+2),(right,bottom-1),(right-2,bottom),(left+1,bottom)],shade,p['stoneD'])
                    line(d,[(left+3,top+2),(min(right-2,left+7),top+2)],p['limestone'])
                x+=17+r.randrange(-1,2)
            y+=h;row+=1
        # Narrow cross joints make small adjoining tiles read as a continuous street.
        line(d,[(ox,oy+31),(ox+31,oy+31)],p['stoneD'])
    # Leafy transparent overlays: wild grass, flowers, and broad low ground cover.
    for idx in range(64,80):
        ox=(idx%16)*32; oy=(idx//16)*32; tile=Image.new('RGBA',(32,32),(0,0,0,0)); td=ImageDraw.Draw(tile)
        r=random.Random(1600+idx)
        for j in range(5):
            x=4+j*6+(idx%3); y=25-r.randrange(4,12)
            line(td,[(x,y+6),(x,y)],p['leafHi'] if j%2 else p['leafM'])
            line(td,[(x,y+4),(x-3,y+1)],p['leaf'])
            line(td,[(x,y+3),(x+3,y)],p['grassHi'])
        if idx%3==0:
            for x,y,c in ((9,18,p['window']),(22,20,p['redHi']),(17,14,p['cream'])):
                td.ellipse((x-2,y-1,x+2,y+2),fill=c,outline=p['leaf'])
        elif idx%3==1:
            for x,y in ((7,22),(15,18),(25,23)):
                td.ellipse((x-3,y-3,x+4,y+3),fill=p['leafM'],outline=p['leaf']);td.point((x-1,y-1),fill=p['leafHi'])
        im.alpha_composite(tile,(ox,oy))
    im.save(path)
    return im


def point_object(oid,name,x,y,props=None):
    return {'id':oid,'name':name,'x':x,'y':y,'width':0,'height':0,'point':True,'visible':True,'type':'','rotation':0,'properties':props or []}


def prop_object(oid,name,x,y,*,rotation=0,solid=None):
    props=[{'name':'sprite','type':'string','value':name},{'name':'source','type':'string','value':'gfx3b'}]
    obj={'id':oid,'name':'GFX3B '+name,'type':'prop','gid':1,'x':x,'y':y,'width':128,'height':128,'rotation':rotation,'visible':True,'properties':props}
    collision=None
    if solid:
        sx,sy,sw,sh=solid
        collision={'id':oid+10000,'name':'gfx3b_'+name+'_trunk','type':'solid','x':x+64+sx,'y':y+sy,'width':sw,'height':sh,'rotation':0,'visible':True,'properties':[{'name':'source','type':'string','value':'gfx3b'}]}
    return obj,collision


def update_map():
    m=json.loads(MAP_PATH.read_text(encoding='utf-8'))
    by={layer['name']:layer for layer in m['layers']}
    w=m['width']; tw=m['tilewidth']; city_x,city_y,city_w,city_h=2304,64,1408,1472
    col0,col1=city_x//tw,(city_x+city_w)//tw; row0,row1=city_y//tw,(city_y+city_h)//tw
    ground=by['Ground']['data']; paths=by['Paths']['data']; details=by['Details']['data']
    # Variation within each city lawn patch, while streets and all anchor coordinates remain exact.
    for y in range(row0,row1):
        for x in range(col0,col1):
            idx=y*w+x
            if paths[idx]: continue
            details[idx]=0
            r=random.Random(x*11939+y*7207+2026)
            ground[idx]=1+r.choices(range(8),weights=(40,17,15,12,7,4,3,2),k=1)[0]
            if ((x*13+y*29)%19 in (0,1)) and ((x+y)%5):
                details[idx]=65+((x*3+y*7)%16)
    # Rebuild the city stonework into a connected avenue, market square and service lanes.
    for y in range(row0,row1):
        for x in range(col0,col1): paths[y*w+x]=0
    def pave(x0,y0,x1,y1):
        for ty in range(max(row0,y0//32),min(row1,math.ceil(y1/32))):
            for tx in range(max(col0,x0//32),min(col1,math.ceil(x1/32))):
                paths[ty*w+tx]=17+((tx*7+ty*11)%16)
    pave(2304,800,3712,896)    # Main avenue from the west gate to the eastern wards.
    pave(2304,448,3712,512)    # North trade street.
    pave(2304,1088,3712,1152)  # South service street.
    pave(2496,704,3024,1040)   # Market square and its open southern apron.
    pave(2576,480,2640,1216)   # Food hall to farm lane.
    pave(2944,480,3008,1120)   # Apothecary and inn lane.
    pave(3152,512,3216,1120)   # Forge and inn access.
    pave(3392,480,3456,960)   # Hall and barracks access.
    pave(2448,944,2624,1024)   # Safe yard connection.
    pave(2576,1184,2736,1248)  # Farm activity site connection.
    pave(3040,1152,3152,1216)  # Training yard access.
    pave(3200,1056,3296,1152)  # Forge activity site access.
    # Keep every named economic, training, safety, and city entrance coordinate.
    wl=by['WorldProps']; cl=by['Collision']
    props=wl['objects']; collisions=cl['objects']
    props[:]=[o for o in props if not any(p.get('name')=='source' and p.get('value')=='gfx3b' for p in o.get('properties',[]))]
    # Keep two readable market awnings and clear the square's south half for its fountain.
    props[:]=[o for o in props if not (o.get('name')=='market_stall' and o.get('y',0)>800)]
    collisions[:]=[o for o in collisions if not any(p.get('name')=='source' and p.get('value')=='gfx3b' for p in o.get('properties',[]))]
    # Add the missing west curtain wall around a generous portal. Service anchors are untouched.
    for obstacle in list(collisions):
        if obstacle.get('name') in ('city_gate_left','city_gate_right'):
            collisions.remove(obstacle)
    # Existing gate supports follow the new west-facing passage and leave a 150px opening.
    for name,y in (('city_gate_north_post',786),('city_gate_south_post',978)):
        collisions.append({'id':max([0]+[o.get('id',0) for o in collisions])+1,'name':name,'type':'solid','x':2336,'y':y,'width':48,'height':32,'rotation':0,'visible':True,'properties':[{'name':'source','type':'string','value':'gfx3b'}]})
    next_id=max([0]+[o.get('id',0) for layer in m['layers'] if layer.get('type')=='objectgroup' for o in layer['objects']])+1
    # Curated vegetation pockets around outer lawns and open plaza edges.
    placements=[('city_tree',2480,452,(-13,-25,26,18)),('pine_tree',3470,472,(-12,-20,24,17)),('ancient_tree',3480,1245,(-14,-26,28,19)),('city_tree',2520,1190,(-13,-24,26,18)),('pine_tree',2830,575,(-12,-20,24,17)),('city_tree',3465,1075,(-13,-24,26,18)),('shrub_cluster',2440,1180,None),('shrub_cluster',3540,680,None),('flower_patch',2500,535,None),('flower_patch',3560,1180,None),('boulder',2445,600,None),('boulder',3530,980,None)]
    for name,x,y,solid in placements:
        obj,hit=prop_object(next_id,name,x,y,solid=solid); next_id+=1; props.append(obj)
        if hit: collisions.append(hit)
    # Street furnishings, positioned outside active path corridors and interaction points.
    for name,x,y in [('lantern_post',2500,730),('lantern_post',2880,730),('lantern_post',3060,970),('lantern_post',3330,970),('stone_lamp',2600,930),('stone_lamp',2920,930),('market_cart',2580,810),('market_cart',2925,810),('market_cart',2860,965)]:
        obj,_=prop_object(next_id,name,x,y); next_id+=1; props.append(obj)
    fountain,hit=prop_object(next_id,'jade_fountain',2650,1016,solid=(-35,-20,70,20)); next_id+=1; props.append(fountain)
    if hit: collisions.append(hit)
    for y in (330,458,586,714,1050,1178,1306,1434):
        obj,_=prop_object(next_id,'city_wall',2304,y,rotation=90); next_id+=1; props.append(obj)
        collisions.append({'id':next_id+10000,'name':'gfx3b_west_wall','type':'solid','x':2354,'y':y-48,'width':28,'height':128,'rotation':0,'visible':True,'properties':[{'name':'source','type':'string','value':'gfx3b'}]})
        next_id+=1
    gate=next((o for o in props if o.get('name')=='city_gate'),None)
    if gate:
        gate['rotation']=90;gate['y']=994
    # The prior city wall, gate, houses, shops, farm, sites, spawns and map bounds stay intact.
    all_object_ids=[o.get('id',0) for layer in m['layers'] if layer.get('type')=='objectgroup' for o in layer['objects']]
    m['nextobjectid']=max(m.get('nextobjectid',1),next_id+10002,max([0]+all_object_ids)+1)
    MAP_PATH.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    return m


def city_preview(terrain,atlas,m):
    # Art review crop at 1x and 4x: no simulated perspective transform or image upscaling from AI.
    crop=(2240,288,3712,1424); scale=1
    canvas=Image.new('RGBA',((crop[2]-crop[0])*scale,(crop[3]-crop[1])*scale),(20,32,27,255))
    layers={layer['name']:layer for layer in m['layers']}
    for lyname in ('Ground','Paths','Details'):
        layer=layers[lyname]
        for ty in range(crop[1]//32,crop[3]//32):
            for tx in range(crop[0]//32,crop[2]//32):
                gid=layer['data'][ty*m['width']+tx]
                if not gid: continue
                sx=((gid-1)%16)*32; sy=((gid-1)//16)*32
                tile=terrain.crop((sx,sy,sx+32,sy+32))
                canvas.alpha_composite(tile,(tx*32-crop[0],ty*32-crop[1]))
    atlas_doc=json.loads((PROPS/'settlement_buildings.json').read_text(encoding='utf-8'))
    atlas_img=atlas
    draw_order=sorted(layers['WorldProps']['objects'],key=lambda o:o.get('y',0))
    for obj in draw_order:
        x,y=obj.get('x',0),obj.get('y',0)
        if x<crop[0]-220 or x>crop[2] or y<crop[1] or y>crop[3]+200: continue
        name=next((p['value'] for p in obj.get('properties',[]) if p.get('name')=='sprite'),None)
        if not name or name not in atlas_doc['frames']: continue
        f=atlas_doc['frames'][name]['frame']; art=atlas_img.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h']))
        if obj.get('rotation'): art=art.rotate(-obj['rotation'],expand=True,resample=Image.Resampling.NEAREST)
        canvas.alpha_composite(art,(int(x+obj.get('width',128)/2-art.width/2-crop[0]),int(y-art.height-crop[1])))
    for scale,name in ((1,'thanh-van-thanh-gfx3b-1x.png'),(4,'thanh-van-thanh-gfx3b-4x.png')):
        out=canvas if scale==1 else canvas.resize((canvas.width*scale,canvas.height*scale),Image.Resampling.NEAREST)
        out.convert('RGB').save(OUT/name)


def main():
    atlas=create_atlas(); terrain=create_terrain(); m=update_map(); city_preview(terrain,atlas,m)
    print(f'GFX.3B: {len(NAMES)} native pixel-art frames; city area variation applied; map {m["width"]}x{m["height"]} unchanged.')


if __name__=='__main__': main()

from PIL import Image, ImageDraw
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'public/assets/props'
OUT.mkdir(parents=True,exist_ok=True)
NAMES=['city_gate','city_wall','market_stall','food_hall','inn','barracks','forge','apothecary','city_hall','farm_plot','training_yard','watchtower','residential_house','sect_gate','sect_hall','meditation_hall','disciple_house','sect_storehouse','blackwind_camp','spirit_vein']
W=H=128; cols=4; rows=(len(NAMES)+cols-1)//cols
sheet=Image.new('RGBA',(W*cols,H*rows),(0,0,0,0))
palette={'outline':'#252d27','roof0':'#172c31','roof1':'#24464a','roof2':'#376366','wood0':'#583927','wood1':'#805338','wood2':'#b6844f','wall0':'#d2c7a4','wall1':'#eee1bd','wall2':'#a78e69','stone0':'#64665c','stone1':'#96927f','gold':'#d0ad61','red':'#9b4c36','dark':'#2e302b','light':'#f0dbab','green':'#657d4b'}

def rect(d,box,fill,outline=None): d.rectangle(box,fill=fill,outline=outline)
def roof(d,x0,y0,x1,y1,style=0):
    o=palette['outline'];d.polygon([(x0+7,y0+18),(x0+20,y0+8),(x1-20,y0+8),(x1-7,y0+18),(x1,y0+27),(x1-10,y0+26),(x1-14,y0+34),(x0+14,y0+34),(x0+10,y0+26),(x0,y0+27)],fill=o)
    d.polygon([(x0+9,y0+18),(x0+23,y0+11),(x1-23,y0+11),(x1-9,y0+18),(x1-13,y0+27),(x0+13,y0+27)],fill=palette['roof1'])
    for y in range(y0+17,y0+27,3): d.line((x0+17,y,x1-17,y),fill=palette['roof2'],width=1)
    d.line((x0+14,y0+29,x1-14,y0+29),fill=palette['gold'] if style%2 else palette['wood2'],width=1)
    d.line((x0+3,y0+25,x0+16,y0+23),fill=palette['roof2'],width=2);d.line((x1-16,y0+23,x1-3,y0+25),fill=palette['roof2'],width=2)
def building(name):
    im=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(im);o=palette['outline']
    if name in ('sect_gate','sect_hall','meditation_hall','disciple_house','sect_storehouse','blackwind_camp','spirit_vein'):
        if name=='spirit_vein':
            d.ellipse((15,83,113,115),fill='#293d42',outline=o,width=2);d.polygon([(28,96),(39,52),(53,78),(66,34),(81,77),(98,51),(108,99)],fill='#287d84',outline='#b4ead5');d.polygon([(56,79),(67,42),(77,80)],fill='#d6f6cd');d.ellipse((58,72,78,92),fill='#a8f2db',outline='#e5ffe1');return im
        if name=='blackwind_camp':
            d.ellipse((13,94,115,116),fill='#302a26');
            for x in (15,57,93):
                d.polygon([(x,94),(x+17,47),(x+34,94)],fill='#49372f',outline=o);d.polygon([(x+8,91),(x+17,63),(x+26,91)],fill='#7e4938',outline='#c18a58');d.line((x+17,50,x+17,100),fill='#b98a57',width=2)
            d.ellipse((57,95,72,108),fill='#f2a64c');return im
        # Sect architecture uses jade-green glazed roofs and gold ridge ornaments.
        roof(d,2,28,126,72,1);rect(d,(16,65,112,108),palette['wall1'],o);rect(d,(12,101,116,112),palette['stone0'],o)
        for x in (23,101):rect(d,(x,61,x+6,107),palette['wood0'],o)
        rect(d,(53,79,76,105),palette['wood0'],o);rect(d,(57,83,72,105),palette['dark'])
        for x in (36,82):rect(d,(x,78,x+12,92),palette['wood0'],o);rect(d,(x+2,80,x+10,90),'#91b3a5',palette['gold'])
        if name=='sect_gate':
            rect(d,(7,48,29,109),palette['stone0'],o);rect(d,(99,48,121,109),palette['stone0'],o);roof(d,0,23,128,62,1);rect(d,(42,65,86,73),palette['red'],palette['gold']);d.text((50,63),'雲',fill=palette['gold'])
        elif name=='meditation_hall':
            for x in (37,54,72,89):d.line((x,29,x,48),fill=palette['gold'],width=2);d.ellipse((x-3,45,x+3,52),fill='#9ed8cc')
        elif name=='disciple_house':
            for x in (32,48,80,96):rect(d,(x,76,x+7,98),palette['wood2'],o)
        elif name=='sect_storehouse':
            rect(d,(79,83,100,99),palette['gold'],o);rect(d,(83,77,96,84),palette['wood2'],o)
        return im
    if name=='city_wall':
        rect(d,(4,69,123,108),palette['stone0'],o);rect(d,(7,66,120,98),palette['stone1'],o)
        for x in range(10,120,19): rect(d,(x,57,x+9,72),palette['stone1'],o);d.line((x+2,75,x+15,75),fill=palette['wall2'])
        for x in range(12,116,24): d.line((x,80,x+14,80),fill=palette['wall2'])
        rect(d,(0,101,127,111),palette['stone0'],o);return im
    if name=='farm_plot':
        rect(d,(9,78,119,115),palette['wood0'],o);rect(d,(13,82,115,111),'#66523b',palette['wood2'])
        for x in range(20,112,20):
            for y in range(86,109,10):
                d.line((x,y+4,x+4,y),fill=palette['green'],width=2);rect(d,(x+5,y+1,x+8,y+4),palette['gold'])
        rect(d,(6,112,122,117),palette['wood2'],o);return im
    if name=='training_yard':
        rect(d,(12,69,116,112),'#8e3732',o);rect(d,(16,72,112,108),'#a64a3d',palette['gold']);
        for x in (23,103): rect(d,(x,58,x+4,95),palette['wood1'],o)
        d.line((25,60,105,60),fill=palette['gold'],width=2)
        for x in (39,88):
            rect(d,(x,76,x+3,102),palette['dark'],o);d.line((x-5,82,x+9,82),fill=palette['stone1'],width=2)
        return im
    if name=='residential_house':
        roof(d,2,32,126,73,1)
        rect(d,(18,64,110,109),palette['wood0'],o);rect(d,(23,68,105,104),palette['wall1'],o)
        for x in (28,97): rect(d,(x,68,x+5,106),palette['wood1'],o)
        rect(d,(54,81,75,106),palette['wood0'],o);rect(d,(58,84,72,105),palette['dark'])
        for x in (32,82):
            rect(d,(x,77,x+13,90),palette['wood0'],o);rect(d,(x+2,79,x+11,88),'#8eb0a2',palette['gold']);d.line((x+6,79,x+6,88),fill=palette['wood0'])
        roof(d,8,25,120,63,0)
        for x in range(18,112,9): d.line((x,44,x+2,54),fill=palette['roof2'])
        return im
    if name=='market_stall':
        rect(d,(17,65,111,112),palette['wood0'],o);rect(d,(20,72,108,104),palette['wood1'],o)
        rect(d,(13,37,115,67),palette['outline']);
        for x,color in zip(range(15,116,14),['#e8dfc6','#477d73','#e8dfc6','#a34c3d','#e8dfc6','#477d73','#e8dfc6']): rect(d,(x,39,x+12,63),color)
        for x in (25,103): rect(d,(x,58,x+4,109),palette['wood2'],o)
        for x,color in ((32,palette['red']),(56,palette['green']),(82,palette['gold'])): rect(d,(x,81,x+15,94),color,o)
        rect(d,(39,96,91,102),palette['wood2'],o);return im
    # Main hall and specialty shops share detailed timber-and-tile construction.
    if name=='city_gate':
        rect(d,(10,42,30,107),palette['stone0'],o);rect(d,(98,42,118,107),palette['stone0'],o)
        rect(d,(14,47,26,101),palette['stone1']);rect(d,(102,47,114,101),palette['stone1'])
        roof(d,2,25,126,72,1);rect(d,(36,68,92,115),palette['outline']);rect(d,(41,71,87,113),palette['wood0'],palette['gold']);rect(d,(47,76,81,113),palette['dark']);
        rect(d,(47,63,81,69),palette['red'],palette['gold']);rect(d,(56,64,72,68),palette['gold']);return im
    roof(d,4,32,124,70,1 if name in ('inn','city_hall','barracks') else 0)
    rect(d,(17,65,111,108),palette['wall0'],o);rect(d,(21,68,107,105),palette['wall1'])
    rect(d,(12,101,116,111),palette['stone0'],o);rect(d,(16,99,112,106),palette['stone1'])
    # timber frame, inset door, latticed windows
    rect(d,(27,68,32,104),palette['wood1'],o);rect(d,(96,68,101,104),palette['wood1'],o);rect(d,(28,100,100,105),palette['wood1'],o)
    rect(d,(54,79,76,104),palette['wood0'],o);rect(d,(57,82,73,104),palette['dark']);rect(d,(69,91,71,93),palette['gold'])
    for x in (36,81):
        rect(d,(x,78,x+12,92),palette['wood0'],o);rect(d,(x+2,80,x+10,90),'#91b3a5',palette['gold']);
        d.line((x+6,80,x+6,90),fill=palette['wood0']);d.line((x+2,85,x+10,85),fill=palette['wood0'])
    rect(d,(48,66,81,72),palette['red'],palette['gold']);rect(d,(51,68,78,70),palette['gold'])
    roof(d,8,24,120,65,0)
    # tile courses and individual ridge ornaments
    for x in range(18,112,9): d.line((x,43,x+2,54),fill=palette['roof2']);d.point((x,38),fill=palette['gold'])
    if name=='forge':
        rect(d,(82,20,91,39),palette['stone0'],o);rect(d,(84,14,90,20),palette['stone1'],o);d.rectangle((83,11,92,13),fill='#bec6b4')
    elif name=='apothecary':
        rect(d,(44,88,50,96),palette['green'],o);rect(d,(78,88,84,96),palette['green'],o)
    elif name=='barracks':
        rect(d,(41,73,49,78),palette['red'],o);rect(d,(77,73,85,78),palette['red'],o)
    elif name=='inn':
        rect(d,(58,66,70,70),palette['gold'],o)
    elif name=='city_hall':
        for x in (33,91): rect(d,(x,61,x+4,101),palette['red'],o)
    return im

frames={}
for i,name in enumerate(NAMES):
    x=(i%cols)*W;y=(i//cols)*H
    sprite=building(name);sheet.alpha_composite(sprite,(x,y))
    frames[name]={'frame':{'x':x,'y':y,'w':W,'h':H},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':W,'h':H},'sourceSize':{'w':W,'h':H}}
sheet.save(OUT/'settlement_buildings.png')
(OUT/'settlement_buildings.json').write_text(json.dumps({'frames':frames,'meta':{'image':'settlement_buildings.png','format':'RGBA8888','size':{'w':W*cols,'h':H*rows},'scale':'1'}},indent=2),encoding='utf-8')
print('Generated',len(NAMES),'pixel-art city props using Pillow 11.2.1')

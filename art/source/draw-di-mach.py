from pathlib import Path
from PIL import Image, ImageDraw
from importlib.machinery import SourceFileLoader
import random

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/assets/di-mach'
OUT.mkdir(parents=True, exist_ok=True)
legacy = SourceFileLoader('tree_shapes', str(ROOT/'art/source/west-wilds/draw-treasures.py')).load_module()
leaf = ['#498b76','#64854d','#648c3d','#568974','#7d8750','#76a65b','#7ead7f','#73854f',
        '#8b955b','#9b654b','#668b41','#7ab37a','#768b56','#718a55','#685888']
accent = ['#b9acee','#f2a265','#b4d572','#b6eee0','#d894c9','#b3cc73','#c5ecd0','#cc996a',
          '#d2b187','#e79b86','#df8b88','#baf1ce','#efe1af','#ffe897','#b6a2db']

def polygon(draw, points, light, shadow='#25322d'):
    draw.polygon(points, fill=light, outline=shadow)

def frond(draw, root, tip, hue, width=3):
    x,y = root
    tx,ty = tip
    hx,hy = (x+tx)//2,(y+ty)//2
    points = [(x,y),(hx-width,hy+2),(tx,ty),(hx+width,hy-2)]
    if abs(tx-x)<3:
        points = [(x,y),(x-width,hy),(tx,ty),(x+width,hy)]
    polygon(draw, points, hue)
    draw.line([root,(hx,hy)], '#91ac6c')

def herb(index, phase):
    im=Image.new('RGBA',(32,32))
    d=ImageDraw.Draw(im)
    d.line([(11,29),(17,27),(23,29)], '#3d4732', 2)
    d.point((11,28),'#957a51')
    if phase==5:
        d.line([(15,28),(15,25),(17,24)],'#715840',2)
        d.point((21,28),'#a28b5c')
        return im
    hue=leaf[index]
    if phase<=2:
        root=(16,28)
        mid=[(16,25),(16,21),(16,17)][phase]
        if index==9:
            for x,y in [(16,26-phase*2),(21-phase,24-phase*2)][:phase+1]:
                polygon(d,[(x-4,y),(x-2,y-3),(x+2,y-3),(x+4,y),(x+1,y+1)],accent[index])
                d.line([(x,y+1),(x,y+4)],'#bc916e')
            return im
        d.line([root,(15,24),mid],'#36583f',2)
        spread=5+phase*3
        frond(d, (16,25),(16-spread,25-(index%3)-phase*2),hue,1+phase)
        frond(d, (16,25),(16+spread,23+index%3-phase*2),hue,1+phase)
        if phase>0:
            frond(d, (16,22),(15+index%4,20-phase*3),hue,phase+1)
        if phase==2:
            d.point((15+index%4,14),accent[index])
        return im
    base=legacy.plant(index)
    im.alpha_composite(base)
    if phase==4:
        # A handful of bright edges chosen per cultivar instead of a uniform tint.
        for x,y in [(6+(index*3)%7,8+index%7),(25-index%7,8+index%4),(21,4+index%6)]:
            d.line([(x-1,y),(x+1,y)],accent[index])
            d.point((x,y-1),'#ecdba8')
    return im

sheet=Image.new('RGBA',(32*15,32*6))
for index in range(15):
    for stage in range(6):
        sheet.paste(herb(index,stage),(index*32,stage*32))
sheet.save(OUT/'spirit-herbs.png')

rock_colors = [
    ('#6f6757','#aa906f','#ccac84'),('#476451','#67ad79','#b7d696'),
    ('#335970','#57aabe','#bcf4e6'),('#484166','#9b78bf','#e4c8ee'),
    ('#67523d','#c7a95f','#ffdf96'),
]
rock_atlas=Image.new('RGBA',(40*5,40*4))
for grade,(shade,facet,tip) in enumerate(rock_colors):
    for state in range(4):
        im=Image.new('RGBA',(40,40))
        d=ImageDraw.Draw(im)
        polygon(d,[(3,32),(8,24),(14,23),(19,17),(25,18),(29,24),(35,26),(37,33),(31,37),(9,37)],shade)
        for points in [[(7,31),(12,26),(19,25),(15,32)],[(17,25),(21,19),(26,21),(29,28),(20,28)],[(26,30),(29,26),(34,29),(35,33)]]:
            d.polygon(points,fill='#867d68' if grade==0 else shade)
            d.line(points[:3],fill='#a29376' if grade==0 else '#8c8b74')
        fragments=[(13,28,9),(21,27,16),(27,32,10),(32,29,7)]
        for x,y,height in fragments[:max(0,4-state*2) if state<3 else 0]:
            if grade==0:
                polygon(d,[(x-3,y),(x-3,y-height//2),(x,y-height//2-2),(x+3,y-2),(x+2,y+2)],facet)
                d.point((x-1,y-height//2),tip)
            else:
                polygon(d,[(x-4,y),(x-3,y-height+4),(x,y-height),(x+4,y-height+4),(x+5,y+1),(x,y+3)],facet)
                d.polygon([(x,y+1),(x,y-height+2),(x+3,y-height+5),(x+4,y+1)],fill=shade)
                d.line([(x-2,y-2),(x-2,y-height+5),(x,y-height+2)],fill=tip)
        if state==2:
            d.line([(10,29),(14,27),(18,28)],facet)
        if state==3:
            d.line([(14,27),(16,29),(20,29),(21,33)],'#352e2d')
        rock_atlas.paste(im,(grade*40,state*40))
rock_atlas.save(OUT/'deposits.png')

plots=Image.new('RGBA',(192*6,128*4))
for crop in range(4):
    for phase in range(6):
        im=Image.new('RGBA',(192,128))
        d=ImageDraw.Draw(im)
        polygon(d,[(16,31),(160,31),(181,42),(181,104),(165,116),(14,116),(8,105),(8,44)],'#543b2c')
        polygon(d,[(20,32),(158,32),(173,41),(173,100),(162,108),(17,108),(11,101),(11,45)],'#835638')
        rng=random.Random(crop*22+phase)
        for _ in range(160):
            x,y=rng.randrange(17,167),rng.randrange(44,105)
            d.point((x,y),rng.choice(['#8b6241','#6e4933','#9d704a']))
        d.rectangle((11,101,170,105),fill='#4b5144')
        d.line([(16,102),(164,102)],'#669273')
        for y in (48,63,79,94):
            d.line([(17,y),(167,y)],'#50372a',3)
            d.line([(19,y-2),(165,y-2)],'#ac7950')
            for x in range(24,159,12):
                if phase==0:continue
                if phase==1:
                    d.point((x,y-2),'#c0a46a')
                    continue
                stem=phase*2-3
                frond(d,(x,y),(x-3,y-stem),'#7ea45b' if crop else '#8daa58',1)
                frond(d,(x,y),(x+4,y-stem-1),'#517247',1)
                if crop==2 and phase>=3:frond(d,(x,y),(x+1,y-stem-4),'#739bbb',1)
                if crop==3 and phase>=3:frond(d,(x,y),(x-2,y-stem+1),'#ae7794',2)
                if phase>=4:d.point((x+3,y-stem-1),['#f1be63','#b0ded1','#afa6ee','#f4a7ad'][crop])
                if phase==5:d.point((x-3,y-stem),'#d9eaa1' if crop else '#e0a751')
        plots.paste(im,(192*phase,128*crop))
plots.save(OUT/'farm-plots.png')
marks=Image.new('RGBA',(24*15,24))
for index,(base,trim,shape) in enumerate([
    ('#45515c','#d1ad78','shield'),('#746847','#bbad78','seed'),('#605847','#c3a472','rock'),
    ('#9d564a','#e9bd79','purse'),('#425e59','#abdfac','bottle'),('#79523f','#e9b077','anvil'),
    ('#789284','#e2e8be','case'),('#79633e','#c6b779','quiver'),('#6d4e69','#d5a997','qin'),
    ('#418675','#bfdcc2','jewel'),('#65617c','#e3cb8a','crest'),
    ('#92704d','#b6c9bb','hoe'),('#92704d','#bcc4cb','pick'),('#845945','#cd9d68','basket'),('#526779','#98bdc2','can'),
]):
    d=ImageDraw.Draw(marks)
    x=index*24
    def p(points, color):
        polygon(d,[(x+px,py) for px,py in points],color,'#303337')
    def l(points,color,width=1):
        d.line([(x+px,py) for px,py in points],color,width)
    if shape in ('hoe','pick'):
        l([(10,22),(14,5)],'#34302e',4)
        l([(10,21),(14,5)],base,2)
        p([(7,8),(9,5),(15,3),(21,5),(22,8),(16,7),(11,9)] if shape=='pick' else
          [(6,6),(12,4),(17,5),(17,9),(13,9),(10,8),(6,10)],trim)
    elif shape=='basket':
        p([(5,10),(7,18),(16,18),(19,10),(16,7),(8,7)],base)
        l([(8,8),(8,5),(11,3),(15,5),(16,8)],trim)
        for y in (10,13,16):l([(7,y),(17,y)],trim)
    elif shape=='can':
        p([(7,9),(15,9),(17,17),(7,18),(5,14),(2,10),(3,8),(7,12)],base)
        l([(15,10),(16,7),(20,7),(21,13),(17,14)],trim)
        l([(8,11),(13,11)],trim,2)
    elif shape=='shield':
        p([(5,6),(11,3),(18,6),(17,15),(12,19),(6,15)],base)
        l([(7,7),(11,6),(16,7)],trim,2)
        l([(11,7),(11,16)],trim)
    elif shape in ('bottle','purse'):
        p([(9,8),(9,4),(14,4),(14,8),(17,12),(16,16),(13,18),(8,17),(6,13)],base)
        l([(9,8),(14,8)],trim,2)
        l([(8,12),(10,11)],trim)
    elif shape in ('jewel','crest','seed','rock'):
        p([(5,12),(9,6),(14,4),(18,10),(16,15),(10,18)],base)
        l([(9,12),(12,8),(14,9),(12,13),(9,12)],trim,2)
    elif shape in ('qin','quiver'):
        p([(7,15),(12,4),(16,5),(18,8),(12,19)],base)
        l([(9,16),(14,7)],trim,2)
        l([(13,14),(15,10)],trim)
    else:
        p([(5,8),(18,8),(19,13),(16,17),(6,16)],base)
        l([(7,10),(16,10)],trim,2)
        l([(11,6),(15,6)],trim)
marks.save(OUT/'profession.png')
wild=Image.new('RGBA',(5*32,6*32))
for index,kind in enumerate([5,9,4,0,10]):
    for phase in range(6):
        im=herb(kind,phase)
        if phase in (3,4):
            d=ImageDraw.Draw(im)
            if index==0:
                for x,y in [(8,14),(21,9),(24,16)]:
                    d.line([(x,y),(x+1,y-3)],'#b3cf9e')
            elif index==1:
                for x,y in [(10,15),(17,10),(22,13)]:
                    d.rectangle((x,y,x+1,y+1),fill='#d6a0d9')
            elif index==2:
                d.line([(8,21),(6,16),(8,13)],'#ab9fd3')
            elif index==3:
                d.line([(20,5),(17,11),(19,11),(16,16)],'#e0f8fa')
            else:
                for x,y in [(8,14),(21,11),(15,8)]:
                    d.point((x,y),'#ffca91')
        wild.paste(im,(index*32,phase*32))
wild.save(OUT/'wild-herbs.png')

preview_dir=ROOT/'art/previews/di-mach-bi-canh'
preview_dir.mkdir(parents=True,exist_ok=True)
preview=Image.new('RGB',(544,32*13),'#26372d')
original=Image.open(ROOT/'public/assets/west-wilds/treasures.png').convert('RGBA')
for art,pos in [(original,(0,0)),(sheet,(0,32)),(wild,(0,224)),(marks,(160,224)),(rock_atlas,(164,248))]:
    preview.paste(art,pos,art)
preview.resize((preview.width*2,preview.height*2),Image.Resampling.NEAREST).save(preview_dir/'07-doi-chieu-atlas.png')
plots.resize((plots.width,plots.height),Image.Resampling.NEAREST).save(preview_dir/'08-sau-giai-doan-luong.png')
entries=Image.new('RGBA',(72*5,64))
for grade,(stone,facet,highlight) in enumerate(rock_colors):
    im=Image.new('RGBA',(72,64))
    d=ImageDraw.Draw(im)
    polygon(d,[(4,56),(7,44),(14,42),(18,25),(24,21),(31,16),(43,17),(53,24),(59,38),(64,42),(65,58),(51,61),(13,61)],stone)
    d.polygon([(12,57),(16,48),(56,46),(63,54),(60,59),(13,60)],fill='#39382f')
    polygon(d,[(18,52),(20,38),(24,31),(32,27),(43,27),(50,31),(54,41),(55,53)],'#222a29')
    polygon(d,[(23,49),(24,38),(31,31),(43,31),(48,38),(48,49)],'#141c20')
    d.polygon([(25,47),(47,47),(50,52),(21,52)],fill='#504539')
    for y in range(49,56,2):
        d.line([(22-(y-49)//2,y),(50+(y-49)//2,y)],fill='#ae9672' if y<len(range(49,56,2))+49 else '#795f4a')
    for points in [[(12,46),(19,41),(23,42)],[(24,28),(28,24),(31,24)],[(36,22),(43,22),(46,26)],[(54,39),(60,42),(59,48)],[(6,55),(10,52),(14,53)]]:
        d.line(points,fill=facet,width=2)
    if grade==0:
        d.line([(24,49),(25,32),(33,28),(46,31),(49,49)],fill='#816246',width=3)
        d.line([(25,48),(26,34),(34,29),(44,32)],fill='#b59160')
    else:
        for x,y,h in [(17,48,11),(53,38,8),(58,52,9)]:
            polygon(d,[(x-3,y),(x-3,y-h+3),(x,y-h),(x+4,y-h+4),(x+3,y+2)],facet)
            d.line([(x-2,y-2),(x-2,y-h+4),(x,y-h+1)],fill=highlight)
    d.point((25,40),'#e9b375');d.point((47,40),'#d69d66')
    entries.paste(im,(72*grade,0))
entries.save(OUT/'mine-entrances.png')

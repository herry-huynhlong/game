"""Native pixel artwork for the production sites and the city courtyards."""
from pathlib import Path
from PIL import Image, ImageDraw
import random

runtime = Path(__file__).resolve().parents[3] / 'public/assets/society'
rng = random.Random(219406)
frames = []


def canvas():
    im = Image.new('RGBA', (192, 128))
    frames.append(im)
    return ImageDraw.Draw(im)


d = canvas()
d.polygon([(7,104),(20,89),(17,65),(37,46),(57,28),(83,33),(103,13),(136,27),(155,19),(181,42),(187,77),
           (176,108),(153,117),(38,117)],fill='#263c35')
for poly, color in [
    ([(20,89),(17,65),(37,46),(57,28),(78,36),(58,55),(50,85),(36,104)],'#68736a'),
    ([(62,58),(79,36),(103,13),(136,27),(122,47),(97,54),(85,77)],'#8c8f77'),
    ([(108,63),(132,52),(136,27),(155,19),(175,39),(160,63),(146,73)],'#747e6c'),
    ([(133,75),(160,63),(181,42),(187,77),(172,99),(148,103)],'#526058'),
    ([(35,105),(53,88),(63,67),(88,55),(120,55),(145,76),(149,105),(122,114),(64,115)],'#414f46'),
    ([(69,105),(70,79),(85,65),(111,65),(129,82),(130,105)],'#17292a'),
]:
    d.polygon(poly,fill=color)
for x,y in [(39,62),(59,51),(94,41),(148,64),(163,74),(172,92),(42,100),(141,105)]:
    d.line((x,y,x+11,y-4,x+14,y-2),fill='#a2a290',width=2)
for x in (67,128):
    d.polygon([(x-2,108),(x-2,67),(x+5,66),(x+9,108)],fill='#714c34')
    d.line((x,72,x+2,105),fill='#bc8553',width=2)
d.polygon([(59,64),(140,62),(140,70),(59,72)],fill='#6c4833')
d.line((60,64,138,62),fill='#cd9660',width=2)
for x in (80,118):
    d.line((x,71,x,83),fill='#aa845c')
    d.rectangle((x-2,83,x+2,88),fill='#fbc779')
d.line((81,104,74,127),fill='#876b54',width=2)
d.line((114,104,122,127),fill='#876b54',width=2)
for y in (108,115,123):
    d.line((79-(y-104)//3,y,116+(y-104)//3,y),fill='#98694b',width=2)

for exposed in (True,False):
    d=canvas()
    d.polygon([(35,105),(43,88),(59,81),(72,75),(98,80),(119,74),(149,89),(160,106),
               (146,115),(51,115)],fill='#314438')
    d.polygon([(42,102),(60,87),(77,84),(96,92),(125,82),(146,92),(151,104),(120,111),(63,110)],fill='#67756c')
    d.line((49,99,59,92,78,89,87,93),fill='#a4a391',width=2)
    if exposed:
        for x,y,w,h in [(66,99,13,26),(85,103,12,40),(108,103,16,31),(128,105,8,21),(51,106,7,16)]:
            d.polygon([(x-w,y),(x-w+3,y-h//2),(x,y-h),(x+w-4,y-h//2),(x+w,y-3)],
                      fill='#277772',outline='#214953')
            d.polygon([(x,y-h),(x+2,y-6),(x-w,y),(x-w+3,y-h//2)],fill='#63b8a2')
            d.line((x,y-h,x+2,y-6),fill='#c1f1c9',width=2)
    else:
        d.line((49,104,74,97,97,103,121,98),fill='#354449',width=2)

for phase in range(4):
    d=canvas()
    d.polygon([(8,41),(180,41),(189,91),(173,105),(20,105),(3,89)],fill='#334c36')
    for row in range(4):
        y=45+row*14
        d.polygon([(10,y),(178,y),(181,y+9),(7,y+9)],fill=['#765538','#866442','#927047','#9b7750'][row])
        d.line((11,y,177,y),fill='#b29561')
        for col in range(10):
            x=17+col*16+(row%2)*4
            if phase==0:
                d.point((x,y+4), fill='#503f2d')
                continue
            h=phase*3+(col+row)%3
            d.line((x,y+6,x,y+6-h),fill='#487954',width=2)
            d.line((x,y+5,x-4,y+2-h//2,x-5,y-h//2),fill='#73aa68')
            d.line((x,y+2,x+3,y-h+3,x+5,y-h+2),fill='#91bc76')
            if phase==3:
                d.rectangle((x-2,y+4-h,x+1,y+6-h),fill='#d1c18a' if row%2 else '#b3d9a0')

d=canvas()
d.polygon([(18,96),(40,75),(150,75),(175,97),(161,114),(27,114)],fill='#294f50')
d.polygon([(28,94),(45,80),(148,80),(164,95),(150,108),(37,108)],fill='#42877f')
for x,y in [(44,92),(75,83),(112,97),(136,88)]:
    d.line((x,y,x+12,y),fill='#86b7a4')

d=canvas()
for x,y,w in [(43,99,38),(82,87,47),(110,103,39)]:
    d.polygon([(x,y-15),(x+w,y-18),(x+w-4,y+5),(x+4,y+9)],fill='#69442f',outline='#362f26')
    d.ellipse((x,y-20,x+w,y-8),fill='#a2784d',outline='#47382a',width=2)
    for dx in range(6,w,7):
        d.line((x+dx,y-9,x+dx,y+2),fill='#bd9560')
    d.line((x+4,y+2,x+w-5,y),fill='#48382a')


def hall(roof, high, timber, paper, trim, signature=''):
    d=canvas()
    d.polygon([(19,108),(166,108),(184,119),(166,123),(16,121),(5,115)],fill='#263e38')
    d.polygon([(26,103),(164,103),(173,113),(155,118),(35,118),(17,113)],fill='#72796d')
    d.rectangle((28,64,163,105),fill=timber)
    d.rectangle((36,73,154,102),fill=paper)
    for x in (39,67,116,143):
        d.rectangle((x,76,x+10,95),fill='#432f29')
        d.rectangle((x+1,77,x+9,94),fill='#dca969')
        d.line((x+5,77,x+5,94),fill='#734f35')
        d.line((x+1,83,x+9,83),fill='#734f35')
    for x in (32,78,109,156):
        d.rectangle((x,67,x+4,104),fill=timber)
        d.line((x,75,x,103),fill=trim)
    d.rectangle((83,74,104,108),fill='#312a26')
    d.rectangle((84,89,104,104),fill='#4a3932')
    d.line((94,81,94,105),fill=trim)
    d.line((83,109,105,109),fill='#b6a784',width=2)
    for cut in ([0,25] if signature=='music' else [0]):
        d.polygon([(38+cut,60-cut),(57+cut,37-cut),(133-cut,37-cut),(151-cut,58-cut),(176-cut,70-cut),(185-cut,64-cut),
                   (180-cut,76-cut),(12+cut,76-cut),(6+cut,65-cut),(18+cut,70-cut)],fill='#253431')
        d.polygon([(57+cut,39-cut),(133-cut,39-cut),(151-cut,59-cut),(175-cut,72-cut),(17+cut,72-cut),(37+cut,60-cut)],fill=roof)
        for u in range(58+cut,134-cut,5):
            x=round(96+(u-96)*1.65)
            d.line((u,41-cut,x,70-cut),fill=high)
        d.line((58+cut,38-cut,133-cut,38-cut),fill=trim,width=2)
        d.line((14+cut,75-cut,177-cut,75-cut),fill=trim,width=2)
    for x in (19,169):
        d.line((x,76,x,84),fill='#574532')
        d.rounded_rectangle((x-4,83,x+4,94),radius=2,fill='#a94e39')
        d.rectangle((x-2,85,x+2,91),fill='#f5c477')
    if signature=='clinic':
        for x in (51,132):
            d.rectangle((x,90,x+10,104),fill='#45847b')
            d.line((x+4,92,x+4,101),fill='#ece3a9',width=2)
            d.line((x+1,96,x+8,96),fill='#ece3a9',width=2)


hall('#715948','#ab8061','#594032','#c0ac83','#d8a968','storage')
if __import__('sys').argv[-1]=='city':
    hall('#336f63','#6b9d7d','#644e39','#b8ad81','#c2a164','tea')
    hall('#643f55','#9d6679','#693c39','#ceae8b','#e3b97a','music')
    hall('#426780','#7299a0','#634f47','#c9b99a','#d3bb85','clinic')
    for kind in ('table','bed','counter','stage'):
        d=canvas()
        if kind=='table':
            d.ellipse((69,92,122,116),fill='#35483a')
            d.polygon([(74,82),(116,82),(122,93),(116,100),(74,100),(68,93)],fill='#896345',outline='#493729')
            d.line((76,85,114,85),fill='#c6975e')
            d.ellipse((93,87,99,93),fill='#d0c7a3')
        elif kind=='bed':
            d.rectangle((75,76,116,114),fill='#51382e')
            d.rectangle((78,80,113,109),fill='#47747a')
            d.rectangle((82,82,109,88),fill='#b7bfa7')
            d.line((79,107,112,107),fill='#98b3a7',width=2)
        elif kind=='counter':
            d.rectangle((68,87,125,109),fill='#6d4833')
            d.rectangle((67,80,126,93),fill='#a3784c',outline='#473a2c')
            for x in (74,114):
                d.ellipse((x,77,x+9,87),fill='#a25142',outline='#623f34')
        else:
            d.polygon([(32,78),(159,78),(169,112),(24,112)],fill='#72573f',outline='#56483e')
            for y in range(83,112,6):
                d.line((30,y,163,y),fill='#a2845d')
            d.rectangle((77,91,114,96),fill='#96634c')
            for y in (92,94):
                d.line((80,y,112,y),fill='#e0ca94')

atlas=Image.new('RGBA',(192*5,128*((len(frames)+4)//5)))
for i,im in enumerate(frames):
    atlas.paste(im,(i%5*192,i//5*128))
atlas.save(runtime/'facilities.png',optimize=True)
print(len(frames))

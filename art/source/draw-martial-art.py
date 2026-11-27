"""Draw authored pixel silhouettes and pack martial art inventory frames."""
from pathlib import Path
import json
import re
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'src/dao/MartialRegistry.ts'
ITEMS = ROOT / 'public/assets/items'
FRAMES = ROOT / 'src/dao/ItemIconFrames.json'

PALETTES = [
    ('#596872', '#a6bbc7', '#ecf1e8', '#cca171'), ('#4d4f58', '#899295', '#d6dad2', '#7e3c36'),
    ('#525d65', '#a3b3b6', '#e3ede3', '#d1554d'), ('#226853', '#50b69a', '#b6fbe0', '#e9c788'),
    ('#86292b', '#df6841', '#ffcf83', '#e7a25a'), ('#72532d', '#c5984e', '#ffe6a2', '#9ea867'),
    ('#473874', '#9c7eda', '#ede3ff', '#9edfff'), ('#24669b', '#66c4e8', '#dcfaff', '#8dadff'),
    ('#433355', '#765098', '#ce98e4', '#84e1be'), ('#653e91', '#af84e9', '#fff2a4', '#f7c460'),
    ('#a03731', '#e96642', '#ffdc88', '#edb65c'), ('#6e582f', '#a88a46', '#f3d97c', '#a7cfbc'),
    ('#94734b', '#e3c683', '#fff8d6', '#6caabaab'), ('#6a3e83', '#ac7bcc', '#f8dc86', '#ffe992'),
    ('#9c4331', '#ef893e', '#fff1a1', '#fbe875'),
]
OUTLINE = '#172132'
# One silhouette per weapon. The grip pixel is (12, 24).
SILHOUETTES = [
    [(12,1),(15,6),(14,20),(10,20),(10,6)],
    [(15,2),(20,4),(19,13),(15,20),(9,22),(8,18),(12,13),(14,8)],
    [(12,1),(16,7),(14,13),(12,15),(10,12),(8,7)],
    [(12,0),(17,7),(15,11),(16,16),(14,21),(10,21),(8,16),(9,9),(8,6)],
    [(16,0),(20,2),(21,8),(19,8),(21,13),(16,19),(8,22),(7,18),(13,13),(13,9)],
    [(12,1),(15,4),(17,4),(16,9),(18,11),(14,14),(12,16),(9,13),(6,10),(9,8),(8,5)],
    [(12,0),(17,5),(16,10),(18,12),(15,14),(16,18),(14,21),(10,21),(8,17),(10,13),(7,10),(9,7)],
    [(12,0),(17,7),(17,11),(20,9),(19,14),(14,16),(12,17),(8,14),(5,10),(8,11),(8,6)],
    [(10,1),(16,0),(21,2),(23,7),(23,11),(19,7),(17,6),(12,7),(9,12),(7,8),(8,4)],
    [(11,0),(17,3),(16,8),(20,10),(16,13),(18,16),(14,20),(15,22),(8,21),(9,16),(7,15),(9,12),(6,8),(9,8)],
    [(16,0),(21,1),(23,6),(21,10),(22,15),(17,21),(9,23),(4,19),(9,15),(12,6),(11,3)],
    [(3,6),(7,2),(16,2),(21,6),(21,13),(17,17),(6,17),(2,12)],
    [(12,0),(18,5),(16,8),(19,11),(16,14),(17,17),(14,20),(13,23),(9,21),(10,17),(7,14),(9,10),(6,7)],
    [(11,0),(15,3),(16,7),(20,3),(20,10),(16,13),(15,16),(12,19),(8,15),(4,11),(4,5),(8,8),(9,4)],
    [(15,0),(21,0),(23,4),(20,7),(23,9),(21,14),(23,15),(17,21),(14,21),(10,25),(6,23),(4,19),(7,18),(11,12),(10,8)],
]

def weapon(i):
    image = Image.new('RGBA', (24, 32))
    d = ImageDraw.Draw(image)
    dark, middle, bright, trim = PALETTES[i]
    # Different materials get a wrapped handle, brass cap and fitted guard.
    shaft = i in (2, 5, 7, 8, 11, 13)
    d.line([(12, 31 if shaft else 28), (12, 8 if shaft else 17)], fill=OUTLINE, width=4)
    d.line([(12, 30 if shaft else 27), (12, 10 if shaft else 19)], fill=trim[:7], width=2)
    for y in range(22,30,2):
        d.point((13,y), fill='#513840')
    d.polygon(SILHOUETTES[i], fill=dark, outline=OUTLINE)
    if i in (1,4,10,14):
        d.line([(17,3),(18,8),(17,13),(13,18),(8,21)], fill=middle, width=3)
        d.line([(18,3),(19,7),(18,12),(15,17)], fill=bright, width=1)
        d.line([(9,18),(13,16),(14,12)], fill=trim[:7])
    elif i==8:
        d.line([(10,4),(15,2),(19,3),(22,7)], fill=bright, width=2)
        d.line([(10,6),(16,4),(19,5)], fill=middle, width=2)
        d.rectangle((10,10,14,12), fill=trim)
    elif i==11:
        d.polygon([(4,7),(8,4),(16,4),(19,7),(15,10),(5,10)], fill=middle)
        d.line([(5,7),(9,4),(15,4),(18,7)], fill=bright)
        d.line([(7,12),(11,11),(13,13),(18,11)], fill=trim)
    else:
        end=12 if shaft else 20
        d.line([(12,3),(12,end)], fill=middle, width=3)
        d.line([(11,4),(11,end-2)], fill=bright)
        d.point((13,7), fill=trim[:7])
    guard=14 if shaft else 21
    d.polygon([(7,guard-1),(11,guard+1),(14,guard+1),(17,guard-2),(18,guard),(15,guard+3),
               (10,guard+3),(6,guard+1)], fill=trim[:7], outline=OUTLINE)
    if i==2:
        d.polygon([(13,13),(17,15),(15,20),(13,16)], fill='#c94746')
    if i>=3:
        mark=11+(i%2)
        d.line([(mark,8),(mark+2,10),(mark,12)], fill=bright)
    if i>=9:
        d.point((12,guard+1), fill='#fff5bc')
        d.point((9,guard+1), fill=bright)
    # Metal surfaces, bands and inscriptions stay inside the authored blade.
    relief = Image.new('RGBA',image.size)
    metal=ImageDraw.Draw(relief)
    details=[
        [(10,8,11,14),(11,15,12,21)],[(13,8,16,13),(8,17,13,18)],
        [(11,5,13,9),(11,9,12,13)],[(11,6,13,15),(10,17,14,20)],
        [(14,7,17,9),(12,14,16,17)],[(10,7,13,11),(9,11,12,13)],
        [(9,9,11,13),(12,12,14,17)],[(9,5,13,8),(11,8,15,13)],
        [(10,4,17,6),(8,7,11,10)],[(9,6,14,8),(11,15,14,20)],
        [(13,6,17,9),(11,11,15,15)],[(5,7,17,9),(7,12,16,14)],
        [(9,6,13,10),(9,17,13,20)],[(10,4,14,6),(8,9,14,12)],
        [(13,4,18,7),(11,14,16,17)],
    ]
    for part,(x,y,ex,ey) in enumerate(details[i]):
        metal.line([(x,y),(ex,y),(x,ey)],fill=bright if part==0 else trim)
        metal.point((ex,ey),fill=middle)
    metal.line([(8,guard),(11,guard+2),(14,guard+2),(16,guard)],fill=bright)
    for offset in range(2,7,2):
        metal.line([(11,guard+offset),(13,guard+offset-1)],fill='#cba17e')
    image.alpha_composite(Image.composite(relief,Image.new('RGBA',image.size),image.getchannel('A')))
    return image

def scabbard(i):
    image=weapon(i)
    d=ImageDraw.Draw(image)
    dark,middle,bright,trim=PALETTES[i]
    tip=[(10,2),(15,2),(17,7),(16,17),(14,21),(10,21),(8,17),(9,5)]
    if i in (1,4,10,14):
        tip=[(16,2),(20,3),(21,10),(18,16),(12,22),(8,22),(7,20),(13,14)]
    if i not in (2,5,7,8,11,13):
        d.polygon(tip,fill=dark,outline=OUTLINE)
        d.line([tip[0],tip[1],tip[2]],fill=trim,width=2)
        d.line([tip[-3],tip[-4],tip[-5]],fill=middle,width=2)
        d.rectangle((11,14,13,15),fill=bright)
        if i>=6:d.line([(12,8),(14,10),(12,12)],fill=trim)
    else:
        d.line([(10,18),(13,17)],fill=trim,width=2)
        d.line([(11,24),(13,23)],fill=trim,width=2)
    return image

def manual(i):
    _, middle, bright, trim = PALETTES[i]
    trim=trim[:7]
    image = Image.new('RGBA',(32,32))
    d = ImageDraw.Draw(image)
    d.polygon([(9,4),(24,5),(26,8),(24,26),(20,28),(6,26),(6,8)], fill=OUTLINE)
    d.polygon([(9,7),(24,8),(22,25),(8,25)], fill=middle)
    d.line([(9,7),(8,24),(21,25)], fill=bright, width=1)
    d.polygon([(24,10),(25,9),(24,25),(21,27),(9,26),(9,25),(22,25)], fill='#f4d7a0')
    d.rectangle((15,8,21,20), fill='#293647', outline=trim)
    codes=[(0b101,0b111,0b010),(0b110,0b011,0b101),(0b111,0b101,0b111)]
    for r,row in enumerate(codes[i%3]):
        for col in range(3):
            if row & (1<<col):
                d.rectangle((16+col,10+r*3,16+col,11+r*3), fill=bright)
    for y in [10,15,21]:
        d.rectangle((7,y,9,y+1), fill=trim)
    if i>=9:
        d.point((26,6),fill=bright)
        d.point((27,10),fill=bright)
    return image

def main():
    source=SOURCE.read_text(encoding='utf-8')
    weapons=re.findall(r"^  \['([a-z_]+)','[^']+','(?:jian|dao|spear|hammer|scythe)'", source, re.M)
    manuals=re.findall(r"^  \['([a-z-]+)','[^']+','(?:wind|earth|fire|wood|thunder|ice|shadow|sword|sun)'", source, re.M)
    assert len(weapons)==len(manuals)==15
    frames={key:pos for key,pos in json.loads(FRAMES.read_text(encoding='utf-8')).items()
            if key not in weapons and not key.startswith('manual_')}
    icons=ITEMS / 'inventory-icons.png'
    old=Image.open(icons).convert('RGBA')
    height=max(y for x,y in frames.values())+32
    image=Image.new('RGBA',(256,height+128))
    image.paste(old.crop((0,0,256,height)),(0,0))
    arms=Image.new('RGBA',(15*24,32))
    sheaths=Image.new('RGBA',arms.size)
    for i,key in enumerate(weapons):
        art=weapon(i)
        arms.paste(art,(i*24,0))
        sheaths.paste(scabbard(i),(i*24,0))
        x,y=(i%8)*32,height+(i//8)*32
        image.paste(art,(x+4,y))
        frames[key]=[x,y]
    for i,key in enumerate(manuals):
        index=i+15
        x,y=(index%8)*32,height+(index//8)*32
        image.paste(manual(i),(x,y))
        frames['manual_'+key]=[x,y]
    arms.save(ITEMS / 'martial-arms.png')
    sheaths.save(ITEMS / 'martial-arms-back.png')
    image.save(icons)
    FRAMES.write_text(json.dumps(frames,indent=2)+'\n', encoding='utf-8')

if __name__=='__main__':
    main()

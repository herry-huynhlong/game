import json
import math
from pathlib import Path
import random
import sys

from PIL import Image, ImageDraw


output = Path(__file__).resolve().parents[3] / 'public/assets/old-road'
layout = json.load(sys.stdin)
randomizer = random.Random(42037)
size = 32
columns = 48
tiles = {}
pond = layout['pond']
segments = []
for path in layout['paths']:
    for a, b in zip(path['points'], path['points'][1:]):
        segments.append((a, b, path['width'], path.get('main', False)))


def distance(x, y, a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    t = max(0, min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)))
    return math.hypot(x - (a[0] + t * dx), y - (a[1] + t * dy))


for row in range(layout['start'], layout['end']):
    for col in range(66, 153):
        x, y = col * size, row * size
        relevant = [(a, b, w, main) for a, b, w, main in segments
                    if distance(x + 16, y + 16, a, b) < w + 34]
        pond_near = abs(x + 16 - pond['x']) < pond['rx'] + 26 and abs(y + 16 - pond['y']) < pond['ry'] + 26
        if not relevant and not pond_near:
            continue
        tile = Image.new('RGBA', (size, size))
        for j in range(size):
            for i in range(size):
                px, py = x + i, y + j
                if pond_near:
                    ux, uy = (px - pond['x']) / pond['rx'], (py - pond['y']) / pond['ry']
                    shore = math.hypot(ux, uy) + .033 * math.sin(ux * 13 + uy * 10) + .03 * math.sin(uy * 27 - ux * 3)
                    if shore <= 1.06:
                        if shore>.98:
                            color=(78,105,70)
                        elif shore>.91:
                            color=(129,132,91)
                        elif shore>.81:
                            color=(64,120,111)
                        elif py%13==0 and (px + 5*(py//13))%31<9:
                            color=(100,156,146)
                        elif any((px-a)**2+(py-b)**2*3<r for a,b,r in [(4487,4199,37),(4505,4214,30),(4618,4228,57),(4592,4238,23)]):
                            color=(90,133,75)
                        else:
                            color=(43,92+int(7*math.sin(ux*5+uy*12)),105)
                        tile.putpixel((i,j),color+(255,))
                    continue
                if not relevant:
                    continue
                margin, main = min((distance(px, py, a, b) - w, main) for a, b, w, main in relevant)
                roughness = 3.2 * math.sin(px * .09 + py * .026) + 2.5 * math.sin(px * .21 - py * .13)
                margin += roughness
                if margin > 4:
                    continue
                pebble = randomizer.randrange(110)
                shade = int(3 * math.sin(px * .03 + py * .045))
                age = int(5 * math.sin(px * .13) + 3 * math.sin(px * .43))
                stone = main and any(lo + age <= py < hi + age for lo, hi in layout['stone'])
                if stone and margin < -7:
                    line = py // 8
                    join = (px + (line % 2) * 9) % 18
                    value = ((px + (line % 2) * 9) // 18 * 31 + line * 17) % 15
                    if value==6 and pebble<94:
                        base=(143,119,81)
                    else:
                        base = (94, 94, 76) if py % 8 == 7 or join == 17 else (128 + value, 125 + value, 101 + value)
                elif margin > 0:
                    base = (73, 91, 56) if pebble > 25 else (108, 124, 72)
                elif margin > -6:
                    base = (124, 111, 72) if pebble > 10 else (151, 137, 88)
                elif pebble < 4:
                    base = (164, 148, 108)
                elif pebble < 10:
                    base = (112, 88, 62)
                else:
                    base = (142, 116, 79)
                tile.putpixel((i, j), tuple(c + shade for c in base) + (255,))
        if tile.getbbox():
            tiles[(col, row)] = tile

sheet = Image.new('RGBA', (columns * size, math.ceil(len(tiles) / columns) * size))
for i, tile in enumerate(tiles.values()):
    sheet.paste(tile, (i % columns * size, i // columns * size))
sheet.save(output / 'path.png', optimize=True)

# Use the actual legacy terrain palettes so both edges meet the existing map.
terrain = Image.open(output.parent / 'tilesets/gfx5b5_area_terrain.png').convert('RGBA')
ground = Image.new('RGBA', (256, 160))
for shade in range(1, 6):
    for i in range(8):
        grass = terrain.crop((i * 32, 0, (i + 1) * 32, 32))
        shade_grass = terrain.crop(((i + 8) * 32, 0, (i + 9) * 32, 32))
        ground.paste(Image.blend(grass, shade_grass, shade / 6), (i * 32, (shade - 1) * 32))
ground.save(output / 'ground.png', optimize=True)

props = Image.new('RGBA', (768, 160))
def sprite(index):
    image = Image.new('RGBA', (128, 160))
    return image, ImageDraw.Draw(image)


# Open pavilion, with a sill and rear balustrade visible through the two columns.
im, d = sprite(0)
d.polygon([(10,139),(26,128),(111,129),(124,141),(112,150),(23,150)], fill='#1c3325')
d.polygon([(17,129),(111,129),(104,145),(24,145)], fill='#747962')
d.rectangle((27,135,102,144), fill='#4b5448')
for y in (134,138,142):
    d.line((31,y,98,y), fill='#a6a085')
d.rectangle((27,99,99,130), fill='#352d28')
d.rectangle((33,102,93,120), fill='#465041')
d.line((35,115,91,115), fill='#b68554', width=3)
for x in range(40,91,8):
    d.line((x,115,x,127), fill='#754e36', width=2)
for x in (26,94):
    d.rectangle((x-3,120,x+7,134), fill='#555949')
    d.rectangle((x,88,x+4,131), fill='#68402e')
    d.line((x,93,x,130), fill='#c38b58')
d.polygon([(39,62),(87,62),(95,74),(113,96),(122,88),(119,100),(103,105),(23,105),(8,100),(2,89),(13,96),(31,73)],fill='#182e2b')
d.polygon([(38,65),(87,65),(96,82),(111,97),(94,99),(27,99),(16,96),(30,80)],fill='#35625a')
for x in range(39,89,4):
    d.line((x,68,round(63+(x-63)*1.74),98),fill='#528174')
    d.line((x+1,69,round(63+(x-62)*1.74),98),fill='#213f3a')
d.line((39,62,87,62),fill='#9c865a',width=2)
d.line((9,100,23,104,103,104,119,100),fill='#be924f',width=2)
for x in (21,105):
    d.line((x,103,x,110),fill='#513727')
    d.rounded_rectangle((x-4,108,x+4,119),radius=2,fill='#9e422e')
    d.rectangle((x-2,110,x+2,116),fill='#ffd47c')
props.paste(im,(0,0))

im,d = sprite(1)
for x in (24,104):
    d.rectangle((x,102,x+3,143),fill='#634733')
    d.line((x,106,x,138),fill='#b98a57')
for y in (105,120):
    d.polygon([(18,y),(108,y),(116,y+6),(106,y+12),(18,y+12)],fill='#422e23')
    d.polygon([(20,y+1),(105,y+1),(112,y+5),(105,y+9),(20,y+9)],fill='#976c3e')
    d.line((21,y+2,105,y+2),fill='#ba9661')
props.paste(im,(128,0))

im,d = sprite(2)
d.ellipse((26,132,108,145),fill='#263d27')
d.polygon([(28,132),(49,117),(92,117),(107,128),(102,137),(42,139)],fill='#4a3826')
d.polygon([(34,130),(54,120),(92,120),(103,126),(89,128),(55,134)],fill='#866141')
for i in range(4):
    d.line((43+i*8,132-i*2,68+i*8,123),fill='#a4794b')
d.ellipse((88,121,106,136),fill='#ae8658',outline='#593f2c',width=2)
d.ellipse((92,124,102,133),outline='#805936')
props.paste(im,(256,0))

for variant in range(3,6):
    im,d = sprite(variant)
    for _ in range(14):
        x,y=randomizer.randrange(29,103),randomizer.randrange(116,143)
        color=randomizer.choice(['#658155','#6e904f','#9d9a62','#4c6a48'])
        d.line((x,y,x-3,y-4,x-3,y-6),fill=color)
        d.line((x,y,x+3,y-4),fill='#516f45')
        if randomizer.randrange(3)==0:
            cap=('#d7bd74','#cf9694','#9bb2af')[variant-3]
            d.rectangle((x-4,y-8,x-2,y-6),fill=cap)
    if variant==5:
        for x,y in [(51,133),(57,138),(67,128)]:
            d.rectangle((x,y,x+1,y+4),fill='#ae9867')
            d.ellipse((x-3,y-3,x+4,y+1),fill='#c68355')
            d.point((x,y-2),fill='#e6b27b')
    props.paste(im,(variant*128,0))
props.save(output / 'props.png', optimize=True)
json.dump({'columns':columns,'rows':sheet.height//size,'tiles':list(tiles)},sys.stdout)

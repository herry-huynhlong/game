from pathlib import Path
from random import Random
from PIL import Image, ImageDraw

OUTPUT = Path(__file__).resolve().parents[3] / 'public/assets/west-wilds'
INK = '#292428'


def minerals():
    image = Image.new('RGBA', (240, 48))
    for i, (dark, mid, light) in enumerate([
        ('#295e58', '#519c80', '#b8ebbe'), ('#285777', '#3a9bb0', '#c5f3e7'),
        ('#593f7c', '#8c65ab', '#ebc5ed'), ('#875431', '#d29547', '#fff0af')]):
        patch = Image.new('RGBA', (48, 48))
        d = ImageDraw.Draw(patch)
        d.ellipse((3, 34, 44, 43), fill=(23, 35, 37, 90))
        d.polygon([(3, 36), (9, 27), (26, 24), (41, 30), (44, 37), (36, 42), (13, 41)],
                  fill='#46534b', outline='#2b3936')
        d.line([(8, 35), (16, 32), (22, 34), (32, 31), (39, 34)], '#72806a', width=2)
        for x, y, w, h in [(11, 36, 8, 18), (21, 37, 12, 28 + i * 2), (33, 38, 8, 15 + i)]:
            d.polygon([(x, y), (x-4, y-h+6), (x+1, y-h), (x+w-2, y-h+7), (x+w, y-3)],
                      fill=dark, outline='#263a3b')
            d.polygon([(x-2, y-h+7), (x+1, y-h+2), (x+w-4, y-h+7), (x+3, y-4)], fill=mid)
            d.line([(x+1, y-h+3), (x+2, y-h+9), (x+4, y-7)], light, width=1)
        image.alpha_composite(patch, (48*i, 0))
    d = ImageDraw.Draw(image)
    d.rectangle((214, 23, 216, 42), fill='#633d32')
    d.rectangle((206, 15, 225, 31), fill='#7f4e35', outline='#332a29')
    d.rectangle((208, 17, 223, 29), fill='#ddb77b')
    d.line([(211, 24), (214, 21), (220, 21), (219, 26), (213, 27)], '#705b44', width=2)
    image.save(OUTPUT / 'spirit-veins.png')


def eagle(direction, pose, frame, elite):
    image = Image.new('RGBA', (112, 112))
    d = ImageDraw.Draw(image)
    side = direction in (1, 2)
    flip = direction == 1
    fly = pose in (1, 3, 7)
    flap = [12, -5, -22, -4][frame] if fly else 2
    y0 = 64 if fly else 73
    if pose == 6:
        y0 += frame * 3
    gold = '#e89341' if not elite else '#f8bb4d'
    ember = '#a84b32' if not elite else '#cb5038'
    cream, shade = '#ffdfa2', '#634054'

    def project(point):
        x, y = point
        if side:
            x += (y - 4) // 4
        return (56 - x if flip else 56 + x, y0 + y)

    def p(points, color):
        d.polygon([project(pt) for pt in points], fill=color, outline=INK)

    def line(points, color, width=1):
        d.line([project(pt) for pt in points], fill=color, width=width)

    for sign in (-1, 1):
        span = (44 if fly else 21) - (9 if side and sign == -1 else 0)
        wing = [(sign*x, y) for x, y in [(5, -12), (span-14, flap-14), (span, flap-17),
                 (span-3, flap-4), (span-13, flap+7), (span-20, flap+10), (9, 9)]]
        p(wing, shade)
        for feather in range(5):
            x = span-3-feather*4
            base = 8+feather*2
            a = flap-13+feather*4
            p([(sign*base,-10+feather*2),(sign*x,a),(sign*(x-2),a+9),(sign*(x-7),a+14),
               (sign*(base-2),6+feather)], ember if feather%2 else '#88443b')
            line([(sign*base,-8+feather*2),(sign*(x-2),a+2)], gold)
    p([(-9,-3),(8,-4),(15,16),(5,20),(-4,17),(-12,20)], shade)
    for x in (-6, 7):
        line([(x,8),(x+2,14),(x-3,16),(x+4,16)], '#d0864a', 2)
    p([(-13,-13),(-7,-21),(6,-23),(13,-12),(12,3),(6,10),(-5,10),(-13,4)], '#483342')
    p([(-9,-12),(-3,-16),(8,-14),(9,-4),(2,7),(-5,5),(-8,1)], ember)
    line([(-7,1),(-3,3),(2,3),(7,-1)], gold, 2)
    hx = 10 if side else 0
    p([(hx-12,-24),(hx-8,-32),(hx+2,-34),(hx+10,-28),(hx+12,-23),(hx+5,-14),(hx-5,-15)], gold)
    p([(hx-10,-24),(hx-2,-30),(hx+5,-29),(hx+9,-24),(hx+3,-19),(hx-5,-18)], cream)
    if direction != 3:
        ex = hx+6 if side else 0
        p([(ex-4,-24),(ex+6,-25),(ex+11,-21),(ex+7,-17),(ex+4,-20),(ex-3,-21)], '#be733d')
        for x in ([hx+3] if side else [-6, 6]):
            line([(x-1,-25),(x+1,-24)], INK, 2)
            line([(x,-25),(x,-25)], '#fff4c6')
    line([(hx-7,-30),(hx-1,-34),(hx+4,-35)], ember, 2)
    if pose in (2, 7):
        for k in range(frame+1):
            x = (k*23+16)%57-28
            line([(x,-12-k*5),(x+2,-16-k*5)], gold, 2)
    return image


def groves():
    # Individual silhouettes. Branch tips and canopy clusters are laid out per specimen.
    models = [
        ('#356452','#80a963',[(-56,-75,23),(-39,-106,30),(-7,-119,34),(26,-109,30),(54,-79,24),(9,-80,33)], [(-57,-72),(-32,-103),(-5,-123),(53,-80)]),
        ('#78643e','#edd279',[(-35,-78,22),(-24,-109,25),(4,-127,29),(36,-108,22),(18,-85,21)], [(-36,-78),(-26,-110),(4,-130),(36,-108)]),
        ('#864b64','#efafae',[(-51,-80,24),(-32,-105,20),(5,-117,25),(48,-91,25),(35,-70,22)], [(-55,-77),(-32,-103),(8,-118),(47,-88)]),
        ('#4f664b','#a6ad65',[(-39,-69,19),(-31,-98,23),(38,-71,21),(57,-91,18)], [(-42,-66),(-33,-107),(11,-139),(57,-91)]),
        ('#753e3d','#cb744d',[(-54,-89,25),(-29,-110,26),(9,-125,28),(41,-103,24),(57,-75,16)], [(-52,-84),(-25,-109),(10,-125),(56,-75)]),
        ('#374657','#7f939c',[(-50,-90,22),(-34,-110,24),(-2,-120,29),(35,-110,25),(55,-89,20)], [(-53,-92),(-37,-108),(0,-120),(57,-92)]),
        ('#554841','#a99876',[], [(-48,-90),(-24,-125),(5,-136),(27,-102),(56,-88)]),
        ('#574365','#bd8bb6',[(-34,-78,18),(-17,-110,19),(3,-125,23),(26,-94,19),(48,-76,17)], [(-38,-81),(-19,-108),(3,-130),(47,-80)]),
        ('#355a51','#91c59f',[(-61,-71,20),(-49,-102,27),(-28,-125,27),(3,-138,25),(31,-122,26),(57,-96,23),(33,-82,25)], [(-60,-75),(-45,-107),(-29,-126),(4,-140),(60,-94)]),
    ]
    sheet = Image.new('RGBA', (176*len(models), 176))
    for i, (dark, light, leaves, branches) in enumerate(models):
        rng = Random(681+i)
        image = Image.new('RGBA', (176, 176))
        d = ImageDraw.Draw(image)
        x0, y0 = 88, 156
        d.polygon([(48,152),(82,145),(132,151),(151,159),(119,168),(69,167)], fill=(27,40,34,77))
        bend = [-7,4,-9,6,2,-4,8,-8,-3][i]
        fork = (x0+bend, y0-55)
        for k, (x,y) in enumerate(branches):
            arm = [fork, (x0+(x+bend)//2,y0+(y-55)//2+7),(x0+x,y0+y)]
            d.line(arm, '#302a2a', width=12-k)
            d.line([(x-1,y-1) for x,y in arm], '#755847', width=7-k)
            d.line([(x-3,y-2) for x,y in arm], '#aa8863', width=2)
            tx,ty=arm[-1]
            d.line([(tx,ty),(tx-10,ty-14),(tx-12,ty-22)], '#624b40', width=3)
        width = [16,12,13,14,15,11,13,11,19][i]
        d.polygon([(x0-38,y0+3),(x0-width,y0-15),(x0-8,y0-32),(fork[0]-5,fork[1]),
                   (fork[0]+7,fork[1]-5),(x0+10,y0-33),(x0+width,y0-9),(x0+34,y0+7),
                   (x0+13,y0+3),(x0+9,y0+12),(x0-4,y0+4),(x0-22,y0+9)],
                  fill='#694d3c',outline='#302a2a')
        for j in range(11):
            x=x0+rng.randint(-10,10)
            d.line([(x-6,y0+rng.randrange(-9,4)),(x,y0-18),(x+bend//2,y0-39-rng.randrange(14))],
                   rng.choice(('#4e3932','#8b6850','#a37d57')),width=rng.choice((1,1,2)))
        if i in (0,3,6,8):
            d.polygon([(85,139),(86,127),(90,120),(96,126),(94,135),(90,140)], fill='#332d2a')
        for x,y,r in leaves:
            cx,cy=x0+x,y0+y
            for k in range(14):
                dx,dy=rng.randint(-r+6,r-6),rng.randint(-r//2,r//2)
                if dx*dx/(r*r)+dy*dy/((r*.66)**2)>.88:
                    continue
                w,h=rng.randint(7,16),rng.randint(5,11)
                a,b=cx+dx,cy+dy
                d.polygon([(a-w,b),(a-w+2,b-4),(a-4,b-h),(a+4,b-h-1),(a+w-3,b-4),
                           (a+w,b+2),(a+4,b+h-1),(a-5,b+h)],fill=dark,outline='#293f3a')
                d.line([(a-w+4,b-3),(a-3,b-h+2),(a+3,b-h+2),(a+7,b-h+4)],light,width=2)
                if i in (2,3,4,7):
                    d.point((a,b-2),light)
        if i in (0,5,8):
            for j in range(8):
                x=34+j*14+rng.randrange(-4,5)
                y=73+rng.randrange(-8,7)
                d.line([(x,y),(x-3,y+13),(x-3,y+22+rng.randrange(11))],dark,width=2)
                d.line([(x-2,y+6),(x-4,y+16)],light)
        if i==3:
            d.line([(98,21),(94,36),(99,44),(91,64),(95,71)],'#ddb487',width=2)
        sheet.alpha_composite(image,(176*i,0))
    sheet.save(OUTPUT / 'living-grove.png')


def forest_floor():
    image = Image.new('RGBA', (240, 48))
    d = ImageDraw.Draw(image)
    for frame in range(5):
        offset = frame * 48

        def poly(points, color):
            d.polygon([(offset+x, y) for x,y in points], fill=color, outline='#343938')

        def stroke(points, color, width=1):
            d.line([(offset+x, y) for x,y in points], fill=color, width=width)

        if frame == 0:
            poly([(3,38),(7,29),(13,28),(34,15),(42,19),(45,27),(39,31),(14,42)], '#725a45')
            poly([(5,35),(9,30),(16,31),(19,36),(14,41),(8,40)], '#b58b5e')
            stroke([(9,36),(12,33),(15,34),(16,37),(13,39)], '#634d3c')
            stroke([(19,32),(28,25),(36,22),(40,23)], '#576b51', 3)
            stroke([(20,36),(30,30),(38,29)], '#9b7550', 2)
        elif frame == 1:
            poly([(10,39),(14,32),(14,16),(18,12),(30,12),(36,18),(35,34),(40,39),(25,43)], '#6b5343')
            poly([(14,18),(18,12),(30,12),(35,17),(30,22),(20,23)], '#af8258')
            stroke([(18,17),(22,15),(30,15),(31,17),(28,19),(22,20)], '#715843')
            stroke([(18,24),(17,34),(14,38)], '#a67f5f', 2)
        elif frame == 2:
            for x,y in [(12,38),(23,34),(34,39),(30,29)]:
                stroke([(x,y),(x+1,y-9)], '#b2a07f', 3)
                poly([(x-6,y-8),(x-5,y-12),(x,y-15),(x+5,y-13),(x+7,y-9),(x+5,y-7),(x-4,y-6)], '#9d6776')
                stroke([(x-3,y-11),(x-1,y-13),(x+2,y-13)], '#e6abaf')
        elif frame == 3:
            for x,y in [(10,36),(19,32),(28,38),(36,31),(25,29)]:
                stroke([(x-2,y+4),(x,y-6)], '#658858')
                stroke([(x,y),(x+3,y-2)], '#91a565')
                stroke([(x-2,y-6),(x+2,y-6)], '#e8c381' if x%2 else '#c9a6c6',2)
        else:
            poly([(6,38),(10,28),(17,20),(29,21),(39,30),(44,37),(31,42),(17,41)], '#626866')
            poly([(10,32),(17,22),(28,23),(34,27),(25,30),(18,35)], '#728464')
            stroke([(14,30),(19,25),(23,25),(24,23)], '#a0a877',2)
            stroke([(11,34),(17,34),(22,32),(24,36)], '#798969')
    image.save(OUTPUT / 'living-floor.png')


minerals()
groves()
forest_floor()
for elite in (False, True):
    sheet = Image.new('RGBA', (112*16, 112*8))
    for pose in range(8):
        for direction in range(4):
            for frame in range(4):
                sheet.alpha_composite(eagle(direction,pose,frame,elite),((direction*4+frame)*112,pose*112))
    sheet.save(OUTPUT / ('eagle-elite.png' if elite else 'eagle-normal.png'))

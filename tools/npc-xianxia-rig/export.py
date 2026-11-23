from pathlib import Path
from PIL import Image, ImageDraw, ImageOps
import colorsys
import json

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'art/source/npc-xianxia-rig'
OUT = ROOT / 'public/assets/npc-xianxia-rig'
SIZE = (64, 96)
# Pixel masks authored against the normalized front, rear and profile. The
# source only supplies visible pixels. Hidden shoulder/neck patches are redrawn.
MASKS = {
 'down': {'hairBack': [(14,34),(39,31),(46,40),(44,43),(39,41),(34,37),(26,36),(21,41),(14,43)],
          'face': [(24,29),(28,27),(36,27),(41,31),(42,35),(37,39),(29,39),(24,35)],
          'leftArm': [(20,41),(25,45),(24,56),(23,65),(16,65),(14,56),(18,47)],
          'rightArm': [(40,40),(45,47),(49,56),(47,65),(40,65),(40,58),(37,47)]},
 'up': {'hairBack': [(17,24),(47,24),(49,41),(44,40),(40,42),(38,46),(31,49),(25,45),(22,41),(15,43)],
        'leftArm': [(20,40),(25,45),(24,56),(23,65),(15,65),(14,55),(17,46)],
        'rightArm': [(40,40),(46,46),(49,55),(48,65),(40,65),(39,55),(38,46)]},
 'right': {'hairBack': [(17,23),(34,22),(38,38),(35,43),(30,50),(26,48),(20,42),(12,41)],
           'face': [(38,27),(43,24),(46,27),(46,36),(42,38),(36,37),(32,32)],
           'rightArm': [(31,40),(37,42),(39,47),(39,53),(43,57),(41,61),(38,65),(31,64),(30,58),(25,57),(26,52)]},
}


def normalize(source, index):
    width, height = source.size
    crop = source.crop((width * index // 3, 0, width * (index + 1) // 3, height))
    crop.putalpha(crop.getchannel('A').point(lambda a: 255 if a >= 200 else 0))
    crop = crop.crop(crop.getbbox())
    crop = crop.resize((round(crop.width * 90 / crop.height), 90), Image.Resampling.NEAREST)
    rgba = crop.convert('RGB').quantize(colors=38, dither=Image.Dither.NONE).convert('RGBA')
    rgba.putalpha(crop.getchannel('A'))
    canvas = Image.new('RGBA', SIZE)
    canvas.alpha_composite(rgba, ((64 - crop.width)//2, 3))
    return canvas


def palette(image, target, hair=False):
    result = image.copy()
    for y in range(96):
        for x in range(64):
            r,g,b,a = image.getpixel((x,y))
            if not a:
                continue
            h,s,v = colorsys.rgb_to_hsv(r/255,g/255,b/255)
            if hair:
                if target == 'ink' or .38 < h < .57 and s > .26:
                    continue
                h,s,v = (.62,.16,min(.92,v*1.35+.21)) if target == 'silver' else (.97,.58,min(.88,v*1.18+.10))
            elif .37 < h < .60 and s > .24:
                h,s,v = ((.61,.34,min(.94,v*1.38+.23)) if target=='moon' else (.96,.66,min(.86,v*1.14+.11)))
            else:
                continue
            result.putpixel((x,y),tuple(round(n*255) for n in colorsys.hsv_to_rgb(h,s,v))+(a,))
    return result


def split(image, direction):
    labels = Image.new('L', SIZE)
    draw = ImageDraw.Draw(labels)
    names = ['outerCloth','hairFront','hairBack','face','leftArm','rightArm','leftShoe','rightShoe','innerCloth','pants','headwear','accessory','eyes','eyebrows','body']
    ids = {name:i for i,name in enumerate(names)}
    draw.rectangle((0,0,63,34),fill=ids['hairFront'])
    # Boots keep their cuffs. Trousers remain on the same hip timeline.
    draw.rectangle((0,83,31,95),fill=ids['leftShoe'])
    draw.rectangle((32,83,63,95),fill=ids['rightShoe'])
    if direction=='right':
        draw.rectangle((0,83,63,95),fill=ids['rightShoe'])
    for name,region in MASKS[direction].items():
        draw.polygon(region,fill=ids[name])
    for y in range(96):
        for x in range(64):
            if not image.getpixel((x,y))[3]:
                continue
            r,g,b,_=image.getpixel((x,y))
            label=names[labels.getpixel((x,y))]
            warm = r>g+17 and g>b+3 and r>100
            if label=='face':
                if y>=36 and warm:
                    label='body'
                elif y in (25,26) and r<120:
                    label='eyebrows'
                elif 26<=y<=30 and (r<120 or g>r):
                    label='eyes'
                elif not warm and (max(r,g,b)<105 or b>r):
                    label='hairFront'
            elif label=='hairFront' and y<12 and r>g>b and r>100:
                label='headwear'
            elif label=='outerCloth':
                if y in range(37,81) and r>130 and abs(r-g)<46 and g>b and r-b<68:
                    label='innerCloth'
                elif y>=68 and b>r*1.14 and b>g*1.08:
                    label='pants'
                elif direction!='up' and 48<=y<=65 and x in range(32 if direction=='down' else 38,42 if direction=='down' else 47) and g>r*1.25 and g>b*1.06:
                    label='accessory'
            labels.putpixel((x,y),ids[label])
    parts={name:Image.new('RGBA',SIZE) for name in names}
    for y in range(96):
        for x in range(64):
            pixel=image.getpixel((x,y))
            if pixel[3]:
                parts[names[labels.getpixel((x,y))]].putpixel((x,y),pixel)
    # Clothe the section behind hair and sleeve. The source has no hidden pixels.
    patch=Image.new('RGBA',SIZE)
    d=ImageDraw.Draw(patch)
    if direction=='right': d.polygon([(29,40),(36,37),(41,48),(39,56),(32,61),(29,53)],fill='#28433f')
    else: d.polygon([(22,42),(28,36),(36,36),(42,43),(40,58),(24,58)],fill='#28433f')
    # Fill the robe under the removable jade ornament.
    for y in range(48,66):
        for x in range(64):
            if parts['accessory'].getpixel((x,y))[3]:
                patch.putpixel((x,y), (34,59,56,255))
    patch.alpha_composite(parts['outerCloth']); parts['outerCloth']=patch
    if direction=='right':
        # Far foot and forearm have their own silhouettes and lower contrast.
        for src,dst,off in [('rightShoe','leftShoe',(-3,-1)),('rightArm','leftArm',(3,-1))]:
            piece=parts[src]
            dark=Image.new('RGBA',SIZE)
            dark.putdata([(int(r*.69),int(g*.72),int(b*.75),a) for r,g,b,a in piece.getdata()])
            parts[dst].alpha_composite(dark,off)
    return parts


def style_hair(image, part, style, direction):
    result=image.copy()
    if style=='bun':
        return result
    if part=='hairFront':
        # The original bun sits above row 13. Keep the sculpted crown and fringe.
        result.paste((0,0,0,0),(0,0,64,13 if style=='loose' else 11))
    elif style=='short':
        result.paste((0,0,0,0),(0,35 if direction=='up' else 36,64,96))
    else:
        # Longer loose locks trail behind the existing shape rather than scaling the head.
        lock=result.crop((17,30,43,47))
        under=Image.new('RGBA',SIZE)
        under.alpha_composite(lock,(16,36))
        under.alpha_composite(result)
        result=under
    return result


source=Image.open(SOURCE/'turnaround.png').convert('RGBA')
frames={}
for index,direction in enumerate(('down','up','right')):
    parts=split(normalize(source,index),direction)
    for facing in ([direction,'left'] if direction=='right' else [direction]):
        for part,image in parts.items():
            def add(key, artwork):
                frames[f'{facing}/{key}']=ImageOps.mirror(artwork) if facing=='left' else artwork
            add(part,image)
            if part in ('pants','leftShoe','rightShoe'):
                alternate=image.copy()
                alternate.putdata([(round(r*.84),round(g*.79),round(b*.72),a) if a and b>r else (r,g,b,a) for r,g,b,a in image.getdata()])
                add(f'{part}/charcoal',alternate)
            if part in ('outerCloth','leftArm','rightArm'):
                for outfit in ('moon','ember'):
                    add(f'{part}/{outfit}',palette(image,outfit))
            if part in ('hairFront','hairBack'):
                for style in ('bun','short','loose'):
                    for color in ('ink','silver','red'):
                        add(f'{part}/{style}/{color}',palette(style_hair(image,part,style,direction),color,True))

# Reuse the game's sword and saber artwork. Grip coordinates are checked on
# the selected source poses and measured relative to nontransparent pixels.
weapon_grips={}
for weapon,source_name in [('sword','jian'),('saber','dao')]:
    sheet=Image.open(ROOT/f'public/assets/weapons/{source_name}-grip.png').convert('RGBA')
    for i,facing in enumerate(('down','up','left','right')):
        image=sheet.crop((0,i*40,32,(i+1)*40));box=image.getbbox()
        assert box, (weapon,facing)
        image=image.crop(box)
        pixels=[(x,y) for y in range(image.height) for x in range(image.width) if image.getpixel((x,y))[3]]
        grip=min(pixels,key=lambda xy: (abs(xy[1]-(image.height-4)),abs(xy[0]-(image.width-4 if facing in ('up','left') else 3))))
        key=f'{facing}/weapon/{weapon}'
        frames[key]=image
        weapon_grips[key]=grip

atlas=Image.new('RGBA',(1024,((len(frames)+15)//16)*96))
metadata={}
for i,(key,image) in enumerate(frames.items()):
    x,y=(i%16)*64,(i//16)*96
    atlas.alpha_composite(image,(x,y))
    metadata[key]={'frame':{'x':x,'y':y,'w':image.width,'h':image.height},'rotated':False,'trimmed':False}
atlas.save(OUT/'parts.png')
(OUT/'parts.json').write_text(json.dumps({'frames':metadata,'meta':{'image':'parts.png','size':{'w':atlas.width,'h':atlas.height}}}),encoding='utf-8')
(OUT/'grips.json').write_text(json.dumps(weapon_grips),encoding='utf-8')
print(f'{len(frames)} atlas frames, {atlas.width}x{atlas.height}')

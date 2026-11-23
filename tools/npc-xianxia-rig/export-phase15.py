"""Build independent directional pixel layers from reviewed turnaround landmarks."""
import json
import runpy
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps
import colorsys

ROOT=Path(__file__).resolve().parents[2]
BASE=Path(__file__).with_name('export.py')
previous=runpy.run_path(str(BASE))
OUT=ROOT/'public/assets/npc-xianxia-rig'
SOURCE=ROOT/'art/source/npc-xianxia-rig/phase15'
SIZE=(64,96)
# For each view: hairline at neck, eyes, mouth, shoulder anchors, hand anchors, shoe seam.
MARKS={
 'villageMan':[(31,[(28,23),(36,23)],(32,27),[(22,36),(41,36)],[(20,61),(44,61)],83),(31,[],None,[(22,37),(41,37)],[(20,61),(44,61)],83),(31,[(39,23)],(40,27),[(33,37),(37,38)],[(34,61),(37,61)],83)],
 'villageWoman':[(31,[(28,23),(36,23)],(32,27),[(23,37),(41,37)],[(20,61),(43,61)],85),(31,[],None,[(23,37),(41,37)],[(20,61),(43,61)],85),(31,[(39,23)],(40,27),[(34,37),(37,38)],[(35,60),(37,61)],85)],
 'swordsman':[(23,[(29,17),(34,17)],(32,20),[(23,27),(39,27)],[(21,51),(41,51)],72),(23,[],None,[(22,28),(40,28)],[(21,51),(42,51)],72),(23,[(39,16)],(39,20),[(37,28),(33,27)],[(36,51),(34,51)],73)],
 'demon':[(23,[(30,15),(34,15)],(32,19),[(22,25),(43,25)],[(20,51),(45,51)],81),(23,[],None,[(21,26),(43,26)],[(17,51),(46,51)],80),(24,[(39,16)],(39,20),[(38,26),(35,26)],[(36,51),(39,51)],81)],
 'fairy':[(23,[(30,18),(34,18)],(32,21),[(23,29),(40,29)],[(22,53),(44,53)],88),(23,[],None,[(24,29),(40,29)],[(20,52),(43,52)],87),(24,[(40,17)],(40,20),[(38,29),(35,29)],[(39,51),(36,51)],87)],
 'monk':[(18,[(29,11),(34,11)],(32,15),[(20,26),(44,26)],[(13,53),(50,53)],70),(18,[],None,[(19,27),(44,27)],[(13,53),(50,53)],71),(18,[(36,11)],(37,15),[(32,26),(35,28)],[(32,53),(35,53)],72)],
 'elder':[(33,[(29,25),(34,25)],(32,28),[(24,40),(39,40)],[(21,61),(41,61)],86),(32,[],None,[(23,40),(40,40)],[(19,60),(43,60)],86),(33,[(43,25)],(43,28),[(38,39),(39,38)],[(36,61),(39,61)],86)],
 'original':[(38,[(28,30),(35,30)],(32,34),[(23,44),(41,44)],[(21,62),(43,62)],83),(38,[],None,[(24,44),(40,44)],[(20,62),(43,62)],83),(38,[(41,29)],(41,34),[(36,44),(39,44)],[(36,61),(39,61)],83)],
}
MARKS['workMan']=MARKS['villageMan']
MARKS['workWoman']=MARKS['villageWoman']
FACES={'workMan':['thanh_y','middle'],'workWoman':['fair','cold'],'villageMan':['thanh_y','middle'],'villageWoman':['fair','cold'],'swordsman':['thanh_y','middle'],'demon':['thanh_y','middle'],'fairy':['fair','cold'],
       'monk':['thanh_y','middle'],'elder':['elder','middle'],'original':['thanh_y','middle']}


def normalize(image,index,rig):
    w,h=image.size
    image=image.crop((w*index//3,0,w*(index+1)//3,h))
    image.putalpha(image.getchannel('A').point(lambda a:255 if a>=200 else 0))
    image=image.crop(image.getbbox())
    height=84 if rig=='elder' else 90
    image=image.resize((round(image.width*height/image.height),height),Image.Resampling.NEAREST)
    alpha=image.getchannel('A')
    image=image.convert('RGB').quantize(colors=46,dither=Image.Dither.NONE).convert('RGBA')
    image.putalpha(alpha)
    frame=Image.new('RGBA',SIZE);frame.alpha_composite(image,((64-image.width)//2,93-height))
    return frame


def tone(image,target,rig,hair=False):
    result=image.copy();pixels=[]
    hue={'swordsman':.52,'demon':.98,'fairy':.75,'monk':.08,'elder':.62,'original':.48,'villageMan':.66,'villageWoman':.18,'workMan':.66,'workWoman':.18}[rig]
    for r,g,b,a in image.getdata():
        h,s,v=colorsys.rgb_to_hsv(r/255,g/255,b/255)
        distance=min(abs(h-hue),1-abs(h-hue))
        if a and hair and target!='ink':
            h,s,v=(.63,.18,min(.97,.20+v*.95)) if target=='silver' else (.07,.42,min(.72,.05+v*.86)) if target=='chestnut' else (.97,.63,min(.90,.08+v*.89))
        elif a and hair and target=='ink' and rig in ('demon','elder'):
            h,s,v=.68,.20,.07+v*.55
        elif a and not hair and distance<.14 and s>.22:
            h,s=(.61,s*.62) if target=='moon' else (.09,min(.59,s*.82)) if target=='earth' else (.96,min(.88,s*1.1))
        else:
            pixels.append((r,g,b,a));continue
        pixels.append(tuple(round(c*255) for c in colorsys.hsv_to_rgb(h,s,v))+(a,))
    result.putdata(pixels);return result


def split(frame,rig,index,mark):
    head,eyes,mouth,shoulders,hands,shoe=mark
    names=['outerCloth','body','face','hairFront','hairBack','leftArm','rightArm','leftShoe','rightShoe','pants','innerCloth','headwear','accessory','beard']
    parts={name:Image.new('RGBA',SIZE) for name in names}
    arms=Image.new('L',SIZE);draw=ImageDraw.Draw(arms)
    for i,((sx,sy),(hx,hy)) in enumerate(zip(shoulders,hands),1):
        if index==2 and i==2: continue
        radius=6 if rig in ('demon','monk','elder','fairy') else 4
        draw.polygon([(sx-radius,sy-3),(sx+radius,sy-3),(hx+4,hy-6),(hx+4,hy+5),(hx-4,hy+5),(hx-5,hy-5)],fill=i)
    for y in range(96):
        for x in range(64):
            rgba=frame.getpixel((x,y));r,g,b,a=rgba
            if not a: continue
            skin=r>110 and r>g+15 and g>b+7 and g>r*.58
            hair_color=(b>r*.95 and r<110) if rig=='fairy' else (r>g*1.35 and r<130) if rig=='demon' else max(r,g,b)<100
            label='outerCloth'
            if y>=shoe and (rig!='demon' or 18<=x<=47): label='leftShoe' if index!=2 and x<32 else 'rightShoe'
            elif y<head:
                if rig=='monk': label='face' if index!=1 else 'body'
                elif rig=='elder' and index!=1 and y>=29 and (27<=x<=36 if index==0 else x>=40) and min(r,g,b)>113 and max(r,g,b)-min(r,g,b)<55: label='beard'
                elif index!=1 and skin and eyes and y>=eyes[0][1]-5: label='face'
                elif rig=='villageMan' and 7<=y<=17 and b>r and b>g:label='headwear'
                elif rig=='fairy' and y<12 and r>g>b and r>120: label='headwear'
                else: label='hairFront' if y<head-5 else 'hairBack'
            elif rig=='elder' and index!=1 and y<48 and (27<=x<=36 if index==0 else x>=40) and min(r,g,b)>113 and max(r,g,b)-min(r,g,b)<55:
                label='beard'
            elif rig in ('fairy','demon') and index!=0 and y<({'fairy':73,'demon':42}[rig]) and hair_color and (26<=x<=37 if index==1 else x<31): label='hairBack'
            elif arms.getpixel((x,y)): label='rightArm' if index==2 or arms.getpixel((x,y))==2 else 'leftArm'
            elif rig in ('swordsman','monk','villageMan') and y>=66 and max(r,g,b)<110: label='pants'
            elif rig in ('fairy','swordsman') and y<head+16 and min(r,g,b)>155: label='innerCloth'
            elif rig=='fairy' and y in range(31,52) and g>r*1.16 and g>b*1.03:label='accessory'
            parts[label].putpixel((x,y),rgba)
    if index==2:
        for first,second,offset in [('rightShoe','leftShoe',(-4,-2)),('rightArm','leftArm',(3,-1))]:
            dark=Image.new('RGBA',SIZE)
            dark.putdata([(int(r*.72),int(g*.72),int(b*.76),a) for r,g,b,a in parts[first].getdata()]);parts[second].alpha_composite(dark,offset)
    # Patch hidden torso pixels at moving seams, using the material under the collar.
    seam=Image.new('RGBA',SIZE);d=ImageDraw.Draw(seam)
    if index==2:
        sx,sy=shoulders[0];d.polygon([(sx-4,sy),(sx+4,sy),(sx+2,sy+14),(sx-4,sy+13)],fill={'fairy':'#574d82','elder':'#474b63','demon':'#44212c','monk':'#9a4c23'}.get(rig,'#284347'))
    else:
        (lx,ly),(rx,ry)=shoulders;d.polygon([(lx,ly),(rx,ry),(rx-3,ry+13),(lx+3,ly+13)],fill={'fairy':'#574d82','elder':'#474b63','demon':'#44212c','monk':'#9a4c23'}.get(rig,'#284347'))
    seam.alpha_composite(parts['outerCloth']);parts['outerCloth']=seam
    return parts


def face_frames(face,mark,rig):
    _,eyes,mouth,*_=mark
    for style in FACES[rig]:
        for mood in ('neutral','warm','cold'):
            layer=face.copy();d=ImageDraw.Draw(layer)
            if eyes and mouth:
                for x,y in eyes:
                    if layer.getpixel((x,y))[3]:
                        if style in ('middle','elder'):d.point((x,y+1),fill='#b47869')
                        if style=='cold' or mood=='cold':d.point((x,y),fill='#352437')
                        if style in ('thanh_y','fair') and mood!='cold':d.point((x,y),fill='#493341')
                x,y=mouth
                if layer.getpixel((x,y))[3] and (mood!='neutral' or style!=FACES[rig][0]):
                    d.line([(x-1,y),(x,y),(x+1,y-(1 if mood=='warm' else 0))],fill='#99584e')
            yield f'face/{style}/{mood}',layer
    for name,color in [('matching',None),('jade','#42786c'),('amber','#bd822c')]:
        layer=Image.new('RGBA',SIZE);d=ImageDraw.Draw(layer)
        if color:
            for x,y in eyes:d.point((x,y),fill=color)
        yield f'eyes/{name}',layer
    for name in ['matching','soft','stern']:
        layer=Image.new('RGBA',SIZE);d=ImageDraw.Draw(layer)
        if name!='matching':
            for x,y in eyes:
                d.line([(x-1,y-2),(x+1,y-2-(name=='stern'))],fill='#49343b' if name=='soft' else '#302530')
        yield f'eyebrows/{name}',layer


frames={};registry={}
for rig,marks in MARKS.items():
    if rig!='original':
        source_name={'workMan':'villageMan','workWoman':'villageWoman'}.get(rig,rig)
        source=Image.open(SOURCE/f'{source_name}.png').convert('RGBA')
    registry[rig]={'hands':{},'arms':{}}
    for index,direction in enumerate(('down','up','right')):
        mark=marks[index]
        if rig=='original':
            parts={part:previous['frames'][f'{direction}/{part}'] for part in ['face','eyes','eyebrows']}
            face=parts['face'].copy()
            for part in ['eyes','eyebrows']:face.alpha_composite(parts[part])
            parts={'face':face}
            for part in ('outerCloth','leftArm','rightArm'):
                parts[part]=previous['frames'][f'{direction}/{part}']
            for part in ('hairFront','hairBack'):
                parts[part]=previous['frames'][f'{direction}/{part}']
        else:
            parts=split(normalize(source,index,rig),source_name,index,mark)
            if source_name=='villageMan':
                # Reconstruct the scalp under the removable fabric cap.
                layer=parts['hairFront'];cap=parts['headwear']
                for y in range(7,18):
                    for x in range(64):
                        r,g,b,a=cap.getpixel((x,y))
                        if a:layer.putpixel((x,y),(round(r*.74),round(g*.65),round(b*.52),a))
            if rig in ('workMan','workWoman'):
                overlay=ImageDraw.Draw(parts['outerCloth'])
                if index==0:
                    overlay.polygon([(24,52),(40,52),(42,74),(39,77),(23,76),(22,70)],fill='#544537',outline='#352b27')
                    overlay.polygon([(26,54),(38,54),(39,73),(25,74)],fill='#a99170')
                    overlay.line([(27,55),(25,72),(27,73)],fill='#cbb891');overlay.line([(34,56),(35,73),(38,73)],fill='#806b52')
                    overlay.line((23,52,41,52),fill='#c5a372',width=2)
                elif index==1:
                    overlay.line((22,52,42,52),fill='#a99170',width=2)
                    overlay.polygon([(31,52),(34,54),(39,57),(38,59),(33,57),(30,60),(28,58)],fill='#aa9471',outline='#584034')
                else:
                    overlay.polygon([(37,52),(41,52),(43,73),(39,77),(37,75)],fill='#9a8064',outline='#4d4031')
                    overlay.line((39,54,40,73),fill='#c5ae89')
            if source_name in ('villageMan','villageWoman'):
                d=ImageDraw.Draw(parts['accessory']);x=41 if index==0 else 23 if index==1 else 37
                d.polygon([(x,52),(x+4,53),(x+5,59),(x+2,62),(x-2,59),(x-1,54)],fill='#705039',outline='#2f2723')
                d.line((x,54,x+3,55),fill='#bf9161');d.point((x+1,56),fill='#cfb178')
        variants=dict(face_frames(parts['face'],mark,rig));variants.update(parts)
        beard=parts.get('beard',Image.new('RGBA',SIZE)).copy()
        if rig!='elder' and mark[2]:
            x,y=mark[2];d=ImageDraw.Draw(beard)
            d.polygon([(x-3,y+1),(x+3,y+1),(x+2,y+5),(x,y+8),(x-2,y+5)],fill='#5e5967')
            d.line([(x-2,y+2),(x,y+6),(x+1,y+3)],fill='#cbc6cb')
            d.line([(x-2,y+1),(x,y),(x+2,y+1)],fill='#e2dce0')
        variants['beard/silver']=beard;variants['beard/matching']=beard
        for part in ('outerCloth','leftArm','rightArm'):
            if part in parts:
                for color in ('moon','ember','earth'):variants[f'{part}/{color}']=tone(parts[part],color,rig)
        for part in ('pants','leftShoe','rightShoe'):
            if part in parts:
                layer=parts[part].copy();layer.putdata([(int(r*.78),int(g*.78),int(b*.82),a) for r,g,b,a in layer.getdata()]);variants[part+'/charcoal']=layer
        for part in ('hairFront','hairBack'):
            if part not in parts or rig=='monk':continue
            for style in ('bun','short','loose'):
                for color in ('ink','silver','red','chestnut'):
                    layer=parts[part].copy()
                    if style=='short' and part=='hairBack':layer.paste((0,0,0,0),(0,mark[0]+2,64,96))
                    if style=='loose' and part=='hairBack':
                        lock=layer.crop((17,max(4,mark[0]-12),46,mark[0]+9));layer.alpha_composite(lock,(17,mark[0]-2))
                    if style=='loose' and part=='hairFront' and rig!='fairy':layer.paste((0,0,0,0),(0,0,64,7 if rig!='elder' else 13))
                    variants[f'{part}/{style}/{color}']=tone(layer,color,rig,True)
        if 'outerCloth' in parts and rig!='original':
            cut={'swordsman':47,'demon':49,'fairy':56,'monk':49,'elder':61,'villageMan':53,'villageWoman':58,'workMan':53,'workWoman':58}[rig]
            for color in ('','/moon','/ember','/earth'):
                key='outerCloth'+color
                cloth=variants[key].copy()
                variants[key]=cloth.copy();variants[key].paste((0,0,0,0),(0,cut,64,96))
                for sway in (-1,0,1):
                    hem=Image.new('RGBA',SIZE)
                    for y in range(cut,96):
                        dx=round(sway*min(1,(y-cut)/12))
                        hem.alpha_composite(cloth.crop((0,y,64,y+1)),(dx,y))
                    variants[f'hem/{sway}{color}']=hem
        for facing in ([direction,'left'] if direction=='right' else [direction]):
            # Front and rear expose opposite hands in the current draw order.
            hand=mark[4][0 if direction=='up' else 1 if direction=='down' else 0]
            registry[rig]['hands'][facing]=[63-hand[0],hand[1]] if facing=='left' else hand
            shoulder=mark[3][0 if direction in ('up','right') else 1]
            far_shoulder=mark[3][1 if direction in ('up','right') else 0]
            far_hand=mark[4][1 if direction in ('up','right') else 0]
            if direction=='right':far_hand=[hand[0]+3,hand[1]-1];far_shoulder=[shoulder[0]+3,shoulder[1]-1]
            def mir(point): return [63-point[0],point[1]] if facing=='left' else point
            registry[rig]['arms'][facing]={'main':[mir(shoulder),mir(hand)],'support':[mir(far_shoulder),mir(far_hand)]}

            for key,layer in variants.items():
                frames[f'{rig}/{facing}/{key}']=ImageOps.mirror(layer) if facing=='left' else layer

# Pack each frame by its actual opaque bounds. Negative-space pixels are not
# allocated in VRAM. Original 64x96 offsets are stored as part anchors.
size=1024;atlas=Image.new('RGBA',(size,3072));metadata={};anchors={};x=y=row=1
for key,frame in frames.items():
    box=frame.getbbox() or (0,0,1,1)
    crop=frame.crop(box);w,h=crop.size
    if x+w+1>size:x=1;y+=row+2;row=1
    assert y+h<atlas.height,key
    atlas.alpha_composite(crop,(x,y))
    metadata[key]={'frame':{'x':x,'y':y,'w':w,'h':h},'trimmed':False,'rotated':False}
    anchors[key]=list(box[:2]);x+=w+2;row=max(row,h)
atlas=atlas.crop((0,0,size,y+row+1));atlas.save(OUT/'variants.png')
(OUT/'variants.json').write_text(json.dumps({'frames':metadata,'meta':{'image':'variants.png','size':{'w':atlas.width,'h':atlas.height}}}),encoding='utf-8')
(OUT/'variants-registry.json').write_text(json.dumps({**registry,'anchors':anchors}),encoding='utf-8')
print(len(frames),atlas.size)

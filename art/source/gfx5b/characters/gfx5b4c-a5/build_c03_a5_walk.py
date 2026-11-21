"""Compose the C03 A5 direction-specific idle and walk frames from authored poses."""
from __future__ import annotations
import json
from pathlib import Path
from PIL import Image, ImageDraw
import draw_c03_a5 as art

OUT=Path(__file__).resolve().parent
W,H=art.W,art.H
DIRS=["south","south_east","east","north_east","north","north_west","west","south_west"]
VECTORS={"north":(0,-1),"north_east":(.7,-.7),"east":(1,0),"south_east":(.7,.7),"south":(0,1),"south_west":(-.7,.7),"west":(-1,0),"north_west":(-.7,-.7)}

def pose(direction):
    L=art.blank_layers(); art.common_shadow(L)
    if direction=="south":art.front(L)
    elif direction=="north":art.back_view(L)
    elif direction=="east":art.side(L,1)
    elif direction=="west":art.side(L,-1)
    elif direction=="south_east":art.three_quarter_front(L,1)
    elif direction=="south_west":art.three_quarter_front(L,-1)
    elif direction=="north_east":art.three_quarter_back(L,1)
    else:art.three_quarter_back(L,-1)
    return L

def move(im,dx,dy):
    out=Image.new("RGBA",(W,H),(0,0,0,0));out.alpha_composite(im,(int(dx),int(dy)));return out

def split(im,cut,side):
    out=Image.new("RGBA",(W,H),(0,0,0,0));p=im.load();q=out.load()
    for y in range(H):
        for x in range(W):
            if (x<cut)==(side=="far"):q[x,y]=p[x,y]
    return out

def remap_layers(L,direction,phase):
    dx,dy=VECTORS[direction]
    swing=[-2,-1,0,2,1,0][phase]
    bob=[0,-1,0,1,0,-1][phase]
    lift=1 if phase in (1,4) else 0
    # The 3/4 views have a stable near side; for rear/side views the visible
    # side follows which half of the projected body is closest to camera.
    near_sign=-1 if direction in ("north_east","north_west","west") else 1
    layers=[]
    for name,c in L.items():
        im=c.im
        if name=="boots":
            near_dx=round(dx*swing*near_sign);near_dy=round(dy*swing*near_sign)-lift
            far_dx=-near_dx;far_dy=-round(dy*swing*near_sign)
            layers.extend([("boots_far",move(split(im,24,"far"),far_dx,far_dy)),("boots_near",move(split(im,24,"near"),near_dx,near_dy))])
        elif name=="sleeves":
            # Arm swing opposes the leg on the same side. Keep the actual
            # shoulder mass while shifting the cuff/hand in its own direction.
            amp=max(-2,min(2,-swing))
            layers.extend([("sleeve_far",move(split(im,24,"far"),round(dx*amp/2),-bob)),("sleeve_near",move(split(im,24,"near"),round(-dx*amp/2),-bob))])
        elif name=="body": layers.append((name,move(im,0,bob)))
        elif name=="hair": layers.append((name,move(im,0,-bob if phase in (1,4) else 0)))
        elif name=="trim": layers.append((name,move(im,0,bob)))
        elif name=="robe_back":
            # A small alternating hem swing, while shoulders stay planted.
            out=im.copy(); strip=im.crop((0,42,W,H));out.paste((0,0,0,0),(0,42,W,H));out.alpha_composite(move(strip,round(dx*(1 if phase in (1,2) else -1 if phase in (4,5) else 0)),0),(0,42));layers.append((name,out))
        else: layers.append((name,im.copy()))
    return layers

def ops_for(im):
    pixels=im.load();groups={}
    for y in range(H):
        for x in range(W):
            r,g,b,a=pixels[x,y]
            if a:groups.setdefault(f"#{r:02X}{g:02X}{b:02X}",[]).append([x,y])
    return [{"type":"pixels","color":color,"points":pts} for color,pts in groups.items()]

def main():
    frames=[];flat=[]
    # 8 independent idle frames in Phaser's 8-direction order.
    for d in DIRS:
        L=pose(d)
        frames.append({"durationMs":240,"layers":[{"name":name,"ops":ops_for(c.im)} for name,c in L.items()]})
        flat.append(L)
    # Six authored gait keys per direction. Limbs counter-swing, shoes pass and
    # lift, body breathes by one pixel, and the robe/hair lag slightly.
    for d in DIRS:
        base=pose(d)
        for phase in range(6):
            layers=remap_layers(base,d,phase)
            frames.append({"durationMs":120,"layers":[{"name":name,"ops":ops_for(im)} for name,im in layers]})
            flat.append(layers)
    spec={"name":"C03-A5-eight-view-walk","width":W,"height":H,"frames":frames}
    (OUT/"C03-A5-eight-view-walk.json").write_text(json.dumps(spec,separators=(",",":")),encoding="utf-8")
    # Sprite sheet order matches AnimationManager: idle N/NE/E/SE/S/SW/W/NW,
    # then walk six frames in that same order.
    sheet=Image.new("RGBA",(W*8,H*7),(0,0,0,0))
    for i,d in enumerate(DIRS):
        im=Image.new("RGBA",(W,H),(0,0,0,0))
        for c in flat[i].values():im.alpha_composite(c.im)
        sheet.alpha_composite(im,((i%8)*W,(i//8)*H))
        for p in range(6):
            im=Image.new("RGBA",(W,H),(0,0,0,0))
            for _,layer in remap_layers(pose(d),d,p):im.alpha_composite(layer)
            frame=8+i*6+p;sheet.alpha_composite(im,((frame%8)*W,(frame//8)*H))
    sheet.save(OUT/"C03-A5-eight-view-walk-preview.png")
    meta={"canvas":{"width":W,"height":H},"sheetColumns":8,"idle":{"frames":8,"fps":4,"directionOrder":DIRS,"indices":{d:i for i,d in enumerate(DIRS)}},"walk":{"framesPerDirection":6,"fps":1000/120,"firstFrame":8,"directionOrder":DIRS,"indices":{d:[8+i*6+p for p in range(6)] for i,d in enumerate(DIRS)}},"tags":[{"name":f"idle_{d}","from":i,"to":i} for i,d in enumerate(DIRS)]+[{"name":f"walk_{d}","from":8+i*6,"to":13+i*6} for i,d in enumerate(DIRS)],"layerNames":["shadow","boots_far","boots_near","robe_back","hair","sleeve_far","sleeve_near","body","trim"],"source":"draw_c03_a5.py plus phase-authored limb, hem, hair and body offsets"}
    (OUT/"walk-directions.json").write_text(json.dumps(meta,indent=2),encoding="utf-8")
    # One looping GIF shows all eight facings together at native frame cadence.
    gif=[]
    for p in range(6):
        row=Image.new("RGBA",(W*8,H),(26,39,37,255))
        for i in range(8):
            frame=8+i*6+p; cell=sheet.crop(((frame%8)*W,(frame//8)*H,(frame%8+1)*W,(frame//8+1)*H))
            row.alpha_composite(cell,(i*W,0))
        gif.append(row.convert("P",palette=Image.Palette.ADAPTIVE,colors=128))
    gif=[f.resize((f.width*3,f.height*3),Image.Resampling.NEAREST) for f in gif]
    gif[0].save(OUT/"C03-A5-walk-8directions.gif",save_all=True,append_images=gif[1:],duration=120,loop=0,disposal=2,optimize=False)

if __name__=="__main__":main()

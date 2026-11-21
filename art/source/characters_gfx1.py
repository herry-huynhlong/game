"""Hand-authored GFX.1 character sprites drawn directly at 32x40 pixels.

Uses integer Pillow primitives at final pixel size. No AI bitmap, reduction,
or post-draw scaling. Run: python art/source/characters_gfx1.py
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public/assets/characters'
PREVIEW=ROOT/'art/previews'
FW,FH,COLS,ROWS=32,40,8,36
DIRS=('down','up','left','right')
ROWSPEC=[(state,d,frames) for state in ('idle','walk','run') for d in DIRS for frames in [4 if state=='idle' else 8]]
ROWSPEC += [(f'attack{n}',d,6) for n in (1,2,3) for d in DIRS]
ROWSPEC += [(state,d,frames) for state,frames in (('cast',8),('hurt',4),('death',8)) for d in DIRS]

# ink,hair,hair-light,skin,skin-shadow,robe,light,shadow,inner,accent,
# accent-light,belt,boots,metal
PAL={
 'van_du':((25,34,36),(28,29,35),(69,61,56),(228,184,139),(169,113,85),(207,229,218),(242,247,225),(120,171,162),(237,225,194),(43,137,129),(126,210,184),(104,76,55),(76,61,51),(222,190,112)),
 'blackwind':((21,24,33),(23,23,32),(62,48,55),(206,151,116),(137,91,77),(48,51,63),(89,91,104),(31,34,47),(113,61,63),(139,43,54),(205,91,77),(77,45,43),(46,39,43),(185,147,107)),
 'song_qinghe':((30,43,54),(33,39,47),(78,86,94),(230,190,153),(169,122,96),(121,163,169),(184,213,205),(73,111,125),(228,222,196),(57,112,147),(124,180,191),(103,78,61),(72,66,59),(214,190,126)),
 'sect':((29,42,42),(30,31,35),(78,69,59),(222,178,139),(163,116,88),(199,220,205),(233,239,218),(117,159,149),(235,221,187),(84,155,136),(157,204,174),(111,78,54),(76,63,51),(217,186,115)),
 'sect_female':((35,41,49),(34,31,39),(86,69,70),(235,194,164),(184,131,116),(177,211,207),(224,240,222),(96,150,159),(238,222,200),(110,111,166),(180,178,209),(109,76,70),(72,60,59),(221,189,123)),
 'civilian':((42,42,37),(37,34,31),(91,71,50),(216,169,128),(162,107,78),(150,112,76),(191,150,104),(96,74,58),(203,186,151),(72,111,111),(122,155,141),(94,64,45),(65,52,43),(185,148,92)),
 'merchant':((34,40,47),(34,32,34),(94,66,46),(226,183,143),(172,115,86),(71,111,126),(128,163,160),(45,78,94),(231,211,172),(180,111,60),(231,176,94),(107,69,45),(73,56,45),(219,177,101)),
 'guard':((28,38,40),(29,30,34),(75,66,56),(215,169,132),(158,104,80),(75,105,100),(128,155,133),(45,69,69),(215,205,177),(141,94,62),(203,158,93),(95,65,45),(58,52,44),(188,177,144)),
}

def poly(d,points,color,outline=None):
    d.polygon(points,fill=color)
    if outline:d.line(points+[points[0]],fill=outline,width=1,joint='curve')

def draw_frame(sheet,ox,oy,pal,direction,motion,frame,state,female=False):
    ink,ha,hh,sk,ss,rb,rl,rs,inn,ac,ah,be,bo,mt=pal
    d=ImageDraw.Draw(sheet)
    phase=frame%8
    step=(phase%4)
    walking=motion in ('walk','run')
    stride=(2 if motion=='run' else 1) if walking else 0
    ldx=(stride,0,-stride,0)[step] if walking else 0
    rdx=-ldx
    ly,ry=((2,0) if step in (0,1) else (0,2)) if walking else (0,0)
    if motion=='run':ly,ry=((3,0) if step in (0,1) else (0,3))
    # Ground shadow and alternating legs; the foot baseline never moves.
    d.ellipse((ox+9,oy+37,ox+23,oy+39),fill=(15,23,24,110))
    poly(d,[(ox+11,oy+29),(ox+15,oy+30),(ox+14+ldx,oy+36+ly),(ox+10+ldx,oy+38+ly),(ox+9+ldx,oy+35+ly)],bo,ink)
    poly(d,[(ox+17,oy+30),(ox+21,oy+29),(ox+23+rdx,oy+35+ry),(ox+22+rdx,oy+38+ry),(ox+18+rdx,oy+36+ry)],bo,ink)
    d.line([(ox+11+ldx,oy+34+ly),(ox+14+ldx,oy+34+ly)],fill=ah)
    d.line([(ox+19+rdx,oy+34+ry),(ox+22+rdx,oy+34+ry)],fill=ah)
    # Cloak/robe volume, distinct back and front patterns.
    if direction=='up':
        poly(d,[(ox+10,oy+14),(ox+22,oy+14),(ox+26,oy+20),(ox+24,oy+31),(ox+21,oy+34),(ox+16,oy+32),(ox+11,oy+34),(ox+8,oy+31),(ox+6,oy+20)],rb,ink)
        poly(d,[(ox+8,oy+19),(ox+13,oy+18),(ox+12,oy+31),(ox+9,oy+32)],rs)
        poly(d,[(ox+17,oy+18),(ox+23,oy+17),(ox+24,oy+25),(ox+21,oy+32),(ox+18,oy+31)],rl)
        d.line([(ox+10,oy+22),(ox+16,oy+25),(ox+22,oy+22)],fill=ac)
        d.line([(ox+10,oy+28),(ox+22,oy+28)],fill=be,width=2)
        d.rectangle((ox+15,oy+27,ox+17,oy+29),fill=mt,outline=ink)
    else:
        poly(d,[(ox+10,oy+14),(ox+22,oy+14),(ox+26,oy+18),(ox+25,oy+24),(ox+23,oy+27),(ox+9,oy+27),(ox+7,oy+24),(ox+6,oy+18)],rb,ink)
        poly(d,[(ox+7,oy+18),(ox+11,oy+16),(ox+12,oy+24),(ox+9,oy+26),(ox+6,oy+23)],rs,ink)
        poly(d,[(ox+21,oy+16),(ox+25,oy+18),(ox+27,oy+23),(ox+24,oy+26),(ox+21,oy+24)],rl,ink)
        hem=2 if walking and phase in (0,1) else -1 if walking and phase in (2,3) else 0
        poly(d,[(ox+9,oy+24),(ox+23,oy+24),(ox+25,oy+32+hem),(ox+21,oy+35),(ox+16,oy+33),(ox+10,oy+35),(ox+7,oy+32-hem)],rb,ink)
        poly(d,[(ox+9,oy+28),(ox+13,oy+27),(ox+12,oy+33),(ox+9,oy+32)],rs)
        poly(d,[(ox+19,oy+27),(ox+23,oy+27),(ox+24,oy+32),(ox+21,oy+33)],rl)
        # Overlapping lapels, diagonal piping, belt knot and hanging sash.
        poly(d,[(ox+11,oy+14),(ox+16,oy+18),(ox+14,oy+24),(ox+10,oy+19)],inn,ink)
        poly(d,[(ox+21,oy+14),(ox+16,oy+18),(ox+19,oy+24),(ox+23,oy+19)],rl,ink)
        d.line([(ox+11,oy+15),(ox+16,oy+19),(ox+21,oy+15)],fill=ac)
        d.line([(ox+11,oy+24),(ox+21,oy+24)],fill=be,width=2)
        d.rectangle((ox+15,oy+23,ox+18,oy+26),fill=mt,outline=ink)
        d.line([(ox+16,oy+26),(ox+14,oy+30),(ox+17,oy+32)],fill=ac)
    # Sleeves with cuffs; arm swing differs by phase rather than moving the body.
    swing=(1,2,-1,0)[phase%4] if walking else 0
    if direction in ('down','up'):
        poly(d,[(ox+7,oy+16),(ox+11,oy+16),(ox+12,oy+22),(ox+9,oy+25),(ox+6,oy+22)],rl if direction=='down' else rs,ink)
        poly(d,[(ox+21,oy+16),(ox+25,oy+17),(ox+27,oy+22),(ox+23,oy+25),(ox+20,oy+22)],rs if direction=='down' else rb,ink)
        if direction=='down':
            d.rectangle((ox+7,oy+22+swing,ox+10,oy+26+swing),fill=sk,outline=ink)
            d.rectangle((ox+22,oy+22-swing,ox+25,oy+26-swing),fill=sk,outline=ink)
    else:
        front=6 if direction=='left' else 22
        poly(d,[(ox+front,oy+16),(ox+front+4,oy+17),(ox+front+4,oy+23),(ox+front+1,oy+26),(ox+front-2,oy+22)],rl,ink)
        d.rectangle((ox+front,oy+23+swing,ox+front+3,oy+26+swing),fill=sk,outline=ink)
        back=22 if direction=='left' else 6
        poly(d,[(ox+back,oy+17),(ox+back+3,oy+16),(ox+back+5,oy+22),(ox+back+2,oy+25),(ox+back-1,oy+22)],rs,ink)
    # Head and hairstyle are drawn separately for each facing silhouette.
    if direction=='down':
        poly(d,[(ox+11,oy+7),(ox+13,oy+4),(ox+20,oy+4),(ox+23,oy+8),(ox+22,oy+14),(ox+20,oy+17),(ox+12,oy+17),(ox+9,oy+13)],sk,ink)
        poly(d,[(ox+10,oy+8),(ox+12,oy+4),(ox+20,oy+4),(ox+23,oy+8),(ox+21,oy+10),(ox+19,oy+8),(ox+16,oy+10),(ox+12,oy+8),(ox+10,oy+12)],ha,ink)
        poly(d,[(ox+10,oy+10),(ox+12,oy+10),(ox+12,oy+15),(ox+10,oy+13)],hh)
        poly(d,[(ox+21,oy+10),(ox+23,oy+9),(ox+23,oy+14),(ox+21,oy+15)],ha)
        d.point((ox+13,oy+12),fill=ink);d.point((ox+19,oy+12),fill=ink)
        d.point((ox+14,oy+12),fill=(247,221,179));d.point((ox+20,oy+12),fill=(247,221,179))
        d.point((ox+16,oy+14),fill=ss);d.line([(ox+15,oy+16),(ox+17,oy+16)],fill=ink)
        d.ellipse((ox+15,oy+1,ox+19,oy+6),fill=ha,outline=ink)
        d.rectangle((ox+14,oy+4,ox+20,oy+6),fill=ac,outline=ink);d.point((ox+17,oy+4),fill=ah)
    elif direction=='up':
        d.ellipse((ox+10,oy+4,ox+22,oy+17),fill=ha,outline=ink)
        poly(d,[(ox+10,oy+8),(ox+13,oy+5),(ox+20,oy+5),(ox+23,oy+9),(ox+22,oy+16),(ox+10,oy+16)],ha)
        poly(d,[(ox+12,oy+8),(ox+17,oy+5),(ox+21,oy+8),(ox+20,oy+11),(ox+16,oy+10)],hh)
        d.ellipse((ox+14,oy+1,ox+19,oy+7),fill=ha,outline=ink)
        d.rectangle((ox+13,oy+4,ox+20,oy+6),fill=ac,outline=ink);d.point((ox+17,oy+4),fill=ah)
        d.line([(ox+12,oy+15),(ox+16,oy+18),(ox+21,oy+15)],fill=ac)
    else:
        right=direction=='right'
        poly(d,[(ox+12,oy+5),(ox+20,oy+5),(ox+23,oy+9),(ox+21,oy+15),(ox+17,oy+18),(ox+12,oy+16),(ox+9,oy+12)],sk,ink)
        poly(d,[(ox+9,oy+8),(ox+12,oy+4),(ox+20,oy+4),(ox+23,oy+8),(ox+21,oy+10),(ox+18,oy+8),(ox+16,oy+10),(ox+12,oy+9),(ox+11,oy+13)],ha,ink)
        eye=18 if right else 14
        d.point((ox+eye,oy+12),fill=ink);d.point((ox+eye+1,oy+11),fill=(247,221,179))
        d.point((ox+(20 if right else 12),oy+14),fill=ss);d.line([(ox+(18 if right else 12),oy+16),(ox+(20 if right else 14),oy+16)],fill=ink)
        bun_x=12 if right else 16
        d.ellipse((ox+bun_x,oy+1,ox+bun_x+4,oy+6),fill=ha,outline=ink)
        d.rectangle((ox+bun_x-1,oy+4,ox+bun_x+5,oy+6),fill=ac,outline=ink)
    # Recognizable sleeve stitching and shoulder pins. Weapon art is layered
    # separately so it always reflects the NPC's persisted equipment.
    d.point((ox+8,oy+19),fill=mt);d.point((ox+24,oy+19),fill=mt)
    d.point((ox+16,oy+20),fill=mt);d.point((ox+17,oy+20),fill=ah)
    if female:
        if direction in ('down','up'):
            poly(d,[(ox+10,oy+9),(ox+9,oy+15),(ox+11,oy+21),(ox+13,oy+18),(ox+12,oy+12)],ha,ink)
            poly(d,[(ox+21,oy+9),(ox+23,oy+15),(ox+22,oy+21),(ox+20,oy+17)],hh,ink)
        d.point((ox+21,oy+6),fill=mt);d.point((ox+22,oy+7),fill=ah)
    if state.startswith('attack'):
        phase=frame%6
        if direction=='down':
            if phase>=2:d.line([(ox+8,oy+22),(ox+18,oy+31),(ox+27,oy+28)],fill=ah)
        elif direction=='up':
            if phase>=2:d.line([(ox+22,oy+22),(ox+14,oy+12),(ox+4,oy+16)],fill=ah)
        elif direction=='left':
            if phase>=2:d.line([(ox+12,oy+31),(ox+3,oy+25),(ox+3,oy+16)],fill=ah)
        else:
            if phase>=2:d.line([(ox+20,oy+31),(ox+29,oy+25),(ox+29,oy+16)],fill=ah)
    elif state=='cast':
        r=2+frame%4;d.ellipse((ox+16-r,oy+22-r,ox+16+r,oy+22+r),outline=ah)
        d.point((ox+5+(frame*3)%22,oy+15+(frame*2)%15),fill=mt)
        d.point((ox+7+(frame*5)%18,oy+20+(frame*3)%12),fill=ah)
    elif state=='hurt':
        d.point((ox+9,oy+20),fill=(193,67,67));d.point((ox+24,oy+26),fill=(193,67,67))
        d.line([(ox+12,oy+17),(ox+20,oy+17)],fill=ss)
    elif state=='death' and frame>=3:
        poly(d,[(ox+6,oy+30),(ox+20,oy+27),(ox+27,oy+31),(ox+24,oy+36),(ox+10,oy+37)],rs,ink)
        d.ellipse((ox+5,oy+28,ox+15,oy+35),fill=sk,outline=ink);d.line([(ox+20,oy+34),(ox+29,oy+32)],fill=mt,width=2)

def build_sheet(palette_key,female=False):
    pal=PAL[palette_key];sheet=Image.new('RGBA',(FW*COLS,FH*ROWS),(0,0,0,0))
    for row,(state,direction,count) in enumerate(ROWSPEC):
        motion='run' if state=='run' else 'walk' if state=='walk' else 'idle'
        for col in range(COLS):draw_frame(sheet,col*FW,row*FH,pal,direction,motion,col%count,state,female)
    assert sheet.size==(256,1440) and sheet.mode=='RGBA'
    for row in range(ROWS):assert sheet.crop((0,row*FH,FW,(row+1)*FH)).getbbox(),(palette_key,row)
    return sheet

def main():
    OUT.mkdir(parents=True,exist_ok=True);PREVIEW.mkdir(parents=True,exist_ok=True)
    specs={'van_du':('van_du',False),'blackwind':('blackwind',False),'song_qinghe':('song_qinghe',False),
           'sect_cultivator':('sect',False),'sect_female':('sect_female',True),'civilian':('civilian',False),
           'merchant':('merchant',False),'guard':('guard',False)}
    sheets={}
    for key,(palette,female) in specs.items():
        sheets[key]=build_sheet(palette,female);sheets[key].save(OUT/f'{key}.png',optimize=True)
    # Five poses per row: four facings at rest and an actual walking stride.
    preview=Image.new('RGBA',(5*FW*5,3*FH*5),(231,233,230,255))
    for row,key in enumerate(('van_du','blackwind','song_qinghe')):
        sheet=sheets[key]
        for col,(state_row,frame) in enumerate(((0,0),(1,0),(2,0),(3,0),(4,1))):
            cell=sheet.crop((frame*FW,state_row*FH,(frame+1)*FW,(state_row+1)*FH)).resize((FW*5,FH*5),Image.Resampling.NEAREST)
            preview.alpha_composite(cell,(col*FW*5,row*FH*5))
    preview.save(PREVIEW/'characters-gfx1-preview.png')
    print(f'Created {len(sheets)} sheets: {FW}x{FH} frame, {COLS}x{ROWS} layout; nearest-neighbour preview generated.')

if __name__=='__main__':main()

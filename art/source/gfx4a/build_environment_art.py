from pathlib import Path
import json
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[3]
SOURCE=ROOT/'public/assets/props/settlement_buildings.png'
SOURCE_META=ROOT/'public/assets/props/settlement_buildings.json'
OUT=ROOT/'public/assets/props/environment_destruction.png'
META=ROOT/'public/assets/props/environment_destruction.json'
BASE=Image.open(SOURCE).convert('RGBA')
frames=json.loads(SOURCE_META.read_text(encoding='utf-8'))['frames']
CELL=160
names=['house_intact','house_damaged','house_ruined','tree_intact','tree_damaged','tree_stump','rubble','leaf_fall','drop_wood','drop_wolf_pelt','drop_wolf_fang','drop_demon_core']
atlas=Image.new('RGBA',(CELL*4,CELL*3),(0,0,0,0))
def crop(key):
    f=frames[key]['frame']; return BASE.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h']))
def place(name,img):
    i=names.index(name); x=(i%4)*CELL; y=(i//4)*CELL
    atlas.alpha_composite(img.convert('RGBA').resize((CELL,CELL),Image.Resampling.NEAREST),(x,y))
def house_variant(key):
    im=crop('residential_house').resize((CELL,CELL),Image.Resampling.NEAREST)
    d=ImageDraw.Draw(im)
    if key=='house_intact': return im
    if key=='house_damaged':
        # Open holes in a few roof courses, preserve the original palette and silhouette.
        d.polygon([(70,26),(88,25),(97,33),(90,42),(72,39)],fill=(20,34,32,255))
        d.polygon([(113,55),(124,54),(130,64),(119,69)],fill=(25,43,39,255))
        d.line([(73,77),(79,87),(75,94),(84,105),(80,122)],fill=(37,29,25,255),width=3)
        d.line([(80,94),(91,91),(96,97)],fill=(43,32,27,255),width=2)
        d.polygon([(91,114),(112,110),(127,117),(120,125),(97,123)],fill=(98,72,52,255))
        d.polygon([(64,45),(73,38),(78,45),(70,53)],fill=(67,83,70,255))
        return im
    # Ruin: collapse the roof into broken rafters and retain a readable house footprint.
    d.rectangle((14,120,147,150),fill=(53,46,38,255))
    d.polygon([(18,85),(40,68),(70,83),(93,60),(119,76),(143,87),(131,111),(104,103),(82,117),(57,101),(35,116)],fill=(69,71,61,255),outline=(34,39,35,255))
    d.polygon([(23,83),(48,69),(67,78),(51,92),(28,99)],fill=(25,45,43,255),outline=(18,31,31,255))
    d.line([(25,81),(69,107),(87,94),(120,107)],fill=(102,63,42,255),width=6)
    d.line([(47,72),(41,110),(31,127)],fill=(120,76,48,255),width=5)
    d.line([(85,83),(103,111),(127,119)],fill=(136,86,50,255),width=5)
    d.rectangle((56,112,67,143),fill=(44,39,33,255));d.rectangle((112,117,120,145),fill=(42,37,31,255))
    for x,y,c in [(20,133,(112,104,82,255)),(38,142,(87,82,67,255)),(78,135,(121,108,84,255)),(94,148,(83,78,66,255)),(135,136,(106,96,73,255))]:
        d.rectangle((x,y,x+9,y+6),fill=c,outline=(50,49,41,255))
    return im
for key in ['house_intact','house_damaged','house_ruined']:
    place(key,house_variant(key))
tree=crop('city_tree').resize((CELL,CELL),Image.Resampling.NEAREST);place('tree_intact',tree)
damaged=tree.copy();d=ImageDraw.Draw(damaged);d.polygon([(73,99),(86,92),(91,100),(83,109),(90,118),(81,125),(74,117),(66,107)],fill=(48,34,26,255));d.line([(71,103),(83,111),(78,121)],fill=(190,126,71,255),width=3);place('tree_damaged',damaged)
stump=Image.new('RGBA',(CELL,CELL),(0,0,0,0));d=ImageDraw.Draw(stump);d.ellipse((38,94,124,139),fill=(48,68,49,255));d.polygon([(56,101),(103,96),(116,126),(102,139),(59,134),(45,119)],fill=(105,68,43,255),outline=(35,37,29,255));d.ellipse((64,97,102,113),fill=(199,157,98,255),outline=(58,44,32,255));d.ellipse((75,100,94,109),fill=(129,91,53,255));d.line([(51,121),(31,131),(21,127)],fill=(105,68,43,255),width=7);d.line([(111,126),(133,139),(143,134)],fill=(105,68,43,255),width=7);place('tree_stump',stump)
rubble=Image.new('RGBA',(CELL,CELL),(0,0,0,0));d=ImageDraw.Draw(rubble)
for x,y,w,h,c in [(14,114,27,18,(106,101,82,255)),(45,125,24,14,(82,81,69,255)),(70,111,32,20,(122,112,88,255)),(104,126,28,17,(82,77,65,255)),(53,99,21,14,(139,94,58,255)),(92,94,27,15,(100,71,50,255)),(27,139,23,9,(74,75,65,255))]: d.polygon([(x,y+h),(x+4,y),(x+w,y+2),(x+w-3,y+h)],fill=c,outline=(40,42,35,255))
place('rubble',rubble)
leaf=Image.new('RGBA',(CELL,CELL),(0,0,0,0));d=ImageDraw.Draw(leaf);d.ellipse((58,72,105,119),fill=(95,155,94,210),outline=(40,77,55,255));d.polygon([(58,103),(80,92),(72,77),(88,89),(101,74),(94,99),(111,104),(88,107),(79,125)],fill=(128,187,113,230));place('leaf_fall',leaf)
def icon(shape,colors):
    im=Image.new('RGBA',(CELL,CELL),(0,0,0,0));d=ImageDraw.Draw(im)
    if shape=='wood':
        d.ellipse((41,66,118,111),fill=(53,40,30,255));d.rectangle((39,72,117,105),fill=(133,85,47,255));d.ellipse((38,65,116,98),fill=(178,123,69,255),outline=(65,44,29,255));d.ellipse((55,73,98,91),fill=(207,157,97,255),outline=(108,70,40,255));d.ellipse((70,78,88,87),fill=(137,91,52,255))
    elif shape=='pelt':
        d.polygon([(80,48),(93,57),(100,73),(116,79),(105,92),(116,105),(96,111),(90,128),(75,115),(60,124),(58,105),(43,96),(56,83),(53,68),(70,65)],fill=(144,157,153,255),outline=(47,58,56,255));d.ellipse((67,75,91,99),fill=(176,185,172,255));d.ellipse((74,82,85,93),fill=(120,130,126,255))
    elif shape=='fang':
        d.polygon([(58,57),(102,61),(92,92),(78,119),(67,96)],fill=(224,213,172,255),outline=(75,66,54,255));d.polygon([(67,67),(89,68),(79,93)],fill=(248,236,197,255))
    else:
        d.polygon([(79,51),(110,75),(102,111),(78,127),(51,108),(48,76)],fill=(44,103,116,255),outline=(19,42,50,255));d.polygon([(79,60),(97,79),(90,105),(78,115),(61,104),(60,79)],fill=(100,212,201,255));d.polygon([(73,69),(83,72),(76,96),(70,98)],fill=(191,244,221,255))
    return im
for key,shape in [('drop_wood','wood'),('drop_wolf_pelt','pelt'),('drop_wolf_fang','fang'),('drop_demon_core','core')]:place(key,icon(shape,None))
atlas.save(OUT,optimize=True)
meta={'frames':{n:{'frame':{'x':(i%4)*CELL,'y':(i//4)*CELL,'w':CELL,'h':CELL},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':CELL,'h':CELL},'sourceSize':{'w':CELL,'h':CELL}} for i,n in enumerate(names)},'meta':{'app':'GFX.4A procedural pixel art (Pillow)','size':{'w':CELL*4,'h':CELL*3},'scale':'1'}}
META.write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Wrote {OUT} ({atlas.width}x{atlas.height}), {len(names)} frames')

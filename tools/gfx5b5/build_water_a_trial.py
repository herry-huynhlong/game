"""Build the isolated WATER-A Tiled trial (never changes the active world map)."""
from pathlib import Path
import json, math

ROOT=Path(__file__).resolve().parents[2]
MAPS=ROOT/'maps'/'gfx5b5'
MAPS.mkdir(parents=True,exist_ok=True)
OUT=MAPS/'QingyunWaterTrial.tmj'
RUNTIME=ROOT/'public'/'maps'/'QingyunWaterTrial.tmj'
W,H,T=48,32,32
WATER_FIRST=257
PROPS_FIRST=WATER_FIRST+64

def tile_set(name,tw,th,count,cols,image,iw,ih,tiles):
    return {'type':'tileset','version':'1.10','tiledversion':'1.12.2','name':name,'tilewidth':tw,'tileheight':th,'tilecount':count,'columns':cols,'spacing':0,'margin':0,'image':image,'imagewidth':iw,'imageheight':ih,'objectalignment':'topleft','tilerendersize':'tile','fillmode':'stretch','tiles':tiles}
def props(obj):return obj.setdefault('properties',[])
def prop(obj,name,value,typ='string'):props(obj).append({'name':name,'type':typ,'value':value})
def cell(x,y):return y*W+x
def put(grid,x,y,value):
    if 0<=x<W and 0<=y<H:grid[cell(x,y)]=value
def layer(i,name,data):return {'id':i,'name':name,'type':'tilelayer','x':0,'y':0,'width':W,'height':H,'opacity':1,'visible':True,'offsetx':0,'offsety':0,'parallaxx':1,'parallaxy':1,'tintcolor':None,'data':data}

terrain=json.loads((MAPS/'GFX5B5AreaTerrain.tsj').read_text(encoding='utf-8'))
terrain['image']='../../public/assets/tilesets/gfx5b5_area_terrain.png'
water_tiles=[]
names=[]
for i in range(8):names.append((i,'River · dòng Nam','river_south'))
for i in range(8,16):names.append((i,'River · dòng Đông','river_east'))
for i in range(16,24):names.append((i,'Stream · nước cạn','stream'))
for i in range(24,32):names.append((i,'Lake · nước tĩnh','lake'))
for i in range(32,40):names.append((i,'Shore · bờ cardinal','shore'))
for i in range(40,48):names.append((i,'Shore · góc và khúc cong','shore_corner'))
for i in range(48,56):names.append((i,'Water rock · đá giữa dòng','rock'))
for i in range(56,64):names.append((i,'Water rock · đá cuội nhỏ','pebble'))
for tile_id,label,family in names:
    water_tiles.append({'id':tile_id,'type':family,'properties':[{'name':'family','type':'string','value':family},{'name':'variant','type':'int','value':tile_id%8+1},{'name':'label','type':'string','value':label}]})
water=tile_set('GFX5B5WaterTiles',32,32,64,8,'../../public/assets/tilesets/gfx5b5_water_tiles.png',256,256,water_tiles)
water['properties']=[{'name':'source','type':'string','value':'GFX5B5 WATER-A Aseprite Lua atlas · 64 tiles'}]
(MAPS/'GFX5B5WaterTiles.tsj').write_text(json.dumps(water,ensure_ascii=False,indent=2),encoding='utf-8')
water_runtime=json.loads(json.dumps(water));water_runtime['image']='../assets/tilesets/gfx5b5_water_tiles.png'

ground=[1+((x*17+y*29)%8) for y in range(H) for x in range(W)]
water_layer=[0]*(W*H);shore=[0]*(W*H);details=[0]*(W*H)
water_kind={}
river_center={}
for y in range(H):
    c=16+round(2*math.sin(y/5.2)+1.1*math.sin(y/10.0))
    river_center[y]=c
    for x in range(c-2,c+3):
        put(water_layer,x,y,WATER_FIRST+(48+(y//8)%8 if (y in (8,22) and x==c) else (x+y*3)%8))
        water_kind[(x,y)]='river'
# Narrow clear tributary curves down-left into the quiet pond.
for y in range(1,19):
    c=42-round((y-1)*7/17)+round(math.sin(y/4)*.6)
    for x in (c,c+1):
        if 0<=x<W and water_layer[cell(x,y)]==0:
            put(water_layer,x,y,WATER_FIRST+16+(x+y)%8);water_kind[(x,y)]='stream'
# Quiet lake at the foot of the tributary, with an irregular rather than circular perimeter.
cx,cy,rx,ry=33,24,8,6
for y in range(cy-ry,cy+ry+1):
    for x in range(cx-rx,cx+rx+1):
        q=((x-cx)/rx)**2+((y-cy)/ry)**2
        if q<=1.0+0.045*math.sin(x*1.7+y*.9):
            put(water_layer,x,y,WATER_FIRST+24+(x*3+y)%8);water_kind[(x,y)]='lake'

def is_water(x,y):return 0<=x<W and 0<=y<H and water_layer[cell(x,y)]!=0
for (x,y),kind in water_kind.items():
    if not is_water(x,y):continue
    n=not is_water(x,y-1);s=not is_water(x,y+1);w=not is_water(x-1,y);e=not is_water(x+1,y)
    tile=None
    if n and w:tile=40+(x+y)%2
    elif n and e:tile=42+(x+y)%2
    elif s and w:tile=44+(x+y)%2
    elif s and e:tile=46+(x+y)%2
    elif n:tile=32+(x+y)%2
    elif s:tile=34+(x+y)%2
    elif w:tile=36+(x+y)%2
    elif e:tile=38+(x+y)%2
    if tile is not None:put(shore,x,y,WATER_FIRST+tile)
# A few pale grass/stone decals echo the wilderness without cluttering the bank.
for x,y,tid in [(8,5,129),(8,26,137),(25,5,139),(44,23,131),(24,29,140)]:put(details,x,y,tid)

objects={name:[] for name in ['Collision','FlowEffects','Decor','ActivitySites']}
oid=1
def obj(layer_name,name,kind,x,y,w=0,h=0,point=False,attributes=None):
    global oid
    o={'id':oid,'name':name,'type':kind,'x':x,'y':y,'width':w,'height':h,'rotation':0,'visible':True,'properties':[]}
    if point:o['point']=True
    for key,value in (attributes or {}).items():prop(o,key,value,'int' if isinstance(value,int) else 'bool' if isinstance(value,bool) else 'string')
    objects[layer_name].append(o);oid+=1;return o

# Water blocks foot travel except for the timber bridge crossing. Objects remain trial-only.
for y in range(H):
    spans=[];x=0
    while x<W:
        blocked=is_water(x,y) and not (y in range(13,17) and water_kind.get((x,y))=='river')
        if not blocked:x+=1;continue
        start=x
        while x<W and is_water(x,y) and not (y in range(13,17) and water_kind.get((x,y))=='river'):x+=1
        spans.append((start,x))
    for a,b in spans:obj('Collision','Water depth · no walking','blocking',a*T,y*T,(b-a)*T,T,attributes={'waterDepth':'deep'})

for y in range(1,H,3):
    if y in (13,16):continue
    c=river_center[y]
    obj('FlowEffects','River current','waterEffect',(c+.5)*T,y*T+16,point=True,attributes={'kind':'river_south','phase':(c*11+y*7)%8,'period':150+(c+y)%3*20})
for y in (8,22):
    c=river_center[y]
    obj('FlowEffects','Foam at midstream rock','waterEffect',(c+.5)*T,y*T+16,point=True,attributes={'kind':'rock_foam','phase':(c+y)%8,'period':145})
for y in range(3,18,3):
    c=42-round((y-1)*7/17)+round(math.sin(y/4)*.6)
    obj('FlowEffects','Clear stream current','waterEffect',(c+1)*T,y*T+16,point=True,attributes={'kind':'stream_south','phase':(c*5+y*3)%8,'period':185+(c+y)%2*25})
for x,y,phase in [(29,22,1),(36,21,5),(31,26,3),(37,25,7)]:
    obj('FlowEffects','Slow lake ripple','waterEffect',(x+.5)*T,(y+.5)*T,point=True,attributes={'kind':'lake_ripple','phase':phase,'period':190+(x+y)%3*30})
bridge_y=14;bridge_x=river_center[bridge_y]
obj('Decor','Timber crossing · walkable','prop',(bridge_x+.5)*T,(bridge_y+.5)*T,128,128,attributes={'atlas':'area-props','frame':'wooden_bridge','frameIndex':0,'waterBridge':True})
for name,x,y,kind in [('River · downstream',river_center[27]*T+16,900,'river'),('Pond · quiet surface',cx*T+16,cy*T+16,'lake'),('Tributary · shallow',38*T+16,10*T+16,'stream')]:
    obj('ActivitySites',name,'waterZone',x,y,point=True,attributes={'kind':kind})

layers=[layer(1,'Ground',ground),layer(2,'Water',water_layer),layer(3,'Shore',shore),layer(4,'Details',details)]
def object_layer(i,name):return {'id':i,'name':name,'type':'objectgroup','draworder':'topdown','opacity':1,'visible':True,'objects':objects[name]}
layers += [object_layer(5,'Collision'),object_layer(6,'FlowEffects'),object_layer(7,'Decor'),object_layer(8,'ActivitySites')]
area=json.loads((MAPS/'GFX5B5AreaTerrain.tsj').read_text(encoding='utf-8'))
area['image']='../../public/assets/tilesets/gfx5b5_area_terrain.png'
tilesets=[dict({'firstgid':1},**area),dict({'firstgid':WATER_FIRST},**water),dict({'firstgid':PROPS_FIRST},**tile_set('QingyunAreaProps',128,128,8,4,'../../public/assets/props/gfx5b5_area_props.png',512,256,[{'id':i,'type':f'area_prop_{i}','properties':[{'name':'frameIndex','type':'int','value':i}]} for i in range(8)]))]
m={'type':'map','version':'1.10','tiledversion':'1.12.2','orientation':'orthogonal','renderorder':'right-down','width':W,'height':H,'tilewidth':T,'tileheight':T,'infinite':False,'nextlayerid':9,'nextobjectid':oid,'backgroundcolor':'#263d31','class':'GFX5B5WaterTrial','properties':[{'name':'phase','type':'string','value':'WATER-A'},{'name':'defaultWorldChanged','type':'bool','value':False}],'layers':layers,'tilesets':tilesets}
OUT.write_text(json.dumps(m,ensure_ascii=False,indent=1),encoding='utf-8')
runtime=json.loads(json.dumps(m))
for ts in runtime['tilesets']:ts['image']=ts['image'].replace('../../public/assets/','../assets/')
RUNTIME.parent.mkdir(parents=True,exist_ok=True);RUNTIME.write_text(json.dumps(runtime,ensure_ascii=False,indent=1),encoding='utf-8')
print(f'Built isolated WATER-A Tiled trial: {W}x{H}, water={sum(1 for g in water_layer if g)}, effects={len(objects["FlowEffects"])}, blocked={len(objects["Collision"])}')

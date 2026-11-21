from pathlib import Path
import json, math

ROOT=Path('.')
OUT=ROOT/'maps'/'gfx5b5'
OUT.mkdir(parents=True,exist_ok=True)
W,H,T=48,32,32
NAMES={
 'city_gate':0,'city_wall':1,'market_stall':2,'food_hall':3,'inn':4,'barracks':5,'forge':6,'apothecary':7,'city_hall':8,'farm_plot':9,'training_yard':10,'watchtower':11,'residential_house':12,'sect_gate':13,'sect_hall':14,'meditation_hall':15,'disciple_house':16,'sect_storehouse':17,'blackwind_camp':18,'spirit_vein':19,'city_tree':20,'pine_tree':21,'ancient_tree':22,'shrub_cluster':23,'flower_patch':24,'stone_lamp':25,'boulder':26,'lantern_post':27,'jade_fountain':28,'herb_stall':29,'pill_stall':30,'artifact_stall':31,'wall_corner':33,'bamboo_clump':34,'grass_ground':35,'stone_paving':36,'market_props':37}
def tile_set(name,tw,th,count,cols,image,iw,ih,props=None,tiles=None,alignment='topleft'):
 d={'type':'tileset','version':'1.10','tiledversion':'1.12.2','name':name,'tilewidth':tw,'tileheight':th,'tilecount':count,'columns':cols,'spacing':0,'margin':0,'image':image,'imagewidth':iw,'imageheight':ih,'objectalignment':alignment,'tilerendersize':'tile','fillmode':'stretch','tiles':tiles or []}
 if props:d['properties']=props
 return d
area=tile_set('GFX5B5AreaTerrain',32,32,256,16,'../../public/assets/tilesets/gfx5b5_area_terrain.png',512,512,
 [{'name':'tilesetPurpose','type':'string','value':'Top-down city, wilderness and sect sample terrain'}],
 [{'id':i,'type':f'area_tile_{i:03d}','properties':[{'name':'family','type':'string','value':('grass' if i<8 else 'forest' if i<16 else 'earth' if i<24 else 'dry_grass' if i<32 else 'city_stone' if i<40 else 'sect_stone' if i<48 else 'rocky_ground' if i<56 else 'water' if i<64 else 'shore' if i<72 else 'dirt_road' if i<80 else 'stone_road' if i<88 else 'cliff_cap' if i<96 else 'cliff_corner' if i<104 else 'cliff_face' if i<112 else 'moss')},{'name':'variant','type':'int','value':i%8+1}]} for i in range(0,144)])
settlement_json=json.loads((ROOT/'public/assets/props/settlement_buildings.json').read_text(encoding='utf-8'))
settlement_tiles=[]
for frame,v in settlement_json['frames'].items():
 rect=v['frame'];tid=(rect['y']//192)*5+rect['x']//192
 settlement_tiles.append({'id':tid,'type':frame,'properties':[{'name':'frame','type':'string','value':frame}]})
settlement=tile_set('QingyunSettlementAssets',192,192,40,5,'../../public/assets/props/settlement_buildings.png',960,1536,
 [{'name':'sourceAtlas','type':'string','value':'settlement_buildings.json'}],settlement_tiles)
props_tiles=[{'id':i,'type':n,'properties':[{'name':'frame','type':'string','value':n}]} for i,n in enumerate(['wooden_bridge','market_cart','sect_stele','sect_banner','meditation_mat','brazier','wood_fence','mission_board'])]
props=tile_set('QingyunAreaProps',128,128,8,4,'../../public/assets/props/gfx5b5_area_props.png',512,256,
 [{'name':'source','type':'string','value':'Aseprite Lua generated area props'}],props_tiles)
for n,d in [('GFX5B5AreaTerrain.tsj',area),('QingyunSettlementAssets.tsj',settlement),('QingyunAreaProps.tsj',props)]:
 (OUT/n).write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')

def idx(x,y):return y*W+x
def put(grid,x,y,v):
 if 0<=x<W and 0<=y<H:grid[idx(x,y)]=v
def rect(grid,x0,y0,x1,y1,v):
 for y in range(y0,y1+1):
  for x in range(x0,x1+1):put(grid,x,y,v)
def line_tiles(grid,points,width,v):
 for (x0,y0),(x1,y1) in zip(points,points[1:]):
  steps=max(abs(x1-x0),abs(y1-y0),1)
  for s in range(steps+1):
   x=round(x0+(x1-x0)*s/steps);y=round(y0+(y1-y0)*s/steps)
   for dy in range(-(width//2),width//2+1):
    for dx in range(-(width//2),width//2+1):put(grid,x+dx,y+dy,v)
def shade(x,y,s=0):
 n=(x*374761393+y*668265263+s*1442695041)&0xffffffff;n=((n^(n>>13))*1274126177)&0xffffffff;return (n^(n>>16))&0xffffffff
def prop(frame,x,y,w=192,h=192,name=None,interactive=False,extra=None):
 idx=NAMES.get(frame)
 if idx is not None:gid=257+idx;atlas='settlement-buildings'
 else:
  pi={'wooden_bridge':0,'market_cart':1,'sect_stele':2,'sect_banner':3,'meditation_mat':4,'brazier':5,'wood_fence':6,'mission_board':7}[frame]
  gid=297+pi;atlas='area-props'
 o={'id':next_obj(),'name':name or frame,'type':'scenery','x':x,'y':y,'width':w,'height':h,'rotation':0,'visible':True,'gid':gid,'properties':[{'name':'atlas','type':'string','value':atlas},{'name':'frame','type':'string','value':frame},{'name':'interactive','type':'bool','value':interactive}]}
 if extra:o['properties']+= [{'name':k,'type':'bool' if isinstance(v,bool) else 'int' if isinstance(v,int) else 'string','value':v} for k,v in extra.items()]
 layers['Scenery']['objects'].append(o);return o
def next_obj():
 global objid
 v=objid;objid+=1;return v
def point(layer,name,x,y,kind,extra=None):
 o={'id':next_obj(),'name':name,'type':kind,'x':x,'y':y,'width':0,'height':0,'point':True,'rotation':0,'visible':True,'properties':[]}
 for k,v in (extra or {}).items():o['properties'].append({'name':k,'type':'string' if isinstance(v,str) else 'bool' if isinstance(v,bool) else 'int','value':v})
 layer['objects'].append(o);return o
def collision(x,y,w,h,name):
 layers['Collision']['objects'].append({'id':next_obj(),'name':name,'type':'blocking','x':x,'y':y,'width':w,'height':h,'rotation':0,'visible':True,'properties':[{'name':'blocksPathfinding','type':'bool','value':True}]})
def rect_obj(layer,name,x,y,w,h,kind,extra=None):
 o={'id':next_obj(),'name':name,'type':kind,'x':x,'y':y,'width':w,'height':h,'rotation':0,'visible':True,'properties':[]}
 for k,v in (extra or {}).items():o['properties'].append({'name':k,'type':'string' if isinstance(v,str) else 'int','value':v})
 layer['objects'].append(o);return o
def actor(x,y,texture,name):point(layers['Actors'],name,x,y,'preview_actor',{'texture':texture,'facing':'down'})
def setup_layers():
 global layers,objid
 objid=1
 layers={'Scenery':{'id':6,'name':'Scenery','type':'objectgroup','draworder':'topdown','opacity':1,'visible':True,'objects':[]},'Actors':{'id':7,'name':'Actors','type':'objectgroup','draworder':'topdown','opacity':1,'visible':True,'objects':[]},'Collision':{'id':8,'name':'Collision','type':'objectgroup','draworder':'topdown','opacity':1,'visible':True,'objects':[]},'Zones':{'id':9,'name':'Zones','type':'objectgroup','draworder':'topdown','opacity':1,'visible':True,'objects':[]},'Spawns':{'id':10,'name':'Spawns','type':'objectgroup','draworder':'topdown','opacity':1,'visible':True,'objects':[]},'ActivitySites':{'id':11,'name':'ActivitySites','type':'objectgroup','draworder':'topdown','opacity':1,'visible':True,'objects':[]}}
def layer(name,id,data):return {'id':id,'name':name,'type':'tilelayer','x':0,'y':0,'width':W,'height':H,'opacity':1,'visible':True,'offsetx':0,'offsety':0,'parallaxx':1,'parallaxy':1,'tintcolor':None,'data':data}
def finish_map(key,title,ground,paths,shore,cliffs,details):
 tilelayers=[layer('Ground',1,ground),layer('Shore',2,shore),layer('Cliffs',3,cliffs),layer('Paths',4,paths),layer('Details',5,details)]
 objlayers=[layers[k] for k in ['Scenery','Actors','Collision','Zones','Spawns','ActivitySites']]
 m={'type':'map','version':'1.10','tiledversion':'1.12.2','orientation':'orthogonal','renderorder':'right-down','width':W,'height':H,'tilewidth':T,'tileheight':T,'infinite':False,'nextlayerid':12,'nextobjectid':objid,'backgroundcolor':'#263d31','class':key,'layers':tilelayers+objlayers,'tilesets':[dict({'firstgid':1},**area),dict({'firstgid':257},**settlement),dict({'firstgid':297},**props)]}
 (OUT/f'{key}.tmj').write_text(json.dumps(m,ensure_ascii=False,indent=1),encoding='utf-8')

def blank_ground(family):return [1+family*8+(shade(x,y,3)%8) for y in range(H) for x in range(W)]

# 1. City: walled entry, central civic square, cross streets and distinct shop fronts.
setup_layers();ground=blank_ground(0);paths=[0]*(W*H);shore=[0]*(W*H);cliffs=[0]*(W*H);details=[0]*(W*H)
rect(ground,7,7,41,27,33)
rect(paths,21,3,25,30,81);rect(paths,2,14,45,17,81);rect(paths,12,9,35,22,33)
for y in range(4,29):
 for x in range(5,43):
  if shade(x,y,88)%19==0 and paths[idx(x,y)]==0:details[idx(x,y)]=129+shade(x,y)%6
# wall and gate band
for x in (0,192,384,576,960,1152,1344):prop('city_wall',x,0)
prop('watchtower',0,0);prop('watchtower',1344,0);prop('city_gate',672,-2)
# civic buildings, shops and residences on either side of public routes
for f,x,y,n in [('city_hall',75,235,'Phủ thành'),('apothecary',330,225,'Dược phường'),('inn',1045,226,'Tửu lâu'),('residential_house',1280,245,'Trạch viện'),('food_hall',78,700,'Trà quán'),('forge',330,700,'Lò rèn'),('market_stall',1050,690,'Thương điếm'),('residential_house',1280,690,'Nhà dân')]:
 prop(f,x,y,176 if f not in ('city_hall','inn') else 192,176 if f not in ('city_hall','inn') else 192,n)
 collision(x+36,y+100,104,60,n+' · vật cản')
prop('jade_fountain',624,394,240,176,'Giếng ngọc')
for x,y in [(90,440),(1330,440),(92,870),(1330,870)]:prop('city_tree',x,y,132,140,'Bồn cây')
for x,y in [(510,260),(916,260),(510,660),(916,660)]:prop('lantern_post',x,y,82,120,'Đèn lồng')
for x,y in [(460,640),(970,610)]:prop('market_props',x,y,150,130,'Sạp hàng')
for x,y in [(420,440),(1000,440)]:prop('mission_board',x,y,98,98,'Bảng ủy thác')
for x,y in [(588,530),(910,490),(412,540),(1100,530),(768,735)]:actor(x,y,'character-civilian','Dân thành')
actor(505,365,'character-merchant','Thương nhân');actor(975,362,'character-merchant','Chủ quán');actor(746,625,'character-guard','Tuần vệ')
rect_obj(layers['Zones'],'Phố chợ',12*32,9*32,24*32,14*32,'activityZone',{'kind':'market'});point(layers['Spawns'],'Cổng thành',768,206,'playerSpawn',{'id':'city-gate'});point(layers['Spawns'],'Cư dân',585,525,'npcSpawn',{'population':'city'})
for name,x,y,kind in [('Dược phường',418,385,'apothecary'),('Tửu lâu',1130,384,'inn'),('Bảng ủy thác',470,470,'commission-board'),('Quảng trường',760,530,'plaza')]:point(layers['ActivitySites'],name,x,y,'activitySite',{'kind':kind})
finish_map('QingyunCityV2','Thanh Vân Thành',ground,paths,shore,cliffs,details)

# 2. Wilderness: winding dirt trail, river with walkable bridge, layered cliffs and open combat clearing.
setup_layers();ground=blank_ground(0);paths=[0]*(W*H);shore=[0]*(W*H);cliffs=[0]*(W*H);details=[0]*(W*H)
for y in range(H):
 for x in range(W):
  if (x<13 and y<15) or (x>30 and y>17):ground[idx(x,y)]=1+8+(shade(x//2,y//2,6)%8)
  if (x>3 and x<17 and 18<y<28 and shade(x//3,y//3,4)%8==0):ground[idx(x,y)]=1+24+(shade(x,y)%8)
# River snakes down the east side. Shore tiles sit in water edge cells, so the river reads as a banked ribbon.
river=[]
for y in range(H):
 center=36+round(2*math.sin((y-4)/6))
 river.append(center)
 for x in range(center-2,center+3):put(ground,x,y,1+56+shade(x,y,51)%8)
 put(shore,center-2,y,1+64+3);put(shore,center+2,y,1+64+1)
# Dirt trail bends around the forest and crosses at the bridge.
trail=[(4,28),(11,26),(16,23),(20,19),(22,15),(26,12),(30,9),(33,7)]
line_tiles(paths,trail,2,1+72)
# plateau/cliff edges on the north and west, with a broken lower spur
for x in range(5,29):put(cliffs,x,4,1+104+(x%8))
for y in range(5,12):put(cliffs,5,y,1+104+(y%8))
for x in range(23,31):put(cliffs,x,9,1+104+(x%8))
for x in range(6,22):
 if x%3!=0:put(ground,x,3,1+24+shade(x,3)%8)
# Vegetation, rocks and stream-side stones, intentionally staggered and irregular.
trees=[(40,70),(126,115),(330,65),(510,110),(755,83),(910,180),(150,350),(390,390),(720,430),(180,650),(475,740),(900,800),(112,880),(570,900),(990,920)]
for i,(x,y) in enumerate(trees):
 frame='pine_tree' if i%3 else 'ancient_tree';w=142 if frame=='pine_tree' else 164;h=142 if frame=='pine_tree' else 156
 prop(frame,x,y,w,h,'Cây tùng' if frame=='pine_tree' else 'Cổ thụ',frame=='ancient_tree',{'dynamic':frame=='ancient_tree','damageable':frame=='ancient_tree'})
 collision(x+w*.38,y+h*.66,w*.24,h*.20,'Gốc cây')
for x,y in [(240,100),(640,155),(980,300),(330,520),(730,700),(1040,865),(260,820),(600,300)]:prop('bamboo_clump',x,y,108,118,'Bụi trúc')
for x,y in [(70,230),(480,240),(850,100),(825,570),(270,760),(1050,410),(610,805)]:prop('boulder',x,y,92,86,'Đá rêu')
for x,y in [(290,210),(780,235),(390,610),(1050,710),(190,500),(540,920)]:prop('shrub_cluster',x,y,90,82,'Bụi rậm')
for x,y in [(310,278),(470,400),(780,630),(250,905)]:prop('flower_patch',x,y,78,70,'Hoa dại')
prop('wooden_bridge',1088,405,128,128,'Cầu gỗ')
for y,center in enumerate(river):
 if 12<=y<=16:continue
 collision((center-2)*32,y*32,5*32,32,'Suối · chặn di chuyển')
for i,(x,y) in enumerate([(610,440),(900,550),(390,790),(760,330)]):actor(x,y,'wolf' if i<3 else 'rabbit','Yêu thú')
point(layers['Spawns'],'Thanh Lang · Tây',560,680,'enemySpawn',{'species':'wolf'});point(layers['Spawns'],'Linh Thỏ · Bắc',850,300,'enemySpawn',{'species':'rabbit'})
point(layers['Spawns'],'Người chơi · Đường mòn',256,900,'playerSpawn',{'id':'wilderness-trail'})
rect_obj(layers['Zones'],'Bãi săn phía Nam',120,660,760,280,'combatZone',{'kind':'beast-hunting'})
point(layers['ActivitySites'],'Linh thảo ven rừng',470,568,'activitySite',{'kind':'herb-gathering'});point(layers['ActivitySites'],'Bờ suối',1120,580,'activitySite',{'kind':'river-bank'})
finish_map('QingyunWildernessV2','Vùng Hoang Dã',ground,paths,shore,cliffs,details)

# 3. Sect: formal north-south axis, a large shared court, training west, residences east, gate south.
setup_layers();ground=blank_ground(0);paths=[0]*(W*H);shore=[0]*(W*H);cliffs=[0]*(W*H);details=[0]*(W*H)
rect(ground,8,3,39,28,1+40)
rect(paths,21,22,25,31,1+80);rect(paths,12,9,35,23,1+40);rect(paths,4,13,13,18,1+80);rect(paths,34,13,44,18,1+80)
rect(ground,5,10,11,21,1+0);rect(ground,36,9,43,22,1+0)
# Formalized central court motif, carefully sparse so the activities remain readable.
for x in range(15,34):
 for y in range(13,22):
  if (x in (15,33) or y in (13,21)) and (x+y)%2==0:details[idx(x,y)]=1+24+(shade(x,y,17)%8)
# Principal hall, support buildings and gate along the southern approach.
prop('sect_hall',560,30,224,224,'Chính điện');prop('meditation_hall',150,230,192,192,'Tĩnh thất');prop('disciple_house',1160,230,176,176,'Xá đệ tử');prop('disciple_house',1180,650,176,176,'Xá đệ tử phía Đông');prop('sect_storehouse',1150,430,176,176,'Tàng kinh các');prop('training_yard',70,620,208,190,'Sân luyện kiếm');prop('sect_gate',672,816,192,192,'Sơn môn')
for x,y in [(430,110),(1000,110),(430,760),(1050,750)]:prop('pine_tree',x,y,128,140,'Tùng xanh')
for x,y in [(1080,360),(1060,560),(410,370),(420,565)]:prop('bamboo_clump',x,y,112,120,'Trúc xanh')
for x,y in [(580,300),(850,300),(585,650),(850,650)]:prop('stone_lamp',x,y,82,110,'Đèn đá')
prop('jade_fountain',650,430,230,170,'Hồ linh tuyền')
prop('sect_stele',480,400,108,108,'Bia giới luật');prop('sect_banner',950,410,98,128,'Cờ Thanh Vân');prop('meditation_mat',500,745,98,98,'Bồ đoàn');prop('meditation_mat',610,745,98,98,'Bồ đoàn');prop('brazier',1020,720,94,94,'Lò hương')
for x,y in [(540,545),(640,565),(770,560),(880,540),(575,870),(760,875),(610,330),(920,330)]:actor(x,y,'character-sect','Đệ tử Thanh Vân')
point(layers['Spawns'],'Cổng tông môn',768,970,'playerSpawn',{'id':'sect-south-gate'});point(layers['Spawns'],'Sân luyện',250,790,'npcSpawn',{'population':'disciples'})
rect_obj(layers['Zones'],'Quảng trường tu luyện',12*32,9*32,24*32,14*32,'activityZone',{'kind':'sect-training'});point(layers['ActivitySites'],'Luyện kiếm',240,760,'activitySite',{'kind':'sword-training'});point(layers['ActivitySites'],'Tĩnh tọa',560,780,'activitySite',{'kind':'meditation'});point(layers['ActivitySites'],'Đại điện',760,252,'activitySite',{'kind':'sect-hall'})
for x,y,w,h,n in [(150,230,192,192,'Tĩnh thất'),(1160,230,176,176,'Xá đệ tử'),(1180,650,176,176,'Xá đệ tử'),(1150,430,176,176,'Tàng kinh các'),(70,620,208,190,'Sân luyện')]:collision(x+w*.22,y+h*.64,w*.56,h*.22,n+' · vật cản')
finish_map('QingyunSectV2','Thanh Vân Tông',ground,paths,shore,cliffs,details)
print('Created three 48×32 Tiled maps with preserved gameplay groups and runtime actors.')

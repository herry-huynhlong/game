from pathlib import Path
import json,hashlib
old_path=Path('maps/thanh_van_world.tmj');old=json.loads(old_path.read_text(encoding='utf-8'));W,H=old['width'],old['height'];assert (W,H,old['tilewidth'],old['tileheight'])==(120,50,32,32)
by={l['name']:l for l in old['layers']};og=by['Ground']['data'];op=by['Paths']['data'];od=by['Details']['data']
def h(x,y,s=0):
 v=(x*374761393+y*668265263+s*1442695041)&0xffffffff;v=((v^(v>>13))*1274126177)&0xffffffff;return(v^(v>>16))&0xffffffff
def in_sample(x,y):return x<=71
base=[[f*4+v for v in range(4)]for f in range(10)]
def biome(x,y,oldlocal):
 if 32<=oldlocal<=39:return 10,216+(oldlocal-32)%8
 if 40<=oldlocal<=47:return 10,224+(oldlocal-40)%8
 if x>=72:
  # Keep the city plaza coherent; reserve natural ground for its outer garden belt.
  if 77<=x<=116 and 9<=y<=43:return 9,None
  return 6,None
 if 51<=x<=70 and 11<=y<=31:return 6,None
 if 36<=x<=70:
  # Keep one legible forest-floor mass and open grass around the paths.
  if 39<=x<=48 and 5<=y<=43:return 4,None
  if 49<=x<=70 and 3<=y<=9:return 4,None
  return 6,None
 if x<35 and y<38:
  return 6,None
 return (7 if y>=44 else 6),None
fam=[];ground=[]
for y in range(H):
 for x in range(W):
  idx=y*W+x
  if not in_sample(x,y):fam.append(-1);ground.append(og[idx]);continue
  oldlocal=og[idx]-1;f,water=biome(x,y,oldlocal);fam.append(f)
  ground.append(257+(water if water is not None else base[f][h(x,y,31)%4]))
pathcells={i for i,v in enumerate(op)if v};roads=[]
for i in pathcells:
 x=i%W;y=i//W
 if in_sample(x,y) and 8<=x<=71 and 14<=y<=28:
  # The broad central court is a continuous paving field, including old water underlays.
  fam[i]=9;ground[i]=257+36+h(x,y,211)%4
for i,v in enumerate(op):
 if not in_sample(i%W,i//W):roads.append(v);continue
 if not v:roads.append(0);continue
 x=i%W;y=i//W;mask=0
 for bit,(dx,dy)in enumerate(((0,-1),(1,0),(0,1),(-1,0))):
  xx=x+dx;yy=y+dy
  if 0<=xx<W and 0<=yy<H and (yy*W+xx) in pathcells:mask|=1<<bit
 if 8<=x<=71 and 14<=y<=28:
  roads.append(0);continue
 if 77<=x<=116 and 9<=y<=43:
  # The walled city's broad plaza is a continuous dressed paving field, not a road overlay.
  roads.append(0);continue
 style=1 if x>=72 else 0 if 51<=x<=70 and 11<=y<=31 else 3 if x<35 else 2
 roads.append(257+104+style*16+mask)
variation=[0]*(W*H);details=[0]*(W*H);trans=[0]*(W*H)
pairs=[(6,0),(6,4),(0,5),(0,10),(6,9),(6,2),(0,8),(4,10)];pidx={frozenset(v):i for i,v in enumerate(pairs)}
for i in range(W*H):
 x=i%W;y=i//W;f=fam[i]
 if not in_sample(x,y):details[i]=od[i];continue
 if f==10:continue
 density=71
 if h(x,y,91)%density==0:variation[i]=257+200+h(x,y,92)%16
 if od[i] and h(x,y,od[i])%3==0:details[i]=257+200+h(x,y,od[i])%16
for y in range(H):
 for x in range(W):
  if not in_sample(x,y):continue
  i=y*W+x;f=fam[i];cand=[]
  for side,(dx,dy) in enumerate(((0,-1),(1,0),(0,1),(-1,0))):
   xx=x+dx;yy=y+dy
   if 0<=xx<W and 0<=yy<H:
    nf=fam[yy*W+xx]
    if nf!=f and frozenset((f,nf))in pidx:cand.append((side,nf,pidx[frozenset((f,nf))]))
  if cand:
   side,nf,g=cand[h(x,y,42)%len(cand)];reverse=0 if f==pairs[g][0] else 4;trans[i]=257+40+g*8+reverse+side
new=json.loads(json.dumps(old));new['class']='QingyunWorldV2';new['nextlayerid']=10
by={l['name']:l for l in new['layers']};by['Ground']['data']=ground;by['Paths']['data']=roads;by['Details']['data']=details
def layer(ident,name,data):return {'id':ident,'name':name,'type':'tilelayer','x':0,'y':0,'width':W,'height':H,'opacity':1,'visible':True,'offsetx':0,'offsety':0,'parallaxx':1,'parallaxy':1,'tintcolor':None,'data':data}
new['layers'].insert(1,layer(8,'GroundVariation',variation));new['layers'].insert(2,layer(9,'TerrainTransitions',trans))
colors=['#77523A','#915741','#AC884B','#685747','#47583A','#716552','#56804A','#9B8C49','#7C8578','#8D9084','#39788A'];names=['G01 Soil','G02 Red Soil','G03 Dry Soil','G04 Damp Soil','G05 Forest Floor','G06 Gravel','G07 Grass','G08 Dry Grass','G09 Natural Stone','G10 City Paving','Water']
tiles=[]
for f in range(10):
 for v in range(4):tiles.append({'id':f*4+v,'type':names[f],'properties':[{'name':'terrain','type':'string','value':f'G{f+1:02d}'},{'name':'variant','type':'int','value':v+1}]})
for g,(a,b) in enumerate(pairs):
 for v in range(8):tiles.append({'id':40+g*8+v,'type':f'edge_{a}_{b}_{v}','properties':[{'name':'terrainTransition','type':'string','value':f'{names[a]} ↔ {names[b] if b<10 else "water"}'},{'name':'edgeVariant','type':'int','value':v}]})
for style,name in enumerate(['R01 Residential Earth','R02 City Stone','R03 Forest Trail','R04 Sect Walkway']):
 for mask in range(16):tiles.append({'id':104+style*16+mask,'type':name,'properties':[{'name':'roadStyle','type':'string','value':name[:3]},{'name':'neighborMask','type':'int','value':mask}]})
for i,name in enumerate(['cliff_face','cliff_lip','cliff_corner','cliff_foot']):
 for v in range(8):tiles.append({'id':168+i*8+v,'type':name,'properties':[{'name':'terrainFeature','type':'string','value':name},{'name':'variant','type':'int','value':v+1}]})
for i in range(16):tiles.append({'id':200+i,'type':'ground_detail','properties':[{'name':'terrainFeature','type':'string','value':'ground_detail'},{'name':'variant','type':'int','value':i+1}]})
for i in range(16):tiles.append({'id':216+i,'type':'water_shore' if i>=8 else 'water_surface','properties':[{'name':'terrainFeature','type':'string','value':'water'},{'name':'variant','type':'int','value':i+1}]})
for i in range(24):tiles.append({'id':232+i,'type':'stone_accent','properties':[{'name':'terrainFeature','type':'string','value':'stone_accent'},{'name':'variant','type':'int','value':i+1}]})
baseTiles=[]
for f in range(10):
 for v in range(4):baseTiles.append({'tileid':f*4+v,'wangid':[f+1]*8})
transTiles=[]
for g,(a,b)in enumerate(pairs):
 for v in range(8):
  basefam,patchfam=(a,b)if v<4 else(b,a);side=v%4;wid=[basefam+1]*8;wid[side*2]=patchfam+1;wid[(side*2+1)%8]=patchfam+1;transTiles.append({'tileid':40+g*8+v,'wangid':wid})
roadNames=['R01 Residential Earth','R02 City Stone','R03 Forest Trail','R04 Sect Walkway'];roadColors=[{'name':n[:3],'color':c,'tile':104+i*16,'probability':1}for i,(n,c)in enumerate(zip(roadNames,['#A88659','#A9ADA1','#7C714B','#CFCEB9']))];roadTiles=[]
for style in range(4):
 for mask in range(16):
  wid=[0]*8
  for bit,idx in enumerate((0,2,4,6)):
   if mask&(1<<bit):wid[idx]=style+1;wid[(idx+1)%8]=style+1
  roadTiles.append({'tileid':104+style*16+mask,'wangid':wid})
wangsets=[{'name':'Qingyun Terrain Biomes','type':'mixed','tile':0,'colors':[{'name':n,'color':colors[i],'tile':i*4,'probability':1}for i,n in enumerate(names)],'wangtiles':baseTiles+transTiles},{'name':'Qingyun Roads','type':'edge','tile':104,'colors':roadColors,'wangtiles':roadTiles}]
newset={'firstgid':257,'name':'QingyunTerrainV2','tilewidth':32,'tileheight':32,'tilecount':256,'columns':16,'spacing':0,'margin':0,'image':'../public/assets/tilesets/qingyun_terrain_v2.png','imagewidth':512,'imageheight':512,'objectalignment':'topleft','tilerendersize':'tile','fillmode':'stretch','properties':[{'name':'wangAutoTiling','type':'bool','value':True}],'tiles':tiles,'wangsets':wangsets}
new['tilesets'].append(newset);side=dict(newset);side.pop('firstgid');side.update({'type':'tileset','version':'1.10','tiledversion':'1.12.2'})
Path('maps/QingyunTerrainV2.tsj').write_text(json.dumps(side,ensure_ascii=False,indent=2),encoding='utf-8')
props=by['WorldProps'];nextid=max(new.get('nextobjectid',1),max(o['id'] for o in props['objects'])+1)
slots=[(1100,260,0),(1300,480,1),(1530,220,2),(1800,300,3),(2050,520,4),(1280,1260,5),(1640,1350,6),(2060,1100,7),(980,1170,8),(2190,820,9)]
for x,y,idx in slots:
 props['objects'].append({'id':nextid,'name':f'gfx5b5-rock-s{idx+1:02d}','type':'decor-rock','x':x,'y':y,'width':64,'height':64,'rotation':0,'visible':True,'properties':[{'name':'sprite','type':'string','value':f'terrain_rock_{idx+1:02d}'},{'name':'collision','type':'bool','value':False},{'name':'gfx5b5Sample','type':'bool','value':True}]});nextid+=1
new['nextobjectid']=nextid
Path('maps/QingyunWorldV2.tmj').write_text(json.dumps(new,ensure_ascii=False,indent=1),encoding='utf-8')
oldby={l['name']:l for l in old['layers']};check={'mapSize':[W,H],'tileSize':[32,32],'sampleBoundsTiles':[0,71,0,H-1],'convertedGroundCells':sum(in_sample(x,y)for y in range(H)for x in range(W)),'layers':[l['name'] for l in new['layers']],'objects':{n:len(by[n]['objects'])for n in ['WorldProps','Collision','Zones','Spawns','ActivitySites']},'collisionsUnchanged':by['Collision']['objects']==oldby['Collision']['objects'],'zonesUnchanged':by['Zones']['objects']==oldby['Zones']['objects'],'spawnsUnchanged':by['Spawns']['objects']==oldby['Spawns']['objects'],'activitySitesUnchanged':by['ActivitySites']['objects']==oldby['ActivitySites']['objects'],'legacyMapSha256':hashlib.sha256(old_path.read_bytes()).hexdigest(),'terrainV2FirstGid':257,'terrainV2TileCount':256,'addedDecorRocks':len(slots)}
Path('maps/QingyunWorldV2.validation.json').write_text(json.dumps(check,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(check,ensure_ascii=False,indent=2))

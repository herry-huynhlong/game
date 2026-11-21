import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd(),out=path.join(root,'maps/world-rebuild-1b.tmj'),backup=path.join(root,'maps/world-rebuild-1b-before-geography.tmj'),W=224,H=144,T=32;
if(!fs.existsSync(backup)&&fs.existsSync(out))fs.copyFileSync(out,backup);
const idx=(x,y)=>y*W+x,grid=()=>Array(W*H).fill(0),rand=(seed)=>{let x=seed|0;return()=>{x=(x*1664525+1013904223)|0;return(x>>>0)/4294967296}};
const noise=rand(74621),layers=[];let lid=1,oid=1;
const props=o=>Object.entries(o).map(([name,value])=>({name,type:typeof value==='number'?'int':typeof value==='boolean'?'bool':'string',value}));
function tileLayer(name,data){layers.push({id:lid++,name,type:'tilelayer',visible:true,opacity:1,x:0,y:0,width:W,height:H,data})}
function objLayer(name,objects){layers.push({id:lid++,name,type:'objectgroup',visible:true,opacity:1,x:0,y:0,draworder:'topdown',objects})}
function object(layer,name,type,x,y,w,h,extra={}){const o={id:oid++,name,type,x,y,width:w,height:h,rotation:0,visible:true,...extra};layer.push(o);return o}
const point=(layer,name,tx,ty,metadata)=>object(layer,name,'marker',tx*T+16,ty*T+16,0,0,{point:true,properties:props(metadata)});
const ground=grid(),details=grid(),roads=grid(),transitions=grid(),cliffs=grid(),water=grid(),shore=grid(),waterCells=new Set();
const family=(first,v=0)=>first+v+1;
for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  let f=0;
  if(x<64&&y>31&&y<138)f=x<24?112:8; // danger deepens westward
  if(y<38&&x>=60&&x<=159)f=(x<72||x>149)?16:24; // mountain foothills and higher rock
  if(x>=64&&x<=152&&y>=39&&y<=95)f=(x>=64&&x<=152)?32:0; // city stone precinct
  if(y>=97&&y<127&&x>=68&&x<=154)f=8; // southern fields and suburb
  if(y>=126&&x>=92&&x<=132)f=40; // sect paving
  if(x>=179&&y>=12)f=(y<30||y>128)?8:0; // open eastern pasture
  if(x>=158&&x<=180&&y>=0&&y<H)f=8; // banks
  ground[idx(x,y)]=family(f,Math.floor(noise()*8));
}
function lineTiles(points,radius,fam){for(let i=0;i<points.length-1;i++){const[x0,y0]=points[i],[x1,y1]=points[i+1],steps=Math.max(Math.abs(x1-x0),Math.abs(y1-y0));for(let s=0;s<=steps;s++){const x=Math.round(x0+(x1-x0)*s/steps),y=Math.round(y0+(y1-y0)*s/steps);for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++)if(dx*dx+dy*dy<=radius*radius+1&&x+dx>=0&&y+dy>=0&&x+dx<W&&y+dy<H)roads[idx(x+dx,y+dy)]=family(fam,Math.floor(noise()*8))}}}
// Four marked routes radiate from the central city: a switchback pass, a bridge,
// southern fields and the three west-forest danger bands.
lineTiles([[111,68],[111,57],[111,45],[111,40]],1,80);
lineTiles([[111,40],[111,34],[107,30],[107,24],[107,20],[107,15],[111,10],[111,2]],1,72);
lineTiles([[151,69],[158,69],[166,69],[177,69],[185,72],[198,76],[211,76],[222,73]],1,72);
lineTiles([[111,95],[111,102],[111,112],[106,119],[111,127],[111,139]],1,72);
lineTiles([[64,69],[57,69],[49,73],[42,75],[34,80],[27,84],[18,89],[8,94]],1,72);
// Local activity lanes remain connected to the cardinal routes.
lineTiles([[77,67],[86,67],[96,67],[103,68],[119,68],[131,68],[140,68]],0,80);
lineTiles([[90,99],[90,112],[99,116],[111,112],[127,112],[142,106]],1,72);
lineTiles([[93,128],[101,132],[111,132],[122,132],[131,128]],1,80);

// Banks and river follow the east edge. The only dry cells through the river are
// the four rows occupied by the walkable bridge.
const riverCenter=[];
for(let y=0;y<H;y++){const c=170+Math.round(1.8*Math.sin(y/8)+.8*Math.sin(y/17));riverCenter[y]=c;for(let x=c-4;x<=c+4;x++){const cell=idx(x,y);water[cell]=444+8+((x+y*3)%8);waterCells.add(cell)}}
const isWater=(x,y)=>x>=0&&y>=0&&x<W&&y<H&&water[idx(x,y)]!==0;
for(let y=0;y<H;y++)for(let x=riverCenter[y]-4;x<=riverCenter[y]+4;x++)if(isWater(x,y)){
  const north=!isWater(x,y-1),south=!isWater(x,y+1),west=!isWater(x-1,y),east=!isWater(x+1,y);let id=null;
  if(north&&west)id=40;else if(north&&east)id=42;else if(south&&west)id=44;else if(south&&east)id=46;else if(north)id=32;else if(south)id=34;else if(west)id=36;else if(east)id=38;
  if(id!==null)shore[idx(x,y)]=444+id+((x+y)%2);
}
// Mountain ridge caps, vertical faces, and physical cliff barriers. Three aligned
// openings form a winding but traversable pass to the north map edge.
const collisionObjects=[],footprintObjects=[],decor=[],buildings=[],marketDecor=[],interactions=[],flowEffects=[],encounters=[],regions=[],navigation=[],population=[];
function addCollision(name,x,y,w,h,kind='terrain'){const o=object(collisionObjects,name,'collision',x,y,w,h,{properties:props({kind,blocks:true})});object(footprintObjects,name+'-footprint','footprint',x,y,w,h,{properties:props({kind,blocks:true})});return o}
const ridgeData=[{y:9,lo:110,hi:113},{y:19,lo:104,hi:109},{y:29,lo:110,hi:113}];
for(const ridge of ridgeData){for(let x=67;x<157;x+=2){if(x>=ridge.lo&&x<=ridge.hi)continue;cliffs[idx(x,ridge.y)]=89+((x+ridge.y)%8);cliffs[idx(x,ridge.y+1)]=105+((x*3+ridge.y)%8);cliffs[idx(x,ridge.y+2)]=105+((x+ridge.y*2)%8);addCollision('Vách núi · sống '+ridge.y,x*T,(ridge.y+1)*T,64,64,'mountain-cliff')}}

const G={build:257,oldTree:297,bamboo:312,rock:320,farm:330,pine:400,broad:408,willow:416,monsterTree:424,home:432,shop:433,dorm:434,hut:435,wall:436,waterProps:508,gate:516,cityStructures:520,marketStalls:524};
function prop(name,gid,tx,ty,w,h,fp,kind,more={}){const x=tx*T,y=ty*T;object(decor,name,'prop',x,y,w,h,{gid,properties:props({kind,...more})});if(fp)addCollision(name+'-collision',x+fp.x,y+fp.y,fp.w,fp.h,kind)}

// Walled capital at the map center with a six-tile opening on every side.
const city={left:64,right:152,top:39,bottom:96},gateY0=66,gateY1=72,gateX0=108,gateX1=114;
for(let x=city.left;x<city.right;x+=2){if(x<gateX0||x>=gateX1){prop(`Tường bắc ${x}`,G.wall,x,city.top,64,64,null,'wall',{edge:'north'});addCollision(`Tường bắc ${x}`,x*T,city.top*T,64,32,'city-wall')}if(x<gateX0||x>=gateX1){prop(`Tường nam ${x}`,G.wall+2,x,city.bottom,64,64,null,'wall',{edge:'south'});addCollision(`Tường nam ${x}`,x*T,city.bottom*T,64,32,'city-wall')}}
for(let y=city.top;y<city.bottom;y+=2){if(y<gateY0||y>=gateY1){prop(`Tường tây ${y}`,G.wall+1,city.left,y,64,64,null,'wall',{edge:'west'});addCollision(`Tường tây ${y}`,city.left*T,y*T,32,64,'city-wall')}if(y<gateY0||y>=gateY1){prop(`Tường đông ${y}`,G.wall+1,city.right,y,64,64,null,'wall',{edge:'east'});addCollision(`Tường đông ${y}`,city.right*T,y*T,32,64,'city-wall')}}
for(const[x,y]of[[64,39],[150,39],[64,94],[150,94]])prop(`Tháp góc ${x}-${y}`,G.wall+7,x,y,64,64,{x:18,y:0,w:28,h:24},'tower',{region:'city'});
// Four hand-drawn directions. Paired narrow supports collide; the center lane remains open.
function directionalGate(name,gid,tx,ty,direction,wallTile){const x=tx*T,y=ty*T;object(decor,name,'prop',x,y,192,192,{gid,properties:props({kind:'gate',direction,region:'city',rotation:0,occludesByFootY:true})});if(direction==='north'||direction==='south'){const wy=wallTile*T-12;addCollision(name+' · trụ trái',x+44,wy,22,24,'gate-pier');addCollision(name+' · trụ phải',x+126,wy,22,24,'gate-pier')}else{const wx=wallTile*T-12,top=y-192;addCollision(name+' · trụ trên',wx,top+44,24,22,'gate-pier');addCollision(name+' · trụ dưới',wx,top+126,24,22,'gate-pier')}}
directionalGate('Cổng Bắc · mặt núi',G.gate,108,41,'north',39);
directionalGate('Cổng Nam · mặt ngoại thành',G.gate+1,108,98,'south',96);
directionalGate('Cổng Đông · mặt bờ sông',G.gate+2,148,72,'east',152);
directionalGate('Cổng Tây · mặt rừng',G.gate+3,60,72,'west',64);
for(const[tx,ty]of[[64,64],[64,72],[150,64],[150,72]])prop(`Trụ nối tường cổng ${tx}-${ty}`,G.wall+6,tx,ty,64,64,{x:20,y:4,w:24,h:20},'gate-pier',{region:'city'});
// The four radial arteries stay open. Short branches form connected, walkable
// frontages for the residence, quest office, inns and market court.
lineTiles([[111,68],[123,68],[123,56]],1,80);
lineTiles([[111,68],[92,68],[92,66]],1,72);
lineTiles([[111,68],[84,68],[84,85]],1,80);
lineTiles([[111,68],[136,68],[136,85]],1,80);
lineTiles([[123,68],[143,68],[143,64],[130,64],[130,61],[145,61]],1,72);
const cityBuilding=(name,gid,x,y,w,h,metadata)=>object(buildings,name,'prop',x,y,w,h,{gid,properties:props({kind:'city-building',region:'city',...metadata})});
const solidBuilding=(name,x,y,w,h,doorWidth=56)=>{
  const top=y-h,left=x,right=x+w,doorL=left+w/2-doorWidth/2,doorR=left+w/2+doorWidth/2,wall=18;
  addCollision(name+' · rear wall',left+20,top+24,w-40,wall,'building-wall');
  addCollision(name+' · left wall',left+20,top+24,wall,h-72,'building-wall');
  addCollision(name+' · right wall',right-38,top+24,wall,h-72,'building-wall');
  addCollision(name+' · front wall left',left+20,y-48,doorL-(left+20),wall,'building-wall');
  addCollision(name+' · front wall right',doorR,y-48,right-20-doorR,wall,'building-wall');
};
const site=(id,name,x,y,kind,extra={})=>object(interactions,name,'marker',x,y,0,0,{point:true,properties:props({markerId:id,regionId:'city',kind,active:false,...extra})});
// B03: the city lord's hall is the largest civic structure, on the north-east
// side of the plaza with its own forecourt and a clear southern entrance.
cityBuilding('B03 · Phủ thành chủ',G.cityStructures+2,3760,1776,384,288,{buildingId:'city-lord-residence',reservedRole:'city-lord',elevation:'principal'});
solidBuilding('B03 · tường phủ',3760,1776,384,288,72);
point(navigation,'Phủ thành chủ · lối vào',123,56,{markerId:'city-hall-entrance',regionId:'city',walkable:true,buildingId:'city-lord-residence'});
site('city-lord-residence','Phủ thành chủ · nơi ở tương lai',3952,1816,'CityLordResidence',{active:false});
site('city-lord-spawn-future','Điểm thành chủ tương lai',3952,1680,'CityLordSpawnFuture',{active:false});
site('city-guard-post-future','Chốt hộ vệ phủ · dự trữ',3744,1696,'GuardPost',{active:false});
site('city-courtyard-future','Sân phủ thành chủ',3952,1856,'Courtyard',{active:false});
site('city-restricted-area-future','Khu vực phủ hạn chế tương lai',4000,1600,'RestrictedAreaFuture',{active:false});
// B04: a dedicated public commission hall, with separate future issue/return desks.
cityBuilding('B04 · Trạm công vụ Thanh Vân',G.cityStructures+3,2784,2112,256,205,{buildingId:'commission-hall'});
solidBuilding('B04 · tường trạm công vụ',2784,2112,256,205,64);
point(navigation,'Trạm công vụ · lối vào',91,67,{markerId:'quest-office',regionId:'city',walkable:true,buildingId:'commission-hall'});
site('quest-giver-future','QuestGiver · bàn phát nhiệm vụ tương lai',2888,2144,'QuestGiver');
site('quest-receiver-future','QuestReceiver · bàn trả nhiệm vụ tương lai',2968,2144,'QuestReceiver');
site('quest-office-waiting-future','Sân chờ trạm công vụ',2928,2192,'CommissionWaitingArea');
// B01/B02: distinct two-storey lodging and tavern fronts on the south streets.
cityBuilding('B01 · Khách điếm Vân Lai',G.cityStructures,4192,2752,288,230,{buildingId:'inn-cloud-arrival'});
solidBuilding('B01 · tường khách điếm',4192,2752,288,230,56);
point(navigation,'Khách điếm · lối vào',135,87,{markerId:'inn-entrance',regionId:'city',walkable:true,buildingId:'inn-cloud-arrival'});
site('inn-arrival-future','Điểm khách tới khách điếm',4336,2800,'InnArrival');
cityBuilding('B02 · Tửu quán Tùng Ảnh',G.cityStructures+1,2544,2752,288,230,{buildingId:'tavern-pine-shadow'});
solidBuilding('B02 · tường tửu quán',2544,2752,288,230,56);
point(navigation,'Tửu quán · lối vào',83,87,{markerId:'tavern-entrance',regionId:'city',walkable:true,buildingId:'tavern-pine-shadow'});
for(const[id,x,y,job]of[['bartender',81,84,'bartender'],['host',84,84,'host'],['cook',87,84,'cook']])site(`tavern-${id}-future`,`Vị trí ${job} tửu quán`,x*T+16,y*T+16,'TavernWork',{job,active:false});
site('tavern-guest-arrival-future','Điểm khách tới tửu quán',2688,2800,'TavernGuestArrival');
// B05: seven separately framed stalls in two staggered rows; the walking aisles
// and main east-west road remain open for the future merchant roster.
const marketStalls=[
  {id:'market-stall-01',name:'Sạp vải Lụa Nguyệt',gid:0,x:4144,y:1904,kind:'fabric'},
  {id:'market-stall-02',name:'Sạp lương thực Mễ Hương',gid:1,x:4352,y:1904,kind:'food'},
  {id:'market-stall-03',name:'Sạp dược liệu Thanh Diệp',gid:3,x:4560,y:1904,kind:'herbs'},
  {id:'market-stall-04',name:'Sạp đồ gốm',gid:2,x:4040,y:2048,kind:'ceramics'},
  {id:'market-stall-05',name:'Sạp trà',gid:5,x:4248,y:2048,kind:'tea'},
  {id:'market-stall-06',name:'Sạp tạp hóa',gid:6,x:4456,y:2048,kind:'household'},
  {id:'market-stall-07',name:'Sạp gia vị',gid:4,x:4352,y:1776,kind:'spices'},
];
for(const stall of marketStalls){
  const w=112,h=98;
  object(marketDecor,stall.name,'prop',stall.x,stall.y,w,h,{gid:G.marketStalls+stall.gid,properties:props({kind:'merchant-stall',stallId:stall.id,displayGoods:stall.kind,region:'city',activeMerchant:false})});
  addCollision(stall.name+' · quầy',stall.x+18,stall.y-24,w-36,12,'market-counter');
  point(navigation,stall.name+' · lối tiếp cận',(stall.x+w/2-16)/T,(stall.y+24-16)/T,{markerId:stall.id,regionId:'city',walkable:true,stallId:stall.id});
  point(interactions,stall.name+' · vị trí thương nhân tương lai',(stall.x+w/2-16)/T,(stall.y-8-16)/T,{markerId:`${stall.id}-merchant-future`,regionId:'city',kind:'MerchantStall',stallId:stall.id,active:false});
}
// Keep four ordinary residences as street texture around the new civic core.
for(const[n,x,y,g]of[['Nhà phố bắc tây',73,47,G.home],['Nhà phố bắc đông',132,47,G.home],['Nhà phố tây',72,79,G.home]])prop(n,g,x,y,160,144,{x:37,y:-30,w:86,h:25},'building',{region:'city'});
// Southern outskirts: residences, fields and cultivation yards.
for(const[n,x,y,g]of[['Nhà ngoại thành A',75,102,G.home],['Nhà ngoại thành B',132,102,G.home],['Quán đường nam',93,115,G.shop],['Lều nông hộ',135,116,G.hut]])prop(n,g,x,y,160,144,{x:37,y:-30,w:86,h:25},'building',{region:'south-suburb'});
for(const[fx,fy]of[[76,112],[79,112],[82,112],[76,115],[79,115],[82,115],[140,108],[143,108],[140,111],[143,111]])for(let dy=0;dy<3;dy++)for(let dx=0;dx<3;dx++)details[idx(fx+dx,fy+dy)]=family(112,Math.floor(noise()*8));
prop('Sơn môn Thanh Vân',G.build+13,104,133,192,192,{x:34,y:-32,w:124,h:27},'sect-gate',{region:'sect'});
prop('Thiền đường tông môn',G.build+15,118,128,192,192,{x:37,y:-34,w:120,h:28},'building',{region:'sect'});
for(const[x,y]of[[96,130],[96,137],[131,130],[131,137]])prop(`Ký túc xá ${x}-${y}`,G.dorm,x,y,160,144,{x:37,y:-30,w:86,h:24},'building',{region:'sect',reservedRole:'disciples'});

// Walkable bridge surface uses the already-tested WATER-A bridge sprite.
const bridgeY=68,riverX=riverCenter[bridgeY];prop('Cầu đông qua sông',G.waterProps,riverX-5,bridgeY+3,320,128,null,'bridge',{atlas:'area-props',frameIndex:0,waterBridge:true,collision:'walkable-span'});
// Water depth blocks every river row except the bridge span; effects reuse verified
// WATER-A river_east frames and never simulate enemies or gameplay spawns.
for(let y=0;y<H;y++){
  let start=-1;
  for(let x=0;x<=W;x++){
    const blocked=x<W&&isWater(x,y)&&!(y>=bridgeY-2&&y<=bridgeY+2&&Math.abs(x-riverCenter[y])<=5);
    if(blocked&&start<0)start=x;
    if(!blocked&&start>=0){addCollision('Sông sâu · không thể đi bộ',start*T,y*T,(x-start)*T,T,'deep-water');start=-1}
  }
}
for(let y=2;y<H;y+=3){const x=riverCenter[y];flowEffects.push({id:oid++,name:'Dòng chảy sông lớn',type:'waterEffect',x:x*T+16,y:y*T+16,width:0,height:0,point:true,rotation:0,visible:true,properties:props({kind:'river_east',phase:(x*5+y*7)%8,period:145+(x+y)%4*15})})}

// Mountain slopes and distinct woodland bands; all tree trunk footprints stay small.
const pine=[[70,4],[78,5],[151,5],[144,16],[72,25],[80,31],[145,31],[132,33],[120,3],[95,4],[86,23],[135,26]];
for(let i=0;i<pine.length;i++){const[x,y]=pine[i];prop(`Tùng chân núi ${i+1}`,G.pine,x,y,112,132,{x:27,y:-12,w:34,h:12},'tree',{species:'T03',region:'north-mountain'})}
const westTrees=[
  ...[[55,45],[48,49],[58,56],[51,61],[58,75],[50,84],[57,94],[48,103],[55,115],[47,124]].map(([x,y])=>[x,y,'T04']),
  ...[[41,52],[37,66],[43,81],[35,94],[40,109],[31,119]].map(([x,y])=>[x,y,'T05']),
  ...[[24,45],[17,55],[27,64],[12,74],[21,86],[9,98],[27,105],[14,119],[23,128],[5,113],[7,48],[31,49]].map(([x,y])=>[x,y,'T06']),
  ...[[35,40],[29,59],[44,88],[32,101],[19,113],[8,126]].map(([x,y])=>[x,y,'T03']),
];
for(let i=0;i<westTrees.length;i++){const[x,y,s]=westTrees[i],gid=s==='T03'?G.pine:s==='T04'?G.broad:s==='T05'?G.willow:G.monsterTree;prop(`Rừng tây · ${s} ${i+1}`,gid,x,y,120,140,{x:29,y:-15,w:38,h:14},'tree',{species:s,region:x<28?'forest-deep':x<45?'forest-middle':'forest-outer'})}
const eastTrees=[[187,39],[197,49],[208,59],[187,85],[199,98],[213,110],[184,123],[208,129]];
for(let i=0;i<eastTrees.length;i++){const[x,y]=eastTrees[i];prop(`Thảo nguyên · cây ${i+1}`,G.broad,x,y,112,132,{x:29,y:-12,w:36,h:12},'tree',{species:'T04',region:'east-pasture'})}
for(const[x,y]of[[91,108],[126,108],[88,119],[124,119],[94,125],[128,124]])prop(`Cổ thụ ngoại thành ${x}-${y}`,G.oldTree+11+(x%4),x,y,112,96,{x:37,y:-18,w:38,h:16},'tree',{region:'south-suburb'});
for(let i=0;i<9;i++){const x=71+(i*17)%83,y=44+(i*11)%48;prop(`Đá cảnh quan ${i+1}`,G.rock+(i%8),x,y,64,64,{x:20,y:-14,w:24,h:14},'rock',{region:'city-outskirts'})}
for(const[x,y]of[[92,41],[127,42],[145,60],[88,96],[133,99],[99,122],[136,123]])prop(`Trúc tông môn ${x}-${y}`,G.bamboo,x,y,96,96,{x:27,y:-14,w:42,h:14},'bamboo',{region:y>120?'sect':'city-outskirts'});

// Future monster habitat metadata only: levels follow RealmConfig indexes 0=Qi,
// 1=Foundation, 2=Golden Core. Every zone remains dormant (zero live spawns).
function rectZone(name,x,y,w,h,metadata){object(encounters,name,'encounter-zone',x*T,y*T,w*T,h*T,{properties:props({spawnCount:0,enemySpawnEnabled:false,...metadata})})}
rectZone('Ngoại thành · yêu thú cấp thấp',68,98,26,28,{zoneId:'southern-outskirts',enemyProfile:'qinglang-low',dangerTier:1,realmIndexMin:0,realmIndexMax:0});
rectZone('Rìa rừng yêu thú',45,39,19,89,{zoneId:'forest-outer',enemyProfile:'qinglang',dangerTier:1,realmIndexMin:0,realmIndexMax:0});
rectZone('Rừng yêu thú giữa',27,39,18,94,{zoneId:'forest-middle',enemyProfile:'qinglang-elite',dangerTier:2,realmIndexMin:1,realmIndexMax:1});
rectZone('Rừng yêu thú sâu',0,36,27,100,{zoneId:'forest-deep',enemyProfile:'demonwood',dangerTier:3,realmIndexMin:2,realmIndexMax:2});
function region(name,x,y,w,h,id,metadata={}){object(regions,name,'region',x*T,y*T,w*T,h*T,{properties:props({regionId:id,spawnCount:0,...metadata})})}
region('Thanh Vân Thành',64,39,88,57,'city');region('Núi và đèo phía bắc',64,0,94,39,'north-mountain');region('Thảo nguyên bờ đông',179,0,45,144,'east-pasture');region('Ngoại thành phía nam',64,97,94,29,'south-suburb');region('Thanh Vân Tông',92,126,42,18,'sect');region('Rìa rừng tây',45,39,19,89,'forest-outer',{dangerTier:1});region('Rừng tây giữa',27,39,18,94,'forest-middle',{dangerTier:2});region('Rừng tây sâu',0,36,27,100,'forest-deep',{dangerTier:3});
const nav=(id,title,x,y,regionId)=>point(navigation,title,x,y,{markerId:id,regionId,walkable:true});
nav('city-center','Quảng trường trung tâm',111,68,'city');
// Gate navigation markers sit one cell clear of the pier collision bounds; the
// 16px nav cells and the 12px debug actor must both fit through each opening.
nav('gate-north','Cổng Bắc · trong thành',110,40,'city');nav('gate-north-outside','Cổng Bắc · ngoài thành',110,38,'north-mountain');nav('north-pass','Đèo núi phía bắc',111,3,'north-mountain');
nav('gate-east','Cổng Đông · trong thành',150,68,'city');nav('gate-east-outside','Cổng Đông · ngoài thành',154,68,'east-pasture');nav('east-bridge','Cầu qua sông lớn',174,69,'east-pasture');nav('east-pasture','Thảo nguyên bờ đông',204,77,'east-pasture');
nav('gate-south','Cổng Nam · trong thành',110,95,'city');nav('gate-south-outside','Cổng Nam · ngoài thành',110,97,'south-suburb');nav('south-outskirts','Ngã đường ngoại thành',111,112,'south-suburb');nav('sect-yard','Sân tông môn',111,134,'sect');
nav('gate-west','Cổng Tây · trong thành',65,68,'city');nav('gate-west-outside','Cổng Tây · ngoài thành',63,68,'forest-outer');nav('forest-outer','Rìa rừng yêu thú',55,69,'forest-outer');nav('forest-middle','Rừng yêu thú giữa',36,80,'forest-middle');nav('forest-deep','Rừng yêu thú sâu',8,94,'forest-deep');

// Reserve 109 safe, walkable anchors for future population generation. They are
// editor markers only and do not instantiate NPCs or restore legacy actors.
const roleNames=['resident','merchant','guard','sect-disciple','elder','farmer','herbalist','craftsman','innkeeper','cultivator','courier','healer'];
const candidateCells=[];for(let y=43;y<=92;y+=3)for(let x=68;x<=148;x+=3)candidateCells.push([x,y,'city']);for(let y=99;y<=124;y+=3)for(let x=70;x<=151;x+=3)candidateCells.push([x,y,'south-suburb']);for(let y=127;y<=140;y+=2)for(let x=94;x<=132;x+=2)candidateCells.push([x,y,'sect']);for(let y=28;y<=124;y+=5)for(let x=182;x<=220;x+=5)candidateCells.push([x,y,'east-pasture']);
const isBlocked=(x,y)=>collisionObjects.some(r=>x*T+16>=r.x&&x*T+16<r.x+r.width&&y*T+16>=r.y&&y*T+16<r.y+r.height),anchorKeys=new Set();let populationIndex=0;
for(const[x,y,regionId]of candidateCells){const key=`${x},${y}`;if(anchorKeys.has(key)||isBlocked(x,y))continue;anchorKeys.add(key);const role=roleNames[populationIndex%roleNames.length];point(population,`Future citizen ${String(populationIndex+1).padStart(3,'0')}`,x,y,{anchorId:`geo-npc-${String(populationIndex+1).padStart(3,'0')}`,role,regionId,active:false,generation:'new-world-future'});if(++populationIndex===109)break}
if(populationIndex!==109)throw new Error(`Only ${populationIndex}/109 collision-safe future population anchors were placed`);

tileLayer('GroundBase',ground);tileLayer('Water',water);tileLayer('Shore',shore);tileLayer('GroundDetails',details);tileLayer('TerrainTransitions',transitions);tileLayer('Roads',roads);tileLayer('Cliffs',cliffs);
objLayer('StaticDecor',decor);objLayer('Buildings',buildings);objLayer('MarketDecor',marketDecor);objLayer('ObjectFootprints',footprintObjects);objLayer('Collision',collisionObjects);objLayer('Occlusion',[]);objLayer('FlowEffects',flowEffects);objLayer('NavigationMarkers',navigation);objLayer('InteractionMarkers',interactions);objLayer('RegionMarkers',regions);objLayer('EncounterZones',encounters);objLayer('PopulationAnchors',population);

const terrain=JSON.parse(fs.readFileSync(path.join(root,'maps/gfx5b5/GFX5B5AreaTerrain.tsj'),'utf8'));
const waterSource=JSON.parse(fs.readFileSync(path.join(root,'maps/gfx5b5/QingyunWaterTrial.tmj'),'utf8')).tilesets.find(t=>t.name==='GFX5B5WaterTiles');
const external=(firstgid,name,w,h,count,image,imagewidth,imageheight,alignment='bottomleft',columns=count)=>({firstgid,name,tilewidth:w,tileheight:h,tilecount:count,columns,spacing:0,margin:0,image,imagewidth,imageheight,objectalignment:alignment,tilerendersize:'tile',fillmode:'stretch'});
const tilesets=[{...terrain,firstgid:1,image:'../public/assets/tilesets/gfx5b5_area_terrain.png'},external(257,'SettlementBuildings',192,192,40,'../public/assets/props/settlement_buildings.png',960,1536),external(297,'AncientTree',112,96,15,'../public/assets/props/ancient-tree-v2.png',1680,96),external(312,'T02Bamboo',96,96,8,'../public/assets/props/T02-bamboo-v2.png',768,96),external(320,'QingyunRocksV2',64,64,10,'../public/assets/tilesets/qingyun_rocks_v2.png',320,128),external(330,'H01Farmhouse',144,120,1,'../public/assets/props/H01-farmhouse-v2.png',144,120)];
for(const[firstgid,name]of[[400,'T03-mountain-pine'],[408,'T04-broadleaf'],[416,'T05-willow'],[424,'T06-monster-ancient']])tilesets.push(external(firstgid,name,96,112,8,`../public/assets/world-rebuild-1b2/${name}.png`,768,112));
for(const[firstgid,name]of[[432,'H02-city-home'],[433,'H03-market-shop'],[434,'H04-sect-dorm'],[435,'H05-wilderness-hut']])tilesets.push(external(firstgid,name,160,144,1,`../public/assets/world-rebuild-1b2/${name}.png`,160,144));
tilesets.push(external(436,'QingyunWallGateKit',64,64,8,'../public/assets/world-rebuild-1b2/Qingyun-wall-gate-kit.png',512,64,'center'));
const waterTileset=JSON.parse(JSON.stringify(waterSource));waterTileset.firstgid=444;waterTileset.image='../public/assets/tilesets/gfx5b5_water_tiles.png';tilesets.push(waterTileset);
tilesets.push(external(508,'QingyunAreaProps',128,128,8,'../public/assets/props/gfx5b5_area_props.png',512,256,'topleft',4));
const directionalGates=external(516,'QingyunDirectionalCityGates',192,192,4,'../public/assets/world-gates-4dir/directional-gates.png',768,192,'bottomleft',4);directionalGates.tiles=[['GATE-NORTH','north'],['GATE-SOUTH','south'],['GATE-EAST','east'],['GATE-WEST','west']].map(([name,direction],id)=>({id,type:name,properties:[{name:'direction',type:'string',value:direction},{name:'rotatedTexture',type:'bool',value:false}]}));tilesets.push(directionalGates);
tilesets.push(external(520,'WorldCityStructures',320,256,4,'../public/assets/world-city-1/city-structures.png',1280,256,'bottomleft',4));
tilesets.push(external(524,'WorldMarketStalls',128,112,7,'../public/assets/world-city-1/market-stalls.png',896,112,'bottomleft',7));
const map={compressionlevel:-1,height:H,width:W,infinite:false,nextlayerid:lid,nextobjectid:oid,orientation:'orthogonal',renderorder:'right-down',tiledversion:'1.12.2',tileheight:T,tilewidth:T,type:'map',version:'1.10',backgroundcolor:'#203a2e',class:'WORLD.CITY.1',properties:[{name:'worldStatus',type:'string',value:'world-geography-1'},{name:'layoutReference',type:'string',value:'thanh_van_ky_world_topdown_plan.png'},{name:'activeNPCs',type:'int',value:0},{name:'futurePopulation',type:'int',value:109},{name:'activeMonsterSpawns',type:'int',value:0},{name:'cityDistrictPlan',type:'string',value:'WORLD.CITY.1 · four radial roads, civic centre, lodging and seven market stalls'}],tilesets,layers};
fs.writeFileSync(out,JSON.stringify(map,null,1)+'\n');
console.log(`Wrote ${path.relative(root,out)} (${W}x${H}, ${decor.length} props, ${collisionObjects.length} collision objects, ${flowEffects.length} water effects, ${population.length} inactive anchors, 0 NPC/monster spawns)`);

import fs from 'node:fs';
const path=new URL('../../maps/world-rebuild-1b.tmj',import.meta.url);
const map=JSON.parse(fs.readFileSync(path,'utf8'));
const layers=name=>map.layers.find(l=>l.name===name);
const prop=(o,name)=>o.properties?.find(p=>p.name===name)?.value;
if(map.tilesets.some(t=>t.name==='DongHoangTerrain'))process.exit(0);
const tileGid=1850,propGid=1920;
const solid=layers('Collision').objects,points=layers('NavigationMarkers').objects,objects=layers('StaticDecor').objects;
const zones=layers('FaunaZones').objects,regions=layers('RegionMarkers').objects;
const add=(list,name,x,y,width,height,data={},extra={})=>{
 const o={id:map.nextobjectid++,name,x,y,width,height,rotation:0,visible:true,
  properties:Object.entries(data).map(([name,value])=>({name,value,type:typeof value==='number'?'int':typeof value==='boolean'?'bool':'string'})),...extra};
 list.push(o);return o;
};
const point=(list,name,x,y,data)=>add(list,name,x,y,0,0,data,{point:true});
const art=(name,x,y,i,block=false)=>{
 add(objects,name,x-48,y+15,96,96,{depthY:y,eastLandmark:i>=13&&i!==15,habitat:'Đông Hoang'},{gid:propGid+i,type:'prop'});
 if(block)add(solid,name+' · chân',x-19,y-9,38,13,{kind:'east-rock'});
};
map.tilesets.push({firstgid:tileGid,name:'DongHoangTerrain',tilewidth:32,tileheight:32,tilecount:64,columns:8,image:'../public/assets/east-wilds/terrain.png',imagewidth:256,imageheight:256,spacing:0,margin:0});
map.tilesets.push({firstgid:propGid,name:'DongHoangProps',tilewidth:96,tileheight:96,tilecount:32,columns:8,image:'../public/assets/east-wilds/props.png',imagewidth:768,imageheight:384,spacing:0,margin:0,objectalignment:'bottomleft'});
map.tilesets.push({firstgid:1952,name:'DongHoangShore',tilewidth:32,tileheight:32,tilecount:16,columns:4,image:'../public/assets/east-wilds/shore.png',imagewidth:128,imageheight:128,spacing:0,margin:0});
const biome=[
 ['east-rim','Hoàng Sa Ngoại Vực',10070,2240,510,910,0,'Luyện Khí'],
 ['east-canyon','Xích Nham Cốc',10600,1290,570,870,2,'Luyện Khí – Trúc Cơ'],
 ['east-oasis','Thanh Nguyệt Ốc Đảo',10455,3190,485,570,4,'An toàn tại trại'],
 ['east-bones','Bạch Cốt Hoang Nguyên',10875,3930,415,670,1,'Trúc Cơ'],
 ['east-dunes','Lưu Sa Hải',10195,4670,560,1050,6,'Trúc Cơ – Kim Đan'],
 ['east-ruins','Thái Cổ Sa Thành',10910,5620,395,880,5,'Kim Đan – Nguyên Anh'],
];
const at=(x,y)=>biome.reduce((best,b)=>score(b,x,y)<score(best,x,y)?b:best);
const score=(b,x,y)=>((x-b[2])/b[4])**2+((y-b[3])/b[5])**2 + .17*Math.sin(x/83+y/110+b[6]) + .11*Math.cos(x/57-y/125);
const h=(x,y)=>((x*15433^y*7817^x*y*2231)>>>0);
const lake=(x,y)=>((x-10444)/(218+19*Math.sin(y/65)))**2+((y-3078)/(151+16*Math.sin(x/53)))**2;
const oldTree=objects.find(o=>prop(o,'region')==='east-pasture'&&prop(o,'kind')==='tree'&&lake(o.x+o.width/2,o.y)<1.12);
if(oldTree){
 oldTree.x+=224;
 oldTree.y+=38;
}
const trail=[
 [[9760,2224],[10020,2330],[10176,2660],[10220,3030],[10220,3270],[10480,3340],[10740,3220]],
 [[10176,2660],[10312,2150],[10380,1810],[10500,1450],[10770,1160]],
 [[10740,3220],[10820,3520],[10840,3970],[10680,4380],[10810,4900],[10910,5400],[10940,5880]],
 [[10220,3270],[10125,3680],[10090,4230],[10200,4610],[10380,4890],[10670,5210],[10910,5400]],
 [[10380,4890],[10170,5340],[10260,5870],[10680,6230],[10940,5880]],
];
const dist=(x,y,a,b)=>{
 const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));
 return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);
};
const pathAt=(x,y)=>trail.some(r=>r.slice(1).some((b,i)=>dist(x,y,r[i],b)<46));
const g=layers('GroundBase').data,w=layers('Water').data,roads=layers('Roads').data;
for(let ty=16;ty<212;ty++)for(let tx=307;tx<map.width;tx++){
 const x=tx*32+16,y=ty*32+16,i=ty*map.width+tx,hash=h(tx,ty),b=at(x,y),r=lake(x,y);
 const border=9830+Math.round(35*Math.sin(y/117)+44*Math.sin(y/285));
 if(x<border||y<540+Math.sin(x/204)*106||y>6640+Math.sin(x/167)*160)continue;
 const wet=b[0]==='east-oasis'&&r<1;
 const look=b[0]==='east-oasis'?(r<3.0?4:r<4.7?3:0):b[6];
 g[i]=tileGid+look*8+hash%8;
 layers('GroundDetails').data[i]=0;
 if(wet){
  w[i]=452+hash%8;
  const shore=[[0,-32],[32,0],[0,32],[-32,0]].reduce((mask,[dx,dy],side)=>mask|(lake(x+dx,y+dy)>=1?1<<side:0),0);
  if(shore)layers('Shore').data[i]=1952+shore;
  add(solid,'Thanh Nguyệt · lòng hồ',x-16,y-16,32,32,{kind:'deep-water'});
 }
 if(x>9970)roads[i]=0;
 if(!wet&&pathAt(x,y))roads[i]=tileGid+56+hash%8;
}
const major=regions.find(o=>prop(o,'regionId')==='east-pasture');
Object.assign(major,{name:'Đông Hoang · Vạn Lý Hoàng Sa',x:9824,y:416,width:1440,height:6432});
for(const [id,name,x,y,rx,ry,,danger] of biome){
 add(regions,name,Math.max(x-rx,9824),y-ry,Math.min(x+rx,11264)-Math.max(x-rx,9824),ry*2,{regionId:id,danger});
 const location={ 'east-rim':[10036,2344],'east-canyon':[10582,1452],'east-oasis':[10440,3352],'east-bones':[10822,3880],'east-dunes':[10150,4550],'east-ruins':[10912,5818]}[id];
 point(points,name,...location,{markerId:id,regionId:id,walkable:true});
}
// Smaller safe footprint than the surrounding oasis, so hunt territories do not touch the camp.
add(regions,'Trại nghỉ Thanh Nguyệt',10214,3256,542,262,{regionId:'east-oasis-safe',danger:'An toàn'});
const spawn=(id,name,species,cap,x,y,width,height,realm,level,delay)=>add(zones,name,x,y,width,height,
 {eastWilds:true,zoneId:id,species,cap,realmIndex:realm,realmLevel:level,respawnMs:delay,normalOnly:true,spread:true,activityRadius:118,leash:207,safeBuffer:28,
   roster:JSON.stringify(Array.from({length:cap},(_,i)=>({species:species==='bone-king'&&i>0?'bone-skeleton':species,rank:'normal'})))});
spawn('east-rim','Cồn cát Độc Hạt','sand-scorpion',8,9865,1820,600,900,0,5,25000);
spawn('east-canyon','Khe Xích Diễm','flame-lizard',4,10300,760,850,720,1,1,46000);
spawn('east-stone','Vách đá phong hóa','sand-golem',4,10440,1520,760,545,1,3,50000);
spawn('east-bones','Bãi xương âm khí','bone-skeleton',5,10530,3525,700,440,1,3,38000);
spawn('east-wolf','Rìa Bạch Cốt','bone-wolf',4,10710,4000,515,540,1,5,47000);
spawn('east-dunes','Cát lún Lưu Sa','sand-worm',8,9868,4000,795,1470,2,1,56000);
spawn('east-ruins','Tường ngoài Sa Thành','bone-general',5,10470,5260,760,1040,2,4,64000);
spawn('east-king','Nội thành Vạn Cốt','bone-king',3,10740,5900,490,540,3,2,110000);

const names=['Xích Diễm Tiên Nhân Chưởng','Thiên Niên Hồ Dương','Liệt Dương Hoa','Kim Sa Linh Thụ',
 'Thanh Nguyệt Linh Liên','Hoàng Sa Linh Thảo','Thái Cổ Khô Mộc','Địa Hỏa Linh Chi','Thái Dương Linh Quả','Bụi gai','Cỏ khô','Thực vật mọng nước','Chà là',
 'Núi đá đỏ','Đá phong hóa','Xương cốt','Tường thành vỡ','Trụ sa thạch','Bia đá Sa Thành','Cửa đá chìm','Tượng đá vỡ'];
for(let ty=22;ty<207;ty+=3)for(let tx=309;tx<351;tx+=3){
 const seed=h(tx,ty),x=tx*32+32+seed%57,y=ty*32+seed%62;
 if(pathAt(x,y)||lake(x,y)<1.21||!g[(y/32|0)*map.width+(x/32|0)]||seed%3!==0)continue;
 const b=at(x,y)[0],types={ 'east-rim':[0,5,9,10,11,14], 'east-canyon':[13,13,14,6,7],
 'east-oasis':[1,3,4,11,12,12], 'east-bones':[6,9,15,15,14], 'east-dunes':[0,1,9,10,11,2],
 'east-ruins':[15,14,16,17,20]}[b];
 const t=types[seed%types.length];
 art(names[t],x,y,t,t===13||t===14);
}
for(const [x,y,i] of [[10220,3160,12],[10328,3260,3],[10660,3232,12],[10705,3088,1],[10200,2920,12],[10654,3010,12],
 [10192,3348,3],[10570,3370,12],[10372,3202,4],[10610,3125,4],[10840,6160,19],[10718,6094,16],[11036,6100,16],
 [10708,5890,17],[11048,5888,17],[10668,6030,15],[11034,6192,18],[10632,6180,20],[10838,5690,16],[11002,5700,17]]){
 art(names[i],x,y,i,[16,17,20].includes(i));
}
add(layers('OldRoadArt').objects,'Đình nghỉ Thanh Nguyệt',10288,3442,128,160,{depth:3425},{gid:800});
art('Giếng Thanh Nguyệt',10432,3434,21,true);
art('Rương cổ Sa Thành',11022,6182,22);
objects.at(-1).properties.push({name:'eastChest',type:'bool',value:true});
art('Trận pháp Vạn Cốt',10907,6125,23);
art('Lều lữ hành',10589,3448,24);
art('Lều lữ hành',10492,3472,24);
art('Phiến đá bến hồ',10522,3235,25);
art('Bãi hoa Thanh Nguyệt',10380,3214,26);
art('Bãi hoa Thanh Nguyệt',10550,3180,26);
art('Trại nghỉ Thanh Nguyệt',10386,3444,18);
objects.at(-1).properties.push({name:'venue',type:'string',value:'east-rest'});
point(points,'Trại nghỉ Thanh Nguyệt',10472,3380,{markerId:'east-camp',regionId:'east-oasis',walkable:true});

const seats=layers('SocietyStations').objects;
for(const [id,use,x,y,table] of [['east-staff','staff',10390,3448,''],['east-counter','counter',10428,3410,''],['east-wait-a','queue',10476,3407,''],['east-wait-b','queue',10513,3410,''],
 ['east-seat-a','seat',10456,3340,'east-table'],['east-seat-b','seat',10496,3340,'east-table'],['east-seat-c','seat',10536,3343,'east-table'],['east-seat-d','seat',10480,3482,'east-bench']]){
 point(seats,id,x,y,{id,use,table,venue:'east-rest'});
}
const sites=layers('WestTreasureSites').objects;
const herbs={
 'east-rim':['amber_dune_grass','scorch_flower'], 'east-canyon':['ember_reishi','solar_fruit','red_fire_crystal'],
 'east-oasis':['moon_lotus','poplar_heartwood'],'east-bones':['bone_jade','yin_soul_herb'],
 'east-dunes':['phantom_sand_crystal','solar_fruit'],'east-ruins':['bone_jade','yin_soul_herb'],
};
for(const [id,bname,cx,cy,rx,ry] of biome)for(let i=0;i<20;i++){
 const angle=i*2.39996,r=.36+.53*((i*29%17)/17),x=Math.round(Math.max(9850,Math.min(11208,cx+Math.cos(angle)*rx*r))),
  y=Math.round(cy+Math.sin(angle)*ry*r);
 if(lake(x,y)<=1.02||pathAt(x,y))continue;
 point(sites,bname+' · tài nguyên',x,y,{zoneId:id,preferred:herbs[id][i%herbs[id].length]});
}
const out=JSON.stringify(map,null,'  ').replace(/("data"\s*:\s*)(\[\s*[0-9,\s]+\])/g,(_,prefix,text)=>{
 const cells=JSON.parse(text),rows=[];
 for(let i=0;i<cells.length;i+=map.width)rows.push(cells.slice(i,i+map.width).join(','));
 return prefix+'[\n        '+rows.join(',\n        ')+'\n      ]';
});
fs.writeFileSync(path,out+'\n');

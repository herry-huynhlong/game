import fs from 'node:fs';
import { PNG } from 'pngjs';

const file='maps/world-rebuild-1b.tmj', map=JSON.parse(fs.readFileSync(file));
const cols=128, size=32, west=cols*size, firstgid=1700;
const previous=map.properties.find(p=>p.name==='westOffsetX')?.value??0;
const priorWidth=map.width, wide=priorWidth-previous/size+cols;
const atlas=new PNG({width:256,height:224});
const colors=[0x497250,0x315840,0x454056,0x2d554a,0x515348,0x8a7556,0x346e78,0x58565a,0x5f6560,0x786d53,0x535761,0x486268,0x536454,0x64736a];
const hash=(x,y)=>((Math.imul(x+773,0x45d9f3b)^Math.imul(y+983,0x119de1f3))>>>0)%1009;
for(let tile=0;tile<56;tile++)for(let y=0;y<32;y++)for(let x=0;x<32;x++){
  const palette=Math.floor(tile/4), variant=tile%4, base=colors[palette];
  const v=hash(x+y*73,tile*29+y), tuft=hash((x>>2)+variant*17,y>>2);
  let shade=(v%7)-3+(tuft%11)-5;
  if(palette===6||palette===11){if((y+variant*3)%9===0&&hash(Math.floor((x+variant*3)/5),y+variant)%11<6)shade+=22;else if(y%7===0)shade-=9;}
  else if(palette===7||palette===8){shade+=(y%9<2?16:y%9>6?-13:0)+(Math.floor((x+(Math.floor(y/9)%2)*5)/10)%2)*6;}
  else if(palette===9){shade+=(x%7===0?11:x%7===6?-15:0)+((y<3||y>28)?-12:0);}
  else if(palette<=4||palette===12){
    const gx=(x+variant*13)%13,gy=(y+variant*7)%11;
    if((gy===8&&gx>=5&&gx<=7||gy===7&&(gx===4||gx===8)||gy===6&&gx===6)&&tuft%4!==0)shade+=14;
    if(v%83<2)shade+=17;
  }else if(v%83<2)shade+=18;
  const at=((Math.floor(tile/8)*32+y)*atlas.width+tile%8*32+x)*4;
  for(const [i,shift] of [16,8,0].entries())atlas.data[at+i]=((base>>shift)&255)+shade;
  atlas.data[at+3]=255;
}
fs.mkdirSync('public/assets/west-wilds',{recursive:true});
fs.writeFileSync('public/assets/west-wilds/terrain.png',PNG.sync.write(atlas));

map.width=wide;
map.properties=map.properties.filter(p=>p.name!=='westOffsetX');
map.properties.push({name:'westOffsetX',type:'int',value:west});
map.tilesets=map.tilesets.filter(s=>![firstgid,1760,1770,1780,1795,1810].includes(s.firstgid));
map.tilesets.push({firstgid,name:'TayHoangTerrain',tilewidth:32,tileheight:32,columns:8,tilecount:56,image:'../public/assets/west-wilds/terrain.png',imagewidth:256,imageheight:224,margin:0,spacing:0,type:'tileset'});
map.tilesets.push({firstgid:1760,name:'TayHoangLandmarks',tilewidth:144,tileheight:120,columns:5,tilecount:5,image:'../public/assets/west-wilds/landmarks.png',imagewidth:720,imageheight:120,margin:0,spacing:0,type:'tileset',objectalignment:'bottomleft'});
map.tilesets.push({firstgid:1770,name:'VanLinhGrove',tilewidth:176,tileheight:176,columns:6,tilecount:6,image:'../public/assets/west-wilds/ancient-grove.png',imagewidth:1056,imageheight:176,margin:0,spacing:0,type:'tileset',objectalignment:'bottomleft'});
map.tilesets.push({firstgid:1780,name:'HabitatAccents',tilewidth:48,tileheight:48,columns:11,tilecount:11,image:'../public/assets/west-wilds/habitat-accents.png',imagewidth:528,imageheight:48,margin:0,spacing:0,type:'tileset',objectalignment:'bottomleft'});
map.tilesets.push({firstgid:1795,name:'AncientLivingGrove',tilewidth:176,tileheight:176,columns:9,tilecount:9,image:'../public/assets/west-wilds/living-grove.png',imagewidth:1584,imageheight:176,margin:0,spacing:0,type:'tileset',objectalignment:'bottomleft'});
map.tilesets.push({firstgid:1810,name:'LivingForestFloor',tilewidth:48,tileheight:48,columns:5,tilecount:5,image:'../public/assets/west-wilds/living-floor.png',imagewidth:240,imageheight:48,margin:0,spacing:0,type:'tileset',objectalignment:'bottomleft'});
for(const layer of map.layers){
  if(layer.name==='WestTrailLink')continue;
  if(layer.objects){layer.objects=layer.objects.filter(o=>!o.properties?.some(p=>p.name==='westWilds'));for(const o of layer.objects)o.x+=west-previous;}
  if(!layer.data)continue;
  const old=layer.data;layer.width=wide;layer.data=new Array(wide*map.height).fill(0);
  for(let y=0;y<map.height;y++)for(let x=cols;x<wide;x++)layer.data[y*wide+x]=old[y*priorWidth+x-cols+previous/size];
}
const layer=name=>{
  let target=map.layers.find(l=>l.name===name);
  if(!target){target={id:map.nextlayerid++,name,type:'objectgroup',draworder:'topdown',x:0,y:0,opacity:1,visible:true,objects:[]};map.layers.push(target);}
  return target;
};
let connector=map.layers.find(l=>l.name==='WestTrailLink');
if(!connector){
  connector={id:map.nextlayerid++,name:'WestTrailLink',type:'tilelayer',x:0,y:0,opacity:1,visible:true};
  map.layers.splice(map.layers.findIndex(l=>l.name==='Roads')+1,0,connector);
}
Object.assign(connector,{width:wide,height:map.height,data:new Array(wide*map.height).fill(0)});
let id=Math.max(...map.layers.flatMap(l=>l.objects?.map(o=>o.id)??[]))+1;
const prop=(name,value)=>({name,value,type:typeof value==='number'?'int':typeof value==='boolean'?'bool':'string'});
const object=(group,name,x,y,width,height,props={},extra={})=>layer(group).objects.push({id:id++,name,x,y,width,height,type:'',rotation:0,visible:true,properties:[prop('westWilds',true),...Object.entries(props).map(([k,v])=>prop(k,v))],...extra});
const trip=[
  ['west-forbidden','Tây Hoang Cấm Địa',0,24,'Cực hiểm','Nguyên Anh',3],
  ['west-ancient','Thái Cổ Thâm Lâm',24,50,'Cực cao','Kim Đan',2],
  ['west-poison','Hắc Vụ Độc Lâm',50,75,'Rất cao','Kim Đan',2],
  ['west-inner','Vạn Thú Nội Lâm',75,101,'Cao','Trúc Cơ',1],
  ['west-outer','Thanh Mộc Ngoại Lâm',101,128,'Thấp','Luyện Khí',0],
];
const groveNames=['Thiên Niên Cổ Đa','Kim Diệp Thần Mộc','Thiên Niên Đào Mộc','Lôi Kích Cổ Mộc','Xích Huyết Phong',
  'U Minh Cổ Liễu','Thái Cổ Khô Mộc','Thiên Niên Linh Cô','Vạn Niên Thần Thụ'];
const regionalGrove=[[0,2],[0,1,2,4],[4,5,6],[1,3,5,7],[3,6,7,8]];
const groveElements=['Mộc','Kim','Mộc','Lôi','Hỏa','Âm','Mộc','Mộc','Mộc'];
const floorDecor=['Cây đổ','Gốc mục','Bụi nấm','Hoa dại','Đá phủ rêu'];
const extraForestObjects=[];
const westernRoster=[
  ['wood-king','millennial:elite','millennial:elite','millennial','eagle:elite','eagle','vine'],
  ['millennial','millennial','millennial:elite','vine','vine','eagle','eagle:elite','wood'],
  ['centipede','centipede','centipede:elite','toad','toad','toad','flower','flower','flower','vine'],
  ['wolf','wolf','wolf','boar','boar','boar:elite','eagle','eagle','wood','wood'],
  ['wood','wood','wood','wolf','wolf','wolf','stag','stag','boar','boar'],
];
const territoryProfiles={
  wolf:['Thanh Lang Cốc',120,115,180,320],boar:['Xích Nham Sơn',95,99,145,322],toad:['Bích Độc Trạch',73,97,130,324],
  flower:['Phệ Linh Hoa Hải',70,109,143,326],centipede:['Bách Túc Độc Cốc',112,104,152,328],
  wood:['Thanh Mộc Lâm',82,85,126,323],millennial:['Thiên Niên Cổ Lâm',96,118,150,320],
  vine:['Huyết Đằng Cốc',75,95,125,329],eagle:['Xích Diễm Nham',106,115,168,325],
  stag:['Ngọc Linh Cốc',105,110,157,321],'wood-king':['Vạn Mộc Cấm Địa',0,150,166,327],
};
const roadY=x=>Math.round(86+7*Math.sin((x-128)/15)+4*Math.sin((x-128)/7)+8*Math.max(0,1-((x-128)/11)**2));
const put=(key,x,y,gid)=>{const l=layer(key);l.data[y*wide+x]=gid;};
const hard=(name,x,y,w,h,kind)=>object('Collision',name,x,y,w,h,{kind,blocks:true});
const ponds=[[16,54,7,15],[37,126,9,15],[63,110,9,18],[87,60,9,13],[113,55,4,13]];
const creek=(x,y)=>y>=62&&y<=115&&Math.abs(x-113-3*Math.sin((y-61)*.18))<1.5;
const isWater=(x,y)=>creek(x,y)||ponds.some(([cx,cy,rx,ry])=>((x-cx)/rx)**2+((y-cy)/ry)**2<.88+.13*Math.sin(y*.72));
const isRock=(x,y)=>x<52&&y>110&&Math.abs(y-155-7*Math.sin(x*.3))<4&&hash(x,y)%13!==0;
const centerColumn=([,,start,end])=>Math.floor((start+end)/2);
const road=(x,y)=>Math.abs(y-roadY(x))<=1+Number(hash(x>>1,y>>1)%5>1) ||
  trip.some(entry=>{const c=centerColumn(entry);return y>roadY(c)&&y<roadY(c)+11&&Math.abs(x-c-1-Math.sin(y*.4))<1.9;});
for(let y=0;y<map.height;y++){
  let start=-1, previousKind='';
  for(let x=0;x<=cols;x++){
    const walking=x<cols&&road(x,y), water=x<cols&&isWater(x,y), rock=x<cols&&isRock(x,y);
    const kind=walking?'':rock?'west-terrain':water?'west-water':'';
    if(kind!==previousKind){
      if(previousKind)hard('Bờ và vách Tây Hoang',start*size,y*size,(x-start)*size,32,previousKind);
      start=x;previousKind=kind;
    }
    if(x===cols)continue;
    const variant=hash(x,y)%4, boundary=x+Math.round(3*Math.sin(y*.1));
    const biome=boundary<24?4:boundary<50?3:boundary<75?2:boundary<101?1:0;
    const shore=!water&&[[0,1],[0,-1],[1,0],[-1,0]].some(([dx,dy])=>isWater(x+dx,y+dy));
    const palette=walking?(water?9:5):water?(biome===2?11:6):rock?7:shore?12:biome;
    put('GroundBase',x,y,firstgid+palette*4+variant);
    if(walking)put('Roads',x,y,firstgid+palette*4+variant);
    if(water&&!walking)put('Water',x,y,firstgid+palette*4+variant);
    const density=[15,25,27,33,39][biome]+Math.round(12*Math.sin(x*.23)*Math.sin(y*.21));
    if(!walking&&!water&&!rock&&x>2&&x<126&&y>2&&y<181&&hash(x,y)<density){
      const tree=hash(y,x)%4, gid=biome===4?400:biome===2?416:biome===3?424:tree===3?400:408;
      const px=x*32+tree*5,py=y*32+32, scale=[.86,1,1.08,1.22,1.3][biome];
      if(tree&&hash(x,y+4)%[7,6,5,4,3][biome]===0){
        const variants=regionalGrove[biome], choice=variants[hash(y,x+9)%variants.length];
        const span=176*[.9,.96,1,1.08,1.18][biome];
        const age=(choice===8?10000:1000)+biome*190+hash(x,y+31);
        object('StaticDecor',groveNames[choice],px-span/2,py+12,span,span,
          {kind:'tree',depthY:py,canopy:true,age,element:groveElements[choice]},{gid:1795+choice});
        if(choice===3&&hash(y,x+12)%4===0&&biome>=3)
          extraForestObjects.push(['WestTreasureSites','Rễ Lôi Kích Cổ Mộc',px+37,py+10,0,0,{zoneId:trip[4-biome][0],preferred:'thunder_fruit'},{point:true}]);
        hard('Rễ '+groveNames[choice],px-12,py-10,24,16,'west-root');
      }else if(tree){object('StaticDecor','Cổ mộc Tây Hoang',px-48*scale,py,96*scale,112*scale,{kind:'tree',depthY:py},{gid});hard('Rễ cổ mộc',px-7,py-15,14,14,'west-root');}
      else{object('StaticDecor','Thạch trận Tây Hoang',px-32,py,64,64,{kind:'rock',depthY:py},{gid:320+variant});hard('Đá Tây Hoang',px-10,py-16,20,16,'west-rock');}
    }else if(!walking&&!water&&!rock&&x>2&&x<126&&y>2&&y<181&&hash(x+91,y+19)<5+biome*3){
      const choice=hash(x-29,y+31)%floorDecor.length,px=x*32+16,py=y*32+26;
      extraForestObjects.push(['StaticDecor',floorDecor[choice],px-24,py,48,48,{kind:'forest-floor',depthY:py},{gid:1810+choice}]);
    }
  }
}
for(let x=cols;x<cols+9;x++)for(let y=93;y<=95;y++)put('WestTrailLink',x,y,firstgid+20+hash(x,y)%4);
for(const [index,[key,name,start,end,danger,realm,minRealm]] of trip.entries()){
  const center=Math.floor((start+end)/2), y=roadY(center);
  object('RegionMarkers',name,start*size,0,(end-start)*size,map.height*size,{regionId:key,danger,realm,minRealm});
  object('NavigationMarkers',name,center*size+16,y*size+16,0,0,{markerId:key,regionId:key,walkable:true},{point:true});
  const roster=westernRoster[index].map(entry=>{const [species,rank='normal']=entry.split(':');return {species,rank};});
  const zoneX=(start+1)*size,zoneY=8*size,zoneWidth=(end-start-2)*size,zoneHeight=(map.height-16)*size;
  object('FaunaZones',name,zoneX,zoneY,zoneWidth,zoneHeight,{zoneId:key,species:roster[0].species,roster:JSON.stringify(roster),cap:roster.length,respawnMs:[135000,95000,75000,60000,45000][index],normalOnly:true,activityRadius:160,leash:200,safeBuffer:50,realmIndex:minRealm,realmLevel:[3,6,2,3,4][index],nocturnal:index===2||index===3,spread:true});
  const speciesList=[...new Set(roster.map(s=>s.species))];
  for(const [i,species] of speciesList.entries()){
    const [title,activityRadius,notice,leash]=territoryProfiles[species];
    const column=Math.floor(i/2), row=i%2, columns=Math.ceil(speciesList.length/2);
    const columnSpecies=speciesList.slice(column*2,column*2+2);
    // Biological niches are carved into independent north and south ranges.
    const split=columnSpecies.includes('toad')?.49:.48+column*.09;
    const cut=Math.round(zoneHeight*split), hx=zoneX+Math.round(column*zoneWidth/columns);
    const hy=zoneY+(row?cut:0),w=Math.floor(zoneWidth/columns)-8;
    const h=(columnSpecies.length===1?zoneHeight:row?zoneHeight-cut:cut)-8;
    const common={zoneId:key,species,cap:roster.filter(s=>s.species===species).length,activityRadius,notice,leash,
      respawnMs:[135000,95000,75000,60000,45000][index],nocturnal:(species==='eagle'||species==='centipede'||species==='toad')&&(index===2||index===3)};
    const flowerTrail={x:Math.round(hx+w*.5),y:Math.min(hy+h-60,roadY(Math.floor((hx+w*.5)/32))*32-95)};
    const shoreOptions=ponds.flatMap(([px,py,rx])=>[
      {x:(px+rx+1)*32+16,y:py*32+16},{x:(px-rx-1)*32+16,y:py*32+16},
    ]);
    if(species==='stag')for(const cy of [70,91,106]){
      const cx=113+3*Math.sin((cy-61)*.18);
      shoreOptions.push({x:Math.round((cx-3)*32),y:cy*32+16},{x:Math.round((cx+3)*32),y:cy*32+16});
    }
    const shores=['toad','stag'].includes(species)?shoreOptions.filter(p=>p.x>hx+42&&p.x<hx+w-42&&p.y>hy+42&&p.y<hy+h-42):[];
    const resting=[...(species==='flower'?[flowerTrail]:shores),...[.52,.38,.64].flatMap(fx=>[.48,.61,.35].map(fy=>({x:Math.round(hx+w*fx),y:Math.round(hy+h*fy)})))]
      .find(p=>!isWater(Math.floor(p.x/32),Math.floor(p.y/32))&&!isRock(Math.floor(p.x/32),Math.floor(p.y/32)));
    if(resting){common.anchorDx=resting.x-hx-4;common.anchorDy=resting.y-hy-4;}
    object('FaunaTerritories',title,hx+4,hy+4,w,h,common);
    for(let j=0;j<(species==='flower'?42:15);j++){
      const px=hx+25+hash(i+j*21,index+14)%(w-50),py=hy+30+Math.round((h-60)*(j+.3+(hash(j,i)%22)/45)/(species==='flower'?42:15));
      if(isWater(Math.floor(px/32),Math.floor(py/32))||road(Math.floor(px/32),Math.floor(py/32)))continue;
      const gid=1780+Object.keys(territoryProfiles).indexOf(species);
      object('StaticDecor',title,px-24,py+12,48,48,{kind:'habitat-accent',depthY:py},{gid});
    }
  }
  // Spatially stratified, seedable resource candidate grid. The scene validates full footprints.
  for(let row=0;row<9;row++)for(let col=0;col<4;col++){
    const tx=start+2+Math.floor((col+.3+hash(row,col+index)%28/70)*(end-start-4)/4);
    const ty=9+Math.floor((row+.3+hash(col,row+index)%30/75)*(map.height-18)/9);
    if(isWater(tx,ty)||isRock(tx,ty)||road(tx,ty))continue;
    object('WestTreasureSites','Điểm linh dược',tx*size+16,ty*size+16,0,0,{zoneId:key},{point:true});
  }
  for(let i=0;i<3;i++){
    const x=center*size+16+(i-1)*110, cy=(roadY(Math.floor(x/size))+2)*size+16;
    object('WestResources',name,x,cy,0,0,{nodeId:key+'-'+i,zone:key,grade:4-index,nightOnly:i===2,regen:160+(4-index)*180},{point:true});
    if(i===2)object('WestLights',name,x,cy+14,0,0,{}, {point:true});
  }
  const ySite=(y+8)*size;
  const site=['Đàn tế Vô Danh','Di tích Thái Cổ','Đầm Tử Vụ','Động Vạn Thú','Đình Thanh Mộc'][index];
  object('StaticDecor',site,center*size-72,ySite,144,120,{kind:'west-landmark',depthY:ySite},{gid:1760+index});
  hard(site,center*size-43,ySite-34,86,27,'west-landmark');
}
for(const [x,y] of [[114,65],[114,69],[111,77],[111,96],[116,105],[14,45],[37,119]].filter(([x,y])=>isWater(x,y)&&!road(x,y))){
  object('FlowEffects','Dòng nước Tây Hoang',x*32+16,y*32+16,0,0,{kind:'west-creek',phase:hash(x,y)%8,period:190},{point:true});
}
for(const [x,y,w,h] of [[53,96,8,24],[65,92,7,21],[58,123,10,12]])object('WestPoison','Khí độc',(x)*32,y*32,w*32,h*32,{intensity:2});
for(const args of extraForestObjects)object(...args);
for(const [veinId,name,x,y,grade,capacity,region,owner,hidden,guard] of [
  ['sect-jade','Linh mạch Thanh Ngọc',6848,5664,1,12,'sect','qingyun-sect',false,''],
  ['outer-mist','Linh mạch Bạch Vụ',3760,3248,2,10,'west-outer','',false,''],
  ['ancient-sun','Linh mạch Liệt Dương',1488,1592,3,8,'west-ancient','',true,'eagle'],
  ['forbidden-heart','Linh mạch Vạn Mộc',305,1574,4,6,'west-forbidden','',true,'wood-king'],
])object('SpiritVeins',name,x,y,0,0,{veinId,grade,capacity,region,owner,hidden,guard},{point:true});
const veinPlan=[
  {grade:1,count:9,region:'sect',prefix:'Thanh Ngọc',owner:'qingyun-sect',centers:[[6848,5664],[9152,5520],[6752,5856],[8640,5984]]},
  {grade:2,count:5,region:'west-outer',prefix:'Bạch Vụ',centers:[[3760,3248],[3616,2210],[3888,2528],[3456,3088]]},
  {grade:3,count:3,region:'west-ancient',prefix:'Thái Cổ',centers:[[1488,1592],[1168,2610],[1270,3040]]},
];
const veinObjects=layer('SpiritVeins').objects;
const mineSolids=['Collision','SectCampusCollision','SocietyCollision'].flatMap(name=>layer(name).objects);
for(const {grade,count,region,prefix,owner='',centers} of veinPlan){
  for(let i=1;i<count;i++){
    const [cx,cy]=centers[(i-1)%centers.length];
    let point;
    for(let step=0;step<8&&!point;step++)for(let j=0;j<12&&!point;j++){
      const radius=72+step*24,theta=(i*5+j)*Math.PI/6;
      const x=Math.round((cx+Math.cos(theta)*radius)/16)*16,y=Math.round((cy+Math.sin(theta)*radius)/16)*16;
      if(x<34||y<34||x>=wide*32-34||y>=map.height*32-34)continue;
      const cell=Math.floor(y/32)*wide+Math.floor(x/32);
      if(layer('Water').data[cell]||layer('Roads').data[cell]||veinObjects.some(o=>Math.hypot(o.x-x,o.y-y)<76))continue;
      if(mineSolids.some(o=>x+21>o.x&&x-21<o.x+o.width&&y+16>o.y&&y-16<o.y+o.height))continue;
      point={x,y};
    }
    if(!point)throw Error('No walkable vein candidate for '+region+' #'+i);
    object('SpiritVeins','Linh mạch '+prefix+' '+String(i+1).padStart(2,'0'),point.x,point.y,0,0,
      {veinId:region+'-vein-'+i,grade,capacity:grade===1?10:grade===2?9:7,region,owner,hidden:grade>1,guard:''},{point:true});
  }
}
for(const l of map.layers.filter(l=>l.name.startsWith('Society')&&l.objects))for(const o of l.objects){
  o.name=o.name.replace('Mỏ Linh Khoáng','Mỏ Quặng Sắt');
  for(const p of o.properties??[])if(p.value==='Mỏ Linh Khoáng')p.value='Mỏ Quặng Sắt';
}
map.nextobjectid=id;
const token='__WEST_TILED_LAYER_DATA__';
const cellData=map.layers.filter(l=>l.data).map(l=>{const data=l.data;l.data=token;return data;});
fs.writeFileSync(file,JSON.stringify(map,null,2).replaceAll('"'+token+'"',()=>{
  const data=cellData.shift(), rows=[];
  for(let i=0;i<data.length;i+=wide)rows.push('        '+data.slice(i,i+wide).join(','));
  return '[\n'+rows.join(',\n')+'\n      ]';
})+'\n');

await import('./merge-sect-veins.mjs');
await import('./place-cave-entrances.mjs');

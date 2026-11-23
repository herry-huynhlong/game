import fs from 'node:fs';

const backup=new URL('../../maps/world-rebuild-1b-before-city-redesign.tmj',import.meta.url);
const output=new URL('../../maps/world-rebuild-1b.tmj',import.meta.url);
const map=JSON.parse(fs.readFileSync(backup,'utf8'));
const layers=Object.fromEntries(map.layers.map(layer=>[layer.name,layer]));
const bounds={left:65,top:40,right:150,bottom:94};
const tile=32;
const terrainGid=531, sceneryGid=640;
let nextId=map.nextobjectid;
const properties=values=>Object.entries(values).map(([name,value])=>({name,type:typeof value==='number'?'int':typeof value==='boolean'?'bool':'string',value}));
const get=(obj,key)=>obj.properties?.find(property=>property.name===key)?.value;

function tileset(firstgid,name,width,height,columns,rows,image){
  return {firstgid,name,tilewidth:width,tileheight:height,columns,tilecount:columns*rows,
    image,imagewidth:width*columns,imageheight:height*rows,margin:0,spacing:0,objectalignment:'bottomleft',type:'tileset',version:'1.10',tiledversion:'1.12.2'};
}
map.tilesets.push(
  tileset(terrainGid,'QingyunCourtyardGround',32,32,8,13,'../public/assets/city-redesign/courtyard-ground.png'),
  tileset(sceneryGid,'QingyunCourtyardObjects',192,176,8,4,'../public/assets/city-redesign/courtyard-objects.png'),
  tileset(676,'QingyunPalace',320,256,1,1,'../public/assets/city-redesign/city-palace.png'),
);
layers.Buildings.objects.find(o=>get(o,'buildingId')==='city-lord-residence').gid=676;
const cityEdges={id:map.nextlayerid++,name:'CityEdges',type:'tilelayer',x:0,y:0,width:map.width,height:map.height,opacity:1,visible:true,data:Array(map.width*map.height).fill(0)};
layers.CityEdges=cityEdges;
map.layers.splice(map.layers.indexOf(layers.Roads)+1,0,cityEdges);

function object(layer,name,type,x,y,width,height,meta,extra={}){
  const result={id:nextId++,name,type,x,y,width,height,rotation:0,visible:true,properties:properties(meta),...extra};
  layers[layer].objects.push(result);
  return result;
}
const rectangle=(x,y,w,h)=>({x,y,w,h});
const intersects=(a,b,margin=0)=>a.x+a.w+margin>b.x&&a.x-margin<b.x+b.w&&a.y+a.h+margin>b.y&&a.y-margin<b.y+b.h;
const oldSolid=layers.Collision.objects.map(o=>rectangle(o.x,o.y,o.width,o.height));
const blocked=[...oldSolid];
const protectedPoints=['NavigationMarkers','InteractionMarkers'].flatMap(name=>layers[name].objects.filter(o=>o.point));
const oldSceneryCount=layers.StaticDecor.objects.length;
const oldArt=['Buildings','MarketDecor','StaticDecor'].flatMap(name=>layers[name].objects.filter(o=>o.x>=bounds.left*tile&&o.x<(bounds.right+1)*tile&&o.y>bounds.top*tile&&o.y<(bounds.bottom+1)*tile));
const arch=oldArt.filter(o=>['building','merchant-stall'].includes(get(o,'kind'))||o.gid===432||o.gid>=520).map(o=>rectangle(o.x+5,o.y-o.height+9,o.width-10,o.height-10));
const homes=[];

function pin(id,name,x,y,kind,extra={}){
  const data={markerId:id,regionId:'city',walkable:true,kind,...extra};
  object('NavigationMarkers',name,'navigation',x,y,0,0,data,{point:true});
  object('InteractionMarkers',name,'interaction',x,y,0,0,{...data,active:false},{point:true});
  protectedPoints.push({x,y});
}
function solid(name,box){
  const meta={kind:'city-redesign-solid',district:true};
  const args=[name,'collision',box.x,box.y,box.w,box.h,meta];
  object('Collision',...args);
  object('ObjectFootprints',...args);
  blocked.push(box);
}
function draw(frame,name,x,y,meta={}){
  object('StaticDecor',name,'prop',x-96,y+24,192,176,
    {kind:'city-decoration',district:'city-redesign',depthY:y,...meta},{gid:sceneryGid+frame});
}
function clear(box,buffer=8){
  return !blocked.some(o=>intersects(o,box,buffer))&&!protectedPoints.some(o=>intersects(rectangle(o.x-11,o.y-7,22,14),box,buffer));
}
const lanes=[];
function markLane(x,y,w,h,mat,priority=1){lanes.push({x,y,w,h,mat,priority})}
function terrainFamily(kind,x,y){
  const variation=((x*193+y*313+(x^y)*29)>>>0)%8;
  return terrainGid+kind*8+variation;
}

// District paths are composed of 32 px cells. The two radial roads stay 128 px wide.
markLane(108,40,4,55,0,5);
markLane(65,66,86,5,0,5);
for(const y of [51,59,77,85,92])markLane(67,y,82,2,1);
for(const x of [70,80,90,99,115,124,134,144])markLane(x,43,2,49,1);
markLane(101,64,20,10,7,6); // civic square clear of gate axes
markLane(126,53,23,12,6,3);
markLane(117,45,14,12,7,3); // manor frontage
markLane(76,77,22,11,9,3);
markLane(123,75,25,13,2,3);
markLane(78,61,20,5,5,3);
markLane(121,87,23,4,11,3);
markLane(68,42,9,8,8,2);
markLane(136,44,11,6,8,2);

const cityBase=(x,y)=>{
  if(x>100&&x<108&&y>50&&y<62||x>112&&x<122&&y>77&&y<89)return 4;
  if(x<80&&y>73||x>138&&y>84)return 4;
  return x<108&&y<66?3:x>=112&&y<66?5:x<108?3:4;
};
function swapTile(layer,x,y,value){
  layers[layer].data[y*map.width+x]=value;
}
for(let y=bounds.top;y<=bounds.bottom;y++)for(let x=bounds.left;x<=bounds.right;x++){
  const way=lanes.filter(r=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h).sort((a,b)=>b.priority-a.priority)[0];
  const base=cityBase(x,y);
  swapTile('GroundBase',x,y,terrainFamily(base,x,y));
  for(const layer of ['Roads','GroundDetails','TerrainTransitions'])swapTile(layer,x,y,0);
  if(way){
    const outer=x===way.x||y===way.y||x===way.x+way.w-1||y===way.y+way.h-1;
    const edging=outer&&way.mat===7?10:outer&&way.mat===6?2:way.mat;
    swapTile('Roads',x,y,terrainFamily(edging,x,y));
  }
}

// Half-tile grass / packed-earth edges keep narrow streets from reading as a perfect grid.
const gridAt=(layer,x,y)=>layers[layer].data[y*map.width+x];
for(let y=bounds.top+1;y<bounds.bottom;y++)for(let x=bounds.left+1;x<bounds.right;x++){
  const mat=Math.floor((gridAt('Roads',x,y)-terrainGid)/8);
  if(mat!==1&&mat!==5&&mat!==11)continue;
  for(const [direction,[dx,dy]] of [[0,-1],[1,0],[0,1],[-1,0]].entries()){
    if(gridAt('Roads',x+dx,y+dy))continue;
    const next=Math.floor((gridAt('GroundBase',x+dx,y+dy)-terrainGid)/8);
    if(next!==3&&next!==4)continue;
    swapTile('CityEdges',x,y,terrainGid+96+direction+(next===4?4:0));
    break;
  }
}
// Preserve the four core buildings and all seven vendors. New lots are independent objects.
const lots=[
  ['Bắc Tây',2560,1488,0],['Bắc Tây',2760,1490,1],['Bắc Tây',3060,1520,2],['Bắc Tây',3280,1508,4],
  ['Bắc Tây',2240,1740,3],['Bắc Tây',2504,1744,2],['Bắc Tây',2740,1724,0],['Bắc Tây',3104,1740,5],['Bắc Tây',3280,1772,1],
  ['Bắc Tây',2224,1972,2],['Bắc Tây',2432,1990,1],['Bắc Tây',2656,1936,3],['Bắc Tây',3152,1960,4],
  ['Bắc Đông',3744,1488,2],['Bắc Đông',3992,1432,0],['Bắc Đông',4456,1504,4],['Bắc Đông',4672,1532,6],
  ['Bắc Đông',3744,1976,7],['Bắc Đông',3944,1964,1],['Bắc Đông',4690,1750,5],
  ['Nam Tây',2224,2432,0],['Nam Tây',2552,2420,2],['Nam Tây',2784,2460,0],['Nam Tây',3064,2430,4],['Nam Tây',3264,2472,6],
  ['Nam Tây',2224,2664,3],['Nam Tây',2448,2632,5],['Nam Tây',2952,2670,3],['Nam Tây',3216,2700,1],
  ['Nam Tây',2240,2880,1],['Nam Tây',2472,2920,0],['Nam Tây',2752,2976,2],['Nam Tây',2968,2904,0],['Nam Tây',3240,2950,4],
  ['Nam Đông',3760,2440,1],['Nam Đông',4120,2452,7],['Nam Đông',4344,2412,4],['Nam Đông',4592,2408,2],
  ['Nam Đông',3744,2664,2],['Nam Đông',4056,2660,0],['Nam Đông',4650,2620,3],
  ['Nam Đông',3784,2904,4],['Nam Đông',4040,2920,5],['Nam Đông',4304,2970,3],['Nam Đông',4624,2900,6],
];
const duties=new Map([
  ['3152,1960',['forge-entrance','Lò rèn Thanh Bách']],
  ['3744,1976',['apothecary-entrance','Dược đường Bách Thảo']],
  ['3264,2472',['lumber-yard','Kho mộc Nam Môn']],
  ['4120,2452',['provisions-entrance','Tiệm lương thực An Phong']],
]);
const widths=[152,172,146,170,172,155,166,176];
for(const [district,x,y,frame] of lots){
  const key=x+','+y, duty=duties.get(key);
  const w=widths[frame], base=rectangle(x-w/2+17,y-56,w-34,54);
  const image=rectangle(x-w/2+4,y-135,w-8,137);
  const name=duty?.[1]??'Nhà '+district+' '+String(homes.length+1).padStart(2,'0');
  const entrance={x:x-10,y:y+27};
  const entranceBox=rectangle(entrance.x-10,entrance.y-6,20,12);
  if(arch.some(o=>intersects(o,image,5))||!clear(base,4)||!clear(entranceBox,0)){
    if(duty)throw new Error('Blocked occupational lot '+name);
    continue;
  }
  arch.push(image);
  draw(frame,name,x,y,{kind:duty?'city-workshop':'city-house'});
  solid(name+' · thân nhà',base);
  const id=duty?.[0]??'residence-'+String(homes.length+1).padStart(2,'0');
  pin(id,name+' · thềm trước',entrance.x,entrance.y,duty?'Workstation':'Residence');
  if(!duty)homes.push({id,...entrance});
  for(let yy=Math.floor((y-35)/tile);yy<=Math.floor((y+45)/tile);yy++){
    for(let xx=Math.floor((x-w/2)/tile);xx<=Math.floor((x+w/2)/tile);xx++){
      if(layers.Roads.data[yy*map.width+xx]===0)swapTile('GroundBase',xx,yy,terrainFamily(2,xx,yy));
    }
  }
}

function site(frame,name,x,y,w=0,h=0,meta={}){
  const collider=rectangle(x-w/2,y-h*.75,w,h);
  if(w&&!clear(collider,5))return false;
  if(w)solid(name+' · chân vật thể',collider);
  draw(frame,name,x,y,meta);
  return true;
}
function tree(x,y,w=112,h=130,kind='broad'){
  const trunk=rectangle(x-10,y-15,20,15);
  if(!clear(trunk,12))return;
  object('StaticDecor','Cây sân '+x+'-'+y,'prop',x-w/2,y,w,h,{kind:'tree',region:'city',district:'city-redesign',depthY:y},{gid:kind==='willow'?416:408});
  solid('Cây sân · gốc '+x+'-'+y,trunk);
}
site(10,'Đài nước Linh Ngọc',3652,2106,122,58,{cityEffect:'water'});
site(8,'Giếng chung Bắc Tây',2860,1678,41,25,{cityEffect:'water'});
site(8,'Giếng chung Nam Tây',2880,2550,41,25,{cityEffect:'water'});
site(9,'Bồn thủy cảnh Phủ Thành',3860,1832,80,34,{cityEffect:'water'});
site(9,'Bồn thủy cảnh vườn trong',3928,2588,80,34,{cityEffect:'water'});
for(const [x,y,kind] of [[2370,1576,'broad'],[2975,1540,'broad'],[3208,1680,'broad'],[3415,1870,'willow'],
  [3328,2025,'broad'],[3704,2066,'willow'],[3770,2240,'broad'],[3386,2274,'broad'],[3752,1830,'broad'],[4186,1826,'willow'],
  [4595,1650,'broad'],[4664,2080,'willow'],[2392,2310,'broad'],[2670,2330,'willow'],[2820,2632,'broad'],[3128,2780,'willow'],
  [2190,2800,'broad'],[3064,2650,'broad'],[3740,2776,'broad'],[4110,2776,'broad'],[4518,2738,'willow'],
  [4016,2548,'broad'],[4464,2324,'broad'],[4630,2790,'broad'],[2860,2870,'broad'],[3330,2830,'willow']])tree(x,y,112,130,kind);
for(const [x,y] of [[3416,2134],[3692,2160],[3358,2212],[3712,2314],[2802,1668],[2908,2568],[3872,2620]])site(11,'Ghế gỗ '+x+'-'+y,x,y,52,12);
for(const [x,y] of [[3798,1814],[4074,1814],[3732,1748],[4186,1696],[3852,1900],[4102,1892],[3352,2100],[3788,2118]])site(14,'Bonsai '+x+'-'+y,x,y,25,12);
for(const [x,y] of [[4168,1776],[4308,1868],[4530,1792],[4074,1992],[4400,2005],[4638,2008],[4118,2074],[4586,1968]])site(19,'Đèn phố chợ '+x+'-'+y,x,y,12,10,{cityEffect:'lantern'});
for(const [x,y] of [[3403,1950],[3712,1950],[3364,2132],[3732,2186],[3360,2290],[3774,2290],[3482,1848],[3664,1848],[3438,2332],[3680,2332],[3836,1786],[4052,1786],[3024,2072],[3124,2012],[3216,2508]])site(21,'Đèn đá '+x+'-'+y,x,y,12,10,{cityEffect:'stone-lamp'});
for(const [x,y] of [[4028,1854],[4660,2038],[3320,2130],[3328,2460],[3138,1988],[4070,1778]])site(20,'Cờ phướn '+x+'-'+y,x,y,12,10,{cityEffect:'banner'});
for(const [x,y,frame] of [[4025,1920,15],[4312,1758,16],[4494,1770,17],[4518,1872,17],[4572,2028,18],
  [4352,2059,15],[4204,2058,18],[4692,2022,16],[4072,2048,15],[3978,2016,18],[4140,1820,22],
  [4564,1840,22],[3180,2512,23],[3208,2526,23],[3060,2016,24],[3164,1996,15],[4118,2484,17],
  [2208,1768,12],[2582,1516,13],[2990,1716,13],[3184,1788,12],[3308,1516,13],[2284,2640,13],
  [2372,2656,13],[2670,2390,13],[2742,2640,12],[3092,2716,13],[3804,2488,12],[4120,2542,13],[4420,2438,13],
  [4440,1560,12],[4540,1538,13],[4644,1568,13],[3848,2888,12],[4132,2962,13],[4296,2838,12],
  [2236,2924,25],[2496,2940,25],[2876,2936,25],[4596,2872,25]])site(frame,'Vật dụng phố '+x+'-'+y,x,y,frame===22?9:frame===25?106:frame===16?70:frame===15?57:frame===17||frame===18?50:32,12);
for(const [x,y] of [[2338,1576],[2692,1560],[2870,1800],[3195,1600],[3990,1848],[3838,1920],
  [3457,2034],[3720,2296],[2400,2565],[3140,2868],[4130,2872],[4498,2500]])site(31,'Mai hồng '+x+'-'+y,x,y,20,14,{cityEffect:'bloom'});
for(const [x,y] of [[2508,1582],[2806,1575],[3154,1568],[2224,1828],[2558,1855],
  [2615,2008],[2260,2475],[3010,2500],[4510,2576],[4657,2962]])site(25,'Hàng rào thấp '+x+'-'+y,x,y,106,10);
site(26,'Khói lò rèn',3112,1896,0,0,{cityEffect:'smoke'});
site(26,'Khói bếp tửu quán',2625,2644,0,0,{cityEffect:'smoke'});
site(26,'Khói tiệm lương',4128,2376,0,0,{cityEffect:'smoke'});

for(const stall of layers.MarketDecor.objects){
  const id=get(stall,'stallId'),x=stall.x+stall.width/2,y=stall.y-40;
  pin(id+'-vendor',stall.name+' · sau quầy',x,y,'Vendor',{stallId:id});
}
pin('plaza-rest-west','Quảng trường · ghế phía Tây',3408,2172,'Resting');
pin('palace-guard','Phủ thành chủ · sân hộ vệ',3912,1856,'Guard');
pin('city-training','Sân luyện võ Nam Thành',4048,2752,'Training');

// These 109 planning pins remain inactive. Only pins covered by a new footprint move.
const inactiveAnchors=layers.PopulationAnchors.objects;
const activeAnchorBoxes=inactiveAnchors.map(p=>rectangle(p.x-9,p.y-5,18,10));
for(const [index,p] of inactiveAnchors.entries()){
  const original=activeAnchorBoxes[index];
  if(p.x<bounds.left*tile||p.x>(bounds.right+1)*tile||p.y<bounds.top*tile||p.y>(bounds.bottom+1)*tile)continue;
  if(!blocked.some(r=>intersects(r,original)))continue;
  let candidate;
  for(let radius=8;radius<=144&&!candidate;radius+=8){
    for(let dy=-radius;dy<=radius&&!candidate;dy+=8)for(let dx=-radius;dx<=radius&&!candidate;dx+=8){
      if(Math.max(Math.abs(dx),Math.abs(dy))!==radius)continue;
      const box=rectangle(original.x+dx,original.y+dy,18,10);
      if(!blocked.some(r=>intersects(r,box,2))&&!activeAnchorBoxes.some((r,i)=>i!==index&&intersects(r,box,4)))candidate=box;
    }
  }
  if(!candidate)throw new Error('No clear planning pin near '+p.name);
  p.x=candidate.x+9;p.y=candidate.y+5;activeAnchorBoxes[index]=candidate;
}
map.properties.push({name:'cityLayoutVersion',type:'int',value:2});
map.properties.find(p=>p.name==='cityDistrictPlan').value='Residential courtyards; market; civic square; palace; workshop street';
map.nextobjectid=nextId;
const json=JSON.stringify(map,null,1);
const cityEdgeRows=Array.from({length:map.height},(_,y)=>'    '+cityEdges.data.slice(y*map.width,(y+1)*map.width).join(','));
const compactEdges=json.replace(JSON.stringify(cityEdges.data,null,1).replace(/\n/g,'\n   '),'[\n'+cityEdgeRows.join(',\n')+'\n   ]');
fs.writeFileSync(output,compactEdges+'\n');
console.log(`Redesigned city with ${homes.length} door anchors, ${layers.StaticDecor.objects.length-oldSceneryCount} new scenery records, and ${blocked.length-oldSolid.length} new collision rectangles.`);

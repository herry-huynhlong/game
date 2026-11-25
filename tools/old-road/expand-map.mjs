import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const file = new URL('../../maps/world-rebuild-1b.tmj', import.meta.url);
const map = JSON.parse(readFileSync(process.argv[2] ?? file, 'utf8'));
if (map.height !== 144 || map.width !== 224 || !map.layers.some(l => l.name === 'SectCampusArt')) {
  throw new Error('Use the 224×144 Tiled source with the completed sect campus.');
}
const seam = 122;
const rows = 40;
const offset = rows * map.tileheight;
const boundary = seam * map.tileheight;
const layer = name => map.layers.find(l => l.name === name);
const prop = (o,k) => o.properties?.find(p => p.name === k)?.value;
const properties = values => Object.entries(values).map(([name,value])=>({
  name,value,type:typeof value==='number'?'int':typeof value==='boolean'?'bool':'string',
}));
let nextObject = map.nextobjectid;
let nextLayer = map.nextlayerid;
const object = (name,x,y,width,height,values,extra={}) => ({
  id:nextObject++,name,x,y,width,height,rotation:0,visible:true,properties:properties(values),...extra,
});
const group = name => {
  const objects=[];
  map.layers.push({id:nextLayer++,name,objects,type:'objectgroup',draworder:'topdown',x:0,y:0,visible:true,opacity:1});
  return objects;
};
const main = [[3568,3440],[3568,3660],[3546,3768],[3477,3898],[3446,4070],[3508,4200],
  [3665,4352],[3712,4480],[3701,4600],[3608,4712],[3510,4828],[3482,4936],[3552,5072],[3552,5270]];
const paths = [
  {points:main,width:49,main:true},
  {points:[[3508,4200],[3352,4196],[3211,4113],[3070,4092],[2945,4170],[2800,4224]],width:21},
  {points:[[3712,4480],[3870,4452],[3960,4508],[4112,4584],[4264,4544],[4416,4576]],width:22},
  {points:[[3510,4828],[3339,4801],[3190,4861],[3080,4968],[2912,4952]],width:20},
];
const pond={x:4550,y:4218,rx:126,ry:67};
const pathArt = JSON.parse(execFileSync('python',[fileURLToPath(new URL('../../art/source/old-road/draw.py',import.meta.url))],{
  input:JSON.stringify({paths,pond,start:110,end:165,stone:[[3887,3960],[4390,4456],[4728,4804],[5136,5270]]}),encoding:'utf8',
}));
map.height += rows;
map.properties.push(...properties({worldLayoutVersion:2,oldRoadInsertionY:boundary,oldRoadOffsetY:offset}));
let random = 876091;
const next = () => (random=(Math.imul(random,1664525)+1013904223)>>>0)/4294967296;
const hash = (x,y) => ((Math.imul(x+1,794197) ^ Math.imul(y+1,2193503))>>>0);
for (const l of map.layers) {
  if (l.data) {
    const original=l.data;
    const band=[];
    for(let y=seam;y<seam+rows;y++)for(let x=0;x<map.width;x++){
      const h=hash(x,y);
      const source=original[(seam-1)*map.width+x];
      let value=0;
      if(l.name==='GroundBase'){
        if(x<65||x>150)value=(source?source-(source-1)%8:1)+h%8;
        else {
          const fromNorth=y-seam,fromSouth=seam+rows-1-y;
          const southern=original[seam*map.width+x];
          const edge=Math.sin(x*.17)*1.1+Math.sin(x*.52)*.6;
          const north=source>=9&&source<=16?6-fromNorth*.84+Math.sin(fromNorth*.3)*edge:0;
          const south=southern>=9&&southern<=16?6-fromSouth*.91+Math.sin(fromSouth*.35)*edge:0;
          const glade=Math.max(0,Math.sin(x*.23+y*.39)+Math.cos(x*.31-y*.27)-.58);
          const shade=Math.min(6,Math.round(Math.max(north,south,glade)));
          value=shade===0?1+h%8:shade===6?9+h%8:1600+(shade-1)*8+h%8;
        }
      }
      if(['Water','Shore'].includes(l.name)&&source)value=source;
      if(l.name==='GroundDetails'&&x>=67&&x<=151&&h%13===0)value=original[(seam-1)*map.width+(h%map.width)];
      band.push(value);
    }
    const index=seam*map.width;
    l.data=original.slice(0,index).concat(band,original.slice(index));
    l.height=map.height;
    continue;
  }
  for(const o of l.objects??[]){
    if(prop(o,'regionId')==='south-suburb'&&l.name==='RegionMarkers'){
      o.height=Math.min(o.height,boundary-o.y);
      continue;
    }
    const campus=l.name.startsWith('SectCampus');
    if(campus||o.y>=boundary){
      o.y+=offset;
      for(const p of o.properties??[])if(['depth','depthY'].includes(p.name)&&p.value>=(campus?100:boundary))p.value+=offset;
    }else if(o.y+o.height>boundary&&['RegionMarkers','EncounterZones'].includes(l.name))o.height+=offset;
  }
}

const solid = (name,x,y,w,h,kind='old-road-nature') => {
  const values={kind,blocks:true};
  layer('Collision').objects.push(object(name,x,y,w,h,values));
  layer('ObjectFootprints').objects.push(object(name+'-footprint',x,y,w,h,values));
};
for(let r=seam;r<seam+rows;r++){
  const cells=layer('Water').data.slice(r*map.width,(r+1)*map.width);
  const banks=cells.map((v,x)=>v?x:-1).filter(x=>x>=0);
  if(banks.length)solid('Sông sâu · đoạn hạ lưu',banks[0]*32,r*32,banks.length*32,32,'deep-water');
}
for(let y=pond.y-56;y<pond.y+56;y+=14){
  const dy=(y+7-pond.y)/pond.ry;
  const half=Math.floor(pond.rx*Math.sqrt(1-dy*dy)*.90);
  solid('Lòng hồ Ngoại Lâm',pond.x-half,y,half*2,14);
}
const tileset=(firstgid,name,basename,w,h,cols,count,totalRows)=>({
  firstgid,name,tilewidth:w,tileheight:h,columns:cols,tilecount:count,
  image:'../public/assets/old-road/'+basename+'.png',imagewidth:cols*w,imageheight:totalRows*h,
  margin:0,spacing:0,objectalignment:'bottomleft',type:'tileset',version:'1.10',tiledversion:'1.12.2',
});
map.tilesets.push(tileset(800,'QingyunOldRoadProps','props',128,160,6,6,1));
map.tilesets.push(tileset(820,'QingyunOldRoadTerrain','path',32,32,pathArt.columns,pathArt.tiles.length,pathArt.rows));
map.tilesets.push(tileset(1600,'QingyunOldRoadGround','ground',32,32,8,40,5));
const road=layer('Roads').data;
for(let y=113;y<123;y++)for(let x=105;x<=115;x++)road[y*map.width+x]=0;
const pathLayer={...layer('Roads'),id:nextLayer++,name:'OldRoadPaths',data:Array(map.width*map.height).fill(0)};
pathArt.tiles.forEach(([x,y],i)=>{pathLayer.data[y*map.width+x]=820+i;});
map.layers.splice(map.layers.indexOf(layer('Roads'))+1,0,pathLayer);

const scenery=layer('StaticDecor').objects;
const art=group('OldRoadArt');
const sign=group('OldRoadSigns');
const navigation=layer('NavigationMarkers').objects;
const marker=(id,name,x,y,region='outer-wood')=>navigation.push(object(name,x,y,0,0,{markerId:id,regionId:region,walkable:true},{point:true}));
const propArt=(frame,name,x,y,depth=y)=>art.push(object(name,x-64,y+16,128,160,{depth},{gid:800+frame}));
const label=(name,x,y)=>sign.push(object(name,x,y,0,0,{}, {point:true}));
propArt(0,'Đình Vọng Vân',3825,4340);
solid('Chân cột đình phía tây',3782,4300,15,34);
solid('Chân cột đình phía đông',3851,4300,15,34);
label('Đình Vọng Vân',3825,4344);
marker('old-road-pavilion','Đình Vọng Vân',3825,4363);
for(const [x,y,name] of [[3620,3830,'↑ Thanh Vân Thành'],[3565,4908,'Thanh Vân Tông ↓'],[3384,4218,'← Linh dược Ngoại Lâm']]){
  propArt(1,name,x,y);label(name,x,y-27);
}
for(const [id,x,y,w,h,name] of [
  ['outer-wood',2130,3904,2900,1280,'Thanh Vân Ngoại Lâm'],
  ['old-road',3440,3830,184,150,'Thanh Vân Cổ Đạo'],
  ['old-road',3384,3980,192,228,'Thanh Vân Cổ Đạo'],
  ['old-road',3450,4208,290,252,'Thanh Vân Cổ Đạo'],
  ['old-road',3480,4460,310,275,'Thanh Vân Cổ Đạo'],
  ['old-road',3390,4735,220,449,'Thanh Vân Cổ Đạo'],
  ['sect-gate',3420,5240,260,142,'Sơn Môn'],
]){
  layer('RegionMarkers').objects.push(object(name,x,y,w,h,{regionId:id,spawnCount:0}));
}
marker('old-road-north','Đầu Thanh Vân Cổ Đạo',3477,3898,'old-road');
marker('old-road','Thanh Vân Cổ Đạo',3701,4600,'old-road');
marker('old-road-south','Đoạn cổ đạo trước Sơn Môn',3552,5136,'old-road');
marker('outer-wood','Thanh Vân Ngoại Lâm',3070,4092);
marker('old-road-city-dispatch','Điểm giao hàng ngoại thành',3598,3618,'south-suburb');
const herbs=layer('ResourceNodes').objects;
const herbalSites=[[2920,4074],[2850,4170],[3038,4206],[2730,4262],[3085,4880],[2990,4916],[2860,4965],[3192,5005]];
for(const [i,[x,y]] of herbalSites.entries()){
  herbs.push(object('Linh thảo Thanh Vân Ngoại Lâm '+(i+1),x,y,0,0,
    {resourceNodeId:'old-road-herb-'+i,amount:4,danger:12},{point:true}));
}
const habitats=layer('FaunaZones').objects;
for(const [id,species,cap,x,y,w,h,name] of [
  ['old-road-boar','boar',3,2215,4410,650,405,'Trảng gỗ Ngoại Lâm'],
  ['old-road-wolf','wolf',2,3809,4720,685,372,'Bãi cỏ Thanh Ảnh'],
  ['old-road-toad','toad',3,4288,3995,600,488,'Bờ nước Ngoại Lâm'],
]){
  habitats.push(object(name,x,y,w,h,{zoneId:id,species,cap,respawnMs:41000,activityRadius:115,leash:155,safeBuffer:65,normalOnly:true}));
}

const trees=[];
const groundNoise=[];
const oreSites=layer('SectCampusStations').objects.filter(o=>prop(o,'station')?.startsWith('ore-'));
function awayFromPath(x,y,clearance){
  return paths.every(path=>path.points.slice(1).every(([bx,by],i)=>{
    const [ax,ay]=path.points[i],dx=bx-ax,dy=by-ay;
    const t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)));
    return Math.hypot(x-ax-dx*t,y-ay-dy*t)>path.width+clearance;
  }));
}
function decorate(x,y,gid,kind,w,h){
  const name='Ngoại Lâm · '+kind+' '+scenery.length;
  scenery.push(object(name,x-w/2,y,w,h,{kind:kind==='trúc'?'bamboo':kind==='đá'?'rock':'tree',region:'outer-wood'},{gid}));
  const half=kind==='đá'?12:kind==='trúc'?8:14;
  solid(name,x-half,y-9,2*half,16);
}
for(const [cx,cy,rx,ry,count] of [
  [2350,4100,210,120,10],[2780,3975,160,82,7],[3169,3995,140,92,9],
  [2580,4445,190,174,12],[3060,4490,198,210,14],[2670,4800,168,150,9],
  [3180,5130,210,72,10],[3940,4000,170,80,8],[4210,4210,200,175,12],
  [4700,4170,145,147,10],[4030,4760,226,142,10],[4520,4930,230,169,14],
]){
  let placed=0;
  for(let i=0;i<count*14&&placed<count;i++){
    const a=next()*Math.PI*2,r=Math.sqrt(next());
    const x=Math.round(cx+Math.cos(a)*rx*r),y=Math.round(cy+Math.sin(a)*ry*r);
    if(y<3950||y>5172||Math.hypot((x-pond.x)/173,(y-pond.y)/115)<1||!awayFromPath(x,y,34)||trees.some(([px,py])=>Math.hypot(x-px,y-py)<58)||
      herbalSites.some(([px,py])=>Math.hypot(x-px,y-py)<38)||Math.hypot(x-3825,y-4325)<95)continue;
    if(oreSites.some(site=>Math.hypot(x-site.x,y-site.y)<80))continue;
    trees.push([x,y]);placed++;
    const choice=[400,408,416,424,312,320][Math.floor(next()*6)],size=85+Math.round(next()*31);
    decorate(x,y,choice,choice===312?'trúc':choice===320?'đá':'cây',choice===320?58:size,choice===320?58:size+14);
  }
}
for(const [i,[x,y]] of [[2610,4308],[3252,4284],[3176,4710],[3920,4608],[4350,4680],[4175,5030]].entries()){
  if(awayFromPath(x,y,24))decorate(x,y,308+i%4,'cổ thụ',112,96);
}
for(let i=0;i<280;i++){
  const x=Math.round(2210+next()*2640),y=Math.round(3950+next()*1190);
  if(Math.hypot((x-pond.x)/140,(y-pond.y)/79)<1||!awayFromPath(x,y,4)||groundNoise.some(([a,b])=>Math.hypot(x-a,y-b)<54))continue;
  groundNoise.push([x,y]);propArt(3+(i%3),'Cỏ, hoa và nấm ven lối',x,y,8);
}
for(const [x,y] of [[2920,4406],[3155,4588],[4070,4600],[4486,4696],[2930,5100]]){
  propArt(2,'Thân cây đổ',x,y);solid('Thân cây đổ',x-29,y-15,56,12);
}
map.nextlayerid=nextLayer;
map.nextobjectid=nextObject;
const output=JSON.stringify(map,null,' ').replace(/("data": )\[([\s\d,]+)\]/g,(_,prefix,cells)=>{
  const values=JSON.parse('['+cells+']'),lines=[];
  for(let a=0;a<values.length;a+=map.width)lines.push(values.slice(a,a+map.width).join(','));
  return prefix+'[\n    '+lines.join(',\n    ')+'\n   ]';
});
writeFileSync(file,output+'\n');
console.log(`${map.width}×${map.height}, ${pathArt.tiles.length} road tiles, ${trees.length} trees and rocks, 8 herb sites, 8 fauna slots.`);

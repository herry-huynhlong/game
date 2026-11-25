import fs from 'node:fs';

const file=new URL('../../maps/world-rebuild-1b.tmj',import.meta.url);
const source=fs.readFileSync(file,'utf8');
const map=JSON.parse(source);
const offset=map.properties?.find(p=>p.name==='oldRoadOffsetY')?.value??0;
const rowOffset=offset/map.tileheight;
const generated=['SectCampusArt','SectCampusCollision','SectCampusStations'];
map.layers=map.layers.filter(l=>!generated.includes(l.name));
map.tilesets=map.tilesets.filter(t=>t.name!=='QingyunSectCampus');
const layer=name=>map.layers.find(l=>l.name===name);
let lid=Math.max(...map.layers.map(l=>l.id))+1;
let oid=Math.max(...map.layers.flatMap(l=>l.objects?.map(o=>o.id)??[]))+1;
const data=(name,x,y,width,height,props,extra={})=>({
  id:oid++,name,x,y,width,height,rotation:0,visible:true,
  properties:Object.entries(props).map(([key,value])=>({name:key,type:typeof value==='number'?'int':typeof value==='boolean'?'bool':'string',value})),
  ...extra,
});
const add=name=>{
  const objects=[];
  map.layers.push({id:lid++,name,type:'objectgroup',draworder:'topdown',x:0,y:0,visible:true,opacity:1,objects});
  return objects;
};
const art=add(generated[0]),solid=add(generated[1]),stations=add(generated[2]);
const tileset={firstgid:760,name:'QingyunSectCampus',tilewidth:320,tileheight:256,columns:5,tilecount:21,
  image:'../public/assets/sect-campus/campus.png',imagewidth:1600,imageheight:1280,margin:0,spacing:0,
  objectalignment:'bottomleft',type:'tileset',version:'1.10',tiledversion:'1.12.2'};
map.tilesets.push(tileset);
const tile=(name,x,y,frame)=>art.push(data(name,x-160,y+54+offset,320,256,{depth:[10,12,20].includes(frame)?9:y+2+offset},{gid:760+frame}));
const obstacle=(name,x,y,w,h)=>solid.push(data(name,x,y+offset,w,h,{kind:'sect-campus'}));
const station=(id,name,x,y)=>stations.push(data(name,x,y+offset,0,0,{station:id},{point:true}));
for(const name of ['StaticDecor','Collision','ObjectFootprints']){
  for(const o of layer(name).objects){
    const old=/^(Sơn môn Thanh Vân|Thiền đường tông môn|Ký túc xá (96|131)-)/.test(o.name);
    if(!old)continue;
    o.visible=false;
    if(!o.properties?.some(p=>p.name==='retiredSect'))(o.properties??=[]).push({name:'retiredSect',type:'bool',value:true});
  }
}
tile('Sơn Môn · Thanh Vân Tông',3552,4000,0);
obstacle('Trụ Sơn Môn Tây',3470,3985,34,28);
obstacle('Trụ Sơn Môn Đông',3600,3985,34,28);
station('gate','Sơn Môn',3552,4039);
for(const [i,[x,y]] of [[2640,3898],[2694,3825],[2790,3847]].entries()){
  tile('Vỉa quặng sắt',x,y,19);
  station('ore-'+i,'Vỉa quặng sắt',x,y+24);
  obstacle('Đá vỉa quặng',x-18,y-14,36,20);
}

for(const [id,name,x,y,frame,hw] of [
  ['leader','Tông Chủ Điện',3552,4490,1,115],
  ['elders','Trưởng Lão Viện',3072,4445,2,70],
  ['alchemy','Đan Dược Đường',2870,4128,3,67],
  ['quests','Nhiệm Vụ Điện',3210,4120,4,75],
  ['market','Vạn Bảo Các',3920,4120,5,80],
  ['dorm','Đệ Tử Cư Xá',4350,4410,6,51],
  ['library','Tàng Kinh Các',3210,4520,7,71],
  ['forge','Luyện Khí Đường',3930,4430,8,62],
  ['food','Linh Thực Đường',4350,4120,9,60],
]){
  tile(name,x,y,frame);
  art.at(-1).properties.push({name:'buildingId',type:'string',value:'sect-campus-'+id});
  obstacle(name,x-hw,y-39,hw*2,48);station(id,name,x,y+(id==='library'?24:37));
}
for(let i=0;i<4;i++){
  const x=4230+(i%2)*235,y=4270+Math.floor(i/2)*255;
  tile('Nhà đệ tử',x,y,6);obstacle('Nhà đệ tử',x-48,y-30,96,39);
}
tile('Đài Thái Cực Diễn Võ Trường',3837,4327,20);station('training','Diễn Võ Trường',3837,4338);
tile('Tụ Linh Trận',3381,4343,10);station('array','Tụ Linh Trận',3381,4343);
for(let i=0;i<8;i++){
  const x=3311+i%4*46,y=4262+Math.floor(i/4)*44;
  station('seat-'+i,'Bồ đoàn '+(i+1),x,y);
}
for(let i=0;i<6;i++){
  const x=3732+i%3*88,y=4246+Math.floor(i/3)*102;
  tile('Mộc nhân',x,y,13);obstacle('Chân mộc nhân',x-8,y-8,16,13);
  station('dummy-'+i,'Mộc nhân '+(i+1),x,y+26);
}
tile('Hồ sen',4108,4245,11);
obstacle('Lòng hồ sen',4034,4170,150,68);
tile('Linh Dược Viên · luống Bắc',2870,4320,12);
tile('Linh Dược Viên · luống Nam',2870,4440,12);
station('garden','Linh Dược Viên',2870,4336);
for(let i=0;i<6;i++)station('plot-'+i,'Luống linh dược '+(i+1),2808+i%3*60,4328+Math.floor(i/3)*118);
for(let i=0;i<6;i++){
  const x=3074+i%3*38,y=4202+Math.floor(i/3)*40;
  station('queue-'+i,'Hàng chờ Nhiệm Vụ Điện '+(i+1),x,y);
}
station('counter','Quầy Nhiệm Vụ Điện',3210,4184);
for(let i=0;i<10;i++){
  const x=3300+(i%5)*24,y=4480+Math.floor(i/5)*25;
  station('reading-'+i,'Bàn đọc '+(i+1),x,y);
}
for(let i=0;i<20;i++)station('home-'+i,'Chỗ nghỉ đệ tử '+(i+1),4262+i%5*43,4298+Math.floor(i/5)*23);
for(const [x,y] of [[3010,4044],[3110,4056],[3350,4051],[3743,4060],[4130,4048],
  [2838,4245],[3018,4264],[3158,4347],[3249,4398],[3483,4410],[3678,4395],[4039,4365],[4376,4237],[4461,4352],[2850,4496]])
  tile('Bụi hoa sân viện',x,y,15);
for(const [x,y] of [[3446,4022],[3658,4022],[3456,4132],[3650,4132],[3435,4447],[3669,4447],
  [3117,4165],[3304,4165],[3818,4158],[4015,4158]])tile('Đèn đá',x,y,16);
for(const [x,y] of [[4338,4179],[4376,4200],[3924,4188],[2881,4178],[3082,4503],[3297,4545]])
  tile('Bàn sân viện',x,y,17);
const ground=layer('GroundBase'),roads=layer('Roads');
const sourceGround=(x,y)=>ground.data[(y-1+rowOffset)*map.width+x];
for(let y=123;y<143;y++)for(let x=86;x<143;x++){
  const px=x*32+16,py=y*32+16,index=(y+rowOffset)*map.width+x;
  const mix=((x*10391+y*1879)^(x*y*217))>>>0;
  ground.data[index]=1+mix%8;
  const westPass=px<2830&&Math.abs(py-4130)<29;
  const spine=Math.abs(px-3552)<72 && py<4510;
  const plazas=[4112,4330,4480].some(row=>Math.abs(py-row)<30)&&px>2800&&px<4510;
  const wing=[2928,3180,3920,4315].some(col=>Math.abs(px-col)<24)&&py>4060&&py<4470;
  const apron=Math.abs(px-3552)<104&&py>=4000&&py<=4120;
  const localCourt=[[3210,4180,85,57],[3920,4171,100,54],[3837,4290,132,82],
    [3381,4295,100,78],[3552,4450,150,70],[4360,4318,138,85]].some(([cx,cy,w,h])=>
      ((px-cx)/w)**2+((py-cy)/h)**2<1);
  roads.data[index]=spine||plazas||wing||apron||localCourt||westPass?81+mix%8:0;
  if(y===123&&(x%4===0||x===86||x===142))ground.data[index]=sourceGround(x,y);
}
for(const n of layer('RegionMarkers').objects)if(n.name==='Thanh Vân Tông')Object.assign(n,{x:2736,y:3952+offset,width:1840,height:642});
map.nextlayerid=lid;map.nextobjectid=oid;
const rawArrays=[...source.matchAll(/("data"\s*:\s*)(\[\s*[0-9,\s]+\])/g)].map(m=>m[2]);
let index=0;
const output=JSON.stringify(map,null,' ').replace(/("data"\s*:\s*)(\[\s*[0-9,\s]+\])/g,(match,prefix,current)=>{
  const orig=rawArrays[index++];
  if(!orig)return match;
  if(orig.replace(/\s/g,'')===current.replace(/\s/g,''))return prefix+orig;
  const cells=JSON.parse(current);
  // Match either a row-oriented or a one-cell-per-line Tiled source.
  if(orig.split('\n').length>map.height+4)return prefix+current;
  const rows=[];
  for(let i=0;i<cells.length;i+=map.width)rows.push(cells.slice(i,i+map.width).join(','));
  return prefix+'[\n    '+rows.join(',\n    ')+'\n   ]';
});
fs.writeFileSync(file,output+'\n');
console.log(art.length+' sprites, '+solid.length+' footprints, '+stations.length+' usable markers');

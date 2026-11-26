import fs from 'node:fs';
import {fileURLToPath} from 'node:url';

const target = new URL('../../maps/world-rebuild-1b.tmj', import.meta.url);
const source = process.argv[2] ?? fileURLToPath(target);
const map = JSON.parse(fs.readFileSync(source, 'utf8'));
const prop = (o,k) => o.properties?.find(p=>p.name===k)?.value;
if (prop(map,'sectLayoutVersion')!==1) throw Error('Provide the version 1 campus map as input.');
const set = (o,k,value) => {
  const p=o.properties?.find(p=>p.name===k);
  if(p)p.value=value;
  else (o.properties??=[]).push({name:k,value,type:typeof value==='number'?'int':typeof value==='boolean'?'bool':'string'});
};
const layer = name => map.layers.find(l=>l.name===name);
const items = name => layer(name).objects;
const newLayer = name => {
  const objects=[];
  map.layers.push({id:map.nextlayerid++,name,type:'objectgroup',draworder:'topdown',x:0,y:0,visible:true,opacity:1,objects});
  return objects;
};
const add = (list,name,x,y,width,height,data={},other={}) => {
  const o={id:map.nextobjectid++,name,x,y,width,height,rotation:0,visible:true,...other};
  for(const [k,v] of Object.entries(data))set(o,k,v);
  list.push(o);
  return o;
};
const art=items('SectCampusArt'), stations=items('SectCampusStations'), solids=items('SectCampusCollision');
const decor=items('StaticDecor'), nav=items('NavigationMarkers'), regions=items('RegionMarkers');
const station = id => stations.find(o=>prop(o,'station')===id);
const zone = id => regions.find(o=>prop(o,'regionId')===id);
const mark = (id,label,x,y,data={}) => add(stations,label,x,y,0,0,{station:id,hiddenLabel:true,...data},{point:true});
const solid = (name,x,y,w,h) => add(solids,name,x,y,w,h,{kind:'sect-campus'});
const tile = (name,x,y,frame,base=false) => add(art,name,x-160,y+54,320,256,{depth:base?9:y+2},{gid:760+frame});
const shift = (o,dx,dy,save=false) => {
  if(save&&prop(o,'v1X')===undefined){set(o,'v1X',o.x);set(o,'v1Y',o.y);}
  o.x+=dx;o.y+=dy;
  for(const k of ['depth','depthY'])if(prop(o,k)>100)set(o,k,prop(o,k)+dy);
};
for(const o of art.filter(o=>prop(o,'buildingId'))){
  set(o,'v1ArtX',o.x);set(o,'v1ArtY',o.y);
}
const offset=3072, cut=6400, oldHeight=map.height;
map.height+=offset/32;
for(const l of map.layers.filter(l=>l.data)){
  const index=cut/32*map.width;
  const before=l.data.slice(0,index), after=l.data.slice(index);
  const backdrop=l.name==='GroundBase'||l.name==='Water'||l.name==='Shore' ? before.slice(-map.width) : Array(map.width).fill(0);
  const rows=Array.from({length:offset/32},()=>backdrop).flat();
  l.data=[...before,...rows,...after];l.height=map.height;
}
for(const o of art)if(o.y-54>=cut)shift(o,0,offset);
for(const o of solids)if((o.y>=cut&&o.name!=='Kho dược liệu')||o.name==='Trạm quản sự Linh Mạch')shift(o,0,offset);
for(const o of decor)if(o.y>=cut)shift(o,0,offset);
for(const o of items('FlowEffects'))if(o.y>=cut)shift(o,0,offset);
for(const o of items('SocietyArt'))if(o.y>=cut)shift(o,0,offset);
for(const o of items('SocietyCollision'))if(o.y>=6360)shift(o,0,offset);
for(const o of items('SocietyStations'))if(o.y>=cut)shift(o,0,offset,true);
for(const o of items('SpiritVeins'))if(prop(o,'veinId')==='sect-jade')shift(o,0,offset,true);
for(const o of stations)if(o.y>=cut&&prop(o,'station')!=='herb-store')shift(o,0,offset,true);
for(const o of nav)if(o.y>=cut)shift(o,0,offset,true);
for(const o of regions)if(o.y>=6384)shift(o,0,offset);
zone('sect').height+=offset;
Object.assign(zone('sect-central'),{x:6832,y:6390,width:1840,height:3066});

function moveBuilding(id,x,y){
  const picture=art.find(o=>prop(o,'buildingId')==='sect-campus-'+id);
  const p=station(id), dx=x-(picture.x+160),dy=y-(picture.y-54);
  shift(picture,dx,dy);
  const shape=solids.find(o=>o.name===picture.name);
  if(shape)shift(shape,dx,dy);
  shift(p,dx,dy,true);
  if(id==='quests')for(const o of stations.filter(o=>/^(queue-|counter$)/.test(prop(o,'station'))))shift(o,dx,dy,true);
}
const courtyards = newLayer('SectCourtyards');
const courts = [
  {id:'quests', x:7032,y:6464,width:400,depth:236,kind:'assembly'},
  {id:'law', x:8368,y:6464,width:380,depth:226,kind:'drill'},
  {id:'alchemy', x:7032,y:7232,width:400,depth:228,kind:'herbs'},
  {id:'elders', x:8368,y:7232,width:426,depth:250,kind:'garden'},
  {id:'vault', x:7032,y:8128,width:400,depth:231,kind:'walled'},
  {id:'council', x:7032,y:9008,width:400,depth:224,kind:'discussion'},
  {id:'leader', x:8368,y:8784,width:498,depth:300,kind:'plaza'},
];
const visual=JSON.parse(fs.readFileSync(new URL('../../public/assets/sect-campus/bounds.json',import.meta.url)));
for(const c of courts){
  const {id,x,y,width,depth,kind}=c;
  moveBuilding(id,x,y);
  const picture=art.find(o=>prop(o,'buildingId')==='sect-campus-'+id);
  const [l,t,r,b]=visual[picture.gid-760], top=picture.y-256+t, bottom=picture.y-256+b;
  const court=add(courtyards,picture.name,x-width/2,top,width,y+depth-top,{
    buildingId:prop(picture,'buildingId'),use:kind,roofX:picture.x+l,roofY:top,roofW:r-l,roofH:bottom-top,
    capacity:id==='quests'?12:id==='leader'?10:8,rect:true});
  mark(id+'-entrance','Lối vào '+picture.name,x+(x<7648?1:-1)*(width/2+8),y+128,{court:id});
  mark(id+'-exit','Lối ra '+picture.name,x+(x<7648?1:-1)*(width/2+8),y+190,{court:id});
  mark(id+'-rest','Điểm nghỉ '+picture.name,x-(x<7648?1:-1)*96,y+175,{court:id});
  mark(id+'-assembly','Sân '+picture.name,x,y+142,{court:id});
  set(station(id),'court',id);
}
const approach=nav.find(o=>prop(o,'markerId')==='sect-central-approach');
shift(approach,8368-approach.x,9070-approach.y,true);
// The drug store belongs to the relocated garden, not the ceremonial axis.
moveBuilding('herb-store',7800,6405+offset);
const picture=art.find(o=>prop(o,'buildingId')==='sect-campus-herb-store');
if(picture.y-54!==6405+offset)throw Error('Herb store placement');
const herbSolid=solids.find(o=>o.name===picture.name);
if(herbSolid.y<cut+offset)shift(herbSolid,0,offset);
const herbStation=station('herb-store');
if(herbStation.y<cut+offset)shift(herbStation,0,offset,true);
const position=(id,x,y)=>{
  const p=station(id);
  shift(p,x-p.x,y-p.y,true);
};

for(const [id,x,y] of [['counter',7032,6528],...Array.from({length:6},(_,i)=>['queue-'+i,6922+i%3*48,6572+Math.floor(i/3)*44])]){
  const p=station(id);
  shift(p,x-p.x,y-p.y,true);
}
for(let i=0;i<6;i++)mark('queue-'+(i+6),'Hàng chờ Nhiệm Vụ Điện',7090+i%3*40,6590+Math.floor(i/3)*49);
mark('expedition-meet','Điểm tập hợp tổ đội',7024,6668);
mark('quest-board','Bảng nhiệm vụ',6880,6568);
mark('vault-delivery','Khu giao nhận',7032,8256);
mark('vault-watch','Chốt hộ vệ Bảo Khố',7174,8280);
for(let i=0;i<4;i++)mark('law-patrol-'+i,'Điểm tuần Chấp Pháp Điện',8272+i%2*160,6592+Math.floor(i/2)*72);

const facilities = [
  {kind:'lesson',count:18,cols:6,x:7220,y:5812,dx:48,dy:38},
  {kind:'reading',count:18,cols:6,x:6920,y:5776,dx:52,dy:36},
  {kind:'training',count:16,cols:4,x:8108,y:5684,dx:143,dy:55},
];
for(const {kind,count,cols,x,y,dx,dy} of facilities)for(let i=0;i<count;i++){
  const id=kind+'-'+i, px=x+i%cols*dx,py=y+Math.floor(i/cols)*dy;
  const old=station(id);
  if(old)shift(old,px-old.x,py-old.y,true);
  else mark(id,kind==='lesson'?'Chỗ nghe giảng':kind==='reading'?'Chỗ đọc công pháp':'Vị trí luyện kiếm',px,py);
}
for(const [id,x,y] of [['lesson-west',7184,5862],['lesson-east',7524,5862],['reading-west',6872,5816],
  ['reading-east',7230,5816],['training-west',8064,5792],['training-east',8616,5792]])
  mark(id,'Lối tiếp cận sân',x,y);
for(const p of stations.filter(o=>/^inner-home-[0-3]$/.test(prop(o,'station'))))position(prop(p,'station'),p.x,p.y-106);
for(const p of stations.filter(o=>/^true-home-[234]$/.test(prop(o,'station'))))position(prop(p,'station'),p.x,p.y-112);
for(const [id,x,y] of [['library',7088,5772],['retreat-seat-7',8312,9840],['mine-guard',7384,9536],
  ['lotus-bank',7200,9876],['alchemy-rest',6960,7416],['elders-rest',8206,7412],
  ['elders-assembly',8304,7384],['vault-entrance',7256,8256],['vault-rest',6968,8290],
  ['reading-12',6890,5848]])position(id,x,y);

const ground=layer('GroundBase').data, roads=layer('Roads').data, water=layer('Water').data;
const details=layer('GroundDetails').data, shore=layer('Shore').data;
const spin=7648;
const hash=(x,y)=>((x*80509^y*51683^x*y*671)>>>0);
const branch=(c,x,y)=>Math.abs(y-(c.y+129+12*Math.sin((x-c.x)/91)))<41&&x>Math.min(spin,c.x)-24&&x<Math.max(spin,c.x)+24;
const stone=(c,x,y)=>Math.abs(x-c.x)<c.width/2-18&&y>=c.y+15&&y<c.y+c.depth-12;
for(let yy=198;yy<(cut+offset)/32;yy++)for(let xx=212;xx<272;xx++){
  const x=xx*32+16,y=yy*32+16,i=yy*map.width+xx,h=hash(xx,yy);
  const road=Math.abs(x-spin)<80;
  const join=courts.some(c=>branch(c,x,y));
  const yard=courts.find(c=>stone(c,x,y));
  const lake=((x-8454)/116)**2+((y-7400)/58)**2<1;
  const creek=x>7300&&x<8144&&Math.abs(y-(7712+35*Math.sin((x-7350)/124)))<27;
  const wet=lake||creek&&!road;
  const rise=Math.sin(x/190+y/215)+Math.cos(y/126-x/152)*.46;
  const grove=!road&&!join&&!yard&&!wet&&rise>.78;
  ground[i]=(grove?9:1)+h%8;
  water[i]=wet?452+h%8:0;
  roads[i]=wet?0:road||yard&&['plaza','walled','assembly'].includes(yard.kind)?81+h%8:join||yard&&Math.abs(x-yard.x)<60?73+h%8:0;
  details[i]=grove&&h%11===0?113+h%8:0;
  if(wet)solid(lake?'Lòng hồ Trưởng Lão':'Suối giữa các sân viện',x-16,y-16,32,32);
}
// Continue the two banks through the new southern strip.
for(let yy=oldHeight-34;yy<map.height;yy++){
  const row=yy*map.width;
  for(let xx=293;xx<=301;xx++){
    water[row+xx]=452+(xx+yy)%8;
    shore[row+xx]=xx===293?480:xx===301?482:0;
  }
}
add(items('Collision'),'Lòng sông phía đông · đoạn Nam',293*32,cut,9*32,(map.height*32)-cut,{kind:'deep-water'});
const fixture=(name,x,y,gid,depth=y)=>add(decor,name,x-64,y+6,128,72,{depthY:depth},{gid,type:'prop'});
map.tilesets.push({firstgid:1831,name:'SectCourtFixtures',tilewidth:128,tileheight:72,tilecount:3,columns:3,
  image:'../public/assets/sect-campus/court-fixtures.png',imagewidth:384,imageheight:72,margin:0,spacing:0,
  objectalignment:'bottomleft'});
for(const c of courts){
  const {x,y,width,kind}=c,side=width/2-43;
  for(const dx of [-side,side])tile('Đèn đá sân viện',x+dx,y+80,16);
  if(kind==='assembly'){
    fixture('Bảng nhiệm vụ',x-152,y+84,1832);
    solid('Chân bảng nhiệm vụ',x-178,y+76,52,10);
    fixture('Ghế nghỉ đội xuất hành',x+111,y+173,1833);
    fixture('Ghế nghỉ đội xuất hành',x-116,y+178,1833);
  }
  if(kind==='drill')for(const dx of [-98,-48,49,98])tile('Mộc nhân Chấp Pháp',x+dx,y+154,13);
  if(kind==='garden')add(items('OldRoadArt'),'Đình nghỉ Trưởng Lão',x-216,y+132,128,160,{depth:y+109},{gid:800});
  if(kind==='discussion')for(const dx of [-104,98])tile('Bàn nghị sự',x+dx,y+158,17);
  if(kind==='herbs'){
    tile('Giàn phơi dược liệu',x+108,y+115,12,true);
    tile('Vườn phụ Đan Dược Đường',x-106,y+178,12,true);
  }
  if(kind==='plaza'){
    fixture('Bậc đá Tông Chủ Điện',x,y+44,1831,9);
    tile('Sân nghị sự',x,y+172,20,true);
    tile('Bia sân nghị sự',x+144,y+186,19);
  }
}
const ramp = (name,x,y,gid,w,h,depth=y) => add(decor,name,x-w/2,y+6,w,h,{depthY:depth},{gid,type:'prop'});
for(const [x,y,frame] of [
  [8070,8930,308],[8648,8916,308],[8590,7460,416],[8210,7386,416],[7162,7310,312],[6904,7420,408],
  [6938,6836,308],[7114,6846,312],[7254,6896,312],[7490,6984,312],[7758,6860,408],[7920,6808,312],
  [8246,6880,312],[8520,6880,408],[8674,6996,312],[6904,7800,400],[7068,7730,312],[7166,7820,312],
  [7370,7784,416],[7498,7810,320],[7848,7804,416],[7972,7776,312],[8150,7816,312],[8314,7900,308],
  [8558,7990,400],[8670,7904,408],[6982,8630,308],[7132,8504,312],[7310,8620,312],[7500,8542,320],
  [7856,8648,312],[8000,8524,408],[8222,8546,312],[8504,8540,320],[8672,8650,308],
  [6870,9210,408],[7228,9244,312],[7920,9280,312],[8710,9224,312],
]){
  const tree=frame===320?'Đá phủ rêu':frame===312?'Trúc vùng đệm':frame===416?'Liễu ven nước':'Cổ mộc sân viện';
  const [w,h]=frame===320?[64,64]:frame===312?[96,96]:frame===308?[112,96]:[120,140];
  ramp(tree,x,y,frame,w,h);
  solid(tree+' · gốc',x-9,y-8,18,14);
}
ramp('Cầu đá vùng đệm',7648,7762,1830,160,112,8);
mark('civic-bridge','Cầu đá vùng đệm',7648,7720);
const wall = (x,y,gid,w,h) => ramp('Tường đá Bảo Khố',x,y,gid,w,h);
wall(6842,8258,438,32,120);
solid('Tường Bảo Khố',6834,8205,16,96);
for(const [y,h] of [[8205,30],[8280,31]]){
  wall(7222,y+20,438,32,48);
  solid('Tường Bảo Khố',7214,y,16,h);
}
for(const dx of [-124,125]){
  wall(7032+dx,8338,436,108,48);
  solid('Tường Bảo Khố',7032+dx-52,8318,104,14);
}
set(map,'sectLayoutVersion',2);
set(map,'sectV2ShiftFrom',cut);
set(map,'sectV2Offset',offset);
set(map,'sectV1HeightPx',oldHeight*32);
const output=JSON.stringify(map,null,'  ').replace(/("data"\s*:\s*)(\[\s*[0-9,\s]+\])/g,(_,prefix,text)=>{
  const cells=JSON.parse(text),rows=[];
  for(let i=0;i<cells.length;i+=map.width)rows.push(cells.slice(i,i+map.width).join(','));
  return prefix+'[\n        '+rows.join(',\n        ')+'\n      ]';
});
fs.writeFileSync(target,output+'\n');

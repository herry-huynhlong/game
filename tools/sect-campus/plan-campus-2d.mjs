import fs from 'node:fs';
import {fileURLToPath} from 'node:url';

const target=new URL('../../maps/world-rebuild-1b.tmj',import.meta.url);
const m=JSON.parse(fs.readFileSync(process.argv[2]??fileURLToPath(target),'utf8'));
const p=(o,k)=>o.properties?.find(v=>v.name===k)?.value;
if(p(m,'sectLayoutVersion')!==2)throw Error('Supply the version 2 Tiled map.');
const set=(o,name,value)=>{
  const row=o.properties?.find(r=>r.name===name);
  if(row)row.value=value;
  else (o.properties??=[]).push({name,value,type:typeof value==='number'?'int':typeof value==='boolean'?'bool':'string'});
};
const layer=n=>m.layers.find(l=>l.name===n), items=n=>layer(n).objects;
const art=items('SectCampusArt'), stations=items('SectCampusStations'), solids=items('SectCampusCollision');
const regions=items('RegionMarkers'), nav=items('NavigationMarkers'), decor=items('StaticDecor');
const id=o=>p(o,'station'), station=k=>stations.find(o=>id(o)===k);
const zone=k=>regions.find(o=>p(o,'regionId')==='sect'+(k?'-'+k:''));
const building=o=>p(o,'buildingId')?.slice('sect-campus-'.length);
const placement={
  quests:[7184,5732], law:[8180,6000], elders:[6544,6416], leader:[7392,6512],
  council:[7200,7376], vault:[8180,6912], alchemy:[5672,7080],
  dorm:[6136,5528], food:[6552,5656], market:[5624,5792],
  library:[8408,5552], teaching:[8872,5584], forge:[5824,6408],
  talismans:[5472,6624], materials:[6136,6712], 'inner-retreat':[8544,6536],
};
const deltas=new Map();
for(const o of art){
  const key=building(o), dest=placement[key];
  if(dest)deltas.set(key,[dest[0]-o.x-160,dest[1]-o.y+54]);
}
const named=new Map(art.filter(o=>deltas.has(building(o))).map(o=>[o.name,deltas.get(building(o))]));
const herb=[-2192,-1832], mine=[1240,-2024], rear=[-472,-1736], retreat=[-200,-1632];
const train=[240,208], inner=[1552,504], outer=[-1120,96], lodge=[-1992,156], formations=[-1112,640];
const courtAt=(x,y)=>items('SectCourtyards').find(o=>x>=o.x-64&&x<=o.x+o.width+64&&y>=o.y-40&&y<=o.y+o.height+80);
const artShift=(o,x,y)=>{
  if(deltas.has(building(o)))return deltas.get(building(o));
  if(y>=9690)return x<7740?rear:retreat;
  if(y>=9400)return /dược|luống/i.test(o.name)?herb:mine;
  const court=courtAt(x,y);
  if(court)return deltas.get(building(court));
  if(o.gid===780||o.gid===773)return train;
  if(o.gid===770)return o.name.includes('Trận Pháp')?formations:[432,624];
  if(o.name==='Động phủ Chân Truyền')return [248,864];
  if(o.name==='Hồ sen')return inner;
  if(o.name==='Nhà đệ tử')return y>=5900?inner:x>=8000?lodge:outer;
  if(y<5392)return null;
  return y<5660?outer:null;
};
const move=(o,delta,save=false)=>{
  if(!delta)return;
  if(save){set(o,'v2X',o.x);set(o,'v2Y',o.y);}
  o.x+=delta[0];o.y+=delta[1];
  for(const key of ['depth','depthY','roofY'])if(p(o,key)>100)set(o,key,p(o,key)+delta[1]);
  if(p(o,'roofX')!==undefined)set(o,'roofX',p(o,'roofX')+delta[0]);
};
const targets=new Map(art.map(o=>[o,artShift(o,o.x+160,o.y-54)]));
for(const o of solids){
  const x=o.x+o.width/2,y=o.y+o.height/2;
  let d=named.get(o.name);
  if(!d&&o.name==='Nhà đệ tử'){
    const house=art.filter(a=>a.name===o.name).sort((a,b)=>Math.hypot(a.x+160-x,a.y-54-y)-Math.hypot(b.x+160-x,b.y-54-y))[0];
    d=targets.get(house);
  }
  if(!d&&o.name==='Chân mộc nhân')d=train;
  if(!d&&o.name==='Lòng hồ sen')d=inner;
  if(!d&&o.name==='Động phủ Chân Truyền')d=[248,864];
  if(!d&&/Suối giữa|Lòng hồ Trưởng|gốc|Chân bảng|Tường Bảo Khố/.test(o.name)&&y>6250&&y<9400){
    if(o.name==='Tường Bảo Khố')d=deltas.get('vault');
    else if(o.name==='Chân bảng nhiệm vụ')d=deltas.get('quests');
    else{o.retired=true;continue;}
  }
  if(!d&&y>=9650)d=x<7740?rear:retreat;
  if(!d&&y>=9400)d=/dược/i.test(o.name)?herb:mine;
  move(o,d);
}
layer('SectCampusCollision').objects=solids.filter(o=>!o.retired);
for(const o of art){
  if(building(o)){set(o,'v2ArtX',o.x);set(o,'v2ArtY',o.y);}
  move(o,targets.get(o));
}
for(const o of items('SectCourtyards'))move(o,deltas.get(building(o)));
const seatRules=[
  [/^(queue-|counter$|quest-board$|expedition-meet$)/,deltas.get('quests')],
  [/^(law-patrol-)/,deltas.get('law')],[/^vault-(watch|delivery)$/,deltas.get('vault')],
  [/^reading-/,deltas.get('library')],[/^lesson-/,deltas.get('teaching')],
  [/^(training|dummy|sword-court)(-|$)/,train],[/^inner-(seat|home)-/,inner],
  [/^true-(seat|home)-/,[248,864]],[/^retreat-seat-/,retreat],
  [/^(social-)/,lodge],[/^seat-/,outer],[/^(plot-|garden$|herb-store$)/,herb],
  [/^(ore-|mine-)/,mine],[/^(rear-pavilion|bridge|lotus-bank)$/,rear],
  [/^(elder-cave|seal)$/,retreat],[/^formations$/,formations],[/^array$/,[432,624]],
];
for(const o of stations){
  const key=id(o);
  let d=deltas.get(key)??seatRules.find(([re])=>re.test(key))?.[1];
  if(!d&&/^home-\d+$/.test(key)){
    const i=Number(key.slice(5));d=i<5?deltas.get('dorm'):i>=15?lodge:outer;
  }
  if(!d){
    const c=courtAt(o.x,o.y);
    const match=/^(quests|law|elders|vault|leader|alchemy|council)-(entrance|exit|rest|assembly)$/.exec(key);
    if(match)d=deltas.get(match[1]);
    else if(c&&o.y>6600)d=deltas.get(building(c));
  }
  if(key==='civic-bridge')d=[-184,-8];
  move(o,d,true);
}
for(const o of items('SocietyStations'))if(o.y>9400)move(o,/^(paddy|fields)/.test(p(o,'id'))?herb:mine,true);
for(const o of items('SocietyArt'))if(o.y>9400)move(o,/Luống|Hồ tưới|nông cụ/.test(o.name)?herb:mine);
for(const o of items('SocietyCollision'))if(o.y>9400)move(o,/Hồ tưới|nông cụ/.test(o.name)?herb:mine);
for(const o of items('SpiritVeins'))if(p(o,'veinId')==='sect-jade')move(o,mine,true);
for(const o of items('FlowEffects'))if(o.y>9400)move(o,rear);
for(const o of items('OldRoadArt'))if(o.name==='Đình nghỉ Trưởng Lão')move(o,deltas.get('elders'));
for(const o of decor){
  if(o.name.includes('Cầu đá Hậu Sơn')){move(o,rear);continue;}
  if(o.name==='Cầu đá vùng đệm'){move(o,[-184,-8]);continue;}
  if(/^(Trúc vùng đệm|Cổ mộc sân viện|Đá phủ rêu|Liễu ven nước)$/.test(o.name)){o.retired=true;continue;}
  if(o.name==='Tường đá Bảo Khố'){move(o,deltas.get('vault'));continue;}
  if(o.gid>=1831&&o.gid<=1833){move(o,o.gid===1831?deltas.get('leader'):deltas.get('quests'));continue;}
  if(o.y>9400&&o.x>=6800&&o.x<8750){move(o,o.y>=9690?(o.x<7740?rear:retreat):(o.x<7730?mine:herb));continue;}
  if(o.y>=5400&&o.y<6160&&/^(Rừng trúc|Liễu ven hồ|Cổ thụ sơn môn) /.test(o.name))move(o,o.x<7650?outer:train);
}
layer('StaticDecor').objects=decor.filter(o=>!o.retired);
const plan={
  '':[5264,5232,3904,3312,null],
  gate:[7090,5232,1060,208,[7648,5360]],
  outer:[5430,5500,850,660,[6112,5740]],
  lodging:[6280,5472,600,620,[6528,5710]],
  teaching:[8224,5424,896,450,[8650,5664]],
  martial:[8120,5874,1000,470,[8600,6080]],
  inner:[8330,6344,760,490,[8500,6630]],
  true:[8330,6834,800,530,[8690,7010]],
  crafts:[5360,6160,1000,1260,[6048,6600]],
  central:[6384,5750,1946,1770,[7490,6600]],
  veins:[7900,7370,1020,460,[8390,7650]],
  herbs:[5360,7420,1000,490,[5968,7712]],
  back:[6250,7880,1290,520,[7060,8180]],
  retreat:[7540,7890,1360,495,[7990,8220]],
  forbidden:[6840,8385,1760,159,[7520,8440]],
};
for(const [key,[x,y,width,height,approach]] of Object.entries(plan)){
  Object.assign(zone(key),{x,y,width,height});
  if(approach){
    const o=nav.find(n=>p(n,'markerId')==='sect-'+key+'-approach');
    move(o,[approach[0]-o.x,approach[1]-o.y],true);
  }
}
set(zone(''),'northWestSetbackX',6176);
set(zone(''),'northWestSetbackY',5632);
const yard=nav.find(n=>p(n,'markerId')==='sect-yard');
move(yard,[-150,832],true);

const routes=[
  [[7648,5232],[7648,5590],[7500,5900],[7515,6355],[7515,6850],[7438,7150]],
  [[5700,5980],[6160,5920],[6540,5930],[6910,6050],[7420,6075],[7820,5952],[8260,5792],[8978,5770]],
  [[6150,5900],[6060,6180],[6230,6560],[6220,6900],[6330,7140],[6540,7470],[6940,7650],[7420,7650],[7850,7540],[8090,7290],[8250,6900],[8280,6470],[8250,5792]],
  [[5590,7630],[6010,7665],[6340,7560],[6540,7470],[6950,7410],[7438,7150],[7780,7240],[8090,7290],[8540,7455],[8910,7670]],
  [[6540,7470],[6700,7790],[6990,7980],[7090,8260],[7510,8425],[7940,8310],[8010,8080],[7850,7540]],
  [[6230,6560],[6550,6630],[6850,6750],[7210,6740],[7515,6850],[7760,6710],[8280,6470]],
  [[8250,5792],[8740,6000],[9000,6230],[8910,6560],[8900,6900],[8700,7250],[8540,7455]],
  [[7420,7650],[7464,7720],[7490,7840],[7540,8020],[7670,8320]],
];
const pathLayer={id:m.nextlayerid++,name:'SectPlanRoutes',type:'objectgroup',draworder:'topdown',x:0,y:0,visible:true,opacity:1,objects:[]};
m.layers.push(pathLayer);
routes.forEach((route,i)=>{
 const [x,y]=route[0];pathLayer.objects.push({id:m.nextobjectid++,name:i===0?'Trục Sơn Môn':i===1?'Trục Đông – Tây':i===3?'Đường vận chuyển':'Đường vòng',x,y,width:0,height:0,polyline:route.map(([u,v])=>({x:u-x,y:v-y})),visible:true,rotation:0});
});
const segment=(x,y,a,b)=>{
 const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));
 return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);
};
const main=routes.flatMap((r,j)=>r.slice(1).map((b,i)=>[r[i],b,j<2?54:j===2?42:30,j<3]));
const important=stations.filter(o=>placement[id(o)]||['garden','array','mine-storage','training','herb-store'].includes(id(o)));
for(const o of important){
 const all=routes.flat(), end=all.sort((a,b)=>Math.hypot(o.x-a[0],o.y-a[1])-Math.hypot(o.x-b[0],o.y-b[1]))[0];
 main.push([[o.x,o.y+10],end,32,false]);
}
const ground=layer('GroundBase').data,roads=layer('Roads').data,water=layer('Water').data,details=layer('GroundDetails').data;
const fronts=items('SectCourtyards');
const oldWater=[...water];
for(let yy=163;yy<m.height;yy++)for(let xx=164;xx<287;xx++){
 const x=xx*32+16,y=yy*32+16,i=yy*m.width+xx;
 const inNew=x>=5264&&x<9168&&y>=5312&&y<8544&&!(x<6144&&y<5632)&&!(x<7104&&y<5312);
 const inOld=x>=6784&&x<8704&&y>=5408;
 if(!inNew&&!inOld)continue;
 const h=(xx*3079^yy*6773^xx*yy*137)>>>0;
 const crest=Math.sin(x/174+y/225)+Math.sin(y/93-x/137)*.31;
 ground[i]=(crest>.9?9:1)+h%8;details[i]=crest>.88&&h%9===0?113+h%8:0;
 const ny=y-rear[1],nx=x-rear[0];
 const rearWater=ny>=9700&&ny<9870&&nx<7800&&(oldWater[Math.floor(ny/32)*m.width+Math.floor(nx/32)]??0)>0;
 const branchWater=x>7200&&x<7810&&Math.abs(x-7464)>74&&Math.abs(y-(7720+21*Math.sin((x-7464)/82)))<24;
 const pond=inNew&&(rearWater||branchWater);
 water[i]=pond?452+h%8:0;
 const c=fronts.find(c=>x>=c.x+32&&x<c.x+c.width-32&&y>=p(c,'roofY')+p(c,'roofH')&&y<c.y+c.height-20);
 const edge=main.find(([a,b,r])=>segment(x,y,a,b)<r);
 roads[i]=inNew&&!pond&&(c||edge)?(c&&['plaza','walled','assembly'].includes(p(c,'use'))||edge?.[3]?81:73)+h%8:0;
 if(pond)layer('SectCampusCollision').objects.push({id:m.nextobjectid++,name:'Lòng hồ Hậu Sơn',x:x-16,y:y-16,width:32,height:32,rotation:0,visible:true});
}
// Remove former pond cells, whose translated footprint is rebuilt from the painted water.
layer('SectCampusCollision').objects=layer('SectCampusCollision').objects.filter(o=>o.name!=='Lòng suối Hậu Sơn');
for(const [x,y,gid] of [[5510,6100,308],[5720,6190,312],[6040,6100,408],[6210,6740,312],[6480,6870,308],[6660,7070,312],[6960,6930,312],[7730,6570,308],[7800,6400,312],[7930,5740,408],[8490,5890,312],[9040,5920,312],[9080,6700,408],[8510,6850,312],[9030,7210,308],[8330,7320,312],[7790,7670,408],[7680,7920,312],[8290,8010,312],[8730,8020,408],[8720,8270,312],[7580,8240,308],[6900,8370,308],[6440,8230,312],[6370,8050,408],[5820,7980,312],[5570,7790,308],[6210,7460,416]]){
 const w=gid===308?112:gid===312?96:120,h=gid===308||gid===312?96:140;
 const o={id:m.nextobjectid++,name:'Cây vùng đệm sân viện',type:'prop',x:x-w/2,y:y+6,width:w,height:h,rotation:0,visible:true,gid};
 set(o,'depthY',y);layer('StaticDecor').objects.push(o);
}
set(m,'sectLayoutVersion',3);
const encoded=JSON.stringify(m,null,'  ').replace(/("data"\s*:\s*)(\[\s*[0-9,\s]+\])/g,(_,prefix,s)=>{
 const data=JSON.parse(s),rows=[];
 for(let i=0;i<data.length;i+=m.width)rows.push(data.slice(i,i+m.width).join(','));
 return prefix+'[\n        '+rows.join(',\n        ')+'\n      ]';
});
fs.writeFileSync(target,encoded+'\n');

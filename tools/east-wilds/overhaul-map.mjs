import fs from 'node:fs';

const file=new URL('../../maps/world-rebuild-1b.tmj',import.meta.url);
const map=JSON.parse(fs.readFileSync(file,'utf8'));
const layer=name=>map.layers.find(entry=>entry.name===name);
const prop=(object,name)=>object.properties?.find(p=>p.name===name)?.value;
if(map.tilesets.some(t=>t.name==='DongHoangLandforms'))process.exit(0);
const worldIndex=(x,y)=>Math.floor(y/32)*map.width+Math.floor(x/32);
const water=layer('Water').data, roads=layer('Roads').data, ground=layer('GroundBase').data;
const cells=[], pond=new Set();
for(let row=90;row<104;row++)for(let col=317;col<336;col++){
  const index=row*map.width+col;
  if(water[index]===0)continue;
  cells.push({col,row,index});
  pond.add(index);
}
const wet=(col,row)=>pond.has(row*map.width+col);
const waterDepth=(col,row)=>{
  for(let r=1;r<6;r++){
    if([[r,0],[-r,0],[0,r],[0,-r],[r,r],[r,-r],[-r,r],[-r,-r]]
      .some(([x,y])=>!wet(col+x,row+y)))return r;
  }
  return 6;
};
const add=(name,list,x,y,width,height,properties,extra={})=>{
  list.push({id:map.nextobjectid++,name,x,y,width,height,visible:true,rotation:0,
    properties:Object.entries(properties).map(([name,value])=>({
      name,type:typeof value==='number'?(Number.isInteger(value)?'int':'float'):typeof value==='boolean'?'bool':'string',value,
    })),...extra});
};
const decor=layer('StaticDecor').objects, flows=layer('FlowEffects').objects;
const streams=[];
for(const {row,col,index} of cells){
  const pattern=water[index]%8;
  const depth=waterDepth(col,row);
  water[index]=(depth===1?460:452)+pattern;
  if(depth<2||streams.some(s=>Math.hypot(col-s.col,row-s.row)<2.05))continue;
  streams.push({row,col});
  add('Gợn hồ Thanh Nguyệt',flows,col*32+16,row*32+16,0,0,{
    kind:'east-oasis-ripple',phase:(col+row*7)%8,period:168+(col+row)%5*16,scale:depth>=3?.98:.78,
  },{point:true});
}
if(streams.length<6)throw new Error('Hồ Thanh Nguyệt thiếu vị trí gợn nước hợp lệ');
for(const obj of ['DongHoangTerrain','DongHoangShore','DongHoangProps'].map(name=>map.tilesets.find(t=>t.name===name))){
  obj.image=obj.image.replace('east-wilds/','east-wilds/overhaul/');
}
map.tilesets.push({firstgid:2000,name:'DongHoangLandforms',tilewidth:160,tileheight:96,tilecount:8,columns:4,
  image:'../public/assets/east-wilds/overhaul/landforms.png',imagewidth:640,imageheight:192,spacing:0,margin:0,objectalignment:'bottomleft'});
map.tilesets.push({firstgid:2010,name:'DongHoangSeams',tilewidth:32,tileheight:32,tilecount:256,columns:16,
  image:'../public/assets/east-wilds/overhaul/seams.png',imagewidth:512,imageheight:512,spacing:0,margin:0});
map.tilesets.sort((a,b)=>a.firstgid-b.firstgid);
const material=gid=>gid>=1850&&gid<1914?Math.floor((gid-1850)/8):-1;
const originalGround=ground.slice(),originalRoads=roads.slice();
const seam=(own,other,side)=>2010+(own*8+other)*4+side;
for(let y=15;y<214;y++)for(let x=307;x<map.width;x++){
  const index=y*map.width+x,owner=material(originalGround[index]);
  if(owner<0||water[index])continue;
  const adjacent=[index-map.width,x+1<map.width?index+1:index,index+map.width,index-1];
  const order=[0,1,2,3].map(side=>(side+x+y)%4);
  const edge=order.find(side=>{
    const other=material(originalGround[adjacent[side]]);
    return !water[adjacent[side]]&&other!==owner;
  });
  if(edge!==undefined){
    const other=material(originalGround[adjacent[edge]]);
    ground[index]=seam(owner,other<0?4:other,edge);
  }
  if(material(originalRoads[index])===7){
    const edge=order.find(side=>material(originalRoads[adjacent[side]])!==7&&!water[adjacent[side]]);
    if(edge!==undefined)roads[index]=seam(7,owner,edge);
  }
}
const camp=layer('SocietyStations').objects.filter(o=>prop(o,'venue')==='east-rest');
const protectedPoint=(x,y)=>camp.some(p=>Math.hypot(x-p.x,y-p.y)<32);
const plants=[
  // Different ages and clusters on the dry promontories, with a clear arc between the well and camp.
  [10226,2990,30,1],[10279,2960,27,.68],[10212,3047,29,.75],[10184,2999,11,.62],
  [10666,3018,12,1.05],[10699,3029,27,.65],[10740,3003,29,.54],[10698,2981,11,.56],
  [10693,3180,28,1.21],[10740,3238,30,.68],[10780,3207,29,.7],[10678,3254,25,.65],
  [10299,3280,28,1.18],[10275,3331,29,.52],[10249,3336,11,.58],
  [10508,3276,29,.68],[10577,3293,5,.73],[10602,3362,11,.66],[10567,3501,12,.81],
  [10238,3439,30,.81],[10279,3461,31,.66],[10322,3491,10,.7],
  [10147,2500,31,.87],[10021,2597,27,.67],[10104,2745,11,.8],
  [10583,1638,13,1.2],[10614,1639,14,.72],[10680,1568,13,1.1],[10794,1678,13,1.05],
  [11009,3708,6,1.1],[11060,3868,31,.88],[10946,4058,15,.9],
  [10145,4453,0,1.08],[10272,4521,31,.78],[9899,4768,11,.76],[10367,5009,10,.72],
  [10976,6035,20,.96],[10799,6052,25,.85],[11125,6204,17,.76],
];
const names=['Xích Diễm Tiên Nhân Chưởng','Thiên Niên Hồ Dương','Liệt Dương Hoa','Kim Sa Linh Thụ',
  'Thanh Nguyệt Linh Liên','Hoàng Sa Linh Thảo','Thái Cổ Khô Mộc','Địa Hỏa Linh Chi','Thái Dương Linh Quả',
  'Bụi gai','Cỏ khô','Sen đá','Chà là','Núi đá đỏ','Đá phong hóa','Hài cốt','Tường đổ','Trụ đá','Bia ký','Cửa đá','Tượng đá vỡ',
  'Giếng','Rương cổ','Trận pháp','Lều','Bến đá','Cụm sen','Chà là non','Hồ dương già','Bụi cỏ hoa','Chà là nghiêng','Cây gai già'];
for(const [x,y,i,size] of plants){
  const index=worldIndex(x,y);
  if(water[index]||roads[index]||protectedPoint(x,y))continue;
  const edge=Math.round(96*size);
  add(names[i],decor,Math.round(x-edge/2),Math.round(y+edge*14/96),edge,edge,{depthY:y,eastOverhaul:true},{gid:1920+i,type:'prop'});
}
for(let j=0;j<84;j++){
  const x=9920+j*617%1320,y=735+j*1379%5470,index=worldIndex(x,y);
  if(roads[index]||water[index]||protectedPoint(x,y)||originalGround[index]<1850||originalGround[index]>=1914)continue;
  const group=material(originalGround[index]);
  if(group===5||group===7)continue;
  const frame=[0,1,2,7,6,7,4,7][group]+Number(group===0&&j%3===1)*3;
  const width=125+j%5*12,height=Math.round(width*.6);
  add('Địa mạo Đông Hoang',decor,Math.round(x-width/2),y+Math.round(height/2),width,height,{depthY:9,eastOverhaul:true},
    {gid:2000+frame,type:'prop'});
}
const formatted=JSON.stringify(map,null,'  ').replace(/("data"\s*:\s*)(\[\s*[0-9,\s]+\])/g,(_,prefix,text)=>{
  const cells=JSON.parse(text),rows=[];
  for(let i=0;i<cells.length;i+=map.width)rows.push(cells.slice(i,i+map.width).join(','));
  return prefix+'[\n        '+rows.join(',\n        ')+'\n      ]';
});
fs.writeFileSync(file,formatted+'\n');
console.log(`${streams.length} ripple placements in the existing lake footprint.`);

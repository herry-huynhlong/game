import fs from 'node:fs';
const file=new URL('../../maps/world-rebuild-1b.tmj',import.meta.url);
const map=JSON.parse(fs.readFileSync(file,'utf8'));
if(map.tilesets.some(set=>set.name==='ShanheTerrain'))process.exit(0);
const layer=name=>map.layers.find(l=>l.name===name);
const prop=(obj,key)=>obj.properties?.find(p=>p.name===key)?.value;
const add=(target,name,x,y,width,height,properties={},extra={})=>{
  const result={id:map.nextobjectid++,name,x,y,width,height,visible:true,rotation:0,
    properties:Object.entries({shanhe:true,...properties}).map(([name,value])=>({name,value,
      type:typeof value==='boolean'?'bool':typeof value==='number'?(Number.isInteger(value)?'int':'float'):'string'})),...extra};
  layer(target).objects.push(result);
  return result;
};
const gw=map.width,gh=map.height,base=layer('GroundBase').data,roads=layer('Roads').data;
const water=layer('Water').data,shore=layer('Shore').data,details=layer('GroundDetails').data,cliffs=layer('Cliffs').data;
const solid=layer('Collision').objects, first=2300;
const into=(x,y)=>Math.floor(y/32)*gw+Math.floor(x/32);
const tick=(x,y)=>{let h=Math.imul(x^92342,374761393)^Math.imul(y^31191,668265263);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;};
const smooth=t=>t*t*(3-2*t);
function noise(x,y,step){
  const a=Math.floor(x/step),b=Math.floor(y/step),dx=smooth(x/step-a),dy=smooth(y/step-b);
  const lerp=(a,b,t)=>a+(b-a)*t;
  return lerp(lerp(tick(a,b),tick(a+1,b),dx),lerp(tick(a,b+1),tick(a+1,b+1),dx),dy);
}
function dist(x,y,a,b){
  const dx=b[0]-a[0],dy=b[1]-a[1],u=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));
  return Math.hypot(x-a[0]-dx*u,y-a[1]-dy*u);
}
const nearest=(x,y,steps)=>steps.slice(1).reduce((d,b,i)=>Math.min(d,dist(x,y,steps[i],b)),Infinity);
const ellipse=(x,y,p)=>((x-p[0])/p[2])**2+((y-p[1])/p[3])**2;
const zone=(id,name,x,y,width,height,groups,danger)=>({id,name,x,y,width,height,groups,danger});
const regions=[
 zone('sw-valley','Vạn Thú Cốc',3264,6992,1280,900,[6,5,3],'Luyện Khí – Trúc Cơ'),
 zone('sw-umbral','U Minh Cổ Lâm',1264,7432,1370,1140,[7,1,8],'Kim Đan'),
 zone('sw-ridge','Thái Cổ Yêu Sơn',2400,9110,1850,840,[8,6,21],'Kim Đan – Nguyên Anh'),
 zone('south-steppe','Nam Hoang Thảo Nguyên',5700,9030,780,720,[9,6,11],'Luyện Khí'),
 zone('south-flowers','Bách Hoa Cốc',6420,9460,870,480,[10,9,11],'Luyện Khí'),
 zone('south-lake','Thanh Thủy Hồ',7864,9340,790,650,[10,6,11],'Trúc Cơ'),
 zone('south-ridge','Thiên Sơn Sơn Mạch',8768,9040,680,825,[8,11,21],'Trúc Cơ'),
 zone('se-black-sand','Hắc Sa Hải',9870,7830,490,1060,[14,23,12],'Trúc Cơ'),
 zone('se-red-ridge','Xích Nham Sơn Mạch',11006,7360,520,880,[13,12,23],'Kim Đan'),
 zone('se-quicksand','Lưu Sa Cốc',10570,8550,550,650,[15,12,14],'Kim Đan'),
 zone('se-bones','Bạch Cốt Nam Nguyên',10902,9310,590,690,[16,17,15],'Kim Đan'),
 zone('se-antiquities','Thái Cổ Di Tích',9984,9534,500,660,[17,14,16],'Kim Đan'),
];
const trails=[
 [[4080,5568],[3920,6096],[3620,6420],[3264,6992],[2950,7230],[2520,7400],[1780,7550],[1264,7432],[860,7040]],
 [[1264,7432],[1580,8070],[1960,8430],[2400,9110],[2910,8780],[3480,8660],[4070,8790],[4630,9070],[5700,9030]],
 [[3264,6992],[3850,7540],[4400,8100],[4630,9070]],
 [[5136,4900],[5120,5600],[5055,6800],[5100,7800],[5430,8555],[5700,9030],[6170,9210],[6420,9460],
  [7010,9550],[7550,9470],[7864,9340],[8270,9130],[8768,9040],[9180,8750]],
 [[9220,5200],[9258,6570],[9180,7600],[9180,8750]],
 [[10912,5818],[10570,6430],[10230,6860],[9870,7830],[10040,8192],[10570,8550],[10902,9310],[10470,9620],[9984,9534]],
 [[10230,6860],[10646,7070],[11006,7360],[10768,7840],[10570,8550],[10225,8815],[9984,9534]],
];
const streams=[
 [[3128,6208],[2900,6430],[2840,6720],[3060,6940],[2940,7190],[2620,7590],[2250,7710],[1920,7630],[1650,7450]],
 [[8504,8790],[8400,8990],[8220,9030],[8100,9120],[7840,9310],[7500,9290],[7180,9160],[6910,9240],[6740,9400]],
 [[10051,7270],[10160,7530],[10304,7780]]
];
const lakes=[[2734,7300,220,164],[1360,7702,324,220],[7770,9228,360,227],[3460,9060,239,131],[10424,7858,178,109]];
const ridges=[
 {line:[[1255,8745],[1672,8576],[1960,8730],[2190,8850],[2560,8660],[2930,8390]],w:148},
 {line:[[2720,9380],[3100,9210],[3630,9210],[4150,9470]],w:144},
 {line:[[790,6290],[1420,6170],[1824,6440],[2060,6880]],w:105},
 {line:[[8264,8800],[8500,8640],[8765,8650],[9000,8750]],w:98},
 {line:[[10600,7366],[10800,7237],[11010,7110],[11152,7170]],w:99,red:true},
 {line:[[10750,8030],[10970,8150],[11110,8630],[11130,8840]],w:74,red:true},
 {line:[[11010,9878],[10752,9795],[10420,9837]],w:78,red:true},
];
map.tilesets.push({firstgid:first,name:'ShanheTerrain',image:'../public/assets/shanhe/terrain.png',
  tilewidth:32,tileheight:32,tilecount:192,columns:8,imagewidth:256,imageheight:768,spacing:0,margin:0});
const originalSolids=solid.slice();
const existing=layer('StaticDecor').objects.slice();
const protectedRects=[
  ...originalSolids.map(o=>[o.x-24,o.y-24,o.x+o.width+24,o.y+o.height+24]),
  ...['NavigationMarkers','PopulationAnchors','SpiritVeins','WestTreasureSites','ResourceNodes','InteractionMarkers']
    .flatMap(name=>(layer(name)?.objects??[]).map(o=>[o.x-96,o.y-96,o.x+96,o.y+96])),
];
const protect=new Uint8Array(gw*gh);
for(const [left,top,right,bottom] of protectedRects){
  for(let y=Math.max(0,Math.floor(top/32));y<Math.min(gh,Math.ceil(bottom/32));y++)
    for(let x=Math.max(0,Math.floor(left/32));x<Math.min(gw,Math.ceil(right/32));x++)protect[y*gw+x]=1;
}
const newGround=(x,y)=>y>=5870&&x<5230+Math.sin((y-6000)/540)*130||
  x>=5230&&x<9312&&y>=8580+70*Math.sin((x-5000)/600)||
  x>=9216&&x<9370&&y>5450||x>=9664&&y>6430+Math.sin(x/270)*240;
const regionAt=(x,y)=>regions.reduce((best,r)=>{
  const score=t=>ellipse(x,y,[t.x,t.y,t.width,t.height])+.35*(noise(x+t.x,y+t.y,460)-.5);
  return score(r)<score(best)?r:best;
});
const painted=new Uint8Array(gw*gh), aquifer=new Uint8Array(gw*gh), ridged=new Uint8Array(gw*gh), roadMask=new Uint8Array(gw*gh);
const tile=(group,x,y)=>first+group*8+Math.floor(tick(x,y)*8);
const oldWest=[0,1,7,2,4,5];
const protectedDistricts=layer('RegionMarkers').objects.filter(o=>['city','sect'].includes(prop(o,'regionId')));
const insideDistrict=(x,y)=>protectedDistricts.some(o=>x>=o.x&&x<o.x+o.width&&y>=o.y&&y<o.y+o.height);
for(let iy=0;iy<gh;iy++)for(let ix=0;ix<gw;ix++){
  const x=ix*32+16,y=iy*32+16,i=iy*gw+ix,n=noise(x,y,430),m=noise(x,y,1140);
  if(insideDistrict(x,y))continue;
  const woodlandEdge=5820+226*Math.sin(y/420)+155*(m-.5);
  if(y<5870+200*(n-.5)&&x<Math.min(6080,woodlandEdge)){
    if(x>4070&&(roads[i]||water[i]||protect[i]))continue;
    const wave=x+350*Math.sin(y/820+x/1600)+590*(m-.5)+410*(n-.5);
    const band=Math.max(0,Math.min(4,Math.floor((wave+230)/850)));
    const low=oldWest[band],high=oldWest[band+1],mix=((wave+230)%850+850)%850/850;
    const choices=n>.7?5:n<.26?6:mix<.60?low:high;
    base[i]=tile(choices,ix,iy);painted[i]=1;
    if(details[i]&&tick(ix+7,iy)>.57)details[i]=0;
    if(roads[i]&&roads[i]>=1&&roads[i]<444&&!water[i])roads[i]=tile(18,ix,iy);
  }
  if(!newGround(x,y))continue;
  const r=regionAt(x,y),contrast=noise(x+450,y-600,226),choices=r.groups;
  let group=choices[n<.22?2:n>.63?1:0];
  const path=Math.min(...trails.map(route=>nearest(x,y,route)))<39+contrast*24;
  if(x>9650&&y<6850&&base[i]>=1850&&base[i]<2266){
    if(n<.76)continue;
  }
  if(water[i]||roads[i])continue;
  base[i]=tile(group,ix,iy); details[i]=0;painted[i]=2;
  if(path){roads[i]=tile(18,ix,iy);roadMask[i]=1;}
  if(protect[i])continue;
  const h=Math.min(...lakes.map(p=>ellipse(x,y,p)+(contrast-.5)*.29));
  const creek=Math.min(...streams.map(route=>nearest(x,y,route)+(contrast-.5)*15));
  if(h<1||creek<22+contrast*10){
    aquifer[i]=1;
    water[i]=(h>.56&&creek>54?460:452)+Math.floor(tick(ix,iy)*8);
    if(path)roads[i]=73+Math.floor(tick(ix,iy)*8);
    continue;
  }
  if(path)continue;
  const rock=ridges.find(r=>nearest(x,y,r.line)<r.w+48*(n-.5)+34*(contrast-.5));
  if(rock){ridged[i]=rock.red?2:1;base[i]=tile(rock.red?13:17,ix,iy);}
}
for(let y=1;y<gh-1;y++)for(let x=1;x<gw-1;x++){
  const i=y*gw+x,wx=x*32+16,wy=y*32+16;
  if(aquifer[i]){
    const mask=[i-gw,i+1,i+gw,i-1].reduce((m,n,j)=>m|(!aquifer[n]?1<<j:0),0);
    if(mask)shore[i]=1952+mask;
    if(!roadMask[i])add('Collision','Mặt nước Vạn Lý',wx-16,wy-16,32,32,{kind:'shanhe-water'});
    if(!mask&&!roadMask[i]&&tick(x+4,y)>.60&&x%2===0&&y%2===0){
      add('FlowEffects','Gợn nước Vạn Lý',wx,wy,0,0,{kind:'shanhe-ripple',phase:(x+y)%8,period:175+x%5*14,scale:.84},{point:true});
    }
  }
  if(ridged[i]){
    if(!ridged[i+gw])cliffs[i]=tile(ridged[i]===2?20:19,x,y);
    add('Collision','Sườn đá Vạn Lý',wx-16,wy-16,32,32,{kind:'shanhe-cliff'});
  }
}
for(const [wx,wy] of [[3118,6230],[8502,8795],[10078,7336]]){
  const choice=[];
  for(let dy=-64;dy<=64;dy+=32)for(let dx=-64;dx<=64;dx+=32){
    const x=wx+dx,y=wy+dy,i=into(x,y);
    if(aquifer[i]&&!roadMask[i])choice.push({x,y,d:Math.hypot(dx,dy)});
  }
  const best=choice.sort((a,b)=>a.d-b.d)[0];
  if(best)add('FlowEffects','Thác khe Vạn Lý',best.x,best.y,0,0,{kind:'shanhe-waterfall',phase:3,period:109,scale:.84},{point:true});
}
const decor=(name,x,y,gid,size,kind='plant')=>{
  const proper=gid>=1795&&gid<1804||gid>=1770&&gid<1776?176:gid>=1920&&gid<1952?96:gid>=1780&&gid<1791?48:gid>=320&&gid<330?64:112;
  const edge=Math.round(proper*size);
  add('StaticDecor',name,Math.round(x-edge/2),Math.round(y+edge*.08),edge,edge,{kind,depthY:y},{gid,type:'prop'});
};
const suitable=(x,y,gap=0)=>{
  const i=into(x,y);
  return i>=0&&i<painted.length&&painted[i]&&!water[i]&&!ridged[i]&&!roads[i]&&(!gap||!protect[i]);
};
for(let y=15;y<gh-3;y+=3)for(let x=2;x<gw-2;x+=3){
  const wx=x*32+16+Math.round((tick(x,y)-.5)*62),wy=y*32+16+Math.round((tick(y,x)-.5)*67),i=into(wx,wy);
  if(!suitable(wx,wy,1))continue;
  const cover=noise(wx,wy,720)*.68+noise(wx+850,wy-600,234)*.32;
  const random=tick(x+129,y+498);
  if(random<.46||cover<.39)continue;
  if(painted[i]===1){
    if(random<.95||existing.some(o=>Math.abs(o.x+o.width/2-wx)<83&&Math.abs(o.y-wy)<90))continue;
    if(wx<1650&&cover>.60)decor('Cổ thụ Thâm Lâm',wx,wy,1795+(x+y)%9,.83+random*.36,'tree');
    else decor('Tầng cây bụi Tây Hoang',wx,wy,1780+(x+y)%6,.72+random*.36);
    continue;
  }
  if(wx>9660){
    const set=[1920,1926,1929,1930,1933,1934,1935,1951];
    const n=set[(x+2*y)%set.length];decor(n===1933?'Mỏm đá Xích Nham':'Cảnh quan sa mạc',wx,wy,n,.70+random*.56,n>=1933&&n<=1935?'rock':'plant');
  }else if(cover>.61){
    const old=wx<4800&&noise(wx,wy,1420)>.40;
    const n=old?1795+(x+y)%9:wx>6200&&random>.84?312:wx>7600?400:408;
    decor(old?'Cổ mộc Vạn Lý':n===312?'Rặng trúc Nam Hoang':'Cây ven khe',wx,wy,n,.75+random*.49,'tree');
  }else{
    const scar=wx<3900&&random>.976&&cover>.49;
    const n=scar?1810+(x+y)%2:wx<2000?1782+(x+y)%4:1812+(x+y)%3;
    const name=scar?'Gỗ mục ven rừng':wx<2000?'Dây leo và nấm U Minh':'Thảm hoa và cỏ dại';
    decor(name,wx,wy,n,.62+random*.46);
  }
}
const arrivals={
 'sw-valley':[3264,6992], 'sw-umbral':[1264,7432], 'sw-ridge':[2400,9110], 'south-steppe':[5700,9030],
 'south-flowers':[6420,9460],'south-lake':[7864,9340],'south-ridge':[8768,9040],'se-black-sand':[9870,7830],
 'se-red-ridge':[11006,7360],'se-quicksand':[10570,8550],'se-bones':[10902,9310],'se-antiquities':[9984,9534],
};
for(const r of regions){
  const left=Math.max(r.x-r.width*.72,r.x>=9660?9664:0),top=Math.max(r.y-r.height*.72,r.x>=9660?6740:r.x>5250?8560:5860);
  const right=Math.min(gw*32,r.x+r.width*.72),bottom=Math.min(gh*32,r.y+r.height*.72);
  add('RegionMarkers',r.name,left,top,right-left,bottom-top,{regionId:r.id,danger:r.danger});
  const [x,y]=arrivals[r.id];
  add('NavigationMarkers',r.name,x,y,0,0,{markerId:r.id,regionId:r.id,walkable:true},{point:true});
}
const habitats=[
 ['sw-valley','wolf',6,3050,6700,850,600,1,1],['sw-umbral','flower',5,850,7490,870,730,2,2],
 ['sw-ridge','millennial',4,1980,8920,880,650,2,4],
 ['south-steppe','stag',5,5350,8840,640,480,0,4],['south-lake','toad',4,7670,9370,700,430,1,2],
 ['se-red-ridge','flame-lizard',5,10330,6930,790,720,2,4],['se-quicksand','sand-worm',5,9950,8350,890,500,2,3],
 ['se-bones','bone-wolf',5,10525,9100,680,590,2,3],['se-antiquities','bone-general',3,9765,9280,525,650,2,5],
];
for(const [id,species,cap,x,y,w,h,realmIndex,realmLevel] of habitats){
  add('FaunaZones',regions.find(r=>r.id===id).name,x,y,w,h,{zoneId:id,species,cap,realmIndex,realmLevel,
    respawnMs:44500+realmIndex*9000,normalOnly:true,spread:true,extraShanhe:true,leash:186,activityRadius:136,
    roster:JSON.stringify(Array.from({length:cap},(_,i)=>({species,rank:species==='millennial'&&i===0?'elite':'normal'})))});
}
const resources=[
 ['sw-valley','qingling_herb',3314,6950],['sw-valley','qingling_herb',3388,7044],
 ['sw-umbral','purple_venom_flower',1124,7475],['sw-umbral','soul_nourishing_grass',1308,7501],
 ['sw-ridge','thunder_fruit',2331,9142],['sw-ridge','frost_snow_lotus',2453,9081],
 ['south-steppe','qingling_herb',5664,9037],['south-flowers','qingling_herb',6430,9415],
 ['south-flowers','soul_nourishing_grass',6466,9504],['south-lake','moon_lotus',7830,9456],
 ['south-lake','soul_nourishing_grass',7973,9371],['south-ridge','thunder_fruit',8816,9105],
 ['se-black-sand','amber_dune_grass',9944,7788],['se-red-ridge','red_fire_crystal',10962,7417],
 ['se-quicksand','phantom_sand_crystal',10621,8540],['se-bones','bone_jade',10957,9378],
 ['se-antiquities','yin_soul_herb',10032,9260],['se-antiquities','bone_jade',10071,9548],
];
for(const [seq,[id,item,x,y]] of resources.entries()){
  const fitted=[0,40,80,120,160,200].flatMap(d=>[[0,0],[d,0],[-d,0],[0,d],[0,-d],[d,d]])
    .map(([dx,dy])=>({x:(Math.floor((x+dx)/32)+.5)*32,y:(Math.floor((y+dy)/32)+.5)*32}))
    .find(p=>suitable(p.x,p.y,1));
  if(!fitted)throw new Error('Could not place resource '+id+' '+item);
  add('WestTreasureSites','Điểm tài nguyên Vạn Lý',fitted.x,fitted.y,0,0,{zoneId:id,preferred:item,resourceId:'shanhe:'+id+':'+seq},{point:true});
}
for(const [name,x,y,gid] of [
 ['Hang Vạn Thú',3390,6438,1939],['Động phủ U Minh',1150,7960,1939],['Hang Thái Cổ',2590,8730,1939],
 ['Bia Thiên Sơn',8738,9110,1938],['Cửa động Xích Nham',10805,7390,1939],
 ['Tượng đá Bạch Cốt',10875,9420,1940],['Trận pháp cổ Nam Sa',10048,9620,1943],
 ['Bia cổ Nam Sa',9890,9468,1938],['Rương Nam Sa',9980,9510,1942],
]){
 const anchor=[0,36,72,108,144].flatMap(r=>[[x+r,y],[x-r,y],[x,y+r],[x,y-r]])
   .find(([px,py])=>suitable(px,py,1));
 if(!anchor)continue;
 decor(name,...anchor,gid,1.16,'landmark');
}
const cave=[{x:2368,y:9136},{x:2400,y:9152},{x:2456,y:9190}].find(p=>{
  const i=into(p.x,p.y);return painted[i]&&!water[i]&&!ridged[i]&&!protect[i];
});
if(!cave)throw new Error('Could not place Shanhe cave');
add('SpiritVeins','Hang Linh Nham',cave.x,cave.y,0,0,{
  veinId:'shanhe-linh-nham',grade:2,capacity:6,region:'sw-ridge',owner:'',hidden:true,guard:'millennial',
},{point:true});
map.tilesets.sort((a,b)=>a.firstgid-b.firstgid);
const clean=JSON.stringify(map,null,'  ').replace(/("data"\s*:\s*)(\[\s*[0-9,\s]+\])/g,(_,prefix,text)=>{
  const cells=JSON.parse(text),rows=[];
  for(let i=0;i<cells.length;i+=gw)rows.push(cells.slice(i,i+gw).join(','));
  return prefix+'[\n        '+rows.join(',\n        ')+'\n      ]';
});
fs.writeFileSync(file,clean+'\n');
console.log({regions:regions.length,fauna:habitats.reduce((n,r)=>n+r[2],0),resources:resources.length,
  newTiles:painted.filter(v=>v===2).length,water:aquifer.filter(Boolean).length,cliffs:ridged.filter(Boolean).length});

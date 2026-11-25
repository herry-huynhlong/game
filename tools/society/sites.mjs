import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const file=new URL('../../maps/world-rebuild-1b.tmj',import.meta.url);
const map=JSON.parse(readFileSync(file,'utf8'));
const city=process.argv.includes('--city');
const count=Number(execFileSync('python',[fileURLToPath(new URL('../../art/source/society/paint.py',import.meta.url)),city?'city':'land'],{encoding:'utf8'}).trim());
const layers=['SocietyArt','SocietyCollision','SocietyStations'];
map.layers=map.layers.filter(l=>!layers.includes(l.name));
map.tilesets=map.tilesets.filter(t=>t.name!=='SocietyFacilities');
const makeLayer=(name,i)=>({name,id:map.nextlayerid+i,type:'objectgroup',objects:[],draworder:'topdown',visible:true,x:0,y:0,opacity:1});
const [art,solids,sites]=layers.map(makeLayer);
const record=(layer,name,x,y,width,height,props,extras={})=>{
  const o={id:map.nextobjectid++,name,x,y,width,height,rotation:0,visible:true,
    properties:Object.entries(props).map(([name,value])=>({name,value,type:typeof value==='number'?'int':'string'})),...extras};
  layer.objects.push(o);
  return o;
};
const graphic=(name,frame,x,y,props={})=>record(art,name,x-96,y+12,192,128,{depth:y,...props},{gid:1650+frame});
const block=(name,x,y,w,h)=>record(solids,name,x,y,w,h,{kind:'society'});
const point=(name,id,x,y,props={})=>record(sites,name,x,y,0,0,{id,...props},{point:true});
const road=map.layers.find(l=>l.name==='Roads').data;
const paintRoad=(from,to,width=1)=>{
  const distance=Math.hypot(to[0]-from[0],to[1]-from[1]);
  for(let i=0;i<=distance;i+=12){
    const x=Math.floor((from[0]+(to[0]-from[0])*i/distance)/32),y=Math.floor((from[1]+(to[1]-from[1])*i/distance)/32);
    for(let d=0;d<width;d++)road[y*map.width+x+d]=73+((x+y+d)%8);
  }
};
paintRoad([2600,5510],[2740,5600],2);
paintRoad([4560,5550],[4850,5504],2);
paintRoad([4850,5504],[4944,5744]);
graphic('Mỏ Quặng Sắt',0,2419,5457,{label:'Mỏ Quặng Sắt'});
block('Vách mỏ',2338,5381,160,69);
graphic('Kho tập kết linh khoáng',9,2410,5670,{label:'Kho linh khoáng'});
block('Kho linh khoáng',2347,5610,126,49);
graphic('Giỏ khoáng',8,2512,5651);
for(const [index,[x,y]] of [[2278,5492],[2402,5518],[2532,5433],[2646,5455],[2228,5615],[2546,5560]].entries()){
  const id='vein-'+index;
  graphic('Mạch linh khoáng '+(index+1),1,x,y,{ore:id});
  block('Chân mạch linh khoáng',x-26,y-13,52,20);
  point('Khai thác '+(index+1),id,x,y+24,{site:'mine',grade:index%3===0?2:1,capacity:4+index%3});
}
point('Mỏ Quặng Sắt','mine',2477,5502,{site:'landmark'});
graphic('Kho dụng cụ Linh Điền',9,4680,5460,{label:'Kho nông cụ'});
block('Kho nông cụ',4625,5401,110,51);
graphic('Hồ tưới',7,5056,5535,{depth:8,label:'Hồ dẫn nước'});
block('Hồ tưới',4984,5494,140,35);
for(let i=0;i<8;i++){
  const x=4740+(i%3)*203,y=5620+Math.floor(i/3)*91,id='paddy-'+i;
  graphic('Luống linh điền '+(i+1),3,x,y,{depth:8,crop:id});
  point('Canh tác '+(i+1),id,x,y-31,{site:'farm',crop:i%3?'spirit_herb':'ration'});
}
point('Linh Điền','fields',4740,5634,{site:'landmark'});

if(city) {
  const base=map.layers.find(l=>l.name==='Collision').objects;
  const clear=(x,y,w=10,h=7)=>![...base,...solids.objects].some(r=>r.visible!==false&&x+w>r.x&&x-w<r.x+r.width&&y+h>r.y&&y-h<r.y+r.height);
  const lots=[
    {key:'inn',name:'Khách Điếm Vân Lai',x:4364,y:2835,prop:14,seats:4},
    {key:'tavern',name:'Tửu Quán Tùng Ảnh',x:2624,y:2835,prop:13,seats:6},
    {key:'tea',name:'Trà Quán Bích Trúc',x:3337,y:2515,prop:13,seats:5,building:10},
    {key:'music',name:'Nhã Nhạc Lâu',x:3583,y:2628,prop:13,seats:6,building:11},
    {key:'clinic',name:'Y Quán An Tâm',x:4018,y:2260,prop:14,seats:4,building:12},
  ];
  for(const v of lots){
    const {key,name,x,y,seats}=v;
    if(v.building){
      graphic(name,v.building,x,y,{label:name});
      block(name,x-68,y-52,136,44);
    }
    const selected=[];
    const choose=(cx,cy,exclude=[],hw=10,hh=6)=>{
      for(const r of [0,16,31,47,63,79,96])for(const [dx,dy] of [[0,-1],[0,1],[1,0],[-1,0],[1,1],[-1,1],[1,-1],[-1,-1]]){
        const a=cx+dx*r,b=cy+dy*r;
        if(a<2110||a>4820||b>2935||!clear(a,b,hw,hh)||
          [...selected,...exclude].some(p=>Math.hypot(p.x-a,p.y-b)<21))continue;
        return {x:a,y:b};
      }
      throw Error('No usable slot '+name+' near '+cx+','+cy);
    };
    const slot=(use,id,target,more={})=>{
      const p=choose(...target);
      selected.push(p);
      point(name+' · '+id,key+'-'+id,p.x,p.y,{site:'venue',venue:key,use,...more});
      return p;
    };
    const attendant=slot('staff','staff',[x-46,y+14]);
    graphic(name+' · quầy',15,attendant.x,attendant.y-8);
    slot('counter','counter',[attendant.x+8,attendant.y+30]);
    for(let i=0;i<3;i++)slot('queue','queue-'+i,[x-74+i*26,y+58]);
    if(key==='music')graphic('Sân đàn',16,x+52,y+37,{depth:8});
    for(let i=0;i<seats;i++){
      const [cx,cy]=[x+9+i%3*45,y+45+Math.floor(i/3)*34];
      const p=slot('seat','seat-'+i,[cx,cy],{table:i%2});
      if(v.prop===14||i%2===0)graphic(name+' · '+(v.prop===14?'giường':'bàn trà'),v.prop,p.x+10,p.y-10);
    }
    point(name,key,x,y+31,{site:'landmark'});
  }
}

map.layers.push(art,solids,sites);
map.tilesets.push({firstgid:1650,name:'SocietyFacilities',tilewidth:192,tileheight:128,columns:5,tilecount:count,
  image:'../public/assets/society/facilities.png',imagewidth:960,imageheight:Math.ceil(count/5)*128,
  margin:0,spacing:0,objectalignment:'bottomleft',type:'tileset',version:'1.10',tiledversion:'1.12.2'});
map.nextlayerid+=3;
const formatted=JSON.stringify(map,null,' ').replace(/("data": )\[([\s\d,]+)\]/g,(_,prefix,vals)=>{
  const a=JSON.parse('['+vals+']'),rows=[];
  for(let i=0;i<a.length;i+=map.width)rows.push(a.slice(i,i+map.width).join(','));
  return prefix+'[\n    '+rows.join(',\n    ')+'\n   ]';
});
writeFileSync(file,formatted+'\n','utf8');

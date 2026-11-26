import { drawTile } from './world/MinimapCamera.js';
import './world/shanhe-preview.css';

const display=document.querySelector('#map canvas'),controls=document.querySelector('#controls');
const status=document.querySelector('#status'),goto=document.querySelector('#goto'),locationText=document.querySelector('#location');
const property=(obj,name)=>obj.properties?.find(p=>p.name===name)?.value;
const section=[
  ['terrain','Địa hình',true],['biomes','Ranh giới sinh cảnh',false],['vegetation','Thực vật',true],['water','Mặt nước',true],
  ['collision','Va chạm',false],['navigation','Mạng đi bộ',false],['resources','Tài nguyên và linh mạch',true],
  ['monsters','Lãnh địa yêu thú',false],['npcs','Hoạt động NPC',false],['roads','Đường và cầu',true],['empty','Ô nền thưa',false],
];
const SAVE='world-rebuild-1c-v1';
const asset=path=>path.replace(/^(\.\.\/)+public/,'');
function getActors(){
  try{return JSON.parse(localStorage.getItem(SAVE)||'{}').npcs?.filter(n=>n.alive&&!n.underground)??[];}
  catch{return [];}
}
const loadImage=async url=>{
  const img=new Image();img.src=url;await img.decode();return img;
};
function makeCanvas(w,h){
  const c=document.createElement('canvas');c.width=w;c.height=h;
  return c;
}

async function render(){
  const response=await fetch('/maps/world-rebuild-1b.tmj');
  if(!response.ok)throw Error('Không tải được bản đồ '+response.status);
  const map=await response.json(),objects=name=>map.layers.find(l=>l.name===name)?.objects??[];
  const data=name=>map.layers.find(l=>l.name===name)?.data;
  const offset=property(map,'westOffsetX')??0,cell=3,ratio=cell/map.tilewidth;
  display.width=map.width*cell;display.height=map.height*cell;
  const images=Object.fromEntries(await Promise.all(map.tilesets.filter(t=>t.image&&t.tilewidth===32&&t.tileheight===32)
    .map(async t=>[t.name,await loadImage(asset(t.image))])));
  const cache={},flags={};
  for(const [id,title,checked] of section){
    const label=document.createElement('label'),input=document.createElement('input');
    input.type='checkbox';input.checked=checked;input.dataset.layer=id;flags[id]=input;
    input.addEventListener('change',()=>draw());
    label.append(input,document.createTextNode(title));controls.append(label);
  }
  function tiles(ctx,names){
    for(const name of names){
      const grid=data(name);if(!grid)continue;
      for(let i=0;i<grid.length;i++)if(grid[i])drawTile(ctx,grid[i],map,images,i%map.width,Math.floor(i/map.width),cell);
    }
  }
  const collision=objects('Collision');
  const ground=data('GroundBase');
  const zones=objects('RegionMarkers');
  const span=(ctx,o)=>ctx.strokeRect(o.x*ratio,o.y*ratio,o.width*ratio,o.height*ratio);
  const pin=(ctx,x,y,color,w=2)=>{
    ctx.fillStyle=color;ctx.fillRect(x*ratio-w/2,y*ratio-w/2,w,w);
  };
  const painters={
    terrain:ctx=>{
      tiles(ctx,['GroundBase','GroundDetails','TerrainTransitions','CityEdges','Cliffs']);
      for(const [region,color] of [['city','#edcd82'],['sect','#e0cba0'],['east-ruins','#e7c090'],['se-antiquities','#ecd1a7']]){
        const item=zones.find(o=>property(o,'regionId')===region);if(!item)continue;
        ctx.fillStyle='#222d23d9';ctx.fillRect((item.x+item.width/2)*ratio-15,(item.y+item.height/2)*ratio-8,30,16);
        ctx.fillStyle=color;ctx.font='bold 10px serif';ctx.textAlign='center';ctx.fillText(region==='city'?'城':region==='sect'?'宗':'古',
          (item.x+item.width/2)*ratio,(item.y+item.height/2)*ratio+3);
      }
    },
    water:ctx=>tiles(ctx,['Water','Shore']),
    roads:ctx=>tiles(ctx,['Roads','OldRoadPaths']),
    vegetation:ctx=>{
      for(const o of objects('StaticDecor')){
        const g=o.gid??0,kind=property(o,'kind');
        if(kind==='tree'||kind==='plant'||g>=1770&&g<1815||g>=1920&&g<1933)
          pin(ctx,o.x+o.width/2,o.y,kind==='tree'?'#253c2cbd':'#9baf69ad',kind==='tree'?3:1.4);
      }
    },
    biomes:ctx=>{
      ctx.strokeStyle='#dce49daa';ctx.lineWidth=1;ctx.setLineDash([4,3]);
      for(const o of zones){span(ctx,o);ctx.fillStyle='#f4e3b1';ctx.font='10px serif';ctx.fillText(o.name,o.x*ratio+3,o.y*ratio+11);}
      ctx.setLineDash([]);
    },
    collision:ctx=>{
      ctx.fillStyle='#fe857aab';
      for(const o of collision)ctx.fillRect(o.x*ratio,o.y*ratio,o.width*ratio,o.height*ratio);
    },
    navigation:ctx=>{
      const stride=map.width*2,rows=map.height*2,blocked=new Uint8Array(stride*rows),visited=new Uint8Array(blocked.length);
      for(const o of collision)for(let y=Math.max(0,Math.floor(o.y/16));y<Math.min(rows,Math.ceil((o.y+o.height)/16));y++)
        for(let x=Math.max(0,Math.floor(o.x/16));x<Math.min(stride,Math.ceil((o.x+o.width)/16));x++)blocked[y*stride+x]=1;
      const marker=objects('NavigationMarkers').find(o=>property(o,'markerId')==='city-center');
      const start=Math.floor(marker.y/16)*stride+Math.floor(marker.x/16),queue=new Int32Array(blocked.length);
      let tail=1;queue[0]=start;visited[start]=1;
      for(let head=0;head<tail;head++){
        const i=queue[head],x=i%stride,y=Math.floor(i/stride);
        const next=[x>0?i-1:-1,x<stride-1?i+1:-1,y>0?i-stride:-1,y<rows-1?i+stride:-1];
        for(const n of next)if(n>=0&&!visited[n]&&!blocked[n]){visited[n]=1;queue[tail++]=n;}
      }
      ctx.fillStyle='#98f5b052';
      for(let y=0;y<rows;y++)for(let x=0;x<stride;x++)if(visited[y*stride+x])ctx.fillRect(x*cell/2,y*cell/2,cell/2,cell/2);
      for(const o of objects('NavigationMarkers'))pin(ctx,o.x,o.y,visited[Math.floor(o.y/16)*stride+Math.floor(o.x/16)]?'#f9e9a2':'#ee956a',3);
    },
    resources:ctx=>{
      for(const o of objects('WestTreasureSites'))pin(ctx,o.x,o.y,property(o,'resourceId')?'#f4c86d':'#c3e09b',1.8);
      for(const o of objects('SpiritVeins'))pin(ctx,o.x,o.y,'#82edf6',4);
    },
    monsters:ctx=>{
      ctx.strokeStyle='#fbaa68de';ctx.fillStyle='#91644549';ctx.lineWidth=1;
      const habitats=objects('FaunaTerritories'),zones=objects('FaunaZones');
      const described=new Set(habitats.map(o=>property(o,'zoneId')));
      for(const o of [...habitats,...zones.filter(o=>!described.has(property(o,'zoneId')))]){
        ctx.fillRect(o.x*ratio,o.y*ratio,o.width*ratio,o.height*ratio);span(ctx,o);
      }
    },
    empty:ctx=>{
      ctx.fillStyle='#fa87d580';
      for(let i=0;i<ground.length;i++){
        const gid=ground[i],x=i%map.width,y=Math.floor(i/map.width);
        // The former southern filler was ordinary base grass with no mapped road or surface water.
        if(y>180&&gid>0&&gid<=24&&!data('Roads')[i]&&!data('Water')[i])ctx.fillRect(x*cell,y*cell,cell,cell);
      }
    },
  };
  function draw(){
    const ctx=display.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.fillStyle='#1b2821';ctx.fillRect(0,0,display.width,display.height);
    for(const id of ['terrain','empty','water','roads','vegetation','resources','collision','navigation','monsters','biomes']){
      if(!flags[id].checked)continue;
      if(!cache[id]){
        cache[id]=makeCanvas(display.width,display.height);
        painters[id](cache[id].getContext('2d'));
      }
      ctx.drawImage(cache[id],0,0);
    }
    if(flags.npcs.checked){
      const npcs=getActors();
      for(const n of npcs)pin(ctx,n.x+offset,n.y,n.action==='travel'?'#ffe0a5':'#d5bdfb',3);
      status.textContent=npcs.length?npcs.length+' NPC từ lần lưu gần nhất.':'Chưa có vị trí NPC trong bản lưu ở trình duyệt này.';
    }else status.textContent=map.width+' × '+map.height+' ô địa hình';
  }
  display.addEventListener('pointerdown',event=>{
    const rect=display.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width*map.width*32,y=(event.clientY-rect.top)/rect.height*map.height*32;
    const near=objects('NavigationMarkers').filter(o=>property(o,'markerId'))
      .sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];
    locationText.textContent=(near?.name??'')+' · '+Math.round(x-offset)+', '+Math.round(y);
    goto.hidden=!near;goto.href='/?region='+encodeURIComponent(property(near,'markerId'));
  });
  window.addEventListener('storage',event=>{if(event.key===SAVE&&flags.npcs.checked)draw();});
  draw();window.__shanhePreviewReady=true;
}
render().catch(error=>{status.textContent=error.message;});

export const CAVE_SIZE={tile:24};
export const CAVE_ENTRY={x:2,y:8};
export const CAVE_LAYOUT_VERSION=3;
export const CAVE_BEASTS=[
  {name:'Địa Sa Yêu Trùng',realmIndex:0,realmLevel:2,color:'#cfaa74',hp:54,range:1,damage:8,interval:4,skill:'Cắn cát'},
  {name:'Kim Giáp Độc Hạt',realmIndex:0,realmLevel:6,color:'#d6a24b',hp:88,range:2,damage:13,interval:5,skill:'Chích độc'},
  {name:'Linh Nham Thạch Yêu',realmIndex:1,realmLevel:3,color:'#88769d',hp:124,range:1,damage:23,interval:7,skill:'Dậm nham'},
  {name:'U Minh Huyết Bức',realmIndex:0,realmLevel:8,color:'#9b637b',hp:91,range:3,damage:15,interval:4,skill:'Sóng huyết âm'},
  {name:'Huyền Giáp Địa Thử',realmIndex:1,realmLevel:4,color:'#91969e',hp:139,range:1,damage:18,interval:3,skill:'Cắn phá giáp'},
  {name:'Thái Cổ Địa Long',realmIndex:2,realmLevel:3,color:'#d5b077',hp:240,range:2,damage:35,interval:6,skill:'Địa Long Chấn'},
];
export const CAVE_TREASURES=['Địa Tâm Linh Nhũ','Huyền Tinh Thạch','Địa Hỏa Linh Chi','Hàn Ngọc Tủy','Tử Tinh Linh Quả','Vạn Niên Thạch Tủy','Linh Mạch Chi Tâm'];

export const CAVE_BIOMES=[
  {name:'Linh Tinh Động',ground:'#3e4549',detail:'#626872',wall:'#333941',edge:'#7b8690',accent:'#8bd8d3'},
  {name:'U Minh Nấm Lâm',ground:'#2f4844',detail:'#49645b',wall:'#253d3d',edge:'#5e786c',accent:'#98d9ae'},
  {name:'Địa Tâm Linh Hồ',ground:'#354a56',detail:'#516977',wall:'#2e414e',edge:'#728b9b',accent:'#7ed9e5'},
  {name:'Hoàng Sa Địa Uyên',ground:'#584d42',detail:'#78634e',wall:'#443c35',edge:'#9c805e',accent:'#e8b980'},
  {name:'Địa Hỏa Động',ground:'#564044',detail:'#71524c',wall:'#403135',edge:'#a06852',accent:'#ff9d61'},
  {name:'Thái Cổ Di Tích',ground:'#473f56',detail:'#655a71',wall:'#332d48',edge:'#877d9b',accent:'#cbaaec'},
];
export const CAVE_FLORA=[
  {name:'U Minh Linh Cô',color:'#a777de',material:'um-minh-linh-co'},
  {name:'Địa Hỏa Linh Chi',color:'#ee925e',material:'dia_hoa_linh_chi'},
  {name:'Huyền Âm Thảo',color:'#8aa8dd',material:'huyen-am-thao'},
  {name:'Linh Tinh Đằng',color:'#75c2ac',material:'linh-tinh-dang'},
  {name:'Thạch Sinh Linh Hoa',color:'#f1c78c',material:'thach-sinh-linh-hoa'},
  {name:'Địa Mạch Cổ Mộc',color:'#9fb77b'},
  {name:'Nấm phát sáng',color:'#77d1be'},
  {name:'Rêu linh khí',color:'#abd781'},
];
const passable=t=>Boolean(t&&'.:=rt'.includes(t));
const adjacent=[[0,-1],[1,0],[0,1],[-1,0]];
export const caveDistance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
export const caveCell=(floor,p)=>p.y*floor.width+p.x;
export function caveHash(key){
  let hash=2166136261;
  for(const letter of key)hash=Math.imul(hash^letter.charCodeAt(0),16777619);
  return hash>>>0;
}
function rng(seed){
  let state=seed||1;
  return n=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)%n;};
}
export function caveOpen(floor,x,y){
  const t=floor.rows[y]?.[x];
  return passable(t);
}
export function caveLine(floor,from,to){
  const count=Math.max(Math.abs(to.x-from.x),Math.abs(to.y-from.y));
  for(let i=1;i<count;i++){
    const x=Math.round(from.x+(to.x-from.x)*i/count),y=Math.round(from.y+(to.y-from.y)*i/count);
    if(!caveOpen(floor,x,y))return false;
  }
  return true;
}

// Use a bounded best-first search with cardinal movement. Routes are reused by
// actors until their destination changes or the next cell becomes occupied.
export function caveRoute(floor,from,to,blocked){
  if(!caveOpen(floor,to.x,to.y)||!caveOpen(floor,from.x,from.y))return null;
  const width=floor.width,start=caveCell(floor,from),goal=caveCell(floor,to);
  if(start===goal)return [];
  const previous=new Int32Array(width*floor.height).fill(-1);
  const costs=new Int32Array(previous.length);
  const buckets=[];
  let lowest=caveDistance(from,to);
  buckets[lowest]=[start];previous[start]=start;
  let remaining=1;
  for(let visits=0;remaining&&visits<previous.length*2;visits++){
    while(!buckets[lowest]?.length)lowest++;
    const cell=buckets[lowest].pop();remaining--;
    const x=cell%width,y=Math.floor(cell/width);
    if(cell===goal){
      const result=[];
      for(let step=goal;step!==start;step=previous[step])result.push({x:step%width,y:Math.floor(step/width)});
      return result.reverse();
    }
    const cost=costs[cell]+1;
    for(const [dx,dy] of adjacent){
      const nx=x+dx,ny=y+dy,next=ny*width+nx;
      if(!caveOpen(floor,nx,ny)||blocked?.has(next)||(previous[next]!==-1&&cost>=costs[next]))continue;
      previous[next]=cell;costs[next]=cost;
      const score=cost+Math.abs(nx-to.x)+Math.abs(ny-to.y);
      (buckets[score]??=[]).push(next);remaining++;
    }
  }
  return null;
}
export const caveStep=(floor,from,to,blocked)=>caveRoute(floor,from,to,blocked)?.[0]??null;
export function caveBiomeAt(floor,x,y){
  let nearest=floor.rooms[0],best=Infinity;
  for(const r of floor.rooms){
    const d=(r.x-x)**2+(r.y-y)**2;
    if(d<best){best=d;nearest=r;}
  }
  return nearest.biome;
}
export function caveSafePoint(floor,p){
  if(caveOpen(floor,p.x,p.y))return {x:p.x,y:p.y};
  for(let r=1;r<=16;r++)for(let dy=-r;dy<=r;dy++)for(const dx of [-r,r,r-Math.abs(dy),Math.abs(dy)-r]){
    if(caveOpen(floor,p.x+dx,p.y+dy))return {x:p.x+dx,y:p.y+dy};
  }
  return {...floor.entry};
}

export function createCave(site){
  const floors=[],nodes=[];
  const base=site.kind==='iron'?64:[96,128,192,256][site.grade-1];
  const total=site.kind==='iron'?1:site.grade;
  for(let level=0;level<total;level++){
    const seed=caveHash(site.id+'/'+level),random=rng(seed);
    const width=base,height=base,rows=Array.from({length:height},()=>Array(width).fill('#'));
    const entry={...CAVE_ENTRY},down={x:width-12,y:height-13};
    const rooms=[],edges=[],props=[],flora=[];
    const put=(x,y,t)=>{if(x>=1&&x<width-1&&y>=1&&y<height-1)rows[y][x]=t;};
    const room=(x,y,rx,ry,biome,name)=>{
      const r={x,y,rx,ry,biome,name:name??CAVE_BIOMES[biome].name};
      const side=random(2)?1:-1,secondaryX=x+side*Math.floor(rx*.58),secondaryY=y+(random(2)?1:-1)*Math.floor(ry*.46);
      for(let yy=y-ry-4;yy<=y+ry+4;yy++)for(let xx=x-rx-4;xx<=x+rx+4;xx++){
        const dx=(xx-x)/rx,dy=(yy-y)/ry;
        const noise=((Math.imul(xx+seed,1597334677)^Math.imul(yy+37,3812015801))>>>26)/64;
        const lobe=((xx-secondaryX)/(rx*.71))**2+((yy-secondaryY)/(ry*.67))**2;
        if(Math.min(dx*dx+dy*dy,lobe)<=.78+.38*noise)put(xx,yy,biome===3?':':biome===5?'r':'.');
      }
      rooms.push(r);return r;
    };
    const corridor=(a,b,thick)=>{
      let x=a.x,y=a.y,run=0,axis=0;
      for(let i=0;i<width+height+8;i++){
        for(let oy=-thick;oy<=thick;oy++)for(let ox=-thick;ox<=thick;ox++)
          if(Math.abs(ox)+Math.abs(oy)<=thick+1){
            const t=rows[y+oy]?.[x+ox];
            const wet=t==='~'||t==='!';
            if(!wet||Math.abs(ox)+Math.abs(oy)<=1)put(x+ox,y+oy,wet?'=':t&&t!=='#'?t:'.');
          }
        if(x===b.x&&y===b.y)break;
        if(!run){run=2+random(10);axis=random(2);}
        if(x!==b.x&&(axis===0||y===b.y))x+=Math.sign(b.x-x);
        else y+=Math.sign(b.y-y);
        run--;
      }
    };
    const tunnel=(a,b,thick=1)=>{
      const span=caveDistance(a,b);
      if(span<22) corridor(a,b,thick);
      else{
        const curve=span>=46?9:5;
        const legal=(v,max)=>Math.max(3,Math.min(max-4,v));
        const elbow={x:legal(Math.round(a.x*.52+b.x*.48)+random(curve*2+1)-curve,width),
          y:legal(Math.round(a.y*.52+b.y*.48)+random(curve*2+1)-curve,height)};
        corridor(a,elbow,thick);corridor(elbow,b,Math.max(1,thick-1));
        if(span>52&&random(3)!==0){
          const alcove={x:legal(elbow.x+random(15)-7,width),y:legal(elbow.y+random(15)-7,height)};
          corridor(elbow,alcove,1);
          for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)
            if(Math.abs(dx)+Math.abs(dy)<4&&rows[alcove.y+dy]?.[alcove.x+dx]==='#')put(alcove.x+dx,alcove.y+dy,'.');
        }
      }
      edges.push([a,b]);
    };
    const entrance=room(8,11,9,7,0,'Cửa mỏ và điểm tập hợp');
    tunnel(entry,entrance,1);
    // Leave the historical entry apron open for a party and migrated saves.
    for(let y=6;y<=10;y++)for(let x=1;x<=7;x++)put(x,y,'.');
    const rest=room(17,21,8,6,0,'Trạm nghỉ và kho tạm');
    tunnel(entrance,rest,2);
    for(let x=10;x<=21;x++)put(x,rest.y+2,'t');
    props.push({x:rest.x,y:rest.y,kind:'camp',name:'Trạm nghỉ và kho tạm'},
      {x:20,y:rest.y+2,kind:'cart',name:'Xe goòng quặng'},
      {x:10,y:rest.y+2,kind:'sign',name:'Biển chỉ dẫn khu khai thác'},
      {x:13,y:rest.y,kind:'torch',name:'Đuốc dẫn đường'});
    const cols=site.grade>=3?4:3,rowsCount=site.grade>=4?5:site.kind==='iron'?2:3;
    const choices=site.kind==='iron'?[0,0,3,2]:site.grade===1?[0,1,2,3]:site.grade===2?[0,1,2,3,4]:[0,1,2,3,4,5];
    const grid=[];
    for(let gy=0;gy<rowsCount;gy++)for(let gx=0;gx<cols;gx++){
      const jitter=Math.floor(width/(cols*7))+3;
      const x=Math.round((gx+.48)*width/cols)+random(jitter*2+1)-jitter;
      const y=Math.round((gy+.48)*height/rowsCount)+random(jitter*2+1)-jitter;
      const biome=choices[(gx+gy*cols+level+seed%choices.length)%choices.length];
      const r=room(x,y,Math.min(22,6+random(6)+Math.floor(width/38)),Math.min(19,5+random(5)+Math.floor(height/42)),biome);
      grid.push(r);
      if(biome===2||biome===4){
        const cy=r.y,rx=Math.floor(r.rx*.8),ry=Math.max(2,Math.floor(r.ry*.66));
        for(let yy=cy-ry;yy<=cy+ry;yy++)for(let xx=r.x-rx;xx<=r.x+rx;xx++)
          if(((xx-r.x)/rx)**2+((yy-cy)/ry)**2<1.05)put(xx,yy,biome===2?'~':'!');
        for(let dx=-rx-1;dx<=rx+1;dx++)for(let dy=0;dy<=1;dy++)put(r.x+dx,cy+dy,'=');
      }
      if(gx)tunnel(grid.at(-2),r,1+random(2));
      if(gy&&(!gx||random(3)!==0))tunnel(grid[grid.length-cols-1],r,1);
      if(gy>0&&gx>0&&random(4)<=1)tunnel(grid[grid.length-cols-2],r,1);
    }
    tunnel(rest,grid[0],2);
    const deep=room(down.x,down.y,8,6,level===total-1?choices.at(-1):0,level===total-1?'Hang sâu':'Lối xuống tầng sâu');
    tunnel(grid.at(-1),deep,2);
    // Remove loose edge pixels disconnected by the irregular room masks.
    // This gives every walkable tile a legal route back to the entrance.
    const queue=[entry.y*width+entry.x],walkable=new Uint8Array(width*height);
    walkable[queue[0]]=1;
    for(let i=0;i<queue.length;i++){
      const cell=queue[i],x=cell%width,y=Math.floor(cell/width);
      for(const [dx,dy] of adjacent){
        const nx=x+dx,ny=y+dy,next=ny*width+nx;
        if(!walkable[next]&&passable(rows[ny]?.[nx])){walkable[next]=1;queue.push(next);}
      }
    }
    for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++)
      if(passable(rows[y][x])&&!walkable[y*width+x])rows[y][x]='#';
    const floor={width,height,entry,down:level+1<total?down:null,rooms,edges,props,flora,rows:rows.map(r=>r.join('')),seed};
    const safe=(r,dx=0,dy=0)=>caveSafePoint(floor,{x:r.x+dx,y:r.y+dy});
    for(const prop of props)Object.assign(prop,safe(prop));
    const deposits=[safe(grid[0],-2,-3),...grid.slice(1).map(r=>safe(r,-3+r.biome%4,2-r.biome%3))];
    for(const [index,p] of deposits.entries())nodes.push({...p,id:level+':'+index,level,mapId:site.id+':'+level,slots:1});
    for(const [i,r] of grid.entries()){
      props.push({...safe(r,4,-3),kind:['crystal','fungi','stalagmite','rubble','torch','ruins'][r.biome]});
      for(let j=0;j<8;j++){
        const p=safe(r,random(r.rx*2-4)-r.rx+2,random(r.ry*2-4)-r.ry+2);
        if(deposits.some(q=>caveDistance(q,p)<2)||flora.some(q=>!caveDistance(q,p)))continue;
        flora.push({...p,id:level+':plant:'+i+':'+j,type:[[3,4,7],[0,2,5,6],[2,6,7],[4,7],[1,1,4],[3,5,6]][r.biome][random([3,4,3,2,3,3][r.biome])],age:random(480)});
      }
      for(let j=0;j<6;j++){
        const p=safe(r,random(r.rx*2-3)-r.rx+1,random(r.ry*2-3)-r.ry+1);
        if(caveDistance(p,r)<3||deposits.some(q=>caveDistance(q,p)<=1)||props.some(q=>caveDistance(q,p)<2)||flora.some(q=>!caveDistance(q,p)))continue;
        const byBiome=[['rubble','crystal','stalagmite'],['fungi','rubble','fungi'],['stalagmite','rubble','crystal'],['rubble','stalagmite','rubble'],['rubble','torch','crystal'],['ruins','ruins','torch']];
        props.push({...p,kind:byBiome[r.biome][random(3)]});
      }
    }
    const lairRoom=grid.at(-2),species=site.grade===1?0:site.grade===4&&level===3?5:1+seed%4;
    floor.lair=site.kind==='spirit'&&(site.grade>1||site.id==='sect-jade'||seed%4===0)?{...safe(lairRoom,3,-2),species,radius:8+level*2}:null;
    if(floor.lair)lairRoom.name='Hang '+CAVE_BEASTS[species].name;
    const type=site.id==='outer-mist'&&level===1?3:site.grade===4&&level===3?6:seed%6;
    floor.treasure=level>0?{...safe(grid.at(-3),3,3),type}:null;
    floors.push(floor);
  }
  // Give every floor a share first, then distribute remaining reserve through
  // different galleries without changing the surface ledger's total.
  for(const node of nodes)node.capacity=0;
  const byFloor=floors.map((_,i)=>nodes.filter(n=>n.level===i));
  for(let i=0;i<site.max;i++){
    const group=byFloor[i%floors.length],cycle=Math.floor(i/floors.length);
    group[(cycle*3+Math.floor(cycle/group.length))%group.length].capacity++;
  }
  return {floors,nodes:nodes.filter(n=>n.capacity>0)};
}

export function syncCaveStock(nodes,stock,expected){
  const valid=new Set(nodes.map(n=>n.id));
  for(const id of Object.keys(stock))if(!valid.has(id))delete stock[id];
  let count=0;
  for(const n of nodes){stock[n.id]=Math.max(0,Math.min(n.capacity,stock[n.id]??0));count+=stock[n.id];}
  let delta=expected-count;
  for(const node of nodes){
    if(!delta)break;
    const prior=stock[node.id],change=delta>0?Math.min(node.capacity-prior,delta):Math.max(-prior,delta);
    stock[node.id]=prior+change;
    delta-=change;
  }
}

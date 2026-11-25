import {CAVE_SIZE,CAVE_BIOMES,CAVE_FLORA,caveBiomeAt,caveHash,caveOpen} from './UndergroundMaps.js';
export const UG_TILE=CAVE_SIZE.tile,UG_CHUNK=12;
export const rect=(g,x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(x,y,w,h);};
export function polygon(g,points,color){
  g.fillStyle=color;g.beginPath();
  points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();
}
const pix=(g,x,y,c)=>rect(g,x,y,1,1,c);
const colors=['#91d3ae','#87cbd8','#b29bde','#eed18b'];
const dark='#1d2831';
const water=['#203d51','#254858','#2c5266','#326173'];
const lava=['#803d41','#a34e42','#b95646','#d1694a'];

export function crystal(g,x,y,color,scale=1,full=true){
  g.save();g.translate(x,y);g.scale(scale,scale);
  polygon(g,[[-13,2],[-10,-6],[-4,-7],[-1,-10],[10,-8],[14,-1],[10,5],[-7,6]],'#263238');
  polygon(g,[[-10,1],[-6,-5],[2,-7],[9,-5],[10,1],[3,3],[-6,4]],'#657177');
  if(full){
    for(const [dx,h,w] of [[-7,11,3],[1,22,5],[9,14,4]]){
      polygon(g,[[dx-w,1],[dx-w,-h+5],[dx,-h],[dx+w,-h+5],[dx+w,0],[dx,4]],dark);
      polygon(g,[[dx-w+1,0],[dx-w+1,-h+6],[dx,-h+2],[dx+w-1,-h+5],[dx+w-1,-1],[dx,2]],color);
      polygon(g,[[dx,1],[dx,-h+2],[dx+w-1,-h+5],[dx+w-1,-1]],'#467783');
      rect(g,dx-2,-h+6,1,Math.max(3,h-9),'#e5f0d4');
    }
  }else{
    rect(g,-5,-1,9,2,'#303b41');rect(g,4,-5,2,4,color);rect(g,-7,-4,2,2,color);
  }
  g.restore();
}
export function mineral(g,x,y,site,full){
  if(site.kind==='iron'){
    g.save();g.translate(x,y);
    polygon(g,[[-11,2],[-10,-5],[-4,-11],[6,-9],[11,-2],[8,4],[-5,6]],'#273037');
    polygon(g,[[-10,-4],[-4,-10],[4,-8],[2,-4],[-2,0],[-8,1]],'#6a6d64');
    polygon(g,[[2,-4],[5,-8],[10,-2],[7,3],[-3,2]],'#494745');
    if(full){rect(g,-5,-7,3,2,'#cfaa7e');rect(g,-7,-3,5,2,'#977357');rect(g,3,0,4,2,'#a68562');}
    else rect(g,-2,-2,4,2,'#28282b');
    g.restore();return;
  }
  crystal(g,x,y,colors[site.grade-1],.85,full);
}

function rubble(g,x,y,shade,highlight){
  polygon(g,[[x-5,y+2],[x-4,y-2],[x+1,y-5],[x+5,y-2],[x+6,y+1],[x+2,y+3]],'#283039');
  polygon(g,[[x-4,y+1],[x-2,y-2],[x+1,y-4],[x+4,y-2],[x+3,y+1]],shade);
  rect(g,x-2,y-3,3,1,highlight);
}

function shore(g,f,x,y,tx,ty,t){
  const palette=t==='~'?water:lava,s=f.seed^(tx*7919+ty*1297);
  rect(g,x,y,24,24,palette[(s>>>3&1)+1]);
  for(let j=0;j<5;j++){
    const dx=(s>>>(j*4))%18,dy=3+(s>>>(j*5))%18;
    rect(g,x+dx,y+dy,3+(s>>>(j*3))%4,1,palette[j%2?0:3]);
  }
  const bank=t==='~'?'#5e8a89':'#ca7658';
  if(f.rows[ty-1]?.[tx]!==t){rect(g,x,y,24,3,palette[0]);rect(g,x+3,y+3,17,1,bank);}
  if(f.rows[ty+1]?.[tx]!==t){rect(g,x,y+21,24,3,palette[0]);rect(g,x+4,y+20,15,1,bank);}
  if(f.rows[ty]?.[tx-1]!==t){rect(g,x,y,3,24,palette[0]);rect(g,x+3,y+4,1,15,bank);}
  if(f.rows[ty]?.[tx+1]!==t){rect(g,x+21,y,3,24,palette[0]);rect(g,x+20,y+4,1,15,bank);}
}
function wall(g,f,x,y,tx,ty,b,s){
  if(f.rows[ty+1]?.[tx]==='#'&&f.rows[ty-1]?.[tx]==='#'&&f.rows[ty]?.[tx-1]==='#'&&f.rows[ty]?.[tx+1]==='#')return;
  rect(g,x,y,24,24,'#222a33');
  const opening=f.rows[ty+1]?.[tx]!=='#',lip=opening?7:12,stagger=s%5;
  polygon(g,[[x,y+lip+stagger],[x+6,y+lip],[x+14,y+lip+3],[x+19,y+lip-2],[x+24,y+lip+2],[x+24,y+24],[x,y+24]],b.wall);
  polygon(g,[[x,y+lip+stagger],[x+6,y+lip],[x+14,y+lip+3],[x+19,y+lip-2],[x+24,y+lip+2],[x+21,y+lip+5],[x+15,y+lip+7],[x+4,y+lip+4]],b.edge);
  if(opening){
    rect(g,x+2,y+18,20,1,dark);rect(g,x+6+s%3,y+13,2,5,b.detail);
    rect(g,x+16,y+20,4,3,'#252d34');rect(g,x,y+23,24,1,'#151d26');
    if(s%9===0)rubble(g,x+15,y+21,b.detail,b.edge);
  }else if(f.rows[ty]?.[tx+1]!=='#')rect(g,x+21,y+11,3,12,b.detail);
}
function bridge(g,x,y,s){
  rect(g,x,y,24,24,'#3d332e');
  for(let i=1;i<23;i+=5){rect(g,x+i,y+1,4,22,i%3?'#a3845d':'#8d714e');rect(g,x+i,y+1,1,22,'#c09b6e');}
  rect(g,x,y+2,24,2,'#605046');rect(g,x,y+20,24,2,'#302a28');
  if(s%2){rect(g,x+2,y,2,5,'#d0ad78');rect(g,x+2,y+18,2,6,'#7b5a40');}
}
export function drawCaveTile(g,f,x,y,px,py){
  const t=f.rows[y]?.[x];
  if(!t)return;
  const b=CAVE_BIOMES[caveBiomeAt(f,x,y)],s=(f.seed^Math.imul(x+1237,73856093)^Math.imul(y+995,19349663))>>>0;
  if(t==='#'){wall(g,f,px,py,x,y,b,s);return;}
  if(t==='~'||t==='!'){shore(g,f,px,py,x,y,t);return;}
  if(t==='='){bridge(g,px,py,s);return;}
  rect(g,px,py,24,24,b.ground);
  if(f.rows[y-1]?.[x]==='#'){
    rect(g,px,py,24,3,b.wall);rect(g,px+2,py+3,18+(s%6),2,b.wall);
  }
  if(t==='r'){
    for(let yy=3;yy<24;yy+=9){
      rect(g,px,py+yy,24,1,dark);rect(g,px+(yy%2?7:16),py+yy,1,7,dark);rect(g,px+2,py+yy+1,15,1,b.detail);
    }
  }else{
    for(let i=0;i<5;i++){
      const ox=2+(s>>>(i*5))%20,oy=2+(s>>>(i*3))%20;
      rect(g,px+ox,py+oy,1+(s>>>(i*4))%3,1,i%3?b.detail:b.wall);
    }
    if(s%13===0){
      rect(g,px+5,py+7,6,1,b.wall);rect(g,px+10,py+7,1,4,b.wall);rect(g,px+10,py+11,7,1,b.wall);
    }
    if(s%17===0)rubble(g,px+11,py+16,b.wall,b.detail);
  }
  if(t==='t'){
    for(let i=2;i<=20;i+=6)rect(g,px+i,py+6,3,13,'#624d42');
    rect(g,px,py+8,24,2,'#9a8c76');rect(g,px,py+16,24,2,'#8f8172');
  }
  if(t===':'){rect(g,px+3,py+11,7,1,'#79644f');rect(g,px+12,py+15,6,1,'#8e7156');}
}

function torch(g,x,y){
  rect(g,x-1,y-11,2,16,'#322b28');rect(g,x-1,y-10,1,14,'#8d5e45');
  polygon(g,[[x-4,y-7],[x-3,y-12],[x,y-15],[x+1,y-12],[x+3,y-13],[x+4,y-8],[x+1,y-5]],'#c9794b');
  rect(g,x-1,y-10,3,3,'#ffda8c');pix(g,x,y-12,'#ffeaaa');
}
function crate(g,x,y){
  rect(g,x-8,y+4,17,3,'#242930');rect(g,x-7,y-6,14,11,'#3c302c');rect(g,x-6,y-5,12,8,'#805c44');
  rect(g,x-4,y-4,9,1,'#bd8c61');rect(g,x-5,y-3,1,5,'#b18155');rect(g,x+3,y-5,1,9,'#4d3d36');
  for(let i=0;i<6;i++)pix(g,x-3+i,y+2-i,'#ad7f57');
}
function support(g,x,y){
  rect(g,x-10,y+2,22,5,'#273036');
  rect(g,x-9,y-18,5,22,'#422f2b');rect(g,x+5,y-18,5,22,'#422f2b');
  rect(g,x-8,y-17,2,19,'#977452');rect(g,x+5,y-17,2,19,'#866249');
  rect(g,x-11,y-21,24,5,'#73513d');rect(g,x-11,y-21,24,1,'#b48962');
  rect(g,x-8,y-16,5,2,'#bf9363');rect(g,x+5,y-16,5,2,'#bc874f');
}
export function portalArt(g,x,y,down){
  polygon(g,[[x-12,y+5],[x-13,y-7],[x-8,y-13],[x+7,y-13],[x+13,y-7],[x+12,y+5]],'#1d2632');
  rect(g,x-11,y-7,3,12,'#877965');rect(g,x+8,y-7,3,12,'#514645');
  for(let i=0;i<5;i++)rect(g,x-7,y-4+i*2,14,1,i%2?'#827257':'#b7a482');
  rect(g,x-8,y-13,16,2,down?'#55b9bb':'#d6a773');
}
export function propArt(g,x,y,p,accent){
  if(p.kind==='crystal'){crystal(g,x,y,accent,1.08);return;}
  if(p.kind==='rubble'){rubble(g,x-3,y+2,'#77675a','#ba9875');rubble(g,x+6,y-1,'#5d5a56','#9c8368');return;}
  if(p.kind==='stalagmite'||p.kind==='ruins'){
    const tall=p.kind==='ruins'?24:19;
    polygon(g,[[x-9,y+4],[x-5,y-8],[x-4,y-tall],[x+2,y-tall-2],[x+5,y-11],[x+8,y+5]],'#252535');
    polygon(g,[[x-7,y+2],[x-4,y-7],[x-2,y-tall],[x+1,y-tall],[x+3,y-9],[x+2,y+3]],'#736985');
    rect(g,x-2,y-11,1,9,'#b7a6bd');
    if(p.kind==='ruins'){rect(g,x-7,y-17,13,3,'#8d7a9b');rect(g,x-1,y-12,2,3,accent);}
    return;
  }
  if(p.kind==='camp'){
    support(g,x-12,y-5);support(g,x+15,y-5);
    polygon(g,[[x-24,y-21],[x-17,y-35],[x+12,y-38],[x+24,y-21],[x+16,y-18],[x-21,y-18]],'#53382f');
    polygon(g,[[x-20,y-23],[x-15,y-33],[x+10,y-35],[x+19,y-23]],'#8c694e');
    rect(g,x-21,y-23,39,2,'#be9465');crate(g,x+11,y+4);crate(g,x+24,y+2);torch(g,x-22,y+1);
    rect(g,x-11,y-1,15,4,'#a48365');rect(g,x-10,y+3,2,4,'#423833');rect(g,x+1,y+3,2,4,'#423833');
    return;
  }
  if(p.kind==='cart'){
    rect(g,x-9,y+5,18,2,'#20242a');rect(g,x-7,y+2,3,5,'#30343b');rect(g,x+4,y+2,3,5,'#30343b');
    polygon(g,[[x-11,y-9],[x+10,y-9],[x+7,y+2],[x-7,y+2]],'#34313a');
    polygon(g,[[x-9,y-7],[x+8,y-7],[x+6,y],[x-6,y]],'#8e7052');rect(g,x-8,y-7,15,2,'#c39667');return;
  }
  if(p.kind==='sign'){
    rect(g,x,y-11,2,15,'#8a674d');rect(g,x-6,y-14,14,6,'#574333');rect(g,x-5,y-13,13,1,'#c39c68');
    rect(g,x-3,y-11,8,1,'#e2bb7b');return;
  }
  if(p.kind==='fungi'){plantArt(g,x,y,6,3);plantArt(g,x+7,y+2,0,2);return;}
  torch(g,x,y);
}
export function plantArt(g,x,y,type,stage){
  if(stage<0){rect(g,x-3,y,6,2,'#2b3434');pix(g,x,y-1,'#897856');return;}
  const color=CAVE_FLORA[type].color,h=4+stage*3;
  rect(g,x-5,y+2,11,2,'#202e33');
  if(type===7){polygon(g,[[x-9,y+2],[x-7,y-2],[x-3,y-3],[x,y-6],[x+6,y-3],[x+8,y+1],[x+3,y+4]],color);rect(g,x-4,y,3,2,'#536447');return;}
  if([0,1,6].includes(type)){
    rect(g,x-1,y-h,3,h+3,'#a5ad90');rect(g,x+1,y-h,1,h+3,'#55746f');
    polygon(g,[[x-h/2-2,y-h+3],[x-h/2,y-h-1],[x-2,y-h-4],[x+3,y-h-4],[x+h/2+1,y-h],[x+h/2+3,y-h+3],[x+4,y-h+5],[x-5,y-h+5]],color);
    rect(g,x-3,y-h-2,5,1,'#efdfb9');rect(g,x-4,y-h+4,9,1,'#48505a');return;
  }
  if(type===5&&stage>=2){
    polygon(g,[[x-8,y+2],[x-4,y-5],[x-2,y-18],[x-5,y-25],[x+1,y-28],[x+5,y-20],[x+3,y-7],[x+8,y+3]],'#706454');
    rect(g,x-3,y-17,2,16,'#ae9164');rect(g,x+1,y-22,2,8,'#413d46');
    polygon(g,[[x-13,y-24],[x-9,y-31],[x-1,y-33],[x+6,y-31],[x+13,y-26],[x+9,y-20],[x,y-18],[x-8,y-20]],color);
    rect(g,x-7,y-30,7,2,'#d1d998');return;
  }
  rect(g,x-1,y-h,2,h+2,'#597d75');
  for(let i=0;i<=stage;i++){
    const yy=y-3-i*3,side=i%2?1:-1;
    polygon(g,[[x,yy+2],[x+side*5,yy-2],[x+side*8,yy-3],[x+side*4,yy+1]],color);
    pix(g,x+side*5,yy-2,'#c5dfc5');
  }
  if(type===4&&stage>=2){rect(g,x-4,y-h,8,3,color);rect(g,x-1,y-h-2,3,6,'#f3daaa');}
}

export function makeCaveChunk(f,cx,cy){
  const p=UG_CHUNK*UG_TILE,canvas=document.createElement('canvas');
  canvas.width=p;canvas.height=p;
  const g=canvas.getContext('2d');
  for(let j=0;j<UG_CHUNK;j++)for(let i=0;i<UG_CHUNK;i++)drawCaveTile(g,f,cx*UG_CHUNK+i,cy*UG_CHUNK+j,i*UG_TILE,j*UG_TILE);
  return canvas;
}
export function makeOverview(f,scale){
  const map=document.createElement('canvas');map.width=f.width*scale;map.height=f.height*scale;
  const g=map.getContext('2d');rect(g,0,0,map.width,map.height,'#141c26');
  for(const [y,row] of f.rows.entries())for(let x=0;x<f.width;x++){
    const t=row[x];
    if(t==='#')continue;
    const b=CAVE_BIOMES[caveBiomeAt(f,x,y)];
    rect(g,x*scale,y*scale,scale,scale,t==='~'?'#3c7184':t==='!'?'#a9584b':t==='='?'#8f795d':b.ground);
    if(scale>1){
      const px=x*scale,py=y*scale,seed=(f.seed^Math.imul(x+81,2654435761)^Math.imul(y+17,1597334677))>>>0;
      if(f.rows[y-1]?.[x]==='#'){rect(g,px,py,scale,2,b.edge);rect(g,px+1,py+2,scale-1,1,b.wall);}
      else if(t==='~'||t==='!')rect(g,px+seed%3,py+(seed>>>6)%scale,2,1,t==='~'?'#4e8292':'#be6951');
      else if(t==='='){rect(g,px,py+1,scale,1,'#b09b77');rect(g,px+2,py+3,1,2,'#584f4b');}
      else if(seed%3===0){rect(g,px+seed%scale,py+(seed>>>4)%scale,1,1,b.detail);if(seed%9===0)rect(g,px,py+scale-2,2,1,b.wall);}
    }
  }
  return map;
}

import fs from 'node:fs';
import {PNG} from 'pngjs';

const size=48;
const atlas=new PNG({width:size*9,height:size});
const palette={edge:'#182938',steel:'#6391a1',white:'#d9ede7',shade:'#375a6c',
  gold:'#c8a76b',grip:'#644139',jade:'#55c6ad',light:'#adf2ce',qi:'#3c9d85',fade:'#397d7755'};
function pixel(frame,x,y,color){
  const number=palette[color].slice(1);
  const channels=number.match(/../g).map(hex=>Number.parseInt(hex,16));
  const p=(y*atlas.width+frame*size+x)*4;
  for(let i=0;i<4;i++)atlas.data[p+i]=channels[i]??255;
}
for(let f=0;f<8;f++){
  const dir=f%4,ethereal=f>=4;
  const coordinates=(x,y)=>dir===0?[24-y,23+x]:dir===1?[23-x,24-y]:dir===2?[24+y,23-x]:[23+x,24+y];
  const set=(x,y,color)=>pixel(f,...coordinates(x,y),color);
  for(let x=-19;x<=20;x++){
    const half=x>14?Math.max(0,Math.ceil((20-x)/2)):x<-7?1:3;
    for(let y=-half;y<=half;y++){
      const rim=Math.abs(y)===half||x===-19||x===20;
      const guard=x===-7||x===-8;
      const color=guard?'gold':rim?(ethereal?'qi':'edge'):x<-8?'grip':
        ethereal?(y<0?'light':'jade'):y<0?'white':y===0?'steel':'shade';
      set(x,y,color);
    }
    if(x>0&&x%6===1){set(x,-4,'fade');set(x,4,'fade');}
  }
  for(const y of [-5,-4,4,5]){set(-8,y,'gold');set(-7,y,y%2?'edge':'gold');}
  set(-16,-1,'gold');set(-11,-1,'gold');set(-3,0,'jade');set(0,0,'white');set(4,0,ethereal?'white':'jade');
}
for(let r=0;r<19;r++){
  pixel(8,24,17+r,r<6?'light':'jade');
  if(r%3!==0)pixel(8,23,20+r,'fade');
  if(r%4===1)pixel(8,27,19+r,'fade');
}
fs.mkdirSync('public/assets/effects',{recursive:true});
fs.writeFileSync('public/assets/effects/flying-swords.png',PNG.sync.write(atlas));

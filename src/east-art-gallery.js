import { EAST_SPECIES } from './dao/EastFauna.ts';
import { EAST_CREATURE_ANCHOR, EAST_CREATURE_SCALE, EAST_CREATURE_SIZE, EAST_POSE_ROWS } from './world/EastCreatureArt.js';
import { waterFlowFrame } from './world/WaterFlowFrame.js';
import './world/east-art-gallery.css';

const root='/assets/east-wilds/';
const load=async path=>{
  const image=new Image();
  image.src=path;
  await image.decode();
  return image;
};
const select=(id,choices)=>{
  const control=document.getElementById(id);
  for(const [value,label] of choices)control.append(new Option(label,value));
  return control;
};
const facing=select('direction',[[0,'Nam'],[1,'Tây'],[2,'Đông'],[3,'Bắc']]);
facing.value='2';
const names={
  idle:'Đứng yên',move:'Di chuyển',windup:'Chuẩn bị',active:'Đánh chính',recover:'Thu thế',
  hurt:'Trúng đòn',death:'Tử vong',skill:'Thi triển',disguise:'Ngụy trang / thức tỉnh',
  run:'Chạy / lao tới',secondary:'Đòn phụ',special:'Kỹ năng đặc trưng',
};
const pose=select('pose',Object.keys(EAST_POSE_ROWS).map(key=>[key,names[key]]));
const scale=select('scale',[['game','Trong game'],['1','1×'],['2','2×'],['4','4×']]);
const scrub=document.querySelector('#frame'),button=document.querySelector('#play');
const disguises=new Set(['bone-skeleton','bone-general','sand-golem','sand-worm']);
let running=true,epoch=performance.now();
button.onclick=()=>{
  running=!running;
  button.setAttribute('aria-pressed',String(running));
  button.textContent=running?'Tạm dừng':'Tiếp tục';
  if(running)epoch=performance.now()-Number(scrub.value)*180;
};
scrub.oninput=()=>{
  if(running)button.click();
};
const caption=(tag,text)=>{
  const el=document.createElement(tag);
  el.textContent=text;
  return el;
};
const makeCanvas=(w,h)=>{
  const canvas=document.createElement('canvas');
  canvas.width=w;canvas.height=h;
  return canvas;
};
const draw=(canvas,image,x,y,w,h,left,top,width=w,height=h)=>{
  const ctx=canvas.getContext('2d');
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(image,x,y,w,h,Math.round(left),Math.round(top),Math.round(width),Math.round(height));
};

async function gallery(){
  const npc=await load('/assets/characters/npc-civilian_m-01.png');
  const roster=[...Object.entries(EAST_SPECIES),['wetland-toad',{name:'Bích Độc Thiềm · Bãi ẩm'}]];
  const rows=await Promise.all(roster.map(async([id,spec])=>{
    const wetland=id==='wetland-toad';
    const oldPath=wetland?'/assets/fauna/monster-v2/toad-normal.png':root+id+'-normal.png';
    const [before,after]=await Promise.all([load(oldPath),load(root+'overhaul/'+id+'.png')]);
    const card=document.createElement('article'),pair=document.createElement('div');
    const old=makeCanvas(130,115),next=makeCanvas(130,115);
    card.append(caption('h2',spec.name),pair);
    for(const [canvas,label] of [[old,'Bản cũ'],[next,'Bản mới']]){
      const figure=document.createElement('figure');
      figure.append(canvas,caption('figcaption',label));
      pair.append(figure);
    }
    return {id,card,old,next,before,after,oldWidth:wetland?80:64,oldHeight:wetland?72:64};
  }));

  document.querySelector('#creatures').append(...rows.map(row=>row.card));
  const [terrain,shore,props,treasures,water,motion,landforms]=await Promise.all([
    load(root+'overhaul/terrain.png'),load(root+'overhaul/shore.png'),load(root+'overhaul/props.png'),
    load(root+'overhaul/treasures.png'),load('/assets/tilesets/gfx5b5_water_tiles.png'),
    load('/assets/effects/gfx5b5_water_motion.png'),load(root+'overhaul/landforms.png'),
  ]);
  function sample(container,label,w,h){
    const figure=document.createElement('figure'),canvas=makeCanvas(w,h);
    figure.append(canvas,caption('figcaption',label));
    document.getElementById(container).append(figure);
    return canvas;
  }
  const pond=sample('terrain','Mặt nước · hoạt ảnh dùng trong WorldScene',192,96);
  for(const [i,material] of ['Cát vàng','Cát trắng','Cát đỏ','Đất khô','Cỏ ốc đảo','Gạch cổ','Cát lún','Đường mòn'].entries()){
    const canvas=sample('terrain',material,128,64);
    for(let j=0;j<4;j++)draw(canvas,terrain,j*32,i*32,32,32,j*32,16);
  }
  for(const i of [0,1,2,4,6]){
    const canvas=sample('terrain',i===6?'Cụm cỏ ven nước':'Sườn cồn cát',160,76);
    draw(canvas,landforms,i%4*160,Math.floor(i/4)*96,160,96,0,-14);
  }
  for(const [i,label] of ['Xương rồng','Hồ dương','Liệt dương hoa','Kim sa linh thụ','Thanh nguyệt linh liên','Hoàng sa linh thảo',
    'Thái cổ khô mộc','Địa hỏa linh chi','Thái dương linh quả','Bụi gai','Cỏ khô','Sen đá','Chà là','Núi đỏ','Đá phong hóa',
    'Hài cốt','Tường đổ','Trụ đá','Bia ký','Cửa đá','Tượng vỡ','Giếng','Rương cổ','Trận pháp','Lều','Bến đá','Cụm sen',
    'Chà là non','Hồ dương già','Bụi cỏ hoa','Chà là nghiêng','Cây gai già'].entries()){
    const canvas=sample('props',label,96,96);
    draw(canvas,props,i%8*96,Math.floor(i/8)*96,96,96,0,0);
  }
  for(const [i,label] of ['Thái Dương Linh Quả','Liệt Dương Hoa','Hoàng Sa Linh Thảo','Địa Hỏa Linh Chi','Thanh Nguyệt Linh Liên',
    'Thiên Niên Hồ Dương Mộc','Huyền Sa Tinh','Xích Hỏa Linh Thạch','Bạch Cốt Linh Ngọc','Âm Hồn Thảo'].entries()){
    const canvas=sample('props',label,96,68);
    for(let stage=0;stage<4;stage++)draw(canvas,treasures,i*32,stage*32,32,32,stage%2*32+16,Math.floor(stage/2)*32);
  }
  function redraw(time){
    const state=pose.value,direction=Number(facing.value),factor=scale.value;
    const frame=running?Math.floor((time-epoch)/180)%4:Number(scrub.value);
    if(running)scrub.value=String(frame);
    for(const {id,old,next,before,after,oldWidth,oldHeight} of rows){
      const row=state==='disguise'&&!disguises.has(id)?0:EAST_POSE_ROWS[state];
      const oldRow=row===8&&id==='sand-golem'?0:row===9?1:row>9?3:row;
      const game=factor==='game',zoom=game?.86:Number(factor);
      for(const [canvas,image,scroll,w,h,anchor,mult] of [
        [old,before,oldRow,oldWidth,oldHeight,.82,zoom],
        [next,after,row,EAST_CREATURE_SIZE,EAST_CREATURE_SIZE,EAST_CREATURE_ANCHOR,zoom*(game?EAST_CREATURE_SCALE[id]:1)],
      ]){
        const span=Math.round(112*zoom),width=span+(game?56:12),height=span+20;
        if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
        const basel=Math.round(height*.79),center=Math.round((width-(game?36:0))/2);
        const ctx=canvas.getContext('2d');
        ctx.clearRect(0,0,width,height);
        ctx.fillStyle='#6d6448';ctx.fillRect(4,basel,width-8,1);
          draw(canvas,image,(direction*4+frame)*w,scroll*h,w,h,center-w*mult/2,basel-h*mult*anchor,w*mult,h*mult);
        if(game)draw(canvas,npc,0,0,32,40,width-43,basel-33,27,34);
      }
    }
    const ctx=pond.getContext('2d');
    ctx.clearRect(0,0,192,96);
    for(let i=0;i<18;i++){
      const index=i%6===0||i%6===5?16+i%7:8+i%8;
      draw(pond,water,index%(water.width/32)*32,Math.floor(index/(water.width/32))*32,32,32,i%6*32,Math.floor(i/6)*32);
    }
    for(let i=0;i<3;i++){
      const f=waterFlowFrame(time,185,i*2),columns=motion.width/64;
      draw(pond,motion,f%columns*64,Math.floor(f/columns)*64,64,64,21+i*43,17);
    }
    for(const [mask,x] of [[8,0],[2,160]])draw(pond,shore,mask%4*32,Math.floor(mask/4)*32,32,32,x,32);
    requestAnimationFrame(t=>{if(t-time>=45)redraw(t);else setTimeout(()=>requestAnimationFrame(redraw),45);});
  }
  window.__eastArtReady=true;
  requestAnimationFrame(redraw);
}

gallery().catch(error=>{
  document.querySelector('#creatures').textContent='Không tải được tài nguyên mỹ thuật.';
  throw error;
});

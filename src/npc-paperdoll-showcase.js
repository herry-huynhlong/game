import Phaser from 'phaser';

const base='/assets/npc-paperdoll-lab/';
const sources=['C01','C02','C03'];
const ui={};
for(const id of ['stage','outfit','head','hair','details','direction','motion','frame','frame-value','scale','play','step-back','step-next','sample-title','compose-summary','frame-label','status','show-back','show-front','show-details'])ui[id]=document.getElementById(id);
let sceneRef,playing=new URLSearchParams(location.search).get('pause')!=='1',frame=0,last=0;
const state={outfit:'C01',head:'C01',hair:'C01',details:'C01',direction:0,motion:'idle',scale:4,showBack:true,showFront:true,showDetails:true};
const initialPreset=new URLSearchParams(location.search).get('preset');
const gallery=new URLSearchParams(location.search).get('gallery')==='1';
if(gallery)document.body.dataset.gallery='1';
if(initialPreset==='b')Object.assign(state,{outfit:'C01',head:'C01',hair:'C02',details:'C01'});
if(initialPreset==='c')Object.assign(state,{outfit:'C02',head:'C02',hair:'C01',details:'C02'});
ui.scale.value='4';
const dirs=['Nam','Bắc','Tây','Đông'];

for(const id of ['outfit','head','hair','details']){
  ui[id].innerHTML=sources.map(s=>`<option value="${s}">${s} · nguồn Aseprite</option>`).join('');
  ui[id].value=state[id];
}

class PaperDollScene extends Phaser.Scene{
  constructor(){super('paperdoll')}
  preload(){
    for(const id of sources)for(const part of ['outfit-base','head-base','hair-back','hair-front','details'])this.load.spritesheet(`${id}-${part}`,`${base}${id.toLowerCase()}-${part}.png`,{frameWidth:32,frameHeight:40});
  }
  create(){
    sceneRef=this;
    const g=this.add.graphics();
    const width=gallery?960:480;
    g.fillStyle(0x314a3e,1).fillRect(0,0,width,430);
    for(let y=18;y<430;y+=32)for(let x=10;x<width;x+=32){const v=((x*7+y*11)%5);g.fillStyle(v===0?0x3a5747:v===1?0x344f42:0x314a3e,1).fillRect(x,y,30,30)}
    if(gallery){
      const labels=['Nam','Bắc','Tây','Đông'];
      for(const [row,motion] of ['idle','walk'].entries()){
        const y=row===0?130:325,start=motion==='walk'?16:0;
        this.add.text(480,row===0?14:218,motion==='walk'?'WALK · 4 HƯỚNG':'IDLE · 4 HƯỚNG',{fontFamily:'system-ui',fontSize:'13px',color:'#e4d19b',letterSpacing:2}).setOrigin(.5);
        for(let direction=0;direction<4;direction++){
          const x=120+direction*240,index=start+direction*4;
          for(const [depth,[source,part]] of [['C02','hair-back'],['C01','outfit-base'],['C01','head-base'],['C02','hair-front'],['C01','details']].entries())this.add.sprite(x,y,`${source}-${part}`,index).setScale(3).setDepth(depth+1);
          this.add.text(x,row===0?202:397,labels[direction],{fontFamily:'system-ui',fontSize:'12px',color:'#d5e0d4'}).setOrigin(.5);
        }
      }
      return;
    }
    g.fillStyle(0x263f34,1).fillRoundedRect(105,48,270,320,14);
    g.lineStyle(2,0x557361,.8).strokeRoundedRect(105,48,270,320,14);
    this.add.text(240,68,'PAPER DOLL · LAB',{fontFamily:'system-ui',fontSize:'11px',color:'#a8c1ae',letterSpacing:2}).setOrigin(.5);
    this.pieces={
      back:this.add.sprite(240,224,'C01-hair-back',0),
      base:this.add.sprite(240,224,'C01-outfit-base',0),
      head:this.add.sprite(240,224,'C01-head-base',0),
      front:this.add.sprite(240,224,'C01-hair-front',0),
      details:this.add.sprite(240,224,'C01-details',0),
    };
    for(const [i,key] of ['back','base','head','front','details'].entries())this.pieces[key].setDepth(i+1);
    this.add.text(240,383,'32 × 40 px  ·  Không thay NPC trong game',{fontFamily:'system-ui',fontSize:'11px',color:'#9bb3a3'}).setOrigin(.5);
    this.refresh();
  }
  refresh(){
    if(!this.pieces)return;
    const start=state.motion==='walk'?16:0;
    const index=start+state.direction*4+frame;
    const set=(key,source,part)=>this.pieces[key].setTexture(`${source}-${part}`,index).setScale(state.scale);
    set('back',state.hair,'hair-back');set('base',state.outfit,'outfit-base');set('head',state.head,'head-base');set('front',state.hair,'hair-front');set('details',state.details,'details');
    this.pieces.back.setVisible(state.showBack);this.pieces.front.setVisible(state.showFront);this.pieces.details.setVisible(state.showDetails);
    ui['frame-label'].textContent=`${state.motion==='walk'?'Đi bộ':'Idle'} · ${dirs[state.direction]} · ${frame+1}/4`;
  }
  update(time){if(!playing)return;const interval=state.motion==='walk'?140:240;if(time-last>=interval){last=time;frame=(frame+1)%4;ui.frame.value=String(frame);ui['frame-value'].textContent=String(frame);this.refresh()}}
}

const game=new Phaser.Game({type:Phaser.CANVAS,parent:ui.stage,width:gallery?960:480,height:430,backgroundColor:'#314a3e',pixelArt:true,roundPixels:true,antialias:false,transparent:false,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[PaperDollScene]});
const render=()=>sceneRef?.refresh();
for(const id of ['outfit','head','hair'])ui[id].addEventListener('change',()=>{state[id]=ui[id].value;if(id==='outfit'){state.details=state.outfit;ui.details.value=state.details}render();updateLabels()});
ui.direction.addEventListener('change',()=>{state.direction=Number(ui.direction.value);frame=0;render();syncFrame()});
ui.motion.addEventListener('change',()=>{state.motion=ui.motion.value;frame=0;render();syncFrame()});
ui.scale.addEventListener('change',()=>{state.scale=Number(ui.scale.value);render()});
ui.frame.addEventListener('input',()=>{frame=Number(ui.frame.value);ui['frame-value'].textContent=String(frame);render()});
ui.play.addEventListener('click',()=>{playing=!playing;ui.play.textContent=playing?'Ⅱ Tạm dừng':'▶ Phát';if(playing)last=performance.now()});
ui.play.textContent=playing?'Ⅱ Tạm dừng':'▶ Phát';
ui['step-back'].addEventListener('click',()=>step(-1));ui['step-next'].addEventListener('click',()=>step(1));
ui['show-back'].addEventListener('change',()=>{state.showBack=ui['show-back'].checked;render()});ui['show-front'].addEventListener('change',()=>{state.showFront=ui['show-front'].checked;render()});ui['show-details'].addEventListener('change',()=>{state.showDetails=ui['show-details'].checked;render()});
function step(delta){frame=(frame+delta+4)%4;syncFrame();render()}
function syncFrame(){ui.frame.value=String(frame);ui['frame-value'].textContent=String(frame)}
function updateLabels(){ui['compose-summary'].textContent=`${state.outfit} outfit + ${state.head} head + ${state.hair} hair + ${state.details} detail`}
for(const button of document.querySelectorAll('[data-preset]'))button.addEventListener('click',()=>{
  const preset=button.dataset.preset;
  Object.assign(state,preset==='a'?{outfit:'C01',head:'C01',hair:'C01',details:'C01'}:preset==='b'?{outfit:'C01',head:'C01',hair:'C02',details:'C01'}:{outfit:'C02',head:'C02',hair:'C01',details:'C02'});
  for(const id of ['outfit','head','hair','details'])ui[id].value=state[id];
  ui['sample-title'].textContent=preset==='a'?'Mẫu A · C01 nguyên gốc':preset==='b'?'Mẫu B · chỉ đổi tóc sang C02':'Mẫu C · đổi outfit/head C02, giữ tóc C01';
  frame=0;syncFrame();render();updateLabels();
});
if(initialPreset==='a'||initialPreset==='b'||initialPreset==='c')ui['sample-title'].textContent=initialPreset==='a'?'Mẫu A · C01 nguyên gốc':initialPreset==='b'?'Mẫu B · chỉ đổi tóc sang C02':'Mẫu C · đổi outfit/head C02, giữ tóc C01';
for(const id of ['outfit','head','hair','details'])ui[id].value=state[id];
updateLabels();
ui['status'].textContent='Đã nạp 3 source Aseprite · 5 lớp ghép · frame 32×40 · bản xem trước chỉ đọc.';

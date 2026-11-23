import Phaser from 'phaser';
import {createMovementScenario, MOVEMENT_CASES} from './world/MonsterMovementScenarios.js';
import {drawMonsterRoutes} from './world/MonsterMovementDebug.js';
import {loadMonsterArt, monsterFrame} from './world/MonsterVisuals.js';

const control=id=>document.getElementById(id);
const select=control('case'),seedInput=control('seed'),old=control('baseline'),run=control('run');
for(const {id,label} of MOVEMENT_CASES)select.add(new Option(label,id));

class MovementLab extends Phaser.Scene {
  preload(){
    loadMonsterArt(this);
    this.load.spritesheet('lab-tree','/assets/props/ancient-tree-v2.png',{frameWidth:112,frameHeight:96});
  }
  create(){
    this.ground=this.add.graphics();
    this.routes=this.add.graphics().setDepth(500);
    this.tree=this.add.image(0,0,'lab-tree',11).setOrigin(47/112,83/96).setVisible(false);
    this.target=this.add.rectangle(0,0,13,13,0xf5d395).setStrokeStyle(1,0x161e18);
    this.actors=[];
    for(const input of [select,seedInput,old])input.onchange=()=>this.reset();
    run.onclick=()=>{
      const limit=MOVEMENT_CASES.find(({id})=>this.scenario.id===id).ms;
      if(this.elapsed>=limit)this.reset();
      this.running=!this.running;
      run.textContent=this.running?'Tạm dừng':'Chạy';
    };
    control('step').onclick=()=>this.advance(20);
    control('reset').onclick=()=>this.reset();
    control('export').onclick=()=>{
      const report=this.scenario.report(),url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));
      const link=document.createElement('a');link.href=url;link.download='monster-'+report.id+'-'+this.scenario.seed+'.json';
      link.click();setTimeout(()=>URL.revokeObjectURL(url),500);
    };
    this.reset();
    window.__monsterMovementLab={
      configure:(id,seed=27183,baseline=false)=>{
        select.value=id;seedInput.value=seed;old.checked=baseline;
        this.reset();return this.scenario.report();
      },
      advance:ticks=>this.advance(ticks),
    };
  }
  reset(){
    this.scenario=createMovementScenario(select.value,Number(seedInput.value)||27183,old.checked);
    this.running=false;this.accumulator=0;this.elapsed=0;run.textContent='Chạy';
    for(const {sprite} of this.actors)sprite.destroy();
    this.actors=this.scenario.monsters.map(actor=>({actor,position:{x:actor.x,y:actor.y},
      sprite:this.add.sprite(actor.x,actor.y,'monster-'+actor.species+'-'+actor.rank)
        .setOrigin(.5,.82).setScale(actor.rank==='elite'?1.15:1)}));
    const g=this.ground.clear();
    g.fillStyle(0x2a4136).fillRect(0,0,560,341).fillStyle(0x364f3d).fillRect(10,14,540,313);
    for(let y=21;y<327;y+=13)for(let x=13;x<545;x+=19){
      const shift=(x+y)%11;
      g.fillStyle(shift%3?0x466048:0x677055,.6).fillRect(x+shift,y,2+shift%5,1);
    }
    if(this.scenario.water){
      const {x,y,w,h}=this.scenario.water;
      g.fillStyle(0x4b8c82).fillRect(x-2,y,w+2,h).fillStyle(0x28645f).fillRect(x+3,y,w-3,h);
      for(let j=0;j<h;j+=11)for(let i=8;i<w-8;i+=23)g.fillStyle(0x70b4ad,.38).fillRect(x+i+j%9,y+j,7,1);
    }
    this.tree.setVisible(this.scenario.id==='tree');
    for(const {x,y,w,h} of this.scenario.walls){
      if(this.scenario.id==='tree'){
        this.tree.setPosition(x+w/2,y+h*.65).setDepth(y+h*.65);
        continue;
      }
      g.fillStyle(0x25362d,.8).fillRect(x+4,y+5,w+4,h);
      g.fillStyle(0x555247).fillRect(x,y,w,h).fillStyle(0x8b846a).fillRect(x,y,w,3);
      for(let j=8;j<h;j+=9)g.lineStyle(1,0x6c6655,1).lineBetween(x+1,y+j,x+w-2,y+j);
    }
    this.renderState();
  }
  advance(ticks){
    for(let i=0;i<ticks;i++)this.step();
    return this.renderState();
  }
  step(){
    for(const item of this.actors)Object.assign(item.position,item.actor);
    this.scenario.advance();this.elapsed+=50;
  }
  renderState(){
    const {target}=this.scenario,report=this.scenario.report(),g=this.routes.clear();
    this.target.setVisible(Boolean(target?.alive));
    if(target)this.target.setPosition(target.x,target.y).setDepth(target.y);
    for(const {actor,sprite,position} of this.actors){
      const moving=Math.hypot(actor.x-position.x,actor.y-position.y)>.04;
      const milestone=actor.cast&&this.elapsed-actor.cast.started;
      const pose=actor.cast?(milestone<500?'windup':actor.state==='recover'?'recover':'active'):moving?'move':'idle';
      sprite.setPosition(actor.x,actor.y).setDepth(actor.y).setFrame(monsterFrame(actor.direction??'east',pose,Math.floor(this.elapsed/140)%4));
    }
    if(this.tree.visible){
      const [{x,y,w,h}]=this.scenario.walls;
      g.lineStyle(1,0xe6c88d,.78).strokeRect(x,y,w,h);
    }
    drawMonsterRoutes(g,report.debug.monsters);
    control('report').textContent=[
      'Thời gian '+(report.clock/1000).toFixed(2)+' s',
      'Đến đích '+report.arrived,
      'Kẹt '+report.stuckCount+' lần / '+report.stuckMs+' ms',
      'Tìm tuyến '+report.repaths,
      'Phục hồi '+report.recovered,
      'Bỏ đích '+report.abandoned,
      'Chồng lấn '+report.remainingOverlap,
    ].join(' · ');
    return report;
  }
  update(_time,delta){
    if(!this.running)return;
    this.accumulator+=Math.min(100,delta);
    if(this.accumulator<50)return;
    this.advance(1);this.accumulator-=50;
    if(this.elapsed>=MOVEMENT_CASES.find(({id})=>this.scenario.id===id).ms){
      this.running=false;run.textContent='Chạy lại';
    }
  }
}

new Phaser.Game({type:Phaser.AUTO,parent:'arena',width:560,height:341,pixelArt:true,roundPixels:true,
  scale:{zoom:2},backgroundColor:'#2a4136',scene:MovementLab});

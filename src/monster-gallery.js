import Phaser from 'phaser';
import { FAUNA_IDS, FAUNA_SPECIES, MONSTER_SKILL_IDS, monsterSkill } from './dao/MonsterRegistry.ts';
import { MonsterCombat, monsterFacing, startMonsterSkill } from './dao/MonsterCombat.ts';
import { damageFauna } from './dao/FaunaSystem.ts';
import { loadMonsterArt, MonsterVisuals, monsterFrame, MONSTER_POSES } from './world/MonsterVisuals.js';
import { GroundOccupancy, groundFootprint } from './world/GroundOccupancy.js';

import { MonsterMovement } from './world/MonsterMovement.js';

const control=id=>document.getElementById(id);
const arena=control('arena');
const zone={zoneId:'gallery',species:'wolf',x:5,y:12,width:470,height:255,cap:1,respawnMs:0};
const pillar={x:163,y:149,width:19,height:33};
const itemOptions=(ids,label)=>ids.map(id=>`<option value="${id}">${label(id)}</option>`).join('');
const labels={idle:'Đứng',move:'Đi / nhảy',windup:'Chuẩn bị',active:'Ra đòn',recover:'Thu chiêu',hurt:'Trúng đòn',death:'Gục',skill:'Pose Tinh Anh'};
control('pose').innerHTML=itemOptions(MONSTER_POSES,id=>labels[id]);
class MonsterGallery extends Phaser.Scene {
  preload(){
    loadMonsterArt(this);
    this.load.spritesheet('gallery-hunter','/assets/characters/npc-guard_m-01.png',{frameWidth:32,frameHeight:40});
  }
  create(){
    this.cameras.main.setBackgroundColor('#253b32');
    const ground=this.add.graphics().setDepth(-10);
    for(let row=0;row<20;row++)for(let col=0;col<32;col++){
      const shade=[0x35483b,0x384f3e,0x3c5141,0x354c3f][(row*9+col*7)%4];
      ground.fillStyle(shade).fillRect(col*16,row*16,16,16);
      if((row+col*3)%7===2)ground.fillStyle(0x667052,.55).fillRect(col*16+4,row*16+9,5,1);
    }
    ground.fillStyle(0x29392f,.8).fillEllipse(174,183,36,12);
    ground.fillStyle(0x343e35).fillRect(pillar.x,pillar.y,pillar.width,pillar.height);
    ground.fillStyle(0x7a8070).fillRect(pillar.x-3,pillar.y-6,pillar.width+6,8);
    ground.fillStyle(0x545e4e).fillRect(pillar.x+2,pillar.y+5,pillar.width-4,pillar.height-9);
    this.boxOverlay=this.add.graphics().setDepth(8200);
    this.faunaSprites=new Map();this.faunaMotionStats=new Map();
    this.art=new MonsterVisuals(this);
    this.hunterArt=this.add.sprite(0,0,'gallery-hunter').setOrigin(.5,1);
    this.id='wolf';this.rank='normal';
    for(const id of FAUNA_IDS)for(const rank of ['normal','elite']){
      const button=document.createElement('button');
      const miniature=document.createElement('span');
      miniature.className='monster-thumb';miniature.setAttribute('aria-hidden','true');
      miniature.style.backgroundImage='url(/assets/fauna/monster-v2/'+id+'-'+rank+'.png)';
      button.append(miniature,FAUNA_SPECIES[id].name+' · '+(rank==='elite'?'Tinh Anh':'Thường'));
      button.onclick=()=>{this.id=id;this.rank=rank;this.reset();};
      button.dataset.variant=id+'-'+rank;control('variants').append(button);
    }
    control('preview').onclick=()=>this.preview();
    control('duel').onclick=()=>{this.reset();this.mode='duel';};
    control('reset').onclick=()=>this.reset();
    for(const id of ['frame','pose','direction'])control(id).oninput=()=>{this.mode='pose';if(this.beast)this.beast.cast=undefined;};
    control('zoom').onchange=()=>this.camera();
    this.scale.on('resize',()=>this.camera());
    this.reset();window.__monsterGallery=this;
  }
  inSceneryView(p,margin){
    const v=this.cameras.main.worldView;
    return p.x>=v.x-margin&&p.x<=v.right+margin&&p.y>=v.y-margin&&p.y<=v.bottom+margin;
  }
  camera(){this.cameras.main.setZoom(Number(control('zoom').value)).centerOn(235,131);}
  open(x,y,w=0,h=0){
    return x-w>=12&&x+w<=462&&y-h>=22&&y+h<=258&&
      !(x+w>pillar.x&&x-w<pillar.x+pillar.width&&y+h>pillar.y&&y-h<pillar.y+pillar.height);
  }
  line(a,b){
    const steps=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/4);
    for(let i=1;i<=steps;i++)if(!this.open(a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps))return false;
    return true;
  }
  reset(){
    const hp=FAUNA_SPECIES[this.id].hp+(this.rank==='elite'?55:0);
    this.beast={id:'arena-beast',species:this.id,rank:this.rank,x:227,y:130,home:{x:227,y:130},hp,maxHp:hp,alive:true,state:'idle',
      zoneId:'gallery',nextThinkAt:0,attackReadyAt:0,lootCreated:false,direction:'east'};
    this.hunter={id:'arena-hunter',name:'Thợ săn Thanh Vân',x:311,y:134,alive:true,hp:135,inventory:[]};
    this.environment={fauna:[this.beast],objects:[],drops:[],defeatedBeastIds:[],processedEventIds:[],faunaClockMs:0,monsterHazards:[],monsterProjectiles:[]};
    this.world={worldId:'monster-arena',clock:{day:1,minute:600},npcs:[this.hunter],environment:this.environment};
    this.grid=new GroundOccupancy((x,y,w,h)=>this.open(x,y,w,h));
    this.grid.sync([this.hunter],[this.beast]);
    this.movement=new MonsterMovement(this.grid,[zone]);
    this.mode='pose';this.elapsed=0;this.accum=0;this.hunterReady=900;
    const old=this.faunaSprites.get(this.beast.id);old?.destroy();
    this.faunaSprites.set(this.beast.id,this.add.sprite(227,130,'monster-'+this.id+'-'+this.rank).setOrigin(.5,.82).setScale(this.rank==='elite'?1.15:1));
    this.hunterArt.setPosition(this.hunter.x,this.hunter.y).setVisible(false);
    this.combat=new MonsterCombat(this.environment,[zone],{
      movement:this.movement,
      targets:(p,r)=>this.hunter.alive&&Math.hypot(p.x-this.hunter.x,p.y-this.hunter.y)<=r?[this.hunter]:[],
      move:(f,p,avoid)=>this.move(f,p,avoid),open:(f,p)=>this.grid.open(this.grid.bodies.get(f.id),p.x,p.y),
      line:(a,b)=>this.line(a,b),safe:()=>false,
      damage:(n,amount)=>{n.hp=Math.max(0,n.hp-Math.max(1,amount-2));n.alive=n.hp>0;},
      avoid:()=>{},threat:()=>false,sound:(id,pos)=>this.art.sound(id,pos),
    });
    const available=MONSTER_SKILL_IDS.filter(id=>monsterSkill(id).species===this.id&&(!monsterSkill(id).elite||this.rank==='elite'));
    control('skill').innerHTML=itemOptions(available,id=>monsterSkill(id).name);
    for(const button of control('variants').children)button.setAttribute('aria-pressed',String(button.dataset.variant===this.id+'-'+this.rank));
    this.camera();
  }
  move(actor,goal,avoid){
    const body=this.grid.bodies.get(actor.id);
    const point=body&&this.grid.advance(body,goal.x,goal.y,avoid);
    this.faunaMotionStats.set(actor.id,{moving:Boolean(point)});
    if(!point)return false;
    Object.assign(actor,point);return true;
  }
  preview(){
    const id=control('skill').value,direction=control('direction').value;
    this.reset();control('skill').value=id;
    const rule=monsterSkill(id),d=rule.mode==='contact'?rule.max-4:rule.mode==='tongue'?rule.max-14:Math.min(rule.max,(rule.min+rule.max)/2);
    const delta={south:[0,d],north:[0,-d],west:[-d,0],east:[d,0]}[direction];
    const beast=this.beast;
    // Center the preview so long north/south casts remain within the arena.
    const point={x:235+(direction==='west'?35:direction==='east'?-35:0),y:135+(direction==='south'?-42:direction==='north'?42:0)};
    Object.assign(beast,point,{home:point,nextThinkAt:10000});
    Object.assign(this.hunter,{x:point.x+delta[0],y:point.y+delta[1]});
    this.grid.sync([this.hunter],[beast]);
    this.mode='preview';this.hunterArt.setVisible(true);
    startMonsterSkill(beast,id,this.hunter,0);
  }
  step(){
    this.elapsed+=50;this.environment.faunaClockMs=this.elapsed;
    this.grid.sync([this.hunter],[this.beast]);
    this.combat.tick(this.elapsed,50);
    const {hunter,beast}=this;
    const {x,y}=this.movement.state(beast).velocity;
    this.faunaMotionStats.set(beast.id,{moving:Math.hypot(x,y)>.4});
    if(this.mode==='duel'&&hunter.alive&&beast.alive){
      const d=Math.hypot(hunter.x-beast.x,hunter.y-beast.y);
      if(d>45){
        const factor=Math.min(1,4.4/d);
        this.move(hunter,{x:hunter.x+(beast.x-hunter.x)*factor,y:hunter.y+(beast.y-hunter.y)*factor},true);
      }else if(this.elapsed>=this.hunterReady&&this.line(hunter,beast)){
        this.hunterReady=this.elapsed+1350;
        this.hunterFacing=monsterFacing(hunter,beast);
        damageFauna(this.world,beast.id,hunter.id,20,'arena:'+this.elapsed);
        this.hunterArt.setTint(0xf5d39a);
      }
    }
  }
  update(_time,delta){
    if(!this.beast)return;
    const {beast,hunter}=this,sprite=this.faunaSprites.get(beast.id);
    this.hunterArt.setVisible(this.mode!=='pose').setPosition(hunter.x,hunter.y).setDepth(hunter.y);
    if(this.mode==='pose'){
      this.art.fx.clear();
      for(const effect of [...this.art.sparkPool,...this.art.trailPool])effect.setVisible(false);
      if(control('play').checked)control('frame').value=String(Math.floor(_time/145)%4);
      sprite.setPosition(beast.x,beast.y).setFrame(monsterFrame(control('direction').value,control('pose').value,Number(control('frame').value)));
    }else{
      this.accum+=Math.min(100,delta);
      while(this.accum>=50){this.accum-=50;this.step();}
      this.art.update(this.environment,this.elapsed);
    }
    if(this.elapsed%1350>160)this.hunterArt.clearTint();
    this.boxOverlay.clear();
    if(control('collision').checked){
      for(const actor of this.mode==='pose'?[beast]:[beast,hunter]){
        const {width,height}=groundFootprint(actor);this.boxOverlay.lineStyle(1,0x96d8b4,.9).strokeRect(actor.x-width/2,actor.y-height/2,width,height);
      }
    }
    const size=groundFootprint(beast),hp=`${beast.hp}/${beast.maxHp} HP`,name=FAUNA_SPECIES[beast.species].name;
    const text=`${name} · ${beast.rank==='elite'?'Tinh Anh':'Thường'} · ${hp} · vùng chân ${size.width}×${size.height} px`+
      (this.mode!=='pose'?` · Thợ săn ${hunter.hp} HP · ${monsterSkill(beast.cast?.skillId)?.name??beast.state}`:'');
    if(control('status').value!==text)control('status').value=text;
  }
}
new Phaser.Game({type:Phaser.WEBGL,parent:'arena',width:arena.clientWidth,height:arena.clientHeight,
  pixelArt:true,roundPixels:true,scene:MonsterGallery,scale:{mode:Phaser.Scale.RESIZE}});

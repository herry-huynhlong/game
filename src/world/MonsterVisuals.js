import { FAUNA_IDS, monsterSkill } from '../dao/MonsterRegistry.ts';
import { monsterMouth, skillPhase } from '../dao/MonsterCombat.ts';

export const MONSTER_POSES=['idle','move','windup','active','recover','hurt','death','skill'];
export const MONSTER_DIRECTIONS=['south','west','east','north'];
export const LOOT_ICON={wolf_fang:0,wolf_pelt:1,boar_tusk:2,crimson_plate:3,toad_sac:4,jade_venom:5,demon_core:6,elite_beast_core:7};
const GLOW={wolf:0xa7e8ca,boar:0xef9968,toad:0xbb9bda};
const clockFrame=(now,ms)=>Math.floor(now/ms)%4;
export function loadMonsterArt(scene){
  for(const id of FAUNA_IDS)for(const rank of ['normal','elite']){
    const key=id+'-'+rank;
    scene.load.spritesheet('monster-'+key,'/assets/fauna/monster-v2/'+key+'.png',{frameWidth:80,frameHeight:72});
  }
  scene.load.spritesheet('monster-loot','/assets/fauna/monster-v2/monster-loot.png',{frameWidth:16,frameHeight:16});
  scene.load.spritesheet('monster-fx','/assets/fauna/monster-v2/monster-fx.png',{frameWidth:16,frameHeight:16});
}
export function monsterFrame(direction,pose,frame){
  return MONSTER_POSES.indexOf(pose)*16+Math.max(0,MONSTER_DIRECTIONS.indexOf(direction))*4+frame;
}
function paintRing(g,x,y,r,color,alpha){
  g.lineStyle(1,color,alpha).strokeCircle(x,y,r);
  for(let j=0;j<8;j++){
    const a=j*Math.PI/4;
    g.fillStyle(color,alpha).fillRect(Math.round(x+Math.cos(a)*r)-1,Math.round(y+Math.sin(a)*r)-1,3,3);
  }
}
export class MonsterVisuals{
  constructor(scene){
    this.scene=scene;
    this.fx=scene.add.graphics().setDepth(8100);
    this.sparkPool=[];
    this.trailPool=[];
    this.soundAt=0;
  }
  sound(id,point){
    const context=this.scene.sound?.context;
    if(!context||context.state!=='running'||this.scene.sound.mute||!this.scene.inSceneryView(point,10)||context.currentTime<this.soundAt)return;
    const now=context.currentTime,osc=context.createOscillator(),gain=context.createGain();
    this.soundAt=now+.09;
    const skill=monsterSkill(id),soft=['mist','tongue','projectile'].includes(skill.mode);
    osc.type=soft?'triangle':'sawtooth';
    osc.frequency.setValueAtTime(soft?270:skill.mode==='roar'?114:163,now);
    osc.frequency.exponentialRampToValueAtTime(soft?96:49,now+.17);
    gain.gain.setValueAtTime(.032*this.scene.sound.volume,now);
    gain.gain.exponentialRampToValueAtTime(.001,now+.18);
    osc.connect(gain).connect(context.destination);osc.start();osc.stop(now+.19);
    osc.onended=()=>{osc.disconnect();gain.disconnect();};
  }
  update(environment,now){
    const s=this.scene,g=this.fx;
    g.clear();
    let sparks=0,trailCount=0;
    const spark=(x,y,frame,alpha=1)=>{
      const image=this.sparkPool[sparks]??(this.sparkPool[sparks]=s.add.image(x,y,'monster-fx').setDepth(8101));
      sparks++;image.setPosition(x,y).setFrame(frame).setAlpha(alpha).setVisible(true);
    };
    for(const f of environment.fauna??[]){
      const sprite=s.faunaSprites.get(f.id);
      if(!sprite?.visible)continue;
      const cast=f.cast,skill=cast&&monsterSkill(cast.skillId),phase=skill&&skillPhase(cast.started,now,skill);
      let pose=f.alive?'idle':'death',frame=clockFrame(now,320),lift=0;
      if(!f.alive)frame=Math.min(3,Math.floor(Math.max(0,now-(f.deathAt??now))/135));
      else if(skill){
        const age=now-cast.started;
        pose=phase==='windup'?'windup':phase==='recover'?'recover':skill.elite?'skill':'active';
        const start=phase==='windup'?0:phase==='recover'?skill.windup+skill.active:skill.windup;
        const length=phase==='windup'?skill.windup:phase==='recover'?skill.recover:skill.active;
        frame=Math.max(0,Math.min(3,Math.floor((age-start)/length*4)));
        if(skill.mode==='leap'&&phase==='active'&&!cast.stopped)lift=26*Math.sin(Math.PI*(age-start)/length);
        this.paintCast(g,f,cast,skill,phase,now,spark);
        if(cast.skillId==='phantom-pounce'&&phase==='active'){
          for(const t of [.27,.61]){
            const trace=this.trailPool[trailCount]??(this.trailPool[trailCount]=s.add.image(0,0,sprite.texture.key).setOrigin(.5,.82));
            trailCount++;
            trace.setTexture(sprite.texture.key,monsterFrame(f.direction,'active',2))
              .setPosition(cast.origin.x+(f.x-cast.origin.x)*t,cast.origin.y+(f.y-cast.origin.y)*t)
              .setDepth(f.y-1).setAlpha(t*.56).setTint(0x69bda4).setScale(sprite.scaleX).setVisible(true);
          }
        }
      }else if(f.state==='hit'){pose='hurt';frame=2;}
      else if(['patrol','chase','retreat','return'].includes(f.state)&&s.faunaMotionStats?.get(f.id)?.moving){pose='move';frame=clockFrame(now,f.species==='boar'?135:105);}
      else if(f.state==='alert'||f.state==='detect'){pose='windup';frame=0;}
      if(sprite.x!==f.x||sprite.y!==f.y-lift)sprite.setPosition(f.x,f.y-lift);
      if(sprite.depth!==f.y)sprite.setDepth(f.y);
      const frameIndex=monsterFrame(f.direction??'south',pose,frame);
      if(Number(sprite.frame.name)!==frameIndex)sprite.setFrame(frameIndex);
      if(!f.alive)continue;
      const buff=now<(f.armorUntil??0)||now<(f.buffUntil??0);
      const tint=buff?(f.species==='boar'?0xff9290:0xa4f0d4):f.state==='hit'?0xffd2bc:0xffffff;
      if(sprite.tint!==tint)sprite.setTint(tint);
      if(f.rank==='elite'||f.hp<f.maxHp||s.selectedFaunaId===f.id){
        const top=f.y-43-lift;
        g.fillStyle(0x22231d,1).fillRect(f.x-14,top,28,4);
        g.fillStyle(f.rank==='elite'?0xe7bc63:0xad6151,1).fillRect(f.x-13,top+1,Math.round(26*f.hp/f.maxHp),2);
        if(f.rank==='elite')spark(f.x,top-7,5);
      }
    }
    for(const p of environment.monsterProjectiles??[])if(s.inSceneryView(p.position,10))spark(p.position.x,p.position.y-15,4);
    for(const h of environment.monsterHazards??[]){
      if(!s.inSceneryView(h.position,60))continue;
      const {x,y}=h.position;
      g.fillStyle(0x70855d,.17).fillCircle(x,y,h.radius);
      paintRing(g,x,y,h.radius,0xb5cc89,.52);
      for(let i=0;i<6;i++){
        const a=i*2.39+now/1700;
        spark(x+Math.cos(a)*h.radius*.67,y+Math.sin(a)*h.radius*.67,i%2?3:4,.42);
      }
    }
    for(let i=sparks;i<this.sparkPool.length;i++)this.sparkPool[i].setVisible(false);
    for(let i=trailCount;i<this.trailPool.length;i++)this.trailPool[i].setVisible(false);
  }
  paintCast(g,f,cast,skill,phase,now,spark){
    const color=GLOW[f.species],origin=cast.origin,aim=cast.aim,age=now-cast.started-skill.windup;
    if(phase==='windup'){
      if(['area','mist','leap','roar'].includes(skill.mode)){
        const p=['mist','leap'].includes(skill.mode)?aim:origin;
        paintRing(g,p.x,p.y,skill.radius,color,.8);
      }else if(skill.mode!=='armor'){
        g.lineStyle(2,color,.56);
        for(let i=0;i<6;i+=2)g.lineBetween(origin.x+(aim.x-origin.x)*i/6,origin.y+(aim.y-origin.y)*i/6,origin.x+(aim.x-origin.x)*(i+1)/6,origin.y+(aim.y-origin.y)*(i+1)/6);
      }
      return;
    }
    if(skill.mode==='tongue'&&phase==='active'){
      const start=monsterMouth(f,aim),t=Math.max(0,Math.min(1,age/(skill.active*.48),(skill.active-age)/(skill.active*.28)));
      const x=f.x+(aim.x-f.x)*t,y=f.y+(aim.y-f.y)*t;
      g.lineStyle(4,0x6d395e,.9).lineBetween(start.x,start.y-13,x,y-13);
      g.lineStyle(1,0xe3aad1,1).lineBetween(start.x,start.y-13,x,y-13);
      spark(x,y-13,3,.76);
    }else if(skill.mode==='dash'&&phase==='active'){
      for(let i=1;i<=3;i++)spark(f.x+(origin.x-f.x)*i*.22,f.y+(origin.y-f.y)*i*.22,i%2?1:7,.6/i);
      g.lineStyle(1,color,.45).lineBetween(origin.x,origin.y,f.x,f.y);
    }else if(['roar','area'].includes(skill.mode)||skill.mode==='leap'&&phase==='recover'){
      const radius=Math.min(skill.radius,12+age*.16);
      paintRing(g,f.x,f.y,radius,color,.67);
      spark(f.x,f.y,skill.mode==='roar'?7:2,.8);
    }else if(phase==='active')spark(f.x,f.y-10,skill.mode==='armor'?6:0,.78);
  }
}

import { BASE_FAUNA_IDS, FAUNA_IDS, monsterSkill } from '../dao/MonsterRegistry.ts';
import { EAST_CREATURE_SIZE, EAST_CREATURE_ANCHOR, EAST_POSE_ROWS, eastCreatureKey, eastSkillPose } from './EastCreatureArt.js';
import { eastDisguise, isEastSpecies } from '../dao/EastFauna.ts';
export { WEST_FAUNA_LOOT as WEST_LOOT } from '../dao/MonsterRegistry.ts';
import { monsterMouth, skillPhase } from '../dao/MonsterCombat.ts';
import { faunaStationaryForm, FLOWER_WAKE_MS, FLOWER_RESTORE_MS } from '../dao/FaunaRecovery.ts';

export const MONSTER_POSES=['idle','move','windup','active','recover','hurt','death','skill'];
export const MONSTER_DIRECTIONS=['south','west','east','north'];
export const LOOT_ICON={wolf_fang:0,wolf_pelt:1,boar_tusk:2,crimson_plate:3,toad_sac:4,jade_venom:5,demon_core:6,elite_beast_core:7};
const GLOW={wolf:0xa7e8ca,boar:0xef9968,toad:0xbb9bda,wood:0xb4d288,millennial:0xa1e1a2,flower:0xe4a1dc,
  vine:0xdc8889,centipede:0xca9c8b,eagle:0x9fda9e,stag:0xc6edd5,'wood-king':0x8de4cc};
const ELEMENT={wood:0x8cc78e,poison:0xb2b96a,blood:0xc36b80,earth:0xc69a73,wind:0xa8d9de,fire:0xf49745};
export function monsterArtKey(beast){
  const east=eastCreatureKey(beast),{species,rank}=beast;
  return east?'monster-east-'+east:'monster-'+species+'-'+(BASE_FAUNA_IDS.includes(species)||['millennial','eagle'].includes(species)?rank:'normal');
}
const clockFrame=(now,ms)=>Math.floor(now/ms)%4;
export function loadMonsterArt(scene){
  for(const id of FAUNA_IDS)for(const rank of BASE_FAUNA_IDS.includes(id)||['millennial','eagle'].includes(id)?['normal','elite']:['normal']){
    const key=id+'-'+rank;
    const old=BASE_FAUNA_IDS.includes(id);
    if(isEastSpecies(id))continue;
    scene.load.spritesheet('monster-'+key,(old?'/assets/fauna/monster-v2/':'/assets/west-wilds/')+key+'.png',
      {frameWidth:old?80:112,frameHeight:old?72:112});
  }
  for(const id of [...FAUNA_IDS.filter(isEastSpecies),'wetland-toad'])
    scene.load.spritesheet('monster-east-'+id,'/assets/east-wilds/overhaul/'+id+'.png',
      {frameWidth:EAST_CREATURE_SIZE,frameHeight:EAST_CREATURE_SIZE});
  scene.load.spritesheet('west-grove','/assets/west-wilds/ancient-grove.png',{frameWidth:176,frameHeight:176});
  scene.load.spritesheet('living-grove','/assets/west-wilds/living-grove.png',{frameWidth:176,frameHeight:176});
  scene.load.spritesheet('living-floor','/assets/west-wilds/living-floor.png',{frameWidth:48,frameHeight:48});
  scene.load.spritesheet('monster-flower-forms','/assets/west-wilds/flower-forms.png',{frameWidth:112,frameHeight:112});
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
      const east=eastCreatureKey(f);
      if(f.alive&&f.species==='sand-golem'){
        const moving=s.faunaMotionStats?.get(f.id)?.moving;
        const calm=!moving&&!f.cast&&!f.targetNpcId&&(f.state==='idle'||f.state==='sleep');
        const wanted=calm?0:1;
        let previous=sprite.getData('golemPose');
        if(!previous){
          previous={target:wanted,from:wanted,at:now};
          sprite.setData('golemPose',previous);
        }
        const progress=Math.min(1,(now-previous.at)/520);
        const amount=previous.from+(previous.target-previous.from)*progress;
        if(previous.target!==wanted)sprite.setData('golemPose',{target:wanted,from:amount,at:now});
        if(!f.cast&&f.state!=='hit'&&amount<1){
          const frame=EAST_POSE_ROWS.disguise*16+Math.max(0,MONSTER_DIRECTIONS.indexOf(f.direction))*4+Math.floor(amount*4);
          if(Number(sprite.frame.name)!==frame)sprite.setFrame(frame);
          sprite.setPosition(f.x,f.y).setDepth(f.y).setAlpha(1).setTint(0xffffff);
          continue;
        }
      }
      if(f.alive&&eastDisguise(f.species)&&(faunaStationaryForm(f)||f.growth?.phase==='waking'||f.recovery?.phase==='restoring')){
        const art=monsterArtKey(f),reforming=f.growth?.phase==='waking',sinking=f.recovery?.phase==='restoring';
        const part=reforming?Math.min(3,Math.max(0,4-Math.ceil(((f.growth.wakeAt??now)-now)/280))):
          sinking?Math.max(0,3-Math.floor((now-f.recovery.at)/225)):0;
        const index=128+Math.max(0,MONSTER_DIRECTIONS.indexOf(f.direction))*4+part;
        if(sprite.texture.key!==art)sprite.setTexture(art,index);
        else if(Number(sprite.frame.name)!==index)sprite.setFrame(index);
        sprite.setPosition(f.x,f.y).setDepth(f.y).setAlpha(1).setTint(0xffffff);
        if(part&&now%210<100)spark(f.x+(part%2?12:-12),f.y-6,7,.65);
        continue;
      }
      const form=f.flower,flowerRow={rooted:0,alert:1,waking:2,rooting:3}[form?.phase??'rooted'];
      if(f.alive&&f.species==='flower'&&flowerRow!==undefined&&!f.cast){
        const span=form?.phase==='waking'?FLOWER_WAKE_MS:FLOWER_RESTORE_MS;
        const frame=flowerRow>=2?Math.min(3,Math.floor(Math.max(0,now-form.at)/span*4)):clockFrame(now,330);
        const index=flowerRow*16+Math.max(0,MONSTER_DIRECTIONS.indexOf(f.direction))*4+frame;
        if(sprite.texture.key!=='monster-flower-forms')sprite.setTexture('monster-flower-forms',index).setOrigin(.5,.82);
        else if(Number(sprite.frame.name)!==index)sprite.setFrame(index);
        sprite.setPosition(f.x,f.y).setDepth(f.y).setAlpha(1).setTint(0xffffff);
        if(flowerRow===2&&frame>=1)spark(f.x+(frame%2?11:-11),f.y-3,7,.7);
        if(flowerRow===0&&now%800<230&&f.hp<f.maxHp&&s.recovery?.status(f).rate>0)
          spark(f.x+(frame%2?8:-8),f.y-5-frame*2,6,.46);
        continue;
      }
      const disguised=f.alive&&faunaStationaryForm(f)&&(f.growth||f.species==='vine');
      if(disguised){
        const tree=f.species==='wood-king'?5:f.species==='millennial'?1:0;
        const art=f.species==='vine'?'habitat-accents':'west-grove';
        if(sprite.texture.key!==art)sprite.setTexture(art,f.species==='vine'?7:tree).setOrigin(.5,.89);
        if(sprite.x!==f.x||sprite.y!==f.y)sprite.setPosition(f.x,f.y).setDepth(f.y);
        sprite.setAlpha(1).setTint(0xffffff);
        if(f.growth?.phase==='spirit'&&now%1200<380)spark(f.x,f.y-29,7,.47);
        continue;
      }
      const art=monsterArtKey(f);
      if(sprite.texture.key!==art)sprite.setTexture(art).setOrigin(.5,east?EAST_CREATURE_ANCHOR:.82);
      const cast=f.cast,skill=cast&&monsterSkill(cast.skillId),phase=skill&&skillPhase(cast.started,now,skill);
      const opacity=skill?.mode==='burrow'&&phase==='active'?.16:1;
      if(sprite.alpha!==opacity)sprite.setAlpha(opacity);
      let pose=f.alive?'idle':'death',frame=clockFrame(now,320),lift=0;
      if(!f.alive)frame=Math.min(3,Math.floor(Math.max(0,now-(f.deathAt??now))/135));
      else if(skill){
        const age=now-cast.started;
        pose=phase==='windup'?'windup':phase==='recover'?'recover':east?eastSkillPose(cast.skillId):skill.elite?'skill':'active';
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
      }else if(f.state==='hit'){pose='hurt';frame=east?Math.max(0,Math.min(3,4-Math.ceil(((f.hurtUntil??now)-now)/60))):2;}
      else if(f.recovery?.phase==='restoring'){
        const progress=Math.min(1,(now-f.recovery.at)/900);
        pose='recover';frame=Math.floor(progress*3);lift=-Math.round(progress*8);
        if(now%250<130)spark(f.x+(frame-1)*12,f.y-4,7,.46);
      }
      else if(f.state==='awakening'){
        const left=Math.max(0,(f.growth?.wakeAt??now)-now);
        pose='windup';frame=clockFrame(now,80);lift=Math.round(Math.sin(now/38)*Math.min(4,left/210));
        if(now%230<120)spark(f.x+((frame-1)*13),f.y-7,7,.82);
      }
      else if(f.state==='sleep'){frame=0;if(f.species==='boar'){pose='recover';frame=3;lift=-3;}}
      else if(['patrol','chase','retreat','return'].includes(f.state)&&s.faunaMotionStats?.get(f.id)?.moving){
        pose=east&&f.state==='chase'?'run':'move';
        frame=clockFrame(now,f.species==='sand-golem'?150:f.species==='boar'?135:east&&pose==='run'?82:105);
        if(f.species==='toad'&&!east)lift=[0,5,8,3][frame];
      }
      else if(f.state==='alert'||f.state==='detect'){pose='windup';frame=0;}
      if(f.alive&&f.species==='eagle'){
        lift+=Math.round(f.altitude??0);
        g.fillStyle(0x18292b,Math.max(.13,.33-lift/230)).fillEllipse(f.x+5,f.y+2,Math.max(15,36-lift/3),8);
        if(!skill&&lift>12){pose='move';frame=clockFrame(now,95);}
      }
      if(sprite.x!==f.x||sprite.y!==f.y-lift)sprite.setPosition(f.x,f.y-lift);
      if(sprite.depth!==f.y)sprite.setDepth(f.y);
      const frameIndex=east?EAST_POSE_ROWS[pose]*16+Math.max(0,MONSTER_DIRECTIONS.indexOf(f.direction))*4+frame:
        monsterFrame(f.direction??'south',pose,frame);
      if(Number(sprite.frame.name)!==frameIndex)sprite.setFrame(frameIndex);
      if(!f.alive)continue;
      const buff=now<(f.armorUntil??0)||now<(f.buffUntil??0);
      const regionalTint=BASE_FAUNA_IDS.includes(f.species)?[0xc6edb5,0xd8b5a3,0xc9b4e5,0xd4bef5][f.realmIndex]??0xffffff:0xffffff;
      const tint=buff?(f.species==='boar'?0xff9290:0xa4f0d4):f.state==='hit'?0xffd2bc:regionalTint;
      if(sprite.tint!==tint)sprite.setTint(tint);
      if(pose==='idle'&&f.species==='boar'&&frame===2&&!f.targetNpcId){
        const side=f.direction==='west'?-1:f.direction==='east'?1:0;
        for(let i=0;i<3;i++)g.fillStyle(ELEMENT.earth,.45).fillRect(f.x+side*22+i*4-4,f.y+4-i*3,3,2);
      }
      if(f.rank==='elite'||f.hp<f.maxHp||s.selectedFaunaId===f.id){
        const top=f.y-(f.species==='wood-king'?99:BASE_FAUNA_IDS.includes(f.species)?43:72)-lift;
        g.fillStyle(0x22231d,1).fillRect(f.x-14,top,28,4);
        g.fillStyle(f.rank==='elite'?0xe7bc63:0xad6151,1).fillRect(f.x-13,top+1,Math.round(26*f.hp/f.maxHp),2);
        if(f.rank==='elite')spark(f.x,top-7,5);
      }
    }
    for(const p of environment.monsterProjectiles??[])if(s.inSceneryView(p.position,10)){
      const {x,y}=p.position,color=ELEMENT[p.element]??ELEMENT.poison;
      g.lineStyle(2,color,.8).lineBetween(x-p.direction.x*13,y-p.direction.y*13-12,x,y-12);
      spark(x,y-12,p.element==='blood'?2:p.element==='wood'?7:4);
    }
    for(const h of environment.monsterHazards??[]){
      if(!s.inSceneryView(h.position,60))continue;
      const {x,y}=h.position;
      const color=ELEMENT[h.element]??ELEMENT.poison;
      g.fillStyle(color,.12).fillCircle(x,y,h.radius);
      paintRing(g,x,y,h.radius,color,.52);
      for(let i=0;i<6;i++){
        const a=i*2.39+now/1700;
        const px=x+Math.cos(a)*h.radius*.67,py=y+Math.sin(a)*h.radius*.67;
        if(h.effect==='root')g.lineStyle(2,color,.76).lineBetween(px-5,py+4,px,py-5).lineBetween(px,py-5,px+6,py-9);
        else spark(px,py,i%2?3:4,.42);
      }
    }
    for(let i=sparks;i<this.sparkPool.length;i++)this.sparkPool[i].setVisible(false);
    for(let i=trailCount;i<this.trailPool.length;i++)this.trailPool[i].setVisible(false);
  }
  paintCast(g,f,cast,skill,phase,now,spark){
    const color=ELEMENT[skill.element]??GLOW[f.species],origin=cast.origin,aim=cast.aim,age=now-cast.started-skill.windup;
    if(phase==='windup'){
      if(skill.mode==='rain'){
        for(const [dx,dy] of [[0,0],[32,-24],[-32,24]])paintRing(g,aim.x+dx,aim.y+dy,skill.radius,color,.62);
      }else if(cast.skillId==='eagle-rise'){
        paintRing(g,f.x,f.y,skill.radius,0xffda8e,.72);
      }else if(['area','mist','leap','gust','roar','summon','burrow','heal','cleanse','rage'].includes(skill.mode)){
        const p=['mist','leap','burrow'].includes(skill.mode)?aim:origin;
        paintRing(g,p.x,p.y,skill.radius,color,.8);
      }else if(skill.mode!=='armor'){
        g.lineStyle(2,color,.56);
        for(let i=0;i<6;i+=2)g.lineBetween(origin.x+(aim.x-origin.x)*i/6,origin.y+(aim.y-origin.y)*i/6,origin.x+(aim.x-origin.x)*(i+1)/6,origin.y+(aim.y-origin.y)*(i+1)/6);
      }
      return;
    }
    if(skill.mode==='breath'&&phase==='active'){
      const t=Math.min(1,age/110),x=origin.x+(aim.x-origin.x)*t,y=origin.y+(aim.y-origin.y)*t;
      const height=Math.round(f.altitude??0)+15;
      g.lineStyle(6,color,.74).lineBetween(origin.x,origin.y-height,x,y-5);
      g.lineStyle(2,0xffebad,.95).lineBetween(origin.x,origin.y-height,x,y-5);
      for(let i=0;i<4;i++)spark(x+(i-2)*5,y-5-(i%2)*8,3+(i%2),.82);
    }else if(skill.mode==='gust'&&phase==='active'){
      const radius=Math.min(skill.radius,17+age*.3);
      paintRing(g,f.x,f.y,radius,0xffdb97,.82);
      paintRing(g,f.x,f.y,Math.max(5,radius*.68),0xa6cbd1,.42);
    }else if(cast.skillId==='eagle-rise'&&phase!=='windup'){
      for(let i=0;i<4;i++)spark(f.x+(i-1.5)*8,f.y-11-i*6,2,.68);
    }else if(skill.mode==='tongue'&&phase==='active'){
      const start=monsterMouth(f,aim),t=Math.max(0,Math.min(1,age/(skill.active*.48),(skill.active-age)/(skill.active*.28)));
      const x=f.x+(aim.x-f.x)*t,y=f.y+(aim.y-f.y)*t;
      g.lineStyle(4,color,.72).lineBetween(start.x,start.y-13,x,y-13);
      g.lineStyle(1,0xe9d3bb,1).lineBetween(start.x,start.y-13,x,y-13);
      spark(x,y-13,3,.76);
    }else if(skill.mode==='dash'&&phase==='active'){
      for(let i=1;i<=3;i++)spark(f.x+(origin.x-f.x)*i*.22,f.y+(origin.y-f.y)*i*.22,i%2?1:7,.6/i);
      g.lineStyle(1,color,.45).lineBetween(origin.x,origin.y,f.x,f.y);
    }else if(skill.mode==='burrow'){
      for(let i=0;i<4;i++)g.fillStyle(color,.64).fillRect(f.x-9+i*5,f.y+((i+Math.floor(now/90))%3)-2,3,2);
      if(phase==='recover')paintRing(g,f.x,f.y,skill.radius,color,.7);
    }else if(['roar','area','heal','cleanse','rage','summon'].includes(skill.mode)||skill.mode==='leap'&&phase==='recover'){
      const radius=Math.min(skill.radius,12+age*.16);
      paintRing(g,f.x,f.y,radius,color,.67);
      spark(f.x,f.y,skill.mode==='roar'?7:2,.8);
    }else if(phase==='active')spark(f.x,f.y-10,skill.mode==='armor'?6:0,.78);
  }
}

import { TRIBULATIONS, worldMinute } from '../dao/TribulationSystem.ts';
import { boltShape, clamp01, impactKey, phaseOf } from './TribulationVisualTimeline.js';

const ROOT='/assets/tribulation/';
const cueVolumes={wind:.16,charge:.13,impact:.33,residue:.09};
const qualities={low:{limit:1,clouds:4,particles:10,branches:3},
  medium:{limit:2,clouds:6,particles:22,branches:6},high:{limit:4,clouds:7,particles:38,branches:12}};
const clouds=[[-148,-10,1.12],[-87,-35,1.32],[127,-16,1.24],[53,-40,1.39],[-48,12,1.03],[69,12,1.05],[4,-6,1.34]];
const ease = t => t*t*(3-2*t);
const int = Math.round;
const settingKey='tvk-tribulation-vfx-v1';

export function preloadTribulationVisuals(scene){
  scene.load.spritesheet('tribulation-storm',ROOT+'storm-atlas.png',{frameWidth:144,frameHeight:80});
  scene.load.spritesheet('tribulation-impact',ROOT+'impact-atlas.png',{frameWidth:128,frameHeight:80});
  for(const key of Object.keys(cueVolumes))scene.load.audio('tribulation-'+key,ROOT+key+'.wav');
}

function preferences(){
  const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;
  try{
    const saved=JSON.parse(localStorage.getItem(settingKey)??'{}');
    return {quality:qualities[saved.quality]?saved.quality:'high',flash:saved.flash??!reduced,shake:saved.shake??!reduced,sound:saved.sound??true};
  }catch{return {quality:'high',flash:!reduced,shake:!reduced,sound:true};}
}

function path(g,points,width,color,alpha,progress=1){
  if(progress<=0||alpha<=0)return;
  const end=(points.length-1)*progress,last=Math.floor(end);
  g.lineStyle(width,color,alpha).beginPath().moveTo(points[0].x,points[0].y);
  for(let i=1;i<=last;i++)g.lineTo(points[i].x,points[i].y);
  if(last<points.length-1){
    const a=points[last],b=points[last+1],p=end-last;
    g.lineTo(int(a.x+(b.x-a.x)*p),int(a.y+(b.y-a.y)*p));
  }
  g.strokePath();
}

export class TribulationVisuals {
  constructor(scene){
    this.scene=scene;
    this.settings=preferences();
    this.slots=[];
    this.cues=new Map();
    this.lastImpactAudio=-Infinity;
    this.playing=new Set();
    this.candidates=[];
    scene.events.once('shutdown',()=>{
      for(const sound of this.playing)sound.destroy();
      this.playing.clear();
    });
  }

  setOptions(options){
    const quality=qualities[options.quality]?options.quality:this.settings.quality;
    this.settings={...this.settings,...options,quality};
    if(!this.scene.cultivation?.arena)localStorage.setItem(settingKey,JSON.stringify(this.settings));
  }

  buildSlot(){
    const s=this.scene;
    const make=(texture,depth)=>s.add.image(0,0,texture).setDepth(depth).setVisible(false);
    return {shade:s.add.graphics().setDepth(9).setVisible(false),
      atmosphere:s.add.graphics().setDepth(6450).setVisible(false),
      sky:s.add.graphics().setDepth(6500).setVisible(false),
      cloud:clouds.map((_,i)=>make('tribulation-storm',6460+i)),
      glow:[make('tribulation-storm',6480),make('tribulation-storm',6481)],
      impact:make('tribulation-impact',0).setOrigin(.5,51/80),id:null,shape:null};
  }

  hide(slot){
    if(!slot.id)return;
    slot.id=null;
    for(const g of [slot.shade,slot.sky,slot.atmosphere])g.setVisible(false);
    for(const image of [...slot.cloud,...slot.glow,slot.impact])image.setVisible(false);
  }

  live(time,world,flashes){
    const clock=worldMinute(world)+(this.scene.populationTick??0)/1000;
    this.candidates.length=0;
    for(const n of world.npcs){
      const t=n.tribulation;
      if(!t||t.phase==='travel')continue;
      const flash=flashes.get(n.id);
      const strikeAge=flash?.id===t.id?time-flash.at:Infinity;
      const anchor=t.anchor??{x:n.x,y:n.y};
      this.candidates.push({t,anchor,clock,strikeAge});
    }
    this.paint(time,this.candidates,true);
  }

  paint(time,candidates,audio=false){
    const s=this.scene,view=s.cameras.main.worldView,cfg=qualities[this.settings.quality];
    const visible=candidates.filter(row=>{
      const {x,y}=row.anchor,rank=row.t.realm,pad=245+rank*40;
      return x+pad>view.x&&x-pad<view.right&&y+95>view.y&&y-(290+rank*44)<view.bottom;
    });
    visible.sort((a,b)=>Number(b.strikeAge<740)-Number(a.strikeAge<740)||
      Math.abs(a.anchor.x-view.centerX)+Math.abs(a.anchor.y-view.centerY)-
      Math.abs(b.anchor.x-view.centerX)-Math.abs(b.anchor.y-view.centerY));
    const shown=visible.slice(0,cfg.limit);
    const assigned=new Set();
    for(const row of shown){
      let slot=this.slots.find(p=>p.id===row.t.id);
      if(!slot)slot=this.slots.find(p=>!p.id||!shown.some(item=>item.t.id===p.id));
      if(!slot){slot=this.buildSlot();this.slots.push(slot);}
      assigned.add(slot);
      if(slot.id!==row.t.id){slot.id=row.t.id;slot.key=null;}
      const phase=phaseOf(row.t,row.clock,row.strikeAge);
      this.paintSlot(slot,row,phase,cfg);
      if(audio)this.playCues(time,row,phase,view);
    }
    for(const slot of this.slots)if(!assigned.has(slot))this.hide(slot);
    this.last=shown.map(row=>({id:row.t.id,x:row.anchor.x,y:row.anchor.y,phase:row.t.phase,wave:row.t.strikes,
      endpoint:this.slots.find(p=>p.id===row.t.id)?.shape?.points.at(-1)}));
    if(this.cues.size>64)this.cues.delete(this.cues.keys().next().value);
  }

  paintSlot(slot,row,f,cfg){
    const {t,anchor,clock,strikeAge:age}=row,{realm}=t,{x,y}=anchor;
    const scale=1+realm*.19,altitude=171+realm*34,top=y-altitude,radius=TRIBULATIONS[realm].radius;
    const gather=ease(f.gather),fade=f.ending?1-Math.pow(f.resolve,t.phase==='failure'?1.9:1.1):1;
    const alpha=Math.min(1,.10+f.gather*2.4)*fade;
    const flash=this.settings.flash&&age>=0&&age<147;
    const charge=Math.max(f.charge,flash ? .95 : 0)*fade;
    const ground=slot.shade.clear().setVisible(true),sky=slot.sky.clear().setVisible(true),air=slot.atmosphere.clear().setVisible(true);
    ground.fillStyle(0x192035,(.07+gather*.30)*fade).fillEllipse(x+16,y-8,(radius+70)*2,112*scale);
    ground.fillStyle(0x10152a,(.05+gather*.24)*fade).fillEllipse(x+10,y-9,(radius+28)*2,78*scale);
    if(this.settings.quality!=='low'){
      air.fillStyle(0x1d1d3e,.13*gather*fade).fillEllipse(x,y-29,(radius+112)*2,238*scale);
    }
    if(f.charge>.10&&fade>.01){
      const warning=radius*(.82+.18*f.charge);
      for(let i=0;i<28;i++){
        const theta=i*Math.PI/14;
        if(i%4===1)continue;
        const px=int(x+Math.cos(theta)*warning),py=int(y+Math.sin(theta)*warning*.37);
        ground.fillStyle(i%4===0?0xe8ba70:0xac785c,.62+.30*f.charge)
          .fillRect(px-2,py-1,i%4===0?7:4,2);
      }
      for(const d of [-1,1]){
        ground.fillStyle(0xf2cc8b,.69*f.charge).fillRect(x-9,y+d*9,18,2);
        ground.fillRect(x+d*9,y-7,2,14);
      }
    }
    for(const [i,image] of slot.cloud.entries()){
      if(i>=cfg.clouds){image.setVisible(false);continue;}
      const [cx,cy,mass]=clouds[i],phase=clock*.78+i*1.75;
      const spread=1+1.25*(1-gather)+(f.ending?f.resolve*.68:0);
      const orbit=i===6?.28:1;
      const px=int(x+(cx*spread+Math.cos(phase)*12*orbit)*scale);
      const py=int(top+cy+(Math.sin(phase)*9*orbit)-(1-gather)*(i%3)*18);
      image.setVisible(alpha>.025).setFrame(i%6).setPosition(px,py)
        .setScale(mass*scale*(.74+gather*.26)).setAlpha(alpha*(i<3?.87:1));
      image.setTint(i===6?0xdad7ff:i===0?0x838aa6:0xc1c6ed);
    }
    for(const [i,image] of slot.glow.entries()){
      const base=slot.cloud[i===0?3:cfg.clouds-1];
      image.setVisible(charge>.06&&(i===0||cfg.clouds>4)).setFrame(Number(base.frame.name)+6)
        .setPosition(base.x,base.y).setScale(base.scaleX).setAlpha(charge*(.73+i*.1));
    }
    const flutter=Math.floor(clock*14);
    if((charge>.10||gather>.26)&&fade>.05){
      for(let i=0;i<(cfg.clouds===4?2:4);i++){
        const k=(flutter+i*6)%16;
        if(k>4&&charge<.35||k>8)continue;
        const a=x+int(Math.sin(Math.floor(flutter/3)*3+i*5)*(96+realm*17)),h=top+int(Math.cos(i*4+flutter*.18)*18);
        const arc=[{x:a-25,y:h-4},{x:a-13,y:h+3},{x:a+3,y:h-3},{x:a+16,y:h+2},{x:a+31,y:h-8}];
        path(sky,arc,4,0x645bda,(.16+charge*.39)*fade);
        path(sky,arc,1,0xbecfff,(.25+charge*.55)*fade);
      }
    }
    const key=t.id+':'+(age<740?t.strikes:t.strikes+1)+':'+x+':'+y;
    if(slot.key!==key){
      slot.key=key;slot.shape=boltShape(t.id,age<740?t.strikes:t.strikes+1,x,int(top+13),y,realm);
    }
    if(f.leader>0&&age>=740)path(sky,slot.shape.points,1,0xc4d7ff,.85,Math.min(.94,f.leader));
    if(age>=0&&age<740){
      this.strike(slot,age,realm,x,y,cfg);
    }else slot.impact.setVisible(false);
    if(f.ending)this.outcome(sky,ground,t.phase==='success',x,y,f.resolve,scale,cfg.particles);
    else for(let i=0;i<cfg.particles;i++){
      const rise=(clock*.63+i*.243)%1,a=i*2.399+clock*(i%3===0?-.5:.6),r=(16+(i*7)%46)*(1-rise*.4);
      const px=int(x+Math.cos(a)*r),py=int(y-Math.sin(a)*r*.42-rise*(40+f.charge*65));
      sky.fillStyle(i%5===0?0xe2e9fd:0x8cb6ed,(.16+charge*.46)*(1-rise)*fade).fillRect(px,py,i%5===0?3:2,2);
    }
  }

  strike(slot,age,rank,x,y,cfg){
    const sky=slot.sky,ground=slot.shade,shape=slot.shape;
    const brief=age<92||age>=139&&age<194;
    const power=age<210?brief?1:.44:clamp01((610-age)/400)*.41;
    const scale=1+rank*.31;
    if(power>0){
      const width=rank*2.35;
      for(const branch of shape.branches.slice(0,cfg.branches)){
        path(sky,branch.points,4+width*.5,0x6b59e7,power*.7);
        path(sky,branch.points,1.4+width*.19,0xbfe1ff,power*.95);
      }
      path(sky,shape.points,16+width,0x5449b8,power*.49);
      path(sky,shape.points,10+width,0x7c72f5,power*.68);
      path(sky,shape.points,6+width*.7,0x85bbff,power*.91);
      path(sky,shape.points,2.8+width*.46,0xf5fbff,power);
      for(let i=0;i<cfg.branches;i++){
        const p=shape.points[1+(i*3)%10],side=i%2?-1:1;
        const spark=[p,{x:int(p.x+side*7),y:p.y+2},{x:int(p.x+side*(15+(i%3)*3)),y:p.y-5}];
        path(sky,spark,1,0xd0e8ff,power*.61);
      }
    }
    if(this.settings.flash&&brief){
      slot.atmosphere.fillStyle(0x929fff,.13*(1-age/300)).fillEllipse(x,y-48,390*scale,310*scale);
      ground.fillStyle(0xc0cdfe,.44*(1-age/285)).fillEllipse(x,y,131*scale,51*scale);
    }
    slot.impact.setVisible(true).setFrame(Math.min(7,Math.floor(age/84))).setAlpha(clamp01((740-age)/420))
      .setPosition(x,y).setDepth(y+.065).setScale(1.02+rank*.31);
    for(let i=0;i<cfg.particles;i++){
      const angle=(i+.11)*2.399,radius=(17+(i*17)%61)*(age/620)*scale;
      const arc=Math.max(0,1-(age/460-.54)**2*3.42);
      const dx=Math.cos(angle)*radius,dy=Math.sin(angle)*radius*.4-arc*(10+(i*11)%29);
      sky.fillStyle(i%4===0?0xedf8ff:i%3===0?0x9a82ef:0x8cbfff,clamp01((700-age)/660)*.85)
        .fillRect(int(x+dx),int(y+dy),i%3===0?4:2,i%4===0?3:2);
    }
  }

  outcome(sky,ground,passed,x,y,progress,scale,count){
    const resolved=Math.sin(progress*Math.PI),alpha=(1-progress)*.84;
    if(passed){
      const height=(25+125*Math.sin(progress*Math.PI*.86))*scale;
      const width=(14+progress*20)*scale,top=int(y-height);
      sky.fillStyle(0x85dac7,alpha*.25).fillPoints([{x:x-width,y},{x:x-width*.55,y:top},
        {x:x+width*.55,y:top},{x:x+width,y}],true);
      sky.fillStyle(0xd7fff2,alpha*.72).fillRect(int(x-width*.12),top,Math.ceil(width*.24),Math.ceil(height));
      ground.lineStyle(2,0xaafae1,alpha).strokeEllipse(x,y,40+71*progress,13+22*progress);
    }else{
      ground.fillStyle(0x222033,alpha*.75).fillEllipse(x,y,48*scale,17*scale);
      for(let i=0;i<5;i++){
        const a=i*2.399,reach=14+30*progress;
        path(sky,[{x,y},{x:int(x+Math.cos(a)*reach*.55),y:int(y+Math.sin(a)*reach*.24+5)},
          {x:int(x+Math.cos(a)*reach),y:int(y+Math.sin(a)*reach*.42)}],2,i%2?0xb98c99:0x8776ab,alpha*.65);
      }
    }
    for(let i=0;i<count;i++){
      const a=i*2.399+progress*(passed?1.57:-.82),phase=(i*.319+progress*.7)%1;
      const r=(12+(i*7)%32)*(1+progress*.68)*scale,px=int(x+Math.cos(a)*r);
      const py=int(y+Math.sin(a)*r*.31-phase*(passed?130:40)*resolved);
      sky.fillStyle(passed?i%3===0?0xf5e2a5:0x9aead8:0x8a7295,alpha*(1-phase)*.82).fillRect(px,py,i%3===0?4:2,2);
    }
  }

  playCues(time,{t,anchor,strikeAge},f,view){
    const s=this.scene;
    const attenuation=Math.max(.22,1-Math.abs(anchor.x-view.centerX)/(view.width*.8));
    const cue=(name,key,volume)=>{
      if(this.cues.has(key)||!this.settings.sound||s.sound?.mute||s.sound?.locked)return;
      this.cues.set(key,true);
      if(this.playing.size>=5)return;
      const sound=s.sound.add('tribulation-'+name,{volume:cueVolumes[name]*volume*attenuation});
      this.playing.add(sound);
      sound.once('complete',()=>{this.playing.delete(sound);sound.destroy();});
      if(!sound.play()){this.playing.delete(sound);sound.destroy();}
    };
    if(t.phase==='cloud')cue('wind',t.id+':wind',1);
    if(f.charge>.50&&f.left>.22)cue('charge',t.id+':charge:'+(t.strikes+1),1);
    if(strikeAge>=0&&strikeAge<130){
      const key=impactKey(t.id,t.strikes);
      if(!this.cues.has(key)&&time-this.lastImpactAudio>145){
        if(this.settings.shake&&view.contains(anchor.x,anchor.y)&&!s.cameras.main.shakeEffect.isRunning){
          s.cameras.main.shake(130,.0017+t.realm*.00045);
        }
        cue('impact',key,.90+t.realm*.16);
        this.lastImpactAudio=time;
        this.cues.set(key,true);
      }
    }else if(strikeAge>=260&&strikeAge<430){
      cue('residue',t.id+':residue:'+t.strikes,1);
    }
  }
}

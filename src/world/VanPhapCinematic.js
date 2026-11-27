import {martialAltitude} from './MartialTimeline.js';
import {VAN_KIEM_TEXTURE} from './VanKiemCinematic.js';

export const VAN_PHAP_TEXTURE='van-phap';
export const VAN_PHAP_AUDIO=['blade','dao','spear','fist','lightning','fire','ice','spirit','seal','dragon','crow','shock','contact','tail'];
const tau=Math.PI*2;
const clamp=value=>Math.max(0,Math.min(1,value));
const ease=value=>{const t=clamp(value);return t*t*(3-2*t);};
const cycle=(age,rate=100)=>Math.floor(Math.max(0,age)/rate)%4;
const courseVisuals={
  'chaos-thunder':['chaos','lightning'], 'golden-crow':['sun','crow'], 'myriad-sword':['myriad','blade'],
  'void-sword':['void','blade'], 'nine-skies':['storm','lightning'], 'burning-dragon':['dragon','dragon'],
  'purple-sword':['violet','lightning'], 'ice-heart':['ice','ice'], 'soul-eater':['ghost','spirit'],
  'qingyun-flight':['jade','blade'], 'scarlet-palm':['ember','fire'], 'green-life':['wood','spirit'],
  breeze:['steel','blade'], 'mountain-fist':['earth','fist'], 'eight-spear':['spear','spear'],
};
const movements={
  'breeze-cut':'slash','breeze-three':'slash','breeze-return':'spin','heavy-fist':'fist','ground-shock':'fist','stone-body':'guard',
  'spear-thrust':'thrust','spear-sweep':'sweep','spear-break':'thrust','jade-wave':'slash','wind-step':'dash','three-jade':'command',
  'fire-palm':'palm','flame-burst':'seal','fire-ward':'chakra',spring:'chakra','vine-bind':'command','wood-ward':'guard',
  'purple-slash':'slash','thunder-step':'dash','five-thunders':'command','ice-finger':'finger','ice-lotus':'seal','ice-ward':'guard',
  'ghost-claw':'claw','soul-shock':'chakra','ghost-body':'dash','hundred-swords':'command','sword-domain-earth':'seal',
  'sky-seal':'seal','thunder-host':'command','thunder-earth':'summon','dragon-breath':'command','scarlet-dragon':'summon','burning-field':'summon',
  'void-field':'chakra','four-swords':'summon','sky-split':'summon','chaos-body':'chakra','nine-dragons':'summon',
  'heaven-wrath':'summon','sun-body':'chakra','crow-descent':'summon','nine-suns':'summon',
};
const palette={
  chaos:0x9e8aff,storm:0x79d6ff,sun:0xffc35f,dragon:0xff8d44,void:0xb6d5fb,
  myriad:0xecc184,ice:0x90e8ff,wood:0xa4d571,ember:0xffa063,ghost:0xb0a1e7,
  violet:0xc189fc,jade:0x91dbbc,steel:0xc5deda,earth:0xd1a872,spear:0xcd9575,
};
const weaponArt=[
  'steel','earth','spear','jade','ember','earth','violet','ice','ghost','storm','dragon','earth','void','chaos','sun',
];
const windOrbits=[-.84,.44,2.31,3.67,5.34,5.9,1.5];
const accents={
  ice:'crystal',wood:'vine',ghost:'soul',void:'rift',storm:'banner',earth:'rubble',
};
const poses={
  seal:[.84,.07,.11,.23], chakra:[.52,.22,.33,.29], summon:[.53,.75,.22,.48],
  command:[.43,.11,.79,.45], guard:[.8,.03,.22,.06], finger:[.25,.05,1,.42],
  palm:[.42,.08,1,.62], fist:[.13,.03,1.03,.76], claw:[.28,.53,.81,.65],
  dash:[.12,.03,.90,.81], thrust:[.08,.04,1,.57], sweep:[.19,.42,.83,.54],
  spin:[.12,.49,.8,.48], slash:[.13,.31,.89,.48],
};

// This pose feeds the existing arm and garment rig. The motion clock remains the cast clock.
export function vanPhapPose(cast,age) {
  const motion=movements[cast?.skill.id];
  if(!motion)return null;
  const t=cast.timeline;
  const charge=ease(age/t.release), clear=1-ease((age-t.aftermath)/(t.complete-t.aftermath));
  const drive=ease((age-t.release+110)/155)*(1-ease((age-t.release-125)/230));
  const channel=charge*clear;
  const height=martialAltitude(cast,age);
  const motionData=poses[motion];
  let advance=drive;
  if(cast.skill.id==='breeze-three'){
    advance=0;
    for(let i=0;i<t.count;i++){
      const progress=(age-t.impact-i*t.interval+60)/180;
      if(progress>0&&progress<1)advance=Math.max(advance,Math.sin(progress*Math.PI));
    }
  }
  return {height,seal:channel*motionData[0]*(1-drive*.84),call:channel*motionData[1]*(1-drive*.45),
    channel:channel*(motion==='chakra'?.67:.13),command:advance*motionData[2],
    tuck:advance*motionData[3],breath:Math.sin(age/177)*clear,fabric:channel*(.25+motionData[3])+advance*.22};
}

export class VanPhapCinematic {
  constructor(scene){
    this.scene=scene;
    this.pool=[];
    this.records=new WeakMap();
    this.wards=new Map();
    this.wind=new Map();
    this.voices=new Set();
    this.used=0;
    scene.events.once('shutdown',()=>this.clear());
  }
  get available(){return this.scene.textures.exists(VAN_PHAP_TEXTURE);}
  get active(){return this.wards.size>0||this.used>0;}
  begin(){
    this.used=0;
    this.groups=0;
    this.limit=350;
    for(const state of this.wind.values())state.force=0;
  }
  end(){
    for(let i=this.used;i<this.pool.length;i++)this.pool[i].setVisible(false);
    for(const [tree,state] of this.wind){
      if(!tree.active){this.wind.delete(tree);continue;}
      if(!state.force){tree.setRotation(state.angle);this.wind.delete(tree);}
      else tree.setRotation(state.angle+state.bend);
    }
  }
  clear(){
    this.wards.clear();
    this.records=new WeakMap();
    for(const sound of [...this.voices])sound.destroy();
    this.voices.clear();
    this.begin();this.end();
  }
  stamp(frame,x,y,depth,sx=1,sy=sx,alpha=1,angle=0,add=false,texture=VAN_PHAP_TEXTURE){
    if(alpha<.028||this.used>=this.limit||!this.scene.inSceneryView({x,y},150))return null;
    const slot=this.used++;
    const sprite=this.pool[slot]??(this.pool[slot]=this.scene.add.image(0,0,texture,frame));
    if(sprite.texture.key!==texture||sprite.frame.name!==frame)sprite.setTexture(texture,frame);
    if(sprite.depth!==depth)sprite.setDepth(depth);
    if(sprite.blendMode!==Number(add))sprite.setBlendMode(Number(add));
    if(sprite.isTinted)sprite.clearTint();
    return sprite.setPosition(Math.round(x),Math.round(y)).setScale(sx,sy).setAlpha(clamp(alpha)).setRotation(angle).setVisible(true);
  }
  sword(x,y,scale,angle,opacity,index=0){
    this.stamp('blade'+index,x,y,9211,scale,scale,opacity,angle+Math.PI/2,false,VAN_KIEM_TEXTURE);
  }
  glow(style,x,y,size,alpha,sky=false){
    this.stamp('silver0',x,y,sky?9205:13,size,size*.58,alpha,0,true,VAN_KIEM_TEXTURE)?.setTint(palette[style]);
  }
  audio(record,cast,age,kind,event,due,volume){
    if(age<due||record.played.has(event))return;
    record.played.add(event);
    const scene=this.scene,key='van-phap-'+kind;
    if(age-due>165||this.voices.size>=7||scene.sound.locked||
      !scene.cache.audio.exists(key)||!scene.inSceneryView(cast.origin,100))return;
    const view=scene.cameras.main.worldView;
    const sound=scene.sound.add(key,{volume,pan:Math.max(-.7,Math.min(.7,(cast.origin.x-view.centerX)/view.width))});
    this.voices.add(sound);
    sound.once('destroy',()=>this.voices.delete(sound));
    sound.once('complete',()=>sound.destroy());
    if(!sound.play())sound.destroy();
  }
  retainWard(cast,target,until){
    if(movements[cast.skill.id])this.wards.set(target.id,{skill:cast.skill.id,style:courseVisuals[cast.skill.course][0],target,until,mapId:cast.mapId});
  }
  wardArt(id,style,npc,age,opacity=1){
    const {x,y}=npc,f=cycle(age);
    const size=id==='sun-body'?1.08:.55;
    if(id==='sun-body')this.stamp('sun-disc'+f,x,y-51,y-1,1.32,1.32,.87*opacity,age*.0001);
    if(id==='stone-body')this.stamp('earth-rubble'+f,x,y-1,14,.57,.32,.74*opacity);
    if(id==='wood-ward')this.stamp('wood-vine'+f,x,y-15,y-1,.82,.67,.68*opacity);
    this.stamp(style+'-seal'+f,x,y,14,size,size*.68,.68*opacity);
    const orbiters=id==='chaos-body'?7:5;
    for(let i=0;i<orbiters;i++){
      const angle=i*tau/orbiters+age*.0032, h=Math.sin(angle), px=x+Math.cos(angle)*26;
      const py=y-16+h*10;
      const texture=id==='ice-ward'?'ice-crystal':id==='chaos-body'?'chaos-bolt':style+'-crest';
      const scale=id==='ice-ward'?.25:id==='chaos-body'?.25:.30;
      this.stamp(texture+((f+i)%4),px,py,h>0?y+2:y-2,scale,scale,.73*opacity,angle*.25,id==='chaos-body');
    }
  }
  drawWards(clock,conditions){
    if(!this.available)return;
    for(const [id,ward] of this.wards){
      const {target,until}=ward;
      if(!target.alive||clock>=until||!(conditions.get(id)?.guardUntil>clock)){
        this.wards.delete(id);continue;
      }
      if(ward.mapId!==(this.scene.populationWorld.environment.mapId??'surface')||
        !this.scene.inSceneryView(target,65)||target.underground)continue;
      this.wardArt(ward.skill,ward.style,target,clock,clamp((until-clock)/400));
    }
  }
  dragon(style,x,y,phase,scale,opacity,heading,detail,depth=9212){
    const direction=Math.cos(heading)<0?-1:1, f=cycle(phase,90);
    const length=detail===2?11:detail===1?8:6;
    const point=i=>[x-direction*i*13*scale,y+i*2.7*scale+Math.sin(i*.69-phase*.009)*13*scale];
    for(let i=length;i>=1;i--){
      const [px,py]=point(i),[tx,ty]=point(i-1);
      const taper=1-i/(length+1)*.72;
      const bend=Math.atan2(ty-py,Math.abs(tx-px))*direction;
      if(i===3||i===6){
        for(const foot of [0,1]){
          this.stamp(style+'-leg'+f,px+direction*foot*8*scale,py+6*scale,
            depth-3,scale*direction*.77,scale*.77,opacity*.91,bend);
        }
      }
      this.stamp(style+'-body'+f,px,py,depth-2,scale*taper*direction,scale*taper,opacity,bend);
      if(style==='chaos'&&i%3===1)this.stamp('chaos-bolt'+f,px,py-3,depth-1,scale*.27,scale*.29,opacity*.52,bend+1,true);
    }
    this.stamp(style+'-head'+f,x,y,depth,-direction*scale,scale,opacity,-Math.sin(phase*.009)*.29);
  }
  storm(style,cast,age,opacity,detail,wrapped){
    const t=cast.timeline,{x,y}=cast.focus,f=cycle(age);
    const pre=ease((age-t.charge)/(t.release-t.charge));
    const size=cast.skill.width/78;
    this.glow(style,x,y,size*1.4,opacity*.48);
    for(let i=0;i<(wrapped?3:2);i++){
      const offset=(i-1)*55;
      this.stamp(style+'-cloud'+((f+i)%4),x+offset,y-131-i*21,9205,size*(1.05-i*.10),size*.93,opacity*pre*(.81-i*.10));
    }
    for(let i=0;i<3;i++){
      this.stamp(style+'-seal'+((f+i)%4),x,y-22-i*37,9207,size*(1.08-i*.22),size*.75,opacity*pre*(.70-i*.09));
    }
    if(wrapped){
      for(let i=0;i<9;i++){
        const angle=i*tau/9+age*(i%2?.00068:.00048);
        const rx=(65+i%3*24)*size,cx=x+Math.cos(angle)*rx;
        const cy=y-79-i%3*35+Math.sin(angle)*rx*.34;
        const awaken=ease((age-t.charge-i*79)/550);
        const request=t.impact+(i%t.count)*t.interval+Math.floor(i/t.count)*108;
        const dive=Math.max(0,Math.sin(clamp((age-request+120)/440)*Math.PI));
        this.dragon('chaos',cx+(x-cx)*dive*.54,cy+(y-cy)*dive*.57,age+i*153,
          (.65+i%3*.09)*(.75+size*.25),opacity*awaken*(i%2?.9:1),angle+Math.PI/2,detail);
      }
    }
    for(let i=0;i<t.count;i++){
      const elapsed=age-t.impact-i*t.interval, power=1-clamp(elapsed/460);
      if(elapsed<0||power<=0)continue;
      const spread=i===0?0:cast.skill.width*.34;
      this.lightning(style,x+Math.cos(i*2.6)*spread,y+Math.sin(i*2.6)*spread*.5,age+i*93,size,power*opacity);
    }
  }
  lightning(style,x,y,age,size,opacity){
    const f=cycle(age,70);
    this.stamp(style+'-bolt'+f,x,y-55*size,9215,Math.max(.48,size*.64),size,opacity,0,true);
    this.stamp(style+'-burst'+f,x,y,9210,size*.83,size*.55,opacity*.93,0,true);
    this.glow(style,x,y,size*.86,opacity*.73);
  }
  solar(cast,age,opacity,detail,phaseOffset){
    const {x,y}=cast.focus,t=cast.timeline,nine=cast.skill.id==='nine-suns';
    const pre=ease((age-t.chant)/(t.release-t.chant));
    const f=cycle(age), count=nine?9:1;
    for(let i=0;i<count;i++){
      const angle=i*tau/count-age*.00038+phaseOffset*.21, rx=nine?129:0;
      const grow=ease((age-t.chant-i*93)/660);
      const cx=x+Math.cos(angle)*rx,cy=y-116+Math.sin(angle)*rx*.43;
      this.stamp('sun-disc'+((f+i)%4),cx,cy,9207,nine?.80:1.82,nine?.80:1.82,opacity*grow,angle*.26);
      if(i%2===0)this.glow('sun',cx,cy,1.05,.61*grow*opacity,true);
    }
    const flight=age*.00172+phaseOffset, rise=(1-Math.cos(flight))*.5;
    const cx=x+Math.sin(flight)*86*pre,cy=y-64-rise*78*pre;
    const scale=(nine?1.37:1.67)*(.45+pre*.55);
    this.stamp('sun-crow'+Math.floor(age/83)%8,cx,cy,9214,Math.cos(flight)>0?scale:-scale,scale,opacity*pre,Math.sin(flight)*.15);
    this.stamp('sun-seal'+f,x,y,14,2.4,1.7,.83*opacity*pre);
    for(let i=0;i<(detail===0?7:17);i++){
      const angle=windOrbits[i%7]+i*.78, offset=(age/(270+i%3*90)+i*.39)%1;
      const endX=x+Math.cos(angle)*offset*142,endY=y+Math.sin(angle)*offset*68;
      const falling=age>=t.impact?nine?offset:.55+offset*.45:0;
      this.stamp('sun-'+(falling?'wake':'crest')+((f+i)%4),endX,endY-(1-falling)*97,9212,
        .31,.31,Math.sin(offset*Math.PI)*opacity*pre,angle+(falling?.75:0),true);
    }
    this.glow('sun',x,y,2.4,opacity*pre*(nine?.72:.59));
  }
  blades(style,cast,age,opacity,detail){
    const {x,y}=cast.focus, {origin,timeline:t}=cast, f=cycle(age);
    const grow=ease((age-t.charge)/Math.max(150,t.release-t.charge));
    const progress=clamp((age-t.release)/(t.aftermath-t.release));
    const volley=cast.skill.id==='hundred-swords', split=cast.skill.id==='sky-split', four=cast.skill.id==='four-swords';
    if(split){
      const aim=Math.atan2(cast.uy,cast.ux), drop=ease((age-t.release+200)/Math.max(260,t.impact-t.release+200));
      this.stamp('void-rift'+f,x,y-57,9206,2.9,1.8,opacity*grow,aim);
      this.glow('void',x,y,2.25,.8*grow*opacity);
      this.sword(x-cast.ux*56*(1-drop),y-165*(1-drop)-36,2.1*grow,aim*.3+Math.PI*.45,opacity*grow,3);
      return;
    }
    const count=volley?[17,25,36][detail]:four?4:style==='void'?10:18;
    const radius=volley?63:four?91:cast.skill.width*.93;
    for(let i=0;i<count;i++){
      const angle=(i%12)*tau/Math.min(12,count)+Math.floor(i/12)*.18+age*(four?.00019:.0007);
      const pivot=volley?origin:cast.focus;
      const sx=pivot.x+Math.cos(angle)*radius*(1+i%3*.18),sy=pivot.y+Math.sin(angle)*radius*.47-25-(i%3)*12;
      const launch=volley?ease((age-t.release-i%9*46)/525):0;
      const opacityHere=volley?opacity*(1-ease((progress-.72)/.28)):opacity;
      const px=sx+(x-sx)*launch,py=sy+(y-sy)*launch;
      const facing=volley?Math.atan2(cast.uy,cast.ux)+(1-grow)*Math.cos(angle)*.7:Math.PI/2+Math.sin(angle)*.24;
      this.sword(px,py,(four?1.22:volley?.46:.55)*grow,facing,opacityHere*grow,four?i%4:(i%3?1:3));
      if(volley&&launch>0&&launch<1)this.stamp(style+'-wake'+f,px-cast.ux*19,py-cast.uy*19,9210,.88,.5,opacityHere*.84,facing,true);
    }
    if(!volley){
      this.stamp(style+'-seal'+f,x,y,14,radius/52,radius/61,opacity*grow);
      if(style==='void')this.stamp('void-rift'+f,x,y,13,1.7,.85,opacity*grow*.7);
    }
  }
  elementary(style,cast,age,opacity,detail){
    const {skill,timeline:t,origin,focus,ux,uy}=cast,f=cycle(age,82);
    const angle=Math.atan2(uy,ux);
    const grown=ease(age/Math.max(80,t.release)), after=age>=t.release;
    const pulse=Math.max(0,Math.min(t.count-1,Math.floor((age-t.impact)/Math.max(1,t.interval))));
    const strike=ease((age-t.impact-pulse*t.interval+120)/150)*(1-ease((age-t.impact-pulse*t.interval)/400));
    const body=martialAltitude(cast,age);
    const hand=this.scene.npcAppearanceFleet?.entries.get(cast.npc.id)?.renderer?.worldAttachment('hand');
    const hx=hand?.x??origin.x+ux*15,hy=hand?.y??origin.y+uy*13-18-body;
    if(!after){
      const motif=skill.id==='fire-palm'?'ember-hand':skill.id==='ice-finger'?'ice-crystal':style+'-crest';
      this.stamp(motif+f,hx,hy,9210,.32+.29*grown,.32+.29*grown,opacity*grown*.78);
    }
    if(skill.effect==='guard'){
      if(!after)this.wardArt(skill.id,style,cast.support??cast.npc,age,opacity*grown*.76);
      return;
    }
    if(skill.form==='step'){
      if(!after)return;
      const count=detail===0?4:8;
      const texture=skill.id==='ghost-body'?'ghost-soul':style+'-wake';
      const actor=this.scene.npcSprites.get(cast.npc.id);
      for(let i=0;i<count;i++){
        const u=i/count,hold=clamp((age-t.release-i*8)/100);
        const x=origin.x+(cast.npc.x-origin.x)*u,y=origin.y+(cast.npc.y-origin.y)*u-19;
        this.stamp(texture+(f+i)%4,x,y,9211,.48+.18*u,.65,opacity*hold*(.26+u*.56),angle);
        if(skill.id==='thunder-step')this.stamp('violet-bolt'+f,x,y,9211,.36,.30,.64*opacity*hold,angle+1.57,true);
        if(skill.id==='ghost-body'&&actor?.frame&&i%2===0){
          this.stamp(actor.frame.name,x,y,9210,actor.scaleX,actor.scaleY,opacity*hold*.53,0,false,actor.texture.key)?.setTintFill(0x736687);
        }
      }
      return;
    }
    if(skill.delivery==='projectile'||skill.delivery==='homing'){
      for(const shot of cast.projectiles){
        if(shot.done)continue;
        const targetAngle=Math.atan2(shot.uy,shot.ux), size=skill.id==='flame-burst'?.76:.58;
        for(let i=1;i<=3;i++){
          this.stamp(style+'-wake'+((f+i)%4),shot.x-shot.ux*i*15,shot.y-shot.uy*i*15-15,
            9210,size+.25,size-.1,(1-i*.21)*opacity,targetAngle,true);
        }
        const motif=skill.id==='fire-palm'?'ember-hand':skill.id==='ice-finger'?'ice-crystal':style+'-crest';
        this.stamp(motif+f,shot.x,shot.y-15,9213,size,size,opacity,targetAngle+Math.PI/2);
      }
      if(skill.id==='three-jade'&&!after){
        for(let i=-1;i<2;i++){
          this.sword(hx-uy*i*(33-25*grown),hy+ux*i*(33-25*grown)-7,.52,angle,opacity*grown,1);
        }
      }
      if(skill.form!=='field')return;
    }
    if(style==='dragon'){
      const breath=skill.id==='dragon-breath';
      const shaped=(.61+.39*grown);
      const rise=ease((age-t.release+200)/770);
      const turn=age*.002;
      const x=breath?origin.x+ux*19:origin.x+(focus.x-origin.x)*rise+Math.cos(turn)*53;
      const y=breath?origin.y+uy*19-39:origin.y+(focus.y-origin.y)*rise+Math.sin(turn)*31-66;
      this.dragon(style,x,y,age,shaped*(breath?.84:1.28),opacity*grown,breath?angle:turn,detail);
      if(breath&&after){
        for(let i=0;i<7;i++)this.stamp('dragon-wake'+(f+i)%4,x+ux*i*18,y+uy*i*18,9214,
          .94+i*.09,.66+i*.08,opacity*(1-i*.09)*strike,angle,true);
      }
      if(breath)return;
    }
    if(skill.form==='field'||skill.form==='burst'||skill.form==='ally'){
      if(skill.id==='breeze-return'){
        for(let i=0;i<8;i++){
          const a=angle+i*tau/8+age*.0027, sweep=clamp((age-t.release+45-i*13)/110);
          this.stamp('steel-wake'+(f+i)%4,origin.x+Math.cos(a)*(31+21*sweep),origin.y+Math.sin(a)*(19+13*sweep)-16,
            9210,.96,.9,opacity*strike*sweep*(.68+i*.034),a+1.3,true);
        }
        return;
      }
      const heal=skill.effect==='heal';
      const point=heal?cast.support??origin:skill.form==='burst'?origin:focus;
      const radius=Math.max(35,skill.width||skill.range*.54);
      const size=radius/57;
      const spirit=(style==='wood'||style==='ghost');
      const motif=skill.id==='ice-lotus'?'ice-lotus':heal?'wood-flower':skill.id==='vine-bind'?'wood-vine':accents[style]??style+'-crest';
      this.stamp(style+'-seal'+f,point.x,point.y,14,size,size*.78,opacity*grown*.79);
      for(let i=0;i<(detail===0?5:9);i++){
        const a=i*tau/9+(heal?age*.002:0),grow=ease((age-t.release+i*48+100)/490);
        const px=point.x+Math.cos(a)*radius*.7*grow,py=point.y+Math.sin(a)*radius*.43*grow;
        const z=heal?grow*45:spirit?Math.sin(age*.008+i)*10:0;
        this.stamp(motif+(f+i)%4,px,py-z,9211,.39+grow*.24,.26+grow*.34,opacity*grow*.79,a*.08);
      }
      if(skill.id==='five-thunders'&&after){
        for(let i=0;i<5;i++){
          const eventAge=age-t.impact-i*t.interval*.49;
          if(eventAge<0||eventAge>320)continue;
          const a=i*2.4;
          this.lightning('violet',point.x+Math.cos(a)*radius*.51,point.y+Math.sin(a)*radius*.33,
            age+i*43,.68+i*.07,(1-eventAge/320)*opacity);
        }
      }
      if(skill.grade>=3){
        this.glow(style,point.x,point.y,size*1.45,opacity*(.18+strike*.57));
        for(let i=0;i<9;i++){
          const a=i*tau/9, scale=.48+i%3*.09;
          this.stamp(style+'-wake'+(f+i)%4,point.x+Math.cos(a)*radius*.78,point.y+Math.sin(a)*radius*.48-12,
            9211,scale,scale,opacity*grown*.67,a+1.5,true);
        }
      }
      return;
    }
    if(!after)return;
    const claw=skill.id==='ghost-claw', spear=style==='spear', punch=skill.id==='heavy-fist';
    const length=spear?Math.min(skill.range,94):claw?62:punch?25:38;
    const offset=skill.id==='breeze-three'?(pulse-1)*.76:0;
    this.stamp((claw?'ghost-claw':punch?'earth-burst':style+'-wake')+f,
      origin.x+ux*length,origin.y+uy*length-13,9212,spear?1.18:1.25,claw?1.03:spear?.57:.79,opacity*strike,angle+offset,true);
    if(spear&&skill.id!=='spear-sweep'){
      for(let i=0;i<3;i++)this.stamp('spear-wake'+(f+i)%4,hx+ux*(17+i*18),hy+uy*(17+i*18),9212,
        .54+i*.11,.35,opacity*strike*(.92-i*.16),angle,true);
    }
    if(skill.id==='spear-sweep'){
      for(let i=0;i<4;i++){
        const a=angle+(i-1)*.74+age*.001;
        this.stamp(style+'-wake'+(f+i)%4,origin.x+Math.cos(a)*47,origin.y+Math.sin(a)*26-11,
          9210,.94,.78,opacity*strike*(.75+i*.07),a+1.55,true);
      }
    }
  }
  draw(cast,age,settings){
    const entry=courseVisuals[cast.skill.course], id=cast.skill.id;
    if(!entry||!movements[id]||!this.available)return false;
    const [style,voice]=entry, {timeline:t,origin,focus}=cast;
    const opacity=(1-ease((age-t.aftermath)/(t.complete-t.aftermath)))*(settings.flash?1:.72);
    const detail=this.groups++<2?settings.detail:Math.max(0,settings.detail-1);
    this.limit=Math.min(316,this.used+(id==='nine-dragons'?225:detail===2?144:detail===1?109:82));
    let record=this.records.get(cast);
    if(!record){record={played:new Set()};this.records.set(cast,record);}
    const large=cast.skill.grade>=3, f=cycle(age);
    this.audio(record,cast,age,large?'seal':'spirit','prepare',t.charge,.23);
    this.audio(record,cast,age,voice,'release',t.release,large?.36:.27);
    if(cast.resonance&&cast.weapon?.endsWith('_dao'))this.audio(record,cast,age,'dao','weapon',t.release+45,.18);
    if(large)this.audio(record,cast,age,'tail','tail',t.aftermath,.25);
    if(['nine-dragons','heaven-wrath','sky-seal','thunder-host','thunder-earth'].includes(id)){
      this.storm(style,cast,age,opacity,detail,id==='nine-dragons');
    }else if(id==='crow-descent'||id==='nine-suns'){
      this.solar(cast,age,opacity,detail,this.groups===1?0:Math.atan2(cast.uy,cast.ux)+this.groups*.47);
    }else if(['hundred-swords','sword-domain-earth','void-field','four-swords','sky-split'].includes(id)){
      this.blades(style,cast,age,opacity,detail);
    }else this.elementary(style,cast,age,opacity,detail);
    if(large&&cast.skill.effect!=='guard'){
      const gather=ease(age/Math.max(1,t.manifest)), fall=1-ease((age-t.release)/600);
      this.stamp(style+'-seal'+f,origin.x,origin.y,14,1.04,.86,opacity*gather*fall);
      this.glow(style,focus.x,focus.y,1.45,opacity*gather*.32);
      if(cast.water) this.stamp('ripple'+f,cast.water.x,cast.water.y,15,1.08,.7,
        opacity*gather*.63,0,false,VAN_KIEM_TEXTURE);
      if(this.groups<=2)this.environment(record,cast,style,age,opacity*gather);
    }
    for(let i=cast.impacts.length-1;i>=0;i--){
      const hit=cast.impacts[i],elapsed=age-hit.at;
      if(elapsed>460||elapsed<0)continue;
      this.audio(record,cast,age,large?'shock':'contact',hit.id,hit.at,.24);
      const power=(1-elapsed/460)*opacity, size=.51+Math.min(1.03,elapsed/370)*(large?.74:.41);
      this.stamp(style+'-burst'+cycle(elapsed,83),hit.x,hit.y-10,9217,size,size,power,0,true);
      if(large)this.glow(style,hit.x,hit.y,.85,power*.54);
    }
    this.limit=350;
    return true;
  }
  environment(record,cast,style,age,intensity){
    const {x,y}=cast.focus,t=cast.timeline;
    const strength=ease((age-t.charge)/870)*intensity;
    if(strength<.07)return;
    for(let i=0;i<6;i++){
      const angle=windOrbits[i], offset=((age+i*107)/985)%1, radius=cycle(age,537)%3*14+75;
      this.stamp('dust'+cycle(age+i*74,115),x+Math.cos(angle)*radius*offset,
        y+Math.sin(angle)*radius*offset*.57,15,.43,.36,Math.sin(offset*Math.PI)*strength*.52,angle,false,VAN_KIEM_TEXTURE);
    }
    // Van Kiem owns its wind response while either its cast or tail is visible.
    if(this.scene.martialCombat?.cinematic.active)return;
    record.trees??=(this.scene.windSprites??[]).filter(tree=>Math.hypot(tree.x-x,tree.y-y)<230).slice(0,12);
    for(const tree of record.trees){
      const force=strength*(1-Math.hypot(tree.x-x,tree.y-y)/230);
      if(force<.07)continue;
      let state=this.wind.get(tree);
      if(!state){state={angle:tree.rotation,force:0,bend:0};this.wind.set(tree,state);}
      if(force>state.force){
        state.force=force;
        const gust=style==='sun'||style==='dragon'?.024:.031;
        state.bend=(Math.sign(x-tree.x)*gust+Math.sin(age*.012+tree.x)*.017)*force;
      }
    }
  }
  weapon(item,x,y,clock,intensity,angle=0){
    if(!this.available||this.used>=344)return false;
    const style=weaponArt[item.icon],f=cycle(clock,95);
    const direction=angle-Math.PI/2, dx=Math.cos(direction),dy=Math.sin(direction);
    const tip=item.kind==='spear'?23:item.kind==='hammer'?17:20;
    const glow=intensity===2?.85:intensity===1?.67:.38;
    if(!item.grade){
      if(item.kind==='spear'){
        const sway=Math.sin(clock*.007)*2;
        this.stamp('spear-wake'+f,x+dx*9-dy*(2+sway),y+dy*9+dx*(2+sway),
          9210,.23,.21,.7,direction+1.2);
      }
      if(intensity||Math.sin(clock*.003)>.95){
        this.stamp(style+'-crest'+f,x+dx*tip,y+dy*tip,9211,.19+intensity*.07,.19+intensity*.07,
          .65,direction,true);
      }
      return true;
    }
    const crest=style==='ice'?'ice-crystal':style==='ghost'?'ghost-soul':style+'-crest';
    for(let i=0;i<item.grade+1;i++){
      const distance=(clock*.019+i*8)%tip, sway=Math.sin(clock*.009+i)*3.4;
      this.stamp(crest+(f+i)%4,x+dx*distance-dy*sway,y+dy*distance+dx*sway,9210,
        .13+i*.042,.13+i*.042,glow*clamp((distance+3)/11),direction,true);
    }
    if(item.grade===4&&(intensity||Math.sin(clock*.002)>.16)){
      if(style==='chaos')this.dragon('chaos',x+dx*tip,y+dy*tip,clock,.22,glow,direction,0,9208);
      if(style==='sun')this.stamp('sun-crow'+Math.floor(clock/115)%8,x+dx*tip,y+dy*tip,9211,.21,.21,glow,direction*.3);
      if(style==='void')this.sword(x+dx*tip-dy*9,y+dy*tip+dx*9,.32,direction,glow,3);
    }
    if(item.grade===3&&style==='dragon'&&intensity)this.dragon(style,x+dx*tip,y+dy*tip,clock,.21,.65,direction,0,9208);
    if(item.grade>=2&&(style==='storm'||style==='violet')){
      this.stamp(style+'-bolt'+f,x+dx*13,y+dy*13,9212,.23,.26,
        glow,direction+Math.PI/2,true);
    }
    if(item.kind==='hammer')this.stamp('earth-rubble'+f,x+dx*tip,y+dy*tip,9211,.28,.22,glow,direction);
    if(intensity&&item.kind==='dao'){
      this.stamp(style+'-wake'+f,x+dx*15,y+dy*15,9211,.54,.44,glow,direction,true);
    }
    return true;
  }
}

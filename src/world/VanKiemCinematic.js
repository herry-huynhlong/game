import {borrowedSword} from './MartialTimeline.js';
import './van-kiem-cinematic.css';

export const VAN_KIEM_TEXTURE='van-kiem-cinematic';
export const VAN_KIEM_AUDIO=['gather','chime','seal','flight','strike','return'];
export const VAN_KIEM_RADIUS=260;
const signature='myriad-unite';
const TAU=Math.PI*2;
const COLUMNS=[18,76,144];
const clamp=t=>Math.min(1,Math.max(0,t));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
const ramp=(t,a,b)=>smooth((t-a)/(b-a));
const blend=(a,b,t)=>a+(b-a)*t;
const fade=(t,a,b)=>1-ramp(t,a,b);
const wave=(i,offset)=>((Math.imul(i+101,1103515245)^Math.imul(offset+17,2246822519))>>>0)%1021/1021;
const angleBetween=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
const visible=(view,x,y,margin)=>x>=view.left-margin&&x<=view.right+margin&&y>=view.top-margin&&y<=view.bottom+margin;
const depths={shadow:11,ground:13,dust:16,swordShadow:18,aerialMist:9205,crest:9207,inner:9209,outer:9211,
  trail:9213,projectile:9215,flare:9217};

export function isVanKiem(cast){return cast?.skill.id===signature;}

export function vanKiemPose(age){
  const rise=ramp(age,480,2370), landing=ramp(age,9050,10000);
  const levitate=rise*(1-landing);
  return {height:Math.round(82*levitate+(Math.sin(age*.0038)*3*levitate)),
    seal:ramp(age,100,720)*fade(age,1270,1800), call:ramp(age,1260,1770)*fade(age,3630,4620),
    channel:ramp(age,2810,3390)*fade(age,5220,5710), command:ramp(age,5210,5840)*fade(age,8240,9120),
    tuck:levitate, breath:Math.sin(age*.009)*levitate, fabric:Math.sin(age*.0068)*levitate};
}

function phantomPath(cast,i,age){
  const {origin,timeline}=cast;
  const target=cast.target?.alive?cast.target:cast.focus;
  const layer=i%6;
  const a=Math.floor(i/6)*TAU/24+layer*.57+age*(layer%2?-.00047:.00077);
  const r=[99,127,158,184,214,247][layer];
  const bias=[-38,-7,28,-27,21,47][layer];
  const ring={x:origin.x+Math.cos(a)*r+cast.ux*bias*.7,
    y:origin.y+Math.sin(a)*r*(.33+.055*(layer%3))+cast.uy*bias*.7,
    z:54+layer*16+Math.sin(a*1.8+i)*9};
  const inlet=(i%7)*TAU/7+layer*.17-.28;
  const entry=2050+wave(i,4)*1860, gather=ramp(age,entry,entry+1100+layer*68);
  const incoming={x:origin.x+Math.cos(inlet)*(270+wave(i,2)*280),
    y:origin.y+Math.sin(inlet)*(175+wave(i,3)*150),z:6+wave(i,5)*34};
  let x=blend(incoming.x,ring.x,gather), y=blend(incoming.y,ring.y,gather);
  let z=blend(incoming.z,ring.z,gather)+Math.sin(gather*Math.PI)*(28+layer*6);
  const release=timeline.release+95+wave(i,6)*2070, elapsed=age-release;
  const sent=elapsed>0, fly=clamp(elapsed/(390+wave(i,9)*580));
  let heading=sent?angleBetween(ring,target):gather<.87?angleBetween(incoming,ring):a+Math.PI*.5;
  if(sent){
    const moved=fly*fly*(1.65-.65*fly);
    x=blend(ring.x,target.x+Math.cos(inlet)*24,moved);
    y=blend(ring.y,target.y+Math.sin(inlet)*18,moved);
    z=blend(ring.z,9,moved)+Math.sin(fly*Math.PI)*(25+layer*8);
    heading=angleBetween({x:ring.x,y:ring.y-ring.z},{x:target.x,y:target.y-10});
  }else{
    const alignment=ramp(age,5040,5890)*gather;
    const aimed=angleBetween(ring,target);
    const d=Math.atan2(Math.sin(aimed-heading),Math.cos(aimed-heading));
    heading+=d*alignment;
  }
  return {x,y,z,heading,a,layer,sent,fly,gather,
    alpha:ramp(age,entry,entry+410)*fade(fly,.75,1)*fade(age,8710,9300)};
}

export class VanKiemCinematic {
  constructor(scene){
    this.scene=scene;
    this.pool=[];
    this.casts=new Map();
    this.winds=new Map();
    this.cueCount=0;
    this.title=document.createElement('div');
    this.title.className='van-kiem-title';
    this.title.setAttribute('aria-hidden','true');
    for(const [tag,message] of [['strong','VẠN KIẾM QUY TÔNG!'],['span','Vạn Kiếm Quy Nhất']]){
      const row=document.createElement(tag);row.textContent=message;this.title.append(row);
    }
    this.quote=scene.add.text(0,0,'Hôm nay, ta mượn kiếm chém kẻ địch!',{
      color:'#fff4d4',fontFamily:'Georgia, serif',fontSize:'15px',stroke:'#101c2b',strokeThickness:5,
      backgroundColor:'#162130',padding:{x:9,y:6},align:'center',
    }).setOrigin(.5,1).setDepth(20013).setVisible(false);
    scene.events.once('shutdown',()=>{
      this.clear();
      this.title.remove();
    });
  }
  get active(){return this.casts.size>0;}
  visibleCount(){return this.used??0;}
  clear(){
    this.casts.clear();
    this.begin();
    this.end();
  }
  finish(cast,complete){
    const store=this.casts.get(cast.id);
    if(!store)return;
    if(complete)store.done=true;
    else this.casts.delete(cast.id);
  }
  begin(){
    this.used=0;this.swordCount=0;this.shown=0;this.captionOn=false;
    this.titleOwner=null;
    this.quote.setVisible(false);
    for(const record of this.winds.values())record.force=0;
  }
  stamp(frame,x,y,depth,sx=1,sy=sx,alpha=1,angle=0,add=false){
    if(alpha<.025||this.used>=386)return false;
    if(!visible(this.scene.cameras.main.worldView,x,y,frame.startsWith('blade')?70:230))return false;
    const i=this.used++;
    const image=this.pool[i]??(this.pool[i]=this.scene.add.image(0,0,VAN_KIEM_TEXTURE,frame));
    if(image.frame.name!==frame)image.setFrame(frame);
    if(image.depth!==depth)image.setDepth(depth);
    if(image.blendMode!==(add?1:0))image.setBlendMode(add?1:0);
    image.setPosition(Math.round(x),Math.round(y)).setScale(sx,sy).setAlpha(alpha).setRotation(angle).setVisible(true);
    return true;
  }
  banner(cast,t,opacity){
    if(this.captionOn)return;
    this.captionOn=true;
    const scene=this.scene,zoom=scene.cameras.main.zoom;
    if(t>=1380&&t<2450){
      this.quote.setPosition(cast.origin.x,cast.origin.y-vanKiemPose(t).height-54)
        .setScale(1/Math.max(.62,zoom)).setAlpha(ramp(t,1380,1540)*fade(t,2230,2450)).setVisible(true);
    }
    if(t>=2340&&t<4380){
      this.titleOwner=cast.id;
      if(!this.title.isConnected)document.body.append(this.title);
      this.title.style.opacity=String(ramp(t,2340,2780)*fade(t,3650,4380)*opacity);
      this.title.style.transform='translate(-50%,'+Math.round(-14*fade(t,2340,2800))+'px)';
    }
  }
  audio(store,cast,t,settings){
    const scene=this.scene,view=scene.cameras.main.worldView;
    if(!scene.inSceneryView(cast.origin,80)||scene.sound.locked)return;
    const cue=(key,at,volume)=>{
      if(t<at||store.played.has(key))return;
      store.played.add(key);
      if(t-at>185||!scene.cache.audio.exists('van-kiem-'+key))return;
      const pan=Math.max(-.65,Math.min(.65,(cast.origin.x-view.centerX)/view.width));
      if(scene.sound.play('van-kiem-'+key,{volume,pan}))this.cueCount++;
    };
    cue('gather',125,.27);cue('chime',1500,.32);cue('seal',4310,.30);cue('flight',6040,.25);
    const impact=cast.impacts[0];
    if(impact){
      cue('strike',impact.at,.34);
      if(settings.shake&&!store.shook){
        store.shook=true;
        if(t-impact.at<150)scene.cameras.main.shake(150,.0018);
      }
    }
    cue('return',8960,.23);
  }
  bendTrees(store,cast,t){
    const push=ramp(t,530,2270)*fade(t,8820,10000);
    for(const sprite of store.trees){
      const force=push*(1-Math.hypot(sprite.x-cast.origin.x,sprite.y-cast.origin.y)/310);
      if(force<=.02)continue;
      let old=this.winds.get(sprite);
      if(!old){old={angle:sprite.rotation,force:0};this.winds.set(sprite,old);}
      if(force<=old.force)continue;
      old.force=force;
      const lean=sprite.x<cast.origin.x?1:-1;
      sprite.setRotation(old.angle+(lean*.035+Math.sin(t*.011+sprite.x)*.028)*force);
    }
  }
  draw(cast,t,settings){
    if(!isVanKiem(cast)||!this.scene.textures.exists(VAN_KIEM_TEXTURE))return false;
    let store=this.casts.get(cast.id);
    if(!store){
      const trees=(this.scene.windSprites??[]).filter(sprite=>
        Math.hypot(sprite.x-cast.origin.x,sprite.y-cast.origin.y)<310).slice(0,14);
      store={cast,trees,played:new Set()};
      this.casts.set(cast.id,store);
    }
    const primary=this.shown++===0;
    this.audio(store,cast,t,settings);
    this.bendTrees(store,cast,t);
    if(primary)this.banner(cast,t,1);
    const {x,y}=cast.origin,z=vanKiemPose(t).height;
    const frame=Math.floor(t/112),detail=primary?settings.detail:Math.max(0,settings.detail-1);
    const build=ramp(t,140,3470), dissolve=fade(t,9060,10900);
    const intensity=(settings.flash?1:.68)*dissolve;
    const outline=ramp(t,2400,4260)*dissolve;
    this.stamp('shadow0',x,y+2,depths.shadow,.25+z*.004,.16+z*.002, .95-z*.005);
    this.stamp('silver0',x,y,depths.ground,2.5,1.7,build*.43*intensity,0,true);
    this.stamp('ground'+frame%6,x,y+2,depths.ground,.39+build*1.38,.36+build*1.13,build*.91*dissolve);
    const dirt=ramp(t,90,470)*fade(t,1480,3330);
    this.stamp('dust'+frame%8,x,y-8,depths.dust,1.1+build*.9,.83+build*.24,dirt*.77);
    this.stamp('amber0',x-cast.ux*18,y-17-z*.5,depths.crest,1.12+build*1.45,.75+build*1.31,intensity*(.23+build*.37),0,true);
    if(outline>.025){
      this.stamp('mist'+frame%8,x+100,y-z-78,depths.aerialMist,2.5,1.7,.63*outline,.08);
      this.stamp('mist'+(frame+4)%8,x-112,y-z-102,depths.aerialMist,2.0,1.36,.61*outline,-.12);
      this.stamp('heaven'+frame%6,x,y-z-52,depths.inner,1.31+outline*.28,1.18,outline*.89);
      this.stamp('heaven'+(frame+3)%6,x-20,y-z-120,depths.inner,1.06,.91,outline*.50,-.05);
      this.stamp('blade4',x+17,y-z-138,depths.crest,2.02,2.63,outline*.43*fade(t,5830,7140),-.06);
    }
    const count=COLUMNS[detail];
    for(let i=0;i<count;i++){
      const p=phantomPath(cast,i,t);
      if(p.alpha<.07)continue;
      const sy=p.y-p.z, scale=.20+p.layer*.021+wave(i,11)*.10+(p.sent?.065:0);
      const centerClearance=clamp(Math.hypot(p.x-x,sy-(y-z-15))/43);
      const alpha=p.alpha*(.63+p.layer*.041)*intensity*(.23+.77*centerClearance);
      const depth=p.layer<=2?depths.inner:depths.outer;
      if(i%(detail===2?3:4)===0&&(p.gather<.95||p.sent))
        this.stamp('ribbon'+(frame+i)%8,p.x-Math.cos(p.heading)*24,sy-Math.sin(p.heading)*24,
          depths.trail,p.sent?.62:.37,.34,alpha*.63,p.heading,true);
      if(this.stamp('blade'+i%5,p.x,sy,depth,scale,scale,alpha,p.heading+Math.PI/2))this.swordCount++;
    }
    for(let i=0;i<cast.timeline.count;i++){
      const enter=fade(t,10000,10200)*ramp(t,1870+i*92,2290+i*90);
      if(enter<=.02)continue;
      const p=borrowedSword(cast,i,t), ySword=p.y-p.z;
      const shot=cast.projectiles[i];
      const direction=p.angle;
      const distance=shot&&!shot.done?44:26;
      const clearance=shot&&!shot.done?1:clamp(Math.hypot(p.x-x,ySword-y+z+15)/49);
      this.stamp('ribbon'+(frame+i)%8,p.x-Math.cos(direction)*distance,ySword-Math.sin(direction)*distance,
        depths.trail,shot&&!shot.done?1.04:.65,.60,enter*intensity*(.25+.75*clearance),direction,true);
      const grade=cast.swords[i]?.instance.grade??1;
      if(this.stamp('blade'+grade,p.x,ySword,depths.projectile,.59,.59,enter*(.42+.58*clearance),direction+Math.PI/2))this.swordCount++;
      if(p.z>18)this.stamp('shadow0',p.x,p.y,depths.swordShadow,.17,.1,enter*.55);
      const sword=cast.swords[i];
      if(t<5060&&sword&&!sword.representative&&sword.point)
        this.stamp('amber0',sword.point.x,sword.point.y-10,depths.flare,.31,.16,enter*.73,0,true);
    }
    const motes=detail===2?30:detail===1?16:8;
    for(let i=0;i<motes;i++){
      const path=1-((t+i*241)%1640)/1640, angle=wave(i,7)*TAU+t*.00056;
      const radius=(33+wave(i,10)*212)*path+6;
      const px=x+Math.cos(angle)*radius,py=y+Math.sin(angle)*radius*.55-(1-path)*(34+z*.61);
      this.stamp('mote'+(frame+i)%6,px,py,depths.flare,.41,.41,build*intensity*path*.82,angle);
    }
    this.impacts(cast,t,settings);
    return true;
  }
  impacts(cast,t,settings){
    for(const hit of cast.impacts.slice(-10)){
      const age=t-hit.at;
      if(age<0||age>=1300)continue;
      const f=Math.min(7,Math.floor(age/83)),rise=Math.min(7,Math.floor(age/113));
      const {x,y}=hit;
      this.stamp('ripple'+rise,x,y+3,depths.ground,1.17,1.12,fade(age,220,1060)*.91);
      this.stamp('dust'+rise,x,y-13,depths.dust,1.18,.94,fade(age,390,1230)*.91);
      if(age<780)this.stamp('impact'+f,x,y-35,depths.flare,1.10,1.15,fade(age,210,780)*(settings.flash?.95:.69),0,settings.flash);
      this.stamp('amber0',x,y-5,depths.flare,1.38,.67,fade(age,45,780)*(settings.flash?.88:.52),0,true);
    }
  }
  tails(clock){
    for(const [id,store] of this.casts){
      if(!store.done)continue;
      const age=clock-store.cast.at-10000;
      if(age>=1120){this.casts.delete(id);continue;}
      const {x,y}=store.cast.origin,alpha=fade(age,30,1090);
      this.stamp('ground'+Math.floor(age/105)%6,x,y,depths.ground,1.77*alpha,1.49*alpha,.55*alpha);
      this.stamp('silver0',x,y,depths.ground,1.34,1.01,.31*alpha,0,true);
      this.stamp('dust'+Math.min(7,Math.floor(age/134)),x,y-9,depths.dust,.92,.72,.35*alpha);
    }
  }
  end(){
    for(let i=this.used;i<this.pool.length;i++)if(this.pool[i].visible)this.pool[i].setVisible(false);
    if(!this.titleOwner&&this.title.isConnected)this.title.remove();
    for(const [sprite,record] of this.winds)if(!record.force){
      if(sprite.active)sprite.setRotation(record.angle);
      this.winds.delete(sprite);
    }
  }
}

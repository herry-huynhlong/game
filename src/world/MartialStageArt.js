import {borrowedSword,martialAltitude,projectileSkill} from './MartialTimeline.js';
import {makeWorldSpeech} from './SocialVisuals.js';

const palettes={wind:[0x3b9b8a,0xa7f4d3,0xf7ffe5],sword:[0x556ba6,0x94c8dd,0xffe3a3],thunder:[0x5a4498,0xb895fa,0xf4e8ff],
  fire:[0x923730,0xfb8240,0xffe995],ice:[0x346f9d,0x7cc9ed,0xd9f9ff],sun:[0x9c5530,0xf5b545,0xffeab3]};
const tau=Math.PI*2;
const clamp=t=>Math.max(0,Math.min(1,t));
const fade=(t,start,end)=>1-clamp((t-start)/(end-start));
const ellipse=(x,y,a,w,h)=>[Math.round(x+Math.cos(a)*w),Math.round(y+Math.sin(a)*h)];
function stroke(g,points){
  g.beginPath();g.moveTo(...points[0]);
  for(let i=1;i<points.length;i++)g.lineTo(...points[i]);
  g.strokePath();
}
function solid(g,color,alpha,points){
  g.fillStyle(color,alpha).beginPath();g.moveTo(...points[0]);
  for(let i=1;i<points.length;i++)g.lineTo(...points[i]);
  g.closePath().fillPath();
}
function sigils(g,x,y,r,t,colors,opacity,detail){
  const [dark,middle,light]=colors;
  for(let layer=0;layer<=detail;layer++){
    const size=r-layer*9;
    if(size<12)break;
    g.lineStyle(layer===0?2:1,layer===1?light:middle,opacity*(.68+layer*.08)).strokeEllipse(x,y,size*2,size*.79);
    const knots=8+layer*4;
    for(let j=0;j<knots;j++){
      const angle=j*tau/knots+t*(layer%2?-.001:.001);
      const [u,v]=ellipse(x,y,angle,size,size*.395);
      solid(g,dark,opacity,[[u-4,v],[u,v-5],[u+4,v],[u,v+5]]);
      g.fillStyle(light,opacity).fillRect(u-1,v-2,2,4);
    }
  }
}

export class MartialStageProps {
  constructor(scene){this.scene=scene;this.swords=[];this.bubbles=[];this.titles=[];this.captions=[];}
  begin(){this.used=0;this.spoken=0;this.titled=0;this.captions.length=0;}
  sword(point,icon,opacity){
    if(this.used>=44||opacity<=0)return;
    const i=this.used++;
    const sprite=this.swords[i]??(this.swords[i]=this.scene.add.image(0,0,'martial-arms',icon).setDepth(9001));
    const texture=this.scene.textures.get('martial-arms');
    if(sprite.texture!==texture||Number(sprite.frame.name)!==icon)sprite.setTexture('martial-arms',icon);
    sprite.setPosition(Math.round(point.x),Math.round(point.y-point.z)).setRotation(point.angle+Math.PI/2)
      .setScale(1.12).setAlpha(opacity).setVisible(true);
  }
  caption(cast,time,zoom){
    const {visualSlogan,slogan,chant,release}=cast.timeline;
    const text=visualSlogan??slogan;
    if(!text||time<chant||time>release+1350)return;
    const title=time>=chant+Math.min(850,(release-chant)*.6), y=cast.origin.y-martialAltitude(cast,time)-45;
    const x=cast.origin.x, message=text[title?1:0], scale=1/Math.max(.7,zoom);
    if((title?this.titled>=2:this.spoken>=3)||this.captions.some(other=>
      Math.abs(x-other.x)<(other.message===message?340:235)*scale&&Math.abs(y-other.y)<(title?85:56)*scale))return;
    this.captions.push({x,y,message});
    const pool=title?this.titles:this.bubbles,index=title?this.titled++:this.spoken++;
    const obj=pool[index]??(pool[index]=title?this.scene.add.text(0,0,'',{
      color:'#f9de94',stroke:'#302820',strokeThickness:4,fontFamily:'Georgia, serif',fontStyle:'bold',
      fontSize:'21px',letterSpacing:2,align:'center',
    }).setOrigin(.5,1).setDepth(20014):makeWorldSpeech(this.scene));
    if(obj.text!==message)obj.setText(message);
    obj.setPosition(x,y).setScale(scale).setAlpha(title?fade(time,release+650,release+1350):1).setVisible(true);
  }
  end(){
    for(const [items,used] of [[this.swords,this.used],[this.bubbles,this.spoken],[this.titles,this.titled]])
      for(let i=used;i<items.length;i++)items[i].setVisible(false);
  }
}

export function drawFlightCast(ground,sky,props,cast,time,settings){
  const {skill,origin,timeline}=cast;
  const signature=skill.id==='myriad-unite';
  if(!signature&&!projectileSkill(skill))return false;
  const colors=palettes[skill.element]??palettes.sword;
  const [dark,middle,light]=colors, opacity=fade(time,timeline.aftermath,timeline.complete);
  const z=martialAltitude(cast,time);
  if(signature){
    const forming=clamp(time/1700);
    ground.fillStyle(0x1b2833,.33*opacity).fillEllipse(origin.x,origin.y,25+z*.35,8+z*.11);
    ground.fillStyle(0x25344b, .23*forming*opacity).fillEllipse(origin.x,origin.y,168,62);
    sigils(ground,origin.x,origin.y,32+forming*76,time,colors,.78*opacity,settings.detail);
    if(time>=1800){
      for(let i=0;i<8;i++){
        const angle=i*tau/8+time*.00042, p=ellipse(origin.x,origin.y,angle,88,34);
        const q=ellipse(origin.x,origin.y-z-34,angle+.7,57,20);
        sky.lineStyle(1,i%2?middle:light,.44*opacity);
        stroke(sky,[p,[(p[0]+q[0])/2,p[1]-22],q]);
        solid(sky,light,.61*opacity,[[q[0],q[1]-5],[q[0]+2,q[1]],[q[0],q[1]+4],[q[0]-2,q[1]]]);
      }
    }
    for(let i=0;i<=settings.detail;i++){
      const altitude=22+z+i*17;
      const y=origin.y-altitude, radius=(27+forming*(44+i*15));
      sigils(sky,origin.x,y,radius,time*(i%2?-1:1),colors,opacity*(.48+i*.12),1);
      if(i===1)sky.lineStyle(1,light,.65*opacity).lineBetween(origin.x-radius,y,origin.x+radius,y);
    }
    if(time>=2000){
      const maximum=[3,6,8][settings.detail];
      for(let i=0;i<Math.min(maximum,cast.timeline.count);i++){
        const point=borrowedSword(cast,i,time), arm=cast.swords[i];
        const trail=borrowedSword(cast,i,Math.max(2000,time-115));
        const alpha=opacity*clamp((time-2000-i*90)/460);
        if(!alpha)continue;
        sky.lineStyle(i%3===0?3:2,middle,.52*alpha).lineBetween(trail.x,trail.y-trail.z,point.x,point.y-point.z);
        sky.lineStyle(1,light,.77*alpha).lineBetween(point.x-4,point.y-point.z+2,point.x+6,point.y-point.z-4);
        props.sword(point,arm?.icon??3,alpha*(arm?1:.66));
        if(arm?.point&&!arm.representative&&time<5000){
          sky.fillStyle(light,.65*alpha).fillRect(arm.point.x-1,arm.point.y-14,3,3);
        }
      }
    }
  }else{
    if(time<timeline.release){
      const t=clamp(time/timeline.release);
      const x=origin.x+cast.ux*12,y=origin.y+cast.uy*10-15;
      const n=skill.grade===0?2:4+settings.detail*3;
      for(let i=0;i<n;i++){
        const [u,v]=ellipse(x,y,time*.013+i*tau/n,17*(1-t)+4,12*(1-t)+3);
        sky.lineStyle(1,middle,.30+t*.5).lineBetween(u,v,x,y);
        sky.fillStyle(light,.55+t*.4).fillRect(u,v,2,2);
      }
    }
    for(const p of cast.projectiles){
      if(p.done)continue;
      const size=skill.id==='flame-burst'?19:skill.id==='jade-wave'?15:12;
      const y=p.y-p.z, tail=size*2;
      const xy=(a,b)=>[Math.round(p.x+p.ux*a-p.uy*b),Math.round(y+p.uy*a+p.ux*b)];
      const hot=skill.element==='fire';
      const narrow=skill.element==='ice'||skill.element==='thunder';
      if(hot){
        const root=size*.6;
        solid(sky,dark,.82,[xy(-tail,0),xy(-10,-root),xy(5,-root),xy(size,0),xy(5,root),xy(-10,root)]);
        solid(sky,middle,.94,[xy(-tail*.67,0),xy(-4,-root*.79),xy(8,-root*.57),xy(size*.83,0),xy(8,root*.59),xy(-6,root*.75)]);
        solid(sky,light,.9,[xy(-2,-root*.45),xy(8,-3),xy(11,1),xy(5,5),xy(-4,2)]);
      }else{
        solid(sky,dark,.60,[xy(-tail,0),xy(-8,-size*.5),xy(size*.82,0),xy(-8,size*.5)]);
        solid(sky,middle,.95,[xy(-tail*.65,0),xy(-4,-(narrow?3:size*.36)),xy(size,0),xy(-3,narrow?3:size*.28)]);
        solid(sky,light,.91,[xy(-8,0),xy(4,-3),xy(size,0),xy(4,2)]);
      }
      for(let i=0;i<=settings.detail+(hot?2:0);i++){
        const [u,v]=xy(-10-i*4,Math.sin(i*3+time*.035)*size*.47);
        sky.fillStyle(i%2?middle:light,.68).fillRect(u,v,hot?3:2,2);
      }
      if(skill.element==='thunder'){
        sky.lineStyle(1,light,.85);stroke(sky,[xy(2,0),xy(-3,-8),xy(-14,-4),xy(-20,-13)]);
      }else if(skill.element==='ice'){
        solid(sky,light,.83,[xy(-10,-4),xy(-5,-10),xy(0,-3),xy(-5,1)]);
        solid(sky,middle,.78,[xy(-13,3),xy(-7,3),xy(-9,9)]);
      }else if(skill.id==='jade-wave'){
        sky.lineStyle(1,light,.75);stroke(sky,[xy(-20,-7),xy(-9,-6),xy(3,-10),xy(9,-6)]);
      }
    }
  }
  for(const impact of cast.impacts.slice(-8)){
    const elapsed=time-impact.at;
    if(elapsed<0||elapsed>410)continue;
    const t=elapsed/410, r=8+t*(signature?33:24), alpha=1-t;
    ground.lineStyle(2,middle,alpha*.82).strokeEllipse(impact.x,impact.y,r*1.9,r*.83);
    for(let i=0;i<5+settings.detail*3;i++){
      const [x,y]=ellipse(impact.x,impact.y-7,i*tau/11,r,r*.6);
      const [u,v]=ellipse(impact.x,impact.y-7,i*tau/11,r-6,r*.6-3);
      sky.lineStyle(1,settings.flash?light:middle,alpha*.85).lineBetween(u,v,x,y);
    }
  }
  return true;
}

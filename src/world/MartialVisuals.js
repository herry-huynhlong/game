import {GRADES} from '../dao/MartialRegistry.ts';

const TAU=Math.PI*2;
const palette={wind:[0x68c9ae,0xeaffeb],earth:[0xa27a42,0xe2bc76],fire:[0xf25b35,0xffdc7b],wood:[0x64c46b,0xe3f191],
  thunder:[0x8362e9,0xf3d8ff],ice:[0x4ea8d7,0xcefcff],shadow:[0x594066,0xd494ed],sword:[0xa99fcb,0xfff0ba],sun:[0xf38c40,0xfff196]};
const clamp=n=>Math.max(0,Math.min(1,n));
const px=Math.round;
const polar=(x,y,r,a)=>[px(x+Math.cos(a)*r),px(y+Math.sin(a)*r)];
const angle=c=>Math.atan2(c.uy,c.ux);
const hash=(i,t)=>((Math.imul(i+1009,1597334677)^Math.imul(t+91,3812015801))>>>0)%1009/1009;
const line=(g,points)=>{
  if(points.length<2)return;
  g.beginPath();g.moveTo(...points[0]);
  for(let i=1;i<points.length;i++)g.lineTo(...points[i]);
  g.strokePath();
};
const shape=(g,pts,color,alpha=1)=>{
  g.fillStyle(color,alpha);
  g.beginPath();g.moveTo(...pts[0]);
  for(let i=1;i<pts.length;i++)g.lineTo(...pts[i]);
  g.closePath();g.fillPath();
};
const offset=(x,y,a,u,v)=>[px(x+Math.cos(a)*u-Math.sin(a)*v),px(y+Math.sin(a)*u+Math.cos(a)*v)];
const lattice=(g,x,y,r,rot,outer,light,alpha,layers=1)=>{
  for(let layer=0;layer<layers;layer++){
    const radius=r-layer*10;
    if(radius<5)continue;
    g.lineStyle(layer?1:2,layer?light:outer,alpha).strokeEllipse(x,y,radius*2,radius*.92);
    for(let i=0;i<8;i++){
      const a=rot*(layer%2?-1:1)+i*TAU/8, p=polar(x,y,radius,a);
      p[1]=px(y+(p[1]-y)*.46);
      line(g,[p,[p[0]+4,p[1]-3],[p[0]+7,p[1]],[p[0]+3,p[1]+3]]);
    }
  }
};
const sword=(g,x,y,a,size,base,light,alpha)=>{
  const poly=pts=>pts.map(([u,v])=>offset(x,y,a,u*size,v*size));
  shape(g,poly([[-9,-2],[13,-4],[29,0],[13,4],[-9,2]]),base,alpha);
  shape(g,poly([[-7,0],[15,-2],[29,0],[16,2]]),light,alpha);
  shape(g,poly([[-11,-7],[-7,-5],[-7,6],[-11,8],[-12,1],[-20,2],[-20,-2],[-12,-2]]),base,alpha);
};
const bolt=(g,x,y,height,spread,seed,base,light,alpha,branches)=>{
  const vertices=[[px(x),px(y-height)]];
  for(let i=1;i<8;i++)vertices.push([px(x+(hash(i,seed)-.5)*spread),px(y-height+i*height/8)]);
  vertices.push([px(x),px(y)]);
  g.lineStyle(5,base,alpha*.46);line(g,vertices);
  g.lineStyle(2,light,alpha);line(g,vertices);
  for(let i=0;i<branches;i++){
    const [u,v]=vertices[2+i%5],sign=i%2?1:-1;
    g.lineStyle(1,light,alpha*.73);
    line(g,[[u,v],[u+sign*(9+i*3),v+8],[u+sign*(17+i*4),v+6],[u+sign*(22+i*4),v+17]]);
  }
};
const dragon=(g,x,y,a,size,t,base,light,alpha,electric)=>{
  const points=Array.from({length:13},(_,i)=>offset(x,y,a,-i*6*size,Math.sin(i*.65+t*7)*i*.9*size));
  for(let i=points.length-1;i>0;i--){
    const [u,v]=points[i], [nextX,nextY]=points[i-1];
    const width=Math.max(2,px((6-i*.35)*size));
    g.lineStyle(width+3,base,alpha).lineBetween(u,v,nextX,nextY);
    g.lineStyle(width,light,alpha*.77).lineBetween(u,v,nextX,nextY);
    if(i%2===0)shape(g,[[u-3,v],[u,v-5-width],[u+4,v]],base,alpha);
  }
  const head=pts=>pts.map(([u,v])=>offset(x,y,a,u*size,v*size));
  shape(g,head([[-10,-4],[-15,-13],[-6,-10],[-1,-6],[7,-7],[13,-3],[10,1],[14,4],[4,7],[-9,5]]),base,alpha);
  shape(g,head([[-7,-5],[1,-5],[8,-3],[11,0],[1,1],[-7,3]]),light,alpha);
  shape(g,head([[0,-4],[4,-4],[3,-2],[0,-2]]),0x231737,alpha);
  g.lineStyle(electric?2:1,light,alpha);
  line(g,head([[6,0],[12,-6],[20,-8]]));line(g,head([[7,3],[16,7],[21,4]]));
};
const crow=(g,x,y,r,t,base,light,alpha)=>{
  const lift=r*(.22+.20*Math.sin(t*15));
  for(const side of [-1,1]){
    const w=u=>x+side*u*r;
    shape(g,[[x,y],[w(.38),y-lift],[w(.73),y-lift-r*.19],[w(1),y-lift-r*.33],
      [w(.9),y-lift+r*.08],[w(.79),y-lift+r*.04],[w(.72),y+r*.16],[w(.55),y+r*.13],[w(.36),y+r*.30],[x,y+r*.24]],base,alpha);
    shape(g,[[x,y],[w(.42),y-lift],[w(.80),y-lift-r*.12],[w(.67),y-lift+r*.06],[w(.38),y+r*.14]],light,alpha*.84);
    g.lineStyle(2,light,alpha);line(g,[[w(.42),y-lift],[w(.57),y+r*.05],[w(.50),y+r*.24]]);
  }
  shape(g,[[x-r*.12,y-r*.16],[x,y-r*.28],[x+r*.13,y-r*.11],[x+r*.21,y-r*.08],[x+r*.1,y],[x+r*.11,y+r*.31],
    [x+r*.24,y+r*.56],[x,y+r*.45],[x-r*.18,y+r*.58],[x-r*.08,y+r*.25]],light,alpha);
};
const flecks=(g,x,y,r,age,n,color,alpha,element)=>{
  g.fillStyle(color,alpha);
  for(let k=0;k<n;k++){
    const phase=(age*1.4+hash(k,4))%1, bearing=k*2.399;
    const [u,v]=polar(x,y,r*(.13+phase*.83),bearing);
    const lift=element==='fire'||element==='sun'?phase*28:0;
    g.fillRect(u,px(v-lift),element==='wood'?4:2,2);
  }
};

export function drawMartial(g,sky,c,elapsed,detail=2,flash=true){
  const s=c.skill, [base,light]=palette[s.element], grade=GRADES[s.grade];
  const released=elapsed>=s.windup, t=clamp(elapsed/s.windup);
  const length=s.hits>1?s.duration:0;
  const age=released?(elapsed-s.windup)/Math.max(480,length+580):t;
  const alpha=released?1-clamp((age-.62)*2.7):.32+t*.52;
  const initial=c.origin, x=s.form==='self'||s.form==='step'?initial.x:c.focus.x;
  const y=s.form==='self'||s.form==='step'?initial.y:c.focus.y;
  const a=angle(c), radius=s.width>35?s.width:Math.min(90,Math.max(24,s.range*.23));
  const clock=Math.floor(elapsed/70), count=[4,10,18][detail];
  if(alpha<=0)return;
  if(!released||s.grade>=2&&s.form==='field'){
    const layers=s.grade===4?3:s.grade===3?2:1;
    lattice(g,initial.x,initial.y,18+s.grade*10+12*t,clock*.10,grade.color,light,alpha*.66,layers);
    flecks(g,initial.x,initial.y,20+s.grade*14,1-t,count,light,alpha*.56,s.element);
    if(t<.42&&!released)return;
  }
  if(s.grade>=3&&released){
    lattice(g,x,y,radius*(.72+.25*clamp(age*5)),age*2.9,base,grade.color,alpha*.68,s.grade===4?3:2);
    g.fillStyle(base,.085*alpha).fillEllipse(x,y,radius*2,radius);
    if(c.water){
      for(let i=0;i<=detail;i++){
        const grow=clamp(age*1.6-i*.18);
        if(grow)g.lineStyle(1,0x9edbc2,(1-grow)*alpha*.8).strokeEllipse(c.water.x,c.water.y,10+grow*44,6+grow*18);
      }
    }
  }
  if(!released&&s.grade<3)return;
  const p=s.vfx;
  if(p==='sky-split'){
    const descent=released?clamp(age*4):.32+t*.22,yTip=y-190*(1-descent);
    const dimensions=[[-13,-105],[13,-105],[13,-42],[8,-20],[0,0],[-8,-20],[-13,-42]];
    const anchor=(points)=>points.map(([u,v])=>[px(x+u),px(yTip+v)]);
    shape(sky,anchor(dimensions),base,alpha);
    shape(sky,anchor([[-12,-101],[-4,-104],[-2,-24],[0,-4],[-9,-24]]),light,alpha);
    shape(sky,anchor([[6,-104],[12,-102],[11,-44],[5,-23],[0,-5],[4,-45]]),grade.color,alpha*.78);
    shape(sky,anchor([[-31,-104],[-19,-114],[-5,-108],[0,-138],[5,-108],[21,-115],[31,-104],[12,-100],[-12,-100]]),grade.color,alpha);
    sky.lineStyle(1,light,alpha*.8);
    for(let i=0;i<4;i++)line(sky,anchor([[-4,-85+i*15],[2,-91+i*15],[5,-83+i*15],[-2,-81+i*15]]));
    lattice(g,x,y,18+descent*62,descent*2.2,base,grade.color,alpha*.54,2);
    if(released)for(let i=0;i<7;i++){
      const angle=i*TAU/7;
      g.lineStyle(2,base,alpha*.75);
      line(g,[polar(x,y,17,angle),polar(x,y,35*descent+25,angle+.09),polar(x,y,55*descent+27,angle-.04)]);
    }
  }else if(['blade','triple','needle','jade','converge','electric-blade','great-sword','sword-rain'].includes(p)){
    const n=p==='sword-rain'?[5,10,18][detail]:p==='triple'||p==='converge'?3:1;
    const dist=released?Math.min(s.range,24+s.range*clamp(age*2.1)):27;
    for(let i=0;i<n;i++){
      const spread=(i-(n-1)/2)*(p==='sword-rain'?9:15);
      const [u,v]=offset(initial.x,initial.y,a,dist-i%3*12,spread*(released?1:.65));
      sword(sky,u,v,a,p==='great-sword'?2.2:p==='sky-split'?2.75:p==='needle'?1.4:p==='sword-rain'?.6:.85,base,light,alpha);
      if(p==='electric-blade'||p==='sky-split'){
        sky.lineStyle(2,p==='sky-split'?0xf7da92:light,alpha*.66);
        line(sky,Array.from({length:7},(_,i)=>offset(u,v,a,i*12-48,(hash(i,clock)-.5)*(p==='sky-split'?48:22))));
      }
    }
  }else if(p==='sword-array'||p==='void-field'||p==='four-swords'){
    const n=p==='four-swords'?4:[5,9,14][detail];
    for(let i=0;i<n;i++){
      const theta=TAU*i/n+(p==='four-swords'?0:age*2);
      const [u,v]=polar(x,y,radius*.74,theta);
      sword(sky,u,v-18-Math.cos(age*9+i)*8,theta+Math.PI/2,p==='four-swords'?1.76:.63,base,grade.color,alpha);
    }
    if(p==='void-field'){
      sky.lineStyle(2,light,alpha*.55);
      for(let i=0;i<4;i++)line(sky,[polar(x,y,radius*.36,i*1.57),polar(x,y,radius*.64,i*1.57+.13),polar(x,y,radius*.87,i*1.57-.14)]);
    }
  }else if(['five-bolts','thunder-seal','thunder-host','storm-earth','chaos-storm','lightning-dragons','chaos-body'].includes(p)){
    const n=p==='five-bolts'?5:p==='thunder-host'?4:p==='chaos-storm'?5:1;
    const high=s.grade>=3;
    if(high){
      const bank=p==='chaos-storm'?9:5;
      for(let i=0;i<bank;i++){
        const theta=i*TAU/bank+age*1.3, [u,v]=polar(x,y-115,radius*(p==='chaos-storm'?.64:.35),theta);
        sky.fillStyle(i%2?0x2a2850:0x191e35,alpha*.69).fillEllipse(u,v,54+i%3*16,16+i%2*9);
      }
    }
    if(p==='lightning-dragons')for(let i=0;i<[3,5,9][detail];i++){
      const arrival=clamp((age-i*.047)*4), theta=i*TAU/9+age*3, [u,v]=polar(x,y-105+arrival*91,radius*(.87-arrival*.44),theta);
      dragon(sky,u,v,theta+Math.PI/2,1.10+arrival*.31,age+i*.03,base,light,alpha*(.23+arrival*.77),true);
      if(arrival>.86&&i%2===0)bolt(sky,u,v+20,31,14,clock+i,base,light,alpha*.7,1);
    }else for(let i=0;i<n;i++){
      const [u,v]=polar(x,y,n===1?0:radius*.54,i*TAU/n);
      bolt(sky,u,v,high?160:89,high?56:28,clock+i,base,flash?light:base,alpha*(released?1:.38),detail+1);
    }
  }else if(['dragon-breath','dragon-descent','nine-suns','crow','sun-body','fire-field','fire-ring','palm','ember'].includes(p)){
    const sun=p==='crow'||p==='sun-body'||p==='nine-suns';
    if(sun){
      const n=p==='nine-suns'?9:1;
      for(let i=0;i<n;i++){
        const [u,v]=p==='crow'?[initial.x-c.ux*31,initial.y-c.uy*22-88]:
          polar(x,y-73,n===1?0:radius*.5,TAU*i/n+age);
        const size=n===1?29:9;
        sky.fillStyle(base,alpha*.87).fillCircle(u,v,size+5);sky.fillStyle(light,alpha*.95).fillCircle(u,v,size);
        sky.lineStyle(2,grade.color,alpha*.68).strokeCircle(u,v,size+10);
      }
      if(p!=='nine-suns'){
        const travel=p==='crow'?clamp(age*2.2):1;
        crow(sky,initial.x+(x-initial.x)*travel,initial.y+(y-initial.y)*travel-87+travel*44,
          Math.max(38,radius*.81),age,base,light,alpha);
      }
    }else if(p.startsWith('dragon')||p==='fire-field'){
      const [u,v]=p==='dragon-breath'?offset(initial.x,initial.y,a,44+s.range*.63*clamp(age*2),0):
        polar(x,y-32,age*6,radius*.43);
      dragon(sky,u,v,p==='dragon-breath'?a:age*6+Math.PI/2,1.74,age,base,light,alpha,false);
    }
    for(let i=0;i<(s.grade>=3?count:Math.min(8,count));i++){
      const size=5+hash(i,clock)*8, bearing=i*2.40;
      const [u,v]=p==='palm'?offset(initial.x,initial.y,a,s.range*clamp(age*2.2),(hash(i,4)-.5)*radius):
        polar(x,y,radius*(p==='fire-ring'?.46:hash(i,3)),bearing);
      shape(sky,[[u-size,v+4],[u-size/2,v-size],[u,v-2],[u+size*.43,v-size*1.5],[u+size,v+5],[u,v+9]],base,alpha);
      shape(sky,[[u-size*.5,v+4],[u,v-size*.45],[u+size*.39,v+2],[u,v+7]],light,alpha*.84);
    }
  }else if(p==='lotus'||p==='ice-point'||p==='ice-ward'||p==='vine'||p==='spring'||p==='wood-ward'){
    const wood=s.element==='wood', n=p==='ice-point'?4:p==='lotus'?10:7;
    for(let i=0;i<n;i++){
      const theta=i*TAU/n+age*.38, dist=p==='ice-point'?18:radius*.73;
      const [u,v]=polar(x,y,dist,theta);
      if(p==='vine'){
        g.lineStyle(3,base,alpha);
        line(g,[[u,v],[u-4,v-7],[u+1,v-16],[u+6,v-13],[u+3,v-9]]);
      }
      const height=p==='lotus'?22:13;
      shape(sky,[[u-6,v],[u,v-height],[u+6,v-6],[u+2,v+4]],base,alpha);
      shape(sky,[[u,v-height],[u+4,v-5],[u+1,v+2]],light,alpha);
      if(wood)g.lineStyle(1,light,alpha).lineBetween(u-4,v+3,u+8,v-5);
    }
  }else if(p==='phantom'||p==='leaves'||p==='electric-step'){
    for(let i=1;i<=5;i++){
      const [u,v]=offset(initial.x,initial.y,a,s.range*i/6*clamp(age*2.7),0);
      if(p==='phantom')shape(sky,[[u-7,v],[u-4,v-17],[u-3,v-23],[u+4,v-23],[u+8,v-8],[u+6,v+1]],base,alpha*(1-i/8));
      else if(p==='electric-step')bolt(sky,u,v,24,14,clock+i,base,light,alpha*.64,1);
      else shape(sky,[[u-6,v],[u-1,v-5],[u+7,v-6],[u+3,v]],light,alpha);
    }
  }else{
    const lips=p==='claw'?3:p==='echo'?3:p==='rupture'?2:1;
    for(let i=0;i<lips;i++){
      const full=p==='circle'||p==='echo'||p==='stone'||p==='rupture';
      const r=radius*(.43+.65*clamp(age*2))-i*8;
      const origin=full?initial:{x,y};
      if(p==='fist'||p==='break'){
        const [u,v]=offset(initial.x,initial.y,a,Math.min(s.range,18+s.range*age),0);
        shape(sky,[[u-11,v-5],[u-7,v-12],[u+4,v-10],[u+9,v-5],[u+8,v+6],[u-5,v+9]],base,alpha);
        g.lineStyle(2,light,alpha).lineBetween(u-7,v-8,u+6,v-6);
      }else{
        sky.lineStyle(p==='claw'?4:3,i?base:light,alpha);
        line(sky,Array.from({length:13},(_,j)=>polar(origin.x,origin.y,r,full?j*TAU/12:a+(j/12-.5)*(p==='sweep'?2.8:1.7))));
      }
    }
  }
  if(released&&alpha>.1)flecks(g,x,y,radius*.82,age,count,light,alpha*.65,s.element);
  if(c.resonance&&s.grade>=2&&released){
    g.lineStyle(1,grade.color,alpha*.65).strokeEllipse(x,y,Math.max(40,radius*1.8),Math.max(18,radius*.65));
    for(let i=0;i<(c.resonance>.1?4:2);i++){
      const theta=TAU*i/4+age*4, [u,v]=polar(x,y,radius*.78,theta);
      if(s.element==='thunder')bolt(sky,u,v,36,13,clock+i,base,grade.color,alpha*.68,1);
      else if(s.element==='fire'||s.element==='sun')shape(sky,[[u-4,v],[u,v-12],[u+6,v],[u,v+2]],grade.color,alpha);
      else sword(sky,u,v,theta,.43,base,grade.color,alpha);
    }
  }
}

export function drawMartialWeaponAura(g,weapon,x,y,time,intensity=0){
  if(!weapon)return;
  const [base,light]=palette[weapon.element], t=time/420;
  if(weapon.grade===0){
    if(t%3<.26)g.fillStyle(light,.76).fillRect(px(x)+2,px(y)-12,2,2);
    return;
  }
  const radius=6+weapon.grade*2+intensity*3;
  if(weapon.element==='thunder'&&weapon.grade>=2){
    g.lineStyle(1,light,.68);
    line(g,Array.from({length:5},(_,i)=>[px(x+(hash(i,Math.floor(t*8))-.5)*radius),px(y+i*4-17)]));
  }else if(weapon.element==='fire'||weapon.element==='sun'){
    for(let i=0;i<2+intensity;i++){
      const [u,v]=polar(x,y,radius,i*2+t);
      shape(g,[[u-2,v],[u,v-5],[u+3,v],[u+1,v+2]],i%2?light:base,.78);
    }
  }else if(weapon.element==='ice'){
    for(let i=0;i<3+intensity;i++){
      const [u,v]=polar(x,y,radius*(.5+i*.09),i*1.7-t);
      shape(g,[[u-2,v],[u,v-5],[u+2,v],[u,v+3]],i%2?light:base,.72);
    }
  }else flecks(g,x,y,radius,t,weapon.grade+intensity,light,.62,weapon.element);
}

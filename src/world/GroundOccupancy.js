export const GROUND_NPC=1;
export const GROUND_FAUNA=2;
const MASK=GROUND_NPC|GROUND_FAUNA;
const CELL=40;
const STEP=5;

export function groundFootprint(actor,mounted=false) {
  const species=actor.species, broad=actor.modularAppearance?.look?.bodyType==='male_strong';
  const shapes={wolf:[28,14],boar:[37,20],toad:[29,19]};
  const monster=shapes[species],extra=actor.rank==='elite'?5:0;
  const shape=mounted?[24,18]:monster?[monster[0]+extra,monster[1]+extra]:species==='tiger'?[24,18]:species==='deer'?[24,13]:species==='scorpion'?[17,11]:species==='snake'?[14,8]:broad?[18,10]:[16,8];
  return {width:shape[0],height:shape[1],category:species?GROUND_FAUNA:GROUND_NPC,mask:MASK,
    radius:Math.max(...shape)/2,personalRadius:Math.max(...shape)/2+6};
}

const key=(x,y)=>Math.floor(x/CELL)+Math.floor(y/CELL)*16384;
function intersection(a,x,y,b){
  const w=(a.width+b.width)*.5-Math.abs(x-b.x);
  const h=(a.height+b.height)*.5-Math.abs(y-b.y);
  return w>.01&&h>.01?w*h:0;
}

export class GroundOccupancy {
  constructor(mapOpen){
    this.mapOpen=mapOpen;
    this.buckets=new Map();
    this.bodies=new Map();
    this.pairsTested=0;
  }

  sync(npcs,fauna,mountedId,parked=[]){
    let highest=0;
    for(const actors of [npcs,fauna,parked])for(const actor of actors){
      if(!actor.alive||actor.ascended)continue;
      const mounted=actor.id===mountedId;
      let body=this.bodies.get(actor.id);
      if(!body||body.mounted!==mounted){
        this.remove(actor.id);
        body={id:actor.id,actor,mounted,...groundFootprint(actor,mounted)};
        this.bodies.set(actor.id,body);
      }
      body.active=true;
      this.place(body,actor.x,actor.y);
      highest=Math.max(highest,body.radius);
    }
    this.maxRadius=highest;
    for(const [id,body] of this.bodies){
      if(body.active)body.active=false;
      else this.remove(id);
    }
  }

  place(body,x,y){
    body.x=x;body.y=y;
    const cell=key(x,y);
    if(body.cell===cell)return;
    this.forgetCell(body);
    let bucket=this.buckets.get(cell);
    if(!bucket){bucket=new Set();this.buckets.set(cell,bucket);}
    bucket.add(body);body.cell=cell;
  }

  forgetCell(body){
    const bucket=this.buckets.get(body.cell);
    if(!bucket)return;
    bucket.delete(body);
    if(!bucket.size)this.buckets.delete(body.cell);
  }

  remove(id){
    const body=this.bodies.get(id);
    if(body){this.forgetCell(body);this.bodies.delete(id);}
  }

  *near(x,y,radius){
    const left=Math.floor((x-radius)/CELL),right=Math.floor((x+radius)/CELL);
    const top=Math.floor((y-radius)/CELL),bottom=Math.floor((y+radius)/CELL);
    for(let cy=top;cy<=bottom;cy++)for(let cx=left;cx<=right;cx++){
      const bucket=this.buckets.get(cx+cy*16384);
      if(bucket)for(const body of bucket)if(body.actor.alive&&!body.actor.ascended)yield body;
    }
  }

  open(body,x,y,escape=false){
    if(!this.mapOpen(x,y,body.width/2,body.height/2,body))return false;
    for(const other of this.near(x,y,body.radius+(this.maxRadius??12))){
      if(body.id===other.id||body.ignoreId===other.id||!(body.mask&other.category)||!(other.mask&body.category))continue;
      this.pairsTested++;
      const hit=intersection(body,x,y,other);
      if(hit&&(!escape||hit>=intersection(body,body.x,body.y,other)-.001))return false;
    }
    return true;
  }

  advance(body,x,y,allowAvoid=true,permitted=()=>true){
    const dx=x-body.x,dy=y-body.y,d=Math.hypot(dx,dy);
    if(d<.01)return null;
    const vx=dx/d,vy=dy/d,n=Math.ceil(d/STEP),step=d/n;
    const startX=body.x,startY=body.y;
    // The same relative right-hand side is used for opposing actors.
    for(let i=0;i<n;i++){
      const px=body.x+vx*step,py=body.y+vy*step;
      if(permitted(px,py)&&this.open(body,px,py,true)){this.place(body,px,py);continue;}
      if(!allowAvoid)break;
      let moved=false;
      for(const side of [.9,1,-.9,-1]){
        const forward=Math.sqrt(1-side*side);
        const ax=body.x+(vx*forward-vy*side)*step;
        const ay=body.y+(vy*forward+vx*side)*step;
        if(!permitted(ax,ay)||!this.open(body,ax,ay,true))continue;
        this.place(body,ax,ay);moved=true;break;
      }
      if(!moved)break;
    }
    return body.x!==startX||body.y!==startY?{x:body.x,y:body.y}:null;
  }

  recover(limit=12,select=()=>true,permitted=()=>true){
    const adjusted=[];
    for(const body of this.bodies.values()){
      if(adjusted.length>=limit)break;
      if(!body.actor.alive||body.actor.fixed||!select(body))continue;
      for(const other of this.near(body.x,body.y,body.radius+(this.maxRadius??12))){
        if(other.id===body.id||!intersection(body,body.x,body.y,other))continue;
        const dx=body.x-other.x,dy=body.y-other.y;
        const angle=dx||dy?Math.atan2(dy,dx):body.id<other.id?0:Math.PI;
        for(const offset of [0,Math.PI/2,-Math.PI/2,Math.PI]){
          const x=body.x+Math.cos(angle+offset)*2,y=body.y+Math.sin(angle+offset)*2;
          if(!permitted(body,x,y)||!this.open(body,x,y,true))continue;
          this.place(body,x,y);adjusted.push(body);break;
        }
        break;
      }
    }
    return adjusted;
  }

  overlaps(){
    const pairs=[];
    for(const body of this.bodies.values()){
      if(!body.actor.alive)continue;
      for(const other of this.near(body.x,body.y,body.radius+(this.maxRadius??12))){
        if(body.id<other.id&&intersection(body,body.x,body.y,other))pairs.push([body,other]);
      }
    }
    return pairs;
  }
}

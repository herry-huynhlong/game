import {AUCTION_BUILDING,AUCTION_LOT} from './BuildingInteriors.js';

const polygon=(g,points,color)=>{
  g.fillStyle=color;g.beginPath();g.moveTo(...points[0]);
  for(const point of points.slice(1))g.lineTo(...point);
  g.closePath();g.fill();
};
const box=(g,x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(x,y,w,h);};
const stone=(g,x,y,w,h)=>{
  box(g,x,y,w,h,'#858173');box(g,x,y,w,1,'#c0b69d');
  for(let i=x+4;i<x+w-2;i+=9)box(g,i,y+1,1,h-1,'#655f58');
};
const lantern=(g,x,y,night)=>{
  box(g,x+3,y-3,1,3,'#e2b76e');
  polygon(g,[[x+1,y],[x+6,y],[x+8,y+3],[x+7,y+7],[x+1,y+7],[x,y+4]],night?'#ffab50':'#a63f30');
  box(g,x+2,y+1,4,5,night?'#fff09b':'#e47647');box(g,x+3,y+7,2,3,'#b67b42');
};
const window=(g,x,y,w,night)=>{
  box(g,x-1,y-1,w+2,13,'#301f24');box(g,x,y,w,10,night?'#f3ad57':'#886047');
  for(let u=x+2;u<x+w;u+=4)box(g,u,y,1,10,'#664130');
  box(g,x,y+3,w,1,'#664130');box(g,x,y+7,w,1,'#664130');box(g,x-2,y+10,w+4,2,'#c38e53');
};
const gallery=(g,x,y,w,h,night,door)=>{
  box(g,x,y,w,h,'#482c2d');box(g,x+3,y+2,w-6,h-5,'#815047');
  for(let i=x+6;i<x+w-8;i+=17)window(g,i,y+3,10,night);
  for(let i=x+2;i<x+w;i+=17){box(g,i,y,3,h,'#6a2929');box(g,i,y,1,h,'#bc694d');}
  box(g,x,y+h-4,w,4,'#57282b');box(g,x,y+h-4,w,1,'#c28a57');
  if(door){
    const m=x+w/2;box(g,m-11,y+2,22,h-6,'#36252a');box(g,m-8,y+5,16,h-9,night?'#d08b4e':'#553833');
    box(g,m-1,y+6,2,h-11,'#3c2427');box(g,m-4,y+h-10,1,2,'#e7bb71');box(g,m+3,y+h-10,1,2,'#e7bb71');
    lantern(g,m-19,y+7,night);lantern(g,m+11,y+7,night);
  }
};
const roof=(g,y,left,right,inset,depth)=>{
  const ridge=y+1, eave=y+depth;
  polygon(g,[[left,eave-4],[left+6,eave-3],[left+14,eave-8],[left+inset,ridge],[right-inset,ridge],[right-14,eave-8],[right-6,eave-3],[right,eave-4],[right-4,eave+2],[left+4,eave+2]],'#192d35');
  polygon(g,[[left+10,eave-3],[left+inset,ridge+2],[right-inset,ridge+2],[right-10,eave-3]],'#355953');
  for(let j=3;j<depth-3;j+=4){
    const taper=Math.floor(inset*(1-j/depth));
    for(let x=left+taper+3;x<right-taper-3;x+=4){
      box(g,x+(j%3),y+j,2,2,(x+j)%5?'#27443f':'#588273');
      box(g,x+1,y+j+2,2,1,'#547869');
    }
  }
  polygon(g,[[left,eave-4],[left+14,eave-1],[right-14,eave-1],[right,eave-4],[right-4,eave+1],[left+4,eave+1]],'#bc8a51');
  box(g,left+inset-2,ridge,right-left-2*inset+4,2,'#ba925b');
  for(const edge of [left,right-1])box(g,edge,eave-7,2,4,'#dfb66a');
};
const planter=(g,x,y)=>{
  polygon(g,[[x,y+12],[x+17,y+12],[x+14,y+18],[x+3,y+18]],'#676f65');
  box(g,x+2,y+13,13,1,'#9caa87');box(g,x+8,y+5,2,8,'#624c37');
  polygon(g,[[x+1,y+9],[x+4,y+4],[x+8,y+5],[x+9,y],[x+13,y+2],[x+17,y+8],[x+12,y+11],[x+4,y+11]],'#305946');
  box(g,x+5,y+7,7,1,'#7d9160');box(g,x+10,y+3,3,2,'#82995f');
};

function exterior(g,night){
  polygon(g,[[13,103],[144,103],[159,116],[141,124],[17,120],[3,114]],'#233531');
  for(let y=108;y<125;y+=4)stone(g,24+(y%3),y,112,4);
  for(let i=0;i<5;i++)stone(g,62-i*2,107+i*3,37+i*4,4);
  gallery(g,22,80,116,28,night,true);gallery(g,36,50,88,34,night,false);gallery(g,50,25,60,27,night,false);
  roof(g,69,8,152,32,20);roof(g,40,25,135,26,21);roof(g,10,42,118,21,21);
  polygon(g,[[72,10],[78,4],[80,1],[82,4],[88,10]],'#c09455');
  box(g,60,92,40,9,'#a87644');box(g,61,93,38,7,'#432b30');
  g.fillStyle='#f5d083';g.textAlign='center';g.font='bold 6px serif';g.fillText('VẠN BẢO CÁC',80,99);
  for(const [x,y] of [[17,94],[135,94]])planter(g,x,y);
  for(const x of [48,106]) {
    stone(g,x,113,6,6);
    polygon(g,[[x-1,113],[x,109],[x+2,108],[x+3,105],[x+6,108],[x+6,113]],'#aba792');
    box(g,x+4,108,1,1,'#e5ce97');
  }
}

export function installAuctionExterior(scene){
  for(const [suffix,lit] of [['day',false],['lit',true]]){
    const texture=scene.textures.createCanvas('van-bao-'+suffix,160,128);
    exterior(texture.getContext(),lit);texture.refresh();
  }
  scene.auctionLot=Object.fromEntries(Object.entries(AUCTION_LOT).map(([key,value])=>[key,{...value,x:value.x-scene.westOffsetX}]));
  const {center,entry,visual}=scene.auctionLot;
  const court=scene.add.graphics().setDepth(11);
  court.setPosition(center.x,center.y);
  court.fillStyle(0x777968).fillRect(-30,-1,60,32);
  for(let y=1;y<32;y+=8)for(let x=-27+(y%3)*3;x<26;x+=12)
    court.fillStyle((x+y)%5<2?0x97927c:0x8c8b76).fillRect(x,y,10,6);
  court.lineStyle(1,0xb0a78a).lineBetween(-31,4,-31,31).lineBetween(30,4,30,31);
  const sprite=scene.add.sprite(center.x,center.y,'van-bao-day').setOrigin(.5,1).setDisplaySize(visual.width,visual.height)
    .setDepth(center.y-3).setName('Vạn Bảo Các');
  scene.buildingSprites.set(AUCTION_BUILDING,sprite);
  scene.sceneryBounds.push({sprite,left:visual.x,top:visual.y,right:visual.x+visual.width,bottom:center.y},
    {sprite:court,left:center.x-31,top:center.y,right:center.x+31,bottom:center.y+32});
  return entry;
}

export function bindAuctionBuilding(scene){
  const {footprint,entry,visual}=scene.auctionLot;
  const world=scene.populationWorld, objects=world.environment.objects;
  let building=objects.find(object=>object.id===AUCTION_BUILDING);
  if(!building){
    building={id:AUCTION_BUILDING,kind:'house',hp:480,maxHp:480,defense:46,status:'intact',
      ownerFactionId:'qingyun-city',repairable:true,repairProgress:0,repairGeneration:0};
    objects.push(building);
  }
  Object.assign(building,{x:visual.x,y:visual.y,hitbox:{...visual},repairSite:{...entry},restoreCollision:{...footprint},
    collision:building.status==='destroyed'?undefined:{...footprint}});
  for(const job of world.commissions??[])if(job.targetId===building.id)job.target={...entry};
}

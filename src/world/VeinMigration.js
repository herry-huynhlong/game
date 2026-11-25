const retired=Array.from({length:8},(_,i)=>'sect-vein-'+(i+1));
export const QINGYUN_VEIN='sect-jade';
export const MERGED_CAPACITY=92;
export const canonicalVein=id=>retired.includes(id)?QINGYUN_VEIN:id;

export function migrateVeins(world,primaryPoint){
  const campus=world.sectCampus,veins=campus?.spiritVeins;
  if(!veins||campus.veinMergeVersion===1||!primaryPoint)return;
  const primary=veins[QINGYUN_VEIN]??={amount:12,owner:'qingyun-sect',discovered:true,renewAt:0};
  const archived=campus.mergedVeins??={};
  for(const id of retired){
    const old=veins[id],capacity=old?.initial??10,amount=old?.amount??capacity;
    primary.amount+=amount;
    primary.mined=(primary.mined??Math.max(0,12-(primary.amount-amount)))+(old?.mined??Math.max(0,capacity-amount));
    if(old){
      archived[id]={ledger:old,cave:world.underground?.instances?.[id]??null};
      primary.lastMined=Math.max(primary.lastMined??0,old.lastMined??0);
      primary.renewAt=Math.max(primary.renewAt??0,old.renewAt??0);
      const live=world.underground?.instances?.[id];
      if(live){
        const target=world.underground.instances[QINGYUN_VEIN]??={stock:{},beasts:{},treasures:{},drops:[]};
        for(const drop of live.drops??[])if(!target.drops.some(d=>d.id===drop.id))target.drops.push({...drop,x:3,y:8});
        delete world.underground.instances[id];
      }
      delete veins[id];
    }
  }
  primary.initial=MERGED_CAPACITY;
  for(const order of campus.orders??[])if(retired.includes(order.veinId)){
    order.veinId=QINGYUN_VEIN;
    if(order.type?.startsWith('spirit-vein:'))order.type='spirit-vein:'+QINGYUN_VEIN;
  }
  for(const party of world.expeditions?.parties??[])if(retired.includes(party.job.siteId)){
    party.job.siteId=QINGYUN_VEIN;
    party.job.field={x:primaryPoint.x,y:primaryPoint.y};
    delete party.spots;
    delete party.fieldSpots;
  }
  if(world.expeditions?.retry){
    const retry=world.expeditions.retry;
    for(const key of Object.keys(retry)){
      const [kind,id]=key.split(':');
      if(!retired.includes(id))continue;
      const target=kind+':'+QINGYUN_VEIN;
      retry[target]=Math.max(retry[target]??0,retry[key]);
      delete retry[key];
    }
  }
  const occupied=new Set(world.npcs.filter(n=>n.underground?.siteId===QINGYUN_VEIN).map(n=>n.underground.x+':'+n.underground.y));
  const arrivals=Array.from({length:57},(_,i)=>({x:2+i%19,y:7+Math.floor(i/19)}));
  for(const npc of world.npcs)if(retired.includes(npc.underground?.siteId)){
    const d=npc.underground;
    Object.assign(npc,{x:primaryPoint.x,y:primaryPoint.y});
    const p=arrivals.find(p=>!occupied.has(p.x+':'+p.y))??{x:2,y:8};
    occupied.add(p.x+':'+p.y);
    Object.assign(d,p,{siteId:QINGYUN_VEIN,floor:0});
    delete d.nodeId;
    delete d.workAt;
  }
  campus.veinMergeVersion=1;
}

export function normalizeTitles(sites,factions){
  const titles=new Set();
  const sects=new Set(factions.filter(f=>f.kind==='sect'||f.type==='sect'||f.id==='qingyun-sect').map(f=>f.id));
  for(const site of sites){
    const s=site.state;
    s.controller??=s.owner??null;
    if(s.owner&&sects.has(s.owner)){
      const key=s.owner+':'+site.grade;
      if(titles.has(key)){
        (s.dispute??={claimants:[],opened:0}).claimants.push(s.owner);
        s.owner=null;
      }else titles.add(key);
    }
  }
}

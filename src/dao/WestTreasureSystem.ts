import { EconomySystem } from './EconomySystem';
import { faunaEvent } from './FaunaSystem';
import { hashMonster } from './MonsterRegistry';
import { treasureDefinition, WEST_TREASURE_GUARD_CHANCE, ALL_TREASURE_IDS } from './WestTreasureCatalog';
import type { DivineWorldSave, FaunaSave, MonsterPoint, SimNPC, WestTreasureSave } from './types';

export type TreasureSite=MonsterPoint & {zoneId:string;preferred?:WestTreasureSave['itemId'];resourceId?:string};
type OpenSite=(point:MonsterPoint)=>boolean;
export const treasureDistance=(a:MonsterPoint,b:MonsterPoint)=>Math.hypot(a.x-b.x,a.y-b.y);
const unit=(seed:string)=>hashMonster(seed)/4294967296;
export const treasureBloomOpen=(node:WestTreasureSave,minute:number)=>node.itemId!=='moon_lotus'||minute<300||minute>=1140;
export function treasureStage(node:WestTreasureSave,now:number){
  if(node.harvestedAt!==undefined)return 'harvested';
  const age=(now-node.plantedAt)/treasureDefinition(node.itemId).growMs;
  return age<.17?'sprout':age<.84?'growing':age<1?'mature':'ready';
}

export class WestTreasureSystem {
  readonly nodes:WestTreasureSave[];
  private readonly sitesByZone=new Map<string,TreasureSite[]>();
  constructor(private readonly world:DivineWorldSave,sites:TreasureSite[],private readonly open:OpenSite,
    private readonly inTerritory:(beast:FaunaSave,point:MonsterPoint)=>boolean=()=>true){
    this.nodes=world.environment!.westTreasures??=[];
    for(const site of sites)if(open(site)){
      const local=this.sitesByZone.get(site.zoneId)??[];
      local.push(site);this.sitesByZone.set(site.zoneId,local);
    }
  }

  initialize(now:number){
    for(const sites of this.sitesByZone.values())for(const site of sites){
      if(!site.resourceId||!site.preferred||this.nodes.some(n=>n.id===site.resourceId))continue;
      if(this.nodes.some(n=>treasureDistance(n,site)<22))continue;
      const definition=treasureDefinition(site.preferred);
      if(!definition)continue;
      const hunt=(this.world.environment!.fauna??[]).find(beast=>beast.alive&&beast.zoneId===site.zoneId&&
        treasureDistance(beast.home,site)<150&&this.inTerritory(beast,site));
      this.nodes.push({id:site.resourceId,itemId:site.preferred,zoneId:site.zoneId,cycle:0,x:site.x,y:site.y,
        plantedAt:now-definition.growMs,guardSpecies:hunt?.species,guardRank:hunt?.rank});
    }
    for(const itemId of ALL_TREASURE_IDS)for(let i=0;i<2;i++){
      const id=`west-treasure:${itemId}:${i}`;
      if(this.nodes.some(n=>n.id===id))continue;
      const definition=treasureDefinition(itemId);
      const biomes=definition.biomes;
      const zoneId=biomes[(i+hashMonster(this.world.worldId+itemId))%biomes.length];
      const node={id,itemId,zoneId,cycle:0,x:0,y:0,plantedAt:now};
      if(this.plant(node,now,true))this.nodes.push(node);
    }
  }

  guardian(node:WestTreasureSave){
    if(!node.guardSpecies)return undefined;
    let best:FaunaSave|undefined,distance=175;
    for(const f of this.world.environment!.fauna??[]){
      if(!f.alive||f.zoneId!==node.zoneId||f.species!==node.guardSpecies||node.guardRank&&f.rank!==node.guardRank)continue;
      const d=treasureDistance(f.home,node);
      if(d<distance){best=f;distance=d;}
    }
    return best;
  }

  private plant(node:WestTreasureSave,now:number,initial:boolean){
    const definition=treasureDefinition(node.itemId);
    const seed=`${this.world.worldId}:${node.id}:${node.cycle}`;
    const guarded=unit(seed+':guard')<WEST_TREASURE_GUARD_CHANCE[definition.grade];
    const clear=(p:MonsterPoint)=>this.open(p)&&(!node.cycle||treasureDistance(node,p)>=38)&&
      !this.nodes.some(other=>other!==node&&other.harvestedAt===undefined&&treasureDistance(other,p)<34);
    let point:MonsterPoint|undefined,guard:FaunaSave|undefined;
    if(guarded){
      const choices=(this.world.environment!.fauna??[]).filter(f=>f.alive&&f.zoneId===node.zoneId&&f.species===definition.guardian&&(!definition.elite||f.rank==='elite'))
        .sort((a,b)=>hashMonster(seed+a.id)-hashMonster(seed+b.id));
      for(const f of choices){
        const angle=unit(seed+f.id)*Math.PI*2;
        for(let index=0;index<24&&!point;index++){
          const heading=angle+(index%8)*Math.PI/4,reach=46+Math.floor(index/8)*15;
          const candidate={x:Math.round(f.home.x+Math.cos(heading)*reach),y:Math.round(f.home.y+Math.sin(heading)*reach)};
          if(this.inTerritory(f,candidate)&&clear(candidate)){point=candidate;guard=f;}
        }
        if(point)break;
      }
    }
    const suitable=(this.sitesByZone.get(node.zoneId)??[]).filter(p=>!p.preferred||p.preferred===node.itemId);
    const matching=suitable.filter(p=>p.preferred===node.itemId);
    if(!point&&matching.length&&hashMonster(seed+':tree')%2===0)point=matching.find(clear);
    const sites=suitable;
    if(node.id.startsWith('shanhe:')&&!point){
      const site=sites.find(p=>p.resourceId===node.id);
      if(site&&this.open(site)&&!this.nodes.some(n=>n!==node&&n.harvestedAt===undefined&&treasureDistance(n,site)<34))point=site;
    }
    const start=hashMonster(seed+':site')%Math.max(1,sites.length);
    for(let i=0;i<sites.length&&!point;i++){
      const p=sites[(start+i)%sites.length];if(clear(p))point=p;
    }
    if(!point)return false;
    Object.assign(node,point,{
      plantedAt:now-(initial?Math.round(definition.growMs*(.4+unit(seed+':age')*1.35)):0),
      harvestedAt:undefined,claimedBy:undefined,guardSpecies:guard?.species,guardRank:definition.elite?guard?.rank:undefined,
    });
    return true;
  }

  update(now:number){
    let replanted=false;
    for(const node of this.nodes){
      if(node.harvestedAt===undefined||now-node.harvestedAt<treasureDefinition(node.itemId).renewMs)continue;
      node.cycle++;
      if(this.plant(node,now,false))replanted=true;
      else node.cycle--;
    }
    return replanted;
  }

  harvest(npc:SimNPC,node:WestTreasureSave,now:number,line:(a:MonsterPoint,b:MonsterPoint)=>boolean,commit=()=>true){
    if(!treasureBloomOpen(node,this.world.clock.minute)||!this.nodes.includes(node)||!npc.alive||npc.flight||npc.skyStep||npc.wallLevel||
      treasureDistance(npc,node)>32||treasureStage(node,now)!=='ready'||!line(npc,node))return false;
    const events=this.world.events.slice();
    const stack=npc.inventory.find(i=>i.itemId===node.itemId),previous=stack?.count;
    node.harvestedAt=now;
    node.claimedBy=npc.id;
    EconomySystem.add(npc.inventory,node.itemId,1);
    faunaEvent(this.world,`${node.id}:harvest:${node.cycle}`,'west-treasure-harvested',npc.id,node.id,
      `${npc.name} thu hái ${treasureDefinition(node.itemId).name}.`);
    if(commit())return true;
    this.world.events=events;
    if(stack&&previous!==undefined)stack.count=previous;
    else EconomySystem.remove(npc.inventory,node.itemId,1);
    delete node.harvestedAt;
    delete node.claimedBy;
    return false;
  }
}

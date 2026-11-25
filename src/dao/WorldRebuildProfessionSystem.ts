import { damageEnvironment, regrowHerbNodes, releaseHerbNode } from './EnvironmentalSystem';
import { activeCommissionForNPC, activeCommissionForTarget, chooseRepairCandidate, ensureCommissions, openRepairCommissions, postRepairCommission, startRepairCommission, tickCommissions, visitCommissionBoard, advanceRepairCommission } from './CommissionSystem';
import type { DivineWorldSave, EnvironmentObjectSave, ResourceNodeSave, SimNPC } from './types';
import { professionInterrupted } from './AutonomousNPCSystem';

type TiledObject={id:number;name:string;x:number;y:number;width:number;height:number;properties?:Array<{name:string;value:unknown}>};
type Reach=(from:{x:number;y:number},to:{x:number;y:number})=>boolean;
const prop=(o:TiledObject,name:string)=>o.properties?.find(p=>p.name===name)?.value;
const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
const ITEM_COUNT=(npc:SimNPC)=>npc.inventory.find(i=>i.itemId==='spirit_herb')?.count??0;

/** Binds the existing Environment/Commission save systems to the active Tiled city and seeds authored, finite herb nodes. */
export function ensureWorldRebuildEnvironment(world:DivineWorldSave,map:{layers:Array<{name:string;objects?:TiledObject[]}>}){
 const layer=(name:string)=>map.layers.find(l=>l.name===name)?.objects??[],env=world.environment??(world.environment={objects:[],drops:[],processedEventIds:[],defeatedBeastIds:[],resourceNodes:[]});
 env.objects??=[];env.drops??=[];env.processedEventIds??=[];env.defeatedBeastIds??=[];env.resourceNodes??=[];
 const entrances:Record<string,string>={'city-lord-residence':'city-hall-entrance','commission-hall':'quest-office','inn-cloud-arrival':'inn-entrance','tavern-pine-shadow':'tavern-entrance'};
 const markers=new Map(layer('NavigationMarkers').map(o=>[String(prop(o,'markerId')??''),{x:o.x,y:o.y}]));
 const sectStations=new Map(layer('SectCampusStations').map(o=>[String(prop(o,'station')??''),{x:o.x,y:o.y}]));
 for(const mapObject of [...layer('Buildings'),...layer('SectCampusArt')]){
  const id=String(prop(mapObject,'buildingId')??'');if(!id||!id.includes('-'))continue;
  const isSect=id.startsWith('sect-campus-');
  const site=isSect?sectStations.get(id.slice(12)):markers.get(entrances[id]??'');if(!site)continue;
  const hitbox={x:mapObject.x,y:mapObject.y,width:mapObject.width,height:mapObject.height};
  const footprint={x:mapObject.x+mapObject.width*.2,y:mapObject.y+mapObject.height-38,width:mapObject.width*.6,height:18};
  const saved=env.objects.find(o=>o.id===id);
  if(!saved){const object:EnvironmentObjectSave={id,kind:'house',x:site.x-64,y:site.y-34,maxHp:180,hp:180,defense:25,status:'intact',ownerFactionId:isSect?'qingyun-sect':'qingyun-city',collision:{...footprint},restoreCollision:{...footprint},hitbox,repairable:true,repairProgress:0,repairGeneration:0,mapObjectId:mapObject.id,repairSite:{...site}};env.objects.push(object)}
  else{saved.mapObjectId??=mapObject.id;saved.repairSite??={...site};saved.hitbox??=hitbox;saved.repairGeneration??=0;saved.restoreCollision??={...footprint};if(saved.status==='intact'&&!saved.collision)saved.collision={...saved.restoreCollision}}
 }
 for(const mapObject of layer('ResourceNodes')){
  const id=String(prop(mapObject,'resourceNodeId')??'');if(!id||env.resourceNodes.some(n=>n.id===id))continue;
  const amount=Math.max(0,Number(prop(mapObject,'amount')??0));if(!amount)continue;
  env.resourceNodes.push({id,kind:'herb',itemId:'spirit_herb',x:mapObject.x,y:mapObject.y,amount,maxAmount:amount,danger:Number(prop(mapObject,'danger')??0)});
 }
 env.mapId='world-rebuild-1b';const board=markers.get('quest-office');if(board){world.commissionBoard={...board};ensureCommissions(world)}
 for(const node of env.resourceNodes){const holder=node.reservedBy&&world.npcs.find(n=>n.id===node.reservedBy&&n.alive&&n.assignedResourceNodeId===node.id);if(node.reservedBy&&!holder)node.reservedBy=undefined}
 for(const npc of world.npcs)if(npc.assignedResourceNodeId&&!env.resourceNodes.some(n=>n.id===npc.assignedResourceNodeId&&n.reservedBy===npc.id)){npc.assignedResourceNodeId=undefined;if(npc.professionTask?.kind==='herb-gather')npc.professionTask=undefined}
 return env;
}

function publishRepairJobs(world:DivineWorldSave){
 const env=world.environment;if(!env)return;
 for(const object of env.objects){if(!object.repairable||object.status==='intact'||activeCommissionForTarget(world,object.id))continue;
  const eventId=`world-rebuild-repair:${object.id}:${object.repairGeneration??0}`;
  postRepairCommission(world,object,eventId,object.ownerFactionId==='qingyun-sect'?'Thanh Vân Tông':'Thanh Vân Thành');
 }
}

function setRepairPlan(npc:SimNPC,target:{x:number;y:number},state:'seeking'|'travelling'|'working',targetId:string){
 npc.goalAction='commission';npc.actionTarget={...target};npc.action='travel';npc.decisionSlot=targetId==='commission-board'?'commission-board':`commission:${targetId}`;
 npc.shortGoal=state==='working'?'Đang tu sửa công trình':state==='seeking'?'Tìm ủy thác sửa chữa':'Đang đến công trình cần sửa';
 npc.professionTask={kind:'repair',targetId,state};
}

function tickRepairWorkers(world:DivineWorldSave,board:{x:number;y:number},canReach:Reach){
 const workers=world.npcs.filter(n=>n.alive&&!n.flight&&n.populationRole==='repair_worker');
 for(const npc of workers){
  if(professionInterrupted(npc,world))continue;
  let commission=activeCommissionForNPC(world,npc.id);
  if(commission){
   const object=world.environment?.objects.find(o=>o.id===commission!.targetId);if(!object){npc.professionTask={kind:'repair',targetId:commission.targetId,state:'blocked',lastReason:'missing-building'};continue}
   if(!canReach(npc,commission.target)){npc.professionTask={kind:'repair',targetId:commission.targetId,state:'blocked',lastReason:'no-path'};commission.status='paused';commission.pauseReason='Không tìm được đường tới công trình.';commission.acceptedBy=null;npc.assignedCommissionId=null;npc.decisionSlot=undefined;continue}
   if(commission.status==='accepted'){
    setRepairPlan(npc,commission.target,'travelling',commission.commissionId);
    if(distance(npc,commission.target)<=42){const result=startRepairCommission(world,commission,npc,npc,commission.target);if(result.ok){npc.professionTask={kind:'repair',targetId:object.id,state:'working'};}}
   }else if(commission.status==='in_progress'){
    setRepairPlan(npc,commission.target,'working',commission.commissionId);
    if(distance(npc,commission.target)<=54){npc.action='work';const result=advanceRepairCommission(world,commission,npc,1,commission.target);if(result.completed){npc.professionTask=undefined;commission=undefined}}
   }else npc.professionTask=undefined;
   continue;
  }
  if(npc.decisionSlot==='commission-board'){
   const c=openRepairCommissions(world).find(row=>row.commissionId===npc.professionTask?.targetId);
   if(c&&distance(npc,board)<=42&&visitCommissionBoard(world,npc,c.commissionId,board,world.heaven.possession?.npcId??null)){npc.professionTask={kind:'repair',targetId:c.commissionId,state:'travelling'};continue}
  }
  const candidate=openRepairCommissions(world).sort((a,b)=>Number(Boolean(b.reviewedBy))-Number(Boolean(a.reviewedBy))).find(c=>chooseRepairCandidate(world,c,board,world.heaven.possession?.npcId??null)?.id===npc.id&&canReach(npc,board));
  if(candidate){setRepairPlan(npc,board,'seeking','commission-board');npc.professionTask={kind:'repair',targetId:candidate.commissionId,state:'seeking'};if(distance(npc,board)<=42&&visitCommissionBoard(world,npc,candidate.commissionId,board,world.heaven.possession?.npcId??null)){npc.professionTask={kind:'repair',targetId:candidate.commissionId,state:'travelling'}}}
  else if(npc.professionTask?.kind==='repair'){npc.professionTask=undefined;npc.decisionSlot=undefined;if(npc.assignedCommissionId)npc.assignedCommissionId=null;if(npc.goalAction==='commission'){npc.goalAction='rest';npc.actionTarget={...(npc.home??{x:npc.x,y:npc.y})}}}
 }
}

function dangerTolerance(npc:SimNPC){const axes=npc.aiProfile?.axes,courage=axes?.courage??40,caution=axes?.caution??50;if(npc.hp<42||npc.fatigue>85)return 10;return Math.max(8,Math.min(45,36+courage*.18-caution*.28+(npc.safety-50)*.08))}
function chooseHerbNode(world:DivineWorldSave,npc:SimNPC,canReach:Reach){
 const nodes=world.environment?.resourceNodes??[],axes=npc.aiProfile?.axes;
 const cooldown=npc.resourceRouteCooldown,now=world.clock.day*1440+world.clock.minute;
 return nodes.filter(node=>(cooldown?.nodeId!==node.id||cooldown.until<=now)&&!node.id.startsWith('sect-plot-')&&node.kind==='herb'&&node.itemId==='spirit_herb'&&node.amount>0&&(!node.reservedBy||node.reservedBy===npc.id)&&node.danger<=dangerTolerance(npc)&&canReach(npc,node))
  .map(node=>({node,score:38+(axes?.diligence??45)*.2+(npc.personality==='thực tế'?8:0)+(npc.schedule.some(s=>s.action==='work')?4:0)-distance(npc,node)/95-node.danger*.45-npc.hunger*.12-npc.fatigue*.22}))
  .sort((a,b)=>b.score-a.score||distance(npc,a.node)-distance(npc,b.node)||a.node.id.localeCompare(b.node.id))[0]?.node;
}
function tickHerbGatherers(world:DivineWorldSave,canReach:Reach){
 for(const npc of world.npcs.filter(n=>n.alive&&!n.flight&&!n.marketVisit&&n.populationRole==='herb_gatherer')){
  if(npc.goalAction==='flee'&&world.clock.day*1440+world.clock.minute<(npc.faunaEvadeUntil??0)){
    if(npc.assignedResourceNodeId)releaseHerbNode(world,npc.assignedResourceNodeId,npc.id);
    npc.assignedResourceNodeId=undefined;npc.professionTask=undefined;continue;
  }
  if(npc.decisionSlot?.endsWith(':herb-craft')||npc.goalAction==='trade'&&npc.decisionSlot?.endsWith(':deliver'))continue;
  const env=world.environment!,activeId=npc.assignedResourceNodeId,node=activeId?env.resourceNodes?.find(n=>n.id===activeId):undefined;
  const needsBreak=professionInterrupted(npc,world)||npc.hp<28||npc.safety<35||world.clock.minute<360||world.clock.minute>=1200;
  if(!needsBreak&&node&&node.amount>0&&node.reservedBy===npc.id&&node.danger<=dangerTolerance(npc)&&canReach(npc,node)){
   npc.professionTask={kind:'herb-gather',targetId:node.id,state:distance(npc,node)<=22?'working':'travelling'};npc.goalAction='gather';npc.actionTarget={x:node.x,y:node.y};npc.decisionSlot=`profession:gather:${node.id}`;npc.shortGoal=distance(npc,node)<=22?'Đang hái linh thảo tại điểm đã chọn':'Đang tìm đường tới linh thảo';
   continue;
  }
  if(activeId){if(node?.reservedBy===npc.id)releaseHerbNode(world,activeId,npc.id);npc.assignedResourceNodeId=undefined;npc.professionTask=undefined;if(npc.decisionSlot?.startsWith('profession:gather:'))npc.decisionSlot=undefined}
  if(needsBreak)continue
  const target=chooseHerbNode(world,npc,canReach);
  if(!target){
   const available=(env.resourceNodes??[]).filter(n=>n.kind==='herb'&&n.itemId==='spirit_herb'&&n.amount>0);
   const safe=available.filter(n=>n.danger<=dangerTolerance(npc));
   const reachable=safe.filter(n=>canReach(npc,n));
   const reason=!available.length?'all-nodes-depleted':!safe.length?'unsafe-nodes':!reachable.length?'no-reachable-node':
      reachable.some(n=>n.id===npc.resourceRouteCooldown?.nodeId&&npc.resourceRouteCooldown.until>world.clock.day*1440+world.clock.minute)
        ?'route-retry-backoff':'nodes-reserved';
   npc.goalAction='rest';
   npc.professionTask={kind:'herb-gather',targetId:'',state:'blocked',lastReason:reason};
   npc.shortGoal='Chờ linh thảo trống, an toàn và còn hàng';
   continue;
  }
  if(target.reservedBy&&target.reservedBy!==npc.id)continue;
  target.reservedBy=npc.id;npc.assignedResourceNodeId=target.id;npc.professionTask={kind:'herb-gather',targetId:target.id,state:'travelling',inventoryBefore:ITEM_COUNT(npc)};npc.goalAction='gather';npc.actionTarget={x:target.x,y:target.y};npc.decisionSlot=`profession:gather:${target.id}`;npc.shortGoal='Đang tìm đường tới linh thảo';
 }
}

export function tickWorldRebuildProfessionWork(world:DivineWorldSave,board:{x:number;y:number},canReach:Reach){
 if(world.clock.minute%10===0)regrowHerbNodes(world);
 for(const node of world.environment?.resourceNodes??[]){
   if(node.reservedBy&&!world.npcs.some(n=>n.id===node.reservedBy&&n.alive&&n.assignedResourceNodeId===node.id))node.reservedBy=undefined;
 }
 ensureCommissions(world);publishRepairJobs(world);tickCommissions(world);tickRepairWorkers(world,board,canReach);tickHerbGatherers(world,canReach);
}

/** Test/setup hook: damage only an authored map building and use the existing damage/commission pipeline. */
export function damageWorldRebuildBuilding(world:DivineWorldSave,buildingId:string,eventId:string,damage:number,realmIndex=0){
 const object=world.environment?.objects.find(o=>o.id===buildingId);if(!object||!eventId)return null;
 return damageEnvironment(world,buildingId,eventId,damage,realmIndex);
}

export function listProfessionNodes(world:DivineWorldSave):ResourceNodeSave[]{return world.environment?.resourceNodes??[];}

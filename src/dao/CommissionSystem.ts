import { advanceRepair, beginRepair, ensureEnvironment, pauseRepair } from './EnvironmentalSystem';
import { EconomySystem } from './EconomySystem';
import type { CommissionSave, CommissionTransaction, DivineWorldSave, EnvironmentObjectSave, SimNPC, TradeItemId } from './types';

export const COMMISSION_CONFIG={repairReward:30,repairMinutes:180,repairMaterials:{wood:3,iron_ore:2} as const,deadlineMinutes:3*1440,boardVisitHours:[8,13] as const,boardVisitWindowMinutes:120,boardLocation:{x:3232,y:928},repairOffset:{x:64,y:34}};
const ACTIVE=new Set(['posted','accepted','in_progress','paused']);
const terminal=(c:CommissionSave)=>!ACTIVE.has(c.status);
const absolute=(day:number,minute:number)=>day*1440+minute;
const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);

export function ensureCommissions(world:DivineWorldSave){world.commissions??=[];world.commissionTransactions??=[];world.commissionBoard??={...COMMISSION_CONFIG.boardLocation};if(!world.commissionClerkId||!world.npcs.some(n=>n.id===world.commissionClerkId))world.commissionClerkId=world.npcs.find(n=>n.id==='qingyun-16'&&n.profession==='ho_ve')?.id??world.npcs.find(n=>n.alive&&!n.ascended&&n.profession==='dan_thuong'&&n.id!=='van-du')?.id;return world.commissions}
function transaction(world:DivineWorldSave,c:CommissionSave,type:CommissionTransaction['type'],fromId:string,toId:string,amount:number,items?:CommissionTransaction['items']){
  const list=world.commissionTransactions??(world.commissionTransactions=[]),id=`commission-${type}:${c.commissionId}`;
  if(list.some(row=>row.id===id))return false;
  list.push({id,commissionId:c.commissionId,type,day:world.clock.day,minute:world.clock.minute,fromId,toId,amount,...(items?{items:items.map(item=>({...item}))}:{})});
  return true;
}
export function postRepairCommission(world:DivineWorldSave,object:EnvironmentObjectSave,sourceEventId:string,areaId='phố-tây-thanh-vân'){
  const list=ensureCommissions(world);if(!sourceEventId||!object.repairable||object.status==='intact')return null;
  const duplicate=list.find(c=>c.sourceEventId===sourceEventId||c.targetId===object.id&&ACTIVE.has(c.status));if(duplicate)return duplicate;
  const issuerId=object.ownerFactionId??'qingyun-city',issuer=world.factions.find(f=>f.id===issuerId);if(!issuer||issuer.wealth<COMMISSION_CONFIG.repairReward)return null;
  const commissionId=`commission:repair:${object.id}:${sourceEventId}`;
  if(world.commissionTransactions?.some(t=>t.id===`commission-escrow:${commissionId}`))return null;
  issuer.wealth-=COMMISSION_CONFIG.repairReward;
  const commission:CommissionSave={commissionId,worldId:world.worldId,issuerId,type:'repair',title:`Tu sửa ${object.id}`,description:`Công trình ${object.id} cần sửa. Dùng vật liệu thành, sửa tại điểm tiếp cận đã định.`,targetId:object.id,target:object.repairSite?{...object.repairSite}:{x:object.x+COMMISSION_CONFIG.repairOffset.x,y:object.y+COMMISSION_CONFIG.repairOffset.y},areaId,requirements:{profession:'tho_re'},reward:{currency:'spirit_stones',amount:COMMISSION_CONFIG.repairReward},rewardSourceId:issuerId,rewardEscrow:COMMISSION_CONFIG.repairReward,materialsCost:{...COMMISSION_CONFIG.repairMaterials},materialsConsumed:false,createdDay:world.clock.day,createdMinute:world.clock.minute,dueAt:absolute(world.clock.day,world.clock.minute)+COMMISSION_CONFIG.deadlineMinutes,acceptedBy:null,progress:0,status:'posted',sourceEventId};
  list.push(commission);transaction(world,commission,'escrow',issuerId,commissionId,commission.rewardEscrow);return commission;
}
export function activeCommissionForTarget(world:DivineWorldSave,targetId:string){return ensureCommissions(world).find(c=>c.targetId===targetId&&ACTIVE.has(c.status))}
export function activeCommissionForNPC(world:DivineWorldSave,npcId:string){return ensureCommissions(world).find(c=>c.acceptedBy===npcId&&['accepted','in_progress','paused'].includes(c.status))}
export function openRepairCommissions(world:DivineWorldSave){return ensureCommissions(world).filter(c=>c.type==='repair'&&c.status==='posted'&&c.worldId===world.worldId)}
export function canSeekBoard(world:DivineWorldSave,npc:SimNPC,possessedId:string|null){
  if(!npc.alive||npc.ascended||npc.profession!=='tho_re'||npc.id===possessedId||npc.assignedCommissionId)return false;
  if(npc.hp<=0||npc.hunger>=78||npc.fatigue>=88||npc.safety<25)return false;
  const slot=npc.decisionSlot??'';if(['mandate:','duel:','duel-retreat:','board:','sect-recruit:','sect-mission:','env-loot:','env-repair:','commission:'].some(prefix=>slot.startsWith(prefix)))return false;
  return ['idle','rest','work','trade','socialize'].includes(npc.goalAction)||(npc.goalAction==='commission'&&slot==='commission-board');
}
export function repairInterest(world:DivineWorldSave,npc:SimNPC,commission:CommissionSave,board:{x:number;y:number}){
  if(commission.type!=='repair'||commission.status!=='posted'||!canSeekBoard(world,npc,world.heaven.possession?.npcId??null))return -Infinity;
  if(npc.profession!=='tho_re')return -Infinity;
  const need=Math.max(0,Math.min(24,Math.round((120-npc.spiritStones)*.18)));
  const disposition=npc.heavenlyDisposition;const trust=disposition?.causes.some(c=>c.type==='commission')?(disposition.trust-50)*.08:0;
  const fatigue=npc.fatigue*.24,hunger=npc.hunger*.16,injury=(1-npc.hp/Math.max(1,npc.hp+20))*20,travel=distance(npc,board)/85;
  const personality=npc.personality==='thực tế'?8:npc.personality==='tham vọng'?5:npc.personality==='cẩn trọng'?2:0;
  return 55+need+trust+personality-fatigue-hunger-injury-travel;
}
export function chooseRepairCandidate(world:DivineWorldSave,commission:CommissionSave,board:{x:number;y:number},possessedId:string|null){
  return world.npcs.map(npc=>({npc,score:repairInterest(world,npc,commission,board)})).filter(x=>x.npc.id!==possessedId&&Number.isFinite(x.score)&&x.score>=35)
    .sort((a,b)=>b.score-a.score||distance(a.npc,board)-distance(b.npc,board)||a.npc.id.localeCompare(b.npc.id))[0]?.npc??null;
}
export function visitCommissionBoard(world:DivineWorldSave,npc:SimNPC,commissionId:string,board:{x:number;y:number},possessedId:string|null){
  const c=ensureCommissions(world).find(item=>item.commissionId===commissionId);if(!c||c.worldId!==world.worldId||c.status!=='posted'||distance(npc,board)>42||repairInterest(world,npc,c,board)<35)return false;
  if(activeCommissionForNPC(world,npc.id)||c.acceptedBy)return false;
  c.status='accepted';c.acceptedBy=npc.id;c.progress=0;c.pauseReason=undefined;npc.assignedCommissionId=c.commissionId;npc.goalAction='commission';npc.action='travel';npc.actionTarget={...c.target};npc.actionProgress=0;npc.decisionSlot=`commission:${c.commissionId}`;npc.shortGoal='Nhận việc tu sửa nhà dân';return true;
}
function clearAssignment(npc:SimNPC,c:CommissionSave){if(npc.assignedCommissionId===c.commissionId)npc.assignedCommissionId=null;if(npc.decisionSlot===`commission:${c.commissionId}`||npc.decisionSlot==='commission-board'){npc.decisionSlot=undefined;npc.goalAction='idle';npc.action='idle';npc.actionProgress=0;npc.actionTarget={x:npc.x,y:npc.y};npc.shortGoal='Tìm việc phù hợp'}}
function refundEscrow(world:DivineWorldSave,c:CommissionSave){if(c.rewardEscrow<=0)return false;const issuer=world.factions.find(f=>f.id===c.rewardSourceId);if(!issuer)return false;issuer.wealth+=c.rewardEscrow;transaction(world,c,'refund',c.commissionId,issuer.id,c.rewardEscrow);c.rewardEscrow=0;return true}
export function failCommission(world:DivineWorldSave,c:CommissionSave,reason:string,npc?:SimNPC){if(terminal(c))return false;if(npc)clearAssignment(npc,c);c.status='failed';c.pauseReason=reason;refundEscrow(world,c);c.lastTransitionId=`commission-failed:${c.commissionId}`;return true}
export function cancelCommission(world:DivineWorldSave,c:CommissionSave,reason:string){if(terminal(c))return false;const npc=c.acceptedBy?world.npcs.find(n=>n.id===c.acceptedBy):undefined;if(npc)clearAssignment(npc,c);const object=ensureEnvironment(world).objects.find(o=>o.id===c.targetId);if(object?.status==='repairing')pauseRepair(world,c.targetId);c.status='cancelled';c.pauseReason=reason;refundEscrow(world,c);c.lastTransitionId=`commission-cancelled:${c.commissionId}`;return true}
export function pauseCommission(world:DivineWorldSave,c:CommissionSave,reason:string,npc?:SimNPC){if(!['accepted','in_progress'].includes(c.status))return false;if(npc)clearAssignment(npc,c);if(ensureEnvironment(world).objects.find(o=>o.id===c.targetId)?.status==='repairing')pauseRepair(world,c.targetId);c.status='paused';c.pauseReason=reason;c.acceptedBy=null;c.lastTransitionId=`commission-paused:${c.commissionId}:${reason}`;return true}
export function reopenPausedCommission(c:CommissionSave){if(c.status!=='paused')return false;c.status='posted';c.acceptedBy=null;c.pauseReason=undefined;c.lastTransitionId=`commission-reopened:${c.commissionId}`;return true}
export function expireCommission(world:DivineWorldSave,c:CommissionSave){if(terminal(c))return false;const npc=c.acceptedBy?world.npcs.find(n=>n.id===c.acceptedBy):undefined;if(npc)clearAssignment(npc,c);if(ensureEnvironment(world).objects.find(o=>o.id===c.targetId)?.status==='repairing')pauseRepair(world,c.targetId);c.status='expired';c.pauseReason='Đã hết hạn';refundEscrow(world,c);c.lastTransitionId=`commission-expired:${c.commissionId}`;return true}
export function startRepairCommission(world:DivineWorldSave,c:CommissionSave,npc:SimNPC,workerAt:{x:number;y:number},repairSite:{x:number;y:number}){
  if(c.type!=='repair'||c.status!=='accepted'||c.acceptedBy!==npc.id||npc.assignedCommissionId!==c.commissionId||distance(workerAt,repairSite)>42)return {ok:false,reason:'worker-not-at-site'};
  const object=ensureEnvironment(world).objects.find(o=>o.id===c.targetId);if(!object||!object.repairable)return {ok:false,reason:'target-missing'};
  if(object.status==='intact'){cancelCommission(world,c,'Công trình đã được sửa trước khi thợ tới.');return {ok:false,reason:'already-repaired'};}
  const dueNow=absolute(world.clock.day,world.clock.minute);if(dueNow>c.dueAt){expireCommission(world,c);return {ok:false,reason:'expired'};}
  if(!c.materialsConsumed){const stock=world.settlement.materials;const costs=Object.entries(c.materialsCost) as [TradeItemId,number][];if(costs.some(([item,count])=>EconomySystem.count(stock,item)<count)){pauseCommission(world,c,'Kho thành thiếu vật liệu.',npc);return {ok:false,reason:'materials-unavailable'};}
    const removed:Array<[TradeItemId,number]>=[];for(const [item,count] of costs){if(!EconomySystem.remove(stock,item,count)){for(const [old,qty] of removed)EconomySystem.add(stock,old,qty);pauseCommission(world,c,'Kho thành thiếu vật liệu.',npc);return {ok:false,reason:'materials-unavailable'};}removed.push([item,count]);}
    if(!beginRepair(world,c.targetId,npc.id)){for(const [item,count] of removed)EconomySystem.add(stock,item,count);cancelCommission(world,c,'Công trình không còn ở trạng thái cần sửa.');return {ok:false,reason:'target-not-repairable'};}
    c.materialsConsumed=true;c.materialTransactionId=`commission-materials:${c.commissionId}`;transaction(world,c,'materials',c.issuerId,c.commissionId,0,removed.map(([itemId,count])=>({itemId,count})));
  }else if(object.status!=='repairing'){if(!beginRepair(world,c.targetId,npc.id))return {ok:false,reason:'repair-resume-failed'};else object.repairWorkerId=npc.id;}
  c.status='in_progress';c.progress=object.repairProgress;c.pauseReason=undefined;npc.goalAction='commission';npc.action='work';npc.shortGoal='Đang tu sửa công trình';return {ok:true,reason:'repair-started'};
}
export function advanceRepairCommission(world:DivineWorldSave,c:CommissionSave,npc:SimNPC,minutes:number,repairSite:{x:number;y:number}){
  if(c.status!=='in_progress'||c.acceptedBy!==npc.id||npc.assignedCommissionId!==c.commissionId)return {ok:false,completed:false,reason:'not-assigned'};
  const object=ensureEnvironment(world).objects.find(o=>o.id===c.targetId);if(!object)return {ok:false,completed:false,reason:'target-missing'};
  if(distance(npc,repairSite)>54)return {ok:false,completed:false,reason:'worker-left-site'};
  if(object.status!=='repairing'||object.repairWorkerId!==npc.id)return {ok:false,completed:false,reason:'repair-state-lost'};
  if(minutes>0)advanceRepair(world,c.targetId,npc.id,minutes);const repaired=ensureEnvironment(world).objects.find(o=>o.id===c.targetId)!;c.progress=repaired.repairProgress;
  if(repaired.status!=='intact')return {ok:true,completed:false,reason:'progress'};
  c.progress=COMMISSION_CONFIG.repairMinutes;c.status='completed';c.lastTransitionId=`commission-completed:${c.commissionId}`;
  const paid=payCommissionReward(world,c,npc);if(!paid)return {ok:false,completed:true,reason:'reward-escrow-missing'};
  c.status='claimed';c.progress=COMMISSION_CONFIG.repairMinutes;c.lastTransitionId=`commission-claimed:${c.commissionId}`;clearAssignment(npc,c);return {ok:true,completed:true,reason:'claimed'};
}
export function payCommissionReward(world:DivineWorldSave,c:CommissionSave,npc:SimNPC){
  if(c.status!=='completed'||!npc.alive||c.rewardEscrow!==c.reward.amount||world.commissionTransactions?.some(t=>t.id===`commission-reward:${c.commissionId}`))return false;
  npc.spiritStones+=c.reward.amount;c.rewardEscrow=0;c.rewardTransactionId=`commission-reward:${c.commissionId}`;return transaction(world,c,'reward',c.rewardSourceId,npc.id,c.reward.amount);
}
export function tickCommissions(world:DivineWorldSave){
  const now=absolute(world.clock.day,world.clock.minute);for(const c of ensureCommissions(world)){
    if(!ACTIVE.has(c.status))continue;
    if(now>c.dueAt){expireCommission(world,c);continue;}
    const target=ensureEnvironment(world).objects.find(o=>o.id===c.targetId);if(!target||target.status==='intact'){cancelCommission(world,c,!target?'Công trình mục tiêu không còn tồn tại.':'Công trình đã được sửa trước khi nhận thưởng.');continue;}
    if(c.acceptedBy){const npc=world.npcs.find(n=>n.id===c.acceptedBy);if(!npc?.alive||npc.ascended||npc.id===world.heaven.possession?.npcId){if(npc)pauseCommission(world,c,npc.id===world.heaven.possession?.npcId?'NPC đang được nhập hồn.':'Người nhận nhiệm vụ không còn hợp lệ.',npc);else{c.acceptedBy=null;c.status='posted';c.pauseReason='Người nhận không còn tồn tại';}}}
    if(c.status==='paused'&&(!c.materialsConsumed||Object.entries(c.materialsCost).every(([item,count])=>EconomySystem.count(world.settlement.materials,item)>=(count??0))))reopenPausedCommission(c);
  }
}

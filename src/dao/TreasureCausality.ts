import type { DivineWorldSave, NPCKnownFact, SimNPC, TreasureDuel, TradeItemId, WorldEvent } from './types';
import { alignmentName, ensureDisposition } from './HeavenlyDisposition';

const clamp=(value:number)=>Math.max(0,Math.min(100,Math.round(value)));
const now=(w:DivineWorldSave)=>w.clock.day*1440+w.clock.minute;

export function rememberFact(w:DivineWorldSave,n:SimNPC,fact:Omit<NPCKnownFact,'day'|'minute'>){
  if(!n.alive||n.ascended)return false;
  n.knownFacts??=[];
  if(n.knownFacts.some(x=>x.id===fact.id))return false;
  n.knownFacts.push({...fact,day:w.clock.day,minute:w.clock.minute});
  if(n.knownFacts.length>100)n.knownFacts.shift();
  return true;
}

export function recordGiftReception(w:DivineWorldSave,n:SimNPC,eventId:string,itemId:string){
  const event=w.events.find(e=>e.id===eventId&&e.type==='heavenly-gift'&&e.actorId==='heaven'&&e.targetId===n.id&&e.data?.itemId===itemId);
  if(!event)return false;
  const added=rememberFact(w,n,{id:`fact:${eventId}`,kind:'heavenly-gift-received',sourceId:eventId,knownThrough:'direct',itemId});
  w.treasureProvenance??=[];
  if(!w.treasureProvenance.some(x=>x.id===eventId))w.treasureProvenance.push({id:eventId,itemId:itemId as TradeItemId,sourceEventId:eventId,ownerId:n.id,transferEventIds:[]});
  if(added){n.memories.push({day:event.day,text:`Thiên Đạo ban ${itemId} cho ${n.name}.`,kind:'heavenly-gift',sourceId:eventId,knownThrough:'direct',itemId});n.memories=n.memories.slice(-12)}
  return added;
}

export function transferTreasureProvenance(w:DivineWorldSave,provenanceId:string|undefined,fromId:string,toId:string,eventId:string){
  if(!provenanceId)return false;
  const record=w.treasureProvenance?.find(x=>x.id===provenanceId);
  if(!record||record.ownerId!==fromId||record.transferEventIds.includes(eventId))return false;
  record.ownerId=toId;record.transferEventIds.push(eventId);
  return true;
}

/** Apply the bounded, once-per-loss consequence only when the former owner knows the board was the source. */
export function applyDisclosureGrievance(w:DivineWorldSave,n:SimNPC,duel:TreasureDuel,loss?:WorldEvent){
  if(!n.alive||n.ascended||!duel.sourceNewsId||!duel.sourceEventId||!duel.lossEventId)return false;
  const news=w.boardNews?.find(x=>x.id===duel.sourceNewsId&&x.targetId===n.id&&x.itemId===duel.itemId&&x.ownerAtPublishId===n.id&&!!x.sourceEventId&&!!x.provenanceId);
  const gift=news&&w.events.find(e=>e.id===news.sourceEventId&&e.type==='heavenly-gift');
  const provenance=w.treasureProvenance?.find(p=>p.id===duel.provenanceId&&p.itemId===duel.itemId&&p.sourceEventId===news?.sourceEventId&&p.ownerId===duel.attackerId&&p.transferEventIds.includes(duel.lossEventId!));
  const disclosed=n.knownFacts?.find(f=>f.kind==='treasure-disclosure'&&f.itemId===duel.itemId&&f.sourceId===duel.sourceNewsId);
  if(!news||news.provenanceId!==duel.provenanceId||news.sourceEventId!==provenance?.sourceEventId||duel.sourceEventId!==`board:${news.id}`||duel.status!=='won'||!duel.looted||gift&&(gift.targetId!==n.id||gift.data?.itemId!==duel.itemId)||loss&&(loss.id!==duel.lossEventId||loss.data?.sourceEventId!==duel.sourceEventId||loss.data?.newsId!==duel.sourceNewsId||loss.data?.provenanceId!==duel.provenanceId)||!provenance||!disclosed)return false;
  const id=`treasure-disclosure-grievance:${duel.lossEventId}`;
  const disposition=ensureDisposition(n);
  if(disposition.appliedIds.includes(id)||n.causalOpinions?.some(x=>x.id===id))return false;
  const personality=n.personality;
  const resentmentFactor=personality==='điềm tĩnh'?.45:personality==='cẩn trọng'?1.15:personality==='tham vọng'?1.1:personality==='nhân hậu'?.65:1;
  const trustFactor=disposition.trust>=65?.7:disposition.trust<=25?1.15:1;
  const resentment=Math.min(8,Math.max(1,Math.round(5*resentmentFactor)));
  const trustLoss=Math.min(5,Math.max(1,Math.round((disposition.trust>=65?2:3)*trustFactor)));
  disposition.appliedIds.push(id);
  disposition.trust=clamp(disposition.trust-trustLoss);
  disposition.resentment=clamp(disposition.resentment+resentment);
  disposition.causes.push({sourceId:id,parentSourceId:duel.lossEventId,type:'treasure-disclosure-grievance',impact:-trustLoss-resentment,day:w.clock.day,minute:w.clock.minute,description:'oán trách Thiên Bảng làm lộ bảo vật'});
  if(disposition.causes.length>60)disposition.causes.shift();
  const elapsed=now(w)-disposition.lastChangeAt,score=disposition.trust-disposition.resentment*.6,previous=disposition.alignment;
  let next=previous;
  if(elapsed>=180){if(previous==='vo_vi'){if(score>=65)next='thuan_thien';else if(score<=30)next='nghich_thien'}else if(previous==='thuan_thien'&&score<48)next='vo_vi';else if(previous==='nghich_thien'&&score>42)next='vo_vi'}
  if(next!==previous){disposition.alignment=next;disposition.lastChangeAt=now(w);const alignmentId=id+':alignment';disposition.appliedIds.push(alignmentId);w.events.push({id:alignmentId,type:'heaven-alignment-changed',day:w.clock.day,minute:w.clock.minute,actorId:n.id,description:`${n.name} chuyển từ ${alignmentName[previous]} sang ${alignmentName[next]} sau khi ${disposition.causes.at(-1)!.description}.`,status:'completed',data:{sourceId:id}})}
  n.causalOpinions??=[];
  n.causalOpinions.push({id,kind:'treasure-disclosure-grievance',sourceIds:[gift?.id??duel.sourceEventId,duel.sourceEventId,duel.lossEventId,disclosed.sourceId],description:'Tin Thiên Bảng đã dẫn kẻ tranh đoạt đến; oán trách việc bảo vật bị tiết lộ.',day:w.clock.day,minute:w.clock.minute});
  if(n.causalOpinions.length>100)n.causalOpinions.shift();
  n.memories.push({day:w.clock.day,text:'Biết việc Thanh Phong Kiếm bị công bố trên Thiên Bảng đã dẫn tới cuộc tranh đoạt.',kind:'causal-opinion',sourceId:id,knownThrough:'witnessed',itemId:duel.itemId,otherId:duel.attackerId});
  n.memories=n.memories.slice(-12);
  const event:WorldEvent={id,type:'treasure-disclosure-grievance',day:w.clock.day,minute:w.clock.minute,actorId:n.id,targetId:duel.attackerId,description:`${n.name} oán trách Thiên Đạo vì biết tin công bố bảo vật đã dẫn tới việc ${n.name} mất ${String(duel.itemId)}.`,status:'completed',data:{sourceId:duel.sourceEventId,sourceNewsId:duel.sourceNewsId,lossEventId:duel.lossEventId,itemId:duel.itemId,trustChange:-trustLoss,resentmentChange:resentment}};
  w.events.push(event);
  return true;
}

/** Turn real close-range speech into an observable event and recipient memory. */
export function discloseBoardSource(w:DivineWorldSave,speaker:SimNPC,listener:SimNPC,newsId:string){
  if(!speaker.alive||!listener.alive||speaker.ascended||listener.ascended||speaker.id===listener.id||Math.hypot(speaker.x-listener.x,speaker.y-listener.y)>=50)return null;
  const news=w.boardNews?.find(x=>x.id===newsId&&x.kind==='treasure'&&x.knownBy.includes(speaker.id)&&x.targetId===listener.id);
  if(!news?.itemId)return null;
  const id=`board-disclosure:${news.id}:${speaker.id}:${listener.id}`;
  const event:WorldEvent={id,type:'treasure-source-disclosed',day:w.clock.day,minute:w.clock.minute,actorId:speaker.id,targetId:listener.id,description:`${speaker.name} nói với ${listener.name}: “Thiên Bảng đã tiết lộ bảo vật của ngươi.”`,status:'completed',data:{sourceId:news.id,itemId:news.itemId,publicationEventId:`board:${news.id}`,originEventId:news.sourceEventId,provenanceId:news.provenanceId}};
  if(w.events.some(e=>e.id===id))return w.events.find(e=>e.id===id)!;
  w.events.push(event);
  if(rememberFact(w,listener,{id:`fact:${id}`,kind:'treasure-disclosure',sourceId:news.id,knownThrough:'told',itemId:news.itemId,otherId:speaker.id})){
    listener.memories.push({day:w.clock.day,text:`${speaker.name} nói rằng đã biết ${news.content} qua Thiên Bảng.`,kind:'news-disclosure',sourceId:id,knownThrough:'told',otherId:speaker.id,itemId:news.itemId});
    listener.memories=listener.memories.slice(-12);
    const previousLoss=(w.treasureDuels??[]).find(d=>d.defenderId===listener.id&&d.itemId===news.itemId&&d.sourceNewsId===news.id&&d.status==='won'&&d.looted&&d.lossEventId);
    if(previousLoss)applyDisclosureGrievance(w,listener,previousLoss,w.events.find(e=>e.id===previousLoss.lossEventId));
  }
  return event;
}


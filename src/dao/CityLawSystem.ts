import type { CityIncidentSave, DivineWorldSave, SimNPC } from './types';

const CITY={left:64*32,top:39*32,right:(64+88)*32,bottom:(39+57)*32};
const inside=(npc:SimNPC)=>npc.x>=CITY.left&&npc.x<=CITY.right&&npc.y>=CITY.top&&npc.y<=CITY.bottom;
const distance=(a:SimNPC,b:SimNPC)=>Math.hypot(a.x-b.x,a.y-b.y);

export interface CityCombatReport {eventId:string;attackerId:string;victimId:string;damage:number;authorizedDuel?:boolean;retaliation?:boolean;}

/** Records town violence against the actual current NPC roster and selects nearby responders without moving them. */
export function reportCityCombat(world:DivineWorldSave,report:CityCombatReport){
 world.cityLaw??={version:1,incidents:[],handledCombatEventIds:[],recentAssaults:[]};const law=world.cityLaw;
 if(law.handledCombatEventIds.includes(report.eventId))return{ok:false,reason:'duplicate'};
 law.handledCombatEventIds.push(report.eventId);if(law.handledCombatEventIds.length>256)law.handledCombatEventIds.shift();
 const attacker=world.npcs.find(n=>n.id===report.attackerId),victim=world.npcs.find(n=>n.id===report.victimId);
 if(!attacker||!victim||!attacker.alive||!victim.alive||attacker.id===victim.id||report.damage<=0)return{ok:false,reason:'invalid'};
 if(!inside(attacker)&&!inside(victim))return{ok:true,reason:'outside-city',responders:[]};
 if(report.authorizedDuel)return{ok:true,reason:'authorized-duel',responders:[]};
 const now=world.clock.day*1440+world.clock.minute,prior=law.recentAssaults.some(a=>a.attackerId===victim.id&&a.victimId===attacker.id&&now-a.at<=30);
 law.recentAssaults=law.recentAssaults.filter(a=>now-a.at<=30);law.recentAssaults.push({attackerId:attacker.id,victimId:victim.id,at:now});
 const selfDefense=Boolean(report.retaliation&&prior),suspect=selfDefense?victim:attacker,protectedNpc=selfDefense?attacker:victim;
 if(selfDefense){suspect.notoriety=Math.max(0,(suspect.notoriety??0)-1);return{ok:true,reason:'self-defense',responders:[]}}
 const previous=law.incidents.filter(i=>i.suspectId===suspect.id&&i.status!=='cleared').length;
 const severity=Math.min(3,1+(report.damage>=35?1:0)+(suspect.realmIndex>=2?1:0)+Math.min(1,previous));
 const guards=world.npcs.filter(n=>n.alive&&n.populationRole==='city_guard').sort((a,b)=>distance(a,suspect)-distance(b,suspect));
 const count=severity>=3?3:2,responderIds=guards.slice(0,count).map(n=>n.id),needsMaster=suspect.realmIndex>=2&&severity>=2;
 const incident:CityIncidentSave={id:`city-incident:${report.eventId}`,combatEventId:report.eventId,attackerId:attacker.id,victimId:victim.id,suspectId:suspect.id,protectedNpcId:protectedNpc.id,at:now,severity,status:'responding',responderIds,cityMasterDispatched:false,reason:selfDefense?'':`Tấn công trái phép trong địa giới thành; mức ${severity}.`};
 law.incidents.push(incident);if(law.incidents.length>100)law.incidents.shift();suspect.notoriety=(suspect.notoriety??0)+severity;suspect.grudges??={};suspect.grudges[protectedNpc.id]=(suspect.grudges[protectedNpc.id]??0)+severity*10;
 for(const id of responderIds){const guard=world.npcs.find(n=>n.id===id)!;guard.lawResponse={incidentId:incident.id,status:'responding',targetId:suspect.id,returnTarget:guard.home};guard.goalAction='guard';guard.shortGoal='Ứng phó bạo lực trong thành';guard.actionTarget={x:suspect.x,y:suspect.y};guard.actionProgress=0;guard.decisionSlot=`city-law:${incident.id}`}
 let cityMasterId:null|string=null;if(needsMaster){const master=world.npcs.find(n=>n.authorityRole==='city_master'&&n.alive);if(master){cityMasterId=master.id;incident.cityMasterDispatched=true;master.lawResponse={incidentId:incident.id,status:'responding',targetId:suspect.id,returnTarget:master.home};master.goalAction='guard';master.shortGoal='Thành chủ đích thân xử lý nguy cơ tu sĩ';master.actionTarget={x:suspect.x,y:suspect.y};master.actionProgress=0;master.decisionSlot=`city-law:${incident.id}`}}
 const eventId=`city-law:${incident.id}`;if(!world.events.some(e=>e.id===eventId)){world.events.push({id:eventId,day:world.clock.day,minute:world.clock.minute,type:'city-crime-reported',actorId:suspect.id,targetId:protectedNpc.id,description:`${suspect.name} gây thương tích cho ${protectedNpc.name} trong thành; ${responderIds.length} lính được điều động${cityMasterId?' và thành chủ đang đến':''}.`,status:'occurred'});if(world.events.length>400)world.events.shift()}
 return{ok:true,reason:'crime',incident,responderIds,cityMasterId};
}

export function markCityIncidentAtScene(world:DivineWorldSave,incidentId:string,npcId:string){const incident=world.cityLaw?.incidents.find(i=>i.id===incidentId);if(!incident||incident.status!=='responding')return false;const npc=world.npcs.find(n=>n.id===npcId);if(!npc?.lawResponse||npc.lawResponse.incidentId!==incidentId)return false;npc.lawResponse.status='at-scene';const guardsArrived=incident.responderIds.every(id=>world.npcs.find(n=>n.id===id)?.lawResponse?.status==='at-scene'),master=world.npcs.find(n=>n.id===world.authority?.cityMasterId),masterArrived=!incident.cityMasterDispatched||master?.lawResponse?.incidentId===incidentId&&master.lawResponse.status==='at-scene';if(guardsArrived&&masterArrived)incident.status='contained';return true}

export function clearCityResponse(world:DivineWorldSave,incidentId:string){const incident=world.cityLaw?.incidents.find(i=>i.id===incidentId);if(!incident||!['contained','responding'].includes(incident.status))return false;incident.status='cleared';for(const npc of world.npcs){if(npc.lawResponse?.incidentId!==incidentId)continue;delete npc.lawResponse;npc.decisionSlot=undefined;npc.goalAction=npc.populationRole==='city_guard'?'patrol':'rest';npc.shortGoal=npc.populationRole==='city_guard'?'Trở lại nhiệm vụ tuần tra':'Trở về công việc';npc.actionProgress=0}return true}

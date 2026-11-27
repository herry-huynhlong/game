import {REALMS} from '../systems/RealmConfig';
import { cultivationStats } from '../systems/CultivationSystem';
import { createPopulationNPC } from './AutonomousNPCSystem';
import { traitsFor } from './SettlementSystem';
import { NPC_POPULATION_QUOTAS } from './NPCPopulationRegistry';
import type { AuthorityRealmChange, DivineWorldSave, PopulationRole, SimNPC } from './types';

const cityId='city-master-qingyun';
function hash(text:string){return [...text].reduce((h,c)=>Math.imul(h^c.charCodeAt(0),16777619)>>>0,2166136261)}
function idNumber(id:string){const value=Number(id.match(/:(\d+)$/)?.[1]??id.match(/-(\d+)$/)?.[1]??0);return Number.isFinite(value)?value:0}
function stableRoster(world:DivineWorldSave,role:PopulationRole){const fromManifest=world.population?.idsByRole[role]??[];const ids=fromManifest.length?fromManifest:world.npcs.filter(n=>n.populationRole===role).map(n=>n.id);return ids.map(id=>world.npcs.find(n=>n.id===id)).filter((n):n is SimNPC=>!!n).sort((a,b)=>a.realmIndex-b.realmIndex||a.realmLevel-b.realmLevel||idNumber(a.id)-idNumber(b.id)||a.id.localeCompare(b.id))}
function roleTarget(role:PopulationRole,index:number,total:number,seed:number):{realmIndex:number;realmLevel:number}|null{
 const roll=seed>>>9;
 switch(role){
  case 'commoner':case 'tavern_staff':case 'repair_worker':case 'herb_gatherer':case 'quest_clerk':case 'merchant':return{realmIndex:0,realmLevel:1+roll%2};
  case 'low_disciple':return index<2?{realmIndex:1,realmLevel:1+roll%2}:{realmIndex:0,realmLevel:1+roll%5};
  case 'elder':return index<3?{realmIndex:1,realmLevel:7+index}:{realmIndex:2,realmLevel:1+index};
  case 'sect_leader':return{realmIndex:3,realmLevel:1+roll%2};
  case 'city_guard':return index<7?{realmIndex:0,realmLevel:2+roll%4}:{realmIndex:1,realmLevel:1+roll%3};
  case 'hunter':return index===0?{realmIndex:1,realmLevel:1+roll%3}:{realmIndex:0,realmLevel:1+roll%4};
  case 'independent_cultivator':return index<19?{realmIndex:0,realmLevel:1+roll%9}:index<28?{realmIndex:1,realmLevel:1+roll%9}:{realmIndex:2,realmLevel:1+roll%9};
 }
}
function promoteWithoutDowngrade(world:DivineWorldSave,n:SimNPC,target:{realmIndex:number;realmLevel:number},reason:string,changes:AuthorityRealmChange[]){
 const currentIndex=Math.max(0,n.realmIndex||0),currentLevel=Math.max(1,n.realmLevel||1);
 if(currentIndex>target.realmIndex||currentIndex===target.realmIndex&&currentLevel>=target.realmLevel)return;
 const oldStats=cultivationStats(n),hpRatio=oldStats.hpMax>0?Math.max(0,Math.min(1,n.hp/oldStats.hpMax)):1,mpRatio=oldStats.mpMax>0?Math.max(0,Math.min(1,n.mp/oldStats.mpMax)):1;
 const from={realmIndex:currentIndex,realmLevel:currentLevel};n.realmIndex=target.realmIndex;n.realmLevel=target.realmLevel;const newStats=cultivationStats(n);
 n.hp=newStats.hpMax*hpRatio;n.mp=newStats.mpMax*mpRatio;if(n.alive)n.lifespan=Math.max(n.lifespan,REALMS[n.realmIndex].lifespan);
 changes.push({npcId:n.id,from,to:{...target},reason});
}
function cityMasterNPC(world:DivineWorldSave,preservePopulation=false){const incumbent=world.authority?.cityMasterId??world.settlement.cityMasterId??world.npcs.find(n=>n.authorityRole==='city_master')?.id;const chosen=preservePopulation?world.npcs.filter(n=>n.populationRole==='independent_cultivator').sort((a,b)=>a.id.localeCompare(b.id))[0]:undefined;const id=incumbent??chosen?.id??cityId;let npc=world.npcs.find(n=>n.id===id);if(npc){if(preservePopulation){npc.authorityRole='city_master';npc.authorityScope='city';npc.populationDuty='Xuất thân tán tu; hiện giữ chức Thành chủ Thanh Vân Thành.';npc.faction='Thanh Vân Thành';npc.profession='tu_si';npc.homeId='city-lord-residence';npc.home={x:3952,y:1808};npc.x=npc.home.x;npc.y=npc.home.y;npc.actionTarget={x:npc.x,y:npc.y};const p=npc.aiProfile;if(p)npc.aiProfile={...p,origin:'Xuất thân tán tu; hiện giữ chức Thành chủ Thanh Vân Thành',familyCircumstance:'được giao trọng trách thành chủ; tài sản và vật phẩm giữ theo save'};}return npc}
 if(preservePopulation&&chosen){chosen.authorityRole='city_master';chosen.authorityScope='city';chosen.populationDuty='Xuất thân tán tu; hiện giữ chức Thành chủ Thanh Vân Thành.';chosen.faction='Thanh Vân Thành';chosen.profession='tu_si';chosen.homeId='city-lord-residence';chosen.home={x:3952,y:1808};chosen.x=chosen.home.x;chosen.y=chosen.home.y;chosen.actionTarget={x:chosen.x,y:chosen.y};if(chosen.aiProfile)chosen.aiProfile={...chosen.aiProfile,origin:'Xuất thân tán tu; hiện giữ chức Thành chủ Thanh Vân Thành',familyCircumstance:'được giao trọng trách thành chủ; tài sản và vật phẩm giữ theo save'};return chosen}
 const existingNames=new Set(world.npcs.map(n=>n.name));npc=createPopulationNPC('independent_cultivator',id,world.worldId,901,existingNames);delete npc.populationRole;delete npc.populationDuty;
 npc.name='Tạ Cảnh Minh';if(existingNames.has(npc.name)){const suffix=1; npc.name=`Tạ Cảnh Minh ${suffix}`}
 npc.age=48+(hash(`${world.worldId}:${id}:age`)%22);npc.lifespan=REALMS[3].lifespan;npc.gender='nam';npc.profession='tu_si';npc.faction='Thanh Vân Thành';npc.x=2180;npc.y=620;npc.home={x:2180,y:620};npc.homeId='city-plaza-master';npc.actionTarget={x:npc.x,y:npc.y};npc.realmIndex=3;npc.realmLevel=1;npc.xp=Math.min(npc.xp,100);npc.spiritStones=0;npc.inventory=[];npc.equippedWeapon=null;npc.authorityRole='city_master';npc.authorityScope='city';npc.ambition='Giữ bình an cho Thanh Vân Thành';npc.longGoal='Duy trì trật tự và bảo hộ cư dân thành';npc.shortGoal='Quản lý công việc trong thành';const profile=npc.aiProfile!;npc.aiProfile={...profile,origin:'Thanh Vân Thành · gia tộc quản sự lâu đời',familyCircumstance:'được giao trọng trách thành chủ; tài sản và vật phẩm theo save hiện có',socialClass:'khá giả',axes:{...profile.axes,caution:Math.max(70,profile.axes.caution),discipline:Math.max(65,profile.axes.discipline)}};npc.traits=traitsFor(npc);npc.hp=cultivationStats(npc).hpMax;npc.mp=cultivationStats(npc).mpMax;
 world.npcs.push(npc);return npc;
}

/** NPC.AUTHORITY.1-A: deterministic authority metadata and one-time, non-demoting realm rebalance. */
export function ensureAuthorityAndRealmProfiles(world:DivineWorldSave,options:{preservePopulation?:boolean}={}){
 const cityMaster=cityMasterNPC(world,options.preservePopulation===true),city=world.factions.find(f=>f.id==='qingyun-city');if(city){if(!city.memberIds.includes(cityMaster.id))city.memberIds.push(cityMaster.id);cityMaster.faction=city.name;city.leaderId=cityMaster.id}
 world.settlement.cityMasterId=cityMaster.id;
 const sect=world.sects.find(s=>s.factionId==='qingyun-sect'),sectLeader=world.npcs.find(n=>n.id===(sect?.leaderId??'van-du'))??world.npcs.find(n=>n.id==='van-du');
 cityMaster.authorityRole='city_master';cityMaster.authorityScope='city';
 if(sectLeader){sectLeader.authorityRole='sect_leader';sectLeader.authorityScope='sect'}
 for(const npc of world.npcs.filter(n=>n.populationRole==='elder')){npc.authorityRole='elder';npc.authorityScope='sect'}
 for(const npc of world.npcs.filter(n=>n.populationRole==='city_guard')){npc.authorityRole='city_guard';npc.authorityScope='city'}
 if(world.authority?.realmBalanceVersion===1){world.authority={...world.authority,cityMasterId:cityMaster.id,sectLeaderId:sectLeader?.id??world.authority.sectLeaderId};return world.authority}
 const changes:AuthorityRealmChange[]=[],apply=(role:PopulationRole)=>{const roster=stableRoster(world,role).filter(n=>!(options.preservePopulation&&n.authorityRole==='city_master'));roster.forEach((npc,index)=>{let target=roleTarget(role,index,roster.length,hash(`${world.worldId}:${npc.id}`));if(options.preservePopulation&&role==='independent_cultivator'&&index>=19)target={realmIndex:index<27?1:2,realmLevel:1+((hash(`${world.worldId}:${npc.id}`)>>>9)%9)};if(target)promoteWithoutDowngrade(world,npc,target,`Chuẩn hóa tu vi theo vai trò ${role} (NPC.AUTHORITY.1-A).`,changes)})};
 for(const role of Object.keys(NPC_POPULATION_QUOTAS) as PopulationRole[])apply(role);
 if(sectLeader)promoteWithoutDowngrade(world,sectLeader,{realmIndex:3,realmLevel:1},'Tông chủ Thanh Vân Tông được chuẩn hóa tối thiểu Nguyên Anh.',changes);
 promoteWithoutDowngrade(world,cityMaster,{realmIndex:3,realmLevel:1},'Thành chủ Thanh Vân Thành được thiết lập Nguyên Anh.',changes);
 world.authority={version:1,realmBalanceVersion:1,cityMasterId:cityMaster.id,sectLeaderId:sectLeader?.id??'van-du',realmChanges:changes};return world.authority;
}

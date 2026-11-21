import { createPopulationNPC } from './AutonomousNPCSystem';
import type { DivineWorldSave, PopulationRole, SimNPC } from './types';

export const NPC_POPULATION_QUOTAS:Readonly<Record<PopulationRole,number>>={commoner:20,low_disciple:20,elder:5,sect_leader:1,merchant:7,tavern_staff:3,city_guard:10,repair_worker:2,hunter:5,herb_gatherer:3,quest_clerk:2,independent_cultivator:30};
export const NPC_POPULATION_LABELS:Readonly<Record<PopulationRole,string>>={commoner:'Dân thường',low_disciple:'Đệ tử cấp thấp Thanh Vân Tông',elder:'Trưởng lão tông môn',sect_leader:'Tông chủ',merchant:'Thương nhân bày sạp',tavern_staff:'Nhân viên tửu quán',city_guard:'Lính canh thành',repair_worker:'Thợ sửa chữa',hunter:'Thợ săn',herb_gatherer:'Người hái dược',quest_clerk:'NPC trạm nhiệm vụ',independent_cultivator:'Tán tu độc lập'};
const roles=Object.keys(NPC_POPULATION_QUOTAS) as PopulationRole[];
const sectFaction='Thanh Vân Tông';
function assignExistingRoles(world:DivineWorldSave){
 const sect=world.sects.find(s=>s.factionId==='qingyun-sect'),leader=sect?.leaderId??'van-du',elders=new Set(sect?.elderIds??[]),sectMemberIds=new Set(world.factions.find(f=>f.id==='qingyun-sect')?.memberIds??[]),claimed=populationCounts(world);
 const claim=(n:SimNPC,role:PopulationRole)=>{if(claimed[role]>=NPC_POPULATION_QUOTAS[role])return false;n.populationRole=role;claimed[role]++;return true};
 for(const n of world.npcs){if(n.populationRole)continue;
  if(n.id===leader){claim(n,'sect_leader');continue}
  if(elders.has(n.id)||n.sectRank==='trưởng_lão'){claim(n,'elder');continue}
  if(n.id.startsWith('blackwind-')){if(claim(n,'independent_cultivator'))n.populationDuty='Hội viên Hắc Phong Hội; không thuộc Thanh Vân Tông';continue}
  if(n.profession==='thuong_nhan'){claim(n,'merchant');continue}
  if(n.profession==='ho_ve'){claim(n,'city_guard');continue}
  if(n.profession==='tho_re'){claim(n,'repair_worker');continue}
  if(n.profession==='duoc_su'){claim(n,'herb_gatherer');continue}
  if(n.profession==='dan_thuong'||n.profession==='nong_dan'){claim(n,'commoner');continue}
  if(sectMemberIds.has(n.id)&&n.faction===sectFaction&&['tu_si','dan_su'].includes(n.profession)){claim(n,'low_disciple');continue}
 }
}
function addFactionMembership(world:DivineWorldSave,n:SimNPC,role:PopulationRole){
 const factionId=role==='low_disciple'||role==='elder'||role==='sect_leader'?'qingyun-sect':role==='merchant'?'qingyun-traders':role==='city_guard'||role==='repair_worker'||role==='tavern_staff'||role==='quest_clerk'?'qingyun-city':role==='commoner'?'qingyun-village':undefined;
 const faction=world.factions.find(f=>f.id===factionId);if(!faction)return;
 if(!faction.memberIds.includes(n.id))faction.memberIds.push(n.id);n.faction=faction.name;
 if(role==='low_disciple'||role==='elder'||role==='sect_leader'){
  const sect=world.sects.find(s=>s.factionId==='qingyun-sect');if(!sect)return;
  if(role==='sect_leader'){if(!sect.leaderId)sect.leaderId=n.id;sect.rankByNpc[n.id]='chưởng_môn'}
  else if(role==='elder'){sect.rankByNpc[n.id]='trưởng_lão';if(!sect.elderIds.includes(n.id))sect.elderIds.push(n.id)}
  else sect.rankByNpc[n.id]='ngoại_môn';
  n.sectRank=sect.rankByNpc[n.id];
 }
}
function roleIds(world:DivineWorldSave){const result:Record<PopulationRole,string[]>={commoner:[],low_disciple:[],elder:[],sect_leader:[],merchant:[],tavern_staff:[],city_guard:[],repair_worker:[],hunter:[],herb_gatherer:[],quest_clerk:[],independent_cultivator:[]};for(const n of world.npcs)if(n.populationRole)result[n.populationRole].push(n.id);return result}

/** Adds only missing roster records. On a save already carrying a manifest, never respawns absent/dead residents. */
export function ensureNPCPopulation(world:DivineWorldSave){
 const alreadyInitialized=world.population?.initialized===true;
 if(!alreadyInitialized)assignExistingRoles(world);
 const idsByRole=roleIds(world),usedIds=new Set(world.npcs.map(n=>n.id)),usedNames=new Set(world.npcs.map(n=>n.name));
 if(!alreadyInitialized){
  for(const role of roles){const ids=idsByRole[role];for(let ordinal=ids.length+1;ordinal<=NPC_POPULATION_QUOTAS[role];ordinal++){
   let sequence=ordinal,id=`population:v1:${role}:${String(sequence).padStart(2,'0')}`;while(usedIds.has(id)){sequence++;id=`population:v1:${role}:${String(sequence).padStart(2,'0')}`}
   const npc=createPopulationNPC(role,id,world.worldId,sequence,usedNames);npc.populationRole=role;world.npcs.push(npc);usedIds.add(id);usedNames.add(npc.name);ids.push(id);addFactionMembership(world,npc,role);
  }}
  world.population={version:1,target:108,seed:world.worldId,initialized:true,idsByRole};
 }else{
  // Repair manifest bookkeeping only; preserving a missing/dead resident never causes a respawn.
  world.population={version:1,target:108,seed:world.population?.seed??world.worldId,initialized:true,idsByRole:{...world.population?.idsByRole,...idsByRole}};
 }
 return world.population;
}

export function populationCounts(world:Pick<DivineWorldSave,'npcs'>){const counts:Record<PopulationRole,number>={commoner:0,low_disciple:0,elder:0,sect_leader:0,merchant:0,tavern_staff:0,city_guard:0,repair_worker:0,hunter:0,herb_gatherer:0,quest_clerk:0,independent_cultivator:0};for(const n of world.npcs)if(n.populationRole)counts[n.populationRole]++;return counts}

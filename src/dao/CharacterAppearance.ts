import type { SimNPC } from './types';

export const NPC_STYLE_POOLS: Record<string, string[]> = {
  sect_m: ['npc-sect_m-01','npc-sect_m-02','npc-sect_m-03','npc-sect_m-04'],
  sect_f: ['npc-sect_f-01','npc-sect_f-02','npc-sect_f-03','npc-sect_f-04','npc-sect_f-05'],
  alchemist_m: ['npc-alchemist_m-01','npc-alchemist_m-02','npc-alchemist_m-03','npc-alchemist_m-04'],
  alchemist_f: ['npc-alchemist_f-01'],
  merchant_m: ['npc-merchant_m-01','npc-merchant_m-02','npc-merchant_m-03'],
  merchant_f: ['npc-merchant_f-01','npc-merchant_f-02'],
  smith_m: ['npc-smith_m-01','npc-smith_m-02'],
  smith_f: ['npc-smith_f-01'],
  guard_m: ['npc-guard_m-01','npc-guard_m-02'],
  guard_f: ['npc-guard_f-01'],
  elder_m: ['npc-elder_m-01','npc-elder_m-02'],
  elder_f: ['npc-elder_f-01'],
  civilian_m: ['npc-civilian_m-01','npc-civilian_m-02'],
  civilian_f: ['npc-civilian_f-01'],
  farmer_m: ['npc-farmer_m-01','npc-farmer_m-02'],
  rogue_m: ['npc-rogue_m-01','npc-rogue_m-02','npc-rogue_m-03','npc-rogue_m-04'],
  city_master: ['npc-elder_m-02'],
  sect_leader_m: ['npc-sect_m-04'],
  sect_leader_f: ['npc-sect_f-05'],
};

export const NPC_STYLE_TEXTURES = [...new Set(Object.values(NPC_STYLE_POOLS).flat())];

export type NPCModularPartKind='hair'|'face'|'outfit'|'accessory';
export const NPC_MODULAR_PART_IDS:Record<NPCModularPartKind,string[]> = Object.freeze({
  hair: Array.from({length:12},(_,i)=>`hair-${String(i+1).padStart(2,'0')}`),
  face: Array.from({length:10},(_,i)=>`face-${String(i+1).padStart(2,'0')}`),
  outfit: Array.from({length:18},(_,i)=>`outfit-${String(i+1).padStart(2,'0')}`),
  accessory: Array.from({length:10},(_,i)=>`accessory-${String(i+1).padStart(2,'0')}`),
});

const MODULAR_GROUPS = Object.freeze({hair:4,face:4,outfit:4,accessory:4});
export const NPC_MODULAR_TEXTURES = Object.freeze((Object.entries(MODULAR_GROUPS) as [NPCModularPartKind,number][]).flatMap(([kind,size])=>{
  const count=NPC_MODULAR_PART_IDS[kind].length;
  return Array.from({length:Math.ceil(count/size)},(_,i)=>{
    const first=i*size+1,last=Math.min(count,first+size-1);
    return `npc-${kind}-${String(first).padStart(2,'0')}-${String(last).padStart(2,'0')}`;
  });
}));

const modHash=(text:string)=>{let h=2166136261;for(const ch of text)h=Math.imul(h^ch.charCodeAt(0),16777619)>>>0;return h>>>0};
const partId=(kind:keyof typeof NPC_MODULAR_PART_IDS,serial:number)=>NPC_MODULAR_PART_IDS[kind][(serial-1)%NPC_MODULAR_PART_IDS[kind].length];

/** Stable, appearance-only modular parts. Keeps the legacy `appearance` gameplay archetype untouched. */
export function ensureNPCModularAppearances(npcs:SimNPC[]):boolean{
  let changed=false;
  for(const npc of npcs){
    const old=npc.visualParts;
    if(old&&old.bodyId===npc.visualStyleId&&NPC_MODULAR_PART_IDS.face.includes(old.faceId)&&NPC_MODULAR_PART_IDS.hair.includes(old.hairId)&&NPC_MODULAR_PART_IDS.outfit.includes(old.outfitId)&&old.accessoryIds.every(id=>NPC_MODULAR_PART_IDS.accessory.includes(id)))continue;
    const choose=(list:number[],salt:number)=>list[(modHash(`${npc.id}:${salt}`)%list.length)];
    const isFemale=npc.gender==='nữ',isElder=npc.age>=66||npc.populationRole==='elder';
    const hairPool=isElder?(isFemale?[8,9]:[8,9,12]):isFemale?[2,4,5,6,7,10,12]:[1,2,3,4,6,7,10,11,12];
    const facePool=isElder?(isFemale?[6,9]:[3,5,7]):isFemale?[2,4,6,8,9,10]:[1,3,5,7,8,9,10];
    let outfitPool:number[];
    switch(npc.populationRole){
      case'city_guard':outfitPool=[7,8];break;
      case'low_disciple':outfitPool=[9,10];break;
      case'elder':outfitPool=[11];break;
      case'sect_leader':outfitPool=[18];break;
      case'merchant':outfitPool=[4,5];break;
      case'tavern_staff':outfitPool=[6];break;
      case'repair_worker':outfitPool=[1,2,3];break;
      case'hunter':outfitPool=[13];break;
      case'herb_gatherer':outfitPool=[14];break;
      case'quest_clerk':outfitPool=[12];break;
      case'independent_cultivator':outfitPool=[15,16];break;
      default:outfitPool=npc.profession==='nong_dan'?[2,3]:[1,2,3];
    }
    if(npc.authorityRole==='city_master')outfitPool=[17];
    const accessPool:number[]=[];
    if(npc.populationRole==='city_guard')accessPool.push(1,7,8);
    else if(npc.populationRole==='merchant')accessPool.push(5,6);
    else if(npc.populationRole==='hunter')accessPool.push(3,5,6);
    else if(npc.populationRole==='herb_gatherer')accessPool.push(4,5,9);
    else if(npc.populationRole==='low_disciple'||npc.populationRole==='elder'||npc.populationRole==='sect_leader')accessPool.push(9,10);
    else if(npc.populationRole==='repair_worker')accessPool.push(3,6,8);
    else if(isFemale)accessPool.push(9);
    const accessories=accessPool.length&&modHash(`${npc.id}:accessory-enabled`)%4!==0?[partId('accessory',choose(accessPool,11))]:[];
    const hairNumber=choose(hairPool,1),faceNumber=choose(facePool,2);
    npc.visualParts={bodyId:npc.visualStyleId??'npc-civilian_m-01',faceId:partId('face',faceNumber),hairId:partId('hair',hairNumber),hairColorId:hairNumber===8||hairNumber===9?'silver':hairNumber===3||hairNumber===6||hairNumber===10?'brown':'black',outfitId:partId('outfit',choose(outfitPool,3)),accessoryIds:accessories};
    changed=true;
  }
  return changed;
}

/** Resolve one part ID to its shared Phaser sheet and frame offset. */
export function resolveNPCModularPart(id:string){
  for(const kind of Object.keys(NPC_MODULAR_PART_IDS) as NPCModularPartKind[]){const ids=NPC_MODULAR_PART_IDS[kind];
    const index=ids.indexOf(id);if(index<0)continue;
    const first=Math.floor(index/4)*4,last=Math.min(ids.length,first+4),sheet=`npc-${kind}-${String(first+1).padStart(2,'0')}-${String(last).padStart(2,'0')}`;
    return{kind,sheet,textureKey:`modular-${sheet}`,variant:index-first,frameOffset:(index-first)*12};
  }
  return null;
}

function appearanceGroup(npc: SimNPC): string | null {
  const female = npc.gender === 'nữ';
  if (npc.id === 'van-du') return null;
  if (npc.authorityRole === 'city_master') return 'city_master';
  if (npc.authorityRole === 'sect_leader' || npc.populationRole === 'sect_leader' || npc.sectRank === 'chưởng_môn') return female ? 'sect_leader_f' : 'sect_leader_m';
  if (npc.populationRole === 'elder' || npc.sectRank === 'trưởng_lão') return female ? 'elder_f' : 'elder_m';
  if (npc.populationRole === 'hunter') return 'rogue_m';
  if (npc.populationRole === 'independent_cultivator' || npc.faction.includes('Hắc Phong')) return npc.faction.includes('Hắc Phong') ? 'rogue_m' : (female ? 'sect_f' : 'rogue_m');
  if (npc.populationRole === 'tavern_staff') return female ? 'merchant_f' : 'civilian_m';
  if (npc.populationRole === 'repair_worker') return female ? 'smith_f' : 'smith_m';
  if (npc.populationRole === 'herb_gatherer') return female ? 'alchemist_f' : 'alchemist_m';
  if (npc.populationRole === 'quest_clerk') return female ? 'civilian_f' : 'alchemist_m';
  if (npc.populationRole === 'merchant') return female ? 'merchant_f' : 'merchant_m';
  if (npc.populationRole === 'city_guard') return female ? 'guard_f' : 'guard_m';
  if (npc.populationRole === 'commoner') return female ? 'civilian_f' : (npc.profession === 'nong_dan' ? 'farmer_m' : 'civilian_m');
  if (npc.populationRole === 'low_disciple') return female ? 'sect_f' : 'sect_m';
  if (npc.profession === 'tu_si') return female ? 'sect_f' : 'sect_m';
  if (npc.profession === 'dan_su' || npc.profession === 'duoc_su') return female ? 'alchemist_f' : 'alchemist_m';
  if (npc.profession === 'thuong_nhan') return female ? 'merchant_f' : 'merchant_m';
  if (npc.profession === 'tho_re') return female ? 'smith_f' : 'smith_m';
  if (npc.profession === 'ho_ve') return female ? 'guard_f' : 'guard_m';
  if (npc.profession === 'nong_dan') return 'farmer_m';
  if (npc.profession === 'dan_thuong') return female ? 'civilian_f' : 'civilian_m';
  return null;
}

/** Persist an appearance-only ID once; it never changes NPC gameplay stats. */
export function ensureNPCVisualStyles(npcs: SimNPC[]): boolean {
  let changed = false;
  const groups = new Map<string, SimNPC[]>();
  for (const npc of npcs) {
    const group = appearanceGroup(npc);
    if (group) groups.set(group, [...(groups.get(group) ?? []), npc]);
  }
  for (const [group, members] of groups) {
    const pool = NPC_STYLE_POOLS[group];
    if (!pool?.length) continue;
    members.sort((a, b) => a.id.localeCompare(b.id));
    members.forEach((npc, index) => {
      // One-time role migration: keep a saved look when it belongs to this role's
      // visual family; otherwise choose a stable family member by NPC ID order.
      if (npc.visualStyleId && pool.includes(npc.visualStyleId)) return;
      npc.visualStyleId = pool[index % pool.length];
      changed = true;
    });
  }
  return changed;
}

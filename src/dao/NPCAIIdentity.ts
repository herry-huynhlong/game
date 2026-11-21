import type { NPCProfession, NPCAIProfile, SimNPC } from './types';

function hash(value:string){let h=2166136261;for(const c of value)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0}
function roll(seed:number,salt:number){let x=(seed^Math.imul(salt+1,0x9e3779b1))>>>0;x^=x>>>16;x=Math.imul(x,0x7feb352d);x^=x>>>15;x=Math.imul(x,0x846ca68b);x^=x>>>16;return x>>>0}
const range=(seed:number,salt:number,min:number,max:number)=>min+(roll(seed,salt)%(max-min+1));
export function createNPCAIProfile(worldSeed:string,npc:Pick<SimNPC,'id'|'profession'|'faction'>):NPCAIProfile{
 const seed=hash(`${worldSeed}:${npc.id}`),axes={diligence:range(seed,0,25,95),courage:range(seed,1,20,90),ambition:range(seed,2,20,95),generosity:range(seed,3,20,90),sociability:range(seed,4,15,90),caution:range(seed,5,20,95),discipline:range(seed,6,20,95)};
 if(npc.profession==='nong_dan'){axes.diligence=Math.max(axes.diligence,55);axes.caution=Math.max(axes.caution,45)}
 if(npc.profession==='tu_si'){axes.ambition=Math.max(axes.ambition,45);axes.discipline=Math.max(axes.discipline,40)}
 const classRoll=roll(seed,7)%100;const socialClass:NPCAIProfile['socialClass']=classRoll<32?'bần hàn':classRoll<86?'bình dân':'khá giả';
 const origin=npc.profession==='nong_dan'?'Thanh Vân Thôn · gia đình làm ruộng':npc.profession==='tu_si'?`${npc.faction} · con đường tu hành ngoại môn`:`${npc.faction} · gia đình hành nghề ${npc.profession}`;
 const familyCircumstance=npc.profession==='nong_dan'?(socialClass==='bần hàn'?'nhà thiếu lương thực dự trữ':socialClass==='khá giả'?'có ruộng gia đình ổn định':'gia đình sống bằng vụ mùa'):(npc.profession==='tu_si'?(socialClass==='bần hàn'?'tự kiếm tài nguyên tu hành':socialClass==='khá giả'?'được gia đình hỗ trợ cơ bản':'dựa vào công lao môn phái'):'đời sống theo nghề nghiệp và tài sản hiện có');
 return {seed,origin,familyCircumstance,socialClass,axes};
}
export function ensureNPCAIProfile(npc:SimNPC,worldSeed:string){if(!npc.aiProfile)npc.aiProfile=createNPCAIProfile(worldSeed,npc);return npc.aiProfile}
export function seedFor(worldSeed:string,npcId:string){return hash(`${worldSeed}:${npcId}`)}

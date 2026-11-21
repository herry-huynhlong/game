import type { HeavenSave, SimNPC } from './types';
import { addCultivationXp, cultivationStats } from '../systems/CultivationSystem';
import { HEAVENLY_POWERS } from './HeavenlyPowerSystem';
import { DivineResourceSystem } from './DivineResourceSystem';

export const HEAVEN_DEFAULTS:HeavenSave={level:1,qi:30,qiMax:30,fragments:0,unlocked:['observe','mark','follow','minor-blessing'],markedNPCs:[],followedNPC:null,blessingDay:1,blessingCount:0,introSeen:false,divinePower:30,divinePowerMax:9999,resourceMigrationVersion:1,possession:null,mode:'heavenly',playerId:'local-player',originWorldId:'',ascendedCultivators:[],activeAscendedId:null};
export class HeavenlyDaoSystem {
 constructor(readonly state:HeavenSave){}
 mark(npc:SimNPC){npc.marked=!npc.marked;this.state.markedNPCs=this.state.markedNPCs.filter(id=>id!==npc.id);if(npc.marked)this.state.markedNPCs.push(npc.id)}
 bless(npc:SimNPC,day:number):{ok:boolean;message:string}{
  const blessing=HEAVENLY_POWERS['minor-blessing'];if(!blessing.implemented||!this.state.unlocked.includes(blessing.id))return {ok:false,message:'Quyền năng ban phúc chưa mở khóa.'};
  if(!npc.alive||npc.ascended)return {ok:false,message:'Không thể ban phúc cho sinh linh đã mất hoặc phi thăng.'};
  if(this.state.possession?.npcId===npc.id)return {ok:false,message:'Không thể ban phúc cho người đang nhập hồn.'};
  if(day!==this.state.blessingDay){this.state.blessingDay=day;this.state.blessingCount=0}if(this.state.blessingCount>=3)return {ok:false,message:'Hôm nay Thiên Đạo đã ban ba lần tiểu phúc.'};
  const cost=blessing.cost;if(!DivineResourceSystem.spendPower(this.state,cost))return {ok:false,message:'Thần Lực không đủ (cần '+cost+').'};
  const before=npc.xp;const cultivation={realmIndex:npc.realmIndex,realmLevel:npc.realmLevel,xp:npc.xp,spiritualRoot:npc.spiritualRoot,technique:npc.technique,techniqueMastery:npc.techniqueMastery,techniqueProgress:npc.techniqueProgress};
  this.state.blessingCount++;addCultivationXp(cultivation,20);npc.xp=cultivation.xp;const stats=cultivationStats(npc);npc.hp=Math.min(stats.hpMax,npc.hp+20);npc.mp=Math.min(stats.mpMax,npc.mp+10);return {ok:true,message:'Đã ban phúc: tu vi '+before.toFixed(1)+' → '+npc.xp.toFixed(1)+', hồi sinh lực và linh lực.'};
 }
}

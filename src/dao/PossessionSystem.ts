import type { HeavenSave, SimNPC } from './types';
import { DivineResourceSystem } from './DivineResourceSystem';

export const POSSESSION_COST_BY_REALM=[5,10,20,35,50] as const;
export const POSSESSION_CYCLE_MS=15*60*1000;
export class PossessionSystem {
  static cost(npc:SimNPC){return POSSESSION_COST_BY_REALM[Math.max(0,Math.min(4,npc.realmIndex))]}
  static start(heaven:HeavenSave,npc:SimNPC){if(!npc.alive||npc.ascended)return {ok:false,message:'NPC không thể nhập hồn.'};if(heaven.possession)return {ok:false,message:'Đang nhập hồn một sinh linh khác.'};if(!DivineResourceSystem.spendPower(heaven,this.cost(npc)))return {ok:false,message:'Thần Lực không đủ cho chu kỳ đầu.'};heaven.possession={npcId:npc.id,remainingMs:POSSESSION_CYCLE_MS,paidCycles:1};heaven.mode='possessing';return {ok:true,message:`Đã nhập hồn ${npc.name}.`}}
  static tick(heaven:HeavenSave,npc:SimNPC|undefined,elapsedMs:number){const session=heaven.possession;if(!session)return 'idle' as const;if(!npc?.alive){this.end(heaven);return 'dead' as const}session.remainingMs=Math.max(0,session.remainingMs-Math.max(0,elapsedMs));if(session.remainingMs>0)return 'active' as const;if(DivineResourceSystem.spendPower(heaven,this.cost(npc))){session.remainingMs=POSSESSION_CYCLE_MS;session.paidCycles++;return 'renewed' as const}this.end(heaven);return 'depleted' as const}
  static end(heaven:HeavenSave){heaven.possession=null;if(heaven.mode==='possessing')heaven.mode='heavenly'}
}

import type { AscendedCultivatorRecord, DivineWorldSave, HeavenSave, SimNPC } from './types';
import { DivineResourceSystem } from './DivineResourceSystem';

export class AscensionSystem {
  static eligible(npc:SimNPC){return npc.alive&&!npc.ascended&&npc.realmIndex>=4}
  static ascend(world:DivineWorldSave,npc:SimNPC,playerId=world.heaven.playerId):{ok:boolean;message:string;record?:AscendedCultivatorRecord}{
    if(!this.eligible(npc))return {ok:false,message:'Chỉ tu sĩ Hóa Thần còn sống mới đủ điều kiện thử nghiệm phi thăng.'};
    if(!DivineResourceSystem.spendFragments(world.heaven,100))return {ok:false,message:'Cần đủ 100 Mảnh Vỡ Thiên Đạo.'};
    npc.alive=false;npc.ascended=true;const record:AscendedCultivatorRecord={id:npc.id,npc:structuredClone(npc),originWorldId:world.worldId,playerId,ascendedAtDay:world.clock.day,status:'ascended'};world.ascendedRecords.push(record);world.heaven.ascendedCultivators.push(npc.id);return {ok:true,message:`${npc.name} đã được ghi nhận phi thăng (mô hình thử nghiệm).`,record};
  }
  static returnToOrigin(heaven:HeavenSave,world:DivineWorldSave,record:AscendedCultivatorRecord){if(record.originWorldId!==world.worldId||heaven.originWorldId!==world.worldId)return false;record.status='dead';heaven.mode='heavenly';heaven.activeAscendedId=null;return true}
}

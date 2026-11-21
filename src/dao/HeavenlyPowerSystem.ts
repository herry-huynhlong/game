export type HeavenlyPowerId='minor-blessing'|'gift-item'|'fortune-opportunity'|'cultivation-aura'|'heavenly-punishment'|'reveal-board'|'alter-fate'|'heavenly-mandate';
import { DivineResourceSystem } from './DivineResourceSystem';
import type { HeavenSave } from './types';
export interface HeavenlyPowerDefinition {id:HeavenlyPowerId;name:string;cost:number;implemented:boolean;description:string;unlockCost?:number;cooldown?:number;icon?:string;damageRatio?:number;defenseFactor?:number;maxActive?:number;duration?:number;}
/** Registry is deliberately descriptive: only minor-blessing has an executable effect in this part. */
export const HEAVENLY_POWERS:Record<HeavenlyPowerId,HeavenlyPowerDefinition>={
  'minor-blessing':{id:'minor-blessing',name:'Tiểu Phúc Thiên Đạo',cost:5,implemented:true,description:'Tăng tối đa 20 tu vi và hồi sinh lực, tối đa ba lần mỗi ngày thế giới.'},
  'gift-item':{id:'gift-item',name:'Ban Pháp Bảo',cost:8,unlockCost:10,cooldown:0,icon:'✦',implemented:true,description:'Ban kiếm; chi phí tùy loại vật phẩm.'},
  'fortune-opportunity':{id:'fortune-opportunity',name:'Ban Cơ Duyên',cost:0,implemented:false,description:'Sắp đặt cơ duyên theo tính cách và vận mệnh NPC.'},
  'cultivation-aura':{id:'cultivation-aura',name:'Gia Trì Tu Luyện',cost:0,implemented:false,description:'Tạm thời tăng tốc độ hấp thu linh khí.'},
  'heavenly-punishment':{id:'heavenly-punishment',name:'Thiên Lôi Giáng Thế',cost:20,unlockCost:15,cooldown:60000,damageRatio:.3,defenseFactor:.5,icon:'⚡',implemented:true,description:'Giáng lôi lên một sinh linh Phàm Giới. Hồi chiêu 60 giây thực.'},
  'reveal-board':{id:'reveal-board',name:'Thiên Bảng — Công Bố Thiên Cơ',cost:8,unlockCost:12,cooldown:120000,implemented:true,description:'Công bố thiên cơ, tin lan truyền giữa các sinh linh.'},
  'alter-fate':{id:'alter-fate',name:'Can Thiệp Vận Mệnh',cost:0,implemented:false,description:'Gieo một biến số vào vận mệnh NPC.'},
  'heavenly-mandate':{id:'heavenly-mandate',name:'Thiên Mệnh Chi Tử',cost:8,unlockCost:10,cooldown:720,duration:720,maxActive:3,implemented:true,description:'Sắc phong và ban chỉ dẫn chuyên tâm tu luyện.'},
};
export function unlockPower(state:HeavenSave,id:HeavenlyPowerId){const power=HEAVENLY_POWERS[id];if(!power||!power.implemented)return {ok:false,message:'Quyền năng chưa khả dụng.'};if(state.unlocked.includes(id))return {ok:false,message:'Quyền năng đã mở khóa.'};if(!DivineResourceSystem.spendFragments(state,power.unlockCost??0))return {ok:false,message:'Không đủ Mảnh Vỡ Thiên Đạo.'};state.unlocked.push(id);return {ok:true,message:'Đã mở khóa '+power.name+'.'};}

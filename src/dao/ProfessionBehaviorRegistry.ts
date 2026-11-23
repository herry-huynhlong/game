import type { NPCAction, NPCProfession, PopulationRole } from './types';

export const PROFESSION_BEHAVIORS = {
  tu_si:{action:'cultivate',station:'sect-yard',minutes:60,input:'Công pháp; Tụ Khí Đan khi đột phá',output:'Tu vi và công pháp'},
  dan_su:{action:'work',station:'market-stall-01',minutes:75,input:'2 linh thảo',output:'1 Tụ Khí Đan'},
  duoc_su:{action:'work',station:'market-stall-01',minutes:75,input:'2 linh thảo',output:'1 Tụ Khí Đan'},
  thuong_nhan:{action:'trade',station:'city-center',minutes:25,input:'Hàng tồn, khách và quỹ cửa hàng',output:'Giao dịch hoặc tiền công theo giao dịch'},
  ho_ve:{action:'patrol',station:'gate-north',minutes:60,input:'Đủ sinh lực và điểm tuần tra an toàn',output:'An toàn; phản ứng với báo động'},
  dan_thuong:{action:'socialize',station:'city-center',minutes:75,input:'Quỹ trả công hoặc người trò chuyện',output:'Tiền công hoặc quan hệ'},
  tho_re:{action:'work',station:'quest-office',minutes:75,input:'2 quặng và 1 gỗ, hoặc vật liệu ủy thác',output:'Phàm kiếm hoặc công trình đã sửa'},
  nong_dan:{action:'farm',station:'south-outskirts',minutes:90,input:'Thóc giống và vị trí ruộng',output:'Khẩu phần, thóc giống và hàng nhập kho'},
} as const satisfies Record<NPCProfession,{action:NPCAction;station:string;minutes:number;input:string;output:string}>;

export const SPECIAL_DUTIES:Partial<Record<PopulationRole,{action:NPCAction;station:string;minutes:number}>>={
  tavern_staff:{action:'work',station:'tavern-entrance',minutes:75},
  quest_clerk:{action:'work',station:'quest-office',minutes:75},
};

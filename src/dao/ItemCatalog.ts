export type ItemKind='weapon'|'treasure'|'pill'|'talisman'|'herb'|'material'|'special';
export type ItemTier='mortal'|'artifact'|'spirit'|'treasure'|'spiritual-treasure'|'immortal'|'divine';
export type ItemQuality='low'|'middle'|'high';
export interface ItemDefinition { id:string; name:string; kind:ItemKind; tier:ItemTier; quality:ItemQuality; description:string; value:number; }
export const ITEM_CATALOG:Record<string,ItemDefinition>={
  iron_sword:{id:'iron_sword',name:'Thiết Mộc Kiếm',kind:'weapon',tier:'mortal',quality:'middle',description:'Kiếm gỗ lõi thiết mộc dùng luyện kiếm.',value:12},
  iron_dao:{id:'iron_dao',name:'Thiết Diệp Đao',kind:'weapon',tier:'mortal',quality:'middle',description:'Đao một lưỡi cong nhẹ, rèn từ sắt thô và cán gỗ sơn dầu.',value:16},
  qi_pill:{id:'qi_pill',name:'Tụ Khí Đan',kind:'pill',tier:'artifact',quality:'low',description:'Đan dược hỗ trợ người Luyện Khí.',value:18},
  spirit_herb:{id:'spirit_herb',name:'Ngưng Lộ Thảo',kind:'herb',tier:'mortal',quality:'high',description:'Linh thảo mọc quanh linh mạch.',value:7},
  protective_talisman:{id:'protective_talisman',name:'Hộ Thân Phù',kind:'talisman',tier:'artifact',quality:'middle',description:'Phù lục hộ thân do đan sư chế tác.',value:25},
  jade_token:{id:'jade_token',name:'Thanh Vân Ngọc Lệnh',kind:'special',tier:'spirit',quality:'high',description:'Tín vật của Thanh Vân Môn.',value:0},
  ration:{id:'ration',name:'Lương khô',kind:'material',tier:'mortal',quality:'low',description:'Một phần lương thực bình dân.',value:4},
  rice_seed:{id:'rice_seed',name:'Thóc giống',kind:'material',tier:'mortal',quality:'low',description:'Hạt giống dành cho một vụ canh tác.',value:2},
  wood:{id:'wood',name:'Gỗ tùng',kind:'material',tier:'mortal',quality:'middle',description:'Gỗ đã sơ chế từ rừng Thanh Vân.',value:4},
  iron_ore:{id:'iron_ore',name:'Quặng sắt',kind:'material',tier:'mortal',quality:'middle',description:'Quặng dùng rèn phàm kiếm.',value:8},
  wolf_pelt:{id:'wolf_pelt',name:'Da Thanh Lang',kind:'material',tier:'mortal',quality:'middle',description:'Tấm da yêu lang đã được xử lý sơ bộ.',value:9},
  wolf_fang:{id:'wolf_fang',name:'Nanh Thanh Lang',kind:'material',tier:'mortal',quality:'high',description:'Nanh yêu thú cứng, dùng làm nguyên liệu chế tạo.',value:12},
  demon_core:{id:'demon_core',name:'Yêu Đan Thanh Lang',kind:'material',tier:'spirit',quality:'high',description:'Yêu đan hiếm còn sót lại trong Thanh Lang.',value:35},
  deer_meat:{id:'deer_meat',name:'Thịt hươu',kind:'material',tier:'mortal',quality:'middle',description:'Thịt thú rừng thu được sau khi săn hươu hợp lệ.',value:0},
  scorpion_venom:{id:'scorpion_venom',name:'Nọc bọ cạp',kind:'material',tier:'mortal',quality:'middle',description:'Túi nọc của bọ cạp yêu cấp thấp.',value:0},
  snake_skin:{id:'snake_skin',name:'Da rắn',kind:'material',tier:'mortal',quality:'middle',description:'Lớp da của rắn yêu cấp thấp.',value:0},
};

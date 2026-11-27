export const GRADES = [
  {name:'Phàm',color:0xdde3e1,power:1,weapon:.08,realm:0,study:1,rarity:'Phổ thông'},
  {name:'Hoàng',color:0x74d996,power:1.20,weapon:.16,realm:0,study:1.6,rarity:'Ít gặp'},
  {name:'Huyền',color:0x6baeff,power:1.50,weapon:.32,realm:1,study:2.5,rarity:'Hiếm'},
  {name:'Địa',color:0xb491ff,power:2,weapon:.54,realm:2,study:4,rarity:'Truyền thừa'},
  {name:'Thiên',color:0xffd476,power:2.8,weapon:.85,realm:3,study:7,rarity:'Tuyệt thế'},
] as const;
export const MASTERY = ['Nhập môn','Tiểu thành','Đại thành','Viên mãn','Hóa cảnh'];
export const MASTERY_XP = [0,90,240,470,800];
export const ELEMENTS = {wind:'Phong',earth:'Thổ',fire:'Hỏa',wood:'Mộc',thunder:'Lôi',ice:'Băng',shadow:'Âm',sword:'Kiếm',sun:'Thái Dương'};
type Element = keyof typeof ELEMENTS;
type Form = 'line'|'arc'|'burst'|'field'|'self'|'ally'|'step';
type Effect = 'damage'|'guard'|'heal'|'root'|'weaken'|'burn'|'interrupt'|'dash';
export type MartialDelivery = 'self'|'melee'|'directional'|'projectile'|'homing'|'ground'|'area'|'field'|'summon'|'support';
const flying=new Set(['breeze-cut','jade-wave','three-jade','fire-palm','flame-burst','purple-slash','ice-finger','hundred-swords']);
const summons=new Set(['myriad-unite','dragon-breath','scarlet-dragon','nine-dragons','crow-descent']);
function delivery(id:string,form:Form,hits:number):MartialDelivery {
  if(summons.has(id))return 'summon';
  if(id==='three-jade'||id==='hundred-swords')return 'homing';
  if(flying.has(id))return 'projectile';
  if(form==='field')return hits>1?'field':'ground';
  if(form==='burst')return 'area';
  if(form==='ally')return 'support';
  if(form==='self')return 'self';
  if(form==='arc'||['heavy-fist','spear-thrust','spear-break'].includes(id))return 'melee';
  return 'directional';
}
type Row = [id:string,name:string,form:Form,effect:Effect,range:number,width:number,force:number,vfx:string,description:string,hits?:number,duration?:number];
type Course = [id:string,name:string,element:Element,source:string,category:string,roots:string[],price:number,moves:[Row,Row,Row]];
const courses: Course[] = [
  ['breeze','Thanh Phong Kiếm Pháp','wind','Thiết Mộc Các','Kiếm đạo',['metal','wood'],2,[
    ['breeze-cut','Thanh Phong Trảm','line','damage',105,13,1,'blade','Chém một vệt kiếm mảnh theo hướng đã nhắm.'],
    ['breeze-three','Liên Hoàn Tam Kiếm','arc','damage',72,40,1.35,'triple','Ba nhịp kiếm có thời điểm trúng riêng.',3,360],
    ['breeze-return','Hồi Phong Kiếm','burst','damage',86,0,1.2,'circle','Quét kiếm phong quanh người.']]],
  ['mountain-fist','Hám Sơn Quyền','earth','Phường Thị Thanh Vân','Thể tu',['earth'],1,[
    ['heavy-fist','Trọng Quyền','line','interrupt',49,17,1.12,'fist','Quyền lực ngắn có thể ngắt chuẩn bị.'],
    ['ground-shock','Chấn Địa','burst','damage',79,0,1.16,'rupture','Chấn động lan theo mặt đất.'],
    ['stone-body','Hộ Thể','self','guard',0,0,.28,'stone','Giảm sát thương trong thời gian ngắn.',1,3800]]],
  ['eight-spear','Bát Hoang Thương Pháp','wind','Hộ vệ Thanh Vân','Thương đạo',['metal','earth'],3,[
    ['spear-thrust','Trường Thương Thức','line','damage',133,10,1.02,'needle','Đâm thẳng tới mục tiêu ở xa hơn kiếm thường.'],
    ['spear-sweep','Hoành Tảo','arc','damage',78,55,1.16,'sweep','Quét ngang bằng cán thương.'],
    ['spear-break','Phá Thế','line','interrupt',113,13,1.34,'break','Phá thế và gián đoạn chiêu đang tụ lực.']]],
  ['qingyun-flight','Thanh Vân Ngự Kiếm Quyết','wind','Tàng Kinh Các','Ngự kiếm',['metal','wood'],7,[
    ['jade-wave','Thanh Vân Kiếm Khí','line','damage',220,17,1.05,'jade','Phóng kiếm khí xanh ngọc xuyên tuyến trống.'],
    ['wind-step','Ngự Phong Bộ','step','dash',104,0,0,'leaves','Lướt một quãng ngắn dọc địa hình hợp lệ.'],
    ['three-jade','Tam Kiếm Quy Nhất','line','damage',174,29,1.52,'converge','Ba kiếm ảnh hội tụ trước khi phát kiếm.']]],
  ['scarlet-palm','Xích Viêm Chưởng','fire','Phường Thị Thanh Vân','Chưởng pháp',['fire'],6,[
    ['fire-palm','Xích Hỏa Chưởng','line','burn',142,31,1.05,'palm','Hỏa chưởng đốt mục tiêu trong tầm.'],
    ['flame-burst','Viêm Bạo','field','burn',169,52,1.38,'ember','Hỏa cầu nổ ở vị trí mục tiêu.',2,750],
    ['fire-ward','Hỏa Linh Hộ Thể','self','guard',0,0,.35,'fire-ring','Hỏa linh lực giảm sát thương.',1,4900]]],
  ['green-life','Thanh Mộc Dưỡng Linh Kinh','wood','Tàng Kinh Các','Hồi phục',['wood','water'],9,[
    ['spring','Thanh Mộc Hồi Xuân','ally','heal',115,0,.22,'spring','Hồi sinh lực cho bản thân hoặc đồng đội.'],
    ['vine-bind','Linh Đằng Triền Phược','field','root',158,43,.66,'vine','Dây leo mọc tại điểm chỉ định, giữ chân ngắn.',1,1700],
    ['wood-ward','Mộc Linh Hộ Thuẫn','ally','guard',110,0,.34,'wood-ward','Lá linh mộc che chở đồng đội.',1,4800]]],
  ['purple-sword','Tử Tiêu Lôi Kiếm Quyết','thunder','Nội môn Thanh Vân','Lôi kiếm',['metal','fire'],31,[
    ['purple-slash','Tử Lôi Kiếm Trảm','line','interrupt',220,20,1.14,'electric-blade','Kiếm khí quấn điện, có thể ngắt chiêu.'],
    ['thunder-step','Lôi Ảnh Bộ','step','dash',144,0,0,'electric-step','Bộ pháp để lại đoạn điện quang.'],
    ['five-thunders','Ngũ Lôi Oanh Đỉnh','field','damage',212,65,1.58,'five-bolts','Năm luồng lôi đánh vào vùng nhỏ.',3,900]]],
  ['ice-heart','Huyền Băng Ngọc Tâm Kinh','ice','Di tích hàn mạch','Phong ấn',['water'],36,[
    ['ice-finger','Hàn Băng Chỉ','line','root',196,9,.94,'ice-point','Một mũi băng hẹp làm chậm nhịp tiến công.',1,1200],
    ['ice-lotus','Băng Liên Phong Ấn','field','root',188,58,1.32,'lotus','Băng liên nở và giữ chân mục tiêu trong vùng.',1,2300],
    ['ice-ward','Huyền Băng Hộ Thể','self','guard',0,0,.45,'ice-ward','Băng giáp giảm sát thương trong vài giây.',1,5600]]],
  ['soul-eater','U Minh Phệ Hồn Quyết','shadow','Di tích U Minh','Thần hồn',['water','earth'],43,[
    ['ghost-claw','U Minh Trảo','arc','damage',127,45,1.15,'claw','Ba vệt quỷ trảo xé một góc rộng.'],
    ['soul-shock','Âm Hồn Chấn','burst','weaken',121,0,.95,'echo','Sóng âm khí làm suy yếu đòn phản kích.',1,4600],
    ['ghost-body','Quỷ Ảnh Huyễn Thân','step','dash',135,0,0,'phantom','Lướt qua tuyến đã kiểm tra, để lại huyễn ảnh.']]],
  ['myriad-sword','Vạn Kiếm Quy Tông','sword','Truyền thừa Vạn Kiếm','Kiếm trận',['metal'],154,[
    ['hundred-swords','Bách Kiếm Tề Xuất','line','damage',278,38,1.40,'sword-rain','Kiếm ảnh vào hàng rồi lao theo tuyến.',3,1200],
    ['sword-domain-earth','Thiên Kiếm Trấn Vực','field','root',230,104,1.55,'sword-array','Kiếm trận tồn tại qua nhiều nhịp.',3,2500],
    ['myriad-unite','Vạn Kiếm Quy Nhất','line','damage',330,33,1.85,'great-sword','Kiếm ảnh hội tụ thành cự kiếm.']]],
  ['nine-skies','Cửu Tiêu Thiên Lôi Kinh','thunder','Bí cảnh lôi mạch','Lôi pháp',['metal','fire'],212,[
    ['sky-seal','Cửu Tiêu Lôi Ấn','field','interrupt',226,70,1.32,'thunder-seal','Pháp ấn lôi giáng xuống vị trí đã đánh dấu.'],
    ['thunder-host','Lôi Đình Vạn Quân','field','damage',247,91,1.65,'thunder-host','Nhiều đợt lôi liên tiếp trong lôi trận.',3,1550],
    ['thunder-earth','Thiên Lôi Trấn Thế','field','interrupt',260,105,1.95,'storm-earth','Mây đen hội tụ và giáng một cột lôi lớn.']]],
  ['burning-dragon','Phần Thiên Long Viêm Quyết','fire','Di tích long viêm','Long hỏa',['fire'],255,[
    ['dragon-breath','Long Viêm Thổ Tức','line','burn',242,45,1.42,'dragon-breath','Hỏa long phả lửa theo hướng thi triển.'],
    ['scarlet-dragon','Xích Long Phần Địa','field','burn',220,92,1.55,'dragon-descent','Hỏa long giáng xuống rồi để lại vòng tro.',3,1750],
    ['burning-field','Phần Thiên Hỏa Vực','field','burn',203,115,1.82,'fire-field','Hỏa vực ngắn hạn áp sát theo chu kỳ.',4,2600]]],
  ['void-sword','Thái Hư Tru Tiên Kiếm Kinh','sword','Truyền thừa Thái Hư','Kiếm vực',['metal'],820,[
    ['void-field','Thái Hư Kiếm Vực','field','weaken',290,126,1.50,'void-field','Kiếm vực nhiều lớp làm suy yếu đối thủ.',3,2700],
    ['four-swords','Tru Tiên Tứ Kiếm','field','root',290,138,1.75,'four-swords','Bốn cự kiếm trấn bốn phương.',4,3300],
    ['sky-split','Nhất Kiếm Khai Thiên','line','damage',393,47,2.10,'sky-split','Kiếm ý hư không nứt mở dọc theo cự kiếm.']]],
  ['chaos-thunder','Hỗn Độn Cửu Kiếp Lôi Pháp','thunder','Truyền thừa Cửu Kiếp','Thiên lôi',['metal','fire'],1160,[
    ['chaos-body','Hỗn Độn Lôi Thể','self','guard',0,0,.53,'chaos-body','Lôi giáp hộ thể, có giới hạn hấp thu.',1,6500],
    ['nine-dragons','Cửu Long Lôi Kiếp','field','interrupt',310,124,1.86,'lightning-dragons','Lôi long thay nhau giáng xuống lôi trận.',4,2700],
    ['heaven-wrath','Thiên Phạt Diệt Thế','field','interrupt',330,146,2.10,'chaos-storm','Mây xoáy cục bộ và thiên lôi nhiều nhánh.',3,2000]]],
  ['golden-crow','Đại Nhật Kim Ô Phần Thiên Kinh','sun','Truyền thừa Kim Ô','Thái Dương',['fire'],1400,[
    ['sun-body','Đại Nhật Kim Thân','self','guard',0,0,.52,'sun-body','Pháp tướng mặt trời bao phủ thân thể.',1,6600],
    ['crow-descent','Kim Ô Giáng Thế','field','burn',288,130,1.82,'crow','Kim Ô giáng thế và vỗ cánh hỏa quang.',3,2150],
    ['nine-suns','Cửu Dương Phần Thiên','field','burn',310,150,2.16,'nine-suns','Cửu nhật và mưa lửa bồi kích hỏa vực.',4,2850]]],
];

export const MARTIAL_TECHNIQUES = Object.fromEntries(courses.map(([id,name,element,source,category,roots,price,rows],i)=>{
  const grade=id==='myriad-sword'?4:id==='void-sword'?3:Math.floor(i/3), minimum=GRADES[grade].realm;
  const valuation=id==='myriad-sword'?950:id==='void-sword'?265:price;
  const skills=rows.map(([id,name,form,effect,range,width,force,vfx,description,hits=1,duration=0],stage)=>({
    id,name,form,effect,range,width,force,vfx,description,hits,duration,stage,course:courses[i][0],element,grade,
    delivery:delivery(id,form,hits), siege:grade>=3&&stage===2&&['field','line','burst'].includes(form),
    mp:[4,7,13,23,36][grade]+stage*[2,3,4,6,8][grade],
    windup:[150,220,300,560,840][grade]+stage*72,
    cooldown:id==='myriad-unite'?28000:[1100,2100,3900,7300,13000][grade]+stage*[380,650,1050,2200,4100][grade],
  }));
  return [id,{id,name,grade,element,source,category,roots,price:valuation,minimum,recommended:Math.min(4,minimum+(grade>1?1:0)),
    rate:1.03+grade*.075,study:GRADES[grade].study,rarity:GRADES[grade].rarity,icon:i,book:'manual_'+id,skills}];
}));
export const MARTIAL_SKILLS = Object.fromEntries(Object.values(MARTIAL_TECHNIQUES).flatMap(c=>c.skills.map(s=>[s.id,s])));

const arms: [string,string,string,Element,string,number,string[]][] = [
  ['steel_jian','Thanh Cương Kiếm','jian','wind','breeze',3,['iron_ore','wood']],
  ['heavy_dao','Huyền Thiết Đao','dao','earth','mountain-fist',4,['iron_ore','wolf_pelt']],
  ['iron_spear','Thiết Phong Thương','spear','wind','eight-spear',4,['iron_ore','wood']],
  ['jade_jian','Thanh Ngọc Linh Kiếm','jian','wind','qingyun-flight',11,['spirit_stone_low','iron_ore','stag_antler']],
  ['scarlet_dao','Xích Hỏa Đao','dao','fire','scarlet-palm',15,['spirit_stone_low','boar_tusk','fire_spirit_fruit']],
  ['earth_spear','Hậu Thổ Linh Thương','spear','earth','mountain-fist',16,['spirit_stone_low','iron_ore','huyen_tinh_thach']],
  ['purple_jian','Tử Điện Linh Kiếm','jian','thunder','purple-sword',40,['spirit_stone_middle','beast_core_foundation','thunder_fruit']],
  ['ice_spear','Huyền Băng Long Thương','spear','ice','ice-heart',57,['spirit_stone_middle','beast_core_foundation','frost_snow_lotus']],
  ['soul_scythe','U Minh Phệ Hồn Liêm','scythe','shadow','soul-eater',69,['spirit_stone_middle','beast_core_foundation','yin_soul_herb']],
  ['heaven_thunder_jian','Cửu Tiêu Lôi Đình Kiếm','jian','thunder','nine-skies',216,['beast_core_gold','thunder_fruit','red_fire_crystal']],
  ['dragon_dao','Phần Thiên Long Nha Đao','dao','fire','burning-dragon',287,['beast_core_gold','dragon_blood_fruit','fire_spirit_fruit']],
  ['earth_hammer','Hám Thiên Huyền Hoàng Chùy','hammer','earth','myriad-sword',340,['beast_core_gold','ancient_wood_marrow','di_tam_linh_nhu']],
  ['void_jian','Thái Hư Tru Tiên Kiếm','jian','sword','void-sword',1460,['beast_core_nascent','myriad_spirit_reishi','phantom_sand_crystal']],
  ['chaos_spear','Hỗn Độn Thiên Kiếp Thương','spear','thunder','chaos-thunder',2200,['beast_core_nascent','linh_mach_chi_tam','thunder_fruit']],
  ['crow_dao','Đại Nhật Kim Ô Thần Đao','dao','sun','golden-crow',2850,['beast_core_nascent','eagle_fire_core','solar_fruit']],
];
export const MARTIAL_WEAPONS = Object.fromEntries(arms.map(([id,name,kind,element,course,price,inputs],icon)=>{
  const grade=Math.floor(icon/3), minRealm=GRADES[grade].realm;
  const range=kind==='spear'?96:kind==='jian'?70:65, width=kind==='spear'?12:kind==='jian'?16:37;
  return [id,{id,name,kind,element,course,price,grade,icon,minRealm,recommended:Math.min(4,minRealm+1),range,width,
    skillRange:range+16,skillWidth:width+5,attack:0,bonus:GRADES[grade].weapon,durability:100+grade*40,
    crafting:grade<=2?inputs.map(item=>({item,count:1})):null,materials:inputs,source:MARTIAL_TECHNIQUES[course].source,
    sprite:'martial-arms',grip:[12,24] as const,vfx:element}];
}));
export const LEGACY_GRADES:Record<string,number>={mortal:0,artifact:1,spirit:2,treasure:3,'spiritual-treasure':3,immortal:4,divine:4};
// The overall working cultivator median was zero in the two-day browser sample.
// Use the median of positive cultivator-days while the money economy matures.
export const MARTIAL_B = 3;

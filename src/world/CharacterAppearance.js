export const DIRECTIONS = ['down', 'up', 'left', 'right'];
export const BODY_PROFILES = {
  male_slim: { outfits: ['taoist', 'swordsman', 'civilian', 'workwear'], faces: ['thanh_y', 'middle'] },
  male_strong: { outfits: ['demon', 'monk'], faces: ['middle', 'thanh_y'] },
  female_slender: { outfits: ['fairy', 'civilian', 'workwear'], faces: ['fair', 'cold'] },
  male_elder: { outfits: ['taoist'], faces: ['elder', 'middle'] },
};
export const OPTIONS = {
  bodyType: {male_slim:'Nam thanh niên',male_strong:'Nam lực lưỡng',female_slender:'Nữ tiên tử',male_elder:'Nam trưởng lão'},
  face: {thanh_y:'Nam trẻ',middle:'Nam trung niên',elder:'Nam trưởng lão',fair:'Nữ thanh tú',cold:'Nữ lạnh lùng'},
  hair: {bun:'Búi cao',short:'Tóc ngắn',loose:'Tóc xõa'},
  hairColor: {ink:'Đen mực',silver:'Bạc',red:'Đỏ sẫm',chestnut:'Nâu hạt dẻ'},
  eyes: {matching:'Theo khuôn mặt',jade:'Ngọc lục',amber:'Hổ phách'},
  eyebrows: {matching:'Theo khuôn mặt',soft:'Thanh',stern:'Sắc nét'},
  beard: {matching:'Theo khuôn mặt',none:'Không râu',silver:'Râu bạc'},
  expression: {neutral:'Điềm tĩnh',warm:'Hiền từ',cold:'Lạnh lùng'},
  outfit: {taoist:'Đạo bào tiên hiệp',swordsman:'Kiếm khách',demon:'Ma tu giáp vai',fairy:'Váy tiên nữ',monk:'Tăng bào võ tăng',civilian:'Thường phục',workwear:'Áo lao động và tạp dề'},
  outfitColor: {jade:'Màu nguyên bản',moon:'Lam nguyệt',ember:'Hồng viêm',earth:'Nâu đất'},
  pants: {matching:'Theo bộ',charcoal:'Xám than'},
  shoes: {matching:'Theo bộ',charcoal:'Ủng sẫm'},
  weapon: {none:'Tay không',sword:'Kiếm',saber:'Đao',crossbow:'Nỏ'},
  headwear: {matching:'Mão ngọc',none:'Không mão'},
  accessory: {matching:'Theo bộ',none:'Ẩn phụ kiện rời'},
};
export const DEFAULT_APPEARANCE = Object.freeze({
  id:'npc_01',bodyType:'male_slim',face:'thanh_y',hair:'bun',hairColor:'ink',eyes:'matching',eyebrows:'matching',
  beard:'matching',expression:'neutral',outfit:'taoist',outfitColor:'jade',pants:'matching',shoes:'matching',weapon:'none',headwear:'matching',accessory:'matching',
});
export function supportsPart(appearance, field, value) {
  const body = BODY_PROFILES[appearance.bodyType];
  if (field==='outfit') return body.outfits.includes(value);
  if (field==='face') return body.faces.includes(value);
  if (field==='beard' && value==='silver') return appearance.bodyType!=='female_slender';
  if ((field==='hair' || field==='hairColor') && appearance.outfit==='monk') return field==='hair'?value==='short':value==='ink';
  return true;
}
export function changeAppearance(appearance, field, value) {
  const next={...appearance,[field]:value};
  for (const key of ['outfit','face','hair','hairColor','beard']) {
    if (!supportsPart(next,key,next[key])) {
      const body=BODY_PROFILES[next.bodyType];
      const compatible=key==='face'?body.faces:key==='outfit'?body.outfits:Object.keys(OPTIONS[key]);
      next[key]=compatible.find(option=>supportsPart(next,key,option));
    }
  }
  return validateAppearance(next);
}
export function validateAppearance(value) {
  if (!value||typeof value.id!=='string'||!value.id.trim()||value.id.length>180) throw new Error('ID ngoại hình không hợp lệ.');
  const oldColor=Object.hasOwn(OPTIONS.outfitColor,value.outfit);
  const input={...DEFAULT_APPEARANCE,...value};
  if(oldColor){input.outfit='taoist';input.outfitColor=value.outfit;}
  const result={id:value.id};
  for(const [part,choices] of Object.entries(OPTIONS)) {
    if (typeof input[part]!=='string'||!Object.hasOwn(choices,input[part])) throw new Error(`Giá trị không hợp lệ: ${part}`);
    if (!supportsPart(input,part,input[part])) throw new Error(`${choices[input[part]]} không tương thích với hình thể hoặc trang phục đã chọn.`);
    result[part]=input[part];
  }
  return result;
}

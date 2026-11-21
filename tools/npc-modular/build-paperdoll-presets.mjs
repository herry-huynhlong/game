import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const assets=path.join(root,'public/assets/npc-paperdoll-lab');
const source=path.join(root,'art/source/npc-modular');
const ids=['C01','C02','C03'];
const roles=[
  ['P01','Dân thường nam trẻ','commoner'],['P02','Dân thường nữ','commoner'],['P03','Dân thường lớn tuổi','commoner'],['P04','Nông dân','commoner'],
  ['P05','Đệ tử nam','low_disciple'],['P06','Đệ tử nữ','low_disciple'],['P07','Đệ tử tóc búi','low_disciple'],['P08','Trưởng lão','elder'],['P09','Tông chủ','sect_leader'],
  ['P10','Thương nhân giàu','merchant'],['P11','Thương nhân bình dân','merchant'],['P12','Nhân viên tửu quán','tavern_staff'],
  ['P13','Vệ binh trẻ','city_guard'],['P14','Vệ binh kỳ cựu','city_guard'],['P15','Thợ sửa','repair_worker'],['P16','Thợ săn','hunter'],['P17','Người hái dược','herb_gatherer'],['P18','Thư lại nhiệm vụ','quest_clerk'],
  ['P19','Tán tu kiếm khách','independent_cultivator'],['P20','Tán tu đao khách','independent_cultivator'],['P21','Nữ tán tu','independent_cultivator'],['P22','Tán tu nghèo','independent_cultivator'],['P23','Tán tu cao tuổi','independent_cultivator'],['P24','Thành chủ','city_master'],
];
const base9=[];for(const outfit of ids)for(const hair of ids)base9.push({outfit,head:hair,hair});
const chosen=roles.map((_,i)=>base9[i%base9.length]);
const paletteList=[
  ['P10','wine-gold',[151,66,57],[106,44,43],[218,158,89],[60,40,39],[35,36,32],[21,32,30],[239,215,170]],
  ['P11','jade-brown',[81,124,91],[52,83,63],[174,171,117],[59,51,39],[34,40,34],[21,32,28],[229,212,166]],
  ['P12','tavern-rust',[164,83,49],[113,52,35],[218,156,91],[72,43,35],[40,36,31],[24,31,27],[236,207,157]],
  ['P13','guard-navy',[49,91,119],[32,59,83],[153,166,161],[38,47,55],[31,36,37],[18,31,34],[222,217,196]],
  ['P14','guard-steel',[81,91,100],[51,59,69],[166,158,134],[43,43,43],[34,36,37],[20,30,32],[225,215,191]],
  ['P15','worker-leather',[131,77,47],[89,51,36],[188,137,75],[57,40,34],[35,38,34],[22,32,29],[224,203,166]],
  ['P16','hunter-forest',[70,113,74],[45,77,54],[154,159,93],[49,49,38],[34,39,33],[21,32,28],[225,211,163]],
  ['P17','herb-sage',[96,137,106],[63,97,76],[187,184,126],[57,60,45],[33,40,34],[20,33,29],[232,218,177]],
  ['P18','clerk-indigo',[76,85,137],[51,56,98],[186,169,126],[43,45,62],[34,37,37],[21,31,34],[232,218,183]],
  ['P19','swordsman-ivory',[105,147,167],[73,103,127],[221,214,173],[49,60,64],[33,39,37],[20,31,33],[241,230,200]],
  ['P20','dao-charcoal',[62,69,78],[42,46,56],[173,136,88],[34,35,39],[31,35,36],[19,29,32],[219,206,176]],
  ['P21','rogue-crimson',[145,65,76],[101,42,54],[212,148,123],[54,39,46],[35,36,36],[21,30,32],[237,213,191]],
  ['P22','rogue-dust',[111,91,66],[74,62,48],[177,145,99],[48,43,37],[34,38,34],[21,31,29],[219,196,159]],
  ['P23','rogue-slate',[83,111,119],[55,75,84],[176,187,169],[46,53,59],[33,38,37],[20,31,33],[228,220,197]],
  ['P24','lord-purple',[109,75,132],[72,49,97],[222,187,103],[48,41,62],[34,37,38],[20,30,34],[242,221,171]],
];
const paletteById=Object.fromEntries(paletteList.map(([id,name,main,shade,highlight,deep,shadow,shadow2,ivory])=>[id,{name,main,shade,highlight,deep,shadow,shadow2,ivory}]));
function read(file){return PNG.sync.read(fs.readFileSync(path.join(assets,file)))}
function sourcePaletteMap(source,p){if(source==='C01')return{'132,96,64':p.main,'88,65,52':p.shade,'180,143,94':p.highlight,'65,51,41':p.deep,'35,39,35':p.shadow,'22,40,32':p.shadow2};if(source==='C02')return{'119,133,105':p.main,'72,91,76':p.shade,'173,174,129':p.highlight,'68,56,45':p.deep,'35,39,35':p.shadow,'22,40,32':p.shadow2};return{'75,124,126':p.main,'141,185,175':p.highlight,'218,232,209':p.ivory,'62,65,60':p.deep,'35,39,35':p.shadow,'22,40,32':p.shadow2}}
const cache=new Map();
for(const id of ids)for(const part of ['outfit-base','head-base','hair-back','hair-front','details'])cache.set(`${id}-${part}`,read(`${id.toLowerCase()}-${part}.png`));
function composite(c,palette){
  const out=new PNG({width:128,height:320});
  const parts=[cache.get(`${c.hair}-hair-back`),cache.get(`${c.outfit}-outfit-base`),cache.get(`${c.head}-head-base`),cache.get(`${c.hair}-hair-front`),cache.get(`${c.outfit}-details`)];
  for(let partIndex=0;partIndex<parts.length;partIndex++){const p=parts[partIndex];if(p.width!==128||p.height!==320)throw new Error(`Unexpected part size ${p.width}x${p.height}`);const colorMap=palette&&[1,4].includes(partIndex)?new Map(Object.entries(sourcePaletteMap(c.outfit,palette))):null;for(let i=0;i<p.data.length;i+=4){const sa=p.data[i+3];if(!sa)continue;let r=p.data[i],g=p.data[i+1],b=p.data[i+2];if(colorMap){const mapped=colorMap.get(`${r},${g},${b}`);if(mapped){[r,g,b]=mapped}}const da=out.data[i+3],oa=sa+da*(255-sa)/255;if(oa===0)continue;for(let ch=0;ch<3;ch++)out.data[i+ch]=Math.round(([r,g,b][ch]*sa+out.data[i+ch]*da*(255-sa)/255)/oa);out.data[i+3]=Math.round(oa)}}
  return out;
}
const idsOut=[];
const outDir=path.join(assets,'presets');fs.mkdirSync(outDir,{recursive:true});
for(let i=0;i<roles.length;i++){
  const [id,name,role]=roles[i],c=chosen[i];
  const paletteId=i<9?null:id,palette=paletteId?paletteById[paletteId]:null,file=`${id.toLowerCase()}.png`;fs.writeFileSync(path.join(outDir,file),PNG.sync.write(composite(c,palette)));
  const sourceColors={
    C01:{'132,96,64':palette?.main,'88,65,52':palette?.shade,'180,143,94':palette?.highlight,'65,51,41':palette?.deep,'35,39,35':palette?.shadow,'22,40,32':palette?.shadow2,'219,174,137':null},
    C02:{'119,133,105':palette?.main,'72,91,76':palette?.shade,'173,174,129':palette?.highlight,'68,56,45':palette?.deep,'35,39,35':palette?.shadow,'22,40,32':palette?.shadow2,'219,174,137':null},
    C03:{'75,124,126':palette?.main,'141,185,175':palette?.highlight,'218,232,209':palette?.ivory,'62,65,60':palette?.deep,'35,39,35':palette?.shadow,'22,40,32':palette?.shadow2,'219,174,137':null},
  };
  const preset={id,name,role,components:{outfitBase:`${c.outfit}-outfit-base`,headBase:`${c.head}-head-base`,hairBack:`${c.hair}-hair-back`,hairFront:`${c.hair}-hair-front`,details:`${c.outfit}-details`},image:`/assets/npc-paperdoll-lab/presets/${file}`,frame:{width:32,height:40,columns:4,rows:8,count:32},paletteId,status:'draft-source-combination',visualFit:'unreviewed',notes:['Ghép từ layer Aseprite C01-C03. Palette là biến thể màu có kiểm soát, không thay đổi pixel hình thể.','Đặc điểm nghề (giáp, nón, tạp dề, túi, tóc bạc, giới tính) chưa được vẽ riêng; tên là mục tiêu vai trò, không phải xác nhận hiển thị.','Chi tiết layer giữ nguyên cùng Outfit Base; vũ khí/equipment tiếp tục renderer riêng theo quyền sở hữu.']};
  idsOut.push(preset);
  if(paletteId)preset.sourcePaletteRemap=Object.fromEntries(Object.entries(sourceColors).map(([src,map])=>[src,Object.fromEntries(Object.entries(map).filter(([,to])=>to).map(([from,to])=>[from,to]))]));
}
const registry={version:1,status:'technical-draft-unreviewed',source:'C01-C03 Aseprite layer exports; exact component composition with controlled outfit palette variants',frame:{width:32,height:40,columns:4,rows:8,count:32,directions:['down','up','left','right'],idleFramesPerDirection:4,walkFramesPerDirection:4,idleMs:240,walkMs:140},compositionOrder:['hairBack','outfitBase','headBase','hairFront','details'],palettes:paletteById,presets:idsOut,limitations:['The three source assets are art prototypes, not user-approved final art. First nine presets use source palettes; later presets add controlled clothing recolors over the same layer components.','P02/P06/P21 do not yet have a distinct female base; P03/P08/P23 do not have silver hair; role-specific hats, armor and tools are absent.','Palette does not create role-specific silhouette. Review the Phaser contact sheet before calling all 24 visually distinct or art-approved.']};
fs.writeFileSync(path.join(source,'paperdoll-presets-v1.json'),JSON.stringify(registry,null,2)+'\n');
fs.writeFileSync(path.join(assets,'presets','registry.json'),JSON.stringify(registry,null,2)+'\n');
console.log(`Built ${idsOut.length} unique composite sheets from 3 source outfits, 3 heads, and 3 hair sets.`);

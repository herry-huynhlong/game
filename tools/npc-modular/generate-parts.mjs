#!/usr/bin/env node
// Authored Aseprite component generator for the 32x40 WORLD.REBUILD NPC rig.
// Pixel operations are source data; bridge.mjs writes editable .aseprite projects.
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile, copyFile, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const aseprite=process.env.ASEPRITE_EXE||'D:/anh/tools/aseprite/build2/bin/aseprite.exe';
const bridge=path.join(root,'tools/codex-pixel-bridge/bridge.mjs');
const specDir=path.join(root,'art/source/npc-modular/specs');
const sourceDir=path.join(root,'art/source/npc-modular/source');
const runtimeDir=path.join(root,'public/assets/npc-modular');
const temp=await mkdtemp(path.join(os.tmpdir(),'qingyun-npc-parts-'));
await Promise.all([mkdir(specDir,{recursive:true}),mkdir(sourceDir,{recursive:true}),mkdir(runtimeDir,{recursive:true})]);
const pal={ink:'#252c2d',inkSoft:'#394446',hair:'#242526',hairLit:'#504238',brown:'#49332b',brownLit:'#76533c',silver:'#9ba3a0',silverLit:'#e0d8ba',skin:'#dbad82',skinLight:'#f0c69a',skinShade:'#aa735b',eye:'#2a292a',white:'#efe9d6',jade:'#4c8d7c',jadeDark:'#315b53',jadeLight:'#8bb9a0',blue:'#426884',blueDark:'#2b4359',blueLight:'#83a6b4',red:'#8e4741',redDark:'#573535',gold:'#c7a15c',goldLight:'#e5c77f',cloth:'#7c6046',clothLight:'#b08a5d',grey:'#6b7371',greyLight:'#a2aaa0',purple:'#685273',purpleLight:'#a08aae',green:'#59704d',greenLight:'#9aac6b',rust:'#a35c3d',rustLight:'#d08a58'};
const p=(x,y,color)=>({type:'pixel',x,y,color});
const pixels=(points,color)=>points.length?({type:'pixels',points,color}):null;
const line=(x1,y1,x2,y2,color)=>({type:'line',x1,y1,x2,y2,color});
const rect=(x,y,w,h,color)=>({type:'rect',x,y,w,h,color});
const clean=a=>a.filter(Boolean);
const lay=(name,ops)=>({name,ops:clean(ops)});
const rows=(x,y,strings,colorMap)=>{const out=[];for(let j=0;j<strings.length;j++)for(let i=0;i<strings[j].length;i++){const c=strings[j][i];if(c!=='.')out.push(p(x+i,y+j,colorMap[c]??c))}return out};

const hairs=[
 {name:'short-cut',color:'hair',form:'short'}, {name:'high-knot',color:'hair',form:'knot'},
 {name:'tied-long',color:'brown',form:'tail'}, {name:'loose-long',color:'hair',form:'loose'},
 {name:'double-bun',color:'hair',form:'double'}, {name:'braided',color:'brown',form:'braid'},
 {name:'side-fringe',color:'hair',form:'fringe'}, {name:'silver-long',color:'silver',form:'loose'},
 {name:'silver-bun',color:'silver',form:'knot'}, {name:'soft-curls',color:'brown',form:'curl'},
 {name:'close-cropped',color:'hair',form:'shave'}, {name:'daoist-tie',color:'hair',form:'daoist'},
];
const faces=[
 {name:'young-man',skin:'skin',eyes:'eye',detail:'none'}, {name:'young-woman',skin:'skinLight',eyes:'brown',detail:'soft'},
 {name:'middle-man',skin:'skinShade',eyes:'eye',detail:'brow'}, {name:'middle-woman',skin:'skin',eyes:'brown',detail:'soft'},
 {name:'elder-bearded',skin:'skinShade',eyes:'eye',detail:'white-beard'}, {name:'elder-woman',skin:'skinLight',eyes:'brown',detail:'wrinkle'},
 {name:'moustache',skin:'skin',eyes:'eye',detail:'mustache'}, {name:'stern',skin:'skinShade',eyes:'ink',detail:'scar'},
 {name:'kind',skin:'skinLight',eyes:'brown',detail:'cheek'}, {name:'scarred',skin:'skin',eyes:'eye',detail:'scar'},
];
const outfits=[
 {name:'work-indigo',base:'blue',accent:'cloth',cut:'short'}, {name:'field-olive',base:'green',accent:'clothLight',cut:'vest'}, {name:'village-rust',base:'rust',accent:'cloth',cut:'cross'},
 {name:'merchant-teal',base:'jade',accent:'gold',cut:'long'}, {name:'merchant-plum',base:'purple',accent:'goldLight',cut:'long'},
 {name:'tavern-apron',base:'rust',accent:'blueDark',cut:'apron'},
 {name:'guard-lamellar',base:'blueDark',accent:'greyLight',cut:'armor'}, {name:'guard-captain',base:'redDark',accent:'gold',cut:'armor-gold'},
 {name:'disciple-jade',base:'jade',accent:'white',cut:'cross'}, {name:'disciple-sky',base:'blue',accent:'white',cut:'cross'},
 {name:'elder-cloud',base:'white',accent:'gold',cut:'long'}, {name:'scribe-robe',base:'blueDark',accent:'clothLight',cut:'sash'},
 {name:'hunter-travel',base:'green',accent:'rust',cut:'vest'}, {name:'herb-gatherer',base:'jadeDark',accent:'greenLight',cut:'satchel'},
 {name:'rogue-cloak',base:'purple',accent:'red',cut:'cloak'}, {name:'rogue-leather',base:'brown',accent:'gold',cut:'leather'},
 {name:'city-lord-brocade',base:'redDark',accent:'goldLight',cut:'lord'}, {name:'sect-master-raiment',base:'blueDark',accent:'jadeLight',cut:'master'},
];
const accessories=[
 {name:'official-cap',type:'cap',base:'blueDark',accent:'gold'}, {name:'head-scarf',type:'scarf',base:'red',accent:'gold'},
 {name:'field-hat',type:'hat',base:'cloth',accent:'clothLight'}, {name:'medicine-pouch',type:'pouch',base:'green',accent:'gold'},
 {name:'cloth-pack',type:'pack',base:'brown',accent:'clothLight'}, {name:'wide-belt',type:'belt',base:'brown',accent:'gold'},
 {name:'shoulder-guard',type:'shoulder',base:'grey',accent:'gold'}, {name:'wrist-wraps',type:'wrap',base:'white',accent:'blue'},
 {name:'jade-hairpin',type:'pin',base:'gold',accent:'jadeLight'}, {name:'sect-badge',type:'badge',base:'jadeDark',accent:'goldLight'},
];

function hairLayers(d,dir,phase){
 const c=d.color,hi=c==='silver'?'silverLit':c==='brown'?'brownLit':'hairLit',back=[],mass=[],shine=[],tie=[];
 const shift=phase===1?1:phase===2?-1:0;
 if(dir===1){ // back of head
  const shape=d.form==='shave'?['....xxxx....','...xxxxxx...','..xxxxxxxx..','..xxxxxxxx..','...xxxxxx...']:
   d.form==='double'?['..xx....xx..','.xxxx..xxxx.','xxxxxxxxxxxx','xxxxxxxxxxxx','xxxxxxxxxxxx','..xxxxxxxx..']:
   ['....xxxx....','..xxxxxxxx..','.xxxxxxxxxx.','xxxxxxxxxxxx','xxxxxxxxxxxx','xxxxxxxxxxxx'];
  back.push(...rows(10,0,shape,{x:c}));
  if(['tail','braid','loose','curl','daoist'].includes(d.form)){
    const len=d.form==='loose'?7:d.form==='tail'?5:d.form==='braid'?8:6;
    for(let y=5;y<5+len;y++){const wob=(y+phase)%3===0?1:0;back.push(p(12+wob, y, c),p(19-wob,y,c));if(y%2===0)shine.push(p(13+wob,y,hi))}
    if(d.form==='braid')for(let y=7;y<13;y+=2)tie.push(p(19-(y%3===0?1:0),y,'gold'));
  }
 } else {
  const sx=dir===2?1:-1;
  const top= d.form==='shave'?['....xxxx....','...xxxxxx...']:
   d.form==='double'?['...xx..xx...','..xxxxxx....']:
   d.form==='knot'||d.form==='daoist'?['.....xx.....','....xxxx....','...xxxxxx...','...xxxxxx...']:
   ['....xxxx....','...xxxxxx...','..xxxxxxxx..','..xxxxxxxx..'];
  mass.push(...rows(10,0,top,{x:c}));
  if(['knot','daoist'].includes(d.form)){mass.push(...rows(13,0,['.xx.','xxxx','xxxx'],{x:c}));shine.push(p(14,0,hi));tie.push(line(13,3,18,3,'gold'));if(d.form==='daoist')tie.push(line(12,1,19,1,'gold'))}
  if(d.form==='double'){mass.push(...rows(9,1,['xx..','xxx.'],{x:c}),...rows(19,1,['..xx','.xxx'],{x:c}));shine.push(p(10,2,hi),p(20,2,hi))}
  // Side locks and silhouettes vary by style and face direction.
  if(d.form!=='shave'){
    const leftX=dir===2?10:11,rightX=dir===2?20:21;
    if(['loose','tail','braid','curl'].includes(d.form)){
      const len=(d.form==='loose'?8:d.form==='braid'?6:4)+shift;
      for(let y=4;y<4+len;y++){const curve=(y%3===0)?1:0;mass.push(p(dir===2?leftX+curve:rightX-curve,y,c));if(y%3===1)shine.push(p(dir===2?leftX+curve+1:rightX-curve-1,y,hi))}
    } else {mass.push(p(leftX,4,c),p(rightX,4,c),p(leftX,5,c),p(rightX,5,c))}
    if(d.form==='fringe'){mass.push(...rows(dir===2?11:14,2,['xxxx','xxx.','xx..'],{x:c}));shine.push(p(dir===2?12:15,3,hi))}
    if(d.form==='curl'){for(const [x,y] of [[11,4],[10,6],[20,5],[21,7],[12,8]])mass.push(p(x,y,c),p(x,y+1,hi))}
    if(d.form==='braid'){for(let y=6;y<12;y+=2)tie.push(p(dir===2?10:21,y,'gold'));}
  }
  if(d.form==='tail'||d.form==='daoist'){tie.push(p(15,4,'gold'),p(16,4,'gold'))}
 }
 return [lay('hair_back',back),lay('hair_mass',mass),lay('hair_highlights',shine),lay('hair_ties',tie)];
}
function faceLayers(d,dir){
 const shape=[],features=[],marks=[];
 if(dir===0){
  shape.push(...rows(12,3,['.xxxxxx.','xxxxxxxx','xxxxxxxx','.xxxxxx.'],{x:d.skin}));
  features.push(p(14,5,d.eyes),p(18,5,d.eyes),p(14,4,'inkSoft'),p(18,4,'inkSoft'),p(16,6,'skinShade'),p(16,7,'skinLight'));
  if(['middle-man','elder-bearded','moustache'].includes(d.name))features.push(p(13,4,'brown'),p(14,4,'brown'),p(18,4,'brown'),p(19,4,'brown'));
  if(d.detail==='white-beard')marks.push(...rows(13,7,['.xxxx.','xxxxxx','.xxxx.'],{x:'silver',h:'silverLit'}),p(12,6,'silver'));
  if(d.detail==='mustache')marks.push(p(15,6,'brown'),p(16,6,'brown'),p(14,6,'brown'),p(17,6,'brown'));
  if(d.detail==='scar')marks.push(line(18,5,16,7,'rustLight'));
  if(d.detail==='wrinkle'||d.detail==='brow')marks.push(line(13,3,15,3,'skinShade'),line(17,3,19,3,'skinShade'),p(13,6,'skinShade'),p(19,6,'skinShade'));
  if(d.detail==='cheek')marks.push(p(12,6,'rustLight'),p(19,6,'rustLight'));
  if(d.detail==='soft')features.push(p(13,6,'skinLight'),p(19,6,'skinLight'));
 } else if(dir===2||dir===3){
  const x=dir===2?12:15;shape.push(...rows(x,4,['.xxxx.','xxxxxx','xxxxxx','.xxxx.'],{x:d.skin}));features.push(p(dir===2?14:17,5,d.eyes),p(dir===2?15:16,6,'skinShade'));
  if(d.detail==='white-beard')marks.push(line(dir===2?13:16,7,dir===2?16:19,8,'silver'));
  if(d.detail==='mustache')marks.push(p(dir===2?15:16,6,'brown'));
  if(d.detail==='scar')marks.push(line(dir===2?14:17,5,dir===2?16:15,7,'rustLight'));
 } // back-facing head has no face pixels
 return [lay('face_shape',shape),lay('eyes_and_brows',features),lay('age_beard_scars',marks)];
}
function outfitLayers(d,dir,phase){
 const base=[],trim=[],detail=[],hem=[];const shift=phase===1?1:phase===2?-1:0;
 const x=dir===2?13:dir===3?12:11, torsoW=dir===2||dir===3?8:10;
 base.push(...rows(x,11,['.xxxxxxxx.','xxxxxxxxxx','xxxxxxxxxx','xxxxxxxxxx','xxxxxxxxxx','xxxxxxxxxx','xxxxxxxxxx'],{x:d.base}));
 const hi=({jade:'jadeLight',jadeDark:'jadeLight',blue:'blueLight',blueDark:'blueLight',red:'rustLight',redDark:'rustLight',green:'greenLight',purple:'purpleLight',brown:'brownLit',white:'greyLight',rust:'rustLight'})[d.base]||'greyLight';
 const lo=({jade:'jadeDark',blue:'blueDark',blueDark:'inkSoft',red:'redDark',redDark:'ink',green:'jadeDark',purple:'blueDark',brown:'ink',white:'grey',rust:'redDark'})[d.base]||'inkSoft';
 base.push(line(x,12,x+torsoW-1,12,hi),line(x,17,x+torsoW-1,17,lo),line(x,23,x+torsoW-1,23,lo));
 if(['cross','long','lord','master'].includes(d.cut)){
   trim.push(line(13,11,17,16,d.accent),line(18,11,14,16,d.accent),line(14,16,18,22,d.base),p(16,17,d.accent));
 }
 if(d.cut==='armor'||d.cut==='armor-gold'){
   trim.push(...rows(11,11,['xx......xx','xxxxxxxxxx','.xxxxxxxx.'],{x:lo,h:hi,a:d.accent}));
   for(let y=13;y<18;y+=2)detail.push(p(12,y,d.accent),p(20,y,d.accent));
 }
 if(d.cut==='apron'){trim.push(...rows(13,17,['..xxxx..','..xxxx..','..xxxx..','..xxxx..'],{x:d.accent,h:hi}));detail.push(p(15,19,'gold'),p(16,19,'gold'))}
 if(d.cut==='sash'){trim.push(line(13,13,19,21,d.accent),line(12,20,20,20,'gold'));detail.push(p(17,21,'gold'))}
 if(d.cut==='vest'){trim.push(line(12,12,16,17,d.accent),line(19,12,16,17,hi));detail.push(line(14,18,18,18,lo))}
 if(d.cut==='satchel'){trim.push(line(13,12,18,19,d.accent),line(18,19,21,21,lo));detail.push(...rows(18,20,['xxx','xxx'],{x:d.base,h:d.accent}))}
 if(d.cut==='cloak'){base.push(...rows(10,12,['x..........x','xx........xx','.xx......xx.'],{x:d.base}));trim.push(line(12,13,19,18,d.accent),p(16,16,'gold'))}
 if(d.cut==='leather'){trim.push(line(12,13,19,15,d.accent),line(13,18,18,18,'gold'));detail.push(p(14,15,'clothLight'),p(18,20,hi))}
 if(d.cut==='lord'){trim.push(line(12,12,19,12,'goldLight'),line(13,14,18,14,'gold'),line(14,19,18,19,'gold'));detail.push(...rows(15,16,['.xx.','xxxx','.xx.'],{x:'gold',h:'goldLight'}))}
 if(d.cut==='master'){trim.push(line(12,12,19,12,'jadeLight'),line(13,14,18,14,'gold'),line(14,21,18,21,'jadeLight'));detail.push(...rows(15,16,['.xx.','xxxx','.xx.'],{x:'jadeLight',h:'goldLight'}))}
 if(['long','lord','master'].includes(d.cut)){
   hem.push(line(x,24+shift,x+torsoW-1,24+shift,hi),p(x+1,25+shift,lo),p(x+torsoW-2,25+shift,lo));
 } else hem.push(line(x+1,22+shift,x+torsoW-2,22+shift,hi));
 if(dir===1){trim.push(line(13,12,18,12,d.accent),line(16,13,16,23,d.accent));detail.push(p(15,15,hi),p(17,19,lo))}
 if(dir===2||dir===3){trim.push(line(x+1,15,x+torsoW-2,15,d.accent),p(x+2,17,hi))}
 return [lay('robe_outer_shape',base),lay('collar_sash_rank',trim),lay('woven_shadows',detail),lay('hem_motion',hem)];
}
function accessoryLayers(d,dir){
 const head=[],body=[],metal=[];
 if(d.type==='cap'){head.push(...rows(11,0,['..xxxxxx..','.xxxxxxxx.','..xxxxxx..'],{x:d.base,h:d.accent}));metal.push(line(13,2,18,2,d.accent),p(16,0,'goldLight'))}
 if(d.type==='scarf'){head.push(...rows(10,1,['.xxxxxxxxxx.','xxxxxxxxxxxx','.xxxxxxxxxx.'],{x:d.base,h:d.accent}));body.push(p(dir===2?20:12,5,d.base),p(dir===2?20:12,6,d.accent))}
 if(d.type==='hat'){head.push(...rows(8,0,['....xxxx....','..xxxxxxxx..','.xxxxxxxxxx.','xxxxxxxxxxxx'],{x:d.base,h:d.accent}));metal.push(line(9,3,22,3,d.accent))}
 if(d.type==='pouch'){body.push(...rows(dir===2?18:19,20,['xxx','xxx','xxx'],{x:d.base,h:d.accent}));metal.push(p(dir===2?19:20,21,'gold'))}
 if(d.type==='pack'){body.push(...rows(dir===2?19:10,12,['xxxx','xxxx','xxxx','xxx.','xx..'],{x:d.base,h:d.accent}));metal.push(line(dir===2?19:11,12,dir===2?19:12,18,'gold'))}
 if(d.type==='belt'){body.push(line(11,21,20,21,d.base),line(12,22,19,22,d.accent));metal.push(...rows(15,21,['xx','xx'],{x:'gold',h:'goldLight'}))}
 if(d.type==='shoulder'){body.push(...rows(dir===2?18:10,10,['xxxx','xxxxx','..xx.'],{x:d.base,h:d.accent}));metal.push(line(dir===2?18:10,10,dir===2?21:14,11,d.accent))}
 if(d.type==='wrap'){body.push(line(10,18,13,20,d.base),line(19,20,22,18,d.base),p(11,19,d.accent),p(21,19,d.accent))}
 if(d.type==='pin'){head.push(line(11,1,20,0,d.base),p(10,1,'goldLight'),p(21,0,d.accent),p(20,1,d.accent))}
 if(d.type==='badge'){body.push(...rows(18,13,['xxx','xxx','xxx'],{x:d.base,h:d.accent}));metal.push(p(19,14,'goldLight'),p(19,15,'gold'))}
 // Accessories have directional occlusion: satchels/straps switch sides with the view.
 if(dir===1&&['pouch','badge','pin'].includes(d.type)){body.length=0;metal.length=0}
 return [lay('accessory_headwear',head),lay('accessory_work_gear',body),lay('accessory_hardware',metal)];
}

function opsFor(kind,d,dir,phase){if(kind==='hair')return hairLayers(d,dir,phase);if(kind==='face')return faceLayers(d,dir);if(kind==='outfit')return outfitLayers(d,dir,phase);return accessoryLayers(d,dir)}
const groups=[['hair',hairs],['face',faces],['outfit',outfits],['accessory',accessories]];
const dirs=['down','up','left','right'];
try{
 const manifest={version:1,frame:{width:32,height:40,poses:['idle','walk-a','walk-b'],directions:dirs},parts:{}};
 for(const [kind,items] of groups){manifest.parts[kind]=[];for(let offset=0;offset<items.length;offset+=4){const chunk=items.slice(offset,offset+4),first=offset+1,last=offset+chunk.length,group=`${kind}-${String(first).padStart(2,'0')}-${String(last).padStart(2,'0')}`,frames=[];
   for(const d of chunk)for(let di=0;di<dirs.length;di++)for(let phase=0;phase<3;phase++)frames.push({durationMs:phase===0?140:105,layers:opsFor(kind,d,di,phase)});
   const spec={name:`npc-${group}`,width:32,height:40,palette:pal,frames};const specPath=path.join(specDir,`${group}.json`);await writeFile(specPath,JSON.stringify(spec));
   const run=spawnSync(process.execPath,[bridge,specPath,'--aseprite',aseprite,'--out',temp],{cwd:root,encoding:'utf8',timeout:120000,windowsHide:true,maxBuffer:1024*1024*6});if(run.status!==0)throw new Error(`Aseprite bridge failed for ${group}: ${run.stderr||run.stdout||run.error}`);
   const slug=`npc-${group}`;await copyFile(path.join(temp,`${slug}.aseprite`),path.join(sourceDir,`${slug}.aseprite`));await copyFile(path.join(temp,`${slug}.png`),path.join(runtimeDir,`${slug}.png`));await copyFile(path.join(temp,`${slug}.json`),path.join(runtimeDir,`${slug}.json`));
   for(let i=0;i<chunk.length;i++)manifest.parts[kind].push({id:`${kind}-${String(offset+i+1).padStart(2,'0')}`,name:chunk[i].name,sheet:slug,variant:i,frameCount:12,layerNames:[...new Set(frames.flatMap(f=>f.layers.map(l=>l.name)))]});
 }}
 await writeFile(path.join(runtimeDir,'manifest.json'),JSON.stringify(manifest,null,2));
 console.log(`Created editable Aseprite modular parts: ${Object.values(manifest.parts).map(x=>`${x.length} ${x[0]?.id.split('-')[0]}`).join(', ')}.`);
}finally{await rm(temp,{recursive:true,force:true})}

import Phaser from '/node_modules/phaser/dist/phaser.esm.js';
window.addEventListener('error',e=>{status.textContent='JS ERROR: '+e.message+' '+e.error?.stack});window.addEventListener('unhandledrejection',e=>{status.textContent='PROMISE ERROR: '+e.reason});
const ROOT='/tools/npc-art-toolchain-lab/output/';
const defs=[{key:'npc01_qingyun_disciple',role:'low_disciple',label:'Đệ tử Thanh Vân'},{key:'npc02_female_cultivator',role:'low_disciple',label:'Nữ tu sĩ'},{key:'npc03_city_guard',role:'city_guard',label:'Vệ binh thành'}];
const params=new URLSearchParams(location.search);let setting={zoom:Number(params.get('zoom'))||1,direction:params.get('direction')||'s',motion:params.get('motion')||'idle'};for(const [id,key] of [['zoom','zoom'],['direction','direction'],['motion','motion']])if(params.has(key))document.getElementById(id).value=params.get(key);const status=document.querySelector('#status');
class Showcase extends Phaser.Scene{
 constructor(){super('showcase')}
 preload(){this.load.json('manifest','/assets/npc-modular/manifest.json');for(const d of defs)this.load.atlas(`new-${d.key}`,`${ROOT}${d.key}/${d.key}.png`,`${ROOT}${d.key}/${d.key}.json`);for(const id of ['npc-sect_m-01','npc-sect_f-01','npc-guard_m-01'])this.load.spritesheet(`old-${id}`,`/assets/characters/${id}.png`,{frameWidth:32,frameHeight:40})}
 create(){
  status.textContent='Phaser scene ready; reading saved NPCs';
  const saved=JSON.parse(localStorage.getItem('world-rebuild-1c-v1')||'{"npcs":[]}').npcs||[];const find=(role,sex)=>saved.find(n=>n.alive&&n.visualStyleId&&n.populationRole===role&&(!sex||n.visualStyleId.includes(sex)));this.current=[find('low_disciple','_m-'),find('low_disciple','_f-'),find('city_guard','_m-')];const samples=[{visualStyleId:'npc-sect_m-01',name:'Đệ tử hiện tại · mẫu style',visualParts:{outfitId:'outfit-09',faceId:'face-01',hairId:'hair-01',accessoryIds:['accessory-09']}},{visualStyleId:'npc-sect_f-01',name:'Nữ đệ tử hiện tại · mẫu style',visualParts:{outfitId:'outfit-10',faceId:'face-02',hairId:'hair-04',accessoryIds:['accessory-09']}},{visualStyleId:'npc-guard_m-01',name:'Vệ binh hiện tại · mẫu style',visualParts:{outfitId:'outfit-07',faceId:'face-03',hairId:'hair-03',accessoryIds:['accessory-01']}}];this.current=this.current.map((n,i)=>n??samples[i]);this.oldIds=this.current.map((n,i)=>n.visualStyleId||['npc-sect_m-01','npc-sect_f-01','npc-guard_m-01'][i]);
  const manifest=this.cache.json.get('manifest'),keys=new Set();this.manifest=manifest;for(const id of this.oldIds)if(!this.textures.exists("old-"+id))this.load.spritesheet("old-"+id,"/assets/characters/"+id+".png",{frameWidth:32,frameHeight:40});for(const n of this.current)for(const id of [n?.visualParts?.outfitId,n?.visualParts?.faceId,n?.visualParts?.hairId,...(n?.visualParts?.accessoryIds||[])])for(const list of Object.values(manifest.parts)){const p=list.find(x=>x.id===id);if(p)keys.add(p.sheet)}
  for(const key of keys)this.load.spritesheet(`part-${key}`,`/assets/npc-modular/${key}.png`,{frameWidth:32,frameHeight:40});
  this.load.once('complete',()=>this.build());if(keys.size)this.load.start();else this.build();
  for(const id of ['zoom','direction','motion'])document.getElementById(id).addEventListener('change',e=>{setting[id]=id==='zoom'?Number(e.target.value):e.target.value;this.apply()});
 }
 build(){
  status.textContent='Rendering showcase';
  const g=this.add.graphics();g.fillStyle(0x526354).fillRect(0,0,1120,640);g.fillStyle(0x77796d).fillRect(0,105,1120,535);g.lineStyle(1,0x8f9080,.65);for(let x=0;x<1120;x+=32)g.lineBetween(x,105,x,640);for(let y=105;y<640;y+=20){g.lineBetween(0,y,1120,y);for(let x=y%40?16:0;x<1120;x+=32)g.lineBetween(x,y,x,y+20)}g.fillStyle(0x253b33).fillRect(0,0,1120,105);
  this.add.text(18,16,'CÙNG SÂN · CÙNG TỶ LỆ THẾ GIỚI · 4 HƯỚNG / IDLE–WALK',{fontSize:'16px',color:'#f2e4bc'});this.add.text(25,67,'HIỆN TẠI',{fontSize:'13px',color:'#d1c49c'});this.add.text(581,67,'PIPELINE SPRITEKILN',{fontSize:'13px',color:'#d1c49c'});
  for(let i=0;i<defs.length;i++){const d=defs[i],y=190+i*145,n=this.current[i],parts=n?.visualParts;this.add.rectangle(560,y+18,1085,128,0x566252,.34).setStrokeStyle(1,0xadb091,.32);this.add.text(18,y-49,d.label,{fontSize:'14px',color:'#fff0c8'});this.add.text(28,y+47,n?.name||`Mẫu hiện tại ${i+1}`,{fontSize:'11px',color:'#e4d9b7',wordWrap:{width:170}});this.add.text(581,y+47,d.key.replaceAll('_',' '),{fontSize:'11px',color:'#e4d9b7'});
   const c=this.add.container(270,y+14);const body=this.add.sprite(0,0,`old-${this.oldIds[i]}`,0).setOrigin(.5,1);c.add(body);const layers=[];if(parts)for(const [kind,id]of [['outfit',parts.outfitId],['face',parts.faceId],['hair',parts.hairId],['accessory',parts.accessoryIds?.[0]]]){if(!id)continue;const item=this.manifest.parts[kind]?.find(p=>p.id===id);if(!item)continue;const s=this.add.sprite(0,0,`part-${item.sheet}`,item.variant*12).setOrigin(.5,1);s.setData('variant',item.variant);layers.push(s);c.add(s)}c.setData({body,layers,row:i});this.oldContainers??=[];this.oldContainers.push(c);
   const modern=this.add.sprite(835,y+14,`new-${d.key}`,'idle_s_0').setOrigin(.5,1);modern.setData('row',i);this.newSprites??=[];this.newSprites.push(modern);
  }
  this.apply();status.textContent='Đã nạp 3 cặp NPC · dùng cùng sân · preview không sửa save';this.fpsStart=performance.now();this.fpsFrames=0;
 }
 apply(){if(!this.oldContainers)return;const di={s:0,n:1,w:2,e:3}[setting.direction],phase=Math.floor(this.time.now/130);for(const c of this.oldContainers){const body=c.getData('body'),walk=setting.motion==='walk';body.setFrame(walk?32+di*8+(phase%4)*2:di*8);for(const l of c.getData('layers'))l.setFrame(l.getData('variant')*12+di*3+(walk?phase%3:0));c.setScale(setting.zoom)}for(const s of this.newSprites||[]){const walk=setting.motion==='walk',count=walk?8:6;s.setFrame(`${walk?'walk':'idle'}_${setting.direction}_${Math.floor(this.time.now/(walk?105:180))%count}`).setScale(setting.zoom)}}
 update(){this.fpsFrames++;if(setting.motion==='walk')this.apply();const now=performance.now();if(now-this.fpsStart>=5000){status.textContent='Phaser '+Phaser.VERSION+' · FPS '+(this.fpsFrames*1000/(now-this.fpsStart)).toFixed(1)+' · 6 nhân vật · nearest-neighbor';this.fpsStart=now;this.fpsFrames=0}}
}
new Phaser.Game({type:Phaser.CANVAS,parent:'game',width:1120,height:640,pixelArt:true,antialias:false,roundPixels:true,scene:[Showcase],scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH}});










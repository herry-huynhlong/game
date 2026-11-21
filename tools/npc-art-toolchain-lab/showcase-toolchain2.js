import Phaser from '/node_modules/phaser/dist/phaser.esm.js';
const LAB='/tools/npc-art-toolchain-lab/output/';
const specs=[
 {id:'lpc01_disciple_male',kiln:'npc01_qingyun_disciple',style:'npc-sect_m-01',role:'low_disciple',label:'Nam đệ tử'},
 {id:'lpc02_female_cultivator',kiln:'npc02_female_cultivator',style:'npc-sect_f-01',role:'low_disciple',label:'Nữ tu sĩ'},
 {id:'lpc03_city_guard',kiln:'npc03_city_guard',style:'npc-guard_m-01',role:'city_guard',label:'Vệ binh thành'}
];
const params=new URLSearchParams(location.search),opts={zoom:Number(params.get('zoom'))||1,dir:params.get('dir')||'s',motion:params.get('motion')||'idle'};
for(const [id,key] of [['zoom','zoom'],['direction','dir'],['motion','motion']])if(params.has(key))document.getElementById(id).value=params.get(key);
const status=document.querySelector('#status');window.addEventListener('error',e=>status.textContent='Lỗi JS: '+e.message+' @ '+e.filename+':'+e.lineno);

class Compare extends Phaser.Scene{
 constructor(){super('compare')}
 preload(){
  this.load.json('modmanifest','/assets/npc-modular/manifest.json');
  for(const s of specs){
   this.load.spritesheet('current-'+s.style,`/assets/characters/${s.style}.png`,{frameWidth:32,frameHeight:40});
   this.load.atlas('kiln-'+s.id,`${LAB}${s.kiln}/${s.kiln}.png`,`${LAB}${s.kiln}/${s.kiln}.json`);
   this.load.atlas('lpc-'+s.id,`${LAB}lpc/${s.id}/phaser-export/sheet.png`,`${LAB}lpc/${s.id}/phaser-export/sheet.atlas.texturepacker.json`);
  }
 }
 create(){
  const save=JSON.parse(localStorage.getItem('world-rebuild-1c-v1')||'{"npcs":[]}').npcs||[];
  this.npcs=specs.map((s,i)=>save.find(n=>n.alive&&n.visualStyleId&&n.populationRole===s.role&&n.visualStyleId.includes(i===1?'_f-':'_m-'))||({name:`Style hiện tại · ${s.label}`,visualStyleId:s.style,visualParts:[
   {outfitId:'outfit-09',faceId:'face-01',hairId:'hair-01',accessoryIds:['accessory-09']},
   {outfitId:'outfit-10',faceId:'face-02',hairId:'hair-04',accessoryIds:['accessory-09']},
   {outfitId:'outfit-07',faceId:'face-03',hairId:'hair-03',accessoryIds:['accessory-01']}
  ][i]}));
  const manifest=this.cache.json.get('modmanifest');this.manifest=manifest;const sheetNames=new Set();for(const n of this.npcs){const p=n.visualParts;if(!p)continue;for(const id of [p.outfitId,p.faceId,p.hairId,...(p.accessoryIds||[])])for(const list of Object.values(manifest.parts)){const item=list.find(x=>x.id===id);if(item)sheetNames.add(item.sheet)}}
  for(const name of sheetNames)this.load.spritesheet('part-'+name,`/assets/npc-modular/${name}.png`,{frameWidth:32,frameHeight:40});
  this.load.once('complete',()=>this.build());if(sheetNames.size)this.load.start();else this.build();
  for(const id of ['zoom','direction','motion'])document.getElementById(id).addEventListener('change',e=>{opts[id==='zoom'?'zoom':id==='direction'?'dir':'motion']=id==='zoom'?Number(e.target.value):e.target.value;this.build();});
 }
 build(){
  this.children.removeAll(true);this.actors=[];const gap=145*opts.zoom,worldH=150+gap*3;this.scale.resize(1280,worldH+35);const g=this.add.graphics();
  g.fillStyle(0x546254).fillRect(0,0,1280,worldH+35);g.fillStyle(0x77796d).fillRect(0,90,1280,worldH-55);g.lineStyle(1,0x8f9080,.5);for(let x=0;x<1280;x+=32)g.lineBetween(x,90,x,worldH+35);for(let y=90;y<worldH+35;y+=20){g.lineBetween(0,y,1280,y);for(let x=y%40?16:0;x<1280;x+=32)g.lineBetween(x,y,x,y+20)}g.fillStyle(0x253b33).fillRect(0,0,1280,90);
  this.add.text(14,14,'A · NPC HIỆN TẠI',{fontSize:'16px',color:'#f5e7c0'});this.add.text(437,14,'B · SPRITEKILN 0.4.0',{fontSize:'16px',color:'#f5e7c0'});this.add.text(861,14,'C · UNIVERSAL LPC',{fontSize:'16px',color:'#f5e7c0'});
  const x=[215,640,1065],dir={s:0,n:1,w:2,e:3}[opts.dir],walk=opts.motion==='walk';
  for(let i=0;i<specs.length;i++){const s=specs[i],y=125+i*gap,n=this.npcs[i];this.add.rectangle(640,y+gap*.46,1260,gap-12,0x546254,.3).setStrokeStyle(1,0xa7a888,.3);this.add.text(12,y-13,s.label,{fontSize:'14px',color:'#fff0c8'});this.add.text(14,y+gap-34,n.name||s.label,{fontSize:'11px',color:'#e3d8b9',wordWrap:{width:250}});
   const old=this.add.container(x[0],y+62);const body=this.add.sprite(0,0,'current-'+n.visualStyleId,walk?32+dir*8+(Math.floor(this.time.now/130)%4)*2:dir*8).setOrigin(.5,1);old.add(body);const p=n.visualParts;if(p)for(const [kind,id]of [['outfit',p.outfitId],['face',p.faceId],['hair',p.hairId],['accessory',p.accessoryIds?.[0]]]){const item=this.manifest.parts[kind]?.find(v=>v.id===id);if(!item)continue;const frame=item.variant*12+dir*3+(walk?Math.floor(this.time.now/130)%3:0);const layer=this.add.sprite(0,0,'part-'+item.sheet,frame).setOrigin(.5,1);layer.setData('variant',item.variant);old.add(layer)}old.setData('kind','current');old.setData('index',i);old.setScale(opts.zoom);this.actors??=[];this.actors.push(old);
   const kiln=this.add.sprite(x[1],y+62,'kiln-'+s.id,`${walk?'walk':'idle'}_${opts.dir}_${Math.floor(this.time.now/(walk?100:150))%(walk?8:6)}`).setOrigin(.5,1).setScale(opts.zoom);kiln.setData('kind','kiln');kiln.setData('index',i);this.actors.push(kiln);
   const lpcFrames=walk?Array.from({length:8},(_,j)=>`walk_${({n:'up',w:'left',s:'down',e:'right'})[opts.dir]}_${j+2}`):Array.from({length:2},(_,j)=>`idle_${({n:'up',w:'left',s:'down',e:'right'})[opts.dir]}_${j+1}`);
   const lpc=this.add.sprite(x[2],y+62,'lpc-'+s.id,lpcFrames[Math.floor(this.time.now/(walk?100:150))%lpcFrames.length]).setOrigin(.5,1).setScale(opts.zoom);lpc.setData('kind','lpc');lpc.setData('index',i);lpc.setData('frames',lpcFrames);this.actors.push(lpc);
  }
  this.lastFpsTime=performance.now();this.fpsFrames=0;status.textContent=`3 nhân vật · cùng nền · ${opts.zoom}× · ${walk?'đi bộ':'đứng yên'} · ${opts.dir.toUpperCase()} · nearest-neighbor`;
 }
 update(){if(!this.actors)return;const tick=Math.floor(this.time.now/(opts.motion==='walk'?100:150));for(const actor of this.actors){const kind=actor.getData('kind');if(kind==='current'){const dir={s:0,n:1,w:2,e:3}[opts.dir],walk=opts.motion==='walk';actor.list[0].setFrame(walk?32+dir*8+(tick%4)*2:dir*8);for(const layer of actor.list.slice(1))layer.setFrame(layer.getData('variant')*12+dir*3+(walk?tick%3:0))}else if(kind==='kiln'){actor.setFrame(`${opts.motion==='walk'?'walk':'idle'}_${opts.dir}_${tick%(opts.motion==='walk'?8:6)}`)}else{const frames=actor.getData('frames');actor.setFrame(frames[tick%frames.length])}}this.fpsFrames++;const now=performance.now();if(now-this.lastFpsTime>4000){status.textContent+=' · Phaser FPS '+(this.fpsFrames*1000/(now-this.lastFpsTime)).toFixed(0);this.lastFpsTime=now;this.fpsFrames=0}}
}
new Phaser.Game({type:Phaser.CANVAS,parent:'game',width:1280,height:650,pixelArt:true,antialias:false,roundPixels:true,scene:[Compare],scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH}});



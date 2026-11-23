import { mountNpcRoster } from './world/NpcAppearanceEditor.js';
import { CombatArena } from './world/CombatArena.js';
import { loadCombatMountAssets } from './world/CombatMountAssets.js';
import Phaser from 'phaser';
import { DEFAULT_APPEARANCE, DIRECTIONS, OPTIONS, validateAppearance, supportsPart, changeAppearance } from './world/CharacterAppearance.js';
import { CharacterRenderer as ModularCharacter } from './world/CharacterRenderer.js';
import { loadCharacterAssets } from './world/CharacterAssetRegistry.js';
import { CHARACTER_EDITOR_SAVE as saveKey } from './world/WorldCharacterPreview.js';
import './npc-xianxia-editor.css';

const $ = id => document.getElementById(id);
const labels = {bodyType:'Dáng người',face:'Khuôn mặt',hair:'Kiểu tóc',hairColor:'Màu tóc',outfit:'Trang phục',outfitColor:'Màu trang phục',eyes:'Mắt',eyebrows:'Lông mày',beard:'Râu',expression:'Biểu cảm',pants:'Quần',shoes:'Giày',weapon:'Vũ khí',headwear:'Mão',accessory:'Phụ kiện'};
const size = {width:640,height:390};
let appearance = {...DEFAULT_APPEARANCE};
let activeScene;
let roster;
const fields = {};
for (const [part,choices] of Object.entries(OPTIONS)) {
  const field = document.createElement('label');
  field.textContent = labels[part];
  const select = document.createElement('select');
  select.id = part;
  for (const [id,name] of Object.entries(choices)) select.add(new Option(name,id));
  select.value = appearance[part];
  fields[part] = select;
  field.append(select);
  $('appearance-fields').append(field);
  $('compare-field').add(new Option(labels[part],part));
  select.onchange = () => {
    const next=changeAppearance(appearance,part,select.value);
    const adjustments=Object.keys(fields).filter(key=>key!==part&&next[key]!==appearance[key]);
    setAppearance(next);
    $('status').textContent=adjustments.length?'Đã chọn bộ tương thích cho '+adjustments.map(key=>labels[key]).join(', ')+'.':'';
  };
}
function setAppearance(next) {
  appearance = validateAppearance(next);
  for (const [part,select] of Object.entries(fields)) {
    for(const option of select.options) option.disabled=!supportsPart(appearance,part,option.value);
    select.value=appearance[part];
  }
  activeScene?.actor.customize(appearance);
  refreshComparison();
}
function documentState(){return {...appearance,motion:$('motion').value,direction:$('direction').value};}
function loadState(state){
  setAppearance(state);
  if(['idle','walk','run'].includes(state.motion)) $('motion').value=state.motion;
  if(DIRECTIONS.includes(state.direction)) $('direction').value=state.direction;
}
function report(action,message) {
  try {action();$('status').textContent=message;}
  catch(error) {$('status').textContent=error.message;}
}
$('world-preview').onclick=()=>report(()=>{localStorage.setItem(saveKey,JSON.stringify(documentState()));location.href='./?characterRig=1';},'Đã lưu ngoại hình.');
$('save').onclick = () => report(() => roster?.active ? roster.manual(appearance) : localStorage.setItem(saveKey,JSON.stringify(documentState())),roster?.active?'Xem bản nháp trong mục Ngoại hình cư dân.':'Đã lưu ngoại hình.');
$('load').onclick = () => report(() => {
  if(roster?.active){roster.restore();return;}
  const saved = localStorage.getItem(saveKey);
  if (!saved) throw new Error('Chưa có bản lưu trong trình duyệt.');
  loadState(JSON.parse(saved));
},'Đã tải ngoại hình.');
$('export').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(documentState(),null,2)],{type:'application/json'}));
  const link = document.createElement('a');link.href=url;link.download='npc_01.json';link.click();
  setTimeout(() => URL.revokeObjectURL(url),1000);
};
$('import').onclick = () => $('file').click();
$('file').onchange = async () => {
  const file=$('file').files[0];
  if (!file) return;
  try {const value=JSON.parse(await file.text());loadState(roster?.active?{...value,id:roster.active}:value);$('status').textContent='Đã nhập ngoại hình.';}
  catch(error){$('status').textContent=error.message;}
  finally {$('file').value='';}
};

class CharacterEditor extends Phaser.Scene {
  preload() {
    loadCharacterAssets(this);loadCombatMountAssets(this);
    this.load.spritesheet('terrain','/assets/tilesets/gfx5b5_area_terrain.png',{frameWidth:32,frameHeight:32});
    this.load.spritesheet('bamboo','/assets/props/T02-bamboo-v2.png',{frameWidth:96,frameHeight:96});
  }
  create() {
    for (let y=0;y<size.height;y+=32) for(let x=0;x<size.width;x+=32) {
      this.add.image(x,y,'terrain',(x+y)%96===0?1:0).setOrigin(0);
    }
    this.add.rectangle(320,208,470,280,0x47584a,.64).setStrokeStyle(2,0x8c906d);
    for (const x of [18,598]) this.add.image(x,62,'bamboo',0).setOrigin(0,1);
    this.actor=new ModularCharacter(this,320,235,appearance);
    this.actor.root.setScale(2);
    this.arena=new CombatArena(this,this.actor);
    for(const id of ['attack','aim','reload','summon','mount']) $('arena-'+id).onclick=()=>this.arena.command(id);
    $('arena-step').onclick=()=>{$('arena-rate').value='0';this.stepAnimation=true;};
    for(const [key,action] of [['J','attack'],['K','aim'],['R','reload'],['M','mount']]){
      this.input.keyboard.on('keydown-'+key,event=>{if(!event.repeat&&!event.target?.matches('select,input'))this.arena.command(action);});
    }
    this.keys=this.input.keyboard.addKeys('W,A,S,D,UP,LEFT,DOWN,RIGHT,SHIFT');
    this.crowd=[];
    this.foot=this.add.ellipse(320,235,58,10,0x182620,.54).setDepth(0);
    this.actor.root.setDepth(2);
    this.lastControlDirection='down';
    this.wasManual=false;
    activeScene=this;
    setAppearance(appearance);
    $('stress').onchange=()=>this.setCrowd($('stress').checked);
    window.__characterEditor={
      status:()=>({frame:this.actor.frame,elapsed:this.actor.elapsed,direction:this.actor.direction,motion:this.actor.motion,
        x:this.actor.root.x,y:this.actor.root.y,appearance:{...appearance},crowd:this.crowd.length,
        combat:this.arena.state,mount:this.arena.mount.state,event:this.arena.lastEvent,hits:this.arena.hitCount,loaded:this.actor.combat.loaded,saddle:this.arena.mount.saddle,boltCount:this.arena.bolts.length,
        textureFrames:this.textures.get('rig-parts').getFrameNames().length,fps:this.game.loop.actualFps}),
    };
  }
  setCrowd(enabled){
    for(const actor of this.crowd) actor.destroy();
    this.crowd=[];
    if(!enabled) return;
    const looks=roster?.crowdLooks()??[];
    for(let i=0;i<60;i++){
      const look=looks[i]??{...DEFAULT_APPEARANCE,outfitColor:['jade','moon','ember'][i%3]};
      const actor=new ModularCharacter(this,0,0,look);
      actor.root.setScale(.55);
      this.crowd.push(actor);
    }
  }
  update(_time,dt) {
    this.arena.beginFrame();
    const keys=this.keys;
    const acceptsInput=!['SELECT','BUTTON','INPUT'].includes(document.activeElement?.tagName);
    const dx=acceptsInput ? Number(keys.D.isDown||keys.RIGHT.isDown)-Number(keys.A.isDown||keys.LEFT.isDown):0;
    const dy=acceptsInput ? Number(keys.S.isDown||keys.DOWN.isDown)-Number(keys.W.isDown||keys.UP.isDown):0;
    const manual=Boolean(dx||dy);
    const motion=manual?(keys.SHIFT.isDown?'run':'walk'):this.wasManual?'idle':$('motion').value;
    if(manual) this.lastControlDirection=Math.abs(dx)>=Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';
    const direction=manual||this.wasManual?this.lastControlDirection:$('direction').value;
    if (manual) this.wasManual=true;
    else if (this.wasManual){$('direction').value=direction;$('motion').value='idle';this.wasManual=false;}
    const rate=Number($('arena-rate').value);
    const delta=this.stepAnimation?this.arena.stepLength():Math.min(dt,50)*rate;
    this.stepAnimation=false;
    const seconds=delta/1000;
    const speed=this.arena.mount.attached?(motion==='run'?206:125):(motion==='run'?148:76);
    const previousX=this.actor.root.x,previousY=this.actor.root.y;
    if(manual){
      const length=Math.hypot(dx,dy);
      this.arena.move(this.actor.root.x+dx/length*speed*seconds,this.actor.root.y+dy/length*speed*seconds);
    } else if(motion!=='idle') {
      const horizontal=direction==='left'||direction==='right';
      // Keep the autoplay loop inside the larger mounted footprint.
      const key=horizontal?'x':'y', min=horizontal?90:204,max=horizontal?528:348;
      const pos=this.actor.root[key]+(['left','up'].includes(direction)?-1:1)*speed*seconds;
      const next=pos<min?max:pos>max?min:pos;
      this.arena.move(horizontal?next:this.actor.root.x,horizontal?this.actor.root.y:next);
    }
    const distance=Math.hypot(this.actor.root.x-previousX,this.actor.root.y-previousY);
    this.arena.finishFrame(delta,distance===0?'idle':motion,direction,distance>80?0:distance);
    this.foot.setPosition(Math.round(this.arena.ground.x),Math.round(this.arena.ground.y)).setVisible(!this.arena.mount.attached);
    this.arena.debug($('arena-debug').checked);
    const caption=`${this.arena.state} · frame ${this.actor.combat.action?.frame??this.actor.frame} · ${this.arena.mount.state} · Trúng ${this.arena.hitCount}`;
    if($('arena-state').textContent!==caption)$('arena-state').textContent=caption;
    this.crowdElapsed=(this.crowdElapsed??0)+delta;
    if(this.crowdElapsed>=55){
      const crowdDelta=this.crowdElapsed;this.crowdElapsed=0;
      this.crowd.forEach((actor,i)=>{
      const facing=DIRECTIONS[Math.floor(i/15)];
      actor.advance(crowdDelta,i%3===0?'run':'walk',facing);
      actor.root.setPosition(40+(i%15)*39+actor.frame,116+Math.floor(i/15)*57);
      });
    }
  }
}
let comparison;
function refreshComparison(){comparison?.draw();}
class Comparison extends Phaser.Scene {
  preload(){loadCharacterAssets(this);loadCombatMountAssets(this);}
  create(){comparison=this;this.draw();}
  draw(){
    this.children.removeAll(true);
    const field=$('compare-field').value;
    const looks=Object.entries(OPTIONS[field]).map(([id,name])=>{
      let base=appearance;
      if(field==='outfit'&&!supportsPart(base,field,id)) {
        for(const bodyType of Object.keys(OPTIONS.bodyType)) {
          if(supportsPart({...base,bodyType},field,id)){base=changeAppearance(base,'bodyType',bodyType);break;}
        }
      }
      if(!supportsPart(base,field,id)&&field==='face') {
        for(const bodyType of Object.keys(OPTIONS.bodyType)) {
          if(supportsPart({...base,bodyType},field,id)){base=changeAppearance(base,'bodyType',bodyType);break;}
        }
      }
      return {name,look:supportsPart(base,field,id)?changeAppearance(base,field,id):null};
    });
    const width=Math.max(1,looks.length)*200;
    this.scale.resize(width,240);
    for(const [i,{name,look}] of looks.entries()) {
      const x=i*200+100;
      if(look)new ModularCharacter(this,x,198,look).root.setScale(2);
      this.add.text(x,look?207:105,look?name:'Không tương thích',{fontFamily:'Arial',fontSize:'13px',color:'#eadfbd'}).setOrigin(.5,0);
    }

  }
}
$('compare-field').value='bodyType';
$('compare-field').onchange=refreshComparison;
new Phaser.Game({type:Phaser.CANVAS,parent:'compare-stage',width:750,height:160,pixelArt:true,roundPixels:true,backgroundColor:'#24382c',fps:{limit:12},scene:Comparison,audio:{noAudio:true}});
new Phaser.Game({type:Phaser.AUTO,parent:'map-stage' ,...size,pixelArt:true,roundPixels:true,scene:CharacterEditor});

roster=mountNpcRoster({onSelect(npc,look){
  const list=$('npc');
  let option=Array.from(list.options).find(o=>o.value===npc.id);
  if(!option){option=new Option(npc.name,npc.id);list.add(option);}
  list.value=npc.id;
  setAppearance(look);
}});
window.addEventListener('roster-manual-preview',()=>report(()=>roster?.manual(appearance),'Đã chuẩn bị bản nháp ngoại hình.'));

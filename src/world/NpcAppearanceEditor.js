import Phaser from 'phaser';
import { SaveGuard } from '../dao/SaveGuard.ts';
import { WORLD_POPULATION_SAVE_KEY } from '../world-rebuild-population.js';
import { CharacterRenderer } from './CharacterRenderer.js';
import { loadCharacterAssets } from './CharacterAssetRegistry.js';
import { loadCombatMountAssets } from './CombatMountAssets.js';
import { allocateNpcAppearance, appearanceSignature, ensureWorldNpcAppearances } from './NpcAppearanceProfiles.js';
import { validateAppearance } from './CharacterAppearance.js';
import { weaponForNpc } from './WeaponCombat.js';
import { visualEquipment } from './CharacterEquipment.js';

const PAGE_SIZE=24;
const ROLE_NAMES={commoner:'Dân thường',merchant:'Thương nhân',tavern_staff:'Nhân viên tửu quán',quest_clerk:'Thư lại',repair_worker:'Thợ sửa chữa',herb_gatherer:'Người hái dược',hunter:'Thợ săn',city_guard:'Vệ binh',low_disciple:'Đệ tử',elder:'Trưởng lão',sect_leader:'Tông chủ',independent_cultivator:'Tán tu'};
const $=id=>document.getElementById(id);
function readWorld(){
  const raw=localStorage.getItem(WORLD_POPULATION_SAVE_KEY);
  if(!raw)return null;
  const world=JSON.parse(raw);
  if(!world.population?.initialized||!Array.isArray(world.npcs))throw new Error('Bản lưu cư dân không hợp lệ.');
  ensureWorldNpcAppearances(world);
  return world;
}
function label(npc){return npc.authorityRole==='city_master'?'Thành chủ':ROLE_NAMES[npc.populationRole]??npc.populationRole??'Cư dân';}

export function mountNpcRoster({onSelect}){
  let world;
  try{world=readWorld();}catch(error){$('roster-status').textContent=error.message;}
  if(!world)return null;
  const draft=new Map();
  const selected=new Set();
  let active=null,page=0,gallery;
  const seed=world.population.spawnSeed??world.worldId;
  const byId=new Map(world.npcs.map(npc=>[npc.id,npc]));
  const factionName=npc=>world.factions?.find(f=>f.id===npc.faction||f.memberIds?.includes(npc.id))?.name??npc.faction??'Tự do';
  const records=()=>world.npcs.filter(npc=>npc.modularAppearance);
  const lookOf=npc=>draft.get(npc.id)?.next??npc.modularAppearance;
  const shown=()=>records().filter(npc=>(!$('roster-role').value||npc.populationRole===$('roster-role').value)&&(! $('roster-faction').value||factionName(npc)===$('roster-faction').value));
  const currentPage=()=>shown().slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE);
  const status=message=>$('roster-status').textContent=message;
  const render=()=>{
    const all=records();const total=shown().length;
    const signatures=new Set(all.map(n=>appearanceSignature(lookOf(n).look)));
    $('roster-counts').textContent=`${all.length}/${world.npcs.length} NPC modular · ${all.filter(n=>lookOf(n).locked).length} khóa · ${all.length-signatures.size} trùng · ${draft.size} chờ lưu`;
    $('roster-page').textContent=`${page+1}/${Math.max(1,Math.ceil(total/PAGE_SIZE))} · ${total} cư dân`;
    $('roster-prev').disabled=page===0;$('roster-next').disabled=(page+1)*PAGE_SIZE>=total;
    $('roster-confirm').disabled=!draft.size;$('roster-cancel').disabled=!draft.size;
    $('roster-lock').disabled=!active;$('roster-manual').disabled=!active||lookOf(byId.get(active)).locked;
    $('roster-lock').textContent=active&&lookOf(byId.get(active)).locked?'Mở khóa':'Khóa ngoại hình';
    const list=$('roster-select');list.replaceChildren();
    for(const npc of currentPage()){
      const option=new Option(`${npc.name} · ${label(npc)}${lookOf(npc).locked?' · khóa':''}`,npc.id);
      option.selected=selected.has(npc.id);list.add(option);
    }
    gallery?.draw();
  };
  const select=id=>{
    const npc=byId.get(id);
    if(!npc?.modularAppearance)return;
    active=id;
    onSelect(npc,{...lookOf(npc).look,weapon:visualEquipment(weaponForNpc(npc))});
    render();
  };
  const stage=(npc,next)=>{
    draft.set(npc.id,{prior:draft.get(npc.id)?.prior??JSON.stringify(npc.modularAppearance),next});
  };
  function preview(ids){
    const taken=new Set(records().map(n=>appearanceSignature(lookOf(n).look)));
    let count=0;
    for(const id of [...ids].sort()){
      const npc=byId.get(id);if(!npc||lookOf(npc).locked||lookOf(npc).manual)continue;
      const entry=lookOf(npc),generation=entry.generation+67;
      stage(npc,{...entry,look:allocateNpcAppearance(npc,seed,taken,generation),generation});count++;
    }
    if(active)select(active);else render();
    status(count?`Đang xem trước ${count} ngoại hình. Bấm Xác nhận lưu để áp dụng.`:'Không có cư dân mở khóa để random.');
  }
  function confirm(){
    try{
      const guard=new SaveGuard(localStorage,WORLD_POPULATION_SAVE_KEY);
      const latest=readWorld();
      if(!latest||latest.worldId!==world.worldId)throw new Error('Bản lưu thế giới đã đổi. Hãy tải lại editor.');
      const targets=new Map(latest.npcs.map(n=>[n.id,n]));
      for(const [id,{prior,next}] of draft){
        const npc=targets.get(id);
        if(!npc||JSON.stringify(npc.modularAppearance)!==prior)throw new Error('Ngoại hình đã đổi ở tab khác. Hãy tải lại editor.');
        npc.modularAppearance=next;
      }
      if(!guard.write(JSON.stringify(latest)))throw new Error('Bản lưu vừa đổi. Hãy thử xác nhận lại.');
      const count=draft.size;
      world=latest;byId.clear();for(const npc of world.npcs)byId.set(npc.id,npc);
      draft.clear();if(active)select(active);else render();
      status(`Đã lưu ${count} ngoại hình cư dân.`);
    }catch(error){status(error.message);}
  }
  const manager={
    get active(){return active;},
    crowdLooks(){return records().slice(0,60).map(n=>({...lookOf(n).look,weapon:visualEquipment(weaponForNpc(n))}));},
    restore(){if(active){draft.delete(active);select(active);status('Đã khôi phục ngoại hình đã lưu.');}},
    manual(appearance){
      const npc=byId.get(active);
      if(!npc||lookOf(npc).locked)throw new Error('Cư dân đang khóa ngoại hình.');
      const entry=lookOf(npc);
      stage(npc,{...entry,look:validateAppearance({...appearance,id:npc.id,weapon:'none'}),manual:true});
      render();status('Đang xem trước chỉnh sửa. Bấm Xác nhận lưu để áp dụng.');
    },
  };
  $('roster-manual').onclick=()=>window.dispatchEvent(new Event('roster-manual-preview'));
  $('roster-random-one').onclick=()=>preview(active?[active]:[]);
  $('roster-random-selected').onclick=()=>preview(selected);
  $('roster-confirm').onclick=confirm;
  $('roster-cancel').onclick=()=>{draft.clear();if(active)select(active);else render();status('Đã hủy các thay đổi xem trước.');};
  $('roster-lock').onclick=()=>{const npc=byId.get(active);if(!npc)return;const entry=lookOf(npc);stage(npc,{...entry,locked:!entry.locked});render();status('Thay đổi khóa đang chờ xác nhận.');};
  $('roster-select').onchange=event=>{
    for(const npc of currentPage())selected.delete(npc.id);
    for(const option of event.target.selectedOptions)selected.add(option.value);
    if(event.target.value)select(event.target.value);
  };
  for(const [field,values] of [['role',new Set(records().map(n=>n.populationRole))],['faction',new Set(records().map(factionName))]]){
    const control=$('roster-'+field);
    for(const value of [...values].filter(Boolean).sort())control.add(new Option(ROLE_NAMES[value]??value,value));
    control.onchange=()=>{page=0;render();};
  }
  $('roster-prev').onclick=()=>{page--;render();};$('roster-next').onclick=()=>{page++;render();};
  class RosterGallery extends Phaser.Scene {
    preload(){loadCharacterAssets(this);loadCombatMountAssets(this);}
    create(){gallery=this;this.draw();$('npc-roster-gallery').dataset.ready='true';}
    draw(){
      this.children.removeAll(true);
      const rows=currentPage();
      this.scale.resize(1008,Math.max(132,Math.ceil(rows.length/7)*129));
      for(const [index,npc] of rows.entries()){
        const x=index%7*144+72,y=Math.floor(index/7)*129;
        const entry=lookOf(npc);
        const card=this.add.rectangle(x,y+63,138,123,active===npc.id?0x485e45:0x26392f).setInteractive({useHandCursor:true});
        if(entry.locked)card.setStrokeStyle(1,0xd1a468);
        card.on('pointerup',()=>select(npc.id));
        new CharacterRenderer(this,x,y+75,{...entry.look,weapon:visualEquipment(weaponForNpc(npc))}).root.setScale(.74);
        this.add.text(x,y+78,npc.name,{fontFamily:'Arial',fontSize:'12px',color:'#e6d2aa'}).setOrigin(.5,0);
        const role=this.add.text(x,y+94,`${label(npc)} · ${factionName(npc)}`,{fontFamily:'Arial',fontSize:'9px',color:'#bdd2bc'}).setOrigin(.5,0);
        if(role.width>134)role.setScale(134/role.width,1);
        const text=this.add.text(x,y+109,npc.id,{fontFamily:'Arial',fontSize:'8px',color:'#aab8a9'}).setOrigin(.5,0);
        if(text.width>134)text.setScale(134/text.width,1);
      }
    }
  }
  new Phaser.Game({type:Phaser.CANVAS,parent:'npc-roster-gallery',width:1008,height:516,pixelArt:true,roundPixels:true,backgroundColor:'#1d3026',fps:{limit:8},scene:RosterGallery,audio:{noAudio:true}});
  $('npc-appearance-roster').hidden=false;
  const fromUrl=new URLSearchParams(location.search).get('npc');
  if(fromUrl&&byId.has(fromUrl)){page=Math.max(0,Math.floor(shown().findIndex(n=>n.id===fromUrl)/PAGE_SIZE));select(fromUrl);}
  render();
  return manager;
}

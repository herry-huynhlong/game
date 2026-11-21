import Phaser from 'phaser';
import './style.css';
import { Enemy } from './entities/Enemy';
import { createGameAnimations } from './systems/AnimationManager';
import { damageForStrike, lineBlocked, targetInSwordArc, type EnemyKind, type Facing } from './systems/CombatSystem';
import { EffectsManager } from './systems/EffectsManager';
import { REALMS, cultivationRequired } from './systems/RealmConfig';
import { addCultivationXp, breakthrough as performBreakthrough, cultivationStats, cultivationView, getZoneCultivation, formatRate } from './systems/CultivationSystem';
import { CultivationEffects } from './systems/CultivationEffects';
import { addTechniquePractice, TECHNIQUES, techniqueEffects } from './systems/TechniqueSystem';
import { SPIRITUAL_ROOTS, stableRootForLegacySave } from './systems/SpiritualRootSystem';
import type { CultivationSave, SpiritualRootId, TechniqueId } from './systems/CultivationTypes';

type Save={x:number;y:number;hp:number;mp:number;stones:number;potions:number;kills:number;questDone:boolean;mapVersion:number}&CultivationSave;
type PlayerAction='idle'|'walk'|'run'|'attack'|'cast'|'dodge'|'hurt'|'death';
const SAVE_KEY='thanh-van-ky-save-v1';
const emptyMastery=():Record<TechniqueId,number>=>({qingyun:1,sword:1,longevity:1});
const emptyProgress=():Record<TechniqueId,number>=>({qingyun:0,sword:0,longevity:0});
const defaults:Save={x:576,y:800,hp:100,mp:60,xp:0,stones:0,potions:2,kills:0,questDone:false,realmIndex:0,realmLevel:1,spiritualRoot:'water',technique:'qingyun',techniqueMastery:emptyMastery(),techniqueProgress:emptyProgress(),mapVersion:2};
const propNames=['ancient_tree','bamboo_grove','boulder','spirit_crystal','red_lantern','sect_hall','village_house','qingyun_gate','training_pavilion','herb_hut','spirit_tree','willow_tree','stone_lantern','mossy_rock','jade_spire','teahouse'];
const validRoot=(v:any):v is SpiritualRootId=>Object.hasOwn(SPIRITUAL_ROOTS,v);
const validTechnique=(v:any):v is TechniqueId=>Object.hasOwn(TECHNIQUES,v);
let saveNeedsMigration=false;
const saved=():Save=>{try{const old=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}');const next:Save={...defaults,...old};
  const root=validRoot(old.spiritualRoot)?old.spiritualRoot:stableRootForLegacySave(old);const technique=validTechnique(old.technique)?old.technique:'qingyun';
  const safeRecord=(source:any,fallback:Record<TechniqueId,number>,min:number)=>Object.fromEntries((Object.keys(fallback) as TechniqueId[]).map(k=>[k,Number.isFinite(source?.[k])?Math.max(min,source[k]):fallback[k]])) as Record<TechniqueId,number>;
  next.realmIndex=Phaser.Math.Clamp(Math.floor(Number(old.realmIndex)||0),0,REALMS.length-1);next.realmLevel=Phaser.Math.Clamp(Math.floor(Number(old.realmLevel)||1),1,REALMS[next.realmIndex].maxLevel);next.xp=Math.max(0,Number(old.xp)||0);
  next.spiritualRoot=root;next.technique=technique;next.techniqueMastery=safeRecord(old.techniqueMastery,emptyMastery(),1);next.techniqueProgress=safeRecord(old.techniqueProgress,emptyProgress(),0);
  if(old.mapVersion!==2){next.x=defaults.x;next.y=defaults.y;next.mapVersion=2}saveNeedsMigration=old.mapVersion!==2||!validRoot(old.spiritualRoot)||!validTechnique(old.technique)||!old.techniqueMastery||!old.techniqueProgress||Object.keys(emptyMastery()).some(k=>old.techniqueMastery?.[k]==null)||Object.keys(emptyProgress()).some(k=>old.techniqueProgress?.[k]==null);return next}catch{saveNeedsMigration=true;return {...defaults}}};
let state=saved();
const ui=(id:string)=>document.getElementById(id)!;
let world:World|undefined;
let toastTimer=0;
function toast(message:string){const el=ui('toast');el.textContent=message;el.classList.remove('hidden');window.clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>el.classList.add('hidden'),2000)}
function persist(){localStorage.setItem(SAVE_KEY,JSON.stringify(state));ui('save-button').textContent='✦ Đã lưu'}
const currentStats=()=>cultivationStats(state);
function refresh(){const stats=currentStats(),view=cultivationView(state);state.hp=Math.min(state.hp,stats.hpMax);state.mp=Math.min(state.mp,stats.mpMax);ui('realm').textContent=`${view.realm} · Tầng ${view.level}`;ui('hp-text').textContent=`${state.hp} / ${stats.hpMax}`;ui('mp-text').textContent=`${state.mp} / ${stats.mpMax}`;ui('xp-text').textContent=`${Math.floor(view.xp)} / ${view.required}`;ui('hp-bar').style.width=`${state.hp/stats.hpMax*100}%`;ui('mp-bar').style.width=`${state.mp/stats.mpMax*100}%`;ui('xp-bar').style.width=`${view.xp/view.required*100}%`;ui('stones').textContent=String(state.stones);ui('quest-progress').textContent=state.questDone?'Hoàn thành':`${Math.min(state.kills,3)} / 3`;ui('inv-stones').textContent=`${state.stones} viên`;ui('inv-potions').textContent=`${state.potions} viên · nhấn H để dùng`;ui('quest-title').textContent=state.questDone?'Ngoại môn thử luyện · Hoàn thành':'Ngoại môn thử luyện';ui('quest-description').textContent=state.questDone?'Đã hoàn thành thử luyện. Hãy tiếp tục khám phá Thanh Vân Sơn.':'Thanh lý 3 con yêu thú quanh sơn môn.';refreshCultivationPanel()}
function refreshCultivationPanel(){const stats=currentStats(),view=cultivationView(state),root=SPIRITUAL_ROOTS[state.spiritualRoot],tech=TECHNIQUES[state.technique];ui('cultivation-realm').textContent=`${view.realm} · Tầng ${view.level}`;ui('cultivation-root').textContent=`${root.name} · ${root.description}`;ui('root-icon').style.backgroundPosition=`-${(['metal','wood','water','fire','earth'] as SpiritualRootId[]).indexOf(state.spiritualRoot)*32}px 0`;ui('cultivation-xp').textContent=`${Math.floor(view.xp)} / ${view.required}`;ui('cultivation-xp-bar').style.width=`${Math.min(100,view.xp/view.required*100)}%`;ui('breakthrough-condition').textContent=view.canBreakthrough?'Tu vi đã viên mãn · có thể đột phá an toàn.':view.breakthroughLabel;ui('cultivation-hp').textContent=String(stats.hpMax);ui('cultivation-mp').textContent=String(stats.mpMax);ui('cultivation-atk').textContent=String(Math.round(stats.attack));ui('cultivation-def').textContent=String(stats.defense);ui('cultivation-absorb').textContent=formatRate(stats.absorption);ui('meditation-status').textContent=world?.meditating?'Đang đả tọa · hấp thu linh khí':'Chưa đả tọa';ui('meditation-toggle').textContent=world?.meditating?'Dừng Đả Tọa':'Đả Tọa';const zone=world?.zoneInfo??{name:'Thanh Vân Môn',multiplier:1.15};const rate=stats.absorption*zone.multiplier*stats.techniqueRate;ui('zone-name').textContent=zone.name;ui('zone-rate').textContent=`${zone.multiplier.toFixed(2)}× · ${formatRate(rate)}`;ui('meditation-tick').textContent=`+${rate.toFixed(1)} tu vi / giây`;ui('meditation-bar').style.width=world?.meditating?`${Math.min(100,(world.meditateTick%1)*100)}%`:'0%';ui('active-technique-label').textContent=`${tech.name} · Tinh thông ${state.techniqueMastery[state.technique]}`;(ui('breakthrough-button') as HTMLButtonElement).disabled=!view.canBreakthrough||!!world?.breakingThrough;
  (Object.keys(TECHNIQUES) as TechniqueId[]).forEach(id=>{const button=document.querySelector<HTMLButtonElement>(`[data-technique="${id}"]`)!;button.classList.toggle('active',state.technique===id);button.querySelector(`[data-mastery="${id}"]`)!.textContent=String(state.techniqueMastery[id]);button.querySelector<HTMLElement>(`[data-tech-progress="${id}"]`)!.style.setProperty('--mastery-progress',`${state.techniqueProgress[id]}%`)})}
function gainXp(amount:number){const becameReady=addCultivationXp(state,amount);refresh();persist();if(becameReady)toast('Tu vi đã viên mãn · có thể đột phá!')}
function property(obj:any,key:string){return obj.properties?.find((p:any)=>p.name===key)?.value}
const UNIT:Record<Facing,{x:number;y:number;angle:number}>={down:{x:0,y:1,angle:Math.PI/2},up:{x:0,y:-1,angle:-Math.PI/2},left:{x:-1,y:0,angle:Math.PI},right:{x:1,y:0,angle:0}};

class World extends Phaser.Scene{
  player!:Phaser.Physics.Arcade.Sprite;npc?:Phaser.GameObjects.Sprite;keys!:Record<string,Phaser.Input.Keyboard.Key>;map!:Phaser.Tilemaps.Tilemap;obstacles!:Phaser.Physics.Arcade.StaticGroup;effects!:EffectsManager;cultivationEffects!:CultivationEffects;
  enemies:Enemy[]=[];facing:Facing='down';action:PlayerAction='idle';speed=190;actionUntil=0;meditating=false;meditateTick=0;meditationAccumulator=0;lastAttack=-Infinity;combo=0;comboUntil=0;lastQi=-Infinity;lastDodge=-Infinity;stamina=100;invulnerableUntil=0;lastSave=0;spawnX=576;spawnY=800;zones:any[]=[];veins:{x:number;y:number}[]=[];zoneInfo={name:'Thanh Vân Môn',multiplier:1.15};zoneCheckElapsed=0;running=false;dashing=false;breakingThrough=false;
  constructor(){super('world')}
  preload(){
    this.load.tilemapTiledJSON('qingyun-map','/maps/thanh_van_world.tmj');
    this.load.image('terrain','/assets/tilesets/qingyun_terrain.png');
    this.load.atlas('world-props','/assets/props/world_props.png','/assets/props/world_props.json');
    this.load.spritesheet('cultivator','/assets/characters/van_du.png',{frameWidth:32,frameHeight:40});
    this.load.spritesheet('steward','/assets/characters/steward_li.png',{frameWidth:32,frameHeight:48});
    this.load.spritesheet('wolf','/assets/characters/wolf.png',{frameWidth:32,frameHeight:32});
    this.load.spritesheet('rabbit','/assets/characters/rabbit.png',{frameWidth:32,frameHeight:32});
    this.load.spritesheet('slash-arc','/assets/effects/slash_arc.png',{frameWidth:48,frameHeight:48});
    this.load.spritesheet('qi-bolt','/assets/effects/qi_bolt.png',{frameWidth:40,frameHeight:24});
    this.load.spritesheet('impact-spark','/assets/effects/impact_spark.png',{frameWidth:24,frameHeight:24});
    this.load.spritesheet('spirit-burst','/assets/effects/spirit_burst.png',{frameWidth:32,frameHeight:32});
    this.load.image('meditation-pose','/assets/characters/van_du_meditation.png');
    this.load.spritesheet('spirit-aura','/assets/effects/spirit_aura.png',{frameWidth:48,frameHeight:48});
    this.load.image('cultivation-circle','/assets/effects/cultivation_circle.png');
    this.load.spritesheet('realm-ascension','/assets/effects/realm_ascension.png',{frameWidth:64,frameHeight:80});
    this.load.spritesheet('foundation-breakthrough','/assets/effects/foundation_breakthrough.png',{frameWidth:96,frameHeight:96});
  }
  create(){
    world=this;this.effects=new EffectsManager(this);this.cultivationEffects=new CultivationEffects(this);
    this.map=this.make.tilemap({key:'qingyun-map'});
    const terrain=this.map.addTilesetImage('ThanhVanTerrain','terrain',32,32,0,0);
    if(!terrain)throw new Error('Tiled tileset ThanhVanTerrain was not found');
    this.map.createLayer('Ground',terrain,0,0)?.setDepth(-100);this.map.createLayer('Paths',terrain,0,0)?.setDepth(-99);this.map.createLayer('Details',terrain,0,0)?.setDepth(-98);
    this.cameras.main.setBounds(0,0,this.map.widthInPixels,this.map.heightInPixels);this.cameras.main.setZoom(1.35);this.cameras.main.roundPixels=true;this.physics.world.setBounds(0,0,this.map.widthInPixels,this.map.heightInPixels);
    this.obstacles=this.physics.add.staticGroup();
    const propObjects=this.map.getObjectLayer('WorldProps')?.objects??[];const collisionObjects=this.map.getObjectLayer('Collision')?.objects??[];const spawns=this.map.getObjectLayer('Spawns')?.objects??[];
    this.veins=propObjects.filter(o=>property(o,'sprite')==='spirit_crystal').map(o=>({x:(o.x??0)+(o.width??128)/2,y:(o.y??0)-28}));
    for(const o of propObjects){const id=(o.gid??0)-129;const frame=property(o,'sprite')||propNames[id];if(!frame)continue;const x=o.x??0,y=o.y??0,width=o.width??128;this.add.image(x+width/2,y,'world-props',frame).setOrigin(.5,1).setDepth(y)}
    for(const o of collisionObjects){const x=o.x??0,y=o.y??0,width=o.width??0,height=o.height??0;const b=this.add.rectangle(x+width/2,y+height/2,width,height,0x000000,0).setDepth(-90);this.obstacles.add(b)}
    this.zones=this.map.getObjectLayer('Zones')?.objects??[];const start=spawns.find(o=>o.type==='player');if(start){this.spawnX=start.x??this.spawnX;this.spawnY=start.y??this.spawnY}
    const npcSpawn=spawns.find(o=>o.type==='npc');if(npcSpawn){const x=npcSpawn.x??0,y=npcSpawn.y??0;this.npc=this.add.sprite(x,y,'steward',0).setOrigin(.5,1).setDepth(y);this.add.text(x,y-56,'CHẤP SỰ LÝ',{fontFamily:'serif',fontSize:'11px',color:'#f1e3c1',stroke:'#152018',strokeThickness:3}).setOrigin(.5).setDepth(y+1)}
    createGameAnimations(this);
    const savedPosition=Number.isFinite(state.x)&&state.x>0?{x:state.x,y:state.y}:{x:this.spawnX,y:this.spawnY};
    this.player=this.physics.add.sprite(savedPosition.x,savedPosition.y,'cultivator',0).setOrigin(.5,1).setDepth(savedPosition.y);
    const playerBody=this.player.body as Phaser.Physics.Arcade.Body;playerBody.setSize(18,10).setOffset(7,28).setCollideWorldBounds(true);this.physics.add.collider(this.player,this.obstacles);this.player.play('player_idle_down');this.cameras.main.startFollow(this.player,true,.1,.1);this.cameras.main.centerOn(this.player.x,this.player.y);
    for(const o of spawns.filter(o=>o.type==='enemy'))this.spawnEnemy(o.x??0,o.y??0,property(o,'species')==='rabbit'?'rabbit':'wolf');
    this.keys=this.input.keyboard!.addKeys('W,A,S,D,E,J,K,L,H,UP,DOWN,LEFT,RIGHT,SHIFT,SPACE') as Record<string,Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.on('keydown-J',()=>this.attack());this.input.keyboard!.on('keydown-K',()=>this.castQi());this.input.keyboard!.on('keydown-L',()=>this.meditate());this.input.keyboard!.on('keydown-H',()=>this.potion());this.input.keyboard!.on('keydown-E',()=>this.interact());this.input.keyboard!.on('keydown-SPACE',(event:KeyboardEvent)=>{event.preventDefault();this.dodge()});
    this.input.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{if(pointer.leftButtonDown())this.attack()});
    document.querySelector('.skill[data-skill="attack"]')!.addEventListener('click',()=>this.attack());document.querySelector('[data-skill="sword"]')!.addEventListener('click',()=>this.castQi());document.querySelector('[data-skill="dodge"]')!.addEventListener('click',()=>this.dodge());document.querySelector('[data-skill="meditate"]')!.addEventListener('click',()=>this.meditate());ui('potion-button').onclick=()=>this.potion();
    ui('cultivation-open').onclick=()=>{ui('cultivation-panel').classList.remove('hidden');ui('dev-panel').classList.add('covered')};ui('cultivation-close').onclick=()=>{ui('cultivation-panel').classList.add('hidden');ui('dev-panel').classList.remove('covered')};ui('meditation-toggle').onclick=()=>this.meditate();ui('breakthrough-button').onclick=()=>this.beginBreakthrough();
    document.querySelectorAll<HTMLButtonElement>('[data-technique]').forEach(button=>button.addEventListener('click',()=>this.selectTechnique(button.dataset.technique as TechniqueId)));
    ui('inventory-button').onclick=()=>ui('inventory').classList.remove('hidden');ui('close-inventory').onclick=()=>ui('inventory').classList.add('hidden');ui('close-dialogue').onclick=()=>ui('dialogue').classList.add('hidden');
    ui('dialogue-action').onclick=()=>{ui('dialogue').classList.add('hidden');if(!state.questDone){if(state.kills>=3)this.completeQuest();else toast('Nhiệm vụ đã ghi vào ngọc giản. Hãy đi trừ yêu!')}};
    ui('save-button').onclick=()=>{state.x=this.player.x;state.y=this.player.y;persist();toast('Tiến trình đã lưu trong trình duyệt.')};
    this.updateZone(true);refresh();if(saveNeedsMigration){persist();saveNeedsMigration=false}
    this.setupDevTest();
  }
  spawnEnemy(x:number,y:number,kind:EnemyKind){const enemy=new Enemy(this,kind,x,y,this.obstacles);this.physics.add.collider(this.player,enemy.sprite);for(const other of this.enemies)if(other.alive)this.physics.add.collider(enemy.sprite,other.sprite);enemy.sprite.play(`${kind}_idle`);this.enemies.push(enemy)}
  update(_:number,delta:number){
    if(!this.player)return;const dt=Math.min(delta/1000,.04);const now=this.time.now;const body=this.player.body as Phaser.Physics.Arcade.Body;
    if(this.action==='death'){if(now>=this.actionUntil){state.hp=100;state.mp=Math.max(0,state.mp-10);this.player.setPosition(this.spawnX,this.spawnY);body.reset(this.spawnX,this.spawnY);this.invulnerableUntil=now+1200;this.action='idle';this.actionUntil=0;this.player.clearTint();this.player.play(`player_idle_${this.facing}`);refresh();toast('Ngươi trọng thương, được đưa về sơn môn.')}return}
    this.updateCooldowns(now);
    let dx=0,dy=0;if(this.keys.A.isDown||this.keys.LEFT.isDown)dx--;if(this.keys.D.isDown||this.keys.RIGHT.isDown)dx++;if(this.keys.W.isDown||this.keys.UP.isDown)dy--;if(this.keys.S.isDown||this.keys.DOWN.isDown)dy++;
    if(this.meditating){dx=0;dy=0}else if(dx||dy)this.facing=Math.abs(dy)>Math.abs(dx)?(dy<0?'up':'down'):(dx<0?'left':'right');
    this.running=!!(this.keys.SHIFT.isDown&&(dx||dy)&&this.stamina>0);
    this.stamina=Phaser.Math.Clamp(this.stamina+(this.running?-36:25)*dt,0,100);ui('stamina-fill').style.width=`${this.stamina}%`;
    if(this.breakingThrough){body.setVelocity(0,0)}
    else if(this.dashing){if(now<this.actionUntil){body.setVelocity(UNIT[this.facing].x*400,UNIT[this.facing].y*400)}else{this.dashing=false;this.action='idle';body.setVelocity(0,0)}}
    else if(now<this.actionUntil&&(this.action==='attack'||this.action==='cast'||this.action==='hurt')){body.setVelocity(0,0)}
    else{
      const moving=!!(dx||dy);if(moving){const len=Math.hypot(dx,dy);const pace=this.running?286:190;body.setVelocity(dx/len*pace,dy/len*pace);this.action=this.running?'run':'walk';this.player.play(`player_${this.action}_${this.facing}`,true)}
      else{body.setVelocity(0,0);this.action='idle';if(this.meditating)this.player.setTint(0xb4dfca);else this.player.clearTint();this.player.play(`player_idle_${this.facing}`,true)}
    }
    this.player.setDepth(this.player.y);
    for(const enemy of this.enemies)this.updateEnemy(enemy,dt,now);
    const near=this.npc&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.npc.x,this.npc.y)<96;ui('interaction').classList.toggle('hidden',!near);
    this.zoneCheckElapsed+=dt;if(this.zoneCheckElapsed>=.4){this.zoneCheckElapsed=0;this.updateZone()}
    if(this.meditating){const meditationDelta=Math.min(Math.max(delta,0)/1000,1);this.meditationAccumulator+=meditationDelta;this.meditateTick=this.meditationAccumulator;this.cultivationEffects.updateMeditation(this.player);ui('meditation-bar').style.width=`${Math.min(100,this.meditateTick*100)}%`;while(this.meditationAccumulator>=1){this.meditationAccumulator-=1;this.meditateTick=this.meditationAccumulator;this.resolveMeditationPulse()}}
    this.lastSave+=dt;if(this.lastSave>10){this.lastSave=0;state.x=this.player.x;state.y=this.player.y;persist()}
  }
  updateZone(force=false){const next=getZoneCultivation(this.player,this.zones,this.veins);if(force||next.name!==this.zoneInfo.name||next.multiplier!==this.zoneInfo.multiplier){this.zoneInfo=next;refreshCultivationPanel()}}
  resolveMeditationPulse(){const stats=currentStats();const rate=stats.absorption*this.zoneInfo.multiplier*stats.techniqueRate;gainXp(Math.max(1,Math.round(rate)));state.mp=Math.min(stats.mpMax,state.mp+stats.mpRegen);state.hp=Math.min(stats.hpMax,state.hp+stats.hpRegen);this.cultivationEffects.absorbPulse(this.player.x,this.player.y);if(state.technique==='qingyun')this.practiceTechnique('qingyun',10);if(state.technique==='longevity')this.practiceTechnique('longevity',8);refresh()}
  practiceTechnique(id:TechniqueId,amount:number){const leveled=addTechniquePractice(state,id,amount);if(leveled)toast(`${TECHNIQUES[id].name} tinh thông lên tầng ${state.techniqueMastery[id]}.`);refreshCultivationPanel();if(leveled)persist()}
  updateEnemy(enemy:Enemy,dt:number,now:number){
    if(!enemy.alive)return;enemy.nextAttack-=dt;const d=Phaser.Math.Distance.Between(this.player.x,this.player.y,enemy.sprite.x,enemy.sprite.y);const body=enemy.body;
    if(now<enemy.stunUntil){enemy.updateUi();return}
    if(enemy.kind==='wolf'){
      if(d>300){const hx=enemy.homeX-enemy.sprite.x,hy=enemy.homeY-enemy.sprite.y;if(Math.hypot(hx,hy)>8){body.setVelocity(hx*1.25,hy*1.25);enemy.sprite.play('wolf_walk',true)}else{body.setVelocity(0,0);enemy.sprite.play('wolf_idle',true)}}
      else if(d<220){const a=Phaser.Math.Angle.Between(enemy.sprite.x,enemy.sprite.y,this.player.x,this.player.y);body.setVelocity(Math.cos(a)*74,Math.sin(a)*74);enemy.sprite.play('wolf_walk',true);if(d<34&&enemy.nextAttack<=0){enemy.nextAttack=1.15;this.hurtPlayer(8)}}
      else this.patrol(enemy,dt,36,74,'wolf');
    }else{
      if(d<140){enemy.fleeing=true;const a=Phaser.Math.Angle.Between(this.player.x,this.player.y,enemy.sprite.x,enemy.sprite.y);body.setVelocity(Math.cos(a)*118,Math.sin(a)*118);enemy.sprite.play('rabbit_walk',true)}
      else{enemy.fleeing=false;this.patrol(enemy,dt,47,56,'rabbit')}
    }
    enemy.updateUi();
  }
  patrol(enemy:Enemy,dt:number,speed:number,radius:number,kind:EnemyKind){
    const dx=enemy.sprite.x-enemy.homeX,dy=enemy.sprite.y-enemy.homeY;const dist=Math.hypot(dx,dy);
    if(this.time.now>=enemy.nextWander){enemy.nextWander=this.time.now+Phaser.Math.Between(800,1900);enemy.wanderAngle=dist>radius?Math.atan2(-dy,-dx):Phaser.Math.FloatBetween(-Math.PI,Math.PI)}
    const moving=dist>radius*.65||this.time.now+180<enemy.nextWander;if(moving){enemy.body.setVelocity(Math.cos(enemy.wanderAngle)*speed,Math.sin(enemy.wanderAngle)*speed);enemy.sprite.play(`${kind}_walk`,true)}else{enemy.body.setVelocity(0,0);enemy.sprite.play(`${kind}_idle`,true)}
  }
  hurtPlayer(amount:number){const now=this.time.now;if(now<this.invulnerableUntil||this.action==='death'||this.breakingThrough)return;if(this.meditating){this.meditating=false;this.meditationAccumulator=0;this.cultivationEffects.endMeditation(this.player);toast('Bị thương · trạng thái đả tọa đã ngắt.')}const stats=currentStats();const dealt=Math.max(1,Math.round(amount-stats.defense));state.hp=Math.max(0,state.hp-dealt);refresh();this.player.setTint(0xff7469);this.action='hurt';this.actionUntil=now+260;this.player.play(`player_hurt_${this.facing}`,true);this.cameras.main.shake(90,.002);
    if(state.hp<=0){this.action='death';this.actionUntil=now+900;this.player.clearTint();this.player.play(`player_death_${this.facing}`);return}this.invulnerableUntil=now+480;this.time.delayedCall(160,()=>this.player.clearTint());if(state.technique==='longevity')this.practiceTechnique('longevity',14)}
  attack(){
    const now=this.time.now;if(now<this.actionUntil||this.action==='death'||this.breakingThrough||this.meditating||now-this.lastAttack<320)return;
    this.combo=now<=this.comboUntil?this.combo%3+1:1;this.comboUntil=now+900;this.lastAttack=now;this.action='attack';this.actionUntil=now+340;this.meditating=false;this.player.play(`player_attack_${this.combo}_${this.facing}`,true);this.effects.slash(this.player.x,this.player.y,this.facing,this.combo);
    const strike=this.combo;this.time.delayedCall(125,()=>this.resolveMelee(strike));
  }
  resolveMelee(combo:number){let hitCount=0;for(const enemy of this.enemies){if(!enemy.alive)continue;const x=this.player.x,y=this.player.y-19,tx=enemy.sprite.x,ty=enemy.sprite.y-10;if(!targetInSwordArc(x,y,tx,ty,this.facing))continue;if(lineBlocked(x,y,tx,ty,this.obstacles))continue;
      const damage=damageForStrike(state.realmIndex,combo,false,currentStats().attack);const dead=enemy.damage(damage);const v=UNIT[this.facing];enemy.body.setVelocity(v.x*118,v.y*118);enemy.stunUntil=this.time.now+145;this.effects.impact(tx,ty,damage);hitCount++;if(state.technique==='sword')this.practiceTechnique('sword',12);if(dead)this.defeat(enemy)}
    if(!hitCount)toast('Nhát kiếm lướt qua khoảng không.');
  }
  castQi(){
    const now=this.time.now;if(now<this.actionUntil||this.action==='death'||this.breakingThrough||this.meditating)return;if(now-this.lastQi<2400){toast('Kiếm Khí vẫn đang hồi chiêu.');return}if(state.mp<18){toast('Linh lực không đủ để thi triển Kiếm Khí.');return}
    this.lastQi=now;state.mp-=18;refresh();this.meditating=false;this.action='cast';this.actionUntil=now+440;this.player.play(`player_cast_${this.facing}`,true);this.effects.slash(this.player.x,this.player.y,this.facing,3);
    this.time.delayedCall(260,()=>this.launchQi());
  }
  launchQi(){
    const v=UNIT[this.facing];const x=this.player.x+v.x*24;const y=this.player.y-23+v.y*16;const bolt=this.physics.add.sprite(x,y,'qi-bolt').setDepth(y+2).setRotation(v.angle).play('fx_bolt');
    const body=bolt.body as Phaser.Physics.Arcade.Body;body.setAllowGravity(false);body.setSize(29,9).setOffset(5,7);body.setVelocity(v.x*340,v.y*340);
    const cleanup=()=>{if(!bolt.active)return;this.effects.burst(bolt.x,bolt.y);bolt.destroy()};this.physics.add.collider(bolt,this.obstacles,cleanup);
    for(const enemy of this.enemies)this.physics.add.overlap(bolt,enemy.sprite,()=>{if(!enemy.alive||!bolt.active)return;const stats=currentStats();const damage=damageForStrike(state.realmIndex,3,true,stats.attack,stats.skillDamage);const dead=enemy.damage(damage);this.effects.impact(enemy.sprite.x,enemy.sprite.y,damage,'#a7f2e0');const a=Phaser.Math.Angle.Between(this.player.x,this.player.y,enemy.sprite.x,enemy.sprite.y);enemy.body.setVelocity(Math.cos(a)*160,Math.sin(a)*160);enemy.stunUntil=this.time.now+190;if(state.technique==='sword')this.practiceTechnique('sword',18);if(dead)this.defeat(enemy);bolt.destroy()});
    this.time.delayedCall(1050,()=>{if(bolt.active)bolt.destroy()});
  }
  dodge(){const now=this.time.now;if(this.meditating||this.breakingThrough)return;if(now<this.actionUntil||this.action==='death'||now-this.lastDodge<1100){if(now-this.lastDodge<1100)toast('Thân pháp đang hồi chiêu.');return}this.lastDodge=now;this.meditating=false;this.action='dodge';this.dashing=true;this.actionUntil=now+190;this.invulnerableUntil=now+380;const v=UNIT[this.facing];const body=this.player.body as Phaser.Physics.Arcade.Body;body.setVelocity(v.x*400,v.y*400);this.player.setTint(0xb6eee0);this.time.delayedCall(230,()=>this.player.clearTint())}
  defeat(enemy:Enemy){if(enemy.alive)return;this.effects.burst(enemy.sprite.x,enemy.sprite.y);this.time.delayedCall(850,()=>enemy.dispose());state.kills++;state.stones+=5;gainXp(20);refresh();persist();if(state.kills>=3&&!state.questDone){toast('Thử luyện hoàn thành! Về gặp Chấp sự Lý.')}else toast('+5 linh thạch · +20 tu vi')}
  updateCooldowns(now:number){const qi=Math.max(0,2.4-(now-this.lastQi)/1000);const dodge=Math.max(0,1.1-(now-this.lastDodge)/1000);ui('qi-cooldown').textContent=qi>0?qi.toFixed(1):'';ui('dodge-cooldown').textContent=dodge>0?dodge.toFixed(1):'';ui('qi-cooldown').classList.toggle('ready',qi===0);ui('dodge-cooldown').classList.toggle('ready',dodge===0)}
  interact(){if(!this.npc||Phaser.Math.Distance.Between(this.player.x,this.player.y,this.npc.x,this.npc.y)>96){toast('Hãy đến gần Chấp sự Lý.');return}ui('dialogue-name').textContent='Chấp sự Lý';ui('dialogue-text').textContent=state.questDone?'Làm tốt lắm, Vân Du. Con đường tu hành còn dài, hãy tiếp tục rèn luyện và thám hiểm sơn lâm.':`Ngoại môn gần đây bị yêu thú quấy nhiễu. Hãy trừ ${Math.max(0,3-state.kills)} con yêu thú để bảo vệ sơn môn. Linh thạch và tu vi sẽ là phần thưởng cho ngươi.`;ui('dialogue-action').textContent=state.questDone?'Đóng':'Nhận nhiệm vụ';ui('dialogue').classList.remove('hidden');if(state.kills>=3&&!state.questDone)this.completeQuest()}
  meditate(){if(this.action==='death'||this.breakingThrough||this.actionUntil>this.time.now)return;if(this.meditating){this.meditating=false;this.meditationAccumulator=0;this.meditateTick=0;this.cultivationEffects.endMeditation(this.player);(this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0,0);this.player.play(`player_idle_${this.facing}`);refresh();toast('Đã kết thúc đả tọa.');return}this.meditating=true;this.meditationAccumulator=0;this.meditateTick=0;this.dashing=false;(this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0,0);this.cultivationEffects.beginMeditation(this.player);refresh();toast(`Đả tọa tại ${this.zoneInfo.name} · ${formatRate(currentStats().absorption*this.zoneInfo.multiplier*currentStats().techniqueRate)}.`)}
  selectTechnique(id:TechniqueId){if(!TECHNIQUES[id]||this.breakingThrough)return;state.technique=id;refresh();persist();toast(`Đang tu luyện ${TECHNIQUES[id].name}.`)}
  beginBreakthrough(){if(this.breakingThrough)return;const preview=cultivationView(state);if(!preview.canBreakthrough){toast(state.realmIndex>0?'Đột phá cảnh giới này sẽ được mở trong phần sau.':'Tu vi chưa đạt viên mãn.');return}this.meditating=false;this.meditationAccumulator=0;this.cultivationEffects.endMeditation(this.player);this.breakingThrough=true;this.action='idle';this.actionUntil=this.time.now+760;this.player.setTint(0xc8f0d7);this.cultivationEffects.breakthrough(this.player.x,this.player.y,state.realmLevel===9);ui('cultivation-result').textContent='Tụ linh · vận chuyển chu thiên…';
    window.setTimeout(()=>{if(!this.sys.isActive())return;const oldStats=currentStats(),oldHp=state.hp,oldMp=state.mp;const result=performBreakthrough(state);this.breakingThrough=false;this.actionUntil=0;this.player.clearTint();if(!result.success){ui('cultivation-result').textContent='Đột phá chưa thành · giữ nguyên tu vi, hãy tiếp tục tích lũy.';refresh();return}const next=currentStats();if(result.oldRealmIndex===0&&result.oldLevel===9){state.hp=next.hpMax;state.mp=next.mpMax}else{state.hp=Math.min(next.hpMax,oldHp+Math.max(6,next.hpMax-oldStats.hpMax));state.mp=Math.min(next.mpMax,oldMp+Math.max(4,next.mpMax-oldStats.mpMax))}ui('cultivation-result').textContent=`Đột phá thành công: ${result.to}`;refresh();persist();toast(`Đột phá thành công · ${result.to}!`);if(state.technique==='qingyun')this.practiceTechnique('qingyun',20)},760);
  }
  potion(){if(state.potions<=0){toast('Đã hết Hồi nguyên đan.');return}if(state.hp===100&&state.mp===60){toast('Sinh lực và linh lực đang đầy.');return}state.potions--;state.hp=Math.min(100,state.hp+45);state.mp=Math.min(60,state.mp+25);refresh();toast('Dùng Hồi nguyên đan · hồi phục sinh lực và linh lực.')}
  completeQuest(){state.questDone=true;state.stones+=30;gainXp(40);refresh();persist();toast('Nhiệm vụ hoàn tất · nhận 30 linh thạch và 40 tu vi!')}
  setupDevTest(){const enabled=!!(import.meta as any).env?.DEV&&new URLSearchParams(window.location.search).get('devtest')==='1';ui('dev-panel').classList.toggle('hidden',!enabled);if(!enabled)return;
    document.querySelector('[data-dev="spawn-ai"]')!.addEventListener('click',()=>{this.spawnEnemy(this.player.x+160,this.player.y,'wolf');this.spawnEnemy(this.player.x+100,this.player.y+90,'rabbit');toast('Sói bắt đầu truy đuổi; Linh Thỏ sẽ bỏ chạy.')});
    document.querySelector('[data-dev="spawn-three"]')!.addEventListener('click',()=>{this.facing='down';this.player.play('player_idle_down');this.spawnEnemy(this.player.x-24,this.player.y+45,'wolf');this.spawnEnemy(this.player.x,this.player.y+52,'wolf');this.spawnEnemy(this.player.x+24,this.player.y+45,'wolf');toast('Đã tạo ba sói thử nghiệm trong tầm kiếm.')});
    document.querySelector('[data-dev="fill-xp"]')!.addEventListener('click',()=>{state.xp=cultivationRequired(state.realmIndex,state.realmLevel);refresh();persist();toast('Tu vi thử nghiệm đã đạt ngưỡng.')});
    document.querySelector('[data-dev="set-qi1"]')!.addEventListener('click',()=>{state.realmIndex=0;state.realmLevel=1;state.xp=0;state.kills=0;state.questDone=false;state.stones=0;const stats=currentStats();state.hp=stats.hpMax;state.mp=stats.mpMax;refresh();persist();toast('Đã đặt save thử nghiệm về Luyện Khí tầng 1.')});
    document.querySelector('[data-dev="damage"]')!.addEventListener('click',()=>this.hurtPlayer(12));
    document.querySelector('[data-dev="clear"]')!.addEventListener('click',()=>{for(const enemy of this.enemies)enemy.dispose();this.enemies=[];toast('Đã dọn yêu thú thử nghiệm.')});
  }
}

new Phaser.Game({type:Phaser.AUTO,parent:'game',width:window.innerWidth,height:window.innerHeight,backgroundColor:'#17291e',pixelArt:true,roundPixels:true,antialias:false,physics:{default:'arcade',arcade:{debug:false}},scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[World]});
refresh();

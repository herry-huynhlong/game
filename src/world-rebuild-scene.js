import { CityScenery, cityPropFrame } from './world/CityScenery.js';
import { placeCityResidents } from './world/CityResidents.js';
import { PassageTraffic } from './world/PassageTraffic.js';
import { PROFESSION_BEHAVIORS, SPECIAL_DUTIES } from './dao/ProfessionBehaviorRegistry.ts';
import { WorkstationSlots } from './world/WorkstationSlots.js';
import { GroundOccupancy, groundFootprint } from './world/GroundOccupancy.js';
import { WorldTerrainAtlas } from './world/WorldTerrainAtlas.js';
import { WorldNpcAppearanceFleet } from './world/WorldNpcAppearanceFleet.js';
import { loadCombatMountAssets } from './world/CombatMountAssets.js';
import { loadCharacterAssets } from './world/CharacterAssetRegistry.js';
import { WorldCharacterPreview } from './world/WorldCharacterPreview.js';
import { LivingWorldPanel } from './world/LivingWorldPanel.js';
import Phaser from 'phaser';
import { createWorldUuid, loadWorldPopulation, WORLD_POPULATION_SAVE_KEY } from './world-rebuild-population.js';
import { AutonomousNPCSystem } from './dao/AutonomousNPCSystem.ts';
import { NPC_MODULAR_TEXTURES, NPC_STYLE_TEXTURES, ensureNPCModularAppearances, resolveNPCModularPart } from './dao/CharacterAppearance.ts';
import { cultivationStats } from './systems/CultivationSystem.ts';
import { damageForStrike } from './systems/CombatSystem.ts';
import { SaveGuard } from './dao/SaveGuard.ts';
import { PossessionSystem } from './dao/PossessionSystem.ts';
import { reportCityCombat, markCityIncidentAtScene, clearCityResponse } from './dao/CityLawSystem.ts';
import { ensureWorldRebuildEnvironment, tickWorldRebuildProfessionWork, damageWorldRebuildBuilding } from './dao/WorldRebuildProfessionSystem.ts';
import { ensureFauna, FAUNA_BEHAVIOR, hunterTolerance, FAUNA_SPECIES, FAUNA_ZONE_CAP, damageFauna, faunaCombatPower, resolveFaunaAttack, claimFaunaDrop, queueFaunaRespawn, spawnFaunaInZone, processFaunaRespawns } from './dao/FaunaSystem.ts';
import { WorldRiverFishSystem } from './dao/WorldRiverFishSystem.ts';
import { MinimapCamera } from './world/MinimapCamera.js';
import { isInWeaponArc, provisionWorldWeapons, setNpcWeapon, weaponAttackMode, weaponChoices, weaponForNpc } from './world/WeaponCombat.js';

import { WorldHeavenActions } from './world/WorldHeavenActions.js';
import { mountHeavenShop, mountSkillPanel, updateSkillStatus, syncRodVisual, rodTip } from './world/HeavenShopUI.js';
import { ROD, SKILLS, hasRod, itemName, rodEquipped } from './world/HeavenShop.js';

import { NpcSimulationScheduler } from './world/NpcSimulationScheduler.js';
import { WorldPerformancePanel } from './world/WorldPerformancePanel.js';

const CARDINAL_STEPS=[[1,0],[-1,0],[0,1],[0,-1]];
const FOOTPRINT=[[-8,-4],[8,-4],[-8,4],[8,4]];

const MAP_URL='/maps/world-rebuild-1b.tmj';
const WORLD=Object.freeze({width:224*32,height:144*32});
const LEGACY_NPC_RENDER=new URLSearchParams(location.search).get('legacyNpc')==='1';
const CHARACTER_RIG_PREVIEW=new URLSearchParams(location.search).get('characterRig')==='1';
const PAPERDOLL_PREVIEW=new URLSearchParams(location.search).get('paperDoll')==='1';
const PAPERDOLL_IDS=Array.from({length:24},(_,i)=>`P${String(i+1).padStart(2,'0')}`);
const PAPERDOLL_ROLE_POOLS=Object.freeze({commoner:['P01','P02','P03','P04'],low_disciple:['P05','P06','P07'],elder:['P08'],sect_leader:['P09'],merchant:['P10','P11'],tavern_staff:['P12'],city_guard:['P13','P14'],repair_worker:['P15'],hunter:['P16'],herb_gatherer:['P17'],quest_clerk:['P18'],independent_cultivator:['P19','P20','P21','P22','P23']});
const REGION_CENTERS=Object.freeze({city:{x:108*32,y:67*32},north:{x:111*32,y:20*32},east:{x:183*32,y:69*32},south:{x:111*32,y:119*32},forest:{x:48*32,y:79*32},'forest-outer':{x:55*32,y:69*32},'forest-middle':{x:36*32,y:80*32},'forest-deep':{x:8*32,y:94*32}});
const REGION_TITLES=Object.freeze({city:'Thanh Vân Thành · trung tâm',north:'Cổng Bắc · đèo núi',east:'Cổng Đông · thảo nguyên',south:'Cổng Nam · ngoại thành và tông môn',forest:'Cổng Tây · rừng yêu thú','forest-outer':'Rừng tây · rìa nguy hiểm thấp','forest-middle':'Rừng tây · nguy hiểm trung bình','forest-deep':'Rừng tây · vùng sâu nguy hiểm cao'});

export class RebuildWorldScene extends Phaser.Scene {
  constructor(){super('world-rebuild-1b');this.paperDollPreview=PAPERDOLL_PREVIEW;this.npcRenderTextures=new Map();this.collisionVisible=false;this.collisionRects=[];this.markers=[];this.dragState=null;this.lastWorldDragAt=0;this.keys=null;this.objectSprites=[];this.buildingSprites=new Map();this.resourceNodeSprites=new Map();this.faunaSprites=new Map();this.dropSprites=new Map();this.faunaTick=0;this.faunaRespawnTick=0;this.faunaZones=[];this.windSprites=[];this.windClock=0;this.npcSprites=new Map();this.modularVisuals=new Map();this.npcRoutes=new Map();this.weaponSprites=new Map();this.weaponAttackStates=new Map();this.weaponFxSprites=[];this.playerSkillCooldown=0;this.populationTick=0;this.populationSaveTick=0;this.populationAiCost=0;this.selectedNpcId=null;this.possessedNpcId=null;this.cameraFollowSuspended=false;this.cameraTween=null;this.lastExploreZoom=.85;this.minimap=null;this.selectedFaunaId=null;this.playerFacing='down';this.playerAttackCooldown=0;this.playerCombo=0;this.pathfindingCalls=0;this.collisionChecks=0;this.goalEvaluations=0;this.aiCostSamples=[];this.frameSamples=[];this.npcMotionStats=new Map();this.lastEcologyDebugAt=0;this.lastUpdateNow=0;}
  preload(){
    window.__worldBoot?.setPhase('assets','running');
    this.load.on('loaderror',file=>window.__worldBoot?.setPhase('assets','failed',`${file.key}: ${file.src}`));
    this.load.once('complete',()=>window.__worldBoot?.setPhase('assets','complete'));
    this.load.tilemapTiledJSON('rebuild-world-map',MAP_URL);
    this.load.image('city-palace','/assets/city-redesign/city-palace.png');
    this.load.image('courtyard-ground','/assets/city-redesign/courtyard-ground.png');
    this.load.json('courtyard-bounds','/assets/city-redesign/object-bounds.json');
    this.load.spritesheet('courtyard-objects','/assets/city-redesign/courtyard-objects.png',{frameWidth:192,frameHeight:176});
    if(!this.paperDollPreview&&(!LEGACY_NPC_RENDER||CHARACTER_RIG_PREVIEW)){loadCharacterAssets(this);loadCombatMountAssets(this);}
    this.load.spritesheet('rebuild-terrain','/assets/tilesets/gfx5b5_area_terrain.png',{frameWidth:32,frameHeight:32});
    this.load.spritesheet('rebuild-buildings','/assets/props/settlement_buildings.png',{frameWidth:192,frameHeight:192});
    this.load.spritesheet('rebuild-ancient-tree','/assets/props/ancient-tree-v2.png',{frameWidth:112,frameHeight:96});
    this.load.spritesheet('rebuild-bamboo','/assets/props/T02-bamboo-v2.png',{frameWidth:96,frameHeight:96});
    this.load.spritesheet('rebuild-rocks','/assets/tilesets/qingyun_rocks_v2.png',{frameWidth:64,frameHeight:64});
    this.load.spritesheet('rebuild-farmhouse','/assets/props/H01-farmhouse-v2.png',{frameWidth:144,frameHeight:120});
    for(const [gid,name] of [[400,'T03-mountain-pine'],[408,'T04-broadleaf'],[416,'T05-willow'],[424,'T06-monster-ancient']])this.load.spritesheet(`rebuild-${gid}`,`/assets/world-rebuild-1b2/${name}.png`,{frameWidth:96,frameHeight:112});
    for(const [gid,name] of [[432,'H02-city-home'],[433,'H03-market-shop'],[434,'H04-sect-dorm'],[435,'H05-wilderness-hut']])this.load.image(`rebuild-${gid}`,`/assets/world-rebuild-1b2/${name}.png`);
    this.load.spritesheet('rebuild-wall-kit','/assets/world-rebuild-1b2/Qingyun-wall-gate-kit.png',{frameWidth:64,frameHeight:64});
    this.load.spritesheet('rebuild-directional-gates','/assets/world-gates-4dir/directional-gates.png',{frameWidth:192,frameHeight:192});
    for (const [name,width,height] of [['rod-grip',64,64],['float',12,12],['projectiles',48,48],['guard',48,48]]) {
      this.load.spritesheet('heaven-'+name,'/assets/heaven/'+name+'.png',{frameWidth:width,frameHeight:height});
    }
    this.load.spritesheet('weapon-overlay-iron_dao','/assets/weapons/dao-grip.png',{frameWidth:32,frameHeight:40});
    this.load.spritesheet('weapon-overlay-iron_sword','/assets/weapons/jian-grip.png',{frameWidth:32,frameHeight:40});
    for(const [key,file] of [['weapon-fx-dao','fx-dao'],['weapon-fx-thrust','fx-thrust'],['weapon-fx-jian','fx-jian']])this.load.spritesheet(key,`/assets/weapons/${file}.png`,{frameWidth:48,frameHeight:48});
    this.load.spritesheet('city-structures','/assets/world-city-1/city-structures.png',{frameWidth:320,frameHeight:256});
    this.load.spritesheet('market-stalls','/assets/world-city-1/market-stalls.png',{frameWidth:128,frameHeight:112});
    for(const key of NPC_STYLE_TEXTURES)this.load.spritesheet(key,`/assets/characters/${key}.png`,{frameWidth:32,frameHeight:40});
    for(const key of NPC_MODULAR_TEXTURES)this.load.spritesheet(`modular-${key}`,`/assets/npc-modular/${key}.png`,{frameWidth:32,frameHeight:40});
    if(this.paperDollPreview){this.load.json('npc-paperdoll-presets','/assets/npc-paperdoll-lab/presets/registry.json');for(const id of PAPERDOLL_IDS)this.load.spritesheet(id,`/assets/npc-paperdoll-lab/presets/${id.toLowerCase()}.png`,{frameWidth:32,frameHeight:40});}
    this.load.image('rebuild-water-tiles','/assets/tilesets/gfx5b5_water_tiles.png');
    this.load.spritesheet('rebuild-water-motion','/assets/effects/gfx5b5_water_motion.png',{frameWidth:64,frameHeight:64});
    this.load.spritesheet('rebuild-water-props','/assets/props/gfx5b5_area_props.png',{frameWidth:128,frameHeight:128});
    this.load.image('rebuild-herb-node','/assets/effects/mandate_herb.png');
    for(const id of ['deer','scorpion','snake'])this.load.spritesheet(`fauna-${id}`,`/assets/fauna/land/${id}/${id}.png`,{frameWidth:32,frameHeight:32});
    this.load.spritesheet('world-fish-common','/assets/fauna/fish/FishCommon.png',{frameWidth:40,frameHeight:32});
    this.load.spritesheet('world-fish-spirit','/assets/fauna/fish/FishSpirit.png',{frameWidth:40,frameHeight:32});
  }
  create(){
    window.__worldBoot?.setPhase('map','running');
    this.map=this.make.tilemap({key:'rebuild-world-map'});
    const sets=[
      this.map.addTilesetImage('GFX5B5AreaTerrain','rebuild-terrain',32,32,0,0),
      this.map.addTilesetImage('SettlementBuildings','rebuild-buildings',192,192,0,0),
      this.map.addTilesetImage('AncientTree','rebuild-ancient-tree',112,96,0,0),
      this.map.addTilesetImage('T02Bamboo','rebuild-bamboo',96,96,0,0),
      this.map.addTilesetImage('QingyunRocksV2','rebuild-rocks',64,64,0,0),
      this.map.addTilesetImage('H01Farmhouse','rebuild-farmhouse',144,120,0,0),
      this.map.addTilesetImage('GFX5B5WaterTiles','rebuild-water-tiles',32,32,0,0),
      this.map.addTilesetImage('QingyunAreaProps','rebuild-water-props',128,128,0,0),
      this.map.addTilesetImage('QingyunDirectionalCityGates','rebuild-directional-gates',192,192,0,0),
      this.map.addTilesetImage('WorldCityStructures','city-structures',320,256,0,0),
      this.map.addTilesetImage('WorldMarketStalls','market-stalls',128,112,0,0),
      ...[['T03-mountain-pine',400,96,112],['T04-broadleaf',408,96,112],['T05-willow',416,96,112],['T06-monster-ancient',424,96,112],['H02-city-home',432,160,144],['H03-market-shop',433,160,144],['H04-sect-dorm',434,160,144],['H05-wilderness-hut',435,160,144]].map(([name,gid,w,h])=>this.map.addTilesetImage(name,`rebuild-${gid}`,w,h,0,0)),
      this.map.addTilesetImage('QingyunWallGateKit','rebuild-wall-kit',64,64,0,0),
      this.map.addTilesetImage('QingyunCourtyardGround','courtyard-ground',32,32,0,0),
      this.map.addTilesetImage('QingyunPalace','city-palace',320,256,0,0),
      this.map.addTilesetImage('QingyunCourtyardObjects','courtyard-objects',192,176,0,0),
    ].filter(Boolean);
    if(sets.length!==23)throw new Error(`Map tileset load mismatch (${sets.length}/23)`);
    const terrainLayers=['GroundBase','Water','Shore','GroundDetails','TerrainTransitions','Roads','CityEdges','Cliffs']
      .map((name,depth)=>this.map.createLayer(name,sets,0,0)?.setDepth(depth)).filter(Boolean);
    this.terrainCache=WorldTerrainAtlas.create(this,terrainLayers,sets);
    this.worldWidth=this.map.widthInPixels;this.worldHeight=this.map.heightInPixels;this.physics.world.setBounds(0,0,this.worldWidth,this.worldHeight);
    this.cameras.main.setBounds(0,0,this.worldWidth,this.worldHeight).setZoom(.72).setRoundPixels(true);
    const cityBounds=this.cache.json.get('courtyard-bounds');
    const cityTexture=this.textures.get('courtyard-objects');
    cityBounds.forEach(([left,top,right,bottom],frame)=>{
      cityTexture.add(cityPropFrame(frame),0,(frame%8)*192+left,Math.floor(frame/8)*176+top,right-left,bottom-top);
    });
    const scenery=['StaticDecor','Buildings','MarketDecor','Roofs'].flatMap(name=>this.map.getObjectLayer(name)?.objects??[]);
    this.objectSprites=scenery.map(obj=>{
      const gid=obj.gid,entry=gid>=257&&gid<297?['rebuild-buildings',gid-257]:gid>=297&&gid<312?['rebuild-ancient-tree',gid-297]:gid>=312&&gid<320?['rebuild-bamboo',gid-312]:gid>=320&&gid<330?['rebuild-rocks',gid-320]:gid===330?['rebuild-farmhouse',0]:gid>=400&&gid<408?['rebuild-400',gid-400]:gid>=408&&gid<416?['rebuild-408',gid-408]:gid>=416&&gid<424?['rebuild-416',gid-416]:gid>=424&&gid<432?['rebuild-424',gid-424]:gid>=432&&gid<=435?[`rebuild-${gid}`,0]:gid>=436&&gid<444?['rebuild-wall-kit',gid-436]:gid>=508&&gid<516?['rebuild-water-props',gid-508]:gid>=516&&gid<520?['rebuild-directional-gates',gid-516]:gid>=520&&gid<524?['city-structures',gid-520]:gid>=524&&gid<531?['market-stalls',gid-524]:gid>=640&&gid<672?['courtyard-objects',gid-640]:gid===676?['city-palace',undefined]:null;
      if(!entry)throw new Error(`Unknown Tiled art GID ${gid} (${obj.name})`);
      let x=obj.x+obj.width/2,y=obj.y-obj.height/2,width=obj.width,height=obj.height,frame=entry[1];
      if(entry[0]==='courtyard-objects'){
        const [left,top,right,bottom]=cityBounds[frame],sx=width/192,sy=height/176;
        width=(right-left)*sx;height=(bottom-top)*sy;
        x=obj.x+left*sx+width/2;y=obj.y-obj.height+top*sy+height/2;
        frame=cityPropFrame(frame);
      }
      const sprite=this.add.sprite(x,y,entry[0],frame).setOrigin(.5,.5).setDisplaySize(width,height).setRotation(Phaser.Math.DegToRad(obj.rotation??0)).setDepth(this.prop(obj,'depthY')??((obj.y??0)+10)).setName(obj.name||`prop-${obj.id}`);
      sprite.setData('tiledObject',obj);const buildingId=this.prop(obj,'buildingId');if(buildingId)this.buildingSprites.set(buildingId,sprite);
      let frames=null,durations=null;
      if(gid>=400&&gid<432){const speciesStart=gid<408?400:gid<416?408:gid<424?416:424;frames=Array.from({length:8},(_,i)=>i);durations=speciesStart===400?[160,160,180,160,160,180,160,160]:speciesStart===408?[170,180,170,170,180,170,170,180]:speciesStart===416?[200,200,220,200,200,220,200,200]:[220,220,240,220,220,240,220,220];sprite.setData('windKind',`T${String(3+Math.floor((speciesStart-400)/8)).padStart(2,'0')}`)}
      else if(gid>=308&&gid<312){frames=[11,12,13,14];durations=[250,250,250,250];sprite.setData('windKind','ancient-v2')}
      else if(gid>=312&&gid<320){frames=Array.from({length:8},(_,i)=>i);durations=Array(8).fill(200);sprite.setData('windKind','bamboo-T02')}
      if(frames){const objectName=obj.name||String(obj.id),windPeriod=durations.reduce((a,b)=>a+b,0);sprite.setData('windFrames',frames);sprite.setData('windDurations',durations);sprite.setData('windPeriod',windPeriod);sprite.setData('windPhase',this.stableHash(objectName)%windPeriod);sprite.setData('windFrame',-1);this.windSprites.push(sprite)}
      return sprite;
    });
    this.cityScenery=new CityScenery(this,this.objectSprites);
    this.flowSprites=(this.map.getObjectLayer('FlowEffects')?.objects??[]).map(obj=>{const phase=Number(this.prop(obj,'phase')??0),period=Number(this.prop(obj,'period')??150);const sprite=this.add.sprite(obj.x??0,obj.y??0,'rebuild-water-motion',8+phase).setDepth((obj.y??0)+12).setAlpha(.68);sprite.setData('flowPhase',phase);sprite.setData('flowPeriod',period);sprite.setData('flowFrame',-1);return sprite});
    this.sceneryBounds=[...this.objectSprites,...this.flowSprites].map(sprite=>{
      const radius=Math.hypot(sprite.displayWidth,sprite.displayHeight)/2;
      return {sprite,left:sprite.x-radius,right:sprite.x+radius,top:sprite.y-radius,bottom:sprite.y+radius};
    });
    this.updateWindFrames();
    this.collisionRects=(this.map.getObjectLayer('Collision')?.objects??[]).map(o=>({x:o.x,y:o.y,width:o.width,height:o.height,name:o.name,kind:this.prop(o,'kind')}));
    this.markers=(this.map.getObjectLayer('NavigationMarkers')?.objects??[]).map(o=>({id:this.prop(o,'markerId'),x:o.x,y:o.y,region:this.prop(o,'regionId')}));
    this.roadLayer=this.map.layers.find(layer=>layer.name==='Roads');
    this.navCell=16;
    this.navCols=this.map.widthInPixels/this.navCell;
    this.navRows=this.map.heightInPixels/this.navCell;
    this.navBlocked=new Uint8Array(this.navCols*this.navRows);
    this.collisionByCell=new Map();
    for(const r of this.collisionRects){
      for(let y=Math.max(0,Math.floor(r.y/this.navCell));y<Math.min(this.navRows,Math.ceil((r.y+r.height)/this.navCell));y++){
        for(let x=Math.max(0,Math.floor(r.x/this.navCell));x<Math.min(this.navCols,Math.ceil((r.x+r.width)/this.navCell));x++){
          const cell=y*this.navCols+x;
          this.navBlocked[cell]=1;
          if(!this.collisionByCell.has(cell))this.collisionByCell.set(cell,[]);
          this.collisionByCell.get(cell).push(r);
        }
      }
    }
    this.buildNavigationComponents();
    this.passageTraffic=new PassageTraffic(['north','south','east','west'].flatMap(direction=>{
      const id='gate-'+direction,a=this.markers.find(m=>m.id===id),b=this.markers.find(m=>m.id===id+'-outside');
      if(!a||!b)return [];
      const horizontal=direction==='east'||direction==='west';
      const cross=[0,8,-8,16,-16,24,-24,32,-32].find(offset=>{
        return [-28,-14,0,14,28].every(along=>{
          const x=(a.x+b.x)/2+(horizontal?along:offset),y=(a.y+b.y)/2+(horizontal?offset:along);
          return this.footprintTerrainOpen(x,y,8,4);
        });
      });
      if(cross===undefined)return [];
      const shifted=p=>({x:p.x+(horizontal?0:cross),y:p.y+(horizontal?cross:0)});
      return [{id,a:shifted(a),b:shifted(b)}];
    }));
    window.__worldBoot?.setPhase('map','complete');window.__worldBoot?.setPhase('population','running');
    if(this.paperDollPreview)this.paperDollRegistry=this.cache.json.get('npc-paperdoll-presets');
    try{this.initPopulation();window.__worldBoot?.setPhase('population','complete')}catch(error){window.__worldBoot?.setPhase('population','failed',error.stack||error.message);throw error}
    window.__worldBoot?.setPhase('ecosystem','running');
    this.groundOccupancy=new GroundOccupancy((x,y,hw,hh,body)=>this.footprintTerrainOpen(x,y,hw,hh,body.category===2));
    this.syncGroundOccupancy();
    this.workstations=new WorkstationSlots((npc,x,y)=>this.groundPositionOpen(npc,x,y),(a,b)=>this.canReachPoint(a,b));
    this.initFauna();
    this.syncGroundOccupancy();
    this.scheduler=new NpcSimulationScheduler(this.populationWorld.npcs);
    if(!this.paperDollPreview&&!LEGACY_NPC_RENDER&&this.textures.exists('rig-variants'))this.npcAppearanceFleet=new WorldNpcAppearanceFleet(this);
    this.performancePanel=new WorldPerformancePanel(this);
    const flush=()=>{this.performancePanel.previousFrame=undefined;if(document.hidden)this.persistPopulation()};
    document.addEventListener('visibilitychange',flush);
    const flushPending=()=>{if(this.backgroundSave)this.persistPopulation()};
    window.addEventListener('pagehide',flushPending);
    this.events.once('shutdown',()=>{
      document.removeEventListener('visibilitychange',flush);
      window.removeEventListener('pagehide',flushPending);
      this.cancelBackgroundSave();
      this.performancePanel.destroy();
    });
    this.initRiverFish();
    this.heavenActions=new WorldHeavenActions(this);
    mountHeavenShop(this);
    this.input.on('pointermove',()=>{this.lastAttackPointer=true});
    this.minimap=new MinimapCamera(this,this.map);
    this.initEcologyDebug();
    this.createResourceNodeSprites();
    window.__worldBoot?.setPhase('ecosystem','complete');
    this.environmentGraphics=this.add.graphics().setDepth(10000);
    this.refreshProfessionVisuals();
    this.livingWorldPanel=new LivingWorldPanel(this);
    this.collisionGraphics=this.add.graphics().setDepth(20000).setVisible(false);this.groundDebugGraphics=this.add.graphics().setDepth(20001).setVisible(false);this.drawCollisionDebug();
    this.input.keyboard?.addCapture(['SPACE']);this.keys=this.input.keyboard?.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,PLUS,MINUS,C,ONE,TWO,THREE,FOUR,J,K,E,F,M,R,Q,ESC,SHIFT')??{};
    for(const key of ['J','K','F','M','R','Q']) {
      this.keys[key]?.on('down',(_key,event)=>{
        if(event.repeat||event.ctrlKey||event.altKey||event.metaKey||event.target?.matches?.('input,textarea,[contenteditable]'))return;
        this.handlePossessedAction(key);
      });
    }
    this.bindCameraControls();
    const initial=new URLSearchParams(location.search).get('region');this.gotoRegion(REGION_CENTERS[initial]?initial:'city',false);
    this.initPossessionHud();this.restorePossession();
    if(this.characterRigPreview&&!this.possessedNpcId){
      this.selectNPC(this.characterRigPreview.npc.id);
      const {npc}=this.characterRigPreview;
      this.navigateCameraTo(npc.x,npc.y,'character-preview',true,1.25);
    }
    window.__worldRebuild={
      ready:()=>this.sys.isActive()&&this.map?.width===224&&this.map?.height===144&&this.objectSprites.length===scenery.length,
      getState:()=>this.getState(),gotoRegion:(id)=>this.gotoRegion(id),setZoom:(zoom)=>this.setZoom(zoom),getMinimapState:()=>this.getMinimapState(),
      setCollisionVisible:(visible)=>this.setCollisionVisible(visible),canNavigate:(a,b)=>this.canNavigate(a,b),findNavigationPath:(a,b)=>this.findNavigationPath(a,b),
      gotoMarker:(id,zoom=.95)=>this.gotoMarker(id,zoom),walkDebugPath:(a,b)=>this.walkDebugPath(a,b),
      getPopulationState:()=>this.getPopulationState(),selectNPC:id=>this.selectNPC(id),getPossessionState:()=>this.getPossessionState(),
      getProfessionState:()=>this.getProfessionState(),damageBuilding:(id,eventId,damage,realm=0)=>this.damageBuilding(id,eventId,damage,realm),
      getFaunaState:()=>this.getFaunaState(),
      getPerformance:()=>this.performancePanel.snapshot(),getGroundDiagnostics:()=>this.getGroundDiagnostics(),
      getNpcAppearanceReport:()=>this.npcAppearanceFleet?.report()??{legacy:this.populationWorld.npcs.length},
      getWeaponState:()=>this.getWeaponState(),equipPossessedWeapon:id=>this.equipPossessedWeapon(id),attackTest:new URLSearchParams(location.search).has('testMode')?(targetId,skill=false)=>this.performPossessedAttack(targetId,skill):undefined,
      getModularAppearanceState:()=>this.getModularAppearanceState(),getPaperDollAppearanceState:()=>this.getPaperDollAppearanceState(),
      getEcologyState:()=>this.getEcologyState(),
      gotoHabitat:id=>this.gotoHabitat(id),
      gotoFauna:id=>{const f=this.populationWorld.environment.fauna.find(x=>x.id===id);if(!f)return false;this.cameras.main.centerOn(f.x,f.y);this.setZoom(.95);this.refreshFaunaVisibility();return true},
      reportCombat:(attackerId,victimId,damage,options={})=>this.reportCombat(attackerId,victimId,damage,options),
      pan:(dx,dy)=>{this.cameras.main.scrollX+=dx;this.cameras.main.scrollY+=dy;this.clampCamera()},
    };
    window.__worldBoot?.setPhase('ready','complete',`108 NPC; ${this.objectSprites.length} cảnh vật`);
    if(new URLSearchParams(location.search).has('testMode')){window.__worldRebuild.stepProfessionMinutes=minutes=>this.stepProfessionMinutes(minutes);window.__worldRebuild.refreshTestUI=()=>{this.refreshProfessionVisuals();this.renderPopulationDebug()};window.__worldRebuild.testTickFauna=seconds=>{for(let i=0;i<Math.max(1,Math.floor(seconds));i++){this.populationWorld.clock.minute++;this.tickFauna(1000)}return this.getFaunaState()};window.__worldRebuild.testStartHunterHunt=(hunterId,faunaId)=>{const h=this.populationWorld.npcs.find(n=>n.id===hunterId&&n.alive),f=this.populationWorld.environment.fauna.find(x=>x.id===faunaId&&x.alive);if(!h||!f||h.populationRole!=='hunter')return false;for(const other of this.populationWorld.npcs)if(other.id!==h.id&&other.faunaHuntTargetId===f.id)other.faunaHuntTargetId=undefined;h.faunaHuntTargetId=f.id;h.actionTarget={x:f.x,y:f.y};h.goalAction='fight';this.npcRoutes.delete(h.id);return true};window.__worldRebuild.endPossessionForTest=()=>this.endPossession('Kết thúc kiểm tra chiến đấu.');window.__worldRebuild.resetWeaponCooldownForTest=()=>{this.playerAttackCooldown=0;this.playerSkillCooldown=0};window.__worldRebuild.prepareWeaponCombatTest=(npcId,faunaId)=>{const npc=this.populationWorld.npcs.find(n=>n.id===npcId&&n.alive),fauna=this.populationWorld.environment.fauna.find(f=>f.id===faunaId&&f.alive),sprite=npc&&this.npcSprites.get(npc.id),beast=fauna&&this.faunaSprites.get(fauna.id);if(!npc||!fauna||!sprite||!beast||!weaponForNpc(npc))return{ok:false,reason:'test-actors-unavailable'};const offsets=[[-34,0],[34,0],[0,-34],[0,34]],point=offsets.map(([x,y])=>({x:fauna.x+x,y:fauna.y})).find(p=>this.canOccupy(p.x,p.y)&&Math.hypot(p.x-fauna.x,p.y-fauna.y)<=52&&this.clearFaunaLine({x:p.x,y:p.y},fauna));if(!point)return{ok:false,reason:'no-clear-adjacent-cell'};npc.x=point.x;npc.y=point.y;npc.action='idle';npc.faunaHuntTargetId=undefined;npc.actionTarget=null;this.npcRoutes.delete(npc.id);sprite.setPosition(point.x,point.y).setDepth(point.y).play(`${this.npcTextureFor(npc)}_idle_right`,true);fauna.x=point.x<fauna.x?point.x+34:point.x>fauna.x?point.x-34:point.x;fauna.y=point.y;beast.setPosition(fauna.x,fauna.y).setDepth(fauna.y);this.selectedFaunaId=fauna.id;this.selectNPC(npc.id);this.beginPossession();this.persistPopulation();this.syncWeaponVisuals();this.cameras.main.centerOn(npc.x,npc.y);this.setZoom(1.4);return{ok:this.possessedNpcId===npc.id,npcId:npc.id,faunaId:fauna.id,weapon:weaponForNpc(npc)?.id,npc:{x:npc.x,y:npc.y},fauna:{x:fauna.x,y:fauna.y},distance:Math.hypot(npc.x-fauna.x,npc.y-fauna.y)}}}
    this.scale.on('resize',()=>{this.clampCamera();this.minimap?.update(true)});
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.cameraInputAbort?.abort();this.minimap?.destroy();delete window.__worldRebuild;document.getElementById('possession-panel')?.remove();document.getElementById('ecology-debug')?.remove()});
    this.refreshHud();
  }
  prop(object,name){return object.properties?.find(p=>p.name===name)?.value}
  readOnlyPreviewStorage(){return{getItem:key=>localStorage.getItem(key),setItem:()=>{},removeItem:()=>{},clear:()=>{},key:index=>localStorage.key(index),get length(){return localStorage.length}}}
  requestBackgroundSave(){
    if(this.paperDollPreview||this.backgroundSave)return;
    const write=()=>{this.backgroundSave=null;this.persistPopulation()};
    if(typeof window.requestIdleCallback==='function'){
      this.backgroundSave={idle:true,id:window.requestIdleCallback(write,{timeout:800})};
    }else this.backgroundSave={idle:false,id:window.setTimeout(write,0)};
  }
  cancelBackgroundSave(){
    if(!this.backgroundSave)return;
    const {idle,id}=this.backgroundSave;
    if(idle)window.cancelIdleCallback(id);else window.clearTimeout(id);
    this.backgroundSave=null;
  }
  persistPopulation(){
    this.cancelBackgroundSave();
    if(this.paperDollPreview)return false;
    let ok=false;
    try{const started=performance.now();this.riverFishSystem?.flushSave();ok=this.populationSaveGuard.write(JSON.stringify(this.populationWorld));this.performancePanel?.recordSave(ok,performance.now()-started)}catch(error){console.error('World save failed',error)}
    if(!ok){
      const status=document.getElementById('world-save-state');
      if(status){status.textContent='Chưa lưu được · tải lại để tiếp tục';status.classList.add('warning')}
    }
    return ok;
  }
  paperDollTextureFor(npc){if(npc.authorityRole==='city_master')return'P24';if(npc.authorityRole==='sect_leader'||npc.populationRole==='sect_leader'||npc.sectRank==='chưởng_môn')return'P09';const pool=PAPERDOLL_ROLE_POOLS[npc.populationRole]??PAPERDOLL_ROLE_POOLS.independent_cultivator;return pool[this.stableHash(npc.id)%pool.length]}
  npcTextureFor(npc){return this.npcRenderTextures.get(npc.id)??npc.visualStyleId}
  getPaperDollAppearanceState(){const assignments=[...this.npcRenderTextures.entries()].map(([npcId,presetId])=>{const npc=this.populationWorld?.npcs.find(n=>n.id===npcId);return{npcId,presetId,populationRole:npc?.populationRole??null,authorityRole:npc?.authorityRole??null,profession:npc?.profession??null}});return{enabled:this.paperDollPreview,source:'URL ?paperDoll=1 only; no NPC/save fields changed',count:assignments.length,distinct:new Set(assignments.map(x=>x.presetId)).size,assignments}}
  initPopulation(){
    const loadStarted=performance.now();
    const loaded=loadWorldPopulation(this.paperDollPreview?this.readOnlyPreviewStorage():localStorage,this.map);this.populationLoadMs=performance.now()-loadStarted;this.populationWorld=loaded.world;this.populationFresh=loaded.fresh;if(!this.paperDollPreview)this.populationSaveGuard=new SaveGuard(localStorage,WORLD_POPULATION_SAVE_KEY);ensureWorldRebuildEnvironment(this.populationWorld,{layers:['Buildings','NavigationMarkers','ResourceNodes'].map(name=>({name,objects:this.map.getObjectLayer(name)?.objects??[]}))});
    const center=this.markers.find(m=>m.id==='city-center');
    this.cityMigratedResidents=placeCityResidents(this.populationWorld.npcs,this.collisionRects.filter(r=>r.kind==='city-redesign-solid'),
      (x,y,w,h)=>this.footprintTerrainOpen(x,y,w,h),(point)=>this.canReachPoint(center,point),this.markers,loaded.fresh);
    const provisioning=provisionWorldWeapons(this.populationWorld),partsChanged=ensureNPCModularAppearances(this.populationWorld.npcs);if(provisioning.changed||partsChanged)this.persistPopulation();
    this.initLivingTimber();
    this.populationSimulation=new AutonomousNPCSystem(this.populationWorld.npcs,event=>{const id=`population-event:${this.populationWorld.clock.day}:${this.populationWorld.clock.minute}:${event.type}:${event.actorId??''}:${this.populationWorld.events.length}`;this.populationWorld.events.push({id,...event});if(this.populationWorld.events.length>400)this.populationWorld.events.shift()},this.populationWorld);
    for(const n of this.populationWorld.npcs){if(n.populationRole==='hunter')n.populationDuty='Thợ săn tự chủ; săn con mồi trong vùng rồi thu nhặt chiến lợi phẩm';const texture=this.paperDollPreview?this.paperDollTextureFor(n):n.visualStyleId;if(this.paperDollPreview)this.npcRenderTextures.set(n.id,texture);if(!texture||!this.textures.exists(texture))throw new Error(`Missing NPC style texture for ${n.id}: ${texture}`);for(const [i,dir]of['down','up','left','right'].entries()){const idle=`${texture}_idle_${dir}`,walk=`${texture}_walk_${dir}`;if(!this.anims.exists(idle))this.anims.create({key:idle,frames:this.anims.generateFrameNumbers(texture,this.paperDollPreview?{start:i*4,end:i*4+3}:{start:i*8,end:i*8+3}),frameRate:4,repeat:-1});if(!this.anims.exists(walk))this.anims.create({key:walk,frames:this.anims.generateFrameNumbers(texture,this.paperDollPreview?{start:16+i*4,end:19+i*4}:{start:32+i*8,end:39+i*8}),frameRate:9,repeat:-1})}
      const sprite=this.add.sprite(n.x,n.y,texture,0).setOrigin(.5,1).setDepth(n.y).setName(n.id);sprite.setData('npcId',n.id);sprite.setInteractive({useHandCursor:true});sprite.on('pointerdown',pointer=>{this.pendingNpcClick={id:n.id,x:pointer.x,y:pointer.y}});sprite.on('pointerup',pointer=>{const pending=this.pendingNpcClick;this.pendingNpcClick=null;if(pending?.id===n.id&&!this.dragState?.moved&&performance.now()-this.lastWorldDragAt>140&&Math.hypot(pointer.x-pending.x,pointer.y-pending.y)<7)this.selectNPC(n.id)});sprite.play(`${texture}_idle_down`);this.npcSprites.set(n.id,sprite);
      for(const method of ['renderWebGL','renderCanvas']){
        const render=sprite[method];
        sprite[method]=function(renderer,source,camera,parentMatrix){
          if(!this.showingModularPose)render.call(this,renderer,source,camera,parentMatrix);
        };
      }
      if(!this.paperDollPreview)this.createNPCModularSprites(n,sprite);
    }
    this.npcLabel=this.add.text(0,0,'',{fontFamily:'serif',fontSize:'11px',color:'#f3e3bd',stroke:'#172018',strokeThickness:3}).setOrigin(.5,1).setVisible(false);
    if(CHARACTER_RIG_PREVIEW&&!this.paperDollPreview&&this.textures.exists('rig-variants')) {
      const npc=this.populationWorld.npcs.find(candidate=>candidate.alive&&candidate.populationRole==='low_disciple');
      if(npc) this.characterRigPreview=new WorldCharacterPreview(this,npc,this.npcSprites.get(npc.id));
    }
    this.syncWeaponVisuals();
    this.populationDebug=document.createElement('aside');this.populationDebug.id='population-debug';this.populationDebug.innerHTML='<button type="button" aria-expanded="false">108 cư dân · AI</button><section hidden></section>';
    this.populationDebug.style.cssText='position:fixed;right:14px;top:112px;z-index:20;color:#f1e7cc;font:12px/1.45 monospace;pointer-events:auto';this.populationDebug.hidden=true;
    const button=this.populationDebug.querySelector('button'),section=this.populationDebug.querySelector('section');button.style.cssText='padding:7px 10px;color:#f0dfb0;background:#111d18eF;border:1px solid #88764a;cursor:pointer';section.style.cssText='width:300px;max-height:48vh;overflow:auto;margin-top:5px;padding:9px;background:#111d18f2;border:1px solid #88764a';button.onclick=()=>{section.hidden=!section.hidden;button.setAttribute('aria-expanded',String(!section.hidden))};document.body.append(this.populationDebug);
    this.renderPopulationDebug();this.assignPopulationTargets();this.persistPopulation();
    if(loaded.fresh)window.dispatchEvent(new CustomEvent('qingyun-world-population',{detail:{key:WORLD_POPULATION_SAVE_KEY,count:this.populationWorld.npcs.length}}));
  }
  createNPCModularSprites(npc,actor){
    const parts=npc.visualParts;if(!parts)return;
    const wanted=[['outfit',parts.outfitId],['face',parts.faceId],['hair',parts.hairId],...parts.accessoryIds.map(id=>['accessory',id])];
    const sprites=[];
    for(const [kind,id] of wanted){const resolved=resolveNPCModularPart(id);if(!resolved||!this.textures.exists(resolved.textureKey))continue;const sprite=this.add.sprite(actor.x,actor.y,resolved.textureKey,resolved.frameOffset).setOrigin(.5,1).setDepth(actor.depth).setName(`part:${npc.id}:${id}`);sprite.setData('partKind',kind);sprite.setData('partId',id);sprite.setData('frameOffset',resolved.frameOffset);sprite.setData('lastModularFrame',-1);sprites.push(sprite)}
    this.modularVisuals.set(npc.id,sprites);
  }
  syncNPCModularVisuals(){
    if(!this.populationWorld||this.paperDollPreview)return;
    for(const npc of this.populationWorld.npcs){const actor=this.npcSprites.get(npc.id),parts=this.modularVisuals.get(npc.id);if(!actor||!parts?.length)continue;if(!actor.visible||!npc.alive||actor.alpha<.01){for(const overlay of parts)if(overlay.visible)overlay.setVisible(false);continue}const baseFrame=Number(actor.frame?.name)||0,row=Math.floor(baseFrame/8)%4,phase=actor.getData('moving')?Math.min(2,Math.floor((baseFrame%8)*3/8)):0,frame=row*3+phase;
      for(const overlay of parts){const frameIndex=overlay.getData('frameOffset')+frame;if(overlay.getData('lastModularFrame')!==frameIndex){overlay.setFrame(frameIndex);overlay.setData('lastModularFrame',frameIndex)}const kind=overlay.getData('partKind'),isBack=row===1,depth=actor.depth+(isBack&&['hair','accessory'].includes(kind)?-0.12:kind==='outfit'?.02:kind==='face'?.04:kind==='hair'?.06:.08);if(overlay.x!==actor.x||overlay.y!==actor.y)overlay.setPosition(actor.x,actor.y);if(overlay.depth!==depth)overlay.setDepth(depth);if(!overlay.visible)overlay.setVisible(true)}
    }
  }
  getModularAppearanceState(){const npcs=this.populationWorld?.npcs??[],parts=npcs.map(n=>n.visualParts).filter(Boolean),samples=npcs.slice(0,8).map(n=>{const actor=this.npcSprites.get(n.id);return{id:n.id,name:n.name,role:n.populationRole,visualStyleId:n.visualStyleId,visualParts:n.visualParts,baseFrame:Number(actor?.frame?.name??0),moving:Boolean(actor?.getData('moving')),layers:(this.modularVisuals.get(n.id)??[]).map(s=>({id:s.getData('partId'),frame:Number(s.frame?.name??0),visible:s.visible}))}}),frameTimes=this.frameSamples??[];return{population:npcs.length,assigned:parts.length,distinct:{hair:new Set(parts.map(p=>p.hairId)).size,face:new Set(parts.map(p=>p.faceId)).size,outfit:new Set(parts.map(p=>p.outfitId)).size,accessory:new Set(parts.flatMap(p=>p.accessoryIds)).size,completeLooks:new Set(parts.map(p=>JSON.stringify(p))).size},renderedLayers:[...this.modularVisuals.values()].reduce((n,a)=>n+a.length,0),visibleLayerSprites:[...this.modularVisuals.values()].flat().filter(s=>s.visible).length,frameTimeAverageMs:frameTimes.length?Number((frameTimes.reduce((a,b)=>a+b,0)/frameTimes.length).toFixed(2)):null,textures:NPC_MODULAR_TEXTURES.map(key=>({key,loaded:this.textures.exists(`modular-${key}`)})),sample:samples}}
  npcRoleTitle(npc){if(npc.authorityRole==='city_master')return'Thành chủ Thanh Vân Thành';if(npc.authorityRole==='sect_leader'||npc.populationRole==='sect_leader')return'Tông chủ Thanh Vân Tông';return({commoner:'Dân thường',low_disciple:'Đệ tử Thanh Vân Tông',elder:'Trưởng lão',merchant:'Thương nhân',tavern_staff:'Nhân viên tửu quán',city_guard:'Vệ binh Thanh Vân Thành',repair_worker:'Thợ sửa chữa',hunter:'Thợ săn',herb_gatherer:'Người hái dược',quest_clerk:'Thư lại nhiệm vụ',independent_cultivator:'Tán tu'})[npc.populationRole]??npc.populationDuty??npc.populationRole}
  selectNPC(id){const npc=this.populationWorld?.npcs.find(n=>n.id===id);if(!npc)return false;this.closeNpcGift?.();this.selectedNpcId=id;this.npcLabel.setVisible(true).setDepth(npc.y+10).setPosition(npc.x,npc.y-48).setText(`${npc.name} · ${this.npcRoleTitle(npc)}`);if(!this.possessedNpcId)this.cameras.main.centerOn(npc.x,npc.y);for(const drawer of ['world-map-menu','world-roster-panel','world-dev-menu'])document.getElementById(drawer).hidden=true;this.renderPossessionHud();this.refreshRoster();this.refreshHud();return true}
  refreshRoster(){const list=document.getElementById('roster-list');if(!list||!this.populationWorld)return;const query=(document.getElementById('roster-search')?.value??'').trim().toLocaleLowerCase('vi'),npcs=this.populationWorld.npcs.filter(n=>n.alive&&(!query||`${n.name} ${n.populationDuty??''} ${n.populationRole} ${n.profession}`.toLocaleLowerCase('vi').includes(query)));document.getElementById('roster-count').textContent=npcs.length+' cư dân';list.innerHTML=npcs.slice(0,108).map(n=>`<button class="roster-row" data-roster-npc="${n.id}"><span><b>${n.name}</b><small>${this.npcRoleTitle(n)} · Cảnh ${n.realmIndex}</small></span><i>${n.action??'idle'}</i></button>`).join('');list.querySelectorAll('[data-roster-npc]').forEach(button=>button.onclick=()=>this.selectNPC(button.dataset.rosterNpc))}
  toggleDrawer(id){for(const other of ['world-map-menu','world-roster-panel','world-dev-menu']){const panel=document.getElementById(other);if(panel)panel.hidden=other===id?!panel.hidden:true}this.refreshRoster()}
  closeNpcCard(){if(this.possessedNpcId)return;this.closeNpcGift?.();this.selectedNpcId=null;this.npcLabel.setVisible(false);this.renderPossessionHud()}
  initPossessionHud(){const panel=document.createElement('aside');panel.id='possession-panel';panel.className='npc-card';panel.style.cssText='position:fixed;right:14px;bottom:70px;z-index:18;width:min(310px,calc(100vw - 20px));padding:11px;background:#111d18f2;border:1px solid #88764a;box-shadow:0 8px 24px #0008;color:#f1e7cc;font:12px/1.45 Georgia,serif;pointer-events:auto';const style=document.createElement('style');style.textContent='#possession-panel[hidden]{display:none}#possession-panel header{display:flex;justify-content:space-between;align-items:center;color:#f0dfb0;font-size:14px;border-bottom:1px solid #706642;padding-bottom:6px}#possession-panel header button{padding:1px 8px;font-size:17px}#possession-panel .npc-card-body{display:flex;align-items:center;gap:9px;padding:9px 0}#possession-panel .npc-card-body>div{min-width:0}#possession-panel .npc-card-body b,#possession-panel small{display:block}#possession-panel .npc-card-body small{color:#bdc5b0;margin-top:2px}#possession-panel .npc-action{color:#d8bd79!important}#possession-panel .npc-portrait{width:42px;height:52px;overflow:hidden;image-rendering:pixelated;background:#243329;border:1px solid #5f6046;flex:0 0 auto}#possession-panel .npc-portrait img{image-rendering:pixelated}#possession-panel .npc-card-body.compact .npc-portrait{width:32px;height:40px}#possession-panel .npc-card-body.compact .npc-portrait img{width:256px!important;height:1440px!important}#possession-panel .bar{height:5px;background:#422e2a;margin-top:5px!important}#possession-panel .bar i{display:block;height:100%;background:#b94f47}#possession-panel .gold-button{width:100%;color:#f0dfb0;background:#394d34;border:1px solid #9d8751;padding:8px}#possession-panel select{width:100%;padding:6px;color:#eee;background:#1b2b22;border:1px solid #6a704f}#possession-panel .hud-detail,#possession-panel .hud-controls{margin-top:6px;color:#bdc5b0}#possession-panel details{margin-top:6px;padding:5px;background:#1b2b22}';document.head.append(style);document.body.append(panel);this.possessionPanel=panel;this.renderPossessionHud()}
  restorePossession(){const session=this.populationWorld?.heaven?.possession;if(!session)return;const npc=this.populationWorld.npcs.find(n=>n.id===session.npcId&&n.alive&&!n.ascended);if(!npc){PossessionSystem.end(this.populationWorld.heaven);this.persistPopulation();return}this.possessedNpcId=npc.id;this.selectedNpcId=npc.id;this.cameraFollowSuspended=false;this.cameras.main.centerOn(npc.x,npc.y);this.worldPopulationToast(`Đã khôi phục nhập thân ${npc.name} sau khi tải lại.`)}
  getPossessionState(){const npc=this.populationWorld?.npcs.find(n=>n.id===this.possessedNpcId);return{active:Boolean(npc),npcId:npc?.id??null,name:npc?.name??null,hp:npc?.hp??null,x:npc?.x??null,y:npc?.y??null,realmIndex:npc?.realmIndex??null,inventory:npc?.inventory?.map(i=>({...i}))??[],divinePower:this.populationWorld?.heaven?.divinePower??0,targetFaunaId:this.selectedFaunaId}}
  getWeaponState(){const npcs=this.populationWorld?.npcs??[];return{provisioning:this.populationWorld?.weaponProvisioning??null,armed:npcs.filter(n=>weaponForNpc(n)).map(n=>({id:n.id,name:n.name,role:n.populationRole,weapon:weaponForNpc(n).id,owned:n.inventory.filter(i=>weaponForNpc({...n,equippedWeapon:i.itemId})).map(i=>i.itemId)})),unarmed:npcs.filter(n=>n.alive&&!weaponForNpc(n)).length,activeNpcId:this.possessedNpcId}}
  equipPossessedWeapon(itemId){const npc=this.populationWorld?.npcs.find(n=>n.id===this.possessedNpcId&&n.alive);if((itemId==='training_crossbow'&&this.characterRigPreview?.npc!==npc)||this.characterRigPreview?.mount.locked||(itemId===ROD&&this.characterRigPreview?.mount.attached))return false;if(!npc||!(itemId===ROD ? hasRod(npc) && Boolean(npc.equippedWeapon=ROD) : setNpcWeapon(npc,itemId))){this.worldPopulationToast(itemId?'NPC không sở hữu vũ khí này.':'Không thể tháo vũ khí lúc này.');return false}this.heavenActions.stopFishing();this.syncWeaponVisuals();this.persistPopulation();this.possessionHudSignature='';this.refreshPossessionHud();this.worldPopulationToast(itemId?`Đã trang bị ${weaponForNpc(npc)?.name??itemName(itemId)}.`:'Đã tháo vũ khí.');return true}
  syncWeaponVisuals(){if(!this.populationWorld)return;for(const npc of this.populationWorld.npcs){const actor=this.npcSprites.get(npc.id);if(!actor)continue;const weapon=weaponForNpc(npc);let overlay=this.weaponSprites.get(npc.id);
    if(actor.alpha<.01||weapon?.kind==='crossbow'){if(overlay?.visible)overlay.setVisible(false);continue}
    if(rodEquipped(npc)){syncRodVisual(this,npc,actor,overlay);continue}
    if(overlay?.getData('weaponId')===ROD){overlay.destroy();this.weaponSprites.delete(npc.id);overlay=null}
    if(!weapon){if(overlay?.visible)overlay.setVisible(false);continue}const texture=weapon.kind==='dao'?'weapon-overlay-iron_dao':'weapon-overlay-iron_sword';if(!this.textures.exists(texture)){if(overlay?.visible)overlay.setVisible(false);continue}if(!overlay){overlay=this.add.sprite(actor.x,actor.y,texture,0).setOrigin(.5,1).setName(`weapon:${npc.id}`);overlay.setData('weaponId',weapon.id);this.weaponSprites.set(npc.id,overlay)}else if(overlay.getData('weaponId')!==weapon.id){overlay.setTexture(texture);overlay.setData('weaponId',weapon.id)}const visible=Boolean(npc.alive&&actor.visible);if(!visible){if(overlay.visible)overlay.setVisible(false);continue}const state=this.weaponAttackStates.get(npc.id);let frame;if(state&&this.time.now<state.until){const phase=Math.min(5,Math.floor((this.time.now-state.started)/55));frame=state.row*8+state.dirIndex*8+phase}else{if(state)this.weaponAttackStates.delete(npc.id);const actorFrame=Number(actor.frame?.name);frame=Number.isInteger(actorFrame)&&actorFrame>=0&&actorFrame<288?actorFrame:0}if(Number(overlay.frame?.name)!==frame)overlay.setFrame(frame);const direction=actor.anims.currentAnim?.key?.split('_').at(-1)??'down',depth=actor.depth+(direction==='up'||direction==='left'?-0.15:0.15);if(overlay.x!==actor.x||overlay.y!==actor.y)overlay.setPosition(actor.x,actor.y);if(overlay.depth!==depth)overlay.setDepth(depth);if(!overlay.visible)overlay.setVisible(true)}}
  rodTip(npc,direction){return rodTip(this,npc,direction)}
  playWeaponPose(npc,mode,direction){const dirs=['down','up','left','right'],dirIndex=Math.max(0,dirs.indexOf(direction));const row=mode.animation.startsWith('dao_slash')?12:mode.animation==='jian_thrust'?16:mode.animation==='jian_slash'?20:null;if(row===null)return;this.weaponAttackStates.set(npc.id,{row,dirIndex,started:this.time.now,until:this.time.now+390});this.syncWeaponVisuals()}
  spawnWeaponFx(kind,direction,x,y){const key=`weapon-fx-${kind}`;if(!this.textures.exists(key))return;const dirs=['down','up','left','right'],d=Math.max(0,dirs.indexOf(direction)),start=d*6,animKey=`${key}-${direction}`;if(!this.anims.exists(animKey))this.anims.create({key:animKey,frames:this.anims.generateFrameNumbers(key,{start,end:start+5}),frameRate:18,repeat:0});const fx=this.add.sprite(x,y,key,start).setOrigin(.5,.5).setDepth(y+15);this.weaponFxSprites.push(fx);fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE,()=>{this.weaponFxSprites=this.weaponFxSprites.filter(s=>s!==fx);fx.destroy()});fx.play(animKey)}
  performPossessedAttack(targetId=null,skill=false){const npc=this.populationWorld?.npcs.find(n=>n.id===this.possessedNpcId&&n.alive),actor=this.npcSprites.get(this.possessedNpcId);if(!npc||!actor)return{ok:false,reason:'no-possessed-actor'};if(skill){if(!weaponForNpc(npc)){this.worldPopulationToast('Cần trang bị đao hoặc kiếm để thi triển.');return{ok:false,reason:'weapon-required'}}if(!npc.skills?.includes('qi-sword')){this.worldPopulationToast('NPC này chưa học kiếm pháp.');return{ok:false,reason:'skill-locked'}}if(npc.mp<8){this.worldPopulationToast('Không đủ linh lực cho kỹ năng.');return{ok:false,reason:'low-mp'}}if(this.playerSkillCooldown>0){this.worldPopulationToast('Kỹ năng đang hồi chiêu.');return{ok:false,reason:'cooldown'}}}else if(this.playerAttackCooldown>0){this.worldPopulationToast('Đòn đánh đang hồi chiêu.');return{ok:false,reason:'cooldown'}}
    const candidateId=targetId??(this.selectedNpcId&&this.selectedNpcId!==npc.id?this.selectedNpcId:this.selectedFaunaId),victim=candidateId?this.populationWorld.npcs.find(n=>n.id===candidateId&&n.alive):null,fauna=candidateId?this.populationWorld.environment.fauna.find(f=>f.id===candidateId&&f.alive):null,target=victim??fauna;if(!target){this.worldPopulationToast('Chọn yêu thú hoặc NPC còn sống làm mục tiêu.');return{ok:false,reason:'no-target'}}
    const weapon=weaponForNpc(npc),combo=this.playerCombo%3+1,mode=weaponAttackMode(weapon,combo,skill),facing=this.facePoint(npc,target),fallback=weapon?mode:{animation:`unarmed_${combo}`,hit:'unarmed',range:54,width:54,multiplier:1};const range=fallback.range??54,width=fallback.width??54;if(!isInWeaponArc(npc.x,npc.y,target.x,target.y,facing,{...fallback,range,width})){this.worldPopulationToast('Mục tiêu nằm ngoài tầm hoặc lệch hướng đòn đánh.');return{ok:false,reason:'out-of-range'}}if(!this.clearFaunaLine(npc,target)){this.worldPopulationToast('Vật cản đang chắn đòn đánh.');return{ok:false,reason:'blocked'}}
    if(skill){npc.mp-=8;this.playerSkillCooldown=1.1}else this.playerAttackCooldown=weapon?.kind==='dao'?.52:.42;this.playerCombo=combo;actor.play(`${this.npcTextureFor(npc)}_idle_${facing}`,true);this.playWeaponPose(npc,fallback,facing);const fxKind=weapon?.kind==='dao'?'dao':skill&&weapon?.kind==='jian'?'thrust':weapon?.kind==='jian'?'jian':'dao';this.spawnWeaponFx(fxKind,facing,(npc.x+target.x)/2,(npc.y+target.y)/2);actor.setTint(0xd5f4dc);this.time.delayedCall(100,()=>actor.clearTint());const stats=cultivationStats(npc),raw=damageForStrike(npc.realmIndex,combo,skill,stats.attack,fallback.multiplier??1);let result;
    if(victim){const victimStats=cultivationStats(victim),damage=Math.max(1,Math.floor(raw-victimStats.defense));result=this.reportCombat(npc.id,victim.id,damage,{eventId:`possessed-weapon:${createWorldUuid()}`});if(result.ok)this.spawnWeaponFx('jian',facing,victim.x,victim.y);this.worldPopulationToast(result.incident?'Luật thành: báo động vì tấn công NPC trái phép.':`Đã đánh ${victim.name} bằng ${weapon?.name??'tay không'} · ${damage} sát thương.`)}else{result=this.damageFaunaEntity(fauna.id,npc.id,raw,`possessed-weapon:${createWorldUuid()}`,range);if(result.ok){this.spawnWeaponFx('jian',facing,fauna.x,fauna.y);this.worldPopulationToast(result.fauna.alive?`Trúng ${FAUNA_SPECIES[fauna.species].name} bằng ${weapon?.name??'tay không'} · -${result.damage} HP.`:`${FAUNA_SPECIES[fauna.species].name} bị hạ · ${result.drops[0]?.itemId??'không có loot'}.`)}else this.worldPopulationToast('Đòn đánh hụt hoặc mục tiêu đã đổi trạng thái.')}
    this.refreshHud();return{ok:Boolean(result?.ok??result?.eventId),weapon:weapon?.id??null,damage:result?.damage??null,mode:fallback.animation,skill}}
  beginPossession(){document.getElementById("heaven-shop").hidden=true;const npc=this.populationWorld?.npcs.find(n=>n.id===this.selectedNpcId);if(!npc)return;const result=PossessionSystem.start(this.populationWorld.heaven,npc);if(!result.ok){this.worldPopulationToast(result.message);return}this.prePossessionFaunaTarget=npc.faunaHuntTargetId;this.possessedNpcId=npc.id;this.cameraFollowSuspended=false;this.selectedNpcId=npc.id;this.npcRoutes.delete(npc.id);this.cameras.main.centerOn(npc.x,npc.y);this.persistPopulation();this.worldPopulationToast(result.message);this.refreshHud()}
  endPossession(message='Đã rời nhập thân. NPC tiếp tục tự chủ từ vị trí hiện tại.'){if(!this.possessedNpcId)return;this.heavenActions.stopFishing();const npc=this.populationWorld.npcs.find(n=>n.id===this.possessedNpcId);PossessionSystem.end(this.populationWorld.heaven);this.possessedNpcId=null;this.cameraFollowSuspended=false;if(npc?.alive){npc.faunaHuntTargetId=this.prePossessionFaunaTarget;this.prePossessionFaunaTarget=null;npc.actionTarget={x:npc.x,y:npc.y};npc.goalAction='idle';npc.action='idle';npc.shortGoal='Trở lại nhịp sống tự chủ';npc.routeIndex=0;this.npcRoutes.delete(npc.id)}this.persistPopulation();this.worldPopulationToast(message);this.refreshHud()}
  returnCameraToPossessedActor(){if(!this.possessedNpcId)return false;const npc=this.populationWorld.npcs.find(n=>n.id===this.possessedNpcId);if(!npc)return false;this.cameraFollowSuspended=false;this.navigateCameraTo(npc.x,npc.y,'return');this.refreshHud();return true}
  selectFaunaTarget(id){const target=this.populationWorld.environment.fauna.find(f=>f.id===id&&f.alive);if(!target)return false;this.selectedFaunaId=id;const controller=this.populationWorld.npcs.find(n=>n.id===this.possessedNpcId&&n.alive);if(controller){controller.faunaHuntTargetId=id;controller.actionTarget={x:target.x,y:target.y};for(const hunter of this.populationWorld.npcs)if(hunter.id!==controller.id&&hunter.faunaHuntTargetId===id){hunter.faunaHuntTargetId=undefined;this.npcRoutes.delete(hunter.id)}}this.persistPopulation();this.refreshHud();return true}
  renderPossessionHud(){
    const panel=this.possessionPanel;if(!panel||!this.populationWorld)return;
    const selected=this.populationWorld.npcs.find(n=>n.id===this.selectedNpcId),active=this.populationWorld.npcs.find(n=>n.id===this.possessedNpcId),heaven=this.populationWorld.heaven;
    if(!active&&!selected){panel.hidden=true;panel.innerHTML='';return}panel.hidden=false;
    if(!active){
      const duty=this.npcRoleTitle(selected);
      const style=selected.visualStyleId,portrait=style&&this.textures.exists(style)?'<div class="npc-portrait" role="img" aria-label="Chân dung cư dân"><img alt="" src="/assets/characters/'+style+'.png" style="width:336px;height:1890px;max-width:none;display:block"></div>':'';
      const eligible=selected.alive&&!selected.ascended,disabled=!eligible||heaven.possession||heaven.divinePower<PossessionSystem.cost(selected);
      panel.innerHTML='<header><span>Hồ sơ cư dân</span><button id="npc-card-close" aria-label="Đóng">×</button></header><div class="npc-card-body">'+portrait+'<div><b>'+selected.name+'</b><small>'+duty+'</small><small>Cảnh giới '+selected.realmIndex+'/'+selected.realmLevel+' · HP '+Math.round(selected.hp)+'</small><small class="npc-action">'+(selected.shortGoal??selected.aiDecision?.reason??'Đang sinh hoạt')+'</small></div></div><div style="display:flex;gap:6px"><button id="npc-gift" class="gold-button" '+(!eligible?'disabled':'')+'>Ban tặng</button><button id="possess-start" class="gold-button" '+(disabled?'disabled':'')+'>Nhập thân · '+PossessionSystem.cost(selected)+' Thần Lực</button></div><button id="npc-life">Sinh hoạt</button> <a href="/npc-xianxia-editor.html?npc='+encodeURIComponent(selected.id)+'">Ngoại hình cư dân</a>';
      panel.querySelector('#npc-life').onclick=()=>this.livingWorldPanel.open('inspector',selected.id);panel.querySelector('#npc-gift').onclick=()=>this.openNpcGift(selected.id);panel.querySelector('#npc-card-close').onclick=()=>this.closeNpcCard();panel.querySelector('#possess-start').onclick=()=>this.beginPossession();return;
    }
     const stats=cultivationStats(active),liveFauna=this.populationWorld.environment.fauna.filter(f=>f.alive),target=this.populationWorld.environment.fauna.find(f=>f.id===this.selectedFaunaId),drop=(this.populationWorld.environment.drops??[]).find(d=>d.status==='ground'&&Math.hypot(active.x-d.x,active.y-d.y)<120),items=active.inventory.map(i=>itemName(i.itemId)+' ×'+i.count).join(' · ')||'Trống',style=active.visualStyleId,weapon=weaponForNpc(active),ownedWeapons=weaponChoices(active).filter(w=>w.kind!=='crossbow'||this.characterRigPreview?.npc===active),weaponOptions='<option value="">Tay không</option>'+(hasRod(active)?'<option value="'+ROD+'" '+(rodEquipped(active)?'selected':'')+'>Cần câu phổ thông</option>':'')+ownedWeapons.map(w=>'<option value="'+w.id+'" '+(w.id===weapon?.id?'selected':'')+'>'+w.name+' · '+(w.kind==='crossbow'?'bắn/nạp':w.kind==='dao'?'chém':'đâm/chém')+'</option>').join('');
    const portrait=style&&this.textures.exists(style)?'<div class="npc-portrait" role="img" aria-label="Chân dung cư dân"><img alt="" src="/assets/characters/'+style+'.png" style="width:336px;height:1890px;max-width:none;display:block"></div>':'';
    const faunaOptions=liveFauna.map(f=>'<option value="'+f.id+'" '+(f.id===target?.id?'selected':'')+'>'+FAUNA_SPECIES[f.species].name+'</option>').join('');
     panel.innerHTML='<header><span>Nhập thân · '+active.name+'</span><button id="possess-end" aria-label="Rời nhập thân">↗</button></header><div class="npc-card-body compact">'+portrait+'<div><b>Cảnh giới '+active.realmIndex+'/'+active.realmLevel+'</b><small>HP '+Math.max(0,Math.round(active.hp))+'/'+Math.round(stats.hpMax)+' · Thần lực '+Math.floor(heaven.divinePower)+'</small><small class="bar"><i style="width:'+Math.max(0,Math.min(100,active.hp/stats.hpMax*100))+'%"></i></small></div></div><label class="weapon-select">Vũ khí · '+(rodEquipped(active)?itemName(ROD):weapon?.name??'Chưa trang bị')+'<select id="equipment-weapon">'+weaponOptions+'</select></label><select id="possess-fauna" aria-label="Mục tiêu"><option value="">Chọn mục tiêu</option>'+faunaOptions+'</select><small class="hud-detail">Mục tiêu: '+(target?FAUNA_SPECIES[target.species].name+' · HP '+target.hp:'chưa chọn')+' · Rơi: '+(drop?drop.itemId+' ×'+drop.count:'không có')+'</small><details><summary>Túi đồ · '+active.inventory.reduce((n,i)=>n+i.count,0)+' món</summary><small>'+items+'</small></details><small class="hud-controls">WASD · J đánh · K võ kỹ · E nhặt · F câu · Esc rời'+(this.characterRigPreview?.npc===active?' · M gọi/lên/xuống Huyền Hổ · Q ngắm · R nạp nỏ':'')+'</small>';
     mountSkillPanel(this,panel,active);
     panel.querySelector('#possess-fauna').onchange=e=>e.target.value&&this.selectFaunaTarget(e.target.value);panel.querySelector('#equipment-weapon').onchange=e=>this.equipPossessedWeapon(e.target.value||null);panel.querySelector('#possess-end').onclick=()=>this.endPossession();
  }
  npcActivityReason(npc,distance){if(npc.pathBlocked)return'Pathfinding blocked; mục tiêu chưa tới được';if(distance>24)return`Đang di chuyển tới ${npc.shortGoal??npc.goalAction}`;if(npc.populationRole==='merchant')return`Trực sạp ${npc.stallId??''}; giao dịch chỉ dùng hàng tồn kho thật`;if(npc.populationRole==='city_guard'&&npc.goalAction==='patrol')return`Đứng gác/tuần tra điểm ${((npc.patrolIndex??0)+1)}/${npc.patrolPoints?.length??1}`;if(npc.goalAction==='cultivate')return`Tu luyện thật · tiến độ ${Math.floor(npc.actionProgress??0)}/60 phút`;if(npc.goalAction==='rest')return`Nghỉ phục hồi · mệt ${Math.round(npc.fatigue)} · AI xét lại ở phút tiếp theo`;if(npc.professionTask)return`${npc.professionTask.kind} · ${npc.professionTask.state} · ${npc.professionTask.lastReason??npc.professionTask.targetId}`;return npc.aiDecision?.reason??npc.populationDuty??`Hành động ${npc.action??'idle'} · mục tiêu ${npc.shortGoal??npc.goalAction??'chưa có'}`}
  trackNpcMotion(npc,sprite){const now=performance.now(),target=npc.actionTarget??npc.home??{x:npc.x,y:npc.y},distance=Math.hypot(sprite.x-target.x,sprite.y-target.y),prior=this.npcMotionStats.get(npc.id);let lastProgressAt=prior?.lastProgressAt??now;if(!prior||Math.hypot(sprite.x-prior.x,sprite.y-prior.y)>.5)lastProgressAt=now;const record={x:sprite.x,y:sprite.y,lastProgressAt,targetDistance:distance,noProgressMs:distance>28?Math.max(0,now-lastProgressAt):0,moving:Boolean(sprite.getData('moving')),pathBlocked:Boolean(npc.pathBlocked)};this.npcMotionStats.set(npc.id,record);return record}
  getPopulationState(){if(!this.populationWorld)return{total:0};const npcs=this.populationWorld.npcs,counts={};for(const n of npcs)counts[n.populationRole]=(counts[n.populationRole]??0)+1;const states={moving:0,working:0,cultivating:0,trading:0,mission:0,fighting:0,resting:0,patrolling:0,gathering:0,idle:0,stuck:0,noTarget:0};let visible=0,inCamera=0;const view=this.cameras.main.worldView,diagnosticRows=[];for(const n of npcs){const sprite=this.npcSprites.get(n.id),inside=Boolean(sprite&&sprite.x>=view.x&&sprite.x<=view.right&&sprite.y>=view.y&&sprite.y<=view.bottom),motion=sprite?this.trackNpcMotion(n,sprite):null,distance=motion?.targetDistance??Math.hypot(n.actionTarget?.x-n.x||0,n.actionTarget?.y-n.y||0),reason=this.npcActivityReason(n,distance);if(sprite?.visible)visible++;if(inside)inCamera++;if(motion?.moving)states.moving++;if(n.action==='work'||n.action==='farm')states.working++;if(n.action==='cultivate')states.cultivating++;if(n.action==='trade'||n.action==='shop')states.trading++;if(n.action==='mission'||n.action==='commission')states.mission++;if(n.action==='fight')states.fighting++;if(n.action==='rest')states.resting++;if(n.goalAction==='patrol'||n.goalAction==='guard')states.patrolling++;if(n.action==='gather')states.gathering++;if(!n.goalAction||n.goalAction==='idle')states.idle++;if(n.pathBlocked||(motion?.noProgressMs??0)>8000)states.stuck++;if(!n.actionTarget&&!n.home)states.noTarget++;if(n.alive&&inside&&(!motion?.moving||n.pathBlocked||(motion?.noProgressMs??0)>5000)&&diagnosticRows.length<12)diagnosticRows.push({id:n.id,name:n.name,role:n.populationRole,action:n.action,goalAction:n.goalAction,goal:n.shortGoal,reason,targetDistance:Math.round(distance),noProgressMs:Math.round(motion?.noProgressMs??0),pathBlocked:Boolean(n.pathBlocked),position:{x:Math.round(sprite.x),y:Math.round(sprite.y)},target:n.actionTarget??n.home})}const stuckExamples=npcs.filter(n=>n.alive&&(n.pathBlocked||(this.npcMotionStats.get(n.id)?.noProgressMs??0)>5000&&(this.npcMotionStats.get(n.id)?.targetDistance??Infinity)>32)).slice(0,12).map(n=>{const sprite=this.npcSprites.get(n.id),motion=this.npcMotionStats.get(n.id),distance=motion?.targetDistance??0,route=this.npcRoutes.get(n.id),target=n.actionTarget??n.home;return{id:n.id,name:n.name,role:n.populationRole,action:n.action,goal:n.shortGoal,reason:this.npcActivityReason(n,distance),targetDistance:Math.round(distance),noProgressMs:Math.round(motion?.noProgressMs??0),pathBlocked:Boolean(n.pathBlocked),position:{x:Math.round(sprite?.x??n.x),y:Math.round(sprite?.y??n.y)},target,routeIndex:n.routeIndex??0,routePoints:route?.points.length??0,nextWaypoint:route?.points[n.routeIndex??0]??null,startComponent:sprite?this.navComponentAt(sprite):0,targetComponent:target?this.navComponentAt(target):0}});const sorted=[...this.frameSamples].sort((a,b)=>a-b),p95=sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))]??0,frameAvg=sorted.length?sorted.reduce((a,b)=>a+b,0)/sorted.length:0,aiSorted=[...this.aiCostSamples].sort((a,b)=>a-b),lawSorted=[...(this.cityLawCostSamples??[])].sort((a,b)=>a-b),lawAvg=lawSorted.length?lawSorted.reduce((a,b)=>a+b,0)/lawSorted.length:0;return{total:npcs.length,alive:npcs.filter(n=>n.alive).length,visible,inCamera,counts,states,diagnostics:{stationaryExamples:diagnosticRows,stuckExamples,progressTracked:npcs.filter(n=>this.npcMotionStats.has(n.id)).length},aiCostMs:this.populationAiCost,aiCostP95Ms:aiSorted[Math.min(aiSorted.length-1,Math.floor(aiSorted.length*.95))]??0,cityLawCostMs:this.cityLawCostMs??0,cityLawCostP95Ms:lawSorted[Math.min(lawSorted.length-1,Math.floor(lawSorted.length*.95))]??0,cityLawCostAvgMs:lawAvg,fps:this.game.loop.actualFps,frameAvgMs:frameAvg,frameP95Ms:p95,pathfindingCalls:this.pathfindingCalls,collisionChecks:this.collisionChecks,goalEvaluations:this.goalEvaluations,saveKey:WORLD_POPULATION_SAVE_KEY,selected:this.populationWorld.npcs.find(n=>n.id===this.selectedNpcId)?(()=>{const n=this.populationWorld.npcs.find(n=>n.id===this.selectedNpcId),sprite=this.npcSprites.get(n.id),target=n.actionTarget??n.home,distance=sprite?Math.hypot(sprite.x-target.x,sprite.y-target.y):0,motion=this.npcMotionStats.get(n.id);return{id:n.id,name:n.name,role:n.populationRole,profession:n.profession,faction:n.faction,origin:n.aiProfile?.origin,personality:n.personality,realmIndex:n.realmIndex,realmLevel:n.realmLevel,hp:n.hp,needs:{hunger:n.hunger,fatigue:n.fatigue,mood:n.mood},goal:n.shortGoal,action:n.action,goalAction:n.goalAction,position:{x:sprite?.x,y:sprite?.y},target,distance:Math.round(distance),noProgressMs:Math.round(motion?.noProgressMs??0),pathBlocked:Boolean(n.pathBlocked),task:n.professionTask??null,reason:this.npcActivityReason(n,distance)}})():null}}
  getProfessionState(){const world=this.populationWorld;if(!world)return{};return{repairers:world.npcs.filter(n=>n.populationRole==='repair_worker').map(n=>{const commission=world.commissions?.find(c=>c.commissionId===n.assignedCommissionId||c.commissionId===n.professionTask?.targetId),building=world.environment?.objects.find(o=>o.id===commission?.targetId);return{id:n.id,x:n.x,y:n.y,action:n.action,actionProgress:n.actionProgress,target:n.actionTarget,jobId:commission?.commissionId??null,buildingId:building?.id??null,hp:building?.hp??null,maxHp:building?.maxHp??null,materials:world.settlement.materials,progress:commission?.progress??0,status:commission?.status??n.professionTask?.state??'seeking',reason:n.professionTask?.lastReason??null}}),herbGatherers:world.npcs.filter(n=>n.populationRole==='herb_gatherer').map(n=>({id:n.id,x:n.x,y:n.y,action:n.action,actionProgress:n.actionProgress,nodeId:n.assignedResourceNodeId??null,target:n.actionTarget,nodeRemaining:world.environment?.resourceNodes?.find(r=>r.id===n.assignedResourceNodeId)?.amount??null,inventory:structuredClone(n.inventory),goal:n.shortGoal,status:n.professionTask?.state??'idle',reason:n.professionTask?.lastReason??null})),buildings:world.environment?.objects.map(o=>({id:o.id,hp:o.hp,maxHp:o.maxHp,status:o.status,repairProgress:o.repairProgress})),nodes:world.environment?.resourceNodes?.map(n=>({id:n.id,amount:n.amount,maxAmount:n.maxAmount,reservedBy:n.reservedBy,danger:n.danger})),commissions:world.commissions?.map(c=>({id:c.commissionId,targetId:c.targetId,status:c.status,acceptedBy:c.acceptedBy,progress:c.progress,materialsConsumed:c.materialsConsumed}))}}
  async stepProfessionMinutes(minutes){const count=Phaser.Math.Clamp(Math.floor(minutes),0,360),world=this.populationWorld;for(let i=0;i<count;i++){world.clock.minute++;if(world.clock.minute>=1440){world.clock.minute=0;world.clock.day++}this.populationSimulation.tick(1,world.clock.day,world.clock.minute);tickWorldRebuildProfessionWork(world,world.commissionBoard??{x:2928,y:2160},(a,b)=>this.canReachPoint(a,b));this.assignPopulationTargets();if(i%10===9){this.refreshProfessionVisuals();this.persistPopulation();this.renderPopulationDebug();await new Promise(resolve=>setTimeout(resolve,200))}}this.refreshProfessionVisuals();this.persistPopulation();this.renderPopulationDebug();return{minutes:count,profession:this.getProfessionState(),population:this.getPopulationState()}}
  createResourceNodeSprites(){for(const node of this.populationWorld?.environment?.resourceNodes??[]){const sprite=this.add.image(node.x,node.y,'rebuild-herb-node').setOrigin(.5,1).setDepth(node.y+2).setName(node.id);sprite.setData('resourceNodeId',node.id);this.resourceNodeSprites.set(node.id,sprite);sprite.setVisible(node.amount>0)}}
  initFauna(){
    this.populationWorld.environment.faunaClockMs??=Date.now();
    for(const id of ['deer','scorpion','snake'])for(const [key,a] of Object.entries({idle:[0,1,3,-1],move:[2,5,8,-1],flee:[6,9,12,-1],...(id==='deer'?{}:{attack:[6,7,10,0]}),hit:[10,10,1,0],death:[11,11,1,0]})){ const anim=`fauna_${id}_${key}`;if(!this.anims.exists(anim))this.anims.create({key:anim,frames:this.anims.generateFrameNumbers(`fauna-${id}`,{start:a[0],end:a[1]}),frameRate:a[2],repeat:a[3]})}
    const zones=(this.map.getObjectLayer('FaunaZones')?.objects??[]).map(o=>({zoneId:this.prop(o,'zoneId'),x:o.x,y:o.y,width:o.width,height:o.height}));this.faunaZones=zones;
    const fauna=ensureFauna(this.populationWorld,zones,(x,y)=>this.faunaSpawnOpen(null,x,y,false));
    this.migrateFaunaPopulation();
    for(const beast of this.populationWorld.environment.fauna)this.createFaunaSprite(beast);
    this.refreshFaunaVisibility();this.persistPopulation();
  }
  createFaunaSprite(beast){if(this.faunaSprites.has(beast.id))return this.faunaSprites.get(beast.id);const sprite=this.add.sprite(beast.x,beast.y,`fauna-${beast.species}`,0).setOrigin(.5,.78).setScale(beast.species==='deer'?1.42:1.12).setDepth(beast.y).setName(beast.id);sprite.setData('faunaId',beast.id);sprite.setInteractive({useHandCursor:true});sprite.on('pointerdown',pointer=>{this.pendingFaunaClick={id:beast.id,x:pointer.x,y:pointer.y}});sprite.on('pointerup',pointer=>{const pending=this.pendingFaunaClick;this.pendingFaunaClick=null;if(pending?.id===beast.id&&!this.dragState?.moved&&performance.now()-this.lastWorldDragAt>140&&Math.hypot(pointer.x-pending.x,pointer.y-pending.y)<7){this.selectedFaunaId=beast.id;if(!this.possessedNpcId)this.cameras.main.centerOn(beast.x,beast.y);this.refreshHud()}});sprite.play(`fauna_${beast.species}_${beast.alive?'idle':'death'}`);sprite.setVisible(false);this.faunaSprites.set(beast.id,sprite);this.syncGroundOccupancy();return sprite}
  faunaSpawnOpen(zone,x,y,respectView=true){if(!this.groundPositionOpen({id:'spawn-check',species:'deer'},x,y))return false;const water=this.map.layers.find(l=>l.name==='Water'),tile=water?.data?.[Math.floor(y/32)]?.[Math.floor(x/32)];if(tile&&tile.index>=0)return false;for(const npc of this.populationWorld?.npcs??[]){if(!npc.alive)continue;const s=this.npcSprites.get(npc.id),px=s?.x??npc.x,py=s?.y??npc.y;if(Math.hypot(px-x,py-y)<54)return false}for(const f of this.populationWorld?.environment?.fauna??[])if(f.alive&&Math.hypot(f.x-x,f.y-y)<42)return false;for(const d of this.populationWorld?.environment?.drops??[])if(d.status==='ground'&&Math.hypot(d.x-x,d.y-y)<36)return false;if(this.possessedNpcId){const player=this.populationWorld.npcs.find(n=>n.id===this.possessedNpcId);if(player&&Math.hypot(player.x-x,player.y-y)<180)return false}if(respectView&&this.cameras?.main){const v=this.cameras.main.worldView,margin=80;if(x>=v.x-margin&&x<=v.right+margin&&y>=v.y-margin&&y<=v.bottom+margin)return false}return true}
  migrateFaunaPopulation(){const world=this.populationWorld,env=world.environment;env.faunaRespawns??=[];env.faunaRespawnStats??={};for(const zone of this.faunaZones){const records=env.fauna.filter(f=>f.zoneId===zone.zoneId),initialGap=Math.max(0,FAUNA_ZONE_CAP-records.length);for(let i=0;i<initialGap;i++){const spawned=spawnFaunaInZone(world,zone,(x,y)=>this.faunaSpawnOpen(zone,x,y,false),{seed:this.stableHash(zone.zoneId+':migration:'+i)});if(!spawned.ok)break}for(const dead of records.filter(f=>!f.alive))queueFaunaRespawn(world,dead,env.faunaClockMs,5000)}}
  tickFaunaRespawns(delta){
    const env=this.populationWorld.environment;
    env.faunaClockMs+=delta;
    if(!env.faunaRespawns?.length)return;
    this.faunaRespawnTick+=delta;if(this.faunaRespawnTick<250)return;this.faunaRespawnTick%=250;
    const result=processFaunaRespawns(this.populationWorld,this.faunaZones,env.faunaClockMs,(zone,x,y)=>this.faunaSpawnOpen(zone,x,y,false));let changed=false;for(const beast of result.spawned){this.createFaunaSprite(beast);changed=true}if(result.cancelled.length||result.failed.length)changed=true;if(changed){this.refreshFaunaVisibility();this.syncFaunaDrops();this.requestBackgroundSave();this.renderEcologyDebug()}}
  initRiverFish(){this.riverFishSystem=new WorldRiverFishSystem(this,this.map,this.populationWorld.environment);this.riverFishSystemState=this.riverFishSystem.getState(this.cameras.main);this.persistPopulation()}
  initEcologyDebug(){const panel=document.createElement('aside');panel.id='ecology-debug';panel.style.cssText='position:fixed;left:14px;top:82px;z-index:22;color:#f1e7cc;font:11px/1.45 monospace;pointer-events:auto';panel.innerHTML='<button type="button" aria-expanded="false">Sinh thái · F3</button><section hidden></section>';const button=panel.querySelector('button'),section=panel.querySelector('section');button.style.cssText='padding:7px 10px;color:#f0dfb0;background:#111d18ef;border:1px solid #88764a;cursor:pointer';section.style.cssText='width:min(390px,calc(100vw - 32px));max-height:62vh;overflow:auto;margin-top:5px;padding:9px;background:#111d18f2;border:1px solid #88764a';button.onclick=()=>{section.hidden=!section.hidden;button.setAttribute('aria-expanded',String(!section.hidden));if(!section.hidden)this.renderEcologyDebug()};document.body.append(panel);this.ecologyDebug=panel;this.ecologyDebugSection=section;panel.hidden=true;this.input.keyboard?.on('keydown-F3',()=>{panel.hidden=!panel.hidden;if(!panel.hidden){section.hidden=false;button.setAttribute('aria-expanded','true');this.renderEcologyDebug()}else{section.hidden=true;button.setAttribute('aria-expanded','false')}});this.renderEcologyDebug()}
  getFaunaState(){const fauna=this.populationWorld?.environment?.fauna??[],env=this.populationWorld?.environment??{},view=this.cameras.main.worldView,now=Date.now(),records=fauna.map(f=>{const sprite=this.faunaSprites.get(f.id),inCamera=f.x>=view.x&&f.x<=view.right&&f.y>=view.y&&f.y<=view.bottom,motion=this.faunaMotionStats?.get(f.id),targetDistance=f.roamTarget?Math.hypot(f.x-f.roamTarget.x,f.y-f.roamTarget.y):null;let renderReason='visible';if(!f.alive)renderReason='đã chết trong save';else if(!sprite)renderReason='sprite chưa được tạo';else if(!inCamera)renderReason='ngoài camera';else if(!sprite.visible)renderReason='culling/chưa đồng bộ camera';return{...f,visible:Boolean(sprite?.visible),inCamera,rendered:Boolean(sprite?.visible&&sprite.alpha>0),alpha:sprite?.alpha??0,frame:Number(sprite?.frame?.name??0),spritePosition:sprite?{x:sprite.x,y:sprite.y}:null,moving:Boolean(motion?.moving),distanceToRoamTarget:targetDistance,renderReason}}),zones=(this.faunaZones??[]).map(z=>{const living=fauna.filter(f=>f.zoneId===z.zoneId&&f.alive),stats=env.faunaRespawnStats?.[z.zoneId]??{totalSpawned:0,failedAttempts:0};const pending=(env.faunaRespawns??[]).filter(q=>q.zoneId===z.zoneId).sort((a,b)=>a.dueAtMs-b.dueAtMs);return{zoneId:z.zoneId,title:z.name??z.zoneId,cap:FAUNA_ZONE_CAP,living:living.length,species:Object.fromEntries(['deer','scorpion','snake'].map(s=>[s,living.filter(f=>f.species===s).length])),dead:fauna.filter(f=>f.zoneId===z.zoneId&&!f.alive).length,pending:pending.length,nextInMs:pending.length?Math.max(0,pending[0].dueAtMs-now):null,totalRespawned:stats.totalSpawned,failedAttempts:stats.failedAttempts,lastFailure:stats.lastFailure??pending.find(q=>q.lastFailure)?.lastFailure??null}});return{count:fauna.length,alive:fauna.filter(f=>f.alive).length,species:Object.fromEntries(['deer','scorpion','snake'].map(s=>[s,fauna.filter(f=>f.species===s&&f.alive).length])),rendered:records.filter(f=>f.rendered).length,inCamera:records.filter(f=>f.inCamera).length,moving:records.filter(f=>f.moving).length,combat:records.filter(f=>f.alive&&['attack','hit','flee'].includes(f.state)).length,dead:records.filter(f=>!f.alive).length,respawnQueue:env.faunaRespawns?.length??0,zones,records,drops:(env.drops??[]).filter(d=>d.sourceId.startsWith('fauna:')).map(d=>({...d})),hunterCount:this.populationWorld?.npcs?.filter(n=>n.populationRole==='hunter').length??0}}
  getEcologyState(){const fauna=this.getFaunaState(),fish=this.riverFishSystem?.getState(this.cameras.main)??{count:0,living:0,records:[],waterTiles:0,safeWaterCells:0,waterRegions:0},population=this.getPopulationState();return{camera:{x:this.cameras.main.worldView.x,y:this.cameras.main.worldView.y,width:this.cameras.main.worldView.width,height:this.cameras.main.worldView.height,zoom:this.cameras.main.zoom},fauna,fish,npcs:{alive:population.alive,total:population.total,visible:population.visible,states:population.states,diagnostics:population.diagnostics},saveKey:WORLD_POPULATION_SAVE_KEY}}
  renderEcologyDebug(){if(!this.ecologyDebugSection||!this.populationWorld)return;const state=this.getEcologyState(),species=Object.entries(state.fauna.species).map(([key,count])=>`${key} ${count}`).join(' · '),zoneRows=state.fauna.zones.map(z=>`<div>${z.title}: ${z.living}/${z.cap} · hươu ${z.species.deer} / bọ cạp ${z.species.scorpion} / rắn ${z.species.snake} · chết ${z.dead} · chờ ${z.pending}${z.nextInMs===null?'':` (${(z.nextInMs/1000).toFixed(1)}s)`} · tổng hồi sinh ${z.totalRespawned} · lỗi ${z.failedAttempts}${z.lastFailure?' · '+z.lastFailure:''}</div>`).join(''),faunaRows=state.fauna.records.map(f=>`<div>${f.species} · ${f.id.slice(-2)} · ${f.renderReason} · ${Math.round(f.x)},${Math.round(f.y)} · ${f.state}${f.moving?' → đi':''} · frame ${f.frame}</div>`).join(''),fishRows=state.fish.records.map(f=>`<div>${f.species==='common'?'Cá thường':'Linh cá'} ${f.id.slice(-2)} · ${f.depthState} · alpha ${f.alpha} · ${Math.round(f.x)},${Math.round(f.y)} · ${f.inCamera?'trong camera':'ngoài camera'} · ${f.invalidPosition?'LỖI: ngoài nước':''}</div>`).join(''),d=state.npcs.diagnostics,jobRows=d?.stationaryExamples?.map(n=>`<div>${n.name} · ${n.role} · ${n.reason} · mục tiêu ${Math.round(n.targetDistance)}px${n.pathBlocked?' · PATH BLOCKED':''}${n.noProgressMs>5000?` · kẹt ${Math.round(n.noProgressMs/1000)}s`:''}</div>`).join('')??'',stuckRows=d?.stuckExamples?.map(n=>`<div>${n.name} · ${n.role} · ${n.goal||n.reason} · cách mục tiêu ${Math.round(n.targetDistance)}px · không tiến ${Math.round(n.noProgressMs/1000)}s${n.pathBlocked?' · đường bị chặn':''} · ${Math.round(n.position.x)},${Math.round(n.position.y)}</div>`).join('')??'';this.ecologyDebugSection.innerHTML=`<b>Fauna · registry ${state.fauna.count} · sống ${state.fauna.alive} · trong camera ${state.fauna.inCamera} · render ${state.fauna.rendered} · đang đi ${state.fauna.moving} · giao chiến ${state.fauna.combat} · chết ${state.fauna.dead}</b><br>${species}<hr><b>Habitat / respawn 5 giây · cap ${FAUNA_ZONE_CAP}</b><br>${zoneRows||'Chưa có habitat fauna hợp lệ.'}<br><button data-go-fauna="deer">Tới hươu ngoại thành</button> <button data-go-fauna="predator">Tới rắn/bọ cạp</button><hr>${faunaRows||'Không còn cá thể sống trong save; không tự hồi sinh.'}<hr><b>Cá sông · ${state.fish.living}/${state.fish.count} sprite · ô nước an toàn ${state.fish.safeWaterCells} · vùng kết nối ${state.fish.waterRegions} · tỉ lệ thường/linh ${state.fish.common}/${state.fish.spirit}</b><br><button data-go-fish="1">Tới đoạn sông phía Đông</button><br>${fishRows||'Chưa có vùng nước an toàn để thả cá.'}<hr><b>NPC ${state.npcs.visible}/${state.npcs.alive} đang trong camera · di chuyển ${state.npcs.states.moving} · làm việc ${state.npcs.states.working} · tu luyện ${state.npcs.states.cultivating} · giao dịch ${state.npcs.states.trading} · tuần tra ${state.npcs.states.patrolling} · nghỉ ${state.npcs.states.resting} · không mục tiêu ${state.npcs.states.idle} · mắc đường ${state.npcs.states.stuck}</b><br>${jobRows}<hr><b>NPC cần kiểm tra đường đi</b><br>${stuckRows||'Không có NPC vượt ngưỡng mắc đường tại thời điểm này.'}<hr><small>Không teleport entity; chỉ đổi camera. Cá thể chết và save hiện tại được giữ nguyên.</small>`;this.ecologyDebugSection.querySelector('[data-go-fauna="deer"]')?.addEventListener('click',()=>this.gotoHabitat('deer'));this.ecologyDebugSection.querySelector('[data-go-fauna="predator"]')?.addEventListener('click',()=>this.gotoHabitat('predator'));this.ecologyDebugSection.querySelector('[data-go-fish]')?.addEventListener('click',()=>this.gotoHabitat('river'))}
  gotoHabitat(id){let point;if(id==='river')point=this.riverFishSystem?.closestFishPosition??REGION_CENTERS.east;else{const species=id==='deer'?'deer':null,zoneId=species?'southern-outskirts':'forest-outer',zone=(this.map.getObjectLayer('FaunaZones')?.objects??[]).find(o=>this.prop(o,'zoneId')===zoneId),cx=zone?zone.x+zone.width/2:REGION_CENTERS[species?'south':'forest'].x,cy=zone?zone.y+zone.height/2:REGION_CENTERS[species?'south':'forest'].y,live=(this.populationWorld.environment.fauna??[]).filter(f=>f.alive),fauna=species?live.filter(f=>f.species==='deer').sort((a,b)=>Math.hypot(a.x-cx,a.y-cy)-Math.hypot(b.x-cx,b.y-cy))[0]:(()=>{const snakes=live.filter(f=>f.species==='snake'),scorpions=live.filter(f=>f.species==='scorpion');let best=null,bestCost=Infinity;for(const snake of snakes)for(const scorpion of scorpions){const separation=Math.hypot(snake.x-scorpion.x,snake.y-scorpion.y),centerDistance=Math.hypot((snake.x+scorpion.x)/2-cx,(snake.y+scorpion.y)/2-cy),cost=separation+centerDistance*.18;if(cost<bestCost){bestCost=cost;best={x:(snake.x+scorpion.x)/2,y:(snake.y+scorpion.y)/2}}}return best??live.filter(f=>f.species==='snake'||f.species==='scorpion').sort((a,b)=>Math.hypot(a.x-cx,a.y-cy)-Math.hypot(b.x-cx,b.y-cy))[0]})();if(fauna)point={x:fauna.x,y:fauna.y};else if(zone)point={x:cx,y:cy}}if(!point)return false;this.cameras.main.setZoom(id==='river'?.88:.95).centerOn(point.x,point.y);this.clampCamera();this.currentRegion=id==='river'?'east':id==='deer'?'south':'forest';this.refreshFaunaVisibility();this.refreshHud();this.renderEcologyDebug();return true}
  damageFaunaEntity(id,attackerId,damage,eventId,maxRange=52){const attacker=this.populationWorld.npcs.find(n=>n.id===attackerId&&n.alive),target=this.populationWorld.environment?.fauna?.find(f=>f.id===id&&f.alive),playerAttack=attackerId===this.possessedNpcId;if(!attacker||(!playerAttack&&attacker.populationRole!=='hunter')||!target||Math.hypot(attacker.x-target.x,attacker.y-target.y)>maxRange)return{ok:false,reason:'attacker-or-range'};return this.applyFaunaDamage(target,attacker,damage,eventId)}
  applyFaunaDamage(target,attacker,damage,eventId){const id=target.id;const result=damageFauna(this.populationWorld,id,attacker.id,damage,eventId);if(!result)return{ok:false,reason:'invalid-or-duplicate'};const sprite=this.faunaSprites.get(id);sprite?.setDepth(result.fauna.y);sprite?.play(`fauna_${result.fauna.species}_${result.fauna.alive?'hit':'death'}`,true);if(!result.fauna.alive){sprite?.setAlpha(.75);queueFaunaRespawn(this.populationWorld,result.fauna,this.populationWorld.environment.faunaClockMs,5000)}if(result.fauna.species==='deer'&&result.fauna.alive)result.fauna.state='flee';this.persistPopulation();return{ok:true,damage:result.damage,fauna:result.fauna,drops:result.drops}}
  claimFaunaDropForNpc(dropId,npcId,eventId){const npc=this.populationWorld.npcs.find(n=>n.id===npcId&&n.alive),drop=this.populationWorld.environment?.drops.find(d=>d.id===dropId&&d.status==='ground');if(!npc||!drop||Math.hypot(npc.x-drop.x,npc.y-drop.y)>32)return null;const r=claimFaunaDrop(this.populationWorld,dropId,npcId,eventId);if(r){this.dropSprites.get(dropId)?.destroy();this.dropSprites.delete(dropId);this.persistPopulation()}return r}
  refreshFaunaVisibility(){const view=this.cameras.main.worldView;for(const f of this.populationWorld?.environment?.fauna??[]){const s=this.faunaSprites.get(f.id);if(!s)continue;const visible=f.alive&&s.x>=view.x-70&&s.x<=view.right+70&&s.y>=view.y-70&&s.y<=view.bottom+70;if(s.visible!==visible){s.setVisible(visible);if(visible)s.anims.resume();else s.anims.pause()}}}
  syncFaunaDrops(){for(const d of this.populationWorld?.environment?.drops??[]){if(!d.sourceId.startsWith('fauna:')||d.status!=='ground'||this.dropSprites.has(d.id))continue;const marker=this.add.text(d.x,d.y-3,'✦',{fontFamily:'serif',fontSize:'16px',color:'#f3d47c',stroke:'#253424',strokeThickness:3}).setOrigin(.5).setDepth(d.y+2).setName(d.id);marker.setData('dropId',d.id);this.dropSprites.set(d.id,marker)}}
  faunaNow(){return this.populationWorld.clock.day*1440+this.populationWorld.clock.minute}
  tickFauna(delta){
    if(!this.populationWorld?.environment?.fauna)return;this.faunaTick+=delta;if(this.faunaTick<1000)return;this.faunaTick%=1000;const now=this.faunaNow(),fauna=this.populationWorld.environment.fauna,npcs=this.populationWorld.npcs;
    for(const f of fauna){const sprite=this.faunaSprites.get(f.id),tickStartX=f.x,tickStartY=f.y;if(!f.alive||!sprite)continue;
      const behavior=FAUNA_BEHAVIOR[f.species];
      const neighbors=[...this.groundOccupancy.near(f.x,f.y,190)].filter(body=>body.category===1).map(body=>body.actor);
      const nearby=this.inSceneryView(sprite,480);
      const threatened=f.targetNpcId||f.state==='flee'||neighbors.some(n=>Math.abs(n.x-f.x)<100&&Math.abs(n.y-f.y)<100);
      const shouldThink=nearby||threatened||((now+this.stableHash(f.id))%2===0);
      if(!threatened&&now<(f.restUntil??0)){
        f.state='idle';sprite.play('fauna_'+f.species+'_idle',true);continue;
      }
      const wounded=f.hp/f.maxHp<behavior.retreatHealth;
      if(wounded&&f.targetNpcId&&now>=(f.fleeUntil??0)){
        const source=neighbors.find(n=>n.id===f.targetNpcId);
        if(source){
          const angle=Math.atan2(f.y-source.y,f.x-source.x);
          const refuge=[0,.55,-.55].map(offset=>({x:f.x+Math.cos(angle+offset)*75,y:f.y+Math.sin(angle+offset)*75}))
            .find(point=>this.groundPositionOpen(f,point.x,point.y));
          if(refuge){f.roamTarget=refuge;f.state='flee';f.fleeUntil=now+3;f.targetNpcId=undefined;}
        }
      }
      if(f.state==='flee'&&now<(f.fleeUntil??0)&&f.roamTarget){
        // Finish the current retreat before choosing another direction.
      }else if(shouldThink&&!behavior.territorial){
        const threat=neighbors.filter(n=>n.populationRole!=='city_guard').map(n=>({n,d:Math.hypot(n.x-f.x,n.y-f.y)})).filter(x=>x.d<behavior.notice).sort((a,b)=>a.d-b.d)[0];
        if(threat&&now>=(f.fleeUntil??0)){const dx=f.x-threat.n.x,dy=f.y-threat.n.y,d=Math.max(1,Math.hypot(dx,dy));f.roamTarget={x:Math.max(4,Math.min(WORLD.width-4,f.x+dx/d*72)),y:Math.max(4,Math.min(WORLD.height-4,f.y+dy/d*72))};f.fleeUntil=now+2;f.state='flee'}
        else if(!f.roamTarget||Math.hypot(f.x-f.roamTarget.x,f.y-f.roamTarget.y)<16){const zone=(this.map.getObjectLayer('FaunaZones')?.objects??[]).find(o=>this.prop(o,'zoneId')===f.zoneId);f.roamTarget={x:zone.x+36+this.stableHash(f.id+now)%Math.max(1,zone.width-72),y:zone.y+36+this.stableHash(f.id+':y:'+now)%Math.max(1,zone.height-72)};f.state='walk'}
      }else if(shouldThink){
        const habitat=this.faunaZones.find(zone=>zone.zoneId===f.zoneId);
        const nearHabitat=n=>!habitat||(n.x>=habitat.x-24&&n.y>=habitat.y-24&&n.x<=habitat.x+habitat.width+24&&n.y<=habitat.y+habitat.height+24);
        const attacker=neighbors.filter(n=>nearHabitat(n)&&((n.faunaHuntTargetId===f.id&&Math.hypot(n.x-f.x,n.y-f.y)<190)||Math.hypot(n.x-f.x,n.y-f.y)<behavior.notice)&&this.clearFaunaLine(f,n)).sort((a,b)=>Math.hypot(a.x-f.x,a.y-f.y)-Math.hypot(b.x-f.x,b.y-f.y))[0];
        if(attacker&&attacker.faunaHuntTargetId===f.id&&Math.hypot(attacker.x-f.x,attacker.y-f.y)>34){this.faunaMotionStats??=new Map();this.faunaMotionStats.set(f.id,{moving:false,x:f.x,y:f.y});continue}
        if(attacker && attacker.id!==this.possessedNpcId && !['flee','rest'].includes(attacker.goalAction)){
          (attacker.skills??[]).some(id=>SKILLS[id]&&this.heavenActions.fire(attacker,id,f));
        }
        const hit=attacker?resolveFaunaAttack(f,now,Math.hypot(attacker.x-f.x,attacker.y-f.y)):0;if(attacker&&hit){f.targetNpcId=attacker.id;f.roamTarget=undefined;sprite.play(`fauna_${f.species}_attack`,true);const defense=this.heavenActions.defense(attacker);attacker.hp=Math.max(0,attacker.hp-Math.max(1,hit-Math.floor(defense*.35)));attacker.grudges??={};attacker.grudges[f.id]=(attacker.grudges[f.id]??0)+1;attacker.safety=Math.max(0,attacker.safety-9);if(attacker.id!==this.possessedNpcId&&attacker.hp>0&&(attacker.populationRole!=='hunter'||attacker.hp<cultivationStats(attacker).hpMax*.60))this.evadeFauna(attacker,f,now);if(!attacker.memories.some(m=>m.day===this.populationWorld.clock.day&&m.kind==='fauna-combat'&&m.otherId===f.id)){attacker.memories.push({day:this.populationWorld.clock.day,text:'Bị '+FAUNA_SPECIES[f.species].name+' tấn công.',kind:'fauna-combat',otherId:f.id});attacker.memories=attacker.memories.slice(-12);this.populationWorld.events.push({id:`fauna-attack:${f.id}:${now}`,day:this.populationWorld.clock.day,minute:this.populationWorld.clock.minute,type:'fauna-retaliation',actorId:f.id,targetId:attacker.id,description:`${FAUNA_SPECIES[f.species].name} gây ${hit} sát thương cho ${attacker.name}.`,status:'occurred'});if(this.populationWorld.events.length>400)this.populationWorld.events.shift();this.requestBackgroundSave()}if(attacker.hp===0){attacker.alive=false;attacker.deathCause=`Bị ${FAUNA_SPECIES[f.species].name} tấn công`;this.npcSprites.get(attacker.id)?.setVisible(false)}
        }else if(attacker){f.targetNpcId=attacker.id;f.roamTarget={x:attacker.x,y:attacker.y};f.state='walk'}else if(f.targetNpcId){const target=npcs.find(n=>n.id===f.targetNpcId&&n.alive);if(!target||!nearHabitat(target)||Math.hypot(target.x-f.x,target.y-f.y)>behavior.leash){f.targetNpcId=undefined;f.roamTarget=undefined;f.state='walk'}else{f.roamTarget={x:target.x,y:target.y};f.state='walk'}}else{const zone=(this.map.getObjectLayer('FaunaZones')?.objects??[]).find(o=>this.prop(o,'zoneId')===f.zoneId);if(!f.roamTarget||Math.hypot(f.x-f.roamTarget.x,f.y-f.roamTarget.y)<16){f.roamTarget={x:zone.x+30+this.stableHash(f.id+':r:'+now)%Math.max(1,zone.width-60),y:zone.y+30+this.stableHash(f.id+':s:'+now)%Math.max(1,zone.height-60)}}f.state='walk'}
      }
      if(f.state==='attack'){this.faunaMotionStats??=new Map();this.faunaMotionStats.set(f.id,{moving:false,x:f.x,y:f.y});continue}if(f.roamTarget){const dx=f.roamTarget.x-f.x,dy=f.roamTarget.y-f.y,d=Math.hypot(dx,dy);if(d>4){const speed=f.state==='flee'?(FAUNA_SPECIES[f.species].fleeSpeed||FAUNA_SPECIES[f.species].speed*1.18):FAUNA_SPECIES[f.species].speed,step=Math.min(d,speed);const move=this.moveOnGround(f,sprite,f.x+dx/d*step,f.y+dy/d*step);if(move){f.x=move.x;f.y=move.y;sprite.setPosition(f.x,f.y).setDepth(f.y);sprite.setFlipX(dx<0);sprite.play(`fauna_${f.species}_${f.state==='flee'?'flee':'move'}`,true)}else{f.roamTarget=undefined;f.state='idle';sprite.play(`fauna_${f.species}_idle`,true)}}else{f.roamTarget=undefined;f.state='idle';f.restUntil=now+behavior.rest;sprite.play(`fauna_${f.species}_idle`,true)}}this.faunaMotionStats??=new Map();this.faunaMotionStats.set(f.id,{moving:Math.hypot(f.x-tickStartX,f.y-tickStartY)>.1,x:f.x,y:f.y});
    }
    this.tickHunters(now);this.syncFaunaDrops();this.refreshFaunaVisibility();
  }
  evadeFauna(npc,beast,now){
    if(npc.goalAction==='flee'&&now<(npc.faunaEvadeUntil??0)&&Math.hypot(npc.x-npc.actionTarget.x,npc.y-npc.actionTarget.y)>20)return;
    const dx=npc.x-beast.x,dy=npc.y-beast.y;
    const angle=Math.atan2(dy,dx);
    for(const distance of [154,96,54,28])for(const offset of [0,.6,-.6,1.2,-1.2]){
      const direction=angle+offset;
      const target={x:npc.x+Math.cos(direction)*distance,y:npc.y+Math.sin(direction)*distance};
      if(!this.canOccupy(target.x,target.y)||!this.canReachPoint(npc,target)||!this.clearFaunaLine(npc,target))continue;
      npc.faunaEvadeUntil=now+8;npc.faunaHuntTargetId=undefined;
      npc.goalAction='flee';npc.action='travel';npc.actionTarget=target;npc.actionProgress=0;npc.decisionSlot=undefined;
      npc.shortGoal='Rút khỏi yêu thú đang tấn công';
      npc.aiDecision={at:now,action:'flee',reason:'Đang bị tấn công, cần thoát khỏi tầm đánh.',scores:[]};
      this.npcRoutes.delete(npc.id);
      return;
    }
  }
  hunterApproach(hunter,beast){
    const weapon=weaponForNpc(hunter),reach=weapon?Math.min(70,weaponAttackMode(weapon,1,false).range??52):38;
    if(Math.hypot(hunter.x-beast.x,hunter.y-beast.y)<reach-2&&this.clearFaunaLine(hunter,beast))return{x:hunter.x,y:hunter.y};
    const base=Math.atan2(hunter.y-beast.y,hunter.x-beast.x),range=Math.min(reach-4,27);
    for(const offset of [0,.78,-.78,1.57,-1.57,Math.PI]){
      const x=beast.x+Math.cos(base+offset)*range,y=beast.y+Math.sin(base+offset)*range;
      if(this.groundPositionOpen(hunter,x,y)&&this.canReachPoint(hunter,{x,y})&&this.clearFaunaLine({x,y},beast))return{x,y};
    }
    return{x:beast.x,y:beast.y};
  }
  tickHunters(now){const fauna=this.populationWorld.environment.fauna,hunters=this.populationWorld.npcs.filter(n=>n.alive&&n.populationRole==='hunter'&&n.id!==this.possessedNpcId),day=this.populationWorld.clock.day;for(const h of hunters){if(h.faunaHuntLimitDay!==day){h.faunaHuntLimitDay=day;h.faunaHuntsToday=0}const stats=cultivationStats(h),tolerance=hunterTolerance(h,stats.hpMax,stats.attack+stats.defense+h.realmIndex*8);if(now<(h.faunaEvadeUntil??0)||h.hp<tolerance.retreatHp||h.fatigue>=82||h.safety<30||(h.hunger>=75&&h.inventory.some(i=>i.itemId==='ration'||i.itemId==='deer_meat'))||(!h.faunaHuntTargetId&&(this.populationWorld.clock.minute<360||this.populationWorld.clock.minute>=1140))){if(h.faunaHuntTargetId){h.faunaHuntTargetId=undefined;h.decisionSlot=undefined}continue}let target=fauna.find(f=>f.id===h.faunaHuntTargetId);if(!target||(!target.alive&&!(this.populationWorld.environment.drops??[]).some(d=>d.sourceId===target.id&&d.status==='ground'))){h.faunaHuntTargetId=undefined;target=undefined}
      if(!target){if((h.faunaHuntsToday??0)>=1)continue;const reserved=new Set(this.populationWorld.npcs.filter(n=>n.id!==h.id).map(n=>n.faunaHuntTargetId).filter(Boolean)),prey=fauna.filter(f=>f.alive&&!reserved.has(f.id)&&(f.species==='deer'||tolerance.allowedPower>=faunaCombatPower(f.species))&&Math.hypot(h.x-f.x,h.y-f.y)<tolerance.search).sort((a,b)=>(a.species==='deer'?0:1)-(b.species==='deer'?0:1)||Math.hypot(h.x-a.x,h.y-a.y)-Math.hypot(h.x-b.x,h.y-b.y))[0];if(!prey)continue;h.faunaHuntTargetId=prey.id;target=prey}
      if(target.alive){h.actionTarget=this.hunterApproach(h,target);h.goalAction='fight';h.action='travel';h.shortGoal=`Đang săn ${FAUNA_SPECIES[target.species].name}`;const usedSkill=(h.skills??[]).find(id=>SKILLS[id]&&this.heavenActions.fire(h,id,target));
      if(usedSkill){h.action='fight';h.actionTarget={x:h.x,y:h.y};this.npcRoutes.delete(h.id);continue}
      const d=Math.hypot(h.x-target.x,h.y-target.y),weapon=weaponForNpc(h),mode=weaponAttackMode(weapon,1,false),facing=this.facePoint(h,target),reach=weapon?Math.min(70,mode.range??52):38;if(d<reach&&now>=(h.faunaAttackReadyAt??0)&&this.clearFaunaLine(h,target)){h.faunaAttackReadyAt=now+2;if(weapon){this.playWeaponPose(h,mode,facing);this.spawnWeaponFx(weapon.kind==='dao'?'dao':'thrust',facing,(h.x+target.x)/2,(h.y+target.y)/2)}const raw=Math.round(cultivationStats(h).attack*(weapon?(mode.multiplier??1):1)),result=this.damageFaunaEntity(target.id,h.id,raw,`fauna-hunt:${h.id}:${target.id}:${now}`,weapon?reach:52);if(result?.ok&&!result.fauna.alive)h.faunaHuntsToday=(h.faunaHuntsToday??0)+1;h.action='fight'}}
      else{const drop=this.populationWorld.environment.drops.find(d=>d.sourceId===target.id&&d.status==='ground');if(!drop){h.faunaHuntTargetId=undefined;continue}h.actionTarget={x:drop.x,y:drop.y};h.goalAction='gather';h.action='travel';if(Math.hypot(h.x-drop.x,h.y-drop.y)<30){this.claimFaunaDropForNpc(drop.id,h.id,`fauna-pickup:${h.id}:${drop.id}`);h.faunaHuntTargetId=undefined;h.goalAction='rest';h.action='idle';h.shortGoal=`Đã thu nhặt ${FAUNA_SPECIES[target.species].name}`}}
    }}
  damageBuilding(id,eventId,damage,realmIndex=0){const result=damageWorldRebuildBuilding(this.populationWorld,id,eventId,damage,realmIndex);if(result){this.refreshProfessionVisuals();this.persistPopulation();this.renderPopulationDebug()}return result}
  refreshProfessionVisuals(){if(!this.environmentGraphics||!this.populationWorld?.environment)return;const g=this.environmentGraphics;g.clear();for(const obj of this.populationWorld.environment.objects){const sprite=this.buildingSprites.get(obj.id);if(!sprite)continue;const node=this.resourceNodeSprites.get(obj.id);if(node)node.setVisible(obj.status!=='destroyed');if(obj.status==='intact')continue;const alpha=obj.status==='repairing'?.22:.42,x=sprite.x-sprite.displayWidth*.30,y=sprite.y+sprite.displayHeight*.18,w=sprite.displayWidth*.6,h=6;g.fillStyle(0x241c16,.72).fillRect(x,y,w,h);g.fillStyle(obj.status==='repairing'?0x65cba0:0xd37755,alpha+.45).fillRect(x,y,w*Math.max(.03,obj.hp/obj.maxHp),h);if(obj.status==='damaged'||obj.status==='destroyed'){g.lineStyle(2,0x522d27,.82);g.lineBetween(x+w*.36,y-8,x+w*.43,y+10);g.lineBetween(x+w*.43,y+10,x+w*.51,y+3)}}for(const node of this.populationWorld.environment.resourceNodes??[]){const sprite=this.resourceNodeSprites.get(node.id);if(sprite)sprite.setVisible(node.amount>0)}}
  reportCombat(attackerId,victimId,damage,options={}){const attacker=this.populationWorld.npcs.find(n=>n.id===attackerId),victim=this.populationWorld.npcs.find(n=>n.id===victimId);if(!attacker?.alive||!victim?.alive||attacker===victim||!Number.isFinite(damage)||damage<=0)return{ok:false,reason:'invalid'};const eventId=options.eventId??`combat:${this.populationWorld.clock.day}:${this.populationWorld.clock.minute}:${attackerId}:${victimId}:${createWorldUuid()}`;if(this.populationWorld.events.some(e=>e.id===eventId))return{ok:false,reason:'duplicate'};victim.hp=Math.max(0,victim.hp-damage);victim.grudges??={};victim.grudges[attackerId]=(victim.grudges[attackerId]??0)+1;victim.relationships[attackerId]=Math.max(-100,(victim.relationships[attackerId]??0)-Math.max(3,Math.ceil(damage/8)));victim.memories.push({day:this.populationWorld.clock.day,text:`${attacker.name} gây ${Math.round(damage)} sát thương.`,kind:'combat',otherId:attackerId});if(victim.memories.length>12)victim.memories.shift();this.populationWorld.events.push({id:eventId,day:this.populationWorld.clock.day,minute:this.populationWorld.clock.minute,type:'npc-combat-hit',actorId:attackerId,targetId:victimId,description:`${attacker.name} gây ${Math.round(damage)} sát thương cho ${victim.name}.`,status:'occurred'});const law=reportCityCombat(this.populationWorld,{eventId,attackerId,victimId,damage,authorizedDuel:Boolean(options.authorizedDuel),retaliation:Boolean(options.retaliation)});if(victim.hp<=0){victim.alive=false;victim.deathCause=`Bị ${attacker.name} đánh bại`;this.npcSprites.get(victimId)?.setVisible(false)}if(law.incident){for(const id of [...law.responderIds,...(law.cityMasterId?[law.cityMasterId]:[])]){const n=this.populationWorld.npcs.find(x=>x.id===id);this.npcRoutes.delete(id);if(n)n.actionTarget={x:attacker.x,y:attacker.y}}this.cityLawTimers??=new Map();this.cityLawTimers.set(law.incident.id,performance.now());this.worldPopulationToast(`Báo động thành: lính đang tới hiện trường · cấp ${law.incident.severity}.`)}this.persistPopulation();this.renderPopulationDebug();return{...law,eventId,damage}}
  worldPopulationToast(message){const node=document.getElementById('population-toast')??document.createElement('div');node.id='population-toast';node.textContent=message;node.style.cssText='position:fixed;left:50%;top:78px;transform:translateX(-50%);z-index:30;padding:8px 12px;background:#111d18ed;border:1px solid #c4a35c;color:#f0dfb0;font:12px Georgia,serif';document.body.append(node);clearTimeout(this.populationToastTimer);this.populationToastTimer=setTimeout(()=>node.remove(),2600)}
  renderPopulationDebug(){if(!this.populationDebug||this.populationDebug.hidden||!this.populationWorld)return;const s=this.getPopulationState(),jobs=this.getProfessionState(),roles=Object.entries(s.counts).map(([role,count])=>`<div>${role.replaceAll('_',' ')} <b>${count}</b></div>`).join(''),states=Object.entries(s.states).map(([name,count])=>`${name} ${count}`).join(' · '),repair=jobs.repairers.map(n=>{const wood=n.materials.find(i=>i.itemId==='wood')?.count??0,ore=n.materials.find(i=>i.itemId==='iron_ore')?.count??0;return`${n.id.slice(-2)} · ${n.status} · ${n.buildingId??'đợi việc'} · HP ${n.hp??'—'}/${n.maxHp??'—'} · ${n.progress}m · gỗ ${wood}, quặng ${ore}`}).join('<br>'),herbs=jobs.herbGatherers.map(n=>`${n.id.slice(-2)} · ${n.status} · ${n.nodeId??n.reason??'đợi node'} · còn ${n.nodeRemaining??'—'} · túi ${n.inventory.find(i=>i.itemId==='spirit_herb')?.count??0}`).join('<br>'),selected=s.selected?`<hr><b>${s.selected.name}</b><br>${s.selected.id}<br>${s.selected.role} · ${s.selected.profession} · ${s.selected.faction}<br>${s.selected.personality} · cảnh giới ${s.selected.realmIndex}/${s.selected.realmLevel} · HP ${Math.round(s.selected.hp)}<br>${s.selected.goal}<br>${s.selected.task?`${s.selected.task.kind}: ${s.selected.task.targetId||s.selected.task.lastReason} · ${s.selected.task.state}`:s.selected.reason}`:'';this.populationDebug.querySelector('section').innerHTML=`<b>NPC mới: ${s.alive}/${s.total} · visible ${s.visible}</b><br>${roles}<hr>${states}<hr><b>Thợ sửa</b><br>${repair}<hr><b>Hái dược</b><br>${herbs}<hr>FPS ${Math.round(s.fps)} · frame avg/p95 ${s.frameAvgMs.toFixed(1)}/${s.frameP95Ms.toFixed(1)}ms · AI avg/p95 ${s.aiCostMs.toFixed(2)}/${s.aiCostP95Ms.toFixed(2)}ms<br>AI ${s.goalEvaluations}/s · path ${s.pathfindingCalls}/s · collision ${s.collisionChecks}/s · CityLaw ${s.cityLawCostAvgMs.toFixed(3)}/${s.cityLawCostP95Ms.toFixed(3)}ms · kẹt ${s.states.stuck}${selected}`}
  assignPopulationTargets(){const markers=new Map(this.markers.map(m=>[m.id,m])),solids=this.collisionRects,occupied=[];for(const npc of this.populationWorld.npcs)if(npc.workPosition)occupied.push(npc.workPosition);for(const npc of this.populationWorld.npcs){if(npc.id===this.possessedNpcId)continue;let id='city-center',role=npc.populationRole,index=Number(npc.id.match(/:(\d+)$/)?.[1]??0);if(npc.authorityRole==='city_master')id='city-hall-entrance';else if(role==='merchant')id=npc.stallId;else if(role==='tavern_staff')id='tavern-entrance';else if(role==='quest_clerk'||role==='repair_worker')id='quest-office';else if(role==='city_guard')id=npc.guardPostId;else if(role==='low_disciple'||role==='elder'||role==='sect_leader')id='sect-yard';else if(role==='hunter')id='forest-outer';else if(role==='herb_gatherer')id=index%2?'forest-outer':'south-outskirts';else if(role==='commoner')id=npc.profession==='nong_dan'?'south-outskirts':index%3?'city-center':'south-outskirts';else if(role==='independent_cultivator')id=npc.spawnRegionId==='forest-outer'?'forest-outer':npc.spawnRegionId==='south-suburb'?'south-outskirts':'city-center';const base=markers.get(id)??markers.get('city-center');if(!npc.workPosition){const a=(index%8)*Math.PI/4,radius=72+(index%6)*28,pos=this.findOpenPosition(base.x+Math.cos(a)*radius,base.y+Math.sin(a)*radius,solids,occupied);npc.workPosition=pos;npc.workplaceId=id;occupied.push(pos)}if(role==='city_guard'&&(!npc.patrolPoints||!npc.patrolPoints.length||!npc.patrolLayoutVersion)){const post=markers.get(id)??base,horizontal=id==='gate-east'||id==='gate-west';
      const flank=this.findOpenPosition(post.x+(horizontal?0:96),post.y+(horizontal?88:0),solids,[]);
      npc.patrolPoints=[flank,npc.workPosition,markers.get('city-center')].filter(Boolean);npc.patrolIndex=0;npc.patrolLayoutVersion=1}const target=this.setNpcGoalTarget(npc);if(target&&Math.hypot(npc.actionTarget.x-target.x,npc.actionTarget.y-target.y)>4){npc.actionTarget={...target};this.npcRoutes.delete(npc.id)}}}
  findOpenPosition(x,y,solids,occupied){const clear=(px,py)=>px>12&&py>12&&px<this.map.widthInPixels-12&&py<this.map.heightInPixels-12&&!solids.some(r=>px+9>r.x&&px-9<r.x+r.width&&py+5>r.y&&py-5<r.y+r.height)&&!occupied.some(p=>Math.hypot(px-p.x,py-p.y)<19);if(clear(x,y))return{x,y};for(let r=16;r<200;r+=16)for(let i=0;i<24;i++){const a=i*Math.PI/12,px=Math.round((x+Math.cos(a)*r)/8)*8,py=Math.round((y+Math.sin(a)*r)/8)*8;if(clear(px,py))return{x:px,y:py}}return{x,y}}
  initLivingTimber(){
    const environment=this.populationWorld.environment;
    environment.timberSources??=[];
    this.livingTimberSprites=new Map();
    for(const sprite of this.windSprites){
      if(sprite.getData('windKind')!=='ancient-v2')continue;
      const prop=sprite.getData('tiledObject'),id='timber:'+prop.id;
      if(!environment.timberSources.some(source=>source.id===id)){
        const point=this.findOpenPosition(sprite.x,prop.y+36,this.collisionRects,[]);
        environment.timberSources.push({id,x:point.x,y:point.y});
      }
      this.livingTimberSprites.set(id,sprite);
    }
    this.refreshLivingTimber();
  }
  refreshLivingTimber(){
    for(const source of this.populationWorld.environment.timberSources??[]){
      const sprite=this.livingTimberSprites?.get(source.id);
      if(!sprite)continue;
      if(source.renewAt!==undefined){
        sprite.setData('livingStump',true);
        if(sprite.frame.name!==10)sprite.setFrame(10);
      }else if(sprite.getData('livingStump')){
        sprite.setData('livingStump',false);sprite.setData('windFrame',-1);
      }
    }
  }
  updateLivingTimber(){
    const world=this.populationWorld,{day,minute}=world.clock,now=day*1440+minute;
    const sources=world.environment.timberSources??[],reserved=new Set();
    for(const source of sources)if(source.renewAt!==undefined&&now>=source.renewAt)source.renewAt=undefined;
    for(const npc of world.npcs){
      if(!npc.alive||npc.populationRole!=='commoner'||npc.profession!=='dan_thuong'||(npc.aiProfile?.seed??1)%4!==0||npc.authorityRole||npc.id===this.possessedNpcId)continue;
      if(npc.timberSourceId){
        if(npc.hunger>=68||npc.fatigue>=75||npc.safety<40||npc.hp<cultivationStats(npc).hpMax*.45||minute>=1140||minute<480||!sources.some(s=>s.id===npc.timberSourceId&&s.renewAt===undefined)){
          npc.timberSourceId=undefined;npc.decisionSlot=undefined;
        }else reserved.add(npc.timberSourceId);
      }
    }
    for(const npc of world.npcs){
      if(!npc.alive||npc.populationRole!=='commoner'||npc.profession!=='dan_thuong'||(npc.aiProfile?.seed??1)%4!==0||npc.authorityRole||npc.id===this.possessedNpcId||npc.timberSourceId||npc.hunger>=56||npc.fatigue>=65||npc.safety<45||npc.hp<cultivationStats(npc).hpMax*.5||minute<480||minute>=1080||npc.inventory.some(i=>i.itemId==='wood'&&i.count>0))continue;
      const source=sources.filter(s=>s.renewAt===undefined&&!reserved.has(s.id)&&this.canReachPoint(npc,s)).sort((a,b)=>Math.hypot(a.x-npc.x,a.y-npc.y)-Math.hypot(b.x-npc.x,b.y-npc.y))[0];
      if(!source)continue;
      reserved.add(source.id);npc.timberSourceId=source.id;npc.goalAction='work';
      npc.actionTarget={x:source.x,y:source.y};npc.actionProgress=0;
      npc.shortGoal='Đến cây để đốn gỗ';npc.decisionSlot='timber:'+source.id;
      npc.aiDecision={at:now,action:'work',reason:'Có cây đã lớn, còn sức và đến giờ lấy gỗ.',scores:[]};
    }
    this.refreshLivingTimber();
  }
  setNpcGoalTarget(npc){if(npc.goalAction==='flee'&&this.faunaNow()<(npc.faunaEvadeUntil??0))return npc.actionTarget;if(npc.goalAction==='shop'||npc.decisionSlot?.endsWith(':herb-craft'))return this.markers.find(m=>m.id==='apothecary-entrance')??npc.actionTarget;
    if(npc.goalAction==='trade'&&['tho_re','dan_su'].includes(npc.profession)){
      const place=npc.profession==='tho_re'?'forge-entrance':'apothecary-entrance';
      return this.markers.find(m=>m.id===place)??npc.actionTarget;
    }
    if(npc.goalAction==='trade'&&npc.populationRole==='merchant')return this.markers.find(m=>m.id===npc.stallId+'-vendor')??npc.actionTarget;
    if(npc.goalAction==='work'&&!npc.timberSourceId){
      const facility=npc.profession==='tho_re'?'forge-entrance':['dan_su','duoc_su'].includes(npc.profession)?'apothecary-entrance':null;
      if(facility&&!npc.assignedCommissionId&&!npc.decisionSlot?.startsWith('env-repair:'))return this.markers.find(m=>m.id===facility)??npc.actionTarget;
      const duty=SPECIAL_DUTIES[npc.populationRole]??PROFESSION_BEHAVIORS[npc.profession];
      const marker=duty?.action==='work'&&this.markers.find(m=>m.id===duty.station);
      if(marker)return marker;
    }if(npc.goalAction==='farm'&&npc.populationRole){const hasSeed=npc.inventory.some(i=>i.itemId==='rice_seed'&&i.count>0);const seedStore=this.populationWorld.factions.find(f=>f.id==='qingyun-village')?.treasury.some(i=>i.itemId==='rice_seed'&&i.count>0);
      return hasSeed?(npc.workPosition??npc.actionTarget):(this.markers.find(m=>m.id===(seedStore?'south-outskirts':'city-center'))??npc.actionTarget)}if(npc.timberSourceId){const source=this.populationWorld.environment.timberSources?.find(s=>s.id===npc.timberSourceId);if(source)return source}if(npc.goalAction==='trade'&&['nong_dan','duoc_su','dan_thuong'].includes(npc.profession)&&npc.populationRole){
      const marker=npc.profession==='nong_dan'?'south-outskirts':npc.profession==='duoc_su'?'apothecary-entrance':npc.inventory.some(i=>i.itemId==='wood'&&i.count>0)?'lumber-yard':'provisions-entrance';
      return this.markers.find(m=>m.id===marker)??npc.actionTarget;
    }
    if(npc.goalAction==='rest'){
      const slot=this.workstations?.claims.get(npc.id);
      if(slot?.action==='rest'&&slot.refuge)return{x:slot.anchorX,y:slot.anchorY,refuge:true};
      const threatened=this.groundOccupancy&&[...this.groundOccupancy.near(npc.x,npc.y,88)].some(body=>body.actor.species==='snake'||body.actor.species==='scorpion');
      if(npc.pathBlocked&&npc.fatigue>=84&&!threatened)return{x:npc.x,y:npc.y,refuge:true};
      return npc.home??npc.actionTarget;
    }if(npc.goalAction==='eat'&&!npc.faunaHuntTargetId){if(npc.inventory.some(i=>(i.itemId==='ration'||i.itemId==='deer_meat')&&i.count>0))return npc.actionTarget;const factions=this.populationWorld.factions;
      if(npc.home&&factions.some(f=>(f.name===npc.faction||f.id==='qingyun-village')&&f.treasury.some(i=>i.itemId==='ration'&&i.count>0)))return npc.home;
      const stored=this.workstations?.claims.get(npc.id);
      if(stored?.action==='eat'&&!npc.pathBlocked)return {x:stored.anchorX,y:stored.anchorY};
      const places=this.markers.filter(m=>m.id==='tavern-entrance'||m.id==='provisions-entrance').filter(m=>this.canReachPoint(npc,m));
      return places.sort((a,b)=>Math.hypot(a.x-npc.x,a.y-npc.y)-Math.hypot(b.x-npc.x,b.y-npc.y))[0]??npc.workPosition??npc.actionTarget;
    }if(npc.populationRole==='herb_gatherer'){const danger=(this.populationWorld.environment?.fauna??[]).filter(f=>f.alive&&f.species!=='deer'&&Math.hypot(f.x-npc.x,f.y-npc.y)<105).sort((a,b)=>Math.hypot(a.x-npc.x,a.y-npc.y)-Math.hypot(b.x-npc.x,b.y-npc.y))[0];if(danger){const dx=npc.x-danger.x,dy=npc.y-danger.y,d=Math.max(1,Math.hypot(dx,dy));npc.goalAction='flee';npc.shortGoal='Rút khỏi yêu thú gần đây';return this.findOpenPosition(npc.x+dx/d*100,npc.y+dy/d*100,this.collisionRects,[])}}if(npc.faunaHuntTargetId){const f=this.populationWorld.environment?.fauna?.find(x=>x.id===npc.faunaHuntTargetId);if(f?.alive)return this.hunterApproach(npc,f);const drop=this.populationWorld.environment?.drops?.find(d=>d.sourceId===npc.faunaHuntTargetId&&d.status==='ground');if(drop)return{x:drop.x,y:drop.y}}if(npc.lawResponse?.status==='responding'||npc.lawResponse?.status==='at-scene'){const target=this.populationWorld.npcs.find(n=>n.id===npc.lawResponse.targetId&&n.alive);if(target)return{x:target.x,y:target.y}}if(npc.assignedCommissionId||npc.decisionSlot==='commission-board'){const c=this.populationWorld.commissions?.find(x=>x.commissionId===(npc.assignedCommissionId??npc.professionTask?.targetId));return npc.decisionSlot==='commission-board'?(this.populationWorld.commissionBoard??npc.actionTarget):c?.target??npc.actionTarget}if(npc.populationRole==='herb_gatherer'&&npc.assignedResourceNodeId){const node=this.populationWorld.environment?.resourceNodes?.find(x=>x.id===npc.assignedResourceNodeId);if(node)return{x:node.x,y:node.y}}let id='city-center';if(npc.authorityRole==='city_master')id='city-hall-entrance';else if(npc.populationRole==='merchant'&&(npc.goalAction==='trade'||npc.goalAction==='shop'))id=npc.stallId;else if(npc.populationRole==='tavern_staff')id='tavern-entrance';else if(npc.populationRole==='quest_clerk'||npc.populationRole==='repair_worker')id='quest-office';else if(npc.populationRole==='city_guard'&&npc.patrolPoints?.length)id=null;else if(npc.goalAction==='cultivate')id='sect-yard';else if(npc.goalAction==='farm')id='south-outskirts';else if(npc.goalAction==='mission'||npc.goalAction==='recruit')id='sect-yard';else if(npc.goalAction==='gather')id=npc.populationRole==='herb_gatherer'?'forest-outer':'south-outskirts';else if(npc.goalAction==='eat'||npc.goalAction==='trade'||npc.goalAction==='work')id=npc.populationRole==='repair_worker'||npc.populationRole==='quest_clerk'?'quest-office':npc.populationRole==='tavern_staff'?'tavern-entrance':'city-center';else if(npc.goalAction==='rest'||npc.goalAction==='flee'||npc.goalAction==='idle')return npc.home;let target;if(npc.populationRole==='city_guard'&&npc.patrolPoints?.length){const p=npc.patrolPoints[npc.patrolIndex??0];target={x:p.x,y:p.y}}else if(npc.workPosition)target=npc.workPosition;else{const marker=this.markers.find(m=>m.id===id)||this.markers.find(m=>m.id==='city-center');target=marker?{x:marker.x,y:marker.y}:npc.actionTarget}return target}
  urgentNpcIds() {
    const ids=new Set();
    for(const npc of this.populationWorld.npcs) {
      if(npc.faunaHuntTargetId||npc.lawResponse||npc.goalAction==='fight'||npc.goalAction==='flee'||
        /^(duel:|mandate:|board:)/.test(npc.decisionSlot??''))ids.add(npc.id);
    }
    for(const fauna of this.populationWorld.environment.fauna) {
      if(fauna.alive&&fauna.targetNpcId)ids.add(fauna.targetNpcId);
    }
    return ids;
  }
  updatePopulation(time,delta,maxDelta=250) {
    const world=this.populationWorld,dt=Math.min(Math.max(delta,0),maxDelta);
    this.frameSamples.push(dt);
    if(this.frameSamples.length>180)this.frameSamples.shift();
    this.metricWindowMs=(this.metricWindowMs??0)+dt;
    if(this.metricWindowMs>=1000){this.metricWindowMs%=1000;this.pathfindingCalls=0;this.collisionChecks=0;this.goalEvaluations=0}
    const simDelta=dt*(world.clock.speed===2||world.clock.speed===4?world.clock.speed:1);
    const workSlices=Math.max(1,Math.ceil(simDelta/125));
    this.worldMoveBudget=Math.max(480,simDelta+420);
    this.populationTick+=simDelta;
    this.populationSaveTick+=dt;
    while(this.populationTick>=1000){
      this.populationTick-=1000;
      if(++world.clock.minute>=1440){world.clock.minute=0;world.clock.day++}
      this.workstations.prune(world.npcs,this.possessedNpcId);
      this.scheduler.accrueMinute(this.possessedNpcId,npc=>this.workstations.claims.has(npc.id)?12:25);
      this.populationSimulation.tickShared(this.possessedNpcId);
      const professionWorld=this.possessedNpcId?{...world,npcs:world.npcs.filter(n=>n.id!==this.possessedNpcId)}:world;
      tickWorldRebuildProfessionWork(professionWorld,world.commissionBoard??{x:2928,y:2160},(from,to)=>this.canReachPoint(from,to));
      if(world.clock.minute%10===0)this.updateLivingTimber();
      this.refreshLivingTimber();
      this.refreshProfessionVisuals();
    }
    const collisionStarted=performance.now();
    this.syncGroundOccupancy();
    // Old saves can contain actors standing at the same coordinates. Separate
    // them with short legal steps, keeping their current destination.
    if((this.groundRecoverAt??0)<=this.scheduler.time){
      this.groundRecoverAt=this.scheduler.time+180;
      for(const body of this.groundOccupancy.recover()){
        body.actor.x=body.x;body.actor.y=body.y;
        const sprite=this.npcSprites.get(body.id)??this.faunaSprites.get(body.id);
        sprite?.setPosition(body.x,body.y).setDepth(body.y);
      }
    }
    this.groundCollisionMs=performance.now()-collisionStarted;
    const {moving,thinking}=this.scheduler.advance(simDelta,this.cameras.main.worldView,this.possessedNpcId,this.urgentNpcIds());
    const aiStart=performance.now();
    let decisions=0;
    for(const entry of thinking){
      if(decisions>=10*workSlices||(decisions>0&&performance.now()-aiStart>=2*workSlices))break;
      const npc=entry.npc,target=npc.actionTarget??npc.home??npc;
      const eligible=entry.workKey===npc.goalAction+':'+target.x+':'+target.y;
      this.populationSimulation.tickNpc(npc,entry.minutes,world.clock.day,world.clock.minute,eligible&&!entry.waitingForSlot?entry.workMinutes:0);
      const goal=this.resolveWorkstation(entry,this.setNpcGoalTarget(npc));
      if(goal&&Math.hypot(npc.actionTarget.x-goal.x,npc.actionTarget.y-goal.y)>4)npc.actionTarget={x:goal.x,y:goal.y};
      this.scheduler.finishDecision(entry);
      decisions++;
    }
    this.goalEvaluations+=decisions;
    this.populationAiCost=performance.now()-aiStart;
    this.aiCostSamples.push(this.populationAiCost);
    if(this.aiCostSamples.length>180)this.aiCostSamples.shift();
    for(const entry of this.scheduler.byId.values()){
      const sprite=this.npcSprites.get(entry.npc.id);
      if(!sprite||sprite.visible===entry.visible)continue;
      sprite.setVisible(entry.visible);
      if(sprite.input)sprite.input.enabled=entry.visible;
      if(entry.visible){sprite.setDepth(sprite.y);sprite.anims.resume()}else sprite.anims.pause();
    }
    this.routesStartedThisFrame=0;
    this.routeLimit=6*workSlices;
    this.routeDeadline=performance.now()+4*workSlices;
    this.routeTimeThisFrame=0;
    let moved=0;
    for(const entry of moving)if(this.moveAutonomousNpc(entry))moved++;
    this.lastNpcUpdates={moved,decisions,queued:thinking.length-decisions};
    const inputDelta=Math.min(dt,60);
    this.updatePossessedPlayer(inputDelta);
    this.heavenActions.updateFishing();
    this.heavenActions.updateShots(inputDelta);
    this.heavenActions.updateGuards();
    this.tickFauna(simDelta);
    this.tickFaunaRespawns(simDelta);
    this.refreshFaunaVisibility();
    this.riverFishSystem?.update(inputDelta,this.cameras.main);
    this.tickCityLaw();
    if(this.ecologyDebugSection&&!this.ecologyDebugSection.hidden&&time-this.lastEcologyDebugAt>900){
      this.lastEcologyDebugAt=time;this.renderEcologyDebug();
    }
    if(this.populationSaveTick>=6500){this.populationSaveTick%=6500;this.requestBackgroundSave();this.renderPopulationDebug()}
  }
  resolveWorkstation(entry,goal){
    const {npc}=entry, eatingOwn=npc.goalAction==='eat'&&npc.inventory.some(i=>i.count>0&&(i.itemId==='ration'||i.itemId==='deer_meat'));
    if(eatingOwn||npc.timberSourceId||npc.faunaHuntTargetId||npc.lawResponse?.status==='responding'||npc.decisionSlot?.startsWith('mandate:')){
      this.workstations.release(npc.id);entry.waitingForSlot=false;return goal;
    }
    const current=this.workstations.claims.get(npc.id);
    const retryNearSlot=current&&goal&&this.scheduler.time-(entry.lastSlotRetry??0)>12000&&
      npc.pathBlocked&&Math.hypot(npc.x-current.x,npc.y-current.y)<95;
    if(retryNearSlot)entry.lastSlotRetry=this.scheduler.time;
    const slot=this.workstations.reserve(npc,goal,Boolean(retryNearSlot));
    entry.waitingForSlot=Boolean(goal&&!slot);
    return slot;
  }
  moveAutonomousNpc(entry) {
    const npc=entry.npc,sprite=this.npcSprites.get(npc.id);
    const delta=this.scheduler.elapsedForMove(entry,this.worldMoveBudget);
    if(!sprite||!delta||entry.waitingForSlot)return false;
    const finalTarget=npc.actionTarget??npc.home??npc;
    const passage=this.passageTraffic.guide(npc,finalTarget,this.scheduler.time);
    entry.passageWait=passage?.wait?passage.id:undefined;
    if(passage?.wait&&!this.groundPositionOpen(npc,passage.target.x,passage.target.y)){
      sprite.setData('moving',false);
      if(sprite.visible)sprite.play(this.npcTextureFor(npc)+'_idle_'+(entry.direction??'down'),true);
      return false;
    }
    const target=passage?.target??finalTarget;
    if(entry.retryTarget&&Math.hypot(entry.retryTarget.x-target.x,entry.retryTarget.y-target.y)>=16)entry.retryAt=0;
    if(entry.retryAt>this.scheduler.time)return false;
    if(!this.npcRoutes.has(npc.id)&&Math.hypot(target.x-sprite.x,target.y-sprite.y)<=(passage?2:this.workstations.claims.has(npc.id)?8:12)&&npc.goalAction!=='patrol'){if(!passage){npc.pathBlocked=false;entry.blockedSince=undefined}sprite.setData('moving',false);if(sprite.visible)sprite.play(this.npcTextureFor(npc)+'_idle_'+(entry.direction??'down'),true);return false}
    const cached=this.npcRoutes.get(npc.id);
    let route=cached&&Math.hypot(cached.target.x-target.x,cached.target.y-target.y)<8?cached.points:null;
    if(!route){
      const pathStart=performance.now();
      route=this.populationRoute(npc,sprite,target);
      this.routeTimeThisFrame+=performance.now()-pathStart;
    }
    if(!route)return false;
    const speed=npc.faunaHuntTargetId?96:npc.goalAction==='flee'?88:npc.populationRole==='city_guard'?30:36;
    let remaining=delta,blocked=false,direction=entry.direction??'down';
    const x=sprite.x,y=sprite.y;
    const goalTolerance=this.workstations.claims.has(npc.id)?8:12;
    const detour=entry.detour&&entry.detour.until>this.scheduler.time?entry.detour:null;
    while(remaining>0){
      const waypoint=detour??route[npc.routeIndex]??target;
      const dx=waypoint.x-sprite.x,dy=waypoint.y-sprite.y,d=Math.hypot(dx,dy);
      if(!detour&&npc.routeIndex<route.length){
        if(d<=2.5){npc.routeIndex++;continue;}
      }else if(d<=(detour?4:passage?2:goalTolerance))break;
      const dt=Math.min(60,remaining);
      const step=Math.min(d,speed*dt/1000),vx=dx/d,vy=dy/d;
      // Short collision steps apply even when an actor is advanced in batches outside the camera.
      const move=this.moveOnGround(npc,sprite,sprite.x+vx*step,sprite.y+vy*step);
      if(!move){blocked=true;break}
      sprite.setPosition(move.x,move.y);
      direction=Math.abs(vx)>Math.abs(vy)?(vx<0?'left':'right'):(vy<0?'up':'down');
      remaining-=dt;
    }
    npc.x=sprite.x;npc.y=sprite.y;
    entry.direction=direction;
    const walking=x!==npc.x||y!==npc.y;
    sprite.setData('moving',walking);
    const localGoal=route[npc.routeIndex]??target;
    const stalled=walking&&!detour&&Math.hypot(localGoal.x-npc.x,localGoal.y-npc.y)>=Math.hypot(localGoal.x-x,localGoal.y-y)-.05;
    if(stalled)entry.blockedSince??=this.scheduler.time;
    if(blocked||(stalled&&this.scheduler.time-entry.blockedSince>=800)){
      entry.blockedSince??=this.scheduler.time;
      if(!detour&&this.scheduler.time-entry.blockedSince>=700){
        const angle=Math.atan2(target.y-y,target.x-x), side=entry.index%2?1:-1;
        for(const turn of [Math.PI/2*side,-Math.PI/2*side,Math.PI]){
          const px=x+Math.cos(angle+turn)*24,py=y+Math.sin(angle+turn)*24;
          if(!this.groundPositionOpen(npc,px,py)||!this.clearFaunaLine(sprite,{x:px,y:py}))continue;
          entry.detour={x:px,y:py,until:this.scheduler.time+900};
          entry.blockedSince=this.scheduler.time;break;
        }
      }
      npc.pathBlocked=true;
      this.npcRoutes.delete(npc.id);
      npc.routeIndex=0;
      entry.retryAt=this.scheduler.time+[380,900,1800][entry.level];
      entry.retryTarget={...target};
    }else if(walking){
      if(!stalled&&!detour)entry.blockedSince=undefined;
      npc.pathBlocked=false;
      npc.action='travel';
    }else if(npc.goalAction==='patrol'&&npc.populationRole==='city_guard'&&npc.actionProgress>20&&npc.patrolPoints?.length){
      npc.patrolIndex=((npc.patrolIndex??0)+1)%npc.patrolPoints.length;
      npc.actionTarget=this.setNpcGoalTarget(npc)??target;
    }
    if(sprite.visible){if(sprite.depth!==sprite.y)sprite.setDepth(sprite.y);sprite.play(`${this.npcTextureFor(npc)}_${walking?'walk':'idle'}_${direction}`,true)}
    if(this.selectedNpcId===npc.id&&this.npcLabel.visible){
      this.npcLabel.setPosition(sprite.x,sprite.y-48);
      if(this.npcLabel.depth!==sprite.y+10)this.npcLabel.setDepth(sprite.y+10);
    }
    if(sprite.visible||this.populationDebug&&!this.populationDebug.hidden)this.trackNpcMotion(npc,sprite);
    return true;
  }
  clearFaunaLine(a,b){const distance=Math.hypot(b.x-a.x,b.y-a.y),steps=Math.ceil(distance/12);for(let i=1;i<steps;i++){const t=i/steps;if(!this.canOccupy(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t))return false}return true}
  facePoint(from,to){const dx=to.x-from.x,dy=to.y-from.y;const direction=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');if(from.id===this.possessedNpcId)this.playerFacing=direction;return direction}
  handlePossessedAction(key) {
    const npc=this.populationWorld.npcs.find(n=>n.id===this.possessedNpcId&&n.alive);
    if(!npc)return;
    const rig=this.characterRigPreview?.npc===npc?this.characterRigPreview:null;
    if(key==='M')return rig?.toggleMount();
    if(rig?.mount.locked)return;
    if(key==='Q'||key==='R'){
      const combat=rig?.character.combat;
      if(combat?.weapon!=='crossbow'||combat.action)return;
      if(key==='Q')combat.aim=!combat.aim;
      else if(!combat.loaded)combat.start('crossbowReload',this.playerFacing);
      return;
    }
    if(key==='F'&&rig?.mount.attached)return this.worldPopulationToast('Hãy xuống Huyền Hổ trước khi câu cá.');
    if(key==='F')return this.heavenActions.fish(npc);
    if(key==='J'&&rig?.attack())return;
    if(key==='J')return this.heavenActions.fire(npc,null);
    if(npc.activeHeavenSkill)return this.heavenActions.fire(npc,npc.activeHeavenSkill);
    this.worldPopulationToast('Chọn võ kỹ đã học trong bảng nhập thân để gán vào K.');
  }
  updatePossessedPlayer(dt){if(!this.possessedNpcId)return;const npc=this.populationWorld.npcs.find(n=>n.id===this.possessedNpcId),sprite=this.npcSprites.get(this.possessedNpcId);if(!npc?.alive||!sprite){this.endPossession('NPC đã tử vong; nhập thân kết thúc theo trạng thái thật.');return}if(this.scheduler.byId.get(npc.id)?.visible&&!sprite.visible){sprite.setVisible(true);sprite.anims.resume()}const status=PossessionSystem.tick(this.populationWorld.heaven,npc,dt);if(status==='depleted'||status==='dead'){this.endPossession(status==='dead'?'NPC đã tử vong; nhập thân kết thúc.':'Thần Lực chu kỳ đã cạn; nhập thân kết thúc.');return}let dx=0,dy=0;if(this.keys?.A?.isDown||this.keys?.LEFT?.isDown)dx--;if(this.keys?.D?.isDown||this.keys?.RIGHT?.isDown)dx++;if(this.keys?.W?.isDown||this.keys?.UP?.isDown)dy--;if(this.keys?.S?.isDown||this.keys?.DOWN?.isDown)dy++;const rig=this.characterRigPreview?.npc===npc?this.characterRigPreview:null;const moving=!rig?.mount.locked&&(dx!==0||dy!==0);if(moving){this.heavenActions.stopFishing();this.cameraFollowSuspended=false;const length=Math.hypot(dx,dy);dx/=length;dy/=length;this.playerFacing=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');const mounted=rig?.mount.attached;const speed=mounted?(this.keys?.SHIFT?.isDown?234:155):(this.keys?.SHIFT?.isDown?178:118);const x=sprite.x+dx*speed*dt/1000,y=sprite.y+dy*speed*dt/1000;const move=mounted?rig.moveMounted(x,y):this.moveOnGround(npc,sprite,x,y);if(move){sprite.setPosition(move.x,move.y).setDepth(move.y);npc.x=move.x;npc.y=move.y;npc.action='travel';npc.shortGoal='Đang được Thiên Đạo điều khiển';sprite.setData('moving',true);sprite.play(`${this.npcTextureFor(npc)}_walk_${this.playerFacing}`,true)}else{sprite.setData('moving',false);sprite.play(`${this.npcTextureFor(npc)}_idle_${this.playerFacing}`,true)}}else{sprite.setData('moving',false);npc.x=sprite.x;npc.y=sprite.y;sprite.play(`${this.npcTextureFor(npc)}_idle_${this.playerFacing}`,true)}if(!this.cameraFollowSuspended)this.cameras.main.centerOn(npc.x,npc.y);this.clampCamera();this.playerAttackCooldown=Math.max(0,this.playerAttackCooldown-dt/1000);this.playerSkillCooldown=Math.max(0,this.playerSkillCooldown-dt/1000);
    updateSkillStatus(this,npc);
    if(Phaser.Input.Keyboard.JustDown(this.keys.E)){const drop=(this.populationWorld.environment.drops??[]).filter(d=>d.status==='ground').sort((a,b)=>Math.hypot(npc.x-a.x,npc.y-a.y)-Math.hypot(npc.x-b.x,npc.y-b.y))[0];if(!drop)this.worldPopulationToast('Không có vật phẩm rơi gần đây.');else if(Math.hypot(npc.x-drop.x,npc.y-drop.y)>32)this.worldPopulationToast('Tiến sát chiến lợi phẩm rồi nhấn E để nhặt.');else{const result=this.claimFaunaDropForNpc(drop.id,npc.id,`possessed-pickup:${createWorldUuid()}`);this.worldPopulationToast(result?`Đã nhặt ${result.itemId} ×${result.count} vào túi ${npc.name}.`:'Vật phẩm đã được nhặt hoặc không còn hợp lệ.');this.refreshHud()}}
    if(Phaser.Input.Keyboard.JustDown(this.keys.ESC))this.endPossession();}
  tickCityLaw(){const start=performance.now();if(this.populationWorld?.cityLaw)for(const incident of this.populationWorld.cityLaw.incidents){if(incident.status!=='responding')continue;const ids=[...incident.responderIds,...(incident.cityMasterDispatched?[this.populationWorld.authority.cityMasterId]:[])];for(const id of ids){const responder=this.populationWorld.npcs.find(n=>n.id===id),target=this.populationWorld.npcs.find(n=>n.id===incident.suspectId);if(!responder?.lawResponse||!target?.alive)continue;const sprite=this.npcSprites.get(id);if(sprite&&Math.hypot(sprite.x-target.x,sprite.y-target.y)<52)markCityIncidentAtScene(this.populationWorld,incident.id,id)}if(incident.status==='contained'){this.cityLawTimers??=new Map();if(!this.cityLawTimers.has(incident.id))this.cityLawTimers.set(incident.id,performance.now());else if(performance.now()-this.cityLawTimers.get(incident.id)>1800){clearCityResponse(this.populationWorld,incident.id);this.cityLawTimers.delete(incident.id);this.persistPopulation()}}}this.cityLawCostMs=performance.now()-start;this.cityLawCostSamples??=[];this.cityLawCostSamples.push(this.cityLawCostMs);if(this.cityLawCostSamples.length>180)this.cityLawCostSamples.shift()}
  populationRoute(npc,sprite,target){
    const cached=this.npcRoutes.get(npc.id);if(cached&&Math.hypot(cached.target.x-target.x,cached.target.y-target.y)<8)return cached.points;
    // A route search is synchronous. Limit the work started in one frame without slowing collision or input updates.
    if(this.routeDeadline!==undefined &&
      (this.routesStartedThisFrame>=(this.routeLimit??6) || (this.routesStartedThisFrame>0 && performance.now()>=this.routeDeadline)))return null;
    this.routesStartedThisFrame=(this.routesStartedThisFrame??0)+1;
    this.pathfindingCalls++;const cell=this.navCell,cols=this.navCols,rows=this.navRows,total=cols*rows,startX=Math.floor(sprite.x/cell),startY=Math.floor(sprite.y/cell),goalX=Math.floor(target.x/cell),goalY=Math.floor(target.y/cell),key=(x,y)=>y*cols+x;let start=key(startX,startY),goal=key(goalX,goalY);
    if(this.navBlocked[goal]){for(let r=1;r<=4&&this.navBlocked[goal];r++)for(let dy=-r;dy<=r&&this.navBlocked[goal];dy++)for(let dx=-r;dx<=r&&this.navBlocked[goal];dx++){const x=goalX+dx,y=goalY+dy;if(x>=0&&y>=0&&x<cols&&y<rows&&!this.navBlocked[key(x,y)])goal=key(x,y)}}
    if(this.navBlocked[start]){const originX=start%cols,originY=Math.floor(start/cols),component=this.navComponentAt(sprite),candidates=[];for(let r=1;r<=6&&!candidates.length;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const x=originX+dx,y=originY+dy;if(x<0||y<0||x>=cols||y>=rows)continue;const candidate=key(x,y);if(!this.navBlocked[candidate]&&this.navComponents[candidate]===component)candidates.push(candidate)}if(candidates.length)start=candidates.sort((a,b)=>Math.hypot(a%cols-originX,Math.floor(a/cols)-originY)-Math.hypot(b%cols-originX,Math.floor(b/cols)-originY))[0]}
    if(this.navBlocked[start]||this.navComponents[start]!==this.navComponents[goal]){npc.pathBlocked=true;const points=[target];this.npcRoutes.set(npc.id,{target:{...target},points});npc.routeIndex=0;return points}
    const workspace=this.routeWorkspace??={previous:new Int32Array(total),gScore:new Float32Array(total),closed:new Uint8Array(total),heapNodes:[],heapF:[]};
    const {previous,gScore,closed,heapNodes,heapF}=workspace;
    previous.fill(-1);gScore.fill(Infinity);closed.fill(0);heapNodes.length=0;heapF.length=0;
    const heuristic=k=>Math.abs(k%cols-goal%cols)+Math.abs(Math.floor(k/cols)-Math.floor(goal/cols));
    const push=(node,f)=>{let i=heapNodes.length;heapNodes.push(node);heapF.push(f);while(i>0){const parent=(i-1)>>1;if(heapF[parent]<=f)break;heapNodes[i]=heapNodes[parent];heapF[i]=heapF[parent];i=parent}heapNodes[i]=node;heapF[i]=f};
    const pop=()=>{const node=heapNodes[0],lastNode=heapNodes.pop(),lastScore=heapF.pop();if(heapNodes.length){let i=0;while(true){let child=i*2+1;if(child>=heapNodes.length)break;if(child+1<heapNodes.length&&heapF[child+1]<heapF[child])child++;if(heapF[child]>=lastScore)break;heapNodes[i]=heapNodes[child];heapF[i]=heapF[child];i=child}heapNodes[i]=lastNode;heapF[i]=lastScore}return node};
    previous[start]=start;gScore[start]=0;push(start,heuristic(start));let expanded=0;
    while(heapNodes.length&&!closed[goal]&&expanded<total){const node=pop();if(closed[node])continue;closed[node]=1;expanded++;if(node===goal)break;const x=node%cols,y=Math.floor(node/cols);for(const[dx,dy]of CARDINAL_STEPS){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=cols||ny>=rows)continue;const next=key(nx,ny);if(this.navBlocked[next]||closed[next])continue;const score=gScore[node]+1;if(score>=gScore[next])continue;gScore[next]=score;previous[next]=node;push(next,score+heuristic(next))}}
    let points=[];if(previous[goal]>=0){const cells=[];for(let at=goal;;at=previous[at]){cells.push({x:(at%cols+.5)*cell,y:(Math.floor(at/cols)+.5)*cell});if(at===start)break}cells.reverse();points=[cells[0]];for(let i=1;i<cells.length-1;i++){const a=cells[i-1],b=cells[i],c=cells[i+1];if(Math.sign(b.x-a.x)!==Math.sign(c.x-b.x)||Math.sign(b.y-a.y)!==Math.sign(c.y-b.y))points.push(b)}if(cells.length>1)points.push(cells.at(-1))}else points=[target];
    this.npcRoutes.set(npc.id,{target:{...target},points});npc.routeIndex=0;npc.pathBlocked=previous[goal]<0&&Math.hypot(sprite.x-target.x,sprite.y-target.y)>30;return points
  }
  canOccupy(x,y){this.collisionChecks++;const cell=this.navCell,cols=this.navCols,rows=this.navRows;for(const [dx,dy]of FOOTPRINT){const gx=Math.floor((x+dx)/cell),gy=Math.floor((y+dy)/cell);if(gx<0||gy<0||gx>=cols||gy>=rows||this.navBlocked[gy*cols+gx])return false}return true}
  syncGroundOccupancy(){
    const rig=this.characterRigPreview;
    const parked=[];
    if(rig&&(rig.mount.state==='parked'||rig.mount.state==='entering')){
      const mount=this.parkedMount??={id:'parked-tiger',species:'tiger',alive:true,fixed:true};
      mount.x=rig.mount.x;mount.y=rig.mount.y;parked.push(mount);
    }
    this.groundOccupancy.sync(this.populationWorld.npcs,this.populationWorld.environment.fauna??[],rig?.mount.attached?rig.npc.id:null,parked);
  }
  footprintTerrainOpen(x,y,hw,hh,fauna=false){
    const gx0=Math.floor((x-hw)/this.navCell),gx1=Math.floor((x+hw-.001)/this.navCell);
    const gy0=Math.floor((y-hh)/this.navCell),gy1=Math.floor((y+hh-.001)/this.navCell);
    if(gx0<0||gy0<0||gx1>=this.navCols||gy1>=this.navRows)return false;
    for(let gy=gy0;gy<=gy1;gy++)for(let gx=gx0;gx<=gx1;gx++){
      const cell=gy*this.navCols+gx;
      if(!this.navBlocked[cell])continue;
      const rects=this.collisionByCell.get(cell);
      if(!rects)return false;
      for(const r of rects)if(x+hw>r.x&&x-hw<r.x+r.width&&y+hh>r.y&&y-hh<r.y+r.height)return false;
    }
    if(fauna){
      this.faunaWaterLayer??=this.map.layers.find(layer=>layer.name==='Water');
      if(this.faunaWaterLayer?.data[Math.floor(y/32)]?.[Math.floor(x/32)]?.index>=0&&!(this.roadLayer?.data[Math.floor(y/32)]?.[Math.floor(x/32)]?.index>=0))return false;
    }
    return true;
  }
  groundPositionOpen(actor,x,y,mounted=false,ignoreId){
    const footprint=groundFootprint(actor,mounted);
    return this.groundOccupancy?this.groundOccupancy.open({id:actor.id,ignoreId,...footprint},x,y):
      this.footprintTerrainOpen(x,y,footprint.width/2,footprint.height/2,Boolean(actor.species));
  }
  moveOnGround(actor,sprite,x,y,allowAvoid=true){
    const body=this.groundOccupancy?.bodies.get(actor.id);
    if(!body)return null;
    if(body.x!==sprite.x||body.y!==sprite.y)this.groundOccupancy.place(body,sprite.x,sprite.y);
    const started=performance.now(),move=this.groundOccupancy.advance(body,x,y,allowAvoid);
    this.groundCollisionMs=(this.groundCollisionMs??0)+performance.now()-started;
    return move;
  }
  canOccupyOrSlide(x,y,sprite){const moved=(px,py)=>Math.hypot(px-sprite.x,py-sprite.y)>.05;if(moved(x,y)&&this.canOccupy(x,y))return{x,y};if(moved(x,sprite.y)&&this.canOccupy(x,sprite.y))return{x,y:sprite.y};if(moved(sprite.x,y)&&this.canOccupy(sprite.x,y))return{x:sprite.x,y};const dx=x-sprite.x,dy=y-sprite.y,distances=[4,8,12,16,24,32],sideSteps=[];for(const step of distances){if(Math.abs(dx)>Math.abs(dy))sideSteps.push({x:sprite.x,y:sprite.y-step},{x:sprite.x,y:sprite.y+step});else sideSteps.push({x:sprite.x-step,y:sprite.y},{x:sprite.x+step,y:sprite.y})}const side=sideSteps.filter(point=>moved(point.x,point.y)&&this.canOccupy(point.x,point.y));return side.sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0]??null}
  buildNavigationComponents(){const total=this.navCols*this.navRows;this.navComponents=new Int32Array(total);this.navComponentSizes=[0];const queue=new Int32Array(total);let component=0;for(let start=0;start<total;start++){if(this.navBlocked[start]||this.navComponents[start])continue;component++;let head=0,tail=0;queue[tail++]=start;this.navComponents[start]=component;while(head<tail){const cur=queue[head++],x=cur%this.navCols,y=Math.floor(cur/this.navCols);for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=this.navCols||ny>=this.navRows)continue;const k=ny*this.navCols+nx;if(this.navBlocked[k]||this.navComponents[k])continue;this.navComponents[k]=component;queue[tail++]=k}}this.navComponentSizes[component]=tail}}
  navComponentAt(point){const gx=Math.floor(point.x/this.navCell),gy=Math.floor(point.y/this.navCell);if(gx<0||gy<0||gx>=this.navCols||gy>=this.navRows)return 0;const key=(x,y)=>y*this.navCols+x;if(!this.navBlocked[gy*this.navCols+gx])return this.navComponents[key(gx,gy)];for(let r=1;r<=4;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const x=gx+dx,y=gy+dy;if(x>=0&&y>=0&&x<this.navCols&&y<this.navRows&&!this.navBlocked[key(x,y)])return this.navComponents[key(x,y)]}return 0}
  canReachPoint(a,b){const x=this.navComponentAt(a),y=this.navComponentAt(b);return x>0&&x===y}
  bindCameraControls(){
    const canvas=this.game.canvas;canvas.style.touchAction='none';this.cameraInputAbort=new AbortController();const signal=this.cameraInputAbort.signal;canvas.addEventListener('contextmenu',event=>event.preventDefault(),{signal});
    canvas.addEventListener('pointerdown',event=>{if(event.target!==canvas||![0,1].includes(event.button))return;this.dragState={pointerId:event.pointerId,button:event.button,x:event.clientX,y:event.clientY,scrollX:this.cameras.main.scrollX,scrollY:this.cameras.main.scrollY,moved:false};try{canvas.setPointerCapture(event.pointerId)}catch{}},{capture:true,signal});
    canvas.addEventListener('pointermove',event=>{const drag=this.dragState;if(!drag||drag.pointerId!==event.pointerId)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(!drag.moved&&Math.hypot(dx,dy)<4)return;if(Math.hypot(dx,dy)>=4)drag.moved=true;if(drag.moved){event.preventDefault();this.cameras.main.setScroll(drag.scrollX-dx/this.cameras.main.zoom,drag.scrollY-dy/this.cameras.main.zoom);this.clampCamera()}},{signal});
    const finish=event=>{if(!this.dragState||this.dragState.pointerId!==event.pointerId)return;if(this.dragState.moved)this.lastWorldDragAt=performance.now();this.dragState=null;this.clampCamera()};canvas.addEventListener('pointerup',finish,{signal});canvas.addEventListener('pointercancel',finish,{signal});canvas.addEventListener('lostpointercapture',finish,{signal});
    this.input.on('wheel',(pointer,_objects,_dx,dy)=>this.setZoom(this.cameras.main.zoom*(dy>0?.9:1.11),pointer.x,pointer.y));
    this.input.keyboard?.on('keydown-C',()=>this.setCollisionVisible(!this.collisionVisible));
    for(const [key,id] of [['ONE','city'],['TWO','north'],['THREE','east'],['FOUR','south'],['FIVE','forest']])this.input.keyboard?.on(`keydown-${key}`,()=>{if(!this.possessedNpcId)this.gotoRegion(id)});
    document.querySelectorAll('[data-region]').forEach(button=>button.addEventListener('click',()=>this.gotoRegion(button.dataset.region)));
    document.querySelectorAll('[data-ecology-view]').forEach(button=>button.addEventListener('click',()=>this.gotoHabitat(button.dataset.ecologyView)));
    document.getElementById('world-zoom-in')?.addEventListener('click',()=>this.setZoom(this.cameras.main.zoom*1.2));
    document.getElementById('world-zoom-out')?.addEventListener('click',()=>this.setZoom(this.cameras.main.zoom/1.2));
    document.getElementById('world-collision')?.addEventListener('click',()=>this.setCollisionVisible(!this.collisionVisible));
    document.getElementById('open-living-world')?.addEventListener('click',()=>this.livingWorldPanel.open('journal'));
    document.getElementById('open-roster')?.addEventListener('click',()=>this.toggleDrawer('world-roster-panel'));
    document.getElementById('open-dev')?.addEventListener('click',event=>{this.toggleDrawer('world-dev-menu');event.currentTarget.setAttribute('aria-expanded',String(!document.getElementById('world-dev-menu').hidden))});
    document.querySelectorAll('[data-close-drawer]').forEach(button=>button.addEventListener('click',()=>{for(const id of ['world-map-menu','world-roster-panel','world-dev-menu'])document.getElementById(id).hidden=true}));
    document.getElementById('roster-search')?.addEventListener('input',()=>this.refreshRoster());
    document.getElementById('toggle-ai-debug')?.addEventListener('click',()=>{this.populationDebug.hidden=!this.populationDebug.hidden;const section=this.populationDebug.querySelector('section');section.hidden=this.populationDebug.hidden;if(!section.hidden)this.renderPopulationDebug();this.populationDebug.querySelector('button').setAttribute('aria-expanded',String(!this.populationDebug.hidden))});
    document.getElementById('toggle-ecology-debug')?.addEventListener('click',()=>{const panel=document.getElementById('ecology-debug');if(panel){panel.hidden=!panel.hidden;const section=panel.querySelector('section');section.hidden=panel.hidden;if(!panel.hidden)this.renderEcologyDebug()}});
  }
  update(time,delta){
    if(document.hidden)return;
    this.windClock+=Math.min(delta,60);this.updateWindFrames();
    const simulationStarted=performance.now();
    this.updatePopulation(time,delta);
    this.simulationMs=performance.now()-simulationStarted;
    const animationStarted=performance.now();
    if(this.characterRigPreview){
      const {npc}=this.characterRigPreview;
      this.characterRigPreview.sync(Math.min(delta,60),weaponForNpc(npc),rodEquipped(npc));
    }
    this.npcAppearanceFleet?.update(time,Math.min(delta,60));
    this.syncNPCModularVisuals();this.syncWeaponVisuals();
    this.animationMs=performance.now()-animationStarted;
    for(let i=0;i<this.flowSprites.length;i++){const sprite=this.flowSprites[i];if(!this.inSceneryView(sprite,80))continue;const frame=8+((Math.floor(time/sprite.getData('flowPeriod'))+sprite.getData('flowPhase'))%8);if(frame!==sprite.getData('flowFrame')){sprite.setFrame(frame);sprite.setData('flowFrame',frame)}}
    const speed=680*delta/1000/this.cameras.main.zoom;
    if(!this.possessedNpcId&&(this.keys?.A?.isDown||this.keys?.LEFT?.isDown))this.cameras.main.scrollX-=speed;
    if(!this.possessedNpcId&&(this.keys?.D?.isDown||this.keys?.RIGHT?.isDown))this.cameras.main.scrollX+=speed;
    if(!this.possessedNpcId&&(this.keys?.W?.isDown||this.keys?.UP?.isDown))this.cameras.main.scrollY-=speed;
    if(!this.possessedNpcId&&(this.keys?.S?.isDown||this.keys?.DOWN?.isDown))this.cameras.main.scrollY+=speed;
    if(this.keys?.PLUS?.isDown)this.setZoom(this.cameras.main.zoom*1.01);
    if(this.keys?.MINUS?.isDown)this.setZoom(this.cameras.main.zoom/1.01);
    this.clampCamera();
    this.updateSceneryVisibility();
    const cityFxStarted=performance.now();
    this.cityScenery.update(time,this.populationWorld.clock.minute);
    this.cityFxMs=performance.now()-cityFxStarted;
    this.terrainCache?.update(this.cameras.main);
    const uiStarted=performance.now();
    this.minimap?.update();if(time>=(this.nextWorldHudAt??0)){this.nextWorldHudAt=time+150;this.refreshHud()}
    if(this.collisionVisible&&time>=(this.nextGroundDraw??0)){this.nextGroundDraw=time+120;this.drawGroundDebug();}
    this.livingWorldPanel?.update(time);this.worldUiMs=performance.now()-uiStarted;this.performancePanel?.update(time,delta);
  }
  updateSceneryVisibility(){
    const camera=this.cameras.main,width=camera.width/camera.zoomX,height=camera.height/camera.zoomY;
    const x=camera.scrollX+camera.originX*(camera.width-width),y=camera.scrollY+camera.originY*(camera.height-height);
    if(this.sceneryView?.x===x&&this.sceneryView?.y===y&&this.sceneryView?.width===width&&this.sceneryView?.height===height)return;
    this.sceneryView={x,y,width,height};
    const pad=64;
    for(const bounds of this.sceneryBounds){
      const visible=bounds.left<=x+width+pad&&bounds.right>=x-pad&&bounds.top<=y+height+pad&&bounds.bottom>=y-pad;
      if(bounds.sprite.visible!==visible)bounds.sprite.setVisible(visible);
    }
  }
  stableHash(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
  inSceneryView(sprite,margin){
    const view=this.cameras.main.worldView;
    return sprite.x>=view.x-margin&&sprite.x<=view.right+margin&&sprite.y>=view.y-margin&&sprite.y<=view.bottom+margin;
  }
  updateWindFrames(){for(const sprite of this.windSprites){if(sprite.getData('livingStump')||!this.inSceneryView(sprite,160))continue;const durations=sprite.getData('windDurations'),frames=sprite.getData('windFrames'),period=sprite.getData('windPeriod');let t=(this.windClock+sprite.getData('windPhase'))%period,index=0;while(index<durations.length-1&&t>=durations[index]){t-=durations[index];index++}const frame=frames[index];if(sprite.getData('windFrame')!==frame){sprite.setFrame(frame);sprite.setData('windFrame',frame)}}}
  markerRegion(id){const aliases={city:'city',north:'north-mountain',east:'east-pasture',south:'south-suburb',forest:'forest-outer','forest-outer':'forest-outer','forest-middle':'forest-middle','forest-deep':'forest-deep'},regionId=aliases[id]??id;const object=(this.map.getObjectLayer('RegionMarkers')?.objects??[]).find(o=>this.prop(o,'regionId')===regionId);return object?{x:object.x+object.width/2,y:object.y+object.height/2,width:object.width,height:object.height}:null}
  gotoRegion(id,refresh=true){const region=this.markerRegion(id),fallback=REGION_CENTERS[id];if(!region&&!fallback)return false;const point=region??fallback,zoom=id==='city'?.55:id==='east'?.72:id==='north'?.78:.78;this.navigateCameraTo(point.x,point.y,'region',false,zoom);this.currentRegion=id==='forest-outer'||id==='forest-middle'||id==='forest-deep'?'forest':id;if(refresh)this.refreshHud();return true}
  navigateCameraTo(x,y,source='minimap',dragging=false,requestedZoom=null){const camera=this.cameras.main;if(this.cameraTween){this.cameraTween.stop();this.cameraTween=null}if(this.possessedNpcId){this.cameraFollowSuspended=source!=='return';camera.stopFollow()}let zoom=requestedZoom??camera.zoom;if(zoom<.31){zoom=this.lastExploreZoom??.78}if(zoom>.32)this.lastExploreZoom=zoom;if(Math.abs(camera.zoom-zoom)>.001)this.setZoom(zoom);const worldWidth=this.worldWidth??this.map.widthInPixels,worldHeight=this.worldHeight??this.map.heightInPixels,scrollX=Phaser.Math.Clamp(x-camera.width/(2*camera.zoom),0,Math.max(0,worldWidth-camera.width/camera.zoom)),scrollY=Phaser.Math.Clamp(y-camera.height/(2*camera.zoom),0,Math.max(0,worldHeight-camera.height/camera.zoom));if(dragging){camera.setScroll(scrollX,scrollY);this.clampCamera()}else this.cameraTween=this.tweens.add({targets:camera,scrollX,scrollY,duration:360,ease:'Cubic.easeOut',onUpdate:()=>this.clampCamera(),onComplete:()=>{this.cameraTween=null;this.clampCamera()}});this.refreshFaunaVisibility();this.minimap?.update(true);this.refreshHud();return{x:scrollX,y:scrollY,zoom}}
  showWorldOverview(){const width=this.worldWidth??this.map.widthInPixels,height=this.worldHeight??this.map.heightInPixels,fit=Math.min(this.scale.width/width,this.scale.height/height)*.98;if(this.possessedNpcId)this.cameraFollowSuspended=true;this.cameras.main.setZoom(fit).centerOn(width/2,height/2);this.clampCamera();this.minimap?.update(true);this.refreshHud();return fit}
  setZoom(zoom,x=this.scale.width/2,y=this.scale.height/2){const camera=this.cameras.main,target=Phaser.Math.Clamp(zoom,.18,1.8),before=camera.getWorldPoint(x,y);camera.setZoom(target);const after=camera.getWorldPoint(x,y);camera.scrollX+=before.x-after.x;camera.scrollY+=before.y-after.y;this.clampCamera();if(target>.32)this.lastExploreZoom=target;this.refreshFaunaVisibility();this.minimap?.update(true);this.refreshHud();return target}
  clampCamera(){if(!this.cameras?.main)return;const camera=this.cameras.main,width=this.worldWidth??this.map?.widthInPixels??WORLD.width,height=this.worldHeight??this.map?.heightInPixels??WORLD.height,maxX=width-camera.width/camera.zoom,maxY=height-camera.height/camera.zoom,minX=maxX<0?maxX/2:0,hiX=maxX<0?maxX/2:maxX,minY=maxY<0?maxY/2:0,hiY=maxY<0?maxY/2:maxY;camera.scrollX=Phaser.Math.Clamp(camera.scrollX,minX,hiX);camera.scrollY=Phaser.Math.Clamp(camera.scrollY,minY,hiY)}
  setCollisionVisible(visible){this.collisionVisible=Boolean(visible);this.collisionGraphics.setVisible(this.collisionVisible);this.groundDebugGraphics.setVisible(this.collisionVisible);document.getElementById('world-collision')?.classList.toggle('active',this.collisionVisible);this.refreshHud()}
  getGroundDiagnostics(){
    const pairs=this.groundOccupancy.overlaps();
    const npcs=this.populationWorld.npcs.filter(n=>n.alive&&!n.ascended),counts={work:0,rest:0,cultivate:0,hunt:0,trade:0,hurt:0,danger:0,blocked:0};
    for(const npc of npcs){
      const action=npc.goalAction;
      if(['work','farm','gather','commission','patrol'].includes(action))counts.work++;
      if(action==='rest')counts.rest++;
      if(action==='cultivate')counts.cultivate++;
      if(action==='trade'||action==='shop')counts.trade++;
      if(npc.faunaHuntTargetId)counts.hunt++;
      if(npc.hp<cultivationStats(npc).hpMax*.65)counts.hurt++;
      if(action==='flee'||npc.safety<35)counts.danger++;
      if(npc.pathBlocked||this.scheduler.byId.get(npc.id)?.waitingForSlot||this.scheduler.byId.get(npc.id)?.passageWait)counts.blocked++;
    }
    return {total:this.populationWorld.npcs.length,alive:npcs.length,fauna:this.populationWorld.environment.fauna.filter(f=>f.alive).length,
      counts,overlaps:pairs.map(([a,b])=>[a.id,b.id]),slots:this.workstations.claims.size,collisionMs:this.groundCollisionMs??0};
  }
  drawGroundDebug(){
    const g=this.groundDebugGraphics,view=this.cameras.main.worldView;
    g.clear();
    const overlaps=new Set(this.groundOccupancy.overlaps().flat().map(body=>body.id));
    const visible=p=>p.x>=view.x-80&&p.y>=view.y-80&&p.x<=view.right+80&&p.y<=view.bottom+80;
    for(const body of this.groundOccupancy.bodies.values()){
      if(!visible(body))continue;
      const color=overlaps.has(body.id)?0xff4653:body.category===2?0xffab65:0x7cead9;
      g.lineStyle(1,color,.9).strokeRect(body.x-body.width/2,body.y-body.height/2,body.width,body.height);
      g.lineStyle(1,color,.35).strokeCircle(body.x,body.y,body.personalRadius);
    }
    for(const slot of this.workstations.claims.values())if(visible(slot))g.fillStyle(0xffd468,.85).fillCircle(slot.x,slot.y,3);
    const route=this.npcRoutes.get(this.selectedNpcId)?.points;
    if(!route)return;
    g.lineStyle(1,0xc39bff,.8);
    for(let i=1;i<route.length;i++)g.lineBetween(route[i-1].x,route[i-1].y,route[i].x,route[i].y);
    for(const point of route)if(visible(point))g.strokeCircle(point.x,point.y,3);
  }
  drawCollisionDebug(){const g=this.collisionGraphics;g.clear();g.fillStyle(0xed5656,.3);g.lineStyle(1,0xffa080,.95);for(const r of this.collisionRects){g.fillRect(r.x,r.y,r.width,r.height);g.strokeRect(r.x,r.y,r.width,r.height)}g.lineStyle(2,0x72f2be,.9);for(const m of this.markers){g.strokeCircle(m.x,m.y,12);g.lineBetween(m.x-18,m.y,m.x+18,m.y);g.lineBetween(m.x,m.y-18,m.x,m.y+18)}}
  findNavigationPath(a,b){const start=this.markers.find(m=>m.id===a),goal=this.markers.find(m=>m.id===b);if(!start||!goal)return null;const cell=this.navCell,cols=this.navCols,rows=this.navRows,toGrid=p=>({x:Math.floor(p.x/cell),y:Math.floor(p.y/cell)}),s=toGrid(start),t=toGrid(goal),key=(x,y)=>y*cols+x,startKey=key(s.x,s.y),goalKey=key(t.x,t.y),prev=new Int32Array(cols*rows).fill(-1),queue=[startKey];prev[startKey]=startKey;for(let i=0;i<queue.length&&prev[goalKey]===-1;i++){const current=queue[i],x=current%cols,y=Math.floor(current/cols);for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=key(nx,ny);if(nx<0||ny<0||nx>=cols||ny>=rows||prev[k]!==-1||this.navBlocked[k])continue;prev[k]=current;queue.push(k)}}if(prev[goalKey]===-1)return null;const cells=[];for(let k=goalKey;;k=prev[k]){cells.push({x:(k%cols+.5)*cell,y:(Math.floor(k/cols)+.5)*cell});if(k===startKey)break}cells.reverse();const compact=[cells[0]];for(let i=1;i<cells.length-1;i++){const p=cells[i-1],q=cells[i],r=cells[i+1];if(Math.sign(q.x-p.x)!==Math.sign(r.x-q.x)||Math.sign(q.y-p.y)!==Math.sign(r.y-q.y))compact.push(q)}if(cells.length>1)compact.push(cells.at(-1));return compact}
  canNavigate(a,b){return this.findNavigationPath(a,b)!==null}
  gotoMarker(id,zoom=.95){const marker=this.markers.find(m=>m.id===id);if(!marker)return false;this.cameras.main.setZoom(zoom).centerOn(marker.x,marker.y);this.clampCamera();return true}
  async walkDebugPath(a,b){const points=this.findNavigationPath(a,b);if(!points)return{from:a,to:b,reached:false,reason:'blocked'};if(!this.debugSolids){this.debugSolids=this.physics.add.staticGroup();for(const r of this.collisionRects){const solid=this.add.rectangle(r.x+r.width/2,r.y+r.height/2,r.width,r.height,0,0).setVisible(false);this.physics.add.existing(solid,true);this.debugSolids.add(solid)}}const first=points[0],actor=this.add.ellipse(first.x,first.y,14,18,0xffd979,.95).setStrokeStyle(2,0x4c3527).setDepth(first.y+1000);actor.setName('temporary-gate-debug-actor');this.physics.add.existing(actor);actor.body.setSize(12,12);actor.body.setCollideWorldBounds(true);const collider=this.physics.add.collider(actor,this.debugSolids);let reached=true,stalledAt=null,stalledTarget=null;try{for(let i=1;i<points.length;i++){const target=points[i],dx=target.x-actor.x,dy=target.y-actor.y,distance=Math.hypot(dx,dy);if(distance<2)continue;actor.body.setVelocity(dx/distance*90,dy/distance*90);const start=this.time.now;let best=Math.hypot(target.x-actor.x,target.y-actor.y);while(best>8&&this.time.now-start<Math.max(1600,distance/90*1000+800)){await new Promise(resolve=>this.time.delayedCall(16,resolve));const current=Math.hypot(target.x-actor.x,target.y-actor.y);if(current<best)best=current;else if(current>best+3)break}actor.body.setVelocity(0,0);if(best>12){reached=false;stalledAt={x:actor.x,y:actor.y};stalledTarget=target;break}}}finally{this.physics.world.removeCollider(collider);actor.destroy()}return{from:a,to:b,reached,waypoints:points.length,...(!reached?{stalledAt,stalledTarget}: {})}}
  getState(){const anchorCount=this.map.getObjectLayer('PopulationAnchors')?.objects.length??0,zones=this.map.getObjectLayer('EncounterZones')?.objects??[],cityBuildings=this.map.getObjectLayer('Buildings')?.objects??[],stalls=this.map.getObjectLayer('MarketDecor')?.objects??[],interactions=this.map.getObjectLayer('InteractionMarkers')?.objects??[];return{mapUrl:MAP_URL,widthTiles:this.map.width,heightTiles:this.map.height,tileWidth:this.map.tileWidth,tileHeight:this.map.tileHeight,worldWidth:this.map.widthInPixels,worldHeight:this.map.heightInPixels,regions:Object.keys(REGION_TITLES).map(id=>({id,title:REGION_TITLES[id]})),npcCount:this.populationWorld?.npcs?.length??0,futurePopulation:108,activeNPCCount:this.populationWorld?.npcs?.filter(n=>n.alive).length??0,populationAnchorCount:anchorCount,activeMonsterSpawns:zones.reduce((n,z)=>n+Number(this.prop(z,'spawnCount')??0),0),encounterZones:zones.map(z=>({name:z.name,tier:this.prop(z,'dangerTier'),realmIndexMin:this.prop(z,'realmIndexMin'),realmIndexMax:this.prop(z,'realmIndexMax'),enabled:this.prop(z,'enemySpawnEnabled')})),objectCount:this.objectSprites.length,cityBuildings:cityBuildings.map(o=>({name:o.name,gid:o.gid,display:[o.width,o.height]})),marketStalls:stalls.map(o=>({name:o.name,stallId:this.prop(o,'stallId'),gid:o.gid,display:[o.width,o.height]})),interactionMarkers:interactions.map(o=>({name:o.name,id:this.prop(o,'markerId'),kind:this.prop(o,'kind'),active:this.prop(o,'active')})),population:this.getPopulationState(),windTreeCount:this.windSprites.length,windKinds:[...new Set(this.windSprites.map(s=>s.getData('windKind')))],windFrames:this.windSprites.map(s=>({kind:s.getData('windKind'),frame:s.frame.name,x:s.x,y:s.y,phase:s.getData('windPhase')})),flowEffectCount:this.flowSprites.length,waterFrames:this.flowSprites.map(s=>s.frame.name),tilesets:this.map.tilesets.map(s=>s.name),layers:this.map.layers.map(l=>({name:l.name,tileCount:l.data?.flat()?.filter(t=>t.index>=0).length??0,visible:l.visible})),sprites:this.objectSprites.slice(0,6).map(s=>({name:s.name,texture:s.texture.key,frame:s.frame.name,x:s.x,y:s.y,display:[s.displayWidth,s.displayHeight]})),directionalGateSprites:this.objectSprites.filter(s=>s.texture.key==='rebuild-directional-gates').map(s=>({name:s.name,frame:s.frame.name,rotation:s.rotation,display:[s.displayWidth,s.displayHeight]})),camera:{width:this.cameras.main.width,height:this.cameras.main.height,zoom:this.cameras.main.zoom,x:this.cameras.main.scrollX,y:this.cameras.main.scrollY},zoom:this.cameras.main.zoom,scrollX:this.cameras.main.scrollX,scrollY:this.cameras.main.scrollY,collisionCount:this.collisionRects.length,collisionVisible:this.collisionVisible,markers:this.markers.map(m=>m.id)}}
  regionAtCamera(){const view=this.cameras.main.worldView,cx=view.x+view.width/2,cy=view.y+view.height/2,regions=(this.map.getObjectLayer('RegionMarkers')?.objects??[]).filter(o=>cx>=o.x&&cx<=o.x+o.width&&cy>=o.y&&cy<=o.y+o.height).sort((a,b)=>a.width*a.height-b.width*b.height),id=this.prop(regions[0]??{},'regionId');const key=({city:'city','north-mountain':'north','east-pasture':'east','south-suburb':'south',sect:'south','forest-outer':'forest','forest-middle':'forest','forest-deep':'forest'})[id];if(key)this.currentRegion=key;return REGION_TITLES[this.currentRegion]??'Thế giới Thanh Vân Ký'}
  getMinimapState(){const camera=this.cameras.main,view=camera.worldView;return{world:{width:this.map.widthInPixels,height:this.map.heightInPixels},zoom:camera.zoom,worldView:{x:view.x,y:view.y,width:view.width,height:view.height},viewport:this.minimap?.transform.cameraRect(camera)??null,followActor:this.possessedNpcId?{id:this.possessedNpcId,suspended:this.cameraFollowSuspended}:null,markers:(this.map.getObjectLayer('RegionMarkers')?.objects??[]).map(o=>({name:o.name,id:this.prop(o,'regionId'),x:o.x,y:o.y,width:o.width,height:o.height}))}}
  refreshHud(){this.refreshHeavenWallet?.();const region=this.regionAtCamera(),label=document.getElementById('world-area-title'),title=this.possessedNpcId?'Thiên Đạo nhập thân · '+(this.populationWorld.npcs.find(n=>n.id===this.possessedNpcId)?.name??''):region;if(label&&label.textContent!==title)label.textContent=title;const now=this.time?.now??performance.now();if(this.nextHudPopulationAt===undefined||now>=this.nextHudPopulationAt){this.hudAliveCount=this.populationWorld?.npcs?.filter(n=>n.alive).length??0;this.nextHudPopulationAt=now+250}const active=this.hudAliveCount??0,sub=document.getElementById('world-camera-status'),status=this.possessedNpcId?(this.cameraFollowSuspended?`Đang xem xa · WASD trở về NPC · cư dân: ${active}/108`:`Theo NPC · WASD di chuyển · J đánh · E nhặt · Esc rời · cư dân: ${active}/108`):`Zoom ${this.cameras.main.zoom.toFixed(2)}× · cư dân: ${active}/108`;if(sub&&sub.textContent!==status)sub.textContent=status;this.refreshPossessionHud()}
  refreshPossessionHud(){if(!this.possessionPanel||!this.populationWorld)return;const selected=this.populationWorld.npcs.find(n=>n.id===this.selectedNpcId),active=this.populationWorld.npcs.find(n=>n.id===this.possessedNpcId),target=this.populationWorld.environment.fauna.find(f=>f.id===this.selectedFaunaId),drop=active?(this.populationWorld.environment.drops??[]).filter(d=>d.status==='ground'&&Math.hypot(active.x-d.x,active.y-d.y)<120).sort((a,b)=>Math.hypot(active.x-a.x,active.y-a.y)-Math.hypot(active.x-b.x,active.y-b.y))[0]:null,inventory=active?.inventory.map(i=>`${i.itemId}x${i.count}`).join(',')??'',session=this.populationWorld.heaven.possession,signature=`${active?.id??'-'}:${selected?.id??'-'}:${selected?.hp??'-'}:${selected?.shortGoal??'-'}:${selected?.action??'-'}:${active?.hp??'-'}:${target?.id??'-'}:${target?.hp??'-'}:${target?.alive}:${drop?.id??'-'}:${Boolean(drop&&Math.hypot(active.x-drop.x,active.y-drop.y)<=32)}:${inventory}:${this.populationWorld.heaven.divinePower}:${Math.ceil((session?.remainingMs??0)/60000)}`;if(signature===this.possessionHudSignature)return;this.possessionHudSignature=signature;this.renderPossessionHud()}
}

export function createRebuildGame(){
  return new Phaser.Game({type:Phaser.AUTO,parent:'world-game',width:window.innerWidth,height:window.innerHeight,backgroundColor:'#203b2d',pixelArt:true,roundPixels:true,antialias:false,scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH},render:{pixelArt:true,roundPixels:true,antialias:false},physics:{default:'arcade',arcade:{debug:false}},scene:[RebuildWorldScene]});
}

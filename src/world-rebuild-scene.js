import { WestWilds } from './world/WestWilds.js';
import { WorldDaylight, daylightAt } from './world/WorldDaylight.js';
import { WorldNameplates } from './world/WorldNameplates.js';
import { WorldSociety } from './world/WorldSociety.js';
import { WorldMerchants } from './world/WorldMerchants.js';
import { MerchantPanel } from './world/MerchantPanel.js';
import { CityScenery, cityPropFrame } from './world/CityScenery.js';
import { placeCityResidents } from './world/CityResidents.js';
import { PassageTraffic } from './world/PassageTraffic.js';
import { newTravelWatch, observeTravel, stableFacing, travelSpeed } from './world/TravelMotion.js';
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
import { GuardDebug } from './world/GuardDebug.js';
import { SectCampus } from './world/SectCampus.js';
import './world/sect-campus.css';
import { Ramparts } from './world/Ramparts.js';
import { createWorldUuid, loadWorldPopulation, WORLD_POPULATION_SAVE_KEY } from './world-rebuild-population.js';
import { AutonomousNPCSystem } from './dao/AutonomousNPCSystem.ts';
import { NPC_MODULAR_TEXTURES, NPC_STYLE_TEXTURES, ensureNPCModularAppearances, resolveNPCModularPart } from './dao/CharacterAppearance.ts';
import { cultivationStats } from './systems/CultivationSystem.ts';
import { tribulationLocked } from './dao/TribulationSystem.ts';
import { WorldCultivation } from './world/WorldCultivation.js';
import { preloadTribulationVisuals } from './world/TribulationVisuals.js';
import { SkyStepController, SKY_STEP, skyStepEligibility, skyStepReasons } from './world/SkyStep.js';
import { SkyStepVisuals, preloadSkyStep } from './world/SkyStepVisuals.js';
import { TribulationArena } from './world/TribulationArena.js';
import { findSeatedBypass } from './world/SeatedBypass.js';
import { damageForStrike } from './systems/CombatSystem.ts';
import { SaveGuard } from './dao/SaveGuard.ts';
import { PossessionSystem } from './dao/PossessionSystem.ts';
import { reportCityCombat, markCityIncidentAtScene, clearCityResponse } from './dao/CityLawSystem.ts';
import { ensureWorldRebuildEnvironment, tickWorldRebuildProfessionWork, damageWorldRebuildBuilding } from './dao/WorldRebuildProfessionSystem.ts';
import { ensureFauna, hunterTolerance, damageFauna, faunaCombatPower, claimFaunaDrop, queueFaunaRespawn, processFaunaRespawns, faunaEvent } from './dao/FaunaSystem.ts';
import { FAUNA_SPECIES, FAUNA_IDS, monsterSkill } from './dao/MonsterRegistry.ts';
import { MonsterCombat } from './dao/MonsterCombat.ts';
import { itemPrices } from './dao/SettlementSystem.ts';
import { MonsterMovementDebug } from './world/MonsterMovementDebug.js';
import { MonsterMovement } from './world/MonsterMovement.js';
import { MonsterVisuals, loadMonsterArt, LOOT_ICON } from './world/MonsterVisuals.js';
import { WorldRiverFishSystem } from './dao/WorldRiverFishSystem.ts';
import { MinimapCamera } from './world/MinimapCamera.js';
import { isInWeaponArc, provisionWorldWeapons, setNpcWeapon, weaponAttackMode, weaponChoices, weaponForNpc } from './world/WeaponCombat.js';

import { WorldHeavenActions } from './world/WorldHeavenActions.js';
import { mountHeavenShop, mountSkillPanel, updateSkillStatus, syncRodVisual, rodTip } from './world/HeavenShopUI.js';
import { ROD, SKILLS, hasRod, itemName, rodEquipped } from './world/HeavenShop.js';

import { NpcSimulationScheduler } from './world/NpcSimulationScheduler.js';
import { WorldPerformancePanel } from './world/WorldPerformancePanel.js';
import { AerialNavigation, FlyingSwordController, flightEligibility, travelMode, blocksGroundCombat, aboveGroundCombat, FLIGHT_REASONS } from './world/FlyingSword.js';
import { ResidentProfile, residentActivity, residentName } from './world/ResidentProfile.js';
import { appearanceEdits } from './world/NpcAppearanceSync.js';
import { formatRealm } from './systems/RealmConfig.ts';
import { FlyingSwordVisuals, flightOffset } from './world/FlyingSwordVisuals.js';

const CARDINAL_STEPS=[[1,0],[-1,0],[0,1],[0,-1]];
const FOOTPRINT=[[-8,-4],[8,-4],[-8,4],[8,4]];
const FALLBACK_DIRECTIONS=[[1,0],[0,1],[-1,0],[0,-1],[.71,.71],[-.71,.71],[-.71,-.71],[.71,-.71]];

const MAP_URL='/maps/world-rebuild-1b.tmj';
const LEGACY_NPC_RENDER=new URLSearchParams(location.search).get('legacyNpc')==='1';
const FLIGHT_ARENA=new URLSearchParams(location.search).get('flightTest')==='1';
const CULTIVATION_DEMO=new URLSearchParams(location.search).get('cultivationDemo')==='1';
const TRIBULATION_ARENA=new URLSearchParams(location.search).get('tribulationVfx')==='1';
const CHARACTER_RIG_PREVIEW=new URLSearchParams(location.search).get('characterRig')==='1';
const PAPERDOLL_PREVIEW=new URLSearchParams(location.search).get('paperDoll')==='1';
const PAPERDOLL_IDS=Array.from({length:24},(_,i)=>`P${String(i+1).padStart(2,'0')}`);
const PAPERDOLL_ROLE_POOLS=Object.freeze({commoner:['P01','P02','P03','P04'],low_disciple:['P05','P06','P07'],elder:['P08'],sect_leader:['P09'],merchant:['P10','P11'],tavern_staff:['P12'],city_guard:['P13','P14'],repair_worker:['P15'],hunter:['P16'],herb_gatherer:['P17'],quest_clerk:['P18'],independent_cultivator:['P19','P20','P21','P22','P23']});
const REGION_CENTERS=Object.freeze({city:{x:108*32,y:67*32},north:{x:111*32,y:20*32},east:{x:183*32,y:69*32},south:{x:111*32,y:119*32},forest:{x:48*32,y:79*32},'forest-outer':{x:55*32,y:69*32},'forest-middle':{x:36*32,y:80*32},'forest-deep':{x:8*32,y:94*32}});
const REGION_TITLES=Object.freeze({city:'Thanh Vân Thành',north:'Cổng Bắc · đèo núi',east:'Cổng Đông · thảo nguyên',south:'Ngoại thành phía Nam',sect:'Thanh Vân Tông','sect-gate':'Sơn Môn','old-road':'Thanh Vân Cổ Đạo','outer-wood':'Thanh Vân Ngoại Lâm',forest:'Cổng Tây · rừng yêu thú','forest-outer':'Rừng tây · rìa nguy hiểm thấp','forest-middle':'Rừng tây · nguy hiểm trung bình','forest-deep':'Rừng tây · vùng sâu nguy hiểm cao'});

export class RebuildWorldScene extends Phaser.Scene {
  constructor(){super('world-rebuild-1b');this.paperDollPreview=PAPERDOLL_PREVIEW;this.npcRenderTextures=new Map();this.collisionVisible=false;this.collisionRects=[];this.markers=[];this.dragState=null;this.lastWorldDragAt=0;this.keys=null;this.objectSprites=[];this.buildingSprites=new Map();this.resourceNodeSprites=new Map();this.faunaSprites=new Map();this.dropSprites=new Map();this.faunaTick=0;this.faunaRespawnTick=0;this.faunaZones=[];this.windSprites=[];this.windClock=0;this.npcSprites=new Map();this.modularVisuals=new Map();this.npcRoutes=new Map();this.weaponSprites=new Map();this.weaponAttackStates=new Map();this.weaponFxSprites=[];this.playerSkillCooldown=0;this.populationTick=0;this.populationSaveTick=0;this.populationAiCost=0;this.selectedNpcId=null;this.possessedNpcId=null;this.cameraFollowSuspended=false;this.cameraTween=null;this.lastExploreZoom=.85;this.minimap=null;this.selectedFaunaId=null;this.playerFacing='down';this.playerAttackCooldown=0;this.playerCombo=0;this.pathfindingCalls=0;this.collisionChecks=0;this.goalEvaluations=0;this.aiCostSamples=[];this.frameSamples=[];this.lastEcologyDebugAt=0;this.lastUpdateNow=0;}
  preload(){
    preloadTribulationVisuals(this);
    preloadSkyStep(this);
    this.load.image('sect-atlas','/assets/sect-campus/campus.png');
    this.load.json('sect-atlas-bounds','/assets/sect-campus/bounds.json');
    this.load.image('old-road-paths','/assets/old-road/path.png');
    this.load.image('old-road-ground','/assets/old-road/ground.png');
    this.load.spritesheet('society-facilities','/assets/society/facilities.png',{frameWidth:192,frameHeight:128});
    this.load.spritesheet('old-road-props','/assets/old-road/props.png',{frameWidth:128,frameHeight:160});
    this.load.image('rampart-atlas','/assets/ramparts/world-ramparts.png');
    this.load.json('rampart-bounds','/assets/ramparts/bounds.json');
    this.load.spritesheet('flying-swords','/assets/effects/flying-swords.png',{frameWidth:48,frameHeight:48});
    window.__worldBoot?.setPhase('assets','running');
    this.load.on('loaderror',file=>window.__worldBoot?.setPhase('assets','failed',`${file.key}: ${file.src}`));
    this.load.once('complete',()=>window.__worldBoot?.setPhase('assets','complete'));
    this.load.spritesheet('west-landmarks','/assets/west-wilds/landmarks.png',{frameWidth:144,frameHeight:120});
    this.load.image('west-terrain','/assets/west-wilds/terrain.png');
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
    loadMonsterArt(this);
    this.load.spritesheet('world-fish-common','/assets/fauna/fish/FishCommon.png',{frameWidth:40,frameHeight:32});
    this.load.spritesheet('world-fish-spirit','/assets/fauna/fish/FishSpirit.png',{frameWidth:40,frameHeight:32});
  }
  create(){
    window.__worldBoot?.setPhase('map','running');
    this.map=this.make.tilemap({key:'rebuild-world-map'});
    this.westOffsetX=this.map.properties.find(p=>p.name==='westOffsetX')?.value??0;
    this.worldMinX=-this.westOffsetX;
    for(const layer of this.map.objects)for(const object of layer.objects)object.x-=this.westOffsetX;
    const sets=[
      this.map.addTilesetImage('TayHoangTerrain','west-terrain',32,32,0,0),
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
      this.map.addTilesetImage('QingyunOldRoadGround','old-road-ground',32,32,0,0),
    ].filter(Boolean);
    if(sets.length!==25)throw new Error(`Map tileset load mismatch (${sets.length}/25)`);
    const terrainLayers=['GroundBase','Water','Shore','GroundDetails','TerrainTransitions','Roads','CityEdges','Cliffs']
      .map((name,depth)=>this.map.createLayer(name,sets,this.worldMinX,0)?.setDepth(depth)).filter(Boolean);
    this.terrainCache=WorldTerrainAtlas.create(this,terrainLayers,sets);
    const oldRoad=this.map.addTilesetImage('QingyunOldRoadTerrain','old-road-paths',32,32,0,0);
    this.oldRoadLayer=oldRoad&&this.map.createLayer('OldRoadPaths',oldRoad,this.worldMinX,0)?.setDepth(8);
    this.worldWidth=this.map.widthInPixels;this.worldHeight=this.map.heightInPixels;this.physics.world.setBounds(this.worldMinX,0,this.worldWidth,this.worldHeight);
    this.cameras.main.setBounds(this.worldMinX,0,this.worldWidth,this.worldHeight).setZoom(.72).setRoundPixels(true);
    const cityBounds=this.cache.json.get('courtyard-bounds');
    const cityTexture=this.textures.get('courtyard-objects');
    cityBounds.forEach(([left,top,right,bottom],frame)=>{
      cityTexture.add(cityPropFrame(frame),0,(frame%8)*192+left,Math.floor(frame/8)*176+top,right-left,bottom-top);
    });
    const scenery=['StaticDecor','Buildings','MarketDecor','Roofs'].flatMap(name=>this.map.getObjectLayer(name)?.objects??[]);
    this.objectSprites=scenery.map(obj=>{
      const gid=obj.gid,entry=gid>=257&&gid<297?['rebuild-buildings',gid-257]:gid>=297&&gid<312?['rebuild-ancient-tree',gid-297]:gid>=312&&gid<320?['rebuild-bamboo',gid-312]:gid>=320&&gid<330?['rebuild-rocks',gid-320]:gid===330?['rebuild-farmhouse',0]:gid>=400&&gid<408?['rebuild-400',gid-400]:gid>=408&&gid<416?['rebuild-408',gid-408]:gid>=416&&gid<424?['rebuild-416',gid-416]:gid>=424&&gid<432?['rebuild-424',gid-424]:gid>=432&&gid<=435?[`rebuild-${gid}`,0]:gid>=436&&gid<444?['rebuild-wall-kit',gid-436]:gid>=508&&gid<516?['rebuild-water-props',gid-508]:gid>=516&&gid<520?['rebuild-directional-gates',gid-516]:gid>=520&&gid<524?['city-structures',gid-520]:gid>=524&&gid<531?['market-stalls',gid-524]:gid>=640&&gid<672?['courtyard-objects',gid-640]:gid===676?['city-palace',undefined]:gid>=1760&&gid<1765?['west-landmarks',gid-1760]:null;
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
      if(this.prop(obj,'legacyRampart')||this.prop(obj,'retiredSect')){
        sprite.setVisible(false).removeFromDisplayList();
        sprite.removeFromUpdateList();
      }
      return sprite;
    });
    this.ramparts=new Ramparts(this);
    const rampartTexture=this.textures.get('rampart-atlas'),rampartBounds=this.cache.json.get('rampart-bounds');
    rampartBounds.forEach(([left,top,right,bottom],index)=>{
      rampartTexture.add('wall-'+index,0,index%6*256+left,Math.floor(index/6)*288+top,right-left,bottom-top);
    });
    const rampartImages=(this.map.getObjectLayer('RampartArt')?.objects??[]).map(obj=>{
      const index=obj.gid-700,[left,top,right,bottom]=rampartBounds[index];
      return this.add.image(obj.x+(left+right)/2,obj.y-obj.height+(top+bottom)/2,'rampart-atlas','wall-'+index)
        .setDepth(this.prop(obj,'depthY')).setName(obj.name);
    });
    const sectAtlas=this.textures.get('sect-atlas');
    const sectBounds=this.cache.json.get('sect-atlas-bounds');
    sectBounds.forEach(([l,t,r,b],i)=>sectAtlas.add('sect-'+i,0,i%5*320+l,Math.floor(i/5)*256+t,r-l,b-t));
    const sectImages=(this.map.getObjectLayer('SectCampusArt')?.objects??[]).map(obj=>{
      const i=obj.gid-760,[l,t,r,b]=sectBounds[i];
      const sprite=this.add.image(obj.x+(l+r)/2,obj.y-obj.height+(t+b)/2,'sect-atlas','sect-'+i)
        .setDepth(this.prop(obj,'depth')).setName(obj.name);
      const buildingId=this.prop(obj,'buildingId');
      if(buildingId)this.buildingSprites.set(buildingId,sprite);
      return sprite;
    });
    const sectSigns=(this.map.getObjectLayer('SectCampusStations')?.objects??[]).filter(o=>
      !/^(home|dummy|plot|queue|seat|counter|reading)/.test(this.prop(o,'station'))).map(o=>
      this.add.text(o.x,o.y-12,o.name,{fontFamily:'serif',fontSize:'10px',color:'#e9cf94',
        backgroundColor:'#23362d',padding:{x:3,y:2}}).setOrigin(.5,1).setDepth(o.y+8));
    const roadDecor=(this.map.getObjectLayer('OldRoadArt')?.objects??[]).map(o=>
      this.add.image(o.x+64,o.y-80,'old-road-props',o.gid-800).setDepth(this.prop(o,'depth')).setName(o.name));
    const roadSigns=(this.map.getObjectLayer('OldRoadSigns')?.objects??[]).map(o=>
      this.add.text(o.x,o.y,o.name,{fontFamily:'serif',fontSize:'10px',color:'#f5d992',
        backgroundColor:'#312b20',padding:{x:4,y:2}}).setOrigin(.5,1).setDepth(o.y+54));
    const facilitySigns=[];
    this.facilitySprites=(this.map.getObjectLayer('SocietyArt')?.objects??[]).map(o=>{
      const sprite=this.add.image(o.x+96,o.y-64,'society-facilities',o.gid-1650).setDepth(this.prop(o,'depth')).setName(o.name);
      sprite.setData('production',{ore:this.prop(o,'ore'),crop:this.prop(o,'crop')});
      const label=this.prop(o,'label');
      if(label)facilitySigns.push(this.add.text(o.x+96,o.y+1,label,{fontSize:'11px',color:'#eddb9f',
        backgroundColor:'#263e2d',padding:{x:4,y:2}}).setOrigin(.5,0).setDepth(o.y+30));
      return sprite;
    });
    this.cityScenery=new CityScenery(this,this.objectSprites);
    this.flowSprites=(this.map.getObjectLayer('FlowEffects')?.objects??[]).map(obj=>{const phase=Number(this.prop(obj,'phase')??0),period=Number(this.prop(obj,'period')??150);const sprite=this.add.sprite(obj.x??0,obj.y??0,'rebuild-water-motion',8+phase).setDepth((obj.y??0)+12).setAlpha(.68);sprite.setData('flowPhase',phase);sprite.setData('flowPeriod',period);sprite.setData('flowFrame',-1);return sprite});
    this.sceneryBounds=[...this.objectSprites.filter(sprite=>!this.prop(sprite.getData('tiledObject'),'legacyRampart')&&!this.prop(sprite.getData('tiledObject'),'retiredSect')),
      ...this.flowSprites,...rampartImages,...sectImages,...sectSigns,...roadDecor,...roadSigns,...this.facilitySprites,...facilitySigns].map(sprite=>{
      const radius=Math.hypot(sprite.displayWidth,sprite.displayHeight)/2;
      return {sprite,left:sprite.x-radius,right:sprite.x+radius,top:sprite.y-radius,bottom:sprite.y+radius};
    });
    this.updateWindFrames();
    this.collisionRects=['Collision','SectCampusCollision','SocietyCollision'].flatMap(name=>this.map.getObjectLayer(name)?.objects??[])
      .filter(o=>!this.prop(o,'retiredSect')).map(o=>({x:o.x,y:o.y,width:o.width,height:o.height,name:o.name,kind:this.prop(o,'kind')}));
    this.markers=(this.map.getObjectLayer('NavigationMarkers')?.objects??[]).map(o=>({id:this.prop(o,'markerId'),x:o.x,y:o.y,region:this.prop(o,'regionId')}));
    for(const o of this.map.getObjectLayer('SectCampusStations')?.objects??[]){
      const id=this.prop(o,'station');
      this.markers.push({id:'sect-'+id,x:o.x,y:o.y,region:'sect'});
    }
    for(const o of this.map.getObjectLayer('SocietyStations')?.objects??[]){
      if(this.prop(o,'site')==='landmark')this.markers.push({id:this.prop(o,'id'),x:o.x,y:o.y,region:'sect'});
    }
    this.roadLayer=this.map.layers.find(layer=>layer.name==='Roads');
    this.navCell=16;
    this.navCols=this.map.widthInPixels/this.navCell;
    this.navRows=this.map.heightInPixels/this.navCell;
    this.navBlocked=new Uint8Array(this.navCols*this.navRows);
    this.collisionByCell=new Map();
    for(const r of this.collisionRects){
      for(let y=Math.max(0,Math.floor(r.y/this.navCell));y<Math.min(this.navRows,Math.ceil((r.y+r.height)/this.navCell));y++){
        for(let x=Math.max(0,Math.floor((r.x+this.westOffsetX)/this.navCell));x<Math.min(this.navCols,Math.ceil((r.x+r.width+this.westOffsetX)/this.navCell));x++){
          const cell=y*this.navCols+x;
          this.navBlocked[cell]=1;
          if(!this.collisionByCell.has(cell))this.collisionByCell.set(cell,[]);
          this.collisionByCell.get(cell).push(r);
        }
      }
    }
    this.buildNavigationComponents();
    this.ramparts.preparePosts();
    const narrowPassages=['north','south','east','west'].flatMap(direction=>{
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
    });
    const bridge=this.map.getObjectLayer('StaticDecor')?.objects.find(o=>this.prop(o,'kind')==='bridge'||this.prop(o,'collisionPolicy')==='walkable-span');
    const bridgeMarker=this.markers.find(m=>m.id==='east-bridge');
    if(bridge&&bridgeMarker){
      const x=bridge.x+bridge.width/2,y=bridgeMarker.y,clear=bridge.width/2+8;
      if([-clear,0,clear].every(dx=>this.footprintTerrainOpen(x+dx,y,11,6)))
        narrowPassages.push({id:'east-river-bridge',a:{x:x-clear,y},b:{x:x+clear,y},clear});
    }
    this.passageTraffic=new PassageTraffic(narrowPassages,p=>this.footprintTerrainOpen(p.x,p.y,11,6));
    window.__worldBoot?.setPhase('map','complete');window.__worldBoot?.setPhase('population','running');
    if(this.paperDollPreview)this.paperDollRegistry=this.cache.json.get('npc-paperdoll-presets');
    try{this.initPopulation();window.__worldBoot?.setPhase('population','complete')}catch(error){window.__worldBoot?.setPhase('population','failed',error.stack||error.message);throw error}
    window.__worldBoot?.setPhase('ecosystem','running');
    this.initSwordFlight();
    this.groundOccupancy=new GroundOccupancy((x,y,hw,hh,body)=>body.floor===1?this.ramparts.open(x,y,hw,hh):this.footprintTerrainOpen(x,y,hw,hh,body.category===2));
    this.syncGroundOccupancy();
    this.workstations=new WorkstationSlots((npc,x,y)=>this.groundPositionOpen(npc,x,y),(a,b)=>this.canReachPoint(a,b));
    this.initFauna();
    this.syncGroundOccupancy();
    this.scheduler=new NpcSimulationScheduler(this.populationWorld.npcs);
    this.cultivation=new WorldCultivation(this);
    this.sectCampus=new SectCampus(this);
    this.cultivation.spots.campus=this.sectCampus;
    this.initSkyStep();
    if(CULTIVATION_DEMO)this.cultivation.mountDemo();
    if(TRIBULATION_ARENA)this.cultivation.arena=new TribulationArena(this,this.cultivation);
    const stormOptions=document.getElementById('tribulation-options');
    if(stormOptions){
      const visual=this.cultivation.stormVisuals;
      const select=stormOptions.querySelector('select');
      select.value=visual.settings.quality;
      select.onchange=()=>visual.setOptions({quality:select.value});
      for(const checkbox of stormOptions.querySelectorAll('input')){
        checkbox.checked=visual.settings[checkbox.name];
        checkbox.onchange=()=>visual.setOptions({[checkbox.name]:checkbox.checked});
      }
    }
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
    this.initMonsterMovementDebug();
    this.createResourceNodeSprites();
    window.__worldBoot?.setPhase('ecosystem','complete');
    this.environmentGraphics=this.add.graphics().setDepth(10000);
    this.refreshProfessionVisuals();
    this.livingWorldPanel=new LivingWorldPanel(this);
    this.collisionGraphics=this.add.graphics().setDepth(20000).setVisible(false);this.groundDebugGraphics=this.add.graphics().setDepth(20001).setVisible(false);this.drawCollisionDebug();
    this.input.keyboard?.addCapture(['SPACE']);this.keys=this.input.keyboard?.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,PLUS,MINUS,C,ONE,TWO,THREE,FOUR,J,K,E,F,M,R,Q,V,T,ESC,SHIFT,CTRL')??{};
    for(const key of ['J','K','F','M','R','Q','V','T']) {
      this.keys[key]?.on('down',(_key,event)=>{
        if(event.repeat||event.ctrlKey||event.altKey||event.metaKey||event.target?.matches?.('input,textarea,[contenteditable]'))return;
        this.handlePossessedAction(key);
      });
    }
    this.bindCameraControls();
    const initial=new URLSearchParams(location.search).get('region');this.gotoRegion(initial&&this.markerRegion(initial)?initial:'city',false);
    this.initPossessionHud();this.merchants=new WorldMerchants(this);this.society=new WorldSociety(this);this.westWilds=new WestWilds(this);this.daylight=new WorldDaylight(this);
    this.merchantPanel=new MerchantPanel(this);this.sectCampus.mount();this.bindAppearanceSync();this.restorePossession();
    if(FLIGHT_ARENA)this.initFlightArena();
    if(this.characterRigPreview&&!this.possessedNpcId){
      this.selectNPC(this.characterRigPreview.npc.id);
      const {npc}=this.characterRigPreview;
      this.navigateCameraTo(npc.x,npc.y,'character-preview',true,1.25);
    }
    this.cultivation.arena?.reset(false);
    window.__worldRebuild={
      getSectCampus:()=>this.sectCampus.snapshot(),
      getSociety:()=>this.society.report(),
      getCityGuards:()=>this.guardDebug.snapshot(),
      getTravelDiagnostics:()=>[...this.scheduler.byId.values()].map(e=>({id:e.npc.id,walked:e.walked??0,repaths:e.repaths??0,
        oscillations:e.oscillations??0,recoveries:e.recoveries??0,abandoned:e.abandonedRoutes??0,maxStuckMs:e.maxStuckMs??0,
        blocked:Boolean(e.npc.pathBlocked),reason:e.routeFailure??e.passageWait??null})),
      getSkySteps:()=>[...this.skyStep.active.values()].map(n=>({id:n.id,step:n.skyStep})),
      ready:()=>this.sys.isActive()&&Boolean(this.oldRoadLayer)&&this.objectSprites.length===scenery.length,
      getState:()=>this.getState(),gotoRegion:(id)=>this.gotoRegion(id),setZoom:(zoom)=>this.setZoom(zoom),getMinimapState:()=>this.getMinimapState(),
      setCollisionVisible:(visible)=>this.setCollisionVisible(visible),canNavigate:(a,b)=>this.canNavigate(a,b),findNavigationPath:(a,b)=>this.findNavigationPath(a,b),
      gotoMarker:(id,zoom=.95)=>this.gotoMarker(id,zoom),walkDebugPath:(a,b)=>this.walkDebugPath(a,b),
      getPopulationState:()=>this.getPopulationState(),selectNPC:id=>this.selectNPC(id),getPossessionState:()=>this.getPossessionState(),
      getProfessionState:()=>this.getProfessionState(),damageBuilding:(id,eventId,damage,realm=0)=>this.damageBuilding(id,eventId,damage,realm),
      getFaunaState:()=>this.getFaunaState(),
      getTradeState:()=>this.merchants.report(),
      getMeditationTraffic:()=>this.cultivation.diagnostics(),
      getTribulationVisuals:()=>({storms:this.cultivation.stormVisuals.last??[],pool:this.cultivation.stormVisuals.slots.length,
        settings:{...this.cultivation.stormVisuals.settings}}),
      getCultivationState:()=>({sites:this.cultivation.sites,npcs:this.populationWorld.npcs.filter(n=>n.tribulation||n.action==='cultivate')
        .map(n=>({id:n.id,phase:n.tribulation?.phase??'meditation',hp:n.hp,realm:n.realmIndex,x:n.x,y:n.y,xp:n.xp,strikes:n.tribulation?.strikes??0}))}),
      getWestGateTraffic:()=>this.getWestGateTraffic(),
      getFlightState:()=>this.getFlightState(),
      getMonsterMovement:()=>this.getMonsterMovement(),getPerformance:()=>this.performancePanel.snapshot(),getGroundDiagnostics:()=>this.getGroundDiagnostics(),
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
    if(new URLSearchParams(location.search).has('testMode')){window.__worldRebuild.stepProfessionMinutes=minutes=>this.stepProfessionMinutes(minutes);window.__worldRebuild.refreshTestUI=()=>{this.refreshProfessionVisuals();this.renderPopulationDebug()};window.__worldRebuild.testTickFauna=seconds=>{for(let i=0;i<Math.max(1,Math.floor(seconds));i++){this.populationWorld.clock.minute++;this.tickFauna(1000)}return this.getFaunaState()};window.__worldRebuild.testStartHunterHunt=(hunterId,faunaId)=>{const h=this.populationWorld.npcs.find(n=>n.id===hunterId&&n.alive),f=this.populationWorld.environment.fauna.find(x=>x.id===faunaId&&x.alive);if(!h||!f||h.populationRole!=='hunter')return false;for(const other of this.populationWorld.npcs)if(other.id!==h.id&&other.faunaHuntTargetId===f.id)other.faunaHuntTargetId=undefined;h.faunaHuntTargetId=f.id;h.actionTarget={x:f.x,y:f.y};h.goalAction='fight';this.npcRoutes.delete(h.id);return true};window.__worldRebuild.endPossessionForTest=()=>this.endPossession('Kết thúc kiểm tra chiến đấu.');window.__worldRebuild.resetWeaponCooldownForTest=()=>{this.playerAttackCooldown=0;this.playerSkillCooldown=0};window.__worldRebuild.prepareWeaponCombatTest=(npcId,faunaId)=>{const npc=this.populationWorld.npcs.find(n=>n.id===npcId&&n.alive),fauna=this.populationWorld.environment.fauna.find(f=>f.id===faunaId&&f.alive),sprite=npc&&this.npcSprites.get(npc.id),beast=fauna&&this.faunaSprites.get(fauna.id);if(!npc||!fauna||!sprite||!beast||!weaponForNpc(npc))return{ok:false,reason:'test-actors-unavailable'};const offsets=[[-34,0],[34,0],[0,-34],[0,34]],point=offsets.map(([x,y])=>({x:fauna.x+x,y:fauna.y})).find(p=>this.canOccupy(p.x,p.y)&&Math.hypot(p.x-fauna.x,p.y-fauna.y)<=52&&this.clearFaunaLine({x:p.x,y:p.y},fauna));if(!point)return{ok:false,reason:'no-clear-adjacent-cell'};npc.x=point.x;npc.y=point.y;npc.action='idle';npc.faunaHuntTargetId=undefined;npc.actionTarget=null;this.npcRoutes.delete(npc.id);sprite.setPosition(point.x,point.y).setDepth(point.y).play(`${this.npcTextureFor(npc)}_idle_right`,true);this.selectedFaunaId=fauna.id;this.selectNPC(npc.id);this.beginPossession();this.persistPopulation();this.syncWeaponVisuals();this.cameras.main.centerOn(npc.x,npc.y);this.setZoom(1.4);return{ok:this.possessedNpcId===npc.id,npcId:npc.id,faunaId:fauna.id,weapon:weaponForNpc(npc)?.id,npc:{x:npc.x,y:npc.y},fauna:{x:fauna.x,y:fauna.y},distance:Math.hypot(npc.x-fauna.x,npc.y-fauna.y)}}}
    this.scale.on('resize',()=>{this.clampCamera();this.minimap?.update(true)});
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.cameraInputAbort?.abort();this.minimap?.destroy();delete window.__worldRebuild;document.getElementById('possession-panel')?.remove();document.getElementById('ecology-debug')?.remove()});
    this.refreshHud();
  }
  prop(object,name){return object?.properties?.find(p=>p.name===name)?.value}
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
    const storage=TRIBULATION_ARENA?{
      getItem:key=>sessionStorage.getItem(key+':vfx-arena'),setItem:(key,value)=>sessionStorage.setItem(key+':vfx-arena',value),
    }:CULTIVATION_DEMO?sessionStorage:FLIGHT_ARENA?{
      getItem:key=>localStorage.getItem(key+':flight-arena'),setItem:(key,value)=>localStorage.setItem(key+':flight-arena',value),
    }:this.paperDollPreview?this.readOnlyPreviewStorage():localStorage;
    const loaded=loadWorldPopulation(storage,this.map);this.populationLoadMs=performance.now()-loadStarted;this.populationWorld=loaded.world;this.populationFresh=loaded.fresh;if(!this.paperDollPreview)this.populationSaveGuard=new SaveGuard(storage,WORLD_POPULATION_SAVE_KEY);ensureWorldRebuildEnvironment(this.populationWorld,{layers:['Buildings','NavigationMarkers','ResourceNodes','SectCampusArt','SectCampusStations'].map(name=>({name,objects:this.map.getObjectLayer(name)?.objects??[]}))});
    const center=this.markers.find(m=>m.id==='city-center');
    this.cityMigratedResidents=placeCityResidents(this.populationWorld.npcs,this.collisionRects.filter(r=>r.kind==='city-redesign-solid'||r.kind==='society'),
      (x,y,w,h)=>this.footprintTerrainOpen(x,y,w,h),(point)=>this.canReachPoint(center,point),this.markers,loaded.fresh);
    const provisioning=provisionWorldWeapons(this.populationWorld),partsChanged=ensureNPCModularAppearances(this.populationWorld.npcs);if(provisioning.changed||partsChanged)this.persistPopulation();
    this.ramparts.register(this.populationWorld.npcs);
    this.initLivingTimber();
    this.populationSimulation=new AutonomousNPCSystem(this.populationWorld.npcs,event=>{const id=`population-event:${this.populationWorld.clock.day}:${this.populationWorld.clock.minute}:${event.type}:${event.actorId??''}:${this.populationWorld.events.length}`;this.populationWorld.events.push({id,...event});if(this.populationWorld.events.length>400)this.populationWorld.events.shift()},this.populationWorld,(a,b)=>!blocksGroundCombat(a)&&!aboveGroundCombat(b)&&this.clearCombatLine(a,b),
      (npc,side,shop,item,count)=>this.merchants?.redirect(npc,side,shop,item,count)??{ok:false,message:'Chưa có quầy.'},
      npc=>this.cultivation?.request(npc)??false,npc=>this.merchants?.dutyFor(npc),npc=>this.ramparts.routine(npc));
    for(const n of this.populationWorld.npcs){if(n.populationRole==='hunter')n.populationDuty='Thợ săn tự chủ; săn con mồi trong vùng rồi thu nhặt chiến lợi phẩm';const texture=this.paperDollPreview?this.paperDollTextureFor(n):n.visualStyleId;if(this.paperDollPreview)this.npcRenderTextures.set(n.id,texture);if(!texture||!this.textures.exists(texture))throw new Error(`Missing NPC style texture for ${n.id}: ${texture}`);for(const [i,dir]of['down','up','left','right'].entries()){const idle=`${texture}_idle_${dir}`,walk=`${texture}_walk_${dir}`;if(!this.anims.exists(idle))this.anims.create({key:idle,frames:this.anims.generateFrameNumbers(texture,this.paperDollPreview?{start:i*4,end:i*4+3}:{start:i*8,end:i*8+3}),frameRate:4,repeat:-1});if(!this.anims.exists(walk))this.anims.create({key:walk,frames:this.anims.generateFrameNumbers(texture,this.paperDollPreview?{start:16+i*4,end:19+i*4}:{start:32+i*8,end:39+i*8}),frameRate:9,repeat:-1})}
      const sprite=this.add.sprite(n.x,n.y,texture,0).setOrigin(.5,1).setDepth(this.ramparts.depth(n)).setName(n.id);sprite.setData('npcId',n.id);sprite.setInteractive({useHandCursor:true});sprite.on('pointerdown',pointer=>{this.pendingNpcClick={id:n.id,x:pointer.x,y:pointer.y}});sprite.on('pointerup',pointer=>{const pending=this.pendingNpcClick;this.pendingNpcClick=null;if(pending?.id===n.id&&!this.dragState?.moved&&performance.now()-this.lastWorldDragAt>140&&Math.hypot(pointer.x-pending.x,pointer.y-pending.y)<7)this.selectNPC(n.id)});sprite.play(`${texture}_idle_down`);this.npcSprites.set(n.id,sprite);
      const ramparts=this.ramparts;
      const hit=sprite.input.hitArea,contains=sprite.input.hitAreaCallback;
      sprite.input.hitAreaCallback=(area,x,y,actor)=>contains(hit,x,y+ramparts.height(n),actor);
      for(const method of ['renderWebGL','renderCanvas']){
        const render=sprite[method];
        sprite[method]=function(renderer,source,camera,parentMatrix){
          if(this.showingModularPose||n.skyStep?.phase==='travel')return;
          const y=this.y;
          this.y-=ramparts.height(n);
          try{render.call(this,renderer,source,camera,parentMatrix);}finally{this.y=y;}
        };
      }
      if(!this.paperDollPreview)this.createNPCModularSprites(n,sprite);
    }
    this.nameplates=new WorldNameplates(this);
    if(CHARACTER_RIG_PREVIEW&&!this.paperDollPreview&&this.textures.exists('rig-variants')) {
      const npc=this.populationWorld.npcs.find(candidate=>candidate.alive&&candidate.populationRole==='low_disciple');
      if(npc) this.characterRigPreview=new WorldCharacterPreview(this,npc,this.npcSprites.get(npc.id));
    }
    this.syncWeaponVisuals();
    this.populationDebug=document.createElement('aside');this.populationDebug.id='population-debug';this.populationDebug.innerHTML='<button type="button" aria-expanded="false">108 cư dân · AI</button><section hidden></section>';
    this.populationDebug.style.cssText='position:fixed;right:14px;top:112px;z-index:20;color:#f1e7cc;font:12px/1.45 monospace;pointer-events:auto';this.populationDebug.hidden=true;
    const button=this.populationDebug.querySelector('button'),section=this.populationDebug.querySelector('section');button.style.cssText='padding:7px 10px;color:#f0dfb0;background:#111d18eF;border:1px solid #88764a;cursor:pointer';section.style.cssText='width:300px;max-height:48vh;overflow:auto;margin-top:5px;padding:9px;background:#111d18f2;border:1px solid #88764a';button.onclick=()=>{section.hidden=!section.hidden;button.setAttribute('aria-expanded',String(!section.hidden))};document.body.append(this.populationDebug);
    this.guardDebug=new GuardDebug(this);
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
    for(const npc of this.populationWorld.npcs){const actor=this.npcSprites.get(npc.id),parts=this.modularVisuals.get(npc.id);if(!actor||!parts?.length)continue;if(!actor.visible||!npc.alive||npc.skyStep?.phase==='travel'||actor.alpha<.01){for(const overlay of parts)if(overlay.visible)overlay.setVisible(false);continue}const baseFrame=Number(actor.frame?.name)||0,row=Math.floor(baseFrame/8)%4,phase=actor.getData('moving')?Math.min(2,Math.floor((baseFrame%8)*3/8)):0,frame=row*3+phase;
      for(const overlay of parts){const frameIndex=overlay.getData('frameOffset')+frame;if(overlay.getData('lastModularFrame')!==frameIndex){overlay.setFrame(frameIndex);overlay.setData('lastModularFrame',frameIndex)}const kind=overlay.getData('partKind'),isBack=row===1,depth=actor.depth+(isBack&&['hair','accessory'].includes(kind)?-0.12:kind==='outfit'?.02:kind==='face'?.04:kind==='hair'?.06:.08);const y=actor.y-this.ramparts.height(npc);if(overlay.x!==actor.x||overlay.y!==y)overlay.setPosition(actor.x,y);if(overlay.depth!==depth)overlay.setDepth(depth);if(!overlay.visible)overlay.setVisible(true)}
    }
  }
  getModularAppearanceState(){const npcs=this.populationWorld?.npcs??[],parts=npcs.map(n=>n.visualParts).filter(Boolean),samples=npcs.slice(0,8).map(n=>{const actor=this.npcSprites.get(n.id);return{id:n.id,name:n.name,role:n.populationRole,visualStyleId:n.visualStyleId,visualParts:n.visualParts,baseFrame:Number(actor?.frame?.name??0),moving:Boolean(actor?.getData('moving')),layers:(this.modularVisuals.get(n.id)??[]).map(s=>({id:s.getData('partId'),frame:Number(s.frame?.name??0),visible:s.visible}))}}),frameTimes=this.frameSamples??[];return{population:npcs.length,assigned:parts.length,distinct:{hair:new Set(parts.map(p=>p.hairId)).size,face:new Set(parts.map(p=>p.faceId)).size,outfit:new Set(parts.map(p=>p.outfitId)).size,accessory:new Set(parts.flatMap(p=>p.accessoryIds)).size,completeLooks:new Set(parts.map(p=>JSON.stringify(p))).size},renderedLayers:[...this.modularVisuals.values()].reduce((n,a)=>n+a.length,0),visibleLayerSprites:[...this.modularVisuals.values()].flat().filter(s=>s.visible).length,frameTimeAverageMs:frameTimes.length?Number((frameTimes.reduce((a,b)=>a+b,0)/frameTimes.length).toFixed(2)):null,textures:NPC_MODULAR_TEXTURES.map(key=>({key,loaded:this.textures.exists(`modular-${key}`)})),sample:samples}}
  npcRoleTitle(npc){const title=this.sectCampus?.titles.get(npc.id);if(title)return title;if(npc.authorityRole==='city_master')return'Thành chủ Thanh Vân Thành';if(npc.authorityRole==='sect_leader'||npc.populationRole==='sect_leader')return'Tông chủ Thanh Vân Tông';return({commoner:'Dân thường',low_disciple:'Đệ tử Thanh Vân Tông',elder:'Trưởng lão',merchant:'Thương nhân',tavern_staff:'Nhân viên tửu quán',city_guard:'Vệ binh Thanh Vân Thành',repair_worker:'Thợ sửa chữa',hunter:'Thợ săn',herb_gatherer:'Người hái dược',quest_clerk:'Thư lại nhiệm vụ',independent_cultivator:'Tán tu'})[npc.populationRole]??npc.populationDuty??npc.populationRole}
  selectNPC(id){const npc=this.populationWorld?.npcs.find(n=>n.id===id);if(!npc)return false;this.closeNpcGift?.();this.selectedNpcId=id;if(!this.possessedNpcId)this.cameras.main.centerOn(npc.x,npc.y);for(const drawer of ['world-map-menu','world-roster-panel','world-dev-menu'])document.getElementById(drawer).hidden=true;this.renderPossessionHud();this.refreshRoster();this.refreshHud();return true}
  refreshRoster(){const list=document.getElementById('roster-list');if(!list||!this.populationWorld)return;const query=(document.getElementById('roster-search')?.value??'').trim().toLocaleLowerCase('vi'),npcs=this.populationWorld.npcs.filter(n=>n.alive&&(!query||`${residentName(n)} ${n.populationDuty??''} ${n.populationRole} ${n.profession}`.toLocaleLowerCase('vi').includes(query)));document.getElementById('roster-count').textContent=npcs.length+' cư dân';list.innerHTML=npcs.slice(0,108).map(n=>`<button class="roster-row" data-roster-npc="${n.id}"><span><b>${residentName(n)}</b><small>${this.npcRoleTitle(n)} · ${formatRealm(n)}</small></span><i>${residentActivity(n,this,n.id===this.possessedNpcId).activity}</i></button>`).join('');list.querySelectorAll('[data-roster-npc]').forEach(button=>button.onclick=()=>this.selectNPC(button.dataset.rosterNpc))}
  toggleDrawer(id){for(const other of ['world-map-menu','world-roster-panel','world-dev-menu']){const panel=document.getElementById(other);if(panel)panel.hidden=other===id?!panel.hidden:true}this.refreshRoster()}
  closeNpcCard(){if(this.possessedNpcId)return;this.closeNpcGift?.();this.selectedNpcId=null;this.renderPossessionHud()}
  initPossessionHud(){
    this.residentProfile=new ResidentProfile(this);
    this.possessionPanel=this.residentProfile.panel;
    this.renderPossessionHud();
  }
  possessionCost(npc){return PossessionSystem.cost(npc);}
  bindAppearanceSync(){
    if(this.paperDollPreview||FLIGHT_ARENA)return;
    const apply=event=>{
      if(event.key!==WORLD_POPULATION_SAVE_KEY||event.storageArea!==localStorage)return;
      const value=localStorage.getItem(WORLD_POPULATION_SAVE_KEY);
      if(!value)return;
      const updates=this.populationSaveGuard.acceptExternal(value,appearanceEdits);
      if(!updates)return;
      for(const npc of this.populationWorld.npcs){
        if(updates.has(npc.id))npc.modularAppearance=updates.get(npc.id);
      }
      this.refreshPossessionHud();
    };
    window.addEventListener('storage',apply);
    this.events.once('shutdown',()=>window.removeEventListener('storage',apply));
  }
  restorePossession(){const session=this.populationWorld?.heaven?.possession;if(!session)return;const npc=this.populationWorld.npcs.find(n=>n.id===session.npcId&&n.alive&&!n.ascended);if(!npc){PossessionSystem.end(this.populationWorld.heaven);this.persistPopulation();return}this.possessedNpcId=npc.id;this.selectedNpcId=npc.id;this.cameraFollowSuspended=false;this.cameras.main.centerOn(npc.x,npc.y);this.worldPopulationToast(`Đã khôi phục nhập thân ${npc.name} sau khi tải lại.`)}
  getPossessionState(){const npc=this.populationWorld?.npcs.find(n=>n.id===this.possessedNpcId);return{active:Boolean(npc),npcId:npc?.id??null,name:npc?.name??null,hp:npc?.hp??null,x:npc?.x??null,y:npc?.y??null,realmIndex:npc?.realmIndex??null,inventory:npc?.inventory?.map(i=>({...i}))??[],divinePower:this.populationWorld?.heaven?.divinePower??0,targetFaunaId:this.selectedFaunaId}}
  getWeaponState(){const npcs=this.populationWorld?.npcs??[];return{provisioning:this.populationWorld?.weaponProvisioning??null,armed:npcs.filter(n=>weaponForNpc(n)).map(n=>({id:n.id,name:n.name,role:n.populationRole,weapon:weaponForNpc(n).id,owned:n.inventory.filter(i=>weaponForNpc({...n,equippedWeapon:i.itemId})).map(i=>i.itemId)})),unarmed:npcs.filter(n=>n.alive&&!weaponForNpc(n)).length,activeNpcId:this.possessedNpcId}}
  equipPossessedWeapon(itemId){const npc=this.populationWorld?.npcs.find(n=>n.id===this.possessedNpcId&&n.alive);if((itemId==='training_crossbow'&&this.characterRigPreview?.npc!==npc)||this.characterRigPreview?.mount.locked||(itemId===ROD&&this.characterRigPreview?.mount.attached))return false;if(npc?.flight){this.worldPopulationToast('Hạ kiếm trước khi đổi trang bị.');return false}if(!npc||!(itemId===ROD ? hasRod(npc) && Boolean(npc.equippedWeapon=ROD) : setNpcWeapon(npc,itemId))){this.worldPopulationToast(itemId?'NPC không sở hữu vũ khí này.':'Không thể tháo vũ khí lúc này.');return false}this.heavenActions.stopFishing();this.syncWeaponVisuals();this.persistPopulation();this.refreshPossessionHud();this.worldPopulationToast(itemId?`Đã trang bị ${weaponForNpc(npc)?.name??itemName(itemId)}.`:'Đã tháo vũ khí.');return true}
  syncWeaponVisuals(){if(!this.populationWorld)return;for(const npc of this.populationWorld.npcs){const actor=this.npcSprites.get(npc.id);if(!actor)continue;const weapon=weaponForNpc(npc);let overlay=this.weaponSprites.get(npc.id);
    if(npc.flight||actor.alpha<.01||weapon?.kind==='crossbow'){if(overlay?.visible)overlay.setVisible(false);continue}
    if(npc.wallLevel&&rodEquipped(npc)){overlay?.setVisible(false);continue}
    if(rodEquipped(npc)){syncRodVisual(this,npc,actor,overlay);continue}
    if(overlay?.getData('weaponId')===ROD){overlay.destroy();this.weaponSprites.delete(npc.id);overlay=null}
    if(!weapon){if(overlay?.visible)overlay.setVisible(false);continue}const texture=weapon.kind==='dao'?'weapon-overlay-iron_dao':'weapon-overlay-iron_sword';if(!this.textures.exists(texture)){if(overlay?.visible)overlay.setVisible(false);continue}if(!overlay){overlay=this.add.sprite(actor.x,actor.y,texture,0).setOrigin(.5,1).setName(`weapon:${npc.id}`);overlay.setData('weaponId',weapon.id);this.weaponSprites.set(npc.id,overlay)}else if(overlay.getData('weaponId')!==weapon.id){overlay.setTexture(texture);overlay.setData('weaponId',weapon.id)}const visible=Boolean(npc.alive&&actor.visible);if(!visible){if(overlay.visible)overlay.setVisible(false);continue}const state=this.weaponAttackStates.get(npc.id);let frame;if(state&&this.time.now<state.until){const phase=Math.min(5,Math.floor((this.time.now-state.started)/55));frame=state.row*8+state.dirIndex*8+phase}else{if(state)this.weaponAttackStates.delete(npc.id);const actorFrame=Number(actor.frame?.name);frame=Number.isInteger(actorFrame)&&actorFrame>=0&&actorFrame<288?actorFrame:0}if(Number(overlay.frame?.name)!==frame)overlay.setFrame(frame);const direction=actor.anims.currentAnim?.key?.split('_').at(-1)??'down',depth=actor.depth+(direction==='up'||direction==='left'?-0.15:0.15);if(overlay.x!==actor.x||overlay.y!==actor.y)overlay.setPosition(actor.x,actor.y);if(overlay.depth!==depth)overlay.setDepth(depth);if(!overlay.visible)overlay.setVisible(true)}}
  rodTip(npc,direction){return rodTip(this,npc,direction)}
  playWeaponPose(npc,mode,direction){const dirs=['down','up','left','right'],dirIndex=Math.max(0,dirs.indexOf(direction));const row=mode.animation.startsWith('dao_slash')?12:mode.animation==='jian_thrust'?16:mode.animation==='jian_slash'?20:null;if(row===null)return;this.weaponAttackStates.set(npc.id,{row,dirIndex,started:this.time.now,until:this.time.now+390});this.syncWeaponVisuals()}
  spawnWeaponFx(kind,direction,x,y,depth=y+15){const key=`weapon-fx-${kind}`;if(!this.textures.exists(key))return;const dirs=['down','up','left','right'],d=Math.max(0,dirs.indexOf(direction)),start=d*6,animKey=`${key}-${direction}`;if(!this.anims.exists(animKey))this.anims.create({key:animKey,frames:this.anims.generateFrameNumbers(key,{start,end:start+5}),frameRate:18,repeat:0});const fx=this.add.sprite(x,y,key,start).setOrigin(.5,.5).setDepth(depth);this.weaponFxSprites.push(fx);fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE,()=>{this.weaponFxSprites=this.weaponFxSprites.filter(s=>s!==fx);fx.destroy()});fx.play(animKey)}
  performPossessedAttack(targetId=null,skill=false){const npc=this.populationWorld?.npcs.find(n=>n.id===this.possessedNpcId&&n.alive),actor=this.npcSprites.get(this.possessedNpcId);if(!npc||!actor)return{ok:false,reason:'no-possessed-actor'};if(npc.flight){this.flyingSword.land(npc);return{ok:false,reason:'land-before-combat'}}if(skill){if(!weaponForNpc(npc)){this.worldPopulationToast('Cần trang bị đao hoặc kiếm để thi triển.');return{ok:false,reason:'weapon-required'}}if(!npc.skills?.includes('qi-sword')){this.worldPopulationToast('NPC này chưa học kiếm pháp.');return{ok:false,reason:'skill-locked'}}if(npc.mp<8){this.worldPopulationToast('Không đủ linh lực cho kỹ năng.');return{ok:false,reason:'low-mp'}}if(this.playerSkillCooldown>0){this.worldPopulationToast('Kỹ năng đang hồi chiêu.');return{ok:false,reason:'cooldown'}}}else if(this.playerAttackCooldown>0){this.worldPopulationToast('Đòn đánh đang hồi chiêu.');return{ok:false,reason:'cooldown'}}
    const candidateId=targetId??(this.selectedNpcId&&this.selectedNpcId!==npc.id?this.selectedNpcId:this.selectedFaunaId),victim=candidateId?this.populationWorld.npcs.find(n=>n.id===candidateId&&n.alive):null,fauna=candidateId?this.populationWorld.environment.fauna.find(f=>f.id===candidateId&&f.alive):null,target=victim??fauna;if(aboveGroundCombat(victim))return{ok:false,reason:'airborne-target'};if(!target){this.worldPopulationToast('Chọn yêu thú hoặc NPC còn sống làm mục tiêu.');return{ok:false,reason:'no-target'}}
    const weapon=weaponForNpc(npc),combo=this.playerCombo%3+1,mode=weaponAttackMode(weapon,combo,skill),facing=this.facePoint(npc,target),fallback=weapon?mode:{animation:`unarmed_${combo}`,hit:'unarmed',range:54,width:54,multiplier:1};const range=fallback.range??54,width=fallback.width??54;if(!isInWeaponArc(npc.x,npc.y,target.x,target.y,facing,{...fallback,range,width})){this.worldPopulationToast('Mục tiêu nằm ngoài tầm hoặc lệch hướng đòn đánh.');return{ok:false,reason:'out-of-range'}}if(!this.clearCombatLine(npc,target)){this.worldPopulationToast('Vật cản hoặc độ cao đang chắn đòn đánh.');return{ok:false,reason:'blocked'}}
    if(skill){npc.mp-=8;this.playerSkillCooldown=1.1}else this.playerAttackCooldown=weapon?.kind==='dao'?.52:.42;this.playerCombo=combo;actor.play(`${this.npcTextureFor(npc)}_idle_${facing}`,true);this.playWeaponPose(npc,fallback,facing);const fxKind=weapon?.kind==='dao'?'dao':skill&&weapon?.kind==='jian'?'thrust':weapon?.kind==='jian'?'jian':'dao';this.spawnWeaponFx(fxKind,facing,(npc.x+target.x)/2,(npc.y+target.y)/2-this.ramparts.height(npc),this.ramparts.depth(npc)+15);actor.setTint(0xd5f4dc);this.time.delayedCall(100,()=>actor.clearTint());const stats=cultivationStats(npc),raw=damageForStrike(npc.realmIndex,combo,skill,stats.attack,fallback.multiplier??1);let result;
    if(victim){const victimStats=cultivationStats(victim),damage=Math.max(1,Math.floor(raw-victimStats.defense));result=this.reportCombat(npc.id,victim.id,damage,{eventId:`possessed-weapon:${createWorldUuid()}`});if(result.ok)this.spawnWeaponFx('jian',facing,victim.x,victim.y-this.ramparts.height(victim),this.ramparts.depth(victim)+15);this.worldPopulationToast(result.incident?'Luật thành: báo động vì tấn công NPC trái phép.':`Đã đánh ${victim.name} bằng ${weapon?.name??'tay không'} · ${damage} sát thương.`)}else{result=this.damageFaunaEntity(fauna.id,npc.id,raw,`possessed-weapon:${createWorldUuid()}`,range);if(result.ok){this.spawnWeaponFx('jian',facing,fauna.x,fauna.y);this.worldPopulationToast(result.fauna.alive?`Trúng ${FAUNA_SPECIES[fauna.species].name} bằng ${weapon?.name??'tay không'} · -${result.damage} HP.`:`${FAUNA_SPECIES[fauna.species].name} bị hạ · ${result.drops[0]?.itemId??'không có loot'}.`)}else this.worldPopulationToast('Đòn đánh hụt hoặc mục tiêu đã đổi trạng thái.')}
    this.refreshHud();return{ok:Boolean(result?.ok??result?.eventId),weapon:weapon?.id??null,damage:result?.damage??null,mode:fallback.animation,skill}}
  beginPossession(){document.getElementById("heaven-shop").hidden=true;const npc=this.populationWorld?.npcs.find(n=>n.id===this.selectedNpcId);if(!npc)return;if(npc.skyStep||tribulationLocked(npc)){this.worldPopulationToast(npc.skyStep?'Tu sĩ đang lướt mây.':'Tu sĩ đang chịu Thiên Kiếp.');return;}const result=PossessionSystem.start(this.populationWorld.heaven,npc);if(!result.ok){this.worldPopulationToast(result.message);return}this.prePossessionFaunaTarget=npc.faunaHuntTargetId;this.possessedNpcId=npc.id;this.flyingSword.takeControl(npc);this.cameraFollowSuspended=false;this.selectedNpcId=npc.id;this.npcRoutes.delete(npc.id);this.cameras.main.centerOn(npc.x,npc.y);this.persistPopulation();this.worldPopulationToast(result.message);this.refreshHud()}
  endPossession(message='Đã rời nhập thân. NPC tiếp tục tự chủ từ vị trí hiện tại.'){if(!this.possessedNpcId)return;this.closeSkyAim();this.merchantPanel?.close();this.heavenActions.stopFishing();const npc=this.populationWorld.npcs.find(n=>n.id===this.possessedNpcId);PossessionSystem.end(this.populationWorld.heaven);this.possessedNpcId=null;this.cameraFollowSuspended=false;if(npc?.alive){
      if(npc.flight){npc.faunaHuntTargetId=this.prePossessionFaunaTarget;this.prePossessionFaunaTarget=null;this.flyingSword.releaseControl(npc);this.persistPopulation();this.worldPopulationToast(message);this.refreshHud();return}
      npc.faunaHuntTargetId=this.prePossessionFaunaTarget;this.prePossessionFaunaTarget=null;npc.actionTarget={x:npc.x,y:npc.y};npc.goalAction='idle';npc.action='idle';npc.shortGoal='Trở lại nhịp sống tự chủ';npc.routeIndex=0;this.npcRoutes.delete(npc.id)}this.persistPopulation();this.worldPopulationToast(message);this.refreshHud()}
  returnCameraToPossessedActor(){if(!this.possessedNpcId)return false;const npc=this.populationWorld.npcs.find(n=>n.id===this.possessedNpcId);if(!npc)return false;this.cameraFollowSuspended=false;this.navigateCameraTo(npc.x,npc.y,'return');this.refreshHud();return true}
  selectFaunaTarget(id){const target=this.populationWorld.environment.fauna.find(f=>f.id===id&&f.alive);if(!target)return false;this.selectedFaunaId=id;const controller=this.populationWorld.npcs.find(n=>n.id===this.possessedNpcId&&n.alive);if(controller){controller.faunaHuntTargetId=id;controller.actionTarget={x:target.x,y:target.y};for(const hunter of this.populationWorld.npcs)if(hunter.id!==controller.id&&hunter.faunaHuntTargetId===id){hunter.faunaHuntTargetId=undefined;this.npcRoutes.delete(hunter.id)}}this.persistPopulation();this.refreshHud();return true}
  renderPossessionHud(){
    if(!this.residentProfile||!this.populationWorld)return;
    const world=this.populationWorld;
    const npc=world.npcs.find(n=>n.id===(this.possessedNpcId??this.selectedNpcId));
    const active=Boolean(npc?.id===this.possessedNpcId);
    this.residentProfile.show(npc,active);
    if(!active||!npc)return;
    const controls=this.residentProfile.fields.controls;
    const live=world.environment.fauna.filter(f=>f.alive);
    const target=live.find(f=>f.id===this.selectedFaunaId);
    const drop=(world.environment.drops??[]).find(d=>d.status==='ground'&&Math.hypot(npc.x-d.x,npc.y-d.y)<120);
    const weapon=weaponForNpc(npc);
    const signature=JSON.stringify([npc.id,npc.equippedWeapon,npc.skills,npc.inventory,live.map(f=>f.id)]);
    if(controls.dataset.signature!==signature){
      controls.dataset.signature=signature;
      controls.innerHTML='<label class="weapon-select">Vũ khí<select id="equipment-weapon" aria-label="Vũ khí"></select></label><select id="possess-fauna" aria-label="Mục tiêu"></select><small class="hud-detail" data-target></small><small class="hud-controls">WASD di chuyển · V ngự kiếm · T lướt mây · Shift tăng tốc · Ctrl bay chậm · J đánh · K võ kỹ · E giao dịch/nhặt · F câu · Esc rời'+(this.characterRigPreview?.npc===npc?' · M Huyền Hổ · Q ngắm · R nạp nỏ':'')+'</small>';
      const weapons=controls.querySelector('#equipment-weapon');
      weapons.add(new Option('Tay không',''));
      if(hasRod(npc))weapons.add(new Option('Cần câu phổ thông',ROD));
      for(const option of weaponChoices(npc))if(option.kind!=='crossbow'||this.characterRigPreview?.npc===npc)
        weapons.add(new Option(option.name,option.id));
      weapons.value=rodEquipped(npc)?ROD:weapon?.id??'';
      weapons.onchange=e=>this.equipPossessedWeapon(e.target.value||null);
      const fauna=controls.querySelector('#possess-fauna');
      fauna.add(new Option('Chọn mục tiêu',''));
      for(const f of live)fauna.add(new Option(FAUNA_SPECIES[f.species].name,f.id));
      fauna.onchange=e=>e.target.value&&this.selectFaunaTarget(e.target.value);
      mountSkillPanel(this,controls,npc);
    }
    const fauna=controls.querySelector('#possess-fauna');
    if(fauna.value!==(target?.id??''))fauna.value=target?.id??'';
    const detail=controls.querySelector('[data-target]');
    const label=(target?FAUNA_SPECIES[target.species].name+' · HP '+target.hp:'Chưa chọn mục tiêu')+
      (drop?' · Rơi '+itemName(drop.itemId)+' ×'+drop.count:'');
    if(detail.textContent!==label)detail.textContent=label;
    const weapons=controls.querySelector('#equipment-weapon');
    weapons.disabled=Boolean(npc.flight);
    const equipped=rodEquipped(npc)?ROD:weapon?.id??'';
    if(weapons.value!==equipped)weapons.value=equipped;
    updateSkillStatus(this,npc);
  }
  npcActivityReason(npc,distance){if(npc.pathBlocked)return'Pathfinding blocked; mục tiêu chưa tới được';if(distance>24)return`Đang di chuyển tới ${npc.shortGoal??npc.goalAction}`;if(npc.populationRole==='merchant')return`Trực sạp ${npc.stallId??''}; giao dịch chỉ dùng hàng tồn kho thật`;if(npc.populationRole==='city_guard'&&npc.goalAction==='patrol')return`Đứng gác/tuần tra điểm ${((npc.patrolIndex??0)+1)}/${npc.patrolPoints?.length??1}`;if(npc.goalAction==='cultivate')return`Tu luyện thật · tiến độ ${Math.floor(npc.actionProgress??0)}/60 phút`;if(npc.goalAction==='rest')return`Nghỉ phục hồi · mệt ${Math.round(npc.fatigue)} · AI xét lại ở phút tiếp theo`;if(npc.professionTask)return`${npc.professionTask.kind} · ${npc.professionTask.state} · ${npc.professionTask.lastReason??npc.professionTask.targetId}`;return npc.aiDecision?.reason??npc.populationDuty??`Hành động ${npc.action??'idle'} · mục tiêu ${npc.shortGoal??npc.goalAction??'chưa có'}`}
  trackNpcMotion(npc,sprite){
    const entry=this.scheduler?.byId.get(npc.id),target=entry?.navigationGoal;
    const active=Boolean(target&&npc.alive&&!entry.waitingForSlot&&!entry.passageWait&&!npc.flight&&!npc.skyStep);
    return {targetDistance:active?Math.hypot(npc.x-target.x,npc.y-target.y):0,
      noProgressMs:active&&entry.travelWatch?Math.max(0,this.scheduler.time-entry.travelWatch.since):0,
      moving:Boolean(active&&sprite?.getData('moving')||npc.flight||npc.skyStep)};
  }
  getPopulationState(){if(!this.populationWorld)return{total:0};const npcs=this.populationWorld.npcs,counts={};for(const n of npcs)counts[n.populationRole]=(counts[n.populationRole]??0)+1;const states={moving:0,working:0,cultivating:0,trading:0,mission:0,fighting:0,resting:0,patrolling:0,guarding:0,toDuty:0,gathering:0,idle:0,stuck:0,noTarget:0};const stuckExamples=[];let visible=0,inCamera=0;const view=this.cameras.main.worldView,diagnosticRows=[];for(const n of npcs){if(!n.alive)continue;const e=this.scheduler.byId.get(n.id);const sprite=this.npcSprites.get(n.id),inside=Boolean(sprite&&sprite.x>=view.x&&sprite.x<=view.right&&sprite.y>=view.y&&sprite.y<=view.bottom),motion=sprite?this.trackNpcMotion(n,sprite):null,distance=motion?.targetDistance??Math.hypot(n.actionTarget?.x-n.x||0,n.actionTarget?.y-n.y||0),reason=this.npcActivityReason(n,distance);if(sprite?.visible)visible++;if(inside)inCamera++;if(motion?.moving)states.moving++;if(n.action==='work'||n.action==='farm')states.working++;if(n.action==='cultivate')states.cultivating++;if(n.action==='trade'||n.action==='shop')states.trading++;if(n.action==='mission'||n.action==='commission')states.mission++;if(n.action==='fight')states.fighting++;if(n.action==='rest')states.resting++;if(['observing','patrolling'].includes(e.guardState))states.patrolling++;if(e.guardState==='guarding')states.guarding++;if(e.guardState==='toDuty')states.toDuty++;if(n.action==='gather')states.gathering++;if(!n.goalAction||n.goalAction==='idle')states.idle++;if((motion?.noProgressMs??0)>=8000){
      states.stuck++;
      const route=this.npcRoutes.get(n.id),target=e.navigationGoal;
      stuckExamples.push({id:n.id,name:n.name,role:n.populationRole,action:n.action,goal:n.goalAction,
        reason:e.routeFailure??(e.blockerId?'occupancy':'no-progress'),blockerId:e.blockerId??null,
        reservation:this.society?.visits[n.id]?.seat??this.workstations.claims.get(n.id)?.key??null,
        lastDecisionMs:e.lastDecision??null,
        targetDistance:Math.round(distance),noProgressMs:Math.round(motion.noProgressMs),pathBlocked:Boolean(n.pathBlocked),
        position:{x:n.x,y:n.y},target,routeIndex:n.routeIndex??0,routePoints:route?.points.length??0,
        startComponent:this.navComponentAt(n),targetComponent:this.navComponentAt(target)});
    }if(!n.actionTarget&&!n.home)states.noTarget++;if(n.alive&&inside&&(!motion?.moving||n.pathBlocked||(motion?.noProgressMs??0)>5000)&&diagnosticRows.length<12)diagnosticRows.push({id:n.id,name:n.name,role:n.populationRole,action:n.action,goalAction:n.goalAction,goal:n.shortGoal,reason,targetDistance:Math.round(distance),noProgressMs:Math.round(motion?.noProgressMs??0),pathBlocked:Boolean(n.pathBlocked),position:{x:Math.round(sprite.x),y:Math.round(sprite.y)},target:n.actionTarget??n.home})}const sorted=[...this.frameSamples].sort((a,b)=>a-b),p95=sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))]??0,frameAvg=sorted.length?sorted.reduce((a,b)=>a+b,0)/sorted.length:0,aiSorted=[...this.aiCostSamples].sort((a,b)=>a-b),lawSorted=[...(this.cityLawCostSamples??[])].sort((a,b)=>a-b),lawAvg=lawSorted.length?lawSorted.reduce((a,b)=>a+b,0)/lawSorted.length:0;return{total:npcs.length,alive:npcs.filter(n=>n.alive).length,visible,inCamera,counts,states,diagnostics:{stationaryExamples:diagnosticRows,stuckExamples,progressTracked:npcs.filter(n=>this.scheduler.byId.get(n.id)?.travelWatch).length},aiCostMs:this.populationAiCost,aiCostP95Ms:aiSorted[Math.min(aiSorted.length-1,Math.floor(aiSorted.length*.95))]??0,cityLawCostMs:this.cityLawCostMs??0,cityLawCostP95Ms:lawSorted[Math.min(lawSorted.length-1,Math.floor(lawSorted.length*.95))]??0,cityLawCostAvgMs:lawAvg,fps:this.game.loop.actualFps,frameAvgMs:frameAvg,frameP95Ms:p95,...this.lastRates??{pathfindingCalls:0,collisionChecks:0,goalEvaluations:0},saveKey:WORLD_POPULATION_SAVE_KEY,selected:this.populationWorld.npcs.find(n=>n.id===this.selectedNpcId)?(()=>{const n=this.populationWorld.npcs.find(n=>n.id===this.selectedNpcId),sprite=this.npcSprites.get(n.id),target=n.actionTarget??n.home,distance=sprite?Math.hypot(sprite.x-target.x,sprite.y-target.y):0,motion=this.trackNpcMotion(n,sprite);return{id:n.id,name:n.name,role:n.populationRole,profession:n.profession,faction:n.faction,origin:n.aiProfile?.origin,personality:n.personality,realmIndex:n.realmIndex,realmLevel:n.realmLevel,hp:n.hp,needs:{hunger:n.hunger,fatigue:n.fatigue,mood:n.mood},goal:n.shortGoal,action:n.action,goalAction:n.goalAction,position:{x:sprite?.x,y:sprite?.y},target,distance:Math.round(distance),noProgressMs:Math.round(motion?.noProgressMs??0),pathBlocked:Boolean(n.pathBlocked),task:n.professionTask??null,reason:this.npcActivityReason(n,distance)}})():null}}
  getProfessionState(){const world=this.populationWorld;if(!world)return{};return{repairers:world.npcs.filter(n=>n.populationRole==='repair_worker').map(n=>{const commission=world.commissions?.find(c=>c.commissionId===n.assignedCommissionId||c.commissionId===n.professionTask?.targetId),building=world.environment?.objects.find(o=>o.id===commission?.targetId);return{id:n.id,x:n.x,y:n.y,action:n.action,actionProgress:n.actionProgress,target:n.actionTarget,jobId:commission?.commissionId??null,buildingId:building?.id??null,hp:building?.hp??null,maxHp:building?.maxHp??null,materials:world.settlement.materials,progress:commission?.progress??0,status:commission?.status??n.professionTask?.state??'waiting',reason:n.professionTask?.lastReason??(!commission?'no-assigned-repair':null)}}),herbGatherers:world.npcs.filter(n=>n.populationRole==='herb_gatherer').map(n=>({id:n.id,x:n.x,y:n.y,action:n.action,actionProgress:n.actionProgress,nodeId:n.assignedResourceNodeId??null,target:n.actionTarget,nodeRemaining:world.environment?.resourceNodes?.find(r=>r.id===n.assignedResourceNodeId)?.amount??null,inventory:structuredClone(n.inventory),goal:n.shortGoal,status:n.professionTask?.state??'idle',reason:n.professionTask?.lastReason??null})),buildings:world.environment?.objects.map(o=>({id:o.id,hp:o.hp,maxHp:o.maxHp,status:o.status,repairProgress:o.repairProgress})),nodes:world.environment?.resourceNodes?.map(n=>({id:n.id,amount:n.amount,maxAmount:n.maxAmount,reservedBy:n.reservedBy,danger:n.danger})),commissions:world.commissions?.map(c=>({id:c.commissionId,targetId:c.targetId,status:c.status,acceptedBy:c.acceptedBy,progress:c.progress,materialsConsumed:c.materialsConsumed}))}}
  async stepProfessionMinutes(minutes){const count=Phaser.Math.Clamp(Math.floor(minutes),0,360),world=this.populationWorld;for(let i=0;i<count;i++){world.clock.minute++;if(world.clock.minute>=1440){world.clock.minute=0;world.clock.day++}this.populationSimulation.tick(1,world.clock.day,world.clock.minute);tickWorldRebuildProfessionWork(world,world.commissionBoard??{x:2928,y:2160},(a,b)=>this.canReachPoint(a,b));this.assignPopulationTargets();if(i%10===9){this.refreshProfessionVisuals();this.persistPopulation();this.renderPopulationDebug();await new Promise(resolve=>setTimeout(resolve,200))}}this.refreshProfessionVisuals();this.persistPopulation();this.renderPopulationDebug();return{minutes:count,profession:this.getProfessionState(),population:this.getPopulationState()}}
  createResourceNodeSprites(){for(const node of this.populationWorld?.environment?.resourceNodes??[]){const sprite=this.add.image(node.x,node.y,'rebuild-herb-node').setOrigin(.5,1).setDepth(node.y+2).setName(node.id);sprite.setData('resourceNodeId',node.id);this.resourceNodeSprites.set(node.id,sprite);sprite.setVisible(node.amount>0)}}
  initFauna(){
    this.faunaZones=(this.map.getObjectLayer('FaunaZones')?.objects??[]).map(o=>({
      zoneId:this.prop(o,'zoneId'),species:this.prop(o,'species'),cap:this.prop(o,'cap'),respawnMs:this.prop(o,'respawnMs'),
      activityRadius:this.prop(o,'activityRadius'),leash:this.prop(o,'leash'),safeBuffer:this.prop(o,'safeBuffer'),normalOnly:this.prop(o,'normalOnly'),realmIndex:this.prop(o,'realmIndex'),realmLevel:this.prop(o,'realmLevel'),nocturnal:this.prop(o,'nocturnal'),
      name:o.name,x:o.x,y:o.y,width:o.width,height:o.height
    })).filter(z=>FAUNA_IDS.includes(z.species)&&Number.isInteger(z.cap)&&z.cap>0);
    this.monsterSafeBuffer=Math.max(0,...this.faunaZones.map(z=>z.safeBuffer??35));
    this.monsterSafeRegions=(this.map.getObjectLayer('RegionMarkers')?.objects??[]).filter(o=>['city','south-suburb','sect'].includes(this.prop(o,'regionId')));
    this.monsterVisuals=new MonsterVisuals(this);
    for(const shop of this.populationWorld.shops)for(const id of Object.keys(LOOT_ICON)){
      shop.buyPrices[id]??=itemPrices[id].buy;shop.sellPrices[id]??=itemPrices[id].sell;
    }
    const world=this.populationWorld;
    ensureFauna(world,this.faunaZones,(z,x,y,species,rank)=>this.faunaSpawnOpen(z,x,y,species,rank));
    this.monsterMovement=new MonsterMovement(this.groundOccupancy,this.faunaZones,{
      safe:point=>this.monsterSafe(point),water:(x,y,w,h)=>this.monsterWater(x,y,w,h)
    });
    this.monsterCombat=new MonsterCombat(world.environment,this.faunaZones,{
      movement:this.monsterMovement,
      daylight:()=>this.populationWorld.clock.minute>=300&&this.populationWorld.clock.minute<1140,
      cadence:beast=>beast.x>=0||this.faunaSprites.get(beast.id)?.visible||
        this.westFaunaObservers?.some(n=>Math.abs(n.x-beast.x)<300&&Math.abs(n.y-beast.y)<300)?50:250,
      targets:(point,radius)=>[...this.groundOccupancy.near(point.x,point.y,radius)]
        .filter(body=>body.category===1&&body.actor.alive&&!aboveGroundCombat(body.actor)&&Math.hypot(body.x-point.x,body.y-point.y)<=radius).map(body=>body.actor),
      move:(beast,point)=>this.monsterMovement.skill(beast,point),
      open:(beast,point)=>this.groundPositionOpen(beast,point.x,point.y),
      line:(a,b)=>this.monsterLine(a,b),
      safe:(point)=>this.monsterSafe(point),
      damage:(target,amount,source,eventId)=>this.monsterHitNpc(target,amount,source,eventId),
      avoid:(target,beast)=>{if(target.id!==this.possessedNpcId)this.evadeFauna(target,beast,this.faunaNow())},
      threat:(target,beast)=>target.id!==this.possessedNpcId&&((beast.rank==='elite'&&target.realmIndex===0)||
        (target.populationRole!=='hunter'&&(target.hp<75||(target.aiProfile?.axes.courage??40)<46))),
      sound:(skill,pos)=>this.monsterVisuals.sound(skill,pos),
    });
    this.faunaMotionStats=new Map();
    for(const beast of world.environment.fauna)this.createFaunaSprite(beast);
    this.refreshFaunaVisibility();this.syncFaunaDrops();this.persistPopulation();
  }
  createFaunaSprite(beast){
    if(this.faunaSprites.has(beast.id))return this.faunaSprites.get(beast.id);
    const sprite=this.add.sprite(beast.x,beast.y,'monster-'+beast.species+'-'+beast.rank,0)
      .setOrigin(.5,.82).setScale(beast.rank==='elite'?1.15:1).setDepth(beast.y).setName(beast.id).setVisible(false);
    sprite.setData('faunaId',beast.id).setInteractive({useHandCursor:true});
    sprite.on('pointerdown',pointer=>{this.pendingFaunaClick={id:beast.id,x:pointer.x,y:pointer.y}});
    sprite.on('pointerup',pointer=>{
      const pending=this.pendingFaunaClick;this.pendingFaunaClick=null;
      if(pending?.id!==beast.id||this.dragState?.moved||Math.hypot(pointer.x-pending.x,pointer.y-pending.y)>=7)return;
      this.selectedFaunaId=beast.id;
      if(!this.possessedNpcId)this.cameras.main.centerOn(beast.x,beast.y);
      this.refreshHud();
    });
    this.faunaSprites.set(beast.id,sprite);
    return sprite;
  }
  monsterSafe(point){
    const gap=this.monsterSafeBuffer;
    return this.monsterSafeRegions.some(r=>point.x>=r.x-gap&&point.x<=r.x+r.width+gap&&point.y>=r.y-gap&&point.y<=r.y+r.height+gap);
  }
  faunaSpawnOpen(zone,x,y,species=zone.species,rank='normal'){
    const footprint=groundFootprint({species,rank});
    if(this.monsterSafe({x,y})||this.monsterWater(x,y,footprint.width/2,footprint.height/2)||
      !this.groundPositionOpen({id:'spawn-monster',species,rank},x,y))return false;
    return !this.populationWorld.npcs.some(n=>n.alive&&Math.hypot(n.x-x,n.y-y)<55);
  }
  monsterLine(a,b){
    const steps=Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/5);
    for(let i=1;i<=steps;i++){
      if(!this.footprintTerrainOpen(a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps,2,2))return false;
    }
    return true;
  }
  monsterWater(x,y,hw=0,hh=0){
    this.faunaWaterLayer??=this.map.layers.find(layer=>layer.name==='Water');
    const left=Math.floor((x-hw+this.westOffsetX)/32),right=Math.floor((x+hw-.001+this.westOffsetX)/32),top=Math.floor((y-hh)/32),bottom=Math.floor((y+hh-.001)/32);
    for(let row=top;row<=bottom;row++)for(let col=left;col<=right;col++){
      if(this.faunaWaterLayer?.data[row]?.[col]?.index>=0)return true;
    }
    return false;
  }
  monsterHitNpc(target,amount,source,eventId){
    if(!target.alive||aboveGroundCombat(target)||this.monsterSafe(target))return;
    const cfg=this.populationWorld.environment.fauna.find(b=>b.id===source);
    const damage=Math.max(1,amount*(1+(cfg?.realmIndex??0)*.45)-Math.floor(this.heavenActions.defense(target)*.28));
    target.hp=Math.max(0,target.hp-damage);
    this.cultivation?.interrupt(target);
    if(target.flight)this.flyingSword.land(target);
    target.safety=Math.max(0,target.safety-7);
    if(cfg&&target.id!==this.possessedNpcId&&target.hp>0&&(target.populationRole!=='hunter'||target.hp<cultivationStats(target).hpMax*.48))this.evadeFauna(target,cfg,this.faunaNow());
    faunaEvent(this.populationWorld,eventId,'fauna-retaliation',source,target.id,`${target.name} chịu ${damage} sát thương từ yêu thú.`);
    if(target.hp===0){
      target.alive=false;target.deathCause=cfg?'Bị '+FAUNA_SPECIES[cfg.species].name+' hạ':'Bị đòn yêu thú hạ';
      this.npcSprites.get(target.id)?.setVisible(false);
    }
    this.requestBackgroundSave();
  }
  tickFaunaRespawns(delta){
    this.faunaRespawnTick+=delta;
    if(this.faunaRespawnTick<500)return;
    this.faunaRespawnTick%=500;
    const env=this.populationWorld.environment;
    if(!env.faunaRespawns.length)return;
    const result=processFaunaRespawns(this.populationWorld,this.faunaZones,env.faunaClockMs,(z,x,y,species,rank)=>this.faunaSpawnOpen(z,x,y,species,rank));
    if(!result.spawned.length&&!result.cancelled.length&&!result.failed.length)return;
    for(const beast of result.spawned)this.createFaunaSprite(beast);
    const active=new Set(env.fauna.map(b=>b.id));
    for(const [id,sprite] of this.faunaSprites)if(!active.has(id)){sprite.destroy();this.faunaSprites.delete(id);this.faunaMotionStats.delete(id);}
    this.syncGroundOccupancy();this.requestBackgroundSave();
  }
  initRiverFish(){this.riverFishSystem=new WorldRiverFishSystem(this,this.map,this.populationWorld.environment);this.riverFishSystemState=this.riverFishSystem.getState(this.cameras.main);this.persistPopulation()}
  initEcologyDebug(){const panel=document.createElement('aside');panel.id='ecology-debug';panel.style.cssText='position:fixed;left:14px;top:82px;z-index:22;color:#f1e7cc;font:11px/1.45 monospace;pointer-events:auto';panel.innerHTML='<button type="button" aria-expanded="false">Sinh thái · F3</button><section hidden></section>';const button=panel.querySelector('button'),section=panel.querySelector('section');button.style.cssText='padding:7px 10px;color:#f0dfb0;background:#111d18ef;border:1px solid #88764a;cursor:pointer';section.style.cssText='width:min(390px,calc(100vw - 32px));max-height:62vh;overflow:auto;margin-top:5px;padding:9px;background:#111d18f2;border:1px solid #88764a';button.onclick=()=>{section.hidden=!section.hidden;button.setAttribute('aria-expanded',String(!section.hidden));if(!section.hidden)this.renderEcologyDebug()};document.body.append(panel);this.ecologyDebug=panel;this.ecologyDebugSection=section;panel.hidden=true;this.input.keyboard?.on('keydown-F3',()=>{panel.hidden=!panel.hidden;if(!panel.hidden){section.hidden=false;button.setAttribute('aria-expanded','true');this.renderEcologyDebug()}else{section.hidden=true;button.setAttribute('aria-expanded','false')}});this.renderEcologyDebug()}
  getFaunaState(){
    const env=this.populationWorld.environment,fauna=env.fauna??[],view=this.cameras.main.worldView;
    const records=fauna.map(f=>{
      const sprite=this.faunaSprites.get(f.id),inCamera=f.x>=view.x&&f.x<=view.right&&f.y>=view.y&&f.y<=view.bottom;
      return {...f,inCamera,visible:Boolean(sprite?.visible),rendered:Boolean(sprite?.visible),frame:Number(sprite?.frame?.name??0),
        spritePosition:sprite?{x:sprite.x,y:sprite.y}:null,moving:Boolean(this.faunaMotionStats?.get(f.id)?.moving)};
    });
    const counts=list=>Object.fromEntries(FAUNA_IDS.map(id=>[id,list.filter(f=>f.alive&&f.species===id).length]));
    const zones=this.faunaZones.map(z=>{
      const local=fauna.filter(f=>f.zoneId===z.zoneId),pending=env.faunaRespawns.filter(q=>q.zoneId===z.zoneId);
      return {...z,title:z.name,living:local.filter(f=>f.alive).length,elite:local.filter(f=>f.alive&&f.rank==='elite').length,
        species:counts(local),dead:local.filter(f=>!f.alive).length,pending:pending.length,
        nextInMs:pending.length?Math.max(0,Math.min(...pending.map(q=>q.dueAtMs))-env.faunaClockMs):null,
        totalRespawned:env.faunaRespawnStats[z.zoneId]?.totalSpawned??0,failedAttempts:env.faunaRespawnStats[z.zoneId]?.failedAttempts??0};
    });
    return {count:records.length,alive:records.filter(f=>f.alive).length,species:counts(fauna),rendered:records.filter(f=>f.visible).length,
      dead:fauna.filter(f=>!f.alive).length,inCamera:records.filter(f=>f.inCamera).length,moving:records.filter(f=>f.moving).length,
      combat:records.filter(f=>f.cast).length,zones,records,drops:env.drops.filter(d=>d.sourceId.startsWith('fauna:')),
      hunterCount:this.populationWorld.npcs.filter(n=>n.populationRole==='hunter').length};
  }
  getEcologyState(){const fauna=this.getFaunaState(),fish=this.riverFishSystem?.getState(this.cameras.main)??{count:0,living:0,records:[],waterTiles:0,safeWaterCells:0,waterRegions:0},population=this.getPopulationState();return{camera:{x:this.cameras.main.worldView.x,y:this.cameras.main.worldView.y,width:this.cameras.main.worldView.width,height:this.cameras.main.worldView.height,zoom:this.cameras.main.zoom},fauna,fish,npcs:{alive:population.alive,total:population.total,visible:population.visible,states:population.states,diagnostics:population.diagnostics},saveKey:WORLD_POPULATION_SAVE_KEY}}
  renderEcologyDebug(){
    if(!this.ecologyDebugSection||!this.populationWorld)return;
    const {fauna,fish,npcs}=this.getEcologyState();
    this.ecologyDebugSection.innerHTML=`<b>Yêu thú ${fauna.alive} · giao chiến ${fauna.combat} · render ${fauna.rendered}</b><hr>
      ${fauna.zones.map(z=>`<p>${z.title} · ${z.living}/${z.cap} · Tinh Anh ${z.elite} · chờ hồi sinh ${z.pending}</p>`).join('')}
      ${FAUNA_IDS.map(id=>`<button data-go-fauna="${id}">${FAUNA_SPECIES[id].name}</button>`).join(' ')}
      <button data-go-fauna="river">Cá sông</button> · ${fish.living} cá · ${npcs.alive} NPC
      <hr><a href="/monster-gallery.html" target="_blank">Gallery yêu thú và sân đấu</a>`;
    for(const button of this.ecologyDebugSection.querySelectorAll('[data-go-fauna]'))button.onclick=()=>this.gotoHabitat(button.dataset.goFauna);
  }
  gotoHabitat(id){
    const zone=this.faunaZones.find(z=>z.species===id);
    const point=id==='river'?this.riverFishSystem?.closestFishPosition??REGION_CENTERS.east:
      this.populationWorld.environment.fauna.find(f=>f.alive&&f.species===id)??(zone&&{x:zone.x+zone.width/2,y:zone.y+zone.height/2});
    if(!point)return false;
    this.navigateCameraTo(point.x,point.y,'habitat',false,.97);return true;
  }
  damageFaunaEntity(id,attackerId,damage,eventId,maxRange=52){const attacker=this.populationWorld.npcs.find(n=>n.id===attackerId&&n.alive),target=this.populationWorld.environment?.fauna?.find(f=>f.id===id&&f.alive),playerAttack=attackerId===this.possessedNpcId;if(!attacker||(!playerAttack&&attacker.populationRole!=='hunter')||!target||Math.hypot(attacker.x-target.x,attacker.y-target.y)>maxRange)return{ok:false,reason:'attacker-or-range'};return this.applyFaunaDamage(target,attacker,damage,eventId)}
  applyFaunaDamage(target,attacker,damage,eventId){
    if(attacker?.wallLevel)return {ok:false,reason:'different-floor'};
    const id=target.id,result=damageFauna(this.populationWorld,id,attacker.id,damage,eventId);
    if(!result)return {ok:false,reason:'invalid-or-duplicate'};
    if(!result.fauna.alive){
      const habitat=this.faunaZones.find(z=>z.zoneId===result.fauna.zoneId);
      queueFaunaRespawn(this.populationWorld,result.fauna,habitat?.respawnMs??20000);
      this.syncFaunaDrops();
    }
    this.requestBackgroundSave();
    return {ok:true,...result};
  }
  claimFaunaDropForNpc(dropId,npcId,eventId){const npc=this.populationWorld.npcs.find(n=>n.id===npcId&&n.alive&&!n.wallLevel),drop=this.populationWorld.environment?.drops.find(d=>d.id===dropId&&d.status==='ground');if(!npc||npc.flight||!drop||Math.hypot(npc.x-drop.x,npc.y-drop.y)>32)return null;const r=claimFaunaDrop(this.populationWorld,dropId,npcId,eventId);if(r){this.dropSprites.get(dropId)?.destroy();this.dropSprites.delete(dropId);this.persistPopulation()}return r}
  refreshFaunaVisibility(){
    for(const beast of this.populationWorld?.environment?.fauna??[]){
      const sprite=this.faunaSprites.get(beast.id);
      if(sprite)sprite.setVisible(this.inSceneryView(beast,80));
    }
  }
  syncFaunaDrops(){
    for(const d of this.populationWorld.environment.drops){
      if(!d.sourceId.startsWith('fauna:')||d.status!=='ground'||this.dropSprites.has(d.id))continue;
      const marker=this.add.image(d.x,d.y-3,'monster-loot',LOOT_ICON[d.itemId]??6).setDepth(d.y+2).setName(d.id);
      marker.setData('dropId',d.id);this.dropSprites.set(d.id,marker);
    }
  }
  faunaNow(){return this.populationWorld.clock.day*1440+this.populationWorld.clock.minute}
  tickFauna(delta){
    const env=this.populationWorld.environment;
    if((this.nextWestFaunaObservers??0)<=env.faunaClockMs){
      this.westFaunaObservers=this.populationWorld.npcs.filter(n=>n.alive&&n.x<300);
      this.nextWestFaunaObservers=env.faunaClockMs+400;
    }
    this.faunaTick+=delta;
    while(this.faunaTick>=50){
      this.faunaTick-=50;env.faunaClockMs+=50;
      this.monsterCombat.tick(env.faunaClockMs,50);
    }
    if((this.nextHuntAt??0)<=env.faunaClockMs){
      this.nextHuntAt=env.faunaClockMs+400;
      this.tickHunters(this.faunaNow());this.syncFaunaDrops();
    }
    for(const beast of env.fauna){
      const state=this.monsterMovement.states.get(beast.id);
      if(state)this.faunaMotionStats.set(beast.id,{moving:Math.hypot(state.velocity.x,state.velocity.y)>5});
    }
    this.tickFaunaRespawns(delta);
    this.refreshFaunaVisibility();
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
  tickHunters(now){
    const world=this.populationWorld,env=world.environment,day=world.clock.day,hunters=world.npcs.filter(n=>n.alive&&n.populationRole==='hunter'&&n.id!==this.possessedNpcId&&!n.marketVisit&&!n.decisionSlot?.startsWith('sect-campus:')&&!this.sectCampus?.orderFor(n));
    for(const h of hunters){
      if(h.faunaHuntLimitDay!==day){h.faunaHuntLimitDay=day;h.faunaHuntsToday=0;}
      const stats=cultivationStats(h),tolerance=hunterTolerance(h,stats.hpMax,stats.attack+stats.defense+h.realmIndex*8);
      if(now<(h.faunaEvadeUntil??0)||h.hp<tolerance.retreatHp||h.fatigue>=82||h.safety<24)continue;
      const drop=env.drops.find(d=>d.sourceId===h.faunaHuntTargetId&&d.status==='ground');
      if(drop){
        h.actionTarget={x:drop.x,y:drop.y};h.goalAction='gather';h.shortGoal='Tới nhặt chiến lợi phẩm';
        if(Math.hypot(h.x-drop.x,h.y-drop.y)<31)this.claimFaunaDropForNpc(drop.id,h.id,'hunter:'+h.id+':'+drop.id);
        continue;
      }
      let target=env.fauna.find(f=>f.id===h.faunaHuntTargetId&&f.alive);
      if(!target&&h.faunaHuntTargetId&&h.inventory.some(i=>Object.hasOwn(LOOT_ICON,i.itemId))){
        h.faunaHuntTargetId=undefined;
        h.goalAction='trade';h.shortGoal='Đưa chiến lợi phẩm tới chợ';
        h.decisionSlot='hunt-sale';h.actionProgress=0;
        if(this.merchants.start(h,this.merchants.propose(h)))continue;
        const market=this.markers.find(m=>m.id==='provisions-entrance');
        if(market)h.actionTarget={x:market.x,y:market.y};
        continue;
      }
      if(!target){
        h.faunaHuntTargetId=undefined;
        if((h.faunaHuntsToday??0)>=1||world.clock.minute<360||world.clock.minute>1140)continue;
        target=env.fauna.filter(f=>f.alive&&tolerance.allowedPower>=(faunaCombatPower(f.species,f.rank)+(f.realmIndex??0)*38)&&
          Math.hypot(h.x-f.x,h.y-f.y)<tolerance.search&&this.canReachPoint(h,f)&&!hunters.some(other=>other!==h&&other.faunaHuntTargetId===f.id))
          .sort((a,b)=>Math.hypot(h.x-a.x,h.y-a.y)-Math.hypot(h.x-b.x,h.y-b.y))[0];
        if(!target)continue;
        h.faunaHuntTargetId=target.id;
      }
      const weapon=weaponForNpc(h),mode=weaponAttackMode(weapon,1,false),range=weapon?Math.min(70,mode.range??52):38;
      h.actionTarget=this.hunterApproach(h,target);h.goalAction='fight';h.shortGoal='Đang săn '+FAUNA_SPECIES[target.species].name;
      if(Math.hypot(h.x-target.x,h.y-target.y)>range||now<(h.faunaAttackReadyAt??0)||!this.monsterLine(h,target))continue;
      h.faunaAttackReadyAt=now+2;
      if(weapon){this.playWeaponPose(h,mode,this.facePoint(h,target));this.spawnWeaponFx(weapon.kind==='dao'?'dao':'thrust',this.facePoint(h,target),(h.x+target.x)/2,(h.y+target.y)/2);}
      const result=this.damageFaunaEntity(target.id,h.id,stats.attack*(mode.multiplier??1),'hunt:'+h.id+':'+target.id+':'+now,range);
      if(result.ok&&!result.fauna.alive)h.faunaHuntsToday=(h.faunaHuntsToday??0)+1;
    }
  }
  damageBuilding(id,eventId,damage,realmIndex=0){const result=damageWorldRebuildBuilding(this.populationWorld,id,eventId,damage,realmIndex);if(result){this.refreshProfessionVisuals();this.persistPopulation();this.renderPopulationDebug()}return result}
  refreshProfessionVisuals(){if(!this.environmentGraphics||!this.populationWorld?.environment)return;const g=this.environmentGraphics;g.clear();for(const obj of this.populationWorld.environment.objects){const sprite=this.buildingSprites.get(obj.id);if(!sprite)continue;const node=this.resourceNodeSprites.get(obj.id);if(node)node.setVisible(obj.status!=='destroyed');if(obj.status==='intact')continue;const alpha=obj.status==='repairing'?.22:.42,x=sprite.x-sprite.displayWidth*.30,y=sprite.y+sprite.displayHeight*.18,w=sprite.displayWidth*.6,h=6;g.fillStyle(0x241c16,.72).fillRect(x,y,w,h);g.fillStyle(obj.status==='repairing'?0x65cba0:0xd37755,alpha+.45).fillRect(x,y,w*Math.max(.03,obj.hp/obj.maxHp),h);if(obj.status==='damaged'||obj.status==='destroyed'){g.lineStyle(2,0x522d27,.82);g.lineBetween(x+w*.36,y-8,x+w*.43,y+10);g.lineBetween(x+w*.43,y+10,x+w*.51,y+3)}}for(const node of this.populationWorld.environment.resourceNodes??[]){const sprite=this.resourceNodeSprites.get(node.id);if(sprite)sprite.setVisible(node.amount>0)}}
  reportCombat(attackerId,victimId,damage,options={}){const attacker=this.populationWorld.npcs.find(n=>n.id===attackerId),victim=this.populationWorld.npcs.find(n=>n.id===victimId);if(!attacker?.alive||!victim?.alive||attacker===victim||!Number.isFinite(damage)||damage<=0)return{ok:false,reason:'invalid'};if((attacker.wallLevel??0)!==(victim.wallLevel??0))return{ok:false,reason:'different-floor'};if(attacker.flight||aboveGroundCombat(victim)&&!options.airborne)return{ok:false,reason:'flight'};if(victim.flight)this.flyingSword.land(victim);const eventId=options.eventId??`combat:${this.populationWorld.clock.day}:${this.populationWorld.clock.minute}:${attackerId}:${victimId}:${createWorldUuid()}`;if(this.populationWorld.events.some(e=>e.id===eventId))return{ok:false,reason:'duplicate'};victim.hp=Math.max(0,victim.hp-damage);this.cultivation?.interrupt(victim);victim.grudges??={};victim.grudges[attackerId]=(victim.grudges[attackerId]??0)+1;victim.relationships[attackerId]=Math.max(-100,(victim.relationships[attackerId]??0)-Math.max(3,Math.ceil(damage/8)));victim.memories.push({day:this.populationWorld.clock.day,text:`${attacker.name} gây ${Math.round(damage)} sát thương.`,kind:'combat',otherId:attackerId});if(victim.memories.length>12)victim.memories.shift();this.populationWorld.events.push({id:eventId,day:this.populationWorld.clock.day,minute:this.populationWorld.clock.minute,type:'npc-combat-hit',actorId:attackerId,targetId:victimId,description:`${attacker.name} gây ${Math.round(damage)} sát thương cho ${victim.name}.`,status:'occurred'});const law=reportCityCombat(this.populationWorld,{eventId,attackerId,victimId,damage,authorizedDuel:Boolean(options.authorizedDuel),retaliation:Boolean(options.retaliation)});if(victim.hp<=0){victim.alive=false;victim.deathCause=`Bị ${attacker.name} đánh bại`;this.npcSprites.get(victimId)?.setVisible(false)}if(law.incident){for(const id of [...law.responderIds,...(law.cityMasterId?[law.cityMasterId]:[])]){const n=this.populationWorld.npcs.find(x=>x.id===id);this.npcRoutes.delete(id);if(n)n.actionTarget={x:attacker.x,y:attacker.y}}this.cityLawTimers??=new Map();this.cityLawTimers.set(law.incident.id,performance.now());this.worldPopulationToast(`Báo động thành: lính đang tới hiện trường · cấp ${law.incident.severity}.`)}this.persistPopulation();this.renderPopulationDebug();return{...law,eventId,damage}}
  worldPopulationToast(message){const node=document.getElementById('population-toast')??document.createElement('div');node.id='population-toast';node.textContent=message;node.style.cssText='position:fixed;left:50%;top:78px;transform:translateX(-50%);z-index:30;padding:8px 12px;background:#111d18ed;border:1px solid #c4a35c;color:#f0dfb0;font:12px Georgia,serif';document.body.append(node);clearTimeout(this.populationToastTimer);this.populationToastTimer=setTimeout(()=>node.remove(),2600)}
  renderPopulationDebug(){if(!this.populationDebug||this.populationDebug.hidden||!this.populationWorld)return;const s=this.getPopulationState(),jobs=this.getProfessionState(),roles=Object.entries(s.counts).map(([role,count])=>`<div>${role.replaceAll('_',' ')} <b>${count}</b></div>`).join(''),states=Object.entries(s.states).map(([name,count])=>`${name} ${count}`).join(' · '),repair=jobs.repairers.map(n=>{const wood=n.materials.find(i=>i.itemId==='wood')?.count??0,ore=n.materials.find(i=>i.itemId==='iron_ore')?.count??0;return`${n.id.slice(-2)} · ${n.status} · ${n.buildingId??'đợi việc'} · HP ${n.hp??'—'}/${n.maxHp??'—'} · ${n.progress}m · gỗ ${wood}, quặng ${ore}`}).join('<br>'),herbs=jobs.herbGatherers.map(n=>`${n.id.slice(-2)} · ${n.status} · ${n.nodeId??n.reason??'đợi node'} · còn ${n.nodeRemaining??'—'} · túi ${n.inventory.find(i=>i.itemId==='spirit_herb')?.count??0}`).join('<br>'),selected=s.selected?`<hr><b>${s.selected.name}</b><br>${s.selected.id}<br>${s.selected.role} · ${s.selected.profession} · ${s.selected.faction}<br>${s.selected.personality} · ${formatRealm(s.selected)} · HP ${Math.round(s.selected.hp)}<br>${s.selected.goal}<br>${s.selected.task?`${s.selected.task.kind}: ${s.selected.task.targetId||s.selected.task.lastReason} · ${s.selected.task.state}`:s.selected.reason}`:'';this.populationDebug.querySelector('section').innerHTML=`<b>NPC mới: ${s.alive}/${s.total} · visible ${s.visible}</b><div data-city-guards></div><br>${roles}<hr>${states}<hr><b>Thợ sửa</b><br>${repair}<hr><b>Hái dược</b><br>${herbs}<hr>FPS ${Math.round(s.fps)} · frame avg/p95 ${s.frameAvgMs.toFixed(1)}/${s.frameP95Ms.toFixed(1)}ms · AI avg/p95 ${s.aiCostMs.toFixed(2)}/${s.aiCostP95Ms.toFixed(2)}ms<br>AI ${s.goalEvaluations}/s · path ${s.pathfindingCalls}/s · collision ${s.collisionChecks}/s · CityLaw ${s.cityLawCostAvgMs.toFixed(3)}/${s.cityLawCostP95Ms.toFixed(3)}ms · kẹt ${s.states.stuck}${selected}`;this.guardDebug.render(this.populationDebug.querySelector('[data-city-guards]'))}
  assignPopulationTargets(){const markers=new Map(this.markers.map(m=>[m.id,m])),solids=this.collisionRects,occupied=[];for(const npc of this.populationWorld.npcs)if(npc.workPosition)occupied.push(npc.workPosition);for(const npc of this.populationWorld.npcs){if(npc.id===this.possessedNpcId||npc.flight||npc.skyStep)continue;let id='city-center',role=npc.populationRole,index=Number(npc.id.match(/:(\d+)$/)?.[1]??0);if(npc.authorityRole==='city_master')id='city-hall-entrance';else if(role==='merchant')id=npc.stallId;else if(role==='tavern_staff')id='tavern-entrance';else if(role==='quest_clerk'||role==='repair_worker')id='quest-office';else if(role==='city_guard')id=npc.guardPostId;else if(role==='low_disciple'||role==='elder'||role==='sect_leader')id='sect-yard';else if(role==='hunter')id='forest-outer';else if(role==='herb_gatherer')id=index%2?'forest-outer':'south-outskirts';else if(role==='commoner')id=npc.profession==='nong_dan'?'south-outskirts':index%3?'city-center':'south-outskirts';else if(role==='independent_cultivator')id=npc.spawnRegionId==='forest-outer'?'forest-outer':npc.spawnRegionId==='south-suburb'?'south-outskirts':'city-center';const base=markers.get(id)??markers.get('city-center');if(!npc.workPosition){const a=(index%8)*Math.PI/4,radius=72+(index%6)*28,pos=this.findOpenPosition(base.x+Math.cos(a)*radius,base.y+Math.sin(a)*radius,solids,occupied);npc.workPosition=pos;npc.workplaceId=id;occupied.push(pos)}if(role==='city_guard'&&(!npc.patrolPoints||!npc.patrolPoints.length||!npc.patrolLayoutVersion)){const post=markers.get(id)??base,horizontal=id==='gate-east'||id==='gate-west';
      const flank=this.findOpenPosition(post.x+(horizontal?0:96),post.y+(horizontal?88:0),solids,[]);
      npc.patrolPoints=[flank,npc.workPosition,markers.get('city-center')].filter(Boolean);npc.patrolIndex=0;npc.patrolLayoutVersion=1}if(!this.merchants&&/^(shop-|market:|need:)/.test(npc.decisionSlot??''))continue;const target=this.setNpcGoalTarget(npc);if(target&&Math.hypot(npc.actionTarget.x-target.x,npc.actionTarget.y-target.y)>4){npc.actionTarget={...target};this.npcRoutes.delete(npc.id)}}}
  findOpenPosition(x,y,solids,occupied){const clear=(px,py)=>px>this.worldMinX+12&&py>12&&px<this.worldMinX+this.map.widthInPixels-12&&py<this.map.heightInPixels-12&&!solids.some(r=>px+9>r.x&&px-9<r.x+r.width&&py+5>r.y&&py-5<r.y+r.height)&&!occupied.some(p=>Math.hypot(px-p.x,py-p.y)<19);if(clear(x,y))return{x,y};for(let r=16;r<200;r+=16)for(let i=0;i<24;i++){const a=i*Math.PI/12,px=Math.round((x+Math.cos(a)*r)/8)*8,py=Math.round((y+Math.sin(a)*r)/8)*8;if(clear(px,py))return{x:px,y:py}}return{x,y}}
  initLivingTimber(){
    const environment=this.populationWorld.environment;
    environment.timberSources??=[];
    this.livingTimberSprites=new Map();
    for(const sprite of this.windSprites){
      if(sprite.getData('windKind')!=='ancient-v2')continue;
      const prop=sprite.getData('tiledObject'),id='timber:'+prop.id;
      if(!environment.timberSources.some(source=>source.id===id)){
        const point=this.findOpenPosition(sprite.x,prop.y+36,this.collisionRects,[]);
        environment.timberSources.push({id,x:point.x,y:point.y,region:this.prop(prop,'region')});
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
  setNpcGoalTarget(npc){if(npc.tribulation)return npc.tribulation.site;
    if(this.westWilds?.directs(npc)||npc.decisionSlot?.startsWith('society:'))return npc.actionTarget;
    if(npc.decisionSlot?.startsWith('sect-campus:'))return npc.decisionSlot==='sect-campus:array'&&npc.meditationSpot||npc.actionTarget;
    if(npc.lawResponse?.status==='responding'||npc.lawResponse?.status==='at-scene'){
      const target=this.scheduler?.byId.get(npc.lawResponse.targetId)?.npc;
      if(target?.alive)return {x:target.x,y:target.y};
    }
    if(npc.goalAction==='mission'&&npc.assignedMissionId){
      const mission=this.populationWorld.sectMissions?.find(m=>m.id===npc.assignedMissionId&&m.status==='active');
      if(mission)return mission.target;
    }if(npc.goalAction==='cultivate'&&npc.meditationSpot)return npc.meditationSpot;const station=this.merchants?.station(npc);if(station)return station;if(npc.marketVisit||npc.decisionSlot?.startsWith('shop-wait:'))return npc.actionTarget;if(npc.goalAction==='flee')return npc.decisionSlot==='need:flee'?(npc.home??npc.actionTarget):npc.actionTarget;if(npc.goalAction==='shop'||npc.decisionSlot?.endsWith(':herb-craft'))return this.markers.find(m=>m.id==='apothecary-entrance')??npc.actionTarget;
    if(npc.goalAction==='trade'&&npc.populationRole==='hunter')return this.markers.find(m=>m.id==='provisions-entrance')??npc.actionTarget;
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
      if(npc.decisionSlot==='guard-relief')return npc.actionTarget;
      const slot=this.workstations?.claims.get(npc.id);
      if(slot?.action==='rest'&&slot.refuge)return{x:slot.anchorX,y:slot.anchorY,refuge:true};
      const threatened=this.groundOccupancy&&[...this.groundOccupancy.near(npc.x,npc.y,88)].some(body=>FAUNA_IDS.includes(body.actor.species));
      if(npc.pathBlocked&&npc.fatigue>=84&&!threatened)return{x:npc.x,y:npc.y,refuge:true};
      return npc.home??npc.actionTarget;
    }if(npc.goalAction==='eat'&&!npc.faunaHuntTargetId){if(npc.inventory.some(i=>(i.itemId==='ration'||i.itemId==='deer_meat')&&i.count>0))return npc.actionTarget;const factions=this.populationWorld.factions;
      if(npc.home&&factions.some(f=>(f.name===npc.faction||f.id==='qingyun-village')&&f.treasury.some(i=>i.itemId==='ration'&&i.count>0)))return npc.home;
      const stored=this.workstations?.claims.get(npc.id);
      if(stored?.action==='eat'&&!npc.pathBlocked)return {x:stored.anchorX,y:stored.anchorY};
      const places=this.markers.filter(m=>m.id==='tavern-entrance'||m.id==='provisions-entrance').filter(m=>this.canReachPoint(npc,m));
      return places.sort((a,b)=>Math.hypot(a.x-npc.x,a.y-npc.y)-Math.hypot(b.x-npc.x,b.y-npc.y))[0]??npc.actionTarget;
    }if(npc.populationRole==='herb_gatherer'){const danger=(this.populationWorld.environment?.fauna??[]).filter(f=>f.alive&&Math.hypot(f.x-npc.x,f.y-npc.y)<105).sort((a,b)=>Math.hypot(a.x-npc.x,a.y-npc.y)-Math.hypot(b.x-npc.x,b.y-npc.y))[0];if(danger){const dx=npc.x-danger.x,dy=npc.y-danger.y,d=Math.max(1,Math.hypot(dx,dy));npc.goalAction='flee';npc.shortGoal='Rút khỏi yêu thú gần đây';return this.findOpenPosition(npc.x+dx/d*100,npc.y+dy/d*100,this.collisionRects,[])}}if(npc.faunaHuntTargetId){const f=this.populationWorld.environment?.fauna?.find(x=>x.id===npc.faunaHuntTargetId);if(f?.alive)return this.hunterApproach(npc,f);const drop=this.populationWorld.environment?.drops?.find(d=>d.sourceId===npc.faunaHuntTargetId&&d.status==='ground');if(drop)return{x:drop.x,y:drop.y}}if(npc.lawResponse?.status==='responding'||npc.lawResponse?.status==='at-scene'){const target=this.populationWorld.npcs.find(n=>n.id===npc.lawResponse.targetId&&n.alive);if(target)return{x:target.x,y:target.y}}if(npc.goalAction==='commission'&&(npc.assignedCommissionId||npc.decisionSlot==='commission-board')){const c=this.populationWorld.commissions?.find(x=>x.commissionId===(npc.assignedCommissionId??npc.professionTask?.targetId));return npc.decisionSlot==='commission-board'?(this.populationWorld.commissionBoard??npc.actionTarget):c?.target??npc.actionTarget}if(npc.goalAction==='gather'&&npc.populationRole==='herb_gatherer'&&npc.assignedResourceNodeId){const node=this.populationWorld.environment?.resourceNodes?.find(x=>x.id===npc.assignedResourceNodeId);if(node)return{x:node.x,y:node.y}}let id='city-center';if(npc.authorityRole==='city_master')id='city-hall-entrance';else if(npc.populationRole==='merchant'&&(npc.goalAction==='trade'||npc.goalAction==='shop'))id=npc.stallId;else if(npc.populationRole==='tavern_staff')id='tavern-entrance';else if(npc.populationRole==='quest_clerk'||npc.populationRole==='repair_worker')id='quest-office';else if(npc.populationRole==='city_guard'&&npc.patrolPoints?.length)id=null;else if(npc.goalAction==='cultivate')id='sect-yard';else if(npc.goalAction==='farm')id='south-outskirts';else if(npc.goalAction==='mission'||npc.goalAction==='recruit')id='sect-yard';else if(npc.goalAction==='gather')id=npc.populationRole==='herb_gatherer'?'forest-outer':'south-outskirts';else if(npc.goalAction==='eat'||npc.goalAction==='trade'||npc.goalAction==='work')id=npc.populationRole==='repair_worker'||npc.populationRole==='quest_clerk'?'quest-office':npc.populationRole==='tavern_staff'?'tavern-entrance':'city-center';else if(npc.goalAction==='rest'||npc.goalAction==='flee'||npc.goalAction==='idle')return npc.home;let target;if(npc.populationRole==='city_guard'&&npc.patrolPoints?.length){const p=npc.patrolPoints[npc.patrolIndex??0];target={x:p.x,y:p.y}}else if(npc.workPosition)target=npc.workPosition;else{const marker=this.markers.find(m=>m.id===id)||this.markers.find(m=>m.id==='city-center');target=marker?{x:marker.x,y:marker.y}:npc.actionTarget}return target}
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
  initSkyStep(){
    this.skyStepVisuals=new SkyStepVisuals(this);
    this.skyStep=new SkyStepController({
      landOpen:(npc,p)=>!this.monsterWater(p.x,p.y,9,5)&&this.groundPositionOpen(npc,p.x,p.y,false,'sky-pad:'+npc.id),
      airLine:(a,b)=>this.flyingSword.nav.line(a,b,0),
      connected:(a,b)=>this.canReachPoint(a,b),
      changed:(npc,phase)=>{
        const sprite=this.npcSprites.get(npc.id);
        if(sprite){
          sprite.setPosition(npc.x,npc.y).setDepth(npc.y).setData('moving',false);
          if(npc.skyStep)sprite.play(this.npcTextureFor(npc)+'_idle_'+npc.skyStep.heading,true);
        }
        if(['cast','travel','arrive','end'].includes(phase)){
          this.resetNpcRoute(npc);
          this.syncGroundOccupancy();
        }
        this.requestBackgroundSave();
      },
    });
    this.skyStep.restore(this.populationWorld.npcs);
    this.syncGroundOccupancy();
  }
  skyOptions(npc){
    const rig=this.characterRigPreview?.npc===npc?this.characterRigPreview:null;
    return {manual:true,...this.swordFlightOptions(npc,rig)};
  }
  toggleSkyAim(npc){
    if(this.skyAim){this.closeSkyAim();return;}
    const reason=skyStepEligibility(npc,this.skyOptions(npc));
    if(reason){this.worldPopulationToast(skyStepReasons[reason]);return;}
    this.skyAim=npc;
    this.skyStepVisuals.aim(npc);
    this.worldPopulationToast('Đạp Gió Lướt Mây · chọn điểm đáp trên bản đồ · Esc để hủy.');
  }
  closeSkyAim(){
    this.skyAim=null;
    this.skyStepVisuals?.aim(null);
  }
  pickSkyTarget(event,confirm){
    const npc=this.skyAim;
    if(!npc||this.possessedNpcId!==npc.id){this.closeSkyAim();return;}
    const rect=this.game.canvas.getBoundingClientRect();
    const p=this.cameras.main.getWorldPoint((event.clientX-rect.left)*this.scale.width/rect.width,
      (event.clientY-rect.top)*this.scale.height/rect.height);
    const goal={x:Math.round(p.x),y:Math.round(p.y)},options=this.skyOptions(npc);
    const preview=confirm?this.skyStep.start(npc,goal,options):this.skyStep.preview(npc,goal,options);
    if(confirm&&preview.ok){this.closeSkyAim();this.cameraFollowSuspended=false;return;}
    this.skyStepVisuals.aim(npc,goal,preview);
    if(confirm)this.worldPopulationToast(skyStepReasons[preview.reason]);
  }
  initSwordFlight(){
    const zones=(this.map.getObjectLayer('Airspace')?.objects??[]).filter(o=>o.width>0&&o.height>0)
      .map(o=>({x:o.x,y:o.y,width:o.width,height:o.height,ceiling:this.prop(o,'ceiling')??Infinity}));
    const nav=new AerialNavigation(this.worldMinX+this.worldWidth,this.worldHeight,zones,this.worldMinX);
    this.flyingSword=new FlyingSwordController(nav,{
      landOpen:(npc,p)=>!this.monsterWater(p.x,p.y,11,7)&&this.footprintTerrainOpen(p.x,p.y,11,7)&&this.groundPositionOpen(npc,p.x,p.y),
      connected:(a,b)=>this.canReachPoint(a,b),
      moved:npc=>this.syncSwordActor(npc),
      changed:(npc,phase)=>{
        this.syncSwordActor(npc);this.npcRoutes.delete(npc.id);
        if(phase==='end'||phase==='touchdown')this.syncGroundOccupancy();
        if(npc.id===(this.possessedNpcId??this.selectedNpcId))this.refreshPossessionHud();
        this.requestBackgroundSave();
      },
    });
    this.flyingSword.restore(this.populationWorld.npcs);
    this.flightVisuals=new FlyingSwordVisuals(this);
  }
  syncSwordActor(npc){
    const sprite=this.npcSprites.get(npc.id),f=npc.flight;
    if(!sprite)return;
    sprite.setPosition(npc.x,npc.y).setDepth(npc.y+(f?.altitude>9?1000+f.altitude:0));
    sprite.setData('moving',Boolean(f?.speed>10));
    if(f&&sprite.visible)sprite.play(this.npcTextureFor(npc)+'_idle_'+f.heading,true);
  }
  swordInput(){
    const keys=this.keys,dx=Number(Boolean(keys.D?.isDown||keys.RIGHT?.isDown))-Number(Boolean(keys.A?.isDown||keys.LEFT?.isDown));
    const dy=Number(Boolean(keys.S?.isDown||keys.DOWN?.isDown))-Number(Boolean(keys.W?.isDown||keys.UP?.isDown));
    const length=Math.hypot(dx,dy)||1;
    if(dx||dy)this.cameraFollowSuspended=false;
    return{x:dx/length,y:dy/length,fast:keys.SHIFT?.isDown,slow:keys.CTRL?.isDown};
  }
  swordFlightOptions(npc,rig){
    return {mount:rig?.mount,locked:Boolean(rig?.character.combat.action||this.heavenActions?.fishing?.npc===npc||
      this.weaponAttackStates.get(npc.id)?.until>this.time.now)};
  }
  toggleSwordFlight(npc,rig){
    if(npc.flight){this.flyingSword.land(npc);this.worldPopulationToast('Đang tìm điểm hạ kiếm.');return true}
    const options=this.swordFlightOptions(npc,rig);
    const check=flightEligibility(npc,options);
    if(check.ok&&this.flyingSword.startManual(npc,options,this.playerFacing))return true;
    this.worldPopulationToast(FLIGHT_REASONS[check.reason??'pad']);return false;
  }
  initFlightArena(){
    const arena={targets:new Set(),follow:null};
    this.flightArena=arena;
    const panel=document.createElement('aside');
    panel.style.cssText='position:fixed;left:14px;top:120px;z-index:22;padding:10px;background:#13241eef;border:1px solid #a18550;color:#edddb2;font:13px system-ui;max-width:245px';
    panel.innerHTML='<strong>Sân kiểm thử ngự kiếm</strong><br><small>Dùng bản lưu riêng</small><p><button id="flight-single">Rừng → tông môn</button> <button id="flight-pair">Bay theo nhóm</button></p><output id="flight-report"></output>';
    document.body.append(panel);
    panel.querySelector('#flight-single').onclick=()=>this.launchFlightArena(1);
    panel.querySelector('#flight-pair').onclick=()=>this.launchFlightArena(6);
    this.events.once('shutdown',()=>panel.remove());
    arena.output=panel.querySelector('#flight-report');
  }
  launchFlightArena(count=1){
    if(!this.flightArena||[...this.flightArena.targets].some(id=>this.flyingSword.active.has(id)))return [];
    const from=this.markers.find(m=>m.id==='forest-outer'),to=this.markers.find(m=>m.id==='sect-yard');
    const actors=this.populationWorld.npcs.filter(n=>!n.flight&&flightEligibility(n).ok).slice(0,count);
    this.flightArena.targets.clear();
    for(const [i,npc] of actors.entries()){
      this.syncGroundOccupancy();
      const near={x:from.x+120+(i%2)*160,y:from.y+72+Math.floor(i/2)*110};
      const launch=this.flyingSword.chooseLanding(npc,near,true);
      const goal={x:to.x-46-(i%2)*50,y:to.y-80-Math.floor(i/2)*54};
      if(!launch)continue;
      // Only this isolated arena positions the fixture at the start of its itinerary.
      Object.assign(npc,launch,{goalAction:'cultivate',action:'travel',decisionSlot:this.populationWorld.clock.day+':cultivate',actionTarget:goal});
      this.syncSwordActor(npc);this.npcRoutes.delete(npc.id);
      this.flightArena.targets.add(npc.id);
    }
    const lead=actors.find(n=>this.flightArena.targets.has(n.id));
    this.flightArena.follow=lead?.id;
    if(lead){this.cameraTween?.stop();this.cameraTween=null;this.cameras.main.centerOn(lead.x,lead.y);}
    this.syncGroundOccupancy();
    for(const n of actors)if(this.flightArena.targets.has(n.id)){
      this.flyingSword.checkAt.delete(n.id);this.flyingSword.consider(n,n.actionTarget);
    }
    return actors.filter(n=>n.flight).map(n=>n.id);
  }
  updateFlightArena(time){
    const a=this.flightArena;
    if(!a||time<(a.next??0))return;
    a.next=time+120;
    const npc=this.populationWorld.npcs.find(n=>n.id===a.follow);
    if(npc){
      this.cameras.main.centerOn(npc.x,npc.y-flightOffset(npc.flight)*.6);
      a.output.textContent=npc.name+' · '+(npc.flight?.phase??npc.action)+' · '+Math.round(npc.mp)+' linh lực';
    }
  }
  getWestGateTraffic(){
    const g=this.passageTraffic.gates.find(x=>x.id==='gate-west');
    if(!g)return [];
    return this.populationWorld.npcs.filter(n=>n.alive&&Math.hypot(n.x-g.x,n.y-g.y)<255).map(n=>{
      const entry=this.scheduler.byId.get(n.id),route=this.npcRoutes.get(n.id),target=n.actionTarget;
      const dist=target?Math.hypot(n.x-target.x,n.y-target.y):0;
      const stopped=entry?.travelWatch?this.scheduler.time-entry.travelWatch.since:0;
      return {id:n.id,role:n.populationRole,profession:n.profession,action:n.action,goal:n.goalAction,
        label:n.shortGoal,position:{x:n.x,y:n.y},home:n.home,work:n.workPosition,target,
        route:route?.points.slice(n.routeIndex),velocity:this.npcSprites.get(n.id)?.getData('moving')?entry?.velocity:{x:0,y:0},
        blocked:Boolean(n.pathBlocked),stalledMs:stopped,wait:entry?.passageWait??(entry?.waitingForSlot?'workstation':null),
        shopSlot:this.merchants?.slots.get(n.id)?.point,classification:n.pathBlocked&&stopped>4000?'stalled':dist<=25?'at-destination':'travelling'};
    });
  }
  getFlightState(){
    const npcs=this.populationWorld.npcs;
    return {eligible:npcs.filter(n=>flightEligibility(n).ok).length,visible:this.flightVisuals.visible,
      active:[...this.flyingSword.active.values()].map(n=>({id:n.id,name:n.name,x:n.x,y:n.y,mp:n.mp,mode:travelMode(n),flight:{...n.flight}})),
      zones:this.flyingSword.nav.zones.length};
  }
  updatePopulation(time,delta,maxDelta=250) {
    const world=this.populationWorld,dt=Math.min(Math.max(delta,0),maxDelta);
    this.frameSamples.push(dt);
    if(this.frameSamples.length>180)this.frameSamples.shift();
    this.metricWindowMs=(this.metricWindowMs??0)+dt;
    if(this.metricWindowMs>=1000){
      const scale=1000/this.metricWindowMs, total=this.groundOccupancy.terrainChecks;
      this.lastRates={pathfindingCalls:Math.round(this.pathfindingCalls*scale),
        collisionChecks:Math.round((this.collisionChecks+total-(this.sampledFootprints??0))*scale),
        goalEvaluations:Math.round(this.goalEvaluations*scale)};
      this.sampledFootprints=total;this.metricWindowMs=0;
      this.pathfindingCalls=0;this.collisionChecks=0;this.goalEvaluations=0;
    }
    if(world.clock.paused){this.updatePossessedPlayer(Math.min(dt,60));return;}
    const simDelta=dt*(world.clock.speed===2||world.clock.speed===4?world.clock.speed:1);
    const workSlices=Math.max(1,Math.ceil(simDelta/125));
    this.worldMoveBudget=Math.max(480,simDelta+420);
    this.populationTick+=simDelta;
    this.populationSaveTick+=dt;
    while(this.populationTick>=1000){
      this.populationTick-=1000;
      if(++world.clock.minute>=1440){world.clock.minute=0;world.clock.day++}
      this.workstations.prune(world.npcs,this.possessedNpcId);
      this.scheduler.accrueMinute(this.possessedNpcId,npc=>npc.meditationSpot?7:
        this.workstations.claims.has(npc.id)||this.merchants?.station(npc)?12:25);
      this.populationSimulation.tickShared(this.possessedNpcId);
      this.cultivation?.tick();
      const professionWorld=this.possessedNpcId?{...world,npcs:world.npcs.filter(n=>n.id!==this.possessedNpcId)}:world;
      tickWorldRebuildProfessionWork(professionWorld,world.commissionBoard??{x:2928,y:2160},(from,to)=>this.canReachPoint(from,to));
      this.sectCampus.tick();
      this.society?.tick();
      this.westWilds?.tick();
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
      for(const body of this.groundOccupancy.recover(12,b=>!b.actor.flight&&!b.actor.skyStep&&!tribulationLocked(b.actor)&&!FAUNA_IDS.includes(b.actor.species))){
        body.actor.x=body.x;body.actor.y=body.y;
        const sprite=this.npcSprites.get(body.id);
        sprite?.setPosition(body.x,body.y).setDepth(this.ramparts.depth(body.actor));
      }
    }
    this.groundCollisionMs=performance.now()-collisionStarted;
    const {moving,thinking}=this.scheduler.advance(simDelta,this.cameras.main.worldView,this.possessedNpcId,this.urgentNpcIds());
    const aiStart=performance.now();
    let decisions=0,evaluations=0;
    for(const entry of thinking){
      if(decisions>=10*workSlices||(decisions>0&&performance.now()-aiStart>=2*workSlices))break;
      const npc=entry.npc,target=npc.actionTarget??npc.home??npc;
      if(npc.flight||npc.skyStep||npc.marketVisit||npc.tribulation||this.westWilds?.directs(npc)||this.cultivation?.fleeing(npc)||this.flightArena?.targets.has(npc.id)){
        if(npc.flight){npc.hunger=Math.min(100,npc.hunger+entry.minutes*.027);npc.fatigue=Math.min(100,npc.fatigue+entry.minutes*.008);}
        this.scheduler.finishDecision(entry);decisions++;continue;
      }
      const eligible=entry.workKey===npc.goalAction+':'+target.x+':'+target.y;
      evaluations++;
      this.populationSimulation.tickNpc(npc,entry.minutes,world.clock.day,world.clock.minute,eligible&&!npc.flight&&!npc.wallLevel&&!entry.rampartJob&&!entry.waitingForSlot&&
        !npc.decisionSlot?.startsWith('society:')&&
        (!npc.decisionSlot?.startsWith('sect-campus:')||['sect-campus:array','sect-campus:home'].includes(npc.decisionSlot))?entry.workMinutes:0);
      const goal=this.resolveWorkstation(entry,this.setNpcGoalTarget(npc));
      if(goal&&Math.hypot(npc.actionTarget.x-goal.x,npc.actionTarget.y-goal.y)>4)npc.actionTarget={x:goal.x,y:goal.y};
      this.scheduler.finishDecision(entry);
      decisions++;
    }
    this.goalEvaluations+=evaluations;
    this.populationAiCost=performance.now()-aiStart;
    this.aiCostSamples.push(this.populationAiCost);
    if(this.aiCostSamples.length>180)this.aiCostSamples.shift();
    for(const entry of this.scheduler.byId.values()){
      const sprite=this.npcSprites.get(entry.npc.id);
      if(!sprite||sprite.visible===entry.visible)continue;
      sprite.setVisible(entry.visible);
      if(sprite.input)sprite.input.enabled=entry.visible;
      if(entry.visible){sprite.setDepth(this.ramparts.depth(entry.npc));sprite.anims.resume()}else sprite.anims.pause();
    }
    this.routesStartedThisFrame=0;
    this.routeLimit=6*workSlices;
    this.routeDeadline=performance.now()+4*workSlices;
    this.routeTimeThisFrame=0;this.localBypassBudget=3*workSlices;
    this.merchants.tick(this.scheduler.time);
    let moved=0;
    for(const entry of moving){
      this.confirmNpcPlan(entry);
      if(this.moveAutonomousNpc(entry))moved++;
      if(!entry.npc.alive||entry.npc.flight||entry.npc.skyStep||entry.waitingForSlot){
        entry.navigationGoal=null;entry.travelWatch=null;
      }
      this.confirmNpcAction(entry);
    }
    this.lastNpcUpdates={moved,decisions,queued:thinking.length-decisions};
    const inputDelta=Math.min(dt,60);
    this.skyStep.advance(world.npcs,simDelta);
    this.flyingSword.advance(world.npcs,simDelta,npc=>npc.id===this.possessedNpcId?this.swordInput():null);
    this.updatePossessedPlayer(inputDelta);
    this.heavenActions.updateFishing();
    this.heavenActions.updateShots(inputDelta);
    this.heavenActions.updateGuards();
    this.tickFauna(simDelta);

    this.refreshFaunaVisibility();
    this.riverFishSystem?.update(inputDelta,this.cameras.main);
    this.tickCityLaw();
    if(this.ecologyDebugSection&&!this.ecologyDebugSection.hidden&&time-this.lastEcologyDebugAt>900){
      this.lastEcologyDebugAt=time;this.renderEcologyDebug();
    }
    if(!this.populationDebug.hidden&&time-(this.guardDebugSampleAt??0)>=1100){this.guardDebugSampleAt=time;this.renderPopulationDebug();}
    this.guardDebug.update(time);
    if(this.populationSaveTick>=6500){this.populationSaveTick%=6500;this.requestBackgroundSave()}
  }
  resetNpcRoute(npc){
    this.npcRoutes.delete(npc.id);
    npc.routeIndex=0;npc.pathBlocked=false;
    const entry=this.scheduler.byId.get(npc.id);
    if(!entry)return;
    entry.retryAt=0;entry.retryTarget=null;entry.travelWatch=null;entry.blockedSince=undefined;
    entry.detour=null;entry.bypass=null;entry.seatedBlockedAt=undefined;entry.seatedWaitUntil=0;
    entry.velocity=null;entry.speed=0;entry.passageWait=undefined;entry.navigateAround=null;entry.trafficYield=null;entry.navigationGoal=null;entry.allowStaticRoute=false;
    const claim=this.workstations.claims.get(npc.id);
    if(claim&&(claim.action!==npc.goalAction||npc.marketVisit||this.merchants?.station(npc))){
      this.workstations.release(npc.id);entry.waitingForSlot=false;
    }
  }
  confirmNpcPlan(entry){
    const {npc}=entry,target=npc.actionTarget;
    if(!npc.alive||npc.id===this.possessedNpcId||npc.flight||npc.skyStep||npc.wallLevel||entry.rampartJob||!target)return;
    const movingTarget=npc.faunaHuntTargetId||npc.lawResponse||npc.decisionSlot?.startsWith('board:');
    if(entry.confirmedGoal!==npc.goalAction||!movingTarget&&Math.hypot(target.x-entry.confirmedX,target.y-entry.confirmedY)>8){
      if(entry.confirmedGoal!==undefined)this.resetNpcRoute(npc);
      entry.confirmedGoal=npc.goalAction;entry.confirmedX=target.x;entry.confirmedY=target.y;
    }
    this.confirmNpcAction(entry);
  }
  confirmNpcAction(entry){
    const {npc}=entry,target=npc.actionTarget,goal=npc.goalAction;
    if(!npc.alive||npc.id===this.possessedNpcId||npc.flight||npc.skyStep||npc.wallLevel||entry.rampartJob||npc.tribulation||!target||
      this.cultivation?.fleeing(npc)||npc.faunaHuntTargetId||goal==='fight'||goal==='flee')return;
    const tolerance=goal==='cultivate'?7:this.merchants?.station(npc)||this.workstations.claims.has(npc.id)?12:25;
    const arrived=Math.hypot(npc.x-target.x,npc.y-target.y)<=tolerance+.01;
    if(goal==='commission'&&npc.professionTask?.state==='working'&&npc.action==='work')return;
    npc.action=goal==='idle'?'idle':arrived&&!entry.waitingForSlot?goal:'travel';
  }
  resolveWorkstation(entry,goal){
    const {npc}=entry;
    if(npc.wallLevel||this.ramparts.wantsDuty(npc)>=0){
      this.workstations.release(npc.id);this.cultivation.spots.release(npc);entry.waitingForSlot=false;return goal;
    }
    if(npc.decisionSlot?.startsWith('society:')||npc.decisionSlot?.startsWith('sect-campus:')&&npc.decisionSlot!=='sect-campus:array'){
      this.workstations.release(npc.id);this.cultivation.spots.release(npc);entry.waitingForSlot=false;return goal;
    }
    if(npc.tribulation||npc.marketVisit||this.merchants?.station(npc)||npc.decisionSlot?.startsWith('shop-wait:')){
      this.workstations.release(npc.id);entry.waitingForSlot=false;return goal;
    }
    if(npc.goalAction==='cultivate'){
      this.workstations.release(npc.id);
      const spot=this.cultivation.spots.reserve(npc);
      entry.waitingForSlot=!spot;
      if(spot)return spot;
      npc.shortGoal='Đang chờ chỗ đả tọa trống';
      return null;
    }
    this.cultivation.spots.release(npc);
    const eatingOwn=npc.goalAction==='eat'&&npc.inventory.some(i=>i.count>0&&(i.itemId==='ration'||i.itemId==='deer_meat'));
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
  yieldNpcTraffic(entry,sprite,blocker){
    const {npc}=entry, grid=this.groundOccupancy, time=this.scheduler.time;
    const body=grid.bodies.get(npc.id);
    if(!body||!blocker||blocker.seated||blocker.mounted||blocker.id===this.possessedNpcId||
      npc.id<blocker.id||time<(entry.nextTrafficYieldAt??0))return false;
    const peer=this.scheduler.byId.get(blocker.id);
    if(!peer?.navigationGoal||Math.hypot(npc.x-blocker.x,npc.y-blocker.y)>45)return false;
    const movement=this.npcSprites.get(blocker.id)?.getData('moving');
    if(!movement&&peer.blockerId!==npc.id&&!peer.travelWatch)return false;
    const length=Math.hypot(npc.x-blocker.x,npc.y-blocker.y)||1;
    const x=(npc.x-blocker.x)/length,y=(npc.y-blocker.y)/length;
    entry.nextTrafficYieldAt=time+3600;
    for(const offset of [24,-24,36,-36,0]){
      const bay={x:sprite.x+x*22-y*offset,y:sprite.y+y*22+x*offset};
      if(!grid.clearSegment(body,sprite,bay))continue;
      entry.trafficYield={bay,peerId:blocker.id,peerX:blocker.x,peerY:blocker.y,until:time+2800};
      this.npcRoutes.delete(npc.id);npc.routeIndex=0;entry.bypass=null;entry.detour=null;
      return true;
    }
    return false;
  }
  moveTrafficYield(entry,sprite,delta){
    const {npc,trafficYield:hold}=entry, body=this.groundOccupancy.bodies.get(hold.peerId);
    if(this.scheduler.time>=hold.until||!body||Math.hypot(body.x-hold.peerX,body.y-hold.peerY)>38){
      entry.trafficYield=null;
      return false;
    }
    const dx=hold.bay.x-npc.x,dy=hold.bay.y-npc.y,d=Math.hypot(dx,dy),step=Math.min(d,delta*.038);
    const move=d>3&&this.moveOnGround(npc,sprite,npc.x+step*dx/d,npc.y+step*dy/d,false);
    if(move){npc.x=move.x;npc.y=move.y;sprite.setPosition(npc.x,npc.y).setDepth(npc.y);}
    sprite.setData('moving',Boolean(move));
    if(sprite.visible){
      entry.direction=stableFacing(entry,dx,dy,this.scheduler.time);
      sprite.play(this.npcTextureFor(npc)+'_'+(move?'walk':'idle')+'_'+entry.direction,true);
    }
    return true;
  }
  checkTravelStall(entry,target,passage){
    const {npc}=entry,time=this.scheduler.time;
    if(passage?.wait||Math.hypot(npc.x-target.x,npc.y-target.y)<(entry.rampartJob?5:12)){entry.travelWatch=null;return false}
    let watch=entry.travelWatch;
    if(!watch||Math.hypot(watch.goal.x-target.x,watch.goal.y-target.y)>32){
      entry.travelWatch=newTravelWatch(npc,target,time);
      return false;
    }
    observeTravel(watch,npc,time,Boolean(entry.bypass||!npc.pathBlocked&&this.npcRoutes.get(npc.id)?.points.length>1));
    entry.maxStuckMs=Math.max(entry.maxStuckMs??0,time-watch.since);
    if(entry.bypass||entry.seatedWaitUntil>time&&time-watch.since<4000)return false;
    if(!entry.trafficYield&&time-watch.since>=4400&&time>=(entry.nextRecoveryAt??0)){
      entry.nextRecoveryAt=time+5000+(entry.index%5)*230;
      if(!passage?.wait){
        this.npcRoutes.delete(npc.id);npc.routeIndex=0;
        entry.dynamicRepathUntil=time+4200;entry.retryAt=0;
      }
    }
    if(npc.goalAction==='flee'||npc.decisionSlot?.startsWith('mandate:'))return false;
    const slot=this.workstations.claims.get(npc.id),stuckFor=time-watch.since;
    const occupiedSlot=stuckFor>=1600&&slot&&Math.hypot(npc.x-slot.x,npc.y-slot.y)<80&&
      !this.groundPositionOpen(npc,slot.x,slot.y);
    if(stuckFor<10000&&!occupiedSlot)return false;
    if(time<(entry.recoveryDecisionAt??0))return false;
    if(npc.meditationSpot&&Math.hypot(npc.x-npc.meditationSpot.x,npc.y-npc.meditationSpot.y)<80){
      const spots=this.cultivation.spots,old=npc.meditationSpot;
      const body=this.groundOccupancy.bodies.get(npc.id);
      if(body&&!this.groundOccupancy.clearSegment(body,npc,old)){
        entry.recoveryDecisionAt=time+6000;
        const next=spots.relocate(npc,old);
        this.npcRoutes.delete(npc.id);npc.routeIndex=0;
        if(next){npc.actionTarget=next;entry.recoveryTarget=next;}
        else{entry.waitingForSlot=true;entry.navigationGoal=null;entry.routeFailure='meditation-approach-occupied';}
        return true;
      }
    }
    entry.recoveryDecisionAt=time+5200;
    this.npcRoutes.delete(npc.id);entry.detour=null;entry.retryAt=0;
    const lastRetry=entry.lastCrowdRetry;
    if(!occupiedSlot&&!passage&&(!lastRetry||Math.hypot(lastRetry.x-target.x,lastRetry.y-target.y)>24)){
      entry.lastCrowdRetry={x:target.x,y:target.y};
      entry.dynamicRepathUntil=time+7200;entry.allowStaticRoute=false;
      npc.routeIndex=0;
      return false;
    }
    if(slot){
      const alternative=this.workstations.reserve(npc,{x:slot.anchorX,y:slot.anchorY,refuge:slot.refuge},true);
      if(alternative&&Math.hypot(alternative.x-slot.x,alternative.y-slot.y)>8){
        npc.actionTarget={x:alternative.x,y:alternative.y};npc.pathBlocked=false;npc.routeIndex=0;
        entry.recoveryTarget=npc.actionTarget;return true;
      }
    }
    if(!slot&&!npc.tribulation&&!npc.marketVisit&&!this.merchants?.station(npc)&&
      this.canReachPoint(npc,target)&&!this.groundPositionOpen(npc,target.x,target.y)){
      const nearby=[20,33,46].flatMap(r=>[[1,0],[0,1],[-1,0],[0,-1]].map(([dx,dy])=>({x:target.x+dx*r,y:target.y+dy*r})))
        .find(p=>this.groundPositionOpen(npc,p.x,p.y)&&this.canReachPoint(npc,p));
      if(nearby){
        if(entry.rampartJob){
          entry.rampartJob.alternate=nearby;
          entry.navigateAround={target,x:nearby.x,y:nearby.y,until:time+9000};
        }else npc.actionTarget=nearby;
        npc.routeIndex=0;entry.recoveryTarget=nearby;return true;
      }
    }
    if(entry.rampartJob||passage){
      this.passageTraffic.release(npc.id);
      entry.retryAt=time+900+(entry.index%6)*190;
      return true;
    }
    if(npc.assignedResourceNodeId&&npc.goalAction==='gather'){
      const node=this.populationWorld.environment.resourceNodes.find(n=>n.id===npc.assignedResourceNodeId);
      if(node?.reservedBy===npc.id)delete node.reservedBy;
      npc.resourceRouteCooldown={nodeId:npc.assignedResourceNodeId,until:
        this.populationWorld.clock.day*1440+this.populationWorld.clock.minute+22};
      delete npc.assignedResourceNodeId;
      npc.professionTask={kind:'herb-gather',targetId:'',state:'blocked',lastReason:'route-retry-backoff'};
    }
    this.workstations.release(npc.id);entry.abandonedRoutes=(entry.abandonedRoutes??0)+1;
    if(this.society?.visits[npc.id]){this.society.end(npc,this.society.visits[npc.id],60);return true;}
    if(this.sectCampus?.deferStation(npc))return true;
    if(npc.tribulation?.phase==='travel'){this.cultivation.interrupt(npc);npc.actionCooldown=40;}
    if(this.merchants?.reroute(npc))return true;
    if(this.merchants?.cancel(npc,'Lối tới quầy bị chặn'))return true;
    const stationBlocked=this.merchants?.replanStation(npc);
    npc.pathBlocked=false;npc.actionProgress=0;npc.decisionSlot=undefined;
    npc.goalAction='rest';npc.action='idle';npc.shortGoal=stationBlocked?'Lối tới cửa hàng bị chặn · sẽ thử lại':'Tạm nghỉ sau khi tuyến đường bị chặn';
    npc.actionTarget=npc.home&&this.canReachPoint(npc,npc.home)?{...npc.home}:{x:npc.x,y:npc.y};
    return true;
  }
  moveAutonomousNpc(entry) {
    const npc=entry.npc,sprite=this.npcSprites.get(npc.id);
    const delta=this.scheduler.elapsedForMove(entry,this.worldMoveBudget);
    entry.navigationGoal=null;
    if(!sprite||!delta||npc.flight||npc.skyStep||entry.waitingForSlot&&!npc.wallLevel)return false;
    if(npc.tribulation&&npc.tribulation.phase!=='travel'){
      sprite.setData('moving',false);
      return false;
    }
    if(this.cultivation?.standingUp(npc,this.time.now))return false;
    if(this.cultivation?.isSeated(npc)){
      sprite.setData('moving',false);npc.pathBlocked=false;entry.travelWatch=null;entry.velocity={x:0,y:0};
      return false;
    }
    if(this.flightArena?.targets.has(npc.id)&&Math.hypot(npc.x-npc.actionTarget.x,npc.y-npc.actionTarget.y)<18)this.flightArena.targets.delete(npc.id);
    if(npc.lawResponse?.status==='at-scene'&&!npc.wallLevel){
      sprite.setData('moving',false);entry.travelWatch=null;entry.blockerId=null;
      if(sprite.visible)sprite.play(this.npcTextureFor(npc)+'_idle_'+(entry.direction??'down'),true);
      return false;
    }
    const wallOrder=this.ramparts.order(entry);
    if(this.ramparts.guards.has(npc.id)){
      entry.guardPoint=wallOrder?.point??wallOrder?.local??wallOrder?.target??null;
      entry.guardNext=wallOrder?.next??null;
      entry.guardState=wallOrder?.state??(wallOrder?.local||wallOrder?.target?'toDuty':null);
    }
    if(wallOrder?.local){
      entry.navigationGoal=wallOrder.local;
      this.ramparts.checkLocalProgress(entry,wallOrder);
    }else if(wallOrder?.wait){
      entry.travelWatch=null;entry.routeFailure=null;entry.blockerId=null;entry.passageWait=undefined;
    }
    if(wallOrder?.target&&!entry.rampartJob?.ground&&Math.hypot(npc.x-wallOrder.target.x,npc.y-wallOrder.target.y)<16){
      const target=wallOrder.target,dx=target.x-npc.x,dy=target.y-npc.y,d=Math.hypot(dx,dy);
      const step=Math.min(d,delta*.030);
      const body=this.groundOccupancy.bodies.get(npc.id);
      if(d>5&&body&&this.groundOccupancy.clearSegment(body,npc,target))
        return this.ramparts.move(entry,sprite,{local:{x:npc.x+dx/d*step,y:npc.y+dy/d*step}},delta);
    }
    if(wallOrder?.local||wallOrder?.wait)return this.ramparts.move(entry,sprite,wallOrder,delta);
    const finalTarget=wallOrder?.target??npc.actionTarget??npc.home??npc;
    const urgent=npc.lawResponse?.status==='responding'||Boolean(npc.decisionSlot?.startsWith('mandate:')&&npc.goalAction==='travel');
    if(!wallOrder&&!this.flightArena?.targets.has(npc.id)&&this.skyStep.consider(npc,finalTarget,this.scheduler.time))return true;
    if(!wallOrder&&this.flyingSword.consider(npc,finalTarget,{urgent}))return true;
    const alternate=entry.navigateAround;
    const targetMatches=alternate&&alternate.until>this.scheduler.time&&Math.hypot(finalTarget.x-alternate.target.x,finalTarget.y-alternate.target.y)<12;
    const localTarget=targetMatches?alternate:wallOrder?.target??this.flyingSword.launchWaypoint(npc,finalTarget)??finalTarget;
    const passage=this.passageTraffic.guide(npc,localTarget,this.scheduler.time);
    entry.passageWait=passage?.wait?passage.id:undefined;
    if(passage?.wait&&!this.groundPositionOpen(npc,passage.target.x,passage.target.y)){
      sprite.setData('moving',false);
      if(sprite.visible)sprite.play(this.npcTextureFor(npc)+'_idle_'+(entry.direction??'down'),true);
      return false;
    }
    let target=passage?.target??localTarget;
    if(!passage&&!npc.tribulation&&!npc.marketVisit){
      const body=this.groundOccupancy.bodies.get(npc.id),prior=entry.correctedTarget;
      if(body&&(prior?.x!==target.x||prior?.y!==target.y)){
        let candidate=null;
        if(Number.isFinite(target.x)&&Number.isFinite(target.y)&&
          !this.footprintTerrainOpen(target.x,target.y,body.width/2,body.height/2)){
          for(const radius of [16,24,40,56,80,112]){
            candidate=FALLBACK_DIRECTIONS.map(([x,y])=>({x:target.x+x*radius,y:target.y+y*radius}))
              .find(p=>this.groundPositionOpen(npc,p.x,p.y)&&this.canReachPoint(npc,p));
            if(candidate)break;
          }
        }
        entry.correctedTarget={x:target.x,y:target.y,candidate};
      }
      if(entry.correctedTarget?.candidate){target=entry.correctedTarget.candidate;if(!wallOrder)npc.actionTarget=target;}
    }
    entry.navigationGoal=passage?.wait||Math.hypot(npc.x-target.x,npc.y-target.y)<=(wallOrder?5:12)?null:target;
    if(this.checkTravelStall(entry,target,passage))return false;
    if(!passage&&entry.trafficYield&&this.moveTrafficYield(entry,sprite,delta))return true;
    if(!passage&&entry.travelWatch&&this.scheduler.time-entry.travelWatch.since>=3100&&entry.blockerId){
      const blocker=this.groundOccupancy.bodies.get(entry.blockerId);
      if(this.yieldNpcTraffic(entry,sprite,blocker)&&this.moveTrafficYield(entry,sprite,delta))return true;
    }
    if(entry.retryTarget&&Math.hypot(entry.retryTarget.x-target.x,entry.retryTarget.y-target.y)>=16)entry.retryAt=0;
    if(entry.retryAt>this.scheduler.time){entry.velocity={x:0,y:0};sprite.setData('moving',false);return false;}
    if(entry.bypass&&Math.hypot(entry.bypass.target.x-target.x,entry.bypass.target.y-target.y)>8)entry.bypass=null;
    if(entry.recoveryTarget&&Math.hypot(npc.x-entry.recoveryTarget.x,npc.y-entry.recoveryTarget.y)<=10){
      entry.recoveries=(entry.recoveries??0)+1;entry.recoveryTarget=null;
    }
    const goalTolerance=wallOrder?.target?4:passage?2:npc.meditationSpot||npc.tribulation?.phase==='travel'||npc.marketVisit?6:this.workstations.claims.has(npc.id)?8:12;
    if(!this.npcRoutes.has(npc.id)&&Math.hypot(target.x-sprite.x,target.y-sprite.y)<=goalTolerance&&npc.goalAction!=='patrol'){if(!passage){npc.pathBlocked=false;entry.blockedSince=undefined}sprite.setData('moving',false);if(sprite.visible)sprite.play(this.npcTextureFor(npc)+'_idle_'+(entry.direction??'down'),true);return false}
    const cached=this.npcRoutes.get(npc.id);
    let route=cached&&Math.hypot(cached.target.x-target.x,cached.target.y-target.y)<8?cached.points:null;
    if(!route){
      const pathStart=performance.now();
      const length=Math.hypot(target.x-sprite.x,target.y-sprite.y);
      const body=this.groundOccupancy.bodies.get(npc.id);
      if(body&&length<=(passage?180:108)&&this.groundOccupancy.clearSegment(body,sprite,target)){
        route=[];npc.routeIndex=0;entry.routeFailure=null;
        this.npcRoutes.set(npc.id,{target:{...target},points:route});
      }else{
        let seatedNearby=false;
        if(length<260&&!entry.allowStaticRoute)for(const other of this.groundOccupancy.near(sprite.x,sprite.y,106)){
          if(other.id!==npc.id&&other.seated&&Math.hypot(other.x-sprite.x,other.y-sprite.y)<106){seatedNearby=true;break;}
        }
        const retryCrowd=entry.dynamicRepathUntil>this.scheduler.time;
        const nearTraffic=length<260&&(seatedNearby||Boolean(passage)||Boolean(npc.marketVisit)||
          this.passageTraffic.gates.some(g=>Math.hypot(sprite.x-g.x,sprite.y-g.y)<155));
        route=this.populationRoute(npc,sprite,target,!entry.allowStaticRoute&&(retryCrowd||nearTraffic));
      }
      this.routeTimeThisFrame+=performance.now()-pathStart;
    }
    if(!route){entry.speed=0;sprite.setData('moving',false);return false;}
    const speed=(npc.faunaHuntTargetId?96:npc.goalAction==='flee'?88:npc.populationRole==='city_guard'?30:36)*(npc.westPoison>=45?.78:1);
    let remaining=delta,blocked=false,pace=entry.speed??0;
    const x=sprite.x,y=sprite.y;
    let detour=entry.detour&&entry.detour.until>this.scheduler.time?entry.detour:null;
    const grid=this.groundOccupancy,body=grid.bodies.get(npc.id);
    let seatedBlocked=false;
    while(remaining>0){
      const bypass=entry.bypass;
      if(detour&&Math.hypot(detour.x-sprite.x,detour.y-sprite.y)<=4){entry.detour=null;detour=null;}
      const waypoint=bypass?.points[bypass.index]??detour??route[npc.routeIndex]??target;
      const dx=waypoint.x-sprite.x,dy=waypoint.y-sprite.y,d=Math.hypot(dx,dy);
      if(bypass&&d<=2){
        if(++bypass.index>=bypass.points.length)entry.bypass=null;
        continue;
      }
      if(!bypass&&!detour&&npc.routeIndex<route.length){
        if(d<=2.5){npc.routeIndex++;continue;}
      }else if(!bypass&&d<=(detour?4:goalTolerance))break;
      const dt=Math.min(60,remaining);
      pace=travelSpeed(pace,speed,d,dt,!bypass&&!detour&&npc.routeIndex>=route.length);
      const step=Math.min(d,pace*dt/1000),vx=dx/d,vy=dy/d;
      const found=body&&!bypass?grid.blockingBody(body,sprite.x+vx*step,sprite.y+vy*step):null;
      if(found&&!passage?.wait){
        entry.blockerId=found.id;
        if(!passage&&this.scheduler.time-(entry.blockedSince??this.scheduler.time)>=950&&this.yieldNpcTraffic(entry,sprite,found)){
          blocked=true;break;
        }
        const congestion=!passage&&this.scheduler.time-(entry.blockedSince??this.scheduler.time)>=480;
        let blocker=found?.seated||congestion?found:null;
        if(found&&!blocker){
          for(const candidate of grid.near(sprite.x,sprite.y,65)){
            if(candidate.seated&&Math.hypot(candidate.x-sprite.x,candidate.y-sprite.y)<65){blocker=found;break;}
          }
        }
        if(blocker){
          seatedBlocked=true;
          if(this.scheduler.time>=(entry.nextBypassAt??0)&&(this.localBypassBudget??2)>0){
            if(this.localBypassBudget!==undefined)this.localBypassBudget--;
            const started=performance.now();
            let join=waypoint,joinIndex=npc.routeIndex;
            if(Math.hypot(waypoint.x-sprite.x,waypoint.y-sprite.y)<30||!grid.open(body,waypoint.x,waypoint.y)){
              while(joinIndex+1<route.length&&Math.hypot(join.x-sprite.x,join.y-sprite.y)<48)join=route[++joinIndex];
              if(Math.hypot(join.x-sprite.x,join.y-sprite.y)<35){join=target;joinIndex=route.length;}
            }
            const points=findSeatedBypass(grid,body,sprite,join,blocker);
            this.routeTimeThisFrame+=performance.now()-started;
            entry.nextBypassAt=this.scheduler.time+(blocker.seated?360:1120);
            if(blocker.seated)entry.seatedRepaths=(entry.seatedRepaths??0)+1;
            if(points){
              entry.seatedBlockedAt=undefined;
              if(blocker.seated)entry.seatedWaitUntil=this.scheduler.time+3500;
              entry.bypass={points,index:0,target};
              entry.detour=null;
              if(join!==waypoint)npc.routeIndex=joinIndex;
              continue;
            }
            entry.seatedBlockedAt??=this.scheduler.time;
            if(blocker.seated)entry.seatedWaitUntil=entry.seatedBlockedAt+11000;
            if(this.scheduler.time-entry.seatedBlockedAt>=3200){
              this.npcRoutes.delete(npc.id);
              entry.dynamicRepathUntil=this.scheduler.time+2800;
            }
          }
          blocked=true;break;
        }
      }
      // Short collision steps apply even when an actor is advanced in batches outside the camera.
      const move=this.moveOnGround(npc,sprite,sprite.x+vx*step,sprite.y+vy*step,
        !passage?.wait&&!bypass&&!found);
      if(!move){if(!found)entry.routeFailure='footprint-obstructed';if(bypass){entry.bypass=null;seatedBlocked=true;}blocked=true;break}
      sprite.setPosition(move.x,move.y);
      remaining-=dt;
    }
    npc.x=sprite.x;npc.y=sprite.y;
    const direction=stableFacing(entry,npc.x-x,npc.y-y,this.scheduler.time);
    entry.direction=direction;entry.speed=blocked?0:pace;
    entry.walked=(entry.walked??0)+Math.hypot(npc.x-x,npc.y-y);
    entry.velocity={x:(npc.x-x)*1000/delta,y:(npc.y-y)*1000/delta};
    const walking=x!==npc.x||y!==npc.y;
    sprite.setData('moving',walking);
    const localGoal=route[npc.routeIndex]??target;
    const stalled=walking&&!entry.bypass&&!detour&&Math.hypot(localGoal.x-npc.x,localGoal.y-npc.y)>=Math.hypot(localGoal.x-x,localGoal.y-y)-.05;
    if(stalled)entry.blockedSince??=this.scheduler.time;
    if(blocked||(stalled&&this.scheduler.time-entry.blockedSince>=800)){
      entry.blockedSince??=this.scheduler.time;
      if(!seatedBlocked&&!detour&&this.scheduler.time-entry.blockedSince>=700){
        const angle=Math.atan2(target.y-y,target.x-x), side=1;
        for(const turn of [Math.PI/2*side,-Math.PI/2*side,Math.PI]){
          const px=x+Math.cos(angle+turn)*24,py=y+Math.sin(angle+turn)*24;
          if(!body||!grid.clearSegment(body,sprite,{x:px,y:py}))continue;
          entry.detour={x:px,y:py,until:this.scheduler.time+1800};
          entry.blockedSince=this.scheduler.time;break;
        }
      }
      npc.pathBlocked=true;
      if(!seatedBlocked){this.npcRoutes.delete(npc.id);npc.routeIndex=0;}
      entry.retryAt=this.scheduler.time+[380,900,1800][entry.level];
      entry.retryTarget={...target};
    }else if(walking){
      entry.seatedBlockedAt=undefined;
      if(!stalled){entry.blockerId=null;entry.routeFailure=null;}
      if(!stalled&&!detour)entry.blockedSince=undefined;
      npc.pathBlocked=false;
      npc.action='travel';
    }else if(npc.goalAction==='patrol'&&npc.populationRole==='city_guard'&&npc.actionProgress>20&&npc.patrolPoints?.length){
      npc.patrolIndex=((npc.patrolIndex??0)+1)%npc.patrolPoints.length;
      npc.actionTarget=this.setNpcGoalTarget(npc)??target;
    }
    if(sprite.visible){if(sprite.depth!==this.ramparts.depth(npc))sprite.setDepth(this.ramparts.depth(npc));sprite.play(`${this.npcTextureFor(npc)}_${walking?'walk':'idle'}_${direction}`,true)}
    return true;
  }
  clearFaunaLine(a,b){const distance=Math.hypot(b.x-a.x,b.y-a.y),steps=Math.ceil(distance/12);for(let i=1;i<steps;i++){const t=i/steps;if(!this.canOccupy(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t))return false}return true}
  facePoint(from,to){const dx=to.x-from.x,dy=to.y-from.y;const direction=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');if(from.id===this.possessedNpcId)this.playerFacing=direction;return direction}
  handlePossessedAction(key) {
    const npc=this.populationWorld.npcs.find(n=>n.id===this.possessedNpcId&&n.alive);
    if(!npc||npc.skyStep||this.merchantPanel?.dialog.open||this.sectCampus.panel?.open||tribulationLocked(npc))return;
    if(npc.wallLevel&&['T','V','M','F'].includes(key))return this.worldPopulationToast('Xuống cầu thang trước khi dùng thao tác này.');
    if(key==='T')return this.toggleSkyAim(npc);
    if(this.skyAim)this.closeSkyAim();
    if(npc.manualMeditation)this.cultivation.interrupt(npc);
    const rig=this.characterRigPreview?.npc===npc?this.characterRigPreview:null;
    if(key==='V')return this.toggleSwordFlight(npc,rig);
    if(npc.flight){
      if(key==='J'||key==='K')this.toggleSwordFlight(npc,rig);
      return;
    }
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
  updatePossessedPlayer(dt){if(!this.possessedNpcId)return;const npc=this.populationWorld.npcs.find(n=>n.id===this.possessedNpcId),sprite=this.npcSprites.get(this.possessedNpcId);if(!npc?.alive||!sprite){this.endPossession('NPC đã tử vong; nhập thân kết thúc theo trạng thái thật.');return}if(this.scheduler.byId.get(npc.id)?.visible&&!sprite.visible){sprite.setVisible(true);sprite.anims.resume()}const status=PossessionSystem.tick(this.populationWorld.heaven,npc,dt);if(status==='depleted'||status==='dead'){this.endPossession(status==='dead'?'NPC đã tử vong; nhập thân kết thúc.':'Thần Lực chu kỳ đã cạn; nhập thân kết thúc.');return}if(this.merchantPanel?.dialog.open||this.sectCampus.panel?.open||tribulationLocked(npc)){sprite.setData('moving',false);return}
    if(this.skyAim){
      if(Phaser.Input.Keyboard.JustDown(this.keys.ESC))this.closeSkyAim();
      sprite.setData('moving',false);return;
    }
    if(npc.skyStep){
      if(!this.cameraFollowSuspended){
        const f=npc.skyStep,view=this.cameras.main.worldView,t=f.phase==='travel'?f.elapsed/SKY_STEP.phases.travel:
          ['arrive','recover'].includes(f.phase)?1:0;
        const x=f.from.x+(f.landing.x-f.from.x)*t,y=f.from.y+(f.landing.y-f.from.y)*t-40*Math.sin(t*Math.PI);
        const factor=Math.min(1,dt*.016);
        this.cameras.main.centerOn(view.centerX+(x-view.centerX)*factor,view.centerY+(y-view.centerY)*factor);
        this.clampCamera();
      }
      return;
    }
    if(npc.flight){
      this.playerFacing=npc.flight.heading;
      if(!this.cameraFollowSuspended)this.cameras.main.centerOn(npc.x,npc.y-flightOffset(npc.flight)*.6);
      this.clampCamera();
      if(Phaser.Input.Keyboard.JustDown(this.keys.ESC))this.endPossession();
      return;
    }let dx=0,dy=0;if(this.keys?.A?.isDown||this.keys?.LEFT?.isDown)dx--;if(this.keys?.D?.isDown||this.keys?.RIGHT?.isDown)dx++;if(this.keys?.W?.isDown||this.keys?.UP?.isDown)dy--;if(this.keys?.S?.isDown||this.keys?.DOWN?.isDown)dy++;const rig=this.characterRigPreview?.npc===npc?this.characterRigPreview:null;const moving=!rig?.mount.locked&&(dx!==0||dy!==0);if(moving){if(npc.manualMeditation)this.cultivation.interrupt(npc);this.heavenActions.stopFishing();this.cameraFollowSuspended=false;const length=Math.hypot(dx,dy);dx/=length;dy/=length;this.playerFacing=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');const mounted=rig?.mount.attached;const speed=(mounted?(this.keys?.SHIFT?.isDown?234:155):(this.keys?.SHIFT?.isDown?178:118))*(npc.westPoison>=45?.78:1);const x=sprite.x+dx*speed*dt/1000,y=sprite.y+dy*speed*dt/1000;const move=mounted?rig.moveMounted(x,y):this.moveOnGround(npc,sprite,x,y);if(move){sprite.setPosition(move.x,move.y);npc.x=move.x;npc.y=move.y;sprite.setDepth(this.ramparts.depth(npc));npc.action='travel';npc.shortGoal='Đang được Thiên Đạo điều khiển';sprite.setData('moving',true);sprite.play(`${this.npcTextureFor(npc)}_walk_${this.playerFacing}`,true)}else{sprite.setData('moving',false);sprite.play(`${this.npcTextureFor(npc)}_idle_${this.playerFacing}`,true)}}else{sprite.setData('moving',false);npc.x=sprite.x;npc.y=sprite.y;sprite.play(`${this.npcTextureFor(npc)}_idle_${this.playerFacing}`,true)}if(!this.cameraFollowSuspended)this.cameras.main.centerOn(npc.x,npc.y-this.ramparts.height(npc));this.clampCamera();this.playerAttackCooldown=Math.max(0,this.playerAttackCooldown-dt/1000);this.playerSkillCooldown=Math.max(0,this.playerSkillCooldown-dt/1000);
    updateSkillStatus(this,npc);
    if(!npc.wallLevel&&Phaser.Input.Keyboard.JustDown(this.keys.E)&&!this.westWilds?.interact(npc)&&!this.sectCampus.interact(npc)&&!this.merchantPanel?.interact(npc)){const drop=(this.populationWorld.environment.drops??[]).filter(d=>d.status==='ground').sort((a,b)=>Math.hypot(npc.x-a.x,npc.y-a.y)-Math.hypot(npc.x-b.x,npc.y-b.y))[0];if(!drop)this.worldPopulationToast('Không có vật phẩm rơi gần đây.');else if(Math.hypot(npc.x-drop.x,npc.y-drop.y)>32)this.worldPopulationToast('Tiến sát chiến lợi phẩm rồi nhấn E để nhặt.');else{const result=this.claimFaunaDropForNpc(drop.id,npc.id,`possessed-pickup:${createWorldUuid()}`);this.worldPopulationToast(result?`Đã nhặt ${result.itemId} ×${result.count} vào túi ${npc.name}.`:'Vật phẩm đã được nhặt hoặc không còn hợp lệ.');this.refreshHud()}}
    if(Phaser.Input.Keyboard.JustDown(this.keys.ESC))this.endPossession();}
  tickCityLaw(){
    const start=performance.now();
    for(const incident of this.populationWorld?.cityLaw?.incidents??[]){
      if(incident.status==='responding'){
        const ids=incident.cityMasterDispatched?[...incident.responderIds,this.populationWorld.authority.cityMasterId]:incident.responderIds;
        const target=this.scheduler.byId.get(incident.suspectId)?.npc;
        if(target?.alive&&!target.flight)for(const id of ids){
          const responder=this.scheduler.byId.get(id)?.npc;
          if(!responder?.lawResponse||responder.flight||(responder.wallLevel??0)!==(target.wallLevel??0))continue;
          if(Math.hypot(responder.x-target.x,responder.y-target.y)<52)markCityIncidentAtScene(this.populationWorld,incident.id,id);
        }
      }
      if(incident.status!=='contained')continue;
      this.cityLawTimers??=new Map();
      if(!this.cityLawTimers.has(incident.id))this.cityLawTimers.set(incident.id,start);
      else if(start-this.cityLawTimers.get(incident.id)>1800){
        clearCityResponse(this.populationWorld,incident.id);
        this.cityLawTimers.delete(incident.id);this.requestBackgroundSave();
      }
    }
    this.cityLawCostMs=performance.now()-start;
    this.cityLawCostSamples??=[];
    this.cityLawCostSamples.push(this.cityLawCostMs);
    if(this.cityLawCostSamples.length>180)this.cityLawCostSamples.shift();
  }
  routeFootprintOpen(body,cell){
    if(!body)return true;
    const shape=body.width*100+body.height;
    const cache=this.routeFootprints??=new Map();
    let mask=cache.get(shape);
    if(!mask){mask=new Uint8Array(this.navBlocked.length);cache.set(shape,mask);}
    if(!mask[cell]){
      const x=(cell%this.navCols+.5)*this.navCell+this.worldMinX,y=(Math.floor(cell/this.navCols)+.5)*this.navCell;
      mask[cell]=this.footprintTerrainOpen(x,y,body.width/2,body.height/2)?1:2;
    }
    return mask[cell]===1;
  }
  routeEntryOpen(body,from,x,y){
    if(!body)return true;
    const steps=Math.ceil(Math.hypot(x-from.x,y-from.y)/5);
    for(let i=1;i<=steps;i++){
      const t=i/steps;
      if(!this.footprintTerrainOpen(from.x+(x-from.x)*t,from.y+(y-from.y)*t,body.width/2,body.height/2))return false;
    }
    return true;
  }
  populationRoute(npc,sprite,target,avoidCrowd=false){
    const cached=this.npcRoutes.get(npc.id);if(cached&&Math.hypot(cached.target.x-target.x,cached.target.y-target.y)<8)return cached.points;
    // A route search is synchronous. Limit the work started in one frame without slowing collision or input updates.
    if(this.routeDeadline!==undefined &&
      (this.routesStartedThisFrame>=(this.routeLimit??6) || (this.routesStartedThisFrame>0 && performance.now()>=this.routeDeadline)))return null;
    this.routesStartedThisFrame=(this.routesStartedThisFrame??0)+1;
    const entry=this.scheduler?.byId.get(npc.id);
    if(entry)entry.repaths=(entry.repaths??0)+1;
    this.pathfindingCalls++;const cell=this.navCell,cols=this.navCols,rows=this.navRows,total=cols*rows,startX=Math.floor((sprite.x+this.westOffsetX)/cell),startY=Math.floor(sprite.y/cell),goalX=Math.floor((target.x+this.westOffsetX)/cell),goalY=Math.floor(target.y/cell),key=(x,y)=>y*cols+x;let start=key(startX,startY),goal=key(goalX,goalY);
    if(!Number.isFinite(target.x)||!Number.isFinite(target.y)||goalX<0||goalY<0||goalX>=cols||goalY>=rows){
      if(entry){entry.retryAt=this.scheduler.time+1000;entry.routeFailure='outside-world';}
      npc.pathBlocked=true;return null;
    }
    const body=this.groundOccupancy?.bodies.get(npc.id);
    const usable=cell=>!this.navBlocked[cell]&&this.routeFootprintOpen(body,cell);
    if(!usable(goal)){
      for(let r=1;r<=4&&!usable(goal);r++){
        for(let dy=-r;dy<=r&&!usable(goal);dy++)for(let dx=-r;dx<=r&&!usable(goal);dx++){
          const x=goalX+dx,y=goalY+dy;
          if(x>=0&&y>=0&&x<cols&&y<rows&&usable(key(x,y)))goal=key(x,y);
        }
      }
    }
    const entered=cell=>this.routeEntryOpen(body,sprite,(cell%cols+.5)*this.navCell+this.worldMinX,(Math.floor(cell/cols)+.5)*this.navCell);
    if(this.navBlocked[start]||!this.routeFootprintOpen(body,start)||!entered(start)){const originX=start%cols,originY=Math.floor(start/cols),component=this.navComponentAt(sprite),candidates=[];for(let r=1;r<=6&&!candidates.length;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const x=originX+dx,y=originY+dy;if(x<0||y<0||x>=cols||y>=rows)continue;const candidate=key(x,y);if(!this.navBlocked[candidate]&&this.navComponents[candidate]===component&&this.routeFootprintOpen(body,candidate)&&entered(candidate))candidates.push(candidate)}if(candidates.length)start=candidates.sort((a,b)=>Math.hypot(a%cols-originX,Math.floor(a/cols)-originY)-Math.hypot(b%cols-originX,Math.floor(b/cols)-originY))[0]}
    if(this.navBlocked[start]||!this.routeFootprintOpen(body,start)||!entered(start)||!this.navComponents[goal]||this.navComponents[start]!==this.navComponents[goal]){
      if(entry){entry.retryAt=this.scheduler.time+1700;entry.routeFailure='disconnected';}
      npc.pathBlocked=true;return null;
    }
    const workspace=this.routeWorkspace??={previous:new Int32Array(total),gScore:new Float32Array(total),
      visited:new Float64Array(total),closed:new Float64Array(total),heapNodes:[],heapF:[],sequence:0};
    const {previous,gScore,visited,closed,heapNodes,heapF}=workspace,search=++workspace.sequence;
    heapNodes.length=0;heapF.length=0;
    const heuristic=k=>Math.abs(k%cols-goal%cols)+Math.abs(Math.floor(k/cols)-Math.floor(goal/cols));
    const center=k=>({x:(k%cols+.5)*cell+this.worldMinX,y:(Math.floor(k/cols)+.5)*cell});
    const nearOpen=k=>{
      if(!this.routeFootprintOpen(body,k))return false;
      if(!avoidCrowd)return true;
      const p=center(k);
      return Math.hypot(p.x-sprite.x,p.y-sprite.y)>112||this.groundPositionOpen(npc,p.x,p.y);
    };
    const push=(node,f)=>{let i=heapNodes.length;heapNodes.push(node);heapF.push(f);while(i>0){const parent=(i-1)>>1;if(heapF[parent]<=f)break;heapNodes[i]=heapNodes[parent];heapF[i]=heapF[parent];i=parent}heapNodes[i]=node;heapF[i]=f};
    const pop=()=>{const node=heapNodes[0],lastNode=heapNodes.pop(),lastScore=heapF.pop();if(heapNodes.length){let i=0;while(true){let child=i*2+1;if(child>=heapNodes.length)break;if(child+1<heapNodes.length&&heapF[child+1]<heapF[child])child++;if(heapF[child]>=lastScore)break;heapNodes[i]=heapNodes[child];heapF[i]=heapF[child];i=child}heapNodes[i]=lastNode;heapF[i]=lastScore}return node};
    const prefersRoad=Math.abs(target.y-sprite.y)>650&&Math.max(target.y,sprite.y)>3904&&
      Math.min(target.y,sprite.y)<5184&&Math.min(target.x,sprite.x)>2100&&Math.max(target.x,sprite.x)<4900;
    const cost=(x,y)=>{
      if(!prefersRoad||y<230||y>327)return 10;
      const row=Math.floor(y/2),col=Math.floor(x/2);
      return this.oldRoadLayer?.layer.data[row]?.[col]?.index>=0||this.roadLayer?.data[row]?.[col]?.index>=0?10:30;
    };
    previous[start]=start;gScore[start]=0;visited[start]=search;push(start,10*heuristic(start));let expanded=0;
    const limit=avoidCrowd?Math.min(Math.max(650,heuristic(start)*22),4600,total):total;
    while(heapNodes.length&&closed[goal]!==search&&expanded<limit){const node=pop();if(closed[node]===search)continue;closed[node]=search;expanded++;if(node===goal)break;const x=node%cols,y=Math.floor(node/cols);for(const[dx,dy]of CARDINAL_STEPS){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=cols||ny>=rows)continue;const next=key(nx,ny);if(this.navBlocked[next]||closed[next]===search||!nearOpen(next))continue;const score=gScore[node]+cost(nx,ny);if(visited[next]===search&&score>=gScore[next])continue;visited[next]=search;gScore[next]=score;previous[next]=node;push(next,score+10*heuristic(next))}}
    let points=[];if(visited[goal]===search){const cells=[];for(let at=goal;;at=previous[at]){cells.push(center(at));if(at===start)break}cells.reverse();points=[cells[0]];for(let i=1;i<cells.length-1;i++){const a=cells[i-1],b=cells[i],c=cells[i+1];if(Math.sign(b.x-a.x)!==Math.sign(c.x-b.x)||Math.sign(b.y-a.y)!==Math.sign(c.y-b.y))points.push(b)}if(cells.length>1)points.push(cells.at(-1));if(points.length>1&&avoidCrowd){const body=this.groundOccupancy.bodies.get(npc.id);
      if(!nearOpen(start)||body&&this.groundOccupancy.clearSegment(body,sprite,points[1]))points.shift();}}else{
      if(entry){entry.retryAt=this.scheduler.time+(avoidCrowd?620:2100);entry.routeFailure=avoidCrowd?'crowd':'unreachable';
        if(avoidCrowd)entry.allowStaticRoute=true;}
      npc.pathBlocked=true;return null;
    }
    if(entry){entry.routeFailure=null;entry.allowStaticRoute=false;}
    this.npcRoutes.set(npc.id,{target:{...target},points});npc.routeIndex=0;npc.pathBlocked=false;return points
  }
  canOccupy(x,y){this.collisionChecks++;const cell=this.navCell,cols=this.navCols,rows=this.navRows;for(const [dx,dy]of FOOTPRINT){const gx=Math.floor((x+dx+this.westOffsetX)/cell),gy=Math.floor((y+dy)/cell);if(gx<0||gy<0||gx>=cols||gy>=rows||this.navBlocked[gy*cols+gx])return false}return true}
  syncGroundOccupancy(){
    const rig=this.characterRigPreview;
    const parked=[...(this.skyStep?.pads.values()??[])];
    if(rig&&(rig.mount.state==='parked'||rig.mount.state==='entering')){
      const mount=this.parkedMount??={id:'parked-tiger',species:'tiger',alive:true,fixed:true};
      mount.x=rig.mount.x;mount.y=rig.mount.y;parked.push(mount);
    }
    const npcs=this.flyingSword?.active.size||this.skyStep?.active.size?
      this.populationWorld.npcs.filter(n=>(!n.flight||n.flight.altitude<4)&&n.skyStep?.phase!=='travel'):this.populationWorld.npcs;
    this.groundOccupancy.sync(npcs,this.populationWorld.environment.fauna??[],rig?.mount.attached?rig.npc.id:null,parked,this.cultivation?.isSeated);
  }
  footprintTerrainOpen(x,y,hw,hh,fauna=false){
    const gx0=Math.floor((x-hw+this.westOffsetX)/this.navCell),gx1=Math.floor((x+hw-.001+this.westOffsetX)/this.navCell);
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
      if(this.faunaWaterLayer?.data[Math.floor(y/32)]?.[Math.floor((x+this.westOffsetX)/32)]?.index>=0&&!(this.roadLayer?.data[Math.floor(y/32)]?.[Math.floor((x+this.westOffsetX)/32)]?.index>=0))return false;
    }
    return true;
  }
  clearCombatLine(a,b){
    if((a.wallLevel??0)!==(b.wallLevel??0))return false;
    if(!a.wallLevel)return this.clearFaunaLine(a,b);
    const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/8));
    for(let i=0;i<=steps;i++){
      const t=i/steps;
      if(!this.ramparts.open(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,0,0))return false;
    }
    return true;
  }
  groundPositionOpen(actor,x,y,mounted=false,ignoreId){
    const footprint=groundFootprint(actor,mounted);
    return this.groundOccupancy?this.groundOccupancy.open({id:actor.id,ignoreId,floor:actor.wallLevel??0,...footprint},x,y):
      this.footprintTerrainOpen(x,y,footprint.width/2,footprint.height/2,Boolean(actor.species));
  }
  moveOnGround(actor,sprite,x,y,allowAvoid=true){
    const body=this.groundOccupancy?.bodies.get(actor.id);
    if(!body)return null;
    if(body.x!==sprite.x||body.y!==sprite.y)this.groundOccupancy.place(body,sprite.x,sprite.y);
    const stair=this.scheduler?.byId.get(actor.id)?.rampartStair;
    const canChangeFloor=!body.mounted&&(stair||actor.id===this.possessedNpcId);
    const canSlide=allowAvoid&&!(actor.wallLevel&&actor.id===this.possessedNpcId);
    const started=performance.now(),move=this.groundOccupancy.advance(body,x,y,canSlide,undefined,
      canChangeFloor?(body,px,py)=>this.ramparts.transition(body,px,py,stair):undefined);
    if(move&&(actor.wallLevel??0)!==body.floor){
      if(body.floor)actor.wallLevel=1;else delete actor.wallLevel;
      this.requestBackgroundSave();
    }
    this.groundCollisionMs=(this.groundCollisionMs??0)+performance.now()-started;
    return move;
  }
  canOccupyOrSlide(x,y,sprite){const moved=(px,py)=>Math.hypot(px-sprite.x,py-sprite.y)>.05;if(moved(x,y)&&this.canOccupy(x,y))return{x,y};if(moved(x,sprite.y)&&this.canOccupy(x,sprite.y))return{x,y:sprite.y};if(moved(sprite.x,y)&&this.canOccupy(sprite.x,y))return{x:sprite.x,y};const dx=x-sprite.x,dy=y-sprite.y,distances=[4,8,12,16,24,32],sideSteps=[];for(const step of distances){if(Math.abs(dx)>Math.abs(dy))sideSteps.push({x:sprite.x,y:sprite.y-step},{x:sprite.x,y:sprite.y+step});else sideSteps.push({x:sprite.x-step,y:sprite.y},{x:sprite.x+step,y:sprite.y})}const side=sideSteps.filter(point=>moved(point.x,point.y)&&this.canOccupy(point.x,point.y));return side.sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0]??null}
  buildNavigationComponents(){const total=this.navCols*this.navRows;this.navComponents=new Int32Array(total);this.navComponentSizes=[0];const queue=new Int32Array(total);let component=0;for(let start=0;start<total;start++){if(this.navBlocked[start]||this.navComponents[start])continue;component++;let head=0,tail=0;queue[tail++]=start;this.navComponents[start]=component;while(head<tail){const cur=queue[head++],x=cur%this.navCols,y=Math.floor(cur/this.navCols);for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=this.navCols||ny>=this.navRows)continue;const k=ny*this.navCols+nx;if(this.navBlocked[k]||this.navComponents[k])continue;this.navComponents[k]=component;queue[tail++]=k}}this.navComponentSizes[component]=tail}}
  navComponentAt(point){const gx=Math.floor((point.x+this.westOffsetX)/this.navCell),gy=Math.floor(point.y/this.navCell);if(gx<0||gy<0||gx>=this.navCols||gy>=this.navRows)return 0;const key=(x,y)=>y*this.navCols+x;if(!this.navBlocked[gy*this.navCols+gx])return this.navComponents[key(gx,gy)];for(let r=1;r<=4;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const x=gx+dx,y=gy+dy;if(x>=0&&y>=0&&x<this.navCols&&y<this.navRows&&!this.navBlocked[key(x,y)])return this.navComponents[key(x,y)]}return 0}
  canReachPoint(a,b){const x=this.navComponentAt(a),y=this.navComponentAt(b);return x>0&&x===y}
  bindCameraControls(){
    const canvas=this.game.canvas;canvas.style.touchAction='none';this.cameraInputAbort=new AbortController();const signal=this.cameraInputAbort.signal;canvas.addEventListener('contextmenu',event=>event.preventDefault(),{signal});
    canvas.addEventListener('pointerdown',event=>{
      if(!this.skyAim||event.button!==0)return;
      event.preventDefault();event.stopImmediatePropagation();
      this.pickSkyTarget(event,true);
    },{capture:true,signal});
    canvas.addEventListener('pointermove',event=>{if(this.skyAim)this.pickSkyTarget(event,false);},{signal});
    canvas.addEventListener('pointerdown',event=>{if(event.target!==canvas||![0,1].includes(event.button))return;this.dragState={pointerId:event.pointerId,button:event.button,x:event.clientX,y:event.clientY,scrollX:this.cameras.main.scrollX,scrollY:this.cameras.main.scrollY,moved:false};try{canvas.setPointerCapture(event.pointerId)}catch{}},{capture:true,signal});
    canvas.addEventListener('pointermove',event=>{const drag=this.dragState;if(!drag||drag.pointerId!==event.pointerId)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(!drag.moved&&Math.hypot(dx,dy)<4)return;if(Math.hypot(dx,dy)>=4)drag.moved=true;if(drag.moved){event.preventDefault();this.cameras.main.setScroll(drag.scrollX-dx/this.cameras.main.zoom,drag.scrollY-dy/this.cameras.main.zoom);this.clampCamera()}},{signal});
    const finish=event=>{if(!this.dragState||this.dragState.pointerId!==event.pointerId)return;if(this.dragState.moved)this.lastWorldDragAt=performance.now();this.dragState=null;this.clampCamera()};canvas.addEventListener('pointerup',finish,{signal});canvas.addEventListener('pointercancel',finish,{signal});canvas.addEventListener('lostpointercapture',finish,{signal});
    this.input.on('wheel',(pointer,_objects,_dx,dy)=>this.setZoom(this.cameras.main.zoom*(dy>0?.9:1.11),pointer.x,pointer.y));
    this.input.keyboard?.on('keydown-C',()=>this.setCollisionVisible(!this.collisionVisible));
    document.getElementById('toggle-meditation-debug')?.addEventListener('click',()=>{
      this.cultivation.debug=!this.cultivation.debug;
      this.worldPopulationToast(this.cultivation.debug?'Debug đả tọa · hồng: đầu · vàng: cổ · lam: thân · xanh: footprint':'Đã tắt debug đả tọa');
    });
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
    if(!TRIBULATION_ARENA)this.updatePopulation(time,delta);
    this.simulationMs=performance.now()-simulationStarted;
    const animationStarted=performance.now();
    if(this.characterRigPreview){
      const {npc}=this.characterRigPreview;
      this.characterRigPreview.sync(Math.min(delta,60),weaponForNpc(npc),rodEquipped(npc));
    }
    this.npcAppearanceFleet?.update(time,Math.min(delta,60));
    this.cultivation?.draw(time);
    this.skyStepVisuals.update(this.skyStep.active,time);
    this.nameplates?.update(time);this.sectCampus.update();this.syncNPCModularVisuals();this.syncWeaponVisuals();this.flightVisuals.update(this.flyingSword);
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
    this.westWilds?.update(time);
    this.daylight?.update(time);
    this.cityScenery.update(time,daylightAt(this.populationWorld.clock.minute+(this.populationTick??0)/1000).lamps);
    this.cityFxMs=performance.now()-cityFxStarted;
    this.monsterVisuals.update(this.populationWorld.environment,this.populationWorld.environment.faunaClockMs);
    this.monsterDebug?.update(time);this.updateFlightArena(time);
    this.terrainCache?.update(this.cameras.main);
    const uiStarted=performance.now();
    this.minimap?.update();this.merchantPanel?.update(time);if(time>=(this.nextWorldHudAt??0)){this.nextWorldHudAt=time+150;this.refreshHud()}
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
  gotoRegion(id,refresh=true){
    const marker=this.markers.find(m=>m.id===id),region=this.markerRegion(id);
    const point=(id==='old-road'||id.startsWith('west-')?marker:region)??marker??REGION_CENTERS[id];
    if(!point)return false;
    const zoom=id==='city'?.55:id==='east'?.72:id==='north'?.78:.78;
    this.navigateCameraTo(point.x,point.y,'region',false,zoom);
    if(refresh)this.refreshHud();
    return true;
  }
  navigateCameraTo(x,y,source='minimap',dragging=false,requestedZoom=null){const camera=this.cameras.main;if(this.cameraTween){this.cameraTween.stop();this.cameraTween=null}if(this.possessedNpcId){this.cameraFollowSuspended=source!=='return';camera.stopFollow()}let zoom=requestedZoom??camera.zoom;if(zoom<.31){zoom=this.lastExploreZoom??.78}if(zoom>.32)this.lastExploreZoom=zoom;if(Math.abs(camera.zoom-zoom)>.001)this.setZoom(zoom);const scrollX=x-camera.width/2,scrollY=y-camera.height/2;if(dragging){camera.setScroll(scrollX,scrollY);this.clampCamera()}else this.cameraTween=this.tweens.add({targets:camera,scrollX,scrollY,duration:360,ease:'Cubic.easeOut',onUpdate:()=>this.clampCamera(),onComplete:()=>{this.cameraTween=null;this.clampCamera()}});this.refreshFaunaVisibility();this.minimap?.update(true);this.refreshHud();return{x:scrollX,y:scrollY,zoom}}
  showWorldOverview(){const width=this.worldWidth??this.map.widthInPixels,height=this.worldHeight??this.map.heightInPixels,fit=Math.min(this.scale.width/width,this.scale.height/height)*.98;if(this.possessedNpcId)this.cameraFollowSuspended=true;this.cameras.main.setZoom(fit).centerOn(this.worldMinX+width/2,height/2);this.clampCamera();this.minimap?.update(true);this.refreshHud();return fit}
  setZoom(zoom,x=this.scale.width/2,y=this.scale.height/2){const camera=this.cameras.main,target=Phaser.Math.Clamp(zoom,.18,1.8),before=camera.getWorldPoint(x,y);camera.setZoom(target);const after=camera.getWorldPoint(x,y);camera.scrollX+=before.x-after.x;camera.scrollY+=before.y-after.y;this.clampCamera();if(target>.32)this.lastExploreZoom=target;this.refreshFaunaVisibility();this.minimap?.update(true);this.refreshHud();return target}
  clampCamera(){
    if(!this.cameras?.main)return;
    const camera=this.cameras.main,width=this.worldWidth??this.map.widthInPixels;
    const height=this.worldHeight??this.map.heightInPixels;
    const viewWidth=camera.width/camera.zoom,viewHeight=camera.height/camera.zoom;
    const maxX=width-viewWidth,maxY=height-viewHeight;
    camera.useBounds=maxX>=0&&maxY>=0;
    // In the director view, allow the zoomed viewport to reach the world edge,
    // including when the trial is in the southernmost part of the map.
    const offsetX=(viewWidth-camera.width)*camera.originX;
    const offsetY=(viewHeight-camera.height)*camera.originY;
    const minX=this.worldMinX+(maxX<0?maxX/2:0),hiX=maxX<0?minX:this.worldMinX+maxX,minY=maxY<0?maxY/2:0,hiY=maxY<0?minY:maxY;
    camera.scrollX=Phaser.Math.Clamp(camera.scrollX,minX+offsetX,hiX+offsetX);
    camera.scrollY=Phaser.Math.Clamp(camera.scrollY,minY+offsetY,hiY+offsetY);
  }
  setCollisionVisible(visible){this.collisionVisible=Boolean(visible);this.collisionGraphics.setVisible(this.collisionVisible);this.groundDebugGraphics.setVisible(this.collisionVisible);document.getElementById('world-collision')?.classList.toggle('active',this.collisionVisible);this.refreshHud()}
  getMonsterMovement(){
    return this.monsterMovement.diagnostics(this.populationWorld.environment.fauna,this.populationWorld.population.spawnSeed);
  }
  initMonsterMovementDebug(){
    this.monsterDebug=new MonsterMovementDebug(this);
  }
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
  findNavigationPath(a,b){const start=this.markers.find(m=>m.id===a),goal=this.markers.find(m=>m.id===b);if(!start||!goal)return null;const cell=this.navCell,cols=this.navCols,rows=this.navRows,toGrid=p=>({x:Math.floor(p.x/cell),y:Math.floor(p.y/cell)}),s=toGrid(start),t=toGrid(goal),key=(x,y)=>y*cols+x,startKey=key(s.x,s.y),goalKey=key(t.x,t.y),prev=new Int32Array(cols*rows).fill(-1),queue=[startKey];prev[startKey]=startKey;for(let i=0;i<queue.length&&prev[goalKey]===-1;i++){const current=queue[i],x=current%cols,y=Math.floor(current/cols);for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=key(nx,ny);if(nx<0||ny<0||nx>=cols||ny>=rows||prev[k]!==-1||this.navBlocked[k])continue;prev[k]=current;queue.push(k)}}if(prev[goalKey]===-1)return null;const cells=[];for(let k=goalKey;;k=prev[k]){cells.push({x:(k%cols+.5)*cell+this.worldMinX,y:(Math.floor(k/cols)+.5)*cell});if(k===startKey)break}cells.reverse();const compact=[cells[0]];for(let i=1;i<cells.length-1;i++){const p=cells[i-1],q=cells[i],r=cells[i+1];if(Math.sign(q.x-p.x)!==Math.sign(r.x-q.x)||Math.sign(q.y-p.y)!==Math.sign(r.y-q.y))compact.push(q)}if(cells.length>1)compact.push(cells.at(-1));return compact}
  canNavigate(a,b){return this.findNavigationPath(a,b)!==null}
  gotoMarker(id,zoom=.95){const marker=this.markers.find(m=>m.id===id);if(!marker)return false;this.cameras.main.setZoom(zoom).centerOn(marker.x,marker.y);this.clampCamera();return true}
  async walkDebugPath(a,b){const points=this.findNavigationPath(a,b);if(!points)return{from:a,to:b,reached:false,reason:'blocked'};if(!this.debugSolids){this.debugSolids=this.physics.add.staticGroup();for(const r of this.collisionRects){const solid=this.add.rectangle(r.x+r.width/2,r.y+r.height/2,r.width,r.height,0,0).setVisible(false);this.physics.add.existing(solid,true);this.debugSolids.add(solid)}}const first=points[0],actor=this.add.ellipse(first.x,first.y,14,18,0xffd979,.95).setStrokeStyle(2,0x4c3527).setDepth(first.y+1000);actor.setName('temporary-gate-debug-actor');this.physics.add.existing(actor);actor.body.setSize(12,12);actor.body.setCollideWorldBounds(true);const collider=this.physics.add.collider(actor,this.debugSolids);let reached=true,stalledAt=null,stalledTarget=null;try{for(let i=1;i<points.length;i++){const target=points[i],dx=target.x-actor.x,dy=target.y-actor.y,distance=Math.hypot(dx,dy);if(distance<2)continue;actor.body.setVelocity(dx/distance*90,dy/distance*90);const start=this.time.now;let best=Math.hypot(target.x-actor.x,target.y-actor.y);while(best>8&&this.time.now-start<Math.max(1600,distance/90*1000+800)){await new Promise(resolve=>this.time.delayedCall(16,resolve));const current=Math.hypot(target.x-actor.x,target.y-actor.y);if(current<best)best=current;else if(current>best+3)break}actor.body.setVelocity(0,0);if(best>12){reached=false;stalledAt={x:actor.x,y:actor.y};stalledTarget=target;break}}}finally{this.physics.world.removeCollider(collider);actor.destroy()}return{from:a,to:b,reached,waypoints:points.length,...(!reached?{stalledAt,stalledTarget}: {})}}
  getState(){const anchorCount=this.map.getObjectLayer('PopulationAnchors')?.objects.length??0,zones=this.map.getObjectLayer('EncounterZones')?.objects??[],cityBuildings=this.map.getObjectLayer('Buildings')?.objects??[],stalls=this.map.getObjectLayer('MarketDecor')?.objects??[],interactions=this.map.getObjectLayer('InteractionMarkers')?.objects??[];return{mapUrl:MAP_URL,widthTiles:this.map.width,heightTiles:this.map.height,tileWidth:this.map.tileWidth,tileHeight:this.map.tileHeight,worldWidth:this.map.widthInPixels,worldHeight:this.map.heightInPixels,regions:Object.keys(REGION_TITLES).map(id=>({id,title:REGION_TITLES[id]})),npcCount:this.populationWorld?.npcs?.length??0,futurePopulation:108,activeNPCCount:this.populationWorld?.npcs?.filter(n=>n.alive).length??0,populationAnchorCount:anchorCount,activeMonsterSpawns:zones.reduce((n,z)=>n+Number(this.prop(z,'spawnCount')??0),0),encounterZones:zones.map(z=>({name:z.name,tier:this.prop(z,'dangerTier'),realmIndexMin:this.prop(z,'realmIndexMin'),realmIndexMax:this.prop(z,'realmIndexMax'),enabled:this.prop(z,'enemySpawnEnabled')})),objectCount:this.objectSprites.length,cityBuildings:cityBuildings.map(o=>({name:o.name,gid:o.gid,display:[o.width,o.height]})),marketStalls:stalls.map(o=>({name:o.name,stallId:this.prop(o,'stallId'),gid:o.gid,display:[o.width,o.height]})),interactionMarkers:interactions.map(o=>({name:o.name,id:this.prop(o,'markerId'),kind:this.prop(o,'kind'),active:this.prop(o,'active')})),population:this.getPopulationState(),windTreeCount:this.windSprites.length,windKinds:[...new Set(this.windSprites.map(s=>s.getData('windKind')))],windFrames:this.windSprites.map(s=>({kind:s.getData('windKind'),frame:s.frame.name,x:s.x,y:s.y,phase:s.getData('windPhase')})),flowEffectCount:this.flowSprites.length,waterFrames:this.flowSprites.map(s=>s.frame.name),tilesets:this.map.tilesets.map(s=>s.name),layers:this.map.layers.map(l=>({name:l.name,tileCount:l.data?.flat()?.filter(t=>t.index>=0).length??0,visible:l.visible})),sprites:this.objectSprites.slice(0,6).map(s=>({name:s.name,texture:s.texture.key,frame:s.frame.name,x:s.x,y:s.y,display:[s.displayWidth,s.displayHeight]})),directionalGateSprites:this.objectSprites.filter(s=>s.texture.key==='rebuild-directional-gates').map(s=>({name:s.name,frame:s.frame.name,rotation:s.rotation,display:[s.displayWidth,s.displayHeight]})),camera:{width:this.cameras.main.width,height:this.cameras.main.height,zoom:this.cameras.main.zoom,x:this.cameras.main.scrollX,y:this.cameras.main.scrollY},zoom:this.cameras.main.zoom,scrollX:this.cameras.main.scrollX,scrollY:this.cameras.main.scrollY,collisionCount:this.collisionRects.length,collisionVisible:this.collisionVisible,markers:this.markers.map(m=>m.id)}}
  regionAtCamera(){
    const view=this.cameras.main.worldView,npc=!this.cameraFollowSuspended&&this.scheduler?.byId.get(this.possessedNpcId)?.npc;
    const x=npc?.x??view.centerX,y=npc?.y??view.centerY;
    this.regionsByArea??=[...(this.map.getObjectLayer('RegionMarkers')?.objects??[])].sort((a,b)=>a.width*a.height-b.width*b.height);
    const box=this.regionsByArea.find(o=>x>=o.x&&x<=o.x+o.width&&y>=o.y&&y<=o.y+o.height);
    const id=this.prop(box??{},'regionId');
    const key=({'north-mountain':'north','east-pasture':'east','south-suburb':'south'})[id]??id;
    const west=this.westWilds?.regionAt(npc?.x??view.centerX);
    return west?`${west.name} · ${west.danger} · ${west.realm}`:REGION_TITLES[key]??'Thế giới Thanh Vân Ký';
  }
  getMinimapState(){const camera=this.cameras.main,view=camera.worldView;return{world:{width:this.map.widthInPixels,height:this.map.heightInPixels},zoom:camera.zoom,worldView:{x:view.x,y:view.y,width:view.width,height:view.height},viewport:this.minimap?.transform.cameraRect(camera)??null,followActor:this.possessedNpcId?{id:this.possessedNpcId,suspended:this.cameraFollowSuspended}:null,markers:(this.map.getObjectLayer('RegionMarkers')?.objects??[]).map(o=>({name:o.name,id:this.prop(o,'regionId'),x:o.x,y:o.y,width:o.width,height:o.height}))}}
  refreshHud(){this.refreshHeavenWallet?.();const region=this.regionAtCamera(),label=document.getElementById('world-area-title'),title=this.possessedNpcId?'Thiên Đạo nhập thân · '+(this.populationWorld.npcs.find(n=>n.id===this.possessedNpcId)?.name??'')+(this.westWilds?.regionAt(this.scheduler.byId.get(this.possessedNpcId)?.npc.x)?' · '+region:''):region;if(label&&label.textContent!==title)label.textContent=title;const now=this.time?.now??performance.now();if(this.nextHudPopulationAt===undefined||now>=this.nextHudPopulationAt){this.hudAliveCount=this.populationWorld?.npcs?.filter(n=>n.alive).length??0;this.nextHudPopulationAt=now+250}const active=this.hudAliveCount??0,sub=document.getElementById('world-camera-status'),status=this.possessedNpcId?(this.cameraFollowSuspended?`Đang xem xa · WASD trở về NPC · cư dân: ${active}/108`:`Theo NPC · WASD di chuyển · J đánh · E nhặt · Esc rời · cư dân: ${active}/108`):`Zoom ${this.cameras.main.zoom.toFixed(2)}× · cư dân: ${active}/108`;if(sub&&sub.textContent!==status)sub.textContent=status;this.refreshPossessionHud()}
  refreshPossessionHud(){this.renderPossessionHud();}
}

export function createRebuildGame(){
  return new Phaser.Game({type:Phaser.AUTO,parent:'world-game',width:window.innerWidth,height:window.innerHeight,backgroundColor:'#203b2d',pixelArt:true,roundPixels:true,antialias:false,scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH},render:{pixelArt:true,roundPixels:true,antialias:false},physics:{default:'arcade',arcade:{debug:false}},scene:[RebuildWorldScene]});
}

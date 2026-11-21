import Phaser from 'phaser';
import { GridNavigator } from '../dao/GridNavigator';

type WaterKind='river_south'|'river_east'|'stream_south'|'rock_foam'|'lake_ripple';
type Motion={start:number;length:number;defaultPeriod:number};
const MOTION:Record<WaterKind,Motion>={
  river_south:{start:0,length:8,defaultPeriod:150},
  river_east:{start:8,length:8,defaultPeriod:145},
  stream_south:{start:16,length:8,defaultPeriod:190},
  rock_foam:{start:24,length:8,defaultPeriod:145},
  lake_ripple:{start:32,length:8,defaultPeriod:220},
};
const getProperty=(obj:any,key:string)=>Array.isArray(obj.properties)?obj.properties.find((p:any)=>p.name===key)?.value:obj.properties?.[key]?.value??obj.properties?.[key];

class WaterTrialScene extends Phaser.Scene{
  private map!:Phaser.Tilemaps.Tilemap;
  private effects:{sprite:Phaser.GameObjects.Sprite;kind:WaterKind;phase:number;period:number;lastFrame:number}[]=[];
  private navigator?:GridNavigator;
  constructor(){super('gfx5b5-water-trial')}
  preload(){
    this.load.tilemapTiledJSON('water-trial','/maps/QingyunWaterTrial.tmj');
    this.load.image('water-terrain','/assets/tilesets/gfx5b5_area_terrain.png');
    this.load.image('water-tiles','/assets/tilesets/gfx5b5_water_tiles.png');
    this.load.spritesheet('water-motion','/assets/effects/gfx5b5_water_motion.png',{frameWidth:64,frameHeight:64});
    this.load.spritesheet('water-props','/assets/props/gfx5b5_area_props.png',{frameWidth:128,frameHeight:128});
    this.load.on('loaderror',(file:Phaser.Loader.File)=>{document.documentElement.dataset.waterLoadError=`${file.key}: ${file.src}`});
  }
  create(){
    this.map=this.make.tilemap({key:'water-trial'});
    const terrain=this.map.addTilesetImage('GFX5B5AreaTerrain','water-terrain',32,32,0,0);
    const water=this.map.addTilesetImage('GFX5B5WaterTiles','water-tiles',32,32,0,0);
    if(!terrain||!water)throw new Error('Thiếu tileset WATER-A');
    const tileSets=[terrain,water];
    for(const [name,depth] of [['Ground',0],['Water',2],['Shore',4],['Details',6]] as const)this.map.createLayer(name,tileSets,0,0)?.setDepth(depth);
    const collisions=this.map.getObjectLayer('Collision')?.objects??[];
    this.navigator=new GridNavigator(this.map.widthInPixels,this.map.heightInPixels,collisions.map(o=>({id:o.id,x:o.x??0,y:o.y??0,width:o.width??0,height:o.height??0})));
    for(const object of this.map.getObjectLayer('Decor')?.objects??[]){
      if(getProperty(object,'frame')==='wooden_bridge')this.add.image(object.x??0,object.y??0,'water-props',Number(getProperty(object,'frameIndex')??0)).setDisplaySize(object.width??128,object.height??128).setDepth((object.y??0)+18);
    }
    const flowObjects=this.map.getObjectLayer('FlowEffects')?.objects??[];
    for(const object of flowObjects){
      const kind=getProperty(object,'kind') as WaterKind|undefined;const motion=kind?MOTION[kind]:undefined;if(!kind||!motion)continue;
      const phase=Number(getProperty(object,'phase')??0)%motion.length;const period=Number(getProperty(object,'period')??motion.defaultPeriod);
      const first=motion.start+((phase%motion.length)+motion.length)%motion.length;
      const sprite=this.add.sprite(object.x??0,object.y??0,'water-motion',first).setDepth((object.y??0)+12).setAlpha(kind==='lake_ripple'?.84:.95);
      this.effects.push({sprite,kind,phase,period,lastFrame:first});
    }
    this.cameras.main.setBounds(0,0,this.map.widthInPixels,this.map.heightInPixels).setScroll(0,0).roundPixels=true;
    const bridge=this.map.getObjectLayer('Decor')?.objects.find(o=>getProperty(o,'waterBridge')===true||getProperty(o,'waterBridge')==='true');
    const center=(bridge?.x??0), crossingY=(bridge?.y??0);
    const crossingRoute=this.navigator.path({x:center-112,y:crossingY},{x:center+112,y:crossingY});
    const kinds=Object.fromEntries(Object.keys(MOTION).map(key=>[key,this.effects.filter(e=>e.kind===key).length]));
    (window as any).__waterSnapshot=()=>({ready:this.sys.isActive(),mapSize:[this.map.width,this.map.height],tileSize:[this.map.tileWidth,this.map.tileHeight],layers:this.map.layers.map(l=>l.name),waterCells:this.map.getLayer('Water')?.data?.flat?.().filter((t:any)=>t?.index>=257).length??0,shoreCells:this.map.getLayer('Shore')?.data?.flat?.().filter((t:any)=>t?.index>=289).length??0,collisionObjects:collisions.length,effects:this.effects.length,effectsByKind:kinds,animationFrames:this.effects.map(e=>e.sprite.frame.name),bridgeRouteWaypoints:crossingRoute.length,bridge:!!bridge,fps:this.game.loop.actualFps});
    this.cameras.main.centerOn(768,512);
    document.documentElement.dataset.waterReady='true';
  }
  update(time:number){
    for(const effect of this.effects){
      const motion=MOTION[effect.kind];const tick=Math.floor(time/effect.period);const frame=motion.start+((tick+effect.phase)%motion.length);
      if(frame!==effect.lastFrame){effect.sprite.setFrame(frame);effect.lastFrame=frame}
    }
  }
}

window.addEventListener('error',event=>{document.documentElement.dataset.waterError=String(event.message||event.error||'runtime error')});
window.addEventListener('unhandledrejection',event=>{document.documentElement.dataset.waterRejection=String(event.reason)});
new Phaser.Game({type:Phaser.CANVAS,parent:'game',width:1536,height:1024,backgroundColor:'#263d31',pixelArt:true,roundPixels:true,antialias:false,transparent:false,scale:{mode:Phaser.Scale.NONE},scene:[WaterTrialScene]});

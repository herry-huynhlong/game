import Phaser from 'phaser';

type AreaId='city'|'wilderness'|'sect';
const area=(new URLSearchParams(location.search).get('area')||'city') as AreaId;
const maps:Record<AreaId,{file:string;title:string}>={
  city:{file:'QingyunCityV2.tmj',title:'Thanh Vân Thành'},
  wilderness:{file:'QingyunWildernessV2.tmj',title:'Vùng Hoang Dã'},
  sect:{file:'QingyunSectV2.tmj',title:'Thanh Vân Tông'},
};
const mapInfo=maps[area]??maps.city;
const property=(obj:any,key:string)=>Array.isArray(obj.properties)?obj.properties.find((p:any)=>p.name===key)?.value:obj.properties?.[key]?.value??obj.properties?.[key];

class AreaScene extends Phaser.Scene{
  private map!:Phaser.Tilemaps.Tilemap;
  constructor(){super('gfx5b5-area-preview')}
  preload(){
    this.load.on('loaderror',(file:Phaser.Loader.File)=>{document.documentElement.dataset.previewLoadError=file.key+': '+file.src});
    this.load.tilemapTiledJSON('area-map',`/maps/gfx5b5/${mapInfo.file}`);
    this.load.image('area-terrain','/assets/tilesets/gfx5b5_area_terrain.png');
    this.load.atlas('settlement-buildings','/assets/props/settlement_buildings.png','/assets/props/settlement_buildings.json');
    this.load.image('area-props','/assets/props/gfx5b5_area_props.png');
    this.load.spritesheet('ancient-tree-v2','/assets/props/ancient-tree-v2.png',{frameWidth:112,frameHeight:96});
    for(const [key,file] of [['character-civilian','civilian'],['character-merchant','merchant'],['character-guard','guard'],['character-sect','sect_cultivator']] as const)this.load.spritesheet(key,`/assets/characters/${file}.png`,{frameWidth:32,frameHeight:40});
    this.load.spritesheet('wolf','/assets/characters/wolf.png',{frameWidth:32,frameHeight:32});
    this.load.spritesheet('rabbit','/assets/characters/rabbit.png',{frameWidth:32,frameHeight:32});
  }
  create(){
    this.map=this.make.tilemap({key:'area-map'});
    const terrain=this.map.addTilesetImage('GFX5B5AreaTerrain','area-terrain',32,32,0,0);
    const buildings=this.map.addTilesetImage('QingyunSettlementAssets','settlement-buildings',192,192,0,0);
    const props=this.map.addTilesetImage('QingyunAreaProps','area-props',128,128,0,0);
    if(!terrain||!buildings||!props)throw new Error('Thiếu tileset cho bản xem trước GFX.5B.5');
    const tilesets=[terrain,buildings,props];
    for(const [name,depth] of [['Ground',0],['Shore',2],['Cliffs',4],['Paths',6],['Details',8]] as const){
      this.map.createLayer(name,tilesets,0,0)?.setDepth(depth);
    }
    const objects=this.map.getObjectLayer('Scenery')?.objects??[];
    for(const obj of objects){
      const frame=String(property(obj,'frame')??'');const atlas=String(property(obj,'atlas')??'settlement-buildings');
      const x=obj.x??0,y=obj.y??0,w=obj.width??128,h=obj.height??128;
      const display=property(obj,'dynamic')===true||property(obj,'dynamic')==='true'
        ?this.add.sprite(x+w/2,y+h/2,'ancient-tree-v2',0).setDisplaySize(w,h)
        :this.add.image(x+w/2,y+h/2,atlas,frame).setDisplaySize(w,h);
      display.setDepth(100+y+h);
    }
    for(const obj of this.map.getObjectLayer('Actors')?.objects??[]){
      const texture=String(property(obj,'texture')??'character-civilian');const y=obj.y??0;
      this.add.sprite(obj.x??0,y,texture,0).setOrigin(.5,1).setDepth(100+y+1);
    }
    this.cameras.main.setBounds(0,0,this.map.widthInPixels,this.map.heightInPixels).setScroll(0,0).roundPixels=true;
    (window as any).__areaPreviewSnapshot=()=>({area,title:mapInfo.title,mapSize:[this.map.width,this.map.height],tileSize:[this.map.tileWidth,this.map.tileHeight],layers:this.map.layers.map(l=>l.name),scenery:objects.length,actors:this.map.getObjectLayer('Actors')?.objects.length??0,collisions:this.map.getObjectLayer('Collision')?.objects.length??0,activities:this.map.getObjectLayer('ActivitySites')?.objects.length??0,missingTextures:this.textures.getTextureKeys().filter(k=>k.startsWith('__MISSING'))});
    document.documentElement.dataset.previewReady='true';document.documentElement.dataset.previewArea=area;
  }
}

window.addEventListener('error',event=>{document.documentElement.dataset.previewError=String(event.message||event.error||'runtime error')});
window.addEventListener('unhandledrejection',event=>{document.documentElement.dataset.previewRejection=String(event.reason)});
new Phaser.Game({type:Phaser.CANVAS,parent:'game',width:1536,height:1024,backgroundColor:'#263d31',pixelArt:true,roundPixels:true,antialias:false,transparent:false,scale:{mode:Phaser.Scale.NONE},scene:[AreaScene]});

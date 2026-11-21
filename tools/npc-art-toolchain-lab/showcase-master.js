import Phaser from '/node_modules/phaser/dist/phaser.esm.js';
const query=new URLSearchParams(location.search),app={zoom:Number(query.get('zoom'))||1,site:query.get('site')==='sect'?'sect':'city'};
const siteSelect=document.getElementById('site'),zoomSelect=document.getElementById('zoom'),status=document.querySelector('#status');
siteSelect.value=app.site;zoomSelect.value=String(app.zoom);
let scene;
siteSelect.addEventListener('change',e=>{app.site=e.target.value;scene?.scene.restart()});
zoomSelect.addEventListener('change',e=>{app.zoom=Number(e.target.value);scene?.setZoom()});
const prop=(o,k)=>Array.isArray(o.properties)?o.properties.find(p=>p.name===k)?.value:o.properties?.[k]?.value??o.properties?.[k];
const mapNames={city:{file:'QingyunCityV2.tmj',title:'Thanh Vân Thành · phố đá'},sect:{file:'QingyunSectV2.tmj',title:'Thanh Vân Tông · sân luyện'}};
class MasterShowcase extends Phaser.Scene{
 constructor(){super('master')}
 preload(){const meta=mapNames[app.site];this.load.tilemapTiledJSON('world',`/maps/gfx5b5/${meta.file}`);this.load.image('terrain','/assets/tilesets/gfx5b5_area_terrain.png');this.load.atlas('buildings','/assets/props/settlement_buildings.png','/assets/props/settlement_buildings.json');this.load.image('props','/assets/props/gfx5b5_area_props.png');this.load.spritesheet('ancient-tree','/assets/props/ancient-tree-v2.png',{frameWidth:112,frameHeight:96});this.load.spritesheet('v5','/tools/npc-art-toolchain-lab/output/c03-master-review-v5/C03-MASTER-StageA.png',{frameWidth:48,frameHeight:64});this.load.spritesheet('v6','/tools/npc-art-toolchain-lab/output/c03-master-v6/C03-MASTER-v6.png',{frameWidth:48,frameHeight:64});this.load.spritesheet('current','/assets/characters/npc-sect_m-01.png',{frameWidth:32,frameHeight:40});this.load.on('loaderror',f=>{status.textContent='Không tải được: '+f.key})}
 create(){scene=this;const map=this.make.tilemap({key:'world'});const terrain=map.addTilesetImage('GFX5B5AreaTerrain','terrain',32,32,0,0);const buildings=map.addTilesetImage('QingyunSettlementAssets','buildings',192,192,0,0);const props=map.addTilesetImage('QingyunAreaProps','props',128,128,0,0);if(!terrain||!buildings||!props){status.textContent='Thiếu tileset trong bản đồ';return}const tiles=[terrain,buildings,props];for(const [name,z]of [['Ground',0],['Shore',2],['Cliffs',4],['Paths',6],['Details',8]])map.createLayer(name,tiles,0,0)?.setDepth(z);
  for(const o of map.getObjectLayer('Scenery')?.objects??[]){const frame=String(prop(o,'frame')??''),dynamic=prop(o,'dynamic')===true||prop(o,'dynamic')==='true',x=o.x??0,y=o.y??0,w=o.width??128,h=o.height??128;const d=dynamic?this.add.sprite(x+w/2,y+h/2,'ancient-tree',0):this.add.image(x+w/2,y+h/2,'buildings',frame);d.setDisplaySize(w,h).setDepth(100+y+h)}
  const centerX=app.site==='sect'?700:740,centerY=app.site==='sect'?575:560;const poses=[['Nam',0],['Bắc',1],['Tây',2],['Đông',3]],xs=[centerX-180,centerX-60,centerX+60,centerX+180];
  // Paired v5/v6 rows at the same world scale on the real editable Tiled maps.
  for(let i=0;i<poses.length;i++){const [label,frame]=poses[i];for(const [key,y,row] of [['v5',centerY-58,'v5'],['v6',centerY+68,'v6']]){this.add.sprite(xs[i],y,key,frame).setOrigin(.5,1).setDepth(1000+y);this.add.text(xs[i],y+7,label,{fontSize:'12px',color:'#fff0cb',backgroundColor:'#253a32',padding:{x:3,y:2}}).setOrigin(.5,0).setDepth(1100+y)}}
  this.add.text(20,centerY-135,'v5 · đối chiếu',{fontSize:'13px',color:'#e8cf98',backgroundColor:'#253a32',padding:{x:4,y:2}}).setDepth(1300+centerY);
  this.add.text(20,centerY+8,'v6 · chỉnh sửa',{fontSize:'13px',color:'#e8cf98',backgroundColor:'#253a32',padding:{x:4,y:2}}).setDepth(1300+centerY);
  this.add.text(20,20,`C03-MASTER · ${mapNames[app.site].title} · v5 / v6 cùng tỷ lệ`,{fontSize:'20px',color:'#f5e7c0',backgroundColor:'#13231f',padding:{x:8,y:5}}).setScrollFactor(0).setDepth(3000);
  this.cameras.main.setBounds(0,0,map.widthInPixels,map.heightInPixels).setScroll(0,0).roundPixels=true;this.setZoom();status.textContent=`Tiled ${map.width}×${map.height} · Phaser · v5/v6 48×64 · không ghi vào save`;
 }
 setZoom(){if(!this.cameras?.main)return;this.cameras.main.setZoom(app.zoom);if(app.zoom===1)this.cameras.main.setScroll(0,0);else this.cameras.main.centerOn(app.site==='sect'?700:740,560)}
}
new Phaser.Game({type:Phaser.CANVAS,parent:'game',width:1536,height:1024,pixelArt:true,antialias:false,roundPixels:true,scene:[MasterShowcase],scale:{mode:Phaser.Scale.NONE}});

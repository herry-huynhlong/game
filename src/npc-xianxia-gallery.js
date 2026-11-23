import Phaser from 'phaser';
class Gallery extends Phaser.Scene {
 preload(){this.load.atlas('npc','/assets/npc/npc_spritesheet.png','/assets/npc/npc_atlas.json');this.load.json('metadata','/assets/npc/npc_metadata.json');}
 create(){this.zoom=2;this.draw();for(const b of document.querySelectorAll('[data-zoom]'))b.onclick=()=>{this.zoom=Number(b.dataset.zoom);this.draw();};window.__npcGallery={ready:true,frames:this.textures.get('npc').getFrameNames(),setZoom:z=>{this.zoom=z;this.draw();}};}
 draw(){this.children.removeAll(true);const z=this.zoom,cw=Math.max(220,90*z),ch=112*z+50;this.scale.resize(cw*4,ch*3);for(const b of document.querySelectorAll('[data-zoom]'))b.setAttribute('aria-pressed',String(Number(b.dataset.zoom)===z));for(const [i,row] of this.cache.json.get('metadata').characters.entries()){const x=(i%4)*cw+cw/2,y=Math.floor(i/4)*ch+112*z;this.add.image(x,y,'npc',`npc_${String(row.id).padStart(2,'0')}`).setOrigin(.5,1).setScale(z);this.add.text(x,y+10,row.name,{fontFamily:'Arial',fontSize:'16px',color:'#eadbb0'}).setOrigin(.5,0);}}
}
new Phaser.Game({type:Phaser.CANVAS,parent:'gallery',width:880,height:822,backgroundColor:'#122327',pixelArt:true,roundPixels:true,scene:Gallery,audio:{noAudio:true},fps:{target:30}});

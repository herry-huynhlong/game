import Phaser from 'phaser';

async function main(){
const registry=await fetch('/assets/npc-paperdoll-lab/presets/registry.json').then(r=>{if(!r.ok)throw new Error(`Registry HTTP ${r.status}`);return r.json()});
const byId=new Map(registry.presets.map(p=>[p.id,p]));
const ui={grid:document.getElementById('grid'),dir:document.getElementById('dir'),motion:document.getElementById('motion'),zoom:document.getElementById('zoom'),selected:document.getElementById('selected')};
ui.grid.style.cssText='height:min(67vh,690px);min-height:480px;background:#152820;border:1px solid #365548;border-radius:10px;overflow:hidden';
const state={direction:0,motion:0,zoom:2,frame:0,last:0,selected:'P01'};
class Presets extends Phaser.Scene{
  constructor(){super('presets')}
  preload(){for(const p of registry.presets)this.load.spritesheet(p.id,p.image,{frameWidth:32,frameHeight:40})}
  create(){
    const cols=6,cellW=210,cellH=160,offsetX=10,offsetY=10,g=this.add.graphics();g.fillStyle(0x314a3e,1).fillRect(0,0,1280,650);
    for(let i=0;i<24;i++){const p=registry.presets[i],col=i%cols,row=Math.floor(i/cols),x=offsetX+col*cellW,y=offsetY+row*cellH;g.fillStyle(0x192e27,1).fillRoundedRect(x,y,cellW-8,cellH-8,8);g.lineStyle(1,0x426352,.9).strokeRoundedRect(x,y,cellW-8,cellH-8,8);const s=this.add.sprite(x+(cellW-8)/2,y+67,p.id,0).setScale(state.zoom).setInteractive({useHandCursor:true});s.on('pointerdown',()=>{state.selected=p.id;this.updateInfo();this.drawActive()});this.add.text(x+8,y+126,`${p.id} · ${p.name}`,{fontFamily:'system-ui',fontSize:'12px',color:'#e8e1c5',wordWrap:{width:cellW-24}});this.add.text(x+8,y+145,`${p.components.outfitBase} · ${p.components.headBase} · ${p.components.hairBack}`,{fontFamily:'system-ui',fontSize:'9px',color:'#9db2a3'});s.setData('cell',i);this.add.rectangle(x+(cellW-8)/2,y+67,cellW-14,cellH-14).setStrokeStyle(0).setFillStyle(0,0).setInteractive({useHandCursor:true}).on('pointerdown',()=>{state.selected=p.id;this.updateInfo();this.drawActive()}).setDepth(10);this.sprites??=[];this.sprites.push(s)}
    this.outline=this.add.graphics().setDepth(11);this.drawActive();this.updateInfo();
  }
  updateInfo(){const p=byId.get(state.selected);ui.selected.textContent=`${p.id} ${p.name} · ${p.role} · ${p.components.outfitBase} / ${p.components.headBase} / ${p.components.hairBack}`}
  drawActive(){if(!this.outline)return;this.outline.clear();const i=registry.presets.findIndex(p=>p.id===state.selected),x=10+(i%6)*210,y=10+Math.floor(i/6)*160;this.outline.lineStyle(3,0xe2bd71,1).strokeRoundedRect(x,y,202,152,8)}
  update(time){if(time-state.last<(state.motion?140:240))return;state.last=time;state.frame=(state.frame+1)%4;const start=(state.motion?16:0)+state.direction*4+state.frame;for(const s of this.sprites??[])s.setFrame(start).setScale(state.zoom)}
}
const game=new Phaser.Game({type:Phaser.CANVAS,parent:ui.grid,width:1280,height:650,backgroundColor:'#314a3e',pixelArt:true,roundPixels:true,antialias:false,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[Presets]});
ui.dir.addEventListener('change',()=>state.direction=Number(ui.dir.value));ui.motion.addEventListener('change',()=>state.motion=Number(ui.motion.value));ui.zoom.addEventListener('change',()=>state.zoom=Number(ui.zoom.value));
}
main().catch(error=>{console.error(error);ui.grid.textContent=`Không tải được preset: ${error.message}`});

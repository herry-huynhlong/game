import Phaser from 'phaser';

const ids=['C01','C02','C03','C04','C05'] as const;
const names=['Nông dân nam','Nông dân nữ','Nam tu sĩ','Nữ tu sĩ','Trưởng lão'];
const dirs=['down','down_right','right','up_right','up','up_left','left','down_left'] as const;
type Direction=typeof dirs[number];
type Action='idle'|'walk'|'sit_enter'|'cultivate'|'sit_exit'|'hit'|'death';
class Showcase extends Phaser.Scene {
  private figures:Phaser.GameObjects.Sprite[]=[];
  private labels:Phaser.GameObjects.Text[]=[];
  private direction:Direction='down';
  private action:Action='idle';
  constructor(){super('character-showcase')}
  preload(){const candidate=new URLSearchParams(location.search).get('gfx5b4c')==='1';for(const id of ids)this.load.spritesheet(id,`/assets/characters/${candidate?'gfx5b4c':'gfx5b4b'}/${id}-8dir.png`,{frameWidth:32,frameHeight:40})}
  create(){
    this.cameras.main.setZoom(1.15).centerOn(400,150);
    this.add.rectangle(400,150,800,300,0x38583f).setDepth(-2);
    this.add.rectangle(400,205,800,90,0x506b4c).setDepth(-1);
    for(const [i,id] of ids.entries()){
      for(const [j,dir] of dirs.entries())for(const action of ['idle','walk'] as const){
        const start=action==='idle'?j*4:32+j*6;const count=action==='idle'?4:6;
        this.anims.create({key:`${id}_${action}_${dir}`,frames:this.anims.generateFrameNumbers(id,{start,end:start+count-1}),frameRate:action==='idle'?(id==='C05'?1000/300:1000/240):1000/120,repeat:-1});
      }
      for(const [action,start,end,rate,repeat] of [['sit_enter',80,83,1000/140,0],['cultivate',84,87,1000/300,-1],['sit_exit',88,90,1000/140,0],['hit',91,93,10,0],['death',94,97,1000/160,0]] as const)this.anims.create({key:`${id}_${action}`,frames:this.anims.generateFrameNumbers(id,{start,end}),frameRate:rate,repeat});
      const x=165+i*118;const sprite=this.add.sprite(x,169,id).setOrigin(.5,1);this.figures.push(sprite);
      this.labels.push(this.add.text(x,193,names[i],{fontFamily:'sans-serif',fontSize:'12px',color:'#f2e7c8'}).setOrigin(.5));
    }
    this.refresh();
    document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(button=>button.addEventListener('click',()=>{this.action=button.dataset.action as Action;this.select('action',this.action);this.refresh()}));
    document.querySelectorAll<HTMLButtonElement>('[data-direction]').forEach(button=>button.addEventListener('click',()=>{this.direction=button.dataset.direction as Direction;this.select('direction',this.direction);this.refresh()}));
    document.querySelectorAll<HTMLButtonElement>('[data-zoom]').forEach(button=>button.addEventListener('click',()=>{const zoom=Number(button.dataset.zoom);this.cameras.main.setZoom(zoom).centerOn(400,150);const spacing=zoom>=2?78:118;this.figures.forEach((sprite,i)=>sprite.setX(400+(i-2)*spacing));this.labels.forEach((label,i)=>label.setX(400+(i-2)*spacing));this.select('zoom',String(zoom))}));
    (window as any).__gfx5b4bShowcase=()=>({direction:this.direction,action:this.action,sprites:this.figures.map(s=>({texture:s.texture.key,animation:s.anims.currentAnim?.key,frame:s.frame.name}))});
  }
  private select(kind:string,value:string){document.querySelectorAll<HTMLButtonElement>(`[data-${kind}]`).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset[kind]===value)))}
  private refresh(){this.figures.forEach((sprite,i)=>sprite.play(this.action==='idle'||this.action==='walk'?`${ids[i]}_${this.action}_${this.direction}`:`${ids[i]}_${this.action}`,true))}
}
new Phaser.Game({type:Phaser.AUTO,parent:'game',width:800,height:300,backgroundColor:'#263e2d',pixelArt:true,roundPixels:true,antialias:false,scene:[Showcase]});

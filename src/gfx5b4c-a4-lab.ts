import Phaser from 'phaser';
import {visualDirection,type VisualDirection} from './dao/VisualDirection';
const dirs=['down','down_right','right','up_right','up','up_left','left','down_left'] as const;
const route: {name:string;x:number;y:number}[]=[
 {name:'N',x:0,y:-1},{name:'NE',x:1,y:-1},{name:'E',x:1,y:0},{name:'SE',x:1,y:1},
 {name:'S',x:0,y:1},{name:'SW',x:-1,y:1},{name:'W',x:-1,y:0},{name:'NW',x:-1,y:-1},
 {name:'N',x:0,y:-1},{name:'E',x:1,y:0},{name:'SW',x:-1,y:1},{name:'NE',x:1,y:-1},
];
class Lab extends Phaser.Scene {
 private actor!:Phaser.Physics.Arcade.Sprite;
 private caption!:Phaser.GameObjects.Text;
 private index=0;private sx=250;private sy=200;private direction:VisualDirection='down';
 private holdRemaining=0;private holdingStarted=false;private finished=false;private elapsed=0;private nextSample=0;
 private trace:{time:number;segment:string;x:number;y:number;dx:number;dy:number;animation:string;frame:string|number;state:string}[]=[];
 constructor(){super('c03-a4-lab')}
 preload(){this.load.spritesheet('c03-a4','/assets/characters/gfx5b4c-a4/C03-a4.png',{frameWidth:32,frameHeight:40})}
 create(){
  this.add.rectangle(310,220,620,440,0x3d5d46);
  const g=this.add.graphics();g.lineStyle(1,0x607f62,0.5);for(let x=0;x<=620;x+=32)g.lineBetween(x,0,x,440);for(let y=0;y<=440;y+=32)g.lineBetween(0,y,620,y);
  dirs.forEach((dir,i)=>{this.anims.create({key:`idle_${dir}`,frames:this.anims.generateFrameNumbers('c03-a4',{start:i*4,end:i*4+3}),frameRate:1000/240,repeat:-1});this.anims.create({key:`walk_${dir}`,frames:this.anims.generateFrameNumbers('c03-a4',{start:32+i*6,end:37+i*6}),frameRate:1000/120,repeat:-1})});
  this.actor=this.physics.add.sprite(this.sx,this.sy,'c03-a4',0).setOrigin(.5,1).setDepth(10);
  const body=this.actor.body as Phaser.Physics.Arcade.Body;body.setSize(18,10).setOffset(7,28).setCollideWorldBounds(true);this.actor.play('idle_down');
  this.caption=this.add.text(8,8,'',{fontFamily:'sans-serif',fontSize:'13px',color:'#fff6d5',backgroundColor:'#253c2c',padding:{x:6,y:4}}).setDepth(50);
  (window as any).__gfxA4Lab=()=>({ready:true,finished:this.finished,index:this.index,route:route.map(x=>x.name),trace:this.trace});
 }
 update(_:number,delta:number){
  if(this.finished)return;
  this.elapsed+=delta;const body=this.actor.body as Phaser.Physics.Arcade.Body;
  const dx=body.deltaX(),dy=body.deltaY();this.direction=visualDirection(dx,dy,this.direction);
  const seg=route[this.index],length=Math.hypot(seg.x,seg.y),vx=seg.x/length,vy=seg.y/length;
  const projected=(this.actor.x-this.sx)*vx+(this.actor.y-this.sy)*vy;
  if(this.holdRemaining>0){
   body.setVelocity(0,0);this.holdRemaining=Math.max(0,this.holdRemaining-delta);this.actor.play(`idle_${this.direction}`,true);
  }else if(projected>=70){
   if(this.index===3&&!this.holdingStarted){this.holdingStarted=true;this.holdRemaining=1100;body.setVelocity(0,0);this.actor.play(`idle_${this.direction}`,true)}
   else {this.index++;this.sx=this.actor.x;this.sy=this.actor.y;if(this.index>=route.length){this.finished=true;body.setVelocity(0,0);this.actor.play(`idle_${this.direction}`,true);this.caption.setText('Hoàn thành lộ trình thử; kiểm tra log và video.');return}}
  }else{
   body.setVelocity(vx*42,vy*42);const key=`${Math.hypot(dx,dy)>=0.01?'walk':'idle'}_${this.direction}`,current=this.actor.anims.currentAnim?.key??'';
   const preserve=current!==key&&current.startsWith('walk_');const progress=preserve?this.actor.anims.getProgress():0;
   this.actor.play(key,true);if(preserve)this.actor.anims.setProgress(progress);
  }
  const current=this.actor.anims.currentAnim?.key??'';
  this.caption.setText(`Đoạn ${this.index+1}/${route.length}: ${route[this.index]?.name??''} · tốc độ 42 px/s · ${current}`);
  if(this.elapsed>=this.nextSample){this.nextSample=this.elapsed+100;this.trace.push({time:Math.round(this.elapsed),segment:seg.name,x:this.actor.x,y:this.actor.y,dx,dy,animation:current,frame:this.actor.frame.name,state:this.holdRemaining>0?'idle':'walk'})}
 }
}
new Phaser.Game({type:Phaser.AUTO,parent:'game',width:620,height:440,backgroundColor:'#30483b',pixelArt:true,roundPixels:true,antialias:false,physics:{default:'arcade',arcade:{debug:false}},scene:[Lab]});

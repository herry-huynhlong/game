import Phaser from 'phaser';
class Comparison extends Phaser.Scene {
 constructor(){super('comparison')}
 preload(){
  this.load.spritesheet('old','/assets/characters/gfx5b4b/C03-8dir.png',{frameWidth:32,frameHeight:40});
  this.load.spritesheet('a3','/assets/characters/gfx5b4c-a3/C03-a3.png',{frameWidth:32,frameHeight:40});
  this.load.spritesheet('study48','/assets/characters/gfx5b4c-a3/C03-study-B-four-poses.png',{frameWidth:48,frameHeight:64});
 }
 create(){
  const labels=['Truoc','Ngang','Cheo','Buoc cheo'];const normal=[0,8,4,38],study=[1,2,0,3];
  const keys=['old','a3','study48'];
  labels.forEach((label,i)=>this.add.text(90+i*190,7,label,{fontSize:'13px',color:'#eee5c7'}).setOrigin(.5,0));
  keys.forEach((key,row)=>{
   const y=145+row*130;this.add.text(7,y-60,['Cu 32','A3 32','Thu 48'][row],{fontSize:'12px',color:'#eee5c7'});
   for(let col=0;col<4;col++){
    const frame=row===2?study[col]:normal[col],x=70+col*190;
    this.add.sprite(x,y,key,frame).setOrigin(.5,1).setDisplaySize(row===2?30:32,40);
    this.add.sprite(x+68,y,key,frame).setOrigin(.5,1).setDisplaySize(row===2?90:96,120);
   }
  });
  (window as any).__gfx5b4cA3Comparison=()=>({ready:true,poses:labels,rows:keys});
 }
}
new Phaser.Game({type:Phaser.AUTO,parent:'game',width:800,height:425,backgroundColor:'#30483b',pixelArt:true,roundPixels:true,antialias:false,scene:[Comparison]});

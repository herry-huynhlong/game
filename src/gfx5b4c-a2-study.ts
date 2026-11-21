import Phaser from 'phaser';
class Study extends Phaser.Scene {
 constructor(){super('study')}
 preload(){
  this.load.spritesheet('old','/assets/characters/gfx5b4b/C03-8dir.png',{frameWidth:32,frameHeight:40});
  this.load.spritesheet('study-a','/assets/characters/gfx5b4c-a2/C03-study-A-32.png',{frameWidth:32,frameHeight:40});
  this.load.image('study-b','/assets/characters/gfx5b4c-a2/C03-study-B-48.png');
 }
 create(){
  const xs=[100,300,500], labels=['32x40 ban cu','32x40 nghien cuu A','48x64 nghien cuu B'];
  for(let i=0;i<3;i++){
   const key=['old','study-a','study-b'][i], frame=i===2?undefined:4;
   this.add.text(xs[i],12,labels[i],{fontSize:'12px',fontFamily:'sans-serif',color:'#eee5c7'}).setOrigin(.5,0);
   this.add.image(xs[i],84,key,frame).setOrigin(.5,1).setDisplaySize(i===2?30:32,40);
   this.add.image(xs[i],252,key,frame).setOrigin(.5,1).setDisplaySize(i===2?90:96,120);
  }
  this.add.text(8,100,'40 px canvas height',{fontSize:'11px',color:'#eee5c7'});
  this.add.text(8,260,'3x: nearest-neighbour',{fontSize:'11px',color:'#eee5c7'});
  (window as any).__gfx5b4cA2Study=()=>({ready:true,canvasSizes:[[32,40],[32,40],[48,64]],displaySizes:[[32,40],[32,40],[30,40]]});
 }
}
new Phaser.Game({type:Phaser.AUTO,parent:'game',width:600,height:285,backgroundColor:'#30483b',pixelArt:true,roundPixels:true,antialias:false,scene:[Study]});

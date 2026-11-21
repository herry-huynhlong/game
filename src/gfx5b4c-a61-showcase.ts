import Phaser from 'phaser';

const W=1280,H=1480;
class C03A61Showcase extends Phaser.Scene {
  constructor(){super('c03-a61-showcase')}
  preload(){
    this.load.spritesheet('a5','/assets/characters/gfx5b4c-a5/C03-A5-eight-view-walk.png',{frameWidth:48,frameHeight:64});
    this.load.spritesheet('a6','/assets/characters/gfx5b4c-a6/C03-A6-three-poses.png',{frameWidth:48,frameHeight:64});
    this.load.spritesheet('a61','/assets/characters/gfx5b4c-a61/C03-A6.1-three-poses.png',{frameWidth:48,frameHeight:64});
    this.load.spritesheet('a61-4x','/assets/characters/gfx5b4c-a61/C03-A6.1-three-poses-4x.png',{frameWidth:192,frameHeight:256});
    this.load.spritesheet('silhouette','/assets/characters/gfx5b4c-a61/C03-A6.1-silhouettes-4x.png',{frameWidth:192,frameHeight:256});
    this.load.image('face','/assets/characters/gfx5b4c-a61/C03-A6.1-face-closeup-4x.png');
    this.load.image('arms','/assets/characters/gfx5b4c-a61/C03-A6.1-arms-robe-closeup-3x.png');
    this.load.image('hem','/assets/characters/gfx5b4c-a61/C03-A6.1-hem-shoes-closeup-4x.png');
    this.load.atlas('city','/assets/props/settlement_buildings.png','/assets/props/settlement_buildings.json');
  }
  create(){
    this.cameras.main.setBackgroundColor('#1c3025');
    const g=this.add.graphics();g.fillStyle(0x22392b,1);g.fillRoundedRect(18,18,W-36,H-36,14);
    const title=(x:number,y:number,t:string,size=18,color='#f0dda6')=>this.add.text(x,y,t,{fontFamily:'Georgia,serif',fontSize:`${size}px`,color,stroke:'#13231b',strokeThickness:3}).setOrigin(.5,0);
    const text=(x:number,y:number,t:string,size=13,color='#d5dfcc')=>this.add.text(x,y,t,{fontFamily:'system-ui,sans-serif',fontSize:`${size}px`,color,stroke:'#14241c',strokeThickness:2}).setOrigin(.5,0);
    title(W/2,32,'BA PHIÊN BẢN · CÙNG BA GÓC NHÌN · TỶ LỆ GẦN TRONG GAME',19);
    const cols=[280,640,1000],heads=['C03 A5 · cũ','C03 A6 · đối chiếu','C03 A6.1 · chỉnh sửa'];
    cols.forEach((x,i)=>title(x,66,heads[i],16,i===2?'#9fe0c3':'#d5c6a0'));
    const poses=[{name:'Chính diện',a5:0},{name:'Nghiêng hẳn',a5:2},{name:'Góc 3/4',a5:1}];
    poses.forEach((pose,row)=>{
      const y=138+row*134;
      text(82,y+34,pose.name,14,'#e5c982');
      this.add.image(cols[0],y+42,'a5',pose.a5).setScale(1.15);
      this.add.image(cols[1],y+42,'a6',row).setScale(1.15);
      this.add.image(cols[2],y+42,'a61',row).setScale(1.15);
      g.lineStyle(1,0x8b9c74,.3);g.lineBetween(140,y+103,1140,y+103);
    });
    title(W/2,535,'A6.1 · PHÓNG NEAREST-NEIGHBOR 4×',18);
    const zoom=[{x:280,i:0,label:'Chính diện'},{x:640,i:1,label:'Nghiêng hẳn'},{x:1000,i:2,label:'Góc 3/4'}];
    for(const item of zoom){this.add.image(item.x,685,'a61-4x',item.i);text(item.x,825,item.label,13)}
    title(1160,545,'SILHOUETTE',14);
    for(let i=0;i<3;i++){this.add.image(1160,615+i*73,'silhouette',i).setScale(.27);text(1160,650+i*73,['Trước','Ngang','3/4'][i],10)}
    g.lineStyle(1,0xb4a16e,.55);g.lineBetween(38,865,W-38,865);
    title(210,880,'MẶT · 4×',15);this.add.image(210,1000,'face');
    title(640,880,'VAI, TAY VÀ THÂN ÁO · 3×',15);this.add.image(640,1000,'arms');
    title(1060,880,'VẠT ÁO VÀ GIÀY · 4×',15);this.add.image(1060,1000,'hem');
    g.lineStyle(1,0xb4a16e,.55);g.lineBetween(38,1110,W-38,1110);
    title(W/2,1130,'C03 A6.1 ĐỨNG CẠNH CỬA NHÀ H01 · CÙNG TỶ LỆ THẾ GIỚI',16);
    this.add.image(530,1380,'city','residential_house').setScale(.8).setOrigin(.5,.9);
    this.add.image(668,1380,'a61',0).setScale(1.2).setOrigin(.5,1);
    text(530,1400,'Nhà H01',12);text(668,1400,'C03',12);
    text(925,1250,'A6.1 là thiết kế 48×64; sprite hiển thị ở tỉ lệ nguyên gần trong game.',13,'#b8c8b4');
    const keys=['a5','a6','a61','a61-4x','silhouette','face','arms','hem','city'];
    (window as any).__gfx5b4cA61={ready:true,poseFrames:3,loadedTextures:keys.filter(k=>this.textures.exists(k)),expectedTextures:keys};
  }
}
new Phaser.Game({type:Phaser.AUTO,parent:'game',width:W,height:H,backgroundColor:'#1c3025',pixelArt:true,roundPixels:true,antialias:false,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[C03A61Showcase]});

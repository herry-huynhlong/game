import Phaser from 'phaser';
const W=1480,H=1660;
class A63Showcase extends Phaser.Scene {
 constructor(){super('c03-a63-showcase')}
 preload(){
  this.load.spritesheet('a5','/assets/characters/gfx5b4c-a5/C03-A5-eight-view-walk.png',{frameWidth:48,frameHeight:64});
  this.load.spritesheet('a6','/assets/characters/gfx5b4c-a6/C03-A6-three-poses.png',{frameWidth:48,frameHeight:64});
  this.load.spritesheet('a62','/assets/characters/gfx5b4c-a62/C03-A6.2-three-poses.png',{frameWidth:48,frameHeight:64});
  this.load.image('adult-face','/assets/characters/gfx5b4c-a62/C03-A6.2-face-closeup-4x.png');
  this.load.spritesheet('a62-4x','/assets/characters/gfx5b4c-a62/C03-A6.2-three-poses-4x.png',{frameWidth:192,frameHeight:256});
  this.load.spritesheet('a63','/assets/characters/gfx5b4c-a63/C03-A6.3-three-poses.png',{frameWidth:48,frameHeight:64});
  this.load.spritesheet('a63-4x','/assets/characters/gfx5b4c-a63/C03-A6.3-three-poses-4x.png',{frameWidth:192,frameHeight:256});
  this.load.spritesheet('silhouette','/assets/characters/gfx5b4c-a63/C03-A6.3-silhouettes-4x.png',{frameWidth:192,frameHeight:256});
  this.load.image('face-front','/assets/characters/gfx5b4c-a63/C03-A6.3-face-closeup1.png');this.load.image('face-side','/assets/characters/gfx5b4c-a63/C03-A6.3-face-closeup2.png');this.load.image('face-3q','/assets/characters/gfx5b4c-a63/C03-A6.3-face-closeup3.png');
  this.load.image('arms','/assets/characters/gfx5b4c-a63/C03-A6.3-arms-closeup1.png');this.load.image('hem','/assets/characters/gfx5b4c-a63/C03-A6.3-hem-closeup1.png');
  this.load.atlas('city','/assets/props/settlement_buildings.png','/assets/props/settlement_buildings.json');
 }
 create(){
  this.cameras.main.setBackgroundColor('#202822');const g=this.add.graphics();g.fillStyle(0x29332e,1);g.fillRoundedRect(18,18,W-36,H-36,14);
  const title=(x:number,y:number,t:string,size=18,color='#efdda9')=>this.add.text(x,y,t,{fontFamily:'Georgia,serif',fontSize:`${size}px`,color,stroke:'#1b211d',strokeThickness:3}).setOrigin(.5,0);
  const text=(x:number,y:number,t:string,size=13,color='#d6ddcb')=>this.add.text(x,y,t,{fontFamily:'system-ui,sans-serif',fontSize:`${size}px`,color,stroke:'#1b211d',strokeThickness:2}).setOrigin(.5,0);
  title(W/2,30,'C03 A6.3 · TU SĨ TRẺ THANH VÂN TÔNG',23);text(W/2,65,'A6.2 võ giả trưởng thành giữ nguyên; A6.3 kế thừa dáng đứng nhưng đổi gương mặt, tóc và đạo bào.',14);title(W/2,105,'SO SÁNH CÙNG KÍCH THƯỚC CHƠI · 48×64',17);
  const cols=[265,590,915,1240],heads=['A5 · bản cũ','A6 · bản cũ','A6.2 · võ giả nâu','A6.3 · tu sĩ trẻ'];cols.forEach((x,i)=>title(x,135,heads[i],16,i===3?'#a8dbbd':'#e2d2ad'));
  const poses=[{name:'Chính diện',a5:0},{name:'Nghiêng ngang',a5:2},{name:'Góc 3/4',a5:1}];poses.forEach((pose,row)=>{const y=190+row*115;text(88,y+24,pose.name,13,'#dec987');this.add.image(cols[0],y+34,'a5',pose.a5);this.add.image(cols[1],y+34,'a6',row);this.add.image(cols[2],y+34,'a62',row);this.add.image(cols[3],y+34,'a63',row);g.lineStyle(1,0x91a07e,.24);g.lineBetween(140,y+84,W-100,y+84)});
  g.lineStyle(1,0xb9a06c,.55);g.lineBetween(40,545,W-40,545);title(385,565,'A6.2 · VÕ GIẢ TRƯỞNG THÀNH',16,'#dfb27a');title(1080,565,'A6.3 · TU SĨ TRẺ',16,'#a8dbbd');this.add.image(385,730,'a62-4x',0);this.add.image(1080,730,'a63-4x',0);
  title(385,870,'Cận mặt A6.2',13,'#dfb27a');title(1080,870,'Cận mặt A6.3',13,'#a8dbbd');this.add.image(385,1000,'adult-face');this.add.image(1080,1000,'face-front');
  title(220,1110,'Góc nghiêng',13);title(510,1110,'Góc 3/4',13);this.add.image(220,1200,'face-side');this.add.image(510,1200,'face-3q');title(830,1110,'Vai, tay và lớp áo',13);this.add.image(830,1220,'arms');title(1230,1110,'Vạt áo và giày',13);this.add.image(1230,1220,'hem');
  title(280,1420,'SILHOUETTE · TRƯỚC / NGANG / 3/4',13);for(let i=0;i<3;i++)this.add.image(280+i*75,1510,'silhouette',i).setScale(.22);title(860,1420,'CÙNG TỶ LỆ THẾ GIỚI · CỬA H01',13);this.add.image(860,1585,'city','residential_house').setScale(.42).setOrigin(.5,.9);this.add.image(1005,1585,'a63',0).setScale(1.1).setOrigin(.5,1);
  const keys=['a5','a6','a62','adult-face','a62-4x','a63','a63-4x','silhouette','face-front','face-side','face-3q','arms','hem','city'];(window as any).__gfx5b4cA63={ready:true,poseFrames:3,loadedTextures:keys.filter(k=>this.textures.exists(k)),expectedTextures:keys};
 }
}
new Phaser.Game({type:Phaser.AUTO,parent:'game',width:W,height:H,backgroundColor:'#202822',pixelArt:true,roundPixels:true,antialias:false,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[A63Showcase]});


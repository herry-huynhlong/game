import Phaser from 'phaser';
const W=1480,H=1540;
class C03A62Showcase extends Phaser.Scene {
  constructor(){super('c03-a62-showcase')}
  preload(){
    this.load.spritesheet('a5','/assets/characters/gfx5b4c-a5/C03-A5-eight-view-walk.png',{frameWidth:48,frameHeight:64});
    this.load.spritesheet('a6','/assets/characters/gfx5b4c-a6/C03-A6-three-poses.png',{frameWidth:48,frameHeight:64});
    this.load.spritesheet('a61','/assets/characters/gfx5b4c-a61/C03-A6.1-three-poses.png',{frameWidth:48,frameHeight:64});
    this.load.spritesheet('a62','/assets/characters/gfx5b4c-a62/C03-A6.2-three-poses.png',{frameWidth:48,frameHeight:64});
    this.load.spritesheet('a62-4x','/assets/characters/gfx5b4c-a62/C03-A6.2-three-poses-4x.png',{frameWidth:192,frameHeight:256});
    this.load.spritesheet('silhouette','/assets/characters/gfx5b4c-a62/C03-A6.2-silhouettes-4x.png',{frameWidth:192,frameHeight:256});
    this.load.image('face','/assets/characters/gfx5b4c-a62/C03-A6.2-face-closeup-4x.png');
    this.load.image('arms','/assets/characters/gfx5b4c-a62/C03-A6.2-arm-robe-closeup-3x.png');
    this.load.image('hem','/assets/characters/gfx5b4c-a62/C03-A6.2-hem-shoe-closeup-4x.png');
    this.load.atlas('city','/assets/props/settlement_buildings.png','/assets/props/settlement_buildings.json');
  }
  create(){
    this.cameras.main.setBackgroundColor('#25221d');const g=this.add.graphics();g.fillStyle(0x332c24,1);g.fillRoundedRect(18,18,W-36,H-36,14);
    const title=(x:number,y:number,t:string,size=18,color='#f0dda6')=>this.add.text(x,y,t,{fontFamily:'Georgia,serif',fontSize:`${size}px`,color,stroke:'#211c17',strokeThickness:3}).setOrigin(.5,0);
    const text=(x:number,y:number,t:string,size=13,color='#ded3bd')=>this.add.text(x,y,t,{fontFamily:'system-ui,sans-serif',fontSize:`${size}px`,color,stroke:'#211c17',strokeThickness:2}).setOrigin(.5,0);
    title(W/2,32,'A5 · A6 · A6.1 · A6.2 / BA GÓC NHÌN CÙNG TỶ LỆ',19);
    const cols=[265,590,915,1240],heads=['C03 A5','C03 A6','C03 A6.1','C03 A6.2 · mẫu mới'];
    cols.forEach((x,i)=>title(x,66,heads[i],16,i===3?'#e4b47e':'#d6c8aa'));
    const poses=[{name:'Chính diện',a5:0},{name:'Nghiêng',a5:2},{name:'Góc 3/4',a5:1}];
    poses.forEach((pose,row)=>{const y=140+row*132;text(82,y+34,pose.name,14,'#e4c482');this.add.image(cols[0],y+42,'a5',pose.a5).setScale(1.12);this.add.image(cols[1],y+42,'a6',row).setScale(1.12);this.add.image(cols[2],y+42,'a61',row).setScale(1.12);this.add.image(cols[3],y+42,'a62',row).setScale(1.12);g.lineStyle(1,0x957951,.28);g.lineBetween(140,y+101,W-100,y+101)});
    title(715,535,'A6.2 · PHÓNG PIXEL NEAREST-NEIGHBOR 4×',18);
    const zoom=[{x:260,i:0,label:'Chính diện'},{x:610,i:1,label:'Nghiêng'},{x:960,i:2,label:'3/4'}];for(const q of zoom){this.add.image(q.x,685,'a62-4x',q.i);text(q.x,825,q.label,13)}
    title(1270,545,'SILHOUETTE',14);for(let i=0;i<3;i++){this.add.image(1270,615+i*72,'silhouette',i).setScale(.26);text(1270,650+i*72,['Trước','Ngang','3/4'][i],10)}
    g.lineStyle(1,0xb9a06c,.55);g.lineBetween(40,865,W-40,865);
    title(260,880,'MẶT, TÓC VÀ RÂU · 4×',15);this.add.image(260,1010,'face');
    title(740,880,'VAI, TAY VÀ ÁO · 3×',15);this.add.image(740,1010,'arms');
    title(1210,880,'VẠT ÁO, GIÀY · 4×',15);this.add.image(1210,1010,'hem');
    g.lineStyle(1,0xb9a06c,.55);g.lineBetween(40,1115,W-40,1115);
    title(W/2,1132,'C03 A6.2 ĐỨNG CẠNH CỬA NHÀ H01 · CÙNG TỶ LỆ THẾ GIỚI',16);
    this.add.image(600,1390,'city','residential_house').setScale(.8).setOrigin(.5,.9);this.add.image(740,1390,'a62',0).setScale(1.2).setOrigin(.5,1);text(600,1410,'Nhà H01',12);text(740,1410,'C03',12);
    text(1040,1250,'Nguồn Aseprite 48×64; bản này chỉ dùng trong showcase để bạn duyệt tạo hình.',12,'#c5b9a4');
    const keys=['a5','a6','a61','a62','a62-4x','silhouette','face','arms','hem','city'];(window as any).__gfx5b4cA62={ready:true,poseFrames:3,loadedTextures:keys.filter(k=>this.textures.exists(k)),expectedTextures:keys};
  }
}
new Phaser.Game({type:Phaser.AUTO,parent:'game',width:W,height:H,backgroundColor:'#25221d',pixelArt:true,roundPixels:true,antialias:false,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[C03A62Showcase]});

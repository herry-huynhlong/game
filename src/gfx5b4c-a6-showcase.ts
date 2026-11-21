import Phaser from 'phaser';

const W=1280,H=1260;
class C03A6Showcase extends Phaser.Scene {
  constructor(){super('c03-a6-showcase')}
  preload(){
    this.load.spritesheet('a6','/assets/characters/gfx5b4c-a6/C03-A6-three-poses.png',{frameWidth:48,frameHeight:64});
    this.load.spritesheet('a5','/assets/characters/gfx5b4c-a5/C03-A5-eight-view-walk.png',{frameWidth:48,frameHeight:64});
    this.load.spritesheet('legacy','/assets/characters/sect_cultivator.png',{frameWidth:32,frameHeight:40});
    this.load.image('a6-face','/assets/characters/gfx5b4c-a6/C03-A6-face-details.png');
    this.load.image('a6-robe','/assets/characters/gfx5b4c-a6/C03-A6-robe-details.png');
    this.load.image('a6-silhouette','/assets/characters/gfx5b4c-a6/C03-A6-silhouette-4x.png');
    this.load.atlas('city','/assets/props/settlement_buildings.png','/assets/props/settlement_buildings.json');
    this.load.atlas('world','/assets/props/world_props.png','/assets/props/world_props.json');
  }
  create(){
    this.cameras.main.setBackgroundColor('#1c3025');
    const g=this.add.graphics();
    g.fillStyle(0x22392b,1);g.fillRoundedRect(18,18,W-36,H-36,14);
    const title=(x:number,y:number,t:string,size=18,color='#f0dda6')=>this.add.text(x,y,t,{fontFamily:'Georgia,serif',fontSize:`${size}px`,color,stroke:'#13231b',strokeThickness:3}).setOrigin(.5,0);
    const text=(x:number,y:number,t:string,size=13,color='#d5dfcc')=>this.add.text(x,y,t,{fontFamily:'system-ui,sans-serif',fontSize:`${size}px`,color,stroke:'#14241c',strokeThickness:2}).setOrigin(.5,0);
    title(W/2,32,'SO SÁNH Ở TỶ LỆ GẦN TRONG GAME',20);
    const cols=[250,640,1030],heads=['C03 A5 · cũ','C03 A6 · thiết kế lại','NPC hiện tại · sect_cultivator'];
    cols.forEach((x,i)=>title(x,64,heads[i],16,i===1?'#9fe0c3':'#d5c6a0'));
    const poses=[{name:'Chính diện',a5:0,legacy:0},{name:'Nghiêng ngang',a5:2,legacy:24},{name:'Góc 3/4',a5:1,legacy:8}];
    poses.forEach((p,row)=>{
      const y=132+row*135;
      text(70,y+42,p.name,14,'#e5c982');
      this.add.image(cols[0],y+48,'a5',p.a5).setScale(1.18).setOrigin(.5,.5);
      this.add.image(cols[1],y+48,'a6',row).setScale(1.18).setOrigin(.5,.5);
      this.add.image(cols[2],y+48,'legacy',p.legacy).setScale(1.55).setOrigin(.5,.5);
      g.lineStyle(1,0x8b9c74,.3);g.lineBetween(130,y+108,1175,y+108);
    });
    title(W/2,535,'MẪU A6 · PIXEL GỐC PHÓNG 4×',18);
    const strip=[{x:250,frame:0,label:'Chính diện'},{x:535,frame:1,label:'Nghiêng ngang'},{x:820,frame:2,label:'Góc 3/4'}];
    for(const item of strip){
      this.add.image(item.x,674,'a6',item.frame).setScale(4).setOrigin(.5,.5);
      text(item.x,812,item.label,13);
    }
    title(1080,535,'SILHOUETTE · 4×',16);
    this.add.image(1080,674,'a6-silhouette').setScale(.33).setOrigin(.5,.5);
    text(1080,812,'3 góc nhìn',12);
    g.lineStyle(1,0xb4a16e,.55);g.lineBetween(38,850,W-38,850);
    title(38,870,'CẬN KHUÔN MẶT',15).setOrigin(0,0);
    this.add.image(205,1000,'a6-face').setScale(.55).setOrigin(.5,.5);
    title(402,870,'CẬN ĐẠO BÀO',15).setOrigin(0,0);
    this.add.image(492,1000,'a6-robe').setScale(.38).setOrigin(.5,.5);
    title(970,870,'MỐC TỶ LỆ TRONG THẾ GIỚI',15);
    this.add.image(835,1004,'city','residential_house').setScale(.48).setOrigin(.5,.9);
    this.add.image(1030,1004,'world','ancient_tree').setScale(.78).setOrigin(.5,.9);
    this.add.image(1190,1004,'a6',0).setScale(1.05).setOrigin(.5,1);
    text(835,1040,'Nhà H01',12);text(1030,1040,'Cổ thụ',12);text(1190,1040,'C03',12);
    text(970,1110,'NPC cũ không có pose 3/4 tương ứng; cột so sánh dùng frame gần nhất có sẵn.',12,'#b8c8b4');
    const keys=['a5','a6','legacy','a6-face','a6-robe','a6-silhouette','city','world'];
    (window as any).__gfx5b4cA6={ready:true,threePoseFrames:3,loadedTextures:keys.filter(k=>this.textures.exists(k)),expectedTextures:keys};
  }
}
new Phaser.Game({type:Phaser.AUTO,parent:'game',width:W,height:H,backgroundColor:'#1c3025',pixelArt:true,roundPixels:true,antialias:false,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[C03A6Showcase]});

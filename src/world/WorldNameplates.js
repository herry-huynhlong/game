import { cultivationStats } from '../systems/CultivationSystem.ts';
import { formatRealm, realmPosition } from '../systems/RealmConfig.ts';
import { faunaName, faunaRealm } from '../dao/MonsterRegistry.ts';
import { flightOffset } from './FlyingSwordVisuals.js';
import { residentName } from './ResidentProfile.js';

const tones=[0xdddcd4,0xb2e28f,0x90d8ff,0xffd682,0xe7b4ff,0xff9c7b];
const setting='tvy-world-nameplates';
const font='world-label-glyphs';
const range=(from,to)=>Array.from({length:to-from+1},(_,i)=>String.fromCharCode(from+i));
const glyphs=[...range(32,126),...range(160,255),...range(0x100,0x1b0),...range(0x1ea0,0x1ef9),'·'];

function installFont(scene){
  if(scene.cache.bitmapFont.exists(font))return;
  const tileW=14,tileH=18,cols=32,width=tileW*cols,height=Math.ceil(glyphs.length/cols)*tileH;
  const texture=scene.textures.createCanvas(font,width,height),ctx=texture.context,chars={};
  ctx.font='11px monospace';
  ctx.textBaseline='alphabetic';
  ctx.textAlign='left';
  ctx.lineWidth=2;
  ctx.lineJoin='round';
  ctx.strokeStyle='#17221d';
  ctx.fillStyle='#fff';
  for(const [i,char] of glyphs.entries()){
    const x=i%cols*tileW,y=Math.floor(i/cols)*tileH;
    ctx.strokeText(char,x+2,y+13);ctx.fillText(char,x+2,y+13);
    chars[char.charCodeAt(0)]={x,y,width:tileW,height:tileH,centerX:7,centerY:9,
      xOffset:-2,yOffset:0,xAdvance:7,data:{},kerning:{},u0:x/width,u1:(x+tileW)/width,
      v0:1-y/height,v1:1-(y+tileH)/height};
  }
  texture.refresh();
  scene.cache.bitmapFont.add(font,{texture:font,frame:null,data:{font,size:11,lineHeight:18,chars}});
}

export class WorldNameplates {
  constructor(scene) {
    this.scene=scene;
    this.active=new Map();
    this.spare=[];
    installFont(scene);
    this.enabled=localStorage.getItem(setting)!=='off';
    this.health=scene.add.graphics().setDepth(20009);
    const button=document.getElementById('world-nameplates');
    if(button){
      const sync=()=>button.setAttribute('aria-pressed',String(this.enabled));
      button.onclick=()=>{this.enabled=!this.enabled;localStorage.setItem(setting,this.enabled?'on':'off');sync();};
      sync();
    }
  }
  acquire(id) {
    const s=this.scene;
    const plate=this.spare.pop()??{
      name:s.add.bitmapText(0,0,font,'',11).setOrigin(.5,1).setDepth(20010).setTint(0xf7e8c6),
      realm:s.add.bitmapText(0,0,font,'',11).setOrigin(.5,1).setDepth(20010),
    };
    this.active.set(id,plate);
    return plate;
  }
  update(time) {
    if(time<(this.next??0))return;
    this.next=time+48;
    const s=this.scene,c=s.cameras.main,z=c.zoom,view=c.worldView;
    const rows=[],remaining=new Set();
    this.health.clear();
    const inspect=(actor,sprite,fauna)=>{
      if(!actor.alive||actor.ascended||!sprite?.visible||actor.skyStep?.phase==='travel')return;
      const elevation=fauna?Math.max(0,actor.y-sprite.y):s.ramparts.height(actor)+(actor.flight?flightOffset(actor.flight):0);
      const x=actor.x,y=actor.y-elevation;
      if(x<view.x||x>view.right||y<view.y||y>view.bottom)return;
      const selected=actor.id===(fauna?s.selectedFaunaId:s.selectedNpcId);
      if(fauna&&actor.growth&&['normal','spirit','dormant'].includes(actor.growth.phase)&&!selected)return;
      if(fauna&&actor.species==='flower'&&(!actor.flower||actor.flower.phase==='rooted')&&!selected)return;
      const pointer=s.input.activePointer;
      const hover=pointer&&Math.abs(pointer.worldX-x)<15/z&&pointer.worldY<=y+4&&pointer.worldY>y-37;
      const fighting=fauna?Boolean(actor.targetNpcId||actor.cast):actor.action==='fight';
      if((selected||hover||fighting)&&z>.48){
        const hp=actor.hp/(fauna?actor.maxHp:cultivationStats(actor).hpMax);
        this.health.fillStyle(0x202323,.9).fillRect(x-15/z,y-36,30/z,4/z);
        this.health.fillStyle(0xcd735a).fillRect(x-14/z,y-36+1/z,28/z*Math.min(1,Math.max(0,hp)),2/z);
      }
      if(this.enabled&&(z>=.59||selected||hover))rows.push({actor,x,y:y-(fauna?Math.max(52,sprite.displayHeight*.72):45),fauna,selected,hover});
    };
    for(const n of s.populationWorld.npcs)inspect(n,s.npcSprites.get(n.id),false);
    for(const f of s.populationWorld.environment.fauna)inspect(f,s.faunaSprites.get(f.id),true);
    rows.sort((a,b)=>Number(b.selected)-Number(a.selected)||Number(b.hover)-Number(a.hover)||a.y-b.y);
    const scale=1/Math.max(z,.65),occupied=[];
    for(const {actor,x,y,fauna} of rows){
      const info=fauna?faunaRealm(actor):actor;
      const realm=realmPosition(info);
      const name=(fauna?faunaName(actor)+(actor.rank==='elite'?' · Tinh Anh':''):residentName(actor)).normalize('NFC');
      const label=realm?formatRealm(info):'Phàm nhân';
      const width=Math.max(name.length,label.length)*3.55*scale;
      const positions=[[0,0],[0,-23],[0,-46],[-36,-22],[36,-22],[-75,-44],[75,-44],[0,-68]];
      const spot=positions.map(([dx,dy])=>({x:x+dx*scale,top:y+dy*scale})).find(p=>occupied.every(o=>
        Math.abs(o.x-p.x)>width+o.width||Math.abs(o.top-p.top)>22*scale));
      if(z<.85&&!spot)continue;
      const tag=spot??{x,top:y};
      occupied.push({...tag,width});
      const plate=this.active.get(actor.id)??this.acquire(actor.id);
      if(plate.name.text!==name)plate.name.setText(name);
      if(plate.realm.text!==label)plate.realm.setText(label).setTint(tones[(realm?.index??-1)+1]);
      plate.name.setPosition(tag.x,tag.top-11*scale).setScale(scale).setVisible(true);
      plate.realm.setPosition(tag.x,tag.top).setScale(scale).setVisible(true);
      remaining.add(actor.id);
    }
    for(const [id,plate] of this.active)if(!remaining.has(id)){
      this.active.delete(id);
      plate.name.setVisible(false);plate.realm.setVisible(false);
      this.spare.push(plate);
    }
  }
}

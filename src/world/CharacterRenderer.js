import { CharacterCombat } from './CharacterCombat.js';
import { validateAppearance } from './CharacterAppearance.js';
import { CharacterAnimationController } from './CharacterAnimationController.js';
import { rigFor } from './CharacterAssetRegistry.js';
import { weaponPlacement } from './CharacterEquipment.js';
import { meditationAnchors, seatedTexture } from './SeatedCharacterArt.js';

const PARTS = ['hairBack','body','pants','leftShoe','rightShoe','hem','outerCloth','innerCloth',
  'leftArm','rightArm','face','eyes','eyebrows','beard','hairFront','headwear','accessory','weapon','effect'];
const HANDS = {down:[43,62],up:[20,62],left:[27,61],right:[36,61]};

export class CharacterRenderer {
  constructor(scene, x, y, appearance) {
    this.appearance = validateAppearance(appearance);
    this.resolvedParts = new Map();
    this.grips = scene.cache.json.get('rig-grips');
    this.registry = scene.cache.json.get('rig-variants-registry');
    this.timeline = new CharacterAnimationController();
    this.combat=new CharacterCombat();
    this.combat.equip(this.appearance.weapon,'down',false);
    this.combatAtlas=scene.cache.json.get('combat-anchors');
    this.root = scene.add.container(x,y);
    this.layers = Object.fromEntries(PARTS.map(part => {
      const sprite = scene.add.image(0,0,'rig-parts','down/body').setOrigin(0).setVisible(false);
      this.root.add(sprite);
      return [part,sprite];
    }));
    this.apply();
  }
  get motion() {return this.timeline.motion;}
  get direction() {return this.timeline.direction;}
  get elapsed() {return this.timeline.elapsed;}
  get frame() {return this.timeline.frame;}

  customize(appearance) {
    const previous=this.appearance.weapon;
    this.appearance = validateAppearance(appearance);
    this.resolvedParts.clear();
    if(previous!==this.appearance.weapon)this.combat.equip(this.appearance.weapon,this.direction,Boolean(this.combatAtlas));
    this.apply();
  }

  advance(delta, motion, direction, distance = delta*(motion==='run'?.07:.04)) {
    const changed=this.timeline.advance(delta,motion,direction,distance);
    const wasActing=Boolean(this.combat.action);
    this.combat.advance(delta,(event,action)=>{this.apply();this.onActionEvent?.(event,action,this.attachments);});
    if(changed||wasActing||this.riding||this.combat.weapon==='crossbow'||this.meditation||this.seated?.visible)this.apply();
  }

  apply() {
    const {appearance,layers}=this;
    const combat=this.combatAtlas?this.combat.pose(this.direction):null;
    const direction=combat?.direction??this.direction;
    const pose=this.timeline.pose();
    const rig=rigFor(appearance);
    const side=direction==='left'||direction==='right';
    const sign=direction==='left'||direction==='up'?-1:1;
    const riding=this.riding;
    const flight=this.flightPose,stance=flight?.mount??0;
    const airCloth=flight?.cloth??0;
    const action=combat?.values;
    const shift=action?.[4]??0;
    const rise=(riding?0:pose.rise)*(1-stance)+shift+(this.rideBob??0)-Math.round(Math.sin(stance*Math.PI)*5);
    const {swing,cloth}=pose;
    const sway=Math.max(-2,Math.min(2,Math.round((cloth*(1-stance)+airCloth*stance)*sign)));
    const armX=side?swing*sign:0;
    const armY=side?0:Math.round(swing*.6)*sign;
    const suffix=appearance.outfitColor==='jade'?'':'/'+appearance.outfitColor;
    const hair=`/${appearance.hair}/${appearance.hairColor}`;
    const set=(part,key=part,x=0,y=rise,visible=true)=>{
      const sprite=layers[part];
      const partKey=direction+'/'+key;
      let resolved=this.resolvedParts.get(partKey);
      if(!resolved){
        const enhanced=part==='face'||part==='eyes'||part==='eyebrows'||part==='beard'||key.endsWith('/earth')||key.endsWith('/chestnut');
        const original=(rig==='original'&&!enhanced)||part==='weapon';
        const texture=sprite.scene.textures.get(original?'rig-parts':'rig-variants');
        const prefix=(original?'':rig+'/')+direction+'/';
        const frameName=texture.has(prefix+key)?prefix+key:prefix+part;
        resolved={frame:texture.has(frameName)?texture.get(frameName):null,anchor:this.registry?.anchors?.[frameName]};
        this.resolvedParts.set(partKey,resolved);
      }
      visible=visible&&Boolean(resolved.frame);
      if(visible&&sprite.frame!==resolved.frame)sprite.setFrame(resolved.frame);
      const {anchor}=resolved;
      const px=x-32+(anchor?.[0]??0),py=y-93+(anchor?.[1]??0);
      if(sprite.x!==px||sprite.y!==py)sprite.setPosition(px,py);
      if(sprite.visible!==visible)sprite.setVisible(visible);
    };
    const meditation=this.meditation;
    if(meditation?.amount>.20&&!riding&&!flight&&!action){
      const stage=meditation.amount<.56?1:meditation.amount<.90?2:3;
      const breath=stage===3&&Boolean(meditation.breath||meditation.shocked)?1:0;
      const anchors=meditationAnchors(appearance,direction,stage,breath);
      this.meditationAnchors=anchors;
      const [x,y]=anchors.shift;
      const texture=seatedTexture(layers.body.scene.textures,appearance,direction,stage,breath);
      if(!this.seated){
        this.seated=layers.body.scene.add.image(-32,-93,texture).setOrigin(0);
        this.root.add(this.seated);
      }
      if(this.seated.texture.key!==texture)this.seated.setTexture(texture);
      this.seated.setVisible(true);
      if(meditation.shocked)this.seated.setTint(0xbfc9ff);
      else this.seated.clearTint();
      for(const part of PARTS)layers[part].setVisible(false);
      set('hairBack','hairBack'+hair,x,y);
      set('face',`face/${appearance.face}/${appearance.expression}`,x,y);
      set('eyes',`eyes/${appearance.eyes}`,x,y,meditation.name!=='BreakthroughPrepare');
      set('eyebrows',`eyebrows/${appearance.eyebrows}`,x,y);
      set('beard',`beard/${appearance.beard}`,x,y,appearance.beard!=='none'&&(appearance.beard==='silver'||appearance.face==='elder'));
      set('hairFront','hairFront'+hair,x,y);
      set('headwear','headwear',x,y,appearance.headwear!=='none'&&appearance.hair==='bun');
      for(const layer of [layers.hairBack,this.seated,layers.face,layers.eyes,layers.eyebrows,layers.beard,layers.hairFront,layers.headwear])this.root.bringToTop(layer);
      this.lastLayerDirection=null;
      return;
    }
    this.meditationAnchors=null;
    this.seated?.setVisible(false);
    set('hairBack','hairBack'+hair,sway);
    set('body');
    const pants = appearance.pants === 'charcoal' ? '/charcoal' : '';
    const shoes = appearance.shoes === 'charcoal' ? '/charcoal' : '';
    set('pants','pants'+pants,riding?(side?-2:0):0,rise,riding?side:true);
    const feet=['leftShoe','rightShoe'];
    for(const [i,part] of feet.entries()) {
      const travel=pose.feet[i]*sign;
      if(flight){
        const x=side?(i===0?-9:10):(i===0?-3:3),y=side?(i===0?-1:1):(i===0?-7:6);
        set(part,part+shoes,Math.round(x*stance),Math.round(y*stance-(i===1?Math.sin(stance*Math.PI)*9:0)));
        continue;
      }
      set(part,part+shoes,riding?(side?-5+7*i:(i?8:-8)):side?travel:0,riding?-21+(side?2*i:0):(side?0:travel)-pose.lift[i],!riding||!side||i===1);
    }
    set('outerCloth','outerCloth'+suffix);
    set('hem',`hem/${direction==='left'?-sway:sway}${suffix}`,0,rise,rig!=='original');
    set('innerCloth');
    const hands=this.registry?.[rig]?.hands??HANDS;
    const [x,y]=hands[direction];
    const reach=action?.[1]??(riding?3:0),lift=action?.[2]??(riding?-4:0),off=action?.[3]??0;
    const forwardX=side?sign:0,forwardY=side?0:sign;
    const twoHands=combat?.weapon==='crossbow';
    const active=Boolean(action||riding);
    const handX=flight?Math.round((side?7*sign:5)*stance):active?forwardX*reach:armX;
    const handY=flight?-Math.round((7+(flight.lean??0))*stance):active?lift+Math.round(forwardY*reach*.42):armY;
    const holdingBack=direction==='up';
    const mainPart=holdingBack?'leftArm':'rightArm';
    const supportPart=holdingBack?'rightArm':'leftArm';
    const anchors=this.registry?.[rig]?.arms?.[direction];
    const supportBaseX=anchors?.support[1][0]??(side?x+3:63-x);
    const supportBaseY=anchors?.support[1][1]??y;
    const supportX=flight?Math.round((side?-6*sign:-5)*stance):twoHands?x+handX+(side?forwardX*8:4)-supportBaseX:active?forwardX*off:-armX;
    const supportY=flight?-Math.round(4*stance):twoHands?y+handY+forwardY*6-supportBaseY:active?Math.round(forwardY*off*.36)-2:-armY;
    const hand=(part,startX,startY,dx,dy,shoulder)=>{
      const layer=layers[part];
      set(part,part+suffix,0,rise);
      const [sx,sy]=shoulder??[startX,startY-14];
      const pivotX=sx-32,pivotY=sy+rise-93;
      const vx=startX-sx,vy=startY-sy;
      const length=Math.max(1,Math.hypot(vx,vy));
      const tx=vx+dx,ty=vy+dy;
      const angle=Math.atan2(ty,tx)-Math.atan2(vy,vx);
      const reach=Math.hypot(tx,ty)/length;
      // Keep the shoulder planted. The directional arm artwork follows separate
      // wrist targets, so the sleeve and the weapon meet throughout the pose.
      layer.setOrigin((pivotX-layer.x)/layer.frame.width,(pivotY-layer.y)/layer.frame.height)
        .setRotation(angle).setScale(reach).setPosition(pivotX,pivotY);
    };
    hand(mainPart,x,y,handX,handY,anchors?.main[0]);
    hand(supportPart,supportBaseX,supportBaseY,supportX,supportY,anchors?.support[0]);
    set('face',`face/${appearance.face}/${appearance.expression}`);
    set('eyes',`eyes/${appearance.eyes}`);
    set('eyebrows',`eyebrows/${appearance.eyebrows}`);
    set('beard',`beard/${appearance.beard}`,0,rise,appearance.beard!=='none'&&(appearance.beard==='silver'||appearance.face==='elder'));
    set('hairFront','hairFront'+hair);
    set('headwear','headwear',0,rise,appearance.headwear!=='none'&&appearance.hair==='bun');
    set('accessory','accessory',side?sway:0,rise,appearance.accessory!=='none');
    this.attachments={hand:{x:x+handX-32,y:y+handY+rise-93}};
    const weapon=layers.weapon;
    if(this.flightWeapon)weapon.setVisible(false);
    else if(combat&&['sword','saber','crossbow'].includes(combat.weapon)){
      const style=combat.weapon==='crossbow'?(action[5]==='guard'?'hold':action[5]):action[5];
      const key=`weapon/${combat.weapon}/${direction}/${style}`;
      const weaponAnchor=this.combatAtlas.origins[key];
      if(weaponAnchor){
        const [ax,ay]=weaponAnchor;
        if(weapon.texture.key!=='combat-mount'||weapon.frame.name!==key)weapon.setTexture('combat-mount',key);
        weapon.setPosition(Math.round(this.attachments.hand.x-ax),Math.round(this.attachments.hand.y-ay)).setVisible(true);
        const [tx,ty]=this.combatAtlas.tips[key];
        this.attachments.tip={x:this.attachments.hand.x+tx,y:this.attachments.hand.y+ty};
      } else weapon.setVisible(false);
    } else if(appearance.weapon!=='none'&&appearance.weapon!=='crossbow'){
      const grip=weaponPlacement(direction,appearance.weapon,hands,this.grips,armX,armY);
      set('weapon',grip.key,grip.x,grip.y+rise);
    } else weapon.setVisible(false);
    for(const part of ['pants','hem','outerCloth','innerCloth']){
      const sprite=layers[part];
      const top=sprite.y;
      const maxY=riding?-15:200;
      const height=Math.max(0,Math.min(sprite.frame.height,maxY-top));
      if(riding&&sprite.visible)sprite.setCrop(0,0,sprite.frame.width,height);
      else if(sprite.isCropped)sprite.setCrop();
    }
    if (this.lastLayerDirection !== direction) {
      const far = side || direction==='up';
      const order = ['hairBack','leftShoe','rightShoe','pants',...(far?['leftArm']:[]),
        ...(direction==='up'?['weapon']:[]),'body','outerCloth','hem','innerCloth','accessory',
        ...(far?[]:['leftArm']),'rightArm','face','eyes','eyebrows','beard','hairFront','headwear',
        ...(direction==='up'?[]:['weapon']),'effect'];
      for (const part of order) this.root.bringToTop(layers[part]);
      this.lastLayerDirection = direction;
    }
  }

  worldAttachment(name) {
    const point=this.attachments?.[name];
    return point?this.root.getWorldTransformMatrix().transformPoint(point.x,point.y):null;
  }

  destroy() { this.root.destroy(true); }
}

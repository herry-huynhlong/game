export const cityPropFrame=index=>'city-prop-'+index;

export class CityScenery {
  constructor(scene,sprites){
    this.scene=scene;
    this.animated=[];
    for(const sprite of sprites){
      const object=sprite.getData('tiledObject'),kind=scene.prop(object,'cityEffect');
      if(!kind)continue;
      const x=object.x+object.width/2,y=object.y-24;
      this.animated.push({sprite,kind,x,y,phase:scene.stableHash(object.name)%100});
    }
    this.ripples=scene.add.graphics().setDepth(3900);
    this.lights=scene.add.graphics().setDepth(9201);
  }

  update(time,night){
    if(time<(this.nextUpdate??0))return;
    this.nextUpdate=time+125;
    const started=performance.now();
    const zoom=this.scene.cameras.main.zoom;
    this.lights.clear();
    this.ripples.clear();
    for(const {sprite,kind,x,y,phase} of this.animated){
      if(!sprite.visible)continue;
      const t=time/470+phase;
      if(kind==='smoke'){
        sprite.setAlpha(zoom>=.63?.42+.13*Math.sin(t):0);
        if(zoom>=.63)sprite.setFrame(cityPropFrame(26+Math.floor(t)%3));
      }else if(kind==='water'&&zoom>=.65){
        const spread=3+(Math.sin(t)+1)*4;
        this.ripples.fillStyle(0x9fdbc3,.5).fillRect(x-spread,y-24,spread*2,1);
        this.ripples.fillStyle(0x6cb699,.54).fillRect(x+9-spread,y-17,spread,1);
      }else if((kind==='banner'||kind==='bloom')&&zoom>=.65){
        sprite.setRotation((kind==='bloom'?.007:.014)*Math.sin(t));
      }
      if(kind==='lantern'&&zoom>=.65){
        const swing=Math.sin(t);
        sprite.setFrame(cityPropFrame(swing<-.42?29:swing>.42?30:19));
      }
      if((kind==='lantern'||kind==='stone-lamp')&&night>0){
        const lx=x+(kind==='lantern'?14:0),ly=y-(kind==='lantern'?39:33);
        for(const [radius,alpha] of zoom<.5?[[19,.09],[10,.14]]:[[30,.06],[21,.09],[13,.12],[7,.21]]){
          this.lights.fillStyle(0xf4ae52,night*alpha).fillEllipse(lx,ly,radius*2,radius*1.3);
        }
        this.lights.fillStyle(0xffd27c,night*(.55+.05*Math.sin(t))).fillRect(lx-2,ly-3,4,6);
      }
    }
    this.lastUpdateMs=performance.now()-started;
  }
}

import { CharacterRenderer } from './CharacterRenderer.js';
import { appearanceSignature } from './NpcAppearanceProfiles.js';

const CAPACITY=24;
const WIDTH=96,HEIGHT=120;
const canvas=(width,height)=>Object.assign(document.createElement('canvas'),{width,height});

function drawLayer(ctx,layer){
  if(!layer.visible||!layer.frame.cutWidth)return;
  const frame=layer.frame;
  ctx.save();
  ctx.translate(layer.x,layer.y);
  ctx.rotate(layer.rotation);
  ctx.scale(layer.scaleX,layer.scaleY);
  ctx.drawImage(frame.source.image,frame.cutX,frame.cutY,frame.cutWidth,frame.cutHeight,
    frame.x-layer.displayOriginX,frame.y-layer.displayOriginY,
    frame.cutWidth/frame.source.resolution,frame.cutHeight/frame.source.resolution);
  ctx.restore();
}

function upperBody(source,output,bustSpan){
  const {width,height}=source;
  const rgba=source.getContext('2d').getImageData(0,0,width,height).data;
  let top=height,minX=width,maxX=-1;
  for(let y=0;y<Math.min(height,top+bustSpan);y++)for(let x=0;x<width;x++){
    if(!rgba[(y*width+x)*4+3])continue;
    top=Math.min(y,top);minX=Math.min(minX,x);maxX=Math.max(maxX,x);
  }
  if(maxX<0)return null;
  const factor=Math.max(1,Math.min(Math.floor(WIDTH/(maxX-minX+2)),Math.floor(HEIGHT/(bustSpan+6))));
  const ctx=output.getContext('2d');
  ctx.clearRect(0,0,WIDTH,HEIGHT);
  ctx.imageSmoothingEnabled=false;
  const sx=Math.floor((WIDTH-(maxX-minX+1)*factor)/2)-minX*factor;
  const dy=7-top*factor;
  ctx.drawImage(source,sx,dy,width*factor,height*factor);
  return output.toDataURL('image/png');
}

export class ResidentPortraits {
  constructor(scene){
    this.scene=scene;
    this.cache=new Map();
    this.source=canvas(128,128);
    this.output=canvas(WIDTH,HEIGHT);
  }
  get(npc,look=npc.modularAppearance?.look){
    const scene=this.scene;
    const actor=scene.npcSprites.get(npc.id);
    const modular=!scene.paperDollPreview&&look&&scene.textures.exists('rig-variants');
    const key=modular?appearanceSignature(look):'sprite:'+actor?.texture.key;
    const cached=this.cache.get(key);
    if(cached){this.cache.delete(key);this.cache.set(key,cached);return cached;}
    const ctx=this.source.getContext('2d',{willReadFrequently:true});
    ctx.clearRect(0,0,128,128);
    ctx.imageSmoothingEnabled=false;
    ctx.save();
    let span;
    if(modular){
      const appearance={...look,weapon:'none'};
      if(!this.renderer){
        this.renderer=new CharacterRenderer(scene,0,0,appearance);
        this.renderer.root.setVisible(false).removeFromDisplayList();
      }else this.renderer.customize(appearance);
      ctx.translate(64,104);
      for(const layer of this.renderer.root.list)drawLayer(ctx,layer);
      span=35;
    }else if(actor){
      const f=actor.texture.get(0);
      ctx.drawImage(f.source.image,f.cutX,f.cutY,f.cutWidth,f.cutHeight,0,0,f.cutWidth,f.cutHeight);
      span=29;
    }
    ctx.restore();
    if(!span)return null;
    const url=upperBody(this.source,this.output,span);
    if(!url)return null;
    this.cache.set(key,url);
    if(this.cache.size>CAPACITY)this.cache.delete(this.cache.keys().next().value);
    return url;
  }
  destroy(){
    this.renderer?.destroy();this.cache.clear();
    this.source.width=this.output.width=0;
  }
}

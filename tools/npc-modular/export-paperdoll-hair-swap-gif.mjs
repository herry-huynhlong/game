import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import gifenc from 'gifenc';
const { GIFEncoder, quantize, applyPalette } = gifenc;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const lab = path.join(root, 'public/assets/npc-paperdoll-lab');
const out = path.join(root, 'art/source/npc-modular/paperdoll-hair-swap-walk.gif');
const read = file => PNG.sync.read(fs.readFileSync(path.join(lab, file)));
const sources = Object.fromEntries(['c01','c02'].map(id => [id, Object.fromEntries(['outfit-base','head-base','hair-back','hair-front','details'].map(part => [part, read(`${id}-${part}.png`)]))]));
const blend = (dst, src, si, di) => {
  const pixels=src.data??src;
  const sa=pixels[si+3]/255;if(!sa)return;
  const da=dst[di+3]/255,oa=sa+da*(1-sa);
  for(let c=0;c<3;c++)dst[di+c]=Math.round((pixels[si+c]*sa+dst[di+c]*da*(1-sa))/oa);
  dst[di+3]=Math.round(oa*255);
};
const getFrame = (atlas,index) => {const tile=new Uint8Array(32*40*4),sx=(index%4)*32,sy=Math.floor(index/4)*40;for(let y=0;y<40;y++)for(let x=0;x<32;x++){const si=((sy+y)*atlas.width+sx+x)*4,di=(y*32+x)*4;blend(tile,atlas,si,di)}return tile};
const composite = (bodyId,hairId,index) => {
  const dst=new Uint8Array(32*40*4),parts=sources[bodyId],hair=sources[hairId];
  for(const [source,key] of [[hair,'hair-back'],[parts,'outfit-base'],[parts,'head-base'],[hair,'hair-front'],[parts,'details']]){const image=getFrame(source[key],index);for(let i=0;i<image.length;i+=4)blend(dst,image,i,i)}
  return dst;
};
const width=300,height=190,scale=4,frames=[];
for(let phase=0;phase<4;phase++){
  const rgba=new Uint8Array(width*height*4);
  for(let i=0;i<rgba.length;i+=4){rgba[i]=30;rgba[i+1]=49;rgba[i+2]=40;rgba[i+3]=255}
  for(const [id,x] of [['c01',18],['c02hair',154]]){
    const sprite=id==='c01'?composite('c01','c01',16+phase):composite('c01','c02',16+phase);
    for(let y=0;y<40;y++)for(let xx=0;xx<32;xx++){const si=(y*32+xx)*4,rgbaColor=sprite.subarray(si,si+4);if(rgbaColor[3]===0)continue;for(let oy=0;oy<scale;oy++)for(let ox=0;ox<scale;ox++){const di=((12+y*scale+oy)*width+x+xx*scale+ox)*4;rgba.set(rgbaColor,di)}}
  }
  frames.push(rgba);
}
const allPixels=new Uint8Array(frames.reduce((sum,frame)=>sum+frame.length,0));let offset=0;for(const frame of frames){allPixels.set(frame,offset);offset+=frame.length}
const palette=quantize(allPixels,256,{format:'rgb565'});
const gif=GIFEncoder({initialCapacity:32*1024});
frames.forEach((frame,i)=>gif.writeFrame(applyPalette(frame,palette),width,height,{palette,delay:140,repeat:0,first:i===0}));
gif.finish();fs.writeFileSync(out,gif.bytes());
console.log(`Wrote ${path.relative(root,out)} · 4 walk frames · 140 ms/frame · left C01 hair, right C02 hair`);

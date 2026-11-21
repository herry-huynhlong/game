import fs from 'node:fs';import path from 'node:path';import{fileURLToPath}from'node:url';import{PNG}from'pngjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),assets=path.join(root,'public/assets/npc-paperdoll-lab/presets'),registry=JSON.parse(fs.readFileSync(path.join(root,'art/source/npc-modular/paperdoll-presets-v1.json'),'utf8')),outDir=path.join(root,'art/source/npc-modular/paperdoll-presets-preview');fs.mkdirSync(outDir,{recursive:true});
const dirs=[['front',0],['back',1],['side',2],['walk',16]],glyphs={P:['110','101','110','100','100'],'0':['111','101','101','101','111'],'1':['010','110','010','010','111'],'2':['110','001','010','100','111'],'3':['110','001','010','001','110'],'4':['101','101','111','001','001'],'5':['111','100','110','001','110'],'6':['011','100','110','101','010'],'7':['111','001','010','010','010'],'8':['010','101','010','101','010'],'9':['010','101','011','001','110']};
for(const scale of[1,2,4])for(const[view,start]of dirs){const cellW=32*scale,cellH=52*scale,cols=6,rows=4,out=new PNG({width:cols*cellW,height:rows*cellH});
  for(let n=0;n<24;n++){const p=PNG.sync.read(fs.readFileSync(path.join(assets,`${registry.presets[n].id.toLowerCase()}.png`))),frame=start+(view==='walk'?n%4:0),sx=(frame%4)*32,sy=Math.floor(frame/4)*40,ox=(n%cols)*cellW,oy=Math.floor(n/cols)*cellH;
    for(let y=0;y<cellH;y++)for(let x=0;x<cellW;x++){const i=((oy+y)*out.width+ox+x)*4;out.data.set([37,60,49,255],i)}
    const dx=ox+cellW/2-16*scale,dy=oy+8*scale;for(let y=0;y<40;y++)for(let x=0;x<32;x++){const si=((sy+y)*p.width+sx+x)*4;if(!p.data[si+3])continue;for(let yy=0;yy<scale;yy++)for(let xx=0;xx<scale;xx++){const di=((dy+y*scale+yy)*out.width+dx+x*scale+xx)*4;out.data.set(p.data.subarray(si,si+4),di)}}
    const label=registry.presets[n].id;for(let c=0;c<label.length;c++){const rowsOfGlyph=glyphs[label[c]];for(let gy=0;gy<5;gy++)for(let gx=0;gx<3;gx++)if(rowsOfGlyph[gy][gx]==='1')for(let yy=0;yy<scale;yy++)for(let xx=0;xx<scale;xx++){const x=ox+(4+c*4+gx)*scale+xx,y=oy+2*scale+gy*scale+yy,i=(y*out.width+x)*4;out.data.set([232,204,137,255],i)}}
  }
  fs.writeFileSync(path.join(outDir,`paperdoll-24-${view}-${scale}x.png`),PNG.sync.write(out));
}
console.log(`Rendered ${dirs.length*3} labeled contact sheets at 1x, 2x, and 4x.`);

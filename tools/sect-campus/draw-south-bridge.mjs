import fs from 'node:fs';
import {PNG} from 'pngjs';

// Native pixels for a north–south bridge. The rail profiles cast a shadow
// across the masonry on the same side as the campus architecture.
const width = 160, height = 112;
const png = new PNG({width,height});
const palette = {
  shadow: [28,48,44,107], rim: [52,66,61,255], dark: [65,79,72,255],
  seam: [84,95,85,255], stone: [121,130,113,255], warm: [129,136,117,255],
  light: [154,158,132,255], gleam: [171,173,141,255], moss: [99,122,87,255],
};
function fill(left,top,w,h,color) {
  for(let y=top;y<top+h;y++)for(let x=left;x<left+w;x++)png.data.set(palette[color],(y*width+x)*4);
}
fill(12,13,142,93,'shadow');
fill(9,9,142,89,'rim');
fill(15,10,130,84,'seam');
for(let row=0;row<8;row++){
  const top=10+row*10;
  for(let col=0;col<9;col++){
    const x=Math.max(16,16+col*16-(row%2)*8), end=Math.min(144,31+col*16-(row%2)*8);
    if(end-x<2)continue;
    const variant=(row*11+col*13)%7;
    fill(x,top,end-x,9,variant<2?'warm':'stone');
    fill(x+1,top+1,end-x-1,1,'light');
    if(variant===3&&end-x>8)fill(x+4,top+5,4,1,'seam');
  }
}
for(const y of [5,10,88,94]){
  fill(15,y,130,4,'seam');
  fill(16,y,128,1,y<30?'light':'stone');
}
for(const x of [5,141]){
  fill(x+6,13,10,78,'dark');
  fill(x+2,10,11,78,'rim');
  fill(x+2,10,9,75,'stone');
  fill(x+3,10,5,75,'light');
  for(const y of [6,30,55,80]){
    fill(x,y+5,14,16,'dark');
    fill(x,y,14,13,'rim');
    fill(x+1,y+1,12,8,'stone');
    fill(x+1,y+1,12,3,'gleam');
    fill(x+3,y+9,7,2,'seam');
  }
}
for(const [x,y] of [[20,90],[24,93],[135,11],[131,13],[30,90],[125,97]])fill(x,y,3,2,'moss');
fs.writeFileSync(new URL('../../public/assets/sect-campus/south-bridge.png',import.meta.url),PNG.sync.write(png));

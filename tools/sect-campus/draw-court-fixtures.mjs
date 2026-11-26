import fs from 'node:fs';
import {PNG} from 'pngjs';

const cellWidth=128, height=72, png=new PNG({width:3*cellWidth,height});
const rect=(frame,x,y,w,h,hex,alpha=255)=>{
  const color=[parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16),alpha];
  for(let row=y;row<y+h;row++)for(let col=x;col<x+w;col++)
    png.data.set(color,(row*png.width+col+frame*cellWidth)*4);
};
// Light on the upper-left steps, darker risers and alternating masonry joints.
for(const [i,width] of [78,92,108,120].entries()){
  const x=(cellWidth-width)/2,y=35+i*7;
  rect(0,x,y,width,8,'444e4b');
  rect(0,x+1,y,width-2,5,'899688');
  rect(0,x+2,y,width-4,1,'b9bca6');
  for(let joint=x+13+i*5;joint<x+width-6;joint+=18)rect(0,joint,y+2,1,4,'697970');
  rect(0,x+1,y+5,width-2,2,'69766d');
}
// A roofed board with three pinned slips.
rect(1,28,62,77,5,'29382c',100);
for(const x of [31,92]){
  rect(1,x,24,6,40,'3f2c22');
  rect(1,x+1,25,2,35,'a87747');
}
rect(1,34,22,60,31,'392a22');
rect(1,37,25,54,25,'764a32');
for(const [i,h] of [14,18,12].entries()){
  const x=40+i*17,y=28+(i%2)*2;
  rect(1,x,y,12,h,'dcc69a');
  rect(1,x+5,y,2,2,'aa5c42');
  for(let line=y+4;line<y+h-2;line+=3)rect(1,x+2,line,6+i%2,1,'a68160');
}
rect(1,27,19,74,5,'244b46');
rect(1,30,17,68,2,'527265');
rect(1,28,23,72,2,'ad8055');
// Low wooden bench, with open space under both ends.
rect(2,31,64,69,4,'29382c',94);
for(const x of [39,85]){
  rect(2,x,52,5,12,'473222');
  rect(2,x+1,55,2,8,'98704b');
}
rect(2,35,48,59,9,'473222');
rect(2,35,48,59,5,'9e6f48');
rect(2,37,49,55,1,'c4965f');
rect(2,36,54,57,1,'6e482e');
fs.writeFileSync(new URL('../../public/assets/sect-campus/court-fixtures.png',import.meta.url),PNG.sync.write(png));

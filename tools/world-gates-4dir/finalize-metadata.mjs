import fs from 'node:fs';

const file=new URL('../../public/assets/world-gates-4dir/directional-gates.json',import.meta.url);
const meta=JSON.parse(fs.readFileSync(file,'utf8'));
const names=['GATE-NORTH','GATE-SOUTH','GATE-EAST','GATE-WEST'];
meta.meta.frameTags=names.map((name,i)=>({name,from:i,to:i,direction:'forward',color:['#d4b168ff','#c7834fff','#5ca8a1ff','#668b61ff'][i]}));
meta.meta.gateDirections=names.map((name,i)=>({name,direction:name.slice(5).toLowerCase(),frame:i,rotatedTexture:false,walkAxis:i<2?'north-south':'east-west'}));
fs.writeFileSync(file,JSON.stringify(meta,null,2)+'\n');

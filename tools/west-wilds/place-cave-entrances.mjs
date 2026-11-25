import fs from 'node:fs';

const path='maps/world-rebuild-1b.tmj';
const raw=fs.readFileSync(path,'utf8'),map=JSON.parse(raw);
const layer=name=>map.layers.find(l=>l.name===name);
const prop=(o,name)=>o.properties?.find(p=>p.name===name)?.value;
const veins=layer('SpiritVeins').objects;
const fixed=veins.filter(o=>!prop(o,'veinId').includes('-vein-'));
const stations=[...layer('SectCampusStations').objects,...layer('SocietyStations').objects];
const solids=['Collision','ObjectFootprints','SectCampusCollision','SocietyCollision'].flatMap(name=>layer(name).objects);
const blocked=(x,y,margin)=>solids.some(o=>x+margin>o.x&&x-margin<o.x+o.width&&y+margin>o.y&&y-margin<o.y+o.height);
const w=map.width,t=map.tilewidth;
const index=(x,y)=>Math.floor(y/t)*w+Math.floor(x/t);
const water=layer('Water').data,roads=layer('Roads').data;
const reserved=[...fixed,...stations.filter(o=>prop(o,'site')==='mine')];
const tiles=layer('GroundBase').data;
const terrain=(x,y)=>x>=32&&y>=32&&x<map.width*t-32&&y<map.height*t-32&&
  tiles[index(x,y)]&&!water[index(x,y)]&&!blocked(x,y,12);
const accessible=(x,y)=>terrain(x,y)&&[[32,0],[-32,0],[0,32],[0,-32]].filter(([dx,dy])=>terrain(x+dx,y+dy)).length>=2;

for(const o of veins){
  if(fixed.includes(o))continue;
  const grade=prop(o,'grade'), id=prop(o,'veinId');
  const candidates=[];
  const center={x:o.x,y:o.y};
  for(let dy=-448;dy<=448;dy+=32)for(let dx=-448;dx<=448;dx+=32){
    if(dx*dx+dy*dy>448**2)continue;
    const x=Math.round(center.x/32)*32+dx+16,y=Math.round(center.y/32)*32+dy+16;
    if(grade===1&&(x<6100||y<5100)||grade===2&&(x<3100||x>3960)||grade===3&&x>1930)continue;
    if(reserved.some(s=>Math.hypot(s.x-x,s.y-y)<168))continue;
    if(stations.some(s=>Math.hypot(s.x-x,s.y-y)<(prop(s,'site')==='farm'?120:54)))continue;
    if(roads[index(x,y)]||blocked(x,y,20)||!accessible(x,y))continue;
    candidates.push({x,y,distance:Math.hypot(center.x-x,center.y-y)});
  }
  candidates.sort((a,b)=>a.distance-b.distance||a.y-b.y||a.x-b.x);
  const position=candidates[0];
  if(!position)throw new Error('No separate accessible entrance for '+id);
  o.x=position.x;o.y=position.y;reserved.push(o);
}
// Preserve every other Tiled layer byte-for-byte.
const layerStart=raw.indexOf('"name": "SpiritVeins"');
const start=raw.indexOf('      "objects":',layerStart);
const end=raw.indexOf('\n    }',start);
if(start<0||end<0)throw Error('Could not isolate the SpiritVeins object layer');
const objectsText='      "objects": '+JSON.stringify(veins,null,2).replaceAll('\n','\n      ');
const updated=raw.slice(0,start)+objectsText+raw.slice(end);
const checked=JSON.parse(updated).layers.find(l=>l.name==='SpiritVeins').objects;
if(JSON.stringify(checked)!==JSON.stringify(veins))throw Error('Unexpected serialization of the entrance layer');
fs.writeFileSync(path,updated);
console.log('SpiritVeins minimum separation:',Math.round(Math.min(...veins.flatMap((a,i)=>veins.slice(i+1).map(b=>Math.hypot(a.x-b.x,a.y-b.y))))));

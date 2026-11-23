import fs from 'node:fs';
const url=new URL('../../maps/world-rebuild-1b.tmj',import.meta.url);
const source=fs.readFileSync(url,'utf8'),map=JSON.parse(source);
const layer=map.layers.find(l=>l.name==='FaunaZones');
const presets=[
  ['forest-rim','Bìa rừng Thanh Ảnh','wolf',5,17000,1472,1472,512,1888],
  ['forest-valley','Thung lũng Lang Ảnh','wolf',5,23000,560,1456,848,1824],
  ['north-foothills','Chân núi Xích Nham','boar',5,24000,2850,360,1430,752],
  ['east-wetland','Bãi ẩm ven sông phía Đông','toad',5,19000,5700,680,570,1200],
  ['south-wetland','Bãi lau hạ lưu phía Đông','toad',4,21000,5740,2640,570,1260],
];
const keys=['zoneId','species','cap','respawnMs','activityRadius','leash','safeBuffer'];
const ids=new Map(layer.objects.map(o=>[o.properties.find(p=>p.name==='zoneId').value,o.id]));
let next=map.nextobjectid;
const objects=presets.map(([zoneId,name,species,cap,respawnMs,x,y,width,height])=>({
  id:ids.get(zoneId)??next++,name,type:'monster-habitat',x,y,width,height,rotation:0,visible:true,
  properties:[zoneId,species,cap,respawnMs,species==='wolf'?160:145,species==='wolf'?250:225,90].map((value,i)=>({name:keys[i],type:typeof value==='number'?'int':'string',value})),
}));
const start=source.indexOf('"name": "FaunaZones"'),objectStart=source.indexOf('[',source.indexOf('"objects":',start));
const blockEnd=source.indexOf('\n   ]',objectStart)+5;
if(start<0||blockEnd<5)throw Error('missing fauna zone array');
const serialize=JSON.stringify(objects,null,1).replace(/\n/g,'\n   ');
const revised=(source.slice(0,objectStart)+serialize+source.slice(blockEnd+1)).replace(/"nextobjectid": \d+/,`"nextobjectid": ${next}`);
JSON.parse(revised);
fs.writeFileSync(url,revised);
console.log(objects.map(o=>[o.name,o.x,o.y,o.width,o.height]));

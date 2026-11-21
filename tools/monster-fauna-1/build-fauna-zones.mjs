import fs from 'node:fs';
const file='maps/world-rebuild-1b.tmj',map=JSON.parse(fs.readFileSync(file,'utf8'));
map.layers=map.layers.filter(l=>l.name!=='FaunaZones');
const source=map.layers.find(l=>l.name==='EncounterZones');
const specs={
  'southern-outskirts':{title:'Ngoại thành · thú rừng cấp thấp',counts:{deer:2,scorpion:1,snake:1},habitat:'grass-dry-rock-edge'},
  'forest-outer':{title:'Rìa rừng · bãi ăn và bụi đá',counts:{deer:3,scorpion:2,snake:1},habitat:'forest-edge'},
  'forest-middle':{title:'Rừng giữa · khe đá',counts:{deer:1,scorpion:2,snake:2},habitat:'rocky-forest'},
  'forest-deep':{title:'Rừng sâu · fauna cấp thấp',counts:{scorpion:2,snake:2},habitat:'deep-forest-edge'},
};
const objects=source.objects.map(zone=>{const id=zone.properties.find(p=>p.name==='zoneId').value,s=specs[id];return s?{id:map.nextobjectid++,name:s.title,type:'fauna-zone',x:zone.x,y:zone.y,width:zone.width,height:zone.height,rotation:0,visible:true,properties:[{name:'zoneId',type:'string',value:id},{name:'habitat',type:'string',value:s.habitat},{name:'speciesCounts',type:'string',value:JSON.stringify(s.counts)},{name:'maxPopulation',type:'int',value:Object.values(s.counts).reduce((a,b)=>a+b,0)}]}:null}).filter(Boolean);
map.layers.push({id:map.nextlayerid++,name:'FaunaZones',type:'objectgroup',visible:true,opacity:1,x:0,y:0,draworder:'topdown',objects});
map.nextlayerid++;fs.writeFileSync(file,JSON.stringify(map,null,1)+'\n');
console.log(JSON.stringify({layer:'FaunaZones',zones:objects.map(o=>({id:o.properties[0].value,bounds:[o.x,o.y,o.width,o.height],counts:JSON.parse(o.properties[2].value)}))},null,2));

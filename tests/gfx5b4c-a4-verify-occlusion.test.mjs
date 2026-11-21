import assert from 'node:assert/strict';import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const result=read('art/previews/gfx5b4c-a4-verify/occlusion-trace.json'),map=read('maps/thanh_van_world.tmj'),rects=map.layers.find(l=>l.name==='Collision').objects;
assert.equal(result.storageUnchanged,true);assert.deepEqual(result.errors,[]);assert.equal(result.legs.length,7);
for(const leg of result.legs){
 assert.ok(leg.ok&&leg.reached,`${leg.site.name}: unreachable`);
 for(const s of leg.samples){
  const x=s.x-9,y=s.y-12;
  for(const o of rects){const iw=Math.min(x+18,o.x+o.width)-Math.max(x,o.x),ih=Math.min(y+10,o.y+o.height)-Math.max(y,o.y);assert.ok(!(iw>.25&&ih>.25),`${leg.site.name}: sampled collider overlap ${o.id}`)}
 }
 const spriteName=leg.site.name.startsWith('house')?'disciple_house':leg.site.name.startsWith('large-tree')?'ancient_tree':'spirit_tree';
 const prop=leg.objects.find(o=>o.frame===spriteName);assert.ok(prop,`missing ${spriteName}`);
 if(leg.site.name.endsWith('front'))assert.ok(leg.last.depth>prop.depth,`${leg.site.name}: actor not in front`);
 if(leg.site.name.endsWith('back'))assert.ok(leg.last.depth<prop.depth,`${leg.site.name}: actor not behind`);
}
console.log('PASS: seven real-world checkpoints; sampled collision rectangles and front/back depth ordering.');

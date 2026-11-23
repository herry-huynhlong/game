import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { placeCityResidents } from '../src/world/CityResidents.js';

const read=name=>JSON.parse(readFileSync(new URL('../maps/'+name,import.meta.url),'utf8'));
const previous=read('world-rebuild-1b-before-city-redesign.tmj');
const city=read('world-rebuild-1b.tmj');
const layer=(map,name)=>map.layers.find(item=>item.name===name);
const prop=(obj,key)=>obj.properties?.find(p=>p.name===key)?.value;
assert.deepEqual([city.width,city.height,city.tilewidth,city.tileheight],[224,144,32,32]);
for(const name of ['GroundBase','Roads','Water','Shore','Cliffs','GroundDetails','TerrainTransitions']){
  const original=layer(previous,name).data, revised=layer(city,name).data;
  for(let i=0;i<original.length;i++){
    const x=i%city.width,y=Math.floor(i/city.width);
    if(x>=65&&x<=150&&y>=40&&y<=94)continue;
    assert.equal(revised[i],original[i],name+' outside the city at '+x+','+y);
  }
}
const markers=layer(city,'NavigationMarkers').objects;
const previousNav=layer(previous,'NavigationMarkers').objects;
const legacyIds=new Map(markers.map(m=>[m.id,m]));
assert.ok(previousNav.every(m=>JSON.stringify(m)===JSON.stringify(legacyIds.get(m.id))));
const decorations=layer(city,'StaticDecor').objects.filter(o=>prop(o,'district')==='city-redesign');
assert.ok(decorations.filter(o=>prop(o,'kind')==='city-house').length>=35);
assert.equal(decorations.filter(o=>prop(o,'kind')==='city-workshop').length,4);
assert.ok(decorations.some(o=>prop(o,'cityEffect')==='bloom'));
assert.deepEqual(layer(city,'MarketDecor'),layer(previous,'MarketDecor'));
assert.deepEqual(layer(city,'FaunaZones'),layer(previous,'FaunaZones'));
assert.ok(layer(city,'CityEdges').data.some(Boolean));
const collision=layer(city,'Collision').objects;
const newSolids=collision.filter(o=>prop(o,'kind')==='city-redesign-solid');
const open=(x,y,w,h)=>!collision.some(r=>x+w>r.x&&x-w<r.x+r.width&&y+h>r.y&&y-h<r.y+r.height);
for(const marker of markers.filter(m=>prop(m,'regionId')==='city'))assert.ok(open(marker.x,marker.y,9,5),marker.name);
const populationPins=layer(city,'PopulationAnchors').objects;
assert.ok(populationPins.every(o=>open(o.x,o.y,9,5)));
assert.deepEqual(populationPins.map(o=>[o.id,prop(o,'anchorId')]),layer(previous,'PopulationAnchors').objects.map(o=>[o.id,prop(o,'anchorId')]));
for(const set of city.tilesets.filter(t=>/Qingyun(Courtyard|Palace)/.test(t.name))){
  const file=new URL(set.image,new URL('../maps/',import.meta.url));
  const png=PNG.sync.read(readFileSync(file));
  assert.deepEqual([png.width,png.height],[set.imagewidth,set.imageheight]);
}
const blocked=newSolids.find(r=>r.width>100);
const point={x:blocked.x+blocked.width/2,y:blocked.y+blocked.height/2};
const citizen={id:'saved-npc',alive:true,...point,home:{...point},actionTarget:{...point},profession:'dan_thuong',
  inventory:[{itemId:'ration',count:7}],xp:38,memories:[{kind:'work',day:1,text:'saved'}]};
const unaffected={id:'safe',alive:true,x:3568,y:2192,xp:12};
const migrate=npcs=>placeCityResidents(npcs,newSolids,open,()=>true,[],false);
const clone=structuredClone([citizen,unaffected]);
assert.equal(migrate([citizen,unaffected]),1);
assert.equal(migrate(clone),1);
assert.deepEqual(clone,[citizen,unaffected]);
assert.ok(open(citizen.x,citizen.y,8,4)&&open(citizen.home.x,citizen.home.y,8,4));
assert.equal(citizen.xp,38);
assert.equal(citizen.inventory[0].count,7);
assert.equal(citizen.memories[0].text,'saved');
assert.equal(migrate(clone),0);
console.log('CITY REDESIGN: outside terrain and existing routes preserved; 108-ready city anchors, tilesets and deterministic save migration verified.');

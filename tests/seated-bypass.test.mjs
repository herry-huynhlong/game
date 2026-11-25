import assert from 'node:assert/strict';
import { GroundOccupancy } from '../src/world/GroundOccupancy.js';
import { findSeatedBypass } from '../src/world/SeatedBypass.js';
import { meditationAnchors } from '../src/world/SeatedCharacterArt.js';

const ground=(x,y,w,h)=>x-w>=0&&x+w<=320&&y-h>=0&&y+h<=200;
const walker={id:'walker',x:68,y:90,alive:true};
const sitter={id:'sitter',x:88,y:90,alive:true,seated:true};
const neighbor={id:'neighbor',x:88,y:120,alive:true,seated:true};
const grid=new GroundOccupancy(ground);
const sync=()=>grid.sync([walker,sitter,neighbor],[],null,[],n=>n.seated);
sync();
const body=grid.bodies.get(walker.id),blocking=grid.bodies.get(sitter.id);
assert.equal(blocking.width,22);
assert.equal(grid.blockingBody(body,72,90,true),blocking);
const target={x:180,y:90};
const route=findSeatedBypass(grid,body,walker,target,blocking);
assert.ok(route?.length>=2);
assert.deepEqual(findSeatedBypass(grid,body,walker,target,blocking),route);
let previous=walker;
for(const point of route){
  assert.ok(grid.clearSegment(body,previous,point));
  const result=grid.advance(body,point.x,point.y,false);
  assert.ok(result);
  previous=point;
}
assert.ok(body.x>blocking.x+blocking.radius);
assert.equal(grid.overlaps().length,0);
sitter.seated=false;
sync();
assert.equal(grid.bodies.get(sitter.id).width,16);
assert.equal(grid.blockingBody(body,72,90,true),null);
sitter.alive=false;
sync();
assert.equal(grid.bodies.has(sitter.id),false);

const narrow=new GroundOccupancy((x,y,w,h)=>ground(x,y,w,h)&&y-h>=82&&y+h<=98);
sitter.alive=true;sitter.seated=true;
narrow.sync([walker,sitter],[],null,[],n=>n.seated);
assert.equal(findSeatedBypass(narrow,narrow.bodies.get(walker.id),walker,target,narrow.bodies.get(sitter.id)),null);
const moving={id:'passing-late',x:68,y:99,alive:true};
sitter.seated=false;
grid.sync([moving,sitter],[],null,[],n=>n.seated);
const movingBody=grid.bodies.get(moving.id),next={x:107,y:99};
assert.equal(grid.clearSegment(movingBody,moving,next),true);
sitter.seated=true;
grid.sync([moving,sitter],[],null,[],n=>n.seated);
assert.equal(grid.clearSegment(movingBody,moving,next),false);
assert.ok(findSeatedBypass(grid,movingBody,moving,{x:140,y:99},grid.bodies.get(sitter.id)));

for(const [bodyType,outfit] of [['male_slim','taoist'],['male_slim','swordsman'],['male_strong','demon'],
  ['male_strong','monk'],['female_slender','fairy'],['male_elder','taoist']]){
  for(const direction of ['up','down','left','right']){
    const look={bodyType,outfit};
    const stages=[1,2,3].map(stage=>meditationAnchors(look,direction,stage));
    assert.ok(stages[0].neck[1]<stages[1].neck[1]&&stages[1].neck[1]<stages[2].neck[1]);
    for(const pose of stages){
      assert.deepEqual(pose.source.map((coordinate,i)=>coordinate+pose.shift[i]),pose.neck);
      assert.equal(pose.body[1]-pose.neck[1],7);
    }
    assert.equal(meditationAnchors(look,direction,3,1).body[1]-stages[2].body[1],1);
  }
}
console.log('Seated anchors, stable swept bypass, blocked corridor, standing and death footprint transitions passed.');

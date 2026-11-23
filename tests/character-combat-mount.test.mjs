import assert from 'node:assert/strict';
import { CharacterCombat } from '../src/world/CharacterCombat.js';
import { mountedPositionAllowed } from '../src/world/MountSystem.js';

function advance(combat, milliseconds) {
  const events=[];
  combat.advance(milliseconds,(event,action)=>events.push([event,action.name,action.direction]));
  return events;
}
for(const [weapon,moves] of [['sword',['swordSlash','swordDiagonal','swordThrust']],['saber',['saberSweep','saberOverhead','saberSpin']]]) {
  const combat=new CharacterCombat();
  combat.equip(weapon,'down',false);
  for(const [i,move] of moves.entries()){
    const direction=['right','left','up'][i];
    assert.equal(combat.attack(direction),true);
    assert.equal(combat.attack(direction),false);
    assert.deepEqual(advance(combat,900),[['strike',move,direction]]);
    assert.deepEqual(advance(combat,900),[]);
  }
}
const combat=new CharacterCombat();
combat.equip('crossbow','up',false);
assert.equal(combat.attack('up'),true);
assert.deepEqual(advance(combat,94),[]);
assert.deepEqual(advance(combat,1),[['bolt','crossbowShoot','up']]);
assert.equal(combat.loaded,false);
combat.equip('sword','up',false);
combat.equip('crossbow','up',false);
assert.equal(combat.loaded,false);
advance(combat,800);
assert.equal(combat.attack('up'),true);
assert.deepEqual(advance(combat,800),[['loaded','crossbowReload','up']]);
assert.equal(combat.loaded,true);
assert.equal(combat.attack('down'),true);
combat.cancel();
assert.deepEqual(advance(combat,800),[]);
assert.equal(mountedPositionAllowed(15,15,(x,y)=>x>0&&y>0,10),true);
assert.equal(mountedPositionAllowed(5,15,(x,y)=>x>0&&y>0,10),false);
console.log('PASS: action timings, directional events, one shot before reload, cancel and mount footprint');

import assert from 'node:assert/strict';
import {build} from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gfx5b4-'));
try{
 const target=path.join(dir,'prototype.cjs');
 await build({entryPoints:['src/dao/CharacterPrototype.ts'],outfile:target,bundle:true,platform:'node',format:'cjs',logLevel:'silent'});
 const {prototypeAnimation}=createRequire(import.meta.url)(target);
 const npc={id:'qingyun-07',profession:'nong_dan',gender:'nam',equippedWeapon:null};
 const original=JSON.stringify(npc);
 assert.equal(prototypeAnimation(npc,'walk_up',true,null),'prototype-C01_walk_up');
 for(const action of ['attack_1_up','cast_down','hurt_down','death_left','run_down'])assert.equal(prototypeAnimation(npc,action,true,null),null);
 assert.equal(prototypeAnimation({...npc,equippedWeapon:'qingfeng_sword'},'walk_up',true,null),null);
 assert.equal(prototypeAnimation(npc,'walk_up',true,npc.id),null);
 assert.equal(prototypeAnimation(npc,'walk_up',false,null),null);
 assert.equal(prototypeAnimation({...npc,profession:'tu_si'},'walk_up',true,null),null);
 assert.equal(prototypeAnimation({...npc,gender:'nữ'},'walk_up',true,null),null);
 assert.equal(JSON.stringify(npc),original);
 console.log('GFX.5B.4 prototype: opt-in mapping, identity, equipment/possession/action fallback and non-mutation passed.');
}finally{fs.rmSync(dir,{recursive:true,force:true})}

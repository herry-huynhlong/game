import assert from 'node:assert/strict';
import {build} from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gfx5b4b-direction-'));
try{
 const target=path.join(dir,'direction.cjs');
 await build({entryPoints:['src/dao/VisualDirection.ts'],outfile:target,bundle:true,platform:'node',format:'cjs',logLevel:'silent'});
 const {visualDirection}=createRequire(import.meta.url)(target);
 for(const [x,y,want] of [[1,0,'right'],[1,1,'down_right'],[0,1,'down'],[-1,1,'down_left'],[-1,0,'left'],[-1,-1,'up_left'],[0,-1,'up'],[1,-1,'up_right']])assert.equal(visualDirection(x,y,'down'),want);
 assert.equal(visualDirection(0,0,'up_left'),'up_left');
 assert.equal(visualDirection(NaN,1,'up'),'up');
 const at=degrees=>[Math.cos(degrees*Math.PI/180),Math.sin(degrees*Math.PI/180)];
 assert.equal(visualDirection(...at(25),'right'),'right');
 assert.equal(visualDirection(...at(30),'right'),'down_right');
 console.log('GFX.5B.4B directions: eight sectors, stationary retention and hysteresis passed.');
}finally{fs.rmSync(dir,{recursive:true,force:true})}

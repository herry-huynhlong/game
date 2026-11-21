import assert from 'node:assert/strict';
import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync('art/previews/gfx5b4c-a4-lab/trace.json','utf8'));
const octants=['right','down_right','down','down_left','left','up_left','up','up_right'];
const expected={N:'up',NE:'up_right',E:'right',SE:'down_right',S:'down',SW:'down_left',W:'left',NW:'up_left'};
assert.equal(data.finished,true);
for(const sample of data.trace){
 if(Math.hypot(sample.dx,sample.dy)<0.01||!sample.animation.startsWith('walk_'))continue;
 const actual=octants[(Math.round(Math.atan2(sample.dy,sample.dx)/(Math.PI/4))+8)%8];
 assert.equal(sample.animation,`walk_${actual}`,`movement/animation mismatch at ${sample.time} ms`);
}
for(const [name,direction] of Object.entries(expected)){
 const samples=data.trace.filter(s=>s.segment===name&&s.animation===`walk_${direction}`&&Math.hypot(s.dx,s.dy)>=0.01);
 assert.ok(samples.length>=6,`${name}: insufficient moving samples`);
 assert.equal(new Set(samples.map(x=>x.frame)).size,6,`${name}: did not observe all six walk frames`);
}
const idle=data.trace.filter(s=>s.state==='idle');assert.ok(idle.length>=4,'missing stationary hold');
assert.ok(Math.hypot(idle.at(-1).x-idle[0].x,idle.at(-1).y-idle[0].y)<0.1,'actor moved during idle hold');
console.log('A4 trace passed: actual displacement matches eight animations, six frames per direction, stationary hold.');

import assert from 'node:assert/strict';
import {WorldMapTransform} from '../src/world/MinimapCamera.js';

const transform=new WorldMapTransform(7168,4608),box={left:20,top:80,width:224,height:144};
for(const[screenX,screenY,worldX,worldY]of[[20,80,0,0],[244,224,7168,4608],[132,152,3584,2304],[209.2,108.8,6054.4,921.6]]){const point=transform.mapToWorld(screenX,screenY,box);assert.ok(Math.abs(point.x-worldX)<1e-7);assert.ok(Math.abs(point.y-worldY)<1e-7);const normalized=transform.worldToMap(point.x,point.y);assert.ok(Math.abs(normalized.x-(screenX-box.left)/box.width)<1e-7);assert.ok(Math.abs(normalized.y-(screenY-box.top)/box.height)<1e-7)}
assert.deepEqual(transform.mapToWorld(-100,900,box),{x:0,y:4608});
assert.deepEqual(transform.cameraRect({worldView:{x:-100,y:100,width:800,height:700}}),{left:0,top:100/4608,width:700/7168,height:700/4608});
assert.deepEqual(transform.cameraRect({worldView:{x:0,y:0,width:7168,height:4608}}),{left:0,top:0,width:1,height:1});
assert.deepEqual(transform.cameraRect({scrollX:100,scrollY:200,width:800,height:600,zoom:2}),{left:100/7168,top:200/4608,width:400/7168,height:300/4608});
console.log('MINIMAP.CAMERA.1 transform tests passed: map/world coordinates, clamping, camera clipping, zoom-aware view size and full-world overview.');

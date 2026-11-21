import fs from 'node:fs';
for (const [id,fps,duration] of [['FishCommon',1000/140,140],['FishSpirit',1000/180,180]]) {
  const file=`public/assets/fauna/fish/${id}.json`;
  const exported=JSON.parse(fs.readFileSync(file,'utf8'));
  const frames=Array.isArray(exported.frames)?exported.frames:Object.values(exported.frames);
  if(frames.length!==6||frames.some(f=>f.frame.w!==40||f.frame.h!==32))throw new Error(`${id} frame sheet mismatch`);
  exported.animations={swim:{from:0,to:5,loop:true,frameRate:fps,durationsMs:Array(6).fill(duration)}};
  exported.pivot={x:20,y:16};
  exported.pixelArt={source:'Aseprite Lua hand-authored pixels',layers:['01 Soft underwater shadow','02 Tail and caudal rays','03 Body volume and scales','04 Dorsal and pectoral fins','05 Face and markings'],sourceFile:`${id}.aseprite`,noTrim:true};
  fs.writeFileSync(file,JSON.stringify(exported,null,2)+'\n');
}

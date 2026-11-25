import {readFileSync,writeFileSync} from 'node:fs';

const file=new URL('../../maps/world-rebuild-1b.tmj',import.meta.url);
const map=JSON.parse(readFileSync(file,'utf8'));
const layer=name=>map.layers.find(layer=>layer.name===name);
const stations=layer('SocietyStations').objects;
const art=layer('SocietyArt').objects;
const solids=['Collision','SocietyCollision','SectCampusCollision'].flatMap(name=>layer(name)?.objects??[]);
const prop=(o,name)=>o.properties.find(p=>p.name===name)?.value;
function set(o,name,value){
  const old=o.properties.find(p=>p.name===name);
  if(old)old.value=value;else o.properties.push({name,type:typeof value==='number'?'int':'string',value});
}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const open=p=>!solids.some(r=>p.x+11>r.x&&p.x-11<r.x+r.width&&p.y+7>r.y&&p.y-7<r.y+r.height);
for(const id of ['inn','tavern','tea','music','clinic']){
  const rows=stations.filter(o=>prop(o,'venue')===id);
  const seats=rows.filter(o=>prop(o,'use')==='seat');
  const occupied=rows.filter(o=>prop(o,'use')!=='seat');
  if(['inn','clinic'].includes(id)){
    seats.forEach((seat,i)=>{set(seat,'facing',i%2?'left':'right');set(seat,'table',id==='inn'?i:Math.floor(i/2));});
    continue;
  }
  const label=rows[0].name.split(' · ')[0];
  const tables=art.filter(o=>o.name===label+' · bàn trà').map(o=>({x:o.x+96,y:o.y-34}));
  const anchors=tables.map(center=>[
    {x:center.x-35,y:center.y+2,facing:'right'},
    {x:center.x+35,y:center.y+2,facing:'left'},
    {x:center.x,y:center.y+24,facing:'up'},
    {x:center.x,y:center.y-24,facing:'down'},
    {x:center.x-39,y:center.y+21,facing:'right'},
    {x:center.x+39,y:center.y+21,facing:'left'},
    {x:center.x-34,y:center.y-23,facing:'down'},
    {x:center.x+34,y:center.y-23,facing:'down'},
  ]);
  const used=[];
  const counts=[];
  for(const [i,seat] of seats.entries()){
    const preferred=id==='tea'?(i<3?0:1):Math.floor(i*anchors.length/seats.length);
    const choices=[preferred,...anchors.keys()].filter((v,i,a)=>a.indexOf(v)===i);
    let found;
    for(const table of choices){
      if((counts[table]??0)>=4)continue;
      const point=anchors[table].find(p=>open(p)&&[...occupied,...used].every(q=>distance(p,q)>=22)&&
        tables.every(c=>Math.abs(p.x-c.x)>27||Math.abs(p.y-c.y)>18));
      if(point){found={point,table};break;}
    }
    if(!found)throw Error(id+' cannot place '+seat.name);
    Object.assign(seat,{x:found.point.x,y:found.point.y});
    set(seat,'facing',found.point.facing);set(seat,'table',found.table);
    counts[found.table]=(counts[found.table]??0)+1;
    used.push(found.point);
  }
}
const token='__SOCIAL_TILES__';
const layers=map.layers.filter(l=>l.data).map(l=>{const data=l.data;l.data=token;return data;});
writeFileSync(file,JSON.stringify(map,null,2).replaceAll('"'+token+'"',()=>{
  const cells=layers.shift(),rows=[];
  for(let i=0;i<cells.length;i+=map.width)rows.push('        '+cells.slice(i,i+map.width).join(','));
  return '[\n'+rows.join(',\n')+'\n      ]';
})+'\n');

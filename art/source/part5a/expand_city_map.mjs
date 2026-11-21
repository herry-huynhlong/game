import fs from 'node:fs';
const file='maps/thanh_van_world.tmj';const map=JSON.parse(fs.readFileSync(file,'utf8'));
const property=(object,name)=>object.properties?.find(p=>p.name===name)?.value;
const oldWidth=map.width, newWidth=120, height=map.height, addCols=newWidth-oldWidth;
for(const layer of map.layers){
 if(layer.type==='tilelayer'){
  const old=layer.data;const next=[];
  for(let y=0;y<height;y++){
   const row=old.slice(y*oldWidth,(y+1)*oldWidth);
   const extension=Array(addCols).fill(layer.name==='Ground'?1:0);
   if(layer.name==='Paths'){
    const r=y;
    for(let c=oldWidth;c<newWidth;c++){
     const x=c*32+16, yy=r*32+16;
     const road=(yy>=784&&yy<880)||(yy>=480&&yy<544)||(yy>=1104&&yy<1168)||(x>=2592&&x<2656)||(x>=2976&&x<3040)||(x>=3360&&x<3424);
     if(road)extension[c-oldWidth]=17+((c+r)%16);
    }
   }
   if(layer.name==='Paths'){
    for(let c=oldWidth-3;c<oldWidth;c++){
      const x=c*32+16, yy=y*32+16;
      if(yy>=784&&yy<880)row[c]=17+((c+y)%16);
    }
   }
   next.push(...row,...extension);
  }
  layer.data=next;layer.width=newWidth;layer.height=height;
 }
}
map.width=newWidth;
const byName=Object.fromEntries(map.layers.map(l=>[l.name,l]));const cityX=2304,cityRight=3712;
byName.WorldProps.objects=byName.WorldProps.objects.filter(o=>o.x<cityX&&property(o,'source')!=='5b');
byName.Collision.objects=byName.Collision.objects.filter(o=>o.x<cityX&&!o.name?.startsWith('5b-'));
byName.Zones.objects=byName.Zones.objects.filter(o=>property(o,'zone')!=='city'&&property(o,'source')!=='5b');
map.layers=map.layers.filter(l=>l.name!=='ActivitySites');
const maxId=Math.max(...map.layers.map(l=>l.id));let objectId=Math.max(0,...byName.WorldProps.objects.map(o=>o.id),...byName.Collision.objects.map(o=>o.id),...byName.Zones.objects.map(o=>o.id))+1;
const prop=(name,x,y,rotation=0,source='5a')=>{const obj={id:objectId++,name,width:128,height:128,rotation,x,y,visible:true,properties:[{name:'sprite',type:'string',value:name},{name:'source',type:'string',value:source}],type:'',x,y};byName.WorldProps.objects.push(obj);if(name==='city_wall'){const vertical=rotation===90;byName.Collision.objects.push({id:objectId++,name:name+'_block',x:x+(vertical?50:0),y:y+(vertical?-48:-37),width:vertical?28:128,height:vertical?128:28,rotation:0,visible:true,type:'',properties:[]})}else if(name==='city_gate'||name==='sect_gate'){for(const [offsetX,post] of [[15,'left'],[91,'right']])byName.Collision.objects.push({id:objectId++,name:(source==='5b'?'5b-':'')+`${name}_${post}`,x:x+offsetX,y:y-43,width:24,height:58,rotation:0,visible:true,type:'',properties:[]})}else if(['city_hall','inn','food_hall','barracks','forge','apothecary','training_yard','market_stall','residential_house','sect_hall','meditation_hall','disciple_house','sect_storehouse'].includes(name))byName.Collision.objects.push({id:objectId++,name:(source==='5b'?'5b-':'')+name+'_base',x:x+17,y:y-35,width:94,height:27,rotation:0,visible:true,type:'',properties:[]})};
// Walled, walkable citadel district connected directly to the existing settlement road.
const zone={id:objectId++,name:'Thanh Vân Thành',x:cityX,y:64,width:cityRight-cityX,height:1472,rotation:0,visible:true,type:'',properties:[{name:'zone',type:'string',value:'city'}]};byName.Zones.objects.push(zone);
prop('city_gate',2310,890);
for(let i=0;i<8;i++){prop('city_wall',2430+i*128,330);prop('city_wall',2430+i*128,1370)}
for(let i=0;i<8;i++)prop('city_wall',3580,430+i*118,90);
prop('food_hall',2540,650);prop('market_stall',2675,760);prop('market_stall',2800,760);prop('market_stall',2675,900);prop('market_stall',2800,900);
prop('apothecary',2910,650);prop('inn',3110,670);prop('city_hall',3370,670);prop('barracks',3370,880);prop('forge',3200,1120);prop('training_yard',3030,1200);
prop('residential_house',2870,1040);prop('residential_house',3005,1040);prop('residential_house',3140,1040);
prop('farm_plot',2500,1235);prop('farm_plot',2630,1235);prop('farm_plot',2760,1235);
// Thanh Vân Tông gains a readable inner compound; Hắc Phong camps in the eastern wilds.
prop('sect_gate',600,330,0,'5b');prop('sect_hall',720,270,0,'5b');prop('meditation_hall',960,330,0,'5b');prop('disciple_house',1040,610,0,'5b');prop('sect_storehouse',800,860,0,'5b');
prop('blackwind_camp',1870,1320,0,'5b');prop('spirit_vein',2190,720,0,'5b');
const sectZone={id:objectId++,name:'Sơn Môn Thanh Vân Tông',x:500,y:180,width:680,height:800,rotation:0,visible:true,type:'',properties:[{name:'zone',type:'string',value:'sect'},{name:'source',type:'string',value:'5b'}]};byName.Zones.objects.push(sectZone);
const blackwindZone={id:objectId++,name:'Doanh địa Hắc Phong',x:1740,y:1190,width:400,height:300,rotation:0,visible:true,type:'',properties:[{name:'zone',type:'string',value:'blackwind'},{name:'source',type:'string',value:'5b'}]};byName.Zones.objects.push(blackwindZone);
// Add named navigation anchors for AI schedules; point objects do not block the path grid.
const sites=[['city-gate',2350,830],['city-market',2740,830],['city-food-hall',2595,640],['city-apothecary',2965,640],['city-inn',3175,655],['city-hall',3430,650],['city-barracks',3425,875],['city-forge',3265,1105],['city-farm',2680,1210],['city-training',3095,1175],['city-safe-yard',2510,1000],['sect-gate',650,500],['sect-cultivation',800,670],['sect-hall',780,500],['blackwind-camp',1900,1320],['jade-spring',2215,735]];
byName.ActivitySites={id:maxId+1,name:'ActivitySites',type:'objectgroup',draworder:'topdown',x:0,y:0,opacity:1,visible:true,objects:sites.map(([name,x,y])=>({id:objectId++,name,x,y,width:0,height:0,point:true,visible:true,type:'',properties:[{name:'site',type:'string',value:name}]}))};
map.layers.push(byName.ActivitySites);
fs.writeFileSync(file,JSON.stringify(map,null,2)+'\n');
console.log(`Expanded Tiled map from ${oldWidth} to ${newWidth} columns; added ${byName.WorldProps.objects.length-byName.WorldProps.objects.filter(o=>o.x<cityX).length} props and city sites.`);

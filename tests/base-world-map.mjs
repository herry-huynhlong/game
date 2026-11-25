/** Project the original world into its unchanged simulation coordinates for legacy fixtures. */
export function baseWorldMap(map){
  const westOffset=map.properties?.find(p=>p.name==='westOffsetX')?.value??0;
  if(!westOffset)return map;
  const extra=westOffset/map.tilewidth, width=map.width-extra;
  return {...map,width,layers:map.layers.map(layer=>{
    if(layer.data){
      const data=[];
      for(let y=0;y<map.height;y++)data.push(...layer.data.slice(y*map.width+extra,(y+1)*map.width));
      return {...layer,width,data};
    }
    if(layer.objects)return {...layer,objects:layer.objects.filter(o=>!o.properties?.some(p=>p.name==='westWilds'))
      .map(o=>({...o,x:o.x-westOffset}))};
    return layer;
  })};
}

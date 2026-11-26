export const worldLayout = map => Object.fromEntries(
  (map.properties ?? []).map(({name,value})=>[name,value]),
);

/** One-time split of world coordinates. IDs, inventories, timers and quest state stay intact. */
export function migrateWorldLayout(world, map) {
  const {worldLayoutVersion,oldRoadInsertionY,oldRoadOffsetY,preSectHeightPx,westOffsetX=0}=worldLayout(map);
  if(!worldLayoutVersion||(world.layoutVersion??1)>=worldLayoutVersion)return false;
  const oldHeight=(preSectHeightPx??map.heightInPixels)-oldRoadOffsetY;
  const movedStation=map.getObjectLayer('SectCampusStations')?.objects
    .filter(o=>o.properties?.some(p=>p.name==='station'&&p.value.startsWith('ore-')))
    .map(o=>{
      const priorX=o.properties.find(p=>p.name==='priorX')?.value;
      const priorY=o.properties.find(p=>p.name==='priorY')?.value;
      return {x:priorX===undefined?o.x:priorX-westOffsetX,y:(priorY??o.y)-oldRoadOffsetY};
    })??[];
  const migrateY=y=>Number.isFinite(y)&&y>=oldRoadInsertionY&&y<=oldHeight?y+oldRoadOffsetY:y;
  const visited=new WeakSet();
  function move(value){
    if(!value||typeof value!=='object'||visited.has(value))return;
    visited.add(value);
    if(Number.isFinite(value.x)&&Number.isFinite(value.y)){
      value.y=movedStation.some(p=>value.x===p.x&&value.y===p.y)?
        value.y+oldRoadOffsetY:migrateY(value.y);
    }
    if(Number.isFinite(value.targetX)&&Number.isFinite(value.targetY))value.targetY=migrateY(value.targetY);
    for(const child of Object.values(value))if(child&&typeof child==='object')move(child);
  }
  move(world);
  for(const npc of world.npcs){
    delete npc.routeIndex;
    delete npc.pathBlocked;
  }
  world.layoutVersion=worldLayoutVersion;
  return true;
}

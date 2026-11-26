const property = (object, name) => object.properties?.find(p => p.name === name)?.value;
const coordinates = point => point && Number.isFinite(point.x) && Number.isFinite(point.y);
const key = ({x, y}) => x + ':' + y;

export function migrateSectCampus(world, map, westOffset = 0) {
  const version = property(map, 'sectLayoutVersion');
  const fromVersion = world.population.sectLayoutVersion ?? 0;
  if (!version || fromVersion >= version) return false;

  const objects = name => map.getObjectLayer(name)?.objects ?? [];
  const stations = new Map(objects('SectCampusStations').map(o => [property(o, 'station'), o]));
  const art = new Map(objects('SectCampusArt').map(o => [property(o, 'buildingId'),o]));
  const moved = new Map(), undergroundEntrances = new Map(), anchors=[];
  const shift = (point, dx, dy) => {
    if (!coordinates(point)) return;
    point.x += dx;
    point.y += dy;
  };
  const previous = o => {
    if(fromVersion===2){
      const x=property(o,'v2X'),y=property(o,'v2Y');
      return Number.isFinite(x)&&Number.isFinite(y)?{x:x-westOffset,y}:null;
    }
    const v1 = fromVersion===1 || property(o,'priorX')===undefined;
    const x=property(o,v1?'v1X':'priorX'),y=property(o,v1?'v1Y':'priorY');
    return Number.isFinite(x)&&Number.isFinite(y)?{x:x-westOffset,y}:null;
  };
  for (const name of ['SectCampusStations', 'SocietyStations', 'SpiritVeins', 'NavigationMarkers']) {
    for (const object of objects(name)) {
      const old = previous(object);
      if (!old) continue;
      moved.set(key(old), object);
      if(name==='SectCampusStations')anchors.push({old,object});
      const entrance = property(object, 'veinId')??(property(object, 'site') === 'mine' ? property(object, 'id') : null);
      if (entrance) undergroundEntrances.set(entrance, object);
    }
  }
  const setPoint = (point, to) => { point.x = to.x; point.y = to.y; };
  const seen = new WeakSet();
  const shiftFrom=property(map,'sectV2ShiftFrom'),shiftBy=property(map,'sectV2Offset');
  const shiftStrip=point=>{
    if(version<3){
      if(point.y>=shiftFrom&&point.y<property(map,'sectV1HeightPx'))point.y+=shiftBy;
      return;
    }
    if(fromVersion!==2||point.y<8544||point.x<6832-westOffset||point.x>8672-westOffset)return;
    let best, range=Infinity;
    for(const anchor of anchors){
      const distance=Math.hypot(point.x-anchor.old.x,point.y-anchor.old.y);
      if(distance<range){best=anchor;range=distance;}
    }
    if(best)shift(point,best.object.x-best.old.x,best.object.y-best.old.y);
  };
  const moveKnownPoint = (point,translateStrip=false) => {
    if (!coordinates(point) || seen.has(point)) return;
    seen.add(point);
    const destination = moved.get(key(point));
    if (destination) setPoint(point, destination);
    else if(translateStrip)shiftStrip(point);
  };

  for (const node of world.environment?.resourceNodes ?? []) {
    if (!node.id.startsWith('sect-plot-')) continue;
    const destination = stations.get(node.id.slice(5));
    if (destination) setPoint(node, destination);
  }
  const buildingSites = new Map();
  for (const object of world.environment?.objects ?? []) {
    if (!object.id.startsWith('sect-campus-')) continue;
    const destination = stations.get(object.id.slice('sect-campus-'.length));
    const old = destination&&previous(destination);
    if (!old) continue;
    const dx = destination.x - old.x, dy = destination.y - old.y;
    const picture=art.get(object.id), priorX=picture&&property(picture,'v'+fromVersion+'ArtX'),priorY=picture&&property(picture,'v'+fromVersion+'ArtY');
    const shapeDx=Number.isFinite(priorX)?picture.x-priorX+westOffset:dx;
    const shapeDy=Number.isFinite(priorY)?picture.y-priorY:dy;
    shift(object,dx,dy);
    for (const point of [object.hitbox, object.collision, object.restoreCollision]) shift(point, shapeDx, shapeDy);
    if (object.repairSite) setPoint(object.repairSite, destination);
    buildingSites.set(object.id, destination);
  }
  const commissions = new Map((world.commissions ?? []).map(c => [c.commissionId,c]));
  for (const commission of commissions.values()) {
    const destination = buildingSites.get(commission.targetId);
    if (destination && ['posted', 'accepted', 'in_progress', 'paused'].includes(commission.status)) setPoint(commission.target, destination);
  }
  for (const npc of world.npcs) {
    const entrance = undergroundEntrances.get(npc.underground?.siteId);
    if (entrance) setPoint(npc, entrance);
    else if(!npc.underground)shiftStrip(npc);
    moveKnownPoint(npc.home,true);
    moveKnownPoint(npc.workPosition,true);
    moveKnownPoint(npc.actionTarget,true);
    moveKnownPoint(npc.meditationSpot,true);
    moveKnownPoint(npc.convalescence?.shelter,true);
    moveKnownPoint(npc.lawResponse?.returnTarget,true);
    for(const p of npc.patrolPoints??[])moveKnownPoint(p,true);
    const commission = commissions.get(npc.assignedCommissionId);
    const destination = commission && buildingSites.get(commission.targetId);
    if (destination && npc.actionTarget && npc.decisionSlot === 'commission:' + commission.commissionId) setPoint(npc.actionTarget, destination);
    if (npc.decisionSlot?.startsWith('sect-campus:')) {
      // Service desks and queues may have picked an adjacent position. Let the
      // campus choose a new access slot on its next tick without cancelling work.
      delete npc.routeIndex;
      delete npc.pathBlocked;
      delete npc.decisionSlot;
      npc.actionTarget = {x: npc.x, y: npc.y};
    }
  }
  for (const party of world.expeditions?.parties ?? []) {
    const job=party.job,meet=job?.meet&&{...job.meet},field=job?.field&&{...job.field};
    for (const point of [job?.meet,job?.desk,job?.field,...(job?.route??[])]) moveKnownPoint(point,true);
    const groups=[[party.spots,meet,job?.meet],[party.fieldSpots,field,job?.field]];
    for(const [spots,old,next] of groups){
      if(!old||!next)continue;
      for(const p of Object.values(spots??{})){
        if(coordinates(p)&&Math.hypot(p.x-old.x,p.y-old.y)<180)shift(p,next.x-old.x,next.y-old.y);
        else moveKnownPoint(p,true);
      }
    }
    moveKnownPoint(party.combatAnchor,true);
    for(const p of Object.values(party.combatSlots??{}))moveKnownPoint(p,true);
  }
  for(const drop of world.environment?.drops??[])if(!drop.siteId)shiftStrip(drop);
  for (const record of Object.values(world.civic?.cases ?? {})) {
    if (undergroundEntrances.has(record.siteId) && !Number.isInteger(record.floor)) moveKnownPoint(record.point);
  }
  world.population.sectLayoutVersion = version;
  return true;
}

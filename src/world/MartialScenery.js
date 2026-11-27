import {resolveDamage} from '../systems/CombatBalance.ts';
import {damageWorldRebuildBuilding} from '../dao/WorldRebuildProfessionSystem.ts';

const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
const sq=(a,b)=>(a.x-b.x)**2+(a.y-b.y)**2;
const inverse=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,wallLevel:a.wallLevel??0});
const closest=(point,rect)=>({x:clamp(point.x,rect.x,rect.x+rect.width),
  y:clamp(point.y,rect.y,rect.y+rect.height),wallLevel:point.wallLevel??0});

export function structureStage(building){
  const ratio=building.hp/building.maxHp;
  return ratio===0?4:ratio<=.19?3:ratio<=.50?2:ratio<1?1:0;
}

function siegeStrike(cast,building){
  const category=building.id.startsWith('sect-campus-')?3:/wall|gate|rampart/.test(building.id)?2:
    /hall|inn|tavern|van-bao/.test(building.id)?1:0;
  const protectedBuilding=building.id==='city-lord-residence'||building.id==='sect-campus-vault';
  const material=[1,1.25,1.8,1.55][category]*(protectedBuilding?3:1);
  const power=cast.damage*[.015,.022,.045,.10,.16][cast.skill.grade];
  const cap=building.maxHp*[.02,.04,.10,.24,.42][cast.skill.grade]/material;
  const hit=resolveDamage(power,building.defense*material,cast.npc,{}, {suppress:false}).damage;
  return Math.min(cap,hit);
}

export function applyMartialScenery(scene,cast,point){
  if(cast.origin.wallLevel||cast.structures.size>=4)return;
  const world=scene.populationWorld,skill=cast.skill;
  const burst=skill.form==='field'||skill.form==='burst';
  const moving=cast.projectiles.length>0;
  const radius=moving?36:burst?Math.max(22,skill.width||skill.range):Math.max(16,skill.width);
  const hitCenter=(rect)=>{
    if(moving||burst)return point;
    const center={x:rect.x+rect.width/2,y:rect.y+rect.height/2};
    const along=(center.x-cast.origin.x)*cast.ux+(center.y-cast.origin.y)*cast.uy;
    return inverse(cast.origin,{x:cast.origin.x+cast.ux*skill.range,y:cast.origin.y+cast.uy*skill.range},clamp(along/skill.range,0,1));
  };
  let changed=false;
  for(const building of world.environment.objects){
    if(cast.structures.size>=4)break;
    if(!building.hp||cast.structures.has(building.id)||(!scene.martialGallery&&cast.ai&&building.ownerFactionId))continue;
    const rect=building.hitbox;
    const center=hitCenter(rect),near=closest(center,rect);
    if(sq(near,center)>radius**2)continue;
    const from=moving||burst?center:cast.origin;
    const length=Math.sqrt(sq(from,near));
    const contact=inverse(from,near,length>15?1-15/length:0);
    if(!scene.clearCombatLine(from,contact))continue;
    cast.structures.add(building.id);
    const id='martial:'+cast.id+':structure:'+building.id;
    const damage=siegeStrike(cast,building);
    const result=damageWorldRebuildBuilding(world,building.id,id,damage,cast.npc.realmIndex,{resolved:true});
    if(!result?.changed)continue;
    changed=true;
    world.events.push({id,day:world.clock.day,minute:world.clock.minute,type:'martial-property-damage',actorId:cast.npc.id,
      targetId:building.id,description:cast.skill.name+' gây hư hại công trình.',status:'occurred',
      data:{before:result.before,after:result.after,damage:result.damage,ownerFactionId:building.ownerFactionId}});
    if(building.ownerFactionId&&!scene.martialGallery)scene.civic?.record({id,kind:'propertyDamage',actorId:cast.npc.id,
      point:near,siteId:building.id,severity:result.destroyed?3:2});
  }
  if(['fire','sun','thunder'].includes(skill.element)){
    for(const tree of world.environment.timberSources??[]){
      if(cast.structures.size>=4)break;
      const center=hitCenter({x:tree.x,y:tree.y,width:0,height:0});
      if(tree.renewAt!==undefined||cast.structures.has(tree.id)||sq(center,tree)>radius**2||
        !scene.clearCombatLine(center,tree)||(!scene.martialGallery&&scene.monsterSafe(tree)))continue;
      cast.structures.add(tree.id);
      tree.cuts=(tree.cuts??0)+1;
      if(tree.cuts>=3){tree.renewAt=world.clock.day*1440+world.clock.minute+1440;tree.cuts=0;}
      changed=true;
    }
  }
  if(changed){scene.refreshProfessionVisuals();scene.refreshLivingTimber();scene.requestBackgroundSave();}
}

export function drawBuildingWear(graphics, sprite, building){
  const stage=structureStage(building);
  const x=sprite.x,y=sprite.y,spriteWidth=sprite.displayWidth,spriteHeight=sprite.displayHeight;
  const [left,top]=[x-spriteWidth*sprite.originX,y-spriteHeight*sprite.originY];
  const ruined=stage===4;
  if(sprite.martialRuined!==ruined){
    sprite.martialRuined=ruined;
    if(ruined)sprite.setVisible(false);
    graphics.scene.sceneryView=null;
  }
  if(!stage){sprite.clearTint();return;}
  if(stage===4){
    const base=top+spriteHeight*.87;
    for(let i=0;i<14;i++){
      const px=left+spriteWidth*(.16+(i*17%53)/78),py=base+(i*13%19)-12;
      graphics.fillStyle(i%3?0x514d40:0x89795a,.9).fillRect(Math.round(px),Math.round(py),11+i%5,4+i%3);
      graphics.fillStyle(0xbaaa7f,.66).fillRect(Math.round(px)+1,Math.round(py),7,1);
    }
    return;
  }
  sprite.setTint(stage===1?0xf0d6b6:stage===2?0xc4ad91:0x9e8470);
  for(let i=0;i<stage*2;i++){
    const px=Math.round(left+spriteWidth*(.24+(i*17%48)/100)),py=Math.round(top+spriteHeight*(.55+(i*7%23)/84));
    graphics.lineStyle(i%2?2:1,0x503a2b,.83).lineBetween(px-4,py-12,px,py-3);
    graphics.lineBetween(px,py-3,px-3,py+1);graphics.lineBetween(px-3,py+1,px+3,py+8);
    if(stage>=2)graphics.fillStyle(0x9b7656,.92).fillRect(px+4,py-10,5,3);
  }
}

export function refreshBuildingFootprints(scene){
  const dynamic=scene.martialBuildingSolids??=new Map();
  let changed=false;
  for(const building of scene.populationWorld.environment.objects){
    if((!building.mapObjectId&&!scene.buildingSprites.has(building.id))||!building.restoreCollision)continue;
    const footprint=building.restoreCollision;
    const active=building.hp>0;
    let entry=dynamic.get(building.id);
    if(!entry){
      const {navCell,navRows,navCols,westOffsetX}=scene;
      const minX=Math.max(0,Math.floor((footprint.x+westOffsetX)/navCell));
      const maxX=Math.min(navCols,Math.ceil((footprint.x+footprint.width+westOffsetX)/navCell));
      const minY=Math.max(0,Math.floor(footprint.y/navCell));
      const maxY=Math.min(navRows,Math.ceil((footprint.y+footprint.height)/navCell));
      const cells=[];
      for(let y=minY;y<maxY;y++)for(let x=minX;x<maxX;x++)cells.push(y*navCols+x);
      entry={rect:{...footprint,kind:'martial-building'},cells,enabled:false};
      dynamic.set(building.id,entry);
    }
    if(entry.enabled===active)continue;
    entry.enabled=active;
    for(const cell of entry.cells){
      const rects=scene.collisionByCell.get(cell)??[];
      if(active)rects.push(entry.rect);
      else {const index=rects.indexOf(entry.rect);if(index>=0)rects.splice(index,1);}
      scene.collisionByCell.set(cell,rects);
      const blocked=Number(rects.length>0);
      if(scene.navBlocked[cell]!==blocked){scene.navBlocked[cell]=blocked;changed=true;}
    }
  }
  if(changed){scene.buildNavigationComponents();scene.routeFootprints?.clear();scene.npcRoutes.clear();}
}

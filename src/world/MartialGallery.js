import {REALMS} from '../systems/RealmConfig.ts';
import {cultivationStats} from '../systems/CultivationSystem.ts';
import {martialQiCost} from '../dao/MartialProgress.ts';
import {GRADES, ELEMENTS, MASTERY, MASTERY_XP, MARTIAL_SKILLS, MARTIAL_TECHNIQUES, MARTIAL_WEAPONS} from '../dao/MartialRegistry.ts';
import {martialResonance} from '../dao/MartialProgress.ts';
import {makeItemIcon} from './ResidentInventory.js';
import './martial-gallery.css';

const directions={right:[1,0],left:[-1,0],up:[0,-1],down:[0,1]};
const grades=GRADES.map((grade,index)=>[index,grade.name]);
const phases={prepare:'Vận công',chant:'Khẩu quyết',charge:'Tụ lực',manifestation:'Hiện hình',release:'Phát chiêu',
  impact:'Va chạm',aftermath:'Kiếm quy chủ / dư âm',recovery:'Hồi thế',complete:'Hoàn tất'};
const courses=Object.values(MARTIAL_TECHNIQUES);
const weapons=Object.values(MARTIAL_WEAPONS);

function options(select,values){
  select.replaceChildren(...values.map(([value,label])=>new Option(label,value)));
}

export function mountMartialGallery(scene){
  const settings=scene.martialCombat.settings;
  const panel=document.createElement('details');
  panel.className='martial-gallery';
  panel.innerHTML='<summary>Võ kỹ · Hiệu ứng</summary><label>Mật độ hiệu ứng <select data-martial="detail"></select></label><label><input type="checkbox" data-martial="flash"> Ánh lóe</label><label><input type="checkbox" data-martial="shake"> Rung camera</label>';
  const input=name=>panel.querySelector('[data-martial="'+name+'"]');
  options(input('detail'),[[0,'Thấp'],[1,'Chuẩn'],[2,'Cao']]);
  for(const name of ['detail','flash','shake']){
    const control=input(name);
    if(name==='detail')control.value=settings.detail;
    else control.checked=settings[name];
    control.onchange=()=>{
      settings[name]=name==='detail'?Number(control.value):control.checked;
      try{localStorage.setItem('tvk-martial-vfx',JSON.stringify(settings));}catch{}
      scene.martialCombat.sampleAt=-1;
    };
  }
  document.body.append(panel);
  scene.events.once('shutdown',()=>panel.remove());
  if(!new URLSearchParams(location.search).has('combatGallery')){
    const href=document.createElement('a');
    href.href='/?combatGallery=1';
    href.target='_blank';
    href.rel='noopener';
    href.textContent='Mở Võ Kỹ Các';
    panel.append(href);
    return;
  }
  panel.open=true;
  panel.classList.add('martial-gallery-lab');
  panel.querySelector('summary').textContent='Võ Kỹ Các';
  const laboratory=document.createElement('div');
  laboratory.className='martial-gallery-controls';
  panel.append(laboratory);
  const balance=document.createElement('a');
  balance.href='/combat-balance.html';balance.textContent='Mở bảng cân bằng cảnh giới';
  panel.append(balance);
  const control=(name,label,values)=>{
    const node=document.createElement('label');
    node.textContent=label;
    const select=document.createElement('select');
    select.dataset.martial=name;
    options(select,values);
    node.append(select);laboratory.append(node);
    return select;
  };
  const grade=control('grade','Phẩm', [['all','Toàn bộ'],...grades]);
  const course=control('course','Công pháp',[]);
  const skill=control('skill','Võ kỹ',[]);
  const weapon=control('weapon','Trang bị',[['none','Tay không'],...weapons.map(item=>[item.id,item.name])]);
  const realm=control('realm','Cảnh giới',REALMS.map((realm,index)=>[index,realm.name]));
  realm.value='4';
  const mastery=control('mastery','Thông thạo',MASTERY.map((name,index)=>[index,name]));
  mastery.value='4';
  const direction=control('direction','Hướng',[['right','Đông'],['left','Tây'],['up','Bắc'],['down','Nam']]);
  const site=control('site','Sân thử',[['forest','Rừng Tây Hoang'],['bank','Bờ sông Đông Hoang']]);
  const opponent=control('target','Mục tiêu',[['beast','Yêu thú'],['npc','Tu sĩ'],['building','Công trình']]);
  const zoom=control('zoom','Zoom',[['game','Trong game'],[.58,'Toàn cảnh'],[1,'1×'],[2,'2×'],[4,'4×']]);
  const light=control('light','Ánh sáng',[['day','Ban ngày'],['night','Ban đêm']]);
  const speed=control('speed','Phát',[[.25,'0,25×'],[.5,'0,5×'],[1,'1×'],[2,'2×'],[4,'4×'],[0,'Tạm dừng']]);
  speed.value='1';
  const pair=document.createElement('label');
  const pairCheck=document.createElement('input');
  pairCheck.type='checkbox';pairCheck.checked=true;pairCheck.dataset.martial='resonance';
  pair.append(pairCheck,' Tương hợp vũ khí');laboratory.append(pair);
  const replay=document.createElement('button');
  replay.type='button';replay.textContent='Thi triển lại';laboratory.append(replay);
  const nextPhase=document.createElement('button');
  nextPhase.type='button';nextPhase.textContent='Tới giai đoạn kế';laboratory.append(nextPhase);
  const motion=document.createElement('button');
  motion.type='button';motion.textContent='Thử thế vũ khí';laboratory.append(motion);
  const group=control('group','Số người thi triển',[[1,'1 tu sĩ'],[4,'4 tu sĩ'],[8,'8 tu sĩ']]);
  const weaponState=control('weapon-state','Khí tức vũ khí',[
    ['auto','Theo trận đấu'],[0,'Mang / cầm'],[1,'Giao chiến'],[2,'Cộng hưởng đại thần thông'],
  ]);
  const comparison=document.createElement('div');
  comparison.className='martial-comparison';
  for(const [label,file] of [['Trước','martial-arms-before'],['Cầm tay','martial-arms'],['Đeo lưng','martial-arms-back']]){
    const piece=document.createElement('div'),icon=document.createElement('span');
    icon.style.backgroundImage="url('/assets/items/"+file+".png')";
    piece.append(icon,document.createTextNode(label));comparison.append(piece);
  }
  panel.append(comparison);
  const status=document.createElement('output');panel.append(status);
  const inventory=document.createElement('details');inventory.className='martial-catalog';
  inventory.innerHTML='<summary>Bộ sưu tập 15 công pháp · 15 vũ khí</summary>';
  const weaponInventory=document.createElement('details');weaponInventory.className='martial-catalog martial-weapon-catalog';
  weaponInventory.innerHTML='<summary>So sánh 15 vũ khí</summary>';
  panel.append(weaponInventory);
  const weaponGrid=document.createElement('div');weaponInventory.append(weaponGrid);
  panel.append(inventory);
  const grid=document.createElement('div');inventory.append(grid);
  const combat=scene.martialCombat;
  const actor=scene.populationWorld.npcs.find(n=>n.alive&&!n.minor&&!n.underground);
  const beasts=scene.populationWorld.environment.fauna.filter(f=>f.alive&&!scene.monsterSafe(f));
  const river=scene.markers.find(marker=>/bridge/.test(marker.id));
  const sortedBeasts=[...beasts].sort((a,b)=>river?Math.hypot(a.x-river.x,a.y-river.y)-Math.hypot(b.x-river.x,b.y-river.y):b.x-a.x);
  const setSkills=()=>options(skill,(MARTIAL_TECHNIQUES[course.value]?.skills??[]).map(move=>[move.id,move.name]));
  const setCourses=()=>{
    options(course,courses.filter(book=>grade.value==='all'||book.grade===Number(grade.value)).map(book=>[book.id,book.name]));
    setSkills();
  };
  setCourses();
  const requestedId=new URLSearchParams(location.search).get('skill');
  const requested=Object.hasOwn(MARTIAL_SKILLS,requestedId)?MARTIAL_SKILLS[requestedId]:null;
  if(requested){
    course.value=requested.course;setSkills();skill.value=requested.id;
    weapon.value=requested.id==='myriad-unite'?'heaven_thunder_jian':weapons.find(arm=>arm.course===requested.course)?.id??'none';
  }
  const buildings=scene.populationWorld.environment.objects.filter(b=>b.repairSite&&b.id!=='city-lord-residence'&&b.id!=='sect-campus-vault');
  const fixtureNpc=scene.populationWorld.npcs.find(n=>n!==actor&&n.alive&&!n.minor&&!n.underground);
  const oldBuildings=new Map(buildings.map(b=>[b.id,structuredClone(b)]));
  let target,building,lastCast, message='';
  const groupCasters=[];
  let castCount=0;
  let groupFaction;
  const savedState=new Map();
  const fieldsToRestore=['x','y','wallLevel','realmIndex','realmLevel','mp','spiritualRoot','flight','tribulation','ascended',
    'inventory','equippedWeapon','equippedWeaponInstance','martial','martialDurability','weaponInstances','faction'];
  const restoreGroup=()=>{
    if(groupFaction){actor.faction=groupFaction.original;groupFaction=undefined;}
    for(const npc of groupCasters){
      Object.assign(npc,savedState.get(npc.id));
      scene.npcSprites.get(npc.id)?.setPosition(npc.x,npc.y).setDepth(npc.y);
    }
    groupCasters.length=0;
    castCount=0;
    savedState.clear();
  };
  const chooseFixture=()=>{
    if(!actor)return false;
    const [dx,dy]=directions[direction.value];
    const candidates=site.value==='bank'?sortedBeasts:beasts;
    const moveActor=position=>{
      Object.assign(actor,position);
      scene.npcSprites.get(actor.id)?.setPosition(actor.x,actor.y).setDepth(actor.y);
    };
    building=null;
    const move=MARTIAL_TECHNIQUES[course.value]?.skills.find(s=>s.id===skill.value);
    if(opponent.value==='building'){
      for(const object of buildings){
        const site={...object.repairSite,wallLevel:0};
        for(const distance of [82,62,42]){
          const point={x:site.x-dx*distance,y:site.y-dy*distance,wallLevel:0};
          if(!scene.footprintTerrainOpen(point.x,point.y,10,7)||!scene.clearCombatLine(point,site))continue;
          moveActor(point);target={...site,id:object.id,structure:true};building=object;return true;
        }
      }
      return false;
    }
    const spacing=move?.id==='myriad-unite'?[205,155,120,70,35]:
      ['projectile','homing'].includes(move?.delivery)?[Math.min(move.range*.73,148),55,35,28]:[35,43,28];
    for(const beast of candidates){
      for(const distance of spacing){
        const position={x:beast.x-dx*distance,y:beast.y-dy*distance,wallLevel:0};
        if(!scene.footprintTerrainOpen(position.x,position.y,10,7)||!scene.clearCombatLine(position,beast))continue;
        moveActor(position);
        if(opponent.value==='npc'){
          target=fixtureNpc;
          Object.assign(target,{x:beast.x+dx*8,y:beast.y+dy*8,wallLevel:0,flight:undefined,skyStep:undefined});
          scene.npcSprites.get(target.id)?.setPosition(target.x,target.y).setDepth(target.y);
        }else target=beast;
        return true;
      }
    }
    return false;
  };
  const updateStatus=()=>{
    const resonance=actor?martialResonance(actor):0;
    const phase=combat.casts.get(actor?.id)?.phase??lastCast?.phase;
    const book=MARTIAL_TECHNIQUES[course.value];
    const move=book?.skills.find(s=>s.id===skill.value);
    const stats=book&&move?GRADES[book.grade].name+' · '+ELEMENTS[book.element]+' · '+Math.round(actor?martialQiCost(actor,move):move.mp)+' linh lực · '+(move.cooldown/1000)+' s hồi':'';
    const swords=lastCast?.skill.id==='myriad-unite'?' · '+combat.cinematic.swordCount+' kiếm hiển thị':'';
    const state=lastCast?phases[phase]+' · '+lastCast.projectiles.length+' vật thể bay · '+lastCast.impacts.length+' va chạm'+swords:'';
    const hp=building?'Công trình '+oldBuildings.get(building.id).hp+' → '+building.hp+' HP':target?'Mục tiêu '+target.hp+'/'+target.maxHp+' HP':'';
    const next=[stats,move?.description,state,hp,groupCasters.length?'Đã vào trận '+castCount+' tu sĩ':'',
      resonance&&pairCheck.checked?'Tương hợp +'+Math.round(resonance*100)+'%':'',message].filter(Boolean).join(' · ');
    if(status.textContent!==next)status.textContent=next;
  };
  const configure=()=>{
    message=''; lastCast=null;
    combat.clear();
    restoreGroup();
    if(building){Object.assign(building,structuredClone(oldBuildings.get(building.id)));scene.refreshProfessionVisuals();}
    if(!chooseFixture()){message='Thiếu vị trí thử hợp lệ.';updateStatus();return false;}
    const arm=weapon.value;
    const book=MARTIAL_TECHNIQUES[course.value];
    actor.realmIndex=Number(realm.value);actor.realmLevel=10;actor.spiritualRoot=book.roots[0];
    actor.inventory=arm==='none'?[]:[{itemId:arm,count:1}];actor.equippedWeapon=arm==='none'?null:arm;
    actor.martialDurability={};
    actor.equippedWeaponInstance=null;
    comparison.hidden=arm==='none';
    if(arm!=='none')for(const icon of comparison.querySelectorAll('span'))icon.style.backgroundPosition=-MARTIAL_WEAPONS[arm].icon*48+'px 0';
    actor.martial={active:book.id,learned:{[book.id]:MASTERY_XP[Number(mastery.value)]},ready:{}};
    const vitals=cultivationStats(actor);actor.hp=vitals.hpMax*.45;actor.mp=vitals.mpMax;actor.action='idle';
    actor.flight=undefined;actor.tribulation=undefined;actor.ascended=false;
    if(!building){target.alive=true;target.maxHp=Math.max(5000,actor.hp*16);target.hp=target.maxHp;target.cast=undefined;}
    scene.playerFacing=direction.value;scene.lastAttackPointer=false;
    scene.npcSprites.get(actor.id)?.play(scene.npcTextureFor(actor)+'_idle_'+direction.value,true);
    scene.syncGroundOccupancy();
    scene.syncWeaponVisuals();
    scene.cameraTween?.stop();scene.cameraTween=null;
    scene.cameras.main.setZoom(zoom.value==='game'?.95:Number(zoom.value));
    const middle={x:(actor.x+target.x)/2,y:(actor.y+target.y)/2};
    scene.cameras.main.centerOn(middle.x,middle.y);
    scene.clampCamera();
    updateStatus();
    return true;
  };
  replay.onclick=()=>{
    if(!configure())return;
    scene.populationWorld.clock.paused=false;
    if(Number(group.value)>1){
      groupFaction={original:actor.faction};
      actor.faction='Thanh Vân Tông';
    }
    const ok=combat.cast(actor,skill.value,target,false,pairCheck.checked);
    castCount=Number(ok);
    lastCast=combat.casts.get(actor.id);
    if(ok&&Number(group.value)>1){
      const candidates=scene.populationWorld.npcs.filter(n=>n!==actor&&n!==target&&combat.eligible(n));
      const positions=[];
      for(const radius of [32,52,74,96]){
        for(let i=0;i<16;i++){
          const a=i*Math.PI/8,x=actor.x+Math.cos(a)*radius,y=actor.y+Math.sin(a)*radius;
          if(Math.hypot(x-target.x,y-target.y)>Math.max(55,lastCast.skill.range)||
            !scene.footprintTerrainOpen(x,y,10,7)||!scene.clearCombatLine({x,y,wallLevel:0},target)||
            positions.some(p=>Math.hypot(p.x-x,p.y-y)<20))continue;
          positions.push({x,y,wallLevel:0});
        }
      }
      for(const point of positions.slice(0,Number(group.value)-1)){
        const npc=candidates.shift();
        if(!npc)break;
        savedState.set(npc.id,Object.fromEntries(fieldsToRestore.map(key=>[key,npc[key]])));
        Object.assign(npc,point,{realmIndex:actor.realmIndex,realmLevel:actor.realmLevel,spiritualRoot:actor.spiritualRoot,mp:actor.mp,flight:undefined,
          tribulation:undefined,ascended:false,faction:actor.faction,
          inventory:actor.equippedWeapon?[{itemId:actor.equippedWeapon,count:1}]:[],equippedWeapon:actor.equippedWeapon,
          equippedWeaponInstance:null,weaponInstances:undefined,martialDurability:{},
          martial:{active:actor.martial.active,learned:{...actor.martial.learned},ready:{}}});
        scene.npcSprites.get(npc.id)?.setPosition(npc.x,npc.y).setDepth(npc.y);
        groupCasters.push(npc);
        castCount+=Number(combat.cast(npc,skill.value,target,false,pairCheck.checked));
      }
      scene.syncGroundOccupancy();
      scene.syncWeaponVisuals();
    }
    if(!ok)message='Không đủ điều kiện thi triển với cấu hình này.';
    updateStatus();
    return ok;
  };
  nextPhase.onclick=()=>{
    if(!lastCast)return;
    speed.value='0';
    const time=combat.clock-lastCast.at;
    const due=['chant','charge','manifest','release','impact','aftermath','recovery','complete'].map(phase=>lastCast.timeline[phase]).find(t=>t>time+1);
    if(due!==undefined){combat.advance(due-time+1);updateStatus();}
  };
  motion.onclick=()=>{
    if(!configure())return;
    const item=MARTIAL_WEAPONS[weapon.value];
    const animation=item?.kind==='spear'?'jian_thrust':item?.kind==='jian'?'jian_slash':'dao_slash_1';
    scene.playWeaponPose(actor,{animation},direction.value);
  };
  for(const field of [weapon,realm,mastery,direction,site,opponent,zoom,skill,group])field.onchange=configure;
  weaponState.onchange=()=>{combat.sampleAt=-1;};
  light.onchange=()=>{
    scene.populationWorld.clock.minute=light.value==='night'?1260:480;
    if(scene.daylight){scene.daylight.nextUpdate=0;scene.daylight.update(scene.time.now);}
    combat.sampleAt=-1;
  };
  grade.onchange=()=>{setCourses();configure();};
  course.onchange=()=>{setSkills();configure();};
  for(const item of [...courses,...weapons]){
    const button=document.createElement('button');
    button.type='button';
    button.style.setProperty('--martial-grade','#'+GRADES[item.grade].color.toString(16));
    button.append(makeItemIcon(item.book??item.id),document.createTextNode(item.name));
    button.onclick=()=>{
      inventory.open=false;
      if(item.book){grade.value='all';setCourses();course.value=item.id;setSkills();}
      else weapon.value=item.id;
      configure();
    };
    grid.append(button);
  }
  for(const item of weapons){
    const button=document.createElement('button'), art=document.createElement('span');
    button.type='button';
    button.style.setProperty('--martial-grade','#'+GRADES[item.grade].color.toString(16));
    art.className='martial-weapon-tile';
    art.style.backgroundPosition=-item.icon*48+'px 0';
    button.append(art,document.createTextNode(item.name));
    button.onclick=()=>{weaponInventory.open=false;weapon.value=item.id;configure();};
    weaponGrid.append(button);
  }
  scene.martialGallery={
    previewWeaponIntensity(id){return id===actor?.id&&weaponState.value!=='auto'?Number(weaponState.value):null;},
    step(delta){if(Number(speed.value)>0){combat.advance(delta*Number(speed.value));updateStatus();}},
    advance(delta){combat.advance(delta);combat.render();updateStatus();},
    snapshot(){return {actorId:actor?.id, actor:actor&&{x:actor.x,y:actor.y,hp:actor.hp,mp:actor.mp,z:combat.altitude(actor)},
      target:target&&{id:target.id,hp:building?.hp??target.hp},phase:lastCast?.phase,hits:lastCast?.hits,clock:combat.clock,
      castId:lastCast?.id,targetId:lastCast?.targetId,projectiles:lastCast?.projectiles.length,impactEvents:lastCast?.impacts.length,
      impactIds:lastCast?.impacts.map(hit=>hit.id)};},
  };
  if(import.meta.env.DEV||new URLSearchParams(location.search).has('testMode'))window.__martialGallery=scene.martialGallery;
  configure();
}

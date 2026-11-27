import {DISTRICTS, POPULATION_TARGET, addArrival, familyFor, migratePopulation, populationState,
  settleDeparture, tickPopulationFamilies} from './PopulationLife.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const noContraryDuty=n=>!n.underground&&!n.tribulation&&!n.lawResponse&&!n.flight&&!n.skyStep&&
  !n.assignedCommissionId&&!n.assignedMissionId&&!n.convalescence&&!n.marketVisit&&!n.faunaHuntTargetId&&!n.wallLevel&&
  !/^(civic|sect-campus|society|mandate|duel):/.test(n.decisionSlot??'');
const jobMarkers={alchemist:'apothecary-entrance',smith:'forge-entrance',physician:'apothecary-entrance',musician:'tavern-entrance'};

export function populationTestTarget(params) {
  const target=Number(params.get('populationTest'));
  return params.has('testMode')&&[108,144,180,240].includes(target)?target:null;
}

export class PopulationDirector {
  constructor(scene,target=POPULATION_TARGET){
    this.scene=scene;
    this.world=scene.populationWorld;
    this.target=target;
    this.state=populationState(this.world,target);
    this.markers=new Map(scene.markers.map(m=>[m.id,m]));
  }

  anchor(id){return this.markers.get(id);}

  openNear(anchor,index,occupied,minGap,allowAnchor=false){
    if(!anchor)return null;
    const {scene}=this;
    const nav=scene.navComponentAt(anchor);
    const major=scene.navComponentAt(this.anchor('city-center'));
    const component=nav||major;
    const radii=allowAnchor?[0,32,48,72,96,128]:[48,80,114,154,198,245,294,360];
    for(const radius of radii)for(let turn=0;turn<16;turn++){
      const angle=(turn*.392699+index*2.399963)%6.283185;
      const point={x:Math.round(anchor.x+Math.cos(angle)*radius),y:Math.round(anchor.y+Math.sin(angle)*radius)};
      if(scene.navComponentAt(point)!==component||!component||!scene.footprintTerrainOpen(point.x,point.y,12,8))continue;
      if(occupied.every(other=>distance(other,point)>=minGap))return point;
    }
    return null;
  }

  place(district,index){
    const {npcs}=this.world;
    const vocation=district.trades[Math.floor(index/DISTRICTS.length)%district.trades.length];
    const homes=npcs.filter(n=>n.alive).flatMap(n=>[n.home??n,...(n.underground?[]:[n])]);
    const home=this.openNear(this.anchor(district.home),index,homes,34);
    if(!home)return null;
    return this.workplace(district,vocation,home,index);
  }

  workplace(district,vocation,home,index){
    const workplaces=this.world.npcs.filter(n=>n.alive&&n.workPosition).map(n=>n.workPosition);
    const workplaceId=jobMarkers[vocation]??district.work;
    const workAnchor=this.anchor(workplaceId)??this.anchor(district.home);
    const candidate=this.openNear(workAnchor,index+7,workplaces,26);
    if(candidate&&this.scene.canReachPoint(home,candidate))return {home,work:candidate,workplaceId};
    const nearby=this.openNear(home,index+5,workplaces,26,true);
    return nearby?{home,work:nearby,workplaceId:district.home}:null;
  }

  initialize(){
    return migratePopulation(this.world,this.target,(district,index)=>this.place(district,index));
  }

  settleDaily(){
    const {world,scene,state}=this;
    const day=world.clock.day;
    if(state.lastDay>=day)return;
    state.lastDay=day;
    const {added,grown}=tickPopulationFamilies(world,household=>{
      const occupied=world.npcs.filter(n=>n.alive&&!n.underground);
      const home=this.openNear(household.home,state.serial,occupied,24,true);
      return home?{home,work:home}:null;
    },(a,b)=>scene.canReachPoint(a,b));
    const vacancies=this.target-2-world.npcs.filter(n=>n.alive).length;
    const permits=day>1?Math.min(2,Math.max(0,vacancies)):0;
    for(let permit=0;permit<permits;permit++){
      const district=DISTRICTS[(day+permit*3)%DISTRICTS.length];
      const index=(state.serial+1)*DISTRICTS.length+DISTRICTS.indexOf(district);
      const vocation=district.trades[Math.floor(index/DISTRICTS.length)%district.trades.length];
      const npc=addArrival(world,district,vocation,this.place(district,index));
      if(npc)added.push(npc);
    }
    if(day%14===0&&!world.npcs.some(n=>n.emigration)){
      const npc=world.npcs.find(n=>['immigration','settlement'].includes(n.lifeOrigin?.kind)&&!familyFor(world,n.id)&&
        n.vocation==='wanderer'&&n.alive&&noContraryDuty(n)&&n.id!==scene.possessedNpcId&&
        day-n.lifeOrigin.day>=14&&n.personalGoal?.id==='travel');
      const gate=this.openNear(this.anchor('north-pass'),day,[],0,true);
      if(npc&&gate&&scene.canReachPoint(npc,gate)){
        npc.emigration={reason:'Tiếp tục du hành Bắc Vực',point:gate,expires:day+6};
      }
    }
    for(const n of grown){
      const district=DISTRICTS.find(region=>region.id===n.spawnRegionId)??DISTRICTS[1];
      const assigned=this.workplace(district,n.vocation,n.home,state.serial);
      if(assigned){n.workPosition=assigned.work;n.workplaceId=assigned.workplaceId;}
    }
    if(added.length||grown.length){
      scene.preparePopulationVisuals();
      scene.society?.refreshStaffPools();
    }
    for(const n of added)scene.addPopulationActor(n);
    for(const n of grown)scene.npcSprites.get(n.id)?.setScale(1);
    scene.requestBackgroundSave();
  }

  tick(){
    this.settleDaily();
    const {scene,world}=this;
    for(const n of world.npcs){
      if(!n.emigration)continue;
      const {point,expires}=n.emigration;
      if(!n.alive||world.clock.day>expires){
        delete n.emigration;
        if(n.decisionSlot==='emigration')delete n.decisionSlot;
        continue;
      }
      if(!noContraryDuty(n)||scene.possessedNpcId===n.id)continue;
      if(distance(n,point)<=25&&settleDeparture(world,n)){
        scene.removePopulationActor(n);
        scene.requestBackgroundSave();
        break;
      }
      if(n.decisionSlot!=='emigration'){
        n.decisionSlot='emigration';n.goalAction='travel';n.action='travel';n.actionTarget={...point};
        n.shortGoal='Rời Thanh Vân qua đường đèo Bắc';
        scene.resetNpcRoute(n);
      }
    }
  }
}

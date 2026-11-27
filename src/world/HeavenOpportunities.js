import {EconomySystem as Economy} from '../dao/EconomySystem.ts';
import {caveDistance,caveRoute} from './UndergroundMaps.js';
import {commerceEvent,commerceProduct,worldMinute} from './CommerceCatalog.js';
import {commitHeavenChange,moveVaultItem,shopLedger} from './HeavenShop.js';

export const opportunityForms={
  chest:'Rương bảo vật',relic:'Pháp bảo vô chủ',manual:'Bí tịch thất lạc',
  stele:'Bia truyền thừa',cave:'Động phủ bỏ hoang',
};

export class HeavenOpportunities {
  constructor(scene){
    this.scene=scene;
    this.world=scene.populationWorld;
    this.rows=this.world.heaven.opportunities??=[];
    this.waiting=new Map();
    this.sprites=new Map();
    this.preview=null;
    for(const row of this.rows)this.index(row);
  }
  key(location){return location.siteId?location.siteId+':'+location.floor:'surface';}
  index(row){
    if(row.owner)return;
    const key=this.key(row);
    if(!this.waiting.has(key))this.waiting.set(key,new Set());
    this.waiting.get(key).add(row);
    if(!row.siteId){
      const arm=commerceProduct(row.itemId)?.arm;
      if(!arm){
        const badge=this.scene.add.graphics().setPosition(row.x,row.y).setDepth(row.y+1);
        badge.fillStyle(0x222627).fillRoundedRect(-9,-14,18,13,2)
          .fillStyle(0xad744a).fillRect(-7,-13,14,10).fillStyle(0xf6ce76).fillRect(-7,-9,14,2).fillRect(-2,-9,4,4);
        this.sprites.set(row.id,badge);
      }else this.sprites.set(row.id,this.scene.add.image(row.x,row.y-8,'martial-arms',arm.icon).setDepth(row.y+1).setScale(.75));
    }
  }
  sites(){return [...this.scene.underground.sites.values()].filter(site=>site.kind!=='auction');}
  caveLocation(siteId,floorIndex,position=null){
    const site=this.scene.underground.sites.get(siteId),floor=site?.map.floors[floorIndex];
    if(!floor||site.kind==='auction'||!this.scene.underground.canPlaceOpportunity(site))return null;
    const point=position??floor.treasure??floor.rooms.at(-1);
    if(!point||!Number.isInteger(point.x)||!Number.isInteger(point.y)||caveDistance(floor.entry,point)<3||
      floor.down&&caveDistance(floor.down,point)<2||
      floor.props.some(prop=>prop.x===point.x&&prop.y===point.y)||!caveRoute(floor,floor.entry,point))return null;
    return {siteId,floor:floorIndex,x:point.x,y:point.y};
  }
  previewCave(siteId,floor,position){
    if(this.preview?.siteId!==siteId||this.preview.floor!==floor)return false;
    this.preview(this.caveLocation(siteId,floor,position));
    return true;
  }
  surfaceLocation(point){
    const {scene}=this;
    const near=scene.markers.find(m=>m.id==='city-center');
    if(!near||!Number.isFinite(point.x)||!Number.isFinite(point.y)||
      !scene.footprintTerrainOpen(point.x,point.y,10,7)||scene.riverFishSystem?.isWaterTile(point.x,point.y)||
      !scene.canReachPoint(near,point))return null;
    return {siteId:null,x:Math.round(point.x),y:Math.round(point.y)};
  }
  previewSurface(event){
    if(!this.preview||this.preview.siteId)return false;
    const canvas=this.scene.game.canvas,bounds=canvas.getBoundingClientRect();
    const point=this.scene.cameras.main.getWorldPoint((event.clientX-bounds.left)*this.scene.scale.width/bounds.width,
      (event.clientY-bounds.top)*this.scene.scale.height/bounds.height);
    const location=this.surfaceLocation(point);
    this.marker??=this.scene.add.graphics().setDepth(18000);
    this.marker.clear().lineStyle(2,location?0xc6e295:0xe99780).strokeCircle(point.x,point.y,15);
    this.preview(location);
    return true;
  }
  cancelPreview(){this.preview=null;this.marker?.clear();}
  place(id,point,form,rule={}){
    const row=shopLedger(this.world).find(item=>item.id===id&&item.owner==='heaven');
    const location=point?.siteId?this.caveLocation(point.siteId,point.floor,point):point&&this.surfaceLocation(point);
    if(!row||!location||!Object.hasOwn(opportunityForms,form)||this.world.heaven.possession||
      !Number.isInteger(rule.realm??0)||(rule.realm??0)<0||(rule.realm??0)>10)return {ok:false,message:'Vị trí hoặc vật phẩm không hợp lệ.'};
    if([...(this.waiting.get(this.key(location))??[])].some(item=>location.siteId?
      caveDistance(item,location)<2:Math.hypot(item.x-location.x,item.y-location.y)<24))
      return {ok:false,message:'Đã có cơ duyên chờ tại vị trí này.'};
    const drop={...location,id:'opportunity:'+row.id,itemId:row.itemId,instanceId:row.instanceId,
      form,realm:rule.realm??0,root:rule.root||null,requireClear:Boolean(rule.requireClear),placedAt:worldMinute(this.world),cargo:[]};
    // The world object is part of the same save as the vault and rolls back with it.
    this.rows.push(drop);
    const result=commitHeavenChange(this.scene,null,()=>{
      if(!moveVaultItem(this.world,row,drop.cargo,drop.id,'placed'))return {ok:false,message:'Không thể chuyển từ kho.'};
      drop.instanceId=row.instanceId;
      commerceEvent(this.world,drop.id,'heaven-opportunity-placed','Thiên Đạo đặt '+row.name+' tại '+this.locationName(drop)+'.',
        'heaven',drop.id,{item:row.itemId,siteId:drop.siteId,floor:drop.floor,x:drop.x,y:drop.y});
      return {ok:true,message:'Đã đặt '+row.name+'.'};
    });
    if(result.ok)this.index(drop);
    else this.rows.pop();
    return result;
  }
  locationName(row){
    return row.siteId?(this.scene.underground.sites.get(row.siteId)?.name??row.siteId)+' · tầng '+(row.floor+1):
      'mặt đất ('+row.x+', '+row.y+')';
  }
  locate(row){
    if(row.siteId){
      this.scene.underground.view.show(row.siteId,row.floor);
      this.scene.underground.view.focus(row);
      this.scene.underground.view.selectOpportunity(row);
    }else{
      this.scene.navigateCameraTo(row.x,row.y,'opportunity',false,1);
      this.scene.worldPopulationToast(opportunityForms[row.form]+' · '+(row.owner?'Đã tìm thấy':commerceProduct(row.itemId)?.name));
    }
  }
  nearby(npc,position=npc.underground??npc){
    return [...(this.waiting.get(this.key(position))??[])].find(row=>position.siteId?
      caveDistance(row,position)<=1:
      Math.hypot(row.x-position.x,row.y-position.y)<=26&&this.scene.clearCombatLine(position,row));
  }
  tryFind(npc,manual=false){
    if(!npc?.alive||npc.ascended||npc.flight||npc.wallLevel||npc.tribulation||!npc.inventory)return false;
    const row=this.nearby(npc);
    if(!row)return false;
    const guard=row.requireClear&&row.siteId&&this.scene.underground.state.instances[row.siteId]?.beasts?.[row.floor];
    if(npc.realmIndex<row.realm||row.root&&npc.spiritualRoot!==row.root||guard?.hp>0){
      if(manual)this.scene.worldPopulationToast('Chưa đáp ứng điều kiện truyền thừa.');
      return manual;
    }
    const vault=shopLedger(this.world).find(entry=>row.id==='opportunity:'+entry.id);
    if(!vault||vault.owner!==row.id||!Economy.transferItem(row.cargo,npc.inventory,row.itemId,1,row.id,npc.id))return false;
    row.owner=npc.id;
    row.foundAt=worldMinute(this.world);
    delete row.cargo;
    vault.owner=npc.id;
    (vault.history??=[]).push({owner:npc.id,at:row.foundAt,reason:'discovered'});
    const name=commerceProduct(row.itemId).name;
    const description=npc.name+' đã tìm thấy '+name+' tại '+this.locationName(row)+'.';
    commerceEvent(this.world,row.id+':found','heaven-opportunity-found',description,npc.id,row.id,
      {item:row.itemId,siteId:row.siteId,floor:row.floor,x:row.x,y:row.y});
    npc.memories=[...(npc.memories??[]),{day:this.world.clock.day,kind:'heaven',text:description,itemId:row.itemId}].slice(-12);
    this.waiting.get(this.key(row))?.delete(row);
    this.sprites.get(row.id)?.destroy();this.sprites.delete(row.id);
    this.scene.requestBackgroundSave();
    if(manual)this.scene.worldPopulationToast(description);
    return true;
  }
  tick(){
    if(!this.waiting.get('surface')?.size)return;
    for(const npc of this.world.npcs){
      if(npc.id!==this.scene.possessedNpcId&&!npc.underground)this.tryFind(npc);
    }
  }
  atSurface(event){
    if(this.previewSurface(event))return true;
    const rect=this.scene.game.canvas.getBoundingClientRect();
    const point=this.scene.cameras.main.getWorldPoint((event.clientX-rect.left)*this.scene.scale.width/rect.width,
      (event.clientY-rect.top)*this.scene.scale.height/rect.height);
    const row=[...(this.waiting.get('surface')??[])].find(entry=>Math.hypot(entry.x-point.x,entry.y-point.y)<21);
    if(!row)return false;
    this.scene.worldPopulationToast(opportunityForms[row.form]+' · '+commerceProduct(row.itemId).name+
      (row.realm?' · yêu cầu cảnh giới '+row.realm:'')+(row.root?' · '+row.root:''));
    return true;
  }
}

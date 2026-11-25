const LABEL = { north:'Bắc', south:'Nam', east:'Đông', west:'Tây' };
const STATE = { guarding:'Canh gác', patrolling:'Tuần tra', observing:'Dừng quan sát', toDuty:'Đến vị trí',
  resting:'Nghỉ / đổi ca', toRest:'Về điểm nghỉ', responding:'CityLaw', possessed:'Nhập thân', inactive:'Rời nhiệm vụ' };
const point = p => p ? p.name || p.id || Math.round(p.x)+', '+Math.round(p.y) : '—';
const element = (tag,text) => { const node=document.createElement(tag);node.textContent=text;return node; };

export class GuardDebug {
  constructor(scene){
    this.scene=scene;
    this.navigation=false;
    this.expanded=false;
  }

  snapshot(){
    const {scene}=this,r=scene.ramparts;
    const shift=r.rotation();
    const rows=r.guardIds.map(id=>{
      const entry=scene.scheduler.byId.get(id),npc=entry.npc,slot=r.role(npc),job=entry.rampartJob;
      const active=job?.duty>=0?job.duty:slot;
      const reacting=['responding','at-scene'].includes(npc.lawResponse?.status);
      const state=id===scene.possessedNpcId?'possessed':reacting?'responding':
        !npc.alive?'inactive':entry.guardState??(slot===9||['rest','eat'].includes(npc.goalAction)?['rest','eat'].includes(npc.action)?'resting':'toRest':'inactive');
      const area=active<4?'Tường '+LABEL[['north','south','east','west'][active]]:active<8?
        'Cổng '+LABEL[['north','south','east','west'][active-4]]:active===8?'Nội thành':'Nơi ở';
      const motion=scene.trackNpcMotion(npc,scene.npcSprites.get(id));
      return {id,name:npc.name,state,area,slot,duty:job?.duty??-1,action:npc.action,goal:npc.goalAction,
        moving:motion.moving,floor:!npc.wallLevel?'Ground':r.height(npc)<48?'Stair':'Wall',
        current:point(entry.guardPoint),next:point(entry.guardNext),shift:shift.id,
        handover:slot===9&&job?.duty>=0,stuckMs:Math.round(motion.noProgressMs),
        failure:entry.routeFailure??(entry.blockerId?'occupancy:'+entry.blockerId:entry.passageWait??null),
        reroute:entry.lastPatrolReroute??null,x:npc.x,y:npc.y};
    });
    return {shift:shift.id,start:shift.start,end:shift.start+90,rows};
  }

  render(target){
    if(!target)return;
    const details=document.createElement('details');
    details.open=this.expanded;
    details.addEventListener('toggle',()=>{this.expanded=details.open;});
    const {rows,shift}=this.snapshot();
    const count=state=>rows.filter(row=>row.state===state).length;
    details.append(element('summary','City Guard '+rows.length+' · gác '+count('guarding')+
      ' · tuần '+(count('patrolling')+count('observing'))+' · đến '+count('toDuty')+' · nghỉ '+count('resting')));
    const toggle=element('button',this.navigation?'Tắt overlay điều hướng':'Bật overlay điều hướng');
    toggle.type='button';
    toggle.onclick=()=>{
      this.navigation=!this.navigation;
      if(!this.navigation)this.graphics?.clear();
      toggle.textContent=this.navigation?'Tắt overlay điều hướng':'Bật overlay điều hướng';
      this.drawAt=0;
    };
    details.append(toggle);
    for(const row of rows){
      const block=document.createElement('div');block.style.cssText='border-top:1px solid #716a4d;padding:5px 0';
      block.append(element('b',row.name),element('div',row.id),
        element('div',STATE[row.state]+' · '+row.area+' · '+row.floor+(row.moving?' · đang đi':' · đứng')),
        element('div','Ca '+shift+(row.handover?' · đang bàn giao':'')+' · '+row.current+' → '+row.next));
      if(row.reroute)block.append(element('div','Đổi điểm tránh nghẽn · '+row.reroute.from+' → '+row.reroute.to));
      if(row.failure||row.stuckMs>=4000)block.append(element('div','Chờ '+(row.stuckMs/1000).toFixed(1)+'s · '+(row.failure??'chưa tiến triển')));
      details.append(block);
    }
    target.replaceChildren(details);
  }

  update(time){
    if(!this.navigation||time-(this.drawAt??0)<440)return;
    this.drawAt=time;
    const {scene}=this,r=scene.ramparts;
    const g=this.graphics??=scene.add.graphics().setDepth(scene.worldHeight+250);
    g.clear();
    g.lineStyle(2,0xf2b658,.8);
    for(const stair of r.stairs){
      g.strokeRect(stair.x,stair.y,stair.width,stair.height);
      g.lineBetween(stair.foot.x,stair.foot.y,stair.landing.x,stair.landing.y-48);
      g.fillStyle(0xf2b658,1).fillCircle(stair.foot.x,stair.foot.y,5);
      g.fillStyle(0x78eed4,1).fillCircle(stair.landing.x,stair.landing.y-48,5);
    }
    g.lineStyle(2,0x78eed4,.8);
    for(const [index,node] of r.corners.entries()){
      const next=r.corners[(index+1)%r.corners.length];
      g.lineBetween(node.x,node.y-48,next.x,next.y-48);
    }
    for(const p of r.nodes)g.fillStyle(0x78eed4,1).fillCircle(p.x,p.y-48,5);
    for(const p of [...r.streetPosts,...r.groundPosts])g.fillStyle(0xefc787,1).fillCircle(p.x,p.y,5);
    for(const id of r.guardIds){
      const entry=scene.scheduler.byId.get(id),n=entry.npc;
      if(!n.alive||!entry.navigationGoal)continue;
      const raised=Boolean(n.wallLevel),route=raised?[]:scene.npcRoutes.get(id)?.points.slice(n.routeIndex??0)??[];
      let x=n.x,y=n.y-r.height(n);
      g.lineStyle(2,raised?0xe3ffb4:0x85aeff,.8);
      for(const p of [...route,entry.navigationGoal]){
        const nextY=p.y-(raised?48:0);
        g.lineBetween(x,y,p.x,nextY);
        x=p.x;y=nextY;
      }
    }
  }
}

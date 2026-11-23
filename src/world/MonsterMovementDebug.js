export function drawMonsterRoutes(graphics,rows){
  for(const f of rows){
    const {position:p,footprint,goal,route}=f;
    if(!footprint)continue;
    const color=f.stuck?0xff8065:f.blocked?0xe7c46c:0x9be1bb;
    graphics.lineStyle(1,color,1).strokeRect(p.x-footprint[0]/2,p.y-footprint[1]/2,...footprint);
    graphics.lineStyle(1,color,.34).strokeCircle(p.x,p.y,f.personalRadius??18);
    if(goal)graphics.lineStyle(1,0xefcb79,.8).strokeCircle(goal.x,goal.y,4);
    for(const [i,point] of route.entries()){
      const start=i===0?p:route[i-1];
      graphics.lineStyle(1,0x8bc9df,.85).lineBetween(start.x,start.y,point.x,point.y);
      graphics.strokeCircle(point.x,point.y,3);
    }
    if(f.velocity)graphics.lineStyle(2,0xffeee1,1).lineBetween(p.x,p.y,p.x+f.velocity.x*.22,p.y+f.velocity.y*.22);
  }
}
export class MonsterMovementDebug{
  constructor(scene){
    this.scene=scene;this.enabled=false;
    this.graphics=scene.add.graphics().setDepth(20002);
    this.panel=document.createElement('aside');
    this.panel.hidden=true;this.panel.id='monster-movement-debug';
    this.panel.style.cssText='position:fixed;right:14px;top:100px;z-index:22;width:min(400px,92vw);max-height:62vh;overflow:auto;padding:12px;background:#10221cef;border:1px solid #9e8755;color:#ebd7ad;font:12px monospace';
    const button=document.createElement('button');button.textContent='Xuất JSON';
    button.onclick=()=>this.download();
    this.list=document.createElement('pre');this.list.style.whiteSpace='pre-wrap';
    this.panel.append(button,this.list);document.body.append(this.panel);
    scene.input.keyboard?.on('keydown-F4',event=>{event.preventDefault();this.toggle();});
    document.getElementById('toggle-monster-movement')?.addEventListener('click',()=>this.toggle());
    scene.events.once('shutdown',()=>this.panel.remove());
  }
  toggle(){
    this.enabled=!this.enabled;this.panel.hidden=!this.enabled;
    if(!this.enabled)this.graphics.clear();
    else this.next=0;
  }
  update(time){
    if(!this.enabled||time<(this.next??0))return;
    this.next=time+115;
    const {scene}=this,report=scene.getMonsterMovement(),visible=report.monsters.filter(f=>scene.inSceneryView(f.position,45));
    this.graphics.clear();drawMonsterRoutes(this.graphics,visible);
    this.list.textContent='Seed '+report.seed+'\n'+visible.map(f=>[
      f.id+' · '+f.species+' '+f.rank+' · '+f.state,
      f.reason+' · '+f.noProgress+' ms · repath '+f.repaths+' · va '+(f.blocked??'—'),
      'V '+Math.round(f.velocity?.x??0)+', '+Math.round(f.velocity?.y??0)+' · gần '+f.neighbors.join(', ')
    ].join('\n')).join('\n\n');
  }
  download(){
    const report=this.scene.getMonsterMovement(),url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download='monster-movement.json';link.click();
    setTimeout(()=>URL.revokeObjectURL(url),500);
  }
}

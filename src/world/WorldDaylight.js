const phases = [
  [0,'Đêm khuya',0x162747,.54,1], [300,'Bình minh',0xe8b375,.23,.45],
  [420,'Buổi sáng',0xffe6ad,.10,0], [660,'Buổi trưa',0xfff3cf,.035,0],
  [840,'Buổi chiều',0xecc993,.08,0], [1020,'Hoàng hôn',0xdc8145,.31,.25],
  [1140,'Ban đêm',0x212f54,.46,.96], [1440,'Đêm khuya',0x162747,.54,1],
];

export function daylightAt(minute) {
  const index=phases.findLastIndex(([start])=>start<=minute);
  const current=phases[index], next=phases[Math.min(index+1,phases.length-1)];
  const t=Math.max(0,Math.min(1,(minute-next[0]+60)/60)), blend=t*t*(3-2*t);
  const mix=(a,b)=>a+(b-a)*blend;
  const color=[16,8,0].reduce((rgb,shift)=>rgb|(Math.round(mix((current[2]>>shift)&255,(next[2]>>shift)&255))<<shift),0);
  return {name:current[1],color,alpha:mix(current[3],next[3]),lamps:mix(current[4],next[4]),
    icon:minute<300||minute>=1140?'☾':minute<420||minute>=1020?'◒':'☀'};
}

export class WorldDaylight {
  constructor(scene) {
    this.scene=scene;
    this.tone=scene.add.rectangle(scene.worldMinX??0,0,scene.worldWidth,scene.worldHeight,0,0).setOrigin(0).setDepth(9200);
    this.lights=scene.add.graphics().setDepth(9202);
    this.sand=scene.add.graphics().setDepth(9201);
    const eastern=(scene.map.getObjectLayer('RegionMarkers')?.objects??[]).find(o=>scene.prop(o,'regionId')==='east-pasture');
    this.desert=eastern&&{left:eastern.x,right:eastern.x+eastern.width,top:eastern.y,bottom:eastern.y+eastern.height};
    this.sources=[];
    for(const [layer,kind] of [['RampartArt','torch'],['SectCampusStations','jade'],['SocietyStations','window'],['WestLights','wild']]){
      for(const o of scene.map.getObjectLayer(layer)?.objects??[]){
        const key=scene.prop(o,'station')??scene.prop(o,'use')??o.name;
        if(kind==='torch'&&!/tower|gate|watch|vọng|cổng/i.test(o.name))continue;
        if(kind==='jade'&&!/array|ore-|gate/.test(key))continue;
        if(kind==='window'&&key!=='staff')continue;
        this.sources.push({x:o.x+(o.gid?o.width/2:0),y:o.y-(o.gid?o.height*.6:16),kind});
      }
    }
    for(const layer of ['StaticDecor','Buildings','SocietyArt'])for(const o of scene.map.getObjectLayer(layer)?.objects??[]){
      if(scene.prop(o,'kind')!=='city-house'&&!/khách điếm|tửu quán|nhã nhạc/i.test(o.name))continue;
      const y=o.y-o.height*.27;
      for(const pos of [.33,.67])this.sources.push({x:o.x+o.width*pos,y,kind:'window'});
    }
    this.water=(scene.map.getObjectLayer('FlowEffects')?.objects??[]).filter((_,i)=>i%4===0);
    this.clock=document.getElementById('world-clock');
    this.rate=document.getElementById('world-clock-speed');
    this.rate?.addEventListener('change',()=>{
      const world=scene.populationWorld;
      world.clock.paused=this.rate.value==='0';
      if(!world.clock.paused)world.clock.speed=Number(this.rate.value);
      scene.requestBackgroundSave();
    });
  }

  update(time) {
    if(time<(this.nextUpdate??0))return;
    this.nextUpdate=time+120;
    const {scene}=this,{day,minute,speed,paused}=scene.populationWorld.clock;
    const lighting=daylightAt(minute+(scene.populationTick??0)/1000);
    this.tone.setFillStyle(lighting.color,lighting.alpha);
    this.lights.clear();
    const view=scene.cameras.main.worldView;
    if(lighting.lamps>0.015&&scene.cameras.main.zoom>.32){
      let visible=0;
      for(const {x,y,kind} of this.sources){
        if(x<view.x-48||x>view.right+48||y<view.y-48||y>view.bottom+48)continue;
        const cool=kind==='jade'||kind==='wild', color=cool?0x8ae4c7:0xffc46e;
        const strength=(.85+.15*Math.sin(time/440+x))*lighting.lamps;
        for(const [w,h,a] of [[48,29,.09],[32,20,.13],[18,11,.22]])this.lights.fillStyle(color,a*strength).fillEllipse(x,y,w,h);
        const window=kind==='window';
        this.lights.fillStyle(cool?0xd1ffe6:0xffe4a6,strength).fillRect(x-(window?5:2),y-2,window?10:4,4);
        if(++visible>=65)break;
      }
      for(const p of this.water){
        if(p.x<view.x||p.x>view.right||p.y<view.y||p.y>view.bottom)continue;
        const step=Math.round(Math.sin(time/620+p.y)*4);
        this.lights.fillStyle(0xa8d6e4,lighting.lamps*.38).fillRect(p.x-step-11,p.y+4,22+step,2);
        this.lights.fillStyle(0xd7eff3,lighting.lamps*.26).fillRect(p.x+step-6,p.y-2,13-step,1);
      }
    }
    const storm=this.updateSand(view,day,minute+(scene.populationTick??0)/1000);
    const timeText=`${lighting.icon} Ngày ${day} · ${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;
    const forecast=lighting.name+(storm?' · Bão cát':'');
    if(this.clock&&(this.clock.dataset.minute!==timeText||this.clock.dataset.forecast!==forecast)){
      this.clock.dataset.minute=timeText;
      this.clock.querySelector('b').textContent=timeText;
      this.clock.dataset.forecast=forecast;
      this.clock.querySelector('small').textContent=forecast;
    }
    if(this.rate&&this.rate.value!==String(paused?0:speed??1))this.rate.value=String(paused?0:speed??1);
    return lighting;
  }

  updateSand(view,day,minute){
    const g=this.sand,d=this.desert;
    g.clear();
    if(!d||view.centerX<d.left||view.centerX>d.right||view.centerY<d.top||view.centerY>d.bottom)return false;
    const left=Math.max(view.x,d.left),top=Math.max(view.y,d.top),right=Math.min(view.right,d.right),bottom=Math.min(view.bottom,d.bottom);
    const at=755+(day%4)*41,storm=minute>at&&minute<at+48;
    const nocturnal=minute>=1140||minute<300;
    g.fillStyle(nocturnal?0x737baa:0xf6bb71,storm?.10:nocturnal?.035:.026).fillRect(left,top,right-left,bottom-top);
    if(this.scene.cameras.main.zoom<.4)return storm;
    const time=(day*1440+minute)*1000,count=storm?32:9,stride=storm?520:370;
    g.fillStyle(0xffdc9b,storm?.36:.18);
    for(let i=0;i<count;i++){
      const x=d.left+(i*719+time/stride*(5+i%4))%(d.right-d.left);
      const y=d.top+(i*1379+time/1920)%(d.bottom-d.top);
      if(x<left||x>right||y<top||y>bottom)continue;
      g.fillRect(x,y,2+i%5,1);
    }
    return storm;
  }
}

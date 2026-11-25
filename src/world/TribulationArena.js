import './tribulation-arena.css';
import { REALMS } from '../systems/RealmConfig.ts';
import { durationFor, previewTrial } from './TribulationVisualTimeline.js';

const labels={cloud:'Kiếp vân hội tụ',warning:'Lôi đình tích tụ',strike:'Thiên lôi giáng thế',
  success:'Đột phá thành công',failure:'Vượt kiếp thất bại'};

export class TribulationArena {
  constructor(scene,cultivation){
    this.scene=scene;
    this.cultivation=cultivation;
    this.vfx=cultivation.stormVisuals;
    this.seconds=0;
    this.rate=1;
    this.paused=true;
    this.arenaActors=new Map();
    const panel=document.createElement('aside');
    panel.id='tribulation-arena';
    panel.setAttribute('aria-label','Sân thử Cửu Thiên Lôi Kiếp');
    panel.innerHTML=`<header><h2>Cửu Thiên Lôi Kiếp</h2><p>Chế độ xem thử</p></header>
      <div class="arena-fields">
        <label>Cấp kiếp<select name="realm">${REALMS.slice(1).map((realm,i)=>`<option value="${i}">${realm.name}</option>`).join('')}</select></label>
        <label>Kết quả<select name="outcome"><option value="success">Thành công</option><option value="failure">Thất bại</option></select></label>
        <label>Tu sĩ<select name="count"><option value="1">1</option><option value="3">3</option></select></label>
        <label>Chất lượng<select name="quality"><option value="low">Thấp</option><option value="medium">Trung bình</option><option value="high">Cao</option></select></label>
        <label>Tốc độ<select name="rate"><option value=".25">¼×</option><option value=".5">½×</option><option value="1" selected>1×</option></select></label>
        <label>Zoom <input name="zoom" type="range" min=".25" max="1.8" step=".05" value="1.35"></label>
      </div>
      <div class="arena-options">
        <label><input type="checkbox" name="flash"> Ánh chớp</label>
        <label><input type="checkbox" name="shake"> Rung camera</label>
        <label><input type="checkbox" name="sound"> Âm thanh</label>
        <label><input type="checkbox" name="target"> Điểm đánh</label>
      </div>
      <div class="arena-playback"><button type="button" data-restart>Phát từ đầu</button>
        <button type="button" data-pause>Tiếp tục</button><button type="button" data-step>+1 khung hình</button></div>
      <label class="arena-timeline">Dòng thời gian <input name="seek" type="range" min="0" max="16" step=".0166667" value="0"></label>
      <output aria-live="polite"></output>`;
    document.body.append(panel);
    this.panel=panel;
    const field=name=>panel.querySelector('[name='+name+']');
    this.fields=Object.fromEntries(['realm','outcome','count','quality','rate','zoom','flash','shake','sound','target','seek']
      .map(name=>[name,field(name)]));
    field('quality').value=this.vfx.settings.quality;
    for(const key of ['flash','shake','sound']){
      field(key).checked=this.vfx.settings[key];
      field(key).onchange=()=>this.vfx.setOptions({[key]:field(key).checked});
    }
    field('quality').onchange=()=>this.vfx.setOptions({quality:field('quality').value});
    field('zoom').oninput=()=>scene.setZoom(Number(field('zoom').value));
    field('rate').onchange=()=>{this.rate=Number(field('rate').value);};
    for(const key of ['realm','outcome','count'])field(key).onchange=()=>this.reset(false);
    field('seek').oninput=()=>this.seek(Number(field('seek').value));
    panel.querySelector('[data-restart]').onclick=()=>this.reset(true);
    panel.querySelector('[data-pause]').onclick=()=>{
      if(this.seconds>=this.duration){this.reset(true);return;}
      this.paused=!this.paused;
    };
    panel.querySelector('[data-step]').onclick=()=>this.seek(this.seconds+1/60);
    this.output=panel.querySelector('output');
    this.pauseButton=panel.querySelector('[data-pause]');
    this.marker=scene.add.graphics().setDepth(6489).setVisible(false);
    scene.events.once('shutdown',()=>panel.remove());
  }

  reset(playing=false){
    const {fields,scene}=this;
    const index=Number(fields.realm.value),count=Number(fields.count.value),result=fields.outcome.value;
    this.vfx.cues.clear();
    this.seconds=0;this.paused=!playing;this.lastTime=undefined;
    this.arenaActors.clear();
    const base=this.cultivation.sites[0]??scene.markers.find(m=>m.id==='sect-yard');
    if(!base)return;
    const actors=scene.populationWorld.npcs.filter(n=>n.alive&&n.modularAppearance&&n.profession==='tu_si').slice(0,count);
    for(const [i,n] of actors.entries()){
      const rank=index,delay=i*.45;
      const point={x:base.x+(i===0?0:i===1?240:-240),y:base.y+(i===0?0:25)};
      // Only this sandbox uses staged positions; HP and breakthroughs are never applied here.
      Object.assign(n,point);
      const actor=scene.npcSprites.get(n.id);
      actor.setPosition(point.x,point.y).setDepth(point.y).setData('moving',false).setVisible(true);
      this.arenaActors.set(n.id,{rank,delay,point,result});
    }
    this.duration=durationFor(index)+(actors.length-1)*.45;
    fields.seek.max=String(this.duration);
    const zoom=count>1?.92:1.35;
    fields.zoom.value=String(zoom);
    scene.cameraTween?.stop();scene.cameraTween=null;scene.setZoom(zoom);
    scene.cameras.main.centerOn(base.x,base.y-(171+index*34)*.52);
  }

  seek(seconds){
    this.paused=true;
    this.seconds=Math.min(this.duration??0,Math.max(0,seconds));
  }

  pose(npc){
    const data=this.arenaActors.get(npc.id);
    if(!data)return null;
    const row=previewTrial(npc.id,data.rank,data.point,Math.max(0,this.seconds-data.delay),data.result);
    return {name:row.t.phase==='failure'?'BreakthroughFailure':row.t.phase==='success'?'BreakthroughSuccess':'BreakthroughPrepare',
      amount:1,breath:Math.floor(this.seconds*2.2)%3===1?1:0,shocked:row.strikeAge<125};
  }

  draw(time){
    if(!this.paused){
      const dt=Math.min(.08,(time-(this.lastTime??time))/1000);
      this.seconds=Math.min(this.duration,this.seconds+dt*this.rate);
      if(this.seconds>=this.duration)this.paused=true;
    }
    this.lastTime=time;
    const frames=[];
    for(const [id,data] of this.arenaActors){
      if(this.seconds<data.delay||this.seconds>data.delay+durationFor(data.rank))continue;
      frames.push(previewTrial('stage:'+id,data.rank,data.point,this.seconds-data.delay,data.result));
    }
    this.vfx.paint(time,frames,!this.paused);
    const phase=frames[0]?.t.phase;
    this.fields.seek.value=String(this.seconds);
    const status=(labels[phase]??'Kiếp vân đã tan')+' · '+this.seconds.toFixed(1)+' / '+(this.duration??0).toFixed(1)+' s';
    if(this.output.textContent!==status)this.output.textContent=status;
    const action=this.paused?'Tiếp tục':'Tạm dừng';
    if(this.pauseButton.textContent!==action)this.pauseButton.textContent=action;
    this.marker.clear().setVisible(this.fields.target.checked);
    if(this.fields.target.checked){
      for(const {anchor} of frames){
        this.marker.lineStyle(1,0xf4c66a,1);
        this.marker.lineBetween(anchor.x-12,anchor.y,anchor.x+12,anchor.y);
        this.marker.lineBetween(anchor.x,anchor.y-9,anchor.x,anchor.y+9);
      }
    }
  }
}

import {CharacterRenderer} from './CharacterRenderer.js';
import {validateAppearance} from './CharacterAppearance.js';
import {visualEquipment} from './CharacterEquipment.js';
import {weaponForNpc} from './WeaponCombat.js';
import {applyProfession} from './ProfessionAppearance.js';
import {CAVE_BEASTS,CAVE_TREASURES,CAVE_BIOMES,CAVE_FLORA,caveBiomeAt,caveDistance} from './UndergroundMaps.js';
import {UG_TILE as tile,UG_CHUNK as chunk,rect,polygon,crystal,mineral,propArt,portalArt,plantArt,makeCaveChunk,makeOverview} from './UndergroundArt.js';
import {waterFlowFrame} from './WaterFlowFrame.js';
import './underground-world.css';

function beastVisual(g,beast,centerX,centerY,now){
  const {phase,species}=beast,spec=CAVE_BEASTS[species],active=['ACTIVE','COMBAT','RETURN_HOME'].includes(phase);
  const sand=species===0?'#cb9a64':spec.color;
  if(beast.hp<=0)return;
  if(!active){
    if(phase==='BURIED_IDLE')return;
    for(let i=0;i<7;i++){
      const dx=(i*9+now%5)%26-13,dy=(i*7+now)%12;
      rect(g,centerX+dx,centerY+dy-6,2,1,sand);
    }
    if(phase!=='EMERGING')return;
  }
  g.save();g.translate(centerX,centerY+(active?0:5));
  const body=[
    [[-13,4],[-10,0],[-6,0],[-7,-9],[0,-16],[6,-14],[9,-8],[6,-2],[12,2],[11,5]],
    [[-14,1],[-9,-4],[-6,-2],[-4,-8],[7,-8],[9,-2],[14,-5],[15,-1],[10,5],[-9,5]],
    [[-13,5],[-12,-6],[-6,-9],[-5,-16],[5,-17],[8,-12],[13,-6],[12,6],[4,4],[-7,6]],
    [[-16,-4],[-9,-12],[-4,-7],[-3,-12],[3,-13],[6,-7],[10,-12],[17,-5],[12,2],[7,-1],[3,6],[-3,5],[-7,-1],[-13,1]],
    [[-14,4],[-14,-1],[-7,-10],[4,-9],[9,-5],[13,0],[15,3],[8,6],[-11,6]],
    [[-19,4],[-17,-2],[-11,0],[-8,-9],[-1,-11],[4,-15],[10,-15],[13,-9],[19,-9],[19,-3],[11,1],[8,7],[-13,7]],
  ][species];
  polygon(g,body,'#181621');
  g.scale(.85,.82);polygon(g,body,spec.color);
  rect(g,species===5?10:-2,-7,3,2,'#ffe59c');
  rect(g,-8,7,16,2,'#25202b');rect(g,-8,7,Math.round(16*beast.hp/spec.hp),2,'#dc9b7d');
  g.restore();
}

export class UndergroundView {
  paintCharacter(npc,g,x,y){
    const look=npc.modularAppearance?.look;
    if(!look)return false;
    const scene=this.system.scene,d=npc.underground,weapon=visualEquipment(weaponForNpc(npc));
    let entry=this.characters.get(npc.id);
    if(!entry){
      const renderer=new CharacterRenderer(scene,0,0,{...validateAppearance(look),weapon});
      renderer.root.setVisible(false);
      this.characters.set(npc.id,entry={renderer,look,weapon});
    }
    const {renderer}=entry;
    if(entry.look!==look||entry.weapon!==weapon){renderer.customize({...look,weapon});entry.look=look;entry.weapon=weapon;}
    if(npc.action==='fight'&&entry.attack!==d.attackAt){
      renderer.combat.attack(d.facing);entry.attack=d.attackAt;
    }
    const head=this.system.world.clock.paused?5:Math.floor(this.system.scene.time.now/105)%6;
    renderer.workPose=npc.action==='work'&&d.nodeId?{x:[0,1,3,4,3,1][head],y:[0,-5,-9,4,3,1][head],bend:[0,0,1,3,2,1][head]}:null;
    const at=this.system.scene.time.now,elapsed=Math.min(130,at-(entry.paintedAt??at-90));
    entry.paintedAt=at;
    renderer.advance(elapsed,npc.action==='travel'?'walk':'idle',d.facing,npc.action==='travel'?9:0);
    applyProfession(renderer,npc,npc.action==='work'&&d.nodeId?12:null);
    g.save();g.translate(x,y);g.scale(.36,.36);
    for(const layer of renderer.root.list){
      const f=layer.frame;
      if(!layer.visible||!f?.source.image)continue;
      g.save();g.translate(layer.x,layer.y);g.rotate(layer.rotation);g.scale(layer.scaleX,layer.scaleY);
      g.drawImage(f.source.image,f.cutX,f.cutY,f.cutWidth,f.cutHeight,(f.trimmed?f.x:0)-layer.displayOriginX,(f.trimmed?f.y:0)-layer.displayOriginY,f.cutWidth,f.cutHeight);
      g.restore();
    }
    g.restore();
    return true;
  }

  constructor(system){
    this.system=system;this.characters=new Map();this.chunks=new Map();this.motion=new Map();
    this.panel=document.createElement('section');
    this.panel.className='underground-world';this.panel.hidden=true;
    this.panel.innerHTML=`<canvas class="cave-world" aria-label="Địa Mạch Thế Giới"></canvas>
      <header><b data-place></b><nav><select data-speed aria-label="Tốc độ thời gian trong mỏ"><option value="0">Dừng</option><option value="1">×1</option><option value="2">×2</option><option value="4">×4</option></select>
      <button data-up>Tầng trên</button><button data-down>Tầng dưới</button><button data-close>Về mặt đất</button></nav></header>
      <div class="cave-overview"><canvas width="162" height="162" aria-label="Bản đồ tổng quan của tầng"></canvas>
      <div><button data-fit>Toàn tầng</button><button data-focus>Về cửa</button></div></div>
      <aside hidden><button data-clear aria-label="Đóng giám định">×</button><h2>Thiên Đạo Giám Định</h2><strong></strong><dl></dl>
      <button data-follow hidden>Theo dõi</button></aside>
      <footer><span data-stats></span><span data-hint></span></footer>`;
    this.canvas=this.panel.querySelector('.cave-world');this.minimap=this.panel.querySelector('.cave-overview canvas');
    this.info=this.panel.querySelector('aside');this.ctx=this.canvas.getContext('2d',{alpha:false});
    this.el=name=>this.panel.querySelector('[data-'+name+']');
    this.el('speed').onchange=()=>{const select=document.getElementById('world-clock-speed');select.value=this.el('speed').value;select.dispatchEvent(new Event('change'));};
    this.el('close').onclick=()=>this.hide();
    this.el('up').onclick=()=>this.show(this.id,this.level-1);
    this.el('down').onclick=()=>this.show(this.id,this.level+1);
    this.el('fit').onclick=()=>this.fit();
    this.el('focus').onclick=()=>this.focus(this.floor.entry);
    this.el('clear').onclick=()=>{this.selection=null;this.info.hidden=true;};
    this.el('follow').onclick=()=>{this.follow=this.selection?.npcId??null;this.dirty=true;};
    this.minimap.onclick=e=>{
      if(this.controlled)return;
      const r=this.minimap.getBoundingClientRect();
      this.focus({x:(e.clientX-r.left)*this.floor.width/r.width,y:(e.clientY-r.top)*this.floor.height/r.height},false);
      this.follow=null;
    };
    this.canvas.addEventListener('wheel',e=>{
      e.preventDefault();
      const p=this.screenToWorld(e.offsetX,e.offsetY);
      const before=this.zoom;
      this.zoom=Math.min(2.6,Math.max(this.fitZoom(),before*Math.exp(-e.deltaY*.0015)));
      if(!this.controlled){this.follow=null;this.center.x=p.x+(this.center.x-p.x)*before/this.zoom;this.center.y=p.y+(this.center.y-p.y)*before/this.zoom;}
      this.dirty=true;
    },{passive:false});
    this.canvas.onpointerdown=e=>{
      if(e.button!==0)return;
      this.canvas.setPointerCapture(e.pointerId);
      this.drag={x:e.offsetX,y:e.offsetY,moved:false};
    };
    this.canvas.onpointermove=e=>{
      if(!this.drag||this.controlled)return;
      const dx=e.offsetX-this.drag.x,dy=e.offsetY-this.drag.y;
      if(Math.abs(dx)+Math.abs(dy)<3&&!this.drag.moved)return;
      this.center.x-=dx/this.zoom;this.center.y-=dy/this.zoom;
      this.drag={x:e.offsetX,y:e.offsetY,moved:true};this.follow=null;this.dirty=true;
    };
    this.canvas.onpointerup=e=>{if(this.drag&&!this.drag.moved)this.inspect(this.screenToWorld(e.offsetX,e.offsetY),e.shiftKey);this.drag=null;};
    this.canvas.onpointercancel=()=>{this.drag=null;};
    document.body.append(this.panel);
    const tick=()=>{if(this.id)this.render();};
    system.scene.events.on('postupdate',tick);
    system.scene.events.once('shutdown',()=>{system.scene.events.off('postupdate',tick);this.panel.remove();});
  }
  get site(){return this.system.sites.get(this.id);}
  get floor(){return this.site?.map.floors[this.level];}
  get state(){return this.system.state.instances[this.id];}
  get residents(){return this.system.world.npcs.filter(n=>n.alive&&n.underground?.siteId===this.id&&n.underground.floor===this.level);}
  fitZoom(){return Math.max(.035,Math.min((this.canvas.clientWidth-40)/(this.floor.width*tile),(this.canvas.clientHeight-72)/(this.floor.height*tile))); }
  focus(p,normal=true){
    if(normal)this.zoom=Math.min(2.6,Math.max(this.fitZoom(),1.25));
    this.center={x:(p.x+.5)*tile,y:(p.y+.5)*tile};this.dirty=true;
  }
  fit(){this.zoom=this.fitZoom();this.center={x:this.floor.width*tile/2,y:this.floor.height*tile/2};this.follow=null;this.dirty=true;}
  locate(npc){
    if(!npc?.underground)return false;
    const d=npc.underground;
    this.show(d.siteId,d.floor);
    this.focus(d);this.selection={npcId:npc.id};this.follow=npc.id;
    return true;
  }
  show(id,level=0,controlled=false){
    const site=this.system.sites.get(id);
    if(!site?.map.floors[level]||this.id===id&&this.level===level&&this.controlled===controlled)return;
    this.id=id;this.level=level;this.controlled=controlled;this.selection=null;this.follow=null;this.info.hidden=true;
    this.panel.hidden=false;
    this.system.scene.cameras.main.setVisible(false);
    this.el('up').hidden=controlled||level===0;this.el('down').hidden=controlled||!this.floor.down;this.el('close').hidden=controlled;
    this.el('fit').hidden=controlled;this.el('focus').hidden=controlled;
    this.el('hint').textContent=controlled?'WASD di chuyển · E tương tác · J đánh · Esc thoát nhập thân':'Kéo bản đồ · lăn chuột để zoom · nhấp để giám định';
    this.chunks.clear();this.motion.clear();this.overview=makeOverview(this.floor,6);
    this.focus(this.floor.entry);this.render();
  }
  hide(){
    if(!this.id)return;
    this.id=null;this.follow=null;this.selection=null;this.panel.hidden=true;
    for(const entry of this.characters.values())entry.renderer.destroy();
    this.characters.clear();this.chunks.clear();this.motion.clear();this.overview=null;
    this.system.scene.cameras.main.setVisible(true);
  }
  screenToWorld(x,y){const c=this.screenCenter??this.center;return {x:c.x+(x-this.canvas.clientWidth/2)/this.zoom,y:c.y+(y-this.canvas.clientHeight/2)/this.zoom};}
  findChunk(cx,cy){
    const key=cx+':'+cy;
    let bg=this.chunks.get(key);
    if(bg){this.chunks.delete(key);this.chunks.set(key,bg);return bg;}
    bg=makeCaveChunk(this.floor,cx,cy);
    this.chunks.set(key,bg);
    if(this.chunks.size>72)this.chunks.delete(this.chunks.keys().next().value);
    return bg;
  }
  amount(node){return this.system.observedStock(this.site)[node.id]??0;}
  inspect(p,preferDeposit=false){
    const {floor,state}=this;
    const at={x:Math.floor(p.x/tile),y:Math.floor(p.y/tile)};
    const near=q=>q&&caveDistance(q,at)<=1;
    const npc=this.residents.find(n=>near(n.underground));
    const beast=state?.beasts?.[this.level],node=this.site.map.nodes.find(n=>n.level===this.level&&near(n));
    const plant=floor.flora.find(near),prop=floor.props.find(near);
    if(node&&preferDeposit)this.selection={nodeId:node.id};
    else if(npc){this.selection={npcId:npc.id};if(this.controlled)this.system.selectedNpcId=npc.id;}
    else if(beast?.phase!=='BURIED_IDLE'&&near(beast)&&beast.hp>0)this.selection={beast:true};
    else if(node)this.selection={nodeId:node.id};
    else if(plant)this.selection={plantId:plant.id};
    else if(prop)this.selection={prop};
    else if(near(floor.treasure))this.selection={treasure:true};
    else this.selection={biome:caveBiomeAt(floor,at.x,at.y)};
    this.dirty=true;
  }
  details(){
    const s=this.selection;if(!s)return;
    const {site,floor,state,system}=this,place='Tầng '+(this.level+1),rows=[];
    const n=system.scene.scheduler.byId.get(s.npcId)?.npc;
    let name;
    if(n){
      name=n.name;
      const d=n.underground;
      rows.push(['Sinh lực',n.hp],['Linh lực',n.mp],['Hoạt động',n.shortGoal],['Tổ đội',system.scene.expeditions?.of(n)?.name??'Đi một mình']);
      const custody=system.scene.civic?.state.custody[n.id];
      if(custody)rows.push(['Hồ sơ',custody.caseId],['Trạng thái',custody.status]);
      if(d)rows.push(['Vị trí','Tầng '+(d.floor+1)+' · '+d.x+', '+d.y]);
    }else if(s.nodeId){
      const node=site.map.nodes.find(n=>n.id===s.nodeId),amount=this.amount(node);
      name=system.nodeName(site,node);
      const miner=this.residents.find(n=>n.underground.nodeId===node.id);
      rows.push(['Phẩm cấp',site.quality??'Quặng sắt'],['Trữ lượng',amount+' / '+node.capacity],['Mạch chủ',site.name],
        ['Chủ sở hữu',system.scene.civic?.name(site.state.owner)??'Vô chủ'],['Vị trí',place+' · '+node.x+', '+node.y],
        ['Khoáng công',miner?.name??'Chưa có'],['Số chỗ',node.slots],['Trạng thái',amount?(miner?'Đang khai thác':'Còn tài nguyên'):'Đã cạn']);
    }else if(s.plantId){
      const plant=floor.flora.find(p=>p.id===s.plantId),stage=system.plantStage(site,plant);
      name=CAVE_FLORA[plant.type].name;
      rows.push(['Sinh cảnh',CAVE_BIOMES[caveBiomeAt(floor,plant.x,plant.y)].name],['Sinh trưởng',['Mới mọc','Cây non','Đang lớn','Trưởng thành'][stage]??'Đã thu hái'],['Vị trí',place]);
    }else if(s.beast){
      const b=state?.beasts[this.level];if(!b)return;
      name=CAVE_BEASTS[b.species].name;
      rows.push(['Sinh lực',b.hp],['Kỹ năng',CAVE_BEASTS[b.species].skill],['Trạng thái',b.phase],['Lãnh địa',place]);
    }else if(s.treasure){
      name=CAVE_TREASURES[floor.treasure.type];rows.push(['Trạng thái',state?.treasures[this.level]?'Đã lấy':'Còn tại chỗ'],['Vị trí',place]);
    }else{
      if(s.prop?.kind==='camp')rows.push(['Công dụng','E nghỉ · Shift+E gửi · R lấy'],['Kho tạm',Object.values(state?.warehouse??{}).flat().reduce((sum,row)=>sum+row.count,0)+' đơn vị']);
      name=s.prop?.name??CAVE_BIOMES[s.biome??0].name;rows.push(['Vị trí',place],['Mạch',site.name]);
    }
    const signature=JSON.stringify([name,rows]);
    this.info.hidden=false;
    this.el('follow').hidden=!n?.underground||this.controlled;
    if(this.detailsSignature===signature)return;
    this.detailsSignature=signature;
    this.info.querySelector('strong').textContent=name;
    const dl=this.info.querySelector('dl');
    dl.replaceChildren(...rows.flatMap(([k,v])=>{
      const a=document.createElement('dt'),b=document.createElement('dd');a.textContent=k;b.textContent=v;return [a,b];
    }));
  }
  interpolate(residents,at){
    const current=new Map();
    for(const n of residents){
      const p=n.underground,x=p.x,y=p.y;
      let m=this.motion.get(n.id);
      if(!m)m={x,y,fromX:x,fromY:y,started:at-380};
      else if(m.x!==x||m.y!==y)m={x,y,fromX:m.x,fromY:m.y,started:at};
      this.motion.set(n.id,m);
      const duration=this.controlled&&n.id===this.system.scene.possessedNpcId?108:300;
      const ratio=Math.max(0,Math.min(1,(at-m.started)/duration));
      current.set(n.id,{x:m.fromX+(x-m.fromX)*ratio,y:m.fromY+(y-m.fromY)*ratio,animating:ratio<1});
    }
    for(const id of this.motion.keys())if(!current.has(id))this.motion.delete(id);
    return current;
  }
  render(){
    const {floor,site,system,ctx:g}=this;
    if(!floor||!this.canvas.clientWidth)return;
    const W=this.canvas.clientWidth,H=this.canvas.clientHeight;
    if(this.canvas.width!==W||this.canvas.height!==H){this.canvas.width=W;this.canvas.height=H;this.dirty=true;}
    const clock=system.world.clock,state=this.state,residents=this.residents,at=system.scene.time.now;
    const poses=this.interpolate(residents,at);
    const isAnimating=this.zoom>=.56&&[...poses.values()].some(p=>p.animating);
    const tools=this.zoom>=.56&&!clock.paused&&residents.some(n=>n.action==='work');
    const tracked=system.scene.scheduler.byId.get(this.controlled?system.scene.possessedNpcId:this.follow)?.npc;
    if(tracked?.underground?.siteId===this.id){
      const d=tracked.underground;
      if(d.floor!==this.level){const id=this.follow;this.show(this.id,d.floor,this.controlled);this.follow=id;return;}
      const p=poses.get(tracked.id)??d;
      const x=(p.x+.5)*tile,y=(p.y+.5)*tile;
      if(x!==this.center.x||y!==this.center.y){this.center={x,y};this.dirty=true;}
    }
    const rippleBeat=this.zoom>=.56?Math.floor(at/170):0;
    const status=[rippleBeat,clock.day,clock.minute,clock.paused,clock.speed,site.state.amount,residents.map(n=>[n.id,n.underground.x,n.underground.y,n.action,n.hp]).join('/'),state?.beasts[this.level]?.hp,tools?Math.floor(at/105):0].join('|');
    if(!this.dirty&&!isAnimating&&status===this.signature&&!this.wasAnimating)return;
    this.wasAnimating=isAnimating;
    this.signature=status;this.dirty=false;
    const z=this.zoom;
    const clamp=(p,max,half)=>half*2>=max?max/2:Math.max(half,Math.min(max-half,p));
    const cx=clamp(this.center.x,floor.width*tile,W/(2*z)),cy=clamp(this.center.y,floor.height*tile,H/(2*z));
    this.screenCenter={x:cx,y:cy};
    const left=cx-W/(2*z),top=cy-H/(2*z);
    const right=left+W/z,bottom=top+H/z;
    const visible=(p,padding=2)=>p.x>=left/tile-padding&&p.y>=top/tile-padding&&p.x<=right/tile+padding&&p.y<=bottom/tile+padding;
    g.imageSmoothingEnabled=false;rect(g,0,0,W,H,'#141c26');
    g.save();g.translate(Math.round(-left*z),Math.round(-top*z));g.scale(z,z);
    if(z<.56)g.drawImage(this.overview,0,0,floor.width*tile,floor.height*tile);
    else{
      const size=tile*chunk;
      for(let cy=Math.max(0,Math.floor(top/size));cy<=Math.min(Math.ceil(floor.height/chunk)-1,Math.floor(bottom/size));cy++)
        for(let cx=Math.max(0,Math.floor(left/size));cx<=Math.min(Math.ceil(floor.width/chunk)-1,Math.floor(right/size));cx++){
          g.drawImage(this.findChunk(cx,cy),cx*size,cy*size);
        }
    }
    if(z>=.56){
      const texture=system.scene.textures.get('rebuild-water-motion');
      let drawn=0;
      for(let y=Math.max(0,Math.floor(top/tile));y<floor.height&&y<bottom/tile&&drawn<90;y++)
        for(let x=Math.max(0,Math.floor(left/tile));x<floor.width&&x<right/tile&&drawn<90;x++){
          if(floor.rows[y]?.[x]!=='~'||(x+y*2)%3)continue;
          const f=texture.get(waterFlowFrame(at,170,(x*3+y)%8));
          if(!f)continue;
          g.globalAlpha=.66;
          g.drawImage(f.source.image,f.cutX,f.cutY,f.cutWidth,f.cutHeight,x*tile+2,y*tile+2,tile-4,tile-4);
          g.globalAlpha=1;drawn++;
        }
    }
    const draw=[];
    const place=(p,fn)=>{if(visible(p))draw.push({y:p.y,draw:()=>fn(p.x*tile+12,p.y*tile+18)});};
    place(floor.entry,(x,y)=>portalArt(g,x,y,false));if(floor.down)place(floor.down,(x,y)=>portalArt(g,x,y,true));
    for(const prop of floor.props)place(prop,(x,y)=>propArt(g,x,y,prop,CAVE_BIOMES[caveBiomeAt(floor,prop.x,prop.y)].accent));
    for(const p of floor.flora)place(p,(x,y)=>plantArt(g,x,y,p.type,system.plantStage(site,p)));
    const stock=system.observedStock(site);
    for(const node of site.map.nodes)if(node.level===this.level)place(node,(x,y)=>mineral(g,x,y,site,Boolean(stock[node.id])));
    if(floor.treasure&&!state?.treasures[this.level])place(floor.treasure,(x,y)=>crystal(g,x,y,'#f3dc9d',.7));
    for(const drop of state?.drops??[])if(drop.level===this.level&&!drop.claimed)place(drop,(x,y)=>rect(g,x-2,y-4,4,4,'#e9ca86'));
    const beast=state?.beasts[this.level];
    if(beast)place(beast,(x,y)=>beastVisual(g,beast,x,y,clock.minute));
    const drawn=new Set();
    for(const n of residents)if(visible(n.underground))place(poses.get(n.id)??n.underground,(x,y)=>{
      if(z<.3){rect(g,x-4,y-10,8,8,'#f4dfaa');return;}
      drawn.add(n.id);
      rect(g,x-6,y+2,12,2,'#212a33');
      if(!this.paintCharacter(n,g,x,y+4)){
        const f=system.scene.npcSprites.get(n.id)?.frame;
        if(f)g.drawImage(f.source.image,f.cutX,f.cutY,f.cutWidth,f.cutHeight,x-12,y-26,24,28);
      }
    });
    draw.sort((a,b)=>a.y-b.y);for(const layer of draw)layer.draw();g.restore();
    for(const [id,e] of this.characters)if(!drawn.has(id)){e.renderer.destroy();this.characters.delete(id);}
    const mini=this.minimap.getContext('2d');mini.imageSmoothingEnabled=false;mini.drawImage(this.overview,0,0,162,162);
    const mx=162/(floor.width*tile),my=162/(floor.height*tile);
    mini.strokeStyle='#ecd9a1';mini.strokeRect(left*mx,top*my,(right-left)*mx,(bottom-top)*my);
    for(const n of residents)rect(mini,n.underground.x*162/floor.width,n.underground.y*162/floor.height,2,2,'#f2d99b');
    const biome=CAVE_BIOMES[caveBiomeAt(floor,this.center.x/tile,this.center.y/tile)];
    this.el('place').textContent=site.name+' – Tầng '+(this.level+1)+' – '+biome.name;
    this.el('stats').textContent='Trữ lượng '+site.state.amount+'/'+site.max+' · '+residents.length+' cư dân · Zoom '+Math.round(z*100)+'%';
    this.el('speed').value=String(clock.paused?0:clock.speed??1);
    this.details();
  }
}

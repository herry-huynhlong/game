import { inspectionBrief, inspectionSnapshot } from './WorldInspectionData.js';
import './world-inspector.css';

const CELL=192;
const priority={"east-site":2,palace:3,tree:0,building:1,shop:2,ore:2,npc:3,venue:4,fauna:4,herb:5,westHerb:5,treasure:6,drop:6,spiritVein:7};
const keyOf=({kind,id})=>kind+':'+id;
const visible=sprite=>sprite?.visible&&sprite.active&&(sprite.alpha>.03||sprite.showingModularPose);

function localPixel(sprite,point){
  const dx=point.x-sprite.x,dy=point.y-sprite.y,c=Math.cos(sprite.rotation),s=Math.sin(sprite.rotation);
  const px=(dx*c+dy*s)/sprite.scaleX+sprite.displayOriginX;
  const py=(-dx*s+dy*c)/sprite.scaleY+sprite.displayOriginY;
  const {realWidth:w,realHeight:h}=sprite.frame;
  if(px<0||py<0||px>=w||py>=h)return null;
  return {x:sprite.flipX?w-1-Math.floor(px):Math.floor(px),y:sprite.flipY?h-1-Math.floor(py):Math.floor(py)};
}

function opaque(sprite,point){
  const pixel=localPixel(sprite,point);
  if(!pixel)return false;
  // The modular renderer retains the existing NPC sprite as its interaction surface.
  if(sprite.showingModularPose)return true;
  const {source}=sprite.frame;
  if(!source.isCanvas&&!source.isVideo&&!(source.image instanceof HTMLImageElement))return true;
  return sprite.scene.textures.getPixelAlpha(pixel.x,pixel.y,sprite.texture.key,sprite.frame.name)>=110;
}

export class WorldEntityInspector {
  constructor(scene){
    this.scene=scene;
    this.static=new Map();
    this.cells=new Map();
    this.registerScenery();
    this.marker=scene.add.graphics().setDepth(10010).setVisible(false);
    this.panel=document.createElement('aside');
    this.panel.id='world-inspector';
    this.panel.hidden=true;
    this.panel.setAttribute('aria-labelledby','world-inspector-title');
    this.panel.innerHTML=`<header><span>Thiên Đạo Giám Định</span><button type="button" data-close aria-label="Đóng giám định">×</button></header>
      <div class="inspection-identity"><canvas width="64" height="64" aria-hidden="true"></canvas>
        <div><h2 id="world-inspector-title"></h2><p data-meta></p><p data-state></p></div></div>
      <div class="inspection-body">
        <div data-bars></div><dl data-fields></dl><p data-description></p>
        <div data-tables></div>
        <section data-relations hidden><h3>Liên kết bảo hộ</h3><div data-links></div></section>
        <details data-abilities><summary>Kỹ năng</summary><dl data-skills></dl></details>
        <details data-overlap hidden><summary>Đối tượng tại điểm này</summary><div data-choices></div></details>
      </div>
      <footer><button type="button" data-locate>Định vị trên bản đồ</button><button type="button" data-underground hidden>Quan sát bên trong</button></footer>`;
    this.tooltip=document.createElement('div');
    this.tooltip.id='world-inspector-tooltip';
    this.tooltip.hidden=true;
    this.tooltip.setAttribute('role','tooltip');
    document.body.append(this.panel,this.tooltip);
    this.parts=Object.fromEntries(['meta','state','bars','fields','description','tables','relations','links','abilities','skills','overlap','choices']
      .map(id=>[id,this.panel.querySelector(`[data-${id}]`)]));
    this.cached=new Map();
    this.panel.querySelector('[data-close]').onclick=()=>this.close();
    this.panel.querySelector('[data-locate]').onclick=()=>this.locate();
    this.undergroundButton=this.panel.querySelector('[data-underground]');
    this.undergroundButton.onclick=()=>{const id=this.selected?.id;this.close();scene.underground.view.show(id);};
    this.panel.addEventListener('click',e=>{
      const button=e.target.closest('button[data-inspect]');
      if(!button)return;
      const ref={kind:button.dataset.kind,id:button.dataset.inspect};
      if(ref.kind==='npc'){this.close();scene.selectNPC(ref.id);}
      else this.select(ref,button.closest('[data-choices]')?this.choices:[]);
    });
    this.keys=new AbortController();
    document.addEventListener('keydown',event=>{
      if(event.key!=='Escape'||this.panel.hidden||scene.possessedNpcId)return;
      event.preventDefault();event.stopPropagation();this.close();
    },{capture:true,signal:this.keys.signal});
    scene.events.once('shutdown',()=>{this.keys.abort();this.panel.remove();this.tooltip.remove();});
  }

  registerScenery(){
    const register=entry=>{
      const {sprite}=entry,b=sprite.getBounds();
      this.static.set(keyOf(entry),entry);
      for(let x=Math.floor(b.left/CELL);x<=Math.floor(b.right/CELL);x++)for(let y=Math.floor(b.top/CELL);y<=Math.floor(b.bottom/CELL);y++){
        const key=x+','+y,list=this.cells.get(key)??[];
        list.push(entry);this.cells.set(key,list);
      }
    };
    for(const sprite of this.scene.objectSprites){
      const obj=sprite.getData('tiledObject');
      if(!obj||this.scene.prop(obj,'legacyRampart')||this.scene.prop(obj,'retiredSect'))continue;
      if(obj.gid===676||/Phủ Thành Chủ/i.test(obj.name))register({kind:'palace',id:'qingyun-city',sprite,data:this.scene.civic});
      if(this.scene.prop(obj,'shanhe')&&this.scene.prop(obj,'kind')==='landmark')register({kind:'east-site',id:String(obj.id),sprite,data:obj});
      else if(obj.gid>=1920&&obj.gid<1952&&this.scene.prop(obj,'venue')!=='east-rest')register({kind:'east-site',id:String(obj.id),sprite,data:obj});
      if(this.scene.prop(obj,'kind')==='tree'||obj.gid>=297&&obj.gid<320)register({kind:'tree',id:String(obj.id),sprite,data:obj});
    }
    for(const [id,sprite] of this.scene.buildingSprites){
      if(this.scene.populationWorld.environment.objects.some(o=>o.id===id&&o.kind==='house'))register({kind:'building',id,sprite});
    }
    for(const venue of this.scene.society.places.values()){
      const sprite=this.scene.facilitySprites.find(s=>s.name===venue.cfg.name)??
        this.scene.facilitySprites.find(s=>s.name===venue.cfg.name+' · quầy');
      const east=venue.id==='east-rest'&&this.scene.objectSprites.find(s=>this.scene.prop(s.getData('tiledObject'),'venue')==='east-rest');
      if(sprite||east)register({kind:'venue',id:venue.id,sprite:sprite||east,data:venue});
    }
    for(const sprite of this.scene.facilitySprites){
      const id=sprite.getData('production')?.ore;
      if(id&&this.scene.sectCampus.production.state.veins[id])register({kind:'ore',id,sprite});
    }
    for(const site of this.scene.sectCampus.spiritVeins.sites.values()){
      site.portalSprite=this.scene.add.image(site.point.x,site.point.y-4,'di-mach-entrance',site.grade).setOrigin(.5,.9).setDepth(site.point.y-1);
      site.sprite=this.scene.add.sprite(site.point.x+20,site.point.y+6,'di-mach-deposits',site.grade)
        .setOrigin(.5,.87).setDepth(site.point.y+2).setScale(.95);
      register({kind:'spiritVein',id:site.id,sprite:site.portalSprite,data:site});
    }
    for(const venue of this.scene.merchants.shops.values()){
      const {position,shop}=venue;
      const sprite=this.scene.add.sprite(position.x+19,position.y,'spirit-veins',4).setOrigin(.5,.9).setDepth(position.y+1);
      register({kind:'shop',id:shop.id,sprite,data:venue});
    }
  }

  lookup(ref){
    if(!ref)return null;
    const scene=this.scene,{environment:env}=scene.populationWorld,{kind,id}=ref;
    const fixed=this.static.get(keyOf(ref));
    if(fixed){
      const data=kind==='building'?env.objects.find(o=>o.id===id):kind==='ore'?scene.sectCampus.production.state.veins[id]:fixed.data;
      return data?{...fixed,data}:null;
    }
    let data,sprite;
    if(kind==='fauna'){data=env.fauna.find(f=>f.id===id);sprite=scene.faunaSprites.get(id);}
    if(kind==='treasure'){data=scene.westTreasures.system.nodes.find(n=>n.id===id);sprite=scene.westTreasures.sprites.get(id)?.plant;}
    if(kind==='westHerb'){data=scene.westWilds.nodesById.get(id);sprite=data?.sprite;}
    if(kind==='herb'){data=env.resourceNodes?.find(n=>n.id===id);sprite=scene.resourceNodeSprites.get(id);}
    if(kind==='drop'){data=env.drops.find(d=>d.id===id);sprite=scene.dropSprites.get(id);}
    if(kind==='npc'){data=scene.scheduler.byId.get(id)?.npc;sprite=scene.npcSprites.get(id);}
    return data?{kind,id,data,sprite}:null;
  }

  point(event){
    const canvas=this.scene.game.canvas, rect=canvas.getBoundingClientRect(),scale=this.scene.scale;
    return this.scene.cameras.main.getWorldPoint((event.clientX-rect.left)*scale.width/rect.width,(event.clientY-rect.top)*scale.height/rect.height);
  }

  hits(point){
    const s=this.scene,env=s.populationWorld.environment,zoom=s.cameras.main.zoom;
    const hits=[];
    const add=(entry)=>{
      if(!entry||!visible(entry.sprite))return;
      const {sprite,kind}=entry,margin=kind==='tree'||kind==='building'?0:Math.min(8,2/zoom);
      if(Math.abs(point.x-sprite.x)>sprite.displayWidth+margin||Math.abs(point.y-sprite.y)>sprite.displayHeight+margin)return;
      let exact=kind==='spiritVein'&&Math.hypot(point.x-sprite.x,point.y-sprite.y+sprite.displayHeight*.36)<Math.max(15,6/zoom)||opaque(sprite,point);
      if(!exact&&(!margin||![[margin,0],[-margin,0],[0,margin],[0,-margin]].some(([dx,dy])=>opaque(sprite,{x:point.x+dx,y:point.y+dy}))))return;
      hits.push({entry,exact});
    };
    for(const entry of this.cells.get(Math.floor(point.x/CELL)+','+Math.floor(point.y/CELL))??[])add(this.lookup(entry));
    for(const f of env.fauna){if(s.faunaSprites.get(f.id)?.visible)add({kind:'fauna',id:f.id,data:f,sprite:s.faunaSprites.get(f.id)});}
    for(const node of s.westTreasures.system.nodes)add({kind:'treasure',id:node.id,data:node,sprite:s.westTreasures.sprites.get(node.id)?.plant});
    for(const node of s.westWilds.nodes)add({kind:'westHerb',id:node.id,data:node,sprite:node.sprite});
    for(const node of env.resourceNodes??[])add({kind:'herb',id:node.id,data:node,sprite:s.resourceNodeSprites.get(node.id)});
    for(const [id,sprite] of s.dropSprites){if(visible(sprite))add(this.lookup({kind:'drop',id}));}
    for(const [id,sprite] of s.npcSprites){if(visible(sprite))add(this.lookup({kind:'npc',id}));}
    hits.sort((a,b)=>Number(a.entry.kind==='tree')-Number(b.entry.kind==='tree')||
      Number(b.exact)-Number(a.exact)||priority[b.entry.kind]-priority[a.entry.kind]||
      b.entry.sprite.depth-a.entry.sprite.depth);
    return hits.map(hit=>hit.entry);
  }

  click(event){
    if(this.scene.possessedNpcId)return;
    const entries=this.hits(this.point(event)),entry=entries[0];
    if(!entry){this.close();return;}
    if(entry.kind==='npc'){this.close();this.scene.selectNPC(entry.id);return;}
    this.select(entry,entries);
  }

  select(ref,choices=[]){
    if(this.scene.possessedNpcId||!this.lookup(ref))return;
    const move=keyOf(ref)!==(this.selected&&keyOf(this.selected));
    this.selected={kind:ref.kind,id:ref.id};
    this.choices=choices.map(({kind,id})=>({kind,id}));
    this.scene.closeNpcCard();
    if(move){
      this.parts.abilities.open=true;
      this.panel.querySelector('.inspection-body').scrollTop=0;
    }
    this.panel.hidden=false;
    this.tooltip.hidden=true;
    this.update(0,true);
  }

  close(){
    this.selected=null;this.choices=[];this.panel.hidden=true;this.tooltip.hidden=true;
    this.marker.clear().setVisible(false);
  }

  locate(){
    if(this.scene.possessedNpcId)return;
    const entry=this.lookup(this.selected);
    const point=this.anchor(entry);
    if(point)this.scene.navigateCameraTo(point.x,point.y-18,'inspection',false,Math.max(.85,this.scene.cameras.main.zoom));
  }

  anchor(entry){
    if(!entry)return undefined;
    if(entry.kind==='tree')return {x:entry.sprite.x,y:entry.data.y};
    if(entry.kind==='ore')return {x:entry.sprite.x,y:entry.sprite.y+12};
    if(entry.kind==='spiritVein')return entry.data.point;
    if(entry.kind==='venue')return entry.data.landmark??entry.data.counter;
    return entry.data;
  }

  hover(event){
    if(event.buttons||event.pointerType==='touch'||this.scene.possessedNpcId||this.scene.cameras.main.zoom<.47||this.scene.dragState){
      this.leave();return;
    }
    if(performance.now()<(this.nextHover??0))return;
    this.nextHover=performance.now()+115;
    const entry=this.hits(this.point(event))[0];
    if(!entry||entry.kind==='npc'){this.leave();return;}
    const brief=inspectionBrief(this.scene,entry);
    this.tooltip.textContent=[brief.title,brief.meta,brief.state].filter(Boolean).join(' · ');
    this.tooltip.style.left=Math.min(event.clientX+14,window.innerWidth-220)+'px';
    this.tooltip.style.top=Math.min(event.clientY+16,window.innerHeight-75)+'px';
    this.tooltip.hidden=false;
  }

  leave(){this.tooltip.hidden=true;}

  replace(key,data,render){
    const signature=JSON.stringify(data);
    if(this.cached.get(key)===signature)return;
    this.cached.set(key,signature);render(this.parts[key],data);
  }

  update(time,always=false){
    if(this.scene.possessedNpcId){if(this.selected||!this.tooltip.hidden)this.close();return;}
    if(this.scene.cameras.main.zoom<.47&&!this.tooltip.hidden)this.leave();
    if(!this.selected||!always&&time<(this.nextUpdate??0))return;
    this.nextUpdate=time+130;
    const entry=this.lookup(this.selected);
    if(!entry){this.close();return;}
    const info=inspectionSnapshot(this.scene,entry),anchor=this.anchor(entry);
    const title=this.panel.querySelector('h2');
    if(title.textContent!==info.title)title.textContent=info.title;
    this.panel.dataset.kind=entry.kind;
    this.panel.dataset.id=entry.id;
    this.panel.dataset.tone=String(info.tone||0);
    this.undergroundButton.hidden=!['ore','spiritVein'].includes(entry.kind)||!this.scene.underground?.sites.has(entry.id)||Boolean(this.scene.possessedNpcId);
    this.panel.querySelector('canvas').hidden=!entry.sprite;
    const large=entry.kind==='fauna'&&entry.sprite?.texture.key.startsWith('monster-east-');
    this.panel.toggleAttribute('data-large-portrait',Boolean(large));
    if(entry.sprite)this.paintPortrait(entry.sprite,large);
    for(const key of ['meta','state','description'])this.replace(key,info[key]??'',(el,value)=>{el.textContent=value;el.hidden=!value;});
    this.replace('bars',info.bars,drawBars);
    this.replace('fields',info.fields,(el,rows)=>el.replaceChildren(...makeRows(rows)));
    this.replace('tables',info.tables??[],(el,rows)=>{
      const opened=new Set([...el.querySelectorAll('details[open]')].map(d=>d.dataset.id));
      el.replaceChildren(...rows.map(row=>{
        const details=create('details');details.dataset.id=row.id;details.open=opened.has(String(row.id));
        details.append(create('summary',row.name));
        const guests=create('div');drawLinks(guests,row.guests);details.append(guests);
        for(const line of row.lines)details.append(create('p',line));
        return details;
      }));
    });
    this.replace('skills',info.skills,(el,rows)=>el.replaceChildren(...makeRows(rows.map(x=>[x.name,x.description+' · '+x.timing]))));
    this.parts.abilities.hidden=!info.skills.length;
    this.replace('links',info.links,drawLinks);
    this.parts.relations.hidden=!info.links.length;
    const options=this.choices.filter(x=>keyOf(x)!==keyOf(entry)).flatMap(ref=>{
      const other=this.lookup(ref);return other?[{...ref,label:inspectionBrief(this.scene,other).title}]:[];
    });
    this.replace('choices',options,drawLinks);
    this.parts.overlap.hidden=!options.length;
    const mark=anchor&&Number.isFinite(anchor.x)&&Number.isFinite(anchor.y), zoom=this.scene.cameras.main.zoom;
    const markerKey=mark?`${anchor.x},${anchor.y},${zoom}`:'';
    if(this.markerKey!==markerKey||this.marker.visible!==Boolean(mark)){
      this.markerKey=markerKey;
      this.marker.clear().setVisible(Boolean(mark));
      if(mark)this.marker.lineStyle(1.35/zoom,0xead3a0,.86).strokeEllipse(anchor.x,anchor.y+3,Math.max(20,18/zoom),Math.max(10,7/zoom));
    }
  }

  paintPortrait(sprite,large){
    const frame=sprite.frame,key=keyOf(this.selected)+':'+sprite.texture.key+(large?':'+frame.name:'');
    if(this.portrait===key)return;
    this.portrait=key;
    const canvas=this.panel.querySelector('canvas'),edge=large?112:64;
    if(canvas.width!==edge){canvas.width=edge;canvas.height=edge;}
    const ctx=canvas.getContext('2d');
    ctx.clearRect(0,0,edge,edge);ctx.imageSmoothingEnabled=false;
    const {cutX,cutY,cutWidth,cutHeight}=frame;
    const scale=Math.min(2,(edge-5)/Math.max(cutWidth,cutHeight));
    const w=Math.max(1,Math.round(cutWidth*scale)),h=Math.max(1,Math.round(cutHeight*scale));
    ctx.drawImage(frame.source.image,cutX,cutY,cutWidth,cutHeight,Math.floor((edge-w)/2),Math.floor((edge-h)/2),w,h);
  }
}

function create(tag,text){
  const el=document.createElement(tag);
  if(text!==undefined)el.textContent=text;
  return el;
}
function makeRows(rows){
  return rows.map(([label,value])=>{const row=create('div');row.append(create('dt',label),create('dd',value));return row;});
}
function drawBars(el,bars){
  const format=new Intl.NumberFormat('vi-VN',{maximumFractionDigits:0});
  el.replaceChildren(...bars.map(({label,value,max,tone})=>{
    const row=create('div'), name=create('span',label), amount=create('b',format.format(value)+' / '+format.format(max));
    const meter=create('progress');meter.max=max;meter.value=value;meter.dataset.tone=tone;meter.setAttribute('aria-label',label);
    row.append(name,amount,meter);return row;
  }));
}
function drawLinks(el,links){
  el.replaceChildren(...links.map(({kind,id,label})=>{
    const button=create('button',label);button.type='button';button.dataset.kind=kind;button.dataset.inspect=id;return button;
  }));
}

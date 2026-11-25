import { cultivationStats } from '../systems/CultivationSystem.ts';
import { formatRealm, realmPosition } from '../systems/RealmConfig.ts';
import { residentCultivation } from './ResidentProfile.js';
import { TECHNIQUES } from '../systems/TechniqueSystem.ts';

const PAGE_SIZE = 24;

const names = {
  cultivate:'Tu luyện', farm:'Canh tác', work:'Lao động', trade:'Giao dịch',
  patrol:'Tuần tra', guard:'Canh gác', gather:'Thu thập', eat:'Ăn uống',
  flee:'Tránh nguy hiểm', fight:'Giao chiến', socialize:'Giao tiếp', rest:'Nghỉ ngơi',
  idle:'Đứng yên', travel:'Đang di chuyển', commission:'Ủy thác', shop:'Mua hàng',
  mission:'Nhiệm vụ', recruit:'Tuyển đệ tử', teach:'Chỉ dạy',
};

function category(npc) {
  if (!npc.alive || npc.ascended) return 'Vắng mặt';
  if (npc.goalAction === 'flee' || npc.safety < 35) return 'Nguy hiểm';
  if (npc.faunaHuntTargetId) return 'Săn bắn';
  if (npc.goalAction === 'rest') return 'Nghỉ ngơi';
  if (npc.goalAction === 'cultivate') return 'Tu luyện';
  if (['farm','work','gather','trade','commission','patrol','guard','teach','mission'].includes(npc.goalAction)) return 'Lao động';
  return 'Sinh hoạt';
}

function add(parent, tag, text) {
  const node = document.createElement(tag);
  node.textContent = text;
  parent.append(node);
  return node;
}

export class LivingWorldPanel {
  constructor(scene) {
    this.scene = scene;
    this.element = document.createElement('section');
    this.element.className = 'living-world-panel';
    this.element.hidden = true;
    this.element.setAttribute('aria-label','Sinh hoạt thế giới');
    const header = add(this.element,'header','');
    this.title = add(header,'strong','Sinh hoạt thế giới');
    const close = add(header,'button','Đóng');
    close.onclick = () => this.close();
    const nav = add(this.element,'nav','');
    for (const [mode,label] of [['journal','Nhật ký'],['dashboard','108 cư dân'],['venues','Công trình']]) {
      add(nav,'button',label).onclick = () => this.open(mode);
    }
    const speeds=add(this.element,'nav','');speeds.className='simulation-speeds';
    for(const speed of [1,2,4])add(speeds,'button','×'+speed).onclick=()=>{
      scene.populationWorld.clock.speed=speed;scene.requestBackgroundSave();this.render();
    };
    this.filter = add(this.element,'input','');
    this.filter.type = 'search';
    this.filter.placeholder = 'Tìm theo tên, vai trò hoặc hoạt động';
    this.filter.setAttribute('aria-label',this.filter.placeholder);
    this.filter.oninput = () => {this.page=0;this.render();};
    this.pages=add(this.element,'nav','');
    this.pages.className='living-pages';
    this.previous=add(this.pages,'button','Trang trước');
    this.pageLabel=add(this.pages,'span','');
    this.next=add(this.pages,'button','Trang sau');
    this.previous.onclick=()=>{this.page--;this.body.scrollTop=0;this.render();};
    this.next.onclick=()=>{this.page++;this.body.scrollTop=0;this.render();};
    this.body = add(this.element,'div','');
    this.body.className = 'living-world-body';
    document.body.append(this.element);
    const style = add(document.head,'style',`
      .living-world-panel{box-sizing:border-box;position:fixed;right:12px;top:84px;z-index:24;width:min(490px,calc(100vw - 24px));max-height:calc(100dvh - 156px);display:flex;flex-direction:column;gap:9px;padding:12px;color:#f0e6c7;background:#15241cf7;border:1px solid #a69155;font:14px/1.45 Georgia,serif;box-shadow:0 8px 24px #0008}
      .living-world-panel[hidden],.living-world-panel [hidden]{display:none}.living-world-panel header,.living-world-panel nav{display:flex;align-items:center;justify-content:space-between;gap:8px}.living-world-panel button,.living-world-panel input{background:#23382a;color:inherit;border:1px solid #776b46;padding:5px 8px}.living-world-panel button{cursor:pointer}.living-world-panel button:focus-visible,.living-world-panel input:focus-visible{outline:2px solid #e0c785}.living-world-panel nav button{flex:1}.living-world-body{overflow:auto;min-height:0;overflow-anchor:none}.living-world-body p{margin:4px 0 8px}.living-world-body h4{margin:12px 0 5px;color:#e6c77d}.living-world-body small{display:block;color:#c2cbb3}.living-world-body .living-row{display:block;width:100%;text-align:left;margin:4px 0}.living-world-body ul{padding-left:18px}
    `);
    scene.events.once('shutdown', () => { this.element.remove();style.remove(); });
  }

  open(mode, npcId) {
    this.mode = mode;
    this.page = 0;
    this.dashboard = null;
    this.npcId = npcId;
    this.filter.hidden = mode !== 'dashboard';
    this.pages.hidden = mode !== 'dashboard';
    this.title.textContent = {journal:'Nhật ký thế giới',dashboard:'Sinh hoạt 108 cư dân',inspector:'Hồ sơ sinh hoạt',venues:'Sản xuất và dịch vụ'}[mode];
    this.element.hidden = false;
    this.render();
  }

  close() { this.element.hidden = true; }

  update(time) {
    if (this.element.hidden || time < (this.nextUpdate ?? 0)) return;
    this.nextUpdate = time + 1000;
    const world = this.scene.populationWorld;
    if (this.mode === 'journal' && this.lastEvent === world.events.at(-1)) return;
    if (this.body.contains(document.activeElement)) return;
    this.render();
  }

  focus(npc) {
    if (!this.scene.selectNPC(npc.id)) return;
    if (this.scene.possessedNpcId) this.scene.navigateCameraTo(npc.x,npc.y,'living-world');
    this.open('inspector',npc.id);
  }

  render() {
    const world = this.scene.populationWorld, list = this.body, scroll = list.scrollTop;
    if(this.mode==='dashboard'){this.renderDashboard(world);return;}
    list.replaceChildren();
    if (this.mode === 'inspector') {
      const npc = world.npcs.find(n => n.id === this.npcId);
      if (npc) this.inspect(npc,world);
    } else if(this.mode==='venues'){
      this.renderVenues();
    } else if (this.mode === 'journal') {
      this.lastEvent = world.events.at(-1);
      const entries = world.events.slice(-60).reverse();
      if (!entries.length) add(list,'p','Chưa có sự kiện được ghi nhận.');
      for (const event of entries) {
        const npc = world.npcs.find(n => n.id === event.actorId || n.id === event.targetId);
        const row = add(list,npc ? 'button' : 'div',event.description);
        row.className = 'living-row';
        const hour = String(Math.floor(event.minute/60)).padStart(2,'0');
        const minute = String(event.minute%60).padStart(2,'0');
        add(row,'small',`Ngày ${event.day} · ${hour}:${minute}${npc?' · '+npc.name+' · hiện tại '+formatRealm(npc):''}`);
        if (npc) row.onclick = () => {
          this.focus(npc);
          if(event.id.startsWith('tribulation:')&&Number.isFinite(event.data?.x)&&Number.isFinite(event.data?.y))
            this.scene.navigateCameraTo(event.data.x,event.data.y,'living-world');
        };
      }
    }
    list.scrollTop = scroll;
  }

  renderVenues() {
    const {scene,body}=this;
    const society=scene.society,campus=scene.sectCampus;
    for(const venue of society?.report()??[]){
      const staff=scene.scheduler.byId.get(venue.staff)?.npc;
      const heading=add(body,'button',venue.name);
      heading.className='living-row';
      heading.onclick=()=>scene.gotoRegion(venue.id);
      add(body,'small',(venue.onDuty?'Đang trực · ':'Ngoài ca · ')+(staff?.name??'Chưa phân công'));
      add(body,'small','Đang dùng '+venue.using+' · Đang đến '+venue.approaching+' · Chờ '+venue.waiting+' · Còn '+venue.free+'/'+venue.capacity+' chỗ');
      add(body,'p','Doanh thu '+venue.revenue+' · Chi phí '+venue.costs+' · Quỹ '+venue.cash+' · Lượt phục vụ '+venue.served+
        (venue.stock===null?'':' · Tồn kho '+venue.stock));
    }
    const state=campus.production.state;
    add(body,'h4','Mỏ Quặng Sắt và Linh Điền');
    const stored=Object.values(state.veins).reduce((a,v)=>a+v.amount,0);
    add(body,'p',stored+' quặng còn lại · '+(state.totals.mined??0)+' đã khai thác · '+(state.totals.harvested??0)+' sản phẩm đã thu hoạch');
    const budget=campus.state.budget;
    if(budget)add(body,'p','Bảo khố dự phòng '+budget.reserve+' linh thạch · duyệt ngày '+budget.day);
  }

  renderDashboard(world) {
    if(!this.dashboard){
      this.body.replaceChildren();
      this.dashboard={summary:add(this.body,'p',''),status:add(this.body,'p',''),ground:add(this.body,'p',''),rows:add(this.body,'div',''),buttons:[]};
    }
    const dashboard=this.dashboard;
    const query=this.filter.value.trim().toLocaleLowerCase('vi'),counts=new Map(),matching=[];
    let blocked=0,hungry=0,exhausted=0;
    for(const npc of world.npcs){
      const group=this.scene.society?.primary(npc)??category(npc),duty=this.scene.npcRoleTitle(npc);
      counts.set(group,(counts.get(group)??0)+1);
      if(npc.alive){
        blocked+=Number(Boolean(npc.pathBlocked));hungry+=Number(npc.hunger>=75);exhausted+=Number(npc.fatigue>=90);
      }
      if(!query||[npc.name,duty,group,npc.shortGoal].join(' ').toLocaleLowerCase('vi').includes(query))matching.push({npc,group,duty});
    }
    const update=(node,value)=>{if(node.textContent!==value)node.textContent=value;};
    update(dashboard.summary,'Ngày '+world.clock.day+' · '+[...counts].map(([label,count])=>label+' '+count).join(' · '));
    update(dashboard.status,'Kẹt đường '+blocked+' · Đói nặng '+hungry+' · Kiệt sức '+exhausted);
    const ground=this.scene.getGroundDiagnostics(),perf=this.scene.performancePanel.snapshot();
    update(dashboard.ground,'Yêu thú '+ground.fauna+' · Chỗ đã đặt '+ground.slots+' · Cặp chồng '+ground.overlaps.length+
      ' · Bị thương '+ground.counts.hurt+' · Đang giao dịch '+ground.counts.trade+' · Chờ '+ground.counts.blocked+' · FPS '+perf.fps.toFixed(1)+' / p95 '+perf.p95.toFixed(1)+' ms');
    const pageCount=Math.max(1,Math.ceil(matching.length/PAGE_SIZE));
    this.page=Math.max(0,Math.min(this.page,pageCount-1));
    this.previous.disabled=this.page===0;
    this.next.disabled=this.page>=pageCount-1;
    update(this.pageLabel,matching.length+' cư dân · '+(this.page+1)+'/'+pageCount);
    const start=this.page*PAGE_SIZE,length=Math.min(PAGE_SIZE,matching.length-start);
    while(dashboard.buttons.length>length)dashboard.buttons.pop().button.remove();
    for(let i=0;i<length;i++){
      const {npc,group,duty}=matching[start+i];
      let row=dashboard.buttons[i];
      if(!row){
        const button=add(dashboard.rows,'button','');button.className='living-row';
        row={button,label:add(button,'span',''),activity:add(button,'small',''),goal:add(button,'small','')};
        button.onclick=()=>this.focus(row.npc);
        dashboard.buttons.push(row);
      }
      row.npc=npc;
      update(row.label,npc.name+' · '+duty);
      row.label.title=formatRealm(npc);
      update(row.activity,group+' · '+(names[npc.action]??npc.action)+' · '+Math.floor(npc.actionProgress??0)+' phút tại điểm làm việc');
      update(row.goal,npc.shortGoal??names[npc.goalAction]??'');
    }
  }

  inspect(npc, world) {
    const list = this.body, scene = this.scene;
    const stats = realmPosition(npc)&&npc.techniqueMastery?cultivationStats(npc):null, cultivation=residentCultivation(npc);
    const location = p => p ? `(${Math.round(p.x)}, ${Math.round(p.y)})` : 'Chưa có';
    const activity = npc.actionTarget ? Math.hypot(npc.x-npc.actionTarget.x,npc.y-npc.actionTarget.y) : 0;
    add(list,'h4',npc.name+' · '+scene.npcRoleTitle(npc));
    add(list,'p',`${names[npc.action]??npc.action} → ${npc.shortGoal??names[npc.goalAction]} · ${location(npc.actionTarget)}`);
    const reason = scene.possessedNpcId===npc.id?'Thiên Đạo đang điều khiển.':
      npc.faunaHuntTargetId||npc.professionTask?.state==='working'||npc.pathBlocked ? scene.npcActivityReason(npc,activity) :
      npc.aiDecision?.action===npc.goalAction ? npc.aiDecision.reason : scene.npcActivityReason(npc,activity);
    add(list,'p',reason);
    add(list,'small',`Mục tiêu dài hạn · ${npc.longGoal} · Hoạt động ${Math.floor(npc.actionProgress??0)} phút`);
    add(list,'small',`Nơi ở ${location(npc.home)} · Nơi làm việc ${location(npc.workPosition)}`);
    const route=scene.npcRoutes.get(npc.id)?.points?.length??0,slot=scene.workstations.claims.get(npc.id);
    add(list,'small','Tính cách '+npc.personality+' · Tuyến '+route+' điểm · '+(slot?'Chỗ đã đặt '+location(slot):'Chưa đặt chỗ'));
    const entry=scene.scheduler.byId.get(npc.id);
    const problem=scene.getPopulationState().diagnostics.stuckExamples.find(r=>r.id===npc.id);
    const society=scene.society,account=society?.account(npc),visit=society?.visits[npc.id];
    if(entry)add(list,'small','Cập nhật AI '+(entry.lastDecision===undefined?'chưa chạy':Math.round((scene.scheduler.time-entry.lastDecision)/1000)+' giây trước')+
      ' · '+(problem?'Kẹt '+(problem.noProgressMs/1000).toFixed(1)+' giây · '+problem.reason:entry.routeFailure??'Tuyến hiện tại có thể sử dụng'));
    if(visit)add(list,'small','Chỗ dịch vụ '+visit.seat+' · '+visit.phase);
    const secondary=society?.secondary(npc);
    if(secondary)add(list,'p','Nghề phụ hoặc nơi kiêm nhiệm · '+secondary);
    add(list,'h4','Sinh hoạt và tu luyện');
    add(list,'p',`Sinh lực ${Math.round(npc.hp)}/${stats?.hpMax??'—'} · Đói ${Math.round(npc.hunger)}% · Thể lực ${Math.round(100-npc.fatigue)}% · An toàn ${Math.round(npc.safety)}% · Nhu cầu giao tiếp ${Math.round(npc.socialNeed??20)}%`);
    add(list,'p',`Linh thạch ${npc.spiritStones} · ${TECHNIQUES[npc.technique]?.name??npc.technique} cấp ${npc.techniqueMastery?.[npc.technique]??1} · ${formatRealm(npc)}${cultivation?' · Tu vi '+Math.floor(npc.xp)+' / '+cultivation.view.required:''}`);
    if(account){
      const {needs}=account;
      add(list,'p','Khát '+Math.round(needs.thirst)+'% · Cần thư giãn '+Math.round(needs.leisure)+
        '% · Cần giao lưu '+Math.round(needs.social)+'% · Tâm trạng '+Math.round(npc.mood)+'%');
      add(list,'small','Tiền công dịch vụ '+account.income+' · Chi dịch vụ '+account.spending+
        ' · Cống hiến '+(scene.sectCampus.state.credits[npc.id]??0));
    }
    if(cultivation?.note)add(list,'small',cultivation.note);
    add(list,'h4','Hoạt động gần đây');
    for(const event of world.events.filter(e=>e.actorId===npc.id).slice(-8).reverse()){
      const time=String(Math.floor(event.minute/60)).padStart(2,'0')+':'+String(event.minute%60).padStart(2,'0');
      add(list,'small','Ngày '+event.day+' · '+time+' — '+event.description);
    }
    add(list,'h4','Ký ức');
    if (!npc.memories.length) add(list,'p','Chưa có ký ức được ghi nhận.');
    for (const memory of npc.memories.slice(-6).reverse()) add(list,'small',`Ngày ${memory.day} · ${memory.text}`);
    add(list,'h4','Quan hệ');
    const social = Object.entries(npc.relationships).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).slice(0,6);
    if (!social.length) add(list,'p','Chưa có quan hệ được ghi nhận.');
    for (const [id,score] of social) {
      const other = world.npcs.find(n=>n.id===id);
      if (other) add(list,'button',other.name+' '+Math.round(score)).onclick=()=>this.focus(other);
      else add(list,'small',id+' '+Math.round(score));
    }
  }
}

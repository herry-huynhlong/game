export class CivicVeinPanel {
  constructor(civic){
    this.civic=civic;
    const panel=this.element=document.createElement('dialog');
    panel.className='civic-vein-panel';
    panel.style.cssText='padding:18px;max-width:min(480px,90vw);color:#f0ddb2;background:#15251e;border:1px solid #92784c';
    panel.innerHTML=`<form method="dialog"><button type="submit" aria-label="Đóng">Đóng</button></form>
      <h2></h2><p data-status></p>
      <section data-claim><label>Chủ sở hữu <select name="holder"></select></label> <button type="button">Xác lập sở hữu</button></section>
      <section data-terms>
        <label>Hình thức <select name="mode"><option value="wage">Trả công mỗi chuyến</option><option value="share">Chia sản lượng</option><option value="lease">Cho thuê quyền khai thác</option></select></label>
        <p><label>Sản lượng <input name="quantity" type="number" min="1" max="8" value="4"></label></p>
        <p><label><span data-price-label>Tiền công</span> <input name="price" type="number" min="1" max="100" value="6"></label></p>
        <button type="button" data-post>Mở hợp đồng</button>
      </section>
      <section data-manager><p><label>Người quản lý <select></select></label></p><button type="button">Giao quản lý</button></section>
      <p role="status"></p>`;
    const q=selector=>panel.querySelector(selector);
    this.part={title:q('h2'),status:q('[data-status]'),claim:q('[data-claim]'),terms:q('[data-terms]'),
      holder:q('[name=holder]'),manager:q('[data-manager]'),selection:q('[data-manager] select'),mode:q('[name=mode]'),price:q('[name=price]'),
      quantity:q('[name=quantity]'),label:q('[data-price-label]'),response:q('[role=status]')};
    this.part.mode.onchange=()=>{
      const mode=this.part.mode.value;
      this.part.label.textContent=mode==='share'?'Phần trăm cho người khai thác':mode==='lease'?'Phí thuê':'Tiền công';
      this.part.price.value=mode==='share'?50:mode==='lease'?2:6;
    };
    q('[data-claim] button').onclick=()=>this.result(this.civic.claim(this.actor,this.site,this.part.holder.value),'Đã đăng ký quyền sở hữu.');
    q('[data-post]').onclick=()=>this.result(this.civic.offer(this.actor,this.site,{mode:this.part.mode.value,
      price:Number(this.part.price.value),quantity:Number(this.part.quantity.value)}),'Đã mở hợp đồng.');
    q('[data-manager] button').onclick=()=>this.result(this.civic.manage(this.actor,this.site,this.civic.npc(this.part.selection.value)),'Đã giao quản lý.');
    document.body.append(panel);
    civic.scene.events.once('shutdown',()=>panel.remove());
  }
  get open(){return this.element.open;}
  closest(n){return n&&!n.underground&&[...this.civic.veins.sites.values()].find(site=>Math.hypot(n.x-site.point.x,n.y-site.point.y)<=38);}
  show(n){
    const site=this.closest(n);
    if(!site||n.id!==this.civic.scene.possessedNpcId)return false;
    this.actor=n;this.site=site;this.part.response.textContent='';
    this.refresh();
    if(!this.open)this.element.showModal();
    return true;
  }
  result(success,text){
    this.part.response.textContent=success?text:'Điều kiện mạch, quyền hạn, tiền hoặc điều khoản chưa hợp lệ.';
    this.refresh();
  }
  refresh(){
    const {site,actor,part,civic}=this,s=site.state,contract=civic.activeSite(site.id),owner=civic.mayRepresent(actor,s.owner);
    part.title.textContent=site.name;
    part.status.textContent='Chủ sở hữu '+civic.name(s.owner)+' · Trữ lượng '+s.amount+'/'+site.max+(contract?' · Hợp đồng '+contract.status:'');
    part.claim.hidden=Boolean(s.owner||s.controller);
    if(!part.claim.hidden){
      const holder=part.holder.value;
      const factions=civic.world.factions.filter(f=>civic.mayRepresent(actor,f.id));
      part.holder.replaceChildren(new Option('Cá nhân',actor.id,false,holder===actor.id),
        ...factions.map(f=>new Option(f.name,f.id,false,holder===f.id)));
    }
    part.terms.hidden=Boolean(contract||(!owner&&s.manager!==actor.id));
    part.manager.hidden=!owner;
    part.quantity.max=Math.min(8,s.amount);
    const options=civic.world.npcs.filter(n=>n.alive&&n!==actor&&(actor.relationships?.[n.id]??0)>=8);
    part.selection.replaceChildren(...options.map(n=>new Option(n.name,n.id,false,n.id===s.manager)));
    part.selection.parentElement.parentElement.nextElementSibling.disabled=!options.length;
  }
}

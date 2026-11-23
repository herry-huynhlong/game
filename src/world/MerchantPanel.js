import './merchant-panel.css';
import { ITEM_CATALOG } from '../dao/ItemCatalog.ts';
import { EconomySystem } from '../dao/EconomySystem.ts';
import { LOOT_ICON } from './MonsterVisuals.js';

const qualities={low:'Hạ phẩm',middle:'Trung phẩm',high:'Thượng phẩm'};
const icons={pill:'●',herb:'✿',weapon:'⚔',material:'◆'};
function icon(item){
  const element=document.createElement('span');
  element.className='trade-icon';
  element.setAttribute('aria-hidden','true');
  if(Object.hasOwn(LOOT_ICON,item.id)){
    element.classList.add('trade-loot');
    element.style.backgroundPositionX=(-LOOT_ICON[item.id]*28)+'px';
  }else{
    element.dataset.kind=item.kind;
    element.textContent=icons[item.kind]??'◇';
  }
  return element;
}

export class MerchantPanel {
  constructor(scene){
    this.scene=scene;
    this.dialog=document.createElement('dialog');this.dialog.id='merchant-panel';this.dialog.setAttribute('aria-labelledby','merchant-name');
    this.dialog.innerHTML=`
      <header><img width="48" height="60" alt=""><div><h2 id="merchant-name"></h2><p data-merchant></p></div>
        <button type="button" data-close aria-label="Đóng cửa hàng">×</button></header>
      <nav aria-label="Chế độ giao dịch"><button data-side="buy" type="button">Mua</button>
        <button data-side="sell" type="button">Bán</button><span data-wallet></span></nav>
      <div class="trade-list" aria-label="Vật phẩm"></div>
      <form><label>Số lượng <input type="number" min="1" step="1" value="1" inputmode="numeric" required></label>
        <p data-total></p><button data-confirm type="submit" disabled>Xác nhận</button></form>
      <p data-message role="status"></p>`;
    this.prompt=document.createElement('button');this.prompt.id='merchant-prompt';this.prompt.hidden=true;this.prompt.type='button';
    this.prompt.onclick=()=>{const n=this.actor();if(n)this.interact(n);};
    this.dialog.querySelector('[data-close]').onclick=()=>this.close();
    for(const button of this.dialog.querySelectorAll('[data-side]'))button.onclick=()=>{
      this.side=button.dataset.side;this.selected=null;this.dialog.querySelector('[data-message]').textContent='';this.render();
    };
    this.list=this.dialog.querySelector('.trade-list');
    this.amount=this.dialog.querySelector('input');
    this.amount.oninput=()=>this.renderQuote();
    this.dialog.querySelector('form').onsubmit=event=>{event.preventDefault();this.submit();};
    this.dialog.addEventListener('cancel',event=>{event.preventDefault();this.close();});
    this.dialog.addEventListener('keydown',event=>{
      if(event.key!=='Escape')return;
      event.preventDefault();event.stopPropagation();this.close();
    });
    document.body.append(this.prompt,this.dialog);
    scene.events.once('shutdown',()=>{this.prompt.remove();this.dialog.remove();});
  }
  actor(){return this.scene.populationWorld.npcs.find(n=>n.id===this.scene.possessedNpcId);}
  context(npc){
    const scene=this.scene,rig=scene.characterRigPreview;
    if(!npc||!npc.alive||npc.flight||(rig?.npc===npc&&rig.mount.locked))return null;
    return scene.merchants.nearest(npc,scene.selectedNpcId,scene.playerFacing);
  }
  interact(npc){
    const venue=this.context(npc);
    if(!venue||this.dialog.open)return false;
    this.open(npc,venue);return true;
  }
  open(npc,venue){
    this.venue=venue;this.side='buy';this.selected=null;this.signature=null;
    this.scene.heavenActions.stopFishing();
    const portrait=this.scene.residentProfile.portraits.get(venue.owner),img=this.dialog.querySelector('img');
    if(portrait)img.src=portrait;else img.removeAttribute('src');
    this.dialog.querySelector('h2').textContent=venue.shop.name;
    this.dialog.querySelector('[data-merchant]').textContent=venue.owner.name+' · '+this.scene.npcRoleTitle(venue.owner)+' · Đang mở cửa';
    this.dialog.querySelector('[data-message]').textContent='';
    this.render();this.prompt.hidden=true;this.dialog.showModal();
  }
  close(){if(this.dialog.open)this.dialog.close();this.venue=null;this.selected=null;}
  update(time){
    if(time<(this.next??0))return;this.next=time+160;
    const n=this.actor();
    if(this.dialog.open){
      if(!this.scene.merchants.canTrade(n,this.venue)){this.close();return;}
      this.render();return;
    }
    const venue=this.context(n);
    this.prompt.hidden=!venue;
    const label=venue?'[E] Giao dịch với '+venue.owner.name:'';
    if(this.prompt.textContent!==label)this.prompt.textContent=label;
  }
  rows(npc){
    const {shop}=this.venue;
    const rows=this.side==='buy'?shop.stock:npc.inventory;
    return rows.map(row=>{
      const item=ITEM_CATALOG[row.itemId];
      const count=this.side==='buy'?row.count:EconomySystem.sellable(this.scene.populationWorld,npc,row.itemId);
      const price=(this.side==='buy'?shop.sellPrices:shop.buyPrices)[row.itemId];
      return {item,count,price};
    }).filter(row=>row.item&&row.count>0&&row.price>0);
  }
  render(){
    const npc=this.actor();if(!npc||!this.venue)return;
    const rows=this.rows(npc);
    const signature=JSON.stringify([this.side,rows.map(({item,count,price})=>[item.id,count,price]),this.selected]);
    const wallet=this.dialog.querySelector('[data-wallet]'),value=npc.spiritStones+' linh thạch';
    if(wallet.textContent!==value)wallet.textContent=value;
    for(const button of this.dialog.querySelectorAll('[data-side]'))button.setAttribute('aria-pressed',String(button.dataset.side===this.side));
    if(signature!==this.signature){
      this.signature=signature;const scroll=this.list.scrollTop,focus=document.activeElement?.dataset?.item;
      this.list.replaceChildren();
      if(!rows.length){const empty=document.createElement('p');empty.textContent=this.side==='buy'?'Cửa hàng hiện hết hàng.':'Túi không có hàng phù hợp để bán.';this.list.append(empty);}
      for(const {item,count,price} of rows){
        const button=document.createElement('button');button.type='button';button.className='trade-row';button.dataset.item=item.id;
        button.setAttribute('aria-pressed',String(this.selected===item.id));
        const copy=document.createElement('span'),name=document.createElement('b'),detail=document.createElement('small'),description=document.createElement('small');
        name.textContent=item.name;detail.textContent=qualities[item.quality]+' · '+count+' món · '+price+' linh thạch / món';description.textContent=item.description;
        copy.append(name,detail,description);
        button.append(icon(item),copy);button.onclick=()=>{this.selected=item.id;this.amount.value='1';this.render();};
        this.list.append(button);
      }
      this.list.scrollTop=scroll;
      if(focus)[...this.list.children].find(x=>x.dataset.item===focus)?.focus({preventScroll:true});
    }
    this.renderQuote();
  }
  renderQuote(){
    const total=this.dialog.querySelector('[data-total]'),button=this.dialog.querySelector('[data-confirm]');
    if(!this.selected){total.textContent='Chọn vật phẩm';button.disabled=true;return;}
    const quote=this.scene.merchants.quote(this.actor(),this.venue,this.side,this.selected,this.amount.valueAsNumber);
    const value=quote.ok?`${this.side==='buy'?'Cần trả':'Nhận'} ${Math.abs(quote.net)} linh thạch${quote.tax?' · Thuế '+quote.tax:''}`:quote.message;
    if(total.textContent!==value)total.textContent=value;
    button.disabled=!quote.ok;
  }
  submit(){
    if(!this.dialog.open||!this.selected)return;
    const result=this.scene.merchants.execute(this.actor(),this.venue,this.side,this.selected,this.amount.valueAsNumber,true);
    if(result.ok){this.selected=null;this.amount.value='1';}
    this.dialog.querySelector('[data-message]').textContent=result.message;
    this.render();this.scene.refreshPossessionHud();
  }
}

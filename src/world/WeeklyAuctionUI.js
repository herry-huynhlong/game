import {BUILDING_INTERIORS,AUCTION_BUILDING,auctionSeats} from './BuildingInteriors.js';
import {commerceProduct} from './CommerceCatalog.js';
import {makeItemIcon} from './ResidentInventory.js';
import './commerce.css';

const phaseText={announced:'Đã công bố danh sách',reception:'Đang đón khách',inspection:'Kiểm tra khách',
  bidding:'Đang trả giá',ended:'Đã kết thúc'};
const lotText={queued:'Đã ký gửi',open:'Đang trả giá',sold:'Đã bán',returned:'Đã hoàn trả',unclaimed:'Chờ nhận lại'};
const detail=(parent,text,tag='small')=>{
  const node=document.createElement(tag);node.textContent=text;parent.append(node);return node;
};

export function mountAuction(system){
  const {scene,world}=system;
  const panel=document.createElement('section');panel.className='drawer commerce-auction';
  panel.hidden=true;
  panel.innerHTML='<header><b>Vạn Bảo Đấu Giá Hội</b><button type="button" data-close aria-label="Đóng">×</button></header><p data-status role="status"></p><div data-actions></div><div data-lots></div>';
  document.body.append(panel);
  for(const type of ['pointerdown','pointerup','click','wheel','keydown'])panel.addEventListener(type,event=>event.stopPropagation());
  const button=(parent,text,handler)=>{
    const node=document.createElement('button');node.type='button';node.textContent=text;node.onclick=handler;parent.append(node);return node;
  };
  const name=id=>system.resolve(id)?.name??world.shops.find(row=>row.id===id)?.name??world.factions.find(row=>row.id===id)?.name??id??'Chưa có';
  let message='';
  const sync=()=>{
    if(panel.hidden)return;
    const session=system.session, day=world.clock.day, next=(system.week+1)*7+(session?.phase==='ended'?7:0);
    const actor=system.resolve(scene.possessedNpcId), active=system.activeLot;
    const data=panel.querySelector('[data-lots]'),actions=panel.querySelector('[data-actions]');
    actions.replaceChildren();data.replaceChildren();
    panel.querySelector('[data-status]').textContent=message;
    detail(actions,(phaseText[session?.phase]??'Đang nhận ký gửi')+' · Ngày '+day+' · Phiên ngày '+next+' 10:00','p');
    detail(actions,'Đấu giá sư '+name(session?.auctioneer)+' · '+(session?.checked.length??0)+' khách đã kiểm tra · '+BUILDING_INTERIORS.get(AUCTION_BUILDING).capacity+' ghế');
    button(actions,'Định vị Vạn Bảo Các',()=>{scene.underground.view.hide();system.moveToEntrance();panel.hidden=true;});
    if(!actor)button(actions,'Quan sát chính sảnh',()=>{system.observe();panel.hidden=true;});
    else{
      const slot=session?.seats[actor.id];
      detail(actions,actor.name+' · '+actor.spiritStones+' linh thạch khả dụng'+(slot!==undefined?' · '+auctionSeats[slot].name+' · Tầng '+(auctionSeats[slot].floor+1):''));
      if(slot!==undefined&&actor.underground?.siteId===system.site?.id){
        button(actions,'Đến '+auctionSeats[slot].name.toLocaleLowerCase('vi'),()=>{actor.underground.auctionAssist=true;panel.hidden=true;});
      }else if(system.nearDesk(actor)&&session?.phase==='reception'){
        button(actions,'Vào chính sảnh',()=>{if(system.interactSurface(actor)&&actor.underground)panel.hidden=true;else sync();});
      }
      if(system.nearDesk(actor)&&(!session||session.phase==='announced')){
        for(const sourceId of [actor.id,...world.shops.filter(shop=>shop.ownerId===actor.id).map(shop=>shop.id),
          ...world.factions.filter(faction=>system.source(faction.id)?.agentId===actor.id).map(faction=>faction.id)]){
          const possible=system.source(sourceId).goods.filter(stack=>system.eligibleItem(stack.itemId)&&(sourceId!==actor.id||stack.itemId!==actor.equippedWeapon||stack.count>1));
          for(const stack of possible){
            button(actions,'Ký gửi · '+commerceProduct(stack.itemId).name+(sourceId===actor.id?'':' · '+name(sourceId)),()=>{
              message=system.consign(actor,stack.itemId,null,sourceId)?'Đã khóa vật phẩm trong kho ký gửi.':'Chưa thể ký gửi tại thời điểm này.';
              sync();
            });
          }
        }
      }
    }
    const lots=system.state.lots.filter(lot=>lot.week===system.week);
    if(!lots.length)detail(data,'Chưa có lô từ nguồn ký gửi hợp lệ.','p');
    for(const lot of lots){
      const row=document.createElement('article');
      const product=commerceProduct(lot.itemId);
      row.append(makeItemIcon(lot.itemId));
      const text=document.createElement('div');row.append(text);
      detail(text,product.name+' · '+product.gradeName+' cấp','strong');
      detail(text,name(lot.seller)+' · Giá mở '+lot.ask+' linh thạch · '+lotText[lot.status]);
      if(lot===active){
        detail(text,'Còn '+Math.max(0,lot.endsAt-system.now)+' phút · '+(lot.escrow?name(lot.escrow.buyer)+' giữ giá '+lot.escrow.price:'Chưa có giá trả'));
        if(actor)button(text,'Trả '+system.nextAsk(lot)+' linh thạch',()=>{
          message=system.bid(actor,lot)?'Đã khóa linh thạch của giá trả.':'Cần ngồi đúng ghế và đủ linh thạch khả dụng.';
          sync();
        }).disabled=!system.seated(actor)||actor.spiritStones<system.nextAsk(lot)||lot.escrow?.buyer===actor.id;
      }
      if(lot.result)detail(text,name(lot.result.winner)+' thắng · '+lot.result.price+' · Người bán nhận '+lot.result.net+' · Hoa hồng '+lot.result.fee);
      if(lot.bids.length){
        const history=document.createElement('details');
        detail(history,'Lịch sử '+lot.bids.length+' giá','summary');
        for(const bid of lot.bids.slice().reverse())detail(history,name(bid.buyer)+' · '+bid.price+' linh thạch');
        text.append(history);
      }
      data.append(row);
    }
  };
  const open=()=>{message='';panel.hidden=false;sync();};
  panel.querySelector('[data-close]').onclick=()=>{panel.hidden=true;};
  scene.events.once('shutdown',()=>panel.remove());
  return {open,update:sync,element:panel};
}

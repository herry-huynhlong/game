import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';

const origin='/?testMode=1&populationTest=108';
const resultDir=resolve('art/previews/van-bao-lau');
const fixtures=`
  const w=s.populationWorld,a=s.weeklyAuction,ug=s.underground;
  const quiet=()=>{w.clock.paused=true;w.clock.speed=1;};
  const calendar=(day,minute)=>{w.clock.day=day;w.clock.minute=minute;a.tick();};
  const tab=id=>document.querySelector('[data-heaven-tab="'+id+'"]').click();
  const buy=id=>document.querySelector('#heaven-shop article[data-item-id="'+id+'"] button').click();
  const exact=(stack)=>stack?.instances?.[0]?.id??stack?.itemInstances?.[0]?.id;
  const n=id=>w.npcs.find(person=>person.id===id);
`;

export async function captureCommerce({send,evalScene,visit,ready,errors,failed}){
  await mkdir(resultDir,{recursive:true});
  const ev=(code)=>evalScene(fixtures+code);
  const screenshot=async name=>{
    await sleep(180);
    const r=await send('Page.captureScreenshot',{format:'png'});
    await writeFile(join(resultDir,name+'.png'),Buffer.from(r.data,'base64'));
  };
  await visit(origin,ready);
  if(process.argv.includes('--natural')){
    await captureNatural(ev);
    assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
    return;
  }
  const sampleFrames=async()=>evalScene(`
    return new Promise(resolve=>{
      const samples=[];let last=0;
      function sample(at){
        if(last)samples.push(at-last);
        last=at;
        if(samples.length<80){requestAnimationFrame(sample);return;}
        samples.sort((a,b)=>a-b);
        resolve({frames:samples.length,meanMs:samples.reduce((a,b)=>a+b)/samples.length,p95Ms:samples[75]});
      }
      requestAnimationFrame(sample);
    });
  `);
  const grounds=await ev(`
    quiet();calendar(3,700);
    a.moveToEntrance();
    return {noTopButton:!document.getElementById('open-weekly-auction'),
      path:s.canReachPoint(s.markers.find(m=>m.id==='city-center'),a.point),
      open:s.footprintTerrainOpen(a.point.x,a.point.y,10,7),
      maps:a.site.map.floors.map(f=>f.id),hp:a.building.hp,
      venues:['music','clinic'].map(id=>{
        const venue=s.society.places.get(id);
        const center=s.markers.find(m=>m.id==='city-center');
        return [venue.staffSlot,venue.counter,...venue.seats,...venue.queue].every(p=>
          s.footprintTerrainOpen(p.x,p.y,8,5)&&s.canReachPoint(center,p));
      })};
  `);
  assert.ok(grounds.noTopButton&&grounds.path&&grounds.open&&grounds.hp>0,JSON.stringify(grounds));
  assert.equal(new Set(grounds.maps).size,3);
  assert.deepEqual(grounds.venues,[true,true]);
  await screenshot('van-bao-01-ben-ngoai-ban-ngay');
  const surfaceFrames=await sampleFrames();
  await ev("calendar(3,1260);return true;");
  await screenshot('van-bao-02-ben-ngoai-ban-dem');
  await ev("calendar(3,700);s.setZoom(.37);s.cameras.main.centerOn(a.point.x-124,a.point.y+265);return true;");
  await screenshot('van-bao-03-vi-tri-trong-thanh');
  await ev("a.moveToEntrance();return true;");
  await sleep(520);
  const screen=await ev(`
    const cam=s.cameras.main,canvas=s.game.canvas,rect=canvas.getBoundingClientRect();
    const top=cam.getWorldPoint(0,0),sprite=s.buildingSprites.get('van-bao-cac');
    const at={x:sprite.x,y:sprite.y-97};
    return {x:(at.x-top.x)*cam.zoom*rect.width/s.scale.width+rect.left,
      y:(at.y-top.y)*cam.zoom*rect.height/s.scale.height+rect.top,pick:s.inspector.hits(at)[0]?.id};
  `);
  assert.equal(screen.pick,'van-bao-cac');
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x:screen.x,y:screen.y,button:'left',clickCount:1});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:screen.x,y:screen.y,button:'left',clickCount:1});
  const chosen=await ev("return document.querySelector('#world-inspector:not([hidden])')?.dataset.id;");
  assert.equal(chosen,'van-bao-cac');
  await screenshot('van-bao-04-thien-dao-giam-dinh');
  const durability=await ev(`
    const before=a.building.hp;
    const hit=s.damageBuilding(a.building.id,'van-bao-browser-check',110,4);
    return {damaged:Boolean(hit)&&a.building.hp<before,repairable:a.building.repairable,
      repairApproach:s.canReachPoint(s.markers.find(m=>m.id==='city-center'),a.building.repairSite)};
  `);
  assert.deepEqual(durability,{damaged:true,repairable:true,repairApproach:true});
  await ev("document.querySelector('#world-inspector [data-underground]').click();return true;");
  await screenshot('van-bao-05-tang-1');
  const hallFrames=await sampleFrames();
  await writeFile(join(resultDir,'architecture-frames.json'),JSON.stringify({surfaceFrames,hallFrames,
    note:'80 requestAnimationFrame samples, paused, headless Chrome, different zooms framing each area'},null,2)+'\n');
  for(const floor of [1,2]){
    const observed=await ev(`
      const view=ug.view,before=a.occupants.map(n=>JSON.stringify(n.underground));
      const stair=view.floor.down;
      view.inspect({x:stair.x*24+12,y:stair.y*24+12});
      return {floor:view.level,same:JSON.stringify(before)===JSON.stringify(a.occupants.map(n=>JSON.stringify(n.underground)))};
    `);
    assert.deepEqual(observed,{floor,same:true});
    await screenshot('van-bao-0'+(floor+5)+'-tang-'+(floor+1));
  }
  await ev("ug.view.hide();return true;");
  const shop=await ev(`
    quiet();w.heaven.divinePower=45000;
    s.selectNPC(w.npcs[0].id);
    document.getElementById('open-heaven-shop').click();
    tab('skills');
    const manuals=document.querySelectorAll('#heaven-shop article[data-item-id^="manual_"]').length;
    tab('arms');
    const arms=document.querySelectorAll('#heaven-shop article').length;
    const old=w.npcs[0].spiritStones;
    buy('steel_jian');
    const row=w.heaven.shopLedger.find(row=>row.itemId==='steel_jian');
    return {manuals,arms,price:row.divinePowerPrice,wallet:w.heaven.divinePower,
      sameCoins:old===w.npcs[0].spiritStones,inVault:row.owner==='heaven'&&exact(row.cargo[0])===row.instanceId,
      entrance:a.point,site:ug.sites.has('van-bao-auction')};
  `);
  assert.equal(shop.manuals,15);
  assert.equal(shop.arms,15);
  assert.equal(shop.wallet,45000-shop.price);
  assert.ok(shop.sameCoins&&shop.inVault&&shop.site,JSON.stringify(shop));
  await screenshot('01-thuong-diem-vu-khi');
  await ev("tab('skills');return true;");
  await screenshot('02-thuong-diem-cong-phap');
  await ev("tab('vault');return true;");
  await screenshot('03-kho-thien-dao');
  await ev("tab('gift');return true;");
  await screenshot('04-ban-thuong');
  const gift=await ev(`
    const row=w.heaven.shopLedger.find(row=>row.itemId==='steel_jian'),id=row.instanceId;
    const recipient=w.npcs[0],before=recipient.spiritStones;
    const select=document.querySelector('#heaven-shop [data-heaven-list] label select');
    select.value=recipient.id;select.onchange();
    document.querySelector('#heaven-shop article[data-item-id="steel_jian"] button').click();
    return {instance:id,actual:recipient.inventory.find(row=>row.itemId==='steel_jian')?.instances?.some(row=>row.id===id),
      balance:w.heaven.divinePower,sameCoins:recipient.spiritStones===before,owner:row.owner,recipient:recipient.id};
  `);
  assert.ok(gift.actual&&gift.sameCoins&&gift.owner===gift.recipient,JSON.stringify(gift));
  assert.equal(gift.balance,shop.wallet);
  await sleep(660);
  const cave=await ev(`
    tab('arms');buy('jade_jian');
    const custody=w.heaven.shopLedger.find(row=>row.itemId==='jade_jian'&&row.owner==='heaven');
    const bodies=w.npcs.filter(npc=>npc.alive&&!npc.minor&&!npc.underground&&!npc.ascended).slice(0,2);
    const seen=[];
    for(const body of bodies){
      s.selectNPC(body.id);s.beginPossession();
      seen.push({holder:w.heaven.possession?.npcId,instance:exact(custody.cargo[0])});
      s.endPossession('Kiểm tra quyền sở hữu Kho Thiên Đạo.');
    }
    document.getElementById('open-heaven-shop').click();tab('opportunity');
    const site=s.opportunities.sites().find(entry=>entry.kind==='iron'&&s.opportunities.caveLocation(entry.id,0));
    if(!site)return {ok:false};
    const box=document.querySelector('[aria-label="Bản đồ"]');
    box.value=site.id;box.onchange();
    [...document.querySelectorAll('#heaven-shop [data-heaven-list] button')].find(b=>b.textContent==='Chọn vị trí').click();
    [...document.querySelectorAll('#heaven-shop [data-heaven-list] button')].find(b=>b.textContent==='Xác nhận chuyển khỏi kho').click();
    const drop=s.opportunities.rows.at(-1);
    if(!drop)return {ok:false,msg:document.querySelector('#heaven-shop [role=status]').textContent};
    document.querySelector('[data-close-heaven]').click();ug.view.selectOpportunity(drop);
    return {ok:true,dropId:drop.id,siteId:drop.siteId,position:{x:drop.x,y:drop.y},instance:drop.instanceId,
      unique:exact(drop.cargo[0])===drop.instanceId,saved:s.persistPopulation(),seen};
  `);
  assert.ok(cave.ok&&cave.unique&&cave.saved,JSON.stringify(cave));
  assert.equal(new Set(cave.seen.map(entry=>entry.holder)).size,2);
  assert.ok(cave.seen.every(entry=>entry.holder&&entry.instance===cave.instance),JSON.stringify(cave.seen));
  await screenshot('05-bao-vat-bi-canh');
  await visit(origin,ready);
  const discovery=await ev(`
    quiet();
    const row=s.opportunities.rows.find(row=>row.id===${JSON.stringify(cave.dropId)}),site=ug.sites.get(row.siteId);
    const finder=w.npcs.find(npc=>npc.alive&&!npc.minor&&!npc.underground&&!npc.flight&&!npc.tribulation&&npc.id!==${JSON.stringify(gift.recipient)});
    const untouched=exact(row.cargo[0])===row.instanceId&&!row.owner;
    Object.assign(finder,{x:site.point.x,y:site.point.y,wallLevel:0,skyStep:undefined});
    const entered=ug.enter([finder],site), notAtDoor=!s.opportunities.tryFind(finder);
    const floor=site.map.floors[0];
    let steps=0;
    while(steps++<150&&!row.owner){
      if(!ug.move(finder,row,floor))break;
      s.opportunities.tryFind(finder);
    }
    ug.view.show(site.id,0);ug.view.focus(finder.underground);ug.view.selectOpportunity(row);
    const repeated=s.opportunities.tryFind(finder);
    return {untouched,entered,notAtDoor,steps,found:row.owner===finder.id,
      preserved:finder.inventory.find(i=>i.itemId==='jade_jian')?.instances?.some(i=>i.id===row.instanceId),repeated,cargo:row.cargo};
  `);
  assert.ok(discovery.untouched&&discovery.entered&&discovery.notAtDoor&&discovery.steps>1&&discovery.found&&discovery.preserved,JSON.stringify(discovery));
  assert.equal(discovery.repeated,false);
  assert.equal(discovery.cargo,undefined);
  await screenshot('06-phat-hien-co-duyen');
  const surface=await ev(`
    ug.view.hide();document.getElementById('open-heaven-shop').click();tab('skills');buy('manual_breeze');
    const row=w.heaven.shopLedger.find(record=>record.itemId==='manual_breeze'&&record.owner==='heaven');
    const blocked=s.opportunities.place(row.id,{x:-9999999,y:0},'stele').ok;
    const retained=exact(row.cargo[0])===row.instanceId;
    const point=[{x:a.point.x,y:a.point.y+64},{x:a.point.x+64,y:a.point.y+48},a.point]
      .map(at=>s.opportunities.surfaceLocation(at)).find(Boolean);
    document.querySelector('[data-close-heaven]').click();
    const placed=s.opportunities.place(row.id,point,'stele').ok;
    const duplicate=s.opportunities.place(row.id,point,'stele').ok;
    const object=s.opportunities.rows.find(item=>item.instanceId===row.instanceId);
    return {blocked,retained,placed,duplicate,one:exact(object?.cargo?.[0])===row.instanceId};
  `);
  assert.deepEqual(surface,{blocked:false,retained:true,placed:true,duplicate:false,one:true});
  const preparation=await ev(`
    ug.view.hide();calendar(5,430);
    for(const npc of w.npcs)if(npc.spiritStones>98)npc.spiritStones=98;
    const guests=w.npcs.filter(npc=>npc.alive&&!npc.minor&&!npc.underground&&!npc.flight&&!npc.tribulation&&
      npc.populationRole==='independent_cultivator'&&!npc.vocation).slice(0,4);
    if(guests.length!==4)return {error:'Not enough fixture NPCs'};
    const [seller,denied,exactly,rich]=guests;
    const cells=[];
    for(let r=48;r<=112;r+=16)for(let i=0;i<12;i++){
      const at={x:a.point.x+Math.round(r*Math.cos(i*Math.PI/6)),y:a.point.y+Math.round(r*Math.sin(i*Math.PI/6))};
      if(s.footprintTerrainOpen(at.x,at.y,10,7)&&s.canReachPoint(a.point,at)&&s.clearCombatLine(a.point,at)&&
        cells.every(cell=>Math.hypot(at.x-cell.x,at.y-cell.y)>22))cells.push(at);
    }
    if(cells.length<4)return {error:'No feasible approaches',point:a.point,cells};
    for(let i=0;i<4;i++){
      const npc=guests[i];
      Object.assign(npc,cells[i],{goalAction:'idle',action:'idle',wallLevel:0,hunger:0,fatigue:0,skyStep:undefined,
        marketVisit:undefined,convalescence:undefined,realmIndex:2,realmLevel:4,spiritStones:[50,99,100,240][i],
        spiritualRoot:'metal',martial:{active:'purple-sword',learned:{'purple-sword':300},ready:{}},
        inventory:i?[]:[{itemId:'purple_jian',count:1},{itemId:'heaven_thunder_jian',count:1}],equippedWeapon:null});
      const party=s.expeditions?.of(npc);
      if(party)s.expeditions.leave(npc,party);
      s.npcSprites.get(npc.id).setPosition(npc.x,npc.y);
      s.resetNpcRoute(npc);
    }
    s.syncGroundOccupancy();
    const a1=a.consign(seller,'purple_jian',80),a2=a.consign(seller,'heaven_thunder_jian',900);
    calendar(6,660);
    const before=a.session.phase;
    calendar(7,480);
    return {a1,a2,before,seller:seller.id,denied:denied.id,exactly:exactly.id,rich:rich.id,
      allowed100:a.qualifiedForSeat(exactly),denied99:!a.qualifiedForSeat(denied),assigned:Object.keys(a.session.seats),
      start:{x:exactly.x,y:exactly.y},soldId:a.state.lots.at(-2)?.instanceId,returnId:a.state.lots.at(-1)?.instanceId};
  `);
  assert.ok(preparation.a1&&preparation.a2&&preparation.allowed100&&preparation.denied99,JSON.stringify(preparation));
  assert.equal(preparation.before,'announced');
  const vaultView=await ev(`
    a.observe(2);const t=ug.view.floor.props.find(p=>p.name==='Bệ ký gửi');
    ug.view.inspect({x:t.x*24+12,y:t.y*24+12});ug.view.details();
    const rows=ug.view.info.querySelector('dl').textContent;
    const count=a.vaultLots.length;ug.view.hide();
    return {count,recognized:rows.includes('Tồn kho'),denied:!a.permittedFloor(n(${JSON.stringify(preparation.rich)}),2)};
  `);
  assert.deepEqual(vaultView,{count:2,recognized:true,denied:true});
  assert.ok(preparation.assigned.includes(preparation.exactly)&&!preparation.assigned.includes(preparation.denied),JSON.stringify(preparation));
  const onStair=await ev(`
    a.observe();
    const rich=n(${JSON.stringify(preparation.rich)});
    w.clock.paused=false;w.clock.speed=4;
    let enteredLower=false;
    for(let step=0;step<53;step++){
      s.updatePopulation(s.time.now+step*250,250);
      if(rich.underground?.siteId!==a.site.id)continue;
      if(rich.underground.floor===0)enteredLower=true;
      if(rich.underground.floor===1){
        quiet();a.observe(1);ug.view.focus(rich.underground);
        return {step,enteredLower,floor:rich.underground.floor,seated:Boolean(rich.underground.auctionSeated)};
      }
    }
    quiet();return {enteredLower,step:53};
  `);
  assert.ok(onStair.enteredLower&&onStair.floor===1&&!onStair.seated,JSON.stringify(onStair));
  await screenshot('van-bao-09a-npc-chuyen-tang');
  const arrival=await ev(`
    a.observe();
    const id=${JSON.stringify(preparation.exactly)}, rich=${JSON.stringify(preparation.rich)};
    w.clock.paused=false;w.clock.speed=4;
    const visits=[];
    for(let step=${onStair.step+1};step<57;step++){
      s.updatePopulation(s.time.now+step*250,250);
      if(step%5===0){const person=n(id);visits.push({step,x:person.x,y:person.y,target:person.actionTarget,
        slot:person.decisionSlot,road:a.people.has(id),report:person.shortGoal,map:person.underground?.siteId});}
    }
    quiet();
    return {entered:n(id).underground?.siteId,rich:n(rich).underground?.siteId,seated:n(id).underground?.auctionSeated,
      moved:Math.hypot(n(id).x-${preparation.start.x},n(id).y-${preparation.start.y}),minute:w.clock.minute,
      position:n(id).underground,richPosition:n(rich).underground,diagnostic:{target:n(id).actionTarget,position:[n(id).x,n(id).y],goal:n(id).goalAction,seat:a.session.seats[id],point:a.point,visits}};
  `);
  assert.equal(arrival.entered,'van-bao-auction',JSON.stringify(arrival));
  assert.equal(arrival.rich,'van-bao-auction',JSON.stringify(arrival));
  assert.ok(arrival.moved>5&&arrival.seated,JSON.stringify(arrival));
  assert.equal(arrival.richPosition.floor,1,JSON.stringify(arrival));
  await screenshot('van-bao-08-khach-ngoi-trong-chinh-sanh');
  await ev(`
    a.observe(1);
    ug.view.focus(n(${JSON.stringify(preparation.rich)}).underground);
    return true;
  `);
  await screenshot('van-bao-09-npc-len-nha-cac');
  await ev("a.observe();return true;");
  const bid=await ev(`
    const ids=${JSON.stringify([preparation.seller,preparation.exactly,preparation.rich])};
    const coins=()=>ids.reduce((sum,id)=>sum+n(id).spiritStones,0)+a.state.treasury+(a.activeLot?.escrow?.price??0);
    calendar(7,540);
    const before=coins();
    for(let minute=600;minute<=605;minute++)calendar(7,minute);
    a.panel.open();
    return {count:a.activeLot.bids.length,buyer:a.activeLot.escrow?.buyer,
      current:a.activeLot.escrow?.price,left:n(a.activeLot.escrow.buyer).spiritStones,
      other:n(ids.find(id=>id!==ids[0]&&id!==a.activeLot.escrow.buyer)).spiritStones,
      before,conserved:coins()===before,saved:s.persistPopulation()};
  `);
  assert.ok(bid.count>=2&&bid.conserved&&bid.saved&&bid.left>=0,JSON.stringify(bid));
  await screenshot('van-bao-10-npc-tra-gia-va-ky-quy');
  await ev("a.panel.element.querySelector('[data-close]').click();ug.view.focus(a.site.map.floors[0].props.find(p=>p.kind==='podium'));return true;");
  await screenshot('van-bao-11-linh-bao-tren-san-khau');
  await visit(origin,ready);
  const settlement=await ev(`
    quiet();
    const ids=${JSON.stringify([preparation.seller,preparation.exactly,preparation.rich])};
    const before=a.activeLot.escrow.price;
    const coins=()=>ids.reduce((sum,id)=>sum+n(id).spiritStones,0)+a.state.treasury+(a.activeLot?.escrow?.price??0);
    const hand=coins(),seller=n(ids[0]),income=seller.spiritStones;
    for(let minute=606;minute<=625;minute++)calendar(7,minute);
    const sold=a.state.lots.find(lot=>lot.instanceId===${JSON.stringify(preparation.soldId)});
    const returned=a.state.lots.find(lot=>lot.instanceId===${JSON.stringify(preparation.returnId)});
    const duplicate=a.settle(sold);
    const purchased=n(sold.result.winner).inventory.find(row=>row.itemId===sold.itemId)?.instances.some(row=>row.id===sold.instanceId);
    const restored=seller.inventory.find(row=>row.itemId===returned.itemId)?.instances.some(row=>row.id===returned.instanceId);
    const correct=seller.spiritStones-income===sold.result.net&&sold.result.net+sold.result.fee===sold.result.price;
    a.panel.open();
    const first={before,duplicate,purchased,restored,correct,conserved:coins()===hand,ended:a.session.phase,status:returned.status,sale:sold.result};
    for(let minute=626;minute<700;minute++){calendar(7,minute);ug.tick();}
    const exited=ids.slice(1).every(id=>!n(id).underground);
    calendar(13,600);calendar(14,600);
    return {...first,exited,weekTwo:a.session.week,sessions:a.state.sessions.length,sameId:sold.instanceId};
  `);
  assert.equal(settlement.duplicate,false);
  assert.ok(settlement.purchased&&settlement.restored&&settlement.correct&&settlement.conserved,JSON.stringify(settlement));
  assert.equal(settlement.ended,'ended');
  assert.equal(settlement.exited,true,JSON.stringify(settlement));
  assert.equal(settlement.weekTwo,1);
  assert.equal(settlement.sessions,2);
  const vendor=await ev(`
    const venue=s.merchants.shops.get('city-forge'),npc=w.npcs.find(n=>n!==venue.owner&&n.alive&&!n.minor&&!n.underground&&!n.flight);
    const row=venue.shop.stock.find(row=>row.itemId==='steel_jian');
    if(!row)return {error:'The initial forging stock has already moved'};
    const amount=row.count;
    Object.assign(venue.owner,venue.position,{hunger:0,fatigue:0,safety:100,action:'work',goalAction:'work',
      marketVisit:undefined,flight:undefined,faunaHuntTargetId:undefined,decisionSlot:'shop-shift:city-forge'});
    Object.assign(npc,venue.counter[0],{spiritStones:venue.shop.sellPrices.steel_jian*amount,wallLevel:0,hunger:0,goalAction:'idle'});
    s.possessedNpcId=npc.id;
    s.merchantPanel.open(npc,venue);
    return {npc:npc.id,amount,quoted:s.merchants.quote(npc,venue,'buy','steel_jian',amount).ok,
      martialRows:s.merchantPanel.dialog.querySelectorAll('[data-item="steel_jian"],[data-item^="manual_"]').length};
  `);
  assert.ok(vendor.quoted&&vendor.amount>0&&vendor.martialRows>0,JSON.stringify(vendor));
  await screenshot('09-binh-khi-pho');
  const soldOut=await ev(`
    const id=${JSON.stringify(vendor.npc)},npc=n(id),venue=s.merchants.shops.get('city-forge');
    const purchase=s.merchants.execute(npc,venue,'buy','steel_jian',${vendor.amount});
    const quote=s.merchants.quote(npc,venue,'buy','steel_jian',1);
    return {paid:purchase.ok,remaining:venue.shop.stock.find(row=>row.itemId==='steel_jian')?.count??0,
      duplicate:quote.ok,reason:quote.message};
  `);
  assert.ok(soldOut.paid&&soldOut.remaining===0&&!soldOut.duplicate,JSON.stringify(soldOut));
  assert.deepEqual(errors,[]);
  assert.deepEqual(failed,[]);
  await writeFile(join(resultDir,'controlled.json'),JSON.stringify({shop,gift,cave,discovery,surface,preparation,arrival,bid,settlement,vendor,soldOut},null,2)+'\n');
  console.log('Vạn Bảo controlled browser passed',JSON.stringify({shop,discovery,bid,settlement}));
}

async function captureNatural(ev){
  const read=`
    const buyers=w.npcs.filter(n=>n.alive&&!n.minor);
    const cult=buyers.filter(n=>n.profession==='tu_si');
    const ledger=w.heaven.divineLedger;
    return {day:w.clock.day,minute:w.clock.minute,wealth:buyers.reduce((sum,n)=>sum+n.spiritStones,0),eligible:buyers.filter(n=>a.qualifiedForSeat(n)).length,
      divine:{earned:ledger.earned,death:ledger.npcDeath,fauna:ledger.faunaDeath,breakthrough:ledger.breakthrough},
      cultivators:cult.map(n=>[n.id,n.spiritStones]),sessions:a.state.sessions.map(row=>[row.week,row.phase,row.lots.length,row.checked.length]),
      funds:a.state.treasury,lots:a.state.lots.map(x=>[x.itemId,x.status]),cashFlow:s.vanBaoFlow,
      sampleWages:w.events.filter(event=>/wage|pay/.test(event.type)).length};
  `;
  const start=await ev('quiet();s.vanBaoFlow={};'+read);
  const snapshots=[start];
  const days=Number(process.env.COMMERCE_SIM_DAYS??8);
  for(let daysElapsed=0;daysElapsed<days;daysElapsed++){
    for(let m=0;m<1440;m+=120){
      await ev(`
        w.clock.paused=false;w.clock.speed=4;
        for(let step=0;step<120;step++){
          const before=new Map(w.npcs.filter(n=>n.alive).map(n=>[n.id,n.spiritStones]));
          s.updatePopulation(s.time.now+step*250,250);
          for(const n of w.npcs){
            const diff=n.spiritStones-(before.get(n.id)??n.spiritStones);
            if(!diff)continue;
            const totals=s.vanBaoFlow[n.profession]??={inflow:0,outflow:0};
            if(diff>0)totals.inflow+=diff;else totals.outflow-=diff;
          }
        }
        quiet();return true;
      `);
    }
    const next=await ev(read);snapshots.push(next);
    console.log('Natural day '+next.day+' · eligible '+next.eligible+' · divine earned '+next.divine.earned);
    await writeFile(join(resultDir,'natural.json'),JSON.stringify({elapsedDays:daysElapsed+1,snapshots},null,2)+'\n');
  }
}

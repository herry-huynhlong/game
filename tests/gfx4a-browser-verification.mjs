import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const base='http://127.0.0.1:5173/?devtest=1';
const out=path.resolve('art/previews/gfx4a-verification');
const chrome=process.env.PROGRAMFILES+'\\Google\\Chrome\\Application\\chrome.exe';
if(!fs.existsSync(chrome))throw new Error(`Chrome not found: ${chrome}`);
await fetch('http://127.0.0.1:5173/').then(r=>{if(!r.ok)throw new Error(`Dev server returned ${r.status}`)});
fs.mkdirSync(out,{recursive:true});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'gfx4a-cdp-'));
const port=await new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const p=server.address().port;server.close(()=>resolve(p))})});
const proc=spawn(chrome,[`--user-data-dir=${profile}`,`--remote-debugging-port=${port}`,'--remote-allow-origins=*','--no-first-run','--no-default-browser-check','--headless=new','--hide-scrollbars','--window-size=1280,720','--force-device-scale-factor=1','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--use-angle=swiftshader',base],{stdio:'ignore',windowsHide:true});
let ws,wsOpen,wsOpenResolve;wsOpen=new Promise(resolve=>wsOpenResolve=resolve);let seq=0;const pending=new Map();const errors=[];
try{
  let targets=[];for(let i=0;i<80;i++){if(proc.exitCode!==null)throw new Error(`Chrome exited with ${proc.exitCode}`);try{targets=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());if(targets.some(x=>x.type==='page'))break}catch{}await delay(250)}
  const target=targets.find(x=>x.type==='page');if(!target)throw new Error('Chrome DevTools page did not appear');
  ws=new WebSocket(target.webSocketDebuggerUrl);ws.addEventListener('open',()=>wsOpenResolve());ws.addEventListener('message',event=>{const msg=JSON.parse(event.data);if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails?.text??'Runtime exception');if(msg.id&&pending.has(msg.id)){const p=pending.get(msg.id);pending.delete(msg.id);msg.error?p.reject(new Error(msg.error.message)):p.resolve(msg.result)}});await wsOpen;
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
  const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description??result.exceptionDetails.text);return result.result?.value};
  await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:base});
  for(let i=0;i<100;i++){if(await evaluate(`!!document.querySelector('canvas')&&[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Phá và sửa nhà'))`))break;await delay(200)}
  await delay(3500);
  const readWorld=async()=>JSON.parse(await evaluate(`localStorage.getItem('thien-dao-world-devtest-v1')||'null'`));
  const object=(world,kind)=>world?.environment?.objects?.find(o=>o.kind===kind);
  const capture=async name=>{const shot=await send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});fs.writeFileSync(path.join(out,name),Buffer.from(shot.data,'base64'))};
  const clickButton=async text=>{for(let i=0;i<50;i++){const clicked=await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes(${JSON.stringify(text)}));if(!b)return false;b.click();return true})()`);if(clicked){await delay(300);return}await delay(200)}throw new Error(`Devtest button not found after page ready: ${text}`)};
  const key=async(letter,hold=80)=>{const upper=letter.toUpperCase(),code=`Key${upper}`,vk=upper.charCodeAt(0);await send('Page.bringToFront');await send('Input.dispatchMouseEvent',{type:'mousePressed',x:640,y:350,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:640,y:350,button:'left',clickCount:1});await send('Input.dispatchKeyEvent',{type:'keyDown',key:letter,code,windowsVirtualKeyCode:vk,nativeVirtualKeyCode:vk,location:0});await send('Input.dispatchKeyEvent',{type:'char',key:letter,code,text:letter,unmodifiedText:letter,windowsVirtualKeyCode:vk,nativeVirtualKeyCode:vk,location:0});await delay(hold);await send('Input.dispatchKeyEvent',{type:'keyUp',key:letter,code,windowsVirtualKeyCode:vk,nativeVirtualKeyCode:vk,location:0});await delay(180)};
  const strike=async()=>{await key('j');await delay(440)};
  const waitFor=async predicate=>{for(let i=0;i<70;i++){const world=await readWorld();if(predicate(world))return world;await delay(500)}return readWorld()};
  const waitForRepair=async()=>{for(let i=0;i<300;i++){const world=await readWorld();if(object(world,'house')?.status==='intact')return world;await delay(500)}return readWorld()};
  const worldErrors=[];console.log('browser ready');

  await clickButton('Phá và sửa nhà');
  await evaluate(`document.querySelector('[data-speed="4"]')?.click()`);
  console.log('house setup clicked');
  let world=await readWorld(),house=object(world,'house');if(world?.heaven?.possession?.npcId!=='van-du')throw new Error(`Devtest A did not establish real possession; save=${JSON.stringify({keys:await evaluate('Object.keys(localStorage)'),possession:world?.heaven?.possession,toast:await evaluate('document.querySelector("#toast")?.textContent'),buttons:await evaluate('[...document.querySelectorAll("button")].map(b=>b.textContent).filter(x=>x.includes("Phá và sửa"))')})}`);if(house?.status!=='intact'||house.hp!==house.maxHp)throw new Error('Devtest A did not reset the test house to intact');
  await capture('house-intact.png');console.log('captured house intact');
  for(let i=0;i<4&&object(await readWorld(),'house')?.status!=='damaged';i++)await strike();world=await readWorld();house=object(world,'house');if(house?.status!=='damaged')worldErrors.push(`Expected house damaged after real J attacks, got ${house?.status} ${house?.hp}/${house?.maxHp}`);await capture('house-damaged.png');console.log(`captured house damaged (${house?.hp}/${house?.maxHp})`);
  for(let i=0;i<3&&object(await readWorld(),'house')?.status!=='destroyed';i++)await strike();world=await readWorld();house=object(world,'house');if(house?.status!=='destroyed')worldErrors.push(`House did not collapse after additional attacks: ${house?.status} ${house?.hp}/${house?.maxHp}`);if(world?.environment?.drops?.some(d=>d.sourceId===house.id))worldErrors.push('House collapse created loot');await capture('house-destroyed.png');console.log(`captured house destroyed (${house?.hp}/${house?.maxHp})`);
  const beforeRepair={wood:world.settlement.materials.find(x=>x.itemId==='wood')?.count??0,iron_ore:world.settlement.materials.find(x=>x.itemId==='iron_ore')?.count??0};
  world=await waitFor(w=>object(w,'house')?.status==='repairing'||object(w,'house')?.status==='intact');house=object(world,'house');
  console.log(`repair phase: ${house?.status}, progress=${house?.repairProgress}`);
  if(house?.status==='repairing'){
    await capture('house-repairing.png');
    world=await waitForRepair();house=object(world,'house');
  }
  if(house?.status!=='intact')worldErrors.push(`Builder did not finish repair; state=${house?.status}, progress=${house?.repairProgress}`);
  const afterRepair={wood:world.settlement.materials.find(x=>x.itemId==='wood')?.count??0,iron_ore:world.settlement.materials.find(x=>x.itemId==='iron_ore')?.count??0};
  if(beforeRepair.wood-afterRepair.wood!==3||beforeRepair.iron_ore-afterRepair.iron_ore!==2)worldErrors.push(`Repair stock delta incorrect: ${JSON.stringify({beforeRepair,afterRepair})}`);
  if(house?.status==='intact')await capture('house-repaired.png');
  await send('Page.reload');await delay(1500);world=await readWorld();if(object(world,'house')?.status!=='intact')worldErrors.push('House repaired state failed save/load');

  await clickButton('Đốn cây, nhặt gỗ');world=await readWorld();let tree=object(world,'tree');if(world?.heaven?.possession?.npcId!=='van-du'||tree?.status!=='intact')worldErrors.push('Devtest B did not stage a living possessed character and intact tree');
  for(let i=0;i<3;i++)await strike();
  let observedGround=false;for(let i=0;i<60;i++){world=await readWorld();tree=object(world,'tree');if(tree?.status==='destroyed'&&world.environment.drops.some(d=>d.sourceId===tree.id&&d.status==='ground')){observedGround=true;break}await delay(20)}
  if(tree?.status!=='destroyed')worldErrors.push(`Tree did not fall after J strikes: ${tree?.status} ${tree?.hp}/${tree?.maxHp}`);
  if(observedGround)await capture('tree-felled-loot.png');else worldErrors.push('Tree loot was never observed on the ground');
  const woodBefore=world?.npcs?.find(n=>n.id==='van-du')?.inventory?.find(i=>i.itemId==='wood')?.count??0;await key('e');
  world=await waitFor(w=>{const n=w?.npcs?.find(x=>x.id==='van-du');return (n?.inventory?.find(i=>i.itemId==='wood')?.count??0)>woodBefore||w?.environment?.drops?.some(d=>d.sourceId===object(w,'tree')?.id&&d.status==='claimed')});
  const treeDrop=world?.environment?.drops?.find(d=>d.sourceId===object(world,'tree')?.id);if(!treeDrop||treeDrop.status!=='claimed')worldErrors.push('Player E or an NPC did not claim the tree drop');
  if(treeDrop?.status==='claimed')await capture('loot-in-inventory.png');await send('Page.reload');await delay(1300);world=await readWorld();if(object(world,'tree')?.status!=='destroyed')worldErrors.push('Felled tree state failed save/load');

  await clickButton('Hạ Thanh Lang, nhặt loot');world=await readWorld();const wolfBefore=world.environment?.drops?.length??0;await strike();
  let wolfGround=false;for(let i=0;i<80;i++){world=await readWorld();const drop=world?.environment?.drops?.find(d=>d.sourceId?.startsWith('devtest:wolf:')&&d.status==='ground');if(drop){wolfGround=true;break}await delay(10)}
  if(wolfGround)await capture('wolf-loot-ground.png');else worldErrors.push('Wolf loot did not remain visible on the ground after death');
  const lootBefore=world?.environment?.drops?.filter(d=>d.sourceId?.startsWith('devtest:wolf:')&&d.status==='ground').length??0;
  await key('d',600);await key('e');
  world=await waitFor(w=>w?.environment?.drops?.some(d=>d.sourceId?.startsWith('devtest:wolf:')&&d.status==='claimed'));
  if(!world?.environment?.drops?.some(d=>d.sourceId?.startsWith('devtest:wolf:')&&d.status==='claimed'))worldErrors.push('No player/NPC claimed wolf loot');
  const wolfDrop=world?.environment?.drops?.find(d=>d.sourceId?.startsWith('devtest:wolf:'));const collector=world?.npcs?.find(n=>n.id===wolfDrop?.claimedBy);if(!collector?.inventory?.some(i=>i.itemId===wolfDrop.itemId&&i.count>0))worldErrors.push('Claimed wolf item is absent from collector inventory');
  if(collector?.id==='van-du')await capture('loot-in-inventory.png');
  const wolfDeathId=world?.environment?.defeatedBeastIds?.find(id=>id.startsWith('devtest:wolf:'));await send('Page.reload');await delay(1300);world=await readWorld();if(!wolfDeathId||!world?.environment?.defeatedBeastIds?.includes(wolfDeathId))worldErrors.push('Wolf death state failed save/load');if((world?.environment?.drops?.filter(d=>d.sourceId===wolfDeathId).length??0)!==lootBefore)worldErrors.push('Wolf loot duplicated after save/load');
  console.log(JSON.stringify({screenshots:fs.readdirSync(out).filter(x=>x.endsWith('.png')).sort(),house:{damaged:object(JSON.parse(await evaluate(`localStorage.getItem('thien-dao-world-devtest-v1')`)),'house')?.status,final:house?.status,beforeRepair,afterRepair},tree:{status:tree?.status,woodDrop:treeDrop?.status},wolf:{death:!!wolfDeathId,loot:lootBefore},errors:worldErrors,consoleErrors:errors},null,2));
  if(worldErrors.length||errors.length)process.exitCode=1;
}finally{
  try{if(ws?.readyState===WebSocket.OPEN){ws.send(JSON.stringify({id:++seq,method:'Browser.close'}));await delay(100)}}catch{}
  try{proc.kill()}catch{}
  try{fs.rmSync(profile,{recursive:true,force:true})}catch{}
}

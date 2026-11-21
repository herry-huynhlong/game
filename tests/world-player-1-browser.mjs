import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { PNG } from 'pngjs';
import gifenc from 'gifenc';
const { GIFEncoder, quantize, applyPalette } = gifenc;

const base = 'http://127.0.0.1:5175/';
const chrome = path.join(process.env.PROGRAMFILES ?? 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe');
const out = path.resolve('art/previews/world-player-1');
fs.mkdirSync(out, { recursive: true });
const makeGif=(name,files)=>{const images=files.map(file=>PNG.sync.read(fs.readFileSync(path.join(out,file))));if(images.length<2)return false;const width=720,height=450,resize=image=>{const data=new Uint8Array(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const sx=Math.floor(x*image.width/width),sy=Math.floor(y*image.height/height),si=(sy*image.width+sx)*4,di=(y*width+x)*4;data[di]=image.data[si];data[di+1]=image.data[si+1];data[di+2]=image.data[si+2];data[di+3]=image.data[si+3]}return data};const rgba=images.map(resize),samples=rgba.filter((_,i)=>i===0||i===Math.floor(rgba.length/2)||i===rgba.length-1),packed=new Uint8Array(samples.reduce((n,x)=>n+x.length,0));let offset=0;for(const frame of samples){packed.set(frame,offset);offset+=frame.length}const palette=quantize(packed,256),gif=GIFEncoder();rgba.forEach((frame,i)=>gif.writeFrame(applyPalette(frame,palette),width,height,{...(i===0?{palette,repeat:0}:{}),delay:220}));gif.finish();fs.writeFileSync(path.join(out,name),gif.bytes());return true};
if (!fs.existsSync(chrome)) throw new Error(`Chrome missing: ${chrome}`);
await fetch(base);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'world-player-1-cdp-'));
const port = await new Promise(resolve => { const server = net.createServer(); server.listen(0, '127.0.0.1', () => { const p = server.address().port; server.close(() => resolve(p)); }); });
const proc = spawn(chrome, [`--user-data-dir=${profile}`, `--remote-debugging-port=${port}`, '--remote-allow-origins=*', '--no-first-run', '--no-default-browser-check', '--headless=new', '--hide-scrollbars', '--window-size=1440,900', '--force-device-scale-factor=1', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', base], { stdio: 'ignore', windowsHide: true });
let ws, seq = 0;
const pending = new Map(), errors = [], failed = [];
try {
  let targets = [];
  for (let i = 0; i < 120; i++) { try { targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json()); if (targets.some(t => t.type === 'page')) break; } catch {} await delay(100); }
  const page = targets.find(t => t.type === 'page'); if (!page) throw Error('Chrome page unavailable');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails?.exception?.description ?? m.params.exceptionDetails?.text); if (m.method === 'Network.loadingFailed' && m.params.errorText !== 'net::ERR_ABORTED') failed.push(m.params.errorText); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(Error(m.error.message)) : p.resolve(m.result); } });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
  await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
  const ev = async expression => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text); return r.result?.value; };
  const phasePerformance=[];const recordPhase=async phase=>{await delay(850);const p=await ev('window.__worldRebuild.getPopulationState()');phasePerformance.push({phase,fps:p.fps,frameAvgMs:p.frameAvgMs,frameP95Ms:p.frameP95Ms,aiCostMs:p.aiCostMs,visible:p.visible,npcCount:p.total});};
  const shot = async name => { const s = await send('Page.captureScreenshot', { format: 'png', fromSurface: true }); fs.writeFileSync(path.join(out, name), Buffer.from(s.data, 'base64')); };
  const focusGame = async()=>{await send('Page.bringToFront');await send('Input.dispatchMouseEvent',{type:'mousePressed',x:100,y:180,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:100,y:180,button:'left',clickCount:1});};
  const key = async (name, code, down) => {const vk=name==='Escape'?27:name.toUpperCase().charCodeAt(0);await send('Input.dispatchKeyEvent',{type:down?'keyDown':'keyUp',key:name,code,windowsVirtualKeyCode:vk,nativeVirtualKeyCode:vk,location:0});if(down&&name.length===1)await send('Input.dispatchKeyEvent',{type:'char',key:name,code,text:name,unmodifiedText:name,windowsVirtualKeyCode:vk,nativeVirtualKeyCode:vk,location:0});};
  const tap = async (name, code, ms = 100) => { await focusGame();await key(name, code, true); await delay(ms); await key(name, code, false); };
  const moveKeys = async (dx, dy, ms = 250) => { await focusGame();const list = []; if (dx < -.25) list.push(['a','KeyA']); if (dx > .25) list.push(['d','KeyD']); if (dy < -.25) list.push(['w','KeyW']); if (dy > .25) list.push(['s','KeyS']); for (const [n,c] of list) await key(n,c,true); await delay(ms); for (const [n,c] of list) await key(n,c,false); };
  let ready = false; for (let i=0;i<200;i++) { try { ready = await ev('window.__worldRebuild?.ready()'); } catch {} if (ready) break; await delay(100); }
  if (!ready) throw Error('WorldScene did not become ready'); await delay(1400);
  const initial = await ev(`(()=>{const w=JSON.parse(localStorage.getItem('world-rebuild-1c-v1'));return{npcs:w.npcs.map(n=>({id:n.id,name:n.name,role:n.populationRole,realmIndex:n.realmIndex,hp:n.hp,x:n.x,y:n.y,alive:n.alive})),heaven:w.heaven,fauna:w.environment.fauna.map(f=>({id:f.id,species:f.species,hp:f.hp,x:f.x,y:f.y,alive:f.alive}))}})()`);
  if (initial.npcs.length !== 108 || initial.fauna.length !== 28) throw Error('Initial roster mismatch');
  await recordPhase('observer');
  const costs=[5,10,20,35,50];
  const choices=initial.npcs.filter(n=>n.alive&&n.role==='hunter'&&costs[Math.max(0,Math.min(4,n.realmIndex))]<=initial.heaven.divinePower);
  const deer=initial.fauna.filter(f=>f.alive&&f.species==='deer');
  let pair=null; for(const npc of choices)for(const f of deer){const d=Math.hypot(npc.x-f.x,npc.y-f.y);if(!pair||d<pair.distance)pair={npc,fauna:f,distance:d};}
  if(!pair)throw Error(`No eligible hunter/deer nearby (${choices.length} hunters, power ${initial.heaven.divinePower})`);
  await ev("document.querySelector('[data-region=forest]')?.click()"); await delay(350);
  await ev(`(()=>{const s=document.querySelector('#possess-select');s.value=${JSON.stringify(pair.npc.id)};s.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('#possess-start').click();return window.__worldRebuild.getPossessionState()})()`);
  await delay(700);
  let possession=await ev('window.__worldRebuild.getPossessionState()');
  if(!possession.active||possession.npcId!==pair.npc.id)throw Error('Possession did not start from UI button');
  await shot('01-possessed-hunter.png');
  await ev(`(()=>{const s=document.querySelector('#possess-fauna');s.value=${JSON.stringify(pair.fauna.id)};s.dispatchEvent(new Event('change',{bubbles:true}));return s.value})()`);
  let selectedTarget=await ev('window.__worldRebuild.getPossessionState()');
  if(selectedTarget.targetFaunaId!==pair.fauna.id)throw Error('Could not select deer through in-game target selector');
  await shot('02-deer-targeted.png');
  await recordPhase('possessed');
  const huntFrames=[]; let dead=false;
  for(let i=0;i<160;i++){
    const state=await ev(`(()=>{const n=window.__worldRebuild.getPossessionState(),f=window.__worldRebuild.getFaunaState().records.find(x=>x.id===${JSON.stringify(pair.fauna.id)});return{n:{x:n.x,y:n.y,hp:n.hp,items:n.inventory},f:{x:f.x,y:f.y,hp:f.hp,alive:f.alive},drop:window.__worldRebuild.getFaunaState().drops.find(d=>d.sourceId===f.id&&d.status==='ground')}})()`);
    if(i%2===0){await shot(`hunt-${String(i/2).padStart(2,'0')}.png`);huntFrames.push({i,n:state.n,f:state.f});}
    if(!state.f.alive){dead=true;break;}
    const dx=state.f.x-state.n.x,dy=state.f.y-state.n.y,d=Math.hypot(dx,dy);
    if(d<=45){await tap('j','KeyJ',90);await delay(460);}else await moveKeys(dx/d,dy/d,230);
  }
  if(!dead)throw Error('Deer was not defeated using direct J input within 160 movement/attack cycles');
  await shot('03-deer-defeated-drop.png');
  await recordPhase('direct-hunt-combat');
  let loot=await ev(`(()=>{const n=window.__worldRebuild.getPossessionState(),d=window.__worldRebuild.getFaunaState().drops.find(x=>x.sourceId===${JSON.stringify(pair.fauna.id)});return{n:{x:n.x,y:n.y,items:n.inventory},drop:d}})()`);
  for(let i=0;i<35&&loot.drop?.status==='ground';i++){
    if(i%3===0)await shot(`loot-${String(i/3).padStart(2,'0')}.png`);
    const dx=loot.drop.x-loot.n.x,dy=loot.drop.y-loot.n.y,d=Math.hypot(dx,dy);
    if(d<=25){await tap('e','KeyE');await delay(220);loot=await ev(`(()=>{const n=window.__worldRebuild.getPossessionState(),d=window.__worldRebuild.getFaunaState().drops.find(x=>x.sourceId===${JSON.stringify(pair.fauna.id)});return{n:{x:n.x,y:n.y,items:n.inventory},drop:d}})()`);break;}
    await moveKeys(dx/d,dy/d,230);loot=await ev(`(()=>{const n=window.__worldRebuild.getPossessionState(),d=window.__worldRebuild.getFaunaState().drops.find(x=>x.sourceId===${JSON.stringify(pair.fauna.id)});return{n:{x:n.x,y:n.y,items:n.inventory},drop:d}})()`);
  }
  if(loot.drop?.status!=='claimed'||!loot.n.items.some(i=>i.itemId==='deer_meat'&&i.count>0))throw Error(`Real pickup failed: ${JSON.stringify(loot)}`);
  await shot('04-inventory-deer-meat.png');
  await recordPhase('inventory-after-loot');
  const liveFauna=await ev(`window.__worldRebuild.getFaunaState().records.filter(f=>f.alive&&(f.species==='snake'||f.species==='scorpion'))`);const predator=liveFauna.sort((a,b)=>Math.hypot(loot.n.x-a.x,loot.n.y-a.y)-Math.hypot(loot.n.x-b.x,loot.n.y-b.y))[0];
  const predatorStart=await ev(`(()=>{const w=JSON.parse(localStorage.getItem('world-rebuild-1c-v1')),n=w.npcs.find(x=>x.id===${JSON.stringify(pair.npc.id)}),f=w.environment.fauna.find(x=>x.id===${JSON.stringify(predator?.id??'')});return{n:{x:n.x,y:n.y,hp:n.hp},f:f&&{x:f.x,y:f.y,species:f.species,alive:f.alive}}})()`);
  if(!predatorStart?.n)throw Error(`Could not read possessed NPC save before predator test: ${JSON.stringify({npcId:pair.npc.id,predator:predator?.id})}`);
  if(!predator)throw Error('No living snake/scorpion remained for predator damage test');
  if(predatorStart.f){await ev(`(()=>{const s=document.querySelector('#possess-fauna');s.value=${JSON.stringify(predator.id)};s.dispatchEvent(new Event('change',{bubbles:true}));return s.value})()`);
    let damageSeen=false;for(let i=0;i<100;i++){if(i%8===0)await shot(`predator-${String(i/8).padStart(2,'0')}.png`);const s=await ev('window.__worldRebuild.getPossessionState()');if(s.hp<predatorStart.n.hp){damageSeen=true;await shot('05-predator-damage.png');break}const f=await ev(`(()=>{const f=window.__worldRebuild.getFaunaState().records.find(x=>x.id===${JSON.stringify(predator.id)});return{x:f.x,y:f.y,alive:f.alive}})()`);if(!f.alive)break;const dx=f.x-s.x,dy=f.y-s.y,d=Math.hypot(dx,dy);if(d>24)await moveKeys(dx/d,dy/d,230);else await delay(400);}
    if(!damageSeen)throw Error(`${predator.species} did not damage possessed NPC during direct proximity test`);await recordPhase('predator-combat');
  }
  const beforeReload=await ev(`(()=>{const w=JSON.parse(localStorage.getItem('world-rebuild-1c-v1'));return{npcs:w.npcs.length,active:w.npcs.filter(x=>x.alive).length,npc:w.npcs.find(x=>x.id===${JSON.stringify(pair.npc.id)}),heaven:w.heaven,fauna:w.environment.fauna.length,drop:w.environment.drops.find(d=>d.sourceId===${JSON.stringify(pair.fauna.id)})}})()`);
  await send('Page.reload');await delay(1800);if(!await ev('window.__worldRebuild?.ready()'))throw Error('World did not reload');
  const afterReload=await ev(`(()=>{const w=JSON.parse(localStorage.getItem('world-rebuild-1c-v1'));return{npcs:w.npcs.length,active:w.npcs.filter(x=>x.alive).length,npc:w.npcs.find(x=>x.id===${JSON.stringify(pair.npc.id)}),heaven:w.heaven,fauna:w.environment.fauna.length,drop:w.environment.drops.find(d=>d.sourceId===${JSON.stringify(pair.fauna.id)})}})()`);
  if(afterReload.npcs!==108||afterReload.fauna<28||afterReload.heaven.possession?.npcId!==pair.npc.id||afterReload.drop.status!=='claimed'||!afterReload.npc.inventory.some(i=>i.itemId==='deer_meat'))throw Error('Save/reload state is not stable');
  await shot('06-save-reloaded.png');
  await recordPhase('save-reload-possession');
  await tap('Escape','Escape');
  const released=await ev(`(()=>{const w=JSON.parse(localStorage.getItem('world-rebuild-1c-v1')),n=w.npcs.find(x=>x.id===${JSON.stringify(pair.npc.id)});return{npcs:w.npcs.length,possession:w.heaven.possession,npc:{x:n.x,y:n.y,hp:n.hp,alive:n.alive,goal:n.goalAction}}})()`);
  await shot('07-released-ai.png');
  await delay(2600);const aiAfter=await ev(`(()=>{const w=JSON.parse(localStorage.getItem('world-rebuild-1c-v1')),n=w.npcs.find(x=>x.id===${JSON.stringify(pair.npc.id)});return{x:n.x,y:n.y,goal:n.goalAction,alive:n.alive}})()`);
  await shot('08-released-ai-resumed.png');
  const cityPair=await ev(`(()=>{const w=JSON.parse(localStorage.getItem('world-rebuild-1c-v1')),inside=n=>n.x>=2048&&n.x<=4864&&n.y>=1248&&n.y<=3072,cost=n=>[5,10,20,35,50][Math.max(0,Math.min(4,n.realmIndex))],a=w.npcs.filter(n=>n.alive&&inside(n)&&cost(n)<=w.heaven.divinePower);let best=null;for(const x of a)for(const y of w.npcs){if(!y.alive||y.id===x.id||y.populationRole==='city_guard'||!inside(y))continue;const d=Math.hypot(x.x-y.x,x.y-y.y);if(d<=32&&(!best||d<best.distance))best={actor:{id:x.id,name:x.name,role:x.populationRole,realmIndex:x.realmIndex},victim:{id:y.id,name:y.name,role:y.populationRole},distance:d}}return best})()`);
  let cityLaw=null;if(cityPair){await ev(`(()=>{const s=document.querySelector('#possess-select');s.value=${JSON.stringify(cityPair.actor.id)};s.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('#possess-start').click();window.__worldRebuild.selectNPC(${JSON.stringify(cityPair.victim.id)});return true})()`);await shot('09-city-law-before.png');await send('Page.bringToFront');await key('j','KeyJ',true);await delay(90);await key('j','KeyJ',false);await delay(300);cityLaw=await ev(`(()=>{const w=JSON.parse(localStorage.getItem('world-rebuild-1c-v1'));return{incidents:w.cityLaw?.incidents?.filter(i=>i.attackerId===${JSON.stringify(cityPair.actor.id)}&&i.victimId===${JSON.stringify(cityPair.victim.id)}),events:w.events.filter(e=>e.type==='city-crime-reported'&&e.actorId===${JSON.stringify(cityPair.actor.id)}),guards:w.npcs.filter(n=>n.lawResponse?.targetId===${JSON.stringify(cityPair.actor.id)}).map(n=>({id:n.id,role:n.populationRole,status:n.lawResponse.status}))}})()`);await shot('10-city-law-actual-attack.png');if(!cityLaw.incidents?.length||!cityLaw.guards.length)throw Error(`City law did not respond to actual J attack: ${JSON.stringify({cityPair,cityLaw})}`)}
  const performance=[];for(let i=0;i<5;i++){performance.push(await ev('window.__worldRebuild.getPopulationState()'));await delay(1000)}
  const result={url:base,actor:{id:pair.npc.id,name:pair.npc.name,role:pair.npc.role,realmIndex:pair.npc.realmIndex},deer:{id:pair.fauna.id,startDistance:pair.distance,defeated:dead,drop:loot.drop,inventory:loot.n.items,huntFrames},predator:{id:predator?.id,species:predator?.species,hpBefore:predatorStart.n.hp,hpAfter:beforeReload.npc.hp,damaged:beforeReload.npc.hp<predatorStart.n.hp},saveReload:{before:{npcs:beforeReload.npcs,fauna:beforeReload.fauna,possessed:beforeReload.heaven.possession?.npcId,drop:beforeReload.drop?.status,hp:beforeReload.npc.hp,inventory:beforeReload.npc.inventory},after:{npcs:afterReload.npcs,fauna:afterReload.fauna,possessed:afterReload.heaven.possession?.npcId,drop:afterReload.drop?.status,hp:afterReload.npc.hp,inventory:afterReload.npc.inventory}},release:{state:released,afterAiDelay:aiAfter},cityLaw:{pair:cityPair,report:cityLaw},phasePerformance,performance:performance.map(p=>({fps:p.fps,frameAvgMs:p.frameAvgMs,frameP95Ms:p.frameP95Ms,aiCostMs:p.aiCostMs,cityLawCostAvgMs:p.cityLawCostAvgMs,visible:p.visible})),errors,failed};
  fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(result,null,2));
  const list=prefix=>fs.readdirSync(out).filter(file=>new RegExp(`^${prefix}-\\d+\\.png$`).test(file)).sort();makeGif('01-possession.gif',['01-possessed-hunter.png','02-deer-targeted.png','hunt-00.png']);makeGif('02-direct-deer-hunt.gif',list('hunt'));makeGif('03-direct-loot-pickup.gif',[...list('loot'),'04-inventory-deer-meat.png']);makeGif('04-predator-damage.gif',[...list('predator'),'05-predator-damage.png']);makeGif('05-release-ai.gif',['07-released-ai.png','08-released-ai-resumed.png']);if(cityPair)makeGif('06-city-law-attack.gif',['09-city-law-before.png','10-city-law-actual-attack.png']);
  const releaseDrift=Math.hypot(released.npc.x-afterReload.npc.x,released.npc.y-afterReload.npc.y);if(released.possession!==null||released.npcs!==108||releaseDrift>45||errors.length||failed.length)throw Error(`Release/reload/browser errors: ${JSON.stringify({released,releaseDrift,errors,failed})}`);
  console.log(JSON.stringify({actor:result.actor,deer:result.deer,predator:result.predator,saveReload:result.saveReload,release:result.release,performance:result.performance,errors,failed},null,2));
}catch(error){console.error(error.stack||error);process.exitCode=1;}finally{try{if(ws?.readyState===WebSocket.OPEN){ws.send(JSON.stringify({id:++seq,method:'Browser.close'}));await delay(100);}}catch{}try{proc.kill();}catch{}try{fs.rmSync(profile,{recursive:true,force:true});}catch{}}

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';

const base='http://127.0.0.1:5175/';
const chrome=path.join(process.env.PROGRAMFILES??'C:\\Program Files','Google','Chrome','Application','chrome.exe');
if(!fs.existsSync(chrome))throw Error(`Chrome not found: ${chrome}`);
await fetch(base);
  const out=path.resolve('art/previews/world-city-1');fs.mkdirSync(out,{recursive:true});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'world-gates-4dir-cdp-'));
const port=await new Promise(resolve=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p))})});
const proc=spawn(chrome,[`--user-data-dir=${profile}`,`--remote-debugging-port=${port}`,'--remote-allow-origins=*','--no-first-run','--no-default-browser-check','--headless=new','--hide-scrollbars','--window-size=1440,900','--force-device-scale-factor=1','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--use-angle=swiftshader',base],{stdio:'ignore',windowsHide:true});
let ws,seq=0;const pending=new Map(),errors=[],failedRequests=[],requestUrls=new Map();
try{
  let targets=[];for(let i=0;i<120;i++){try{targets=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());if(targets.some(t=>t.type==='page'))break}catch{}await delay(100)}
  const page=targets.find(t=>t.type==='page');if(!page)throw Error('Chrome page unavailable');
  ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
  ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails?.exception?.description??m.params.exceptionDetails?.text??'exception');if(m.method==='Network.requestWillBeSent')requestUrls.set(m.params.requestId,m.params.request.url);if(m.method==='Network.loadingFailed'&&m.params.errorText!=='net::ERR_ABORTED')failedRequests.push({url:requestUrls.get(m.params.requestId)??m.params.requestId,error:m.params.errorText});if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result)}});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
  const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result?.value};
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:base});
  const ready=async()=>{for(let i=0;i<250;i++){try{if(await ev('!!window.__worldRebuild?.ready()'))return}catch{}await delay(100)}throw Error('WorldScene failed readiness')};await ready();
  await ev(`(()=>{localStorage.removeItem('thanh-van-legacy-world-archive-v1');localStorage.setItem('thanh-van-ky-save-v1',JSON.stringify({npcs:[{id:'old-citizen'}]}));localStorage.setItem('thien-dao-world-v1',JSON.stringify({map:'QingyunWorldGFX5B5',npcs:[{id:'van-du'}]}));localStorage.setItem('thien-dao-world-devtest-v1',JSON.stringify({npcs:[{id:'qingyun-01'}]}));})()`);
  await send('Page.reload');await delay(500);await ready();
  const initial=await ev(`(()=>({state:window.__worldRebuild.getState(),archive:JSON.parse(localStorage.getItem('thanh-van-legacy-world-archive-v1')||'null'),legacy:['thanh-van-ky-save-v1','thien-dao-world-v1','thien-dao-world-devtest-v1'].map(k=>localStorage.getItem(k)),canvas:document.querySelectorAll('canvas').length,resourceUrls:performance.getEntriesByType('resource').map(r=>r.name)}))()`);
  const capture=async(marker,file,zoom=1.05)=>{await ev(`window.__worldRebuild.gotoMarker(${JSON.stringify(marker)},${zoom})`);await delay(220);const shot=await send('Page.captureScreenshot',{format:'png',fromSurface:true});fs.writeFileSync(path.join(out,file),Buffer.from(shot.data,'base64'))};
  await capture('city-center','city-center-overview.png',.68);
  for(const [marker,file] of [['city-hall-entrance','city-lord-hall.png'],['quest-office','commission-hall.png'],['inn-entrance','inn.png'],['tavern-entrance','tavern.png'],['market-stall-04','market-court.png']])await capture(marker,file,.92);
  const gateMarkers=[['gate-north','gate-north-worldscene.png'],['gate-south','gate-south-worldscene.png'],['gate-east','gate-east-worldscene.png'],['gate-west','gate-west-worldscene.png']];
  for(const [marker,file] of gateMarkers)await capture(marker,file);
  await ev("window.__worldRebuild.gotoRegion('city')");await ev("document.getElementById('world-overview').click()");await delay(250);{const s=await send('Page.captureScreenshot',{format:'png',fromSurface:true});fs.writeFileSync(path.join(out,'four-gates-city-overview.png'),Buffer.from(s.data,'base64'))}
  await ev("window.__worldRebuild.gotoMarker('gate-east',.72)");await ev("window.__worldRebuild.setCollisionVisible(true)");await delay(180);const debugShot=await send('Page.captureScreenshot',{format:'png',fromSurface:true});fs.writeFileSync(path.join(out,'gate-collision-debug.png'),Buffer.from(debugShot.data,'base64'));await ev("window.__worldRebuild.setCollisionVisible(false)");
  const directions=[['north','gate-north','gate-north-outside'],['south','gate-south','gate-south-outside'],['east','gate-east','gate-east-outside'],['west','gate-west','gate-west-outside']];
  const connectivity={};for(const[direction,inside,outside]of directions){connectivity[direction]={out:await ev(`window.__worldRebuild.canNavigate(${JSON.stringify(inside)},${JSON.stringify(outside)})`),in:await ev(`window.__worldRebuild.canNavigate(${JSON.stringify(outside)},${JSON.stringify(inside)})`),outPath:(await ev(`window.__worldRebuild.findNavigationPath(${JSON.stringify(inside)},${JSON.stringify(outside)})`))?.length??0,inPath:(await ev(`window.__worldRebuild.findNavigationPath(${JSON.stringify(outside)},${JSON.stringify(inside)})`))?.length??0}}
  const cityRoutes={};for(const marker of ['city-hall-entrance','quest-office','inn-entrance','tavern-entrance',...Array.from({length:7},(_,i)=>`market-stall-${String(i+1).padStart(2,'0')}`)])cityRoutes[marker]=await ev(`window.__worldRebuild.canNavigate('city-center',${JSON.stringify(marker)})`);
  const widerRoutes={northPass:await ev("window.__worldRebuild.canNavigate('gate-north-outside','north-pass')"),eastBridge:await ev("window.__worldRebuild.canNavigate('gate-east-outside','east-bridge')"),eastPasture:await ev("window.__worldRebuild.canNavigate('east-bridge','east-pasture')"),southSect:await ev("window.__worldRebuild.canNavigate('gate-south-outside','sect-yard')"),westDeep:await ev("window.__worldRebuild.canNavigate('gate-west-outside','forest-deep')")};
  await ev("window.__worldRebuild.gotoRegion('city')");
  await ev(`(()=>{const canvas=document.querySelector('canvas'),stream=canvas.captureStream(0),track=stream.getVideoTracks()[0],timer=setInterval(()=>track.requestFrame(),40),recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9'}),chunks=[];recorder.ondataavailable=e=>e.data.size&&chunks.push(e.data);window.__gateVideo={stream,track,timer,recorder,chunks};recorder.start();return true})()`);
  const actorRuns=[];
  for(const[direction,inside,outside]of directions){
    for(const[from,to]of [['city-center',inside],[inside,outside],[outside,inside],[inside,'city-center']])actorRuns.push(await ev(`window.__worldRebuild.walkDebugPath(${JSON.stringify(from)},${JSON.stringify(to)})`));
  }
  const video64=await ev(`new Promise(resolve=>{const v=window.__gateVideo;v.recorder.onstop=()=>{clearInterval(v.timer);v.stream.getTracks().forEach(t=>t.stop());const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.readAsDataURL(new Blob(v.chunks,{type:'video/webm'}))};v.recorder.stop()})`);
  fs.writeFileSync(path.join(out,'debug-actor-four-gates.webm'),Buffer.from(video64,'base64'));
  await send('Page.reload');await delay(500);await ready();const final=await ev(`(()=>({state:window.__worldRebuild.getState(),archive:JSON.parse(localStorage.getItem('thanh-van-legacy-world-archive-v1')||'null'),legacy:['thanh-van-ky-save-v1','thien-dao-world-v1','thien-dao-world-devtest-v1'].map(k=>localStorage.getItem(k)),canvas:document.querySelectorAll('canvas').length}))()`);
  const oldAssets=initial.resourceUrls.filter(u=>/QingyunWorldGFX5B5|qingyun_terrain\.png|world_props\.png|van_du\.png|characters\/(?:civilian|sect_cultivator)\.png/i.test(u));
  const result={url:base,map:initial.state.mapUrl,initial,final,cityRoutes,gateConnectivity:connectivity,widerRoutes,actorRuns,actorVideoBytes:Buffer.byteLength(video64,'base64'),gateDirections:initial.state.directionalGateSprites.map(s=>({name:s.name,frame:s.frame,rotation:s.rotation})),legacyAssetRequests:oldAssets,browserErrors:errors,failedRequests,reloadStable:JSON.stringify(initial.archive)===JSON.stringify(final.archive)&&JSON.stringify(initial.legacy)===JSON.stringify(final.legacy)};
  fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify({gateConnectivity:result.gateConnectivity,widerRoutes,actorRuns,actorVideoBytes:result.actorVideoBytes,gateDirections:result.gateDirections,errors,failedRequests,reloadStable:result.reloadStable}));
  if(initial.canvas!==1||initial.state.widthTiles!==224||initial.state.heightTiles!==144||initial.state.npcCount!==0||initial.state.activeMonsterSpawns!==0||initial.state.objectCount!==247||initial.state.collisionCount!==533||result.gateDirections.length!==4||result.gateDirections.some(g=>g.rotation!==0)||Object.values(connectivity).some(g=>!g.in||!g.out||!g.inPath||!g.outPath)||Object.values(cityRoutes).some(v=>!v)||Object.values(widerRoutes).some(v=>!v)||actorRuns.some(r=>!r.reached)||result.actorVideoBytes<1000||!result.reloadStable||oldAssets.length||errors.length||failedRequests.length)process.exitCode=1;
}catch(e){console.error(e.stack||e);process.exitCode=1}finally{try{if(ws?.readyState===WebSocket.OPEN){ws.send(JSON.stringify({id:++seq,method:'Browser.close'}));await delay(100)}}catch{}try{proc.kill()}catch{}try{fs.rmSync(profile,{recursive:true,force:true})}catch{}}

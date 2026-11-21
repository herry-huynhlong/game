import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const base = process.env.BENCH_URL ?? 'http://127.0.0.1:5175/?paperDoll=1';
const width = Number(process.env.BENCH_WIDTH ?? 1320);
const height = Number(process.env.BENCH_HEIGHT ?? 1050);
const chrome = path.join(process.env.PROGRAMFILES ?? 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe');
if (!fs.existsSync(chrome)) throw new Error(`Chrome not found: ${chrome}`);
await fetch(base);
const outDir = path.resolve('art/previews/performance');
fs.mkdirSync(outDir, { recursive: true });
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'qingyun-perf-cdp-'));
const port = await new Promise((resolve) => {
  const server = net.createServer();
  server.listen(0, '127.0.0.1', () => { const value = server.address().port; server.close(() => resolve(value)); });
});
const chromeArgs = [
  `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`, '--remote-allow-origins=*',
  '--no-first-run', '--no-default-browser-check', '--headless=new', '--hide-scrollbars',
  `--window-size=${width},${height}`, '--force-device-scale-factor=1',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
];
if (process.env.BENCH_SWIFTSHADER !== '0') chromeArgs.push('--use-angle=swiftshader');
chromeArgs.push(base);
const proc = spawn(chrome, chromeArgs, { stdio: 'ignore', windowsHide: true });
let ws;
let sequence = 0;
const pending = new Map();
try {
  let targets = [];
  for (let i = 0; i < 120; i++) {
    try { targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json()); if (targets.some((target) => target.type === 'page')) break; } catch {}
    await delay(100);
  }
  const page = targets.find((target) => target.type === 'page');
  if (!page) throw new Error('Chrome debugging page did not start.');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const task = pending.get(message.id); pending.delete(message.id);
    message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async (expression) => {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
    return response.result?.value;
  };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: base });
  let ready = false;
  for (let i = 0; i < 300; i++) {
    try { ready = Boolean(await evaluate('window.__worldRebuild?.ready()')) && (await evaluate('window.__worldRebuild?.getState()?.npcCount')) === 108; } catch {}
    if (ready) break;
    await delay(100);
  }
  if (!ready) throw new Error('WorldScene did not initialize 108 NPCs.');
  await evaluate("window.__worldRebuild.gotoMarker('city-center', .95)");
  // Fill the scene's rolling 180-frame window before sampling so startup frames don't skew the baseline.
  await delay(16000);
  const samples = [];
  for (let i = 0; i < 5; i++) {
    samples.push(await evaluate(`(()=>{const p=window.__worldRebuild.getPopulationState();return{fps:p.fps,frameAvgMs:p.frameAvgMs,frameP95Ms:p.frameP95Ms,visible:p.visible,inCamera:p.inCamera,total:p.total,aiCostMs:p.aiCostMs}})()`));
    await delay(1500);
  }
  const result = { url: base, width, height, zoom: 0.95, browser: `Chrome headless, ${process.env.BENCH_SWIFTSHADER === '0' ? 'default GPU selection' : 'SwiftShader'}, DPR 1`, samples };
  const output = path.join(outDir, `world-perf-${Date.now()}.json`);
  fs.writeFileSync(output, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ output, ...result }, null, 2));
} finally {
  try { if (ws?.readyState === WebSocket.OPEN) { ws.send(JSON.stringify({ id: ++sequence, method: 'Browser.close' })); await delay(100); } } catch {}
  try { proc.kill(); } catch {}
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
}

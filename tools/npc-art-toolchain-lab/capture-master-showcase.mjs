import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const allCases = [
  ['city', 1, 'phaser-city-1x.png', 19991],
  ['sect', 2, 'phaser-sect-2x.png', 19992],
  ['city', 4, 'phaser-city-4x.png', 19993],
];
const cases = process.env.C03_SHOT ? allCases.filter(item => item[2] === process.env.C03_SHOT) : allCases;
if (!cases.length) throw new Error(`Unknown C03_SHOT: ${process.env.C03_SHOT}`);
const output = resolve('tools/npc-art-toolchain-lab/output/c03-master-v6');
await mkdir(output, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

for (const [site, zoom, name, port] of cases) {
  const profile = resolve(process.env.TEMP || '.', `codex-c03-cdp-${port}`);
  const url = `http://127.0.0.1:5176/tools/npc-art-toolchain-lab/showcase-master.html?site=${site}&zoom=${zoom}`;
  const child = spawn(chrome, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--disable-extensions', '--remote-allow-origins=*', `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`, '--window-size=1536,1024', url,
  ], { stdio: 'ignore', windowsHide: true });
  try {
    let version;
    for (let i = 0; i < 40; i++) {
      try { version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); break; }
      catch { await sleep(250); }
    }
    if (!version) throw new Error(`Chrome CDP did not start for ${site}/${zoom}x`);
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const target = targets.find(x => x.type === 'page');
    if (!target) throw new Error(`No Chrome page target for ${site}/${zoom}x`);
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let id = 0;
    const pending = new Map();
    ws.onmessage = event => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.exceptionThrown') console.error('PAGE_EXCEPTION', msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception?.description || '');
      if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') console.error('PAGE_LOG', msg.params.entry.text);
      if (msg.method === 'Network.loadingFailed') console.error('REQUEST_FAILED', msg.params.errorText, msg.params.requestId);
      if (msg.method === 'Network.responseReceived' && msg.params.response.status >= 400) console.error('HTTP_ERROR', msg.params.response.status, msg.params.response.url);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      }
    };
    const call = (method, params={}) => new Promise((resolve, reject) => {
      const requestId = ++id; pending.set(requestId, { resolve, reject });
      ws.send(JSON.stringify({ id: requestId, method, params }));
      setTimeout(() => { if (pending.has(requestId)) { pending.delete(requestId); reject(new Error(`${method} timed out`)); } }, 15000);
    });
    await call('Emulation.setDeviceMetricsOverride', { width: 1536, height: 1024, deviceScaleFactor: 1, mobile: false });
    await call('Log.enable');
    await call('Network.enable');
    await call('Page.enable');
    await call('Runtime.enable');
    await call('Page.navigate', { url });
    await sleep(18000);
    const status = await call('Runtime.evaluate', { expression: "JSON.stringify({status:document.querySelector('#status')?.textContent,canvas:document.querySelectorAll('canvas').length,body:document.body.innerText,resources:performance.getEntriesByType('resource').map(x=>x.name).slice(-12)})", returnByValue: true });
    const result = await call('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true });
    await writeFile(resolve(output, name), Buffer.from(result.data, 'base64'));
    await writeFile(resolve(output, name.replace('.png', '.status.txt')), `${url}\n${status.result.value}\n`);
    ws.close();
    console.log(`${name}: ${status.result.value}`);
  } finally {
    child.kill();
  }
}

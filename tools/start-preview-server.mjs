import {spawn} from 'node:child_process';
import {openSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
const cwd=process.cwd(),logPath=path.join(tmpdir(),'qingyun-vite-preview.log'),log=openSync(logPath,'a');
const child=spawn(process.execPath,['./node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','5175'],{cwd,detached:true,windowsHide:true,stdio:['ignore',log,log],env:process.env});child.unref();
console.log(JSON.stringify({pid:child.pid,logPath,url:'http://127.0.0.1:5175/'}));

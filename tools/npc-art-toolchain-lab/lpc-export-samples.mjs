import fs from 'node:fs';
import path from 'node:path';
import { Client } from './repos/lpc-mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import { StdioClientTransport } from './repos/lpc-mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js';
const lab=path.resolve('tools/npc-art-toolchain-lab'),repo=path.join(lab,'repos/lpc-mcp'),assets=path.join(lab,'repos/universal-lpc'),out=path.join(lab,'output/lpc');
fs.mkdirSync(out,{recursive:true});const samples=JSON.parse(fs.readFileSync(path.join(lab,'specs/lpc-samples.json'),'utf8'));
const transport=new StdioClientTransport({command:process.execPath,args:[path.join(repo,'src/index.js')],stderr:'pipe',env:{LPC_ASSETS_DIR:assets}});transport.stderr?.on('data',c=>process.stderr.write(c));
const client=new Client({name:'tvt-lpc-sample-export',version:'1.0.0'});const log=[];
try{
 await client.connect(transport);
 for(const s of samples){
  const base={bodyType:s.bodyType,selections:s.selections,colors:s.colors,include_credits:true,include_character_json:true};
  const calls=[
   ['generate_spritesheet',{...base,output_path:path.join(out,s.id,`${s.id}-sheet.png`)}],
   ['export_character',{...base,output_dir:path.join(out,s.id,'phaser-export'),mode:'animation',atlas_format:'texturepacker'}],
   ['get_animation',{...base,animation:'idle',output_path:path.join(out,s.id,`${s.id}-idle-4dir.png`)}],
   ['get_animation',{...base,animation:'walk',output_path:path.join(out,s.id,`${s.id}-walk-4dir.png`)}],
   ['get_preview',{...base,animation:'walk',direction:'down',scale:3,format:'gif',fps:10,output_path:path.join(out,s.id,`${s.id}-walk-down.gif`)}],
  ];
  for(const [name,args] of calls){
   const started=Date.now();const result=await client.callTool({name,arguments:args});
   const text=result.content?.find(c=>c.type==='text')?.text||'';let payload;try{payload=JSON.parse(text)}catch{payload={text}}
   log.push({sample:s.id,tool:name,ms:Date.now()-started,isError:result.isError??false,payload});
   console.log(`${s.id} ${name} ${Date.now()-started} ms ${result.isError?'ERROR':'ok'}`);
   if(result.isError)console.log(text.slice(0,600));
  }
 }
 fs.writeFileSync(path.join(out,'mcp-run-log.json'),JSON.stringify(log,null,2));
}finally{await client.close()}

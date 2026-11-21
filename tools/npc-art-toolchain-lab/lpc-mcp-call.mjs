import path from 'node:path';
import { Client } from './repos/lpc-mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import { StdioClientTransport } from './repos/lpc-mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js';

const repo=path.resolve('tools/npc-art-toolchain-lab/repos/lpc-mcp');
const assets=path.resolve('tools/npc-art-toolchain-lab/repos/universal-lpc');
const transport=new StdioClientTransport({command:process.execPath,args:[path.join(repo,'src/index.js')],stderr:'pipe',env:{LPC_ASSETS_DIR:assets}});
transport.stderr?.on('data',chunk=>process.stderr.write(chunk));
const client=new Client({name:'tvt-lpc-art-lab',version:'1.0.0'});
try{
 await client.connect(transport);
 const [,,tool,...rest]=process.argv;
 if(!tool||tool==='--tools')console.log(JSON.stringify(await client.listTools(),null,2));
 else{
  const args=rest.length?JSON.parse(rest.join(' ')):{};
  const result=await client.callTool({name:tool,arguments:args});
  for(const block of result.content??[])if(block.type==='text')console.log(block.text);else if(block.type==='image')console.log(`[image:${block.mimeType}:${block.data.length} base64 chars]`);
  if(result.isError)process.exitCode=1;
 }
}finally{await client.close()}


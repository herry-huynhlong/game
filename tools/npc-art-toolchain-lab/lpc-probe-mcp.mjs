import fs from 'node:fs';
import path from 'node:path';
import { Client } from './repos/lpc-mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import { StdioClientTransport } from './repos/lpc-mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js';
const lab=path.resolve('tools/npc-art-toolchain-lab'),repo=path.join(lab,'repos/lpc-mcp'),assets=path.join(lab,'repos/universal-lpc');
const transport=new StdioClientTransport({command:process.execPath,args:[path.join(repo,'src/index.js')],stderr:'pipe',env:{LPC_ASSETS_DIR:assets}});transport.stderr?.on('data',c=>process.stderr.write(c));
const client=new Client({name:'tvt-lpc-probe',version:'1.0.0'});
try{
 await client.connect(transport);
 const categories=['head','expression','hair','clothes','armour','legs','shoes','weapon','hat','belt','body'];
 const result={toolList:(await client.listTools()).tools.map(t=>({name:t.name,schema:t.inputSchema})),categories:{}};
 for(const category of categories){
  const r=await client.callTool({name:'list_items',arguments:{category,limit:250}});
  if(r.isError)result.categories[category]={error:r.content?.map(c=>c.text).join('\n')};
  else result.categories[category]=JSON.parse(r.content.find(c=>c.type==='text').text);
 }
 result.searches={};for(const [category,search] of [['head','human male'],['head','human female'],['clothes','robe'],['weapon','sword'],['hat','hairpin'],['hair','ponytail']]){const r=await client.callTool({name:'list_items',arguments:{category,search,limit:30}});result.searches[category+' / '+search]=r.isError?{error:r.content?.[0]?.text}:JSON.parse(r.content.find(c=>c.type==='text').text)};
 const anim=await client.callTool({name:'list_animations',arguments:{}});
 if(!anim.isError)result.animations=JSON.parse(anim.content.find(c=>c.type==='text').text);
 fs.writeFileSync(path.join(lab,'lpc-probe-data.json'),JSON.stringify(result,null,2));
 console.log(`Saved catalog probe: ${categories.join(', ')}`);
}finally{await client.close()}



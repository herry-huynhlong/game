import assert from 'node:assert/strict';
import { build } from 'esbuild';
const bundle=await build({entryPoints:['src/dao/ConfirmAction.ts'],bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const {confirmAction,confirmationOpen}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
class Element extends EventTarget{
  constructor(tag){super();this.tag=tag;this.children=[];this.open=false;this.removed=false;this.textContent=''}
  setAttribute(){} append(...items){this.children.push(...items)} showModal(){this.open=true} close(){this.open=false} remove(){this.removed=true} focus(){this.focused=true}
}
let dialog;globalThis.document={createElement:tag=>new Element(tag),body:{append:element=>{dialog=element}}};
const cancel=confirmAction('Hủy không đổi dữ liệu');assert.equal(confirmationOpen(),true);const ignored=await confirmAction('Không được mở đồng thời');assert.equal(ignored,false);assert.equal(dialog.children[2].children[0].focused,true);dialog.children[2].children[0].dispatchEvent(new Event('click'));assert.equal(await cancel,false);assert.equal(confirmationOpen(),false);assert.equal(dialog.removed,true);
const accept=confirmAction('Xác nhận một lần');const acceptButton=dialog.children[2].children[1];acceptButton.dispatchEvent(new Event('click'));acceptButton.dispatchEvent(new Event('click'));assert.equal(await accept,true);assert.equal(confirmationOpen(),false);
const escape=confirmAction('Bấm Escape');dialog.dispatchEvent(new Event('cancel',{cancelable:true}));assert.equal(await escape,false);assert.equal(confirmationOpen(),false);
console.log('PASS: confirmation cancel, accept-once, escape and concurrent lock');

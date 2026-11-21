let pending=false;
/** One confirmation at a time; cancellation never runs the caller's action. */
export function confirmAction(message:string):Promise<boolean>{
  if(pending)return Promise.resolve(false);
  pending=true;
  const dialog=document.createElement('dialog');dialog.className='game-confirm';dialog.setAttribute('aria-labelledby','game-confirm-title');
  const title=document.createElement('h2');title.id='game-confirm-title';title.textContent='Xác nhận';
  const description=document.createElement('p');description.textContent=message;
  const actions=document.createElement('div');actions.className='game-confirm-actions';
  const cancel=document.createElement('button');cancel.type='button';cancel.className='icon-button';cancel.textContent='Hủy';
  const accept=document.createElement('button');accept.type='button';accept.className='accent-button';accept.textContent='Xác nhận';
  actions.append(cancel,accept);dialog.append(title,description,actions);document.body.append(dialog);
  return new Promise(resolve=>{let finished=false;const finish=(value:boolean)=>{if(finished)return;finished=true;pending=false;dialog.close();dialog.remove();resolve(value)};cancel.addEventListener('click',()=>finish(false));accept.addEventListener('click',()=>finish(true));dialog.addEventListener('cancel',event=>{event.preventDefault();finish(false)});dialog.addEventListener('keydown',event=>event.stopPropagation());dialog.showModal();cancel.focus()});
}
export function confirmationOpen(){return pending}

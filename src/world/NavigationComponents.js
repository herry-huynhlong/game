export function navigationComponents(blocked, columns){
  const labels=new Int32Array(blocked.length), queue=new Int32Array(blocked.length);
  const sizes=[0];
  let label=0;
  for(let start=0;start<blocked.length;start++){
    if(blocked[start]||labels[start])continue;
    label++;
    let head=0,tail=1;
    queue[0]=start;labels[start]=label;
    while(head<tail){
      const current=queue[head++], x=current%columns;
      const east=current+1, west=current-1, south=current+columns, north=current-columns;
      if(x+1<columns&&!blocked[east]&&!labels[east]){labels[east]=label;queue[tail++]=east;}
      if(x>0&&!blocked[west]&&!labels[west]){labels[west]=label;queue[tail++]=west;}
      if(south<labels.length&&!blocked[south]&&!labels[south]){labels[south]=label;queue[tail++]=south;}
      if(north>=0&&!blocked[north]&&!labels[north]){labels[north]=label;queue[tail++]=north;}
    }
    sizes[label]=tail;
  }
  return {labels,sizes};
}

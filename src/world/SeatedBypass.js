// Search only a short strip around the current route. The world route and
// destination remain intact. Moving bodies are swept again during execution.
export function findSeatedBypass(grid,body,from,waypoint,blocker){
  const dx=waypoint.x-from.x,dy=waypoint.y-from.y,length=Math.hypot(dx,dy);
  if(length<2)return null;
  const vx=dx/length,vy=dy/length;
  const minimum=Math.max(56,
    (blocker.x-from.x)*vx+(blocker.y-from.y)*vy+blocker.radius+body.radius+16);
  const advance=Math.min(length,minimum+36),joins=[];
  for(const extra of [0,12,24,36]){
    const forward=Math.min(length,minimum+extra);
    for(const side of [0,8,-8,16,-16]){
      if(forward===length&&side)continue;
      const p={x:from.x+vx*forward-vy*side,y:from.y+vy*forward+vx*side};
      if(grid.open(body,p.x,p.y))joins.push(p);
    }
    if(forward===length)break;
  }
  if(!joins.length)return null;
  const step=8, origin={col:0,row:0,point:from,parent:null};
  const nodes=[origin],visited=new Set(['0:0']);
  // Travellers approaching from opposite directions keep to their own right.
  const offsets=[[1,0],[1,1],[0,1],[1,-1],[0,-1],[-1,1],[-1,0],[-1,-1]];
  for(let index=0;index<nodes.length&&index<144;index++){
    const node=nodes[index];
    const join=node!==origin&&node.col>=1?joins.find(p=>grid.clearSegment(body,node.point,p)):null;
    if(join){
      const points=[join];
      for(let at=node;at!==origin;at=at.parent)points.push(at.point);
      points.reverse();
      return points;
    }
    for(const [dc,dr] of offsets){
      const col=node.col+dc,row=node.row+dr,key=col+':'+row;
      if(col< -2||col>Math.ceil(advance/step)+1||Math.abs(row)>8||visited.has(key))continue;
      const point={x:from.x+step*(vx*col-vy*row),y:from.y+step*(vy*col+vx*row)};
      if(!grid.clearSegment(body,node.point,point))continue;
      visited.add(key);
      nodes.push({col,row,point,parent:node});
    }
  }
  return null;
}

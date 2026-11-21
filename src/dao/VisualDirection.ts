export type VisualDirection='right'|'down_right'|'down'|'down_left'|'left'|'up_left'|'up'|'up_right';
const dirs:VisualDirection[]=['right','down_right','down','down_left','left','up_left','up','up_right'];
const octant=Math.PI/4;

/** Screen-space displacement; preserve last direction while stationary. */
export function visualDirection(dx:number,dy:number,last:VisualDirection='down'):VisualDirection {
  if(!Number.isFinite(dx)||!Number.isFinite(dy)||Math.hypot(dx,dy)<.01)return last;
  const angle=Math.atan2(dy,dx),lastAngle=dirs.indexOf(last)*octant;
  const difference=Math.atan2(Math.sin(angle-lastAngle),Math.cos(angle-lastAngle));
  // Keep the current sector slightly beyond its boundary to reduce flicker.
  if(Math.abs(difference)<Math.PI*27/180)return last;
  return dirs[(Math.round(angle/octant)+8)%8];
}

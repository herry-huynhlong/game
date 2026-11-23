export const MOTIONS={idle:{ms:220,frames:4},walk:{step:10,frames:8},run:{step:17,frames:8}};

export class CharacterAnimationController {
  motion='idle';
  direction='down';
  elapsed=0;
  phase=0;
  frame=0;

  advance(delta,motion,direction,distance) {
    const changed=this.motion!==motion||this.direction!==direction;
    this.motion=motion;
    this.direction=direction;
    this.elapsed+=delta;
    if(motion!=='idle') this.phase=(this.phase+Math.max(0,distance)/(MOTIONS[motion].step*2))%1;
    const frame=motion==='idle'?Math.floor(this.elapsed/MOTIONS.idle.ms)%4:Math.floor(this.phase*8);
    const needsPose=changed||this.frame!==frame||motion!=='idle';
    this.frame=frame;
    return needsPose;
  }

  pose() {
    if(this.motion==='idle') return {feet:[0,0],lift:[0,0],rise:this.frame===2?-1:0,swing:0,cloth:0};
    const step=MOTIONS[this.motion].step;
    const foot=(phase)=>{
      const planted=phase<.5;
      return {travel:Math.round((planted?.5-2*phase:2*phase-1.5)*step),lift:planted?0:Math.round(Math.sin((phase-.5)*2*Math.PI)*(this.motion==='run'?6:3))};
    };
    const a=foot(this.phase),b=foot((this.phase+.5)%1);
    const swing=Math.round(Math.sin(this.phase*2*Math.PI)*(this.motion==='run'?4:2));
    return {feet:[a.travel,b.travel],lift:[a.lift,b.lift],rise:-Math.round(Math.abs(Math.sin(this.phase*2*Math.PI))*(this.motion==='run'?2:1)),swing,cloth:Math.sign(Math.sin((this.phase-.14)*2*Math.PI))};
  }
}

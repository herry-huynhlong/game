import type { WorldClockSave } from './types';

export class WorldTimeSystem {
  private carry = 0;
  constructor(readonly state:WorldClockSave) {}
  get day(){return this.state.day}
  get minute(){return this.state.minute}
  get hour(){return Math.floor(this.state.minute/60)}
  get label(){const h=String(this.hour).padStart(2,'0'),m=String(this.minute%60).padStart(2,'0');return `Ngày ${this.day} · ${h}:${m}`}
  setSpeed(speed:1|2|4){this.state.speed=speed}
  togglePause(){this.state.paused=!this.state.paused}
  /** x1 is one in-world minute per real second; elapsed catch-up is capped to avoid offline simulation. */
  advance(realSeconds:number):number {
    if(this.state.paused)return 0;
    const elapsed=Math.min(Math.max(realSeconds,0),1.5)*this.state.speed;
    this.carry+=elapsed;
    const minutes=Math.floor(this.carry);if(minutes<=0)return 0;this.carry-=minutes;
    const total=this.state.minute+minutes;this.state.day+=Math.floor(total/1440);this.state.minute=total%1440;return minutes;
  }
}

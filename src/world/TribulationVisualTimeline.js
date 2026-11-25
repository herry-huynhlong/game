import { TRIBULATIONS } from '../dao/TribulationSystem.ts';

export const clamp01 = n => Math.min(1, Math.max(0, n));
export const END_SECONDS = 3;
export const impactKey = (id, wave) => id + ':impact:' + wave;

export function phaseOf(t, clock, strikeAge = Infinity) {
  const cfg = TRIBULATIONS[t.realm];
  const left = t.nextAt - clock;
  const ending = t.phase === 'success' || t.phase === 'failure';
  const gather = t.phase === 'cloud' ? clamp01(1 - left / cfg.cloud) : 1;
  const hasIncoming = t.phase === 'warning' || (t.phase === 'strike' && t.strikes < cfg.waves);
  const charge = hasIncoming ? clamp01(1 - left / (t.phase === 'warning' ? cfg.warning : Math.min(1.65, cfg.interval))) : 0;
  return { gather, charge, left, strikeAge, ending, resolve:ending ? clamp01(1 - left / END_SECONDS) : 0,
    leader:hasIncoming && left > 0 ? clamp01(1 - left / .16) : 0 };
}

export function durationFor(realm) {
  const {cloud,warning,interval,waves}=TRIBULATIONS[realm];
  return cloud+warning+interval*waves+END_SECONDS;
}

export function previewTrial(id, realm, anchor, seconds, outcome) {
  const {cloud,warning,interval,waves}=TRIBULATIONS[realm];
  const first=cloud+warning;
  const end=first+interval*waves;
  const strikes=seconds<first?0:Math.min(waves,1+Math.floor((seconds-first)/interval));
  const phase=seconds<cloud?'cloud':seconds<first?'warning':seconds<end?'strike':outcome;
  const nextAt=phase==='cloud'?cloud:phase==='warning'?first:phase==='strike'?first+strikes*interval:end+END_SECONDS;
  return {t:{id,realm,anchor,site:anchor,phase,nextAt,strikes},anchor,clock:seconds,
    strikeAge:strikes?(seconds-first-(strikes-1)*interval)*1000:Infinity};
}

const hash = text => {
  let h=2166136261;
  for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);
  return h>>>0;
};

export function boltShape(id,wave,x,top,y,rank) {
  let seed=hash(id+':'+wave);
  const rand=()=>{
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    return seed/4294967296;
  };
  const points=[{x:x+Math.round((rand()-.5)*27),y:top}];
  for(const t of [.13,.24,.33,.46,.58,.66,.76,.84,.91,.96]){
    const jag=(rand()-.5)*(52+rank*18)*(1-t*.43);
    points.push({x:x+Math.round(jag),y:Math.round(top+(y-top)*t)});
  }
  points.push({x,y});
  const branches=[];
  for(let i=0;i<4+rank;i++){
    const start=1+Math.floor(i*7/(3+rank)),p=points[start],side=rand()<.5?-1:1;
    const endX=side*(24+rand()*(38+rank*8)),dy=15+rand()*38;
    const branch=[p,{x:Math.round(p.x+endX*.35),y:Math.round(p.y+dy*.27)},
      {x:Math.round(p.x+endX*.64),y:Math.round(p.y+dy*.58)},
      {x:Math.round(p.x+endX),y:Math.round(p.y+dy)}];
    branches.push({start:start/(points.length-1),points:branch});
    if(i%2===0)branches.push({start:start/(points.length-1)+.06,points:[branch[2],
      {x:Math.round(branch[2].x+side*8),y:branch[2].y-5},{x:Math.round(branch[2].x+side*20),y:branch[2].y+3}]});
  }
  return {points,branches};
}

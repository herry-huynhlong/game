export function waterFlowFrame(time, period, phase, first=8){
  return first+(Math.floor(time/period)+phase)%8;
}

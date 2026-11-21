from pathlib import Path
import json,math,statistics
p=Path('art/previews/gfx5b4c-a4-final');m=json.loads((p/'measurement.json').read_text());f=json.loads((p/'foot-candidates.json').read_text())['frames'];exp={'S':'down','SE':'down_right','E':'right','NE':'up_right','N':'up','NW':'up_left','W':'left','SW':'down_left'};out=[]
for phase in m['output']:
 for leg in phase['legs']:
  name=leg['name'];ani='prototype8-C03_walk_'+exp[name];s=[v for v in phase['samples'] if leg['start']<=v['time']<=leg['end'] and v['animation']==ani and str(v['frame']) in f]
  groups=[]
  for v in s:
   if not groups or groups[-1][0]['frame']!=v['frame']:groups.append([])
   groups[-1].append(v)
  for i in range(len(groups)-1):
   a=groups[i][0];b=groups[i+1][0];fa=f[str(a['frame'])];fb=f[str(b['frame'])];pair=(fa['phase'],fb['phase']);
   if pair not in [(2,3),(5,6)]:continue
   side=1 if pair==(2,3) else 0;pa=fa['candidateBottomByScreenHalf'][side];pb=fb['candidateBottomByScreenHalf'][side]
   if not pa or not pb:continue
   ax=a['worldX']+pa['x']-16;ay=a['worldY']+pa['y']-40;bx=b['worldX']+pb['x']-16;by=b['worldY']+pb['y']-40
   out.append({'scenario':phase['name'],'direction':name,'frameTransition':pair,'footProxy':pa['group'],'dtMs':b['time']-a['time'],'deltaWorldX':bx-ax,'deltaWorldY':by-ay,'distanceWorldPx':math.hypot(bx-ax,by-ay),'fixedCameraWorldDistanceTimesZoom':math.hypot(bx-ax,by-ay)*a['zoom'],'predictedScreenDeltaX':(b['screenIdealX']+(pb['x']-16)*b['zoom'])-(a['screenIdealX']+(pa['x']-16)*a['zoom']),'predictedScreenDeltaY':(b['screenIdealY']+(pb['y']-40)*b['zoom'])-(a['screenIdealY']+(pa['y']-40)*a['zoom']),'assumption':'script lift flags imply opposite foot is planted; pixel proxy by screen half is not confirmed anatomical identity'})
(p/'foot-transition-measurements.json').write_text(json.dumps(out,indent=2)+'\n')
for k in exp:
 a=[v['distanceWorldPx'] for v in out if v['direction']==k];print(k,'count',len(a),'median/min/max',*[round(x,2) for x in (statistics.median(a),min(a),max(a))] if a else [])

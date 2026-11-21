from pathlib import Path
import json,math,statistics,re,subprocess,imageio_ffmpeg
p=Path('art/previews/gfx5b4c-a4-final');measure=json.loads((p/'measurement.json').read_text());foot=json.loads((p/'foot-transition-measurements.json').read_text());fps={}
def summarize(samples):
 dt=[b['time']-a['time'] for a,b in zip(samples,samples[1:]) if b['time']>a['time']];q=sorted(dt)
 if not dt:return {}
 switches=sum(a['frame']!=b['frame'] or a['animation']!=b['animation'] for a,b in zip(samples,samples[1:]));fx=[abs(s['screenIdealX']-round(s['screenIdealX'])) for s in samples];fy=[abs(s['screenIdealY']-round(s['screenIdealY'])) for s in samples]
 return {'renderFrames':len(samples),'durationSec':(samples[-1]['time']-samples[0]['time'])/1000,'renderFPS':1000*len(dt)/sum(dt),'medianFrameMs':statistics.median(dt),'p95FrameMs':q[int(.95*(len(q)-1))],'observedAnimationChanges':switches,'zoom':samples[0]['zoom'],'cameraScrollXRange':[min(s['scrollX'] for s in samples),max(s['scrollX'] for s in samples)],'cameraScrollYRange':[min(s['scrollY'] for s in samples),max(s['scrollY'] for s in samples)],'preRoundScreenFractionXMedian':statistics.median(fx),'preRoundScreenFractionYMedian':statistics.median(fy),'notes':'Screen positions are Phaser GetCalcMatrix pivot before renderer vertex handling, not independently observed screen-pixel locations.'}
for phase in measure['output']:fps[phase['name']]=summarize(phase['samples'])
for mode in ['fixed','follow']:
 data=json.loads((p/(mode+'-world-valid.json')).read_text());fps[mode+'_separate_recording']=summarize(data['samples']);path=p/(mode+'-world-valid.webm');r=subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-hide_banner','-i',str(path),'-vf','showinfo','-f','null','-'],stderr=subprocess.PIPE,text=True,encoding='utf8',errors='replace');pts=[float(x) for x in re.findall(r'\bn:\s*\d+\s+pts:\s*-?\d+\s+pts_time:([\d.]+)',r.stderr)];fps[mode+'_separate_recording']['video']={'decodedFrames':len(pts),'ptsDurationSec':pts[-1]-pts[0] if len(pts)>1 else 0,'fpsFromPTS':(len(pts)-1)/(pts[-1]-pts[0]) if len(pts)>1 else None,'coverage':'PTS duration shorter than render measurement; recording incomplete; do not infer a full path video.'}
summary={}
for direction in ['N','NE','E','SE','S','SW','W','NW']:
 v=[x for x in foot if x['direction']==direction];
 if v:
  dist=[x['distanceWorldPx'] for x in v];times=[x['dtMs'] for x in v];summary[direction]={'count':len(v),'medianWorldPx':statistics.median(dist),'minWorldPx':min(dist),'maxWorldPx':max(dist),'medianTransitionMs':statistics.median(times),'meaning':'bottom-most leg-layer pixels separated by screen half; not confirmed anatomical foot or contact'}
(p/'metrics-summary.json').write_text(json.dumps({'renderAndVideo':fps,'footProxyTransitions':summary},ensure_ascii=False,indent=2)+'\n',encoding='utf8')
for k,v in fps.items():print(k,round(v.get('renderFPS',0),2),'fps','median',round(v.get('medianFrameMs',0),1),'ms', 'video',v.get('video'))
for k,v in summary.items():print(k,'n',v['count'],'median px',round(v['medianWorldPx'],2),'median ms',round(v['medianTransitionMs'],1))

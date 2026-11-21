from pathlib import Path
import bisect,cv2,json,math,numpy as np,statistics
p=Path('art/previews/gfx5b4c-a4-final/gpu-60');m=json.loads((p/'measurement.json').read_text());atlas=cv2.imread('art/source/gfx5b/characters/gfx5b4c-a4/C03-a4.png',cv2.IMREAD_UNCHANGED);out={}
for typ in ['fixed_recorded','follow_recorded']:
 s=next(v for v in m['output'] if v['name']==typ)['samples'];ts=[v['time']-s[0]['time'] for v in s];cap=cv2.VideoCapture(str(p/(typ+'.webm')));rows=[];n=0
 while True:
  ok,im=cap.read()
  if not ok:break
  t=cap.get(cv2.CAP_PROP_POS_MSEC);i=bisect.bisect_left(ts,t);candidates=[j for j in (i-1,i) if 0<=j<len(s)];i=min(candidates,key=lambda j:abs(ts[j]-t));v=s[i]
  try:idx=int(v['frame'])
  except (ValueError,TypeError):n+=1;continue
  if idx<0 or idx>=98:n+=1;continue
  y=idx//8*40;x=idx%8*32;source=atlas[y:y+40,x:x+32];scale=v['zoom'];tw=round(32*scale);th=round(40*scale);src=cv2.resize(source,(tw,th),interpolation=cv2.INTER_NEAREST);mask=src[:,:,3];template=src[:,:,:3];ex=v['screenIdealX']-16*scale;ey=v['screenIdealY']-40*scale;x0=max(0,int(ex)-10);y0=max(0,int(ey)-10);roi=im[y0:y0+th+20,x0:x0+tw+20]
  if roi.shape[0]<th or roi.shape[1]<tw:n+=1;continue
  match=cv2.matchTemplate(roi,template,cv2.TM_CCORR_NORMED,mask=mask);_,score,_,loc=cv2.minMaxLoc(match)
  rows.append({'videoFrame':n,'videoMs':t,'sampleTimeDifferenceMs':ts[i]-t,'frameIndex':idx,'animation':v['animation'],'score':score,'estimatedTopLeftX':x0+loc[0],'estimatedTopLeftY':y0+loc[1],'predictedTopLeftX':ex,'predictedTopLeftY':ey,'residualX':x0+loc[0]-ex,'residualY':y0+loc[1]-ey});n+=1
 good=[x for x in rows if x['score']>=0.96 and abs(x['sampleTimeDifferenceMs'])<=20]
 def stats(k):
  vals=sorted(abs(x[k]) for x in good);return {'medianAbs':statistics.median(vals),'p95Abs':vals[int(.95*(len(vals)-1))],'maxAbs':max(vals)} if vals else None
 out[typ]={'decoded':n,'matched':len(good),'threshold':'template correlation >= 0.96 and nearest render sample within 20ms; heuristic, not a direct GPU vertex measurement','residualX':stats('residualX'),'residualY':stats('residualY'),'rows':rows}
 print(typ,'decoded',n,'accepted',len(good),'residualX',out[typ]['residualX'],'residualY',out[typ]['residualY'])
(p/'video-position-estimates.json').write_text(json.dumps(out,indent=2)+'\n')

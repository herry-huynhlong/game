from pathlib import Path
from PIL import Image,ImageDraw
import json
p=Path('art/previews/gfx5b4c-a4-final');asset=Image.open('art/source/gfx5b/characters/gfx5b4c-a4/C03-a4.png').convert('RGBA');legs=Image.open(p/'C03-a4-legs.png').convert('RGBA');dirs=['S','SE','E','NE','N','NW','W','SW'];records={}
out=Image.new('RGB',(6*145,8*200),'#30483b');draw=ImageDraw.Draw(out)
for di,name in enumerate(dirs):
 for phase in range(6):
  n=32+di*6+phase;x=(n%8)*32;y=(n//8)*40;im=asset.crop((x,y,x+32,y+40));lg=legs.crop((x,y,x+32,y+40));a=lg.getchannel('A');proxies=[]
  for label,xlo,xhi in [('screen_left',0,16),('screen_right',16,32)]:
   pts=[(xx,yy) for yy in range(34,40) for xx in range(xlo,xhi) if a.getpixel((xx,yy))>0]
   if not pts:proxies.append(None);continue
   bottom=max(y for _,y in pts);xs=[x for x,y in pts if y==bottom];proxies.append({'group':label,'x':sum(xs)/len(xs)+0.5,'y':bottom+1,'count':len(pts)})
  records[n]={'direction':name,'phase':phase+1,'durationMs':120,'pivot':{'x':16,'y':40},'candidateBottomByScreenHalf':proxies}
  px=phase*145;py=di*200;img=im.resize((128,160),Image.Resampling.NEAREST);out.paste(img,(px+8,py+24),img);draw.text((px+8,py+3),f'{name} frame {phase+1}',fill='#f4edc8')
  for proxy,color in zip(proxies,['#ffad42','#86d6fa']):
   if proxy:
    xx=px+8+proxy['x']*4;yy=py+24+proxy['y']*4;draw.ellipse((xx-3,yy-3,xx+3,yy+3),fill=color)
  draw.line((px+8+16*4-3,py+24+39*4,px+8+16*4+3,py+24+39*4),fill='#ffea70',width=2)
(p/'foot-candidates.json').write_text(json.dumps({'method':'Bottom alpha of legs layer in each screen half; occluded and not anatomical or confirmed planted contacts','frames':records},ensure_ascii=False,indent=2),encoding='utf8')
out.save(p/'foot-poses-candidates.png');print('Candidate proxies:',len(records),'directions',len(dirs),'not confirmed contact')

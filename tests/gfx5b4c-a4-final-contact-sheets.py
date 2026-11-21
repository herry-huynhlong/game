from pathlib import Path
from PIL import Image,ImageDraw
import json
p=Path('art/previews/gfx5b4c-a4-final');r=json.loads((p/'render-snapshots.json').read_text())
for phase in r['output']:
 out=Image.new('RGB',(6*192,8*220),'#253b30');d=ImageDraw.Draw(out)
 for row,leg in enumerate(phase['legs']):
  good=[x for x in leg['captures'] if x['requested']['frame']==x['callback']['frame'] and x['requested']['animation']==x['callback']['animation']][:6]
  for col,x in enumerate(good):
   img=Image.open(p/x['file']).convert('RGB').resize((192,192),Image.Resampling.NEAREST);xx=col*192;yy=row*220;out.paste(img,(xx,yy+25));d.text((xx+4,yy+3),f"{leg['name']} frame {x['callback']['frame']}",fill='white')
 out.save(p/('renderer-sequence-'+phase['mode']+'.png'))
 print(phase['mode'],'stable snapshots',sum(sum(x['requested']['frame']==x['callback']['frame'] and x['requested']['animation']==x['callback']['animation'] for x in l['captures']) for l in phase['legs']))

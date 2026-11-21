from PIL import Image
from pathlib import Path
import json
root=Path('art/source/gfx5b/characters');folder=root/'gfx5b4c-a3';im=Image.open(folder/'C03-a3.png').convert('RGBA');data=json.loads((root/'gfx5b4b/C03-8dir.animations.json').read_text(encoding='utf8'))
data.update(assetId='C03',spriteSheet='C03-a3.png',aseprite='C03-a3.aseprite',status='A3 candidate; special poses retained from GFX.5B.4B')
for anim in data['animations'].values():
 bounds=[]
 for n in anim['frames']:
  x=n%8*32;y=n//8*40;box=im.crop((x,y,x+32,y+40)).getchannel('A').getbbox();bounds.append(list(box) if box else None)
 anim['bounds']=bounds
(folder/'C03-a3.animations.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('animations',len(data['animations']),'frames',data['frames'])

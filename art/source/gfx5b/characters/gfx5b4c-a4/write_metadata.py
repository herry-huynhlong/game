from PIL import Image
from pathlib import Path
import json
root=Path('art/source/gfx5b/characters');out=root/'gfx5b4c-a4';im=Image.open(out/'C03-a4.png').convert('RGBA');data=json.loads((root/'gfx5b4c-a3/C03-a3.animations.json').read_text(encoding='utf8'));data.update(spriteSheet='C03-a4.png',aseprite='C03-a4.aseprite',status='A4 candidate; special-action frames are retained from A3')
for anim in data['animations'].values():
 anim['bounds']=[list(im.crop(((n%8)*32,(n//8)*40,(n%8)*32+32,(n//8)*40+40)).getchannel('A').getbbox()) for n in anim['frames']]
(out/'C03-a4.animations.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('Frame count:',data['frames'],'animation definitions:',len(data['animations']))

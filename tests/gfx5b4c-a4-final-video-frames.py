import subprocess,imageio_ffmpeg
from pathlib import Path
from PIL import Image,ImageDraw
p=Path('art/previews/gfx5b4c-a4-final/gpu-60');ff=imageio_ffmpeg.get_ffmpeg_exe()
for mode in ['fixed','follow']:
 d=p/(mode+'-contact-frames');d.mkdir(exist_ok=True)
 subprocess.run([ff,'-hide_banner','-loglevel','error','-ss','0.1','-t','1.2','-i',str(p/(mode+'_recorded.webm')),'-vf','fps=10,crop=160:190:437:280','-y',str(d/'frame-%02d.png')],check=True)
 fs=sorted(d.glob('*.png'))[:12];out=Image.new('RGB',(4*320,3*400),'#253b30');draw=ImageDraw.Draw(out)
 for i,f in enumerate(fs):
  x=i%4*320;y=i//4*400;im=Image.open(f).convert('RGB').resize((320,380),Image.Resampling.NEAREST);out.paste(im,(x,y+20));draw.text((x+5,y+3),f'{mode} +{0.1+i*.1:.1f}s',fill='white')
 out.save(p/(mode+'-world-video-frames.png'));print(mode,'frames',len(fs))

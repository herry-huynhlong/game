"""Assemble local Chrome captures and the 15 actual equipped weapon sprites."""
from pathlib import Path
import json
import re
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"art/previews/van-phap"
font_path=Path("C:/Windows/Fonts/segoeui.ttf")
font=lambda px:ImageFont.truetype(str(font_path),px)
samples=json.loads((OUT/"samples.json").read_text(encoding="utf8"))["samples"]
skills=Image.new("RGB",(1500,2454),"#101b24")
draw=ImageDraw.Draw(skills)
draw.text((20,12),"THIÊN ĐỊA ĐẤU PHÁP II • 45 VÕ KỸ TRONG PHASER",font=font(32),fill="#f3da9c")
colors=["#dce7e7","#a6d197","#91bcfb","#c9a4f0","#ffd787"]
for index,row in enumerate(samples):
    x=16+(index%5)*296
    y=64+(index//5)*264
    picture=Image.open(OUT/(row["id"]+".png")).convert("RGB")
    width,height=picture.size
    half=230 if row["grade"]>=3 else 138
    # The lab frames the midpoint between caster and target.
    crop=picture.crop((width//2-half,height//2-half*3//4,width//2+half,height//2+half*3//4))
    crop=crop.resize((280,210),Image.Resampling.NEAREST)
    skills.paste(crop,(x,y))
    draw.line([(x,y+211),(x+280,y+211)],fill=colors[row["grade"]],width=2)
    draw.text((x,y+218),row["name"],font=font(19),fill=colors[row["grade"]])
    draw.text((x,y+239),row["label"],font=font(13),fill="#a2b7ba")
skills.save(OUT/"contact-45-vo-ky.png",optimize=True)

armed=Image.open(ROOT/"public/assets/items/martial-arms.png").convert("RGBA")
back=Image.open(ROOT/"public/assets/items/martial-arms-back.png").convert("RGBA")
registry=(ROOT/"src/dao/MartialRegistry.ts").read_text(encoding="utf8")
names=re.findall(r"^  \['[a-z_]+'\s*,'([^']+)'\s*,'(?:jian|dao|spear|hammer|scythe)'",registry,re.M)
assert len(names)==15
page=Image.new("RGB",(1272,758),"#101b24")
draw=ImageDraw.Draw(page)
draw.text((16,14),"15 VŨ KHÍ • CẦM TAY VÀ ĐEO LƯNG 4×",font=font(30),fill="#f3da9c")
for i,name in enumerate(names):
    x,y=12+i%5*252,65+i//5*230
    color=colors[i//3]
    draw.rectangle((x,y,x+242,y+211),fill="#182a32",outline="#3c524f")
    draw.text((x+13,y+10),name,font=font(18),fill=color)
    for k,(label,strip) in enumerate((("Cầm tay",armed),("Đeo lưng",back))):
        cell=strip.crop((i*24,0,i*24+24,32)).resize((96,128),Image.Resampling.NEAREST)
        page.paste(cell,(x+15+k*115,y+45),cell)
        draw.text((x+27+k*115,y+177),label,font=font(15),fill="#9eb6bd")
page.save(OUT/"contact-15-vu-khi.png",optimize=True)

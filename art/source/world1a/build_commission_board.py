from pathlib import Path
import json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'public/assets/props/commission_board.png'
MAP = ROOT / 'maps/thanh_van_world.tmj'

def build_art():
    im = Image.new('RGBA', (128, 128), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    # Compact Qingyun timber bureau with layered jade tile eaves.
    d.ellipse((9, 112, 119, 127), fill=(20, 31, 27, 105))
    d.rectangle((23, 51, 105, 104), fill='#493525')
    d.rectangle((28, 47, 100, 95), fill='#b6a078')
    d.rectangle((33, 52, 95, 89), fill='#d0bd91')
    d.rectangle((26, 45, 102, 53), fill='#6b4930')
    # Side pillars and beams.
    for x in (26, 36, 91, 101):
        d.rectangle((x, 45, x+4, 103), fill='#633c27'); d.line((x+1, 50, x+1, 96), fill='#986941')
    d.rectangle((30, 44, 98, 48), fill='#382c25')
    # Green tiled roof in stepped pixel tiers.
    d.polygon([(13, 49), (31, 23), (96, 23), (115, 49), (104, 54), (24, 54)], fill='#203e3c', outline='#172b2b')
    d.polygon([(20, 46), (34, 27), (94, 27), (108, 46)], fill='#28635d')
    d.polygon([(25, 43), (37, 30), (91, 30), (103, 43)], fill='#347970')
    for y, x1, x2 in ((33,37,91),(37,31,97),(41,25,103),(45,20,108)):
        d.line((x1, y, x2, y), fill='#182d2d', width=2)
        for x in range(x1+4, x2, 8): d.line((x, y-2, x-3, y+2), fill='#4c9182', width=1)
    d.polygon([(10, 49), (28, 47), (38, 53), (30, 57), (8, 54)], fill='#b8874d', outline='#493726')
    d.polygon([(90, 53), (100, 47), (118, 49), (120, 54), (98, 57)], fill='#b8874d', outline='#493726')
    d.line((13, 50, 30, 50), fill='#edc47c', width=2); d.line((99, 50, 116, 50), fill='#edc47c', width=2)
    # Front sign board with gold border and readable seal mark.
    d.rectangle((44, 57, 85, 72), fill='#302820', outline='#c9a55e', width=2)
    d.rectangle((48, 60, 81, 69), fill='#7c432e')
    d.line((56, 62, 56, 67), fill='#f1d18b', width=2); d.line((60, 64, 64, 64), fill='#f1d18b', width=2)
    d.line((70, 61, 70, 68), fill='#f1d18b', width=2); d.line((67, 64, 76, 64), fill='#f1d18b', width=2)
    # Door, paper notices and counter.
    d.rectangle((55, 75, 76, 104), fill='#38291f', outline='#e1c88c')
    d.rectangle((59, 78, 72, 104), fill='#68432b'); d.line((65, 81, 65, 101), fill='#9d7243')
    d.ellipse((69, 89, 72, 92), fill='#e6c56f')
    d.rectangle((34, 76, 50, 91), fill='#eee1bd', outline='#6b4930')
    d.line((38, 80, 46, 80), fill='#9f4937'); d.line((38, 84, 46, 84), fill='#537a6e'); d.line((38, 88, 44, 88), fill='#6f553b')
    d.rectangle((79, 80, 96, 91), fill='#553b29'); d.rectangle((77, 77, 98, 81), fill='#8d6640')
    d.rectangle((81, 75, 94, 77), fill='#e2cc98')
    # Lanterns on either side of the entrance.
    for x in (19, 103):
        d.line((x+4, 48, x+4, 76), fill='#443226', width=2)
        d.rectangle((x, 59, x+8, 70), fill='#a94131', outline='#e6bd6d')
        d.rectangle((x+2, 61, x+6, 67), fill='#f3c770')
        d.line((x+4, 70, x+4, 74), fill='#e6bd6d')
    # Stone step and little approach apron.
    d.rectangle((50, 103, 82, 108), fill='#8d8c78', outline='#45483d')
    d.rectangle((45, 108, 87, 112), fill='#aaa58b')
    for x in (30, 46, 82, 98): d.rectangle((x, 97, x+2, 101), fill='#d8c593')
    return im

def main():
    OUT.parent.mkdir(parents=True, exist_ok=True); build_art().save(OUT)
    data = json.loads(MAP.read_text(encoding='utf-8'))
    props = next(layer for layer in data['layers'] if layer['name']=='WorldProps')
    collision = next(layer for layer in data['layers'] if layer['name']=='Collision')
    zones = next(layer for layer in data['layers'] if layer['name']=='Zones')
    sites = next(layer for layer in data['layers'] if layer['name']=='ActivitySites')
    used = [obj['id'] for layer in data['layers'] for obj in layer.get('objects', [])]
    base = max(data.get('nextobjectid', 1), max(used, default=0)+1)
    def prop(name, value): return {'name':name,'type':'string','value':value}
    props['objects'].append({'id':base,'name':'commission_hall','type':'prop','x':3188,'y':906,'width':128,'height':128,'rotation':0,'visible':True,'properties':[prop('sprite','commission_hall'),prop('function','commission-board')]})
    collision['objects'].append({'id':base+1,'name':'commission_hall_base','type':'solid','x':3204,'y':872,'width':96,'height':24,'rotation':0,'visible':True})
    zones['objects'].append({'id':base+2,'name':'Phố Tây Thanh Vân','type':'city-district','x':2550,'y':842,'width':820,'height':352,'rotation':0,'visible':True,'properties':[prop('regionId','phố-tây-thanh-vân'),prop('worldArea','Thanh Vân Thành')]})
    sites['objects'].append({'id':base+3,'name':'commission-board','type':'','x':3252,'y':930,'width':0,'height':0,'rotation':0,'visible':True,'properties':[prop('site','commission-board')]})
    data['nextobjectid']=base+4
    MAP.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Wrote {OUT} and added Tiled IDs {base}-{base+3}')

if __name__=='__main__': main()

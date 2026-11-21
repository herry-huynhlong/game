"""Hand-authored, native-resolution C03 eight-view idle study.

The figures are composed from view-specific pixel clusters (not a rotated or
mirrored head pasted onto a front-facing body). The resulting layer images are
serialized through the local Codex Pixel Bridge into an editable Aseprite file.
"""
from __future__ import annotations

import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[5]
OUT = Path(__file__).resolve().parent
W, H = 48, 64
DIRS = ["north", "north_east", "east", "south_east", "south", "south_west", "west", "north_west"]
P = {
    "outline": "#26333A", "outline2": "#34454B", "hair": "#202A32", "hairmid": "#34454C",
    "hairlight": "#58696A", "skin": "#E7B995", "skinlight": "#F5D5B0", "skinshade": "#B87861",
    "robe": "#D8E7D9", "robehi": "#F0F0D9", "robeshade": "#9ABDB2", "robedeep": "#668F8A",
    "blue": "#55888A", "bluedark": "#3D696F", "belt": "#425F5C", "gold": "#D4B36D",
    "goldlight": "#F0D995", "boot": "#4B4943", "bootlight": "#77715D", "shadow": "#314A40",
}

class Canvas:
    def __init__(self):
        self.im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.im)
    def poly(self, pts, color, outline=None): self.d.polygon(pts, fill=P[color], outline=P[outline] if outline else None)
    def line(self, pts, color, width=1): self.d.line(pts, fill=P[color], width=width, joint="curve")
    def rect(self, box, color, outline=None): self.d.rectangle(box, fill=P[color], outline=P[outline] if outline else None)
    def ellipse(self, box, color, outline=None): self.d.ellipse(box, fill=P[color], outline=P[outline] if outline else None)
    def px(self, x, y, color):
        if 0 <= x < W and 0 <= y < H: self.im.putpixel((x, y), tuple(bytes.fromhex(P[color][1:])) + (255,))

def blank_layers(): return {n: Canvas() for n in ["shadow", "boots", "robe_back", "hair", "sleeves", "body", "trim"]}

def common_shadow(L):
    c=L["shadow"]; c.ellipse((11,56,37,61),"shadow")
    c.line([(15,58),(20,57),(26,58),(33,57)],"outline2")

def front(L):
    # Down/front view. Face, crossed collar and both sleeves are independently composed.
    back=L["robe_back"]
    back.poly([(14,25),(19,22),(29,22),(34,25),(36,43),(34,51),(31,55),(17,55),(13,50),(12,42)],"robedeep","outline")
    back.poly([(17,28),(22,25),(28,25),(32,29),(33,45),(30,52),(18,52),(15,46)],"robeshade")
    # Side locks and tied high topknot
    h=L["hair"]
    h.ellipse((17,6,30,20),"hair","outline"); h.ellipse((18,7,29,19),"hairmid")
    h.poly([(21,8),(22,3),(26,2),(29,4),(28,8),(25,10)],"hair","outline")
    h.line([(22,5),(26,4),(28,5)],"hairlight"); h.line([(20,8),(19,12),(20,15)],"hairlight")
    h.poly([(17,11),(19,9),(20,18),(18,22),(16,20)],"hair","outline")
    h.poly([(28,10),(31,12),(31,19),(29,22),(27,18)],"hair","outline")
    b=L["body"]
    b.rect((21,18,27,25),"skinshade"); b.rect((22,19,26,24),"skin")
    b.poly([(18,9),(20,7),(27,7),(30,10),(30,18),(28,22),(24,24),(20,22),(17,18)],"skin","outline")
    b.poly([(19,10),(21,8),(27,8),(29,11),(29,16),(27,18),(22,18),(18,16)],"skinlight")
    # Small, clean facial clusters that remain readable at 1x.
    b.px(20,12,"skinshade"); b.px(27,12,"skinshade")
    b.px(21,14,"outline"); b.px(27,14,"outline")
    b.px(24,16,"skinshade"); b.px(23,19,"skinshade"); b.px(24,19,"skinshade")
    # Sleeve mass behind the chest, near sleeve larger than far sleeve
    a=L["sleeves"]
    a.poly([(16,24),(12,25),(8,29),(7,36),(10,39),(15,37),(18,31)],"robedeep","outline")
    a.poly([(17,25),(14,26),(10,30),(9,35),(11,37),(14,35),(18,29)],"robe","outline2")
    a.poly([(32,24),(36,25),(40,29),(41,36),(38,39),(33,37),(30,31)],"robedeep","outline")
    a.poly([(31,25),(34,26),(38,30),(39,35),(37,37),(34,35),(30,29)],"robehi","outline2")
    a.line([(11,30),(13,28),(15,28)],"robehi"); a.line([(37,30),(35,28),(33,28)],"robeshade")
    # Body tunic narrows at belt and flares at hem
    b.poly([(18,23),(21,22),(27,22),(30,24),(32,29),(31,40),(35,51),(32,56),(16,56),(13,51),(17,40),(16,29)],"robe","outline")
    b.poly([(19,24),(22,23),(27,23),(29,26),(29,38),(33,50),(31,53),(25,52),(23,45),(20,52),(15,53),(15,50),(19,38),(18,28)],"robehi")
    b.poly([(18,29),(21,31),(22,39),(18,50),(15,51),(18,39)],"robeshade")
    b.poly([(29,29),(31,31),(30,40),(34,51),(31,53),(27,40)],"robedeep")
    # Trousers and boots visible below the split robe
    boots=L["boots"]
    boots.poly([(18,49),(23,50),(23,57),(21,60),(14,60),(13,58),(15,55)],"outline")
    boots.poly([(19,51),(22,51),(21,57),(19,58),(15,58),(16,55)],"boot")
    boots.line([(15,58),(20,58)],"bootlight"); boots.px(17,54,"bluedark")
    boots.poly([(26,49),(30,50),(34,55),(36,58),(35,60),(28,60),(25,57)],"outline")
    boots.poly([(27,51),(30,52),(33,56),(33,58),(28,58),(27,56)],"boot")
    boots.line([(29,58),(34,58)],"bootlight"); boots.px(30,54,"bluedark")
    # Robe trim, crossed collar, sash, clasp and embroidered cloud motif
    t=L["trim"]
    t.poly([(19,23),(22,23),(25,27),(29,31),(27,33),(23,29),(20,27)],"robehi")
    t.poly([(29,23),(26,23),(23,27),(19,31),(21,33),(25,29),(28,27)],"robeshade")
    t.line([(18,24),(21,27),(25,28)],"gold"); t.line([(30,24),(27,27),(24,28)],"gold")
    t.line([(17,39),(23,40),(30,39)],"belt",2); t.line([(17,40),(23,41),(30,40)],"gold")
    t.rect((23,39,26,42),"gold","outline2"); t.px(24,40,"goldlight")
    t.line([(20,31),(21,36),(20,38)],"robehi"); t.line([(27,32),(26,36)],"robeshade")
    t.line([(22,45),(21,48),(20,50)],"blue"); t.px(21,46,"gold")
    t.line([(17,52),(19,53),(22,53)],"gold"); t.line([(29,52),(31,53)],"gold")
    # wrists/hands in front of sleeves
    a.poly([(8,36),(12,36),(13,39),(11,41),(8,39)],"skin","outline"); a.px(10,37,"skinlight")
    a.poly([(37,36),(40,36),(41,39),(39,41),(37,39)],"skin","outline"); a.px(39,37,"skinshade")

def three_quarter_front(L, sign):
    # Hand-composed 3/4 front view: the far shoulder and hand recede, the near
    # sleeve and hip lead, and the chest/hem axis runs diagonally across frame.
    common_shadow(L)
    back=L["robe_back"]
    back.poly([(19,24),(27,22),(34,26),(37,34),(33,43),(36,51),(32,56),(13,54),(16,46),(14,35)],"robedeep","outline")
    back.poly([(22,27),(28,25),(33,28),(34,36),(30,44),(33,51),(29,53),(20,51),(21,44),(17,49),(15,48),(20,38)],"robeshade")
    back.poly([(25,30),(30,28),(32,34),(29,43),(32,50),(27,52),(23,43)],"robe")
    h=L["hair"]
    h.poly([(16,10),(18,6),(22,4),(28,5),(32,8),(34,13),(33,18),(30,22),(25,23),(19,20),(16,16)],"hair","outline")
    h.poly([(18,10),(20,7),(23,6),(28,7),(31,10),(32,14),(30,18),(26,20),(21,18),(18,15)],"hairmid")
    h.poly([(21,5),(22,2),(27,2),(30,5),(28,8)],"hair","outline"); h.line([(22,4),(27,3)],"hairlight")
    h.poly([(17,12),(20,12),(20,20),(17,22),(15,19)],"hair","outline"); h.line([(18,14),(18,18)],"hairlight")
    b=L["body"]
    b.poly([(21,10),(25,8),(30,9),(33,12),(33,17),(30,20),(25,20),(21,17),(19,14)],"skin","outline")
    b.poly([(23,10),(27,9),(30,10),(32,13),(31,16),(28,18),(24,17),(21,15)],"skinlight")
    b.px(27,13,"skinshade"); b.px(28,14,"outline") # one near eye, far eye hidden by turned cheek
    b.line([(29,15),(34,16),(31,18)],"skinshade") # nose bridge in profile
    b.px(28,19,"skinshade")
    b.poly([(24,19),(29,19),(30,25),(26,27),(22,24)],"skin","outline")
    # Slanted chest plane and offset waist; rear side stays visibly narrower.
    b.poly([(21,23),(26,23),(31,26),(33,31),(31,40),(35,51),(32,55),(14,54),(17,48),(21,39),(19,31)],"robe","outline")
    b.poly([(23,25),(27,25),(31,28),(30,36),(28,42),(33,51),(30,52),(24,50),(23,43),(19,50),(16,51),(20,39),(20,31)],"robehi")
    b.poly([(20,29),(23,32),(24,39),(20,48),(17,50),(19,39)],"robeshade")
    b.poly([(29,30),(32,31),(30,40),(34,51),(31,53),(27,41)],"robedeep")
    sleeves=L["sleeves"]
    sleeves.poly([(20,24),(24,23),(27,27),(25,31),(21,34),(16,33),(14,30),(16,27)],"robedeep","outline")
    sleeves.poly([(20,25),(23,25),(25,28),(23,31),(19,32),(16,30),(18,27)],"robeshade","outline2")
    sleeves.poly([(29,25),(34,25),(39,29),(41,35),(38,40),(34,39),(30,34)],"robedeep","outline")
    sleeves.poly([(31,26),(34,27),(38,31),(39,35),(37,38),(34,36),(31,32)],"robehi","outline2")
    sleeves.poly([(38,37),(41,37),(42,40),(40,42),(38,40)],"skin","outline")
    boots=L["boots"]
    boots.poly([(17,49),(23,50),(21,57),(19,60),(12,60),(11,58),(15,53)],"outline")
    boots.poly([(17,52),(21,52),(19,57),(17,58),(13,58),(15,54)],"boot"); boots.line([(12,58),(17,58)],"bootlight")
    boots.poly([(27,49),(32,50),(36,56),(36,59),(34,60),(28,59),(25,56)],"outline")
    boots.poly([(28,52),(31,53),(34,57),(33,58),(29,58)],"boot"); boots.line([(29,58),(34,58)],"bootlight")
    t=L["trim"]
    t.line([(22,24),(26,27),(31,29),(34,28)],"gold")
    t.line([(24,27),(27,31),(26,36),(24,39)],"robehi")
    t.line([(29,29),(27,34),(28,37)],"robeshade")
    t.line([(18,38),(23,39),(28,41),(32,40)],"belt",2)
    t.line([(18,37),(23,38),(28,40),(32,39)],"gold")
    t.rect((26,39,29,42),"gold","outline2"); t.px(27,40,"goldlight")
    t.line([(22,44),(21,48),(19,50)],"blue"); t.px(21,46,"gold")
    t.line([(18,52),(21,53),(24,53)],"gold"); t.line([(30,52),(32,53)],"gold")
    if sign < 0:
        for c in L.values(): c.im=c.im.transpose(Image.Transpose.FLIP_LEFT_RIGHT); c.d=ImageDraw.Draw(c.im)

def side(L, sign):
    # Narrow true side silhouette: profile nose, one visible shoulder and
    # overlapping limbs, shortened chest depth, diagonal sash and narrow boots.
    if sign < 0:
        work=blank_layers(); side(work,1)
        for n,c in work.items(): c.im=c.im.transpose(Image.Transpose.FLIP_LEFT_RIGHT); c.d=ImageDraw.Draw(c.im)
        for n,c in work.items(): L[n].im.alpha_composite(c.im)
        return
    common_shadow(L)
    back=L["robe_back"]
    back.poly([(20,25),(27,23),(33,27),(34,40),(31,50),(34,55),(21,55),(18,51),(23,41)],"robedeep","outline")
    back.poly([(24,28),(29,27),(31,40),(28,50),(31,53),(22,53),(23,47),(26,39)],"robeshade")
    h=L["hair"]
    h.poly([(20,8),(22,5),(27,4),(31,6),(33,10),(32,15),(34,18),(31,20),(26,19),(22,17),(19,13)],"hair","outline")
    h.poly([(21,9),(23,6),(28,5),(31,7),(32,11),(30,14),(27,15),(23,14),(20,12)],"hairmid")
    h.poly([(25,5),(27,2),(31,2),(33,4),(32,7)],"hair","outline"); h.line([(27,4),(31,3)],"hairlight")
    h.poly([(21,14),(24,15),(23,22),(20,24),(18,20)],"hair","outline"); h.line([(21,16),(21,20)],"hairlight")
    b=L["body"]
    b.poly([(22,9),(29,7),(32,10),(33,14),(31,18),(27,20),(23,17),(20,14)],"skin","outline")
    b.poly([(24,10),(29,9),(31,11),(31,14),(28,16),(24,15)],"skinlight")
    b.poly([(29,12),(34,14),(31,16),(29,16)],"skin","outline") # projecting nose profile
    b.px(25,13,"outline"); b.line([(22,17),(27,19)],"skinshade")
    b.rect((25,18,29,25),"skinshade"); b.rect((25,19,28,24),"skin")
    sleeves=L["sleeves"]
    sleeves.poly([(24,23),(29,23),(34,26),(37,31),(35,36),(31,38),(27,34),(25,30)],"robedeep","outline")
    sleeves.poly([(28,25),(31,25),(35,29),(35,33),(32,35),(29,32)],"robehi","outline2")
    sleeves.poly([(20,26),(24,24),(28,26),(30,31),(28,37),(23,38),(19,34)],"robeshade","outline")
    b.poly([(24,23),(30,24),(33,29),(31,40),(34,50),(31,55),(18,55),(20,48),(23,39),(20,30)],"robe","outline")
    b.poly([(25,25),(29,26),(31,31),(29,40),(32,51),(29,53),(23,52),(25,41),(23,32)],"robehi")
    b.poly([(22,30),(25,34),(24,40),(21,50),(19,52),(21,40)],"robeshade")
    boots=L["boots"]
    boots.poly([(20,49),(27,50),(26,57),(24,60),(16,60),(15,58),(19,54)],"outline")
    boots.poly([(21,52),(25,52),(23,57),(21,58),(17,58)],"boot"); boots.line([(17,58),(22,58)],"bootlight")
    boots.poly([(28,49),(32,50),(36,56),(36,59),(34,60),(28,60),(26,57)],"outline")
    boots.poly([(29,52),(32,53),(34,57),(33,58),(29,58)],"boot"); boots.line([(30,58),(34,58)],"bootlight")
    t=L["trim"]
    t.line([(24,24),(29,27),(32,30)],"gold"); t.line([(27,27),(29,33),(27,39)],"robeshade")
    t.line([(22,39),(28,40),(31,39)],"belt",2); t.rect((28,38,30,41),"gold","outline2")
    t.line([(30,42),(29,47),(32,51)],"blue"); t.px(30,44,"gold")
    sleeves.poly([(34,33),(37,33),(38,36),(36,38),(34,36)],"skin","outline")
    common_shadow(L)

def three_quarter_back(L, sign):
    # Rear 3/4 silhouette pivots the head, shoulders, waist and legs together.
    # The far arm is mostly occluded; the near right shoulder/hand projects.
    back=L["robe_back"]
    back.poly([(20,24),(26,22),(33,24),(38,29),(39,39),(35,45),(38,52),(34,56),(14,54),(13,50),(18,42),(15,34)],"robedeep","outline")
    back.poly([(23,27),(28,25),(34,27),(36,32),(35,40),(32,45),(35,51),(31,53),(22,51),(20,45),(16,50),(15,48),(20,39)],"robeshade")
    back.poly([(27,29),(32,28),(34,34),(31,42),(34,50),(29,52),(25,43)],"robe")
    h=L["hair"]
    h.poly([(17,9),(19,6),(23,4),(29,5),(33,9),(35,14),(34,19),(31,23),(26,24),(21,21),(17,17)],"hair","outline")
    h.poly([(19,10),(21,7),(24,6),(29,7),(32,10),(33,15),(31,19),(27,21),(22,19),(19,16)],"hairmid")
    h.poly([(22,5),(24,2),(29,2),(32,5),(30,8)],"hair","outline"); h.line([(24,4),(29,3)],"hairlight")
    h.line([(20,10),(19,15),(21,18)],"hairlight"); h.line([(30,10),(32,14),(31,18)],"hairlight")
    h.poly([(33,14),(36,15),(35,18),(33,19)],"skin","outline") # one visible ear/side plane
    sleeves=L["sleeves"]
    sleeves.poly([(18,25),(15,26),(12,30),(13,35),(17,37),(21,33)],"robedeep","outline")
    sleeves.poly([(30,25),(35,25),(40,30),(42,36),(39,41),(35,40),(32,35)],"robehi","outline")
    sleeves.poly([(39,37),(42,37),(43,40),(41,43),(39,41)],"skin","outline")
    boots=L["boots"]
    boots.poly([(18,50),(24,51),(22,58),(20,60),(14,60),(13,58)],"outline")
    boots.poly([(18,53),(22,53),(20,58),(15,58)],"boot"); boots.line([(14,58),(19,58)],"bootlight")
    boots.poly([(28,50),(34,50),(38,56),(38,59),(36,60),(30,59),(27,57)],"outline")
    boots.poly([(29,53),(33,53),(36,57),(35,58),(31,58)],"boot"); boots.line([(31,58),(35,58)],"bootlight")
    t=L["trim"]
    t.line([(20,27),(26,29),(32,28),(36,30)],"gold")
    t.line([(21,31),(26,33),(31,32)],"robehi"); t.line([(21,35),(27,37),(32,35)],"robeshade")
    t.line([(19,40),(26,42),(35,39)],"belt",2); t.line([(20,41),(26,43),(34,40)],"gold")
    t.rect((27,40,30,43),"gold","outline2"); t.px(28,41,"goldlight")
    t.line([(29,43),(32,47),(34,50)],"blue"); t.px(31,46,"gold")
    if sign < 0:
        for c in L.values(): c.im=c.im.transpose(Image.Transpose.FLIP_LEFT_RIGHT); c.d=ImageDraw.Draw(c.im)

def back_view(L):
    back=L["robe_back"]
    back.poly([(15,25),(20,22),(29,22),(34,26),(35,43),(37,52),(33,56),(15,56),(11,52),(14,42)],"robedeep","outline")
    back.poly([(18,27),(23,25),(28,25),(32,28),(33,43),(35,51),(31,53),(25,51),(22,44),(17,52),(13,51),(16,42)],"robe","outline2")
    back.poly([(19,29),(23,27),(27,27),(30,30),(29,42),(31,49),(26,51),(23,43),(19,50),(16,50),(18,41)],"robehi")
    h=L["hair"]
    h.poly([(15,10),(17,6),(21,4),(28,4),(32,7),(34,12),(33,18),(30,22),(25,24),(19,22),(15,18)],"hair","outline")
    h.poly([(17,10),(19,7),(22,5),(28,5),(31,8),(33,12),(32,17),(29,20),(25,22),(20,20),(17,17)],"hairmid")
    h.poly([(21,5),(22,2),(27,2),(30,5),(28,8)],"hair","outline"); h.line([(22,4),(27,3)],"hairlight")
    h.line([(18,10),(17,15),(19,18)],"hairlight"); h.line([(29,10),(31,14),(29,18)],"hairlight")
    sleeves=L["sleeves"]
    sleeves.poly([(16,25),(12,27),(9,32),(10,38),(14,39),(18,34)],"robedeep","outline")
    sleeves.poly([(32,25),(36,27),(39,32),(38,38),(34,40),(30,34)],"robehi","outline")
    sleeves.poly([(10,36),(13,36),(15,39),(12,41),(9,39)],"skin","outline")
    sleeves.poly([(36,36),(39,36),(40,39),(37,41),(35,39)],"skin","outline")
    boots=L["boots"]
    boots.poly([(16,50),(22,51),(21,58),(18,60),(12,60),(11,58)],"outline")
    boots.poly([(16,53),(20,53),(19,58),(14,58)],"boot"); boots.line([(13,58),(18,58)],"bootlight")
    boots.poly([(27,50),(33,51),(37,57),(36,59),(29,60),(26,57)],"outline")
    boots.poly([(28,53),(32,53),(35,57),(34,58),(30,58)],"boot"); boots.line([(30,58),(34,58)],"bootlight")
    t=L["trim"]
    t.line([(18,27),(22,29),(27,29),(32,27)],"gold")
    t.line([(17,32),(23,34),(29,32)],"robehi"); t.line([(18,36),(24,38),(30,36)],"robeshade")
    t.line([(17,40),(24,41),(32,40)],"belt",2); t.line([(18,41),(24,42),(31,41)],"gold")
    t.rect((23,40,26,43),"gold","outline2"); t.px(24,41,"goldlight")
    t.line([(22,28),(22,35),(24,38)],"robeshade")

def build():
    frames=[]
    for d in DIRS:
        L=blank_layers(); common_shadow(L)
        if d=="south": front(L)
        elif d=="north": back_view(L)
        elif d=="east": side(L,1)
        elif d=="west": side(L,-1)
        elif d=="south_east": three_quarter_front(L,1)
        elif d=="south_west": three_quarter_front(L,-1)
        elif d=="north_east": three_quarter_back(L,1)
        else: three_quarter_back(L,-1)
        # Flatten per named layer to one-color horizontal runs for the bridge.
        layers=[]
        for name,c in L.items():
            ops=[]
            px=c.im.load()
            for y in range(H):
                x=0
                while x<W:
                    rgba=px[x,y]
                    if rgba[3]==0: x+=1; continue
                    rgb="#%02X%02X%02X"%rgba[:3]
                    end=x+1
                    while end<W and px[end,y]==rgba: end+=1
                    ops.append({"type":"rect","x":x,"y":y,"w":end-x,"h":1,"color":rgb})
                    x=end
            layers.append({"name":name,"ops":ops})
        frames.append({"durationMs":1000,"layers":layers})
    spec={"name":"C03-A5-eight-views","width":W,"height":H,"palette":{},"frames":frames}
    spec_path=OUT/"C03-A5-eight-views.json"
    spec_path.write_text(json.dumps(spec,separators=(",",":")),encoding="utf-8")
    # Independent PNG render is kept as an immediate review asset; bridge also exports its own sheet.
    sheet=Image.new("RGBA",(W*8,H),(0,0,0,0))
    for i,d in enumerate(DIRS):
        # Rebuild through a direct call to guarantee the PNG and editable source match.
        L=blank_layers(); common_shadow(L)
        {"north":back_view,"south":front,"east":lambda x:side(x,1),"west":lambda x:side(x,-1),"south_east":lambda x:three_quarter_front(x,1),"south_west":lambda x:three_quarter_front(x,-1),"north_east":lambda x:three_quarter_back(x,1),"north_west":lambda x:three_quarter_back(x,-1)}[d](L)
        frame=Image.new("RGBA",(W,H),(0,0,0,0))
        for c in L.values(): frame.alpha_composite(c.im)
        sheet.alpha_composite(frame,(i*W,0))
    sheet.save(OUT/"C03-A5-eight-views-preview.png")
    # Silhouette-only sheet tests whether body mass and limb overlap communicate
    # each view without relying on the eyes or garment ornament.
    silhouette=Image.new("RGBA",(W*8,H),(18,31,30,255))
    for i in range(8):
        cell=sheet.crop((i*W,0,(i+1)*W,H))
        mask=cell.getchannel("A")
        fill=Image.new("RGBA",(W,H),(34,49,51,255)); fill.putalpha(mask)
        silhouette.alpha_composite(fill,(i*W,0))
    silhouette.resize((W*8*4,H*4),Image.Resampling.NEAREST).save(OUT/"C03-A5-eight-views-silhouette-4x.png")
    # Old and new are aligned by the foot baseline and shown at native pixel
    # scale. The larger A5 frame is intentional and visible for size review.
    old_path=ROOT/"public/assets/characters/gfx5b4c-a4/C03-a4.png"
    if old_path.exists():
        old=Image.open(old_path).convert("RGBA")
        old_ids=[16,12,8,4,0,28,24,20]
        compare=Image.new("RGBA",(W*2+90,H*8+28),(26,39,37,255)); d=ImageDraw.Draw(compare)
        d.text((4,3),"A4 32x40",fill="#e5d7ac"); d.text((W+16,3),"A5 48x64",fill="#e5d7ac")
        for i,(name,idx) in enumerate(zip(DIRS,old_ids)):
            xcell=0; y=22+i*H
            ox=(idx%8)*32; oy=(idx//8)*40
            oldframe=old.crop((ox,oy,ox+32,oy+40))
            compare.alpha_composite(oldframe,(8,y+H-40))
            compare.alpha_composite(sheet.crop((i*W,0,(i+1)*W,H)),(W+16,y))
            d.text((W*2+17,y+3),name.replace("_"," ").upper(),fill="#e5d7ac")
        compare.save(OUT/"C03-A4-vs-A5-poses.png")
        compare.resize((compare.width*3,compare.height*3),Image.Resampling.NEAREST).save(OUT/"C03-A4-vs-A5-poses-3x.png")
    sheet.resize((sheet.width*4,sheet.height*4),Image.Resampling.NEAREST).save(OUT/"C03-A5-eight-views-preview-4x.png")
    (OUT/"directions.json").write_text(json.dumps({"canvas":{"width":W,"height":H},"frameOrder":DIRS,"facing":"north means away from camera; south means toward camera","layerOrderBottomToTop":["shadow","boots","robe_back","body","sleeves","hair","trim"],"fps":1,"status":"eight independently composed idle views; no walk cycle yet"},indent=2),encoding="utf-8")

if __name__=="__main__": build()

"""Draw the Qingyun inventory atlas at its native 32-pixel size."""
import json
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
OUTLINE = "#1b2230"
GOLD = "#d5a95e"
PARCHMENT = "#ead9af"
JADE = "#68bf98"
SILVER = "#b2cbd8"
TERRACOTTA = "#963e4a"
WOOD = "#7a4d3a"


def draw_item(item):
    canvas = Image.new("RGBA", (32, 32))
    d = ImageDraw.Draw(canvas)

    def poly(points, color):
        d.polygon(points, fill=color)

    def line(points, color, width=1):
        d.line(points, fill=color, width=width)

    def detail(x, y, color=PARCHMENT):
        line([(x - 2, y), (x + 2, y)], color)
        line([(x, y - 2), (x, y + 2)], color)

    if item in {"iron_sword", "mortal_gift_sword", "qingfeng_sword", "iron_dao"}:
        dao = item == "iron_dao"
        wood = item == "iron_sword"
        edge = "#8de4bb" if item == "qingfeng_sword" else "#ddd4ac" if wood else "#e2eef0"
        poly([(5,24),(7,21),(10,22),(13,19),(11,17),(13,15),(16,16),(22,8),
              (27,4 if dao else 3),(29,5),(27,13 if dao else 9),(18,21),(18,24),(16,25),(14,23),(10,28),(6,28)], OUTLINE)
        if dao:
            poly([(16,18),(23,10),(27,6),(27,11),(24,16),(18,21)], "#758ca9")
            line([(18,19),(24,14),(27,8)], edge)
        else:
            poly([(15,18),(24,7),(28,4),(26,9),(18,21)], "#9d7f58" if wood else "#5e85a3")
            line([(17,18),(27,5)], edge,2)
        line([(12,17),(18,23)], JADE if item == "qingfeng_sword" else GOLD,2)
        line([(8,26),(13,21)], WOOD,3)
        d.point((8,26), GOLD)
        if item == "qingfeng_sword":
            detail(24,14,JADE)
    elif item == "training_crossbow":
        poly([(4,13),(6,8),(14,10),(18,12),(25,7),(28,9),(28,15),(20,20),(15,18),(8,22),(4,25),(2,22),(11,14)], OUTLINE)
        line([(6,10),(15,14),(25,9)], WOOD,3)
        line([(5,12),(16,19),(26,12)], PARCHMENT)
        line([(5,24),(19,12),(26,6)], GOLD,3)
        poly([(24,6),(29,3),(27,9)], SILVER)
        line([(10,20),(12,22)], "#606678",2)
    elif item.startswith("book_"):
        marks = {"book_qingyun_wave":JADE,"book_crescent_wave":"#d68776",
                 "book_spirit_thrust":"#8f9edc","book_spirit_guard":"#e3bc70"}
        tint = marks[item]
        poly([(7,6),(20,3),(26,7),(26,24),(22,28),(8,27),(5,24),(5,10)], OUTLINE)
        poly([(8,8),(20,5),(24,7),(24,22),(21,25),(9,25),(7,23)], "#394653")
        poly([(10,8),(21,6),(23,8),(22,21),(10,23)], tint)
        poly([(7,23),(22,21),(24,22),(21,25),(9,26)], PARCHMENT)
        line([(9,10),(9,22)], "#bba77c")
        if item == "book_crescent_wave":
            line([(18,10),(15,13),(16,17),(19,17)], OUTLINE,2)
        elif item == "book_spirit_guard":
            line([(13,12),(18,10),(20,13),(19,17),(16,19),(13,16),(13,12)], OUTLINE)
        else:
            line([(14,17),(19,11)], OUTLINE,2)
            if item == "book_qingyun_wave":
                line([(13,19),(18,18),(20,15)], PARCHMENT)
    elif item in {"qingling_herb", "purple_jade_fungus", "violet_mist_flower", "thunder_fruit", "ancient_blood_lotus"}:
        line([(15,27),(16,19),(15,11)],"#386556",3)
        poly([(16,24),(10,22),(7,17),(13,18),(17,22),(21,17),(27,15),(25,20),(20,24)],"#4c8768")
        line([(9,18),(14,21),(17,23),(24,17)],"#a9c487")
        if item == "purple_jade_fungus":
            poly([(4,16),(6,10),(11,5),(20,4),(26,8),(28,15),(22,18),(12,18)],"#533c70")
            poly([(6,14),(9,9),(14,6),(21,6),(25,10),(25,12),(17,11),(10,15)],"#b381bd")
            line([(10,15),(14,16),(21,15)],"#f0cfda")
        elif item == "thunder_fruit":
            poly([(15,4),(20,4),(25,9),(25,16),(20,21),(13,20),(9,16),(9,10)],"#5297a5")
            poly([(16,6),(20,7),(22,12),(19,15),(12,14),(11,10)],"#a6e7e1")
            line([(18,8),(14,13),(18,13),(15,18)],"#fff0ab")
        elif item == "qingling_herb":
            poly([(15,19),(11,15),(8,8),(10,4),(15,9),(16,14),(18,7),(23,4),(23,10),(19,18)],"#8cb768")
            line([(11,8),(15,15),(19,12),(21,7)],"#d5e6a2")
        else:
            lotus=item=="ancient_blood_lotus"
            dark, mid, pale=("#792f4a","#c65b6f","#f7b6a3") if lotus else ("#604374","#ab79bb","#ead0e8")
            poly([(3,13),(5,7),(11,10),(15,4),(20,8),(22,11),(28,8),(28,15),(24,19),(17,21),(9,19)],dark)
            poly([(5,10),(10,12),(13,17),(14,9),(16,6),(20,10),(18,17),(22,13),(26,11),(25,16),(20,18),(16,20),(11,18)],mid)
            line([(15,10),(15,14),(18,16),(22,15)],pale)
            detail(23,6,"#f7dd9c")
    elif item == "spirit_herb":
        for points,color in [
            ([(15,27),(13,15),(5,11),(3,5),(10,7),(14,12),(13,5),(17,3),(19,10),(19,17),(25,11),(28,11),(26,18),(19,23),(18,27)],"#235747"),
            ([(14,18),(9,15),(5,7),(10,9),(14,14),(16,18)],JADE),
            ([(16,20),(15,13),(15,6),(17,4),(18,10),(18,17)],"#98d2a0"),
            ([(18,22),(21,16),(26,13),(25,17),(22,21)],"#55a977"),
        ]:
            poly(points,color)
        line([(10,11),(15,18),(16,25),(15,28)],"#9d7959",2)
        line([(16,27),(20,28)],GOLD)
        detail(6,7,"#c4f5db")
        d.point((24,15),"#d9f4eb")
    elif item in {"healing_pill", "detox_pill"}:
        detox=item=="detox_pill"
        poly([(9,9),(13,9),(13,5),(21,5),(23,8),(21,12),(25,16),(26,22),(23,26),(11,28),(6,23),(6,16)],OUTLINE)
        poly([(10,12),(20,11),(24,18),(23,24),(12,26),(8,22),(8,16)],"#665582" if detox else "#398b78")
        poly([(9,15),(12,12),(17,12),(15,16),(11,20),(9,20)],"#ae91bb" if detox else "#69c1a3")
        d.rectangle((13,6,21,9),fill=GOLD)
        poly([(13,17),(20,16),(20,22),(13,23)],PARCHMENT)
        if detox:
            line([(16,17),(14,19),(16,22),(19,19),(16,17)],"#665582")
        else:
            line([(16,17),(16,22)],"#659576")
            line([(14,20),(19,19)],"#659576")
    elif item == "qi_pill":
        poly([(15,4),(21,8),(26,10),(28,17),(24,23),(21,28),(13,29),(9,24),(4,21),(4,14),(9,8)],"#344264")
        d.ellipse((7,7,24,24),fill=OUTLINE)
        d.ellipse((8,8,23,23),fill="#a47a44")
        d.ellipse((9,9,22,21),fill="#e2aa57")
        poly([(10,12),(15,9),(19,10),(20,14),(17,16),(13,15),(13,13)],"#ffe1a0")
        line([(12,20),(17,19),(20,16)],"#ae703a",2)
        detail(24,7,"#f0d99d")
        d.point((6,25),"#d4b27e")
    elif item in {"river_fish_common","river_fish_spirit"}:
        spirit = item.endswith("spirit")
        poly([(2,12),(8,14),(13,8),(18,8),(21,6),(21,10),(28,14),(30,18),(26,22),
              (20,23),(16,26),(15,22),(9,20),(2,23),(4,17)],OUTLINE)
        poly([(4,14),(10,16),(15,10),(23,11),(28,16),(26,20),(20,22),(14,21),(9,18),(4,21),(6,17)], JADE if spirit else "#739fa9")
        poly([(12,18),(18,16),(25,16),(27,18),(24,21),(16,20)],"#bde7cf" if spirit else "#ced6c7")
        d.rectangle((23,14,24,15),fill=OUTLINE)
        if spirit:
            detail(7,8,"#b5f1d2")
    elif item == "fishing_rod_basic":
        line([(4,27),(11,17),(24,4),(26,6)],GOLD,3)
        line([(4,27),(11,19)],WOOD,3)
        line([(25,6),(25,13),(23,19),(22,23)],SILVER)
        poly([(20,22),(24,22),(25,25),(22,28),(20,26)],TERRACOTTA)
        line([(21,24),(24,24)],PARCHMENT)
    elif item in {"protective_talisman","jade_token"}:
        if item == "jade_token":
            poly([(12,4),(20,4),(25,10),(25,23),(19,28),(12,27),(7,23),(7,10)],OUTLINE)
            poly([(12,6),(19,6),(23,10),(23,22),(19,25),(13,25),(9,22),(9,11)],"#397d6d")
            poly([(13,8),(19,8),(21,12),(20,20),(16,23),(12,20),(11,14)],JADE)
            d.ellipse((14,11,18,16),outline="#c5e7a2")
        else:
            poly([(7,5),(22,3),(24,8),(24,22),(26,25),(19,28),(8,27),(9,22)],OUTLINE)
            poly([(9,7),(21,5),(22,10),(22,24),(24,25),(18,26),(10,25),(11,22)],"#e2b96e")
            line([(13,10),(18,8),(20,12),(14,13),(18,16),(14,21),(19,21)],TERRACOTTA,2)
    elif item == "wood":
        for x,y in [(6,10),(12,15),(7,20)]:
            poly([(x-2,y),(x+10,y-6),(x+18,y-4),(x+19,y),(x+6,y+7),(x,y+7),(x-2,y+4)], OUTLINE)
            poly([(x,y),(x+11,y-5),(x+17,y-3),(x+17,y),(x+6,y+5)], WOOD)
            line([(x+4,y),(x+15,y-3)],"#ab7750")
            d.ellipse((x,y,x+7,y+6),fill=GOLD)
            d.arc((x+2,y+1,x+6,y+5),0,275,fill=WOOD)
    elif item == "iron_ore":
        poly([(3,21),(6,13),(12,10),(16,5),(22,6),(23,13),(28,15),(29,23),(23,27),(8,26)],OUTLINE)
        poly([(5,21),(9,14),(15,14),(17,7),(21,8),(22,15),(27,16),(27,23),(21,25),(9,24)],"#58636e")
        poly([(9,15),(14,13),(16,16),(13,20),(8,19)],"#9ba6a4")
        poly([(17,9),(20,8),(22,12),(19,15),(16,13)],SILVER)
        poly([(19,18),(25,17),(26,21),(22,23),(19,22)],"#8eb0a6")
    elif item in {"ration","rice_seed"}:
        food=item=="ration"
        poly([(10,7),(7,5),(20,4),(24,6),(21,12),(26,17),(27,23),(23,28),(9,29),(4,24),(6,17),(11,12)],OUTLINE)
        poly([(10,6),(21,5),(22,7),(19,12),(24,17),(25,23),(22,26),(10,27),(6,23),(8,16),(13,12)],"#925341" if food else "#a57d56")
        poly([(9,17),(13,12),(19,12),(23,17),(22,22),(16,24),(10,22)],"#d7b782" if food else "#dfc691")
        line([(11,11),(21,11)],GOLD,2)
        for x,y in [(13,17),(18,16),(18,20),(15,22)]:
            line([(x,y),(x+2,y-1)],"#a67041" if food else "#fff0b7",1)
    elif item == "deer_meat":
        poly([(4,12),(11,8),(16,7),(21,10),(22,15),(27,18),(28,23),(24,27),(12,25),(5,21)],OUTLINE)
        poly([(6,13),(12,10),(17,9),(20,12),(21,17),(26,20),(26,23),(22,25),(12,23),(7,20)],"#ce7d79")
        poly([(8,14),(14,11),(18,11),(19,15),(17,20),(12,22),(7,18)],"#a54854")
        line([(21,19),(26,21)],PARCHMENT,3)
    elif item == "snake_skin":
        poly([(4,12),(7,6),(14,4),(18,7),(17,13),(12,17),(14,19),(24,14),(28,17),(27,23),(23,27),(12,26),(7,23),(8,17),(12,13),(12,10),(8,14)],OUTLINE)
        line([(7,10),(12,7),(15,8),(14,13),(10,18),(11,22),(17,23),(24,18),(25,21),(21,24)],"#8ea97b",3)
        line([(12,8),(13,11),(11,15),(12,19),(17,20)],"#c6c99a")
    elif item == "scorpion_venom":
        poly([(12,5),(20,5),(21,7),(20,13),(25,17),(25,24),(20,27),(11,27),(7,23),(7,16),(12,12)],OUTLINE)
        poly([(13,7),(18,7),(18,14),(23,18),(23,23),(19,25),(12,25),(9,22),(9,17),(14,13)],"#693a81")
        d.rectangle((12,6,19,8),fill=GOLD)
        line([(10,18),(12,16),(13,17),(12,21)],"#c69be7",2)
    else:
        # Neutral missing-art crate. Catalog coverage is checked before saving.
        poly([(5,10),(16,6),(26,10),(26,23),(16,27),(5,23)],OUTLINE)
        poly([(7,11),(16,8),(24,11),(24,21),(16,25),(7,21)],WOOD)
        line([(7,11),(16,15),(24,11)],GOLD,2)
        line([(16,15),(16,24)],GOLD)

    # A one-pixel transparent-background contour sharpens sprites on dark UI.
    alpha = canvas.getchannel("A").filter(ImageFilter.MaxFilter(3))
    border = Image.new("RGBA",(32,32),OUTLINE)
    border.putalpha(alpha)
    return Image.alpha_composite(border, canvas)


def main():
    catalog = (ROOT / "src/dao/ItemCatalog.ts").read_text(encoding="utf-8")
    items = re.findall(r"^  (\w+):\{id:",catalog,re.MULTILINE) + ["unknown"]
    loot = ["wolf_fang","wolf_pelt","boar_tusk","crimson_plate","toad_sac","jade_venom","demon_core","elite_beast_core"]
    legacy = Image.open(ROOT / "public/assets/fauna/monster-v2/monster-loot.png").convert("RGBA")
    frame = legacy.width // len(loot)
    sprite = Image.new("RGBA",(256,32*((len(items)+7)//8)))
    frames = {}
    for index,item in enumerate(items):
        x,y = (index%8)*32,(index//8)*32
        if item in loot:
            start = loot.index(item)*frame
            icon = legacy.crop((start,0,start+frame,legacy.height)).resize((32,32),Image.Resampling.NEAREST)
        else:
            icon = draw_item(item)
        frames[item] = [x,y]
        sprite.paste(icon,(x,y))
    directory = ROOT / "public/assets/items"
    directory.mkdir(parents=True,exist_ok=True)
    sprite.save(directory / "inventory-icons.png")
    (ROOT / "src/dao/ItemIconFrames.json").write_text(json.dumps(frames,indent=2)+"\n",encoding="utf-8")


if __name__ == "__main__":
    main()

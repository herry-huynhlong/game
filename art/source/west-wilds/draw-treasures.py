from pathlib import Path
from PIL import Image, ImageDraw


def plant(index):
    image = Image.new("RGBA", (32, 32))
    draw = ImageDraw.Draw(image)

    def shape(points, color, edge="#222c30"):
        draw.polygon(points, color, edge)

    def leaf(x, y, dx, dy, shade):
        shape([(x, y), (x+dx//2-2, y+dy//2), (x+dx, y+dy),
               (x+dx//2+2, y+dy//2+2)], shade)
        draw.line([(x, y), (x+dx//2, y+dy//2)], "#809e67")

    def fruit(x, y, style, light, dark):
        outlines = [
            [(x-5,y-2),(x-2,y-5),(x+3,y-5),(x+6,y-2),(x+4,y+3),(x+1,y+6),(x-4,y+3)],
            [(x-5,y+1),(x-4,y-3),(x-1,y-5),(x+2,y-4),(x+5,y),(x+3,y+4),(x,y+7),(x-4,y+5)],
            [(x-6,y),(x-5,y-4),(x-1,y-5),(x+2,y-4),(x+6,y-4),(x+6,y+2),(x+2,y+7),(x-3,y+6)],
        ]
        shape(outlines[style], dark)
        shape([(x-3,y-2),(x+2,y-3),(x+3,y),(x,y+3),(x-3,y+1)],light,None)
        draw.point((x-1,y-2), "#fff6ce")

    def blossom(x, y, petals, shadow, center, spread):
        shape([(x-spread,y),(x-4,y-1),(x-6,y-5),(x-2,y-4),(x,y-8),
               (x+3,y-4),(x+7,y-6),(x+5,y-1),(x+spread,y),
               (x+5,y+4),(x,y+6),(x-5,y+4)],shadow)
        shape([(x-5,y-1),(x-3,y-3),(x-1,y),(x,y-5),(x+3,y-2),
               (x+6,y-3),(x+4,y+1),(x,y+3)],petals,None)
        draw.line([(x-1,y+2),(x+2,y+1)],center,2)

    if index in (7, 8):
        long = index == 8
        shape([(13,12),(18,11),(20,16),(19,20),(22,25),(25,27),(21,28),
               (17,24),(16,29),(12,30),(13,24),(9,26),(10,22),(12,19),(11,16)],
              "#795736" if long else "#9d643e")
        draw.line([(15,14),(17,17),(15,22),(15,27)], "#e9c88c" if long else "#dca16b", 2)
        draw.line([(12,19),(16,18),(19,19)], "#694730")
        leaf(16,14,-10,-9,"#427952")
        leaf(16,14,10,-10,"#9aaf65" if long else "#6c9c5d")
        if long:
            leaf(16,13,2,-10,"#a1cfa1")
            draw.point((22,12),"#b9ffcc")
        return image

    if index == 9:
        draw.line([(13,28),(17,20),(22,18)],"#aa6853",3)
        for x,y,w in [(17,16,11),(11,22,8),(24,11,5)]:
            shape([(x-w,y),(x-w+2,y-4),(x-3,y-7),(x+4,y-7),
                   (x+w,y-2),(x+w-1,y+1),(x+2,y+3),(x-4,y+3)],"#883e59")
            draw.line([(x-w+3,y),(x-2,y-4),(x+4,y-4),(x+w-2,y-1)],"#d98386",2)
            draw.line([(x-4,y+1),(x+3,y+1)],"#efb67e")
        return image

    draw.line([(15,28),(16,23),(15,18),(17,12)],"#253d36",3)
    draw.line([(15,27),(17,22),(16,17),(17,12)],"#6f955e")
    if index in (5,6,14):
        colors=[("#75ad6f","#a3d577"),("#70a2a0","#cae5c0"),("#675085","#aca0e6")]
        dark,light=colors[(5,6,14).index(index)]
        for dx,dy in [(-12,-11),(-7,-17),(1,-22),(7,-17),(13,-10)]:
            leaf(16,25,dx,dy+(index%3),dark)
            draw.point((16+dx,25+dy+index%3),light)
        if index==6:
            shape([(13,10),(15,5),(18,8),(17,12),(14,13)],"#d3e5b2")
        if index==14:
            draw.line([(15,21),(15,13),(18,8),(20,11)],"#c3a6f5")
        return image

    leaf(15,24,-11,-7,"#4e8659")
    leaf(17,21,11,-6,"#73a366")
    if index in (3,4,12):
        style={3:("#e2fbfd","#589baa","#fff4a8",10),
               4:("#d88ecc","#7d467f","#f4c672",9),
               12:("#ecdeb5","#889953","#ffe18a",8)}
        blossom(16,14,*style[index])
        if index==4:
            blossom(8,19,"#ac619d","#613c69","#e5bd84",5)
        if index==3:
            draw.line([(7,22),(12,24),(21,24),(25,22)],"#8ac6c1")
        return image

    palette={0:("#c5bbff","#625199",0),1:("#fbb362","#a13a35",1),
             2:("#a5d758","#4f8448",2),10:("#f27777","#902f4a",1),
             11:("#a4efbf","#458e79",2),13:("#ffe67a","#a6843a",0)}
    light,dark,style=palette[index]
    fruit(17,13,style,light,dark)
    if index in (0,10,13):
        fruit(9,18,2,light,dark)
    if index==1:
        leaf(17,9,6,-6,"#b36843")
        draw.point((22,8),"#feda89")
    if index==11:
        leaf(15,11,-9,-7,"#72b278")
        leaf(18,11,7,-8,"#86cfac")
        draw.point((26,8),"#ebffd9")
    return image


def make_sheet(destination):
    sheet = Image.new("RGBA", (15 * 32, 32))
    for index in range(15):
        sheet.paste(plant(index), (index * 32, 0))
    sheet.save(destination)


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[3]
    make_sheet(root / "public/assets/west-wilds/treasures.png")

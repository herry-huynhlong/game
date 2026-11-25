"""Draw the five West Wilds landmarks at native game pixel size."""
from pathlib import Path

from PIL import Image, ImageDraw


def landmark(index):
    img = Image.new('RGBA', (144, 120))
    draw = ImageDraw.Draw(img)
    draw.polygon([(24,105),(47,89),(94,84),(127,92),(136,108),(107,115),(45,113)], fill='#233c38')
    if index in (1, 3):
        draw.polygon([(13,102),(18,77),(33,57),(39,39),(66,20),(91,24),(115,47),(127,76),(133,101),(105,110),(46,110)], fill='#283b3c')
        draw.polygon([(18,97),(23,76),(39,61),(41,44),(69,25),(84,28),(72,43),(57,55),(52,75),(40,99)], fill='#667568')
        draw.polygon([(19,95),(34,79),(39,70),(51,62),(44,77),(44,92),(33,100)], fill='#809184')
        draw.polygon([(83,30),(101,39),(122,66),(125,88),(112,98),(101,86),(95,65),(77,50)], fill='#485b57')
        draw.polygon([(45,104),(49,84),(57,67),(68,58),(84,58),(94,71),(103,104)], fill='#17292f')
        draw.line([(46,100),(54,78),(66,64),(82,62),(89,70)], fill='#95a08a', width=3)
        draw.line([(24,75),(35,73),(42,58),(62,50)], fill='#4f6557', width=3)
        draw.line([(90,37),(111,53),(117,70),(113,82),(123,91)], fill='#657564', width=3)
        if index == 1:
            for x,y,h in [(28,101,33),(105,102,39)]:
                draw.polygon([(x,y),(x+1,y-h),(x+8,y-h-4),(x+15,y-h),(x+16,y),(x+9,y+4)], fill='#69736b')
                draw.line([(x+2,y-2),(x+4,y-h+1),(x+8,y-h-2)], fill='#a0a68a', width=2)
                draw.line([(x+8,y-7),(x+9,y-23),(x+12,y-26)], fill='#88dec7')
    else:
        draw.polygon([(24,91),(49,77),(113,78),(126,90),(126,104),(111,111),(40,111),(24,101)], fill='#495455')
        draw.polygon([(25,89),(50,77),(112,79),(125,89),(113,98),(42,99)], fill='#a4a891')
        draw.polygon([(41,98),(114,97),(114,106),(41,108)], fill='#68726a')
        for x in range(47,111,11):
            draw.line([(x,99),(x,106)], fill='#49595a')
        if index == 4:
            for x in [41, 56, 96, 111]:
                draw.rectangle((x,53,x+5,91),fill='#4a3730')
                draw.line([(x+1,60),(x+1,88)],fill='#a37553')
            draw.polygon([(14,53),(27,50),(40,37),(57,30),(61,20),(88,20),(96,30),(113,35),(124,49),(136,53),(129,56),(29,57)],fill='#20443f')
            draw.polygon([(23,50),(38,46),(52,33),(96,32),(111,43),(129,51),(117,52),(35,53)],fill='#49716b')
            for x in range(39,119,7):
                draw.line([(x+(73-x)//3,32),(x,51)],fill='#284f4a',width=2)
            draw.line([(20,53),(57,55),(107,55),(132,53)],fill='#c39567',width=2)
            for x in [42,106]:
                draw.rectangle((x,58,x+6,66),fill='#cd7051')
                draw.line([(x+2,60),(x+2,64)],fill='#ffcf80')
        elif index == 2:
            for x,y in [(40,94),(70,97),(96,87)]:
                draw.line([(x,y),(x+1,y-12)],fill='#a6b8ba',width=3)
                draw.polygon([(x-10,y-10),(x-7,y-17),(x+3,y-20),(x+9,y-15),(x+7,y-10)],fill='#9c6eaf')
                draw.line([(x-6,y-14),(x,y-17),(x+5,y-16)],fill='#dcb0d5',width=2)
        else:
            draw.polygon([(52,86),(52,57),(61,51),(96,52),(101,57),(101,87),(92,95),(62,94)],fill='#4f6060')
            draw.polygon([(52,57),(62,51),(96,52),(101,57),(91,63),(63,62)],fill='#98a18d')
            draw.line([(57,64),(64,67),(92,66),(97,64)],fill='#7d8377',width=2)
            draw.polygon([(68,53),(72,41),(78,29),(86,41),(87,54),(78,58)],fill='#4aaa9f')
            draw.line([(70,51),(78,34),(77,53)],fill='#c2efda',width=2)
            draw.line([(78,39),(83,46),(84,51)],fill='#79dcca')
    return img


target = Path(__file__).resolve().parents[3] / 'public/assets/west-wilds/landmarks.png'
target.parent.mkdir(parents=True, exist_ok=True)
atlas = Image.new('RGBA', (720, 120))
for frame in range(5):
    atlas.paste(landmark(frame), (frame*144,0))
atlas.save(target)

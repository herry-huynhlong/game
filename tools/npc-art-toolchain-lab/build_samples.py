from copy import deepcopy
from pathlib import Path
import yaml

root = Path(__file__).parent
template = yaml.safe_load((root / "repos/spritekiln/specs/templates/humanoid.yaml").read_text(encoding="utf-8"))


def write_sample(slug, summary, keep, materials, use, remove=None, additions=None, coat=None, head=None):
    s = deepcopy(template)
    s["name"] = slug
    s["size"] = 64
    s["directions"] = 4
    s["palette"] = "xianxia.yaml"
    s["camera"] = {"pitch": 38, "scale": 0.044, "center": [0, 0.95, 0]}
    s["brief"] = {"summary": summary, "head": summary, "must_keep": keep, "simplify": ["no western helmet", "no oversized armor"]}
    s["materials"].update(materials)
    s["use"] = use
    if remove:
        s["remove"] = remove
    if slug == "npc03_city_guard":
        s["parts"].pop("coat", None)
    if head:
        for part in s["use"]:
            if part.get("as") == "head" or part.get("kit") == "head":
                part["with"] = head
    s["parts"]["eye_L"]["prims"][0]["extrude"]["profile"]["rect"][0] = 0.02
    if coat:
        s["parts"]["coat"] = coat
    if additions:
        s["parts"].update(additions)
    target = root / "specs/characters" / slug / f"{slug}.yaml"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(yaml.safe_dump(s, allow_unicode=True, sort_keys=False, width=100), encoding="utf-8")


robe_cross = {
    "material": "gold",
    "space": "pelvis",
    "priority": 2,
    "prims": [
        {"extrude": {"c": [0, 0.29, 0.18], "depth": 0.055, "profile": {"polygon": [[-0.14, 0.52], [-0.105, 0.54], [0.01, 0.23], [-0.02, 0.20]]}}},
        {"extrude": {"c": [0, 0.29, 0.18], "depth": 0.055, "profile": {"polygon": [[0.14, 0.52], [0.105, 0.54], [-0.01, 0.23], [0.02, 0.20]]}}},
    ],
}
rank_knot = {
    "material": "gold",
    "space": "pelvis",
    "priority": 3,
    "prims": [{"sphere": {"c": [0.0, 0.20, 0.20], "r": 0.035}}],
}

write_sample(
    "npc01_qingyun_disciple",
    "young male Qingyun disciple: refined face, black tied hair, jade-and-ivory cross-collar robe, rank sash, sword",
    ["raised black topknot", "ivory inner collar", "jade outer robe", "gold rank knot", "sword in right hand"],
    {"cloth": {"ramp": "robe"}, "hair": {"ramp": "hair", "finish": "matte"}, "leather": {"ramp": "leather"}, "gold": {"ramp": "gold", "finish": "metal"}, "tie": {"ramp": "gold"}, "ink": {"ramp": "stone", "band": 0, "outline": False}},
    [
        {"kit": "head", "as": "head", "at": "head", "with": {"width": 0.96, "jaw": 0.32, "chin": 0.42, "nose": 0.12, "ears": 0}},
        {"kit": "hair", "as": "hair", "at": "head", "with": {"fringe": 0.55, "part": 0.3, "locks": 0.85, "length": 0.15, "volume": 0.9}},
        {"kit": "ponytail", "as": "ponytail", "at": "head", "with": {"height": 0.88, "length": 1.7, "volume": 0.9, "cheat": 0.8}},
    ],
    remove=None,
    additions={"robe_cross": robe_cross, "rank_knot": rank_knot,
        "sword_grip": {"material": "leather", "space": "wrist_R", "priority": 3, "prims": [{"cylinder": {"a": [0, -0.07, 0], "b": [0, 0.06, 0], "r": 0.022}}]},
        "sword_guard": {"material": "gold", "space": "wrist_R", "priority": 3, "prims": [{"extrude": {"c": [0, 0.075, 0], "depth": 0.055, "profile": {"polygon": [[-0.07, 0], [-0.05, 0.025], [0.05, 0.025], [0.07, 0], [0.04, -0.022], [-0.04, -0.022]]}}}]},
        "sword_blade": {"material": "steel", "space": "wrist_R", "priority": 3, "prims": [{"extrude": {"c": [0, 0.09, 0], "depth": 0.055, "profile": {"polygon": [[-0.023, 0], [0.023, 0], [0.024, 0.31], [0, 0.39], [-0.024, 0.31]]}}}]},
    },
    coat={"material": "cloth", "space": "coatbase", "blend": 0.02, "prims": [{"cone": {"a": [0, 0.05, -0.01], "b": [0, -0.43, -0.04], "r": [0.22, 0.30]}}], "cut": [{"cone": {"a": [0, -0.10, 0.20], "b": [0, -0.46, 0.30], "r": [0.045, 0.13]}}]},
)

female_cross = deepcopy(robe_cross)
female_cross["material"] = "robe_trim"
female_rank = {"material": "gold", "space": "pelvis", "priority": 3, "prims": [{"ellipsoid": {"c": [0.0, 0.18, 0.205], "r": [0.035, 0.048, 0.018]}}]}
write_sample(
    "npc02_female_cultivator",
    "young female Qingyun cultivator: distinct delicate face, dark tied long hair, flowing teal-and-ivory robe",
    ["slim face", "long tied hair and bun", "teal flowing robe", "ivory crossed collar", "jade rank clasp"],
    {"cloth": {"ramp": "jade"}, "robe_trim": {"ramp": "robe"}, "hair": {"ramp": "hair", "finish": "matte"}, "leather": {"ramp": "leather"}, "gold": {"ramp": "gold", "finish": "metal"}, "tie": {"ramp": "robe"}, "ink": {"ramp": "stone", "band": 0, "outline": False}},
    [
        {"kit": "head", "as": "head", "at": "head", "with": {"width": 0.9, "jaw": 0.28, "chin": 0.58, "nose": 0.08, "ears": 0}},
        {"kit": "hair", "as": "hair", "at": "head", "with": {"fringe": 0.7, "part": 0.42, "locks": 0.95, "length": 0.08, "volume": 0.9}},
        {"kit": "bun", "as": "bun", "at": "head", "with": {"height": 0.9, "size": 0.82, "wrap": True}},
        {"kit": "ponytail", "as": "ponytail", "at": "head", "with": {"height": 0.72, "length": 1.55, "volume": 0.75, "cheat": -0.5}},
    ],
    remove=None,
    additions={"robe_cross": female_cross, "rank_knot": female_rank},
    coat={"material": "cloth", "space": "coatbase", "blend": 0.02, "prims": [{"cone": {"a": [0, 0.05, -0.01], "b": [0, -0.46, -0.04], "r": [0.21, 0.31]}}], "cut": [{"cone": {"a": [0, -0.10, 0.20], "b": [0, -0.48, 0.30], "r": [0.04, 0.12]}}]},
    head={"width": 0.9, "jaw": 0.28, "chin": 0.58, "nose": 0.08, "ears": 0},
)

guard = {
    "chest_plate": {"material": "steel", "space": "pelvis", "blend": 0.015, "prims": [{"extrude": {"c": [0, 0.36, 0.17], "depth": 0.10, "round": 0.035, "profile": {"polygon": [[-0.19, 0.53], [0.19, 0.53], [0.16, 0.18], [0.07, 0.09], [-0.07, 0.09], [-0.16, 0.18]]}}}], "paint": [{"material": "gold", "stripes": {"axis": "y", "at": [0.50], "width": 0.05}}]},
    "shoulder_L": {"material": "steel", "space": "shoulder_L", "priority": 2, "prims": [{"ellipsoid": {"c": [0, 0.02, 0.02], "r": [0.11, 0.08, 0.10]}}]},
    "sash": {"material": "leather", "space": "pelvis", "priority": 3, "prims": [{"box": {"c": [0.17, 0.04, 0.10], "half": [0.035, 0.13, 0.035], "round": 0.02}}]},
    "dao_grip": {"material": "leather", "space": "wrist_R", "priority": 3, "prims": [{"cylinder": {"a": [0, -0.07, 0], "b": [0, 0.06, 0], "r": 0.022}}]},
    "dao_guard": {"material": "gold", "space": "wrist_R", "priority": 3, "prims": [{"extrude": {"c": [0, 0.075, 0], "depth": 0.055, "profile": {"polygon": [[-0.08, 0], [-0.05, 0.025], [0.05, 0.025], [0.08, 0], [0.04, -0.022], [-0.04, -0.022]]}}}]},
    "dao_blade": {"material": "steel", "space": "wrist_R", "priority": 3, "prims": [{"extrude": {"c": [0, 0.09, 0], "depth": 0.055, "round": 0.008, "profile": {"polygon": [[-0.024, 0], [0.026, 0], [0.035, 0.16], [0.058, 0.30], [0.034, 0.28], [0.012, 0.20], [-0.022, 0.09]]}}}]},
}
write_sample(
    "npc03_city_guard",
    "adult male Qingyun city guard: mature face, tied hair, light dark-teal lamellar armour with brown sash and a dao",
    ["mature square-jawed face", "neatly tied hair", "light dark-teal armor", "brown utility sash", "curved dao held in right hand"],
    {"cloth": {"ramp": "cloth"}, "hair": {"ramp": "hair", "finish": "matte"}, "leather": {"ramp": "leather", "bands": [1, 3]}, "steel": {"ramp": "steel", "finish": "metal"}, "gold": {"ramp": "gold", "finish": "metal"}, "ink": {"ramp": "stone", "band": 0, "outline": False}},
    [
        {"kit": "head", "as": "head", "at": "head", "with": {"width": 1.08, "jaw": 0.62, "chin": 0.32, "nose": 0.2, "ears": 0}},
        {"kit": "hair", "as": "hair", "at": "head", "with": {"fringe": 0.28, "part": 0.5, "locks": 0.45, "length": 0.04, "volume": 0.8}},
    ],
    remove=None,
    additions=guard,
    coat=None,
    head={"width": 1.08, "jaw": 0.62, "chin": 0.32, "nose": 0.2, "ears": 0},
)

print("Wrote exactly three original SpriteKiln trial specs.")

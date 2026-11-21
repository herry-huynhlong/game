"""Prepare imagegen art as a coherent pixel asset atlas and rebuild the city market.

This is deliberately separate from the superseded GFX.3B generator. The generated
bitmap is the artwork source; this script only removes chroma spill, pixelizes it,
packs frames, and updates Tiled object metadata without changing map dimensions.
"""
from __future__ import annotations

import json
import math
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
SOURCE = Path(r"C:\Users\LONG_IT\.codex\generated_images\01a1e29f-edf4-7f43-b223-be451185749c\exec-7aed74eb-eebd-47d0-b83e-1ada1f2de2f6.png")
ART = ROOT / "art" / "source" / "gfx3c"
ASSETS = ROOT / "public" / "assets" / "props"
ATLAS_PNG = ASSETS / "settlement_buildings.png"
ATLAS_JSON = ASSETS / "settlement_buildings.json"
MAP = ROOT / "maps" / "thanh_van_world.tmj"
CELL = 192
COLS = 5

ASSET_CELLS = {
    "common_house": 0,
    "inn_front": 1,
    "apothecary_front": 2,
    "smith_front": 3,
    "herb_stall": 4,
    "pill_stall": 5,
    "artifact_stall": 6,
    "wall_straight": 7,
    "wall_corner": 8,
    "city_gate": 9,
    "broad_tree": 10,
    "bamboo": 11,
    "grass_sample": 12,
    "stone_sample": 13,
    "lantern": 14,
    "market_props": 15,
}


def pixel_frame(sheet: Image.Image, index: int) -> Image.Image:
    col, row = index % 4, index // 4
    # The raster generator delivered a 1254 square, so distribute fractional cell
    # boundaries evenly rather than accumulating a crop offset.
    x0, x1 = round(col * sheet.width / 4), round((col + 1) * sheet.width / 4)
    y0, y1 = round(row * sheet.height / 4), round((row + 1) * sheet.height / 4)
    frame = sheet.crop((x0, y0, x1, y1)).convert("RGBA")
    px = frame.load()
    for y in range(frame.height):
        for x in range(frame.width):
            r, g, b, a = px[x, y]
            # Transparent generation left isolated RGB-key spill pixels around
            # cutouts. Remove only pure primary/secondary key colors; keep warm
            # lanterns, banners and natural foliage.
            if a and max(r, g, b) >= 245 and sorted((r, g, b))[1] <= 8:
                px[x, y] = (0, 0, 0, 0)
            elif 0 < a < 160:
                # Remove the weak semi-transparent fringe from the generated
                # cutout. Opaque shadows are retained for the game sprite.
                px[x, y] = (0, 0, 0, 0)
    bbox = frame.getchannel("A").getbbox()
    if bbox:
        frame = frame.crop(bbox)
    frame.thumbnail((CELL - 12, CELL - 12), Image.Resampling.LANCZOS)
    fit = {0: (132, 142), 4: (116, 104), 5: (116, 104), 6: (116, 104)}.get(index)
    if fit:
        frame = frame.resize(fit, Image.Resampling.NEAREST)
    canvas = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    canvas.alpha_composite(frame, ((CELL - frame.width) // 2, CELL - frame.height))
    # Coarsen painterly anti-aliasing into intentional clusters at game scale.
    small = canvas.resize((64, 64), Image.Resampling.BOX)
    canvas = small.resize((CELL, CELL), Image.Resampling.NEAREST)
    return canvas


def atlas_frame(x: int, y: int) -> dict:
    return {
        "frame": {"x": x, "y": y, "w": CELL, "h": CELL},
        "rotated": False,
        "trimmed": False,
        "spriteSourceSize": {"x": 0, "y": 0, "w": CELL, "h": CELL},
        "sourceSize": {"w": CELL, "h": CELL},
    }


def add_properties(obj: dict, values: dict[str, str]) -> None:
    props = {p["name"]: p for p in obj.get("properties", [])}
    for key, value in values.items():
        props[key] = {"name": key, "type": "string", "value": value}
    obj["properties"] = list(props.values())


def build_atlas() -> dict:
    if not SOURCE.exists():
        raise FileNotFoundError(f"Generated artwork source missing: {SOURCE}")
    source_copy = ART / "imagegen-environment-atlas.png"
    if not source_copy.exists():
        shutil.copy2(SOURCE, source_copy)
    art = Image.open(source_copy).convert("RGBA")
    if art.size != (1254, 1254):
        raise ValueError(f"Unexpected source art dimensions: {art.size}")

    old_image = Image.open(ATLAS_PNG).convert("RGBA")
    old_data = json.loads(ATLAS_JSON.read_text(encoding="utf-8"))
    frames = dict(old_data["frames"])
    rows = 8
    sheet = Image.new("RGBA", (COLS * CELL, rows * CELL), (0, 0, 0, 0))

    replacements = {
        "city_gate": "city_gate",
        "city_wall": "wall_straight",
        "market_stall": "herb_stall",
        "food_hall": "common_house",
        "inn": "inn_front",
        "forge": "smith_front",
        "apothecary": "apothecary_front",
        "city_hall": "inn_front",
        "residential_house": "common_house",
        "sect_gate": "city_gate",
        "sect_hall": "inn_front",
        "disciple_house": "common_house",
        "sect_storehouse": "pill_stall",
        "blackwind_camp": "smith_front",
        "city_tree": "broad_tree",
        "pine_tree": "bamboo",
        "ancient_tree": "broad_tree",
        "lantern_post": "lantern",
    }
    generated = {name: pixel_frame(art, idx) for name, idx in ASSET_CELLS.items()}
    # Build a common limited palette from opaque art only, so the imported
    # generated raster reads as one intentional pixel-art set in-game.
    palette_source = Image.new("RGB", (CELL * len(generated), CELL), (16, 24, 22))
    for i, sprite in enumerate(generated.values()):
        palette_source.paste(sprite.convert("RGB"), (i * CELL, 0), sprite.getchannel("A"))
    shared_palette = palette_source.quantize(colors=64, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    for name, sprite in list(generated.items()):
        alpha = sprite.getchannel("A")
        indexed = sprite.convert("RGB").quantize(palette=shared_palette, dither=Image.Dither.NONE)
        generated[name] = indexed.convert("RGB").convert("RGBA")
        generated[name].putalpha(alpha)
    existing_names = list(frames)
    for i, name in enumerate(existing_names):
        x, y = (i % COLS) * CELL, (i // COLS) * CELL
        if name == "market_cart":
            # Leave the old frame's atlas cell empty: no wheeled market art is
            # retained in the runtime atlas.
            frames.pop(name, None)
            continue
        if name in replacements:
            sprite = generated[replacements[name]]
        else:
            f = frames[name]["frame"]
            sprite = old_image.crop((f["x"], f["y"], f["x"] + f["w"], f["y"] + f["h"]))
            sprite = sprite.resize((CELL, CELL), Image.Resampling.NEAREST)
        sheet.alpha_composite(sprite, (x, y))
        frames[name] = atlas_frame(x, y)

    # Append bespoke market variants and the wall/terrain variations.
    frames.pop("market_cart", None)
    appended = ["herb_stall", "pill_stall", "artifact_stall", "wall_corner", "bamboo_clump", "grass_ground", "stone_paving", "market_props"]
    for j, name in enumerate(appended):
        x, y = (j % COLS) * CELL, (6 + j // COLS) * CELL
        if name == "herb_stall": sprite = generated["herb_stall"]
        elif name == "pill_stall": sprite = generated["pill_stall"]
        elif name == "artifact_stall": sprite = generated["artifact_stall"]
        elif name == "wall_corner": sprite = generated["wall_corner"]
        elif name == "bamboo_clump": sprite = generated["bamboo"]
        elif name == "grass_ground": sprite = generated["grass_sample"]
        elif name == "stone_paving": sprite = generated["stone_sample"]
        else: sprite = generated["market_props"]
        sheet.alpha_composite(sprite, (x, y))
        frames[name] = atlas_frame(x, y)

    sheet.save(ATLAS_PNG)
    ATLAS_JSON.write_text(json.dumps({
        "frames": frames,
        "meta": {"image": ATLAS_PNG.name, "format": "RGBA8888", "size": {"w": sheet.width, "h": sheet.height}, "scale": "1"},
    }, indent=2), encoding="utf-8")
    return {"frames": frames, "replacements": replacements}


def rebuild_grass() -> None:
    """Unify the eight grass slots; the old first slot accidentally held asphalt-like paving."""
    import random
    from PIL import ImageDraw

    path = ROOT / "public" / "assets" / "tilesets" / "qingyun_terrain.png"
    im = Image.open(path).convert("RGBA")
    draw = ImageDraw.Draw(im)
    base = (76, 119, 80, 255)
    shades = [(55, 94, 65, 255), (91, 142, 91, 255), (111, 155, 101, 255), (58, 105, 69, 255)]
    for idx in range(8):
        ox = (idx % 16) * 32
        oy = (idx // 16) * 32
        draw.rectangle((ox, oy, ox + 31, oy + 31), fill=base)
        # Three small intentional grass clusters per 32px tile. Keep the base
        # identical across all variants so the lawn never becomes checkerboard.
        rng = random.Random(2300 + idx)
        anchors = [(5 + rng.randrange(2), 7 + rng.randrange(2)), (20 + rng.randrange(2), 19 + rng.randrange(2)), (9 + rng.randrange(2), 26)]
        for j, (x, y) in enumerate(anchors):
            color = shades[(idx + j) % len(shades)]
            draw.line((ox + x, oy + y + 3, ox + x, oy + y), fill=color, width=1)
            draw.line((ox + x, oy + y + 1, ox + x - 2, oy + y - 1), fill=color, width=1)
            draw.line((ox + x, oy + y + 1, ox + x + 2, oy + y - 2), fill=color, width=1)
    im.save(path)


def rebuild_paving() -> None:
    """Draw a legible, staggered blue-gray ashlar set in tile IDs 17-32."""
    from PIL import ImageDraw

    path = ROOT / "public" / "assets" / "tilesets" / "qingyun_terrain.png"
    im = Image.open(path).convert("RGBA")
    draw = ImageDraw.Draw(im)
    mortar = (67, 83, 78, 255)
    stones = [(119, 132, 121, 255), (133, 143, 130, 255), (145, 148, 133, 255), (107, 123, 115, 255)]
    top_lights = [(174, 176, 154, 255), (157, 169, 151, 255), (184, 179, 153, 255)]
    for idx in range(16):
        ox, oy = idx * 32 % 512, (idx * 32 // 512 + 1) * 32
        draw.rectangle((ox, oy, ox + 31, oy + 31), fill=mortar)
        widths = (16, 15, 17) if idx % 2 == 0 else (14, 17, 16)
        y, row = 0, 0
        while y < 32:
            h = (10, 11, 11)[(row + idx) % 3]
            cursor = -((idx * 5 + row * 11) % 18)
            col = 0
            while cursor < 32:
                w = widths[(col + row) % len(widths)]
                left, right = max(ox, ox + cursor + 1), min(ox + 31, ox + cursor + w)
                top, bottom = oy + y + 1, min(oy + 31, oy + y + h)
                if right > left and bottom > top:
                    fill = stones[(idx + row + col) % len(stones)]
                    draw.polygon([(left, top + 1), (left + 2, top), (right - 2, top), (right, top + 2), (right, bottom - 1), (right - 2, bottom), (left + 1, bottom)], fill=fill)
                    draw.line((left + 3, top + 2, min(right - 3, left + 7), top + 2), fill=top_lights[(idx + col) % len(top_lights)], width=1)
                cursor += w + 1
                col += 1
            y += h
            row += 1
    im.save(path)


def update_map() -> dict:
    m = json.loads(MAP.read_text(encoding="utf-8"))
    layers = {layer["name"]: layer for layer in m["layers"]}
    props = layers["WorldProps"]["objects"]
    collisions = layers["Collision"]["objects"]
    # Keep every current door, site, prop anchor and collision footprint intact;
    # only remove explicit wheel-cart art and replace two stalls' frames.
    removed_ids = set()
    kept = []
    removed_carts = 0
    removed_scatter = 0
    for obj in props:
        sprite = next((p["value"] for p in obj.get("properties", []) if p["name"] == "sprite"), obj["name"])
        if any(p.get("name") == "source" and p.get("value") == "gfx3c" for p in obj.get("properties", [])):
            continue
        if sprite == "market_cart" or obj.get("name") == "market_cart":
            removed_ids.add(obj["id"])
            removed_carts += 1
            continue
        if obj.get("name", "").startswith("GFX3B ") and sprite in {"shrub_cluster", "flower_patch", "boulder", "stone_lamp"}:
            removed_scatter += 1
            continue
        if obj.get("name") == "market_stall":
            stall_index = sum(1 for o in kept if o.get("name") == "market_stall")
            add_properties(obj, {"sprite": ("herb_stall", "pill_stall")[stall_index % 2]})
        kept.append(obj)
    props[:] = kept
    all_object_ids = [o.get("id", 0) for layer in m["layers"] if layer.get("type") == "objectgroup" for o in layer.get("objects", [])]
    next_id = max(all_object_ids, default=0) + 1
    for x, y, sprite in ((2575, 900, "artifact_stall"), (2925, 900, "herb_stall")):
        props.append({
            "id": next_id, "name": "GFX3C " + sprite, "type": "prop", "gid": 1,
            "x": x, "y": y, "width": 128, "height": 128, "rotation": 0, "visible": True,
            "properties": [
                {"name": "sprite", "type": "string", "value": sprite},
                {"name": "source", "type": "string", "value": "gfx3c"},
            ],
        })
        next_id += 1
    # Collision around the four fixed stall footprints already existed in GFX.3B;
    # remove any accidental cart-specific obstacles, never the market site blocks.
    collisions[:] = [o for o in collisions if o.get("name") not in {"market_cart_base", "market_cart_wheel"}]
    collisions[:] = [o for o in collisions if not any(p.get("name") == "source" and p.get("value") == "gfx3c" for p in o.get("properties", []))]
    for x, y, name in ((2575, 900, "gfx3c_artifact_stall_base"), (2925, 900, "gfx3c_herb_stall_base")):
        collisions.append({
            "id": next_id, "name": name, "type": "solid", "x": x + 17, "y": y - 35,
            "width": 94, "height": 27, "rotation": 0, "visible": True,
            "properties": [{"name": "source", "type": "string", "value": "gfx3c"}],
        })
        next_id += 1
    m["nextobjectid"] = max(next_id, m.get("nextobjectid", 1))
    MAP.write_text(json.dumps(m, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return {"map": m, "removed_carts": removed_carts, "removed_scatter": removed_scatter}


def main() -> None:
    atlas = build_atlas()
    rebuild_paving()
    rebuild_grass()
    result = update_map()
    create_preview(atlas["frames"], result["map"])
    print(f"GFX.3C atlas packed; removed {result['removed_carts']} wheeled market carts and {result['removed_scatter']} rough decorative props; added market obstacle collision; kept map {result['map']['width']}x{result['map']['height']} and all activity/collision anchors.")


def create_preview(frames: dict, m: dict) -> None:
    terrain = Image.open(ROOT / "public" / "assets" / "tilesets" / "qingyun_terrain.png").convert("RGBA")
    atlas = Image.open(ATLAS_PNG).convert("RGBA")
    crop = (2240, 288, 3712, 1424)
    canvas = Image.new("RGBA", (crop[2] - crop[0], crop[3] - crop[1]), (20, 32, 27, 255))
    layers = {layer["name"]: layer for layer in m["layers"]}
    for layer_name in ("Ground", "Paths", "Details"):
        layer = layers[layer_name]
        for ty in range(crop[1] // 32, crop[3] // 32):
            for tx in range(crop[0] // 32, crop[2] // 32):
                gid = layer["data"][ty * m["width"] + tx]
                if not gid:
                    continue
                sx, sy = ((gid - 1) % 16) * 32, ((gid - 1) // 16) * 32
                canvas.alpha_composite(terrain.crop((sx, sy, sx + 32, sy + 32)), (tx * 32 - crop[0], ty * 32 - crop[1]))
    for obj in sorted(layers["WorldProps"]["objects"], key=lambda o: o.get("y", 0)):
        x, y = obj.get("x", 0), obj.get("y", 0)
        if x < crop[0] - 220 or x > crop[2] or y < crop[1] or y > crop[3] + 200:
            continue
        name = next((p["value"] for p in obj.get("properties", []) if p.get("name") == "sprite"), None)
        if not name or name not in frames:
            continue
        f = frames[name]["frame"]
        sprite = atlas.crop((f["x"], f["y"], f["x"] + f["w"], f["y"] + f["h"]))
        if obj.get("rotation"):
            sprite = sprite.rotate(-obj["rotation"], expand=True, resample=Image.Resampling.NEAREST)
        canvas.alpha_composite(sprite, (int(x + obj.get("width", 128) / 2 - sprite.width / 2 - crop[0]), int(y - sprite.height - crop[1])))
    preview = ROOT / "art" / "previews"
    preview.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(preview / "thanh-van-thanh-gfx3c-layout.png")
    canvas.resize((canvas.width * 3, canvas.height * 3), Image.Resampling.NEAREST).convert("RGB").save(preview / "thanh-van-thanh-gfx3c-layout-3x.png")


if __name__ == "__main__":
    main()

"""Compose the three GFX.5B.5 areas into one playable Tiled world."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]
MAPS = ROOT / 'maps'
AREA = MAPS / 'gfx5b5'
OUT = MAPS / 'QingyunWorldGFX5B5.tmj'
RUNTIME_OUT = ROOT / 'public' / 'maps' / 'QingyunWorldGFX5B5.tmj'
TILE = 32
WIDTH, HEIGHT = 160, 50
PLACEMENTS = [
    ('QingyunWildernessV2.tmj', 0),
    ('QingyunCityV2.tmj', 48),
    ('QingyunSectV2.tmj', 112),
]
TILE_LAYERS = ['Ground', 'Shore', 'Cliffs', 'Paths', 'Details']
OBJECT_LAYERS = ['Scenery', 'Collision', 'Zones', 'Spawns', 'ActivitySites']

def props(obj):
    return {p['name']: p['value'] for p in obj.get('properties', [])}

def main():
    source_maps = [(json.loads((AREA / name).read_text(encoding='utf-8')), x) for name, x in PLACEMENTS]
    source_w, source_h = 48, 32
    # Natural grass under the extended southern play area; paved city court and paths
    # continue below the sample maps so existing NPC homes at y=1,200 remain walkable.
    ground = [1 + ((x * 13 + y * 7) % 8) for y in range(HEIGHT) for x in range(WIDTH)]
    paths = [0] * (WIDTH * HEIGHT)
    shore = [0] * (WIDTH * HEIGHT)
    cliffs = [0] * (WIDTH * HEIGHT)
    details = [0] * (WIDTH * HEIGHT)
    for m, tx in source_maps:
        for layer_name, target in [('Ground', ground), ('Paths', paths), ('Shore', shore), ('Cliffs', cliffs), ('Details', details)]:
            src = next(l for l in m['layers'] if l['name'] == layer_name)['data']
            for y in range(source_h):
                start_src = y * source_w
                start_dst = y * WIDTH + tx
                target[start_dst:start_dst + source_w] = src[start_src:start_src + source_w]

    # Continue city paving and its east-west avenue through the connector.
    city_start = 48
    city_end = 112
    for y in range(32, HEIGHT):
        for x in range(city_start, city_end):
            ground[y * WIDTH + x] = 33 + ((x * 3 + y * 5) % 8)
    for y in range(14, 18):
        for x in range(96, 112):
            paths[y * WIDTH + x] = 81 + ((x + y) % 8)
    for y in range(32, HEIGHT):
        for x in range(67, 74):
            paths[y * WIDTH + x] = 81 + ((x + y) % 8)
    for y in range(41, 45):
        for x in range(city_start, city_end):
            paths[y * WIDTH + x] = 81 + ((x + y) % 8)
    # A stone approach continues from the south gate into the sect's expanded grounds.
    for y in range(32, HEIGHT):
        for x in range(132, 137):
            paths[y * WIDTH + x] = 81 + ((x * 2 + y) % 8)

    # Object IDs must be globally unique in a Tiled map. Preserve the IDs that connect
    # the existing destructible house/tree save records to their visual objects.
    reserved = {145, 146, 185, 10185}
    next_id = 1
    all_objects = {name: [] for name in OBJECT_LAYERS}
    id_map = {}
    for m, tx in source_maps:
        for layer_name in OBJECT_LAYERS:
            src_layer = next((l for l in m['layers'] if l['name'] == layer_name), None)
            if not src_layer:
                continue
            for original in src_layer['objects']:
                # Preview actors stay runtime-owned; the real simulated NPCs come from save data.
                if layer_name == 'Scenery' and props(original).get('atlas') == 'actors':
                    continue
                obj = json.loads(json.dumps(original))
                obj['x'] = obj.get('x', 0) + tx * TILE
                p = props(obj)
                if layer_name == 'Spawns' and obj.get('type') == 'enemySpawn':
                    obj['type'] = 'enemy'
                if layer_name == 'ActivitySites' and 'kind' in p and not any(x['name'] == 'site' for x in obj.get('properties', [])):
                    obj.setdefault('properties', []).append({'name': 'site', 'type': 'string', 'value': p['kind']})
                old_id = obj['id']
                while next_id in reserved:
                    next_id += 1
                obj['id'] = next_id
                id_map[(layer_name, old_id, tx)] = next_id
                next_id += 1
                all_objects[layer_name].append(obj)

    # Re-add the established destructible tree and house anchors at their save-backed coordinates.
    def object_id(layer_name):
        nonlocal next_id
        while next_id in reserved:
            next_id += 1
        v = next_id
        next_id += 1
        return v
    def add_prop(obj_id, name, frame, x, y, width, height, atlas='settlement-buildings'):
        all_objects['Scenery'].append({
            'id': obj_id, 'name': name, 'type': 'scenery', 'x': x, 'y': y,
            'width': width, 'height': height, 'rotation': 0, 'visible': True,
            'gid': 257 + (20 if frame == 'city_tree' else 12),
            'properties': [
                {'name': 'atlas', 'type': 'string', 'value': atlas},
                {'name': 'frame', 'type': 'string', 'value': frame},
                {'name': 'interactive', 'type': 'bool', 'value': False},
                {'name': 'dynamic', 'type': 'bool', 'value': True},
            ],
        })
    add_prop(185, 'city-tree-2480', 'city_tree', 2480, 452, 128, 128)
    add_prop(145, 'city-house-residential-2870', 'residential_house', 2870, 1040, 128, 128)
    all_objects['Collision'].append({'id': 10185, 'name': 'city-tree-trunk', 'type': 'solid', 'x': 2531, 'y': 427, 'width': 26, 'height': 18, 'rotation': 0, 'visible': True, 'properties': []})
    all_objects['Collision'].append({'id': 146, 'name': 'residential-house-base', 'type': 'blocking', 'x': 2887, 'y': 1005, 'width': 94, 'height': 27, 'rotation': 0, 'visible': True, 'properties': []})

    # Translate embedded tileset image paths for a map at maps/ rather than maps/gfx5b5/.
    tilesets = []
    for src in source_maps[0][0]['tilesets']:
        ts = json.loads(json.dumps(src))
        ts['image'] = '../public/assets/' + ('tilesets/gfx5b5_area_terrain.png' if ts['name'] == 'GFX5B5AreaTerrain' else 'props/settlement_buildings.png' if ts['name'] == 'QingyunSettlementAssets' else 'props/gfx5b5_area_props.png')
        tilesets.append(ts)
    def tile_layer(layer_id, name, data):
        return {'id': layer_id, 'name': name, 'type': 'tilelayer', 'x': 0, 'y': 0, 'width': WIDTH, 'height': HEIGHT,
                'opacity': 1, 'visible': True, 'offsetx': 0, 'offsety': 0, 'parallaxx': 1, 'parallaxy': 1,
                'tintcolor': None, 'data': data}
    def obj_layer(layer_id, name):
        return {'id': layer_id, 'name': name, 'type': 'objectgroup', 'draworder': 'topdown', 'opacity': 1, 'visible': True, 'objects': all_objects.get(name, [])}
    layers = [tile_layer(1, 'Ground', ground), tile_layer(2, 'Shore', shore), tile_layer(3, 'Cliffs', cliffs), tile_layer(4, 'Paths', paths), tile_layer(5, 'Details', details)]
    layers.extend(obj_layer(i + 6, name) for i, name in enumerate(OBJECT_LAYERS))
    layers.insert(8, obj_layer(12, 'Actors'))
    # Retain an empty Actors object layer as a clear editor boundary for runtime-owned actors.
    m = {'type': 'map', 'version': '1.10', 'tiledversion': '1.12.2', 'orientation': 'orthogonal', 'renderorder': 'right-down',
         'width': WIDTH, 'height': HEIGHT, 'tilewidth': TILE, 'tileheight': TILE, 'infinite': False, 'nextlayerid': 13,
         'nextobjectid': max(next_id, 10186), 'backgroundcolor': '#263d31', 'class': 'QingyunWorldGFX5B5',
         'properties': [{'name': 'areaOrder', 'type': 'string', 'value': 'wilderness,city,sect'},
                        {'name': 'gfx5b5UnifiedWorld', 'type': 'bool', 'value': True}],
         'layers': layers, 'tilesets': tilesets}
    OUT.write_text(json.dumps(m, ensure_ascii=False, indent=1), encoding='utf-8')
    runtime_map = json.loads(json.dumps(m))
    for ts in runtime_map['tilesets']:
        ts['image'] = ts['image'].replace('../public/assets/', '../assets/')
    RUNTIME_OUT.parent.mkdir(parents=True, exist_ok=True)
    RUNTIME_OUT.write_text(json.dumps(runtime_map, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'Created {OUT} ({WIDTH}x{HEIGHT} tiles; 3 connected regions; {sum(len(v) for v in all_objects.values())} objects).')

if __name__ == '__main__':
    main()

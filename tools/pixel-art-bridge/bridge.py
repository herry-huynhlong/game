"""Editable pixel documents and OpenRaster export; Pillow is used for packaging.

This does not control Pixelorama and does not manufacture finished artwork.
"""
import argparse
import io
import json
import pathlib
import zipfile
import xml.etree.ElementTree as ET
from PIL import Image


def write_new(path, data):
    path = pathlib.Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('xb') as f:
        f.write(data)


def image_bytes(image):
    buffer = io.BytesIO()
    image.save(buffer, format='PNG')
    return buffer.getvalue()


def load(path):
    data = json.loads(pathlib.Path(path).read_text(encoding='utf-8'))
    w, h = data['width'], data['height']
    if not (1 <= w <= 2048 and 1 <= h <= 2048 and data['frames'] and data['layers']):
        raise ValueError('Invalid canvas, frames or layers')
    for frame in data['frames']:
        if frame.get('duration_ms', 0) <= 0:
            raise ValueError('Invalid frame duration')
        for layer, pixels in frame.get('pixels', {}).items():
            if layer not in data['layers']:
                raise ValueError(f'Unknown layer {layer}')
            for pixel in pixels:
                x, y, color = pixel
                if not (0 <= x < w and 0 <= y < h and color in data['palette']):
                    raise ValueError(f'Invalid pixel {pixel}')
    return data


def frame_layers(doc, frame):
    images = []
    for name in doc['layers']:
        im = Image.new('RGBA', (doc['width'], doc['height']))
        for x, y, key in frame.get('pixels', {}).get(name, []):
            rgba = doc['palette'][key]
            if len(rgba) != 4 or any(not 0 <= v <= 255 for v in rgba):
                raise ValueError(f'Invalid RGBA {key}')
            im.putpixel((x, y), tuple(rgba))
        images.append(im)
    return images


def composite(doc, frame):
    result = Image.new('RGBA', (doc['width'], doc['height']))
    for layer in frame_layers(doc, frame):
        result.alpha_composite(layer)
    return result


def ora(doc, frame):
    images = frame_layers(doc, frame)
    output = io.BytesIO()
    root = ET.Element('image', {'version': '0.0.3', 'w': str(doc['width']), 'h': str(doc['height']), 'name': 'Pixel Art Bridge'})
    stack = ET.SubElement(root, 'stack')
    with zipfile.ZipFile(output, 'w') as z:
        z.writestr('mimetype', 'image/openraster', compress_type=zipfile.ZIP_STORED)
        for i in reversed(range(len(images))):
            src = f'data/layer{i}.png'
            ET.SubElement(stack, 'layer', {'name': doc['layers'][i], 'src': src, 'opacity': '1.0', 'visibility': 'visible', 'composite-op': 'svg:src-over', 'x': '0', 'y': '0'})
            z.writestr(src, image_bytes(images[i]))
        z.writestr('stack.xml', ET.tostring(root, encoding='utf-8', xml_declaration=True))
        z.writestr('mergedimage.png', image_bytes(composite(doc, frame)))
    return output.getvalue()


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest='command', required=True)
    new = sub.add_parser('new'); new.add_argument('path'); new.add_argument('--width', type=int, required=True); new.add_argument('--height', type=int, required=True)
    for command in ['check', 'export']:
        p = sub.add_parser(command); p.add_argument('project')
        if command == 'export': p.add_argument('output')
    args = parser.parse_args()
    if args.command == 'new':
        if not 1 <= args.width <= 2048 or not 1 <= args.height <= 2048: raise ValueError('Invalid canvas size')
        doc = {'width': args.width, 'height': args.height, 'palette': {'ink': [32, 40, 33, 255]}, 'layers': ['base'], 'frames': [{'duration_ms': 150, 'pixels': {}}]}
        write_new(args.path, (json.dumps(doc, indent=2) + '\n').encode()); return
    doc = load(args.project)
    frames = [composite(doc, frame) for frame in doc['frames']]
    if args.command == 'check':
        print(json.dumps({'width': doc['width'], 'height': doc['height'], 'frames': len(frames), 'layers': doc['layers'], 'alpha_ranges': [frame.getchannel('A').getextrema() for frame in frames]})); return
    out = pathlib.Path(args.output)
    out.mkdir(parents=True, exist_ok=True)
    names = [out / f'frame-{i:03}.ora' for i in range(len(frames))] + [out / 'spritesheet.png', out / 'frames.json']
    if any(p.exists() for p in names): raise FileExistsError('Output exists; choose a new output directory')
    sheet = Image.new('RGBA', (doc['width'] * len(frames), doc['height']))
    for i, frame in enumerate(frames):
        write_new(names[i], ora(doc, doc['frames'][i])); sheet.alpha_composite(frame, (i * doc['width'], 0))
    write_new(out / 'spritesheet.png', image_bytes(sheet))
    write_new(out / 'frames.json', (json.dumps({'frameWidth': doc['width'], 'frameHeight': doc['height'], 'durations_ms': [f['duration_ms'] for f in doc['frames']]}, indent=2) + '\n').encode())
    print(f'Exported {len(frames)} frames to {out}')


if __name__ == '__main__': main()

"""Draw 32x40 hand-authored weapon attachment sheets for GFX.2.

The 8x36 frame grid deliberately matches the GFX.1 cultivator sheets so the
runtime can copy the actor's current frame index without a second animation.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/assets/characters'
PREVIEW = ROOT / 'art/previews'
FW, FH, COLS, ROWS = 32, 40, 8, 36
DIRS = ('down', 'up', 'left', 'right')
ROWSPEC = [(state, direction, 4 if state == 'idle' else 8)
           for state in ('idle', 'walk', 'run') for direction in DIRS]
ROWSPEC += [(f'attack{combo}', direction, 6)
            for combo in (1, 2, 3) for direction in DIRS]
ROWSPEC += [(state, direction, count)
            for state, count in (('cast', 8), ('hurt', 4), ('death', 8))
            for direction in DIRS]

PALETTES = {
    'mortal_gift_sword': {
        'outline': (36, 39, 42, 255), 'steel': (174, 185, 187, 255),
        'edge': (232, 234, 222, 255), 'shadow': (102, 113, 117, 255),
        'hilt': (107, 68, 43, 255), 'grip': (73, 48, 37, 255),
        'guard': (157, 125, 84, 255), 'glint': None,
    },
    'qingfeng_sword': {
        'outline': (28, 43, 51, 255), 'steel': (135, 204, 202, 255),
        'edge': (223, 245, 224, 255), 'shadow': (59, 135, 146, 255),
        'hilt': (61, 132, 122, 255), 'grip': (47, 72, 71, 255),
        'guard': (211, 190, 119, 255), 'glint': (170, 244, 219, 255),
    },
}

def path_line(start, end, direction, phase):
    """Return hand position and blade tip for a small readable silhouette."""
    if direction == 'down':
        reach = (phase % 3) - 1
        return (20 + reach, 25), (28 + reach, 11 + (phase % 2))
    if direction == 'up':
        reach = (phase % 3) - 1
        return (12 - reach, 24), (4 - reach, 10 + (phase % 2))
    if direction == 'left':
        reach = (phase % 3) - 1
        return (13, 24 + reach), (2, 15 + reach)
    reach = (phase % 3) - 1
    return (19, 24 + reach), (30, 15 + reach)

def draw_blade(draw, grip, tip, palette):
    gx, gy = grip
    tx, ty = tip
    # Dark pixel outline, then the steel core and a one-pixel edge highlight.
    draw.line((grip, tip), fill=palette['outline'], width=3)
    draw.line((gx, gy, tx, ty), fill=palette['steel'], width=1)
    dx, dy = tx - gx, ty - gy
    if abs(dx) >= abs(dy):
        ox, oy = 0, 1 if dx * dy >= 0 else -1
    else:
        ox, oy = 1 if dx * dy >= 0 else -1, 0
    draw.line((gx + ox, gy + oy, tx + ox, ty + oy), fill=palette['edge'], width=1)
    # Crossguard, wrapped grip and pommel remain only a few pixels wide.
    perp = (-1 if dy >= 0 else 1, 1 if dx >= 0 else -1)
    draw.line((gx - perp[0] * 2, gy - perp[1] * 2,
               gx + perp[0] * 2, gy + perp[1] * 2),
              fill=palette['guard'], width=2)
    draw.line((gx - dx // 10, gy - dy // 10, gx, gy), fill=palette['grip'], width=2)
    draw.point((gx - dx // 9, gy - dy // 9), fill=palette['outline'])

def sheathed_pose(direction, phase):
    sway = (phase % 4) // 2
    if direction == 'up':
        # Diagonal scabbard across the back; placed behind the actor at runtime.
        return (11 + sway, 17), (22 + sway, 31)
    if direction == 'down':
        return (24 + sway, 31), (27 + sway, 19)
    if direction == 'left':
        return (14, 31), (9, 20 + sway)
    return (18, 31), (23, 20 + sway)

def draw_overlay_frame(image, x, y, state, direction, phase, palette, sheet_key):
    draw = ImageDraw.Draw(image)
    attacking = state.startswith('attack')
    if attacking:
        # Three distinct small sword paths follow the three existing combo rows.
        combo = int(state[-1])
        combo_phase = (phase + combo - 1) % 6
        grip, tip = path_line(None, None, direction, combo_phase)
        if combo_phase in (0, 5):
            grip, tip = sheathed_pose(direction, phase)
    else:
        grip, tip = sheathed_pose(direction, phase)
    draw_blade(draw, (x + grip[0], y + grip[1]),
               (x + tip[0], y + tip[1]), palette)
    if palette['glint'] and not attacking and state == 'idle' and phase % 2 == 0:
        gx = x + (27 if direction in ('down', 'right') else 5)
        gy = y + 20 + (phase // 2)
        draw.point((gx, gy), fill=palette['glint'])

def build_sheet(sheet_key, palette):
    sheet = Image.new('RGBA', (FW * COLS, FH * ROWS), (0, 0, 0, 0))
    for row, (state, direction, count) in enumerate(ROWSPEC):
        for col in range(COLS):
            draw_overlay_frame(sheet, col * FW, row * FH, state, direction,
                               col % count, palette, sheet_key)
    assert sheet.size == (256, 1440)
    assert len(ROWSPEC) == ROWS and all(
        sheet.crop((0, row * FH, FW, (row + 1) * FH)).getbbox()
        for row in range(ROWS))
    return sheet

def build_preview(sheets):
    base_path = OUT / 'van_du.png'
    base = Image.open(base_path).convert('RGBA')
    rows = (None, 'mortal_gift_sword', 'qingfeng_sword')
    # Each row shows all facings, a moving pose and a sword swing at 8x nearest-neighbour.
    picks = ((0, 0), (1, 0), (2, 0), (3, 0), (4, 1), (12, 3))
    scale = 8
    row_label_height = 22
    canvas = Image.new('RGBA', (len(picks) * FW * scale,
                                len(rows) * (FH * scale + row_label_height)),
                       (224, 229, 223, 255))
    labels = ImageDraw.Draw(canvas)
    font = ImageFont.load_default()
    for row, key in enumerate(rows):
        label = 'NO WEAPON' if key is None else 'MORTAL SWORD' if key == 'mortal_gift_sword' else 'QINGFENG SWORD'
        labels.text((8, row * (FH * scale + row_label_height) + 5), label,
                    font=font, fill=(36, 46, 45, 255))
        for col, (source_row, frame) in enumerate(picks):
            box = (frame * FW, source_row * FH, (frame + 1) * FW,
                   (source_row + 1) * FH)
            cell = base.crop(box)
            if key is not None:
                cell.alpha_composite(sheets[key].crop(box))
            cell = cell.resize((FW * scale, FH * scale), Image.Resampling.NEAREST)
            canvas.alpha_composite(cell, (col * FW * scale,
                                          row * (FH * scale + row_label_height) + row_label_height))
    canvas.save(PREVIEW / 'gfx2-weapon-poses.png')

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    PREVIEW.mkdir(parents=True, exist_ok=True)
    sheets = {}
    for key, palette in PALETTES.items():
        sheet = build_sheet(key, palette)
        sheet.save(OUT / f'{key}.png', optimize=True)
        sheets[key] = sheet
    build_preview(sheets)
    print('Created two 256x1440 weapon sheets (32x40, 8x36) and gameplay-scale pose preview.')

if __name__ == '__main__':
    main()

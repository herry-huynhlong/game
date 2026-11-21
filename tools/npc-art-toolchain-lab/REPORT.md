# NPC Art Toolchain Lab

**Scope:** test three isolated NPC appearance samples only. Nothing here replaces game NPC assets, population data, gameplay code, saves, or the existing Aseprite sources.

## Result

SpriteKiln is the strongest *procedural animation/rendering* candidate tested. It produces consistent 4-way motion, editable rig specifications, a Phaser-loadable atlas, JSON frame metadata, previews, and QA reports. It is not yet accepted as the production NPC art style: at actual game scale, facial features remain small, the female sample reads mainly from hair and robe, and the rendered style is more chibi/round than the existing art direction. Keep the current 108 NPC appearance system. Review these three samples before deciding whether to refine this pipeline or return to hand-edited Aseprite sprites.

The source files are editable SpriteKiln YAML specifications, not `.aseprite` documents. The final pixels come from SpriteKiln's procedural SDF/rig renderer plus original project-authored model parameters and palette; they were not drawn in Aseprite, made with AI, or downscaled from a concept image. Some reused generic rig parts are CC0 kits listed below.

## Tested candidates

| Tool | Findings | Decision |
|---|---|---|
| [SpriteKiln](https://github.com/LucasJRamos/spritekiln) | Local Python renderer, 4-direction views, skeleton/IK, PNG+JSON atlases, GIF previews and QA. Python 3.10.10; SpriteKiln 0.4.0; NumPy 2.2.4, Pillow 11.2.1, PyYAML 6.0.3. No dependency installation was needed. | Used for exactly the three prototype NPCs. |
| [Universal LPC Generator](https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator) | Very large asset collection and modular sprite-sheet approach; the standard look is closer to conventional Western RPG art than the game's Chinese cultivation setting. Art sources carry mixed licenses and require per-asset attribution. The isolated checkout was incomplete, so no LPC art was rendered or copied. | Not selected. Do not use its assets without per-component license review and credits. |
| [LPC Spritesheet MCP](https://github.com/kanishka-namdeo/lpc-spritesheet-mcp) | MCP wrapper for composing LPC assets; repo code is GPL-3.0 and the included LPC assets retain their own varied licenses. A local source checkout is present; no npm install, renderer run, or art export was performed. | Not selected; it automates composition, not Chinese-style character design. |
| [Aseprite MCP](https://github.com/letsagents/aseprite-mcp) | MIT MCP wrapper that exposes Aseprite/Lua operations. It adds editor control, not an art generator or a distinct quality improvement over the existing Aseprite CLI/Pixel Bridge. Cloned for inspection only; not installed or run. | Not selected for this visual trial. |
| [PixelOver](https://pixelover.io/) | Offers deterministic pixel-art editing, rigging and export, but the official product page lists a $19.99 purchase and says the free trial cannot export. | Not installed or purchased. |

## Three samples

Each has four directions, 6 idle frames and 8 walk frames per direction (6.67 FPS idle, 10 FPS walk). Attack is available in the spec; it was rendered as an extra preview for NPC 01 only, to keep the trial narrow.

| Sample | Design | Atlas | Metadata/source |
|---|---|---|---|
| NPC 01 | Young male disciple, tied black hair, ivory/jade-blue crossed robe, sash, held sword | 64×64 frame cells; 512×768 sheet; 88 named frames (idle, walk, attack) | `specs/characters/npc01_qingyun_disciple/npc01_qingyun_disciple.yaml`, `output/npc01_qingyun_disciple/npc01_qingyun_disciple.json` |
| NPC 02 | Young female cultivator, bun and long hair, jade/ivory robe, distinct face parameters | 64×64; 512×512 sheet; 56 named frames (idle, walk) | `specs/characters/npc02_female_cultivator/npc02_female_cultivator.yaml`, `output/npc02_female_cultivator/npc02_female_cultivator.json` |
| NPC 03 | Adult city guard, firmer face, dark blue/light armor, brown sash, dao | 64×64; 512×512 sheet; 56 named frames (idle, walk) | `specs/characters/npc03_city_guard/npc03_city_guard.yaml`, `output/npc03_city_guard/npc03_city_guard.json` |

All three specs pass `spritekiln validate --strict`. QA reports show 0 errors and 0 warnings for the rendered samples. Representative rendered figure bounds are about 20–22×38–45 pixels in the 64×64 frame, close to the existing 22×38 visible body bounds in its 32×40 cell. Transparency and the Phaser atlas+JSON loading path were exercised in Chrome.

The showcase uses the current Phaser 4.2.1 runtime, shows current body plus its existing modular hair/face/outfit/accessory layers beside the new sprite, and offers 1×/2×/4× nearest-neighbor, four directions, idle and walk. If this browser profile has no world save, the left column uses three labeled representative styles/parts from the current asset system; it does not write a save. Open it at `http://127.0.0.1:5175/tools/npc-art-toolchain-lab/showcase.html` while Vite is running.

## Performance and limitations

Offline PNG/GIF generation used SpriteKiln's NumPy CPU renderer and took approximately 134 s for NPC 01's 88 frames, 74 s for NPC 02's 56 frames, and 48 s for NPC 03's 56 frames on this machine. This is asset-build time, not game frame time. A reliable FPS measurement was not obtained from the headless screenshot run, and no 108-NPC throughput benchmark was performed. The Phaser atlas itself needs no per-frame CPU drawing; it is loaded as a regular atlas.

The source is modular at the rig/spec level (body parts, materials, palette, animation tracks, and sockets can be adjusted); it does not export a layered `.aseprite` file. Future outfit/hair variants can be generated by cloning and editing specs, but face and costume designs still need art direction and review. No LPC asset, PixelOver output, showcase-restricted asset, or third-party character art was used.

## License notes

- SpriteKiln source code: MIT. The four generic kits used by the prototypes—`head`, `hair`, `ponytail`, and `bun`—are marked CC0-1.0 in upstream kit specifications. The new garment construction, armor, weapon geometry, palette and character-specific parameters are authored in this lab's YAML and Python script.
- LPC generator's code license is GPL-3.0; its art components use multiple licenses and require checking the component's source/credits record individually. Nothing from that art pack is in the game or sample outputs.
- LPC MCP server code: GPL-3.0; this does not relicense the LPC art it composes.
- Aseprite MCP code: MIT; no third-party art content was used from it.
- PixelOver: paid desktop software; no trial or purchase was used.

## Main lab files

- `build_samples.py` — reproducible project-specific spec builder.
- `spritekiln.toml`, `palettes/xianxia.yaml` — renderer and art-style setup.
- `specs/characters/` — three editable model/animation sources.
- `output/` — PNG atlases, JSON metadata, QA reports, normal/emissive maps and GIF previews.
- `showcase.html`, `showcase.js` — isolated Phaser comparison; no production import.
- `showcase.png`, `showcase-4x-walk-east.png` — Chrome captures.
- `repos/` — upstream source checkouts for review; LPC asset checkout is partial.


## NPC.ART.TOOLCHAIN.2 — Universal LPC trial (2026-11-20)

### Scope and safety

This follow-up is isolated under `tools/npc-art-toolchain-lab/`. It did not modify `src/`, production `public/assets/`, NPC population/AI, WorldScene, combat, or saves. The only production asset reads are the existing character sheets/modular manifest used by the showcase experiment. The prior SpriteKiln specs and outputs were not overwritten.

### Repaired asset checkout and MCP

- Generator: `LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator`, checkout `repos/universal-lpc`, commit `04140673ec02906f8233523639733c83690df750`.
- MCP wrapper: `kanishka-namdeo/lpc-spritesheet-mcp`, package 1.4.0, checkout `repos/lpc-mcp`, revision `e8be900`; server source is GPL-3.0-only; Node requirement >=20.11.
- Installed the MCP's declared npm dependencies in its isolated repository with `npm ci --ignore-scripts`. `LPC_ASSETS_DIR` explicitly points at the lab's `repos/universal-lpc` directory.
- Repaired an incomplete clone/index locally: preserved its stale empty index lock as `.git/index.lock.stale-20261120`, restored missing tracked files from the checked-out commit, and saved the one pre-restore differing PNG as `*.png.pre-restore-20261120`. No content from that saved copy was used in game output.
- MCP catalog reports 657 selectable items in 104 groups. Three configured characters were actually rendered and exported; the run log is `output/lpc/mcp-run-log.json`.

### Rendered samples

The exact configs are in `specs/lpc-samples.json`; for each sample the MCP produced full sprite sheet PNG/JSON, a Phaser TexturePacker PNG/atlas, four-direction idle and walk strips, a walk-down GIF, and per-export credits CSV/TXT:

- `output/lpc/lpc01_disciple_male/`: male, high ponytail, neutral face, ivory long sleeve, teal robe sash and katana.
- `output/lpc/lpc02_female_cultivator/`: female base/head, long tied hair, ivory robe, teal hairband, leggings/slippers.
- `output/lpc/lpc03_city_guard/`: male, tied-short hair, angry face, navy clothes, legion-style armor, double belt and saber.

Frames are 64×64. The Phaser atlases are 1152×4480 (NPC01; oversize sword animation blocks), 832×3456 (NPC02), and 1152×4224 (NPC03). MCP render/export calls completed in about 0.8–1.5 s and 0.8–1.1 s respectively after startup; per-direction extraction and GIF preview took under 0.25 s per call. These are tool times, not game FPS.

### Art and license assessment

- LPC has a large reusable parts library and real frame-by-frame four-direction idle/walk output. It is a useful *animation/parts source* for conventional RPG characters.
- The three actual samples remain visibly chibi/compact with small facial features at the 64px cell scale. The male robe choices are limited: MCP validation rejected the selected female-only robe for a male body, so the male output uses a formal longsleeve plus belt. The guard reads as generic fantasy/legion armor instead of a distinctively Chinese city guard. The clothing and armor are not a ready-made Taoist robe/Chinese light armor solution. I do not judge it clearly better than the prior SpriteKiln designs for Thanh Vân Ký's intended style.
- Per-character credits are preserved next to every export. Example NPC01 credits list mixed `OGA-BY 3.0`, `CC-BY-SA 3.0`, `GPL 3.0`, `GPL 2.0`, and OGA-BY, with component authors and URLs. NPC02 and NPC03 likewise have their own manifests. Therefore the assembled LPC samples are test-only: do not include them in the main runtime unless every component's obligations are reviewed and the game's distribution can comply. The MCP's GPL code license does not determine the art license. The MCP JSON is not an Aseprite layered source file.

### Phaser comparison status and limitation

A separate Phaser 4 comparison page was created at `showcase-toolchain2.html` and the first image exposed broken sample-path mappings; those mappings were corrected. However, a stable headless browser capture did not complete asset loading/rendering reliably in this environment, so `showcase-toolchain2.png` is **not acceptable evidence** and the requested same-view/scale three-column Phaser comparison, browser FPS, and production-world visual compatibility remain unverified. No performance result is claimed. The output sprite strips/GIFs themselves were inspected directly and confirm that MCP generated real assets, but this is not a substitute for the required Phaser comparison.

### Recommendation

Do not adopt LPC output for the 108 NPC runtime. Its parts breadth and four-direction sheet generation are useful for prototyping, but the art style and Chinese cultivation clothing mismatch, mixed source licenses, compact faces, and unverified in-game fit outweigh the automation benefit. If desired, next pursue one deliberately art-directed original C03 template in Aseprite, with a rights-cleared source and 4-direction body/robe designed specifically for this game's pixel scale. No bulk generation or replacement was done.

### Files added/updated for this trial

- `specs/lpc-samples.json`
- `lpc-probe-mcp.mjs`, `lpc-mcp-call.mjs`, `lpc-export-samples.mjs`
- `lpc-probe-data.json`
- `output/lpc/**` (three source configs, atlas/sheets, previews, and credits)
- `showcase-toolchain2.html`, `showcase-toolchain2.js` (experimental comparison only)
- This report section

## NPC.ART.MASTER.1 — C03-MASTER Stage A draft (2026-11-20)

### What was created

A hand-authored 48×64 four-pose study was made from original per-pixel color runs and assembled by the existing Aseprite Pixel Bridge. It contains separate South, North, West and East frames, a limited jade/ivory/gold palette, and nine named editable layers (contact shadow, hair back, robe silhouette, face/neck, robe panels/folds, sleeves/sash, hair front, face features, feet/embroidery). No LPC or SpriteKiln rendered art, AI image, or third-party character part was used. The views are separately authored rather than rotated from one base pose.

Editable deliverables:
- `art/source/npc-art-master/C03-MASTER-stage-a.aseprite`
- `art/source/npc-art-master/C03-MASTER-stage-a.json` (Pixel Bridge source)
- `art/source/npc-art-master/C03-MASTER-stage-a.png`
- `art/source/npc-art-master/C03-MASTER-stage-a-export.json`
- Builder: `tools/npc-art-toolchain-lab/build-c03-master.mjs`

The Aseprite CLI generated a 4-frame spritesheet and JSON metadata. A separate Phaser lab page loads the real Tiled `QingyunCityV2.tmj` / `QingyunSectV2.tmj` map, the current NPC sheet, and the C03 study. Browser status reported the 48×32 Tiled map loaded. This page and output assets are isolated: no production sheet, WorldScene, gameplay, AI, or save changed.

Browser evidence:
- `tools/npc-art-toolchain-lab/output/c03-master-review-v5/phaser-1x.png` (city)
- `tools/npc-art-toolchain-lab/output/c03-master-review-v5/phaser-sect-2x.png` (sect court)
- `tools/npc-art-toolchain-lab/output/c03-master-review-v5/phaser-4x.png` (city close view)
- Showcase page: `tools/npc-art-toolchain-lab/showcase-master.html`

### Art review / status

This is a **review draft, not a finished master character**. At normal gameplay size it reads as a young blue/ivory-robed cultivator, but facial expression is still weak, the hair bun/locks are too blocky, sleeve/hand anatomy is under-described, the robe has broad flat areas, and the side/back silhouettes are not yet convincing enough for the requested high-quality standard. The comparison shows the new 48×64 art is larger than the existing 32×40 body cell, though the map placement is not distorted. The nearest-neighbor 4× screenshot makes the unfinished pixel clusters easier to assess; it does not make the design final.

No walking/attack animation or modular variants were made, per Stage A scope. No runtime integration or test/build suite was run; the bridge source was validated and Aseprite exported the layered native file, PNG and frame metadata. The Phaser lab page was verified in Chrome on the actual Tiled maps, but it is a review overlay, not a gameplay acceptance test.

Stop here for the requested Stage A art review; do not treat the draft as approved or as the basis for bulk NPC production until the user approves its proportions, face, robe and four silhouettes.

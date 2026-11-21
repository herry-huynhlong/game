# WORLD.REBUILD.1-B2 — current implementation notes

Project: `D:\anh\game\xianxia-mvp`  
Map source: `maps/world-rebuild-1b.tmj`  
Runtime: `src/world-rebuild-scene.js`

## Aseprite-authored material

The new foliage and small-building sprites were drawn pixel-by-pixel by `build-world-assets.lua` through the local Aseprite Lua API, then exported with the Aseprite CLI. They were not drawn in Pixelorama, are not AI imagery, and are not converted web images. Every one-frame tree/house source has three named editable layers. The wall/gate kit has three named layers and eight 64×64 frame tiles.

| Source | Runtime output | Intended role |
|---|---|---|
| `T03-mountain-pine.aseprite` | `public/assets/world-rebuild-1b2/T03-mountain-pine.png` + JSON | Layered mountain pine |
| `T04-broadleaf.aseprite` | `public/assets/world-rebuild-1b2/T04-broadleaf.png` + JSON | Broadleaf canopy |
| `T05-willow.aseprite` | `public/assets/world-rebuild-1b2/T05-willow.png` + JSON | Hanging willow |
| `T06-monster-ancient.aseprite` | `public/assets/world-rebuild-1b2/T06-monster-ancient.png` + JSON | Irregular dark forest tree |
| `H02-city-home.aseprite` | `public/assets/world-rebuild-1b2/H02-city-home.png` + JSON | City residence |
| `H03-market-shop.aseprite` | `public/assets/world-rebuild-1b2/H03-market-shop.png` + JSON | Shop front |
| `H04-sect-dorm.aseprite` | `public/assets/world-rebuild-1b2/H04-sect-dorm.png` + JSON | Sect dormitory |
| `H05-wilderness-hut.aseprite` | `public/assets/world-rebuild-1b2/H05-wilderness-hut.png` + JSON | Forest-edge hut |
| `Qingyun-wall-gate-kit.aseprite` | `public/assets/world-rebuild-1b2/Qingyun-wall-gate-kit.png` + JSON | Eight modular masonry/gate pieces |

The art is a deliberately small first pass, made to replace blank areas and establish silhouettes and scale. It still needs a focused polish pass for finer architectural carving, willow foliage, and more organic terrain transitions. Do not present it as final production art.

## Map layout and safety boundaries

- Orthogonal Tiled map: 224×144 cells at 32 px (7168×4608 world pixels).
- 6 regions: city, wilderness, sect, and outer/middle/deep monster forest.
- 251 placed props, 250 collision footprints, 9 navigation markers, inactive future-role markers.
- The requested 108 future NPC roles remain unspawned; active population is 0.
- The new isolated runtime does not load old prototype scenes or legacy NPC saves. Existing legacy saves remain archived by the current startup guard.
- Old `settlement_buildings.png` remains in use for the city gate/city hall and sect hall. It was produced by the older Python art script, not Aseprite. New homes, shop, dormitory, hut, and modular wall sprites use the new Aseprite sources.

## Rebuild / export

Run Aseprite on Windows:

```powershell
& 'D:\anh\tools\aseprite\build2\bin\aseprite.exe' -b --script-param root='D:/anh/game/xianxia-mvp' --script art/source/world-rebuild-1b2/build-world-assets.lua
```

Then run the Tiled map generator:

```powershell
node tools/world-rebuild-1b/build-map.mjs
```


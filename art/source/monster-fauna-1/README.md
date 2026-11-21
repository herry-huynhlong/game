# MONSTER.FAUNA.1 assets

- 3 native Aseprite documents: deer, scorpion, snake; each is 32×32, 12 frames, 3 editable layers (`Ground shadow`, `Body and limbs`, `Markings and highlights`).
- Source drawing specs are `deer.json`, `scorpion.json`, and `snake.json`. `tools/monster-fauna-1/draw-fauna.mjs` authors the pixel operations and runs the local Aseprite CLI through `tools/codex-pixel-bridge/bridge.mjs`.
- Aseprite CLI read-back was verified with `tools/monster-fauna-1/verify-aseprite.lua`; all three documents reopened with the expected frame and layer counts. GUI editing was not used or claimed.
- Runtime sheets and animation metadata are in `public/assets/fauna/land/{deer,scorpion,snake}/`.
- This is hand-authored pixel art emitted through Aseprite, not Pixelorama, Pillow, AI, or downloaded art. The small 32×32 designs are prototypes for this population pass and may need an art review before being used as a final character standard.

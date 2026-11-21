# WEAPON.COMBAT.1 — asset đao và kiếm

Các file `.aseprite` trong thư mục này được tạo bằng Aseprite 1.3.18.6-dev qua Lua CLI; không dùng Pixelorama, Pillow, AI hay ảnh ngoài.

## Source và runtime

- `dao-grip.aseprite`, `jian-grip.aseprite`: 32×40 mỗi frame, 288 frame, lưới 8 cột ×36 hàng, khớp frame NPC 32×40 hiện hành.
- Layer: `arm_sleeve`, `hand_grip`, `weapon_silhouette`, `metal_highlights`.
- Tag theo hành động/hướng: `idle_*`, `walk_*`, `run_*`, `dao_slash_*`, `jian_thrust_*`, `jian_slash_*`; runtime hiện hỗ trợ 4 hướng Bắc/Nam/Đông/Tây.
- `fx-dao.aseprite`, `fx-thrust.aseprite`, `fx-jian.aseprite`: FX Pixel Art riêng, 4 hướng ×6 frame, mỗi FX có layer lõi, viền màu, cạnh sáng và tia.

PNG và JSON runtime nằm trong `public/assets/weapons/`. Phaser dùng sprite sheet 32×40 cho overlay gắn theo vị trí/frame của NPC; hit effects là 48×48, nearest-neighbor.

## Tái tạo

Từ thư mục dự án, dùng Aseprite tại `D:\anh\tools\aseprite\build2\bin\aseprite.exe` cùng các script Lua `build_weapon_sheets.lua` và `build_weapon_fx.lua`. Xuất sprite sheet và metadata JSON bằng Aseprite batch CLI. Hãy xuất vào thư mục tạm trước khi thay asset runtime hiện có.

## Kiểm tra hiện tại

- Unit/system test: `npm run test:systems`.
- Browser smoke test trên Chrome profile tạm: `node tests/weapon-combat-browser.mjs` (dev server tại cổng 5175).
- Browser evidence: `art/previews/weapons/browser/`.

Ảnh smoke test đã xác nhận overlay và sát thương đao/kiếm trong World Rebuild. Showcase đầy đủ các hướng/zoom chưa được nghiệm thu mỹ thuật; FX va chạm riêng cũng chưa có asset độc lập.

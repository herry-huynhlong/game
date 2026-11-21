# WORLD.REBUILD.1-B — Báo cáo lịch sử bản tạm

> **Lưu ý:** Báo cáo dưới đây mô tả bản 144×40 trước khi mở rộng. Bản runtime hiện tại là WORLD.REBUILD.1-B2, 224×144. Xem [art/source/world-rebuild-1b2/README.md](../world-rebuild-1b2/README.md) để biết chi tiết mới nhất.

Ngày: 2026-11-18  
Dự án: `D:\anh\game\xianxia-mvp`

## Bản đồ và runtime

- Tiled source: `maps/world-rebuild-1b.tmj` — một world liên tục, 144×40 ô, tile 32×32, kích thước thế giới 4608×1280 px. Mỗi vùng chiếm 48×40 ô.
- Có ba vùng liền nhau: Thanh Vân Thành, Vùng hoang dã, Thanh Vân Tông; các tuyến đường nối xuyên map.
- Các layer Tiled: `GroundBase`, `GroundDetails`, `TerrainTransitions`, `Roads`, `StaticDecor`, `ObjectFootprints`, `Collision`, `Occlusion`, `NavigationMarkers`, `RegionMarkers`, `SpawnMarkers`.
- Bản đồ đặt 29 vật thể mỹ thuật và 28 footprint collision. Tất cả ba marker điều hướng đều đi tới được qua grid kiểm tra collision.
- Runtime mới tạo Phaser canvas, pixel-perfect rendering, camera bounds, zoom bánh xe, pan kéo chuột/WASD, nút đổi vùng và collision overlay. Không gọi `DivineWorldScene`, NPC registry hoặc population cũ.
- NPC mới đang hoạt động: **0**. Spawn markers chỉ là metadata inactive.
- Namespace save legacy vẫn được archive nguyên văn, không xóa hoặc load lại. Browser kiểm tra dùng Chrome profile tạm; save thật của người dùng không bị test sửa.

## Asset được kiểm tra và sử dụng

| Asset | Source | Runtime PNG / kích thước | Ghi chú tích hợp |
|---|---|---|---|
| Địa hình GFX5B5 | `art/source/gfx5b5/native/GFX5B5AreaTerrain.aseprite` | `public/assets/tilesets/gfx5b5_area_terrain.png`, 512×512, tile 32×32 | Tileset Pixel Art Aseprite thật; dùng cho cỏ, nền đá, đất và đường. Collision đặt riêng trong map. |
| Cổ thụ | `art/source/gfx5b/ancient-tree-v2.aseprite` và JSON frame | `public/assets/props/ancient-tree-v2.png`, 1680×96, 15 frame 112×96 | Dùng frame gió 11–14; map đặt footprint thân riêng. |
| Trúc T02 | `art/source/gfx5b/batch1a/T02-bamboo-v2.aseprite` | `public/assets/props/T02-bamboo-v2.png`, 768×96, 8 frame 96×96 | PNG xuất sẵn được chép từ source sang runtime; animation 8 frame và footprint riêng. |
| Đá Qingyun | `art/source/gfx5b5/native/QingyunRocksV2.aseprite` | `public/assets/tilesets/qingyun_rocks_v2.png`, 320×128, 10 ô 64×64 | Pixel Art Aseprite; từng instance có footprint. |
| Nhà tranh H01 | `art/source/gfx5b/batch1a/H01-farmhouse-v2.aseprite` | `public/assets/props/H01-farmhouse-v2.png`, 144×120 | PNG xuất sẵn được chép sang runtime; collision footprint đặt riêng. |
| Công trình thành/tông môn | `art/source/gfx3b/rebuild_city.py` | `public/assets/props/settlement_buildings.png` và `.json`, 960×1536, ô atlas 192×192 | Pixel art atlas từ script Python, **không phải file Aseprite**. Dùng frame cổng, thành chủ phủ, nhà phố, sơn môn, chính điện, thiền đường và khu xá. |

Nước GFX5B.5 có source/texture trong dự án nhưng chưa đặt vào world này; không thêm sông, biển hay thác khi chưa cần và chưa kiểm chứng animation/va chạm ở map mới. Atlas nhà có thêm các frame chưa được đặt; chưa dùng quầy hàng hoặc tường bao chỉ để lấp chỗ.

## Kiểm chứng

- `npm run build`: thành công. Còn cảnh báo bundle Phaser lớn (1.68 MB) vì cấu hình vẫn build các trang preview riêng.
- `npm run test:systems`: tất cả system tests pass, bao gồm test WORLD.REBUILD.1-A và 1-B.
- Chrome headless trên `http://127.0.0.1:5175/`: 1 canvas; 29 object sprites; 0 NPC; không có lỗi JS hoặc request thất bại; không yêu cầu map/texture legacy.
- Nút vùng đổi đúng khu, kéo chuột làm camera pan, wheel thay zoom 0.95×→1.0545×, collision toggle hoạt động.
- Grid navigation qua footprint: Thành → Hoang dã và Hoang dã → Tông môn đều reachable.
- Reload giữ archive và legacy save nguyên trạng; không tái nạp save thành dân cư.

## Ảnh Phaser

Ảnh được chụp từ scene đang chạy, không phải gallery tĩnh:

- `art/previews/world-rebuild-1b/city-temp-world.png`
- `art/previews/world-rebuild-1b/wilderness-temp-world.png`
- `art/previews/world-rebuild-1b/sect-temp-world.png`
- `art/previews/world-rebuild-1b/world-overview.png`
- `art/previews/world-rebuild-1b/terrain-and-buildings-detail.png`
- `art/previews/world-rebuild-1b/collision-navigation-debug.png`
- `art/previews/world-rebuild-1b/verification.json`

## Giới hạn bản tạm

Map có địa hình, đường và công trình thật nhưng vẫn thưa, nhất là vùng hoang dã; quảng trường đá còn lặp tile rõ. Thành chưa có tường bao liên tục; chưa có sông/hồ/thác hoặc hoạt động kinh tế; chính điện và các công trình đang dùng atlas Python chứ không phải source Aseprite. Collision/nav mới được kiểm tra bằng footprint/grid, chưa có actor thật đi trên map. Gameplay modules được giữ, nhưng chưa nối vào world tạm. NPC vẫn là 0. Đây là nền để xem và đánh giá trước khi tiếp tục, chưa phải world hoàn thiện.

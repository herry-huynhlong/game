# Tây Hoang Vạn Linh

[Mở bản local tại Thanh Mộc Ngoại Lâm](http://127.0.0.1:5183/?region=west-outer) hoặc [xem sprite và thao tác thử kỹ năng](http://127.0.0.1:5183/monster-gallery.html).

| Sinh cảnh | Thành phần | Cảnh giới | Hồi sinh ở ×1 |
| --- | --- | --- | --- |
| Thanh Mộc Ngoại Lâm | 2 Thanh Mộc Yêu, 2 Thanh Ảnh Lang, 1 Ngọc Giác Linh Lộc | Luyện Khí tầng 4 | 45 s |
| Vạn Thú Nội Lâm | 1 Thanh Ảnh Lang, 1 Xích Giáp Sơn Trư, 2 Thanh Lân Yêu Mãng | Trúc Cơ tầng 2 | 60 s |
| Hắc Vụ Độc Lâm | 1 Bích Độc Thiềm, 1 Hắc Giáp Ngô Công, 1 Phệ Linh Yêu Hoa, 1 Huyết Đằng Yêu | Kim Đan tầng 2 | 75 s |
| Thái Cổ Thâm Lâm | 2 Thiên Niên Thụ Yêu, 1 Huyết Đằng Yêu | Kim Đan tầng 2 | 95 s |
| Tây Hoang Cấm Địa | 1 Vạn Niên Mộc Hoàng, 1 Thiên Niên Thụ Yêu Tinh Anh | Nguyên Anh tầng 6 | 135 s |

Thời gian hồi sinh trong bảng dành cho hàng đợi bình thường. Khi dưới 64% HP, Mộc Hoàng có thể dùng Vạn Mộc Triệu Linh để lấp suất Thụ Yêu Tinh Anh bỏ trống. Khi triệu hồi thành công, hàng đợi của cá thể vừa được thay thế bị loại bỏ. Tổng số cá thể sống trong Cấm Địa giới hạn ở hai.

32 yêu thú khu cũ dùng cấu hình sẵn có. Thụ Yêu ngụy trang vẫn giữ một footprint tại gốc cây. Cây cảnh thường có va chạm tĩnh và nằm trong lớp `StaticDecor`. Sáu mẫu cây là Bách Niên Cổ Mộc, Thiên Niên Đại Thụ, Tụ Linh Thần Mộc, Huyết Sát Ma Mộc, Thái Cổ Khô Mộc và Vạn Niên Thần Thụ.

## Nguồn và file chính

- `src/dao/MonsterRegistry.ts`, `FaunaSystem.ts`, `MonsterCombat.ts`, `types.ts` quản lý định danh, hành vi, sinh cảnh, tuổi và linh khí, trạng thái thức tỉnh, kỹ năng và vòng đời.
- `src/world-rebuild-scene.js`, `src/world/GroundOccupancy.js`, `MonsterMovement.js`, `MonsterVisuals.js`, `WorldNameplates.js` nối thực thể với WorldScene, va chạm, định tuyến, tán cây và giao diện.
- `src/dao/ItemCatalog.ts`, `ItemIconFrames.json`, `SettlementSystem.ts`, `src/world/WorldMerchants.js` quản lý nguyên liệu và nội đan trong túi đồ, loot và trao đổi.
- `maps/world-rebuild-1b.tmj` chứa roster theo sinh cảnh, cây lớn và va chạm gốc. `tools/west-wilds/build-map.mjs` dựng lại các lớp Tây Hoang.
- `art/source/west-wilds/draw-van-linh.py` tạo atlas cây và chín sprite sheet yêu thú (tám loài, thêm một bộ Tinh Anh) trong `public/assets/west-wilds/`. Mỗi sheet gồm 4 hướng, 8 hàng trạng thái và 4 khung mỗi hướng. `art/source/draw-item-icons.py` tạo 11 icon mới trong atlas túi đồ. Các PNG được tạo bằng Pillow.

## Kiểm thử

```powershell
npm run build
npm run test:systems
npm run validate:release -- --dist
node tests/van-linh-browser.mjs
```

Bài kiểm tra Chrome dùng hồ sơ tạm. Có thể đặt `V13_ORIGIN` trỏ tới một máy chủ static đang phục vụ đúng bản `v0.1.13` để tái hiện thử nghiệm tải save của phiên bản đó vào bản mới. Bài thử kiểm tra 108 NPC, 50 yêu thú, đường cổng Tây đến Cấm Địa, tăng tốc mô phỏng, ba pha của Mộc Hoàng, nhập thân đánh và nhấn E nhặt, tải lại cùng chiến lợi phẩm và trạng thái chờ hồi sinh. Kết quả và ảnh nằm trong `art/previews/van-linh/`.

Lần kiểm tra với gói GitHub Release `v0.1.13` xác nhận 108 NPC giữ ID, tọa độ và túi đồ sau nâng cấp. 50 ID yêu thú sống được giữ. Bản đồ hiện đặt 71 cây lớn. Chrome headless đo ở 1304 × 955, zoom 0,95, 6 giây mỗi cảnh. Thành đạt 57,8 → 60,0 FPS, Ngoại Lâm 60,0 → 60,0 FPS, p95 16,8 ms ở cả hai bản. Mẫu cũ ở Ngoại Lâm có 49 yêu thú sống, bản mới có 50. Số đo này chỉ phản ánh các cảnh kiểm tra ngắn.

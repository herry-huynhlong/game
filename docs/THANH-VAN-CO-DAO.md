# Thanh Vân Cổ Đạo và Thanh Vân Ngoại Lâm

Mở bản local tại [cổng 5183](http://127.0.0.1:5183/). Trong **Bản đồ**, chọn **Thanh Vân Cổ Đạo**, **Thanh Vân Ngoại Lâm**, **Sơn Môn** hoặc **Thanh Vân Tông**.

## Bản đồ và dữ liệu

- Bản đồ tăng từ 224×144 lên 224×184 ô, giữ tile 32 px. Khoảng cách dọc từ rìa nam của thành đến rìa bắc của tông môn là 66,5 ô. Ba lớp công trình, collision và trạm tương tác của tông môn tịnh tiến 1.280 px. Các lớp Rampart giữ nguyên tọa độ và dữ liệu.
- Cổ Đạo có đường đất, đoạn đá cũ và ba lối mòn sang các khu tài nguyên. Ngoại Lâm có Đình Vọng Vân, hồ nhỏ, 8 cụm linh thảo và 6 cổ thụ có nguồn gỗ.
- Ba sinh cảnh chứa tối đa 8 yêu thú thường, gồm 2 sói, 3 lợn rừng và 3 thiềm. Slot hồi sinh sau 41 giây theo đồng hồ sinh thái và hoãn khi chưa có vị trí an toàn. Loài, loot và chiến đấu dùng hệ thống yêu thú hiện có.
- Nhiệm Vụ Điện dùng tài nguyên, chiến lợi phẩm và phần thưởng thực. Ủy thác vận chuyển lấy quặng từ kho thành tại trạm công vụ trước khi mang về tông môn. Mua bán dùng tồn kho và linh thạch hiện có.
- Mốc bố cục phiên bản 2 giúp lưu cũ đổi tọa độ một lần. Kiểm thử dùng hồ sơ Chrome riêng và fixture bản lưu cũ. Huyền Hổ được kiểm trong chế độ [Character Rig](http://127.0.0.1:5183/?characterRig=1) hiện có.

## Các file chính

| File | Nội dung |
| --- | --- |
| `maps/world-rebuild-1b.tmj` | Bản đồ Tiled đang dùng trong game |
| `tools/old-road/expand-map.mjs` | Chèn hàng địa hình, dời tông môn, dựng tài nguyên và sinh cảnh |
| `tools/sect-campus/build-map.mjs` | Đọc độ dời khi sửa bản đồ tông môn về sau |
| `art/source/old-road/draw.py` | Mã nguồn pixel art và atlas chuyển tiếp |
| `public/assets/old-road/` | Các atlas đường, nền cỏ và tiểu cảnh |
| `src/world-rebuild-scene.js`, `src/world-rebuild.js`, `src/world/MinimapCamera.js` | Lớp render, định tuyến, camera, địa danh và minimap |
| `src/world/WorldLayout.js`, `src/world-rebuild-population.js` | Migration và vòng đời bản lưu |
| `src/world/SectCampus.js`, `src/world/WorldMerchants.js`, `src/dao/FaunaSystem.ts` | Ủy thác, đi giao dịch xa và sinh cảnh mới |
| `tests/old-road-browser.mjs`, `tests/old-road-travel-browser.mjs` | Kiểm thử Chrome và xuất ảnh trong Phaser |
| `tests/city-redesign.test.mjs`, `tests/world-rebuild-1b.test.mjs`, `tests/world-rebuild-1c.test.mjs`, `tests/world-rebuild-1c2.test.mjs`, `tests/monster-fauna-1.test.mjs` | Kiểm thử hồi quy và migration |
| `scripts/validate-release.mjs` | Kiểm tra atlas trong gói production |

## Lệnh kiểm thử

```powershell
npm run build
npm run test:systems
npm run validate:release -- --dist
npm run preview -- --host 127.0.0.1 --port 5183 --strictPort
```

Khi preview đang chạy, mở terminal thứ hai.

```powershell
node tests/old-road-browser.mjs
node tests/old-road-travel-browser.mjs
```

Ảnh và số liệu lưu dưới `art/previews/old-road/`. Có thể dựng lại bản đồ mở rộng bằng `node tools/old-road/expand-map.mjs <đường-dẫn-bản-Tiled-224x144-trước-khi-mở-rộng>` với Python và Pillow.

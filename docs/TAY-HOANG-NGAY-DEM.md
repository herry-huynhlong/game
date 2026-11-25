# Tây Hoang Yêu Lâm và chu kỳ ngày đêm

Mở [Thanh Vân Ký](http://127.0.0.1:5183/) rồi chọn một vùng Tây Hoang trong **Bản đồ**. Đường mòn nối Rừng Yêu Thú cũ với Thanh Mộc Ngoại Lâm và bốn vùng sâu hơn. Khi nhập thân, đến gần linh thảo rồi nhấn **E** để hái. Cảnh giới, giờ nở và thời gian mọc lại phụ thuộc vào loại cây.

Đồng hồ trên thanh chính hiển thị bảy giai đoạn. X1 dùng một giây mô phỏng cho mỗi phút trong game. X2 và X4 tăng tốc các bước mô phỏng. Chế độ Dừng giữ giờ và tạm dừng NPC, kinh tế và sinh thái. Chọn Dừng nếu muốn giữ cùng giờ khi di chuyển camera để so sánh ánh sáng.

| Vùng từ Đông sang Tây | Cảnh giới đề xuất | Linh thảo | Số yêu thú tối đa |
| --- | --- | --- | --- |
| Thanh Mộc Ngoại Lâm | Luyện Khí | Thanh Linh Thảo | 5 |
| Vạn Thú Nội Lâm | Trúc Cơ | Tử Ngọc Linh Chi | 4 |
| Hắc Vụ Độc Lâm | Kim Đan | Tử Vụ Linh Hoa | 4 |
| Thái Cổ Thâm Lâm | Kim Đan | Lôi Linh Quả | 3 |
| Tây Hoang Cấm Địa | Nguyên Anh | Thái Cổ Huyết Liên | 2 |

## Bản đồ và lưu game

`maps/world-rebuild-1b.tmj` có 352 × 184 ô 32 px, tương đương 11.264 × 5.888 px. Tiled dùng lưới bắt đầu tại 0. Thuộc tính bản đồ `westOffsetX=4096` cho biết vì sao WorldScene đọc tọa độ Tiled rồi dịch X về bên trái. Lưới pathfinding, tra tile nước, camera, minimap và biên ngự kiếm cùng dùng gốc mới. Ô phía Tây có X âm trong mô phỏng. Tọa độ phần thế giới cũ và dữ liệu lưu tiếp tục dùng giá trị cũ. Các dải va chạm bờ và vách núi nằm trong layer `Collision`. `WestTrailLink` nối đường mòn mới với hướng Rừng Yêu Thú cũ.

Có thể chỉnh bản đồ trong Tiled. Để dựng lại vùng sinh từ script, chạy các lệnh dưới đây tại thư mục dự án. Lệnh dựng map sẽ thay nội dung sinh tự động của Tây Hoang, nên các chỉnh sửa tay ở vùng đó cần giữ trong bản Tiled hoặc chuyển lại vào script trước khi chạy.

```powershell
python art/source/west-wilds/draw-landmarks.py
node tools/west-wilds/build-map.mjs
python art/source/draw-item-icons.py
npm run build
npm run test:systems
npm run validate:release -- --dist
```

Atlas môi trường và thắng cảnh được tạo bằng mã nguồn PNG/Pillow. Cây động và ba bộ sprite yêu thú tái sử dụng tài nguyên dự án. Điểm thu hái, khí độc, đèn và sinh cảnh được khai báo riêng trong `WestResources`, `WestPoison`, `WestLights` và `FaunaZones`.

## Kiểm thử trình duyệt

Khi bản build đang được Vite phục vụ tại cổng 5183, chạy `node tests/west-wilds-browser.mjs`. Chrome headless dùng hồ sơ tạm. Kết quả và ảnh lưu trong `art/previews/west-wilds/`. Bài thử đổi giờ trên cùng tọa độ và mức zoom, kiểm tra tuyến đi và cá sông, đo FPS thành với đủ dân số, thử tích độc và dùng đan, chạy hai chu kỳ trong WorldScene rồi tải lại và so trạng thái. Ba nhóm vật tư có thể đi qua Nhiệm Vụ Điện và bảo khố sang Đan Dược Đường. Lô Giải Độc Đan dùng Tử Vụ Linh Hoa.

Lần chạy ghi trong `simulation.json` có 18 NPC khởi hành, 13 NPC thu hái, 8 lính có tuần tra hoặc quan sát ca đêm, và một ủy thác Thanh Mộc Ngoại Lâm nộp đủ 2 Thanh Linh Thảo. Khách điếm, tửu quán và Nhã Nhạc Lâu có khách trả tiền sau 18:00. Hai NPC tử trận ở Rừng Yêu Thú phía cũ. Ở tám mẫu lấy cách nhau sáu giờ trong game, không có NPC nào xuất hiện trong danh sách kẹt của hai mẫu. `benchmark.json` ghi 58,9 FPS và p95 16,8 ms ở thành, 1304 × 955, zoom 0,95, 108 NPC và 50 yêu thú. `economy-check.json` ghi một phép thử riêng trong WorldScene với nguyên liệu cấp trước, xác nhận không hái trùng và công thức tiêu thụ một Tử Vụ Linh Hoa để tạo hai Giải Độc Đan.

Các phần chỉnh chính nằm ở `src/world-rebuild-scene.js`, `src/world-rebuild.js`, `src/world/WorldDaylight.js`, `src/world/WestWilds.js`, `src/world/SectCampus.js` và `src/world/WorldSociety.js`. Phần tương thích bản đồ gồm `WorldTerrainAtlas.js`, `MinimapCamera.js`, `FlyingSword.js` và `WorldRiverFishSystem.ts`. Phân cấp yêu thú dùng `FaunaSystem.ts`, `MonsterRegistry.ts`, `MonsterCombat.ts`, `MonsterVisuals.js` và `WorldNameplates.js`. Kho vật phẩm và hồ sơ dùng atlas trong `public/assets/items/`, `ItemCatalog.ts`, `ItemIconFrames.json` và `ResidentProfile.js`.

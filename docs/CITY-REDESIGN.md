# Quy hoạch lại Thanh Vân Thành

Bản đồ chạy tại `http://127.0.0.1:5183/`. Mở **Bản đồ → Thanh Vân Thành** để xem tổng thể. Kéo và cuộn chuột để kiểm tra các sân nhà, quầy hàng và mặt đứng công trình. Phím **C** bật lớp va chạm.

## Mặt bằng

| Khu | Vị trí trong thế giới | Hoạt động |
| --- | --- | --- |
| Quảng trường | Quanh (3568, 2192) | Trục giao thông, đài nước, ghế nghỉ và nơi gặp gỡ |
| Dân cư Bắc Tây | Quanh (2752, 1660) | Dãy nhà, ngõ đá, sân gạch, giếng dùng chung, hàng rào thấp |
| Chợ Thanh Vân | Quanh (4370, 1920) | Bảy sạp hiện có, mỗi sạp có lối tiếp cận và chỗ bán riêng |
| Phủ thành chủ | Quanh (3952, 1620) | Chính điện mái ngói nhiều tầng, sân, bậc đá, thủy cảnh và mốc hộ vệ |
| Phố nghề và phía Nam | Quanh (3152, 1960), (3744, 1976) và hai khu Nam | Lò rèn, hiệu thuốc, kho mộc, tiệm lương, tửu quán và khách điếm |

Bản đồ thế giới giữ 224×144 ô, mỗi ô 32×32 px. Sân đá cũ được thay bằng trục chính rộng 128–160 px, các ngõ rộng 64 px, sân gạch, nền chợ, đất nện và vườn. 37 nhà dân và bốn cơ sở nghề nghiệp mới là các đối tượng độc lập trong Tiled. Chợ giữ 7 sạp và dùng chỗ làm việc đang có cho vị trí bán hàng. Cửa nhà mới có điểm tiếp cận phía ngoài.

## File chỉnh sửa

- `maps/world-rebuild-1b.tmj` là map runtime và file nguồn Tiled. `maps/world-rebuild-1b-before-city-redesign.tmj` là bản sao ngay trước khi đổi bố cục.
- `public/assets/city-redesign/` chứa tileset mặt đất, bộ sprite công trình và vật dụng, sprite chính điện và vùng vẽ đã cắt sát theo alpha.
- `art/source/city-redesign/draw-city.py` là nguồn vẽ các atlas pixel art nguyên bản. `tools/city-redesign/build-city-map.mjs` tái tạo mặt bằng từ bản sao.
- Từ thư mục dự án, chạy `python art/source/city-redesign/draw-city.py` với Pillow, rồi `node tools/city-redesign/build-city-map.mjs` để dựng lại bản sinh tự động. Lệnh dựng lại map thay chính file runtime bằng dữ liệu từ bản sao và sơ đồ trong script.
- Tiled đã xuất map thử sang TMX thành công. Trong Tiled, layer **StaticDecor** chứa nhà và cảnh vật, **Buildings** giữ các công trình có chức năng sẵn, **CityEdges** chứa mép chuyển của ngõ. **Collision**, **NavigationMarkers** và **InteractionMarkers** chứa footprint và điểm tiếp cận.

## Kiểm thử

- Chrome trên bản build production tải đủ 108 bản ghi và 67 mốc thành. Mọi mốc đều đứng được và có tuyến từ quảng trường. Đã kiểm tra Bắc–Nam, Đông–Tây và một lộ trình A* đi vòng thân nhà qua 5 waypoint.
- Lượt chạy cuối 367 phút trong game ghi nhận 9 NPC qua chợ, 8 NPC thay đổi vị trí ít nhất 16 px, 7 thương nhân đến điểm giao dịch. Các mẫu lấy trong lượt chạy ghi nhận 0 cặp footprint chồng, 0 cư dân đứng trong vật cản ở chợ và 0 NPC báo chặn đường trong các mẫu lấy. Một lượt trước ghi nhận tối đa 1 NPC báo chặn đường.
- Nhật ký đưa camera tới cư dân đang chọn. Nhân vật nhập thân đi bằng phím D trong thành. Minimap hiển thị nền, đường và các dấu công trình mới.
- Trong ca lưu cũ có một NPC đứng giữa thân nhà mới, tải lại đã chuyển NPC khoảng 33 px tới vùng hợp lệ, giữ nguyên 108 ID, seed, tu vi và vật phẩm. Bản ghi hiện có chỉ đổi tọa độ nào vướng footprint mới. Home ngoài cửa nhà được phân bổ cho cư dân phù hợp khi tạo world mới.
- `npm run test:systems`, build TypeScript/Vite và validator release đã qua. Chrome ghi nhận 0 lỗi JavaScript và 0 HTTP lỗi asset trong ca thử.
- Công trình mới có điểm đứng trước cửa. Phép thử hiện bao phủ mạng đường ngoài trời và hoạt động tại các điểm đó. Chưa có bản đồ nội thất riêng cho từng nhà, và chưa có phép đo ùn tắc dài ngày sau đổi mặt bằng.

## Bằng chứng Chrome

Trong `art/previews/city-redesign/` có ảnh trước/sau cùng camera, sơ đồ `layout.png`, ảnh toàn thành `city.png`, khu chợ `market.png`, khu dân cư `residences.png`, phủ thành chủ `palace.png`, lớp va chạm `navigation.png`, chợ đêm `market-night.png` và số liệu `verification.json`.

Màu lạnh buổi tối phủ theo phạm vi camera trong thành. Đèn, phướn, hoa, khói và gợn nước cập nhật theo nhóm ở 8 Hz, giảm hoặc ngừng ở zoom xa. Vật cản giữ nguyên theo tọa độ chân trong các khung hình.


## Hiệu năng

Đo trên Chrome production, 1304×955, zoom 0,95. Cột p95 đo thời gian một khung hình. Trường hợp 60 và 108 ép số NPC vào khung hình để kiểm tra tải render.

| NPC hiển thị | SwiftShader trước → sau | p95 trước → sau | Quadro 600 trước → sau | p95 GPU sau |
| --- | ---: | ---: | ---: | ---: |
| Tự nhiên, khoảng 16 | 37,0 → 28,9 FPS | 33,4 → 50,0 ms | 59,0 → 60,0 FPS | 16,8 ms |
| 60 | 33,7 → 25,7 FPS | 33,4 → 50,1 ms | 59,4 → 60,0 FPS | 16,8 ms |
| 108 | 32,9 → 25,7 FPS | 33,4 → 50,1 ms | 60,0 → 60,0 FPS | 16,8 ms |

Ở ca 108 NPC, draw calls trung bình tăng từ 6,0 lên 9,0 mỗi frame. Game Object tăng từ 960 lên 1121. Terrain atlas vẫn hoạt động với 905 tổ hợp tile. Chợ đêm đạt 25,0 FPS trên SwiftShader. Chi phí cập nhật nhóm hiệu ứng trung bình 0.08 ms mỗi frame trong cảnh đó, gồm cả những frame bộ định thời bỏ qua. Atlas chia sẻ, culling và vùng vẽ cắt sát alpha giảm phần phải raster, song chế độ render phần mềm vẫn chậm hơn bản trước.

JSON gốc nằm tại `art/previews/performance/1.8/city-redesign-*.json`. Để chạy lại phép đo, dùng `node tools/benchmark-world-1.8.mjs`, với `BENCH_COUNTS=normal,60,108` và `GAME_TEST_ORIGIN` trỏ đến bản muốn đo. `BENCH_GPU=hardware` dùng WebGL phần cứng.

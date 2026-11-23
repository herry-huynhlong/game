# Monster System 2.0 — Thanh Vân Ký

Mở game local tại `http://127.0.0.1:5183/`. Trong menu kiểm tra hoặc **F3**, chọn tên loài để tới sinh cảnh. Mở `http://127.0.0.1:5183/monster-gallery.html` để xem sáu biến thể, chọn hướng, pose, frame, zoom và bật vùng chân. **Diễn kỹ năng** xem nhịp báo đòn và ra đòn. **Đấu với thợ săn** chạy riêng trên một bản đồ thử có vật cản, dùng chung bộ xử lý kỹ năng, vùng chân và chiến lợi phẩm.

## Sinh cảnh và kỹ năng

| Loài | Sinh cảnh trên Tiled | Thường | Kỹ năng thêm ở Tinh Anh |
| --- | --- | --- | --- |
| Thanh Ảnh Lang | Hai vùng rừng Tây, 5 cá thể mỗi vùng | Lang Nha Cắn, Ảnh Bộ | Lang Vương Hống, Ảnh Lang Phác |
| Xích Giáp Sơn Trư | Chân núi Bắc, 5 cá thể | Thiết Nha Húc, Sơn Trư Xung Phong | Cuồng Giáp, Chấn Địa |
| Bích Độc Thiềm | Hai bãi ẩm bên bờ Đông, lần lượt 5 và 4 cá thể | Độc Thiệt, Độc Dịch | Bích Độc Vụ, Độc Thiềm Thiên Trụy |

Giới hạn Tinh Anh mặc định là 5% trên một lượt sinh hợp lệ, tối đa một cá thể sống mỗi vùng và chờ 135 giây mô phỏng từ lúc Tinh Anh bị hạ. Tỷ lệ, giới hạn và thời gian chờ lấy từ `MonsterRegistry.ts`. Tọa độ, số cá thể, thời gian tái sinh 17–24 giây, phạm vi đi lại và giới hạn truy đuổi đọc từ object layer **FaunaZones**. Kết quả lượt sinh dùng world ID và số thứ tự đã lưu.

Bộ xử lý chạy bước cố định 50 ms. Báo đòn và hiệu ứng dùng chung mốc thời gian với đòn thật. Vùng độc gây sát thương theo nhịp 850 ms. Đòn lao và cú nhảy quét theo footprint, tôn trọng vật cản và vùng an toàn. Xung phong dừng khi bị chặn, các bóng ảnh của sói chỉ là hiệu ứng. Buff gầm có thời hạn và cộng theo một hệ số duy nhất. Sơn Trư Tinh Anh có giáp phòng ngự trong thời gian Cuồng Giáp. Yêu thú vẫn quyết định và di chuyển ngoài camera.

## Tài nguyên và save

- Nguồn pixel art `art/source/monster-v2/draw-monsters.py`. Runtime có sáu spritesheet 80×72 px mỗi ô, hướng Bắc/Nam/Đông/Tây, bộ pose và PNG cho hiệu ứng, biểu tượng vật phẩm. Một số kỹ năng chia sẻ keyframe thân, với vệt lao, phạm vi cảnh báo và hiệu ứng riêng. Âm kỹ năng tổng hợp chạy khi Web Audio đã mở.
- Mã tích hợp chính ở `src/dao/MonsterRegistry.ts`, `MonsterCombat.ts`, `FaunaSystem.ts` và `src/world/MonsterVisuals.js`. Sinh cảnh chỉnh được trong `maps/world-rebuild-1b.tmj`. Script `tools/monster-v2/build-habitats.mjs` cập nhật riêng layer sinh cảnh.
- Migration chạy một lần, thay quần thể yêu thú cũ và hàng tái sinh cũ. NPC, vật phẩm đang có, chiến lợi phẩm cũ, cá và Huyền Hổ tiếp tục dùng hệ thống hiện hữu. Không thêm đợt phát loot khi migrate. Những file mỹ thuật cũ được giữ làm nguồn đối chiếu.
- Cú đánh lưu tình trạng đã kích hoạt và các mục tiêu đã trúng. Đạn, vùng độc, cấp bậc, hàng tái sinh, điều kiện sinh Tinh Anh và trạng thái nhặt loot được lưu. Chợ dùng giá và hàng tồn thực để giao dịch các vật liệu mới.

## Kiểm chứng

- Build TypeScript/Vite, kiểm tra tài nguyên release và test hệ thống đã chạy. Test xác nhận 12 kỹ năng, thời điểm gây sát thương, vùng độc nhịp, hồi chiêu, tường chắn đòn lao/nhảy/đạn, đàn sói cùng chọn mục tiêu, NPC yếu nhận lệnh tránh, save giữa đòn giữ nguyên dấu đã trúng và từng chiến lợi phẩm chỉ nhặt được một lần.
- Mẫu 300 thế giới với 5 cá thể trong một vùng sinh được 72 cá thể Tinh Anh trong 1.500 lượt sinh. Mỗi vùng có tối đa một con. Lượt hồi sinh trong thời gian chờ tạo cấp Thường.
- Chrome tải 108 NPC, 24 yêu thú và 5 cá. 10 Thanh Ảnh Lang thay đổi vị trí khi camera ở trong thành. Ca kiểm tra săn sử dụng thợ săn thật của WorldScene và sói đã bị thương, xác nhận AI hạ sói, nhặt một Lang nha, lưu hàng tái sinh và tải lại đúng chủ sở hữu chiến lợi phẩm.
- Sáu biến thể đã chạy trong Combat Arena, đủ 12 kỹ năng được khởi động qua UI. Trong lượt đấu 16,5 giây, Sơn Trư Tinh Anh và thợ săn đều còn sống. Character Editor tải được giao diện, sân thử và điều khiển Huyền Hổ. Chrome không ghi nhận lỗi JavaScript hoặc HTTP asset trong lượt này.
- Chưa có lượt cân bằng nhiều ngày với 108 NPC sau khi đổi loài. Hiệu ứng độc hiện tác động trong vùng, chưa có trạng thái độc kéo dài khi rời vùng. Âm thanh chưa được thẩm định bằng tai trên trình duyệt headless.

Ảnh Chrome và dữ liệu `verification.json` nằm tại `art/previews/monster-v2/`.


## Hiệu năng

Đo Chrome 1304×955, zoom 0,95, một lượt mỗi trường hợp. Bản đối chiếu là bản phát hành v0.1.11. Trường hợp 108 ép số NPC hiển thị để đo tải. Đây là bài đo WorldScene, chưa đại diện cho tất cả yêu thú dùng kỹ năng cùng lúc.

| Trường hợp | SwiftShader trước → sau | p95 SwiftShader | Quadro 600 trước → sau | p95 Quadro |
| --- | ---: | ---: | ---: | ---: |
| Tự nhiên | 27,3 → 26,5 FPS | 50,0 → 50,1 ms | 59,4 → 60,0 FPS | 16,8 ms |
| 108 hiển thị | 23,7 → 23,0 FPS | 50,1 → 66,8 ms | 60,0 → 60,0 FPS | 16,8 ms |

Số liệu gốc ở `art/previews/performance/1.8/monster-v2-*.json`.

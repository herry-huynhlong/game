# Điểm neo đả tọa và đường tránh NPC

Mở WorldScene tại `http://127.0.0.1:5183/`. Trong menu ☰, chọn **Điểm neo và đường tránh đả tọa**. Dấu hồng chỉ đầu, vàng chỉ cổ, lam chỉ thân và khung xanh chỉ footprint trên mặt đất. Đường vàng gồm các waypoint. Vạch lam của NPC đang di chuyển chỉ vận tốc. Trong Console, `window.__worldRebuild.getMeditationTraffic()` hiển thị thời gian bị chặn, số lần tìm lại đường và lý do chờ.

## Nguyên nhân và cách sửa

- Tư thế đứng lấy đầu, tóc và mặt từ nhiều atlas có vị trí cổ khác nhau. Tư thế đả tọa trước đó áp cùng độ dời theo trục Y cho tất cả atlas, còn thân ngồi lấy từ một texture riêng. Ở tiên tử, cổ gốc gần Y=22, trong khi atlas gốc đạo sĩ gần Y=39. Phần đầu tiên tử còn cao hơn cổ thân ngồi. Renderer nay dùng điểm cổ nguồn theo atlas và hướng, rồi gắn cụm đầu vào điểm cổ đích dùng chung với phần vẽ thân. Nhịp thở tác động lên cả hai phần. Tâm tiếp đất cố định.
- Tuyến cũ chỉ ưu tiên occupancy động gần cổng và quầy hàng. Khi né, NPC có thể chọn điểm đích trống và vẫn vướng trên đoạn đi đến đó. Bộ tìm đường cục bộ nay kiểm tra footprint dọc từng đoạn, giữ đường vòng cho tới khi nhập lại tuyến. Khu vực có người ngồi cũng kích hoạt tìm tuyến tính đến occupancy trên các ô lân cận. Nếu không thông, NPC chờ hoặc tìm lại đường có giới hạn.
- Người ngồi sử dụng footprint 22×12 world pixel, hoặc 24×14 cho dáng lực lưỡng. Spatial index cập nhật footprint khi đổi trạng thái. Vị trí ngồi được đặt chỗ, kiểm tra khoảng trống và tránh đường, cổng, cầu, cửa ra vào và sạp. Khi đứng, footprint trở về kích thước đi bộ. Khi chết, nó được gỡ.

## Kết quả

- Build, bộ test hệ thống và kiểm tra gói phát hành đạt. Unit test kiểm tra điểm cổ theo bốn hướng, NPC ngồi bất ngờ chắn tuyến trước đó thông, và thu gọn hoặc giải phóng footprint khi đứng, khi chết.
- Chrome chạy một NPC đi vòng, hai NPC đi ngược chiều cạnh một người ngồi, và năm NPC đi qua nhóm mười người ngồi. Các ca qua đường đạt đích trong sai số 13 world pixel, giữ mục tiêu đi làm. Không ghi nhận chồng footprint trong mẫu kiểm tra. Tải lại khôi phục đủ mười chỗ ngồi trong bản lưu thử.
- So sánh Chrome headless cùng vị trí và zoom 1,8× đạt khoảng 60 FPS trước và sau, p95 16,7–16,8 ms. Tổng thời gian dò tuyến của ca hai người qua một người ngồi là khoảng 0,2 ms ở lượt đo cũ và 1,1–2,5 ms trong hai lượt đo mới. Đây là bài đo ngắn. Cả bản trước và sau đều qua được ca đối chứng có khoảng trống rộng.
- Sau ba ngày mô phỏng 108 NPC, cuối bài thử còn 22 cư dân có cờ đường bị chặn. Bốn NPC từng chậm tiến triển ít nhất 30 phút trong game khi trạng thái né nhóm đả tọa vẫn được ghi nhận. Kết quả đủ để xác nhận các ca có lối vòng đã thử, còn tình huống tắc nghẽn kéo dài trên toàn bản đồ cần được theo dõi riêng.

Ảnh, video và số liệu nằm trong `art/previews/meditation-traffic/`. Log mô phỏng dài nằm tại `art/previews/world-cultivation/browser.json`.

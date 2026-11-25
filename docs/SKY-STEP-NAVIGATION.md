# Di chuyển, Đạp Gió Lướt Mây và đột phá

## Cách chơi

Mở [Thanh Vân Ký local](http://127.0.0.1:5183/). Nhập thân một NPC từ **Kim Đan tầng 1**, nhấn **T**, rồi rê chuột và bấm chọn điểm đáp. Vòng xanh đánh dấu tầm, điểm xanh báo vị trí đáp, điểm đỏ báo nơi bị từ chối. **Esc** hủy chọn. **V** tiếp tục dùng cho ngự kiếm từ Trúc Cơ.

Đạp Gió Lướt Mây tiêu hao 34 linh lực và yêu cầu còn 9 linh lực dự trữ. Hồi chiêu 46 giây mô phỏng, tầm 1.380 đơn vị ở Kim Đan và tăng theo cảnh giới. AI cân nhắc thân pháp cho hành trình từ 720 đơn vị trở lên. Bản lưu giữ pha, thời gian đã chạy, điểm đi, điểm đáp, mục tiêu cũ và thời gian hồi. Điểm đáp được giữ chỗ rồi kiểm tra lại trước khi dịch chuyển. Tuyến đi tuân theo các vùng cấm hiện có và hai đầu phải nối được với địa hình hợp lệ.

## Thay đổi di chuyển mặt đất

WorldScene dùng vị trí của NPC và bước quét footprint của GroundOccupancy. Sprite và các lớp nhân vật đọc kết quả. Scheduler đóng quyền đi bộ của NPC đang ngự kiếm, lướt mây hoặc do người chơi điều khiển. A* tìm đường tĩnh. Grid cục bộ xử lý người ngồi thiền, người đứng và nhóm chặn đường. Các đoạn né có giới hạn tìm kiếm và giữ cùng hướng đủ lâu. Trên cổng một làn, lượt được nhường theo thứ tự với thời hạn khi người giữ lượt chưa vào lối. Cầu Đông phân hai làn. Khi không tiến triển, NPC có thể xin chỗ làm gần hơn hoặc rời kế hoạch đã bế tắc.

## Tu luyện

- Luyện Khí tự thăng tiểu tầng khi đủ tu vi, giữ phần dư cho tầng sau và dừng ở bình cảnh tầng 9. Mỗi lần tăng không tốn đan. Lượt lên Trúc Cơ và các lần vượt đại cảnh giới tiếp theo trong WorldScene đi qua cùng bộ trạng thái thiên kiếp đã có.
- Xác suất dựa trên thiên phú, công pháp, sinh lực, linh lực, mệt mỏi và hộ phù. Các lượt đã bắt đầu giữ nguyên roll và xác suất khi tải lại. Tu sĩ thất bại giữ một phần tu vi, chịu thương tích từ các đạo lôi và có thời gian hồi phục tăng theo cấp.

| Vượt lên | Mẫu | Thành công cấu hình với nhân vật chuẩn bị tốt | Thành công thực nghiệm |
| --- | ---: | ---: | ---: |
| Trúc Cơ | 4.200 | 93,5% | 94,02% |
| Kim Đan | 4.200 | 86,0% | 86,60% |
| Nguyên Anh | 4.200 | 77,0% | 78,05% |
| Hóa Thần | 4.200 | 67,0% | 67,86% |

Kiểm thử dùng seed cố định và chạy toàn bộ các đạo lôi. Các tỷ lệ trên áp dụng cho hồ sơ mẫu, với đầy sinh lực, 85% linh lực, thiên phú 78, công pháp cấp 4 và mệt mỏi 10. Điều kiện cá thể khác thay đổi kết quả.

## Kiểm tra lại

```powershell
npm run build
npm run test:systems
node tests/sky-step-browser.mjs --video
node tests/travel-navigation-browser.mjs
node tests/meditation-traffic-browser.mjs
node tests/west-gate-trade-browser.mjs
node tests/world-performance-browser.mjs
```

Các bài Chrome dùng bản lưu riêng. Ảnh, video, trước/sau và JSON kiểm tra nằm trong `art/previews/sky-step/` và `art/previews/meditation-traffic/`. Atlas mây gốc được vẽ và xuất bằng `art/source/draw-sky-step.py`. Âm gió dùng lại bản WAV local của hệ thống thiên kiếp. Video thân pháp dùng frame Phaser và ghép âm gió của game.

## Kết quả trên WorldScene

Hai NPC đi ngược chiều qua một người đang đả tọa đều tới đích. Năm người vượt qua nhóm mười NPC ngồi thiền. Năm khách giao dịch ở chợ và mười NPC qua cổng Tây đều hoàn thành trong các kịch bản Chrome. Cầu Đông có hai làn, cả năm NPC đi qua hai chiều trong 15,8 giây mô phỏng. Các bài qua cầu/cổng và né nhóm vừa nêu ghi nhận 0 chồng lấn và 0 bước xuyên vật cản khi các cơ thể thử bắt đầu hợp lệ. Khi mục tiêu bị người khác chiếm, NPC chọn được chỗ đứng kế bên và hoàn thành. Tọa độ ngoài bản đồ bị từ chối. Kịch bản đổi sang chạy tránh nguy hiểm giữa đường giữ được mục tiêu mới.

Trong kịch bản cả nhóm đứng chắn đường, người đi vòng tới đích sau 13,75 giây mô phỏng. Hệ thống ghi 5 lần tìm đường và 4 lần đảo hướng nhanh. Độ trễ khi không tiến gần đích có đoạn lên đến 8,45 giây. Đây là trường hợp cần tiếp tục theo dõi khi mật độ NPC tăng.

Một lượt mô phỏng ba ngày trong WorldScene ghi nhận 56 NPC từng đả tọa, một lượt đại cảnh giới tự khởi phát và hoàn tất, và 86 giao dịch. Số NPC có cờ chặn đường đạt đỉnh 28 và còn 6 ở cuối mẫu. Cờ này gồm cả các chặn đường tạm thời được ghi trong bộ điều khiển.

Lượt đo Chrome SwiftShader với 108 NPC và yêu thú, kích thước 1304×955, zoom 0,95×, ghi 26,47 FPS trước sửa và 27,67 FPS ở lượt cuối. Frame time p95 xấp xỉ 50 ms ở cả hai. Tổng thời gian trong hàm tìm đường tăng từ khoảng 53 lên 131 ms trên cửa sổ đo 6,2 giây, dù số lần thực sự gọi A* gần như giữ nguyên (216 và 217). Mốc 60 FPS chưa đạt ở cấu hình kết xuất phần mềm này. Phép đo cục bộ quanh sân thiền trong Chrome dùng cấu hình kết xuất khác, nên được ghi riêng.

Video đối chiếu chuyển động cũ là clip đã lưu ở đợt đả tọa trước. Bài đo trước sửa lần này có JSON và ảnh riêng. Video đợt này ghi theo bước mô phỏng cố định từ WorldScene.

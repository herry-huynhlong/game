# GFX.5B.4C-A2 — nghiên cứu C03

## Đã làm

- Phương án A: mở file C03 GFX.5B.4B bằng Aseprite Lua, vẽ lại các layer mặt, tóc trước, tay áo và chi tiết của **một frame** nhìn chéo xuống phải. 97 frame còn lại giữ nguyên. Thêm 21 tag trên file nguồn theo các dải frame hiện có; không thay đổi frame duration.
- Phương án B: vẽ mới **một tư thế** C03 trên canvas 48×64, không phóng to sprite cũ. Các lớp bóng, chân, tóc, đạo bào, tay, mặt và phụ kiện tách trong 8 layer.
- So sánh hai mẫu với sprite cũ ở cùng chiều cao canvas 40 pixel. Mẫu B phải scale 0,625 còn 30×40; dùng pixelArt/nearest trong Phaser. Đây là đánh đổi: có thêm chi tiết tại nguồn, nhưng khi thu về cỡ game một số chi tiết mất hoặc không đều.
- Trang nghiên cứu Phaser hiển thị cùng lúc ba bản và có thể mở bằng `/gfx5b4c-a2-study.html`; trang này không tạo NPC hoặc thay LocalStorage.

## Kiểm chứng

- Aseprite CLI đã mở lại hai file nguồn: A 32×40, 98 frame, 8 layer, 21 tag; B 48×64, một frame, 8 layer, chưa có tag animation. `inspection-A-32.txt` và `inspection-B-48.txt` là kết quả đọc lại.
- `compare_studies.py` so sánh 98 frame của A với bản cũ và xác nhận chỉ frame 4 (0-based) thay đổi, PNG có alpha.
- Đã mở cảnh nghiên cứu trong Chromium/Phaser, xem ảnh chụp và kiểm tra không có ngoại lệ JavaScript, không thay đổi LocalStorage.
- TypeScript/Vite build và `test:systems` chạy đạt. Phaser vẫn có cảnh báo chunk lớn.

## Chưa đạt và chưa làm

- Chưa thể kết luận chuẩn 32×40 hay 48×64 qua một góc và một tư thế; tạm giữ chuẩn game hiện tại để không ảnh hưởng NPC, không coi đây là quyết định cuối.
- Bản A chưa có chu kỳ đi mới; B chỉ có một frame và chưa có idle, walk hoặc các tư thế đặc biệt. Hai bản chưa sẵn sàng tích hợp NPC thực.
- C01, C02, C04 và C05 chưa được vẽ lại. Chưa xác minh tám hướng, thay đổi tốc độ, khuất vật thể, save/load, chuyển hướng và nhịp chân trên NPC trong Phaser. Chưa có ảnh cạnh nhà/cây hay video NPC thật của bộ mới.
- Các file game/animation chính không bị thay thế; chỉ bổ sung trang nghiên cứu, ảnh thử và mục build trang đó. Không thay đổi AI, va chạm, tốc độ, save hoặc gameplay.

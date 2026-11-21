# GFX.5B.4C-A4 — C03 32×40

## Thay đổi mỹ thuật

- `C03-a4.aseprite` mở và chỉnh trực tiếp từ tài liệu A3 bằng Aseprite Lua. Hai hướng NE và NW được vẽ lại trên các layer tóc trước/sau, mặt/tai, đạo bào, tay áo, chân và chi tiết, với tư thế vai và vạt gần/xa khác nhau; không xoay toàn sprite. Sáu hướng đi còn lại bổ sung dao động tóc sau và chi tiết vạt. Tay/chân đã có chu kỳ A3 được giữ/chỉnh riêng trong NE/NW.
- File 32×40, 8 layer, 98 frame, 21 tag. Atlas 256×520 trong suốt. Script so sánh ghi nhận 56 frame có thay đổi; toàn bộ frame 80–97 là ảnh tổng hợp giống A3, chưa được hoàn thiện lại trong A4. Tám hướng walk có sáu frame khác nhau; không coi con số này là chứng nhận thẩm mỹ.
- `before-after-8directions.png`, `north-nw-ne.png` (có phiên bản xám), `walk-diagonals.png`, GIF tám hướng và GIF NE/NW/SE xuất từ atlas. NE và NW vẫn có kích thước nhỏ và các cụm vai/tóc có thể cần chỉnh tiếp sau khi đánh giá ở zoom thực tế.
- Pivot trong metadata `(16,40)`; loader vẫn dùng 32×40, origin `(.5,1)` và hitbox Arcade `(18,10)` offset `(7,28)`. Kiểm tra alpha không thấy frame 0–79 chạm mép trên/hai bên; không chứng minh mọi trường hợp che khuất bằng điều đó.

## Tích hợp

- `?gfx5b4c4=1` chọn asset A4 cho mẫu NPC thật `qingyun-01`, các NPC khác giữ texture bình thường. Điều kiện nghề/giới tính, fallback khi nhập hồn hoặc có trang bị và phiên bản A3 vẫn giữ. Không đổi thuộc tính NPC, AI, pathfinding, vật lý hay dữ liệu save của người chơi; chỉ thêm lựa chọn texture và sử dụng giữ pha animation walk khi đổi hướng.
- `gfx5b4c-a4-lab.html` là cảnh riêng không chứa NPC dữ liệu, không sửa LocalStorage: actor dùng Arcade Physics, hitbox tương đương, cùng hàm chọn hướng, 42 px/s ở ×1, đủ tám hướng, một đoạn dừng và các góc đổi 45/90/135/180 độ. Đây không phải AI của NPC thật và sân thử không có vật cản.

## Bằng chứng

- `art/previews/gfx5b4c-a4-lab/arcade-route.webm` ghi canvas Phaser lộ trình sân thử; `trace.json` và `DIRECTION-REPORT-VI.md` ghi vị trí, delta thực, animation/frame và dừng/đi tiếp. Đối chiếu tự động: mọi mẫu displacement khác 0 có walk khớp octant thực; sáu frame walk của từng hướng đã xuất hiện; đoạn idle không đổi vị trí. Mỗi hướng đầu có khoảng 1,5–1,6 giây quan sát, tương đương hơn một chu kỳ frame ở 120 ms/frame. Việc này không tự chứng minh bước chân không trượt.
- `art/previews/gfx5b4c-a4-world/npc-real.webm` là video NPC qingyun-01 thật ở tốc độ ×1, camera theo dõi; cảnh ghi chủ yếu hướng ngang. `observations.json` và ảnh `frame-*.png` là lần kiểm tra NPC thật riêng, reload giữ `visualStyleId`, sprite A4 được tải lại, không lỗi JavaScript; các NPC khác vẫn texture cũ. Hồ sơ Chrome dùng cho kiểm thử tách biệt.
- Đã chạy TypeScript/Vite build, `test:systems`, kiểm thử prototype/fallback, kiểm thử chọn hướng, và `tests/gfx5b4c-a4-trace.test.mjs`; đều đạt. Vite còn cảnh báo bundle Phaser lớn, không xử lý trong phạm vi này.

## Chưa xác nhận

- Chưa có video NPC thật trong bản đồ đi đủ tám hướng ở ×1. Lộ trình tám hướng là actor trong sân thử riêng, còn NPC thật được ghi chủ yếu đi ngang.
- Chưa ghi được bằng chứng NPC A4 đi sau/trước cây và công trình trong bản đồ thật; collision và thứ tự che khuất không được xác nhận bằng cảnh sân trống.
- Chưa đo định lượng trượt chân, độ giật chuyển hướng, rung pixel camera hoặc FPS. Không tự kết luận mỹ thuật đạt chuẩn cuối; cần người dùng xem các ảnh/video. Chưa phát triển hit, death hoặc gameplay mới.

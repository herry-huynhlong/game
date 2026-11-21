# C03 A6 — mẫu ba tư thế

- `C03-A6-three-poses.aseprite`: nguồn Aseprite 48×64, 3 frame, 10 layer, 3 tag.
- `draw_c03_a6.lua`: script Lua vẽ riêng silhouette, tóc, mặt, lớp áo, tay áo, chân/giày và viền thêu ở từng hướng.
- `C03-A6-three-poses-export.json`: metadata strip 144×64 gồm 3 frame 48×64.
- `C03-A6-three-poses-4x.png`: ảnh xem 4× nearest-neighbor.
- `C03-A6-source-inspection.txt`: kết quả đọc lại file nguồn bằng Aseprite CLI.

Các tag nguồn: `idle_front`, `idle_profile_east`, `idle_three_quarter_south_east`. Đây là ba pose tĩnh để duyệt, chưa phải animation đi bộ. File `.aseprite` được mở/đọc lại và xuất PNG qua Aseprite CLI; GUI Aseprite chưa được xác nhận trong lượt này.

Runtime art được chép riêng vào `public/assets/characters/gfx5b4c-a6/`; nó chưa thay sprite mặc định của game và không làm thay đổi gameplay/save.

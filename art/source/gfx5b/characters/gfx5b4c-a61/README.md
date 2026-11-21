# C03 A6.1 — ba pose chỉnh mỹ thuật

- `C03-A6.1-three-poses.aseprite`: file nguồn Aseprite 48×64, 3 frame, 10 layer, 3 tag.
- `draw_c03_a61.lua`: script Aseprite Lua vẽ lại ba pose độc lập.
- `crop_c03_a61.lua`: tạo các crop riêng cho mặt, tay/thân áo và vạt áo/giày.
- `C03-A6.1-three-poses.json`: metadata strip PNG 144×64.
- `native/`: các bản Aseprite, PNG, crop và bản 4× đã xuất.
- `C03-A6.1-source-inspection.txt`: kết quả Aseprite CLI đọc lại nguồn.

Các tag: `idle_front`, `idle_profile_east`, `idle_three_quarter_south_east`. Nguồn được tạo và đọc lại bằng Aseprite CLI; chưa kiểm tra mở qua GUI. Runtime art chỉ được dùng trong showcase, không thay NPC mặc định.

# C03 A6.3 — tu sĩ trẻ Thanh Vân Tông

A6.3 là biến thể riêng dựa trên dáng đứng A6.2. A6.2 tiếp tục được giữ làm mẫu võ giả trưởng thành áo nâu; A5, A6, A6.1 và A6.2 không bị ghi đè.

- Canvas nguồn: 48×64 px, 3 frame pose tĩnh, 10 layer chỉnh sửa, 3 tag pose.
- Pose: chính diện, nghiêng ngang, góc 3/4. Không có walk/animation.
- Ngoại hình: không râu, tóc đen buộc cao, đạo bào ngọc lam với áo trong ngà và thắt lưng.
- Tạo bằng Aseprite Lua/CLI; không dùng ảnh AI, ảnh chụp hay ảnh tham chiếu làm pixel texture.
- Kiểm tra nguồn bằng Aseprite CLI; chưa xác nhận mở/chỉnh sửa file bằng GUI.
- Chỉ dùng trong trang showcase. Không đổi NPC mặc định, gameplay hoặc save.

## Tệp

- `native/C03-A6.3-three-poses.aseprite`: nguồn chính.
- `draw_c03_a63.lua`: script vẽ 3 pose.
- `crop_c03_a63.lua`: script tạo các crop cận để duyệt.
- `make_c03_a63_silhouette.lua`: xuất silhouette.
- `inspect_c03_a63.lua`: đọc kích thước, frame, layer và tag bằng Aseprite CLI.
- `native/C03-A6.3-three-poses.png` và `.json`: xuất nguồn 1×/metadata.
- `public/assets/characters/gfx5b4c-a63/`: PNG runtime, sheet 4×, metadata, silhouette và crop.
- `/gfx5b4c-a63-showcase.html`: trang so sánh A5/A6/A6.2/A6.3 và kiểm tra trong Phaser.

A6.3 đang chờ người dùng duyệt mỹ thuật.

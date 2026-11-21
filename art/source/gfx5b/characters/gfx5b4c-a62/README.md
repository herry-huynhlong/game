# C03 A6.2 — mẫu tham chiếu võ giả

- `C03-A6.2-three-poses.aseprite`: 48×64, ba pose, 11 layer, 3 tag.
- `draw_c03_a62.lua`: tạo hình pixel riêng theo ảnh tham chiếu người dùng: tóc buộc, râu ria, áo võ giả nâu, thắt lưng và tư thế thả lỏng. Không dùng pixel của ảnh tham chiếu.
- `crop_c03_a62.lua`: tạo crop cận mặt/râu, vai/tay/áo và vạt/giày.
- `native/`: nguồn Aseprite và các PNG/metadata đã xuất.
- `C03-A6.2-source-inspection.txt`: kết quả đọc lại file nguồn bằng Aseprite CLI.

Pose tags: `idle_front`, `idle_profile_east`, `idle_three_quarter_south_east`. Đây là pose tĩnh, chưa phải animation. Nguồn được xác minh bằng CLI; chưa xác nhận mở file bằng GUI Aseprite. Runtime art chỉ xuất hiện ở showcase.

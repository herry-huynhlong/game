# Bộ 12 NPC tiên hiệp — bản duyệt mỹ thuật

Ngày 2026-11-23. Có 12 mẫu chính diện tĩnh, PNG trong suốt, atlas và gallery Phaser. Chưa thay NPC runtime, chưa sửa save, chưa tạo animation hoặc paper-doll rig.

## Tham chiếu và quy tắc
- Ảnh đạo sĩ dùng làm chuẩn cụm pixel, cấu trúc cổ áo, lớp áo, tóc bạc và vị trí tay.
- Ảnh nữ tiên dùng làm chuẩn thiết kế tóc, trang sức và dải lụa. Đây là minh họa mượt, không phải sprite pixel art có thể cắt dùng trực tiếp.
- Hướng sáng trên trái, viền màu tối thay vì đen tuyệt đối. Áo trong/ngoài tách màu, cổ giao lĩnh, đai lưng và giày rõ.
- Canvas 64×96 cho 10 mẫu. NPC03 và NPC11 dùng 80×112. Chiều cao hình thể chuẩn hóa khoảng 90 pixel, chân ở y=height−3.
- Mục tiêu đầu và tóc khoảng một phần ba chiều cao. Tỷ lệ thực tế còn dao động, chưa đo/duyệt thủ công từng mốc giải phẫu.

## Nguồn tạo, công cụ và quyền
Ảnh ban đầu được tạo bằng công cụ image_gen tích hợp, mỗi nhân vật một prompt riêng. Không lấy sprite từ ảnh tham chiếu hoặc trang bán asset. Không tuyên bố vẽ thủ công hoặc bảo đảm độc quyền bản quyền đối với đầu ra AI.

Python/Pillow chuẩn hóa alpha với ngưỡng 200, crop theo alpha, thu cùng tỷ lệ bằng nearest-neighbor, giới hạn 40 màu không dithering, bỏ điểm alpha đơn lẻ tách rời, ghép atlas và preview. Không dùng primitive để dựng nhân vật. Đây là quy trình AI + chuẩn hóa raster được yêu cầu mới cho phép, không phải quy trình pixel-run cũ.

Aseprite CLI đã nhập PNG và lưu .aseprite, kiểm tra header đúng kích thước và 1 frame mỗi file. Có layer artwork phẳng và layer Retouch trống để sửa sau. Không có các layer tóc/mặt/áo tách rời. Chưa kiểm tra GUI Aseprite. API sử dụng app.open được đối chiếu tại https://aseprite.org/api/app#appopen.

## Tái xuất
`python tools/npc-xianxia-12/export.py`

Sau khi cập nhật ảnh pixels.png trong art/source/npc-xianxia-12/editable/01..12, chạy Aseprite CLI với `--batch --script-param root=D:/anh/game/xianxia-mvp --script tools/npc-xianxia-12/export-native.lua` để tạo file chỉnh sửa. Script export-native nhập PNG, không tự vẽ lớp giải phẫu.

## Kiểm chứng
- Build TypeScript + Vite thành công.
- 12 PNG đúng kích thước, alpha chỉ 0 và 255, tối đa 40 màu opaque. validation.json ghi bbox và số màu.
- Chrome chạy bản production gallery, tải atlas đủ 12 frame, xem 1×/2×/3×, không có runtime error hoặc asset 404.
- Screenshot tại art/previews/npc-xianxia-12/1x.png, 2x.png, 3x.png và verification.json.
- Không đọc/ghi LocalStorage trong gallery. Không nối các sprite tĩnh này vào animation của 108 NPC.

## Đánh giá và giới hạn
Silhouette, chất liệu và vai trò đã khác nhau. Các mẫu 06,10,12 đọc rõ ở tỷ lệ nhỏ. Mẫu 02,05,11 còn dày họa tiết, ngũ quan mất một phần chi tiết khi thu nhỏ. Bộ này là bản duyệt, chưa xác nhận cả 12 đạt mức chất lượng chuyên nghiệp như mục tiêu. Cần duyệt và retouch theo từng nhân vật trước khi làm hướng khác, chuyển động hoặc thay roster.

Pháp trượng ở NPC05 là một phần hình minh họa tĩnh, không phải item được cấp vào inventory. Các mẫu kiếm tu không có kiếm gắn cứng để tránh biểu diễn sai trang bị thật.

## Bàn giao
- assets/npc/npc_01.png … npc_12.png
- assets/npc/npc_spritesheet.png (320×336)
- assets/npc/npc_atlas.json, npc_metadata.json (tên, palette, canvas, điểm neo, provenance)
- assets/npc/npc_preview.png và npc_grid_1x.png / npc_grid_2x.png
- public/assets/npc/ là bản sao cho gallery
- art/source/npc-xianxia-12/ chứa nguồn AI và 12 file Aseprite
- tools/npc-xianxia-12/ chứa script xuất và mô tả prompt
- npc-xianxia-gallery.html, src/npc-xianxia-gallery.js, vite.config.js thêm gallery độc lập

Chưa push/deploy bộ mỹ thuật này. Game runtime hiện hữu giữ nguyên.

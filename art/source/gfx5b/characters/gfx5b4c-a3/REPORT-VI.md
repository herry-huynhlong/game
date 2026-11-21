# GFX.5B.4C-A3 — C03 mẫu thử

## Tỷ lệ và nguồn

Chọn **32×40 cho mẫu hiện tại**, sau khi so sánh bốn tư thế đại diện trong cảnh Phaser: trước, ngang, chéo, bước chéo. Mẫu 48×64 được vẽ thêm ba tư thế trên file A2; khi hiển thị cùng chiều cao canvas 40px nó scale về 30×40, dẫn đến mất hoặc phân bố lại một số chi tiết nguồn. 32×40 giữ cùng lưới pixel, origin và hitbox cũ. Đây là quyết định cho mẫu đang chạy; chưa chứng minh 32×40 sẽ tốt hơn ở mọi zoom.

- So sánh trong browser: `art/previews/gfx5b4c-a3-comparison/phaser-study.png`; trang `/gfx5b4c-a3-comparison.html`.
- Mẫu 48×64 có 4 tư thế nghiên cứu, không phải animation; nguồn `C03-study-B-four-poses.aseprite`.
- Tỷ lệ với H01 và cây: `scale-h01-tree-composite.png` là ảnh ghép tài nguyên, không phải ảnh game. H01 dùng tỉ lệ đề xuất 1,25 và chưa tích hợp; cây được minh họa khoảng 1,33.

## Mẫu C03 32×40

- `C03-a3.aseprite`: 8 layer, 98 frame, 21 tag; metadata `C03-a3.animations.json` có frame, duration và pivot `(16,40)`. 32 frame idle và 48 frame walk; sáu frame đi cho mỗi hướng.
- Script Aseprite mở tài liệu 4B hiện có, tham khảo đầu SE từ nghiên cứu A2, chỉnh các frame 0–79: đầu và tóc, tay áo, tay, chân/giày và chi tiết cổ áo, thắt lưng, vạt áo. Phần nền đạo bào và tóc sau tái sử dụng layer cũ. Các frame đặc biệt 80–97 giữ nguyên byte hình tổng hợp so với 4B.
- `before-after-8directions.png`, `walk-diagonals.png`, `C03-walk-8directions.gif` xuất từ atlas thật. Mỗi hướng walk có sáu frame khác nhau, nhưng điều này không tự chứng minh bước chân mượt.
- Phần đầu SE được vẽ trong nghiên cứu A2; SW tái sử dụng phản chiếu kèm sửa pixel. Tóc/đầu các hướng còn lại phát triển từ các layer cũ. Chưa được hiểu là toàn bộ nhân vật được vẽ lại từ đầu.
- Hướng NE/NW vẫn gần hình bóng nhìn sau; tư thế chân ở góc chéo còn cứng, nếp tay áo và độ trễ tóc/vạt áo còn đơn giản. Không đánh dấu mỹ thuật đạt chuẩn cuối.

## Game và kiểm thử

- `?gfx5b4c3=1` chỉ thử mẫu trên NPC qingyun-01 có nghề, giới tính phù hợp; các NPC khác giữ sprite hiện hành. Trang bị hoặc nhập hồn dùng fallback hiện có. Không ghi ID ngoại hình mới vào save, không thay AI, vị trí, tốc độ, hitbox hoặc pathfinding.
- Walk chuyển hướng trong mẫu thử giữ tiến độ animation để hạn chế reset nhịp bước. Chưa chứng minh mọi chuyển hướng đều không trượt chân.
- Browser test hồ sơ tách biệt: quan sát NPC thật di chuyển, camera theo dõi và reload giữ `visualStyleId`; không lỗi JavaScript. `frame-*.png` và `observations.json` là ảnh/nhật ký, `npc-real.webm` và `npc-real-video.gif` ghi canvas thật khoảng chín giây, phần quan sát chủ yếu đi ngang. `npc-real-browser.gif` là chuỗi screenshot thưa, không phải video mượt.
- Theo dõi AI tự nhiên với tốc độ mô phỏng ×4 trong 60 giây: `natural-directions.json` ghi nhận đủ tám tên animation walk khi vị trí NPC thay đổi. Không ép NPC đổi vị trí. Việc ghi nhận tên animation không xác minh bằng mắt mọi frame hoặc mọi góc cua.
- Chưa có bằng chứng trực quan đầy đủ cho chuyển hướng cả tám hướng, dừng rồi đi tiếp, khuất sau cây/nhà, không rung pixel khi camera di chuyển, mức trượt chân hoặc FPS trước/sau. Một số chuyển trạng thái được ghi trong nhật ký nhưng cần video thích hợp để đánh giá mỹ thuật.
- Kiểm tra số lượng và tính khác nhau của frame, alpha, khung hình không chạm cạnh trên/hai bên; kiểm thử prototype/fallback và chọn hướng đạt. Build TypeScript/Vite, `test:systems` đạt; còn cảnh báo chunk Phaser lớn.

Không phát triển hit, death, knockdown hay gameplay mới trong phần này. Mẫu vẫn cần đánh giá/sửa tiếp trước khi nhân rộng.

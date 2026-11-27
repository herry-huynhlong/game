# Vạn Kiếm Quy Tông · Duyệt mỹ thuật

[Mở Võ Kỹ Các](http://127.0.0.1:5183/?combatGallery=1&skill=myriad-unite) rồi bấm **Thi triển lại**. Chế độ **Trong game** dùng zoom 0,95×. Có thể đổi sang **Toàn cảnh**, zoom 2× hoặc 4×, ban đêm, bờ sông, chạy chậm và tiến từng giai đoạn.

## Kiểm tra bản trước

Tôi ghi lại toàn bộ lần thi triển trong Chrome với 175 khung hình trong khoảng 11,2 giây. Bản trước có độ cao nhân vật và giữ vị trí thật dưới chân. Động tác kết ấn nhìn nhỏ ở 0,95×. Trong cảnh ghi hình có sáu kiếm hoạt động, với vài vòng mảnh ở quanh thân. Phần lớn vệt kiếm ngắn, phản chiếu nền rất nhẹ và thời điểm tiếp đất khó thấy ở tốc độ bình thường. Bản cũ trong video là bản chạy thực tế cùng vị trí, cấu hình và tỷ lệ với bản mới.

## Cảnh mới

- **Vận công và cất lên.** Tóc sau, trang phục và hai tay dùng các mốc tạo thế trên modular rig. Bụi đất, lá cây nghiêng theo lực và bóng đổi độ rộng khi nhân vật lên cao. Độ cao mỹ thuật đạt khoảng 82 px ở cao trào, trong khi vị trí và tầm đánh vẫn dùng tọa độ mặt đất.
- **Mượn và lập trận.** Kiếm bay vào từ nhiều phía. Kiếm ảnh chia sáu tầng có bán kính, độ cao, tốc độ và hướng khác nhau. Pháp trận đất, mây, trận trên không, cự kiếm linh lực, vệt và va chạm có vị trí depth riêng. Khẩu quyết ở gần người thi triển, còn tên thần thông ở phần trên màn hình.
- **Xuất kích và quy chủ.** Kiếm xoay theo hướng đối thủ rồi lao theo đợt. Va chạm đọc trực tiếp từ sự kiện gameplay để bật thân sáng, vòng nứt và bụi. Kiếm logic quay về theo đường cũ. Pháp trận để lại lớp dư âm ngắn, tự thu và dọn.
- **Ánh sáng.** Atlas dùng pixel sampling. Phản chiếu hổ phách và bạc lạnh dùng blend cộng cục bộ trên WebGL. Bóng dưới đất và các lớp ánh sáng có giới hạn độ đậm. Rung camera tùy chọn chỉ phát một nhịp lúc có va chạm thật.

## Nguồn và ngân sách

| Nhóm texture | Số frame |
|---|---:|
| Kiếm có chuôi, hộ thủ, sống và linh văn | 5 mẫu |
| Pháp trận mặt đất | 6 |
| Pháp trận trên không | 6 |
| Vệt kiếm | 8 |
| Mây linh lực | 8 |
| Va chạm | 8 |
| Sóng xung kích | 8 |
| Bụi | 8 |
| Linh khí | 6 |
| Phản chiếu và bóng | 3 tĩnh |

Tập lệnh [draw-van-kiem.py](../art/source/draw-van-kiem.py) tạo atlas và sáu WAV tổng hợp. [van-kiem-master.lua](../art/source/van-kiem-master.lua) dùng Aseprite CLI để chuyển các texture thành [tệp nguồn Aseprite](../art/source/van-kiem-master.aseprite), có 16 layer và tám frame để kiểm tra và chỉnh sửa pixel.

Trận chính rộng khoảng 520 px theo trục ngang, bán kính khoảng 260 px. Đường kiếm ảnh từ xa có thể dài tới 550 px tính từ người thi triển. Các kích thước này thuộc mỹ thuật. Gameplay tiếp tục dùng tầm khóa 330 px cùng giới hạn hành trình và va chạm đã có. Mức Cao vẽ tối đa 144 kiếm ảnh trang trí cho lần thi triển chính và tối đa tám kiếm logic nếu có đủ kiếm hợp lệ. Tổng số kiếm logic phụ thuộc dữ liệu trong thế giới. Các cấp độ render và culling không chỉnh số kiếm logic, chi phí linh lực, HP hay quyền sở hữu. Dư âm dưới đất có thể kéo dài thêm 1,12 giây sau khi kết thúc cast 10 giây.

## Bằng chứng

Clip và ảnh Chrome nằm ở `art/previews/van-kiem-art-review/`. Hai bộ `before/` và `after/` ghi cùng sân rừng và zoom 0,95×. Có thêm chuỗi bờ sông ban đêm và zoom 2×.

- [Video bản trước](../art/previews/van-kiem-art-review/van-kiem-truoc.mp4) và [video bản mới](../art/previews/van-kiem-art-review/van-kiem-sau.mp4). Cả hai dùng 175 khung hình Chrome thực tế trên 11,2 giây. Video bản mới ghép sáu âm thanh của game theo thời điểm phát; Chrome cũng xác nhận cả sáu cue phát trong lượt thử tương tác.
- [Ảnh cùng zoom tại 5,25 giây](../art/previews/van-kiem-art-review/kiem-tran-truoc-sau.png). Hai khung được cắt cùng tọa độ. Bản trước ở trái và bản mới ở phải.
- [Khẩu quyết zoom 2×](../art/previews/van-kiem-art-review/close/03-khau-quyet.png), [kiếm từ xa](../art/previews/van-kiem-art-review/after/05-muon-kiem-tu-xa.png), [lập trận](../art/previews/van-kiem-art-review/after/06-kiem-tran.png), [xuất kiếm](../art/previews/van-kiem-art-review/after/07-xuat-kiem.png), [va chạm ban đêm](../art/previews/van-kiem-art-review/night-by-river/dem-08-va-cham.png), [kiếm quy chủ](../art/previews/van-kiem-art-review/after/10-quy-chu-ha-xuong.png).

| Quan sát từ Chrome | Kết quả |
|---|---:|
| Kiếm thật được gọi trong mẫu | 6 |
| Tối đa kiếm hiển thị trong một khung | 150 |
| Đối tượng VFX hiển thị tối đa | 229 |
| FPS trung bình ở WebGL | 60,0 |
| Khung p95 / dài nhất | 16,8 / 16,9 ms |
| CPU p95 cho bước võ kỹ và cập nhật giao diện thử | 0,9 ms |
| Đối tượng VFX còn hiển thị sau 11,2 giây | 0 |

Đây là phép đo cục bộ ở 1584×955, zoom 0,95×, chất lượng Cao, một lần thi triển trọn vẹn. Đối chiếu cùng sân và đầu vào giữ sáu va chạm, 52 linh lực tiêu hao và cùng HP cuối của mục tiêu. Chi tiết lưu trong [timeline.json](../art/previews/van-kiem-art-review/after/timeline.json) và [benchmark.json](../art/previews/van-kiem-art-review/after/benchmark.json).

Phạm vi vòng duyệt là Vạn Kiếm Quy Nhất. Những texture và kỹ năng dành cho pháp tướng, Hỏa Long, Kim Ô, Lôi Long, băng và các công pháp còn lại thuộc đợt mở rộng sau duyệt.

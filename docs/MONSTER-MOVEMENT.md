# Thanh Vân Ký · Di chuyển yêu thú

## Nguyên nhân và cách sửa

AI trước đây đuổi theo một điểm gần mục tiêu mà không kiểm tra đường đi. Khi bị chặn, quy tắc né cục bộ thử lại từ đầu ở mỗi bước. Các cá thể cùng đuổi một mục tiêu có thể chọn cùng một điểm đứng. Lớp phục hồi va chạm cũng có thể thay đổi vị trí yêu thú độc lập với AI.

WorldScene và sân đấu dùng chung `MonsterMovement` làm nguồn cập nhật tọa độ mặt đất. Mỗi yêu thú có footprint riêng theo loài và cấp. Đi bộ, lao, nhảy và tách chồng lấn từ save cũ đều được kiểm tra với địa hình, bờ nước, giới hạn sinh cảnh và các body xung quanh. Hướng di chuyển thường được ghi nhận sau khi vận tốc theo hướng mới ổn định. Hướng thi triển tiếp tục bám theo điểm ngắm của kỹ năng.

Đuổi mục tiêu dùng tám sector để chọn chỗ đứng, với khoảng cách riêng theo loài. Khi có cá thể cùng chiều phía trước, yêu thú giữ khoảng cách. Khi gặp chướng ngại, nó tìm đường ở cấp footprint và có thể nhường cho cá thể đối hướng theo thứ tự ID. Sau các lần thử có giới hạn, yêu thú bỏ điểm đuổi bị khóa và quay về lãnh địa hoặc tiếp tục tuần tra.

| Mốc trong `MONSTER_MOVEMENT` | Giá trị |
| --- | ---: |
| Sai số đích và waypoint | 2 px và 5 px |
| Dời đích để cập nhật tuyến | 26 px |
| Phát hiện chặn liên tiếp | 650 ms |
| Phát hiện quanh một vị trí | 2.500 ms |
| Giữ bên né và thời gian nhường | 780 ms và 1.800 ms |
| Số lần thử tuyến trước khi bỏ đích | 3, thêm 2 khi bị cá thể chắn |
| Ngân sách A* mỗi lượt | 820 node và ít nhất 85 ms mô phỏng giữa hai lần tìm |

## Chơi và kiểm tra

Mở [game trên máy](http://127.0.0.1:5183/) và bấm **F4** để xem hộp va chạm, khoảng cách cá thể, waypoint, tuyến, vector vận tốc và lý do đứng chờ. Có thể xuất JSON kèm seed, tọa độ và lịch sử sự cố.

Mở [sân kiểm thử Phaser](http://127.0.0.1:5183/monster-movement.html) để chọn tình huống, nhập seed và chạy thời gian thực. Chế độ **Mô phỏng cách cũ** phát lại chuyển động tiến thẳng kèm né từng bước. Ảnh trước/sau ở cùng mốc 2,65 giây dùng cách phát lại này. Cả hai dùng cùng kích thước sân, sprite và điểm đích.

## Kết quả kiểm thử

- Qua hết 12 tình huống trên Chrome. Năm sói có năm vị trí tiếp cận riêng. Mười yêu thú qua hành lang. Hai Tinh Anh tránh nhau. Sơn Trư dừng trước tường khi lao và Độc Thiềm không tiếp đất dưới nước.
- Thử 30 yêu thú với năm seed 27182–27186. Cả 30 đến đích trong cửa sổ 24 giây ở mỗi seed. JSON ghi các lần đứng chờ, tìm lại tuyến, phục hồi và đổi hướng. Chồng lấn chủ ý từ save cũ được tách trong khoảng một giây, sau đó cả hai tiếp tục tới đích.
- Bài gốc cây đến đích trong khoảng bốn giây với tuyến mới. Bản mô phỏng cách cũ mất gần mười giây.
- WorldScene chạy đủ 108 NPC và 24 yêu thú. Kiểm tra camera ở rừng, chân núi và đầm; các sói vẫn di chuyển khi camera ở thành.
- Chrome kiểm tra thợ săn đánh và nhặt chiến lợi phẩm trên cá thể đã bị giảm HP trong fixture. Ca hồi sinh riêng xác nhận cá thể thay thế xuất hiện đúng khu và save/load giữ chính xác lượt sinh lại cùng ID chiến lợi phẩm.
- Gallery dùng controller mới. Sáu biến thể được thử đấu và 12 kỹ năng được chạy trong chế độ preview.
- Build TypeScript/Vite, system tests và validator chạy trên bản dist. Vite vẫn cảnh báo kích thước chunk Phaser.

Mỗi bài stress là một bố cục có thể lặp lại. Số đo không bao phủ mọi đội hình hoặc mọi trạng thái có thể xuất hiện sau khi chạy world lâu.

Ảnh và dữ liệu chi tiết nằm tại `art/previews/monster-movement/`. Chạy lại với `node tests/monster-movement-browser.mjs` khi bản preview đang mở cổng 5183.

## Hiệu năng WorldScene

Đo Chrome 1304×955, zoom 0,95, một lượt mỗi cấu hình. Cột trước dùng kết quả của Monster System 2.0 liền trước lần sửa này. Cấu hình 108 ép hiển thị toàn bộ NPC. Phép đo dùng góc camera thành và không kích hoạt F4.

| Renderer | NPC hiển thị | FPS trước → sau | Frame time p95 trước → sau |
| --- | --- | ---: | ---: |
| SwiftShader | Tự nhiên | 26,5 → 26,8 | 50,1 → 50,1 ms |
| SwiftShader | 108 | 23,0 → 24,0 | 66,8 → 66,8 ms |
| NVIDIA Quadro 600 | Tự nhiên | 60,0 → 59,8 | 16,8 → 16,8 ms |
| NVIDIA Quadro 600 | 108 | 60,0 → 60,0 | 16,8 → 16,8 ms |

Các chênh lệch nhỏ dựa trên một lần đo. Kết quả gốc ở `art/previews/performance/1.8/monster-movement-*-after.json` và `monster-movement-after.json`.

Trong bài 30 yêu thú, seed 27183 ghi 15 lần gặp chặn hoặc mắc vòng, 36 lần tìm lại đường và 15 lần phục hồi. Một mục tiêu bị khóa tạm rồi được tiếp cận thành công. Bốn seed còn lại ghi 5–15 lần kẹt, 28–36 lượt tìm lại đường và không bỏ mục tiêu. Mọi seed kết thúc với 30/30 đến đích và không chồng footprint.

Ca kiểm thử chiến đấu WorldScene chạy Ảnh Lang Phác của sói Tinh Anh, làm HP thợ săn giảm từ 100 xuống 77. Ca Chrome kiểm tra nhập thân, đổi vũ khí và sát thương đao/kiếm cũng chạy thành công.

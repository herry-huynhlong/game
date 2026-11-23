# Ngự Kiếm Phi Hành

Mở [Thanh Vân Ký](http://127.0.0.1:5183/) để quan sát NPC trong thế giới hiện tại. Mở [sân kiểm thử](http://127.0.0.1:5183/?flightTest=1) để chạy đường bay rìa rừng → tông môn hoặc sáu NPC cùng lúc. Sân chạy trong WorldScene và dùng một khóa lưu riêng.

## Luật và điều khiển

Tu sĩ từ Trúc Cơ, đủ HP và linh lực, có thể dùng kiếm thật đang trang bị. NPC tay không đã học Kiếm Khí có thể kết kiếm bằng linh lực. Cách triệu hồi này không thêm đồ vào túi và không cấp kiếm chiến đấu. Ngưỡng cảnh giới, chi phí, tốc độ và thời gian chờ nằm trong `FLIGHT`. Cảnh giới cao hưởng tốc độ tốt hơn và hao linh lực chậm hơn.

Khi nhập thân, bấm **V** để triệu hồi hoặc hạ kiếm. Dùng **WASD** hoặc phím mũi tên để đổi hướng, **Shift** để tăng tốc và **Ctrl** để bay chậm. **J/K** yêu cầu hạ kiếm trước khi giao chiến. **Esc** rời nhập thân và giao lại việc hạ cánh cho AI.

AI cân nhắc cự ly, điểm cất/hạ cánh và chi phí chuyến bay. Lộ trình ngắn ưu tiên đi bộ. Tuyến bay dùng các góc của vùng cấm và vật cản cao từ lớp `Airspace` trong Tiled. Sau khi hạ xuống, NPC dùng lại đường bộ và tiếp tục đích nghề nghiệp. Phần hạ cánh có kiểm tra vật cản, nước, footprint động và vị trí đã có tu sĩ khác nhắm đến.

## Tạo hình và lưu game

Sprite sheet `public/assets/effects/flying-swords.png` có hai biến thể kiếm theo bốn hướng và một frame vệt sáng, được vẽ bằng pixel trong `tools/draw-flying-swords.mjs`. Modular Character dùng thế chân và tay riêng khi ngự kiếm, với chuyển động tóc, vạt áo và độ cao. Bóng dùng tọa độ chiếu trên mặt đất. Hệ thống chỉ lấy hoặc tái sử dụng các sprite hiệu ứng trong khung camera. Chế độ sprite cũ và chế độ Paper Doll giữ hình gốc khi nâng sprite lên khỏi mặt đất.

Save cũ không cần đổi khóa hoặc tạo lại NPC. Save mới giữ trạng thái, nguồn kiếm, độ cao, tuyến, điểm đến và linh lực trong dữ liệu của NPC. Khi đang bay, phép đo va chạm mặt đất dùng cùng tọa độ thế giới nhưng xếp NPC ra ngoài nhóm người đi bộ. Đòn từ mặt đất không trúng ở cao độ chiến đấu. Phi hành và Huyền Hổ loại trừ nhau.

## Kiểm thử

- Chrome chạy WorldScene 108 NPC, sáu tu sĩ cùng bay, hạ trước tông môn và tiếp tục tu luyện. Phép thử ghi nhận XP tăng sau khi hạ cánh.
- Chrome kiểm tra hướng Đông, Bắc, Tây, Nam khi nhập thân, yêu cầu hạ trước khi tấn công, rồi trả quyền cho AI để hạ xuống. Save giữa chuyến bay tải lại với cùng độ cao, điểm đến, nguồn kiếm và túi đồ.
- Kiểm thử tự động phủ điều kiện cảnh giới/HP/MP, đi gần, tuyến vòng vùng cấm, vật cản theo độ cao, điểm hạ bị chiếm, khoảng cách giữa hai tu sĩ, thời gian hồi và khóa thú cưỡi.
- Bằng chứng nằm trong `art/previews/flying-sword/`. Các lệnh kiểm tra là `npm run build`, `npm run test:systems`, `node scripts/validate-release.mjs --dist` và `node tests/flying-sword-browser.mjs`. Phép đo sáu tu sĩ chạy bằng `node tests/flying-sword-perf-browser.mjs`.

Kiểm thử chưa đặc tả chiến đấu trên không. Hạ cánh do bị thương dùng chung quy trình hạ cánh khẩn cấp.

## Đo hiệu năng

Một lượt đo Chrome headless dùng NVIDIA Quadro 600 ở 1304×955, zoom 0,95, cùng khung camera rìa rừng đã làm nóng.

| Cảnh | FPS | Frame p95 | Lượt vẽ WebGL mỗi frame |
| --- | ---: | ---: | ---: |
| 0 tu sĩ bay trong khung | 60,0 | 16,8 ms | 6,0 |
| 6 tu sĩ bay trong khung | 56,4 | 16,8 ms | 10,9 |

Khi chuyển camera sang vùng xa, tu sĩ theo dõi vẫn đi thêm 176 px trong khoảng 0,8 giây và hệ thống không vẽ tu sĩ bay nào trong khung. Dữ liệu gốc ở `art/previews/flying-sword/performance.json`.

# Vạn Linh Sinh Tức II – Bách Tu Xuất Hành

## Chẩn đoán NPC tụ tập

Bản trước được chạy trong Chrome với một hồ sơ kiểm thử mới. Mỗi mẫu đếm NPC sống trong vòng 100 px quanh cụm và giữ thành viên, hành động, đích, nhu cầu, điểm đả tọa, nhiệm vụ và lỗi tuyến. Tệp dữ liệu là `art/previews/bach-tu-xuat-hanh/baseline.json`.

| Cụm | Dấu hiệu từ dữ liệu |
| --- | --- |
| Rìa rừng, khoảng (1774, 2217) | 21 NPC ở ba mẫu đêm liên tiếp, cách nhau 120 phút game. Phần lớn đang nghỉ hoặc chạy về nhà. Spawn của nhiều tán tu dùng chung một vùng làm địa chỉ nhà. Điểm cần rút lui vẫn nằm trong khu hay gặp yêu thú. |
| Ngoại thành, khoảng (3584, 3611) | 19–20 NPC ở ba mẫu đêm liên tiếp. Phần lớn là dân thường nghỉ ở địa chỉ ngay quanh ngã đường. Các đích khác tọa độ nhưng cách nhau quá gần. |
| Sơn môn | Giờ công việc, dò đường và tu luyện có thể tạo cụm ngắn. Sau đợt sửa đầu còn thấy đệ tử nghỉ ở dãy giường cùng khu. Địa chỉ nội môn cũng cần chia cụm nhỏ. |

Đã phân lại địa chỉ quanh nhà có sẵn trong thành và khu lưu trú Sơn Môn, kiểm tra khoảng cách, vùng bảo vệ và nối tuyến. NPC giữ nguyên vị trí lúc nạp bản lưu, sau đó tự đi. Cư dân đang chạy trốn hồi lại chỉ số an toàn khi đã đến gần nhà trong vùng bảo vệ. Phiên đả tọa thường dài tối đa 78–145 phút game tùy NPC, sau đó chuyển sang đánh giá lại nhu cầu. Cơ chế này áp dụng cho AI thông thường. Phiên nhập thân và thiên kiếp giữ luồng riêng.

## Linh mạch

- 18 mạch được bố trí trong lớp Tiled `SpiritVeins`, với lần lượt 9 hạ, 5 trung, 3 thượng và 1 cực. Bốn ID cũ và trữ lượng còn lại được giữ. Có thể đổi số khởi điểm trong `tools/west-wilds/build-map.mjs`.
- Mở **Bản đồ → Linh mạch** để bật/tắt lớp, lọc phẩm cấp, trạng thái chủ sở hữu hoặc trữ lượng, rồi định vị. Thiên Đạo thấy cả các mạch cư dân chưa khám phá. Kéo gần để nhấp vào tinh thể và xem sổ trữ lượng.
- Tổng đã khai thác lưu trên từng mạch. Bản lưu trước đây chưa có bộ đếm lũy kế, nên lần đầu nâng cấp chỉ có thể lấy phần thiếu hụt hiện tại làm mức tối thiểu. Các lượt mới được ghi thực tế. Mạch được bảo hộ giữ một ID yêu thú tại một thời điểm.
- Ủy thác đơn lẻ ở sơn môn phát từng đơn đang mở. Các nhóm tại mạch sâu dùng cùng một thao tác giảm trữ lượng và đưa vật phẩm đúng phẩm cấp vào túi. Việc quy đổi thành tiền diễn ra khi người giữ mang tài nguyên về.

## Tổ đội

`Expeditions.js` phụ trách tuyển tự động, sổ trạng thái, điểm tập hợp, tuyến đi, giao chiến, vận chuyển, rút lui và ký quỹ. Tại một thời điểm có tối đa ba đội. Một NPC thuộc tối đa một đội. NPC có thể từ chối qua tiêu chí cảnh giới, sinh lực, linh lực, việc bận, quan hệ, tính cách và nhu cầu. Thành viên có đích riêng. Khi không thể đi cùng, đội dùng mốc chờ có thời hạn và ngừng nhiệm vụ nếu thiếu người.

Liệp Yêu Đội nhận đơn khi Phường Thị thiếu nguyên liệu. Thám Hiểm Đội khảo sát mỏ, Khai Khoáng Đội bố trí người lấy đá và hộ vệ, Thảo Phạt Đội nhận mục tiêu tinh anh hoặc yêu thú hộ mạch. Hộ Tống Đội theo NPC có hợp đồng vận chuyển đang chạy và phải đi cùng một đoạn đủ dài mới quyết toán. Tuần Tra Đội có thể kiểm tra tuyến rìa rừng theo báo cáo yêu thú tấn công. NPC giữ lại công việc săn đơn lẻ và các cơ chế hồi sức có sẵn. Công việc được phân vùng và không nhắm cùng mục tiêu đang do đội khác xử lý.

Thủ quỹ trừ tiền khi đội thành lập. Hàng vật lý lấy từ túi người thu hoặc vận chuyển. Đội chia phần thưởng đều, đội trưởng nhận phần dư. Nếu thất bại, khoản còn ký quỹ về nguồn trả. Vật phẩm đã nhặt vẫn thuộc người giữ. Lịch sử hoàn tất chặn quyết toán lại sau reload. Chọn cư dân trong một đội để xem nhiệm vụ, thành viên, cảnh giới, HP, vai trò và định vị đội trưởng.

## Kiểm thử lại

Từ thư mục game, chạy `npm run build`, `npm run test:systems`, `npm run validate:release -- --dist`. Chạy Chrome trên bản build cổng 5183 bằng `node tests/expedition-browser.mjs` và `node tests/expedition-ledger-browser.mjs`.

Ca tự nhiên chạy 7 ngày game, kiểm tra nút thời gian và dùng tốc độ ×4 cho phần lớn trace. Ca kiểm soát đưa cư dân thử tới điểm khai thác, săn và giao hàng để tách riêng kiểm tra kết quả kinh tế. Hồ sơ Chrome riêng dùng seed cố định và lưu/tải lại trong cùng hồ sơ. Các bài này dùng dữ liệu kiểm thử, không dùng bản lưu cá nhân của người chơi.

Các tệp bằng chứng nằm tại `art/previews/bach-tu-xuat-hanh/`. Có bốn ảnh nhấp vào mỏ theo phẩm cấp, ảnh khai thác trong ca kiểm soát, ảnh tổ đội trên đường và ảnh Thanh Vân Thành. `seven-days.json` chứa kết quả mô phỏng cùng cấu hình benchmark. `controlled-ledger.json` chứa kết quả khai thác và thanh toán có kiểm soát.

### Kết quả

| Chỉ số | Ca tự nhiên |
| --- | ---: |
| Thời lượng | 7,13 ngày game |
| Tổ đội lập / thực sự xuất hành | 11 / 9 |
| NPC từng tham gia đội | 27 |
| Đụng độ / yêu thú bị đội hạ / lượt nhặt loot | 4 / 4 / 4 |
| Hoàn thành / thất bại / rút lui | 6 / 5 / 3 |
| Linh thạch hạ / trung / thượng / cực khai thác | 12 / 0 / 0 / 0 |
| Giao dịch quan sát được | 221 |
| NPC tại Tây Hoang nhiều nhất ở một mẫu | 4 |
| NPC báo kẹt nhiều nhất ở một mẫu | 5 |
| NPC sống cuối trace / quy mô roster | 104 / 108 |
| FPS headless / p95 khung hình | 49,6 / 16,68 ms |

Benchmark ở 1584 × 955, zoom 0,95, với 24 NPC hiển thị. Số cũ là 45,5 FPS với 20 NPC hiển thị. Đây là hai lần đo headless, chưa phải đối chứng kiểm soát cùng trạng thái game.

Ở khu rìa rừng, các cụm lớn được ghi quanh vị trí cũ giảm từ đỉnh 22 xuống 9 NPC. Còn ba mẫu có từ 8 NPC trở lên quanh điểm cũ, trong đó hai mẫu cách nhau 240 phút game. Ở ngoại thành, cụm gần vị trí cũ tối đa 6 NPC trong lần chạy mới. Phép đo dùng hai cụm lớn nhất tại từng mốc nên khi không có một cụm được ghi gần vị trí đó, dữ liệu không khẳng định vùng trống.

Ca kiểm soát lấy hai đơn vị ở mỗi phẩm cấp. Trữ lượng từng mạch giảm đúng hai. Khi yêu thú hộ mạch còn sống, ca thử thượng và cực phẩm không lấy được đá. Một chuyến săn thử chuyển đúng một vật phẩm vào kho Phường Thị, chia đúng chín linh thạch ký quỹ và giữ trạng thái hoàn tất sau khi tải lại. Gọi giao hàng lần hai không làm tăng kho hoặc ví. Lượt mô phỏng tự nhiên cũng tải lại và đối chiếu danh sách nhiệm vụ, ký quỹ và trữ lượng. Chrome không ghi lỗi JavaScript hoặc yêu cầu tải tệp thất bại.

## Giới hạn

- Tỷ lệ hoàn thành tự nhiên phụ thuộc thành viên, đích và giao tranh. Đội đến Tây Hoang và có thể nhặt loot, nhưng giao nhận ở sâu vẫn có nhiều chuyến thất bại. Chưa xác nhận tự hoàn thành mọi loại hợp đồng và tự khai thác đủ bốn phẩm cấp.
- Chỗ ngồi dùng chung tác vụ tu luyện ở nhà, các điểm sân viện và vùng hoang dã. Chưa có dịch vụ thuê phòng tu luyện hoặc động phủ theo giá riêng.
- Cân bằng tiền tệ mới giới hạn theo tồn cửa hàng, tài sản đặt cọc, trữ lượng, hồi mạch và giới hạn hợp đồng. Chưa có kiểm toán tổng tiền toàn thế giới trong nhiều mùa.
- Các cụm đêm cũ giảm trong trace. Vẫn có nhóm làm việc, ăn, tập hợp ở các địa điểm có lý do và một số ca kẹt đường. Benchmark headless phụ thuộc số NPC đang được render và tải hệ thống.

# v0.1.17 · Vạn Nhân Sinh Tức

## Kiểm toán 108 cư dân nền

`NPCPopulationRegistry.ts` định nghĩa 12 vai trò của nhóm nền. `AutonomousNPCSystem.ts` có tám giá trị nghề nghiệp. Vai trò và nghề nghiệp dùng các trường riêng. Ví dụ, thợ săn có nghề `ho_ve` trong dữ liệu cũ, còn hành vi săn và nhặt chiến lợi phẩm do WorldScene xử lý. `NpcSimulationScheduler.js` phân bổ thời gian cập nhật theo khoảng cách và mức khẩn cấp.

| Nhóm | Số hồ sơ | Hành vi trong WorldScene |
| --- | ---: | --- |
| Dân thường | 20 | Canh tác bằng giống, nhập lương thực, đốn cây có thời gian mọc lại hoặc nhận công từ kho phe. |
| Đệ tử, trưởng lão và tông chủ | 26 | Tu luyện, chỉ dạy, công việc và nhiệm vụ tông môn. Trưởng lão và tông chủ dùng chung nhiều hành vi của tu sĩ. |
| Thương nhân | 7 | Đứng quầy, quản lý tồn kho và giao dịch với người tới quầy. |
| Nhân viên tửu quán | 3 | Bổ sung lương thực hoặc phục vụ theo suất tại địa điểm có ca trực. |
| Quân lính | 10 | Cổng, tuần tra, đổi ca, phản ứng theo CityLaw. |
| Thợ sửa | 2 | Nhận ủy thác sửa chữa khi có công trình hư hại và đủ kinh phí. |
| Thợ săn | 5 | Chọn con mồi, giao chiến, nhặt chiến lợi phẩm và đem nguyên liệu đi bán. |
| Người hái dược | 3 | Đăng ký nguồn thu hái hữu hạn, lấy linh thảo và bán hoặc sử dụng. |
| Nhân viên ủy thác | 2 | Duyệt ủy thác đã đăng. Đây là vai trò dịch vụ và vẫn dùng nghề dân thường trong dữ liệu nền. |
| Tán tu | 30 | Tu luyện, thu thập, mua bán, thám hiểm và tham gia tổ đội nếu đủ điều kiện. |

`audit-108.json` do bài kiểm tra Chrome xuất chứa ID, tên, nghề, vai trò, tọa độ nhà và chỗ làm, tài sản, cảnh giới, tuổi, thọ nguyên, tính cách, quan hệ và hoạt động của từng người. Số giao dịch hoặc nhiệm vụ được đo trong một khoảng thời gian mô phỏng, nên trạng thái đứng yên lúc lấy mẫu chỉ mô tả thời điểm đó.

## Dân số và đời sống

- Giữ khóa lưu `world-rebuild-1c-v1`. Đợt định cư bổ sung 72 hồ sơ có ID riêng, tối đa chín người ở mỗi khu khởi điểm. Địa điểm lấy từ marker Tiled hiện có. Điểm ở và làm việc phải đạt khoảng cách tối thiểu, kiểm tra va chạm và cùng thành phần liên thông.
- Sau đợt đầu, tối đa hai người mới được vào mỗi ngày có chỗ trống, từ ngày thứ hai. Thuật toán dựa trên số người sống trong phiên mô phỏng. Con sinh ra và người nhập cư cùng chịu giới hạn dân số. NPC tiếp tục du hành phải đi tới lối ra và được chuyển sang hồ sơ xuất cư. Nhập cư và xuất cư có nhật ký riêng.
- Gia đình hình thành từ quan hệ hai chiều, tuổi trưởng thành và nơi ở có đường liên thông. Cặp đôi góp linh thạch thật vào quỹ. Trẻ dưới 18 tuổi ở cùng gia đình. Thọ nguyên vẫn tiến theo năm 365 ngày trong game. Mỗi gia đình có tối đa hai con và lần sinh thứ hai phải cách tối thiểu hai năm. Ông bà, anh chị em và lịch sử thừa kế được tra từ hồ sơ đã lưu.
- Di sản gồm linh thạch, nguyên liệu, dược liệu và đan dược có quyền chuyển hợp lệ. Trang bị và pháp bảo có quyền sở hữu riêng tiếp tục theo hệ thống hiện có. Nhà ở được dùng chung, còn chỗ đứng hoặc chỗ nghỉ được điều phối qua navigation.
- Tham vọng bổ sung điểm vào các hành động đã đủ điều kiện của AI. Lịch làm việc, nguy hiểm, sinh lực và khả năng thanh toán tiếp tục quyết định hành động khả thi. Chức tước và quyền sở hữu vẫn đi qua các hệ thống tông môn, thành trì và Civic.
- Khoáng công ưu tiên nhận hợp đồng từ chủ mỏ hoặc người được quyền đại diện. Tồn kho giảm khi khai thác, tiền công lấy từ ký quỹ. Thợ chế tác cần nguyên liệu, thời gian có mặt tại xưởng và người mua. Vốn kho vùng chuyển từ quầy thành, hàng đi theo túi người vận chuyển. Ca phục vụ dùng địa điểm, hàng dự trữ và doanh thu thực.

## Kiểm thử

```bash
npm run test:systems
npm run build
npm run validate:release -- --dist
node tests/population-life-browser.mjs --target=180 --controlled
node tests/population-life-browser.mjs --target=108 --natural --only-natural
node tests/population-life-browser.mjs --target=180 --natural --only-natural
```

Bài Chrome dùng bản production local, seed cố định và hồ sơ trình duyệt riêng. So sánh hiệu năng ở Thanh Vân Thành, zoom 0,95× và cửa sổ Chrome 1600×1050. Chạy riêng từng mức bằng `--target=108`, `--target=144`, `--target=180` hoặc `--target=240` để mỗi phép đo bộ nhớ có tiến trình độc lập. Kết quả và ảnh nằm trong `art/previews/van-nhan-sinh-tuc/`.

| NPC | FPS | Frame p95 | AI p95 | Tìm đường trung bình mỗi frame | Lượt tìm đường/s | JS heap | Save | Kẹt trong mẫu ngắn |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 108 | 59,03 | 21,4 ms | 0,4 ms | 0,25 ms | 24 | 335,39 MiB | 466.653 B | 0 |
| 144 | 60,00 | 21,8 ms | 0,4 ms | 0,23 ms | 26 | 347,23 MiB | 583.765 B | 0 |
| 180 | 59,27 | 26,6 ms | 0,9 ms | 0,64 ms | 46 | 359,27 MiB | 701.351 B | 0 |
| 240 | 58,45 | 31,0 ms | 0,9 ms | 0,65 ms | 61 | 367,33 MiB | 889.898 B | 0 |

Ở mức 180, scheduler vẫn xử lý khoảng 123 NPC trong lớp xa camera, với 32 NPC được vẽ trong mẫu. Các frame có tìm đường tại mức này đạt p95 4,6 ms. Mức 240 dành cho stress test.

### Hai ngày mô phỏng tự chủ

Chrome chạy 2.880 phút game qua vòng cập nhật WorldScene tăng tốc. AI tự ra quyết định và dùng tồn kho thật. Phép thử 108 dùng roster nền và chính sách nhập cư cũ làm đối chứng. Số người tham gia tính theo các sự kiện ghi nhận được trong cửa sổ kiểm thử.

| Chỉ số | Bắt đầu với 108 | Bắt đầu với 180 |
| --- | ---: | ---: |
| Người sống cuối kỳ | 101 | 176 |
| Tử vong | 7 | 8 |
| Nhập cư trong kỳ mô phỏng | 0 | 4 |
| Người có giao dịch ghi nhận | 36 (33,3%) | 103 |
| Giao dịch | 76 | 249 |
| Người có hoạt động săn ghi nhận | 2 (1,9%) | 3 |
| Yêu thú bị hạ | 2 | 4 |
| Người có sự kiện nhiệm vụ | 11 (10,2%) | 11 |
| Hồ sơ nhiệm vụ và hợp đồng cuối kỳ | 15 | 19 |
| Tổ đội phát sinh | 15 | 16 |
| Lượt đột phá ghi nhận | 6 | 17 |
| Thần Lực tăng | 100 | 109 |
| Tổng linh thạch trong túi cư dân cuối kỳ | 603 | 2.601 |
| Mật độ cao nhất trong một ô 256×256 cuối kỳ | 6 | 11 |
| Số NPC kẹt cao nhất tại các lần lấy mẫu | 3 | 8 |

Lượt 180 ghi nhận 5 chuyến giao hàng, 9 mẻ chế tác, 18 Tụ Khí Đan và 424 phần lương thực. Các bản ghi này tương ứng với 18 linh thảo và 53 phần thóc giống đã dùng. Hợp đồng mỏ và rèn đao được kiểm tra riêng vì lần mô phỏng tự chủ này chưa ghi nhận hai luồng đó hoàn tất.

### Kịch bản có kiểm soát

Bản lưu kiểu v0.1.16 có một cư dân đã chết, một cư dân giữ 321 linh thạch và vật phẩm đã đặt trước, cùng 137 Thần Lực. Sau migration có 180 hồ sơ và 179 người sống. Tải lại vẫn đúng 72 lượt định cư. Khi có thêm chỗ trống, hai cư dân nhập cư mới được đăng ký đúng một lần trong ngày. Trong lượt gia đình, trẻ mới được thêm vào WorldScene và scheduler. Lượt xuất cư lưu người rời đi là còn sống. Hợp đồng mỏ lấy hai đơn vị quặng từ trữ lượng và trả tám linh thạch từ bên thuê, một lần. Xưởng rèn dùng một quặng sắt và một nanh lợn rừng để hoàn thành hai Thiết Diệp Đao.

Các ca sinh con, trưởng thành và thừa kế dùng thời gian hoặc trạng thái chuẩn bị riêng. Hai ngày mô phỏng thông thường chỉ đủ để kiểm tra nhịp hoạt động ngắn và chưa đo được cân bằng qua nhiều thế hệ.

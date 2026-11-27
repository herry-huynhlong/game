# Bách Đạo Tranh Minh – Thần Công Linh Bảo

Mở [Võ Kỹ Các](http://127.0.0.1:5183/?combatGallery=1) trong bản preview. Chọn công pháp, võ kỹ và vũ khí, rồi bấm **Thi triển lại**. Có các chế độ zoom 1×, 2×, 4× và tỷ lệ game, hướng nhìn, cảnh giới, thuần thục, tương hợp, tạm dừng và phát chậm. Sân thử dùng bản đồ và bộ tính chiến đấu của WorldScene với trạng thái thử riêng.

Trong game, bí kíp được đọc từ **Túi đồ** khi nhập thân. **Công pháp, võ kỹ và linh bảo** trong hồ sơ hiển thị điều kiện, linh lực, uy lực thô, hồi chiêu, tương hợp và tình trạng trang bị. Chọn chiêu đã lĩnh ngộ để gán **K**. Phím **J** tiếp tục đánh thường. Có thể chọn lại võ kỹ cũ của vũ khí cho **K**.

## Hệ thống và bản lưu

- Giữ khóa lưu World Rebuild và các ID hiện có. Công pháp nền là Thanh Vân Quyết, Ngự Kiếm Quyết và Trường Sinh Quyết. Dữ liệu bổ sung gồm công pháp đã học, thông thạo, chiêu gán vào K, đồng hồ hồi chiêu, độ bền theo NPC và sổ cấp truyền thừa.
- Chiêu kiểm tra linh lực, cảnh giới, tầng tu vi, độ thuần thục, hướng, vật cản và tầng bản đồ. Mỗi lượt tác động có ID riêng cho từng mục tiêu. Những màn chắn, trói, suy yếu, bỏng, hồi phục và bộ pháp dùng cùng bộ xử lý cho người chơi và NPC. Đòn đánh NPC vẫn qua CityLaw và đòn đánh yêu thú vẫn dùng luồng chiến lợi phẩm hiện có.
- Cửa hàng dùng kho và tài khoản thật. Tàng Kinh Các dùng cống hiến. Thầy có thể dạy công pháp tới Huyền phẩm khi đã thông thạo và gặp đệ tử phù hợp. Ủy thác săn có thể trao Bát Hoang Thương Pháp một lần cho từng NPC. Vật phẩm truyền thừa hiếm cấp hữu hạn qua yêu thú trấn giữ.
- Luyện khí dùng nguyên liệu kho thật và kiểm tra vị trí lò. Huyền phẩm đòi hỏi tay nghề. Địa và Thiên phẩm thêm yêu cầu cảnh giới, công pháp cao cấp đạt Viên mãn và giới hạn một bản phát hành chung với nguồn truyền thừa.
- NPC có thể đặt giá ở Phường Thị cho món Huyền phẩm trở lên đã được đăng. Một phiên kéo dài một ngày trong game. Khi kết thúc, giao dịch kiểm tra chủ còn món có thể bán và người trả giá còn đủ tiền sau dự phòng. Hệ thống thử lần lượt mức giá từ cao xuống thấp. Món đã bán và tiền chỉ chuyển một lần.
- Trang bị được vẽ thành 15 frame riêng; 30 icon được ghép vào atlas túi đồ. Nguồn mỹ thuật là tập lệnh Python/Pillow và đồ họa Phaser tự vẽ, có giới hạn ngân sách render.
- Những hiệu ứng Địa và Thiên phẩm dùng pháp trận, kiếm ảnh, lôi phân nhánh, linh thú và lớp ảnh hưởng cục bộ. Mật độ hiệu ứng, giảm lóe và rung camera là tùy chọn hiển thị. Các chiêu nhiều nhịp và trạng thái tạm thời kết thúc theo giờ mô phỏng.

## Giá tham chiếu

Giá cơ sở tính bằng hệ số × B. Mốc làm việc B = 3 linh thạch lấy theo trung vị dương trong mẫu thử hiệu chỉnh. Trung vị toàn bộ tu sĩ có hoạt động kinh tế bằng 0, vì vậy chưa thể lấy số đó làm đơn vị giá. Nếu có hàng, giá cửa hàng thay đổi từ 88% đến 112% theo tồn kho và làm tròn lên. Địa và Thiên phẩm không có giá niêm yết trong cửa hàng thường.

### Công pháp

| Tên | Phẩm | Thuộc tính | B | Tham chiếu |
|---|---|---|---:|---:|
| Thanh Phong Kiếm Pháp | Phàm | Phong | 2 | 6 |
| Hám Sơn Quyền | Phàm | Thổ | 1 | 3 |
| Bát Hoang Thương Pháp | Phàm | Phong | 3 | 9 |
| Thanh Vân Ngự Kiếm Quyết | Hoàng | Phong | 7 | 21 |
| Xích Viêm Chưởng | Hoàng | Hỏa | 6 | 18 |
| Thanh Mộc Dưỡng Linh Kinh | Hoàng | Mộc | 9 | 27 |
| Tử Tiêu Lôi Kiếm Quyết | Huyền | Lôi | 31 | 93 |
| Huyền Băng Ngọc Tâm Kinh | Huyền | Băng | 36 | 108 |
| U Minh Phệ Hồn Quyết | Huyền | Âm | 43 | 129 |
| Vạn Kiếm Quy Tông | Địa | Kiếm | 154 | 462 |
| Cửu Tiêu Thiên Lôi Kinh | Địa | Lôi | 212 | 636 |
| Phần Thiên Long Viêm Quyết | Địa | Hỏa | 255 | 765 |
| Thái Hư Tru Tiên Kiếm Kinh | Thiên | Kiếm | 820 | 2460 |
| Hỗn Độn Cửu Kiếp Lôi Pháp | Thiên | Lôi | 1160 | 3480 |
| Đại Nhật Kim Ô Phần Thiên Kinh | Thiên | Thái Dương | 1400 | 4200 |

### Vũ khí

| Tên | Phẩm | Thuộc tính | B | Tham chiếu |
|---|---|---|---:|---:|
| Thanh Cương Kiếm | Phàm | Phong | 3 | 9 |
| Huyền Thiết Đao | Phàm | Thổ | 4 | 12 |
| Thiết Phong Thương | Phàm | Phong | 4 | 12 |
| Thanh Ngọc Linh Kiếm | Hoàng | Phong | 11 | 33 |
| Xích Hỏa Đao | Hoàng | Hỏa | 15 | 45 |
| Hậu Thổ Linh Thương | Hoàng | Thổ | 16 | 48 |
| Tử Điện Linh Kiếm | Huyền | Lôi | 40 | 120 |
| Huyền Băng Long Thương | Huyền | Băng | 57 | 171 |
| U Minh Phệ Hồn Liêm | Huyền | Âm | 69 | 207 |
| Cửu Tiêu Lôi Đình Kiếm | Địa | Lôi | 216 | 648 |
| Phần Thiên Long Nha Đao | Địa | Hỏa | 287 | 861 |
| Hám Thiên Huyền Hoàng Chùy | Địa | Thổ | 340 | 1020 |
| Thái Hư Tru Tiên Kiếm | Thiên | Kiếm | 1460 | 4380 |
| Hỗn Độn Thiên Kiếp Thương | Thiên | Lôi | 2200 | 6600 |
| Đại Nhật Kim Ô Thần Đao | Thiên | Thái Dương | 2850 | 8550 |

## Tái hiện phép thử

- `npm run build`
- `npm run test:systems`
- `npm run validate:release -- --dist`
- `npm run preview -- --host 127.0.0.1 --port 5183`
- `node tests/martial-browser.mjs` dùng Chrome headless và hồ sơ trình duyệt riêng. Có thể đổi URL bằng `GAME_TEST_ORIGIN`, đường dẫn Chrome bằng `CHROME_EXE` và số ngày mô phỏng bằng `MARTIAL_SIM_DAYS`.

Ảnh và dữ liệu phép thử nằm trong `art/previews/bach-dao-tranh-minh/`. `combat-results.json` ghi tác động thực tế từng chiêu, kiểm tra trạng thái và thiết lập benchmark. `economy-results.json` ghi mẫu số dư ròng theo nghề, dự trữ tông môn, giá nguyên liệu, vốn thương nhân, giao dịch và sản lượng ghi nhận.

### Ảnh WorldScene

Chuỗi ảnh có ba mốc hiện hình, va chạm và dư âm. Các liên kết sau mở ảnh va chạm trong lần chạy Chrome.

| Công pháp | Ảnh |
|---|---|
| Thanh Phong Kiếm Pháp | [Hồi Phong Kiếm](../art/previews/bach-dao-tranh-minh/breeze-02-va-cham.png) |
| Thanh Vân Ngự Kiếm Quyết | [Tam Kiếm Quy Nhất](../art/previews/bach-dao-tranh-minh/qingyun-flight-02-va-cham.png) |
| Tử Tiêu Lôi Kiếm Quyết | [Ngũ Lôi Oanh Đỉnh](../art/previews/bach-dao-tranh-minh/purple-sword-02-va-cham.png) |
| Vạn Kiếm Quy Tông | [Vạn Kiếm Quy Nhất](../art/previews/bach-dao-tranh-minh/myriad-sword-02-va-cham.png) |
| Cửu Tiêu Thiên Lôi Kinh | [Thiên Lôi Trấn Thế](../art/previews/bach-dao-tranh-minh/nine-skies-02-va-cham.png) |
| Phần Thiên Long Viêm Quyết | [Xích Long Phần Địa](../art/previews/bach-dao-tranh-minh/scarlet-dragon-02-va-cham.png) |
| Thái Hư Tru Tiên Kiếm Kinh | [Nhất Kiếm Khai Thiên](../art/previews/bach-dao-tranh-minh/void-sword-02-va-cham.png) |
| Hỗn Độn Cửu Kiếp Lôi Pháp | [Cửu Long Lôi Kiếp](../art/previews/bach-dao-tranh-minh/nine-dragons-02-va-cham.png) |
| Đại Nhật Kim Ô Phần Thiên Kinh | [Kim Ô Giáng Thế](../art/previews/bach-dao-tranh-minh/crow-descent-02-va-cham.png) |

Phép thử mua Thanh Phong Kiếm Pháp tại Thiết Mộc Các ghi đúng 6 linh thạch và trừ một bí kíp khỏi kho. NPC học một lần, rèn Thanh Cương Kiếm bằng nguyên liệu rồi tự trang bị. Phép thử khác rèn hữu hạn Cửu Tiêu Lôi Đình Kiếm, thử cấp lại qua yêu thú, đăng đấu giá, nhận hai giá trả và tải lại. Phiên chỉ ghi một giao dịch ở 660 linh thạch và một vũ khí đổi chủ. Số dư của ba người tham gia cộng lại được bảo toàn. Đấu giá và rèn hiếm được kiểm tra bằng tình huống có chuẩn bị nguyên liệu và người đủ khả năng chi trả.

Chrome headless đo 59,53 FPS khi hiển thị đồng thời tám lượt thi triển Cửu Dương Phần Thiên ở Chi tiết cao, với p95 16,8 ms. Nội thành với 180 NPC đo 60,01 FPS sau 3,5 giây ổn định, tại zoom 0,95×. Một lượt đo gần thời điểm vừa vào thành từng ghi nhận một khung trễ 1,23 giây. Bảy giây đo ổn định ghi nhận tối đa 0,1 ms cho mỗi lần cập nhật chiến đấu hoặc hiệu ứng võ kỹ và 0,2 ms cho mỗi lượt cập nhật kinh tế võ kỹ. Đây là số đo cục bộ, không bao quát thời gian nạp hoặc các thiết bị khác.

## Mẫu kinh tế hai ngày

Thế giới thử nghiệm có 108 cư dân và dùng lịch, tuyến di chuyển, cửa hàng và sản xuất của WorldScene. Một mẫu là chênh lệch ví từ đầu đến cuối một ngày ở NPC từng hoạt động kinh tế trong ngày và còn sống ở cả hai thời điểm. Cách đo này tính cả chi tiêu, thưởng và các lần chuyển tiền hợp lệ.

| Nghề | Số mẫu NPC-ngày | Trung vị ròng |
|---|---:|---:|
| Tu sĩ | 60 | 0 |
| Dân thường | 41 | 0 |
| Nông dân | 8 | 34 |
| Thương nhân | 13 | 0 |
| Thợ rèn | 2 | 0 |
| Hộ vệ | 7 | 0 |
| Dược sư | 5 | 12 |

| Chỉ số | Đầu ngày 2 | Đầu ngày 3 | Đầu ngày 4 |
|---|---:|---:|---:|
| Trung vị tài sản tán tu | 0 | 2 | 3 |
| Ngân quỹ Thanh Vân Tông | 16 | 4 | 15 |
| Tổng tiền mặt các cửa hàng | 521 | 282 | 185 |
| Tiền trong ví, phe và cửa hàng | 1.282 | 1.280 | 1.261 |
| Giao dịch ghi nhận trong ngày trước đó | 33 | 57 | 42 |
| Sản lượng khai thác linh thạch lũy kế | 10 | 10 | 14 |
| NPC đã học công pháp mới | 5 | 8 | 8 |

Ở cuối mẫu, giá lương thực là 5–8, quặng sắt 10–12, linh thảo 9–12, viên chữa thương 19, nội đan Trúc Cơ 49–64 linh thạch ở các điểm có bảng giá. Ủy thác ghi nhận mức thưởng 1–22 linh thạch. Quặng ở quầy là giá đầu vào tham khảo; lần chạy chưa có sổ chi phí khai thác đủ chi tiết để tính lãi theo từng mỏ. Số dư tổng hợp không bao gồm tài sản ký quỹ, vật phẩm chưa bán hoặc giá trị quy đổi của linh thạch đang nằm trong túi. Giá B = 3 được giữ từ mẫu hiệu chỉnh ban đầu; ở mẫu sau hiệu chỉnh, trung vị nhóm tu sĩ có lãi là 5,5. Dữ liệu vẫn biến động mạnh giữa nghề và không đủ dài để chốt giá dài hạn.

## Phạm vi còn mở

Giá cần thêm mẫu mô phỏng dài hạn, đặc biệt khi phần lớn tu sĩ có số dư ròng bằng 0. Trạng thái động trong một lần thi triển không tiếp tục sau khi tải lại. Linh lực đã tiêu và hồi chiêu được lưu. Độ bền hiện ghi theo NPC và mã vũ khí, nên từng bản sao của cùng một vũ khí chưa có lịch sử hao mòn riêng.

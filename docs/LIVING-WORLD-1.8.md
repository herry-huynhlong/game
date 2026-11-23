# Thanh Vân Ký 1.8 — Kiểm chứng Chúng Sinh Tự Vận Hành

## Bản chơi thử

Mở `http://127.0.0.1:5183/`. **Nhật ký** có danh sách 108 cư dân, bảng sinh hoạt và tốc độ mô phỏng ×1, ×2, ×4. Chọn một cư dân để xem nghề, mục tiêu, lý do hành động, đường đi, điểm đã giữ chỗ, nhu cầu, ký ức và quan hệ. Trong menu, bật **Va chạm** để xem hình chữ nhật vùng chân, điểm làm việc, tuyến đường của NPC đang chọn và vật cản Tiled. Tóc, vũ khí và tà áo có thể che hình nhau theo thứ tự chiều sâu.

Vùng chân NPC, nhân vật nhập thân và yêu thú dùng chung spatial hash. Kiểm tra vật cản ở các bước nhỏ để tránh xuyên tường khi LOD gộp nhiều bước di chuyển. Bốn cổng cấp lượt theo chiều và có chỗ đợi lệch lối qua. Các điểm làm việc có số chỗ hữu hạn, giải phóng khi NPC ngừng việc, chết hoặc được nhập thân. Chỗ đứng được lập lại trên save cũ. Các reservation tài nguyên và vật phẩm tiếp tục theo luật của hệ thống nguồn.

## Kiểm kê nghề và chức vụ

| Nghề trong mã nguồn | Vòng hành vi và dữ liệu thay đổi | Kiểm chứng |
| --- | --- | --- |
| Tu sĩ | Tới nơi tu luyện, tích tu vi và công pháp, mua đan bằng linh thạch khi có hàng | Bài kiểm tra hệ thống có mua đan và đột phá. Lượt 30 ngày ghi nhận tăng tu vi, công pháp và truyền dạy |
| Đan sư | Hai linh thảo thành một Tụ Khí Đan | Fixture nghề trong hệ thống cũ. Roster 108 người chưa gán nghề riêng này |
| Thương nhân | Quầy hữu hạn, bán/mua bằng hàng tồn và tiền thật | Kiểm tra tồn kho, giao dịch và trả công khi có giao dịch |
| Dược sư | Giữ chỗ ở node, hái linh thảo hữu hạn, đem nguyên liệu về hiệu thuốc chế đan | Kiểm tra giữ chỗ và giảm trữ lượng. Lượt 30 ngày có hái và chế đan |
| Hộ vệ | Tuần tra theo điểm, điều động đến hiện trường thật | Kiểm tra nghề tăng an toàn, điều động không dịch chuyển tức thời |
| Dân thường | Làm việc nhận lương từ quỹ, giao tiếp hoặc đốn gỗ và mang hàng đi bán | Có giao dịch, lương, đốn cây và đốn lại sau khi cây tái sinh |
| Thợ rèn | Dùng 2 quặng và 1 gỗ để rèn kiếm. Nhân công sửa nhà xử lý ủy thác và tiêu hao vật liệu | Kiểm tra rèn và hoàn tất sửa nhà có trả công |
| Nông dân | Lấy giống có nguồn, tới ruộng, thu hoạch và chuyển khẩu phần dư về kho thôn | Có thu hoạch và nhập kho. Cung lương thực dài ngày còn thiếu |

Roster thực tế gồm 20 dân thường, 20 đệ tử, 5 trưởng lão, 1 tông chủ, 7 thương nhân, 3 người làm tửu quán, 10 hộ vệ, 2 thợ sửa, 5 thợ săn, 3 người hái thuốc, 2 nhân viên Ủy Thác Các và 30 tán tu. Thợ săn đọc mức sức khỏe, tinh thần, sức chiến đấu và tính cách cùng với dữ liệu con mồi. Tửu quán chuyển khẩu phần hữu hạn từ kho thôn. Nhân viên Ủy Thác Các có thể duyệt hồ sơ thật và nhận công từ quỹ khi đủ. Nhánh duyệt hồ sơ chưa được chứng minh bằng một fixture độc lập. Thành chủ vẫn là chức vụ gán vào roster hiện có.

## Thử va chạm và lưu tải

| Tình huống | Kết quả |
| --- | --- |
| 20 cá thể di chuyển đối hướng | Bài kiểm tra thuật toán ở ×1, ×2, ×4 trên hai luồng gần nhau |
| 2 và 10 cá thể qua cổng | 24 fixture trong Chrome dùng footprint, điều phối và collision Tiled thật của bốn cổng. Mọi cá thể qua khỏi hành lang cổng ở cả hai chiều, không chồng footprint và không vượt bước. Có bốn fixture một cá thể dừng cách đích cuối sau cổng khoảng 30 px |
| 10 chỗ làm việc | Bài kiểm tra thuật toán cấp chỗ riêng, trả lại chỗ khi chết và chuyển chỗ khi retry |
| Nhiều thợ săn và yêu thú | Bài kiểm tra nhóm áp sát dùng footprint thật. Chưa có fixture trình duyệt riêng cho cả đàn truy đuổi |
| Vật cản, đổi hướng, mắc kẹt | Bài kiểm tra bước quét, rẽ khỏi tường và tách điểm chồng từ save cũ. Còn báo tắc trong mô phỏng dài ngày |
| Bên trong chợ, qua cầu và ra vào nhà | Chưa có kiểm tra riêng với đám đông và đường đi liên tục |
| Save/load trong Chrome | Đối chiếu 108 ID, nghề, ngoại hình và tồn kho trong một lần tải lại đứng yên. Lượt 30 ngày còn kiểm tra lại đồng hồ và lịch sử khai thác sau tải. Các trường hợp lưu riêng khi đang đánh, đang làm việc và đang giữ tài nguyên chưa được chứng minh đầy đủ |
| Nhập thân, chiến đấu, cưỡi thú | Bài kiểm tra Chrome 2A–2D đã chạy thành công. Các bài kiểm tra hệ thống còn kiểm tra hồi quái và nhận loot một lần |

## Mô phỏng Chrome trong 30 ngày

Seed `qingyun-2d36bc60-3269-4fe4-877b-0cea1df03455`, 43.200 phút ở tốc độ ×4. Bài kiểm tra chạy qua WorldScene, xác nhận nạp lại 108 bản ghi cùng trạng thái khai thác và đồng hồ. Giữ nguyên nghề và ngoại hình trong suốt lượt thử.

- 96 NPC đi cách điểm ban đầu hơn 24 px và 46 NPC có thay đổi tu vi. Nhật ký ghi nhận 3 lần đột phá.
- 38 lượt thu hoạch, 36 lượt nhập lương vào kho thôn, 6 lượt nhập hàng vào tửu quán, 4 lượt hái linh thảo và 8 lượt đốn cây. Một cây có 3 lần bị đốn, một cây có 2 lần.
- 3 yêu thú bị hạ và có 3 lượt nhặt chiến lợi phẩm. Quần thể yêu thú cuối lượt có 28 cá thể sống.
- Cuối lượt có 0 cặp footprint chồng nhau. Trong phép lấy mẫu mỗi 80 lần cập nhật, không thấy NPC đứng trong vật cản bản đồ.
- Còn 82 NPC sống, cả 82 đều có mức đói từ 75 trở lên. Có 6 NPC kiệt sức và 39 NPC báo bị chặn hoặc đang chờ. 26 NPC chết do yêu thú, gồm 13 do bọ cạp và 13 do rắn.

Bài chạy 30 ngày đã đi hết các mốc kiểm tra tự động. Cân bằng sinh hoạt và giao thông dài ngày chưa đạt. Ảnh và kết quả của các ca nhỏ trên bản build cuối được đối chiếu riêng vì bước né đã được giới hạn chính xác hơn sau khi lượt 30 ngày bắt đầu.

## Hiệu năng trên bản build cuối

Chrome chạy bản production tại 1304×955, zoom 0,95. SwiftShader chạy hai lượt mỗi tình huống. Quadro 600 dùng ANGLE D3D11, một lượt.

| NPC hiển thị | SwiftShader trước | SwiftShader sau | p95 sau | Quadro 600 sau | p95 Quadro |
| --- | ---: | ---: | ---: | ---: | ---: |
| Tự nhiên, khoảng 16 | 31,4 FPS | 32,8 FPS | 41,7 ms | 60,0 FPS | 16,8 ms |
| 60 | 31,1 FPS | 29,4 FPS | 50,0 ms | 59,6 FPS | 16,8 ms |
| 108 | 27,1 FPS | 28,2 FPS | 50,1 ms | 60,0 FPS | 16,8 ms |

Trong ca 108 NPC, phép thử SwiftShader sau thay đổi có khoảng 84 NPC đang chuyển động trung bình. Ca tham chiếu trước thay đổi có khoảng 68, nên phép so sánh bao gồm thay đổi mẫu chuyển động. JSON benchmark lưu bộ đo CPU và WebGL theo từng lượt. Máy khác và bản đồ có mật độ thực thể khác có thể cho số đo khác.

## Bằng chứng

- `art/previews/world-performance/living-world-ground.png` — bản đồ Phaser và lớp va chạm.
- `art/previews/world-performance/living-world-dashboard.png` và `living-world-inspector.png` — bảng sinh hoạt và hồ sơ.
- `art/previews/world-performance/living-world-gates.json` — từng fixture và kết quả tải lại.
- `art/previews/world-performance/living-world-30-days.json` — seed, sự kiện, số NPC bị chặn, tài nguyên và trạng thái tồn kho.
- `art/previews/performance/1.8/` — JSON benchmark ghi cấu hình GPU, thời gian AI, đường đi, animation, va chạm, render, draw call và bind texture.

## Chạy lại

Trong PowerShell ở thư mục dự án, chạy `npm run build`, `npm run test:systems` và `node scripts/validate-release.mjs --dist`. Mở preview ở cổng 5183 bằng `npm run preview -- --host 127.0.0.1 --port 5183` hoặc `npx vite preview --host 127.0.0.1 --port 5183`.

```powershell
$env:GROUND_CHECK='1'
node tests/world-performance-browser.mjs
Remove-Item Env:GROUND_CHECK

$env:LIVING_WORLD_CHECK='1'
$env:LIVING_DAYS='30'
node tests/world-performance-browser.mjs
Remove-Item Env:LIVING_WORLD_CHECK, Env:LIVING_DAYS

$env:BENCH_COUNTS='normal,60,108'
$env:BENCH_LABEL='living-ground'
node tools/benchmark-world-1.8.mjs
```

Probe 30 ngày dùng seed `qingyun-2d36bc60-3269-4fe4-877b-0cea1df03455`, hồ sơ Chrome riêng và bước mô phỏng 250 ms ở ×4 trong WorldScene. Lưu lượng lương thực, tắc đường theo thời gian và tử vong do yêu thú cần được xem cùng kết quả va chạm. Đây là bản chơi thử local.

# Thiên Địa Đấu Pháp

[Mở Võ Kỹ Các](http://127.0.0.1:5183/?combatGallery=1). Chọn Vạn Kiếm Quy Tông, chiêu Vạn Kiếm Quy Nhất, Hóa Thần và Hóa cảnh. Bấm **Thi triển lại** để xem đủ 10 giây. Dùng **Tới giai đoạn kế** để dừng và kiểm tra từng mốc. Bảng thử hiển thị mã lần thi triển, mục tiêu bị khóa, số vật thể bay và va chạm.

## Kiểm toán và thay đổi

Trước đây, hầu hết võ kỹ dùng một nhịp sát thương ở tọa độ đã định. Hình vẽ dịch chuyển theo thời gian nhưng chưa phải vật thể va chạm. NPC săn và tổ đội có mục tiêu riêng, song người bị đánh chưa có cơ chế khóa kẻ gây giao tranh dùng chung. Các chiêu Địa và Thiên phẩm dùng chung cửa sổ nạp linh lực rất ngắn.

- Một lần thi triển giữ mã, bản đồ, đối thủ, hướng, nhịp phát và nhịp tác động riêng. Tính tiến trình theo bước tối đa 25 ms mô phỏng. Kỹ năng mặt đất và pháp trận đặt theo vùng. Kỹ năng cận chiến có tầm và góc. Kỹ năng hộ thể, hỗ trợ và bộ pháp có điểm tác động riêng. Kiếm khí, hỏa cầu và phi kiếm có đường bay cùng kiểm tra vật cản. Hướng của phi kiếm bám đúng mục tiêu khóa trong phạm vi hành trình.
- Đổi phẩm công pháp Vạn Kiếm Quy Tông lên Thiên và Thái Hư Tru Tiên Kiếm Kinh xuống Địa. Ba công pháp mỗi phẩm và các ID, điểm lĩnh ngộ cũ được giữ. Giá tham chiếu là 950B và 265B. Phẩm của vũ khí Thái Hư Tru Tiên Kiếm và Hám Thiên Huyền Hoàng Chùy vẫn tính riêng.
- Vạn Kiếm Quy Tông vận công, đọc khẩu quyết, mượn kiếm, lập trận, xuất kiếm và quy chủ trong 10 giây. Phản ứng kiếm lấy từ các vật phẩm thực trong túi, quầy, kho và trên mặt đất. Thể hiện kiếm ở xa hoặc khác tầng bản đồ bằng kiếm ảnh từ rìa sân. Một nhóm tối đa tám kiếm thật có thể được khóa cùng lúc cho một lần thi triển. Vật phẩm vẫn nằm ở nơi sở hữu; kiếm ảnh có mã projectile riêng và dùng chung ngân sách sát thương. Khi đối thủ mất hiệu lực, kiếm còn lại thu về. Khi hủy thi triển, khóa triệu tập và độ cao được dọn ngay.
- Các tuyệt kỹ lớn có khẩu quyết, tiêu đề, pose, nhịp chuyển động và hiệu ứng theo tiêu điểm. Lôi long giáng theo lớp, Kim Ô xuất hiện từ đại nhật phía sau người thi triển, hỏa long chuyển động trong hỏa vực, cự kiếm Thái Hư hiện chuôi, lưỡi và kiếm văn trước khi giáng. Giữ ba mức VFX, lựa chọn giảm lóe, tắt rung và giới hạn đồ họa. Tùy chọn VFX độc lập với số projectile mô phỏng.
- Trang bị có atlas cầm tay, đeo lưng và nguồn sprite trước khi chỉnh để so sánh. Kiếm vật lý dùng atlas vũ khí khi ngự kiếm. PNG được tạo bằng tập lệnh pixel art Python/Pillow có nét và vật liệu vẽ theo từng mẫu. Độ bền được lưu theo mã bản vũ khí. Di trú lấy độ bền cũ làm giá trị cho bản đầu tiên. Mua bán, đấu giá, nộp/rút kho và nhặt chiến lợi phẩm sử dụng dữ liệu bản vũ khí.
- Chiêu công thành được chỉ định trong registry. Kích thước vùng sát thương lấy từ thông số chiêu và vị trí va chạm. Công trình có trạng thái theo HP, phế tích, footprint động, ghi nhận pháp lý và dùng ủy thác sửa chữa đã có. Phủ Thành Chủ và Bảo Khố là công trình được bảo hộ. Quán trọ, quán ăn và một số điểm dịch vụ có điều kiện đóng cửa khi công trình của chúng sập.
- Phép thử dùng đúng WorldScene với dữ liệu riêng. Có mục tiêu tu sĩ, yêu thú và công trình. Mô phỏng chính dùng cùng bộ xử lý tác động. Tính thành phần liên thông của lưới bằng hàng đợi số với bốn lân cận cố định để giảm cấp phát khi vào cảnh và khi footprint thay đổi.

## Kiểm tra lại

- `npm run build`
- `npm run test:systems`
- `npm run validate:release -- --dist`
- `node tests/martial-browser.mjs` chạy Chrome trên bản preview production. `MARTIAL_SIM_DAYS` mặc định là 5. `--combat-only` bỏ phần mô phỏng kinh tế dài.

Ảnh theo bước, kết quả gameplay và số đo ở `art/previews/thien-dia-dau-phap/`. Tên ảnh Vạn Kiếm được sắp theo thứ tự từ 01 vận công đến 08 hoàn tất. Có chuỗi riêng cho Lôi Long, Kim Ô, Hỏa Long, Thiên Lôi Trấn Thế và cự kiếm Thái Hư.

Chrome đã ghi nhận lần Vạn Kiếm đầu tiên xuất kiếm ở 6,14 giây, chạm đích sau đó và kết thúc sau 10 giây với tám mã va chạm riêng. HP mục tiêu giữ nguyên ở các mốc trước phát chiêu. Các ảnh sau kết thúc cho thấy kiếm ảnh và độ cao đã về 0. Ca thử đưa Ủy Thác Các từ 180 xuống 99 HP và giữ 23 công trình khác nguyên vẹn. Ba đòn trong một bản lưu thử khác đưa Ủy Thác Các về 0 HP, ghi ba vụ việc và tắt footprint động. Sau tải lại, công trình vẫn ở trạng thái phế tích. Quy trình nhận việc, trừ nguyên liệu, sửa và khôi phục HP được kiểm thử trong bộ kiểm thử hệ thống. Ca thử phản kích dùng đòn đánh thật của yêu thú, sau đó đưa thêm một đối thủ vào phép thử để kiểm tra khóa. NPC vẫn chọn đúng yêu thú đã gây sát thương.

Chrome headless đo 60,0 FPS với tám lượt thi triển đồng thời và 59,86 FPS tại nội thành có 180 NPC sau khi ổn định. P95 là 16,8 ms ở cả hai bài. Tính thành phần điều hướng mất 46,5 ms trong lượt đo nội thành. Đây là số đo cục bộ của bộ phận điều hướng và cảnh ổn định. Thời gian nạp toàn cảnh lúc vào thành cần đo riêng.

### Mẫu kinh tế năm ngày

Mẫu sử dụng 108 cư dân và 157 quan sát tu sĩ trong những ngày có hoạt động. Trung vị ròng của toàn nhóm bằng 0, trung vị nhóm dương bằng 3. Giữ B = 3 làm mốc tham chiếu, tương ứng Vạn Kiếm Quy Tông 2.850 linh thạch và Thái Hư Tru Tiên Kiếm Kinh 795 linh thạch. Hai công pháp giữ nguồn hiếm và khả năng giao dịch theo cơ chế đấu giá.

| Nghề | Tăng ví theo từng phút | Giảm ví theo từng phút | Trung vị ròng mỗi ngày |
|---|---:|---:|---:|
| Tu sĩ | 106 | 154 | 0 |
| Nông dân | 388 | 58 | 14 |
| Dược sư | 136 | 57 | 6 |
| Dân thường | 168 | 170 | 0 |
| Hộ vệ | 91 | 87 | 0 |
| Thương nhân | 12 | 26 | 0 |

Tổng tiền trong ví, cửa hàng và phe giảm từ 1.296 xuống 1.230 trong mẫu. Qua các mốc từ đầu ngày 2 tới đầu ngày 7, số NPC có công pháp mới tăng từ 3 lên 6. Số liệu tông môn, sản lượng khai thác và giá hàng hóa theo ngày có trong `economy-results.json`.

## Phạm vi còn mở

Các hàng rào, đường lát và đạo cụ không có HP tác giả trong WorldScene vẫn chưa tham gia quy trình sửa chữa. Mức thể hiện mỹ thuật cần được đánh giá trực tiếp trong Võ Kỹ Các. Các mốc tiền tệ trong mô phỏng ngắn có thể thay đổi đáng kể theo nghề và ngày. Dòng tiền dương và âm được lấy từ thay đổi ví từng phút, nên giao dịch trái dấu trong cùng phút có thể bù nhau.

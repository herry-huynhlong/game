# Hồ sơ cư dân và trạng thái AI

## Cách kiểm tra

Mở game local tại [Thanh Vân Ký](http://127.0.0.1:5183/). Chọn một NPC trên bản đồ hoặc mở **Cư dân**. Hồ sơ mở ở **Tổng quan**. **Tu luyện** chứa sinh lực, linh lực, tiến độ và điều kiện ngự kiếm. **Túi đồ** chứa tài sản và số lượng vật phẩm.

Kịch bản kiểm thử dùng Chrome và một hồ sơ trình duyệt riêng. Seed tạo thương nhân Từ Nhất Minh tại Phường Thị Thanh Vân. Danh tính gốc trong bản lưu giữ nguyên. Họ tên hiển thị được chuẩn hóa dấu và khoảng trắng.

```powershell
npm run build
npm run preview -- --host 127.0.0.1 --port 5183
```

Trong cửa sổ thứ hai, chạy `node tests/resident-profile-browser.mjs --activities`. Ảnh và số liệu ở `art/previews/resident-profile/`. Chạy cùng lệnh bỏ `--activities` để kiểm tra avatar, đồng bộ với trình chỉnh sửa ngoại hình, hồ sơ khi nhập thân và chuyển cảnh giới.

## Nguyên nhân và cách sửa

WorldScene trước đây có hai đường ghi mục tiêu chủ quầy. AI sinh hoạt có thể chọn đi ăn, trong khi lượt cập nhật thương mại kế tiếp lại gán điểm tới quầy. Hồ sơ còn ghép hành động di chuyển với `shortGoal`, nên có thể ghép nhãn của hai thời điểm.

Mô hình AI giờ đọc giờ mở cửa và vị trí đã có từ cửa hàng, sau đó chọn ca trực, ăn, nghỉ hoặc tránh nguy hiểm. Chỉ chủ quầy đã tới điểm phục vụ và đang làm việc mới nhận khách. Khi kết thúc bữa ăn, AI xét lại giờ mở cửa để quay lại. Bữa ăn đã chọn được duy trì đến khi giảm đói hoặc hết nguồn thức ăn hợp lệ. Khi tuyến đường hoặc hành động đổi, WorldScene bỏ đường cũ và giải phóng chỗ làm đã hết hiệu lực trước bước di chuyển kế tiếp.

Ủy thác sửa chữa giữ nhiệm vụ đã nhận trong thời gian cư dân lo nhu cầu hoặc tránh nguy hiểm. Người hái dược nhường điểm đang giữ khi cần tạm ngừng. Hồ sơ và danh sách cư dân đọc hành động đã xác nhận, với câu riêng khi NPC đang chờ vì đường hoặc vị trí bị chặn.

## Phạm vi kiểm chứng

- Đi quầy, phục vụ, đói, đi tìm bữa ăn, dùng bữa, trở lại quầy, hết giờ đi về, nghỉ tại nhà và nguy hiểm ngắt ca được chạy trong WorldScene với Từ Nhất Minh.
- Hồ sơ mở xuyên qua các lượt đổi hành động. Tải lại giữa chặng đi ăn giữ mục tiêu, nghề và nơi làm việc. Đã kiểm tra tu sĩ chuyển từ làm việc sang đả tọa, tách tab và màn hình rộng 390 px.
- Lượt mô phỏng cuối chạy 4.320 phút qua ba ngày với 108 hồ sơ NPC. Ghi nhận 194 lần đổi mục tiêu của các chủ quầy được theo dõi và 0 xung đột theo các điều kiện kiểm tra. Trình kiểm thử dò chủ quầy phục vụ khi đang làm việc khác, chỗ làm cũ còn giữ trong chặng đi ăn và việc bay song song với việc chiếm chỗ trên mặt đất. Kiểm thử tu luyện vẫn ghi nhận điểm nghẽn đường đi ở một số NPC khác trên bản đồ.
- Build TypeScript/Vite, kiểm thử hệ thống và kiểm tra phát hành đạt. Chrome xác nhận mua bán, hoàn tác khi lưu thất bại, năm khách tự giao dịch, va chạm cổng Tây và luồng tu luyện. Lượt kiểm tra lưu/tải cuối chạy với hồ sơ Chrome tạm trên ổ D sau khi ổ C báo hết chỗ.

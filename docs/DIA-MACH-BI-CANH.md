# Vạn Tượng Thiên Địa – Địa Mạch Bí Cảnh

## Mở và thử trong game

Đường dẫn local là http://127.0.0.1:5183/. Ở góc nhìn Thiên Đạo, nhấp cửa mỏ rồi chọn **Quan sát bên trong**. Các nút đổi tầng chỉ đổi góc quan sát. Nút **Trở về mặt đất** trả camera về bản đồ chính.

Khi nhập thân, đưa NPC đến sát cửa mỏ và nhấn **E**. Trong hang, dùng **WASD** hoặc phím mũi tên, **Shift** để đi nhanh hơn, **E** qua cầu thang, khai thác và nhặt đồ, **J** đánh yêu thú gần, **Esc** thoát nhập thân. Mỏ có chủ kiểm tra thân phận. Mạch phẩm cao yêu cầu cảnh giới tương ứng. Cảnh báo ở lối vào hiển thị khi chưa đáp ứng điều kiện.

## Kiến trúc và dữ liệu

- Lớp SpiritVeins trong Tiled giữ 18 ID linh mạch hiện có. Sáu điểm quặng sắt giữ ID riêng. Tổng cộng 24 địa điểm với 38 tầng. Seed từ ID và tầng tạo đường hầm, phòng, cát, nước, lối chuyển tầng, điểm quặng và nơi cư trú.
- UndergroundSystem dùng danh sách cư dân thật. Khi vào, NPC rời lưới chiếm chỗ và các nhánh công việc mặt đất. Tọa độ cửa dùng làm điểm trở về. NPC dưới mỏ đi theo đường hợp lệ, giữ chỗ khai thác, giảm trữ lượng của điểm và mạch cùng một lần, bỏ vật phẩm vào túi rồi tự tìm đường ra.
- Các đơn khai thác tông môn và tổ đội dùng lại cơ chế ký quỹ và giao nhận. Mạch mặt đất là nguồn trữ lượng có thẩm quyền. Khi mạch hồi phục, phần tăng được phân lại trong các điểm. Sổ kho lưu theo instance và việc tải lại giữ nguyên ID NPC.
- Canvas chỉ vẽ tầng đang xem. Nền đá được cache theo tầng đang mở, lớp động chỉ vẽ lại khi trạng thái thay đổi. Camera Phaser mặt đất ngừng vẽ khi mở cửa sổ hang. Đồng hồ mô phỏng vẫn dùng chung, bao gồm chế độ Dừng, ×1, ×2 và ×4.
- Yêu thú đánh từ cùng tầng và theo đường thông. Bọ cạp gây độc, Thạch Yêu gây chấn động làm chậm hành động, Huyết Bức làm hao linh lực, Địa Thử giảm hiệu quả phòng ngự và Địa Long đánh vùng gần. ID và sinh lực giữ nguyên giữa hình thái vùi, đang trồi và đang giao tranh.

## Mỹ thuật và quy trình nguồn

- Phaser nạp atlas PNG từ public/assets/di-mach. Script art/source/draw-di-mach.py vẽ bằng Pillow ở tỷ lệ pixel gốc. Canvas hang và yêu thú nằm trong src/world/UndergroundView.js. Các asset Aseprite sẵn có vẫn là nguồn cho bộ nhân vật modular.
- Luống dùng frame 192×128. Thảo dược dùng frame 32×32 với sáu hàng sinh trưởng. Mỏ dùng frame quặng 40×40 và cửa 72×64. Các lớp trang phục nhận diện và nông cụ dùng frame 24×24.
- Hướng sáng chung từ trên trái. Tông nâu đất cho mỏ thấp, lam ngầm cho trung phẩm, tím cho thượng phẩm, vàng đá cho cực phẩm. Giữ đường viền chọn lọc, bóng tiếp xúc gọn và nearest-neighbor. Dùng đá và nếp sáng lớn trước khi thêm cụm pixel nhỏ.
- Ngoại hình nghề đọc dữ liệu nghề, vị trí trực hoặc loại ủy thác đang làm. Đầu, mặt, tóc và trang bị dùng lại renderer modular và cấu hình NPC hiện tại. Phiên bản này ưu tiên dấu hiệu nghề và dụng cụ hơn một bộ áo mới riêng cho từng nghề.

## Tái lập và đối chiếu

```powershell
python art/source/draw-di-mach.py
python art/source/draw-item-icons.py
node tools/west-wilds/place-cave-entrances.mjs
npm run build
npm run test:systems
npm run validate:release -- --dist
node tests/underground-browser.mjs
```

Mở preview production trên cổng 5183 trước khi chạy bài Chrome. Ảnh và báo cáo số liệu nằm trong art/previews/di-mach-bi-canh. Ảnh atlas đặt tài nguyên cũ và mới trên cùng một bảng. Bài Chrome dùng hồ sơ riêng và vài tình huống bố trí có kiểm soát để lặp lại đúng ca đào mỏ, vào ra, luống trồng và yêu trùng. Các log ghi riêng số liệu thực chạy. Dự án hiện chưa có lệnh lint cấu hình trong package.json.

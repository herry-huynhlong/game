# Tu luyện, kinh tế và Thiên Kiếp

Mở bản local tại `http://127.0.0.1:5183/`. Hồ sơ cư dân có túi đồ riêng và số dư linh thạch. Khi nhập thân, nút **Đả tọa** dùng vòng tu luyện hiện có. Người chơi có thể dùng lương khô và Hồi Xuân Đan trực tiếp từ túi. Đến thương nhân đang trực rồi nhấn **E** để mua bán.

Sân thử `http://127.0.0.1:5183/?cultivationDemo=1` có ba tình huống Trúc Cơ, Nguyên Anh và Hóa Thần khi trọng thương. Sân thử dùng bộ lưu riêng theo tab và chạy cơ chế thiên kiếp của WorldScene.

## Quy tắc chạy game

- Tăng tiểu tầng dùng cơ chế tu vi và Tụ Khí Đan hiện có. Vượt đại cảnh giới buộc cư dân đi tới điểm hợp lệ tại Thanh Vân Tông, dùng một viên đan và trải qua tụ mây, cảnh báo, các đợt sét và kết quả.
- Kiếp vào Trúc Cơ, Kim Đan, Nguyên Anh và Hóa Thần có lần lượt 2, 3, 4 và 5 đợt sét. Kết quả sử dụng trạng thái thân thể, thiên phú, công pháp, phòng thủ và phù hộ thân. Bản lưu giữ số đợt đã chịu và kết quả xác định theo lượt.
- Thất bại giảm tu vi và cần hồi phục. Nếu NPC tử vong, tài sản giữ theo quy tắc dữ liệu hiện có. Thiên kiếp và tiến trình vẫn chạy ngoài camera. Hiệu ứng chỉ vẽ quanh vùng nhìn.
- Tụ Khí Đan bổ sung ở hiệu thuốc bằng linh thảo trong kho, có giới hạn tồn kho và thời gian chế. NPC mua theo nhu cầu và số dư. Giao dịch cập nhật kho, túi và ngân quỹ qua hệ thống kinh tế sẵn có.
- Bộ icon có 32 hình riêng cho 32 mục đang có trong Item Registry. Hình nguồn 32×32 dùng tấm atlas PNG và hiển thị 48×48 với nội suy pixel. Vật phẩm cũ ngoài registry dùng icon thùng hàng dự phòng.

## Kiểm chứng

- `npm run test:systems` có kiểm tra atlas và thiên kiếp có seed. Trong 40 lượt Trúc Cơ, 33 thành công và 7 thất bại. Ca Hóa Thần trọng thương tử vong, giữ hàng còn lại. Luyện Khí và Hóa Thần đều có ca thử tăng tiểu tầng 8 → 9.
- `node tests/world-cultivation-browser.mjs` chạy Chrome trên bản build, lưu ảnh và dữ liệu vào `art/previews/world-cultivation/`. Đã kiểm tra vị trí độ kiếp, cảnh báo NPC gần đó, reload khi đang chờ sét, HP thay đổi lúc sét đánh, độ kiếp ngoài camera, nhật ký, mua và dùng đan để tăng tiểu tầng, cùng 16 tổ hợp dáng ngồi và hướng.
- Ca thử WorldScene ghi nhận NPC tự trả 22 linh thạch mua Tụ Khí Đan, tăng Luyện Khí tầng 8 → 9 và tiêu hao đúng một viên. Kiếp Trúc Cơ có đòn đầu 18 HP. Kiếp Nguyên Anh có đòn đầu 52 HP và đủ bốn đợt.
- Mô phỏng 3 ngày cho bản lưu mới xác nhận 108 túi độc lập, 48 NPC từng đả tọa, 13 lượt thu hoạch, 3 lượt tăng tầng và 40 giao dịch trị giá 366 linh thạch. Trong ba ngày này chưa xuất hiện lượt vượt đại cảnh giới tự nhiên. Mẫu cuối còn 42 NPC có cờ đường đang bị chặn. Số này chưa phân biệt cản đường tạm thời và kẹt lâu.
- Chrome headless đo 58,5 FPS, p95 16,8 ms tại 1584×955 và zoom 1,35× khi kiếp Nguyên Anh trong khung hình. Chưa đo nhiều lượt độ kiếp đồng thời trên máy người chơi.

# Thiện Ác Nhân Quả

## Cách thử trên bản local

Mở http://127.0.0.1:5183/. Chọn một cư dân và nhập thân. Khi đứng gần cửa linh mạch, nút **Quản lý linh mạch** xuất hiện trong hồ sơ nhập thân. Một tu sĩ đủ cảnh giới có thể xác lập sở hữu ở mạch đã phát hiện, vô chủ và an toàn. Chủ hoặc quản lý có thể mở hợp đồng.

- **Tiền công mỗi chuyến** chuyển vào ký quỹ từ túi chủ hoặc ngân khố phe. Thợ nhận tiền khi đem sản lượng đến điểm giao.
- **Chia sản lượng** trả phần trăm bằng linh thạch khai thác thật. Phần lẻ làm tròn xuống ở phía thợ.
- **Cho thuê** giữ phí của người thuê trong ký quỹ. Khi hoàn thành, chủ nhận phí và người thuê giữ sản lượng.
- **Quản lý mạch** có thể được giao cho NPC có quan hệ phù hợp. Việc giao quản lý không chuyển quyền sở hữu.

Trong góc nhìn Thiên Đạo, nhấp linh mạch để xem quyền hợp pháp, quyền kiểm soát và hợp đồng. Nhấp **Phủ Thành Chủ** để xem nhân sự, ngân khố, lệnh truy nã và tiền thưởng đã cam kết. Hồ sơ cư dân có mục **Thiện ác và pháp lý**. Mở giám định chỉ đọc dữ liệu.

## Dữ liệu và quy tắc

Tông môn chỉ còn một cửa Thanh Ngọc hạ phẩm. Tám cửa cũ được nhập vào cùng mạch với tổng sức chứa 92. Migration cộng phần còn lại và số đã khai thác, lưu dữ liệu mỏ cũ để đối chiếu, chuyển nhiệm vụ và NPC dưới mỏ sang ID chuẩn, đồng thời giữ vật phẩm và ký quỹ. Có 10 linh mạch và 6 mỏ sắt ngoài phạm vi hợp nhất.

Hệ chấp pháp dùng cư dân thật. Nhân chứng phải cùng bản đồ với hiện trường, ở trong tầm và có đường nhìn. Lời đồn chỉ cho phép trình báo và không tự tạo bằng chứng. Hồ sơ đã báo cáo có thể phân công vệ binh đến xác minh. Khi lực lượng thiếu sức xử lý, ngân khố có thể ký quỹ truy nã. Tổ đội hiện có nhận nhiệm vụ sau khi biết lệnh và dùng đường đi, giao tranh và giao nhiệm vụ hiện hữu. Tiền thưởng chỉ giải ngân khi tổ đội trở lại nhận thưởng. Nạn nhân giải cứu trở lại lịch sinh hoạt sau giai đoạn hồi phục.

## Kiểm chứng

- Unit test xác nhận migration chạy lại an toàn, giữ vật phẩm và nhiệm vụ đang làm, đồng thời giữ tiền và sản lượng cân bằng ở từng loại hợp đồng.
- Chrome chạy tình huống có kiểm soát. Một thợ từ chối mức công thấp, nhận hợp đồng hợp lệ, xuống hang và lấy 2 viên từ mạch đang có 10 viên. Sau khi về mặt đất và giao tại trạm, chủ nhận 2 viên và thợ nhận 10 linh thạch từ ký quỹ. Lượt gọi giao trùng không trả thêm.
- Ca cưỡng ép lao động được ghi nhận, có nhân chứng và vệ binh tiếp cận, sau đó phát truy nã. Tổ đội ba người giải cứu, bàn luận lệnh tại bàn trà và nhận đúng 41 linh thạch từ Phủ Thành Chủ. Tải lại giữ hồ sơ, quyền sở hữu, hợp đồng và trạng thái đã trả. Dân số vẫn 108.
- Bài đo đồng hồ 3,5 giây mỗi chế độ ghi 0, 3, 7 và 14 phút ở Dừng, ×1, ×2 và ×4. Mẫu ngắn báo 0 NPC mắc kẹt. Chưa có so sánh dài hạn trước và sau trên cùng điều kiện.
- Tấn công và tranh chấp mạch có nguồn phát sinh trong gameplay. Một số hành vi khác có hồ sơ và luồng xử lý dùng chung nhưng chưa có hành vi AI phát sinh riêng. Kiểm thử giải cứu dùng tình huống gieo sẵn, chưa đo tần suất vụ việc tự phát nhiều ngày.

Ảnh và số liệu ở `art/previews/thien-ac-nhan-qua`.

```powershell
npm run build
npm run test:systems
npm run validate:release -- --dist
node tests/civic-browser.mjs
```

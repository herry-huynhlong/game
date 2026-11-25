# Nhân Gian Yên Hỏa

## Công trình đã kiểm tra

| Công trình | Luồng trước cập nhật | Luồng trong bản này |
| --- | --- | --- |
| Trà Quán Bích Trúc | Nhân viên, tồn mẻ trà, giữ chỗ, phí và sinh hoạt | Hai bàn có ghế hướng vào bàn, phục vụ tại chỗ, hội thoại và lời mời lập đội |
| Nhã Nhạc Lâu | Nhân viên, mẻ nguyên liệu và vé | Ghế theo bàn, người dùng dịch vụ, động tác tay đánh đàn và nốt nhạc theo nhịp mô phỏng |
| Y Quán An Tâm | Nhân viên, chỗ ngồi và đan dược lấy từ hiệu thuốc | Ngồi chờ đến lượt y sư, thu phí, dùng thuốc và hồi sinh lực. Khi thiếu đan, dùng linh thảo còn dư ở hiệu thuốc với hiệu quả thấp hơn |
| Tửu Quán Tùng Ảnh | Ca phục vụ, giá, nấu mẻ và kho | Ba bàn có hướng ngồi, ăn nhẹ, uống rượu và hội thoại |
| Khách Điếm Vân Lai | Tiền thuê và nghỉ | Giữ chỗ, trả phí khi đến chỗ, giảm mệt và kết thúc sau giờ thuê |
| Phường Thị, Nhiệm Vụ Điện, Sơn Môn | Mua bán, ủy thác, tập luyện và học tập có sẵn | Cung cấp dữ liệu sự kiện và hợp đồng cho hội thoại. Giữ các công năng hiện có |
| Thương hội và quảng trường | Có dữ liệu faction hoặc vị trí cảnh quan | Giữ hệ thống hiện có. Chưa thêm dịch vụ xã hội độc lập hoặc điểm hẹn mới tại hai khu này |

## Cách hoạt động

- `tools/society/social-seats.mjs` căn lại ghế theo vị trí mặt bàn trong Tiled, giữ nguyên ID ghế. Mỗi lượt chọn ghế còn trống và nối được đường. Một NPC giữ một chỗ. Ghế được trả khi hết giờ, đổi việc hoặc rời quán. Tuyến bị kẹt có xử lý hủy ngay trong luồng di chuyển WorldScene.
- `WorldSociety.js` giữ quyền quyết định sinh hoạt. NPC chọn quán theo đói, sinh lực, mệt mỏi, giờ, tài sản, tính cách và người quen. Lượt phục vụ cập nhật ví, doanh thu và nguyên liệu. Khám bệnh có hàng ghế chờ và nhịp gọi từng bệnh nhân. Y quán mua đầu vào từ vốn phí dịch vụ và giữ biên tồn cho quầy dược.
- `SocialConversations.js` quản lý đối thoại theo bàn với tối đa bốn người và bốn lượt nói. Tin thực tế đến từ người tham gia, người đứng gần sự kiện đủ điều kiện quan sát hoặc người được kể lại. Người nghe lại lưu tin dưới dạng chưa xác minh. Trao đổi chuyện đời thường vẫn xảy ra khi bàn không có tin mới. Mỗi NPC giữ tối đa 12 tin, 16 mục nhật ký và 24 người thường gặp. Lịch sử hội thoại chia sẻ giữ tối đa 64 cuộc.
- Đối thoại hoàn tất mới cộng độ quen biết. Giao dịch có bản ghi và nhiệm vụ chung hoàn tất cũng có thể thay đổi quan hệ. Hồ sơ hiển thị các mức người quen, bằng hữu, tri kỷ, đối thủ và cừu nhân dựa trên quan hệ hiện có. Chưa thêm cơ chế đạo lữ hoặc tự chuyển quan hệ sư đồ.
- Tại trà quán, ba người trở lên có thể bàn hợp đồng còn mở. Đội chỉ được tạo khi đủ điều kiện và ký quỹ qua `Expeditions.js`. Hợp đồng xuất hành vẫn dùng đường đi, kho hàng và thanh toán cũ.
- Renderer dùng lại bộ chuyển tư thế ngồi/đứng. Pose tại quán có chân ghế, tay nâng chén, cúi đầu và cử chỉ khi nói. Các lượt nói và hiệu ứng theo phút game. Để tắt bong bóng, mở **☰ → Bong bóng hội thoại**. Khi zoom xa, bong bóng chỉ hiện dấu ba chấm.
- Nhấp vào công trình dịch vụ để xem nhân viên, sức chứa, giá, doanh thu, khách theo bàn và lượt thoại. Chọn tên khách trong bảng để mở hồ sơ. Hồ sơ NPC có mục **Sinh hoạt và bằng hữu**.

## Kiểm thử

Chạy `npm run build`, `npm run test:systems` và `npm run validate:release -- --dist`. Khi bản build phục vụ ở cổng 5183, chạy `node tests/social-world-browser.mjs` và `node tests/social-ledger-browser.mjs`.

- Ca tự nhiên dùng hồ sơ Chrome riêng, kiểm tra Dừng, ×1, ×2, ×4 và chạy nhiều ngày ở ×4. Tệp `simulation.json` ghi doanh thu, lượt dùng và số khách riêng biệt, hội thoại, quan hệ mới, tổ đội, số NPC kẹt và FPS.
- Ca kiểm soát sắp ba khách phù hợp tại bàn và một người bị thương tại y quán. Tệp `controlled.json` ghi sở hữu ghế, bàn, ví, kho, lượt nói, việc lập đội và kết quả điều trị. Vị trí bắt đầu của ca kiểm soát do bài thử đặt, còn giá, nhận khách, thanh toán, phát sinh đối thoại, lập đội và bước di chuyển sau khi lập đội chạy bằng hệ thống game.
- Ảnh Chrome và sổ liệu nằm trong `art/previews/nhan-gian-yen-hoa/`. Gameplay trong hồ sơ cá nhân của người chơi không được dùng làm dữ liệu kiểm thử.

### Kết quả ca tự nhiên

Trace ghi 27 mốc trong hơn bốn ngày game. Build, validator và bộ test hệ thống đều đạt. Kiểm tra Chrome tải lại và đối chiếu lượt giữ chỗ, cuộc trò chuyện đang diễn ra, lịch sử và sổ quán. Không có hai NPC cùng đăng ký một ghế trong mẫu kiểm tra. Chrome không ghi lỗi JavaScript hoặc lỗi tải tệp.

| Công trình | Khách riêng biệt | Lượt trả phí | Doanh thu linh thạch |
| --- | ---: | ---: | ---: |
| Trà Quán Bích Trúc | 16 | 20 | 40 |
| Nhã Nhạc Lâu | 9 | 16 | 112 |
| Tửu Quán Tùng Ảnh | 9 | 10 | 40 |
| Khách Điếm Vân Lai | 0 | 0 | 0 |
| Y Quán An Tâm | 0 | 0 | 0 |

Có 8 cuộc trò chuyện bắt đầu, 3 hoàn tất, 3 cặp quan hệ mới và 3 cuộc hoàn tất dựa trên tin có nguồn sự kiện. Có 14 đội lập qua AI thông thường và 10 xuất hành. Chưa quan sát được đội hình thành qua trà quán trong lượt tự nhiên cuối. Tối đa 5 NPC báo kẹt ở một mốc. Chrome headless đo khoảng 46,0 FPS ở 1584 × 955, zoom 0,95 và 20 NPC hiển thị. Lần Bách Tu Xuất Hành ghi 49,6 FPS với 24 NPC hiển thị, nên hai số đo chưa cô lập được tác động của hệ thống mới.

### Kết quả ca kiểm soát

Ba NPC ngồi bàn 1, dùng ba phần trà với tổng phí 6 linh thạch. Gọi thu phí lại không trừ thêm. Ba người đối đáp bốn lượt, hình thành quan hệ, lập đội dưới nguồn `tea` rồi giải phóng ghế. Sau khi bắt đầu xuất hành, đội đi bằng hệ thống di chuyển WorldScene, có thành viên qua phía tây thành và thực hiện đòn trúng yêu thú. Chưa kiểm tra hoàn thành chuyến săn ở ca này.

NPC bị thương ngồi chờ y sư, thanh toán 11 linh thạch đúng một lần, hồi từ 30 lên 58 HP rồi trả ghế. Ảnh y quán lấy ở giai đoạn chờ của ca này. Ảnh trà quán và nhạc lâu lấy từ lượt tự nhiên.

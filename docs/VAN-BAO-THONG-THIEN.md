# Vạn Bảo Thông Thiên · Thiên Địa Thương Đạo

## Vào chơi

- Mở **Đấu giá** trên thanh đầu màn hình. **Định vị Vạn Bảo Các** đưa camera đến cửa công trình. **Quan sát chính sảnh** mở bản đồ trong nhà và theo dõi NPC từ góc nhìn Thiên Đạo.
- Khi nhập thân, tới cửa Vạn Bảo Các và nhấn **E**. Ký gửi trong ngày thứ 1–5 của tuần. Sảnh đón khách ngày thứ 7 lúc 08:00, kiểm tra khách lúc 09:00 và bắt đầu xử lý các lô từ 10:00. Khách có ít nhất 100 linh thạch khả dụng mới đủ điều kiện tài sản.
- Mở **Thiên Đạo** để xem Vật phẩm, Công pháp / Võ kỹ, Vũ khí / Trang bị, Kho Thiên Đạo, Ban thưởng và Tạo cơ duyên. Khi tạo cơ duyên, chọn món đã mua, chọn bản đồ và kiểm tra điểm đặt trước khi xác nhận.

## Kiểm toán và luồng dữ liệu

| Hệ thống | Cách triển khai |
| --- | --- |
| Túi đồ và trang bị | Tái sử dụng `EconomySystem.transferItem` và `WeaponInstances`. Vũ khí giữ định danh, chủ sở hữu, lịch sử và độ bền. Vật phẩm phi vũ khí được định danh khi mua từ Thiên Đạo hoặc đưa vào ký gửi. Túi đồ cũ tiếp tục dùng số lượng đã lưu. |
| Thương nhân | Dùng quầy Thiết Mộc Các, Phường Thị và Tàng Bảo Các hiện có. Nhãn Binh Khí Phô, Vạn Pháp Thư Các và Linh Bảo Các chỉ loại hàng. Có hạn mức nhận hàng, nguồn rèn và giao dịch có thật. Thương nhân lưu động chỉ chào hàng Huyền cấp nếu đã có trong túi. |
| Đấu giá | Lô cũ trong `MartialEconomy` tiếp tục được kết toán theo dữ liệu đã lưu. Vạn Bảo Các dùng dịch vụ ký gửi theo tuần. Nhận lô Huyền và Địa cấp từ túi NPC, kho cửa hàng hoặc bảo khố tông môn theo quyền người ký gửi. |
| Tiền và ký quỹ | Khi trả giá, số linh thạch rời ví NPC và vào lô. Giá cao hơn hoàn lại giá cũ. Chốt lô chuyển vật phẩm và trả người bán sau hoa hồng 5% làm tròn xuống. Lô không bán hoàn lại vật phẩm. Giá thần lực nằm trong danh mục Thiên Đạo riêng. |
| Nội thất | Dùng hạ tầng bản đồ con của hệ Địa Mạch cho sảnh có 24 ghế, quầy, kho ký gửi và bục. NPC đi theo navigation ngoài thành, qua cửa, chạy đường đi trong sảnh rồi chuyển sang pose ngồi khi tới ghế. |
| Kho và Ban thưởng | Nâng cấp sổ mua hàng cũ thành kho toàn cục. Bản lưu cũ được bổ sung giá thần lực và vật phẩm có thể chuyển. Mua và ban dùng giao dịch có hoàn tác khi ghi save thất bại. 15 công pháp liên kết 45 võ kỹ qua registry. Bốn bí kíp độc lập cũ vẫn có thể dùng. |
| Cơ duyên | Phần hàng đã mua được chuyển vào vật thể tại mặt đất hoặc bản đồ con. Vị trí được kiểm tra collision, liên thông và điều kiện nhận. NPC chỉ có thể phát hiện khi đến gần trong hoạt động hiện có. Vật thể lưu qua reload cho tới khi được nhặt. |
| Nhật ký và mỹ thuật | Giao dịch, chuyển kho, đặt và phát hiện cơ duyên sinh sự kiện từ thao tác thật. Thương Điếm và bục dùng sprite trang bị hiện có. Ánh sáng và animation ở bục chạy nhẹ theo thời gian. |

## Kiểm thử

```powershell
npm run build
npm run test:systems
npm run validate:release -- --dist
node tests/martial-browser.mjs --commerce
$env:COMMERCE_SIM_DAYS='8'
node tests/martial-browser.mjs --commerce --natural
```

Chrome dùng profile thử riêng. Ca có kiểm soát cấp ví và hàng thử để kiểm tra đúng ranh 99/100, quá trình NPC di chuyển, trả giá, tải lại giữa phiên, phí, hoàn trả và một lần nhận cơ duyên. Phép chạy tự nhiên giữ tài sản và hành vi từ seed game, ghi chênh lệch ví, thần lực và số lô theo từng ngày. Ảnh và JSON nằm trong `art/previews/van-bao-thong-thien`.

Trong ca kiểm soát, hai khách đi vào và ngồi. Lô Huyền cấp bán với 88 linh thạch, người bán nhận 84 và Vạn Bảo Các nhận 4. Lô Địa cấp không có giá phù hợp được trả về đúng chủ. Cả hai vũ khí giữ nguyên định danh. NPC thử đi trong hang qua 47 lượt định tuyến mới tới cơ duyên. Bước vào cửa hang không phát vật phẩm.

Trong lần mô phỏng tám ngày trên bản cuối, sổ ghi 190 thần lực mới, gồm 136 từ yêu thú, 48 từ đột phá và 6 từ NPC tử vong. Đến ngày 9, tổng ví của cư dân trưởng thành còn sống là 850 linh thạch, với bốn NPC đạt ngưỡng 100 linh thạch khả dụng. Phiên đầu nhận một lô Lôi Linh Quả, không có khách qua kiểm tra và hoàn trả lô cho chủ.

Nhóm tu sĩ có 390 linh thạch vào và 292 ra, ròng +98 cho cả nhóm. Trung vị mỗi tu sĩ mỗi ngày là 0 trên 448 cặp quan sát. Nhật ký cuối lượt còn 23 mục khớp nhóm tiền lương và thanh toán. Con số này chỉ phản ánh cửa sổ nhật ký còn lưu. Lần chạy trước đó ghi 201 thần lực sau tám ngày và cũng có bốn NPC đủ điều kiện tài sản. Các mức giá và mốc B = 3 là cấu hình thử nghiệm.

Các bài build, system tests, release validation, ca Chrome giao thương và hồi quy 45 võ kỹ đều qua. Ca Chrome giao thương kiểm tra thêm tồn kho hết sau bán, đổi giữa hai NPC nhập thân mà kho vẫn giữ món cũ, và kiểm tra mặt đất từ chối vị trí ngoài bản đồ trước khi nhận vị trí hợp lệ.

## Phạm vi còn cần mẫu kiểm chứng

Mô phỏng tự nhiên có ít khách đủ tiền và chưa xuất hiện phiên bán thành công trong mẫu tám ngày. Bài thử đặt cơ duyên sử dụng tuyến ngầm có kiểm soát. Chưa có số đo tần suất NPC tự gặp rương sau nhiều tuần. Giới hạn 100 linh thạch và công thức cộng thần lực vẫn theo đặc tả.

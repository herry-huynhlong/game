# Vạn Linh Sinh Tức

Phạm vi là WorldScene đang chạy trên bản đồ `maps/world-rebuild-1b.tmj`. Bản đồ này dùng bộ mô phỏng cư dân, va chạm và lưu cục bộ hiện có.

## Kiểm toán trước khi sửa

| Hệ thống | Phân loại | Kết quả đọc mã |
| --- | --- | --- |
| AI tu luyện | Có lỗi | Điểm chọn tu luyện vẫn cao ngoài giờ. Đệ tử tập trung vào một khung giờ trận pháp. Kiểm tra ô đường thiếu độ dời của Tây Hoang. |
| Nghề nghiệp | Một phần | Người hái dược, thợ sửa, thợ săn, nông dân, vệ binh và người bán hàng đã có đường đi và công việc. Các nghề chuyên môn tu tiên vẫn dùng chung chức năng hoặc còn thiếu. |
| Nhu cầu cá nhân | Một phần | Đói, mệt, an toàn, hồi phục và nhu cầu xã hội ảnh hưởng hành vi. Thu nhập và hành trình lấy nguyên liệu chưa liên thông ở mọi nghề. |
| Lịch sinh hoạt | Một phần | Lịch có ca và độ lệch giữa NPC. Lịch tông môn vẫn dồn nhiều đệ tử vào một khu trong cùng ca. |
| Di chuyển và tìm đường | Hoạt động | Có lưới va chạm, tuyến đường, đặt chỗ, tránh nhau và xử lý đường bị chặn. Một số NPC vẫn có thể đứng chờ lâu. |
| Thành trì và công trình | Một phần | Có công năng ở chợ, khách điếm, tửu quán, trà quán, y quán, lò rèn và trạm nhiệm vụ. Một số công trình người dùng liệt kê chưa có dịch vụ. |
| Mua bán | Hoạt động | Quầy cần người trực, NPC đi đến quầy, thiếu tiền hoặc hàng thì giao dịch thất bại, giao dịch cập nhật hai phía. |
| Kho và tồn kho | Hoạt động | Có kho faction, tồn quầy và túi NPC. Chế tạo và giao nhiệm vụ có nhập/xuất vật phẩm. |
| Linh thạch và tiền tệ | Một phần | Ví linh thạch, thuế và tiền hàng đã chạy. WorldScene còn thiếu nguồn khai thác linh thạch vật lý. |
| Khai khoáng | Có lỗi | Nguồn sản xuất quặng sắt bị đặt tên mạch linh khoáng trong bản đồ và Giám Định. Khoáng sản WorldScene đang dùng quặng sắt. |
| Quyền khai thác | Một phần | Mô hình cũ có linh mạch tranh chấp riêng. Điểm khai khoáng WorldScene cần kiểm tra quyền và trữ lượng tại chỗ. |
| Tông môn và sơn môn | Hoạt động | Có sân tập, trận, thư khố, kho, trưởng lão phục vụ, ngân sách và hoạt động sản xuất theo ca. |
| Nhiệm vụ | Một phần | Ủy thác sửa nhà, săn, giao nộp và tiếp tế đã chạy. Hộ tống đồng hành, bảo vệ linh mạch và cứu viện chưa đủ hành vi. |
| Luyện đan và luyện khí | Một phần | Có tiêu hao nguyên liệu, thời gian sản xuất và nhập kho. Phù lục, trận pháp và ngự thú chưa có chuỗi tương đương. |
| Thiên tài địa bảo | Hoạt động | Có sinh trưởng, tái sinh, bảo hộ theo lãnh địa, thu hoạch một lần và nguyên liệu luyện đan. |
| Yêu thú và lãnh địa | Hoạt động | Có hạn ngạch sinh cảnh, cảnh giác, kỹ năng, hồi phục, tái sinh và chiến lợi phẩm. Phi hành của yêu thú chưa có trước đợt này. |
| Thiên Đạo Giám Định | Một phần | Đã đọc được dữ liệu NPC, yêu thú, cây, dược liệu, chiến lợi phẩm và quặng. Thiếu thông tin quầy và nguồn khai thác linh thạch. |

## Thay đổi

- Mỏ Quặng Sắt tiếp tục cấp quặng cho Luyện Khí Đường. Lớp Tiled `SpiritVeins` khai báo bốn mạch linh thạch, có ID, phẩm cấp, thời gian khai thác, quyền tiếp cận và trữ lượng phục hồi theo giờ trong game. Hai mạch sâu bắt đầu ở trạng thái chưa phát hiện.
- Ủy thác khai mạch dùng bàn giao nhận, ngân quỹ ký quỹ và hành vi đi thực địa của Thanh Vân Tông. Khi bảo khố cần linh thạch, quặng linh thạch được đặt vào túi sau thao tác khai thác tại chỗ. Bảo khố quy đổi theo phẩm cấp sau khi NPC mang về nộp. Mỗi ủy thác dùng một người nhận và chỉ quyết toán một lần.
- Kim Điêu thay vị trí Thanh Lân Yêu Mãng trong bảng sinh loài và lãnh địa. Tệp lưu hệ yêu thú v2 giữ ID, hạng, sinh lực, da mãng trong túi và loot đã sinh. Kỹ năng cũ đang thi triển được hủy khi chuyển loài. Lôi Linh Quả đổi yêu thú bảo hộ sang Kim Điêu.
- Kim Điêu dùng độ cao và tầng va chạm riêng, được bay qua nước Tây Hoang và rễ cây. Vách đá, công trình, lãnh địa và vùng bảo vệ vẫn giới hạn đường bay. Kim Điêu hạ thấp trong các đòn tấn công để tạo cơ hội đáp trả. Atlas 112 × 112 có bốn hướng và các pose dùng chung hệ kỹ năng.
- Chín kiểu cổ thụ, năm kiểu thảm rừng và bốn kiểu mạch có sprite gốc được vẽ và xuất bằng Python/Pillow. Cây lớn dùng điểm rễ để va chạm. Các đồ trang trí thấp đặt ngoài đường và không có collision mới. Các điểm sinh Lôi Linh Quả có thể chọn vùng cạnh rễ Lôi Kích Cổ Mộc.
- AI giảm điểm tu luyện ngoài ca, ưu tiên tìm thu nhập khi thiếu linh thạch và có linh thảo hợp lệ. Đệ tử chia nhóm theo thời gian tập, đả tọa và đọc sách. Chỗ ngồi gần nhà và các điểm yên tĩnh bổ sung dùng cơ chế đặt chỗ và kiểm tra nối tuyến. Khi Tụ Linh Trận đầy, NPC có thể chọn chỗ hợp lệ khác.
- Quầy thành cập nhật giá một lần mỗi giờ trong game theo tồn kho và trong khoảng giới hạn, với chênh lệch mua/bán tránh giao dịch vòng để kiếm tiền. Giám Định hiển thị chủ, vốn, tồn, giá, mức thiếu hàng và bảo hộ mạch. Hồ sơ cư dân hiển thị đích, nhà, nhu cầu nổi bật và lý do từ quyết định AI đang còn phù hợp.

## Kiểm thử lại

Chạy `npm run build`, `npm run validate:release -- --dist`, `npm run test:systems`. `npm run lint --if-present` chạy được, dự án hiện chưa khai báo tác vụ lint.

Phục vụ bản build trên cổng 5183 rồi chạy `node tests/living-breath-browser.mjs`. Bài Chrome dùng hồ sơ riêng, kiểm tra bốn mạch trên địa hình, hạn ngạch Tây Hoang, số cư dân, ánh xạ atlas, khai thác và giao nhận một lần, tải lại, cùng hai ngày mô phỏng. Kết quả và ảnh chụp nằm ở `art/previews/living-breath/`. Bài thực địa đưa NPC thử tới vị trí mỏ và bàn giao nhận để kiểm tra từng mốc sổ cái. Bài mô phỏng tiếp theo chạy qua WorldScene với các hệ thống thường lệ.

Lần chạy ghi trong `simulation.json` đi qua 2.883 phút trong game. Tại 12 mốc lấy mẫu, có 3–25 NPC đả tọa, 3–52 NPC làm việc, 5–49 NPC đang di chuyển, 1–3 ủy thác đang thực hiện và 0–3 NPC được bộ đếm báo kẹt. Ghi nhận 97 giao dịch và 8 ủy thác hoàn tất trong cửa sổ quan sát, tính cả bản ghi có sẵn sau bước kiểm tra sổ cái. Bộ đếm khai thác là 8 đơn vị linh thạch, gồm 2 đơn vị từ ca thử có kiểm soát, và 2 đơn vị quặng sắt. Phường Thị tăng từ 53 lên 86 đơn vị tồn kho, Đan Dược Các từ 12 lên 20 giữa mốc đầu và cuối. Tổng ví NPC, vốn cửa hàng, kho faction và ký quỹ là 1.297 → 1.232, chưa tính quỹ dịch vụ và các khoản khác. Sau mô phỏng còn 107/108 cư dân sống vì một NPC bị Xích Giáp Sơn Trư hạ.

Chrome headless ghi khoảng 45,5 FPS ở Thanh Vân Thành, khung hình 1584 × 955, zoom 0,95 và 20 NPC được render. P95 thời gian khung hình qua bộ lấy mẫu nội bộ khoảng 16,68 ms. Chưa có số gốc cùng điều kiện để kết luận cải thiện FPS. Chrome không ghi lỗi JavaScript hoặc tải tài nguyên trong lượt này.

## Phần còn thiếu

- Các mạch sâu có quyền, mức nguy hiểm, khám phá theo tiếp cận và kiểm tra yêu thú hộ mạch. Chưa có luồng giành chủ, nhiệm vụ thăm dò có người nhận, hộ tống, canh mỏ hoặc tiếp tế riêng. Chưa xác minh NPC tự khai thác đủ cả bốn cấp.
- Chưa có mỏ đồng và linh khoáng luyện khí riêng. Thiếu chuỗi nghề phù lục, trận pháp, ngự thú và đấu giá. Chưa có đơn cung ứng do cửa hàng tự phát hành, nhiệm vụ cứu viện hoặc hệ thống phát triển thương hội hoàn chỉnh.
- Chỗ ngồi gần nhà, sơn môn và điểm hoang dã đã dùng chung bộ đặt chỗ. Chưa có dịch vụ thuê động phủ hoặc phòng tu luyện riêng tại khách điếm.
- Kim Điêu nghỉ ở vị trí nhà/lãnh địa đã lưu. Chưa có tổ vật lý gắn vào đối tượng cây để làm tài nguyên hay hệ sinh thái sinh sản. Cây lâu năm mới có dữ liệu tuổi cố định theo bản đồ.
- Khoanh vùng trường hợp kẹt dài hạn và cân bằng thương vong cần thêm nhiều lượt mô phỏng. Số liệu FPS từ Chrome headless chỉ mô tả lần đo và cấu hình tương ứng.

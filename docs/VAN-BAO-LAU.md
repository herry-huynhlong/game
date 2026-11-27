# Vạn Bảo Lâu

## Vị trí và tương tác

Trong **Bản đồ**, chọn **Vạn Bảo Các · Thanh Vân Thành**. Nhấp vào mái hoặc mặt tiền để mở **Thiên Đạo Giám Định**, rồi chọn **Vào bên trong**. Khi nhập thân, đi tới cửa và nhấn **E**. Trong sảnh, nhấp cầu thang để chuyển góc nhìn Thiên Đạo. Khi nhập thân, đứng cạnh cầu thang và nhấn **E** để nhân vật chuyển tầng.

Bản cũ chọn một điểm trống quanh chợ theo collision nên vẫn chiếm mười ô đường trục tại vị trí được chọn. Lô mới nằm ở khu lát sân Đông Bắc, tại (8576, 1454) theo tọa độ Tiled, gần dãy phố thông xuống chợ. Mái và sân được kiểm tra cùng footprint, hình học cầu thang và các ô đường của map. Bốn công trình chính hiện có không giao các ô đường trục được kiểm tra. Nhã Nhạc Lâu và Y Quán An Tâm được dịch cả hình, footprint, quầy, ghế, điểm chờ và điểm làm việc để trả lại đường chính. Hai địa điểm giữ ID và sổ dịch vụ cũ. Đường, lộ giới và nền Tiled giữ nguyên.

## Ba tầng

| Tầng | Không gian và chức năng |
| --- | --- |
| Vạn Bảo Chính Sảnh | 24 ghế, quầy tiếp khách, quầy ký gửi, quầy trà và bục đặt lô đang mở. |
| Thiên Bảo Nhã Các | Sáu khu khách quý có ghế và bàn trà, bản hiển thị lô hiện hành cạnh lan can. Khách đã được xếp ghế VIP dùng chung phiên và ký quỹ với chính sảnh. |
| Vạn Bảo Bí Khố | Khu sổ sách, tủ công pháp, giá vũ khí, vùng lưu ký gửi, rương hoa hồng và trận pháp. Dữ liệu trên bệ và trong giám định lấy từ số lô có vật phẩm đang lưu. Thiên Đạo có thể quan sát. NPC cần quyền quản sự để lên tầng. |

Registry giữ ID ổn định cho từng tầng. Tầng dùng chung hệ thống điều hướng, va chạm, camera và lưu trạng thái với bản đồ con. Chuyển camera không di chuyển cư dân. Người dự đi theo đường trên mặt đất, vào cửa rồi đi tới ghế qua cầu thang nếu cần. AI tiếp tục chạy dưới cùng đồng hồ thế giới dù camera đang xem tầng khác.

Công trình có HP và điểm sửa chữa trong hệ thống môi trường. Lịch tuần, giới hạn 100 linh thạch, ký quỹ, hoa hồng, vật phẩm ký gửi và lịch sử tiếp tục dùng dữ liệu đấu giá hiện có. Khi tải bản lưu một tầng, khách đã ngồi được chuyển đến tọa độ ghế mới theo chỉ số ghế đã lưu.

## Mỹ thuật và kiểm tra

Ngoại thất và nội thất dùng Canvas 2D, Phaser cùng sprite vật phẩm hiện có. Ba tầng có nền đã cache và nội thất vẽ theo depth. Khung ngày và khung đèn đêm của ngoại thất dùng cùng footprint. Mã tạo hình nằm ở [AuctionExterior.js](../src/world/AuctionExterior.js), [AuctionRoomArt.js](../src/world/AuctionRoomArt.js) và [BuildingInteriors.js](../src/world/BuildingInteriors.js).

Chạy các lệnh kiểm thử từ thư mục dự án. Bài Chrome dùng profile tách biệt. Ảnh và số liệu khung hình được ghi vào `art/previews/van-bao-lau/`.

```sh
npm run test:systems
npm run build
npm run validate:release -- --dist
npm run preview -- --host 127.0.0.1 --port 5183 --strictPort
```

```sh
node tests/martial-browser.mjs --commerce
```

[Kiểm toán luồng thương mại và sổ ký quỹ](VAN-BAO-THONG-THIEN.md)

Ca Chrome có kiểm soát kiểm tra nhấp mái, xem ba tầng, đường từ trung tâm tới quầy và các ghế của Nhã Nhạc Lâu và Y Quán, damage/HP và đường tới điểm sửa. Hai khách thực sự đi vào từ sân, một người qua cầu thang lên Nhã Các. Cùng một lô nhận giá từ hai tầng. Ca tải lại giữa phiên cho cùng định danh vũ khí và phân bổ 88 linh thạch thành 84 cho người bán cùng 4 hoa hồng. Lô chưa bán trả đúng chủ, khách rời cả hai tầng và tuần mới có phiên tiếp theo.

Phép đo ngắn trong Chrome headless, dùng profile thử 108 NPC, dừng đồng hồ và lấy 80 khoảng khung hình cho mỗi cảnh. Mặt đất và chính sảnh đều đạt trung bình khoảng 16,7 ms, p95 khoảng 16,8 ms. Hai cảnh dùng mức zoom phù hợp từng chỗ. Đây là số đo theo cảnh, chưa đo phiên đông đủ ghế hoặc mô phỏng dài ngày.

Bí khố đã có quyền truy cập quản sự và điểm hộ vệ. Lịch tuần tra riêng của hộ vệ bên trong chưa được kiểm chứng. Các công trình khác dùng dữ liệu giám định sẵn có và chưa có nội thất mới trong đợt này.

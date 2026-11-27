# Thiên Địa Đấu Pháp II · Vạn Pháp Hiển Thế

Mở `/?combatGallery=1` để thử 15 công pháp, 45 võ kỹ và 15 vũ khí. Thêm `&skill=nine-dragons`, `&skill=crow-descent` hoặc `&skill=myriad-unite` để chọn sẵn kỹ năng. Võ Kỹ Các có điều khiển ban ngày và ban đêm, hướng, zoom, tốc độ, chuyển giai đoạn, mục tiêu tu sĩ, yêu thú và công trình. Có thể chọn một, bốn hoặc tám người thi triển và so sánh ba trạng thái khí tức của vũ khí. Các tình huống thử nằm trong phiên Võ Kỹ Các.

## Thay đổi trong WorldScene

| Nhóm | Hiệu ứng và động tác |
| --- | --- |
| Thiên | Hỗn Độn có lôi văn hộ thể, chín rồng điện uốn nhiều đốt và thiên lôi phân nhánh. Kim Ô có tám khung cánh, ba chân, chín mặt trời và hỏa vũ. Bách Kiếm có kiếm ảnh xuất kích. Thiên Kiếm có kiếm ảnh xoay quanh vùng tác dụng. Vạn Kiếm Quy Nhất tiếp tục dùng bộ mỹ thuật đã duyệt. |
| Địa | Thái Hư có vết rạn, bốn mẫu kiếm và cự kiếm giáng. Cửu Tiêu dùng lôi vân và linh văn lam lạnh. Hỏa Long có đầu, chân và đốt thân riêng, cùng hiệu ứng thổ tức và tro lửa. |
| Huyền | Tử Lôi có điện bám kiếm, vệt lướt và năm tia trang trí theo nhịp. Huyền Băng có tinh thể, băng liên và băng giáp. U Minh có trảo, hồn ảnh và bóng theo đường lướt. |
| Hoàng | Thanh Vân có kiếm khí, vệt phong và ba kiếm ảnh hội tụ. Xích Viêm có dấu bàn tay lửa, hỏa cầu và hỏa quang hộ thân. Thanh Mộc có dây leo, mộc thuẫn và sinh khí nổi lên khi hồi phục. |
| Phàm | Thanh Phong có ba nhịp chém và thức xoay kiếm. Hám Sơn dùng thế lấy đà, thủ thế và đá vụn. Bát Hoang dùng vệt đâm thẳng và quét ngang theo trục trường thương. |

Hiệu ứng mới dùng chung trong `MartialCombat` cho Võ Kỹ Các và WorldScene. Kết ấn, chỉ quyết, chưởng, quyền, đâm, quét và triệu pháp tướng sử dụng rig hiện có với chuyển động tay, vạt áo và tóc theo đồng hồ chiêu. Các tầng xoay, vật thể và ánh sáng dùng sprite tái sử dụng. Chiêu Địa và Thiên có ánh sáng cục bộ, gợn nước khi gặp nước, bụi và chuyển động cây ở gần tâm chiêu. Vũ khí giữ hình thể và điểm cầm trên atlas hiện có. Khí tức được gắn theo hướng vũ khí và thay đổi theo trạng thái giao chiến hoặc tương hợp.

Thời gian gây sát thương, tầm, MP, hồi chiêu, mục tiêu khóa, tiêu hao độ bền và dữ liệu save dùng các quy tắc cũ. Số lượng rồng, kiếm ảnh, tia điện, hỏa vũ và thành phần môi trường chỉ phục vụ mỹ thuật. Các tia va chạm trên mục tiêu lấy thời gian và vị trí từ sự kiện trúng đòn thực tế. Hộ thể đi theo đối tượng nhận hiệu ứng đến khi thời hạn trong hệ thống chiến đấu kết thúc. Cửu Long Lôi Kiếp dùng timeline chiến đấu hiện hành thay cho nhịp 8–10 giây tham khảo.

## Nguồn và cách tái tạo

- `art/source/draw-van-phap.py` chứa hình dáng pixel gốc và công thức tổng hợp 14 tệp WAV. Âm thanh có các mốc tụ lực, phát chiêu, trúng đòn và dư âm. Pool mới giới hạn bảy âm phát chồng.
- `art/source/van-phap-master.lua` dùng Aseprite CLI nhập atlas thành `art/source/van-phap-master.aseprite` với 23 layer và tám frame chỉnh sửa được. Các layer vũ khí là sprite cầm tay và đeo lưng đang phục vụ WorldScene. Hình gốc được tạo bằng Python/Pillow.
- `public/assets/van-phap/atlas.png`, `atlas.json` và các tệp WAV là dữ liệu runtime. Atlas 1024 × 1936 có 336 frame.
- `tests/martial-browser.mjs --combat-only` kiểm tra gameplay và hồi quy trên bản Vite preview. `tests/van-kiem-capture.mjs --benchmark` đo lại mẫu Vạn Kiếm. `tests/van-kiem-capture.mjs --van-phap` xuất video và ảnh Phaser. `tests/van-phap-contact.py` ghép contact sheet từ ảnh Chrome và atlas vũ khí.

Ảnh và video nằm ở `art/previews/van-phap`. Video là ảnh ghi trong Chrome theo đồng hồ mô phỏng 10 khung/giây. Để nghe âm thanh và kiểm tra chuyển động ở tần số làm tươi của màn hình, phát trực tiếp trong Võ Kỹ Các.

## Kiểm chứng

- Build TypeScript/Vite, `test:systems` và `validate:release -- --dist` đã qua. Chrome chạy đủ 45 chiêu, bốn hướng, ba mức zoom, hai thời điểm ánh sáng và mục tiêu yêu thú, tu sĩ, công trình. Bài thử ngoài Võ Kỹ Các kiểm tra NPC phản công khi bị thú đánh và công trình giữ trạng thái phá hủy sau reload.
- Vạn Kiếm giữ 150 kiếm và sáu phát trúng trong cấu hình benchmark có sáu kiếm mượn. Trước và sau đều khoảng 60 FPS, p95 16,8 ms. Khung hình dùng Chrome WebGL ở zoom 0,95×.
- Cửu Long Lôi Kiếp hiện chín lôi long và ghi bốn hit trên mục tiêu thử. Sân thử tám tu sĩ giữ đủ tám lượt sau va chạm. Chrome ghi nhận âm thanh hoạt động với mức cao nhất ba âm đồng thời trong lượt Kim Ô thử.
- Nội thành 180 NPC giữ khoảng 60 FPS, p95 16,8 ms ở zoom 0,95×. Lần đo điều hướng đợi camera vào thành khoảng 1,1 giây. Lần mở WorldScene mới sẵn sàng sau khoảng 4 giây trong Chrome headless.

## Giới hạn mỹ thuật

Các pose mới dùng chung hình thể và lớp trang phục của rig đang có. Hai pháp tướng rồng và Kim Ô có cấu trúc riêng, với chuyển hướng bằng lắp ghép đốt hoặc lật hướng cánh. Kiếm, đao và thương giữ thiết kế sprite cầm tay và đeo lưng hiện tại. Phần nâng cấp vũ khí trong đợt này nằm ở khí tức và cộng hưởng trong gameplay. Ánh sáng cục bộ dùng texture trên bản đồ, chưa có phản chiếu động theo từng bề mặt. Ảnh và đo FPS dùng để đối chiếu chất lượng mỹ thuật với mẫu Vạn Kiếm đã duyệt.

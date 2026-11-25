# Cửu Thiên Lôi Kiếp

## Chạy và xem thử

Chạy `npm run build` rồi `npm run preview -- --host 127.0.0.1 --port 5183`.

- [WorldScene](http://127.0.0.1:5183/) dùng hiệu ứng mới với các cuộc độ kiếp phát sinh tự nhiên. Mở menu ☰ → Thiên Kiếp để chọn chất lượng, ánh chớp, rung camera và âm thanh.
- [Độ kiếp thật có bản lưu thử](http://127.0.0.1:5183/?cultivationDemo=1) dùng luật gameplay và nhật ký hiện tại. Chọn Trúc Cơ, Nguyên Anh hoặc Hóa Thần trọng thương.
- [Sân thử hiệu ứng](http://127.0.0.1:5183/?tribulationVfx=1) cho phép chọn cảnh giới, kết quả, chất lượng, một hoặc ba tu sĩ, phát lại, tua chậm, tiến một khung hình và kiểm tra điểm đánh. Sân thử dùng bản sao trạng thái riêng trong tab. Cài đặt VFX trong sân thử chỉ có hiệu lực cho phiên hiện tại.

## Tích hợp

- `TribulationSystem.ts` khóa tọa độ khi thiên kiếp bắt đầu. Nhật ký, cảnh báo, tia sét và va đập dùng cùng điểm này. Bản lưu cũ thiếu tọa độ dùng vị trí đang lưu của tu sĩ cho hiệu ứng.
- `WorldCultivation.js` gửi mốc va đập sau khi số đợt sét tăng. Vòng cảnh báo và tia dẫn được tính từ lần giáng kế tiếp. Renderer chỉ đọc trạng thái. Số đợt, thời gian, xác suất, sát thương và ngưỡng cảnh giới lấy từ hệ thống hiện hành.
- NPC trong vùng nguy hiểm dùng đường đi hợp lệ để tránh lôi. Tu sĩ và NPC can đảm đang rảnh có thể dừng ở vòng ngoài để quan sát.
- `TribulationVisualTimeline.js` giữ hình tia sét theo seed của lượt và đạo lôi. `TribulationVisuals.js` tái sử dụng đối tượng, chọn vùng nhìn và áp giới hạn 1, 2, 4 cụm ở mức thấp, trung bình, cao.
- `art/source/draw-tribulation.py` là nguồn chỉnh sửa cho hai atlas PNG và bốn âm WAV. Mây có sáu đường bao gốc và lớp điện sáng riêng. Atlas va đập có tám khung pixel.

## Kiểm chứng

Chrome headless, viewport 1584×955. Đo 132 khung liên tiếp tại Thanh Vân Tông, zoom 1,10×, khi thiên kiếp Trúc Cơ bắt đầu hội tụ. Bản trước đạt 54,63 FPS. Các lượt đo bản mới nằm trong khoảng 53,16–58,24 FPS. p95 đều là 16,8 ms. Các số trên là mẫu ngắn trên máy hiện tại. Ở sân thử 0,92×, cả hai phép đo mức cao và thấp đều gần 60 FPS. Mức cao hiển thị ba cụm trong bài thử. Mức thấp giữ một cụm nhìn thấy và tái sử dụng pool.

Trong lượt độ kiếp thật, cảnh báo giữ nguyên 207 HP. Đạo đầu giảm còn 188 HP ở cả hai bản. Sau kéo camera, đổi zoom và tải lại, điểm đánh vẫn là (3693, 4304) và bộ đếm vẫn là một đạo. Khi đưa điểm độ kiếp ra khỏi camera, đạo thứ hai vẫn giảm HP xuống 165. Sân thử xác nhận bốn âm đã tải và Web Audio thực sự phát tiếng gió, tích điện, va đập và dư điện ở các giai đoạn tương ứng. Kiểm thử tự động xác nhận số đợt, điểm cuối của sét và trạng thái kết thúc của cả bốn cấp. Kịch bản trình duyệt về tu luyện cũng xác nhận NPC lân cận ghi nhớ việc tránh lôi, tu sĩ vẫn ngồi thiền trong pha mây và hai lượt thành công nâng cảnh giới đúng.

Chạy lại với `node tests/tribulation-vfx-browser.mjs`. Thêm `--video` để xuất chuỗi khung hình từ Phaser. Ảnh WorldScene, ảnh từng pha, video và JSON đo nằm trong `art/previews/tribulation-vfx/`. Video dựng từ khung trình duyệt và ghép âm từ WAV của game.

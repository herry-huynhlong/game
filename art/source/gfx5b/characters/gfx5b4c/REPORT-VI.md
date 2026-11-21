# GFX.5B.4C-A — Nhật ký kiểm tra và bản thử

## Phạm vi

Tệp C01–C05 trong thư mục này được Aseprite CLI mở trực tiếp từ nguồn GFX.5B.4B, sửa các cel của layer `face`, `hair_back`, `hair_front` ở hướng chéo xuống trái rồi lưu thành bản mới; không dựng lại từ PNG. Bản thử chỉ phản chiếu lớp đầu để sửa hướng nhìn, chưa phải bản vẽ hoàn thiện. Phần thân, vai, tóc/đồ trang trí trên các layer khác và râu trưởng lão vẫn cần chỉnh ăn khớp; các bản này chỉ được tải trong showcase khi có tham số `gfx5b4c=1`, chưa thay nhân vật game chính.

## Đối chiếu kỹ thuật

- Canvas 32×40, 8 layer, 98 frame; atlas 256×520, 8 cột; gốc hiển thị 16×40 theo metadata của GFX.5B.4B.
- Thứ tự: xuống, xuống phải, phải, lên phải, lên, lên trái, trái, xuống trái.
- Idle: bốn frame/hướng, 240 ms/frame; riêng C05 300 ms/frame. Walk: sáu frame/hướng, 120 ms/frame.
- Script `verify_and_preview.py` kiểm tra 98 frame theo metadata xuất lại, kích thước PNG, và so sánh mọi frame trước/sau. Chỉ các frame 28–31 và 74–79 (chỉ số bắt đầu từ 0) khác nhau.
- Mỗi hướng walk có năm hình tổng hợp khác nhau trong sáu frame. Frame trùng cần đánh giá theo nhịp chuyển động, không xem bản thân sự trùng lặp là lỗi hoặc là chứng minh chuyển động mượt.
- `visualDirection` tính từ chuyển vị Arcade Physics, giữ hướng khi đứng yên và có ngưỡng 27 độ để giảm rung. Cần kiểm tra liên tục nhịp chân khi đổi hướng: chưa có bằng chứng ở tốc độ game.

## Cổng chất lượng

Chưa đạt GFX.5B.4C-A: cải thiện hình thể, vai, trang phục, chuyển động chân và kiểm thử NPC trong Phaser chưa hoàn tất. Không thay asset của NPC trong game chính, không sửa gameplay, không bắt đầu các bước kết nối hit/death/thiền mới. GIF đi bộ trong thư mục này là bản xuất kỹ thuật từ sprite sheet, không phải bằng chứng NPC di chuyển trong game.

## Đề xuất riêng cho đánh gục tạm thời — chưa kích hoạt

Cần người thiết kế quyết định điều kiện gây ngã dựa trên đòn và luật chiến đấu hiện có; không tự đặt xác suất hoặc thời gian. Nếu được duyệt, trạng thái phải thuộc dữ liệu gameplay của NPC, có điều kiện kết thúc và quy định rõ việc khóa di chuyển/hành động, khả năng nhận đòn khi nằm, tương tác combat và thứ tự ưu tiên tử vong. Quy định lưu/tải và trường hợp hết thời gian trong lúc game đóng phải được chốt trước; animation chỉ quan sát trạng thái, không tự hồi phục hoặc sinh loot.

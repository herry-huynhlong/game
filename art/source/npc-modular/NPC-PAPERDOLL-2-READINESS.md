# NPC.PAPERDOLL.2 — kiểm kê khả năng tạo roster 30 mẫu

## Kết luận hiện tại

**Chưa thể tạo 30 preset nghề nghiệp đạt yêu cầu mỹ thuật từ source hợp lệ hiện có.** Không tạo preset giả bằng cách đổi ID, đổi palette hoặc gán chức vụ cho một ảnh không phù hợp. Không ghi appearance mới vào 108 NPC, không chạm save/LocalStorage và không đổi WorldScene.

Số lượng đã có thể chứng minh bằng source:

- **3/30** bộ nhân vật nguồn C01, C02, C03 có đủ outfit base + head base + tóc trước/sau, 32 frame, bốn hướng idle/walk; mỗi bộ tự ghép lại pixel-exact.
- Showcase PAPERDOLL.1 đã chứng minh **3 cấu hình demo kỹ thuật** (C01 nguyên gốc, C01 đổi tóc C02, outfit/head C02 giữ tóc C01). Hai cấu hình chéo cần duyệt mỹ thuật và không được tính là mẫu nghề nghiệp đã nghiệm thu.
- **0/30** preset nghề nghiệp đã được duyệt hoặc gán vào roster.

Ba outfit base hiện tại chỉ cho ba ngôn ngữ hình thể/trang phục cơ bản. C01–C03 chưa có đủ bộ mặt tuổi/giới, giáp vệ binh, áo thường dân nữ, đồ lao động, áo trưởng lão/tông chủ, thương nhân hay tán tu như brief yêu cầu. Các sheet cho thấy nét mặt rất nhỏ ở 32×40; tổ hợp chéo có thể khớp frame nhưng không tự tạo ra silhouette hoặc thiết kế nghề nghiệp mới.

## Kiểm kê tài nguyên hiện có

| Nguồn | Số lượng | Có thể dùng làm preset paper doll? | Lý do |
|---|---:|---|---|
| Aseprite C01–C03 | 3 bộ; mỗi bộ 32 frame 32×40 | Có, ở mức kỹ thuật prototype | Layer tách được và ghép lại chính xác; ba thiết kế chưa đủ phủ 30 nghề/vai trò |
| Modular overlay cũ | 12 tóc, 10 mặt, 18 outfit, 10 phụ kiện | Không tính vào thư viện đạt | `generate-parts.mjs` dựng bằng pixel/line/rect theo công thức; overlay rất thưa và không thay sạch tóc/mặt/áo gốc. Đã bị đánh giá không đạt mỹ thuật trong `NPC-MODULAR-ART-1-REVIEW.md` |
| Sprite nhân vật runtime | 37 sheet nguyên nhân vật | Không tính là paper-doll component | Các sheet đã chứa đầu/tóc/y phục trong một sprite; không phải layer outfit/head/hair độc lập |
| Layer `details` C01–C03 | 3 lớp nguồn | Chưa tính phụ kiện | Chưa được phân loại; có thể chứa chi tiết trang phục, không an toàn để tráo như phụ kiện |
| Equipment | Renderer trang bị hiện hữu | Giữ ngoài paper doll | Không phát vũ khí mới cho preset |

Tổ hợp lý thuyết `3 outfit × 3 head × 3 hair = 27` chưa được tính là 27 preset: phần lớn lặp lại đúng ba kiểu áo, và các tổ hợp chéo chưa qua contact-sheet/duyệt mắt ở 1×. Tạo thêm ba ID bằng đổi màu hoặc đổi tên sẽ vi phạm tiêu chí khác biệt của người dùng.

## Cơ cấu yêu cầu chưa được phủ

Brief cần 30 ngoại hình cho 13 nhóm (dân thường, đệ tử, trưởng lão, tông chủ, thương nhân, tửu quán, vệ binh, thợ sửa, thợ săn, hái dược, thư lại, tán tu và thành chủ). Source hiện tại không có riêng silhouette/garment hợp lệ cho nhiều nhóm then chốt như vệ binh mặc giáp, dân thường nữ, trưởng lão cao tuổi, tông chủ, nhân viên phục vụ, thợ sửa, người hái thuốc, thư lại, áo choàng tán tu và thành chủ.

Vì chưa có 30 mẫu được duyệt, các điều kiện phụ thuộc vào nghiệm thu đó cũng chưa thực hiện: contact sheet 30 mẫu, ánh xạ đủ 30 preset vào roster 108 NPC, thử reload/AI/possession/combat cho migration mới, FPS đo tại khu đông NPC, cùng ảnh cảnh chợ/tông môn có roster mới.

## Bảo toàn

- Không chạy generator cũ để tạo thêm phần pixel-run.
- Không dùng component mỏng cũ như trang phục mới.
- Không thay đổi bất kỳ trường nào của 108 NPC, kể cả `visualParts` hiện có.
- Không tạo thêm NPC hoặc thay equipment.
- Showcase PAPERDOLL.1 tiếp tục chạy độc lập để xem ba source hiện có: `http://127.0.0.1:5173/npc-paperdoll-showcase.html`.

## Đầu vào cần để tiếp tục

Cần có source Aseprite có quyền chỉnh sửa cho các thiết kế còn thiếu (hoặc người dùng duyệt một bộ component chất lượng cao hơn), với hướng và frame phù hợp rig 32×40. Có thể gửi trước các bộ quan trọng nhất—ví dụ vệ binh có giáp, trưởng lão/tông chủ, dân thường nữ và một bộ tán tu—để xác nhận cách ghép. Khi nguồn đủ khác biệt, Codex có thể chuẩn hóa registry, anchors, preset ID ổn định theo NPC ID, contact sheet và sau đó mới cập nhật save/runtime bằng migration an toàn.

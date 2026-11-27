# Cửu Cảnh Thiên Uy

## Nguyên nhân và cách tái hiện

Ca Chrome dùng cùng một NPC Luyện Khí tầng 9, linh căn Kim, Ngự Kiếm Quyết bậc 3 và Thiết Mộc Kiếm. Mục tiêu là Phệ Sa Yêu Trùng thường, Kim Đan tầng 1. Hai nhân vật cách nhau 34 pixel, có đường đánh trống. Nhập thân qua hệ thống thật. Kịch bản thử đặt lại hồi chiêu giữa từng đòn và dừng đồng hồ để tách sát thương khỏi hồi phục hay yêu thú phản công.

Bản cũ lấy 122 HP gốc của loài rồi cộng 54 HP cho mỗi chỉ số cảnh giới, nên mục tiêu chỉ có 230 HP. Đòn Kiếm Khí dùng công kích 46,04 sau linh căn, công pháp và 3 điểm từ kiếm. Nhân 2,24 lần rồi làm tròn cho 103 công lực. Giáp 7 được trừ thẳng, để lại 96 sát thương. Ba đòn hạ mục tiêu. Bốn đòn thường lần lượt gây 37, 48, 64 và 37 sát thương, còn 44 HP. Mỗi đòn trong mẫu có một sự kiện sát thương. Lỗi tái hiện đến từ thang sinh lực, giáp phẳng và thiếu áp chế cảnh giới.

## Quy tắc đang chạy

- Chín cảnh giới, mỗi cảnh giới mười tầng. Cấp tổng là `10 × realmIndex + layer`. Tầng 1–3 là Sơ kỳ, 4–6 là Trung kỳ, 7–9 là Hậu kỳ và tầng 10 là Đại viên mãn.
- `4 ** (realmRank - 1) × (1 + 0.25 × (layer - 1))` nhân với HP 100, Công 20, Giáp 10 và Linh lực 100. Phàm nhân có chỉ số riêng ngoài thang 90 cấp.
- NPC tính thiên phú một lần, sau đó áp dụng linh căn, công pháp nền và phần thưởng vũ khí. Vũ khí Thiên cấp ở Luyện Khí chỉ phát huy 1% của **phần thưởng** vũ khí. Ví dụ thưởng gốc 85% còn tăng 0,85% công kích thực tế.
- Yêu thú dùng cùng nền cảnh giới. Phẩm chất độc lập với cảnh giới, hệ số loài được giới hạn riêng cho HP, công và giáp. Giữ tập tính và hoạt ảnh hiện có. Một số loài kháng thuộc tính theo cấu hình.
- Sát thương cơ bản sau giáp là `A² / (A + D)`. Áp chế khi đánh lên một, hai, ba, bốn đại cảnh giới lần lượt là 0,8, 0,35, 0,1, 0,03. Một bậc chênh lệch được nới theo mức tầng, tối đa 0,92 khi tầng 10 đánh tầng 1. Sau đó áp dụng kháng, hộ thuẫn và suy yếu. Đòn đang chạy dùng số thực.
- Một lần thi triển có ngân sách công lực. Mỗi impact sử dụng một phần ngân sách trước giáp. Hỏa kỹ chia phần cho đòn trực tiếp và nhịp cháy. Các kiếm ảnh và hiệu ứng thuần hiển thị không phát sinh sát thương. Các lộ trình NPC, nhập thân và yêu thú đi qua cùng hàm tính khi chạm mục tiêu.
- Võ kỹ kiểm tra công pháp đang vận chuyển, độ lĩnh ngộ, cảnh giới, linh lực và hồi chiêu. Tuyệt kỹ Địa/Thiên cấp ở bậc cuối còn kiểm tra linh căn. Chi phí linh lực có ngưỡng tuyệt đối và phần tăng theo cảnh giới.
- Công trình dùng kênh phá hoại riêng có trần theo phẩm cấp và độ bền vật liệu. Hộ thành và kho tông môn có hệ số bảo hộ. Phế tích, sổ vi phạm và quy trình sửa chữa tiếp tục hoạt động theo hệ thống hiện có.

## Migration và kinh tế

Version cân bằng nằm trong bản lưu WorldScene. NPC và yêu thú giữ tỷ lệ HP/Linh lực. Người đã chết giữ nguyên trạng thái. Tầng 9 thông thường vẫn là tầng 9 và giữ XP. Trường hợp đã có thiên kiếp hẹn hoặc đang diễn ra ở trần cũ được đưa sang tầng 10 để hoàn tất đúng phiên đang lưu. Một số projectile và vùng nguy hiểm cũ đang bay được bỏ khi nâng bản lưu vì lực đòn đã tính theo công thức cũ.

Linh thạch, số dư Thần lực, quyền sở hữu, item instance, độ bền và lịch sử tiếp tục sử dụng dữ liệu cũ. Migration không ghi thưởng. Sổ Thần lực lấy rank từ registry và thưởng tử vong bằng `rank × layer × 2`.

Hồi Xuân Đan có trần 85 HP và tối đa 35% HP mục tiêu. Điều trị tại Y Quán có trần theo dược liệu dùng. Hồi tự nhiên mặt đất đã tính theo tỷ lệ max HP và có thời gian nghỉ giao tranh. Giá hàng hóa, ngân sách nhiệm vụ và giá công pháp giữ mức hiện có. AI thợ săn đánh giá nguy hiểm theo cấp, thế trận và sức mình. Tổ đội đánh giá khả năng gây sát thương và trụ lại của từng thành viên.

Các năng lực như Nguyên thần xuất khiếu, thao túng hư không, pháp tắc thiên địa và phi thăng chưa có gameplay riêng trong đợt này. Ngự kiếm vẫn yêu cầu Trúc Cơ tầng 1 trở lên cùng điều kiện trang bị hiện có.

## Kiểm thử và bằng chứng

- `node tests/combat-balance.test.mjs --report` xuất 90 cấp và tám cặp đấu cơ bản.
- `npm run build`, `npm run test:systems`, `npm run validate:release -- --dist` kiểm tra production.
- `node tests/martial-browser.mjs --balance` ghi trận lệch cấp, trận đồng cấp, AI và bảng tính trong Chrome. Thêm `--skill` để thử Kiếm Khí hoặc `--natural` để chạy mô phỏng ba ngày. Đầu ra nằm trong `art/previews/cuu-canh-thien-uy/`.
- Mở [Combat Balance Lab](http://127.0.0.1:5183/combat-balance.html) để kiểm tra trực tiếp chỉ số, khóa kỹ năng, tác động đội hình và từng bước sát thương. Số đòn và thời gian là ước lượng trong điều kiện mọi đòn đều trúng, mục tiêu giữ nguyên giáp và không hồi HP.

## Kết quả mẫu Chrome

| Kịch bản | Trước | Sau |
| --- | --- | --- |
| Luyện Khí tầng 9 dùng Kiếm Khí lên Phệ Sa Yêu Trùng Kim Đan tầng 1 | 230 → 134 → 38 → 0 HP | 1.952 → 1.919,47 → 1.886,94 → 1.854,42 → 1.821,89 HP |
| Luyện Khí tầng 9 đánh thường cùng mục tiêu | Còn 44/230 HP sau bốn đòn | Còn khoảng 1.905/1.952 HP sau bốn đòn |
| Kim Đan tầng 1 đánh thường yêu thú Kim Đan tầng 1 trong ca thử | — | Hạ sau sáu đòn |
| AI thợ săn có cùng mục tiêu | — | Từ chối khi thấp hai đại cảnh giới. Cùng cấp, tick săn đánh trúng và ghi sát thương. |

Bảng đối chiếu chỉ số thuần cho kết quả Luyện Khí tầng 1 cần 720 đòn đánh Kim Đan tầng 1 trước áp chế, 2.058 đòn sau áp chế. Luyện Khí tầng 10 cần 86 và 244 đòn tương ứng. Đây là ca không trang bị, không hồi phục và không có chuyển động, dùng để xác nhận công thức.

Trong ca mô phỏng 108 cư dân từ ngày 1 lúc 08:00 đến ngày 4 cùng giờ, 108 người còn sống, 37 người từng nhận đòn và không có tổn thất HP công trình tại các mốc ghi. Sổ ghi 16 yêu thú bị hạ, 11 lượt nhặt chiến lợi phẩm, 22 lần tăng tiểu tầng và 150 Thần lực mới, gồm 22 từ tu luyện và 128 từ yêu thú. Có 26 cặp thợ săn–mục tiêu được quan sát. Tổ đội ghi 7 lần lập nhóm, 6 lần xuất hành, một cuộc săn có hạ mục tiêu, 3 lượt hoàn thành và 4 lượt thất bại trên mọi loại nhiệm vụ.

Ví cư dân tăng từ 0 đến 789 linh thạch trong cùng fixture. Đo chênh lệch ví theo tick cho 1.172 linh thạch vào và 383 ra. Các con số này gộp mọi nguồn biến động ví, gồm cá nhân kiếm tiền, chi dịch vụ và chuyển khoản. Cần chạy thêm seed hoặc lâu hơn để kết luận về cân bằng giá, tử vong và tỷ lệ thắng theo từng nghề.

Các clip MP4 dựng từ khung hình Chrome theo từng đòn. Khoảng cách thời gian trong clip được đặt đều để dễ so sánh thay đổi HP. Nhật ký JSON giữ HP trước và sau, định danh sự kiện cùng các bước tính của bản sau cân bằng.

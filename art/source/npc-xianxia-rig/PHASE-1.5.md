# Character Editor 1.5

Mở `/npc-xianxia-editor.html`. WASD hoặc phím mũi tên di chuyển trực tiếp, Shift chạy. Menu động tác và hướng dùng để xem tự động. Phần so sánh xem từng nhóm lựa chọn tại 2×. Bấm **Thử trong WorldScene** để dùng cấu hình đã chọn trên một đệ tử trong thế giới hiện tại. Khi nhập thân đệ tử này, renderer theo cùng tọa độ và chuyển động điều khiển bằng bàn phím. Kiếm và đao hiển thị trong WorldScene theo trang bị thật. Động tác tấn công và cần câu tiếp tục dùng renderer cũ. Chế độ thử là tùy chọn theo URL và không gắn ngoại hình vào dữ liệu roster.

## Kiến trúc

- `CharacterAppearance.js` định nghĩa JSON, kiểm tra tổ hợp và đọc cả JSON thời giai đoạn 1. Màu áo giờ có trường riêng `outfitColor`.
- `CharacterAnimationController.js` đồng bộ pha chân, tay, tóc và vạt theo quãng đường thực. Chân trụ lùi theo quãng đường trong một nửa chu kỳ. Chân chuyển bước nhấc lên ở nửa còn lại. Quay và đổi ngoại hình không khởi tạo lại timeline.
- `CharacterRenderer.js` lấy từng frame atlas theo profile và hướng. Vạt áo các bộ mới dùng frame lệch pixel đặt sẵn. Tọa độ sau khi cắt trong `variants-registry.json` phục hồi điểm neo gốc. `CharacterEquipment.js` xác định vị trí vũ khí theo tay. `CharacterAssetRegistry.js` nạp atlas chung.
- `WorldCharacterPreview.js` lấy vị trí, hướng, trạng thái đi/chạy, culling và vũ khí từ NPC thật của WorldScene. Atlas chỉ nạp khi mở chế độ thử.

## Tạo thêm tóc, áo hoặc dáng người

1. Tạo turnaround ba hướng trước, sau, nghiêng phải trên nền trong suốt, feet baseline nhất quán. Giữ tỷ lệ hình thể thật của thiết kế, căn vào lưới 64×96 chân tại y=93. Profile trái có thể phản chiếu nếu không sai vật trang trí bất đối xứng.
2. Thêm nguồn PNG vào `phase15/` và khai báo cấu trúc trong `tools/npc-xianxia-rig/export-phase15.py`. `MARKS` chứa mốc mắt, miệng, vai, tay và chân theo từng hướng. Chỉnh mặt nạ hoặc xuất lớp chỉnh tay tại các vùng cổ, vai và vạt bị che. Chạy `python tools/npc-xianxia-rig/export-phase15.py` để tạo lại atlas và điểm neo. Không ghi tay vào JSON atlas sinh tự động.
3. Tóc dùng khóa `hairFront/<style>/<color>` và `hairBack/<style>/<color>`. Giữ trán và điểm neo đầu ổn định trong mỗi hướng. Trang phục mới cần các lớp áo, tay, quần, giày và vạt phù hợp. Giữ hình bàn tay tại mốc ghi trong registry để kiếm và đao theo đúng cú vung tay.
4. Thêm ID thật vào `CharacterAppearance.js`, khai báo profile và bộ trang phục tương thích, cập nhật `rigFor` khi có rig mới. Test thay món lúc đang chạy, quay bốn hướng, lưu/tải và kiểm tra trong WorldScene.

## Nguồn và giới hạn

Năm turnaround mới được tạo qua imagegen tích hợp, theo prompt chung ba hướng trên cùng hàng, pixel art tiên hiệp, nền trong suốt. Mỗi biến thể có prompt riêng về tóc, cơ thể và kiểu cắt. PNG nguồn nằm trong `phase15/`. Script dùng mốc theo hướng, phân vùng pixel, bù lớp dưới vùng che và tạo atlas. Mắt, mày và biểu cảm là retouch pixel trên từng view. Tuổi và biểu cảm trong cùng một dáng là các biến thể từ khuôn mặt gốc. Một số chi tiết vẫn gắn vào áo hoặc tóc, ví dụ vòng hạt võ tăng. Chân, tay và tóc dùng pose ghép lớp, nên cần tiếp tục đánh giá độ mềm trên từng kiểu áo ở tốc độ thực. Chưa thực hiện animation chiến đấu mới hoặc thay toàn bộ roster.

## Kiểm thử

`npm run build`, `npm run test:systems`, `node scripts/validate-release.mjs --dist` và `node tests/npc-xianxia-editor-browser.mjs` với `GAME_TEST_ORIGIN=http://127.0.0.1:5183`. Bài kiểm tra Chrome chạy trên hồ sơ tạm và lưu ảnh A–G tại `art/previews/npc-xianxia-phase15/`. Dữ liệu cấu hình ví dụ kèm trong `phase15/example.json`.

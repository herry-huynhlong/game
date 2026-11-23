# Thanh Y Kiếm Khách · Character Editor

Mở `/npc-xianxia-editor.html` hoặc chọn **Chỉnh ngoại hình Thanh Y** trong gallery 12 mẫu. Sân thử dùng Phaser và tileset của game. Dùng WASD hoặc phím mũi tên, giữ Shift để chạy. Menu Động tác và Hướng phát hành trình thử tự động. Cấu hình lưu riêng trong trình duyệt và có thể nhập hoặc xuất JSON.

## Dữ liệu và animation

- Một dáng nam gầy và một khuôn mặt. Ba kiểu tóc, ba palette tóc, ba phối màu đạo bào trên cùng kiểu cắt, quần và ủng có hai palette, phụ kiện có thể bật/tắt. Kiếm và đao dùng sprite vũ khí có sẵn của game.
- Bốn hướng có 4 pose idle, 8 pose walk và 8 pose run. Chính diện, lưng và nghiêng phải xuất phát từ turnaround mới. Nghiêng trái phản chiếu hình thể, có frame vũ khí và điểm cầm riêng.
- Mỗi diễn viên có một timeline. Pose dịch các lớp theo điểm neo pixel. Đổi ngoại hình thay frame atlas trên cùng diễn viên và giữ thời điểm đang phát. Render dùng một atlas 176 frame chung. Atlas được tạo khi xuất asset, không sinh texture trong vòng cập nhật.
- Mắt, mày, mặt và phần thân có vùng pixel riêng trong mẫu. Hiệu ứng có vị trí lớp, chưa có asset hoặc animation chiến đấu. Mẫu chưa có thêm bộ mặt/dáng người và chưa tham gia mô phỏng NPC của WorldScene.

## Nguồn mỹ thuật

`turnaround.png` do imagegen tạo để dựng chính diện, lưng và nghiêng phải, dựa trên thiết kế Thanh Y Kiếm Khách từ gallery trước. `working-grid.png` là ảnh làm việc ở kích thước phóng. `tools/npc-xianxia-rig/export.py` chuẩn hóa lưới, dùng các mặt nạ tọa độ riêng theo hướng, bù vùng áo khuất và xuất atlas/phụ kiện. Đây là quy trình hybrid với pose dịch chuyển các bộ phận, chưa có tranh từng frame cho chuyển động tay chân. Hai mặt nghiêng cùng thiết kế quần áo. Không dùng ảnh PNG nguyên nhân vật để render.

```powershell
python tools/npc-xianxia-rig/export.py
npm run build
npm run preview -- --host 127.0.0.1 --port 5183
```

Kiểm thử Chrome `tests/npc-xianxia-editor-browser.mjs` chạy bằng `GAME_TEST_ORIGIN=http://127.0.0.1:5183`. Bằng chứng tại `art/previews/npc-xianxia-rig/`. Chế độ 60 NPC dùng để kiểm tra tải trong sân thử, không đại diện cho FPS của cả bản đồ WorldScene.

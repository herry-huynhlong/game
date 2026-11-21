# Thanh Vân Ký — Thiên Đạo Giám Thế

Thiết kế hiện tại là game mô phỏng thế giới tu tiên: người chơi quan sát và can thiệp với vai trò Thiên Đạo; NPC tự đi lại, tu luyện, giao dịch, tìm tài nguyên, nghỉ ngơi và phản ứng với yêu thú. Game chạy bằng Phaser 4, dùng lại bản đồ Tiled và pixel art sẵn có.

Save RPG gốc nằm ở localStorage key `thanh-van-ky-save-v1` và chỉ được đọc để tạo hồ sơ Vân Du lần đầu. Thế giới Thiên Đạo lưu riêng ở `thien-dao-world-v1`; hai save không ghi đè lẫn nhau. Bản đồ, combat, hệ thống tu luyện, linh căn, công pháp, nhiệm vụ và các asset gameplay RPG cũ vẫn được giữ trong mã nguồn.

World sim hiện tạo 26 NPC. Dùng WASD/mũi tên để di chuyển camera, cuộn chuột để zoom, nhấp NPC để xem và nhấp đúp hoặc bấm Theo dõi để bám theo. Tốc độ mô phỏng có x1/x2/x4 và tạm dừng. Quyền năng hoạt động hiện tại là đánh dấu, quan sát, theo dõi và ban 20 tu vi (tiêu hao 8 nguyên khí, tối đa 3 lần mỗi ngày thế giới).

NPC world save lưu thời gian, vị trí, nhu cầu, công pháp, linh căn, cảnh giới, tài sản, quan hệ, ký ức và sự kiện. Không có mô phỏng thời gian ngoại tuyến; thời gian chỉ chạy khi game đang mở và không tạm dừng.

Bộ đồ họa pixel art và bản đồ Tiled được sinh từ mã nguồn trong `art/source/generate_assets.py`; PNG là tài nguyên chạy trực tiếp. Pixelorama được cài để người dùng có thể mở/chỉnh PNG, nhưng các asset hiện tại không được vẽ bằng Pixelorama và chưa có file `.pxo` gốc.

## Chạy trên máy

1. Node.js LTS và npm đã được cài trên Windows.
2. Mở terminal tại thư mục `xianxia-mvp` và chạy `npm install`.
3. Chạy `npm run dev`, rồi mở địa chỉ Vite in ra trong terminal.

Trong terminal Codex, nếu Node đóng gói kèm Codex được ưu tiên trước Node hệ thống, chạy `./run-game.ps1` trong PowerShell. Script này gọi npm từ `C:\Program Files\nodejs`.

## Hệ thống RPG được bảo toàn

- Bản đồ cuộn camera với Thanh Vân Môn, truyền công các, linh điền, rừng yêu thú và thôn Trúc Khê.
- Di chuyển WASD hoặc phím mũi tên; giữ Shift để chạy (thanh thể lực), Space để né, J/chuột trái đánh thường, K phóng Kiếm Khí, L tu luyện, H dùng hồi nguyên đan, E nói chuyện.
- Arcade Physics cho nhân vật, va chạm cây/nhà và giới hạn bản đồ; yêu thú đuổi theo người chơi, gây sát thương và rơi linh thạch/tu vi.
- Nhiệm vụ ngoại môn, NPC Chấp sự Lý, túi đồ và chuỗi cảnh giới Luyện Khí → Trúc Cơ → Kim Đan → Nguyên Anh → Hóa Thần.
- Lưu tiến trình vào localStorage của trình duyệt.

## Nhân vật và chiến đấu

- Nguồn pixel art có thể tái sinh bằng `python art/source/generate_assets.py`; các frame nhân vật chính là 48×64 (được scale nearest-neighbor từ lưới pixel thủ công trong script). Bộ PNG hiện dùng Pillow, không được vẽ trong Pixelorama.
- Animation gồm idle/walk/run 4 hướng, ba nhịp chém 4 hướng, cast/hurt/death 4 hướng; Thanh Lang và Linh Thỏ có idle/walk/hit/death.
- Combat tách công thức sát thương và kiểm tra tầm/che khuất trong `src/systems/CombatSystem.ts`; animation và hiệu ứng nằm trong `src/systems/AnimationManager.ts`, `src/systems/EffectsManager.ts`; trạng thái, thanh máu và phản ứng quái nằm trong `src/entities/Enemy.ts`.
- Asset hiệu ứng nằm trong `public/assets/effects`: vòng chém, kiếm khí, tia trúng đòn và linh quang khi tiêu diệt.

## Giới hạn hiện tại

- Mô phỏng bắt đầu với 26 NPC; nhu cầu, hoạt động, lịch sinh hoạt và giao dịch là mô hình nhẹ, chưa phải kinh tế hoặc xã hội toàn diện.
- Mới có quyền năng Tiểu Phúc hoạt động. Các quyền năng khác và công bố Thiên Bảng mới có cấu trúc dữ liệu, chưa có giao diện sử dụng.
- Mô phỏng dừng khi game tạm dừng hoặc đóng; không cộng tiến trình ngoại tuyến.

## Công cụ nội dung

- Chỉnh/generate asset bằng `art/source/generate_assets.py`; có thể mở PNG trong Pixelorama để sửa thủ công. Chưa có file `.pxo` gốc.
- Dùng Tiled để chỉnh các map JSON trong `maps`; đặt tileset PNG đã xuất trong `public/assets/tilesets`.
- Thư mục `public/assets/characters`, `public/assets/tilesets`, `public/assets/ui` và `public/assets/effects` dành cho asset chạy trong game.

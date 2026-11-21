# NPC.PAPERDOLL.1 — kết quả demo kỹ thuật

## Kết luận

Mô hình hybrid dùng được với C01–C03 mà không cần body trần độc lập: outfit base là lớp thân/tay/chân/y phục hoàn chỉnh; `face` được giữ như một Head Base nguyên khối; hai layer tóc sau/trước có thể thay riêng; `details` vẫn là một layer nguồn độc lập nhưng chưa được phân loại là phụ kiện. Vũ khí tiếp tục đi qua renderer trang bị hiện hữu.

Khi ghép theo thứ tự `hair_back → outfitBase → headBase → hair_front → details`, mỗi bộ C01, C02, C03 tái tạo spritesheet gốc **pixel-exact trên cả 32 frame**. Cả ba có canvas 32×40, 4 hướng, 4 frame idle và 4 frame walk mỗi hướng, cùng placement/pivot. Điều này xác nhận việc tách layer không làm thủng hình gốc và không làm mất animation.

Phần đã xác nhận là kỹ thuật. C01–C03 chưa qua duyệt mỹ thuật; việc ghép chéo nguồn vẫn cần đánh giá của người dùng. Không thay NPC runtime hoặc tạo population mới.

## Phân tích layer nguồn

| Layer Aseprite | Vai trò trong hybrid | Có thể thay? | Giới hạn |
|---|---|---:|---|
| `shadow`, `legs`, `robe`, `arms` | `outfitBase` | Có, đổi cả base | Gắn liền nhau thành một bộ hoàn chỉnh |
| `face` | `headBase` | Có, đổi cả đầu | Chứa da và chi tiết mặt; không tách riêng nét mặt |
| `hair_back` | Tóc sau | Có | Cần thay cùng bộ frame tóc tương ứng |
| `hair_front` | Tóc trước | Có | Cần thay đồng bộ tóc sau |
| `details` | Chi tiết nguồn | Không đổi độc lập trong demo | Chưa phân biệt phụ kiện với chi tiết áo; luôn đi cùng outfit base |
| Vũ khí | Equipment renderer hiện có | Ngoài paper doll | Không tạo asset/vũ khí mới |

Không coi việc đặt tên role là chứng minh thẩm mỹ hoặc phân loại nội dung layer. Kết quả reconstruction chính xác kiểm tra được bằng `node tools/npc-modular/validate-paperdoll-sources.mjs`.

## Showcase

Mở `http://127.0.0.1:5173/npc-paperdoll-showcase.html` khi Vite đang chạy. Demo dùng Phaser trên spritesheet xuất trực tiếp từ Aseprite, không đọc/ghi localStorage và không nhập NPC vào game chính. Có thể chọn outfit base, head base, tóc, hướng, idle/walk, frame và zoom 1×/2×/4×. Layer `details` được giữ đi cùng outfit, không đổi riêng.

- Mẫu A: C01 nguyên gốc.
- Mẫu B: chỉ thay tóc C01 → C02.
- Mẫu C: đổi outfit/head sang C02 và giữ tóc C01.

Ảnh Phaser đã chụp ở `paperdoll-a.png`, `paperdoll-b.png`, `paperdoll-c.png`; `paperdoll-directions.png` đối chiếu idle/walk bốn hướng. GIF minh họa hai biến thể tóc khi đi bộ: `paperdoll-hair-swap-walk.gif`.

## Asset và tái xuất

- Editable masters: `art/source/gfx5b/characters/C01.aseprite` đến `C03.aseprite`; file gốc không bị sửa.
- Reproducible Aseprite exports: `node tools/npc-modular/export-paperdoll-parts.mjs`.
- Lab spritesheets/metadata: `public/assets/npc-paperdoll-lab/`.
- Catalog: `art/source/npc-modular/paperdoll-catalog-v1.json`.
- Cấu hình mẫu và schema: `art/source/npc-modular/paperdoll-demo-compositions-v1.json`, `art/source/npc-modular/paperdoll-config-schema-v1.json`.
- Kiểm tra cấu hình: `node tools/npc-modular/validate-paperdoll-compositions.mjs`.

## Chưa đạt / chưa xác minh

- Mỹ thuật C01–C03 chưa được phê duyệt.
- Khuôn mặt chỉ đổi theo Head Base đầy đủ; chưa có face details modular.
- `details` chưa được phân loại thành accessory thật.
- GIF walk đối chiếu tóc C01/C02 đã tạo để xem nhanh; đánh giá cuối vẫn nên thực hiện trong showcase Phaser.
- Chưa thay đổi 108 NPC, save, AI, combat, collision, hoặc WorldScene.

## Kết quả chạy

- `node tools/npc-modular/validate-paperdoll-sources.mjs`: pass; ba source khôi phục pixel-exact đủ 32 frame.
- `node tools/npc-modular/validate-paperdoll-compositions.mjs`: pass; ba cấu hình hợp lệ trên 15 thành phần xuất được.
- `npm run build`: pass (Vite có cảnh báo chunk Phaser lớn hơn 500 kB, không phải lỗi).
- `npm run test:systems`: pass toàn bộ các system test hiện có.

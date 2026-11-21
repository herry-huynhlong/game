# Bộ pixel art NPC lắp ghép

Bộ nguồn được tạo bằng Aseprite CLI thông qua Pixel Bridge tại `tools/codex-pixel-bridge/bridge.mjs`.
Không dùng ảnh AI, ảnh chụp hoặc thư viện sprite bên ngoài.

## Thành phần

- 12 kiểu tóc
- 10 kiểu mặt
- 16 y phục nghề nghiệp và 2 bộ riêng cho Thành chủ/Tông chủ
- 10 phụ kiện
- Mỗi thiết kế có 12 frame: 4 hướng (`down`, `up`, `left`, `right`) × idle/2 pha bước đi
- Canvas frame 32×40 px; mỗi project Aseprite chứa tối đa 4 thiết kế cùng loại và giữ các layer nguồn riêng

File `.aseprite` nằm trong `source/`; mô tả pixel từng frame để tái sinh nằm trong `specs/`.
Ảnh runtime và `manifest.json` được đặt tại `public/assets/npc-modular/`.

## Sinh lại asset

Từ thư mục gốc dự án chạy:

```powershell
node tools/npc-modular/generate-parts.mjs
```

Có thể đặt biến môi trường `ASEPRITE_EXE` để chỉ executable Aseprite khác. Bộ sinh gọi Aseprite CLI qua bridge hiện có.

## Hiển thị và lưu

`visualParts` chỉ chứa ID ngoại hình ổn định theo NPC ID. Trường gameplay cũ `appearance` và các chỉ số NPC được giữ nguyên. Runtime vẽ lớp lên sprite thân hiện có; lớp phụ kiện/vũ khí vẫn theo thứ tự riêng của scene. Hitbox và collision vẫn thuộc sprite thân.

Trang xem trước tương tác: `/npc-modular-showcase.html`. Các thay đổi ở trang này chỉ ảnh hưởng bản xem trước và không ghi save.

Đây là bộ khung modular 4 hướng/idle-walk. Các hướng chéo, animation chiến đấu riêng cho từng bộ phận và tinh chỉnh pixel theo từng body chưa thuộc phạm vi của đợt này.

## Hybrid Paper Doll từ source C01–C03

Phòng lab mới `/npc-paperdoll-showcase.html` dùng các layer thật trong `art/source/gfx5b/characters/C01–C03.aseprite`: outfit base, head base nguyên khối, tóc sau/trước và chi tiết nguồn. Xem [NPC-PAPERDOLL-1-REPORT.md](NPC-PAPERDOLL-1-REPORT.md) và `paperdoll-catalog-v1.json`. Xuất lại bằng `node tools/npc-modular/export-paperdoll-parts.mjs`; kiểm chứng ghép lại bằng `node tools/npc-modular/validate-paperdoll-sources.mjs`. Đây chỉ là lab kỹ thuật; không đổi roster hoặc save, và C01–C03 chưa được duyệt mỹ thuật.

# NPC.PAPERDOLL.3 — kết quả triển khai

## Đã làm

- Tạo registry 24 preset P01–P24 từ layer Aseprite gốc C01–C03. Mỗi preset xuất thành một sheet 128×320, gồm 32 frame 32×40, bốn hướng và idle/walk.
- Chín cấu hình dùng tổ hợp layer nguồn. Mười lăm cấu hình bổ sung palette trang phục được ánh xạ theo pixel, giữ màu da và hình thể; không thêm vũ khí hay thay dữ liệu sở hữu trang bị.
- Contact sheet được render từ PNG runtime tại 1×, 2×, 4× cho trước, sau, ngang và một frame walk.
- Showcase Phaser có chọn hướng/chuyển động/zoom và liệt kê component từng preset.
- WorldScene bật bằng `?paperDoll=1`. Gán preset ổn định theo NPC ID và vai trò; 108 NPC dùng đủ 24 preset. P09 được cấp cho tông chủ, P24 cho NPC có `authorityRole=city_master`. Mặc định không có query thì dùng sprite cũ.
- Preview dùng storage adapter chỉ đọc và không lưu preset lên NPC. Ảnh chụp kiểm tra cho thấy save không đổi trong phiên preview; dữ liệu roster, AI và trang bị vẫn do hệ thống hiện tại quản lý.
- Build production hiện cần map runtime trong `dist/maps`; Vite giờ copy map Tiled nguồn vào đúng vị trí khi build.

## Chất lượng và giới hạn

24 file PNG có nội dung pixel khác nhau và đều được load trong Phaser. Tuy vậy, đây **chưa phải 24 thiết kế nhân vật nghề nghiệp**: chín mẫu đầu tái dùng ba outfit/head/hair gốc; 15 mẫu còn lại phân biệt thêm bằng palette trang phục. Contact sheet cho thấy dễ nhận màu hơn nhưng nhiều silhouette vẫn giống nhau.

Chưa có component riêng cho nữ, tóc bạc, nón nông dân/văn chức, giáp vệ binh, tạp dề, túi nghề hay áo bào riêng cho trưởng lão/thành chủ. Vì vậy các tên vai trò là mục tiêu phân phối, không chứng nhận ngoại hình đã đúng nghề. Tất cả 24 mẫu còn ở trạng thái nháp mỹ thuật, chưa được người dùng duyệt.

## Bằng chứng và file

- Registry/source config: `art/source/npc-modular/paperdoll-presets-v1.json`
- Mapping 108 NPC trong lần chạy browser: `art/source/npc-modular/paperdoll-presets-v1-world-mapping.json`
- Runtime manifest: `public/assets/npc-paperdoll-lab/presets/registry.json`
- Contact sheets: `art/source/npc-modular/paperdoll-presets-preview/paperdoll-24-{front,back,side,walk}-{1x,2x,4x}.png`
- Browser showcase: `art/source/npc-modular/paperdoll-presets-preview/showcase-browser.png`
- WorldScene market view: `art/source/npc-modular/paperdoll-presets-preview/worldscene-market.png`
- Generator/validator: `tools/npc-modular/build-paperdoll-presets.mjs`, `tools/npc-modular/validate-paperdoll-presets.mjs`

## Kiểm tra

- Validator: 24/24 PNG tồn tại, mỗi ảnh 32 frame, 24 hash pixel khác nhau.
- Browser: WorldScene báo 108 NPC, 24 preset khác nhau, không lỗi console; P09 và P24 được gán cho chức vụ tương ứng.
- Save: so sánh localStorage trước/sau trong preview không đổi; preview được thiết kế chỉ đọc.
- `npm run build`: thành công. Vite có cảnh báo chunk Phaser lớn hơn 500 kB.
- `npm run test:systems`: toàn bộ system tests hiện có đạt. Build cuối sau chỉnh sửa nhỏ phần báo cáo preset cũng thành công.
- FPS mẫu trong browser headless tại 1320×1050, zoom 0.95: khoảng 36.5 FPS (frame trung bình khoảng 26.4 ms). Đây là số đo của môi trường kiểm tra, không phải cam kết FPS máy người dùng.

## Mở preview

- Showcase: `http://127.0.0.1:5175/npc-paperdoll-presets.html`
- WorldScene với Paper Doll: `http://127.0.0.1:5175/?paperDoll=1&region=city`
- WorldScene sprite cũ: `http://127.0.0.1:5175/?region=city`

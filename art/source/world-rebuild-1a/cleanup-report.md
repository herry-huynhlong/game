# WORLD.REBUILD.1-A — Báo cáo dọn runtime

Ngày: 2026-11-18
Dự án: `D:\anh\game\xianxia-mvp`

## Phạm vi đã làm

- Đổi entrypoint trong `index.html` sang `src/world-rebuild.js`; HTML runtime không còn mount UI cũ.
- Runtime hiện chỉ hiển thị trạng thái dựng lại, không khởi tạo Phaser, `WorldScene`, Tiled, tile texture, cây/nhà/đá placeholder hoặc entity NPC.
- Ba khu vực mục tiêu được ghi rõ là chưa có map mới; số NPC mới hoạt động là 0. Manifest 109 người chưa được tích hợp trong A.
- Gameplay modules được giữ nguyên trong source để tiếp tục nối sau; chưa viết lại AI, combat, tu luyện, economy, quest, collision, pathfinding hay save serializer.
- Asset Aseprite source và PNG hiện hữu được giữ nguyên. Chưa có asset nào bị xóa.

## Save migration an toàn

`src/world-rebuild.js` sao chép nguyên văn các khóa `thanh-van-ky-save-v1`, `thien-dao-world-v1` và `thien-dao-world-devtest-v1` vào `thanh-van-legacy-world-archive-v1`. Không xóa các khóa nguồn và runtime mới không đọc/khôi phục chúng. Archive một lần, có tính idempotent. Save mới dự kiến dùng namespace `thien-dao-world-v2` khi world mới được triển khai.

## Khảo sát và bảo toàn

- Thư mục dự án không phải Git repository, vì vậy không thể dùng trạng thái Git để phân biệt thay đổi đã commit.
- Tạo checkpoint trước khi sửa tại `D:\anh\game\_checkpoints\xianxia-mvp-WORLD-REBUILD-1-2026-11-18` (robocopy `/E`, loại `node_modules` và `dist`); source count và checkpoint count đều 4,955.
- Bản đồ cũ Tiled, asset runtime, WorldScene, NPC generators/roster và gameplay sources vẫn có trong repository nhưng đã bị ngắt khỏi active root runtime. Chưa xóa file vật lý hay sửa các nhánh fallback cũ trong source.
- Các source `.aseprite` và asset Pixel Art đang đánh giá được giữ lại; chúng chưa được đưa vào world runtime mới.

## Kiểm chứng

- `npm run build`: thành công; Vite báo cảnh báo bundle Phaser lớn do các trang preview riêng vẫn được build.
- `npm run test:systems`: toàn bộ system tests hiện có và test WORLD.REBUILD.1-A đều pass.
- Browser kiểm tra bằng Chrome headless trên Vite `127.0.0.1:5175`: 0 canvas; không tải `.tmj` hoặc `.png`; không có lỗi JS; trạng thái archive và các save nguồn không đổi sau reload; legacy saves không được khôi phục thành gameplay.
- Browser test dùng profile tạm riêng; không sửa profile Chrome thật của người dùng.
- Screenshot: `art/previews/world-rebuild-1a/world-rebuild-status.png`; dữ liệu kiểm tra: `art/previews/world-rebuild-1a/verification.json`.

## Chưa làm trong A

- Chưa dựng/load ba map Tiled mới; chưa có cư dân mới nào active.
- Chưa xóa vật lý các map, placeholder spawn code hoặc NPC legacy khỏi source/repository. Việc đã hoàn thành là loại chúng khỏi runtime root và chặn phục hồi save legacy. Giữ source cũ trong checkpoint/repository giúp tránh xóa nhầm hệ thống phụ thuộc trước khi world mới thay thế được xác minh.
- Chưa kiểm chứng AI/collision/pathfinding/combat trong world mới vì world mới chưa tồn tại trong runtime.

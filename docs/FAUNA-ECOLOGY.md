# Tây Hoang — Lãnh địa và tập tính yêu thú

Tây Hoang có 14 tiểu sinh cảnh dành cho 11 loài. Tiled lưu các ranh giới trong lớp `FaunaTerritories`. Mỗi ô xác định loài, sức chứa, phạm vi phát hiện, bán kính di chuyển, giới hạn truy đuổi, thời gian hồi sinh và các điểm nghỉ. Tổng giới hạn là 18 yêu thú Tây Hoang cộng 32 ở vùng cũ. Thành, ngoại thành Nam và tông môn giữ vùng an toàn hiện có.

| Loài | Lãnh địa |
| --- | --- |
| Thanh Ảnh Lang | Thanh Lang Cốc |
| Xích Giáp Sơn Trư | Xích Nham Sơn |
| Bích Độc Thiềm | Bích Độc Trạch |
| Phệ Linh Yêu Hoa | Phệ Linh Hoa Hải |
| Hắc Giáp Ngô Công | Bách Túc Độc Cốc |
| Thanh Mộc Yêu | Thanh Mộc Lâm |
| Thiên Niên Thụ Yêu | Thiên Niên Cổ Lâm |
| Huyết Đằng Yêu | Huyết Đằng Cốc |
| Thanh Lân Yêu Mãng | Thanh Xà Uyên |
| Ngọc Giác Linh Lộc | Ngọc Linh Cốc |
| Vạn Niên Mộc Hoàng | Vạn Mộc Cấm Địa |

`src/dao/MonsterRegistry.ts` liệt kê 45 kỹ năng theo đặc tả và đòn húc cơ bản được giữ lại cho Sơn Trư. Bài kiểm thử hệ thống chạy các giai đoạn ra đòn của cả 46 kỹ năng, cùng các kịch bản về triệu hồi, sát thương, khống chế, nhặt loot và tải save cũ. Bài Chrome kiểm tra WorldScene qua build production với seed cố định. NPC nhập thân được đặt vào điểm hợp lệ bằng test fixture, còn phát hiện, di chuyển, cắm rễ, ghi trạng thái và tạo loot chạy qua hệ thống game.

## Tệp theo chức năng

- Bản đồ và trình sinh Tiled: `maps/world-rebuild-1b.tmj`, `tools/west-wilds/build-map.mjs`.
- Sinh và hồi sinh, AI, trạng thái, kỹ năng: `src/dao/FaunaSystem.ts`, `MonsterCombat.ts`, `MonsterConditions.ts`, `MonsterRegistry.ts`, `types.ts`.
- Ranh giới, di chuyển, đồ họa và tích hợp: `src/world/FaunaHabitat.js`, `FaunaHabitat.d.ts`, `MonsterMovement.js`, `MonsterVisuals.js`, `WorldNameplates.js`, `src/world-rebuild-scene.js`.
- Nguồn pixel art: `art/source/west-wilds/draw-ecology.py`, `draw-van-linh.py`. Sprite sheet `public/assets/west-wilds/flower-forms.png` có 64 frame, gồm đứng yên, thức tỉnh, nhổ rễ và cắm rễ. `habitat-accents.png` dùng cho trang trí lãnh địa. Sprite hoa di động, dây leo và linh lộc cũng được cập nhật.
- Kiểm chứng: `tests/monster-fauna-1.test.mjs`, `tests/fauna-ecology-browser.mjs`, `scripts/validate-release.mjs`.

## Kiểm thử lại

1. Chạy `npm run build`, `npm run test:systems` và `npm run validate:release -- --dist`.
2. Chạy `npm run preview -- --host 127.0.0.1 --port 5183 --strictPort`.
3. Trong terminal khác, chạy `node tests/fauna-ecology-browser.mjs`. Ảnh và JSON ghi vào `art/previews/fauna-ecology/`.

Chrome đã kiểm tra 50 cá thể trong giới hạn, tuyến vào vùng độc, camera đi qua khi hoa cắm rễ, NPC đánh thức hoa, hủy thức tỉnh khi NPC rời đi, cập nhật đồng hồ theo Dừng/×1/×2/×4, tải lại đúng giữa chuyển dạng, di chuyển bằng hệ thống va chạm, cắm rễ và hồi sinh. Trường hợp hoa bị kẹt đường có bài kiểm thử hệ thống. Kịch bản ghi nhận một phần thưởng nhụy hoa và hoa mới trở lại đúng sau 75 giây mô phỏng.

Các tập tính nghỉ, bới đất và gặm cỏ hiện dùng điểm môi trường và hoạt ảnh. Chưa có chu trình đói, khát hoặc săn con mồi độc lập. Các kỹ năng dùng chung nhóm hiệu ứng theo cơ chế và thuộc tính. Chưa quay kiểm chứng từng kỹ năng trong Chrome hoặc đo FPS riêng. Repository chưa cấu hình lệnh lint.

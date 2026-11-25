# Tây Hoang — Phân bố yêu thú và thiên tài địa bảo

[Mở Hắc Vụ Độc Lâm trong bản local](http://127.0.0.1:5183/?region=west-poison). Nhấn **F3** để bật Sinh thái, chọn **Toàn cảnh Tây Hoang** để xem các điểm sinh, vòng tuần tra, ranh giới lãnh địa và đường nối từ linh dược đến yêu thú bảo hộ. Nút **Phệ Linh Yêu Hoa** đưa camera đến một cá thể đang sống. Khi nhập thân, đứng trong phạm vi 32 px có đường nhìn tới cây đủ tuổi rồi nhấn **E**.

| Từ Đông sang Tây | Yêu thú Tây Hoang | Cảnh giới khi sinh | Tinh Anh |
| --- | ---: | --- | ---: |
| Thanh Mộc Ngoại Lâm | 10 | Luyện Khí | 0 |
| Vạn Thú Nội Lâm | 10 | Trúc Cơ | 1 |
| Hắc Vụ Độc Lâm | 10 | Kim Đan sơ kỳ | 1 |
| Thái Cổ Thâm Lâm | 8 | Kim Đan trung và hậu kỳ | 2 |
| Tây Hoang Cấm Địa | 7 | Nguyên Anh, có Vạn Niên Mộc Hoàng | 3 |

Tiled đặt 20 tiểu sinh cảnh cho 11 loài. WorldScene dùng X âm cho phần bản đồ mở rộng ở phía Tây. Mỗi lãnh địa chia lưới lấy mẫu theo seed và ưu tiên điểm xa các điểm sinh đã cấp. Các vị trí Tây Hoang cách nhau ít nhất 100 px khi sinh. Một số cá thể đầu tiên ưu tiên đường mòn hoặc bờ hồ. Hắc Vụ Độc Lâm có ba Phệ Linh Yêu Hoa cùng cụm hoa tím trang trí. Collision kiểm tra toàn bộ footprint của quái; phạm vi di chuyển và truy đuổi xuất phát từ home của từng cá thể. Giới hạn toàn bản đồ là 77, gồm 32 vị trí ở vùng cũ. Các cá thể Tây Hoang đã lưu giữ ID và cảnh giới khi chuyển dữ liệu sang ranh giới mới.

## Thiên tài địa bảo

- **Phổ thông** — Mộc Linh Quả, Thanh Linh Thảo, Ngưng Linh Hoa.
- **Ít gặp** — Hỏa Linh Quả, Bách Niên Linh Sâm.
- **Hiếm** — Tử U Độc Hoa, Dưỡng Hồn Thảo, Kim Linh Quả, Huyền Âm Thảo.
- **Cực hiếm** — Lôi Linh Quả, Hàn Băng Tuyết Liên, Thiên Niên Linh Sâm.
- **Thiên phẩm** — Vạn Niên Linh Chi, Long Huyết Quả, Thần Mộc Chi Quả.

Thanh Linh Thảo và Lôi Linh Quả tái sử dụng item ID của túi đồ cũ. Mỗi loại có sprite và thuộc tính riêng. Cấu hình bảo hộ tăng dần từ 35% đến 90%, với 65% tại phẩm Hiếm. Nếu thiếu vị trí bảo hộ phù hợp, cây thử mọc tại một điểm tự nhiên cùng sinh cảnh. Save giữ vị trí, tuổi mô phỏng, chu kỳ, người đã hái và kiểu bảo hộ. Sau thời gian tái sinh, cây chọn điểm mới cùng sinh cảnh và phát triển từ mầm. Thu hái ghi cây, túi đồ và nhật ký trong một lần lưu. Nếu SaveGuard từ chối ghi, phiên chơi hoàn tác cả ba thay đổi.

NPC đi ngang cảm nhận cây trong phạm vi cục bộ và cân nhắc đường nhìn, giá trị, phẩm cấp, khoảng cách, sinh lực, linh lực, cảnh giới và tính cách. NPC có thể chờ, thử tiếp cận, đánh yêu thú bảo hộ, thu hái hoặc rút lui. Người nhập thân có thể hái khi yêu thú còn sống. Dược liệu dùng túi đồ và cửa hàng hiện có. Bách Thảo Đường và Bảo Các có thể tiêu nguyên liệu đã nhập kho để bổ sung đan trong danh mục của cửa hàng.

## Tệp và kiểm chứng

- Bản đồ, cảnh quan và điểm lấy mẫu: `tools/west-wilds/build-map.mjs`, `maps/world-rebuild-1b.tmj`.
- Spawn, hồi sinh, lãnh địa và tầm tuần tra: `src/dao/FaunaSystem.ts`, `src/dao/MonsterCombat.ts`, `src/dao/types.ts`.
- Vòng đời và AI thu hái: `src/dao/WestTreasureCatalog.ts`, `src/dao/WestTreasureSystem.ts`, `src/dao/WorldRebuildProfessionSystem.ts`, `src/world/WestTreasures.js`, `src/world-rebuild-scene.js`, `src/world/WestWilds.js`, `src/world/SectCampus.js`.
- Vật phẩm, luyện đan và đồ họa: `src/dao/ItemCatalog.ts`, `src/dao/ItemIconFrames.json`, `src/dao/SettlementSystem.ts`, `src/world/WorldMerchants.js`, `art/source/west-wilds/draw-treasures.py`, `art/source/draw-item-icons.py`, `public/assets/west-wilds/treasures.png`, `public/assets/items/inventory-icons.png`.
- Kiểm thử: `tests/monster-fauna-1.test.mjs`, `tests/west-treasures-browser.mjs`, `tests/fauna-ecology-browser.mjs`, `tests/van-linh-browser.mjs`, `tests/west-wilds-browser.mjs` và `scripts/validate-release.mjs`.

Chạy `npm run build`, `npm run test:systems`, `npm run validate:release -- --dist`. Với bản production đang phục vụ ở cổng 5183, chạy `node tests/west-treasures-browser.mjs` và `node tests/fauna-ecology-browser.mjs`. Bài thu hái đặt NPC gần địa điểm bằng dữ liệu kiểm thử rồi dùng thanh thời gian, di chuyển, phím E, combat và save thật của WorldScene. Bài đo hiệu năng dùng cùng seed, camera 1600 × 1050, zoom 0,35 và 180 khung hình trong Chrome headless. Kết quả ở `art/previews/west-treasures/` và `art/previews/fauna-ecology/`.

Seed Chrome có 30 cây, gồm 21 có bảo hộ và 9 mọc tự nhiên. NPC tự đi 46 px để hái, NPC mạnh gây sát thương lên yêu thú bảo hộ và NPC yếu chọn rút lui. Hai lần bấm E và tải lại chỉ ghi nhận một Lôi Linh Quả. Cây sau tái sinh cách vị trí cũ khoảng 85 px. Bách Thảo Đường tiêu một Thiên Niên Linh Sâm và bổ sung hai Hồi Xuân Đan. Mẫu hiệu năng ngắn đạt 60,0 FPS trước và sau khi tăng từ 50 lên 77 yêu thú, p95 cùng 16,8 ms. Repository chưa cấu hình lint riêng.

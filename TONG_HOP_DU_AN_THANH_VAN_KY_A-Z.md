# Thanh Vân Ký — Tổng hợp dự án từ A đến Z

> Tài liệu gộp yêu cầu đã gửi qua các phần, định hướng hiện tại, tình trạng dự án và phần WORLD.1A vừa hoàn tất. **Yêu cầu** và **kết quả đã kiểm chứng** được ghi riêng để tránh nhầm lẫn.

**Dự án:** `D:\anh\game\xianxia-mvp`  
**Tên/định hướng hiện tại:** *Thanh Vân Ký — Thiên Đạo Giám Thế*  
**Nền tảng:** Game web 2D dùng Phaser 4.2.1, TypeScript, Vite, Node.js/npm, bản đồ Tiled và lưu cục bộ trong trình duyệt.

## 1. Tầm nhìn

Dự án bắt đầu với ý tưởng RPG thế giới mở tu tiên: nhân vật di chuyển, chiến đấu, tu luyện, nhận nhiệm vụ và khám phá. Sau đó thiết kế gốc được đổi thành **mô phỏng thế giới tu tiên dưới góc nhìn Thiên Đạo**. Đây là định hướng chính hiện nay: người chơi quan sát thế giới đang vận hành, can thiệp có giới hạn, còn NPC tự sinh hoạt, tu luyện, giao dịch, kết giao và tranh đoạt tài nguyên.

Các hệ thống RPG ban đầu được yêu cầu bảo toàn; đổi góc nhìn không đồng nghĩa xóa gameplay cũ. Save RPG và save mô phỏng Thiên Đạo phải tách biệt để không ghi đè lẫn nhau.

## 2. Nguyên tắc thiết kế

- NPC phải tự vận hành khi người chơi quan sát; hành vi quan trọng cần có điều kiện, đường đi, tài nguyên tiêu hao và kết quả lưu được.
- Không dịch chuyển NPC để giả lập hành động; tuân thủ bản đồ Tiled, pathfinding và collision.
- Không tự sinh nhiệm vụ, tài sản, quan hệ, sự kiện hoặc phần thưởng không có nguồn.
- Linh thạch, vật phẩm và kho phải có nguồn/giao dịch; chống số dư âm, xử lý lặp và nhân bản sau reload.
- Thiên Đạo can thiệp tạo nhân quả. NPC có ý chí, có thể cân nhắc hoặc từ chối; tri thức và quan hệ chỉ thay đổi khi có căn cứ.
- Không làm hỏng tính năng cũ. Ưu tiên module chuyên trách, migration save tương thích và test hồi quy.
- Chỉ triển khai đúng phạm vi phần đang làm; không tự chuyển sang phần kế tiếp.

## 3. Thế giới và mỹ thuật

### Yêu cầu đã gửi

- Tiên hiệp Trung Hoa cổ đại, top-down 2D, pixel art sắc nét; bảng màu xanh ngọc, vàng đất, nâu gỗ và thiên nhiên.
- Có Thanh Vân Tông, Thanh Vân Thành/Thanh Vân Thôn, sân luyện công, rừng yêu thú, khu dân cư và điểm hoạt động.
- Tileset/công trình phải ghép được trong Tiled/Phaser, có layer nền, trang trí, collision và vùng hoạt động. Không đặt ảnh concept làm background phẳng toàn bản đồ.
- Thành thị cần cổng/tường đá, mái ngói, nhà có cửa/cửa sổ, phố chợ, quảng trường, cây, đèn lồng và đường lát có bố cục.
- Ảnh người dùng gửi là mẫu mỹ thuật; không tuyên bố asset do Pixelorama vẽ nếu thực tế tạo bằng script.
- File nguồn trong `art/source/`, map Tiled trong `maps/`, asset runtime trong `public/assets/`.

### Tình trạng hiện tại theo mã nguồn/README

- Có bản đồ Tiled và asset pixel art runtime cho địa hình, công trình, nhân vật, hiệu ứng và môi trường; GFX.3B/3C đã đại tu một phần Thanh Vân Thành với sprite và collision riêng.
- Có nhân vật chính, Thanh Lang, Linh Thỏ; README mô tả animation idle/walk/run/attack/cast/hurt/death và hệ thống combat.
- Có camera kéo thả, zoom, theo dõi nhân vật/NPC và giới hạn bản đồ.
- Nhiều asset hiện được sinh bằng Python/Pillow/script. Pixelorama đã cài để chỉnh thủ công; các asset script không phải tranh Pixelorama và không có file `.pxo` gốc nếu chưa được tạo riêng.

## 4. Nhân vật, chiến đấu và tu luyện RPG

### Yêu cầu ban đầu và Phần 2–3

- Nhân vật tu sĩ trẻ mặc đạo bào xanh trắng viền vàng, tóc búi, kiếm và bóng chân; sprite ưu tiên 48×48 hoặc 64×64, hợp mỹ thuật bản đồ.
- Idle/walk/run bốn hướng; chém kiếm bốn hướng, kiếm khí, hurt, death. Chuyển động phải đọc rõ, tránh trượt chân.
- Điều khiển: WASD/mũi tên di chuyển, Shift chạy, J/chuột trái đánh, K kiếm khí, Space né, E tương tác; giữ chức năng cũ và tránh xung đột phím.
- Combat có combo, hitbox theo frame tấn công, cooldown, sát thương tách khỏi hiển thị, phản hồi trúng đòn và hiệu ứng pixel art.
- Thanh Lang tuần tra/phát hiện/đuổi/tấn công/bỏ đuổi; Linh Thỏ bỏ chạy. AI tôn trọng collision.
- Tu luyện: **Luyện Khí → Trúc Cơ → Kim Đan → Nguyên Anh → Hóa Thần**, công pháp, linh căn, tu vi, linh lực, đan dược, trang bị và nhiệm vụ.

### Tình trạng

README mô tả điều khiển, Arcade Physics, combat, yêu thú, nhiệm vụ, túi đồ và chuỗi cảnh giới là hệ thống được giữ lại trong dự án. Các phần này cần tiếp tục được bảo toàn khi mở rộng mô phỏng Thiên Đạo.

## 5. Mô phỏng Thiên Đạo

### Góc nhìn người chơi

- Người chơi quan sát thế giới, chọn NPC để xem thông tin, theo dõi chuyển động, xem nhật ký và điều chỉnh tốc độ.
- Có mô phỏng x1/x2/x4 và tạm dừng. README ghi thời gian không chạy offline khi game đóng.
- Có cơ chế nhập hồn/điều khiển NPC thật trong thời gian giới hạn. NPC đang bị nhập hồn không được tự nhận quyết định AI hoặc nhận việc.
- Quyền năng Thiên Đạo dùng thần lực/nguyên khí/mảnh vỡ theo giới hạn, có phản ứng NPC; không phải lệnh miễn phí vô hạn.

### NPC và xã hội

- NPC lưu vị trí, nhu cầu, sức khỏe/thể lực, lịch sinh hoạt, nghề nghiệp, cảnh giới, linh căn, công pháp, tài sản, quan hệ, ký ức, ý chí và mục tiêu.
- NPC tự di chuyển, nghỉ ngơi, ăn uống, tu luyện, lao động, buôn bán, tìm tài nguyên, giao tiếp và phản ứng với yêu thú/thế lực.
- Nghề, nhu cầu, tính cách, khoảng cách, nguy hiểm, sức khỏe, quan hệ và lợi ích ảnh hưởng quyết định.
- Hành vi phải tôn trọng đường đi, collision, lịch mô phỏng và trạng thái nhập hồn.
- Quan hệ/nhân quả chỉ đổi khi có sự kiện làm căn cứ; NPC không biết điều họ chưa được tiếp xúc.

### Thành trì, kinh tế và tông môn

- Thanh Vân Thành có khu dân cư, nghề nghiệp, lịch ngày đêm, kho, ngân quỹ, cửa hàng và lực lượng bảo vệ.
- Hàng hóa có nguồn và giao dịch; không tạo tài sản vô hạn cho NPC thiếu nguồn lực.
- Thanh Vân Tông có cơ cấu/cấp bậc, tuyển đệ tử, thiên phú, bồi dưỡng, sư đồ, hoạt động và nhiệm vụ.
- Có thế lực đối địch, linh mạch/tài nguyên tranh chấp và xung đột cần hệ quả thực tế.

### Quyền năng, Thiên Bảng và vận mệnh

- Phần 4B–5C yêu cầu thần lực/mảnh vỡ, nhập hồn, phi thăng, quyền năng Thiên Đạo, pháp bảo/phẩm chất, Thiên Bảng, lan truyền thông tin và phản ứng NPC.
- Thiên Mệnh gồm chọn/đánh dấu nhân vật, chỉ dẫn/giao mục tiêu, cho NPC cân nhắc hoặc khước từ, theo dõi tiến trình và ghi Thiên Đạo Sử Ký.
- Thiên ý/nhân quả phản ánh điều NPC thực sự biết và cách họ diễn giải can thiệp; hậu quả phải có nguồn và không áp dụng lặp.
- Các yêu cầu tiếp theo gồm NPC truy tìm/giao dịch bảo vật, tranh đoạt/phản ứng hậu quả và hộ đạo chống tu sĩ đối địch. Điều này không có nghĩa mọi nhánh đã được xác minh lại trong lượt WORLD.1A.

## 6. GFX và môi trường tương tác

- Camera kéo thả chuột/cảm ứng, zoom, chọn NPC và chuyển giữa quan sát tự do với theo dõi.
- Vũ khí hiển thị theo trang bị thật; hướng và hoạt ảnh đồng nhất với trạng thái nhân vật.
- Nhà/cây có HP và trạng thái môi trường; công trình hỏng/sập đổi sprite và collision; cây đổ tạo tài nguyên; yêu thú chết có loot trên mặt đất.
- Vật phẩm rơi chỉ nhận một lần; trạng thái vật thể lưu và phục hồi sau reload.
- Sửa nhà tiêu hao vật liệu thật, cập nhật HP/sprite/collision và đường đi. GFX.4A.1 đã xác nhận nhà bị đánh sập thật trong Phaser; WORLD.1A nối sửa chữa với nhiệm vụ tài trợ.

## 7. WORLD.1A — Ủy Thác Các và nhiệm vụ NPC

### Phạm vi yêu cầu

- Một Ủy Thác Các gần phố chợ, có công trình cổ phong, bảng cáo thị, quầy, biển hiệu, đèn lồng, quản sự và khoảng trống cho NPC tới xem.
- Hệ thống `CommissionSystem` mở đường cho repair/escort/hunt; lượt này chỉ làm gameplay sửa chữa. Không hiện hộ tống/săn yêu thú như nhiệm vụ hoạt động.
- Nhiệm vụ sửa nhà chỉ sinh từ sự kiện nhà thực sự bị phá; không đăng trùng hoặc tạo quest giả khi mở UI.
- NPC thợ xây tự biết tin theo thời gian/nghề, tìm đường tới bảng, đánh giá điều kiện/tiền công, nhận tối đa một việc rồi đến mục tiêu.
- Thợ kiểm tra kho, tiêu hao gỗ/quặng khi bắt đầu, tăng tiến độ theo thời gian, khôi phục công trình và lĩnh thưởng đã dự trữ một lần.
- Lưu nguồn sự kiện, người giao/nhận, tiến độ, vật liệu, escrow, giao dịch; xử lý hủy/thất bại/hết hạn/thiếu tài nguyên nhất quán.
- Bảng là giao diện quan sát nhiệm vụ của NPC, không phải quest log người chơi.

### Đã thực hiện và kiểm chứng

- Nguyên nhân lỗi cũ: Vân Du đang nhập hồn đứng tại điểm thao tác sửa, chặn thợ. Điểm thao tác mới đặt cạnh nhà; NPC không dịch chuyển.
- Lỗi điều kiện thứ hai: thợ tới bảng nhưng trạng thái `commission-board` bị tính nhầm là đang bận. Đã sửa để thợ xác nhận lại điều kiện và có thể nhận việc.
- Ủy Thác Các nằm trong **Phố Tây Thanh Vân**, activity point `(3252, 930)`, có sprite và collision Tiled riêng.
- Nhà bị đánh sập thật tạo nhiệm vụ. Thành giữ trước 30 linh thạch từ ngân quỹ. Vật liệu là 3 gỗ và 2 quặng, tách biệt với tiền công.
- Browser devtest: dùng J đánh sập nhà; NPC Phùng Đại Hải (`qingyun-09`) đi tới bảng, nhận việc, tới nhà, trừ vật liệu, sửa đủ 180 phút mô phỏng; nhà trở lại 180/180 HP, collision phục hồi và thợ nhận 30 linh thạch.
- Sau reload, nhiệm vụ vẫn `claimed`, nhà nguyên vẹn, NPC giữ số dư đã nhận và chỉ có một giao dịch thưởng. Browser console không có lỗi.
- UI hiển thị nhiệm vụ, bên giao, khu vực, thưởng, điều kiện, người nhận, trạng thái, tiến độ, hạn và bộ lọc. Hộ tống/săn yêu thú chưa được tạo thành nhiệm vụ hoạt động.

## 8. Save và bảo vệ dữ liệu

- Save RPG cũ dùng `thanh-van-ky-save-v1`; save mô phỏng Thiên Đạo dùng `thien-dao-world-v1` (devtest có key riêng). Hai luồng không ghi đè nhau.
- Giữ `worldId`, migration tương thích save cũ và SaveGuard tránh hai tab ghi đè thay đổi mới của nhau.
- Lưu mô phỏng bằng localStorage; chưa có backend.
- Dùng ID giao dịch/sự kiện để chống xử lý thưởng, escrow, vật liệu, loot và quyết định quan trọng nhiều lần.

## 9. Kiến trúc và thư mục

- Runtime: Phaser 4.2.1, TypeScript, Vite, Node.js/npm.
- `src/dao/`: mô phỏng NPC, economy, settlement, sect, destiny, heavenly powers, save guard, navigation, environment, commission.
- `src/entities/`, `src/systems/`: hệ RPG gốc.
- `maps/`: bản đồ Tiled; `public/assets/`: asset runtime; `art/source/`: mã nguồn/tài liệu asset; `tests/`: kiểm thử.
- Bổ sung module nhỏ, không viết lại toàn bộ AI/combat/economy/save cho một tính năng mới.

## 10. Các mốc yêu cầu đã gửi

1. RPG tu tiên web, cài môi trường Windows, thế giới/nhân vật/chiến đấu/tu luyện.
2. Combat, animation, AI yêu thú và tu luyện chuyên sâu.
3. Đổi thiết kế trọng tâm sang mô phỏng Thiên Đạo, giữ hệ thống RPG cũ.
4. Thần lực, nhập hồn, thành trì, kinh tế, tông môn, thế lực.
5. Quyền năng, pháp bảo, Thiên Bảng, Thiên Mệnh, Sử Ký, nhân quả, giao dịch bảo vật và hộ đạo.
6. Đại tu pixel art, hiển thị vũ khí, camera và Thanh Vân Thành theo ảnh tham chiếu.
7. Phá hủy môi trường, collision động, loot và sửa chữa.
8. **WORLD.1A:** Ủy Thác Các và nhiệm vụ sửa nhà tự chủ.

Đây là thứ tự lịch sử yêu cầu. Khi yêu cầu cũ khác thiết kế đổi mới hơn, ưu tiên định hướng Thiên Đạo Giám Thế, đồng thời giữ các hệ RPG được yêu cầu bảo toàn.

## 11. Kiểm tra WORLD.1A đã chạy

- `node --run test:systems` — thành công, gồm test hồi quy và test CommissionSystem.
- `node node_modules/typescript/bin/tsc -b` — thành công.
- `node node_modules/vite/bin/vite.js build` — thành công. Vite có cảnh báo bundle JavaScript trên 500 KB, nhưng build không thất bại.
- `tests/commission-system.test.mjs` kiểm tra sinh nhiệm vụ từ sự kiện, chống trùng, escrow, điều kiện nhận, đường tới bảng/mục tiêu, nhận một lần, trừ vật liệu, phục hồi nhà/collision, trả thưởng một lần và save/load.
- `tests/world1a-browser-verification.mjs` kiểm tra gameplay thật qua Phaser; ảnh trong `art/previews/world1a/`.
- Dev server được kiểm tra tại `http://127.0.0.1:5173/`.

## 12. Giới hạn và việc còn lại

- WORLD.1A chỉ hoàn thiện repair commission. Escort/hunt là hướng mở rộng sau, chưa có gameplay trong lượt này.
- Các nhánh hiếm như NPC chết/bị thương giữa nhiệm vụ, hết hạn khi đang sửa, đường bị chặn giữa chừng hoặc thiếu vật liệu sau khi tạm hoãn cần test riêng nếu phát triển tiếp.
- Mô phỏng chỉ chạy khi game mở; hiện không có backend và không có thời gian offline.
- Pixelorama có thể dùng chỉnh thủ công; asset sinh bằng script không phải file Pixelorama.
- Mô phỏng kinh tế/lịch/hành vi là mô hình game; cần kiểm tra cân bằng và hiệu năng khi tăng quy mô NPC.
- Bundle Vite hiện lớn; có thể tách chunk khi ưu tiên tối ưu tải.

## 13. Chạy và kiểm tra lại

PowerShell tại thư mục dự án:

```powershell
npm install
npm run dev
```

Kiểm tra hệ thống và build:

```powershell
node --run test:systems
node node_modules/typescript/bin/tsc -b
node node_modules/vite/bin/vite.js build
```

Để thử sửa nhà trong browser, mở `http://127.0.0.1:5173/?devtest=1`, bấm **Ủy thác sửa nhà**, rồi tự đánh nhà bằng J. Devtest chỉ dựng điều kiện ban đầu; NPC phải tự hoàn thành công việc.

## 14. Tệp liên quan và bằng chứng

- Hướng dẫn hiện có: [README.md](README.md)
- CommissionSystem: [src/dao/CommissionSystem.ts](src/dao/CommissionSystem.ts)
- Bản đồ thành: [maps/thanh_van_world.tmj](maps/thanh_van_world.tmj)
- Test hệ thống: [tests/commission-system.test.mjs](tests/commission-system.test.mjs)
- Test browser: [tests/world1a-browser-verification.mjs](tests/world1a-browser-verification.mjs)
- Ảnh sau khi hoàn thành: [art/previews/world1a/commission-final.png](art/previews/world1a/commission-final.png)
- Ảnh nhà bị đánh sập: [art/previews/world1a/house-destroyed.png](art/previews/world1a/house-destroyed.png)

---

Cập nhật mục “Đã thực hiện và kiểm chứng” bằng bằng chứng mới khi tiếp tục dự án. Không chuyển một yêu cầu thành “hoàn thành” chỉ vì code đã được viết.

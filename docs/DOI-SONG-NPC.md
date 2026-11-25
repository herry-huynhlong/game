# Đời sống NPC ở Thanh Vân Ký

Bản local chạy tại [cổng 5183](http://127.0.0.1:5183/). Mở **Nhật ký → Công trình** để xem quầy, số chỗ trống, khách đợi, tồn kho và thu chi. Mở **Sinh hoạt** trong hồ sơ cư dân để xem nhu cầu, nghề phụ, tuyến đi và lịch sử thực tế. Nút **Tên và cảnh giới** nằm trong trình đơn ☰.

## Hệ thống

- Nhãn NPC và yêu thú lấy tên, cảnh giới và tầng từ dữ liệu nhân vật hoặc hồ sơ từng biến thể yêu thú. Pool tái sử dụng theo camera, có giảm chồng chữ, ẩn theo mức zoom và chỉ vẽ thanh HP khi chọn, trỏ hoặc giao chiến.
- Bỏ tường bao thấp của tông môn và collision tương ứng. Giữ Sơn Môn, tường thành và các chốt tuần tra.
- Mỏ và Linh Điền dùng ủy thác hiện có. Sáu mạch khoáng có trữ lượng, thời gian khai thác và tái tạo. Tám luống trồng có gieo, chăm sóc, chờ lớn và thu hoạch. Kho nhận hàng thật, thưởng từ quỹ thực. Kinh tế tiếp tục dùng Quặng sắt và linh thạch hiện có.
- Khách điếm, tửu quán, trà quán, Nhã Nhạc Lâu và y quán dùng quầy, hàng chờ, sức chứa, người trực và quỹ hữu hạn. Hàng dịch vụ có nguyên liệu đầu vào. Nhân viên nhận tiền công từ doanh thu. NPC có thể giao lưu cùng bàn và cập nhật quan hệ.
- Nhu cầu khát, thư giãn và giao lưu được lưu chung với các chỉ số hiện hữu. Sở thích dựa trên hồ sơ AI theo seed. Khi thiếu tiền, NPC giữ phương án nghỉ hoặc trở về nhà. Các hoạt động trả phí có thời gian hồi và thời hạn giữ chỗ.

## File chính

| File | Vai trò |
| --- | --- |
| `maps/world-rebuild-1b.tmj`, `tools/society/sites.mjs` | Lớp hình, va chạm và điểm tương tác trong Tiled |
| `art/source/society/paint.py`, `public/assets/society/facilities.png` | Nguồn vẽ pixel bằng Pillow và atlas trong game |
| `tools/sect-campus/build-map.mjs` | Xây lại sân viện với bố cục mở |
| `src/world/WorldNameplates.js`, `src/dao/MonsterRegistry.ts` | Nhãn và thông tin nhận diện yêu thú |
| `src/world/SectProduction.js`, `src/world/SectCampus.js` | Khai khoáng, canh tác, ngân sách và ủy thác |
| `src/world/WorldSociety.js`, `src/world/LivingWorldPanel.js` | Dịch vụ, nhu cầu và bảng theo dõi |
| `src/dao/AutonomousNPCSystem.ts`, `src/world/WorldMerchants.js` | Phối hợp lịch AI và hoạt động giao dịch |
| `src/world-rebuild-scene.js`, `src/world-rebuild-population.js`, `src/world-rebuild.js` | Tích hợp WorldScene, an toàn vị trí với bản lưu cũ và điều hướng |
| `src/world/NpcSimulationScheduler.js`, `src/world/Ramparts.js`, `src/world/WorldCultivation.js` | Đo nhịp AI, tên trên thành và tư thế sinh hoạt |
| `tests/society-browser.mjs`, `tests/sect-production-browser.mjs`, `tests/city-society-browser.mjs` | Kiểm thử Chrome và xuất ảnh |

## Lệnh kiểm thử

```powershell
npm run build
npm run test:systems
npm run validate:release -- --dist
npm run preview -- --host 127.0.0.1 --port 5183 --strictPort
```

Khi preview chạy, dùng terminal thứ hai.

```powershell
node tests/society-browser.mjs
node tests/sect-production-browser.mjs
node tests/city-society-browser.mjs
```

Ảnh và dữ liệu kiểm thử nằm trong `art/previews/society/`. Hai ca kiểm tra thuê phòng và điều trị có đặt tình huống ban đầu trong hồ sơ Chrome riêng, sau đó để NPC di chuyển, trả tiền và sử dụng dịch vụ qua WorldScene.

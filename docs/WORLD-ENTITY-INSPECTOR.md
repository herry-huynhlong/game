# Thiên Đạo Giám Định

[Mở WorldScene tại Hắc Vụ Độc Lâm](http://127.0.0.1:5183/?region=west-poison). Khi quan sát bằng Thiên Đạo, rê chuột để xem thông tin ngắn hoặc nhấp trái để mở bảng. **Định vị trên bản đồ** đưa camera tới đối tượng. Vùng có nhiều đối tượng cho phép đổi mục tiêu trong **Đối tượng tại điểm này**. Nhấn Escape, dùng nút đóng hoặc nhấp khoảng trống để bỏ chọn. NPC vẫn mở hồ sơ cư dân hiện có.

| Đối tượng | Nguồn thông tin |
| --- | --- |
| Cây thường, trúc, cổ thụ, linh mộc, thần mộc và ma mộc | Sprite và thuộc tính Tiled. Số lần đốn và thời gian mọc lại lấy từ nguồn gỗ nếu cây có dữ liệu đó. |
| Linh thảo và linh dược ven đường | Node nghề hái dược, trữ lượng, điều kiện nở và thời điểm mọc lại. |
| Thiên tài địa bảo | Danh mục vật phẩm, thời gian sinh trưởng, trạng thái thu hoạch, người hái và liên kết tới cá thể bảo hộ còn sống. |
| Yêu thú, Phệ Linh Yêu Hoa và Mộc Hoàng | Sinh lực, linh lực, cảnh giới, tầng, tập tính, trạng thái biến hình hoặc thi triển, mục tiêu, hồi chiêu và vật phẩm có thể rơi. Tài nguyên được bảo hộ có liên kết ngược. |
| Mạch linh khoáng, vật phẩm rơi, công trình có độ bền | Trữ lượng sản xuất, số lượng vật phẩm hoặc trạng thái độ bền và tu sửa tương ứng. |

Tuổi, linh tính và khả năng hóa yêu của cây cảnh quan hiện chưa có dữ liệu trên mỗi cây. Bảng chỉ hiển thị thuộc tính có nguồn. Tuổi của Thụ Yêu lấy từ trạng thái sinh trưởng. Tuổi dược tính của sâm và linh chi lấy từ định nghĩa tài nguyên. Bảng đóng khi nhập thân và không ghi tri thức giám định vào dữ liệu AI.

## Tệp thay đổi

- `src/world/WorldEntityInspector.js` quản lý chọn đối tượng theo camera và vùng pixel có hình, tooltip, bảng và vòng đánh dấu. Chỉ một mục đang chọn được cập nhật định kỳ. Cây và công trình được tra bằng lưới không gian.
- `src/world/WorldInspectionData.js` dựng nội dung từ trạng thái sống của đối tượng. `src/world/world-inspector.css` định kiểu bảng.
- `src/world-rebuild-scene.js`, `src/world-rebuild.js` và `src/world/NpcSimulationScheduler.js` nối thao tác chuột, trợ giúp điều khiển và cập nhật hiển thị khi Dừng.
- `src/dao/MonsterRegistry.ts`, `src/dao/MonsterCombat.ts` và `src/dao/FaunaSystem.ts` dùng chung giới hạn linh lực và cách xác định nội đan giữa mô phỏng và bảng.
- `tests/world-inspector-browser.mjs` chạy trên Chrome bằng chuột và phím thật của môi trường kiểm thử, với hồ sơ lưu riêng và seed cố định. Báo cáo JSON và ảnh Phaser ở `art/previews/world-inspector/`.

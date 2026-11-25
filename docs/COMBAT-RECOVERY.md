# Hồi phục sinh lực và hình thái ngụy trang

Nhánh khôi phục hình cây trước đây nằm trong điều kiện yêu thú đứng cố định. Thanh Mộc Yêu và Thiên Niên Thụ Yêu có thể di chuyển nên không đi qua nhánh này. Phệ Linh Yêu Hoa liên tục nhắm điểm sinh ban đầu khi quay về. Đường bị chặn có thể khiến yêu hoa giữ chân rễ, còn NPC xuất hiện lúc thu chân không hủy được quá trình. Mục tiêu bị khuất cũng chưa có thời hạn đường nhìn áp dụng cho kỹ năng đang thi triển.

Luồng mới kết thúc truy đuổi theo sự sống của mục tiêu, khoảng cách, vùng an toàn và đường nhìn. Mất đường nhìn 1,25 giây sẽ loại mục tiêu. Khi kết thúc, yêu thú hủy kỹ năng đang thi triển và tìm chỗ nghỉ. Đòn đã phóng tiếp tục theo quy tắc va chạm hiện có. Yêu thú tìm chỗ đứng hợp lệ trong lãnh địa nếu đường về bị chặn. Khi hoàn toàn thiếu chỗ hợp lệ, nó chờ và thử lại theo nhịp có giới hạn. Vị trí sinh gốc, ID, sinh lực, linh lực, tuổi và hồi chiêu được giữ nguyên.

Yêu hoa quay về, hạ thân, thu rễ và đổi footprint từ 22 px xuống 16 px khi cắm rễ đối với hạng Thường. Khi NPC quay lại đúng lúc thu chân, hoạt ảnh thức tỉnh tiếp tục từ mức đã thu. Thụ yêu và Mộc Hoàng chuyển về hình cây. Huyết Đằng Yêu chuyển về bụi dây leo.

## Nhịp hồi phục

| Trạng thái | Sinh lực tối đa mỗi giây |
| --- | ---: |
| Di chuyển | 0,5% |
| Đứng yên | 1% |
| NPC đả tọa hoặc yêu thú nghỉ trong lãnh địa | 2% |
| Phệ Linh Yêu Hoa cắm rễ | 2,5% |
| Ngủ hoặc nghỉ an toàn | 3% |

Mỗi sinh vật dùng một mức hồi phục sau 8 giây yên ổn. Hai phía đều bị chặn hồi phục khi tấn công hoặc truy đuổi. NPC tự tìm chỗ an toàn khi bị thương nặng, dùng Hồi Xuân Đan hiện có và nghỉ đến ngưỡng trở lại sinh hoạt. Ngưỡng thay đổi nhẹ theo tính cách. Bảng Giám Định và Hồ sơ cư dân dùng trạng thái hồi phục thật. Đồng hồ mô phỏng chi phối thời gian chờ, hồi phục và hoạt ảnh biến hình.

## Tệp thay đổi

- Đồng hồ giao tranh và hồi phục chung: `src/dao/CombatRecovery.ts`, `src/world/WorldRecovery.js`, `src/dao/types.ts`.
- Quay về, kết thúc truy đuổi và khôi phục hình thái: `src/dao/FaunaRecovery.ts`, `src/dao/MonsterCombat.ts`, `src/dao/FaunaSystem.ts`, `src/world/MonsterMovement.js`, `src/world/GroundOccupancy.js`, `src/world/MonsterVisuals.js`.
- Tích hợp NPC và hệ thống hiện có: `src/world-rebuild-scene.js`, `src/dao/AutonomousNPCSystem.ts`, `src/dao/WorldRebuildProfessionSystem.ts`, `src/world/Ramparts.js`, `src/world/SectCampus.js`, `src/world/WestWilds.js`, `src/world/WestTreasures.js`, `src/world/WorldMerchants.js`.
- Giao diện: `src/world/WorldInspectionData.js`, `src/world/ResidentProfile.js`.
- Kiểm thử: `tests/monster-fauna-1.test.mjs`, `tests/combat-recovery-browser.mjs`.

Bài Chrome sử dụng save riêng, đặt NPC gần yêu thú bằng fixture và chạy AI, va chạm, sát thương, Giám Định và save thật trong WorldScene. Ca đường về bị chặn buộc bộ định tuyến trả về trạng thái không thể đi để kiểm tra cơ chế chọn chỗ cắm rễ. Kết quả và ảnh nằm trong `art/previews/combat-recovery/`.

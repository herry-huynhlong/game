# GFX.5B — Kiểm kê và chuẩn mỹ thuật khởi đầu

Ngày kiểm kê: 17/11/2026. Đây là tài liệu chuẩn bị, chưa phải xác nhận hoàn thành mẫu mỹ thuật hay kiểm thử trong game.

## Công cụ kiểm tra được

- Tiled có tại `C:\Program Files\Tiled\tiled.exe`.
- Cập nhật GFX.5B.1: WinGet và registry xác nhận Pixelorama 1.2.3 tại `C:\Users\LONG_IT\AppData\Roaming\Orama Interactive\Pixelorama\Pixelorama.exe`. Chưa tìm thấy LibreSprite hoặc Aseprite trong các vị trí đã kiểm tra.
- Kết nối điều khiển giao diện Windows trong phiên này trả về `Transport closed`, nên chưa trực tiếp mở hay vẽ trong công cụ đồ họa.
- Python/Pillow đã được dùng ở GFX.5A để sinh asset; sản phẩm đó chưa được coi là mỹ thuật thủ công đạt chuẩn GFX.5B.

## Tài nguyên và mức ưu tiên

| Nhóm | Tài nguyên đang dùng | Đánh giá và việc cần làm |
| --- | --- | --- |
| Nhân vật | `public/assets/characters/npc-*.png`, `van_du.png`; quy tắc trong `art/source/gfx5a/build_gfx5a.py` | 37 sheet GFX.5A dựa trên đổi màu và phụ kiện: cần vẽ lại hình dáng, trang phục và từng khung, ưu tiên một mẫu hoàn chỉnh trước. |
| Địa hình | `public/assets/tilesets/qingyun_terrain.png` | Cần xem lại cỏ, đường và mép chuyển tiếp tại tỷ lệ camera; không đánh giá đạt chỉ từ số lượng tile. |
| Cây và vật thể cũ | `public/assets/props/world_props.png` và `.json` | Một số cây cũ có tán hình học đơn giản; cần thiết kế lại hình khối, thân, rễ và bóng. |
| Thành, nhà, tông môn | `public/assets/props/settlement_buildings.png` và `.json` | Có kiến trúc chi tiết hơn nhưng cần kiểm tra từng sprite, tỷ lệ và bóng; chưa xác nhận toàn bộ đạt chuẩn. |
| Cây và nhà có tương tác | `public/assets/props/environment_destruction.png` và `.json` | Hiện có `house_intact`, `house_damaged`, `house_ruined`, `tree_intact`, `tree_damaged`, `tree_stump`; thiếu nhiều mức vết thương và hoạt ảnh đổ theo yêu cầu. |
| Bóng | `public/assets/effects/*shadow*.png`, `WorldScene.createPropShadow` và bóng có thể nằm trong atlas | Cần kiểm tra cả bóng gắn trong ảnh và bóng runtime; bóng runtime hiện không gắn vòng đời trạng thái môi trường. |
| Vũ khí | `public/assets/characters/mortal_gift_sword.png`, `qingfeng_sword.png` | Giữ cơ chế overlay gắn với trang bị thực; cần vẽ lại nếu không đạt chuẩn khi xem thực tế. |

## Liên kết trạng thái thực tế

- `src/dao/EnvironmentalSystem.ts`: nhà `city-house-residential-2870`, Tiled object 145 / collision 146; cây `city-tree-2480`, object 185 / collision 10185. HP, loot, sửa nhà và trạng thái lưu có trong hệ thống hiện tại.
- `WorldScene.environmentFrame` ánh xạ nhà về nguyên vẹn, hư hỏng, đổ nát; cây về nguyên vẹn, hư hỏng, gốc cây. Chưa có hoạt ảnh ngã, các mốc hư hỏng nhẹ/nặng riêng hoặc vết chém theo vị trí va chạm.
- Tường thành hiện là hình trong atlas và object map, chưa có thực thể HP / save / collision động cho từng đoạn. Không được trình bày vết nứt giả như một hệ thống phá hủy hoàn chỉnh.
- Lớp Tiled hiện có: `Ground`, `Paths`, `Details`, `WorldProps`, `Collision`, `Zones`, `Spawns`, `ActivitySites`. Giữ các tên và tọa độ đang dùng khi bổ sung mẫu.
- `WorldScene.createPropShadow` tạo bóng một lần khi dựng map; `syncEnvironmentVisual` chỉ cập nhật hình và collision. Cần liên kết bóng với trạng thái cây/nhà trước khi coi việc phá hủy đã hoàn thiện.

## Chuẩn mỹ thuật đề xuất cho mẫu

- Camera 2D top-down hiện tại; nhân vật dùng khung 32×40, giữ điểm neo ở chân và hitbox hiện hữu. Vật thể dùng khung/lưới tương thích atlas, giữ tọa độ Tiled.
- Ánh sáng chính từ trên trái; các vùng bóng tiếp xúc và bóng đổ nghiêng xuống phải. Pixel cạnh sắc, không blur; kiểm tra cả ở zoom game lẫn 1×.
- Bảng màu hạn chế theo chất liệu: xanh ngọc và trắng ngà cho đạo bào, xanh lá trầm cho tán, nâu gỗ ấm, xám đá, vàng đồng. Mỗi chất liệu cần ít nhất các mức sáng, trung gian và tối có chủ đích.
- Mẫu cây: một cấu trúc thân/cành rõ, các cụm tán và rễ; từng trạng thái thương tích, đổ, gốc và sau thu hoạch phải được thiết kế riêng, đồng bộ với HP và save.
- Mẫu tường: một đoạn có mép, mặt và chiều dày; các mốc nứt và đống vụn cần đi cùng mô hình collision và pathfinding, không đổi map chỉ bằng trang trí.
- Mẫu nhà: mái ngói, cột, hiên, cửa và vật liệu đọc rõ; từng trạng thái đổ nát và phục hồi phải tương ứng với WORLD.1A.
- Mỗi mẫu cần file nguồn chỉnh sửa thực sự và PNG runtime, ảnh chứng cứ browser cùng vị trí/zoom, sau đó mới nhân rộng.

## Trạng thái

Mới hoàn tất kiểm kê ban đầu và bản chuẩn đề xuất. Chưa có mẫu vẽ tay, file `.pxo`, asset GFX.5B tích hợp, hoặc bằng chứng browser cho GFX.5B. Không thay asset gameplay trong bước kiểm kê này.

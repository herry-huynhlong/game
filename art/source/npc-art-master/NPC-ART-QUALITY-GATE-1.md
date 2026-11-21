# NPC.ART.QUALITY.GATE.1 — Chuẩn mỹ thuật và kết quả khảo sát

**Dự án:** Thanh Vân Ký — Thiên Đạo Giám Thế  
**Trạng thái:** Chưa duyệt pipeline mới; chưa thay NPC runtime; không tạo C03 v7.

## Kết luận

Niao_K là **mẫu tham chiếu mỹ thuật ưu tiên** cho nam đệ tử Thanh Vân Tông. Preview của gói có phong cách cổ trang Trung Hoa đúng chủ đề, khuôn mặt và tóc được tạo hình có khối, đạo bào có lớp, đồng thời trang sản phẩm ghi có walking bốn hướng và portrait. Nhưng đây là gói trả phí; dự án hiện chưa cung cấp file mua hợp lệ. Vì vậy chưa được nhập gói hoặc dùng preview làm sprite game.

RPG Asian của iceburgdragon không phù hợp làm chuẩn nhân vật C03 hiện tại: preview và mô tả tập trung vào dân làng Nhật, ninja và samurai; NPC Trung Hoa được ghi là nội dung sắp có. Gói có bốn frame đi bộ theo mô tả, nhưng trang không xác nhận rõ bốn hướng cardinal. Gói cũng trả phí.

**Quyết định:** Dừng pixel-run cho nhân vật chính. Không có asset game-ready nào được đưa vào dự án trong lượt này. Có thể chuyển sang một phép thử duy nhất khi người dùng cung cấp gói Niao_K đã mua hợp lệ; nếu không, cần đặt vẽ một mẫu gốc bốn hướng hoặc cung cấp sheet gốc có quyền sửa.

## Nguồn được khảo sát

### 1. Niao_K — Ancient Chinese Character Sprites Pack 1

[Trang sản phẩm chính thức](https://niao-k.itch.io/pixel-art-ancient-chinese-character-series-pack-1)

Trang sản phẩm ghi tương thích RPG Maker/Game Maker/Unity/Godot; có animation đi bốn hướng, portrait và battle sequence nhìn ngang. Có ba biến thể màu. Trang ghi rõ người mua được dùng trong dự án cá nhân/thương mại và được chỉnh sửa theo nhu cầu; không được phân phối lại hoặc bán lại chính asset, attribution không bắt buộc. Trang hiện yêu cầu mua từ **US$4.90 trở lên**. Mục nội dung ghi “No generative AI was used”.

Ảnh dưới là **preview có watermark**, chỉ dùng để đánh giá mỹ thuật. Không cắt, nhập hoặc dùng làm runtime asset.

![Preview Niao_K: nhân vật và nhiều hướng/chuyển động](https://img.itch.zone/aW1nLzI1ODIwNTA1LnBuZw==/original/Mb8eNl.png)

![Preview Niao_K: biến thể màu và hướng](https://img.itch.zone/aW1nLzI1ODIwNTEzLnBuZw==/original/aetNC1.png)

![Preview Niao_K: portrait và animation chiến đấu nhìn ngang](https://img.itch.zone/aW1nLzI1ODIwNTEyLnBuZw==/original/dfBgHH.png)

### 2. iceburgdragon — RPG Asian

[Trang sản phẩm chính thức](https://iceburgdragon.itch.io/rpg-asian)

Trang mô tả sprite **16×32 px**, walk 4 frame, có dân làng Nhật, ninja/kunoichi, samurai và biến thể màu. “Ancient Chinese NPCs” nằm trong mục **Coming Soon**. License ghi được dùng trong dự án thương mại/phi thương mại và được sửa đổi cho dự án; cấm bán lại hoặc phân phối lại asset đã sửa hay chưa sửa; attribution không bắt buộc. Trang hiện yêu cầu mua từ **US$1.79 trở lên**. Mục nội dung ghi “No generative AI was used”. Trang chưa ghi rõ 4 frame là bốn hướng hay bốn frame của một hướng, nên không thể xác nhận đáp ứng yêu cầu cardinal four-way.

Preview công khai từ trang chính thức; chỉ dùng để xem phong cách:

![Preview RPG Asian của iceburgdragon](https://i.imgur.com/jvMLW7g.gif)

## Bảng cấp phép và khả năng dùng

| Nguồn | Dạng cấp phép theo trang sản phẩm | Có sửa đổi | Hướng/animation được xác nhận | Quyết định hiện tại |
|---|---|---:|---|---|
| Niao_K Pack 1 | Mua từ US$4.90; dùng dự án cá nhân/thương mại; cấm phân phối/bán lại asset | Có | Walk bốn hướng; portrait; battle chỉ nhìn ngang | Ứng viên ưu tiên sau khi người dùng cung cấp bản mua; chưa tải/mua |
| iceburgdragon RPG Asian | Mua từ US$1.79; thương mại/phi thương mại; cấm phân phối lại | Có | Walk 4 frame; không xác nhận 4 hướng | Không chọn làm chuẩn C03; chưa tải/mua |

Các quyền trên được đọc từ trang từng sản phẩm, không suy rộng thành quyền phân phối source asset. Không có giao dịch mua hoặc tải gói trả phí nào được thực hiện. Preview không chứng minh người dùng đã sở hữu license.

## So sánh với C03-MASTER v6

Đối chiếu từ preview công khai và screenshot Phaser đã lưu ở [phaser-city-4x.png](../../../tools/npc-art-toolchain-lab/output/c03-master-v6/phaser-city-4x.png):

| Hạng mục | Niao_K preview | C03-MASTER v6 |
|---|---|---|
| Silhouette | Tóc, đầu, tay áo và thân áo đọc thành cụm có chủ đích; hướng nhìn khác nhau | Tay áo và thân còn thành mảng lớn; dáng ngang/sau chưa rõ |
| Mặt/tóc | Portrait riêng thể hiện khuôn mặt; world sprite có tóc dài và búi/đuôi tóc dễ phân biệt | Mặt chỉ đọc được ở cỡ lớn; tóc và búi còn gần một khối |
| Trang phục | Lớp áo, đai, màu nhấn và phụ kiện có thứ bậc | Đạo bào phẳng; đường cổ và nếp vải thiếu cấu trúc |
| Sẵn sàng cho yêu cầu | Chủ đề đúng và có bốn hướng đi theo mô tả; cần xem file mua để đo frame, layer và cách tách atlas | Bốn pose tĩnh xuất được, nhưng chất lượng chưa được duyệt |
| Quyền dùng trong dự án | Có thể dùng/chỉnh sửa sau khi mua đúng gói; không tái phân phối gói | Source tự tạo; không vướng license ngoài, nhưng chất lượng không đạt |

Đánh giá chỉ dựa trên preview trang bán; không khẳng định đã kiểm tra file ZIP, kích thước từng cel, layer nội bộ hoặc import thực tế của Niao_K.

## Chuẩn mỹ thuật NPC đề xuất

### Tỷ lệ world sprite

- **Khung mục tiêu:** 32×48 px cho NPC thường; cho phép chiều cao 48–56 px đối với nhân vật quan trọng nếu silhouette cần dài hơn. Đây là khuyến nghị để thử trên tile 32 px, chưa phải thay đổi asset/game.
- **C03 hiện có:** 48×64 px. Giữ làm khung so sánh; không scale sprite non-uniform trong Phaser để sửa tỷ lệ.
- Trong khung 32×48, đầu khoảng 11–13 px cao; vai khoảng 17–20 px ngang; thân từ cổ đến eo 12–15 px; ống chân lộ 7–9 px. Bàn chân nằm trong footprint 10–14 px ngang, điểm neo tại đường đất ngay dưới đế.
- Giữ khoảng trống quanh silhouette ít nhất 2 px nếu frame cho phép; không để tóc/ống tay chạm mép khung ngoài chủ đích.

### Hình thể và khuôn mặt

- Dáng thanh niên: đầu xấp xỉ 1/4 chiều cao tổng, vai xuôi; cánh tay rủ gần thân, khuỷu hơi cong; bàn tay nối trực tiếp với cổ tay áo. Tránh pose dang ngang.
- Ở world sprite, ưu tiên silhouette đầu, búi tóc, tay áo và vạt áo. Mắt không cần đọc ở camera toàn cảnh.
- Không ép mặt thành chibi để đọc ở zoom xa. Nhân vật quan trọng có portrait UI 64×64 hoặc 96×96 riêng, vùng mặt chiếm khoảng 32–48 px, có highlight/shadow và vài biểu cảm khác nhau.

### Tóc và đạo bào

- Tóc đen dài buộc cao phải có khối tóc sau, tóc mai/tóc trước, búi và dây buộc phân biệt bằng silhouette trước; dùng 3–4 sắc độ cùng họ màu, tránh mảng đen phẳng.
- Đạo bào có áo trong trắng ngà và áo ngoài lam/ngọc; cổ giao lĩnh phải cho thấy hai vạt chồng có thứ tự. Đai lưng nằm rõ ở eo; tay áo có miệng/cuff; vạt trước và sau khác nhau.
- Nếp vải theo khối lớn và hướng rủ từ vai/eo xuống. Dùng màu bóng xanh đậm/lam xám thay viền sáng dày; vàng chỉ làm điểm nhấn đai, viền hoặc phù hiệu.
- Palette khởi điểm: 12–18 màu được kiểm soát gồm 3–4 màu tóc, 3 màu da, 4–6 màu áo, 2 màu trắng ngà, 2 màu đai/viền và 1–2 màu giày/bóng.

### Bốn hướng và animation

- South/front, North/back, East/right, West/left phải là bốn hình được thiết kế riêng; không lật hoặc xoay nguyên pose để giả hướng.
- North cần cho thấy sau đầu/tóc, đường vai, đường may lưng, đai sau và chân; không chỉ xóa mặt.
- East/West cần một mắt/đường mũi tiết chế, búi tóc ở phía sau đầu, tay gần/xa có che khuất khác nhau và thân áo có bề dày.
- Giữ cùng baseline bàn chân, chiều cao đầu và điểm neo giữa các hướng. Trước khi làm animation, kiểm tra contact sheet bốn hướng ở 1× và 4×.
- Sau khi stills duyệt: idle 2–4 frame; walk 4–6 frame ở 8–10 FPS. Bước chân phải luân phiên, không nhấc cả hai chân cùng lúc; shadow tiếp xúc tách khỏi cel nhân vật nếu engine cần.

### Tỷ lệ hiển thị

- So sánh ở kích thước 1× trong WorldScene trước; camera zoom của game không thay đổi độ phân giải nguồn.
- Ở zoom 0.18×, sprite 32×48 chỉ còn khoảng 6×9 pixel trên màn hình. Không đặt tiêu chí đọc ngũ quan ở mức này; dùng màu áo, silhouette, nhóm nghề nghiệp và marker chọn NPC.
- Kiểm tra portrait trong UI riêng, không scale khuôn mặt world sprite để thay thế portrait.

## Quy trình tiếp theo được đề xuất

1. Giữ v5/v6 làm baseline và không mở rộng roster.
2. Khi có gói Niao_K đã mua hợp lệ, mở ZIP trong lab riêng; ghi nhận license/credit, kích thước cell, palette, layer và frame trước khi sửa.
3. Chọn đúng một nhân vật, ánh xạ bốn hướng walk vào Phaser nearest-neighbor trên city và sect; so sánh cùng cỡ với v6. Không chép preview vào runtime.
4. Nếu frame gốc quá nhỏ hoặc sprite RPG Maker không khớp tỷ lệ, không scale mờ hoặc sửa bừa; quyết định đặt vẽ một nhân vật gốc bốn hướng.
5. Chỉ sau khi người dùng duyệt mẫu mới thiết kế pipeline biến thể và portrait; không sinh 108 nhân vật ở giai đoạn này.

Nếu người dùng cung cấp sheet gốc có đủ quyền sửa, Codex có thể chuẩn hóa layer, ánh xạ hướng, rig/animation, atlas và Phaser integration. Nếu cần tạo nhân vật nguyên bản từ đầu, cần quy trình pixel artist chỉnh trực tiếp trên canvas; lượt này không tuyên bố đã vẽ bằng GUI Aseprite/Pixelorama.

## Bằng chứng trong lab

- [C03 v5/v6 trên phố thành 1×](../../../tools/npc-art-toolchain-lab/output/c03-master-v6/phaser-city-1x.png)
- [C03 v5/v6 trên sân tông môn 2×](../../../tools/npc-art-toolchain-lab/output/c03-master-v6/phaser-sect-2x.png)
- [C03 v5/v6 trên phố thành 4×](../../../tools/npc-art-toolchain-lab/output/c03-master-v6/phaser-city-4x.png)
- [Showcase Phaser local](http://127.0.0.1:5176/tools/npc-art-toolchain-lab/showcase-master.html?site=city&zoom=1)

Showcase chỉ để xem. Nó dùng bản đồ Tiled thật và hai spritesheet trong lab, không cài v6 vào runtime, không cập nhật save và không chạy gameplay.

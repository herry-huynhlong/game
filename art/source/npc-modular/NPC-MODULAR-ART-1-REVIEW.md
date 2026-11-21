# NPC.MODULAR.ART.1 — đánh giá pipeline và điều kiện tiếp tục

## Kết luận

**Chưa đạt điều kiện tạo ba NPC mẫu. Không tạo thêm asset hoặc composite mới trong lượt này.** Bộ modular hiện có nhiều file riêng, nhưng chất lượng và cách phân lớp chưa đủ để chứng minh một body trung tính có thể thay mặt, tóc và quần áo một cách tự nhiên.

Đây là giới hạn mỹ thuật thực tế, không phải lỗi xuất Aseprite: Aseprite CLI/Pixel Bridge tạo được `.aseprite`, sheet và metadata, nhưng công cụ đang dùng trong dự án chủ yếu sinh các nét phủ bằng tọa độ/hình cơ bản. Bộ phận hiện tại không vượt qua tiêu chí thiết kế pixel art có chủ đích.

## Kiểm tra hiện trạng

- `art/source/npc-modular/README-VI.md` ghi 12 tóc, 10 mặt, 18 y phục, 10 phụ kiện; các sheet có 12 frame cho 4 hướng × idle/2 bước đi; khung 32×40.
- `tools/npc-modular/generate-parts.mjs` dùng các hàm `rows`, `pixel`, `line`, `rect` và quy tắc theo `form`, `direction`, `phase` để dựng bộ phận. Đây là phần pipeline người dùng yêu cầu không tiếp tục dùng để nhân bản nhân vật.
- Bộ thân trong `public/assets/characters/` là sprite NPC hoàn chỉnh đã có tóc, mặt và trang phục. Các lớp modular phủ lên thân này; chúng không phải body trung tính đã tách khuôn mặt/tóc/áo.
- Đếm pixel alpha trên frame 32×40 đầu tiên của các sheet runtime hiện tại:

| Sheet | Pixel không trong suốt trong frame đầu | Hệ quả |
|---|---:|---|
| `npc-hair-01-04.png` | 30 | Chỉ có vài nét rời, không tạo thành khối tóc thay thế |
| `npc-face-01-04.png` | 29 | Chưa che/thay được mặt vốn có trên body |
| `npc-outfit-09-12.png` | 90 | Chỉ là chi tiết phủ; không thay được áo gốc và tay áo |
| `npc-accessory-01-04.png` | 20 | Chỉ vài pixel phụ kiện |
| `npc-sect_m-01.png` (body hiện dùng) | 566 | Sprite hoàn chỉnh, không phải rig nền trong suốt |

Các sheet có source `.aseprite`, nhưng việc file mở được không chứng minh phần vẽ đạt chất lượng. Aseprite GUI/Pixelorama GUI chưa được điều khiển trong phiên này; không tuyên bố đã vẽ/chỉnh bằng GUI.

## So với yêu cầu

- **Đạt về hạ tầng cũ:** có ID ổn định, sheet 4 hướng/3 pha, source riêng và trang preview modular. Đây là hệ thống thử nghiệm trước đó, không phải nghiệm thu nghệ thuật cho yêu cầu mới.
- **Chưa đạt về tách lớp:** không có body neutral; mặt và tóc không thay thế được chi tiết gốc; áo không chia thành thân/tay/cổ/đai/vạt chuyển động độc lập.
- **Chưa đạt về mỹ thuật:** phần lớn component là các nét mỏng hoặc điểm rời; chưa đủ silhouette và cụm sáng tối để so sánh có lợi với C03 v6.
- **Chưa tạo ba mẫu:** nếu ghép NPC A/B/C bây giờ, khác biệt chủ yếu là màu và vài nét phủ. Điều đó không đáp ứng tiêu chí người dùng.
- **Không thay đổi runtime:** không sửa `src/`, không chạy lại generator, không ghi vào `public/assets/`, không thay save, combat, AI hay population.

## Phân lớp cần có trước khi lắp nhân vật

1. **Base body trung tính:** đầu nền/da, cổ, vai, thân trong, cánh tay trên, cẳng tay, bàn tay, hông, chân và giày; không có tóc, ngũ quan, phù hiệu hoặc đạo bào cố định. Có bốn hướng riêng và baseline/foot anchor cố định.
2. **Head set:** face base + facial features theo hướng; hair-back và hair-front riêng; anchor đầu, tai và mái được ghi bằng metadata.
3. **Garment set:** torso robe, crossed collar, left/right sleeve parts, belt/sash, robe panels/hem. Tay áo gắn vào upper-arm/forearm anchors; không dùng một PNG áo phủ qua tay/chân đang chuyển động.
4. **Accessory set:** hairpin/tie/badge/belt ornaments là layer độc lập; vũ khí vẫn là equipment riêng và bám hand anchor.
5. **Composite validation:** xem từng bộ phận ở 1× trước, thử 4 hướng, sau đó ghép A; thay tóc và áo mà không đổi các layer còn lại. Chỉ khi A đạt mới tạo B/C.

## Cỡ khung và anchor đề xuất

- Tiếp tục thử canvas **32×48 px**, thống nhất cho mọi layer; không scale non-uniform.
- `foot`: giữa baseline, dùng chung bốn hướng; shadow tiếp xúc tách riêng.
- `head`: tâm vùng đầu; `face`: lệch theo hướng nhìn; `hairBack` vẽ dưới đầu/thân, `hairFront` trên trán.
- `shoulderL/R`, `elbowL/R`, `wristL/R`: để tay áo/cẳng tay chuyển động theo body.
- `waist`: cổ áo, đai và vạt áo neo cùng trục; phụ kiện không tự đoán tọa độ theo từng NPC.
- Metadata cần liệt kê các anchor theo hướng; tọa độ đối xứng chỉ dùng khi hình thật sự đối xứng.

## Kế hoạch kiểm chứng khi có artwork đạt chuẩn

- Aseprite source riêng cho base, face, từng tóc, từng outfit và accessory; mỗi source giữ layer chuyên biệt.
- Export PNG nền trong suốt và metadata; kiểm tra alpha bounds, anchor và lệch baseline.
- Tạo một gallery lab không đọc/ghi save, có toggle từng lớp, bốn hướng và zoom 1×/2×/4× trên nền Tiled thành/tông môn.
- So sánh với C03-MASTER v6 tại đúng cỡ world; không dùng ảnh preview bên ngoài làm asset.
- Sau khi A được duyệt, tạo B/C từ cùng body và chứng minh thay tóc/áo độc lập. Chưa mở rộng sang 108 NPC.

## Việc cần để tiếp tục

Môi trường hiện có chỉ cung cấp pipeline Aseprite CLI và dữ liệu vẽ bằng mã; điều khiển GUI editor không hoạt động trong phiên này. Để đạt chất lượng mỹ thuật được yêu cầu mà không quay lại sinh nét bằng công thức, cần một trong hai đầu vào:

- Người dùng cung cấp một mẫu body/face/hair/robe gốc có quyền chỉnh sửa; hoặc
- Có người vẽ trực tiếp bộ body trung tính và các mẫu face/hair/robe riêng trên canvas.

Sau đó Codex có thể làm phần kỹ thuật: chuẩn hóa layer/anchor, tạo rig bốn hướng, ghép biến thể, tạo animation, atlas và Phaser showcase. Đến lúc đó mới có cơ sở để đánh giá một pipeline modular có dùng được hay không.

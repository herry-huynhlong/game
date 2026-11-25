# Địa Mạch Thế Giới

## Chơi trong bản local

Mở http://127.0.0.1:5183/. Ở chế độ Thiên Đạo, nhấp cửa linh mạch rồi chọn **Quan sát bên trong**. Kéo bản đồ bằng chuột, lăn để zoom, nhấp minimap để định vị, dùng **Toàn tầng** để xem từ xa. Nhấp cư dân rồi chọn **Theo dõi** để camera bám theo NPC lúc chuyển tầng. Nhấp cụm quặng để xem trữ lượng và người đang làm. Có thể giữ Shift khi nhấp để ưu tiên cụm quặng nếu NPC đứng đè lên.

Khi nhập thân, **WASD** hoặc mũi tên để đi, **Shift** để đi nhanh hơn, **E** để vào mỏ, chuyển tầng, khai thác, hái cây, nhặt đồ và nghỉ. **J** đánh yêu thú gần hoặc mục tiêu NPC được chọn. **Esc** thoát nhập thân. Ở trạm nghỉ, **Shift+E** gửi một đơn vị khoáng vào kho tạm cá nhân, **R** lấy lại. Kho tạm chuyển vật phẩm thật giữa túi và kho của cùng NPC.

## Bản đồ và dữ liệu

- Giữ 10 cửa linh mạch và 6 mỏ sắt. Kích thước tầng lần lượt là 64×64 cho sắt và 96×96, 128×128, 192×192, 256×256 cho bốn cấp linh mạch. Các tầng kéo dài từ một đến bốn tầng theo cấp.
- Bố cục dùng seed ổn định, các phòng đa thùy, đường hầm có đoạn uốn và nhánh phụ, vùng nước hoặc nham thạch, cầu, bãi cát, nấm, di tích và công trình khai thác. Sau khi tạo hình, flood fill khóa các túi nền tách rời. Cầu là tile có thể đi qua; đá, nước và nham thạch cản đường.
- Canvas 2D sử dụng tile 24 px và chunk 12×12 tile ở zoom gần, bộ đệm tối đa 72 chunk. Zoom xa dùng ảnh tổng quan theo sơ đồ tầng và vẫn đặt thực thể theo tọa độ gốc. Phaser dùng lại trang phục và animation modular. Camera chỉ vẽ bản đồ đang được quan sát.
- Mỏ dùng sổ trữ lượng cũ. Đổi bố cục bỏ các ID quặng không hợp lệ, điều chỉnh giới hạn từng điểm rồi đối soát với tổng hiện có. Phiên bản bố cục mới giữ NPC, chiến lợi phẩm và HP. Vị trí phù hợp được giữ nguyên, vị trí cũ rơi vào đá được đưa đến ô đi được gần nhất. Quyền sở hữu và hợp đồng vẫn theo ID mạch.
- Khoáng công chọn cụm còn trữ lượng, giữ chỗ, tìm đường và đào trước khi quay lên. Tổ đội có luồng hộ vệ, khảo sát tầng sâu và vào mỏ theo hồ sơ chấp pháp. Vụ việc ngầm ghi ID mỏ, tầng, ô và chỉ nhận lời khai trực tiếp từ cùng tầng trong tầm nhìn.
- Các sinh cảnh cung cấp thực vật khác nhau. Địa Hỏa Linh Chi đi vào túi dưới ID riêng hiện có. Bốn cây thu hái khác dùng chung vật phẩm linh thảo. Cổ mộc, nấm trang trí và rêu có hình dáng riêng.

## Bằng chứng

`art/previews/dia-mach-the-gioi` chứa ảnh Chrome và số liệu từ bài kiểm thử. Bài kiểm thử tạo các tình huống có kiểm soát để đo tọa độ, trữ lượng, chiến đấu và vào tầng. Các đoạn đào, di chuyển đến hang yêu thú và tiếp cận hiện trường được chạy bằng mô phỏng thực. Đặt NPC gần cửa hoặc gần cầu thang trong các ca điều khiển giúp thử đúng thao tác E mà không cần chờ đi đường dài.

```powershell
npm run build
npm run test:systems
npm run validate:release -- --dist
node tests/underground-world-browser.mjs
```

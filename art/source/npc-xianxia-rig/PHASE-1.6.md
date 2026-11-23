# Giai đoạn 1.6 · Ngoại hình cho 108 cư dân

Mở WorldScene để kích hoạt cấu hình trên bản lưu, sau đó mở `/npc-xianxia-editor.html` và cuộn tới **Ngoại hình cư dân**. Có thể mở thẳng NPC từ liên kết trong hồ sơ của họ. Gallery gồm 5 trang, 24 ô mỗi trang, có tên, ID, vai trò và môn phái. Lọc theo vai trò hoặc môn phái. Dùng danh sách nhiều lựa chọn để chọn cư dân trên từng trang, nút **Xem trước random** tạo bản nháp và **Xác nhận lưu** ghi đúng các bản nháp đó. Có thể khóa và chỉnh thủ công. Random bỏ qua cả cấu hình khóa lẫn cấu hình đã chỉnh tay.

## Dữ liệu và nhận diện

Mỗi NPC lưu `modularAppearance` gồm `look`, profile, generation và trạng thái khóa. Sinh từ seed thế giới và ID, duyệt ID đã sắp xếp, thử tối đa 64 tổ hợp mỗi NPC. Một NPC mới có thể lấy hình từ cùng cơ chế, giữ nguyên hình đã có của roster. Hệ thống không cấp trang bị. Renderer đọc vũ khí từ trang bị và inventory thật. Giới tính dữ liệu được giữ để chọn rig phù hợp. Lãnh đạo dùng bộ nhận diện modular riêng và khóa mặc định. Chế độ Paper Doll P09/P24 cũ vẫn xem được bằng `?paperDoll=1`.

Đệ tử dùng màu xanh của phái, trưởng lão có tóc bạc/râu hoặc trang phục phù hợp, vệ binh dùng màu giáp lạnh, dân thường và các nghề dân sự có áo vải và bộ lao động có tạp dề. Có profile cho ma tu và võ tăng khi dữ liệu có các vai trò đó. Một số nghề dùng cùng kiểu cắt và khác ở tóc, mặt, màu và chi tiết. Hai turnaround thường phục nam/nữ được tạo bằng imagegen tích hợp với prompt `ba hướng trước/sau/nghiêng, chibi pixel art, áo vải cổ trang, không phụ kiện, tay thả, nền trong suốt`. Tạp dề, túi, lớp tóc dưới mũ và bảng màu nâu được chuẩn hóa hoặc chỉnh pixel trong bước xuất atlas. Nguồn nằm trong `phase15/villageMan.png` và `phase15/villageWoman.png`. Xuất lại bằng `python tools/npc-xianxia-rig/export-phase15.py`.

## Hiển thị và tương thích

WorldScene tái sử dụng root, hit area, va chạm, AI và logic điều khiển hiện có. Chỉ cấp renderer khi nhân vật vào vùng hiển thị, tối đa tám nhân vật mới mỗi frame. Roster dùng chung atlas. Chuyển động NPC thường dùng nhịp cập nhật pose khoảng 72 ms, NPC nhập thân theo frame. Thú và boss có rig riêng nằm ngoài áp dụng. Cần câu và một số động tác chiến đấu dùng sprite cũ đúng lúc phát, sau đó trở lại modular. `?legacyNpc=1` dùng renderer cũ để so sánh. Chế độ thử Huyền Hổ của giai đoạn 2 vẫn dùng một đệ tử thử riêng.

## Kiểm chứng

- Unit test thử 108 cấu hình, đảo thứ tự input, giữ khóa, thêm NPC, bỏ qua boss, không tự cấp trang bị và kiểm atlas bốn hướng.
- Chrome mở cả 5 trang gallery, đọc đủ 108 ID, kiểm reload và điều hướng vùng giữ ngoại hình, xác nhận random riêng đúng hai NPC và kiểm chỉnh sửa thủ công, khóa, trang bị thật khi nhập thân.
- `art/previews/npc-appearance-fleet/verification.json` ghi các phép đo rAF và JS heap do Chrome cung cấp. So sánh WorldScene mặc định và `?legacyNpc=1` cùng thiết lập camera trên Chrome headless SwiftShader. Sân thử 60 nhân vật dùng cấu hình từ roster đã tải. JS heap gồm game, gallery và editor, không phải số VRAM sử dụng.
- Ảnh gallery theo trang, ảnh WorldScene và ảnh kiểm tra 60 nhân vật tại `art/previews/npc-appearance-fleet/`.

## Số liệu lượt đo cuối

| Phép đo | FPS trung bình | Frame time p95 | JS heap quan sát |
| --- | ---: | ---: | ---: |
| WorldScene modular | 21,2 | 50,1 ms | 98,3 MB |
| WorldScene legacy | 19,1 | 83,4 ms | 166,7 MB |
| Sân thử 60 NPC | 34,6 | 50,0 ms | 119,7 MB |

Một lượt đo ngắn tại từng chế độ trong Chrome headless SwiftShader. Không suy diễn hiệu năng máy người chơi, VRAM hoặc mức chênh JS heap ổn định từ mẫu này. Roster kiểm tra có 108 NPC modular, 0 NPC buộc dùng renderer cũ, 2 khóa mặc định và 0 cấu hình trùng hoàn toàn. Một số outfit cùng nhóm vẫn có silhouette gần nhau ở zoom toàn cảnh. Chrome kiểm toàn bộ danh sách năm trang, không đánh giá thủ công từng pose của cả 108 nhân vật.

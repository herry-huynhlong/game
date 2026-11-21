# Pixel Art Bridge — thử nghiệm

Bridge dùng Python 3 và Pillow để lưu tài liệu JSON chứa canvas, palette RGBA, layer và các frame. Pixel được khai báo theo tọa độ; layer được xếp từ dưới lên. Xuất từng frame sang OpenRaster (`.ora`) có layer, cùng sprite sheet PNG và thời lượng frame. Mỗi `.ora` là một frame: chưa có tài liệu animation nhiều frame được xác minh mở trong Pixelorama. JSON là nguồn của bridge, không phải file `.pxo`.

```powershell
python tools/pixel-art-bridge/bridge.py new art/source/ten-mau.json --width 128 --height 128
python tools/pixel-art-bridge/bridge.py check art/source/ten-mau.json
python tools/pixel-art-bridge/bridge.py export art/source/ten-mau.json art/exports/ten-mau-v1
```

Chỉnh JSON: thêm màu vào `palette` dưới dạng `[R,G,B,A]`, thêm tên vào `layers`, thêm frame có `duration_ms` và `pixels`. Trong mỗi frame, `pixels` ánh xạ tên layer tới danh sách `[x,y,ten_mau]`. Tọa độ bắt đầu ở góc trên trái. Mỗi lần xuất chọn một thư mục mới; bridge từ chối ghi đè các file đích đã có.

Pixelorama 1.2.3 có tại `C:\Users\LONG_IT\AppData\Roaming\Orama Interactive\Pixelorama\Pixelorama.exe`. Bridge không gửi lệnh vẽ tới Pixelorama, không tự chuyển chỉnh sửa trong `.ora` ngược về JSON và chưa xác minh khả năng nhập từng layer trong phiên hiện tại. Muốn giữ chỉnh sửa thực hiện trong Pixelorama, lưu thành `.pxo` từ phần mềm đó.

Tài liệu định dạng và nhập liệu: https://pixelorama.org/user_manual/Import/ ; https://pixelorama.org/concepts/project/ ; https://pixelorama.org/user_manual/cli/ .

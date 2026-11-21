# Thiên Đạo Thương Điếm và câu cá

Chạy từ thư mục gốc dự án bằng Aseprite CLI.

```powershell
New-Item -ItemType Directory -Force public/assets/heaven | Out-Null
$aseprite = 'D:\anh\tools\aseprite\build2\bin\aseprite.exe'
Start-Process -FilePath $aseprite -ArgumentList '-b','--script','art/source/heaven/draw.lua' -Wait -WindowStyle Hidden
```

| Atlas | Ô | Thứ tự |
| --- | --- | --- |
| `rod-grip` | 64 × 64 | Bốn hướng Nam, Bắc, Tây, Đông. Mỗi hướng có cầm, thả, chờ, kéo. Neo giữa cạnh dưới, trùng điểm chân sprite NPC. |
| `float` | 12 × 12 | Phao chờ và hai frame báo cá cắn. |
| `projectiles` | 48 × 48 | Đao khí, kiếm khí, Linh Phong Thứ. Mỗi nhóm có ba frame. |
| `guard` | 48 × 48 | Ba frame Hộ Thể Linh Cương. |
| Năm icon | 24 × 24 | Một icon cần câu, bốn icon bí kíp. |

Mỗi file Aseprite có layer và frame chỉnh sửa được. Dây câu lúc chơi được vẽ giữa hai điểm động là đầu cần và phao. Các lớp tay và vũ khí trong động tác chém, đâm sử dụng nguồn hiện có ở `art/source/weapons/`.

Mở **Thiên Đạo** ở thanh trên cùng để mua hoặc ban đồ. Khi nhập thân, chọn trang bị và võ kỹ ở bảng bên phải. Hướng chuột vào nước rồi nhấn **F**, nhấn **F** lần nữa khi báo cá cắn. **J** đánh thường và **K** thi triển sách đã lĩnh ngộ. Cá đã bắt giữ ID trong save và không trở lại sau tải trang.

Kiểm thử Chrome dùng profile riêng. Để kiểm tra bản build, phục vụ thư mục `dist` rồi đặt `GAME_TEST_ORIGIN` thành địa chỉ tương ứng trước khi chạy `node tests/heaven-shop-browser.mjs`. Có thể đặt `RECORD_HEAVEN=1` để lưu WebM bằng FFmpeg do `imageio_ffmpeg` cung cấp.

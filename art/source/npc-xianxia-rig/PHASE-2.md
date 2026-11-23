# Character Editor · Giai đoạn 2

Mở `/npc-xianxia-editor.html` để thử các động tác với mọi cấu hình tương thích của editor. Sân thử có bia, tường, nút tốc độ, dừng và bước từng frame. Chấm vàng là tay cầm, xanh lam là đầu vũ khí, xanh lá là yên và đỏ là vị trí tên rời nỏ.

| Bước | Thao tác |
| --- | --- |
| 2A | Chọn Kiếm hoặc Đao. Nhấn J lần lượt để xem ba động tác. Với Nỏ, K ngắm, J bắn, R nạp. |
| 2B | Bấm Gọi Huyền Hổ, sau đó M lên yên. Dùng WASD và Shift. M lần nữa để xuống khi có chỗ trống. |
| 2C | Chọn kiếm hoặc nỏ trên yên và nhấn J. Đổi vóc dáng hoặc trang phục khi đang thực hiện động tác để thử lại điểm neo. |
| 2D | Bấm Thử trong WorldScene, chọn Nhập thân. M gọi/lên/xuống, J đánh/bắn, Q ngắm, R nạp. Nỏ Thiết Mộc có trong Thương Điếm khi mở chế độ thử. Mua và ban cho đệ tử thử rồi trang bị từ túi. |

`CharacterCombat.js` chạy các pose theo thời gian, khóa hướng trong đòn và phát mỗi sự kiện ra đòn/nạp một lần. `CharacterRenderer.js` giữ nguyên các phần ngoại hình trong lúc hành động, phối vai, tay, tóc và áo theo pose. Vũ khí có frame riêng và điểm neo đầu lưỡi hoặc đầu nỏ. `MountSystem.js` cập nhật tư thế thú và người cưỡi từ cùng vị trí, hướng, quãng đường và điểm yên. WorldScene dùng kiểm tra mặt đất và độ rộng của thú, cùng một root va chạm. Góc nhìn trước có lớp đầu hổ che phần chân người cưỡi.

Kiếm và đao trên NPC thử dùng vùng đánh hướng tại sự kiện ra đòn. Trong WorldScene, sát thương dùng thống kê tu vi và các hàm HP/luật thành hiện có. Tên tái sử dụng kiểm tra va chạm, bỏ qua mục tiêu đã trúng và quy tắc sát thương của projectile. Câu cá dùng cần và renderer cần cũ khi đứng dưới đất. Các võ kỹ cũ tiếp tục theo pipeline võ kỹ cũ. Huyền Hổ và trạng thái nạp thuộc phiên nhập thân, không viết vào save.

Nguồn Huyền Hổ do imagegen tích hợp tạo từ prompt `sáu ô trên hai hàng, trước/sau/nghiêng phải, đứng và phi, hổ xanh than có yên vàng và vải đỏ, nền trong suốt`. File nguồn `phase2/huyen-ho.png`. `tools/npc-xianxia-rig/export-phase2.py` cắt và căn yên, chuẩn hóa palette và tạo thêm pha bước từ nguồn, vẽ các pose kiếm, đao và nỏ theo pixel. Profile trái phản chiếu profile phải. Chuyển động dùng rig và một số pose ảnh gốc, chưa có tất cả frame được vẽ riêng. Chân cưỡi dùng vị trí chân thu lại và che lớp. Các kiểu ống tay rất rộng vẫn cần duyệt trực quan khi đổi góc trong đòn.

`npm run build`, `npm run test:systems`, `node tests/character-combat-mount.test.mjs`, `node scripts/validate-release.mjs --dist`. Bài kiểm tra Chrome production `tests/npc-combat-mount-browser.mjs` dùng `GAME_TEST_ORIGIN=http://127.0.0.1:5183`. Báo cáo và ảnh của lần chạy nằm trong `art/previews/npc-combat-mount/`. FPS trong hồ sơ test đo bằng Chrome chạy ẩn, SwiftShader, cửa sổ 1320×1050.

## Kết quả đo và ảnh

- Sân thử Chrome SwiftShader sau tối ưu nhịp gallery đạt 55,3 FPS trung bình. Frame time trung vị 16,7 ms và p95 33,3 ms. Mẫu đo ở sân, không quy ra FPS WorldScene hay máy người chơi. Mục tiêu 60 FPS chưa đạt trong mẫu này.
- Chuỗi Chrome xác nhận bốn hướng kiếm trúng bia, ba động tác kiếm khác nhau, đao chém, nỏ bắn rồi nạp, Huyền Hổ đổi bốn hướng, thử kiếm và nỏ trên yên. Trong WorldScene đã thử nhập thân, mua và ban nỏ, lên yên, di chuyển, đánh kiếm, sinh tên đúng đầu nỏ, xuống yên và câu thành công. Hồ sơ thử có 108 NPC, không có lỗi runtime/404.

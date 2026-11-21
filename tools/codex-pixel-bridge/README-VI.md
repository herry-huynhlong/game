# Codex Pixel Bridge — mẫu kết nối Codex với Aseprite cho Thanh Vân Ký

Đây là **mẫu kỹ thuật**, chưa phải bộ asset hoàn chỉnh có chất lượng họa sĩ. Đã chạy mẫu trên Aseprite build từ mã nguồn Windows và kiểm tra file native bằng Aseprite Lua; chưa kiểm tra trực quan các layer và frame trong GUI do kênh điều khiển cửa sổ bị lỗi.

## Cài đặt

- Dùng Node.js đã có trong dự án.
- Pixelorama và Tiled vẫn sử dụng bình thường; không cần cài lại.
- Bridge dùng Aseprite hỗ trợ Lua. Bản tự build trong máy hiện tại ở `D:\anh\tools\aseprite\build2\bin\aseprite.exe`; có thể chỉ định đường dẫn khác qua `--aseprite` hoặc `ASEPRITE_EXE`.
- Tài liệu chính thức: https://aseprite.org/docs/cli/ và https://aseprite.org/api/.
- Pixelorama có thể mở `.aseprite` sau khi script vẽ xong: https://pixelorama.org/user_manual/Import/.

## Chạy trên PowerShell

Tại `D:\anh\game\xianxia-mvp` (sau khi chép thư mục này vào `tools/codex-pixel-bridge`):

```powershell
node .\tools\codex-pixel-bridge\bridge.mjs .\tools\codex-pixel-bridge\examples\wall-damage.json --check

node .\tools\codex-pixel-bridge\bridge.mjs .\tools\codex-pixel-bridge\examples\wall-damage.json --aseprite 'C:\Program Files\Aseprite\Aseprite.exe' --out .\art\codex-drafts
```

Tùy vị trí cài thực tế mà sửa đường dẫn Aseprite. Kết quả `art/codex-drafts/demo-wall-damage.aseprite`, `.png` (sprite sheet 3 frame), `.json` (tọa độ/frame). Mở `.aseprite` bằng Aseprite hoặc Pixelorama để xem và sửa bằng tay. Dùng `Save As` trong Pixelorama để tạo `.pxo` nếu cần.

## Cách Codex tự vẽ

Codex tạo mới JSON theo cấu trúc ví dụ, mô tả từng frame, layer và các lệnh vẽ có chủ đích. `bridge.mjs` kiểm tra dữ liệu, chạy Aseprite bằng Lua, lưu project native rồi xuất spritesheet. Không chạy script lạ từ JSON. Các lệnh hỗ trợ: `pixel`, `pixels`, `line`, `rect`, `outline`. Màu có thể dùng mã `#RRGGBB`, `#RRGGBBAA` hoặc tên trong `palette`. Mọi frame có thể chứa các layer riêng, `durationMs` đơn vị mili giây.

- Viết thử **một bộ cây 64x96**: `intact`, `damaged`, `falling`, `stump`, `removed` (một sprite sheet không thay thế trạng thái game).
- Viết thử **một bộ tường 64x48**: nguyên, nứt, đổ; sample chỉ chứng minh luồng xuất file.
- Dùng bảng màu/nguồn sáng thống nhất; thiết kế vết nứt theo hướng va đập, vật liệu vỡ đúng chất; so sánh ảnh ở zoom đúng trong Phaser.
- Tạo layer để chỉnh tay. Với asset đã đạt chất lượng, mới tích hợp vào `public/assets/`, maps, animation và hệ hư hỏng; không copy asset demo vào game.
- Các state damage **không tự thay đổi HP/collision/save**: Codex phải tích hợp riêng vào game.

## Giới hạn

- Bridge không làm xuất hiện một họa sĩ AI trong cửa sổ Pixelorama và không bảo đảm đồ họa đẹp. Nó thực thi các pixel/lệnh mà Codex thiết kế bằng mã; chất lượng là trách nhiệm của bản vẽ và khâu duyệt.
- Không dùng Pillow, không dùng ảnh chụp/AI/ảnh internet rồi giảm kích thước.
- Không tự ghi đè mã nguồn game. Luôn kiểm tra chất lượng và chạy test trước khi đưa asset vào runtime.
- File nguồn chính của bridge là `.aseprite` chứ không phải `.pxo`, trừ khi người dùng mở và lưu lại bằng Pixelorama.

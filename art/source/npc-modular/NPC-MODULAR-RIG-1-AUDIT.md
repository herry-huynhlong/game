# NPC Modular Rig 1 — kết quả kiểm tra

> Cách tiếp cận body trần đã được thay bằng hybrid paper doll trong [NPC.PAPERDOLL.1](NPC-PAPERDOLL-1-REPORT.md). Kết luận về source vẫn đúng: source không có body trần; tuy nhiên outfit base, head base nguyên khối và hai lớp tóc có thể được xuất riêng, ghép lại chính xác.

## Kết luận mỹ thuật

C01–C03 đều là file Aseprite phân lớp 32×40, 32 frame, 8 layer. Dữ liệu placement của C01 mô tả idle và walk theo bốn hướng. Tuy vậy, layer không tương ứng với các bộ phận có thể thay độc lập: `face` chứa cả vùng đầu/da; `robe` tạo phần thân áo chính. Khi ẩn `hair_back`, `hair_front`, `face`, `robe` và `details` trên bản sao C01, phần đầu và thân bị khuyết. Không có neutral body sạch để ghép mặt, tóc và trang phục mới mà không vẽ bù anatomy.

Do đó không tạo sprite body hoặc showcase nhân vật giả hoàn chỉnh. Các nguồn C01–C03 vẫn nguyên vẹn. Không thay đổi runtime, NPC, save, AI, collision hoặc gameplay.

## Kiểm chứng editor và công cụ

- Aseprite CLI `1.3.18.6-12-geccf4ec29-dev` đã mở, đọc layer/frame, ẩn layer trên bản sao và xuất PNG để kiểm tra trực quan.
- Aseprite GUI được khởi chạy và xác nhận cửa sổ bằng process metadata. Chưa thao tác/chỉnh sửa pixel qua GUI automation.
- Pixelorama `1.2.3.0` được phát hiện và khởi chạy; chưa thao tác chỉnh sửa bằng GUI.
- Kênh điều khiển GUI của Codex trả lỗi `failed to write kernel assets: The system cannot find the path specified (os error 3)`. Đây là lỗi kênh automation; không phải bằng chứng editor không cài hoặc không chạy. Không sửa cấu hình Windows toàn cục.
- Không có composite art đủ điều kiện nên chưa thử Phaser; không tuyên bố đã kiểm chứng hình ghép trong game.

## Hợp đồng kỹ thuật

`qingyun-disciple-rig-v1.json` và `rig-schema-v1.json` định nghĩa slot, thứ tự vẽ riêng theo hướng, anchor, kích thước frame tùy ý và dữ liệu animation. Kích thước 32×48 cùng anchor hiện chỉ là tọa độ bố cục tạm, chưa được đo từ tranh đã duyệt. Rig đang ở trạng thái `art-blocked`, `parts` để trống.

Chạy kiểm tra cấu trúc:

```powershell
node tools/npc-modular/validate-rig.mjs
```

Để yêu cầu tranh đã duyệt (hiện sẽ fail đúng chủ ý):

```powershell
node tools/npc-modular/validate-rig.mjs --require-art
```

## Điều kiện mở khóa vẽ tiếp

Cần một body sheet nền sạch, thể hiện đầy đủ đầu/da/cổ, tay, chân và bàn chân dưới lớp áo thay thế; khuôn mặt và trang phục phải tách lớp thực sự. Khi có nguồn như vậy, đo lại anchors từ từng hướng/frame, thử một composite trong showcase cô lập, rồi mới quyết định có mở rộng rig hay không.

# NPC.AUTHORITY.1-A — Hồ sơ quyền hạn và tu vi

- Seed mẫu: `authority-roster-seed`
- Tổng: **109** (108 roster + 1 thành chủ)
- Thành chủ: **Tạ Cảnh Minh**, Nguyên Anh tầng 1, quyền hạn thành trì.
- Tông chủ: **Vân Du**, Nguyên Anh tầng 2, quyền hạn tông môn.
- Hai phạm vi quyền hạn tách biệt: Thành chủ quản lý Thanh Vân Thành; Tông chủ lãnh đạo Thanh Vân Tông.
- Combat dùng chung `cultivationStats`/`damageForStrike`: cảnh giới tăng HP, MP, công kích và phòng thủ; không có combat engine thứ hai.
- Save migration ghi nhận thay đổi tu vi ở `authority.realmChanges`, chỉ nâng nếu thấp hơn mục tiêu vai trò và không hạ/đặt lại cảnh giới hoặc XP đã có.
- **Giới hạn realm:** engine hiện không có cảnh giới Phàm nhân; nhóm dân thường dùng mức thấp nhất Luyện Khí tầng 1-2.
- **Chưa thuộc A:** luật thành, phân biệt tự vệ/tấn công, phản ứng lính canh, hội quân và hộ tông chưa được triển khai trong lượt này; đó là các phần B/C tiếp theo.

| Cảnh giới | NPC |
|---|---:|
| Luyện Khí | 83 |
| Trúc Cơ | 20 |
| Kim Đan | 4 |
| Nguyên Anh | 2 |
| Hóa Thần | 0 |

Danh sách toàn bộ ID, cảnh giới, stats combat, chức vụ, xuất thân và vị trí nằm trong `roster.json`.
